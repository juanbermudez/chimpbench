import type { Chimp, World } from '../types';
import { paramsOf } from '../sim/params';
import { TICK_HOURS, index, treesNear, type SimWorld } from '../sim/state';
import { leanIndex } from '../sim/hierarchy';

const _near: number[] = [];
import { CHANNEL, streamCell } from '../sim/stream';
import { facingSectors } from '../sim/territory';
import { ACTION_CODE, CAT_FEED, CAT_NONE, activityCategory, feedType, FEED_FRUIT, FEED_GROUND, FEED_MEAT } from './categories';
import { ensureIds, ensureTeams, orand, sim, type Observer, type Team } from './observer';
import { P_CALLED, P_CHANNEL, P_GROUND, P_LACT, P_MEAT, P_SWOLLEN, type CallRec, type ConflictRec, type EncounterRec, type EventRec, type Follow } from './records';

// Field protocols (docs/realism-design.md §3.4–3.5): focal follows with a lost-follow model, 1-min focal point
// samples, 15-min party scans, all-occurrence capture of interactions and calls within visibility or hearing,
// the encounter and hunt classifiers, PC–MC observations, a daily census, a monthly phenology transect and a
// weather station. Every function reads the world only.

export interface OpenEncounter {
  other: number; t0: number; tLast: number; seen: boolean; heard: boolean; physical: boolean;
  ownSize: number; ownAM: number; otherSize: number; otherAM: number; srcX: number; srcZ: number; d0: number; dMin: number; dMax: number;
  called: boolean; x: number; z: number; patrolling: boolean;
}
export interface PendingHeard { t: number; other: number; x: number; z: number; }

const AFFILIATIVE: Record<string, true> = { groom: true, reconcile: true, play: true, share: true, console: true };
const LOUD: Record<string, true> = { fight: true, kill: true, infanticide: true, hunt: true, chase: true, display: true, charge: true, intergroup: true, coalition: true, takeover: true, 'rain-display': true };
/** Detected but not written to the event records: no target uses them and they are frequent. */
const UNRECORDED: Record<string, true> = { nurse: true, guard: true };
const RESPONSE: Record<string, true> = { patrol: true, flee: true, call: true, display: true };
const RUNNING: Record<string, true> = { charge: true, attack: true, flee: true, display: true };
const RIPE = 0.06; // a crop the chimps treat as worth feeding in (src/sim/perception.ts keeps trees with fruit >= 0.06)
const MIN = 1 / 60;
const YEAR_H = 365.25 * 24;
/** NOAA's sunrise and sunset: the sun's centre at −0.833° (radians). */
const NOAA_H0 = -0.833 * Math.PI / 180;
/** A death counts as preceded by illness when respiratory signs were seen in the 30 days before the last sighting (design). */
const ILL_WINDOW_H = 30 * 24;

/**
 * Necropsy truth for a carcass (stage C8, T-DEM-4, T-DEM-8): the simulation's cause of death as a field category.
 * Wound complications count as aggression: in the simulation wounds come only from conspecific conflicts (snare injuries
 * are a separate, permanent state), and williams2008 counts deaths from conspecific wounds as aggression.
 */
export function necropsy(cause: string): { cause: 'disease' | 'aggression' | 'other'; respiratory: boolean } {
  if (cause.startsWith('respiratory')) return { cause: 'disease', respiratory: true };
  if (cause.startsWith('illness')) return { cause: 'disease', respiratory: false };
  if (cause.startsWith('killed') || cause.startsWith('infanticide') || cause.startsWith('wounds from a fight') || cause.startsWith('complications of wounds')) return { cause: 'aggression', respiratory: false };
  return { cause: 'other', respiratory: false };
}

const isAdultMale = (c: Chimp) => c.sex === 'male' && c.age >= 15;
const isAdultFemale = (c: Chimp) => c.sex === 'female' && c.age >= 15;
/** Independent: not an unweaned infant or young juvenile travelling with its mother. */
export const independent = (c: Chimp) => { const x = sim(c); return !x || x.weaned || c.age >= 6; };
const d2 = (ax: number, az: number, bx: number, bz: number) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };

/** Observer visibility now: × (1 − 0.3·rain), halved at dusk. */
export function visibility(o: Observer, world: World): number {
  const env = world.environment;
  return o.cfg.profile.visibilityM * (1 - 0.3 * env.rain) * (env.daylight < 0.5 ? 0.5 : 1);
}

function categoryOf(o: Observer, world: World, c: Chimp): number {
  const x = sim(c);
  if (!x || !c.alive) return CAT_NONE;
  let atWater = false;
  if (c.action === 'drink') { const w = index(world).waterById.get(c.targetId); atWater = !!w && d2(c.position[0], c.position[2], w.position[0], w.position[2]) <= 1.44; }
  return activityCategory(c.action, x.phase, c.targetId, o.id.groomed[c.id] === o.stamp, c.carryingMeat > 0.02, atWater);
}

// ---------------------------------------------------------------------------
// Per tick
// ---------------------------------------------------------------------------

/** Weather station, read once per point interval (rain intensity is smoothed per tick, so a 1-min reading stands for the minute). */
function weatherMinute(o: Observer, world: World): void {
  const env = world.environment, w = o.rec.weather, s = o.wx;
  const mm = env.rain * paramsOf(world).rainMmPerH * TICK_HOURS * o.pointEvery; // the world's own rate (overrides included), not a default copy
  w.rainMm += mm;
  if (world.hour >= 13 && world.hour < 19) w.afternoonMm += mm;
  if (world.day !== s.day) { if (s.day > 1) { w.tmin.push(s.min); w.tmax.push(s.max); } s.day = world.day; s.min = 99; s.max = -99; }
  if (env.temperature < s.min) s.min = env.temperature;
  if (env.temperature > s.max) s.max = env.temperature;
  // Track E freeze (e2h-protocol): sunrise and sunset as NOAA times them, the sun's centre at −0.833° (upper limb with
  // standard refraction), which janmaat2014 used ("Astronomical sunrise times were retrieved from ... NOAA")
  const alt = env.sunAltitude;
  if (o.prevAlt <= NOAA_H0 && alt > NOAA_H0) o.sunrise = world.hour;
  if (o.prevAlt > NOAA_H0 && alt <= NOAA_H0) o.sunset = world.hour;
  o.prevAlt = alt;
}

/** World counters are checked once per point interval; records found since the last check carry their own times. */
function statsMinute(o: Observer, world: World): void {
  const st = world.stats, S = o.stats, since = o.statsTime;
  o.statsTime = world.time;
  if (st.killings !== S.killings) { S.killings = st.killings; onKillings(o, world, since); }
  if (st.intergroupEncounters !== S.encounters) {
    const n = st.intergroupEncounters - S.encounters;
    S.encounters = st.intergroupEncounters;
    const T = o.rec.truth; T.encounters += n;
    // Truth modality from the encounter's feed record: two actors of different communities, severity 1 when seen, 0 when heard.
    const byId = index(world).byId;
    for (let i = world.events.length - 1, k = 0; i >= 0 && k < n; i--) {
      const e = world.events[i];
      if (e.time <= since) break;
      if (e.kind !== 'territory' || e.actors.length !== 2) continue;
      const a = byId.get(e.actors[0]), b = byId.get(e.actors[1]);
      if (!a || !b || a.troopId === b.troopId) continue;
      if (e.severity >= 1) T.encountersSeen++; else T.encountersHeard++;
      T.encounterLog.push({ t: e.time, a: a.troopId, b: b.troopId });
      for (const tm of o.teams) {
        if (tm.state !== 2) continue;
        const inA = tm.mark[a.id] === tm.partyStamp && a.troopId === tm.troop, inB = tm.mark[b.id] === tm.partyStamp && b.troopId === tm.troop;
        if (inA || inB) T.followedEncounters.push({ team: tm.index, other: inA ? b.troopId : a.troopId, t: e.time, heard: e.severity < 1, caller: e.severity < 1 && !inA });
      }
      k++;
    }
  }
  if (st.deaths !== S.deaths) {
    S.deaths = st.deaths;
    for (const c of world.chimps) {
      if (c.alive || c.deathTime === null || c.deathTime <= since) continue;
      const cause = c.causeOfDeath ?? '';
      const violent = cause.startsWith('killed') || cause.startsWith('infanticide') || cause.startsWith('wounds from a fight');
      const n = necropsy(cause);
      o.recentDead.push({ id: c.id, troop: c.troopId, x: c.position[0], z: c.position[2], t: c.deathTime, violent, found: false, cause: n.cause, respiratory: n.respiratory });
    }
  }
  if (st.births !== S.births) {
    S.births = st.births;
    for (let i = world.chimps.length - 1; i >= 0; i--) {
      const c = world.chimps[i];
      if (c.birthTime <= since) break;
      if (!o.roster.has(c.id) && !o.pendingBirths.has(c.id)) o.pendingBirths.set(c.id, { id: c.id, mother: c.motherId, troop: c.troopId, tSeen: -1, truthBirth: c.birthTime, father: c.fatherId });
    }
  }
}

/** Decided conflicts are read every tick (a winner's lastConflict can be overwritten within a minute). */
export function conflictTick(o: Observer, world: World): void {
  const n = world.stats.conflicts;
  if (n === o.stats.conflicts) return;
  o.stats.conflicts = n;
  onConflicts(o, world, world.time - 1e-9);
}

function onConflicts(o: Observer, world: World, since: number): void {
  const byId = index(world).byId, vis = visibility(o, world);
  for (const w of index(world).alive) {
    const lc = w.lastConflict;
    if (!lc || lc.time <= since || !lc.won) continue;
    const time = lc.time;
    const l = byId.get(lc.opponentId);
    if (!l) continue;
    let contact = false;
    const inter = world.interactions;
    for (let i = inter.length - 1, k = 0; i >= 0 && k < 60; i--, k++) {
      const it = inter[i];
      if (it.kind === 'fight' && (it.end === null || it.end >= time - 2 * MIN) && it.participants.includes(w.id) && it.participants.includes(l.id)) { contact = true; break; }
    }
    let detected = false;
    for (const tm of o.teams) {
      if (tm.state !== 2) continue;
      if (tm.focal === w.id || tm.focal === l.id || d2(tm.x, tm.z, l.position[0], l.position[2]) <= vis * vis || d2(tm.x, tm.z, w.position[0], w.position[2]) <= vis * vis) { detected = true; break; }
    }
    const rec: ConflictRec = { t: time, winner: w.id, loser: l.id, troop: w.troopId, contact, detected, pc: -1, mc: -3, thirdToWinner: 0, thirdToLoser: 0 };
    o.rec.conflicts.push(rec);
    if (contact) o.rec.truth.fights++;
    if (detected) o.pc.push({ conflict: o.rec.conflicts.length - 1, a: w.id, b: l.id, t: time, until: time + o.cfg.pcWindowMin * MIN });
  }
}

function onKillings(o: Observer, world: World, since: number): void {
  const byId = index(world).byId;
  for (let i = world.interactions.length - 1; i >= 0; i--) {
    const it = world.interactions[i];
    if (it.start <= since) break;
    if (it.kind !== 'kill' && it.kind !== 'infanticide') continue;
    const v = byId.get(it.targetId);
    const attackers = it.kind === 'kill' ? it.participants.filter(id => id !== it.targetId) : [it.actorId];
    // defenders: adult males of the victim's community within twice the visibility of the victim
    let defenders = 0;
    const r2 = (2 * o.cfg.profile.visibilityM) ** 2;
    if (v) for (const c of index(world).alive) if (c.troopId === v.troopId && c !== v && isAdultMale(c) && d2(c.position[0], c.position[2], it.position[0], it.position[2]) <= r2) defenders++;
    o.rec.truth.kills.push({ t: it.start, victim: it.targetId, victimSex: v?.sex ?? '', victimAge: v?.age ?? -1, attackers, defenders, troop: it.troopId, victimTroop: v?.troopId ?? -1, kind: it.kind });
  }
}

/** Truth reference for the sampling-accuracy check: the focal's category at every tick of the follow. */
export function focalTruthTick(o: Observer, world: World): void {
  if (!o.cfg.truth || o.cfg.lite) return;
  const byId = index(world).byId;
  for (const tm of o.teams) {
    if (tm.state !== 2 || !tm.follow) continue;
    const c = byId.get(tm.focal);
    if (!c || !c.alive) continue;
    const x = sim(c)!;
    let groomed = false;
    if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') {
      const mates = o.byTroop[tm.troop];
      for (let i = 0; i < mates.length; i++) { const m = mates[i]; if (m.action === 'groom' && m.targetId === c.id && m.alive && sim(m)!.phase >= 1) { groomed = true; break; } }
    }
    let atWater = false;
    if (c.action === 'drink') { const w = index(world).waterById.get(c.targetId); atWater = !!w && d2(c.position[0], c.position[2], w.position[0], w.position[2]) <= 1.44; }
    const cat = activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atWater);
    if (cat !== CAT_NONE) tm.follow.truthTicks[cat]++;
  }
}

// ---------------------------------------------------------------------------
// Per minute
// ---------------------------------------------------------------------------

export function minuteStep(o: Observer, world: World): void {
  // Between the evening census and the next morning's focal choice no team is out and nothing is sampled, so the
  // per-individual scratch is not rebuilt (truth keeps only its night checks).
  let out = false;
  for (const tm of o.teams) if (tm.state === 1 || tm.state === 2) { out = true; break; }
  const night = !out && (world.hour >= 20 || world.hour < 5);
  weatherMinute(o, world);
  o.vis = visibility(o, world);
  if (!night) {
    o.stamp++;
    // Community lists and independence flags change only with births, deaths, transfers and weaning: rebuild on those, and every 30 min.
    const ver = (world as SimWorld).sim.aliveVersion;
    if (ver !== o.aliveVer || world.stats.transfers !== o.transfers || world.tick - o.rebuiltAt >= 30 * o.pointEvery) {
      o.aliveVer = ver; o.transfers = world.stats.transfers; o.rebuiltAt = world.tick;
      const alive = index(world).alive, ids = o.id;
      ensureIds(o, world.chimps.length + 2);
      for (const l of o.byTroop) if (l) l.length = 0;
      for (let i = 0; i < alive.length; i++) {
        const c = alive[i];
        (o.byTroop[c.troopId] ?? (o.byTroop[c.troopId] = [])).push(c);
        if (c.id >= ids.indep.length) ensureIds(o, c.id + 1);
        const x = sim(c)!;
        ids.indep[c.id] = x.weaned || c.age >= 6 ? 1 : 0;
      }
      const nIds = ids.indep.length;
      for (const tm of o.teams) { while (tm.mark.length < nIds) tm.mark.push(0); while (tm.scanMark.length < nIds) tm.scanMark.push(0); }
    }
  }
  // All-occurrence capture (calls, interactions, counters), encounter and PC–MC bookkeeping and the truth series run
  // every other point interval (2 min): records keep their own event times, so only detection latency changes.
  const even = o.cfg.fullCadence || ((world.tick / o.pointEvery) & 1) === 0;
  if (even) {
    statsMinute(o, world);
    for (const tm of o.teams) tm.called = false;
    processCalls(o, world);
    processInteractions(o, world);
    updateOpen(o, world);
  }
  if (out) for (const tm of o.teams) followStep(o, world, tm);
  if (even) {
    encounterStep(o, world);
    if (o.cfg.lite) return;
    pcmcStep(o, world);
    if (o.cfg.truth) { if (night) truthNight(o, world); else truthMinute(o, world); }
  }
  if (!o.cfg.lite) monthStep(o, world);
}

function processCalls(o: Observer, world: World): void {
  const calls = world.calls;
  let i = calls.length;
  while (i > 0 && calls[i - 1].id > o.callCursor) i--;
  if (i === calls.length) return;
  const byId = index(world).byId, time = world.time, day = world.environment.daylight > 0.1;
  for (; i < calls.length; i++) {
    const call = calls[i];
    o.callCursor = call.id;
    const long = call.kind === 'pant-hoot' || call.kind === 'drum';
    const recorded = long || call.kind === 'food-grunt' || call.kind === 'alarm-hoo';
    const caller = call.callerId > 0 ? byId.get(call.callerId) : undefined;
    for (const tm of o.teams) {
      if (tm.state !== 2) continue;
      if (long && caller && caller.troopId === tm.troop && tm.mark[caller.id] === tm.partyStamp) tm.called = true;
      const dd = d2(call.position[0], call.position[2], tm.x, tm.z);
      if (dd > call.radius * call.radius) continue; // observers hear what the chimps hear
      if (recorded) {
        const context = caller ? (caller.id === tm.focal ? lastFocalCategory(o, tm) : categoryOf(o, world, caller)) : CAT_NONE;
        const rec: CallRec = { t: call.time, team: tm.index, caller: call.callerId, kind: call.kind, troop: call.troopId, dist: Math.sqrt(dd), context };
        // bioacoustic recorder (stage C10): pant-hoots close to the team (within 10% of the hearing radius), every drum heard
        if (call.features && (call.kind === 'drum' || dd <= (0.1 * call.radius) ** 2)) rec.f = call.features.slice();
        if (!o.cfg.demography) o.rec.calls.push(rec);
      }
      // Acoustic encounter (wilson2012): foreign long calls heard by the team, with or without a response. The caller's
      // community is taken from the call (the field attributes calls by distance and direction: an optimistic proxy).
      if (long && call.troopId !== tm.troop && day) {
        const open = tm.encounters.get(call.troopId);
        if (open || !o.cfg.heardNeedsResponse) { touch(o, world, tm, call.troopId, 'heard', call.position[0], call.position[2], 0, 0); const e = tm.encounters.get(call.troopId)!; if (!open) e.t0 = call.time; }
        else if (!tm.heard.some(h => h.other === call.troopId)) tm.heard.push({ t: call.time, other: call.troopId, x: call.position[0], z: call.position[2] });
      }
    }
  }
}

function lastFocalCategory(o: Observer, tm: Team): number {
  const P = o.rec.points, team = tm.index;
  for (let i = P.t.n - 1, k = 0; i >= 0 && k < 6; i--, k++) if (P.team.data[i] === team) return P.cat.data[i];
  return CAT_NONE;
}

function processInteractions(o: Observer, world: World): void {
  const inter = world.interactions;
  let i = inter.length;
  while (i > 0 && inter[i - 1].id > o.interCursor) i--;
  if (i === inter.length) return;
  const byId = index(world).byId, time = world.time, vis = o.vis, vis2 = vis * vis, loud2 = o.cfg.profile.loudM ** 2;
  const T = o.rec.truth;
  for (; i < inter.length; i++) {
    const it = inter[i];
    o.interCursor = it.id;
    T.interactions[it.kind] = (T.interactions[it.kind] ?? 0) + 1;
    if (it.kind === 'mate') T.mates++;
    else if (it.kind === 'console') T.consolations++;
    else if (it.kind === 'patrol') { const pt = (world as SimWorld).sim.patrols[it.troopId], tr = world.troops.find(q => q.id === it.troopId), face = tr ? facingSectors(world, tr) : []; T.patrols.push({ troop: it.troopId, t0: it.start, t1: -1, parts: [], sector: pt ? pt.sector : -1, facing: face.flatMap((n, k) => (n >= 0 ? [k] : [])) }); }
    // detection by the best-placed team
    let detect = 0, team = -1;
    for (let k = 0; k < o.teams.length; k++) {
      const tm = o.teams[k];
      if (tm.state !== 2) continue;
      let d = 0, member = false;
      const parts = it.participants, mark = tm.mark, ps = tm.partyStamp;
      for (let j = 0; j < parts.length; j++) { const id = parts[j]; if (id === tm.focal) { d = 3; break; } if (mark[id] === ps) member = true; }
      if (d === 0) {
        const dd = d2(tm.x, tm.z, it.position[0], it.position[2]);
        if (member || dd <= vis2) d = 1;
        else if (LOUD[it.kind] && dd <= loud2) d = 2;
      }
      if (d > detect) { detect = d; team = k; }
    }
    let ev: EventRec | null = null;
    if (detect > 0 && !UNRECORDED[it.kind]) {
      ev = { id: it.id, t: it.start, end: it.end !== null && it.end <= time ? it.end : -1, kind: it.kind, actor: it.actorId, target: it.targetId, parts: it.participants.slice(), troop: it.troopId, team, detect, x: it.position[0], z: it.position[2] };
      if (!o.cfg.demography) o.rec.events.push(ev);
    }
    if (it.end === null || it.end > time) o.open.push({ it, ev });
    if (it.kind === 'hunt') {
      if (it.end === null) {
        const starter = byId.get(it.actorId);
        const tm = team >= 0 ? o.teams[team] : undefined;
        o.hunts.set(it.id, { id: it.id, team, troop: it.troopId, t0: it.start, t1: -1, prey: starter && starter.action === 'hunt' ? starter.targetId : -1, hunters: [], captures: 0, captors: [],
          detected: detect > 0, partyAM: tm ? countAM(tm.party, byId) : -1, present: tm ? tm.party.slice() : [] });
      } else o.captures.push({ troop: it.troopId, t: it.start, captor: it.actorId, hunters: it.participants.slice(), detected: detect > 0 });
    }
    // post-conflict affiliation (PC–MC and third-party affiliation), only when a team saw it (C3 review: it was omniscient)
    if (AFFILIATIVE[it.kind] && detect > 0) {
      const a = it.actorId, b = it.targetId;
      for (const pc of o.pc) {
        if (it.start > pc.until || it.start < pc.t) continue;
        const c = o.rec.conflicts[pc.conflict];
        if ((a === pc.a && b === pc.b) || (a === pc.b && b === pc.a)) { if (c.pc < 0) c.pc = Math.round((it.start - pc.t) * 60 * 100) / 100; }
        else if (a !== pc.a && a !== pc.b) { if (b === pc.a) c.thirdToWinner = 1; else if (b === pc.b) c.thirdToLoser = 1; }
      }
      for (const mc of o.mcRun) {
        if (it.start > mc.until || it.start < mc.until - o.cfg.pcWindowMin * MIN) continue;
        const c = o.rec.conflicts[mc.conflict];
        if (((a === mc.a && b === mc.b) || (a === mc.b && b === mc.a)) && c.mc < 0) c.mc = Math.round((it.start - (mc.until - o.cfg.pcWindowMin * MIN)) * 60 * 100) / 100;
      }
    }
    // physical intergroup contact
    const actor = byId.get(it.actorId), target = it.targetId > 0 ? byId.get(it.targetId) : undefined;
    if (actor && target && actor.troopId !== target.troopId && (it.kind === 'intergroup' || it.kind === 'kill' || it.kind === 'infanticide' || it.kind === 'coalition' || it.kind === 'fight' || it.kind === 'charge')) {
      for (const tm of o.teams) {
        if (tm.state !== 2) continue;
        const mine = actor.troopId === tm.troop ? actor : target.troopId === tm.troop ? target : undefined;
        if (!mine) continue;
        const other = mine === actor ? target : actor;
        if (tm.party.includes(mine.id) || d2(tm.x, tm.z, it.position[0], it.position[2]) <= vis2) touch(o, world, tm, other.troopId, 'physical', other.position[0], other.position[2], 1, isAdultMale(other) ? 1 : 0);
      }
    }
  }
}

function countAM(ids: number[], byId: Map<number, Chimp>): number { let n = 0; for (const id of ids) { const c = byId.get(id); if (c && isAdultMale(c)) n++; } return n; }

function updateOpen(o: Observer, world: World): void {
  const time = world.time, T = o.rec.truth;
  let k = 0;
  for (let i = 0; i < o.open.length; i++) {
    const e = o.open[i], it = e.it;
    if (it.end === null || it.end > time) { o.open[k++] = e; continue; }
    if (e.ev) { e.ev.end = it.end; e.ev.parts = it.participants.slice(); }
    if (it.kind === 'groom') T.groomMin.push((it.end - it.start) * 60);
    else if (it.kind === 'patrol') {
      for (let j = T.patrols.length - 1; j >= 0; j--) if (T.patrols[j].t0 === it.start && T.patrols[j].troop === it.troopId && T.patrols[j].t1 < 0) { T.patrols[j].t1 = it.end; T.patrols[j].parts = it.participants.slice(); break; }
    } else if (it.kind === 'hunt') { const h = o.hunts.get(it.id); if (h) { h.t1 = it.end; h.hunters = it.participants.slice(); } }
  }
  o.open.length = k;
}

// ---------------------------------------------------------------------------
// Focal follows, point samples, scans
// ---------------------------------------------------------------------------

function followStep(o: Observer, world: World, tm: Team): void {
  if (tm.state === 0 || tm.state === 3) return;
  const byId = index(world).byId, hour = world.hour;
  let c = byId.get(tm.focal);
  if (tm.state === 1) {
    if (!c || !c.alive || c.troopId !== tm.troop) { chooseFocal(o, world, tm); c = byId.get(tm.focal); if (!c) return; }
    const x = sim(c)!;
    const asleep = c.action === 'nest' && x.phase === 2;
    if (hour < 4) return;
    // Track E freeze (e2h-protocol): the team waits under the nest from 04:00, so the follow's start is an observed departure
    // only if the focal was seen in its nest; a focal already out at 04:00 gives a follow without one
    if (asleep && hour < 12) { tm.sawNest = true; return; }
    if (hour >= 18) { tm.state = 3; return; }
    startFollow(o, world, tm, c);
  }
  if (!c || !c.alive || c.troopId !== tm.troop) { endFollow(o, world, tm, false, false); return; }
  const x = sim(c)!;
  if (hour >= 15 && c.action === 'nest' && x.phase === 2) { pointSample(o, world, tm, c); endFollow(o, world, tm, true, false); return; }
  if (hour >= 21) { endFollow(o, world, tm, false, false); return; }
  if (orand(o) < (RUNNING[c.action] || c.position[1] > 15 ? o.pLoseHard : o.pLose)) { endFollow(o, world, tm, false, true); return; }
  if (o.cfg.followMode !== 'focal') c = partyFocal(o, world, tm, c);
  pointSample(o, world, tm, c);
  if (world.tick % o.scanEvery === 0) scan(o, world, tm, c, tm.members);
}

/**
 * Party follows: when the followed party has split since the last sample, stay with the larger subgroup (or the one
 * with more adult males); the team's focal becomes that subgroup's lowest-id adult (or lowest id).
 */
function partyFocal(o: Observer, world: World, tm: Team, c: Chimp): Chimp {
  if (tm.party.length < 2) return c;
  const byId = index(world).byId, males = o.cfg.followMode === 'party-males';
  const size = new Map<number, number>(), am = new Map<number, number>();
  for (const p of world.parties) { if (p.troopId !== tm.troop) continue; size.set(p.id, p.members.length); let k = 0; for (const id of p.members) { const m = byId.get(id); if (m && m.sex === 'male' && m.age >= 15) k++; } am.set(p.id, k); }
  let best = c.partyId, bestV = males ? (am.get(c.partyId) ?? 0) * 1000 + (size.get(c.partyId) ?? 0) : size.get(c.partyId) ?? 0;
  for (const id of tm.party) {
    const m = byId.get(id);
    if (!m || !m.alive || m.troopId !== tm.troop || m.partyId === best) continue;
    const v = males ? (am.get(m.partyId) ?? 0) * 1000 + (size.get(m.partyId) ?? 0) : size.get(m.partyId) ?? 0;
    if (v > bestV) { bestV = v; best = m.partyId; }
  }
  if (best === c.partyId) return c;
  let pick: Chimp | undefined;
  for (const id of tm.party) {
    const m = byId.get(id);
    if (!m || !m.alive || m.partyId !== best) continue;
    const adult = m.age >= 15 && independent(m), pa = pick ? pick.age >= 15 && independent(pick) : false;
    if (!pick || (adult && !pa) || (adult === pa && m.id < pick.id)) pick = m;
  }
  if (!pick) return c;
  tm.focal = pick.id;
  return pick;
}

function startFollow(o: Observer, world: World, tm: Team, c: Chimp): void {
  const x = sim(c)!;
  // Track E freeze (e2h-protocol, janmaat2014's subjects: adult females "all with young offspring (<7 y)", fruit-scarce periods)
  const mother = isAdultFemale(c) && (c.lactating || index(world).alive.some(k => k.motherId === c.id && k.age < 7));
  const fruitIndex = world.environment.fruitIndex;
  const f: Follow = { team: tm.index, troop: tm.troop, focal: c.id, sex: c.sex, lactating: c.lactating, start: world.time, end: -1, complete: false, lost: false,
    sunrise: o.sunrise, sunset: o.sunset, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: x.nestTree, firstTree: -1,
    departure: tm.sawNest, mother, firstFood: -1, fruitIndex, scarce: fruitIndex < paramsOf(world).fruitIndexAtMean };
  o.rec.follows.push(f);
  tm.follow = f; tm.state = 2; tm.x = c.position[0]; tm.z = c.position[2]; tm.sawNest = false;
  tm.visitTree = -1; tm.departX = c.position[0]; tm.departZ = c.position[2]; tm.departT = world.time;
  tm.scanStamp++; tm.scanValid = false; // e5a S2: no previous scan in a new follow
}

function endFollow(o: Observer, world: World, tm: Team, complete: boolean, lost: boolean): void {
  const f = tm.follow;
  if (f) { f.end = world.time; f.complete = complete; f.lost = lost; f.sunset = o.sunset; }
  tm.follow = null; tm.state = 3; tm.party = []; tm.heard.length = 0;
  for (const [other, e] of tm.encounters) closeEncounter(o, tm, other, e);
  tm.encounters.clear();
}

function pointSample(o: Observer, world: World, tm: Team, c: Chimp): void {
  const P = o.rec.points, prof = o.cfg.profile, time = world.time;
  const cx = c.position[0], cz = c.position[2];
  tm.x = cx; tm.z = cz;
  // Party composition, census, neighbours and strangers in sight are updated every other point sample (2 min):
  // parties change over minutes, and this halves the observer's largest cost. The activity sample is every minute.
  if (o.cfg.fullCadence || ((world.tick / o.pointEvery) & 1) === 0 || tm.members.length === 0 || tm.members[0] !== c) partyUpdate(o, world, tm, c);
  const party = tm.party, q = tm.members;
  // being groomed: a groomer in contact is always in the party
  for (let i = 1; i < q.length; i++) { const m = q[i]; if (m.action === 'groom' && m.targetId === c.id && m.alive && sim(m)!.phase >= 1) { o.id.groomed[c.id] = o.stamp; break; } }
  const cat = categoryOf(o, world, c);
  const vis2 = o.vis * o.vis;
  const feed = feedType(c.action, c.targetId, cat);
  let flags = 0;
  if (c.lactating) flags |= P_LACT;
  if (c.swelling >= 0.9) flags |= P_SWOLLEN;
  if (c.carryingMeat > 0.02) flags |= P_MEAT;
  if (tm.called) flags |= P_CALLED;
  if (c.position[1] < 0.6) { flags |= P_GROUND; if (streamCell(world, cx, cz) === CHANNEL) flags |= P_CHANNEL; }
  let truthPatrol = 0;
  if (c.action === 'patrol') for (const e of o.open) if (e.it.kind === 'patrol' && e.it.participants.includes(c.id)) { truthPatrol = 1; break; }
  // demography runs keep only the 5-min location fixes (ranges and the neighbour-pressure kernels read those)
  if (!o.cfg.demography || world.tick % Math.round(5 / 60 / TICK_HOURS) === 0) {
    P.t.push(world.tick); P.team.push(tm.index); P.focal.push(c.id); P.cat.push(cat); P.action.push(ACTION_CODE[c.action]);
    P.height.push(c.position[1] < 0.5 ? 0 : c.position[1] < 5 ? 1 : c.position[1] < 15 ? 2 : 3);
    P.party.push(Math.min(255, party.length)); P.partyInd.push(Math.min(255, tm.pInd)); P.partyAM.push(Math.min(255, tm.pAM));
    P.n5.push(Math.min(255, tm.pN5)); P.n10.push(Math.min(255, tm.pN10)); P.flags.push(flags); P.feed.push(feed); P.tree.push(feed === FEED_FRUIT ? c.targetId : -1);
    P.x.push(cx); P.z.push(cz); P.truthPatrol.push(truthPatrol);
  }
  // the first food item after waking (T-FOOD-10, e2h-protocol: "the first food item eaten after waking up"; water and milk are not food items)
  if (tm.follow!.firstFood < 0 && (feed === FEED_FRUIT || feed === FEED_GROUND || feed === FEED_MEAT)) tm.follow!.firstFood = feed;
  // tree visits (T-FOOD-4..7) and the first feeding tree of the day (T-FOOD-10)
  if (feed === FEED_FRUIT) {
    const t = index(world).treeById.get(c.targetId);
    const f = tm.follow!;
    if (f.firstTree < 0) f.firstTree = c.targetId;
    if (t && (c.targetId !== tm.visitTree || time - tm.departT > 10 * MIN)) {
      const dist = Math.hypot(t.position[0] - tm.departX, t.position[2] - tm.departZ);
      let nearest = true;
      const lim = dist * dist, trees = world.trees;
      // only trees within `dist` can be nearer: the tree grid gives exactly those (the same answer as scanning all trees)
      const n = treesNear(world, tm.departX, tm.departZ, dist, _near);
      for (let k = 0; k < n; k++) { const u = trees[_near[k]]; if (u !== t && u.fruit >= RIPE && d2(u.position[0], u.position[2], tm.departX, tm.departZ) < lim) { nearest = false; break; } }
      // e3b-protocol: the tree's position (resources of trees < 30 m apart, T-FOOD-6) and whether this is a return to the
      // tree of the previous visit, which is not a move to another tree (T-FOOD-5)
      if (!o.cfg.demography) o.rec.visits.push({ team: tm.index, focal: c.id, tree: t.id, t: time, fromX: tm.departX, fromZ: tm.departZ, dist, nearest, outOfSight: dist > prof.treeDetectM,
        tx: t.position[0], tz: t.position[2], ret: t.id === tm.visitTree });
    }
    tm.visitTree = c.targetId; tm.departX = cx; tm.departZ = cz; tm.departT = time;
  }
  // carcasses in view
  for (const b of o.recentDead) {
    if (b.found || time - b.t > 30 * 24 || d2(cx, cz, b.x, b.z) > vis2) continue;
    b.found = true;
    if (o.status.get(b.id) === 'alive') {
      o.status.set(b.id, 'dead'); o.id.ok[b.id] = 0;
      const last = Math.max(o.id.seen[b.id] ?? -1e9, o.roster.get(b.id)?.firstSeen ?? -1e9);
      o.rec.deaths.push({ id: b.id, troop: b.troop, tEst: time, how: 'body', truthTime: b.t, violent: b.violent, cause: b.cause, respiratory: b.respiratory, last, ill: o.id.ill[b.id] >= last - ILL_WINDOW_H });
    }
  }
}

let mark = new Uint8Array(64);

/** Focal party by the chain rule, being-groomed flag, census sightings, 5/10 m neighbours and strangers in sight. */
function partyUpdate(o: Observer, world: World, tm: Team, c: Chimp): void {
  const prof = o.cfg.profile, cx = c.position[0], cz = c.position[2];
  const mates = o.byTroop[tm.troop], indep = o.id.indep;
  const party = tm.party; party.length = 0; party.push(c.id);
  const q = tm.members; q.length = 0;
  const ps = tm.partyStamp = o.stamp, pmark = tm.mark;
  pmark[c.id] = ps;
  const link2 = prof.partyLinkM * prof.partyLinkM;
  // e5a S2 (wilson2001): two animals up to partyBorderLinkM apart also link when both were in the party at the follow's previous scan
  const border2 = tm.scanValid ? prof.partyBorderLinkM * prof.partyBorderLinkM : 0, smark = tm.scanMark, sst = tm.scanStamp;
  const inParty = mark.length >= mates.length ? mark : (mark = new Uint8Array(mates.length * 2));
  inParty.fill(0, 0, mates.length);
  let ind = indep[c.id], am = isAdultMale(c) ? 1 : 0;
  for (let i = 0; i < mates.length; i++) if (mates[i] === c) { inParty[i] = 1; q.push(c); }
  for (let head = 0; head < q.length; head++) {
    const p = q[head], px = p.position[0], pz = p.position[2], pPrev = border2 > 0 && smark[p.id] === sst;
    for (let i = 0; i < mates.length; i++) {
      if (inParty[i]) continue;
      const m = mates[i], dd = d2(px, pz, m.position[0], m.position[2]);
      if (dd <= link2 || (pPrev && dd <= border2 && smark[m.id] === sst)) { inParty[i] = 1; party.push(m.id); pmark[m.id] = ps; q.push(m); ind += indep[m.id]; if (isAdultMale(m)) am++; }
    }
  }
  // census (every community member within visibility is seen today) and neighbours within 5 and 10 m
  const vis2 = o.vis * o.vis;
  let n5 = 0, n10 = 0;
  for (let i = 0; i < mates.length; i++) {
    const m = mates[i];
    const dd = d2(cx, cz, m.position[0], m.position[2]);
    if (inParty[i] || dd <= vis2) markSeen(o, world, tm, m);
    if (dd <= 100 && m !== c && indep[m.id] === 1) { n10++; if (dd <= 25) n5++; }
  }
  if (!o.cfg.lite) earlyLifeSamples(o, world, q);
  // strangers in sight of the focal party (encounter classifier); strangers within 10 m count as neighbours too
  const near = seenStrangers(o, world, tm, vis2, q);
  tm.pInd = ind; tm.pAM = am; tm.pN5 = n5 + (near & 0xff); tm.pN10 = n10 + (near >> 8);
}

/**
 * Stage C8 truth reads on the focal party (early-life-prereg §1.5, §1.6), by estimated age: one early-morning stress
 * reading (06:00–08:00) per day for each immature under 12 and each male of 12 or more (the sim has no diurnal rhythm,
 * so the window only fixes when); and follow-days in the party at 4–15 y, with a urine lean-mass sample (leanIndex, no
 * noise) on every 10th such day (samuni2020: 18.8 ± 19.2 samples per subject; the sampling rule is design).
 */
function earlyLifeSamples(o: Observer, world: World, q: Chimp[]): void {
  const day = world.day, time = world.time, early = world.hour >= 6 && world.hour < 8;
  for (let i = 0; i < q.length; i++) {
    const m = q[i], id = m.id, r = o.roster.get(id);
    if (!r) continue;
    const age = (time - r.birthEst) / YEAR_H;
    if (early && o.id.stressDay[id] !== day && (age < 12 || m.sex === 'male')) { o.id.stressDay[id] = day; o.rec.stress.push({ t: time, id, v: m.stress }); }
    if (o.id.presentDay[id] !== day && age >= 4 && age < 16) {
      o.id.presentDay[id] = day;
      if (++o.id.present[id] % 10 === 0 && sim(m)) o.rec.lean.push({ t: time, id, v: leanIndex(m, paramsOf(world)) });
    }
  }
}

function markSeen(o: Observer, world: World, tm: Team, m: Chimp): void {
  const time = world.time, id = m.id;
  o.id.seen[id] = time;
  if (tm.seenMark[id] !== world.day) { tm.seenMark[id] = world.day; tm.seenToday.push(id); }
  // stage C8 health monitoring: respiratory signs (coughing, lethargy) and visible snare injuries, as field staff record them
  const hx = sim(m);
  if (hx) {
    if (hx.ill > time) { if (!tm.illToday.includes(id)) tm.illToday.push(id); o.id.ill[id] = time; }
    if (hx.snare > 0 && !o.id.snared[id]) { o.id.snared[id] = 1; o.rec.snared.push({ id, t: time }); }
  }
  if (o.id.ok[id] === tm.troop) return;
  const r = o.roster.get(m.id);
  if (r && r.troop === tm.troop && o.status.get(m.id) === 'alive') { o.id.ok[id] = tm.troop; return; }
  if (!r) {
    const b = o.pendingBirths.get(m.id);
    o.pendingBirths.delete(m.id);
    const e = { id: m.id, sex: m.sex, troop: m.troopId, natal: m.natalTroopId, mother: m.motherId, birthEst: time, knownAge: true, founder: false, firstSeen: time };
    o.roster.set(m.id, e); o.rec.roster.push(e); o.status.set(m.id, 'alive');
    o.rec.births.push({ id: m.id, mother: m.motherId, troop: m.troopId, tSeen: time, truthBirth: b ? b.truthBirth : m.birthTime, father: m.fatherId });
    return;
  }
  const st = o.status.get(m.id);
  if (st !== 'alive') {
    o.status.set(m.id, 'alive');
    const k = o.rec.deaths.findIndex(d => d.id === m.id && d.how === 'disappeared');
    if (k >= 0) o.rec.deaths.splice(k, 1);
  }
  if (r.troop !== tm.troop) { o.rec.transfers.push({ id: m.id, from: r.troop, to: tm.troop, tSeen: time }); r.troop = tm.troop; }
}

/** Strangers within visibility of any focal-party member start or extend a "seen" encounter. Returns neighbour counts (n5 | n10 << 8). */
function seenStrangers(o: Observer, world: World, tm: Team, vis2: number, members: Chimp[]): number {
  let reach = 0, n5 = 0, n10 = 0;
  for (let i = 0; i < members.length; i++) { const p = members[i]; const dd = d2(tm.x, tm.z, p.position[0], p.position[2]); if (dd > reach) reach = dd; }
  const lim = Math.sqrt(reach) + Math.sqrt(vis2), lim2 = lim * lim, indep = o.id.indep;
  for (let troop = 0; troop < o.byTroop.length; troop++) {
    const list = o.byTroop[troop];
    if (!list || troop === tm.troop) continue;
    let n = 0, nAM = 0, best = Infinity, sx = 0, sz = 0;
    for (let j = 0; j < list.length; j++) {
      const s = list[j];
      const df = d2(tm.x, tm.z, s.position[0], s.position[2]);
      if (df <= 100 && indep[s.id] === 1) { n10++; if (df <= 25) n5++; }
      if (df > lim2) continue;
      for (let i = 0; i < members.length; i++) {
        const p = members[i];
        const dd = d2(p.position[0], p.position[2], s.position[0], s.position[2]);
        if (dd <= vis2) { n++; if (isAdultMale(s)) nAM++; if (dd < best) { best = dd; sx = s.position[0]; sz = s.position[2]; } break; }
      }
    }
    if (n > 0) touch(o, world, tm, troop, 'seen', sx, sz, n, nAM);
  }
  return Math.min(255, n5) | (Math.min(255, n10) << 8);
}

function scan(o: Observer, world: World, tm: Team, c: Chimp, members: Chimp[]): void {
  const S = o.rec.scans, prof = o.cfg.profile, indep = o.id.indep;
  let ind = 0, am = 0, af = 0, swollen = 0, sx = 0, sz = 0;
  const memOff = S.members.n;
  const sst = ++tm.scanStamp; tm.scanValid = true; // e5a S2: this scan's members, for the borderline links until the next scan
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    tm.scanMark[m.id] = sst;
    S.members.push(m.id);
    ind += indep[m.id];
    if (isAdultMale(m)) am++;
    if (isAdultFemale(m)) { af++; if (m.swelling >= 0.9) swollen++; }
    sx += m.position[0]; sz += m.position[2];
  }
  const n = members.length;
  let prey = -1, preyDist = -1, best = prof.preyEncounterM * prof.preyEncounterM;
  if (world.environment.daylight > 0.3) for (const p of world.prey) for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const dd = d2(m.position[0], m.position[2], p.position[0], p.position[2]);
    if (dd <= best) { best = dd; prey = p.id; preyDist = Math.sqrt(dd); }
  }
  let tree = -1, canopy = 0, feedN = 0;
  const x = sim(c)!;
  if (c.action === 'forage' && c.targetId > 0 && x.phase >= 2) {
    tree = c.targetId; canopy = index(world).treeById.get(tree)?.canopy ?? 0;
    for (let i = 0; i < members.length; i++) { const m = members[i]; if (m.action === 'forage' && m.targetId === tree && sim(m)!.phase >= 2) feedN++; }
  }
  const nearOff = S.near.n;
  let nearN = 0;
  for (const m of o.byTroop[tm.troop]) {
    if (m === c || indep[m.id] !== 1) continue;
    if (d2(c.position[0], c.position[2], m.position[0], m.position[2]) <= 25) { S.near.push(m.id); nearN++; }
  }
  S.t.push(world.tick); S.team.push(tm.index); S.focal.push(c.id); S.size.push(Math.min(255, n)); S.ind.push(Math.min(255, ind)); S.am.push(Math.min(255, am));
  S.af.push(Math.min(255, af)); S.swollen.push(Math.min(255, swollen)); S.prey.push(prey); S.preyDist.push(preyDist); S.tree.push(tree); S.canopy.push(canopy); S.feedN.push(Math.min(255, feedN));
  S.cx.push(sx / n); S.cz.push(sz / n); S.memOff.push(memOff); S.memN.push(Math.min(255, n)); S.nearOff.push(nearOff); S.nearN.push(Math.min(255, nearN));
}

// ---------------------------------------------------------------------------
// Encounters (all-occurrence, field definition; wilson2012)
// ---------------------------------------------------------------------------

function touch(o: Observer, world: World, tm: Team, other: number, kind: 'heard' | 'seen' | 'physical', sx: number, sz: number, n: number, nAM: number): void {
  let e = tm.encounters.get(other);
  const time = world.time;
  if (!e) {
    const byId = index(world).byId;
    const d0 = Math.hypot(tm.x - sx, tm.z - sz);
    let patrolling = false;
    for (const x of o.open) if (x.it.kind === 'patrol' && x.it.troopId === tm.troop && x.it.participants.includes(tm.focal)) { patrolling = true; break; }
    e = { other, t0: time, tLast: time, seen: false, heard: false, physical: false, ownSize: tm.party.length, ownAM: countAM(tm.party, byId), otherSize: 0, otherAM: 0,
      srcX: sx, srcZ: sz, d0, dMin: d0, dMax: d0, called: false, x: tm.x, z: tm.z, patrolling };
    tm.encounters.set(other, e);
  }
  e.tLast = time;
  if (kind === 'heard') e.heard = true; else if (kind === 'seen') e.seen = true; else e.physical = true;
  if (n > e.otherSize) e.otherSize = n;
  if (nAM > e.otherAM) e.otherAM = nAM;
}

function encounterStep(o: Observer, world: World): void {
  const time = world.time, gap = o.cfg.encounterGapMin * MIN, resp = o.cfg.heardResponseMin * MIN, vocal = o.cfg.encounterResponseMin * MIN;
  const byId = index(world).byId;
  for (const tm of o.teams) {
    if (tm.state !== 2) continue;
    // heard stranger calls become encounters once a party member responds (wilson2012)
    for (let k = tm.heard.length - 1; k >= 0; k--) {
      const h = tm.heard[k];
      if (time - h.t > resp) { tm.heard.splice(k, 1); continue; }
      let responded = false;
      for (const id of tm.party) { const m = byId.get(id); if (m && RESPONSE[m.action]) { responded = true; break; } }
      if (responded) { tm.heard.splice(k, 1); touch(o, world, tm, h.other, 'heard', h.x, h.z, 0, 0); const e = tm.encounters.get(h.other)!; if (e.t0 === time) e.t0 = h.t; }
    }
    for (const [other, e] of tm.encounters) {
      if (time - e.t0 <= vocal) { const d = Math.hypot(tm.x - e.srcX, tm.z - e.srcZ); if (d < e.dMin) e.dMin = d; if (d > e.dMax) e.dMax = d; }
      if (tm.called && time - e.t0 <= vocal) e.called = true;
      if (time - e.tLast > gap) { closeEncounter(o, tm, other, e); tm.encounters.delete(other); }
    }
  }
}

function closeEncounter(o: Observer, tm: Team, other: number, e: OpenEncounter): void {
  const a = o.cfg.profile.approachM;
  const approach = e.d0 - e.dMin >= a;
  const rec: EncounterRec = { team: tm.index, troop: tm.troop, other, t0: e.t0, t1: e.tLast, modality: e.physical ? 'physical' : e.seen ? 'seen' : 'heard',
    ownSize: e.ownSize, ownAM: e.ownAM, otherSize: e.otherSize, otherAM: e.otherAM, approach, avoid: !approach && e.dMax - e.d0 >= a, called: e.called, x: e.x, z: e.z, patrolling: e.patrolling };
  o.rec.encounters.push(rec);
}

// ---------------------------------------------------------------------------
// PC–MC (post-conflict / matched-control) scheduling
// ---------------------------------------------------------------------------

function pcmcStep(o: Observer, world: World): void {
  const time = world.time, win = o.cfg.pcWindowMin * MIN, byId = index(world).byId;
  let k = 0;
  for (let i = 0; i < o.pc.length; i++) {
    const pc = o.pc[i];
    if (time <= pc.until) { o.pc[k++] = pc; continue; }
    insertByDue(o.mc, { conflict: pc.conflict, a: pc.a, b: pc.b, due: pc.t + 24, tries: 0, until: -1 });
  }
  o.pc.length = k;
  // running MC windows
  k = 0;
  for (let i = 0; i < o.mcRun.length; i++) {
    const mc = o.mcRun[i];
    if (time > mc.until) { const c = o.rec.conflicts[mc.conflict]; if (c.mc === -3) c.mc = -1; continue; }
    o.mcRun[k++] = mc;
  }
  o.mcRun.length = k;
  // Waiting MCs are in due order (every due is a conflict time + 24 h, or a retry + 24 h), so only the head can be due.
  if (!o.mc.length || time < o.mc[0].due) return;
  const vis = visibility(o, world);
  const retry: typeof o.mc = [];
  k = 0;
  for (let i = 0; i < o.mc.length; i++) {
    const mc = o.mc[i], c = o.rec.conflicts[mc.conflict];
    if (time < mc.due) { o.mc[k++] = mc; continue; }
    const a = byId.get(mc.a), b = byId.get(mc.b);
    // matched control: same time on the next possible day with the former opponent in view (de Waal & Yoshihara 1983),
    // observed by a team following one of the pair (in its party or in view). C3 review: MCs were recorded omnisciently.
    if (a && b && a.alive && b.alive && a.troopId === b.troopId && world.environment.daylight > 0.5 && d2(a.position[0], a.position[2], b.position[0], b.position[2]) <= vis * vis && observed(o, a, b, vis)) {
      mc.until = time + win; c.mc = -3; o.mcRun.push(mc);
    } else if (++mc.tries >= 5 || !a || !b || !a.alive || !b.alive) { c.mc = -2; }
    else { mc.due += 24; retry.push(mc); }
  }
  o.mc.length = k;
  for (const mc of retry) insertByDue(o.mc, mc);
}

/** Night truth: the 22:00 nest census and cycle tracking (everyone is in a night nest; nothing else changes). */
function truthNight(o: Observer, world: World): void {
  const T = o.rec.truth, day = world.day, S = o.id;
  if (world.hour >= 22 - 1e-9 && o.nestDay !== day) {
    o.nestDay = day;
    let weaned = 0, nested = 0;
    for (const c of index(world).alive) { const x = sim(c); if (!x || !x.weaned) continue; weaned++; if (c.action === 'nest' && x.phase === 2 && c.position[1] > 4) nested++; }
    if (weaned) T.nestFrac.push(nested / weaned);
  }
  if (world.tick % (o.pointEvery * 10) !== 0) return;
  for (const c of index(world).alive) {
    if (c.sex !== 'female') continue;
    const id = c.id, pc = S.cycle[id], cd = c.cycleDay;
    if (pc === cd || id >= S.cycle.length) continue;
    if (pc >= 0 && cd >= 0 && cd < pc) S.wraps[id]++;
    if (pc < 0 && cd >= 0) S.wraps[id] = 0;
    if (pc >= 0 && cd < 0 && c.pregnancy > 0) { T.cycles.push(S.wraps[id] + 1); S.wraps[id] = 0; }
    S.cycle[id] = cd;
  }
}

/** A following team has a or b in its current party or within visibility. */
function observed(o: Observer, a: Chimp, b: Chimp, vis: number): boolean {
  for (const tm of o.teams) {
    if (tm.state !== 2) continue;
    if (tm.mark[a.id] === tm.partyStamp || tm.mark[b.id] === tm.partyStamp) return true;
    if (d2(tm.x, tm.z, a.position[0], a.position[2]) <= vis * vis || d2(tm.x, tm.z, b.position[0], b.position[2]) <= vis * vis) return true;
  }
  return false;
}

/** Keeps waiting MCs sorted by due time (ties by conflict index). */
function insertByDue<T extends { due: number; conflict: number }>(list: T[], mc: T): void {
  let lo = 0, hi = list.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; const m = list[mid]; if (m.due < mc.due || (m.due === mc.due && m.conflict < mc.conflict)) lo = mid + 1; else hi = mid; }
  list.splice(lo, 0, mc);
}

// ---------------------------------------------------------------------------
// Truth series (omniscient; for observation bias)
// ---------------------------------------------------------------------------

function truthMinute(o: Observer, world: World): void {
  const T = o.rec.truth, env = world.environment, hour = world.hour, day = world.day, alive = index(world).alive, S = o.id;
  const daylit = env.daylight > 0.5, morning = hour > 4 && hour < 12, evening = hour > 15, actM = T.activity.male, actF = T.activity.female;
  const groundCheck = world.tick % (o.pointEvery * 10) === 0; // stream-channel occupancy every 10 min is plenty for a share
  // the per-individual truth series (path, activity, wake and settle times, cycles) every 6 min (every 2 with fullCadence):
  // observer cost (C5a review); truth is instrument validation, not a target
  const step = o.cfg.fullCadence ? 2 : 6;
  const indiv = world.tick % (o.pointEvery * step) === 0;
  if (indiv && daylit) for (let i = 0; i < alive.length; i++) { const c = alive[i]; if (c.action === 'groom' && c.targetId > 0 && c.targetId < S.groomed.length && sim(c)!.phase >= 1) S.groomed[c.targetId] = o.stamp; }
  if (indiv) for (let i = 0; i < alive.length; i++) {
    const c = alive[i], id = c.id;
    const x = sim(c)!;
    const px = c.position[0], pz = c.position[2];
    if (c.age >= 15) {
      const lx = S.px[id];
      if (lx === lx) S.path[id] += Math.hypot(px - lx, pz - S.pz[id]);
      S.px[id] = px; S.pz[id] = pz;
      if (daylit) { const cat = categoryOf(o, world, c); if (cat !== CAT_NONE) (c.sex === 'male' ? actM : actF)[cat]++; }
    }
    if (x.weaned) {
      if (morning && c.action !== 'nest' && S.left[id] !== day) { S.left[id] = day; if (day > 1) T.wakeMin.push((hour - o.sunrise) * 60); }
      if (evening && c.action === 'nest' && x.phase === 2 && S.settled[id] !== day) { S.settled[id] = day; T.settleMin.push((hour - o.sunset) * 60); }
    }
    if (groundCheck && c.position[1] < 0.6) { T.ground++; if (streamCell(world, px, pz) === CHANNEL) T.channel++; }
    if (c.sex === 'female') {
      if (c.swelling >= 0.95 && daylit) T.swollenDayHours += step * MIN;
      const pc = S.cycle[id], cd = c.cycleDay;
      if (pc !== cd) {
        if (pc >= 0 && cd >= 0 && cd < pc) S.wraps[id]++;
        if (pc < 0 && cd >= 0) S.wraps[id] = 0;
        if (pc >= 0 && cd < 0 && c.pregnancy > 0) { T.cycles.push(S.wraps[id] + 1); S.wraps[id] = 0; }
        S.cycle[id] = cd;
      }
    }
  }
  if (world.tick % 8 === 0 && env.daylight > 0.9) {
    const byId = index(world).byId;
    for (const t of world.troops) {
      let members = 0;
      for (const c of o.byTroop[t.id] ?? []) members += o.id.indep[c.id];
      if (!members) continue;
      let biggest = 0;
      for (const p of world.parties) { if (p.troopId !== t.id) continue; let k = 0; for (const id of p.members) { const c = byId.get(id); if (c && c.alive) k += o.id.indep[id]; } if (k > biggest) biggest = k; }
      T.largestFrac.push(biggest / members); T.wholeFrac.push(biggest === members ? 1 : 0);
    }
  }
  if (hour >= 22 - 1e-9 && o.nestDay !== day) {
    o.nestDay = day;
    let weaned = 0, nested = 0;
    for (const c of alive) { const x = sim(c); if (!x || !x.weaned) continue; weaned++; if (c.action === 'nest' && x.phase === 2 && c.position[1] > 4) nested++; }
    if (weaned) T.nestFrac.push(nested / weaned);
  }
}

// ---------------------------------------------------------------------------
// Daily and monthly protocols
// ---------------------------------------------------------------------------

const MONTH_H = 24 * 365 / 12;

function monthStep(o: Observer, world: World): void {
  const m = Math.floor(world.time / MONTH_H);
  if (m !== o.lastMonth) { o.lastMonth = m; o.monthPending = true; }
  if (!o.monthPending || world.hour < 12 || world.hour >= 13) return;
  o.monthPending = false;
  const byTree = index(world).treeById;
  for (const id of o.phenTrees) { const t = byTree.get(id)!; o.rec.phenology.push({ month: m, tree: id, species: t.species, fruit: Math.round(t.fruit * 1e4) / 1e4, ripe: t.fruit >= RIPE }); }
  const strip = o.cfg.profile.treeDetectM;
  for (const t of world.troops) {
    const l = o.lines[t.id];
    let len = 0, fruiting = 0;
    for (let k = 0; k < l.length; k += 4) {
      const ax = l[k], az = l[k + 1], bx = l[k + 2], bz = l[k + 3];
      const L = Math.hypot(bx - ax, bz - az);
      len += L;
      for (const tr of world.trees) {
        if (tr.fruit < RIPE) continue;
        const px = tr.position[0] - ax, pz = tr.position[2] - az, u = (px * (bx - ax) + pz * (bz - az)) / (L * L);
        if (u < 0 || u > 1) continue;
        const qx = ax + u * (bx - ax), qz = az + u * (bz - az);
        if (d2(tr.position[0], tr.position[2], qx, qz) <= strip * strip) fruiting++;
      }
    }
    o.rec.transects.push({ month: m, troop: t.id, lengthM: len, fruiting });
  }
  o.rec.fruitIndex.push(world.environment.fruitIndex); o.rec.fruitMonth.push(m);
}

/** At 04:00: choose the day's focals. At 21:00: close the day's follows, write the census and daily records. */
export function dayStep(o: Observer, world: World, init: boolean): void {
  ensureTeams(o, world);
  const hour = world.hour;
  if (init || hour < 21) {
    for (const tm of o.teams) { if (tm.state === 2) endFollow(o, world, tm, false, false); chooseFocal(o, world, tm); }
    return;
  }
  const time = world.time, byId = index(world).byId;
  for (const tm of o.teams) {
    if (tm.state === 2) endFollow(o, world, tm, false, false);
    tm.state = 0;
    o.rec.census.push({ day: world.day, troop: tm.troop, ids: tm.seenToday.slice().sort((a, b) => a - b) });
    tm.seenToday.length = 0;
    if (tm.illToday.length) o.rec.health.push({ day: world.day, troop: tm.troop, ids: tm.illToday.slice().sort((a, b) => a - b) });
    tm.illToday.length = 0;
  }
  // disappearances: not seen for disappearDays and not a natal female of dispersal age (design §3.5)
  for (const [id, st] of o.status) {
    if (st !== 'alive') continue;
    const r = o.roster.get(id)!, last = Math.max(o.id.seen[id] ?? -1e9, r.firstSeen);
    if (time - last <= o.cfg.disappearDays * 24) continue;
    const ageEst = (time - r.birthEst) / (365.25 * 24);
    const disperser = r.sex === 'female' && r.troop === r.natal && ageEst >= 9 && ageEst < 16;
    o.status.set(id, disperser ? 'gone' : 'dead'); o.id.ok[id] = 0;
    if (!disperser) {
      const c = byId.get(id);
      const b = o.recentDead.find(d => d.id === id);
      o.rec.deaths.push({ id, troop: r.troop, tEst: (last + time) / 2, how: 'disappeared', truthTime: c && !c.alive ? c.deathTime ?? -1 : -1, violent: b ? b.violent : false,
        cause: 'unknown', respiratory: false, last, ill: o.id.ill[id] >= last - ILL_WINDOW_H });
    }
  }
  o.rec.living.push({ day: world.day, n: index(world).alive.length });
  for (const t of world.troops) {
    o.rec.alpha.push({ day: world.day, troop: t.id, id: t.alphaId });
    o.rec.femaleOrder.push({ day: world.day, troop: t.id, ids: t.femaleHierarchy.slice() });
    if (o.alphaPrev.get(t.id) !== t.alphaId) { if (t.alphaId > 0) o.rec.truth.alphaChanges++; o.alphaPrev.set(t.id, t.alphaId); }
  }
}

function chooseFocal(o: Observer, world: World, tm: Team): void {
  const byId = index(world).byId, day = world.day;
  const malesOnly = o.cfg.followMode === 'party-males';
  const eligible = (id: number) => { const c = byId.get(id); return !!c && c.alive && c.troopId === tm.troop && c.age >= 15 && independent(c) && (!malesOnly || c.sex === 'male'); };
  if (day - tm.blockStart >= o.cfg.rotationBlockDays || !tm.rotation.some(eligible)) {
    // balanced random order over eligible adults, males and females separately, interleaved (design §3.3)
    const males: number[] = [], females: number[] = [];
    for (const c of index(world).alive) if (c.troopId === tm.troop && eligible(c.id)) (c.sex === 'male' ? males : females).push(c.id);
    males.sort((a, b) => a - b); females.sort((a, b) => a - b);
    for (const l of [males, females]) for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(orand(o) * (i + 1)); const t = l[i]; l[i] = l[j]; l[j] = t; }
    const first = orand(o) < 0.5 ? males : females, second = first === males ? females : males;
    tm.rotation = [];
    for (let i = 0; i < Math.max(males.length, females.length); i++) { if (i < first.length) tm.rotation.push(first[i]); if (i < second.length) tm.rotation.push(second[i]); }
    tm.rotIdx = 0; tm.blockStart = day;
  }
  tm.focal = -1; tm.state = 3; tm.sawNest = false;
  for (let k = 0; k < tm.rotation.length; k++) {
    const id = tm.rotation[(tm.rotIdx + k) % tm.rotation.length];
    if (eligible(id)) { tm.focal = id; tm.rotIdx = (tm.rotIdx + k + 1) % tm.rotation.length; tm.state = 1; break; }
  }
}

// ---------------------------------------------------------------------------
// End of run
// ---------------------------------------------------------------------------

/** Closes open follows and encounters, links hunts to captures and fills the end-of-run truth. */
export function finishProtocols(o: Observer, world: World): void {
  for (const tm of o.teams) if (tm.state === 2) endFollow(o, world, tm, false, false);
  const T = o.rec.truth;
  for (const h of o.hunts.values()) {
    if (h.t1 < 0) continue;
    for (const c of o.captures) if (c.troop === h.troop && Math.abs(c.t - h.t1) < 1e-9) { h.captures++; h.captors.push(c.captor); }
    o.rec.hunts.push(h);
  }
  for (const c of o.captures) T.huntHunters.push(c.hunters.length);
  const alive = index(world).alive;
  T.popEnd = alive.length;
  for (let id = 0; id < o.id.path.length; id++) if (o.id.path[id] > 0) T.pathM[id] = o.id.path[id];
  const s0 = o.statsStart, st = world.stats;
  T.hunts = st.hunts - s0.hunts; T.huntSuccesses = st.huntSuccesses - s0.huntSuccesses; T.killings = st.killings - s0.killings;
  T.conflicts = st.conflicts - s0.conflicts; T.reconciliations = st.reconciliations - s0.reconciliations;
  let dyads = 0, tense = 0;
  for (const a of alive) { const x = sim(a); if (!x) continue; for (const b of alive) if (a !== b && a.troopId === b.troopId) { dyads++; if ((x.tension[b.id] ?? 0) >= 0.35) tense++; } }
  T.tenseShare = tense / Math.max(1, dyads);
  T.rangeShift = Math.max(...world.troops.map((t, i) => Math.hypot(t.center[0] - o.start.centers[i][0], t.center[2] - o.start.centers[i][1])));
  o.rec.ticks = world.tick - o.tick0; o.rec.days = (world.time - o.time0) / 24;
}
