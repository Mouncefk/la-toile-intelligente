import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:4300';
async function req(path,options={}){const r=await fetch(base+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});return {status:r.status,body:await r.json()};}
let r=await req('/api/professionals/v29/requests/not-valid');assert.equal(r.status,400);assert.equal(r.body.error,'public_request_id_invalid');
r=await req('/api/ai/v21/recommendations/1/reveal',{method:'POST',body:JSON.stringify({travelerId:1,confirm:false})});assert.equal(r.status,400);assert.equal(r.body.error,'explicit_confirmation_required');
console.log('V29 privacy gateway validation passed');