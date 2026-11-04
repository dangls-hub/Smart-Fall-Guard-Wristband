// Opt-in: reads the configured database; does not change schema or persistent data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const net = require('node:net');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createDatabase } = require('../../database/db_helper');

test('real PostgreSQL: schema, parameterized query, SQL error recovery and close', async () => {
    const db = createDatabase();
    try {
        const tables = await db.query(`SELECT table_name FROM information_schema.tables
            WHERE table_schema = $1 AND table_type = 'BASE TABLE'`, ['public']);
        for (const name of ['devices', 'telemetry_logs', 'fall_events', 'command_logs']) {
            assert.ok(tables.rows.some(row => row.table_name === name), `Missing table: ${name}`);
        }
        const value = "device'); DROP TABLE devices; --";
        assert.equal((await db.query('SELECT $1::text AS value', [value])).rows[0].value, value);
        await assert.rejects(db.query('SELECT 1 / 0'), { code: '22012' });
        assert.equal((await db.query('SELECT 1 AS value')).rows[0].value, 1);
    } finally {
        await db.close();
    }
    await db.close();
    await assert.rejects(db.query('SELECT 1'), /closed/i);
});

test('real PostgreSQL rejects wrong password and closes failed connection', async () => {
    const db = createDatabase({ ...process.env, POSTGRES_PASSWORD: randomUUID() });
    try {
        await assert.rejects(db.query('SELECT 1'), { code: '28P01' });
    } finally {
        await db.close();
    }
});

test('connection interrupted before PostgreSQL handshake rejects and can close', async () => {
    const server = net.createServer(socket => socket.destroy());
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const db = createDatabase({ ...process.env, DB_HOST: '127.0.0.1',
        DB_PORT: String(server.address().port) });
    try {
        await assert.rejects(db.query('SELECT 1'));
    } finally {
        await db.close();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});
