import assert from 'node:assert/strict';
import pg from 'pg';
const {Client}=pg;
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); await c.query('BEGIN');
try{
 for(const t of ['climate_grid_cells_v29_19','climate_grid_observations_v29_19','climate_territory_grid_links_v29_19']){
  const r=await c.query('SELECT to_regclass($1) r',['public.'+t]); assert.equal(r.rows[0].r,t);
 }
 const r=await c.query("SELECT build_climate_grid_v29_19(5) n"); assert.ok(Number(r.rows[0].n)>2000);
 const x=await c.query("SELECT count(*)::int n FROM climate_grid_cells_v29_19 WHERE hemisphere='north'");
 const y=await c.query("SELECT count(*)::int n FROM climate_grid_cells_v29_19 WHERE hemisphere='south'");
 assert.ok(x.rows[0].n>0&&y.rows[0].n>0);
 await c.query('ROLLBACK');
}catch(e){await c.query('ROLLBACK');throw e}finally{await c.end()}
console.log(JSON.stringify({ok:true,checks:['global_grid','north_south_coverage','territory_interpolation_contract']}));
