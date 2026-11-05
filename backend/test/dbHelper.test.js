const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../../database/db_helper');

const env = { DB_HOST: '127.0.0.1', DB_PORT: '5432', POSTGRES_DB: 'test_db',
    POSTGRES_USER: 'test_user', POSTGRES_PASSWORD: 'unit-test-only' };

test('database rejects missing settings without exposing credentials', () => {
    for (const key of Object.keys(env)) {
        assert.throws(() => createDatabase({ ...env, [key]: '' }), error =>
            error.message.includes(key) && !error.message.includes(env.POSTGRES_PASSWORD));
    }
});

test('database rejects invalid ports before opening a connection', () => {
    for (const port of ['0', '65536', '5432x', '1.5', '-1']) {
        assert.throws(() => createDatabase({ ...env, DB_PORT: port }), /DB_PORT/);
    }
});

test('unused database can close repeatedly and rejects queries after closing', async () => {
    const db = createDatabase(env);
    await Promise.all([db.close(), db.close()]);
    await assert.rejects(db.query('SELECT 1'), /closed/i);
});
