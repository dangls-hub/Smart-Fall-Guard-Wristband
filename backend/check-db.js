const path = require('node:path');
const assert = require('node:assert/strict');
const { createDatabase } = require('../database/db_helper');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

async function main() {
  let db;
  try {
    db = createDatabase();
    const result = await db.query(`
      SELECT current_database() AS database,
             current_user AS username,
             NOW() AS server_time
    `);
    console.table(result.rows);
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, ['public']);
    const names = tables.rows.map(row => row.table_name);
    for (const name of ['devices', 'telemetry_logs', 'fall_events', 'command_logs']) {
      assert.ok(names.includes(name), `Missing table: ${name}`);
    }
    console.log('Schema OK: devices, telemetry_logs, fall_events, command_logs');
    console.log('Kết nối PostgreSQL thành công');
  } catch (error) {
    console.error('Kết nối thất bại:', error.code || 'UNKNOWN');
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}

main().catch(() => {
  console.error('[DB] Could not close database resources');
  process.exitCode = 1;
});
