// Stage E4o diagnosis (development tool, simulation truth; docs/staging/e4o-prereg.md §3). Reads only: it reads the
// world after each tick and calls only pure functions (guardianOf, assessOdds, winOdds, strength, dominates, hash01),
// plus the diagnosis hooks huntTap (ecology.ts), energyTap (energy.ts), quotaTrace (candidates.ts) and rulesTap
// (decide.ts), which draw nothing and write nothing. The world is e-bench's (createWorld + tickWorld for the burn-in and
// the scored days, as e4m-diagnose.ts).
//
// What the three counted entries of the brief bind and decide:
//   meatEatPerH    per community meat episode (units held from 0 back to 0): captures, meat kcal eaten (energyTap, the
//                  ledger's own books), eaters and kcal per eater, the captor's kcal, holder-minutes awake, minutes from
//                  the first capture to the last unit, gut-limited holder ticks, meat shares and begs started
//   guardMaxAgeY   every charge or attack started inside a community: the target's age class and variant, whether its
//                  guardian qualifies for the deterrence test without the age limit (seen by the charger, within
//                  defendRangeM of the target, not dominated by it), whether the age limit made the difference, and the
//                  target's assessed odds against the charger (E4h assessOdds; winOdds beside it); defence charges
//                  (variant DEFEND) by ward age and by the ward's odds against its aggressor; caretaker wards
//   mateIntervalH  copulations (interactions of kind 'mate'), by the male's act, the female's swelling, daylight;
//                  maximally swollen female-hours (swelling 1) and female-hours at >= 0.75 (the offers' threshold),
//                  male–female dyad-hours in one party while she is maximally swollen (muller2007's denominator), the
//                  males' and females' intervals between copulations, and at each rules decision of an animal with a
//                  mate gate (quotaTrace 'mate' / 'mateF'): blocked or open, and whether the offer, with its own
//                  jitter, would have topped the decision's best published score
//
//   pnpm exec tsx scripts/e4o-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { CODE, V, guardianOf, quotaTrace } from '../src/sim/candidates';
import { rulesTap } from '../src/sim/decide';
import { huntTap } from '../src/sim/ecology';
import { energyTap, meatKcalPerUnit } from '../src/sim/energy';
import { assessOdds, dominates, winOdds } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { hash01 } from '../src/sim/rng';
import { TICK_HOURS, index, ix } from '../src/sim/state';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const mean = (v: number[]) => (v.length ? r4(v.reduce((a, b) => a + b, 0) / v.length) : null);
const median = (v: number[]) => { const q = [...v].sort((a, b) => a - b); return q.length ? r4(q.length % 2 ? q[(q.length - 1) / 2] : (q[q.length / 2 - 1] + q[q.length / 2]) / 2) : null; };
const tally = (v: (string | number)[]) => v.reduce((a, k) => { a[String(k)] = (a[String(k)] ?? 0) + 1; return a; }, {} as Record<string, number>);
const asleep = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v !== 0);
const d2 = (a: Chimp, b: Chimp) => (a.position[0] - b.position[0]) ** 2 + (a.position[2] - b.position[2]) ** 2;
const ageClass = (a: number) => (a < 5 ? '<5' : a < 8 ? '5-8' : a < 12 ? '8-12' : a < 15 ? '12-15' : a < 20 ? '15-20' : '>=20');
const AGE_CLASSES = ['<5', '5-8', '8-12', '12-15', '15-20', '>=20'];
const oddsClass = (q: number) => (q < 0.1 ? '<0.1' : q < 0.3 ? '0.1-0.3' : q < 0.5 ? '0.3-0.5' : q < 0.7 ? '0.5-0.7' : '>=0.7');
const ODDS_CLASSES = ['<0.1', '0.1-0.3', '0.3-0.5', '0.5-0.7', '>=0.7'];
const vName = (v: number) => Object.entries(V).find(([, k]) => k === v)?.[0] ?? String(v);
const parous = (f: Chimp) => f.age >= P.endoParousAgeY || ix(f).amenUntil > 0; // as endocrine.ts parous()

// --- meat -----------------------------------------------------------------------------------------------------------
interface Episode { troop: number; t0: number; t1: number | null; captures: number; captors: number[]; kcal: number; kcalBy: Map<number, number>; holderTicks: number; awakeHolderTicks: number; gutLimited: number; shares: number; recipients: Set<number>; begs: number; overnight: boolean }
const episodes: Episode[] = [];
const openE = new Map<number, Episode>();
const tickCaptors: number[] = [];
const resolutions: { troop: number; success: boolean; captures: number; hunters: number }[] = [];
huntTap.fn = (_w, r) => { resolutions.push({ troop: r.h.troopId, success: r.success, captures: r.captors.length, hunters: r.hunters.length }); for (const c of r.captors) tickCaptors.push(c.id); };
const tickMeatKcal = new Map<number, number>();
let meatKcalAll = 0;
energyTap.fn = (c, term, kcal, kind) => { if (term === 'eaten' && kind === 'meat') { tickMeatKcal.set(c.id, (tickMeatKcal.get(c.id) ?? 0) + kcal); meatKcalAll += kcal; } };
const K = meatKcalPerUnit(P), offerPerTick = P.meatEatPerH * TICK_HOURS;

// --- guarding -------------------------------------------------------------------------------------------------------
interface Charge { c: number; o: number; ageO: number; v: string; act: string; guardQual: boolean; ageLimited: boolean; guardianKind: string | null; qAssess: number; qWin: number; chargerAge: number; chargerSex: string }
const charges: Charge[] = [];
const defences: { wardAge: number; guardianKind: string; aggressorAge: number; qAssess: number }[] = [];
const caretakerWardDays: Record<string, number> = {};
const prevAct = new Map<number, string>(), prevTarget = new Map<number, number>();
for (const c of w.chimps) { prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId); }
const kindOf = (o: Chimp, gd: Chimp | undefined) => (!gd ? null : gd.id === o.motherId ? 'mother' : 'caretaker');

// --- mating ---------------------------------------------------------------------------------------------------------
interface Cop { t: number; m: number; f: number; maleAct: string; femaleAct: string; femaleInit: boolean; swelling: number; maleAge: number; maleRankOrder: number; parous: boolean; daylight: number; hour: number }
const cops: Cop[] = [];
let lastInterId = Math.max(0, ...w.interactions.map(i => i.id));
let maxSwollenH = 0, swollen75H = 0, maxSwollenDayH = 0, maxSwollenParousH = 0, dyadH = 0, dyadParousH = 0, dyadDayH = 0;
const dyadHours = new Map<string, number>(); const dyadCops = new Map<string, number>();
const lastCopM = new Map<number, number>(), lastCopF = new Map<number, number>();
const intervalsM: number[] = [], intervalsF: number[] = [];
// mate gates at decisions: per animal, the quota traces of its candidate build in this tick
type Gate = { kind: 'mate' | 'mateF'; o: number; blocked: boolean; sinceH: number; sc: number; pub: number; dist: number; night: boolean };
const pendingGates = new Map<number, Gate[]>();
const gateRows: { kind: string; blocked: boolean; wouldWin: boolean; margin: number; sinceH: number; chosen: string; dist: number; night: boolean }[] = [];
// mate acts: start, and at their end whether the animal copulated during the act, and the partner's act then (refusal)
const openMate = new Map<number, { t0: number; target: number; sex: string; copulated: boolean }>();
const mateActs: { sex: string; copulated: boolean; minutes: number; partnerAct: string }[] = [];
quotaTrace.on = (kind, c, o, blocked, a, b) => {
  if ((kind !== 'mate' && kind !== 'mateF') || !o) return;
  // the published score the offer has or would have: its score plus the candidate jitter offer() adds (candidates.ts)
  const jit = (hash01(c.id, c.decisionVersion, CODE.mate, o.id) - 0.5) * P.candidateJitterSpan;
  let g = pendingGates.get(c.id); if (!g) { g = []; pendingGates.set(c.id, g); }
  g.push({ kind, o: o.id, blocked, sinceH: a, sc: b, pub: b + jit, dist: Math.hypot(c.position[0] - o.position[0], c.position[2] - o.position[2]), night: w.environment.daylight < 0.1 });
};
rulesTap.fn = (c, list) => {
  const g = pendingGates.get(c.id); if (!g || !g.length) return;
  pendingGates.delete(c.id);
  let best = -Infinity, bestAct = 'none';
  for (const k of list) if (k.score > best) { best = k.score; bestAct = k.action; }
  for (const q of g) {
    const wouldWin = q.pub > best || (!q.blocked && bestAct === 'mate');
    gateRows.push({ kind: q.kind, blocked: q.blocked, wouldWin, margin: r4(q.pub - best), sinceH: r4(q.sinceH), chosen: bestAct, dist: r4(q.dist), night: q.night });
  }
};
const deaths0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));

for (let i = 0; i < days * DAY; i++) {
  const idx0 = index(w);
  const meatBefore = new Map<number, number>(); for (const c of idx0.alive) if (c.carryingMeat > 0) meatBefore.set(c.id, c.carryingMeat);
  tickCaptors.length = 0; tickMeatKcal.clear(); pendingGates.clear();
  const actBefore = new Map<number, [string, number]>(); for (const c of idx0.alive) actBefore.set(c.id, [c.action, c.targetId]);
  tickWorld(w);
  const time = w.time, idx = index(w), daylight = w.environment.daylight > 0.1;

  // new interactions this tick: copulations, meat shares, begs
  const fresh = []; for (let k = w.interactions.length - 1; k >= 0 && w.interactions[k].id > lastInterId; k--) fresh.push(w.interactions[k]);
  for (const it of fresh) lastInterId = Math.max(lastInterId, it.id);
  for (const it of fresh.reverse()) {
    if (it.kind === 'mate') {
      const m = idx.byId.get(it.actorId), f = idx.byId.get(it.targetId); if (!m || !f) continue;
      const am = actBefore.get(m.id) ?? [m.action, m.targetId], af = actBefore.get(f.id) ?? [f.action, f.targetId];
      for (const id of [m.id, f.id]) { const k = openMate.get(id); if (k) k.copulated = true; }
      cops.push({ t: time, m: m.id, f: f.id, maleAct: am[0], femaleAct: af[0], femaleInit: af[0] === 'mate' && af[1] === m.id, swelling: r4(f.swelling), maleAge: r4(m.age), maleRankOrder: m.rankOrder, parous: parous(f), daylight: r4(w.environment.daylight), hour: r4(w.hour) });
      const pm = lastCopM.get(m.id); if (pm !== undefined) intervalsM.push(r4(time - pm)); lastCopM.set(m.id, time);
      const pf = lastCopF.get(f.id); if (pf !== undefined) intervalsF.push(r4(time - pf)); lastCopF.set(f.id, time);
      const key = `${m.id}-${f.id}`; dyadCops.set(key, (dyadCops.get(key) ?? 0) + 1);
    }
  }

  for (const c of idx.alive) {
    const k = openMate.get(c.id), inMate = c.action === 'mate';
    if (k && (!inMate || c.targetId !== k.target)) {
      const p = idx.byId.get(k.target); mateActs.push({ sex: k.sex, copulated: k.copulated, minutes: r4((time - k.t0) * 60), partnerAct: p ? p.action : 'gone' }); openMate.delete(c.id);
    }
    if (inMate && !openMate.has(c.id)) openMate.set(c.id, { t0: time, target: c.targetId, sex: c.sex, copulated: false });
  }

  // swollen female-hours and male–female dyad-hours in one party (adult males >= 15 y, unrelated, same community)
  for (const f of idx.alive) {
    if (f.sex !== 'female' || f.swelling < 0.75) continue;
    swollen75H += TICK_HOURS;
    if (f.swelling < 0.999) continue;
    maxSwollenH += TICK_HOURS; if (daylight) maxSwollenDayH += TICK_HOURS; const par = parous(f); if (par) maxSwollenParousH += TICK_HOURS;
    for (const m of idx.alive) {
      if (m.sex !== 'male' || m.age < 15 || m.troopId !== f.troopId || m.partyId !== f.partyId || m.motherId === f.id || (f.motherId > 0 && m.motherId === f.motherId)) continue;
      dyadH += TICK_HOURS; if (par) dyadParousH += TICK_HOURS; if (daylight) dyadDayH += TICK_HOURS;
      const key = `${m.id}-${f.id}`; dyadHours.set(key, (dyadHours.get(key) ?? 0) + TICK_HOURS);
    }
  }

  // meat episodes by community (as e4m-diagnose; kcal from the ledger's own books)
  const held = new Map<number, number>();
  for (const c of idx.alive) if (c.carryingMeat > 0) held.set(c.troopId, (held.get(c.troopId) ?? 0) + c.carryingMeat);
  for (const t of w.troops) {
    let e = openE.get(t.id);
    const now = held.get(t.id) ?? 0, mine = tickCaptors.filter(id => idx.byId.get(id)?.troopId === t.id);
    if (!e && (now > 0 || mine.length > 0)) { e = { troop: t.id, t0: time, t1: null, captures: 0, captors: [], kcal: 0, kcalBy: new Map(), holderTicks: 0, awakeHolderTicks: 0, gutLimited: 0, shares: 0, recipients: new Set(), begs: 0, overnight: false }; episodes.push(e); openE.set(t.id, e); }
    if (!e) continue;
    e.captures += mine.length; e.captors.push(...mine);
    for (const [id, kcal] of tickMeatKcal) { const c = idx.byId.get(id); if (c && c.troopId === t.id) { e.kcal += kcal; e.kcalBy.set(id, (e.kcalBy.get(id) ?? 0) + kcal); } }
    for (const it of fresh) {
      const a = idx.byId.get(it.actorId); if (!a || a.troopId !== t.id) continue;
      // a meat share: the giver held meat and the receiver's meat rose this tick (plant shares move no meat); a meat beg:
      // its target held meat (the act's variant may already be the next act's after it ends in the same tick)
      const r = idx.byId.get(it.targetId);
      if (it.kind === 'share' && (meatBefore.get(a.id) ?? 0) > 0 && r && r.carryingMeat > (meatBefore.get(r.id) ?? 0) + 1e-9) { e.shares++; e.recipients.add(r.id); }
      if (it.kind === 'beg' && (meatBefore.get(it.targetId) ?? 0) > 0) e.begs++;
    }
    for (const c of idx.alive) {
      if (c.troopId !== t.id || c.carryingMeat <= 0) continue;
      e.holderTicks++;
      if (asleep(c)) { if (w.environment.daylight < 0.05) e.overnight = true; continue; }
      e.awakeHolderTicks++;
      const b = meatBefore.get(c.id) ?? 0, fell = b - c.carryingMeat;
      if (!mine.includes(c.id) && b >= offerPerTick && fell >= 0 && fell < 0.999 * offerPerTick) e.gutLimited++;
    }
    if (now <= 0) { e.t1 = time; openE.delete(t.id); }
  }

  // guarding: charges and attacks started, defences
  for (const c of idx.alive) {
    const x = ix(c), pa = prevAct.get(c.id), pt = prevTarget.get(c.id);
    const started = (c.action === 'charge' || c.action === 'attack') && (pa !== c.action || pt !== c.targetId);
    prevAct.set(c.id, c.action); prevTarget.set(c.id, c.targetId);
    if (!started) continue;
    const o = idx.byId.get(c.targetId); if (!o || !o.alive || o.troopId !== c.troopId) continue;
    const qA = assessOdds(w, o, c, P), qW = winOdds(w, o, c, P);
    if (x.v === V.DEFEND) { const ward = idx.byId.get(x.aux); if (ward) defences.push({ wardAge: r4(ward.age), guardianKind: ward.motherId === c.id ? 'mother' : 'caretaker', aggressorAge: r4(o.age), qAssess: r4(assessOdds(w, ward, o, P)) }); }
    const gd = guardianOf(w, o);
    const qual = !!gd && gd !== c && x.seen.includes(gd.id) && d2(gd, o) < P.defendRangeM * P.defendRangeM && !dominates(c, gd);
    charges.push({ c: c.id, o: o.id, ageO: r4(o.age), v: vName(x.v), act: c.action, guardQual: qual, ageLimited: qual && o.age >= P.guardMaxAgeY, guardianKind: kindOf(o, gd), qAssess: r4(qA), qWin: r4(qW), chargerAge: r4(c.age), chargerSex: c.sex });
  }
  if (w.tick % 20 === 0) for (const o of idx.alive) { const ox = ix(o); if (ox.caretaker >= 0 && ox.caretaker !== o.motherId) { const ac = ageClass(o.age); caretakerWardDays[ac] = (caretakerWardDays[ac] ?? 0) + 20 * TICK_HOURS / 24; } }
}
for (const e of openE.values()) e.t1 = null;

// --- summaries -------------------------------------------------------------------------------------------------------
const ep = episodes.filter(e => e.captures > 0);
const deaths = w.chimps.filter(c => !c.alive && !deaths0.has(c.id)).map(c => c.causeOfDeath ?? 'unknown');
const byAge = (rows: { a: number }[]) => Object.fromEntries(AGE_CLASSES.map(k => [k, rows.filter(r => ageClass(r.a) === k).length]));
const cross = (rows: Charge[]) => Object.fromEntries(AGE_CLASSES.map(k => [k, Object.fromEntries(ODDS_CLASSES.map(q => [q, rows.filter(r => ageClass(r.ageO) === k && oddsClass(r.qAssess) === q).length]))]));
const qual = charges.filter(c => c.guardQual);
const eatersAll = ep.flatMap(e => [...e.kcalBy.values()].filter(k => k > 0.5));
const dyads = [...dyadHours.entries()].map(([k, h]) => ({ k, h, n: dyadCops.get(k) ?? 0 }));
const gate = (kind: string) => {
  const g = gateRows.filter(r => r.kind === kind), b = g.filter(r => r.blocked), o = g.filter(r => !r.blocked);
  return { decisions: g.length, blocked: b.length, blockedWouldWin: b.filter(r => r.wouldWin).length, open: o.length, openChosen: o.filter(r => r.chosen === 'mate').length, openWouldWin: o.filter(r => r.wouldWin).length,
    blockedMarginMedian: median(b.map(r => r.margin)), openMarginMedian: median(o.map(r => r.margin)), blockedSinceMedianH: median(b.map(r => r.sinceH)),
    chosenWhenBlocked: tally(b.map(r => r.chosen)), chosenWhenOpenNotMate: tally(o.filter(r => r.chosen !== 'mate').map(r => r.chosen)),
    night: g.filter(r => r.night).length, blockedDay: b.filter(r => !r.night).length, blockedDayWouldWin: b.filter(r => !r.night && r.wouldWin).length,
    openDay: o.filter(r => !r.night).length, openDayChosen: o.filter(r => !r.night && r.chosen === 'mate').length,
    distMedian: median(g.map(r => r.dist)), blockedWouldWinDistMedian: median(b.filter(r => r.wouldWin).map(r => r.dist)) };
};
const hist = (v: number[], edges: number[]) => Object.fromEntries(edges.slice(0, -1).map((e, k) => [`${e}-${edges[k + 1]}`, v.filter(x => x >= e && x < edges[k + 1]).length]));
const result = {
  seed, burnIn, days, params, K: r4(K),
  meat: {
    resolutions: resolutions.length, successes: resolutions.filter(r => r.success).length, captures: resolutions.reduce((a, r) => a + r.captures, 0), meatKcalAll: r4(meatKcalAll),
    episodes: ep.map(e => ({ troop: e.troop, captures: e.captures, kcal: r4(e.kcal), kcalPerCapture: r4(e.kcal / e.captures), eaters: [...e.kcalBy.values()].filter(k => k > 0.5).length,
      kcalPerEater: r4(e.kcal / Math.max(1, [...e.kcalBy.values()].filter(k => k > 0.5).length)), captorKcal: r4(e.captors.reduce((a, id) => a + (e.kcalBy.get(id) ?? 0), 0)),
      minutes: e.t1 !== null ? r4((e.t1 - e.t0) * 60) : null, holderMinAwake: r4(e.awakeHolderTicks * TICK_HOURS * 60), gutLimitedShare: r4(e.gutLimited / Math.max(1, e.awakeHolderTicks)),
      shares: e.shares, recipients: e.recipients.size, begs: e.begs, overnight: e.overnight })),
    kcalPerCapture: r4(ep.reduce((a, e) => a + e.kcal, 0) / Math.max(1, ep.reduce((a, e) => a + e.captures, 0))),
    kcalPerEaterMedian: median(eatersAll), kcalPerEaterMean: mean(eatersAll), eaters: eatersAll.length,
  },
  guard: {
    charges: charges.length, chargesByTargetAge: byAge(charges.map(c => ({ a: c.ageO }))),
    guardQualifiedByAge: byAge(qual.map(c => ({ a: c.ageO }))), guardQualifiedByAgeAndOdds: cross(qual),
    ageLimited: charges.filter(c => c.ageLimited).length, ageLimitedByVariant: tally(charges.filter(c => c.ageLimited).map(c => c.v)),
    deterredUnderAgeRule: qual.filter(c => c.ageO < P.guardMaxAgeY).length, deterredUnderOddsRule: qual.filter(c => c.qAssess < 0.5).length,
    ruleDisagree: { youngButHoldsOwn: qual.filter(c => c.ageO < P.guardMaxAgeY && c.qAssess >= 0.5).length, oldButCannot: qual.filter(c => c.ageO >= P.guardMaxAgeY && c.qAssess < 0.5).length },
    qualifiedByVariant: tally(qual.map(c => c.v)), qualifiedByChargerSex: tally(qual.map(c => c.chargerSex)),
    defences: defences.length, defencesByWardAge: byAge(defences.map(d => ({ a: d.wardAge }))), defencesByGuardian: tally(defences.map(d => d.guardianKind)),
    defencesByWardOdds: tally(defences.map(d => oddsClass(d.qAssess))), defencesWardHoldsOwn: defences.filter(d => d.qAssess >= 0.5).length,
    caretakerWardDays: Object.fromEntries(Object.entries(caretakerWardDays).map(([k, v]) => [k, r4(v)])),
  },
  mate: {
    copulations: cops.length, copsDaylight: cops.filter(c => c.daylight > 0.1).length, copsNight: cops.filter(c => c.daylight <= 0.1).length,
    copsByMaleAct: tally(cops.map(c => c.maleAct)), copsFemaleInit: cops.filter(c => c.femaleInit).length, copsAtMaxSwelling: cops.filter(c => c.swelling >= 0.999).length,
    copsParousMax: cops.filter(c => c.parous && c.swelling >= 0.999).length, copsByMaleAge: tally(cops.map(c => (c.maleAge < 15 ? '10-15' : c.maleAge < 20 ? '15-20' : '>=20'))),
    copsByHour: tally(cops.map(c => Math.floor(c.hour))),
    maxSwollenFemaleH: r4(maxSwollenH), maxSwollenFemaleDayH: r4(maxSwollenDayH), maxSwollenParousH: r4(maxSwollenParousH), swollen75FemaleH: r4(swollen75H),
    copsPerMaxSwollenDayH: r4(cops.filter(c => c.daylight > 0.1 && c.swelling >= 0.999).length / Math.max(1e-9, maxSwollenDayH)),
    dyadH: r4(dyadH), dyadParousH: r4(dyadParousH), dyadDayH: r4(dyadDayH),
    copsPerDyadH: r4(cops.filter(c => c.swelling >= 0.999 && c.maleAge >= 15).length / Math.max(1e-9, dyadH)),
    copsPerParousDyadH: r4(cops.filter(c => c.swelling >= 0.999 && c.maleAge >= 15 && c.parous).length / Math.max(1e-9, dyadParousH)),
    dyadsWith5h: dyads.filter(d => d.h >= 5).length, dyadRateMedian5h: median(dyads.filter(d => d.h >= 5).map(d => d.n / d.h)),
    intervalsMaleMedianH: median(intervalsM), intervalsMaleHist: hist(intervalsM, [0, 0.25, 0.5, 1, 1.5, 1.6, 1.75, 2, 3, 6, 24, 1e9]),
    intervalsFemaleMedianH: median(intervalsF), intervalsFemaleHist: hist(intervalsF, [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 3, 6, 24, 1e9]),
    gateMale: gate('mate'), gateFemale: gate('mateF'),
    mateActs: { male: mateActs.filter(a => a.sex === 'male').length, maleCopulated: mateActs.filter(a => a.sex === 'male' && a.copulated).length,
      female: mateActs.filter(a => a.sex === 'female').length, femaleCopulated: mateActs.filter(a => a.sex === 'female' && a.copulated).length,
      endedWithoutPartnerRefusing: mateActs.filter(a => !a.copulated && !['flee', 'charge', 'attack', 'submit'].includes(a.partnerAct)).length,
      endedPartnerRefusing: mateActs.filter(a => !a.copulated && ['flee', 'charge', 'attack', 'submit'].includes(a.partnerAct)).length, minutesMedian: median(mateActs.map(a => a.minutes)) },
  },
  deaths: tally(deaths),
};
const json = JSON.stringify(result, null, 1);
if (out) writeFileSync(out, json); else console.log(json);
console.error(`seed ${seed}: captures ${result.meat.captures}, kcal/capture ${result.meat.kcalPerCapture}, guard-qualified ${qual.length} (age-limited ${result.guard.ageLimited}), defences ${defences.length}, copulations ${cops.length} (${result.mate.copsPerMaxSwollenDayH}/max-swollen day-h)`);
