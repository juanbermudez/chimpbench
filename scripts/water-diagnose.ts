// Stage E2g water diagnosis (development tool; reads only; docs/staging/e2g-prereg.md §3). The world and the focal
// observer are e-bench's, built as scripts/ranging-diagnose.ts builds them (src/field/run.ts runFieldJob: focal team set
// at observer seed 1, no party-follow team sets or experiments, which never write the world), so the T-RNG-4 and T-RNG-5
// values printed under "identity" equal e-bench's per-seed values for the same seed and params.
//
// Classes: adult male (≥ 15 y); lactating female (≥ 15 y, c.lactating); other adult female (≥ 15 y); juvenile 5–15 y.
// Truth (simulation state, every tick), per class, per chimp-day:
//   path       km/day of all movement (steps longer than 2·runMps·tick + 2 m are teleports and skipped; as ranging-diagnose)
//              and the part walked in the drink act (to water), its share of the path, walks to water (entries into the
//              drink act) per chimp-day and metres per walk;
//   events     drinking events: runs of ticks in the drink act within 1.2 m of the water site (the observer's atWater,
//              src/field/protocols.ts), per chimp-day, per 12 h of daylight (events starting in daylight > 0.1, divided
//              by daylight hours ÷ 12: T-RHY-6's unit), minutes per event, the share of daylight minutes spent drinking,
//              event starts by local hour, and the share at stream-bank sites (within the stream's half width + 3 m);
//   thirst     c.thirst at the start of each walk and of each event (with a water ledger: the deficit, mL and % of mass);
//   split      for walks started in daylight while the walker had party mates (members ≥ 5 y): the share that end with
//              at least one of those mates no longer in the walker's party, the mean share of mates lost, and the share
//              of split walks after which a lost mate is back in the walker's party within 60 min of the walk's end;
//   ledger     with a water ledger (src/sim/water.ts; stage E2g), mL/day by term (waterTap), the mean deficit, the largest
//              deficit of any individual of the class at any tick and the share of chimp-ticks above 3% of mass;
//   reserves   daily mean energy reserves ÷ usable store at midday by class (energy ledger), their least-squares slope in
//              % of the store per day (viability, as scripts/energy-diagnose.ts traj), and deaths by cause.
// Observer (focal follows, 1-min point samples; T-RHY-6's method: all occurrences on follows of adult females): a run of
// consecutive samples with feeding type "drinking" (src/field/categories.ts FEED_WATER) is one event; events per 12 h of
// follow time, by the follow's class.
//
//   pnpm exec tsx scripts/water-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { FEED_WATER } from '../src/field/categories';
import { PROFILES } from '../src/field/config';
import { derive } from '../src/field/derive';
import { METRICS } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { createWorld, tickWorld } from '../src/simulation';
import { massOf, reserveCap } from '../src/sim/energy';
import { paramsOf } from '../src/sim/params';
import { streamDistance } from '../src/sim/stream';
import { index, ix, TICK_HOURS } from '../src/sim/state';
import type { Chimp } from '../src/types';

// the water ledger exists only from stage E2g on; on older code this diagnosis runs without its ledger readouts
type Tap = { fn: ((c: Chimp, term: string, mL: number) => void) | null };
const water = await import('../src/sim/water').catch(() => null) as { waterTap: Tap } | null;

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760, MIN = Math.round(1 / 60 / TICK_HOURS), AT_WATER2 = 1.2 * 1.2, SPLIT_REJOIN_MIN = 60;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), MAX_STEP = 2 * P.runMps * TICK_HOURS * 3600 + 2;
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
const obs = createObserver(w, { profile: PROFILES.field, truth: true, demography: false, seed: 1 });

const CLASSES = ['male', 'lact', 'female other', 'juvenile'] as const;
type Cls = typeof CLASSES[number];
function classOf(c: Chimp): Cls | null {
  if (!c.alive || c.age < 5) return null;
  if (c.age < 15) return 'juvenile';
  return c.sex === 'male' ? 'male' : c.lactating ? 'lact' : 'female other';
}
const TERMS = ['food', 'metabolic', 'drunk', 'milkIn', 'evap', 'insensible', 'faecal', 'urine', 'milkOut'] as const;
interface Acc {
  ticks: number; dayTicks: number; path: number; drinkPath: number; walks: number; dayWalks: number;
  events: number; dayEvents: number; drinkTicks: number; dayDrinkTicks: number; hour: number[]; bank: number;
  thirstWalk: number; thirstEvent: number; defEvent: number; defEventPct: number; defN: number;
  splitN: number; split: number; lostShare: number; rejoined: number;
  water: Record<string, number>; def: number; defPct: number; defTicks: number;
  /** Largest deficit of any individual of the class at any tick (% of mass), and chimp-ticks above 3% of mass (prereg §3, added for kill criterion (a)). */
  defMaxPct: number; defOver3: number;
}
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, path: 0, drinkPath: 0, walks: 0, dayWalks: 0, events: 0, dayEvents: 0, drinkTicks: 0, dayDrinkTicks: 0, hour: new Array(24).fill(0), bank: 0,
  thirstWalk: 0, thirstEvent: 0, defEvent: 0, defEventPct: 0, defN: 0, splitN: 0, split: 0, lostShare: 0, rejoined: 0,
  water: Object.fromEntries(TERMS.map(t => [t, 0])), def: 0, defPct: 0, defTicks: 0, defMaxPct: 0, defOver3: 0 });
const A = Object.fromEntries(CLASSES.map(k => [k, blank()])) as Record<Cls, Acc>;

if (water) water.waterTap.fn = (c, term, mL) => { const k = classOf(c); if (k) A[k].water[term] = (A[k].water[term] ?? 0) + mL; };

// per-id scratch
const px: number[] = [], pz: number[] = [], wasDrink: boolean[] = [], wasAt: boolean[] = [];
/** An open walk to water: its class, its mates at the start; an open split: the mates lost, and when the walk ended. */
const walk = new Map<number, { k: Cls; mates: number[] }>(), lost = new Map<number, { k: Cls; ids: number[]; at: number }>();
const partyMembers = (c: Chimp): number[] => {
  const p = w.parties.find(q => q.id === c.partyId); if (!p) return [];
  const byId = index(w).byId;
  return p.members.filter(id => { const m = byId.get(id); return id !== c.id && !!m && m.alive && m.age >= 5; });
};
// reserves: daily mean reserves ÷ usable store at midday, by class
const traj = Object.fromEntries(CLASSES.map(k => [k, [] as number[]])) as Record<Cls, number[]>;
const dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
const t0 = performance.now();
const ticks = Math.round(days * DAY);
for (let i = 0; i < ticks; i++) {
  tickWorld(w);
  observerStep(obs, w);
  const day = w.environment.daylight > 0.1, hour = Math.floor(((6.5 + w.time) % 24 + 24) % 24), byId = index(w).byId;
  for (const c of index(w).alive) {
    const id = c.id, k = classOf(c);
    const x0 = c.position[0], z0 = c.position[2], lx = px[id], lz = pz[id];
    px[id] = x0; pz[id] = z0;
    if (!k) { wasDrink[id] = false; wasAt[id] = false; continue; }
    const a = A[k];
    let d = 0;
    if (lx !== undefined) { d = Math.hypot(x0 - lx, z0 - lz); if (d > MAX_STEP) d = 0; }
    a.ticks++; if (day) a.dayTicks++; a.path += d;
    const drink = c.action === 'drink';
    let at = false;
    if (drink) {
      a.drinkPath += d;
      const s = index(w).waterById.get(c.targetId);
      at = !!s && (s.position[0] - x0) ** 2 + (s.position[2] - z0) ** 2 <= AT_WATER2;
      if (!wasDrink[id]) {
        a.walks++; a.thirstWalk += c.thirst;
        if (day) { a.dayWalks++; const mates = partyMembers(c); if (mates.length > 0) walk.set(id, { k, mates }); }
      }
      if (at) {
        a.drinkTicks++; if (day) a.dayDrinkTicks++;
        if (!wasAt[id]) {
          a.events++; if (day) a.dayEvents++; a.hour[hour]++; a.thirstEvent += c.thirst;
          if (s && streamDistance(w, s.position[0], s.position[2]) < (w.stream?.halfWidth ?? 0) + 3) a.bank++;
          const L = (ix(c) as { wat?: { def: number } }).wat;
          if (L) { a.defEvent += L.def; a.defEventPct += L.def / (massOf(c, P) * 10); a.defN++; }
        }
      }
    } else if (wasDrink[id]) {
      // the walk ended: which of its mates are no longer in the walker's party
      const o = walk.get(id);
      if (o) {
        walk.delete(id);
        const now = new Set(partyMembers(c)), gone = o.mates.filter(m => !now.has(m));
        const ao = A[o.k]; ao.splitN++; ao.lostShare += gone.length / o.mates.length;
        if (gone.length > 0) { ao.split++; lost.set(id, { k: o.k, ids: gone, at: w.time }); }
      }
    }
    wasDrink[id] = drink; wasAt[id] = at;
    const L = (ix(c) as { wat?: { def: number } }).wat;
    if (L) { const pct = L.def / (massOf(c, P) * 10); a.def += L.def; a.defPct += pct; a.defTicks++; if (pct > a.defMaxPct) a.defMaxPct = pct; if (pct > 3) a.defOver3++; }
  }
  // split walks: a lost mate back in the walker's party within the window
  if (w.tick % MIN === 0) for (const [id, s] of lost) {
    const c = byId.get(id);
    if (!c || !c.alive || (w.time - s.at) * 60 > SPLIT_REJOIN_MIN) { lost.delete(id); continue; }
    const now = partyMembers(c);
    if (s.ids.some(m => now.includes(m))) { A[s.k].rejoined++; lost.delete(id); }
  }
  if (P.energyLedger === 1 && i % DAY === DAY / 2) for (const k of CLASSES) {
    let s = 0, n = 0;
    for (const c of index(w).alive) if (classOf(c) === k && ix(c).en) { s += ix(c).en!.res / reserveCap(c, P); n++; }
    traj[k].push(n ? s / n : NaN);
  }
}
if (water) water.waterTap.fn = null;
const simS = (performance.now() - t0) / 1000;

// --- observer: drinking events on focal follows (runs of 1-min samples with feeding type drinking) -------------------
const rec = finishObserver(obs, w), dv = derive(rec), Pt = rec.points;
const O = Object.fromEntries(CLASSES.map(k => [k, { hours: 0, events: 0, follows: 0 }])) as Record<Cls, { hours: number; events: number; follows: number }>;
rec.follows.forEach((f, fi) => {
  const k: Cls = f.sex === 'male' ? 'male' : f.lactating ? 'lact' : 'female other';
  const pts = dv.followPts[fi], o = O[k];
  o.follows++; o.hours += f.end - f.start;
  let prev = false;
  for (let j = 0; j < pts.length; j++) { const on = Pt.feed.data[pts[j]] === FEED_WATER; if (on && !prev) o.events++; prev = on; }
});
const identity: Record<string, unknown> = {};
for (const id of ['T-RNG-4', 'T-RNG-5']) { const m = METRICS.find(q => q.id === id)!; const v = m.compute!(dv); identity[id] = { value: v.value, n: v.n }; }

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Least-squares slope of a daily series, × 100 (% of the store per day). */
const slopePct = (v: number[]) => {
  const q = v.map((y, i) => [i, y]).filter(([, y]) => Number.isFinite(y));
  if (q.length < 2) return NaN;
  const mx = q.reduce((s, [x]) => s + x, 0) / q.length, my = q.reduce((s, [, y]) => s + y, 0) / q.length;
  const sxy = q.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0), sxx = q.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  return 100 * sxy / sxx;
};
const deaths: Record<string, number> = {};
for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) { const k = c.causeOfDeath ?? 'unknown'; deaths[k] = (deaths[k] ?? 0) + 1; }
const result = {
  tool: 'water-diagnose', seed, burnIn, days, params, simS: r3(simS), identity, ledger: !!water && (P as unknown as Record<string, number>).waterLedger === 1,
  truth: Object.fromEntries(CLASSES.map(k => {
    const a = A[k], cd = a.ticks / DAY, dh = a.dayTicks * TICK_HOURS;
    return [k, {
      chimpDays: r3(cd), pathKmPerDay: r3(a.path / Math.max(1e-9, cd) / 1000), drinkKmPerDay: r3(a.drinkPath / Math.max(1e-9, cd) / 1000),
      drinkPathShare: r3(a.drinkPath / Math.max(1e-9, a.path)), walksPerDay: r3(a.walks / Math.max(1e-9, cd)), mPerWalk: r3(a.drinkPath / Math.max(1, a.walks)),
      eventsPerDay: r3(a.events / Math.max(1e-9, cd)), eventsPer12hDay: r3(a.dayEvents / Math.max(1e-9, dh / 12)), minPerEvent: r3(a.drinkTicks * TICK_HOURS * 60 / Math.max(1, a.events)),
      dayDrinkShare: r3(a.dayDrinkTicks / Math.max(1, a.dayTicks)), bankShare: r3(a.bank / Math.max(1, a.events)),
      eventsByHour: a.hour, thirstAtWalk: r3(a.thirstWalk / Math.max(1, a.walks)), thirstAtEvent: r3(a.thirstEvent / Math.max(1, a.events)),
      deficitAtEventMl: a.defN ? r3(a.defEvent / a.defN) : null, deficitAtEventPctMass: a.defN ? r3(a.defEventPct / a.defN) : null,
      dayWalksWithMates: a.splitN, splitShare: r3(a.split / Math.max(1, a.splitN)), matesLostShare: r3(a.lostShare / Math.max(1, a.splitN)), rejoin60Share: r3(a.rejoined / Math.max(1, a.split)),
      waterMlPerDay: Object.fromEntries(Object.entries(a.water).map(([t, v]) => [t, r3(v / Math.max(1e-9, cd))])),
      deficitMeanMl: a.defTicks ? r3(a.def / a.defTicks) : null, deficitMeanPctMass: a.defTicks ? r3(a.defPct / a.defTicks) : null,
      deficitMaxPctMass: a.defTicks ? r3(a.defMaxPct) : null, deficitOver3PctShare: a.defTicks ? r3(a.defOver3 / a.defTicks) : null,
      reservesDaily: traj[k].map(r3), reserveSlopePctPerDay: r3(slopePct(traj[k])),
    }];
  })),
  observer: Object.fromEntries(CLASSES.filter(k => k !== 'juvenile').map(k => { const o = O[k]; return [k, { follows: o.follows, hours: r3(o.hours), events: o.events, eventsPer12h: r3(o.events / Math.max(1e-9, o.hours / 12)) }]; })),
  deaths,
};
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ seed, simS: result.simS, identity, deaths, walks: Object.fromEntries(CLASSES.map(k => [k, result.truth[k].walksPerDay])), events12h: Object.fromEntries(CLASSES.map(k => [k, result.truth[k].eventsPer12hDay])), observer: result.observer }));
