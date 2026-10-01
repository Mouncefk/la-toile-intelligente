const base = process.env.V27_BASE_URL || 'http://localhost:4300/api/experience/v27';

async function call(path, options = {}) {
  const response = await fetch(base + path, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const flow = await call('/flow');
assert(flow.response.ok, 'GET /flow failed');
assert(flow.body.engines?.intent === 'v10', 'V10 is not declared');
assert(flow.body.engines?.matching === 'v11', 'V11 is not declared');
assert(flow.body.engines?.professional_responses === 'v12', 'V12 is not declared');
assert(flow.body.engines?.traveler_vault === 'v14', 'V14 is not declared');
assert(flow.body.engines?.journey === 'v15', 'V15 is not declared');

const emptySession = await call('/session', {
  method: 'POST',
  body: JSON.stringify({})
});
assert(emptySession.response.status === 400, 'Empty session should be rejected');

const incompleteRequest = await call('/session/999999/request', {
  method: 'POST',
  body: JSON.stringify({ rawText: 'Je cherche quelque chose.' })
});
assert([400,404].includes(incompleteRequest.response.status), 'Request on missing session should be rejected');

const unconfirmedDispatch = await call('/request/1/dispatch', {
  method: 'POST',
  body: JSON.stringify({ confirmed: false })
});
assert(unconfirmedDispatch.response.status === 400, 'Unconfirmed dispatch should be rejected');

const invalidComparison = await call('/request/1/compare', {
  method: 'POST',
  body: JSON.stringify({ responseIds: [] })
});
assert(invalidComparison.response.status === 400, 'Empty comparison should be rejected');

const invalidResponseIds = await call('/request/1/compare', {
  method: 'POST',
  body: JSON.stringify({ responseIds: [0, 0] })
});
assert(invalidResponseIds.response.status === 400, 'Invalid response IDs should be rejected');

const invalidRadius = await call('/request/1/dispatch', {
  method: 'POST',
  body: JSON.stringify({ confirmed: true, radiusKm: 0 })
});
assert(invalidRadius.response.status === 400, 'Invalid dispatch radius should be rejected');

console.log('V27 contract smoke checks passed.');
