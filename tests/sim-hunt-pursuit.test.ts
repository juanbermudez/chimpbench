import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHunt } from '../src/sim/ecology';
import { ledgerOf, meatKcalPerUnit, reserveCap } from '../src/sim/energy';
import { HUNT_CLIMB, bodySpeed, closes, closingSets, coneHalfAngle, evenCaptures, pursuitCone, spreadBearing } from '../src/sim/huntpursuit';
import { huntRate } from '../src/sim/huntvalue';
import { paramsOf } from '../src/sim/params';
import { simOf, type HuntState } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';

// Stage E4k (huntPursuit; docs/staging/e4k-prereg.md §4): success and kills from the pursuit geometry, no dice; 0 keeps
// today's success curve and extra-capture die.

const R = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1 };
const deg = (d: number) => d * Math.PI / 180;
const HALF = Math.PI / 2; // equal speeds

test('huntPursuit and its speed ratio default to 0 and 1 in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.huntPursuit, 0);
    assert.equal(P.huntPursuitSpeedRatio, 1);
  }
});

test('cones: asin(k) up to equal speeds, every direction for a faster pursuer', () => {
  assert.equal(coneHalfAngle(1), HALF);
  assert.ok(Math.abs(coneHalfAngle(0.5) - Math.PI / 6) < 1e-12);
  assert.equal(coneHalfAngle(1.2), Math.PI);
});

test('escape: at equal speeds a group is caught only inside the hunters\' convex hull', () => {
  const h3 = [HALF, HALF, HALF];
  assert.equal(closes([0, Math.PI], [HALF, HALF], [0, 1]), false, 'two hunters exactly opposite leave the bisector open');
  assert.equal(closes([0, deg(120), deg(240)], h3, [0, 1, 2]), true, 'three evenly around');
  assert.equal(closes([0, deg(90), deg(180)], h3, [0, 1, 2]), false, 'three on one half leave a 180° gap');
  assert.equal(closes([0, deg(20), deg(40)], h3, [0, 1, 2]), false, 'three on one side');
  const slow = coneHalfAngle(0.8); // 53°: three evenly spaced leave 14° gaps, four close it
  assert.equal(closes([0, deg(120), deg(240)], [slow, slow, slow], [0, 1, 2]), false);
  assert.equal(closes([0, deg(90), deg(180), deg(270)], [slow, slow, slow, slow], [0, 1, 2, 3]), true);
  assert.equal(closes([1], [Math.PI], [0]), true, 'a faster pursuer alone');
  assert.equal(closes([1], [HALF], [0]), false, 'an equal pursuer alone');
});

test('kills from the same scene: one monkey per disjoint closing set', () => {
  const six = [0, 60, 120, 180, 240, 300].map(deg);
  assert.equal(closingSets(six, six.map(() => HALF)).length, 2);
  assert.deepEqual(closingSets(six, six.map(() => HALF)), [[0, 2, 4], [1, 3, 5]]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(n => evenCaptures(n, HALF)), [0, 0, 1, 1, 1, 2]);
  assert.equal(evenCaptures(3, coneHalfAngle(0.8)), 0, 'tired hunters need a fourth');
});

test('a hunter heads for the widest escape gap the others leave', () => {
  assert.equal(spreadBearing(1, []), 1, 'alone: straight in');
  assert.ok(Math.abs(spreadBearing(0, [0]) - Math.PI) < 1e-12, 'opposite the other');
  assert.ok(Math.abs(spreadBearing(0, [0, HALF]) - deg(225)) < 1e-9, 'the middle of the larger gap');
});

test('the pursuit cone reads the hunter\'s own condition', () => {
  const w = createWorld(33, { profile: 'field', params: { huntPursuit: 1 } }), P = paramsOf(w);
  const c = w.chimps.find(k => k.alive && k.sex === 'male' && k.age >= 15 && k.age < 40)!;
  c.injury = 0; c.energy = 1;
  assert.equal(bodySpeed(c), 1);
  assert.equal(pursuitCone(c, P), HALF);
  c.injury = 0.5;
  assert.ok(pursuitCone(c, P) < HALF);
});

/** Hunters of community 1 placed at canopy height around colobus group p at the given bearings; the hunt resolves now. */
function huntScene(params: Record<string, number>, bearings: number[], below = 0): { w: World; h: HuntState; hunters: Chimp[] } {
  const w = createWorld(33, { profile: 'field', params });
  for (let i = 0; i < 60; i++) tickWorld(w);
  const p = w.prey[0];
  p.size = 30;
  const males = w.chimps.filter(k => k.alive && k.sex === 'male' && k.age >= 15 && k.age < 40 && k.troopId === 1);
  assert.ok(males.length >= bearings.length, 'enough adult males');
  const hunters = males.slice(0, bearings.length);
  hunters.forEach((c, i) => {
    c.position = [p.position[0] + Math.sin(bearings[i]) * 2, HUNT_CLIMB * p.position[1] - below, p.position[2] + Math.cos(bearings[i]) * 2];
    c.action = 'hunt'; c.targetId = p.id; c.injury = 0; c.energy = 1; c.carryingMeat = 0;
  });
  const h: HuntState = { preyId: p.id, troopId: 1, start: w.time - 0.1, resolveAt: w.time, hunters: hunters.map(c => c.id), interId: -1 };
  simOf(w).hunts.push(h);
  return { w, h, hunters };
}

test('with the switch the outcome is the scene: three around catch one, two or one-sided escape, six catch two; no draw', () => {
  for (const [bearings, kills] of [[[0, 120, 240], 1], [[0, 180], 0], [[0, 30, 60], 0], [[0, 60, 120, 180, 240, 300], 2]] as [number[], number][]) {
    const { w, h, hunters } = huntScene({ huntPursuit: 1 }, bearings.map(deg));
    const rng = w.rng, s0 = w.stats.huntSuccesses, size = w.prey[0].size;
    resolveHunt(w, h);
    assert.equal(w.rng, rng, 'no draw from world.rng');
    assert.equal(hunters.filter(c => c.carryingMeat > 0).length, kills, `${bearings}`);
    assert.equal(w.stats.huntSuccesses - s0, kills ? 1 : 0);
    assert.equal(size - w.prey[0].size, kills);
  }
});

test('with the switch a hunter still below the canopy cuts nothing off', () => {
  const { w, h, hunters } = huntScene({ huntPursuit: 1 }, [0, 120, 240].map(deg), 3);
  resolveHunt(w, h);
  assert.equal(hunters.filter(c => c.carryingMeat > 0).length, 0);
});

test('without the switch the success die is drawn as today', () => {
  const { w, h } = huntScene({}, [0, 120, 240].map(deg));
  const rng = w.rng;
  resolveHunt(w, h);
  assert.notEqual(w.rng, rng, 'today the outcome is a draw');
});

test('the valuation expects the same function: nothing below three hunters, the even-spread captures shared', () => {
  const w = createWorld(33, { profile: 'field', params: { ...R, huntValue: 1, huntPursuit: 1 } });
  for (let i = 0; i < 1440; i++) tickWorld(w);
  const P = paramsOf(w), a = w.chimps.find(k => k.alive && k.sex === 'male' && k.age >= 15 && k.age < 40)!;
  a.injury = 0; a.energy = 1;
  ledgerOf(a, P).res = -0.5 * reserveCap(a, P); // a deficit: he needs more than a capture gives
  assert.equal(huntRate(a, P, 40, 1), 0);
  assert.equal(huntRate(a, P, 40, 2), 0, 'two hunters cannot surround a group');
  const r3 = huntRate(a, P, 40, 3), r6 = huntRate(a, P, 40, 6);
  assert.ok(r3 > 0, `r(3) ${r3}`);
  assert.ok(r6 >= r3 * 0.99, 'six hunters close two circles: the same share each');
  assert.ok(meatKcalPerUnit(P) > 0);
});
