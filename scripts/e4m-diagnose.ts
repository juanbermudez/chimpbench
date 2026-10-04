// Stage E4m diagnosis (development tool, simulation truth; docs/staging/e4m-prereg.md §3). Reads only: it reads the
// world after each tick and calls only pure functions (guardianOf, fastNow, massOf, dominates, the territory readers)
// plus energyNeed when the drive is already open (it would open it otherwise), and the huntTap hook of
// src/sim/ecology.ts resolveHunt (it draws nothing and changes nothing). The world is e-bench's (createWorld +
// tickWorld for the burn-in and the scored days, as patrol-diagnose.ts and e4k-hunt-diagnose.ts).
//
// What the four counted entries of the brief bind and decide:
//   roughPlayP          play bouts (a play act entering contact), eligible ticks (in contact, partner > 2 y younger),
//                       rough escalations (the partner stamped victim of the initiator in the tick while in contact,
//                       the initiator not charging or attacking it), with ages, masses, fast arousal and stress, and
//                       their consequences (the partner's guardian charging the initiator within 0.05 h, a consolation
//                       within consoleWindowH, the partner's stress over the next slow step)
//   patrolStopEveryMin  per truth patrol: stops on the schedule (counter up, phase unchanged) and at waypoints (counter
//                       up with a phase change), minutes stopped and moving on the outbound legs, members' new hearing
//                       episodes of strangers and new stranger sightings in each state, the leader's own use isopleth at
//                       each stop, a stranger heard by a member in the 15 min before it, turn-backs
//   meatEatPerH         per community meat episode (units held from 0 back to 0): captures, units eaten, kcal (units ×
//                       meatKcalPerUnit), holder-minutes awake, minutes from the first capture to the last unit,
//                       eaters, gut-limited holder ticks; per hunt start and per colobus encounter impulse: the leader's
//                       energy need against the meat he can expect (evenCaptures ÷ hunters × K)
//   guardMaxAgeY        every charge or attack started inside a community: the target's age class, its variant, whether a
//                       guardian (guardianOf) qualified for the deterrence test without the age limit (seen by the
//                       charger, within defendRangeM of the target, not dominated by it) and whether the age limit made
//                       the difference; defence charges (variant DEFEND) by ward age and guardian kind; plant shares by
//                       guardians by ward age; wards with an adoptive caretaker by age; ward-hours with a guardian within
//                       defendRangeM by age class (exposure)
//
//   pnpm exec tsx scripts/e4m-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { V, guardianOf } from '../src/sim/candidates';
import { huntTap } from '../src/sim/ecology';
import { acuteDrive, fastNow } from '../src/sim/endocrine';
import { energyNeed, massOf, meatKcalPerUnit } from '../src/sim/energy';
import { dominates, isAdultMale } from '../src/sim/hierarchy';
import { evenCaptures, pursuitCone, pursuitOn } from '../src/sim/huntpursuit';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_HUNT } from '../src/sim/perception';
import { SLOW_EVERY, TICK_HOURS, index, ix, simOf } from '../src/sim/state';
import { cellAt, gridOf, useLevels } from '../src/sim/territory';
import type { Chimp } from '../src/types';

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
const asleep = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v !== 0);
const d2 = (a: Chimp, b: Chimp) => (a.position[0] - b.position[0]) ** 2 + (a.position[2] - b.position[2]) ** 2;
const ageClass = (a: number) => (a < 5 ? '<5' : a < 8 ? '5-8' : a < 12 ? '8-12' : a < 15 ? '12-15' : a < 20 ? '15-20' : '>=20');
const AGE_CLASSES = ['<5', '5-8', '8-12', '12-15', '15-20', '>=20'];

// --- play and rough play -------------------------------------------------------------------------------------------
interface Rough { t: number; c: number; o: number; ageC: number; ageO: number; kgC: number; kgO: number; minIntoBout: number; fastC: number; fastO: number; stressO: number; stressO2: number | null;
  guardian: number | null; guardianKind: string | null; defended: boolean; consoled: boolean; kin: boolean }
const roughs: Rough[] = [];
const bouts: { ageC: number; ageO: number; gap: number; minutes: number; rough: boolean; adultInit: boolean }[] = [];
const contact = new Map<number, { o: number; t0: number; gap: number; ageC: number; ageO: number }>(); // play contact under way, by actor
const boutStartAcute: number[] = []; // the actor's acute drive (E4b) when a bout's contact begins
let eligibleTicks = 0, playContactTicks = 0, immatureDays = 0;
const playMinByAge: Record<string, number> = {}; const immDaysByAge: Record<string, number> = {};

// --- patrols --------------------------------------------------------------------------------------------------------
interface Stop { t: number; kind: 'schedule' | 'waypoint'; level: number; heard15: boolean; phase: number }
interface PatrolRec { troop: number; startT: number; endT: number | null; stops: Stop[]; stopTicksOut: number; moveTicksOut: number; ticksReturn: number;
  heardStopped: number; heardMoving: number; heardReturn: number; sightStopped: number; sightMoving: number; sightReturn: number; turnedBack: boolean; contact: boolean; maxPhase: number }
const patrols: PatrolRec[] = [];
const openP = new Map<number, { rec: PatrolRec; obj: object; phase: number; stops: number }>();
const prevStrangers = new Map<number, number>();

// --- meat -----------------------------------------------------------------------------------------------------------
interface Episode { troop: number; t0: number; t1: number | null; captures: number; unitsEaten: number; holderTicks: number; eaters: Set<number>; gutLimited: number; awakeHolderTicks: number; overnight: boolean }
const episodes: Episode[] = [];
const openE = new Map<number, Episode>();
const huntsStarted: { troop: number; t: number; hunters: number }[] = [];
const knownHunts = new Set<object>();
const resolutions: { troop: number; t: number; success: boolean; captures: number; hunters: number }[] = [];
const valuations: { at: 'impulse' | 'start'; need: number; expectedKcal: number; kBinds: boolean; males: number; hunted: boolean | null; id: number; t: number }[] = [];
const K = meatKcalPerUnit(P), offerPerTick = P.meatEatPerH * TICK_HOURS;
const tickCaptors: number[] = [];
huntTap.fn = (_world, r) => { resolutions.push({ troop: r.h.troopId, t: w.time, success: r.success, captures: r.captors.length, hunters: r.hunters.length }); for (const c of r.captors) tickCaptors.push(c.id); };
const prevImpulse = new Map<number, number>();

// --- guardianship ---------------------------------------------------------------------------------------------------
interface Charge { t: number; c: number; o: number; ageO: number; v: number; act: string; guardQual: boolean; ageLimited: boolean; guardianKind: string | null }
const charges: Charge[] = [];
const defences: { t: number; ward: number; wardAge: number; guardianKind: string; aggressorAge: number }[] = [];
const plantShares: { wardAge: number; kind: string }[] = [];
const caretakerWardDays: Record<string, number> = {}; const guardNearHours: Record<string, number> = {}; const wardHours: Record<string, number> = {};
const prevAct = new Map<number, string>(), prevTarget = new Map<number, number>();
for (const c of w.chimps) { prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); prevImpulse.set(c.id, ix(c).impulseUntil); prevStrangers.set(c.id, ix(c).strangers); }
const kindOf = (o: Chimp, gd: Chimp | undefined) => (!gd ? null : gd.id === o.motherId ? 'mother' : 'caretaker');

const pendingRough: Rough[] = []; // consequences still open
const deaths0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));

for (let i = 0; i < days * DAY; i++) {
  const idx0 = index(w);
  // snapshot before the tick: play pairs in contact
  const inPlay: { c: Chimp; o: Chimp; elig: boolean }[] = [];
  for (const c of idx0.alive) {
    if (c.action !== 'play' || ix(c).phase !== 1) continue;
    const o = idx0.byId.get(c.targetId); if (!o || !o.alive) continue;
    const elig = o.age + 2 < c.age;
    inPlay.push({ c, o, elig }); playContactTicks++; if (elig) eligibleTicks++;
  }
  const stressBefore = new Map(inPlay.map(p => [p.o.id, p.o.stress]));
  const fastBefore = new Map(inPlay.flatMap(p => [[p.c.id, fastNow(ix(p.c), w.time, P)], [p.o.id, fastNow(ix(p.o), w.time, P)]]));
  const meatBefore = new Map<number, number>(); for (const c of idx0.alive) if (c.carryingMeat > 0) meatBefore.set(c.id, c.carryingMeat);
  tickCaptors.length = 0;
  tickWorld(w);
  const time = w.time, idx = index(w);

  // play bouts and rough escalations
  for (const { c, o, elig } of inPlay) {
    const ox = ix(o);
    if (ox.victimAt === time && ox.victimOf === c.id && !((c.action === 'charge' || c.action === 'attack') && c.targetId === o.id)) {
      const gd = guardianOf(w, o), k = contact.get(c.id);
      const r: Rough = { t: time, c: c.id, o: o.id, ageC: r4(c.age), ageO: r4(o.age), kgC: r4(massOf(c, P)), kgO: r4(massOf(o, P)), minIntoBout: k ? r4((time - k.t0) * 60) : NaN,
        fastC: r4(fastBefore.get(c.id) ?? 0), fastO: r4(fastBefore.get(o.id) ?? 0), stressO: r4(stressBefore.get(o.id) ?? o.stress), stressO2: null,
        guardian: gd ? gd.id : null, guardianKind: kindOf(o, gd), defended: false, consoled: false, kin: o.motherId === c.id || c.motherId === o.id || (o.motherId > 0 && o.motherId === c.motherId) };
      roughs.push(r); pendingRough.push(r);
      if (!elig) r.minIntoBout = -1; // tool check: the die needs an eligible pair
    }
  }
  for (const c of idx.alive) {
    const x = ix(c), k = contact.get(c.id);
    const inContact = c.action === 'play' && x.phase === 1;
    if (inContact && (!k || k.o !== c.targetId)) {
      if (k) bouts.push({ ageC: k.ageC, ageO: k.ageO, gap: k.gap, minutes: r4((time - k.t0) * 60), rough: roughs.some(r => r.c === c.id && r.t > k.t0 && r.t <= time), adultInit: k.ageC >= 15 });
      const o = idx.byId.get(c.targetId);
      contact.set(c.id, { o: c.targetId, t0: time, gap: o ? r4(c.age - o.age) : NaN, ageC: r4(c.age), ageO: o ? r4(o.age) : NaN });
      boutStartAcute.push(acuteDrive(x, time, P));
    } else if (!inContact && k) {
      bouts.push({ ageC: k.ageC, ageO: k.ageO, gap: k.gap, minutes: r4((time - k.t0) * 60), rough: roughs.some(r => r.c === c.id && r.t > k.t0 && r.t <= time), adultInit: k.ageC >= 15 });
      contact.delete(c.id);
    }
    if (c.age < 12) {
      immatureDays += TICK_HOURS / 24; const ac = ageClass(c.age); immDaysByAge[ac] = (immDaysByAge[ac] ?? 0) + TICK_HOURS / 24;
      if (inContact) playMinByAge[ac] = (playMinByAge[ac] ?? 0) + TICK_HOURS * 60;
    }
  }
  // consequences of rough play
  for (let j = pendingRough.length - 1; j >= 0; j--) {
    const r = pendingRough[j], dtH = time - r.t;
    if (dtH > 0 && r.guardian !== null) { const gd = idx.byId.get(r.guardian); if (gd && gd.alive && gd.action === 'charge' && gd.targetId === r.c && ix(gd).v === V.DEFEND && dtH <= 0.05 + 1e-9) r.defended = true; }
    if (dtH > 0) for (const q of idx.alive) if (q.action === 'console' && q.targetId === r.o && dtH <= P.consoleWindowH + 1e-9) r.consoled = true;
    if (r.stressO2 === null && dtH >= SLOW_EVERY * TICK_HOURS) { const o = idx.byId.get(r.o); r.stressO2 = o ? r4(o.stress) : null; }
    if (dtH > Math.max(0.05, P.consoleWindowH) && r.stressO2 !== null) pendingRough.splice(j, 1);
  }

  // patrols
  for (const t of w.troops) {
    const p = s.patrols[t.id], o = openP.get(t.id);
    if (o && (!p || p !== o.obj)) { o.rec.endT = time; openP.delete(t.id); }
    if (p && (!o || p !== o.obj)) {
      const rec: PatrolRec = { troop: t.id, startT: time, endT: null, stops: [], stopTicksOut: 0, moveTicksOut: 0, ticksReturn: 0, heardStopped: 0, heardMoving: 0, heardReturn: 0, sightStopped: 0, sightMoving: 0, sightReturn: 0, turnedBack: false, contact: false, maxPhase: p.phase };
      patrols.push(rec); openP.set(t.id, { rec, obj: p, phase: p.phase, stops: p.stops });
    }
    const oo = openP.get(t.id);
    if (p && oo) {
      const rec = oo.rec, leader = idx.byId.get(p.leaderId);
      const members: Chimp[] = []; for (const id of p.file) { const m = idx.byId.get(id); if (m && m.alive && m.action === 'patrol') members.push(m); }
      if (p.stops > oo.stops && leader) {
        const L = useLevels(w)[t.id], lvl = L ? L[cellAt(g, leader.position[0], leader.position[2])] : NaN;
        const heard15 = members.some(m => time - ix(m).heardAt <= 0.25 + 1e-9 && ix(m).heardTroop !== t.id && ix(m).heardTroop > 0);
        for (let k = oo.stops; k < p.stops; k++) rec.stops.push({ t: time, kind: p.phase !== oo.phase ? 'waypoint' : 'schedule', level: r4(lvl), heard15, phase: oo.phase });
      }
      const stopped = p.stopUntil > time, out = p.phase < 2;
      if (out) { if (stopped) rec.stopTicksOut++; else rec.moveTicksOut++; } else rec.ticksReturn++;
      for (const m of members) {
        const mx = ix(m);
        if (mx.heardAt === time && mx.heardTroop !== t.id && mx.heardTroop > 0) { if (!out) rec.heardReturn++; else if (stopped) rec.heardStopped++; else rec.heardMoving++; }
        if (mx.strangers > 0 && (prevStrangers.get(m.id) ?? 0) === 0) { if (!out) rec.sightReturn++; else if (stopped) rec.sightStopped++; else rec.sightMoving++; }
      }
      rec.contact ||= !!p.contact; rec.maxPhase = Math.max(rec.maxPhase, p.phase);
      oo.stops = p.stops; oo.phase = p.phase;
    }
  }
  const evs = []; for (let e = w.events.length - 1; e >= 0 && w.events[e].time === time; e--) evs.push(w.events[e]);
  for (const e of evs) if (/turned back/.test(e.text)) { const o = openP.get(e.troopId ?? -1); if (o) o.rec.turnedBack = true; }
  for (const c of idx.alive) prevStrangers.set(c.id, ix(c).strangers);

  // hunts: starts and valuations
  for (const h of s.hunts) if (!knownHunts.has(h)) {
    knownHunts.add(h); huntsStarted.push({ troop: h.troopId, t: time, hunters: h.hunters.length });
    const L = idx.byId.get(h.hunters[0]);
    if (L && ix(L).en?.eAvg !== undefined) { const n = Math.max(1, ix(L).ownMales), exp = pursuitOn(P) ? evenCaptures(n, pursuitCone(L, P)) / n : NaN, need = energyNeed(L, P);
      valuations.push({ at: 'start', need: r4(need), expectedKcal: r4(exp * K), kBinds: exp * K < need, males: n, hunted: true, id: L.id, t: time }); }
  }
  for (const c of idx.alive) {
    const x = ix(c), fresh = x.impulse === IMPULSE_HUNT && Math.abs(x.impulseUntil - (time + P.impulseDurationH)) < 1e-9 && prevImpulse.get(c.id) !== x.impulseUntil;
    prevImpulse.set(c.id, x.impulseUntil);
    if (fresh && x.en?.eAvg !== undefined) {
      const n = Math.max(1, x.ownMales), exp = pursuitOn(P) ? evenCaptures(n, pursuitCone(c, P)) / n : NaN, need = energyNeed(c, P);
      valuations.push({ at: 'impulse', need: r4(need), expectedKcal: r4(exp * K), kBinds: exp * K < need, males: n, hunted: null, id: c.id, t: time });
    }
  }

  // meat episodes by community
  const held = new Map<number, number>();
  for (const c of idx.alive) if (c.carryingMeat > 0) held.set(c.troopId, (held.get(c.troopId) ?? 0) + c.carryingMeat);
  for (const t of w.troops) {
    let e = openE.get(t.id);
    let before = 0; for (const [id, m] of meatBefore) if (idx.byId.get(id)?.troopId === t.id) before += m;
    const now = held.get(t.id) ?? 0, mine = tickCaptors.filter(id => idx.byId.get(id)?.troopId === t.id);
    const created = mine.reduce((a, id) => a + 1 - (meatBefore.get(id) ?? 0), 0); // resolveHunt sets the captor's meat to 1
    if (!e && (now > 0 || mine.length > 0)) { e = { troop: t.id, t0: time, t1: null, captures: 0, unitsEaten: 0, holderTicks: 0, eaters: new Set(), gutLimited: 0, awakeHolderTicks: 0, overnight: false }; episodes.push(e); openE.set(t.id, e); }
    if (!e) continue;
    e.captures += mine.length;
    e.unitsEaten += Math.max(0, before + created - now); // sharing moves units inside the community; eating (and a holder's death) removes them
    for (const c of idx.alive) {
      if (c.troopId !== t.id || c.carryingMeat <= 0) continue;
      e.holderTicks++; e.eaters.add(c.id);
      if (asleep(c)) { if (w.environment.daylight < 0.05) e.overnight = true; continue; }
      e.awakeHolderTicks++;
      const b = meatBefore.get(c.id) ?? 0, fell = b - c.carryingMeat;
      if (!mine.includes(c.id) && b >= offerPerTick && fell >= 0 && fell < 0.999 * offerPerTick) e.gutLimited++;
    }
    if (now <= 0) { e.t1 = time; openE.delete(t.id); }
  }

  // guardianship: charges and attacks started, defences, plant shares, exposure
  for (const c of idx.alive) {
    const x = ix(c), pa = prevAct.get(c.id), pt = prevTarget.get(c.id);
    const started = (c.action === 'charge' || c.action === 'attack' || c.action === 'share') && (pa !== c.action || pt !== c.targetId);
    prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId);
    if (!started) continue;
    const o = idx.byId.get(c.targetId); if (!o || !o.alive || o.troopId !== c.troopId) continue;
    if (c.action === 'share') { if (x.v === V.PLANT) plantShares.push({ wardAge: r4(o.age), kind: o.motherId === c.id ? 'mother' : 'caretaker' }); continue; }
    if (x.v === V.DEFEND) { const ward = idx.byId.get(x.aux); if (ward) defences.push({ t: time, ward: ward.id, wardAge: r4(ward.age), guardianKind: ward.motherId === c.id ? 'mother' : 'caretaker', aggressorAge: r4(o.age) }); }
    const gd = guardianOf(w, o);
    const qual = !!gd && gd !== c && x.seen.includes(gd.id) && d2(gd, o) < P.defendRangeM * P.defendRangeM && !dominates(c, gd);
    charges.push({ t: time, c: c.id, o: o.id, ageO: r4(o.age), v: x.v, act: c.action, guardQual: qual, ageLimited: qual && o.age >= P.guardMaxAgeY, guardianKind: kindOf(o, gd) });
  }
  if (w.tick % 20 === 0) for (const o of idx.alive) { // exposure every 5 min
    const ac = ageClass(o.age); wardHours[ac] = (wardHours[ac] ?? 0) + 20 * TICK_HOURS;
    const gd = guardianOf(w, o); if (gd && d2(gd, o) < P.defendRangeM * P.defendRangeM) guardNearHours[ac] = (guardNearHours[ac] ?? 0) + 20 * TICK_HOURS;
    const ox = ix(o); if (ox.caretaker >= 0 && ox.caretaker !== o.motherId) caretakerWardDays[ac] = (caretakerWardDays[ac] ?? 0) + 20 * TICK_HOURS / 24;
  }
}

// --- summaries -------------------------------------------------------------------------------------------------------
const communityYears = w.troops.length * days / 365;
const done = patrols;
const stopSum = (f: (p: PatrolRec) => number) => done.reduce((a, p) => a + f(p), 0);
const hOut = (ticks: number) => ticks * TICK_HOURS;
const ep = episodes.filter(e => e.captures > 0);
const deaths = w.chimps.filter(c => !c.alive && !deaths0.has(c.id)).map(c => c.causeOfDeath ?? 'unknown');
const byAge = (rows: { a: number }[]) => Object.fromEntries(AGE_CLASSES.map(k => [k, rows.filter(r => ageClass(r.a) === k).length]));
const result = {
  seed, burnIn, days, params, communityYears: r4(communityYears), K: r4(K),
  play: {
    immatureDays: r4(immatureDays), playContactTicks, eligibleTicks, eligibleShare: r4(eligibleTicks / Math.max(1, playContactTicks)),
    bouts: bouts.length, boutsPerImmatureDay: r4(bouts.filter(b => b.ageC < 12 || b.ageO < 12).length / immatureDays), boutMinMedian: median(bouts.map(b => b.minutes)),
    boutsAdultInit: bouts.filter(b => b.adultInit).length, eligibleBouts: bouts.filter(b => b.gap > 2).length, roughBouts: bouts.filter(b => b.rough).length,
    playMinPerDayByAge: Object.fromEntries(AGE_CLASSES.slice(0, 3).map(k => [k, immDaysByAge[k] ? r4((playMinByAge[k] ?? 0) / immDaysByAge[k]) : null])),
    rough: roughs.length, roughPerImmatureDay: r4(roughs.length / immatureDays), roughPerEligibleTick: r4(roughs.length / Math.max(1, eligibleTicks)),
    roughToolCheckIneligible: roughs.filter(r => r.minIntoBout === -1).length,
    roughInitiatorAge: tally(roughs.map(r => ageClass(r.ageC))), roughVictimAge: tally(roughs.map(r => ageClass(r.ageO))), roughAdultInit: roughs.filter(r => r.ageC >= 15).length,
    roughMinIntoBoutMedian: median(roughs.map(r => r.minIntoBout).filter(v => v >= 0)), roughMassRatioMedian: median(roughs.map(r => r.kgC / Math.max(1, r.kgO))),
    roughFastInitMean: mean(roughs.map(r => r.fastC)), roughFastVictimMean: mean(roughs.map(r => r.fastO)),
    roughDefended: roughs.filter(r => r.defended).length, roughWithGuardian: roughs.filter(r => r.guardian !== null).length, roughConsoled: roughs.filter(r => r.consoled).length,
    boutsStartedAcuteOver05: boutStartAcute.filter(a => a > 0.5).length, boutsStartedAcuteOver0: boutStartAcute.filter(a => a > 0).length, boutStarts: boutStartAcute.length,
    roughKin: roughs.filter(r => r.kin).length, victimStressRise: mean(roughs.filter(r => r.stressO2 !== null).map(r => r.stressO2! - r.stressO)),
  },
  patrols: {
    n: done.length, perCommunityWeek: r4(done.length / (w.troops.length * days / 7)),
    stopsSchedule: stopSum(p => p.stops.filter(q => q.kind === 'schedule').length), stopsWaypoint: stopSum(p => p.stops.filter(q => q.kind === 'waypoint').length),
    stopsPerPatrol: r4(stopSum(p => p.stops.length) / Math.max(1, done.length)), waypointStopsPerPatrol: r4(stopSum(p => p.stops.filter(q => q.kind === 'waypoint').length) / Math.max(1, done.length)),
    patrolsWithTwoWaypointStops: done.filter(p => p.stops.filter(q => q.kind === 'waypoint').length >= 2).length, patrolsWithTwoStops: done.filter(p => p.stops.length >= 2).length,
    hoursStoppedOut: r4(hOut(stopSum(p => p.stopTicksOut))), hoursMovingOut: r4(hOut(stopSum(p => p.moveTicksOut))), hoursReturn: r4(hOut(stopSum(p => p.ticksReturn))),
    heardStopped: stopSum(p => p.heardStopped), heardMoving: stopSum(p => p.heardMoving), heardReturn: stopSum(p => p.heardReturn),
    sightStopped: stopSum(p => p.sightStopped), sightMoving: stopSum(p => p.sightMoving), sightReturn: stopSum(p => p.sightReturn),
    stopLevelMedian: { schedule: median(done.flatMap(p => p.stops.filter(q => q.kind === 'schedule').map(q => q.level)).filter(Number.isFinite)), waypoint: median(done.flatMap(p => p.stops.filter(q => q.kind === 'waypoint').map(q => q.level)).filter(Number.isFinite)) },
    stopsAfterHeard15: stopSum(p => p.stops.filter(q => q.heard15).length), turnedBack: done.filter(p => p.turnedBack).length, contact: done.filter(p => p.contact).length,
    reachedPhase: tally(done.map(p => p.maxPhase)),
  },
  meat: {
    huntsStarted: huntsStarted.length, resolutions: resolutions.length, successes: resolutions.filter(r => r.success).length, captures: resolutions.reduce((a, r) => a + r.captures, 0),
    episodes: ep.map(e => ({ troop: e.troop, captures: e.captures, unitsEaten: r4(e.unitsEaten), kcal: r4(e.unitsEaten * K), minutes: e.t1 !== null ? r4((e.t1 - e.t0) * 60) : null,
      holderMinAwake: r4(e.awakeHolderTicks * TICK_HOURS * 60), eaters: e.eaters.size, gutLimitedShare: r4(e.gutLimited / Math.max(1, e.awakeHolderTicks)), overnight: e.overnight })),
    kcalPerHunt: r4(ep.reduce((a, e) => a + e.unitsEaten * K, 0) / Math.max(1, huntsStarted.length)), kcalPerCapture: r4(ep.reduce((a, e) => a + e.unitsEaten * K, 0) / Math.max(1, ep.reduce((a, e) => a + e.captures, 0))),
    valuations: { n: valuations.length, impulse: valuations.filter(v => v.at === 'impulse').length, kBindsImpulse: valuations.filter(v => v.at === 'impulse' && v.kBinds).length, kBindsStart: valuations.filter(v => v.at === 'start' && v.kBinds).length, start: valuations.filter(v => v.at === 'start').length,
      needMedian: median(valuations.map(v => v.need)), expectedKcalMedian: median(valuations.map(v => v.expectedKcal)) },
  },
  guard: {
    charges: charges.filter(c => c.act !== 'share').length, chargesByTargetAge: byAge(charges.map(c => ({ a: c.ageO }))),
    guardQualifiedByAge: byAge(charges.filter(c => c.guardQual).map(c => ({ a: c.ageO }))), ageLimited: charges.filter(c => c.ageLimited).length,
    ageLimitedByVariant: tally(charges.filter(c => c.ageLimited).map(c => Object.entries(V).find(([, v]) => v === c.v)?.[0] ?? String(c.v))),
    ageLimitedByGuardian: tally(charges.filter(c => c.ageLimited).map(c => c.guardianKind ?? 'none')),
    defences: defences.length, defencesByWardAge: byAge(defences.map(d => ({ a: d.wardAge }))), defencesByGuardian: tally(defences.map(d => d.guardianKind)),
    plantSharesByWardAge: byAge(plantShares.map(p => ({ a: p.wardAge }))), caretakerWardDays: Object.fromEntries(Object.entries(caretakerWardDays).map(([k, v]) => [k, r4(v)])),
    guardNearShareByAge: Object.fromEntries(AGE_CLASSES.map(k => [k, wardHours[k] ? r4((guardNearHours[k] ?? 0) / wardHours[k]) : null])),
    chargesPer1000hByAge: Object.fromEntries(AGE_CLASSES.map(k => [k, wardHours[k] ? r4(charges.filter(c => ageClass(c.ageO) === k).length / wardHours[k] * 1000) : null])),
  },
  deaths: tally(deaths),
  raw: { roughs, patrols: done, valuations, defences },
};
const json = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, json); else console.log(json);
console.error(`seed ${seed}: play bouts ${result.play.bouts}, rough ${result.play.rough} (${result.play.roughPerImmatureDay}/immature-day), patrols ${result.patrols.n} (stops ${result.patrols.stopsSchedule} schedule / ${result.patrols.stopsWaypoint} waypoint), hunts ${result.meat.huntsStarted}, captures ${result.meat.captures}, age-limited charges ${result.guard.ageLimited}`);
