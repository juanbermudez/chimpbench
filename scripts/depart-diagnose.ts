// Stage E5f diagnosis (development tool, reads only; docs/staging/e5f-prereg.md §2): what the departure-attempt rules of
// the moving-together stage decide (departPersist: the check `departCheckMin`, the re-launch hold `departRetryMin`, the
// go-alone cap `departPersistMaxMin`), what the initiator and its audience value at each step, and party fission and
// fusion. The world is e-bench's for the same seed and params (createWorld + burn-in + tickWorld) with e-bench's own
// party-follow observer (cohesion-diagnose's: seed 1 + 7919, 'party-larger', lite, 2-min points), so `tpty1` per seed must
// equal e-bench's T-PTY-1 (identity). The taps (execution.ts departTap, rg.ts rgTap, decide.ts rulesTap) read only; the
// counterfactual lists are built with candidates.ts computeCandidates into a scratch array (no rng, no world writes), with
// chimp.sim.tryAt removed for the call and restored at once.
//
// Classes (initiators and animal-days): adult male (≥ 15 y), female lactating, female other (≥ 15 y), adolescent 12–15 y,
// juvenile 5–12 y. Daylight = environment.daylight > 0.1 (as energy-diagnose). Every readout is simulation truth.
//
// Readouts:
//   own trips (every own trip to a tree started, departTap): 'attempt' (started with an audience: own-community animals of
//     12 y or more within partyLinkM, awake; departAudience), 'alone' (started with an audience after the effort's cap:
//     it goes alone), 'free' (no audience). Per animal-day by class; attempts split into first attempts and re-launches
//     (an effort already open: chimp.sim.trySince set) and those from the initiator's own finished nest (tryNest).
//   attempt outcome: 'recruited' (a companion joined its trip or followed it while it checked; minutes to recruitment; the
//     joiner's act and class), 'given-up' (nobody within departCheckMin), 'interrupted' (its act changed during the check
//     for another reason: what it changed to). Success share = recruited ÷ (recruited + given-up + interrupted).
//   effort (the attempts of one initiator from its first attempt to the end: chimp.sim.trySince marks it after the first
//     failure): outcome 'recruited' (at attempt k), 'alone at cap' (departPersistMaxMin decided), 'lapsed' (no re-launch
//     within the cap of its last failure: the next own trip found the effort over), 'audience gone' (its next own trip had
//     no audience), 'open' (window ended), and attempts per effort.
//   re-launch delays: within an effort, attempt k to k+1, start to start (the source's interval between two hoo events of
//     one effort is the comparable reading) and give-up to re-launch; the delay from the last failure to the departure
//     alone at the cap and from the first failure; distribution (n, mean, median, p10, p90, min, max, bins).
//   hold decisions (departRetryMin): every decision point of an initiator while its own trips are held (rules time < tryAt
//     and an audience): the act chosen, and the counterfactual list without the hold (tryAt removed): whether an own trip
//     would be the top published option (score, jitter included; the choice's belief offsets are not drawn: they use
//     world.rng) — "blocked while best" — and its margin over the actual top; the same for the tree just given up (whose
//     finished penalty, a separate rule, applies at the give-up decision). The first decision after give-up (same tick) is
//     reported apart. After the hold ends: the minutes to the first decision point with own trips back on the menu, and
//     whether an own trip is then chosen.
//   values at each step (attempt, give-up decision, go alone at the cap, each hold decision): the initiator's hunger, its
//     relative reserve (ledger reserves ÷ usable store; negative = deficit), gut fill, social need (1 − social); the trip's
//     value (candidate meta raw: every term, continuation terms included, before the jitter) and its believed crop and hours
//     since the tree was seen (E3e belief), the distance; the best other option's value and kind ("stay"); the company it
//     would leave: E5a companyValue (candidates.ts) of each audience member (max and sum) and E5b presentCompany.
//   audience: at each attempt, the audience members' acts (parts) and whether a travel hoo was given (world.calls); at each
//     decision an audience member makes while the attempt is open: whether the joined trip (travel V.TREE, aux = the
//     initiator) and the party follow of the initiator were on its list, their values against its top, what it chose;
//     audience members who made no decision during the attempt ("did not notice or did not decide").
//   timer-free readouts (amendment, prereg §2.2; computed from the per-seed `events` by the table script): every own-trip
//     event of an initiator in time order (attempt and alone with their audience ids, free, recruited, given-up, and
//     'continue': its first decision after an unanswered check kept the same trip, a departure alone); after each
//     unanswered attempt, the initiator's next own-trip event: a re-launch (an attempt sharing an audience member: the
//     source's "same audience"), an attempt to a new audience, a departure alone, a departure with no audience; its delay
//     start to start. `afterCheck`: that first decision (what it chose, whether an own trip was the top option, the values).
//   pairs (cohesion-diagnose's definitions): subjects ≥ 12 y, awake, daylight, 1-min resolution; together = one 50-m chain,
//     apart = not one 90-m chain; joins and splits per subject-day, by the mover's part (own trips split by how they
//     started: free, alone at the cap, recruited attempt), pair time together.
//   deaths by cause; living at start and end.
//
//   pnpm exec tsx scripts/depart-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--workers 2] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { candidateMeta, companyValue, computeCandidates, departAudience, presentCompany, V } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { gutCap, reserveCap } from '../src/sim/energy';
import { departTap } from '../src/sim/execution';
import { paramsOf, type Params } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { awakeInNest, index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, Chimp, World } from '../src/types';
import { runPool } from './lib/pool';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const DAY = Math.round(24 / TICK_HOURS), MIN = Math.round(1 / 60 / TICK_HOURS);
const CLS = ['adult male', 'female, lactating', 'female, other', 'adolescent 12–15 y', 'juvenile 5–12 y'] as const;
type Cls = typeof CLS[number];
const clsOf = (c: Chimp): Cls | null => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other')
  : c.age >= 12 ? 'adolescent 12–15 y' : c.age >= 5 ? 'juvenile 5–12 y' : null;
const PARTS = ['own trip', 'to crown', 'in crown', 'ground forage', 'joined trip', 'follow party', 'to callers', 'drink', 'patrol',
  'home', 'follow mother', 'consort', 'nest', 'groom', 'rest', 'other'] as const;
type Part = typeof PARTS[number];
function partOf(c: Chimp): Part {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'to callers' : x.v === V.HOME ? 'home' : 'other';
    case 'follow': return x.v === V.PARTY ? 'follow party' : x.v === V.MOTHER || x.v === V.JUVENILE ? 'follow mother' : 'other';
    case 'forage': return c.targetId < 0 ? 'ground forage' : x.phase >= 2 ? 'in crown' : 'to crown';
    case 'patrol': return 'patrol';
    case 'consort': return 'consort';
    case 'nest': return 'nest';
    case 'drink': return 'drink';
    case 'groom': return 'groom';
    case 'rest': return 'rest';
    default: return 'other';
  }
}
/** The part of a candidate (as partOf for an act). */
function candPart(k: Candidate): string {
  const m = candidateMeta.get(k), v = m?.v ?? V.NONE, aux = m?.aux ?? -1;
  switch (k.action) {
    case 'travel': return v === V.TREE ? (aux > 0 ? 'joined trip' : 'own trip') : v === V.CALLER ? 'to callers' : v === V.HOME ? 'home' : 'travel other';
    case 'follow': return v === V.PARTY ? 'follow party' : v === V.MOTHER || v === V.JUVENILE ? 'follow mother' : 'follow other';
    case 'forage': return k.targetId < 0 ? 'ground forage' : 'crown';
    default: return k.action;
  }
}
const isOwnTrip = (k: Candidate) => { const m = candidateMeta.get(k); return k.action === 'travel' && m?.v === V.TREE && (m.aux ?? -1) <= 0; };
const rawOf = (k: Candidate) => candidateMeta.get(k)?.raw ?? k.score;
const asleep = (c: Chimp) => c.action === 'nest' && ix(c).phase >= 2;
const inc = (m: Record<string, number>, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };
const fin = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;

/** Union-find partition of `list` by chained distance ≤ link. Returns root per index. */
function chain(list: Chimp[], link: number): number[] {
  const n = list.length, par = Array.from({ length: n }, (_, i) => i), l2 = link * link;
  const find = (i: number): number => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = list[i], b = list[j], dx = a.position[0] - b.position[0], dz = a.position[2] - b.position[2];
    if (dx * dx + dz * dz <= l2) { const ra = find(i), rb = find(j); if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb); }
  }
  return list.map((_, i) => find(i));
}

interface State { hunger: number; relRes: number | null; gut: number | null; social: number }
interface Values { trip: number | null; tripScore: number | null; crop: number | null; seenH: number | null; dist: number | null; stay: number | null; stayKind: string; top: number | null; topKind: string; chosen: number | null; chosenKind: string }
interface Company { max: number; sum: number; present: number }
interface Attempt {
  id: number; cls: Cls; t0: number; day: boolean; hour: number; daylight: number; audience: number; relaunch: boolean; k: number; fromNest: boolean;
  tree: number; aud: number[]; state: State; values: Values | null; company: Company; audParts: Record<string, number>; hoo: boolean;
  outcome: 'recruited' | 'given-up' | 'interrupted' | 'open'; min: number | null; joiner: string; joinerAct: string; switchedTo: string;
  audDecided: number; audJoinOffered: number; audJoined: number; audChose: Record<string, number>; audJoinGap: number[];
}
interface Effort { id: number; cls: Cls; tFirst: number; attempts: number[]; giveUps: number[]; outcome: string; tEnd: number | null; fromNest: boolean; preWindow: boolean }
interface Hold { cls: Cls; day: boolean; first: boolean; sinceFail: number; chosenKind: string; tripTop: boolean; tripMargin: number | null; sameTop: boolean; sameMargin: number | null; state: State; values: Values; company: Company; effortAge: number }
/** An own-trip event of an initiator, in time order (timer-free readouts, computed by the table script). */
interface Ev { i: number; t: number; k: 'attempt' | 'alone' | 'free' | 'recruited' | 'given-up' | 'continue'; aud?: number[]; tree?: number; cls: Cls }
/** The initiator's first decision after an unanswered check: what it chose, and the values then. */
interface AfterCheck { i: number; t: number; cls: Cls; chosenKind: string; sameTrip: boolean; ownTrip: boolean; tripTop: boolean; tripMargin: number | null; state: State; values: Values; company: Company }
interface Result {
  seed: number; tpty1: number | null; events: Ev[]; afterCheck: AfterCheck[]; animalDays: Record<string, number>; dayAnimalDays: Record<string, number>;
  trips: Record<string, Record<string, number>>; attempts: Attempt[]; efforts: Effort[]; holds: Hold[];
  afterHold: { cls: Cls; waitMin: number; chosenKind: string; ownTrip: boolean }[];
  alone: { cls: Cls; sinceFirst: number; sinceLast: number; attempts: number; state: State; values: Values | null; company: Company }[];
  pairs: { joins: number; splits: number; joinBy: Record<string, number>; splitBy: Record<string, number>; pairDaysTogether: number; pairDays: number; subjectDays: number };
  deaths: Record<string, number>; living: [number, number];
}
interface Job { seed: number; burnIn: number; days: number; params: Record<string, number> }

function stateOf(c: Chimp, P: Params): State {
  const L = ix(c).en;
  return { hunger: c.hunger, relRes: L ? L.res / reserveCap(c, P) : null, gut: L ? L.gut / gutCap(c, P) : null, social: 1 - c.social };
}
/** The company `c` would leave: E5a companyValue of each audience member (max, sum) and E5b presentCompany. */
function companyOf(w: World, c: Chimp, P: Params): Company {
  const alive = index(w).alive, l2 = P.partyLinkM * P.partyLinkM;
  let max = 0, sum = 0;
  for (const o of alive) {
    if (o === c || o.troopId !== c.troopId || o.age < 12) continue;
    if (o.action === 'nest' && ix(o).phase >= 2 && !awakeInNest(P, o)) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz > l2) continue;
    const v = companyValue(c, o, P); max = Math.max(max, v); sum += v;
  }
  return { max, sum, present: presentCompany(w, c, P) };
}
function audienceIds(w: World, c: Chimp, P: Params): number[] {
  const alive = index(w).alive, l2 = P.partyLinkM * P.partyLinkM, out: number[] = [];
  for (const o of alive) {
    if (o === c || o.troopId !== c.troopId || o.age < 12) continue;
    if (o.action === 'nest' && ix(o).phase >= 2 && !awakeInNest(P, o)) continue;
    const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
    if (dx * dx + dz * dz <= l2) out.push(o.id);
  }
  return out;
}
/** Values of a decision's list: the chosen option, the best own trip, the best other option, the top. */
function valuesOf(list: Candidate[], chosen: Candidate | undefined): Values {
  let trip: Candidate | undefined, stay: Candidate | undefined, top: Candidate | undefined;
  for (const k of list) {
    if (k.action === 'dead') continue;
    if (!top || k.score > top.score) top = k;
    if (isOwnTrip(k)) { if (!trip || rawOf(k) > rawOf(trip)) trip = k; } else if (!stay || rawOf(k) > rawOf(stay)) stay = k;
  }
  const t = chosen && isOwnTrip(chosen) ? chosen : trip, bel = t ? candidateMeta.get(t)?.bel : undefined;
  return { trip: t ? rawOf(t) : null, tripScore: t ? t.score : null, crop: bel ? bel[1] : null, seenH: bel && Number.isFinite(bel[2]) ? bel[2] : null, dist: bel ? bel[4] : null,
    stay: stay ? rawOf(stay) : null, stayKind: stay ? candPart(stay) : '', top: top ? top.score : null, topKind: top ? candPart(top) : '', chosen: chosen ? chosen.score : null, chosenKind: chosen ? candPart(chosen) : '' };
}

export function runSeed(job: Job): Result {
  const { seed, burnIn, days, params } = job;
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  const pobs = createObserver(w, { seed: 1 + 7919, profile: PROFILES.field, truth: true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const R: Result = { seed, tpty1: null, events: [], afterCheck: [], animalDays: {}, dayAnimalDays: {}, trips: {}, attempts: [], efforts: [], holds: [], afterHold: [], alone: [],
    pairs: { joins: 0, splits: 0, joinBy: {}, splitBy: {}, pairDaysTogether: 0, pairDays: 0, subjectDays: 0 }, deaths: {}, living: [w.chimps.filter(c => c.alive).length, 0] };
  for (const k of CLS) { R.animalDays[k] = 0; R.dayAnimalDays[k] = 0; R.trips[k] = {}; }
  let windowOn = false;
  const day = () => w.environment.daylight > 0.1;
  /** The decision each animal made last (this tick): its list's values and the chosen option. */
  const lastDec = new Map<number, { t: number; values: Values }>();
  const open = new Map<number, Attempt>(), audOf = new Map<number, number[]>(), audSeen = new Map<number, Set<number>>();
  const effort = new Map<number, Effort>();
  const tripStart = new Map<number, string>(); // own trip kind by animal: free / alone / attempt
  const holdEnd = new Map<number, { tryAt: number; cls: Cls }>(); // for the first decision after the hold
  const firstAfterFail = new Set<number>(); // the decision right after a give-up (same tick)
  const pendingCheck = new Map<number, number>(); // initiator → tree of its unanswered attempt, until its next decision
  let nextId = 1;
  const scratch: Candidate[] = [];

  /** A decision of animal c (list best first, the option taken). */
  const onDecision = (c: Chimp, list: Candidate[], chosen: Candidate | undefined) => {
    if (!windowOn) return;
    const x = ix(c), t = w.time, cls = clsOf(c), values = valuesOf(list, chosen);
    lastDec.set(c.id, { t, values });
    // an audience member deciding while an attempt it can see is open
    for (const [iid, a] of open) {
      if (a.outcome !== 'open') continue;
      const aud = audOf.get(iid); if (!aud || !aud.includes(c.id)) continue;
      const seenSet = audSeen.get(iid)!; if (seenSet.has(c.id)) continue;
      seenSet.add(c.id); a.audDecided++;
      let join: Candidate | undefined, top: Candidate | undefined;
      for (const k of list) { if (k.action === 'dead') continue; if (!top || k.score > top.score) top = k; const m = candidateMeta.get(k);
        if ((k.action === 'travel' && m?.v === V.TREE && m.aux === iid) || (k.action === 'follow' && k.targetId === iid && m?.v === V.PARTY)) { if (!join || k.score > join.score) join = k; } }
      if (join) { a.audJoinOffered++; if (top) a.audJoinGap.push(top.score - join.score); }
      const ck = chosen ? candPart(chosen) : 'none'; inc(a.audChose, ck);
      const cm = chosen ? candidateMeta.get(chosen) : undefined;
      if (chosen && ((chosen.action === 'travel' && cm?.v === V.TREE && cm.aux === iid) || (chosen.action === 'follow' && chosen.targetId === iid && cm?.v === V.PARTY))) a.audJoined++;
    }
    if (!cls) return;
    const first = firstAfterFail.has(c.id); firstAfterFail.delete(c.id); // the decision right after a give-up (same tick by day)
    // the initiator's first decision after an unanswered check (same tick under departPersist's give-up; the next tick when
    // the check ends in a decision): continuing the same trip is a departure alone
    const pc = pendingCheck.get(c.id);
    if (pc !== undefined) {
      pendingCheck.delete(c.id);
      const same = !!chosen && chosen.action === 'travel' && chosen.targetId === pc && isOwnTrip(chosen);
      let top: Candidate | undefined, trip: Candidate | undefined;
      for (const k of list) { if (k.action === 'dead') continue; if (!top || k.score > top.score) top = k; if (isOwnTrip(k) && (!trip || k.score > trip.score)) trip = k; }
      R.afterCheck.push({ i: c.id, t, cls, chosenKind: values.chosenKind, sameTrip: same, ownTrip: !!chosen && isOwnTrip(chosen), tripTop: !!trip && trip === top, tripMargin: trip && top ? trip.score - top.score : null, state: stateOf(c, P), values, company: companyOf(w, c, P) });
      if (same && c.action === 'travel' && c.targetId === pc) R.events.push({ i: c.id, t, k: 'continue', tree: pc, cls });
    }
    // the first decision after the hold ended
    const he = holdEnd.get(c.id);
    if (he && t >= he.tryAt) { R.afterHold.push({ cls, waitMin: (t - he.tryAt) * 60, chosenKind: values.chosenKind, ownTrip: !!chosen && isOwnTrip(chosen) }); holdEnd.delete(c.id); }
    // a decision while its own trips are held (candidates.ts `held`)
    const held = P.departPersist === 1 && x.tryAt !== undefined && t < x.tryAt && departAudience(w, c) > 0;
    if (!held) return;
    const keep = x.tryAt!;
    delete x.tryAt;
    const cf = computeCandidates(w, c, scratch);
    x.tryAt = keep;
    let top: Candidate | undefined, trip: Candidate | undefined, same: Candidate | undefined;
    for (const k of list) if (k.action !== 'dead' && (!top || k.score > top.score)) top = k;
    for (const k of cf) { if (!isOwnTrip(k)) continue; if (!trip || k.score > trip.score) trip = k; }
    const ef = effort.get(c.id), lastTree = ef ? (R.attempts.find(a => a.id === ef.attempts[ef.attempts.length - 1])?.tree ?? -1) : -1;
    for (const k of cf) if (isOwnTrip(k) && k.targetId === lastTree) same = k;
    const lastFail = ef && ef.giveUps.length ? ef.giveUps[ef.giveUps.length - 1] : t;
    R.holds.push({ cls, day: day(), first, sinceFail: (t - lastFail) * 60, chosenKind: values.chosenKind,
      tripTop: !!trip && !!top && trip.score > top.score, tripMargin: trip && top ? trip.score - top.score : null,
      sameTop: !!same && !!top && same.score > top.score, sameMargin: same && top ? same.score - top.score : null,
      state: stateOf(c, P), values, company: companyOf(w, c, P), effortAge: ef ? (t - ef.tFirst) * 60 : 0 });
  };
  rulesTap.fn = (c, list) => { if (P.rgOn === 1 && c.age >= P.rgMinAge) return; onDecision(c, list, list[0]); };
  rgTap.fn = (c, list, _menu, _probs, chosen) => onDecision(c, list, chosen);

  departTap.fn = (c, ev, n) => {
    if (!windowOn) return;
    const x = ix(c), t = w.time, cls = clsOf(c);
    if (!cls) return;
    if (ev === 'free' || ev === 'alone' || ev === 'attempt') inc(R.trips[cls], ev === 'attempt' ? (x.trySince !== undefined ? 'relaunch' : 'attempt') : ev);
    if (ev !== 'lapsed') R.events.push(ev === 'attempt' || ev === 'alone' ? { i: c.id, t, k: ev, aud: audienceIds(w, c, P), tree: c.targetId, cls } : { i: c.id, t, k: ev, tree: c.targetId, cls });
    if (ev === 'free' || ev === 'alone') { tripStart.set(c.id, ev); holdEnd.delete(c.id); }
    if (ev === 'free' || ev === 'alone' || ev === 'attempt') {
      // an attempt still open (its initiator chose another trip during the check) ends there
      const prev = open.get(c.id);
      if (prev) { prev.outcome = 'interrupted'; prev.min = (t - prev.t0) * 60; prev.switchedTo = 'another own trip'; open.delete(c.id); }
    }
    const ef = effort.get(c.id);
    if (ev === 'lapsed') { if (ef) { ef.outcome = 'lapsed'; ef.tEnd = t; effort.delete(c.id); } return; }
    if (ev === 'free') { if (ef && x.trySince !== undefined) { ef.outcome = 'audience gone'; ef.tEnd = t; effort.delete(c.id); } return; }
    if (ev === 'alone') {
      const d = lastDec.get(c.id);
      R.alone.push({ cls, sinceFirst: x.trySince !== undefined ? (t - x.trySince) * 60 : NaN, sinceLast: ef && ef.giveUps.length ? (t - ef.giveUps[ef.giveUps.length - 1]) * 60 : NaN,
        attempts: ef ? ef.attempts.length : 0, state: stateOf(c, P), values: d && d.t === t ? d.values : null, company: companyOf(w, c, P) });
      if (ef) { ef.outcome = 'alone at cap'; ef.tEnd = t; effort.delete(c.id); }
      return;
    }
    if (ev === 'attempt') {
      tripStart.set(c.id, 'attempt'); holdEnd.delete(c.id);
      const d = lastDec.get(c.id), relaunch = x.trySince !== undefined;
      let e = ef;
      if (!e || !relaunch) {
        if (e && e.outcome === 'open') { e.outcome = e.giveUps.length ? 'superseded' : 'interrupted'; e.tEnd = t; }
        e = { id: nextId++, cls, tFirst: t, attempts: [], giveUps: [], outcome: 'open', tEnd: null, fromNest: !!x.tryNest, preWindow: relaunch }; effort.set(c.id, e); R.efforts.push(e);
      }
      const aud = audienceIds(w, c, P), parts: Record<string, number> = {};
      for (const id of aud) { const o = index(w).byId.get(id); if (o) inc(parts, partOf(o)); }
      const a: Attempt = { id: nextId++, cls, t0: t, day: day(), hour: w.hour, daylight: w.environment.daylight, audience: n, relaunch, k: e.attempts.length + 1, fromNest: !!x.tryNest,
        tree: c.targetId, aud, state: stateOf(c, P), values: d && d.t === t ? d.values : null, company: companyOf(w, c, P), audParts: parts, hoo: false,
        outcome: 'open', min: null, joiner: '', joinerAct: '', switchedTo: '', audDecided: 0, audJoinOffered: 0, audJoined: 0, audChose: {}, audJoinGap: [] };
      e.attempts.push(a.id); R.attempts.push(a); open.set(c.id, a); audOf.set(c.id, aud); audSeen.set(c.id, new Set());
      return;
    }
    const a = open.get(c.id);
    if (ev === 'recruited') {
      if (a) { a.outcome = 'recruited'; a.min = (t - a.t0) * 60; const o = index(w).byId.get(n); a.joiner = o ? (clsOf(o) ?? 'young') : 'gone'; a.joinerAct = o ? partOf(o) : ''; open.delete(c.id); }
      if (ef) { ef.outcome = 'recruited'; ef.tEnd = t; effort.delete(c.id); }
      tripStart.set(c.id, 'recruited');
      return;
    }
    if (ev === 'given-up') {
      if (a) { a.outcome = 'given-up'; a.min = (t - a.t0) * 60; open.delete(c.id); }
      if (ef) ef.giveUps.push(t);
      holdEnd.set(c.id, { tryAt: t + P.departRetryMin / 60, cls });
      firstAfterFail.add(c.id);
      pendingCheck.set(c.id, c.targetId);
    }
  };

  windowOn = true;
  const ring = new Map<number, [number, number][]>(), pairState = new Map<string, boolean>();
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    observerStep(pobs, w);
    const idx = index(w), alive = idx.alive, t = w.time, d = day();
    // hoos at attempts started this tick; attempts whose initiator changed act during the check
    for (const [iid, a] of open) {
      const c = idx.byId.get(iid);
      if (a.t0 === t) a.hoo = w.calls.some(q => q.kind === 'travel-hoo' && q.callerId === iid && q.time === t);
      if (!c || !c.alive || c.action !== 'travel' || c.targetId !== a.tree || ix(c).tryN === undefined) {
        a.outcome = 'interrupted'; a.min = (t - a.t0) * 60; a.switchedTo = c ? partOf(c) : 'dead'; open.delete(iid);
      }
    }
    for (const c of alive) { const k = clsOf(c); if (k) { R.animalDays[k] += 1 / DAY; if (d) R.dayAnimalDays[k] += 1 / DAY; } }
    // pairs (cohesion-diagnose's definitions), 1-min resolution
    if (w.tick % MIN === 0) {
      for (const c of alive) { const r = ring.get(c.id) ?? []; r.push([c.position[0], c.position[2]]); if (r.length > 6) r.shift(); ring.set(c.id, r); }
      if (d) for (const tr of w.troops) {
        const mem = alive.filter(c => c.troopId === tr.id);
        const r50 = chain(mem, 50), r90 = chain(mem, 90), subj: number[] = [];
        for (let a = 0; a < mem.length; a++) if (mem[a].age >= 12 && !asleep(mem[a])) subj.push(a);
        R.pairs.subjectDays += subj.length / (60 * 24) * 1; // subject-minutes of daylight → subject-days of 24 h, as cohesion-diagnose counts days
        for (let u = 0; u < subj.length; u++) for (let v = u + 1; v < subj.length; v++) {
          const ia = subj[u], ib = subj[v], A = mem[ia], B = mem[ib], key = A.id < B.id ? `${A.id}:${B.id}` : `${B.id}:${A.id}`;
          const tog = r50[ia] === r50[ib], apart = r90[ia] !== r90[ib], was = pairState.get(key);
          R.pairs.pairDays += 1 / (60 * 24); if (tog) R.pairs.pairDaysTogether += 1 / (60 * 24);
          if (was === undefined) { if (tog || apart) pairState.set(key, tog); continue; }
          const disp = (c: Chimp) => { const r = ring.get(c.id)!; const o = r[0]; return Math.hypot(c.position[0] - o[0], c.position[2] - o[1]); };
          const moverPart = (m: Chimp) => { const p = partOf(m); return p === 'own trip' ? `own trip (${tripStart.get(m.id) ?? 'before window'})` : p; };
          if (!was && tog) { const m = disp(A) >= disp(B) ? A : B; R.pairs.joins++; inc(R.pairs.joinBy, moverPart(m)); pairState.set(key, true); }
          else if (was && apart) { const m = disp(A) >= disp(B) ? A : B; R.pairs.splits++; inc(R.pairs.splitBy, moverPart(m)); pairState.set(key, false); }
        }
      }
    }
  }
  rulesTap.fn = null; rgTap.fn = null; departTap.fn = null;
  const prec = finishObserver(pobs, w), pd = derive(prec);
  R.tpty1 = METRICS.find(q => q.id === 'T-PTY-1')!.compute!(pd).value ?? null;
  for (const e of effort.values()) if (e.outcome === 'open' && e.giveUps.length && w.time - e.giveUps[e.giveUps.length - 1] > P.departPersistMaxMin / 60) e.outcome = 'lapsed (window end)';
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) inc(R.deaths, c.causeOfDeath ?? 'unknown');
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
  const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
  const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : NaN; };
  const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
  const dist = (v: number[]) => { const s = v.filter(Number.isFinite); const bins = [2, 4, 6, 8, 10, 13, Infinity], counts = bins.map(() => 0); for (const x of s) counts[bins.findIndex(b => x < b)]++;
    return { n: s.length, mean: r3(mean(s)), median: r3(q(s, 0.5)), p10: r3(q(s, 0.1)), p90: r3(q(s, 0.9)), min: r3(s.length ? Math.min(...s) : NaN), max: r3(s.length ? Math.max(...s) : NaN), bins: Object.fromEntries(bins.map((b, i) => [`<${b}`, counts[i]])) }; };
  const all = <T>(f: (r: Result) => T[]) => res.flatMap(f);
  const out: Record<string, unknown> = { tool: 'depart-diagnose', seeds, burnIn, days, params, tpty1: res.map(r => ({ seed: r.seed, value: r.tpty1 })),
    living: res.map(r => ({ seed: r.seed, start: r.living[0], end: r.living[1], deaths: r.deaths })) };
  // own trips per animal-day by class
  const trips: Record<string, unknown> = {};
  for (const k of CLS) {
    const ad = res.reduce((a, r) => a + r.animalDays[k], 0), tk: Record<string, number> = {};
    for (const r of res) for (const [e, v] of Object.entries(r.trips[k])) inc(tk, e, v);
    trips[k] = { animalDays: r3(ad), perDay: Object.fromEntries(['free', 'attempt', 'relaunch', 'alone'].map(e => [e, r3((tk[e] ?? 0) / Math.max(1e-9, ad))])) };
  }
  out.trips = trips;
  // attempts: outcomes by class, recruitment minutes, values
  const A = all(r => r.attempts);
  const outc = (l: Attempt[]) => { const o: Record<string, number> = {}; for (const a of l) inc(o, a.outcome); const n = l.length; return { n, shares: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r3(v / Math.max(1, n))])) }; };
  const attempts: Record<string, unknown> = { all: outc(A), first: outc(A.filter(a => !a.relaunch)), relaunch: outc(A.filter(a => a.relaunch)), fromNest: outc(A.filter(a => a.fromNest)), night: outc(A.filter(a => !a.day)),
    byClass: Object.fromEntries(CLS.map(k => [k, outc(A.filter(a => a.cls === k))])),
    hooShare: r3(A.filter(a => a.hoo).length / Math.max(1, A.length)), successWithHoo: outc(A.filter(a => a.hoo)), successSilent: outc(A.filter(a => !a.hoo)),
    recruitMin: dist(A.filter(a => a.outcome === 'recruited').map(a => a.min!)), audience: r3(mean(A.map(a => a.audience))),
    joinerAct: (() => { const o: Record<string, number> = {}; for (const a of A) if (a.outcome === 'recruited') inc(o, a.joinerAct); return o; })(),
    switchedTo: (() => { const o: Record<string, number> = {}; for (const a of A) if (a.outcome === 'interrupted') inc(o, a.switchedTo); return o; })(),
    audParts: (() => { const o: Record<string, number> = {}; let n = 0; for (const a of A) for (const [k, v] of Object.entries(a.audParts)) { inc(o, k, v); n += v; } return Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, r3(v / Math.max(1, n))])); })(),
    audDecidedPerAttempt: r3(mean(A.filter(a => a.outcome !== 'open').map(a => a.audDecided))), audDecidedShare: r3(A.reduce((s, a) => s + a.audDecided, 0) / Math.max(1, A.reduce((s, a) => s + a.audience, 0))),
    audJoinOfferedShare: r3(A.reduce((s, a) => s + a.audJoinOffered, 0) / Math.max(1, A.reduce((s, a) => s + a.audDecided, 0))),
    audJoinedShare: r3(A.reduce((s, a) => s + a.audJoined, 0) / Math.max(1, A.reduce((s, a) => s + a.audDecided, 0))),
    audJoinGap: dist(A.flatMap(a => a.audJoinGap)),
    audChose: (() => { const o: Record<string, number> = {}; for (const a of A) for (const [k, v] of Object.entries(a.audChose)) inc(o, k, v); return o; })(),
  };
  const vals = (l: { state: State; values: Values | null; company: Company }[]) => ({ n: l.length, hunger: r3(mean(l.map(a => a.state.hunger))), relRes: r3(mean(l.map(a => a.state.relRes ?? NaN))), gut: r3(mean(l.map(a => a.state.gut ?? NaN))), social: r3(mean(l.map(a => a.state.social))),
    trip: r3(mean(l.map(a => a.values?.trip ?? NaN))), stay: r3(mean(l.map(a => a.values?.stay ?? NaN))), tripMinusStay: r3(mean(l.map(a => (a.values?.trip ?? NaN) - (a.values?.stay ?? NaN)))),
    crop: r3(mean(l.map(a => a.values?.crop ?? NaN))), seenH: r3(q(l.map(a => a.values?.seenH ?? NaN), 0.5)), distM: r3(q(l.map(a => a.values?.dist ?? NaN), 0.5)),
    companyMax: r3(mean(l.map(a => a.company.max))), companySum: r3(mean(l.map(a => a.company.sum))), companyPresent: r3(mean(l.map(a => a.company.present))),
    stayKind: (() => { const o: Record<string, number> = {}; for (const a of l) if (a.values) inc(o, a.values.stayKind); return Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => [k, r3(v / Math.max(1, l.length))])); })() });
  attempts.values = { all: vals(A), recruited: vals(A.filter(a => a.outcome === 'recruited')), givenUp: vals(A.filter(a => a.outcome === 'given-up')) };
  out.attempts = attempts;
  // efforts
  const E = all(r => r.efforts);
  const eo: Record<string, number> = {}; for (const e of E) inc(eo, e.outcome);
  const failed = E.filter(e => e.giveUps.length > 0), fo: Record<string, number> = {}; for (const e of failed) inc(fo, e.outcome);
  out.efforts = { n: E.length, outcome: Object.fromEntries(Object.entries(eo).map(([k, v]) => [k, r3(v / Math.max(1, E.length))])),
    withFailure: { n: failed.length, outcome: Object.fromEntries(Object.entries(fo).map(([k, v]) => [k, r3(v / Math.max(1, failed.length))])) },
    attemptsPerEffort: r3(mean(E.map(e => e.attempts.length))), attemptsPerFailedEffort: r3(mean(failed.map(e => e.attempts.length))),
    effortMinutes: dist(E.filter(e => e.tEnd !== null).map(e => (e.tEnd! - e.tFirst) * 60)) };
  // re-launch delays
  const s2s: number[] = [], g2r: number[] = [];
  for (const r of res) { // attempt ids are per seed
    const byId = new Map(r.attempts.map(a => [a.id, a]));
    for (const e of r.efforts) for (let i = 1; i < e.attempts.length; i++) {
      const a0 = byId.get(e.attempts[i - 1]), a1 = byId.get(e.attempts[i]); if (!a0 || !a1 || a0.outcome !== 'given-up') continue;
      s2s.push((a1.t0 - a0.t0) * 60); g2r.push((a1.t0 - a0.t0) * 60 - (a0.min ?? 0));
    }
  }
  const AL = all(r => r.alone);
  out.relaunch = { startToStart: dist(s2s), giveUpToRelaunch: dist(g2r), aloneSinceFirstFailure: dist(AL.map(a => a.sinceFirst)), aloneSinceLastFailure: dist(AL.map(a => a.sinceLast)) };
  // go alone at the cap
  out.alone = { perDay: Object.fromEntries(CLS.map(k => [k, r3(res.reduce((s, r) => s + (r.trips[k].alone ?? 0), 0) / Math.max(1e-9, res.reduce((s, r) => s + r.animalDays[k], 0)))])),
    values: vals(AL), attemptsBefore: r3(mean(AL.map(a => a.attempts))) };
  // hold decisions (departRetryMin)
  const H = all(r => r.holds);
  const hs = (l: Hold[]) => ({ n: l.length, tripTopShare: r3(l.filter(h => h.tripTop).length / Math.max(1, l.length)), sameTopShare: r3(l.filter(h => h.sameTop).length / Math.max(1, l.length)),
    tripMargin: dist(l.map(h => h.tripMargin ?? NaN)), chosen: (() => { const o: Record<string, number> = {}; for (const h of l) inc(o, h.chosenKind); return Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, r3(v / Math.max(1, l.length))])); })(),
    values: vals(l) });
  const adTot = res.reduce((s, r) => s + CLS.reduce((a, k) => a + r.animalDays[k], 0), 0);
  out.holds = { all: hs(H), atGiveUp: hs(H.filter(h => h.first)), later: hs(H.filter(h => !h.first)), blockedWhileBestPerAnimalDay: r3(H.filter(h => h.tripTop).length / Math.max(1e-9, adTot)),
    byClass: Object.fromEntries(CLS.map(k => [k, hs(H.filter(h => h.cls === k))])) };
  const AH = all(r => r.afterHold);
  out.afterHold = { n: AH.length, waitMin: dist(AH.map(a => a.waitMin)), ownTripShare: r3(AH.filter(a => a.ownTrip).length / Math.max(1, AH.length)),
    chosen: (() => { const o: Record<string, number> = {}; for (const a of AH) inc(o, a.chosenKind); return Object.fromEntries(Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, r3(v / Math.max(1, AH.length))])); })() };
  // pairs
  const pj: Record<string, number> = {}, ps: Record<string, number> = {}; let joins = 0, splits = 0, pdT = 0, pdA = 0, sd = 0;
  for (const r of res) { joins += r.pairs.joins; splits += r.pairs.splits; pdT += r.pairs.pairDaysTogether; pdA += r.pairs.pairDays; sd += r.pairs.subjectDays; for (const [k, v] of Object.entries(r.pairs.joinBy)) inc(pj, k, v); for (const [k, v] of Object.entries(r.pairs.splitBy)) inc(ps, k, v); }
  const subjectDays = res.reduce((s, r) => s + (r.animalDays['adult male'] + r.animalDays['female, lactating'] + r.animalDays['female, other'] + r.animalDays['adolescent 12–15 y']), 0);
  const shares = (m: Record<string, number>, n: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r3(v / Math.max(1, n))]));
  out.pairs = { joinsPerSubjectDay: r3(joins / Math.max(1e-9, subjectDays)), splitsPerSubjectDay: r3(splits / Math.max(1e-9, subjectDays)), joinMoverPart: shares(pj, joins), splitMoverPart: shares(ps, splits), pairTimeTogether: r3(pdT / Math.max(1e-9, pdA)), daylightSubjectDays: r3(sd) };
  console.log(JSON.stringify(out, null, 1));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ ...out, perSeed: res.map(r => ({ seed: r.seed, attempts: r.attempts, efforts: r.efforts, holds: r.holds, afterHold: r.afterHold, alone: r.alone, trips: r.trips, animalDays: r.animalDays, events: r.events, afterCheck: r.afterCheck })) }, (_k, v) => typeof v === 'number' && !Number.isFinite(v) ? null : v));
}
