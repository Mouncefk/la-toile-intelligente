import { spawn } from 'node:child_process';

const port = Number(process.env.V30_SMOKE_PORT || 4317);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index-v27.js'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });

async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(8000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function post(path, payload) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function put(path, payload, expectedStatus = 200) {
  const response = await fetch(base + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const body = await response.json().catch(() => ({}));
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned HTTP ${response.status}, expected ${expectedStatus}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function postExpect(path, payload, expectedStatus) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const body = await response.json().catch(() => ({}));
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned HTTP ${response.status}, expected ${expectedStatus}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForHealth() {
  const deadline = Date.now() + 25000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API exited before becoming healthy (code ${child.exitCode}).\n${logs}`);
    }
    try {
      const health = await get('/api/health');
      if (health.ok !== true) throw new Error('API health response did not contain ok=true');
      return;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error(`API did not become healthy: ${lastError?.message || 'timeout'}\n${logs}`);
}

try {
  await waitForHealth();

  const flow = await get('/api/platform/v30/flow');
  if (!flow.pilots?.includes('MAR') || !flow.pilots?.includes('FRA')) {
    throw new Error('V30 flow must declare Morocco and France as pilot territories');
  }
  console.log('HTTP smoke: health + V30 flow OK');

  const globe = await get('/api/platform/v30/globe');
  if (!Array.isArray(globe.countries)) throw new Error('V30 globe response must include countries[]');
  console.log(`HTTP smoke: globe OK (${globe.countries.length} country entries)`);

  const pilots = await get('/api/platform/v30/pilots');
  const pilotCodes = (pilots.pilots || []).map(item => item.country_iso3);
  if (!pilotCodes.includes('MAR') || !pilotCodes.includes('FRA')) {
    throw new Error(`Pilot registry must contain MAR and FRA; got ${pilotCodes.join(', ')}`);
  }
  console.log('HTTP smoke: pilot registry MAR + FRA OK');

  const pilotTerritories = {};
  for (const iso3 of ['MAR', 'FRA']) {
    const data = await get(`/api/platform/v30/territories/${iso3}`);
    if (!Array.isArray(data.territories) || data.territories.length === 0) {
      throw new Error(`No active territories returned for ${iso3}`);
    }
    pilotTerritories[iso3] = data.territories;
    console.log(`HTTP smoke: ${iso3} territories OK (${data.territories.length})`);

    const sample = data.territories.find(item => item.region_type !== 'country') || data.territories[0];
    const detail = await get(`/api/platform/v30/territory/${encodeURIComponent(sample.territory_key)}`);
    if (!detail.territory || detail.territory.territory_key !== sample.territory_key) {
      throw new Error(`Territory detail contract invalid for ${sample.territory_key}`);
    }
    if (!Array.isArray(detail.solutions) || !Array.isArray(detail.healthSafety) || !detail.healthSafetyDecision) {
      throw new Error(`Territory solution and health/safety contract incomplete for ${sample.territory_key}`);
    }
    const climateDetail = await get(`/api/platform/v30/territory/${encodeURIComponent(sample.territory_key)}/climate?month=10`);
    if (!climateDetail.territory || climateDetail.territory.territory_key !== sample.territory_key) {
      throw new Error(`Territory climate contract invalid for ${sample.territory_key}`);
    }
    console.log(`HTTP smoke: ${iso3} territory detail + climate + safety OK (${sample.territory_key})`);
  }

  for (const nodeKey of ['mar-marrakech','mar-casablanca','mar-tanger']) {
    const safety = await get(`/api/platform/v30/v32/globe/${nodeKey}/health-safety`);
    const types = new Set((safety.points || []).map(point => point.service_type));
    if (!types.has('medicine') || !types.has('pharmacy') || !types.has('security')) {
      throw new Error(`Expected medicine, pharmacy and security services for ${nodeKey}; got ${[...types].join(', ')}`);
    }
  }
  console.log('HTTP smoke: Morocco health/safety coverage Marrakech + Casablanca + Tangier OK');

  const hierarchy = await get('/api/platform/v30/globe/hierarchy');
  if (hierarchy.root !== 'WORLD' || !Array.isArray(hierarchy.nodes) || hierarchy.nodes.length < 6) {
    throw new Error('Global geography hierarchy is missing or too small');
  }
  console.log(`HTTP smoke: global geography hierarchy OK (${hierarchy.nodes.length} nodes)`);

  const globeRoot = await get('/api/platform/v30/v32/globe/root');
  if (!Array.isArray(globeRoot.nodes) || globeRoot.nodes.length === 0 || globeRoot.navigation !== 'progressive') {
    throw new Error('V32 globe root must provide world nodes and progressive navigation');
  }
  console.log(`HTTP smoke: V32 globe root OK (${globeRoot.nodes.length} world node(s))`);

  const safety = await get('/api/platform/v30/v32/globe/mar-marrakech/health-safety');
  if (!Array.isArray(safety.points) || safety.points.length < 3 || !safety.counts || safety.privacy !== 'public_service_data_only') {
    throw new Error('V32 public health/safety endpoint must resolve public medical, pharmacy and security points for Marrakech');
  }
  console.log(`HTTP smoke: V32 health/safety OK (${safety.points.length} public service point(s))`);

  const climate = await get('/api/platform/v30/climate/context?month=10&hemisphere=north');
  if (climate.month !== 10 || climate.hemisphere !== 'north' || climate.climate !== 'mediterranean' || !Object.hasOwn(climate, 'context')) {
    throw new Error('Climate context response does not match the requested month, hemisphere and climate');
  }
  console.log('HTTP smoke: seasonal climate context OK');

  const compatibility = await get('/api/platform/v30/compatibility?tag=desert&climate=arid&hemisphere=north&month=10');
  if (compatibility.tag !== 'desert' || compatibility.climate !== 'arid' || !compatibility.rule) {
    throw new Error('Climate/tourism compatibility rule is missing for desert travel');
  }
  console.log('HTTP smoke: desert/climate compatibility rule OK');

  const sessionResult = await post('/api/platform/v30/session', {
    countryIso3: 'MAR',
    territoryKey: 'MARRAKECH',
    freedomMode: 'balanced'
  });
  const sessionId = sessionResult.session?.id;
  if (!sessionId) throw new Error('Could not create a traveler session');
  const intentResult = await post(`/api/platform/v30/session/${sessionId}/intent`, {
    rawText: 'Découvrir le désert et des expériences artisanales à un rythme tranquille'
  });
  if (!intentResult.analysis || !intentResult.intent) {
    throw new Error('Traveler intent qualification response is incomplete');
  }
  console.log(`HTTP smoke: traveler session + intent qualification OK (session ${sessionId})`);

  await post(`/api/platform/v30/session/${sessionId}/profile`, {
    traveler_type: 'family',
    party_type: 'family',
    party_size: 3,
    pace: 'tranquille',
    duration_days: 5,
    preferences: ['desert', 'artisanat']
  });
  const solutions = await get(`/api/platform/v30/session/${sessionId}/solutions?month=10`);
  if (!Array.isArray(solutions.matches) && !Array.isArray(solutions.solutions) && !Array.isArray(solutions.recommendations)) {
    throw new Error('Traveler recommendation response has no recognized results array');
  }
  const comparison = await get(`/api/platform/v30/session/${sessionId}/compare`);
  if (!Array.isArray(comparison.comparisons) || comparison.maxSelections !== 3 || comparison.selectionRequired !== true) {
    throw new Error('Traveler comparison contract invalid');
  }
  console.log('HTTP smoke: traveler profile + recommendations + comparison contract OK');

  const draftResult = await post('/api/platform/v30/trip-draft', {
    sessionId,
    title: 'V30 live smoke test',
    territoryKey: 'MARRAKECH',
    notes: { dates: { flexibilityDays: 3, durationDays: 5 } }
  });
  const draftId = draftResult.draft?.id;
  if (!draftId || draftResult.travelerDecides !== true || draftResult.proposalOnly !== true) {
    throw new Error('Trip draft creation must persist and preserve traveler decision');
  }
  const draftReadiness = await get(`/api/platform/v30/trip-draft/${draftId}/readiness`);
  if (!Array.isArray(draftReadiness.blockingMissing) || !draftReadiness.blockingMissing.includes('transport') || !draftReadiness.blockingMissing.includes('accommodation')) {
    throw new Error('Trip draft readiness must flag missing transport and accommodation');
  }
  const draftSummary = await get(`/api/platform/v30/trip-draft/${draftId}/summary`);
  if (draftSummary.proposalOnly !== true) {
    throw new Error('Trip draft summary must remain proposal-only');
  }

  await put(`/api/platform/v30/trip-draft/${draftId}/dates`, {
    startDate: '2027-04-12',
    endDate: '2027-04-17',
    flexibleDays: 3,
    durationDays: 5
  });
  const dateWindows = await get(`/api/platform/v30/trip-draft/${draftId}/date-windows`);
  if (!Array.isArray(dateWindows.windows) || dateWindows.windows.length !== 7 ||
      !dateWindows.windows.some(window => window.offsetDays === -3) ||
      !dateWindows.windows.some(window => window.offsetDays === 3)) {
    throw new Error('Flexible date window must produce the requested seven candidate days');
  }
  const invalidDates = await put(`/api/platform/v30/trip-draft/${draftId}/dates`, {
    startDate: '2027-04-17',
    endDate: '2027-04-12'
  }, 400);
  if (invalidDates.error !== 'endDate_before_startDate') {
    throw new Error('Invalid date order must be rejected explicitly');
  }

  const optimization = await post(`/api/platform/v30/trip-draft/${draftId}/optimize`, {
    pace: 'tranquille',
    durationDays: 5,
    climatePriority: true,
    safetyPriority: true
  });
  if (!optimization.optimization?.optimizedAt || !Array.isArray(optimization.optimization.hardMissing) ||
      !optimization.optimization.hardMissing.includes('transport') ||
      !optimization.optimization.hardMissing.includes('accommodation') ||
      optimization.travelerDecides !== true) {
    throw new Error('Trip optimization must persist date analysis, flag missing components and preserve traveler decision');
  }
  const checklist = await get(`/api/platform/v30/trip-draft/${draftId}/checklist`);
  if (!Array.isArray(checklist.items) || !checklist.items.some(item => item.key === 'optimization' && item.done)) {
    throw new Error('Trip checklist must mark completed optimization');
  }
  const tooMany = await postExpect(`/api/platform/v30/trip-draft/${draftId}/compose`, {
    solutionIds: [1, 2, 3, 4]
  }, 400);
  if (tooMany.error !== 'solutionIds_max_3_required') {
    throw new Error('Trip composition must reject more than three selected solutions');
  }
  const proposal = await post(`/api/platform/v30/trip-draft/${draftId}/compose`, {
    solutionIds: []
  });
  if (proposal.proposalOnly !== true || proposal.travelerDecides !== true || !proposal.draft) {
    throw new Error('Trip composition must remain a proposal and preserve traveler choice');
  }
  console.log('HTTP smoke: composition limit + proposal-only/no automatic booking contract OK');
  console.log('HTTP smoke: trip dates + flexible windows + optimization + checklist OK');
  console.log('HTTP smoke: trip draft + readiness + traveler decision OK');

  const saved = await post('/api/platform/v30/vault', {
    sessionId,
    itemType: 'favorite',
    title: 'V30 HTTP smoke private test item',
    payload: { smokeTest: true }
  });
  if (!saved.item || saved.privacy !== 'private') {
    throw new Error('Traveler vault did not confirm private storage');
  }
  const vault = await get(`/api/platform/v30/vault/session/${sessionId}`);
  if (vault.private !== true || !vault.items?.some(item => item.id === saved.item.id)) {
    throw new Error('Private traveler vault persistence check failed');
  }
  console.log('HTTP smoke: private vault write/read OK');

  console.log('V30 HTTP smoke suite: PASS');
} catch (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
