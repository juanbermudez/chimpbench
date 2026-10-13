import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runR15, r15FakeKernel, type R15Call } from '../scripts/lib/r15-loop';
import { createWorld, tickWorld } from '../src/simulation';
import type { Kernel } from '../src/kernel/types';
import { worldHash } from './fixtures/golden';

const decode = { mode: 'draw', salt: 1, hold: 'act' } as const;
const params = { ...JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8')) as Record<string, number>, observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 };
function fixture() {
  const world = createWorld(48, { profile: 'compressed', params });
  for (let i = 0; i < 120; i++) tickWorld(world);
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' };
  const c = world.chimps.find(c => c.alive && c.age >= 8)!;
  c.controller = 'model'; c.nextDecision = world.time;
  return world;
}
// Prefer a multi-target resource in the wiring fixture; this is a fake kernel, not a behavior claim.
const targetSeeking: Kernel = { ...r15FakeKernel, decide(request) {
  const multi = request.groups?.findIndex(g => g.length > 1) ?? -1;
  if (multi < 0) return r15FakeKernel.decide(request, { random: () => 0.5 });
  const probabilities = request.options.map((_, i) => i === multi ? 1 : 0);
  return { index: multi, probabilities, choice: `c${multi}` };
} };

test('two-stage calls replay exactly and a changed packet fails closed', async () => {
  const initial = fixture(), live = structuredClone(initial), journal: R15Call[] = [];
  const result = await runR15(live, targetSeeking, { ticks: 120, identity: 'fixture', decode, onCall: call => journal.push(call) });
  assert.ok(journal.length > 0); assert.ok(journal.some(c => c.stage.startsWith('target/')), 'fixture must exercise the second call');
  const replay = await runR15(structuredClone(initial), r15FakeKernel, { ticks: 120, identity: 'fixture', decode, journal, replayOnly: true });
  assert.equal(replay.endHash, result.endHash); assert.deepEqual(replay.receipts, result.receipts);
  const changed = structuredClone(journal); changed[0].packetHash = 'wrong';
  await assert.rejects(runR15(structuredClone(initial), r15FakeKernel, { ticks: 120, identity: 'fixture', decode, journal: changed, replayOnly: true }), /packet\/menu differs/);
  await assert.rejects(runR15(structuredClone(initial), r15FakeKernel, { ticks: 120, identity: 'fixture', decode, journal: [], replayOnly: true }), /replay missing/);
});

test('a crash after the kind answer reuses it and reproduces the uninterrupted world', async () => {
  const initial = fixture(), journal: R15Call[] = [];
  const expected = await runR15(structuredClone(initial), targetSeeking, { ticks: 120, identity: 'fixture', decode });
  await assert.rejects(runR15(structuredClone(initial), targetSeeking, { ticks: 120, identity: 'fixture', decode,
    onCall(call) { journal.push(call); throw new Error('simulated process loss'); },
  }), /simulated process loss/);
  assert.equal(journal.length, 1);
  const resumed = await runR15(structuredClone(initial), targetSeeking, { ticks: 120, identity: 'fixture', decode, journal });
  assert.equal(resumed.endHash, expected.endHash); assert.deepEqual(resumed.receipts, expected.receipts);
});

test('checkpoint between passes preserves world, decoder and subsequent receipts', async () => {
  const initial = fixture(), full = await runR15(structuredClone(initial), targetSeeking, { ticks: 120, identity: 'fixture', decode });
  const world = structuredClone(initial), first = await runR15(world, targetSeeking, { ticks: 60, identity: 'fixture', decode });
  const resumed = await runR15(JSON.parse(JSON.stringify(world)), targetSeeking, { ticks: 60, identity: 'fixture', decode, decoderState: JSON.parse(JSON.stringify(first.decoder)) });
  assert.equal(resumed.endHash, full.endHash); assert.deepEqual([...first.receipts, ...resumed.receipts], full.receipts);
  assert.notEqual(worldHash(initial), full.endHash);
});
