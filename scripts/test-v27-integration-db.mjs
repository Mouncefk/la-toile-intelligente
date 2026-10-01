import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://latoile:latoile_dev@localhost:5432/la_toile'
});

const fail = (message) => { throw new Error(message); };
const ok = (condition, message) => condition || fail(message);

try {
  await pool.query('BEGIN');

  const traveler = await pool.query(
    `INSERT INTO traveler_profiles_v14 (traveler_id, display_name, preferred_language)
     VALUES ((SELECT COALESCE(MAX(traveler_id),0)+1 FROM traveler_profiles_v14),
             'V27 Integration Test', 'fr')
     RETURNING traveler_id`
  );
  const travelerId = traveler.rows[0].traveler_id;

  const request = await pool.query(
    `INSERT INTO traveler_requests_v12
      (traveler_id, raw_text, intent, status)
     VALUES ($1,$2,$3,'draft')
     RETURNING id`,
    [travelerId, 'V27 integration test', JSON.stringify({
      country_iso3:'MAR', city:'Marrakech', activity:'artisanat',
      senior:true, health_safety:false
    })]
  );
  const requestId = request.rows[0].id;

  const session = await pool.query(
    `INSERT INTO experience_sessions_v27
      (traveler_id, request_id, stage, raw_text, intent)
     VALUES ($1,$2,'traveler_decision',$3,$4)
     RETURNING id`,
    [travelerId, requestId, 'V27 integration test', JSON.stringify({
      country_iso3:'MAR', city:'Marrakech', activity:'artisanat', senior:true
    })]
  );
  const sessionId = session.rows[0].id;

  const pro = await pool.query(
    `SELECT id FROM professionals WHERE active=true LIMIT 1`
  );
  ok(pro.rows[0], 'No active professional exists for integration test');
  const professionalId = pro.rows[0].id;

  const dispatch = await pool.query(
    `INSERT INTO request_dispatches_v12
      (request_id, professional_id, match_score, distance_km, status)
     VALUES ($1,$2,90,1.2,'sent')
     ON CONFLICT (request_id,professional_id) DO UPDATE
       SET status='sent'
     RETURNING id`,
    [requestId, professionalId]
  );
  const dispatchId = dispatch.rows[0].id;

  const response = await pool.query(
    `INSERT INTO professional_responses_v12
      (dispatch_id, professional_id, message, price_amount, currency_code)
     VALUES ($1,$2,'V27 integration response',100,'MAD')
     RETURNING id`,
    [dispatchId, professionalId]
  );
  const responseId = response.rows[0].id;

  await pool.query(
    `INSERT INTO response_comparisons_v12
      (request_id, traveler_id, selected_response_id, compared_response_ids)
     VALUES ($1,$2,$3,$4)`,
    [requestId, travelerId, responseId, [responseId]]
  );

  await pool.query(
    `INSERT INTO experience_decisions_v27
      (session_id, request_id, traveler_id, decision, response_id, confirmed)
     VALUES ($1,$2,$3,'selected',$4,true)`,
    [sessionId, requestId, travelerId, responseId]
  );

  await pool.query(
    `INSERT INTO traveler_vault_items_v14
      (traveler_id, item_type, title, summary, country_iso3)
     VALUES ($1,'response','V27 integration response','Test handoff','MAR')`,
    [travelerId]
  );

  const reservation = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM traveler_reservations_v15
     WHERE traveler_id=$1`,
    [travelerId]
  );
  ok(reservation.rows[0].n === 0, 'V27 integration created a reservation unexpectedly');

  const vault = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM traveler_vault_items_v14
     WHERE traveler_id=$1`,
    [travelerId]
  );
  ok(vault.rows[0].n >= 1, 'V27 integration did not create a vault item');

  await pool.query('ROLLBACK');
  console.log(JSON.stringify({
    passed:true,
    requestId,
    sessionId,
    travelerId,
    responseId,
    reservationCount:0,
    note:'transaction rolled back; test data was not persisted'
  }, null, 2));
} catch (error) {
  await pool.query('ROLLBACK').catch(()=>{});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
