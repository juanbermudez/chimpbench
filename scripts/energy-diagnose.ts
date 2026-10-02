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
// Stage E1k: the JSON also holds per-class daily sums over the window (`daily`), so a window can be split afterwards
// (the 5-seed E1i confirm's mothers lost most in its last 30 days, when the phenology crop falls).
// Stage E1n: by infant age, day nurse-act starts and their outcome (accepted; refused by the weaning roll; refused or
// ended by the mother), night bouts, eating minutes, the infant's daylight decisions while the nurse option is offered
// (the nurse score against its best own-food option: feed or forage, a travel to a tree, beg), its hunger, foregut fill
// and the mother's gland store, the mother's state at accepted day starts, and the share of ticks with a full store.
// Stage E1o (docs/staging/e1o-prereg.md §1.2): what an older infant drinks. Night access in the mother's nest (eligible,
// drinking, drive saturated, gland-limited drinks), the infant's night budget (spending, gut energy at dusk, milk,
// reserves at dusk and dawn, the gland at dusk and dawn, synthesis), day synthesis, the infant's state at day bout
// onsets (reserves, hunger, φ, own-food drive, foregut fill split into milk and solids by a shadow pool, gland, the
// bout's worth), the day choice (own food on the menu, a tree on the menu, carried, mother foraging, the nurse score's
// hunger-free part against the best own food, what else wins), own-food limits (carried, mother foraging, eating at a
// full foregut, intake size), and mothers by their youngest infant's age (eating minutes, daylight fill and hunger).
//
//   pnpm exec tsx scripts/energy-diagnose.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--profile field] [--params '{"energyLedger":1}'] [--term-births] [--json f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { digestaCaps, energyTap, fruitKcalPerUnit, intakeSize, massOf, nurseBoutWorth, ownDrive, plantKcalPerMin, reserveCap, gutCap, type EnergyTerm, type FoodKind } from '../src/sim/energy';
import { isCarried, V } from '../src/sim/candidates';
import { paramsOf, type Profile } from '../src/sim/params';
import { isTreeId, ix } from '../src/sim/state';
import { nurseTap } from '../src/sim/execution';
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
/** Stage E1n: the weaning-decision readouts by infant age (see the header). */
interface Wean { dayStarts: number; nightActStarts: number; refRoll: number; refMother: number; endMother: number; nightBouts: number; dec: number; nurseTop: number; nurseChosen: number; ownChosen: number;
  margins: number[]; hunger: number; fill: number; gland: number; dryDec: number; own: number; mHungerDec: number; ownAbove: number; mStarts: number; mRes: number; mHunger: number; mFill: number; mFeeding: number; storeFull: number; storeTicks: number }
const blankWean = (): Wean => ({ dayStarts: 0, nightActStarts: 0, refRoll: 0, refMother: 0, endMother: 0, nightBouts: 0, dec: 0, nurseTop: 0, nurseChosen: 0, ownChosen: 0, margins: [], hunger: 0, fill: 0, gland: 0, dryDec: 0, own: 0, mHungerDec: 0, ownAbove: 0,
  mStarts: 0, mRes: 0, mHunger: 0, mFill: 0, mFeeding: 0, storeFull: 0, storeTicks: 0 });
const wean = Object.fromEntries(BINS.map(b => [b, blankWean()])) as Record<string, Wean>;
/** Stage E1o: what an older infant drinks (see the header and docs/staging/e1o-prereg.md §1.2), by infant age. */
interface E1o { ownDmIn: number; ownDmOut: number; capPass: number; mCrown: number; mcEat: number; mcNurse: number; mcCarried: number; mcH: number; mcFill: number; mcAct: Record<string, number>; nightTicks: number; nest: number; elig: number; drink: number; sat: number; satN: number; glandLim: number; asleep: number; drinkAsleep: number; fruitRate: number; nH: number; nRes: number; nFillMilk: number; nFillSolid: number; nPhi: number; nPhiN: number;
  nights: number; nSpend: number; nGutDusk: number; nMilk: number; nResDusk: number; nResDawn: number; nGlandDusk: number; nGlandDawn: number; nSynth: number;
  daySynth: number; dayMilk: number; synthTicks: number;
  ons: number; oRes: number; oH: number; oPhi: number; oPhiN: number; oOwn: number; oFillMilk: number; oFillSolid: number; oGland: number; oB: number; oNoDef: number;
  dec: number; ownOn: number; treeOn: number; carriedDec: number; mForDec: number; freeBeats: number; both: number; other: Record<string, number>;
  dayTicks: number; carried: number; mFor: number; eat: number; eatFull: number; size: number;
  mTicks: number; mDay: number; mEat: number; mFill: number; mHunger: number; mRes: number }
const blankE1o = (): E1o => ({ ownDmIn: 0, ownDmOut: 0, capPass: 0, mCrown: 0, mcEat: 0, mcNurse: 0, mcCarried: 0, mcH: 0, mcFill: 0, mcAct: {}, nightTicks: 0, nest: 0, elig: 0, drink: 0, sat: 0, satN: 0, glandLim: 0, asleep: 0, drinkAsleep: 0, fruitRate: 0, nH: 0, nRes: 0, nFillMilk: 0, nFillSolid: 0, nPhi: 0, nPhiN: 0,
  nights: 0, nSpend: 0, nGutDusk: 0, nMilk: 0, nResDusk: 0, nResDawn: 0, nGlandDusk: 0, nGlandDawn: 0, nSynth: 0, daySynth: 0, dayMilk: 0, synthTicks: 0,
  ons: 0, oRes: 0, oH: 0, oPhi: 0, oPhiN: 0, oOwn: 0, oFillMilk: 0, oFillSolid: 0, oGland: 0, oB: 0, oNoDef: 0,
  dec: 0, ownOn: 0, treeOn: 0, carriedDec: 0, mForDec: 0, freeBeats: 0, both: 0, other: {}, dayTicks: 0, carried: 0, mFor: 0, eat: 0, eatFull: 0, size: 0,
  mTicks: 0, mDay: 0, mEat: 0, mFill: 0, mHunger: 0, mRes: 0 });
const e1o = Object.fromEntries(BINS.map(b => [b, blankE1o()])) as Record<string, E1o>;
/** An own-food option of an infant: feeding or foraging, a travel to a tree, begging. */
const ownFood = (a: string, t: number) => a === 'forage' || a === 'beg' || (a === 'travel' && isTreeId(t));
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
// stage E1k: per-class daily sums over the window (summed over seeds), so any part of the window can be read later:
// ticks, daylight ticks, eating ticks, kcal eaten (milk included), kcal passed out, kcal spent, dry matter eaten,
// daylight hunger, daylight ticks with the foregut ≥ 95% full
interface Day { ticks: number; dayTicks: number; eating: number; kin: number; fec: number; out: number; dm: number; hunger: number; foreFull: number }
const daily: Record<string, Day[]> = {};
let curDay = 0;
const dayOf = (n: string): Day => ((daily[n] ??= [])[curDay] ??= { ticks: 0, dayTicks: 0, eating: 0, kin: 0, fec: 0, out: 0, dm: 0, hunger: 0, foreFull: 0 });

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
    const k = cls.get(c.id); if (k) for (const n of k) { acc[n].out[term] += kcal; dayOf(n).out += kcal; }
    const b = binNow.get(c.id);
    if (b) { inf[b].out += kcal; if (term === 'growth') inf[b].growth += kcal; }
  };
  // stage E1o: helpers (read-only). Foregut fill as setHunger reads it; the satiation term (E1i's reserve weighting when on);
  // φ = hunger ÷ the satiation term (the drive before satiation, clamped at 1); energy still in the gut; the foregut's
  // dry matter split into milk and solids by a shadow pool (milk's dry matter enters it, and it empties in the same
  // proportion as the foregut each tick)
  const shadowMilk = new Map<number, number>(), prevDm = new Map<number, number>(), prevDmIn = new Map<number, number>(), prevDmIn2 = new Map<number, number>(), glandPrev = new Map<number, number>();
  const lightPrev = new Map<number, boolean>(), ateNow = new Map<number, boolean>();
  const nightRec = new Map<number, { out0: number; gut: number; res: number; gland: number; milk: number; synth: number }>();
  const fillOf = (c: Chimp): number => { const L = ix(c).en; if (!L) return NaN; if (L.dm !== undefined) { const cap = digestaCaps(c, P)[0]; return cap > 0 ? Math.min(1, Math.max(0, L.dm / cap)) : NaN; } return Math.min(1, Math.max(0, L.gut / gutCap(c, P))); };
  const phiOf = (c: Chimp): number => { const L = ix(c).en!, f = fillOf(c), r = P.ledgerSatiationReserve === 1 ? Math.max(0, 1 + L.res / reserveCap(c, P)) : 1, s = 1 - r * f * f; return s > 1e-6 ? Math.min(1, c.hunger / s) : NaN; };
  const gutE = (c: Chimp): number => { const L = ix(c).en!; return L.gut + (L.fib !== undefined ? P.digestaFermentKcalPerG * P.digestaNdfDigestibility * (L.fib + (L.hind ?? 0)) : 0); };
  const milkSplit = (c: Chimp): [number, number] => { const L = ix(c).en; if (!L || L.dm === undefined) return [NaN, NaN]; const cap = digestaCaps(c, P)[0], sm = Math.min(shadowMilk.get(c.id) ?? 0, L.dm); return [sm / cap, (L.dm - sm) / cap]; };
  // stage E1n: day nurse-act events (execution.ts nurseTap), binned by the infant's age; the mother's state at accepted starts
  nurseTap.fn = (c, m, ev) => {
    const b = binNow.get(c.id); if (!b) return;
    const W = wean[b];
    if (ev === 'refuse-roll') { W.refRoll++; return; }
    if (ev === 'refuse-mother') { W.refMother++; return; }
    if (ev === 'end-mother') { W.endMother++; return; }
    if (!light) { W.nightActStarts++; return; }
    W.dayStarts++;
    const ML = ix(m).en;
    if (ML) { const caps = ML.dm !== undefined ? digestaCaps(m, P) : null; W.mStarts++; W.mRes += ML.res / reserveCap(m, P); W.mHunger += m.hunger; W.mFill += caps ? ML.dm! / caps[0] : ML.gut / gutCap(m, P); if (m.action === 'forage') W.mFeeding++; }
    // stage E1o (D2): the infant's state at an accepted day bout onset
    const IL = ix(c).en, E = e1o[b];
    if (IL) {
      E.ons++; E.oRes += IL.res / reserveCap(c, P); E.oH += c.hunger; E.oOwn += ownDrive(c, P); E.oGland += ML ? ML.milk : 0; E.oB += nurseBoutWorth(c, m, P);
      const ph = phiOf(c); if (Number.isFinite(ph)) { E.oPhi += ph; E.oPhiN++; }
      const [fm, fs] = milkSplit(c); E.oFillMilk += fm; E.oFillSolid += fs;
      if (IL.res >= 0 && fillOf(c) >= 0.5) E.oNoDef++;
    }
  };
  const storeFull = (m: Chimp) => P.ledgerMilkYieldCoef / 24 * Math.pow(massOf(m, P), P.ledgerRmrExp) * P.ledgerMilkStoreH;
  const flowTick = P.ledgerMilkKcalPerMin * 15 / 60;
  const lastVer = new Map<number, number>(), nightPrev = new Map<number, boolean>();
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
    curDay = Math.floor(i / DAY);
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
      ateNow.set(c.id, eating); // stage E1o: mothers' eating, read in the infant loop below
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
        const dd = dayOf(n); dd.ticks++; if (eating) dd.eating++; if (L) dd.kin += din; dd.fec += dfec; dd.dm += ddm;
        if (light) { dd.dayTicks++; dd.hunger += c.hunger; if (caps && L!.dm! >= 0.95 * caps[0]) dd.foreFull++; }
      }
    }
    for (const [id, b] of binNow) {
      const c = w.chimps.find(k => k.id === id)!;
      if (!c.alive) continue;
      if (!start.has(id) && ix(c).en) { const L0 = ix(c).en!; start.set(id, { age0: c.age, kg0: massOf(c, P), res0: L0.res / reserveCap(c, P), mRes: 0, mN: 0 }); }
      const B = inf[b], L = ix(c).en, m = motherOf.get(id), milk = milkTick.get(id) ?? 0;
      // stage E1f: nipple contact by day (the nurse act, the milk-ejection wait included) and bouts started by day
      const was = prevAct.get(id); prevAct.set(id, c.action);
      // stage E1n: night bouts (a night tick with milk after one without), the gland store, the infant's daylight decisions
      const W = wean[b], ML = m && m.alive ? ix(m).en : undefined;
      if (!light) { const now = milk > 0; if (now && !nightPrev.get(id)) W.nightBouts++; nightPrev.set(id, now); } else nightPrev.set(id, false);
      if (ML && m) { W.storeTicks++; if (ML.milk >= storeFull(m) * (1 - 1e-6)) W.storeFull++; }
      const ver = c.decisionVersion, lv = lastVer.get(id); lastVer.set(id, ver);
      if (light && lv !== undefined && ver !== lv) {
        const nurse = c.candidates.find(k => k.action === 'nurse');
        if (nurse) {
          let own = -Infinity; for (const k of c.candidates) if (ownFood(k.action, k.targetId) && k.score > own) own = k.score;
          W.dec++; if (c.candidates[0] === nurse) W.nurseTop++;
          if (c.action === 'nurse') W.nurseChosen++; else if (ownFood(c.action, c.targetId)) W.ownChosen++;
          if (own > -Infinity) W.margins.push(nurse.score - own);
          const caps = L && L.dm !== undefined ? digestaCaps(c, P) : null;
          W.hunger += c.hunger; W.fill += caps ? L!.dm! / caps[0] : L ? L.gut / gutCap(c, P) : 0;
          const g = ML ? ML.milk : 0; W.gland += g; if (g < flowTick) W.dryDec++;
          // the E1n rule's two terms at the decision (read with any switch setting): the infant's own-food drive, the mother's hunger
          if (m) { const od = ownDrive(c, P); W.own += od; W.mHungerDec += m.hunger; if (od >= m.hunger) W.ownAbove++; }
          // stage E1o (D3): own food and a tree on the menu, carried, mother foraging; the nurse score's hunger-free part
          // (0.25 × the bout's worth, minus its distance term) against the best own-food option; what else wins
          const E = e1o[b];
          E.dec++;
          if (own > -Infinity) E.ownOn++;
          if (c.candidates.some(k => (k.action === 'forage' || k.action === 'travel') && isTreeId(k.targetId))) E.treeOn++;
          if (m && isCarried(c, m)) E.carriedDec++;
          if (m && m.action === 'forage') E.mForDec++;
          if (m && own > -Infinity) { const pen = Math.hypot(c.position[0] - m.position[0], c.position[2] - m.position[2]) > P.nurseRangeM ? 0.5 : 0; E.both++; if (0.25 * nurseBoutWorth(c, m, P) - pen > own) E.freeBeats++; }
          if (c.action !== 'nurse' && !ownFood(c.action, c.targetId)) E.other[c.action] = (E.other[c.action] ?? 0) + 1;
        }
      }
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
      // stage E1o: shadow pool of milk in the foregut; gland synthesis (store change + milk drunk; a mother with two
      // unweaned infants would be read low); night access and the night budget; day eating limits; mothers by infant age
      {
        const E = e1o[b];
        const dmInBefore = prevDmIn.get(id); if (dmInBefore !== undefined) prevDmIn2.set(id, dmInBefore);
        if (L && L.dm !== undefined) {
          const dm0 = prevDm.get(id), in0 = prevDmIn.get(id);
          if (dm0 !== undefined && in0 !== undefined) {
            const added = L.dmIn! - in0, k = dm0 > 1e-9 ? Math.min(1, Math.max(0, (L.dm - added) / dm0)) : 0;
            shadowMilk.set(id, Math.min(L.dm, (shadowMilk.get(id) ?? 0) * k + milk * P.digestaMilkDmGPerKcal));
          } else shadowMilk.set(id, 0);
          prevDm.set(id, L.dm); prevDmIn.set(id, L.dmIn!);
        }
        const MLe = m && m.alive ? ix(m).en : undefined, g0 = glandPrev.get(id), syn = MLe && g0 !== undefined ? MLe.milk - g0 + milk : 0;
        if (MLe) glandPrev.set(id, MLe.milk);
        const wasLight = lightPrev.get(id); lightPrev.set(id, light);
        if (light) {
          E.daySynth += syn; E.dayMilk += milk; E.synthTicks++;
          const rec = nightRec.get(id);
          if (rec && L) {
            const D = e1o[b]; D.nights++; D.nSpend += L.out - rec.out0; D.nGutDusk += rec.gut; D.nMilk += rec.milk; D.nResDusk += rec.res; D.nResDawn += L.res / reserveCap(c, P);
            D.nGlandDusk += rec.gland; D.nGlandDawn += MLe ? MLe.milk : 0; D.nSynth += rec.synth;
          }
          nightRec.delete(id);
          if (L) {
            E.dayTicks++;
            if (m && isCarried(c, m)) E.carried++;
            if (m && m.action === 'forage') E.mFor++;
            const ate = din - milk > 1e-9;
            if (ate) { E.eat++; if (fillOf(c) >= 0.95) E.eatFull++; }
            // D5 (added after the diagnosis run, disclosed): while the mother feeds in a crown, what the infant does
            // D6 (added with D5's results, disclosed): own-food dry matter eaten while the mother is in a crown and outside,
            // and what the foregut could pass in those ticks if kept full (capacity × the share it empties per tick)
            const dIn = prevDmIn2.get(id), ownDm = dIn !== undefined && L.dmIn !== undefined ? Math.max(0, L.dmIn - dIn - milk * P.digestaMilkDmGPerKcal) : 0;
            const inCrown = !!m && m.action === 'forage' && isTreeId(m.targetId) && ix(m).phase === 2;
            if (inCrown) { E.ownDmIn += ownDm; E.capPass += digestaCaps(c, P)[0] * (1 - Math.exp(-15 / 3600 / P.ledgerGutEmptyH)); } else E.ownDmOut += ownDm;
            if (m && m.action === 'forage' && isTreeId(m.targetId) && ix(m).phase === 2) {
              E.mCrown++; if (ate) E.mcEat++; if (c.action === 'nurse') E.mcNurse++; if (isCarried(c, m)) E.mcCarried++;
              E.mcH += c.hunger; E.mcFill += fillOf(c);
              const a = ate ? 'eating' : c.action === 'forage' ? 'forage (not eating)' : c.action; E.mcAct[a] = (E.mcAct[a] ?? 0) + 1;
            }
            E.size += intakeSize(c, P);
            // the infant's full intake rate on ripe fruit at its size and skill (kcal/h; energy.ts feedRate's fruit term), against the suckling rate
            E.fruitRate += P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : c.age < 5 ? P.fruitIntakeYoungFactor : 1) * fruitKcalPerUnit(P, false);
          }
        } else {
          if (wasLight === true && L) nightRec.set(id, { out0: L.out, gut: gutE(c), res: L.res / reserveCap(c, P), gland: MLe ? MLe.milk : 0, milk, synth: syn });
          else { const rec = nightRec.get(id); if (rec) { rec.milk += milk; rec.synth += syn; } }
          E.nightTicks++;
          if (L && m && c.action === 'nest' && ix(c).v === V.MOTHER && m.action === 'nest') {
            E.nest++;
            if (c.hunger >= 0.08) E.elig++;
            const asl = ix(c).asl === 1; if (asl) E.asleep++;
            if (milk > 0) { E.drink++; if (asl) E.drinkAsleep++; if (milk < flowTick * (1 - 1e-6) && fillOf(c) < 0.99) E.glandLim++; }
            const ph = phiOf(c); if (Number.isFinite(ph)) { E.nPhi += ph; E.nPhiN++; if (ph >= 0.999) E.sat++; E.satN++; }
            E.nH += c.hunger; E.nRes += L.res / reserveCap(c, P);
            const [fm, fs] = milkSplit(c); E.nFillMilk += fm; E.nFillSolid += fs;
          }
        }
        const ya = m ? young.get(m.id) : undefined, MLm = m && m.alive ? ix(m).en : undefined;
        if (m && MLm && ya !== undefined && Math.abs(ya - c.age) < 0.01) {
          E.mTicks++; E.mRes += MLm.res / reserveCap(m, P); if (ateNow.get(m.id)) E.mEat++;
          if (light) { E.mDay++; E.mFill += fillOf(m); E.mHunger += m.hunger; }
        }
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
  energyTap.fn = null; nurseTap.fn = null;
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
// stage E1n: the weaning-decision readouts by infant age
const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const weanOut: Record<string, Record<string, number>> = {};
console.log('\nstage E1n: weaning decision by infant age (per infant-day; decisions = the infant\'s daylight decisions with the nurse option offered; margin = nurse score − best own-food score)');
console.log('| age | infant-days | day starts (night act starts) | refused (roll, any hour) | refused / ended (mother) | night bouts | milk day | milk night | eating min | own kcal per eating min | decisions | nurse top % | nurse chosen % | own food chosen % | margin p25 / median / p75 | hunger | own-food drive / mother hunger (own ≥ mother %) | foregut fill | gland kcal | dry gland % | mother at starts: reserves ÷ store, hunger, foregut, feeding % | store full % |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const B = inf[b], W = wean[b], d = B.ticks / DAY; if (!d) continue;
  const milk = B.milkDay + B.milkNight, own = B.kin - milk, n = Math.max(1, W.dec), ms = Math.max(1, W.mStarts);
  const o = { infantDays: d, dayStarts: W.dayStarts / d, refusedRoll: W.refRoll / d, refusedRollShare: W.refRoll / Math.max(1, W.refRoll + W.refMother + W.dayStarts + W.nightActStarts), nightActStarts: W.nightActStarts / d, refusedMother: W.refMother / d, endedMother: W.endMother / d,
    nightBouts: W.nightBouts / d, milkDay: B.milkDay / d, milkNight: B.milkNight / d, eatingMin: B.eatDay / 4 / d, ownPerEatMin: B.eatDay ? own / (B.eatDay / 4) : NaN, decisions: W.dec / d,
    nurseTop: W.nurseTop / n, nurseChosen: W.nurseChosen / n, ownChosen: W.ownChosen / n, marginP25: q(W.margins, 0.25), marginMedian: q(W.margins, 0.5), marginP75: q(W.margins, 0.75), marginN: W.margins.length,
    hunger: W.hunger / n, fill: W.fill / n, gland: W.gland / n, dryGland: W.dryDec / n, ownDrive: W.own / n, motherHungerAtDec: W.mHungerDec / n, ownAboveMother: W.ownAbove / n, mRes: W.mRes / ms, mHunger: W.mHunger / ms, mFill: W.mFill / ms, mFeeding: W.mFeeding / ms, mStarts: W.mStarts, storeFull: W.storeFull / Math.max(1, W.storeTicks) };
  weanOut[b] = o;
  console.log(`| ${b} | ${f(d)} | ${f(o.dayStarts, 1)} (${f(o.nightActStarts, 2)}) | ${f(o.refusedRoll, 2)} (${f(100 * o.refusedRollShare, 1)}%) | ${f(o.refusedMother, 2)} / ${f(o.endedMother, 2)} | ${f(o.nightBouts, 1)} | ${f(o.milkDay)} | ${f(o.milkNight)} | ${f(o.eatingMin)} | ${f(o.ownPerEatMin, 2)} | ${f(o.decisions, 1)} | ${f(100 * o.nurseTop, 1)} | ${f(100 * o.nurseChosen, 1)} | ${f(100 * o.ownChosen, 1)} | ${f(o.marginP25, 2)} / ${f(o.marginMedian, 2)} / ${f(o.marginP75, 2)} | ${f(o.hunger, 2)} | ${f(o.ownDrive, 2)} / ${f(o.motherHungerAtDec, 2)} (${f(100 * o.ownAboveMother, 1)}) | ${f(o.fill, 2)} | ${f(o.gland)} | ${f(100 * o.dryGland, 1)} | ${f(o.mRes, 3)}, ${f(o.mHunger, 2)}, ${f(o.mFill, 2)}, ${f(100 * o.mFeeding, 1)} | ${f(100 * o.storeFull, 1)} |`);
}
// stage E1o: what an older infant drinks (docs/staging/e1o-prereg.md §1.2)
const e1oOut: Record<string, Record<string, number | string>> = {};
console.log('\nstage E1o: night access in the mother\'s nest, the night budget and day synthesis (per infant-night or infant-day; shares of night-nest ticks; φ = hunger ÷ the satiation term)');
console.log('| age | night ticks in the nest % | eligible (hunger ≥ 0.08) % | drinking % | asleep (latch) % | drinks while asleep % | drive saturated (φ ≥ 0.999) % | mean φ | drinks gland-limited % | night hunger | night reserves ÷ store | night foregut: milk / solids | nights | night spend kcal | gut energy at dusk | night milk | night synthesis | reserves ÷ store dusk → dawn | gland kcal dusk → dawn | day milk | day synthesis |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const E = e1o[b], B = inf[b], d = B.ticks / DAY; if (!d) continue;
  const ns = Math.max(1, E.nest), nn = Math.max(1, E.nights), dDays = d;
  const o: Record<string, number | string> = { nestShare: E.nest / Math.max(1, E.nightTicks), elig: E.elig / ns, drink: E.drink / ns, asleep: E.asleep / ns, drinkAsleep: E.drinkAsleep / Math.max(1, E.drink), sat: E.sat / Math.max(1, E.satN), phi: E.nPhi / Math.max(1, E.nPhiN), glandLim: E.glandLim / Math.max(1, E.drink),
    nightHunger: E.nH / ns, nightRes: E.nRes / ns, nightFillMilk: E.nFillMilk / ns, nightFillSolid: E.nFillSolid / ns, nights: E.nights, nightSpend: E.nSpend / nn, gutDusk: E.nGutDusk / nn, nightMilk: E.nMilk / nn, nightSynth: E.nSynth / nn,
    resDusk: E.nResDusk / nn, resDawn: E.nResDawn / nn, glandDusk: E.nGlandDusk / nn, glandDawn: E.nGlandDawn / nn, dayMilk: E.dayMilk / dDays, daySynth: E.daySynth / dDays };
  e1oOut[b] = o;
  const n = (k: string, dg = 0) => f(o[k] as number, dg);
  console.log(`| ${b} | ${f(100 * (o.nestShare as number), 1)} | ${f(100 * (o.elig as number), 1)} | ${f(100 * (o.drink as number), 1)} | ${f(100 * (o.asleep as number), 1)} | ${f(100 * (o.drinkAsleep as number), 1)} | ${f(100 * (o.sat as number), 1)} | ${n('phi', 2)} | ${f(100 * (o.glandLim as number), 1)} | ${n('nightHunger', 2)} | ${n('nightRes', 3)} | ${n('nightFillMilk', 2)} / ${n('nightFillSolid', 2)} | ${E.nights} | ${n('nightSpend')} | ${n('gutDusk')} | ${n('nightMilk')} | ${n('nightSynth')} | ${n('resDusk', 3)} → ${n('resDawn', 3)} | ${n('glandDusk')} → ${n('glandDawn')} | ${n('dayMilk')} | ${n('daySynth')} |`);
}
console.log('\nstage E1o: day bout onsets, the day choice, own-food limits, mothers by their youngest infant\'s age (onsets: means at accepted day starts; choice: shares of the infant\'s daylight decisions with the nurse option offered; limits: shares of daylight ticks)');
console.log('| age | onsets per day | reserves ÷ store | hunger | φ | own-food drive | foregut: milk / solids | gland kcal | bout worth b | without a deficit % | own food on menu % | tree on menu % | carried at decisions % | mother foraging at decisions % | hunger-free part beats own food % (n) | other winners | carried % daylight | mother foraging % daylight | eating % daylight | eating at a full foregut % | intake size | own fruit rate kcal/h (suckling 150) | mother: eating min, daylight fill, daylight hunger, reserves ÷ store |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const E = e1o[b], B = inf[b], d = B.ticks / DAY; if (!d) continue;
  const on = Math.max(1, E.ons), dec = Math.max(1, E.dec), dt = Math.max(1, E.dayTicks), md = Math.max(1, E.mDay);
  const others = Object.entries(E.other).sort((u, v) => v[1] - u[1]).slice(0, 3).map(([a, k]) => `${a} ${f(100 * k / dec, 1)}`).join(', ');
  const o: Record<string, number | string> = { onsetsPerDay: E.ons / d, oRes: E.oRes / on, oHunger: E.oH / on, oPhi: E.oPhi / Math.max(1, E.oPhiN), oOwn: E.oOwn / on, oFillMilk: E.oFillMilk / on, oFillSolid: E.oFillSolid / on, oGland: E.oGland / on, oB: E.oB / on, oNoDeficit: E.oNoDef / on,
    ownOnMenu: E.ownOn / dec, treeOnMenu: E.treeOn / dec, carriedDec: E.carriedDec / dec, motherForagingDec: E.mForDec / dec, freeBeats: E.freeBeats / Math.max(1, E.both), freeBeatsN: E.both, others,
    carried: E.carried / dt, motherForaging: E.mFor / dt, eating: E.eat / dt, eatFull: E.eatFull / Math.max(1, E.eat), size: E.size / dt, fruitRate: E.fruitRate / dt,
    mEatMin: E.mTicks ? E.mEat / 4 / (E.mTicks / DAY) : NaN, mFill: E.mFill / md, mHunger: E.mHunger / md, mRes: E.mTicks ? E.mRes / E.mTicks : NaN,
    ownDmInPerDay: E.ownDmIn / d, ownDmOutPerDay: E.ownDmOut / d, passUse: E.capPass > 0 ? E.ownDmIn / E.capPass : NaN, mCrown: E.mCrown / dt, mcEat: E.mcEat / Math.max(1, E.mCrown), mcNurse: E.mcNurse / Math.max(1, E.mCrown), mcCarried: E.mcCarried / Math.max(1, E.mCrown), mcHunger: E.mcH / Math.max(1, E.mCrown), mcFill: E.mcFill / Math.max(1, E.mCrown),
    mcActs: Object.entries(E.mcAct).sort((u, v) => v[1] - u[1]).slice(0, 5).map(([a, k]) => `${a} ${f(100 * k / Math.max(1, E.mCrown), 1)}`).join(', ') };
  Object.assign(e1oOut[b] ??= {}, o);
  const n = (k: string, dg = 0) => f(o[k] as number, dg), pc = (k: string) => f(100 * (o[k] as number), 1);
  console.log(`| ${b} | ${n('onsetsPerDay', 1)} | ${n('oRes', 3)} | ${n('oHunger', 2)} | ${n('oPhi', 2)} | ${n('oOwn', 2)} | ${n('oFillMilk', 2)} / ${n('oFillSolid', 2)} | ${n('oGland', 1)} | ${n('oB', 2)} | ${pc('oNoDeficit')} | ${pc('ownOnMenu')} | ${pc('treeOnMenu')} | ${pc('carriedDec')} | ${pc('motherForagingDec')} | ${pc('freeBeats')} (${E.both}) | ${others} | ${pc('carried')} | ${pc('motherForaging')} | ${pc('eating')} | ${pc('eatFull')} | ${n('size', 2)} | ${n('fruitRate')} | ${n('mEatMin')}, ${n('mFill', 2)}, ${n('mHunger', 2)}, ${n('mRes', 3)} |`);
}
console.log('\nstage E1o (D5): while the mother feeds in a crown (shares of those daylight ticks of the infant)');
console.log('| age | mother in a crown % of daylight | infant eating own food % | in the nurse act % | carried % | infant hunger | infant foregut fill | infant acts (top 5) | own dry matter g/day: mother in a crown / outside | crown-time intake ÷ what a full foregut passes |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const b of BINS) {
  const o = e1oOut[b]; if (!o || o.mCrown === undefined) continue;
  console.log(`| ${b} | ${f(100 * (o.mCrown as number), 1)} | ${f(100 * (o.mcEat as number), 1)} | ${f(100 * (o.mcNurse as number), 1)} | ${f(100 * (o.mcCarried as number), 1)} | ${f(o.mcHunger as number, 2)} | ${f(o.mcFill as number, 2)} | ${o.mcActs} | ${f(o.ownDmInPerDay as number)} / ${f(o.ownDmOutPerDay as number)} | ${f(o.passUse as number, 2)} |`);
}
const jv = (sex: string, lo: number, hi: number) => { const j = juvs.filter(x => x.sex === sex && x.age0 >= lo && x.age0 < hi); return j.length ? `${f(j.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / j.length, 2)} kg/y (n ${j.length}, mean ${f(j.reduce((s, x) => s + x.kg0, 0) / j.length, 1)} kg at ${f(j.reduce((s, x) => s + x.age0, 0) / j.length, 1)} y)` : '—'; };
console.log(`juvenile growth velocity, weaned to 12 y: female 4–8 y ${jv('female', 4, 8)}, 8–12 y ${jv('female', 8, 12)}; male 4–8 y ${jv('male', 4, 8)}, 8–12 y ${jv('male', 8, 12)}`);
console.log('dyads (seed, id, age at start, kg start → end, reserves start → end, milk kcal/d, mother mean reserves):');
for (const x of dyads) console.log(`  ${x.seed} ${x.id} ${x.age0.toFixed(2)} y  ${x.kg0.toFixed(2)} → ${x.kg1.toFixed(2)} kg  ${x.res0.toFixed(3)} → ${x.res1.toFixed(3)}  milk ${x.milk.toFixed(0)}  mother ${x.mRes.toFixed(3)}`);
for (const [n, t] of Object.entries(traj)) console.log(`reserves ÷ store, ${n}, every 5 d: ${t.filter((_, i) => i % 5 === 0).map(v => f(v, 3)).join(' ')}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ profile, seeds, burnIn, days, params, termBirths, rows, births, deaths, deathsByClass, living: [livingStart, livingEnd], traj, daily, infants: inf, dyads, juvs, wean: weanOut, e1o: e1oOut }, null, 1));
