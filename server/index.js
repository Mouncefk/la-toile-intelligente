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

app.post('/api/travelers/v14/:travelerId/vault/items', async (req,res)=>{
 const {itemType,title,summary='',countryIso3=null,metadata={},isPrivate=true}=req.body;