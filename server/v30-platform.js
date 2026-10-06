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
  res.json({ territory: territory.rows[0], solutions: solutions.rows, healthSafety: health.rows });
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
  const values = allowed.map(key => req.body[key] ?? null);
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
  if(!territoryKey||!tag) return res.status(400).json({error:'territoryKey_and_tag_required'});
  try {
    const t=await pool.query('SELECT territory_key,name_fr,climate_zone,hemisphere FROM v30_territories WHERE territory_key=$1 AND active=true',[territoryKey]);
    if(!t.rows[0]) return res.status(404).json({error:'territory_not_found'});
    const territory=t.rows[0];
    const months=[];
    for(let offset=0;offset<Math.min(duration,12);offset++) months.push(((startMonth-1+offset)%12)+1);
    const rule=await pool.query('SELECT preferred_months,weight,rationale_fr FROM v30_tourism_climate_rules WHERE tourism_tag=$1 AND climate_key=$2 AND hemisphere=$3',[tag,String(territory.climate_zone||'').toLowerCase(),territory.hemisphere]);
    const preferred=rule.rows[0]?.preferred_months||[];
    const results=months.map(month=>({
      month,
      favorable:preferred.includes(month),
      score:preferred.length?(preferred.includes(month)?100:60):50,
      rationale:rule.rows[0]?.rationale_fr||'Aucune règle climatique spécifique disponible.'
    }));
    results.sort((a,b)=>b.score-a.score||a.month-b.month);
    res.json({territory,durationDays:duration,startMonth,windows:results});
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
      score += inSeason ? 15 : -5;
      reasons.push(inSeason ? 'Saison climatique favorable' : 'Hors saison optimale');
    }
    if (intent.safety && safetyTypes.size) { score += 8; reasons.push('Santé & Sécurité disponible'); }
    if (safetyTypes.has('medicine') && safetyTypes.has('pharmacy') && safetyTypes.has('security')) { score += 5; reasons.push('Couverture Santé & Sécurité complète'); }
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
    score = Math.max(0, Math.min(100, score));
    return { ...solution, compatibilityScore: score, matchReasons: reasons };
  }).sort((a,b) => b.compatibilityScore-a.compatibilityScore || a.title.localeCompare(b.title));

  for (const solution of scored) {
    await pool.query(
      'INSERT INTO v30_matches(session_id,solution_id,score,reasons) VALUES($1,$2,$3,$4) ON CONFLICT(session_id,solution_id) DO UPDATE SET score=EXCLUDED.score,reasons=EXCLUDED.reasons,created_at=now()',
      [req.params.id, solution.id, solution.compatibilityScore, JSON.stringify(solution.matchReasons)]
    );
  }

  res.json({
    solutions: scored,
    context: { territory, month, climate, hemisphere, climateRule, observedConditions: observed },
    healthSafety: { available: safetyTypes.size > 0, serviceTypes: [...safetyTypes] },
    next: 'health_safety'
  });
});

v30Router.get('/session/:id/compare', async (req, res) => {
  const session = await safeQuery(res, 'SELECT * FROM v30_traveler_sessions WHERE id=$1', [req.params.id]);
  if (!session) return;
  if (!session.rows[0]) return res.status(404).json({ error: 'session_not_found' });
  const selected = String(req.query.ids || '').split(',').map(Number).filter(Number.isInteger);
  const limit = selected.length ? 20 : 5;
  const sql = selected.length
    ? 'SELECT * FROM v30_matches WHERE session_id=$1 AND solution_id=ANY($2::bigint[]) ORDER BY score DESC'
    : 'SELECT * FROM v30_matches WHERE session_id=$1 ORDER BY score DESC LIMIT $2';
  const params = selected.length ? [req.params.id, selected] : [req.params.id, limit];
  const matches = await safeQuery(res, sql, params);
  if (!matches) return;
  const ids = matches.rows.map(x => x.solution_id);
  if (!ids.length) return res.json({ sessionId: Number(req.params.id), comparisons: [], selectionRequired: true });
  const solutions = await safeQuery(res, 'SELECT * FROM v30_solutions WHERE id=ANY($1::bigint[])', [ids]);
  if (!solutions) return;
  const byId = new Map(solutions.rows.map(x => [Number(x.id), x]));
  const comparisons = matches.rows.map(m => ({ ...m, solution: byId.get(Number(m.solution_id)) || null }));
  res.json({ sessionId: Number(req.params.id), comparisons, selectionRequired: true, maxSelections: 3, next: 'vault' });
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

v30Router.get('/health', (_req, res) => res.json({ ok: true, version: '30.2', router: 'v30-platform' }));
