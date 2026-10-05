// Stage E3h diagnosis (development tool, reads only; docs/staging/e3h-prereg.md §2): why trips do not find food. The world
// is e-bench's and energy-diagnose's for the same seed and params (createWorld + burn-in + tickWorld, no observer); the
// taps (rg.ts rgTap, energy.ts energyTap, execution.ts departTap) read only, so the simulation is unchanged. Identity:
// adult males' eating minutes and ground km as energy-diagnose computes them (compare with its JSON of the same world).
//
// Readouts (simulation truth; adults ≥ 15 y, classes adult male, female lactating, female other (pregnant counted as
// other); daylight = environment.daylight > 0.1 at the trip's start; RG animals, so every adult):
//   trip: an act an adult starts at a rules decision (rgTap: a draw, the argmax, a lead or a phase pick; not 'kept' or
//     'arrived') that walks to a crown, and the feeding at that crown that follows it. Kinds:
//       own      travel to a tree (V.TREE) with no leader: the animal's own trip to a crown out of sight. Its belief source
//                (candidates.ts: the crop the valuation used, meta.bel): 'left' (a crop belief x.treeCrop whose last
//                sighting by this animal, below, was while it fed in that crown: written when it left), 'seen' (a crop
//                belief from a sighting), 'nobelief' (a remembered tree with no crop belief: the 0.2 default), 'known'
//                (the community's list, never in its own memory: bel[2] = Infinity). Its departure status (departTap at
//                its start): 'attempt' (companions to leave: an initiation, departPersist), 'alone' (the same companions
//                let an attempt go unanswered: departValue goes alone), 'free' (no audience).
//       view     forage at a fruit tree in view other than the one it feeds in (the walk is inside the forage act).
//       joined   travel to a tree behind a leader (V.TREE, aux = the leader): a companion's trip.
//       caller   travel toward a pant-hoot (V.CALLER); its crown, when the caller was heard feeding in one, is x.jt.
//     The brief's five kinds: remembered crown = own trips not started as an attempt; departure = own trips started as an
//     attempt; crown in view = view; a companion's trip = joined; a caller = caller.
//   episode: from the trip's start to the first rules decision of the animal that chooses neither the trip act nor feeding
//     at the trip's crown (the gate's arrival conversion and an 'ended' draw that picks feeding there both continue it),
//     or an act change made by anything else ('other'), death, or the window's end ('open': censored, left out of shares).
//   fed at the target: fruit eaten at the trip's crown during the episode (energyTap 'eaten', drupe or fig, while the act
//     is forage at that tree). Otherwise the outcome is 'fed elsewhere' (fruit eaten at another crown in the episode) or
//     'not fed', with a cause at the close:
//       departure given up   the trip was an attempt nobody answered (departTap 'given-up') and the decision after it
//                            chose something else;
//       caller stopped short  a caller trip whose act had finished (it stops joinCallStopM from the call point) and whose
//                            next act was not feeding at the caller's crown;
//       arrived, empty       closed within GATE.arriveM (6 m) of the crown with a crop below 0.06 units (not seen as
//                            fruiting: no arrival conversion, no forage option);
//       arrived, crop left   closed within 6 m with 0.06 units or more, not fed;
//       re-decided en route  closed farther than 6 m before the act finished, by the decision's trigger (rg.ts gate:
//                            interrupt, need-bucket, period, max-age, hunt, patrol, light, ended, …);
//       other                an act change not made by the animal's rules decision; death.
//   crop: units of ripe fruit (phenology.ts fruitAt; one unit ≈ 4,031 kcal of drupes on the stack, E3f). b = the crop the
//     trip was valued at (meta.bel[1] for a crown out of sight; the crop seen for a crown in view); E0 = the bout energy it
//     was valued at (intake.ts netRateShare: b ÷ (1 + the feeders counted) in kcal, up to the bout room); c0 = the true crop
//     at the start; c1 = at the close.
//   sighting: at every rules decision of an animal (rgTap; perception runs at decision points), each fruit tree it
//     perceives (x.trees) and the tree it feeds in: the time, the true crop, the cumulative fruit eaten at that tree so far,
//     the animals it sees feeding there (action forage at that tree: departure.ts noteFeeders' set) and whether it feeds
//     there itself. A trip's last sighting of its crown is the latest one before its start. For an own trip with a crop
//     belief, 'match' = the belief equals the crop at that sighting (rounded as perception.ts rounds, ± 0.0015).
//   what ate it: fruit eaten at the trip's crown (units, energyTap ÷ the food's kcal per unit, energy.ts fruitKcalPerUnit)
//     between the last sighting and the close, split into the animals seen feeding there at that sighting, the traveller
//     itself, and others; the phenology's change (cropTarget at the close less at the sighting); the deficit's recovery =
//     c1 − crop at sighting − Δphenology + eaten (the residual of phenology.ts fruitAt's identity; it also absorbs the
//     clamp at 0). The same split over the trip itself (start to close).
//   costs: ground metres while the episode executed (energy-diagnose's step: < 100 m, on the ground), the ledger's walk and
//     climb kcal (energyTap, charged at the next tick's needs for the move just made) and carry kcal (same tick); fruit kcal
//     at the crown, elsewhere, fallback kcal.
//   departures: departTap events per adult-day (attempt, alone, free, recruited, given-up).
//   feeders' fill (for a belief that expects others' eating): for each animal seen feeding at the last sighting of an
//     arrived-empty crown, the units it ate there after the sighting against its bout room then (energy.ts boutRoom at its
//     own rate, in units) and against its rate × the hours to the close.
//
// Stage E3i readouts (docs/staging/e3i-prereg.md §2; reads only, added beside the readouts above, which are unchanged):
//   bouts: every fruit-eating episode at a crown (energyTap 'eaten', drupe or fig, while the act is forage at that tree;
//     ticks of one eater at one crown less than 2.5 ticks apart are one bout): eater, its community, start, end, units.
//     Units eaten by an eater in an interval = its bouts' units prorated by their overlap with the interval.
//   emptying: the eating event that took a crown's crop from ≥ 0.06 to below it (perception's fruiting threshold; the crop
//     after the event from phenology.ts fruitAt, before = after + the units eaten): time and eater.
//   no-eating counterfactual: the crop at time t had nobody eaten at the crown after the sighting at ts, from the lazy crop
//     model's own identity (phenology.ts fruitAt): max(0, cropTarget(t) − (cropTarget(ts) − crop(ts)) · exp(−k (t − ts) / 24)),
//     k = patchRecoverPerDay. An arrived-empty trip whose crown held < 0.06 at the start is 'emptied by eating since the
//     sighting' when this crop at the start is ≥ 0.06, else 'ripening ended since the sighting'.
//   evidence (what the traveller could have known between its sighting ts and its trip's start t0, each at its own decision
//     points, where perception runs; eaters other than the traveller):
//       saw feeding    at a decision point in (ts, t0] the eater was in its view (x.seen) foraging at that crown;
//       saw heading    … the eater in view travelling to that crown (a trip to a tree, or a caller trip to its crown, E3h bit 2);
//       heard pant-hoot  a pant-hoot the eater gave while foraging at that crown, the traveller within its radius at the end
//                      of the tick the call was given (world.calls, the caller's act at the end of that tick);
//       heard travel hoo a travel hoo the eater gave while travelling to that crown, as above;
//       food grunt ≤ 50 m  a food grunt the eater gave while foraging at that crown with the traveller within hearFoodGruntM
//                      (the model gives food grunts but no listener hears them: events.ts pushes only pant-hoots, drums,
//                      alarm hoos, screams and travel hoos);
//       seen feeding at the sighting  E3h's split (the animals feeding there when the traveller last saw the crown);
//       companion at the sighting  in the traveller's view at that sighting, not feeding there, no later evidence;
//       own community, none  /  other community: no evidence.
//     An eater's class is the first that holds, in this order. Also per trip: pant-hoots heard from that crown (any caller),
//     animals seen heading to or feeding at it, in (ts, t0].
//   near the crown: own-community animals of 5 y or more (the traveller excluded) within 100, 300 and 1,000 m of the crown at
//     the sighting (truth); the crown's capacity (maxFruit) and the crop at the sighting.
//   by hours since the sighting: trips with a sighting of their crown before the start, binned by t0 − ts: fed share,
//     believed b, c0, c1 (medians), c0 < 0.06, the no-eating crop at the start < 0.06, units eaten by others in (ts, t0].
//   a joined trip's leader: the leader's last sighting of the goal before the follower's start (its time and crop) and the
//     same no-eating counterfactual from it.
//   option at the close: whether the trip's own candidate (its act and target) was still on the list at the decision that
//     closed it (a trip whose option left the list ends 'ended' at its next decision point, rg.ts gate); a caller trip's hours
//     since the call it walks to (x.joinAt; the caller option lasts 0.3 h, candidates.ts).
//   community stock (daily, at the day's first tick in the window): per community, members, fruit units its members ate
//     the previous day (truth), crowns with ≥ 0.06 units inside its range (95% UD isopleth, foraging.ts's rule) and their
//     total crop (truth), and the list's whole-range expectation (Σ capacity × the species' share in fruit × mean fullness
//     over trees in range, the quantity dailyKnownTrees ranks): the inputs of a prior on others' eating.
//
//   pnpm exec tsx scripts/trip-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json] [--trips f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { rgTap } from '../src/sim/rg';
import { departTap } from '../src/sim/execution';
import { boutRoom, energyTap, fruitKcalPerUnit } from '../src/sim/energy';
import { fruitRate } from '../src/sim/intake';
import { cropTarget, fruitAt, meanFullness } from '../src/sim/phenology';
import { paramsOf } from '../src/sim/params';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { cellAt, gridOf, levels } from '../src/sim/territory';
import { callerCrownOn } from '../src/sim/tripbelief';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, Tree, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), ARRIVE_M = 6, SEEN_CROP = 0.06;
const CLS = ['adult male', 'female, lactating', 'female, other'] as const;
type Cls = typeof CLS[number] | '';
const clsOf = (c: Chimp): Cls => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other') : '';

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Sight { t: number; crop: number; tgt: number; cum: number; selfCum: number; fs: number[]; fsCum: number[]; fsRoom: number[]; self: boolean;
  /** stage E3i: the animals in the traveller's view at the sighting; own-community animals ≥ 5 y within 100, 300, 1,000 m of the crown */
  seen: number[]; near: [number, number, number] }
/** Stage E3i: per trip with a sighting of its crown before the start (header, "Stage E3i readouts"). */
export interface E3i {
  maxFruit: number; near: [number, number, number];
  /** no-eating crop at the start and at the close */
  cNone0: number; cNone1: number;
  /** units eaten at the crown in (ts, t0] by others than the traveller, by evidence class; eaters, own-community eaters */
  eat0: number; eatBy: Record<string, number>; nEat: number; nEatOwn: number;
  /** the emptying event in (ts, t0]: hours after the sighting, hours before the start, the eater's evidence class (null: none) */
  cross: { dS: number; dStart: number; cls: string } | null;
  /** in (ts, t0]: pant-hoots heard from the crown (any caller), animals seen heading to it, seen feeding at it, food grunts given there within 50 m, travel hoos */
  ph: number; heading: number; feeding: number; fg: number; th: number;
}
export interface Trip {
  seed: number; id: number; cid: number; cls: Cls; kind: 'own' | 'view' | 'joined' | 'caller'; src: string; dep: string; why: string; t0: number; day: boolean;
  target: number; d0: number; b: number; fb: number; e0: number; c0: number; hBel: number;
  /** last sighting of the crown by this animal before the start (NaN: none) */
  ts: number; cs: number; ns: number; self: boolean; match: boolean;
  km: number; walkK: number; climbK: number; carryK: number; fruitT: number; fruitO: number; fallK: number;
  conv: boolean; nextAtT: boolean; gaveUp: number; alone: boolean; recruited: boolean;
  t1: number; endWhy: string; fin: boolean; dEnd: number; c1: number; inView: number; feedOpt: number; next: string;
  /** what ate it: since the sighting (S) and over the trip (T): all, the feeders seen at the sighting, the traveller, Δphenology */
  eatS: number; eatSeenS: number; eatSelfS: number; dPhenS: number; eatT: number; eatSeenT: number; dPhenT: number;
  /** feeders seen at the sighting: units each ate there after it, its bout room then (units), its rate × hours to the close (units) */
  fAte: number[]; fRoom: number[]; fRateH: number[];
  outcome: string; cause: string;
  /** stage E3i: evidence and counterfactual for a trip with a sighting (null: none); a joined trip's leader sighting [hours before the start, crop, no-eating crop at the start] */
  e3?: E3i | null; lead?: [number, number, number] | null;
  /** stage E3i: the trip's own option (its candidate's act and target) still on the list at the closing decision (1, 0; −1 no list); a caller trip's hours since the call at the close */
  optOn?: number; callAge?: number; _act?: string; _tid?: number;
  /** internal bookkeeping (not written) */
  _cum0?: number; _selfCum0?: number; _fs?: number[]; _fsCum0?: number[]; _tgtS?: number; _cumT0?: number; _fsCumT0?: number[]; _tgtT0?: number; _gaveUpOpen?: boolean; _post?: boolean;
}
interface Result {
  seed: number; trips: Trip[]; clsTicks: Record<string, number>; dep: Record<string, Record<string, number>>;
  male: { ticks: number; eating: number; walked: number }; living: [number, number]; deaths: Record<string, number>;
  /** stage E3i: community stock per day [troopId, members, fruit units eaten the previous day, crowns ≥ 0.06 in range, their crop, the list's whole-range expectation] */
  stock?: number[][];
}

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  const R: Result = { seed, trips: [], clsTicks: {}, dep: {}, male: { ticks: 0, eating: 0, walked: 0 }, living: [0, 0], deaths: {} };
  const idx = () => index(w);
  const unitOf = (fig: boolean) => fruitKcalPerUnit(P, fig);
  const kcalU = unitOf(false);
  // fruit eaten per tree (units, cumulative over the window) and per tree and eater
  const cum = new Map<number, number>(), cumBy = new Map<number, Map<number, number>>();
  const cumOf = (t: number) => cum.get(t) ?? 0, cumByOf = (t: number, e: number) => cumBy.get(t)?.get(e) ?? 0;
  const sights = new Map<number, Map<number, Sight>>();
  const open = new Map<number, Trip>(), execNow = new Map<number, Trip | null>(), execPrev = new Map<number, Trip | null>();
  let pendNow: Trip[] = [], pendOld: Trip[] = [];
  const decided = new Set<number>(), actKey = new Map<number, string>();
  // sightings and the fruit eaten per tree are tracked from 10 days before the window (crop beliefs last up to
  // memTravelHorizonH, 240 h in the field), trips only in the window
  let windowOn = false, trackOn = false, nTrip = 0;
  const day = () => w.environment.daylight > 0.1;
  const tree = (id: number) => (isTreeId(id) ? idx().treeById.get(id) : undefined);
  const dist = (c: Chimp, id: number) => { const t = tree(id); return t ? Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) : NaN; };
  const feedersAt = (c: Chimp, t: number): number[] => { const out: number[] = []; for (const sid of ix(c).seen) { const o = idx().byId.get(sid); if (o && o.alive && o.action === 'forage' && o.targetId === t) out.push(o.id); } return out; };
  const rateU = (o: Chimp) => fruitRate(o, P).fruitPerH; // units per hour (execution.ts forageTick's rate before the gut cap and vision)
  const roomU = (o: Chimp) => { const R0 = rateU(o) * kcalU; const r = boutRoom(o, P, R0); return Number.isFinite(r) ? r / kcalU : 99; };
  // ---- stage E3i (header, "Stage E3i readouts") ----
  // eating bouts per tree, flat [eater, troop, tStart, tEnd, units]; each eater's open bout [tree, offset]; emptying events
  // per tree, flat [time, eater]; the traveller's perception log per tree, flat [time, other, 0 heading | 1 feeding]; the
  // listener's call log per tree, flat [time, caller, 0 pant-hoot | 1 food grunt ≤ 50 m | 2 travel hoo]
  const bouts = new Map<number, number[]>(), boutOf = new Map<number, [number, number]>(), crosses = new Map<number, number[]>();
  const plog = new Map<number, Map<number, number[]>>(), hlog = new Map<number, Map<number, number[]>>();
  const kRec = P.patchRecoverPerDay, BOUT_GAP = 2.5 * TICK_HOURS, callerCrown = callerCrownOn(P);
  let lastCallId = -1, dayFruit = new Map<number, number>();
  const stock: number[][] = [];
  const push3 = (L: Map<number, Map<number, number[]>>, a: number, tid: number, x0: number, x1: number, x2: number) => {
    let m = L.get(a); if (!m) L.set(a, m = new Map()); let f = m.get(tid); if (!f) m.set(tid, f = []); f.push(x0, x1, x2);
  };
  /** the crown an animal is at or walking to: forage at a tree; a trip to a tree; a caller trip to the caller's crown (E3h bit 2) */
  const goalOf = (o: Chimp): number => {
    if (o.action === 'forage') return isTreeId(o.targetId) ? o.targetId : -1;
    if (o.action !== 'travel') return -1;
    const x = ix(o);
    if (x.v === V.TREE) return isTreeId(o.targetId) ? o.targetId : -1;
    return x.v === V.CALLER && callerCrown && x.jt !== undefined && x.jt > 0 && isTreeId(x.jt) ? x.jt : -1;
  };
  const noteEat = (c: Chimp, tid: number, u: number) => {
    const now = w.time;
    let L = bouts.get(tid); if (!L) bouts.set(tid, L = []);
    const b = boutOf.get(c.id);
    if (b && b[0] === tid && now - L[b[1] + 3] <= BOUT_GAP) { L[b[1] + 3] = now; L[b[1] + 4] += u; }
    else { boutOf.set(c.id, [tid, L.length]); L.push(c.id, c.troopId, now, now, u); }
    const t = tree(tid);
    if (t) { const after = fruitAt(w, t); if (after < SEEN_CROP && after + u >= SEEN_CROP) { let X = crosses.get(tid); if (!X) crosses.set(tid, X = []); X.push(now, c.id); } }
  };
  /** own-community animals of 5 y or more (not `c`) within 100, 300 and 1,000 m of a point */
  const nearOf = (c: Chimp, px: number, pz: number): [number, number, number] => {
    const out: [number, number, number] = [0, 0, 0];
    for (const o of idx().alive) {
      if (o === c || o.troopId !== c.troopId || o.age < 5) continue;
      const d = Math.hypot(o.position[0] - px, o.position[2] - pz);
      if (d <= 1000) { out[2]++; if (d <= 300) { out[1]++; if (d <= 100) out[0]++; } }
    }
    return out;
  };
  /** the calls given this tick (world.calls keeps 10 min; ids grow): pant-hoots and food grunts from a crown, travel hoos to one */
  const scanCalls = () => {
    const byId = idx().byId;
    for (const call of w.calls) {
      if (call.id <= lastCallId) continue;
      lastCallId = call.id;
      const code = call.kind === 'pant-hoot' ? 0 : call.kind === 'food-grunt' ? 1 : call.kind === 'travel-hoo' ? 2 : -1;
      if (code < 0) continue;
      const caller = byId.get(call.callerId); if (!caller || !caller.alive) continue;
      const crown = code === 2 ? (caller.action === 'travel' ? goalOf(caller) : -1) : caller.action === 'forage' && isTreeId(caller.targetId) ? caller.targetId : -1;
      if (crown <= 0) continue;
      const r2 = call.radius * call.radius;
      for (const o of idx().alive) {
        if (o === caller || !clsOf(o)) continue;
        const dx = o.position[0] - call.position[0], dz = o.position[2] - call.position[2];
        if (dx * dx + dz * dz <= r2) push3(hlog, o.id, crown, call.time, caller.id, code);
      }
    }
  };
  /** units each eater (not `self`) ate at `tid` in (a, b], bouts prorated by overlap */
  const eatenIn = (tid: number, a: number, b: number, self: number): Map<number, [number, number]> => {
    const out = new Map<number, [number, number]>(), L = bouts.get(tid);
    if (!L) return out;
    for (let i = 0; i < L.length; i += 5) {
      const e = L[i], t0 = L[i + 2], t1 = L[i + 3], u = L[i + 4];
      if (e === self || t1 <= a || t0 > b) continue;
      const span = t1 - t0, share = span > 0 ? Math.max(0, Math.min(b, t1) - Math.max(a, t0)) / span : 1;
      if (!(share > 0)) continue;
      const q = out.get(e); if (q) q[0] += u * share; else out.set(e, [u * share, L[i + 1]]);
    }
    return out;
  };
  /** the crop at `t1` had nobody eaten at the crown after a sighting (time ts, crop cs, target gs): the lazy model's identity */
  const noEat = (tr: Tree, ts: number, cs: number, gs: number, t1: number) => Math.max(0, cropTarget(w, tr, t1) - (gs - cs) * Math.exp(-kRec * (t1 - ts) / 24));
  /** community stock at the day's first tick (header): the previous day's fruit eaten is written when `write` */
  const dailyStock = (write: boolean) => {
    const g = gridOf(w, P), L = levels(w), full = meanFullness(P);
    const all = new Map<string, number>(), ripe = new Map<string, number>();
    for (const t of w.trees) { all.set(t.species, (all.get(t.species) ?? 0) + 1); if (cropTarget(w, t, w.time) >= SEEN_CROP) ripe.set(t.species, (ripe.get(t.species) ?? 0) + 1); }
    for (const troop of w.troops) {
      const lv = L[troop.id]; if (!lv) continue;
      let n = 0, crop = 0, exp = 0;
      for (const t of w.trees) {
        if (lv[cellAt(g, t.position[0], t.position[2])] > P.udRangeLevel) continue;
        const f = fruitAt(w, t); if (f >= SEEN_CROP) { n++; crop += f; }
        const sh = (ripe.get(t.species) ?? 0) / (all.get(t.species) ?? 1); exp += t.maxFruit * sh * full;
      }
      const members = idx().alive.filter(c => c.troopId === troop.id).length;
      if (write) stock.push([troop.id, members, dayFruit.get(troop.id) ?? 0, n, crop, exp]);
    }
    dayFruit = new Map();
  };
  /** the sightings at a decision point: every fruit tree in view and the tree the animal feeds in */
  const sightAll = (c: Chimp) => {
    const x = ix(c); let m = sights.get(c.id); if (!m) sights.set(c.id, m = new Map());
    const ids = x.trees.slice(); if (c.action === 'forage' && isTreeId(c.targetId) && !ids.includes(c.targetId)) ids.push(c.targetId);
    for (const id of ids) {
      const t = tree(id); if (!t) continue;
      const fs = feedersAt(c, id), byId = idx().byId;
      m.set(id, { t: w.time, crop: fruitAt(w, t), tgt: cropTarget(w, t, w.time), cum: cumOf(id), selfCum: cumByOf(id, c.id), fs, fsCum: fs.map(e => cumByOf(id, e)),
        fsRoom: fs.map(e => roomU(byId.get(e)!)), self: c.action === 'forage' && c.targetId === id && x.phase === 2,
        seen: x.seen.slice(), near: nearOf(c, t.position[0], t.position[2]) });
    }
  };
  const kindOf = (k: Candidate, c: Chimp): Trip['kind'] | null => {
    const m = candidateMeta.get(k);
    if (k.action === 'travel' && m?.v === V.TREE && isTreeId(k.targetId)) return (m.aux ?? -1) > 0 ? 'joined' : 'own';
    if (k.action === 'travel' && m?.v === V.CALLER) return 'caller';
    // a crown in view counts as a trip when the animal stands outside it (beyond its canopy radius and GATE.arriveM)
    if (k.action === 'forage' && isTreeId(k.targetId) && !(c.action === 'forage' && c.targetId === k.targetId)) { const t = tree(k.targetId); return t && dist(c, k.targetId) > Math.max(ARRIVE_M, t.canopy) ? 'view' : null; }
    return null;
  };
  const catOf = (k: Candidate): string => {
    const m = candidateMeta.get(k), v = m?.v ?? V.NONE, aux = m?.aux ?? -1;
    switch (k.action) {
      case 'forage': return isTreeId(k.targetId) ? 'feed-crown' : 'feed-fallback';
      case 'travel': return v === V.TREE ? (aux > 0 ? 'trip-joined' : 'trip-own') : v === V.CALLER ? 'trip-caller' : v === V.HOME ? 'home' : 'travel-other';
      case 'follow': return v === V.PARTY ? 'follow-party' : 'follow-other';
      default: return k.action;
    }
  };
  const openTrip = (c: Chimp, k: Candidate, kind: Trip['kind'], why: string) => {
    const x = ix(c), m = candidateMeta.get(k), bel = m?.bel;
    const target = kind === 'caller' ? (x.jt !== undefined && x.jt > 0 ? x.jt : -1) : k.targetId;
    const t = tree(target), unit = kcalU;
    let b = NaN, fb = 0, hBel = NaN;
    if (bel) { b = bel[1]; hBel = bel[2]; fb = bel[3]; }
    else if (t && (kind === 'view' || x.trees.includes(target))) { b = fruitAt(w, t); fb = feedersAt(c, target).filter(e => e !== c.id).length; }
    else if (t) { b = x.treeCrop?.[target] ?? NaN; }
    let src = '';
    if (kind === 'own') src = bel && !Number.isFinite(bel[2]) ? 'known' : x.treeCrop?.[target] !== undefined ? 'belief' : 'nobelief';
    else if (kind === 'joined' || kind === 'caller') src = t && x.trees.includes(target) ? 'inview' : bel ? (Number.isFinite(bel[2]) ? 'belief' : 'unseen') : t ? 'other' : 'nocrown';
    else src = 'inview';
    const s = t ? sights.get(c.id)?.get(target) : undefined;
    if (kind === 'own' && src === 'belief' && s) src = s.self ? 'left' : 'seen';
    const e0 = Number.isFinite(b) ? Math.min(Math.max(0, b) / (1 + fb) * unit, boutRoom(c, P, fruitRate(c, P).fruitPerH * unit)) : NaN;
    const tr: Trip = { seed, id: nTrip++, cid: c.id, cls: clsOf(c), kind, src, dep: '', why, t0: w.time, day: day(), target, d0: t ? dist(c, target) : NaN, b, fb, e0, c0: t ? fruitAt(w, t) : NaN, hBel,
      ts: s ? s.t : NaN, cs: s ? s.crop : NaN, ns: s ? s.fs.filter(e => e !== c.id).length : -1, self: s ? s.self : false, match: !!s && Number.isFinite(b) && Math.abs(Math.round(s.crop * 1000) / 1000 - b) < 0.0015,
      km: 0, walkK: 0, climbK: 0, carryK: 0, fruitT: 0, fruitO: 0, fallK: 0, conv: false, nextAtT: false, gaveUp: 0, alone: false, recruited: false,
      t1: NaN, endWhy: '', fin: false, dEnd: NaN, c1: NaN, inView: -1, feedOpt: -1, next: '',
      eatS: NaN, eatSeenS: NaN, eatSelfS: NaN, dPhenS: NaN, eatT: NaN, eatSeenT: NaN, dPhenT: NaN, fAte: [], fRoom: [], fRateH: [], outcome: '', cause: '',
      _cum0: s ? s.cum : undefined, _selfCum0: s ? s.selfCum : undefined, _fs: s ? s.fs.filter(e => e !== c.id) : undefined, _fsCum0: s ? s.fs.filter(e => e !== c.id).map(e => cumByOf(target, e)) : undefined, _tgtS: s ? s.tgt : undefined,
      _cumT0: t ? cumOf(target) : undefined, _tgtT0: t ? cropTarget(w, t, w.time) : undefined };
    if (s && tr._fs) { tr._fsCum0 = tr._fs.map(e => s.fsCum[s.fs.indexOf(e)] ?? 0); tr.fRoom = tr._fs.map(e => s.fsRoom[s.fs.indexOf(e)] ?? NaN); }
    if (t && tr._fs) tr._fsCumT0 = tr._fs.map(e => cumByOf(target, e));
    // stage E3i: what the traveller could have known between its sighting and now, and what emptied the crown
    tr.e3 = t && s ? e3iOf(c, t, s) : null;
    tr._act = k.action; tr._tid = k.targetId;
    if (kind === 'joined' && t) { const L = m?.aux ?? -1, ls = L > 0 ? sights.get(L)?.get(target) : undefined; tr.lead = ls ? [w.time - ls.t, ls.crop, noEat(t, ls.t, ls.crop, ls.tgt, w.time)] : null; }
    open.set(c.id, tr);
    return tr;
  };
  /** stage E3i: evidence in (ts, now] at the traveller `c` about the crown `t` it last saw at `s` (header) */
  const e3iOf = (c: Chimp, t: Tree, s: Sight): E3i => {
    const ts = s.t, now = w.time, tid = t.id;
    const P3 = plog.get(c.id)?.get(tid) ?? [], H3 = hlog.get(c.id)?.get(tid) ?? [];
    const saw = new Map<number, number>(), heard = new Map<number, number>(); // other -> best code seen (1 feeding > 0 heading); caller -> bits (1 ph, 2 fg, 4 th)
    const heading = new Set<number>(), feeding = new Set<number>();
    for (let i = 0; i < P3.length; i += 3) { if (P3[i] <= ts || P3[i] > now) continue; const o = P3[i + 1], k = P3[i + 2]; saw.set(o, Math.max(saw.get(o) ?? 0, k)); if (k === 1) feeding.add(o); else heading.add(o); }
    let ph = 0, fg = 0, th = 0;
    for (let i = 0; i < H3.length; i += 3) { if (H3[i] <= ts || H3[i] > now) continue; const o = H3[i + 1], k = H3[i + 2]; heard.set(o, (heard.get(o) ?? 0) | (1 << k)); if (k === 0) ph++; else if (k === 1) fg++; else th++; }
    const classOf = (e: number, troop: number): string => {
      const sv = saw.get(e), hb = heard.get(e) ?? 0;
      if (sv === 1) return 'saw feeding'; if (sv === 0) return 'saw heading';
      if (hb & 1) return 'heard pant-hoot'; if (hb & 4) return 'heard travel hoo'; if (hb & 2) return 'food grunt <= 50 m';
      if (s.fs.includes(e)) return 'seen feeding at the sighting'; if (s.seen.includes(e)) return 'companion at the sighting';
      return troop === c.troopId ? 'own community, none' : 'other community';
    };
    const eat = eatenIn(tid, ts, now, c.id), eatBy: Record<string, number> = {};
    let eat0 = 0, nEatOwn = 0;
    for (const [e, [u, troop]] of eat) { const k = classOf(e, troop); eatBy[k] = (eatBy[k] ?? 0) + u; eat0 += u; if (troop === c.troopId) nEatOwn++; }
    let cross: E3i['cross'] = null;
    const X = crosses.get(tid);
    if (X) for (let i = X.length - 2; i >= 0; i -= 2) { const tx = X[i]; if (tx > now) continue; if (tx <= ts) break; const e = X[i + 1], o = idx().byId.get(e);
      cross = { dS: tx - ts, dStart: now - tx, cls: e === c.id ? 'the traveller' : classOf(e, o ? o.troopId : -1) }; break; }
    return { maxFruit: t.maxFruit, near: s.near, cNone0: noEat(t, ts, s.crop, s.tgt, now), cNone1: NaN, eat0, eatBy, nEat: eat.size, nEatOwn, cross, ph, heading: heading.size, feeding: feeding.size, fg, th };
  };
  const closeTrip = (c: Chimp, post: boolean, why: string, list?: Candidate[], chosen?: Candidate) => {
    const tr = open.get(c.id); if (!tr) return;
    open.delete(c.id); tr._post = post; if (post) execNow.set(c.id, tr);
    tr.t1 = w.time; tr.endWhy = why; tr.fin = ix(c).finished;
    const t = tree(tr.target);
    if (t) {
      if (tr.e3 && tr._tgtS !== undefined) tr.e3.cNone1 = noEat(t, tr.ts, tr.cs, tr._tgtS, w.time); // stage E3i
      tr.dEnd = dist(c, tr.target); tr.c1 = fruitAt(w, t); tr.inView = ix(c).trees.includes(tr.target) ? 1 : 0;
      tr.feedOpt = list ? (findCandidate(list, 'forage', tr.target) ? 1 : 0) : -1;
      const tgt1 = cropTarget(w, t, w.time), cum1 = cumOf(tr.target);
      if (tr._cum0 !== undefined) {
        tr.eatS = cum1 - tr._cum0; tr.eatSelfS = cumByOf(tr.target, c.id) - (tr._selfCum0 ?? 0);
        tr.eatSeenS = (tr._fs ?? []).reduce((a, e, i) => a + cumByOf(tr.target, e) - (tr._fsCum0?.[i] ?? 0), 0);
        tr.fAte = (tr._fs ?? []).map((e, i) => cumByOf(tr.target, e) - (tr._fsCum0?.[i] ?? 0));
        tr.fRateH = (tr._fs ?? []).map(e => { const o = idx().byId.get(e); return o ? rateU(o) * (w.time - tr.ts) : NaN; });
        tr.dPhenS = tgt1 - (tr._tgtS ?? NaN);
      }
      if (tr._cumT0 !== undefined) {
        tr.eatT = cum1 - tr._cumT0; tr.dPhenT = tgt1 - (tr._tgtT0 ?? NaN);
        tr.eatSeenT = (tr._fs ?? []).reduce((a, e, i) => a + cumByOf(tr.target, e) - (tr._fsCumT0?.[i] ?? 0), 0);
      }
    }
    if (chosen) tr.next = catOf(chosen); else tr.next = why;
    tr.optOn = list && tr._act ? (findCandidate(list, tr._act as Candidate['action'], tr._tid!) ? 1 : 0) : -1; // stage E3i
    if (tr.kind === 'caller') tr.callAge = w.time - ix(c).joinAt;
    pendNow.push(tr);
  };
  const settle = (tr: Trip) => {
    tr.outcome = tr.endWhy === 'open' ? 'open' : tr.fruitT > 0 ? 'fed at target' : tr.fruitO > 0 ? 'fed elsewhere' : 'not fed';
    if (tr.outcome === 'fed at target' || tr.outcome === 'open') tr.cause = '';
    else if (tr._gaveUpOpen) tr.cause = 'departure given up';
    else if (tr.endWhy === 'death' || tr.endWhy === 'other') tr.cause = tr.endWhy;
    else if (tr.kind === 'caller' && tr.fin) tr.cause = tr.target > 0 ? 'caller stopped short' : 'caller, no crown';
    else if (tr.target > 0 && tr.dEnd <= ARRIVE_M) tr.cause = tr.c1 < SEEN_CROP ? 'arrived, empty' : 'arrived, crop left';
    else if (tr.fin) tr.cause = 'ended away';
    else tr.cause = `re-decided en route: ${tr.endWhy}`;
    delete tr._act; delete tr._tid;
    delete tr._cum0; delete tr._selfCum0; delete tr._gaveUpOpen; delete tr._fs; delete tr._fsCum0; delete tr._tgtS; delete tr._cumT0; delete tr._fsCumT0; delete tr._tgtT0; delete tr._post;
    if (tr.cls && tr.day) R.trips.push(tr);
  };
  energyTap.fn = (c, term, kcal, kind) => {
    if (!trackOn) return;
    if (!windowOn) {
      if (term === 'eaten' && (kind === 'drupe' || kind === 'fig') && c.action === 'forage' && isTreeId(c.targetId)) {
        const tid = c.targetId, u = kcal / unitOf(kind === 'fig');
        cum.set(tid, cumOf(tid) + u); let m = cumBy.get(tid); if (!m) cumBy.set(tid, m = new Map()); m.set(c.id, (m.get(c.id) ?? 0) + u);
        noteEat(c, tid, u); // stage E3i
      }
      return;
    }
    if (term === 'walk' || term === 'climb') { const tr = execPrev.get(c.id); if (tr) { if (term === 'walk') tr.walkK += kcal; else tr.climbK += kcal; } return; }
    if (term === 'carry') { const tr = execNow.has(c.id) ? execNow.get(c.id) : open.get(c.id); if (tr) tr.carryK += kcal; return; }
    if (term !== 'eaten') return;
    const tr = open.get(c.id);
    if (kind === 'drupe' || kind === 'fig') {
      const tid = c.action === 'forage' && isTreeId(c.targetId) ? c.targetId : -1;
      if (tid > 0) {
        const u = kcal / unitOf(kind === 'fig');
        cum.set(tid, cumOf(tid) + u);
        let m = cumBy.get(tid); if (!m) cumBy.set(tid, m = new Map()); m.set(c.id, (m.get(c.id) ?? 0) + u);
        noteEat(c, tid, u); // stage E3i
        dayFruit.set(c.troopId, (dayFruit.get(c.troopId) ?? 0) + u);
      }
      if (tr) { if (tid > 0 && tid === tr.target) tr.fruitT += kcal; else tr.fruitO += kcal; }
    } else if (kind === 'fallback' && tr) tr.fallK += kcal;
  };
  departTap.fn = (c, ev) => {
    if (!windowOn) return;
    const k = clsOf(c); if (k) { const d = R.dep[k] ??= {}; d[ev] = (d[ev] ?? 0) + 1; }
    const tr = open.get(c.id); if (!tr || tr.kind !== 'own') return;
    if (ev === 'attempt' || ev === 'alone' || ev === 'free') { if (!tr.dep) tr.dep = ev; if (ev === 'alone') tr.alone = true; }
    else if (ev === 'recruited') tr.recruited = true;
    else if (ev === 'given-up') { tr.gaveUp++; tr._gaveUpOpen = true; }
  };
  rgTap.fn = (c, list, _menu, _probs, chosen, why) => {
    if (!trackOn || !c.alive) return;
    sightAll(c);
    // stage E3i: who the animal sees at or heading to a crown at this decision point
    if (clsOf(c)) { const byId = idx().byId; for (const sid of ix(c).seen) { const o = byId.get(sid); if (!o || !o.alive) continue; const g = goalOf(o); if (g > 0) push3(plog, c.id, g, w.time, o.id, o.action === 'forage' ? 1 : 0); } }
    if (!windowOn) return;
    decided.add(c.id);
    const tr = open.get(c.id), x = ix(c);
    if (why === 'kept') return;
    if (why === 'arrived') { if (tr && chosen.action === 'forage' && chosen.targetId === tr.target) tr.conv = true; return; }
    const sw = chosen.action !== c.action || chosen.targetId !== c.targetId;
    if (!sw) { if (tr && tr._gaveUpOpen) { tr._gaveUpOpen = false; tr.alone = true; } return; } // re-chose the act it holds: the episode continues
    if (tr) {
      // a trip whose act ended (or that was stopped) continues into feeding at its crown when that is chosen
      const inTripAct = !(c.action === 'forage' && c.targetId === tr.target);
      if (inTripAct && chosen.action === 'forage' && chosen.targetId === tr.target) { tr.nextAtT = true; tr._gaveUpOpen = false; return; }
      closeTrip(c, x.finished, why, list, chosen);
    }
    const kind = kindOf(chosen, c);
    if (kind && clsOf(c)) openTrip(c, chosen, kind, why);
  };
  for (let i = 0; i < burnIn * DAY; i++) { if (i === Math.max(0, burnIn - 10) * DAY) trackOn = true; tickWorld(w); if (trackOn) scanCalls(); }
  trackOn = true;
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  R.living[0] = w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (c.alive) actKey.set(c.id, `${c.action}:${c.targetId}`);
  windowOn = true;
  const prevPos = new Map<number, [number, number]>(), prevIn = new Map<number, number>(), maleCls = new Map<number, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    decided.clear(); execNow.clear();
    if (i % DAY === 0) dailyStock(i > 0);
    tickWorld(w);
    scanCalls();
    if (i % 240 === 0) for (const c of w.chimps) if (c.alive) maleCls.set(c.id, c.age >= 15 && c.sex === 'male');
    for (const c of w.chimps) {
      const tr0 = open.get(c.id);
      if (!c.alive) { if (tr0) closeTrip(c, true, 'death'); continue; }
      const x = ix(c), key = `${c.action}:${c.targetId}`;
      // an act change not made by the animal's own rules decision closes the episode
      if (tr0 && key !== actKey.get(c.id) && !decided.has(c.id)) {
        const inTrip = (c.action === 'forage' && c.targetId === tr0.target) || (c.action === 'travel' && (c.targetId === tr0.target || tr0.kind === 'caller'));
        if (!inTrip) closeTrip(c, true, 'other');
      }
      actKey.set(c.id, key);
      const k = clsOf(c); if (k) R.clsTicks[k] = (R.clsTicks[k] ?? 0) + 1;
      const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
      const ex = execNow.has(c.id) ? execNow.get(c.id)! : open.get(c.id) ?? null;
      if (ex && step > 0 && step < 100) ex.km += step / 1000;
      execPrev.set(c.id, ex);
      // identity with energy-diagnose (adult males, its class refresh every 240 ticks)
      if (maleCls.get(c.id)) {
        const L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
        R.male.ticks++; R.male.walked += step < 100 ? step : 0; if (din > 1e-9) R.male.eating++;
      }
      prevPos.set(c.id, [c.position[0], c.position[2]]); if (x.en) prevIn.set(c.id, x.en.in);
    }
    for (const tr of pendOld) settle(tr);
    pendOld = pendNow; pendNow = [];
  }
  for (const tr of pendOld) settle(tr);
  for (const tr of pendNow) settle(tr);
  for (const [id, tr] of open) { const c = idx().byId.get(id); if (c) { open.delete(id); tr.t1 = w.time; tr.endWhy = 'open'; settle(tr); } }
  dailyStock(true);
  R.stock = stock;
  rgTap.fn = null; energyTap.fn = null; departTap.fn = null;
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
  const params = JSON.parse(arg('params', '{}')) as Record<string, number>, jsonOut = arg('json', ''), tripsOut = arg('trips', '');
  if (burnIn + days > 90) throw new Error('burn-in + days must stay ≤ 90 (user limit)');
  const jobs: Job[] = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<Job, Result>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const out = summarize(res, { seeds, burnIn, days, params });
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  if (tripsOut) writeFileSync(tripsOut, JSON.stringify(res.flatMap(r => r.trips)));
  const s = out as { maleIdentity: unknown; brief: unknown; living: unknown };
  console.log(JSON.stringify({ maleIdentity: s.maleIdentity, living: s.living }, null, 1));
  console.log(JSON.stringify(s.brief, null, 1));
}

/** The readouts (header) from the per-seed results. */
export function summarize(res: Result[], meta: Record<string, unknown>): Record<string, unknown> {
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const mean = (v: number[]) => { const f = v.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : NaN; };
  const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
  const sum = (v: number[]) => v.filter(Number.isFinite).reduce((a, b) => a + b, 0);
  const out: Record<string, unknown> = { ...meta, living: res.map(r => ({ seed: r.seed, start: r.living[0], end: r.living[1], deaths: r.deaths })) };
  const mt = res.reduce((a, r) => ({ ticks: a.ticks + r.male.ticks, eating: a.eating + r.male.eating, walked: a.walked + r.male.walked }), { ticks: 0, eating: 0, walked: 0 });
  out.maleIdentity = { eatingMin: r3(mt.eating / 4 / (mt.ticks / DAY)), groundKm: r3(mt.walked / 1000 / (mt.ticks / DAY)) };
  const aDays = Object.fromEntries(CLS.map(k => [k, res.reduce((a, r) => a + (r.clsTicks[k] ?? 0), 0) / DAY])) as Record<string, number>;
  const adultDays = CLS.reduce((a, k) => a + aDays[k], 0);
  out.adultDays = r3(adultDays);
  const per = (n: number) => r3(n / Math.max(1e-9, adultDays));
  const dist = (L: string[]) => { const t: Record<string, number> = {}; for (const v of L) t[v] = (t[v] ?? 0) + 1; return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, r3(n / Math.max(1, L.length))])); };
  const all = res.flatMap(r => r.trips), closed = all.filter(t => t.outcome !== 'open');
  const brief = (t: Trip) => t.kind === 'own' ? (t.dep === 'attempt' ? 'departure' : 'remembered crown') : t.kind === 'view' ? 'crown in view' : t.kind === 'joined' ? "a companion's trip" : 'a caller';
  const spent = (t: Trip) => t.walkK + t.climbK + t.carryK;
  const tripOf = (L: Trip[]) => {
    const C = L.filter(t => t.outcome !== 'open'), U = C.filter(t => t.outcome !== 'fed at target');
    const byCause: Record<string, unknown> = {};
    for (const cause of [...new Set(U.map(t => t.cause))].sort()) {
      const K = U.filter(t => t.cause === cause);
      byCause[cause] = { share: r3(K.length / Math.max(1, C.length)), perAdultDay: per(K.length), kmPerTrip: r3(mean(K.map(t => t.km))), kcalPerTrip: r3(mean(K.map(spent))), climbPerTrip: r3(mean(K.map(t => t.climbK))),
        kmPerAdultDay: per(sum(K.map(t => t.km))), kcalPerAdultDay: per(sum(K.map(spent))), e0Mean: r3(mean(K.map(t => t.e0))), minutesMean: r3(mean(K.map(t => (t.t1 - t.t0) * 60))), fedElsewhere: r3(K.filter(t => t.outcome === 'fed elsewhere').length / Math.max(1, K.length)) };
    }
    return { n: L.length, perAdultDay: per(L.length), open: L.length - C.length, fedAtTarget: r3(C.filter(t => t.outcome === 'fed at target').length / Math.max(1, C.length)), outcome: dist(C.map(t => t.outcome)),
      kmPerTrip: r3(mean(C.map(t => t.km))), kcalPerTrip: r3(mean(C.map(spent))), kmPerAdultDay: per(sum(C.map(t => t.km))), climbPerAdultDay: per(sum(C.map(t => t.climbK))),
      d0Median: r3(med(C.map(t => t.d0))), e0Mean: r3(mean(C.map(t => t.e0))), fruitAtTargetPerTrip: r3(mean(C.map(t => t.fruitT))), deliveredOverValued: r3(sum(C.map(t => t.fruitT)) / Math.max(1e-9, sum(C.filter(t => Number.isFinite(t.e0)).map(t => t.e0)))),
      src: dist(L.map(t => t.src)), dep: dist(L.filter(t => t.kind === 'own').map(t => t.dep || 'none')), why: dist(L.map(t => t.why)), unfedCause: byCause };
  };
  const kinds = ['remembered crown', 'departure', 'crown in view', "a companion's trip", 'a caller'];
  out.byKind = Object.fromEntries(kinds.map(k => [k, tripOf(all.filter(t => brief(t) === k))]));
  out.all = tripOf(all);
  out.byKindClass = Object.fromEntries(CLS.map(c => [c, Object.fromEntries(kinds.map(k => { const L = all.filter(t => brief(t) === k && t.cls === c); const C = L.filter(t => t.outcome !== 'open');
    return [k, { perClassDay: r3(L.length / Math.max(1e-9, aDays[c])), fedAtTarget: r3(C.filter(t => t.outcome === 'fed at target').length / Math.max(1, C.length)) }]; }))]));
  out.ownBySource = Object.fromEntries(['left', 'seen', 'belief', 'nobelief', 'known'].map(s => [s, tripOf(all.filter(t => t.kind === 'own' && t.src === s))]));
  out.ownByDeparture = Object.fromEntries(['attempt', 'alone', 'free', ''].map(s => [s || 'none', tripOf(all.filter(t => t.kind === 'own' && t.dep === s))]));
  out.ownAttemptsAfter = (() => { const A = closed.filter(t => t.kind === 'own' && t.dep === 'attempt'); return { n: A.length, recruited: r3(A.filter(t => t.recruited).length / Math.max(1, A.length)), gaveUp: r3(A.filter(t => t.gaveUp > 0).length / Math.max(1, A.length)), continuedAlone: r3(A.filter(t => t.alone).length / Math.max(1, A.length)) }; })();
  // the crop believed, at the start and on arrival, for trips that reached their crown (within 6 m at the close)
  const arr = closed.filter(t => t.target > 0 && t.dEnd <= ARRIVE_M);
  const cropOf = (L: Trip[]) => ({ n: L.length, bMedian: r3(med(L.map(t => t.b))), bMean: r3(mean(L.map(t => t.b))), c0Median: r3(med(L.map(t => t.c0))), c0Mean: r3(mean(L.map(t => t.c0))), c1Median: r3(med(L.map(t => t.c1))), c1Mean: r3(mean(L.map(t => t.c1))),
    c0BelowSeen: r3(L.filter(t => t.c0 < SEEN_CROP).length / Math.max(1, L.length)), c1BelowSeen: r3(L.filter(t => t.c1 < SEEN_CROP).length / Math.max(1, L.length)), hBelMedian: r3(med(L.map(t => t.hBel))), hSightMedian: r3(med(L.map(t => (t.t0 - t.ts)))) });
  out.cropArrived = Object.fromEntries(kinds.map(k => [k, cropOf(arr.filter(t => brief(t) === k))]));
  out.cropArrivedOwnBySource = Object.fromEntries(['left', 'seen', 'belief', 'nobelief', 'known'].map(s => [s, cropOf(arr.filter(t => t.kind === 'own' && t.src === s))]));
  // what ate it: arrived-empty trips with a sighting, split into empty already at the start (c0 < 0.06) and emptied during the trip
  const empty = closed.filter(t => t.cause === 'arrived, empty');
  const ateOf = (L: Trip[]) => {
    const S = L.filter(t => Number.isFinite(t.eatS));
    const cs = sum(S.map(t => t.cs)), c1 = sum(S.map(t => t.c1)), eat = sum(S.map(t => t.eatS)), seen = sum(S.map(t => t.eatSeenS)), self = sum(S.map(t => t.eatSelfS)), ph = sum(S.map(t => t.dPhenS));
    const rec = c1 - cs - ph + eat;
    return { n: L.length, withSighting: S.length, hSightMedian: r3(med(S.map(t => t.t0 - t.ts))), hSightToCloseMedian: r3(med(S.map(t => t.t1 - t.ts))), feedersSeenMean: r3(mean(S.map(t => t.ns))), feedersSeenAny: r3(S.filter(t => t.ns > 0).length / Math.max(1, S.length)),
      selfAtSighting: r3(S.filter(t => t.self).length / Math.max(1, S.length)), beliefMatchesSighting: r3(S.filter(t => t.match).length / Math.max(1, S.length)),
      unitsPerTrip: { cropAtSighting: r3(cs / Math.max(1, S.length)), cropAtClose: r3(c1 / Math.max(1, S.length)), eaten: r3(eat / Math.max(1, S.length)), eatenBySeenFeeders: r3(seen / Math.max(1, S.length)), eatenBySelf: r3(self / Math.max(1, S.length)), eatenByOthers: r3((eat - seen - self) / Math.max(1, S.length)), phenology: r3(ph / Math.max(1, S.length)), recovered: r3(rec / Math.max(1, S.length)) },
      shareOfLoss: (() => { const loss = cs - c1; return loss > 0 ? { seenFeeders: r3(seen / loss), others: r3((eat - seen - self) / loss), self: r3(self / loss), phenology: r3(-ph / loss), recovered: r3(-rec / loss) } : null; })(),
      overTrip: { eaten: r3(mean(S.map(t => t.eatT))), eatenBySeenFeeders: r3(mean(S.map(t => t.eatSeenT))), phenology: r3(mean(S.map(t => t.dPhenT))) } };
  };
  out.whatAteIt = { all: ateOf(empty), emptyAtStart: ateOf(empty.filter(t => t.c0 < SEEN_CROP)), emptiedDuringTrip: ateOf(empty.filter(t => t.c0 >= SEEN_CROP)),
    byKind: Object.fromEntries(kinds.map(k => [k, ateOf(empty.filter(t => brief(t) === k))])), ownBySource: Object.fromEntries(['left', 'seen', 'nobelief', 'known'].map(s => [s, ateOf(empty.filter(t => t.kind === 'own' && t.src === s))])) };
  // the feeders seen at an arrived-empty crown's sighting: units each ate after it against its bout room then and its rate × hours
  { const F = empty.flatMap(t => t.fAte.map((a, i) => ({ a, room: t.fRoom[i], rh: t.fRateH[i] })));
    out.seenFeeders = { n: F.length, ateMean: r3(mean(F.map(f => f.a))), roomMean: r3(mean(F.map(f => f.room))), rateHoursMean: r3(mean(F.map(f => f.rh))), ateOverRoomMedian: r3(med(F.map(f => f.a / f.room))), ateOverRateHoursMedian: r3(med(F.map(f => f.a / f.rh))) }; }
  // caller trips: where they end
  { const C = closed.filter(t => t.kind === 'caller');
    out.callers = { n: C.length, withCrown: r3(C.filter(t => t.target > 0).length / Math.max(1, C.length)), fedAtCrown: r3(C.filter(t => t.outcome === 'fed at target').length / Math.max(1, C.filter(t => t.target > 0).length)),
      finished: r3(C.filter(t => t.fin).length / Math.max(1, C.length)), dEndToCrownMedian: r3(med(C.filter(t => t.target > 0 && t.fin).map(t => t.dEnd))), crownInViewAtEnd: r3(C.filter(t => t.target > 0 && t.fin && t.inView === 1).length / Math.max(1, C.filter(t => t.target > 0 && t.fin).length)),
      feedOptionAtEnd: r3(C.filter(t => t.target > 0 && t.fin && t.feedOpt === 1).length / Math.max(1, C.filter(t => t.target > 0 && t.fin).length)), cropAtEndMedian: r3(med(C.filter(t => t.target > 0 && t.fin).map(t => t.c1))),
      nextWhenStoppedShort: dist(C.filter(t => t.cause === 'caller stopped short').map(t => t.next)) }; }
  // every unfed cause, all kinds together: trips, km and kcal per adult-day
  { const U = closed.filter(t => t.outcome !== 'fed at target'), co = (t: Trip) => t.cause.startsWith('re-decided') ? 're-decided en route' : t.cause;
    out.unfedAll = Object.fromEntries([...new Set(U.map(co))].sort().map(cause => { const K = U.filter(t => co(t) === cause);
      return [cause, { perAdultDay: per(K.length), shareOfUnfed: r3(K.length / Math.max(1, U.length)), kmPerAdultDay: per(sum(K.map(t => t.km))), kcalPerAdultDay: per(sum(K.map(spent))), climbPerAdultDay: per(sum(K.map(t => t.climbK))), byKind: dist(K.map(brief)) }]; }));
    out.tripCostsPerAdultDay = { km: per(sum(closed.map(t => t.km))), kcal: per(sum(closed.map(spent))), kmUnfed: per(sum(U.map(t => t.km))), kcalUnfed: per(sum(U.map(spent))) }; }
  // the believed crop below perception's fruiting threshold (0.06): a crown the animal cannot feed in on arrival (no forage option)
  { const B = closed.filter(t => t.kind !== 'view' && Number.isFinite(t.b)), lo = B.filter(t => t.b < SEEN_CROP);
    out.beliefBelowSeen = { share: r3(lo.length / Math.max(1, B.length)), perAdultDay: per(lo.length), fedAtTarget: r3(lo.filter(t => t.outcome === 'fed at target').length / Math.max(1, lo.length)), byKind: dist(lo.map(brief)), bySource: dist(lo.map(t => t.src)),
      kmPerAdultDay: per(sum(lo.map(t => t.km))), kcalPerAdultDay: per(sum(lo.map(spent))) }; }
  // the community's known trees (C7a list): the same animal going back to a known tree it reached empty
  { const K = closed.filter(t => t.kind === 'own' && t.src === 'known').sort((a, b) => a.t0 - b.t0), g = new Map<string, Trip[]>();
    for (const t of K) { const k = `${t.seed}:${t.cid}:${t.target}`; const L = g.get(k); if (L) L.push(t); else g.set(k, [t]); }
    const gaps: number[] = []; let again = 0;
    for (const L of g.values()) for (let i = 1; i < L.length; i++) if (L.slice(0, i).some(p => p.cause === 'arrived, empty')) { again++; const p = [...L.slice(0, i)].reverse().find(q => q.cause === 'arrived, empty')!; gaps.push(L[i].t0 - p.t1); }
    out.knownTrees = { trips: K.length, perAdultDay: per(K.length), shareOfOwn: r3(K.length / Math.max(1, closed.filter(t => t.kind === 'own').length)), pairs: g.size, tripsPerPair: r3(K.length / Math.max(1, g.size)),
      fedAtTarget: r3(K.filter(t => t.outcome === 'fed at target').length / Math.max(1, K.length)), cropBelowSeenAtStart: r3(K.filter(t => t.c0 < SEEN_CROP).length / Math.max(1, K.length)),
      afterFoundEmpty: { trips: again, share: r3(again / Math.max(1, K.length)), hoursMedian: r3(med(gaps)) } }; }
  // departures (departTap events) per adult-day
  const dep: Record<string, number> = {};
  for (const r of res) for (const k of Object.keys(r.dep)) for (const [e, n] of Object.entries(r.dep[k])) dep[e] = (dep[e] ?? 0) + n;
  out.departEventsPerAdultDay = Object.fromEntries(Object.entries(dep).map(([e, n]) => [e, per(n)]));
  // ---- stage E3i (header, "Stage E3i readouts") ----
  {
    const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
    const anyEv = (t: Trip) => !!t.e3 && (t.e3.ph > 0 || t.e3.heading > 0 || t.e3.feeding > 0 || t.e3.th > 0 || t.e3.fg > 0);
    const EV = ['saw feeding', 'saw heading', 'heard pant-hoot', 'heard travel hoo', 'food grunt <= 50 m', 'seen feeding at the sighting', 'companion at the sighting', 'own community, none', 'other community'];
    const e3cause = (t: Trip): string => {
      if (t.outcome === 'fed at target') return 'fed at target';
      if (t.cause !== 'arrived, empty') return t.cause.startsWith('re-decided') ? 're-decided en route' : t.cause;
      if (!(t.c0 < SEEN_CROP)) return 'arrived empty: emptied during the trip';
      if (!t.e3) return t.kind === 'own' && t.src === 'known' ? 'arrived empty: no sighting, the list' : t.kind === 'joined' ? 'arrived empty: no sighting, a companion\'s goal' : 'arrived empty: no sighting, other';
      return t.e3.cNone0 >= SEEN_CROP ? 'arrived empty: emptied by eating since the sighting' : 'arrived empty: ripening ended since the sighting';
    };
    const U = closed.filter(t => t.outcome !== 'fed at target');
    const comp = (L: Trip[]) => Object.fromEntries([...new Set(L.map(e3cause))].sort().map(k => { const K = L.filter(t => e3cause(t) === k);
      return [k, { perAdultDay: per(K.length), shareOfUnfed: r3(K.length / Math.max(1, U.length)), shareOfClosed: r3(K.length / Math.max(1, closed.length)), kmPerAdultDay: per(sum(K.map(t => t.km))),
        walkKcalPerAdultDay: per(sum(K.map(t => t.walkK))), climbKcalPerAdultDay: per(sum(K.map(t => t.climbK))), byKind: dist(K.map(brief)) }]; }));
    const E = closed.filter(t => e3cause(t) === 'arrived empty: emptied by eating since the sighting');
    const F = closed.filter(t => t.outcome === 'fed at target' && t.e3 && t.kind !== 'view');
    const profile = (L: Trip[]) => {
      const eat = sum(L.map(t => t.e3!.eat0)), by: Record<string, number> = {};
      for (const k of EV) by[k] = r3(sum(L.map(t => t.e3!.eatBy[k] ?? 0)) / Math.max(1e-9, eat));
      return { n: L.length, perAdultDay: per(L.length), byKind: dist(L.map(t => t.kind === 'own' ? `own, ${t.src}` : t.kind)),
        hSightToStart: [r3(q(L.map(t => t.t0 - t.ts), 0.25)), r3(q(L.map(t => t.t0 - t.ts), 0.5)), r3(q(L.map(t => t.t0 - t.ts), 0.75))],
        cropAtSightingMedian: r3(med(L.map(t => t.cs))), maxFruitMedian: r3(med(L.map(t => t.e3!.maxFruit))), cNone0Median: r3(med(L.map(t => t.e3!.cNone0))),
        near100Mean: r3(mean(L.map(t => t.e3!.near[0]))), near300Mean: r3(mean(L.map(t => t.e3!.near[1]))), near1000Mean: r3(mean(L.map(t => t.e3!.near[2]))),
        eatenOthersPerTrip: r3(eat / Math.max(1, L.length)), eatenShareByEvidence: by, eatersMean: r3(mean(L.map(t => t.e3!.nEat))), ownEatersMean: r3(mean(L.map(t => t.e3!.nEatOwn))),
        evidenceAny: r3(L.filter(anyEv).length / Math.max(1, L.length)), evidencePantHoot: r3(L.filter(t => t.e3!.ph > 0).length / Math.max(1, L.length)),
        evidenceSawHeading: r3(L.filter(t => t.e3!.heading > 0).length / Math.max(1, L.length)), evidenceSawFeeding: r3(L.filter(t => t.e3!.feeding > 0).length / Math.max(1, L.length)),
        evidenceTravelHoo: r3(L.filter(t => t.e3!.th > 0).length / Math.max(1, L.length)), evidenceFoodGrunt50m: r3(L.filter(t => t.e3!.fg > 0).length / Math.max(1, L.length)),
        emptier: dist(L.filter(t => t.e3!.cross).map(t => t.e3!.cross!.cls)), withEmptier: r3(L.filter(t => t.e3!.cross).length / Math.max(1, L.length)),
        hSightToEmptied: r3(med(L.filter(t => t.e3!.cross).map(t => t.e3!.cross!.dS))), hEmptiedToStart: r3(med(L.filter(t => t.e3!.cross).map(t => t.e3!.cross!.dStart))),
        kmPerAdultDay: per(sum(L.map(t => t.km))), walkKcalPerAdultDay: per(sum(L.map(t => t.walkK))), climbKcalPerAdultDay: per(sum(L.map(t => t.climbK))),
        kmPerAdultDayWithEvidence: per(sum(L.filter(anyEv).map(t => t.km))), kmPerAdultDayNoEvidence: per(sum(L.filter(t => !anyEv(t)).map(t => t.km))) };
    };
    const bins = [0, 1, 3, 6, 12, 24, 48, 96, 241];
    const S = closed.filter(t => t.e3 && t.kind !== 'view');
    const byHours = bins.slice(0, -1).map((a, i) => { const b = bins[i + 1], L = S.filter(t => t.t0 - t.ts >= a && t.t0 - t.ts < b);
      return { hours: `${a}-${b}`, n: L.length, perAdultDay: per(L.length), fedAtTarget: r3(L.filter(t => t.outcome === 'fed at target').length / Math.max(1, L.length)),
        bMedian: r3(med(L.map(t => t.b))), csMedian: r3(med(L.map(t => t.cs))), c0Median: r3(med(L.map(t => t.c0))), c1Median: r3(med(L.map(t => t.c1))),
        c0Below: r3(L.filter(t => t.c0 < SEEN_CROP).length / Math.max(1, L.length)), cNone0Below: r3(L.filter(t => t.e3!.cNone0 < SEEN_CROP).length / Math.max(1, L.length)),
        emptiedByEating: r3(L.filter(t => t.c0 < SEEN_CROP && t.e3!.cNone0 >= SEEN_CROP).length / Math.max(1, L.length)), eatenOthersMean: r3(mean(L.map(t => t.e3!.eat0))),
        lossMean: r3(mean(L.map(t => t.cs - t.c0))), evidenceAny: r3(L.filter(anyEv).length / Math.max(1, L.length)) }; });
    const J = closed.filter(t => t.kind === 'joined' && t.cause === 'arrived, empty' && t.c0 < SEEN_CROP);
    const jl = J.filter(t => t.lead);
    const stockBy: Record<string, unknown> = {};
    for (const troop of [...new Set(res.flatMap(r => (r.stock ?? []).map(s => s[0])))].sort()) {
      const rows = res.flatMap(r => (r.stock ?? []).filter(s => s[0] === troop));
      const Fd = mean(rows.map(s => s[2])), Sc = mean(rows.map(s => s[4]));
      stockBy[String(troop)] = { days: rows.length, members: r3(mean(rows.map(s => s[1]))), fruitUnitsPerDay: r3(Fd), crownsRipe: r3(mean(rows.map(s => s[3]))), ripeCrop: r3(Sc), listExpectation: r3(mean(rows.map(s => s[5]))), eatenOverStockPerDay: r3(Fd / Math.max(1e-9, Sc)) };
    }
    out.e3i = { unfedComposition: comp(closed.filter(t => t.outcome !== 'fed at target')), emptiedByEating: profile(E), fedWithSighting: profile(F), byHours,
      joinedArrivedEmpty: { n: J.length, withLeaderSighting: r3(jl.length / Math.max(1, J.length)), leaderHoursMedian: r3(med(jl.map(t => t.lead![0]))),
        emptiedByEatingSinceLeaderSighting: r3(jl.filter(t => t.lead![2] >= SEEN_CROP).length / Math.max(1, jl.length)), withOwnSighting: r3(J.filter(t => t.e3).length / Math.max(1, J.length)) },
      stock: stockBy };
  }
  // the brief's headline numbers
  out.brief = { tripsPerAdultDay: Object.fromEntries(kinds.map(k => [k, (out.byKind as Record<string, ReturnType<typeof tripOf>>)[k].perAdultDay])),
    fedAtTarget: Object.fromEntries(kinds.map(k => [k, (out.byKind as Record<string, ReturnType<typeof tripOf>>)[k].fedAtTarget])), fedAtTargetAll: (out.all as ReturnType<typeof tripOf>).fedAtTarget,
    unfedCauseShare: dist(closed.filter(t => t.outcome !== 'fed at target').map(t => t.cause.startsWith('re-decided') ? 're-decided en route' : t.cause)),
    deliveredOverValued: (out.all as ReturnType<typeof tripOf>).deliveredOverValued };
  return out;
}
