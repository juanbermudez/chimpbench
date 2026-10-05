// Stage E1t (docs/staging/e1t-prereg.md §3, pass condition 1): does the drive's waking time left predict the waking time
// the animal actually had? Measurement only, off unless asked (e-bench --feed-horizon, through the energy readout); it
// reads the world and never writes it. At every rules decision (decide.ts rulesTap) of an animal whose drive books are
// open: the waking time left in use (energy.ts feedHorizon), the other estimator's (E1e's pressure-based one when
// horizonLived is 1; the lived-day one, kept here from the same sleep events as energy.ts livedDay, when it is 0), the
// energy-deficit drive (deficitDrive) and whether it is pinned at 1 with waking time left (the deficit fills the horizon)
// or without (the horizon collapsed). Each decision is resolved at the animal's next sleep onset (livedDay's: the circadian
// sleep latch with rhythmCircadian, a finished nest without it) and at its next nest entry before it: the time it actually
// had. Also the hunger readout's distribution by hour of day and class, every tick.
import { deficitDrive, feedHorizon } from '../../src/sim/energy';
import { rulesTap } from '../../src/sim/decide';
import { paramsOf, type Params } from '../../src/sim/params';
import { ix, TICK_HOURS } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';

/** Error bins of (estimate − actual) in hours: [−24, 24) in steps of 0.5, plus one bin each side for the tails. */
export const ERR_BINS = 98;
const errBin = (e: number) => e < -24 ? 0 : e >= 24 ? ERR_BINS - 1 : 1 + Math.floor((e + 24) * 2);
/** Hunger bins: 20 of 0.05 below 1, and hunger exactly 1. */
export const HUNGER_BINS = 21;
export const HZ_CLASSES = ['adult male', 'adult female', 'juvenile and adolescent 5–15 y', 'infant < 5 y'] as const;
const clsOf = (c: Chimp) => c.age < 5 ? 3 : c.age < 15 ? 2 : c.sex === 'male' ? 0 : 1;

/** Counts over resolved decisions. */
export interface HzStats {
  /** Decisions resolved at a later sleep onset, and those never resolved (no onset before the window's end, or death). */
  n: number; unresolved: number;
  /** |left − time to the next sleep onset| ≤ 1 h: the estimator in use, the other one (and how many decisions it covers). */
  within1: number; altWithin1: number; altN: number;
  /** The same against the next nest entry before that onset (nN decisions had one). */
  nestN: number; nestWithin1: number; altNestWithin1: number; altNestN: number;
  /** Waking time left 0 (in use; the other); the drive at 1, and at 1 with more than one tick of waking time left. */
  left0: number; altLeft0: number; at1: number; at1Left: number;
  /** Histograms of (left − actual) for the estimator in use and the other one (ERR_BINS). */
  err: number[]; altErr: number[];
}
const blankStats = (): HzStats => ({ n: 0, unresolved: 0, within1: 0, altWithin1: 0, altN: 0, nestN: 0, nestWithin1: 0, altNestWithin1: 0, altNestN: 0, left0: 0, altLeft0: 0, at1: 0, at1Left: 0,
  err: new Array<number>(ERR_BINS).fill(0), altErr: new Array<number>(ERR_BINS).fill(0) });

/** One seed's result (in the energy readout's accumulator, `feedHorizon`). */
export interface HzResult {
  seed: number; horizonLived: number; circadian: number;
  /** Rules decisions in daylight (daylight > 0.1, as the other readouts) and at any light; by class (HZ_CLASSES) in daylight. */
  day: HzStats; all: HzStats; dayByClass: HzStats[];
  /** Daylight decisions by hour of day (0–23, clock hour) and by window day: [n, within1, at1, left0] each. */
  byHour: number[][]; byDay: number[][];
  /** Hunger readout per tick, by class and clock hour: counts in HUNGER_BINS. */
  hunger: number[][][];
  /** Ticks at which this readout's sleep record disagreed with the world's (livedDay's), when the world keeps one. */
  recordMismatch: number;
  /** Decisions taken while the readout had no sleep record yet for the other estimator (its first days). */
  noAlt: number;
}

/** A decision waiting for the animal's next sleep onset. */
interface Pending { t: number; left: number; alt: number; at1: boolean; day: boolean; hour: number; wday: number; cls: number; nest: number }
/** This readout's own record of an animal's sleep (as energy.ts livedDay keeps it). */
interface Rec { asleep: boolean; wokeAt: number; sleptAt: number; dayH: number; inNest: boolean }
export interface HzState { res: HzResult; rec: Map<number, Rec>; pend: Map<number, Pending[]>; curDay: number }

export function hzStart(w: World, seed: number): HzState {
  const P = paramsOf(w);
  const res: HzResult = { seed, horizonLived: P.horizonLived, circadian: P.rhythmCircadian, day: blankStats(), all: blankStats(), dayByClass: HZ_CLASSES.map(blankStats),
    byHour: Array.from({ length: 24 }, () => [0, 0, 0, 0]), byDay: [], hunger: HZ_CLASSES.map(() => Array.from({ length: 24 }, () => new Array<number>(HUNGER_BINS).fill(0))), recordMismatch: 0, noAlt: 0 };
  const st: HzState = { res, rec: new Map(), pend: new Map(), curDay: 0 };
  for (const c of w.chimps) if (c.alive) {
    // as livedDay: no sleep recorded yet counts as awake, so an animal asleep now records an onset at its first step
    const L = ix(c).en, r: Rec = { asleep: false, wokeAt: NaN, sleptAt: NaN, dayH: NaN, inNest: L?.slept === 1 };
    // a world that keeps the record (horizonLived 1) hands it over, so the other estimator is the mechanism's own
    if (L && L.sleptAt !== undefined) { r.sleptAt = L.sleptAt; r.wokeAt = L.wokeAt ?? NaN; r.dayH = L.dayH ?? NaN; r.asleep = L.wokeAt === undefined || L.sleptAt > L.wokeAt; }
    st.rec.set(c.id, r);
  }
  return st;
}

/** The animal's sleep as livedDay reads it: the circadian latch, or a finished nest (the drive's in-nest flag, `slept`). */
function asleepNow(P: Params, c: Chimp): boolean {
  const x = ix(c);
  return P.rhythmCircadian === 1 ? x.asl === 1 : x.en?.slept === 1;
}

/** Records the animal's sleep transitions at `now` (idempotent within a tick); resolves its decisions at a sleep onset or nest entry. */
function step(st: HzState, P: Params, c: Chimp, now: number): Rec {
  let r = st.rec.get(c.id);
  const asleep = asleepNow(P, c), inNest = ix(c).en?.slept === 1;
  if (!r) { r = { asleep: false, wokeAt: NaN, sleptAt: NaN, dayH: NaN, inNest }; st.rec.set(c.id, r); }
  else if (inNest && !r.inNest) { const p = st.pend.get(c.id); if (p) for (const d of p) if (Number.isNaN(d.nest)) d.nest = now - d.t; }
  r.inNest = inNest;
  if (asleep && !r.asleep) {
    if (!Number.isNaN(r.wokeAt)) r.dayH = now - r.wokeAt;
    r.sleptAt = now; r.asleep = true;
    const p = st.pend.get(c.id);
    if (p && p.length) { for (const d of p) resolve(st, d, now - d.t); p.length = 0; }
  } else if (!asleep && r.asleep) { r.wokeAt = now; r.asleep = false; }
  return r;
}

function addTo(s: HzStats, d: Pending, actual: number): void {
  s.n++;
  if (Math.abs(d.left - actual) <= 1) s.within1++;
  s.err[errBin(d.left - actual)]++;
  if (d.left <= 0) s.left0++;
  if (d.at1) { s.at1++; if (d.left > TICK_HOURS) s.at1Left++; }
  if (!Number.isNaN(d.alt)) { s.altN++; if (Math.abs(d.alt - actual) <= 1) s.altWithin1++; s.altErr[errBin(d.alt - actual)]++; if (d.alt <= 0) s.altLeft0++; }
  if (!Number.isNaN(d.nest)) {
    s.nestN++; if (Math.abs(d.left - d.nest) <= 1) s.nestWithin1++;
    if (!Number.isNaN(d.alt)) { s.altNestN++; if (Math.abs(d.alt - d.nest) <= 1) s.altNestWithin1++; }
  }
}
function resolve(st: HzState, d: Pending, actual: number): void {
  const R = st.res;
  addTo(R.all, d, actual);
  if (!d.day) return;
  addTo(R.day, d, actual); addTo(R.dayByClass[d.cls], d, actual);
  const h = R.byHour[d.hour], y = (R.byDay[d.wday] ??= [0, 0, 0, 0]);
  for (const a of [h, y]) { a[0]++; if (Math.abs(d.left - actual) <= 1) a[1]++; if (d.at1) a[2]++; if (d.left <= 0) a[3]++; }
}

/** E1e's estimator, for a world with horizonLived 1: the same parameters with the switch at 0 (one object per parameter set). */
let altOf: Params | null = null, altP: Params | null = null;
function pressureParams(P: Params): Params {
  if (P !== altOf) { altOf = P; altP = { ...P, horizonLived: 0 } as Params; }
  return altP!;
}

/** The rules tap: one pending decision (installed by hzTapOn while the measured world ticks). */
function onDecision(st: HzState, w: World, c: Chimp): void {
  const x = ix(c), L = x.en;
  if (!L || L.eAvg === undefined) return;
  const P = paramsOf(w), now = w.time;
  const r = step(st, P, c, now); // this tick's transition, if any, before the decision (as livedDay runs in needs())
  const left = feedHorizon(c, L, P)[0];
  let alt: number;
  if (P.horizonLived === 1) alt = feedHorizon(c, L, pressureParams(P))[0];
  else alt = Number.isNaN(r.dayH) || Number.isNaN(r.wokeAt) ? NaN : r.asleep ? r.dayH : Math.max(0, r.dayH - (now - r.wokeAt)); // asleep: the coming day (§6.6)
  if (Number.isNaN(alt)) st.res.noAlt++;
  const hour = Math.floor(((w.hour % 24) + 24) % 24);
  const d: Pending = { t: now, left, alt, at1: deficitDrive(c, P) >= 1, day: w.environment.daylight > 0.1, hour, wday: st.curDay, cls: clsOf(c), nest: r.inNest ? 0 : NaN };
  let p = st.pend.get(c.id);
  if (!p) { p = []; st.pend.set(c.id, p); }
  p.push(d);
}

let installed: ((c: Chimp) => void) | null = null;
export function hzTapOn(st: HzState, w: World): void { installed = c => onDecision(st, w, c); rulesTap.fn = installed; }
/** Removes this readout's tap (and only it: a diagnosis script's own rules tap is left alone). */
export function hzTapOff(): void { if (installed && rulesTap.fn === installed) rulesTap.fn = null; installed = null; }

const same = (a: number | undefined, b: number) => a === undefined ? Number.isNaN(b) : a === b;

/** After each measured tick: every living animal's sleep transitions, the hunger readout, and the record check. */
export function hzStep(st: HzState, w: World): void {
  const P = paramsOf(w), now = w.time, hour = Math.floor(((w.hour % 24) + 24) % 24), H = st.res.hunger, keeps = P.horizonLived === 1;
  for (const c of w.chimps) {
    if (!c.alive) { if (st.pend.has(c.id)) { st.res.all.unresolved += st.pend.get(c.id)!.length; st.res.day.unresolved += st.pend.get(c.id)!.filter(d => d.day).length; st.pend.delete(c.id); } continue; }
    const L = ix(c).en;
    if (!L) continue;
    const h = c.hunger, b = h >= 1 ? HUNGER_BINS - 1 : Math.max(0, Math.floor(h * 20));
    H[clsOf(c)][hour][b]++;
    if (L.eAvg === undefined) continue; // as livedDay: no record before the drive's books open
    const r = step(st, P, c, now);
    if (keeps && !(same(L.sleptAt, r.sleptAt) && same(L.wokeAt, r.wokeAt) && same(L.dayH, r.dayH))) st.res.recordMismatch++;
  }
}

/** The window's end: decisions still waiting are counted as unresolved. */
export function hzFinish(st: HzState): HzResult {
  for (const p of st.pend.values()) { st.res.all.unresolved += p.length; st.res.day.unresolved += p.filter(d => d.day).length; }
  st.pend.clear();
  return st.res;
}
