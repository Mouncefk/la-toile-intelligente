import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = new Client({ connectionString });
await client.connect();

const required = [
  'ne_admin0_countries_v29_14',
  'ne_admin1_states_v29_14',
  'ne_populated_places_v29_14'
];

try {
  const postgis = await client.query("SELECT PostGIS_Version() AS version");
  assert.ok(postgis.rows[0]?.version, 'PostGIS must be installed');

  const report = {};
  for (const table of required) {
    const exists = await client.query('SELECT to_regclass($1) AS name', ['public.' + table]);
    assert.equal(exists.rows[0].name, table, 'Missing raw Natural Earth table: ' + table);

    const columns = await client.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
      ['public', table]
    );
    const names = new Set(columns.rows.map(row => row.column_name));
    for (const column of ['source_fid', 'geom']) {
      assert.ok(names.has(column), table + ' is missing required column ' + column);
    }

    const stats = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(geom)::int AS with_geometry,
              COUNT(*) FILTER (WHERE geom IS NOT NULL AND ST_IsValid(geom))::int AS valid_geometry,
              COUNT(*) FILTER (WHERE geom IS NOT NULL AND ST_SRID(geom)=4326)::int AS srid_4326
         FROM public.${table}`
    );
    const row = stats.rows[0];
    assert.ok(row.total > 0, table + ' contains no records');
    assert.equal(row.with_geometry, row.total, table + ' contains records without geometry');
    assert.equal(row.valid_geometry, row.total, table + ' contains invalid geometries');
    assert.equal(row.srid_4326, row.total, table + ' must use SRID 4326');
    report[table] = row;
  }

  assert.ok(report.ne_admin0_countries_v29_14.total >= 200,
    'Admin 0 import is unexpectedly small; expected at least 200 country units');
  assert.ok(report.ne_admin1_states_v29_14.total >= 4000,
    'Admin 1 import is unexpectedly small; expected at least 4,000 divisions');
  assert.ok(report.ne_populated_places_v29_14.total >= 10000,
    'Populated places import is unexpectedly small; expected at least 10,000 places');

  const mappings = await client.query(
    `SELECT COUNT(*) FILTER (WHERE node_type='country')::int AS countries
       FROM v32_geo_nodes WHERE active=true`
  );
  assert.ok(mappings.rows[0].countries >= 2,
    'Canonical V32 geography must retain at least the MAR and FRA pilot countries');

  console.log(JSON.stringify({
    ok: true,
    postgis: postgis.rows[0].version,
    layers: report,
    canonicalPilotCountries: mappings.rows[0].countries
  }, null, 2));
} finally {
  await client.end();
}
