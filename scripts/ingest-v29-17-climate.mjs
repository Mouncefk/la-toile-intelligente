import pg from 'pg';
const {Client}=pg;
const DATABASE_URL=process.env.DATABASE_URL;
if(!DATABASE_URL) throw new Error('DATABASE_URL is required');
const endpoint='https://power.larc.nasa.gov/api/temporal/climatology/point';
const lat=Number(process.env.LATITUDE ?? 0);
const lon=Number(process.env.LONGITUDE ?? 0);
if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180) throw new Error('LATITUDE/LONGITUDE invalid');
const hemisphere=lat>0.1?'north':lat<-0.1?'south':'equatorial';
const client=new Client({connectionString:DATABASE_URL});
await client.connect();
const src=await client.query("SELECT id FROM climate_sources_v29_17 WHERE source_code='NASA_POWER_CLIMATOLOGY'");
if(!src.rowCount) throw new Error('V29.17 source registry is not initialized');
const sourceId=src.rows[0].id;
const params=new URLSearchParams({parameters:'T2M,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN',community:'AG',longitude:String(lon),latitude:String(lat),format:'JSON'});
const response=await fetch(endpoint+'?'+params);
if(!response.ok) throw new Error('NASA POWER request failed: '+response.status);
const payload=await response.json();
const monthly=payload?.properties?.parameter ?? {};
const year=Number(process.env.CLIMATE_YEAR ?? new Date().getUTCFullYear());
const months=Object.keys(monthly.T2M ?? {});
const run=await client.query("INSERT INTO climate_ingestion_runs_v29_17(source_id,status,requested_points) VALUES($1,'running',1) RETURNING id",[sourceId]);
let count=0;
try{
 await client.query('BEGIN');
 for(const key of months){
  const month=Number(key);
  await client.query(`INSERT INTO climate_observations_v29_17
   (source_id,latitude,longitude,hemisphere,year,month,temperature_c,precipitation_mm,humidity_pct,wind_ms,solar_kwh_m2_day,raw_payload)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
   ON CONFLICT(source_id,territory_node_id,year,month) DO UPDATE SET
   temperature_c=EXCLUDED.temperature_c,precipitation_mm=EXCLUDED.precipitation_mm,humidity_pct=EXCLUDED.humidity_pct,
   wind_ms=EXCLUDED.wind_ms,solar_kwh_m2_day=EXCLUDED.solar_kwh_m2_day,raw_payload=EXCLUDED.raw_payload,ingested_at=now()`,
   [sourceId,lat,lon,hemisphere,year,month,monthly.T2M?.[key]??null,monthly.PRECTOTCORR?.[key]??null,monthly.RH2M?.[key]??null,monthly.WS2M?.[key]??null,monthly.ALLSKY_SFC_SW_DWN?.[key]??null,JSON.stringify(payload)]);
  count++;
 }
 await client.query('COMMIT');
 await client.query("UPDATE climate_ingestion_runs_v29_17 SET finished_at=now(),status='success',ingested_rows=$2 WHERE id=$1",[run.rows[0].id,count]);
}catch(e){
 await client.query('ROLLBACK');
 await client.query("UPDATE climate_ingestion_runs_v29_17 SET finished_at=now(),status='failed',error_sample=$2 WHERE id=$1",[run.rows[0].id,JSON.stringify([{message:String(e.message)}])]);
 throw e;
}finally{await client.end()}
console.log(JSON.stringify({ok:true,source:'NASA POWER',latitude:lat,longitude:lon,hemisphere,year,months:count}));
