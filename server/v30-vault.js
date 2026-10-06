import express from 'express';
import pg from 'pg';

const { Pool } = pg;
export const v30VaultRouter = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://latoile:latoile_dev@localhost:5432/la_toile' });

function json(value, fallback = {}) {
  if (value === undefined || value === null) return fallback;
  return value;
}

v30VaultRouter.get('/trip-draft/session/:sessionId', async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT * FROM v30_trip_drafts WHERE session_id=$1 ORDER BY updated_at DESC LIMIT 1`,
      [req.params.sessionId]
    );
    res.json({ draft: q.rows[0] || null, proposalOnly: true, travelerDecides: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.post('/trip-draft', async (req, res) => {
  const {
    travelerId = null, sessionId, title, territoryKey,
    transport = {}, accommodation = {}, experiences = [],
    healthSafety = [], notes = {}
  } = req.body || {};
  if (!sessionId || !title?.trim() || !territoryKey) {
    return res.status(400).json({ error: 'sessionId_title_territoryKey_required' });
  }
  try {
    const q = await pool.query(
      `INSERT INTO v30_trip_drafts
       (traveler_id,session_id,title,territory_key,status,transport,accommodation,experiences,health_safety,notes)
       VALUES($1,$2,$3,$4,'preparation',$5,$6,$7,$8,$9)
       ON CONFLICT (session_id) DO UPDATE SET
         traveler_id=EXCLUDED.traveler_id,title=EXCLUDED.title,territory_key=EXCLUDED.territory_key,
         status='preparation',transport=EXCLUDED.transport,accommodation=EXCLUDED.accommodation,
         experiences=EXCLUDED.experiences,health_safety=EXCLUDED.health_safety,notes=EXCLUDED.notes,updated_at=now()
       RETURNING *`,
      [travelerId, sessionId, title.trim(), territoryKey, json(transport), json(accommodation), json(experiences, []), json(healthSafety, []), json(notes)]
    );
    res.status(201).json({ draft: q.rows[0], proposalOnly: true, travelerDecides: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.patch('/trip-draft/:id', async (req, res) => {
  const allowed = ['title','status','transport','accommodation','experiences','healthSafety','notes','territoryKey'];
  const body = req.body || {};
  const sets = [];
  const values = [];
  const map = {
    title: 'title', status: 'status', transport: 'transport',
    accommodation: 'accommodation', experiences: 'experiences',
    healthSafety: 'health_safety', notes: 'notes', territoryKey: 'territory_key'
  };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${map[key]}=$${values.length + 1}`);
      values.push(body[key]);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'no_updates' });
  values.push(req.params.id);
  try {
    const q = await pool.query(
      `UPDATE v30_trip_drafts SET ${sets.join(',')},updated_at=now() WHERE id=$${values.length} RETURNING *`,
      values
    );
    if (!q.rows[0]) return res.status(404).json({ error: 'trip_draft_not_found' });
    res.json({ draft: q.rows[0], proposalOnly: true, travelerDecides: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.post('/trip-draft/:id/compose', async (req, res) => {
  const { solutionIds = [], transport = null, accommodation = null, healthSafety = null, notes = null } = req.body || {};
  if (!Array.isArray(solutionIds) || solutionIds.length > 3) return res.status(400).json({ error: 'solutionIds_max_3_required' });
  try {
    const current = await pool.query('SELECT * FROM v30_trip_drafts WHERE id=$1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'trip_draft_not_found' });
    const selected = solutionIds.length
      ? await pool.query('SELECT id,title,description,solution_type,provider_name,territory_key,public_contact FROM v30_solutions WHERE id=ANY($1::bigint[]) AND active=true', [solutionIds])
      : { rows: [] };
    const q = await pool.query(
      `UPDATE v30_trip_drafts SET
       experiences=CASE WHEN $1::jsonb='[]'::jsonb THEN experiences ELSE $1::jsonb END,
       transport=COALESCE($2,transport),
       accommodation=COALESCE($3,accommodation),
       health_safety=COALESCE($4,health_safety),
       notes=COALESCE($5,notes),
       status='ready',updated_at=now()
       WHERE id=$6 RETURNING *`,
      [JSON.stringify(selected.rows), transport, accommodation, healthSafety, notes, req.params.id]
    );
    res.json({ draft:q.rows[0], selectedSolutions:selected.rows, proposalOnly:true, travelerDecides:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

v30VaultRouter.put('/trip-draft/:id/dates', async (req,res) => {
  const { startDate=null, endDate=null, flexibleDays=0, durationDays=null } = req.body || {};
  try {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) return res.status(400).json({error:'endDate_before_startDate'});
    const q=await pool.query(
      'UPDATE v30_trip_drafts SET notes=jsonb_set(COALESCE(notes,\'{}\'::jsonb),\'{dates}\',$1::jsonb,true),updated_at=now() WHERE id=$2 RETURNING *',
      [JSON.stringify({startDate,endDate,flexibleDays:Math.max(0,Number(flexibleDays)||0),durationDays:durationDays?Number(durationDays):null}),req.params.id]
    );
    if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    res.json({draft:q.rows[0],dates:q.rows[0].notes?.dates||null});
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.get('/trip-draft/:id/date-windows', async (req,res) => {
  try {
    const q=await pool.query('SELECT * FROM v30_trip_drafts WHERE id=$1',[req.params.id]);
    if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    const dates=q.rows[0].notes?.dates||{};
    const start=dates.startDate?new Date(dates.startDate):null;
    const flexibility=Math.min(30,Math.max(0,Number(dates.flexibleDays)||0));
    const windows=[];
    if(start && !Number.isNaN(start.getTime())){
      for(let d=-flexibility;d<=flexibility;d++){
        const x=new Date(start); x.setUTCDate(x.getUTCDate()+d);
        windows.push({startDate:x.toISOString().slice(0,10),offsetDays:d});
      }
    }
    res.json({draftId:Number(req.params.id),dates,windows});
  }catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.post('/trip-draft/:id/optimize', async (req,res) => {
  const { budgetLevel=null, pace=null, durationDays=null, accessibilityNeeds=[], climatePriority=true, safetyPriority=true } = req.body || {};
  try {
    const d=await pool.query('SELECT * FROM v30_trip_drafts WHERE id=$1',[req.params.id]);
    if(!d.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    const draft=d.rows[0];
    const experiences=Array.isArray(draft.experiences)?draft.experiences:[];
    const health=Array.isArray(draft.health_safety)?draft.health_safety:[];
    const profile=await pool.query('SELECT traveler_type,age_group,mobility_level,party_type,party_size,budget_level,pace,accessibility_needs,preferences,constraints FROM v30_traveler_profiles WHERE session_id=$1',[draft.session_id]);
    const traveler=profile.rows[0]||{};
    const effectiveBudget=traveler.budget_level||budgetLevel||null;
    const effectiveAccessibility=Array.isArray(traveler.accessibility_needs)&&traveler.accessibility_needs.length?traveler.accessibility_needs:accessibilityNeeds;
    const constraints={budgetLevel:effectiveBudget,pace:traveler.pace||pace,durationDays:durationDays||traveler.duration_days||null,accessibilityNeeds:effectiveAccessibility,climatePriority,safetyPriority};
    const completeness={
      transport:Boolean(draft.transport && Object.keys(draft.transport).length),
      accommodation:Boolean(draft.accommodation && Object.keys(draft.accommodation).length),
      experiences:experiences.length>0,
      healthSafety:health.length>0
    };
    const hardMissing=Object.entries(completeness).filter(([,v])=>!v).map(([k])=>k);
    const compatibilityWarnings=[];
    if(effectiveAccessibility.length && !draft.transport?.accessibility && !draft.accommodation?.accessibility) compatibilityWarnings.push('Accessibilité non confirmée sur transport et hébergement');
    if(effectiveBudget && !draft.notes?.budgetConfirmed) compatibilityWarnings.push('Budget global non confirmé');
    if(traveler.traveler_type && !draft.notes?.audienceConfirmed) compatibilityWarnings.push('Adéquation du public non confirmée');
    let score=Math.round(Object.values(completeness).filter(Boolean).length/4*100);
    score-=compatibilityWarnings.length*5;
    score=Math.max(0,score);
    const dates=draft.notes?.dates||{};
    let dateOptimization=null;
    if(dates.startDate && draft.territory_key){
      const base=new Date(dates.startDate);
      const flex=Math.min(30,Math.max(0,Number(dates.flexibleDays)||0));
      const territory=await pool.query('SELECT climate_zone,hemisphere FROM v30_territories WHERE territory_key=$1',[draft.territory_key]);
      if(territory.rows[0] && !Number.isNaN(base.getTime())){
        const rule=await pool.query('SELECT preferred_months,weight FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3 LIMIT 1',
          [String(draft.notes?.tourismTag||draft.notes?.tag||'culture').toLowerCase(),String(territory.rows[0].climate_zone||'').toLowerCase(),territory.rows[0].hemisphere]);
        const preferred=rule.rows[0]?.preferred_months||[];
        const profile=await pool.query('SELECT traveler_type,age_group,mobility_level,party_type,party_size,budget_level,pace,accessibility_needs,preferences,constraints FROM v30_traveler_profiles WHERE session_id=$1',[draft.session_id]);
        const traveler=profile.rows[0]||{};
        const senior=String(traveler.traveler_type||'').toLowerCase().includes('senior') || String(traveler.age_group||'').toLowerCase().includes('senior');
        const family=String(traveler.party_type||'').toLowerCase().includes('family') || Number(traveler.party_size||0)>=3 && Array.isArray(traveler.children_ages) && traveler.children_ages.length>0;
        const mobility=Array.isArray(traveler.accessibility_needs)&&traveler.accessibility_needs.length>0;
        const candidates=[];
        for(let offset=-flex;offset<=flex;offset++){
          const date=new Date(base); date.setUTCDate(date.getUTCDate()+offset);
          const month=date.getUTCMonth()+1;
          let windowScore=preferred.length?(preferred.includes(month)?100:60):50;
          const reasons=[];
          if(senior && [6,7,8].includes(month)){windowScore-=10;reasons.push('Période potentiellement chaude pour un profil senior');}
          if(family && [6,7,8].includes(month)){windowScore+=3;reasons.push('Période compatible avec les vacances familiales');}
          if(mobility && [6,7,8].includes(month)===false){reasons.push('Accessibilité à vérifier selon les conditions locales');}
          candidates.push({date:date.toISOString().slice(0,10),offsetDays:offset,score:windowScore,favorable:preferred.includes(month),reasons});
        }
        candidates.sort((a,b)=>b.score-a.score||Math.abs(a.offsetDays)-Math.abs(b.offsetDays));
        dateOptimization={requestedDate:dates.startDate,flexibleDays:flex,recommended:candidates[0]||null,candidates,travelerContext:{senior,family,mobility,budgetLevel:traveler.budget_level||budgetLevel||null}};
        if(candidates[0]?.favorable) score=Math.min(100,score+5);
      }
    }
    const optimization={score,completeness,hardMissing,compatibilityWarnings,constraints,dateOptimization,travelerContext:{travelerType:traveler.traveler_type||null,budgetLevel:effectiveBudget,accessibilityNeeds:effectiveAccessibility},optimizedAt:new Date().toISOString()};
    const q=await pool.query('UPDATE v30_trip_drafts SET notes=jsonb_set(COALESCE(notes,\'{}\'::jsonb),\'{optimization}\',$1::jsonb,true),status=CASE WHEN $2>=75 THEN \'ready\' ELSE status END,updated_at=now() WHERE id=$3 RETURNING *',
      [JSON.stringify(optimization),score,req.params.id]);
    res.json({draft:q.rows[0],optimization,travelerDecides:true});
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.get('/trip-draft/:id/summary', async (req,res) => {
  try {
    const q=await pool.query('SELECT id,title,territory_key,status,transport,accommodation,experiences,health_safety,notes,updated_at FROM v30_trip_drafts WHERE id=$1',[req.params.id]);
    if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    res.json({draft:q.rows[0],complete:Boolean(q.rows[0].transport && q.rows[0].accommodation && q.rows[0].experiences?.length),proposalOnly:true});
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.put('/vault/health/:travelerId', async (req,res) => {
  const { allergies=[], bloodType=null, importantTreatments=[], emergencyContacts=[], referenceDoctor={}, referenceEstablishment={} } = req.body || {};
  try {
    const q=await pool.query(
      `INSERT INTO v30_health_profiles(traveler_id,allergies,blood_type,important_treatments,emergency_contacts,reference_doctor,reference_establishment)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(traveler_id) DO UPDATE SET allergies=EXCLUDED.allergies,blood_type=EXCLUDED.blood_type,important_treatments=EXCLUDED.important_treatments,emergency_contacts=EXCLUDED.emergency_contacts,reference_doctor=EXCLUDED.reference_doctor,reference_establishment=EXCLUDED.reference_establishment,updated_at=now()
       RETURNING *`,
      [req.params.travelerId,allergies,bloodType,importantTreatments,JSON.stringify(emergencyContacts),JSON.stringify(referenceDoctor),JSON.stringify(referenceEstablishment)]
    );
    res.json({health:q.rows[0],privacy:'private',professionalShareAllowed:false});
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.get('/vault/session/:sessionId', async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT id,traveler_id,session_id,item_type,title,payload,privacy_class,created_at
       FROM v30_vault_items WHERE session_id=$1 ORDER BY created_at DESC`,
      [req.params.sessionId]
    );
    res.json({ items: q.rows, privacy: 'private', institutionalAggregate: false, professionalShareAllowed: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.post('/vault', async (req, res) => {
  const { travelerId = null, sessionId = null, itemType, title, payload = {} } = req.body || {};
  const allowed = ['memory','document','reservation','health','emergency','favorite'];
  if (!allowed.includes(itemType) || !title?.trim()) {
    return res.status(400).json({ error: 'itemType_and_title_required' });
  }
  try {
    const q = await pool.query(
      `INSERT INTO v30_vault_items
       (traveler_id,session_id,item_type,title,payload,privacy_class)
       VALUES($1,$2,$3,$4,$5,'private') RETURNING *`,
      [travelerId, sessionId, itemType, title.trim(), payload]
    );
    res.status(201).json({ item: q.rows[0], privacy: 'private' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.patch('/vault/:id', async (req, res) => {
  const { title, payload } = req.body || {};
  try {
    const q = await pool.query(
      `UPDATE v30_vault_items SET
       title=COALESCE($1,title), payload=COALESCE($2,payload)
       WHERE id=$3 RETURNING *`,
      [title === undefined ? null : title, payload === undefined ? null : payload, req.params.id]
    );
    if (!q.rows[0]) return res.status(404).json({ error: 'vault_item_not_found' });
    res.json({ item: q.rows[0], privacy: 'private' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.delete('/vault/:id', async (req, res) => {
  try {
    const q = await pool.query('DELETE FROM v30_vault_items WHERE id=$1 RETURNING id', [req.params.id]);
    if (!q.rows[0]) return res.status(404).json({ error: 'vault_item_not_found' });
    res.json({ deleted: true, id: Number(req.params.id), privacy: 'private' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30VaultRouter.get('/vault/health/:travelerId', async (req, res) => {
  try {
    const q = await pool.query('SELECT * FROM v30_health_profiles WHERE traveler_id=$1', [req.params.travelerId]);
    res.json({ health: q.rows[0] || null, privacy: 'private', professionalShareAllowed: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
