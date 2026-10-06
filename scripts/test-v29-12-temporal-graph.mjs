import assert from 'node:assert/strict';
import pg from 'pg';
const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const client = new Client({ connectionString });
await client.connect();
const tables = [
  'graph_nodes_v29_12','graph_node_states_v29_12','graph_relations_v29_12',
  'graph_relation_states_v29_12','graph_observations_v29_12','graph_evidence_v29_12',
  'graph_vibrations_v29_12','graph_vibration_events_v29_12','graph_propagations_v29_12',
  'graph_actions_v29_12','graph_results_v29_12','graph_snapshots_v29_12','graph_signals_v29_12'
];
for (const table of tables) {
  const r = await client.query('SELECT to_regclass($1) AS regclass',['public.'+table]);
  assert.equal(r.rows[0].regclass, table, 'missing table '+table);
}
await client.query('BEGIN');
try {
  const node = await client.query(
    'INSERT INTO graph_nodes_v29_12 (node_type, external_key, canonical_name, country_iso3) VALUES ($1,$2,$3,$4) RETURNING id',
    ['territory','TEST-MAR','Test Territory','MAR']
  );
  const nodeId = node.rows[0].id;
  await client.query(
    'INSERT INTO graph_node_states_v29_12 (node_id,state,observed_at,valid_from,confidence) VALUES ($1,$2::jsonb,now(),now(),$3)',
    [nodeId, JSON.stringify({ hemisphere:'North', climate_region:'Mediterranean' }), 0.9]
  );
  const vibration = await client.query(
    'INSERT INTO graph_vibrations_v29_12 (vibration_type,source_type,title,relevance,confidence,intensity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    ['demand','test','Temporal graph test',0.8,0.9,0.4]
  );
  await client.query(
    'INSERT INTO graph_vibration_events_v29_12 (vibration_id,event_type,payload) VALUES ($1,$2,$3::jsonb)',
    [vibration.rows[0].id,'detected',JSON.stringify({test:true})]
  );
  const rel = await client.query(
    'INSERT INTO graph_relations_v29_12 (relation_type,source_node_id,target_node_id,inferred) VALUES ($1,$2,$2,$3) RETURNING id',
    ['test_relation',nodeId,true]
  );
  assert.ok(rel.rows[0].id);
  await client.query('ROLLBACK');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
}
await client.end();
console.log(JSON.stringify({ok:true,tables:tables.length,checks:['tables','temporal_state','vibration_history','relation_metadata']}));
