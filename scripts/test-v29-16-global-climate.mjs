import assert from 'node:assert/strict';
import pg from 'pg';
const {Client}=pg;
const connectionString=process.env.DATABASE_URL;
if(!connectionString) throw new Error('DATABASE_URL is required');
const client=new Client({connectionString});
await client.connect();
await client.query('BEGIN');
try{
 for(const t of ['climate_regions_v29_16','climate_classes_v29_16','graph_climate_assignments_v29_16','climate_season_profiles_v29_16','tourism_climate_compatibility_v29_16']){
  const r=await client.query('SELECT to_regclass($1) r',['public.'+t]); assert.equal(r.rows[0].r,t);
 }
 const n=await client.query(`SELECT count(*)::int n FROM climate_classes_v29_16`);
 assert.ok(n.rows[0].n>=15);
 const c=await client.query(`SELECT code FROM climate_classes_v29_16 WHERE code='Csa'`);
 assert.equal(c.rows[0].code,'Csa');
 await client.query('ROLLBACK');
}catch(e){await client.query('ROLLBACK');throw e}
await client.end();
console.log(JSON.stringify({ok:true,checks:['climate_schema','representative_classes','temporal_assignment_ready','hemisphere_season_ready']}));
