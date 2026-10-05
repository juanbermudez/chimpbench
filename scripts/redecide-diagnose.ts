// Stage E3d diagnosis (development tool, reads only; docs/staging/e3d-prereg.md §2): when animals stop what they are
// doing and choose again, and what the three persistence entries decide: the intention's maximum age (`rgMaxAgeH`, a
// clock), the continuation bonus (`continueBonus`) and the finished penalty (`finishedPenalty`); also the grooming
// bout's own continuation literal (+0.35 while the bout runs, −0.25 after its scheduled end; candidates.ts groom offer).
// The world is e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in + tickWorld, no
// observer); the taps (rg.ts rgTap, decide.ts rulesTap) read only, so the simulation is unchanged. Identity: adult
// males' eating minutes and ground km as energy-diagnose computes them (compare with its JSON of the same world).
//
// Readouts (simulation truth; daylight = environment.daylight > 0.1, as energy-diagnose; classes: adult male, female
// lactating, female other (≥ 15 y; pregnant counted as other), adolescent 12–15 y, juvenile 8–12 y, juvenile 5–8 y,
// infant < 5 y; RG decides from rgMinAge (8 y), the argmax below it):
//   decisions: every rules decision point. RG ones (rgTap) by the gate's verdict: kept, arrived, or a draw with its
//     trigger (interrupt, need-bucket, period, max-age, ended, patch-poor, hunt, patrol, light, no-intent; a draw whose
//     menu has fewer than two options is decided by the argmax and its trigger is recomputed with rg.ts gate on the
//     intent held before the decision); argmax ones (rulesTap) for animals under rgMinAge. Per draw: the held act and
//     the chosen act; "switch" when the chosen act or target differs from the animal's current act and target.
//   raw value of an option: its published score less the candidate jitter (hash of the animal, its decision count, the
//     action code and the target, × candidateJitterSpan), the continuation terms (continueBonus while the current act's
//     bout runs, −finishedPenalty once it has finished itself) and the grooming literal (on the current grooming
//     partner); a published score clamped at 0 is counted as raw 0 (such options are never near the top). "Raw top" =
//     the option with the highest raw value in the candidate list; when the current act has just finished itself, its
//     own candidate is left out of the raw comparison (it has delivered what it could: a trip that arrived, a call given).
//   max-age: draws whose trigger is max-age. Clock-caused act end = a max-age draw where, without the trigger, the gate
//     would have kept the act (ongoing, not finished, still legal, not patch-poor) and the draw switched. Reported: per
//     daylight animal-hour, by the held act; P(held) under the drawn softmax; whether the held act was raw top then;
//     what changed since the intention was chosen (below).
//   bonus and penalty (counterfactual, static): at a decision where the current act and target are in the candidate
//     list and the term applied (bonus: not finished and before the scheduled end; penalty: finished; grooming literal:
//     the current grooming partner), the list re-scored without the term (clamp [0, 3], rounded as published), re-sorted,
//     the menu rebuilt with rg.ts rgMenu and the softmax at rgTemperature: P(continue) with and without; the expected
//     continuations the term causes (Σ P with − P without); top flips (the current act is the menu's top with the term,
//     not without, or the reverse). Argmax decisions: the winner with and without. Identity variant: the menu rebuilt
//     from the unchanged list must equal the menu drawn from and its softmax the probabilities drawn with.
//   what changed since the choice (at every draw; snapshot taken when the intention was set by a draw or an arrival):
//     elapsed minutes; Δ hunger, Δ thirst, Δ social need (1 − social), Δ fatigue (1 − energy); metres moved; own-
//     community companions in view that arrived or left (symmetric difference of the seen sets); Δ raw value of the held
//     act and of the best raw alternative; whether the raw top changed identity. "Nothing changed" = |Δ| < 0.05 on the
//     four needs, < 0.05 on both raw values, no companion change, same raw top, moved < 10 m.
//   runs (act bouts): consecutive ticks of an animal in the same action and target, opened and closed between ticks;
//     runs that start in daylight, not censored by the window. Activity: feeding (forage; crown or fallback), grooming
//     (groom, as actor), rest (rest), travel (travel, follow), nest, other. Per run: minutes; what ended it (the trigger
//     of the decision that changed the act, 'young' for argmax animals, 'other' when no rules decision did: an act set by
//     another animal's decision, e.g. a fight); whether it started as the raw top; the value crossing: minutes from its
//     start to the first decision point (kept or drawn) at which its act is no longer the raw top (RG animals; censored
//     at the run's end when it never is).
//   acts per animal-hour: runs started per daylight animal-hour, by class.
//
// With redecideValue 1 or 2 (stage E3d's arms) the draws' trigger 'outvalued' is the keep test's; the continuation
// counterfactuals then see only the finished penalty.
//
// Stage E3g readouts (docs/staging/e3g-prereg.md §2; reads only: rgTap, rulesTap, energyTap and the world after each tick):
//   act category (of the held act, and of an option): feed-crown (forage at a tree), feed-fallback, rest, groom, trip-own
//     (travel V.TREE, no leader), trip-joined (V.TREE behind a leader), trip-caller, home, follow-party, follow-care, nest,
//     hunt-lead, hunt-join, drink, play, patrol, other:<action>; a chosen option is 'same' when it is the held act and target, and a
//     forage option at a tree in view other than the held one is 'crown-in-view'.
//   trigger of a decision: rg.ts's reason (S27: interrupt, need-bucket, period, max-age, ended, patch-poor, hunt, patrol,
//     light; S28: need-bucket, light-phase, outvalued, ended, hunt, patrol, light; both: no-intent, lead, phase, argmax),
//     with a detail: need-bucket, the needs whose bucket differs from the held intent's (hunger, thirst, fatigue =
//     1 − energy, loneliness = 1 − social; '+' rising into a higher bucket, '-' falling); light-phase, the held intent's
//     light phase and today's (dayPhase); period (S27), the held period and today's; outvalued (S28), the category of the
//     option that out-valued the act in the keep test, whether its noise was held or drawn fresh there, and whether its
//     value alone (no noise) exceeds the act's value with its held noise ('value') or not ('noise'); a fresh noise is
//     'fresh:back' when the option was on a menu since the draw and left it (rg.ts keeps noise only for options in view
//     now), 'fresh:new' otherwise. Animals under
//     rgMinAge: 'young' (S28 with a detail: need-bucket or light-phase when the intent held for the keep test differs,
//     ended when the act finished, else keep-test).
//   draws (daylight, RG animals): held category, whether the act had finished, whether the decision fell before the bout's
//     scheduled end (an interrupt), chosen category, switch; the held act's raw value now (this script's rawOf: published
//     score less jitter and continuation terms) and the chosen option's; for a held crown, its crop (units) and the foregut
//     fill (digesta dry matter ÷ capacity); S28 only: the keep-test counterfactual at need-bucket and light-phase draws
//     (rg.ts stillBest on the menu drawn from, the noise held in the intention for the options it holds and the draw's own
//     noise for options new since: an independent sample of the same fresh noise): 1 if the act would have been kept; and
//     the bonus counterfactual at every draw of an ongoing act before its scheduled end: whether the draw's winner, by its
//     own noise, becomes the held act with continueBonus added to it (S27's term).
//   chains: an animal's acts from one switching decision to the next ('arrived' and 'kept' continue a chain; a change of
//     act with no rules decision of the animal opens an 'other' chain; the window's first chain is 'start'). Each chain
//     carries the trigger and the category of the decision that opened it. Attributed to the chain that executed: ground
//     metres (energy-diagnose's: the step between ticks when below 0.3 m, < 100 m), the ledger's walk and climb kcal
//     (energyTap, charged at the next tick's needs for the move just made), carry kcal (the carrier's, same tick), kcal
//     eaten by food (energyTap 'eaten'), crown visits (a tick eating fruit in a crown other than the last one, or after a
//     gap of 10 min or more: the observer's T-FOOD-4 rule). Sums by the class at each tick, trigger and opening category.
//   trips (chains opened by trip-own, trip-joined or trip-caller) and hunts (hunt-lead, hunt-join), daylight starts, RG
//     animals: at the start the distance to the target, foregut fill, hunger, the held category, the raw values of the
//     held act and the trip, and (S28) the trip's noise; the outcome: the first crown eaten in during the chain (the
//     target, another crown; else fallback eaten, else none; a caller's target is the crown the caller was heard in, x.jt);
//     for hunts meat eaten or not; the chain's ground km, walk, climb and carry kcal, kcal eaten (fruit, fallback, meat),
//     minutes and the trigger of the decision that closed it; the kcal per minute the animal ate (own food) in the 10 min
//     before it opened (the rate it left; marginal value theorem, charnov1976) against the chain's net kcal per minute.
//   hunts: lead hunts started (V.LEAD hunt acts opened) and joins by trigger; at 'hunt' draws (the encounter impulse) of
//     adult males the held category, interrupt or bout end, lead chosen, and (S28) the bonus counterfactual.
//   feeding trees: distinct trees fed in per animal-day by class (truth analog of T-FOOD-4, per animal and calendar day).
//   amendment 1 (docs/staging/e3g-prereg.md §2.1): outvalued draws of adults by held category > the out-valuer's category;
//     trips by kind (own, joined, caller): fed at the target counting the next act when it is feeding at the target (a trip
//     converted by a draw rather than the arrival rule), E0 = the bout energy the trip was valued at (intake.ts netRateShare:
//     the believed crop ÷ (1 + the feeders counted) in kcal, or the bout room if smaller) against the fruit kcal eaten at the
//     target (in the chain and in the next one when it feeds at the target); for trips that did not feed at the target, the
//     state at the close: the trigger, the distance to the target (within 6 m: GATE.arriveM), the target's crop (units;
//     below 0.06 it is not seen as fruiting), whether it was in view and its forage option on the list, and the next act;
//     hunt impulses: decisions of adult males with the hunt impulse open and the hunt on the list, by trigger, the share
//     choosing the lead, and the share that re-sight a colobus group the same male perceived at a decision in the hour
//     before (perception.ts counts a group as met when it differs from the group perceived at the previous decision point).
//   trip yield (stage E3g iteration 1, experienceValue bit 1): each living adult's chimp.sim.ty at the window's end (1 when
//     absent): the share of a trip's valued bout energy its trips deliver.
//
//   pnpm exec tsx scripts/redecide-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { CODE, candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { gate, patchPoorHere, rgMenu, rgTap } from '../src/sim/rg';
import { bucketOf, periodNow } from '../src/decide/facts';
import { boutRoom, digestaCaps, energyTap, fruitKcalPerUnit } from '../src/sim/energy';
import { fruitRate } from '../src/sim/intake';
import { IMPULSE_HUNT } from '../src/sim/perception';
import { dayPhase } from '../src/sim/environment';
import { fruitAt } from '../src/sim/phenology';
import type { Intent } from '../src/decide/gate';
import { softmax } from '../src/decide/policies';
import { hash01 } from '../src/sim/rng';
import { paramsOf, type Params } from '../src/sim/params';
import { index, isChimpId, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Action, Candidate, Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN_PER_TICK = TICK_HOURS * 60;
const CLS = ['adult male', 'female, lactating', 'female, other', 'adolescent 12–15 y', 'juvenile 8–12 y', 'juvenile 5–8 y', 'infant < 5 y'] as const;
type Cls = typeof CLS[number];
const clsOf = (c: Chimp): Cls => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other')
  : c.age >= 12 ? 'adolescent 12–15 y' : c.age >= 8 ? 'juvenile 8–12 y' : c.age >= 5 ? 'juvenile 5–8 y' : 'infant < 5 y';
const ACTS = ['feeding', 'grooming', 'rest', 'travel', 'nest', 'other'] as const;
type Act = typeof ACTS[number];
const actOf = (a: Action): Act => a === 'forage' ? 'feeding' : a === 'groom' ? 'grooming' : a === 'rest' ? 'rest' : a === 'travel' || a === 'follow' ? 'travel' : a === 'nest' ? 'nest' : 'other';
/** Finer kind of a run (the act with its target or variant). */
function kindOf(a: Action, target: number, v: number, aux: number): string {
  switch (a) {
    case 'forage': return target > 0 ? 'feed: crown' : 'feed: fallback';
    case 'travel': return v === V.TREE ? (aux > 0 ? 'travel: joined trip' : 'travel: own trip') : v === V.CALLER ? 'travel: to caller' : v === V.HOME ? 'travel: home' : 'travel: other';
    case 'follow': return v === V.PARTY ? 'follow: party' : v === V.MOTHER ? 'follow: mother' : 'follow: other';
    default: return a;
  }
}

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Snap { t: number; h: number; th: number; s: number; f: number; x: number; z: number; seen: number[]; held: number; alt: number; top: string; topKind: string; topV: number }
interface Draw {
  cls: Cls; day: boolean; why: string; held: string; heldAct: Act; heldKind: string; topKind: string; gap: number; chosen: string; sw: boolean; pHeld: number; heldTop: boolean;
  /** max-age: would the gate have kept the act without the clock (ongoing, legal, not patch-poor). */
  wouldKeep: boolean;
  /** since the intention was set (null when no snapshot) */
  ch: null | { min: number; dh: number; dth: number; ds: number; df: number; moved: number; comp: number; dHeld: number; dAlt: number; topChanged: boolean };
}
interface Cf { kind: 'bonus' | 'penalty' | 'groom+' | 'groom-'; cls: Cls; day: boolean; act: Act; actKind: string; draw: boolean; pWith: number; pWithout: number; topWith: boolean; topWithout: boolean; why: string }
interface Run { cls: Cls; act: Act; kind: string; min: number; end: string; startTop: boolean | null; cross: number | null; rg: boolean; topKind: string; gap: number }
/** Stage E3g: a daylight draw of an RG animal (header, "draws"). NaN where not applicable; cf* −1 when not applicable. */
interface GDraw { cls: Cls; why: string; detail: string; held: string; fin: boolean; intr: boolean; chosen: string; sw: boolean; rawCur: number; rawCh: number; crop: number; fill: number; hunger: number; cfKeep: number; cfBonus: number }
/** Stage E3g: a chain (header, "chains"); the trip and hunt records keep the start fields. */
interface GChain { cls: Cls; why: string; detail: string; held: string; kind: string; target: number; t0: number; day: boolean; rg: boolean;
  d0: number; fill0: number; hunger0: number; rawCur: number; rawCh: number; noise: number; cfKeep: number;
  km: number; walkK: number; climbK: number; carryK: number; fruitK: number; fallK: number; meatK: number; visits: number; first: number; fell: boolean; t1: number;
  /** the trigger of the decision that closed it; the kcal per minute the animal ate in the 10 min before it opened */
  endWhy: string; rate10: number;
  /** amendment 1: E assumed at the start (min of the believed crop share and the bout room, intake.ts netRateShare), fruit eaten at
   * the target (in the chain and in the next one when it feeds at the target), and the state at the close */
  e0: number; fruitT: number; dEnd: number; cropEnd: number; inView: number; feedOpt: number; next: string; nextAtT: boolean; parent?: GChain }
/** Stage E3g: sums attributed to chains, keyed `${class now}|${trigger}|${opening category}`. */
interface GSum { km: number; walkK: number; climbK: number; carryK: number; fruitK: number; fallK: number; meatK: number; visits: number; chains: number }
interface Result {
  seed: number; draws: Draw[]; cfs: Cf[]; runs: Run[];
  g: { draws: GDraw[]; trips: GChain[]; sums: Record<string, GSum>; leads: Record<string, number>; joins: Record<string, number>; hunts: number; treeDays: Record<string, [number, number]>; days: number; troops: number; clsTicks: Record<string, number>;
    /** amendment 1: outvalued draws of adults (daylight) by held category > out-valuer category; hunt-impulse decisions of adult males */
    ovx: Record<string, number>; hi: { n: number; lead: number; resight: number; resightLead: number; byWhy: Record<string, number> };
    /** stage E3g iteration 1: each living adult's trip-yield expectation at the window's end (chimp.sim.ty; 1 when absent) */
    ty: number[] };
  counts: Record<string, Record<string, number>>; // class → verdict → n (daylight)
  nightCounts: Record<string, Record<string, number>>;
  dayTicks: Record<string, number>; runsStarted: Record<string, number>;
  identity: { menuMismatch: number; probErr: number; checked: number };
  male: { ticks: number; eating: number; walked: number };
  living: [number, number]; deaths: Record<string, number>;
}

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id)), hunts0 = w.stats.hunts;
  const R: Result = { seed, draws: [], cfs: [], runs: [], counts: {}, nightCounts: {}, dayTicks: {}, runsStarted: {}, identity: { menuMismatch: 0, probErr: 0, checked: 0 },
    male: { ticks: 0, eating: 0, walked: 0 }, living: [w.chimps.filter(c => c.alive).length, 0], deaths: {},
    g: { draws: [], trips: [], sums: {}, leads: {}, joins: {}, hunts: 0, treeDays: {}, days, troops: w.troops.length, clsTicks: {}, ovx: {}, hi: { n: 0, lead: 0, resight: 0, resightLead: 0, byWhy: {} }, ty: [] } };
  for (const k of CLS) { R.counts[k] = {}; R.nightCounts[k] = {}; R.dayTicks[k] = 0; R.runsStarted[k] = 0; }
  const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
  const jitterOf = (c: Chimp, k: Candidate) => (hash01(c.id, c.decisionVersion, CODE[k.action], k.targetId) - 0.5) * P.candidateJitterSpan;
  /** The continuation terms on the current act's candidate: [continueBonus or −finishedPenalty, the grooming literal]. */
  const contOf = (c: Chimp, k: Candidate): [number, number] => {
    if (k.action !== c.action || k.targetId !== c.targetId) return [0, 0];
    const x = ix(c);
    const on = P.redecideValue >= 1; // stage E3d: no bonus and no grooming literal under the switch (the finished penalty stays)
    const cb = P.urgencySwitchCost !== 1 ? (x.finished ? -P.finishedPenalty : w.time < x.actEnd && !on ? P.continueBonus : 0) : 0;
    const gl = !on && k.action === 'groom' && isChimpId(k.targetId) ? (w.time >= x.actEnd ? -0.25 : 0.35) : 0;
    return [cb, gl];
  };
  const rawOf = (c: Chimp, k: Candidate) => { if (k.score <= 0) return 0; const [cb, gl] = contOf(c, k); return k.score - jitterOf(c, k) - cb - gl; };
  /** Raw values of the list: the raw top's key, the value of `heldKey` (−∞ when absent) and the best other value. */
  const rawView = (c: Chimp, list: Candidate[], heldKey: string) => {
    let top = '', topV = -Infinity, held = -Infinity, alt = -Infinity, topK: Candidate | null = null;
    const done = ix(c).finished;
    for (const k of list) {
      if (k.action === 'dead' || (done && k.action === c.action && k.targetId === c.targetId)) continue;
      const v = rawOf(c, k), kk = key(k);
      if (v > topV) { topV = v; top = kk; topK = k; }
      if (kk === heldKey) held = v; else if (v > alt) alt = v;
    }
    const m = topK ? candidateMeta.get(topK) : undefined;
    return { top, held, alt, topV, topKind: topK ? kindOf(topK.action, topK.targetId, m?.v ?? V.NONE, m?.aux ?? -1) : '' };
  };
  const ownSeen = (c: Chimp) => { const byId = index(w).byId; return ix(c).seen.filter(id => { const o = byId.get(id); return !!o && o.alive && o.troopId === c.troopId; }); };
  const snap = (c: Chimp, list: Candidate[], heldKey: string): Snap => { const v = rawView(c, list, heldKey); return { t: w.time, h: c.hunger, th: c.thirst, s: 1 - c.social, f: 1 - c.energy, x: c.position[0], z: c.position[2], seen: ownSeen(c), held: v.held, alt: v.alt, top: v.top, topKind: v.topKind, topV: v.topV }; };
  const snaps = new Map<number, Snap>();
  /** The intention each RG animal held before its current decision (rg.ts stores the new one before the tap). */
  const intents = new Map<number, Intent | undefined>();
  /** Per animal: the trigger of its decision this tick that changed its act, and its open run. */
  const lastWhy = new Map<number, string>();
  interface Open { key: string; act: Act; kind: string; cls: Cls; t0: number; day: boolean; startTop: boolean | null; cross: number | null; rg: boolean; topKind: string; gap: number }
  const open = new Map<number, Open>();
  let windowOn = false;
  const day = () => w.environment.daylight > 0.1;
  const bump = (c: Chimp, v: string) => { const t = day() ? R.counts : R.nightCounts, k = clsOf(c); t[k][v] = (t[k][v] ?? 0) + 1; };

  /** Counterfactual of a continuation term: the current act's P(continue) and top with the term and without. */
  const cfTerm = (c: Chimp, list: Candidate[], cur: Candidate, delta: number, draw: boolean): { pW: number; pWo: number; tW: boolean; tWo: boolean } => {
    const curKey = key(cur);
    const alt = list.map(k => {
      if (k !== cur) return k;
      const s = Math.round(Math.min(3, Math.max(0, k.score - delta)) * 1000) / 1000, copy = { ...k, score: s };
      const meta = candidateMeta.get(k); if (meta) candidateMeta.set(copy, meta);
      return copy;
    }).sort((a, b) => b.score - a.score || a.targetId - b.targetId || CODE[a.action] - CODE[b.action]);
    if (!draw) return { pW: list[0] && key(list[0]) === curKey ? 1 : 0, pWo: alt[0] && key(alt[0]) === curKey ? 1 : 0, tW: !!list[0] && key(list[0]) === curKey, tWo: !!alt[0] && key(alt[0]) === curKey };
    const m1 = rgMenu(w, c, list), m2 = rgMenu(w, c, alt);
    const p1 = m1.length >= 2 ? softmax(m1.map(k => k.score), P.rgTemperature) : m1.map(() => 1), p2 = m2.length >= 2 ? softmax(m2.map(k => k.score), P.rgTemperature) : m2.map(() => 1);
    const i1 = m1.findIndex(k => key(k) === curKey), i2 = m2.findIndex(k => key(k) === curKey);
    const top = (m: Candidate[]) => m.reduce((b, k) => (k.score > b.score ? k : b), m[0]);
    return { pW: i1 >= 0 ? p1[i1] : 0, pWo: i2 >= 0 ? p2[i2] : 0, tW: m1.length > 0 && key(top(m1)) === curKey, tWo: m2.length > 0 && key(top(m2)) === curKey };
  };
  /** The continuation counterfactuals at one decision (bonus or penalty, and the grooming literal), recorded when they apply. */
  const cfAll = (c: Chimp, list: Candidate[], draw: boolean, why: string) => {
    const cur = findCandidate(list, c.action, c.targetId);
    if (!cur || cur.score <= 0) return;
    const [cb, gl] = contOf(c, cur), cls = clsOf(c), act = actOf(c.action), d = day(), actKind = kindOf(c.action, c.targetId, ix(c).v, ix(c).aux);
    if (cb !== 0) { const r = cfTerm(c, list, cur, cb, draw); R.cfs.push({ kind: cb > 0 ? 'bonus' : 'penalty', cls, day: d, act, actKind, draw, pWith: r.pW, pWithout: r.pWo, topWith: r.tW, topWithout: r.tWo, why }); }
    if (gl !== 0) { const r = cfTerm(c, list, cur, gl, draw); R.cfs.push({ kind: gl > 0 ? 'groom+' : 'groom-', cls, day: d, act, actKind, draw, pWith: r.pW, pWithout: r.pWo, topWith: r.tW, topWithout: r.tWo, why }); }
  };
  /** Kept and drawn decisions also test the open run's value crossing. */
  const crossTest = (c: Chimp, list: Candidate[]) => {
    const o = open.get(c.id);
    if (!o || o.cross !== null || !o.rg) return;
    const v = rawView(c, list, o.key);
    if (v.top !== o.key) o.cross = (w.time - o.t0) * 60;
  };

  // ---- Stage E3g (docs/staging/e3g-prereg.md §2; header "Stage E3g readouts"): reads only ----
  const BUCKETS = ['none', 'mild', 'moderate', 'strong', 'severe'];
  const rgRaw = (k: Candidate) => candidateMeta.get(k)?.raw ?? k.score; // rg.ts rawOf: every term, the finished penalty included
  const catOf = (a: Action, target: number, v: number, aux: number): string => {
    switch (a) {
      case 'forage': return target > 0 ? 'feed-crown' : 'feed-fallback';
      case 'travel': return v === V.TREE ? (aux > 0 ? 'trip-joined' : 'trip-own') : v === V.CALLER ? 'trip-caller' : v === V.HOME ? 'home' : 'travel-other';
      case 'follow': return v === V.PARTY ? 'follow-party' : v === V.MOTHER || v === V.JUVENILE ? 'follow-care' : 'follow-other';
      case 'hunt': return v === V.LEAD ? 'hunt-lead' : 'hunt-join';
      case 'rest': case 'groom': case 'nest': case 'drink': case 'play': case 'patrol': return a;
      default: return `other:${a}`;
    }
  };
  const heldCat = (c: Chimp) => { const x = ix(c); return catOf(c.action, c.targetId, x.v, x.aux); };
  const optCat = (c: Chimp, k: Candidate) => {
    if (k.action === c.action && k.targetId === c.targetId) return 'same';
    const m = candidateMeta.get(k), cat = catOf(k.action, k.targetId, m?.v ?? V.NONE, m?.aux ?? -1);
    return cat === 'feed-crown' ? 'crown-in-view' : cat;
  };
  const fillOf = (c: Chimp): number => { const L = ix(c).en; if (!L || L.dm === undefined) return NaN; const cap = digestaCaps(c, P)[0]; return cap > 0 ? L.dm / cap : NaN; };
  const needDetail = (c: Chimp, it: Intent | undefined): string => {
    if (!it) return '';
    const now = { hunger: bucketOf(c.hunger), thirst: bucketOf(c.thirst), fatigue: bucketOf(1 - c.energy), loneliness: bucketOf(1 - c.social) };
    const parts: string[] = [];
    for (const k of ['hunger', 'thirst', 'fatigue', 'loneliness'] as const) if (now[k] !== it.buckets[k]) parts.push(`${k}${BUCKETS.indexOf(now[k]) > BUCKETS.indexOf(it.buckets[k]) ? '+' : '-'}`);
    return parts.join(' ');
  };
  const phaseOfPeriod = (p: Intent['period']) => p === 'morning' || p === 'midday' || p === 'afternoon' ? 'day' : p;
  const blankSum = (): GSum => ({ km: 0, walkK: 0, climbK: 0, carryK: 0, fruitK: 0, fallK: 0, meatK: 0, visits: 0, chains: 0 });
  /** The sums' trigger key: the trigger, with the first need changed (need-bucket), the phases (light-phase, period) or young's detail. */
  const whyKey = (ch: GChain) => ch.why === 'need-bucket' ? `need-bucket:${ch.detail.split(' ')[0]}` : ch.why === 'light-phase' || ch.why === 'period' || ch.why === 'young' ? `${ch.why}:${ch.detail}` : ch.why;
  const sumOf = (cls: Cls, ch: GChain): GSum => R.g.sums[`${cls}|${whyKey(ch)}|${ch.kind}`] ??= blankSum();
  const gOpen = new Map<number, GChain>(), execNow = new Map<number, GChain>(), execPrev = new Map<number, GChain>();
  let pendNow: GChain[] = [], pendOld: GChain[] = [];
  /** Rules decisions this tick: RG ones (rgTap) and young ones (rulesTap: [post-execution, detail]). */
  const gDecided = new Set<number>(), gYoung = new Map<number, [boolean, string]>();
  /** The live intention object at the end of each RG decision (rg.ts stillBest replaces its noise during the next keep test). */
  const gLive = new Map<number, Intent | undefined>();
  /** Option keys on any menu since the animal's last draw (a fresh noise for one of them is a re-entry, not a new option). */
  const gSeen = new Map<number, Set<string>>();
  /** amendment 1: per adult male, when each colobus group was last perceived at one of his decisions */
  const gPrey = new Map<number, Map<number, number>>();
  const lastFruit = new Map<number, [number, number]>(), treeSet = new Map<number, Set<number>>(), gKey = new Map<number, string>();
  const newChain = (c: Chimp, why: string, detail: string, held: string, kind: string, target: number, rg: boolean): GChain => ({ cls: clsOf(c), why, detail, held, kind, target, t0: w.time, day: day(), rg,
    d0: NaN, fill0: NaN, hunger0: c.hunger, rawCur: NaN, rawCh: NaN, noise: NaN, cfKeep: -1, km: 0, walkK: 0, climbK: 0, carryK: 0, fruitK: 0, fallK: 0, meatK: 0, visits: 0, first: 0, fell: false, t1: NaN, endWhy: '', rate10: NaN,
    e0: NaN, fruitT: 0, dEnd: NaN, cropEnd: NaN, inView: -1, feedOpt: -1, next: '', nextAtT: false });
  /** Close the animal's open chain; `post`: the act it held executed this tick (a decision after execution). */
  const closeChain = (c: Chimp, post: boolean, why: string, list?: Candidate[], chosen?: Candidate): GChain | undefined => {
    const ch = gOpen.get(c.id); if (!ch) return undefined; ch.t1 = w.time; ch.endWhy = why; if (post) execNow.set(c.id, ch); pendNow.push(ch); gOpen.delete(c.id);
    // amendment 1: the trip's (or hunt's) state at its close
    if (isTrip(ch.kind) || ch.kind.startsWith('hunt')) {
      const tr = isTreeId(ch.target) ? index(w).treeById.get(ch.target) : undefined, pr = ch.kind.startsWith('hunt') ? w.prey.find(q => q.id === ch.target) : undefined, pos = tr?.position ?? pr?.position;
      ch.dEnd = pos ? Math.hypot(pos[0] - c.position[0], pos[2] - c.position[2]) : NaN; ch.cropEnd = tr ? fruitAt(w, tr) : NaN; ch.inView = tr ? (ix(c).trees.includes(tr.id) ? 1 : 0) : -1;
      ch.feedOpt = tr && list ? (findCandidate(list, 'forage', tr.id) ? 1 : 0) : -1;
      if (chosen) { const m = candidateMeta.get(chosen); ch.next = catOf(chosen.action, chosen.targetId, m?.v ?? V.NONE, m?.aux ?? -1); ch.nextAtT = !!tr && chosen.action === 'forage' && chosen.targetId === tr.id; }
      else ch.next = why;
    }
    return ch;
  };
  /** kcal eaten (own food) by the animal in the last 10 minutes, as [time, kcal] pairs */
  const eat10 = new Map<number, number[]>();
  const rate10Of = (c: Chimp) => { const e = eat10.get(c.id); if (!e) return 0; let k = 0; for (let i = 0; i < e.length; i += 2) if (e[i] > w.time - 10 / 60 + 1e-9) k += e[i + 1]; return k / 10; };
  const openChain = (c: Chimp, ch: GChain) => { gOpen.set(c.id, ch); sumOf(clsOf(c), ch).chains++; };
  const isTrip = (k: string) => k === 'trip-own' || k === 'trip-joined' || k === 'trip-caller';
  /** A closed chain, read one tick after it closed (its last move is charged at the next tick's needs). */
  const settle = (ch: GChain) => { if ((isTrip(ch.kind) || ch.kind === 'hunt-lead' || ch.kind === 'hunt-join') && ch.rg && ch.day) R.g.trips.push(ch); };
  energyTap.fn = (c, term, kcal, kind) => {
    if (!windowOn) return;
    if (term === 'walk' || term === 'climb') { const ch = execPrev.get(c.id); if (ch) { const s = sumOf(clsOf(c), ch); if (term === 'walk') { ch.walkK += kcal; s.walkK += kcal; } else { ch.climbK += kcal; s.climbK += kcal; } } return; }
    if (term === 'carry') { const ch = execNow.get(c.id) ?? gOpen.get(c.id); if (ch) { ch.carryK += kcal; sumOf(clsOf(c), ch).carryK += kcal; } return; }
    if (term !== 'eaten') return;
    if (kind !== 'milk') { let e = eat10.get(c.id); if (!e) eat10.set(c.id, e = []); e.push(w.time, kcal); while (e.length && e[0] <= w.time - 10 / 60 + 1e-9) e.splice(0, 2); }
    const ch = gOpen.get(c.id); if (!ch) return;
    const s = sumOf(clsOf(c), ch);
    if (kind === 'drupe' || kind === 'fig') {
      ch.fruitK += kcal; s.fruitK += kcal;
      const tree = c.action === 'forage' && isTreeId(c.targetId) ? c.targetId : -1;
      if (tree > 0) {
        const lf = lastFruit.get(c.id);
        if (!lf || lf[0] !== tree || w.time - lf[1] >= 10 / 60 - 1e-9) { ch.visits++; s.visits++; if (!ch.first) ch.first = tree; }
        lastFruit.set(c.id, [tree, w.time]);
        if (tree === ch.target) ch.fruitT += kcal;
        if (ch.parent && tree === ch.parent.target) ch.parent.fruitT += kcal;
        let ts = treeSet.get(c.id); if (!ts) treeSet.set(c.id, ts = new Set()); ts.add(tree);
      }
    } else if (kind === 'fallback') { ch.fallK += kcal; s.fallK += kcal; ch.fell = true; }
    else if (kind === 'meat') { ch.meatK += kcal; s.meatK += kcal; }
  };
  /** An RG decision (called first in rgTap). */
  const gRg = (c: Chimp, list: Candidate[], menu: Candidate[], chosen: Candidate, why: string) => {
    gDecided.add(c.id);
    const x = ix(c), held = intents.get(c.id), live = gLive.get(c.id), d = day();
    gLive.set(c.id, x.rgIntent);
    // amendment 1: decisions with a hunt impulse open and the hunt on the list (adult males); a re-sighting = the same colobus
    // group perceived at one of this animal's decisions in the hour before
    if (c.sex === 'male' && c.age >= 15) {
      const lp = gPrey.get(c.id) ?? new Map<number, number>();
      if (x.impulse === IMPULSE_HUNT && x.impulseUntil > w.time && list.some(k => k.action === 'hunt' && k.targetId === x.impulseTarget)) {
        const hi = R.g.hi, re = (lp.get(x.impulseTarget) ?? -1e9) >= w.time - 1 - 1e-9, lead = chosen.action === 'hunt' && candidateMeta.get(chosen)?.v === V.LEAD;
        hi.n++; hi.byWhy[why] = (hi.byWhy[why] ?? 0) + 1; if (lead) hi.lead++; if (re) { hi.resight++; if (lead) hi.resightLead++; }
      }
      if (x.preyId > 0) lp.set(x.preyId, w.time);
      gPrey.set(c.id, lp);
    }
    const key = (k: { action: string; targetId: number }) => `${k.action}:${k.targetId}`;
    const seen = gSeen.get(c.id);
    if (why === 'kept' || why === 'arrived') { if (seen) for (const k of menu) seen.add(key(k)); return; } // the chain continues
    gSeen.set(c.id, new Set(menu.map(key)));
    const sw = chosen.action !== c.action || chosen.targetId !== c.targetId;
    let detail = '';
    if (why === 'need-bucket') detail = needDetail(c, held);
    else if (why === 'light-phase') detail = held ? `${phaseOfPeriod(held.period)}>${dayPhase(w)}` : '';
    else if (why === 'period') detail = held ? `${held.period}>${periodNow(w)}` : '';
    const cur = findCandidate(list, c.action, c.targetId), newNoise = x.rgIntent?.noise;
    if (why === 'outvalued' && live?.noise && cur) {
      // the option that out-valued the act in rg.ts stillBest (its noise: live.noise, set there), and whether that noise was held
      const vCur = rgRaw(cur) + (live.noise[key(cur)] ?? 0);
      let best: Candidate | null = null, bv = vCur;
      for (const k of menu) if (key(k) !== key(cur)) { const v = rgRaw(k) + (live.noise[key(k)] ?? 0); if (v > bv) { bv = v; best = k; } }
      if (best) detail = `${optCat(c, best)} ${held?.noise && key(best) in held.noise ? 'held' : seen?.has(key(best)) ? 'fresh:back' : 'fresh:new'} ${rgRaw(best) > vCur ? 'value' : 'noise'}`;
      if (best && d && (c.age >= 15)) { const kx = `${heldCat(c)}>${optCat(c, best)}`; R.g.ovx[kx] = (R.g.ovx[kx] ?? 0) + 1; } // amendment 1
    }
    const ongoing = !!held && !!cur && !x.finished && c.action === held.action && c.targetId === held.targetId;
    let cfKeep = -1, cfBonus = -1;
    if (P.redecideValue >= 1 && newNoise && ongoing) {
      const nz = (k: Candidate) => held!.noise?.[key(k)] ?? newNoise[key(k)] ?? 0;
      if (why === 'need-bucket' || why === 'light-phase') {
        const v0 = rgRaw(cur!) + nz(cur!);
        cfKeep = menu.some(k => key(k) !== key(cur!) && rgRaw(k) + nz(k) > v0) ? 0 : 1;
      }
      if (sw && w.time < x.actEnd && menu.length >= 2) {
        // S27's continueBonus on the held act, added to the draw's own values (rg.ts redecide: raw + the noise drawn)
        let bk = cur!, bv = rgRaw(cur!) + (newNoise[key(cur!)] ?? 0) + P.continueBonus;
        for (const k of menu) if (key(k) !== key(cur!)) { const v = rgRaw(k) + (newNoise[key(k)] ?? 0); if (v > bv) { bv = v; bk = k; } }
        cfBonus = bk === cur ? 1 : 0;
      }
    }
    const chosenCat = optCat(c, chosen);
    if (d) {
      const t = c.action === 'forage' && isTreeId(c.targetId) ? index(w).treeById.get(c.targetId) : undefined;
      R.g.draws.push({ cls: clsOf(c), why, detail, held: heldCat(c), fin: x.finished, intr: !x.finished && w.time < x.actEnd, chosen: chosenCat, sw, rawCur: cur ? rawOf(c, cur) : NaN, rawCh: rawOf(c, chosen),
        crop: t ? fruitAt(w, t) : NaN, fill: fillOf(c), hunger: c.hunger, cfKeep, cfBonus });
    }
    if (!sw) return; // a draw that re-chose the held act and target: the chain continues
    const m = candidateMeta.get(chosen), kind = catOf(chosen.action, chosen.targetId, m?.v ?? V.NONE, m?.aux ?? -1);
    if (kind === 'hunt-lead') R.g.leads[why] = (R.g.leads[why] ?? 0) + 1;
    if (kind === 'hunt-join') R.g.joins[why] = (R.g.joins[why] ?? 0) + 1;
    const old = closeChain(c, x.finished, why, list, chosen);
    const ch = newChain(c, why, detail, heldCat(c), kind, kind === 'trip-caller' ? (x.jt !== undefined && x.jt > 0 ? x.jt : -1) : chosen.targetId, true);
    if (isTrip(kind) || kind === 'hunt-lead' || kind === 'hunt-join') {
      const tr = isTreeId(chosen.targetId) ? index(w).treeById.get(chosen.targetId) : undefined, pr = kind.startsWith('hunt') ? w.prey.find(p => p.id === chosen.targetId) : undefined;
      const pos = tr?.position ?? pr?.position;
      ch.d0 = pos ? Math.hypot(pos[0] - c.position[0], pos[2] - c.position[2]) : NaN; ch.fill0 = fillOf(c);
      ch.rawCur = cur ? rawOf(c, cur) : NaN; ch.rawCh = rawOf(c, chosen); ch.noise = newNoise?.[key(chosen)] ?? NaN; ch.cfKeep = cfKeep; ch.rate10 = rate10Of(c);
      // amendment 1: the bout energy the trip was valued at (intake.ts netRateShare's E: the believed crop share or the bout room)
      const bel = m?.bel, ttree = isTreeId(ch.target) ? index(w).treeById.get(ch.target) : undefined, unit = fruitKcalPerUnit(P, false);
      const crop = bel ? bel[1] : ttree ? fruitAt(w, ttree) : NaN, feeders = bel ? bel[3] : 0;
      if (Number.isFinite(crop)) ch.e0 = Math.min(Math.max(0, crop) / (1 + feeders) * unit, boutRoom(c, P, fruitRate(c, P).fruitPerH * unit));
    }
    if (old && (isTrip(old.kind)) && chosen.action === 'forage' && chosen.targetId === old.target) ch.parent = old;
    openChain(c, ch);
  };

  rulesTap.fn = (c, list) => {
    if (!windowOn || !c.alive) return;
    if (P.rgOn === 1 && c.age >= P.rgMinAge) return; // RG decisions are read by rgTap
    {
      // stage E3g: a young animal's decision; the chain switches at the end of the tick if its act changed
      const x = ix(c), it = x.rgIntent;
      let det = 'argmax';
      if (P.redecideValue === 2) {
        const nd = needDetail(c, it);
        det = !it ? 'no-intent' : x.finished ? 'ended' : nd ? 'need-bucket' : phaseOfPeriod(it.period) !== dayPhase(w) ? 'light-phase' : 'keep-test';
      }
      gYoung.set(c.id, [x.finished, det]);
    }
    bump(c, 'young');
    if (day()) cfAll(c, list, false, 'young');
    lastWhy.set(c.id, 'young');
  };
  rgTap.fn = (c, list, menu, probs, chosen, why) => {
    if (!windowOn) return;
    gRg(c, list, menu, chosen, why); // stage E3g (reads only; before the intents map below moves on)
    const x = ix(c), held = intents.get(c.id), heldKey = held ? `${held.action}:${held.targetId}` : 'none';
    let trig = why;
    if (why === 'argmax' && !(P.redecideValue >= 1)) { const g = gate(w, c, held, list); trig = typeof g === 'string' ? g : 'kept?'; }
    bump(c, why === 'argmax' ? `argmax (${trig})` : why);
    const d = day();
    if (why === 'kept' || why === 'arrived') {
      crossTest(c, list);
      if (why === 'arrived') snaps.set(c.id, snap(c, list, key(chosen)));
      intents.set(c.id, x.rgIntent ? { ...x.rgIntent } : undefined);
      if (why === 'arrived') lastWhy.set(c.id, 'arrived');
      return;
    }
    if (why === 'lead' || why === 'phase') { intents.set(c.id, x.rgIntent ? { ...x.rgIntent } : undefined); lastWhy.set(c.id, why); return; }
    // a draw (or the argmax after a trigger)
    const draw = why !== 'argmax';
    if (draw && d) {
      R.identity.checked++;
      const m = rgMenu(w, c, list);
      if (m.length !== menu.length || m.some((k, i) => key(k) !== key(menu[i]))) R.identity.menuMismatch++;
      else { const p = softmax(m.map(k => k.score), P.rgTemperature); R.identity.probErr = Math.max(R.identity.probErr, ...p.map((v, i) => Math.abs(v - probs[i]))); }
    }
    if (d) cfAll(c, list, draw, trig);
    crossTest(c, list);
    const sw = chosen.action !== c.action || chosen.targetId !== c.targetId;
    const iHeld = menu.findIndex(k => key(k) === `${c.action}:${c.targetId}`);
    const pHeld = draw ? (iHeld >= 0 ? probs[iHeld] : 0) : (sw ? 0 : 1);
    const v = rawView(c, list, `${c.action}:${c.targetId}`), s0 = snaps.get(c.id);
    let wouldKeep = false;
    if (trig === 'max-age' && held) {
      const cur = findCandidate(list, held.action, held.targetId);
      const ongoing = !x.finished && c.action === held.action && c.targetId === held.targetId && !!cur;
      wouldKeep = ongoing && !(held.action === 'forage' && bucketOf(c.hunger) !== 'none' && patchPoorHere(w, c, held.targetId, P));
    }
    if (d) {
      const seen = ownSeen(c);
      R.draws.push({ cls: clsOf(c), day: d, why: trig, held: heldKey, heldAct: actOf(c.action), heldKind: kindOf(c.action, c.targetId, x.v, x.aux), topKind: v.topKind, gap: v.topV - v.held, chosen: key(chosen), sw, pHeld, heldTop: v.top === `${c.action}:${c.targetId}`, wouldKeep,
        ch: s0 ? { min: (w.time - s0.t) * 60, dh: c.hunger - s0.h, dth: c.thirst - s0.th, ds: (1 - c.social) - s0.s, df: (1 - c.energy) - s0.f, moved: Math.hypot(c.position[0] - s0.x, c.position[2] - s0.z),
          comp: seen.filter(id => !s0.seen.includes(id)).length + s0.seen.filter(id => !seen.includes(id)).length, dHeld: v.held - s0.held, dAlt: v.alt - s0.alt, topChanged: v.top !== s0.top } : null });
    }
    snaps.set(c.id, snap(c, list, key(chosen)));
    intents.set(c.id, x.rgIntent ? { ...x.rgIntent } : undefined);
    lastWhy.set(c.id, trig);
  };

  for (const c of w.chimps) if (c.alive && ix(c).rgIntent) intents.set(c.id, { ...ix(c).rgIntent! });
  // stage E3g: the window's first chains ('start') and the live intentions
  for (const c of w.chimps) if (c.alive) { gLive.set(c.id, ix(c).rgIntent); gKey.set(c.id, `${c.action}:${c.targetId}`); openChain(c, newChain(c, 'start', '', heldCat(c), heldCat(c), c.targetId, P.rgOn === 1 && c.age >= P.rgMinAge)); }
  windowOn = true;
  const prevPos = new Map<number, [number, number]>(), prevIn = new Map<number, number>(), maleCls = new Map<number, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    lastWhy.clear();
    gDecided.clear(); gYoung.clear(); execNow.clear();
    tickWorld(w);
    if (i % 240 === 0) for (const c of w.chimps) if (c.alive) maleCls.set(c.id, c.age >= 15 && c.sex === 'male');
    const d = day();
    for (const c of w.chimps) {
      // stage E3g: chains after the tick (young and unruled act changes, the ground step, what executed)
      if (gOpen.has(c.id)) {
        if (!c.alive) { closeChain(c, true, 'death'); execPrev.delete(c.id); }
        else {
          const k = `${c.action}:${c.targetId}`, changed = k !== gKey.get(c.id), yd = gYoung.get(c.id);
          let pre = false;
          if (changed && yd) { pre = !yd[0]; const was = gOpen.get(c.id)?.kind ?? ''; closeChain(c, yd[0], 'young'); openChain(c, newChain(c, 'young', yd[1], was, heldCat(c), c.targetId, false)); }
          else if (changed && !gDecided.has(c.id)) { closeChain(c, true, 'other'); openChain(c, newChain(c, 'other', '', '', heldCat(c), c.targetId, false)); }
          gKey.set(c.id, k);
          { const kc = clsOf(c); R.g.clsTicks[kc] = (R.g.clsTicks[kc] ?? 0) + 1; }
          const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
          const ex = pre ? gOpen.get(c.id)! : execNow.get(c.id) ?? gOpen.get(c.id)!;
          if (step < 100 && step > 0) { ex.km += step / 1000; sumOf(clsOf(c), ex).km += step / 1000; }
          execPrev.set(c.id, ex);
        }
      }
      if (!c.alive) { const o = open.get(c.id); if (o) open.delete(c.id); continue; }
      const x = ix(c), cls = clsOf(c);
      // identity with energy-diagnose (adult males, its class refresh every 240 ticks)
      if (maleCls.get(c.id)) {
        const L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
        const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
        R.male.ticks++; R.male.walked += step < 100 ? step : 0; if (din > 1e-9) R.male.eating++;
      }
      prevPos.set(c.id, [c.position[0], c.position[2]]); if (x.en) prevIn.set(c.id, x.en.in);
      if (d) R.dayTicks[cls]++;
      const k = `${c.action}:${c.targetId}`, o = open.get(c.id);
      if (o && o.key === k) continue;
      const why = lastWhy.get(c.id) ?? 'other';
      if (o) {
        if (o.day && o.t0 >= 0) R.runs.push({ cls: o.cls, act: o.act, kind: o.kind, min: (w.time - o.t0) * 60, end: why, startTop: o.startTop, cross: o.cross, rg: o.rg, topKind: o.topKind, gap: o.gap });
      }
      const rg = P.rgOn === 1 && c.age >= P.rgMinAge, sn = snaps.get(c.id);
      const fresh = rg && sn && Math.abs(sn.t - w.time) < 1e-9, startTop = fresh ? sn!.top === k : null;
      // the first run of each animal in the window is censored (t0 −1: started before the window)
      open.set(c.id, { key: k, act: actOf(c.action), kind: kindOf(c.action, c.targetId, x.v, x.aux), cls, t0: o ? w.time : -1, day: d, startTop, cross: null, rg, topKind: fresh ? sn!.topKind : '', gap: fresh ? sn!.topV - sn!.held : NaN });
      if (o && d) R.runsStarted[cls]++;
    }
    // stage E3g: chains closed last tick have had their last move charged; distinct feeding trees per animal-day
    for (const ch of pendOld) settle(ch);
    pendOld = pendNow; pendNow = [];
    if (i % DAY === DAY - 1) {
      for (const c of w.chimps) if (c.alive) { const k = clsOf(c), t = R.g.treeDays[k] ??= [0, 0]; t[0] += treeSet.get(c.id)?.size ?? 0; t[1]++; }
      treeSet.clear();
    }
  }
  // stage E3g: the chains still open at the window's end (censored) are settled as they stand
  for (const ch of pendOld) settle(ch);
  for (const ch of pendNow) settle(ch);
  for (const ch of gOpen.values()) settle(ch);
  R.g.hunts = w.stats.hunts - hunts0;
  for (const c of w.chimps) if (c.alive && c.age >= 15) R.g.ty.push(ix(c).ty ?? 1);
  rulesTap.fn = null; rgTap.fn = null; energyTap.fn = null;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const why = c.causeOfDeath ?? 'unknown'; R.deaths[why] = (R.deaths[why] ?? 0) + 1; }
  R.living[1] = w.chimps.filter(c => c.alive).length;
  return R;
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else {
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), workers = +arg('workers', '2');
  const params = JSON.parse(arg('params', '{}')) as Record<string, number>, jsonOut = arg('json', '');
  if (burnIn + days > 90) throw new Error('burn-in + days must stay ≤ 90 (user limit)');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
  const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  const P = (await import('../src/sim/params')).resolveParams('field', params);
  const dayH = Object.fromEntries(CLS.map(k => [k, res.reduce((a, r) => a + r.dayTicks[k], 0) * TICK_HOURS])) as Record<Cls, number>;
  const rgCls = CLS.filter(k => k !== 'juvenile 5–8 y' && k !== 'infant < 5 y');
  const out: Record<string, unknown> = { seeds, burnIn, days, params, identity: res.map(r => ({ seed: r.seed, ...r.identity })), living: res.map(r => ({ seed: r.seed, start: r.living[0], end: r.living[1], deaths: r.deaths })) };
  // identity with energy-diagnose: adult males
  const mt = res.reduce((a, r) => ({ ticks: a.ticks + r.male.ticks, eating: a.eating + r.male.eating, walked: a.walked + r.male.walked }), { ticks: 0, eating: 0, walked: 0 });
  out.maleIdentity = { eatingMin: mt.eating / 4 / (mt.ticks / DAY), groundKm: mt.walked / 1000 / (mt.ticks / DAY) };
  // decision points per daylight animal-hour, by verdict
  const verdicts = [...new Set(res.flatMap(r => CLS.flatMap(k => Object.keys(r.counts[k]))))].sort();
  out.decisionsPerHour = Object.fromEntries(CLS.map(k => [k, Object.fromEntries(verdicts.map(v => [v, r3(res.reduce((a, r) => a + (r.counts[k][v] ?? 0), 0) / Math.max(1e-9, dayH[k]))]))]));
  const draws = res.flatMap(r => r.draws).filter(d => d.day);
  const byTrig = (L: Draw[]) => { const t: Record<string, { n: number; perH: number; switch: number; pHeld: number; heldTop: number }> = {};
    const H = rgCls.reduce((a, k) => a + dayH[k], 0);
    for (const tr of [...new Set(L.map(d => d.why))].sort()) { const D = L.filter(d => d.why === tr); t[tr] = { n: D.length, perH: r3(D.length / H), switch: r3(mean(D.map(d => +d.sw))), pHeld: r3(mean(D.map(d => d.pHeld))), heldTop: r3(mean(D.map(d => +d.heldTop))) }; }
    return t; };
  out.drawsByTrigger = byTrig(draws.filter(d => rgCls.includes(d.cls)));
  out.drawsByTriggerAdults = byTrig(draws.filter(d => d.cls === 'adult male' || d.cls === 'female, lactating' || d.cls === 'female, other'));
  // act ends by trigger (switches), share of all switches
  const sws = draws.filter(d => d.sw && rgCls.includes(d.cls));
  out.switchesByTrigger = Object.fromEntries([...new Set(sws.map(d => d.why))].sort().map(t => [t, r3(sws.filter(d => d.why === t).length / sws.length)]));
  // max-age
  const ma = draws.filter(d => d.why === 'max-age' && rgCls.includes(d.cls));
  const H = rgCls.reduce((a, k) => a + dayH[k], 0);
  const chOf = (L: Draw[]) => { const C = L.map(d => d.ch).filter(Boolean) as NonNullable<Draw['ch']>[];
    return { n: C.length, minMedian: r3(med(C.map(c => c.min))), dHungerMedianAbs: r3(med(C.map(c => Math.abs(c.dh)))), dHungerMedian: r3(med(C.map(c => c.dh))), dSocialNeedMedian: r3(med(C.map(c => c.ds))), dThirstMedianAbs: r3(med(C.map(c => Math.abs(c.dth)))), dFatigueMedianAbs: r3(med(C.map(c => Math.abs(c.df)))),
      movedMedian: r3(med(C.map(c => c.moved))), companionChange: r3(mean(C.map(c => +(c.comp > 0)))), dHeldMedian: r3(med(C.map(c => c.dHeld))), dHeldP10: r3(q(C.map(c => c.dHeld), 0.1)), dAltMedian: r3(med(C.map(c => c.dAlt))), dAltP90: r3(q(C.map(c => c.dAlt), 0.9)), topChanged: r3(mean(C.map(c => +c.topChanged))),
      nothingChanged: r3(mean(C.map(c => +(Math.abs(c.dh) < 0.05 && Math.abs(c.dth) < 0.05 && Math.abs(c.ds) < 0.05 && Math.abs(c.df) < 0.05 && Math.abs(c.dHeld) < 0.05 && Math.abs(c.dAlt) < 0.05 && c.comp === 0 && !c.topChanged && c.moved < 10)))) }; };
  out.maxAge = {
    draws: ma.length, perAnimalHour: r3(ma.length / H), switchShare: r3(mean(ma.map(d => +d.sw))), wouldKeep: r3(mean(ma.map(d => +d.wouldKeep))),
    clockCausedEndsPerAnimalHour: r3(ma.filter(d => d.wouldKeep && d.sw).length / H), clockCausedShareOfAllSwitches: r3(ma.filter(d => d.wouldKeep && d.sw).length / Math.max(1, sws.length)),
    pHeldMean: r3(mean(ma.map(d => d.pHeld))), heldWasTop: r3(mean(ma.map(d => +d.heldTop))), switchWhenHeldTop: r3(mean(ma.filter(d => d.heldTop).map(d => +d.sw))), switchWhenHeldNotTop: r3(mean(ma.filter(d => !d.heldTop).map(d => +d.sw))),
    byHeldAct: Object.fromEntries(ACTS.map(a => { const L = ma.filter(d => d.heldAct === a); return [a, { n: L.length, perAnimalHour: r3(L.length / H), switchShare: r3(mean(L.map(d => +d.sw))), heldWasTop: r3(mean(L.map(d => +d.heldTop))), clockEndsPerAnimalHour: r3(L.filter(d => d.wouldKeep && d.sw).length / H) }]; })),
    byHeldKind: Object.fromEntries([...new Set(ma.map(d => d.heldKind))].sort().map(kd => { const L = ma.filter(d => d.heldKind === kd), N = L.filter(d => !d.heldTop), t: Record<string, number> = {};
      for (const d of N) t[d.topKind] = (t[d.topKind] ?? 0) + 1;
      return [kd, { n: L.length, perAnimalHour: r3(L.length / H), switchShare: r3(mean(L.map(d => +d.sw))), heldWasTop: r3(mean(L.map(d => +d.heldTop))), gapMedian: r3(med(N.map(d => d.gap))),
        topKindWhenNotTop: Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k2, n2]) => [k2, r3(n2 / N.length)])) }]; })),
    byClass: Object.fromEntries(rgCls.map(k => { const L = ma.filter(d => d.cls === k); return [k, { perAnimalHour: r3(L.length / Math.max(1e-9, dayH[k])), switchShare: r3(mean(L.map(d => +d.sw))), clockEndsPerAnimalHour: r3(L.filter(d => d.wouldKeep && d.sw).length / Math.max(1e-9, dayH[k])) }]; })),
    changed: chOf(ma), changedWhenSwitched: chOf(ma.filter(d => d.sw)),
  };
  // what each entry decides, per daylight animal-hour of RG animals and as a share of their act switches (the registered reading, prereg §2)
  {
    const cfR = res.flatMap(r => r.cfs).filter(c => c.day && c.draw && rgCls.includes(c.cls));
    const caused = (kd: Cf['kind']) => cfR.filter(c => c.kind === kd).reduce((a, c) => a + c.pWith - c.pWithout, 0);
    const swH = sws.length / H, clock = ma.filter(d => d.wouldKeep && d.sw).length / H;
    const e = { switchesPerAnimalHour: swH, maxAgeClockEnds: clock, continueBonusContinuations: caused('bonus') / H, finishedPenaltyRestartsPrevented: -caused('penalty') / H,
      groomLiteralContinuations: caused('groom+') / H, groomLiteralEndsCaused: -caused('groom-') / H };
    out.decides = Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { perAnimalHour: r3(v), shareOfSwitches: r3(v / swH) }]));
  }
  out.changedByTrigger = Object.fromEntries([...new Set(draws.map(d => d.why))].sort().map(t => [t, chOf(draws.filter(d => d.why === t && rgCls.includes(d.cls)))]));
  // continuation terms
  const cfs = res.flatMap(r => r.cfs).filter(c => c.day);
  const cfOf = (L: Cf[], hours: number) => ({ n: L.length, perAnimalHour: r3(L.length / Math.max(1e-9, hours)), pWith: r3(mean(L.map(c => c.pWith))), pWithout: r3(mean(L.map(c => c.pWithout))),
    continuationsCausedPerAnimalHour: r3(L.reduce((a, c) => a + c.pWith - c.pWithout, 0) / Math.max(1e-9, hours)), topFlips: r3(mean(L.map(c => +(c.topWith !== c.topWithout)))) });
  out.continuation = Object.fromEntries((['bonus', 'penalty', 'groom+', 'groom-'] as const).map(kd => {
    const L = cfs.filter(c => c.kind === kd);
    return [kd, { rgDraws: cfOf(L.filter(c => c.draw && rgCls.includes(c.cls)), H), argmaxOld: cfOf(L.filter(c => !c.draw && rgCls.includes(c.cls)), H),
      young: cfOf(L.filter(c => !rgCls.includes(c.cls)), dayH['juvenile 5–8 y'] + dayH['infant < 5 y']),
      byAct: Object.fromEntries(ACTS.map(a => [a, cfOf(L.filter(c => c.act === a && c.draw && rgCls.includes(c.cls)), H)])),
      byKind: Object.fromEntries([...new Set(L.map(c => c.actKind))].sort().map(kd => [kd, cfOf(L.filter(c => c.actKind === kd && c.draw && rgCls.includes(c.cls)), H)])),
      byWhy: Object.fromEntries([...new Set(L.map(c => c.why))].sort().map(t => [t, cfOf(L.filter(c => c.why === t && rgCls.includes(c.cls)), H)])) }];
  }));
  // runs (act bouts) by activity and class
  const runs = res.flatMap(r => r.runs);
  const runOf = (L: Run[]) => { const top = L.filter(r => r.startTop === true), cr = top.filter(r => r.cross !== null);
    return { n: L.length, medianMin: r3(med(L.map(r => r.min))), meanMin: r3(mean(L.map(r => r.min))), p90Min: r3(q(L.map(r => r.min), 0.9)),
      startTop: r3(mean(L.filter(r => r.startTop !== null).map(r => +r.startTop!))),
      notTopGapMedian: r3(med(L.filter(r => r.startTop === false).map(r => r.gap))),
      notTopTopKind: (() => { const N = L.filter(r => r.startTop === false); const t: Record<string, number> = {}; for (const r of N) t[r.topKind] = (t[r.topKind] ?? 0) + 1; return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k2, n2]) => [k2, r3(n2 / N.length)])); })(),
      crossMedianMin: r3(med(cr.map(r => r.cross!))), crossedShare: r3(top.length ? cr.length / top.length : NaN),
      endedBeforeCross: r3(top.length ? top.filter(r => r.cross === null).length / top.length : NaN),
      endBy: Object.fromEntries([...new Set(L.map(r => r.end))].sort().map(e => [e, r3(L.filter(r => r.end === e).length / L.length)])) }; };
  const actCls = ['adult male', 'female, lactating', 'female, other', 'juvenile 8–12 y', 'juvenile 5–8 y'] as Cls[];
  out.runs = Object.fromEntries(ACTS.map(a => [a, { all: runOf(runs.filter(r => r.act === a && actCls.includes(r.cls))), ...Object.fromEntries(actCls.map(k => [k, runOf(runs.filter(r => r.act === a && r.cls === k))])) }]));
  out.runKinds = Object.fromEntries([...new Set(runs.map(r => r.kind))].sort().map(kd => [kd, runOf(runs.filter(r => r.kind === kd && actCls.includes(r.cls)))]));
  out.actsPerAnimalHour = Object.fromEntries(CLS.map(k => [k, r3(res.reduce((a, r) => a + r.runsStarted[k], 0) / Math.max(1e-9, dayH[k]))]));
  out.temperature = P.rgTemperature;
  // ---- Stage E3g aggregation (docs/staging/e3g-prereg.md §2) ----
  {
    const ADULT = ['adult male', 'female, lactating', 'female, other'] as Cls[];
    const aDays = Object.fromEntries(CLS.map(k => [k, res.reduce((a, r) => a + (r.g.clsTicks[k] ?? 0), 0) / DAY])) as Record<Cls, number>;
    const adultDays = ADULT.reduce((a, k) => a + aDays[k], 0);
    const gd = res.flatMap(r => r.g.draws), ad = gd.filter(d => ADULT.includes(d.cls));
    const share = (L: { [k: string]: unknown }[], f: (x: never) => boolean) => r3(L.length ? L.filter(f as never).length / L.length : NaN);
    const dist = (L: string[]) => { const t: Record<string, number> = {}; for (const v of L) t[v] = (t[v] ?? 0) + 1; return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, r3(n / L.length)])); };
    const perDay = (n: number, days: number) => r3(n / Math.max(1e-9, days));
    const TRIP = (k: string) => k === 'trip-own' || k === 'trip-joined' || k === 'trip-caller';
    const drawsOf = (L: GDraw[], days: number) => {
      const S = L.filter(d => d.sw), adv = S.filter(d => Number.isFinite(d.rawCur) && Number.isFinite(d.rawCh));
      const crownS = S.filter(d => d.held === 'feed-crown'), kc = L.filter(d => d.cfKeep >= 0), kb = S.filter(d => d.cfBonus >= 0);
      return { draws: perDay(L.length, days), switches: perDay(S.length, days), toTrip: perDay(S.filter(d => TRIP(d.chosen)).length, days), toHunt: perDay(S.filter(d => d.chosen.startsWith('hunt')).length, days),
        toCrownInView: perDay(S.filter(d => d.chosen === 'crown-in-view').length, days), interruptShare: r3(L.length ? L.filter(d => d.intr).length / L.length : NaN), finishedShare: r3(L.length ? L.filter(d => d.fin).length / L.length : NaN),
        chosen: dist(S.map(d => d.chosen)), held: dist(S.map(d => d.held)),
        advMedian: r3(med(adv.map(d => d.rawCh - d.rawCur))), chosenWorthLess: r3(adv.length ? adv.filter(d => d.rawCh < d.rawCur).length / adv.length : NaN),
        heldCrownCropMedian: r3(med(crownS.map(d => d.crop))), heldCrownFillMedian: r3(med(crownS.map(d => d.fill))), hungerMedian: r3(med(S.map(d => d.hunger))),
        keepTest: { n: kc.length, wouldKeep: r3(kc.length ? kc.filter(d => d.cfKeep === 1).length / kc.length : NaN), switchesWouldKeepPerDay: perDay(kc.filter(d => d.cfKeep === 1 && d.sw).length, days),
          tripsWouldKeepPerDay: perDay(kc.filter(d => d.cfKeep === 1 && d.sw && TRIP(d.chosen)).length, days), huntsWouldKeepPerDay: perDay(kc.filter(d => d.cfKeep === 1 && d.sw && d.chosen.startsWith('hunt')).length, days) },
        bonus: { n: kb.length, wouldStay: r3(kb.length ? kb.filter(d => d.cfBonus === 1).length / kb.length : NaN) } };
    };
    const whys = [...new Set(gd.map(d => d.why))].sort();
    const e3g: Record<string, unknown> = { animalDays: Object.fromEntries(CLS.map(k => [k, r3(aDays[k])])), adultDays: r3(adultDays) };
    e3g.decisionsAdults = Object.fromEntries(whys.map(t => [t, drawsOf(ad.filter(d => d.why === t), adultDays)]));
    e3g.decisionsAdultsAll = drawsOf(ad, adultDays);
    e3g.decisionsByDetailAdults = Object.fromEntries(whys.filter(t => ad.some(d => d.why === t && d.detail)).map(t => {
      const L = ad.filter(d => d.why === t), dets = [...new Set(L.map(d => d.detail))].sort();
      return [t, Object.fromEntries(dets.map(dt => { const D = L.filter(d => d.detail === dt), S = D.filter(d => d.sw);
        return [dt || '(none)', { draws: perDay(D.length, adultDays), switches: perDay(S.length, adultDays), toTrip: perDay(S.filter(d => TRIP(d.chosen)).length, adultDays), toHunt: perDay(S.filter(d => d.chosen.startsWith('hunt')).length, adultDays),
          wouldKeep: r3(D.filter(d => d.cfKeep >= 0).length ? D.filter(d => d.cfKeep === 1).length / D.filter(d => d.cfKeep >= 0).length : NaN) }]; }))];
    }));
    e3g.decisionsByClass = Object.fromEntries((['adult male', 'female, lactating', 'female, other', 'adolescent 12–15 y', 'juvenile 8–12 y'] as Cls[]).map(k => [k, Object.fromEntries(whys.map(t => {
      const L = gd.filter(d => d.cls === k && d.why === t), S = L.filter(d => d.sw);
      return [t, { draws: perDay(L.length, aDays[k]), switches: perDay(S.length, aDays[k]), toTrip: perDay(S.filter(d => TRIP(d.chosen)).length, aDays[k]), toHunt: perDay(S.filter(d => d.chosen.startsWith('hunt')).length, aDays[k]) }];
    }))]));
    // chains: per animal-day by class and trigger (and trips vs the rest)
    const sums: Record<string, GSum> = {};
    for (const r of res) for (const [k, s] of Object.entries(r.g.sums)) { const t = sums[k] ??= { km: 0, walkK: 0, climbK: 0, carryK: 0, fruitK: 0, fallK: 0, meatK: 0, visits: 0, chains: 0 }; for (const f of Object.keys(t) as (keyof GSum)[]) t[f] += s[f]; }
    const roll = (cls: Cls, pick: (why: string, kind: string) => string | null) => {
      const t: Record<string, GSum> = {};
      for (const [k, s] of Object.entries(sums)) { const [c, why, kind] = k.split('|'); if (c !== cls) continue; const g = pick(why, kind); if (g === null) continue; const u = t[g] ??= { km: 0, walkK: 0, climbK: 0, carryK: 0, fruitK: 0, fallK: 0, meatK: 0, visits: 0, chains: 0 }; for (const f of Object.keys(u) as (keyof GSum)[]) u[f] += s[f]; }
      const D = Math.max(1e-9, aDays[cls]);
      return Object.fromEntries(Object.entries(t).sort().map(([g, s]) => [g, Object.fromEntries(Object.entries(s).map(([f, v]) => [f, r3(v / D)]))]));
    };
    const coarse = (why: string) => why.split(':')[0];
    const chainCls = ['adult male', 'female, lactating', 'female, other', 'juvenile 8–12 y', 'juvenile 5–8 y'] as Cls[];
    e3g.chainsByTrigger = Object.fromEntries(chainCls.map(k => [k, roll(k, why => coarse(why))]));
    e3g.chainsByTriggerDetail = Object.fromEntries(chainCls.map(k => [k, roll(k, why => why)]));
    e3g.chainsByTriggerTrip = Object.fromEntries(chainCls.map(k => [k, roll(k, (why, kind) => `${coarse(why)} ${TRIP(kind) ? 'trip' : kind.startsWith('hunt') ? 'hunt' : kind === 'feed-crown' ? 'crown' : 'other'}`)]));
    e3g.chainsTotal = Object.fromEntries(chainCls.map(k => [k, roll(k, () => 'all').all]));
    // trips and hunts opened at decisions (adults, daylight starts)
    const trips = res.flatMap(r => r.g.trips).filter(t => ADULT.includes(t.cls));
    const outcome = (t: GChain) => t.kind.startsWith('hunt') ? (t.meatK > 0 ? 'meat' : 'no meat') : t.first === t.target ? 'fed at target' : t.first ? 'fed at another crown' : t.fell ? 'fallback only' : 'not fed';
    const tripOf = (L: GChain[]) => ({ perAdultDay: perDay(L.length, adultDays), outcome: dist(L.map(outcome)), kind: dist(L.map(t => t.kind)), held: dist(L.map(t => t.held)),
      d0Median: r3(med(L.map(t => t.d0))), fill0Mean: r3(mean(L.map(t => t.fill0).filter(Number.isFinite))), hunger0Mean: r3(mean(L.map(t => t.hunger0))),
      kmMean: r3(mean(L.map(t => t.km))), spentMean: r3(mean(L.map(t => t.walkK + t.climbK + t.carryK))), climbMean: r3(mean(L.map(t => t.climbK))), fruitMean: r3(mean(L.map(t => t.fruitK))), gainMean: r3(mean(L.map(t => t.fruitK + t.fallK + t.meatK))),
      netMean: r3(mean(L.map(t => t.fruitK + t.fallK + t.meatK - t.walkK - t.climbK - t.carryK))), minMean: r3(mean(L.map(t => ((Number.isFinite(t.t1) ? t.t1 : t.t0) - t.t0) * 60))),
      chosenWorthLess: r3(L.filter(t => Number.isFinite(t.rawCur)).length ? L.filter(t => Number.isFinite(t.rawCur) && t.rawCh < t.rawCur).length / L.filter(t => Number.isFinite(t.rawCur)).length : NaN),
      kmPerAdultDay: perDay(L.reduce((a, t) => a + t.km, 0), adultDays), climbPerAdultDay: perDay(L.reduce((a, t) => a + t.climbK, 0), adultDays),
      wouldKeep: { n: L.filter(t => t.cfKeep >= 0).length, share: r3(L.filter(t => t.cfKeep >= 0).length ? L.filter(t => t.cfKeep === 1).length / L.filter(t => t.cfKeep >= 0).length : NaN) },
      endWhy: dist(L.map(t => t.endWhy || 'open')), endWhyNotFed: dist(L.filter(t => outcome(t) === 'not fed').map(t => t.endWhy || 'open')),
      rate10Mean: r3(mean(L.map(t => t.rate10).filter(Number.isFinite))),
      netRateMean: r3((() => { const F = L.filter(t => Number.isFinite(t.t1) && t.t1 > t.t0); const m = F.reduce((a, t) => a + (t.t1 - t.t0) * 60, 0); return m > 0 ? F.reduce((a, t) => a + t.fruitK + t.fallK + t.meatK - t.walkK - t.climbK - t.carryK, 0) / m : NaN; })()),
      fromCrown: (() => { const F = L.filter(t => t.held === 'feed-crown' && Number.isFinite(t.t1) && t.t1 > t.t0); const m = F.reduce((a, t) => a + (t.t1 - t.t0) * 60, 0); return { n: F.length, rate10Mean: r3(mean(F.map(t => t.rate10))), netRate: r3(m > 0 ? F.reduce((a, t) => a + t.fruitK + t.fallK + t.meatK - t.walkK - t.climbK - t.carryK, 0) / m : NaN), fedAtTarget: r3(F.length ? F.filter(t => outcome(t) === 'fed at target').length / F.length : NaN) }; })() });
    const tw = [...new Set(trips.map(t => t.why))].sort();
    e3g.tripsAdults = Object.fromEntries(tw.map(t => [t, tripOf(trips.filter(q => q.why === t && TRIP(q.kind)))]));
    e3g.tripsAdultsAll = tripOf(trips.filter(q => TRIP(q.kind)));
    e3g.tripsAdultsWouldKeep = tripOf(trips.filter(q => TRIP(q.kind) && q.cfKeep === 1));
    e3g.huntsAdults = Object.fromEntries([...new Set(trips.filter(q => q.kind.startsWith('hunt')).map(t => t.why))].sort().map(t => [t, tripOf(trips.filter(q => q.why === t && q.kind.startsWith('hunt')))]));
    const troopYears = res.reduce((a, r) => a + r.g.troops * r.g.days / 365, 0);
    const sumRec = (f: (r: Result) => Record<string, number>) => { const t: Record<string, number> = {}; for (const r of res) for (const [k, n] of Object.entries(f(r))) t[k] = (t[k] ?? 0) + n; return Object.fromEntries(Object.entries(t).map(([k, n]) => [k, r3(n / troopYears)])); };
    const maleDays = aDays['adult male'], hd = gd.filter(d => d.cls === 'adult male' && d.why === 'hunt');
    e3g.hunting = { truthHuntsPerCommunityYear: r3(res.reduce((a, r) => a + r.g.hunts, 0) / troopYears), leadsPerCommunityYearByTrigger: sumRec(r => r.g.leads), joinsPerCommunityYearByTrigger: sumRec(r => r.g.joins),
      huntDrawsPerMaleDay: perDay(hd.length, maleDays), leadShareAtHuntDraws: r3(hd.length ? hd.filter(d => d.chosen === 'hunt-lead').length / hd.length : NaN), heldAtHuntDraws: dist(hd.map(d => d.held)),
      interruptShareAtHuntDraws: r3(hd.length ? hd.filter(d => d.intr).length / hd.length : NaN), bonusWouldStay: drawsOf(hd, maleDays).bonus,
      leadShareAtInterrupt: r3(hd.filter(d => d.intr).length ? hd.filter(d => d.intr && d.chosen === 'hunt-lead').length / hd.filter(d => d.intr).length : NaN),
      leadShareAtBoutEnd: r3(hd.filter(d => !d.intr).length ? hd.filter(d => !d.intr && d.chosen === 'hunt-lead').length / hd.filter(d => !d.intr).length : NaN) };
    const td: Record<string, [number, number]> = {};
    for (const r of res) for (const [k, v] of Object.entries(r.g.treeDays)) { const t = td[k] ??= [0, 0]; t[0] += v[0]; t[1] += v[1]; }
    e3g.feedingTreesPerAnimalDay = Object.fromEntries(Object.entries(td).map(([k, v]) => [k, r3(v[0] / Math.max(1, v[1]))]));
    // amendment 1 (docs/staging/e3g-prereg.md §2.1): what out-values what; trips by kind and their end states; hunt impulses
    const ovx: Record<string, number> = {};
    for (const r of res) for (const [k, n] of Object.entries(r.g.ovx)) ovx[k] = (ovx[k] ?? 0) + n;
    e3g.outvaluedHeldByOutvaluer = Object.fromEntries(Object.entries(ovx).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n]) => [k, perDay(n, adultDays)]));
    const tripsT = trips.filter(q => TRIP(q.kind));
    const fedT = (t: GChain) => t.first === t.target || t.nextAtT;
    const endOf = (L: GChain[]) => {
      const U = L.filter(t => !fedT(t)), at = U.filter(t => t.dEnd <= 6);
      return { n: L.length, perAdultDay: perDay(L.length, adultDays), fedAtTargetInclNext: r3(L.length ? L.filter(fedT).length / L.length : NaN), nextAtTarget: r3(L.length ? L.filter(t => t.nextAtT).length / L.length : NaN),
        e0Mean: r3(mean(L.map(t => t.e0).filter(Number.isFinite))), fruitAtTargetMean: r3(mean(L.map(t => t.fruitT))), fruitAtTargetWhenFed: r3(mean(L.filter(fedT).map(t => t.fruitT))), e0WhenFed: r3(mean(L.filter(fedT).map(t => t.e0).filter(Number.isFinite))),
        kmMean: r3(mean(L.map(t => t.km))), climbMean: r3(mean(L.map(t => t.climbK))),
        unfed: { n: U.length, endWhy: dist(U.map(t => t.endWhy || 'open')), within6m: r3(U.length ? at.length / U.length : NaN), dEndMedian: r3(med(U.map(t => t.dEnd))),
          atTarget: { n: at.length, cropBelowSeen: r3(at.length ? at.filter(t => t.cropEnd < 0.06).length / at.length : NaN), cropMedian: r3(med(at.map(t => t.cropEnd))), inView: r3(at.filter(t => t.inView >= 0).length ? at.filter(t => t.inView === 1).length / at.filter(t => t.inView >= 0).length : NaN),
            feedOption: r3(at.filter(t => t.feedOpt >= 0).length ? at.filter(t => t.feedOpt === 1).length / at.filter(t => t.feedOpt >= 0).length : NaN), next: dist(at.map(t => t.next)) },
          away: { next: dist(U.filter(t => !(t.dEnd <= 6)).map(t => t.next)) } } };
    };
    e3g.tripsByKind = Object.fromEntries(['trip-own', 'trip-joined', 'trip-caller'].map(k => [k, endOf(tripsT.filter(t => t.kind === k))]));
    e3g.tripsByKindTrigger = Object.fromEntries(['trip-own', 'trip-joined', 'trip-caller'].map(k => [k, Object.fromEntries([...new Set(tripsT.filter(t => t.kind === k).map(t => t.why))].sort().map(w => [w, endOf(tripsT.filter(t => t.kind === k && t.why === w))]))]));
    const hiAll = res.reduce((a, r) => ({ n: a.n + r.g.hi.n, lead: a.lead + r.g.hi.lead, resight: a.resight + r.g.hi.resight, resightLead: a.resightLead + r.g.hi.resightLead }), { n: 0, lead: 0, resight: 0, resightLead: 0 });
    const hiWhy: Record<string, number> = {};
    for (const r of res) for (const [k, n] of Object.entries(r.g.hi.byWhy)) hiWhy[k] = (hiWhy[k] ?? 0) + n;
    e3g.huntImpulses = { perMaleDay: perDay(hiAll.n, maleDays), leadShare: r3(hiAll.n ? hiAll.lead / hiAll.n : NaN), resightShare: r3(hiAll.n ? hiAll.resight / hiAll.n : NaN),
      leadsPerMaleDay: perDay(hiAll.lead, maleDays), resightLeadsPerMaleDay: perDay(hiAll.resightLead, maleDays), byTrigger: Object.fromEntries(Object.entries(hiWhy).map(([k, n]) => [k, perDay(n, maleDays)])) };
    { const ty = res.flatMap(r => r.g.ty ?? []); e3g.tripYield = { n: ty.length, mean: r3(mean(ty)), median: r3(med(ty)) }; }
    out.e3g = e3g;
  }
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ identity: out.identity, maleIdentity: out.maleIdentity, maxAge: { ...(out.maxAge as object), byClass: undefined, changed: undefined, changedWhenSwitched: undefined } }, null, 1));
  console.log('decides', JSON.stringify(out.decides));
  console.log('switches by trigger', JSON.stringify(out.switchesByTrigger));
  console.log('acts per animal-hour', JSON.stringify(out.actsPerAnimalHour));
  for (const a of ACTS) { const r = (out.runs as Record<string, Record<string, ReturnType<typeof runOf>>>)[a].all; console.log(`runs ${a}: n ${r.n} median ${r.medianMin} mean ${r.meanMin} p90 ${r.p90Min} startTop ${r.startTop} cross ${r.crossMedianMin} crossed ${r.crossedShare} endBy ${JSON.stringify(r.endBy)}`); }
  for (const kd of ['bonus', 'penalty', 'groom+', 'groom-']) { const c = (out.continuation as Record<string, Record<string, ReturnType<typeof cfOf>>>)[kd]; console.log(`${kd}: rg ${JSON.stringify(c.rgDraws)} argmax ${JSON.stringify(c.argmaxOld)} young ${JSON.stringify(c.young)}`); }
}
