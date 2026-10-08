// Stage E1x (docs/staging/e1x-prereg.md §2, §4, §6): two unmeasured scalings of the body with its size, built as input
// ranges whose defaults are today's behaviour. gutSizeExp (1): the power of body mass the gut's capacity follows below
// the adult female mass. walkCostSizeExp (0): the power the cost of walking per kg and metre follows below it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { digestaCaps, eat, energyTick, gutCap, gutRoom, gutSizeKg, ledgerOf, loadKcal, locomotionKcal, massOf } from '../src/sim/energy';
import { paramsOf, type Overrides, type Params } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { classify, type RegistryEntry } from '../scripts/lib/prescriptions';
import { loadEntries, prescriptionCount } from '../scripts/prescription-ledger';
import { dietOf, gutCeiling, withParams } from '../scripts/lib/gut-ceiling';
import { ARMS, MASSES, TAYLOR_EXP, VARIANTS, atMass, cellOf, sizeFactor, walkFactor, TRAVEL, FIG } from '../scripts/e1x-small-body';
import { fnv, worldHash } from './fixtures/golden';

/** S39 (as tests/sim-wadging.test.ts), the stack the arms run on. */
const S39: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1,
  ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1,
  ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1,
  nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1,
  socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };
/** The switches of S39 the gut and the mass read (for the pure checks; no tick). */
const GUT: Overrides = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerFoodEnergyFix: 1, ledgerInfantIntake: 1, ledgerGrowSurplus: 1, ledgerGrowPotential: 1, ledgerLactGut: 1 };
const ENDS: Overrides = { gutSizeExp: 0.75, walkCostSizeExp: -0.316 };
const withP = (P: Params, over: Overrides) => withParams(P, over as Partial<Record<keyof Params, number>>);

let gutWorld: World | null = null;
const gw = () => gutWorld ??= createWorld(48, { profile: 'compressed', params: GUT });
/** A copy of an animal of the world with its ledger mass set (the ledger opened first). */
const sized = (W: World, pick: (c: Chimp) => boolean, kg?: number): Chimp => {
  const P = paramsOf(W), c = W.chimps.find(k => k.alive && pick(k))!;
  ledgerOf(c, P);
  return kg === undefined ? structuredClone(c) : atMass(c, P, kg);
};
const juvenileF = (c: Chimp) => c.sex === 'female' && c.age > 5 && c.age < 12;
const adultF = (c: Chimp) => c.sex === 'female' && c.age >= 15 && !c.lactating && !(c.pregnancy > 0);

/** S39's seed-48 field world saved at tick 6720 (10:30 of day 2), made once (as tests/sim-wadging.test.ts). */
let morningSrc: string | null = null;
const morning = () => {
  if (morningSrc === null) {
    const w = createWorld(48, { profile: 'field', params: S39 });
    for (let i = 0; i < 6720; i++) tickWorld(w);
    morningSrc = JSON.stringify(w);
  }
  return morningSrc;
};
function load(src: string, over: Overrides = {}): World {
  const w = JSON.parse(src) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...over };
  return w;
}
function decisions(w: World): string {
  const out: Candidate[] = [], parts: string[] = [];
  for (const c of w.chimps) { if (!c.alive) continue; computeCandidates(w, c, out); for (const q of out) parts.push(`${c.id}|${q.action}|${q.targetId}|${q.score}`); }
  return fnv(parts.join('\n'));
}
const ticked = (w: World, n: number) => { for (let i = 0; i < n; i++) tickWorld(w); return w; };

test('the defaults are today\'s values in both profiles: gutSizeExp 1, walkCostSizeExp 0', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.gutSizeExp, 1, profile);
    assert.equal(P.walkCostSizeExp, 0, profile);
  }
});

test('at the defaults S39\'s world and every animal\'s decision values are today\'s (the pins of tests/sim-wadging.test.ts, recorded at 137d5aa)', () => {
  const src = morning();
  assert.equal(worldHash(JSON.parse(src) as World), 'be3269e9cc69f676');
  assert.equal(decisions(load(src)), '93ced3a9df1c66ce');
  for (const over of [{}, { gutSizeExp: 1, walkCostSizeExp: 0 }]) {
    const w = ticked(load(src, over), 1440);
    assert.equal(worldHash(w), 'f57cf21e1f863541', JSON.stringify(over));
    assert.equal(decisions(w), '0ff4d71478f53323', JSON.stringify(over));
  }
});

test('gutSizeExp: below the adult female mass both pools grow by exactly (31.3 ÷ mass)^(1 − exponent); at or above it nothing moves', () => {
  const W = gw(), P = paramsOf(W), ref = P.ledgerMassFemaleKg;
  assert.equal(ref, 31.3);
  for (const e of [0.75, 0.875]) {
    const Q = withP(P, { gutSizeExp: e });
    const got: number[] = [];
    for (const kg of MASSES) {
      const c = sized(W, juvenileF, kg), [f0, h0] = digestaCaps(c, P), [f1, h1] = digestaCaps(c, Q), want = Math.pow(ref / kg, 1 - e);
      assert.ok(Math.abs(f1 / f0 - want) < 1e-12 && Math.abs(h1 / h0 - want) < 1e-12, `${e}, ${kg} kg: ${f1 / f0} against ${want}`);
      assert.ok(Math.abs(gutCap(c, Q) / gutCap(c, P) - want) < 1e-12, `${e}, ${kg} kg: the capacity the intake valuation reads`);
      assert.ok(Math.abs(gutSizeKg(c, Q) - ref * Math.pow(kg / ref, e)) < 1e-12 && gutSizeKg(c, P) === kg);
      assert.equal(sizeFactor(P, kg, e), want, 'the offline script\'s factor is the same');
      got.push(+(f1 / f0).toFixed(3));
    }
    // the registered factors (e1x-prereg.md §2.1): × 1.183, 1.148 and 1.105 at 16, 18 and 21 kg at 0.75
    if (e === 0.75) assert.deepEqual(got, [1.183, 1.148, 1.105]);
    // an animal at the reference mass, an adult of each sex, a male between the two adult masses, a lactating female
    const same: [string, Chimp][] = [['at 31.3 kg', sized(W, juvenileF, ref)], ['adult female', sized(W, adultF)], ['adult male', sized(W, c => c.sex === 'male' && c.age >= 16)],
      ['male of 35 kg', sized(W, c => c.sex === 'male' && c.age > 5 && c.age < 12, 35)], ['lactating female', sized(W, c => c.sex === 'female' && c.lactating)]];
    for (const [who, c] of same) {
      assert.ok(massOf(c, P) >= ref, who);
      assert.deepEqual(digestaCaps(c, Q), digestaCaps(c, P), `${e}: ${who}`);
      assert.equal(gutCap(c, Q), gutCap(c, P), `${e}: ${who}`);
    }
  }
});

test('gutSizeExp 0.75: a small animal\'s foregut takes exactly that much more food, and the hindgut brake reads the larger pool', () => {
  const W = gw(), P = paramsOf(W), Q = withP(P, { gutSizeExp: 0.75 }), want = Math.pow(31.3 / 16, 0.25);
  const fill = (X: Params) => {
    const c = sized(W, juvenileF, 16), L = ix(c).en!;
    L.dm = 0; L.fib = 0; L.gut = 0; L.hind = 0;
    const room = gutRoom(c, X, 'drupe'), took = eat(c, X, 1e6, 'drupe');
    return { room, took, dm: L.dm!, cap: digestaCaps(c, X) };
  };
  const p = fill(P), q = fill(Q);
  assert.ok(Math.abs(q.room / p.room - want) < 1e-12 && Math.abs(q.took / p.took - want) < 1e-12);
  assert.ok(Math.abs(p.dm - p.cap[0]) < 1e-9 && Math.abs(q.dm - q.cap[0]) < 1e-9, 'eating stops at the foregut\'s capacity');
  // one tick with a hindgut filled past today's capacity: today the foregut is held, at 0.75 it empties
  const tickOnce = (X: Overrides) => {
    const w = createWorld(48, { profile: 'compressed', params: { ...GUT, ...X } }), PX = paramsOf(w), c = w.chimps.find(k => k.alive && juvenileF(k))!, L = ledgerOf(c, PX);
    L.kg = 16;
    const [capF, capH0] = digestaCaps(c, paramsOf(gw()));
    L.dm = capF / 2; L.fib = capF / 4; L.gut = 100; L.hind = capH0 * 1.05;
    const before = L.fib;
    energyTick(w, c, ix(c), false);
    return before - L.fib!;
  };
  assert.equal(tickOnce({}), 0, 'today: a full hindgut holds the foregut');
  assert.ok(tickOnce({ gutSizeExp: 0.75 }) > 0, 'at 0.75 the same fibre fits');
});

test('walkCostSizeExp: below the adult female mass walking costs exactly (mass ÷ 31.3)^exponent more per kg and metre; adults, climbing and carried loads do not move', () => {
  const W = gw(), P = paramsOf(W), Q = withP(P, { walkCostSizeExp: TAYLOR_EXP }), ref = P.ledgerMassFemaleKg;
  assert.equal(TAYLOR_EXP, -0.316);
  const perKgM: number[] = [];
  for (const kg of MASSES) {
    const c = sized(W, juvenileF, kg), a = locomotionKcal(c, P, 1000, 0), b = locomotionKcal(c, Q, 1000, 0), want = Math.pow(kg / ref, TAYLOR_EXP);
    assert.ok(Math.abs(a - 1000 * P.ledgerWalkJPerKgM / 4184 * kg) < 1e-9, `${kg} kg: today's cost`);
    assert.ok(Math.abs(b / a - want) < 1e-12, `${kg} kg: ${b / a} against ${want}`);
    assert.equal(walkFactor(P, kg, TAYLOR_EXP), want, 'the offline script\'s factor is the same');
    assert.equal(locomotionKcal(c, Q, 0, 50), locomotionKcal(c, P, 0, 50), `${kg} kg: climbing`);
    perKgM.push(+(P.ledgerWalkJPerKgM * b / a).toFixed(1));
  }
  // the registered values (e1x-prereg.md §5.3): 4.7, 4.5 and 4.3 J per kg and metre at 16, 18 and 21 kg
  assert.deepEqual(perKgM, [4.7, 4.5, 4.3]);
  const mother = sized(W, adultF), male = sized(W, c => c.sex === 'male' && c.age >= 16), infant = sized(W, c => c.age < 3);
  for (const c of [sized(W, juvenileF, ref), mother, male]) assert.equal(locomotionKcal(c, Q, 1000, 30), locomotionKcal(c, P, 1000, 30));
  // a load: the rider's mass at its carrier's cost; today's value for an adult carrier, whatever the rider weighs
  assert.ok(massOf(infant, P) < ref);
  assert.equal(loadKcal(infant, mother, P, 200, 12), locomotionKcal(infant, P, 200, 12), 'at 0 a load costs what today\'s formula gives');
  assert.equal(loadKcal(infant, mother, Q, 200, 12), loadKcal(infant, mother, P, 200, 12), 'an adult carrier pays today\'s cost');
  assert.ok(locomotionKcal(infant, Q, 200, 12) > loadKcal(infant, mother, Q, 200, 12), 'the same infant on its own legs pays the size term');
});

test('walkCostSizeExp −0.316: the tick charges a 16 kg walker the size term on the ground and nothing more for the climb', () => {
  const run = (over: Overrides) => {
    const w = createWorld(48, { profile: 'compressed', params: { ...GUT, ...over } }), P = paramsOf(w), still = createWorld(48, { profile: 'compressed', params: { ...GUT, ...over } });
    const setup = (W: World) => { const c = W.chimps.find(k => k.alive && juvenileF(k))!, L = ledgerOf(c, P); L.kg = 16; c.action = 'rest'; c.position[1] = 0; L.x = c.position[0]; L.y = 0; L.z = c.position[2]; return { c, L }; };
    w.ageRate = 0; still.ageRate = 0; // no growth in the window, so the mass stays 16 kg
    const a = setup(w), b = setup(still);
    for (let i = 0; i < 100; i++) { a.c.position[0] += 1; a.c.position[1] += 0.1; energyTick(w, a.c, ix(a.c), false); energyTick(still, b.c, ix(b.c), false); }
    return { extra: (a.L.out - b.L.out) * 4184, P };
  };
  const today = run({}), end = run({ walkCostSizeExp: -0.316 }), P = today.P, climb = 10 * 16 * 9.81 / P.ledgerClimbEff;
  assert.ok(Math.abs(today.extra - (100 * P.ledgerWalkJPerKgM * 16 + climb)) < 1e-6 * today.extra, `${today.extra} J`);
  assert.ok(Math.abs(end.extra - (100 * P.ledgerWalkJPerKgM * 16 * Math.pow(16 / 31.3, -0.316) + climb)) < 1e-6 * end.extra, `${end.extra} J`);
});

test('at the range ends the run is deterministic whatever the batching, a save resumes exactly, and the world is not today\'s', () => {
  const src = morning();
  const a = ticked(load(src, ENDS), 1440);
  const b = load(src, ENDS);
  for (let i = 0; i < 180; i++) stepWorld(b, 2);
  assert.equal(worldHash(b), worldHash(a));
  const c = ticked(load(src, ENDS), 720), copy = JSON.parse(JSON.stringify(c)) as World;
  assert.equal(worldHash(ticked(copy, 720)), worldHash(a));
  assert.notEqual(worldHash(a), 'f57cf21e1f863541');
  // each input acts on this world by itself
  for (const over of [{ gutSizeExp: 0.75 }, { walkCostSizeExp: -0.316 }]) assert.notEqual(worldHash(ticked(load(src, over), 1440)), 'f57cf21e1f863541', JSON.stringify(over));
});

test('each is inert without the switches it reads with, and active with them (compressed worlds, 12 h)', () => {
  const run = (params: Overrides) => worldHash(ticked(createWorld(7, { params }), 12 * 240));
  const plain = run({});
  assert.equal(run({ gutSizeExp: 0.75, walkCostSizeExp: -0.316 }), plain, 'today\'s model reads neither');
  assert.equal(run({ energyLedger: 1, gutSizeExp: 0.75 }), run({ energyLedger: 1 }), 'no dry-matter gut: gutSizeExp is not read');
  assert.notEqual(run({ energyLedger: 1, ledgerDigesta: 1, gutSizeExp: 0.75 }), run({ energyLedger: 1, ledgerDigesta: 1 }));
  assert.notEqual(run({ energyLedger: 1, walkCostSizeExp: -0.316 }), run({ energyLedger: 1 }));
});

test('the offline tool follows the parameters and equals the registered arithmetic (e1x-prereg.md §5): variants and arms', () => {
  const W = gw(), P = paramsOf(W), fruit = dietOf(0, FIG), lean = dietOf(0.29, FIG);
  const adult = sized(W, adultF);
  for (const [key, over] of [['gut075', { gutSizeExp: 0.75 }], ['gut0875', { gutSizeExp: 0.875 }], ['walkTaylorRef', { walkCostSizeExp: -0.316 }]] as const) {
    const v = VARIANTS.find(x => x.key === key)!, Q = withP(P, over);
    for (const kg of MASSES) for (const diet of [fruit, lean]) {
      const c = sized(W, juvenileF, kg), arith = cellOf(c, P, diet, TRAVEL.juvenile, v), day = gutCeiling(c, Q, diet);
      assert.ok(Math.abs(day.absorbed / arith.A - 1) < 1e-9, `${key}, ${kg} kg: absorbed ${day.absorbed} against ${arith.A}`);
      const walk = locomotionKcal(c, Q, TRAVEL.juvenile.groundM, 0);
      assert.ok(Math.abs(walk / arith.spend.walk - 1) < 1e-9, `${key}, ${kg} kg: walking ${walk} against ${arith.spend.walk}`);
    }
    const a0 = cellOf(adult, P, fruit, TRAVEL.adult), a1 = cellOf(adult, P, fruit, TRAVEL.adult, v);
    assert.equal(a1.R, a0.R, `${key}: the adult's ratio does not move`);
    assert.equal(gutCeiling(adult, Q, fruit).absorbed, gutCeiling(adult, P, fruit).absorbed);
  }
  // the gut exponent lifts the small animal's ceiling, the walking exponent lowers its ratio, and at 0.75 the ratio is the same at every mass on fruit
  const R = (kg: number, key?: string) => cellOf(sized(W, juvenileF, kg), P, fruit, TRAVEL.juvenile, key ? VARIANTS.find(x => x.key === key) : undefined).R;
  assert.ok(R(16, 'gut075') > R(16, 'gut0875') && R(16, 'gut0875') > R(16) && R(16) > R(16, 'walkTaylorRef'));
  assert.ok(Math.abs(R(16, 'gut075') - R(21, 'gut075')) < 0.01 && R(21) - R(16) > 0.05);
  assert.deepEqual(ARMS.map(a => a.name), ['Y3-W50', 'Y3-W50-gut75', 'Y3-W50-gut875', 'Y3-W50-walk', 'Y3-W50-gut75-walk']);
});

test('the prescription ledger classes both as inputs (design assumptions) and S39\'s count does not move at the range ends', () => {
  const entries = loadEntries();
  for (const [id, range] of [['gutSizeExp', [0.75, 1]], ['walkCostSizeExp', [-0.316, 0]]] as const) {
    const e = entries.find(x => x.id === id) as RegistryEntry & { range: number[]; calibrationExcluded?: string };
    const k = classify(e);
    assert.equal(k.cls, 'input', id);
    assert.match(k.reason, /design assumption/, id);
    assert.equal(e.evidence, 'design', id);
    assert.equal(e.calibrate, false, id);
    assert.deepEqual(e.range, range, id);
    assert.match(e.calibrationExcluded ?? '', /never fitted/, id);
  }
  const s39 = prescriptionCount(S39).total;
  for (const over of [{ gutSizeExp: 0.75 }, { gutSizeExp: 0.875 }, { walkCostSizeExp: -0.316 }, ENDS]) assert.equal(prescriptionCount({ ...S39, ...over }).total, s39, JSON.stringify(over));
});
