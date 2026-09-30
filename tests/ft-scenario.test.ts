import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';
import { simOf } from '../src/sim/state';
import { boostWest, runScenario, type ScenarioJob, type ScenarioRow } from '../scripts/ft-scenario';
import type { Scorer } from '../scripts/ft-society';
import { StandInScorer } from '../scripts/ft-standin';

// Field-profile worlds are large: every run here is one or two periods of 0.05 eco-days (288 ticks each).
const tiny = (over: Partial<ScenarioJob> = {}): ScenarioJob =>
  ({ kind: 'baseline', cond: 'rules', seed: 48, years: 0.1 / 365, periodDays: 0.05, extraMales: 3, params: {}, ...over });
const root = fileURLToPath(new URL('..', import.meta.url));
const distill = join(root, 'artifacts/decide-ft/distill');
const tai = (JSON.parse(readFileSync(join(root, 'data/presets/tai-patrols.json'), 'utf8')) as { params: Record<string, number> }).params;
const ROW_KEYS = ['day', 'area', 'center', 'alive', 'killings', 'encounters', 'births', 'deaths', 'patrols', 'incursions', 'members', 'withFemales', 'maleShare'];

async function collect(job: ScenarioJob, scorer: Scorer | null = null) {
  const calls: { rows: ScenarioRow[]; done: boolean; extra: Record<string, unknown> }[] = [];
  await runScenario(job, scorer, (rows, done, extra) => calls.push({ rows: structuredClone(rows), done, extra }));
  return calls;
}

/** Aggregates only: per-community maps keyed by the three community ids, no per-chimp ids or positions. */
function assertAggregateRow(r: ScenarioRow, troops: string[]): void {
  assert.deepEqual(Object.keys(r).sort(), [...ROW_KEYS].sort());
  for (const k of ['killings', 'encounters', 'births', 'deaths', 'day'] as const) assert.equal(typeof r[k], 'number', k);
  for (const k of ['area', 'alive', 'patrols', 'incursions', 'withFemales', 'maleShare'] as const) {
    assert.deepEqual(Object.keys(r[k]).sort(), troops, k);
    for (const v of Object.values(r[k])) assert.ok(Number.isFinite(v), `${k} value ${v}`);
  }
  assert.deepEqual(Object.keys(r.center).sort(), troops);
  for (const v of Object.values(r.center)) assert.ok(v.length === 2 && v.every(Number.isInteger), 'center is a rounded [x, z]');
  assert.deepEqual(Object.keys(r.members).sort(), troops);
  for (const v of Object.values(r.members)) assert.deepEqual(Object.keys(v).sort(), ['f', 'm']);
}

test('boostWest adds exactly n living adult West males with fresh unique ids', () => {
  const world = createWorld(48, { profile: 'field' });
  const before = new Set(world.chimps.map(c => c.id)), n0 = world.chimps.length;
  const westMales = () => world.chimps.filter(c => c.alive && c.troopId === 1 && c.sex === 'male' && c.age >= 15).length;
  const m0 = westMales();
  assert.ok(m0 > 0, 'seed 48 West has adult males to clone');
  boostWest(world, 5);
  assert.equal(world.chimps.length, n0 + 5);
  assert.equal(westMales(), m0 + 5);
  const added = world.chimps.slice(n0);
  assert.ok(added.every(c => c.alive && c.troopId === 1 && c.sex === 'male' && c.age >= 15 && c.motherId === -1));
  const ids = world.chimps.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'ids stay unique');
  assert.ok(added.every(c => !before.has(c.id) && c.id < 100000), 'fresh ids in the chimp range');
  assert.ok(simOf(world).nextChimpId > Math.max(...added.map(c => c.id)), 'nextChimpId moved past the clones');
  boostWest(world, 0);
  assert.equal(world.chimps.length, n0 + 5, 'n = 0 adds nobody');
});

test('rules condition: same seed and job give deep-equal rows; model conditions need a scorer', async () => {
  const job = tiny();
  const a = await collect(job), b = await collect(job);
  assert.equal(a.length, 2, 'one onRow per period');
  assert.deepEqual(a.map(c => c.done), [false, true]);
  assert.deepEqual(a.map(c => c.rows.length), [2, 3], 'the day-0 row plus one per period');
  assert.deepEqual(a[1].rows, b[1].rows);
  assert.equal(a[1].extra.decisions, 0);
  const expansion = await collect(tiny({ kind: 'expansion', years: 0.05 / 365 }));
  assert.equal(expansion[0].rows[0].alive[1], a[0].rows[0].alive[1] + 3, 'expansion starts West with extraMales more');
  await assert.rejects(runScenario(tiny({ cond: 'all-baseline' }), null, () => {}), /no scorer/);
});

test('tai preset: the CLI passes data/presets/tai-patrols.json as the job params, and they reach the world', () => {
  assert.ok(Object.keys(tai).length > 0);
  const base = paramsOf(createWorld(48, { profile: 'field' }));
  const P = paramsOf(createWorld(48, { profile: 'field', params: tai }));
  for (const [id, v] of Object.entries(tai)) {
    assert.equal((P as unknown as Record<string, number>)[id], v, id);
    assert.notEqual((base as unknown as Record<string, number>)[id], v, `${id} differs from the default`);
  }
  // runScenario does not expose its world, so check the CLI wiring through its output file (head = job).
  const out = mkdtempSync(join(tmpdir(), 'ft-scenario-'));
  try {
    execFileSync(process.execPath, ['--import', 'tsx', join(root, 'scripts/ft-scenario.ts'), '--kind', 'tai', '--cond', 'rules', '--seed', '48',
      '--years', String(0.05 / 365), '--period-days', '0.05', '--out', out], { cwd: root, stdio: 'pipe' });
    const doc = JSON.parse(readFileSync(join(out, 'tai-rules-48.json'), 'utf8'));
    assert.deepEqual(doc.params, tai);
    assert.equal(doc.done, true);
    assert.equal(doc.profile, 'field');
    assert.equal(doc.standIns, null);
    assert.equal(doc.rows.length, 2);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('stand-in driven run (all-baseline) decides and writes only aggregate rows', async t => {
  if (!existsSync(join(distill, 'baseline.json'))) { t.skip('artifacts/decide-ft/distill/baseline.json is missing'); return; }
  const scorer = new StandInScorer(distill, ['baseline']);
  const calls = await collect(tiny({ cond: 'all-baseline', years: 0.05 / 365 }), scorer);
  assert.equal(calls.length, 1);
  const { rows, done, extra } = calls[0];
  assert.equal(done, true);
  assert.ok((extra.decisions as number) > 0, `${extra.decisions} decisions`);
  t.diagnostic(`${extra.decisions} decisions, ${extra.applied} applied`);
  assert.ok((extra.applied as number) <= (extra.decisions as number));
  assert.deepEqual(Object.keys(extra).sort(), ['applied', 'decisions', 'seconds']);
  assert.equal(rows.length, 2);
  for (const r of rows) assertAggregateRow(r, ['1', '2', '3']);
});

test('rows hold only community aggregates (no per-chimp ids or positions besides the community centre)', async () => {
  const [{ rows }] = await collect(tiny({ years: 0.05 / 365 }));
  for (const r of rows) assertAggregateRow(r, ['1', '2', '3']);
  assert.equal(rows[0].day, 0);
});
