import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorld, tickWorld } from '../src/simulation';
import { drawIndex, drawUniform, rulesProbs, softmax, uniform, utilityProbs } from '../src/decide/policies';
import { buildFacts } from '../src/decide/facts';
import { buildRequest } from '../src/decision';
import { bandDistance, endpoint, ENDPOINT_ROWS, rowKey, runArm, runSeed, snapshotGuardParams, truthValues, worldHash, type ArmResult, type SeedJob } from '../scripts/lib/jev-arm';
import { calibrate, medianTop } from '../scripts/jev-test';
import { paidFlagsError, plannedWorlds, scorePaid, splitBudget, type FreeDoc } from '../scripts/lib/jev-paid-report';
import { runPaidWorld, WorldStopped, type PaidJob, type Scorer } from '../scripts/lib/jev-paid';
import { buildJevV3 } from '../src/decide/jev-packet';

const tiny: SeedJob = { seed: 6301, arms: ['R', 'RG', 'U', 'X'], profile: 'compressed', burnInDays: 0.25, warmupDays: 0.05, scoredDays: 0.3 };
const strip = (a: ArmResult) => ({ ...a, wallMs: 0 });
const tiny4: SeedJob = { seed: 6301, arms: ['RG'], profile: 'compressed', burnInDays: 0.2, warmupDays: 0.02, scoredDays: 1.05 };
const truthValuesOf = (a: ArmResult) => truthValues(a.truth);

test('band distance: 0 inside, else the gap to the nearest edge over the band width', () => {
  const b = { lo: 0.33, hi: 0.5 };
  assert.equal(bandDistance(0.4, b), 0);
  assert.equal(bandDistance(0.33, b), 0);
  assert.ok(Math.abs(bandDistance(0.25, b) - 0.08 / 0.17) < 1e-12);
  assert.ok(Math.abs(bandDistance(0.6, b) - 0.1 / 0.17) < 1e-12);
  assert.equal(ENDPOINT_ROWS.length, 9);
  assert.deepEqual(ENDPOINT_ROWS.map(rowKey), ['T-ACT-1 male', 'T-ACT-1 female', 'T-ACT-2 male', 'T-ACT-2 female', 'T-ACT-3 male', 'T-ACT-3 female', 'T-ACT-4', 'T-PTY-1', 'T-RNG-4 male']);
  const B = { 'T-ACT-1': b, 'T-ACT-2': { lo: 0.12, hi: 0.25 }, 'T-ACT-3': { lo: 0.08, hi: 0.18 }, 'T-ACT-4': { lo: 0.3, hi: 0.47 }, 'T-PTY-1': { lo: 3, hi: 9 }, 'T-RNG-4': { lo: 1.5, hi: 3.5 } };
  const e = endpoint({ 'T-ACT-1 male': 0.4, 'T-ACT-1 female': 0.6, 'T-ACT-2 male': 0.2, 'T-ACT-2 female': 0.2, 'T-ACT-3 male': 0.1, 'T-ACT-3 female': 0.1, 'T-ACT-4': 0.4, 'T-PTY-1': 12, 'T-RNG-4 male': 1 }, B);
  assert.ok(Math.abs(e.D - (0.1 / 0.17 + 3 / 6 + 0.5 / 2)) < 1e-12);
});

test('paid arms need --paid, an explicit cap and a bridge; the real bridge also needs a ledger, a plan and the guarded worker', () => {
  const base = { paid: false, cap: '', ledger: '', bridge: '', plan: '', repo: process.cwd() };
  assert.equal(paidFlagsError(['R', 'U'], base), '', 'free arms need nothing');
  const none = paidFlagsError(['J1', 'J2'], base);
  assert.match(none, /--paid/); assert.match(none, /--cap/); assert.match(none, /--bridge/);
  assert.match(paidFlagsError(['J2s'], { ...base, paid: true, cap: '0', bridge: 'fake' }), /--cap/, 'a zero cap is no cap');
  assert.match(paidFlagsError(['J1', 'R'], { ...base, paid: true, cap: '10', bridge: 'fake' }), /apart from the free arms/);
  assert.equal(paidFlagsError(['J1', 'J2', 'J2s'], { ...base, paid: true, cap: '10', bridge: 'fake' }), '', 'a fake dry run needs no ledger');
  const dir = mkdtempSync(join(tmpdir(), 'jev-'));
  const fake = join(dir, 'not-a-ledger.db'); writeFileSync(fake, 'hello');
  const real = paidFlagsError(['J1'], { ...base, paid: true, cap: '10', bridge: 'worker', ledger: fake });
  assert.match(real, /not an initialized spend-guard ledger/); assert.match(real, /--plan/);
});

test('the $10 cap splits per world: weighted before a dry run, proportional to estimated cost after it', () => {
  const worlds = plannedWorlds(['J1', 'J2', 'J2s']);
  assert.equal(worlds.length, 11);
  const eq = splitBudget(10, worlds);
  const total = Object.values(eq.caps).reduce((a, b) => a + b, 0);
  assert.ok(total <= 10 && total > 9.99);
  assert.ok(Math.abs(eq.caps['jev-test/J2s-6501'] - 1.25 * eq.caps['jev-test/J1-6501']) < 1e-3, 'J2s also asks a quarter of its states unshuffled');
  const est = Object.fromEntries(worlds.map(w => [w.runId, w.arm === 'J1' ? 0.8 : w.arm === 'J2' ? 0.4 : 0.8]));
  const byCost = splitBudget(10, worlds, est);
  assert.ok(Math.abs(byCost.factor! - 10 / 6.8) < 1e-9);
  assert.ok(Object.values(byCost.caps).reduce((a, b) => a + b, 0) <= 10);
  assert.ok(Math.abs(byCost.caps['jev-test/J1-6602'] - 0.8 * 10 / 6.8) < 1e-3);
});

test('the J2 packet carries value facts without ids, and J2s moves every option\'s facts to another option', () => {
  const w = createWorld(48);
  for (let i = 0; i < 900; i++) tickWorld(w);
  let checked = 0;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 8)) {
    const req = buildRequest(w, c);
    if (req.options.length < 3) continue;
    const s = buildFacts(w, c, req.options), p = buildJevV3(req.context, s), q = buildJevV3(req.context, s, { shuffle: { seed: 6501 } });
    const text = JSON.stringify(p);
    assert.ok(!/\b\d{6,}\b/.test(text), 'no tree, water or dynamic ids');
    assert.equal(p.keys.length, req.options.length); assert.equal(new Set(p.keys).size, p.keys.length);
    assert.deepEqual(Object.keys(p.questions.action.criteria), p.keys, 'criteria in menu order');
    assert.deepEqual(q.keys, p.keys);
    const pv = p.keys.map(k => p.questions.action.criteria[k]), qv = q.keys.map(k => q.questions.action.criteria[k]);
    assert.deepEqual(qv.map(x => x.what), pv.map(x => x.what), 'what stays');
    assert.deepEqual([...qv.map(x => x.gives + '|' + x.costs)].sort(), [...pv.map(x => x.gives + '|' + x.costs)].sort(), 'the same facts, moved');
    assert.ok(!('urgent' in p.state), 'no urgency echo');
    assert.ok(text.length < 8000 * 2, 'far inside the guard ceiling');
    checked++;
  }
  assert.ok(checked > 5);
});

test('a paid world that the guard stops is incomplete and never continues by rules', async () => {
  const job: PaidJob = { seed: 6301, arm: 'J2', profile: 'compressed', burnInDays: 0.1, warmupDays: 0.02, scoredDays: 0.2, bridge: 'fake', ledger: '', runId: 't', capDollars: 1, ftRoot: '' };
  let calls = 0;
  const scorer = (limit: number): Scorer => ({
    async score(packets) {
      if ((calls += packets.length) > limit) throw new WorldStopped('CapReached: run t: cap $1.0000 reached', true);
      return { results: packets.map(pk => { const n = Object.keys((pk as { questions: { action: { criteria: object } } }).questions.action.criteria).length; return Array.from({ length: n }, () => 1 / n); }) };
    }, stop() {} });
  const done = await runPaidWorld(job, async () => scorer(1e9));
  assert.equal(done.complete, true); assert.ok(done.result && done.result.decisions > 0);
  assert.ok(done.jev.calls > 0 && done.jev.estTokens > 0);
  calls = 0;
  const stopped = await runPaidWorld(job, async () => scorer(Math.floor(done.jev.calls / 2)));
  assert.equal(stopped.complete, false);
  assert.match(stopped.stopReason, /CapReached/);
  assert.equal(stopped.stoppedAt.phase, 'scored');
  assert.ok(stopped.stoppedAt.day < job.scoredDays, 'the world stopped where the cap was reached');
  const badHash = await runPaidWorld({ ...job, expectBurnInHash: 'deadbeef' }, async () => { throw new Error('must not start a worker'); });
  assert.equal(badHash.complete, false); assert.match(badHash.stopReason, /differs from the free arms/);
});

test('paid scoring applies the pre-registered rules and Amendment 1', () => {
  const seeds = [6501, 6602, 6703, 6804, 6905];
  const freeD: Record<string, number[]> = { R: [2, 2, 2, 2, 2], RG: [1, 1, 1, 1, 1], U: [1.8, 1.8, 1.8, 1.8, 1.8] };
  const free = { summary: { perArm: Object.fromEntries(Object.entries(freeD).map(([a, d]) => [a, { perSeed: d.map((D, i) => ({ seed: seeds[i], D })), hungerAllAdults: { median: 0.64 }, hunger: { lactating: { median: 0.89 } } }])) }, seedInfo: [] } as unknown as FreeDoc;
  // a J2 whose truth gives D ≈ RG's: beats R and U but not RG → "no difference", explained by sampling and holding
  const tiny = runSeed({ ...tiny4, arms: ['RG'] }).arms[0];
  const B = { 'T-ACT-1': { lo: 0.33, hi: 0.5 }, 'T-ACT-2': { lo: 0.12, hi: 0.25 }, 'T-ACT-3': { lo: 0.08, hi: 0.18 }, 'T-ACT-4': { lo: 0.3, hi: 0.47 }, 'T-PTY-1': { lo: 3, hi: 9 }, 'T-RNG-4': { lo: 1.5, hi: 3.5 } };
  const D = endpoint(truthValuesOf(tiny), B).D;
  assert.ok(Number.isFinite(D), 'every row has a value');
  const shifted = { R: freeD.R.map(() => D + 1), RG: freeD.RG.map(() => D), U: freeD.U.map(() => D + 0.8) };
  const free2 = { ...free, summary: { perArm: Object.fromEntries(Object.entries(shifted).map(([a, d]) => [a, { perSeed: d.map((x, i) => ({ seed: seeds[i], D: x })), hungerAllAdults: { median: 0.9 }, hunger: { lactating: { median: 0.89 } } }])) } } as unknown as FreeDoc;
  const paid = seeds.map(seed => ({ arm: 'J2' as const, seed, runId: `jev-test/J2-${seed}`, capDollars: 1, burnInHash: '', complete: true, stopReason: '', stoppedAt: { phase: 'done' as const, day: 5 },
    result: { ...tiny, hunger: { ...tiny.hunger } }, jev: { calls: 1, batches: 1, estTokens: 1, spent: 0, revalidated: 0, tv: [], kinds: {} }, worker: {}, doNotTrain: '', wallMs: 0, guardParams: {} }));
  const sc = scorePaid(paid, free2, B).arms.J2 as { verdict: string; notes: string[]; beatsRGby005: number; lowerThanR: number };
  assert.equal(sc.lowerThanR, 5);
  assert.equal(sc.beatsRGby005, 0);
  assert.equal(sc.verdict, 'no difference');
  assert.ok(sc.notes.some(n => /sampling and intention holding/.test(n)));
  // one world incomplete: it counts against the seed conditions
  const one = paid.map((p, i) => i === 0 ? { ...p, complete: false, stopReason: 'CapReached' } : p);
  const sc2 = scorePaid(one, free2, B).arms.J2 as { completeSeeds: number; lowerThanR: number };
  assert.equal(sc2.completeSeeds, 4); assert.equal(sc2.lowerThanR, 4);
});

test('sampling: reproducible draws from (seed, chimp, version), distributions sum to 1, calibration hits its target', () => {
  assert.equal(drawUniform(6501, 12, 40), drawUniform(6501, 12, 40));
  assert.notEqual(drawUniform(6501, 12, 40), drawUniform(6501, 12, 41));
  assert.equal(drawIndex([0.2, 0.3, 0.5], 0.1), 0); assert.equal(drawIndex([0.2, 0.3, 0.5], 0.49), 1); assert.equal(drawIndex([0.2, 0.3, 0.5], 0.999999), 2);
  const w = createWorld(48);
  for (let i = 0; i < 600; i++) tickWorld(w);
  const rng = w.rng;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 8)) {
    const { options } = buildRequest(w, c);
    if (options.length < 2) continue;
    for (const p of [rulesProbs(options), utilityProbs(buildFacts(w, c, options)), uniform(options.length)]) {
      assert.equal(p.length, options.length);
      assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9 && p.every(v => v >= 0));
    }
  }
  assert.equal(w.rng, rng, 'policies never touch world.rng');
  const vectors = [[0, 1, 2], [0.5, 0.1, 0.3, 0], [1, 1.2]];
  const T = calibrate(vectors, 0.77);
  assert.ok(Math.abs(medianTop(vectors, T) - 0.77) < 1e-6);
  assert.ok(Math.max(...softmax([0, 1], 0.01)) > 0.999);
});

test('the harness is deterministic, and an arm on a copy of the burned-in world equals the arm on the world itself', () => {
  const a = runSeed(tiny), b = runSeed(tiny);
  assert.equal(a.burnInHash, b.burnInHash);
  assert.deepEqual(a.arms.map(strip), b.arms.map(strip));
  assert.ok(a.arms.find(r => r.arm === 'U')!.decisions > 0, 'U made choices');
  assert.ok(a.arms.find(r => r.arm === 'RG')!.kept.kept! > 0, 'the gate kept intents');
  // runSeed runs every arm on structuredClone(base); running on the original instead must give the same result
  const base = createWorld(tiny.seed, { profile: tiny.profile });
  for (let i = 0; i < tiny.burnInDays * 5760; i++) tickWorld(base);
  const copy = structuredClone(base);
  assert.equal(worldHash(copy), worldHash(base));
  const onCopy = runArm(copy, 'X', tiny), onBase = runArm(base, 'X', tiny);
  assert.deepEqual(strip(onCopy), strip(onBase));
  assert.equal(worldHash(copy), worldHash(base), 'both worlds end identical');
});

test('snapshot guard: C13 switches are forced to their pre-C13 value in every arm, and absent today', () => {
  assert.deepEqual(snapshotGuardParams(), {}, 'this build predates C13: nothing to force');
  assert.deepEqual(snapshotGuardParams({ rgOn: 1, intakeValue: 1, walkMps: 0.35 }), { rgOn: 0, intakeValue: 0 });
  assert.deepEqual(snapshotGuardParams({ rgOn: 1 }), { rgOn: 0 });
});

test('a cached burn-in is reused only when its hash is the expected one, and gives the same world', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jev-cache-'));
  const cache = join(dir, 'burnin.json');
  const job: PaidJob = { seed: 6301, arm: 'J2', profile: 'compressed', burnInDays: 0.1, warmupDays: 0.01, scoredDays: 0.05, bridge: 'fake', ledger: '', runId: 't', capDollars: 1, ftRoot: '' };
  const uniformScorer = async (): Promise<Scorer> => ({ async score(packets) { return { results: packets.map(pk => { const n = Object.keys((pk as { questions: { action: { criteria: object } } }).questions.action.criteria).length; return Array.from({ length: n }, () => 1 / n); }) }; }, stop() {} });
  const plain = await runPaidWorld(job, uniformScorer);
  const first = await runPaidWorld({ ...job, burnInCache: cache, expectBurnInHash: plain.burnInHash }, uniformScorer);
  assert.ok(existsSync(cache), 'the matching burn-in was cached');
  const second = await runPaidWorld({ ...job, burnInCache: cache, expectBurnInHash: plain.burnInHash }, uniformScorer);
  const strip = (r: typeof plain) => ({ ...r, wallMs: 0, result: r.result ? { ...r.result, wallMs: 0 } : null });
  assert.deepEqual(strip(second), strip(first), 'the cached world continues exactly as the fresh one');
  assert.deepEqual(strip(first), strip(plain));
  writeFileSync(cache, JSON.stringify({ not: 'a world' }));
  const third = await runPaidWorld({ ...job, burnInCache: cache, expectBurnInHash: plain.burnInHash }, uniformScorer);
  assert.equal(third.burnInHash, plain.burnInHash, 'a wrong cache is ignored and the world burned in again');
});
