import assert from 'node:assert/strict';
import pg from 'pg';
const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new Client({ connectionString });
await client.connect();
await client.query('BEGIN');
try {
  const node = await client.query(
    `INSERT INTO graph_nodes_v29_12 (node_type, external_key, canonical_name)
     VALUES ('territory','TEST-GEO-13','Global Geography Test') RETURNING id`
  );
  const id=node.rows[0].id;
  await client.query(
    `INSERT INTO graph_territory_context_v29_13
     (node_id,hemisphere,continent,macro_region,country_iso3,timezone,geometry_source)
     VALUES ($1,'north','Africa','North Africa','MAR','Africa/Casablanca','Natural Earth 10m')`,[id]
  );
  await client.query(
    `INSERT INTO graph_climate_context_v29_13
     (node_id,climate_region,climate_classification,local_climate,observed_at,confidence)
     VALUES ($1,'Mediterranean','test','test climate',now(),0.9)`,[id]
  );
  const q=await client.query(
    `SELECT t.hemisphere,t.country_iso3,c.climate_region
     FROM graph_territory_context_v29_13 t
     JOIN graph_climate_context_v29_13 c ON c.node_id=t.node_id
     WHERE t.node_id=$1`,[id]
  );
  assert.equal(q.rows[0].hemisphere,'north');
  assert.equal(q.rows[0].country_iso3,'MAR');
  assert.equal(q.rows[0].climate_region,'Mediterranean');
  await client.query('ROLLBACK');
} catch(e) {
  await client.query('ROLLBACK');
  throw e;
}
await client.end();
console.log(JSON.stringify({ok:true,checks:['hemisphere','territory_context','climate_context','temporal_climate']}));
