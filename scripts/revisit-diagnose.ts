// Stage E3b diagnosis (development tool, reads only; docs/staging/e3b-prereg.md §2): what stops an animal going back to
// a crown it has just fed in. The world is e-bench's and energy-diagnose's for the same seed and params (createWorld +
// burn-in + tickWorld, no observer); taps (rgTap, energyTap) read only, so the simulation is unchanged.
//
// Feeding in a crown: forage at a tree, phase 2 (in the crown). Daylight: environment.daylight > 0.1.
//
// Readouts (definitions registered in the prereg §2; simulation truth):
//   visits: a feeding visit of an animal ≥ 5 y to a crown = its consecutive ticks feeding in that crown; a return to the
//     same crown after < 10 min joins the visit, after ≥ 10 min it is a new visit (the observer's T-FOOD-4 rule,
//     janmaat2013b). Per visit: start and end (h), crop (fruitAt, fruit units) and the phenology crop (cropTarget) at the
//     first and the last feeding tick, the fruit the animal ate (kcal ÷ kcal per fruit unit), and what ended it (below).
//   revisits: per animal and crown (and per resource: crowns fed in that lie < 30 m apart, single linkage, normand2009's
//     "trees located less than 30 m from each other were considered to be the same resource"), consecutive visits:
//     gap = start of the return − end of the previous visit (h); start-to-start interval (days); calendar-day
//     difference (days since midnight, the observer's T-FOOD-6 convention). Shares of returns by gap (< 1 h, 1–3 h, ≥ 3 h
//     on the same calendar day, the next day, 2–7 days, > 7 days). Revisit interval (T-FOOD-6 truth): (a) mean
//     calendar-day difference over returns on another calendar day (the observer's convention), (b) the same with
//     same-day returns as 0, (c) mean start-to-start interval in days; by class (adult females ≥ 15 y, normand2009's
//     subjects; adult males ≥ 15 y; all ≥ 12 y). At each return: crop when it left and when it returns, the phenology
//     crop at both, and the deficit (phenology − crop) at both.
//   trees per day: distinct crowns fed in and feeding visits per animal-day (≥ 12 y, calendar days with feeding in a crown).
//   returns within 3 h: shares by what ended the visit before (gut full, interrupt, need-bucket, …).
//   bout ends: for each visit of an animal ≥ 12 y, from its state at the last feeding tick and the transition after it:
//     crop gone (crop < 0.02), sated (hunger < 0.06), gut full (foregut dry matter ≥ 0.95 of capacity), else the rules
//     decision that ended it (rgTap reason: need-bucket, max-age, ended, patch-poor, interrupt, period, hunt, …; 'none'
//     when no rules decision fired: an interrupt or the argmax rules of animals under rgMinAge), and the next act
//     (party follow, joined trip, own trip, crown in view, fallback, rest, groom, nest, drink, play, travel other,
//     other). "A companion leaving" = the next act is a party follow or a joined trip. Intake at the last feeding tick ÷
//     the animal's full fruit rate per tick (gut room or vision lower it; nothing else does in the model).
//   choices: rules decisions of animals ≥ 8 y in daylight, the gate's 'kept' and 'arrived' excluded, whose candidate list
//     holds a crown option (crown-share-diagnose's filter, so the counts equal its "chosen kind"): chosen kind crown (forage
//     at a tree in view), trip (own trip to a tree: travel V.TREE, no leader), join (travel V.TREE with a leader), or other.
//     For chosen crown options: the share that are returns (the animal fed there in this window), hours since it left, the
//     crop now against the crop when it left, the believed crop (in view: the crop; trips: treeCrop, else the community's
//     expected crop, else 0.2) against the truth, and the C6b devaluation the S5 model would apply (revisitW ×
//     exp(−hours ÷ revisitTauH), from the visit records).
//   walking: the energy-diagnose ground step (horizontal movement on the ground, < 100 m per tick) per class, split by the
//     act at the end of the tick: crown approach (forage at a tree, phase < 2), own trip, joined trip, party follow, care
//     follow, caller (travel V.CALLER), fallback (forage on the ground), drink, nest, patrol, hunt, other travel, other.
//   energy (energy-diagnose's definitions, so S5's realizations are the reference): per class (adult male, female other,
//     female lactating, juvenile 5–12 y) eating minutes (own food swallowed, milk excluded), ground km, reserves ÷ store
//     and the daily trajectory at noon (OLS slope, % of the store per day, by bench_ref.py).
//   colobus: 15-min daylight (> 0.3) scans: a community's encounter with a colobus group = an adult male (≥ 15 y) within
//     100 m of it after ≥ 60 min without one (gilby2015's 100-m rule; truth); hunts started (w.stats.hunts).
//
//   pnpm exec tsx scripts/revisit-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { candidateMeta, V } from '../src/sim/candidates';
import { digestaCaps, energyTap, fruitKcalPerUnit, gutCap, intakeSize, reserveCap } from '../src/sim/energy';
import { paramsOf, resolveParams } from '../src/sim/params';
import { cropTarget, fruitAt } from '../src/sim/phenology';
import { rgTap } from '../src/sim/rg';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN = Math.round(1 / 60 / TICK_HOURS), SCAN = 15 * MIN, GAP10 = 10 * MIN;
const CLS = ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y'] as const;
type Cls = typeof CLS[number];
const WALK = ['crown approach', 'own trip', 'joined trip', 'party follow', 'care follow', 'caller', 'fallback', 'drink', 'nest', 'patrol', 'hunt', 'other travel', 'other'] as const;

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Visit { id: number; tree: number; t0: number; t1: number; crop0: number; crop1: number; tgt0: number; tgt1: number; ate: number; age: number; sex: string; end: string; next: string; why: string; lastRatio: number; fill: number; hunger: number }
interface Choice { kind: string; ret: boolean; hSince: number; cropNow: number; cropLeft: number; belief: number; wouldRevisit: number }
interface Result {
  seed: number; days: number; visits: Visit[]; choices: Choice[]; choiceCounts: Record<string, number>; animalDays8: number;
  walk: Record<string, Record<string, number>>; ticks: Record<string, number>;
  energy: Record<string, { ticks: number; eating: number; walked: number; res: number; ids: number }>; traj: Record<string, number[]>;
  colobus: { encounters: number; communityDays: number; maleDays: number }; hunts: number; communities: number;
  trees: Record<number, [number, number]>; deaths: Record<string, number>; living: [number, number];
}

const feedingIn = (c: Chimp) => c.alive && c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase === 2;

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
/** energy-diagnose classesOf, restricted to the four classes read here (its adolescents 12–15 y have none). */
function classOf(c: Chimp): Cls | null {
  if (c.age < 5) return null;
  if (c.age < 12) return 'juvenile 5–12 y';
  if (c.age < 15) return null;
  if (c.sex === 'male') return 'adult male';
  if (c.lactating) return 'female, lactating';
  return c.pregnancy > 0 ? null : 'female, other';
}
function nextActOf(c: Chimp): string {
  const x = ix(c), a = c.action;
  if (a === 'follow') return x.v === V.PARTY ? 'party follow' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'care follow' : 'follow other';
  if (a === 'travel') return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'caller' : 'travel other';
  if (a === 'forage') return isTreeId(c.targetId) ? 'crown in view' : 'fallback';
  if (a === 'groom' || a === 'rest' || a === 'nest' || a === 'drink' || a === 'play' || a === 'nurse') return a;
  return `other: ${a}`;
}
function walkOf(c: Chimp): string {
  const x = ix(c), a = c.action;
  if (a === 'forage') return isTreeId(c.targetId) ? (x.phase < 2 ? 'crown approach' : 'other') : 'fallback';
  if (a === 'travel') return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'caller' : 'other travel';
  if (a === 'follow') return x.v === V.PARTY ? 'party follow' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'care follow' : 'other travel';
  if (a === 'drink' || a === 'nest' || a === 'patrol' || a === 'hunt') return a;
  return 'other';
}

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, days, visits: [], choices: [], choiceCounts: {}, animalDays8: 0, walk: {}, ticks: {}, energy: {}, traj: {},
    colobus: { encounters: 0, communityDays: 0, maleDays: 0 }, hunts: 0, communities: w.troops.length, trees: {}, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0] };
  for (const n of CLS) { R.walk[n] = Object.fromEntries(WALK.map(k => [k, 0])); R.ticks[n] = 0; R.energy[n] = { ticks: 0, eating: 0, walked: 0, res: 0, ids: 0 }; R.traj[n] = []; }
  const ids = Object.fromEntries(CLS.map(n => [n, new Set<number>()])) as Record<Cls, Set<number>>;
  let observing = false, curTick = -1;
  const hunts0 = w.stats.hunts;
  // the C6b devaluation as S5 (the field profile) applies it, for the choices readout whatever the arm's overrides
  const F = resolveParams('field');
  // the last rules decision of each animal in this tick (curTick: the loop's tick counter)
  const dec = new Map<number, { tick: number; why: string }>();
  // visits: open (feeding now or within 10 min of its last feeding tick) and closed
  interface Open { tree: number; t0: number; tLast: number; tickLast: number; crop0: number; crop1: number; tgt0: number; tgt1: number; ate: number; lastRatio: number; fill: number; hunger: number; end: string; next: string; why: string; endSet: boolean }
  const open = new Map<number, Open>();
  // per animal: its last closed visit end per tree (for returns at choices) and crop when it left
  const left = new Map<number, Map<number, { t: number; crop: number }>>();
  const closeVisit = (c: Chimp, o: Open) => {
    R.visits.push({ id: c.id, tree: o.tree, t0: o.t0, t1: o.tLast, crop0: o.crop0, crop1: o.crop1, tgt0: o.tgt0, tgt1: o.tgt1, ate: o.ate, age: c.age, sex: c.sex, end: o.end, next: o.next, why: o.why, lastRatio: o.lastRatio, fill: o.fill, hunger: o.hunger });
    let m = left.get(c.id); if (!m) left.set(c.id, m = new Map());
    m.set(o.tree, { t: o.tLast, crop: o.crop1 });
    const t = index(w).treeById.get(o.tree); if (t && !R.trees[o.tree]) R.trees[o.tree] = [t.position[0], t.position[2]];
  };
  const knownCrop = (c: Chimp, tid: number): number | undefined => {
    const k = simOf(w).knownTrees?.[c.troopId]; if (!k) return undefined;
    for (let i = 0; i < k.length; i += 2) if (k[i] === tid) return k[i + 1];
    return undefined;
  };
  const kindOf = (k: Candidate): string | null => {
    if (!isTreeId(k.targetId)) return null;
    if (k.action === 'forage') return 'crown';
    const m = candidateMeta.get(k);
    if (k.action === 'travel' && m?.v === V.TREE) return (m.aux ?? -1) > 0 ? 'join' : 'trip';
    return null;
  };
  rgTap.fn = (c, list, _menu, _probs, chosen, why) => {
    if (!observing) return;
    dec.set(c.id, { tick: curTick, why });
    if (c.age < 8 || why === 'kept' || why === 'arrived' || w.environment.daylight <= 0.1) return;
    if (!list.some(k => kindOf(k) !== null)) return;
    const kind = kindOf(chosen) ?? 'non-crown';
    R.choiceCounts[kind] = (R.choiceCounts[kind] ?? 0) + 1;
    if (kind === 'non-crown') return;
    const t = index(w).treeById.get(chosen.targetId); if (!t) return;
    const lv = left.get(c.id)?.get(t.id), now = fruitAt(w, t), x = ix(c);
    const inView = x.trees.includes(t.id), remembered = c.memory.some(m => m.kind === 'tree' && m.entityId === t.id);
    const belief = kind === 'crown' || (kind === 'join' && inView) ? now : (x.treeCrop?.[t.id] ?? (kind === 'trip' && !remembered ? knownCrop(c, t.id) : undefined) ?? 0.2);
    const h = lv ? w.time - lv.t : NaN;
    R.choices.push({ kind, ret: !!lv, hSince: h, cropNow: now, cropLeft: lv ? lv.crop : NaN, belief, wouldRevisit: lv ? F.revisitW * Math.exp(-h / F.revisitTauH) : 0 });
  };
  // intake this tick, own food (milk excluded, as energy-diagnose), and fruit eaten per animal
  const fruitTick = new Map<number, number>(), milkTick = new Map<number, number>();
  energyTap.fn = (c, term, kcal, kind) => {
    if (!observing) return;
    if (term === 'eaten' && (kind === 'drupe' || kind === 'fig')) fruitTick.set(c.id, (fruitTick.get(c.id) ?? 0) + kcal);
    else if (term === 'suckled') milkTick.set(c.id, (milkTick.get(c.id) ?? 0) + kcal);
  };
  const cls = new Map<number, Cls | null>(), prevIn = new Map<number, number>(), prevPos = new Map<number, [number, number]>();
  const lastEnc = new Map<string, number>();
  const kU = fruitKcalPerUnit(P, false), kF = fruitKcalPerUnit(P, true);
  observing = true;
  for (let i = 0; i < days * DAY; i++) {
    fruitTick.clear(); milkTick.clear();
    curTick = i;
    tickWorld(w);
    const idx = index(w), alive = idx.alive, light = w.environment.daylight > 0.1;
    if (i % 240 === 0) for (const c of w.chimps) if (c.alive) cls.set(c.id, classOf(c));
    // energy-diagnose's per-class accumulators (eating, ground step, reserves)
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const n = cls.get(c.id); if (!n) continue;
      const x = ix(c), L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
      const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
      prevPos.set(c.id, [c.position[0], c.position[2]]);
      if (L) prevIn.set(c.id, L.in);
      const eating = L ? din - (milkTick.get(c.id) ?? 0) > 1e-9 : false;
      const e = R.energy[n]; e.ticks++; ids[n].add(c.id);
      if (eating) e.eating++;
      if (step < 100) { e.walked += step; R.walk[n][walkOf(c)] += step; }
      if (L) e.res += L.res / reserveCap(c, P);
      R.ticks[n]++;
    }
    if (i % DAY === DAY / 2) for (const n of CLS) {
      let s = 0, m = 0;
      for (const c of w.chimps) if (c.alive && cls.get(c.id) === n && ix(c).en) { s += ix(c).en!.res / reserveCap(c, P); m++; }
      R.traj[n][Math.floor(i / DAY)] = m ? s / m : 0;
    }
    if (i % DAY === 0) R.animalDays8 += alive.filter(c => c.age >= 8).length;
    // visits
    for (const c of alive) {
      if (c.age < 5) continue;
      const o = open.get(c.id), x = ix(c);
      if (feedingIn(c)) {
        const t = idx.treeById.get(c.targetId)!, crop = fruitAt(w, t), fig = t.common === 'fig';
        const full = P.fruitIntakePerH * TICK_HOURS * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1) * (fig ? kF : kU);
        const kcal = fruitTick.get(c.id) ?? 0, L = x.en, caps = L && L.dm !== undefined ? digestaCaps(c, P) : null;
        const fill = caps ? L!.dm! / caps[0] : L ? L.gut / gutCap(c, P) : NaN;
        if (o && o.tree === c.targetId) {
          if (o.endSet) { o.endSet = false; o.end = ''; o.next = ''; o.why = ''; } // back within 10 min: the same visit
          o.tLast = w.time; o.tickLast = w.tick; o.crop1 = crop; o.tgt1 = cropTarget(w, t, w.time); o.ate += kcal / (fig ? kF : kU); o.lastRatio = kcal / Math.max(1e-9, full); o.fill = fill; o.hunger = c.hunger;
        } else {
          if (o) { if (!o.endSet) { o.end = 'switch'; o.next = 'crown in view'; o.why = 'none'; } closeVisit(c, o); }
          open.set(c.id, { tree: c.targetId, t0: w.time, tLast: w.time, tickLast: w.tick, crop0: crop, crop1: crop, tgt0: cropTarget(w, t, w.time), tgt1: cropTarget(w, t, w.time), ate: kcal / (fig ? kF : kU), lastRatio: kcal / Math.max(1e-9, full), fill, hunger: c.hunger, end: '', next: '', why: '', endSet: false });
        }
      } else if (o) {
        if (!o.endSet) {
          // the first tick after the last feeding tick: why it stopped
          o.endSet = true;
          o.end = o.crop1 < 0.02 ? 'crop gone' : o.hunger < 0.06 ? 'sated' : o.fill >= 0.95 ? 'gut full' : 'decision';
          const d = dec.get(c.id); o.why = d && d.tick === i ? d.why : 'none';
          o.next = nextActOf(c);
        }
        if (w.tick - o.tickLast >= GAP10) { closeVisit(c, o); open.delete(c.id); }
      }
    }
    // colobus encounters (15-min daylight scans)
    if (w.tick % SCAN === 0 && w.environment.daylight > 0.3) {
      for (const tr of w.troops) {
        const males = alive.filter(c => c.troopId === tr.id && c.sex === 'male' && c.age >= 15);
        for (const p of w.prey) {
          if (!males.some(c => Math.hypot(c.position[0] - p.position[0], c.position[2] - p.position[2]) <= 100)) continue;
          const k = `${tr.id}|${p.id}`, l = lastEnc.get(k);
          if (l === undefined || w.time - l > 1) R.colobus.encounters++;
          lastEnc.set(k, w.time);
        }
      }
    }
    if (i % DAY === DAY / 2) { R.colobus.communityDays += w.troops.length; R.colobus.maleDays += alive.filter(c => c.sex === 'male' && c.age >= 15).length; }
  }
  for (const [id, o] of open) { const c = w.chimps.find(k => k.id === id)!; if (!o.endSet) { o.end = 'window'; o.next = 'window'; o.why = 'window'; } closeVisit(c, o); }
  observing = false; rgTap.fn = null; energyTap.fn = null;
  for (const n of CLS) R.energy[n].ids = ids[n].size;
  R.hunts = w.stats.hunts - hunts0;
  R.living[1] = w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; R.deaths[k] = (R.deaths[k] ?? 0) + 1; }
  return R;
}

// ---------------------------------------------------------------------------------------------- summary (main thread)
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const med = (v: number[]) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const calDay = (t: number) => Math.floor((t + 6.5) / 24);
/** Single-linkage clusters of the crowns fed in, at `link` m: resource id = the smallest tree id of its cluster. */
function resources(trees: Record<number, [number, number]>, link: number): Map<number, number> {
  const idsT = Object.keys(trees).map(Number).sort((a, b) => a - b), par = new Map<number, number>(idsT.map(i => [i, i]));
  const find = (i: number): number => { let r = i; while (par.get(r)! !== r) r = par.get(r)!; par.set(i, r); return r; };
  const cell = new Map<string, number[]>(), key = (x: number, z: number) => `${Math.floor(x / link)}|${Math.floor(z / link)}`;
  for (const i of idsT) { const [x, z] = trees[i]; const k = key(x, z); (cell.get(k) ?? cell.set(k, []).get(k)!).push(i); }
  for (const i of idsT) {
    const [x, z] = trees[i], cx = Math.floor(x / link), cz = Math.floor(z / link);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of cell.get(`${cx + a}|${cz + b}`) ?? []) {
      if (j <= i) continue;
      const [x2, z2] = trees[j];
      if (Math.hypot(x - x2, z - z2) < link) { const ri = find(i), rj = find(j); if (ri !== rj) par.set(Math.max(ri, rj), Math.min(ri, rj)); }
    }
  }
  const out = new Map<number, number>(); for (const i of idsT) out.set(i, find(i)); return out;
}
interface Ret { gapH: number; startDays: number; calDiff: number; cropLeft: number; cropBack: number; tgtLeft: number; tgtBack: number; adultF: boolean; adultM: boolean; adult12: boolean; prevEnd: string }
function returnsOf(visits: Visit[], res: Map<number, number> | null): Ret[] {
  const by = new Map<string, Visit[]>();
  for (const v of visits) { const k = `${v.id}|${res ? res.get(v.tree) ?? v.tree : v.tree}`; (by.get(k) ?? by.set(k, []).get(k)!).push(v); }
  const out: Ret[] = [];
  for (const [, l0] of by) {
    l0.sort((a, b) => a.t0 - b.t0);
    // per resource (crowns < 30 m apart): visits to its crowns less than 10 min apart are one visit
    const l: Visit[] = [];
    for (const v of l0) { const p = l[l.length - 1]; if (res && p && v.t0 - p.t1 < 10 / 60 - 1e-9) l[l.length - 1] = { ...p, t1: Math.max(p.t1, v.t1), crop1: v.crop1, tgt1: v.tgt1 }; else l.push(v); }
    for (let i = 1; i < l.length; i++) {
      const a = l[i - 1], b = l[i];
      out.push({ gapH: b.t0 - a.t1, startDays: (b.t0 - a.t0) / 24, calDiff: calDay(b.t0) - calDay(a.t0), cropLeft: a.crop1, cropBack: b.crop0, tgtLeft: a.tgt1, tgtBack: b.tgt0,
        adultF: b.sex === 'female' && b.age >= 15, adultM: b.sex === 'male' && b.age >= 15, adult12: b.age >= 12, prevEnd: a.end === 'decision' ? a.why : a.end });
    }
  }
  return out;
}
function revisitSummary(r: Ret[]) {
  const diff = r.filter(x => x.calDiff > 0);
  const share = (f: (x: Ret) => boolean) => r.length ? r.filter(f).length / r.length : NaN;
  return { n: r.length, a_calDiffOtherDays: mean(diff.map(x => x.calDiff)), nOtherDays: diff.length, b_calDiffAll: mean(r.map(x => x.calDiff)), c_startDays: mean(r.map(x => x.startDays)),
    lt1h: share(x => x.gapH < 1), h1to3: share(x => x.gapH >= 1 && x.gapH < 3), sameDayLater: share(x => x.gapH >= 3 && x.calDiff === 0), nextDay: share(x => x.calDiff === 1), d2to7: share(x => x.calDiff >= 2 && x.calDiff <= 7), gt7: share(x => x.calDiff > 7),
    within3hByPrevEnd: (() => { const q = r.filter(x => x.gapH < 3), m: Record<string, number> = {}; for (const x of q) m[x.prevEnd] = (m[x.prevEnd] ?? 0) + 1; for (const k in m) m[k] /= Math.max(1, q.length); return m; })(),
    sameDay: share(x => x.calDiff === 0), medianGapH: med(r.map(x => x.gapH)), cropLeft: mean(r.map(x => x.cropLeft)), cropBack: mean(r.map(x => x.cropBack)), tgtLeft: mean(r.map(x => x.tgtLeft)), tgtBack: mean(r.map(x => x.tgtBack)),
    deficitLeft: mean(r.map(x => x.tgtLeft - x.cropLeft)), deficitBack: mean(r.map(x => x.tgtBack - x.cropBack)),
    sameDayCropLeft: mean(r.filter(x => x.calDiff === 0).map(x => x.cropLeft)), sameDayCropBack: mean(r.filter(x => x.calDiff === 0).map(x => x.cropBack)) };
}
function summarize(res: Result[]) {
  const S: Record<string, unknown> = {};
  // revisits per seed, then pooled
  const all: Ret[] = [], allR: Ret[] = [];
  const perSeed: Record<number, unknown> = {};
  for (const r of res) {
    const rs = resources(r.trees, 30), a = returnsOf(r.visits, null), b = returnsOf(r.visits, rs);
    all.push(...a); allR.push(...b);
    perSeed[r.seed] = { tree: { adultF: revisitSummary(a.filter(x => x.adultF)).a_calDiffOtherDays, all12: revisitSummary(a.filter(x => x.adult12)).a_calDiffOtherDays }, resource: { adultF: revisitSummary(b.filter(x => x.adultF)).a_calDiffOtherDays } };
  }
  S.revisitPerSeed = perSeed;
  S.revisitTree = { adultF: revisitSummary(all.filter(x => x.adultF)), adultM: revisitSummary(all.filter(x => x.adultM)), all12: revisitSummary(all.filter(x => x.adult12)), all5: revisitSummary(all) };
  S.revisitResource30 = { adultF: revisitSummary(allR.filter(x => x.adultF)), adultM: revisitSummary(allR.filter(x => x.adultM)), all12: revisitSummary(allR.filter(x => x.adult12)) };
  // visits and bout ends (animals ≥ 12 y, visits closed inside the window)
  const V12 = res.flatMap(r => r.visits).filter(v => v.age >= 12 && v.end !== 'window');
  const tally = (f: (v: Visit) => string) => { const m: Record<string, number> = {}; for (const v of V12) m[f(v)] = (m[f(v)] ?? 0) + 1; for (const k in m) m[k] /= V12.length; return m; };
  const seedDays = res.reduce((s, r) => s + r.days, 0);
  // distinct crowns fed in and feeding visits per animal-day (≥ 12 y; days on which the animal fed in a crown; T-FOOD-4's
  // "Distinct feeding trees per full-day follow" in truth, and the observer's count of visits with returns after ≥ 10 min)
  const perDay = new Map<string, Set<number>>(), visDay = new Map<string, number>();
  for (const r of res) for (const v of r.visits) if (v.age >= 12) { const k = `${r.seed}|${v.id}|${calDay(v.t0)}`; (perDay.get(k) ?? perDay.set(k, new Set()).get(k)!).add(v.tree); visDay.set(k, (visDay.get(k) ?? 0) + 1); }
  S.treesPerDay = { distinctCrowns: mean([...perDay.values()].map(x => x.size)), visits: mean([...visDay.values()]), animalDays: perDay.size };
  S.visits = { n: V12.length, perAnimalDay12: NaN, minutesMedian: med(V12.map(v => (v.t1 - v.t0) * 60 + 0.25)), minutesMean: mean(V12.map(v => (v.t1 - v.t0) * 60 + 0.25)), crop0: mean(V12.map(v => v.crop0)), crop1: mean(V12.map(v => v.crop1)),
    ateUnits: mean(V12.map(v => v.ate)), ateShareOfCrop: mean(V12.filter(v => v.crop0 > 0.02).map(v => v.ate / v.crop0)), lastRatio: mean(V12.map(v => v.lastRatio)), fillAtEnd: mean(V12.filter(v => Number.isFinite(v.fill)).map(v => v.fill)), hungerAtEnd: mean(V12.map(v => v.hunger)) };
  S.boutEnd = { state: tally(v => v.end), why: tally(v => v.end === 'decision' ? v.why : v.end), next: tally(v => v.next), companionLeaving: V12.filter(v => v.next === 'party follow' || v.next === 'joined trip').length / Math.max(1, V12.length),
    lastIntakeBelowHalf: V12.filter(v => v.lastRatio < 0.5).length / Math.max(1, V12.length) };
  // choices
  const ch = res.flatMap(r => r.choices), cc: Record<string, number> = {};
  for (const r of res) for (const [k, v] of Object.entries(r.choiceCounts)) cc[k] = (cc[k] ?? 0) + v;
  const ad8 = res.reduce((s, r) => s + r.animalDays8, 0);
  const byKind = (k: string) => { const l = ch.filter(c => c.kind === k), rt = l.filter(c => c.ret);
    return { n: l.length, perAnimalDay8: l.length / ad8, returnShare: rt.length / Math.max(1, l.length), returnWithin24h: rt.filter(c => c.hSince < 24).length / Math.max(1, l.length), returnWithin3h: rt.filter(c => c.hSince < 3).length / Math.max(1, l.length),
      hSinceMedian: med(rt.map(c => c.hSince)), cropNowReturn: mean(rt.map(c => c.cropNow)), cropLeftReturn: mean(rt.map(c => c.cropLeft)), beliefErr: mean(l.map(c => c.belief - c.cropNow)), beliefAbsErr: mean(l.map(c => Math.abs(c.belief - c.cropNow))),
      beliefErrReturn: mean(rt.map(c => c.belief - c.cropNow)), wouldRevisitMean: mean(l.map(c => c.wouldRevisit)) }; };
  S.choices = { counts: cc, perSeedDay: Object.fromEntries(Object.entries(cc).map(([k, v]) => [k, v / seedDays])), animalDays8: ad8, crownChoicesPerAnimalDay8: ((cc.crown ?? 0) + (cc.trip ?? 0) + (cc.join ?? 0)) / ad8,
    crown: byKind('crown'), trip: byKind('trip'), join: byKind('join') };
  // walking and energy by class
  const walk: Record<string, Record<string, number>> = {}, energy: Record<string, Record<string, number>> = {}, traj: Record<string, number[]> = {};
  for (const n of CLS) {
    const t = res.reduce((s, r) => s + r.ticks[n], 0), d = t / DAY;
    walk[n] = Object.fromEntries(WALK.map(k => [k, res.reduce((s, r) => s + r.walk[n][k], 0) / Math.max(1e-9, d) / 1000]));
    const E = { ticks: 0, eating: 0, walked: 0, res: 0, ids: 0 }; for (const r of res) { const e = r.energy[n]; E.ticks += e.ticks; E.eating += e.eating; E.walked += e.walked; E.res += e.res; E.ids += e.ids; }
    energy[n] = { individuals: E.ids, days: E.ticks / DAY, eatingMin: E.eating / (E.ticks / DAY) / 4, groundKm: E.walked / (E.ticks / DAY) / 1000, reserves: E.res / Math.max(1, E.ticks) };
    const L = Math.max(...res.map(r => r.traj[n].length));
    traj[n] = Array.from({ length: L }, (_, k) => mean(res.map(r => r.traj[n][k]).filter(v => v !== undefined && v !== null) as number[]));
  }
  const slope = (t: number[]) => { const p = t.map((y, i) => [i, y] as [number, number]).filter(([, y]) => Number.isFinite(y)); if (p.length < 3) return NaN; const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); return 100 * p.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / p.reduce((s, [x]) => s + (x - mx) ** 2, 0); };
  S.walkKmPerDay = walk; S.energy = energy; S.traj = traj; S.reserveSlopePctPerDay = Object.fromEntries(CLS.map(n => [n, slope(traj[n])]));
  const enc = res.reduce((s, r) => s + r.colobus.encounters, 0), cd = res.reduce((s, r) => s + r.colobus.communityDays, 0), md = res.reduce((s, r) => s + r.colobus.maleDays, 0);
  const hu = res.reduce((s, r) => s + r.hunts, 0), cy = res.reduce((s, r) => s + r.communities * r.days, 0) / 365;
  S.colobus = { encountersPerCommunityDay: enc / cd, encountersPerMaleDay: enc / md, encounters: enc, hunts: hu, huntsPerCommunityYear: hu / cy };
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
  console.log(JSON.stringify({ seeds, burnIn, days, params, wallS: (performance.now() - t0) / 1000, ...S }, null, 1).slice(0, 20000));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'revisit-diagnose', seeds, burnIn, days, params, ...S, raw: res.map(r => ({ seed: r.seed, choiceCounts: r.choiceCounts, hunts: r.hunts, communities: r.communities })) }, null, 1));
}
