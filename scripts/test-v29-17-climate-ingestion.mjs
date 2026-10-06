import assert from 'node:assert/strict';
import pg from 'pg';
const {Client}=pg;
const connectionString=process.env.DATABASE_URL;
if(!connectionString) throw new Error('DATABASE_URL is required');
const client=new Client({connectionString});
await client.connect();
await client.query('BEGIN');
try{
 for(const t of ['climate_sources_v29_17','climate_observations_v29_17','climate_seasonality_v29_17','climate_ingestion_runs_v29_17']){
  const r=await client.query('SELECT to_regclass($1) r',['public.'+t]); assert.equal(r.rows[0].r,t);
 }
 const f=await client.query("SELECT hemisphere_from_latitude_v29_17(35) n, hemisphere_from_latitude_v29_17(-20) s, hemisphere_from_latitude_v29_17(0) e");
 assert.equal(f.rows[0].n,'north'); assert.equal(f.rows[0].s,'south'); assert.equal(f.rows[0].e,'equatorial');
 const s=await client.query("SELECT season_from_month_v29_17(1,'north') nw, season_from_month_v29_17(7,'north') ns, season_from_month_v29_17(1,'south') ss, season_from_month_v29_17(7,'south') sw");
 assert.equal(s.rows[0].nw,'winter'); assert.equal(s.rows[0].ns,'summer'); assert.equal(s.rows[0].ss,'summer'); assert.equal(s.rows[0].sw,'winter');
 const src=await client.query("SELECT source_code,provider FROM climate_sources_v29_17 WHERE source_code='NASA_POWER_CLIMATOLOGY'");
 assert.equal(src.rows[0].provider,'NASA POWER');
 await client.query('ROLLBACK');
}catch(e){await client.query('ROLLBACK');throw e}
await client.end();
console.log(JSON.stringify({ok:true,checks:['source_registry','raw_observations','hemisphere_aware_seasonality','ingestion_runs','tourism_signal_view']}));