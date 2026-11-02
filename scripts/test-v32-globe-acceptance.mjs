import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = Number(process.env.V30_GEO_ACCEPTANCE_PORT || 4321);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index-v27.js'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk.toString(); });
child.stderr.on('data', chunk => { logs += chunk.toString(); });

async function get(path) {
  const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(8000) });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 200, `${path}: HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}
async function waitForHealth() {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited (${child.exitCode})\n${logs}`);
    try { const health = await get('/api/health'); if (health.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`API health timeout\n${logs}`);
}

try {
  await waitForHealth();
  const root = await get('/api/platform/v30/v32/globe/root');
  assert.ok(Array.isArray(root.nodes) && root.nodes.some(n => n.node_key === 'world'),
    'V32 root must expose the canonical world node');

  const accepted = {};
  for (const nodeKey of ['country-mar', 'country-fra']) {
    const geometry = await get(`/api/platform/v30/v32/globe/${nodeKey}/geometry`);
    assert.equal(geometry.available, true, `${nodeKey}: geometry must be available`);
    assert.ok(geometry.geometry && ['Polygon', 'MultiPolygon'].includes(geometry.geometry.type),
      `${nodeKey}: expected non-empty Polygon/MultiPolygon GeoJSON`);
    assert.ok(Array.isArray(geometry.geometry.coordinates) && geometry.geometry.coordinates.length > 0,
      `${nodeKey}: geometry coordinates must not be empty`);
    accepted[nodeKey] = {
      type: geometry.geometry.type,
      coordinateGroups: geometry.geometry.coordinates.length,
      source: geometry.source
    };
  }

  for (const nodeKey of ['mar-marrakech', 'mar-casablanca', 'mar-tanger']) {
    const safety = await get(`/api/platform/v30/v32/globe/${nodeKey}/health-safety`);
    assert.ok(Array.isArray(safety.points), `${nodeKey}: points[] is required`);
    for (const type of ['medicine', 'pharmacy', 'security']) {
      const points = safety.points.filter(p => p.service_type === type);
      assert.ok(points.length > 0, `${nodeKey}: no public ${type} point`);
      assert.ok(points.every(p => Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude)) && p.name),
        `${nodeKey}: ${type} points must have a name and valid coordinates`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    worldRoot: root.nodes.length,
    pilotCountryGeometries: accepted,
    safetyTerritories: ['mar-marrakech', 'mar-casablanca', 'mar-tanger']
  }, null, 2));
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
