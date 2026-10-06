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
