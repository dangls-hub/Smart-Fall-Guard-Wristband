const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createMqttService } = require('../services/mqttService');
const { createHeartbeat } = require('../../services/heartbeat_daemon');

const logger = { info() {}, warn() {}, error() {} };
const env = {
    MQTT_HOST: '127.0.0.1', MQTT_PORT: '1883', MQTT_PROTOCOL: 'mqtt',
    MQTT_USERNAME: 'fallguard_backend', MQTT_PASSWORD: 'test',
};

test('MQTT only records a live ONLINE status from the device matching its topic', async () => {
    const writes = [];
    const db = { async query(_text, values) { writes.push(values); return { rows: [] }; } };
    const heartbeat = createHeartbeat({ db, logger });
    const client = new EventEmitter();
    client.end = (_, __, done) => done();
    const mqtt = createMqttService({ env, logger, connect: () => client, onMessage: heartbeat.onMessage });
    mqtt.start();
    const id = 'esp32_001';
    const topic = `fallguard/v1/devices/${id}/status`;
    const data = { device_id: id, status: 'ONLINE' };
    const send = (message, packet, at = topic) =>
        client.emit('message', at, Buffer.from(JSON.stringify(message)), packet);
    send(data, { retain: true });
    send(data, { dup: true });
    send({ ...data, device_id: 'esp32_002' }, {});
    send({ ...data, status: 'OFFLINE' }, {});
    send(data, {}, topic.replace(/status$/, 'telemetry'));
    send(data, { retain: false });
    await mqtt.stop();
    await heartbeat.stop();
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], id);
    assert.ok(writes[0][1] instanceof Date);
});

test('heartbeat sweep retries after a database failure and stops scheduling during shutdown', async t => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const errors = [];
    const transitions = [];
    let attempts = 0;
    const db = { async query() {
        attempts++;
        if (attempts === 1) throw new Error('database password must stay private');
        return { rows: [{ device_id: 'esp32_001' }] };
    } };
    const heartbeat = createHeartbeat({ db, logger: {
        ...logger,
        error: message => errors.push(message),
        info: (...args) => transitions.push(args.join(' ')),
    } });
    heartbeat.start();
    await new Promise(setImmediate);
    t.mock.timers.tick(4999);
    assert.equal(attempts, 1);
    t.mock.timers.tick(1);
    await new Promise(setImmediate);
    await heartbeat.stop();
    t.mock.timers.tick(10_000);
    assert.equal(attempts, 2);
    assert.equal(errors.length, 1);
    assert.doesNotMatch(errors[0], /password/);
    assert.ok(transitions.some(message => message.includes('esp32_001') && message.includes('OFFLINE')));
});

test('a pending device write retains the latest heartbeat receipt and drains on shutdown', async t => {
    t.mock.timers.enable({ apis: ['Date'], now: 1000 });
    const written = [];
    const blocked = Promise.withResolvers();
    const heartbeat = createHeartbeat({ logger, db: { async query(_text, [, receivedAt]) {
        written.push(receivedAt.getTime());
        if (written.length === 1) await blocked.promise;
    } } });
    const device = 'esp32_001';
    const topic = `fallguard/v1/devices/${device}/status`;
    const data = { device_id: device, status: 'ONLINE' };

    heartbeat.onMessage(topic, data, { retain: false });
    t.mock.timers.setTime(6000);
    heartbeat.onMessage(topic, data, { retain: false });
    t.mock.timers.setTime(11_000);
    heartbeat.onMessage(topic, data, { retain: false });
    assert.deepEqual(written, [1000]);

    const stopped = heartbeat.stop();
    t.mock.timers.setTime(16_000);
    heartbeat.onMessage(topic, data, { retain: false });
    blocked.resolve();
    await stopped;
    assert.deepEqual(written, [1000, 11_000]);
});
