import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const entry = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/v30-app.jsx', import.meta.url), 'utf8');

assert.match(entry, /render\(legacyMode\s*\?\s*<App\/>\s*:\s*<V30App\/>\)/,
  'V30 must be the default application entry; V27 is opt-in only');
assert.match(entry, /get\('v27'\)\s*===\s*'1'/,
  'The legacy V27 interface must remain explicitly available with ?v27=1');
assert.match(app, /function GlobeNavigator\(/,
  'V30 must include the interactive globe navigator');
assert.match(app, /<GlobeNavigator\/>/,
  'V30 must render the globe navigator');
assert.match(app, /\/api\/platform\/v30\/v32\/globe\/root/,
  'The globe navigator must load its world root from the V30 API');
assert.match(app, /function TripPreparationPanel\(/,
  'The traveler preparation panel must be present');
assert.match(app, /function TripDecisionBrief\(/,
  'The traveler decision brief must be present');
assert.match(app, /function TripReadinessPanel\(/,
  'The trip readiness panel must be present');

console.log('V30 entry contract: default UI + globe + traveler preparation panels PASS');
