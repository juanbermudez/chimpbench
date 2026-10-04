// Stage E4q (docs/staging/e4q-prereg.md §4): aggressionGaps, a sum of bits that switch out the literal gaps after an
// animal's own last act, without replacement (the diagnosis found that none sets its behaviour's rate). 1: the 1.5-h
// cooldown after aggression (status, escalated, grudge, coercive and female-dominance offers); 2: the 0.2-h gap of a
// charge at strangers; 4: the 0.75-h display gap. 0 = today.
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { maternalKin } from '../src/sim/hierarchy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

/** S27 (docs/staging/e-stack2-confirm.md; bench-run3 s27q/S27q-params.json), the stage's reference stack. */
const S27: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1,
  callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1,
  waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1,
  huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1 };
const DAY = 5760;

test('aggressionGaps is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).aggressionGaps, 0, profile);
});

test('switch 0 leaves the S27 world as it is; every bit on changes it', () => {
  const a = createWorld(7, { profile: 'field', params: S27 }), b = createWorld(7, { profile: 'field', params: { ...S27, aggressionGaps: 0 } });
  const c = createWorld(7, { profile: 'field', params: { ...S27, aggressionGaps: 7 } });
  for (let i = 0; i < DAY / 2; i++) { tickWorld(a); tickWorld(b); tickWorld(c); }
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(c));
});

test('the prescription count falls by one per bit: S27 51 → 48, today 147 → 144', () => {
  const base = prescriptionCount(S27).total;
  assert.equal(base, 51);
  for (const [bit, drop] of [[1, 1], [2, 1], [4, 1], [7, 3]] as const) assert.equal(prescriptionCount({ ...S27, aggressionGaps: bit }).total, base - drop, `bit ${bit}`);
  assert.equal(prescriptionCount({}).total - prescriptionCount({ aggressionGaps: 7 }).total, 3);
});

// One S27 field world at 07:30 on day 1, restored with overrides (scenes below change positions and states by hand).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48, { profile: 'field', params: S27 }); for (let i = 0; i < 240; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Overrides): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  w.environment.rain = 0;
  return w;
};
const cands = (w: World, c: Chimp): Candidate[] => { const out: Candidate[] = []; computeCandidates(w, c, out); return out; };
const has = (w: World, c: Chimp, action: string, v: number, target?: number) =>
  cands(w, c).some(k => k.action === action && candidateMeta.get(k)?.v === v && (target === undefined || k.targetId === target));

/** An adult male at rest, rested and fed, with one adult female of his community 4 m away and no one else in view. */
function scene(bits: number) {
  const w = withParams({ aggressionGaps: bits });
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age >= 20)!;
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && c.troopId === m.troopId && !maternalKin(c, m))!;
  f.position = [m.position[0] + 4, 0, m.position[2]];
  for (const [a, b] of [[m, f], [f, m]] as const) { a.action = 'rest'; a.targetId = -1; a.hunger = 0.1; a.energy = 0.9; const x = ix(a); x.seen = [b.id]; x.finished = false; x.strangers = 0; }
  return { w, m, f, x: ix(m) };
}

test('bit 4: a display 6 min after the last one is offered only without the gap', () => {
  for (const bits of [0, 4]) {
    const s = scene(bits);
    s.x.lastDisplay = s.w.time - 0.1;
    const shown = has(s.w, s.m, 'display', V.NONE) || has(s.w, s.m, 'display', V.REUNION) || has(s.w, s.m, 'display', V.RIVAL);
    assert.equal(shown, bits === 4, `bits ${bits}`);
    s.x.lastDisplay = s.w.time - 1;
    assert.ok(has(s.w, s.m, 'display', V.NONE) || has(s.w, s.m, 'display', V.REUNION) || has(s.w, s.m, 'display', V.RIVAL), `bits ${bits}: an hour after, offered either way`);
  }
  const t = scene(4);
  t.m.energy = 0.2; t.x.lastDisplay = t.w.time - 1;
  assert.ok(!has(t.w, t.m, 'display', V.NONE) && !has(t.w, t.m, 'display', V.REUNION), 'the fatigue gate (energy above 0.3) stays');
});

test('bit 1: a coercive charge 30 min after the last aggression is offered only without the cooldown', () => {
  for (const bits of [0, 1, 6]) {
    const s = scene(bits);
    s.f.swelling = 1; ix(s.f).coerce[s.m.id] = 0; s.x.lastAgg = s.w.time - 0.5;
    assert.equal(has(s.w, s.m, 'charge', V.COERCE, s.f.id), bits === 1, `bits ${bits}`);
  }
});

test('bit 2: a charge at strangers 6 min after the last aggression is offered only without the gap', () => {
  for (const bits of [0, 2, 5]) {
    const s = scene(bits);
    const st = s.w.chimps.find(c => c.alive && c.troopId !== s.m.troopId && c.sex === 'male' && c.age >= 15)!;
    st.position = [s.m.position[0] + 10, 0, s.m.position[2]];
    Object.assign(s.x, { strangers: 1, strangerMales: 1, nearestStranger: st.id, ownMales: 4, transferTo: -1 });
    s.x.seen = [s.f.id, st.id]; s.x.lastAgg = s.w.time - 0.1;
    assert.equal(has(s.w, s.m, 'charge', V.STRANGER, st.id), bits === 2, `bits ${bits}`);
    if (bits !== 2) assert.ok(has(s.w, s.m, 'display', V.STRANGER, st.id), `bits ${bits}: within the gap he displays at the strangers instead`);
  }
});
