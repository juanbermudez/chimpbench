import assert from 'node:assert/strict';
import test from 'node:test';
import { resourceFixture } from './fixtures/r15';
import { createWorld, tickWorld } from '../src/simulation';
import { candidateMeta, computeCandidates, getEligibleActions, rulesChoice, V } from '../src/sim/candidates';
import { applyDecision, decisionPoint, secondRequest, settleAnswer } from '../src/sim/decide';
import { buildRequest, targetRequest } from '../src/sim/request';
import { resourceEligibleActions, resourcePercepts, resourceTargetsFor } from '../src/sim/resources';
import { optionKind, same } from '../src/sim/menu';
import { gate } from '../src/sim/rg';
import { ix, simOf } from '../src/sim/state';
import { decisionContextError } from '../src/sim/context-check';

test('resource mode is off by default and invalid combinations fail at world creation', () => {
  assert.throws(() => createWorld(48, { params: { resourceTargets: 1 } }), /requires activityFirst/);
  assert.throws(() => createWorld(48, { params: { resourceTargets: 1, activityFirst: 2 } }), /observeV5/);
  const { world, chimp } = resourceFixture({ resourceTargets: 0 });
  const r = buildRequest(world, chimp);
  assert.equal(r.context.resourceChoice, undefined);
  assert.deepEqual(resourceEligibleActions(world, chimp), computeCandidates(world, chimp, []));
});

test('resource mode does not change rules trajectories or consume observation state', () => {
  const a = createWorld(48, { params: { activityFirst: 2, observeV5: 1 } });
  const b = createWorld(48, { params: { activityFirst: 2, observeV5: 1, resourceTargets: 1 } });
  for (let i = 0; i < 32; i++) { tickWorld(a); tickWorld(b); }
  const plain = (w: typeof a) => { const clone = structuredClone(w); delete simOf(clone).params.overrides.resourceTargets; return clone; };
  assert.deepEqual(plain(b), plain(a));
  const { world, chimp } = resourceFixture();
  const before = JSON.stringify(world), request = buildRequest(world, chimp);
  assert.equal(decisionContextError(request.context), '');
  for (let i = 0; i < request.options.length; i++) { const next = targetRequest(request, i); if (next) assert.equal(decisionContextError(next.context), ''); }
  assert.deepEqual(buildRequest(world, chimp), request);
  assert.equal(JSON.stringify(world), before);
});

test('only legacy offered kinds survive and only perceived resource targets expand', () => {
  const on = resourceFixture(), off = resourceFixture({ resourceTargets: 0, activityFirst: 0 });
  const legacy = buildRequest(off.world, off.chimp), r = buildRequest(on.world, on.chimp);
  assert.deepEqual(new Set(r.context.resourceKinds), new Set(legacy.options.map(optionKind)));
  assert.ok(r.groups!.some(g => g.length > 1));
  r.groups!.forEach((g, i) => {
    assert.ok(g.length <= (r.context.resourceKinds![i] === 'drink' ? 4 : 8));
    if (!['eat_here', 'go_to_food', 'drink'].includes(r.context.resourceKinds![i])) assert.equal(g.length, 1);
    const second = targetRequest(r, i);
    if (second) { assert.equal(second.context.resourceChoice, 'target'); assert.ok(second.context.resourceKinds!.every(k => k === r.context.resourceKinds![i])); }
  });
  const all = resourceEligibleActions(on.world, on.chimp);
  for (const k of all.filter(k => k.action === 'travel')) assert.ok(on.chimp.memory.some(m => m.kind === 'tree' && m.entityId === k.targetId));
});

test('unseen fruit and unseen feeders do not change the target pool, values, or packet', () => {
  const { world, chimp } = resourceFixture();
  const before = resourcePercepts(world, chimp), metadata = before.map(k => candidateMeta.get(k)), packet = buildRequest(world, chimp);
  const unseen = new Set(chimp.memory.filter(m => m.kind === 'tree').map(m => m.entityId));
  for (const t of world.trees) if (unseen.has(t.id)) t.fruit += 100;
  const other = world.chimps.find(c => c !== chimp)!;
  other.action = 'forage'; other.targetId = [...unseen][0];
  assert.deepEqual(resourcePercepts(world, chimp), before);
  assert.deepEqual(resourcePercepts(world, chimp).map(k => candidateMeta.get(k)), metadata);
  assert.deepEqual(buildRequest(world, chimp), packet);
});

test('shortlists ignore values and retain a valid current target', () => {
  const { world, chimp } = resourceFixture(), pool = resourcePercepts(world, chimp);
  const before = resourceTargetsFor(world, chimp, 'go_to_food', pool).map(k => k.targetId);
  for (const k of pool) { k.score = 999 - k.targetId; if (k.value) k.value.cropKcal = 123456; }
  assert.deepEqual(resourceTargetsFor(world, chimp, 'go_to_food', pool).map(k => k.targetId), before);
  const omitted = pool.find(k => optionKind(k) === 'go_to_food' && !before.includes(k.targetId))!;
  assert.ok(omitted); chimp.action = omitted.action; chimp.targetId = omitted.targetId;
  assert.ok(resourceTargetsFor(world, chimp, 'go_to_food', pool).some(k => same(k, omitted)));
});

test('formerly capped targets apply, remain eligible, and arrive into feeding', () => {
  const { world, chimp } = resourceFixture();
  const old = getEligibleActions(world, chimp);
  const pick = resourceEligibleActions(world, chimp).find(k => k.action === 'travel' && !old.some(o => same(o, k)))!;
  assert.ok(pick); assert.ok(Number.isFinite(candidateMeta.get(pick)?.raw)); assert.ok(candidateMeta.get(pick)?.bel);
  assert.equal(applyDecision(world, chimp.id, pick, 'decide', chimp.decisionVersion), true);
  const intent = ix(chimp).rgIntent!;
  const kept = gate(world, chimp, intent, resourceEligibleActions(world, chimp));
  assert.equal(typeof kept, 'object');
  if (typeof kept !== 'string') assert.ok(same(kept.keep, pick));
  const tree = world.trees.find(t => t.id === pick.targetId)!;
  chimp.position = [...tree.position]; ix(chimp).trees.push(tree.id); ix(chimp).finished = true;
  const arrived = gate(world, chimp, intent, resourceEligibleActions(world, chimp));
  assert.equal(typeof arrived, 'object');
  if (typeof arrived !== 'string') { assert.equal(arrived.arrived, true); assert.equal(arrived.keep.action, 'forage'); assert.equal(arrived.keep.targetId, tree.id); }
});

test('stale answers, unknown targets, and malformed target requests cannot apply', () => {
  const { world, chimp } = resourceFixture(), r = buildRequest(world, chimp);
  assert.equal(applyDecision(world, chimp.id, r.options[0], 'decide', chimp.decisionVersion + 1), false);
  assert.equal(applyDecision(world, chimp.id, { action: 'drink', targetId: 299999 }, 'decide'), false);
  assert.equal(settleAnswer(world, chimp, r, { index: 999 }).refusal, 'invalid-answer');
  const i = r.groups!.findIndex(g => g.length > 1);
  r.groups![i][0].targetId = 0;
  assert.throws(() => secondRequest(world, r, { index: i, probabilities: r.options.map((_, j) => j === i ? 1 : 0) }), /Invalid R15 target request/);
});

test('model decision points refresh the original rules fallback list', () => {
  const { world, chimp } = resourceFixture();
  chimp.controller = 'model'; world.modelPolicy.mode = 'lockstep'; ix(chimp).seenAt = world.time;
  chimp.candidates = [];
  decisionPoint(world, chimp);
  assert.ok(chimp.candidates.length);
  assert.deepEqual(chimp.candidates, computeCandidates(world, chimp, []));
  assert.ok(rulesChoice(world, chimp));
});

test('joined food trips retain their original nonresource kind and execution metadata', () => {
  const { world, chimp } = resourceFixture({ partyFollowW: 1, partyJoinTrip: 1, joinChoice: 1 });
  const leader = world.chimps.find(c => c !== chimp && c.age >= 15)!;
  leader.position = [chimp.position[0] + 3, chimp.position[1], chimp.position[2]];
  leader.action = 'travel'; leader.targetId = world.trees[21].id; ix(leader).v = V.TREE;
  chimp.bonds[leader.id] = 1; ix(chimp).seen = [leader.id];
  const original = computeCandidates(world, chimp, []);
  const joined = original.find(k => k.action === 'travel' && (candidateMeta.get(k)?.aux ?? -1) > 0)!;
  assert.ok(joined, 'fixture offers a joined trip');
  const pool = resourceEligibleActions(world, chimp), kept = pool.find(k => same(k, joined))!;
  assert.equal(candidateMeta.get(kept)?.aux, leader.id);
  assert.equal(pool.filter(k => same(k, joined)).length, 1);
  const request = buildRequest(world, chimp), group = request.groups!.find(g => g.some(k => same(k, joined)))!;
  assert.ok(group); assert.equal(group.length, 1); assert.equal(optionKind(group[0]), 'keep_with_party');
});

test('counterfactual target jitter is pure and keeps the same valuation and legal membership', () => {
  const { world, chimp } = resourceFixture(), before = JSON.stringify(world);
  const a = resourceEligibleActions(world, chimp, 1).filter(k => k.action === 'drink');
  const b = resourceEligibleActions(world, chimp, 2).filter(k => k.action === 'drink');
  assert.deepEqual(new Set(a.map(k => k.targetId)), new Set(b.map(k => k.targetId)));
  assert.ok(a.some(k => candidateMeta.get(k)?.jit !== candidateMeta.get(b.find(o => same(o, k))!)?.jit));
  for (const k of a) assert.equal(candidateMeta.get(k)?.raw, candidateMeta.get(b.find(o => same(o, k))!)?.raw);
  assert.equal(JSON.stringify(world), before);
});
