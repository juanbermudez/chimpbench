import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { growPopulation } from '../src/sim/debug';
import { createDecisionController } from '../src/decision';
import type { World } from '../src/types';
import { REGISTRY_HASH } from '../src/sim/params';
import {
  APP_VERSION, SAVE_FORMAT, STATE_SHAPE, STATE_VERSION, SaveError, captureDecider, compatibility, envelopeChunks, needsParamsChoice, paramsChange,
  jsonPieces, paramsNote, parseEnvelope, plainDataProblems, restoreDecider, shapeFingerprint, takeSlice, worldShapeProblem, type SaveEnvelope,
} from '../src/persist/envelope';
import { ix, newSimState, newX } from '../src/sim/state';

function world(seed: number, pop = 0, ageRate = 1): World {
  const w = createWorld(seed);
  if (pop) growPopulation(w, pop);
  w.ageRate = ageRate;
  return w;
}
const run = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };
function envelope(w: World): SaveEnvelope {
  return { format: SAVE_FORMAT, app: APP_VERSION, stateVersion: STATE_VERSION, stateShape: STATE_SHAPE, savedAt: 1_700_000_000_000, world: w,
    decider: captureDecider(createDecisionController()), session: { clock: { speedId: '1h', playing: true }, ui: { selectedId: 3 } } };
}
/** Save exactly as the app does (chunked text), load through the validating parser. */
const saveLoad = (w: World) => parseEnvelope([...envelopeChunks(envelope(w))].join('')).world;

// Save at tick N, load, continue M ticks: must deep-equal an uninterrupted N + M run (odd ticks and life-course included).
for (const [label, seed, pop, ageRate, n, m] of [
  ['default world', 48, 0, 1, 1440, 1440], ['120 living', 7, 120, 1, 480, 480], ['life-course, odd save tick', 21, 0, 365, 1537, 1000],
] as const) {
  test(`resume is deterministic: ${label}`, () => {
    const uninterrupted = run(world(seed, pop, ageRate), n + m);
    const resumed = run(saveLoad(run(world(seed, pop, ageRate), n)), m);
    assert.equal(resumed.tick, n + m);
    assert.deepStrictEqual(resumed, uninterrupted);
  });
}

test('worlds stay plain data after long runs (JSON round trips are lossless)', () => {
  // A Map, Set, Infinity, undefined value or shared array inside World would silently break resume.
  for (const w of [run(world(48, 120), 2880), run(world(21, 0, 365), 2 * 5760)]) assert.deepEqual(plainDataProblems(w), []);
  assert.deepEqual(plainDataProblems({ a: Infinity, b: undefined, c: new Map(), d: [1, -0] } as unknown), ['world.a: non-finite number', 'world.b: undefined', 'world.c: Map object', 'world.d[1]: -0']);
  const shared = [1, 2];
  assert.match(plainDataProblems({ a: shared, b: shared })[0], /shared reference/);
});

test('piecewise serialization is byte-identical to JSON.stringify, at every depth', () => {
  const w = run(world(48), 200);
  w.chimps[0].name = 'Tricky $& "quoted" $1 \u2028 name';
  const env = envelope(w);
  for (const depth of [0, 1, 2, 3, 4, 6]) assert.equal([...jsonPieces(env, depth)].join(''), JSON.stringify(env));
  assert.equal([...envelopeChunks(env)].join(''), JSON.stringify(env));
  // Every chimp, trace, tree and event is its own piece at the envelope depth, so a slice can stop between them.
  const pieces = [...envelopeChunks(env)], biggest = Math.max(...pieces.map(p => p.length));
  assert.ok(pieces.length > w.chimps.length + w.trees.length, `${pieces.length} pieces`);
  assert.ok(biggest <= Math.max(...w.chimps.map(c => JSON.stringify(c).length), ...w.trees.map(t => JSON.stringify(t).length), 20_000), `largest piece ${biggest} chars`);
  // JSON.stringify's edge rules: undefined/function values dropped from objects, null in arrays; toJSON honoured.
  const odd = { a: undefined, b: [undefined, () => 1, 2], c: { toJSON: () => 'x' }, d: [], e: {}, f: null, g: 'é"\\' };
  for (const depth of [1, 2, 3]) assert.equal([...jsonPieces(odd, depth)].join(''), JSON.stringify(odd));
  const empty = envelope({ ...w, chimps: [] });
  assert.equal([...envelopeChunks(empty)].join(''), JSON.stringify(empty));
});

test('save slices are time-budgeted: more slices on a slow machine, never a partial piece', () => {
  const pieces = () => ['{', '"a":', '1', ',', '"b":', '[2,3]', '}'][Symbol.iterator]();
  // A fake clock that advances `cost` ms per reading, standing in for a fast and a loaded machine.
  const clock = (cost: number) => { let t = 0; return () => (t += cost); };
  const count = (cost: number) => { const it = pieces(), now = clock(cost); let n = 0, text = '', done = false; while (!done) { const s = takeSlice(it, 3.5, now); text += s.text; done = s.done; n++; } return { n, text }; };
  const fast = count(0.25), slow = count(2);
  assert.equal(fast.text, '{"a":1,"b":[2,3]}'); assert.equal(slow.text, fast.text);
  assert.ok(slow.n > fast.n, `slow machine: ${slow.n} slices, fast: ${fast.n}`);
  // Budget already spent (e.g. by the capture): still one piece of progress per slice.
  const first = takeSlice(pieces(), -1, clock(1));
  assert.deepEqual(first, { text: '{', done: false });
});

test('incompatible or corrupt saves are refused with a clear reason', () => {
  const ok = envelope(run(world(48), 10));
  assert.deepEqual(compatibility(ok), { ok: true });
  const older = { ...ok, stateShape: 'deadbeef' };
  assert.equal(compatibility(older).ok, false);
  assert.throws(() => parseEnvelope(JSON.stringify(older)), (e: unknown) => e instanceof SaveError && e.code === 'incompatible' && /older simulation state layout/.test(e.message));
  assert.throws(() => parseEnvelope(JSON.stringify({ ...ok, format: 99 })), (e: unknown) => e instanceof SaveError && e.code === 'incompatible');
  assert.throws(() => parseEnvelope('{"format":1,'), (e: unknown) => e instanceof SaveError && e.code === 'corrupt');
  // A world whose hidden state has a different layout is refused even if its stamp claims to be current.
  const drifted = envelope(run(world(48), 10)); (drifted.world as World & { sim: Record<string, unknown> }).sim.extraField = 1;
  assert.throws(() => parseEnvelope(JSON.stringify(drifted)), /world\.sim layout differs/);
});

test('legacy Settings export (v0.2.0) opens through the same checks', () => {
  const w = run(world(48), 30);
  const legacy = { version: '0.2.0', savedAt: new Date().toISOString(), clock: { speedId: '10x' }, policy: w.modelPolicy, decider: { roster: 'focal-set' }, traces: [], world: w };
  const env = parseEnvelope(JSON.stringify(legacy));
  assert.equal(env.world.tick, 30); assert.equal(env.decider.roster, 'focal-set'); assert.equal(env.session.clock.speedId, '10x'); assert.equal(env.session.clock.playing, false);
});

test('decider state round-trips; restored trace ids cannot collide with new ones', () => {
  const d = createDecisionController();
  d.calls = 9; d.applied = 7; d.discarded = 2; d.fallbacks = 4; d.revalidated = 1; d.agreement = { same: 5, total: 7 }; d.roster = 'focal-set';
  d.traces = Array.from({ length: 80 }, (_, i) => ({ id: `${i}-1-${i + 1}` }) as never);
  const saved = captureDecider(d);
  assert.equal(saved.traces.length, 50); assert.equal(saved.traces.at(-1)!.id, '79-1-80');
  const e = createDecisionController();
  restoreDecider(e, JSON.parse(JSON.stringify(saved)), 1_700_000_000_000);
  assert.deepEqual([e.calls, e.applied, e.discarded, e.fallbacks, e.revalidated, e.agreement.same, e.agreement.total], [9, 7, 2, 4, 1, 5, 7]);
  assert.ok(e.traces.every(t => /^s[0-9a-z]+:/.test(t.id)));
  // Already-prefixed ids keep their prefix across a second save/load.
  const f = createDecisionController(); restoreDecider(f, captureDecider(e), 1_800_000_000_000);
  assert.deepEqual(f.traces.map(t => t.id), e.traces.map(t => t.id));
});

test('APP_VERSION matches package.json', () => {
  assert.equal(APP_VERSION, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
});

test('a save from an older parameter registry opens only by choice, and is labeled while it runs', () => {
  const w = run(world(48), 20);
  assert.equal(paramsChange(w), null, 'a new world carries the current registry hash');
  assert.equal(needsParamsChoice(w, null), null);
  const older = saveLoad(w);
  (older as World & { sim: { params: { registry: string } } }).sim.params.registry = 'older-registry';
  // Softer than a layout mismatch: the envelope still parses (so it can be opened anyway or exported).
  const env = parseEnvelope(JSON.stringify(envelope(older)));
  assert.deepEqual(paramsChange(env.world), { saved: 'older-registry', current: REGISTRY_HASH });
  assert.deepEqual(needsParamsChoice(env.world, null), { saved: 'older-registry', current: REGISTRY_HASH }, 'never resumes silently');
  assert.equal(needsParamsChoice(env.world, REGISTRY_HASH), null, 'once accepted for this registry, no second prompt');
  assert.ok(needsParamsChoice(env.world, 'an-even-older-accepted-registry'), 'a later registry change asks again');
  assert.match(paramsNote(paramsChange(env.world)!), /older parameter set \(older-registry\).*current defaults/);
  // A world without a recorded registry counts as older too.
  delete (env.world as World & { sim: { params: { registry?: string } } }).sim.params.registry;
  assert.deepEqual(paramsChange(env.world), { saved: '', current: REGISTRY_HASH });
});

test('stage C8 hidden state: the new fields are finite numbers, and saves from before C8 are incompatible (STATE_SHAPE changed, by design)', () => {
  const C8 = ['cond', 'grow', 'bereft', 'gestCond', 'ill', 'outbreak', 'snare', 'trX', 'trZ'] as const;
  const w = run(world(21, 0, 365), 2000);
  for (const c of w.chimps) { if (!c.alive) continue; const x = ix(c); for (const k of C8) assert.ok(Number.isFinite(x[k]), `${c.name} ${k} = ${x[k]}`); }
  const legacy: Record<string, unknown> = { ...newX() };
  for (const k of C8) delete legacy[k];
  const old = shapeFingerprint(legacy, newSimState());
  assert.notEqual(old, STATE_SHAPE);
  assert.equal(compatibility({ format: SAVE_FORMAT, stateVersion: STATE_VERSION, stateShape: old }).ok, false);
});

test('shape check: keys that appear once a mechanism fires (travel hoo, fission) do not refuse a save; unknown keys do', () => {
  const w = JSON.parse(JSON.stringify(run(world(48), 20))) as World;
  const first = w.chimps.find(c => c.alive) as unknown as { sim: Record<string, unknown> };
  first.sim.hooFrom = 3; first.sim.hooAt = 1.5;
  (w as unknown as { sim: Record<string, unknown> }).sim.fission = { scans: 0 };
  assert.equal(worldShapeProblem(w), '');
  first.sim.somethingNew = 1;
  assert.equal(worldShapeProblem(w), 'chimp.sim layout differs from this build');
});
