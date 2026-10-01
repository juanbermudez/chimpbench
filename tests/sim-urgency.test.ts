import assert from 'node:assert/strict';
import test from 'node:test';
import { periodNow } from '../src/decide/facts';
import { candidateMeta, computeCandidates, findCandidate, V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { rgChoice, rgMenu } from '../src/sim/rg';
import { isTreeId, ix } from '../src/sim/state';
import { choiceProbs, payOf, servesDeficit, stillPaying, urgency, urgencyTemperature } from '../src/sim/urgency';
import { createWorld, observe, rulesChoice, stepWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E3 (docs/staging/e3-prereg.md): urgency replaces the fixed choice constants. Switches urgencyChoice,
// urgencyPersist and urgencySwitchCost, all 0 by default.

const ALL = { urgencyChoice: 1, urgencyPersist: 1, urgencySwitchCost: 1 };
const run = (w: World, days: number) => { for (let i = 0, n = Math.round(days * 5760); i < n; i++) tickWorld(w); return w; };
/** What the animals did (the world hash also covers the parameter overrides, which differ by construction). */
const state = (w: World) => JSON.stringify([w.rng, w.chimps.map(c => [c.action, c.targetId, c.position, c.hunger, c.decisionVersion])]);
const setNeeds = (c: Chimp, hunger: number, thirst = 0.1, energy = 0.9, social = 0.9, stress = 0) => { c.hunger = hunger; c.thirst = thirst; c.energy = energy; c.social = social; c.stress = stress; };

test('switches off: choices are today\'s, bit for bit; each switch on changes the run and silences the constants it replaces', () => {
  const P = paramsOf(createWorld(48)), F = paramsOf(createWorld(48, { profile: 'field' }));
  for (const id of ['urgencyChoice', 'urgencyPersist', 'urgencySwitchCost'] as const) { assert.equal(P[id], 0, `${id} compressed`); assert.equal(F[id], 0, `${id} field`); }
  // explicit zeros equal the defaults (the golden-world test pins the defaults to the hashes recorded before E3)
  const base = run(createWorld(48), 0.75);
  assert.equal(state(run(createWorld(48, { params: { urgencyChoice: 0, urgencyPersist: 0, urgencySwitchCost: 0 } }), 0.75)), state(base));
  const replaced: [keyof typeof ALL, Record<string, number>][] = [
    ['urgencyChoice', { rgTemperature: 0.5 }], ['urgencyPersist', { rgMaxAgeH: 1.5 }], ['urgencySwitchCost', { continueBonus: 0.5, finishedPenalty: 1 }],
  ];
  for (const [id, other] of replaced) {
    const on = state(run(createWorld(48, { params: { [id]: 1 } }), 0.75));
    assert.notEqual(on, state(base), `${id} changes behaviour`);
    assert.equal(state(run(createWorld(48, { params: { [id]: 1, ...other } }), 0.75)), on, `${id}: the replaced constants have no effect`);
    assert.notEqual(state(run(createWorld(48, { params: other }), 0.75)), state(base), `${id}: they do with the switch off`);
  }
});

test('temperature falls with urgency and is bounded below by the score jitter\'s noise', () => {
  const P = paramsOf(createWorld(48)), t1 = P.candidateJitterSpan / (Math.PI * Math.SQRT2);
  let last = Infinity;
  for (let U = 0.01; U <= 1.0001; U += 0.01) {
    const T = urgencyTemperature(U, P);
    assert.ok(Number.isFinite(T) && T < last && T >= t1 - 1e-12, `T(${U.toFixed(2)}) = ${T}`);
    last = T;
  }
  assert.ok(Math.abs(urgencyTemperature(1, P) - t1) < 1e-12);
  assert.equal(urgencyTemperature(2, P), urgencyTemperature(1, P), 'clamped at full urgency');
  // noise matching: Gumbel SD at T₁ (πT/√6) equals the jitter SD (span/√12)
  assert.ok(Math.abs(Math.PI * t1 / Math.sqrt(6) - P.candidateJitterSpan / Math.sqrt(12)) < 1e-12);
  assert.equal(urgencyTemperature(0, P), Infinity);
  assert.deepEqual(choiceProbs([0.3, 0.9, 0.1], Infinity), [1 / 3, 1 / 3, 1 / 3], 'no deficit: a uniform draw');
  assert.deepEqual(choiceProbs([0.3, 0.9, 0.1], 0), [0, 1, 0], 'no jitter: the argmax');
  const soft = choiceProbs([0.3, 0.9, 0.1], urgencyTemperature(0.2, P)), sharp = choiceProbs([0.3, 0.9, 0.1], urgencyTemperature(0.9, P));
  assert.ok(sharp[1] > soft[1] && soft[1] > 1 / 3);
  // urgency: the largest deficit the menu can act on; stress always counts
  const c = createWorld(48).chimps[0], opt = (action: Chimp['action'], targetId = -1) => ({ action, targetId });
  const full = [opt('forage'), opt('drink', 200001), opt('rest'), opt('groom', 2)];
  setNeeds(c, 0.2, 0.1, 0.9, 0.9, 0); assert.ok(Math.abs(urgency(c, full) - 0.2) < 1e-12);
  setNeeds(c, 0.2, 0.1, 0.35, 0.9, 0); assert.ok(Math.abs(urgency(c, full) - 0.65) < 1e-12, 'fatigue');
  setNeeds(c, 0.2, 0.1, 0.9, 0.9, 0.8); assert.ok(Math.abs(urgency(c, [opt('forage')]) - 0.8) < 1e-12, 'stress');
  setNeeds(c, 0.2, 0.1, 0.9, 0.05, 0);
  assert.ok(Math.abs(urgency(c, full) - 0.95) < 1e-12, 'lonely, with a partner on the menu');
  assert.ok(Math.abs(urgency(c, [opt('forage'), opt('rest')]) - 0.2) < 1e-12, 'lonely, with nobody to groom: nothing at stake in this choice');
  setNeeds(c, 0.2, 0.7, 0.9, 0.9, 0);
  assert.ok(Math.abs(urgency(c, [opt('forage'), opt('rest')]) - 0.2) < 1e-12, 'thirsty, no water on the menu');
  assert.ok(Math.abs(urgency(c, [opt('forage', 100001), opt('rest')]) - 0.7) < 1e-12, 'a fruit crown carries water');
});

test('a starving chimp takes its top food option with higher probability than a sated one in the same scene', () => {
  const w = run(createWorld(48, { params: ALL }), 1.25); // 12:30
  let n = 0, byTemperature = 0;
  for (const id of w.chimps.filter(k => k.alive && k.age >= 8).map(k => k.id)) {
    const food = (hunger: number) => {
      const copy = structuredClone(w), c = copy.chimps.find(k => k.id === id)!;
      setNeeds(c, hunger);
      const menu = rgMenu(copy, c, computeCandidates(copy, c, [])), P = paramsOf(copy), scores = menu.map(k => k.score);
      const fi = menu.map((k, i) => ({ k, i })).filter(o => o.k.action === 'forage' || (o.k.action === 'travel' && candidateMeta.get(o.k)?.v === V.TREE)).sort((a, b) => b.k.score - a.k.score)[0];
      if (!fi || menu.length < 2) return null;
      return { p: choiceProbs(scores, urgencyTemperature(urgency(c, menu), P))[fi.i], soft: choiceProbs(scores, urgencyTemperature(0.15, P))[fi.i], top: fi.k.score >= Math.max(...scores) };
    };
    const starving = food(0.95), sated = food(0.15);
    if (!starving || !sated) continue;
    assert.ok(starving.p > sated.p, `chimp ${id}: ${starving.p} vs ${sated.p}`);
    // the same starving menu, at the temperature of a sated animal: urgency itself sharpens the choice of the top option
    if (starving.top) { assert.ok(starving.p > starving.soft, `chimp ${id}: sharper by temperature`); byTemperature++; }
    n++;
  }
  assert.ok(n >= 5 && byTemperature >= 3, `${n} scenes, ${byTemperature} with food on top`);
});

test('persistence keeps a paying act and drops one that has stopped paying or is out-paid', () => {
  const w = run(createWorld(48, { params: ALL }), 1.25);
  let kept = 0, dropped = 0, outPaid = 0;
  for (const src of w.chimps) {
    const it = ix(src).rgIntent;
    if (!src.alive || src.age < 8 || !it || it.action !== 'forage' || !isTreeId(it.targetId) || src.action !== 'forage' || src.targetId !== it.targetId || ix(src).finished || ix(src).phase !== 2) continue;
    const scene = (hunger: number, energy: number) => {
      const copy = structuredClone(w), c = copy.chimps.find(k => k.id === src.id)!, x = ix(c);
      setNeeds(c, hunger, 0, energy, 1, 0);
      // an old intention, chosen under other need buckets: under urgencyPersist neither matters
      x.lastIntrAt = -1e9; x.rgIntent = { ...x.rgIntent!, chosenAt: copy.time - 3, period: periodNow(copy), buckets: { hunger: 'none', thirst: 'severe', fatigue: 'severe', loneliness: 'severe' } };
      const list = computeCandidates(copy, c, []), current = findCandidate(list, 'forage', it.targetId);
      return { copy, c, list, current, P: paramsOf(copy) };
    };
    // hungry, nothing else pressing: feeding in the crown pays; no other tree or leaves pay more (walk included)
    const a = scene(0.6, 1);
    if (!a.current) continue;
    assert.equal(stillPaying(a.copy, a.c, a.current, a.list, a.P), '');
    const rng = a.copy.rng, keep = rgChoice(a.copy, a.c, a.list)!;
    assert.ok(keep.action === 'forage' && keep.targetId === it.targetId && a.copy.rng === rng, 'kept without a draw');
    kept++;
    // sated: the act has stopped paying, so the choice is drawn again
    const b = scene(0, 1);
    if (b.current) {
      assert.equal(stillPaying(b.copy, b.c, b.current, b.list, b.P), 'not-paying');
      if (rgMenu(b.copy, b.c, b.list).length >= 2) { const r = b.copy.rng; rgChoice(b.copy, b.c, b.list); assert.notEqual(b.copy.rng, r, 'one draw'); dropped++; }
    }
    // a little hungry and exhausted: resting reduces drive faster than feeding, so fatigue overtakes hunger
    const d = scene(0.1, 0);
    const rest = d.current && findCandidate(d.list, 'rest', -1);
    if (d.current && rest) {
      const m = candidateMeta.get(d.current);
      assert.ok(payOf(d.copy, d.c, rest, V.NONE, -1, d.P) > payOf(d.copy, d.c, d.current, m?.v ?? V.NONE, m?.aux ?? -1, d.P));
      assert.equal(stillPaying(d.copy, d.c, d.current, d.list, d.P), 'out-paid');
      outPaid++;
    }
  }
  assert.ok(kept > 0 && dropped > 0 && outPaid > 0, `kept ${kept}, dropped ${dropped}, out-paid ${outPaid}`);
  // an act that serves no deficit is kept only while it is the rules' top option
  assert.equal(servesDeficit('follow', V.PARTY, -1), false);
  assert.equal(servesDeficit('travel', V.TREE, -1), true);
  assert.equal(servesDeficit('travel', V.TREE, 7), false, 'a joint trip');
  const c = w.chimps.find(k => k.alive && k.age >= 8)!, list = computeCandidates(w, c, []);
  const other = list.find(k => !servesDeficit(k.action, candidateMeta.get(k)?.v ?? V.NONE, candidateMeta.get(k)?.aux ?? -1));
  if (other) assert.equal(stillPaying(w, c, other, list, paramsOf(w)), other === list[0] ? '' : 'not-top');
});

test('with all three switches on: deterministic across tick batching, in both profiles; rulesChoice and observe stay pure', () => {
  const a = createWorld(48, { params: ALL }), b = createWorld(48, { params: ALL });
  for (let i = 0; i < 18; i++) stepWorld(a, 60);          // 18 h in 1-h batches
  for (let i = 0; i < 18 * 240; i++) tickWorld(b);        // the same span tick by tick
  assert.deepEqual(a, b);
  const before = JSON.stringify(a), rng = a.rng;
  for (const c of a.chimps) if (c.alive) { rulesChoice(a, c); observe(a, c); }
  assert.equal(a.rng, rng);
  assert.equal(JSON.stringify(a), before);
  const f = createWorld(7, { profile: 'field', params: ALL }), g = createWorld(7, { profile: 'field', params: ALL });
  for (let i = 0; i < 8; i++) stepWorld(f, 60);
  for (let i = 0; i < 8 * 240; i++) tickWorld(g);
  assert.equal(worldHash(f), worldHash(g));
  assert.ok(f.chimps.some(c => c.alive && ix(c).rgIntent), 'intentions are held');
});
