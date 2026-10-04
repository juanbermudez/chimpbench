// Stage E3f diagnosis (development tool, reads only; docs/staging/e3f-prereg.md §2): what a crown holds, in energy.
// The world is e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in + tickWorld, no
// observer); taps (rgTap, energyTap) read only, so the simulation is unchanged.
//
// Feeding in a crown: forage at a tree, phase 2 (in the crown), animals ≥ 5 y. A tick in which an animal ate fruit at a
// crown (energyTap 'eaten', drupe or fig) also counts as feeding there, so the bite of a bout's last tick (the animal
// finishes in the same tick) belongs to its visit.
//
// Readouts (definitions registered in the prereg §2; simulation truth):
//   crop: fruitAt (fruit units) and cropTarget (the phenology crop); kcal = units × the tree's kcal per unit (cropKcalPerUnit:
//     today fruitKcalPerUnit for its food, fig or drupe). Capacity = maxFruit. Crown size = tree.canopy (crown radius, m).
//   landscape (daily at noon): every tree whose crop is ≥ 0.06 units (seen as fruiting, perception.ts): crop kcal by fig and
//     non-fig; every tree's capacity in kcal by species.
//   visits: an animal's consecutive feeding ticks in one crown; a return after < 10 min joins the visit (the observer's
//     T-FOOD-4 rule, janmaat2013b; revisit-diagnose). Per visit: minutes, crop at its first and last feeding tick, kcal
//     eaten there, feeders in the crown at its start (itself included), the bout room (energy.ts boutRoom at the animal's
//     full fruit rate) and the energy need (energyNeed) at its start, and what ended it (below).
//   feeders at once: every 1-min sample in daylight (> 0.1), each crown with ≥ 1 feeder: the number of feeders and the
//     crop kcal; crown-weighted and feeder-weighted means, by crop-kcal tercile (pooled cut points).
//   episodes: a crown's continuous occupancy by ≥ 1 feeder (a gap ≥ 10 min ends it): minutes, crop kcal at start and end,
//     kcal eaten by all its feeders, visits started in it, mean and maximum feeders, lowest crop (units) reached.
//   crowns over the window: visits and kcal eaten per crown fed in; whether its crop fell below 0.06 or 0.02 units while
//     an animal fed in it, and the visits until then.
//   bout ends (visits of animals ≥ 12 y closed inside the window; state after the last feeding tick, act on the next):
//     crown empty (crop < the code's end threshold, execution.ts forageTick), sated (hunger < 0.06), gut full (foregut dry
//     matter ≥ 0.95 of capacity), party leaving (next act a party follow or a joined trip), care follow, other (with the
//     rules decision reason, rgTap, of the last feeding tick or the next, and the next act).
//
//   pnpm exec tsx scripts/crop-energy-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { V } from '../src/sim/candidates';
import { boutRoom, digestaCaps, energyNeed, energyTap, fruitKcalPerUnit, gutCap, intakeSize, plantKcalPerMin } from '../src/sim/energy';
import { paramsOf, type Params } from '../src/sim/params';
import { cropTarget, fruitAt } from '../src/sim/phenology';
import { rgTap } from '../src/sim/rg';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, Tree, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN = Math.round(1 / 60 / TICK_HOURS), GAP10 = 10 * MIN;
const NOON = Math.round(5.5 / TICK_HOURS) - 1; // the tick of a day that ends at 12:00 (world.time 0 is 06:30)
const SEEN = 0.06, EMPTY = 0.02; // perception.ts (a crown below 0.06 units is not seen as fruiting), execution.ts forageTick (a bout ends below 0.02)
const CLS = ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y', 'other'] as const;
type Cls = typeof CLS[number];

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Visit { id: number; cls: Cls; age: number; tree: number; fig: number; sp: string; canopy: number; cap: number; kpu: number; t0: number; t1: number;
  crop0: number; crop1: number; tgt0: number; minCrop: number; ate: number; n0: number; room0: number; need0: number; end: string; next: string; why: string; fill: number; hunger: number }
interface Episode { tree: number; fig: number; canopy: number; kpu: number; minutes: number; crop0: number; crop1: number; minCrop: number; ate: number; visits: number; meanN: number; maxN: number }
interface CrownW { visits: number; ate: number; fig: number; canopy: number; kpu: number; cap: number; tgtFirst: number; cropFirst: number; seenAt: number; emptyAt: number }
interface Result {
  seed: number; days: number; kpuDrupe: number; kpuFig: number; kcalMinDrupe: number; kcalMinFig: number; visits: Visit[]; episodes: Episode[]; crowns: Record<number, CrownW>;
  samples: { k: number[]; n: number[] }; land: { fig: number[]; drupe: number[]; perDay: number[] }; capBySp: Record<string, number[]>;
  classDays: Record<string, number>; unattributedKcal: number; deaths: Record<string, number>; living: [number, number];
}

/** kcal per crop unit of a tree: today's conversion (the crop depletes at fruitIntakePerH units per hour). */
function cropKcalPerUnit(P: Params, t: Tree): number { return fruitKcalPerUnit(P, t.common === 'fig'); }
/** The crop below which a feeding bout ends (execution.ts forageTick), in units. */
function emptyUnits(_P: Params, _t: Tree): number { return EMPTY; }

function classOf(c: Chimp): Cls | null {
  if (c.age < 5) return null;
  if (c.age < 12) return 'juvenile 5–12 y';
  if (c.age < 15) return 'other';
  if (c.sex === 'male') return 'adult male';
  if (c.lactating) return 'female, lactating';
  return c.pregnancy > 0 ? 'other' : 'female, other';
}
function nextActOf(c: Chimp): string {
  const x = ix(c), a = c.action;
  if (a === 'follow') return x.v === V.PARTY ? 'party follow' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'care follow' : 'follow other';
  if (a === 'travel') return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'caller' : 'travel other';
  if (a === 'forage') return isTreeId(c.targetId) ? 'crown in view' : 'fallback';
  if (a === 'groom' || a === 'rest' || a === 'nest' || a === 'drink' || a === 'play' || a === 'nurse') return a;
  return `other: ${a}`;
}
const feedingIn = (c: Chimp) => c.alive && c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase === 2;

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w: World = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, days, kpuDrupe: fruitKcalPerUnit(P, false), kpuFig: fruitKcalPerUnit(P, true), kcalMinDrupe: plantKcalPerMin(P, 'drupe'), kcalMinFig: plantKcalPerMin(P, 'fig'), visits: [], episodes: [], crowns: {},
    samples: { k: [], n: [] }, land: { fig: [], drupe: [], perDay: [] }, capBySp: {}, classDays: {}, unattributedKcal: 0, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0] };
  for (const n of CLS) R.classDays[n] = 0;
  for (const t of w.trees) (R.capBySp[t.species] ??= []).push(Math.round(t.maxFruit * cropKcalPerUnit(P, t)));
  let observing = false, curTick = -1;
  const dec = new Map<number, { tick: number; why: string }>();
  rgTap.fn = (c, _list, _menu, _probs, _chosen, why) => { if (observing) dec.set(c.id, { tick: curTick, why }); };
  const fruitTick = new Map<number, number>(), fruitTree = new Map<number, number>();
  energyTap.fn = (c, term, kcal, kind) => {
    if (!observing || term !== 'eaten' || (kind !== 'drupe' && kind !== 'fig')) return;
    fruitTick.set(c.id, (fruitTick.get(c.id) ?? 0) + kcal); fruitTree.set(c.id, c.targetId);
  };
  interface Open { tree: number; t0: number; tLast: number; tickLast: number; crop0: number; crop1: number; tgt0: number; minCrop: number; ate: number; n0: number; room0: number; need0: number;
    fill: number; hunger: number; end: string; next: string; why: string; endSet: boolean }
  const open = new Map<number, Open>();
  interface Ep { tick0: number; tickLast: number; crop0: number; crop1: number; minCrop: number; ate: number; visits: number; sumN: number; samples: number; maxN: number }
  const eps = new Map<number, Ep>();
  const crownOf = (t: Tree): CrownW => R.crowns[t.id] ??= { visits: 0, ate: 0, fig: t.common === 'fig' ? 1 : 0, canopy: t.canopy, kpu: cropKcalPerUnit(P, t), cap: t.maxFruit, tgtFirst: NaN, cropFirst: NaN, seenAt: -1, emptyAt: -1 };
  const closeVisit = (c: Chimp, o: Open) => {
    const t = index(w).treeById.get(o.tree)!;
    R.visits.push({ id: c.id, cls: classOf(c) ?? 'other', age: c.age, tree: o.tree, fig: t.common === 'fig' ? 1 : 0, sp: t.species, canopy: t.canopy, cap: t.maxFruit, kpu: cropKcalPerUnit(P, t),
      t0: o.t0, t1: o.tLast, crop0: o.crop0, crop1: o.crop1, tgt0: o.tgt0, minCrop: o.minCrop, ate: o.ate, n0: o.n0, room0: o.room0, need0: o.need0, end: o.end, next: o.next, why: o.why, fill: o.fill, hunger: o.hunger });
  };
  const closeEp = (tid: number, e: Ep) => {
    const t = index(w).treeById.get(tid)!, k = cropKcalPerUnit(P, t);
    R.episodes.push({ tree: tid, fig: t.common === 'fig' ? 1 : 0, canopy: t.canopy, kpu: k, minutes: (e.tickLast - e.tick0 + 1) * TICK_HOURS * 60,
      crop0: e.crop0 * k, crop1: e.crop1 * k, minCrop: e.minCrop, ate: e.ate, visits: e.visits, meanN: e.samples ? e.sumN / e.samples : NaN, maxN: e.maxN });
  };
  const nIn = new Map<number, number>();
  observing = true;
  for (let i = 0; i < days * DAY; i++) {
    fruitTick.clear(); fruitTree.clear();
    curTick = i;
    tickWorld(w);
    const idx = index(w), alive = idx.alive, light = w.environment.daylight > 0.1;
    if (i % DAY === 0) for (const c of alive) { const n = classOf(c); if (n) R.classDays[n]++; }
    // feeders per crown this tick (≥ 5 y, in the crown)
    nIn.clear();
    for (const c of alive) if (c.age >= 5 && feedingIn(c)) nIn.set(c.targetId, (nIn.get(c.targetId) ?? 0) + 1);
    // visits
    for (const c of alive) {
      if (c.age < 5) continue;
      const o = open.get(c.id), x = ix(c);
      const inTree = feedingIn(c) ? c.targetId : -1, ateTree = fruitTree.get(c.id) ?? -1, kcal = fruitTick.get(c.id) ?? 0;
      const tree = inTree >= 0 ? inTree : isTreeId(ateTree) && kcal > 0 ? ateTree : -1;
      if (tree < 0 && kcal > 0) R.unattributedKcal += kcal;
      if (tree >= 0) {
        const t = idx.treeById.get(tree)!, crop = fruitAt(w, t), L = x.en, caps = L && L.dm !== undefined ? digestaCaps(c, P) : null;
        const fill = caps ? L!.dm! / caps[0] : L ? L.gut / gutCap(c, P) : NaN;
        const cw = crownOf(t);
        if (o && o.tree === tree) {
          if (o.endSet) { o.endSet = false; o.end = ''; o.next = ''; o.why = ''; } // back within 10 min: the same visit
          o.tLast = w.time; o.tickLast = i; o.crop1 = crop; o.minCrop = Math.min(o.minCrop, crop); o.ate += kcal; o.fill = fill; o.hunger = c.hunger;
        } else {
          if (o) { if (!o.endSet) { o.end = 'switch'; o.next = 'crown in view'; o.why = 'none'; } closeVisit(c, o); }
          const full = P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1) * fruitKcalPerUnit(P, t.common === 'fig');
          const n0 = Math.max(1, nIn.get(tree) ?? 1);
          open.set(c.id, { tree, t0: w.time, tLast: w.time, tickLast: i, crop0: crop, crop1: crop, tgt0: cropTarget(w, t, w.time), minCrop: crop, ate: kcal, n0,
            room0: boutRoom(c, P, full), need0: energyNeed(c, P), fill, hunger: c.hunger, end: '', next: '', why: '', endSet: false });
          cw.visits++;
          if (!Number.isFinite(cw.tgtFirst)) { cw.tgtFirst = cropTarget(w, t, w.time); cw.cropFirst = crop; }
          const e = eps.get(tree); if (e) e.visits++;
        }
        cw.ate += kcal;
        if (crop < SEEN && cw.seenAt < 0) cw.seenAt = cw.visits;
        if (crop < emptyUnits(P, t) && cw.emptyAt < 0) cw.emptyAt = cw.visits;
      } else if (o) {
        if (!o.endSet) {
          o.endSet = true;
          const t = idx.treeById.get(o.tree)!;
          o.end = o.crop1 < emptyUnits(P, t) ? 'crown empty' : o.hunger < 0.06 ? 'sated' : o.fill >= 0.95 ? 'gut full' : 'decision';
          const d = dec.get(c.id); o.why = d && (d.tick === i || d.tick === o.tickLast) ? d.why : 'none';
          o.next = nextActOf(c);
        }
        if (i - o.tickLast >= GAP10) { closeVisit(c, o); open.delete(c.id); }
      }
    }
    // crown episodes, from the per-tick feeders; kcal eaten by the feeders in each crown this tick
    for (const c of alive) { const tt = fruitTree.get(c.id); if (tt !== undefined && isTreeId(tt)) { const e = eps.get(tt); if (e) e.ate += fruitTick.get(c.id) ?? 0; } }
    for (const [tid, n] of nIn) {
      const t = idx.treeById.get(tid)!, crop = fruitAt(w, t);
      let e = eps.get(tid);
      if (!e) { e = { tick0: i, tickLast: i, crop0: crop, crop1: crop, minCrop: crop, ate: 0, visits: n, sumN: 0, samples: 0, maxN: 0 }; eps.set(tid, e); for (const c of alive) if (fruitTree.get(c.id) === tid) e.ate += fruitTick.get(c.id) ?? 0; }
      e.tickLast = i; e.crop1 = crop; e.minCrop = Math.min(e.minCrop, crop); if (n > e.maxN) e.maxN = n;
      if (i % MIN === 0) { e.sumN += n; e.samples++; }
      if (light && i % MIN === 0) { R.samples.k.push(Math.round(crop * cropKcalPerUnit(P, t))); R.samples.n.push(n); }
    }
    for (const [tid, e] of eps) if (i - e.tickLast >= GAP10) { closeEp(tid, e); eps.delete(tid); }
    // landscape at noon
    if (i % DAY === NOON) {
      let nf = 0;
      for (const t of w.trees) { const u = fruitAt(w, t); if (u >= SEEN) { nf++; (t.common === 'fig' ? R.land.fig : R.land.drupe).push(Math.round(u * cropKcalPerUnit(P, t))); } }
      R.land.perDay.push(nf);
    }
  }
  for (const [id, o] of open) { const c = w.chimps.find(k => k.id === id)!; if (!o.endSet) { o.end = 'window'; o.next = 'window'; o.why = 'window'; } closeVisit(c, o); }
  for (const [tid, e] of eps) closeEp(tid, e);
  observing = false; rgTap.fn = null; energyTap.fn = null;
  R.living[1] = w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; R.deaths[k] = (R.deaths[k] ?? 0) + 1; }
  return R;
}

// ---------------------------------------------------------------------------------------------- summary (main thread)
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const q = (v: number[], p: number) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const dist = (v: number[]) => ({ n: v.length, mean: mean(v), p10: q(v, 0.1), p25: q(v, 0.25), p50: q(v, 0.5), p75: q(v, 0.75), p90: q(v, 0.9), p99: q(v, 0.99) });
const share = <T>(v: T[], f: (x: T) => boolean) => v.length ? v.filter(f).length / v.length : NaN;
const tally = <T>(v: T[], f: (x: T) => string) => { const m: Record<string, number> = {}; for (const x of v) m[f(x)] = (m[f(x)] ?? 0) + 1; for (const k in m) m[k] = Math.round(m[k] / v.length * 1000) / 1000; return m; };

export function summarize(res: Result[]) {
  const S: Record<string, unknown> = {};
  const kU = res[0].kpuDrupe, kF = res[0].kpuFig;
  S.conversion = { kcalPerUnitDrupe: kU, kcalPerUnitFig: kF, seenFruiting006: [SEEN * kU, SEEN * kF], forget004: [0.04 * kU, 0.04 * kF], empty002: [EMPTY * kU, EMPTY * kF], unknownCrop02: [0.2 * kU, 0.2 * kF],
    adultHourKcal: { drupe: res[0].kcalMinDrupe * 60, fig: res[0].kcalMinFig * 60 } };
  // landscape
  const lf = res.flatMap(r => r.land.fig), ld = res.flatMap(r => r.land.drupe);
  S.landscape = { fruitingPerDay: mean(res.flatMap(r => r.land.perDay)), figKcal: dist(lf), drupeKcal: dist(ld), allKcal: dist([...lf, ...ld]),
    capacityBySpecies: Object.fromEntries(Object.keys(res[0].capBySp).map(sp => [sp, dist(res.flatMap(r => r.capBySp[sp] ?? []))])) };
  // visits
  const V5 = res.flatMap(r => r.visits).filter(v => v.end !== 'window'), V12 = V5.filter(v => v.age >= 12);
  const cuts = [q(V5.map(v => v.canopy), 1 / 3), q(V5.map(v => v.canopy), 2 / 3)];
  const sizeOf = (r: number) => r < cuts[0] ? 'small' : r < cuts[1] ? 'mid' : 'large';
  const vstat = (v: Visit[]) => ({ n: v.length, minutesMedian: q(v.map(x => (x.t1 - x.t0) * 60 + 0.25), 0.5), minutesMean: mean(v.map(x => (x.t1 - x.t0) * 60 + 0.25)),
    crop0Kcal: dist(v.map(x => x.crop0 * x.kpu)), tgt0Kcal: mean(v.map(x => x.tgt0 * x.kpu)), capKcal: mean(v.map(x => x.cap * x.kpu)), crop0Units: mean(v.map(x => x.crop0)),
    ateKcal: dist(v.map(x => x.ate)), ateShareOfCrop0: mean(v.filter(x => x.crop0 > EMPTY).map(x => x.ate / (x.crop0 * x.kpu))),
    feedersAtStart: mean(v.map(x => x.n0)), room0: mean(v.map(x => x.room0).filter(Number.isFinite)), need0: mean(v.map(x => x.need0)),
    cropShareBelowRoom: share(v, x => x.crop0 * x.kpu / x.n0 < x.room0), visitsTheCropHolds: (() => { const m = mean(v.map(y => y.ate)); return dist(v.map(x => x.crop0 * x.kpu / m)); })() });
  S.visits = { all5: vstat(V5), adults12: vstat(V12), fig: vstat(V5.filter(v => v.fig === 1)), nonFig: vstat(V5.filter(v => v.fig === 0)),
    canopyCuts: cuts, bySize: Object.fromEntries(['small', 'mid', 'large'].map(s => [s, vstat(V5.filter(v => sizeOf(v.canopy) === s))])),
    bySpecies: Object.fromEntries([...new Set(V5.map(v => v.sp))].sort().map(sp => [sp, vstat(V5.filter(v => v.sp === sp))])) };
  // kcal from crowns per animal-day by class
  const cd: Record<string, number> = {}; for (const r of res) for (const [k, n] of Object.entries(r.classDays)) cd[k] = (cd[k] ?? 0) + n;
  S.perClassDay = Object.fromEntries(CLS.map(n => { const v = V5.filter(x => x.cls === n); return [n, { animalDays: cd[n], kcalFromCrowns: v.reduce((s, x) => s + x.ate, 0) / Math.max(1, cd[n]), visits: v.length / Math.max(1, cd[n]),
    crownMinutes: v.reduce((s, x) => s + (x.t1 - x.t0) * 60 + 0.25, 0) / Math.max(1, cd[n]) }]; }));
  // feeders at once
  const K = res.flatMap(r => r.samples.k), N = res.flatMap(r => r.samples.n);
  const kc = [q(K, 1 / 3), q(K, 2 / 3)];
  const fw = (idx: number[]) => { let s = 0, w2 = 0; for (const i of idx) { s += N[i] * N[i]; w2 += N[i]; } return w2 ? s / w2 : NaN; };
  const all = K.map((_, i) => i), byT = [all.filter(i => K[i] < kc[0]), all.filter(i => K[i] >= kc[0] && K[i] < kc[1]), all.filter(i => K[i] >= kc[1])];
  S.feedersAtOnce = { samples: K.length, crownWeighted: mean(N), feederWeighted: fw(all), shareAlone: share(N, n => n === 1), cropKcalCuts: kc,
    byCropTercile: byT.map(ix2 => ({ n: ix2.length, cropKcalMean: mean(ix2.map(i => K[i])), crownWeighted: mean(ix2.map(i => N[i])), feederWeighted: fw(ix2) })) };
  // episodes
  const E = res.flatMap(r => r.episodes);
  const estat = (e: Episode[]) => ({ n: e.length, minutes: dist(e.map(x => x.minutes)), crop0Kcal: dist(e.map(x => x.crop0)), ateKcal: dist(e.map(x => x.ate)), ateShare: mean(e.filter(x => x.crop0 > 0).map(x => x.ate / x.crop0)),
    visits: mean(e.map(x => x.visits)), meanN: mean(e.map(x => x.meanN).filter(Number.isFinite)), maxN: mean(e.map(x => x.maxN)), endedBelowSeen: share(e, x => x.minCrop < SEEN), endedBelowEmpty: share(e, x => x.minCrop < EMPTY) });
  S.episodes = { all: estat(E), fig: estat(E.filter(x => x.fig === 1)), nonFig: estat(E.filter(x => x.fig === 0)) };
  // crowns over the window
  const C = res.flatMap(r => Object.values(r.crowns));
  S.crowns = { n: C.length, visitsPerCrown: dist(C.map(c => c.visits)), kcalEatenPerCrown: dist(C.map(c => c.ate)), eatenShareOfFirstPhenologyCrop: mean(C.filter(c => c.tgtFirst > 0).map(c => c.ate / (c.tgtFirst * c.kpu))),
    fellBelowSeen: share(C, c => c.seenAt >= 0), fellBelowEmpty: share(C, c => c.emptyAt >= 0), visitsUntilBelowSeen: dist(C.filter(c => c.seenAt >= 0).map(c => c.seenAt)) };
  // bout ends (≥ 12 y)
  const cat = (v: Visit) => v.end !== 'decision' ? v.end : v.next === 'party follow' || v.next === 'joined trip' ? 'party leaving' : v.next === 'care follow' ? 'care follow' : 'other';
  S.boutEnd = { n: V12.length, category: tally(V12, cat), byClass: Object.fromEntries(CLS.map(n => [n, tally(V12.filter(v => v.cls === n), cat)])),
    otherWhy: tally(V12.filter(v => cat(v) === 'other'), v => v.why), otherNext: tally(V12.filter(v => cat(v) === 'other'), v => v.next), next: tally(V12, v => v.next) };
  S.unattributedKcal = res.reduce((s, r) => s + r.unattributedKcal, 0);
  S.deaths = Object.assign({}, ...res.map(r => r.deaths)); S.living = res.map(r => r.living);
  return S;
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) {
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
  const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), workers = +arg('workers', '2');
  if (burnIn + days > 90) throw new Error('burn-in + days > 90 (user limit)');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const t0 = performance.now();
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const S = summarize(res);
  console.log(JSON.stringify({ seeds, burnIn, days, params, wallS: (performance.now() - t0) / 1000, ...S }, null, 1).slice(0, 30000));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'crop-energy-diagnose', seeds, burnIn, days, params, ...S }, null, 1));
}
