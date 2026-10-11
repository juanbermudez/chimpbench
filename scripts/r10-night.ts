// Stage R10 (docs/staging/r10-prereg.md): a whole population on one kernel for a night. One arm drives every animal
// aged 8 and over in every community (animals under 8 stay on the rules, and every output says so) on the working base
// with the switches of the gate test (the state-only packet, the rules' menu, the loop's intention gate per arm), after
// 30 days of burn-in on the rules, for N simulated days. scripts/r5-pilot.ts keeps its registered behaviour; this
// script shares its arms (ARMS, armWorld) and its guarded scorer, and the engine is scripts/lib/r10-run.ts.
//
//   pnpm exec tsx scripts/r10-night.ts run --seed 48 --arm trained-gate [--decode top] [--days 40] [--hours 10] [--out artifacts/r10/<label>]
//       [--label L] [--burn-in 30] [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--profile field|compressed]
//       [--timeout-s 120] [--device mps] [--no-contexts] [--no-stop-check] [--allow-dirty]
//   pnpm exec tsx scripts/r10-night.ts run --resume <out> [--days N] [--hours H]
//   pnpm exec tsx scripts/r10-night.ts replay <out> [--taps a.ts,b.ts] [--no-field]
//   pnpm exec tsx scripts/r10-night.ts status <out>
//   pnpm exec tsx scripts/r10-night.ts plain --seed 48 [--days 2] [--burn-in 30] [--profile field]   # createWorld and tickWorld only: the hashes a rules arm must end each day on
//
// Arms: rules | argmax-gate (the rules' top option through the loop, gate on: no model) | null-gate | trained-gate
// (r4-rules-state, gate on) and the other kernel arms of scripts/r5-pilot.ts. A model arm needs the runtime variables of
// HANDOFF.md §3 item 3 and MGOGO_FT_ROOT (the folder holding adapters/<name>); it refuses to start while another model
// process is running, and it is launched under `caffeinate -i` (it also holds its own `caffeinate -i -w <pid>`).
//
// A run survives a night: every kernel answer is journalled the moment it arrives, every tick's receipts are appended
// and flushed, a lossless checkpoint is written atomically at the end of every simulated day (the last two are kept),
// and --resume continues from the newest whole checkpoint, reusing the answers already journalled for the day that was
// in progress. Exit codes: 0 done, 2 refused, 3 stopped (the stop check after five days, the error limit, low disk),
// 130 interrupted. `replay` answers from the receipts with no model, must land on every day's hash, and reads the run
// through the field observer and the truth-row readouts (the short scorecard by value) and any --taps module (the hook
// for stage R7's timing card: a module whose default export is a function returning a Tap of scripts/lib/r10-run.ts).
// --crash-at-tick N kills the process with SIGKILL after N ticks of the window: a crash to test --resume against.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { hostname, loadavg } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import type { Kernel } from '../src/kernel/types';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { gitState, RESERVED_SEEDS } from './e-run';
import { Worker } from './ft-society';
import { writeAtomic } from './lib/checkpoint';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion, STATE_PACKET_VERSION } from './lib/packet-state';
import { decodedKernel, decodeRefusal, type DecodeMode } from './lib/r10-decode';
import { replayReport, replayRun } from './lib/r10-read';
import { DAY, DayFiles, dayName, diskRefusal, meterStart, MIN_AGE, newestCkpt, pruneCkpts, readCkpt, readLines, readRegistry, RECEIPT_SCHEMA, RunStopped, runDay, runningModelProcesses, setAside, STOP, stopCheck, swapUsedMB,
  UNDER_AGE, writeCkpt, writeRegistry, type Arrival, type DaySummary, type Engine, type Registry, type Row, type Tap } from './lib/r10-run';
import { ARMS, armWorld, GuardedScorer } from './r5-pilot';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** A path as printed: relative to the repo when inside it. */
const rel = (p: string) => { const r = relative(ROOT, p); return r.startsWith('..') ? p : r; };
/** The burned-in world of the pilot on seed 48 (docs/staging/r5-pilot-prereg.md, 7 October 2026): the same world is expected here. */
const PILOT_BURN_IN: Record<string, string> = { 'field:48:30': '4b5cc61f8ad797e0' };
const ENV_KEYS = ['MGOGO_GHN_ROOT', 'MGOGO_DECIDE_PYTHON', 'HF_HOME', 'HF_HUB_CACHE', 'MGOGO_FT_ROOT', 'MGOGO_FT_ADAPTERS', 'MGOGO_DECIDE_SERVER'];
const SWAP_HOLD_MB = 6144, SWAP_HOLD_MIN = 30; // as scripts/r5-chain.sh: no model load while swap in use is above 6 GB, re-checked every minute for up to 30 minutes

class Refused extends Error {}
const now = () => new Date().toISOString();
const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** The name a result of this arm must carry (IMPLEMENTATION_PLAN.md, "Names every result must use from now on"). */
export function resultName(kernel: string, adapter: string | null): string {
  if (kernel === 'rules') return 'the rules';
  if (kernel === 'argmax') return 'the rules\' top option through the loop (no model)';
  if (kernel === 'null') return 'random choice on a rules menu (no model)';
  if (adapter === 'base') return 'untuned model on a rules menu';
  return /^r4[bc]?-rules-state$/.test(adapter ?? '') ? 'rules-taught model on a rules menu' : `model with adapter ${adapter} on a rules menu (state its label source)`;
}
const seedRole = (seed: number) => seed === 48 || seed === 7 ? 'a training seed of the rules-taught adapters (48 and 7)' : seed === 21 || seed === 5 ? 'a held-out seed read in stages R4 to R5-gate (not fresh)' : 'a development seed';

/** The world after the burn-in on the rules, from a shared cache file or made now. */
function burnedIn(seed: number, profile: 'field' | 'compressed', params: Record<string, number>, burnInDays: number, cache: string, log: (s: string) => void): World {
  if (existsSync(cache)) return JSON.parse(gunzipSync(readFileSync(cache)).toString('utf8')) as World;
  const t0 = Date.now(), w = createWorld(seed, { profile, params });
  for (let i = 0; i < burnInDays * DAY; i++) tickWorld(w);
  mkdirSync(dirname(cache), { recursive: true });
  writeAtomic(cache, gzipSync(Buffer.from(JSON.stringify(w)), { level: 1 }));
  log(`burn-in: ${burnInDays} days on the rules in ${Math.round((Date.now() - t0) / 1000)} s (kept at ${rel(cache)})`);
  return w;
}

function progressLine(reg: Registry, s: DaySummary, startedMs: number, hours: number | null): string {
  const fb = Object.entries(s.fallbacks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '), last = reg.days.slice(-3), pace = last.reduce((a, d) => a + d.wallSeconds, 0) / last.length;
  const left = reg.daysAsked - s.day, eta = new Date(Date.now() + left * pace * 1000);
  const fit = hours === null ? '' : `; ${Math.max(0, Math.floor((hours * 3600 - (Date.now() - startedMs) / 1000) / (pace * 1.1)))} more days fit the ${hours} h`;
  const per = s.asks ? `${s.msMean === null ? 'no new call' : `${(s.msMean / 1000).toFixed(2)} s an ask (median ${((s.msMedian ?? 0) / 1000).toFixed(2)}, 95th ${((s.msP95 ?? 0) / 1000).toFixed(2)})`}` : 'no asks';
  return `day ${s.day}/${reg.daysAsked} (simulated day ${reg.burnInDays + s.day}): ${s.asks} asks, ${per}, kernel settled ${s.kernel}, the rules ${s.asks - s.kernel}${fb ? ` (${fb})` : ''}, gate held ${s.held}${s.reused ? `, ${s.reused} answers reused from the journal` : ''}, `
    + `timeouts ${s.timeouts}, deaths ${s.deaths.length}${s.deaths.length ? ` (${s.deaths.map(d => `${d.name} ${d.cause ?? 'unknown'}`).join(', ')})` : ''}, living ${s.living} (${s.driven} on the kernel; ${s.under} under ${reg.minAge} on the rules), `
    + `day took ${(s.wallSeconds / 60).toFixed(1)} min (kernel ${(s.kernelSeconds / 60).toFixed(1)}), rss ${s.rssMB} MB, hash ${s.hash}; at this pace day ${reg.daysAsked} ends ${clock(eta)}${fit}`;
}

type Args = { pos: string[]; flag: (k: string, d?: string) => string; has: (k: string) => boolean };
const BOOL = new Set(['--no-contexts', '--no-stop-check', '--allow-dirty', '--no-field', '--caffeinate', '--no-caffeinate']);
function parseArgs(argv: string[]): Args {
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && !BOOL.has(argv[i])) i++; } else pos.push(argv[i]); }
  return { pos, flag: (k, d = '') => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; }, has: k => argv.includes(`--${k}`) };
}

async function run(a: Args): Promise<number> {
  const log = (s: string) => console.log(`[${clock(new Date())}] ${s}`);
  const resuming = a.has('resume'), g = gitState(ROOT), startedMs = Date.now();
  let reg: Registry, out: string;
  if (resuming) {
    out = resolve(a.flag('resume'));
    reg = readRegistry(out);
    if (g.commit !== reg.commit) throw new Refused(`the checkout is at ${g.commit.slice(0, 10)}, the run was started at ${reg.commit.slice(0, 10)}: resume it from a checkout of that commit`);
    if (g.dirty.length && !(reg.dirty && a.has('allow-dirty'))) throw new Refused(`the tree is not clean (${g.dirty.length} entries, e.g. ${g.dirty.slice(0, 3).join('; ')}): a run resumes only from the committed code it started on`);
    if (reg.state === 'running') log(`the registry says "running": the last process ended without closing it (a crash or a kill); resuming`);
    if (a.has('days')) reg.daysAsked = +a.flag('days');
    reg.hours = a.has('hours') ? +a.flag('hours') : null;
  } else {
    const arm = a.flag('arm', 'rules'), spec = ARMS[arm], seed = +a.flag('seed', 'NaN'), profile = a.flag('profile', 'field'), decode = a.flag('decode', 'top');
    if (!spec) throw new Refused(`unknown arm "${arm}"; known: ${Object.keys(ARMS).filter(k => !ARMS[k].redraw).join(', ')}`);
    if (spec.redraw) throw new Refused(`arm "${arm}" is a re-draw of the rules: not an arm of this script`);
    if (!Number.isInteger(seed) || seed < 0) throw new Refused('--seed N is required (a non-negative integer)');
    if (RESERVED_SEEDS.has(seed)) throw new Refused(`seed ${seed} is a reserved or retired seed (AGENTS.md): development seeds only`);
    if (profile !== 'field' && profile !== 'compressed') throw new Refused('--profile field | compressed');
    const why = decodeRefusal(decode);
    if (why) throw new Refused(why);
    if (g.dirty.length && !a.has('allow-dirty')) throw new Refused(`the tree is not clean (${g.dirty.length} entries, e.g. ${g.dirty.slice(0, 3).join('; ')}): commit first (--allow-dirty is for smoke checks of a script under edit, and the registry says so)`);
    const label = a.flag('label', `${arm}-s${seed}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(label)) throw new Refused('--label: letters, digits, . _ - only');
    out = resolve(ROOT, a.flag('out', `artifacts/r10/${label}`));
    if (existsSync(resolve(out, 'run.json'))) throw new Refused(`${rel(resolve(out, 'run.json'))} exists: continue it with --resume, or choose another --out`);
    const days = +a.flag('days', '5'), burnInDays = +a.flag('burn-in', '30'), hours = a.has('hours') ? +a.flag('hours') : null;
    if (!Number.isInteger(days) || days < 1 || !Number.isInteger(burnInDays) || burnInDays < 0 || (hours !== null && !(hours > 0))) throw new Refused('--days and --burn-in are whole numbers of days; --hours is positive');
    const paramsFile = a.flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json'), text = readFileSync(resolve(ROOT, paramsFile), 'utf8');
    const params = { ...JSON.parse(text) as Record<string, number>, observeV4: 1, menuParity: 1 };
    reg = { tool: 'r10-night', version: 1, receiptSchema: RECEIPT_SCHEMA, label, created: now(), updated: now(), state: 'running', ended: '',
      root: ROOT, commit: g.commit, branch: g.branch, dirty: g.dirty.length > 0, node: process.version, host: hostname(), command: `scripts/r10-night.ts ${process.argv.slice(2).join(' ')}`,
      seed, seedRole: seedRole(seed), profile, burnInDays, daysAsked: days, hours, paramsFile, paramsSha256: createHash('sha256').update(text).digest('hex'), params,
      switches: { observeV4: 1, menuParity: 1, kernelGate: spec.gate ?? 0, kernelNoRulesPick: spec.noPick ?? 0 },
      arm, kernel: spec.kernel, adapter: spec.adapter ?? null, decode: spec.kernel === 'gliner' ? decode : 'none (no probabilities to decode)', packet: STATE_PACKET_VERSION, name: resultName(spec.kernel, spec.adapter ?? null),
      minAge: MIN_AGE, under: spec.kernel === 'rules' ? 'the rules decide for every animal' : UNDER_AGE, burnInHash: '', startHash: '', worker: null, env: Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k] ?? null])),
      machine: { load: loadavg(), swapUsedMB: swapUsedMB(), freeGB: 0, freeWhere: '' }, contexts: !a.has('no-contexts') && spec.kernel !== 'rules', timeoutS: +a.flag('timeout-s', '120'), stopCheckOn: !a.has('no-stop-check'),
      segments: [], days: [], stopCheck: null, events: [] };
  }
  const spec = ARMS[reg.arm], model = spec.kernel === 'gliner';
  const disk = diskRefusal(out);
  if (disk.refusal) throw new Refused(disk.refusal);
  if (!resuming) { reg.machine.freeGB = +disk.gb.toFixed(1); reg.machine.freeWhere = disk.where; }
  const event = (msg: string) => { reg.events.push({ t: now(), msg }); log(msg); };
  if (model) {
    // one model process: none may be running now, and this run spawns one private worker
    if (process.env.MGOGO_DECIDE_SERVER) throw new Refused('MGOGO_DECIDE_SERVER is set: a night runs one private worker, not the shared batching server');
    for (const k of ['MGOGO_GHN_ROOT', 'MGOGO_DECIDE_PYTHON', 'HF_HOME', 'HF_HUB_CACHE', 'MGOGO_FT_ROOT']) if (!process.env[k]) throw new Refused(`${k} is not set: a model arm needs the runtime variables of HANDOFF.md §3 item 3 and MGOGO_FT_ROOT (docs/staging/r10-prereg.md §8)`);
    if (!existsSync(process.env.MGOGO_DECIDE_PYTHON!)) throw new Refused(`MGOGO_DECIDE_PYTHON does not exist: ${process.env.MGOGO_DECIDE_PYTHON}`);
    const others = runningModelProcesses();
    if (others.length) throw new Refused(`another model process is running (${others.map(p => `pid ${p.pid}: ${p.command}`).join(' | ')}): one model process at a time`);
  }
  for (const d of ['', 'ckpt', 'summary']) mkdirSync(resolve(out, d), { recursive: true });

  // the world: the start (the burned-in world with the arm's switches) or the newest whole checkpoint
  let e: Engine, journal = new Map<string, Arrival>();
  const rows15: Row[] = [];
  if (resuming) {
    const ck = newestCkpt(out);
    for (const s of ck?.skipped ?? []) event(`checkpoint skipped: ${s}`);
    if (ck) e = ck.engine; else { const s = readCkpt(resolve(out, 'ckpt', 'start.json.gz')); e = { world: s.world, day: 0, meter: s.meter }; }
    const aside = setAside(out, e.day, reg.segments.length);
    journal = aside.journal;
    reg.days = Array.from({ length: e.day }, (_, i) => JSON.parse(readFileSync(resolve(out, 'summary', `${dayName(i + 1)}.json`), 'utf8')) as DaySummary);
    if (e.day > 0 && reg.days[e.day - 1].hash !== worldHash(e.world)) throw new Refused(`the checkpoint of day ${e.day} does not hash to the day's recorded hash`);
    for (let d = 1; d <= Math.min(e.day, STOP.day); d++) rows15.push(...readLines<Row>(resolve(out, 'rows', `${dayName(d)}.jsonl`)));
    if (reg.stopCheck && e.day < STOP.day) reg.stopCheck = null;
    reg.state = 'running'; reg.ended = '';
    reg.segments.push({ started: now(), fromDay: e.day, pid: process.pid, journalAnswers: journal.size, setAside: aside.moved });
    event(`resumed at the end of day ${e.day}${ck ? ` from ${relative(out, ck.file)}` : ' (the start world)'}; ${aside.moved.length} files of the day in progress set aside; ${journal.size} journalled answers will be reused`);
  } else {
    const cache = resolve(ROOT, a.flag('burnin-cache', `artifacts/r10/burnin/${reg.paramsFile.replace(/^.*\//, '').replace(/\.json$/, '')}-${reg.profile}-s${reg.seed}-d${reg.burnInDays}.json.gz`));
    const base = burnedIn(reg.seed, reg.profile, reg.params, reg.burnInDays, cache, log);
    reg.burnInHash = worldHash(base);
    const known = PILOT_BURN_IN[`${reg.profile}:${reg.seed}:${reg.burnInDays}`];
    if (known && reg.paramsFile.endsWith('M6-W50.json')) event(known === reg.burnInHash ? `the burned-in world is the pilot's (hash ${known})` : `the burned-in world hashes to ${reg.burnInHash}; the pilot's of 7 October was ${known}: the simulation has moved since`);
    const world = armWorld(base, spec);
    e = { world, day: 0, meter: meterStart(world) };
    reg.startHash = writeCkpt(resolve(out, 'ckpt', 'start.json.gz'), e).hash;
    reg.segments.push({ started: now(), fromDay: 0, pid: process.pid, journalAnswers: 0, setAside: [] });
    event(`${reg.name}; arm ${reg.arm}, seed ${reg.seed} (${reg.seedRole}), ${reg.profile} map; ${e.world.chimps.filter(c => c.alive).length} living, ${e.world.chimps.filter(c => c.alive && c.age >= reg.minAge).length} aged ${reg.minAge} and over; ${reg.under}; start hash ${reg.startHash}`);
  }
  writeRegistry(out, reg);

  // the kernel
  let guard: GuardedScorer | null = null, kernel: Kernel | null = null, awake: ChildProcess | null = null;
  let signal = '';
  const onSignal = (s: string) => { signal = s; };
  process.on('SIGINT', () => onSignal('SIGINT')); process.on('SIGTERM', () => onSignal('SIGTERM'));
  const closeDown = () => { guard?.stop(); awake?.kill(); };
  try {
    if ((model && !a.has('no-caffeinate')) || a.has('caffeinate')) { awake = spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' }); awake.on('error', () => { awake = null; }); awake.unref(); }
    if (model) {
      let waited = 0;
      while ((swapUsedMB() ?? 0) > SWAP_HOLD_MB && waited < SWAP_HOLD_MIN && !signal) { log(`hold: swap ${swapUsedMB()} MB in use, above ${SWAP_HOLD_MB} MB (${waited} min waited)`); await sleep(60_000); waited++; }
      event(`before the model load: load ${loadavg().map(v => v.toFixed(2)).join(' ')}, swap ${swapUsedMB()} MB in use, waited ${waited} min`);
      guard = new GuardedScorer(async () => { const w = new Worker(a.flag('device', 'mps')); await w.start(); reg.worker = w.ready; return w; }, reg.timeoutS * 1000);
      await guard.start();
      const adapters = (reg.worker?.adapters ?? {}) as Record<string, string>;
      if (spec.adapter !== 'base' && !adapters[spec.adapter!]) throw new Refused(`the worker holds no adapter "${spec.adapter}" (it has: ${Object.keys(adapters).join(', ') || 'none'}): point MGOGO_FT_ROOT at the folder whose adapters/ holds it`);
      event(`worker ready: ${JSON.stringify(reg.worker)}`);
      kernel = decodedKernel(glinerKernel(guard, spec.adapter!, { packet: r => buildStateOnlyQuestion(r.context) }), reg.decode as DecodeMode);
    } else kernel = spec.kernel === 'rules' ? null : spec.kernel === 'null' ? nullKernel : rulesKernel;
    writeRegistry(out, reg);

    const crashAt = a.has('crash-at-tick') ? +a.flag('crash-at-tick') : -1;
    let ticks = e.day * DAY;
    const stop = () => { if (++ticks === crashAt) process.kill(process.pid, 'SIGKILL'); return signal ? `signal ${signal}` : ''; };
    while (e.day < reg.daysAsked) {
      const files = new DayFiles(out, e.day + 1, reg.contexts);
      let res: Awaited<ReturnType<typeof runDay>>;
      try { res = await runDay(e, kernel, { sink: files, journal, guard: guard ?? undefined, stop, minAge: reg.minAge }); }
      catch (error) {
        files.close(null);
        if (!(error instanceof RunStopped)) { reg.state = 'interrupted'; reg.ended = `failed inside day ${e.day + 1}: ${error instanceof Error ? error.message : error}; the checkpoint of day ${e.day} stands`; event(reg.ended); writeRegistry(out, reg); throw error; }
        reg.state = signal ? 'interrupted' : 'stopped'; reg.ended = `${error.reason}, inside day ${e.day + 1}; the checkpoint of day ${e.day} stands`;
        event(reg.ended); writeRegistry(out, reg);
        return signal ? 130 : 3;
      }
      // the day is safe in this order: its files, its summary, the checkpoint, the registry
      files.close(res.rows);
      writeAtomic(resolve(out, 'summary', `${dayName(e.day)}.json`), JSON.stringify(res.summary, null, 1) + '\n');
      const ck = writeCkpt(resolve(out, 'ckpt', `${dayName(e.day)}.json.gz`), e);
      pruneCkpts(out, 2);
      reg.days.push(res.summary);
      if (e.day <= STOP.day) rows15.push(...res.rows);
      log(`${progressLine(reg, res.summary, startedMs, reg.hours)}; checkpoint ${(ck.bytes / 1e6).toFixed(1)} MB, receipts ${(files.bytes.receipts / 1e6).toFixed(2)} MB, contexts ${(files.bytes.contexts / 1e6).toFixed(2)} MB before gzip`);
      if (e.day === STOP.day) {
        reg.stopCheck = stopCheck(rows15, reg.days);
        const v = reg.stopCheck;
        event(`stop check after day ${STOP.day}: deaths by starvation ${v.starved}; reserves ${v.reservePctDay === null ? 'no value' : `${v.reservePctDay.toFixed(3)}% of the usual store a day`}; nights in a nest ${v.nights[0]} of ${v.nights[1]}; the rules settled ${v.fallbackShare === null ? 'no asks' : `${(100 * v.fallbackShare).toFixed(2)}% of asks`}; timeouts ${v.timeoutShare === null ? 'no asks' : `${(100 * v.timeoutShare).toFixed(2)}%`}: ${v.stop ? `STOP (${v.reasons.join('; ')})` : 'the run goes on'}`);
        if (v.stop && reg.stopCheckOn) { reg.state = 'stopped'; reg.ended = `the stop check after day ${STOP.day}: ${v.reasons.join('; ')}`; writeRegistry(out, reg); return 3; }
        if (v.stop) event('--no-stop-check: the run goes on all the same');
      }
      writeRegistry(out, reg);
      const d = diskRefusal(out);
      if (d.refusal) { reg.state = 'stopped'; reg.ended = `${d.refusal}, after day ${e.day}`; event(reg.ended); writeRegistry(out, reg); return 3; }
      if (reg.hours !== null && e.day < reg.daysAsked) {
        const last = reg.days.slice(-3), pace = last.reduce((s, x) => s + x.wallSeconds, 0) / last.length;
        if ((Date.now() - startedMs) / 1000 + pace * 1.1 > reg.hours * 3600) { reg.ended = `the ${reg.hours} hours given are used: another day would not fit (${e.day} days done)`; event(reg.ended); break; }
      }
    }
    reg.state = 'done'; if (!reg.ended) reg.ended = `every asked day ran (${e.day})`;
    event(`done: ${e.day} days, end hash ${reg.days[reg.days.length - 1]?.hash ?? reg.startHash}; next: scripts/r10-night.ts replay ${rel(out)}`);
    writeRegistry(out, reg);
    return 0;
  } finally { closeDown(); }
}

async function replay(a: Args): Promise<number> {
  if (!a.pos[0]) throw new Refused('replay <out>');
  const out = resolve(a.pos[0]), reg = readRegistry(out), taps: Tap[] = [];
  for (const p of a.flag('taps').split(',').filter(Boolean)) {
    const mod = await import(pathToFileURL(resolve(p)).href) as { default?: unknown; tap?: unknown }, make = mod.default ?? mod.tap;
    taps.push((typeof make === 'function' ? await (make as (r: Registry) => Tap | Promise<Tap>)(reg) : make) as Tap);
  }
  const r = await replayRun(out, { taps, field: !a.has('no-field'), log: s => console.log(s) });
  mkdirSync(resolve(out, 'replay'), { recursive: true });
  writeAtomic(resolve(out, 'replay', 'replay.json'), JSON.stringify({ tool: 'r10-night-replay', version: 1, replayed: now(), head: gitState(ROOT).commit, runCommit: reg.commit, note: `${reg.name}; ${reg.under}; a level measurement on one seed: no comparison is a result until a fresh unseen seed is run`, ...r }, null, 1) + '\n');
  writeAtomic(resolve(out, 'replay', 'replay.md'), replayReport(reg, r));
  console.log(`${r.ok ? 'the receipts reproduce the run' : 'THE RECEIPTS DO NOT REPRODUCE THE RUN'}: ${r.hashes.filter(h => h.run === h.replay).length} of ${r.hashes.length} day hashes equal, ${r.missing} missing, ${r.menuDiffers} menus differ, ${r.linesDiffer} of ${r.lines} lines differ, ${r.rowsDiffer} row files differ; ${r.seconds} s; wrote ${rel(resolve(out, 'replay', 'replay.md'))} and replay.json`);
  return r.ok ? 0 : 1;
}

function status(a: Args): number {
  if (!a.pos[0]) throw new Refused('status <out>');
  const reg = readRegistry(resolve(a.pos[0])), d = reg.days, sum = (g: (x: DaySummary) => number) => d.reduce((s, x) => s + g(x), 0), asks = sum(x => x.asks);
  console.log(`${reg.label}: ${reg.name}; arm ${reg.arm}${reg.adapter ? ` (${reg.adapter})` : ''}, decode ${reg.decode}, seed ${reg.seed} (${reg.seedRole}), ${reg.profile} map; ${reg.under}`);
  console.log(`state: ${reg.state}${reg.ended ? ` (${reg.ended})` : ''}; ${d.length} of ${reg.daysAsked} days; commit ${reg.commit.slice(0, 10)}${reg.dirty ? ' (tree not clean)' : ''}; ${reg.segments.length} segment${reg.segments.length === 1 ? '' : 's'} (${reg.segments.length - 1} resume${reg.segments.length === 2 ? '' : 's'}); updated ${reg.updated}`);
  if (d.length) {
    const calls = sum(x => x.calls), ks = sum(x => x.kernelSeconds), fb: Record<string, number> = {};
    for (const x of d) for (const [k, v] of Object.entries(x.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
    console.log(`asks ${asks} (${(asks / d.length).toFixed(0)} a day), kernel settled ${sum(x => x.kernel)}, the rules ${asks - sum(x => x.kernel)}${Object.keys(fb).length ? ` (${Object.entries(fb).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}, gate held ${sum(x => x.held)}; ${calls ? (ks / calls).toFixed(2) : 'no'} s a call; timeouts ${sum(x => x.timeouts)}; worker starts ${sum(x => x.workerStarts)}`);
    console.log(`deaths ${sum(x => x.deaths.length)}${sum(x => x.deaths.length) ? ` (${d.flatMap(x => x.deaths).map(x => `${x.name} ${x.cause ?? 'unknown'}`).join(', ')})` : ''}; living ${d[d.length - 1].living}; wall ${(sum(x => x.wallSeconds) / 3600).toFixed(2)} h; last hash ${d[d.length - 1].hash}`);
  }
  const v = reg.stopCheck;
  console.log(v ? `stop check after day ${v.day}: starvation ${v.starved} (limit ${STOP.starved}); reserves ${v.reservePctDay?.toFixed(3) ?? 'no value'}% a day (floor ${STOP.reservePctDay}); nights in a nest ${v.nights[0]} of ${v.nights[1]} (floor ${STOP.nights}); rules share ${v.fallbackShare === null ? 'no asks' : (100 * v.fallbackShare).toFixed(2) + '%'} (limit ${100 * STOP.fallbacks}%); timeouts ${v.timeoutShare === null ? 'no asks' : (100 * v.timeoutShare).toFixed(2) + '%'} (limit ${100 * STOP.timeouts}%): ${v.stop ? `STOP: ${v.reasons.join('; ')}` : 'went on'}` : `stop check: not reached (it is read after day ${STOP.day})`);
  for (const e of reg.events.slice(-6)) console.log(`  ${e.t} ${e.msg}`);
  return 0;
}

/** The plain rules world: createWorld and tickWorld, nothing of this script's machinery (no cache, no arm, no meter, no checkpoint). */
function plain(a: Args): number {
  const seed = +a.flag('seed', 'NaN'), days = +a.flag('days', '2'), burnIn = +a.flag('burn-in', '30'), profile = a.flag('profile', 'field') as 'field' | 'compressed';
  if (!Number.isInteger(seed) || RESERVED_SEEDS.has(seed)) throw new Refused('--seed N: a development seed');
  const params = { ...JSON.parse(readFileSync(resolve(ROOT, a.flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json')), 'utf8')) as Record<string, number>, observeV4: 1, menuParity: 1 };
  const t0 = Date.now(), w = createWorld(seed, { profile, params });
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  console.log(`plain rules world, seed ${seed}, ${profile} map: after ${burnIn} days ${worldHash(w)}`);
  for (let d = 1; d <= days; d++) { for (let i = 0; i < DAY; i++) tickWorld(w); console.log(`day ${d}: ${worldHash(w)}`); }
  console.log(`${Math.round((Date.now() - t0) / 1000)} s`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2), a = parseArgs(rest);
  (async () => cmd === 'run' ? run(a) : cmd === 'replay' ? replay(a) : cmd === 'status' ? status(a) : cmd === 'plain' ? plain(a) : (console.error('usage: r10-night.ts run|replay|status|plain … (see the header of scripts/r10-night.ts)'), 2))()
    .then(code => process.exit(code), error => { if (error instanceof Refused) { console.error(`r10-night refused: ${error.message}`); process.exit(2); } console.error(error); process.exit(1); });
}
