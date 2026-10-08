import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://latoile:latoile_dev@localhost:5432/la_toile'
});

export const v30Router = express.Router();

function classify(raw = '') {
  const t = raw.toLowerCase();
  return {
    activity: /artisan/.test(t) ? 'Artisanat'
      : /désert|sahara|erg/.test(t) ? 'Désert'
      : /montagne|ski|randonn/.test(t) ? 'Montagne'
      : /mer|plage|balnéaire|océan/.test(t) ? 'Balnéaire'
      : /culture|patrimoine|musée/.test(t) ? 'Culture & Patrimoine'
      : /gastronom|cuisine/.test(t) ? 'Gastronomie' : null,
    travelerProfile: /senior|âgé|agée|parents|mobilité/.test(t) ? 'Tourisme senior'
      : /enfant|famille/.test(t) ? 'Famille' : null,
    safety: /médec|pharm|hôpital|clinique|santé|sécur|urgence/.test(t),
    territoryKey: /marrakech/.test(t) ? 'MARRAKECH'
      : /merzouga/.test(t) ? 'MERZOUGA'
      : /ouarzazate/.test(t) ? 'OUARZAZATE'
      : /agadir/.test(t) ? 'AGADIR'
      : /essaouira/.test(t) ? 'ESSAOUIRA'
      : /ifrane/.test(t) ? 'IFRANE'
      : /rabat/.test(t) ? 'RABAT'
      : /casablanca/.test(t) ? 'CASABLANCA'
      : /tanger|tangier/.test(t) ? 'TANGER' : null
  };
}

async function safeQuery(res, sql, params = []) {
  try {
    return await pool.query(sql, params);
  } catch (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
}

v30Router.get('/flow', (_req, res) => res.json({
  version: '30.2',
  principle: 'globe_first',
  pilots: ['MAR', 'FRA'],
  pilot: 'MAR',
  flow: ['globe', 'territory', 'intent', 'climate', 'solutions', 'health_safety', 'compare', 'vault'],
  engines: ['pilot_registry', 'geography', 'climate', 'tourism', 'matching', 'health_safety', 'vault', 'living_graph']
}));

v30Router.get('/globe', async (_req, res) => {
  const q = await safeQuery(res, 'SELECT * FROM v30_globe_entry ORDER BY country_iso3');
  if (q) res.json({ pilots: ['MAR', 'FRA'], countries: q.rows });
});

v30Router.get('/globe/activity', async (req,res) => {
  const country = req.query.countryIso3 ? String(req.query.countryIso3).toUpperCase() : null;
  const params = country ? [country] : [];
  const where = country ? ' WHERE country_iso3=$1' : '';
  try {
    const countries = await pool.query(
      'SELECT country_iso3,COUNT(*)::int professional_count,COUNT(*) FILTER(WHERE verified)::int verified_count FROM v30_pro_profiles' +
      (country ? ' WHERE country_iso3=$1' : '') +
      ' GROUP BY country_iso3 ORDER BY professional_count DESC',
      params
    );
    const territories = await pool.query(
      'SELECT country_iso3,COUNT(*)::int territory_count,COUNT(*) FILTER(WHERE active)::int active_count FROM v30_territories' +
      (country ? ' WHERE country_iso3=$1' : '') +
      ' GROUP BY country_iso3 ORDER BY country_iso3',
      params
    );
    const events = await pool.query(
      'SELECT country_iso3,tourism_tag,climate_key,COALESCE(SUM(aggregate_value),0)::numeric aggregate_value FROM v30_institutional_events' +
      where +
      ' GROUP BY country_iso3,tourism_tag,climate_key ORDER BY aggregate_value DESC'
      , params
    );
    res.json({
      scope:{countryIso3:country},
      countries:countries.rows,
      territories:territories.rows,
      tourismSignals:events.rows,
      confidentiality:{individualTravelersExcluded:true,privateVaultExcluded:true,healthProfilesExcluded:true}
    });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

v30Router.get('/globe/hierarchy', async (_req, res) => {
  const q = await safeQuery(res, 'SELECT node_key,parent_key,node_type,name_fr,country_iso3,hemisphere,climate_zones,latitude,longitude FROM v30_geography_nodes WHERE active=true ORDER BY node_type,name_fr');
  if (q) res.json({ root: 'WORLD', nodes: q.rows });
});

v30Router.get('/institutional/dashboard', async (req,res) => {
  const country = req.query.countryIso3 ? String(req.query.countryIso3).toUpperCase() : null;
  const territory = req.query.territoryKey ? String(req.query.territoryKey).toUpperCase() : null;
  try {
    const params = [];
    const filters = [];
    if (country) { params.push(country); filters.push('country_iso3=$' + params.length); }
    if (territory) { params.push(territory); filters.push('territory_key=$' + params.length); }
    const where = filters.length ? ' WHERE ' + filters.join(' AND ') : '';

    const professionals = await pool.query(
      'SELECT country_iso3,COUNT(*)::int professional_count,COUNT(*) FILTER(WHERE verified)::int verified_count FROM v30_pro_profiles' +
      (country ? ' WHERE country_iso3=$1' : '') +
      ' GROUP BY country_iso3 ORDER BY professional_count DESC',
      country ? [country] : []
    );
    const territories = await pool.query(
      'SELECT country_iso3,COUNT(*)::int territory_count,COUNT(*) FILTER(WHERE active)::int active_count FROM v30_territories' +
      (country ? ' WHERE country_iso3=$1' : '') +
      ' GROUP BY country_iso3',
      country ? [country] : []
    );
    const events = await pool.query(
      'SELECT event_type,tourism_tag,climate_key,month,COALESCE(SUM(aggregate_value),0)::numeric aggregate_value,COUNT(*)::int event_count FROM v30_institutional_events' +
      where +
      ' GROUP BY event_type,tourism_tag,climate_key,month ORDER BY aggregate_value DESC',
      params
    );
    const forms = {};
    const climates = {};
    const timeline = {};
    for (const row of events.rows) {
      if (row.tourism_tag) forms[row.tourism_tag] = (forms[row.tourism_tag] || 0) + Number(row.aggregate_value);
      if (row.climate_key) climates[row.climate_key] = (climates[row.climate_key] || 0) + Number(row.aggregate_value);
      if (row.month) timeline[row.month] = (timeline[row.month] || 0) + Number(row.aggregate_value);
    }
    const b2b = await pool.query(
      'SELECT COUNT(*)::int open_opportunities,COUNT(DISTINCT territory_key)::int active_territories FROM v30_pro_opportunities WHERE status=$1',
      ['open']
    );
    res.json({
      scope: { countryIso3: country, territoryKey: territory },
      confidentiality: { travelerIdentitiesExcluded: true, privateVaultExcluded: true, healthProfilesExcluded: true, individualSessionsExcluded: true },
      attractiveness: { professionals: professionals.rows, territories: territories.rows },
      tourismForms: forms,
      climate: climates,
      monthlyTrend: timeline,
      professionalNetwork: b2b.rows[0] || { open_opportunities: 0, active_territories: 0 }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v30Router.get('/pilots', async (_req, res) => {
  const q = await safeQuery(res, 'SELECT * FROM v30_pilot_territories WHERE active=true ORDER BY country_iso3');
  if (q) res.json({ pilots: q.rows });
});

v30Router.get('/territories/:countryIso3', async (req, res) => {
  const q = await safeQuery(res,
    'SELECT * FROM v30_territories WHERE active=true AND upper(country_iso3)=upper($1) ORDER BY region_type,name_fr',
    [req.params.countryIso3]);
  if (q) res.json({ countryIso3: req.params.countryIso3.toUpperCase(), territories: q.rows });
});

v30Router.get('/territory/:territoryKey/activity', async (req,res) => {
  const key = String(req.params.territoryKey).toUpperCase();
  try {
    const t = await pool.query('SELECT territory_key,name_fr,country_iso3,climate_zone,hemisphere,latitude,longitude FROM v30_territories WHERE territory_key=$1 AND active=true',[key]);
    if(!t.rows[0]) return res.status(404).json({error:'territory_not_found'});
    const events = await pool.query(
      'SELECT tourism_tag,climate_key,month,COALESCE(SUM(aggregate_value),0)::numeric aggregate_value FROM v30_institutional_events WHERE territory_key=$1 GROUP BY tourism_tag,climate_key,month ORDER BY aggregate_value DESC',
      [key]
    );
    const pros = await pool.query(
      'SELECT COUNT(*)::int professional_count,COUNT(*) FILTER(WHERE verified)::int verified_count FROM v30_pro_profiles WHERE territory_key=$1',
      [key]
    );
    res.json({
      territory:t.rows[0],
      tourismSignals:events.rows,
      professionalActivity:pros.rows[0],
      confidentiality:{individualTravelersExcluded:true,privateVaultExcluded:true,healthProfilesExcluded:true}
    });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

v30Router.get('/territory/:territoryKey', async (req, res) => {
  const key = req.params.territoryKey.toUpperCase();
  const territory = await safeQuery(res, 'SELECT * FROM v30_territories WHERE territory_key=$1', [key]);
  if (!territory) return;
  if (!territory.rows[0]) return res.status(404).json({ error: 'territory_not_found' });
  const solutions = await safeQuery(res, 'SELECT * FROM v30_solutions WHERE territory_key=$1 AND active=true ORDER BY solution_type,title', [key]);
  if (!solutions) return;
  const health = await safeQuery(res, 'SELECT * FROM v30_health_safety_points WHERE territory_key=$1 AND active=true ORDER BY service_type,name', [key]);
  if (!health) return;
  res.json({ territory: territory.rows[0], solutions: solutions.rows, healthSafety: health.rows, healthSafetyDecision: { coverage: healthCoverage, score: healthSafetyScore, complete: healthSafetyScore === 100, missing: Object.entries(healthCoverage).filter(([,v])=>!v).map(([k])=>k) } });
});

v30Router.get('/climate/context', async (req, res) => {
  const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));
  const hemisphere = ['north', 'south', 'equatorial'].includes(req.query.hemisphere) ? req.query.hemisphere : 'north';
  const climate = String(req.query.climate || 'mediterranean');
  const q = await safeQuery(res,
    'SELECT * FROM v30_climate_seasons WHERE climate_key=$1 AND hemisphere=$2 AND ((month_start<=month_end AND $3 BETWEEN month_start AND month_end) OR (month_start>month_end AND ($3>=month_start OR $3<=month_end))) ORDER BY month_start LIMIT 1',
    [climate, hemisphere, month]);
  if (q) res.json({ month, hemisphere, climate, context: q.rows[0] || null });
});

v30Router.get('/conditions/:territoryKey', async (req, res) => {
  const key = req.params.territoryKey.toUpperCase();
  const q = await safeQuery(res, 'SELECT * FROM v30_conditions_context WHERE territory_key=$1', [key]);
  if (q) res.json({ territoryKey: key, conditions: q.rows[0] || { status: 'not_available' } });
});

v30Router.get('/territory/:territoryKey/environment', async (req,res) => {
  const key = String(req.params.territoryKey).toUpperCase();
  const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));
  try {
    const t = await pool.query(
      'SELECT territory_key,name_fr,country_iso3,climate_zone,hemisphere,latitude,longitude FROM v30_territories WHERE territory_key=$1 AND active=true',
      [key]
    );
    if (!t.rows[0]) return res.status(404).json({error:'territory_not_found'});
    const territory=t.rows[0];
    const season=await pool.query(
      'SELECT * FROM v30_climate_seasons WHERE climate_key=$1 AND hemisphere=$2 AND ((month_start<=month_end AND $3 BETWEEN month_start AND month_end) OR (month_start>month_end AND ($3>=month_start OR $3<=month_end))) ORDER BY month_start LIMIT 1',
      [String(territory.climate_zone||'').toLowerCase(),territory.hemisphere,month]
    );
    const conditions=await pool.query('SELECT * FROM v30_conditions_context WHERE territory_key=$1',[key]);
    const observed=conditions.rows[0]||{status:'not_available'};
    res.json({
      territory,
      calendar:{month,season:season.rows[0]||null},
      observedConditions:observed,
      decisionContext:{
        seasonalContextAvailable:Boolean(season.rows[0]),
        observedConditionsAvailable:observed.status==='available',
        weatherMustNotBeInferred:observed.status!=='available'
      }
    });
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

v30Router.get('/territory/:territoryKey/climate', async (req, res) => {
  const key = req.params.territoryKey.toUpperCase();
  const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));
  const t = await safeQuery(res, 'SELECT territory_key,name_fr,country_iso3,climate_zone,hemisphere,latitude,longitude FROM v30_territories WHERE territory_key=$1 AND active=true', [key]);
  if (!t) return;
  if (!t.rows[0]) return res.status(404).json({ error: 'territory_not_found' });
  const territory = t.rows[0];
  const climate = String(territory.climate_zone || 'mediterranean').toLowerCase();
  const c = await safeQuery(res,
    'SELECT * FROM v30_climate_seasons WHERE climate_key=$1 AND hemisphere=$2 AND ((month_start<=month_end AND $3 BETWEEN month_start AND month_end) OR (month_start>month_end AND ($3>=month_start OR $3<=month_end))) ORDER BY month_start LIMIT 1',
    [climate, territory.hemisphere, month]);
  if (!c) return;
  res.json({ territory, month, climate, hemisphere: territory.hemisphere, season: c.rows[0] || null });
});

v30Router.get('/journey/context', async (req, res) => {
  const territoryKey = String(req.query.territoryKey || '').toUpperCase();
  const tag = String(req.query.tag || '').toLowerCase();
  const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));
  if (!territoryKey || !tag) return res.status(400).json({ error: 'territoryKey_and_tag_required' });
  const t = await safeQuery(res, 'SELECT territory_key,name_fr,climate_zone,hemisphere,country_iso3 FROM v30_territories WHERE territory_key=$1 AND active=true', [territoryKey]);
  if (!t) return;
  if (!t.rows[0]) return res.status(404).json({ error: 'territory_not_found' });
  const territory=t.rows[0], climate=String(territory.climate_zone||'mediterranean').toLowerCase();
  const r = await safeQuery(res, 'SELECT *,CASE WHEN $4=ANY(preferred_months) THEN weight ELSE weight*0.65 END AS compatibility_score FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3 LIMIT 1', [tag,climate,territory.hemisphere,month]);
  if (!r) return;
  res.json({ territory, tag, month, climate, hemisphere: territory.hemisphere, compatibility: r.rows[0] || null });
});

v30Router.get('/compatibility', async (req, res) => {
  const tag = String(req.query.tag || '').toLowerCase();
  if (!tag) return res.status(400).json({ error: 'tag_required' });
  const climate = String(req.query.climate || 'mediterranean').toLowerCase();
  const hemisphere = ['north', 'south', 'equatorial'].includes(req.query.hemisphere) ? req.query.hemisphere : 'north';
  const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));
  const q = await safeQuery(res,
    'SELECT *,CASE WHEN $4=ANY(preferred_months) THEN weight ELSE weight*0.65 END AS compatibility_score FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3 LIMIT 1',
    [tag, climate, hemisphere, month]);
  if (q) res.json({ tag, climate, hemisphere, month, rule: q.rows[0] || null });
});

v30Router.post('/session', async (req, res) => {
  const { travelerId = null, countryIso3 = 'MAR', territoryKey = null, freedomMode = 'balanced' } = req.body;
  const mode = ['free', 'balanced', 'guided'].includes(freedomMode) ? freedomMode : 'balanced';
  const q = await safeQuery(res,
    'INSERT INTO v30_traveler_sessions(traveler_id,country_iso3,territory_key,stage,metadata) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [travelerId, countryIso3, territoryKey, territoryKey ? 'territory' : 'globe', JSON.stringify({ freedomMode: mode })]);
  if (q) res.status(201).json({ session: q.rows[0], next: territoryKey ? 'intent' : 'territory' });
});

v30Router.post('/session/:id/profile', async (req, res) => {
  const allowed = ['traveler_type','age_group','mobility_level','party_type','party_size','children_ages','budget_level','pace','duration_days','accessibility_needs','preferences','constraints'];
  const arrayFields = new Set(['children_ages','accessibility_needs','preferences','constraints']);
  const values = allowed.map(key => {
    if (arrayFields.has(key)) return Array.isArray(req.body[key]) ? req.body[key] : [];
    return req.body[key] ?? null;
  });
  const q = await safeQuery(res,
    'INSERT INTO v30_traveler_profiles(session_id,traveler_type,age_group,mobility_level,party_type,party_size,children_ages,budget_level,pace,duration_days,accessibility_needs,preferences,constraints) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(session_id) DO UPDATE SET traveler_type=EXCLUDED.traveler_type,age_group=EXCLUDED.age_group,mobility_level=EXCLUDED.mobility_level,party_type=EXCLUDED.party_type,party_size=EXCLUDED.party_size,children_ages=EXCLUDED.children_ages,budget_level=EXCLUDED.budget_level,pace=EXCLUDED.pace,duration_days=EXCLUDED.duration_days,accessibility_needs=EXCLUDED.accessibility_needs,preferences=EXCLUDED.preferences,constraints=EXCLUDED.constraints,updated_at=now() RETURNING *',
    [req.params.id, ...values]);
  if (q) res.status(201).json({ profile: q.rows[0] });
});

v30Router.post('/session/:id/intent', async (req, res) => {
  const rawText = String(req.body.rawText || '').trim();
  if (!rawText) return res.status(400).json({ error: 'rawText_required' });
  const intent = classify(rawText);
  const confidence = (intent.activity ? 0.35 : 0) + (intent.territoryKey ? 0.35 : 0) + (intent.travelerProfile ? 0.15 : 0) + (intent.safety ? 0.15 : 0);
  const q = await safeQuery(res,
    'INSERT INTO v30_traveler_intents(session_id,raw_text,intent,confidence) VALUES($1,$2,$3,$4) RETURNING *',
    [req.params.id, rawText, intent, confidence]);
  if (q) res.status(201).json({ intent, analysis: q.rows[0], next: 'solutions' });
});

v30Router.get('/journey/windows', async (req,res) => {
  const territoryKey=String(req.query.territoryKey||'').toUpperCase();
  const tag=String(req.query.tag||'').toLowerCase();
  const duration=Math.min(365,Math.max(1,Number(req.query.durationDays)||7));
  const startMonth=Math.min(12,Math.max(1,Number(req.query.startMonth)||1));
  const flexibility=Math.min(30,Math.max(0,Number(req.query.flexibilityDays)||0));
  if(!territoryKey||!tag) return res.status(400).json({error:'territoryKey_and_tag_required'});
  try{
    const t=await pool.query('SELECT territory_key,name_fr,climate_zone,hemisphere FROM v30_territories WHERE territory_key=$1 AND active=true',[territoryKey]);
    if(!t.rows[0]) return res.status(404).json({error:'territory_not_found'});
    const territory=t.rows[0], climate=String(territory.climate_zone||'').toLowerCase();
    const rule=await pool.query('SELECT preferred_months,weight,rationale_fr FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3',[tag,climate,territory.hemisphere]);
    const climateRule=rule.rows[0]||null, preferred=climateRule?.preferred_months||[], weight=Math.max(0,Math.min(1,Number(climateRule?.weight)||0));
    const candidates=[];
    for(let offset=-flexibility;offset<=flexibility;offset++){
      const anchor=new Date(Date.UTC(2026,startMonth-1,15)); anchor.setUTCDate(anchor.getUTCDate()+offset);
      const months=[]; for(let d=0;d<Math.min(duration,12);d++) months.push(((anchor.getUTCMonth()+d)%12)+1);
      const favorableMonths=months.filter(m=>preferred.includes(m)).length;
      const coverage=months.length?favorableMonths/months.length:0;
      const score=preferred.length?Math.round(50+50*coverage*weight):50;
      const reasons=preferred.length?(coverage===1?['Fenêtre entièrement dans la période climatique favorable']:coverage>=0.5?['Fenêtre majoritairement favorable climatiquement']:['Fenêtre avec couverture climatique partielle']):['Aucune règle climatique spécifique disponible'];
      candidates.push({startMonth:anchor.getUTCMonth()+1,offsetDays:offset,durationDays:duration,score,favorable:coverage>=0.5,coverage:Math.round(coverage*100),months,reasons});
    }
    candidates.sort((a,b)=>b.score-a.score||Math.abs(a.offsetDays)-Math.abs(b.offsetDays));
    res.json({territory,durationDays:duration,requestedStartMonth:startMonth,flexibilityDays:flexibility,rule:climateRule,windows:candidates.slice(0,Math.min(candidates.length,15)),recommended:candidates[0]||null});
  }catch(e){res.status(500).json({error:e.message});}
});

v30Router.get('/territory/:territoryKey/data-quality', async (req,res) => {
  const key=String(req.params.territoryKey).toUpperCase();
  try {
    const territory=await pool.query('SELECT territory_key,name_fr FROM v30_territories WHERE territory_key=$1 AND active=true',[key]);
    if(!territory.rows[0]) return res.status(404).json({error:'territory_not_found'});
    const solutions=await pool.query(
      'SELECT id,title,provider_name,public_contact,latitude,longitude,active FROM v30_solutions WHERE territory_key=$1',
      [key]
    );
    const professionals=await pool.query(
      'SELECT id,name,verified,active FROM v30_pro_profiles WHERE territory_key=$1',
      [key]
    );
    const verifiedNames=new Set(professionals.rows.filter(p=>p.verified).map(p=>String(p.name).toLowerCase()));
    const quality=solutions.rows.map(x=>{
      let score=40; const reasons=[];
      if(x.active){score+=15;reasons.push('Offre active');}
      if(x.public_contact && Object.keys(x.public_contact).length){score+=15;reasons.push('Contact public renseigné');}
      if(Number.isFinite(Number(x.latitude)) && Number.isFinite(Number(x.longitude))){score+=15;reasons.push('Géolocalisation renseignée');}
      if(x.provider_name && verifiedNames.has(String(x.provider_name).toLowerCase())){score+=15;reasons.push('Professionnel vérifié associé');}
      return {solutionId:x.id,title:x.title,qualityScore:Math.min(100,score),qualityReasons:reasons};
    });
    const avg=quality.length?Math.round(quality.reduce((a,x)=>a+x.qualityScore,0)/quality.length):0;
    res.json({territory:territory.rows[0],summary:{solutions:quality.length,averageQualityScore:avg,verifiedProfessionals:professionals.rows.filter(p=>p.verified).length},solutions:quality});
  }catch(e){res.status(500).json({error:e.message});}
});

v30Router.get('/session/:id/solutions', async (req, res) => {
  const session = await safeQuery(res, 'SELECT * FROM v30_traveler_sessions WHERE id=$1', [req.params.id]);
  if (!session) return;
  if (!session.rows[0]) return res.status(404).json({ error: 'session_not_found' });
  const key = session.rows[0].territory_key;
  if (!key) return res.status(400).json({ error: 'territory_required' });

  const intentQ = await safeQuery(res, 'SELECT * FROM v30_traveler_intents WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1', [req.params.id]);
  if (!intentQ) return;
  const profileQ = await safeQuery(res, 'SELECT * FROM v30_traveler_profiles WHERE session_id=$1', [req.params.id]);
  if (!profileQ) return;

  const territoryQ = await safeQuery(res, 'SELECT territory_key,name_fr,climate_zone,hemisphere,country_iso3 FROM v30_territories WHERE territory_key=$1 AND active=true', [key]);
  if (!territoryQ) return;
  if (!territoryQ.rows[0]) return res.status(404).json({ error: 'territory_not_found' });

  const territory = territoryQ.rows[0];
  const intent = intentQ.rows[0]?.intent || {};
  const profile = profileQ.rows[0] || {};
  const month = Number(req.query.month) >= 1 && Number(req.query.month) <= 12 ? Number(req.query.month) : new Date().getUTCMonth() + 1;
  const climate = String(territory.climate_zone || 'mediterranean').toLowerCase();
  const hemisphere = territory.hemisphere || 'north';

  const climateQ = await safeQuery(res,
    'SELECT * FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3 LIMIT 1',
    [String(intent.activity || '').toLowerCase().replaceAll('é','e').replace(/[^a-z]/g,''), climate, hemisphere]);
  if (!climateQ) return;

  const climateRule = climateQ.rows[0] || null;
  const seasonQ = await safeQuery(res,
    'SELECT * FROM v30_climate_seasons WHERE climate_key=$1 AND hemisphere=$2 AND ((month_start<=month_end AND $3 BETWEEN month_start AND month_end) OR (month_start>month_end AND ($3>=month_start OR $3<=month_end))) ORDER BY month_start LIMIT 1',
    [climate, hemisphere, month]);
  if (!seasonQ) return;
  const seasonalContext = seasonQ.rows[0] || null;
  const solutionsQ = await safeQuery(res, 'SELECT * FROM v30_solutions WHERE territory_key=$1 AND active=true', [key]);
  if (!solutionsQ) return;

  const healthQ = await safeQuery(res, 'SELECT service_type,count(*)::int AS n FROM v30_health_safety_points WHERE territory_key=$1 AND active=true GROUP BY service_type', [key]);
  if (!healthQ) return;
  const safetyTypes = new Set(healthQ.rows.map(x => x.service_type));
  const conditionsQ = await safeQuery(res, 'SELECT * FROM v30_conditions_context WHERE territory_key=$1', [key]);
  if (!conditionsQ) return;
  const observed = conditionsQ.rows[0] || { status: 'not_available' };

  const scored = solutionsQ.rows.map(solution => {
    let score = 50;
    const reasons = [];
    const hay = [solution.solution_type, solution.title, solution.description, ...(solution.specialties || []), ...(solution.audience || [])].filter(Boolean).join(' ').toLowerCase();

    if (intent.activity && hay.includes(String(intent.activity).toLowerCase())) { score += 20; reasons.push('Intention compatible'); }
    if (intent.travelerProfile && hay.includes(String(intent.travelerProfile).toLowerCase())) { score += 12; reasons.push('Profil voyageur compatible'); }
    if (profile.party_type && hay.includes(String(profile.party_type).toLowerCase())) { score += 6; reasons.push('Composition du voyage compatible'); }
    if (profile.accessibility_needs?.length) {
      const accessibilityMatch = profile.accessibility_needs.some(a => solution.audience?.some(sa => String(sa).toLowerCase() === String(a).toLowerCase()));
      if (accessibilityMatch) { score += 15; reasons.push('Accessibilité compatible'); }
      else { score -= 12; reasons.push('Accessibilité non confirmée pour cette offre'); }
    }
    if (profile.budget_level) {
      const budgetText = hay;
      const budget = String(profile.budget_level).toLowerCase();
      if (budgetText.includes(budget) || (budget === 'economique' && /gratuit|local|low|budget/i.test(budgetText))) {
        score += 8; reasons.push('Budget compatible');
      } else {
        score -= 3; reasons.push('Budget non confirmé');
      }
    }
    if (profile.traveler_type && solution.audience?.some(a => String(a).toLowerCase().includes(String(profile.traveler_type).toLowerCase()))) {
      score += 8; reasons.push('Public cible compatible');
    }
    if (climateRule) {
      const inSeason = (climateRule.preferred_months || []).includes(month);
      const weight = Math.max(0, Math.min(1, Number(climateRule.weight) || 0));
      const seasonalBonus = Math.round(15 * weight);
      const offSeasonPenalty = Math.round(5 * Math.max(0.5, weight));
      score += inSeason ? seasonalBonus : -offSeasonPenalty;
      reasons.push(inSeason
        ? 'Saison climatique favorable (' + seasonalBonus + ' pts)'
        : 'Hors saison optimale (' + offSeasonPenalty + ' pts)');
      if (seasonalContext?.tourism_context?.length && seasonalContext.tourism_context.includes(String(intent.activity || '').toLowerCase().replaceAll('é','e').replace(/[^a-z_]/g,''))) {
        score += 4;
        reasons.push('Forme touristique cohérente avec la saison');
      }
    }
    const healthSafetyScore = Math.round((new Set(safetyTypes).size / 4) * 100); const safetyRelevant = Boolean(intent.safety || profile.traveler_type || profile.age_group || profile.mobility_level || profile.accessibility_needs?.length); if (safetyRelevant) { const highNeed=Boolean(profile.accessibility_needs?.length || String(profile.traveler_type||'').toLowerCase().includes('senior')); score += Math.round((healthSafetyScore/100)*(highNeed?12:8)); reasons.push('Couverture Santé & Sécurité : '+healthSafetyScore+'/100'); } if (safetyTypes.has('medicine') && safetyTypes.has('pharmacy') && safetyTypes.has('security')) { score += 5; reasons.push('Couverture Santé & Sécurité complète'); }
    if (observed.status === 'available') {
      const outdoor = /montagne|balneaire|desert|nature|adventure|plein air/i.test(hay);
      const precipitation = Number(observed.precipitation_probability);
      const wind = Number(observed.wind_kmh);
      if (outdoor && Number.isFinite(precipitation) && precipitation >= 70) { score -= 10; reasons.push('Conditions observées défavorables aux activités extérieures'); }
      if (outdoor && Number.isFinite(wind) && wind >= 50) { score -= 8; reasons.push('Vent observé défavorable aux activités extérieures'); }
      if (outdoor && Number.isFinite(precipitation) && precipitation < 30 && (!Number.isFinite(wind) || wind < 35)) { score += 5; reasons.push('Conditions observées favorables aux activités extérieures'); }
    } else {
      reasons.push('Conditions météo actuelles non disponibles — aucune inférence');
    }
    let qualityScore = 40;
    if (solution.active) qualityScore += 15;
    if (solution.public_contact && Object.keys(solution.public_contact).length) qualityScore += 15;
    if (Number.isFinite(Number(solution.latitude)) && Number.isFinite(Number(solution.longitude))) qualityScore += 15;
    if (solution.provider_name) qualityScore += 5;
    const rankingScore = Math.round((score * 0.85) + (qualityScore * 0.15));
    reasons.push('Qualité des données: ' + qualityScore + '/100');
    score = Math.max(0, Math.min(100, rankingScore));
    return {
      ...solution,
      compatibilityScore: score,
      dataQualityScore: qualityScore,
      matchReasons: reasons,
      rankingMeta: {
        computedAt: new Date().toISOString(),
        scoringVersion: 'v30.11',
        evidenceFactors: ['active','public_contact','geolocation','provider_identity','climate_rule','seasonal_context'],
        weatherSourceStatus: observed.status
      }
    };
  }).sort((a,b) => b.compatibilityScore-a.compatibilityScore || a.title.localeCompare(b.title));

  for (const solution of scored) {
    await pool.query(
      'INSERT INTO v30_matches(session_id,solution_id,score,reasons) VALUES($1,$2,$3,$4) ON CONFLICT(session_id,solution_id) DO UPDATE SET score=EXCLUDED.score,reasons=EXCLUDED.reasons,created_at=now()',
      [Number(req.params.id), Number(solution.id), Number(solution.compatibilityScore), JSON.stringify(solution.matchReasons)]
    );
  }
  const persisted = await pool.query('SELECT COUNT(*)::int AS count FROM v30_matches WHERE session_id=$1',[Number(req.params.id)]);

  res.json({
    solutions: scored,
    persistedMatchCount: persisted.rows[0].count,
    context: { territory, month, climate, hemisphere, climateRule, seasonalContext, observedConditions: observed },
    healthSafety: { available: safetyTypes.size > 0, serviceTypes: [...safetyTypes] },
    next: 'health_safety'
  });
});

v30Router.post('/session/:id/recommendations/invalidate', async (req,res) => {
  const { reason='data_changed', scope='all', solutionIds=[] } = req.body || {};
  try {
    const ids=Array.isArray(solutionIds)?solutionIds.map(Number).filter(Number.isInteger):[];
    const q=scope==='solutions' && ids.length
      ? await pool.query('UPDATE v30_matches SET reasons=COALESCE(reasons,\'{}\'::jsonb) || $1::jsonb WHERE session_id=$2 AND solution_id=ANY($3::bigint[]) RETURNING id,solution_id,score,created_at',[JSON.stringify({invalidated:true,invalidationReason:reason,invalidationAt:new Date().toISOString()}),req.params.id,ids])
      : await pool.query('UPDATE v30_matches SET reasons=COALESCE(reasons,\'{}\'::jsonb) || $1::jsonb WHERE session_id=$2 RETURNING id,solution_id,score,created_at',[JSON.stringify({invalidated:true,invalidationReason:reason,invalidationAt:new Date().toISOString()}),req.params.id]);
    res.json({sessionId:Number(req.params.id),invalidatedCount:q.rowCount,reason,scope,recalculateRequired:true,matches:q.rows});
  } catch(e){res.status(500).json({error:e.message});}
});

v30Router.post('/graph/propagate', async (req,res) => {
  const { eventId=null, territoryKey=null, entityType=null, entityId=null } = req.body || {};
  try {
    let event=null;
    if(eventId){
      const e=await pool.query('SELECT * FROM v30_graph_events WHERE id=$1',[eventId]);
      event=e.rows[0]||null;
    }
    const tk=territoryKey || event?.territory_key || null;
    const et=entityType || event?.entity_type || null;
    const eid=entityId || event?.entity_id || null;
    if(!tk && !eid) return res.status(400).json({error:'event_or_scope_required'});
    const q=tk
      ? await pool.query(
          'UPDATE v30_matches m SET reasons=COALESCE(m.reasons,\'{}\'::jsonb) || $1::jsonb WHERE m.session_id IN (SELECT id FROM v30_traveler_sessions WHERE territory_key=$2) RETURNING m.id,m.session_id,m.solution_id',
          [JSON.stringify({invalidated:true,invalidationReason:event?.event_type||'graph_change',invalidationAt:new Date().toISOString()}),tk]
        )
      : await pool.query(
          'UPDATE v30_matches SET reasons=COALESCE(reasons,\'{}\'::jsonb) || $1::jsonb WHERE solution_id=$2 RETURNING id,solution_id',
          [JSON.stringify({invalidated:true,invalidationReason:event?.event_type||'entity_change',invalidationAt:new Date().toISOString()}),eid]
        );
    if (q.rowCount) {
      for (const row of q.rows) {
        await pool.query(
          'INSERT INTO v30_recalculation_queue(session_id,solution_id,territory_key,reason,priority) VALUES($1,$2,$3,$4,$5)',
          [row.session_id || null,row.solution_id || null,tk,event?.event_type || 'graph_change',et === 'weather' || et === 'safety' ? 90 : 70]
        );
      }
    }
    res.json({propagated:true,eventId:event?.id||eventId||null,scope:{territoryKey:tk,entityType:et,entityId:eid},invalidatedCount:q.rowCount,recalculationRequired:q.rowCount>0});
  }catch(e){res.status(500).json({error:e.message});}
});

v30Router.post('/graph/change', async (req,res) => {
  const { entityType, entityId=null, territoryKey=null, changeType, payload={} } = req.body || {};
  if(!entityType||!changeType) return res.status(400).json({error:'entityType_and_changeType_required'});
  try {
    const q=await pool.query(
      'INSERT INTO v30_graph_events(entity_type,entity_id,territory_key,event_type,payload) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [entityType,entityId,territoryKey,changeType,JSON.stringify(payload)]
    );
    res.status(201).json({event:q.rows[0],propagation:{recommendationsAffected:Boolean(territoryKey||entityId),recalculationRequired:true}});
  } catch(e){res.status(500).json({error:e.message});}
});

v30Router.get('/graph/changes', async (req,res) => {
  try {
    const limit=Math.min(100,Math.max(1,Number(req.query.limit)||25));
    const q=await pool.query('SELECT * FROM v30_graph_events ORDER BY created_at DESC LIMIT $1',[limit]);
    res.json({events:q.rows});
  } catch(e){res.status(500).json({error:e.message});}
});

v30Router.post('/recalculation-queue/claim', async (req,res) => {
  const limit=Math.min(20,Math.max(1,Number(req.body?.limit)||5));
  try {
    const q=await pool.query(
      `WITH picked AS (
        SELECT id FROM v30_recalculation_queue
        WHERE status='pending' OR (status='processing' AND created_at < now() - interval '30 minutes')
        ORDER BY priority DESC,created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE v30_recalculation_queue q
      SET status='processing'
      FROM picked
      WHERE q.id=picked.id
      RETURNING q.*`,
      [limit]
    );
    res.json({claimed:q.rows.length,items:q.rows});
  }catch(e){res.status(500).json({error:e.message});}
});

v30Router.post('/recalculation-queue/:id/complete', async (req,res) => {
  const success=req.body?.success!==false;
  try {
    const q=await pool.query(
      'UPDATE v30_recalculation_queue SET status=$1,processed_at=now() WHERE id=$2 AND status=\'processing\' RETURNING *',
      [success?'completed':'failed',req.params.id]
    );
    if(!q.rows[0]) return res.status(404).json({error:'recalculation_task_not_processing'});
    res.json({task:q.rows[0]});
  }catch(e){res.status(500).json({error:e.message});}
});

v30Router.get('/recalculation-queue', async (req,res) => {
  const status=String(req.query.status||'pending');
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||25));
  const q=await safeQuery(res,'SELECT * FROM v30_recalculation_queue WHERE status=$1 ORDER BY priority DESC,created_at ASC LIMIT $2',[status,limit]);
  if(q) res.json({status,items:q.rows});
});

v30Router.get('/session/:id/recommendation-history', async (req,res) => {
  const q=await safeQuery(res,
    'SELECT id,solution_id,score,reasons,created_at FROM v30_matches WHERE session_id=$1 ORDER BY created_at DESC,score DESC',
    [req.params.id]
  );
  if(!q) return;
  const now=Date.now();
  const history=q.rows.map(row=>{
    const ageHours=(now-new Date(row.created_at).getTime())/3600000;
    const invalidated=Array.isArray(row.reasons) ? row.reasons.some(item => item && typeof item === 'object' && item.invalidated === true) : Boolean(row.reasons?.invalidated);
    return {...row, invalidated, freshness:ageHours<=6?'current':ageHours<=24?'recent':'stale',recalculateRequired:invalidated || ageHours>24};
  });
  res.json({sessionId:Number(req.params.id),history,policy:{currentHours:6,recentHours:24,staleAfterHours:24}});
});

v30Router.get('/session/:id/compare', async (req, res) => {
  const session = await safeQuery(res, 'SELECT * FROM v30_traveler_sessions WHERE id=$1', [req.params.id]);
  if (!session) return;
  if (!session.rows[0]) return res.status(404).json({ error: 'session_not_found' });
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId < 1) return res.status(400).json({ error: 'invalid_session_id' });
  const selected = String(req.query.ids || '').split(',').map(Number).filter(Number.isInteger).filter(id => id > 0);
  const limit = selected.length ? 20 : 5;
  const sql = selected.length
    ? 'SELECT * FROM v30_matches WHERE session_id=$1 AND solution_id=ANY($2::bigint[]) ORDER BY score DESC'
    : 'SELECT * FROM v30_matches WHERE session_id=$1 ORDER BY score DESC LIMIT $2';
  const params = selected.length ? [sessionId, selected] : [sessionId, limit];
  const matches = await safeQuery(res, sql, params);
  if (!matches) return;
  const ids = matches.rows.map(x => x.solution_id);
  if (!ids.length) return res.json({ sessionId, comparisons: [], selectionRequired: true });
  const solutions = await safeQuery(res, `SELECT s.*, COALESCE((SELECT ROUND(COUNT(DISTINCT h.service_type)*100.0/4) FROM v30_health_safety_points h WHERE h.territory_key=s.territory_key AND h.active=true),0)::int AS health_safety_score FROM v30_solutions s WHERE s.id=ANY($1::bigint[])`, [ids]);
  if (!solutions) return;
  const byId = new Map(solutions.rows.map(x => [Number(x.id), x]));
  const comparisons = matches.rows.map(m => ({ ...m, solution: byId.get(Number(m.solution_id)) || null }));
  res.json({ sessionId, comparisons, selectionRequired: true, maxSelections: 3, comparisonColumns: ['match_score','health_safety_score','reasons','provider','territory'], next: 'vault' });
});

v30Router.post('/session/:id/compare/select', async (req, res) => {
  const solutionIds = Array.isArray(req.body.solutionIds) ? req.body.solutionIds.map(Number).filter(Number.isInteger) : [];
  if (!solutionIds.length || solutionIds.length > 3) return res.status(400).json({ error: 'solutionIds_1_to_3_required' });
  const valid = await safeQuery(res, 'SELECT id,title,territory_key FROM v30_solutions WHERE id=ANY($1::bigint[]) AND active=true', [solutionIds]);
  if (!valid) return;
  if (valid.rows.length !== solutionIds.length) return res.status(400).json({ error: 'solution_not_found' });
  const vault = await safeQuery(res,
    'INSERT INTO v30_vault_items(traveler_id,session_id,item_type,title,payload) VALUES((SELECT traveler_id FROM v30_traveler_sessions WHERE id=$1),$1,\'favorite\',$2,$3) RETURNING *',
    [req.params.id, 'Choix de voyage', JSON.stringify({ solutionIds, solutions: valid.rows })]);
  if (!vault) return;
  res.status(201).json({ selected: valid.rows, vaultItem: vault.rows[0], private: true, next: 'vault' });
});

v30Router.get('/pro/network', async (req, res) => {
  const { countryIso3, territoryKey, specialty, proType } = req.query;
  const where = ['active=true'];
  const params = [];
  if (countryIso3) { params.push(countryIso3); where.push('country_iso3=$' + params.length); }
  if (territoryKey) { params.push(territoryKey); where.push('territory_key=$' + params.length); }
  if (specialty) { params.push(specialty); where.push('$' + params.length + '=ANY(specialties)'); }
  if (proType) { params.push(proType); where.push('pro_type=$' + params.length); }
  const q = await safeQuery(res, 'SELECT * FROM v30_pro_profiles WHERE ' + where.join(' AND ') + ' ORDER BY verified DESC,name LIMIT 100', params);
  if (q) res.json({ network: q.rows, scope: { countryIso3: countryIso3 || null, territoryKey: territoryKey || null, specialty: specialty || null, proType: proType || null } });
});

v30Router.get('/pro/opportunities', async (req, res) => {
  const { territoryKey, status = 'open' } = req.query;
  const params = [status];
  const where = ['o.status=$1'];
  if (territoryKey) { params.push(territoryKey); where.push('o.territory_key=$' + params.length); }
  const q = await safeQuery(res,
    'SELECT o.*,p.name source_name FROM v30_pro_opportunities o JOIN v30_pro_profiles p ON p.id=o.source_pro_id WHERE ' + where.join(' AND ') + ' ORDER BY o.created_at DESC LIMIT 100',
    params);
  if (q) res.json({ opportunities: q.rows });
});

v30Router.get('/vault/trip/:travelerId', async (req, res) => {
  const q = await safeQuery(res, 'SELECT * FROM v30_trip_records WHERE traveler_id=$1 ORDER BY COALESCE(start_at,created_at) DESC', [req.params.travelerId]);
  if (q) res.json({ private: true, records: q.rows });
});

v30Router.get('/vault/health/:travelerId', async (req, res) => {
  const q = await safeQuery(res, 'SELECT * FROM v30_health_profiles WHERE traveler_id=$1', [req.params.travelerId]);
  if (q) res.json({ private: true, profile: q.rows[0] || null });
});

v30Router.get('/vault/session/:sessionId', async (req, res) => {
  const q = await safeQuery(res, 'SELECT id,item_type,title,payload,privacy_class,created_at FROM v30_vault_items WHERE session_id=$1 ORDER BY created_at DESC', [req.params.sessionId]);
  if (q) res.json({ private: true, items: q.rows });
});

v30Router.post('/vault', async (req, res) => {
  const { travelerId = null, sessionId = null, itemType = 'favorite', title, payload = {} } = req.body;
  if (!title) return res.status(400).json({ error: 'title_required' });
  const q = await safeQuery(res,
    'INSERT INTO v30_vault_items(traveler_id,session_id,item_type,title,payload) VALUES($1,$2,$3,$4,$5) RETURNING id,item_type,title,payload,privacy_class,created_at',
    [travelerId, sessionId, itemType, title, payload]);
  if (q) res.status(201).json({ item: q.rows[0], privacy: 'private' });
});

v30Router.get('/pro/opportunity-signals', async (req, res) => {
  const params = [];
  const where = ["s.status='suggested'"];
  if (req.query.territoryKey) { params.push(String(req.query.territoryKey).toUpperCase()); where.push('s.territory_key=$' + params.length); }
  const q = await safeQuery(res,
    'SELECT s.*,sp.name source_name,tp.name target_name FROM v30_pro_opportunity_signals s LEFT JOIN v30_pro_profiles sp ON sp.id=s.source_pro_id LEFT JOIN v30_pro_profiles tp ON tp.id=s.target_pro_id WHERE ' + where.join(' AND ') + ' ORDER BY s.score DESC,s.created_at DESC LIMIT 20',
    params);
  if (q) res.json({ signals:q.rows });
});

v30Router.get('/pro/matches/:proId', async (req,res) => {
  const pro=await safeQuery(res,'SELECT * FROM v30_pro_profiles WHERE id=$1 AND active=true',[req.params.proId]);
  if(!pro) return;
  if(!pro.rows[0]) return res.status(404).json({error:'professional_not_found'});
  const p=pro.rows[0];
  const q=await safeQuery(res,
    `SELECT o.*,sp.name source_name,
      GREATEST(0,
        40
        + CASE WHEN o.territory_key=p.territory_key THEN 25 ELSE 0 END
        + CASE WHEN o.specialties && p.specialties THEN 20 ELSE 0 END
        + CASE WHEN o.audiences && p.audiences THEN 10 ELSE 0 END
        + CASE WHEN o.geographic_scope='global' THEN 5 ELSE 0 END
      ) AS match_score
     FROM v30_pro_opportunities o
     JOIN v30_pro_profiles sp ON sp.id=o.source_pro_id
     WHERE o.status='open' AND o.source_pro_id<>p.id
       AND (o.territory_key=p.territory_key OR o.specialties && p.specialties OR o.audiences && p.audiences)
     ORDER BY match_score DESC,o.created_at DESC LIMIT 50`,
    [req.params.proId]);
  if(q) res.json({professional:p,matches:q.rows});
});
v30Router.get('/v31/professionals/:proId/offers', async (req,res)=>{ const q=await safeQuery(res,`SELECT o.*,p.name professional_name,p.verified,p.pro_type FROM v31_pro_offers o JOIN v30_pro_profiles p ON p.id=o.professional_id WHERE o.professional_id=$1 AND o.status<>'archived' ORDER BY o.updated_at DESC`,[req.params.proId]); if(q) res.json({professionalId:Number(req.params.proId),offers:q.rows}); });
v30Router.post('/v31/professionals/:proId/offers', async (req,res)=>{ const b=req.body||{}; const q=await safeQuery(res,`INSERT INTO v31_pro_offers(professional_id,territory_key,title,description,offer_type,specialties,audiences,inclusions,exclusions,price_amount,currency,capacity_min,capacity_max,booking_mode,status,public_contact,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,[req.params.proId,b.territoryKey,b.title,b.description||null,b.offerType||'experience',b.specialties||[],b.audiences||[],b.inclusions||[],b.exclusions||[],b.priceAmount??null,b.currency||null,b.capacityMin||1,b.capacityMax??null,b.bookingMode||'request',b.status||'draft',b.publicContact||{},b.metadata||{}]); if(q) res.status(201).json({offer:q.rows[0]}); });
v30Router.patch('/v31/offers/:offerId', async (req,res)=>{ const b=req.body||{},map={title:'title',description:'description',offerType:'offer_type',specialties:'specialties',audiences:'audiences',inclusions:'inclusions',exclusions:'exclusions',priceAmount:'price_amount',currency:'currency',capacityMin:'capacity_min',capacityMax:'capacity_max',bookingMode:'booking_mode',status:'status',publicContact:'public_contact',metadata:'metadata'},sets=[],vals=[]; for(const [k,col] of Object.entries(map)) if(b[k]!==undefined){sets.push(col+'=, (_req, res) => res.json({ ok: true, version: '30.2', router: 'v30-platform' }));
+(vals.length+1));vals.push(b[k])}; if(!sets.length)return res.status(400).json({error:'no_updates'}); vals.push(req.params.offerId); const q=await safeQuery(res,'UPDATE v31_pro_offers SET '+sets.join(',')+',updated_at=now() WHERE id=, (_req, res) => res.json({ ok: true, version: '30.2', router: 'v30-platform' }));
+vals.length+' RETURNING *',vals); if(q&&!q.rows[0])return res.status(404).json({error:'offer_not_found'}); if(q)res.json({offer:q.rows[0]}); });
v30Router.post('/v31/offers/:offerId/availability', async (req,res)=>{ const b=req.body||{}; if(!b.availableFrom||!b.availableTo)return res.status(400).json({error:'availability_window_required'}); const q=await safeQuery(res,'INSERT INTO v31_offer_availability(offer_id,available_from,available_to,capacity,booked,status,metadata) VALUES($1,$2,$3,$4,0,$5,$6) RETURNING *',[req.params.offerId,b.availableFrom,b.availableTo,b.capacity||1,b.status||'open',b.metadata||{}]); if(q)res.status(201).json({availability:q.rows[0]}); });
v30Router.get('/v31/offers/:offerId/availability', async (req,res)=>{ const q=await safeQuery(res,'SELECT * FROM v31_offer_availability WHERE offer_id=$1 ORDER BY available_from',[req.params.offerId]); if(q)res.json({offerId:Number(req.params.offerId),availability:q.rows}); });
v30Router.get('/v31/session/:sessionId/offers', async (req,res)=>{ try{const s=await pool.query('SELECT * FROM v30_traveler_sessions WHERE id=$1',[req.params.sessionId]);if(!s.rows[0])return res.status(404).json({error:'session_not_found'});const session=s.rows[0],p=(await pool.query('SELECT * FROM v30_traveler_profiles WHERE session_id=$1',[req.params.sessionId])).rows[0]||{},intent=(await pool.query('SELECT intent FROM v30_traveler_intents WHERE session_id=$1 ORDER BY created_at DESC LIMIT 1',[req.params.sessionId])).rows[0]?.intent||{};const q=await pool.query(`SELECT o.*,p.name professional_name,p.verified,p.pro_type,COALESCE(a.next_available,NULL) next_available,(CASE WHEN o.territory_key=$2 THEN 25 ELSE 0 END+CASE WHEN o.audiences && $3::text[] THEN 20 ELSE 0 END+CASE WHEN o.specialties && $4::text[] THEN 25 ELSE 0 END+CASE WHEN o.status='published' THEN 15 ELSE 0 END+CASE WHEN p.verified THEN 10 ELSE 0 END) AS match_score FROM v31_pro_offers o JOIN v30_pro_profiles p ON p.id=o.professional_id LEFT JOIN LATERAL(SELECT MIN(available_from) next_available FROM v31_offer_availability av WHERE av.offer_id=o.id AND av.status='open' AND av.booked<av.capacity AND av.available_to>=now()) a ON true WHERE o.status='published' ORDER BY match_score DESC,o.updated_at DESC LIMIT 50`,[req.params.sessionId,session.territory_key,p.party_type?[p.party_type]:[],intent.activity?[intent.activity]:[]]);res.json({sessionId:Number(req.params.sessionId),territoryKey:session.territory_key,offers:q.rows,travelerDecides:true,proposalOnly:true});}catch(e){res.status(500).json({error:e.message})} });
v30Router.post('/v31/session/:sessionId/reservations',async(req,res)=>{
 try{
  const s=await pool.query('SELECT id FROM v30_traveler_sessions WHERE id=$1',[req.params.sessionId]);if(!s.rows[0])return res.status(404).json({error:'session_not_found'});
  const b=req.body||{},o=await pool.query("SELECT id FROM v31_pro_offers WHERE id=$1 AND status='published'",[b.offerId]);if(!o.rows[0])return res.status(404).json({error:'offer_not_found_or_not_published'});
  const party=Math.max(1,Number(b.partySize)||1);
  if(b.requestedFrom&&b.requestedTo&&new Date(b.requestedTo)<=new Date(b.requestedFrom))return res.status(400).json({error:'invalid_reservation_window'});
  if(b.availabilityId){const av=await pool.query("SELECT id,offer_id,available_from,available_to,capacity,booked,status FROM v31_offer_availability WHERE id=$1",[b.availabilityId]);const a=av.rows[0];if(!a||Number(a.offer_id)!==Number(b.offerId))return res.status(400).json({error:'availability_offer_mismatch'});if(a.status!=='open'||Number(a.booked)+party>Number(a.capacity))return res.status(409).json({error:'capacity_unavailable'});if(b.requestedFrom&&new Date(b.requestedFrom)<new Date(a.available_from))return res.status(400).json({error:'outside_availability_window'});if(b.requestedTo&&new Date(b.requestedTo)>new Date(a.available_to))return res.status(400).json({error:'outside_availability_window'})}
  const q=await pool.query('INSERT INTO v31_reservation_requests(traveler_session_id,offer_id,availability_id,requested_from,requested_to,party_size,traveler_note) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[req.params.sessionId,b.offerId,b.availabilityId||null,b.requestedFrom||null,b.requestedTo||null,party,b.travelerNote||null]);
  res.status(201).json({reservation:q.rows[0],status:'requested',travelerDecides:true,automaticBooking:false});
 }catch(err){res.status(500).json({error:err.message})}
});
v30Router.get('/v31/session/:sessionId/reservations',async(req,res)=>{
 const q=await safeQuery(res,'SELECT r.*,o.title offer_title,p.name professional_name FROM v31_reservation_requests r JOIN v31_pro_offers o ON o.id=r.offer_id JOIN v30_pro_profiles p ON p.id=o.professional_id WHERE r.traveler_session_id=$1 ORDER BY r.created_at DESC',[req.params.sessionId]);
 if(q)res.json({reservations:q.rows,travelerDecides:true});
});
v30Router.get('/v31/professionals/:proId/reservations',async(req,res)=>{
 const q=await safeQuery(res,'SELECT r.*,o.title offer_title,ts.country_iso3 FROM v31_reservation_requests r JOIN v31_pro_offers o ON o.id=r.offer_id JOIN v30_traveler_sessions ts ON ts.id=r.traveler_session_id WHERE o.professional_id=$1 ORDER BY r.created_at DESC',[req.params.proId]);
 if(q)res.json({professionalId:Number(req.params.proId),reservations:q.rows});
});
v30Router.patch('/v31/reservations/:reservationId',async(req,res)=>{
 if(req.body?.status!==undefined)return res.status(400).json({error:'status_transition_use_action_endpoint'});
 const map={priceAmount:'price_amount',currency:'currency',professionalNote:'professional_note'},sets=[],vals=[];
 for(const [k,col] of Object.entries(map))if(req.body?.[k]!==undefined){sets.push(col+'=$'+(vals.length+1));vals.push(req.body[k])}
 if(!sets.length)return res.status(400).json({error:'no_updates'});
 vals.push(req.params.reservationId);
 const q=await safeQuery(res,'UPDATE v31_reservation_requests SET '+sets.join(',')+',updated_at=now() WHERE id=$'+vals.length+' AND status NOT IN ('+"'cancelled'"+','+"'expired'"+') RETURNING *',vals);
 if(q&&!q.rows[0])return res.status(404).json({error:'reservation_not_found_or_closed'});if(q)res.json({reservation:q.rows[0]});
});


v30Router.post('/v31/reservations/:reservationId/confirm',async(req,res)=>{try{const c=await pool.connect();try{await c.query('BEGIN');const q=await c.query("SELECT r.* FROM v31_reservation_requests r WHERE r.id=$1 FOR UPDATE",[req.params.reservationId]);if(!q.rows[0]){await c.query('ROLLBACK');return res.status(404).json({error:'reservation_not_found'})}const x=q.rows[0];if(!['requested','proposed'].includes(x.status)){await c.query('ROLLBACK');return res.status(409).json({error:'reservation_not_confirmable',status:x.status})} if(x.requested_from&&x.requested_to&&new Date(x.requested_to)<=new Date(x.requested_from)){await c.query('ROLLBACK');return res.status(400).json({error:'invalid_reservation_window'})}if(x.availability_id){const a=(await c.query("SELECT * FROM v31_offer_availability WHERE id=$1 FOR UPDATE",[x.availability_id])).rows[0];if(!a||a.status!=='open'||Number(a.booked)+Number(x.party_size)>Number(a.capacity)){await c.query('ROLLBACK');return res.status(409).json({error:'capacity_unavailable'})}await c.query("UPDATE v31_offer_availability SET booked=booked+$1,status=CASE WHEN booked+$1>=capacity THEN 'sold_out' ELSE status END WHERE id=$2",[x.party_size,x.availability_id])}const u=await c.query("UPDATE v31_reservation_requests SET status='confirmed',updated_at=now() WHERE id=$1 RETURNING *",[x.id]);await c.query("INSERT INTO v31_reservation_events(reservation_id,from_status,to_status,actor_type,note) VALUES($1,$2,'confirmed','traveler',$3)",[x.id,x.status,req.body?.note||null]);await c.query('COMMIT');res.json({reservation:u.rows[0],status:'confirmed',capacityReserved:Boolean(x.availability_id),travelerDecides:true,automaticBooking:false});}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}}catch(e){res.status(500).json({error:e.message})}});
v30Router.post('/v31/reservations/:reservationId/cancel',async(req,res)=>{try{const c=await pool.connect();try{await c.query('BEGIN');const q=await c.query("SELECT * FROM v31_reservation_requests WHERE id=$1 FOR UPDATE",[req.params.reservationId]);if(!q.rows[0]){await c.query('ROLLBACK');return res.status(404).json({error:'reservation_not_found'})}const x=q.rows[0];if(!['requested','proposed','confirmed'].includes(x.status)){await c.query('ROLLBACK');return res.status(409).json({error:'reservation_not_cancellable',status:x.status})}if(x.status==='confirmed'&&x.availability_id)await c.query("UPDATE v31_offer_availability SET booked=GREATEST(0,booked-$1),status=CASE WHEN booked-$1<capacity THEN 'open' ELSE status END WHERE id=$2",[x.party_size,x.availability_id]);const u=await c.query("UPDATE v31_reservation_requests SET status='cancelled',updated_at=now() WHERE id=$1 RETURNING *",[x.id]);await c.query("INSERT INTO v31_reservation_events(reservation_id,from_status,to_status,actor_type,note) VALUES($1,$2,'cancelled',$3,$4)",[x.id,x.status,req.body?.actorType==='professional'?'professional':'traveler',req.body?.note||null]);await c.query('COMMIT');res.json({reservation:u.rows[0],status:'cancelled',capacityReleased:x.status==='confirmed'&&Boolean(x.availability_id)});}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}}catch(e){res.status(500).json({error:e.message})}});

v30Router.post('/v31/reservations/:reservationId/payment-intent',async(req,res)=>{
 try{
  const q=await pool.query("SELECT id,status,price_amount,currency FROM v31_reservation_requests WHERE id=$1",[req.params.reservationId]);
  if(!q.rows[0])return res.status(404).json({error:'reservation_not_found'});
  const x=q.rows[0];if(x.status!=='confirmed')return res.status(409).json({error:'reservation_not_confirmed',status:x.status});
  const amount=req.body?.amount!==undefined?Number(req.body.amount):Number(x.price_amount||0);const currency=req.body?.currency||x.currency;if(!currency)return res.status(400).json({error:'currency_required'});if(!Number.isFinite(amount)||amount<0)return res.status(400).json({error:'invalid_amount'});
  const mode=['direct','escrow','external'].includes(req.body?.paymentMode)?req.body.paymentMode:'direct';
  const i=await pool.query("INSERT INTO v31_transaction_intents(reservation_id,amount,currency,payment_mode,provider,metadata) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(reservation_id) DO UPDATE SET amount=EXCLUDED.amount,currency=EXCLUDED.currency,payment_mode=EXCLUDED.payment_mode,provider=EXCLUDED.provider,updated_at=now() RETURNING *",[x.id,amount,currency,mode,req.body?.provider||null,req.body?.metadata||{}]);
  res.status(201).json({paymentIntent:i.rows[0],paymentRequired:amount>0,automaticPayment:false,travelerDecides:true});
 }catch(e){res.status(500).json({error:e.message})}
});

v30Router.post('/v32/globe/trip-draft/:draftId/select-component',async(req,res)=>{
 try{
  const type=req.body?.componentType,id=Number(req.body?.offerId);
  if(!['transport','accommodation','experiences'].includes(type)||!Number.isInteger(id))return res.status(400).json({error:'invalid_selection'});
  const d=await pool.query("SELECT id FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const o=await pool.query("SELECT id,title,offer_type,territory_key,price_amount,currency,booking_mode FROM v31_pro_offers WHERE id=$1 AND status='published'",[id]);
  if(!o.rows[0])return res.status(404).json({error:'offer_not_found'});
  const s=await pool.query("INSERT INTO v32_trip_component_selections(trip_draft_id,component_type,offer_id,metadata) VALUES($1,$2,$3,$4) RETURNING *",[d.rows[0].id,type,id,JSON.stringify(o.rows[0])]);
  res.status(201).json({selection:s.rows[0],offer:o.rows[0],travelerDecides:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/readiness',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,title,status,territory_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0],missing=[];
  if(!x.territory_key)missing.push('territory');
  if(!x.transport||!Object.keys(x.transport).length)missing.push('transport');
  if(!x.accommodation||!Object.keys(x.accommodation).length)missing.push('accommodation');
  if(!Array.isArray(x.experiences)||!x.experiences.length)missing.push('experiences');
  if(!Array.isArray(x.health_safety)||!x.health_safety.length)missing.push('health_safety');
  res.json({tripDraftId:x.id,missing,completeness:Math.round((5-missing.length)/5*100),readyForDecision:missing.length===0,travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/preparation',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,title,status,territory_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0];
  const profile=await pool.query("SELECT p.traveler_type,p.age_group,p.mobility_level,p.party_type,p.party_size,p.budget_level,p.pace,p.duration_days,p.accessibility_needs,p.preferences,p.constraints FROM v30_traveler_profiles p JOIN v30_trip_drafts t ON t.session_id=p.session_id WHERE t.id=$1",[x.id]);
  const travelerProfile=profile.rows[0]||null;
  const fitSignals=[];
  if(travelerProfile){if(travelerProfile.mobility_level&&travelerProfile.mobility_level!=='independent')fitSignals.push({key:'mobility',label:'Vérifier l’accessibilité des solutions',priority:'high'});if(travelerProfile.age_group==='senior')fitSignals.push({key:'senior',label:'Privilégier confort, rythme et périodes tempérées',priority:'medium'});if(travelerProfile.party_type==='family')fitSignals.push({key:'family',label:'Vérifier les solutions adaptées aux enfants',priority:'medium'});if(travelerProfile.constraints?.length)fitSignals.push({key:'constraints',label:'Prendre en compte les contraintes déclarées',priority:'high'});if(travelerProfile.budget_level)fitSignals.push({key:'budget',label:'Vérifier que le coût total reste dans le niveau de budget choisi',priority:'medium'});if(travelerProfile.duration_days)fitSignals.push({key:'duration',label:'Vérifier que les composants couvrent la durée prévue',priority:'medium'});if(travelerProfile.pace)fitSignals.push({key:'pace',label:'Vérifier la compatibilité entre le rythme souhaité et les expériences choisies',priority:'medium'});if(travelerProfile.preferences?.length)fitSignals.push({key:'preferences',label:'Comparer les offres avec les préférences déclarées',priority:'medium'});}
  const s=await pool.query("SELECT component_type,COUNT(*)::int count FROM v32_trip_component_selections WHERE trip_draft_id=$1 GROUP BY component_type",[x.id]);
  const counts={transport:0,accommodation:0,experiences:0};for(const row of s.rows)counts[row.component_type]=row.count;
  const checklist=[
   {key:'territory',label:'Territoire',done:Boolean(x.territory_key)},
   {key:'transport',label:'Transport',done:Boolean(x.transport&&Object.keys(x.transport).length)||counts.transport>0},
   {key:'accommodation',label:'Hébergement',done:Boolean(x.accommodation&&Object.keys(x.accommodation).length)||counts.accommodation>0},
   {key:'experiences',label:'Expériences',done:Array.isArray(x.experiences)&&x.experiences.length>0||counts.experiences>0},
   {key:'health_safety',label:'Santé & Sécurité',done:Array.isArray(x.health_safety)&&x.health_safety.length>0}
  ];
  const done=checklist.filter(i=>i.done).length;
  res.json({tripDraft:x,travelerProfile,fitSignals,componentSelectionCounts:counts,checklist,completeness:Math.round(done/checklist.length*100),travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/component-selections',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,title,status,territory_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const q=await pool.query("SELECT id,component_type,offer_id,selected_at,metadata FROM v32_trip_component_selections WHERE trip_draft_id=$1 ORDER BY selected_at DESC",[d.rows[0].id]);
  const grouped={transport:[],accommodation:[],experiences:[]};for(const x of q.rows)grouped[x.component_type].push(x);
  res.json({tripDraft:d.rows[0],selections:q.rows,grouped,decisionBoundary:{travelerDecides:true,automaticBooking:false}});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.post('/v32/trip-draft/:draftId/revise-component',async(req,res)=>{
 try{
  const type=req.body?.componentType,id=Number(req.body?.offerId);
  if(!['transport','accommodation','experiences'].includes(type)||!Number.isInteger(id))return res.status(400).json({error:'invalid_component'});
  const d=await pool.query("SELECT id,transport,accommodation,experiences FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const o=await pool.query("SELECT id,title,offer_type,territory_key,price_amount,currency,booking_mode FROM v31_pro_offers WHERE id=$1 AND status='published'",[id]);
  if(!o.rows[0])return res.status(404).json({error:'offer_not_found'});
  const x=d.rows[0],col=type==='transport'?'transport':type==='accommodation'?'accommodation':'experiences';
  const prev=x[col]; const next=type==='experiences'?[o.rows[0]]:o.rows[0];
  await pool.query(`UPDATE v30_trip_drafts SET ${col}=$1::jsonb,updated_at=now() WHERE id=$2`,[JSON.stringify(next),x.id]);
  const previousId=type==='experiences'?(Array.isArray(prev)&&prev[0]?.id||null):(prev?.id||null);
  await pool.query("INSERT INTO v32_trip_component_revisions(trip_draft_id,component_type,previous_offer_id,new_offer_id,metadata) VALUES($1,$2,$3,$4,$5)",[x.id,type,previousId,id,JSON.stringify({source:'traveler_revision'})]);
  res.json({tripDraftId:x.id,componentType:type,previousOfferId:previousId,newOfferId:id,reoptimizationSuggested:true,travelerDecides:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/globe/root',async(req,res)=>{
 try{const q=await pool.query("SELECT node_key,node_type,name,hemisphere,climate_keys,latitude,longitude FROM v32_geo_nodes WHERE node_type='world' AND active=true ORDER BY name");res.json({zoomLevel:0,nodes:q.rows,navigation:'progressive'});}catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/globe/:nodeKey',async(req,res)=>{
 try{const node=await pool.query("SELECT * FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);if(!node.rows[0])return res.status(404).json({error:'geo_node_not_found'});const n=node.rows[0];const q=await pool.query("SELECT node_key,node_type,name,country_iso3,hemisphere,climate_keys,latitude,longitude FROM v32_geo_nodes WHERE parent_key=$1 AND active=true ORDER BY name",[n.node_key]);res.json({node:n,children:q.rows,zoomLevel:n.node_type==='world'?0:n.node_type==='continent'?1:n.node_type==='country'?2:n.node_type==='region'?3:n.node_type==='territory'?4:5,navigation:'progressive'});}catch(e){res.status(500).json({error:e.message})}
});

v30Router.get('/v32/globe/:nodeKey/geometry',async(req,res)=>{
 try{
  const n=await pool.query("SELECT g.node_key,g.node_type,g.name,g.country_iso3,r.source_dataset,r.source_key,r.geometry_type,r.geometry_ref FROM v32_geo_nodes g LEFT JOIN v32_geo_render_sources r ON r.node_key=g.node_key WHERE g.node_key=$1 AND g.active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const x=n.rows[0];
  if(!x.source_key)return res.json({node:x,geometry:null,source:null,available:false});
  const table=x.node_type==='country'?'ne_admin0_countries_v29_14':(x.node_type==='region'||x.node_type==='territory'?'ne_admin1_states_v29_14':null);
  if(!table)return res.json({node:x,geometry:null,source:x.source_dataset,available:false});
  const exists=await pool.query("SELECT to_regclass($1) IS NOT NULL AS ok",['public.'+table]);
  if(!exists.rows[0]?.ok)return res.json({node:x,geometry:null,source:x.source_dataset,available:false});
  const sql=x.node_type==='country'
   ? "SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Force2D(geom),0.08))::json AS geometry FROM ne_admin0_countries_v29_14 WHERE COALESCE(NULLIF(UPPER(iso_a3),'-'),NULLIF(UPPER(adm0_a3),'-'))=$1 LIMIT 1"
   : "SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Force2D(geom),0.03))::json AS geometry FROM ne_admin1_states_v29_14 WHERE gid_1=$1 OR adm1_code=$1 LIMIT 1";
  const q=await pool.query(sql,[x.geometry_ref.replace(/^country:/,'').replace(/^admin1:/,'')]);
  res.json({node:x,geometry:q.rows[0]?.geometry||null,source:x.source_dataset,available:true});
 }catch(e){res.status(500).json({error:e.message})}
});

v30Router.get('/v32/globe/:nodeKey/render-profile',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,node_type,name,hemisphere,climate_keys FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const x=n.rows[0];
  const p=await pool.query("SELECT * FROM v32_globe_render_profiles WHERE node_type=$1",[x.node_type]);
  if(!p.rows[0])return res.status(404).json({error:'render_profile_not_found'});
  res.json({node:x,renderProfile:p.rows[0],navigation:'progressive'});
 }catch(e){res.status(500).json({error:e.message})}
});

v30Router.get('/v32/globe/:nodeKey/climate',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,name,hemisphere,climate_keys FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const x=n.rows[0],q=await pool.query("SELECT w.* FROM v32_seasonal_windows w WHERE w.climate_key=ANY($1::text[]) AND w.hemisphere IN ($2,'equatorial') ORDER BY w.climate_key,w.season_key",[x.climate_keys,x.hemisphere]);
  res.json({node:x,seasons:q.rows,hemisphere:x.hemisphere});
 }catch(e){res.status(500).json({error:e.message})}
});

v30Router.get('/v32/globe/:nodeKey/travel-components',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,name FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const q=await pool.query("SELECT o.id,o.title,o.description,o.offer_type,o.price_amount,o.currency,o.booking_mode,o.territory_key,p.name professional_name,p.verified FROM v31_pro_offers o JOIN v30_pro_profiles p ON p.id=o.professional_id WHERE o.status='published' AND (o.territory_key=$1 OR o.territory_key IN (SELECT node_key FROM v32_geo_nodes WHERE parent_key=$1)) ORDER BY p.verified DESC,o.updated_at DESC LIMIT 60",[req.params.nodeKey]);
  const groups={transport:[],accommodation:[],experiences:[]};
  for(const row of q.rows){const t=String(row.offer_type||'').toLowerCase();const key=t.includes('transport')||t.includes('transfert')||t.includes('mobil')?'transport':t.includes('accommodation')||t.includes('hébergement')||t.includes('hotel')||t.includes('lodging')?'accommodation':'experiences';groups[key].push(row);}
  res.json({node:n.rows[0],components:groups,travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/globe/:nodeKey/health-safety',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,name FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const q=await pool.query("SELECT id,service_type,name,description,latitude,longitude,public_contact FROM v30_health_safety_points WHERE territory_key=$1 AND active=true ORDER BY service_type,name",[req.params.nodeKey]);
  const counts=q.rows.reduce((a,x)=>(a[x.service_type]=(a[x.service_type]||0)+1,a),{});
  res.json({node:n.rows[0],points:q.rows,counts,privacy:'public_service_data_only'});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/globe/:nodeKey/offers',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,name,climate_keys,hemisphere FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const tag=(req.query.tag||'').trim();
  const params=[req.params.nodeKey];
  let filter="o.status='published' AND (o.territory_key=$1 OR o.territory_key IN (SELECT node_key FROM v32_geo_nodes WHERE parent_key=$1))";
  if(tag){params.push(tag);filter+=" AND ($2=ANY(o.specialties) OR $2=ANY(o.audiences))";}
  const q=await pool.query(`SELECT o.id,o.title,o.description,o.offer_type,o.territory_key,o.price_amount,o.currency,o.booking_mode,o.specialties,o.audiences,p.name professional_name,p.verified,p.pro_type
   FROM v31_pro_offers o JOIN v30_pro_profiles p ON p.id=o.professional_id
   WHERE ${filter} ORDER BY p.verified DESC,o.updated_at DESC LIMIT 30`,params);
  res.json({node:n.rows[0],tag:tag||null,offers:q.rows,travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.post('/v32/trip-draft/:draftId/select-scenario',async(req,res)=>{
 try{
  const key=req.body?.scenarioKey;
  if(!['comfort','balanced','discovery'].includes(key))return res.status(400).json({error:'invalid_scenario'});
  const d=await pool.query("SELECT id FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const s=await pool.query("INSERT INTO v32_trip_scenario_selections(trip_draft_id,scenario_key,metadata) VALUES($1,$2,$3) RETURNING *",[d.rows[0].id,key,JSON.stringify({source:'globe',decision:'traveler_selected'})]);
  const active=await pool.query("UPDATE v30_trip_drafts SET active_scenario_key=$1,updated_at=now() WHERE id=$2 RETURNING id,active_scenario_key",[key,d.rows[0].id]);
  res.status(201).json({selection:s.rows[0],activeScenario:active.rows[0],travelerDecides:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/scenarios',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,territory_key,active_scenario_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0];
  const q=await pool.query("SELECT o.id,o.title,o.offer_type,o.price_amount,o.currency,o.booking_mode,o.specialties,o.audiences,p.name professional_name,p.verified FROM v31_pro_offers o JOIN v30_pro_profiles p ON p.id=o.professional_id WHERE o.status='published' AND (o.territory_key=$1 OR o.territory_key IN (SELECT node_key FROM v32_geo_nodes WHERE parent_key=$1)) ORDER BY p.verified DESC,o.updated_at DESC LIMIT 60",[x.territory_key]);
  const scenarios=[
   {key:'comfort',name:'Confort',description:'Privilégie la qualité, la simplicité et les solutions vérifiées.'},
   {key:'balanced',name:'Équilibre',description:'Cherche un compromis entre confort, diversité et maîtrise du coût.'},
   {key:'discovery',name:'Découverte',description:'Privilégie la diversité des expériences et l’exploration du territoire.'}
  ];
  for(const s of scenarios){const offers=s.key==='comfort'?q.rows.filter(o=>o.verified).slice(0,8):s.key==='discovery'?q.rows.slice(0,12):q.rows.slice(0,10);s.candidates=offers.map(o=>({offerId:o.id,title:o.title,type:o.offer_type,professional:o.professional_name,verified:o.verified,price:o.price_amount,currency:o.currency,bookingMode:o.booking_mode}));}
  res.json({tripDraftId:x.id,scenarios,travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.post('/v32/trip-draft/:draftId/recalculate',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,active_scenario_key,territory_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0];
  const present=[Boolean(x.transport&&Object.keys(x.transport).length),Boolean(x.accommodation&&Object.keys(x.accommodation).length),Array.isArray(x.experiences)&&x.experiences.length>0,Array.isArray(x.health_safety)&&x.health_safety.length>0];
  const score=Math.round(present.filter(Boolean).length/4*100);
  res.json({tripDraftId:x.id,activeScenario:x.active_scenario_key,score,changedAt:new Date().toISOString(),recalculated:true,travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/optimization',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,active_scenario_key,territory_key,transport,accommodation,experiences,health_safety FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0];
  const p=await pool.query("SELECT p.age_group,p.mobility_level,p.party_type,p.budget_level,p.pace,p.duration_days,p.preferences,p.constraints FROM v30_traveler_profiles p JOIN v30_trip_drafts t ON t.session_id=p.session_id WHERE t.id=$1",[x.id]);
  const profile=p.rows[0]||{};
  const dimensions=[
   {key:'profile',label:'Profil voyageur',weight:20,score:(profile.age_group||profile.mobility_level||profile.party_type)?100:40},
   {key:'climate',label:'Climat et saison',weight:20,score:x.territory_key?100:0},
   {key:'cost',label:'Budget / coût',weight:15,score:profile.budget_level?70:40},
   {key:'duration',label:'Durée',weight:10,score:profile.duration_days?70:40},
   {key:'comfort',label:'Confort / rythme',weight:10,score:profile.pace?70:40},
   {key:'composition',label:'Composition du voyage',weight:15,score:Math.round([x.transport,x.accommodation,Array.isArray(x.experiences)&&x.experiences.length].filter(Boolean).length/3*100)},
   {key:'healthSafety',label:'Santé & Sécurité',weight:10,score:Array.isArray(x.health_safety)&&x.health_safety.length?100:0}
  ];
  const scenarioWeights={comfort:{profile:25,climate:15,cost:10,duration:10,comfort:20,composition:10,healthSafety:10},balanced:{profile:20,climate:20,cost:15,duration:10,comfort:10,composition:15,healthSafety:10},discovery:{profile:15,climate:20,cost:10,duration:10,comfort:5,composition:25,healthSafety:15}};
  const weights=scenarioWeights[x.active_scenario_key||'balanced'];
  dimensions.forEach(d=>d.weight=weights[d.key]);
  const score=Math.round(dimensions.reduce((s,d)=>s+d.score*d.weight/100,0));
  await pool.query("INSERT INTO v32_trip_optimization_snapshots(trip_draft_id,scenario_key,score,dimensions) VALUES($1,$2,$3,$4)",[x.id,x.active_scenario_key,score,JSON.stringify(dimensions)]);
  res.json({tripDraftId:x.id,activeScenario:x.active_scenario_key,score,dimensions,profileSummary:{ageGroup:profile.age_group,mobility:profile.mobility_level,partyType:profile.party_type,budget:profile.budget_level,pace:profile.pace,durationDays:profile.duration_days},travelerDecides:true,proposalOnly:true,automaticBooking:false});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/decision-brief',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,title,territory_key,active_scenario_key FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0])return res.status(404).json({error:'trip_draft_not_found'});
  const x=d.rows[0];
  const p=await pool.query("SELECT p.traveler_type,p.age_group,p.mobility_level,p.party_type,p.party_size,p.budget_level,p.pace,p.duration_days,p.preferences,p.constraints FROM v30_traveler_profiles p JOIN v30_trip_drafts t ON t.session_id=p.session_id WHERE t.id=$1",[x.id]);
  const profile=p.rows[0]||null;
  const t=await pool.query("SELECT climate_zone,hemisphere,name FROM v30_territories WHERE territory_key=$1",[x.territory_key]);
  if(!t.rows[0])return res.status(400).json({error:'territory_required'});
  const rules=await pool.query("SELECT tourism_tag,preferred_months,weight,rationale_fr FROM v30_tourism_climate_rules WHERE climate_key=$1 AND hemisphere=$2 ORDER BY weight DESC",[t.rows[0].climate_zone,t.rows[0].hemisphere]);
  const months=[...new Set(rules.rows.flatMap(r=>r.preferred_months||[]))].sort((a,b)=>a-b);
  const signals=[];
  if(profile?.budget_level)signals.push({key:'budget',label:'Budget à confronter aux prix réels des offres sélectionnées',priority:'medium'});
  if(profile?.duration_days)signals.push({key:'duration',label:'Durée à confronter aux disponibilités et au nombre d’expériences',priority:'medium'});
  if(profile?.pace)signals.push({key:'pace',label:'Rythme à confronter au programme choisi',priority:'medium'});
  if(profile?.preferences?.length)signals.push({key:'preferences',label:'Préférences à confronter aux spécialités des offres',priority:'medium'});
  res.json({tripDraft:x,activeScenario:x.active_scenario_key,territory:t.rows[0],travelerProfile:profile,recommendedMonths:months,travelRationales:rules.rows.slice(0,8),decisionSignals:signals,decisionBoundary:{travelerDecides:true,proposalOnly:true,automaticBooking:false}});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/trip-draft/:draftId/recommended-dates',async(req,res)=>{
 try{
  const d=await pool.query("SELECT id,territory_key FROM v30_trip_drafts WHERE id=$1",[req.params.draftId]);
  if(!d.rows[0]||!d.rows[0].territory_key)return res.status(400).json({error:'territory_required'});
  const t=await pool.query("SELECT climate_zone,hemisphere FROM v30_territories WHERE territory_key=$1",[d.rows[0].territory_key]);
  if(!t.rows[0])return res.status(404).json({error:'territory_not_found'});
  const q=await pool.query("SELECT month_start,month_end,season_fr,tourism_context FROM v30_climate_seasons WHERE climate_key=$1 AND hemisphere=$2 ORDER BY month_start",[t.rows[0].climate_zone,t.rows[0].hemisphere]);
  const rules=await pool.query("SELECT tourism_tag,preferred_months,weight,rationale_fr FROM v30_tourism_climate_rules WHERE climate_key=$1 AND hemisphere=$2 ORDER BY weight DESC",[t.rows[0].climate_zone,t.rows[0].hemisphere]);
  const months=[...new Set(rules.rows.flatMap(r=>r.preferred_months||[]))].sort((a,b)=>a-b);
  res.json({territoryKey:d.rows[0].territory_key,climate:t.rows[0].climate_zone,hemisphere:t.rows[0].hemisphere,seasonWindows:q.rows,recommendedMonths:months,travelTags:rules.rows.slice(0,12),travelerDecides:true,proposalOnly:true});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/v32/globe/:nodeKey/overview',async(req,res)=>{
 try{
  const n=await pool.query("SELECT node_key,node_type,name,country_iso3,hemisphere,climate_keys,latitude,longitude,metadata FROM v32_geo_nodes WHERE node_key=$1 AND active=true",[req.params.nodeKey]);
  if(!n.rows[0])return res.status(404).json({error:'geo_node_not_found'});
  const x=n.rows[0];
  const seasons=await pool.query("SELECT climate_key,season_key,month_start,month_end,tourism_tags,rationale_fr FROM v32_seasonal_windows WHERE climate_key=ANY($1::text[]) AND hemisphere IN ($2,'equatorial') ORDER BY month_start,climate_key",[x.climate_keys,x.hemisphere]);
  const children=await pool.query("SELECT node_key,node_type,name,hemisphere,climate_keys,latitude,longitude FROM v32_geo_nodes WHERE parent_key=$1 AND active=true ORDER BY node_type,name",[x.node_key]);
  const tags=await pool.query("SELECT DISTINCT tourism_tag FROM v30_tourism_climate_rules WHERE climate_key=ANY($1::text[]) AND hemisphere IN ($2,'equatorial') ORDER BY tourism_tag",[x.climate_keys,x.hemisphere]);
  const month=Number(req.query.month)||new Date().getUTCMonth()+1;
  const seasonalTags=await pool.query("SELECT DISTINCT tourism_tag FROM v30_tourism_climate_rules WHERE climate_key=ANY($1::text[]) AND hemisphere IN ($2,'equatorial') AND $3=ANY(preferred_months) ORDER BY tourism_tag",[x.climate_keys,x.hemisphere,month]);
  res.json({node:x,seasonalWindows:seasons.rows,children:children.rows,tourismTags:tags.rows.map(r=>r.tourism_tag),seasonalTourismTags:seasonalTags.rows.map(r=>r.tourism_tag),month,signals:{climates:x.climate_keys||[],hemisphere:x.hemisphere,childCount:children.rowCount}});
 }catch(e){res.status(500).json({error:e.message})}
});
v30Router.get('/health', (_req, res) => res.json({ ok: true, version: '30.2', router: 'v30-platform' }));
