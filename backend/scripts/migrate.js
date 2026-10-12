const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

async function run() {
  const migrationsDir = path.resolve(__dirname, '../../database/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const connectionString = (process.env.DATABASE_URL || '').replace('-pooler', '');
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('Connecting to database for migrations...');
  const client = new Client({ connectionString, connectionTimeoutMillis: 15000 });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(rows.map(r => r.filename));

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(`Applying: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`❌ Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log('✨ All migrations are up to date.');
    } else {
      console.log(`🎉 Successfully applied ${appliedCount} migration(s).`);
    }
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
