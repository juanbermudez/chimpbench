// Energy diagnosis (stage E1, development tool, sim truth): by sex and reproductive class, the mean daily energy eaten
// and spent by term, feeding minutes, gut fill, hunger, reserves and condition, plus births and deaths by cause.
// With energyLedger 0 only the behaviour columns (feeding minutes, hunger, condition) are filled.
// Stage E1c adds a table of unweaned infants by year of age (milk by day and night, own food, growth, mass, daytime
// nursing and eating shares, reserve change over the window) and their mothers' reserves by the same ages.
//
//   pnpm exec tsx scripts/energy-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--profile field] [--params '{"energyLedger":1}'] [--json f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { energyTap, massOf, reserveCap, gutCap, type EnergyTerm } from '../src/sim/energy';
import { paramsOf, type Profile } from '../src/sim/params';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const profile = arg('profile', 'field') as Profile, params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', '');
const DAY = 5760, TERMS: EnergyTerm[] = ['rest', 'activity', 'walk', 'climb', 'carry', 'pregnancy', 'growth', 'milk'];
// stage E1c: unweaned infants by year of age, and their mothers by the same ages
const BINS = ['0–1 y', '1–2 y', '2–3 y', '3–4 y', '4–5 y', '≥ 5 y'] as const;
const binOf = (age: number) => BINS[Math.min(5, Math.floor(age))];
interface Inf { ticks: number; dayTicks: number; milkDay: number; milkNight: number; kin: number; growth: number; out: number; nurseDay: number; eatDay: number; res: number; kg: number; mothers: number; motherRes: number; motherMilkCost: number }
const blankInf = (): Inf => ({ ticks: 0, dayTicks: 0, milkDay: 0, milkNight: 0, kin: 0, growth: 0, out: 0, nurseDay: 0, eatDay: 0, res: 0, kg: 0, mothers: 0, motherRes: 0, motherMilkCost: 0 });
const inf = Object.fromEntries(BINS.map(b => [b, blankInf()])) as Record<string, Inf>;
/** Per infant over the window: age, mass and reserves (÷ store) at the start and end, and its mother's mean reserves. */
const dyads: { seed: number; id: number; age0: number; kg0: number; kg1: number; res0: number; res1: number; days: number; mRes: number; mN: number; milk: number }[] = [];
const CLASSES = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'lact: infant < 0.5 y', 'lact: infant 0.5–2 y', 'lact: infant ≥ 2 y',
  'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as const;
type Cls = typeof CLASSES[number];

interface Acc { ticks: number; dayTicks: number; forage: number; eating: number; fruit: number; kin: number; milkIn: number; out: Record<EnergyTerm, number>; gut: number; hunger: number; res: number; cond: number; ids: Set<number>; walked: number }
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, forage: 0, eating: 0, fruit: 0, kin: 0, milkIn: 0, out: Object.fromEntries(TERMS.map(t => [t, 0])) as Record<EnergyTerm, number>, gut: 0, hunger: 0, res: 0, cond: 0, ids: new Set(), walked: 0 });
const acc = Object.fromEntries(CLASSES.map(c => [c, blank()])) as Record<Cls, Acc>;
const deaths: Record<string, number> = {}, deathsByClass: Record<string, number> = {};
let births = 0, livingStart = 0, livingEnd = 0;
// reserve trajectories: daily mean reserves ÷ usable reserve by class
const traj: Record<string, number[]> = {};

/** Youngest unweaned offspring's age per mother (for the lactation time course). */
function youngest(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const k of w.chimps) if (k.alive && !ix(k).weaned) { const a = m.get(k.motherId); if (a === undefined || k.age < a) m.set(k.motherId, k.age); }
  return m;
}
function classesOf(c: Chimp, young: Map<number, number>): Cls[] {
  if (c.age < 0.5) return ['infant < 0.5 y'];
  if (c.age < 2) return ['infant 0.5–2 y'];
  if (c.age < 5) return ['infant 2–5 y'];
  if (c.age < 12) return ['juvenile 5–12 y'];
  if (c.age < 15) return [];
  if (c.sex === 'male') return ['adult male'];
  if (c.lactating) { const a = young.get(c.id); return a === undefined ? ['female, lactating'] : ['female, lactating', a < 0.5 ? 'lact: infant < 0.5 y' : a < 2 ? 'lact: infant 0.5–2 y' : 'lact: infant ≥ 2 y']; }
  return [c.pregnancy > 0 ? 'female, pregnant' : 'female, other'];
}

for (const seed of seeds) {
  const w = createWorld(seed, { profile, params });
  const P = paramsOf(w), on = P.energyLedger === 1;
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  livingStart += w.chimps.filter(c => c.alive).length;
  const births0 = w.stats.births, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  let young = youngest(w);
  const prevInfIn = new Map<number, number>();
  const cls = new Map<number, Cls[]>(), prevIn = new Map<number, number>(), prevPos = new Map<number, [number, number]>(), lastCls = new Map<number, string>();
  let light = true;
  const binNow = new Map<number, string>(), motherOf = new Map<number, Chimp>(), milkOf = new Map<number, number>(), milkTick = new Map<number, number>();
  energyTap.fn = (c, term, kcal) => {
    if (term === 'suckled') {
      milkOf.set(c.id, (milkOf.get(c.id) ?? 0) + kcal); milkTick.set(c.id, (milkTick.get(c.id) ?? 0) + kcal);
      const k = cls.get(c.id); if (k) for (const n of k) acc[n].milkIn += kcal;
      const b = binNow.get(c.id); if (b) { if (light) inf[b].milkDay += kcal; else inf[b].milkNight += kcal; inf[b].motherMilkCost += kcal / P.ledgerMilkEff; }
      return;
    }
    const k = cls.get(c.id); if (k) for (const n of k) acc[n].out[term] += kcal;
    const b = binNow.get(c.id);
    if (b) { inf[b].out += kcal; if (term === 'growth') inf[b].growth += kcal; }
  };
  const unweaned = (c: Chimp) => c.alive && !ix(c).weaned && c.age < 6 && w.chimps.some(m => m.id === c.motherId && m.alive);
  const refreshBins = () => { binNow.clear(); motherOf.clear(); for (const c of w.chimps) if (unweaned(c)) { binNow.set(c.id, binOf(c.age)); motherOf.set(c.id, w.chimps.find(m => m.id === c.motherId)!); } };
  refreshBins();
  const start = new Map<number, { age0: number; kg0: number; res0: number; mRes: number; mN: number }>();
  for (const id of binNow.keys()) { const c = w.chimps.find(k => k.id === id)!, L = ix(c).en; start.set(id, { age0: c.age, kg0: massOf(c, P), res0: L ? L.res / reserveCap(c, P) : 0, mRes: 0, mN: 0 }); }
  for (let i = 0; i < days * DAY; i++) {
    light = w.environment.daylight > 0.1;
    tickWorld(w);
    light = w.environment.daylight > 0.1;
    if (i % 240 === 0) {
      young = youngest(w);
      for (const c of w.chimps) if (c.alive) { const k = classesOf(c, young); cls.set(c.id, k); lastCls.set(c.id, k[0] ?? 'adolescent'); }
      refreshBins();
    }
    for (const c of w.chimps) {
      if (!c.alive) continue;
      const k = cls.get(c.id) ?? []; if (!k.length) continue;
      const x = ix(c), L = x.en, pin = prevIn.get(c.id) ?? L?.in ?? 0, din = L ? L.in - pin : 0;
      const pp = prevPos.get(c.id), step = pp && c.position[1] < 0.3 ? Math.hypot(c.position[0] - pp[0], c.position[2] - pp[1]) : 0;
      prevPos.set(c.id, [c.position[0], c.position[2]]);
      if (L) prevIn.set(c.id, L.in);
      // with the ledger off, eating is the forage act in a crown (phase 2) or on the ground
      // with the ledger on, eating is own food swallowed this tick (milk excluded, wherever it is drunk)
      const foraging = c.action === 'forage', eating = L ? din - (milkTick.get(c.id) ?? 0) > 1e-9 : foraging && (c.targetId < 0 ? c.position[1] <= 0.05 : x.phase === 2);
      for (const n of k) {
        const a = acc[n];
        a.ticks++; a.ids.add(seed * 100000 + c.id); a.walked += step < 100 ? step : 0;
        if (foraging) a.forage++;
        if (eating) a.eating++;
        if (foraging && c.targetId > 0 && (L ? din > 0 : x.phase === 2)) a.fruit++;
        if (L) { a.kin += din; a.gut += L.gut / gutCap(c, P); a.res += L.res / reserveCap(c, P); }
        a.cond += x.cond;
        if (light) { a.dayTicks++; a.hunger += c.hunger; }
      }
    }
    for (const [id, b] of binNow) {
      const c = w.chimps.find(k => k.id === id)!;
      if (!c.alive) continue;
      const B = inf[b], L = ix(c).en, m = motherOf.get(id), milk = milkTick.get(id) ?? 0;
      B.ticks++; B.kg += massOf(c, P);
      const din = L ? L.in - (prevInfIn.get(id) ?? L.in) : 0;
      if (L) { B.res += L.res / reserveCap(c, P); B.kin += din; prevInfIn.set(id, L.in); }
      // daytime nursing: milk drunk this tick (any act); daytime eating: own food swallowed this tick
      // (ledger off: the nurse act, and the forage act on the ground or in a crown)
      if (light) {
        B.dayTicks++;
        if (L ? milk > 0 : c.action === 'nurse') B.nurseDay++;
        if (L ? din - milk > 1e-9 : c.action === 'forage' && (c.targetId < 0 ? c.position[1] <= 0.05 : ix(c).phase === 2)) B.eatDay++;
      }
      if (m && m.alive && ix(m).en) { const r = ix(m).en!.res / reserveCap(m, P); B.mothers++; B.motherRes += r; const st = start.get(id); if (st) { st.mRes += r; st.mN++; } }
    }
    milkTick.clear();
    if (on && i % DAY === DAY / 2) for (const n of ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as Cls[]) {
      let s = 0, m = 0;
      for (const c of w.chimps) if (c.alive && cls.get(c.id)?.includes(n) && ix(c).en) { s += ix(c).en!.res / reserveCap(c, P); m++; }
      (traj[n] ??= [])[Math.floor(i / DAY)] = ((traj[n][Math.floor(i / DAY)] ?? 0) * (seeds.indexOf(seed)) + (m ? s / m : 0)) / (seeds.indexOf(seed) + 1);
    }
  }
  energyTap.fn = null;
  for (const [id, st] of start) {
    const c = w.chimps.find(k => k.id === id)!;
    if (!c.alive) continue;
    const L = ix(c).en;
    dyads.push({ seed, id, age0: st.age0, kg0: st.kg0, kg1: massOf(c, P), res0: st.res0, res1: L ? L.res / reserveCap(c, P) : 0, days, mRes: st.mN ? st.mRes / st.mN : NaN, mN: st.mN, milk: (milkOf.get(id) ?? 0) / days });
  }
  births += w.stats.births - births0;
  livingEnd += w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !dead0.has(c.id)) {
    const cause = c.causeOfDeath ?? 'unknown'; deaths[cause] = (deaths[cause] ?? 0) + 1;
    const k = `${lastCls.get(c.id) ?? (c.age < 0.5 ? 'infant < 0.5 y' : 'other')}: ${cause}`; deathsByClass[k] = (deathsByClass[k] ?? 0) + 1;
  }
  void massOf;
}

const f = (v: number, d = 0) => Number.isFinite(v) ? v.toFixed(d) : '—';
const rows = CLASSES.map(n => {
  const a = acc[n], d = a.ticks / DAY; // individual-days
  const out = Object.fromEntries(TERMS.map(t => [t, a.out[t] / d])) as Record<EnergyTerm, number>;
  return { cls: n, individuals: a.ids.size, days: d, kcalIn: a.kin / d, milkIn: a.milkIn / d, kcalOut: TERMS.reduce((s, t) => s + out[t], 0), out, forageMin: a.forage / d / 4, eatingMin: a.eating / d / 4,
    fruitShare: a.fruit / Math.max(1, a.eating), groundKm: a.walked / d / 1000, gutFill: a.gut / a.ticks, hungerDay: a.hunger / Math.max(1, a.dayTicks), reserves: a.res / a.ticks, cond: a.cond / a.ticks };
});
console.log(`energy diagnosis: ${profile}, seeds ${seeds.join(', ')}, burn-in ${burnIn} d, ${days} d, params ${JSON.stringify(params)}`);
console.log('| class | n | kcal in | (milk in) | kcal out | rest | activity | walk | climb | carry | preg | growth | milk | forage min | eating min | fruit % | ground km | gut fill | day hunger | reserves ÷ store | cond |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) if (r.days > 0) console.log(`| ${r.cls} | ${r.individuals} | ${f(r.kcalIn)} | ${f(r.milkIn)} | ${f(r.kcalOut)} | ${TERMS.map(t => f(r.out[t])).join(' | ')} | ${f(r.forageMin)} | ${f(r.eatingMin)} | ${f(100 * r.fruitShare)} | ${f(r.groundKm, 2)} | ${f(r.gutFill, 2)} | ${f(r.hungerDay, 2)} | ${f(r.reserves, 3)} | ${f(r.cond, 2)} |`);
console.log(`births ${births}, deaths ${Object.values(deaths).reduce((a, b) => a + b, 0)} ${JSON.stringify(deaths)}; living ${livingStart} → ${livingEnd} (summed over seeds)`);
console.log(`deaths by class: ${JSON.stringify(deathsByClass)}`);
console.log('\nunweaned infants by year of age (kcal per infant-day; shares of daylight ticks; growth kg per year from mass at the window ends)');
console.log('| age | infant-days | milk day | milk night | own food | kcal out | growth kcal | daytime nursing % | daytime eating % | mass kg | reserves ÷ store | Δ reserves over window | growth kg/y | mother reserves ÷ store | mother milk cost |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const B = inf[b], d = B.ticks / DAY; if (!d) continue;
  const ds = dyads.filter(x => binOf(x.age0) === b), dres = ds.length ? ds.reduce((s, x) => s + x.res1 - x.res0, 0) / ds.length : NaN, gv = ds.length ? ds.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / ds.length : NaN;
  const milk = B.milkDay + B.milkNight;
  console.log(`| ${b} | ${f(d)} | ${f(B.milkDay / d)} | ${f(B.milkNight / d)} | ${f((B.kin - milk) / d)} | ${f(B.out / d)} | ${f(B.growth / d)} | ${f(100 * B.nurseDay / Math.max(1, B.dayTicks), 1)} | ${f(100 * B.eatDay / Math.max(1, B.dayTicks), 1)} | ${f(B.kg / B.ticks, 1)} | ${f(B.res / B.ticks, 3)} | ${f(dres, 3)} (n ${ds.length}) | ${f(gv, 2)} | ${f(B.motherRes / Math.max(1, B.mothers), 3)} | ${f(B.motherMilkCost / d)} |`);
}
console.log('dyads (seed, id, age at start, kg start → end, reserves start → end, milk kcal/d, mother mean reserves):');
for (const x of dyads) console.log(`  ${x.seed} ${x.id} ${x.age0.toFixed(2)} y  ${x.kg0.toFixed(2)} → ${x.kg1.toFixed(2)} kg  ${x.res0.toFixed(3)} → ${x.res1.toFixed(3)}  milk ${x.milk.toFixed(0)}  mother ${x.mRes.toFixed(3)}`);
for (const [n, t] of Object.entries(traj)) console.log(`reserves ÷ store, ${n}, every 5 d: ${t.filter((_, i) => i % 5 === 0).map(v => f(v, 3)).join(' ')}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ profile, seeds, burnIn, days, params, rows, births, deaths, deathsByClass, living: [livingStart, livingEnd], traj, infants: inf, dyads }, null, 1));
