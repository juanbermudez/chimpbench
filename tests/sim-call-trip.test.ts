import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, findCandidate, V } from '../src/sim/candidates';
import { executeAction, startAction } from '../src/sim/execution';
import { fruitAt } from '../src/sim/phenology';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { gate } from '../src/sim/rg';
import { ix } from '../src/sim/state';
import { intentOf } from '../src/decide/gate';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3i (callTrip; docs/staging/e3i-prereg.md §5): a trip to a caller keeps the call it was chosen for. Bit 1: its walk,
// its arrival and its option come from that call, so a later pant-hoot heard is a new option instead of a silent change of
// destination that ends the trip at the next decision point.

/** S39, the stack the stage measures on (bench-run2 S39q-params.json without rngSalt). */
const S39 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
  endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1,
  nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2, patrolFusion: 1,
  huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1, departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };

const dist = (c: Chimp, t: { position: number[] }) => Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]);
/** A world on S39 (+ the switch) at mid-morning of its second day. */
function morning(bits: number): World {
  const w = createWorld(48, { profile: 'field', params: { ...S39, callTrip: bits } });
  for (let i = 0; i < 5760 + 960; i++) tickWorld(w);
  return w;
}
const adult = (w: World) => w.chimps.find(k => k.alive && k.age >= 15 && k.sex === 'male' && k.action !== 'nest')!;
/** The listener hears a community member's pant-hoot from crown `t` (perception.ts hear, socialTiming bit 4). */
function hearFrom(w: World, c: Chimp, callId: number, callerId: number, t: { id: number; position: number[] }, ageH = 0): void {
  const x = ix(c);
  x.joinCall = callId; x.joinCaller = callerId; x.joinAt = w.time - ageH; x.joinX = t.position[0] - 4; x.joinZ = t.position[2]; x.jt = t.id;
}
const callerOf = (w: World, c: Chimp) => w.chimps.find(k => k.alive && k !== c && k.troopId === c.troopId && k.age >= 15)!;

test('callTrip is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).callTrip, 0);
});

test('callTrip 1: a later call heard is a new option; the trip keeps its own crown, walk and place on the list', () => {
  const run = (bits: number) => {
    const w = morning(bits), c = adult(w), x = ix(c), caller = callerOf(w, c);
    // crowns far enough that 28 ticks of walking (~0.85 m/s) reach neither
    const ripe = w.trees.filter(q => fruitAt(w, q) >= 0.3 && dist(c, q) > 500 && dist(c, q) < 2500);
    const t1 = ripe.sort((a, b) => dist(c, a) - dist(c, b))[0];
    // a second crown on the far side of the animal from the first
    const t2 = ripe.filter(q => dist(c, q) > 500 && (q.position[0] - c.position[0]) * (t1.position[0] - c.position[0]) + (q.position[2] - c.position[2]) * (t1.position[2] - c.position[2]) < 0)
      .sort((a, b) => dist(c, a) - dist(c, b))[0];
    assert.ok(t1 && t2, 'two fruiting crowns on opposite sides');
    hearFrom(w, c, 1_234_567, caller.id, t1);
    const trip: Candidate = { action: 'travel', targetId: x.joinCall, score: 1, reason: 'test' };
    candidateMeta.set(trip, { v: V.CALLER, aux: caller.id });
    startAction(w, c, trip, 'rules');
    for (let i = 0; i < 20; i++) executeAction(w, c);
    const d1 = dist(c, t1);
    // a later pant-hoot from the other crown overwrites the listener's call slot
    hearFrom(w, c, 1_234_999, caller.id, t2);
    for (let i = 0; i < 8; i++) executeAction(w, c);
    perceive(w, c);
    const list = computeCandidates(w, c, []);
    const it = intentOf(w, c, 'travel', 1_234_567, V.CALLER);
    const g = gate(w, c, it, list);
    return { closer: dist(c, t1) < d1, own: !!findCandidate(list, 'travel', 1_234_567), later: !!findCandidate(list, 'travel', 1_234_999), g, record: x.cg?.slice() };
  };
  const off = run(0), on = run(1);
  assert.equal(off.record, undefined, 'today no record is kept');
  assert.ok(!off.closer, 'today the walk turns to the later caller\'s crown');
  assert.ok(!off.own, 'and the trip\'s own option has left the list');
  assert.equal(off.g, 'ended', 'so the next decision point ends it');
  assert.ok(on.record && on.record[0] === 1_234_567, 'with bit 1 the trip keeps its call');
  assert.ok(on.closer, 'its walk goes on to its own crown');
  assert.ok(on.own && on.later, 'its own option and the later call are both on the list');
  assert.ok(typeof on.g !== 'string' && on.g.keep.action === 'travel' && on.g.keep.targetId === 1_234_567, 'and the gate keeps the trip');
});

test('callTrip 1: the trip in progress stays on the list after the 0.3-h offer and within joinCallMinM of the call', () => {
  const run = (bits: number) => {
    const w = morning(bits), P = paramsOf(w), c = adult(w), x = ix(c), caller = callerOf(w, c);
    const t = w.trees.filter(q => fruitAt(w, q) >= 0.3 && dist(c, q) > 150 && dist(c, q) < 1500).sort((a, b) => dist(c, a) - dist(c, b))[0];
    hearFrom(w, c, 1_234_567, caller.id, t);
    const trip: Candidate = { action: 'travel', targetId: x.joinCall, score: 1, reason: 'test' };
    candidateMeta.set(trip, { v: V.CALLER, aux: caller.id });
    startAction(w, c, trip, 'rules');
    x.joinAt = w.time - 0.4; // the call is older than the 0.3-h offer
    perceive(w, c);
    const old = !!findCandidate(computeCandidates(w, c, []), 'travel', 1_234_567);
    x.joinAt = w.time;
    c.position = [x.joinX + P.joinCallMinM / 2, 0, x.joinZ]; // within joinCallMinM of the call's place, short of the crown
    perceive(w, c);
    const near = !!findCandidate(computeCandidates(w, c, []), 'travel', 1_234_567);
    return { old, near };
  };
  const off = run(0), on = run(1);
  assert.ok(!off.old && !off.near, 'today the trip\'s option leaves the list in both cases');
  assert.ok(on.old && on.near, 'with bit 1 it stays');
});

test('callTrip 1 (field, S39): deterministic over 12 h, JSON-lossless; the count is unchanged', () => {
  const T = { ...S39, callTrip: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  for (const c of a.chimps) { const r = ix(c).cg; if (r) { assert.equal(r.length, 6); for (const v of r) assert.ok(Number.isFinite(v)); } }
  assert.equal(prescriptionCount(T).total, prescriptionCount(S39).total);
});
