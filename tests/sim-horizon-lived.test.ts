// Stage E1t (docs/staging/e1t-prereg.md §2–3): the drive's waking time left from the days the animal lived (horizonLived),
// in place of E1e's estimate from sleep pressure, which collapses under the circadian gate.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld } from '../src/simulation';
import { deficitDrive, feedHorizon, ledgerOf, livedDay } from '../src/sim/energy';
import { needs } from '../src/sim/life';
import { paramsOf, type Overrides, type Params } from '../src/sim/params';
import { ix, TICK_HOURS } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// The S39 stack (bench-run artifacts/validation/e/runs/M6-S39/params.json; docs/staging/e-stack2-confirm.md "S39 results")
const S39: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1,
  ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1,
  ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1,
  nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1,
  socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };
const ON: Overrides = { ...S39, horizonLived: 1 };
/** `hours` of S39 field world, seed 48, in stepWorld batches of `batchS` wall seconds (15 s = 60 ticks, 2 s = 8 ticks). */
function s39(extra: Overrides, hours: number, batchS = 15): World {
  const w = createWorld(48, { profile: 'field', params: { ...S39, ...extra } });
  for (let i = 0, n = hours * 240 / (batchS * 4); i < n; i++) stepWorld(w, batchS);
  return w;
}
/** The world without E1t's records, so behaviour can be compared with a world that keeps none. */
function stripped(w: World): World {
  const c = JSON.parse(JSON.stringify(w)) as World;
  for (const k of c.chimps) { const L = (k as unknown as { sim?: { en?: Record<string, unknown> } }).sim?.en; if (L) for (const f of ['wokeAt', 'sleptAt', 'dayH', 'awakeH']) delete L[f]; }
  return c;
}
/** S39 at horizonLived 0 after 40 h, made once (two tests read it). */
let off40: World | null = null;
const s39Off40 = () => (off40 ??= s39({}, 40));
const adultFemale = (w: World) => w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 20 && c.pregnancy === 0 && !c.lactating)!;
/** Params with the switch flipped (feedHorizon and deficitDrive read only plain fields of P). */
const withSwitch = (P: Params, v: 0 | 1) => ({ ...P, horizonLived: v }) as Params;

test('horizonLived is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).horizonLived, 0, profile);
});

test('switch 0: the S39 world is the one recorded before E1t (seed 48, 40 h, field)', () => {
  // recorded at 521d96d (the registration commit, before any E1t code) with the same batching
  assert.equal(worldHash(s39Off40()), '6a6f269ff10bf7be');
  assert.equal(worldHash(s39({ horizonLived: 0 }, 40)), '6a6f269ff10bf7be');
});

test('switch 1: before a first complete waking day is recorded the world behaves as today (E1e estimate unchanged)', () => {
  // the first sleep onset (~20:00), waking (~05:50) and the second onset (~20:00 the next day, ~37.5 h): at 36 h nobody
  // has a complete day yet, so only the records differ
  const a = s39({}, 36), b = s39({ horizonLived: 1 }, 36);
  assert.ok(b.chimps.filter(c => c.alive).every(c => ix(c).en?.wokeAt !== undefined && ix(c).en?.dayH === undefined), 'waking recorded, no complete day yet');
  assert.equal(worldHash(stripped(b)), worldHash(stripped(a)));
  assert.notEqual(worldHash(b), worldHash(a));
});

test('switch 1: deterministic whatever the batching; the records are plain data; a save resumes exactly', () => {
  const a = s39({ horizonLived: 1 }, 40), b = s39({ horizonLived: 1 }, 40, 2);
  assert.equal(worldHash(a), worldHash(b));
  const living = a.chimps.filter(c => c.alive);
  assert.ok(living.length > 40);
  for (const c of living) {
    const L = ix(c).en!;
    // the circadian sleep latch gives waking days of about 14 h in the first days of a world (sleepChimp's 9.7 h of sleep)
    assert.ok(L.dayH! > 12 && L.dayH! < 17 && L.awakeH! >= 0, `${c.name}: day ${L.dayH}, awake ${L.awakeH}`);
    // at 22:30 everyone is asleep again: the day kept is the one from the last waking to this sleep onset
    assert.ok(L.sleptAt! > L.wokeAt! && Math.abs(L.sleptAt! - L.wokeAt! - L.dayH!) < 1e-9, `${c.name}: woke ${L.wokeAt}, slept ${L.sleptAt}`);
  }
  assert.notEqual(worldHash(stripped(a)), worldHash(stripped(s39Off40())), 'the lived horizon changes behaviour once in use');
  assert.deepEqual(plainDataProblems(a), []);
  const copy = JSON.parse(JSON.stringify(a)) as World;
  assert.equal(worldShapeProblem(copy), '', 'the records sit inside the energy ledger: chimp.sim keeps its layout');
  for (let i = 0; i < 8; i++) { stepWorld(a, 15); stepWorld(copy, 15); }
  assert.equal(worldHash(copy), worldHash(a));
});

test('a crafted animal whose bedtime pressure lies below today\'s: the horizon stays positive, yesterday\'s day less the hours awake', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w), c = adultFemale(w), x = ix(c);
  const L = ledgerOf(c, P);
  assert.ok(L.eAvg !== undefined, 'the drive books are open');
  // E1e's pressure state: woke at 0.30, fell asleep (entered its nest) at 0.45, now at 0.60 (the circadian gate let it rise)
  x.slp = 0.6; L.sWake = 0.3; L.sBed = 0.45;
  assert.equal(feedHorizon(c, L, withSwitch(P, 0))[0], 0, 'E1e: bedtime pressure below today\'s, no waking time left');
  // the animal's own record, made by livedDay at its latch's transitions (asl), the clock moved by hand
  const at = (h: number, asl: 0 | 1, inNest = asl === 1) => { w.time = h; x.asl = asl; livedDay(w, c, x, inNest); };
  const t0 = w.time;
  at(t0, 1); // falls asleep: no waking recorded yet, so no complete day
  assert.equal(L.dayH, undefined);
  assert.deepEqual(feedHorizon(c, L, P), feedHorizon(c, L, withSwitch(P, 0)), 'before a first complete day: E1e\'s estimate');
  at(t0 + 9.75, 0); // wakes
  at(t0 + 24, 1); // falls asleep: a waking day of 14.25 h
  assert.ok(Math.abs(L.dayH! - 14.25) < 1e-9, `day ${L.dayH}`);
  const [l0, f0] = feedHorizon(c, L, P);
  assert.ok(Math.abs(l0 - 14.25) < 1e-9 && Math.abs(f0 - 9.75) < 1e-9, 'asleep: the coming waking day lies ahead, and the fast 24 h less it');
  at(t0 + 30, 1, false); // out of its nest while latched: still asleep (the latch, not the nest, is its sleep)
  assert.ok(L.sleptAt === t0 + 24 && L.wokeAt === t0 + 9.75 && L.awakeH === 0);
  at(t0 + 33.75, 0); // wakes: the same horizon as asleep, no jump
  assert.ok(Math.abs(feedHorizon(c, L, P)[0] - 14.25) < 1e-9);
  at(t0 + 38.75, 0); // five hours awake
  const [left, fast] = feedHorizon(c, L, P);
  assert.ok(Math.abs(left - 9.25) < 1e-9 && Math.abs(fast - 9.75) < 1e-9, `${left} h left, fast ${fast} h`);
  assert.equal(feedHorizon(c, L, withSwitch(P, 0))[0], 0, 'the same body under E1e: still collapsed');
  // the drive is pinned at 1 under E1e (a need over one tick of feeding) but not with the lived horizon
  L.res = 0;
  assert.equal(deficitDrive(c, withSwitch(P, 0)), 1);
  const d = deficitDrive(c, P);
  assert.ok(d > 0 && d < 1, `drive ${d}`);
  // past yesterday's length the waking time left is 0, never negative
  at(t0 + 33.75 + 15, 0);
  assert.equal(feedHorizon(c, L, P)[0], 0);
});

test('without rhythmCircadian (sleep in a finished nest) the recorded day equals the pressure-based one, to one tick', () => {
  const w = createWorld(48, { profile: 'field', params: { energyLedger: 1, ledgerDrive: 1, rhythmSleep: 1, horizonLived: 1 } }), P = paramsOf(w);
  const c = adultFemale(w), x = ix(c);
  const tick = (n: number, nest: boolean) => {
    c.action = nest ? 'nest' : 'rest'; x.phase = nest ? 2 : 0; x.v = 0;
    for (let i = 0; i < n; i++) { w.tick++; w.time = w.tick * TICK_HOURS; needs(w, c as Chimp); c.action = nest ? 'nest' : 'rest'; x.phase = nest ? 2 : 0; }
  };
  tick(240 * 2, true); // a night's end
  tick(240 * 13, false); // day 1: 13 h awake
  const L = ix(c).en!, sWake1 = L.sWake!;
  tick(240 * 11, true); // night 1
  assert.ok(Math.abs(L.dayH! - 13) < 1e-9, `the recorded day ${L.dayH}`);
  x.slp = sWake1; // day 2 starts at day 1's waking pressure (the pressure-based estimate assumes it)
  let worst = 0;
  for (let k = 0; k < 13; k++) {
    tick(240, false);
    const a = feedHorizon(c, L, P), b = feedHorizon(c, L, withSwitch(P, 0));
    worst = Math.max(worst, Math.abs(a[0] - b[0]));
    assert.ok(Math.abs(a[1] - b[1]) < 1e-9, `fast ${a[1]} vs ${b[1]}`);
  }
  assert.ok(worst <= TICK_HOURS + 1e-9, `waking time left differs by ${worst} h`);
});

test('inert without rhythmSleep or without ledgerDrive (compressed worlds, 12 h)', () => {
  const run = (params: Overrides) => { const w = createWorld(7, { params }); for (let i = 0; i < 12 * 4; i++) stepWorld(w, 15); return worldHash(w); };
  assert.equal(run({ energyLedger: 1, ledgerDrive: 1, horizonLived: 1 }), run({ energyLedger: 1, ledgerDrive: 1 }));
  assert.equal(run({ energyLedger: 1, rhythmSleep: 1, horizonLived: 1 }), run({ energyLedger: 1, rhythmSleep: 1 }));
});
