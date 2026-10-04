// Stage E2j diagnosis (development tool, reads only; docs/staging/e2j-prereg.md §2): where the time and the energy of
// locomotion go, by class and act, so a change of walking speed (E2i's walkGait) can be traced to the term that turns it
// into an energy loss. The world is e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in +
// tickWorld, no observer); the tool hooks only energyTap (reads), so the simulation is unchanged.
//
// Classes (energy-diagnose's): adult male (≥ 15 y), female other, female pregnant, female lactating (and by her youngest
// unweaned infant's age: < 0.5, 0.5–2, ≥ 2 y), juvenile 5–12 y, infant 2–5 y, infant 0.5–2 y; 12–15 y and infants under
// 0.5 y are left out. Daylight: environment.daylight > 0.1 (energy-diagnose's).
//
// Readouts (simulation truth; definitions registered in the prereg §2):
//   act of a tick: the act at the end of the tick (walk-diagnose's 18 categories: own trip, joined trip, caller, home,
//     party follow, care follow, crown approach, in crown, fallback, drink, nest, patrol, hunt, flee, pair approach, run,
//     social other, still acts).
//   state of a tick (the move since the previous tick): carried (dependentOn + isCarried: the carrier moves it); walk
//     (below 0.3 m at both ends, horizontal step > 0.05 m and < 100 m); up (not walk, rise > 0.05 m); down (not walk,
//     fall > 0.05 m); canopy (none of these, horizontal step > 0.05 m above the ground); still (none).
//   locomotion energy (kcal), the ledger's own formula (energy.ts locomotionKcal: sockol2007's net cost per kg and metre
//     on every horizontal metre, mass × g ÷ ledgerClimbEff on every metre climbed, descent free), on the same move
//     filter (a step longer than 2 × runMps × 15 s + 2 m is a placement): own walk and climb of the animal by act; carry =
//     the rider's metres × the rider's mass (energy.ts rideTick) charged to the carrier, split by the carrier's state
//     (walk or up) and act. Cross-check: the same terms from energyTap (the ledger's books), per class.
//   time: minutes per animal-day by act and state (all day and daylight).
//   events per animal-day: trips (a decision that starts own trip, joined trip or caller), crown visits (arrivals in a
//     crown: forage at a tree reaching phase 2), ascents (a run of up ticks; its height = the summed rise), ascents by
//     act (crown approach, nest, care follow, other), descents.
//   per crown visit (arrival to the next decision): kcal eaten there (energyTap 'eaten' while in that crown), and the
//     locomotion spent since the previous crown visit ended (own walk + climb + carry), its walk metres and climb metres.
//   trips: the distance to the tree at the start of an own or joined trip (median, mean, p90).
//   intake: kcal eaten by food (energyTap 'eaten': drupe, fig, fallback, meat; formula energy into the gut), milk drunk
//     ('suckled'); energyTap totals of every expenditure term.
//   halts inside travel (observer travel, src/field/categories.ts activityCategory = travel; animals ≥ 5 y, daylight):
//     a travel bout = a run of consecutive travel-category ticks of one animal; a halt = a run of still ticks inside it;
//     halts per bout, halt minutes per bout and per day, and the reason of each halt at its first tick (walk-diagnose's:
//     departure wait, party wait, at the goal, beside the followed animal, listening stop, other).
//   speed while walking in own and joined trips (m/s, ground step ÷ 15 s, mean and p50).
//   movement phases (batesByrne2009's Methods, walk-diagnose's code): adults ≥ 15 y, daylight fixes every 5 min; halts of
//     ≥ 20 min within 35 m; phase distance, speed, halts per day and their length.
//
//   pnpm exec tsx scripts/climb-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { dependentOn, isCarried, V } from '../src/sim/candidates';
import { energyTap, locomotionKcal, type EnergyTerm, type FoodKind } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { index, isTreeId, ix, simOf, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { activityCategory, CAT_TRAVEL } from '../src/field/categories';
import type { Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), TICK_S = TICK_HOURS * 3600;
const CLS = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'lact: infant < 0.5 y', 'lact: infant 0.5–2 y', 'lact: infant ≥ 2 y',
  'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y'] as const;
type Cls = typeof CLS[number];
const ACTS = ['own trip', 'joined trip', 'caller', 'home', 'party follow', 'care follow', 'crown approach', 'in crown', 'fallback', 'drink', 'nest', 'patrol', 'hunt', 'flee',
  'pair approach', 'run', 'social other', 'still acts'] as const;
type Act = typeof ACTS[number];
const STATES = ['carried', 'walk', 'up', 'down', 'canopy', 'still'] as const;
const WHY = ['departure wait', 'party wait', 'at goal', 'beside leader (≤ 5 m)', 'listening stop', 'other'] as const;
const TERMS: EnergyTerm[] = ['rest', 'activity', 'walk', 'climb', 'carry', 'pregnancy', 'growth', 'milk', 'digestion'];
const FOODS: FoodKind[] = ['drupe', 'fig', 'fallback', 'meat', 'milk'];

interface ActAcc { t: number[]; dayT: number[]; hM: number; walkM: number; upM: number; downM: number; walkK: number; climbK: number; carryWalkK: number; carryClimbK: number; carryWalkM: number; carryUpM: number }
const blankAct = (): ActAcc => ({ t: new Array(STATES.length).fill(0), dayT: new Array(STATES.length).fill(0), hM: 0, walkM: 0, upM: 0, downM: 0, walkK: 0, climbK: 0, carryWalkK: 0, carryClimbK: 0, carryWalkM: 0, carryUpM: 0 });
interface ClsAcc {
  ticks: number; dayTicks: number; acts: Record<string, ActAcc>; tap: Record<string, number>; eaten: Record<string, number>; suckled: number;
  trips: number; tripD: number[]; crowns: number; ascents: number; ascentsBy: Record<string, number>; ascentM: number; descents: number;
  visitEat: number[]; visitLoc: number[]; visitWalkM: number[]; visitUpM: number[];
  tbouts: number; tboutTicks: number; halts: number; haltTicks: number; haltWhy: number[]; haltWhyTicks: number[];
  tripMoveM: number; tripMoveTicks: number; tripHist: number[];
  /** By raw action (c.action): ticks, horizontal metres, metres up, own walk and climb kcal. */ byAction: Record<string, number[]>;
}
const HB = 0.025, HN = 160;
const blankCls = (): ClsAcc => ({ ticks: 0, dayTicks: 0, acts: Object.fromEntries(ACTS.map(a => [a, blankAct()])), tap: Object.fromEntries(TERMS.map(t => [t, 0])), eaten: Object.fromEntries(FOODS.map(f => [f, 0])), suckled: 0,
  trips: 0, tripD: [], crowns: 0, ascents: 0, ascentsBy: {}, ascentM: 0, descents: 0, visitEat: [], visitLoc: [], visitWalkM: [], visitUpM: [],
  tbouts: 0, tboutTicks: 0, halts: 0, haltTicks: 0, haltWhy: new Array(WHY.length).fill(0), haltWhyTicks: new Array(WHY.length).fill(0), tripMoveM: 0, tripMoveTicks: 0, tripHist: new Array(HN).fill(0), byAction: {} });
interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Result { seed: number; days: number; cls: Record<string, ClsAcc>; ids: Record<string, number>; deaths: Record<string, number>; living: [number, number]; phases: { cls: string; m: number; min: number }[]; halts20: { cls: string; n: number; min: number; fixes: number }[] }

function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
function classesOf(c: Chimp, young: Map<number, number>): Cls[] {
  if (c.age < 0.5) return [];
  if (c.age < 2) return ['infant 0.5–2 y'];
  if (c.age < 5) return ['infant 2–5 y'];
  if (c.age < 12) return ['juvenile 5–12 y'];
  if (c.age < 15) return [];
  if (c.sex === 'male') return ['adult male'];
  if (c.lactating) { const a = young.get(c.id); return a === undefined ? ['female, lactating'] : ['female, lactating', a < 0.5 ? 'lact: infant < 0.5 y' : a < 2 ? 'lact: infant 0.5–2 y' : 'lact: infant ≥ 2 y']; }
  return [c.pregnancy > 0 ? 'female, pregnant' : 'female, other'];
}
function actOf(c: Chimp): Act {
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
const pct = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const mean = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
const histPct = (h: number[], q: number) => { const n = h.reduce((s, v) => s + v, 0); if (!n) return NaN; let k = 0; for (let i = 0; i < h.length; i++) { k += h[i]; if (k >= q * n) return (i + 0.5) * HB; } return NaN; };

interface Prev { x: number; y: number; z: number; dv: number; prog: number; act: Act; target: number; trav: boolean; tbHalt: boolean; up: boolean; down: boolean; crownId: number; locK: number; locWalkM: number; locUpM: number; visitEat: number }

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const maxStep = 2 * P.runMps * TICK_S + 2; // energy.ts rates().maxStep
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, days, cls: Object.fromEntries(CLS.map(n => [n, blankCls()])), ids: {}, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0], phases: [], halts20: [] };
  const idSets = Object.fromEntries(CLS.map(n => [n, new Set<number>()])) as Record<Cls, Set<number>>;
  const prev = new Map<number, Prev>();
  let clsNow = new Map<number, Cls[]>();
  // energyTap (reads only): expenditure terms and intake, by the animal's classes at this tick
  const eatNow = new Map<number, number>();
  energyTap.fn = (c: Chimp, term: EnergyTerm, kcal: number, kind?: FoodKind) => {
    const ks = clsNow.get(c.id); if (!ks) return;
    if (term === 'eaten') { for (const k of ks) R.cls[k].eaten[kind ?? 'drupe'] += kcal; eatNow.set(c.id, (eatNow.get(c.id) ?? 0) + kcal); return; }
    if (term === 'suckled') { for (const k of ks) R.cls[k].suckled += kcal; return; }
    for (const k of ks) if (k in R.cls && term in R.cls[k].tap) R.cls[k].tap[term] += kcal;
  };
  // movement phases (walk-diagnose's code): daylight 5-min fixes per adult and day, parsed at the end of each daylight period
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
      if (n >= 96) R.halts20.push({ cls, n: halts.length, min: halts.reduce((s2, h) => s2 + (h[1] - h[0]) * 5, 0), fixes: n });
      for (let h = 1; h < halts.length; h++) {
        const a = halts[h - 1][1], b = halts[h][0];
        let m = 0; for (let k = a; k < b; k++) m += Math.hypot(pts[2 * k + 2] - pts[2 * k], pts[2 * k + 3] - pts[2 * k + 1]);
        if (m >= 30) R.phases.push({ cls, m, min: (b - a) * 5 });
      }
    }
    fixes.clear();
  };
  let wasLight = false;
  // a travel bout still open per animal: ticks so far, halts, the halt being counted
  const tb = new Map<number, { ticks: number; halts: number; haltTicks: number }>();
  try {
    for (let i = 0; i < days * DAY; i++) {
      const young = youngest(w);
      clsNow = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, classesOf(c, young)]));
      eatNow.clear();
      tickWorld(w);
      const light = w.environment.daylight > 0.1, s = simOf(w), idx = index(w);
      if (wasLight && !light) parseDay();
      wasLight = light;
      if (light && i % 20 === 0) for (const c of w.chimps) {
        if (!c.alive || c.age < 15) continue;
        const ks = clsNow.get(c.id); if (!ks || !ks.length) continue;
        const m = dependentOn(w, c); if (m && isCarried(c, m)) continue;
        let f = fixes.get(c.id); if (!f) { f = { cls: ks[0], pts: [] }; fixes.set(c.id, f); }
        f.pts.push(c.position[0], c.position[2]);
      }
      // carriers: the rider's move this tick (tick.ts carryInfants → energy.ts rideTick), charged to the carrier's state and act
      const carry = new Map<number, { k: number; walkK: number; climbK: number; dM: number; upM: number }>();
      for (const c of w.chimps) {
        if (!c.alive || c.age >= 4) continue;
        const m = dependentOn(w, c), p = prev.get(c.id);
        if (!m || !p || !isCarried(c, m)) continue;
        const dx = c.position[0] - p.x, dz = c.position[2] - p.z, dy = c.position[1] - p.y, d = Math.hypot(dx, dz);
        if ((d === 0 && dy <= 0) || d > maxStep || dy > maxStep) continue;
        const walkK = locomotionKcal(c, P, d, 0), climbK = dy > 0 ? locomotionKcal(c, P, 0, dy) : 0;
        const e = carry.get(m.id) ?? { k: 0, walkK: 0, climbK: 0, dM: 0, upM: 0 };
        e.walkK += walkK; e.climbK += climbK; e.dM += d; e.upM += dy > 0 ? dy : 0; carry.set(m.id, e);
      }
      for (const c of w.chimps) {
        const p = prev.get(c.id);
        if (!c.alive) { prev.delete(c.id); tb.delete(c.id); continue; }
        const x = ix(c), act = actOf(c);
        const m = dependentOn(w, c), carried = !!m && isCarried(c, m);
        const dx = c.position[0] - (p?.x ?? c.position[0]), dz = c.position[2] - (p?.z ?? c.position[2]), dy = c.position[1] - (p?.y ?? c.position[1]), dh = Math.hypot(dx, dz);
        const ground = (p?.y ?? 0) < 0.3 && c.position[1] < 0.3, valid = !!p && dh <= maxStep && dy <= maxStep;
        const st = carried ? 0 : ground && dh > 0.05 && dh < 100 ? 1 : dy > 0.05 ? 2 : dy < -0.05 ? 3 : dh > 0.05 ? 4 : 5;
        const ks = clsNow.get(c.id) ?? [];
        // events
        const newDecision = !!p && p.dv !== c.decisionVersion;
        const isTrip = act === 'own trip' || act === 'joined trip' || act === 'caller';
        const up = st === 2;
        const atCrown = c.action === 'forage' && isTreeId(c.targetId) && x.phase === 2;
        const cur: Prev = { x: c.position[0], y: c.position[1], z: c.position[2], dv: c.decisionVersion, prog: x.prog, act, target: c.targetId, trav: false, tbHalt: false, up, down: st === 3,
          crownId: p?.crownId ?? -1, locK: p?.locK ?? 0, locWalkM: p?.locWalkM ?? 0, locUpM: p?.locUpM ?? 0, visitEat: p?.visitEat ?? 0 };
        // locomotion this tick (the ledger's formula on the ledger's move filter); carried animals move no metres of their own
        const ownWalkK = valid && !carried ? locomotionKcal(c, P, dh, 0) : 0, ownClimbK = valid && !carried && dy > 0 ? locomotionKcal(c, P, 0, dy) : 0;
        const cy = carry.get(c.id);
        // crown visits: a visit runs from the arrival in a crown to the act's end; locomotion accumulates between visits
        const inVisit = cur.crownId >= 0 && atCrown && c.targetId === cur.crownId;
        if (cur.crownId >= 0 && !inVisit) {
          for (const k of ks) R.cls[k].visitEat.push(cur.visitEat);
          cur.crownId = -1; cur.visitEat = 0;
        }
        if (cur.crownId >= 0) cur.visitEat += eatNow.get(c.id) ?? 0;
        else {
          cur.locK += ownWalkK + ownClimbK + (cy ? cy.walkK + cy.climbK : 0); cur.locWalkM += valid && !carried ? dh : 0; cur.locUpM += valid && !carried && dy > 0 ? dy : 0;
          if (atCrown) {
            for (const k of ks) { const A = R.cls[k]; A.crowns++; A.visitLoc.push(cur.locK); A.visitWalkM.push(cur.locWalkM); A.visitUpM.push(cur.locUpM); }
            cur.crownId = c.targetId; cur.visitEat = eatNow.get(c.id) ?? 0; cur.locK = 0; cur.locWalkM = 0; cur.locUpM = 0;
          }
        }
        // observer travel bouts and the halts inside them (animals ≥ 5 y, daylight)
        const atWater = c.action === 'drink' && (() => { const wt = idx.waterById.get(c.targetId); return !!wt && Math.hypot(wt.position[0] - c.position[0], wt.position[2] - c.position[2]) <= 1.0; })();
        const trav = light && c.age >= 5 && !carried && activityCategory(c.action, x.phase, c.targetId, false, false, atWater) === CAT_TRAVEL;
        cur.trav = trav;
        let why = -1;
        if (trav && st === 5) {
          if (c.action === 'travel' && x.tryN !== undefined) why = 0;
          else if (c.action === 'travel' && x.v === V.TREE && x.aux <= 0 && p && x.prog > p.prog) why = 1;
          else if (c.action === 'travel') {
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
        if (p && ks.length) {
          for (const k of ks) {
            idSets[k].add(c.id);
            const A = R.cls[k], G = A.acts[act];
            A.ticks++; if (light) A.dayTicks++;
            G.t[st]++; if (light) G.dayT[st]++;
            const ba = (A.byAction[c.action] ??= [0, 0, 0, 0, 0]); ba[0]++; if (valid && !carried) { ba[1] += dh; if (dy > 0) ba[2] += dy; ba[3] += ownWalkK; ba[4] += ownClimbK; }
            if (valid && !carried) {
              G.hM += dh; if (st === 1) G.walkM += dh; if (dy > 0) G.upM += dy; else G.downM -= dy;
              G.walkK += ownWalkK; G.climbK += ownClimbK;
            }
            if (cy) { G.carryWalkK += cy.walkK; G.carryClimbK += cy.climbK; G.carryWalkM += cy.dM; G.carryUpM += cy.upM; }
            if (newDecision && isTrip && (p.act !== act || p.target !== c.targetId)) { A.trips++; if (act !== 'caller') { const t = idx.treeById.get(c.targetId); if (t) A.tripD.push(Math.hypot(t.position[0] - p.x, t.position[2] - p.z)); } }
            if (up && !p.up && !carried) { A.ascents++; const by = act === 'crown approach' || act === 'nest' || act === 'care follow' ? act : 'other'; A.ascentsBy[by] = (A.ascentsBy[by] ?? 0) + 1; }
            if (up && !carried) A.ascentM += dy;
            if ((act === 'own trip' || act === 'joined trip') && st === 1 && !newDecision) { A.tripMoveM += dh; A.tripMoveTicks++; A.tripHist[Math.min(HN - 1, Math.floor(dh / TICK_S / HB))]++; }
          }
        }
        // descents: a run of down ticks
        if (p && st === 3 && !p.down) for (const k of ks) R.cls[k].descents++;
        // travel bouts and halts
        const bout = tb.get(c.id);
        if (trav) {
          const b = bout ?? { ticks: 0, halts: 0, haltTicks: 0 };
          b.ticks++;
          if (st === 5) {
            if (!(p?.tbHalt)) { b.halts++; for (const k of ks) { R.cls[k].halts++; if (why >= 0) R.cls[k].haltWhy[why]++; } }
            b.haltTicks++; for (const k of ks) { R.cls[k].haltTicks++; if (why >= 0) R.cls[k].haltWhyTicks[why]++; }
            cur.tbHalt = true;
          }
          tb.set(c.id, b);
        } else if (bout) {
          for (const k of ks) { R.cls[k].tbouts++; R.cls[k].tboutTicks += bout.ticks; }
          tb.delete(c.id);
        }
        prev.set(c.id, cur);
      }
    }
    parseDay();
  } finally { energyTap.fn = null; }
  for (const n of CLS) R.ids[n] = idSets[n].size;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; R.deaths[k] = (R.deaths[k] ?? 0) + 1; }
  R.living[1] = w.chimps.filter(c => c.alive).length;
  return R;
}

function summarize(res: Result[]) {
  const S: Record<string, unknown> = {};
  const byCls: Record<string, unknown> = {};
  for (const n of CLS) {
    const A = blankCls();
    for (const r of res) {
      const a = r.cls[n];
      A.ticks += a.ticks; A.dayTicks += a.dayTicks; A.suckled += a.suckled; A.trips += a.trips; A.tripD.push(...a.tripD); A.crowns += a.crowns; A.ascents += a.ascents; A.ascentM += a.ascentM; A.descents += a.descents;
      for (const [k, v] of Object.entries(a.ascentsBy)) A.ascentsBy[k] = (A.ascentsBy[k] ?? 0) + v;
      A.visitEat.push(...a.visitEat); A.visitLoc.push(...a.visitLoc); A.visitWalkM.push(...a.visitWalkM); A.visitUpM.push(...a.visitUpM);
      A.tbouts += a.tbouts; A.tboutTicks += a.tboutTicks; A.halts += a.halts; A.haltTicks += a.haltTicks;
      for (let i = 0; i < WHY.length; i++) { A.haltWhy[i] += a.haltWhy[i]; A.haltWhyTicks[i] += a.haltWhyTicks[i]; }
      A.tripMoveM += a.tripMoveM; A.tripMoveTicks += a.tripMoveTicks; for (let i = 0; i < HN; i++) A.tripHist[i] += a.tripHist[i];
      for (const [k, v] of Object.entries(a.byAction)) { const b = (A.byAction[k] ??= [0, 0, 0, 0, 0]); for (let i = 0; i < 5; i++) b[i] += v[i]; }
      for (const t of TERMS) A.tap[t] += a.tap[t];
      for (const f of FOODS) A.eaten[f] += a.eaten[f];
      for (const k of ACTS) {
        const g = a.acts[k], G = A.acts[k];
        for (let i = 0; i < STATES.length; i++) { G.t[i] += g.t[i]; G.dayT[i] += g.dayT[i]; }
        G.hM += g.hM; G.walkM += g.walkM; G.upM += g.upM; G.downM += g.downM; G.walkK += g.walkK; G.climbK += g.climbK; G.carryWalkK += g.carryWalkK; G.carryClimbK += g.carryClimbK; G.carryWalkM += g.carryWalkM; G.carryUpM += g.carryUpM;
      }
    }
    const d = A.ticks / DAY; if (!(d > 0)) continue;
    const minPer = (t: number) => t * TICK_HOURS * 60 / d;
    const acts: Record<string, unknown> = {};
    const tot = { walkMin: 0, upMin: 0, downMin: 0, canopyMin: 0, stillMin: 0, carriedMin: 0, walkKm: 0, hKm: 0, upM: 0, downM: 0, walkK: 0, climbK: 0, carryWalkK: 0, carryClimbK: 0 };
    for (const k of ACTS) {
      const G = A.acts[k];
      const row = { min: minPer(G.t.reduce((s, v) => s + v, 0)), dayMin: minPer(G.dayT.reduce((s, v) => s + v, 0)),
        carriedMin: minPer(G.t[0]), walkMin: minPer(G.t[1]), upMin: minPer(G.t[2]), downMin: minPer(G.t[3]), canopyMin: minPer(G.t[4]), stillMin: minPer(G.t[5]),
        walkKm: G.walkM / d / 1000, hKm: G.hM / d / 1000, upM: G.upM / d, downM: G.downM / d, walkK: G.walkK / d, climbK: G.climbK / d, carryWalkK: G.carryWalkK / d, carryClimbK: G.carryClimbK / d, carryWalkKm: G.carryWalkM / d / 1000, carryUpM: G.carryUpM / d };
      acts[k] = row;
      tot.walkMin += row.walkMin; tot.upMin += row.upMin; tot.downMin += row.downMin; tot.canopyMin += row.canopyMin; tot.stillMin += row.stillMin; tot.carriedMin += row.carriedMin;
      tot.walkKm += row.walkKm; tot.hKm += row.hKm; tot.upM += row.upM; tot.downM += row.downM; tot.walkK += row.walkK; tot.climbK += row.climbK; tot.carryWalkK += row.carryWalkK; tot.carryClimbK += row.carryClimbK;
    }
    byCls[n] = {
      individuals: res.reduce((s, r) => s + r.ids[n], 0), animalDays: d, acts, total: tot,
      tap: Object.fromEntries(TERMS.map(t => [t, A.tap[t] / d])), eaten: Object.fromEntries(FOODS.map(f => [f, A.eaten[f] / d])), eatenTotal: FOODS.reduce((s, f) => s + A.eaten[f], 0) / d, suckled: A.suckled / d,
      tripsPerDay: A.trips / d, tripDMedian: pct(A.tripD, 0.5), tripDMean: mean(A.tripD), tripDP90: pct(A.tripD, 0.9),
      crownsPerDay: A.crowns / d, ascentsPerDay: A.ascents / d, ascentsBy: Object.fromEntries(Object.entries(A.ascentsBy).map(([k, v]) => [k, v / d])), ascentMPerDay: A.ascentM / d, meanAscentM: A.ascentM / Math.max(1, A.ascents), descentsPerDay: A.descents / d,
      visit: { n: A.visitLoc.length, eatMean: mean(A.visitEat), eatMedian: pct(A.visitEat, 0.5), locMean: mean(A.visitLoc), locMedian: pct(A.visitLoc, 0.5), walkMMean: mean(A.visitWalkM), walkMMedian: pct(A.visitWalkM, 0.5), upMMean: mean(A.visitUpM) },
      travelBouts: { perDay: A.tbouts / d, minPerBout: A.tboutTicks / Math.max(1, A.tbouts) * TICK_HOURS * 60, haltsPerBout: A.halts / Math.max(1, A.tbouts), haltMinPerBout: A.haltTicks / Math.max(1, A.tbouts) * TICK_HOURS * 60,
        haltMinPerDay: minPer(A.haltTicks), haltMeanMin: A.haltTicks / Math.max(1, A.halts) * TICK_HOURS * 60, stillShare: A.haltTicks / Math.max(1, A.tboutTicks),
        haltWhy: Object.fromEntries(WHY.map((k, i) => [k, A.haltWhy[i] / Math.max(1, A.halts)])), haltWhyMinPerDay: Object.fromEntries(WHY.map((k, i) => [k, minPer(A.haltWhyTicks[i])])) },
      tripSpeed: { mean: A.tripMoveM / Math.max(1, A.tripMoveTicks) / TICK_S, p50: histPct(A.tripHist, 0.5) },
      byAction: Object.fromEntries(Object.entries(A.byAction).map(([k, v]) => [k, { min: v[0] * TICK_HOURS * 60 / d, hKm: v[1] / d / 1000, upM: v[2] / d, walkK: v[3] / d, climbK: v[4] / d }])),
    };
  }
  S.byClass = byCls;
  const ph = res.flatMap(r => r.phases), hl = res.flatMap(r => r.halts20);
  S.phases = Object.fromEntries(['adult male', 'female, lactating', 'female, other', 'female, pregnant'].map(n => {
    const p = ph.filter(q => q.cls === n), h = hl.filter(q => q.cls === n);
    const km = p.reduce((s2, q) => s2 + q.m, 0) / 1000, hrs = p.reduce((s2, q) => s2 + q.min, 0) / 60;
    return [n, { phases: p.length, distMean: p.reduce((s2, q) => s2 + q.m, 0) / Math.max(1, p.length), speedKmhMean: p.reduce((s2, q) => s2 + q.m / 1000 / (q.min / 60), 0) / Math.max(1, p.length),
      speedKmhPooled: km / Math.max(1e-9, hrs), haltsPerDay: h.reduce((s2, q) => s2 + q.n, 0) / Math.max(1, h.length),
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
  console.log(JSON.stringify({ seeds, burnIn, days, wallS: (performance.now() - t0) / 1000 }));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ tool: 'climb-diagnose', seeds, burnIn, days, params, ...S }, null, 1));
}
