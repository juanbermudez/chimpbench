// Stage E5g (docs/staging/e5g-prereg.md §4): callGaps, a sum of bits, one per literal call gap. 1: the 0.5-h gap after
// the caller's own last call (callReady), which under callValue gates only the reunion pant-hoot, is not read; 2: the snake
// alarm's repeat penalty is not read; 4: the alarm-hoo every 60 s of an alarm act is replaced by a hoo while an own-
// community animal in sight has not learnt of the snake. 0 = today.
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { executeAction } from '../src/sim/execution';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix, simOf } from '../src/sim/state';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

/** S31 (docs/staging/e-stack2-confirm.md; bench-run s31q/S31q-params.json), the stage's reference stack. */
const S31: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1,
  callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1,
  waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1,
  huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1 };
const DAY = 5760;

test('callGaps is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).callGaps, 0, profile);
});

test('switch 0 leaves the S31 world as it is; bit 1 (the only bit that acts without a snake model) changes it', () => {
  const a = createWorld(48, { profile: 'field', params: S31 }), b = createWorld(48, { profile: 'field', params: { ...S31, callGaps: 0 } });
  const c = createWorld(48, { profile: 'field', params: { ...S31, callGaps: 1 } }), d = createWorld(48, { profile: 'field', params: { ...S31, callGaps: 6 } });
  for (let i = 0; i < DAY; i++) { tickWorld(a); tickWorld(b); tickWorld(c); tickWorld(d); }
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(c));
  assert.equal(worldHash(a), worldHash(d), 'bits 2 and 4 act only at a snake model (snakes appear only in experiments)');
});

test('the prescription count falls by one per bit: S31 48 → 45; bit 1 needs callValue', () => {
  const base = prescriptionCount(S31).total;
  assert.equal(base, 48);
  for (const [bit, drop] of [[1, 1], [2, 1], [4, 1], [7, 3]] as const) assert.equal(prescriptionCount({ ...S31, callGaps: bit }).total, base - drop, `bit ${bit}`);
  assert.equal(prescriptionCount({}).total - prescriptionCount({ callGaps: 7 }).total, 2, 'today\'s model: bits 2 and 4');
  assert.equal(prescriptionCount({ callValue: 1 }).total - prescriptionCount({ callValue: 1, callGaps: 1 }).total, 1);
});

// One S31 field world at 07:30 on day 1, restored with overrides (scenes below change positions and states by hand).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48, { profile: 'field', params: S31 }); for (let i = 0; i < 240; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Overrides): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  w.environment.rain = 0;
  return w;
};
const cands = (w: World, c: Chimp): Candidate[] => { const out: Candidate[] = []; computeCandidates(w, c, out); return out; };
const adultMale = (w: World) => w.chimps.find(c => c.alive && c.sex === 'male' && c.age >= 20)!;

test('bit 1: under callValue a reunion pant-hoot 0.2 h after the own last call is offered only without the gap', () => {
  for (const [over, open] of [[{ callGaps: 0 }, false], [{ callGaps: 1 }, true], [{ callGaps: 1, callValue: 0 }, false], [{ callGaps: 6 }, false]] as const) {
    const w = withParams(over), m = adultMale(w), x = ix(m);
    // no allies, so the valued pant-hoot has no gain and the 'call' slot can only hold the reunion variant
    m.action = 'rest'; m.targetId = -1; m.allies = []; m.hunger = 0.1; m.energy = 0.9;
    Object.assign(x, { seen: [], newcomers: 1, strangers: 0, visibleOwn: 1, finished: false, lastCall: w.time - 0.2 });
    const call = cands(w, m).find(k => k.action === 'call');
    assert.equal(!!call && candidateMeta.get(call)?.v === V.REUNION, open, JSON.stringify(over));
    x.lastCall = w.time - 0.6;
    const later = cands(w, m).find(k => k.action === 'call');
    assert.ok(later && candidateMeta.get(later)?.v === V.REUNION, `${JSON.stringify(over)}: 0.6 h after, offered either way`);
  }
});

/** A snake model 4 m from an adult (aware of it), its own community out of sight. */
function snakeScene(bits: number) {
  const w = withParams({ callGaps: bits });
  const a = adultMale(w), x = ix(a);
  const st = applyIntervention(w, 'snake-model', { troopId: a.troopId, position: [a.position[0], 0, a.position[2]] })!;
  const aware = simOf(w).aware[st.id] ?? (simOf(w).aware[st.id] = []);
  if (!aware.includes(a.id)) aware.push(a.id);
  for (const o of w.chimps) if (o !== a && o.alive && o.troopId === a.troopId && Math.hypot(o.position[0] - a.position[0], o.position[2] - a.position[2]) < 200) o.position = [a.position[0] + 300, 0, a.position[2] + 300];
  Object.assign(x, { seen: [], stims: [st.id], sight: 35, finished: false });
  a.action = 'rest'; a.targetId = -1;
  return { w, a, x, st };
}

test('bit 2: an alarm 0.01 h after the own last call is worth 0.4 less only without the bit', () => {
  for (const bits of [0, 2, 5]) {
    const s = snakeScene(bits);
    s.x.lastCall = s.w.time - 0.01;
    const k = cands(s.w, s.a).find(c => c.action === 'alarm');
    assert.ok(k, `bits ${bits}: offered`);
    const raw = candidateMeta.get(k!)?.raw ?? NaN;
    assert.ok(Math.abs(raw - ((bits & 2) ? 0.2 : -0.2)) < 1e-9, `bits ${bits}: value ${raw}`);
  }
});

test('bit 4: no hoo on the minute; a hoo while an own-community animal in sight has not learnt of the snake', () => {
  const hoos = (w: World, id: number, from: number) => w.calls.filter(c => c.id >= from && c.kind === 'alarm-hoo' && c.callerId === id).length;
  for (const bits of [0, 4]) {
    const s = snakeScene(bits);
    s.a.action = 'alarm'; s.a.targetId = -1; s.a.actionTime = 45; // the next tick of the act is its 60th second
    let from = s.w.nextId;
    executeAction(s.w, s.a);
    assert.equal(hoos(s.w, s.a.id, from), bits === 4 ? 0 : 1, `bits ${bits}: at 60 s, nobody unaware in sight`);
    if (bits !== 4) continue;
    // an own-community juvenile walks into sight, unaware of the snake: a hoo, which tells it
    const j = s.w.chimps.find(o => o.alive && o.troopId === s.a.troopId && o.age >= 5 && o.age < 10 && !(simOf(s.w).aware[s.st.id] ?? []).includes(o.id))!;
    j.position = [s.a.position[0] + 20, 0, s.a.position[2]];
    from = s.w.nextId;
    executeAction(s.w, s.a);
    assert.equal(hoos(s.w, s.a.id, from), 1, 'a hoo for the animal that has not learnt');
    assert.ok((simOf(s.w).aware[s.st.id] ?? []).includes(j.id), 'the hoo told it');
    from = s.w.nextId;
    executeAction(s.w, s.a);
    assert.equal(hoos(s.w, s.a.id, from), 0, 'everyone in sight has heard: no more hoos');
    // beyond the sight radius it is not in its audience
    const k = s.w.chimps.find(o => o.alive && o.troopId === s.a.troopId && o.age >= 10 && o !== j && !(simOf(s.w).aware[s.st.id] ?? []).includes(o.id))!;
    k.position = [s.a.position[0] + 60, 0, s.a.position[2]];
    from = s.w.nextId;
    executeAction(s.w, s.a);
    assert.equal(hoos(s.w, s.a.id, from), 0, 'an unaware animal out of sight does not make it hoo');
  }
});
