import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://latoile:latoile_dev@localhost:5432/la_toile'
});

const requiredTables = [
  'experience_sessions_v27',
  'experience_decisions_v27',
  'traveler_requests_v12',
  'traveler_match_results_v11',
  'request_dispatches_v12',
  'professional_responses_v12',
  'response_comparisons_v12',
  'traveler_vault_items_v14',
  'traveler_trips_v15'
];

const requiredFunctions = [
  'match_professionals_v11',
  'dispatch_request_v12'
];

try {
  const tables = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema='public'
       AND table_name = ANY($1::text[])`,
    [requiredTables]
  );
  const missingTables = requiredTables.filter(
    (name) => !tables.rows.some((row) => row.table_name === name)
  );
  if (missingTables.length) {
    throw new Error(`Missing V27 tables: ${missingTables.join(', ')}`);
  }

  const functions = await pool.query(
    `SELECT p.proname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'
       AND p.proname = ANY($1::text[])`,
    [requiredFunctions]
  );
  const missingFunctions = requiredFunctions.filter(
    (name) => !functions.rows.some((row) => row.proname === name)
  );
  if (missingFunctions.length) {
    throw new Error(`Missing V27 functions: ${missingFunctions.join(', ')}`);
  }

  const postgis = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM pg_extension WHERE extname='postgis'
     ) AS enabled`
  );
  if (!postgis.rows[0].enabled) {
    throw new Error('PostGIS extension is not enabled');
  }

  console.log('V27 database contract checks passed.');
} finally {
  await pool.end();
}
