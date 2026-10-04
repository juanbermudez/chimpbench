// Stage E4j intergroup encounter diagnosis (development tool; reads only; docs/staging/e4j-prereg.md §3). The world and
// the observers are e-bench's (src/field/run.ts runFieldJob: focal team set at observer seed 1, party-larger at
// 1 + 7919, party-males at 1 + 2·7919), without the field experiments (they run on copies of the world and change
// nothing in it), so the follows, the encounter records and the T-IGE / T-PAT / T-BRD rows are e-bench's (tool check:
// T-IGE-1 per seed equals e-bench's). It reads the world and the observers' state after each step and calls no
// function that writes either (territory readers cache by stamp, as patrol-diagnose.ts relies on).
//
// Context of an animal now (`ctxOf`, in this order): 'patrol' = on its community's organized patrol (in the patrol's
//   file, action 'patrol', not an approach); 'pursuit' = approaching heard strangers (action 'patrol' with the APPROACH
//   tag) or charging, displaying or attacking strangers (STRANGER, GANG tags); 'incursion' = outside its own 95% use
//   isopleth and inside a neighbour's; 'border-forage' / 'border-other' = own use isopleth >= peripheryLevel (0.8: the
//   periphery, or beyond the own range edge without a neighbour's range) feeding / doing anything else;
//   'core-forage' / 'core-other' = inside the 0.8 isopleth.
// Calls (truth): every long call (pant-hoot, drum) emitted in daylight > 0.1 (the hearing rule of perception.ts and of
//   the observer): caller's context, value tag of its act, whether it answers strangers (heard a stranger long call in
//   the last 0.2 h, or strangers in view), whether it is on its community's patrol (in an active patrol's file), and
//   for each other community the members within the call's radius (count, nearest distance, nearest one's context,
//   any on that community's patrol). The value tag is read after the tick, so a call act that ends in its own tick shows
//   the next act's tag; `answers` (the community answered, -1 none) is the reliable flag for counter-calls.
// Hearing episodes (truth): community L hears community C (any L member within the radius of a C long call in daylight
//   > 0.1); a new episode when L last heard C more than 60 min before (the observer's encounterGapMin, wilson2012's
//   1-h rule). Each episode keeps the first call's caller context and answer flag, the nearest listener's context and
//   distance, whether an L listener was on L's patrol (then the patrol's index), whether C's caller stood inside L's 95%
//   isopleth, and whether the party-larger observer of L recorded an encounter with C overlapping it ('counted'), or
//   had a team following (state 2) at its start ('followed').
// Seen contacts (truth): at each party update, parties of different communities whose closest members are within the
//   simulation's sight distance (parties.ts detectEncounters: sightDayM × daylight × (1 − 0.3·rain), daylight >= 0.15);
//   one per community pair until 60 min without a sighting; contexts of both closest members; patrol involvement.
// Patrols (truth): every organized patrol from start to end: troop, leader, start, end, most adult males on it at once,
//   whether its leader entered a neighbour's 95% isopleth, hearing episodes and seen contacts with a member on it,
//   party-larger observer encounters that started while the team's focal was on it.
// Observer (party-larger team set, the T-IGE-1 follows): every encounter at its opening (the observer's own record,
//   read from its open-encounter map after each step): the followed focal's context, the team's place (own and
//   neighbours' use isopleths), the opening call (the nearest long call of that community at the encounter's start;
//   the team may have moved a few metres since the observer tested the radius) with its logged caller context and
//   distance, seen or heard, the observer's own
//   'patrolling' flag, whether another neighbour's encounter was open at the same time ('concurrent'), the team's
//   community's use isopleth at the call (cLevelL) and the call's and the team's distances from that community's centre in
//   equal-area radii (cRL, tRL): wilson2012 attributed distant calls to other communities by distance and direction
//   toward or beyond the range edge.
//   Follow exposure: per tick with a team following, the focal's context class (hours), so encounters per follow-hour
//   split into exposure × rate.
// Rows: T-IGE-1..3, T-PAT-1..3, -5..7, T-BRD-1 per seed as runFieldJob computes them (value, num, den, parts), the
//   patrol classifier's precision and recall (focal and male-party team sets) and the encounter classifier's accuracy on
//   party follows; stats.intergroupEncounters (12-h community-pair episodes) over the window; deaths by cause.
//
//   pnpm exec tsx scripts/e4j-encounter-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { patrolAccuracy } from '../src/field/classifiers';
import { PROFILES, TARGET_FOLLOW } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer } from '../src/field/observer';
import { encounterAccuracy } from '../src/field/run';
import { createWorld, tickWorld } from '../src/simulation';
import { V } from '../src/sim/candidates';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { TICK_HOURS, index, ix, simOf } from '../src/sim/state';
import { cellAt, gridOf, useLevels } from '../src/sim/territory';
import type { Call, Chimp, Party } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760, GAP_H = 1, ANSWER_H = 0.2;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w), g = gridOf(w, P);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
const base = { profile: PROFILES.field, truth: true, demography: false };
const obs = createObserver(w, { ...base, seed: 1 });
const pobs = createObserver(w, { ...base, seed: 1 + 7919, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
const mobs = createObserver(w, { ...base, seed: 1 + 2 * 7919, followMode: 'party-males', lite: true, pointIntervalMin: 1 });

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const tally = (v: (string | number)[]) => v.reduce((a, k) => { a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {} as Record<string, number>);
const VNAME = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k])) as Record<number, string>;
const LONG = (k: string) => k === 'pant-hoot' || k === 'drum';

/** Own use isopleth at (x, z) for community `troop`, and the first other community whose 95% isopleth holds the point. */
function placeOf(troop: number, x: number, z: number): { own: number; inOther: number } {
  const L = useLevels(w), k = cellAt(g, x, z);
  let inOther = -1;
  for (const t of w.troops) if (t.id !== troop && L[t.id] && L[t.id][k] <= P.udRangeLevel) { inOther = t.id; break; }
  return { own: L[troop] ? r3(L[troop][k]) : 1, inOther };
}
function onPatrol(c: Chimp): boolean {
  const pt = s.patrols[c.troopId];
  return !!pt && pt.file.includes(c.id) && c.action === 'patrol' && ix(c).v !== V.APPROACH;
}
function ctxOf(c: Chimp): string {
  const x = ix(c);
  if (onPatrol(c)) return 'patrol';
  if ((c.action === 'patrol' && x.v === V.APPROACH) || ((c.action === 'charge' || c.action === 'display' || c.action === 'attack') && (x.v === V.STRANGER || x.v === V.GANG))) return 'pursuit';
  const pl = placeOf(c.troopId, c.position[0], c.position[2]);
  if (pl.own > P.udRangeLevel && pl.inOther >= 0) return 'incursion';
  const feeding = c.action === 'forage';
  if (pl.own >= P.peripheryLevel) return feeding ? 'border-forage' : 'border-other';
  return feeding ? 'core-forage' : 'core-other';
}
/** The animal answers strangers: it heard a stranger long call in the last ANSWER_H h, or strangers are in view. */
function answering(c: Chimp): number {
  const x = ix(c);
  if (x.strangers > 0) return x.strangerTroop;
  return w.time - x.heardAt < ANSWER_H && x.heardTroop > 0 ? x.heardTroop : -1;
}

// ---------------------------------------------------------------------------------------------------------------- calls
interface Heard { troop: number; n: number; dmin: number; ctx: string; patrol: boolean }
interface CallLog { id: number; t: number; kind: string; caller: number; troop: number; am: boolean; ctx: string; v: string; answers: number; patrol: boolean; own: number; inOther: number; heard: Heard[] }
const calls: CallLog[] = [], callById = new Map<number, CallLog>();
let callCursor = w.calls.length ? w.calls[w.calls.length - 1].id : 0;

// hearing episodes: key `${L}|${C}`
interface Episode { L: number; C: number; t0: number; t1: number; calls: number; call: number; cctx: string; cv: string; answers: number; cpatrol: boolean; cInL: boolean; lctx: string; dmin: number; lpatrol: number; counted: boolean; followed: boolean; encSeen: boolean }
const episodes: Episode[] = [], openEp = new Map<string, Episode>();
const patrolIdx = new Map<number, number>(); // troop → index into patrols of the patrol under way

function logCalls(): void {
  const byId = index(w).byId, alive = index(w).alive;
  for (let i = 0; i < w.calls.length; i++) {
    const call: Call = w.calls[i];
    if (call.id <= callCursor) continue;
    callCursor = call.id;
    if (!LONG(call.kind) || w.environment.daylight <= 0.1) continue;
    const caller = byId.get(call.callerId);
    if (!caller) continue;
    const pl = placeOf(call.troopId, call.position[0], call.position[2]);
    const pt = s.patrols[call.troopId];
    const heard: Heard[] = [];
    for (const t of w.troops) {
      if (t.id === call.troopId) continue;
      let n = 0, dmin = Infinity, near: Chimp | undefined, pat = false;
      for (const o of alive) {
        if (!o.alive || o.troopId !== t.id) continue;
        const d = Math.hypot(o.position[0] - call.position[0], o.position[2] - call.position[2]);
        if (d > call.radius) continue;
        n++;
        if (d < dmin) { dmin = d; near = o; }
        if (onPatrol(o)) pat = true;
      }
      if (n > 0) heard.push({ troop: t.id, n, dmin: Math.round(dmin), ctx: near ? ctxOf(near) : '?', patrol: pat });
    }
    const rec: CallLog = { id: call.id, t: r3(call.time), kind: call.kind, caller: caller.id, troop: call.troopId, am: isAdultMale(caller), ctx: ctxOf(caller), v: VNAME[ix(caller).v] ?? String(ix(caller).v),
      answers: answering(caller), patrol: !!pt && pt.file.includes(caller.id), own: pl.own, inOther: pl.inOther, heard };
    calls.push(rec); callById.set(call.id, rec);
    for (const h of heard) {
      const key = `${h.troop}|${call.troopId}`;
      let e = openEp.get(key);
      if (!e || call.time - e.t1 > GAP_H) {
        const lp = placeOf(h.troop, call.position[0], call.position[2]);
        e = { L: h.troop, C: call.troopId, t0: call.time, t1: call.time, calls: 0, call: call.id, cctx: rec.ctx, cv: rec.v, answers: rec.answers, cpatrol: rec.patrol, cInL: lp.own <= P.udRangeLevel,
          lctx: h.ctx, dmin: h.dmin, lpatrol: h.patrol ? (patrolIdx.get(h.troop) ?? -1) : -2, counted: false, followed: false, encSeen: false };
        e.followed = pobs.teams.some(tm => tm.troop === h.troop && tm.state === 2);
        episodes.push(e); openEp.set(key, e);
      }
      e.t1 = call.time; e.calls++;
      if (h.dmin < e.dmin) e.dmin = h.dmin;
      if (h.patrol && e.lpatrol < -1) e.lpatrol = patrolIdx.get(h.troop) ?? -1;
    }
  }
}

// --------------------------------------------------------------------------------------------------------- seen contacts
interface Seen { a: number; b: number; t0: number; t1: number; actx: string; bctx: string; d: number; patrol: boolean }
const seenEps: Seen[] = [], openSeen = new Map<string, Seen>();
let lastParties: Party[] | null = null;
function logSeen(): void {
  if (w.parties === lastParties) return;
  lastParties = w.parties;
  const env = w.environment;
  if (env.daylight < 0.15) return;
  const sight = P.sightDayM * env.daylight * (1 - 0.3 * env.rain), byId = index(w).byId, ps = w.parties;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (a.troopId === b.troopId) continue;
    const dc = Math.hypot(a.center[0] - b.center[0], a.center[2] - b.center[2]);
    if (dc > sight + P.encounterPartyMarginM) continue;
    let best = Infinity, ca: Chimp | undefined, cb: Chimp | undefined;
    for (const ia of a.members) { const pa = byId.get(ia)!; for (const ib of b.members) { const pb = byId.get(ib)!; const d = Math.hypot(pa.position[0] - pb.position[0], pa.position[2] - pb.position[2]); if (d < best) { best = d; ca = pa; cb = pb; } } }
    if (!ca || !cb || best > sight) continue;
    const lo = Math.min(a.troopId, b.troopId), hi = Math.max(a.troopId, b.troopId), key = `${lo}|${hi}`;
    let e = openSeen.get(key);
    const [cl, ch] = ca.troopId === lo ? [ca, cb] : [cb, ca];
    if (!e || w.time - e.t1 > GAP_H) {
      e = { a: lo, b: hi, t0: r3(w.time), t1: w.time, actx: ctxOf(cl), bctx: ctxOf(ch), d: Math.round(best), patrol: onPatrol(cl) || onPatrol(ch) };
      seenEps.push(e); openSeen.set(key, e);
    }
    e.t1 = w.time;
    if (onPatrol(cl) || onPatrol(ch)) e.patrol = true;
  }
}

// --------------------------------------------------------------------------------------------------------------- patrols
interface PatrolRec { troop: number; leader: number; t0: number; t1: number | null; maxAM: number; incursion: boolean; hear: number; seen: number; obsEnc: number; followedByTeam: boolean }
const patrols: PatrolRec[] = [];
const openPatrol = new Map<number, { obj: object; i: number }>();
function trackPatrols(): void {
  const byId = index(w).byId;
  for (const t of w.troops) {
    const p = s.patrols[t.id], cur = openPatrol.get(t.id);
    if (cur && (!p || cur.obj !== p)) { patrols[cur.i].t1 = r3(w.time); openPatrol.delete(t.id); patrolIdx.delete(t.id); }
    if (!p) continue;
    let o = openPatrol.get(t.id);
    if (!o) { o = { obj: p, i: patrols.length }; openPatrol.set(t.id, o); patrolIdx.set(t.id, o.i); patrols.push({ troop: t.id, leader: p.leaderId, t0: r3(w.time), t1: null, maxAM: 0, incursion: false, hear: 0, seen: 0, obsEnc: 0, followedByTeam: false }); }
    const rec = patrols[o.i];
    let am = 0;
    for (const id of p.file) { const m = byId.get(id); if (m && m.alive && m.action === 'patrol' && isAdultMale(m)) am++; }
    if (am > rec.maxAM) rec.maxAM = am;
    const L = byId.get(p.leaderId);
    if (L && L.alive && !rec.incursion) { const pl = placeOf(t.id, L.position[0], L.position[2]); if (pl.own > P.udRangeLevel && pl.inOther >= 0) rec.incursion = true; }
    for (const tm of pobs.teams) if (tm.troop === t.id && tm.state === 2 && p.file.includes(tm.focal) && byId.get(tm.focal)?.action === 'patrol') rec.followedByTeam = true;
  }
}

// ------------------------------------------------------------------------------------------------- observer (party-larger)
interface ObsEnc { team: number; troop: number; other: number; t0: number; seen: boolean; heard: boolean; patrolling: boolean; fctx: string; own: number; inOther: number;
  dist: number | null; kind: string | null; cctx: string | null; cv: string | null; answers: number | null; cpatrol: boolean | null; cInL: boolean | null; concurrent: number; patrol: number;
  /** The team's community's use isopleth at the call, and the call's and the team's distances from its centre in equal-area radii (wilson2012's attribution by direction). */
  cLevelL: number | null; cRL: number | null; tRL: number }
const obsEnc: ObsEnc[] = [], snapped = new Set<string>();
function snapEncounters(o: Observer): void {
  const byId = index(w).byId;
  for (const tm of o.teams) {
    if (tm.encounters.size === 0) continue;
    for (const [other, e] of tm.encounters) {
      const key = `${tm.index}|${other}|${e.t0}`;
      if (snapped.has(key)) continue;
      snapped.add(key);
      const f = byId.get(tm.focal);
      let call: Call | null = null, best = Infinity;
      // the observer tested the radius from the team's place before its follow step moved it (protocols.ts: calls, then
      // followStep), so the nearest long call of that community at the encounter's start is taken without the radius test
      if (e.heard) for (const c of w.calls) {
        if (c.troopId !== other || !LONG(c.kind) || c.time !== e.t0) continue;
        const d = Math.hypot(c.position[0] - tm.x, c.position[2] - tm.z);
        if (d < best) { best = d; call = c; }
      }
      const cl = call ? callById.get(call.id) : undefined;
      const pl = placeOf(tm.troop, tm.x, tm.z);
      const lp = call ? placeOf(tm.troop, call.position[0], call.position[2]) : null;
      const T = index(w).troopById.get(tm.troop)!, rr = (x: number, z: number) => r3(Math.hypot(x - T.center[0], z - T.center[2]) / Math.max(1, T.radius));
      let pIdx = -1;
      const pt = s.patrols[tm.troop];
      if (pt && f && pt.file.includes(f.id) && f.action === 'patrol') { pIdx = patrolIdx.get(tm.troop) ?? -1; if (pIdx >= 0) patrols[pIdx].obsEnc++; }
      obsEnc.push({ team: tm.index, troop: tm.troop, other, t0: r3(e.t0), seen: e.seen, heard: e.heard, patrolling: e.patrolling, fctx: f ? ctxOf(f) : '?', own: pl.own, inOther: pl.inOther,
        dist: call ? Math.round(best) : null, kind: call ? call.kind : null, cctx: cl ? cl.ctx : null, cv: cl ? cl.v : null, answers: cl ? cl.answers : null, cpatrol: cl ? cl.patrol : null,
        cInL: lp ? lp.own <= P.udRangeLevel : null, concurrent: tm.encounters.size - 1, patrol: pIdx,
        cLevelL: lp ? lp.own : null, cRL: call ? rr(call.position[0], call.position[2]) : null, tRL: rr(tm.x, tm.z) });
    }
  }
}
const exposure: Record<string, number> = {};
function followExposure(): void {
  const byId = index(w).byId;
  for (const tm of pobs.teams) { if (tm.state !== 2) continue; const f = byId.get(tm.focal); if (!f) continue; const k = ctxOf(f); exposure[k] = (exposure[k] ?? 0) + TICK_HOURS; }
}

// ------------------------------------------------------------------------------------------------------------------- run
const enc0 = w.stats.intergroupEncounters, deaths0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
for (let i = 0; i < days * DAY; i++) {
  tickWorld(w);
  logCalls();
  observerStep(obs, w); observerStep(pobs, w); observerStep(mobs, w);
  trackPatrols();
  snapEncounters(pobs);
  logSeen();
  followExposure();
}
for (const [t, o] of openPatrol) patrols[o.i].t1 = r3(w.time);
const rec = finishObserver(obs, w), prec = finishObserver(pobs, w), mrec = finishObserver(mobs, w);
const d = derive(rec), pd = derive(prec), md = derive(mrec);
const IDS = ['T-IGE-1', 'T-IGE-2', 'T-IGE-3', 'T-PAT-1', 'T-PAT-2', 'T-PAT-3', 'T-PAT-5', 'T-PAT-6', 'T-PAT-7', 'T-BRD-1'];
const values: Record<string, SeedValue> = {};
for (const m of METRICS) if (IDS.includes(m.id) && m.compute) { const mode = TARGET_FOLLOW[m.id]; values[m.id] = m.compute(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d); }

// episodes the party-larger observer recorded (an encounter of the same pair overlapping the episode)
for (const e of episodes) {
  e.t0 = r3(e.t0); e.t1 = r3(e.t1);
  e.counted = prec.encounters.some(x => x.troop === e.L && x.other === e.C && x.t0 <= e.t1 + 1 / 60 && x.t1 >= e.t0 - 1 / 60);
  if (e.lpatrol >= 0) patrols[e.lpatrol].hear++;
}
for (const sEp of seenEps) { sEp.t1 = r3(sEp.t1); if (sEp.patrol) for (const p of patrols) if ((p.troop === sEp.a || p.troop === sEp.b) && p.t0 <= sEp.t0 && (p.t1 ?? 1e9) >= sEp.t0) p.seen++; }

const communityDays = days * w.troops.length;
const result = {
  tool: 'e4j-encounter-diagnose', seed, burnIn, days, params, communityDays, troops: w.troops.map(t => ({ id: t.id, name: t.name, radius: Math.round(t.radius) })),
  rows: Object.fromEntries(IDS.map(id => [id, values[id] ? { value: values[id].value, num: values[id].num ?? null, den: values[id].den ?? null, n: values[id].n ?? null, parts: values[id].parts ?? null, truth: values[id].truth ?? null } : null])),
  accuracy: { patrolFocal: patrolAccuracy(rec, d.followPts, d.patrols), patrolMales: patrolAccuracy(mrec, md.followPts, md.patrols), encounterParty: encounterAccuracy(prec) },
  followHours: { party: [...pd.followHours.values()].reduce((a, b) => a + b, 0), focal: [...d.followHours.values()].reduce((a, b) => a + b, 0) },
  exposure: Object.fromEntries(Object.entries(exposure).map(([k, v]) => [k, r3(v)])),
  statsEncounters: w.stats.intergroupEncounters - enc0,
  observer: obsEnc,
  observerRecords: prec.encounters.map(e => ({ team: e.team, troop: e.troop, other: e.other, t0: r3(e.t0), t1: r3(e.t1), modality: e.modality, ownAM: e.ownAM, approach: e.approach, patrolling: e.patrolling })),
  episodes, seen: seenEps, patrols,
  calls: { n: calls.length, heardByStrangers: calls.filter(c => c.heard.length > 0).length, byTroop: tally(calls.map(c => c.troop)),
    strangerHeard: calls.filter(c => c.heard.length > 0).map(c => ({ t: c.t, kind: c.kind, troop: c.troop, am: c.am, ctx: c.ctx, v: c.v, answers: c.answers, patrol: c.patrol, own: c.own, inOther: c.inOther, heard: c.heard })),
    allByCtx: tally(calls.map(c => c.ctx)), allByV: tally(calls.map(c => c.v)) },
  deaths: tally(w.chimps.filter(c => !c.alive && !deaths0.has(c.id)).map(c => c.causeOfDeath ?? '?')),
};
const text = JSON.stringify(result);
if (out) writeFileSync(out, text); else console.log(text.slice(0, 4000));
const iges = values['T-IGE-1'];
console.error(`seed ${seed}: T-IGE-1 ${iges?.value} (n ${iges?.num}); observer encounters ${obsEnc.length} (records ${prec.encounters.length}); episodes ${episodes.length}; seen ${seenEps.length}; patrols ${patrols.length}; calls ${calls.length}; stats ${result.statsEncounters}`);
