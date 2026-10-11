import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import type { DecisionTraceView } from '../src/ui/contracts';
import { BASE_MODEL, BASE_MODEL_ONNX, RULES_ENGINE, belowTopNote, cardFromChimp, cardFromTrace, modelEngine, rowValue, targetName, traceIsCurrent } from '../src/ui/mind-card';
import { DEFAULT_PROVIDER_CONFIG } from '../src/providers/config';
import { ACTIVITY_KIND, DECISION_LOG_MAX, createDecisionLog, timeline, watchDecisions } from '../src/ui/decision-log';

// Stage W4: the pure data behind the Mind tab's decision card (src/ui/mind-card.ts) and the Log tab's activity line
// (src/ui/decision-log.ts). The card for an animal with no trace is built from the animal's own candidates and reason.

function morning(seed = 48, ticks = 720): World { const w = createWorld(seed); for (let i = 0; i < ticks; i++) tickWorld(w); return w; }

function fakeTrace(world: World, c: Chimp, over: Partial<DecisionTraceView> = {}): DecisionTraceView {
  const options: Candidate[] = [
    { action: 'forage', targetId: world.trees[0].id, score: 0.66, reason: 'Feed in the fig crown' },
    { action: 'patrol', targetId: -1, score: 0.52, reason: 'Patrol the eastern boundary' },
    { action: 'groom', targetId: world.chimps[1].id, score: 0.49, reason: `Groom ${world.chimps[1].name}` },
    { action: 'rest', targetId: -1, score: 0.3, reason: 'Sit and rest nearby' },
  ];
  return { id: 't1', chimpId: c.id, chimpName: c.name, time: world.time, context: { social: [], version: c.decisionVersion } as unknown as DecisionTraceView['context'],
    options, probabilities: [0.27, 0.48, 0.18, 0.07], choiceIndex: 1, rulesIndex: 0, applied: true, discardedReason: '', latencyMs: 231, inputTokens: 640, source: 'model', model: BASE_MODEL, provider: 'server', ...over };
}

test('every living animal of a rules-driven world yields a card from its own candidates and reason', () => {
  const w = morning();
  const living = w.chimps.filter(c => c.alive);
  assert.ok(living.length > 20);
  let withPick = 0, offMenu = 0, beaten = 0;
  for (const c of living) {
    const card = cardFromChimp(w, c);
    assert.equal(card.kind, 'live');
    assert.equal(card.by, 'score');
    assert.equal(card.options.length, c.candidates.length, 'every option is listed');
    assert.equal(card.action, c.action); assert.equal(card.reason, c.reason, 'the animal’s own reason, in print');
    for (let i = 1; i < card.options.length; i++) assert.ok(card.options[i - 1].score >= card.options[i].score, 'best score first');
    for (const r of card.options) {
      assert.ok(r.bar >= 0 && r.bar <= 1);
      assert.equal(r.probability, null, 'no model answered: no probability');
      assert.ok(c.candidates.some(k => k.action === r.action && k.targetId === r.targetId && k.reason === r.reason && k.score === r.score), 'a row is one of the animal’s candidates, unchanged');
    }
    assert.ok(card.options.filter(r => r.chosen).length <= 1);
    if (card.options.length) { assert.equal(card.options.filter(r => r.rulesPick).length, 1); assert.equal(card.options[0].bar, card.options[0].score > 0 ? 1 : 0); }
    assert.ok(card.over.length <= 2 && card.over.every(r => !r.chosen));
    assert.ok(Math.abs(card.time - (w.time - c.actionTime / 3600)) < 1e-9, 'timed from the simulation’s own time in the act');
    if (card.pick) {
      withPick++;
      assert.equal(card.pick.action, c.action); assert.equal(card.pick.targetId, c.targetId);
      assert.equal(card.offMenu, false);
      assert.deepEqual(card.engine, RULES_ENGINE, 'headed Rules, never Model');
      assert.equal(card.beaten, card.over.length > 0 && card.over[0].score > card.pick.score + 1e-9);
      if (card.beaten) beaten++;
    } else if (c.candidates.length) { offMenu++; assert.equal(card.offMenu, true); assert.equal(card.engine.id, 'none'); }
    else assert.equal(card.offMenu, false, 'no list at all is not "off the menu"');
  }
  assert.ok(withPick > living.length / 2, `most acts under way are on the animal's own list (${withPick} of ${living.length}; ${offMenu} set outside a choice, ${beaten} below the top score)`);
});

test('reading the card changes nothing in the world', () => {
  const w = morning(48, 400), before = JSON.stringify(w);
  for (const c of w.chimps) if (c.alive) { cardFromChimp(w, c); watchDecisions(createDecisionLog(), w, c); }
  assert.equal(JSON.stringify(w), before);
});

test('a parked animal shows what it is being asked about and no pick; a decision through the loop names the engine', () => {
  const w = morning(48, 600), c = w.chimps.find(x => x.alive && x.candidates.length >= 2)!;
  const parked = cardFromChimp(w, { ...c, awaitingDecisionSince: w.time });
  assert.equal(parked.waiting, true); assert.equal(parked.pick, null); assert.equal(parked.offMenu, false);
  assert.equal(parked.engine.id, 'none');
  assert.equal(parked.over.length, 2);
  const on = c.candidates.findIndex(k => k.action === c.action && k.targetId === c.targetId);
  if (on >= 0) assert.equal(cardFromChimp(w, { ...c, decisionSource: 'decide' }).engine.label, 'Untuned model on a rules menu');
  const off = cardFromChimp(w, { ...c, action: 'attack', targetId: 99999, reason: 'Fight back' });
  assert.equal(off.offMenu, true); assert.equal(off.pick, null); assert.equal(off.reason, 'Fight back');
  const none = cardFromChimp(w, { ...c, candidates: [] });
  assert.equal(none.offMenu, false); assert.equal(none.options.length, 0); assert.deepEqual(none.engine, RULES_ENGINE);
});

test('the engine names are the plan’s: the published base is an untuned model on a rules menu', () => {
  assert.equal(modelEngine(BASE_MODEL, 'server').label, 'Untuned model on a rules menu');
  assert.equal(modelEngine(undefined).id, 'untuned');
  // The browser provider loads the same published base as its ONNX export and reports that name: also untuned.
  assert.equal(BASE_MODEL_ONNX, DEFAULT_PROVIDER_CONFIG.browser.model);
  assert.equal(modelEngine(DEFAULT_PROVIDER_CONFIG.browser.model, 'browser').label, 'Untuned model on a rules menu');
  assert.equal(modelEngine('someone/another-model-ONNX', 'browser').id, 'other-model', 'a browser config pointed at another model is not claimed as the base');
  assert.equal(modelEngine('jev-latest', 'jev').id, 'general');
  assert.equal(modelEngine('r4-rules-state').label, 'Model r4-rules-state on a rules menu', 'an unknown model is named by its own identifier, not claimed as untuned');
  for (const e of [modelEngine(BASE_MODEL), modelEngine('x'), modelEngine('jev-latest', 'jev')]) assert.match(e.label, /on a rules menu$/);
  assert.equal(RULES_ENGINE.label, 'Rules');
});

test('a model trace ranks by the model’s probability, marks both picks and prints every reason', () => {
  const w = morning(48, 300), c = w.chimps.find(x => x.alive)!;
  const tr = fakeTrace(w, c), card = cardFromTrace(w, tr);
  assert.equal(card.kind, 'trace'); assert.equal(card.by, 'probability');
  assert.equal(card.engine.label, 'Untuned model on a rules menu');
  assert.deepEqual(card.options.map(r => r.action), ['patrol', 'forage', 'groom', 'rest'], 'by probability, best first');
  assert.equal(card.pick?.action, 'patrol'); assert.equal(card.pick?.probability, 0.48);
  assert.deepEqual(card.over.map(r => r.action), ['forage', 'groom']);
  assert.equal(card.beaten, false);
  assert.equal(card.options.find(r => r.rulesPick)?.action, 'forage');
  assert.equal(card.reason, 'Patrol the eastern boundary');
  assert.ok(card.options.every(r => r.reason.length > 0));
  assert.equal(card.options.find(r => r.action === 'forage')!.bar, 1, 'bars are the rules’ scores against the best');
  assert.equal(card.options.find(r => r.action === 'groom')!.target, w.chimps[1].name);
  assert.equal(rowValue(card.pick!, 'probability'), 0.48); assert.equal(rowValue(card.pick!, 'score'), 0.52);
  // A pick below the top probability (a draw) is reported as such.
  assert.equal(cardFromTrace(w, { ...tr, choiceIndex: 2 }).beaten, true);
});

test('a trace the rules stood in for is ranked by score and headed Rules', () => {
  const w = morning(48, 300), c = w.chimps.find(x => x.alive)!;
  const card = cardFromTrace(w, fakeTrace(w, c, { source: 'rules-fallback', probabilities: [], choiceIndex: 0, rulesIndex: 0, discardedReason: 'model unavailable' }));
  assert.equal(card.by, 'score'); assert.equal(card.engine.id, 'rules-stand-in'); assert.equal(card.engine.label, 'Rules');
  assert.match(card.engine.note, /model unavailable/);
  assert.deepEqual(card.options.map(r => r.action), ['forage', 'patrol', 'groom', 'rest']);
  assert.ok(card.options.every(r => r.probability === null));
});

test('targets are named: a chimp, a tree by its species, water', () => {
  const w = morning(48, 10);
  assert.equal(targetName(w, { targetId: -1 }), '');
  assert.equal(targetName(w, { targetId: w.chimps[3].id }), w.chimps[3].name);
  assert.equal(targetName(w, { targetId: w.trees[0].id }), w.trees[0].species);
  assert.equal(targetName(w, { targetId: w.water[0].id }), 'water');
});

test('a trace is the first view only while it describes the act under way', () => {
  const w = morning(48, 300), c0 = w.chimps.find(x => x.alive)!;
  const tr = fakeTrace(w, c0);
  const c = { ...c0, action: 'patrol' as const, targetId: -1, actionTime: 0 };
  assert.equal(traceIsCurrent(w, c, tr), true);
  assert.equal(traceIsCurrent(w, { ...c, action: 'rest' }, tr), false, 'it has moved on');
  assert.equal(traceIsCurrent(w, c, { ...tr, applied: false }), false, 'a discarded answer set nothing');
  assert.equal(traceIsCurrent(w, c, { ...tr, time: w.time - 2 }), false, 'the same act begun again later is not that old trace');
  assert.equal(traceIsCurrent(w, { ...c, actionTime: 3 * 3600 }, { ...tr, time: w.time - 2 }), true, 'a long act still under way');
});

test('the act record: starts at selection with the act under way, adds an entry per change of act, counts what it could not see', () => {
  const w = createWorld(48), log = createDecisionLog();
  const c = w.chimps.find(x => x.alive && x.stage === 'adult')!;
  assert.equal(watchDecisions(log, w, c), true);
  assert.equal(log.entries.length, 1); assert.equal(log.entries[0].before, true); assert.equal(log.entries[0].action, c.action);
  assert.equal(watchDecisions(log, w, c), false, 'nothing changed: nothing recorded');
  let changes = 0, prevA = c.action, prevT = c.targetId;
  for (let i = 0; i < 1400; i++) {
    tickWorld(w);
    if (c.action !== prevA || c.targetId !== prevT) { changes++; prevA = c.action; prevT = c.targetId; }
    watchDecisions(log, w, c);   // a look after every tick sees every change
  }
  assert.ok(changes >= 3, `the animal changed act ${changes} times`);
  assert.equal(log.entries.length, Math.min(DECISION_LOG_MAX, changes + 1), 'one entry per change of act or target, plus the first');
  for (let i = 1; i < log.entries.length; i++) {
    const a = log.entries[i - 1], b = log.entries[i];
    assert.ok(b.time >= a.time, 'in time order'); assert.ok(a.action !== b.action || a.targetId !== b.targetId, 'an entry is a change');
    assert.ok(b.reason.length > 0, 'with the simulation’s reason');
  }
  const last = log.entries[log.entries.length - 1];
  assert.equal(last.action, c.action); assert.equal(last.targetId, c.targetId);
  // Another animal, or another world, starts the record again.
  const other = w.chimps.find(x => x.alive && x.id !== c.id)!;
  watchDecisions(log, w, other);
  assert.equal(log.chimpId, other.id); assert.equal(log.entries.length, 1);
  watchDecisions(log, createWorld(7), other);
  assert.equal(log.entries.length, 1); assert.equal(log.missed, 0);
});

test('looks that are far apart count the decisions they could not see instead of inventing them', () => {
  const w = createWorld(48), log = createDecisionLog();
  const c = w.chimps.find(x => x.alive && x.stage === 'adult')!;
  watchDecisions(log, w, c);
  const v0 = c.decisionVersion;
  for (let i = 0; i < 2400; i++) tickWorld(w);   // ten hours with no look
  watchDecisions(log, w, c);
  assert.ok(c.decisionVersion - v0 > 2);
  assert.ok(log.entries.length <= 2, 'at most one new entry for one look');
  assert.ok(log.missed > 0, 'the rest are counted as unseen');
});

test('the activity line covers exactly the span, oldest first, with the unseen time marked', () => {
  const w = createWorld(48), log = createDecisionLog();
  const c = w.chimps.find(x => x.alive && x.stage === 'adult')!;
  for (let i = 0; i < 480; i++) tickWorld(w);     // two hours pass before the animal is selected
  watchDecisions(log, w, c);
  for (let i = 0; i < 480; i++) { tickWorld(w); watchDecisions(log, w, c); }
  const tl = timeline(log, w.time, 3);
  assert.equal(tl.to, w.time); assert.ok(Math.abs(tl.from - (w.time - 3)) < 1e-12);
  assert.ok(Math.abs(tl.segments[0].start - tl.from) < 1e-9); assert.ok(Math.abs(tl.segments[tl.segments.length - 1].end - tl.to) < 1e-9);
  for (let i = 1; i < tl.segments.length; i++) {
    assert.ok(Math.abs(tl.segments[i].start - tl.segments[i - 1].end) < 1e-9, 'no gap and no overlap');
    assert.notEqual(tl.segments[i].kind, tl.segments[i - 1].kind, 'neighbours of one kind are merged');
  }
  assert.ok(tl.segments.every(s => s.end > s.start));
  if (log.entries[0].time > tl.from) assert.equal(tl.segments[0].kind, 'none', 'before the record: not seen');
  assert.equal(tl.segments[tl.segments.length - 1].kind, ACTIVITY_KIND[c.action]);
  // An empty record is one unseen stretch.
  assert.deepEqual(timeline(createDecisionLog(), 10, 3).segments.map(s => s.kind), ['none']);
});

test('an act the simulation set without a decision is not credited to the animal\'s last decision', () => {
  // The real loop's own steps, with nobody answering: an adult is handed to the model, parks at a decision point, an
  // answer is applied for it through the loop's entry (source 'decide'), and when that act ends it is parked again,
  // resting until an answer comes. Chimp.decisionSource still says 'decide' then; the wait was nobody's pick.
  const w = createWorld(48);
  for (let i = 0; i < 400; i++) tickWorld(w);
  const c = w.chimps.find(x => x.alive && x.stage === 'adult')!;
  w.modelPolicy.mode = 'lockstep'; c.controller = 'model';
  for (let i = 0; i < 4000 && c.awaitingDecisionSince === null; i++) tickWorld(w);
  assert.ok(c.awaitingDecisionSince !== null, 'parked at a decision point');
  const parked = createDecisionLog(); watchDecisions(parked, w, c);
  assert.equal(parked.entries[0].source, 'set', 'selected while parked: the act under way is not credited to anyone');
  const pick = c.candidates.find(k => k.action !== 'rest' && k.action !== c.action) ?? c.candidates.find(k => k.action !== 'rest')!;
  assert.equal(applyDecision(w, c.id, pick, 'decide'), true);
  assert.equal(c.decisionSource, 'decide');
  const log = createDecisionLog();
  watchDecisions(log, w, c);
  assert.equal(log.entries.length, 1); assert.equal(log.entries[0].source, 'decide', 'the act the answer set');
  for (let i = 0; i < 6000 && c.alive && c.reason !== 'Waiting for a decision'; i++) { tickWorld(w); watchDecisions(log, w, c); }
  assert.equal(c.reason, 'Waiting for a decision'); assert.equal(c.action, 'rest');
  assert.equal(c.decisionSource, 'decide', 'the animal\'s last decision is still the model\'s');
  const last = log.entries[log.entries.length - 1];
  assert.equal(last.action, 'rest'); assert.equal(last.reason, 'Waiting for a decision');
  assert.equal(last.source, 'set', 'the wait is not the model\'s pick');
  assert.ok(log.entries.some(e => e.source === 'decide'));
});

test('the act record names who chose: the rules, a model through the loop, or nobody', () => {
  const w = morning(48, 600), c = w.chimps.find(x => x.alive && x.candidates.length >= 2 && x.candidates.some(k => k.action === x.action && k.targetId === x.targetId))!;
  const log = createDecisionLog();
  watchDecisions(log, w, c);
  assert.equal(log.entries[0].source, 'rules');
  const other = c.candidates.find(k => !(k.action === c.action && k.targetId === c.targetId))!;
  // A model's answer applied: the decision count moves, the source is the loop's.
  const viaLoop = { ...c, action: other.action, targetId: other.targetId, reason: other.reason, decisionVersion: c.decisionVersion + 1, decisionSource: 'decide' as const };
  watchDecisions(log, w, viaLoop);
  assert.equal(log.entries.at(-1)!.source, 'decide');
  // Attacked: it fights back. No decision was taken (the count did not move) and the act is not on its list.
  watchDecisions(log, w, { ...viaLoop, action: 'attack', targetId: 99999, reason: 'Fight back' });
  assert.equal(log.entries.at(-1)!.action, 'attack'); assert.equal(log.entries.at(-1)!.source, 'set');
  // Selected in the middle of such an act: the first entry is not credited either.
  const fresh = createDecisionLog();
  watchDecisions(fresh, w, { ...c, action: 'attack', targetId: 99999, reason: 'Fight back', decisionSource: 'decide' });
  assert.equal(fresh.entries[0].source, 'set');
  // It dies: nobody's choice.
  watchDecisions(log, w, { ...viaLoop, alive: false, action: 'dead', targetId: -1, causeOfDeath: 'injury' });
  assert.equal(log.entries.at(-1)!.action, 'dead'); assert.equal(log.entries.at(-1)!.source, 'set');
});

test('a pick below the top score is explained by who chose: the rules\' own policy, or a model', () => {
  const w = morning(48, 600), c = w.chimps.find(x => x.alive && x.candidates.length >= 2)!;
  // The act under way is the list's last option: it scores below the best.
  const low = c.candidates[c.candidates.length - 1], below = { ...c, action: low.action, targetId: low.targetId, awaitingDecisionSince: null };
  const byRules = cardFromChimp(w, { ...below, decisionSource: 'rules' });
  assert.equal(byRules.beaten, c.candidates[0].score > low.score + 1e-9);
  assert.deepEqual(byRules.engine, RULES_ENGINE);
  assert.match(belowTopNote(byRules), /keep an act under way/); assert.match(belowTopNote(byRules), /draw weighted by the scores/);
  const byModel = cardFromChimp(w, { ...below, decisionSource: 'decide' });
  assert.equal(byModel.engine.id, 'untuned');
  assert.match(belowTopNote(byModel), /a model picked this act/);
  assert.doesNotMatch(belowTopNote(byModel), /rules do not always/, 'the rules\' policy is not offered as the reason for a model\'s pick');
});
