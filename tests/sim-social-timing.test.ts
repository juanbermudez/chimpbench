// Stage E5e (docs/staging/e5e-prereg.md §4): socialTiming, a sum of bits that switch out the social quotas and clock.
// 1: a subordinate greets a dominant once per association (perception.ts clears the record at a reunion) and again when
// the dominant displays or charges, in place of pantGruntRepeatH. 2: a consortship is worth what it offers times the
// light of the walk to the male's goal, in place of consortLatestHour. 4: an approach to a caller is valued in the
// forager's currency (a trip to the caller's crown, or a follow), in place of joinCallDistScaleM. 8: the feeding and
// immigrant charge gaps are not read. 0 = today.
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, consortGoal, consortWalkLight, V } from '../src/sim/candidates';
import { dominates, maternalKin } from '../src/sim/hierarchy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { index, ix, isTreeId } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

/** S13 (docs/staging/e-stack2-confirm.md; bench-run3 s13q/S13q-params.json), the stage's reference stack. */
const S13: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1,
  callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1,
  waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1,
  huntValue: 1, forageRate: 1, contestAssess: 1 };
const DAY = 5760;

test('socialTiming is 0 by default in both profiles; reunionH is the 1-h reunion span', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.socialTiming, 0, profile); assert.equal(P.reunionH, 1, profile);
  }
});

test('switch 0 leaves the S13 world as it is; every bit on changes it', () => {
  const a = createWorld(7, { profile: 'field', params: S13 }), b = createWorld(7, { profile: 'field', params: { ...S13, socialTiming: 0 } });
  const c = createWorld(7, { profile: 'field', params: { ...S13, socialTiming: 15 } });
  for (let i = 0; i < DAY / 2; i++) { tickWorld(a); tickWorld(b); tickWorld(c); }
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(c));
});

test('the prescription count falls by one per bit (two for bit 8): S13 65 → 60', () => {
  const base = prescriptionCount(S13).total;
  for (const [bit, drop] of [[1, 1], [2, 1], [4, 1], [8, 2], [15, 5]] as const) assert.equal(prescriptionCount({ ...S13, socialTiming: bit }).total, base - drop, `bit ${bit}`);
});

// One S13 field world at 07:30 on day 1, restored with overrides (scenes below change positions and acts by hand).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48, { profile: 'field', params: S13 }); for (let i = 0; i < 240; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Overrides): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  return w;
};
const cands = (w: World, c: Chimp): Candidate[] => { const out: Candidate[] = []; computeCandidates(w, c, out); return out; };

/** A subordinate adult female 3 m from an adult male of her community who dominates her, both at rest in each other's view. */
function greetScene(bits: number) {
  const w = withParams({ socialTiming: bits });
  w.environment.rain = 0;
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age >= 20)!;
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && c.troopId === m.troopId && dominates(m, c) && !maternalKin(c, m))!;
  f.position = [m.position[0] + 3, 0, m.position[2]];
  for (const [a, b] of [[f, m], [m, f]] as const) { a.action = 'rest'; a.targetId = -1; a.hunger = 0.1; const x = ix(a); x.seen = [b.id]; x.finished = false; }
  return { w, m, f, x: ix(f) };
}
const greets = (w: World, f: Chimp, m: Chimp) => cands(w, f).some(k => k.action === 'pant-grunt' && k.targetId === m.id);

test('bit 1: once per association, again when challenged; the quota no longer decides', () => {
  for (const bits of [0, 1]) {
    const s = greetScene(bits);
    delete s.x.greet[s.m.id];
    assert.ok(greets(s.w, s.f, s.m), `bits ${bits}: never greeted, the greeting is offered`);
    s.x.greet[s.m.id] = s.w.time - 0.1;
    assert.ok(!greets(s.w, s.f, s.m), `bits ${bits}: greeted 6 min ago, not offered`);
    s.x.greet[s.m.id] = s.w.time - 9;
    assert.equal(greets(s.w, s.f, s.m), bits === 0, `bits ${bits}: greeted 9 h ago in the same association: the quota reopens it, the memory does not`);
    s.x.greet[s.m.id] = s.w.time - 0.1; s.m.action = 'display';
    assert.equal(greets(s.w, s.f, s.m), bits === 1, `bits ${bits}: a displaying dominant reopens it under the memory only`);
  }
});

test('bit 1: perception clears the record at a reunion (apart for more than reunionH), not while together', () => {
  for (const [gapH, cleared] of [[0.5, false], [2, true]] as const) {
    const s = greetScene(1);
    s.x.metAt[s.m.id] = s.w.time - gapH; s.x.greet[s.m.id] = s.w.time - 3;
    perceive(s.w, s.f);
    assert.equal(s.x.greet[s.m.id] === undefined, cleared, `apart ${gapH} h`);
    assert.equal(s.x.metAt[s.m.id], s.w.time);
  }
  const sl = greetScene(1);
  sl.x.seenAt = sl.w.time - 2; sl.x.metAt[sl.m.id] = sl.w.time - 2; sl.x.greet[sl.m.id] = sl.w.time - 3;
  perceive(sl.w, sl.f);
  assert.equal(sl.x.greet[sl.m.id], sl.w.time - 3, 'seen at the previous look, then a long bout without a look: no separation');
  const sc = greetScene(1);
  sc.x.greet[sc.m.id] = sc.w.time - 0.1; sc.m.action = 'charge'; sc.m.targetId = -1;
  assert.ok(!greets(sc.w, sc.f, sc.m), 'a charge at someone else does not reopen the greeting');
  sc.m.targetId = sc.f.id;
  assert.ok(greets(sc.w, sc.f, sc.m), 'a charge at this animal does');
  const s0 = greetScene(0);
  s0.x.metAt[s0.m.id] = s0.w.time - 2; s0.x.greet[s0.m.id] = s0.w.time - 3;
  perceive(s0.w, s0.f);
  assert.equal(s0.x.greet[s0.m.id], s0.w.time - 3, 'switch off: the record is kept');
});

/** A non-alpha adult male beside a swollen, bonded adult female of his community, at hour `h` of day 1. */
function consortScene(bits: number, hour: number, atGoal: boolean) {
  const w = withParams({ socialTiming: bits });
  const ticks = Math.round((hour - w.hour) * 240);
  for (let i = 0; i < ticks; i++) tickWorld(w);
  w.environment.rain = 0;
  const troop = index(w).troopById;
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age >= 15 && troop.get(c.troopId)?.alphaId !== c.id)!;
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && c.troopId === m.troopId && !maternalKin(c, m))!;
  for (const o of w.chimps) if (o !== m && o.alive) { const ox = ix(o); if (ox.guardBy === f.id) ox.guardBy = -1; }
  ix(f).guardBy = -1;
  if (atGoal) { const g = consortGoal(w, m, f, [0, 0]); m.position = [g[0], 0, g[1]]; }
  f.position = [m.position[0] + 4, 0, m.position[2]]; f.swelling = 1; m.bonds[f.id] = 0.8; m.hunger = 0.1;
  for (const [a, b] of [[m, f], [f, m]] as const) { a.action = 'rest'; a.targetId = -1; const x = ix(a); x.seen = [b.id]; x.finished = false; }
  return { w, m, f };
}
const consort = (w: World, m: Chimp, f: Chimp) => cands(w, m).find(k => k.action === 'consort' && k.targetId === f.id);

test('bit 2: no clock hour; the consortship is worth what the light of the walk away allows', () => {
  const late = consortScene(0, 16.5, true), lateOn = consortScene(2, 16.5, true);
  assert.equal(consort(late.w, late.m, late.f), undefined, 'switch off: none after 16:00');
  const k = consort(lateOn.w, lateOn.m, lateOn.f);
  assert.ok(k && k.score > 0, 'bit 2: at 16:30 with a short walk the consortship is offered');
  assert.ok(Math.abs(consortWalkLight(lateOn.w, lateOn.m, lateOn.f, paramsOf(lateOn.w)) - 1) < 1e-9, 'a short walk in daylight keeps its whole value');
  const dark = consortScene(2, 20, false), P = paramsOf(dark.w);
  assert.ok(consortWalkLight(dark.w, dark.m, dark.f, P) < 0.05, 'at 20:00 the walk ends in darkness');
  const kd = consort(dark.w, dark.m, dark.f);
  assert.ok(!kd || kd.score < 0.05, `at night the consortship is worth about nothing (${kd?.score})`);
});

/** A listener at rest hears a community member pant-hoot `d` m away; at food, the caller feeds in the crown nearest it. */
function callerScene(over: Overrides, d: number, atFood: boolean) {
  const w = withParams(over);
  w.environment.rain = 0;
  const c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 15 && !a.lactating)!;
  const caller = w.chimps.find(a => a.alive && a.sex === 'male' && a.age >= 15 && a.troopId === c.troopId && !maternalKin(a, c))!;
  caller.position = [c.position[0] + d, 0, c.position[2]];
  // a lonely, barely hungry listener with no crown in view or in memory, so the approach is not crowded out of the travel slots
  c.action = 'rest'; c.targetId = -1; c.hunger = 0.05; c.social = 0;
  c.memory = c.memory.filter(m => m.kind !== 'tree');
  const x = ix(c);
  x.seen = []; x.trees.length = 0;
  let tree = -1;
  if (atFood) {
    let best = Infinity;
    for (const t of w.trees) { const e = Math.hypot(t.position[0] - caller.position[0], t.position[2] - caller.position[2]); if (e < best) { best = e; tree = t.id; } }
    const t = index(w).treeById.get(tree)!;
    caller.position = [t.position[0], 0, t.position[2]]; caller.action = 'forage'; caller.targetId = tree;
  } else { caller.action = 'rest'; caller.targetId = -1; }
  x.joinCall = 2_000_000; x.joinCaller = caller.id; x.joinAt = w.time; x.joinX = caller.position[0]; x.joinZ = caller.position[2]; x.joinRich = atFood ? 1 : 0;
  if (paramsOf(w).socialTiming & 4) x.jt = atFood && isTreeId(tree) ? tree : -1;
  const approach = cands(w, c).find(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.CALLER);
  return { w, c, caller, approach, P: paramsOf(w) };
}

test('bit 4: an approach to a caller does not read joinCallDistScaleM; today it does', () => {
  for (const atFood of [true, false]) {
    const a = callerScene({ socialTiming: 4 }, 400, atFood), b = callerScene({ socialTiming: 4, joinCallDistScaleM: 3000 }, 400, atFood);
    assert.ok(a.approach && b.approach, `offered (${atFood ? 'at food' : 'elsewhere'})`);
    assert.equal(a.approach!.score, b.approach!.score, `at food ${atFood}: independent of joinCallDistScaleM`);
    const c0 = callerScene({}, 400, atFood), c1 = callerScene({ joinCallDistScaleM: 3000 }, 400, atFood);
    assert.ok(c0.approach && c1.approach && c1.approach.score > c0.approach.score, `at food ${atFood}: today the scale lowers the approach`);
  }
});

test('bit 4: a call at food is a trip to the crown, worth less the farther it is; elsewhere the walk costs its energy', () => {
  const near = callerScene({ socialTiming: 4 }, 200, true), far = callerScene({ socialTiming: 4 }, 900, true);
  assert.ok(near.approach && far.approach && near.approach.score > far.approach.score, `${near.approach?.score} > ${far.approach?.score}`);
  const e1 = callerScene({ socialTiming: 4 }, 200, false), e2 = callerScene({ socialTiming: 4 }, 900, false);
  if (e1.approach && e2.approach) assert.ok(e1.approach.score >= e2.approach.score && e1.approach.score - e2.approach.score < 0.02, 'elsewhere: 700 m more costs 700 / travelDistScaleM (≈ 0.011)');
});

/** An adult male feeding in a crown with a subordinate adult male of his community feeding in it too, fruit scarce. */
function feedScene(bits: number) {
  const w = withParams({ socialTiming: bits });
  w.environment.rain = 0; w.environment.fruitIndex = 0.2;
  const males = w.chimps.filter(c => c.alive && c.sex === 'male' && c.age >= 15).sort((p, q) => q.elo - p.elo);
  const c = males[0], o = males.find(m => m !== c && m.troopId === c.troopId && dominates(c, m) && !maternalKin(c, m))!;
  const t = w.trees.find(tr => Math.hypot(tr.position[0] - c.position[0], tr.position[2] - c.position[2]) < 200) ?? w.trees[0];
  c.position = [t.position[0], 0, t.position[2]]; o.position = [t.position[0] + 3, 0, t.position[2]];
  c.action = 'forage'; c.targetId = t.id; o.action = 'forage'; o.targetId = t.id; c.hunger = 0.5;
  const x = ix(c); x.seen = [o.id]; x.trees = [t.id]; x.lastAgg = w.time - 0.1; x.finished = false;
  return { w, c, o };
}

test('bit 8: a feeding charge right after another aggression is offered; today the gap blocks it', () => {
  const feeds = (s: ReturnType<typeof feedScene>) => cands(s.w, s.c).some(k => k.action === 'charge' && k.targetId === s.o.id && candidateMeta.get(k)?.v === V.FEED);
  assert.equal(feeds(feedScene(0)), false, 'switch off: within feedChargeGapH of the last aggression');
  assert.equal(feeds(feedScene(8)), true, 'bit 8: the gap is not read');
});
