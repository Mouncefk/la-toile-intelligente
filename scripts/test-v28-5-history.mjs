const base = process.env.V28_HISTORY_BASE_URL || 'http://localhost:4300/api/travelers/v28-5/history';

async function call(url) {
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const missing = await call(base);
assert(missing.response.status === 400, 'Missing travelerId should be rejected');

const invalid = await call(base + '?travelerId=0');
assert(invalid.response.status === 400, 'Invalid travelerId should be rejected');

console.log('V28.5 history contract smoke checks passed.');
