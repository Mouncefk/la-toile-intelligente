function assertActor(thread,actorType,actorId){
  const id=Number(actorId);
  return Number.isInteger(id)&&id>0&&(
    (actorType==='traveler'&&Number(thread.traveler_id)===id)||
    (actorType==='professional'&&Number(thread.professional_id)===id)
  );
}

export function registerV29CommunicationRoutes({app,pool}){
  app.post('/api/v29/conversations',async(req,res)=>{
    const client=await pool.connect();
    try{
      const recommendationId=Number(req.body?.recommendationId);
      const travelerId=Number(req.body?.travelerId);
      const professionalId=Number(req.body?.professionalId);
      if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
      if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
      if(!Number.isInteger(professionalId)||professionalId<=0)return res.status(400).json({error:'professionalId_required'});
      const rec=await client.query("SELECT r.id,s.actor_id,o.request_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id JOIN ai_recommendation_opportunities_v28_8 o ON o.recommendation_id=r.id WHERE r.id=$1",[recommendationId]);
      if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
      if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
      const requestId=Number(rec.rows[0].request_id);
      const candidate=await client.query("SELECT r.id FROM professional_responses_v12 r JOIN request_dispatches_v12 d ON d.id=r.dispatch_id WHERE d.request_id=$1 AND r.professional_id=$2 LIMIT 1",[requestId,professionalId]);
      if(!candidate.rows[0])return res.status(403).json({error:'professional_not_in_request'});
      const q=await client.query("INSERT INTO traveler_professional_threads_v29(recommendation_id,request_id,traveler_id,professional_id) VALUES($1,$2,$3,$4) ON CONFLICT(recommendation_id,professional_id) DO UPDATE SET updated_at=now() RETURNING id,recommendation_id,request_id,traveler_id,professional_id,status,created_at,updated_at",[recommendationId,requestId,travelerId,professionalId]);
      let initial=null;
      const body=String(req.body?.message||'').trim();
      if(body){
        const m=await client.query("INSERT INTO traveler_professional_messages_v29(thread_id,sender_type,sender_id,body) VALUES($1,'traveler',$2,$3) RETURNING id,sender_type,sender_id,body,status,created_at,read_at",[q.rows[0].id,travelerId,body]);
        initial=m.rows[0];
        await client.query("UPDATE traveler_professional_threads_v29 SET updated_at=now() WHERE id=$1",[q.rows[0].id]);
      }
      res.status(201).json({version:'29.1',thread:q.rows[0],initialMessage:initial,privacy:{anonymousByDefault:true,healthExcluded:true,contactDetailsExcluded:true},principle:'communicate_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}finally{client.release()}
  });

  app.get('/api/v29/conversations/:threadId',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.query.actorType||''),actorId=Number(req.query.actorId);
      if(!Number.isInteger(threadId)||threadId<=0)return res.status(400).json({error:'threadId_required'});
      if(!['traveler','professional'].includes(actorType))return res.status(400).json({error:'actorType_invalid'});
      const q=await pool.query("SELECT id,recommendation_id,request_id,traveler_id,professional_id,status,created_at,updated_at FROM traveler_professional_threads_v29 WHERE id=$1",[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      const thread=q.rows[0];
      if(!assertActor(thread,actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const m=await pool.query("SELECT id,sender_type,sender_id,body,status,created_at,read_at FROM traveler_professional_messages_v29 WHERE thread_id=$1 ORDER BY created_at ASC,id ASC",[threadId]);
      const unread=await pool.query("SELECT count(*)::int AS count FROM traveler_professional_messages_v29 WHERE thread_id=$1 AND sender_type<>$2 AND status<>'read'",[threadId,actorType]);
      res.json({version:'29.1',thread:{...thread,identity:{travelerLabel:'Voyageur',professionalLabel:'Professionnel'}},messages:m.rows,unreadCount:unread.rows[0].count,privacy:{anonymousByDefault:true,healthExcluded:true,contactDetailsExcluded:true},principle:'communicate_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}
  });

  app.post('/api/v29/conversations/:threadId/messages',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.body?.actorType||''),actorId=Number(req.body?.actorId),body=String(req.body?.body||'').trim();
      if(!Number.isInteger(threadId)||threadId<=0)return res.status(400).json({error:'threadId_required'});
      if(!['traveler','professional'].includes(actorType))return res.status(400).json({error:'actorType_invalid'});
      if(!Number.isInteger(actorId)||actorId<=0)return res.status(400).json({error:'actorId_required'});
      if(!body)return res.status(400).json({error:'message_required'});
      if(body.length>5000)return res.status(400).json({error:'message_too_long'});
      const q=await pool.query("SELECT id,recommendation_id,request_id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1",[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(q.rows[0].status!=='active')return res.status(409).json({error:'thread_closed'});
      if(!assertActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const m=await pool.query("INSERT INTO traveler_professional_messages_v29(thread_id,sender_type,sender_id,body) VALUES($1,$2,$3,$4) RETURNING id,sender_type,sender_id,body,status,created_at,read_at",[threadId,actorType,actorId,body]);
      await pool.query("UPDATE traveler_professional_threads_v29 SET updated_at=now() WHERE id=$1",[threadId]);
      res.status(201).json({version:'29.1',message:m.rows[0],privacy:{anonymousByDefault:true,healthExcluded:true,contactDetailsExcluded:true},principle:'communicate_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}
  });

  app.post('/api/v29/conversations/:threadId/read',async(req,res)=>{
    try{
      const threadId=Number(req.params.threadId),actorType=String(req.body?.actorType||''),actorId=Number(req.body?.actorId);
      const q=await pool.query("SELECT id,traveler_id,professional_id,status FROM traveler_professional_threads_v29 WHERE id=$1",[threadId]);
      if(!q.rows[0])return res.status(404).json({error:'thread_not_found'});
      if(!['traveler','professional'].includes(actorType)||!assertActor(q.rows[0],actorType,actorId))return res.status(403).json({error:'thread_forbidden'});
      const updated=await pool.query("UPDATE traveler_professional_messages_v29 SET status='read',read_at=now() WHERE thread_id=$1 AND sender_type<>$2 AND status<>'read' RETURNING id",[threadId,actorType]);
      res.json({version:'29.1',threadId,readCount:updated.rowCount,principle:'communicate_on_la_toile'});
    }catch(e){res.status(500).json({error:e.message})}
  });
}
