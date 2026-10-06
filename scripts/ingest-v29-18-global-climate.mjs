import pg from 'pg';
const {Client}=pg;
const DATABASE_URL=process.env.DATABASE_URL;
if(!DATABASE_URL) throw new Error('DATABASE_URL is required');
const client=new Client({connectionString:DATABASE_URL});
await client.connect();
const limit=Math.max(1,Number(process.env.CLIMATE_BATCH_SIZE||25));
const source=await client.query("SELECT id FROM climate_sources_v29_17 WHERE source_code='NASA_POWER_CLIMATOLOGY'");
if(!source.rowCount) throw new Error('NASA POWER source is not initialized');
await client.query('BEGIN');
const run=(await client.query("INSERT INTO climate_coverage_runs_v29_18(source_id,status) VALUES($1,'running') RETURNING id",[source.rows[0].id])).rows[0].id;
try{
 await client.query('COMMIT');
 const refreshed=await client.query('SELECT * FROM refresh_climate_targets_v29_18()');
 const targets=await client.query("SELECT id,node_id,latitude,longitude,hemisphere FROM climate_ingestion_targets_v29_18 WHERE active=true ORDER BY priority,id LIMIT $1",[limit]);
 let completed=0,failed=0,rows=0;
 for(const t of targets.rows){
  try{
   const p=new URLSearchParams({parameters:'T2M,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN',community:'AG',longitude:String(t.longitude),latitude:String(t.latitude),format:'JSON'});
   const response=await fetch('https://power.larc.nasa.gov/api/temporal/climatology/point?'+p);
   if(!response.ok) throw new Error('HTTP '+response.status);
   const payload=await response.json();
   const monthly=payload?.properties?.parameter||{};
   const year=Number(process.env.CLIMATE_YEAR||new Date().getUTCFullYear());
   for(const key of Object.keys(monthly.T2M||{})){
    await client.query(`INSERT INTO climate_observations_v29_17
      (source_id,territory_node_id,latitude,longitude,hemisphere,year,month,temperature_c,precipitation_mm,humidity_pct,wind_ms,solar_kwh_m2_day,raw_payload)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT(source_id,territory_node_id,year,month) DO UPDATE SET
      latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,hemisphere=EXCLUDED.hemisphere,
      temperature_c=EXCLUDED.temperature_c,precipitation_mm=EXCLUDED.precipitation_mm,
      humidity_pct=EXCLUDED.humidity_pct,wind_ms=EXCLUDED.wind_ms,
      solar_kwh_m2_day=EXCLUDED.solar_kwh_m2_day,raw_payload=EXCLUDED.raw_payload,ingested_at=now()`,
      [source.rows[0].id,t.node_id,t.latitude,t.longitude,t.hemisphere,year,Number(key),
       monthly.T2M?.[key]??null,monthly.PRECTOTCORR?.[key]??null,monthly.RH2M?.[key]??null,
       monthly.WS2M?.[key]??null,monthly.ALLSKY_SFC_SW_DWN?.[key]??null,JSON.stringify(payload)]);
    rows++;
   }
   completed++;
  }catch(e){failed++;}
 }
 await client.query("UPDATE climate_coverage_runs_v29_18 SET finished_at=now(),status=$2,target_count=$3,completed_targets=$4,failed_targets=$5,ingested_rows=$6 WHERE id=$1",
  [run,failed?'partial':'success',targets.rowCount,completed,failed,rows]);
 console.log(JSON.stringify({ok:true,refreshed:refreshed.rows[0]?.inserted_or_updated??0,targets:targets.rowCount,completed,failed,rows}));
}catch(e){
 await client.query('ROLLBACK');
 await client.query("UPDATE climate_coverage_runs_v29_18 SET finished_at=now(),status='failed',error_sample=$2 WHERE id=$1",[run,JSON.stringify([{message:String(e.message)}])]);
 throw e;
}finally{await client.end()}
