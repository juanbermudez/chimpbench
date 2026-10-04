// Stage E4i patrol diagnosis (development tool, simulation truth; docs/staging/e4i-prereg.md §3). Reads only: it reads
// the world after each tick and calls no function that writes world state (territory, contact and phenology readers are
// pure or cache by stamp), so the world it watches is the world e-bench simulates (as e4e-hunt-diagnose.ts does).
//
// Opportunities: every adult male's perception (it ran this tick) in daylight (> 0.3) with >= patrolMinMales adult males
//   of his community in view, no patrol of his community under way at the start of the tick and rain below
//   patrolMaxRain; in or out of the patrolStartH–patrolEndH clock window. For each: adult males in view, party size,
//   distance from the own range centre in equal-area radii, the own use isopleth at his cell, a neighbour heard in the
//   last 1 h and 24 h, his contact and loss weight in the sector he stands in (contact.ts sectorContact), his states
//   (arousal, stress, hunger, reserves ÷ store, sleep pressure, thirst), the crop at the periphery of the stalest
//   neighbour-facing sector relative to the range's mean crop per tree (daily), and the dice: the hazard h (perception.ts
//   formula), the roll's probability 1 − exp(−h·dt), whether an impulse fired, whether he then led a patrol. Out of the
//   window the hazard is what a roll would have been (dt = time since his previous perception, capped at
//   patrolRollMaxH): the impulses the clock blocks.
// Patrols (truth, start to end): start hour, hours of daylight left (sun altitude above 0, environment.ts), leader,
//   adult males in view at the start, the most adult males / adolescent males (12–15 y) / adult females (>= 12 y, not
//   lactating) / lactating females on it at once, members ever on it, leader path length and duration, the incursion
//   die and whether the leader entered a neighbour's 95% use isopleth, contact, turn-back by numerical assessment,
//   listening stops (on the schedule vs at waypoints), how it ended (home, the patrolMaxH cap, no member left), the
//   release, adult male members' mean states at start and end, and every member who left early (when, to what, hunger).
// Joining: every community member (>= 12 y, awake) with the leader in view at a perception during a patrol and not on
//   it, by class, and whether it joined that patrol.
// Periphery arrivals (readouts for the E4i mechanism, defined in docs/staging/e4i-prereg.md §4 before its code ran): an
//   adult male's perception in the own-use periphery (isopleth >= peripheryLevel), in any sector, with the sun up, >= patrolMinMales adult males in view, no patrol under way and rain
//   below patrolMaxRain, when since his last arrival he has been inside the core (isopleth <= udCoreLevel). At each: the
//   neighbours' use where he stands (sum of 1 − their familiarity level, as territory.ts pressureAt), his contact weight
//   in the sector, daylight left over the trip (a quarter circle along the edge plus the way home, at walkMps), sleep
//   pressure, arousal, the lead ceiling, the top candidate scores, and the softmax share at rgTemperature that a lead
//   option of value V0 = ceiling × min(1, 0.5 × κ × D × (1 − sleep) × (1 + arousal)) would get against the eight best
//   candidates (κ = min(1, neighbours' use + contact ÷ dangerScale); 0.5 = the odds at parity, no memory yet).
// Days: per community-day the most adult males (>= 15 y) and males >= 13 y in one party (party updates, daylight > 0.3)
//   and whether a patrol started: the truth version of mitaniWatts2005's predictor (odds per male, pooled logistic).
//
//   pnpm exec tsx scripts/patrol-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { sectorContact } from '../src/sim/contact';
import { reserveCap } from '../src/sim/energy';
import { sunAltitudeAt } from '../src/sim/environment';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_PATROL } from '../src/sim/perception';
import { fruitAt } from '../src/sim/phenology';
import { index, ix, simOf } from '../src/sim/state';
import { cellAt, gridOf, levels, sectorOf, stalestSector, useLevels, SECTORS } from '../src/sim/territory';
import { V, candidateMeta } from '../src/sim/candidates';
import type { Chimp, Troop } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w), g = gridOf(w, P);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const mean = (v: number[]) => (v.length ? r4(v.reduce((a, b) => a + b, 0) / v.length) : null);
const median = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? r4(q.length % 2 ? q[(q.length - 1) / 2] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2) : null; };
const tally = (v: (string | number)[]) => v.reduce((a, k) => { a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {} as Record<string, number>);

/** Hours from `time` until the sun sets (altitude below 0), in 5-min steps (pure; environment.ts formula). */
function daylightLeftH(time: number): number {
  if (sunAltitudeAt(time) <= 0) return 0;
  let h = 0; while (h < 14 && sunAltitudeAt(time + h) > 0) h += 1 / 12;
  return r4(h);
}
interface St { arousal: number; stress: number; hunger: number; reserve: number; sleep: number; thirst: number }
function stateOf(c: Chimp): St {
  const x = ix(c), L = x.en;
  return { arousal: x.arousal ?? 0, stress: c.stress, hunger: c.hunger, reserve: L ? L.res / reserveCap(c, P) : NaN, sleep: x.slp ?? 1 - c.energy, thirst: c.thirst };
}
const stMean = (rows: St[]) => Object.fromEntries((['arousal', 'stress', 'hunger', 'reserve', 'sleep', 'thirst'] as const).map(k => [k, mean(rows.map(r => r[k]).filter(Number.isFinite))]));
function where(c: Chimp, t: Troop): { rR: number; level: number } {
  const L = useLevels(w)[t.id], k = cellAt(g, c.position[0], c.position[2]);
  return { rR: Math.hypot(c.position[0] - t.center[0], c.position[2] - t.center[2]) / Math.max(1, t.radius), level: L ? L[k] : 1 };
}

// daily crop at the periphery of each neighbour-facing sector, relative to the range's mean crop per tree
const borderFood = new Map<number, number[]>(); // troop id → per sector: periphery mean crop ÷ range mean crop
function dailyFood(): void {
  const L = useLevels(w);
  for (const t of w.troops) {
    const lv = L[t.id]; if (!lv) continue;
    let rs = 0, rn = 0; const ps = new Array<number>(SECTORS).fill(0), pn = new Array<number>(SECTORS).fill(0);
    for (const tr of w.trees) {
      const k = cellAt(g, tr.position[0], tr.position[2]), l = lv[k];
      if (l > P.udRangeLevel) continue;
      const f = fruitAt(w, tr); rs += f; rn++;
      if (l >= P.peripheryLevel) { const q = sectorOf(t, tr.position[0], tr.position[2]); ps[q] += f; pn[q]++; }
    }
    const rm = rn ? rs / rn : 0;
    borderFood.set(t.id, ps.map((v, q) => (pn[q] && rm > 0 ? r4(v / pn[q] / rm) : NaN)));
  }
}

interface Opp { id: number; t: number; light: number; inWindow: boolean; hour: number; males: number; party: number; rR: number; level: number; heard1: boolean; heard24: boolean; contact: number; loss: number; food: number; st: St; h: number; p: number; fired: boolean; led: boolean }
const opps: Opp[] = [];
interface Member { id: number; cls: string; joinAt: number; leftAt: number | null; leftTo: string | null; leftHunger: number | null }
interface Patrol {
  troop: number; startT: number; startHour: number; lightLeftStart: number; leader: number; malesInView: number; incursionDie: boolean; sector: number; until: number;
  maxAdultMales: number; maxAdolMales: number; maxFemales: number; maxLactating: number; members: Member[]; pathM: number; enteredNeighbour: boolean;
  contact: boolean; turnedBack: boolean; stopsSchedule: number; stopsWaypoint: number; end: string | null; release: boolean | null; endT: number | null;
  lightLeftEnd: number | null; endHour: number | null; startState: Record<string, number | null>; endState: Record<string, number | null> | null;
  /** E4i (patrolValue): the leader's lead score when he set out and whether he remembered the neighbour's males. */
  leadScore: number | null; remembered: number | null;
}
const patrols: Patrol[] = [];
const open = new Map<number, { rec: Patrol; obj: object; phase: number; stops: number; lx: number; lz: number; lastMembers: Chimp[]; nowMembers: number }>();
const joinOpp = new Map<string, { cls: string; joined: boolean }>(); // `${patrol index}:${chimp id}`
const clsOf = (c: Chimp) => (c.sex === 'male' ? (c.age >= 15 ? 'adultMale' : 'adolescentMale') : c.lactating ? 'lactatingFemale' : 'adultFemale');
const prevRoll = new Map<number, number>(), prevSeen = new Map<number, number>(), prevImpulse = new Map<number, number>(), prevUntil = new Map<number, number>();
for (const c of w.chimps) { const x = ix(c); prevRoll.set(c.id, x.patrolRoll); prevSeen.set(c.id, x.seenAt); prevImpulse.set(c.id, x.impulse); prevUntil.set(c.id, x.impulseUntil); }
const dayMax = new Map<string, { m15: number; m13: number; patrol: boolean }>(); // `${troop}:${day}`
interface Arr { g: number; contact: number; kappa: number; light: number; tripH: number; D: number; sleep: number; arousal: number; ceiling: number; v0: number; top: number[]; share: number; hour: number; males: number }
const arrivals: Arr[] = [], inVisit = new Map<number, boolean>();
const enc0 = w.stats.intergroupEncounters, deaths0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
let foodDay = -1;

for (let i = 0; i < days * DAY; i++) {
  const patrolBefore = new Map<number, boolean>(w.troops.map(t => [t.id, !!s.patrols[t.id]]));
  tickWorld(w);
  const time = w.time, hour = w.hour, day = w.environment.daylight > 0.3, idx = index(w);
  if (w.day !== foodDay && hour >= 12) { foodDay = w.day; dailyFood(); }
  // events of this tick (turn-backs, releases)
  const evs = []; for (let e = w.events.length - 1; e >= 0 && w.events[e].time === time; e--) evs.push(w.events[e]);
  // patrols: starts, per-tick tracking, ends
  for (const t of w.troops) {
    const p = s.patrols[t.id], o = open.get(t.id);
    if (o && (!p || p !== o.obj)) { // ended
      const rec = o.rec, ended = evs.find(e => e.troopId === t.id && e.kind === 'territory' && /patrol ended/.test(e.text));
      rec.release = ended ? /chorus/.test(ended.text) : null;
      // 'empty': no member was on it at the last check (parties.ts ends it with no leader, and no release); 'cap': patrolMaxH
      rec.end = !(P.patrolValue >= 1) && time > rec.until ? 'cap' : o.nowMembers === 0 ? 'empty' : 'home';
      rec.incursionDie = !!(o.obj as { incursion?: boolean }).incursion; // E4i: decided at the range edge (the die's field otherwise)
      rec.endT = time; rec.endHour = r4(hour); rec.lightLeftEnd = daylightLeftH(time);
      rec.endState = stMean(o.lastMembers.filter(isAdultMale).map(stateOf));
      for (const m of rec.members) if (m.leftAt === null) m.leftAt = time;
      open.delete(t.id);
    }
    if (p && (!o || p !== o.obj)) { // started
      const leader = idx.byId.get(p.leaderId)!;
      const rec: Patrol = { troop: t.id, startT: time, startHour: r4(hour), lightLeftStart: daylightLeftH(time), leader: p.leaderId, malesInView: ix(leader).ownMales, incursionDie: !!p.incursion, sector: p.sector, until: p.until,
        maxAdultMales: 0, maxAdolMales: 0, maxFemales: 0, maxLactating: 0, members: [], pathM: 0, enteredNeighbour: false, contact: false, turnedBack: false, stopsSchedule: 0, stopsWaypoint: 0,
        leadScore: leader.candidates.find(q => q.action === 'patrol' && candidateMeta.get(q)?.v === V.LEAD)?.score ?? null, remembered: ix(leader).nbm?.[p.neighborId] ?? null,
        end: null, release: null, endT: null, lightLeftEnd: null, endHour: null, startState: stMean([leader, ...ix(leader).seen.map(id => idx.byId.get(id)!).filter(o2 => o2 && o2.alive && o2.troopId === t.id && isAdultMale(o2))].map(stateOf)), endState: null };
      patrols.push(rec);
      open.set(t.id, { rec, obj: p, phase: p.phase, stops: p.stops, lx: leader.position[0], lz: leader.position[2], lastMembers: [leader], nowMembers: 1 });
      const dk = `${t.id}:${w.day}`, d = dayMax.get(dk) ?? { m15: 0, m13: 0, patrol: false }; d.patrol = true; dayMax.set(dk, d);
    }
    const oo = open.get(t.id);
    if (p && oo) {
      const rec = oo.rec, members: Chimp[] = [];
      for (const id of p.file) { const m = idx.byId.get(id); if (m && m.alive && m.action === 'patrol') members.push(m); }
      for (const m of members) if (!rec.members.find(q => q.id === m.id)) rec.members.push({ id: m.id, cls: clsOf(m), joinAt: time, leftAt: null, leftTo: null, leftHunger: null });
      for (const q of rec.members) if (q.leftAt === null && !members.find(m => m.id === q.id)) { const m = idx.byId.get(q.id); q.leftAt = time; q.leftTo = m ? (m.alive ? m.action : 'dead') : 'gone'; q.leftHunger = m ? r4(m.hunger) : null; }
      rec.maxAdultMales = Math.max(rec.maxAdultMales, members.filter(m => m.sex === 'male' && m.age >= 15).length);
      rec.maxAdolMales = Math.max(rec.maxAdolMales, members.filter(m => m.sex === 'male' && m.age >= 12 && m.age < 15).length);
      rec.maxFemales = Math.max(rec.maxFemales, members.filter(m => m.sex === 'female' && m.age >= 12 && !m.lactating).length);
      rec.maxLactating = Math.max(rec.maxLactating, members.filter(m => m.sex === 'female' && m.lactating).length);
      const leader = idx.byId.get(p.leaderId);
      if (leader) {
        rec.pathM += Math.hypot(leader.position[0] - oo.lx, leader.position[2] - oo.lz); oo.lx = leader.position[0]; oo.lz = leader.position[2];
        const k = cellAt(g, leader.position[0], leader.position[2]), L = useLevels(w);
        if (w.troops.some(o2 => o2.id !== t.id && L[o2.id] && L[o2.id][k] <= P.udRangeLevel)) rec.enteredNeighbour = true;
      }
      rec.contact ||= !!p.contact;
      if (evs.some(e => e.troopId === t.id && /turned back/.test(e.text))) rec.turnedBack = true;
      if (p.stops > oo.stops) { if (p.phase !== oo.phase) rec.stopsWaypoint += p.stops - oo.stops; else rec.stopsSchedule += p.stops - oo.stops; }
      oo.stops = p.stops; oo.phase = p.phase; oo.nowMembers = members.length; if (members.length) oo.lastMembers = members;
      // joining opportunities: members >= 12 y of the community, awake, perceiving now, the leader in view, not on it
      if (leader) for (const c of idx.alive) {
        if (c.troopId !== t.id || c.age < 12 || c.id === leader.id || c.action === 'patrol' || c.action === 'nest') continue;
        const x = ix(c); if (x.seenAt !== time || !x.seen.includes(leader.id)) continue;
        const key = `${patrols.indexOf(rec)}:${c.id}`;
        if (!joinOpp.has(key)) joinOpp.set(key, { cls: clsOf(c), joined: false });
      }
      for (const m of members) { const key = `${patrols.indexOf(rec)}:${m.id}`, j = joinOpp.get(key); if (j) j.joined = true; }
    }
  }
  // daily male party maxima (party updates)
  if (day && w.tick % 8 === 0) for (const party of w.parties) {
    let m15 = 0, m13 = 0;
    for (const id of party.members) { const c = idx.byId.get(id); if (c && c.alive && c.sex === 'male') { if (c.age >= 15) m15++; if (c.age >= 13) m13++; } }
    const dk = `${party.troopId}:${w.day}`, d = dayMax.get(dk) ?? { m15: 0, m13: 0, patrol: false };
    d.m15 = Math.max(d.m15, m15); d.m13 = Math.max(d.m13, m13); dayMax.set(dk, d);
  }
  // periphery arrivals (planned E4i decision point; read-only)
  for (const c of idx.alive) {
    const x = ix(c);
    if (x.seenAt !== time || !isAdultMale(c)) continue;
    const t = idx.troopById.get(c.troopId); if (!t) continue;
    const L = useLevels(w)[t.id]; if (!L) continue;
    const k = cellAt(g, c.position[0], c.position[2]), lv = L[k];
    if (lv <= P.udCoreLevel) { inVisit.set(c.id, false); continue; }
    if (lv < P.peripheryLevel || inVisit.get(c.id)) continue;
    const sec = sectorOf(t, c.position[0], c.position[2]);
    if (sunAltitudeAt(time) <= 0 || x.ownMales < P.patrolMinMales || patrolBefore.get(c.troopId) || w.environment.rain >= P.patrolMaxRain) continue;
    inVisit.set(c.id, true);
    const fam = levels(w); let gsum = 0; for (const o of w.troops) if (o.id !== t.id && fam[o.id]) gsum += 1 - fam[o.id][k];
    const mem = sectorContact(w, t, c), kappa = Math.min(1, gsum + mem.c[sec] / P.dangerScale);
    const dHome = Math.hypot(c.position[0] - t.center[0], c.position[2] - t.center[2]), tripH = (Math.PI / 4 * t.radius + dHome) / P.walkMps / 3600;
    const light = daylightLeftH(time), D = Math.min(1, light / tripH), sl = x.slp ?? 1 - c.energy, a = x.arousal ?? 0;
    const ceiling = P.patrolLeadScore + P.patrolLeadMaleW * (x.ownMales - P.patrolMinMales) + c.personality.boldness * P.patrolLeadBoldW;
    const v0 = ceiling * Math.min(1, 0.5 * kappa * D * (1 - sl) * (1 + a));
    const top = c.candidates.slice(0, 8).map(q => q.score), T = P.rgTemperature, mx = Math.max(v0, ...top);
    const e0 = Math.exp((v0 - mx) / T), es = top.reduce((acc, v) => acc + Math.exp((v - mx) / T), 0);
    arrivals.push({ g: r4(gsum), contact: r4(mem.c[sec]), kappa: r4(kappa), light, tripH: r4(tripH), D: r4(D), sleep: r4(sl), arousal: r4(a), ceiling: r4(ceiling), v0: r4(v0), top: top.slice(0, 3).map(r4), share: r4(e0 / (e0 + es)), hour: Math.floor(hour), males: x.ownMales });
  }
  // opportunities
  for (const c of idx.alive) {
    const x = ix(c);
    const rolled = x.patrolRoll === time, perceived = x.seenAt === time;
    const pr = prevRoll.get(c.id) ?? x.patrolRoll, ps = prevSeen.get(c.id) ?? x.seenAt, pi = prevImpulse.get(c.id) ?? 0, pu = prevUntil.get(c.id) ?? -1e9;
    prevRoll.set(c.id, x.patrolRoll); prevImpulse.set(c.id, x.impulse); prevUntil.set(c.id, x.impulseUntil);
    if (perceived) prevSeen.set(c.id, time);
    if (!perceived || !day || !isAdultMale(c) || x.ownMales < P.patrolMinMales || patrolBefore.get(c.troopId) || w.environment.rain >= P.patrolMaxRain) continue;
    const t = idx.troopById.get(c.troopId); if (!t) continue;
    const inWindow = hour >= P.patrolStartH && hour < P.patrolEndH;
    const st = stalestSector(w, t), S = 1 - Math.exp(-st.days / P.patrolStaleTauDays);
    const h = P.patrolH0 * Math.pow(P.patrolMaleOddsRatio, x.ownMales - 3) * S * (1 + P.patrolHeardBeta * (time - x.heardAt < 24 ? 1 : 0));
    const dt = rolled ? Math.min(P.patrolRollMaxH, time - pr) : Math.min(P.patrolRollMaxH, time - ps);
    if (inWindow && !rolled) continue; // an impulse pending or a gang roll first: no patrol roll this perception
    const pNow = 1 - Math.exp(-h * dt);
    const newPatrol = !patrolBefore.get(c.troopId) && s.patrols[c.troopId]?.leaderId === c.id && s.patrols[c.troopId]?.start === time;
    // fired this tick: a fresh patrol impulse (its expiry set from this tick), or one taken in the same tick (execution.ts clears it)
    const fired = rolled && ((x.impulse === IMPULSE_PATROL && Math.abs(x.impulseUntil - (time + P.impulseDurationH)) < 1e-6) || (newPatrol && !(pi === IMPULSE_PATROL && pu > time - 1e-9)));
    const wh = where(c, t), mem = sectorContact(w, t, c), sec = sectorOf(t, c.position[0], c.position[2]);
    const party = x.seen.filter(id => { const o = idx.byId.get(id); return !!o && o.alive && o.troopId === c.troopId; }).length + 1;
    opps.push({ id: c.id, t: time, light: daylightLeftH(time), inWindow, hour: Math.floor(hour), males: x.ownMales, party, rR: r4(wh.rR), level: r4(wh.level), heard1: time - x.heardAt < 1, heard24: time - x.heardAt < 24, contact: r4(mem.c[sec]), loss: r4(mem.l[sec]),
      food: borderFood.get(t.id)?.[st.sector] ?? NaN, st: stateOf(c), h: r4(h), p: pNow, fired, led: false });
  }
}
// a fired impulse led to a patrol if that male led one that started within impulseDurationH (+ one tick) of the roll
for (const o of opps) if (o.fired) o.led = patrols.some(p => p.leader === o.id && p.startT >= o.t - 1e-9 && p.startT <= o.t + P.impulseDurationH + 1 / 240);

const rolls = opps.filter(o => o.inWindow), blocked = opps.filter(o => !o.inWindow), fired = rolls.filter(o => o.fired);
const by = <T,>(rows: T[], f: (r: T) => string | number, v: (r: T[]) => unknown) => { const m: Record<string, T[]> = {}; for (const r of rows) (m[String(f(r))] ??= []).push(r); return Object.fromEntries(Object.entries(m).map(([k, rs]) => [k, v(rs)])); };
const oppSummary = (rows: Opp[]) => ({ n: rows.length, expectedImpulses: r4(rows.reduce((a, o) => a + o.p, 0)), hazardMean: mean(rows.map(o => o.h)), males: mean(rows.map(o => o.males)), party: mean(rows.map(o => o.party)),
  lightLeftH: mean(rows.map(o => o.light)), rR: mean(rows.map(o => o.rR)), periphery: mean(rows.map(o => (o.level >= P.peripheryLevel ? 1 : 0))), heard1: mean(rows.map(o => (o.heard1 ? 1 : 0))), heard24: mean(rows.map(o => (o.heard24 ? 1 : 0))),
  contact: mean(rows.map(o => o.contact)), loss: mean(rows.map(o => o.loss)), food: mean(rows.map(o => o.food).filter(Number.isFinite)), state: stMean(rows.map(o => o.st)) });
const communityWeeks = w.troops.length * days / 7;
const dm = [...dayMax.values()];
// pooled logistic regression of a patrol day on the day's most adult males in one party (Newton–Raphson, two terms)
function logit(xs: number[], ys: number[]): { b: number; se: number; or: number } | null {
  if (xs.length < 10 || !ys.some(Boolean) || ys.every(Boolean)) return null;
  let a = 0, b = 0;
  for (let it = 0; it < 50; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    for (let i = 0; i < xs.length; i++) { const p = 1 / (1 + Math.exp(-(a + b * xs[i]))), wgt = p * (1 - p); g0 += ys[i] - p; g1 += (ys[i] - p) * xs[i]; h00 += wgt; h01 += wgt * xs[i]; h11 += wgt * xs[i] * xs[i]; }
    const det = h00 * h11 - h01 * h01; if (Math.abs(det) < 1e-12) break;
    a += (h11 * g0 - h01 * g1) / det; b += (h00 * g1 - h01 * g0) / det;
    if (it === 49 || (Math.abs(g0) < 1e-9 && Math.abs(g1) < 1e-9)) return { b: r4(b), se: r4(Math.sqrt(h00 / det)), or: r4(Math.exp(b)) };
  }
  return { b: r4(b), se: NaN, or: r4(Math.exp(b)) };
}
const done = patrols.filter(p => p.endT !== null);
const joins = [...joinOpp.values()];
const result = {
  seed, burnIn, days, params, communities: w.troops.map(t => ({ id: t.id, adultMales: w.chimps.filter(c => c.alive && c.troopId === t.id && isAdultMale(c)).length, members: w.chimps.filter(c => c.alive && c.troopId === t.id).length })),
  patrolsPerCommunityWeek: r4(patrols.length / communityWeeks), patrolsStarted: patrols.length,
  dice: {
    rollsInWindow: oppSummary(rolls), impulsesFired: fired.length, impulsesLed: fired.filter(o => o.led).length, patrolsWithoutFiredRow: patrols.filter(p => !fired.some(o => o.led && o.id === p.leader && p.startT >= o.t - 1e-9 && p.startT <= o.t + P.impulseDurationH + 1 / 240)).length, firedRows: oppSummary(fired),
    blockedByClock: oppSummary(blocked), blockedShareOfDaylightOpportunities: r4(blocked.length / Math.max(1, opps.length)),
    rollsByHour: by(rolls, o => o.hour, rs => ({ n: (rs as Opp[]).length, expected: r4((rs as Opp[]).reduce((a, o) => a + o.p, 0)) })),
    blockedByHour: by(blocked, o => o.hour, rs => ({ n: (rs as Opp[]).length, expected: r4((rs as Opp[]).reduce((a, o) => a + o.p, 0)) })),
    rollsByMales: by(rolls, o => o.males, rs => ({ n: (rs as Opp[]).length, expected: r4((rs as Opp[]).reduce((a, o) => a + o.p, 0)), fired: (rs as Opp[]).filter(o => o.fired).length })),
    incursionDieTrue: r4(done.filter(p => p.incursionDie).length / Math.max(1, done.length)), enteredNeighbour: r4(done.filter(p => p.enteredNeighbour).length / Math.max(1, done.length)),
    enteredGivenDie: { dieTrue: r4(done.filter(p => p.incursionDie && p.enteredNeighbour).length / Math.max(1, done.filter(p => p.incursionDie).length)), dieFalse: r4(done.filter(p => !p.incursionDie && p.enteredNeighbour).length / Math.max(1, done.filter(p => !p.incursionDie).length)) },
    endedBy: tally(done.map(p => p.end ?? '?')), release: tally(done.map(p => String(p.release))), releaseAfterContact: tally(done.filter(p => p.contact).map(p => String(p.release))),
    releaseHome: tally(done.filter(p => p.end === 'home').map(p => `${p.contact ? 'contact' : 'none'}:${p.release}`)), durationByEnd: by(done, p => p.end ?? '?', rs => median((rs as Patrol[]).map(p => (p.endT! - p.startT) * 60))),
    stopsSchedule: done.reduce((a, p) => a + p.stopsSchedule, 0), stopsWaypoint: done.reduce((a, p) => a + p.stopsWaypoint, 0),
    joining: by(joins, j => j.cls, rs => ({ opportunities: (rs as typeof joins).length, joined: (rs as typeof joins).filter(j => j.joined).length })),
  },
  patrolSummary: {
    startHour: tally(patrols.map(p => Math.floor(p.startHour))), durationMin: { median: median(done.map(p => (p.endT! - p.startT) * 60)), all: done.map(p => Math.round((p.endT! - p.startT) * 60)) },
    pathKm: median(done.map(p => p.pathM / 1000)), maxAdultMales: tally(done.map(p => p.maxAdultMales)), reachThreeAdultMales: r4(done.filter(p => p.maxAdultMales >= 3).length / Math.max(1, done.length)),
    shareOfCommunityMales: mean(done.map(p => { const n = w.chimps.filter(c => c.troopId === p.troop && isAdultMale(c) && c.alive).length; return n ? p.maxAdultMales / n : NaN; }).filter(Number.isFinite)),
    withFemales: r4(done.filter(p => p.maxFemales + p.maxLactating > 0).length / Math.max(1, done.length)), contact: r4(done.filter(p => p.contact).length / Math.max(1, done.length)),
    turnedBack: r4(done.filter(p => p.turnedBack).length / Math.max(1, done.length)), lightLeftStart: median(patrols.map(p => p.lightLeftStart)), lightLeftEnd: median(done.map(p => p.lightLeftEnd!)),
    leftEarly: tally(done.flatMap(p => p.members.filter(m => m.leftTo !== null && m.leftAt! < p.endT!).map(m => m.leftTo!))),
    leadScore: mean(patrols.map(p => p.leadScore).filter((v): v is number => v !== null)), rememberedShare: r4(patrols.filter(p => p.remembered !== null).length / Math.max(1, patrols.length)),
    startState: stMean(patrols.map(p => p.startState as unknown as St)), endState: stMean(done.map(p => p.endState as unknown as St)),
  },
  dayStats: { communityDays: dm.length, patrolDays: dm.filter(d => d.patrol).length, m15: mean(dm.map(d => d.m15)), m15PatrolDays: mean(dm.filter(d => d.patrol).map(d => d.m15)), m15Other: mean(dm.filter(d => !d.patrol).map(d => d.m15)),
    logitM15: logit(dm.map(d => d.m15), dm.map(d => (d.patrol ? 1 : 0))), logitM13: logit(dm.map(d => d.m13), dm.map(d => (d.patrol ? 1 : 0))), m15Hist: tally(dm.map(d => d.m15)) },
  arrivals: { perCommunityWeek: r4(arrivals.length / communityWeeks), n: arrivals.length, expectedPatrolsIfV0: r4(arrivals.reduce((acc, a) => acc + a.share, 0)),
    mean: Object.fromEntries((['g', 'contact', 'kappa', 'light', 'tripH', 'D', 'sleep', 'arousal', 'ceiling', 'v0', 'share', 'males'] as const).map(k => [k, mean(arrivals.map(a => a[k]))])),
    topScore: mean(arrivals.map(a => a.top[0] ?? NaN).filter(Number.isFinite)), byHour: tally(arrivals.map(a => a.hour)), byMales: tally(arrivals.map(a => a.males)), kappaZero: arrivals.filter(a => a.kappa === 0).length },
  encountersPerCommunityWeek: r4((w.stats.intergroupEncounters - enc0) / communityWeeks),
  deaths: tally(w.chimps.filter(c => !c.alive && !deaths0.has(c.id)).map(c => c.causeOfDeath ?? '?')),
  patrols,
};
const text = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, text + '\n');
console.log(JSON.stringify({ ...result, patrols: undefined }, null, 1));
