// Stage R7b, part two (docs/staging/r7b-prereg.md §2): forked outcomes. A fork is deterministic in its salt and never
// touches its parent; the forced option is the animal's act and its held intention; the body score reads the five
// states on their mechanisms' own ranges; the readouts give known answers on hand-made scores. No model. Seed 48, the
// field map, the working base, a short warm-up.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { acrossHorizons, costs, readout, reads, scoresOf } from '../scripts/lib/r7b-fork-readout';
import { bodyTerms, distance, REGISTERED, SCALE_VARIANTS, scoreOf, TERMS, type Terms } from '../scripts/lib/r7b-score';
import { betweenShare, chanceRepeat, halves, mulberry32, noiseRate, repeats, repeatsAllSplits, standsOut, winnerOf } from '../scripts/lib/r7b-stats';
import { fork, forkPoint, listEligible, OWN_NOISE_STEP, prepare, runFork, sampleHash, type ForkBase, type PointFile, type Replicate } from '../scripts/r7b-forks';
import { thresholds } from '../src/sim/circadian';
import { massOf, reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')), observeV4: 1, menuParity: 1 } as Record<string, number>;
let cached: World | null = null;
/** 08:00 on the first day: every animal has left its nest and the light is full. */
const base = () => { if (!cached) { cached = createWorld(48, { profile: 'field', params }); for (let i = 0; i < 360; i++) tickWorld(cached); } return cached; };
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('the body score: five terms on their mechanisms\' own ranges, D their length, the variants one scale at a time', () => {
  const w = structuredClone(base()), P = paramsOf(w), c = w.chimps.find(q => q.alive && q.age >= 15)!, x = ix(c);
  const z = bodyTerms(w, c);
  assert.equal(z.length, 5); assert.deepEqual([...TERMS], ['reserve', 'shortfall', 'water', 'sleep', 'heat']);
  for (const v of z) assert.ok(Number.isFinite(v) && v >= 0, `a term is ${v}`);
  assert.ok(z[1] <= 1 && z[3] <= 1 && z[4] <= 1, 'shortfall, sleep and heat are capped at 1 by their mechanisms');
  // reading the score opens no books and writes nothing
  const before = worldHash(w); bodyTerms(w, c); assert.equal(worldHash(w), before);
  // each state set by hand lands where its mechanism's range puts it
  x.en!.res = -0.25 * reserveCap(c, P); near(bodyTerms(w, c)[0], 0.25);
  x.en!.res = 0.3 * reserveCap(c, P); assert.equal(bodyTerms(w, c)[0], 0, 'a surplus is no distance');
  x.wat!.def = P.waterThirstFullPct * massOf(c, P) * 10; near(bodyTerms(w, c)[2], 1); // the deficit at which thirst is full
  x.wat!.def = 0.5 * P.waterThirstFullPct * massOf(c, P) * 10; near(bodyTerms(w, c)[2], 0.5);
  x.wat!.def = -5; assert.equal(bodyTerms(w, c)[2], 0);
  const [lo, hi] = thresholds(P, x.cx!);
  x.slp = lo; near(bodyTerms(w, c)[3], 0); x.slp = hi; near(bodyTerms(w, c)[3], 1); x.slp = (lo + hi) / 2; near(bodyTerms(w, c)[3], 0.5); x.slp = lo - 0.1; assert.equal(bodyTerms(w, c)[3], 0);
  x.asl = 1; x.slp = lo; near(bodyTerms(w, c)[3], 0); // the sleep latch is not read: being asleep is never a cost
  x.heat = -0.4; near(bodyTerms(w, c)[4], 0.4); x.heat = 0.7; near(bodyTerms(w, c)[4], 0.7);
  // D and the score
  near(distance([3, 4, 0, 0, 0]), 5); near(scoreOf([3, 4, 0, 0, 0], [0, 4, 0, 0, 0]), 1);
  assert.equal(SCALE_VARIANTS.length, 10); assert.deepEqual(REGISTERED.mult, [1, 1, 1, 1, 1]);
  for (const v of SCALE_VARIANTS) { const changed = v.mult.filter(m => m !== 1); assert.equal(changed.length, 1); assert.ok(changed[0] === 2 || changed[0] === 0.5); }
  const doubled = SCALE_VARIANTS.find(v => v.id === 'water-x2')!;
  near(distance([0, 0, 0.5, 0, 0], doubled.mult), 1); near(scoreOf([0, 0, 1, 0, 0], [0, 0, 0.5, 0, 0], doubled), 1);
});

test('a fork: the same salt gives the same outcome and world, another salt another; the forced option is the act and the held intention; the parent is never touched', () => {
  const parent = structuredClone(base()), start = worldHash(parent);
  const eligible = listEligible(structuredClone(parent), 240);
  assert.ok(eligible.length > 5, `${eligible.length} eligible decision points in an hour`);
  for (let i = 1; i < eligible.length; i++) assert.ok(eligible[i - 1].u <= eligible[i].u, 'in hash order');
  assert.equal(eligible[0].u, sampleHash('r7b-fork', 48, eligible[0].tick, eligible[0].id));
  assert.ok(eligible.every(e => e.kinds.length >= 2 && !['kept', 'arrived', 'lead', 'phase', 'argmax'].includes(e.why)), 'fresh draws from a menu of two or more');
  assert.equal(worldHash(parent), start, 'listing reads a copy');
  // walk the parent to the first point's tick and prepare it
  const e = eligible.find(q => q.kinds.includes('rest') && q.kinds.length >= 3)!;
  while (parent.tick < e.tick) tickWorld(parent);
  const at = worldHash(parent), b = prepare(parent, e.id) as ForkBase;
  assert.equal(typeof b, 'object', `the point can be prepared: ${b}`);
  assert.equal(worldHash(parent), at, 'preparing a fork base leaves the parent');
  const waiting = b.world.chimps.find(q => q.id === e.id)!;
  assert.ok(waiting.awaitingDecisionSince !== null && waiting.controller === 'model' && b.options.length >= 2 && b.version === waiting.decisionVersion);
  assert.equal(b.z0.length, 5);
  // forcing each option: it is the animal's act, held as the rules hold their own draw, and the animal is back on the rules
  const baseHash = worldHash(b.world);
  let applied = 0;
  for (const o of b.options) {
    const w = fork(b, parent.modelPolicy.mode, e.id, o, 1);
    if (!w) continue;
    applied++;
    const c = w.chimps.find(q => q.id === e.id)!, it = ix(c).rgIntent!;
    assert.equal(c.action, o.action); assert.equal(c.targetId, o.targetId); assert.equal(c.controller, 'rules'); assert.equal(c.awaitingDecisionSince, null); assert.equal(c.decisionSource, 'rules');
    assert.ok(it && it.action === o.action && it.targetId === o.targetId && it.chosenAt === w.time, 'the held intention is the forced act, chosen now');
    assert.equal(w.modelPolicy.mode, parent.modelPolicy.mode);
  }
  assert.ok(applied >= 2, `${applied} options could be applied`);
  assert.equal(worldHash(b.world), baseHash, 'a fork leaves its fork base');
  // determinism in the salt, with other worlds run in between
  const o = b.options[0], horizons = [12, 24];
  const w1 = fork(b, parent.modelPolicy.mode, e.id, o, 3)!, r1 = runFork(w1, e.id, horizons);
  const other = fork(b, parent.modelPolicy.mode, e.id, o, 4)!, r2 = runFork(other, e.id, horizons);
  for (let i = 0; i < 5; i++) tickWorld(parent); // the parent goes on in between
  const w3 = fork(b, parent.modelPolicy.mode, e.id, o, 3)!, r3 = runFork(w3, e.id, horizons);
  assert.equal(worldHash(w3), worldHash(w1), 'the same salt, the same world');
  assert.deepEqual(r3, r1, 'and the same outcome');
  assert.notEqual(worldHash(other), worldHash(w1), 'another salt, another world');
  assert.ok(r1.r[0] && r1.r[1] && r1.diedAt === null && r1.held >= 0 && r1.held <= 24 && r2.r.length === 2);
  assert.ok(r1.r[1]!.z.every(Number.isFinite) && r1.r[1]!.meanD > 0 && r1.r[1]!.meanSq > 0);
  // iteration 2: with the animal's own hashed noise re-drawn too, the salt also moves its decision count; still deterministic
  assert.equal(w1.chimps.find(q => q.id === e.id)!.decisionVersion >= b.version + 1, true);
  const plainFork = fork(b, parent.modelPolicy.mode, e.id, o, 3)!, own1 = fork(b, parent.modelPolicy.mode, e.id, o, 3, true)!, own2 = fork(b, parent.modelPolicy.mode, e.id, o, 3, true)!;
  assert.equal(plainFork.chimps.find(q => q.id === e.id)!.decisionVersion, b.version + 1);
  const moved = own1.chimps.find(q => q.id === e.id)!;
  assert.equal(moved.decisionVersion, b.version + OWN_NOISE_STEP * 3 + 1); assert.equal(moved.action, o.action); assert.equal(moved.targetId, o.targetId);
  assert.equal(worldHash(own1), worldHash(own2)); assert.notEqual(worldHash(own1), worldHash(plainFork));
  assert.deepEqual(runFork(own1, e.id, horizons), runFork(own2, e.id, horizons));
  // a point forked whole: every option or null, the given salts each; only the food options when asked
  const whole = forkPoint(b, parent.modelPolicy.mode, e.id, () => true, [1, 2], [8]);
  assert.equal(whole.forks.length, b.options.length); assert.equal(whole.n, whole.forks.filter(Boolean).length * 2);
  assert.ok(whole.forks.every(f => f === null || (f.length === 2 && f.every(r => r.r.length === 1))));
  const none = forkPoint(b, parent.modelPolicy.mode, e.id, f => f === 'no such kind', [1], [8]);
  assert.ok(none.forks.every(f => f === null) && none.n === 0);
  assert.equal(worldHash(b.world), baseHash);
  // and the parent, run on to a later tick, is the plain run of the same length
  const plain = structuredClone(base());
  while (plain.tick < parent.tick) tickWorld(plain);
  assert.equal(worldHash(parent), worldHash(plain), 'the parent is the plain rules world');
});

// ---------------------------------------------------------------------------------------------------------------------
// The readouts on hand-made scores
// ---------------------------------------------------------------------------------------------------------------------

test('winners, halves, repeats, chance, the distinguishability test and its noise rate, the variance between options', () => {
  assert.equal(halves().length, 35); assert.deepEqual(halves()[0], [[0, 1, 2, 3], [4, 5, 6, 7]]);
  assert.ok(halves().every(([a, b]) => a.length === 4 && b.length === 4 && a[0] === 0 && new Set([...a, ...b]).size === 8));
  const clear = [[1, 1.1, 0.9, 1, 1.05, 0.95, 1, 1], [5, 5.1, 4.9, 5, 5.05, 4.95, 5, 5], [3, 3, 3, 3, 3, 3, 3, 3]];
  assert.equal(winnerOf(clear), 1); assert.equal(winnerOf(clear, [0, 1, 2, 3]), 1);
  assert.equal(repeats(clear, [0, 1, 2, 3], [4, 5, 6, 7]), true); assert.equal(repeatsAllSplits(clear), 1);
  assert.deepEqual(standsOut(clear), { winner: 1, runnerUp: 2, distinguishable: true });
  // the first half says option 0, the second option 1: no repeat; as kinds (both "rest") it repeats
  const flip = [[9, 9, 9, 9, 0, 0, 0, 0], [0, 0, 0, 0, 9, 9, 9, 9], [1, 1, 1, 1, 1, 1, 1, 1]];
  assert.equal(repeats(flip, [0, 1, 2, 3], [4, 5, 6, 7]), false);
  assert.equal(repeats(flip, [0, 1, 2, 3], [4, 5, 6, 7], i => ['rest', 'rest', 'feed'][i]), true);
  assert.equal(standsOut(flip).distinguishable, false, 'means 4.5 and 4.5 against 1 with a large spread: the top two are not told apart');
  // ties go to the first option; a missing replicate is left out of the mean; an option with no value in a half gives no answer
  assert.equal(winnerOf([[2, 2], [2, 2]]), 0);
  assert.equal(winnerOf([[1, null, 1], [0, 9, 0]]), 1);
  assert.equal(repeats([[1, 1, 1, 1, null, null, null, null], [0, 0, 0, 0, 0, 0, 0, 0]], [0, 1, 2, 3], [4, 5, 6, 7]), null);
  // chance: 1 / options; for kinds the sum of squared shares of the menu
  assert.equal(chanceRepeat(4), 0.25); near(chanceRepeat(4, i => ['a', 'a', 'b', 'c'][i]), 0.25 + 0.0625 + 0.0625);
  // with kinds, the runner-up is the best option of another kind
  const kinds = (i: number) => ['feed', 'feed', 'rest'][i];
  const s = standsOut([[5, 5, 5.1, 4.9, 5, 5, 5, 5], [4.99, 5, 5, 5, 5, 5.1, 4.9, 5], [1, 1, 1.1, 0.9, 1, 1, 1, 1]], kinds);
  assert.equal(s.winner, 0); assert.equal(s.runnerUp, 2); assert.equal(s.distinguishable, true);
  assert.equal(standsOut([[1, 2], [2, 3]], () => 'one kind').distinguishable, null);
  // pure noise: with two options the test fires at about its one-sided level (2.5%); with more, the runner-up is the
  // closest of the rest, so it fires less often, and the noise rate measures that instead of assuming it
  const rng = mulberry32(5), two = Array.from({ length: 2 }, () => Array.from({ length: 8 }, () => rng())), six = Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => rng()));
  const rate2 = noiseRate(two, mulberry32(9), undefined, 4000)!, rate6 = noiseRate(six, mulberry32(9), undefined, 4000)!;
  assert.ok(rate2 > 0.03 && rate2 < 0.08, `the noise rate of two options is ${rate2}`); // either option can be the winner: twice the one-sided level
  assert.ok(rate6 >= 0 && rate6 < rate2, `the noise rate of six options is ${rate6}`);
  assert.equal(noiseRate([[1, 2], [2, 3]], mulberry32(9), () => 'one kind'), null);
  // the variance between options: all of it, or what noise gives
  near(betweenShare([[1, 1, 1], [5, 5, 5]])!.share, 1); near(betweenShare([[1, 1, 1], [5, 5, 5]])!.noise, 1 / 5);
  assert.equal(betweenShare([[2, 2], [2, 2]]), null);
  near(betweenShare([[0, 2], [0, 2]])!.share, 0);
});

const T0: Terms = [0, 0, 1, 0, 0];
/** A replicate whose water term at both horizons is `water` and whose heat term is `heat`. */
const rep = (water: number, heat = 0): Replicate => ({ r: [{ z: [0, 0, water, 0, heat], meanD: Math.hypot(water, heat), meanSq: water * water + heat * heat, injury: 0, health: 0 }, { z: [0, 0, water, 0, heat], meanD: Math.hypot(water, heat), meanSq: water * water + heat * heat, injury: 0, health: 0 }], diedAt: null, held: 10 });
const point = (id: number, forks: (Replicate[] | null)[], families: string[], mode: 'main' | 'food' = 'main', took = 0): PointFile => ({ seed: 48, tick: 1000 + id, id, name: `a${id}`, cls: 'adult male', sex: 'male', age: 20, mode, why: 'ended', u: 0,
  hour: 10, phase: 'day', temperature: 25, z0: T0, options: families.map((family, i) => ({ action: 'rest', targetId: i, family })), rulesTook: took, rulesTop: 0, forks, ms: { prepare: 10, copy: 80, run: 800, forks: forks.filter(Boolean).length * 8 } });
const eight = (f: (r: number) => Replicate) => Array.from({ length: 8 }, (_, r) => f(r));

test('the readout of a question: repeat, the rules, the terms, the variants and the registered readings on points with known answers', () => {
  // ten points where a drink clearly wins (water 0.1 against 0.9 for the rest, a little replicate noise), the rules took the rest
  const clearPts = Array.from({ length: 10 }, (_, k) => point(k, [eight(r => rep(0.9 + 0.001 * r)), eight(r => rep(0.1 + 0.001 * r)), null], ['rest', 'drink', 'feed']));
  for (const p of clearPts) assert.ok(reads(p, 'kinds') && !reads(p, 'food'));
  const a = readout(clearPts, 'kinds', 0);
  assert.equal(a.points, 10); assert.equal(a.animals, 10); assert.equal(a.meanOptions, 2, 'an option that could not be applied takes no part');
  assert.equal(a.repeat.share, 1); assert.equal(a.repeatAllSplits, 1); near(a.chance, 0.5); assert.equal(a.repeatOption!.share, 1);
  assert.equal(a.distinguishable.share, 1); assert.equal(a.repeatAmongDistinguishable.share, 1);
  assert.equal(a.rulesTook.share, 0, 'the winner is never the option the rules took'); assert.equal(a.rulesToldWorse.share, 1); assert.equal(a.rulesTookKind!.share, 0);
  assert.deepEqual(a.winnerKinds, { drink: 10 }); assert.deepEqual(a.rulesKinds, { rest: 10 });
  assert.equal(a.f1, true); assert.equal(a.f2, false, 'the narrower claim is read only where the first fails');
  assert.equal(a.f3, false, 'no scale decides between a drink and a rest that differ in water alone'); assert.equal(a.f3On, 'all');
  const water = a.terms.find(t => t.term === 'water')!, heat = a.terms.find(t => t.term === 'heat')!;
  assert.ok(water.between! > 0.99 && water.repeat.share === 1 && heat.between === null && heat.varies === 0);
  near(scoresOf(clearPts[0], 'kinds', 0, { kind: 'scale', v: REGISTERED }).scores[1][0]!, 1 - 0.1);
  assert.equal(acrossHorizons(clearPts, 'kinds').share, 1);

  // forty points where the winner depends on the exchange rate between water and heat: rest leaves water 0.5, the trip leaves heat 0.6
  const trade = Array.from({ length: 40 }, (_, k) => point(100 + k, [eight(r => rep(0.5 + 0.0001 * r, 0)), eight(r => rep(0, 0.6 + 0.0001 * r))], ['rest', 'food-trip']));
  const t = readout(trade, 'kinds', 1);
  assert.deepEqual(t.winnerKinds, { rest: 40 }); assert.equal(t.distinguishable.yes, 40); assert.equal(t.f3On, 'distinguishable');
  const hx05 = t.variants.find(v => v.id === 'heat-x0.5')!, wx2 = t.variants.find(v => v.id === 'water-x2')!, sx2 = t.variants.find(v => v.id === 'sleep-x2')!;
  assert.equal(hx05.flipsAmongDistinguishable.share, 1, 'heat counted half: the trip wins everywhere'); assert.deepEqual(hx05.winnerKinds, { 'food-trip': 40 });
  assert.equal(wx2.flips.share, 1); assert.equal(sx2.flips.share, 0);
  assert.equal(t.f3, true, 'a score whose winner turns on one scale is an exchange rate'); assert.equal(t.f3Worst!.share, 1);
  assert.equal(t.variants.length, 12);

  // noise: every option the same distribution, so the halves agree at about chance and the first reading fails
  const rng = mulberry32(77), noisy = Array.from({ length: 60 }, (_, k) => point(200 + k, [eight(() => rep(rng())), eight(() => rep(rng())), eight(() => rep(rng())), eight(() => rep(rng()))], ['rest', 'feed', 'drink', 'nest']));
  const n = readout(noisy, 'kinds', 0);
  assert.ok(n.repeat.share! < 0.5 && n.repeat.share! > 0.05, `repeat on noise is ${n.repeat.share}`); near(n.chance, 0.25);
  assert.equal(n.f1, false); assert.equal(n.f2, false);
  assert.ok(n.distinguishable.share! < 0.2 && n.noiseRate! >= 0 && n.noiseRate! < 0.1 && n.repeat.ci![0] <= n.repeat.share! && n.repeat.ci![1] >= n.repeat.share!);

  // which food: read where two or more food options were forked, main sample or supplement; the options themselves are compared
  const food = [point(300, [eight(() => rep(0.5)), eight(() => rep(0.2)), eight(() => rep(0.4))], ['rest', 'feed', 'food-trip']), point(301, [null, eight(() => rep(0.3)), eight(() => rep(0.1))], ['rest', 'food-trip', 'food-trip'], 'food', 1), point(302, [eight(() => rep(0.3)), eight(() => rep(0.1))], ['rest', 'feed'])];
  assert.deepEqual(food.map(p => reads(p, 'food')), [true, true, false]); assert.deepEqual(food.map(p => reads(p, 'kinds')), [true, false, true]);
  const f = readout(food, 'food', 0);
  assert.equal(f.points, 2); assert.equal(f.meanOptions, 2); assert.equal(f.repeat.share, 1); assert.deepEqual(f.winnerKinds, { feed: 1, 'food-trip': 1 });
  assert.equal(f.rulesTook.n, 1, 'the rules\' option counts only where it is among the options read'); assert.equal(f.rulesTook.share, 0);

  // deaths and cost
  const dead = point(400, [[...eight(() => rep(0.5)).slice(0, 7), { r: [null, null], diedAt: 100, held: 100 }], eight(() => rep(0.4))], ['rest', 'feed']);
  const c = costs([dead, ...food]);
  assert.equal(c.died, 1); assert.equal(c.diedBy3h, 1); assert.equal(c.notApplicable, 0); assert.equal(c.points, 4);
  assert.equal(readout([dead], 'kinds', 0).repeat.n, 1, 'a replicate that died is left out of its option\'s mean');
});
