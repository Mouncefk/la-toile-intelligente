import pg from 'pg';

const { Pool } = pg;
const port = Number(process.env.V28_E2E_TEST_PORT || 4387);
const base = process.env.V28_E2E_BASE_URL || `http://localhost:${port}/api`;
const databaseUrl = process.env.DATABASE_URL || 'postgresql://latoile:latoile_dev@localhost:5432/la_toile';

const pool = new Pool({ connectionString: databaseUrl });
let server;
let travelerId = null;
let otherTravelerId = null;
let sessionId = null;
let recommendationIds = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function call(path, options = {}) {
  const response = await fetch(base + path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(`http://localhost:${port}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('V28.7 E2E server did not start');
}

try {
  const { spawn } = await import('node:child_process');
  server = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: databaseUrl },
    stdio: 'ignore'
  });

  await waitForServer();

  const traveler = await pool.query(
    `INSERT INTO traveler_profiles_v14
      (traveler_id, display_name, preferred_language)
     VALUES ((SELECT COALESCE(MAX(traveler_id),0)+1 FROM traveler_profiles_v14),
             'V28.7 E2E Test', 'fr')
     RETURNING traveler_id`
  );
  travelerId = traveler.rows[0].traveler_id;

  const otherTraveler = await pool.query(
    `INSERT INTO traveler_profiles_v14
      (traveler_id, display_name, preferred_language)
     VALUES ((SELECT COALESCE(MAX(traveler_id),0)+1 FROM traveler_profiles_v14),
             'V28.7 E2E Other', 'fr')
     RETURNING traveler_id`
  );
  otherTravelerId = otherTraveler.rows[0].traveler_id;

  await pool.query(
    `INSERT INTO traveler_vault_items_v14
      (traveler_id,item_type,title,summary,country_iso3,metadata)
     VALUES ($1,'memory','Artisanat à Marrakech','Expérience précédente','MAR',$2)`,
    [travelerId, JSON.stringify({ experience: 'Artisanat', activity: 'Artisanat' })]
  );

  await pool.query(
    `INSERT INTO traveler_health_v14
      (traveler_id,allergies,blood_type,important_treatments)
     VALUES ($1,'TEST-HEALTH','O+','TEST-TREATMENT')`,
    [travelerId]
  );

  const recommend = await call('/ai/v21-history/recommend', {
    method: 'POST',
    body: JSON.stringify({
      travelerId,
      intent: {
        activity: 'Artisanat',
        location: 'Marrakech',
        dates: 'Octobre 2026'
      }
    })
  });

  assert(recommend.response.status === 200, `recommend failed: ${JSON.stringify(recommend.body)}`);
  assert(Number(recommend.body.travelerId) === Number(travelerId), 'Wrong travelerId');
  assert(recommend.body.version === '28.7', 'Wrong V28.7 version');
  assert(recommend.body.principle === 'assist_not_decide', 'Assist-not-decide principle missing');
  assert(recommend.body.context?.constraints?.healthExcluded === true, 'Health exclusion missing');
  assert(!JSON.stringify(recommend.body.context).includes('TEST-HEALTH'), 'Health data leaked into recommendation context');
  assert(!JSON.stringify(recommend.body.context).includes('TEST-TREATMENT'), 'Health treatment leaked into recommendation context');
  assert(Number(recommend.body.sessionId) > 0, 'sessionId missing');
  assert(Array.isArray(recommend.body.recommendations) && recommend.body.recommendations.length >= 1, 'No recommendations returned');

  sessionId = Number(recommend.body.sessionId);
  recommendationIds = recommend.body.recommendations.map((r) => Number(r.id)).filter(Number.isInteger);
  assert(recommendationIds.length >= 0, 'Recommendation response malformed');

  const persisted = await pool.query(
    `SELECT s.id AS session_id,s.actor_id,r.id,r.recommendation_type,r.status
       FROM ai_recommendation_sessions_v21 s
       JOIN ai_recommendations_v21 r ON r.session_id=s.id
      WHERE s.id=$1
      ORDER BY r.id`,
    [sessionId]
  );
  assert(persisted.rows.length === recommend.body.recommendations.length, 'Persisted recommendation count mismatch');
  assert(persisted.rows.every((row) => Number(row.actor_id) === Number(travelerId)), 'Session owner mismatch');
  recommendationIds = persisted.rows.map((row) => Number(row.id));

  const listed = await call(`/ai/v21/sessions/${sessionId}/recommendations`);
  assert(listed.response.status === 200, `list failed: ${JSON.stringify(listed.body)}`);
  assert(listed.body.recommendations.length === recommendationIds.length, 'GET recommendation count mismatch');

  const recommendationId = recommendationIds[0];

  const feedback = await call(`/ai/v21/recommendations/${recommendationId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({
      travelerId,
      feedback: 'utile',
      reason: 'V28.7 E2E test'
    })
  });
  assert(feedback.response.status === 201, `feedback failed: ${JSON.stringify(feedback.body)}`);
  assert(Number(feedback.body.recommendationId) === recommendationId, 'Feedback recommendation mismatch');

  const feedbackRow = await pool.query(
    `SELECT recommendation_id,actor_type,actor_id,feedback,reason
       FROM ai_feedback_v21
      WHERE id=$1`,
    [feedback.body.feedbackId]
  );
  assert(feedbackRow.rows[0], 'Feedback was not persisted');
  assert(Number(feedbackRow.rows[0].actor_id) === Number(travelerId), 'Feedback actor mismatch');

  const wrongOwner = await call(`/ai/v21/recommendations/${recommendationId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ travelerId: otherTravelerId, decision: 'accepted' })
  });
  assert(wrongOwner.response.status === 403, 'Wrong traveler was allowed to decide');

  const decision = await call(`/ai/v21/recommendations/${recommendationId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ travelerId, decision: 'accepted' })
  });
  assert(decision.response.status === 200, `decision failed: ${JSON.stringify(decision.body)}`);
  assert(decision.body.status === 'accepted', 'Decision status mismatch');

  const finalRow = await pool.query(
    `SELECT status FROM ai_recommendations_v21 WHERE id=$1`,
    [recommendationId]
  );
  assert(finalRow.rows[0]?.status === 'accepted', 'Decision was not persisted');

  const healthCount = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM ai_recommendation_sessions_v21
      WHERE id=$1
        AND context::text LIKE '%TEST-HEALTH%'`,
    [sessionId]
  );
  assert(healthCount.rows[0].n === 0, 'Sensitive health data persisted in recommendation session');

  console.log(JSON.stringify({
    passed: true,
    sessionId,
    travelerId,
    recommendationIds,
    feedbackId: Number(feedback.body.feedbackId),
    decision: finalRow.rows[0].status,
    healthExcluded: true
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (travelerId) {
    await pool.query('DELETE FROM ai_feedback_v21 WHERE recommendation_id IN (SELECT id FROM ai_recommendations_v21 WHERE session_id IN (SELECT id FROM ai_recommendation_sessions_v21 WHERE actor_id=$1))', [travelerId]);
    await pool.query('DELETE FROM ai_recommendations_v21 WHERE session_id IN (SELECT id FROM ai_recommendation_sessions_v21 WHERE actor_id=$1)', [travelerId]);
    await pool.query('DELETE FROM ai_recommendation_sessions_v21 WHERE actor_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_health_v14 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_vault_items_v14 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_profiles_v14 WHERE traveler_id=$1', [travelerId]);
  }
  if (otherTravelerId) {
    await pool.query('DELETE FROM traveler_profiles_v14 WHERE traveler_id=$1', [otherTravelerId]);
  }
  if (server) server.kill('SIGTERM');
  await pool.end();
}
