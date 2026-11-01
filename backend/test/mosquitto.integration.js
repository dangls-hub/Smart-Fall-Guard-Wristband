// Opt-in real-broker acceptance test. Restarts ONLY the local Compose mosquitto service.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');
const mqtt = require('mqtt');
const { startServer } = require('../server'); // Loads repository-root .env.
const { readConfig, DEVICE_TOPIC } = require('../services/mqttService');

const repo = path.resolve(__dirname, '../..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label, timeout = 8000) {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
        await pause(25);
    }
}

function compose(...args) {
    const result = spawnSync('docker', ['compose', ...args], { cwd: repo, timeout: 15000 });
    assert.equal(result.status, 0, `docker compose ${args.join(' ')} must succeed`);
    console.log(`[Docker] compose ${args.join(' ')}: exit 0`);
}

function closeClient(client) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Test client did not close')), 2000);
        client.end(true, {}, () => { clearTimeout(timer); resolve(); });
    });
}

function connectClient(options, role, clients) {
    return new Promise((resolve, reject) => {
        const client = mqtt.connect({ ...options, reconnectPeriod: 0, connectTimeout: 5000 });
        clients.push(client);
        const timer = setTimeout(() => reject(new Error(`Connection timed out: ${role}`)), 7000);
        client.on('error', () => {
            clearTimeout(timer);
            reject(new Error(`MQTT authentication/connection failed: ${role}`));
        });
        client.once('connect', () => { clearTimeout(timer); resolve(client); });
    });
}

function publish(client, topic, data, qos = 0) {
    return new Promise((resolve, reject) => client.publish(topic,
        typeof data === 'string' ? data : JSON.stringify(data), { qos, retain: false },
        error => error ? reject(new Error('Test publish transport failed')) : resolve()));
}

function get(port) {
    return new Promise((resolve, reject) => {
        const request = http.get({ hostname: '127.0.0.1', port, path: '/api/devices' }, response => {
            response.resume();
            response.on('end', () => resolve(response.statusCode));
        });
        request.setTimeout(2000, () => request.destroy(new Error('HTTP timed out')));
        request.on('error', reject);
    });
}

test('real Mosquitto local acceptance (no mocks)', { timeout: 45000 }, async t => {
    assert.equal(process.versions.node.split('.')[0], '22', 'Run acceptance with Node.js 22');
    assert.equal(process.env.MQTT_PROTOCOL, 'mqtt', 'This suite validates local MQTT, not TLS');
    assert.equal(process.env.MQTT_HOST, '127.0.0.1', 'Restart tests require a loopback broker');
    assert.equal(process.env.MQTT_USERNAME, 'fallguard_backend', 'Use the backend account');
    for (const key of ['MQTT_TEST_DEVICE1_USERNAME', 'MQTT_TEST_DEVICE1_PASSWORD',
        'MQTT_TEST_DEVICE2_USERNAME', 'MQTT_TEST_DEVICE2_PASSWORD']) {
        assert.ok(process.env[key], `Required local-only test configuration: ${key}`);
    }
    const id1 = process.env.MQTT_TEST_DEVICE1_USERNAME;
    const id2 = process.env.MQTT_TEST_DEVICE2_USERNAME;
    assert.ok(id1 !== id2 && [id1, id2].every(id => /^[a-zA-Z0-9_-]+$/.test(id)),
        'Use two distinct valid device IDs');
    const base = readConfig(process.env);
    const run = `sp1be01-${Date.now()}`;
    const topic = id => `fallguard/v1/devices/${id}/telemetry`;
    const data = (id, suffix) => ({ device_id: id, source: 'simulator', sample_id: `${run}-${suffix}`, svm: 1.02 });
    const clients = [];
    const records = [];
    const logger = Object.fromEntries(['info', 'warn', 'error'].map(level => [level, (...args) => {
        records.push({ level, args });
        console[level](...args);
    }]));
    const received = marker => records.filter(record =>
        record.args[0].startsWith('[MQTT] Message ') && record.args[1]?.sample_id === marker);
    const subscriptions = () => records.filter(record =>
        record.args[0].startsWith(`[MQTT] Subscribed ${DEVICE_TOPIC}`)).length;
    let backend;
    let mqttClient;
    let stopped = false;
    let device1;
    let device2;
    let observer;
    let port;
    const observed = [];
    t.after(async () => {
        if (stopped) compose('start', 'mosquitto');
        await Promise.all(clients.map(closeClient));
        if (backend) await backend.shutdown();
    });

    await t.test('backend authenticates and subscribes; HTTP serves', async () => {
        backend = startServer({ env: { ...process.env, PORT: '0' }, logger });
        mqttClient = backend.mqttService.start(); // Idempotent: returns the already-started client.
        await once(backend.server, 'listening');
        port = backend.server.address().port;
        await until(() => subscriptions() === 1, 'backend SUBACK');
        assert.equal(mqttClient.connected, true);
        assert.equal(mqttClient.listenerCount('message'), 1);
        assert.equal(await get(port), 501); // SP1-BE-02 route exists; business query is not implemented.
        observer = await connectClient(base, 'backend observer', clients);
        observer.on('message', (messageTopic, payload) => {
            try { observed.push({ topic: messageTopic, data: JSON.parse(payload.toString()) }); } catch {}
        });
        await new Promise((resolve, reject) => observer.subscribe(topic(id2), { qos: 1 }, (error, grants) => {
            if (error || !grants?.some(grant => grant.topic === topic(id2) && grant.qos <= 1)) {
                reject(new Error('Observer subscription failed'));
            } else resolve();
        }));
        device1 = await connectClient({ ...base, username: id1,
            password: process.env.MQTT_TEST_DEVICE1_PASSWORD }, 'device 1', clients);
        device2 = await connectClient({ ...base, username: id2,
            password: process.env.MQTT_TEST_DEVICE2_PASSWORD }, 'device 2', clients);
        console.log(`[Evidence] Node ${process.version}; real broker auth and SUBACK successful`);
    });

    await t.test('valid telemetry passes device -> Mosquitto -> backend with parsed JSON', async () => {
        const sample = data(id1, 'valid');
        await publish(device1, topic(id1), sample);
        await until(() => received(sample.sample_id).length === 1, 'valid telemetry delivery');
        assert.deepEqual(received(sample.sample_id)[0].args[1], sample);
    });

    await t.test('malformed JSON is ignored; the next valid sample still arrives', async () => {
        await publish(device1, topic(id1), '{broken-json');
        await until(() => records.some(record => record.args[0].includes('Invalid JSON')), 'invalid JSON log');
        const sample = data(id1, 'after-invalid');
        await publish(device1, topic(id1), sample);
        await until(() => received(sample.sample_id).length === 1, 'delivery after invalid JSON');
        assert.equal(await get(port), 501);
    });

    await t.test('ACL blocks cross-device publish, with positive subscriber controls', async () => {
        const before = data(id2, 'acl-control-before');
        await publish(device2, topic(id2), before);
        await until(() => observed.some(item => item.data.sample_id === before.sample_id), 'positive ACL control before');
        const forbidden = data(id2, 'acl-forbidden');
        await publish(device1, topic(id2), forbidden, 1);
        // MQTT 3.1.1 PUBACK is not authorization proof; observe actual delivery instead.
        await pause(1500);
        const after = data(id2, 'acl-control-after');
        await publish(device2, topic(id2), after);
        await until(() => observed.some(item => item.data.sample_id === after.sample_id), 'positive ACL control after');
        assert.equal(observed.filter(item => item.data.sample_id === forbidden.sample_id).length, 0);
        assert.equal(received(forbidden.sample_id).length, 0);
        console.log('[Evidence] ACL: both authorized controls delivered; cross-device marker delivered 0 times');
    });

    await t.test('HTTP remains available while the real broker is stopped', async () => {
        compose('stop', '-t', '3', 'mosquitto');
        stopped = true;
        await until(() => !mqttClient.connected, 'broker disconnect');
        assert.equal(await get(port), 501);
        await until(() => records.some(record => record.args[0].includes('Reconnecting')), 'retry while broker is stopped');
        assert.equal(await get(port), 501);
        console.log('[Evidence] Broker stopped: HTTP 501 twice; backend retry observed');
    });

    await t.test('broker restart restores one subscription and one delivery per sample', async () => {
        compose('start', 'mosquitto');
        stopped = false;
        await until(() => mqttClient.connected && subscriptions() === 2, 'backend resubscription');
        assert.equal(backend.mqttService.start(), mqttClient);
        assert.equal(mqttClient.listenerCount('message'), 1);
        const sender = await connectClient({ ...base, username: id1,
            password: process.env.MQTT_TEST_DEVICE1_PASSWORD }, 'device 1 after restart', clients);
        const sample = data(id1, 'after-restart');
        await publish(sender, topic(id1), sample);
        await until(() => received(sample.sample_id).length === 1, 'delivery after broker restart');
        await pause(500);
        assert.equal(received(sample.sample_id).length, 1);
        assert.equal(subscriptions(), 2);
        assert.equal(await get(port), 501);
        console.log('[Evidence] Same client; 1 message listener; 2 SUBACKs across 2 connections; new sample handled once');
    });

    await t.test('application shutdown releases HTTP and MQTT resources', async () => {
        await backend.shutdown();
        assert.equal(backend.server.listening, false);
        assert.equal(mqttClient.disconnected, true);
        await assert.rejects(get(port), { code: 'ECONNREFUSED' });
        console.log('[Evidence] HTTP port closed; real MQTT client disconnected');
    });
});
