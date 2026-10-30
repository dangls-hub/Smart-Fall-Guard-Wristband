const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const express = require('express');
const router = require('../routes/api');

// Route contracts over real HTTP, without loading server.js, MQTT or the database.
let server;
let port;
before(async () => {
    const app = express();
    app.use('/api', router);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    port = server.address().port;
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));

function get(path) {
    return new Promise((resolve, reject) => {
        const request = http.get({ hostname: '127.0.0.1', port, path }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve({ status: response.statusCode,
                type: response.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') }));
            response.on('error', reject);
        });
        request.setTimeout(2000, () => request.destroy(new Error('API request timed out')));
        request.on('error', reject);
    });
}

const contracts = [
    { path: '/api/devices', message: 'API danh sách thiết bị chưa được triển khai.' },
    { path: '/api/events', message: 'API lịch sử sự kiện chưa được triển khai.' },
];
for (const contract of contracts) {
    test(`GET ${contract.path} returns the 501 JSON scaffold contract`, async () => {
        const response = await get(contract.path);
        assert.equal(response.status, 501);
        assert.match(response.type, /^application\/json(?:;|$)/i);
        assert.deepEqual(JSON.parse(response.body), {
            error: { code: 'NOT_IMPLEMENTED', message: contract.message },
        });
    });
}

test('unsupported query/filter parameters still return 501 rather than fake results', async () => {
    for (const contract of contracts) {
        const response = await get(`${contract.path}?device_id=esp32_001&limit=1&from=2026-10-30`);
        assert.equal(response.status, 501);
        assert.match(response.type, /^application\/json(?:;|$)/i);
        assert.deepEqual(JSON.parse(response.body), {
            error: { code: 'NOT_IMPLEMENTED', message: contract.message },
        });
    }
});

test('an unknown API path remains 404', async () => {
    assert.equal((await get('/api/not-a-route')).status, 404);
});
