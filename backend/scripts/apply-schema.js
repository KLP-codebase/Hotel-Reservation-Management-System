/**
 * Applies the Sky Nest schema + seed data to the database in backend/.env.
 * psql is not required — files are sent through the `pg` driver.
 *
 *   node scripts/apply-schema.js           # refuses to run if tables already exist
 *   node scripts/apply-schema.js --reset   # DROP SCHEMA public CASCADE first (destroys all data)
 *
 * Uses the DIRECT Neon endpoint (the "-pooler" host is swapped out) because DDL
 * should not go through PgBouncer's transaction pooling.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const root = path.join(__dirname, '..', '..');
const FILES = [
  'infrastructure/docker/init.sql',
  'database/migrations/012_email_verification_and_staff_invites.sql',
];

async function main() {
  const url = (process.env.DATABASE_URL || '').replace('-pooler', '');
  if (!url) throw new Error('DATABASE_URL is not set in backend/.env');
  const reset = process.argv.includes('--reset');

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  await client.connect();
  console.log('Connected to', new URL(url).host);

  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'"
  );
  if (rows[0].n > 0 && !reset) {
    console.error(`public schema already has ${rows[0].n} tables. Re-run with --reset to wipe it.`);
    process.exitCode = 1;
    return client.end();
  }
  if (reset) {
    console.log('--reset: dropping schema public');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  for (const rel of FILES) {
    // psql meta-commands (\echo, \c ...) are not valid SQL for the driver.
    const sql = fs
      .readFileSync(path.join(root, rel), 'utf8')
      .split(/\r?\n/)
      .filter((l) => !l.startsWith('\\'))
      .join('\n');
    process.stdout.write(`Applying ${rel} ... `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (err) {
      console.log('FAILED');
      console.error(`  ${err.message}${err.position ? ` (char ${err.position})` : ''}`);
      process.exitCode = 1;
      break;
    }
  }

  const t = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const u = await client.query('SELECT username, account_type FROM user_accounts ORDER BY username').catch(() => ({ rows: [] }));
  console.log(`Tables: ${t.rows[0].n}; user accounts: ${u.rows.map((r) => r.username).join(', ') || 'none'}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
