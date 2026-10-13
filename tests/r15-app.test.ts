import assert from 'node:assert/strict';
import test from 'node:test';
import { createR15Demo, r15FocalIds } from '../src/r15-demo';
import { paramsOf } from '../src/sim/params';
import { buildRequest, createDecisionController, pumpDecisions, refreshDecideStatus, setPolicy, setRoster } from '../src/decision';
import { adapterIdentity, httpProvider } from '../src/providers/http';
import { DEFAULT_PROVIDER_CONFIG, parseProviderConfig, providerSelection } from '../src/providers/config';
import { R15_PACKET_VERSION } from '../src/kernel/resource-contract';
import type { DecisionProvider } from '../src/providers/types';
import { resourceFixture } from './fixtures/r15';
import { newDecoder } from '../scripts/lib/decoder';

const identity = { adapter: 'r15-resources-s7', sha256: 'a'.repeat(64), packetVersion: R15_PACKET_VERSION };
const settle = async (d: ReturnType<typeof createDecisionController>) => { for (let i = 0; d.busy && i < 20; i++) await new Promise(r => setTimeout(r, 1)); assert.equal(d.busy, false); };

test('R15 provider is explicit; demo starts five animals aged 8+ in lockstep without changing normal config', () => {
  assert.equal(DEFAULT_PROVIDER_CONFIG.default, 'browser');
  assert.equal(providerSelection(parseProviderConfig({}), true), 'browser');
  assert.equal(providerSelection(parseProviderConfig({}), true, 'r15'), 'r15');
  assert.equal(parseProviderConfig({ r15: { baseUrl: '/local/r15' } }).r15.baseUrl, '/local/r15');
  const world = createR15Demo(), d = createDecisionController();
  assert.equal(world.seed, 48); assert.ok(world.size > 1000); assert.equal(paramsOf(world).resourceTargets, 1);
  setPolicy(d, world, 'async'); assert.equal(world.modelPolicy.mode, 'lockstep');
  setRoster(d, world, 'all', -1);
  assert.deepEqual(d.focalIds, r15FocalIds(world)); assert.equal(d.focalIds.length, 5);
  assert.ok(world.chimps.filter(c => c.controller === 'model').every(c => c.age >= 8));
  setRoster(d, world, 'selected', world.chimps.at(-1)!.id); assert.deepEqual(d.focalIds, r15FocalIds(world));
  setPolicy(d, world, 'off'); assert.equal(world.modelPolicy.mode, 'off');
});

test('R15 HTTP status retains compatible identity and rejects malformed identity', async () => {
  assert.deepEqual(adapterIdentity(identity), identity);
  assert.equal(adapterIdentity({ ...identity, sha256: 'bad' }), undefined);
  assert.equal(adapterIdentity({ ...identity, packetVersion: 'old' }), undefined);
  const prior = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ready: true, phase: 'ready', model: identity.adapter, identity }));
  try { assert.deepEqual((await httpProvider('r15', () => '/api/providers/r15').status()).identity, identity); }
  finally { globalThis.fetch = prior; }
});

test('app retains both draws, matches headless decode and applies the selected resource target', async () => {
  const { world, chimp } = resourceFixture();
  const request = buildRequest(world, chimp), first = request.groups!.findIndex(g => g.length > 1);
  assert.ok(first >= 0);
  const calls: typeof request.context[] = [];
  const provider: DecisionProvider = { id: 'r15', label: 'R15', async status() { return { ready: true, phase: 'ready', identity, model: identity.adapter }; }, async start() {},
    async decide(context) { calls.push(context); const index = context.resourceChoice === 'kind' ? first : 0;
      return { index, choice: `c${index}`, probabilities: context.candidates.map((_, i) => i === index ? 1 : 0), identity }; } };
  const d = createDecisionController(provider); setPolicy(d, world, 'lockstep'); setRoster(d, world, 'focal-set', chimp.id);
  assert.ok(d.focalIds.includes(chimp.id));
  await refreshDecideStatus(d); chimp.awaitingDecisionSince = world.time;
  const decoder = newDecoder({ mode: 'draw', salt: 1, hold: 'act' }), step = decoder.step(world);
  pumpDecisions(d, world, chimp.id); await settle(d);
  const trace = d.traces.find(t => t.source === 'model')!;
  assert.ok(trace.applied); assert.equal(calls.length, 2); assert.equal(trace.resourceCalls!.length, 2);
  for (const call of trace.resourceCalls!) {
    const q = { context: call.context, options: call.context.candidates, rulesIndex: -1 };
    // Both decoders read the original request version; draw mode does not depend on the subsequently applied act.
    const chosen = step(chimp, q, { index: call.kernelIndex, probabilities: call.probabilities });
    assert.equal(chosen, call.choiceIndex);
  }
  const last = trace.resourceCalls!.at(-1)!;
  const expected = decoder.settleCalls(world, { chimpId: chimp.id, kernel: 'null', by: 'kernel', refusal: '', detail: '', index: trace.choiceIndex, request,
    second: { context: last.context, options: last.context.candidates, rulesIndex: -1 }, calls: 2 });
  assert.deepEqual(trace.resourceCalls!.map(c => c.draw), expected.map(c => c.record.u));
  assert.deepEqual(trace.resourceCalls!.map(c => c.keys), expected.map(c => c.keys));
  assert.notEqual(trace.resourceCalls![0].draw, trace.resourceCalls![1].draw);
  assert.deepEqual(trace.identity, identity);
  assert.equal(chimp.action, trace.options[trace.choiceIndex].action); assert.equal(chimp.targetId, trace.options[trace.choiceIndex].targetId);
});

test('changed adapter on target call leaves a rejected two-stage trace and falls back', async () => {
  const { world, chimp } = resourceFixture();
  const request = buildRequest(world, chimp), first = request.groups!.findIndex(g => g.length > 1);
  const provider: DecisionProvider = { id: 'r15', label: 'R15', async status() { return { ready: true, phase: 'ready', identity }; }, async start() {}, async decide(ctx) {
    const index = ctx.resourceChoice === 'kind' ? first : 0;
    return { index, probabilities: ctx.candidates.map((_, i) => i === index ? 1 : 0), identity: ctx.resourceChoice === 'kind' ? identity : { ...identity, sha256: 'b'.repeat(64) } };
  } };
  const d = createDecisionController(provider); setPolicy(d, world, 'lockstep'); setRoster(d, world, 'focal-set', chimp.id); await refreshDecideStatus(d);
  chimp.awaitingDecisionSince = world.time; pumpDecisions(d, world, chimp.id); await settle(d);
  assert.equal(d.applied, 0); assert.equal(d.fallbacks, 1); assert.match(d.lastError, /identity/);
  const rejected = d.traces.find(t => t.source === 'model')!;
  assert.equal(rejected.resourceCalls!.length, 1); assert.match(rejected.discardedReason, /identity/);
});

test('queued R15 animals wait for their turn; only the in-flight stage times out', async () => {
  const { world, chimp } = resourceFixture();
  let finish: ((value: {}) => void) | undefined;
  const provider: DecisionProvider = { id: 'r15', label: 'R15', async status() { return { ready: true, phase: 'ready', identity }; }, async start() {},
    decide() { return new Promise(resolve => { finish = resolve; }); } };
  const d = createDecisionController(provider); setPolicy(d, world, 'lockstep'); setRoster(d, world, 'focal-set', chimp.id); await refreshDecideStatus(d);
  const other = world.chimps.find(c => d.focalIds.includes(c.id) && c.id !== chimp.id)!;
  chimp.awaitingDecisionSince = other.awaitingDecisionSince = world.time;
  const now = Date.now(); pumpDecisions(d, world, chimp.id, now);
  pumpDecisions(d, world, chimp.id, now + 10000);
  assert.equal(d.fallbacks, 0); assert.equal(other.awaitingDecisionSince, world.time);
  pumpDecisions(d, world, chimp.id, now + 23000);
  assert.equal(d.fallbacks, 1); assert.equal(other.awaitingDecisionSince, world.time);
  finish?.({}); await settle(d);
});
