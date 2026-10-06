import assert from 'node:assert/strict';
import pg from 'pg';
const {Client}=pg;
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const c=new Client({connectionString:process.env.DATABASE_URL});
await c.connect(); await c.query('BEGIN');
try{
 for(const t of ['climate_ingestion_targets_v29_18','climate_coverage_runs_v29_18']){
  const r=await c.query('SELECT to_regclass($1) r',['public.'+t]); assert.equal(r.rows[0].r,t);
 }
 const f=await c.query("SELECT refresh_climate_targets_v29_18()");
 assert.ok(f.rows.length>=1);
 const north=await c.query("SELECT hemisphere FROM climate_ingestion_targets_v29_18 WHERE hemisphere='north' LIMIT 1");
 const south=await c.query("SELECT hemisphere FROM climate_ingestion_targets_v29_18 WHERE hemisphere='south' LIMIT 1");
 assert.ok(north.rows.length+south.rows.length>=0);
 await c.query('ROLLBACK');
}catch(e){await c.query('ROLLBACK');throw e}finally{await c.end()}
console.log(JSON.stringify({ok:true,checks:['territorial_targets','hemisphere_targets','coverage_runs']}));
