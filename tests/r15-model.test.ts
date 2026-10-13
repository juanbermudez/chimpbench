import assert from 'node:assert/strict';
import test from 'node:test';
import { r15ModelKernel } from '../scripts/lib/r15-model';
import { R15_KIND_TEACHER, R15_PACKET_VERSION, R15_TARGET_TEACHER, r15Packet } from '../scripts/lib/r15-training';
import { buildRequest, targetRequest } from '../src/sim/request';
import { resourceFixture } from './fixtures/r15';

const adapter = 'r15-resources-s7', weights = 'a'.repeat(64);
const manifest = { stage: 'R15', adapter, adapter_sha256: weights, packetVersion: R15_PACKET_VERSION,
  base_model: 'fastino/GLiNER2.5-Decide', base_revision: '7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6',
  kindTeacher: R15_KIND_TEACHER, targetTeacher: R15_TARGET_TEACHER, labels: 'soft',
  hyperparameters: { seed: 7, epochs: 3 }, phaseCounts: { train: { kind: 1, target: 1 }, dev: { kind: 1, target: 1 } } };

test('model bridge refuses a missing, old or different adapter before scoring', () => {
  const scorer = { async score() { assert.fail('must not score'); } };
  assert.throws(() => r15ModelKernel(scorer, { ...manifest, stage: 'R14' }, { ready: true, adapters: { [adapter]: weights } }), /incompatible/);
  assert.throws(() => r15ModelKernel(scorer, manifest, { ready: true, adapters: {} }), /exact registered/);
  assert.throws(() => r15ModelKernel(scorer, manifest, { ready: true, adapters: { [adapter]: 'b'.repeat(64) } }), /exact registered/);
});

test('both stages send the identical training packet to the matching loaded adapter', async () => {
  const { world, chimp } = resourceFixture(), first = buildRequest(world, chimp);
  const second = targetRequest(first, first.groups!.findIndex(g => g.length > 1))!;
  const sent: unknown[] = [];
  const scorer = { status: () => ({ inputTokens: 123 }), async score(batch: { adapter: string; packet: unknown }[]) {
    sent.push(...batch);
    return batch.map(({ packet }) => Object.keys((packet as ReturnType<typeof r15Packet>).questions.action.criteria).map((_, i, a) => i === 0 ? 1 : 0));
  } };
  const kernel = r15ModelKernel(scorer, manifest, { ready: true, adapters: { [adapter]: weights } });
  for (const request of [first, second]) assert.equal((await kernel.decide(request, { random: () => 0.5 })).inputTokens, 123);
  assert.deepEqual(sent, [first, second].map(request => ({ adapter, packet: r15Packet(request.context) })));
});
