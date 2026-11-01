const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
// Already a dependency of the locked MQTT.js client; this is a protocol mock, not a broker.
const packet = require('mqtt-packet');
const { DEVICE_TOPIC } = require('../services/mqttService');

async function until(predicate, timeout = 6000) {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
        if (Date.now() >= deadline) throw new Error('Timed out waiting for test condition');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
}

async function mockPeer(t) {
    const sockets = new Set();
    const state = { connects: 0, subscriptions: [], socket: null };
    const server = net.createServer(socket => {
        sockets.add(socket);
        state.socket = socket;
        socket.on('close', () => sockets.delete(socket));
        socket.on('error', () => {});
        const parser = packet.parser();
        socket.on('data', data => parser.parse(data));
        parser.on('error', () => socket.destroy());
        parser.on('packet', message => {
            if (message.cmd === 'connect') {
                state.connects++;
                socket.write(packet.generate({ cmd: 'connack', returnCode: 0, sessionPresent: false }));
            } else if (message.cmd === 'subscribe') {
                state.subscriptions.push(message.subscriptions);
                socket.write(packet.generate({ cmd: 'suback', messageId: message.messageId,
                    granted: message.subscriptions.map(() => 1) }));
            } else if (message.cmd === 'pingreq') {
                socket.write(packet.generate({ cmd: 'pingresp' }));
            }
        });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => {
        for (const socket of sockets) socket.destroy();
        await new Promise(resolve => server.close(resolve));
    });
    state.port = server.address().port;
    state.sockets = sockets;
    state.publish = payload => state.socket.write(packet.generate({ cmd: 'publish',
        topic: 'fallguard/v1/devices/esp32_001/telemetry', payload, qos: 0, retain: false }));
    return state;
}

async function childServer(t, mqttPort, extras = {}) {
    const child = fork(path.join(__dirname, 'fixtures/server-child.js'), [], {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, HOST: '127.0.0.1', PORT: '0',
            MQTT_HOST: '127.0.0.1', MQTT_PORT: String(mqttPort), MQTT_PROTOCOL: 'mqtt',
            MQTT_USERNAME: 'test_backend', MQTT_PASSWORD: 'protocol-mock-only',
            CORS_ORIGIN: 'http://test.local', ...extras },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const state = { child, output: '', exit: null };
    child.stdout.on('data', chunk => { state.output += chunk; });
    child.stderr.on('data', chunk => { state.output += chunk; });
    const ready = once(child, 'message');
    child.on('exit', (code, signal) => { state.exit = { code, signal }; });
    t.after(async () => {
        if (!state.exit) { child.kill(); await once(child, 'exit'); }
    });
    const [message] = await ready;
    state.port = message.port;
    return state;
}

function request(port, method = 'GET') {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port, path: '/api/devices', method,
            headers: { Origin: 'http://test.local', 'Access-Control-Request-Method': 'GET' },
        }, response => {
            response.resume();
            response.on('end', () => resolve(response));
        });
        req.setTimeout(2000, () => req.destroy(new Error('HTTP request timed out')));
        req.on('error', reject);
        req.end();
    });
}

test('real Express/MQTT.js with unavailable broker: HTTP/CORS, retries, SIGINT cleanup', { timeout: 15000 }, async t => {
    const unused = net.createServer();
    unused.listen(0, '127.0.0.1');
    await once(unused, 'listening');
    const port = unused.address().port;
    await new Promise(resolve => unused.close(resolve));
    const state = await childServer(t, port);
    assert.equal((await request(state.port)).statusCode, 501);
    const preflight = await request(state.port, 'OPTIONS');
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], 'http://test.local');
    await until(() => state.output.includes('Reconnecting'));
    assert.ok(state.output.includes('ECONNREFUSED'));
    assert.equal((await request(state.port)).statusCode, 501);
    state.child.send('SIGINT');
    await until(() => state.exit);
    assert.equal(state.exit.code, 0);
    assert.ok(state.output.includes('HTTP and MQTT stopped'));
    await assert.rejects(request(state.port), { code: 'ECONNREFUSED' });
});

test('protocol mock: subscribe, valid/invalid JSON, real reconnect, SIGTERM releases sockets', { timeout: 15000 }, async t => {
    const peer = await mockPeer(t);
    const state = await childServer(t, peer.port);
    await until(() => peer.subscriptions.length === 1 && state.output.includes('Subscribed'));
    assert.deepEqual(peer.subscriptions[0], [{ topic: DEVICE_TOPIC, qos: 1 }]);
    peer.publish('{"sample":"before-reconnect"}');
    peer.publish('{broken-json');
    peer.publish('{"sample":"after-invalid"}');
    await until(() => state.output.includes('after-invalid'));
    assert.ok(state.output.includes('Invalid JSON'));
    assert.equal((await request(state.port)).statusCode, 501);
    peer.socket.destroy();
    await until(() => peer.connects === 2 && peer.subscriptions.length === 2);
    peer.publish('{"sample":"after-reconnect"}');
    await until(() => state.output.includes('after-reconnect'));
    // Give the client time to reveal an unwanted second automatic subscription/delivery.
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(peer.connects, 2);
    assert.equal(peer.subscriptions.length, 2);
    assert.deepEqual(peer.subscriptions[1], peer.subscriptions[0]);
    assert.equal(state.output.split('after-reconnect').length - 1, 1);
    assert.equal(state.output.split('[MQTT] Message ').length - 1, 3);
    state.child.send('SIGTERM');
    await until(() => state.exit && peer.sockets.size === 0);
    assert.equal(state.exit.code, 0);
    assert.ok(state.output.includes('Client stopped'));
    await assert.rejects(request(state.port), { code: 'ECONNREFUSED' });
});

test('shutdown deadline closes a stalled HTTP connection and exits', { timeout: 10000 }, async t => {
    const peer = await mockPeer(t);
    const state = await childServer(t, peer.port, { TEST_SHUTDOWN_MS: '150' });
    const socket = net.connect(state.port, '127.0.0.1');
    socket.on('error', () => {});
    t.after(() => socket.destroy());
    await once(socket, 'connect');
    socket.write('GET /api/devices HTTP/1.1\r\nHost: localhost\r\n');
    await new Promise(resolve => setTimeout(resolve, 50));
    state.child.send('SIGTERM');
    await until(() => state.exit);
    assert.equal(state.exit.code, 1);
    assert.ok(state.output.includes('forcing exit'));
    await assert.rejects(request(state.port), { code: 'ECONNREFUSED' });
});

test('occupied HTTP port stops MQTT and exits with failure instead of leaking retries', { timeout: 10000 }, async t => {
    const peer = await mockPeer(t);
    const occupied = net.createServer();
    occupied.listen(0, '127.0.0.1');
    await once(occupied, 'listening');
    t.after(() => new Promise(resolve => occupied.close(resolve)));
    const child = fork(path.join(__dirname, '../server.js'), [], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, HOST: '127.0.0.1', PORT: String(occupied.address().port),
            MQTT_HOST: '127.0.0.1', MQTT_PORT: String(peer.port), MQTT_PROTOCOL: 'mqtt',
            MQTT_USERNAME: 'test_backend', MQTT_PASSWORD: 'protocol-mock-only' },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    const [code] = await once(child, 'exit');
    assert.equal(code, 1);
    assert.ok(output.includes('Could not listen'));
    assert.ok(output.includes('Client stopped'));
});
