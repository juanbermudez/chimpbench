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
//   pnpm exec tsx scripts/trip-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json] [--trips f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { candidateMeta, findCandidate, V } from '../src/sim/candidates';
import { rgTap } from '../src/sim/rg';
import { departTap } from '../src/sim/execution';
import { boutRoom, energyTap, fruitKcalPerUnit } from '../src/sim/energy';
import { fruitRate } from '../src/sim/intake';
import { cropTarget, fruitAt } from '../src/sim/phenology';
import { paramsOf } from '../src/sim/params';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), ARRIVE_M = 6, SEEN_CROP = 0.06;
const CLS = ['adult male', 'female, lactating', 'female, other'] as const;
type Cls = typeof CLS[number] | '';
const clsOf = (c: Chimp): Cls => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other') : '';

interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }
interface Sight { t: number; crop: number; tgt: number; cum: number; selfCum: number; fs: number[]; fsCum: number[]; fsRoom: number[]; self: boolean }
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
  /** internal bookkeeping (not written) */
  _cum0?: number; _selfCum0?: number; _fs?: number[]; _fsCum0?: number[]; _tgtS?: number; _cumT0?: number; _fsCumT0?: number[]; _tgtT0?: number; _gaveUpOpen?: boolean; _post?: boolean;
}
interface Result {
  seed: number; trips: Trip[]; clsTicks: Record<string, number>; dep: Record<string, Record<string, number>>;
  male: { ticks: number; eating: number; walked: number }; living: [number, number]; deaths: Record<string, number>;
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
  /** the sightings at a decision point: every fruit tree in view and the tree the animal feeds in */
  const sightAll = (c: Chimp) => {
    const x = ix(c); let m = sights.get(c.id); if (!m) sights.set(c.id, m = new Map());
    const ids = x.trees.slice(); if (c.action === 'forage' && isTreeId(c.targetId) && !ids.includes(c.targetId)) ids.push(c.targetId);
    for (const id of ids) {
      const t = tree(id); if (!t) continue;
      const fs = feedersAt(c, id), byId = idx().byId;
      m.set(id, { t: w.time, crop: fruitAt(w, t), tgt: cropTarget(w, t, w.time), cum: cumOf(id), selfCum: cumByOf(id, c.id), fs, fsCum: fs.map(e => cumByOf(id, e)),
        fsRoom: fs.map(e => roomU(byId.get(e)!)), self: c.action === 'forage' && c.targetId === id && x.phase === 2 });
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
    open.set(c.id, tr);
    return tr;
  };
  const closeTrip = (c: Chimp, post: boolean, why: string, list?: Candidate[], chosen?: Candidate) => {
    const tr = open.get(c.id); if (!tr) return;
    open.delete(c.id); tr._post = post; if (post) execNow.set(c.id, tr);
    tr.t1 = w.time; tr.endWhy = why; tr.fin = ix(c).finished;
    const t = tree(tr.target);
    if (t) {
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
    delete tr._cum0; delete tr._selfCum0; delete tr._gaveUpOpen; delete tr._fs; delete tr._fsCum0; delete tr._tgtS; delete tr._cumT0; delete tr._fsCumT0; delete tr._tgtT0; delete tr._post;
    if (tr.cls && tr.day) R.trips.push(tr);
  };
  energyTap.fn = (c, term, kcal, kind) => {
    if (!trackOn) return;
    if (!windowOn) {
      if (term === 'eaten' && (kind === 'drupe' || kind === 'fig') && c.action === 'forage' && isTreeId(c.targetId)) {
        const tid = c.targetId, u = kcal / unitOf(kind === 'fig');
        cum.set(tid, cumOf(tid) + u); let m = cumBy.get(tid); if (!m) cumBy.set(tid, m = new Map()); m.set(c.id, (m.get(c.id) ?? 0) + u);
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
  for (let i = 0; i < burnIn * DAY; i++) { if (i === Math.max(0, burnIn - 10) * DAY) trackOn = true; tickWorld(w); }
  trackOn = true;
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  R.living[0] = w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (c.alive) actKey.set(c.id, `${c.action}:${c.targetId}`);
  windowOn = true;
  const prevPos = new Map<number, [number, number]>(), prevIn = new Map<number, number>(), maleCls = new Map<number, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    decided.clear(); execNow.clear();
    tickWorld(w);
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
  // the brief's headline numbers
  out.brief = { tripsPerAdultDay: Object.fromEntries(kinds.map(k => [k, (out.byKind as Record<string, ReturnType<typeof tripOf>>)[k].perAdultDay])),
    fedAtTarget: Object.fromEntries(kinds.map(k => [k, (out.byKind as Record<string, ReturnType<typeof tripOf>>)[k].fedAtTarget])), fedAtTargetAll: (out.all as ReturnType<typeof tripOf>).fedAtTarget,
    unfedCauseShare: dist(closed.filter(t => t.outcome !== 'fed at target').map(t => t.cause.startsWith('re-decided') ? 're-decided en route' : t.cause)),
    deliveredOverValued: (out.all as ReturnType<typeof tripOf>).deliveredOverValued };
  return out;
}
