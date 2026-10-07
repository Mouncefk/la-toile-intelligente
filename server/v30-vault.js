import express from 'express';
import pg from 'pg';

const { Pool } = pg;
export const v30VaultRouter = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://latoile:latoile_dev@localhost:5432/la_toile' });

function json(value, fallback = {}) {
  if (value === undefined || value === null) return fallback;
  return value;
}

v30VaultRouter.get('/trip-draft/:id/components', async (req,res) => { try { const q=await pool.query('SELECT id,transport,accommodation,experiences,health_safety,notes FROM v30_trip_drafts WHERE id=$1',[req.params.id]); if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'}); const d=q.rows[0]; res.json({draftId:Number(d.id),components:{transport:d.transport||{},accommodation:d.accommodation||{},experiences:Array.isArray(d.experiences)?d.experiences:[],healthSafety:Array.isArray(d.health_safety)?d.health_safety:[]},dates:d.notes?.dates||null,travelerDecides:true,proposalOnly:true}); } catch(e){res.status(500).json({error:e.message});} });


v30VaultRouter.get('/trip-draft/:id/profile-fit', async (req,res) => {
  try {
    const q = await pool.query(
      `SELECT d.*, p.traveler_type,p.age_group,p.mobility_level,p.party_type,p.party_size,p.children_ages,
              p.budget_level,p.pace,p.duration_days,p.accessibility_needs,p.preferences,p.constraints,
              t.hemisphere,t.climate_zone,t.name_fr AS territory_name
       FROM v30_trip_drafts d
       LEFT JOIN v30_traveler_profiles p ON p.session_id=d.session_id
       LEFT JOIN v30_territories t ON t.territory_key=d.territory_key
       WHERE d.id=$1`,
      [req.params.id]
    );
    if (!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    const d=q.rows[0];
    const profile = {
      traveler_type:d.traveler_type||null, age_group:d.age_group||null, mobility_level:d.mobility_level||null,
      party_type:d.party_type||null, party_size:d.party_size==null?null:Number(d.party_size),
      children_ages:Array.isArray(d.children_ages)?d.children_ages:[], budget_level:d.budget_level||null,
      pace:d.pace||null, duration_days:d.duration_days==null?null:Number(d.duration_days),
      accessibility_needs:Array.isArray(d.accessibility_needs)?d.accessibility_needs:[],
      preferences:Array.isArray(d.preferences)?d.preferences:[],
      constraints:Array.isArray(d.constraints)?d.constraints:[]
    };
    const textValue=v=>String(v||'').toLowerCase();
    const isSenior=textValue(profile.traveler_type).includes('senior') || textValue(profile.age_group).includes('senior');
    const isFamily=textValue(profile.party_type).includes('family') || profile.children_ages.length>0;
    const hasAccessibility=profile.accessibility_needs.length>0 || textValue(profile.mobility_level).includes('réduit') || textValue(profile.mobility_level).includes('reduced');
    const dates=(d.notes&&d.notes.dates)||{};
    const startDate=dates.startDate?new Date(dates.startDate):null;
    const hemisphere=d.hemisphere||'north';
    const hotMonths=hemisphere==='south'?[12,1,2]:hemisphere==='equatorial'?[1,2,3,4,5,6,7,8,9,10,11,12]:[6,7,8];
    const dateMonths=[];
    const duration=Math.max(1,Number(dates.durationDays||profile.duration_days||7));
    if(startDate&&!Number.isNaN(startDate.getTime())) for(let i=0;i<duration;i++){const x=new Date(startDate);x.setUTCDate(x.getUTCDate()+i);dateMonths.push(x.getUTCMonth()+1);}
    const hotRatio=dateMonths.length?dateMonths.filter(m=>hotMonths.includes(m)).length/dateMonths.length:0;
    const signals=[];
    if(isSenior) signals.push({key:'senior',label:'Profil senior pris en compte',detail:'Le rythme et la période climatique sont intégrés à la préparation.',status:'considered',impact:hotRatio>=0.5?'attention':'positive'});
    if(isFamily) signals.push({key:'family',label:'Contexte familial pris en compte',detail:'La composition du groupe et les contraintes familiales accompagnent les recommandations.',status:'considered',impact:'positive'});
    if(profile.pace) signals.push({key:'pace',label:'Rythme de voyage pris en compte',detail:'Rythme souhaité : '+profile.pace+'.',status:'considered',impact:'positive'});
    if(profile.budget_level) signals.push({key:'budget',label:'Budget pris en compte',detail:'Niveau budgétaire : '+profile.budget_level+'. Les coûts définitifs restent à confirmer.',status:'considered',impact:'positive'});
    if(profile.mobility_level) signals.push({key:'mobility',label:'Mobilité prise en compte',detail:'Niveau de mobilité : '+profile.mobility_level+'.',status:'considered',impact:'positive'});
    if(hasAccessibility) signals.push({key:'accessibility',label:'Accessibilité à confirmer',detail:'Les besoins d’accessibilité influencent le matching, mais les services sélectionnés doivent être explicitement confirmés.',status:'confirmation_required',impact:'attention'});
    if(profile.preferences.length) signals.push({key:'preferences',label:'Préférences intégrées',detail:profile.preferences.slice(0,6).join(' · '),status:'considered',impact:'positive'});
    if(profile.constraints.length) signals.push({key:'constraints',label:'Contraintes intégrées',detail:profile.constraints.slice(0,6).join(' · '),status:'considered',impact:'attention'});
    if(isSenior&&hotRatio>=0.5) signals.push({key:'warm_period',label:'Période chaude à surveiller',detail:'Les dates actuelles couvrent majoritairement une période chaude pour cet hémisphère.',status:'attention',impact:'attention'});
    const missingProfile=[];
    for(const key of ['traveler_type','party_type','budget_level','pace']) if(!profile[key]) missingProfile.push(key);
    let fitScore=100;
    fitScore-=missingProfile.length*8;
    if(hasAccessibility) fitScore-=5;
    if(isSenior&&hotRatio>=0.5) fitScore-=8;
    fitScore=Math.max(0,Math.min(100,fitScore));
    res.json({
      draftId:Number(d.id), territory:{key:d.territory_key,name:d.territory_name||null,hemisphere,climateZone:d.climate_zone||null},
      profile, fitScore, signals, missingProfile,
      confirmationNeeded:signals.filter(x=>x.status==='confirmation_required').map(x=>x.key),
      dates:{startDate:dates.startDate||null,endDate:dates.endDate||null,durationDays:duration},
      travelerDecides:true, proposalOnly:true
    });
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.get('/trip-draft/:id/profile', async (req,res) => {
  try {
    const q=await pool.query('SELECT d.id,d.session_id,d.territory_key,p.* FROM v30_trip_drafts d LEFT JOIN v30_traveler_profiles p ON p.session_id=d.session_id WHERE d.id=$1',[req.params.id]);
    if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    res.json({draftId:Number(q.rows[0].id),profile:q.rows[0],travelerDecides:true,private:true});
  } catch(e){res.status(500).json({error:e.message});}
});
v30VaultRouter.put('/trip-draft/:id/profile', async (req,res) => {
  try {
    const d=await pool.query('SELECT session_id FROM v30_trip_drafts WHERE id=$1',[req.params.id]);
    if(!d.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    const allowed=['traveler_type','age_group','mobility_level','party_type','party_size','children_ages','budget_level','pace','duration_days','accessibility_needs','preferences','constraints'];
    const arrays=new Set(['children_ages','accessibility_needs','preferences','constraints']);
    const vals=allowed.map(k=>arrays.has(k)?(Array.isArray(req.body?.[k])?req.body[k]:[]):(req.body?.[k]??null));
    const q=await pool.query(
      `INSERT INTO v30_traveler_profiles(session_id,traveler_type,age_group,mobility_level,party_type,party_size,children_ages,budget_level,pace,duration_days,accessibility_needs,preferences,constraints)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT(session_id) DO UPDATE SET traveler_type=EXCLUDED.traveler_type,age_group=EXCLUDED.age_group,mobility_level=EXCLUDED.mobility_level,party_type=EXCLUDED.party_type,party_size=EXCLUDED.party_size,children_ages=EXCLUDED.children_ages,budget_level=EXCLUDED.budget_level,pace=EXCLUDED.pace,duration_days=EXCLUDED.duration_days,accessibility_needs=EXCLUDED.accessibility_needs,preferences=EXCLUDED.preferences,constraints=EXCLUDED.constraints,updated_at=now()
       RETURNING *`,
      [d.rows[0].session_id,...vals]
    );
    res.json({draftId:Number(req.params.id),profile:q.rows[0],private:true,travelerDecides:true});
  } catch(e){res.status(500).json({error:e.message});}
});

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
        const candidates=[];        const duration=Math.max(1,Number(dates.durationDays)||Number(traveler.duration_days)||7);
        for(let offset=-flex;offset<=flex;offset++){
          const date=new Date(base); date.setUTCDate(date.getUTCDate()+offset);
          const month=date.getUTCMonth()+1;
          const windowMonths=[]; for(let day=0;day<duration;day++){const x=new Date(date);x.setUTCDate(x.getUTCDate()+day);windowMonths.push(x.getUTCMonth()+1)}
          const favorableDays=windowMonths.filter(m=>preferred.includes(m)).length;
          const coverage=windowMonths.length?favorableDays/windowMonths.length:0;
          let windowScore=preferred.length?Math.round(50+50*coverage*(Number(rule.rows[0]?.weight)||1)):50;
          const reasons=[];
          const hotDays=windowMonths.filter(m=>[6,7,8].includes(m)).length;
          const hotRatio=windowMonths.length?hotDays/windowMonths.length:0;
          if(senior && hotRatio>=0.5){windowScore-=10;reasons.push('Période potentiellement chaude pour un profil senior');}
          if(family && hotRatio>=0.5){windowScore+=3;reasons.push('Période compatible avec les vacances familiales');}
          if(mobility && coverage<0.75){windowScore-=4;reasons.push('Accessibilité à vérifier selon les conditions locales');}
          if(safetyPriority && health.length===0){reasons.push('Santé & Sécurité à compléter avant décision');}
          candidates.push({date:date.toISOString().slice(0,10),offsetDays:offset,durationDays:duration,score:Math.max(0,Math.min(100,windowScore)),coverage:Math.round(coverage*100),favorable:coverage>=0.5,reasons});
        }
        candidates.sort((a,b)=>b.score-a.score||Math.abs(a.offsetDays)-Math.abs(b.offsetDays));
        dateOptimization={requestedDate:dates.startDate,flexibleDays:flex,recommended:candidates[0]||null,candidates,travelerContext:{senior,family,mobility,budgetLevel:traveler.budget_level||budgetLevel||null},priorities:{climate:climatePriority,safety:safetyPriority}};
        if(candidates[0]?.favorable) score=Math.min(100,score+5);
      }
    }
    const profileIsSenior=String(traveler.traveler_type||'').toLowerCase().includes('senior')||String(traveler.age_group||'').toLowerCase().includes('senior');
    const profileIsFamily=String(traveler.party_type||'').toLowerCase().includes('family')||(Array.isArray(traveler.children_ages)&&traveler.children_ages.length>0);
    const profileHasAccessibility=effectiveAccessibility.length>0||String(traveler.mobility_level||'').toLowerCase().includes('réduit')||String(traveler.mobility_level||'').toLowerCase().includes('reduced');
    const profileMissing=['traveler_type','party_type','budget_level','pace'].filter(k=>!traveler[k]);
    let profileFitScore=Math.max(0,100-profileMissing.length*8-(profileHasAccessibility?5:0));
    if(profileIsSenior&&dateOptimization?.recommended?.reasons?.some(r=>String(r).includes('chaude'))) profileFitScore=Math.max(0,profileFitScore-8);
    const profileFit={score:profileFitScore,signals:{senior:profileIsSenior,family:profileIsFamily,mobility:Boolean(traveler.mobility_level),accessibility:profileHasAccessibility,budget:Boolean(effectiveBudget),pace:Boolean(traveler.pace)},missing:profileMissing,confirmationNeeded:profileHasAccessibility?['accessibility']:[],capturedAt:new Date().toISOString()};
    const optimization={score,completeness,hardMissing,compatibilityWarnings,constraints,dateOptimization,profileFit,travelerContext:{travelerType:traveler.traveler_type||null,budgetLevel:effectiveBudget,accessibilityNeeds:effectiveAccessibility},optimizedAt:new Date().toISOString()};
    const q=await pool.query('UPDATE v30_trip_drafts SET notes=jsonb_set(COALESCE(notes,\'{}\'::jsonb),\'{optimization}\',$1::jsonb,true),status=CASE WHEN $2>=75 THEN \'ready\' ELSE status END,updated_at=now() WHERE id=$3 RETURNING *',
      [JSON.stringify(optimization),score,req.params.id]);
    res.json({draft:q.rows[0],optimization,travelerDecides:true});
  } catch(e){res.status(500).json({error:e.message});}
});

v30VaultRouter.get('/trip-draft/:id/checklist', async (req,res) => {
  try {
    const q=await pool.query('SELECT id,title,status,transport,accommodation,experiences,health_safety,notes,territory_key,updated_at FROM v30_trip_drafts WHERE id=$1',[req.params.id]);
    if(!q.rows[0]) return res.status(404).json({error:'trip_draft_not_found'});
    const d=q.rows[0];
    const notes=d.notes||{};
    const optimization=notes.optimization||{};
    const dates=notes.dates||{};
    const items=[
      {key:'territory',label:'Territoire choisi',done:Boolean(d.territory_key),blocking:true,detail:d.territory_key?'Le territoire est défini.':'Choisissez un territoire avant de finaliser.'},
      {key:'dates',label:'Dates du voyage',done:Boolean(dates.startDate),blocking:true,detail:dates.startDate?'Une date de départ est enregistrée.':'Définissez une date ou une fenêtre flexible.'},
      {key:'transport',label:'Transport',done:Boolean(d.transport&&Object.keys(d.transport).length),blocking:true,detail:d.transport&&Object.keys(d.transport).length?'Un choix de transport est présent.':'Ajoutez un transport.'},
      {key:'accommodation',label:'Hébergement',done:Boolean(d.accommodation&&Object.keys(d.accommodation).length),blocking:true,detail:d.accommodation&&Object.keys(d.accommodation).length?'Un hébergement est présent.':'Ajoutez un hébergement.'},
      {key:'experiences',label:'Expériences',done:Array.isArray(d.experiences)&&d.experiences.length>0,blocking:false,detail:Array.isArray(d.experiences)&&d.experiences.length?d.experiences.length+' expérience(s) retenue(s).':'Gardez au moins une expérience qui vous convient.'},
      {key:'healthSafety',label:'Santé & Sécurité',done:Array.isArray(d.health_safety)&&d.health_safety.length>0,blocking:true,detail:Array.isArray(d.health_safety)&&d.health_safety.length?'Des repères Santé & Sécurité sont associés.':'Ajoutez les repères utiles à proximité.'},
      {key:'optimization',label:'Analyse de préparation',done:Boolean(optimization.optimizedAt),blocking:false,detail:optimization.optimizedAt?'Le projet a été analysé.':'Lancez l’analyse de préparation.'},
      {key:'profileFit',label:'Personnalisation du profil',done:Boolean(optimization.profileFit?.capturedAt),blocking:false,detail:optimization.profileFit?.capturedAt?'Le profil voyageur est intégré à l’analyse.':'Le profil sera intégré lors de l’analyse.'}
    ];
    const blockingMissing=items.filter(x=>x.blocking&&!x.done).map(x=>x.key);
    const readiness=Math.max(0,Math.min(100,Math.round(items.filter(x=>x.done).length/items.length*100)));
    res.json({draftId:Number(req.params.id),status:d.status,readiness,readyForReview:blockingMissing.length===0,blockingMissing,items,travelerDecides:true,proposalOnly:true});
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