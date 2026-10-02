// Stage E4g diagnosis (development tool, simulation truth; docs/staging/e4g-prereg.md §2): which part of the walking
// value-based calls add. Reads only; the world is e-bench's for the same seed and params (createWorld + tickWorld, as
// scripts/ranging-diagnose.ts and scripts/energy-diagnose.ts).
//
// Classes (ranging-diagnose's and energy-diagnose's ages): adult male (≥ 15 y), adult female (≥ 15 y, pooled), lactating,
// female other (adult, not lactating), adolescent 12–15 y, juvenile 5–12 y.
//
// Truth, per class, per chimp-day:
//   path (km/day; steps longer than 2·runMps·tick + 2 m are teleports and skipped) by part of the act being executed
//   (ranging-diagnose's parts plus 'follow mother') and by purpose: food (own trip, to crown, in crown, ground forage),
//   party (joined trip, follow party), callers (travel to a heard pant-hoot, V.CALLER), water (drink), patrol, other;
//   locomotion kcal (walk + climb + carry, energyTap) by purpose.
//   Step 1b (e4g-prereg §2.3): the 'follow party' path split by what the followed animal (the follow act's target) is
//   doing in the same tick (its part, as above; 'leader gone' if dead or missing) ('followLeaderKmPerDay'); and the
//   'joined trip' path split by its leader's part the same way ('joinedLeaderKmPerDay').
// Approaches (travel to a heard pant-hoot or drum, candidates.ts V.CALLER), by class, from the bout's start to its end:
//   start distance to the call's position; the call: given at food (the listener's joinRich, set when the caller was
//   foraging with a target) or not, and the caller's act when it called; path, minutes and locomotion kcal of the bout;
//   how it ended: at the call's position (within joinCallStopM + 2 m) or abandoned (another act chosen first); the caller
//   within the party link (50 m) at the end; the joiner's party size (community members ≥ 5 y within 50 m) at the start
//   and end; in the 30 min after the end: fed in the caller's crown (the tree it was foraging at when it called), fed in
//   another crown, came within 50 m of the caller; 'nothing' = none of the three.
//   Per call: own-community listeners ≥ 5 y within its radius, and the approaches started to it, by call at food or not.
// Calls: adult-male pant-hoots per awake daylight hour (calls-diagnose's definition: daylight > 0.3, not in a finished
//   nest), counted from the calls emitted each tick (world.calls is a rolling buffer).
// Viability (energy-diagnose's readouts, so one simulation per arm gives every truth readout): each class's mean reserves ÷
//   store at mid-day of every window day (energy-diagnose's `traj`, its classes and its averaging over seeds) and the
//   least-squares slope in % of the store per day (the integrator's slopes.py); births, deaths by cause, living.
// Field readouts (e4g-prereg.md §1.4; reported, never fitted):
//   fedurek2014 (Kanyawara): "instantaneous scan samples at 5-min intervals" of the adult males within 50 m of each adult
//     male while awake in daylight; a change = "one or more males left or joined the party in one scan, compared with
//     the previous scan" (changes per awake hour; field 6.33 per 550-min day ≈ 0.69/h, derived); for each pant-hoot with
//     no other pant-hoot by the caller "within two scans before and two scans after the call", not given while feeding
//     (forage act: feeding or walking into a food patch; "excluded pant hoots given during feeding"), whether males joined
//     (present at a scan, absent at the one before) at the two scans up to the call or the two after it (field 25.27%),
//     or left (10.32%); mean males joining at the two scans after vs the two before (field medians 0.27 vs 0.15).
//   kalanBoesch2015 (Taï): feeding events of adults (entry into the feeding phase in a crown); others' arrival = another
//     own-community animal ≥ 5 y entering the feeding phase in the same crown after the first minute (animals entering
//     within it arrived with the focal and are not arrivals; the share of events with one is reported) and within 30 min,
//     while the focal still feeds there; the share of events with an arrival (field 153 of 557, 27%), split by a
//     pant-hoot or a food grunt by the focal before the first arrival (field: on fruit, both raise arrivals).
//
//   pnpm exec tsx scripts/approach-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}'] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { writeFileSync } from 'node:fs';
import { V } from '../src/sim/candidates';
import { energyTap, reserveCap } from '../src/sim/energy';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { index, isTreeId, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), SCAN = Math.round(5 / 60 / TICK_HOURS), WIN_H = 0.5, MIN_H = 1 / 60;

const CLASSES = ['adult male', 'adult female', 'lactating', 'female other', 'adolescent 12–15 y', 'juvenile 5–12 y'] as const;
type Cls = typeof CLASSES[number];
function classesOf(c: Chimp): Cls[] | null {
  if (!c.alive || c.age < 5) return null;
  if (c.age < 12) return ['juvenile 5–12 y'];
  if (c.age < 15) return ['adolescent 12–15 y'];
  if (c.sex === 'male') return ['adult male'];
  return ['adult female', c.lactating ? 'lactating' : 'female other'];
}
const PARTS = ['own trip', 'to crown', 'in crown', 'ground forage', 'joined trip', 'follow party', 'to callers', 'drink', 'patrol',
  'home', 'follow mother', 'consort', 'nest', 'groom approach', 'play', 'guard', 'other'] as const;
type Part = typeof PARTS[number];
const PURPOSES = ['food', 'party', 'callers', 'water', 'patrol', 'other'] as const;
type Purpose = typeof PURPOSES[number];
const PURPOSE_OF: Record<Part, Purpose> = { 'own trip': 'food', 'to crown': 'food', 'in crown': 'food', 'ground forage': 'food', 'joined trip': 'party', 'follow party': 'party',
  'to callers': 'callers', drink: 'water', patrol: 'patrol', home: 'other', 'follow mother': 'other', consort: 'other', nest: 'other', 'groom approach': 'other', play: 'other', guard: 'other', other: 'other' };
function partOf(c: Chimp): Part {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'to callers' : x.v === V.HOME ? 'home' : 'other';
    case 'follow': return x.v === V.PARTY ? 'follow party' : x.v === V.MOTHER ? 'follow mother' : 'other';
    case 'forage': return c.targetId < 0 ? 'ground forage' : x.phase >= 2 ? 'in crown' : 'to crown';
    case 'patrol': return 'patrol';
    case 'consort': return 'consort';
    case 'nest': return 'nest';
    case 'drink': return 'drink';
    case 'play': return 'play';
    case 'guard': return 'guard';
    case 'groom': return x.phase >= 1 ? 'other' : 'groom approach';
    default: return 'other';
  }
}
const inCrown = (c: Chimp) => c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase === 2;

interface Acc { ticks: number; path: number; parts: Record<Part, number>; bouts: Record<Part, number>; kcal: Record<Purpose, number>; followBy: Record<string, number>; joinedBy: Record<string, number> }
const blankAcc = (): Acc => ({ ticks: 0, path: 0, parts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>, bouts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>,
  kcal: Object.fromEntries(PURPOSES.map(p => [p, 0])) as Record<Purpose, number>, followBy: {}, joinedBy: {} });
const A = Object.fromEntries(CLASSES.map(k => [k, blankAcc()])) as Record<Cls, Acc>;

interface Ap { n: number; atFood: number; d0: number; dBins: number[]; path: number; min: number; kcal: number; atPoint: number; abandoned: number; callerNear: number;
  party0: number; party1: number; fedCaller: number; fedOther: number; metCaller: number; nothing: number; redirected: number; callerAct: Record<string, number> }
const blankAp = (): Ap => ({ n: 0, atFood: 0, d0: 0, dBins: [0, 0, 0, 0], path: 0, min: 0, kcal: 0, atPoint: 0, abandoned: 0, callerNear: 0, party0: 0, party1: 0, fedCaller: 0, fedOther: 0, metCaller: 0, nothing: 0, redirected: 0, callerAct: {} });
const AP = Object.fromEntries(CLASSES.map(k => [k, blankAp()])) as Record<Cls, Ap>;
const APF = { 'at food': blankAp(), 'not at food': blankAp() } as Record<string, Ap>;
const D_BINS = [250, 500, 750];

/** Per call (pant-hoot or drum by a community member): listeners within its radius and approaches started to it. */
const callTab = { 'at food': { calls: 0, listeners: 0, approaches: 0 }, 'not at food': { calls: 0, listeners: 0, approaches: 0 } } as Record<string, { calls: number; listeners: number; approaches: number }>;
let amHoots = 0, amAwakeH = 0, afHoots = 0, afAwakeH = 0;
// fedurek2014 and kalanBoesch2015 readouts
const fed = { changes: 0, scanH: 0, maleDays: 0, calls: 0, isolatedNonFeeding: 0, joined: 0, left: 0, joinBefore: 0, joinAfter: 0 };
const kal = { events: 0, together: 0, arrived: 0, ph: 0, phArrived: 0, fg: 0, fgArrived: 0, none: 0, noneArrived: 0 };
let communityDays = 0;
// energy-diagnose's reserve trajectory classes (pregnant females and adolescents are in none)
const ECLS = ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y'] as const;
const eclsOf = (c: Chimp): string | null => c.age < 5 ? null : c.age < 12 ? 'juvenile 5–12 y' : c.age < 15 ? null : c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : c.pregnancy > 0 ? null : 'female, other';
const traj: Record<string, number[]> = {};
const deaths: Record<string, number> = {};
let births = 0, livingStart = 0, livingEnd = 0;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2, LINK = P.partyLinkM;
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  communityDays += w.troops.length * days;
  const si = seeds.indexOf(seed), births0 = w.stats.births, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  livingStart += w.chimps.filter(c => c.alive).length;
  const px = new Map<number, number>(), pz = new Map<number, number>(), lastPart = new Map<number, Part>();
  /** Calls emitted in the window: the caller, its act and crown when it called, at food (the listener's joinRich rule). */
  const callInfo = new Map<number, { caller: number; tree: number; atFood: boolean; act: string }>();
  interface Bout { cls: Cls[]; t0: number; callId: number; caller: number; atFood: boolean; tree: number; act: string; d0: number; party0: number; path: number; kcal: number }
  const bouts = new Map<number, Bout>();
  interface Watch { id: number; until: number; caller: number; tree: number; fedCaller: boolean; fedOther: boolean; met: boolean; cls: Cls[]; atFood: boolean }
  const watches: Watch[] = [];
  const partySize = (c: Chimp) => { let n = 1; for (const o of index(w).alive) if (o !== c && o.troopId === c.troopId && o.age >= 5 && Math.hypot(o.position[0] - c.position[0], o.position[2] - c.position[2]) <= LINK) n++; return n; };
  // fedurek2014 scans per adult male: time, awake daylight, the adult males within the party link
  const scans = new Map<number, { t: number; ok: boolean; males: number[] }[]>();
  const amCalls: { id: number; t: number; feeding: boolean }[] = [];
  // kalanBoesch2015 feeding events, keyed by focal
  interface Ev { tree: number; t0: number; ph: boolean; fg: boolean; first: number; together: boolean }
  const events = new Map<number, Ev>();
  const closeEvent = (e: Ev) => {
    if (e.together) kal.together++;
    const arr = e.first >= 0 ? 1 : 0;
    kal.events++; kal.arrived += arr;
    if (e.ph) { kal.ph++; kal.phArrived += arr; }
    if (e.fg) { kal.fg++; kal.fgArrived += arr; }
    if (!e.ph && !e.fg) { kal.none++; kal.noneArrived += arr; }
  };

  energyTap.fn = (c, term, kcal) => {
    if (term !== 'walk' && term !== 'climb' && term !== 'carry') return;
    const ks = classesOf(c); if (!ks) return;
    const pu = PURPOSE_OF[partOf(c)];
    for (const k of ks) A[k].kcal[pu] += kcal;
    const b = bouts.get(c.id); if (b && pu === 'callers') b.kcal += kcal;
  };
  let seenCall = w.nextId;
  const prevPhase = new Map<number, number>(), prevAct = new Map<number, string>(), prevTarget = new Map<number, number>();
  for (const c of w.chimps) { prevPhase.set(c.id, ix(c).phase); prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); }
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    const t = w.time, idx = index(w), byId = idx.byId, daylight = w.environment.daylight;
    // calls emitted this tick
    const mine = new Map<number, string[]>();
    for (let k = w.calls.length - 1; k >= 0 && w.calls[k].id >= seenCall; k--) {
      const cl = w.calls[k], caller = byId.get(cl.callerId);
      (mine.get(cl.callerId) ?? mine.set(cl.callerId, []).get(cl.callerId)!).push(cl.kind);
      if (!caller || (cl.kind !== 'pant-hoot' && cl.kind !== 'drum')) continue;
      const atFood = caller.action === 'forage' && caller.targetId > 0;
      callInfo.set(cl.id, { caller: caller.id, tree: caller.action === 'forage' && isTreeId(caller.targetId) ? caller.targetId : -1, atFood,
        act: caller.action === 'forage' ? (isTreeId(caller.targetId) ? (ix(caller).phase === 2 ? 'feeding in a crown' : 'walking into a crown') : 'ground forage') : caller.action });
      let L = 0;
      for (const o of idx.alive) if (o !== caller && o.troopId === caller.troopId && o.age >= 5 && Math.hypot(o.position[0] - caller.position[0], o.position[2] - caller.position[2]) <= cl.radius) L++;
      const ct = callTab[atFood ? 'at food' : 'not at food']; ct.calls++; ct.listeners += L;
      if (cl.kind === 'pant-hoot' && isAdultMale(caller)) amCalls.push({ id: caller.id, t, feeding: (prevAct.get(caller.id) ?? caller.action) === 'forage' || caller.action === 'forage' });
    }
    seenCall = w.nextId;
    const scanTick = w.tick % SCAN === 0;
    for (const c of idx.alive) {
      const x = ix(c), ks = classesOf(c);
      const x0 = c.position[0], z0 = c.position[2], lx = px.get(c.id), lz = pz.get(c.id);
      px.set(c.id, x0); pz.set(c.id, z0);
      const awake = !(c.action === 'nest' && x.phase >= 2) && daylight > 0.3;
      if (isAdultMale(c) && awake) { amAwakeH += TICK_HOURS; amHoots += (mine.get(c.id) ?? []).filter(k => k === 'pant-hoot').length; }
      else if (c.sex === 'female' && c.age >= 15 && awake) { afAwakeH += TICK_HOURS; afHoots += (mine.get(c.id) ?? []).filter(k => k === 'pant-hoot').length; }
      if (isAdultMale(c) && scanTick) {
        const males: number[] = [];
        if (awake) for (const o of idx.alive) if (o !== c && isAdultMale(o) && o.troopId === c.troopId && Math.hypot(o.position[0] - x0, o.position[2] - z0) <= LINK) males.push(o.id);
        (scans.get(c.id) ?? scans.set(c.id, []).get(c.id)!).push({ t, ok: awake, males });
      }
      // kalanBoesch2015: entries into the feeding phase in a crown
      const arrived = inCrown(c) && !(prevPhase.get(c.id) === 2 && prevAct.get(c.id) === 'forage' && prevTarget.get(c.id) === c.targetId);
      if (arrived && c.age >= 5) for (const [fid, e] of events) {
        if (fid === c.id || e.tree !== c.targetId || e.first >= 0) continue;
        const f = byId.get(fid); if (!f || f.troopId !== c.troopId) continue;
        if (t - e.t0 <= MIN_H) e.together = true; else e.first = t;
      }
      if (arrived && c.age >= 15) { const old = events.get(c.id); if (old) closeEvent(old); events.set(c.id, { tree: c.targetId, t0: t, ph: false, fg: false, first: -1, together: false }); }
      const ev = events.get(c.id);
      if (ev) {
        if (!inCrown(c) || c.targetId !== ev.tree || t - ev.t0 > WIN_H) { closeEvent(ev); events.delete(c.id); }
        else if (ev.first < 0) { const k = mine.get(c.id); if (k?.includes('pant-hoot')) ev.ph = true; if (k?.includes('food-grunt')) ev.fg = true; }
      }
      prevPhase.set(c.id, x.phase); prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId);
      if (!ks) continue;
      let d = 0;
      if (lx !== undefined && lz !== undefined) { d = Math.hypot(x0 - lx, z0 - lz); if (d > MAX_STEP) d = 0; }
      const part = partOf(c), started = part !== lastPart.get(c.id);
      lastPart.set(c.id, part);
      for (const k of ks) { const a = A[k]; a.ticks++; a.path += d; a.parts[part] += d; if (started) a.bouts[part]++; }
      if (d > 0 && (part === 'follow party' || part === 'joined trip')) {
        const L = byId.get(part === 'follow party' ? c.targetId : x.aux), lp = L && L.alive ? `leader: ${partOf(L)}` : 'leader gone';
        for (const k of ks) { const m = part === 'follow party' ? A[k].followBy : A[k].joinedBy; m[lp] = (m[lp] ?? 0) + d; }
      }
      // approach bouts
      let b = bouts.get(c.id);
      if (b && (part !== 'to callers' || c.targetId !== b.callId)) {
        const atPoint = Math.hypot(x0 - x.joinX, z0 - x.joinZ) <= P.joinCallStopM + 2;
        const caller = byId.get(b.caller), near = !!caller && caller.alive && Math.hypot(caller.position[0] - x0, caller.position[2] - z0) <= LINK;
        // the walk's goal is the last heard call's position (execution.ts V.CALLER reads x.joinX/joinZ), whoever gave it
        const redirected = x.joinCaller !== b.caller ? 1 : 0, p1 = partySize(c);
        for (const s of [...b.cls.map(k => AP[k]), APF[b.atFood ? 'at food' : 'not at food']]) {
          s.min += (t - b.t0) * 60; s.path += b.path; s.kcal += b.kcal; if (atPoint) s.atPoint++; else s.abandoned++; if (near) s.callerNear++; s.party1 += p1; s.redirected += redirected;
        }
        watches.push({ id: c.id, until: t + WIN_H, caller: b.caller, tree: b.tree, fedCaller: false, fedOther: false, met: near, cls: b.cls, atFood: b.atFood });
        bouts.delete(c.id); b = undefined;
      }
      if (part === 'to callers' && !b) {
        const info = callInfo.get(c.targetId);
        const nb: Bout = { cls: ks, t0: t, callId: c.targetId, caller: info?.caller ?? x.joinCaller, atFood: info ? info.atFood : x.joinRich === 1, tree: info?.tree ?? -1, act: info?.act ?? 'unknown',
          d0: Math.hypot(x0 - x.joinX, z0 - x.joinZ), party0: partySize(c), path: 0, kcal: 0 };
        bouts.set(c.id, nb);
        const bin = nb.d0 <= D_BINS[0] ? 0 : nb.d0 <= D_BINS[1] ? 1 : nb.d0 <= D_BINS[2] ? 2 : 3;
        for (const s of [...ks.map(k => AP[k]), APF[nb.atFood ? 'at food' : 'not at food']]) { s.n++; if (nb.atFood) s.atFood++; s.d0 += nb.d0; s.dBins[bin]++; s.party0 += nb.party0; s.callerAct[nb.act] = (s.callerAct[nb.act] ?? 0) + 1; }
        if (info) callTab[info.atFood ? 'at food' : 'not at food'].approaches++;
      }
      if (b && part === 'to callers') b.path += d;
    }
    if (i % DAY === DAY / 2) for (const n of ECLS) {
      let sum = 0, m = 0;
      for (const c of w.chimps) if (c.alive && eclsOf(c) === n && ix(c).en) { sum += ix(c).en!.res / reserveCap(c, P); m++; }
      const dI = Math.floor(i / DAY);
      (traj[n] ??= [])[dI] = ((traj[n][dI] ?? 0) * si + (m ? sum / m : 0)) / (si + 1);
    }
    // what each finished approach led to in the next 30 min
    for (let k = watches.length - 1; k >= 0; k--) {
      const wt = watches[k], c = byId.get(wt.id);
      if (c && c.alive) {
        if (inCrown(c)) { if (c.targetId === wt.tree) wt.fedCaller = true; else wt.fedOther = true; }
        const caller = byId.get(wt.caller);
        if (caller && caller.alive && Math.hypot(caller.position[0] - c.position[0], caller.position[2] - c.position[2]) <= LINK) wt.met = true;
      }
      if (t >= wt.until || !c || !c.alive) {
        for (const s of [...wt.cls.map(q => AP[q]), APF[wt.atFood ? 'at food' : 'not at food']]) { if (wt.fedCaller) s.fedCaller++; if (wt.fedOther) s.fedOther++; if (wt.met) s.metCaller++; if (!wt.fedCaller && !wt.fedOther && !wt.met) s.nothing++; }
        watches.splice(k, 1);
      }
    }
  }
  energyTap.fn = null;
  for (const e of events.values()) closeEvent(e);
  births += w.stats.births - births0;
  livingEnd += w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const cause = c.causeOfDeath ?? 'unknown'; deaths[cause] = (deaths[cause] ?? 0) + 1; }
  // fedurek2014 from the scans
  for (const [id, sc] of scans) {
    let okH = 0;
    for (let j = 1; j < sc.length; j++) {
      if (!sc[j].ok || !sc[j - 1].ok) continue;
      okH += SCAN * TICK_HOURS;
      const a = sc[j - 1].males, b = sc[j].males;
      if (a.length !== b.length || a.some(m => !b.includes(m))) fed.changes++;
    }
    fed.scanH += okH; fed.maleDays += okH > 0 ? 1 : 0;
    const mineCalls = amCalls.filter(q => q.id === id);
    for (const q of mineCalls) {
      fed.calls++;
      if (q.feeding) continue;
      let s0 = -1;
      for (let j = sc.length - 1; j >= 0; j--) if (sc[j].t <= q.t) { s0 = j; break; }
      if (s0 < 2 || s0 + 2 >= sc.length) continue;
      if (![-2, -1, 0, 1, 2].every(o => sc[s0 + o].ok)) continue;
      const lo = sc[s0 - 2].t, hi = sc[s0 + 2].t;
      if (mineCalls.some(r => r !== q && r.t >= lo && r.t <= hi)) continue;
      fed.isolatedNonFeeding++;
      let joinB = 0, joinA = 0, leftAny = false;
      for (const o of [-1, 0, 1, 2]) {
        const a = sc[s0 + o - 1].males, b = sc[s0 + o].males;
        const j = b.filter(m => !a.includes(m)).length, l = a.filter(m => !b.includes(m)).length;
        if (o <= 0) joinB += j; else joinA += j;
        if (l > 0) leftAny = true;
      }
      if (joinB + joinA > 0) fed.joined++;
      if (leftAny) fed.left++;
      fed.joinBefore += joinB; fed.joinAfter += joinA;
    }
  }
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Least-squares slope of a daily series, in % per day. */
function slopePct(t: number[]): number {
  const v = t.filter(q => q !== undefined && q !== null), n = v.length;
  if (n < 2) return NaN;
  const mx = (n - 1) / 2, my = v.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) { num += (k - mx) * (v[k] - my); den += (k - mx) ** 2; }
  return 100 * num / den;
}
const cdOf = (k: Cls) => A[k].ticks / DAY;
const result = {
  tool: 'approach-diagnose', seeds, burnIn, days, params,
  truth: Object.fromEntries(CLASSES.map(k => { const a = A[k], cd = Math.max(1e-9, cdOf(k)); return [k, {
    chimpDays: r3(cdOf(k)), pathKmPerDay: r3(a.path / cd / 1000),
    purposeKmPerDay: Object.fromEntries(PURPOSES.map(p => [p, r3(PARTS.filter(q => PURPOSE_OF[q] === p).reduce((s, q) => s + a.parts[q], 0) / cd / 1000)])),
    partsKmPerDay: Object.fromEntries(PARTS.map(p => [p, r3(a.parts[p] / cd / 1000)])),
    boutsPerDay: Object.fromEntries(PARTS.map(p => [p, r3(a.bouts[p] / cd)])),
    locoKcalPerDay: Object.fromEntries(PURPOSES.map(p => [p, r3(a.kcal[p] / cd)])),
    followLeaderKmPerDay: Object.fromEntries(Object.entries(a.followBy).sort((q, r) => r[1] - q[1]).map(([q, v]) => [q, r3(v / cd / 1000)])),
    joinedLeaderKmPerDay: Object.fromEntries(Object.entries(a.joinedBy).sort((q, r) => r[1] - q[1]).map(([q, v]) => [q, r3(v / cd / 1000)])),
  }]; })),
  approaches: Object.fromEntries([...CLASSES.map(k => [k, AP[k]] as const), ...Object.entries(APF)].map(([k, s]) => {
    const n = Math.max(1, s.n), cd = CLASSES.includes(k as Cls) ? Math.max(1e-9, cdOf(k as Cls)) : NaN;
    return [k, { n: s.n, perChimpDay: r3(s.n / cd), atFoodShare: r3(s.atFood / n), startM: r3(s.d0 / n), startBins: { '≤250 m': s.dBins[0], '250–500 m': s.dBins[1], '500–750 m': s.dBins[2], '>750 m': s.dBins[3] },
      pathM: r3(s.path / n), minutes: r3(s.min / n), kcal: r3(s.kcal / n), endedAtPoint: r3(s.atPoint / n), abandoned: r3(s.abandoned / n), callerWithin50mAtEnd: r3(s.callerNear / n), goalRedirected: r3(s.redirected / n),
      party0: r3(s.party0 / n), party1: r3(s.party1 / n), in30min: { fedInCallersCrown: r3(s.fedCaller / n), fedInAnotherCrown: r3(s.fedOther / n), within50mOfCaller: r3(s.metCaller / n), nothing: r3(s.nothing / n) },
      callerAct: Object.fromEntries(Object.entries(s.callerAct).sort((a, b) => b[1] - a[1]).map(([a, v]) => [a, r3(v / n)])) }];
  })),
  calls: Object.fromEntries(Object.entries(callTab).map(([k, v]) => [k, { calls: v.calls, perCommunityDay: r3(v.calls / Math.max(1, communityDays)), listenersPerCall: r3(v.listeners / Math.max(1, v.calls)), approachesPerCall: r3(v.approaches / Math.max(1, v.calls)) }])),
  pantHootsPerAwakeHour: { adultMale: r3(amHoots / Math.max(1e-9, amAwakeH)), adultFemale: r3(afHoots / Math.max(1e-9, afAwakeH)) },
  fedurek2014: { maleChangesPerAwakeHour: r3(fed.changes / Math.max(1e-9, fed.scanH)), adultMalePantHoots: fed.calls, isolatedNonFeeding: fed.isolatedNonFeeding,
    shareWithMalesJoining: r3(fed.joined / Math.max(1, fed.isolatedNonFeeding)), shareWithMalesLeaving: r3(fed.left / Math.max(1, fed.isolatedNonFeeding)),
    meanJoinBefore: r3(fed.joinBefore / Math.max(1, fed.isolatedNonFeeding)), meanJoinAfter: r3(fed.joinAfter / Math.max(1, fed.isolatedNonFeeding)) },
  viability: { births, deaths, living: [livingStart, livingEnd], starvationDeaths: Object.entries(deaths).filter(([k]) => /starv/i.test(k)).reduce((a, [, v]) => a + v, 0),
    reservePctPerDay: Object.fromEntries(ECLS.map(n => [n, Math.round(slopePct(traj[n] ?? []) * 10000) / 10000])), traj },
  kalanBoesch2015: { events: kal.events, withOthersArrivingTogether: r3(kal.together / Math.max(1, kal.events)), shareWithArrival: r3(kal.arrived / Math.max(1, kal.events)),
    pantHoot: { events: kal.ph, share: r3(kal.phArrived / Math.max(1, kal.ph)) }, foodGrunt: { events: kal.fg, share: r3(kal.fgArrived / Math.max(1, kal.fg)) }, neither: { events: kal.none, share: r3(kal.noneArrived / Math.max(1, kal.none)) } },
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
