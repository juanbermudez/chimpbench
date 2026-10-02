// Stage E5c diagnosis (development tool, reads only; docs/staging/e5c-prereg.md §2): why the number of animals feeding
// in a crown does not follow its crop. The world is e-bench's for the same seed and params (createWorld + burn-in +
// tickWorld, as scripts/cohesion-diagnose.ts); e-bench's party-follow team set (seed 1 + 7919, 'party-larger', lite,
// 2-min points) gives T-PTY-1 as an identity check, and its main (focal) team set (seed 1) the observer's feeding scans.
//
// Feeders: animals of 5 y or more feeding in a crown (forage at a tree, phase ≥ 2). Daylight > 0.1. Party: the 50-m chain
// of community members of every age (partyLinkM in the field profile).
//
// Readouts (definitions registered in the prereg §2):
//   crowns (truth, every 15 min): each tree with ≥ 1 feeder: feeders; crop (fruitAt, fruit units) and chimp-hours (crop ÷
//     a reference adult female's ripe-fruit intake per hour, intake.ts fruitRate); crown radius (tree.canopy, m). Feeders
//     by crop tercile and by radius tercile (pooled cut points), R² of feeders on crop, on ln crop and on radius.
//   feedScans (truth, focal-weighted; the observer's T-PTY-2 count applied to every subject ≥ 12 y feeding in a crown
//     at the 15-min scan): feedN = members of its 50-m party (all ages, itself included) feeding in the same crown;
//     R² of feedN on radius and on crop. observerScans: the same from e-bench's focal team set (src/field/protocols.ts
//     scan: tree, canopy, feedN), the patch part of T-PTY-2 (feedN on canopy) without its 4-month requirement.
//   choices (rgTap; animals ≥ 8 y; fresh decisions: the gate's 'kept' and 'arrived' excluded) whose candidate list holds
//     at least one crown option: a forage option at a tree in view ('crown'), an own trip to a remembered or known tree
//     (travel V.TREE, no leader: 'trip') or a joined trip (travel V.TREE with a leader: 'join'). Each crown option's score
//     split as candidates.ts builds it:
//       crown: A = 1.6·h + 0.1, Q = 0.55 + 0.45·min(1, crop ÷ fruitValueRef), tw(n) = tripWorth with n co-feeders seen
//              crop  = A·0.45·min(1, crop)·tw(n)          (what the crop adds beyond an empty crown's base)
//              share = A·Q·(tw(n) − tw(0))                 (what the co-feeders seen take through the shared crop)
//              trip  = A·Q·(tw(0) − 1) − d ÷ forageDistScaleM   (the walk)
//              crowd = −n·crowdCompeteW·(crowdScarcityRef − fruit index)·(rank factor)   (habitat-wide crowding)
//              base  = A·0.55·tw(n) − (crop part already counted) … reported as A·0.55·tw(n)
//       trip:  W = h·memTravelHungerW; the same with W in place of A, n = 0, the believed crop (treeCrop, else the
//              community's expected crop, else 0.2) and tripCost in place of d ÷ forageDistScaleM
//       jitter = (hash01(id, decisionVersion, CODE, target) − 0.5)·candidateJitterSpan; other = score − the rest
//              (territory, core area, rain, fig bonus, revisit, continuation bonus; the joined trip's company)
//     For the chosen crown option and the best rejected one (highest score among the others): the terms, crop, feeders seen
//     and distance; how often the chosen one has the larger crop; the within-decision spread of each term over the crown
//     options; how often the crop share binds (crop ÷ (1 + n) in kcal below both the energy need and the bout's gut room).
//     companions: when the animal takes a crown or an own trip while a companion in its 50-m party feeds in another crown:
//     whether that crown was an option, in view (x.trees), and the term differences chosen − companion's crown.
//   parties (truth, every 15 min): 50-m parties with ≥ 2 feeders: distinct crowns, share of feeders in the party's
//     largest crown group, distance between the crowns used, and for a feeder outside that crown whether it was in view.
//   episodes (truth, 1-min samples): a crown's continuous occupancy by ≥ 1 feeder: minutes, crop at start and end, mean
//     and maximum feeders, crop fall per hour, ended with the crop below 0.06 (no longer seen as fruiting) or 0.02.
//   intake (energyTap 'eaten', every tick): for each feeder in a crown, kcal eaten ÷ its full ripe-fruit rate per tick, by
//     the crown's feeders (1, 2, 3+); ticks crop-limited (the crop left after the tick below 0.02 + feeders × the rate).
//   identity: T-PTY-1 of the party-follow team set (must equal e-bench's per seed).
//
//   pnpm exec tsx scripts/crown-share-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { candidateMeta, companyValue, V } from '../src/sim/candidates';
import { gridOf, levels, territoryCost } from '../src/sim/territory';
import { boutRoom, energyNeed, energyTap, fruitKcalPerUnit, gutCap, intakeSize } from '../src/sim/energy';
import { fruitRate, treeIntake } from '../src/sim/intake';
import { darkOn, tripLight, type TripLight } from '../src/sim/light';
import { paramsOf, type Params } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { rgTap } from '../src/sim/rg';
import { hash01 } from '../src/sim/rng';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, Tree, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN = Math.round(1 / 60 / TICK_HOURS), SCAN = 15 * MIN;
const CODE_FORAGE = 2, CODE_TRAVEL = 4; // candidates.ts CODE
const CROWN_Y = 0.45 + 0.28 / 2;          // candidates.ts CROWN_Y

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
type Terms = { base: number; crop: number; trip: number; share: number; crowd: number; cont: number; revisit: number; place: number; rain: number; social: number; jitter: number; other: number };
interface Opt { kind: 'crown' | 'trip' | 'join'; tree: number; score: number; crop: number; n: number; d: number; t: Terms; binds: boolean; cropBinds: boolean }
interface Choice { kind: string; why: string; chosen: Opt | null; rejected: Opt | null; nOpts: number; nCrownOpts: number; spread: Record<string, number> | null; anyBinds: boolean; comp: CompRec | null; opts: { s: number; crop: number; n: number; t: Terms; kind: string }[] | null }
interface CompRec { companionCrown: number; asOption: boolean; inView: boolean; dTerms: Terms | null; dCrop: number; dD: number; dN: number; chosenIsCompanions: boolean }
interface Result {
  seed: number; tpty1: number | null; observerTpty1Scans: number;
  crowns: { feeders: number[]; crop: number[]; chimpH: number[]; radius: number[] };
  feedScans: { n: number[]; crop: number[]; radius: number[] };
  observerScans: { n: number[]; radius: number[] };
  choices: Choice[];
  parties: { n: number; crowns: number[]; modalShare: number[]; crownDist: number[]; outsideInView: number; outside: number; outsideCropOwn: number[]; outsideCropModal: number[] };
  episodes: { min: number[]; crop0: number[]; crop1: number[]; meanN: number[]; maxN: number[]; fallPerH: number[]; below06: number; below02: number };
  intake: { byN: Record<string, { ticks: number; ratio: number; short: number; cropLimited: number }> };
  deaths: Record<string, number>; living: [number, number];
}

function chain(list: Chimp[], link: number): number[] {
  const n = list.length, par = Array.from({ length: n }, (_, i) => i), l2 = link * link;
  const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = list[i], b = list[j], dx = a.position[0] - b.position[0], dz = a.position[2] - b.position[2];
    if (dx * dx + dz * dz <= l2) { const ra = find(i), rb = find(j); if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb); }
  }
  return list.map((_, i) => find(i));
}

const feeding = (c: Chimp) => c.alive && c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase >= 2;

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const obs = createObserver(w, { seed: 1, profile: PROFILES.field, truth: true });
  const pobs = createObserver(w, { seed: 1 + 7919, profile: PROFILES.field, truth: true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = {
    seed, tpty1: null, observerTpty1Scans: 0,
    crowns: { feeders: [], crop: [], chimpH: [], radius: [] }, feedScans: { n: [], crop: [], radius: [] }, observerScans: { n: [], radius: [] },
    choices: [], parties: { n: 0, crowns: [], modalShare: [], crownDist: [], outsideInView: 0, outside: 0, outsideCropOwn: [], outsideCropModal: [] },
    episodes: { min: [], crop0: [], crop1: [], meanN: [], maxN: [], fallPerH: [], below06: 0, below02: 0 },
    intake: { byN: {} }, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0],
  };
  const refF = w.chimps.find(c => c.alive && c.sex === 'female' && c.age >= 15 && !c.lactating) ?? w.chimps.find(c => c.alive && c.age >= 15)!;
  const fph = fruitRate(refF, P).fruitPerH;
  const tl: TripLight = { pace: 1, see: 1 };
  let root50 = new Map<number, number>(); // id -> party root id at the last 1-min chain
  let observing = false;

  // tripWorth exactly as candidates.ts (intakeValue 1 path; the darkCost branch included)
  const tripWorth = (c: Chimp, t: Tree, crop: number, n: number, d: number): number => {
    const iv = P.intakeValue === 1, drive = P.energyLedger === 1 && P.ledgerDrive === 1;
    if (darkOn(P) && (tripLight(w, P, d, t.height * CROWN_Y, tl).pace < 1 || tl.see < 1)) {
      if (!iv) return tl.see;
      if (!(tl.see > 0)) return 0;
      const ti = treeIntake(c, P, crop, n, d / tl.pace, P.intakeCropOnly !== 1);
      return ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH / tl.see) : 0;
    }
    if (!iv) return 1;
    const ti = treeIntake(c, P, crop, n, d, P.intakeCropOnly !== 1);
    return drive ? (ti.rateH > 0 ? ti.perHourInclWalk / ti.rateH : 0) : ti.feedH > 0 ? ti.feedH / (ti.walkH + ti.feedH) : 0;
  };
  const tripCost = (worth: number, d: number): number => P.tripRateValue !== 1 || P.intakeValue === 1 ? d / P.travelDistScaleM : NaN;
  const bindsOf = (c: Chimp, crop: number, n: number): [boolean, boolean] => {
    if (P.energyLedger !== 1 || P.ledgerDrive !== 1) return [false, false];
    const k = fruitKcalPerUnit(P, false), Rk = fruitRate(c, P).fruitPerH * k, lim = Math.min(energyNeed(c, P), boutRoom(c, P, Rk));
    return [crop / (1 + n) * k < lim, crop * k < lim];
  };
  const seenFeeders = (c: Chimp, tid: number, trips: boolean): number => {
    const x = ix(c), byId = index(w).byId; let n = 0;
    for (const sid of x.seen) { const o = byId.get(sid); if (o && o.alive && o !== c && o.targetId === tid && (o.action === 'forage' || (trips && o.action === 'travel'))) n++; }
    return n;
  };
  const knownCrop = (c: Chimp, tid: number): number | undefined => {
    const k = simOf(w).knownTrees?.[c.troopId]; if (!k) return undefined;
    for (let i = 0; i < k.length; i += 2) if (k[i] === tid) return k[i + 1];
    return undefined;
  };
  // candidates.ts offer(): the act in progress gets continueBonus until its bout ends, finishedPenalty once it has
  const contOf = (c: Chimp, k: Candidate): number => {
    if (P.urgencySwitchCost === 1 || k.action !== c.action || k.targetId !== c.targetId) return 0;
    const x = ix(c); return x.finished ? -P.finishedPenalty : w.time < x.actEnd ? P.continueBonus : 0;
  };
  // candidates.ts revisit(): a crown this individual has just fed in (C6b, design)
  const revisitOf = (c: Chimp, id: number): number => {
    const x = ix(c), ft = x.fedTree; if (!ft || P.revisitW <= 0) return 0;
    const k = ft.lastIndexOf(id); return k < 0 ? 0 : P.revisitW * Math.exp(-(w.time - x.fedAt![k]) / P.revisitTauH);
  };
  // candidates.ts territory cost × weight + core-area cost (coreCostOf)
  const placeOf = (c: Chimp, t: Tree, wt: number): number => {
    const x = ix(c), troop = index(w).troopById.get(c.troopId), h = c.hunger;
    const coreW = c.sex === 'female' && c.age >= 12 ? (c.lactating ? P.coreCostLactating : P.coreCostFemale) * (1 - P.coreHungerRelief * h) : 0;
    const core = coreW && troop ? coreW * Math.hypot(t.position[0] - x.coreX, t.position[2] - x.coreZ) / troop.radius : 0;
    return territoryCost(w, c, t.position[0], t.position[2], P, levels(w), gridOf(w, P)) * wt + core;
  };
  const optOf = (c: Chimp, k: Candidate): Opt | null => {
    const meta = candidateMeta.get(k), x = ix(c), h = c.hunger, px = c.position[0], pz = c.position[2];
    if (!isTreeId(k.targetId)) return null;
    const t = index(w).treeById.get(k.targetId); if (!t) return null;
    const d = Math.hypot(t.position[0] - px, t.position[2] - pz);
    let kind: Opt['kind'];
    if (k.action === 'forage') kind = 'crown';
    else if (k.action === 'travel' && meta?.v === V.TREE) kind = (meta.aux ?? -1) > 0 ? 'join' : 'trip';
    else return null;
    const jitter = (hash01(c.id, c.decisionVersion, kind === 'crown' ? CODE_FORAGE : CODE_TRAVEL, k.targetId) - 0.5) * P.candidateJitterSpan;
    let crop: number, n: number, terms: Terms;
    if (kind === 'crown') {
      crop = P.patchEcology === 1 ? fruitAt(w, t) : t.fruit; n = seenFeeders(c, t.id, false);
      const A = h * 1.6 + 0.1, q = Math.min(1, crop / P.fruitValueRef), Q = 0.55 + 0.45 * q, twn = tripWorth(c, t, crop, n, d), tw0 = tripWorth(c, t, crop, 0, d);
      const crowd = P.crowdByShare === 1 ? 0 : -n * P.crowdCompeteW * (P.crowdScarcityRef - w.environment.fruitIndex) * (c.rank > P.crowdHighRank ? P.crowdHighRankFactor : 1);
      terms = { base: A * 0.55, crop: A * 0.45 * q, trip: A * Q * (tw0 - 1) - d / P.forageDistScaleM, share: A * Q * (twn - tw0), crowd, cont: contOf(c, k), revisit: -revisitOf(c, t.id), place: -placeOf(c, t, 0.6), rain: -w.environment.rain * 0.45, social: t.id === simOf(w).figTree && h > 0.2 ? 0.2 : 0, jitter, other: 0 };
    } else {
      const inView = x.trees.includes(t.id);
      const remembered = c.memory.some(m => m.kind === 'tree' && m.entityId === t.id);
      crop = kind === 'join' && inView ? (P.patchEcology === 1 ? fruitAt(w, t) : t.fruit) : (x.treeCrop?.[t.id] ?? (kind === 'trip' && !remembered ? knownCrop(c, t.id) : undefined) ?? 0.2);
      n = kind === 'join' ? seenFeeders(c, t.id, true) : 0;
      const W = h * P.memTravelHungerW, q = P.memCropBelief === 1 ? Math.min(1, crop / P.fruitValueRef) : 1, Q = P.memCropBelief === 1 ? 0.55 + 0.45 * q : 1;
      const twn = tripWorth(c, t, crop, n, d), tw0 = tripWorth(c, t, crop, 0, d), worth = W * Q * twn;
      const lead = kind === 'join' ? index(w).byId.get(meta!.aux) : undefined;
      terms = { base: W * (P.memCropBelief === 1 ? 0.55 : 1), crop: P.memCropBelief === 1 ? W * 0.45 * q : 0, trip: W * Q * (tw0 - 1) - tripCost(worth, d), share: W * Q * (twn - tw0), crowd: 0, cont: contOf(c, k),
        revisit: kind === 'trip' ? -revisitOf(c, t.id) : 0, place: kind === 'trip' ? -placeOf(c, t, 0.8) : 0, rain: -w.environment.rain * (kind === 'trip' ? 0.4 : 0.3),
        social: kind === 'trip' ? (P.crowdByShare === 1 ? 0 : c.personality.sociability * w.environment.fruitIndex * 0.1) : lead ? companyValue(c, lead, P) : 0, jitter, other: 0 };
    }
    terms.other = k.score - TERMS.reduce((a, q) => q === 'other' ? a : a + terms[q], 0);
    const [binds, cropBinds] = bindsOf(c, crop, n);
    return { kind, tree: t.id, score: k.score, crop, n, d, t: terms, binds, cropBinds };
  };
  const sd = (v: number[]) => { if (v.length < 2) return 0; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };

  rgTap.fn = (c, list, _menu, _probs, chosen, why) => {
    if (!observing || c.age < 8 || why === 'kept' || why === 'arrived' || w.environment.daylight <= 0.1) return;
    const opts: Opt[] = [];
    for (const k of list) { const o = optOf(c, k); if (o) opts.push(o); }
    if (!opts.length) return;
    const chosenOpt = opts.find(o => o.tree === chosen.targetId && ((o.kind === 'crown') === (chosen.action === 'forage'))) ?? null;
    const others = chosenOpt ? opts.filter(o => o !== chosenOpt) : opts;
    let rejected: Opt | null = null; for (const o of others) if (!rejected || o.score > rejected.score) rejected = o;
    const crownOpts = opts.filter(o => o.kind === 'crown');
    const spread = crownOpts.length >= 2 ? Object.fromEntries(TERMS.map(k => [k, sd(crownOpts.map(o => o.t[k]))])) : null;
    // companions feeding in another crown
    let comp: CompRec | null = null;
    if (chosenOpt && chosenOpt.kind !== 'join') {
      const r = root50.get(c.id), byId = index(w).byId;
      if (r !== undefined) {
        let best: Chimp | undefined;
        for (const o of w.chimps) if (o !== c && o.alive && o.troopId === c.troopId && root50.get(o.id) === r && o.age >= 5 && feeding(o) && o.targetId !== chosenOpt.tree) { best = o; break; }
        const sameAsComp = w.chimps.some(o => o !== c && o.alive && o.troopId === c.troopId && root50.get(o.id) === r && o.age >= 5 && feeding(o) && o.targetId === chosenOpt.tree);
        if (best) {
          const ct = best.targetId, asOpt = opts.find(o => o.tree === ct && o.kind === 'crown');
          const dT = asOpt ? Object.fromEntries(TERMS.map(k => [k, chosenOpt.t[k] - asOpt.t[k]])) as Terms : null;
          const tc = index(w).treeById.get(ct)!, tch = index(w).treeById.get(chosenOpt.tree)!;
          comp = { companionCrown: ct, asOption: !!asOpt, inView: ix(c).trees.includes(ct), dTerms: dT, dCrop: chosenOpt.crop - fruitAt(w, tc), dD: chosenOpt.d - Math.hypot(tc.position[0] - c.position[0], tc.position[2] - c.position[2]), dN: asOpt ? chosenOpt.n - asOpt.n : NaN, chosenIsCompanions: sameAsComp };
          void tch; void byId;
        } else if (sameAsComp) comp = { companionCrown: chosenOpt.tree, asOption: true, inView: true, dTerms: null, dCrop: 0, dD: 0, dN: 0, chosenIsCompanions: true };
      }
    }
    R.choices.push({ kind: chosenOpt ? chosenOpt.kind : 'non-crown:' + chosen.action, why, chosen: chosenOpt, rejected, nOpts: opts.length, nCrownOpts: crownOpts.length, spread, anyBinds: opts.some(o => o.binds), comp,
      opts: opts.length >= 2 ? opts.map(o => ({ s: o.score, crop: o.crop, n: o.n, t: o.t, kind: o.kind })) : null });
  };

  // intake per feeding tick
  const eaten = new Map<number, number>();
  energyTap.fn = (c, term, kcal, kind) => { if (observing && term === 'eaten' && (kind === 'drupe' || kind === 'fig')) eaten.set(c.id, (eaten.get(c.id) ?? 0) + kcal); };

  const epi = new Map<number, { t0: number; crop0: number; nSum: number; samples: number; maxN: number }>();
  observing = true;
  for (let i = 0; i < days * DAY; i++) {
    eaten.clear();
    // who feeds where before the tick (the forageTick of this tick eats at these crowns)
    tickWorld(w);
    observerStep(obs, w); observerStep(pobs, w);
    const idx = index(w), day = w.environment.daylight > 0.1, alive = idx.alive;
    // intake per feeding tick (after the tick: the feeders that ate)
    if (day) {
      const byTree = new Map<number, Chimp[]>();
      for (const c of alive) if (c.age >= 5 && feeding(c)) { const l = byTree.get(c.targetId) ?? []; l.push(c); byTree.set(c.targetId, l); }
      for (const [tid, l] of byTree) {
        const t = idx.treeById.get(tid)!, crop = fruitAt(w, t), key = l.length >= 3 ? '3+' : String(l.length);
        const e = R.intake.byN[key] ??= { ticks: 0, ratio: 0, short: 0, cropLimited: 0 };
        for (const c of l) {
          const k = fruitKcalPerUnit(P, t.common === 'fig');
          const full = P.fruitIntakePerH * TICK_HOURS * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1) * k;
          const r = (eaten.get(c.id) ?? 0) / Math.max(1e-9, full);
          e.ticks++; e.ratio += r; if (r < 0.99) { e.short++; if (crop < 0.02 + l.length * full / k) e.cropLimited++; }
        }
      }
      void gutCap;
    }
    // 1-min: party chains and crown episodes
    if (w.tick % MIN === 0) {
      const next = new Map<number, number>();
      for (const tr of w.troops) { const mem = alive.filter(c => c.troopId === tr.id), r = chain(mem, P.partyLinkM); for (let a = 0; a < mem.length; a++) next.set(mem[a].id, mem[r[a]].id); }
      root50 = next;
      const occ = new Map<number, number>();
      for (const c of alive) if (c.age >= 5 && feeding(c)) occ.set(c.targetId, (occ.get(c.targetId) ?? 0) + 1);
      for (const [tid, n] of occ) {
        const e = epi.get(tid);
        if (!e) epi.set(tid, { t0: w.time, crop0: fruitAt(w, idx.treeById.get(tid)!), nSum: n, samples: 1, maxN: n });
        else { e.nSum += n; e.samples++; if (n > e.maxN) e.maxN = n; }
      }
      for (const [tid, e] of epi) if (!occ.has(tid)) {
        const crop1 = fruitAt(w, idx.treeById.get(tid)!), mins = (w.time - e.t0) * 60;
        R.episodes.min.push(mins); R.episodes.crop0.push(e.crop0); R.episodes.crop1.push(crop1); R.episodes.meanN.push(e.nSum / e.samples); R.episodes.maxN.push(e.maxN);
        R.episodes.fallPerH.push(mins > 0 ? (e.crop0 - crop1) / (mins / 60) : 0); if (crop1 < 0.06) R.episodes.below06++; if (crop1 < 0.02) R.episodes.below02++;
        epi.delete(tid);
      }
    }
    // 15-min scans: crowns, feeding scans, parties
    if (day && w.tick % SCAN === 0) {
      for (const tr of w.troops) {
        const mem = alive.filter(c => c.troopId === tr.id), r50 = chain(mem, P.partyLinkM);
        const byTree = new Map<number, Chimp[]>();
        for (const c of mem) if (c.age >= 5 && feeding(c)) { const l = byTree.get(c.targetId) ?? []; l.push(c); byTree.set(c.targetId, l); }
        for (const [tid, l] of byTree) {
          const t = idx.treeById.get(tid)!, crop = fruitAt(w, t);
          R.crowns.feeders.push(l.length); R.crowns.crop.push(crop); R.crowns.chimpH.push(crop / Math.max(1e-9, fph)); R.crowns.radius.push(t.canopy);
        }
        for (let a = 0; a < mem.length; a++) {
          const c = mem[a]; if (c.age < 12 || !feeding(c)) continue;
          let n = 0; for (let b = 0; b < mem.length; b++) if (r50[b] === r50[a] && mem[b].action === 'forage' && mem[b].targetId === c.targetId && ix(mem[b]).phase >= 2) n++;
          const t = idx.treeById.get(c.targetId)!;
          R.feedScans.n.push(n); R.feedScans.crop.push(fruitAt(w, t)); R.feedScans.radius.push(t.canopy);
        }
        // parties with ≥ 2 feeders
        const roots = new Map<number, Chimp[]>();
        for (let a = 0; a < mem.length; a++) { const c = mem[a]; if (c.age >= 5 && feeding(c)) { const l = roots.get(r50[a]) ?? []; l.push(c); roots.set(r50[a], l); } }
        for (const [, l] of roots) {
          if (l.length < 2) continue;
          const by = new Map<number, number>(); for (const c of l) by.set(c.targetId, (by.get(c.targetId) ?? 0) + 1);
          let modal = -1, mn = 0; for (const [tid, n] of by) if (n > mn || (n === mn && tid < modal)) { modal = tid; mn = n; }
          R.parties.n++; R.parties.crowns.push(by.size); R.parties.modalShare.push(mn / l.length);
          const ids = [...by.keys()];
          for (let u = 0; u < ids.length; u++) for (let v = u + 1; v < ids.length; v++) { const A = idx.treeById.get(ids[u])!, B = idx.treeById.get(ids[v])!; R.parties.crownDist.push(Math.hypot(A.position[0] - B.position[0], A.position[2] - B.position[2])); }
          const tm = idx.treeById.get(modal)!;
          for (const c of l) if (c.targetId !== modal) { R.parties.outside++; if (ix(c).trees.includes(modal)) R.parties.outsideInView++; R.parties.outsideCropOwn.push(fruitAt(w, idx.treeById.get(c.targetId)!)); R.parties.outsideCropModal.push(fruitAt(w, tm)); }
        }
      }
    }
  }
  observing = false; rgTap.fn = null; energyTap.fn = null;
  const rec = finishObserver(obs, w), prec = finishObserver(pobs, w), pd = derive(prec);
  R.tpty1 = METRICS.find(q => q.id === 'T-PTY-1')!.compute!(pd).value ?? null; R.observerTpty1Scans = prec.scans.t.n;
  const S = rec.scans;
  for (let i = 0; i < S.t.n; i++) if (S.tree.data[i] >= 0 && S.feedN.data[i] > 0) { R.observerScans.n.push(S.feedN.data[i]); R.observerScans.radius.push(S.canopy.data[i]); }
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) R.deaths[c.causeOfDeath ?? 'unknown'] = (R.deaths[c.causeOfDeath ?? 'unknown'] ?? 0) + 1;
  R.living[1] = w.chimps.filter(c => c.alive).length;
  return R;
}

// ---------------- summary ----------------
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const med = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? q[Math.floor(q.length / 2)] : NaN; };
export function r2(x: number[], y: number[]): number { const n = x.length; if (n < 3) return NaN; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy * sxy / (sxx * syy) : 0; }
function terciles(key: number[], val: number[]): { cuts: number[]; means: number[]; n: number[] } {
  const s = [...key].sort((a, b) => a - b), c1 = s[Math.floor(s.length / 3)], c2 = s[Math.floor(2 * s.length / 3)];
  const sum = [0, 0, 0], n = [0, 0, 0];
  for (let i = 0; i < key.length; i++) { const q = key[i] <= c1 ? 0 : key[i] <= c2 ? 1 : 2; sum[q] += val[i]; n[q]++; }
  return { cuts: [r3(c1), r3(c2)], means: sum.map((v, q) => r3(v / Math.max(1, n[q]))), n };
}

const TERMS = ['base', 'crop', 'trip', 'share', 'crowd', 'cont', 'revisit', 'place', 'rain', 'social', 'jitter', 'other'] as const;
export function summarize(res: Result[], T0 = 0.164): Record<string, unknown> {
  const cat = <K extends keyof Result['crowns']>(k: K) => res.flatMap(r => r.crowns[k]);
  const fe = cat('feeders'), crop = cat('crop'), rad = cat('radius'), ch = cat('chimpH');
  const fsN = res.flatMap(r => r.feedScans.n), fsC = res.flatMap(r => r.feedScans.crop), fsR = res.flatMap(r => r.feedScans.radius);
  const oN = res.flatMap(r => r.observerScans.n), oR = res.flatMap(r => r.observerScans.radius);
  const out: Record<string, unknown> = {};
  out.identity = { tpty1: res.map(r => r.tpty1 === null ? null : r3(r.tpty1)) };
  out.crowns = {
    scans: fe.length, meanFeeders: r3(mean(fe)), shareSingle: r3(fe.filter(v => v === 1).length / Math.max(1, fe.length)),
    byCrop: terciles(crop, fe), byRadius: terciles(rad, fe),
    r2Crop: r3(r2(crop, fe)), r2LnCrop: r3(r2(crop.map(v => Math.log(Math.max(1e-4, v))), fe)), r2Radius: r3(r2(rad, fe)),
    cropMedian: r3(med(crop)), chimpHMedian: r3(med(ch)), chimpHPerFeederMedian: r3(med(ch.map((v, i) => v / fe[i]))), cropOverValueRef: r3(crop.filter(v => v > 1).length / Math.max(1, crop.length)),
  };
  out.feedScans = { n: fsN.length, meanN: r3(mean(fsN)), byCrop: terciles(fsC, fsN), byRadius: terciles(fsR, fsN), r2Crop: r3(r2(fsC, fsN)), r2Radius: r3(r2(fsR, fsN)) };
  out.observerScans = { n: oN.length, meanN: r3(mean(oN)), byRadius: terciles(oR, oN), r2Radius: r3(r2(oR, oN)) };
  // choices
  const ch2 = res.flatMap(r => r.choices);
  const kinds: Record<string, number> = {}; for (const c of ch2) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
  const pair = (sel: (c: Choice) => boolean) => {
    const L = ch2.filter(c => sel(c) && c.chosen && c.rejected);
    const t = (f: (c: Choice) => Opt) => Object.fromEntries(TERMS.map(k => [k, r3(mean(L.map(c => f(c).t[k])))]));
    const dAbs = Object.fromEntries(TERMS.map(k => [k, r3(mean(L.map(c => Math.abs(c.chosen!.t[k] - c.rejected!.t[k]))))]));
    const dMean = Object.fromEntries(TERMS.map(k => [k, r3(mean(L.map(c => c.chosen!.t[k] - c.rejected!.t[k])))]));
    return { n: L.length, chosen: t(c => c.chosen!), rejected: t(c => c.rejected!), meanDiff: dMean, meanAbsDiff: dAbs,
      scoreChosen: r3(mean(L.map(c => c.chosen!.score))), scoreRejected: r3(mean(L.map(c => c.rejected!.score))),
      chosenLargerCrop: r3(L.filter(c => c.chosen!.crop > c.rejected!.crop).length / Math.max(1, L.length)),
      cropChosen: r3(mean(L.map(c => c.chosen!.crop))), cropRejected: r3(mean(L.map(c => c.rejected!.crop))),
      feedersChosen: r3(mean(L.map(c => c.chosen!.n))), feedersRejected: r3(mean(L.map(c => c.rejected!.n))),
      dChosen: r3(mean(L.map(c => c.chosen!.d))), dRejected: r3(mean(L.map(c => c.rejected!.d))),
      rejectedKind: Object.fromEntries(['crown', 'trip', 'join'].map(k => [k, L.filter(c => c.rejected!.kind === k).length])) };
  };
  const spreadL = ch2.filter(c => c.spread);
  const opts = ch2.flatMap(c => [c.chosen, c.rejected].filter((o): o is Opt => !!o));
  const crownOpts = opts.filter(o => o.kind === 'crown');
  const comps = ch2.filter(c => c.comp);
  const compElse = comps.filter(c => !c.comp!.chosenIsCompanions);
  const compTerms = compElse.filter(c => c.comp!.dTerms);
  // crop and co-feeding selectivity among the tree options of one decision (softmax at rgTemperature over those options):
  // E[crop of the pick] − mean crop of the options, and E[feeders seen at the pick] − their mean; then with each term removed
  const sel = (drop: (typeof TERMS)[number] | null, which: 'crop' | 'n', only: (o: { kind: string }) => boolean) => {
    let num = 0, den = 0;
    for (const c of ch2) {
      if (!c.opts) continue;
      const L = c.opts.filter(only); if (L.length < 2) continue;
      const sc = L.map(o => o.s - (drop ? o.t[drop] : 0)), m = Math.max(...sc), e = sc.map(v => Math.exp((v - m) / T0)), z = e.reduce((a, b) => a + b, 0);
      const vals = L.map(o => which === 'crop' ? o.crop : o.n), mv = mean(vals);
      num += e.reduce((a, v, i) => a + v / z * (vals[i] - mv), 0); den++;
    }
    return den ? r3(num / den) : NaN;
  };
  const allTree = () => true, inView = (o: { kind: string }) => o.kind === 'crown';
  const selectivity = (only: (o: { kind: string }) => boolean) => ({
    decisions: ch2.filter(c => c.opts && c.opts.filter(only).length >= 2).length,
    crop: { actual: sel(null, 'crop', only), ...Object.fromEntries(TERMS.filter(k => k !== 'base').map(k => [`without ${k}`, sel(k, 'crop', only)])) },
    feedersSeen: { actual: sel(null, 'n', only), ...Object.fromEntries(TERMS.filter(k => k !== 'base').map(k => [`without ${k}`, sel(k, 'n', only)])) },
  });
  out.selectivityAllTreeOptions = selectivity(allTree);
  out.selectivityCrownsInView = selectivity(inView);
  out.choices = {
    decisions: ch2.length, chosenKind: kinds,
    crownVsBestRejected: pair(c => c.chosen?.kind === 'crown'),
    tripVsBestRejected: pair(c => c.chosen?.kind === 'trip'),
    crownVsCrown: pair(c => c.chosen?.kind === 'crown' && c.rejected?.kind === 'crown'),
    withinDecisionSdOverCrownOptions: { n: spreadL.length, ...Object.fromEntries(TERMS.map(k => [k, r3(mean(spreadL.map(c => c.spread![k])))])) },
    crownOptionsPerDecision: r3(mean(ch2.map(c => c.nCrownOpts))),
    shareBindsInCrownOptions: r3(crownOpts.filter(o => o.binds).length / Math.max(1, crownOpts.length)),
    cropAloneBindsInCrownOptions: r3(crownOpts.filter(o => o.cropBinds).length / Math.max(1, crownOpts.length)),
    crownOptionsWithFeeders: r3(crownOpts.filter(o => o.n > 0).length / Math.max(1, crownOpts.length)),
    crownOptionsCropOverRef: r3(crownOpts.filter(o => o.crop > 1).length / Math.max(1, crownOpts.length)),
    companions: {
      decisionsWithCompanionFeeding: comps.length,
      choseCompanionsCrown: r3(comps.filter(c => c.comp!.chosenIsCompanions).length / Math.max(1, comps.length)),
      choseOther: compElse.length,
      otherCrownWasOption: r3(compElse.filter(c => c.comp!.asOption).length / Math.max(1, compElse.length)),
      otherCrownInView: r3(compElse.filter(c => c.comp!.inView).length / Math.max(1, compElse.length)),
      meanDiffChosenMinusCompanions: Object.fromEntries(TERMS.map(k => [k, r3(mean(compTerms.map(c => c.comp!.dTerms![k])))])),
      meanAbsDiff: Object.fromEntries(TERMS.map(k => [k, r3(mean(compTerms.map(c => Math.abs(c.comp!.dTerms![k]))))])),
      chosenLargerCrop: r3(compElse.filter(c => c.comp!.dCrop > 0).length / Math.max(1, compElse.length)),
      chosenNearer: r3(compElse.filter(c => c.comp!.dD < 0).length / Math.max(1, compElse.length)),
      dFeedersSeen: r3(mean(compTerms.map(c => c.comp!.dN))),
    },
  };
  const pt = res.map(r => r.parties);
  out.parties = {
    partiesWith2Feeders: pt.reduce((a, p) => a + p.n, 0), crownsPerParty: r3(mean(pt.flatMap(p => p.crowns))), modalShare: r3(mean(pt.flatMap(p => p.modalShare))),
    crownDistMedian: r3(med(pt.flatMap(p => p.crownDist))), outsideModal: pt.reduce((a, p) => a + p.outside, 0),
    outsideModalInView: r3(pt.reduce((a, p) => a + p.outsideInView, 0) / Math.max(1, pt.reduce((a, p) => a + p.outside, 0))),
    outsideOwnCropMedian: r3(med(pt.flatMap(p => p.outsideCropOwn))), outsideModalCropMedian: r3(med(pt.flatMap(p => p.outsideCropModal))),
  };
  const ep = res.map(r => r.episodes), allMin = ep.flatMap(e => e.min), nE = allMin.length;
  const fall = ep.flatMap(e => e.fallPerH), mN = ep.flatMap(e => e.meanN), c0 = ep.flatMap(e => e.crop0), c1 = ep.flatMap(e => e.crop1);
  out.episodes = {
    n: nE, minutesMedian: r3(med(allMin)), crop0Median: r3(med(c0)), crop1Median: r3(med(c1)), fallPerHMedian: r3(med(fall)), fallPerHMean: r3(mean(fall)),
    meanFeedersMean: r3(mean(mN)), maxFeedersMean: r3(mean(ep.flatMap(e => e.maxN))), endedBelow06: r3(ep.reduce((a, e) => a + e.below06, 0) / Math.max(1, nE)), endedBelow02: r3(ep.reduce((a, e) => a + e.below02, 0) / Math.max(1, nE)),
    shareEatenMedian: r3(med(c0.map((v, i) => v > 0 ? (v - c1[i]) / v : 0))),
    fallPerHByMeanFeeders: Object.fromEntries([[1, 1.5], [1.5, 2.5], [2.5, 99]].map(([lo, hi]) => { const ii = mN.map((v, i) => v >= lo && v < hi ? i : -1).filter(i => i >= 0); return [`${lo}-${hi}`, { n: ii.length, fallPerH: r3(mean(ii.map(i => fall[i]))), minutes: r3(med(ii.map(i => allMin[i]))) }]; })),
  };
  const ib: Record<string, unknown> = {};
  for (const k of ['1', '2', '3+']) { let t = 0, r = 0, s = 0, cl = 0; for (const x of res) { const e = x.intake.byN[k]; if (e) { t += e.ticks; r += e.ratio; s += e.short; cl += e.cropLimited; } } ib[k] = { ticks: t, meanRatio: r3(r / Math.max(1, t)), shortShare: r3(s / Math.max(1, t)), cropLimitedShare: r3(cl / Math.max(1, t)) }; }
  out.intake = ib;
  out.deaths = res.map(r => r.deaths); out.living = res.map(r => r.living);
  return out;
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: Job }) => {
    try { parentPort!.postMessage({ index: m.index, result: runSeed(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && process.argv[1].endsWith('crown-share-diagnose.ts')) {
  const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
  const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), workers = +arg('workers', '2');
  if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const summary = summarize(res, (await import('../src/sim/params')).resolveParams('field', params).rgTemperature);
  console.log(JSON.stringify(summary, null, 1));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'crown-share-diagnose', seeds, burnIn, days, params, summary, perSeed: res.map(r => ({ seed: r.seed, tpty1: r.tpty1, deaths: r.deaths, living: r.living })) }, null, 1));
}
// keep the type import used when the worker path is taken
export type { World };
