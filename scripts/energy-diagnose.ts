// Energy diagnosis (stage E1, development tool, sim truth): by sex and reproductive class, the mean daily energy eaten
// and spent by term, feeding minutes, gut fill, hunger, reserves and condition, plus births and deaths by cause.
// With energyLedger 0 only the behaviour columns (feeding minutes, hunger, condition) are filled. With ledgerDigesta 1
// (stage E1b) it also reports formula energy and dry matter eaten (the field's intake measures, T-ENE-1 and T-ENE-3),
// energy passed out unabsorbed, foregut and hindgut fill, and the share of daylight with a full hindgut.
// Stage E1c adds a table of unweaned infants by year of age (milk by day and night, own food, growth, mass, daytime
// nursing and eating shares, reserve change over the window) and their mothers' reserves by the same ages.
// Stage E1f adds: a 0–0.5 y bin; daytime ticks in the nurse act (nipple contact, the milk-ejection wait included), nursing
// bouts per daylight hour and their mean length; the milk share of intake and a straight line through it (the indicative
// nutritional weaning age); the implied own-food rate per eating minute; mothers' daily energy balance (change of reserves
// per day) by the age of their youngest infant (T-ENE-5's reading); juveniles' growth velocity by sex. --term-births
// (a scenario for diagnosis, used identically in every arm compared): every female pregnant at the end of the burn-in
// gives birth at its first slow step, so newborns and their mothers' first months are in the window.
// Stage E1h: the staged rows T-ENE-1 to T-ENE-3 are scored on the model's lactating class (the source's subjects were
// nursing mothers; docs/staging/e-targets.patch.json), T-ENE-8 on non-reproducing adults; printed as a table at the end.
//
//   pnpm exec tsx scripts/energy-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--profile field] [--params '{"energyLedger":1}'] [--term-births] [--json f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, energyTap, massOf, plantKcalPerMin, reserveCap, gutCap, type EnergyTerm, type FoodKind } from '../src/sim/energy';
import { paramsOf, type Profile } from '../src/sim/params';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seeds = arg('seeds', '48,7').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '30');
const profile = arg('profile', 'field') as Profile, params = JSON.parse(arg('params', '{}')), jsonOut = arg('json', ''), termBirths = process.argv.includes('--term-births');
const DAY = 5760, TERMS: EnergyTerm[] = ['rest', 'activity', 'wild', 'walk', 'climb', 'carry', 'pregnancy', 'growth', 'milk', 'digestion'];
// stage E1c: unweaned infants by year of age, and their mothers by the same ages
const BINS = ['0–0.5 y', '0.5–1 y', '1–2 y', '2–3 y', '3–4 y', '4–5 y', '≥ 5 y'] as const;
const MID: Record<string, number> = { '0–0.5 y': 0.25, '0.5–1 y': 0.75, '1–2 y': 1.5, '2–3 y': 2.5, '3–4 y': 3.5, '4–5 y': 4.5, '≥ 5 y': 5.5 };
const binOf = (age: number) => age < 0.5 ? BINS[0] : age < 1 ? BINS[1] : BINS[Math.min(6, Math.floor(age) + 1)];
interface Inf { ticks: number; dayTicks: number; milkDay: number; milkNight: number; kin: number; growth: number; out: number; nurseDay: number; eatDay: number; res: number; kg: number; mothers: number; motherRes: number; motherMilkCost: number;
  /** Stage E1f: daylight ticks in the nurse act; nurse bouts started by day; mothers' daily balance (Δ reserves, kcal and ÷ store) and mother-days. */
  actDay: number; bouts: number; mBal: number; mBalRel: number; mDays: number }
const blankInf = (): Inf => ({ ticks: 0, dayTicks: 0, milkDay: 0, milkNight: 0, kin: 0, growth: 0, out: 0, nurseDay: 0, eatDay: 0, res: 0, kg: 0, mothers: 0, motherRes: 0, motherMilkCost: 0, actDay: 0, bouts: 0, mBal: 0, mBalRel: 0, mDays: 0 });
/** Stage E1f: juveniles' (weaned, under 12 y) mass at the window ends, by sex. */
const juvs: { seed: number; id: number; sex: string; age0: number; kg0: number; kg1: number; days: number }[] = [];
const inf = Object.fromEntries(BINS.map(b => [b, blankInf()])) as Record<string, Inf>;
/** Per infant over the window: age, mass and reserves (÷ store) at the start and end, and its mother's mean reserves. */
const dyads: { seed: number; id: number; age0: number; kg0: number; kg1: number; res0: number; res1: number; days: number; mRes: number; mN: number; milk: number }[] = [];
const CLASSES = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'lact: infant < 0.5 y', 'lact: infant 0.5–2 y', 'lact: infant ≥ 2 y',
  'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as const;
type Cls = typeof CLASSES[number];

interface Acc { ticks: number; dayTicks: number; forage: number; eating: number; fruit: number; kin: number; milkIn: number; out: Record<EnergyTerm, number>; gut: number; hunger: number; res: number; cond: number; ids: Set<number>; walked: number;
  /** Stage E1b: formula kcal and dry matter eaten, kcal passed out, foregut and hindgut fill, daylight ticks with a full hindgut or foregut. */
  fin: number; dmIn: number; fec: number; fore: number; hind: number; hindFull: number; foreFull: number;
  /** Stage E1h: Σ body mass^0.75 over ticks (T-ENE-8 divides expenditure by it); food eaten at the field formula's kcal/min (the field method of T-ENE-1). */
  m75: number; fm: number }
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, forage: 0, eating: 0, fruit: 0, kin: 0, milkIn: 0, out: Object.fromEntries(TERMS.map(t => [t, 0])) as Record<EnergyTerm, number>, gut: 0, hunger: 0, res: 0, cond: 0, ids: new Set(), walked: 0,
  fin: 0, dmIn: 0, fec: 0, fore: 0, hind: 0, hindFull: 0, foreFull: 0, m75: 0, fm: 0 });
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
  // growth, gestation and milk are charged per ecological tick at their natural rate: at ageRate > 1 (life course) the
  // ledger undercounts them by that factor, so its budgets would be wrong (docs/simulation.md, energy ledger)
  if (on && w.ageRate > 1) throw new Error(`energy-diagnose: the energy ledger is not valid at ageRate ${w.ageRate} (> 1); run at natural aging`);
  for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);
  // stage E1f scenario: pregnancies at the end of the burn-in reach term now (birth at the next slow step)
  if (termBirths) for (const c of w.chimps) if (c.alive && c.pregnancy > 0) c.pregnancy = Math.max(c.pregnancy, ix(c).gestation - 1e-3);
  livingStart += w.chimps.filter(c => c.alive).length;
  const births0 = w.stats.births, dead0 = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  let young = youngest(w);
  const prevInfIn = new Map<number, number>();
  const cls = new Map<number, Cls[]>(), prevIn = new Map<number, number>(), prevPos = new Map<number, [number, number]>(), lastCls = new Map<number, string>();
  const prevDig = new Map<number, [number, number, number]>(); // stage E1b: fin, dmIn, fec at the last tick
  let light = true;
  const binNow = new Map<number, string>(), motherOf = new Map<number, Chimp>(), milkOf = new Map<number, number>(), milkTick = new Map<number, number>();
  // stage E1h: each plant food at the field formula's kcal/min (what the field method credits for the same food eaten)
  const fieldPerKcal: Record<FoodKind, number> = { drupe: P.ledgerFruitKcalPerMin / plantKcalPerMin(P, 'drupe'), fig: P.ledgerFigKcalPerMin / plantKcalPerMin(P, 'fig'),
    fallback: P.ledgerFallbackKcalPerMin / plantKcalPerMin(P, 'fallback'), meat: 1, milk: 0 };
  energyTap.fn = (c, term, kcal, kind) => {
    if (term === 'eaten') { const k = cls.get(c.id); if (k && kind) for (const n of k) acc[n].fm += kcal * fieldPerKcal[kind]; return; }
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
  const juv0 = new Map<number, { age0: number; kg0: number }>();
  for (const c of w.chimps) if (c.alive && ix(c).weaned && c.age < 12) juv0.set(c.id, { age0: c.age, kg0: massOf(c, P) });
  const prevAct = new Map<number, string>(), resAtDay = new Map<number, number>();
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
      let dfin = 0, ddm = 0, dfec = 0;
      if (L && L.fin !== undefined) {
        const pd = prevDig.get(c.id);
        if (pd) { dfin = L.fin - pd[0]; ddm = L.dmIn! - pd[1]; dfec = L.fec! - pd[2]; }
        prevDig.set(c.id, [L.fin, L.dmIn!, L.fec!]);
      }
      const caps = L && L.dm !== undefined ? digestaCaps(c, P) : null;
      // with the ledger off, eating is the forage act in a crown (phase 2) or on the ground
      // with the ledger on, eating is own food swallowed this tick (milk excluded, wherever it is drunk)
      const foraging = c.action === 'forage', eating = L ? din - (milkTick.get(c.id) ?? 0) > 1e-9 : foraging && (c.targetId < 0 ? c.position[1] <= 0.05 : x.phase === 2);
      for (const n of k) {
        const a = acc[n];
        a.ticks++; a.ids.add(seed * 100000 + c.id); a.walked += step < 100 ? step : 0;
        if (foraging) a.forage++;
        if (eating) a.eating++;
        if (foraging && c.targetId > 0 && (L ? din > 0 : x.phase === 2)) a.fruit++;
        if (L) { a.kin += din; a.gut += caps ? L.dm! / caps[0] : L.gut / gutCap(c, P); a.res += L.res / reserveCap(c, P); }
        if (caps) { a.fin += dfin; a.dmIn += ddm; a.fec += dfec; a.fore += L!.dm! / caps[0]; a.hind += L!.hind! / caps[1]; }
        a.cond += x.cond; a.m75 += Math.pow(massOf(c, P), P.ledgerRmrExp);
        if (light) { a.dayTicks++; a.hunger += c.hunger; if (caps) { if (L!.hind! >= 0.95 * caps[1]) a.hindFull++; if (L!.dm! >= 0.95 * caps[0]) a.foreFull++; } }
      }
    }
    for (const [id, b] of binNow) {
      const c = w.chimps.find(k => k.id === id)!;
      if (!c.alive) continue;
      if (!start.has(id) && ix(c).en) { const L0 = ix(c).en!; start.set(id, { age0: c.age, kg0: massOf(c, P), res0: L0.res / reserveCap(c, P), mRes: 0, mN: 0 }); }
      const B = inf[b], L = ix(c).en, m = motherOf.get(id), milk = milkTick.get(id) ?? 0;
      // stage E1f: nipple contact by day (the nurse act, the milk-ejection wait included) and bouts started by day
      const was = prevAct.get(id); prevAct.set(id, c.action);
      if (light && c.action === 'nurse') { B.actDay++; if (was !== 'nurse') B.bouts++; }
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
    // stage E1f: each mother's change of reserves over the day, binned by her youngest unweaned infant's age (T-ENE-5)
    if (on && i % DAY === DAY - 1) {
      const yg = youngest(w);
      for (const m of w.chimps) {
        if (!m.alive || m.sex !== 'female' || !ix(m).en) { resAtDay.delete(m.id); continue; }
        const r = ix(m).en!.res, a = yg.get(m.id), prev = resAtDay.get(m.id);
        if (a !== undefined && prev !== undefined) { const B = inf[binOf(a)]; B.mBal += r - prev; B.mBalRel += (r - prev) / reserveCap(m, P); B.mDays++; }
        resAtDay.set(m.id, r);
      }
    }
    if (on && i % DAY === DAY / 2) for (const n of ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as Cls[]) {
      let s = 0, m = 0;
      for (const c of w.chimps) if (c.alive && cls.get(c.id)?.includes(n) && ix(c).en) { s += ix(c).en!.res / reserveCap(c, P); m++; }
      (traj[n] ??= [])[Math.floor(i / DAY)] = ((traj[n][Math.floor(i / DAY)] ?? 0) * (seeds.indexOf(seed)) + (m ? s / m : 0)) / (seeds.indexOf(seed) + 1);
    }
  }
  energyTap.fn = null;
  for (const [id, j] of juv0) { const c = w.chimps.find(k => k.id === id)!; if (c.alive) juvs.push({ seed, id, sex: c.sex, age0: j.age0, kg0: j.kg0, kg1: massOf(c, P), days }); }
  for (const [id, st] of start) {
    const c = w.chimps.find(k => k.id === id)!;
    if (!c.alive) continue;
    const L = ix(c).en;
    const dd = Math.max(1, (c.age - st.age0) * 365.25 / Math.max(1e-9, w.ageRate)); // days observed (newborns enter late)
    dyads.push({ seed, id, age0: st.age0, kg0: st.kg0, kg1: massOf(c, P), res0: st.res0, res1: L ? L.res / reserveCap(c, P) : 0, days: dd, mRes: st.mN ? st.mRes / st.mN : NaN, mN: st.mN, milk: (milkOf.get(id) ?? 0) / dd });
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
    fruitShare: a.fruit / Math.max(1, a.eating), groundKm: a.walked / d / 1000, gutFill: a.gut / a.ticks, hungerDay: a.hunger / Math.max(1, a.dayTicks), reserves: a.res / a.ticks, cond: a.cond / a.ticks,
    m75: a.m75 / Math.max(1, a.ticks), fieldMethodIn: a.fm / d, formulaIn: a.fin / d, dmIn: a.dmIn / d, fecal: a.fec / d, foreFill: a.fore / a.ticks, hindFill: a.hind / a.ticks, hindFullDay: a.hindFull / Math.max(1, a.dayTicks), foreFullDay: a.foreFull / Math.max(1, a.dayTicks) };
});
console.log(`energy diagnosis: ${profile}, seeds ${seeds.join(', ')}, burn-in ${burnIn} d, ${days} d, params ${JSON.stringify(params)}`);
console.log('| class | n | kcal in | (milk in) | kcal out | rest | activity | wild | walk | climb | carry | preg | growth | milk | digestion | forage min | eating min | fruit % | ground km | gut fill | day hunger | reserves ÷ store | cond |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) if (r.days > 0) console.log(`| ${r.cls} | ${r.individuals} | ${f(r.kcalIn)} | ${f(r.milkIn)} | ${f(r.kcalOut)} | ${TERMS.map(t => f(r.out[t])).join(' | ')} | ${f(r.forageMin)} | ${f(r.eatingMin)} | ${f(100 * r.fruitShare)} | ${f(r.groundKm, 2)} | ${f(r.gutFill, 2)} | ${f(r.hungerDay, 2)} | ${f(r.reserves, 3)} | ${f(r.cond, 2)} |`);
if (rows.some(r => r.formulaIn > 0)) {
  console.log('\nstage E1b digesta (formula kcal and dry matter eaten are the field\'s intake measures; kcal in above counts fibre at its fermentation yield)');
  console.log('| class | formula kcal eaten | dry matter g eaten | kcal passed out | foregut fill | hindgut fill | daylight with a full foregut | daylight with a full hindgut |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) if (r.days > 0) console.log(`| ${r.cls} | ${f(r.formulaIn)} | ${f(r.dmIn)} | ${f(r.fecal)} | ${f(r.foreFill, 2)} | ${f(r.hindFill, 2)} | ${f(r.foreFullDay, 2)} | ${f(r.hindFullDay, 2)} |`);
}
console.log(`births ${births}, deaths ${Object.values(deaths).reduce((a, b) => a + b, 0)} ${JSON.stringify(deaths)}; living ${livingStart} → ${livingEnd} (summed over seeds)`);
console.log(`deaths by class: ${JSON.stringify(deathsByClass)}`);
// stage E1h: the staged energy rows, each on the class it was measured in (docs/staging/e-targets.patch.json, re-scoped
// 1 October 2026 after the field audit). T-ENE-1's ledger truth is the energy eaten in the model's own food units: with
// ledgerFoodEnergyFix 1 the sugar-based values, comparable with the audit's band; with it 0 the field formula's.
{
  const by = (n: Cls) => rows.find(r => r.cls === n)!, lac = by('female, lactating'), dig = rows.some(r => r.formulaIn > 0);
  const band = (v: number, lo: number, hi: number) => !Number.isFinite(v) || !(v > 0) ? '—' : v < lo ? 'below' : v > hi ? 'above' : 'in';
  const sugar = (params as Record<string, number>).ledgerFoodEnergyFix === 1;
  const nonRep = (['adult male', 'female, other'] as Cls[]).map(by).filter(r => r.days > 0);
  const e8 = nonRep.length ? nonRep.reduce((s, r) => s + r.kcalOut / r.m75 * r.days, 0) / nonRep.reduce((s, r) => s + r.days, 0) : NaN;
  console.log('\nstage E1h: staged energy rows on the class the field measured (simulation truth)');
  console.log('| row | class | model | band | verdict |');
  console.log('| --- | --- | --- | --- | --- |');
  if (dig) console.log(`| T-ENE-1 ledger truth (energy eaten, ${sugar ? 'sugar-based' : 'field-formula'} kcal/d) | lactating females | ${f(lac.formulaIn)} | 1,810–2,070 (comparison band, contested row) | ${sugar ? band(lac.formulaIn, 1810, 2070) : 'not comparable (field-formula units)'} |`);
  console.log(`| T-ENE-1 absorbed (kcal in − passed out, /d) | lactating females | ${f(lac.kcalIn - lac.fecal)} | — | — |`);
  console.log(`| T-ENE-1 field method (food eaten at the field formula's kcal/min) | lactating females | ${f(lac.fieldMethodIn)} | 1,900–3,100 (field band) | ${band(lac.fieldMethodIn, 1900, 3100)} |`);
  console.log(`| T-ENE-2 eating min/d | lactating females | ${f(lac.eatingMin)} | 250–370 | ${band(lac.eatingMin, 250, 370)} |`);
  if (dig) console.log(`| T-ENE-3 dry matter g/d | lactating females | ${f(lac.dmIn)} | 650–1,100 | ${band(lac.dmIn, 650, 1100)} |`);
  console.log(`| T-ENE-8 kcal spent ÷ M^0.75 | adult males and other females | ${f(e8, 1)} | 85–130 | ${band(e8, 85, 130)} |`);
}
console.log('\nunweaned infants by year of age (kcal per infant-day; shares of daylight ticks; growth kg per year from mass at the window ends)');
console.log('| age | infant-days | milk day | milk night | own food | kcal out | growth kcal | daytime nursing % | daytime eating % | mass kg | reserves ÷ store | Δ reserves over window | growth kg/y | mother reserves ÷ store | mother milk cost |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const weanPts: [number, number][] = [];
for (const b of BINS) {
  const B = inf[b], d = B.ticks / DAY; if (!d) continue;
  const ds = dyads.filter(x => binOf(x.age0) === b), dres = ds.length ? ds.reduce((s, x) => s + x.res1 - x.res0, 0) / ds.length : NaN, gv = ds.length ? ds.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / ds.length : NaN;
  const milk = B.milkDay + B.milkNight;
  console.log(`| ${b} | ${f(d)} | ${f(B.milkDay / d)} | ${f(B.milkNight / d)} | ${f((B.kin - milk) / d)} | ${f(B.out / d)} | ${f(B.growth / d)} | ${f(100 * B.nurseDay / Math.max(1, B.dayTicks), 1)} | ${f(100 * B.eatDay / Math.max(1, B.dayTicks), 1)} | ${f(B.kg / B.ticks, 1)} | ${f(B.res / B.ticks, 3)} | ${f(dres, 3)} (n ${ds.length}) | ${f(gv, 2)} | ${f(B.motherRes / Math.max(1, B.mothers), 3)} | ${f(B.motherMilkCost / d)} |`);
}
console.log('\nstage E1f: nursing, intake and mothers\' balance by infant age (daylight shares; bouts per daylight hour; own-food kcal per eating minute)');
console.log('| age | nurse act % of daylight | bouts per daylight h | mean bout min | milk share of intake | own food kcal per eating min | mothers\' balance kcal/d | mothers\' balance ÷ store per d | mother-days |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const B = inf[b], d = B.ticks / DAY; if (!d && !B.mDays) continue;
  const milk = B.milkDay + B.milkNight, own = B.kin - milk, share = B.kin > 0 ? milk / B.kin : NaN, dayH = B.dayTicks / 240;
  if (b !== '0–0.5 y' && b !== '0.5–1 y' && Number.isFinite(share)) weanPts.push([MID[b], share]);
  console.log(`| ${b} | ${f(100 * B.actDay / Math.max(1, B.dayTicks), 1)} | ${f(dayH ? B.bouts / dayH : NaN, 2)} | ${f(B.bouts ? B.actDay / 4 / B.bouts : NaN, 1)} | ${f(share, 2)} | ${f(B.eatDay ? own / (B.eatDay / 4) : NaN, 2)} | ${f(B.mDays ? B.mBal / B.mDays : NaN)} | ${f(B.mDays ? B.mBalRel / B.mDays : NaN, 4)} | ${B.mDays} |`);
}
if (weanPts.length >= 2) {
  const n = weanPts.length, mx = weanPts.reduce((s, p) => s + p[0], 0) / n, my = weanPts.reduce((s, p) => s + p[1], 0) / n;
  const k = weanPts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / weanPts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  console.log(`milk share of intake against age (bins ≥ 1 y): slope ${f(k, 3)} per y; reaches zero at ${f(mx - my / k, 1)} y (indicative nutritional weaning)`);
}
const jv = (sex: string, lo: number, hi: number) => { const j = juvs.filter(x => x.sex === sex && x.age0 >= lo && x.age0 < hi); return j.length ? `${f(j.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / j.length, 2)} kg/y (n ${j.length}, mean ${f(j.reduce((s, x) => s + x.kg0, 0) / j.length, 1)} kg at ${f(j.reduce((s, x) => s + x.age0, 0) / j.length, 1)} y)` : '—'; };
console.log(`juvenile growth velocity, weaned to 12 y: female 4–8 y ${jv('female', 4, 8)}, 8–12 y ${jv('female', 8, 12)}; male 4–8 y ${jv('male', 4, 8)}, 8–12 y ${jv('male', 8, 12)}`);
console.log('dyads (seed, id, age at start, kg start → end, reserves start → end, milk kcal/d, mother mean reserves):');
for (const x of dyads) console.log(`  ${x.seed} ${x.id} ${x.age0.toFixed(2)} y  ${x.kg0.toFixed(2)} → ${x.kg1.toFixed(2)} kg  ${x.res0.toFixed(3)} → ${x.res1.toFixed(3)}  milk ${x.milk.toFixed(0)}  mother ${x.mRes.toFixed(3)}`);
for (const [n, t] of Object.entries(traj)) console.log(`reserves ÷ store, ${n}, every 5 d: ${t.filter((_, i) => i % 5 === 0).map(v => f(v, 3)).join(' ')}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ profile, seeds, burnIn, days, params, termBirths, rows, births, deaths, deathsByClass, living: [livingStart, livingEnd], traj, infants: inf, dyads, juvs }, null, 1));
