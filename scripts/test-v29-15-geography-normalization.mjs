import assert from 'node:assert/strict';
import pg from 'pg';
const { Client } = pg;
const connectionString=process.env.DATABASE_URL;
if(!connectionString) throw new Error('DATABASE_URL is required');
const client=new Client({connectionString});
await client.connect();
await client.query('BEGIN');
try {
  const required=[
    'graph_nodes_v29_12','graph_territory_context_v29_13',
    'graph_territory_links_v29_14','graph_place_links_v29_15'
  ];
  for(const t of required){
    const r=await client.query('SELECT to_regclass($1) AS r',['public.'+t]);
    assert.equal(r.rows[0].r,t);
  }
  const funcs=await client.query(
    `SELECT proname FROM pg_proc WHERE proname IN
     ('normalize_hemisphere_v29_15','normalize_country_nodes_v29_15',
      'normalize_admin1_nodes_v29_15','normalize_populated_places_v29_15')`);
  assert.equal(funcs.rows.length,4);
  const hemisphere=await client.query(
    `SELECT normalize_hemisphere_v29_15(ST_GeomFromText('POLYGON((-10 20,10 20,10 40,-10 40,-10 20))',4326)) h,
            normalize_hemisphere_v29_15(ST_GeomFromText('POLYGON((-10 -40,10 -40,10 -20,-10 -20,-10 -40))',4326)) s`);
  assert.equal(hemisphere.rows[0].h,'north');
  assert.equal(hemisphere.rows[0].s,'south');
  await client.query('ROLLBACK');
} catch(e) {
  await client.query('ROLLBACK'); throw e;
}
await client.end();
console.log(JSON.stringify({ok:true,checks:['canonical_tables','normalization_functions','hemisphere_calculation']}));
