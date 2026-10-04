// Stage E4p (matingValue; docs/staging/e4p-prereg.md §5): a copulation is worth the share of her cycle's paternity it adds
// (the model's own rule) and needs the partner's choice; no quota or gap.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, getEligibleActions, tickWorld } from '../src/simulation';
import { consents, copulationWeight, paternityGain } from '../src/sim/mating';
import { perceive } from '../src/sim/perception';
import { recordCopulation } from '../src/sim/reproduction';
import { ix } from '../src/sim/state';
import { DEFAULT_PARAMS, paramsOf as paramsOfWorld } from '../src/sim/params';
import type { Chimp, World } from '../src/types';

const P = DEFAULT_PARAMS;
const atDay = (c: Chimp, day: number) => { c.cycleDay = day * ix(c).cycleLen / P.cycleTemplateDays; c.swelling = 1; c.pregnancy = 0; };
const pair = (w: World) => {
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 18 && c.age < 30)!;
  const ms = w.chimps.filter(c => c.alive && c.sex === 'male' && c.age >= 15 && c.troopId === f.troopId && c.motherId !== f.id);
  return { f, m: ms[0], r: ms[1] };
};

test('copulationWeight follows recordCopulation: 0 before and after maximal swelling, 1, then 2 in the periovulatory days', () => {
  const w = createWorld(48), { f } = pair(w);
  atDay(f, P.cycleMaxDay - 2); assert.equal(copulationWeight(f, P), 0);
  atDay(f, P.cycleMaxDay + 1); assert.equal(copulationWeight(f, P), 1);
  atDay(f, P.cyclePeriovulatoryDay + 1); assert.equal(copulationWeight(f, P), 2);
  atDay(f, P.cycleMaxEndDay + 0.5); assert.equal(copulationWeight(f, P), 0);
  f.cycleDay = -1; assert.equal(copulationWeight(f, P), 0);
});

test('paternityGain: a cycle\'s first copulation is worth 1 (2 periovulatory), the value falls as copulations accumulate, and a sole mate gains nothing once conception has saturated', () => {
  const w = createWorld(48), { f, m, r } = pair(w);
  atDay(f, P.cycleMaxDay + 1); ix(f).cops = {};
  assert.equal(paternityGain(f, m, P), 1);
  atDay(f, P.cyclePeriovulatoryDay + 1); assert.equal(paternityGain(f, m, P), 2);
  atDay(f, P.cycleMaxDay + 1);
  // below saturation each copulation adds the same share of the conception chance
  recordCopulation(w, f, r);
  assert.ok(Math.abs(paternityGain(f, m, P) - 1) < 1e-12);
  for (let i = 0; i < 9; i++) recordCopulation(w, f, r);
  const g10 = paternityGain(f, m, P);
  for (let i = 0; i < 20; i++) recordCopulation(w, f, r);
  const g30 = paternityGain(f, m, P);
  assert.ok(g10 < 1 && g30 < g10 && g30 > 0, `${g10} ${g30}`);
  // the rival is the sole mate: one more copulation of his adds nothing
  assert.ok(Math.abs(paternityGain(f, r, P)) < 1e-12);
  // m's own copulations lower his next gain
  const before = paternityGain(f, m, P);
  for (let i = 0; i < 10; i++) recordCopulation(w, f, m);
  assert.ok(paternityGain(f, m, P) < before);
});

test('consents: the partner\'s act must be mating with the actor, or a male\'s guarding or consorting with her', () => {
  const w = createWorld(48), { f, m } = pair(w);
  f.action = 'forage'; f.targetId = -1; assert.equal(consents(f, m), false);
  f.action = 'mate'; f.targetId = m.id; assert.equal(consents(f, m), true);
  m.action = 'guard'; m.targetId = f.id; assert.equal(consents(m, f), true);
  m.action = 'consort'; m.targetId = f.id; assert.equal(consents(m, f), true);
  f.action = 'guard'; f.targetId = m.id; assert.equal(consents(f, m), false, 'a female does not consent by guarding');
});

test('with matingValue 1 the mate offer is worth the paternity it adds and no quota closes it; with 0 the quota still does', () => {
  for (const mv of [0, 1]) {
    const w = createWorld(48, { params: { matingValue: mv } });
    while (w.time < 3) tickWorld(w);
    const { f, m } = pair(w);
    atDay(f, P.cycleMaxDay + 1); ix(f).cops = {}; f.nest = null; f.position = [m.position[0] + 1, 0, m.position[2]];
    m.hunger = 0.2; ix(m).lastMate = w.time - 0.5; // inside the 1.5-h quota
    perceive(w, m);
    const has = getEligibleActions(w, m).some(c => c.action === 'mate' && c.targetId === f.id);
    assert.equal(has, mv === 1, `matingValue ${mv}`);
    if (mv === 1) {
      for (let i = 0; i < 40; i++) recordCopulation(w, f, m); // he is her sole mate: nothing to add
      perceive(w, m);
      assert.ok(!getEligibleActions(w, m).some(c => c.action === 'mate' && c.targetId === f.id), 'no offer worth nothing');
    }
  }
});

test('matingValue 2: a copulation\'s fertilizing weight decays with the age of its sperm (spermLifeDays), in the gain and at ovulation alike', () => {
  const w = createWorld(48, { params: { matingValue: 2 } }), Pw = paramsOfWorld(w), { f, m, r } = pair(w);
  atDay(f, Pw.cycleMaxDay + 1); ix(f).cops = {}; delete ix(f).cd; delete ix(f).cdAt;
  for (let i = 0; i < 10; i++) recordCopulation(w, f, r);
  const fresh = paternityGain(f, m, Pw, w);
  assert.ok(Math.abs((ix(f).cd ?? {})[r.id] - 10) < 1e-9, 'the record holds the ten weights');
  w.time += 24 * Pw.spermLifeDays; // one e-folding later, the rival's ten copulations stand at 10 / e
  const later = paternityGain(f, m, Pw, w);
  assert.ok(later > fresh, `${fresh} → ${later}`);
  const C = 10 / Math.E, S = Pw.matingSaturation;
  const expect = (Math.min(1, (C + 1) / S) * 1 / (C + 1)) / Math.min(1, 1 / S);
  assert.ok(Math.abs(later - expect) < 1e-9, `${later} vs ${expect}`);
  // matingValue 1 ignores the decay: the cumulative counts
  const w1 = createWorld(48, { params: { matingValue: 1 } }), P1 = paramsOfWorld(w1), q = pair(w1);
  atDay(q.f, P1.cycleMaxDay + 1); ix(q.f).cops = {};
  for (let i = 0; i < 10; i++) recordCopulation(w1, q.f, q.r);
  assert.equal(ix(q.f).cd, undefined, 'no decayed record without the switch at 2');
  const g1 = paternityGain(q.f, q.m, P1, w1); w1.time += 24 * P1.spermLifeDays;
  assert.equal(paternityGain(q.f, q.m, P1, w1), g1);
});
