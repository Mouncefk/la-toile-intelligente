app.get('/api/travelers/v14/:travelerId/vault', async (req,res)=>{
 try {
  const id=Number(req.params.travelerId);
  const items=await pool.query(`SELECT id,item_type,title,summary,country_iso3,metadata,is_private,created_at,updated_at FROM traveler_vault_items_v14 WHERE traveler_id=$1 ORDER BY updated_at DESC`,[id]);
  const health=await pool.query(`SELECT traveler_id,allergies,blood_type,important_treatments,emergency_contacts,reference_doctor,reference_facility,notes,share_in_emergency,updated_at FROM traveler_health_v14 WHERE traveler_id=$1`,[id]);
  res.json({travelerId:id,items:items.rows,health:health.rows[0]||null,privacy:'private'});
 } catch(e){res.status(500).json({error:e.message})}
});


// V28.5 — historical context for recommendations; health excluded
app.get('/api/travelers/v28-5/history',async(req,res)=>{
 try{
  const id=Number(req.query.travelerId);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'travelerId_required'});
  const items=await pool.query("SELECT item_type,title,summary,country_iso3,metadata,created_at,updated_at FROM traveler_vault_items_v14 WHERE traveler_id=$1 AND item_type IN ('trip','memory','request','response','reservation') ORDER BY updated_at DESC",[id]);
  const trips=await pool.query("SELECT trip_id,title,country_iso3,status,start_date,end_date,metadata FROM traveler_journey_v15 WHERE traveler_id=$1 ORDER BY start_date NULLS LAST,updated_at DESC",[id]);
  res.json({travelerId:id,healthExcluded:true,vaultItems:items.rows,trips:trips.rows});
 }catch(e){res.status(500).json({error:e.message})}
});

// V28.5 — V21 recommendation endpoint enriched by real non-sensitive history
app.post('/api/ai/v21-history/recommend',async(req,res)=>{
 try{
  const travelerId=Number(req.body.travelerId);
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  const intent=req.body.intent||{};
  const seasonal=req.body.seasonal||null;
  const items=await pool.query("SELECT item_type,title,summary,country_iso3,metadata FROM traveler_vault_items_v14 WHERE traveler_id=$1 AND item_type IN ('trip','memory','request','response','reservation') ORDER BY updated_at DESC LIMIT 100",[travelerId]);
  const trips=await pool.query("SELECT trip_id,title,country_iso3,status,start_date,end_date,metadata FROM traveler_journey_v15 WHERE traveler_id=$1 ORDER BY start_date NULLS LAST,updated_at DESC LIMIT 100",[travelerId]);
  const historyItems=items.rows;
  const tripRows=trips.rows;
  const {buildRecommendationContext}=await import('./recommendation-bridge-v28-5.js');
  const context=buildRecommendationContext({intent,historyItems,trips:tripRows,seasonal});
  const recommendations=context.travelHistory.signals.length
    ? [{id:'continuity',title:'Retrouver une expérience déjà rencontrée',reason:'Votre historique fait apparaître une continuité possible avec votre recherche actuelle.'},{id:'discovery',title:'Découvrir autre chose',reason:'La Toile peut aussi vous ouvrir une autre piste pour cette recherche.'}]
    : [{id:'discovery',title:'Explorer de nouvelles possibilités',reason:'Votre historique ne fournit pas encore de signal suffisamment précis ; La Toile privilégie l’exploration.'}];
  res.json({version:'v28.5',travelerId,context,recommendations,principle:'assist_not_decide'});
 }catch(e){res.status(500).json({error:e.message})}
});


app.post('/api/travelers/v14/:travelerId/vault/items', async (req,res)=>{
 const {itemType,title,summary='',countryIso3=null,metadata={},isPrivate=true}=req.body;