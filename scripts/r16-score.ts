// Stage R16 (docs/staging/r16-prereg.md §9, §16): an adapter's odds on the reading sets, through the serving worker under
// the supervisor (scripts/lib/r16-worker.ts), resumable: every scored row is appended as it is answered, and a resumed
// step scores only what is missing. The packet sent is the row's own, checked byte for byte against the packet the R15
// path renders from the row's context. A packet the tokenizer counted over the worker's 1,280-token limit is not sent
// (it is written as skipped and counted). Seconds per call are kept by stage (the speed rule of §10).
//
//   score --root FT --adapter A --in FILE[,FILE] --out SCORES.jsonl [--tokens TOKENS.jsonl] [--fake | --fake-python F]
// Exit codes: 0 done, 2 refused, 75 paused, 130 interrupted.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { r15Packet } from '../src/providers/packet';
import { R15Worker } from '../server/r15-worker';
import { writeAtomic } from './lib/checkpoint';
import { assertR15AdapterManifest } from './lib/r15-training';
import { readJsonl, type R16Row } from './lib/r16-collect';
import { chainGone, FakeWorker, OPS, Paused, quietRefusal, Supervisor, type FakeFaults, type Ops, type WorkerLike } from './lib/r16-worker';

const log = (s: string) => console.log(`[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${s}`);
export interface Score16 { id: string; phase: 'kind' | 'target'; p: number[] | null; skipped?: string; ms: number; worker: number; retry: number }

export async function scoreMain(argv: string[]): Promise<number> {
  const flag = (k: string, d = '') => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; }, has = (k: string) => argv.includes(`--${k}`);
  const root = resolve(flag('root')), adapter = flag('adapter'), out = resolve(flag('out')), inputs = flag('in').split(',').filter(Boolean).map(f => resolve(f));
  if (!flag('root') || !adapter || !flag('out') || !inputs.length) { console.error('usage: score --root FT --adapter A --in FILE[,FILE] --out SCORES.jsonl'); return 2; }
  const ops = { ...OPS, ...(has('ops') ? JSON.parse(flag('ops')) as Partial<Ops> : {}) } as Ops, fake = has('fake'), dry = fake || has('fake-python');
  const rows = inputs.flatMap(f => readJsonl<R16Row>(f));
  const tokens = new Map<string, number>();
  if (has('tokens')) for (const f of flag('tokens').split(',').filter(Boolean)) for (const t of readJsonl<{ id: string; tokens: number }>(resolve(f))) tokens.set(t.id, t.tokens);
  const done = new Set(existsSync(out) ? readJsonl<Score16>(out).map(s => s.id) : []);
  mkdirSync(dirname(out), { recursive: true });
  let make: (id: number) => Promise<WorkerLike>;
  if (fake) { const faults: FakeFaults = has('faults') ? JSON.parse(flag('faults')) as FakeFaults : {}; make = id => FakeWorker.make(faults, id); }
  else {
    const token = process.env.MGOGO_MODEL_LOCK_TOKEN ?? '';
    if (!token) { console.error('refused: scoring with a worker runs only under scripts/r16.py (MGOGO_MODEL_LOCK_TOKEN)'); return 2; }
    const manifest = JSON.parse(readFileSync(resolve(root, 'adapters', adapter, 'manifest.json'), 'utf8')) as unknown;
    assertR15AdapterManifest(manifest);
    make = async () => {
      const w = new R15Worker({ trainingRoot: root, adapter, chainLock: { token }, ...(has('fake-python') ? { python: resolve(flag('fake-python')) } : {}) }, { scoreMs: ops.callMs, startupMs: ops.warmMs });
      try { await w.start(); } catch (error) { await w.close(); throw error; }
      return { score: b => w.score(b), close: () => w.close(), status: () => w.status(), pid: () => w.pid() };
    };
  }
  const sup = new Supervisor({ make, adapter: fake ? 'fake' : adapter, ops, quiet: () => dry ? '' : quietRefusal({ out }), log });
  let stop = '';
  const lockPath = resolve(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim(), '..', 'artifacts', 'r14-chain.lock');
  const watch = setInterval(() => { const why = chainGone(lockPath, process.env.MGOGO_MODEL_LOCK_TOKEN ?? ''); if (why) stop ||= why; }, 10_000); watch.unref();
  const handlers = (['SIGINT', 'SIGTERM', 'SIGHUP'] as NodeJS.Signals[]).map(s => [s, () => { stop ||= `interrupted by ${s}`; }] as const);
  for (const [s, h] of handlers) process.on(s, h);
  const t0 = Date.now(), ms: Record<string, number[]> = { kind: [], target: [] };
  let scored = 0, skipped = 0, errors = 0;
  const summary = (state: string, reason = '') => writeAtomic(`${out}.summary.json`, JSON.stringify({ stage: 'R16', adapter, root, inputs, rows: rows.length, before: done.size, scored, skipped, errors, state, reason,
    msKind: ms.kind.length ? ms.kind.reduce((a, b) => a + b, 0) / ms.kind.length : null, msTarget: ms.target.length ? ms.target.reduce((a, b) => a + b, 0) / ms.target.length : null,
    wallSeconds: Math.round((Date.now() - t0) / 1000), supervisor: sup.stats }, null, 1) + '\n');
  try {
    if (!dry) { const q = quietRefusal({ out }); if (q) { summary('paused', `the machine is not quiet: ${q}`); return 75; } }
    await sup.start();
    for (const r of rows) {
      if (done.has(r.id)) continue;
      if (stop) { summary('interrupted', stop); return 130; }
      if (JSON.stringify(r.packet) !== JSON.stringify(r15Packet(r.context))) throw new Error(`${r.id}: the row's packet is not the packet the R15 path renders from its context`);
      const n = tokens.get(r.id);
      if (n !== undefined && n > 1280) { appendFileSync(out, JSON.stringify({ id: r.id, phase: r.phase, p: null, skipped: `${n} tokens, over the worker's limit of 1,280`, ms: 0, worker: 0, retry: 0 } satisfies Score16) + '\n'); skipped++; continue; }
      let line: Score16;
      try { const a = await sup.ask(r.packet); line = { id: r.id, phase: r.phase, p: a.p, ms: a.ms, worker: a.worker, retry: a.retry }; ms[r.phase].push(a.ms); scored++; }
      catch (error) { if (error instanceof Paused) throw error; errors++; line = { id: r.id, phase: r.phase, p: null, skipped: `error: ${error instanceof Error ? error.message : String(error)}`, ms: 0, worker: 0, retry: 1 }; }
      appendFileSync(out, JSON.stringify(line) + '\n');
      if ((scored + skipped) % 500 === 0) log(`${adapter}: ${scored + skipped + done.size} of ${rows.length} rows; kind ${(ms.kind.at(-1) ?? 0).toFixed(0)} ms`);
    }
    summary('done');
    log(`${adapter}: ${scored} rows scored, ${skipped} skipped, ${errors} errors, ${Math.round((Date.now() - t0) / 1000)} s`);
    return 0;
  } catch (error) {
    if (error instanceof Paused) { summary('paused', error.reason); return 75; }
    summary('failed', error instanceof Error ? error.message : String(error)); throw error;
  } finally { clearInterval(watch); await sup.close(); for (const [s, h] of handlers) process.off(s, h); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) scoreMain(process.argv.slice(2)).then(c => { process.exitCode = c; }).catch(e => { console.error(e instanceof Error ? e.stack ?? e.message : e); process.exitCode = 1; });
