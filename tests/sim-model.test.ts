import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, applyIntervention, createWorld, observe, resolveByRules, rulesChoice, tickWorld } from '../src/simulation';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };
const waitFor = (w: World, c: Chimp, max = 400) => { for (let i = 0; i < max && c.awaitingDecisionSince === null; i++) tickWorld(w); assert.notEqual(c.awaitingDecisionSince, null, 'reached a decision point'); };

test('async: a model-controlled chimp waits, continues or rests, then rules decide after the grace period', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const c = w.chimps.find(k => k.sex === 'female' && k.age > 20)!;
  c.controller = 'model';
  waitFor(w, c);
  const since = c.awaitingDecisionSince!;
  assert.ok(c.candidates.length > 1);
  while ((w.time - since) * 60 < 5.5) {
    tickWorld(w);
    assert.equal(c.awaitingDecisionSince, since, 'still waiting within the grace period');
  }
  for (let i = 0; i < 20 && c.awaitingDecisionSince !== null; i++) tickWorld(w);
  assert.equal(c.awaitingDecisionSince, null);
  assert.equal(c.decisionSource, 'rules');
  const waited = (w.time - since) * 60;
  assert.ok(waited > 6 && waited <= 7.5, `fell back after ${waited.toFixed(2)} min`);
});

test('lockstep: never falls back; a model answer applies with the observed version and clears the wait', () => {
  const w = createWorld(48);
  runTo(w, 9);
  w.modelPolicy.mode = 'lockstep';
  const c = w.chimps.find(k => k.sex === 'male' && k.age > 20)!;
  c.controller = 'model';
  waitFor(w, c);
  const since = c.awaitingDecisionSince!;
  for (let i = 0; i < 400; i++) { tickWorld(w); assert.equal(c.awaitingDecisionSince, since); }
  const ctx = observe(w, c);
  assert.equal(ctx.version, c.decisionVersion);
  const pick = ctx.candidates[ctx.candidates.length > 1 ? 1 : 0];
  assert.equal(applyDecision(w, c.id, pick, 'decide', ctx.version - 1), false, 'stale version rejected');
  assert.ok(applyDecision(w, c.id, pick, 'decide', ctx.version));
  assert.equal(c.awaitingDecisionSince, null);
  assert.equal(c.decisionSource, 'decide');
  assert.equal(c.action, pick.action); assert.equal(c.targetId, pick.targetId);
});

test('mode off: model-controlled chimps are decided by rules', () => {
  const w = createWorld(48);
  w.modelPolicy.mode = 'off';
  for (const c of w.chimps) c.controller = 'model';
  runTo(w, 8);
  assert.ok(w.chimps.every(c => c.awaitingDecisionSince === null));
});

test('rulesChoice and observe are pure: no rng use, no world mutation; resolveByRules applies the rules choice', () => {
  const w = createWorld(48);
  runTo(w, 10);
  const before = JSON.stringify(w);
  const rng = w.rng;
  const picks = w.chimps.filter(c => c.alive).map(c => rulesChoice(w, c));
  for (const c of w.chimps) if (c.alive) observe(w, c);
  assert.equal(w.rng, rng);
  assert.equal(JSON.stringify(w), before);
  assert.deepEqual(w.chimps.filter(c => c.alive).map(c => rulesChoice(w, c)), picks, 'deterministic');
  const c = w.chimps.find(k => k.sex === 'male' && k.age > 15)!;
  c.controller = 'model';
  waitFor(w, c);
  const rc = rulesChoice(w, c)!;
  assert.ok(resolveByRules(w, c.id));
  assert.equal(c.action, rc.action); assert.equal(c.targetId, rc.targetId);
  assert.equal(c.awaitingDecisionSince, null); assert.equal(c.decisionSource, 'rules');
});

test('observe() is built from local perception only', () => {
  const w = createWorld(48);
  runTo(w, 10.5);
  for (const c of w.chimps.filter(k => k.alive)) {
    const ctx = observe(w, c);
    const x = ix(c);
    assert.equal(ctx.chimpId, c.id);
    assert.ok(ctx.social.length <= 8 && ctx.recent.length <= 5);
    const known = new Set([...x.seen, ...c.memory.filter(m => m.kind === 'chimp').map(m => m.entityId), c.motherId, x.caretaker]);
    for (const s of ctx.social) {
      assert.ok(known.has(s.id), `${c.name} knows ${s.name}`);
      if (s.relation === 'stranger') assert.equal(s.rankOrder, 0);
    }
    const ids = new Set(ctx.social.map(s => s.id));
    for (const k of ctx.candidates) if (k.targetId > 0 && k.targetId < 100000) assert.ok(ids.has(k.targetId), 'candidate targets are in social');
    for (let i = 1; i < ctx.candidates.length; i++) assert.ok(ctx.candidates[i - 1].score >= ctx.candidates[i].score);
    const trulyVisibleStrangers = w.chimps.filter(o => o.alive && o.troopId !== c.troopId && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) < x.sight + 20).length;
    assert.ok(ctx.environment.strangersSeen <= trulyVisibleStrangers + 1);
    assert.ok(ctx.candidates.every(k => !/\d{6}/.test(k.reason)), 'no raw ids in reasons');
  }
});

test('external events create decision points: a snake near a model-controlled chimp interrupts it', () => {
  const w = createWorld(48);
  runTo(w, 10);
  const c = w.chimps.find(k => k.sex === 'female' && k.age > 20 && !k.lactating)!;
  c.controller = 'model';
  waitFor(w, c);
  const ctx0 = observe(w, c);
  assert.ok(applyDecision(w, c.id, ctx0.candidates[0], 'decide', ctx0.version));
  assert.equal(c.awaitingDecisionSince, null);
  const v = c.decisionVersion;
  applyIntervention(w, 'snake-model', { position: [c.position[0] + 3, 0, c.position[2]] });
  tickWorld(w);
  assert.equal(c.awaitingDecisionSince, w.time, 'new decision point right away');
  assert.ok(c.decisionVersion >= v);
  const ctx = observe(w, c);
  assert.ok(ctx.stimuli.some(s => /snake/.test(s)));
  assert.ok(ctx.recent.some(s => /snake/.test(s)));
});
