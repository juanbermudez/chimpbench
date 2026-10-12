// Stage R10 (docs/staging/r10-prereg.md): a whole population on one kernel for a night. One arm drives every animal
// aged 8 and over in every community (animals under 8 stay on the rules, and every output says so) on the working base
// with the switches of the gate test (the state-only packet, the rules' menu, the loop's intention gate per arm), after
// 30 days of burn-in on the rules, for N simulated days. scripts/r5-pilot.ts keeps its registered behaviour; this
// script shares its arms (ARMS, armWorld) and its guarded scorer, and the engine is scripts/lib/r10-run.ts.
//
//   pnpm exec tsx scripts/r10-night.ts run --seed 48 --arm trained-gate [--decode top|draw|held] [--decode-salt N] [--hold act|block|whole] [--days 40] [--hours 10]
//       [--out artifacts/r10/<label>] [--label L] [--burn-in 30] [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--profile field|compressed]
//       [--timeout-s 120] [--device mps] [--no-contexts] [--no-stop-check] [--allow-dirty] [--burnin-dir artifacts/r10/burnin]
//   pnpm exec tsx scripts/r10-night.ts run --resume <out> [--days N] [--hours H]
//   pnpm exec tsx scripts/r10-night.ts replay <out> [--taps a.ts,b.ts] [--no-field] [--no-card]
//   pnpm exec tsx scripts/r10-night.ts status <out>
//   pnpm exec tsx scripts/r10-night.ts plain --seed 48 [--days 2] [--burn-in 30] [--profile field]   # createWorld and tickWorld only: the hashes a rules arm must end each day on
//
// Arms: rules | argmax-gate (the rules' top option through the loop, gate on: no model) | null-gate | trained-gate
// (r4-rules-state, gate on) and the other kernel arms of scripts/r5-pilot.ts. A model arm needs the runtime variables of
// HANDOFF.md §3 item 3 and MGOGO_FT_ROOT (the folder holding adapters/<name>); it refuses to start while another model
// process is running, and it is launched under `caffeinate -i` (it also holds its own `caffeinate -i -w <pid>`).
//
// The decode is stage R9's step of the loop (src/kernel/decode.ts through scripts/lib/decoder.ts): `top` applies the
// kernel's own pick, `draw` one seeded draw per ask from its probabilities, `held` a draw whose noise is held for an
// epoch (--hold: the act, the half hour, or the whole act through interrupts). A model arm always has the step (top
// unless another is named) and every receipt carries its record; a no-model kernel arm has it only when --decode is
// given (the plumbing check, as stage R9's dry arms: the rules' top option is a certain kernel, the null kernel one
// with even odds). `held` is refused together with the kinds-first menu (activityFirst), where a held draw does not hold.
//
// A run survives a night: every kernel answer is journalled the moment it arrives, every tick's receipts are appended
// at once (both fsynced every two seconds), a lossless checkpoint is written atomically at the end of every simulated day (the last two are kept),
// and --resume continues from the newest whole checkpoint, reusing the answers already journalled for the day that was
// in progress. Exit codes: 0 done, 2 refused, 3 stopped (the stop check after five days, the error limit, low disk),
// 130 interrupted. `replay` answers from the receipts with no model, must land on every day's hash, and reads the run
// through the field observer and the truth-row readouts (the short scorecard by value), through stage R7's timing card
// (scripts/lib/r10-card-tap.ts, attached through the tap hook; --no-card leaves it out) and any --taps module (a module
// whose default export is a function returning a Tap of scripts/lib/r10-run.ts).
// --crash-at-tick N kills the process with SIGKILL after N ticks of the window: a crash to test --resume against.
//
// Stage R13 (docs/staging/r13-prereg.md): the packet 5 path and the arms of stage R11, built and decoded by that stage's
// own functions (scripts/r11-loop.ts engineArm, engineSpec, engineKernel; scripts/lib/r11-packets.ts packetOf).
//   pnpm exec tsx scripts/r10-night.ts run --seed 3613 --arm p5b-s7-draw-1 | p5b-s7-top [--days 20] [--hours 9]     the arm's name fixes the adapter, the packet and the decode
//   pnpm exec tsx scripts/r10-night.ts run --seed 3613 --arm rules --packet p5b --days N                           the paired rules arm on the same burned-in world
//   pnpm exec tsx scripts/r10-night.ts run --seed 48 --arm wire-p5b-draw-1 --days 2                                the model path against a fake worker that holds no model (MGOGO_DECIDE_PYTHON=scripts/lib/fake-worker.mjs)
//   pnpm exec tsx scripts/r10-night.ts controls --seed 3613 --packet p5b --days N [--out artifacts/r13/card]       stage R7's sixteen control arms at the population unit on that world, by stage R7's own code
//   pnpm exec tsx scripts/r10-night.ts replay <out> --r7 <dir>                                                     the replayed run read by stage R7's readers, written as an arm file beside the control arms
//   pnpm exec tsx scripts/r10-night.ts packets <out> [--hours 9]                                                   every packet of a run rebuilt from its saved context: its hash against the receipt's, its length, the night's projection
//   pnpm exec tsx scripts/r10-night.ts plain --seed 3613 --packet p5b                                              the plain world with observeV5 1, and its hash without the animals' own record
// --packet p5b | p5a | state (default state: stage R4's state-only packet, the old path, unchanged): a named packet 5 puts
// observeV5 1 on the world from the first tick, sends the kernel that packet, and writes receipts of schema r10-receipt-3
// (each ask line and journal line carries the packet's version; the journal also the decode setting). Refused on top of
// the old path's refusals: a sealed seed (4333, 4444); an adapter folder with weights and no manifest.json (a training cut
// short); registered weights with another hash; an arm of stage R11 on any seed but 3613 (its dry arms: 48). Added by the
// stage's review (docs/staging/r13-prereg.md §13): with a real adapter only the two registered arms run on a population,
// and only the one the decode rule names, read from the table R13_R11_NUMBERS points at; the registered world and length
// (the field map, 30 days of burn-in on M6-W50, --days 20, --hours 9 or less, the stop check on, 120 s an ask, contexts saved); --packet p5b or p5a with
// a model arm that is not stage R11's; and at a resume of the registered run: not past a stop check that ended it, and
// with no more hours than are left of the nine.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { hostname, loadavg } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import type { Kernel } from '../src/kernel/types';
import { requestFor } from '../src/sim/decide';
import { paramsOf, resolveParams, type Overrides } from '../src/sim/params';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { DecisionContext, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { gitState, RESERVED_SEEDS } from './e-run';
import { focalSet } from './em-loop';
import { Worker } from './ft-society';
import { writeAtomic } from './lib/checkpoint';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion, tokensOf } from './lib/packet-state';
import { HOLDS, newDecoder, type Decoder, type Hold } from './lib/decoder';
import cardTap from './lib/r10-card-tap';
import { decodeRefusal, decodeWords, defaultSalt, nightDecode, type DecodeMode } from './lib/r10-decode';
import { replayReport, replayRun, runPacket } from './lib/r10-read';
import { DAY, DayFiles, dayName, diskRefusal, keyOf, meterStart, MIN_AGE, newestCkpt, pruneCkpts, readCkpt, readLines, readRegistry, RECEIPT_SCHEMA, RECEIPT_SCHEMA_PACKET, RunStopped, runDay, runningModelProcesses, setAside, sha16, STOP, stopCheck, swapUsedMB, warmedWorker,
  UNDER_AGE, writeCkpt, writeRegistry, type Arrival, type AskLine, type DaySummary, type Engine, type Line, type Registry, type Row, type Tap } from './lib/r10-run';
import { PACKET_NAMES, PACKET_VERSION, packetOf, type PacketName } from './lib/r11-packets';
import { decodeRule, isRegisteredArm, PLAIN_RULES, populationSeedRefusal, R13, registeredRunRefusal, REGISTERED_SHA256, resumeBudget } from './lib/r13';
import { ARMS, armWorld, GuardedScorer, type ArmSpec } from './r5-pilot';
import { engineArm, engineKernel, engineSpec, LOOP_SWITCHES, warmUpPacket, workerRefusal, type EngineArm } from './r11-loop';
import { ARMS as CONTROL_ARMS, armReaders, runArm as controlRun, type ArmFile, type ArmSpec as ControlSpec } from './r7-card';
import { hashWithoutOwn } from './r8-contexts';

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
  if (adapter === 'fake') return 'a fake worker that holds no model, on a rules menu (a check of the path, never a result)';
  // stage R11's adapters: the teacher is the rules (their own odds on fresh draws, as soft labels), read from packet 5
  if (/^r11-p5[ab]-s\d+$/.test(adapter ?? '')) return 'rules-taught model on a rules menu (taught the rules\' own odds on fresh draws; packet 5; one training of the recipe)';
  return /^r4[bc]?-rules-state$/.test(adapter ?? '') ? 'rules-taught model on a rules menu' : `model with adapter ${adapter} on a rules menu (state its label source)`;
}
const seedRole = (seed: number) => seed === 48 || seed === 7 ? 'a training seed of the rules-taught adapters (48 and 7)' : seed === 21 || seed === 5 ? 'a held-out seed read in stages R4 to R5-gate (not fresh)'
  : seed === R13.seed ? 'the fresh seed registered for stage R13 (docs/staging/r13-prereg.md §4)' : seed === 4111 || seed === 4222 ? 'a test seed of stage R11 (not fresh)' : 'a development seed';
/** The arm of a run: one of scripts/r5-pilot.ts ARMS, or an arm of stage R11's loop by its own name (its adapter, packet and decode: scripts/r11-loop.ts engineArm). */
function armOf(name: string): { spec: ArmSpec | undefined; eng: EngineArm | null } { const eng = engineArm(name); return { spec: eng ? engineSpec(eng) : ARMS[name], eng }; }

/**
 * The burned-in world of a run or of its control arms, with its hash. A packet 5 world (observeV5 1 from the first tick)
 * is checked against the same burn-in built without the switch: with the animals' own record removed the two must be
 * one world (the rules never read the record; stage R8), or nothing is run on it. The plain hash is kept beside the
 * cached world.
 */
function baseWorld(x: { seed: number; profile: 'field' | 'compressed'; params: Record<string, number>; burnInDays: number; paramsFile: string; paramsSha256: string; commit: string; dirty: boolean }, burninDir: string, log: (s: string) => void): { base: World; burnInHash: string; plainHash?: string } {
  const v5 = (x.params.observeV5 ?? 0) === 1;
  const cache = x.dirty ? null : resolve(ROOT, burninDir, `${x.paramsFile.replace(/^.*\//, '').replace(/\.json$/, '')}-${x.paramsSha256.slice(0, 8)}-${x.profile}-s${x.seed}-d${x.burnInDays}${v5 ? '-v5' : ''}-${x.commit.slice(0, 10)}.json.gz`);
  const base = burnedIn(x.seed, x.profile, x.params, x.burnInDays, cache, log), burnInHash = worldHash(base);
  if (!v5) return { base, burnInHash };
  const note = cache ? cache.replace(/\.json\.gz$/, '.plain.json') : null;
  let plainHash: string;
  if (note && existsSync(note)) plainHash = (JSON.parse(readFileSync(note, 'utf8')) as { plainHash: string }).plainHash;
  else {
    const { observeV5: _own, ...plainParams } = x.params, t0 = Date.now(), plain = createWorld(x.seed, { profile: x.profile, params: plainParams });
    for (let i = 0; i < x.burnInDays * DAY; i++) tickWorld(plain);
    plainHash = worldHash(plain);
    if (note) writeAtomic(note, JSON.stringify({ seed: x.seed, days: x.burnInDays, hash: burnInHash, plainHash }, null, 1) + '\n');
    log(`the same burn-in without observeV5: ${Math.round((Date.now() - t0) / 1000)} s, hash ${plainHash}`);
  }
  const mine = hashWithoutOwn(base);
  if (mine !== plainHash) throw new Refused(`seed ${x.seed}: the burn-in with observeV5 1, its own record removed, hashes ${mine}; the same burn-in without the switch hashes ${plainHash}: the animals' own record changed the world`);
  return { base, burnInHash, plainHash };
}

/**
 * The world after the burn-in on the rules, made now or read from a cache file. The file's name carries the commit and
 * the parameters' hash, so a world burned in by other code or other parameters is never picked up; a run from a tree
 * that is not clean uses no cache (`cache` null).
 */
function burnedIn(seed: number, profile: 'field' | 'compressed', params: Record<string, number>, burnInDays: number, cache: string | null, log: (s: string) => void): World {
  if (cache && existsSync(cache)) return JSON.parse(gunzipSync(readFileSync(cache)).toString('utf8')) as World;
  const t0 = Date.now(), w = createWorld(seed, { profile, params });
  for (let i = 0; i < burnInDays * DAY; i++) tickWorld(w);
  if (cache) { mkdirSync(dirname(cache), { recursive: true }); writeAtomic(cache, gzipSync(Buffer.from(JSON.stringify(w)), { level: 1 })); }
  log(`burn-in: ${burnInDays} days on the rules in ${Math.round((Date.now() - t0) / 1000)} s${cache ? ` (kept at ${rel(cache)})` : ' (not kept: the tree is not clean)'}`);
  return w;
}

function progressLine(reg: Registry, s: DaySummary, startedMs: number, hours: number | null): string {
  const fb = Object.entries(s.fallbacks).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '), last = reg.days.slice(-3), pace = last.reduce((a, d) => a + d.wallSeconds, 0) / last.length;
  const left = reg.daysAsked - s.day, eta = new Date(Date.now() + left * pace * 1000);
  const fit = hours === null ? '' : `; ${Math.max(0, Math.floor((hours * 3600 - (Date.now() - startedMs) / 1000) / (pace * 1.1)))} more days fit the ${hours} h`;
  const per = s.asks ? `${s.msMean === null ? 'no new call' : `${(s.msMean / 1000).toFixed(2)} s an ask (median ${((s.msMedian ?? 0) / 1000).toFixed(2)}, 95th ${((s.msP95 ?? 0) / 1000).toFixed(2)})`}` : 'no asks';
  return `day ${s.day}/${reg.daysAsked} (simulated day ${reg.burnInDays + s.day}): ${s.asks} asks, ${per}, kernel settled ${s.kernel}, the rules ${s.asks - s.kernel}${fb ? ` (${fb})` : ''}, gate held ${s.held}${s.reused ? `, ${s.reused} answers reused from the journal` : ''}, `
    + `timeouts ${s.timeouts}, deaths ${s.deaths.length}${s.deaths.length ? ` (${s.deaths.map(d => `${d.name} ${d.cause ?? 'unknown'}`).join(', ')})` : ''}, living ${s.living} (${reg.kernel === 'rules' ? 'the rules decide for every animal' : `${s.driven} on the kernel; ${s.under} under ${reg.minAge} on the rules`}), `
    + `day took ${(s.wallSeconds / 60).toFixed(1)} min (kernel ${(s.kernelSeconds / 60).toFixed(1)}), rss ${s.rssMB} MB, hash ${s.hash}; at this pace day ${reg.daysAsked} ends ${clock(eta)}${fit}`;
}

type Args = { pos: string[]; flag: (k: string, d?: string) => string; has: (k: string) => boolean };
const BOOL = new Set(['--no-contexts', '--no-stop-check', '--allow-dirty', '--no-field', '--no-card', '--caffeinate', '--no-caffeinate']);
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
    // the same checks as at the first start: a mistyped --days would otherwise close the run as "done" without a tick
    const days = a.has('days') ? +a.flag('days') : reg.daysAsked, hours = a.has('hours') ? +a.flag('hours') : null;
    if (!Number.isInteger(days) || days < 1 || (hours !== null && !(hours > 0))) throw new Refused('--days is a whole number of days; --hours is positive');
    reg.daysAsked = days; reg.hours = hours;
    if (reg.engine?.registered) {
      // the registered run of stage R13 (docs/staging/r13-prereg.md §5, §6; the review's amendments A4 and A5 in §13): it is
      // not continued past a stop check that ended it, its length stays the registered one, and its nine hours are the
      // run's, not each segment's. All of this comes before anything is moved, loaded or started.
      if (reg.stopCheck?.stop && reg.stopCheckOn) throw new Refused(`the stop check after day ${STOP.day} ended this run (${reg.stopCheck.reasons.join('; ')}): the registered run is read for viability alone and is not continued (docs/staging/r13-prereg.md §5, §6)`);
      if (days !== R13.days) throw new Refused(`the registered run is asked ${R13.days} days (docs/staging/r13-prereg.md §5): --days ${days} is refused`);
      const b = resumeBudget(reg.days, hours);
      if (!b.fits) {
        reg.state = 'done'; reg.ended = `the ${R13.hours} hours of the registered run are used (${b.usedHours.toFixed(2)} h in ${reg.days.length} whole days on file): another day would not fit, and the run is not continued`;
        reg.events.push({ t: now(), msg: reg.ended }); log(reg.ended); writeRegistry(out, reg);
        return 0;
      }
      reg.hours = +b.hours.toFixed(3);
      log(`the registered run has used ${b.usedHours.toFixed(2)} of its ${R13.hours} hours in ${reg.days.length} whole days: this segment gets ${reg.hours} h at most`);
    }
  } else {
    const arm = a.flag('arm', 'rules'), { spec, eng } = armOf(arm), seed = +a.flag('seed', 'NaN'), profile = a.flag('profile', 'field'), decode = a.flag('decode', eng ? eng.decode.mode : 'top');
    if (!spec) throw new Refused(`unknown arm "${arm}"; known: ${Object.keys(ARMS).filter(k => !ARMS[k].redraw).join(', ')}, and the arms of stage R11's loop by their own names (${R13.arms.draw}, ${R13.arms.top}, …: scripts/r11-loop.ts engineArm)`);
    if (spec.redraw) throw new Refused(`arm "${arm}" is a re-draw of the rules: not an arm of this script`);
    if (!Number.isInteger(seed) || seed < 0) throw new Refused('--seed N is required (a non-negative integer)');
    if (RESERVED_SEEDS.has(seed)) throw new Refused(`seed ${seed} is a reserved or retired seed (AGENTS.md): development seeds only`);
    const sealed = populationSeedRefusal(seed, eng);
    if (sealed) throw new Refused(sealed);
    if (profile !== 'field' && profile !== 'compressed') throw new Refused('--profile field | compressed');
    // the packet: an arm of stage R11 fixes its own; otherwise --packet (the state-only packet of stage R4 unless a packet 5 is named)
    const packetFlag = a.flag('packet', '');
    if (packetFlag && !(PACKET_NAMES as readonly string[]).includes(packetFlag)) throw new Refused(`--packet ${PACKET_NAMES.join(' | ')}`);
    if (eng && packetFlag && packetFlag !== eng.packet) throw new Refused(`arm ${arm} is sent packet "${eng.packet}" (its name fixes it): --packet ${packetFlag} contradicts it`);
    const packetName: PacketName = eng ? eng.packet : (packetFlag || 'state') as PacketName, v5 = !!eng || packetName !== 'state';
    // a model arm that is not stage R11's is sent the state-only packet (its kernel is made so below): a packet 5 named for it would put another packet's version and hash on its receipts
    if (!eng && spec.kernel === 'gliner' && packetName !== 'state') throw new Refused(`arm ${arm} is sent the state-only packet of stage R4: --packet ${packetName} is for the rules arm, the no-model arms and the arms of stage R11 (which fix their own)`);
    if (eng && ((a.has('decode') && decode !== eng.decode.mode) || (a.has('decode-salt') && +a.flag('decode-salt') !== eng.decode.salt) || (a.has('hold') && a.flag('hold') !== eng.decode.hold)))
      throw new Refused(`arm ${arm} decodes by ${decodeWords(eng.decode)} (its name fixes it): the --decode, --decode-salt or --hold given contradicts it`);
    if (g.dirty.length && !a.has('allow-dirty')) throw new Refused(`the tree is not clean (${g.dirty.length} entries, e.g. ${g.dirty.slice(0, 3).join('; ')}): commit first (--allow-dirty is for smoke checks of a script under edit, and the registry says so)`);
    const label = a.flag('label', `${arm}-s${seed}`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(label)) throw new Refused('--label: letters, digits, . _ - only');
    out = resolve(ROOT, a.flag('out', `artifacts/r10/${label}`));
    if (existsSync(resolve(out, 'run.json'))) throw new Refused(`${rel(resolve(out, 'run.json'))} exists: continue it with --resume, or choose another --out`);
    const days = +a.flag('days', '5'), burnInDays = +a.flag('burn-in', '30'), hours = a.has('hours') ? +a.flag('hours') : null;
    if (!Number.isInteger(days) || days < 1 || !Number.isInteger(burnInDays) || burnInDays < 0 || (hours !== null && !(hours > 0))) throw new Refused('--days and --burn-in are whole numbers of days; --hours is positive');
    const paramsFile = a.flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json'), text = readFileSync(resolve(ROOT, paramsFile), 'utf8');
    // an arm of stage R11 with a real adapter is the registered run: the decode rule must be on hand and name it, and the world and the length are the registered ones
    let ruleRead: Registry['decodeRule'];
    if (eng && eng.adapter !== 'fake') {
      const file = process.env.R13_R11_NUMBERS ? resolve(process.env.R13_R11_NUMBERS) : '', table = file && existsSync(file) ? readFileSync(file, 'utf8') : null, rule = table === null ? null : decodeRule(table);
      const why = registeredRunRefusal({ arm, profile, burnInDays, paramsFile, days, hours, stopCheck: !a.has('no-stop-check'), timeoutS: +a.flag('timeout-s', '120'), contexts: !a.has('no-contexts') }, rule);
      if (why) throw new Refused(why);
      ruleRead = { arm: rule!.arm, n1: rule!.n1, s0: rule!.s0, why: rule!.why, file, sha256: createHash('sha256').update(table!).digest('hex') };
    }
    // a packet 5 world carries the switches of stage R11's loop (observeV5 1 from the first tick); the old path's world is unchanged
    const params: Record<string, number> = { ...JSON.parse(text) as Record<string, number>, ...(v5 ? LOOP_SWITCHES : { observeV4: 1, menuParity: 1 }) };
    // the decode (stage R9's step of the loop): a model arm always has one; a no-model kernel arm only when --decode is given
    const hold = a.flag('hold', eng ? eng.decode.hold : 'act'), salt = a.has('decode-salt') ? +a.flag('decode-salt') : eng ? eng.decode.salt : undefined;
    if ((a.has('decode') || a.has('decode-salt') || a.has('hold')) && spec.kernel === 'rules') throw new Refused('the rules arm has no kernel answer to decode: --decode, --decode-salt and --hold are for kernel arms');
    const why = decodeRefusal(decode, { hold, salt, activityFirst: resolveParams(profile, params as Overrides).activityFirst });
    if (why) throw new Refused(why);
    if (!(HOLDS as readonly string[]).includes(hold)) throw new Refused(`--hold ${HOLDS.join(' | ')}`);
    const decodeSpec = eng ? eng.decode : spec.kernel === 'gliner' || (spec.kernel !== 'rules' && a.has('decode')) ? nightDecode(decode as DecodeMode, salt ?? defaultSalt(decode as DecodeMode), hold as Hold) : null;
    reg = { tool: 'r10-night', version: 1, receiptSchema: packetName === 'state' ? RECEIPT_SCHEMA : RECEIPT_SCHEMA_PACKET, label, created: now(), updated: now(), state: 'running', ended: '',
      root: ROOT, commit: g.commit, branch: g.branch, dirty: g.dirty.length > 0, node: process.version, host: hostname(), command: `scripts/r10-night.ts ${process.argv.slice(2).join(' ')}`,
      seed, seedRole: seedRole(seed), profile, burnInDays, daysAsked: days, hours, paramsFile, paramsSha256: createHash('sha256').update(text).digest('hex'), params,
      switches: { observeV4: 1, menuParity: 1, kernelGate: spec.gate ?? 0, kernelNoRulesPick: spec.noPick ?? 0, ...(v5 ? { observeV5: 1 } : {}) },
      arm, kernel: spec.kernel, adapter: spec.adapter ?? null, decode: decodeWords(decodeSpec), decodeSpec, packet: PACKET_VERSION[packetName], ...(packetName !== 'state' ? { packetName } : {}),
      ...(eng ? { engine: { name: eng.name, key: eng.key, adapter: eng.adapter, packet: eng.packet, decodeName: eng.decodeName, what: eng.what, registered: isRegisteredArm(eng.name) && seed === R13.seed } } : {}), ...(ruleRead ? { decodeRule: ruleRead } : {}), ...(v5 ? { stage: 'R13' } : {}),
      name: resultName(spec.kernel, spec.adapter ?? null),
      minAge: MIN_AGE, under: spec.kernel === 'rules' ? 'the rules decide for every animal' : UNDER_AGE, burnInHash: '', startHash: '', worker: null, env: Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k] ?? null])),
      machine: { load: loadavg(), swapUsedMB: swapUsedMB(), freeGB: 0, freeWhere: '' }, contexts: !a.has('no-contexts') && spec.kernel !== 'rules', timeoutS: +a.flag('timeout-s', '120'), stopCheckOn: !a.has('no-stop-check'),
      segments: [], days: [], stopCheck: null, events: [] };
  }
  // an arm of stage R11 is rebuilt from its name (a resume reads it from the registry); `dry`: its worker holds no model
  const eng = reg.engine ? engineArm(reg.engine.name) : null, spec = eng ? engineSpec(eng) : ARMS[reg.arm], dry = eng?.adapter === 'fake', worker = spec.kernel === 'gliner', model = worker && !dry;
  if (reg.engine && !eng) throw new Refused(`the registry names arm "${reg.engine.name}" of stage R11's loop, which this checkout does not know`);
  const disk = diskRefusal(out);
  if (disk.refusal) throw new Refused(disk.refusal);
  if (!resuming) { reg.machine.freeGB = +disk.gb.toFixed(1); reg.machine.freeWhere = disk.where; }
  const event = (msg: string) => { reg.events.push({ t: now(), msg }); log(msg); };
  if (dry) {
    // the model path against scripts/lib/fake-worker.mjs: it must never load or reach a model (as scripts/r11-loop.ts dry)
    if (!(process.env.MGOGO_DECIDE_PYTHON ?? '').endsWith('fake-worker.mjs') || process.env.MGOGO_DECIDE_SERVER) throw new Refused(`arm ${reg.arm} answers from scripts/lib/fake-worker.mjs: set MGOGO_DECIDE_PYTHON to that file and leave MGOGO_DECIDE_SERVER unset`);
    if (!existsSync(process.env.MGOGO_DECIDE_PYTHON!)) throw new Refused(`MGOGO_DECIDE_PYTHON does not exist: ${process.env.MGOGO_DECIDE_PYTHON}`);
    if (process.cwd() !== ROOT) throw new Refused(`run a worker arm from the repo root (${ROOT}): the worker is started from training/decide_ft under the current directory`);
  }
  if (model) {
    // one model process: none may be running now, and this run spawns one private worker
    if (process.env.MGOGO_DECIDE_SERVER) throw new Refused('MGOGO_DECIDE_SERVER is set: a night runs one private worker, not the shared batching server');
    for (const k of ['MGOGO_GHN_ROOT', 'MGOGO_DECIDE_PYTHON', 'HF_HOME', 'HF_HUB_CACHE', 'MGOGO_FT_ROOT']) if (!process.env[k]) throw new Refused(`${k} is not set: a model arm needs the runtime variables of HANDOFF.md §3 item 3 and MGOGO_FT_ROOT (docs/staging/r10-prereg.md §8)`);
    if (!existsSync(process.env.MGOGO_DECIDE_PYTHON!)) throw new Refused(`MGOGO_DECIDE_PYTHON does not exist: ${process.env.MGOGO_DECIDE_PYTHON}`);
    if (process.cwd() !== ROOT) throw new Refused(`run a model arm from the repo root (${ROOT}): the worker is started from training/decide_ft under the current directory`);
    if (spec.adapter !== 'base') {
      // the adapter must be where the worker will look for it, and named for loading (training/decide_ft/adapters.py)
      const weights = resolve(ROOT, process.env.MGOGO_FT_ROOT!, 'adapters', spec.adapter!, 'adapter_model.safetensors');
      if (!existsSync(weights)) throw new Refused(`no adapter at ${weights}: point MGOGO_FT_ROOT at the folder whose adapters/ holds ${spec.adapter}`);
      if (!(process.env.MGOGO_FT_ADAPTERS ?? '').split(',').includes(spec.adapter!)) throw new Refused(`MGOGO_FT_ADAPTERS must name ${spec.adapter} (it is "${process.env.MGOGO_FT_ADAPTERS ?? ''}"): the worker loads only the adapters it lists`);
      // the trainers write manifest.json last: weights without one are an early epoch of a training cut short (docs/staging/r11-prereg.md §12.2)
      if (eng && !existsSync(resolve(dirname(weights), 'manifest.json'))) throw new Refused(`${dirname(weights)} holds weights and no manifest.json: a training cut short; it is not run`);
      const sha = createHash('sha256').update(readFileSync(weights)).digest('hex');
      if (eng && REGISTERED_SHA256[spec.adapter!] && REGISTERED_SHA256[spec.adapter!] !== sha) throw new Refused(`the weights of ${spec.adapter} hash to ${sha}; the registration names ${REGISTERED_SHA256[spec.adapter!]} (docs/staging/r13-prereg.md §2)`);
      if (resuming && reg.adapterSha256 && reg.adapterSha256 !== sha) throw new Refused(`the adapter's weights changed since the run began (${sha.slice(0, 12)}, was ${reg.adapterSha256.slice(0, 12)})`);
      reg.adapterSha256 = sha;
    }
    let others: ReturnType<typeof runningModelProcesses>;
    try { others = runningModelProcesses(); } catch (error) { throw new Refused(`the process list could not be read (${error instanceof Error ? error.message.slice(0, 200) : error}): whether another model process is running is not known`); }
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
    // a run that died between the checkpoint of day 5 and the registry never read its stop check: it is read now
    const late = e.day >= STOP.day && !reg.stopCheck;
    if (late) reg.stopCheck = stopCheck(rows15, reg.days);
    if (late && reg.stopCheck!.stop && reg.stopCheckOn && e.day === STOP.day) { reg.state = 'stopped'; reg.ended = `the stop check after day ${STOP.day}: ${reg.stopCheck!.reasons.join('; ')}`; writeRegistry(out, reg); log(reg.ended); return 3; }
    if (!late && reg.stopCheck?.stop && e.day === STOP.day) log(`the stop check after day ${STOP.day} said STOP (${reg.stopCheck.reasons.join('; ')}); this resume goes on past it on purpose`);
    reg.state = 'running'; reg.ended = '';
    reg.segments.push({ started: now(), fromDay: e.day, pid: process.pid, journalAnswers: journal.size, setAside: aside.moved });
    event(`resumed at the end of day ${e.day}${ck ? ` from ${relative(out, ck.file)}` : ' (the start world)'}; ${aside.moved.length} files of the day in progress set aside; ${journal.size} journalled answers will be reused`);
  } else {
    const { base, burnInHash, plainHash } = baseWorld(reg, a.flag('burnin-dir', 'artifacts/r10/burnin'), log);
    reg.burnInHash = burnInHash;
    if (plainHash) { reg.plainBurnInHash = plainHash; event(`the burned-in world (hash ${burnInHash}) without the animals' own record is the same burn-in without observeV5 (hash ${plainHash})`); }
    // the pilot's world: the burn-in itself on the old path; on a packet 5 world, the same burn-in without the animals' own record
    const known = PILOT_BURN_IN[`${reg.profile}:${reg.seed}:${reg.burnInDays}`], mine = plainHash ?? burnInHash;
    if (known && reg.paramsFile.endsWith('M6-W50.json')) event(known === mine ? `the burned-in world is the pilot's (hash ${known})` : `the burned-in world hashes to ${mine}; the pilot's of 7 October was ${known}: the simulation has moved since`);
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
  // a worker process that dies leaves a broken pipe behind: the calls that follow fail and the worker is replaced
  // (scripts/lib/r10-run.ts REPLACE_WORKER_AFTER); anything else that is not caught ends the run with the registry saying so
  process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED' || error.code === 'ERR_STREAM_WRITE_AFTER_END') { log(`worker pipe error (${error.code}): the worker will be replaced`); return; }
    console.error(error);
    try { reg.state = 'interrupted'; reg.ended = `failed: ${error.message}; the last checkpoint stands`; writeRegistry(out, reg); } catch { /* the registry could not be written */ }
    closeDown(); process.exit(1);
  });
  try {
    if ((model && !a.has('no-caffeinate')) || a.has('caffeinate')) {
      // the Mac stays awake while this process lives (the launch under `caffeinate -i` does the same from outside)
      awake = spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore' });
      awake.on('error', error => { log(`caffeinate could not be started (${error.message}): launch the run under caffeinate -i`); awake = null; });
      awake.unref();
      event(`awake: caffeinate -i -w ${process.pid} holds the Mac awake while this run lives (its pid ${awake.pid ?? 'none'})`);
    }
    if (worker) {
      if (model) {
        let waited = 0;
        while ((swapUsedMB() ?? 0) > SWAP_HOLD_MB && waited < SWAP_HOLD_MIN && !signal) { log(`hold: swap ${swapUsedMB()} MB in use, above ${SWAP_HOLD_MB} MB (${waited} min waited)`); await sleep(60_000); waited++; }
        event(`before the model load: load ${loadavg().map(v => v.toFixed(2)).join(' ')}, swap ${swapUsedMB()} MB in use, waited ${waited} min`);
      }
      // every worker of the night (the first, and any replacement) answers one real packet before it serves
      // (the warm-up packet is built on a copy, so nothing of it can reach the run's world)
      let warm: { packet: unknown; options: number } | null;
      if (eng) warm = warmUpPacket(e.world, eng.packet);   // the arm's own packet, as stage R11's loop warms its workers
      else { const probe = structuredClone(e.world), first = probe.chimps.filter(c => c.alive && c.age >= reg.minAge).map(c => requestFor(probe, c)).find(r => r.refusal === ''); warm = first ? { packet: buildStateOnlyQuestion(first.request.context), options: first.request.options.length } : null; }
      if (!warm) throw new Refused('no animal on the kernel has a real choice to warm the worker up with');
      guard = new GuardedScorer(warmedWorker(async () => {
        const w = new Worker(a.flag('device', 'mps')); await w.start(); reg.worker = w.ready;
        // an arm of stage R11 is never answered by the untuned model: the worker's ready line must hold its adapter, before anything is asked and before the model loads
        const why = eng ? workerRefusal(w.ready, eng.adapter, dry) : '';
        if (why) { w.stop(); throw new Error(`arm ${reg.arm}: ${why}; nothing was asked`); }
        return w;
      }, spec.adapter!, warm.packet, warm.options, log), reg.timeoutS * 1000);
      try { await guard.start(); } catch (error) { throw new Refused(error instanceof Error ? error.message : String(error)); }
      const adapters = (reg.worker?.adapters ?? {}) as Record<string, string>;
      if (model && spec.adapter !== 'base' && adapters[spec.adapter!] !== reg.adapterSha256) throw new Refused(`the worker reports adapter "${spec.adapter}" as ${adapters[spec.adapter!] ?? 'absent'}, the file read before the start was ${reg.adapterSha256}`);
      event(`worker ready: ${JSON.stringify(reg.worker)}`);
      kernel = eng ? engineKernel(guard, eng) : glinerKernel(guard, spec.adapter!, { packet: r => buildStateOnlyQuestion(r.context) });
    } else kernel = spec.kernel === 'rules' ? null : spec.kernel === 'null' ? nullKernel : rulesKernel;
    // the packet the receipts hash and name: the state-only packet (the old path, nothing passed) or the registry's packet 5
    const packet = runPacket(reg);
    if (packet) event(`packet: ${reg.packet} (${reg.packetName}); the world carries observeV5 1 from the first tick`);
    // the decode step, with the notes of the checkpoint the run starts from (none at the first start): a held draw
    // after a resume is then the uninterrupted run's
    const decoder: Decoder | undefined = kernel && reg.decodeSpec ? newDecoder(reg.decodeSpec, e.dec) : undefined;
    if (decoder) event(`decode: ${decodeWords(reg.decodeSpec)}${e.dec ? `; ${Object.keys(e.dec).length} animals' notes read from the checkpoint` : ''}`);
    writeRegistry(out, reg);

    const crashAt = a.has('crash-at-tick') ? +a.flag('crash-at-tick') : -1;
    let ticks = e.day * DAY, beat = Date.now(), asked = 0;
    // after every tick: the crash switch, a line every simulated hour once two minutes have passed since the last line (a model day is silent for 15 to 25 minutes otherwise), and the signal
    const stop = () => {
      if (++ticks === crashAt) process.kill(process.pid, 'SIGKILL');
      if (ticks % 240 === 0 && Date.now() - beat > 120_000) { beat = Date.now(); const k = ticks - e.day * DAY; log(`  day ${e.day + 1}: ${Math.floor(k / 240)} of 24 simulated hours, ${asked} asks so far${guard ? `, ${guard.timeouts} timeouts in the run` : ''}`); }
      return signal ? `signal ${signal}` : '';
    };
    while (e.day < reg.daysAsked) {
      const files = new DayFiles(out, e.day + 1, reg.contexts);
      asked = 0;
      const sink = { arrival: (x: Arrival) => files.arrival(x), lines: (l: Line[]) => { files.lines(l); for (const x of l) if (x.k === 'ask') asked++; }, context: (c: Parameters<DayFiles['context']>[0]) => files.context(c) };
      let res: Awaited<ReturnType<typeof runDay>>;
      try { res = await runDay(e, kernel, { sink, journal, guard: guard ?? undefined, stop, minAge: reg.minAge, decoder, packet }); beat = Date.now(); }
      catch (error) {
        files.close(null);
        if (!(error instanceof RunStopped)) { reg.state = 'interrupted'; reg.ended = `failed inside day ${e.day + 1}: ${error instanceof Error ? error.message : error}; the checkpoint of day ${e.day} stands`; event(reg.ended); writeRegistry(out, reg); throw error; }
        reg.state = signal ? 'interrupted' : 'stopped'; reg.ended = `${error.reason}, inside day ${e.day + 1}; the checkpoint of day ${e.day} stands`;
        event(reg.ended); writeRegistry(out, reg);
        return signal ? 130 : 3;
      }
      // the day is safe in this order: its files, its summary, the checkpoint, the registry
      files.close(res.rows);
      res.summary.io = { journalBytes: files.bytes.journal, receiptsBytes: files.bytes.receipts, contextsBytes: files.bytes.contexts, syncs: files.syncs, syncSeconds: +files.syncSeconds.toFixed(1) };
      writeAtomic(resolve(out, 'summary', `${dayName(e.day)}.json`), JSON.stringify(res.summary, null, 1) + '\n');
      const ck = writeCkpt(resolve(out, 'ckpt', `${dayName(e.day)}.json.gz`), e);
      pruneCkpts(out, 2);
      reg.days.push(res.summary);
      journal.clear(); // the journal of an interrupted segment covers the day that was in progress, which is now done
      if (e.day <= STOP.day) rows15.push(...res.rows);
      log(`${progressLine(reg, res.summary, startedMs, reg.hours)}; checkpoint ${(ck.bytes / 1e6).toFixed(1)} MB, receipts ${(files.bytes.receipts / 1e6).toFixed(2)} MB, contexts ${(files.bytes.contexts / 1e6).toFixed(2)} MB before gzip, ${files.syncs} fsyncs in ${files.syncSeconds.toFixed(1)} s`);
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
  } catch (error) {
    if (error instanceof Refused && reg.state === 'running') { reg.state = 'interrupted'; reg.ended = `refused before the first day: ${error.message}`; writeRegistry(out, reg); }
    throw error;
  } finally { closeDown(); }
}

/**
 * Stage R13: stage R7's own card and row readers at the population unit (scripts/r7-card.ts armReaders, unit P) as a tap
 * of a replay, so that a run of this script is read by the code that reads stage R7's control arms and its file can
 * stand beside theirs (scripts/r7-report.ts --engine, scripts/r13-report.ts). The readers connect module-level taps, as
 * the field tap does: a replay carries one or the other.
 */
export function r7Tap(reg: Pick<Registry, 'params' | 'minAge'>, days: number): Tap {
  let readers: ReturnType<typeof armReaders> | null = null, focal: { id: number; cls: string }[] = [], focalTroop = -1, living = 0, driven = 0, rgMinAge = MIN_AGE;
  return { name: 'r7',
    start(w) { focal = focalSet(w); focalTroop = index(w).byId.get(focal[0]?.id ?? -1)?.troopId ?? -1; living = w.chimps.filter(c => c.alive).length; readers = armReaders(w, 'P', days, focal.map(f => f.id)); rgMinAge = paramsOf(w).rgMinAge; driven = w.chimps.filter(c => c.alive && c.age >= reg.minAge).length; },
    before() { readers?.before(); },
    tick() { readers?.after(); },
    end(w) { return { focal, focalTroop, rgMinAge, living: { start: living, end: w.chimps.filter(c => c.alive).length, driven }, ...readers!.finish(reg.params) }; } };
}

async function replay(a: Args): Promise<number> {
  if (!a.pos[0]) throw new Refused('replay <out>');
  const out = resolve(a.pos[0]), reg = readRegistry(out), taps: Tap[] = [];
  if (a.has('r7')) {
    // stage R13: the replay read by stage R7's readers at the population unit and written as an arm file beside the control arms
    const dir = resolve(ROOT, a.flag('r7')), file = resolve(dir, 'P', `s${reg.seed}`, `${reg.label}.json`), days = reg.days.length;
    if (!a.flag('r7') || a.flag('r7').startsWith('--')) throw new Refused('replay <out> --r7 <the folder of the control arms>');
    if (reg.profile !== 'field') throw new Refused('--r7 reads a run of the field map (stage R7\'s population unit)');
    if (reg.label in CONTROL_ARMS || reg.label === PLAIN_RULES) throw new Refused(`the run's label "${reg.label}" is a control arm's name`);
    const r = await replayRun(out, { taps: [r7Tap(reg, days)], field: false, log: s => console.log(s) });
    if (!r.ok) { console.log(`THE RECEIPTS DO NOT REPRODUCE THE RUN (${r.hashes.filter(h => h.run === h.replay).length} of ${r.hashes.length} day hashes equal, ${r.missing} missing, ${r.linesDiffer} lines differ): no arm file is written`); return 1; }
    const got = r.taps.r7 as Pick<ArmFile, 'focal' | 'focalTroop' | 'rgMinAge' | 'living' | 'card' | 'rows' | 'counts'>, g = gitState(ROOT);
    const arm: ArmFile = { stage: 'r7-card', unit: 'P', seed: reg.seed, arm: reg.label, spec: { engine: reg.name, arm: reg.arm, adapter: reg.adapter, packet: reg.packet, decode: reg.decodeSpec ?? null, gate: reg.switches.kernelGate, under: reg.under, run: rel(out), runCommit: reg.commit },
      burnIn: reg.burnInDays, days, paramsFile: reg.paramsFile, head: g.commit.slice(0, 7), dirty: g.dirty.length > 0, burnInHash: reg.burnInHash, startHash: reg.startHash, endHash: r.hashes[r.hashes.length - 1]?.replay ?? reg.startHash, seconds: r.seconds,
      deaths: r.summaries.flatMap(d => d.deaths).map(d => ({ id: d.id, cause: d.cause, focal: got.focal.some(f => f.id === d.id) })), ...got };
    mkdirSync(dirname(file), { recursive: true });
    writeAtomic(file, JSON.stringify(arm) + '\n');
    console.log(`the receipts reproduce the run (${r.hashes.length} of ${r.hashes.length} day hashes equal, 0 of ${r.lines} lines differ); read by stage R7's readers at the population unit: ${got.card.animals.length} animals, ${days} days; wrote ${rel(file)}`);
    return 0;
  }
  // stage R7's timing card reads every replay through the tap hook, like a --taps module, unless it is left out
  if (!a.has('no-card')) taps.push(cardTap(reg));
  for (const p of a.flag('taps').split(',').filter(Boolean)) {
    const mod = await import(pathToFileURL(resolve(p)).href) as { default?: unknown; tap?: unknown }, make = mod.default ?? mod.tap;
    taps.push((typeof make === 'function' ? await (make as (r: Registry) => Tap | Promise<Tap>)(reg) : make) as Tap);
  }
  const r = await replayRun(out, { taps, field: !a.has('no-field'), log: s => console.log(s) });
  mkdirSync(resolve(out, 'replay'), { recursive: true });
  writeAtomic(resolve(out, 'replay', 'replay.json'), JSON.stringify({ tool: 'r10-night-replay', version: 1, replayed: now(), head: gitState(ROOT).commit, runCommit: reg.commit, note: reg.stage === 'R13' ? `${reg.name}; ${reg.under}; one world seed and one training of the recipe: a level measurement, read by scripts/r13-report.ts (docs/staging/r13-prereg.md §8)` : `${reg.name}; ${reg.under}; a level measurement on one seed: no comparison is a result until a fresh unseen seed is run`, ...r }, null, 1) + '\n');
  writeAtomic(resolve(out, 'replay', 'replay.md'), replayReport(reg, r));
  console.log(`${r.ok ? 'the receipts reproduce the run' : 'THE RECEIPTS DO NOT REPRODUCE THE RUN'}: ${r.hashes.filter(h => h.run === h.replay).length} of ${r.hashes.length} day hashes equal, ${r.missing} missing, ${r.menuDiffers} menus differ, ${r.linesDiffer} of ${r.lines} lines differ, ${r.rowsDiffer} row files differ; ${r.seconds} s; wrote ${rel(resolve(out, 'replay', 'replay.md'))} and replay.json`);
  return r.ok ? 0 : 1;
}

function status(a: Args): number {
  if (!a.pos[0]) throw new Refused('status <out>');
  const reg = readRegistry(resolve(a.pos[0])), d = reg.days, sum = (g: (x: DaySummary) => number) => d.reduce((s, x) => s + g(x), 0), asks = sum(x => x.asks);
  console.log(`${reg.label}: ${reg.name}; arm ${reg.arm}${reg.adapter ? ` (${reg.adapter})` : ''}, decode ${decodeWords(reg.decodeSpec)}, packet ${reg.packet}, seed ${reg.seed} (${reg.seedRole}), ${reg.profile} map; ${reg.under}`);
  console.log(`state: ${reg.state}${reg.ended ? ` (${reg.ended})` : ''}; ${d.length} of ${reg.daysAsked} days; commit ${reg.commit.slice(0, 10)}${reg.dirty ? ' (tree not clean)' : ''}; ${reg.segments.length} segment${reg.segments.length === 1 ? '' : 's'} (${reg.segments.length - 1} resume${reg.segments.length === 2 ? '' : 's'}); updated ${reg.updated}`);
  // a signal to the script's own process is the clean stop; one sent to the whole launch (Ctrl-C, a closed terminal) can
  // kill it in the middle of its close-down, which a resume treats as a crash (docs/staging/r10-prereg.md §10.6)
  if (reg.state === 'running' && reg.segments.length) console.log(`if it is still running, its process is pid ${reg.segments[reg.segments.length - 1].pid}: kill -TERM that pid stops it cleanly after the tick in progress (state "interrupted"); if that process is gone, the run died and is continued with run --resume`);
  if (d.length) {
    const calls = sum(x => x.calls), ks = sum(x => x.kernelSeconds), fb: Record<string, number> = {};
    for (const x of d) for (const [k, v] of Object.entries(x.fallbacks)) fb[k] = (fb[k] ?? 0) + v;
    console.log(`asks ${asks} (${(asks / d.length).toFixed(0)} a day), kernel settled ${sum(x => x.kernel)}, the rules ${asks - sum(x => x.kernel)}${Object.keys(fb).length ? ` (${Object.entries(fb).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}, gate held ${sum(x => x.held)}; ${calls ? (ks / calls).toFixed(2) : 'no'} s a call; timeouts ${sum(x => x.timeouts)}; worker starts ${sum(x => x.workerStarts)}`);
    console.log(`deaths ${sum(x => x.deaths.length)}${sum(x => x.deaths.length) ? ` (${d.flatMap(x => x.deaths).map(x => `${x.name} ${x.cause ?? 'unknown'}`).join(', ')})` : ''}; living ${d[d.length - 1].living}; wall ${(sum(x => x.wallSeconds) / 3600).toFixed(2)} h; last hash ${d[d.length - 1].hash}`);
  }
  if (d.length && reg.kernel !== 'gliner' && reg.kernel !== 'rules') {
    // what a model would need for the same days: this run's asks per day at a model's seconds per ask, plus this run's own (no-model) seconds per day
    const perDay = asks / d.length, own = sum(x => x.wallSeconds) / d.length, at = [0.44, 0.5, 0.6, 0.76].map(sec => ({ sec, min: (perDay * sec + own) / 60 })); // 0.44 offline; 0.46 to 0.62 the loop's medians; 0.76 the slowest mean per call of R5-gate's windows (1,377 calls in 1,050 s, two timeouts in it)
    console.log(`projection for a model on these days: ${perDay.toFixed(0)} asks a day (${(perDay / d[d.length - 1].driven).toFixed(1)} per animal on the kernel) and ${own.toFixed(0)} s a day without a model; at ${at.map(x => `${x.sec} s an ask ${x.min.toFixed(1)} min a simulated day, ${Math.floor(600 / x.min)} days in 10 hours`).join('; at ')}`);
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
  const sealed = populationSeedRefusal(seed, null), packetFlag = a.flag('packet', 'state');
  if (sealed) throw new Refused(sealed);
  if (!(PACKET_NAMES as readonly string[]).includes(packetFlag)) throw new Refused(`--packet ${PACKET_NAMES.join(' | ')}`);
  // --packet p5b | p5a: the plain world of a packet 5 run (observeV5 1 from the first tick), with its hash once the animals' own record is removed
  const v5 = packetFlag !== 'state', own = (w: World) => v5 ? `; without the animals' own record ${hashWithoutOwn(w)}` : '';
  const params: Record<string, number> = { ...JSON.parse(readFileSync(resolve(ROOT, a.flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json')), 'utf8')) as Record<string, number>, ...(v5 ? LOOP_SWITCHES : { observeV4: 1, menuParity: 1 }) };
  const t0 = Date.now(), w = createWorld(seed, { profile, params });
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  console.log(`plain rules world${v5 ? ' with observeV5 1' : ''}, seed ${seed}, ${profile} map: after ${burnIn} days ${worldHash(w)}${own(w)}`);
  for (let d = 1; d <= days; d++) { for (let i = 0; i < DAY; i++) tickWorld(w); console.log(`day ${d}: ${worldHash(w)}${own(w)}`); }
  console.log(`${Math.round((Date.now() - t0) / 1000)} s`);
  return 0;
}

/**
 * Stage R13 (docs/staging/r13-prereg.md §8): stage R7's sixteen no-model control arms at the population unit (eight rules
 * re-draws, random choice twice, the rules with 10, 20 and 30% of choices random twice each), by stage R7's own code
 * (scripts/r7-card.ts runArm), on the burned-in world a run of this script with the same seed and packet starts from, for
 * `--days` days. The files are stage R7's arm files (<out>/P/s<seed>/<arm>.json). An arm on file is not run again. With
 * them, as `rules-plain.json`: the same code on the rules world with no salt (the exact check of the instrument).
 */
function controls(a: Args): number {
  const log = (s: string) => console.log(`[${clock(new Date())}] ${s}`), g = gitState(ROOT);
  const seed = +a.flag('seed', 'NaN'), days = +a.flag('days', 'NaN'), burnInDays = +a.flag('burn-in', '30'), packetFlag = a.flag('packet', 'p5b');
  if (!Number.isInteger(seed) || seed < 0) throw new Refused('--seed N is required (a non-negative integer)');
  if (RESERVED_SEEDS.has(seed)) throw new Refused(`seed ${seed} is a reserved or retired seed (AGENTS.md)`);
  const sealed = populationSeedRefusal(seed, null);
  if (sealed) throw new Refused(sealed);
  if (!Number.isInteger(days) || days < 1 || !Number.isInteger(burnInDays) || burnInDays < 0) throw new Refused('--days N is required (the whole days the model arm completed); --burn-in is a whole number of days');
  if (!(PACKET_NAMES as readonly string[]).includes(packetFlag)) throw new Refused(`--packet ${PACKET_NAMES.join(' | ')}`);
  if (g.dirty.length && !a.has('allow-dirty')) throw new Refused(`the tree is not clean (${g.dirty.length} entries, e.g. ${g.dirty.slice(0, 3).join('; ')}): commit first`);
  const names = a.flag('arms', Object.keys(CONTROL_ARMS).join(',')).split(',').filter(Boolean);
  for (const n of names) if (!CONTROL_ARMS[n]) throw new Refused(`unknown control arm ${n}; known: ${Object.keys(CONTROL_ARMS).join(', ')}`);
  const paramsFile = a.flag('params-file', 'docs/staging/integrator-kit/params/M6-W50.json'), text = readFileSync(resolve(ROOT, paramsFile), 'utf8'), v5 = packetFlag !== 'state';
  const params: Record<string, number> = { ...JSON.parse(text) as Record<string, number>, ...(v5 ? LOOP_SWITCHES : { observeV4: 1, menuParity: 1 }) };
  const out = resolve(ROOT, a.flag('out', 'artifacts/r13/card')), dir = resolve(out, 'P', `s${seed}`), disk = diskRefusal(out);
  if (disk.refusal) throw new Refused(disk.refusal);
  const { base, burnInHash, plainHash } = baseWorld({ seed, profile: 'field', params, burnInDays, paramsFile, paramsSha256: createHash('sha256').update(text).digest('hex'), commit: g.commit, dirty: g.dirty.length > 0 }, a.flag('burnin-dir', 'artifacts/r10/burnin'), log);
  const focal = focalSet(base), focalTroop = index(base).byId.get(focal[0].id)!.troopId;
  log(`control arms of stage R7 at the population unit: seed ${seed}, ${days} days after ${burnInDays}; burn-in hash ${burnInHash}${plainHash ? ` (without the animals' own record: the burn-in without observeV5, ${plainHash})` : ''}`);
  mkdirSync(dir, { recursive: true });
  // beside the sixteen (unless --arms names some): stage R7's own code on the rules world with no salt, the world the paired
  // rules arm continues; scripts/r13-report.ts reads the two against each other, readout by readout (the exact check of the instrument)
  const specs: [string, ControlSpec][] = [...names.map(n => [n, CONTROL_ARMS[n]] as [string, ControlSpec]), ...(a.has('arms') ? [] : [[PLAIN_RULES, { share: null, salt: 0 }] as [string, ControlSpec]])];
  for (const [name, spec] of specs) {
    const file = resolve(dir, `${name}.json`);
    if (existsSync(file)) {
      const was = JSON.parse(readFileSync(file, 'utf8')) as ArmFile;
      if (was.days !== days || was.burnInHash !== burnInHash) throw new Refused(`${rel(file)} is on file for ${was.days} days from burn-in ${was.burnInHash}; this call asks ${days} days from ${burnInHash}: another folder (--out), or delete the folder's arms together`);
      log(`${name}: on file; not run again`);
      continue;
    }
    const r = controlRun(base, spec, 'P', days, focal, params, s => log(`  ${name} ${s}`));
    const arm: ArmFile = { stage: 'r7-card', unit: 'P', seed, arm: name, spec, burnIn: burnInDays, days, paramsFile, head: g.commit.slice(0, 7), dirty: g.dirty.length > 0, burnInHash, focal, focalTroop, ...r };
    writeAtomic(file, JSON.stringify(arm) + '\n');
    log(`wrote ${rel(file)}: end hash ${r.endHash}, ${r.seconds} s, deaths ${r.deaths.length}`);
  }
  return 0;
}

/** Real tokens over the project's estimate for the packet P5b at the median, as stage R11 counted it with the tokenizer alone (340 of 409: docs/staging/r11-prereg.md §11.7). */
export const P5B_REAL_OVER_ESTIMATE = 0.83;
/** Seconds an ask of the packet P5b, for the projection of a night: stage R11's smoke run (0.32, one packet at a time) and its first night's two P5b draw arms on seed 4111 (0.41 with the top pick, 0.50 under a draw, on a shared machine). */
export const P5B_SECONDS_PER_ASK = [0.32, 0.41, 0.5];
export interface PacketCheck { asks: number; reached: number; rebuilt: number; same: number; noContext: number; tokensDiffer: number; overBudget: number; tokens: { median: number | null; p95: number | null; max: number | null; mean: number | null } }
/**
 * Every packet of a run, rebuilt from its saved context by the one builder (scripts/lib/r11-packets.ts packetOf, which
 * stage R11's loop sends from): its hash against the receipt's `sha`, and its estimated length. `same` equal to `reached`
 * says the run's kernel was sent, at every decision point, the packet stage R11's loop builds for that decision point.
 */
export function checkPackets(name: PacketName, lines: Line[], contexts: { t: number; id: number; v: number; context: DecisionContext }[]): PacketCheck {
  const by = new Map(contexts.map(c => [keyOf(c.t, c.id, c.v), c.context])), est: number[] = [];
  const out: PacketCheck = { asks: 0, reached: 0, rebuilt: 0, same: 0, noContext: 0, tokensDiffer: 0, overBudget: 0, tokens: { median: null, p95: null, max: null, mean: null } };
  for (const l of lines) {
    if (l.k !== 'ask') continue;
    out.asks++;
    if (l.sha === '') continue;   // the request was refused before a packet was built (fewer than two options, an invalid context)
    out.reached++;
    if (l.refusal === 'kernel-error' && /^packet over the token budget/.test(l.detail)) out.overBudget++;
    const ctx = by.get(keyOf(l.t, l.id, l.v));
    if (!ctx) { out.noContext++; continue; }
    const packet = packetOf(name, ctx), tokens = tokensOf(packet);
    out.rebuilt++; est.push(tokens);
    if (sha16(JSON.stringify(packet)) === l.sha) out.same++;
    if (tokens !== l.tokens) out.tokensDiffer++;
  }
  est.sort((x, y) => x - y);
  const q = (p: number) => est.length ? est[Math.min(est.length - 1, Math.floor(p * est.length))] : null;
  out.tokens = { median: q(0.5), p95: q(0.95), max: est.length ? est[est.length - 1] : null, mean: est.length ? est.reduce((x, y) => x + y, 0) / est.length : null };
  return out;
}

function packets(a: Args): number {
  if (!a.pos[0]) throw new Refused('packets <out> [--hours 9]');
  const out = resolve(a.pos[0]), reg = readRegistry(out), name: PacketName = reg.packetName ?? 'state', days = reg.days.length, hours = +a.flag('hours', String(R13.hours));
  if (!reg.contexts) throw new Refused('the run saved no contexts (--no-contexts, or the rules arm): its packets cannot be rebuilt');
  const lines: Line[] = [], contexts: { t: number; id: number; v: number; context: DecisionContext }[] = [];
  for (let d = 1; d <= days; d++) { lines.push(...readLines<Line>(resolve(out, 'receipts', `${dayName(d)}.jsonl`))); contexts.push(...readLines<{ t: number; id: number; v: number; context: DecisionContext }>(resolve(out, 'contexts', `${dayName(d)}.jsonl`))); }
  const c = checkPackets(name, lines, contexts), asks = lines.filter((l): l is AskLine => l.k === 'ask');
  const pkOk = name === 'state' ? asks.every(l => l.pk === undefined) : asks.every(l => l.pk === reg.packet), ok = c.same === c.reached && c.noContext === 0 && c.tokensDiffer === 0 && pkOk;
  console.log(`${reg.label}: packet ${reg.packet} (${name}), decode ${decodeWords(reg.decodeSpec)}; ${days} days, ${c.asks} asks, ${c.reached} reached the kernel's packet builder`);
  console.log(`${ok ? 'every packet is the one stage R11\'s builder gives for its decision point' : 'THE PACKETS DIFFER'}: ${c.same} of ${c.reached} rebuilt from their saved contexts hash to the receipt's sha; ${c.noContext} without a saved context; ${c.tokensDiffer} with another token estimate; every ask line ${pkOk ? 'carries' : 'DOES NOT carry'} the packet version ${name === 'state' ? '(none on the state-only path)' : reg.packet}`);
  const t = c.tokens, real = name === 'p5b' ? P5B_REAL_OVER_ESTIMATE : null, r = (v: number | null) => v === null ? 'no value' : real === null ? `${Math.round(v)}` : `${Math.round(v)} (about ${Math.round(v * real)} real)`;
  console.log(`estimated input tokens${real === null ? '' : ` (real tokens projected at ${real} of the estimate, the ratio stage R11 counted for this packet)`}: median ${r(t.median)}, mean ${r(t.mean)}, 95th percentile ${r(t.p95)}, largest ${r(t.max)}; ${c.overBudget} of ${c.reached} over the kernel's budget on the estimate (those asks went to the rules)`);
  if (days) {
    const sum = (f: (x: DaySummary) => number) => reg.days.reduce((s, x) => s + f(x), 0), perDay = sum(x => x.asks) / days, driven = reg.days[days - 1].driven, own = sum(x => x.wallSeconds - (reg.kernel === 'gliner' && reg.adapter !== 'fake' ? x.kernelSeconds : 0)) / days;
    const at = P5B_SECONDS_PER_ASK.map(sec => { const min = (perDay * sec + own) / 60; return `at ${sec} s an ask ${min.toFixed(1)} min a simulated day, ${Math.floor(hours * 60 / min)} days in ${hours} hours`; });
    console.log(`projection of a night on these asks: ${perDay.toFixed(0)} asks a day (${driven ? (perDay / driven).toFixed(1) : 'no value'} per animal on the kernel) and ${own.toFixed(0)} s a day without a model; ${at.join('; ')}`);
  }
  return ok ? 0 : 1;
}

/** Stage R13: the decode rule of docs/staging/r13-prereg.md §3, read from stage R11's generated numbers file: "<decode> <arm> <N1> <S0>", then the reason. */
function rule(a: Args): number {
  const file = a.pos[0] ? resolve(a.pos[0]) : '', r = decodeRule(file && existsSync(file) ? readFileSync(file, 'utf8') : null);
  console.log([r.decode, r.arm, r.n1.replace(' ', '-'), r.s0.replace(' ', '-')].join(' '));
  console.log(r.why);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2), a = parseArgs(rest);
  (async () => cmd === 'run' ? run(a) : cmd === 'replay' ? replay(a) : cmd === 'status' ? status(a) : cmd === 'plain' ? plain(a) : cmd === 'controls' ? controls(a) : cmd === 'packets' ? packets(a) : cmd === 'rule' ? rule(a)
    : (console.error('usage: r10-night.ts run|replay|status|plain|controls|packets|rule … (see the header of scripts/r10-night.ts)'), 2))()
    .then(code => process.exit(code), error => { if (error instanceof Refused) { console.error(`r10-night refused: ${error.message}`); process.exit(2); } console.error(error); process.exit(1); });
}
