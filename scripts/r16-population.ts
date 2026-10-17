// Stage R16 (docs/staging/r16-prereg.md §7, §10 to §13, §17): the population runs on the R15 path and their readings.
//
//   run --label L --seed S --days N --adapter A --root FT --out DIR [--unit P|F] [--certain FILE]      a registered run (model), or its resume
//   run --label dry-... --seed 48 --days 1 --arm fake [--faults JSON] [--fake-python FILE --adapter A --root FT] --out DIR   a dry run, no model
//   replay DIR [--card CARDDIR]                         every call from the journal (no model): day hashes, receipts, rows; the R7 arm file and the new readouts
//   card --seed S --days N --out CARDDIR [--unit P|F] [--arms a,b] [--burn-in 30]     the no-model arms of §7 (controls, rules, imitator, planted, half), K3
//   learner-census DIR                                  the census of a run's own kind asks (from its saved contexts)
//   learner-labels DIR --selection FILE                 the labels at the selected asks, in a replay with a read-only hook (A0)
//   relabel-r14 RUN --out DIR [--days N]                R14's completed learner run replayed, its development animals' asks relabelled for the R15 contract (H-S, §6)
//   k1 MODELRUN RULESRUN --out FILE                     the new readouts on stage R13's finished runs (K1)
//
// Exit codes: 0 done, 2 refused, 3 a scientific stop (the stop check, a certain failure), 75 paused (a person resumes it), 130 interrupted.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { KernelRequest } from '../src/kernel/types';
import { buildRequest } from '../src/sim/request';
import { index } from '../src/sim/state';
import type { Chimp, DecisionContext, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { R15Worker } from '../server/r15-worker';
import { focalSet } from './em-loop';
import { packetOf } from './lib/r11-packets';
import { writeAtomic } from './lib/checkpoint';
import { newDecoder, type HarnessDecode } from './lib/decoder';
import { replayRun } from './lib/r10-read';
import { DAY, meterStart, readCkpt, readLines, stopCheck, writeCkpt, type Row, type Tap } from './lib/r10-run';
import { traceRun } from './lib/r14-trace';
import { assertR15AdapterManifest } from './lib/r15-training';
import { armReaders } from './r7-card';
import { CONTROL_NAMES, KERNEL_ARMS, kernelArmWorld, runControlArm, runKernelArm } from './lib/r16-arms';
import { burnIn, censusEntry, censusId, dayName, labelAt, LOOP_SWITCHES, paramsSha, PLANS, R15_SWITCHES, R16, r16Params, readJsonl, select, selectionDigest, type CensusEntry, type R16Row, type Selected } from './lib/r16-collect';
import { readoutTap } from './lib/r16-readouts';
import { certainFailure, DayFiles16, readRegistry16, replay16, runDay16, setAside16, Stopped16, writeRegistry16, RECEIPT_SCHEMA, RUN_TOOL, type Arm16, type Certain, type Engine16, type Registry16 } from './lib/r16-run';
import { FakeWorker, OPS, Paused, quietRefusal, Supervisor, type FakeFaults, type Ops, type WorkerLike } from './lib/r16-worker';
import { wordsOf } from './lib/r16-strata';


const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a: string[]) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
class Refused extends Error {}
const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const NAME = 'rules-taught model on the R15 menu (the rules\' activity kinds, then the trees and waters the animal itself perceives or remembers; taught by the rules\' activity odds and their counterfactual valuation of those targets)';
const DECODE: HarnessDecode = { mode: 'draw', salt: 1, hold: 'act' };

/** The registered model runs (§10, §11, §12): label, world seed, adapter, days allowed, unit. Nothing else runs with a real adapter. */
export const REGISTERED: { label: string; seed: number; adapter: string; days: number[]; unit: 'P' | 'F' }[] = [
  { label: 'rollout-s48', seed: 48, adapter: 'r16-zero-s7', days: [10, 8, 7], unit: 'P' },
  { label: 'rollout-s7', seed: 7, adapter: 'r16-zero-s11', days: [10, 8, 7], unit: 'P' },
  ...R16.focalSeeds.flatMap(s => ['r16-agg-s7', 'r16-agg-s11'].map(a => ({ label: `focal-${a.slice(4)}-s${s}`, seed: s, adapter: a, days: [5], unit: 'F' as const }))),
  { label: 'population-s3701', seed: 3701, adapter: 'r16-agg-s7', days: [20], unit: 'P' },
  { label: 'population-s3187', seed: 3187, adapter: 'r16-agg-s11', days: [20], unit: 'P' },
];
/** Why a run may not start or resume, or ''. Pure. */
export function runRefusal(x: { label: string; seed: number; days: number; arm: 'model' | 'fake'; adapter: string | null; unit: 'P' | 'F'; burnInDays: number; fakePython: boolean }): string {
  if (R16.refused.includes(x.seed)) return `seed ${x.seed} is not this stage's to run (docs/staging/r16-prereg.md §3)`;
  if (x.arm === 'fake' || x.fakePython) return x.seed === 48 && x.days <= 2 && x.label.startsWith('dry-') ? '' : 'a dry run: seed 48, at most two days, a label beginning dry-';
  const r = REGISTERED.find(k => k.label === x.label);
  if (!r) return `no registered run is labelled ${x.label}`;
  if (r.seed !== x.seed || r.adapter !== x.adapter || !r.days.includes(x.days) || r.unit !== x.unit || x.burnInDays !== R16.burnInDays) return `the registered run ${x.label} is seed ${r.seed}, adapter ${r.adapter}, ${r.days.join(' or ')} days, unit ${r.unit}, a ${R16.burnInDays}-day burn-in`;
  return '';
}

interface Args { pos: string[]; flag(k: string, d?: string): string; has(k: string): boolean }
function args(argv: string[]): Args {
  const pos: string[] = [], flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { const k = argv[i].slice(2), v = argv[i + 1]; if (v === undefined || v.startsWith('--')) flags.set(k, 'true'); else { flags.set(k, v); i++; } } else pos.push(argv[i]); }
  return { pos, flag: (k, d = '') => flags.get(k) ?? d, has: k => flags.has(k) };
}
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const frozenRefusal = (): string => {
  if (git('status', '--porcelain')) return 'the tree is not clean: model runs go from a committed, clean checkout';
  if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'HEAD') return 'model runs go from a frozen detached checkout';
  return '';
};

// ---------------------------------------------------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------------------------------------------------

/** The worker factory: the R15 worker under the chain's lock (or a fake python for the dry chain), or an in-process fake. */
function workerFactory(a: Args, arm: Arm16, ops: Ops): (id: number) => Promise<WorkerLike> {
  if (arm.kind === 'fake' && !a.has('fake-python')) {
    const faults: FakeFaults = a.has('faults') ? JSON.parse(a.flag('faults')) as FakeFaults : {};
    return id => FakeWorker.make(faults, id);
  }
  const token = process.env.MGOGO_MODEL_LOCK_TOKEN ?? '';
  if (!token) throw new Refused('a run with a worker needs the chain\'s lock token (MGOGO_MODEL_LOCK_TOKEN): it runs only under scripts/r16.py');
  return async () => {
    const w = new R15Worker({ trainingRoot: arm.root!, adapter: arm.adapter!, chainLock: { token }, ...(a.has('fake-python') ? { python: resolve(a.flag('fake-python')) } : {}) }, { scoreMs: ops.callMs, startupMs: ops.warmMs });
    try { await w.start(); } catch (error) { await w.close(); throw error; }
    assertR15AdapterManifest(w.manifest);
    if ((w.ready.adapters as Record<string, unknown>)[arm.adapter!] !== w.manifest.adapter_sha256) { await w.close(); throw new Error('the worker did not load the registered adapter'); }
    return { score: b => w.score(b), close: () => w.close(), status: () => w.status(), pid: () => w.pid() };
  };
}

async function run(a: Args): Promise<number> {
  const out = resolve(a.flag('out')), resume = existsSync(resolve(out, 'run.json'));
  if (!a.flag('out')) throw new Refused('--out DIR');
  let reg: Registry16;
  const opsFlag = a.has('ops') ? JSON.parse(a.flag('ops')) as Partial<Ops> : {};
  if (resume) {
    reg = readRegistry16(out);
    if (reg.state === 'done') { log(`${reg.label}: done; nothing to resume`); return 0; }
    if (reg.state === 'stopped') { log(`${reg.label}: stopped (${reg.reason}); a scientifically stopped run is never resumed`); return 3; }
  } else {
    const seed = +a.flag('seed', 'NaN'), days = +a.flag('days', 'NaN'), label = a.flag('label'), unit = (a.flag('unit', 'P') as 'P' | 'F'), burnInDays = +a.flag('burn-in', String(R16.burnInDays));
    const kind = a.flag('arm', 'model') === 'fake' ? 'fake' : 'model', adapter = a.flag('adapter') || null, root = a.flag('root') ? resolve(a.flag('root')) : null;
    const refusal = runRefusal({ label, seed, days, arm: kind, adapter, unit, burnInDays, fakePython: a.has('fake-python') });
    if (refusal) throw new Refused(refusal);
    if (kind === 'model' && !a.has('fake-python')) { const f = frozenRefusal(); if (f) throw new Refused(f); }
    let adapterSha: string | null = null;
    if (adapter && root) { const m = JSON.parse(readFileSync(resolve(root, 'adapters', adapter, 'manifest.json'), 'utf8')) as Record<string, unknown>; assertR15AdapterManifest(m); adapterSha = String(m.adapter_sha256); }
    else if (kind === 'model') throw new Refused('a model run needs --adapter and --root');
    const t0 = Date.now(), base = burnIn(seed, true, burnInDays), burnInHash = worldHash(base), w = kernelArmWorld(base, 0);
    const focal = unit === 'F' ? focalSet(w).map(f => f.id) : null;
    const e: Engine16 = { world: w, day: 0, meter: meterStart(w) };
    mkdirSync(out, { recursive: true });
    writeCkpt(resolve(out, 'ckpt', 'start.json.gz'), e as never);
    reg = { tool: RUN_TOOL, version: 1, stage: 'R16', receiptSchema: RECEIPT_SCHEMA, label, name: NAME, created: new Date().toISOString(), updated: '', state: 'running', reason: '', ended: '',
      seed, unit, focal, daysAsked: days, burnInDays, params: R16.paramsFile, paramsSha256: paramsSha(), switches: { ...LOOP_SWITCHES, ...R15_SWITCHES, kernelGate: 1, kernelNoRulesPick: 0 },
      arm: { kind: a.has('fake-python') ? 'fake' : kind, adapter, root, adapterSha256: adapterSha, decode: DECODE, worldSalt: 0 }, commit: git('rev-parse', 'HEAD'), minAge: 8, under: 'animals under 8 years stay on the rules',
      burnInHash, startHash: worldHash(w), segments: [], days: [], stopCheck: null, certain: a.has('certain') ? JSON.parse(readFileSync(a.flag('certain'), 'utf8')) as Certain : null, certainStop: null, supervisor: null, events: [] };
    writeRegistry16(out, reg);
    log(`${label}: burn-in ${burnInDays} days in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; ${focal ? `${focal.length} focal animals` : 'every animal aged 8 and over'} on the R15 path`);
  }
  // resume or first start: the newest whole checkpoint, later files set aside with their journalled calls
  const days = reg.daysAsked, ck = (() => { for (let d = reg.days.length; d >= 1; d--) { const f = resolve(out, 'ckpt', `${dayName(d)}.json.gz`); if (existsSync(f)) return { d, f }; } return { d: 0, f: resolve(out, 'ckpt', 'start.json.gz') }; })();
  const got = readCkpt(ck.f), e: Engine16 = { world: got.world, day: got.day, meter: got.meter, ...(got.dec ? { dec: got.dec } : {}) };
  reg.days = reg.days.slice(0, e.day);
  const aside = setAside16(out, e.day, reg.segments.length + 1);
  reg.segments.push({ started: new Date().toISOString(), fromDay: e.day, pid: process.pid, journalCalls: aside.journal.size, setAside: aside.moved });
  reg.state = 'running'; reg.reason = '';
  writeRegistry16(out, reg);
  const ops = { ...OPS, ...opsFlag } as Ops, arm = reg.arm, focal = reg.focal ? new Set(reg.focal) : null;
  const dry = arm.kind === 'fake' || a.has('fake-python');
  const sup = new Supervisor({ make: workerFactory(a, arm, ops), adapter: arm.adapter ?? 'fake', ops, quiet: () => dry ? '' : quietRefusal({ out }), log });
  let stop = '';
  const onSignal = (sig: string) => () => { stop ||= `interrupted by ${sig}`; };
  const handlers: [NodeJS.Signals, () => void][] = (['SIGINT', 'SIGTERM', 'SIGHUP'] as NodeJS.Signals[]).map(s => [s, onSignal(s)]);
  for (const [s, h] of handlers) process.on(s, h);
  const finish = async (state: Registry16['state'], reason: string, code: number): Promise<number> => {
    await sup.close(); reg.state = state; reg.reason = reason; reg.ended = new Date().toISOString(); reg.supervisor = sup.stats; writeRegistry16(out, reg);
    for (const [s, h] of handlers) process.off(s, h);
    log(`${reg.label}: ${state}${reason ? ` (${reason})` : ''}`);
    return code;
  };
  try {
    if (!dry) { const q = quietRefusal({ out }); if (q) return await finish('paused', `the machine is not quiet: ${q}`, 75); }
    await sup.start();
    const decoder = newDecoder(arm.decode, e.dec);
    let journal = aside.journal;
    for (let d = e.day + 1; d <= days; d++) {
      sup.newDay();
      const files = new DayFiles16(out, d);
      let res: Awaited<ReturnType<typeof runDay16>>;
      try {
        res = await runDay16(e, { ask: async (_req: KernelRequest, packet) => sup.ask(packet), decoder, journal, minAge: reg.minAge, sink: files, stop: () => stop,
          ...(focal ? { driven: (c: Chimp) => c.alive && focal.has(c.id) } : {}), counters: () => ({ stalls: sup.stats.stalls, retries: sup.stats.retries, warmups: sup.stats.warmups.length }) });
      } catch (error) {
        files.close(null);
        if (error instanceof Stopped16) return await finish('interrupted', error.reason, 130);
        if (error instanceof Paused) return await finish('paused', error.reason, 75);
        throw error;
      }
      files.close(res.rows);
      writeCkpt(resolve(out, 'ckpt', `${dayName(d)}.json.gz`), e as never);
      journal = new Map();
      reg.days.push(res.summary); reg.supervisor = sup.stats; writeRegistry16(out, reg);
      const s = res.summary;
      log(`${reg.label} day ${d}/${days}: ${s.asks} asks, ${s.calls} calls (${s.targetCalls} target), ${s.reused} from the journal, kind ${(s.msKind ?? 0).toFixed(0)} ms, target ${(s.msTarget ?? 0).toFixed(0)} ms, fallbacks ${JSON.stringify(s.fallbacks)}, stalls ${s.stalls}, deaths ${s.deaths.length}, nights ${s.nights[0]}/${s.nights[1]}, ${s.wallSeconds} s`);
      if (d === 5) {
        const rows = reg.days.flatMap(x => readLines<Row>(resolve(out, 'rows', `${dayName(x.day)}.jsonl`)));
        reg.stopCheck = stopCheck(rows, reg.days); writeRegistry16(out, reg);
        if (reg.stopCheck.stop) return await finish('stopped', `the stop check after day 5: ${reg.stopCheck.reasons.join('; ')}`, 3);
      }
      if (reg.certain && d >= reg.certain.fromDay) {
        const rows = reg.days.flatMap(x => readLines<Row>(resolve(out, 'rows', `${dayName(x.day)}.jsonl`)));
        const why = certainFailure(rows, reg.days, reg.certain);
        if (why) { reg.certainStop = why; return await finish('stopped', why, 3); }
      }
      if (sup.stats.stallsToday >= ops.stallsPerDay) return await finish('paused', `${sup.stats.stallsToday} stalls in simulated day ${d}`, 75);
      if (d < days) {
        try { sup.checkAllowance(); await sup.recycleIfDegraded(); } catch (error) { if (error instanceof Paused) return await finish('paused', error.reason, 75); throw error; }
      }
      if (stop) return await finish('interrupted', stop, 130);
    }
    return await finish('done', '', 0);
  } catch (error) {
    if (error instanceof Paused) return await finish('paused', error.reason, 75);
    await finish('interrupted', error instanceof Error ? error.message : String(error), 1);
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// replay: the run read by stage R7's readers and the new readouts (no model)
// ---------------------------------------------------------------------------------------------------------------------

function r7Tap16(reg: Registry16, days: number): Tap {
  let readers: ReturnType<typeof armReaders> | null = null, focal: { id: number; cls: string }[] = [], living = 0;
  return { name: 'r7', start(w) { focal = focalSet(w); living = w.chimps.filter(c => c.alive).length; readers = armReaders(w, reg.unit, days, reg.unit === 'F' ? reg.focal! : focal.map(f => f.id)); },
    before() { readers?.before(); }, tick() { readers?.after(); },
    end(w) { return { focal, rgMinAge: 8, living: { start: living, end: w.chimps.filter(c => c.alive).length, driven: w.chimps.filter(c => c.alive && c.age >= 8).length }, ...readers!.finish(r16Params(true)) }; } };
}
async function replay(a: Args): Promise<number> {
  const out = resolve(a.pos[0] ?? ''), reg = readRegistry16(out), days = reg.days.length;
  const taps: Tap[] = [r7Tap16(reg, days), readoutTap(8, reg.focal ?? undefined) as unknown as Tap];
  const r = await replay16(out, { taps, log });
  writeAtomic(resolve(out, 'replay.json'), JSON.stringify({ ok: r.ok, hashes: r.hashes, linesDiffer: r.linesDiffer, rowsDiffer: r.rowsDiffer, seconds: r.seconds, readouts: r.taps.r16 }, null, 1) + '\n');
  if (!r.ok) { log(`THE JOURNAL DOES NOT REPRODUCE THE RUN (${r.hashes.filter(h => h.run === h.replay).length} of ${r.hashes.length} day hashes, ${r.linesDiffer} lines, ${r.rowsDiffer} row files differ)`); return 1; }
  if (a.has('card')) {
    const card = r.taps.r7 as Record<string, unknown>, dir = resolve(a.flag('card'), reg.unit, `s${reg.seed}`);
    mkdirSync(dir, { recursive: true });
    writeAtomic(resolve(dir, `${reg.label}.json`), JSON.stringify({ stage: 'r7-card', unit: reg.unit, seed: reg.seed, arm: reg.label, spec: { engine: reg.name, adapter: reg.arm.adapter, decode: reg.arm.decode, run: out },
      burnIn: reg.burnInDays, days, paramsFile: reg.params, head: git('rev-parse', '--short', 'HEAD'), dirty: false, burnInHash: reg.burnInHash, startHash: reg.startHash, endHash: r.hashes.at(-1)?.replay ?? reg.startHash, seconds: r.seconds,
      deaths: reg.days.flatMap(d => d.deaths).map(d => ({ id: d.id, cause: d.cause, focal: false })), ...card, r16: r.taps.r16, ledger: reg.days.map(d => d.ledger) }) + '\n');
  }
  log(`${reg.label}: the journal reproduces the run (${r.hashes.length} day hashes, every receipt and row); ${r.seconds} s`);
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// card: the no-model arms of §7 on one world (K3, the paired rules arm, R7's controls, imitator, planted, half)
// ---------------------------------------------------------------------------------------------------------------------

async function card(a: Args): Promise<number> {
  const seed = +a.flag('seed', 'NaN'), days = +a.flag('days', 'NaN'), unit = a.flag('unit', 'P') as 'P' | 'F', out = resolve(a.flag('out')), burnInDays = +a.flag('burn-in', String(R16.burnInDays));
  if (!Number.isInteger(seed) || !Number.isInteger(days)) throw new Refused('card --seed S --days N --out DIR');
  if (R16.refused.includes(seed) && !a.has('dry')) throw new Refused(`seed ${seed} is not this stage's to run`);
  const dir = resolve(out, unit, `s${seed}`); mkdirSync(dir, { recursive: true });
  const t0 = Date.now(), plain = burnIn(seed, false, burnInDays), switched = burnIn(seed, true, burnInDays);
  const k3 = { plain: worldHash(plain), switched: worldHash(switched) };
  writeAtomic(resolve(dir, 'k3.json'), JSON.stringify({ seed, burnInDays, ...k3, equal: k3.plain === k3.switched, seconds: Math.round((Date.now() - t0) / 1000) }, null, 1) + '\n');
  log(`seed ${seed}: K3 ${k3.plain === k3.switched ? 'holds' : 'FAILS'} (plain ${k3.plain}, switched ${k3.switched})`);
  const wanted = a.flag('arms') ? a.flag('arms').split(',') : [...CONTROL_NAMES, 'paired-rules', ...(unit === 'P' ? Object.keys(KERNEL_ARMS) : [])];
  for (const name of wanted) {
    const file = resolve(dir, `${name}.json`);
    if (existsSync(file)) { log(`${name}: on file`); continue; }
    if (CONTROL_NAMES.includes(name)) {
      if (unit === 'F') {
        const { runArm, ARMS } = await import('./r7-card');
        const r = runArm(plain, name === 'rules-plain' ? { share: null, salt: 0 } : ARMS[name], 'F', days, focalSet(plain), r16Params(false));
        writeAtomic(file, JSON.stringify({ stage: 'r7-card', unit, seed, arm: name, burnIn: burnInDays, days, burnInHash: k3.plain, ...r }) + '\n');
      } else {
        const r = runControlArm(plain, name, days, r16Params(false), s => log(`  ${name} ${s}`));
        writeAtomic(file, JSON.stringify({ stage: 'r7-card', unit, seed, arm: name, spec: name, burnIn: burnInDays, days, burnInHash: k3.plain, ...r.file, r16: { result: r.readouts, summary: r.summary } }) + '\n');
      }
    } else if (name === 'paired-rules') {
      // the plain rules world continued with no salt through stage R16's runner (no kernel), read as a model run is read: the exact check of §12.2
      const w = structuredClone(switched), e: Engine16 = { world: w, day: 0, meter: meterStart(w) }, focal = focalSet(w);
      const readers = armReaders(w, unit, days, unit === 'F' ? focal.map(f => f.id) : focal.map(f => f.id)), ro = readoutTap(8, unit === 'F' ? focal.map(f => f.id) : undefined);
      ro.start(w);
      const tap = { name: 'x', before() { readers.before(); }, tick(world: World) { readers.after(); ro.tick(world); }, end() { return null; } } as unknown as Tap;
      for (let d = 1; d <= days; d++) await runDay16(e, { ask: null, decoder: newDecoder(DECODE), journal: new Map(), taps: [tap] });
      const f = readers.finish(r16Params(true));
      writeAtomic(file, JSON.stringify({ stage: 'r7-card', unit, seed, arm: name, burnIn: burnInDays, days, burnInHash: k3.switched, endHash: worldHash(w), ...f, r16: ro.end() }) + '\n');
    } else if (KERNEL_ARMS[name]) {
      const r = await runKernelArm(switched, name, days, r16Params(true), s => log(`  ${s}`));
      writeAtomic(file, JSON.stringify({ stage: 'r7-card', unit, seed, arm: name, spec: KERNEL_ARMS[name], burnIn: burnInDays, days, burnInHash: k3.switched, startHash: r.startHash, endHash: r.endHash, seconds: r.seconds, deaths: r.deaths, card: r.card, rows: r.rows, r16: { result: r.readouts, summary: r.summary }, asks: r.asks, calls: r.calls }) + '\n');
    } else throw new Refused(`unknown arm ${name}`);
    log(`${name}: written (${Math.round((Date.now() - t0) / 1000)} s since the start)`);
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// The learner's own states: census from the saved kind contexts, labels in a replay with a read-only hook (§10, A0)
// ---------------------------------------------------------------------------------------------------------------------

interface SavedContext { key: string; tick: number; t: number; id: number; v: number; day: number; ctx: string; context: DecisionContext; sizes?: number[] }
function savedContexts(out: string, day: number): SavedContext[] {
  const gz = resolve(out, 'contexts', `${dayName(day)}.jsonl.gz`);
  return existsSync(gz) ? gunzipSync(readFileSync(gz)).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as SavedContext) : readLines<SavedContext>(resolve(out, 'contexts', `${dayName(day)}.jsonl`));
}
function learnerCensus(a: Args): number {
  const out = resolve(a.pos[0] ?? ''), reg = readRegistry16(out), entries: CensusEntry[] = [];
  for (const d of reg.days) for (const x of savedContexts(out, d.day)) {
    if (x.context.resourceChoice !== 'kind') continue;
    const sizes = x.sizes ?? [];
    entries.push(censusEntry(reg.seed, 'learner', x.tick, d.day, x.id, x.v, { context: x.context, groups: sizes.map(n => Array.from({ length: n })) as never }));
  }
  const file = resolve(out, 'census.jsonl');
  writeAtomic(file, entries.map(x => JSON.stringify(x)).join('\n') + '\n');
  log(`${reg.label}: ${entries.length} kind asks in the census of the learner's own states`);
  return 0;
}
async function learnerLabels(a: Args): Promise<number> {
  const out = resolve(a.pos[0] ?? ''), reg = readRegistry16(out), sel = readJsonl<Selected>(resolve(a.flag('selection'))), dest = resolve(a.flag('labels-out', resolve(out, 'labels.jsonl')));
  if (existsSync(dest)) { log(`${dest} is on file`); return 0; }
  const want = new Map(sel.map(s => [s.id, s])), rows: R16Row[] = [], exclusions: Record<string, number> = {}, pending = new Map<string, R16Row>();
  let labelled = 0, targetChecks = 0, targetEqual = 0;
  const r = await replay16(out, { log, onKindAsk: (w, c, request) => {
    const id = censusId('learner', reg.seed, w.tick, c.id, request.context.version), s = want.get(id);
    if (!s) return;
    labelled++;
    const got = labelAt(w, c, request, s);
    rows.push(...got.rows);
    for (const x of got.exclusions) exclusions[`${s.split}:${s.via}:${x}`] = (exclusions[`${s.split}:${s.via}:${x}`] ?? 0) + 1;
    const t = got.rows.find(x => x.phase === 'target');
    if (t) pending.set(`${c.id}:${request.context.version}`, t);
  }, onTargetAsk: (_w, c, request, _key, packetHash) => {
    const t = pending.get(`${c.id}:${request.context.version}`);
    if (!t || t.context.resourceKinds?.[0] !== request.context.resourceKinds?.[0]) return;
    targetChecks++; if (t.packetHash === packetHash) targetEqual++;
  } });
  const meta = { stage: 'R16', tool: 'r16-learner-labels', run: out, seed: reg.seed, selection: selectionDigest(sel), selected: sel.length, labelled, rows: rows.length, exclusions,
    replay: { ok: r.ok, hashes: r.hashes.length, equal: r.hashes.filter(h => h.run === h.replay).length, linesDiffer: r.linesDiffer, rowsDiffer: r.rowsDiffer },
    kindPacketsEqualJournal: r.ok ? labelled : 0, targetPacketChecks: targetChecks, targetPacketsEqual: targetEqual };
  if (!r.ok || labelled !== sel.length || targetEqual !== targetChecks) { writeAtomic(`${dest}.failed.json`, JSON.stringify(meta, null, 1) + '\n'); log(`A0 FAILS: ${JSON.stringify(meta.replay)}, ${labelled}/${sel.length} labelled, ${targetEqual}/${targetChecks} target packets equal`); return 1; }
  writeAtomic(dest, rows.map(x => JSON.stringify(x)).join('\n') + '\n'); writeAtomic(`${dest}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
  log(`${reg.label}: ${labelled} asks labelled, ${rows.length} rows; the replay lands on every day hash`);
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// H-S: R14's completed learner runs, relabelled for the R15 contract (§6; evaluation only)
// ---------------------------------------------------------------------------------------------------------------------

/** The R15 kind request at an ask of a P5b learner world, built on a copy with the R15 switches set (the copy's own observation). */
export function switchedRequest(w: World, chimpId: number): { world: World; chimp: Chimp; request: KernelRequest } {
  const copy = structuredClone(w), settings = (copy as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...R15_SWITCHES };
  const chimp = index(copy).byId.get(chimpId)!;
  return { world: copy, chimp, request: buildRequest(copy, chimp) };
}
async function relabelR14(a: Args): Promise<number> {
  const runDir = resolve(a.pos[0] ?? ''), out = resolve(a.flag('out'));
  const reg = JSON.parse(readFileSync(resolve(runDir, 'run.json'), 'utf8')) as { seed: number; arm: string; days: unknown[]; state: string; label: string };
  if (/s21|learner-s21/.test(runDir) || reg.seed === 21) throw new Refused('R14\'s partial seed-21 run is never read (Codex\'s ruling of 13 October)');
  if (![48, 7].includes(reg.seed) || reg.days.length !== 10 || reg.state !== 'done' || !reg.arm.startsWith('r14-source-')) throw new Refused('H-S reads R14\'s two completed ten-day learner runs only');
  mkdirSync(out, { recursive: true });
  const census: CensusEntry[] = [];
  const first = await traceRun(runDir, { log, onAsk: (w, c, request) => {
    if (request.options.length < 2) return;
    const words = wordsOf(packetOf('p5b', request.context));
    census.push(censusEntry(reg.seed, 'sibling', w.tick, Math.floor(w.time / 24) - R16.burnInDays + 1, c.id, request.context.version, null, words));
  } });
  if (!first.ok) { writeAtomic(resolve(out, 'hs.failed.json'), JSON.stringify({ hashes: first.hashes, ok: false }, null, 1) + '\n'); log('H-S dropped: the replay under R16\'s source does not land on R14\'s day hashes'); return 0; }
  const sel = select(census, PLANS.evalLearner), want = new Map(sel.map(s => [s.id, s])), rows: R16Row[] = [], exclusions: Record<string, number> = {};
  let built = 0;
  const second = await traceRun(runDir, { onAsk: (w, c, request) => {
    const s = want.get(censusId('sibling', reg.seed, w.tick, c.id, request.context.version));
    if (!s) return;
    const sw = switchedRequest(w, c.id);
    if (sw.request.context.resourceChoice !== 'kind') { exclusions.noKindRequest = (exclusions.noKindRequest ?? 0) + 1; return; }
    built++;
    const got = labelAt(sw.world, sw.chimp, sw.request, { ...s, words: s.words });
    rows.push(...got.rows.map(r => ({ ...r, r16: { ...r.r16, words: wordsOf(r.packet) } })));
    for (const x of got.exclusions) exclusions[`${s.via}:${x}`] = (exclusions[`${s.via}:${x}`] ?? 0) + 1;
  } });
  const meta = { stage: 'R16', tool: 'r16-hs', run: runDir, runLabel: reg.label, seed: reg.seed, replay: { first: first.ok, second: second.ok, hashes: second.hashes.length }, census: census.length, selected: sel.length, built, rows: rows.length, exclusions,
    limits: 'in-sample (the training worlds, days 30 to 40), development animals only, states a P5b-line learner reached; evaluation and description only, never training rows' };
  writeAtomic(resolve(out, 'hs.jsonl'), rows.map(x => JSON.stringify(x)).join('\n') + '\n'); writeAtomic(resolve(out, 'hs.meta.json'), JSON.stringify(meta, null, 1) + '\n');
  log(`H-S ${reg.label}: ${built} asks relabelled, ${rows.length} rows; replay ${second.ok ? 'exact' : 'NOT EXACT'}`);
  return second.ok ? 0 : 1;
}

// ---------------------------------------------------------------------------------------------------------------------
// K1: the new readouts on stage R13's finished runs (no model)
// ---------------------------------------------------------------------------------------------------------------------

async function k1(a: Args): Promise<number> {
  const [model, rules] = a.pos.map(p => resolve(p)), out = resolve(a.flag('out'));
  const read = async (root: string) => { const tap = readoutTap(8); const r = await replayRun(root, { taps: [tap as unknown as Tap], field: false }); return { ok: r.ok, summary: (r.taps.r16 as { summary: Record<string, number | null> }).summary }; };
  const m = await read(model), r = await read(rules);
  const checks = { shortNightsModel: m.summary.shortNights === 21, shortNightsRules: r.summary.shortNights === 0, eveningAlone: m.summary.shortByEveningAlone === 13, together: m.summary.shortTogether === 8,
    earlyRiseNightsRules: r.summary.earlyRiseNights === 224, earlyRiseNightsModel: m.summary.earlyRiseNights === 172,
    pantHootsModel: Math.abs((m.summary.pantHoots ?? 0) - 4.19) < 0.005, pantHootsRules: Math.abs((r.summary.pantHoots ?? 0) - 2.51) < 0.005,
    kcalEarlyDifference: Math.abs(((m.summary.kcalEarly ?? 0) - (r.summary.kcalEarly ?? 0)) + 84) < 1.5,
    nest0745ShareModel: Math.abs((m.summary.nest0745Share ?? 0) - 0.264) < 0.0006, nest0800ShareRules: r.summary.nest0800Share === 0 };
  writeAtomic(out, JSON.stringify({ stage: 'R16', check: 'K1', note: 'a code check: the cuts and the search were read off this very run (attack 1)', replay: { model: m.ok, rules: r.ok }, model: m.summary, rules: r.summary, checks, holds: m.ok && r.ok && Object.values(checks).every(Boolean) }, null, 1) + '\n');
  log(`K1: ${Object.entries(checks).map(([k, v]) => `${k} ${v ? 'yes' : 'NO'}`).join(', ')}`);
  return 0;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2), a = args(rest);
  if (cmd === 'run') return run(a);
  if (cmd === 'replay') return replay(a);
  if (cmd === 'card') return card(a);
  if (cmd === 'learner-census') return learnerCensus(a);
  if (cmd === 'learner-labels') return learnerLabels(a);
  if (cmd === 'relabel-r14') return relabelR14(a);
  if (cmd === 'k1') return k1(a);
  throw new Refused('usage: r16-population.ts run | replay | card | learner-census | learner-labels | relabel-r14 | k1');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error instanceof Refused ? `refused: ${error.message}` : error instanceof Error ? error.stack ?? error.message : error); process.exitCode = error instanceof Refused ? 2 : 1; });
void sha; void readdirSync;
