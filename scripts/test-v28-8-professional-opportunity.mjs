const base=process.env.TEST_BASE_URL||'http://localhost:4300';
const assert=(c,m)=>{if(!c)throw new Error(m)};
const travelerId=Number(process.env.TEST_TRAVELER_ID||1);
const run=async()=>{
 const r=await fetch(base+'/api/ai/v21-history/recommend',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({travelerId,intent:{activity:'Artisanat'}})});
 const data=await r.json(); assert(r.ok,'recommend failed: '+JSON.stringify(data)); assert(data.sessionId,'sessionId missing');
 const rec=data.recommendations?.[0]; assert(rec,'recommendation missing');
 const list=await fetch(base+'/api/ai/v21/sessions/'+data.sessionId+'/recommendations'); const ld=await list.json(); assert(list.ok&&ld.recommendations?.length,'persisted recommendations missing');
 const recId=ld.recommendations[0].id;
 const op=await fetch(base+'/api/ai/v21/recommendations/'+recId+'/opportunity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({travelerId,serviceNeeds:[{type:'artisanat',role:'artisan'}],location:{countryIso3:'MAR'},scope:'national'})});
 const od=await op.json(); assert(op.ok&&od.opportunity?.recommendation_id===recId,'opportunity persistence failed: '+JSON.stringify(od));
 const forbidden=await fetch(base+'/api/ai/v21/recommendations/'+recId+'/opportunity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({travelerId:travelerId+999,serviceNeeds:[],location:{},scope:'local'})}); assert(forbidden.status===403,'ownership enforcement failed');
 console.log('V28.8 professional opportunity E2E checks passed.');
}; run().catch(e=>{console.error(e);process.exit(1)});