import pg from 'pg';

const { Pool } = pg;
const port = Number(process.env.V27_API_TEST_PORT || 4377);
const base = process.env.V27_BASE_URL || `http://localhost:${port}/api/experience/v27`;
const apiRoot = process.env.V27_API_ROOT || `http://localhost:${port}/api`;
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://latoile:latoile_dev@localhost:5432/la_toile';

const pool = new Pool({ connectionString: databaseUrl });
let server;
let travelerId = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function callRoot(path, options = {}) {
  const response = await fetch(apiRoot + path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
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
  for (let i = 0; i < 30; i += 1) {
    try {
      const r = await fetch(`http://localhost:${port}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('V27 API server did not start');
}

try {
  const { spawn } = await import('node:child_process');
  server = spawn(process.execPath, ['server/index-v27.js'], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: databaseUrl },
    stdio: 'ignore'
  });

  await waitForServer();

  const flow = await call('/flow');
  assert(flow.response.ok, 'GET /flow failed');
  assert(flow.body.engines?.intent === 'v10', 'V10 missing');
  assert(flow.body.engines?.matching === 'v11', 'V11 missing');
  assert(flow.body.engines?.professional_responses === 'v12', 'V12 missing');
  assert(flow.body.engines?.traveler_vault === 'v14', 'V14 missing');
  assert(flow.body.engines?.journey === 'v15', 'V15 missing');

  const traveler = await pool.query(
    `INSERT INTO traveler_profiles_v14
      (traveler_id, display_name, preferred_language)
     VALUES ((SELECT COALESCE(MAX(traveler_id),0)+1 FROM traveler_profiles_v14),
             'V27 API Test', 'fr')
     RETURNING traveler_id`
  );
  travelerId = traveler.rows[0].traveler_id;

  const session = await call('/session', {
    method: 'POST',
    body: JSON.stringify({
      travelerId,
      countryIso3: 'MAR',
      rawText: 'Je cherche une expérience artisanat à Marrakech en octobre 2026.',
      intent: {
        activity: 'Artisanat',
        location: 'Marrakech',
        dates: 'Octobre 2026'
      }
    })
  });
  assert(session.response.status === 201, `session failed: ${JSON.stringify(session.body)}`);
  const sessionId = session.body.session.id;

  const request = await call(`/session/${sessionId}/request`, {
    method: 'POST',
    body: JSON.stringify({
      travelerId,
      rawText: 'Je cherche une expérience artisanat à Marrakech en octobre 2026.',
      intent: {
        activity: 'Artisanat',
        location: 'Marrakech',
        dates: 'Octobre 2026'
      }
    })
  });
  assert(request.response.status === 201, `request failed: ${JSON.stringify(request.body)}`);
  const requestId = request.body.request.id;

  const match = await call(`/request/${requestId}/match`, {
    method: 'POST',
    body: JSON.stringify({
      lat: 31.6295,
      lon: -7.9811,
      radiusKm: 50
    })
  });
  assert(match.response.ok, `match failed: ${JSON.stringify(match.body)}`);
  assert(match.body.count >= 1, 'Expected at least one professional match');
  const professionalId = match.body.results[0].professional_id;

  const dispatch = await call(`/request/${requestId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ confirmed: true, radiusKm: 50 })
  });
  assert(dispatch.response.status === 200, `dispatch failed: ${JSON.stringify(dispatch.body)}`);
  assert(dispatch.body.dispatched >= 1, 'Expected at least one dispatch');

  const dispatchRow = await pool.query(
    `SELECT id FROM request_dispatches_v12
     WHERE request_id=$1 AND professional_id=$2
     ORDER BY id DESC LIMIT 1`,
    [requestId, professionalId]
  );
  assert(dispatchRow.rows[0], 'Dispatch row not found');
  const dispatchId = dispatchRow.rows[0].id;

  const response = await callRoot('/responses/v12', {
    method: 'POST',
    body: JSON.stringify({
      dispatchId,
      professionalId,
      message: 'Réponse professionnelle V27 API test',
      priceAmount: 100,
      currencyCode: 'MAD'
    })
  });
  assert(response.response.status === 201, `professional response failed: ${JSON.stringify(response.body)}`);
  const responseId = response.body.id;

  const responses = await call(`/request/${requestId}/responses`);
  assert(responses.response.ok, `responses failed: ${JSON.stringify(responses.body)}`);
  assert(responses.body.responses.some((r) => Number(r.id) === Number(responseId)), 'Created response not returned');

  const compare = await call(`/request/${requestId}/compare`, {
    method: 'POST',
    body: JSON.stringify({ travelerId, responseIds: [responseId] })
  });
  assert(compare.response.status === 201, `compare failed: ${JSON.stringify(compare.body)}`);

  const decision = await call(`/request/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      travelerId,
      responseId,
      decision: 'selected',
      confirmed: true
    })
  });
  assert(decision.response.status === 201, `decision failed: ${JSON.stringify(decision.body)}`);
  assert(decision.body.reservationCreated === false, 'Decision unexpectedly created reservation');

  const handoff = await call(`/session/${sessionId}/handoff`, {
    method: 'POST',
    body: JSON.stringify({
      travelerId,
      createVaultItem: true,
      createTrip: true,
      tripTitle: 'V27 API Test — Marrakech',
      countryIso3: 'MAR',
      confirmed: true
    })
  });
  assert(handoff.response.status === 201, `handoff failed: ${JSON.stringify(handoff.body)}`);
  assert(handoff.body.vaultUpdated === true, 'Vault was not updated');
  assert(handoff.body.tripCreated === true, 'Trip was not created');
  assert(handoff.body.reservationCreated === false, 'Handoff unexpectedly created reservation');

  const persistedDecision = await pool.query(
    `SELECT response_id FROM experience_decisions_v27
     WHERE session_id=$1 ORDER BY id DESC LIMIT 1`,
    [sessionId]
  );
  assert(Number(persistedDecision.rows[0]?.response_id) === Number(responseId), 'Decision did not persist response_id');

  const vault = await pool.query(
    `SELECT COUNT(*)::int AS n FROM traveler_vault_items_v14 WHERE traveler_id=$1`,
    [travelerId]
  );
  const trips = await pool.query(
    `SELECT COUNT(*)::int AS n FROM traveler_trips_v15 WHERE traveler_id=$1`,
    [travelerId]
  );
  const reservations = await pool.query(
    `SELECT COUNT(*)::int AS n FROM traveler_reservations_v15 WHERE traveler_id=$1`,
    [travelerId]
  );

  assert(vault.rows[0].n >= 1, 'No vault item persisted');
  assert(trips.rows[0].n >= 1, 'No trip persisted');
  assert(reservations.rows[0].n === 0, 'Reservation was created unexpectedly');

  console.log(JSON.stringify({
    passed: true,
    sessionId,
    requestId,
    travelerId,
    professionalId,
    dispatchId,
    responseId,
    vaultItems: vault.rows[0].n,
    trips: trips.rows[0].n,
    reservations: reservations.rows[0].n
  }, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  if (travelerId) {
    await pool.query('DELETE FROM experience_decisions_v27 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM experience_sessions_v27 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_reservations_v15 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_vault_items_v14 WHERE traveler_id=$1', [travelerId]);
    await pool.query('DELETE FROM traveler_profiles_v14 WHERE traveler_id=$1', [travelerId]);
  }
  if (server) server.kill('SIGTERM');
  await pool.end();
}
