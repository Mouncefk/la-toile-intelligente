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

v30Router.get('/globe/hierarchy', async (_req, res) => {
  const q = await safeQuery(res, 'SELECT node_key,parent_key,node_type,name_fr,country_iso3,hemisphere,climate_zones,latitude,longitude FROM v30_geography_nodes WHERE active=true ORDER BY node_type,name_fr');
  if (q) res.json({ root: 'WORLD', nodes: q.rows });
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
    'INSERT INTO v30_traveler_profiles(session_id,traveler_type,age_group,mobility_level,party_type,party_size,children_ages,budget_level,pace,duration_days,accessibility_needs,preferences,constraints) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(session_id) DO UPDATE SET updated_at=now() RETURNING *',
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

v30Router.get('/session/:id/solutions', async (req, res) => {
  const session = await safeQuery(res, 'SELECT * FROM v30_traveler_sessions WHERE id=$1', [req.params.id]);
  if (!session) return;
  if (!session.rows[0]) return res.status(404).json({ error: 'session_not_found' });
  const key = session.rows[0].territory_key;
  const q = await safeQuery(res, 'SELECT * FROM v30_solutions WHERE territory_key=$1 AND active=true ORDER BY solution_type,title', [key]);
  if (q) res.json({ solutions: q.rows, next: 'health_safety' });
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
  let sql = 'SELECT s.*,sp.name source_name,tp.name target_name FROM v30_pro_opportunity_signals s LEFT JOIN v30_pro_profiles sp ON sp.id=s.source_pro_id LEFT JOIN v30_pro_profiles tp ON tp.id=s.target_pro_id WHERE s.status=\\'suggested\\'';
  if (req.query.territoryKey) { params.push(req.query.territoryKey); sql += ' AND s.territory_key=
 + params.length; }
  sql += ' ORDER BY s.score DESC,s.created_at DESC LIMIT 20';
  const q = await safeQuery(res, sql, params);
  if (q) res.json({ signals: q.rows });
});

v30Router.get('/health', (_req, res) => res.json({ ok: true, version: '30.2', router: 'v30-platform' }));
