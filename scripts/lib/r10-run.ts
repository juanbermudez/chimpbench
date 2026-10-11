// Stage R10 (docs/staging/r10-prereg.md): the engine of scripts/r10-night.ts, one kernel driving every animal aged 8
// and over for whole simulated days, built to survive a night. It is the loop of scripts/r5-pilot.ts runArm (the same
// step: src/kernel/loop.ts answerWaiting; the same measures) with four differences: every animal of every community
// aged MIN_AGE or over is on the kernel (animals under it stay on the rules); a day is a unit that can be checkpointed
// and resumed; every answer and every receipt goes to a sink as it happens instead of into memory; and each receipt
// says what opened the ask and what the loop's gate held (src/sim/decide.ts loopTap).
//
// Nothing here writes the world except the step itself: the meter, the taps and the sinks read only, and the tests
// compare hashes with plain tickWorld runs to show it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statfsSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { activityCategory, CATEGORIES } from '../../src/field/categories';
import { answerWaiting } from '../../src/kernel/loop';
import { KernelError, type Kernel, type KernelAnswer } from '../../src/kernel/types';
import { worldShapeProblem } from '../../src/persist/envelope';
import { candidateMeta, V } from '../../src/sim/candidates';
import { bodyFieldError } from '../../src/sim/context-check';
import { loopTap } from '../../src/sim/decide';
import { reserveCap } from '../../src/sim/energy';
import { paramsOf } from '../../src/sim/params';
import { index, ix, TICK_HOURS, TICK_SECONDS } from '../../src/sim/state';
import { tickWorld } from '../../src/simulation';
import type { Candidate, Chimp, DecisionContext, World } from '../../src/types';
import { worldHash } from '../../tests/fixtures/golden';
import { familyOf } from '../em-sample';
import type { GuardedScorer } from '../r5-pilot';
import { writeAtomic } from './checkpoint';
import { buildStateOnlyQuestion, tokensOf } from './packet-state';

export const DAY = Math.round(24 / TICK_HOURS), TICK_MIN = TICK_HOURS * 60;
/** The user's decision of 6 October 2026: an engine drives animals aged 8 and over; younger animals stay on the rules. */
export const MIN_AGE = 8;
export const UNDER_AGE = `animals under ${MIN_AGE} years stay on the rules`;
export const RECEIPT_SCHEMA = 'r10-receipt-1';
/** A night counts as spent in a nest at this share of the dark hours (scripts/r5-report.ts NIGHT_IN_NEST). */
export const NIGHT_IN_NEST = 0.9;
/**
 * The stop check after five simulated days (docs/staging/r10-prereg.md §5). Harness thresholds, all design assumptions
 * (they end a night that can no longer answer its question; none is a behavioural constant of the simulation):
 * `starved` deaths by starvation since the burn-in; `reservePctDay` the mean daily change of driven animals' reserves, %
 * of the usual store (pilot: the rules +0.01, r4-rules-state −0.05 to −0.10, random −0.35, untuned −1.61); `nights` the
 * share of driven animal-nights in a nest (pilot: 1.00, untuned 0.78, random 0.48); `fallbacks` and `timeouts` shares
 * of asks (R5-gate: under 1% and 7 in 10,082).
 */
export const STOP = { day: 5, starved: 2, reservePctDay: -1.0, nights: 0.80, fallbacks: 0.10, timeouts: 0.02 } as const;
/** Kernel errors in a row that end a run at once: a worker that died answers nothing, and a night of rules fallbacks is not a model night (design assumption). */
export const MAX_ERRORS_IN_ROW = 50;
/** Kernel errors in a row (other than a timeout or a packet over the token budget) after which the worker is replaced: a worker process that died is started again instead of failing every call (design assumption). */
export const REPLACE_WORKER_AFTER = 5;

// ---------------------------------------------------------------------------------------------------------------------
// Lines: the receipt (schema r10-receipt-1), the journal
// ---------------------------------------------------------------------------------------------------------------------

export type Why = 'interrupt' | 'bout-end' | 'finished' | 'waiting';
/** One decision point of a driven animal that reached the between-tick step: a kernel pass, or the rules for a reason. */
export interface AskLine {
  k: 'ask'; tick: number; t: number; day: number; id: number; v: number; phase: string; n: number; rulesIndex: number;
  /** Per option [action, targetId, variant, aux]; the stable key of an option is `action:targetId` (unique in a menu). */
  opts: [string, number, number, number][]; fam: string[];
  /** What raised the decision point, the interrupt's words, and the loop's gate ('no-intent', or why a held intention was opened; '' with the gate off). */
  trig: { why: Why; intr: string; gate: string };
  /** The answer the loop received (after the decode): option position and a probability per option; null when the kernel gave none. */
  index: number | null; p: number[] | null; dec?: Record<string, unknown>;
  by: 'kernel' | 'rules'; refusal: string; detail: string;
  /** The option position applied (-1: the rules decided) and the act the animal is in after the step, whoever set it. */
  picked: number; act: [string, number];
  /** sha256 (16 hex) of the state-only packet and of the context; the estimated input tokens; the kernel's time. */
  sha: string; ctx: string; tokens: number; ms: number;
  /** 1: the answer came from the journal of an interrupted segment, not from a new call. */
  re?: 1;
}
/** An act the loop's gate set without asking the kernel: the same act kept, or feeding begun at the end of a trip. */
export interface HeldLine { k: 'held'; tick: number; t: number; day: number; id: number; v: number; how: 'kept' | 'arrived'; act: [string, number]; fam: string }
export type Line = AskLine | HeldLine;

/** A kernel answer as it arrived (the journal): only read by a resume, so that no answer is asked twice. */
export interface Arrival { t: number; id: number; v: number; sha: string; index: number | null; p: number[] | null; dec?: Record<string, unknown>; err: string | null; ms: number; tokens: number }

export const keyOf = (t: number, id: number, v: number) => `${t.toFixed(6)}:${id}:${v}`;
export const sha16 = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const famOf = (o: Candidate) => { const m = candidateMeta.get(o); return familyOf(o.action, m?.v ?? V.NONE, m?.aux ?? -1); };
/** The kind of the act an animal is in (the families of scripts/em-sample.ts), from its own act state. */
export const famNow = (c: Chimp) => c.alive ? familyOf(c.action, ix(c).v, ix(c).aux) : '';
const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER); // as scripts/em-loop.ts
const quantile = (v: number[], q: number) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const inc = (r: Record<string, number>, k: string, n = 1) => { r[k] = (r[k] ?? 0) + n; };

/** Who is on the kernel: alive and aged MIN_AGE or over. */
export const isDriven = (c: Chimp, minAge = MIN_AGE) => c.alive && c.age >= minAge;

// ---------------------------------------------------------------------------------------------------------------------
// The meter: one row per living animal and day (simulation truth; the definitions of scripts/r5-pilot.ts runArm)
// ---------------------------------------------------------------------------------------------------------------------

type Owner = 'model' | 'held' | 'rules';
/** What the meter carries for one animal from tick to tick (plain data; saved in every checkpoint). */
export interface AnimalState {
  in0: number; fin0: number; out0: number; res0: number; px: number; pz: number; fx: number; fz: number;
  cat: number[]; light: number; night: number; nest: number; m: number; mf: number;
  fam: string; tgt: number; tripTo: number; atW: boolean; trips: number; drinks: number; tripsDone: number; changes: number;
  owner: Owner; own: Record<Owner, number>; asked: number; byModel: number; heldN: number; byRules: number; drivenTicks: number; ticks: number;
}
export type MeterState = Record<string, AnimalState>;

export interface Row {
  day: number; id: number; name: string; sex: string; age: number; troop: number; cls: string; alive: boolean;
  /** On the kernel this day (false: under 8, or the rules arm: the rules decided). */
  driven: boolean; decidedBy: string;
  /** Energy: usable energy in, energy eaten by the field's intake measure, energy out (kcal); reserves' change in kcal and in % of the usual store. */
  kcalIn: number; kcalFormula: number; kcalOut: number; reserveKcal: number; reservePct: number;
  /** Daylight minutes by field category (src/field/categories.ts). */
  min: Record<string, number>; daylightMin: number;
  km: number; kmFixes: number; nightMin: number; nestShare: number | null; waterDefMl: number | null;
  /** Trips to food begun and completed, drinks, and changes of the kind of act between consecutive ticks, over the 24 hours. */
  trips: number; tripsDone: number; drinks: number; actChanges: number;
  /** Minutes under a fresh kernel choice, an intention the gate held, and the rules; asks, asks the kernel settled, acts the gate held, acts the rules settled. */
  own: Record<Owner, number>; asked: number; byModel: number; heldN: number; byRules: number;
}

const classOf = (c: Chimp): string => c.age < MIN_AGE ? `under ${MIN_AGE} y (${c.stage})` : c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other') : c.age >= 12 ? 'adolescent 12-15 y' : 'juvenile 8-12 y';

function newAnimal(c: Chimp): AnimalState {
  const L = ix(c).en;
  return { in0: L?.in ?? 0, fin0: L?.fin ?? L?.in ?? 0, out0: L?.out ?? 0, res0: L?.res ?? 0, px: c.position[0], pz: c.position[2], fx: c.position[0], fz: c.position[2],
    cat: CATEGORIES.map(() => 0), light: 0, night: 0, nest: 0, m: 0, mf: 0, fam: famNow(c), tgt: c.targetId, tripTo: -1, atW: false, trips: 0, drinks: 0, tripsDone: 0, changes: 0,
    owner: 'rules', own: { model: 0, held: 0, rules: 0 }, asked: 0, byModel: 0, heldN: 0, byRules: 0, drivenTicks: 0, ticks: 0 };
}
export function meterStart(w: World): MeterState {
  const st: MeterState = {};
  for (const c of w.chimps) if (c.alive) st[c.id] = newAnimal(c);
  return st;
}

/** After a tick and its answers: every living animal's minute. Reads only. */
function meterTick(w: World, st: MeterState): void {
  const P = paramsOf(w), idx = index(w), env = w.environment, light = env.daylight >= 0.5, night = env.daylight <= 0.03;
  for (const c of idx.alive) {
    const s = st[c.id] ??= newAnimal(c), x = ix(c);
    s.ticks++;
    s.m += Math.min(Math.hypot(c.position[0] - s.px, c.position[2] - s.pz), P.runMps * TICK_SECONDS * 2); s.px = c.position[0]; s.pz = c.position[2];
    if (w.tick % 20 === 0) { s.mf += Math.hypot(c.position[0] - s.fx, c.position[2] - s.fz); s.fx = c.position[0]; s.fz = c.position[2]; }
    const site = c.action === 'drink' ? idx.waterById.get(c.targetId) : undefined, atW = !!site && (site.position[0] - c.position[0]) ** 2 + (site.position[2] - c.position[2]) ** 2 <= 1.44;
    if (light) {
      let groomed = false;
      if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') for (const m of idx.alive) if (m.action === 'groom' && m.targetId === c.id && ix(m).phase >= 1) { groomed = true; break; }
      const k = activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atW);
      if (k < CATEGORIES.length) { s.cat[k]++; s.light++; }
    }
    if (night) { s.night++; if (inNest(c)) s.nest++; }
    const fam = famNow(c);
    if (fam !== s.fam) s.changes++;
    if (fam === 'food-trip' && (s.fam !== 'food-trip' || c.targetId !== s.tgt)) { s.trips++; s.tripTo = c.targetId; }
    else if (fam !== 'food-trip' && s.tripTo >= 0) { if (c.action === 'forage' && c.targetId === s.tripTo) s.tripsDone++; s.tripTo = -1; }
    s.fam = fam; s.tgt = c.targetId;
    s.own[s.owner] += TICK_MIN;
    if (atW && !s.atW) s.drinks++;
    s.atW = atW;
  }
}

/** The day's rows, then the counters start again. An animal that died during the day gets its last row and leaves the meter. */
function meterDayEnd(w: World, st: MeterState, day: number, kernelArm: boolean, minAge: number): Row[] {
  const P = paramsOf(w), idx = index(w), rows: Row[] = [];
  for (const key of Object.keys(st)) {
    const c = idx.byId.get(+key), s = st[key];
    if (!c) { delete st[key]; continue; }
    const L = ix(c).en, cap = reserveCap(c, P), now = { in: L?.in ?? 0, fin: L?.fin ?? L?.in ?? 0, out: L?.out ?? 0, res: L?.res ?? 0 };
    const driven = kernelArm && s.drivenTicks > 0;
    rows.push({ day, id: c.id, name: c.name, sex: c.sex, age: +c.age.toFixed(2), troop: c.troopId, cls: classOf(c), alive: c.alive, driven,
      decidedBy: driven ? 'kernel' : kernelArm && c.age < minAge ? `rules (under ${minAge} years)` : 'rules',
      kcalIn: Math.round(now.in - s.in0), kcalFormula: Math.round(now.fin - s.fin0), kcalOut: Math.round(now.out - s.out0), reserveKcal: Math.round(now.res - s.res0), reservePct: cap > 0 ? +(100 * (now.res - s.res0) / cap).toFixed(4) : 0,
      min: Object.fromEntries(CATEGORIES.map((n, k) => [n, +(s.cat[k] * TICK_MIN).toFixed(2)])), daylightMin: +(s.light * TICK_MIN).toFixed(2),
      km: +(s.m / 1000).toFixed(4), kmFixes: +(s.mf / 1000).toFixed(4), nightMin: +(s.night * TICK_MIN).toFixed(2), nestShare: s.night ? +(s.nest / s.night).toFixed(4) : null,
      waterDefMl: ix(c).wat ? Math.round(ix(c).wat!.def) : null, trips: s.trips, tripsDone: s.tripsDone, drinks: s.drinks, actChanges: s.changes,
      own: { model: +s.own.model.toFixed(2), held: +s.own.held.toFixed(2), rules: +s.own.rules.toFixed(2) }, asked: s.asked, byModel: s.byModel, heldN: s.heldN, byRules: s.byRules });
    if (!c.alive) { delete st[key]; continue; }
    Object.assign(s, { in0: now.in, fin0: now.fin, out0: now.out, res0: now.res, cat: CATEGORIES.map(() => 0), light: 0, night: 0, nest: 0, m: 0, mf: 0, trips: 0, drinks: 0, tripsDone: 0, changes: 0,
      own: { model: 0, held: 0, rules: 0 }, asked: 0, byModel: 0, heldN: 0, byRules: 0, drivenTicks: 0, ticks: 0 });
  }
  return rows.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------------------------------------
// A day
// ---------------------------------------------------------------------------------------------------------------------

/** What a run carries from day to day: what a checkpoint holds. `day`: whole days done since the burn-in. */
export interface Engine { world: World; day: number; meter: MeterState }

/**
 * A read-only readout stepped by a run or a replay (the hook for stage R7's timing card, and how the replay attaches the
 * field observer): `before` runs before each tick, `tick` after the tick's answers have been applied, with the tick's
 * index since the burn-in and that tick's receipt lines; `end` returns what the replay writes under the tap's name.
 * A tap must not write the world: the replay's hashes would differ from the run's.
 */
export interface Tap {
  name: string;
  /** Once, on the burned-in world, before the first tick (the caller of runDay calls it; runDay does not). */ start?(w: World): void;
  before?(w: World, i: number): void; tick(w: World, i: number, lines: Line[]): void; dayEnd?(w: World, day: number): void;
  end(w: World): unknown;
}

/** Where a day's output goes as it happens. */
export interface Sink {
  /** A kernel answer, the moment it arrives (before the next call). */ arrival?(a: Arrival): void;
  /** The receipt lines of one tick, after its answers were applied. */ lines?(lines: Line[]): void;
  /** The context of an ask, keyed like its receipt. */ context?(c: { t: number; id: number; v: number; ctx: string; context: DecisionContext }): void;
}

export interface DaySummary {
  day: number; tick: number; hash: string;
  /** Decision points sent to the step, those the kernel's choice settled, the rest by reason; acts the gate held; answers reused from a journal; kernel calls. */
  asks: number; kernel: number; fallbacks: Record<string, number>; held: number; reused: number; calls: number; timeouts: number; workerStarts: number;
  /** Among kernel passes with the rules' pick on the menu: how many, and how often the applied choice was it. */
  withRulesPick: number; agree: number;
  kernelSeconds: number; msMean: number | null; msMedian: number | null; msP95: number | null; tokensMean: number | null;
  wallSeconds: number; rssMB: number;
  living: number; driven: number; under: number; deaths: { id: number; name: string; age: number; cause: string | null }[];
  /** The stop check's inputs for the day: mean daily reserve change of driven animals (% of the usual store) and their nights in a nest. */
  reservePctDriven: number | null; nights: [number, number]; kcalEatenDriven: number | null;
  started: string; finished: string;
  /** Set by scripts/r10-night.ts for a run's own days: bytes appended and the fsync calls made and the seconds they took. */
  io?: { journalBytes: number; receiptsBytes: number; contextsBytes: number; syncs: number; syncSeconds: number };
}

/** A run ended on purpose before the day was complete (a signal, the error limit): the last checkpoint stands. */
export class RunStopped extends Error { constructor(readonly reason: string) { super(reason); this.name = 'RunStopped'; } }

export interface DayOpts {
  sink?: Sink; taps?: Tap[];
  /** Answers of an interrupted segment, by key: reused when the packet hash is the same, so the kernel is not asked again. */
  journal?: Map<string, Arrival>;
  guard?: GuardedScorer;
  /** Asked after every tick; a non-empty answer ends the run there (RunStopped). */
  stop?: () => string;
  minAge?: number; maxErrorsInRow?: number;
  /** Ticks in this "day" (tests only; a real day is DAY). */
  ticks?: number;
}

/**
 * One simulated day. `kernel` null: the rules arm, which is plain tickWorld with the meter reading along (no controller
 * is touched). Otherwise every living animal aged minAge or over is put on the kernel before each tick and answered
 * after it through the shared step.
 */
export async function runDay(e: Engine, kernel: Kernel | null, o: DayOpts = {}): Promise<{ summary: DaySummary; rows: Row[] }> {
  const w = e.world, minAge = o.minAge ?? MIN_AGE, n = o.ticks ?? DAY, day = e.day + 1, t0 = Date.now(), started = new Date().toISOString(), time0 = w.time;
  if (paramsOf(w).activityFirst === 2) throw new Error('activityFirst 2 (a second request per decision) is not supported by the receipts of stage R10');
  const ms: number[] = [], tok: number[] = [], last = new Map<number, { ms: number; answer: (KernelAnswer & { dec?: Record<string, unknown> }) | null; sha: string; tokens: number; re: boolean }>();
  const timeouts0 = o.guard?.timeouts ?? 0, starts0 = o.guard?.starts ?? 0;
  let kernelMs = 0, calls = 0, asks = 0, byKernel = 0, heldN = 0, reused = 0, errorsInRow = 0, withRulesPick = 0, agree = 0;
  const fallbacks: Record<string, number> = {};
  // the kernel, timed, with its answer kept for the receipt and written to the journal the moment it arrives
  const timed: Kernel | null = kernel && { ...kernel, async decide(request, env) {
    const c = request.context, packet = buildStateOnlyQuestion(c);
    const rec = { ms: 0, answer: null as KernelAnswer | null, sha: sha16(JSON.stringify(packet)), tokens: tokensOf(packet), re: false };
    last.set(c.chimpId, rec);
    const j = o.journal?.get(keyOf(c.time, c.chimpId, c.version));
    if (j && j.err === null && j.sha === rec.sha) {
      rec.re = true; rec.ms = j.ms; reused++;
      rec.answer = { index: j.index ?? undefined, choice: j.index === null ? undefined : `c${j.index}`, probabilities: j.p ?? undefined, ...(j.dec ? { dec: j.dec } : {}) } as KernelAnswer;
      o.sink?.arrival?.(j);
      return rec.answer;
    }
    const s = performance.now();
    let err: string | null = null;
    try { rec.answer = await kernel.decide(request, env); return rec.answer; }
    catch (error) { err = error instanceof Error ? error.message : 'kernel failed'; throw error; }
    finally {
      rec.ms = performance.now() - s; ms.push(rec.ms); tok.push(rec.tokens);
      const a = rec.answer as (KernelAnswer & { dec?: Record<string, unknown> }) | null;
      o.sink?.arrival?.({ t: +c.time.toFixed(6), id: c.chimpId, v: c.version, sha: rec.sha, index: a && typeof a.index === 'number' ? a.index : null, p: a && Array.isArray(a.probabilities) ? a.probabilities as number[] : null,
        ...(a?.dec ? { dec: a.dec } : {}), err, ms: +rec.ms.toFixed(1), tokens: rec.tokens });
    }
  } };
  // the taps of src/sim/decide.ts, set around each tick only (they are module-level)
  const points = new Map<number, { intr: string; finished: boolean }>(), opened = new Map<number, string>();
  let lines: Line[] = [];
  const onPoint = (c: Chimp, intr: string, finished: boolean) => { if (c.controller === 'model' && c.awaitingDecisionSince === null) points.set(c.id, { intr, finished }); };
  const onGate = (c: Chimp, verdict: string) => {
    if (verdict === 'kept' || verdict === 'arrived') lines.push({ k: 'held', tick: w.tick, t: +w.time.toFixed(6), day, id: c.id, v: c.decisionVersion, how: verdict, act: [c.action, c.targetId], fam: famNow(c) });
    else if (!opened.has(c.id)) opened.set(c.id, verdict);
  };
  const before = new Map<number, number>();
  for (let k = 0; k < n; k++) {
    const i = e.day * DAY + k, st = e.meter;
    before.clear(); points.clear(); opened.clear(); lines = [];
    for (const c of w.chimps) {
      if (timed) c.controller = isDriven(c, minAge) ? 'model' : 'rules';
      if (c.alive) before.set(c.id, c.decisionVersion);
    }
    for (const tap of o.taps ?? []) tap.before?.(w, i);
    if (timed) { loopTap.point = onPoint; loopTap.gate = onGate; }
    try { tickWorld(w); } finally { loopTap.point = null; loopTap.gate = null; }
    const idx = index(w);
    // who set the act each animal is in: the rules' own decisions inside the tick (every animal of the rules arm, animals
    // under the age line), and acts the gate held (the lines the gate tap wrote)
    for (const [id, v] of before) {
      const c = idx.byId.get(id), s = st[id];
      if (!c || !s) continue;
      const driven = !!timed && c.controller === 'model';
      if (driven) s.drivenTicks++;
      else if (c.decisionVersion > v && c.alive) { s.byRules += c.decisionVersion - v; s.owner = 'rules'; }
    }
    for (const l of lines) { const s = st[l.id]; if (s) { s.heldN++; s.owner = 'held'; } heldN++; }
    if (timed) {
      const s0 = performance.now();
      const results = await answerWaiting(w, c => isDriven(c, minAge) ? timed : null);
      kernelMs += performance.now() - s0;
      for (const r of results) {
        // a pass reached the kernel unless the request itself was refused (a kernel that throws leaves StepResult.calls at 0)
        const req = r.request!, c = idx.byId.get(r.chimpId)!, reached = r.refusal !== 'fewer-than-two-options' && r.refusal !== 'invalid-context', l = reached ? last.get(r.chimpId) : undefined;
        const fam = req.options.map(famOf), s = st[r.chimpId], pt = points.get(r.chimpId), a = l?.answer as (KernelAnswer & { dec?: Record<string, unknown> }) | null | undefined;
        asks++; if (reached) calls += Math.max(1, r.calls);
        if (s) { s.asked++; if (r.by === 'kernel') { s.byModel++; s.owner = 'model'; } else { s.byRules++; s.owner = 'rules'; } }
        if (r.by === 'kernel') { byKernel++; if (req.rulesIndex >= 0) { withRulesPick++; if (r.index === req.rulesIndex) agree++; } }
        else inc(fallbacks, r.refusal === 'kernel-error' ? `kernel-error: ${r.detail}` : r.refusal === 'invalid-context' ? `invalid-context: ${r.detail}${r.detail === 'body' ? ` (${bodyFieldError(req.context.body).replace(/=.*/, '')})` : ''}` : r.refusal);
        errorsInRow = r.refusal === 'kernel-error' ? errorsInRow + 1 : reached ? 0 : errorsInRow;
        // a worker that fails call after call is stopped, so the guard starts a new one for the next call (a timeout already replaces it)
        if (r.refusal === 'kernel-error' && o.guard && errorsInRow % REPLACE_WORKER_AFTER === 0 && !/^timeout$|^packet over the token budget/.test(r.detail)) o.guard.stop();
        const ctxText = JSON.stringify(req.context), ctx = sha16(ctxText), t = +req.context.time.toFixed(6);
        lines.push({ k: 'ask', tick: w.tick, t, day, id: r.chimpId, v: req.context.version, phase: req.context.environment.phase, n: req.options.length, rulesIndex: req.rulesIndex,
          opts: req.options.map(opt => { const m = candidateMeta.get(opt); return [opt.action, opt.targetId, m?.v ?? V.NONE, m?.aux ?? -1]; }), fam,
          trig: { why: !pt ? 'waiting' : pt.intr ? 'interrupt' : pt.finished ? 'finished' : 'bout-end', intr: pt?.intr ?? '', gate: opened.get(r.chimpId) ?? '' },
          index: a && typeof a.index === 'number' ? a.index : null, p: a && Array.isArray(a.probabilities) ? a.probabilities as number[] : null, ...(a?.dec ? { dec: a.dec } : {}),
          by: r.by, refusal: r.refusal, detail: r.refusal === 'invalid-context' && r.detail === 'body' ? `body: ${bodyFieldError(req.context.body)}` : r.detail,
          picked: r.by === 'kernel' ? r.index : -1, act: [c.action, c.targetId], sha: l?.sha ?? '', ctx, tokens: l?.tokens ?? 0, ms: l ? +l.ms.toFixed(1) : 0, ...(l?.re ? { re: 1 as const } : {}) });
        o.sink?.context?.({ t, id: r.chimpId, v: req.context.version, ctx, context: req.context });
      }
      last.clear();
    }
    if (lines.length) o.sink?.lines?.(lines);
    meterTick(w, st);
    for (const tap of o.taps ?? []) tap.tick(w, i, lines);
    if (errorsInRow >= (o.maxErrorsInRow ?? MAX_ERRORS_IN_ROW)) throw new RunStopped(`${errorsInRow} kernel errors in a row (the last: ${Object.keys(fallbacks).filter(f => f.startsWith('kernel-error')).pop() ?? 'kernel-error'})`);
    const why = o.stop?.();
    if (why) throw new RunStopped(why);
  }
  const rows = meterDayEnd(w, e.meter, day, !!timed, minAge);
  e.day = day;
  for (const tap of o.taps ?? []) tap.dayEnd?.(w, day);
  const drivenRows = rows.filter(r => r.driven && r.alive), mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  const nightRows = drivenRows.filter(r => r.nestShare !== null);
  const summary: DaySummary = { day, tick: w.tick, hash: worldHash(w), asks, kernel: byKernel, fallbacks, held: heldN, reused, calls, timeouts: (o.guard?.timeouts ?? 0) - timeouts0, workerStarts: (o.guard?.starts ?? 0) - starts0,
    withRulesPick, agree, kernelSeconds: +(kernelMs / 1000).toFixed(1), msMean: mean(ms), msMedian: quantile(ms, 0.5), msP95: quantile(ms, 0.95), tokensMean: mean(tok),
    wallSeconds: +((Date.now() - t0) / 1000).toFixed(1), rssMB: Math.round(process.memoryUsage().rss / 1e6),
    living: w.chimps.filter(c => c.alive).length, driven: timed ? w.chimps.filter(c => isDriven(c, minAge)).length : 0, under: w.chimps.filter(c => c.alive && c.age < minAge).length,
    deaths: w.chimps.filter(c => !c.alive && c.deathTime !== null && c.deathTime > time0).map(c => ({ id: c.id, name: c.name, age: +c.age.toFixed(1), cause: c.causeOfDeath })),
    reservePctDriven: mean(drivenRows.map(r => r.reservePct)), nights: [nightRows.filter(r => r.nestShare! >= NIGHT_IN_NEST).length, nightRows.length], kcalEatenDriven: mean(drivenRows.map(r => r.kcalFormula)),
    started, finished: new Date().toISOString() };
  return { summary, rows };
}

// ---------------------------------------------------------------------------------------------------------------------
// The stop check after five simulated days (pure)
// ---------------------------------------------------------------------------------------------------------------------

export interface StopVerdict {
  /** The day it was read at, and whether the run should end. */ day: number; stop: boolean; reasons: string[];
  starved: number; reservePctDay: number | null; nights: [number, number]; nightShare: number | null; fallbackShare: number | null; timeoutShare: number | null;
}
/**
 * The registered stop check (docs/staging/r10-prereg.md §5), from the rows and day summaries of days 1 to STOP.day.
 * Reserves: the mean over driven animals of each animal's mean daily change over its days (the pilot's method).
 */
export function stopCheck(rows: Row[], days: DaySummary[]): StopVerdict {
  const d = days.filter(x => x.day <= STOP.day), r = rows.filter(x => x.day <= STOP.day && x.driven && x.alive);
  const starved = d.reduce((s, x) => s + x.deaths.filter(k => k.cause === 'starvation').length, 0);
  const byAnimal = new Map<number, number[]>();
  for (const x of r) (byAnimal.get(x.id) ?? byAnimal.set(x.id, []).get(x.id)!).push(x.reservePct);
  const means = [...byAnimal.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length), reservePctDay = means.length ? means.reduce((a, b) => a + b, 0) / means.length : null;
  const nightRows = r.filter(x => x.nestShare !== null), inNestN = nightRows.filter(x => x.nestShare! >= NIGHT_IN_NEST).length, nightShare = nightRows.length ? inNestN / nightRows.length : null;
  const asks = d.reduce((s, x) => s + x.asks, 0), fell = d.reduce((s, x) => s + x.asks - x.kernel, 0), timeouts = d.reduce((s, x) => s + x.timeouts, 0);
  const fallbackShare = asks ? fell / asks : null, timeoutShare = asks ? timeouts / asks : null;
  const reasons: string[] = [];
  if (starved >= STOP.starved) reasons.push(`S1: ${starved} deaths by starvation since the burn-in (the limit is ${STOP.starved})`);
  if (reservePctDay !== null && reservePctDay < STOP.reservePctDay) reasons.push(`S2: driven animals' reserves change by ${reservePctDay.toFixed(2)}% of the usual store a day (below ${STOP.reservePctDay.toFixed(1)}%)`);
  if (nightShare !== null && nightShare < STOP.nights) reasons.push(`S3: ${inNestN} of ${nightRows.length} driven animal-nights in a nest (${nightShare.toFixed(2)}, below ${STOP.nights.toFixed(2)})`);
  if (fallbackShare !== null && fallbackShare > STOP.fallbacks) reasons.push(`S4: the rules settled ${(100 * fallbackShare).toFixed(1)}% of asks (above ${100 * STOP.fallbacks}%)`);
  if (timeoutShare !== null && timeoutShare > STOP.timeouts) reasons.push(`S4: ${(100 * timeoutShare).toFixed(1)}% of asks timed out (above ${100 * STOP.timeouts}%)`);
  return { day: STOP.day, stop: reasons.length > 0, reasons, starved, reservePctDay, nights: [inNestN, nightRows.length], nightShare, fallbackShare, timeoutShare };
}

// ---------------------------------------------------------------------------------------------------------------------
// Files: checkpoints, the day's receipts, journal, contexts and rows
// ---------------------------------------------------------------------------------------------------------------------

export const dayName = (day: number) => `d${String(day).padStart(3, '0')}`;
export interface CkptHeader { tool: 'r10-night-ckpt'; v: 1; day: number; tick: number; hash: string; written: string }

/** Writes a checkpoint: the world and the meter's state, gzipped JSON (World is JSON-lossless), through a temporary name and a rename. */
export function writeCkpt(file: string, e: Engine): { bytes: number; hash: string } {
  mkdirSync(dirname(file), { recursive: true });
  const hash = worldHash(e.world), head: CkptHeader = { tool: 'r10-night-ckpt', v: 1, day: e.day, tick: e.world.tick, hash, written: new Date().toISOString() };
  const gz = gzipSync(Buffer.from(JSON.stringify({ ...head, meter: e.meter, world: e.world })), { level: 1 });
  writeAtomic(file, gz);
  return { bytes: gz.length, hash };
}
/** Reads a checkpoint back and refuses one whose world does not hash to what its header states, or whose layout this build cannot continue. */
export function readCkpt(file: string): Engine & { header: CkptHeader } {
  const doc = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8')) as CkptHeader & { meter: MeterState; world: World };
  if (doc.tool !== 'r10-night-ckpt' || doc.v !== 1) throw new Error(`${file} is not a checkpoint of stage R10`);
  const shape = worldShapeProblem(doc.world);
  if (shape) throw new Error(`${file}: ${shape}`);
  const hash = worldHash(doc.world);
  if (hash !== doc.hash) throw new Error(`${file}: the world hashes to ${hash}, its header says ${doc.hash}`);
  const { meter, world, ...header } = doc;
  return { world, day: header.day, meter, header };
}
/** The day checkpoints of a run folder, oldest first. */
export function listCkpts(root: string): { day: number; file: string }[] {
  const dir = resolve(root, 'ckpt');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map(f => /^d(\d+)\.json\.gz$/.exec(f)).filter((m): m is RegExpExecArray => !!m).map(m => ({ day: +m[1], file: resolve(dir, m[0]) })).sort((a, b) => a.day - b.day);
}
/** Keeps the newest `keep` day checkpoints (the start world, ckpt/start.json.gz, is not one of them and always stays). */
export function pruneCkpts(root: string, keep = 2): void {
  const all = listCkpts(root);
  for (const c of all.slice(0, Math.max(0, all.length - keep))) unlinkSync(c.file);
}
/** The newest checkpoint that reads back whole (a damaged newest falls back to the one before it). */
export function newestCkpt(root: string): { engine: Engine; file: string; skipped: string[] } | null {
  const skipped: string[] = [];
  for (const c of listCkpts(root).reverse()) {
    try { const r = readCkpt(c.file); return { engine: { world: r.world, day: r.day, meter: r.meter }, file: c.file, skipped }; }
    catch (error) { skipped.push(`${c.file}: ${error instanceof Error ? error.message : error}`); }
  }
  return null;
}

/** Lines of a JSON-lines file; a last line cut short by a crash is dropped. */
export function readLines<T>(file: string): T[] {
  if (!existsSync(file)) { if (existsSync(`${file}.gz`)) return gunzipSync(readFileSync(`${file}.gz`)).toString('utf8').split('\n').filter(Boolean).map(l => JSON.parse(l) as T); return []; }
  const text = file.endsWith('.gz') ? gunzipSync(readFileSync(file)).toString('utf8') : readFileSync(file, 'utf8'), out: T[] = [], parts = text.split('\n');
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    try { out.push(JSON.parse(parts[i]) as T); } catch (error) { if (i < parts.length - 1 && parts.slice(i + 1).some(Boolean)) throw error; }
  }
  return out;
}

/**
 * The files of one day, open for appending: journal (each answer the moment it arrives: it is what a resume reads),
 * receipts (each tick's lines), contexts (with the receipts; gzipped when the day closes). Every line is handed to the
 * operating system at once with a write call, so nothing is held in this process and a process that dies loses
 * nothing. The files are fsynced when SYNC_EVERY_MS have passed since the last time and when the day closes, so a
 * power cut can lose at most the lines of the last two seconds (they are asked again on the resume). On a slow disk
 * the wait grows to SYNC_BACKOFF times what the last fsync took, so forcing files to disk stays under about 5% of the
 * run's time whatever else is writing. Why not an fsync per answer: the field smoke of stage R10 measured 8 ms per
 * fsync on the project's volume at load 7 and about 115 ms at load 10 (65 s and 270 s a simulated day).
 */
export const SYNC_EVERY_MS = 2000, SYNC_BACKOFF = 20;
export class DayFiles implements Sink {
  private jf: number; private rf: number; private cf: number | null; private nextSync = Date.now() + SYNC_EVERY_MS;
  bytes = { journal: 0, receipts: 0, contexts: 0 };
  /** fsync calls made and the seconds they took (the progress line prints them). */ syncs = 0; syncSeconds = 0;
  readonly files: { journal: string; receipts: string; contexts: string; rows: string };
  /** `sync` false: never fsync before the day closes (tests of long runs; a real run keeps it). */
  constructor(readonly root: string, readonly day: number, contexts = true, private sync = true) {
    const n = dayName(day);
    this.files = { journal: resolve(root, 'journal', `${n}.jsonl`), receipts: resolve(root, 'receipts', `${n}.jsonl`), contexts: resolve(root, 'contexts', `${n}.jsonl`), rows: resolve(root, 'rows', `${n}.jsonl`) };
    for (const f of Object.values(this.files)) mkdirSync(dirname(f), { recursive: true });
    this.jf = openSync(this.files.journal, 'a'); this.rf = openSync(this.files.receipts, 'a'); this.cf = contexts ? openSync(this.files.contexts, 'a') : null;
  }
  private flush(force = false): void {
    if (!force && (!this.sync || Date.now() < this.nextSync)) return;
    const s = performance.now();
    fsyncSync(this.jf); fsyncSync(this.rf); if (this.cf !== null) fsyncSync(this.cf);
    const took = performance.now() - s;
    this.syncs++; this.syncSeconds += took / 1000; this.nextSync = Date.now() + Math.max(SYNC_EVERY_MS, SYNC_BACKOFF * took);
  }
  arrival(a: Arrival): void { this.bytes.journal += writeSync(this.jf, JSON.stringify(a) + '\n'); this.flush(); }
  lines(lines: Line[]): void { this.bytes.receipts += writeSync(this.rf, lines.map(l => JSON.stringify(l) + '\n').join('')); this.flush(); }
  context(c: { t: number; id: number; v: number; ctx: string; context: DecisionContext }): void { if (this.cf !== null) this.bytes.contexts += writeSync(this.cf, JSON.stringify(c) + '\n'); }
  /** Closes the day: the rows, then the contexts gzipped (the plain copy is replaced by the .gz). */
  close(rows: Row[] | null): void {
    this.flush(true);
    for (const fd of [this.jf, this.rf]) closeSync(fd);
    if (this.cf !== null) closeSync(this.cf);
    if (rows) {
      writeAtomic(this.files.rows, rows.map(r => JSON.stringify(r) + '\n').join(''));
      if (this.cf !== null) { writeAtomic(`${this.files.contexts}.gz`, gzipSync(readFileSync(this.files.contexts), { level: 6 })); unlinkSync(this.files.contexts); }
    }
  }
}

/**
 * Before a resume from the checkpoint of day `done`: every file of a later day is moved into orphans/<segment>/ (never
 * deleted), and the answers in the moved journals come back as a map for reuse.
 */
export function setAside(root: string, done: number, segment: number): { moved: string[]; journal: Map<string, Arrival> } {
  const moved: string[] = [], journal = new Map<string, Arrival>();
  for (const kind of ['journal', 'receipts', 'contexts', 'rows', 'summary']) {
    const dir = resolve(root, kind);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = /^d(\d+)\./.exec(f);
      if (!m || +m[1] <= done) continue;
      const to = resolve(root, 'orphans', `seg${segment}`, kind, f);
      mkdirSync(dirname(to), { recursive: true });
      renameSync(resolve(dir, f), to); moved.push(`${kind}/${f}`);
    }
  }
  // every earlier segment's journal of a later day counts (a run can be interrupted more than once inside the same day)
  const orphans = resolve(root, 'orphans');
  if (existsSync(orphans)) for (const seg of readdirSync(orphans).sort()) {
    const dir = resolve(orphans, seg, 'journal');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) { const m = /^d(\d+)\./.exec(f); if (m && +m[1] > done) for (const a of readLines<Arrival>(resolve(dir, f))) if (a.err === null) journal.set(keyOf(a.t, a.id, a.v), a); }
  }
  return { moved, journal };
}

/** The receipts of a run folder for days 1 to `days`, in order. */
export function readReceipts(root: string, days: number): Line[] {
  const out: Line[] = [];
  for (let d = 1; d <= days; d++) out.push(...readLines<Line>(resolve(root, 'receipts', `${dayName(d)}.jsonl`)));
  return out;
}

/** A kernel that answers from receipts: the logged answer for the same time, animal and decision version, or the logged failure. No model. */
export function receiptKernel(lines: Line[], stats: { missing: number; menuDiffers: number }): Kernel {
  const by = new Map<string, AskLine>();
  for (const l of lines) if (l.k === 'ask') by.set(keyOf(l.t, l.id, l.v), l);
  return { id: 'gliner', label: 'replay of the receipts', decide(request): KernelAnswer {
    const r = by.get(keyOf(request.context.time, request.context.chimpId, request.context.version));
    if (!r) { stats.missing++; throw new KernelError('no receipt for this decision'); }
    if (r.opts.length !== request.options.length || r.opts.some(([a, t], i) => request.options[i].action !== a || request.options[i].targetId !== t)) stats.menuDiffers++;
    if (r.refusal === 'kernel-error') throw new KernelError(r.detail);
    return { index: r.index ?? undefined, choice: r.index === null ? undefined : `c${r.index}`, probabilities: r.p ?? undefined, ...(r.dec ? { dec: r.dec } : {}) } as KernelAnswer;
  } };
}
/** A receipt line without what legitimately differs between a run and its replay (the time taken, the reuse mark). */
export const comparable = (l: Line): string => { const { ms: _ms, re: _re, ...rest } = l as AskLine; return JSON.stringify(rest); };

// ---------------------------------------------------------------------------------------------------------------------
// The machine: disk, other model processes, swap
// ---------------------------------------------------------------------------------------------------------------------

export const MIN_FREE_GB = 5;
/** Free bytes on the volume holding `path` (the nearest existing parent), as scripts/e-run.ts. */
export function freeBytes(path: string): number {
  let p = resolve(path);
  while (!existsSync(p)) p = dirname(p);
  const s = statfsSync(p);
  return Number(s.bavail) * Number(s.bsize);
}
/** The lowest free space among the run's volume and the system volume, and the refusal when it is under the floor. */
export function diskRefusal(out: string, free: (p: string) => number = freeBytes): { where: string; gb: number; refusal: string } {
  const all = [out, ...(existsSync('/System/Volumes/Data') ? ['/System/Volumes/Data'] : [])].map(where => ({ where, gb: free(where) / 1e9 }));
  const low = all.reduce((a, b) => (b.gb < a.gb ? b : a));
  return { ...low, refusal: low.gb < MIN_FREE_GB ? `only ${low.gb.toFixed(1)} GB free on the volume of ${low.where} (at least ${MIN_FREE_GB} GB are kept free)` : '' };
}

/**
 * Processes that hold, or are about to load, a model: a Python process that is the Decide environment's own
 * interpreter (the worker of the decide-ft harnesses, the batching server, a training or scoring script), or any Python
 * process running the app's Decide worker or a decide-ft script. Only the program a process runs counts (the first
 * word of its command), never a mention of these names in the arguments of a shell or an editor: the shell that
 * launches a night has the interpreter's path in its own command line. `ps`: lines of "pid ppid command". `ignore`:
 * pids left out (this process and its ancestors). Pure, so a test can hand it a process list.
 */
export function modelProcesses(ps: string, ignore: number[] = [], python = process.env.MGOGO_DECIDE_PYTHON ?? ''): { pid: number; command: string }[] {
  const out: { pid: number; command: string }[] = [];
  for (const line of ps.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)(.*)$/.exec(line);
    if (!m || ignore.includes(+m[1])) continue;
    const program = m[3], rest = m[4];
    if (!/python[0-9.]*$/i.test(program)) continue;
    if (program.includes('decide-env/') || (python !== '' && program === python) || /decide_provider|decide_ft|(?:^|[\s/])(?:worker|server|train|train_r4|eval_offline|score_contexts)\.py\b/.test(rest)) out.push({ pid: +m[1], command: `${program}${rest}`.slice(0, 160) });
  }
  return out;
}
/** This process and its ancestors, from a "pid ppid command" process list. */
export function ancestors(ps: string, pid: number): number[] {
  const parent = new Map<number, number>();
  for (const line of ps.split('\n')) { const m = /^\s*(\d+)\s+(\d+)\s/.exec(line); if (m) parent.set(+m[1], +m[2]); }
  const out = [pid];
  for (let p = parent.get(pid); p !== undefined && p > 1 && !out.includes(p); p = parent.get(p)) out.push(p);
  return out;
}
export function runningModelProcesses(): { pid: number; command: string }[] {
  try { const ps = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }); return modelProcesses(ps, ancestors(ps, process.pid)); } catch { return []; }
}
/** Swap in use, MB (macOS `sysctl -n vm.swapusage`); null where it cannot be read. */
export function swapUsedMB(): number | null {
  try { const m = /used = ([0-9.]+)M/.exec(execFileSync('sysctl', ['-n', 'vm.swapusage'], { encoding: 'utf8' })); return m ? Math.round(+m[1]) : null; } catch { return null; }
}

// ---------------------------------------------------------------------------------------------------------------------
// The registry (run.json)
// ---------------------------------------------------------------------------------------------------------------------

export interface Registry {
  tool: 'r10-night'; version: 1; receiptSchema: string; label: string; created: string; updated: string;
  /** running; done (every asked day, or the hours' budget, ran); stopped (the stop check, the error limit, low disk); interrupted (a signal or a crash). */
  state: 'running' | 'done' | 'stopped' | 'interrupted'; ended: string;
  root: string; commit: string; branch: string; dirty: boolean; node: string; host: string; command: string;
  seed: number; seedRole: string; profile: 'field' | 'compressed'; burnInDays: number; daysAsked: number; hours: number | null;
  paramsFile: string; paramsSha256: string; params: Record<string, number>;
  /** The loop switches the run is made with (the first two at creation, the last two on the burned-in world: scripts/r5-pilot.ts armWorld). */
  switches: { observeV4: number; menuParity: number; kernelGate: number; kernelNoRulesPick: number };
  arm: string; kernel: string; adapter: string | null; decode: string; packet: string;
  /** The name a result of this run must carry (IMPLEMENTATION_PLAN.md, "Names every result must use"). */ name: string;
  minAge: number; /** Who decides for animals under minAge. */ under: string;
  burnInHash: string; startHash: string;
  worker: Record<string, unknown> | null; env: Record<string, string | null>;
  machine: { load: number[]; swapUsedMB: number | null; freeGB: number; freeWhere: string };
  contexts: boolean; timeoutS: number; stopCheckOn: boolean;
  /** One entry per process that worked on the run: the first start and every resume. */
  segments: { started: string; fromDay: number; pid: number; journalAnswers: number; setAside: string[] }[];
  days: DaySummary[]; stopCheck: StopVerdict | null; events: { t: string; msg: string }[];
}
export function readRegistry(root: string): Registry {
  const file = resolve(root, 'run.json');
  if (!existsSync(file)) throw new Error(`no run at ${root} (no run.json)`);
  const r = JSON.parse(readFileSync(file, 'utf8')) as Registry;
  if (r.tool !== 'r10-night') throw new Error(`${file} is not a registry of stage R10`);
  return r;
}
export function writeRegistry(root: string, r: Registry): void {
  r.updated = new Date().toISOString();
  writeAtomic(resolve(root, 'run.json'), JSON.stringify(r, null, 1) + '\n');
}
