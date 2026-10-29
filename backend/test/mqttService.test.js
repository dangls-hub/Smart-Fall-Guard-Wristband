const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createMqttService, readConfig, DEVICE_TOPIC } = require('../services/mqttService');

const config = {
    MQTT_HOST: '127.0.0.1', MQTT_PORT: '1883', MQTT_PROTOCOL: 'mqtt',
    MQTT_USERNAME: 'test_backend', MQTT_PASSWORD: 'unit-test-only-secret',
};

function setup(overrides = {}) {
    const calls = [];
    const client = new EventEmitter();
    client.subscriptions = [];
    client.subscribe = (topic, options, callback) => {
        client.subscriptions.push({ topic, options });
        callback(null, [{ topic, qos: 1 }]);
    };
    client.end = (force, options, callback) => {
        client.endCalls = (client.endCalls || 0) + 1;
        assert.equal(force, true);
        callback();
    };
    const logger = Object.fromEntries(['info', 'warn', 'error'].map(level =>
        [level, (...args) => calls.push({ level, args })]));
    let connections = 0;
    let options;
    const service = createMqttService({
        env: config, logger,
        connect: opts => { connections++; options = opts; return client; },
        ...overrides,
    });
    return { client, service, calls, connections: () => connections, options: () => options };
}

test('validates missing and invalid configuration without exposing values', () => {
    for (const key of Object.keys(config)) {
        const env = { ...config };
        delete env[key];
        assert.throws(() => readConfig(env), new RegExp(key));
    }
    for (const [key, value] of [
        ['MQTT_HOST', 'mqtt://user:secret@localhost'], ['MQTT_PROTOCOL', 'wss'],
        ['MQTT_PORT', '0'], ['MQTT_PORT', '65536'], ['MQTT_PORT', '1883junk'],
        ['MQTT_PORT', '1.5'], ['MQTT_PASSWORD', ' '],
    ]) {
        assert.throws(() => readConfig({ ...config, [key]: value }), error => {
            assert.ok(error.message.includes(key));
            assert.ok(!error.message.includes(config.MQTT_PASSWORD));
            assert.ok(!error.message.includes('user:secret'));
            return true;
        });
    }
    assert.equal(readConfig({ ...config, MQTT_HOST: '::1' }).host, '::1');
});

test('mqtts requires a readable CA, resolves it from repo root and preserves verification', t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallguard-ca-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const ca = path.join(dir, 'test-ca.txt');
    fs.writeFileSync(ca, 'test fixture only, not a real certificate');
    const env = { ...config, MQTT_PROTOCOL: 'mqtts', MQTT_PORT: '8883' };
    assert.throws(() => readConfig(env), /MQTT_CA_PATH/);
    assert.throws(() => readConfig({ ...env, MQTT_CA_PATH: path.join(dir, 'missing') }), /Cannot read/);
    const oldCwd = process.cwd();
    try {
        process.chdir(dir);
        for (const caPath of [ca, path.relative(path.resolve(__dirname, '../..'), ca)]) {
            const options = readConfig({ ...env, MQTT_CA_PATH: caPath });
            assert.equal(options.ca.toString(), fs.readFileSync(ca, 'utf8'));
            assert.equal(options.rejectUnauthorized, true);
            assert.equal(options.checkServerIdentity, undefined);
        }
    } finally {
        process.chdir(oldCwd);
    }
});

test('one client/listener, exact subscription and one handling per delivery across reconnects', async () => {
    const s = setup();
    assert.equal(s.service.start(), s.service.start());
    assert.equal(s.connections(), 1);
    assert.equal(s.options().username, config.MQTT_USERNAME);
    assert.equal(s.options().password, config.MQTT_PASSWORD);
    assert.equal(s.options().resubscribe, false);
    for (let i = 0; i < 3; i++) {
        s.client.emit('connect');
        s.client.emit('message', 'fallguard/v1/devices/esp32_001/telemetry', Buffer.from('{"svm":1}'));
    }
    assert.equal(s.client.listenerCount('message'), 1);
    assert.deepEqual(s.client.subscriptions, Array(3).fill({ topic: DEVICE_TOPIC, options: { qos: 1 } }));
    const messages = s.calls.filter(call => call.args[0].startsWith('[MQTT] Message'));
    assert.equal(messages.length, 3);
    assert.deepEqual(messages[0].args[1], { svm: 1 });
    await s.service.stop();
});

test('bad JSON is ignored and a subsequent valid message still works', async () => {
    const s = setup();
    s.service.start();
    assert.doesNotThrow(() => s.client.emit('message', 'test/topic', Buffer.from('{bad')));
    s.client.emit('message', 'test/topic', Buffer.from('{"ok":true}'));
    assert.equal(s.calls.filter(call => call.level === 'warn').length, 1);
    assert.deepEqual(s.calls.at(-1).args[1], { ok: true });
    await s.service.stop();
});

test('subscribe errors, rejected SUBACK and missing grants are reported safely', async () => {
    const s = setup();
    s.service.start();
    for (const result of [
        [new Error(`mqtt://user:${config.MQTT_PASSWORD}@host`)],
        [null, [{ topic: DEVICE_TOPIC, qos: 128 }]], [null, []], [null, undefined],
    ]) {
        s.client.subscribe = (topic, options, callback) => callback(...result);
        s.client.emit('connect');
    }
    assert.equal(s.calls.filter(call => call.level === 'error').length, 4);
    assert.ok(!JSON.stringify(s.calls).includes(config.MQTT_PASSWORD));
    await s.service.stop();
});

test('connection lifecycle errors are nonfatal and do not leak library messages', async () => {
    const s = setup();
    s.service.start();
    for (const event of ['reconnect', 'offline', 'close']) s.client.emit(event);
    s.client.emit('error', Object.assign(new Error(config.MQTT_PASSWORD), { code: 'ECONNREFUSED' }));
    assert.ok(s.calls.some(call => call.args[0].includes('ECONNREFUSED')));
    assert.ok(!JSON.stringify(s.calls).includes(config.MQTT_PASSWORD));
    await s.service.stop();
});

test('stop is idempotent and ignores late connect/message callbacks', async () => {
    const s = setup();
    s.service.start();
    const stopped = s.service.stop();
    assert.equal(stopped, s.service.stop());
    await stopped;
    const count = s.calls.length;
    s.client.emit('connect');
    s.client.emit('message', 'test', Buffer.from('{}'));
    assert.equal(s.client.endCalls, 1);
    assert.equal(s.calls.length, count);
    assert.throws(() => s.service.start(), /stopped/);
    await setup().service.stop();
});

test('stop has a deadline even if client never calls its callback', async () => {
    const s = setup({ stopTimeoutMs: 20 });
    let destroyed = false;
    s.client.stream = { destroy: () => { destroyed = true; } };
    s.client.end = () => {};
    s.service.start();
    await assert.rejects(s.service.stop(), /timed out/);
    assert.equal(destroyed, true);
});

test('synchronous initialization failure is sanitized', () => {
    const s = setup({ connect: () => { throw new Error(config.MQTT_PASSWORD); } });
    assert.throws(() => s.service.start(), error => {
        assert.match(error.message, /Could not initialize/);
        assert.ok(!error.message.includes(config.MQTT_PASSWORD));
        return true;
    });
});
