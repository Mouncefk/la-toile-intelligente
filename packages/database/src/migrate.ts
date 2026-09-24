import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './index.js';
const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const pool = createDatabase(databaseUrl);
await pool.query(
  'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
);
for (const name of (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort()) {
  const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  if (applied.rowCount === 0) {
    await pool.query('BEGIN');
    try {
      await pool.query(await readFile(join(migrationsDirectory, name), 'utf8'));
      await pool.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}
await pool.end();
