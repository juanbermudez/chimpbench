import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, findCandidate, V } from '../src/sim/candidates';
import { executeAction, startAction } from '../src/sim/execution';
import { cropTarget, fruitAt } from '../src/sim/phenology';
import { paramsOf } from '../src/sim/params';
import { dailyBeliefs, perceive } from '../src/sim/perception';
import { gate } from '../src/sim/rg';
import { isTreeId, ix, simOf } from '../src/sim/state';
import { intentOf } from '../src/decide/gate';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3h (tripBeliefs; docs/staging/e3h-prereg.md §5): trips that find food. Bit 1: a crown on the community's known list
// that the animal sees is valued by what it saw (an empty one included) for memTravelHorizonH. Bit 2: a trip to a caller
// heard in a crown walks to that crown and becomes feeding there on arrival.

/** S31, the stack the stage measures on (bench-run S31q-params.json without rngSalt). */
const S31 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
  endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1,
  nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2, patrolFusion: 1,
  huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1, departValue: 2, bodyRules: 1 };

const dist = (c: Chimp, t: { position: number[] }) => Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]);
/** A world on S31 (+ the switch) at mid-morning of its second day, so the community lists exist and the light is up. */
function morning(bits: number): World {
  const w = createWorld(48, { profile: 'field', params: { ...S31, tripBeliefs: bits } });
  for (let i = 0; i < 5760 + 960; i++) tickWorld(w);
  return w;
}
const adult = (w: World) => w.chimps.find(k => k.alive && k.age >= 15 && k.sex === 'male' && k.action !== 'nest')!;

test('tripBeliefs is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).tripBeliefs, 0);
});

test('tripBeliefs 1: a listed crown seen empty is kept as seen; the trip to it is worth what was seen; it lapses after memTravelHorizonH', () => {
  const run = (bits: number) => {
    const w = morning(bits), P = paramsOf(w), c = adult(w), x = ix(c), s = simOf(w);
    const t = w.trees.find(q => dist(c, q) > 150 && dist(c, q) < 400)!;
    s.knownTrees = { ...s.knownTrees, [c.troopId]: [t.id, 0.5] }; // the community lists this one crown, expected at 0.5 units
    c.memory = c.memory.filter(m => m.kind !== 'tree');
    if (x.treeCrop) delete x.treeCrop[t.id];
    t.depletion = [cropTarget(w, t, w.time) + 1, w.time]; // nothing left in it
    assert.equal(fruitAt(w, t), 0);
    const home = [c.position[0], c.position[1], c.position[2]];
    c.position = [t.position[0] + 5, 0, t.position[2]]; // the animal stands under it
    perceive(w, c);
    const belief = x.treeCrop?.[t.id], seen = x.ls?.[t.id];
    c.position = home as typeof c.position; c.memory = c.memory.filter(m => m.kind !== 'tree');
    perceive(w, c);
    const offer = (list: Candidate[]) => list.find(k => k.action === 'travel' && k.targetId === t.id && candidateMeta.get(k)?.v === V.TREE);
    const withSight = offer(computeCandidates(w, c, []));
    // the same animal without the sighting: the list's expectation
    const keep = { b: x.treeCrop?.[t.id], s: x.ls?.[t.id] };
    if (x.treeCrop) delete x.treeCrop[t.id]; if (x.ls) delete x.ls[t.id];
    const listed = offer(computeCandidates(w, c, []));
    if (keep.b !== undefined) (x.treeCrop ??= {})[t.id] = keep.b; if (keep.s !== undefined) (x.ls ??= {})[t.id] = keep.s;
    // the daily step keeps a live sighting and drops one older than the horizon
    dailyBeliefs(w);
    const kept = x.treeCrop?.[t.id];
    if (x.ls && x.ls[t.id] !== undefined) x.ls[t.id] = w.time - P.memTravelHorizonH - 1;
    dailyBeliefs(w);
    return { belief, seen, now: w.time, withSight, listed, kept, after: x.treeCrop?.[t.id], lsAfter: x.ls?.[t.id] };
  };
  const off = run(0), on = run(1);
  assert.equal(off.belief, undefined, 'today an empty listed crown leaves no belief');
  assert.equal(off.seen, undefined);
  assert.equal(on.belief, 0, 'with bit 1 the empty crown is kept as seen');
  assert.equal(on.seen, on.now, 'with the hour of the sighting');
  assert.ok(on.listed, 'unseen, the listed crown is a trip valued at the list\'s expectation');
  const raw = (k: Candidate | undefined) => (k ? candidateMeta.get(k)?.raw ?? k.score : -Infinity);
  assert.ok(raw(on.withSight) < raw(on.listed) - 1e-9, `seen empty, the trip is worth less (${raw(on.withSight)} vs ${raw(on.listed)})`);
  assert.equal(on.kept, 0, 'the daily step keeps a sighting within the horizon');
  assert.equal(on.after, undefined, 'and drops it once it is older');
  assert.equal(on.lsAfter, undefined);
});

test('tripBeliefs 2: a caller trip heard in a crown walks to that crown and becomes feeding there on arrival', () => {
  const run = (bits: number) => {
    const w = morning(bits), c = adult(w), x = ix(c);
    const t = w.trees.filter(q => fruitAt(w, q) >= 0.3 && dist(c, q) < 2000).sort((a, b) => dist(c, a) - dist(c, b))[0];
    assert.ok(t, 'a fruiting crown');
    // the call came from that crown; the call point is 40 m off its trunk, beyond it as the animal comes
    x.joinCall = 1_234_567; x.joinCaller = -1; x.joinAt = w.time; x.joinX = t.position[0] - 40; x.joinZ = t.position[2]; x.jt = t.id;
    c.position = [t.position[0] + 60, 0, t.position[2]];
    const trip: Candidate = { action: 'travel', targetId: x.joinCall, score: 1, reason: 'test' };
    candidateMeta.set(trip, { v: V.CALLER, aux: -1 });
    startAction(w, c, trip, 'rules');
    x.rgIntent = intentOf(w, c, 'travel', x.joinCall, V.CALLER);
    for (let i = 0; i < 200 && !x.finished; i++) executeAction(w, c);
    const stopAt = { crown: dist(c, t), call: Math.hypot(x.joinX - c.position[0], x.joinZ - c.position[2]) };
    perceive(w, c);
    const list = computeCandidates(w, c, []);
    const g = gate(w, c, x.rgIntent, list);
    return { stopAt, g, feed: !!findCandidate(list, 'forage', t.id), t };
  };
  const off = run(0), on = run(2);
  assert.ok(Math.abs(off.stopAt.call - paramsOf(createWorld(1, { profile: 'field' })).joinCallStopM) < 1.5, `today it stops joinCallStopM from the call point (${off.stopAt.call})`);
  assert.equal(off.g, 'ended', 'and the arrival is a fresh draw');
  assert.ok(on.stopAt.crown <= 3.5, `with bit 2 it walks to the crown (${on.stopAt.crown} m)`);
  assert.ok(on.feed, 'the crown is a feeding option there');
  assert.ok(typeof on.g !== 'string' && on.g.arrived && on.g.keep.action === 'forage' && on.g.keep.targetId === on.t.id, 'and the gate turns the trip into feeding there');
});

test('tripBeliefs 3 (field, S31): deterministic over 12 h, JSON-lossless; the count is unchanged', () => {
  const T = { ...S31, tripBeliefs: 3 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  for (const c of a.chimps) { const ls = ix(c).ls; if (ls) for (const [k, v] of Object.entries(ls)) assert.ok(isTreeId(+k) && Number.isFinite(v)); }
  assert.equal(prescriptionCount(T).total, prescriptionCount(S31).total);
});
