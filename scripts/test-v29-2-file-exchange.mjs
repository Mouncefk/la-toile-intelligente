const assert=(c,m)=>{if(!c)throw new Error(m)};
const base=process.env.TEST_BASE_URL||'http://localhost:4300';
const headers={'content-type':'application/json'};
(async()=>{
 const travelerId=Number(process.env.TEST_TRAVELER_ID||1);
 const rr=await fetch(base+'/api/ai/v21-history/recommend',{method:'POST',headers,body:JSON.stringify({travelerId,intent:{activity:'Artisanat'}})});
 const rd=await rr.json(); assert(rr.ok&&rd.sessionId,'recommend failed');
 const lr=await fetch(base+'/api/ai/v21/sessions/'+rd.sessionId+'/recommendations'); const ld=await lr.json();
 assert(lr.ok&&ld.recommendations?.length,'recommendation missing');
 const recommendationId=ld.recommendations[0].id;
 const op=await fetch(base+'/api/ai/v21/recommendations/'+recommendationId+'/opportunity',{method:'POST',headers,body:JSON.stringify({travelerId,serviceNeeds:[{type:'artisanat',role:'artisan'}],location:{countryIso3:'MAR'},scope:'national'})});
 assert(op.ok,'opportunity failed');
 const dp=await fetch(base+'/api/ai/v21/recommendations/'+recommendationId+'/opportunity/dispatch',{method:'POST',headers,body:JSON.stringify({travelerId,rawText:'Recherche artisanat',radiusKm:100})});
 const dd=await dp.json(); assert(dp.status===201,'dispatch failed '+JSON.stringify(dd));
 const rp=await fetch(base+'/api/ai/v21/recommendations/'+recommendationId+'/professional-responses?travelerId='+travelerId); let rpd=await rp.json();
 if(!rpd.responses?.length){
   const {Client}=await import('pg'); const db=new Client({connectionString:process.env.DATABASE_URL||'postgresql://latoile:latoile_dev@localhost:5432/la_toile'}); await db.connect();
   const ds=await db.query('SELECT id,professional_id FROM request_dispatches_v12 WHERE request_id=$1 ORDER BY id LIMIT 1',[dd.requestId]);
   assert(ds.rows[0],'no dispatched professional available'); await db.query("INSERT INTO professional_responses_v12(dispatch_id,professional_id,message) VALUES($1,$2,'Réponse de test V29.2') ON CONFLICT DO NOTHING",[ds.rows[0].id,ds.rows[0].professional_id]); await db.end();
   const retry=await fetch(base+'/api/ai/v21/recommendations/'+recommendationId+'/professional-responses?travelerId='+travelerId); rpd=await retry.json();
 }
 assert(rpd.responses?.length,'no professional response'); const professionalId=Number(rpd.responses[0].professionalId);
 const cr=await fetch(base+'/api/v29/conversations',{method:'POST',headers,body:JSON.stringify({recommendationId,travelerId,professionalId})}); const cd=await cr.json();
 assert(cr.status===201&&cd.thread?.id,'thread failed'); const tid=cd.thread.id;
 const form=new FormData(); form.append('actorType','traveler'); form.append('actorId',String(travelerId)); form.append('file',new Blob(['La Toile private attachment test'],{type:'text/plain'}),'test-la-toile.txt');
 const up=await fetch(base+'/api/v29/conversations/'+tid+'/files',{method:'POST',body:form}); const ud=await up.json();
 assert(up.status===201&&ud.file?.id,'upload failed '+JSON.stringify(ud));
 assert(ud.privacy?.threadOnly===true&&ud.privacy?.healthExcluded===true,'file privacy flags missing');
 const list=await fetch(base+'/api/v29/conversations/'+tid+'/files?actorType=traveler&actorId='+travelerId); const ld2=await list.json();
 assert(list.ok&&ld2.files?.some(x=>x.id===ud.file.id),'file listing failed');
 const dl=await fetch(base+'/api/v29/conversations/'+tid+'/files/'+ud.file.id+'?actorType=traveler&actorId='+travelerId); const text=await dl.text();
 assert(dl.ok&&text.includes('La Toile private attachment test'),'download failed');
 const other=await fetch(base+'/api/v29/conversations/'+tid+'/files/'+ud.file.id+'?actorType=traveler&actorId=2');
 assert(other.status===403,'unauthorized traveler downloaded file');
 const badForm=new FormData(); badForm.append('actorType','traveler'); badForm.append('actorId',String(travelerId)); badForm.append('file',new Blob(['x'],{type:'application/x-msdownload'}),'bad.exe');
 const bad=await fetch(base+'/api/v29/conversations/'+tid+'/files',{method:'POST',body:badForm});
 assert(bad.status===400,'disallowed file type accepted');
 console.log('V29.2 private in-platform file exchange E2E checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});