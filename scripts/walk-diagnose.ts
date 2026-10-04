// Stage E2i diagnosis (development tool, reads only; docs/staging/e2i-prereg.md §2): how fast the model's chimpanzees
// walk, how much of their travel is moving and how much is standing inside an act, and how walking time enters the
// valuations. The world is e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in +
// tickWorld, no observer); the rules tap (rgTap) reads only, so the simulation is unchanged.
//
// Classes (energy-diagnose's): adult male (≥ 15 y), female other, female lactating, female pregnant, juvenile 5–12 y,
// infant 2–5 y; 12–15 y and carried infants are left out. Daylight: environment.daylight > 0.1 (energy-diagnose's).
//
// Readouts (simulation truth; definitions registered in the prereg §2):
//   act of a tick: the act at the end of the tick (revisit-diagnose's convention). A tick is "in-act" when the action, its
//     target and the decision count are those at the end of the previous tick (no decision in between): only in-act ticks
//     enter speeds and the moving/still split; every tick enters path and time.
//   act categories: own trip (travel to a tree, V.TREE, no leader), joined trip (V.TREE with a leader), caller (V.CALLER),
//     home (V.HOME), party follow (follow V.PARTY), care follow (V.MOTHER, V.JUVENILE), crown approach (forage at a tree,
//     phase < 2), in crown (forage at a tree, phase 2), fallback (forage on the ground), drink, nest, patrol, hunt,
//     flee, pair approach (groom, play, reconcile, console in phase 0), run (display, charge, attack), social other
//     (pant-grunt, share, beg, guard, consort, mate, transfer, climb), still acts (rest, groom in contact, nurse, call,
//     submit, shelter, alarm, …).
//   step: the horizontal displacement over the tick; ground when the animal is below 0.3 m at both ends; vertical when
//     |Δy| > 0.05 m. moving: ground step > 0.05 m; climbing: not moving and |Δy| > 0.05 m; still: neither.
//   speed while moving (m/s): ground step ÷ 15 s over in-act moving ticks: mean, p10, p50, p90; and the movement factor
//     moveTo applied (execution.ts speedFactor: life stage, injury, alertness, rain, light) averaged over them.
//   path: ground steps < 100 m (energy-diagnose's day range: km per animal-day), by act category.
//   observer travel (T-ACT-2 in truth): daylight ticks whose field category is travel (src/field/categories.ts
//     activityCategory), adults ≥ 15 y, as a share of daylight ticks, split into moving, climbing and still; still ticks of
//     travel acts by reason: departure wait (x.tryN set), party wait (initiator of an own trip, x.prog rising), at the goal
//     (within 0.5 m of the act's stop distance; travel acts only), a follower within 5 m of its target (follow acts),
//     patrol listening stop (leader, stopUntil), other. Effective speed = ground path in those ticks ÷ their
//     time (what walkMps copies from the field: day range ÷ travel time).
//   valuations: rules decisions (rgTap; reasons kept, arrived and lead excluded) of animals ≥ 8 y in full daylight
//     (daylight ≥ 1, so no light term), whose candidate list holds a tree option: crown in view (forage at a tree), own
//     trip, joined trip, caller trip to a crown. Each tree option is re-valued with the net-rate share (intake.ts
//     netRateShare, the function candidates.ts uses under forageRate) at walkMps and at a body speed vB (below), with
//     the crop, feeders, distance and climb candidates.ts gives it (the belief carried by the candidate when out of sight);
//     its score moves by fd × Δrate (fd = 1.6 hunger + 0.1, the crown's drive); every other option keeps its score. Reported:
//     per kind n, median distance, walk time and feeding time (E ÷ R) and the walk's share of the trip at both speeds;
//     the share of decisions whose top option or whose best tree option changes; the distance of the best tree option at
//     both speeds. Chosen drinks and hunts: their distance and walk time at both speeds.
//   movement phases (batesByrne2009's Methods, in truth): adults ≥ 15 y, daylight fixes every 5 min (20 ticks) while not
//     carried; a halt starts at a fix when the next four fixes (20 min) stay within 35 m of it and lasts until the first fix
//     beyond 35 m ("halted travel for 20 minutes or more"; "within a 35m radius of the initial stopping point"; a crown is
//     inside 35 m); a phase is the movement between two halts of the same day: distance = the sum of 5-min fix distances
//     from the last fix of one halt to the first of the next, time = their number of intervals × 5 min, speed = distance ÷
//     time ("dividing the distance travelled by travel time"). By class: phases (≥ 30 m, the table's minimum), mean
//     distance and speed (km/h; field Table 1: males 357 m, 1.94 km/h; lactating 277 m, 1.91; receptive 319 m, 2.21),
//     halts per day with ≥ 8 h of fixes and mean halt length (field: males 6.5 and 60 min, lactating 4.5 and 95 min).
//   vB (the diagnosis' body speed, registered in the prereg before its run; not a model input): adults ≥ 15 y 0.88 m/s
//     (males), 0.78 (females), 0.75 (a female carrying an infant: candidates.ts isCarried); younger animals the adult value
//     of their sex × (mass ÷ adult mass)^(1/6) (equal Froude number at a leg length ∝ mass^(1/3)).
//
//   pnpm exec tsx scripts/walk-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { candidateMeta, dependentOn, isCarried, V } from '../src/sim/candidates';
import { fruitKcalPerUnit, boutRoom, massOf } from '../src/sim/energy';
import { speedFactor } from '../src/sim/execution';
import { fruitRate, netRateShare } from '../src/sim/intake';
import { paramsOf, type Params } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { rgTap } from '../src/sim/rg';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { activityCategory, CAT_TRAVEL } from '../src/field/categories';
import type { Candidate, Chimp, Tree, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), TICK_S = TICK_HOURS * 3600, CROWN_Y = 0.45 + 0.28 / 2; // candidates.ts CROWN_Y
const CLS = ['adult male', 'female, other', 'female, lactating', 'female, pregnant', 'juvenile 5–12 y', 'infant 2–5 y'] as const;
type Cls = typeof CLS[number];
const ACTS = ['own trip', 'joined trip', 'caller', 'home', 'party follow', 'care follow', 'crown approach', 'in crown', 'fallback', 'drink', 'nest', 'patrol', 'hunt', 'flee',
  'pair approach', 'run', 'social other', 'still acts'] as const;
const STILL = ['departure wait', 'party wait', 'at goal', 'beside leader (≤ 5 m)', 'listening stop', 'other'] as const;
const KINDS = ['crown', 'own trip', 'joined trip', 'caller trip'] as const;
const HB = 0.025, HN = 160; // speed histogram: 0.025 m/s bins to 4 m/s

interface ActAcc { ticks: number; dayTicks: number; inAct: number; moving: number; climbing: number; still: number; path: number; movePath: number; f: number; hist: number[]; stillWhy: number[] }
const blankAct = (): ActAcc => ({ ticks: 0, dayTicks: 0, inAct: 0, moving: 0, climbing: 0, still: 0, path: 0, movePath: 0, f: 0, hist: new Array(HN).fill(0), stillWhy: new Array(STILL.length).fill(0) });
interface TravAcc { day: number; trav: number; moving: number; climbing: number; still: number; path: number; dayPath: number; stillWhy: number[] }
const blankTrav = (): TravAcc => ({ day: 0, trav: 0, moving: 0, climbing: 0, still: 0, path: 0, dayPath: 0, stillWhy: new Array(STILL.length).fill(0) });
interface Opt { kind: string; d: number; tw0: number; twB: number; tf: number; r0: number; rB: number; chosen: boolean }
interface Dec { cls: string; n: number; topChanged: boolean; bestTreeChanged: boolean; best0D: number; bestBD: number; chosenKind: string; hasTree: boolean }
interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Result {
  seed: number; days: number; acts: Record<string, Record<string, ActAcc>>; trav: Record<string, TravAcc>; animalTicks: Record<string, number>; ids: Record<string, number>;
  opts: Opt[]; decs: Dec[]; drinks: number[][]; hunts: number[][]; walkMps: number; deaths: Record<string, number>; living: [number, number];
  phases: { cls: string; m: number; min: number }[]; halts: { cls: string; n: number; min: number; fixes: number }[];
}

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
function classOf(c: Chimp): Cls | null {
  if (c.age < 2) return null;
  if (c.age < 5) return 'infant 2–5 y';
  if (c.age < 12) return 'juvenile 5–12 y';
  if (c.age < 15) return null;
  if (c.sex === 'male') return 'adult male';
  if (c.lactating) return 'female, lactating';
  return c.pregnancy > 0 ? 'female, pregnant' : 'female, other';
}
function actOf(c: Chimp): typeof ACTS[number] {
  const x = ix(c), a = c.action;
  switch (a) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'caller' : 'home';
    case 'follow': return x.v === V.PARTY ? 'party follow' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'care follow' : 'social other';
    case 'forage': return isTreeId(c.targetId) ? (x.phase < 2 ? 'crown approach' : 'in crown') : 'fallback';
    case 'drink': case 'nest': case 'patrol': case 'hunt': case 'flee': return a;
    case 'groom': case 'play': case 'reconcile': case 'console': return x.phase === 0 ? 'pair approach' : 'still acts';
    case 'display': case 'charge': case 'attack': return 'run';
    case 'pant-grunt': case 'share': case 'beg': case 'guard': case 'consort': case 'mate': case 'transfer': case 'climb': return 'social other';
    default: return 'still acts';
  }
}
/** The diagnosis' body speed (header): sex adult value, scaled by (mass ÷ adult mass)^(1/6) below 15 y; 0.75 carrying. */
function vBody(world: World, c: Chimp, P: Params): number {
  const adult = c.sex === 'male' ? 0.88 : 0.78;
  if (c.age >= 15) {
    if (c.sex === 'female') for (const k of world.chimps) if (k.alive && k.motherId === c.id && dependentOn(world, k) === c && isCarried(k, c)) return 0.75;
    return adult;
  }
  const am = c.sex === 'male' ? P.ledgerMassMaleKg : P.ledgerMassFemaleKg;
  return adult * Math.pow(Math.min(1, massOf(c, P) / am), 1 / 6);
}
const pct = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const histPct = (h: number[], q: number) => { const n = h.reduce((s, v) => s + v, 0); if (!n) return NaN; let k = 0; for (let i = 0; i < h.length; i++) { k += h[i]; if (k >= q * n) return (i + 0.5) * HB; } return NaN; };

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, days, acts: {}, trav: {}, animalTicks: {}, ids: {}, opts: [], decs: [], drinks: [], hunts: [], walkMps: P.walkMps, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0], phases: [], halts: [] };
  // movement phases (header): daylight 5-min fixes per adult and day, parsed at the end of each daylight period
  const fixes = new Map<number, { cls: string; pts: number[] }>();
  const parseDay = () => {
    for (const { cls, pts } of fixes.values()) {
      const n = pts.length / 2, halts: [number, number][] = [];
      const near = (i: number, j: number) => Math.hypot(pts[2 * j] - pts[2 * i], pts[2 * j + 1] - pts[2 * i + 1]) <= 35;
      for (let i = 0; i < n;) {
        let ok = i + 4 < n;
        for (let k = 1; ok && k <= 4; k++) if (!near(i, i + k)) ok = false;
        if (!ok) { i++; continue; }
        let j = i + 5; while (j < n && near(i, j)) j++;
        halts.push([i, j - 1]); i = j;
      }
      if (n >= 96) R.halts.push({ cls, n: halts.length, min: halts.reduce((s2, h) => s2 + (h[1] - h[0]) * 5, 0), fixes: n });
      for (let h = 1; h < halts.length; h++) {
        const a = halts[h - 1][1], b = halts[h][0];
        let m = 0; for (let k = a; k < b; k++) m += Math.hypot(pts[2 * k + 2] - pts[2 * k], pts[2 * k + 3] - pts[2 * k + 1]);
        if (m >= 30) R.phases.push({ cls, m, min: (b - a) * 5 });
      }
    }
    fixes.clear();
  };
  let wasLight = false;
  for (const n of CLS) { R.acts[n] = Object.fromEntries(ACTS.map(k => [k, blankAct()])); R.trav[n] = blankTrav(); R.animalTicks[n] = 0; R.ids[n] = 0; }
  const idSets = Object.fromEntries(CLS.map(n => [n, new Set<number>()])) as Record<Cls, Set<number>>;
  const prev = new Map<number, { x: number; y: number; z: number; key: string; dv: number; prog: number }>();
  // the valuation tap: rules decisions in full daylight (reads only)
  rgTap.fn = (c: Chimp, list: Candidate[], _menu: Candidate[], _probs: number[], chosen: Candidate, why: string) => {
    if (why === 'kept' || why === 'arrived' || why === 'lead' || c.age < 8 || w.environment.daylight < 1) return;
    const cls = classOf(c) ?? (c.age >= 12 && c.age < 15 ? 'adolescent 12–15 y' : 'other');
    const x = ix(c), idx = index(w), byId = idx.byId, vB = vBody(w, c, P), PB = { ...P, walkMps: vB } as Params;
    const fd = c.hunger * 1.6 + 0.1, kcal = fruitKcalPerUnit(P, false), Rk = fruitRate(c, P).fruitPerH * kcal;
    const px = c.position[0], pz = c.position[2], dOf = (t: Tree) => Math.hypot(t.position[0] - px, t.position[2] - pz);
    const scores0: number[] = [], scoresB: number[] = [], treeIdx: number[] = [], dist: number[] = [];
    let hasTree = false, chosenKind = 'other';
    for (let i = 0; i < list.length; i++) {
      const k = list[i], meta = candidateMeta.get(k);
      let kind = '', t: Tree | undefined, crop = 0, feeders = 0, d = 0, climb = 0;
      if (k.action === 'forage' && isTreeId(k.targetId)) {
        t = idx.treeById.get(k.targetId); if (t) { kind = 'crown'; crop = fruitAt(w, t); d = dOf(t); const cy = t.height * CROWN_Y; climb = c.targetId === t.id ? cy - c.position[1] : cy;
          for (const sid of x.seen) { const o = byId.get(sid); if (o && o.action === 'forage' && o.targetId === t.id) feeders++; } }
      } else if (k.action === 'travel' && meta && meta.v === V.TREE) {
        t = idx.treeById.get(k.targetId);
        if (t) {
          kind = meta.aux > 0 ? 'joined trip' : 'own trip'; climb = t.height * CROWN_Y;
          if (meta.bel) { crop = meta.bel[1]; feeders = meta.bel[3]; d = meta.bel[4]; }
          else { crop = fruitAt(w, t); d = dOf(t); if (meta.aux > 0) for (const sid of x.seen) { const o = byId.get(sid); if (o && o.alive && o !== c && o.targetId === t.id && (o.action === 'forage' || o.action === 'travel')) feeders++; } }
        }
      } else if (k.action === 'travel' && meta && meta.v === V.CALLER && x.jt !== undefined && x.jt > 0) {
        t = idx.treeById.get(x.jt);
        if (t) {
          kind = 'caller trip'; climb = t.height * CROWN_Y;
          if (meta.bel) { crop = meta.bel[1]; feeders = meta.bel[3]; d = meta.bel[4]; }
          else { crop = fruitAt(w, t); d = dOf(t); feeders = 1; const caller = byId.get(x.joinCaller); for (const sid of x.seen) { const o = byId.get(sid); if (o && o.alive && o !== c && o !== caller && o.targetId === t.id && (o.action === 'forage' || o.action === 'travel')) feeders++; } }
        }
      }
      let s0 = k.score, sB = k.score;
      if (kind) {
        hasTree = true;
        const r0 = netRateShare(c, P, crop, feeders, d, climb), rB = netRateShare(c, PB, crop, feeders, d, climb);
        sB = s0 + fd * (rB - r0);
        const E = Math.min(Math.max(0, crop) / (1 + feeders) * kcal, boutRoom(c, P, Rk));
        R.opts.push({ kind, d, tw0: d / P.walkMps / 60, twB: d / vB / 60, tf: Rk > 0 ? E / Rk * 60 : 0, r0, rB, chosen: k === chosen });
        treeIdx.push(i);
      }
      if (k === chosen) chosenKind = kind || k.action;
      scores0.push(s0); scoresB.push(sB); dist.push(d);
    }
    if (!hasTree) return;
    const argmax = (s: number[], only?: number[]) => { let b = -1, bs = -Infinity; for (const i of only ?? s.map((_, j) => j)) if (s[i] > bs) { bs = s[i]; b = i; } return b; };
    const t0 = argmax(scores0), tB = argmax(scoresB), b0 = argmax(scores0, treeIdx), bB = argmax(scoresB, treeIdx);
    R.decs.push({ cls, n: list.length, topChanged: t0 !== tB, bestTreeChanged: b0 !== bB, best0D: dist[b0], bestBD: dist[bB], chosenKind, hasTree });
    if (chosen.action === 'drink') { const wt = idx.waterById.get(chosen.targetId); if (wt) { const d = Math.hypot(wt.position[0] - px, wt.position[2] - pz); R.drinks.push([d, d / P.walkMps / 60, d / vB / 60]); } }
    if (chosen.action === 'hunt') { const p = w.prey.find(q => q.id === chosen.targetId); if (p) { const d = Math.hypot(p.position[0] - px, p.position[2] - pz); R.hunts.push([d, d / P.walkMps / 60, d / vB / 60]); } }
  };
  try {
    for (let i = 0; i < days * DAY; i++) {
      tickWorld(w);
      const light = w.environment.daylight > 0.1, s = simOf(w);
      const idx = index(w);
      if (wasLight && !light) parseDay();
      wasLight = light;
      if (light && i % 20 === 0) for (const c of w.chimps) {
        if (!c.alive || c.age < 15) continue;
        const n = classOf(c); if (!n) continue;
        const m = dependentOn(w, c); if (m && isCarried(c, m)) continue;
        let f = fixes.get(c.id); if (!f) { f = { cls: n, pts: [] }; fixes.set(c.id, f); }
        f.pts.push(c.position[0], c.position[2]);
      }
      for (const c of w.chimps) {
        if (!c.alive) { prev.delete(c.id); continue; }
        const x = ix(c), key = `${c.action}|${c.targetId}`, p = prev.get(c.id);
        prev.set(c.id, { x: c.position[0], y: c.position[1], z: c.position[2], key, dv: c.decisionVersion, prog: x.prog });
        const n = classOf(c);
        if (!n || !p) continue;
        const m = dependentOn(w, c);
        if (m && isCarried(c, m)) continue; // riding: the carrier moves it
        idSets[n].add(c.id); R.animalTicks[n]++;
        const dh = Math.hypot(c.position[0] - p.x, c.position[2] - p.z), dy = c.position[1] - p.y;
        const ground = p.y < 0.3 && c.position[1] < 0.3, gstep = ground && dh < 100 ? dh : 0;
        const act = actOf(c), A = R.acts[n][act];
        const inAct = p.key === key && p.dv === c.decisionVersion;
        A.ticks++; if (light) A.dayTicks++; A.path += gstep;
        const moving = ground && dh > 0.05 && dh < 100, climbing = !moving && Math.abs(dy) > 0.05;
        // why a travel-category act stands still (header)
        let why = -1;
        if (!moving && !climbing) {
          if (c.action === 'travel' && x.tryN !== undefined) why = 0;
          else if (c.action === 'travel' && x.v === V.TREE && x.aux <= 0 && x.prog > (p.prog ?? 0)) why = 1;
          else if (c.action === 'travel') {
            // at the goal: within 0.5 m of the act's stop distance (execution.ts travel)
            let gx = 0, gz = 0, stop = 3;
            if (x.v === V.CALLER) { gx = x.joinX; gz = x.joinZ; stop = P.joinCallStopM; }
            else if (x.v === V.HOME || c.targetId < 0) { const t = idx.troopById.get(c.troopId); if (t) { gx = t.center[0]; gz = t.center[2]; stop = t.radius * 0.6; } }
            else { const t = idx.treeById.get(c.targetId); if (t) { gx = t.position[0]; gz = t.position[2]; } }
            why = Math.hypot(gx - c.position[0], gz - c.position[2]) <= stop + 0.5 ? 2 : 5;
          }
          else if (c.action === 'patrol') { const pt = s.patrols[c.troopId]; why = pt && pt.stopUntil > w.time ? 4 : 5; }
          else if (c.action === 'follow') { const o = idx.byId.get(c.targetId); why = o && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) < 5 ? 3 : 5; }
          else why = 5;
        }
        if (inAct) {
          A.inAct++;
          if (moving) {
            A.moving++; A.movePath += dh; A.f += speedFactor(w, c);
            A.hist[Math.min(HN - 1, Math.floor(dh / TICK_S / HB))]++;
          } else if (climbing) A.climbing++;
          else { A.still++; if (why >= 0) A.stillWhy[why]++; }
        }
        // observer travel (adults ≥ 15 y, daylight)
        if (light && c.age >= 15) {
          const T = R.trav[n];
          T.day++; T.dayPath += gstep;
          const atWater = c.action === 'drink' && (() => { const wt = idx.waterById.get(c.targetId); return !!wt && Math.hypot(wt.position[0] - c.position[0], wt.position[2] - c.position[2]) <= 1.0; })();
          if (activityCategory(c.action, x.phase, c.targetId, false, false, atWater) === CAT_TRAVEL) {
            T.trav++; T.path += gstep;
            if (moving) T.moving++; else if (climbing) T.climbing++; else { T.still++; if (why >= 0) T.stillWhy[why]++; }
          }
        }
      }
    }
    parseDay();
  } finally { rgTap.fn = null; }
  for (const n of CLS) R.ids[n] = idSets[n].size;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; R.deaths[k] = (R.deaths[k] ?? 0) + 1; }
  R.living[1] = w.chimps.filter(c => c.alive).length;
  return R;
}

function summarize(res: Result[]) {
  const S: Record<string, unknown> = {};
  const walkMps = res[0].walkMps;
  // acts by class
  const acts: Record<string, Record<string, Record<string, number>>> = {};
  const all: Record<string, ActAcc> = Object.fromEntries(ACTS.map(k => [k, blankAct()]));
  for (const n of CLS) {
    const animalDays = res.reduce((s, r) => s + r.animalTicks[n], 0) / DAY;
    acts[n] = {};
    for (const k of ACTS) {
      const A = blankAct();
      for (const r of res) { const a = r.acts[n][k]; A.ticks += a.ticks; A.dayTicks += a.dayTicks; A.inAct += a.inAct; A.moving += a.moving; A.climbing += a.climbing; A.still += a.still; A.path += a.path; A.movePath += a.movePath; A.f += a.f; for (let i = 0; i < HN; i++) A.hist[i] += a.hist[i]; for (let i = 0; i < STILL.length; i++) A.stillWhy[i] += a.stillWhy[i]; }
      const G = all[k]; G.ticks += A.ticks; G.dayTicks += A.dayTicks; G.inAct += A.inAct; G.moving += A.moving; G.climbing += A.climbing; G.still += A.still; G.path += A.path; G.movePath += A.movePath; G.f += A.f; for (let i = 0; i < HN; i++) G.hist[i] += A.hist[i]; for (let i = 0; i < STILL.length; i++) G.stillWhy[i] += A.stillWhy[i];
      if (!A.ticks) continue;
      acts[n][k] = { dayMinPerDay: A.dayTicks / Math.max(1e-9, animalDays) * TICK_HOURS * 60, kmPerDay: A.path / Math.max(1e-9, animalDays) / 1000, movingShare: A.moving / Math.max(1, A.inAct), climbShare: A.climbing / Math.max(1, A.inAct), stillShare: A.still / Math.max(1, A.inAct),
        speedMean: A.movePath / Math.max(1, A.moving) / TICK_S, speedP10: histPct(A.hist, 0.1), speedP50: histPct(A.hist, 0.5), speedP90: histPct(A.hist, 0.9), factor: A.f / Math.max(1, A.moving), movingTicks: A.moving };
    }
    acts[n]._animalDays = { v: animalDays } as unknown as Record<string, number>;
  }
  S.acts = acts;
  S.actsAll = Object.fromEntries(ACTS.map(k => { const A = all[k]; return [k, { inAct: A.inAct, movingShare: A.moving / Math.max(1, A.inAct), climbShare: A.climbing / Math.max(1, A.inAct), stillShare: A.still / Math.max(1, A.inAct),
    speedMean: A.movePath / Math.max(1, A.moving) / TICK_S, speedP10: histPct(A.hist, 0.1), speedP50: histPct(A.hist, 0.5), speedP90: histPct(A.hist, 0.9), factor: A.f / Math.max(1, A.moving),
    stillWhy: Object.fromEntries(STILL.map((s, i) => [s, A.stillWhy[i] / Math.max(1, A.still)])) }]; }));
  // day ranges by class (energy-diagnose's definition)
  S.dayRangeKm = Object.fromEntries(CLS.map(n => { const ad = res.reduce((s, r) => s + r.animalTicks[n], 0) / DAY; let p = 0; for (const r of res) for (const k of ACTS) p += r.acts[n][k].path; return [n, ad > 0 ? p / ad / 1000 : NaN]; }));
  S.individuals = Object.fromEntries(CLS.map(n => [n, res.reduce((s, r) => s + r.ids[n], 0)]));
  // observer travel decomposition
  S.travel = Object.fromEntries(CLS.filter(n => n !== 'juvenile 5–12 y' && n !== 'infant 2–5 y').map(n => {
    const T = blankTrav(); for (const r of res) { const t = r.trav[n]; T.day += t.day; T.trav += t.trav; T.moving += t.moving; T.climbing += t.climbing; T.still += t.still; T.path += t.path; T.dayPath += t.dayPath; for (let i = 0; i < STILL.length; i++) T.stillWhy[i] += t.stillWhy[i]; }
    const ad = res.reduce((s, r) => s + r.animalTicks[n], 0) / DAY;
    return [n, { travelShare: T.trav / Math.max(1, T.day), movingOfTravel: T.moving / Math.max(1, T.trav), climbOfTravel: T.climbing / Math.max(1, T.trav), stillOfTravel: T.still / Math.max(1, T.trav),
      stillWhy: Object.fromEntries(STILL.map((s, i) => [s, T.stillWhy[i] / Math.max(1, T.still)])), effSpeed: T.path / Math.max(1, T.trav) / TICK_S, movingSpeed: T.path / Math.max(1, T.moving) / TICK_S,
      pathInTravelShare: T.path / Math.max(1e-9, T.dayPath), travelMinPerDay: T.trav * TICK_HOURS * 60 / Math.max(1e-9, ad), movingMinPerDay: T.moving * TICK_HOURS * 60 / Math.max(1e-9, ad), travelKmPerDay: T.path / Math.max(1e-9, ad) / 1000 }];
  }));
  // valuations
  const opts = res.flatMap(r => r.opts), decs = res.flatMap(r => r.decs);
  S.valuation = {
    walkMps, decisions: decs.length,
    topChanged: decs.filter(d => d.topChanged).length / Math.max(1, decs.length),
    bestTreeChanged: decs.filter(d => d.bestTreeChanged).length / Math.max(1, decs.length),
    bestTreeD0Median: pct(decs.map(d => d.best0D), 0.5), bestTreeDBMedian: pct(decs.map(d => d.bestBD), 0.5),
    bestTreeD0Mean: decs.reduce((s, d) => s + d.best0D, 0) / Math.max(1, decs.length), bestTreeDBMean: decs.reduce((s, d) => s + d.bestBD, 0) / Math.max(1, decs.length),
    chosen: Object.fromEntries([...new Set(decs.map(d => d.chosenKind))].map(k => [k, decs.filter(d => d.chosenKind === k).length / decs.length])),
    byKind: Object.fromEntries(KINDS.map(k => {
      const o = opts.filter(q => q.kind === k), ch = o.filter(q => q.chosen);
      const ws = (q: Opt, tw: number) => q.tf + tw > 0 ? tw / (tw + q.tf) : NaN;
      return [k, { n: o.length, chosen: ch.length, dMedian: pct(o.map(q => q.d), 0.5), dChosenMedian: pct(ch.map(q => q.d), 0.5), dChosenP90: pct(ch.map(q => q.d), 0.9),
        walkMin0Chosen: pct(ch.map(q => q.tw0), 0.5), walkMinBChosen: pct(ch.map(q => q.twB), 0.5), feedMinChosen: pct(ch.map(q => q.tf), 0.5),
        walkShare0Chosen: pct(ch.map(q => ws(q, q.tw0)), 0.5), walkShareBChosen: pct(ch.map(q => ws(q, q.twB)), 0.5),
        rate0Chosen: pct(ch.map(q => q.r0), 0.5), rateBChosen: pct(ch.map(q => q.rB), 0.5), zeroRate0: o.filter(q => q.r0 === 0).length / Math.max(1, o.length) }];
    })),
    drinks: { n: res.reduce((s, r) => s + r.drinks.length, 0), dMedian: pct(res.flatMap(r => r.drinks.map(q => q[0])), 0.5), walkMin0: pct(res.flatMap(r => r.drinks.map(q => q[1])), 0.5), walkMinB: pct(res.flatMap(r => r.drinks.map(q => q[2])), 0.5) },
    hunts: { n: res.reduce((s, r) => s + r.hunts.length, 0), dMedian: pct(res.flatMap(r => r.hunts.map(q => q[0])), 0.5), walkMin0: pct(res.flatMap(r => r.hunts.map(q => q[1])), 0.5), walkMinB: pct(res.flatMap(r => r.hunts.map(q => q[2])), 0.5) },
  };
  const ph = res.flatMap(r => r.phases), hl = res.flatMap(r => r.halts);
  S.phases = Object.fromEntries(['adult male', 'female, lactating', 'female, other', 'female, pregnant'].map(n => {
    const p = ph.filter(q => q.cls === n), h = hl.filter(q => q.cls === n);
    const km = p.reduce((s2, q) => s2 + q.m, 0) / 1000, hrs = p.reduce((s2, q) => s2 + q.min, 0) / 60;
    return [n, { phases: p.length, distMean: p.reduce((s2, q) => s2 + q.m, 0) / Math.max(1, p.length), speedKmhMean: p.reduce((s2, q) => s2 + q.m / 1000 / (q.min / 60), 0) / Math.max(1, p.length),
      speedKmhPooled: km / Math.max(1e-9, hrs), speedKmhMedian: pct(p.map(q => q.m / 1000 / (q.min / 60)), 0.5), haltsPerDay: h.reduce((s2, q) => s2 + q.n, 0) / Math.max(1, h.length),
      haltMinMean: h.reduce((s2, q) => s2 + q.min, 0) / Math.max(1, h.reduce((s2, q) => s2 + q.n, 0)), days: h.length }];
  }));
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
  console.log(JSON.stringify({ seeds, burnIn, days, wallS: (performance.now() - t0) / 1000, ...S }, null, 1).slice(0, 30000));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'walk-diagnose', seeds, burnIn, days, params, ...S }, null, 1));
}
