// [SP1-INF-02] Phụ trách: Trần Đình Nam
// Caller loads .env, creates one helper and closes it during application shutdown.
const path = require('node:path');
const { createRequire } = require('node:module');
// Dependencies belong to backend; this sibling directory has no package.json.
const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));
const { Pool } = backendRequire('pg');

function createDatabase(env = process.env, logger = console) {
    for (const key of ['DB_HOST', 'DB_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD']) {
        if (typeof env[key] !== 'string' || !env[key].trim()) {
            throw new Error(`[DB] Missing required configuration: ${key}`);
        }
    }
    const port = Number(env.DB_PORT);
    if (!/^\d+$/.test(env.DB_PORT) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('[DB] DB_PORT must be an integer from 1 to 65535');
    }
    const pool = new Pool({
        host: env.DB_HOST.trim(), port,
        database: env.POSTGRES_DB,
        user: env.POSTGRES_USER,
        password: env.POSTGRES_PASSWORD,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        max: 10,
    });
    // Idle connections can fail outside a query; never log credentials or SQL.
    pool.on('error', () => logger.error('[DB] Idle connection failed; pool will replace it'));
    let closing;
    return {
        async query(text, values) {
            if (closing) throw new Error('[DB] Database is closed');
            return pool.query(text, values);
        },
        close() {
            if (!closing) closing = pool.end();
            return closing;
        },
    };
}

module.exports = { createDatabase };
