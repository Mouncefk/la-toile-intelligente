import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:4300';
async function get(path){
 const r=await fetch(base+path);
 const data=await r.json().catch(()=>({}));
 return {status:r.status,data};
}
const missing=await get('/api/professionals/v29/directory?countryIso3=MAR&lat=bad&lon=2');
assert.equal(missing.status,400);
assert.equal(missing.data.error,'lat_lon_invalid');
const pair=await get('/api/professionals/v29/directory?countryIso3=MAR&lat=31.6');
assert.equal(pair.status,400);
assert.equal(pair.data.error,'lat_lon_pair_required');
const badRadius=await get('/api/professionals/v29/directory?countryIso3=MAR&radiusKm=0');
assert.equal(badRadius.status,400);
assert.equal(badRadius.data.error,'radiusKm_invalid');
console.log(JSON.stringify({ok:true,tests:['invalid_coordinates','coordinate_pair','invalid_radius']}));
