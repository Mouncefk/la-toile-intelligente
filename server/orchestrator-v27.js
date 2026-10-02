import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://latoile:latoile_dev@localhost:5432/la_toile'
});

export const v27Router = express.Router();

function normalizeIntent(input = {}) {
  const intent = input.intent || {};
  return {
    activity: intent.activity || null,
    travelerProfile: intent.travelerProfile || null,
    companion: intent.companion || null,
    safety: Boolean(intent.safety),
    location: intent.location || null,
    dates: intent.dates || null,
    pace: intent.pace || null
  };
}

function missing(intent) {
  const fields = [];
  if (!intent.activity) fields.push('activity');
  if (!intent.location) fields.push('location');
  if (!intent.dates) fields.push('dates');
  return fields;
}

function ensureConfirmation(confirmed) {
  return confirmed === true;
}

async function getSession(client, sessionId) {
  const q = await client.query(
    'SELECT * FROM experience_sessions_v27 WHERE id=$1',
    [sessionId]
  );
  return q.rows[0] || null;
}

/**
 * V27 — Experience Orchestrator
 *
 * Globe → Country → Intent → Qualification → Territory → Matching
 * → Professional responses → Comparison → Traveler decision → Vault → Journey
 *
 * V27 coordinates existing engines; it does not replace them.
 * Important actions require explicit traveler confirmation.
 */

v27Router.get('/flow', (_req, res) => {
  res.json({
    version: '27.0.0',
    flow: [
      'globe',
      'country',
      'intent',
      'qualification',
      'territory',
      'matching',
      'professional_responses',
      'comparison',
      'traveler_decision',
      'vault',
      'journey'
    ],
    engines: {
      intent: 'v10',
      matching: 'v11',
      professional_responses: 'v12',
      professional_space: 'v13',
      traveler_vault: 'v14',
      journey: 'v15'
    },
    principle: 'traveler_decides'
  });
});

v27Router.post('/session', async (req, res) => {
  const {
    travelerId = null,
    countryIso3 = null,
    rawText = '',
    intent: suppliedIntent = {}
  } = req.body;

  const intent = normalizeIntent({ intent: suppliedIntent });
  const missingFields = missing(intent);

  if (!rawText.trim() && !Object.values(intent).some(Boolean)) {
    return res.status(400).json({ error: 'rawText_or_intent_required' });
  }

  try {
    const q = await pool.query(
      `INSERT INTO experience_sessions_v27
       (traveler_id,country_iso3,stage,raw_text,intent,next_step)
       VALUES($1,$2,'intent',$3,$4,$5)
       RETURNING *`,
      [
        travelerId,
        countryIso3,
        rawText,
        intent,
        missingFields.length ? 'qualification' : 'territory'
      ]
    );

    res.status(201).json({
      session: q.rows[0],
      missingFields,
      next: missingFields.length ? 'qualification' : 'territory'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.patch('/session/:id/qualify', async (req, res) => {
  const sessionId = Number(req.params.id);
  const intent = normalizeIntent(req.body);
  const missingFields = missing(intent);

  try {
    const q = await pool.query(
      `UPDATE experience_sessions_v27
       SET stage=$1,intent=$2,next_step=$3,updated_at=now()
       WHERE id=$4
       RETURNING *`,
      [
        missingFields.length ? 'qualification' : 'territory',
        intent,
        missingFields.length ? 'qualification' : 'territory',
        sessionId
      ]
    );

    if (!q.rows[0]) return res.status(404).json({ error: 'session_not_found' });

    res.json({
      session: q.rows[0],
      missingFields,
      qualified: missingFields.length === 0
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.post('/session/:id/request', async (req, res) => {
  const sessionId = Number(req.params.id);
  const {
    countryId = null,
    travelerId = null,
    rawText = null,
    intent: suppliedIntent = null
  } = req.body;

  const client = await pool.connect();
  try {
    const session = await getSession(client, sessionId);
    if (!session) return res.status(404).json({ error: 'session_not_found' });

    const intent = normalizeIntent({
      intent: suppliedIntent || session.intent
    });
    const requestText = (rawText || session.raw_text || '').trim();
    if (!requestText) return res.status(400).json({ error: 'rawText_required' });

    const missingFields = missing(intent);
    if (missingFields.length) {
      return res.status(400).json({
        error: 'qualification_incomplete',
        missingFields,
        next: 'qualification'
      });
    }

    const q = await client.query(
      `INSERT INTO traveler_requests_v12
       (country_id,traveler_id,raw_text,intent,status)
       VALUES($1,$2,$3,$4,'qualified')
       RETURNING *`,
      [countryId, travelerId ?? session.traveler_id, requestText, intent]
    );

    await client.query(
      `UPDATE experience_sessions_v27
       SET request_id=$1,stage='territory',next_step='matching',updated_at=now()
       WHERE id=$2`,
      [q.rows[0].id, sessionId]
    );

    res.status(201).json({
      request: q.rows[0],
      sessionId,
      next: 'matching'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

v27Router.post('/request/:id/match', async (req, res) => {
  const requestId = Number(req.params.id);
  const {
    lat,
    lon,
    radiusKm = 100,
    serviceKey = null,
    intent: suppliedIntent = null
  } = req.body;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
    return res.status(400).json({ error: 'lat_lon_required' });
  }

  try {
    const requestQ = await pool.query(
      'SELECT * FROM traveler_requests_v12 WHERE id=$1',
      [requestId]
    );
    const request = requestQ.rows[0];
    if (!request) return res.status(404).json({ error: 'request_not_found' });

    const intent = normalizeIntent({
      intent: suppliedIntent || request.intent
    });

    const matchesQ = await pool.query(
      `SELECT * FROM match_professionals_v11($1,$2,$3,$4)`,
      [Number(lat), Number(lon), Number(radiusKm), serviceKey]
    );

    const matches = matchesQ.rows.map((row) => {
      let score = 100;
      const reasons = [];
      const distance = Number(row.distance_km || 0);

      if (distance <= 5) {
        score += 20;
        reasons.push('Très proche');
      } else if (distance <= 20) {
        score += 12;
        reasons.push('À proximité');
      } else if (distance <= 50) {
        score += 5;
        reasons.push('Dans le rayon recherché');
      }

      if (
        intent.safety &&
        row.service_label &&
        /santé|sécurité|médec|pharm|urgence/i.test(row.service_label)
      ) {
        score += 25;
        reasons.push('Santé & Sécurité compatible');
      }

      if (
        intent.activity &&
        row.service_label &&
        row.service_label.toLowerCase().includes(intent.activity.toLowerCase())
      ) {
        score += 20;
        reasons.push('Spécialité compatible');
      }

      return {
        professional_id: row.professional_id,
        distance_km: distance,
        service_label: row.service_label,
        match_score: Math.max(0, Math.min(100, Math.round(score))),
        reasons
      };
    }).sort((a, b) => b.match_score - a.match_score);

    await pool.query(
      'DELETE FROM traveler_match_results_v11 WHERE request_id=$1',
      [requestId]
    );

    for (const match of matches) {
      await pool.query(
        `INSERT INTO traveler_match_results_v11
         (request_id,professional_id,score,reasons,distance_km)
         VALUES($1,$2,$3,$4,$5)`,
        [
          requestId,
          match.professional_id,
          match.match_score,
          JSON.stringify(match.reasons),
          match.distance_km
        ]
      );
    }

    await pool.query(
      `UPDATE traveler_requests_v12
       SET status='matched',updated_at=now()
       WHERE id=$1`,
      [requestId]
    );

    await pool.query(
      `UPDATE experience_sessions_v27
       SET stage='matching',next_step='professional_responses',updated_at=now()
       WHERE request_id=$1`,
      [requestId]
    );

    res.json({
      requestId,
      radiusKm: Number(radiusKm),
      count: matches.length,
      results: matches,
      next: 'professional_responses'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.post('/request/:id/dispatch', async (req, res) => {
  const requestId = Number(req.params.id);
  if (!ensureConfirmation(req.body.confirmed)) {
    return res.status(400).json({
      error: 'explicit_confirmation_required',
      message: 'La diffusion de la demande aux professionnels doit être confirmée par le voyageur.'
    });
  }

  try {
    const radiusKm = Number(req.body.radiusKm || 100);
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      return res.status(400).json({ error: 'valid_radiusKm_required' });
    }

    const requestQ = await pool.query(
      'SELECT id FROM traveler_requests_v12 WHERE id=$1',
      [requestId]
    );
    if (!requestQ.rows[0]) {
      return res.status(404).json({ error: 'request_not_found' });
    }

    const q = await pool.query(
      `INSERT INTO request_dispatches_v12
       (request_id,professional_id,match_score,distance_km)
       SELECT m.request_id,m.professional_id,m.score,m.distance_km
       FROM traveler_match_results_v11 m
       WHERE m.request_id=$1
         AND m.distance_km <= $2
       ON CONFLICT (request_id,professional_id) DO NOTHING`,
      [requestId, radiusKm]
    );

    await pool.query(
      `UPDATE traveler_requests_v12
       SET status='dispatched',updated_at=now()
       WHERE id=$1`,
      [requestId]
    );

    await pool.query(
      `UPDATE experience_sessions_v27
       SET stage='professional_responses',next_step='comparison',updated_at=now()
       WHERE request_id=$1`,
      [requestId]
    );

    res.json({
      requestId,
      dispatched: q.rowCount,
      confirmed: true,
      next: 'professional_responses'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.get('/request/:id/responses', async (req, res) => {
  const requestId = Number(req.params.id);

  try {
    const q = await pool.query(
      `SELECT r.*, p.name AS professional_name,
              d.match_score, d.distance_km, d.status AS dispatch_status
       FROM professional_responses_v12 r
       JOIN request_dispatches_v12 d ON d.id=r.dispatch_id
       JOIN professionals p ON p.id=r.professional_id
       WHERE d.request_id=$1
       ORDER BY d.match_score DESC,r.created_at DESC`,
      [requestId]
    );

    await pool.query(
      `UPDATE experience_sessions_v27
       SET stage='comparison',next_step='traveler_decision',updated_at=now()
       WHERE request_id=$1`,
      [requestId]
    );

    res.json({
      requestId,
      count: q.rowCount,
      responses: q.rows,
      principle: 'La Toile organise et présente; le voyageur décide.'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.post('/request/:id/compare', async (req, res) => {
  const requestId = Number(req.params.id);
  const { travelerId = null, responseIds = [] } = req.body;

  if (!Array.isArray(responseIds) || responseIds.length === 0) {
    return res.status(400).json({ error: 'responseIds_required' });
  }

  const normalizedResponseIds = responseIds.map(Number);
  if (
    normalizedResponseIds.some((id) => !Number.isInteger(id) || id <= 0) ||
    new Set(normalizedResponseIds).size !== normalizedResponseIds.length
  ) {
    return res.status(400).json({ error: 'invalid_responseIds' });
  }

  try {
    const valid = await pool.query(
      `SELECT r.id
       FROM professional_responses_v12 r
       JOIN request_dispatches_v12 d ON d.id=r.dispatch_id
       WHERE d.request_id=$1 AND r.id = ANY($2::bigint[])`,
      [requestId, normalizedResponseIds]
    );
    if (valid.rowCount !== normalizedResponseIds.length) {
      return res.status(400).json({ error: 'response_not_in_request' });
    }

    const q = await pool.query(
      `INSERT INTO response_comparisons_v12
       (request_id,traveler_id,compared_response_ids)
       VALUES($1,$2,$3)
       RETURNING *`,
      [requestId, travelerId, normalizedResponseIds]
    );

    await pool.query(
      `UPDATE experience_sessions_v27
       SET stage='comparison',next_step='traveler_decision',updated_at=now()
       WHERE request_id=$1`,
      [requestId]
    );

    res.status(201).json({
      comparison: q.rows[0],
      next: 'traveler_decision'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

v27Router.post('/request/:id/decision', async (req, res) => {
  const requestId = Number(req.params.id);
  const {
    sessionId,
    travelerId = null,
    responseId = null,
    decision = 'selected',
    confirmed = false,
    metadata = {}
  } = req.body;

  if (!ensureConfirmation(confirmed)) {
    return res.status(400).json({
      error: 'explicit_confirmation_required',
      message: 'La décision finale doit être explicitement confirmée par le voyageur.'
    });
  }
  if (decision === 'selected' && !responseId) {
    return res.status(400).json({ error: 'responseId_required_for_selection' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const session = await getSession(client, sessionId);
    if (!session || Number(session.request_id) !== requestId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'session_request_mismatch'
      });
    }

    if (!['comparison', 'traveler_decision'].includes(session.stage)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'comparison_required'
      });
    }

    if (responseId) {
      const valid = await client.query(
        `SELECT r.id
         FROM professional_responses_v12 r
         JOIN request_dispatches_v12 d ON d.id=r.dispatch_id
         WHERE r.id=$1 AND d.request_id=$2`,
        [responseId, requestId]
      );
      if (!valid.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'response_not_in_request' });
      }
    }

    const q = await client.query(
      `INSERT INTO experience_decisions_v27
       (session_id,traveler_id,request_id,response_id,decision,confirmed,metadata)
       VALUES($1,$2,$3,$4,$5,true,$6)
       RETURNING *`,
      [sessionId, travelerId ?? session.traveler_id, requestId, responseId, decision, metadata]
    );

    await client.query(
      `UPDATE response_comparisons_v12
       SET selected_response_id=$1
       WHERE request_id=$2
         AND id=(SELECT id FROM response_comparisons_v12
                 WHERE request_id=$2 ORDER BY created_at DESC LIMIT 1)`,
      [responseId, requestId]
    );

    await client.query(
      `UPDATE traveler_requests_v12
       SET status='traveler_decided',updated_at=now()
       WHERE id=$1`,
      [requestId]
    );

    await client.query(
      `UPDATE experience_sessions_v27
       SET stage='traveler_decision',next_step='vault',updated_at=now()
       WHERE id=$1`,
      [sessionId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      decision: q.rows[0],
      next: 'vault',
      reservationCreated: false
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

v27Router.post('/session/:id/handoff', async (req, res) => {
  const sessionId = Number(req.params.id);
  const {
    travelerId = null,
    createVaultItem = true,
    createTrip = false,
    tripTitle = null,
    countryIso3 = null,
    confirmed = false
  } = req.body;

  if (!ensureConfirmation(confirmed)) {
    return res.status(400).json({
      error: 'explicit_confirmation_required',
      message: 'Le passage vers le coffre ou le voyage doit être confirmé par le voyageur.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const session = await getSession(client, sessionId);
    if (!session) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'session_not_found' });
    }

    if (session.stage !== 'traveler_decision') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'traveler_decision_required' });
    }

    const effectiveTravelerId = travelerId ?? session.traveler_id;
    if (!effectiveTravelerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'travelerId_required_for_handoff' });
    }

    const decisionCheck = await client.query(
      `SELECT id
       FROM experience_decisions_v27
       WHERE session_id=$1 AND request_id=$2 AND confirmed=true
       ORDER BY created_at DESC
       LIMIT 1`,
      [sessionId, session.request_id]
    );
    if (!decisionCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'journey_handoff_not_ready' });
    }

    if (createVaultItem) {
      await client.query(
        `INSERT INTO traveler_vault_items_v14
         (traveler_id,item_type,title,summary,country_iso3,metadata,is_private)
         VALUES($1,'request',$2,$3,$4,$5,true)`,
        [
          effectiveTravelerId,
          'Demande La Toile',
          session.raw_text || 'Demande validée',
          countryIso3 || session.country_iso3,
          JSON.stringify({
            experienceSessionId: sessionId,
            requestId: session.request_id
          })
        ]
      );
    }

    let trip = null;
    if (createTrip) {
      if (!tripTitle?.trim()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'tripTitle_required' });
      }

      const q = await client.query(
        `INSERT INTO traveler_trips_v15
         (traveler_id,title,country_iso3,status,metadata)
         VALUES($1,$2,$3,'planning',$4)
         RETURNING *`,
        [
          effectiveTravelerId,
          tripTitle,
          countryIso3 || session.country_iso3,
          JSON.stringify({
            experienceSessionId: sessionId,
            requestId: session.request_id
          })
        ]
      );
      trip = q.rows[0];
    }

    await client.query(
      `UPDATE experience_sessions_v27
       SET stage='journey',next_step='completed',updated_at=now()
       WHERE id=$1`,
      [sessionId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      sessionId,
      confirmed: true,
      vaultUpdated: createVaultItem,
      tripCreated: Boolean(trip),
      trip,
      reservationCreated: false,
      next: 'completed'
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export async function closeV27Pool() {
  await pool.end();
}
