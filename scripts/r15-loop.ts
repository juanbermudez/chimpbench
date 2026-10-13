// Bounded no-model integration and exact two-call replay; see docs/staging/r15-perceived-targets.md.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { writeAtomic } from './lib/checkpoint';
import type { HarnessDecode } from './lib/decoder';
import { hashR15, r15FakeKernel, r15Identity, R15_RECEIPT_SCHEMA, runR15, type R15Call, type R15Receipt } from './lib/r15-loop';

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const lines = <T>(path: string): T[] => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as T);
const arg = (name: string, fallback: string): string => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
export interface R15DryManifest {
  schema: typeof R15_RECEIPT_SCHEMA; source: string; identity: string; ticks: number; decode: HarnessDecode;
  startHash: string; endHash?: string; journalHash?: string; receiptsHash?: string;
}

export async function main(): Promise<void> {
  const command = process.argv[2] ?? 'dry', out = resolve(arg('out', 'artifacts/r15/wiring'));
  if (!['dry', 'replay'].includes(command)) throw new Error('usage: scripts/r15-loop.ts dry|replay --out directory [--ticks 720] [--decode draw|held|top]');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('R15 harness requires a committed, clean checkout');
  const manifestFile = resolve(out, 'run.json'), initialFile = resolve(out, 'initial.json'), journalFile = resolve(out, 'journal.jsonl'), receiptsFile = resolve(out, 'receipts.json');
  if (command === 'replay') {
    const m = json(manifestFile) as R15DryManifest;
    if (m.schema !== R15_RECEIPT_SCHEMA || m.source !== source) throw new Error('R15 schema/source differs from the frozen run');
    const journal = lines<R15Call>(journalFile), expected = json(receiptsFile) as R15Receipt[], world = json(initialFile) as World;
    assert.equal(worldHash(world), m.startHash); assert.equal(hashR15(journal), m.journalHash); assert.equal(hashR15(expected), m.receiptsHash);
    const replay = await runR15(world, r15FakeKernel, { ticks: m.ticks, identity: m.identity, decode: m.decode, journal, replayOnly: true });
    assert.equal(replay.endHash, m.endHash); assert.deepEqual(replay.receipts, expected);
    console.log(JSON.stringify({ schema: m.schema, replay: 'exact', ticks: m.ticks, calls: replay.calls.length, endHash: replay.endHash }));
    return;
  }
  if (existsSync(out)) throw new Error(`output already exists: ${out}; use a new directory`);
  const ticks = Number(arg('ticks', '720')), mode = arg('decode', 'draw');
  if (!['draw', 'held', 'top'].includes(mode)) throw new Error('decode must be draw, held or top');
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 1400) throw new Error('ticks must be 1..1400');
  const decode: HarnessDecode = { mode: mode as HarnessDecode['mode'], salt: 1, hold: 'act' };
  const params = { ...json('docs/staging/integrator-kit/params/M6-W50.json') as Record<string, number>, observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 };
  const world = createWorld(48, { profile: 'field', params });
  world.modelPolicy = { ...world.modelPolicy, mode: 'lockstep' };
  const focal = world.chimps.filter(c => c.alive && c.age >= 8).slice(0, 5).map(c => c.id);
  for (const c of world.chimps) c.controller = focal.includes(c.id) ? 'model' : 'rules';
  const initial = structuredClone(world), identity = r15Identity(source, 'fake-no-model', decode);
  const manifest: R15DryManifest = { schema: R15_RECEIPT_SCHEMA, source, identity, ticks, decode, startHash: worldHash(initial) };
  mkdirSync(out, { recursive: true });
  writeAtomic(initialFile, JSON.stringify(initial)); writeAtomic(manifestFile, JSON.stringify(manifest, null, 2));
  const fd = openSync(journalFile, 'wx');
  let result: Awaited<ReturnType<typeof runR15>>;
  try {
    result = await runR15(world, r15FakeKernel, { ticks, identity, decode,
      onCall(call) { writeSync(fd, JSON.stringify(call) + '\n'); fsyncSync(fd); },
    });
  } finally { closeSync(fd); }
  writeAtomic(receiptsFile, JSON.stringify(result.receipts));
  writeAtomic(resolve(out, 'checkpoint.json'), JSON.stringify({ world, decoder: result.decoder, completedTicks: ticks }));
  const journal = lines<R15Call>(journalFile);
  Object.assign(manifest, { endHash: result.endHash, journalHash: hashR15(journal), receiptsHash: hashR15(result.receipts) });
  writeAtomic(manifestFile, JSON.stringify(manifest, null, 2));
  const replay = await runR15(initial, r15FakeKernel, { ticks, identity, decode, journal, replayOnly: true });
  assert.equal(replay.endHash, result.endHash); assert.deepEqual(replay.receipts, result.receipts);
  const summary = { schema: R15_RECEIPT_SCHEMA, model: false, ticks, focal, calls: result.calls.length,
    targetCalls: result.calls.filter(c => c.stage.startsWith('target/')).length,
    decisions: result.receipts.length, applied: result.receipts.filter(r => r.by === 'kernel').length,
    fallbacks: result.receipts.filter(r => r.by === 'rules').length, replay: 'exact', endHash: result.endHash };
  writeAtomic(resolve(out, 'verification.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
