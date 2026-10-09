/**
 * Runs one SQL file against the database in backend/.env (direct, non-pooled host).
 *   node scripts/run-migration.js ../database/migrations/013_live_schema_parity.sql
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: node scripts/run-migration.js <file.sql>');
  const sql = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
  const client = new Client({
    connectionString: (process.env.DATABASE_URL || '').replace('-pooler', ''),
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${file}`);
  } catch (err) {
    // The file wraps itself in BEGIN/COMMIT; roll back so a failure leaves nothing half-done.
    await client.query('ROLLBACK').catch(() => {});
    console.error(`FAILED: ${err.message}${err.position ? ` (char ${err.position})` : ''}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main();
