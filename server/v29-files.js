function assertFileActor(thread,actorType,actorId){
  const id=Number(actorId);
  return Number.isInteger(id)&&id>0&&((actorType==='traveler'&&Number(thread.traveler_id)===id)||(actorType==='professional'&&Number(thread.professional_id)===id));
}
export function registerV29FileRoutes({app,pool}){
  app.post('/api/v29/conversations/:threadId/files',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.body?.actorType||''),actorId=Number(req.body?.actorId);
      const name=String(req.body?.originalName||'').trim(),mime=String(req.body?.mimeType||'').trim(),size=Number(req.body?.sizeBytes),storageKey=String(req.body?.storageKey||'').trim();
      if(!Number.isInteger(threadId)||threadId<=0)return res.status(400).json({error:'threadId_required'});
      if(!['traveler','professional'].includes(actorType)||!Number.isInteger(actorId)||actorId<=0)return res.status(400).json({error:'actor_invalid'});
      if(!name)return res.status(400).json({error:'original_name_required'});
      if(!mime)return res.status(400).json({error:'mime_type_required'});
      if(!Number.isInteger(size)||size<=0||size>10485760)return res.status(400).json({error:'file_size_invalid',maxBytes:10485760});
      if(!storageKey)return res.status(400).json({error:'storage_key_required'});
      const q=await pool.query("SELECT id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1",[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(q.rows[0].status!=='active')return res.status(409).json({error:'thread_closed'});
      if(!assertFileActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const f=await pool.query("INSERT INTO traveler_professional_files_v29(thread_id,uploader_type,uploader_id,original_name,mime_type,size_bytes,storage_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,thread_id,uploader_type,original_name,mime_type,size_bytes,status,created_at",[threadId,actorType,actorId,name,mime,size,storageKey]);
      await pool.query("UPDATE traveler_professional_threads_v29 SET updated_at=now() WHERE id=$1",[threadId]);
      res.status(201).json({version:'29.2',file:f.rows[0],privacy:{threadOnly:true,healthExcluded:true,identityProtected:true},principle:'files_stay_on_la_toile'});
    }catch(e){if(e.code==='23505')return res.status(409).json({error:'storage_key_already_exists'});res.status(500).json({error:e.message})}
  });

  app.get('/api/v29/conversations/:threadId/files',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.query.actorType||''),actorId=Number(req.query.actorId);
      const q=await pool.query("SELECT id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1",[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(!['traveler','professional'].includes(actorType)||!assertFileActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const f=await pool.query("SELECT id,thread_id,message_id,uploader_type,original_name,mime_type,size_bytes,status,created_at FROM traveler_professional_files_v29 WHERE thread_id=$1 AND status='available' ORDER BY created_at ASC,id ASC",[threadId]);
      res.json({version:'29.2',threadId,files:f.rows,privacy:{threadOnly:true,healthExcluded:true,identityProtected:true},principle:'files_stay_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}
  });
}