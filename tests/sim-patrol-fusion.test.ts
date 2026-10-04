// Stage E4j (docs/staging/e4j-prereg.md §4): patrolFusion. With patrolValue 2 a male weighs leading a patrol when his
// party first holds patrolMinMales adult males. At 0 "first holds" is read from his 35 m view (fewer at his previous
// look), so a male stepping out of sight and back inside one party raises the occasion again; at 1 it counts the adult
// males he has been with within reunionH (seen within that span before this look), so only a fusion raises it.
import assert from 'node:assert/strict';
import test from 'node:test';
import { paramsOf, type Overrides } from '../src/sim/params';
import { IMPULSE_PATROL, knownAdultMales, perceive } from '../src/sim/perception';
import { isAdultMale } from '../src/sim/hierarchy';
import { NEVER, index, ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

/** S16 (docs/staging/e-stack2-confirm.md; bench-run4 s16/S16-params.json), the stage's reference stack. */
const S16: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1,
  callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1, nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1,
  waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1,
  huntValue: 1, forageRate: 1, contestAssess: 1, socialTiming: 15, patrolValue: 2 };
const DAY = 5760;

test('patrolFusion is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).patrolFusion, 0, profile);
});

test('switch 0 leaves the S16 world as it is; 1 changes it within two days', () => {
  const a = createWorld(48, { profile: 'field', params: S16 }), b = createWorld(48, { profile: 'field', params: { ...S16, patrolFusion: 0 } });
  const c = createWorld(48, { profile: 'field', params: { ...S16, patrolFusion: 1 } });
  for (let i = 0; i < 2 * DAY; i++) { tickWorld(a); tickWorld(b); tickWorld(c); }
  assert.equal(worldHash(a), worldHash(b));
  assert.notEqual(worldHash(a), worldHash(c));
});

test('a correction: the prescription count does not change (S16 49)', () => {
  assert.equal(prescriptionCount({ ...S16, patrolFusion: 1 }).total, prescriptionCount(S16).total);
});

// One S16 field world at 07:30 on day 1 (a JSON copy per scene).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48, { profile: 'field', params: S16 }); for (let i = 0; i < 240; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
function scene(fusion: number) {
  const w = JSON.parse(snapshot()) as World;
  (w as unknown as { sim: { params: { overrides: Overrides } } }).sim.params.overrides.patrolFusion = fusion;
  w.environment.rain = 0;
  const males = w.chimps.filter(c => c.alive && isAdultMale(c));
  const troop = [...new Set(males.map(m => m.troopId))].find(t => males.filter(m => m.troopId === t).length >= 3)!;
  const [m, a, b] = males.filter(x => x.troopId === troop);
  simOf(w).patrols[troop] = null;
  for (const o of w.chimps) if (o.alive && o !== m && o !== a && o !== b) o.position = [o.position[0] + 5000, 0, o.position[2] + 5000]; // nobody else in view
  a.position = [m.position[0] + 4, 0, m.position[2]]; b.position = [m.position[0], 0, m.position[2] + 4];
  const x = ix(m);
  x.impulse = 0; x.impulseUntil = NEVER; x.ownMales = 2; x.isolated = -1; x.metAt = {}; // the scenes set who he has been with
  return { w, m, a, b, x };
}

test('knownAdultMales counts the adult males of his community seen within the span, himself included', () => {
  const { w, m, a, b } = scene(1);
  const t = w.time;
  assert.equal(knownAdultMales(w, m, { [a.id]: t - 0.5, [b.id]: t - 0.9 }, t, 1), 3);
  assert.equal(knownAdultMales(w, m, { [a.id]: t - 0.5, [b.id]: t - 2 }, t, 1), 2);
  assert.equal(knownAdultMales(w, m, {}, t, 1), 1);
});

test('at 0 a flicker of sight raises the occasion; at 1 only a fusion does', () => {
  // all three in view now, two in his previous view: with 0 the occasion is raised whatever he knew of the third
  for (const recent of [true, false]) {
    const s = scene(0), t = s.w.time;
    s.x.metAt[s.a.id] = t - 0.1; s.x.metAt[s.b.id] = recent ? t - 0.2 : t - 3;
    perceive(s.w, s.m);
    assert.equal(s.x.ownMales, 3);
    assert.equal(s.x.impulse, IMPULSE_PATROL, `switch 0, third male ${recent ? 'seen 12 min ago' : 'away 3 h'}`);
  }
  // with 1: the third male seen 12 min ago (the party already held three) does not raise it; one back after 3 h does
  for (const [recent, raised] of [[true, false], [false, true]] as const) {
    const s = scene(1), t = s.w.time;
    s.x.metAt[s.a.id] = t - 0.1; s.x.metAt[s.b.id] = recent ? t - 0.2 : t - 3;
    perceive(s.w, s.m);
    assert.equal(s.x.ownMales, 3);
    assert.equal(s.x.impulse === IMPULSE_PATROL, raised, `switch 1, third male ${recent ? 'seen 12 min ago' : 'away 3 h'}`);
  }
  assert.ok(index(JSON.parse(snapshot()) as World)); // the snapshot itself is untouched by the scenes
});
