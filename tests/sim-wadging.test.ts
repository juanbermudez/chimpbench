// Stage E1v (docs/staging/e1v-prereg.md §2, §5): wadging as an input range. A share 1 − pithFibreSwallowed of the
// fallback's pith fibre (NDF) is spat out before the gut: it leaves the dry matter and fibre swallowed, and with it the
// energy its fermentation would have yielded; the soluble part of the pith and the leaves are swallowed as before, and
// intake (formula kcal handled per feeding minute) is unchanged. 1 = today.
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { dryMatterPerKcal, eat, energyTap, fallbackKcalPerH, gutRoom, ledgerOf, plantKcalPerMin, swallowedPerKcal } from '../src/sim/energy';
import { paramsOf, type Overrides, type Params } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { foodWater } from '../src/sim/water';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { classify, type RegistryEntry } from '../scripts/lib/prescriptions';
import { loadEntries, prescriptionCount } from '../scripts/prescription-ledger';
import { dietOf, gutCeiling, withParams } from '../scripts/lib/gut-ceiling';
import { sameTime, wadged } from '../scripts/e1u-gut-sensitivity';
import { fnv, worldHash } from './fixtures/golden';

/** S39 (bench-run artifacts/validation/e/runs/M6-S39/params.json), the stack the arms run on. */
const S39: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1,
  ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1,
  ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1,
  nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1,
  socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };
/** The digesta switches of S39 that the gut reads (for the pure checks; no tick). */
const GUT: Overrides = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerFoodEnergyFix: 1, ledgerInfantIntake: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1 };

/** The pith part's fibre, g per feeding minute: the registry composite's weighting (pith 17.4 of 24.3 feeding minutes at 1.8 g/min and 58.1% NDF). */
const PITH_NDF_PER_MIN = 17.4 / 24.3 * 1.8 * 0.581;
const withShare = (P: Params, s: number) => ({ ...P, pithFibreSwallowed: s }) as Params;
let gutWorld: World | null = null;
const gw = () => gutWorld ??= createWorld(48, { profile: 'compressed', params: GUT });

/** S39's seed-48 field world saved at tick 6720 (10:30 of day 2), made once. */
let morningSrc: string | null = null;
const morning = () => {
  if (morningSrc === null) {
    const w = createWorld(48, { profile: 'field', params: S39 });
    for (let i = 0; i < 6720; i++) tickWorld(w);
    morningSrc = JSON.stringify(w);
  }
  return morningSrc;
};
/** A saved world, its overrides changed before anything reads its parameters. */
function load(src: string, over: Overrides = {}): World {
  const w = JSON.parse(src) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...over };
  return w;
}
/** Every living animal's decision values (action, target, score), hashed (as tests/sim-gut-value.test.ts). */
function decisions(w: World): string {
  const out: Candidate[] = [], parts: string[] = [];
  for (const c of w.chimps) { if (!c.alive) continue; computeCandidates(w, c, out); for (const q of out) parts.push(`${c.id}|${q.action}|${q.targetId}|${q.score}`); }
  return fnv(parts.join('\n'));
}
const ticked = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };

test('pithFibreSwallowed is 1 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).pithFibreSwallowed, 1, profile);
});

test('at 1: S39\'s world and every animal\'s decision values are today\'s (recorded at 137d5aa, before any E1v code)', () => {
  const src = morning();
  assert.equal(worldHash(JSON.parse(src) as World), 'be3269e9cc69f676');
  assert.equal(decisions(load(src)), '93ced3a9df1c66ce');
  // six hours on from the saved world, in which six animals eat 698 kcal of fallback
  for (const over of [{}, { pithFibreSwallowed: 1 }]) {
    const w = ticked(load(src, over), 1440);
    assert.equal(worldHash(w), 'f57cf21e1f863541', JSON.stringify(over));
    assert.equal(decisions(w), '0ff4d71478f53323', JSON.stringify(over));
  }
});

test('below 1 the share acts only through what is swallowed: the saved world\'s decision values are unchanged until fallback is eaten', () => {
  const src = morning();
  assert.equal(decisions(load(src, { pithFibreSwallowed: 0.5 })), '93ced3a9df1c66ce');
  assert.notEqual(worldHash(ticked(load(src, { pithFibreSwallowed: 0.5 }), 1440)), 'f57cf21e1f863541', 'the share acts on this world');
});

test('at 0.5 and 0.25 the fallback swallowed loses the pith fibre × (1 − share) from its dry matter and fibre; the leaves, the soluble part and the other foods are untouched', () => {
  const P = paramsOf(gw()), a = swallowedPerKcal(P, 'fallback')!, K = plantKcalPerMin(P, 'fallback'), pith = PITH_NDF_PER_MIN / K;
  assert.ok(Math.abs(a.g * K - P.digestaFallbackDmGPerMin) < 1e-12 && Math.abs(a.fib / a.g - P.digestaFallbackNdf) < 1e-12, 'at 1 the composite as the registry gives it');
  const perMin: Record<number, [number, number]> = {};
  for (const s of [0.5, 0.25]) {
    const Q = withShare(P, s), b = swallowedPerKcal(Q, 'fallback')!;
    assert.ok(Math.abs(a.g - b.g - (1 - s) * pith) < 1e-12, `${s}: dry matter`);
    assert.ok(Math.abs(a.fib - b.fib - (1 - s) * pith) < 1e-12, `${s}: fibre`);
    assert.equal(b.nf, a.nf, `${s}: the non-fibre energy (the soluble part) is swallowed as before`);
    assert.ok(Math.abs((b.fib - s * pith) - (a.fib - pith)) < 1e-12, `${s}: the leaves' fibre is untouched`);
    for (const k of ['drupe', 'fig', 'meat', 'milk'] as const) assert.deepEqual(swallowedPerKcal(Q, k), swallowedPerKcal(P, k), `${s}: ${k}`);
    // intake, the dry matter handled and the food's water are unchanged
    assert.equal(fallbackKcalPerH(Q), fallbackKcalPerH(P));
    assert.equal(dryMatterPerKcal(Q, 'fallback'), dryMatterPerKcal(P, 'fallback'));
    assert.equal(foodWater(Q, 100, 'fallback'), foodWater(P, 100, 'fallback'));
    perMin[s] = [b.g * K, b.fib * K];
  }
  // the log's numbers (e1v-prereg.md §7.1): 1.516 and 1.328 g of dry matter, 0.635 and 0.448 g of NDF per feeding minute
  assert.deepEqual([perMin[0.5], perMin[0.25]].map(v => v.map(x => +x.toFixed(3))), [[1.516, 0.635], [1.328, 0.448]]);
});

test('absorbed energy per gram of swallowed fibre rises as less is swallowed; per kcal handled it falls by the fermentation of the fibre spat out', () => {
  const P = paramsOf(gw()), Y = P.digestaFermentKcalPerG, d = P.digestaNdfDigestibility, pith = PITH_NDF_PER_MIN / plantKcalPerMin(P, 'fallback');
  const absorbed = (s: number) => { const f = swallowedPerKcal(withShare(P, s), 'fallback')!; return { perKcal: f.nf + Y * d * f.fib, perFibre: (f.nf + Y * d * f.fib) / f.fib }; };
  const [one, half, quarter] = [1, 0.5, 0.25].map(absorbed);
  assert.ok(quarter.perFibre > half.perFibre && half.perFibre > one.perFibre, `${one.perFibre} → ${half.perFibre} → ${quarter.perFibre}`);
  for (const [s, r] of [[0.5, half], [0.25, quarter]] as const) assert.ok(Math.abs(one.perKcal - r.perKcal - Y * d * (1 - s) * pith) < 1e-12, `${s}`);
});

test('eating at 0.5: the foregut fills by the dry matter swallowed and the books take its fibre; the formula energy handled is booked in full', () => {
  const W = gw(), P = paramsOf(W), Q = withShare(P, 0.5);
  const base = W.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && !c.lactating)!;
  ledgerOf(base, P);
  const run = (X: Params) => {
    const c = structuredClone(base) as Chimp, L = ix(c).en!;
    L.dm = 0; L.fib = 0; L.gut = 0;
    const room = gutRoom(c, X, 'fallback'), before = { ...L }, taps: number[] = [];
    energyTap.fn = (_c, term, kcal, kind) => { if (term === 'eaten' && kind === 'fallback') taps.push(kcal); };
    try { assert.equal(eat(c, X, 100, 'fallback'), 100); } finally { energyTap.fn = null; }
    return { room, dm: L.dm! - before.dm!, fib: L.fib! - before.fib!, gut: L.gut - before.gut, kin: L.in - before.in, fin: L.fin! - before.fin!, dmIn: L.dmIn! - before.dmIn!, taps };
  };
  const p = run(P), q = run(Q), f = swallowedPerKcal(Q, 'fallback')!, g = swallowedPerKcal(P, 'fallback')!;
  assert.ok(Math.abs(q.dm - 100 * f.g) < 1e-9 && Math.abs(q.dmIn - q.dm) < 1e-12 && Math.abs(q.fib - 100 * f.fib) < 1e-9, 'dry matter and fibre swallowed');
  assert.ok(Math.abs(q.kin - 100 * (f.nf + P.digestaFermentKcalPerG * f.fib)) < 1e-9, 'energy in: non-fibre plus the fibre swallowed at its yield');
  assert.equal(q.gut, p.gut, 'the non-fibre energy is the same');
  assert.deepEqual([q.fin, p.fin, q.taps, p.taps], [100, 100, [100], [100]], 'the formula energy handled is booked in full');
  assert.ok(q.dm < p.dm && q.fib < p.fib && q.kin < p.kin);
  assert.ok(Math.abs(q.room / p.room - g.g / f.g) < 1e-12, 'more of the fallback fits in the foregut\'s room');
});

test('determinism at 0.25: the same world whatever the batching, and a save resumes exactly', () => {
  const src = morning();
  const a = ticked(load(src, { pithFibreSwallowed: 0.25 }), 1440);
  const b = load(src, { pithFibreSwallowed: 0.25 });
  for (let i = 0; i < 180; i++) stepWorld(b, 2);
  assert.equal(worldHash(b), worldHash(a));
  const c = ticked(load(src, { pithFibreSwallowed: 0.25 }), 720), copy = JSON.parse(JSON.stringify(c)) as World;
  assert.equal(worldHash(ticked(copy, 720)), worldHash(a));
  assert.notEqual(worldHash(a), 'f57cf21e1f863541');
});

test('inert without the digesta gut (energyLedger alone), active with it (compressed worlds, 12 h)', () => {
  const run = (params: Overrides) => worldHash(ticked(createWorld(7, { params }), 12 * 240));
  assert.equal(run({ energyLedger: 1, pithFibreSwallowed: 0.25 }), run({ energyLedger: 1 }));
  assert.notEqual(run({ energyLedger: 1, ledgerDigesta: 1, pithFibreSwallowed: 0.25 }), run({ energyLedger: 1, ledgerDigesta: 1 }));
});

test('the offline gut ceiling follows the parameter and reproduces E1u\'s wadging arithmetic (feeding time held)', () => {
  const W = gw(), P = paramsOf(W), c = W.chimps.find(k => k.alive && k.sex === 'female' && k.age >= 15 && !k.lactating)!, diet = dietOf(0.3, 0.25);
  const base = gutCeiling(c, P, diet);
  let last = base.net;
  for (const s of [0.5, 0.25]) {
    const A = gutCeiling(c, withParams(P, { pithFibreSwallowed: s }), diet), E = wadged(P, 1 - s), B = gutCeiling(c, E, sameTime(P, E, diet));
    for (const k of ['absorbed', 'fermented', 'tef', 'net', 'dm', 'fibIn', 'fecG'] as const) assert.ok(Math.abs(A[k] / B[k] - 1) < 1e-9, `${s}: ${k} ${A[k]} vs ${B[k]}`);
    assert.ok(A.net > last, `${s}: the ceiling rises as less fibre is swallowed`);
    last = A.net;
  }
});

test('the prescription ledger classes it as an input (a design assumption) and S39\'s count does not move at 0.5 or 0.25', () => {
  const e = loadEntries().find(x => x.id === 'pithFibreSwallowed') as RegistryEntry;
  const k = classify(e);
  assert.equal(k.cls, 'input');
  assert.match(k.reason, /design assumption/);
  assert.equal(e.evidence, 'design');
  const s39 = prescriptionCount(S39).total;
  for (const s of [0.5, 0.25]) assert.equal(prescriptionCount({ ...S39, pithFibreSwallowed: s }).total, s39, `${s}`);
});
