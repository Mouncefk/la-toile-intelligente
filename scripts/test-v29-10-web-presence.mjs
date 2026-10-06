import assert from "node:assert/strict";
const base=process.env.BASE_URL||"http://localhost:4300";
async function req(path,options){const r=await fetch(base+path,options);const data=await r.json().catch(()=>({}));return {status:r.status,data};}
const missing=await req("/api/professionals/v29/999999/web-presence");
assert.equal(missing.status,404);
console.log(JSON.stringify({ok:true,tests:["professional_not_found"]}));
