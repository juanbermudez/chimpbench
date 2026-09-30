import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { buildRequest } from '../src/decision';
import { GATE, gateCheck, intentOf, patchPoor, type Intent } from '../src/decide/gate';
import type { FoodPlace, Situation } from '../src/decide/facts';
import type { SimChimp } from '../src/sim/state';

/** A compressed world with every adult model-driven until one of them waits at a decision point; returns it after its choice. */
function chosen(seed = 48): { w: World; c: Chimp; intent: Intent } {
  const w = createWorld(seed);
  w.modelPolicy = { ...w.modelPolicy, mode: 'async' };
  for (let i = 0; i < 4000; i++) {
    for (const k of w.chimps) if (k.alive) k.controller = k.age >= 8 ? 'model' : 'rules';
    tickWorld(w);
    const c = w.chimps.find(k => k.alive && k.controller === 'model' && k.awaitingDecisionSince !== null && buildRequest(w, k).options.some(o => o.action === 'rest'));
    if (!c) { for (const k of w.chimps) if (k.alive && k.controller === 'model' && k.awaitingDecisionSince !== null) applyDecision(w, k.id, buildRequest(w, k).options[0], 'decide', k.decisionVersion); continue; }
    const rest = buildRequest(w, c).options.find(o => o.action === 'rest')!;
    assert.ok(applyDecision(w, c.id, rest, 'decide', c.decisionVersion));
    return { w, c, intent: intentOf(w, c, 'rest', -1, 0) };
  }
  throw new Error('no decision point');
}

test('an unchanged chimp keeps its intent; no intent means a decision', () => {
  const { w, c, intent } = chosen();
  assert.deepEqual(gateCheck(w, c, undefined), { keep: false, reason: 'no-intent' });
  assert.deepEqual(gateCheck(w, c, intent), { keep: true, action: 'rest', targetId: -1, reason: 'kept' });
});

test('salient changes re-open the decision: interrupt, need bucket, period, age, an ended intent', () => {
  const { w, c, intent } = chosen();
  const x = (c as SimChimp).sim;
  const saved = { lastIntrAt: x.lastIntrAt, hunger: c.hunger, action: c.action };
  x.lastIntrAt = intent.chosenAt + 0.01;
  assert.deepEqual(gateCheck(w, c, intent), { keep: false, reason: 'interrupt' });
  x.lastIntrAt = saved.lastIntrAt;
  c.hunger = intent.buckets.hunger === 'severe' ? 0.1 : 0.95;
  assert.deepEqual(gateCheck(w, c, intent), { keep: false, reason: 'need-bucket' });
  c.hunger = saved.hunger;
  assert.deepEqual(gateCheck(w, c, { ...intent, period: intent.period === 'night' ? 'midday' : 'night' }), { keep: false, reason: 'period' });
  assert.deepEqual(gateCheck(w, c, { ...intent, chosenAt: w.time - GATE.maxAgeH - 0.01 }), { keep: false, reason: 'max-age' });
  assert.deepEqual(gateCheck(w, c, { ...intent, action: 'groom', targetId: 12345 }), { keep: false, reason: 'ended' });
  assert.equal(c.action, saved.action);
});

test('the gate verdict is pure', () => {
  const { w, c, intent } = chosen(21);
  const before = JSON.stringify(w), rng = w.rng;
  for (const k of w.chimps.filter(q => q.alive)) gateCheck(w, k, { ...intent });
  gateCheck(w, c, intent);
  assert.equal(w.rng, rng);
  assert.equal(JSON.stringify(w), before);
});

test('feeding here is re-decided when a known place offers at least twice the food per hour, walk included', () => {
  const place = (treeId: number, perHourInclWalk: number, rateH = 0.2): FoodPlace => ({ treeId, species: 'fig', source: 'memory', crop: 1, cropKnown: true, distM: 300, walkMin: 14, memoryAgeH: 5, feeders: 0, rateH, feedH: 3, perHourInclWalk, thirstPerHInclWalk: 0 });
  const s = { here: { leafRateH: 0.1, rateH: 0.1 }, inSight: [] as FoodPlace[], remembered: [place(100_009, 0.19)] } as unknown as Situation;
  assert.equal(patchPoor(s, -1), false, '1.9× leaves: stay');
  s.remembered = [place(100_009, 0.2)];
  assert.equal(patchPoor(s, -1), true, '2× leaves: reconsider');
  s.inSight = [place(100_007, 0, 0.18)];
  assert.equal(patchPoor(s, 100_007), false, 'in a fruit crown at 0.18/h, 0.2/h elsewhere is not twice as good');
});
