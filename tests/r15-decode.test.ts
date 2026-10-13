import assert from 'node:assert/strict';
import test from 'node:test';
import { newDecoder, requestKeys, type Decoder, type HarnessDecode } from '../scripts/lib/decoder';
import { decode, drawUnit, gumbel, heldNoise, optionKey, unit } from '../src/kernel/decode';
import type { KernelRequest, StepResult } from '../src/kernel/types';
import { buildRequest } from '../src/sim/request';
import { candidateMeta, V } from '../src/sim/candidates';
import { optionKind } from '../src/sim/menu';
import { ix } from '../src/sim/state';
import { createWorld } from '../src/simulation';
import type { Candidate } from '../src/types';

const option = (action: Candidate['action'], targetId: number): Candidate => { const c = { action, targetId, score: 1, reason: '' }; candidateMeta.set(c, { v: action === 'travel' ? V.TREE : V.NONE, aux: -1 }); return c; };
function fixture() {
  const w = createWorld(48), c = w.chimps.find(x => x.alive && x.age >= 15)!;
  const context = buildRequest(w, c).context;
  const req = (options: Candidate[], stage?: 'kind' | 'target', groups?: Candidate[][]): KernelRequest => ({
    context: { ...context, version: c.decisionVersion, candidates: options, ...(stage ? { resourceChoice: stage, resourceKinds: options.map(optionKind) } : {}) },
    options, rulesIndex: -1, ...(groups ? { groups } : {}),
  });
  const ask = (dec: Decoder, request: KernelRequest, probabilities = request.options.map((_, i) => +(i === 0))) => dec.step(w)(c, request, { index: 0, probabilities });
  const result = (request: KernelRequest, index: number, second?: KernelRequest, by: StepResult['by'] = 'kernel'): StepResult => ({ chimpId: c.id, kernel: 'null', by, refusal: by === 'rules' ? 'invalid-answer' : '', detail: '', index, request, calls: second ? 2 : 1, ...(second ? { second } : {}) });
  return { w, c, req, ask, result };
}
const held: HarnessDecode = { mode: 'held', salt: 1, hold: 'act' };

test('flat draw/held hash inputs, receipt shape and checkpoint shape remain the legacy contract', () => {
  const at = { seed: 48, chimpId: 3, version: 29, epoch: 17 }, keys = ['rest:-1', 'travel:100001'];
  assert.equal(drawUnit(2, at), unit('draw|48|2|3|29'));
  for (const key of keys) assert.equal(heldNoise(2, at, key), gumbel(unit(`held|48|2|3|17|${key}`)));
  for (const mode of ['top', 'draw', 'held'] as const) {
    const f = fixture(), dec = newDecoder({ ...held, mode }), request = f.req([option('rest', -1), option('travel', 100001)]);
    const p = [0.4, 0.6], index = f.ask(dec, request, p), d = decode({ ...held, mode }, { seed: 48, chimpId: f.c.id, version: f.c.decisionVersion, epoch: f.c.decisionVersion }, requestKeys(request), p, 0);
    const record = dec.settle(f.w, f.result(request, index));
    assert.deepEqual(record, { mode, salt: 1, hold: 'act', epoch: f.c.decisionVersion, open: 'first', prev: null, kernel: 0, index: d.index, ...(d.u === undefined ? {} : { u: d.u }), ...(d.g === undefined ? {} : { g: d.g }) });
    assert.deepEqual(dec.snapshot()[f.c.id], { key: optionKey(request.options[index]), at: f.w.time, epoch: f.c.decisionVersion, pending: false });
  }
});

test('kind noise survives a changed representative and menu order, while the epoch remembers the applied target', () => {
  const f = fixture(), dec = newDecoder(held), rest = option('rest', -1), a = option('travel', 100001), b = option('travel', 100002);
  const first = f.req([a, rest], 'kind', [[a, b], [rest]]), hash = JSON.stringify(f.w);
  const i = f.ask(dec, first), calls = dec.settleCalls(f.w, f.result(first, i));
  assert.equal(JSON.stringify(f.w), hash, 'decoding and settlement notes never write World');
  assert.deepEqual(calls[0].keys, ['kind/go_to_food', 'kind/rest']);
  assert.equal(dec.snapshot()[f.c.id].key, 'travel:100001');
  f.c.action = 'travel'; f.c.targetId = 100001; f.c.decisionVersion++;
  const second = f.req([rest, b], 'kind', [[rest], [b, a]]);
  const j = f.ask(dec, second, [0, 1]), again = dec.settleCalls(f.w, f.result(second, j))[0];
  assert.equal(again.record.open, ''); assert.equal(again.record.epoch, calls[0].record.epoch); assert.equal(again.record.prev, 1);
  assert.deepEqual(again.record.g, [...calls[0].record.g!].reverse());
  assert.equal(dec.snapshot()[f.c.id].key, 'travel:100002');
});

test('kind and target calls have separate reproducible namespaces and settle the final concrete choice', () => {
  for (const mode of ['draw', 'held'] as const) {
    const f = fixture(), dec = newDecoder({ ...held, mode }), a = option('travel', 100001), b = option('travel', 100002), rest = option('rest', -1);
    const first = f.req([a, rest], 'kind', [[a, b], [rest]]), second = f.req([a, b], 'target');
    f.ask(dec, first); const index = f.ask(dec, second, [0, 1]);
    const calls = dec.settleCalls(f.w, f.result(first, index, second));
    assert.deepEqual(calls.map(c => c.stage), ['kind', 'target/go_to_food']);
    assert.deepEqual(calls[1].keys, ['travel:100001', 'travel:100002']);
    assert.equal(calls[0].record.epoch, calls[1].record.epoch);
    if (mode === 'draw') assert.notEqual(calls[0].record.u, calls[1].record.u);
    else assert.notEqual(heldNoise(1, { seed: 48, chimpId: f.c.id, version: 0, epoch: 0, stage: 'kind' }, 'same'), heldNoise(1, { seed: 48, chimpId: f.c.id, version: 0, epoch: 0, stage: 'target/go_to_food' }, 'same'));
    assert.equal(dec.snapshot()[f.c.id].key, 'travel:100002');
    f.c.action = 'travel'; f.c.targetId = 100002; f.c.decisionVersion++;
    const saved = JSON.parse(JSON.stringify(dec.snapshot())), resumed = newDecoder({ ...held, mode }, saved);
    const nextFirst = f.req([a, rest], 'kind', [[a, b], [rest]]), nextSecond = f.req([b, a], 'target');
    const run = (d: Decoder) => { f.ask(d, nextFirst); const i = f.ask(d, nextSecond, [0.7, 0.3]); return d.settleCalls(f.w, f.result(nextFirst, i, nextSecond)); };
    const one = run(dec), two = run(resumed);
    assert.deepEqual(two, one); assert.deepEqual(resumed.snapshot(), dec.snapshot());
    assert.equal(one[0].record.open, ''); assert.equal(one[0].record.prev, 0); assert.equal(one[1].record.prev, 0);
  }
});

test('singleton/generic grouped requests, failed targets and subsequent interrupts retain correct settlement', () => {
  const f = fixture(), dec = newDecoder(held), rest = option('rest', -1), a = option('travel', 100001), b = option('travel', 100002);
  let first = f.req([rest, a], undefined, [[rest], [a, b]]);
  let index = f.ask(dec, first); let calls = dec.settleCalls(f.w, f.result(first, index));
  assert.equal(calls.length, 1); assert.equal(dec.snapshot()[f.c.id].key, 'rest:-1');
  f.c.action = 'rest'; f.c.targetId = -1; f.c.decisionVersion++;
  first = f.req([a, rest], undefined, [[a, b], [rest]]); const second = f.req([a, b]);
  f.ask(dec, first); index = f.ask(dec, second);
  calls = dec.settleCalls(f.w, f.result(first, index, second, 'rules'));
  assert.equal(calls[1].stage, 'target/go_to_food'); assert.equal(dec.snapshot()[f.c.id].key, null);
  f.c.decisionVersion++; first = f.req([a, rest], 'kind', [[a, b], [rest]]);
  index = f.ask(dec, first); calls = dec.settleCalls(f.w, f.result(first, index));
  assert.equal(calls[0].record.open, 'rules');
  f.c.action = 'travel'; f.c.targetId = 100001; ix(f.c).lastIntrAt = f.w.time + 0.1; f.w.time += 0.2; f.c.decisionVersion++;
  first = f.req([a, rest], 'kind', [[a, b], [rest]]); index = f.ask(dec, first);
  calls = dec.settleCalls(f.w, f.result(first, index)); assert.equal(calls[0].record.open, 'interrupt');
  // The unchecked target never called decode: retain the checked kind record, but clear the applied choice.
  f.c.decisionVersion++; first = f.req([a, rest], 'kind', [[a, b], [rest]]); f.ask(dec, first);
  const failedSecond = f.req([a, b], 'target');
  calls = dec.settleCalls(f.w, f.result(first, -1, failedSecond, 'rules'));
  assert.equal(calls.length, 1); assert.equal(calls[0].stage, 'kind'); assert.equal(dec.snapshot()[f.c.id].key, null);
});

test('serialized R15 kind identities survive loss of candidate WeakMap metadata', () => {
  const f = fixture(), a = option('travel', 100001), b = option('travel', 100002), rest = option('rest', -1);
  const first = f.req([a, rest], 'kind', [[a, b], [rest]]), second = f.req([a, b], 'target');
  const copyFirst: KernelRequest = JSON.parse(JSON.stringify(first)), copySecond: KernelRequest = JSON.parse(JSON.stringify(second));
  assert.equal(optionKind(copyFirst.options[0]), 'other', 'the serialization really dropped the variant metadata');
  const run = (one: KernelRequest, two: KernelRequest) => {
    const dec = newDecoder({ ...held, mode: 'draw' }); f.ask(dec, one); const index = f.ask(dec, two, [0, 1]);
    return { calls: dec.settleCalls(f.w, f.result(one, index, two)), state: dec.snapshot() };
  };
  assert.deepEqual(run(copyFirst, copySecond), run(first, second));
  assert.deepEqual(requestKeys(copyFirst), ['kind/go_to_food', 'kind/rest']);
});
