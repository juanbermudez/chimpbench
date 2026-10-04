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
//   pnpm exec tsx scripts/redecide-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { CODE, candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { gate, patchPoorHere, rgMenu, rgTap } from '../src/sim/rg';
import { bucketOf } from '../src/decide/facts';
import type { Intent } from '../src/decide/gate';
import { softmax } from '../src/decide/policies';
import { hash01 } from '../src/sim/rng';
import { paramsOf, type Params } from '../src/sim/params';
import { index, isChimpId, ix, TICK_HOURS } from '../src/sim/state';
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
interface Result {
  seed: number; draws: Draw[]; cfs: Cf[]; runs: Run[];
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
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, draws: [], cfs: [], runs: [], counts: {}, nightCounts: {}, dayTicks: {}, runsStarted: {}, identity: { menuMismatch: 0, probErr: 0, checked: 0 },
    male: { ticks: 0, eating: 0, walked: 0 }, living: [w.chimps.filter(c => c.alive).length, 0], deaths: {} };
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

  rulesTap.fn = (c, list) => {
    if (!windowOn || !c.alive) return;
    if (P.rgOn === 1 && c.age >= P.rgMinAge) return; // RG decisions are read by rgTap
    bump(c, 'young');
    if (day()) cfAll(c, list, false, 'young');
    lastWhy.set(c.id, 'young');
  };
  rgTap.fn = (c, list, menu, probs, chosen, why) => {
    if (!windowOn) return;
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
  windowOn = true;
  const prevPos = new Map<number, [number, number]>(), prevIn = new Map<number, number>(), maleCls = new Map<number, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    lastWhy.clear();
    tickWorld(w);
    if (i % 240 === 0) for (const c of w.chimps) if (c.alive) maleCls.set(c.id, c.age >= 15 && c.sex === 'male');
    const d = day();
    for (const c of w.chimps) {
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
  }
  rulesTap.fn = null; rgTap.fn = null;
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
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ identity: out.identity, maleIdentity: out.maleIdentity, maxAge: { ...(out.maxAge as object), byClass: undefined, changed: undefined, changedWhenSwitched: undefined } }, null, 1));
  console.log('decides', JSON.stringify(out.decides));
  console.log('switches by trigger', JSON.stringify(out.switchesByTrigger));
  console.log('acts per animal-hour', JSON.stringify(out.actsPerAnimalHour));
  for (const a of ACTS) { const r = (out.runs as Record<string, Record<string, ReturnType<typeof runOf>>>)[a].all; console.log(`runs ${a}: n ${r.n} median ${r.medianMin} mean ${r.meanMin} p90 ${r.p90Min} startTop ${r.startTop} cross ${r.crossMedianMin} crossed ${r.crossedShare} endBy ${JSON.stringify(r.endBy)}`); }
  for (const kd of ['bonus', 'penalty', 'groom+', 'groom-']) { const c = (out.continuation as Record<string, Record<string, ReturnType<typeof cfOf>>>)[kd]; console.log(`${kd}: rg ${JSON.stringify(c.rgDraws)} argmax ${JSON.stringify(c.argmaxOld)} young ${JSON.stringify(c.young)}`); }
}
