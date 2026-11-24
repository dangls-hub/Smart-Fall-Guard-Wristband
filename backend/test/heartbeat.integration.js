// Uses an explicitly selected disposable PostgreSQL database with the baseline schema.
// MQTT packets travel over a loopback TCP peer. Mosquitto auth/TLS is tested separately.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { setTimeout: sleep } = require('node:timers/promises');
const packet = require('mqtt-packet');
const { startServer } = require('../server');
const { createDatabase } = require('../../database/db_helper');

test('configured backend persists live MQTT status and expires it in PostgreSQL', { timeout: 35000 }, async t => {
    const database = process.env.HEARTBEAT_TEST_DB;
    assert.match(database || '', /^fallguard_heartbeat_[a-z0-9_]+$/);
    assert.equal(process.env.POSTGRES_DB, database, 'Use a disposable heartbeat test database');
    assert.equal(process.env.DB_HOST, '127.0.0.1', 'Use a local disposable PostgreSQL server');

    const device = `heartbeat_${randomUUID()}`;
    const topic = `fallguard/v1/devices/${device}/status`;
    const db = createDatabase(process.env);
    const sockets = new Set();
    const peer = net.createServer(socket => {
        sockets.add(socket);
        socket.once('close', () => sockets.delete(socket));
        const parser = packet.parser();
        socket.on('data', data => parser.parse(data));
        parser.on('packet', message => {
            if (message.cmd === 'connect') {
                socket.write(packet.generate({ cmd: 'connack', returnCode: 0, sessionPresent: false }));
            }
            if (message.cmd === 'subscribe') {
                socket.write(packet.generate({ cmd: 'suback', messageId: message.messageId, granted: [1] }));
                peer.emit('subscribed', socket);
            }
        });
    });

    let app;
    t.after(async () => {
        try {
            await app?.shutdown();
        } finally {
            for (const socket of sockets) socket.destroy();
            if (peer.listening) await new Promise(resolve => peer.close(resolve));
            try {
                await db.query('DELETE FROM devices WHERE device_id = $1', [device]);
            } finally {
                await db.close();
            }
        }
    });
    const listening = once(peer, 'listening');
    peer.listen(0, '127.0.0.1');
    await listening;
    const subscribed = once(peer, 'subscribed', { signal: AbortSignal.timeout(5000) });
    app = startServer({ env: {
        ...process.env, HEARTBEAT_ENABLED: 'true', HOST: '127.0.0.1', PORT: '0',
        MQTT_HOST: '127.0.0.1', MQTT_PORT: String(peer.address().port), MQTT_PROTOCOL: 'mqtt',
        MQTT_USERNAME: 'fallguard_backend', MQTT_PASSWORD: 'mock-peer-only',
    } });
    const [socket] = await subscribed;
    const readDevice = async () => (await db.query(
        'SELECT status, last_seen FROM devices WHERE device_id = $1', [device])).rows[0];
    const publishStatus = retain => socket.write(packet.generate({
        cmd: 'publish', qos: 0, retain, topic,
        payload: JSON.stringify({ device_id: device, status: 'ONLINE' }),
    }));

    publishStatus(true);
    await sleep(250);
    assert.equal(await readDevice(), undefined);
    const started = performance.now();
    publishStatus(false);
    let row;
    while (!row && performance.now() - started < 4000) {
        row = await readDevice();
        if (!row) await sleep(50);
    }
    assert.equal(row?.status, 'ONLINE');
    const lastSeen = row.last_seen.getTime();

    const deadline = started + 23_000;
    while (row.status !== 'OFFLINE' && performance.now() < deadline) {
        await sleep(150);
        row = await readDevice();
    }
    assert.equal(row.status, 'OFFLINE');
    assert.equal(row.last_seen.getTime(), lastSeen, 'Expiration preserves the last received heartbeat');
    const elapsed = performance.now() - started;
    assert.ok(elapsed >= 14_900, `Expired after ${Math.round(elapsed)}ms`);
    t.diagnostic(`Fresh MQTT heartbeat observed OFFLINE after ${Math.round(elapsed)}ms`);
});
