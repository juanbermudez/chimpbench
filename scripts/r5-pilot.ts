// Stage R5 pilot (docs/staging/r5-pilot-prereg.md): the first run of a trained decision model choosing for chimpanzees
// inside the simulation. A focal group (scripts/em-loop.ts focalSet, M3's rule) is driven by one kernel per arm in
// lockstep; everyone else, and every animal of the rules arm, stays on the rules. Every arm continues an exact copy of
// one burned-in world (structuredClone; World is JSON-lossless), so the arms share the world, the animals and the days.
//
// The step is the one every kernel shares since stage R1 (src/kernel/loop.ts answerWaiting): the request (buildRequest),
// the request validation, the kernel, the answer check, applyDecision's legality re-check, and the rules for anything
// refused. The model kernel is scripts/lib/kernels.ts glinerKernel with the state-only packet of stage R4
// (scripts/lib/packet-state.ts): the text `r4-rules-state` was trained on. Worlds carry observeV4 1 and menuParity 1
// (the packet's fields; every kernel's menu is the rules' menu); kernelGate and kernelNoRulesPick are set per arm on the
// copy (read only when a kernel other than the rules decides: tests/kernel.test.ts).
//
// Every kernel pass is written to a receipt log (one JSON line: tick, animal, decision version, the menu, the answer,
// who chose, the time it took). --replay <dir> answers from such a log instead of a kernel: no model, and the end hash
// says whether the log reproduces the world.
//
//   pnpm exec tsx scripts/r5-pilot.ts --seed 48 --arms rules,rules-r1,null,argmax,untuned,trained [--burn-in 30] [--days 5]
//     [--params-file docs/staging/integrator-kit/params/M6-W50.json] [--out artifacts/r5/pilot] [--replay <dir>] [--timeout-s 120]
// Model arms need the runtime variables of HANDOFF.md §3 item 3 and MGOGO_FT_ROOT, MGOGO_FT_ADAPTERS (r4-rules-state).
// Development seeds only (48, 7). At most five days per run.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { activityCategory, CATEGORIES } from '../src/field/categories';
import { nullKernel, rulesKernel } from '../src/kernel/kernels';
import { answerWaiting } from '../src/kernel/loop';
import { KernelError, type Kernel, type KernelAnswer, type KernelRequest } from '../src/kernel/types';
import { candidateMeta, V } from '../src/sim/candidates';
import { bodyFieldError } from '../src/sim/context-check';
import { reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { cropTarget } from '../src/sim/phenology';
import { random } from '../src/sim/rng';
import { index, ix, TICK_HOURS, TICK_SECONDS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { worldHash } from '../tests/fixtures/golden';
import { focalSet } from './em-loop';
import { familyOf } from './em-sample';
import { Worker, type Scorer } from './ft-society';
import { glinerKernel } from './lib/kernels';
import { buildStateOnlyQuestion, tokensOf } from './lib/packet-state';

export const DAY = Math.round(24 / TICK_HOURS), TICK_MIN = TICK_HOURS * 60;
export const MAX_DAYS = 5;

/** An arm: who chooses for the focal animals, and the loop's two settings. `redraw`: a rules world with its random stream advanced by that many draws (the noise reference). */
export interface ArmSpec { kernel: 'rules' | 'null' | 'argmax' | 'gliner'; adapter?: string; gate?: 1; noPick?: 1; redraw?: number }
export const ARMS: Record<string, ArmSpec> = {
  rules: { kernel: 'rules' },
  'rules-r1': { kernel: 'rules', redraw: 1 }, 'rules-r2': { kernel: 'rules', redraw: 2 }, 'rules-r3': { kernel: 'rules', redraw: 3 },
  null: { kernel: 'null' }, argmax: { kernel: 'argmax' },
  untuned: { kernel: 'gliner', adapter: 'base' }, trained: { kernel: 'gliner', adapter: 'r4-rules-state' },
  'trained-nopick': { kernel: 'gliner', adapter: 'r4-rules-state', noPick: 1 }, 'trained-gate': { kernel: 'gliner', adapter: 'r4-rules-state', gate: 1 },
  'null-nopick': { kernel: 'null', noPick: 1 }, 'null-gate': { kernel: 'null', gate: 1 }, 'argmax-gate': { kernel: 'argmax', gate: 1 },
  'untuned-gate': { kernel: 'gliner', adapter: 'base', gate: 1 },
};

/** One kernel pass, as logged. `index` and `p` are the kernel's raw answer (null when it gave none); `picked` is the position applied (-1: the rules decided). */
export interface Receipt {
  tick: number; t: number; id: number; v: number; phase: string; n: number; rulesIndex: number;
  opts: [string, number][]; fam: string[]; by: 'kernel' | 'rules'; refusal: string; detail: string;
  index: number | null; p: number[] | null; picked: number; sha: string; tokens: number; ms: number;
}
const key = (t: number, id: number, v: number) => `${t.toFixed(6)}:${id}:${v}`;
const famOf = (o: Candidate) => { const m = candidateMeta.get(o); return familyOf(o.action, m?.v ?? V.NONE, m?.aux ?? -1); };

/** A kernel that answers from a receipt log: the logged answer for the same time, animal and decision version, or the logged failure. */
export function replayKernel(log: Receipt[], stats: { missing: number; menuDiffers: number }): Kernel {
  const by = new Map(log.map(r => [key(r.t, r.id, r.v), r]));
  return { id: 'gliner', label: 'replay of a receipt log', decide(request: KernelRequest): KernelAnswer {
    const r = by.get(key(request.context.time, request.context.chimpId, request.context.version));
    if (!r) { stats.missing++; throw new KernelError('no receipt for this decision'); }
    if (r.opts.length !== request.options.length || r.opts.some(([a, t], i) => request.options[i].action !== a || request.options[i].targetId !== t)) stats.menuDiffers++;
    if (r.refusal === 'kernel-error') throw new KernelError(r.detail);
    return { index: r.index ?? undefined, choice: r.index === null ? undefined : `c${r.index}`, probabilities: r.p ?? undefined };
  } };
}

/** A scorer whose call is abandoned after `timeoutMs`: the decision goes to the rules ('timeout') and a new worker is started for the next call (the old one's late line would otherwise answer the wrong question). */
export class GuardedScorer implements Scorer {
  private inner: (Scorer & { stop(): void }) | null = null;
  timeouts = 0; starts = 0;
  constructor(private make: () => Promise<Scorer & { stop(): void }>, private timeoutMs: number) {}
  async start(): Promise<void> { if (!this.inner) { this.inner = await this.make(); this.starts++; } }
  async score(batch: Parameters<Scorer['score']>[0]): Promise<number[][]> {
    await this.start();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new KernelError('timeout')), this.timeoutMs); });
    try { return await Promise.race([this.inner!.score(batch), late]); }
    catch (e) { if (e instanceof KernelError && e.message === 'timeout') { this.timeouts++; this.inner!.stop(); this.inner = null; } throw e; }
    finally { clearTimeout(timer); }
  }
  stop(): void { this.inner?.stop(); this.inner = null; }
}

/** Per focal animal and day of the window. Minutes are daylight minutes (daylight ≥ 0.5) by field category (src/field/categories.ts). */
export interface DayRow {
  id: number; name: string; cls: string; day: number; alive: boolean;
  kcalIn: number; kcalFormula: number; kcalOut: number; reserveKcal: number; reservePct: number;
  min: Record<string, number>; daylightMin: number; km: number; kmFixes: number; nightMin: number; nestShare: number | null;
}
export interface Decisions {
  id: number; name: string; cls: string;
  /** Decision points that reached the loop (one kernel pass each), those the kernel's choice settled, those the rules settled by reason, and acts the loop's gate kept inside the tick without asking (gate arms). */
  points: number; kernel: number; fallbacks: Record<string, number>; gateKept: number;
  /** Decision versions an interrupt advanced inside the tick while the animal waited (src/sim/events.ts interrupt: it invalidates a pending request); not acts. */ interrupts: number;
  /** Rules arms: the rules' own decisions (every new act). */ rulesDecisions: number;
  /** Among kernel passes with the rules' pick on the menu: how many, and how often the kernel's applied choice was it. */ withRulesPick: number; agree: number;
  picks: Record<string, number>; rulesPicks: Record<string, number>;
}
export interface ArmResult {
  arm: string; spec: ArmSpec; seed: number; days: number; replay: boolean;
  seconds: number; kernelSeconds: number; calls: number; msMedian: number | null; msMean: number | null; msP95: number | null;
  timeouts: number; workerStarts: number; replayMissing: number; replayMenuDiffers: number;
  startHash: string; endHash: string; dayHashes: string[]; deaths: { id: number; cause: string | null }[];
  rows: DayRow[]; decisions: Decisions[];
}

const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER); // as scripts/em-loop.ts
const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };
const quantile = (v: number[], q: number) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

/** The copy an arm runs on: the burned-in world with the arm's two loop switches, and for a re-draw its random stream advanced. */
export function armWorld(base: World, spec: ArmSpec): World {
  const w = structuredClone(base), settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, kernelGate: spec.gate ?? 0, kernelNoRulesPick: spec.noPick ?? 0 };
  for (let i = 0; i < (spec.redraw ?? 0); i++) random(w);
  if (spec.kernel !== 'rules') w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep' };
  return w;
}

export async function runArm(base: World, name: string, spec: ArmSpec, days: number, focalIds: { id: number; cls: string }[], kernel: Kernel | null,
  opts: { receipts?: (r: Receipt) => void; replay?: { missing: number; menuDiffers: number }; guard?: GuardedScorer; log?: (s: string) => void } = {}): Promise<ArmResult> {
  if (days > MAX_DAYS) throw new Error(`at most ${MAX_DAYS} days per run (docs/staging/r5-pilot-prereg.md)`);
  if ((spec.kernel === 'rules') !== (kernel === null)) throw new Error(`arm ${name}: a kernel is needed for every arm but the rules`);
  const w = armWorld(base, spec), P = paramsOf(w), idx0 = index(w), t0 = Date.now(), startHash = worldHash(w);
  const focal = new Map(focalIds.map(f => [f.id, f])), names = new Map(focalIds.map(f => [f.id, idx0.byId.get(f.id)!.name]));
  const rows: DayRow[] = [], dec = new Map<number, Decisions>(focalIds.map(f => [f.id, { id: f.id, name: names.get(f.id)!, cls: f.cls, points: 0, kernel: 0, fallbacks: {}, gateKept: 0, interrupts: 0, rulesDecisions: 0, withRulesPick: 0, agree: 0, picks: {}, rulesPicks: {} }]));
  // running state per focal animal: the ledger at the day's start, the last position and 5-min fix, the day's counters
  const st = new Map(focalIds.map(f => { const c = idx0.byId.get(f.id)!, L = ix(c).en; return [f.id, { in0: L?.in ?? 0, fin0: L?.fin ?? L?.in ?? 0, out0: L?.out ?? 0, res0: L?.res ?? 0, px: c.position[0], pz: c.position[2], fx: c.position[0], fz: c.position[2],
    cat: CATEGORIES.map(() => 0), light: 0, night: 0, nest: 0, m: 0, mf: 0 }]; }));
  const ms: number[] = [], last = new Map<number, { ms: number; answer: KernelAnswer | null; sha: string; tokens: number }>();
  // the kernel, timed, with its raw answer kept for the receipt
  const timed: Kernel | null = kernel && { ...kernel, async decide(request, env) {
    const s = performance.now(), packet = buildStateOnlyQuestion(request.context);
    const rec = { ms: 0, answer: null as KernelAnswer | null, sha: createHash('sha256').update(JSON.stringify(packet)).digest('hex').slice(0, 16), tokens: tokensOf(packet) };
    last.set(request.context.chimpId, rec);
    try { rec.answer = await kernel.decide(request, env); return rec.answer; } finally { rec.ms = performance.now() - s; ms.push(rec.ms); }
  } };
  const dayHashes: string[] = [];
  let kernelMs = 0, calls = 0;
  for (let i = 0; i < days * DAY; i++) {
    const before = new Map<number, number>();
    for (const c of w.chimps) { if (timed) c.controller = c.alive && focal.has(c.id) ? 'model' : 'rules'; if (focal.has(c.id)) before.set(c.id, c.decisionVersion); }
    tickWorld(w);
    const idx = index(w);
    // decision versions advanced inside the tick: the rules' own decisions (rules arms); for a kernel arm an act the loop's
    // gate kept (the animal is not waiting afterwards), or an interrupt that invalidated a pending request (it still waits)
    for (const [id, v] of before) { const c = idx.byId.get(id)!, d = dec.get(id)!, n = c.decisionVersion - v; if (n > 0) { if (!timed) d.rulesDecisions += n; else if (c.awaitingDecisionSince === null) d.gateKept += n; else d.interrupts += n; } }
    if (timed) {
      const s = performance.now();
      const results = await answerWaiting(w, c => focal.has(c.id) ? timed : null);
      kernelMs += performance.now() - s;
      for (const r of results) {
        // a pass reached the kernel unless the request itself was refused (a kernel that throws leaves StepResult.calls at 0)
        const d = dec.get(r.chimpId)!, req = r.request!, fam = req.options.map(famOf), asked = r.refusal !== 'fewer-than-two-options' && r.refusal !== 'invalid-context', l = asked ? last.get(r.chimpId) : undefined;
        d.points++; if (asked) calls += Math.max(1, r.calls);
        if (r.by === 'kernel') { d.kernel++; inc(d.picks, fam[r.index]); if (req.rulesIndex >= 0) { d.withRulesPick++; inc(d.rulesPicks, fam[req.rulesIndex]); if (r.index === req.rulesIndex) d.agree++; } }
        else inc(d.fallbacks, r.refusal === 'kernel-error' ? `kernel-error: ${r.detail}` : r.refusal === 'invalid-context' ? `invalid-context: ${r.detail}${r.detail === 'body' ? ` (${bodyFieldError(req.context.body).replace(/=.*/, '')})` : ''}` : r.refusal);
        const a = l?.answer ?? null;
        opts.receipts?.({ tick: w.tick, t: +req.context.time.toFixed(6), id: r.chimpId, v: req.context.version, phase: req.context.environment.phase, n: req.options.length, rulesIndex: req.rulesIndex,
          opts: req.options.map(o => [o.action, o.targetId]), fam, by: r.by, refusal: r.refusal, detail: r.refusal === 'invalid-context' && r.detail === 'body' ? `body: ${bodyFieldError(req.context.body)}` : r.detail,
          index: a && typeof a.index === 'number' ? a.index : null, p: a && Array.isArray(a.probabilities) ? a.probabilities as number[] : null, picked: r.by === 'kernel' ? r.index : -1,
          sha: l?.sha ?? '', tokens: l?.tokens ?? 0, ms: l ? +l.ms.toFixed(1) : 0 });
      }
    }
    // measurement only: nothing below writes the world
    const env = w.environment, light = env.daylight >= 0.5, night = env.daylight <= 0.03, day = Math.floor(i / DAY), endOfDay = (i + 1) % DAY === 0;
    for (const f of focalIds) {
      const c = idx.byId.get(f.id)!, s = st.get(f.id)!;
      if (c.alive) {
        const x = ix(c);
        s.m += Math.min(Math.hypot(c.position[0] - s.px, c.position[2] - s.pz), P.runMps * TICK_SECONDS * 2); s.px = c.position[0]; s.pz = c.position[2];
        if (w.tick % 20 === 0) { s.mf += Math.hypot(c.position[0] - s.fx, c.position[2] - s.fz); s.fx = c.position[0]; s.fz = c.position[2]; }
        if (light) {
          let groomed = false;
          if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') for (const m of idx.alive) if (m.action === 'groom' && m.targetId === c.id && m.alive && ix(m).phase >= 1) { groomed = true; break; }
          let atW = false;
          if (c.action === 'drink') { const site = idx.waterById.get(c.targetId); atW = !!site && (site.position[0] - c.position[0]) ** 2 + (site.position[2] - c.position[2]) ** 2 <= 1.44; }
          const k = activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atW);
          if (k < CATEGORIES.length) { s.cat[k]++; s.light++; }
        }
        if (night) { s.night++; if (inNest(c)) s.nest++; }
      }
      if (endOfDay) {
        const L = ix(c).en, cap = reserveCap(c, P), now = { in: L?.in ?? 0, fin: L?.fin ?? L?.in ?? 0, out: L?.out ?? 0, res: L?.res ?? 0 };
        rows.push({ id: f.id, name: names.get(f.id)!, cls: f.cls, day, alive: c.alive,
          kcalIn: Math.round(now.in - s.in0), kcalFormula: Math.round(now.fin - s.fin0), kcalOut: Math.round(now.out - s.out0), reserveKcal: Math.round(now.res - s.res0), reservePct: +(100 * (now.res - s.res0) / cap).toFixed(4),
          min: Object.fromEntries(CATEGORIES.map((n, k) => [n, +(s.cat[k] * TICK_MIN).toFixed(2)])), daylightMin: +(s.light * TICK_MIN).toFixed(2),
          km: +(s.m / 1000).toFixed(4), kmFixes: +(s.mf / 1000).toFixed(4), nightMin: +(s.night * TICK_MIN).toFixed(2), nestShare: s.night ? +(s.nest / s.night).toFixed(4) : null });
        Object.assign(s, { in0: now.in, fin0: now.fin, out0: now.out, res0: now.res, cat: CATEGORIES.map(() => 0), light: 0, night: 0, nest: 0, m: 0, mf: 0 });
      }
    }
    if (endOfDay) { dayHashes.push(worldHash(w)); opts.log?.(`${name} day ${day + 1}/${days}: ${Math.round((Date.now() - t0) / 1000)} s (kernel ${Math.round(kernelMs / 1000)} s, ${calls} calls${opts.guard ? `, ${opts.guard.timeouts} timeouts` : ''})`); }
  }
  const deaths = w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime >= base.time).map(c => ({ id: c.id, cause: c.causeOfDeath }));
  const mean = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
  return { arm: name, spec, seed: w.seed, days, replay: !!opts.replay, seconds: Math.round((Date.now() - t0) / 1000), kernelSeconds: Math.round(kernelMs / 1000), calls,
    msMedian: quantile(ms, 0.5), msMean: mean, msP95: quantile(ms, 0.95), timeouts: opts.guard?.timeouts ?? 0, workerStarts: opts.guard?.starts ?? 0,
    replayMissing: opts.replay?.missing ?? 0, replayMenuDiffers: opts.replay?.menuDiffers ?? 0, startHash, endHash: worldHash(w), dayHashes, deaths, rows, decisions: [...dec.values()] };
}

/**
 * The season of a window, without running anything: the phenology crop (before depletion; src/sim/phenology.ts
 * cropTarget, a pure function of the tree and the time) summed over the trees inside the focal community's range, at
 * noon of each of the 365 days from the world's start. Returns the yearly curve's quantiles and each named day's rank.
 */
export function season(base: World, troopId: number, windows: Record<string, [number, number]>): { treesInRange: number; yearMean: number; tercileLow: number; tercileHigh: number; windows: Record<string, { fromDay: number; toDay: number; mean: number; relativeToYearMean: number; rankInYear: number; word: 'lean' | 'middle' | 'rich' }> } {
  const troop = base.troops.find(t => t.id === troopId)!, r2 = troop.radius ** 2;
  const trees = base.trees.filter(t => (t.position[0] - troop.center[0]) ** 2 + (t.position[2] - troop.center[2]) ** 2 <= r2);
  const curve = Array.from({ length: 365 }, (_, d) => { const time = d * 24 + 5.5; let s = 0; for (const t of trees) s += cropTarget(base, t, time); return s; });
  const sorted = [...curve].sort((a, b) => a - b), yearMean = curve.reduce((a, b) => a + b, 0) / 365, lo = sorted[Math.floor(365 / 3)], hi = sorted[Math.floor(2 * 365 / 3)];
  const out: ReturnType<typeof season>['windows'] = {};
  for (const [k, [a, b]] of Object.entries(windows)) {
    const v = curve.slice(a, b), mean = v.reduce((x, y) => x + y, 0) / v.length;
    out[k] = { fromDay: a, toDay: b, mean: Math.round(mean), relativeToYearMean: +(mean / yearMean).toFixed(3), rankInYear: +(sorted.filter(x => x < mean).length / 365).toFixed(3), word: mean < lo ? 'lean' : mean > hi ? 'rich' : 'middle' };
  }
  return { treesInRange: trees.length, yearMean: Math.round(yearMean), tercileLow: Math.round(lo), tercileHigh: Math.round(hi), windows: out };
}

const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };

if (process.argv[1]?.endsWith('r5-pilot.ts')) {
  const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  const seed = +arg('seed', '48');
  if (seed !== 48 && seed !== 7) throw new Error('development seeds 48 and 7 only');
  const burnIn = +arg('burn-in', '30'), days = +arg('days', '5'), arms = arg('arms', 'rules').split(','), replayDir = arg('replay', '');
  if (days > MAX_DAYS) throw new Error(`at most ${MAX_DAYS} days per run`);
  for (const a of arms) if (!ARMS[a]) throw new Error(`unknown arm ${a}; known: ${Object.keys(ARMS).join(', ')}`);
  const paramsFile = arg('params-file', 'docs/staging/integrator-kit/params/M6-W50.json'), out = resolve(arg('out', 'artifacts/r5/pilot'), `s${seed}`);
  // runs only from a committed head with a clean tree (--allow-dirty is for the smoke checks of a script under edit; its outputs say so)
  const head = git('rev-parse --short HEAD'), dirty = git('status --porcelain') !== '';
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('the tree is not clean: commit first (docs/staging/r5-pilot-prereg.md, hard rules)');
  const params = { ...JSON.parse(readFileSync(resolve(paramsFile), 'utf8')), observeV4: 1, menuParity: 1 };
  (async () => {
    const t0 = Date.now(), cache = resolve(arg('cache', `artifacts/r5/burnin-${paramsFile.replace(/^.*\//, '').replace(/\.json$/, '')}-s${seed}-d${burnIn}.json`));
    let base: World;
    if (existsSync(cache)) base = JSON.parse(readFileSync(cache, 'utf8')) as World;
    else {
      base = createWorld(seed, { profile: 'field', params });
      for (let i = 0; i < burnIn * DAY; i++) tickWorld(base);
      mkdirSync(dirname(cache), { recursive: true });
      writeFileSync(cache, JSON.stringify(base));
    }
    const focal = focalSet(base), burnInHash = worldHash(base), troopId = index(base).byId.get(focal[0].id)!.troopId;
    console.log(`seed ${seed}: burn-in ${burnIn} d in ${Math.round((Date.now() - t0) / 1000)} s, hash ${burnInHash}; focal ${JSON.stringify(focal)}`);
    mkdirSync(out, { recursive: true });
    let workerReady: Record<string, unknown> | null = null;
    const guard = !replayDir && arms.some(a => ARMS[a].kernel === 'gliner')
      ? new GuardedScorer(async () => { const w = new Worker(arg('device', 'mps')); await w.start(); workerReady = w.ready; console.log(`worker ready ${JSON.stringify(w.ready)}`); return w; }, +arg('timeout-s', '120') * 1000) : null;
    await guard?.start();
    for (const name of arms) {
      const spec = ARMS[name], lines: string[] = [], stats = { missing: 0, menuDiffers: 0 };
      let kernel: Kernel | null = null;
      if (spec.kernel !== 'rules') {
        if (replayDir) kernel = replayKernel(readFileSync(resolve(replayDir, `s${seed}`, `${name}.receipts.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as Receipt), stats);
        else kernel = spec.kernel === 'null' ? nullKernel : spec.kernel === 'argmax' ? rulesKernel : glinerKernel(guard!, spec.adapter!, { packet: r => buildStateOnlyQuestion(r.context) });
      }
      const result = await runArm(base, name, spec, days, focal, kernel, { receipts: r => lines.push(JSON.stringify(r)), replay: replayDir ? stats : undefined, guard: !replayDir && spec.kernel === 'gliner' ? guard! : undefined, log: s => console.log(s) });
      const tag = replayDir ? `${name}.replay` : name;
      if (spec.kernel !== 'rules') writeFileSync(resolve(out, `${tag}.receipts.jsonl`), lines.join('\n') + (lines.length ? '\n' : ''));
      writeFileSync(resolve(out, `${tag}.json`), JSON.stringify({ seed, burnIn, days, paramsFile, params, packet: 'state-only (r4-state-1)', head, dirty, burnInHash, focal, focalTroop: troopId,
        season: season(base, troopId, { pilot: [burnIn, burnIn + days], 'r4-train-W50': [6, 10], 'r4-train-W25': [10, 14] }), worker: spec.kernel === 'gliner' ? workerReady : null, result }, null, 1) + '\n');
      console.log(`wrote ${resolve(out, `${tag}.json`)}: end hash ${result.endHash}, ${result.calls} calls, ${result.seconds} s`);
    }
    guard?.stop();
  })().catch(e => { console.error(e); process.exit(1); });
}
