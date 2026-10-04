import express from 'express';
import pg from 'pg';
const {Pool}=pg;
const app=express();
const pool=new Pool({connectionString:process.env.DATABASE_URL||'postgresql://latoile:latoile_dev@localhost:5432/la_toile'});
app.use(express.json());

function understand(rawText){
 const t=rawText.toLowerCase();
 const intent={activity:null,travelerProfile:null,companion:null,safety:false,location:null,dates:null,pace:null};
 if(/désert|sahara|erg/.test(t))intent.activity='Désert'; else if(/artisan|atelier|artisanat/.test(t))intent.activity='Artisanat'; else if(/montagne|ski|randonn/.test(t))intent.activity='Montagne'; else if(/mer|plage|balnéaire|océan/.test(t))intent.activity='Balnéaire'; else if(/culture|patrimoine|musée/.test(t))intent.activity='Culture & Patrimoine'; else if(/gastronom|cuisine|restaurant/.test(t))intent.activity='Gastronomie';
 if(/senior|âgé|agée|mère|père|parents|mobilité/.test(t)){intent.travelerProfile='Tourisme senior';if(/mère|père|parents/.test(t))intent.companion='Parent'}
 if(/médec|pharm|hôpital|clinique|santé|sécur|urgence/.test(t))intent.safety=true;
 if(/tranquille|calme|doucement|sans stress/.test(t))intent.pace='Tranquille';
 if(/marrakech/.test(t))intent.location='Marrakech'; else if(/rabat/.test(t))intent.location='Rabat'; else if(/paris/.test(t))intent.location='Paris'; else if(/tokyo/.test(t))intent.location='Tokyo';
 if(/janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|\b20\d{2}\b/.test(t))intent.dates='Période mentionnée';
 const missing=[]; if(!intent.activity)missing.push('activity'); if(!intent.location)missing.push('location'); if(!intent.dates)missing.push('dates');
 const confidence=Math.round(((intent.activity?1:0)+(intent.travelerProfile?1:0)+(intent.safety?1:0)+(intent.location?1:0)+(intent.dates?1:0)+(intent.pace?1:0))/6*100);
 return {intent,missing,confidence};
}

function scoreCandidate(row,intent){
 let score=100, reasons=[];
 const d=Number(row.distance_km||0);
 if(d<=5){score+=20;reasons.push('Très proche');} else if(d<=20){score+=12;reasons.push('À proximité');} else if(d<=50){score+=5;reasons.push('Dans le rayon recherché');} else score-=Math.min(25,d/20);
 if(intent.safety && row.service_label && /santé|sécurité|médec|pharm|urgence/i.test(row.service_label)){score+=25;reasons.push('Santé & Sécurité compatible');}
 if(intent.activity && row.service_label && row.service_label.toLowerCase().includes(intent.activity.toLowerCase())){score+=20;reasons.push('Spécialité compatible');}
 return {score:Math.max(0,Math.min(100,score)),reasons};
}

app.get('/api/health',(req,res)=>res.json({ok:true,version:'17.0.0',engine:'intent+matching+responses+professional-space+traveler-vault+journey+reservations+pro-network+b2b-rfq+institutional-dashboard'}));

app.get('/api/institutions/v17/:institutionId/dashboard',async(req,res)=>{
 try{
  const countryId=req.query.countryId?Number(req.query.countryId):null;
  const q=await pool.query(`SELECT * FROM institutional_dashboard_v17 WHERE ($1::bigint IS NULL OR country_id=$1) ORDER BY metric_key`,[countryId]);
  const insights=await pool.query(`SELECT * FROM institutional_insights_v17 WHERE institution_id=$1 ORDER BY generated_at DESC LIMIT 20`,[req.params.institutionId]);
  res.json({institutionId:Number(req.params.institutionId),countryId,confidentiality:'aggregated_only',metrics:q.rows,insights:insights.rows});
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/institutions/v17/:institutionId/metrics',async(req,res)=>{
 const {countryId=null,periodStart,periodEnd,metricKey,metricValue=0,dimension={}}=req.body;
 if(!periodStart||!periodEnd||!metricKey)return res.status(400).json({error:'periodStart_periodEnd_metricKey_required'});
 try{const q=await pool.query(`INSERT INTO institutional_metrics_v17(institution_id,country_id,period_start,period_end,metric_key,metric_value,dimension) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.institutionId,countryId,periodStart,periodEnd,metricKey,metricValue,dimension]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/institutions/v17/:institutionId/insights',async(req,res)=>{
 const {countryId=null,insightType='trend',title,summary,evidence={}}=req.body;
 if(!title||!summary)return res.status(400).json({error:'title_summary_required'});
 try{const q=await pool.query(`INSERT INTO institutional_insights_v17(institution_id,country_id,insight_type,title,summary,evidence) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.params.institutionId,countryId,insightType,title,summary,evidence]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.get('/api/country/:iso3',async(req,res)=>{try{const q=await pool.query(`SELECT c.id,c.iso2,c.iso3,c.name_fr,c.geom,cc.config_key,cc.languages,cc.currency_code,cc.currency_symbol,cc.tourism_types,cc.categories,cc.services,cc.config_version FROM countries c LEFT JOIN country_configs cc ON cc.country_id=c.id WHERE c.active=true AND upper(c.iso3)=upper($1)`,[req.params.iso3]);if(!q.rows[0])return res.status(404).json({error:'country_not_found'});res.json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/intent/qualify',(req,res)=>{if(!req.body.rawText?.trim())return res.status(400).json({error:'rawText_required'});res.json({rawText:req.body.rawText,...understand(req.body.rawText)})});
app.post('/api/intent/sessions',async(req,res)=>{const {countryId,travelerId,rawText}=req.body;if(!rawText?.trim())return res.status(400).json({error:'rawText_required'});const qf=understand(rawText);try{const q=await pool.query(`INSERT INTO intent_sessions_v10(traveler_id,country_id,raw_text,intent,missing_fields,confidence) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[travelerId||null,countryId||null,rawText,qf.intent,JSON.stringify(qf.missing),qf.confidence]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}});

app.post('/api/matching/search',async(req,res)=>{
 const {lat,lon,radiusKm=100,serviceKey=null,rawText='',intent:providedIntent}=req.body;
 if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))return res.status(400).json({error:'lat_lon_required'});
 const intent=providedIntent||understand(rawText).intent;
 try{
  const q=await pool.query(`SELECT * FROM match_professionals_v11($1,$2,$3,$4) LIMIT 100`,[Number(lat),Number(lon),Number(radiusKm),serviceKey]);
  const results=q.rows.map(r=>{const s=scoreCandidate(r,intent);return {...r,match_score:Math.round(s.score),reasons:s.reasons}}).sort((a,b)=>b.match_score-a.match_score);
  res.json({intent,radiusKm:Number(radiusKm),count:results.length,results});
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/matching/save',async(req,res)=>{
 const {requestId,professionalId,score,reasons=[],distanceKm=null}=req.body;
 if(!professionalId||score===undefined)return res.status(400).json({error:'professionalId_and_score_required'});
 try{const q=await pool.query(`INSERT INTO traveler_match_results_v11(request_id,professional_id,score,reasons,distance_km) VALUES($1,$2,$3,$4,$5) RETURNING *`,[requestId||null,professionalId,score,JSON.stringify(reasons),distanceKm]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});




app.get('/api/professionals/v13/:professionalId/inbox',async(req,res)=>{
 try{const q=await pool.query(`SELECT * FROM professional_inbox_v13 WHERE professional_id=$1 ORDER BY match_score DESC,sent_at DESC`,[req.params.professionalId]);res.json({professionalId:Number(req.params.professionalId),count:q.rowCount,requests:q.rows})}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/professionals/v13/:professionalId/requests/:dispatchId/action',async(req,res)=>{
 const {action,note=null}=req.body;
 if(!['viewed','accepted','declined','withdrawn'].includes(action))return res.status(400).json({error:'invalid_action'});
 try{const q=await pool.query(`INSERT INTO professional_request_actions_v13(dispatch_id,professional_id,action,note) VALUES($1,$2,$3,$4) RETURNING *`,[req.params.dispatchId,req.params.professionalId,action,note]); await pool.query(`UPDATE request_dispatches_v12 SET status=$1 WHERE id=$2 AND professional_id=$3`,[action,req.params.dispatchId,req.params.professionalId]); res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.put('/api/professionals/v13/:professionalId/profile',async(req,res)=>{
 const {displayName='',headline='',phone='',email='',website='',address='',languages=[],specialties=[],serviceAreaKm=50,acceptingRequests=true,availabilityStatus='available'}=req.body;
 try{const q=await pool.query(`INSERT INTO professional_profiles_v13(professional_id,display_name,headline,phone,email,website,address,languages,specialties,service_area_km,accepting_requests,availability_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(professional_id) DO UPDATE SET display_name=EXCLUDED.display_name,headline=EXCLUDED.headline,phone=EXCLUDED.phone,email=EXCLUDED.email,website=EXCLUDED.website,address=EXCLUDED.address,languages=EXCLUDED.languages,specialties=EXCLUDED.specialties,service_area_km=EXCLUDED.service_area_km,accepting_requests=EXCLUDED.accepting_requests,availability_status=EXCLUDED.availability_status,updated_at=now() RETURNING *`,[req.params.professionalId,displayName,headline,phone,email,website,address,languages,specialties,serviceAreaKm,acceptingRequests,availabilityStatus]);res.json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/professionals/v13/:professionalId/availability',async(req,res)=>{
 const {startAt,endAt,status='available',note=null}=req.body;
 if(!startAt||!endAt)return res.status(400).json({error:'startAt_endAt_required'});
 try{const q=await pool.query(`INSERT INTO professional_availability_v13(professional_id,start_at,end_at,status,note) VALUES($1,$2,$3,$4,$5) RETURNING *`,[req.params.professionalId,startAt,endAt,status,note]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.get('/api/professionals/v13/:professionalId/availability',async(req,res)=>{
 try{const q=await pool.query(`SELECT * FROM professional_availability_v13 WHERE professional_id=$1 ORDER BY start_at`,[req.params.professionalId]);res.json({professionalId:Number(req.params.professionalId),count:q.rowCount,availability:q.rows})}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/requests/v12',async(req,res)=>{
 const {countryId,travelerId,rawText,intent={}}=req.body;
 if(!rawText?.trim())return res.status(400).json({error:'rawText_required'});
 try{const q=await pool.query(`INSERT INTO traveler_requests_v12(country_id,traveler_id,raw_text,intent,status) VALUES($1,$2,$3,$4,'qualified') RETURNING *`,[countryId||null,travelerId||null,rawText,intent]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/requests/v12/:id/dispatch',async(req,res)=>{
 try{const q=await pool.query(`SELECT dispatch_request_v12($1,$2) AS dispatched`,[req.params.id,Number(req.body.radiusKm||100)]);res.json({requestId:Number(req.params.id),dispatched:Number(q.rows[0].dispatched)})}catch(e){res.status(500).json({error:e.message})}
});

app.get('/api/requests/v12/:id/responses',async(req,res)=>{
 try{const q=await pool.query(`SELECT r.*,p.name AS professional_name,d.match_score,d.distance_km FROM professional_responses_v12 r JOIN request_dispatches_v12 d ON d.id=r.dispatch_id JOIN professionals p ON p.id=r.professional_id WHERE d.request_id=$1 ORDER BY d.match_score DESC,r.created_at DESC`,[req.params.id]);res.json({requestId:Number(req.params.id),count:q.rowCount,responses:q.rows})}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/responses/v12',async(req,res)=>{
 const {dispatchId,professionalId,message='',availabilityStatus='available',proposedStart=null,proposedEnd=null,priceAmount=null,currencyCode=null,conditions={}}=req.body;
 if(!dispatchId||!professionalId)return res.status(400).json({error:'dispatchId_and_professionalId_required'});
 try{const q=await pool.query(`INSERT INTO professional_responses_v12(dispatch_id,professional_id,message,availability_status,proposed_start,proposed_end,price_amount,currency_code,conditions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[dispatchId,professionalId,message,availabilityStatus,proposedStart,proposedEnd,priceAmount,currencyCode,conditions]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/requests/v12/:id/compare',async(req,res)=>{
 const {travelerId=null,selectedResponseId=null,responseIds=[]}=req.body;
 try{const q=await pool.query(`INSERT INTO response_comparisons_v12(request_id,traveler_id,selected_response_id,compared_response_ids) VALUES($1,$2,$3,$4) RETURNING *`,[req.params.id,travelerId,selectedResponseId,responseIds]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/requests',async(req,res)=>{const {countryId,rawText,intent={}}=req.body;if(!rawText)return res.status(400).json({error:'rawText_required'});try{const q=await pool.query(`INSERT INTO traveler_requests_v9(country_id,raw_text,intent,status) VALUES($1,$2,$3,'qualified') RETURNING *`,[countryId||null,rawText,intent]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}});

// V15 — Journey / Reservations / trip tracking
app.get('/api/travelers/v15/:travelerId/journey', async (req,res)=>{
 try {
  const id=Number(req.params.travelerId);
  const q=await pool.query(`SELECT * FROM traveler_journey_v15 WHERE traveler_id=$1 ORDER BY start_date NULLS LAST,updated_at DESC`,[id]);
  res.json({travelerId:id,count:q.rowCount,trips:q.rows});
 } catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/travelers/v15/:travelerId/trips', async (req,res)=>{
 const {title,countryIso3=null,status='planning',startDate=null,endDate=null,timezone=null,metadata={}}=req.body;
 if(!title?.trim()) return res.status(400).json({error:'title_required'});
 if(!['planning','upcoming','ongoing','completed','cancelled'].includes(status)) return res.status(400).json({error:'invalid_status'});
 try{
  const q=await pool.query(`INSERT INTO traveler_trips_v15(traveler_id,title,country_iso3,status,start_date,end_date,timezone,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.params.travelerId,title,countryIso3,status,startDate,endDate,timezone,metadata]);
  res.status(201).json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.get('/api/travelers/v15/:travelerId/trips/:tripId', async (req,res)=>{
 try{
  const q=await pool.query(`SELECT * FROM traveler_journey_v15 WHERE traveler_id=$1 AND trip_id=$2`,[req.params.travelerId,req.params.tripId]);
  if(!q.rows[0]) return res.status(404).json({error:'trip_not_found'});
  res.json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.patch('/api/travelers/v15/:travelerId/trips/:tripId/status', async (req,res)=>{
 const {status}=req.body;
 if(!['planning','upcoming','ongoing','completed','cancelled'].includes(status)) return res.status(400).json({error:'invalid_status'});
 try{
  const q=await pool.query(`UPDATE traveler_trips_v15 SET status=$1,updated_at=now() WHERE id=$2 AND traveler_id=$3 RETURNING *`,[status,req.params.tripId,req.params.travelerId]);
  if(!q.rows[0]) return res.status(404).json({error:'trip_not_found'});
  res.json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/travelers/v15/:travelerId/trips/:tripId/segments', async (req,res)=>{
 const {segmentType,title,location=null,startAt=null,endAt=null,status='planned',referenceCode=null,providerName=null,metadata={}}=req.body;
 if(!segmentType||!title?.trim()) return res.status(400).json({error:'segmentType_and_title_required'});
 try{
  const q=await pool.query(`INSERT INTO trip_segments_v15(trip_id,segment_type,title,location,start_at,end_at,status,reference_code,provider_name,metadata) SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 WHERE EXISTS (SELECT 1 FROM traveler_trips_v15 WHERE id=$1 AND traveler_id=$11) RETURNING *`,[req.params.tripId,segmentType,title,location,startAt,endAt,status,referenceCode,providerName,metadata,req.params.travelerId]);
  if(!q.rows[0]) return res.status(404).json({error:'trip_not_found'});
  res.status(201).json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/travelers/v15/:travelerId/reservations', async (req,res)=>{
 const {tripId=null,segmentId=null,professionalId=null,reservationType,providerName=null,confirmationCode=null,status='pending',startAt=null,endAt=null,amount=null,currencyCode=null,details={}}=req.body;
 if(!reservationType?.trim()) return res.status(400).json({error:'reservationType_required'});
 try{
  const q=await pool.query(`INSERT INTO traveler_reservations_v15(traveler_id,trip_id,segment_id,professional_id,reservation_type,provider_name,confirmation_code,status,start_at,end_at,amount,currency_code,details) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[req.params.travelerId,tripId,segmentId,professionalId,reservationType,providerName,confirmationCode,status,startAt,endAt,amount,currencyCode,details]);
  res.status(201).json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.patch('/api/travelers/v15/:travelerId/reservations/:reservationId/status', async (req,res)=>{
 const {status}=req.body;
 if(!['pending','confirmed','modified','cancelled','completed'].includes(status)) return res.status(400).json({error:'invalid_status'});
 try{
  const q=await pool.query(`UPDATE traveler_reservations_v15 SET status=$1,updated_at=now() WHERE id=$2 AND traveler_id=$3 RETURNING *`,[status,req.params.reservationId,req.params.travelerId]);
  if(!q.rows[0]) return res.status(404).json({error:'reservation_not_found'});
  res.json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/travelers/v15/:travelerId/trips/:tripId/events', async (req,res)=>{
 const {eventType,title,description=null,eventAt=null,status='planned',metadata={}}=req.body;
 if(!eventType||!title?.trim()) return res.status(400).json({error:'eventType_and_title_required'});
 try{
  const q=await pool.query(`INSERT INTO trip_events_v15(trip_id,event_type,title,description,event_at,status,metadata) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS (SELECT 1 FROM traveler_trips_v15 WHERE id=$1 AND traveler_id=$8) RETURNING *`,[req.params.tripId,eventType,title,description,eventAt,status,metadata,req.params.travelerId]);
  if(!q.rows[0]) return res.status(404).json({error:'trip_not_found'});
  res.status(201).json(q.rows[0]);
 }catch(e){res.status(500).json({error:e.message})}
});



// V16 — Pro→Pro network, messaging and B2B RFQ
app.get('/api/pro-network/v16/:professionalId/connections', async (req,res)=>{
 try{const q=await pool.query(`SELECT c.*, CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END AS other_professional_id, p.name AS other_professional_name FROM professional_connections_v16 c JOIN professionals p ON p.id=CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END WHERE c.requester_id=$1 OR c.recipient_id=$1 ORDER BY c.updated_at DESC`,[req.params.professionalId]);res.json({professionalId:Number(req.params.professionalId),count:q.rowCount,connections:q.rows})}catch(e){res.status(500).json({error:e.message})}
});
app.post('/api/pro-network/v16/:professionalId/connections', async (req,res)=>{
 const {recipientId}=req.body;if(!recipientId||Number(recipientId)===Number(req.params.professionalId))return res.status(400).json({error:'valid_recipientId_required'});
 try{const q=await pool.query(`INSERT INTO professional_connections_v16(requester_id,recipient_id) VALUES($1,$2) ON CONFLICT(requester_id,recipient_id) DO UPDATE SET updated_at=now() RETURNING *`,[req.params.professionalId,recipientId]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});
app.patch('/api/pro-network/v16/connections/:requesterId/:recipientId', async (req,res)=>{
 const {status}=req.body;if(!['accepted','declined','blocked'].includes(status))return res.status(400).json({error:'invalid_status'});
 try{const q=await pool.query(`UPDATE professional_connections_v16 SET status=$1,updated_at=now() WHERE requester_id=$2 AND recipient_id=$3 RETURNING *`,[status,req.params.requesterId,req.params.recipientId]);if(!q.rows[0])return res.status(404).json({error:'connection_not_found'});res.json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}
});
app.post('/api/pro-network/v16/:professionalId/threads', async (req,res)=>{
 const {subject,members=[]}=req.body;if(!subject?.trim())return res.status(400).json({error:'subject_required'});
 const client=await pool.connect();try{await client.query('BEGIN');const t=await client.query(`INSERT INTO b2b_threads_v16(created_by,subject) VALUES($1,$2) RETURNING *`,[req.params.professionalId,subject]);const ids=[Number(req.params.professionalId),...members.map(Number)].filter((v,i,a)=>v&&a.indexOf(v)===i);for(const id of ids)await client.query(`INSERT INTO b2b_thread_members_v16(thread_id,professional_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[t.rows[0].id,id]);await client.query('COMMIT');res.status(201).json({...t.rows[0],members:ids})}catch(e){await client.query('ROLLBACK');res.status(500).json({error:e.message})}finally{client.release()}
});
app.get('/api/pro-network/v16/:professionalId/threads', async (req,res)=>{try{const q=await pool.query(`SELECT t.id,t.subject,t.status,t.created_at,t.updated_at FROM b2b_threads_v16 t JOIN b2b_thread_members_v16 m ON m.thread_id=t.id WHERE m.professional_id=$1 ORDER BY t.updated_at DESC`,[req.params.professionalId]);res.json({threads:q.rows})}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/pro-network/v16/threads/:threadId/messages', async (req,res)=>{try{const q=await pool.query(`SELECT * FROM b2b_messages_v16 WHERE thread_id=$1 ORDER BY created_at`,[req.params.threadId]);res.json({messages:q.rows})}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/pro-network/v16/threads/:threadId/messages', async (req,res)=>{const {senderId,body}=req.body;if(!senderId||!body?.trim())return res.status(400).json({error:'senderId_and_body_required'});try{const q=await pool.query(`INSERT INTO b2b_messages_v16(thread_id,sender_id,body) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM b2b_thread_members_v16 WHERE thread_id=$1 AND professional_id=$2) RETURNING *`,[req.params.threadId,senderId,body]);if(!q.rows[0])return res.status(403).json({error:'not_thread_member'});await pool.query(`UPDATE b2b_threads_v16 SET updated_at=now() WHERE id=$1`,[req.params.threadId]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/pro-network/v16/:professionalId/rfqs', async (req,res)=>{const {title,description,countryIso3=null,city=null,neededFrom=null,neededTo=null,recipients=[]}=req.body;if(!title?.trim()||!description?.trim())return res.status(400).json({error:'title_description_required'});const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query(`INSERT INTO b2b_rfqs_v16(created_by,title,description,country_iso3,city,needed_from,needed_to) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.professionalId,title,description,countryIso3,city,neededFrom,neededTo]);for(const id of recipients.map(Number).filter(Boolean))await client.query(`INSERT INTO b2b_rfq_recipients_v16(rfq_id,professional_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[q.rows[0].id,id]);await client.query('COMMIT');res.status(201).json(q.rows[0])}catch(e){await client.query('ROLLBACK');res.status(500).json({error:e.message})}finally{client.release()}});
app.get('/api/pro-network/v16/:professionalId/rfqs', async (req,res)=>{try{const q=await pool.query(`SELECT r.*,CASE WHEN r.created_by=$1 THEN 'created' ELSE rr.status END AS participation FROM b2b_rfqs_v16 r LEFT JOIN b2b_rfq_recipients_v16 rr ON rr.rfq_id=r.id AND rr.professional_id=$1 WHERE r.created_by=$1 OR rr.professional_id=$1 ORDER BY r.updated_at DESC`,[req.params.professionalId]);res.json({rfqs:q.rows})}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/pro-network/v16/rfqs/:rfqId/responses', async (req,res)=>{const {professionalId,message,amount=null,currencyCode=null,availabilityStart=null,availabilityEnd=null}=req.body;if(!professionalId||!message?.trim())return res.status(400).json({error:'professionalId_message_required'});try{const q=await pool.query(`INSERT INTO b2b_rfq_responses_v16(rfq_id,professional_id,message,amount,currency_code,availability_start,availability_end) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS(SELECT 1 FROM b2b_rfq_recipients_v16 WHERE rfq_id=$1 AND professional_id=$2) RETURNING *`,[req.params.rfqId,professionalId,message,amount,currencyCode,availabilityStart,availabilityEnd]);if(!q.rows[0])return res.status(403).json({error:'not_invited'});await pool.query(`UPDATE b2b_rfq_recipients_v16 SET status='responded' WHERE rfq_id=$1 AND professional_id=$2`,[req.params.rfqId,professionalId]);res.status(201).json(q.rows[0])}catch(e){res.status(500).json({error:e.message})}});
app.get('/api/pro-network/v16/rfqs/:rfqId/responses', async (req,res)=>{try{const q=await pool.query(`SELECT r.*,p.name AS professional_name FROM b2b_rfq_responses_v16 r JOIN professionals p ON p.id=r.professional_id WHERE r.rfq_id=$1 ORDER BY r.created_at DESC`,[req.params.rfqId]);res.json({responses:q.rows})}catch(e){res.status(500).json({error:e.message})}});

app.listen(process.env.PORT||4300,()=>console.log('La Toile V16 API listening'));

// V14 — Traveler Vault / personal travel space
app.get('/api/travelers/v14/:travelerId/vault', async (req,res)=>{
 try {
  const id=Number(req.params.travelerId);
  const items=await pool.query(`SELECT id,item_type,title,summary,country_iso3,metadata,is_private,created_at,updated_at FROM traveler_vault_items_v14 WHERE traveler_id=$1 ORDER BY updated_at DESC`,[id]);
  const health=await pool.query(`SELECT traveler_id,allergies,blood_type,important_treatments,emergency_contacts,reference_doctor,reference_facility,notes,share_in_emergency,updated_at FROM traveler_health_v14 WHERE traveler_id=$1`,[id]);
  res.json({travelerId:id,items:items.rows,health:health.rows[0]||null,privacy:'private'});
 } catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/travelers/v14/:travelerId/vault/items', async (req,res)=>{
 const {itemType,title,summary='',countryIso3=null,metadata={},isPrivate=true}=req.body;
 if(!['trip','request','response','reservation','document','memory'].includes(itemType)||!title?.trim()) return res.status(400).json({error:'itemType_and_title_required'});
 try {
  const q=await pool.query(`INSERT INTO traveler_vault_items_v14(traveler_id,item_type,title,summary,country_iso3,metadata,is_private) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.travelerId,itemType,title,summary,countryIso3,metadata,isPrivate]);
  res.status(201).json(q.rows[0]);
 } catch(e){res.status(500).json({error:e.message})}
});

app.put('/api/travelers/v14/:travelerId/health', async (req,res)=>{
 const {allergies='',bloodType='',importantTreatments='',emergencyContacts=[],referenceDoctor='',referenceFacility='',notes='',shareInEmergency=false}=req.body;
 try {
  const q=await pool.query(`INSERT INTO traveler_health_v14(traveler_id,allergies,blood_type,important_treatments,emergency_contacts,reference_doctor,reference_facility,notes,share_in_emergency) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(traveler_id) DO UPDATE SET allergies=EXCLUDED.allergies,blood_type=EXCLUDED.blood_type,important_treatments=EXCLUDED.important_treatments,emergency_contacts=EXCLUDED.emergency_contacts,reference_doctor=EXCLUDED.reference_doctor,reference_facility=EXCLUDED.reference_facility,notes=EXCLUDED.notes,share_in_emergency=EXCLUDED.share_in_emergency,updated_at=now() RETURNING traveler_id,allergies,blood_type,important_treatments,emergency_contacts,reference_doctor,reference_facility,notes,share_in_emergency,updated_at`,[req.params.travelerId,allergies,bloodType,importantTreatments,JSON.stringify(emergencyContacts),referenceDoctor,referenceFacility,notes,shareInEmergency]);
  res.json(q.rows[0]);
 } catch(e){res.status(500).json({error:e.message})}
});

app.patch('/api/travelers/v14/:travelerId/health/privacy', async (req,res)=>{
 if(typeof req.body.shareInEmergency!=='boolean') return res.status(400).json({error:'shareInEmergency_boolean_required'});
 try { const q=await pool.query(`UPDATE traveler_health_v14 SET share_in_emergency=$1,updated_at=now() WHERE traveler_id=$2 RETURNING traveler_id,share_in_emergency,updated_at`,[req.body.shareInEmergency,req.params.travelerId]); res.json(q.rows[0]||{travelerId:Number(req.params.travelerId),shareInEmergency:req.body.shareInEmergency}); }
 catch(e){res.status(500).json({error:e.message})}
});


// V28.5 — recommendation bridge with travel history; health excluded
app.post('/api/ai/v21-history/recommend',async(req,res)=>{
 try{
  const id=Number(req.body?.travelerId);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'travelerId_required'});
  const items=await pool.query("SELECT item_type,title,summary,country_iso3,metadata,created_at,updated_at FROM traveler_vault_items_v14 WHERE traveler_id=$1 AND item_type IN ('trip','memory','request','response','reservation') ORDER BY updated_at DESC",[id]);
  const trips=await pool.query("SELECT id AS trip_id,title,country_iso3,status,start_date,end_date,metadata FROM traveler_trips_v15 WHERE traveler_id=$1 ORDER BY start_date NULLS LAST,updated_at DESC",[id]);
  const {buildRecommendationContext}=await import('./recommendation-bridge-v28-5.js');
  const context=buildRecommendationContext({intent:req.body.intent||{},historyItems:items.rows,trips:trips.rows,seasonal:req.body.seasonal||null});
  const recommendations=context.travelHistory.signals.length>0
   ? [{id:'continuity',title:'Retrouver une expérience déjà rencontrée',type:'continuity',explanation:'Une possibilité de continuité issue de votre historique.',evidence:{history:true}},{id:'discovery',title:'Découvrir autre chose',type:'discovery',explanation:'Une possibilité différente de vos expériences précédentes.',evidence:{history:true}}]
   : [{id:'discovery',title:'Explorer de nouvelles possibilités',type:'discovery',explanation:'Explorer sans imposer une préférence issue de l’historique.',evidence:{history:false}}];
  const sessionResult=await pool.query("INSERT INTO ai_recommendation_sessions_v21 (actor_type,actor_id,context) VALUES ('traveler',$1,$2::jsonb) RETURNING id",[id,JSON.stringify(context)]);
  const sessionId=sessionResult.rows[0].id;
  for(const r of recommendations){await pool.query("INSERT INTO ai_recommendations_v21 (session_id,recommendation_type,title,explanation,evidence,confidence,alternatives) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)",[sessionId,r.type,r.title,r.explanation,JSON.stringify(r.evidence),r.confidence??null,JSON.stringify(r.alternatives||[])])}
  res.json({version:'28.7',travelerId:id,sessionId,context,recommendations,principle:'assist_not_decide'});
 }catch(e){res.status(500).json({error:e.message})}
});

// V28.8 — recommendation → professional opportunity bridge
// V28.8 — opportunity → qualified professional request → dispatch
app.post('/api/ai/v21/recommendations/:recommendationId/opportunity/dispatch',async(req,res)=>{
 const client=await pool.connect();
 try{
  const recommendationId=Number(req.params.recommendationId),travelerId=Number(req.body?.travelerId);
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  const rec=await client.query("SELECT r.id,r.title,r.explanation,r.evidence,s.actor_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id WHERE r.id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  const existing=await client.query("SELECT * FROM ai_recommendation_opportunities_v28_8 WHERE recommendation_id=$1",[recommendationId]);
  if(!existing.rows[0])return res.status(409).json({error:'opportunity_required_first'});
  const opportunity=existing.rows[0];
  const intent={...(req.body?.intent||{}),recommendationTitle:rec.rows[0].title,recommendationExplanation:rec.rows[0].explanation,serviceNeeds:opportunity.service_needs,location:opportunity.location,scope:opportunity.scope};
  const countryId=req.body?.countryId==null?null:Number(req.body.countryId);
  const rawText=String(req.body?.rawText||rec.rows[0].title).trim();
  const request=await client.query("INSERT INTO traveler_requests_v12(country_id,traveler_id,raw_text,intent,status) VALUES($1,$2,$3,$4,'qualified') RETURNING id",[countryId,travelerId,rawText,intent]);
  const requestId=request.rows[0].id;
  const radiusKm=Number(req.body?.radiusKm||100);
  const dispatched=await client.query("SELECT dispatch_request_v12($1,$2) AS dispatched",[requestId,radiusKm]);
  await client.query("UPDATE ai_recommendation_opportunities_v28_8 SET request_id=$1,status='dispatched',updated_at=now() WHERE id=$2",[requestId,opportunity.id]);
  await client.query("UPDATE ai_recommendations_v21 SET status='handed_off' WHERE id=$1",[recommendationId]);
  res.status(201).json({version:'28.8',recommendationId,travelerId,requestId,dispatched:Number(dispatched.rows[0].dispatched),status:'dispatched',principle:'qualified_demand_first',travelerDecides:true});
 }catch(e){res.status(500).json({error:e.message})}finally{client.release()}
});


app.post('/api/ai/v21/recommendations/:recommendationId/opportunity',async(req,res)=>{
 try{
  const recommendationId=Number(req.params.recommendationId);
  const travelerId=Number(req.body?.travelerId);
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  const rec=await pool.query("SELECT r.id,s.actor_id,r.title,r.explanation FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id WHERE r.id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  const serviceNeeds=Array.isArray(req.body?.serviceNeeds)?req.body.serviceNeeds:[];
  const location=req.body?.location&&typeof req.body.location==='object'?req.body.location:{};
  const scope=String(req.body?.scope||'local').trim().toLowerCase();
  if(!['local','regional','national','international','global'].includes(scope))return res.status(400).json({error:'scope_invalid'});
  const q=await pool.query("INSERT INTO ai_recommendation_opportunities_v28_8 (recommendation_id,traveler_id,service_needs,location,scope) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5) ON CONFLICT(recommendation_id) DO UPDATE SET service_needs=EXCLUDED.service_needs,location=EXCLUDED.location,scope=EXCLUDED.scope,updated_at=now() RETURNING *",[recommendationId,travelerId,JSON.stringify(serviceNeeds),JSON.stringify(location),scope]);
  res.status(201).json({version:'28.8',opportunity:q.rows[0],professionalPrinciple:'qualified_demand_first',travelerDecides:true});
 }catch(e){res.status(500).json({error:e.message})}
});

// V28.9 — professional responses and traveler comparison
app.get('/api/ai/v21/recommendations/:recommendationId/professional-responses',async(req,res)=>{
 try{
  const recommendationId=Number(req.params.recommendationId),travelerId=Number(req.query.travelerId);
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  const rec=await pool.query("SELECT r.id,s.actor_id,o.request_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id LEFT JOIN ai_recommendation_opportunities_v28_8 o ON o.recommendation_id=r.id WHERE r.id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  if(!rec.rows[0].request_id)return res.json({version:'28.9',recommendationId,responses:[],comparison:null,principle:'traveler_decides'});
  const q=await pool.query("SELECT r.id AS response_id,r.professional_id,p.name AS professional_name,d.match_score,d.distance_km,r.availability_status,r.proposed_start,r.proposed_end,r.message,r.conditions,r.created_at FROM professional_responses_v12 r JOIN request_dispatches_v12 d ON d.id=r.dispatch_id JOIN professionals p ON p.id=r.professional_id WHERE d.request_id=$1 ORDER BY d.match_score DESC,r.created_at DESC",[rec.rows[0].request_id]);
  const responses=q.rows.map(x=>({responseId:x.response_id,professionalId:x.professional_id,professionalName:x.professional_name,matchScore:x.match_score,distanceKm:x.distance_km,availabilityStatus:x.availability_status,proposedStart:x.proposed_start,proposedEnd:x.proposed_end,message:x.message,conditions:x.conditions,createdAt:x.created_at}));
  res.json({version:'28.9',recommendationId,requestId:Number(rec.rows[0].request_id),responses,comparison:{sortedBy:'matchScore',priceDisplayed:false},principle:'traveler_decides'});
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/ai/v21/recommendations/:recommendationId/compare',async(req,res)=>{
 try{
  const recommendationId=Number(req.params.recommendationId),travelerId=Number(req.body?.travelerId);
  const responseIds=Array.isArray(req.body?.responseIds)?req.body.responseIds.map(Number).filter(Number.isInteger):[];
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  if(!responseIds.length)return res.status(400).json({error:'responseIds_required'});
  const rec=await pool.query("SELECT r.id,s.actor_id,o.request_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id LEFT JOIN ai_recommendation_opportunities_v28_8 o ON o.recommendation_id=r.id WHERE r.id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  if(!rec.rows[0].request_id)return res.status(409).json({error:'request_not_dispatched'});
  const q=await pool.query("SELECT r.id FROM professional_responses_v12 r JOIN request_dispatches_v12 d ON d.id=r.dispatch_id WHERE d.request_id=$1 AND r.id=ANY($2::bigint[])",[rec.rows[0].request_id,responseIds]);
  if(q.rowCount!==responseIds.length)return res.status(400).json({error:'response_not_in_request'});
  const selectedResponseId=req.body.selectedResponseId==null?null:Number(req.body.selectedResponseId);
  if(selectedResponseId!==null&&!responseIds.includes(selectedResponseId))return res.status(400).json({error:'selected_response_not_in_comparison'});
  const comparison=await pool.query("INSERT INTO response_comparisons_v12(request_id,traveler_id,selected_response_id,compared_response_ids) VALUES($1,$2,$3,$4) RETURNING id,request_id,traveler_id,selected_response_id,compared_response_ids,created_at",[rec.rows[0].request_id,travelerId,selectedResponseId,responseIds]);
  res.status(201).json({version:'28.9',recommendationId,comparison:comparison.rows[0],travelerDecides:true,priceDisplayed:false,principle:'traveler_decides'});
 }catch(e){res.status(500).json({error:e.message})}
});

// V28.7 — read and decide on persisted recommendations
app.get('/api/ai/v21/sessions/:sessionId/recommendations',async(req,res)=>{
 try{
  const sessionId=Number(req.params.sessionId);
  if(!Number.isInteger(sessionId)||sessionId<=0)return res.status(400).json({error:'sessionId_required'});
  const q=await pool.query("SELECT id,recommendation_type,title,explanation,evidence,confidence,alternatives,action_url,status,created_at FROM ai_recommendations_v21 WHERE session_id=$1 ORDER BY created_at ASC",[sessionId]);
  res.json({version:'28.7',sessionId,recommendations:q.rows,principle:'assist_not_decide'});
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/ai/v21/recommendations/:recommendationId/decision',async(req,res)=>{
 try{
  const recommendationId=Number(req.params.recommendationId);
  const travelerId=req.body?.travelerId==null?null:Number(req.body.travelerId);
  const decision=String(req.body?.decision||'').trim().toLowerCase();
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!['accepted','rejected','saved','ignored'].includes(decision))return res.status(400).json({error:'decision_invalid'});
  const q=await pool.query("SELECT r.id,s.actor_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id WHERE r.id=$1",[recommendationId]);
  if(!q.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(travelerId!=null && Number(q.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  const u=await pool.query("UPDATE ai_recommendations_v21 SET status=$1 WHERE id=$2 RETURNING id,status",[decision,recommendationId]);
  res.json({version:'28.7',recommendationId,status:u.rows[0].status,principle:'traveler_decides'});
 }catch(e){res.status(500).json({error:e.message})}
});

// V28.7 — recommendation feedback persistence
app.post('/api/ai/v21/recommendations/:recommendationId/feedback',async(req,res)=>{
 try{
  const recommendationId=Number(req.params.recommendationId);
  const actorId=req.body?.travelerId==null?null:Number(req.body.travelerId);
  const feedback=String(req.body?.feedback||'').trim();
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!feedback)return res.status(400).json({error:'feedback_required'});
  const rec=await pool.query("SELECT id,session_id FROM ai_recommendations_v21 WHERE id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  const q=await pool.query("INSERT INTO ai_feedback_v21 (recommendation_id,actor_type,actor_id,feedback,reason) VALUES ($1,'traveler',$2,$3,$4) RETURNING id,created_at",[recommendationId,actorId,feedback,req.body?.reason?String(req.body.reason).trim():null]);
  res.status(201).json({version:'28.7',recommendationId,feedbackId:q.rows[0].id,status:'recorded',principle:'assist_not_decide'});
 }catch(e){res.status(500).json({error:e.message})}
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

 
// V29 — anonymous-by-default professional view + explicit identity reveal
app.get('/api/professionals/v29/requests/:publicRequestId',async(req,res)=>{
 try{
  const publicId=String(req.params.publicRequestId||'').trim();
  if(!/^LTREQ-[0-9]+$/.test(publicId))return res.status(400).json({error:'public_request_id_invalid'});
  const requestId=Number(publicId.slice(6));
  const q=await pool.query("SELECT r.id,r.country_id,r.intent,r.status,o.service_needs,o.location,o.scope FROM traveler_requests_v12 r JOIN ai_recommendation_opportunities_v28_8 o ON o.request_id=r.id WHERE r.id=$1",[requestId]);
  if(!q.rows[0])return res.status(404).json({error:'public_request_not_found'});
  const x=q.rows[0],location=x.location&&typeof x.location==='object'?x.location:{},safeLocation={};
  for(const k of ['countryIso3','region','city','zone'])if(location[k]!=null)safeLocation[k]=location[k];
  res.json({version:'29',publicRequestId:publicId,requestId:x.id,status:x.status,serviceNeeds:x.service_needs,location:safeLocation,scope:x.scope,intent:{activity:x.intent?.activity||null,travelerProfile:x.intent?.travelerProfile||null,dates:x.intent?.dates||null,pace:x.intent?.pace||null,safety:Boolean(x.intent?.safety)},privacy:{anonymous:true,identityRevealed:false,healthExcluded:true,contactDetailsExcluded:true},principle:'anonymous_by_default'});
 }catch(e){res.status(500).json({error:e.message})}
});

app.post('/api/ai/v21/recommendations/:recommendationId/reveal',async(req,res)=>{
 const client=await pool.connect();
 try{
  const recommendationId=Number(req.params.recommendationId),travelerId=Number(req.body?.travelerId),professionalId=req.body?.professionalId==null?null:Number(req.body.professionalId);
  if(!Number.isInteger(recommendationId)||recommendationId<=0)return res.status(400).json({error:'recommendationId_required'});
  if(!Number.isInteger(travelerId)||travelerId<=0)return res.status(400).json({error:'travelerId_required'});
  if(req.body?.confirm!==true)return res.status(400).json({error:'explicit_confirmation_required'});
  const rec=await client.query("SELECT r.id,s.actor_id,o.request_id FROM ai_recommendations_v21 r JOIN ai_recommendation_sessions_v21 s ON s.id=r.session_id JOIN ai_recommendation_opportunities_v28_8 o ON o.recommendation_id=r.id WHERE r.id=$1",[recommendationId]);
  if(!rec.rows[0])return res.status(404).json({error:'recommendation_not_found'});
  if(Number(rec.rows[0].actor_id)!==travelerId)return res.status(403).json({error:'traveler_not_owner'});
  const requestId=Number(rec.rows[0].request_id);
  const shareFields=Array.isArray(req.body?.sharedFields)?req.body.sharedFields.filter(x=>['name','email','phone'].includes(String(x))):[];
  const q=await client.query("INSERT INTO traveler_professional_handoffs_v29(recommendation_id,request_id,traveler_id,professional_id,identity_revealed,shared_fields) VALUES($1,$2,$3,$4,true,$5::jsonb) RETURNING id,status,shared_fields,created_at",[recommendationId,requestId,travelerId,professionalId,JSON.stringify(shareFields)]);
  await client.query("INSERT INTO privacy_audit_events_v23(actor_type,actor_id,action,data_domain,object_type,object_id,result,metadata) VALUES ('traveler',$1,'identity_reveal','traveler_identity','recommendation',$2,'allowed',$3::jsonb)",[travelerId,recommendationId,JSON.stringify({professionalId,requestId,sharedFields:shareFields})]);
  res.status(201).json({version:'29',handoff:q.rows[0],identityRevealed:true,sharedFields:shareFields,healthExcluded:true,principle:'explicit_consent_only'});
 }catch(e){res.status(500).json({error:e.message})}finally{client.release()}
});

import { registerV29CommunicationRoutes } from './v29-communication.js';
registerV29CommunicationRoutes({app,pool});

export {app};
if(process.env.V28_HISTORY_TEST_SERVER==='1'){const port=Number(process.env.PORT||4300);app.listen(port,()=>console.log(`history test server listening on ${port}`));}
