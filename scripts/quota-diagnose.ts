// Stage E5e diagnosis (development tool, simulation truth; docs/staging/e5e-prereg.md §2): how often each of five
// registered gates binds, what the animals' states and memories were when it did, and the behaviours they gate. Reads
// every gate as candidates.ts evaluates it (the quotaTrace hook: it draws nothing and writes nothing), the contests as
// conflict.ts resolves them (contestTrace, likewise) and the RG decisions (rgTap), and the world after each tick.
//
// Opportunity (per gate): a decision (computeCandidates at a decision point) at which every other condition of the
// option holds for this target; blocked: the quota or the clock removed it.
//   greet      pantGruntRepeatH: a subordinate ≥ 5 y, not carried, an own-community dominant in sight within
//              pantGruntRangeM (males from pantGruntMaleAgeY, anyone from 15 y); blocked if it greeted that dominant
//              within the interval. Unit: (decision, dyad).
//   feed       feedChargeGapH: a feeding charge at a subordinate feeding in its crown (or one it sees, when hungry),
//              scarce fruit, in range, not kin, not its ward; blocked if its last aggression was within the gap.
//   immigrant  immigrantChargeGapH: a resident female ≥ 15 y (tenure ≥ 3 y) and an immigrant female (< 2 y since
//              immigration) within immigrantChargeRangeM; blocked if her last aggression was within the gap.
//   consort    consortLatestHour: a non-alpha male ≥ 15 y, a female swollen ≥ consortSwellingMin with bond ≥
//              consortBondMin, not guarded, he not already consorting; blocked at world.hour ≥ the hour.
//   caller     joinCallDistScaleM: every approach to a heard caller offered (a fresh call, beyond joinCallMinM): the
//              distance, the score, the distance term d ÷ joinCallDistScaleM; whether taken (RG draw), its choice
//              probability and the probability without the distance term (first step, menu held fixed).
// Association (an observer's definition, for the greeting readouts): two community members ≥ 5 y within sightDayM (the
//   model's daylight sight radius) at a 5-min scan, at any hour; a reunion = the first such scan after ≥ 1 h without
//   one (the model's own reunion span, perception.ts newcomers). An association bout runs from a reunion to the next.
// Behaviours (from the interactions and calls each tick emits): pant-grunts given (actor → recipient), by class, to the
//   alpha, male → male (both ≥ 12 y, Gilby's sample) to the top 3 ranked males (T-SOC-6 in truth); first in its bout or a
//   repeat; per subordinate-day (chimp-days of animals ≥ 5 y), per dyad-day (ordered pairs subordinate ≥ 5 y →
//   eligible dominant, counted at each day's midpoint) and per co-present dyad-day (pairs with ≥ 1 greeting opportunity
//   that day). Charges started by variant (FEED, IMMIGRANT; the charger's act variant when the interaction opens), per
//   adult-day (≥ 15 y) and per charger-class day; the target's response to it (contestTrace). Consortships started
//   (interaction 'consort', a male leading), by hour of day; their duration, path and minutes in darkness (daylight <
//   0.1). Approaches to callers (travel V.CALLER bouts started) per chimp-day by class; their path (m), minutes,
//   locomotion kcal (energyTap), and whether they reached the call's position (within joinCallStopM + 2 m); the km a
//   day walked to callers; every class's daily path (steps over 2·runMps·tick + 2 m are teleports and skipped).
//
//   pnpm exec tsx scripts/quota-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--params '{…}' | --params-file f.json] [--json f.json]
// Development seeds only (AGENTS.md lists the reserved ones); burn-in + days ≤ 90.
import { readFileSync, writeFileSync } from 'node:fs';
import { candidateMeta, quotaTrace, V, type QuotaKind } from '../src/sim/candidates';
import { contestTrace } from '../src/sim/conflict';
import { energyTap } from '../src/sim/energy';
import { daylightAt } from '../src/sim/environment';
import { dominates } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { rgTap } from '../src/sim/rg';
import { sleepPressure } from '../src/sim/rhythm';
import { fastNow } from '../src/sim/endocrine';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const pf = arg('params-file', '');
const params = pf ? JSON.parse(readFileSync(pf, 'utf8')) : JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
const DAY = Math.round(24 / TICK_HOURS), SCAN = Math.round(5 / 60 / TICK_HOURS), REUNION_H = 1;
const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const VNAME: Record<number, string> = Object.fromEntries(Object.entries(V).map(([k, v]) => [v, k]));

const CLASSES = ['adult male', 'adult female', 'adolescent 12–15 y', 'juvenile 5–12 y'] as const;
type Cls = typeof CLASSES[number];
const clsOf = (c: Chimp): Cls | null => !c.alive || c.age < 5 ? null : c.age < 12 ? 'juvenile 5–12 y' : c.age < 15 ? 'adolescent 12–15 y' : c.sex === 'male' ? 'adult male' : 'adult female';
const chimpDays = Object.fromEntries(CLASSES.map(k => [k, 0])) as Record<Cls, number>;
const pathM = Object.fromEntries(CLASSES.map(k => [k, 0])) as Record<Cls, number>;
let adultFemaleImmDays = 0, residentFemaleDays = 0, maleDays15 = 0;

/** Hours-since bins for blocked opportunities. */
const binOf = (h: number, edges: number[]) => { let i = 0; while (i < edges.length && h >= edges[i]) i++; return i; };
const GREET_EDGES = [1, 2, 4], AGG_EDGES = [0.25, 0.5], DIST_EDGES = [250, 500, 1000, 2000];
const blankGate = () => ({ opp: 0, blocked: 0, oppDecisions: 0, blockedDecisions: 0, bins: [0, 0, 0, 0], blockedScore: 0, openScore: 0, outrankChosen: 0, outrankChecked: 0,
  hunger: 0, stress: 0, arousal: 0, fast: 0, byClass: {} as Record<string, [number, number]> });
const G = { greet: blankGate(), feed: blankGate(), immigrant: blankGate(), consort: blankGate() } as Record<Exclude<QuotaKind, 'caller'>, ReturnType<typeof blankGate>>;
// greeting memory at blocked opportunities
const gm = { newBout: 0, greetedThisBout: 0, notGreetedThisBout: 0, alpha: 0, displaying: 0, eloGapSum: 0, eloGapN: 0, boutAgeSum: 0, boutAgeN: 0 };
// aggression memory at blocked feed/immigrant opportunities: last aggression variant, same target, the target's last response to it
const am = { feed: { lastVar: {} as Record<string, number>, sameTarget: 0, resp: {} as Record<string, number> }, immigrant: { lastVar: {} as Record<string, number>, sameTarget: 0, resp: {} as Record<string, number> } };
// consort opportunities by hour: [opp, blocked]; daylight left and sleep pressure at blocked ones
const consortHour: Record<number, [number, number]> = {};
const cm = { daylightLeftSum: 0, sleepSum: 0, energySum: 0, n: 0 };
// pant-grunts given
const pg = { n: 0, byClass: {} as Record<string, number>, toAlpha: 0, mm: 0, mmTop3: 0, first: 0, repeat: 0, latencySum: 0, latencyN: 0, nightN: 0 };
let dyadDays = 0, coDyadDays = 0, reunions = 0, boutsWithGreet = 0; // co-present dyad-days: ordered pairs with ≥ 1 greeting opportunity that day
// charges and consortships started
const charges = { FEED: 0, IMMIGRANT: 0, all: 0, byVar: {} as Record<string, number>, resp: { FEED: {} as Record<string, number>, IMMIGRANT: {} as Record<string, number> } };
const consorts = { n: 0, byHour: {} as Record<number, number>, durH: 0, pathM: 0, darkMin: 0, closed: 0, afterSunset: 0 };
// approaches to callers
const callers = { offers: 0, offerByClass: {} as Record<string, number>, distBins: [0, 0, 0, 0, 0], dSum: 0, termSum: 0, scoreSum: 0, onMenu: 0, pSum: 0, pNoDistSum: 0,
  started: {} as Record<string, number>, bouts: 0, boutPath: 0, boutMin: 0, boutKcal: 0, reached: 0, startDist: 0, kmByClass: {} as Record<string, number>, kcalByClass: {} as Record<string, number> };
let decisionsRG = 0;

for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2, SIGHT2 = P.sightDayM * P.sightDayM;
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  // association bookkeeping per unordered pair (ids < 100000): last scan together, start of the current bout
  const lastTog = new Map<number, number>(), boutStart = new Map<number, number>(), boutGreeted = new Set<number>();
  const pk = (a: number, b: number) => a < b ? a * 100000 + b : b * 100000 + a;
  const dk = (a: number, b: number) => a * 100000 + b; // ordered
  const coToday = new Set<number>();
  // per decision: gates opened or blocked, for the decision counts and the outrank check (cleared every tick)
  const pendBlk = new Map<number, { tick: number; s: Partial<Record<QuotaKind, number>> }>(), pendCaller = new Map<number, { tick: number; d: number }>();
  const decKey = new Set<string>();
  const firstGreet = new Map<number, number>(); // ordered dyad → the bout start of its last greeting
  const lastAgg = new Map<number, { v: number; target: number; t: number }>(), lastResp = new Map<number, { target: number; resp: string }>();
  const prevPos = new Map<number, [number, number]>();
  const callBout = new Map<number, { t0: number; path: number; kcal: number; jx: number; jz: number; d0: number }>();
  const consortBout = new Map<number, { t0: number; path: number; dark: number; target: number }>();
  let seenInter = w.nextId;
  const dayOfTick = () => Math.floor(w.time / 24);

  quotaTrace.on = (kind, c, o, blocked, a, b) => {
    const k = clsOf(c) ?? 'infant';
    if (kind === 'caller') {
      pendCaller.set(c.id, { tick: w.tick, d: a });
      callers.offers++; callers.offerByClass[k] = (callers.offerByClass[k] ?? 0) + 1; callers.distBins[binOf(a, DIST_EDGES)]++; callers.dSum += a; callers.termSum += a / P.joinCallDistScaleM; callers.scoreSum += b;
      return;
    }
    if (kind === 'greet' && o) {
      coToday.add(dk(c.id, o.id));
      // an opportunity is within pantGruntRangeM < sightDayM, so the pair is in association now (reunion if ≥ 1 h apart)
      const p = pk(c.id, o.id), lt = lastTog.get(p);
      if (lt === undefined || w.time - lt > REUNION_H + 1e-9) { boutStart.set(p, w.time); reunions++; }
      lastTog.set(p, w.time);
    }
    if (kind === 'consort') { const ch = consortHour[Math.floor(a)] ??= [0, 0]; ch[0]++; if (blocked) ch[1]++; }
    const g = G[kind];
    g.opp++; const bc = g.byClass[k] ?? (g.byClass[k] = [0, 0]); bc[0]++;
    const key = `${kind}:${c.id}:${c.decisionVersion}`;
    if (!decKey.has(key)) { decKey.add(key); g.oppDecisions++; }
    if (!blocked) { g.openScore += b; return; }
    g.blocked++; bc[1]++; g.blockedScore += b;
    if (!decKey.has(key + ':b')) { decKey.add(key + ':b'); g.blockedDecisions++; }
    let pe = pendBlk.get(c.id);
    if (!pe || pe.tick !== w.tick) { pe = { tick: w.tick, s: {} }; pendBlk.set(c.id, pe); }
    pe.s[kind] = Math.max(pe.s[kind] ?? -Infinity, b);
    const x = ix(c);
    g.hunger += c.hunger; g.stress += c.stress; g.arousal += x.arousal ?? 0; g.fast += fastNow(x, w.time, P);
    if (kind === 'greet' && o) {
      g.bins[binOf(a, GREET_EDGES)]++;
      const bs = boutStart.get(pk(c.id, o.id)) ?? w.time, lastG = w.time - a;
      if (bs === w.time) gm.newBout++;
      if (lastG >= bs) gm.greetedThisBout++; else gm.notGreetedThisBout++;
      gm.boutAgeSum += w.time - bs; gm.boutAgeN++;
      if (index(w).troopById.get(c.troopId)?.alphaId === o.id) gm.alpha++;
      if (o.action === 'display' || o.action === 'charge') gm.displaying++;
      gm.eloGapSum += Math.abs(o.elo - c.elo); gm.eloGapN++;
    } else if ((kind === 'feed' || kind === 'immigrant') && o) {
      g.bins[binOf(a, AGG_EDGES)]++;
      const la = lastAgg.get(c.id), mm = am[kind];
      const lv = la ? VNAME[la.v] ?? String(la.v) : 'before window';
      mm.lastVar[lv] = (mm.lastVar[lv] ?? 0) + 1;
      if (la && la.target === o.id) mm.sameTarget++;
      const lr = lastResp.get(c.id), rs = lr ? (lr.target === o.id ? 'same target: ' : 'other: ') + lr.resp : 'none';
      mm.resp[rs] = (mm.resp[rs] ?? 0) + 1;
    } else if (kind === 'consort') {
      let left = 0; for (let q = 0; q < 14 * 12; q++) { if (daylightAt(w, w.time + q / 12) < 0.1) break; left = (q + 1) / 12; }
      cm.daylightLeftSum += left; cm.sleepSum += sleepPressure(c); cm.energySum += c.energy; cm.n++;
    }
  };
  contestTrace.on = e => {
    if (e.kind !== 'charge') return;
    lastResp.set(e.c.id, { target: e.o.id, resp: e.response });
    const v = ix(e.c).v, nm = v === V.FEED ? 'FEED' : v === V.IMMIGRANT ? 'IMMIGRANT' : null;
    if (nm) charges.resp[nm][e.response] = (charges.resp[nm][e.response] ?? 0) + 1;
  };
  rgTap.fn = (c, _list, menu, probs, chosen) => {
    decisionsRG++;
    const pe = pendBlk.get(c.id);
    if (pe && pe.tick === w.tick) {
      for (const kind of ['greet', 'feed', 'immigrant', 'consort'] as const) {
        const b = pe.s[kind];
        if (b === undefined) continue;
        G[kind].outrankChecked++; if (b > chosen.score) G[kind].outrankChosen++;
      }
      pendBlk.delete(c.id);
    }
    const pc = pendCaller.get(c.id);
    if (pc && pc.tick === w.tick && menu.length >= 2 && probs.length === menu.length) {
      const j = menu.findIndex(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.CALLER);
      if (j >= 0) {
        const T = P.rgTemperature, sc = menu.map(k => k.score);
        const s2 = Math.min(3, Math.max(0, sc[j] + pc.d / P.joinCallDistScaleM)), m2 = Math.max(...sc, s2);
        const e2 = sc.map((v, q) => Math.exp(((q === j ? s2 : v) - m2) / T)), z2 = e2.reduce((s, v) => s + v, 0);
        callers.onMenu++; callers.pSum += probs[j]; callers.pNoDistSum += e2[j] / z2;
      }
    }
    pendCaller.delete(c.id);
  };
  energyTap.fn = (c, term, kcal) => {
    if (term !== 'walk' && term !== 'climb' && term !== 'carry') return;
    const b = callBout.get(c.id); if (b && c.action === 'travel' && ix(c).v === V.CALLER) b.kcal += kcal;
  };
  for (const c of w.chimps) if (c.alive) prevPos.set(c.id, [c.position[0], c.position[2]]);
  let day0 = dayOfTick();
  for (let i = 0; i < days * DAY; i++) {
    tickWorld(w);
    const t = w.time, idx = index(w), byId = idx.byId;
    decKey.clear();
    // new interactions this tick: pant-grunts, charges, consortships
    const inter = w.interactions;
    for (let q = inter.length - 1; q >= 0 && inter[q].id >= seenInter; q--) {
      const it = inter[q], a = byId.get(it.actorId), o = byId.get(it.targetId);
      if (!a) continue;
      if (it.kind === 'pant-grunt' && o) {
        const k = clsOf(a) ?? 'infant';
        pg.n++; pg.byClass[k] = (pg.byClass[k] ?? 0) + 1;
        if (idx.troopById.get(a.troopId)?.alphaId === o.id) pg.toAlpha++;
        if (a.sex === 'male' && o.sex === 'male' && a.age >= 12 && o.age >= 12) { pg.mm++; if (o.rankOrder >= 1 && o.rankOrder <= 3) pg.mmTop3++; }
        if (w.environment.daylight < 0.1) pg.nightN++;
        const p = pk(a.id, o.id), od = dk(a.id, o.id), lt = lastTog.get(p);
        if (lt === undefined || t - lt > REUNION_H + 1e-9) { boutStart.set(p, t); reunions++; }
        lastTog.set(p, t);
        const bs = boutStart.get(p)!;
        if (firstGreet.get(od) === bs) pg.repeat++; else { firstGreet.set(od, bs); pg.first++; pg.latencySum += t - bs; pg.latencyN++; boutsWithGreet++; }
      } else if (it.kind === 'charge' || it.kind === 'fight' || it.kind === 'coalition' || it.kind === 'intergroup' || it.kind === 'infanticide') {
        const x = ix(a);
        if ((a.action === 'charge' || a.action === 'attack') && x.interId === it.id) {
          lastAgg.set(a.id, { v: x.v, target: it.targetId, t });
          const nm = VNAME[x.v] ?? String(x.v);
          charges.byVar[nm] = (charges.byVar[nm] ?? 0) + 1; charges.all++;
          if (x.v === V.FEED) charges.FEED++; else if (x.v === V.IMMIGRANT) charges.IMMIGRANT++;
        }
      } else if (it.kind === 'consort' && a.sex === 'male') {
        consorts.n++; const h = Math.floor(w.hour); consorts.byHour[h] = (consorts.byHour[h] ?? 0) + 1;
        consortBout.set(a.id, { t0: t, path: 0, dark: 0, target: it.targetId });
      }
    }
    seenInter = w.nextId;
    // per chimp: class days, paths, caller and consort bouts
    for (const c of idx.alive) {
      const k = clsOf(c), x = ix(c), pp = prevPos.get(c.id);
      const step = pp ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
      const st = step <= MAX_STEP ? step : 0;
      if (pp) { pp[0] = c.position[0]; pp[1] = c.position[2]; } else prevPos.set(c.id, [c.position[0], c.position[2]]);
      if (k) { chimpDays[k] += 1 / DAY; pathM[k] += st; }
      if (c.sex === 'male' && c.age >= 15) maleDays15 += 1 / DAY;
      if (c.sex === 'female' && c.age >= 15) { if (x.immigrantAge >= 0 && c.age - x.immigrantAge < 2) adultFemaleImmDays += 1 / DAY; else residentFemaleDays += 1 / DAY; }
      // approaches to callers
      const toCaller = c.action === 'travel' && x.v === V.CALLER;
      let cb = callBout.get(c.id);
      if (toCaller && !cb) {
        cb = { t0: t, path: 0, kcal: 0, jx: x.joinX, jz: x.joinZ, d0: Math.hypot(x.joinX - c.position[0], x.joinZ - c.position[2]) }; callBout.set(c.id, cb);
        const kk = k ?? 'infant'; callers.started[kk] = (callers.started[kk] ?? 0) + 1;
      }
      if (cb) {
        if (toCaller) { cb.path += st; if (k) callers.kmByClass[k] = (callers.kmByClass[k] ?? 0) + st / 1000; }
        else {
          callers.bouts++; callers.boutPath += cb.path; callers.boutMin += (t - cb.t0) * 60; callers.boutKcal += cb.kcal; callers.startDist += cb.d0;
          if (Math.hypot(cb.jx - c.position[0], cb.jz - c.position[2]) <= P.joinCallStopM + 2) callers.reached++;
          if (k) callers.kcalByClass[k] = (callers.kcalByClass[k] ?? 0) + cb.kcal;
          callBout.delete(c.id);
        }
      }
      const kb = consortBout.get(c.id);
      if (kb) {
        if (c.action === 'consort' && c.targetId === kb.target) { kb.path += st; if (w.environment.daylight < 0.1) kb.dark += TICK_HOURS * 60; }
        else { consorts.closed++; consorts.durH += t - kb.t0; consorts.pathM += kb.path; consorts.darkMin += kb.dark; if (kb.dark > 0) consorts.afterSunset++; consortBout.delete(c.id); }
      }
    }
    // association scans every 5 min
    if (w.tick % SCAN === 0) {
      for (const tr of w.troops) {
        const mem = idx.alive.filter(c => c.troopId === tr.id && c.age >= 5);
        for (let a = 0; a < mem.length; a++) for (let b = a + 1; b < mem.length; b++) {
          const A = mem[a], B = mem[b], dx = A.position[0] - B.position[0], dz = A.position[2] - B.position[2];
          if (dx * dx + dz * dz > SIGHT2) continue;
          const p = pk(A.id, B.id), lt = lastTog.get(p);
          if (lt === undefined || t - lt > REUNION_H + 1e-9) { boutStart.set(p, t); reunions++; }
          lastTog.set(p, t);
        }
      }
    }
    // dyad-days at each day's midpoint: ordered pairs subordinate ≥ 5 y → eligible dominant
    if (i % DAY === DAY / 2) {
      for (const tr of w.troops) {
        const mem = idx.alive.filter(c => c.troopId === tr.id);
        for (const c of mem) { if (c.age < 5) continue; for (const o of mem) if (o !== c && ((o.sex === 'male' && o.age >= P.pantGruntMaleAgeY) || o.age >= 15) && dominates(o, c)) dyadDays++; }
      }
    }
    const d = dayOfTick();
    if (d !== day0) { coDyadDays += coToday.size; coToday.clear(); day0 = d; }
  }
  coDyadDays += coToday.size;
  quotaTrace.on = null; contestTrace.on = null; rgTap.fn = null; energyTap.fn = null;
}

const cd = (k: Cls) => Math.max(1e-9, chimpDays[k]);
const sub = CLASSES.reduce((s, k) => s + chimpDays[k], 0);
const gate = (k: keyof typeof G) => {
  const g = G[k], n = Math.max(1, g.blocked);
  return { opportunities: g.opp, blocked: g.blocked, blockedShare: r3(g.blocked / Math.max(1, g.opp)), decisionsWithOpportunity: g.oppDecisions, decisionsBlocked: g.blockedDecisions,
    blockedHoursSinceBins: g.bins, meanWouldBeScoreBlocked: r3(g.blockedScore / n), meanScoreOpen: r3(g.openScore / Math.max(1, g.opp - g.blocked)),
    blockedOutranksChosen: r3(g.outrankChosen / Math.max(1, g.outrankChecked)), outrankChecked: g.outrankChecked,
    atBlocked: { hunger: r3(g.hunger / n), stress: r3(g.stress / n), arousal: r3(g.arousal / n), fast: r3(g.fast / n) },
    byClass: Object.fromEntries(Object.entries(g.byClass).map(([q, [o, b]]) => [q, { opp: o, blocked: b, share: r3(b / Math.max(1, o)) }])) };
};
const result = {
  tool: 'quota-diagnose', seeds, burnIn, days, params,
  chimpDays: Object.fromEntries(CLASSES.map(k => [k, r3(chimpDays[k])])),
  pathKmPerDay: Object.fromEntries(CLASSES.map(k => [k, r3(pathM[k] / cd(k) / 1000)])),
  decisionsRG,
  greet: { gate: gate('greet'),
    atBlocked: { newBout: gm.newBout, greetedThisBout: gm.greetedThisBout, notGreetedThisBout: gm.notGreetedThisBout, shareGreetedThisBout: r3(gm.greetedThisBout / Math.max(1, gm.greetedThisBout + gm.notGreetedThisBout)),
      meanBoutAgeH: r3(gm.boutAgeSum / Math.max(1, gm.boutAgeN)), toAlpha: gm.alpha, dominantDisplaying: gm.displaying, meanEloGap: r3(gm.eloGapSum / Math.max(1, gm.eloGapN)) },
    given: { n: pg.n, byClass: pg.byClass, perSubordinateDay: r3(pg.n / Math.max(1e-9, sub)), perDyadDay: r3(pg.n / Math.max(1, dyadDays)), perCoPresentDyadDay: r3(pg.n / Math.max(1, coDyadDays)),
      dyadDays, coPresentDyadDays: coDyadDays, toAlphaShare: r3(pg.toAlpha / Math.max(1, pg.n)), maleMale: pg.mm, maleMaleTop3Share: r3(pg.mmTop3 / Math.max(1, pg.mm)),
      firstInBout: pg.first, repeatInBout: pg.repeat, meanLatencyFromReunionMin: r3(pg.latencySum / Math.max(1, pg.latencyN) * 60), atNight: pg.nightN },
    reunions, boutsWithGreet },
  feed: { gate: gate('feed'), atBlocked: { lastAggression: am.feed.lastVar, sameTarget: am.feed.sameTarget, lastResponse: am.feed.resp },
    started: charges.FEED, perAdultDay: r3(charges.FEED / Math.max(1e-9, chimpDays['adult male'] + chimpDays['adult female'])), perChargerClassDay12: r3(charges.FEED / Math.max(1e-9, chimpDays['adult male'] + chimpDays['adult female'] + chimpDays['adolescent 12–15 y'])),
    responses: charges.resp.FEED },
  immigrant: { gate: gate('immigrant'), atBlocked: { lastAggression: am.immigrant.lastVar, sameTarget: am.immigrant.sameTarget, lastResponse: am.immigrant.resp },
    started: charges.IMMIGRANT, perAdultDay: r3(charges.IMMIGRANT / Math.max(1e-9, chimpDays['adult male'] + chimpDays['adult female'])), perResidentFemaleDay: r3(charges.IMMIGRANT / Math.max(1e-9, residentFemaleDays)),
    immigrantFemaleDays: r3(adultFemaleImmDays), responses: charges.resp.IMMIGRANT },
  chargesByVariant: charges.byVar,
  consort: { gate: gate('consort'), opportunitiesByHour: consortHour, atBlocked: { daylightLeftH: r3(cm.daylightLeftSum / Math.max(1, cm.n)), sleepPressure: r3(cm.sleepSum / Math.max(1, cm.n)), energy: r3(cm.energySum / Math.max(1, cm.n)) },
    started: consorts.n, perAdultMaleDay: r3(consorts.n / Math.max(1e-9, maleDays15)), byHour: consorts.byHour, closed: consorts.closed, meanDurationH: r3(consorts.durH / Math.max(1, consorts.closed)),
    meanPathM: r3(consorts.pathM / Math.max(1, consorts.closed)), darkMinutes: r3(consorts.darkMin), boutsIntoDarkness: consorts.afterSunset },
  caller: { offers: callers.offers, offersPerChimpDay: Object.fromEntries(Object.entries(callers.offerByClass).map(([k, v]) => [k, r3(v / (CLASSES.includes(k as Cls) ? cd(k as Cls) : NaN))])),
    offerDistanceBins: callers.distBins, meanOfferDistM: r3(callers.dSum / Math.max(1, callers.offers)), meanDistanceTerm: r3(callers.termSum / Math.max(1, callers.offers)), meanOfferScore: r3(callers.scoreSum / Math.max(1, callers.offers)),
    onMenu: callers.onMenu, meanChoiceP: r3(callers.pSum / Math.max(1, callers.onMenu)), meanChoicePWithoutDistance: r3(callers.pNoDistSum / Math.max(1, callers.onMenu)),
    startedPerChimpDay: Object.fromEntries(Object.entries(callers.started).map(([k, v]) => [k, r3(v / (CLASSES.includes(k as Cls) ? cd(k as Cls) : NaN))])),
    bouts: callers.bouts, meanStartDistM: r3(callers.startDist / Math.max(1, callers.bouts)), meanPathM: r3(callers.boutPath / Math.max(1, callers.bouts)), meanMinutes: r3(callers.boutMin / Math.max(1, callers.bouts)),
    meanLocoKcal: r3(callers.boutKcal / Math.max(1, callers.bouts)), reachedShare: r3(callers.reached / Math.max(1, callers.bouts)),
    kmPerChimpDay: Object.fromEntries(CLASSES.map(k => [k, r3((callers.kmByClass[k] ?? 0) / cd(k))])) },
};
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
