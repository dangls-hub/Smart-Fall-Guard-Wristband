const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const { setTimeout: delay } = require('node:timers/promises');
const { readConfig } = require('../backend/services/mqttService');
const mqtt = createRequire(require.resolve('../backend/package.json'))('mqtt');

const prefix = 'fallguard/v1/devices';
const upstream = ['telemetry', 'alert', 'status', 'sync', 'command_ack'];
const downstream = ['commands', 'event_ack'];
const tag = randomUUID();
const clients = [];

function open(options) {
    const client = mqtt.connect({ ...options, clientId: `sp2-${randomUUID()}` });
    clients.push(client);
    return new Promise((resolve, reject) => {
        client.on('error', reject);
        client.once('connect', () => resolve(client));
    });
}

function collect(client) {
    const topics = [];
    client.on('message', (topic, payload) => {
        if (payload.toString() === tag) topics.push(topic);
    });
    return topics;
}

function publish(client, topic) {
    return client.publishAsync(topic, tag, { qos: 1, retain: false });
}

function credentials(index) {
    const username = process.env[`MQTT_TEST_DEVICE${index}_USERNAME`];
    const password = process.env[`MQTT_TEST_DEVICE${index}_PASSWORD`];
    assert(username && /^[A-Za-z0-9_-]{1,64}$/.test(username) && username !== 'fallguard_backend');
    assert(password && password.trim());
    return { username, password };
}

async function verify() {
    const options = { ...readConfig(process.env), protocolVersion: 5, reconnectPeriod: 0 };
    assert(options.protocol === 'mqtts' && ['localhost', '127.0.0.1', '::1'].includes(options.host),
        'Use a disposable TLS broker bound to the loopback interface.');
    assert.equal(options.username, 'fallguard_backend');
    const one = credentials(1);
    const two = credentials(2);
    assert.notEqual(one.username, two.username);

    const backend = await open(options);
    const device1 = await open({ ...options, ...one });
    const device2 = await open({ ...options, ...two });
    console.log('PASS: trusted CA, matching SAN, backend and two device accounts');

    await assert.rejects(open({ ...options, ca: undefined }), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' });
    await assert.rejects(open({ ...options, servername: 'wrong-san.invalid' }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    const deniedLogin = error => [134, 135].includes(error.code);
    await assert.rejects(open({ ...options, password: randomUUID() }), deniedLogin);
    await assert.rejects(open({ ...options, username: undefined, password: undefined }), deniedLogin);
    console.log('PASS: untrusted CA, wrong SAN, wrong password and anonymous connection rejected');

    const backendTopics = collect(backend);
    const device1Topics = collect(device1);
    const device2Topics = collect(device2);
    await Promise.all([backend, device1, device2].map(client => client.subscribeAsync(`${prefix}/+/+`, { qos: 1 })));
    const first = `${prefix}/${one.username}`;
    const second = `${prefix}/${two.username}`;
    const deniedWrite = { code: 135 };

    for (const suffix of upstream) {
        await publish(device1, `${first}/${suffix}`);
        await publish(device2, `${second}/${suffix}`);
        await assert.rejects(publish(device1, `${second}/${suffix}`), deniedWrite);
        await assert.rejects(publish(backend, `${first}/${suffix}`), deniedWrite);
        await assert.rejects(publish(backend, `${prefix}/fallguard_backend/${suffix}`), deniedWrite);
    }
    for (const suffix of downstream) {
        await publish(backend, `${first}/${suffix}`);
        await publish(backend, `${second}/${suffix}`);
        await assert.rejects(publish(device1, `${first}/${suffix}`), deniedWrite);
    }

    const expectedBackend = [first, second].flatMap(base => upstream.map(suffix => `${base}/${suffix}`)).sort();
    const expectedFirst = downstream.map(suffix => `${first}/${suffix}`).sort();
    const expectedSecond = downstream.map(suffix => `${second}/${suffix}`).sort();
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline && (backendTopics.length < expectedBackend.length
        || device1Topics.length < expectedFirst.length || device2Topics.length < expectedSecond.length)) {
        await delay(25);
    }
    assert.deepEqual(backendTopics.sort(), expectedBackend);
    assert.deepEqual(device1Topics.sort(), expectedFirst);
    assert.deepEqual(device2Topics.sort(), expectedSecond);
    console.log('PASS: ACL grants expected upstream and downlink delivery and denies cross-device access');
}

const timeout = setTimeout(() => {
    console.error('MQTT TLS check timed out.');
    process.exit(1);
}, 30000);

verify().catch(error => {
    console.error(`MQTT TLS check failed (${error.code ?? error.name}).`);
    process.exitCode = 1;
}).finally(async () => {
    await Promise.all(clients.map(client => client.endAsync(true)));
    clearTimeout(timeout);
});
