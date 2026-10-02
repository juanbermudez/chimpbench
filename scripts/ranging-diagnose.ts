// Stage E1j ranging diagnosis (development tool; reads only; docs/staging/e1j-prereg.md §2–§3). The world and the focal
// observer are e-bench's (src/field/run.ts runFieldJob: focal team set at observer seed 1), without the party-follow team
// sets and the field experiments (they never write the world), so the focal follows are e-bench's: the T-RNG-4 and T-RNG-5
// values printed under "identity" must equal e-bench's per-seed values for the same seed and params.
//
// Classes (adults ≥ 15 y): male; lactating female (c.lactating), split by her youngest dependent infant's age (< 2 y,
// ≥ 2 y); pregnant female (not lactating); other adult female.
//
// Observer (complete follows ≥ 8 h, as T-RNG-4/5), per class:
//   todayKm   = Σ straight lines between successive 5-min fixes over the whole follow (src/field/metrics.ts dayRange)
//   fieldKm   = batesByrne2009's method: fixes only while travelling. A halt is a run of 1-min point samples that stays
//               within 35 m of its first point for 20 min or more (the paper: a halt of "20 minutes or more", its area
//               "within a 35m radius of the initial stopping point"); every 5-min fix inside a halt is recorded at the
//               halt's first point, so movement inside halts adds nothing
//   actKm     = the same with halts taken from activity: runs of 20 min or more with no point sample in the travel category
//   halts and phases per follow-day, mean halt length (min), mean phase length (m), share of follow minutes with an
//   adult male in the focal's party (point samples' partyAM, other than the focal)
// Truth (simulation state, every tick), per class, per chimp-day of that class:
//   path (km/day, all movement; steps longer than 2·runMps·tick + 2 m are teleports and skipped) and its parts by the
//   act being executed: own trip to food (travel to a tree, no leader), joined trip (travel to a leader's tree, C13e),
//   to callers, home pull, follow a party member, to the crown (forage, walking in), in the crown (forage, phase ≥ 2),
//   ground forage (fallback, walking at the forage pace), drink (to water), patrol, consort, nest, groom approach, play,
//   mate guarding, other; bouts of each part per chimp-day (entries into it) and metres per bout; the same path by
//   action, and the daylight path;
//   in daylight (> 0.1): share of minutes with another adult male in the own party, with no other member ≥ 5 y, mean
//   party size (members ≥ 5 y, self included); halts (the same 35 m / 20 min rule on 1-min positions) and trips (the
//   movement between two halts) per chimp-day, trip length (m), halt length (min), path in trips (km/day);
//   mothers only: minutes a day carrying an infant (candidates.ts isCarried; all day and in daylight), carry, walk and
//   climb kcal a day (energyTap),
//   daylight minutes a day with the dependent infant in the nurse act, and the mother's speed then and otherwise (m/min).
//
//   pnpm exec tsx scripts/ranging-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { CAT_TRAVEL } from '../src/field/categories';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { createWorld, tickWorld } from '../src/simulation';
import { isCarried, V } from '../src/sim/candidates';
import { energyTap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import type { Chimp } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760, MIN = Math.round(1 / 60 / TICK_HOURS), HALT_M = 35, HALT_MIN = 20;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2;
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
const obs = createObserver(w, { profile: PROFILES.field, truth: true, demography: false, seed: 1 });

const CLASSES = ['male', 'lact', 'lact <2y', 'lact >=2y', 'pregnant', 'female other'] as const;
type Cls = typeof CLASSES[number];
const PARTS = ['own trip', 'joined trip', 'to callers', 'home', 'follow party', 'to crown', 'in crown', 'ground forage', 'drink', 'patrol', 'consort', 'nest', 'groom approach', 'play', 'guard', 'other'] as const;
type Part = typeof PARTS[number];

/** Youngest dependent (unweaned, under 6 y) infant's age per carer, refreshed every minute; and the infant itself. */
const youngAge = new Map<number, number>(), youngId = new Map<number, number>();
function refreshInfants(): void {
  youngAge.clear(); youngId.clear();
  for (const c of index(w).alive) {
    const x = ix(c);
    if (x.weaned || c.age >= 6) continue;
    const m = x.caretaker >= 0 ? x.caretaker : c.motherId;
    if (m < 0) continue;
    const a = youngAge.get(m);
    if (a === undefined || c.age < a) { youngAge.set(m, c.age); youngId.set(m, c.id); }
  }
}
/** Classes of an adult (the pooled lactating class and its infant-age sub-class), or null. */
function classesOf(c: Chimp): Cls[] | null {
  if (!c.alive || c.age < 15) return null;
  if (c.sex === 'male') return ['male'];
  if (c.lactating) { const a = youngAge.get(c.id); return ['lact', a !== undefined && a >= 2 ? 'lact >=2y' : 'lact <2y']; }
  return [c.pregnancy > 0 ? 'pregnant' : 'female other'];
}
function partOf(c: Chimp): Part {
  const x = ix(c);
  switch (c.action) {
    case 'travel': return x.v === V.TREE ? (x.aux > 0 ? 'joined trip' : 'own trip') : x.v === V.CALLER ? 'to callers' : x.v === V.HOME ? 'home' : 'other';
    case 'follow': return x.v === V.PARTY ? 'follow party' : 'other';
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

interface Truth {
  ticks: number; path: number; dayPath: number; parts: Record<Part, number>; bouts: Record<Part, number>; byAction: Record<string, number>;
  dayMin: number; withMale: number; alone: number; partySize: number;
  halts: number; haltMin: number; trips: number; tripM: number; tripPathM: number;
  carryMin: number; carryDayMin: number; carryKcal: number; walkKcal: number; climbKcal: number; nurseMin: number; nurseM: number; otherDayM: number;
}
const blank = (): Truth => ({ ticks: 0, path: 0, dayPath: 0, parts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>, bouts: Object.fromEntries(PARTS.map(p => [p, 0])) as Record<Part, number>, byAction: {}, dayMin: 0, withMale: 0, alone: 0, partySize: 0,
  halts: 0, haltMin: 0, trips: 0, tripM: 0, tripPathM: 0, carryMin: 0, carryDayMin: 0, carryKcal: 0, walkKcal: 0, climbKcal: 0, nurseMin: 0, nurseM: 0, otherDayM: 0 });
const T = Object.fromEntries(CLASSES.map(k => [k, blank()])) as Record<Cls, Truth>;

// per-id scratch: last position (path), and the streaming halt detector on 1-min daylight positions
const px: number[] = [], pz: number[] = [], lastPart: (Part | undefined)[] = [];
interface Halt { ax: number; az: number; at: number; inHalt: boolean; phase: number; lx: number; lz: number; open: boolean }
const halt = new Map<number, Halt>();
let minute = 0;

energyTap.fn = (c, term, kcal) => {
  if (term !== 'carry' && term !== 'walk' && term !== 'climb') return;
  const ks = classesOf(c); if (!ks) return;
  for (const k of ks) { const t = T[k]; if (term === 'carry') t.carryKcal += kcal; else if (term === 'walk') t.walkKcal += kcal; else t.climbKcal += kcal; }
};

/** The 35 m / 20 min halt rule on one animal's 1-min daylight positions. */
function haltStep(c: Chimp, ks: Cls[]): void {
  const x0 = c.position[0], z0 = c.position[2];
  let h = halt.get(c.id);
  if (!h || !h.open) { h = { ax: x0, az: z0, at: minute, inHalt: false, phase: 0, lx: x0, lz: z0, open: true }; halt.set(c.id, h); return; }
  const step = Math.hypot(x0 - h.lx, z0 - h.lz); h.lx = x0; h.lz = z0;
  if (Math.hypot(x0 - h.ax, z0 - h.az) <= HALT_M) {
    if (!h.inHalt) {
      if (minute - h.at >= HALT_MIN) {
        // a halt is confirmed: the trip that ended at its first point is complete
        h.inHalt = true;
        for (const k of ks) { const t = T[k]; t.halts++; if (h.phase > 0) { t.trips++; t.tripM += h.phase; } }
      } else h.phase += step;
    }
    return;
  }
  if (h.inHalt) {
    for (const k of ks) T[k].haltMin += minute - 1 - h.at;
    h.inHalt = false; h.phase = Math.hypot(x0 - h.ax, z0 - h.az);
    for (const k of ks) T[k].tripPathM += h.phase;
  } else { h.phase += step; for (const k of ks) T[k].tripPathM += step; }
  h.ax = x0; h.az = z0; h.at = minute;
}
/** Night closes every open detector (an unfinished trip or halt is not counted). */
function haltClose(): void { for (const h of halt.values()) h.open = false; }

// follows: the focal's state at the start of each follow (pregnancy, infant age)
const followX: { pregnant: boolean; infantAge: number }[] = [];
const t0 = performance.now();
const ticks = Math.round(days * DAY);
for (let i = 0; i < ticks; i++) {
  tickWorld(w);
  observerStep(obs, w);
  while (followX.length < obs.rec.follows.length) {
    const f = obs.rec.follows[followX.length], c = index(w).byId.get(f.focal);
    followX.push({ pregnant: !!c && c.pregnancy > 0 && !c.lactating, infantAge: youngAge.get(f.focal) ?? -1 });
  }
  const atMinute = w.tick % MIN === 0, day = w.environment.daylight > 0.1;
  if (atMinute) { refreshInfants(); minute++; if (!day) haltClose(); }
  const byId = index(w).byId;
  let partyOf: Map<number, { size: number; males: number[] }> | null = null;
  if (atMinute && day) {
    partyOf = new Map();
    for (const p of w.parties) {
      let size = 0; const males: number[] = [];
      for (const id of p.members) { const m = byId.get(id); if (!m || !m.alive) continue; if (m.age >= 5) size++; if (m.sex === 'male' && m.age >= 15) males.push(id); }
      partyOf.set(p.id, { size, males });
    }
  }
  for (const c of index(w).alive) {
    const id = c.id, ks = classesOf(c);
    const x0 = c.position[0], z0 = c.position[2];
    const lx = px[id], lz = pz[id];
    px[id] = x0; pz[id] = z0;
    if (!ks) continue;
    let d = 0;
    if (lx !== undefined) { d = Math.hypot(x0 - lx, z0 - lz); if (d > MAX_STEP) d = 0; }
    const part = partOf(c), started = part !== lastPart[id];
    lastPart[id] = part;
    for (const k of ks) { const t = T[k]; t.ticks++; t.path += d; t.parts[part] += d; if (started) t.bouts[part]++; if (day) t.dayPath += d; if (d > 0) t.byAction[c.action] = (t.byAction[c.action] ?? 0) + d; }
    if (c.lactating) {
      const inf = byId.get(youngId.get(id) ?? -1), carried = inf ? isCarried(inf, c) : false;
      const nursing = day && inf !== undefined && inf.action === 'nurse' && inf.targetId === id;
      for (const k of ks) { const t = T[k]; if (carried) { t.carryMin += TICK_HOURS * 60; if (day) t.carryDayMin += TICK_HOURS * 60; } if (day) { if (nursing) { t.nurseMin += TICK_HOURS * 60; t.nurseM += d; } else t.otherDayM += d; } }
    }
    if (atMinute && day && partyOf) {
      const q = partyOf.get(c.partyId);
      const males = q ? q.males.filter(m => m !== id).length : 0, size = q ? q.size : 1;
      for (const k of ks) { const t = T[k]; t.dayMin++; if (males > 0) t.withMale++; if (size <= 1) t.alone++; t.partySize += size; }
      haltStep(c, ks);
    }
  }
}
energyTap.fn = null;
const simS = (performance.now() - t0) / 1000;

// --- observer -------------------------------------------------------------------------------------------------------
const rec = finishObserver(obs, w), dv = derive(rec), Pt = rec.points;
const every = Math.round(5 / 60 / dv.tH), minTicks = 1 / 60 / dv.tH;
interface Obs { days: number; today: number[]; field: number[]; act: number[]; halts: number; haltMin: number; phases: number; phaseM: number; mins: number; withMale: number; hours: number }
const O = Object.fromEntries(CLASSES.map(k => [k, { days: 0, today: [], field: [], act: [], halts: 0, haltMin: 0, phases: 0, phaseM: 0, mins: 0, withMale: 0, hours: 0 } as Obs])) as Record<Cls, Obs>;
/** Halt anchors on a follow's 1-min points: for each point, the index of its halt's first point, or −1. */
function anchors(pts: number[], inRun: (j: number, a: number) => boolean): number[] {
  const out = new Array<number>(pts.length).fill(-1);
  let a = 0;
  while (a < pts.length) {
    let b = a;
    while (b + 1 < pts.length && inRun(pts[b + 1], pts[a])) b++;
    if ((Pt.t.data[pts[b]] - Pt.t.data[pts[a]]) / minTicks >= HALT_MIN) { for (let j = a; j <= b; j++) out[j] = a; a = b + 1; }
    else a++;
  }
  return out;
}
const near = (j: number, a: number) => Math.hypot(Pt.x.data[j] - Pt.x.data[a], Pt.z.data[j] - Pt.z.data[a]) <= HALT_M;
const still = (j: number) => Pt.cat.data[j] !== CAT_TRAVEL;
/** Path through the 5-min fixes, each fix inside a halt recorded at the halt's first point. */
function pathOf(pts: number[], anc: number[] | null): number {
  let sum = 0, qx = NaN, qz = NaN;
  for (let j = 0; j < pts.length; j++) {
    const i = pts[j];
    if (Pt.t.data[i] % every !== 0) continue;
    const k = anc && anc[j] >= 0 ? pts[anc[j]] : i, x = Pt.x.data[k], z = Pt.z.data[k];
    if (qx === qx) sum += Math.hypot(x - qx, z - qz);
    qx = x; qz = z;
  }
  return sum * dv.profile.lengthScale / 1000;
}
rec.follows.forEach((f, fi) => {
  if (!f.complete || f.end - f.start < 8) return;
  const fx = followX[fi];
  const ks: Cls[] = f.sex === 'male' ? ['male'] : f.lactating ? ['lact', fx && fx.infantAge >= 2 ? 'lact >=2y' : 'lact <2y'] : [fx?.pregnant ? 'pregnant' : 'female other'];
  const pts = dv.followPts[fi];
  const ancF = anchors(pts, near), ancA = anchors(pts, (j, a) => still(j) && still(a));
  let halts = 0, haltMin = 0, phases = 0, phaseM = 0, withMale = 0;
  // halts and phases by the position rule (phase = path between two halts through 1-min points)
  let ph = 0, inPh = false;
  for (let j = 0; j < pts.length; j++) {
    const i = pts[j];
    if (Pt.partyAM.data[i] - (f.sex === 'male' ? 1 : 0) > 0) withMale++;
    if (ancF[j] >= 0) {
      if (ancF[j] === j) { halts++; if (inPh && ph > 0) { phases++; phaseM += ph; } inPh = false; ph = 0; }
      if (j + 1 >= pts.length || ancF[j + 1] !== ancF[j]) haltMin += (Pt.t.data[i] - Pt.t.data[pts[ancF[j]]]) / minTicks;
    } else if (j > 0) {
      const k = ancF[j - 1] >= 0 ? pts[ancF[j - 1]] : pts[j - 1];
      ph += Math.hypot(Pt.x.data[i] - Pt.x.data[k], Pt.z.data[i] - Pt.z.data[k]); inPh = true;
    }
  }
  for (const k of ks) {
    const o = O[k];
    o.days++; o.today.push(pathOf(pts, null)); o.field.push(pathOf(pts, ancF)); o.act.push(pathOf(pts, ancA));
    o.halts += halts; o.haltMin += haltMin; o.phases += phases; o.phaseM += phaseM; o.mins += pts.length; o.withMale += withMale; o.hours += f.end - f.start;
  }
});
const identity: Record<string, unknown> = {};
for (const id of ['T-RNG-4', 'T-RNG-5']) { const m = METRICS.find(q => q.id === id)!; const v = m.compute!(dv); identity[id] = { value: v.value, n: v.n, parts: v.parts }; }

const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const result = {
  tool: 'ranging-diagnose', seed, burnIn, days, params, simS: r3(simS), identity,
  observer: Object.fromEntries(CLASSES.map(k => { const o = O[k]; return [k, { followDays: o.days, todayKm: r3(mean(o.today)), fieldKm: r3(mean(o.field)), actKm: r3(mean(o.act)),
    todayDays: o.today.map(r3), fieldDays: o.field.map(r3), actDays: o.act.map(r3), haltsPerDay: r3(o.halts / Math.max(1, o.days)), haltMin: r3(o.haltMin / Math.max(1, o.halts)),
    phasesPerDay: r3(o.phases / Math.max(1, o.days)), phaseM: r3(o.phaseM / Math.max(1, o.phases)), withMaleShare: r3(o.withMale / Math.max(1, o.mins)), followH: r3(o.hours / Math.max(1, o.days)) }]; })),
  truth: Object.fromEntries(CLASSES.map(k => { const t = T[k], cd = t.ticks / DAY; return [k, { chimpDays: r3(cd), pathKmPerDay: r3(t.path / Math.max(1e-9, cd) / 1000), dayPathKmPerDay: r3(t.dayPath / Math.max(1e-9, cd) / 1000),
    byActionKmPerDay: Object.fromEntries(Object.entries(t.byAction).sort((a, b) => b[1] - a[1]).map(([a, v]) => [a, r3(v / Math.max(1e-9, cd) / 1000)])),
    partsKmPerDay: Object.fromEntries(PARTS.map(p => [p, r3(t.parts[p] / Math.max(1e-9, cd) / 1000)])),
    boutsPerDay: Object.fromEntries(PARTS.map(p => [p, r3(t.bouts[p] / Math.max(1e-9, cd))])),
    mPerBout: Object.fromEntries(PARTS.map(p => [p, r3(t.parts[p] / Math.max(1, t.bouts[p]))])),
    withMaleShare: r3(t.withMale / Math.max(1, t.dayMin)), aloneShare: r3(t.alone / Math.max(1, t.dayMin)), partySize: r3(t.partySize / Math.max(1, t.dayMin)),
    haltsPerDay: r3(t.halts / Math.max(1e-9, cd)), haltMin: r3(t.haltMin / Math.max(1, t.halts)), tripsPerDay: r3(t.trips / Math.max(1e-9, cd)), tripM: r3(t.tripM / Math.max(1, t.trips)),
    tripPathKmPerDay: r3(t.tripPathM / Math.max(1e-9, cd) / 1000), carryMinPerDay: r3(t.carryMin / Math.max(1e-9, cd)), carryDayMinPerDay: r3(t.carryDayMin / Math.max(1e-9, cd)), carryKcalPerDay: r3(t.carryKcal / Math.max(1e-9, cd)),
    walkKcalPerDay: r3(t.walkKcal / Math.max(1e-9, cd)), climbKcalPerDay: r3(t.climbKcal / Math.max(1e-9, cd)), nurseMinPerDay: r3(t.nurseMin / Math.max(1e-9, cd)),
    speedNursingMPerMin: r3(t.nurseM / Math.max(1e-9, t.nurseMin)), speedOtherDayMPerMin: r3(t.otherDayM / Math.max(1e-9, t.dayMin - t.nurseMin)) }]; })),
};
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ seed, simS: result.simS, identity, observer: Object.fromEntries(CLASSES.map(k => [k, { d: result.observer[k].followDays, today: result.observer[k].todayKm, field: result.observer[k].fieldKm, act: result.observer[k].actKm }])) }));
