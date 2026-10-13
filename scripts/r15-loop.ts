// Bounded model integration and exact two-call replay; see docs/staging/r15-perceived-targets.md.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Kernel } from '../src/kernel/types';
import { r15ModelKernel } from './lib/r15-model';
import { r15Interruption } from './lib/r15-interrupt';
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
  model?: boolean; adapter?: unknown; wallCapSeconds?: number;
  startHash: string; endHash?: string; journalHash?: string; receiptsHash?: string; requestsHash?: string;
}

export async function main(): Promise<void> {
  const command = process.argv[2] ?? 'dry', out = resolve(arg('out', 'artifacts/r15/wiring'));
  if (!['dry', 'model', 'replay'].includes(command)) throw new Error('usage: scripts/r15-loop.ts dry|model|replay --out directory [--ticks 720] [--decode draw|held|top] [--training-root directory --adapter r15-resources-s7]');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('R15 harness requires a committed, clean checkout');
  if (command === 'model' && execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim() !== 'HEAD') throw new Error('R15 model runs require a frozen detached checkout');
  const manifestFile = resolve(out, 'run.json'), initialFile = resolve(out, 'initial.json'), journalFile = resolve(out, 'journal.jsonl'), receiptsFile = resolve(out, 'receipts.json');
  if (command === 'replay') {
    const m = json(manifestFile) as R15DryManifest;
    if (m.schema !== R15_RECEIPT_SCHEMA || m.source !== source) throw new Error('R15 schema/source differs from the frozen run');
    const journal = lines<R15Call>(journalFile), expected = json(receiptsFile) as R15Receipt[], world = json(initialFile) as World;
    assert.equal(worldHash(world), m.startHash); assert.equal(hashR15(journal), m.journalHash); assert.equal(hashR15(expected), m.receiptsHash);
    if (m.requestsHash) assert.equal(hashR15(lines(resolve(out, 'requests.jsonl'))), m.requestsHash);
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
  const initial = structuredClone(world);
  let kernel: Kernel = r15FakeKernel;
  let worker: import('../server/r15-worker').R15Worker | undefined;
  let adapter: unknown = 'fake-no-model';
  const wallCapSeconds = 3600, started = Date.now();
  mkdirSync(out, { recursive: true });
  writeAtomic(initialFile, JSON.stringify(initial));
  writeAtomic(manifestFile, JSON.stringify({ schema: R15_RECEIPT_SCHEMA, source, ticks, decode, startHash: worldHash(initial),
    model: command === 'model', requestedAdapter: command === 'model' ? arg('adapter', 'r15-resources-s7') : 'fake-no-model', status: 'starting', wallCapSeconds }));
  const interruption = r15Interruption(async () => { await worker?.close(); });
  try {
    if (command === 'model') {
      const trainingRoot = arg('training-root', '');
      if (!trainingRoot) throw new Error('model requires --training-root');
      const { R15Worker } = await import('../server/r15-worker');
      worker = new R15Worker({ trainingRoot: resolve(trainingRoot), adapter: arg('adapter', 'r15-resources-s7') });
      try { await worker.start(); kernel = r15ModelKernel(worker, worker.manifest, worker.ready); adapter = worker.manifest; }
      catch (error) { await worker.close(); throw error; }
    }
    const identity = r15Identity(source, adapter, decode);
    const recurrentInputs = new Map<number, Set<string>>();
    interruption.check();
    const manifest: R15DryManifest = { schema: R15_RECEIPT_SCHEMA, source, identity, ticks, decode, startHash: worldHash(initial), model: command === 'model', adapter, wallCapSeconds };
    writeAtomic(manifestFile, JSON.stringify(manifest, null, 2));
    const fd = openSync(journalFile, 'wx'), requestFd = openSync(resolve(out, 'requests.jsonl'), 'wx');
    let result: Awaited<ReturnType<typeof runR15>>;
    try {
      result = await runR15(world, kernel, { ticks, identity, decode,
        onRequest(_world, request) {
          interruption.check();
          if ((Date.now() - started) / 1000 > wallCapSeconds) throw new Error('R15 one-hour loop wall cap exceeded');
          writeSync(requestFd, JSON.stringify({ tick: world.tick, request }) + '\n'); fsyncSync(requestFd);
          if (request.context.resourceChoice === 'kind') {
            const ctx = request.context, seen = recurrentInputs.get(ctx.chimpId) ?? new Set<string>();
            seen.add(hashR15({ body: ctx.body, own: ctx.own, focal: ctx.focal })); recurrentInputs.set(ctx.chimpId, seen);
          }
        },
        onCall(call) { writeSync(fd, JSON.stringify(call) + '\n'); fsyncSync(fd);
          if (command === 'model' && call.error !== null) throw new Error(`R15 model failed: ${call.error}`);
        },
        onPass(receipts, checkpoint) {
          interruption.check();
          if (receipts.length) writeAtomic(resolve(out, 'checkpoint.json'), JSON.stringify(checkpoint));
          if ((Date.now() - started) / 1000 > wallCapSeconds) throw new Error('R15 one-hour loop wall cap exceeded');
        },
      });
    } finally { closeSync(fd); closeSync(requestFd); }
    writeAtomic(receiptsFile, JSON.stringify(result.receipts));
    writeAtomic(resolve(out, 'checkpoint.json'), JSON.stringify({ world, decoder: result.decoder, completedTicks: ticks }));
    const journal = lines<R15Call>(journalFile);
    Object.assign(manifest, { endHash: result.endHash, journalHash: hashR15(journal), receiptsHash: hashR15(result.receipts), requestsHash: hashR15(lines(resolve(out, 'requests.jsonl'))) });
    writeAtomic(manifestFile, JSON.stringify(manifest, null, 2));
    const replay = await runR15(initial, r15FakeKernel, { ticks, identity, decode, journal, replayOnly: true });
    assert.equal(replay.endHash, result.endHash); assert.deepEqual(replay.receipts, result.receipts);
    assert.ok(result.calls.some(c => c.stage.startsWith('target/')), 'wiring proof incomplete: no target call');
    assert.ok(result.receipts.some(r => r.calls.length === 2 && r.decode.length === 2 && r.by === 'kernel'), 'wiring proof incomplete: no applied two-call decision');
    const recurrentAnimals = focal.filter(id => (recurrentInputs.get(id)?.size ?? 0) > 1);
    if (command === 'model') assert.ok(recurrentAnimals.length > 0, 'model proof incomplete: no animal received changed recurrent inputs');
    const summary = { schema: R15_RECEIPT_SCHEMA, model: command === 'model', adapter, wallSeconds: (Date.now() - started) / 1000, recurrentAnimals, ticks, focal, calls: result.calls.length,
      targetCalls: result.calls.filter(c => c.stage.startsWith('target/')).length,
      decisions: result.receipts.length, applied: result.receipts.filter(r => r.by === 'kernel').length,
      fallbacks: result.receipts.filter(r => r.by === 'rules').length, replay: 'exact', endHash: result.endHash };
    writeAtomic(resolve(out, 'verification.json'), JSON.stringify(summary, null, 2)); console.log(JSON.stringify(summary));
  } catch (error) {
    if (existsSync(out)) writeAtomic(resolve(out, 'failure.json'), JSON.stringify({ error: error instanceof Error ? error.message : String(error), wallSeconds: (Date.now() - started) / 1000 }));
    throw error;
  } finally { try { await worker?.close(); } finally { interruption.dispose(); } }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
