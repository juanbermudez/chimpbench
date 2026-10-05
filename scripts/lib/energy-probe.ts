// Energy readouts (stages E1 to E1p; development readouts, simulation truth), moved from scripts/energy-diagnose.ts so
// the same code runs inside e-bench's single pass (track E, part E1). What each readout means is documented in
// scripts/energy-diagnose.ts's header; the code below is that script's, with its per-seed locals gathered into one
// state object (checkpointed with the world by scripts/lib/checkpoint.ts) and its accumulators into another:
//   EnergyAcc         the accumulators the report reads (summed over animals, ticks and seeds)
//   EnergySeedState   everything one seed's measurement carries from tick to tick
// energy-diagnose.ts runs its seeds one after another into one EnergyAcc, exactly as before (its output is unchanged).
// e-bench measures each seed into its own EnergyAcc and pools them in seed order (mergeEnergy): integer counts, lists and
// per-seed values are identical to the sequential run; float sums over seeds can differ in the last bits, because a sum
// added seed by seed is not the sum added tick by tick across seeds.
// It reads the world and never writes it. The two taps (energyTap, nurseTap) are module-level hooks of src/sim: while
// another world is ticked (e-bench's field experiments on world copies) they must be switched off (energyTapsOff).
import { digestaCaps, energyTap, fruitKcalPerUnit, growthPotential, intakeSize, massOf, nurseBoutWorth, ownDrive, plantKcalPerMin, reserveCap, gutCap, type EnergyTerm, type FoodKind } from '../../src/sim/energy';
import { isCarried, V } from '../../src/sim/candidates';
import { paramsOf, type Params } from '../../src/sim/params';
import { isTreeId, ix } from '../../src/sim/state';
import { nurseTap, type NurseEvent } from '../../src/sim/execution';
import type { Chimp, World } from '../../src/types';

const DAY = 5760;
export const TERMS: EnergyTerm[] = ['rest', 'activity', 'wild', 'walk', 'climb', 'carry', 'pregnancy', 'growth', 'milk', 'digestion'];
// stage E1c: unweaned infants by year of age, and their mothers by the same ages
export const BINS = ['0–0.5 y', '0.5–1 y', '1–2 y', '2–3 y', '3–4 y', '4–5 y', '≥ 5 y'] as const;
const MID: Record<string, number> = { '0–0.5 y': 0.25, '0.5–1 y': 0.75, '1–2 y': 1.5, '2–3 y': 2.5, '3–4 y': 3.5, '4–5 y': 4.5, '≥ 5 y': 5.5 };
const binOf = (age: number) => age < 0.5 ? BINS[0] : age < 1 ? BINS[1] : BINS[Math.min(6, Math.floor(age) + 1)];
export interface Inf { ticks: number; dayTicks: number; milkDay: number; milkNight: number; kin: number; growth: number; out: number; nurseDay: number; eatDay: number; res: number; kg: number; mothers: number; motherRes: number; motherMilkCost: number;
  /** Stage E1f: daylight ticks in the nurse act; nurse bouts started by day; mothers' daily balance (Δ reserves, kcal and ÷ store) and mother-days. */
  actDay: number; bouts: number; mBal: number; mBalRel: number; mDays: number }
const blankInf = (): Inf => ({ ticks: 0, dayTicks: 0, milkDay: 0, milkNight: 0, kin: 0, growth: 0, out: 0, nurseDay: 0, eatDay: 0, res: 0, kg: 0, mothers: 0, motherRes: 0, motherMilkCost: 0, actDay: 0, bouts: 0, mBal: 0, mBalRel: 0, mDays: 0 });
/** Stage E1f: juveniles' (weaned, under 12 y) mass at the window ends, by sex. */
export interface Juv { seed: number; id: number; sex: string; age0: number; kg0: number; kg1: number; days: number }
/** Stage E1n: the weaning-decision readouts by infant age (see energy-diagnose.ts's header). */
export interface Wean { dayStarts: number; nightActStarts: number; refRoll: number; refMother: number; endMother: number; nightBouts: number; dec: number; nurseTop: number; nurseChosen: number; ownChosen: number;
  margins: number[]; hunger: number; fill: number; gland: number; dryDec: number; own: number; mHungerDec: number; ownAbove: number; mStarts: number; mRes: number; mHunger: number; mFill: number; mFeeding: number; storeFull: number; storeTicks: number }
const blankWean = (): Wean => ({ dayStarts: 0, nightActStarts: 0, refRoll: 0, refMother: 0, endMother: 0, nightBouts: 0, dec: 0, nurseTop: 0, nurseChosen: 0, ownChosen: 0, margins: [], hunger: 0, fill: 0, gland: 0, dryDec: 0, own: 0, mHungerDec: 0, ownAbove: 0,
  mStarts: 0, mRes: 0, mHunger: 0, mFill: 0, mFeeding: 0, storeFull: 0, storeTicks: 0 });
/** Stage E1o: what an older infant drinks (see energy-diagnose.ts's header and docs/staging/e1o-prereg.md §1.2), by infant age. */
export interface E1o { ownDmIn: number; ownDmOut: number; capPass: number; mCrown: number; mcEat: number; mcNurse: number; mcCarried: number; mcH: number; mcFill: number; mcAct: Record<string, number>; nightTicks: number; nest: number; elig: number; drink: number; sat: number; satN: number; glandLim: number; asleep: number; drinkAsleep: number; fruitRate: number; nH: number; nRes: number; nFillMilk: number; nFillSolid: number; nPhi: number; nPhiN: number;
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
/**
 * Stage E1p (docs/staging/e1p-prereg.md §1.2): growth against the body's state, for unweaned infants with a living mother
 * (by the infant bins) and weaned immatures under 12 y (5–8 and 8–12 y by sex). Per tick: absorbed = Δ(reserves + kcal
 * spent) (exact: the ledger books res += absorbed − out), growth paid (tap), spending other than growth, the potential's
 * cost at f = 1, f = min(1, cond ÷ condGood) as energyTick computes it, condition, reserves ÷ store, the drive's mAvg;
 * per animal-day: the surplus S = absorbed − spending other than growth against growth paid.
 */
export interface E1p { ticks: number; growing: number; abs: number; ng: number; gr: number; pot: number; f: number; fLow: number; cond: number; condMin: number; res: number; resMin: number;
  mAvg: number; mAvgN: number; ngAtM: number; absDay: number; absNight: number; ngDay: number; ngNight: number; grDay: number; grNight: number; dayTicks: number;
  aDays: number; dLtG: number; dLt0: number; gFromS: number; gDays: number; gSum: number; vSum: number; vN: number; drSum: number; rN: number; r0Sum: number; r1Sum: number;
  /** Growing ticks with growth paid below the potential (any rule); velocity of the weighed mass (kg + reserves ÷ TISSUE_KCAL_PER_KG). */ paidLow: number; wvSum: number }
const blankE1p = (): E1p => ({ ticks: 0, growing: 0, abs: 0, ng: 0, gr: 0, pot: 0, f: 0, fLow: 0, cond: 0, condMin: Infinity, res: 0, resMin: Infinity, mAvg: 0, mAvgN: 0, ngAtM: 0,
  absDay: 0, absNight: 0, ngDay: 0, ngNight: 0, grDay: 0, grNight: 0, dayTicks: 0, aDays: 0, dLtG: 0, dLt0: 0, gFromS: 0, gDays: 0, gSum: 0, vSum: 0, vN: 0, drSum: 0, rN: 0, r0Sum: 0, r1Sum: 0, paidLow: 0, wvSum: 0 });
/** Stage E1p readout constant (not a sim input): the registry note of ledgerReserveKcalPerKg, the usable store is about 30% of body mass at about 4,300 kcal/kg of mixed fat and lean tissue, so a scale weighs reserves ÷ 4,300 kg on top of the ledger's mass. */
const TISSUE_KCAL_PER_KG = 4300;
const juvBin = (c: Chimp) => `juvenile ${c.age < 8 ? '5–8' : '8–12'} y ${c.sex === 'female' ? 'F' : 'M'}`;
/** An own-food option of an infant: feeding or foraging, a travel to a tree, begging. */
const ownFood = (a: string, t: number) => a === 'forage' || a === 'beg' || (a === 'travel' && isTreeId(t));
/** Per infant over the window: age, mass and reserves (÷ store) at the start and end, and its mother's mean reserves. */
export interface Dyad { seed: number; id: number; age0: number; kg0: number; kg1: number; res0: number; res1: number; days: number; mRes: number; mN: number; milk: number }
export const CLASSES = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'lact: infant < 0.5 y', 'lact: infant 0.5–2 y', 'lact: infant ≥ 2 y',
  'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as const;
export type Cls = typeof CLASSES[number];

export interface Acc { ticks: number; dayTicks: number; forage: number; eating: number; fruit: number; kin: number; milkIn: number; out: Record<EnergyTerm, number>; gut: number; hunger: number; res: number; cond: number; ids: Set<number>; walked: number;
  /** Stage E1b: formula kcal and dry matter eaten, kcal passed out, foregut and hindgut fill, daylight ticks with a full hindgut or foregut. */
  fin: number; dmIn: number; fec: number; fore: number; hind: number; hindFull: number; foreFull: number;
  /** Stage E1h: Σ body mass^0.75 over ticks (T-ENE-8 divides expenditure by it); food eaten at the field formula's kcal/min (the field method of T-ENE-1). */
  m75: number; fm: number }
const blank = (): Acc => ({ ticks: 0, dayTicks: 0, forage: 0, eating: 0, fruit: 0, kin: 0, milkIn: 0, out: Object.fromEntries(TERMS.map(t => [t, 0])) as Record<EnergyTerm, number>, gut: 0, hunger: 0, res: 0, cond: 0, ids: new Set(), walked: 0,
  fin: 0, dmIn: 0, fec: 0, fore: 0, hind: 0, hindFull: 0, foreFull: 0, m75: 0, fm: 0 });
// stage E1k: per-class daily sums over the window (summed over seeds), so any part of the window can be read later:
// ticks, daylight ticks, eating ticks, kcal eaten (milk included), kcal passed out, kcal spent, dry matter eaten,
// daylight hunger, daylight ticks with the foregut ≥ 95% full
export interface Day { ticks: number; dayTicks: number; eating: number; kin: number; fec: number; out: number; dm: number; hunger: number; foreFull: number }

/** The accumulators the report reads, summed over animals and ticks (one seed in e-bench; every seed in energy-diagnose.ts). */
export interface EnergyAcc {
  acc: Record<Cls, Acc>; inf: Record<string, Inf>; wean: Record<string, Wean>; e1o: Record<string, E1o>; e1p: Record<string, E1p>;
  /** Stage E1p: daily mean reserves ÷ store by group (sums and counts per day). */
  e1pTraj: Record<string, { s: number[]; n: number[] }>;
  /** Reserve trajectories, per seed in measuring order: daily mean reserves ÷ usable reserve by class (the report averages them over seeds). */
  trajSeeds: Record<string, number[]>[];
  daily: Record<string, Day[]>;
  juvs: Juv[]; dyads: Dyad[];
  deaths: Record<string, number>; deathsByClass: Record<string, number>;
  births: number; livingStart: number; livingEnd: number;
  /** Seeds measured into this accumulator, in order. */
  seeds: number[];
}
export const newEnergyAcc = (): EnergyAcc => ({
  acc: Object.fromEntries(CLASSES.map(c => [c, blank()])) as Record<Cls, Acc>, inf: Object.fromEntries(BINS.map(b => [b, blankInf()])), wean: Object.fromEntries(BINS.map(b => [b, blankWean()])),
  e1o: Object.fromEntries(BINS.map(b => [b, blankE1o()])), e1p: {}, e1pTraj: {}, trajSeeds: [], daily: {}, juvs: [], dyads: [], deaths: {}, deathsByClass: {}, births: 0, livingStart: 0, livingEnd: 0, seeds: [],
});

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

/** What one seed's measurement carries from tick to tick (energy-diagnose.ts's per-seed locals). */
export interface EnergySeedState {
  seed: number; days: number; on: boolean; fieldPerKcal: Record<FoodKind, number>;
  /** The measured tick's light (read by the taps during tickWorld) and its window day (stage E1k). */
  light: boolean; curDay: number;
  births0: number; dead0: Set<number>; young: Map<number, number>;
  prevInfIn: Map<number, number>; cls: Map<number, Cls[]>; prevIn: Map<number, number>; prevPos: Map<number, [number, number]>; lastCls: Map<number, string>;
  /** Stage E1b: fin, dmIn, fec at the last tick. */
  prevDig: Map<number, [number, number, number]>;
  binNow: Map<number, string>; motherOf: Map<number, Chimp>; milkOf: Map<number, number>; milkTick: Map<number, number>;
  /** Stage E1p: growth paid this tick (tap), the books at the last tick (res + out), each animal's day so far (S, growth), and its first sighting in the window. */
  growNow: Map<number, number>; booksPrev: Map<number, [number, number]>; pDay: Map<number, { S: number; g: number; grp: string }>;
  pStart: Map<number, { grp: string; kg0: number; age0: number; r0: number; m0: number }>;
  /** Stage E1o: the shadow milk pool, the foregut and gland at the last tick, light and eating at the last tick, the night records. */
  shadowMilk: Map<number, number>; prevDm: Map<number, number>; prevDmIn: Map<number, number>; prevDmIn2: Map<number, number>; glandPrev: Map<number, number>;
  lightPrev: Map<number, boolean>; ateNow: Map<number, boolean>;
  nightRec: Map<number, { out0: number; gut: number; res: number; gland: number; milk: number; synth: number }>;
  lastVer: Map<number, number>; nightPrev: Map<number, boolean>;
  start: Map<number, { age0: number; kg0: number; res0: number; mRes: number; mN: number }>;
  juv0: Map<number, { age0: number; kg0: number }>;
  prevAct: Map<number, string>; resAtDay: Map<number, number>;
}

const fieldPerKcalOf = (P: Params): Record<FoodKind, number> => ({ drupe: P.ledgerFruitKcalPerMin / plantKcalPerMin(P, 'drupe'), fig: P.ledgerFigKcalPerMin / plantKcalPerMin(P, 'fig'),
  fallback: P.ledgerFallbackKcalPerMin / plantKcalPerMin(P, 'fallback'), meat: 1, milk: 0 });

/**
 * Starts measuring a world at the end of its burn-in (after any --term-births scenario): the seed's state, with the
 * living counted into `a`. Install the taps (energyTapsOn) before the first measured tick.
 */
export function energyStart(w: World, a: EnergyAcc, seed: number, days: number): EnergySeedState {
  const P = paramsOf(w), on = P.energyLedger === 1;
  // growth, gestation and milk are charged per ecological tick at their natural rate: at ageRate > 1 (life course) the
  // ledger undercounts them by that factor, so its budgets would be wrong (docs/simulation.md, energy ledger)
  if (on && w.ageRate > 1) throw new Error(`energy-diagnose: the energy ledger is not valid at ageRate ${w.ageRate} (> 1); run at natural aging`);
  a.seeds.push(seed);
  a.trajSeeds.push({});
  a.livingStart += w.chimps.filter(c => c.alive).length;
  const st: EnergySeedState = {
    seed, days, on, fieldPerKcal: fieldPerKcalOf(P), light: true, curDay: 0,
    births0: w.stats.births, dead0: new Set(w.chimps.filter(c => !c.alive).map(c => c.id)), young: youngest(w),
    prevInfIn: new Map(), cls: new Map(), prevIn: new Map(), prevPos: new Map(), lastCls: new Map(), prevDig: new Map(),
    binNow: new Map(), motherOf: new Map(), milkOf: new Map(), milkTick: new Map(),
    growNow: new Map(), booksPrev: new Map(), pDay: new Map(), pStart: new Map(),
    shadowMilk: new Map(), prevDm: new Map(), prevDmIn: new Map(), prevDmIn2: new Map(), glandPrev: new Map(), lightPrev: new Map(), ateNow: new Map(), nightRec: new Map(),
    lastVer: new Map(), nightPrev: new Map(), start: new Map(), juv0: new Map(), prevAct: new Map(), resAtDay: new Map(),
  };
  refreshBins(st, w);
  for (const id of st.binNow.keys()) { const c = w.chimps.find(k => k.id === id)!, L = ix(c).en; st.start.set(id, { age0: c.age, kg0: massOf(c, P), res0: L ? L.res / reserveCap(c, P) : 0, mRes: 0, mN: 0 }); }
  for (const c of w.chimps) if (c.alive && ix(c).weaned && c.age < 12) st.juv0.set(c.id, { age0: c.age, kg0: massOf(c, P) });
  return st;
}

const unweaned = (w: World, c: Chimp) => c.alive && !ix(c).weaned && c.age < 6 && w.chimps.some(m => m.id === c.motherId && m.alive);
function refreshBins(st: EnergySeedState, w: World): void { st.binNow.clear(); st.motherOf.clear(); for (const c of w.chimps) if (unweaned(w, c)) { st.binNow.set(c.id, binOf(c.age)); st.motherOf.set(c.id, w.chimps.find(m => m.id === c.motherId)!); } }
const dayOf = (st: EnergySeedState, a: EnergyAcc, n: string): Day => ((a.daily[n] ??= [])[st.curDay] ??= { ticks: 0, dayTicks: 0, eating: 0, kin: 0, fec: 0, out: 0, dm: 0, hunger: 0, foreFull: 0 });

// stage E1o: helpers (read-only). Foregut fill as setHunger reads it; the satiation term (E1i's reserve weighting when on);
// φ = hunger ÷ the satiation term (the drive before satiation, clamped at 1); energy still in the gut; the foregut's
// dry matter split into milk and solids by a shadow pool (milk's dry matter enters it, and it empties in the same
// proportion as the foregut each tick)
const fillOf = (c: Chimp, P: Params): number => { const L = ix(c).en; if (!L) return NaN; if (L.dm !== undefined) { const cap = digestaCaps(c, P)[0]; return cap > 0 ? Math.min(1, Math.max(0, L.dm / cap)) : NaN; } return Math.min(1, Math.max(0, L.gut / gutCap(c, P))); };
const phiOf = (c: Chimp, P: Params): number => { const L = ix(c).en!, f = fillOf(c, P), r = P.ledgerSatiationReserve === 1 ? Math.max(0, 1 + L.res / reserveCap(c, P)) : 1, s = 1 - r * f * f; return s > 1e-6 ? Math.min(1, c.hunger / s) : NaN; };
const gutE = (c: Chimp, P: Params): number => { const L = ix(c).en!; return L.gut + (L.fib !== undefined ? P.digestaFermentKcalPerG * P.digestaNdfDigestibility * (L.fib + (L.hind ?? 0)) : 0); };
const milkSplit = (st: EnergySeedState, c: Chimp, P: Params): [number, number] => { const L = ix(c).en; if (!L || L.dm === undefined) return [NaN, NaN]; const cap = digestaCaps(c, P)[0], sm = Math.min(st.shadowMilk.get(c.id) ?? 0, L.dm); return [sm / cap, (L.dm - sm) / cap]; };
const storeFull = (m: Chimp, P: Params) => P.ledgerMilkYieldCoef / 24 * Math.pow(massOf(m, P), P.ledgerRmrExp) * P.ledgerMilkStoreH;

/** Energy terms of the measured world's animals, as they are booked during tickWorld. */
function tapEnergy(st: EnergySeedState, a: EnergyAcc, P: Params, c: Chimp, term: EnergyTerm | 'eaten' | 'suckled', kcal: number, kind?: FoodKind): void {
  const acc = a.acc, inf = a.inf;
  if (term === 'eaten') { const k = st.cls.get(c.id); if (k && kind) for (const n of k) acc[n].fm += kcal * st.fieldPerKcal[kind]; return; }
  if (term === 'suckled') {
    st.milkOf.set(c.id, (st.milkOf.get(c.id) ?? 0) + kcal); st.milkTick.set(c.id, (st.milkTick.get(c.id) ?? 0) + kcal);
    const k = st.cls.get(c.id); if (k) for (const n of k) acc[n].milkIn += kcal;
    const b = st.binNow.get(c.id); if (b) { if (st.light) inf[b].milkDay += kcal; else inf[b].milkNight += kcal; inf[b].motherMilkCost += kcal / P.ledgerMilkEff; }
    return;
  }
  const k = st.cls.get(c.id); if (k) for (const n of k) { acc[n].out[term] += kcal; dayOf(st, a, n).out += kcal; }
  if (term === 'growth') st.growNow.set(c.id, (st.growNow.get(c.id) ?? 0) + kcal); // stage E1p
  const b = st.binNow.get(c.id);
  if (b) { inf[b].out += kcal; if (term === 'growth') inf[b].growth += kcal; }
}

/** Stage E1n: day nurse-act events (execution.ts nurseTap), binned by the infant's age; the mother's state at accepted starts. */
function tapNurse(st: EnergySeedState, a: EnergyAcc, P: Params, c: Chimp, m: Chimp, ev: NurseEvent): void {
  const b = st.binNow.get(c.id); if (!b) return;
  const W = a.wean[b];
  if (ev === 'refuse-roll') { W.refRoll++; return; }
  if (ev === 'refuse-mother') { W.refMother++; return; }
  if (ev === 'end-mother') { W.endMother++; return; }
  if (!st.light) { W.nightActStarts++; return; }
  W.dayStarts++;
  const ML = ix(m).en;
  if (ML) { const caps = ML.dm !== undefined ? digestaCaps(m, P) : null; W.mStarts++; W.mRes += ML.res / reserveCap(m, P); W.mHunger += m.hunger; W.mFill += caps ? ML.dm! / caps[0] : ML.gut / gutCap(m, P); if (m.action === 'forage') W.mFeeding++; }
  // stage E1o (D2): the infant's state at an accepted day bout onset
  const IL = ix(c).en, E = a.e1o[b];
  if (IL) {
    E.ons++; E.oRes += IL.res / reserveCap(c, P); E.oH += c.hunger; E.oOwn += ownDrive(c, P); E.oGland += ML ? ML.milk : 0; E.oB += nurseBoutWorth(c, m, P);
    const ph = phiOf(c, P); if (Number.isFinite(ph)) { E.oPhi += ph; E.oPhiN++; }
    const [fm, fs] = milkSplit(st, c, P); E.oFillMilk += fm; E.oFillSolid += fs;
    if (IL.res >= 0 && fillOf(c, P) >= 0.5) E.oNoDef++;
  }
}

/** Connects the two src/sim taps to this seed's measurement (again after a checkpoint is restored: functions are not saved). */
export function energyTapsOn(st: EnergySeedState, a: EnergyAcc, w: World): void {
  energyTap.fn = (c, term, kcal, kind) => tapEnergy(st, a, paramsOf(w), c, term as EnergyTerm | 'eaten' | 'suckled', kcal, kind);
  nurseTap.fn = (c, m, ev) => tapNurse(st, a, paramsOf(w), c, m, ev);
}
/** Disconnects the taps (while another world is ticked, and at the end). */
export function energyTapsOff(): void { energyTap.fn = null; nurseTap.fn = null; }

/** Before tickWorld of measured tick `i` (0 at the end of the burn-in): the light and window day the taps file under. */
export function energyBefore(st: EnergySeedState, w: World, i: number): void {
  st.light = w.environment.daylight > 0.1;
  st.curDay = Math.floor(i / DAY);
}

/** After tickWorld of measured tick `i`. */
export function energyAfter(st: EnergySeedState, ea: EnergyAcc, w: World, i: number): void {
  const P = paramsOf(w), on = st.on, acc = ea.acc, inf = ea.inf, wean = ea.wean, e1o = ea.e1o, e1p = ea.e1p, e1pTraj = ea.e1pTraj;
  const seed = st.seed, cls = st.cls, prevIn = st.prevIn, prevPos = st.prevPos, prevDig = st.prevDig, milkTick = st.milkTick, binNow = st.binNow;
  st.light = w.environment.daylight > 0.1;
  const light = st.light;
  if (i % 240 === 0) {
    st.young = youngest(w);
    for (const c of w.chimps) if (c.alive) { const k = classesOf(c, st.young); cls.set(c.id, k); st.lastCls.set(c.id, k[0] ?? 'adolescent'); }
    refreshBins(st, w);
  }
  const young = st.young;
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
    st.ateNow.set(c.id, eating); // stage E1o: mothers' eating, read in the infant loop below
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
      const dd = dayOf(st, ea, n); dd.ticks++; if (eating) dd.eating++; if (L) dd.kin += din; dd.fec += dfec; dd.dm += ddm;
      if (light) { dd.dayTicks++; dd.hunger += c.hunger; if (caps && L!.dm! >= 0.95 * caps[0]) dd.foreFull++; }
    }
  }
  const flowTick = P.ledgerMilkKcalPerMin * 15 / 60;
  for (const [id, b] of binNow) {
    const c = w.chimps.find(k => k.id === id)!;
    if (!c.alive) continue;
    if (!st.start.has(id) && ix(c).en) { const L0 = ix(c).en!; st.start.set(id, { age0: c.age, kg0: massOf(c, P), res0: L0.res / reserveCap(c, P), mRes: 0, mN: 0 }); }
    const B = inf[b], L = ix(c).en, m = st.motherOf.get(id), milk = milkTick.get(id) ?? 0;
    // stage E1f: nipple contact by day (the nurse act, the milk-ejection wait included) and bouts started by day
    const was = st.prevAct.get(id); st.prevAct.set(id, c.action);
    // stage E1n: night bouts (a night tick with milk after one without), the gland store, the infant's daylight decisions
    const W = wean[b], ML = m && m.alive ? ix(m).en : undefined;
    if (!light) { const now = milk > 0; if (now && !st.nightPrev.get(id)) W.nightBouts++; st.nightPrev.set(id, now); } else st.nightPrev.set(id, false);
    if (ML && m) { W.storeTicks++; if (ML.milk >= storeFull(m, P) * (1 - 1e-6)) W.storeFull++; }
    const ver = c.decisionVersion, lv = st.lastVer.get(id); st.lastVer.set(id, ver);
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
    const din = L ? L.in - (st.prevInfIn.get(id) ?? L.in) : 0;
    if (L) { B.res += L.res / reserveCap(c, P); B.kin += din; st.prevInfIn.set(id, L.in); }
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
      const dmInBefore = st.prevDmIn.get(id); if (dmInBefore !== undefined) st.prevDmIn2.set(id, dmInBefore);
      if (L && L.dm !== undefined) {
        const dm0 = st.prevDm.get(id), in0 = st.prevDmIn.get(id);
        if (dm0 !== undefined && in0 !== undefined) {
          const added = L.dmIn! - in0, k = dm0 > 1e-9 ? Math.min(1, Math.max(0, (L.dm - added) / dm0)) : 0;
          st.shadowMilk.set(id, Math.min(L.dm, (st.shadowMilk.get(id) ?? 0) * k + milk * P.digestaMilkDmGPerKcal));
        } else st.shadowMilk.set(id, 0);
        st.prevDm.set(id, L.dm); st.prevDmIn.set(id, L.dmIn!);
      }
      const MLe = m && m.alive ? ix(m).en : undefined, g0 = st.glandPrev.get(id), syn = MLe && g0 !== undefined ? MLe.milk - g0 + milk : 0;
      if (MLe) st.glandPrev.set(id, MLe.milk);
      const wasLight = st.lightPrev.get(id); st.lightPrev.set(id, light);
      if (light) {
        E.daySynth += syn; E.dayMilk += milk; E.synthTicks++;
        const rec = st.nightRec.get(id);
        if (rec && L) {
          const D = e1o[b]; D.nights++; D.nSpend += L.out - rec.out0; D.nGutDusk += rec.gut; D.nMilk += rec.milk; D.nResDusk += rec.res; D.nResDawn += L.res / reserveCap(c, P);
          D.nGlandDusk += rec.gland; D.nGlandDawn += MLe ? MLe.milk : 0; D.nSynth += rec.synth;
        }
        st.nightRec.delete(id);
        if (L) {
          E.dayTicks++;
          if (m && isCarried(c, m)) E.carried++;
          if (m && m.action === 'forage') E.mFor++;
          const ate = din - milk > 1e-9;
          if (ate) { E.eat++; if (fillOf(c, P) >= 0.95) E.eatFull++; }
          // D5 (added after the diagnosis run, disclosed): while the mother feeds in a crown, what the infant does
          // D6 (added with D5's results, disclosed): own-food dry matter eaten while the mother is in a crown and outside,
          // and what the foregut could pass in those ticks if kept full (capacity × the share it empties per tick)
          const dIn = st.prevDmIn2.get(id), ownDm = dIn !== undefined && L.dmIn !== undefined ? Math.max(0, L.dmIn - dIn - milk * P.digestaMilkDmGPerKcal) : 0;
          const inCrown = !!m && m.action === 'forage' && isTreeId(m.targetId) && ix(m).phase === 2;
          if (inCrown) { E.ownDmIn += ownDm; E.capPass += digestaCaps(c, P)[0] * (1 - Math.exp(-15 / 3600 / P.ledgerGutEmptyH)); } else E.ownDmOut += ownDm;
          if (m && m.action === 'forage' && isTreeId(m.targetId) && ix(m).phase === 2) {
            E.mCrown++; if (ate) E.mcEat++; if (c.action === 'nurse') E.mcNurse++; if (isCarried(c, m)) E.mcCarried++;
            E.mcH += c.hunger; E.mcFill += fillOf(c, P);
            const a = ate ? 'eating' : c.action === 'forage' ? 'forage (not eating)' : c.action; E.mcAct[a] = (E.mcAct[a] ?? 0) + 1;
          }
          E.size += intakeSize(c, P);
          // the infant's full intake rate on ripe fruit at its size and skill (kcal/h; energy.ts feedRate's fruit term), against the suckling rate
          E.fruitRate += P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : c.age < 5 ? P.fruitIntakeYoungFactor : 1) * fruitKcalPerUnit(P, false);
        }
      } else {
        if (wasLight === true && L) st.nightRec.set(id, { out0: L.out, gut: gutE(c, P), res: L.res / reserveCap(c, P), gland: MLe ? MLe.milk : 0, milk, synth: syn });
        else { const rec = st.nightRec.get(id); if (rec) { rec.milk += milk; rec.synth += syn; } }
        E.nightTicks++;
        if (L && m && c.action === 'nest' && ix(c).v === V.MOTHER && m.action === 'nest') {
          E.nest++;
          if (c.hunger >= 0.08) E.elig++;
          const asl = ix(c).asl === 1; if (asl) E.asleep++;
          if (milk > 0) { E.drink++; if (asl) E.drinkAsleep++; if (milk < flowTick * (1 - 1e-6) && fillOf(c, P) < 0.99) E.glandLim++; }
          const ph = phiOf(c, P); if (Number.isFinite(ph)) { E.nPhi += ph; E.nPhiN++; if (ph >= 0.999) E.sat++; E.satN++; }
          E.nH += c.hunger; E.nRes += L.res / reserveCap(c, P);
          const [fm, fs] = milkSplit(st, c, P); E.nFillMilk += fm; E.nFillSolid += fs;
        }
      }
      const ya = m ? young.get(m.id) : undefined, MLm = m && m.alive ? ix(m).en : undefined;
      if (m && MLm && ya !== undefined && Math.abs(ya - c.age) < 0.01) {
        E.mTicks++; E.mRes += MLm.res / reserveCap(m, P); if (st.ateNow.get(m.id)) E.mEat++;
        if (light) { E.mDay++; E.mFill += fillOf(m, P); E.mHunger += m.hunger; }
      }
    }
    if (m && m.alive && ix(m).en) { const r = ix(m).en!.res / reserveCap(m, P); B.mothers++; B.motherRes += r; const s0 = st.start.get(id); if (s0) { s0.mRes += r; s0.mN++; } }
  }
  milkTick.clear();
  // stage E1p: growth against the body's state (docs/staging/e1p-prereg.md §1.2), every tick, read-only
  if (on) for (const c of w.chimps) {
    if (!c.alive) continue;
    const x = ix(c), L = x.en; if (!L) continue;
    const b = binNow.get(c.id), grp = b ?? (x.weaned && c.age >= 5 && c.age < 12 ? juvBin(c) : undefined);
    const prev = st.booksPrev.get(c.id), g = st.growNow.get(c.id) ?? 0;
    st.booksPrev.set(c.id, [L.res, L.out]);
    if (!grp || prev === undefined) continue;
    const E = (e1p[grp] ??= blankE1p()), cap = reserveCap(c, P), dOut = L.out - prev[1], abs = L.res - prev[0] + dOut, ng = dOut - g;
    const adult = c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg, kg = L.kg ?? massOf(c, P), growing = kg < adult - 1e-9;
    const pot = growing ? growthPotential(c, P) * 1000 * P.ledgerGrowthKcalPerG / 365.25 / DAY : 0;
    const q = x.cond / P.condGood, fr = q >= 1 ? 1 : q > 0 ? q : 0, r = L.res / cap;
    E.ticks++; E.abs += abs; E.ng += ng; E.gr += g; E.pot += pot;
    if (growing) { E.growing++; E.f += fr; if (fr < 1) E.fLow++; if (g < pot * (1 - 1e-9)) E.paidLow++; }
    E.cond += x.cond; if (x.cond < E.condMin) E.condMin = x.cond; E.res += r; if (r < E.resMin) E.resMin = r;
    if (L.mAvg !== undefined) { E.mAvg += L.mAvg; E.mAvgN++; E.ngAtM += ng * 240; } // kcal/h (240 ticks an hour)
    if (light) { E.dayTicks++; E.absDay += abs; E.ngDay += ng; E.grDay += g; } else { E.absNight += abs; E.ngNight += ng; E.grNight += g; }
    const pd = st.pDay.get(c.id) ?? { S: 0, g: 0, grp }; pd.S += abs - ng; pd.g += g; pd.grp = grp; st.pDay.set(c.id, pd);
    if (!st.pStart.has(c.id)) st.pStart.set(c.id, { grp, kg0: kg, age0: c.age, r0: r, m0: kg + L.res / TISSUE_KCAL_PER_KG });
    if (i % DAY === DAY / 2) { const T = (e1pTraj[grp] ??= { s: [], n: [] }), dd = Math.floor(i / DAY); T.s[dd] = (T.s[dd] ?? 0) + r; T.n[dd] = (T.n[dd] ?? 0) + 1; }
  }
  st.growNow.clear();
  if (on && i % DAY === DAY - 1) {
    for (const pd of st.pDay.values()) {
      const E = e1p[pd.grp]; E.aDays++; if (pd.S < 0) E.dLt0++;
      if (pd.g > 0) { E.gDays++; E.gSum += pd.g; E.gFromS += Math.min(pd.g, Math.max(pd.S, 0)); if (pd.S < pd.g) E.dLtG++; }
    }
    st.pDay.clear();
  }
  // stage E1f: each mother's change of reserves over the day, binned by her youngest unweaned infant's age (T-ENE-5)
  if (on && i % DAY === DAY - 1) {
    const yg = youngest(w);
    for (const m of w.chimps) {
      if (!m.alive || m.sex !== 'female' || !ix(m).en) { st.resAtDay.delete(m.id); continue; }
      const r = ix(m).en!.res, a = yg.get(m.id), prev = st.resAtDay.get(m.id);
      if (a !== undefined && prev !== undefined) { const B = inf[binOf(a)]; B.mBal += r - prev; B.mBalRel += (r - prev) / reserveCap(m, P); B.mDays++; }
      st.resAtDay.set(m.id, r);
    }
  }
  // the reserve trajectory: this seed's daily mean reserves ÷ store by class (energy-diagnose.ts averaged the seeds in
  // place; the report now averages them from the per-seed values with the same arithmetic, in the same order)
  if (on && i % DAY === DAY / 2) for (const n of ['adult male', 'female, other', 'female, lactating', 'juvenile 5–12 y', 'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as Cls[]) {
    let s = 0, m = 0;
    for (const c of w.chimps) if (c.alive && cls.get(c.id)?.includes(n) && ix(c).en) { s += ix(c).en!.res / reserveCap(c, P); m++; }
    (ea.trajSeeds[ea.trajSeeds.length - 1][n] ??= [])[Math.floor(i / DAY)] = m ? s / m : 0;
  }
}

/** The end of a seed's window: velocities, juveniles, dyads, births, the living and deaths (reads the world, never writes it). */
export function energyFinish(st: EnergySeedState, a: EnergyAcc, w: World): void {
  const P = paramsOf(w), e1p = a.e1p, seed = st.seed, days = st.days;
  // stage E1p: velocity (kg per bio-year) and reserve change (÷ store per day) of each tracked animal, in the group it started in
  for (const [id, s0] of st.pStart) {
    const c = w.chimps.find(k => k.id === id)!;
    if (!c.alive) continue; // (the alive check comes first so ix() never creates state on a slimmed dead record)
    const L = ix(c).en;
    if (!L) continue;
    const E = e1p[s0.grp], dy = c.age - s0.age0, kg1 = L.kg ?? massOf(c, P), r1 = L.res / reserveCap(c, P);
    if (dy > 1 / 365.25) { E.vSum += (kg1 - s0.kg0) / dy; E.wvSum += (kg1 + L.res / TISSUE_KCAL_PER_KG - s0.m0) / dy; E.vN++; E.drSum += (r1 - s0.r0) / (dy * 365.25 / Math.max(1e-9, w.ageRate)); E.rN++; E.r0Sum += s0.r0; E.r1Sum += r1; }
  }
  for (const [id, j] of st.juv0) { const c = w.chimps.find(k => k.id === id)!; if (c.alive) a.juvs.push({ seed, id, sex: c.sex, age0: j.age0, kg0: j.kg0, kg1: massOf(c, P), days }); }
  for (const [id, s0] of st.start) {
    const c = w.chimps.find(k => k.id === id)!;
    if (!c.alive) continue;
    const L = ix(c).en;
    const dd = Math.max(1, (c.age - s0.age0) * 365.25 / Math.max(1e-9, w.ageRate)); // days observed (newborns enter late)
    a.dyads.push({ seed, id, age0: s0.age0, kg0: s0.kg0, kg1: massOf(c, P), res0: s0.res0, res1: L ? L.res / reserveCap(c, P) : 0, days: dd, mRes: s0.mN ? s0.mRes / s0.mN : NaN, mN: s0.mN, milk: (st.milkOf.get(id) ?? 0) / dd });
  }
  a.births += w.stats.births - st.births0;
  a.livingEnd += w.chimps.filter(c => c.alive).length;
  for (const c of w.chimps) if (!c.alive && !st.dead0.has(c.id)) {
    const cause = c.causeOfDeath ?? 'unknown'; a.deaths[cause] = (a.deaths[cause] ?? 0) + 1;
    const k = `${st.lastCls.get(c.id) ?? (c.age < 0.5 ? 'infant < 0.5 y' : 'other')}: ${cause}`; a.deathsByClass[k] = (a.deathsByClass[k] ?? 0) + 1;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Pooling and the report
// ---------------------------------------------------------------------------------------------------------------------

/** What the report says about the run (energy-diagnose.ts's settings). */
export interface EnergyMeta { profile: string; seeds: number[]; burnIn: number; days: number; params: Record<string, number>; termBirths: boolean }

/**
 * The reserve trajectories averaged over seeds, as energy-diagnose.ts averaged them in place (a running mean in seed
 * order with the seed's index in the seed list: the same arithmetic in the same order, so the same bits).
 */
function trajOf(ea: EnergyAcc): Record<string, number[]> {
  const traj: Record<string, number[]> = {};
  ea.trajSeeds.forEach((series, j) => {
    const k = ea.seeds.indexOf(ea.seeds[j]);
    for (const [n, v] of Object.entries(series)) for (let d = 0; d < v.length; d++) if (d in v) (traj[n] ??= [])[d] = ((traj[n][d] ?? 0) * k + v[d]) / (k + 1);
  });
  return traj;
}

/** The report energy-diagnose.ts prints (`text`) and writes with --json (`json`), from the accumulators. */
export function energyReport(ea: EnergyAcc, meta: EnergyMeta): { text: string; json: Record<string, unknown> } {
  const out: string[] = [];
  const { acc, inf, wean, e1o, e1p, e1pTraj, dyads, juvs, deaths, deathsByClass, births, livingStart, livingEnd } = ea;
  const { profile, seeds, burnIn, days, params, termBirths } = meta;
  const traj = trajOf(ea);
  const f = (v: number, d = 0) => Number.isFinite(v) ? v.toFixed(d) : '—';
  const rows = CLASSES.map(n => {
    const a = acc[n], d = a.ticks / DAY; // individual-days
    const out = Object.fromEntries(TERMS.map(t => [t, a.out[t] / d])) as Record<EnergyTerm, number>;
    return { cls: n, individuals: a.ids.size, days: d, kcalIn: a.kin / d, milkIn: a.milkIn / d, kcalOut: TERMS.reduce((s, t) => s + out[t], 0), out, forageMin: a.forage / d / 4, eatingMin: a.eating / d / 4,
      fruitShare: a.fruit / Math.max(1, a.eating), groundKm: a.walked / d / 1000, gutFill: a.gut / a.ticks, hungerDay: a.hunger / Math.max(1, a.dayTicks), reserves: a.res / a.ticks, cond: a.cond / a.ticks,
      m75: a.m75 / Math.max(1, a.ticks), fieldMethodIn: a.fm / d, formulaIn: a.fin / d, dmIn: a.dmIn / d, fecal: a.fec / d, foreFill: a.fore / a.ticks, hindFill: a.hind / a.ticks, hindFullDay: a.hindFull / Math.max(1, a.dayTicks), foreFullDay: a.foreFull / Math.max(1, a.dayTicks) };
  });
  out.push(`energy diagnosis: ${profile}, seeds ${seeds.join(', ')}, burn-in ${burnIn} d, ${days} d, params ${JSON.stringify(params)}`);
  out.push('| class | n | kcal in | (milk in) | kcal out | rest | activity | wild | walk | climb | carry | preg | growth | milk | digestion | forage min | eating min | fruit % | ground km | gut fill | day hunger | reserves ÷ store | cond |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) if (r.days > 0) out.push(`| ${r.cls} | ${r.individuals} | ${f(r.kcalIn)} | ${f(r.milkIn)} | ${f(r.kcalOut)} | ${TERMS.map(t => f(r.out[t])).join(' | ')} | ${f(r.forageMin)} | ${f(r.eatingMin)} | ${f(100 * r.fruitShare)} | ${f(r.groundKm, 2)} | ${f(r.gutFill, 2)} | ${f(r.hungerDay, 2)} | ${f(r.reserves, 3)} | ${f(r.cond, 2)} |`);
  if (rows.some(r => r.formulaIn > 0)) {
    out.push('\nstage E1b digesta (formula kcal and dry matter eaten are the field\'s intake measures; kcal in above counts fibre at its fermentation yield)');
    out.push('| class | formula kcal eaten | dry matter g eaten | kcal passed out | foregut fill | hindgut fill | daylight with a full foregut | daylight with a full hindgut |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows) if (r.days > 0) out.push(`| ${r.cls} | ${f(r.formulaIn)} | ${f(r.dmIn)} | ${f(r.fecal)} | ${f(r.foreFill, 2)} | ${f(r.hindFill, 2)} | ${f(r.foreFullDay, 2)} | ${f(r.hindFullDay, 2)} |`);
  }
  out.push(`births ${births}, deaths ${Object.values(deaths).reduce((a, b) => a + b, 0)} ${JSON.stringify(deaths)}; living ${livingStart} → ${livingEnd} (summed over seeds)`);
  out.push(`deaths by class: ${JSON.stringify(deathsByClass)}`);
  // stage E1h: the staged energy rows, each on the class it was measured in (docs/staging/e-targets.patch.json, re-scoped
  // 1 October 2026 after the field audit). T-ENE-1's ledger truth is the energy eaten in the model's own food units: with
  // ledgerFoodEnergyFix 1 the sugar-based values, comparable with the audit's band; with it 0 the field formula's.
  {
    const by = (n: Cls) => rows.find(r => r.cls === n)!, lac = by('female, lactating'), dig = rows.some(r => r.formulaIn > 0);
    const band = (v: number, lo: number, hi: number) => !Number.isFinite(v) || !(v > 0) ? '—' : v < lo ? 'below' : v > hi ? 'above' : 'in';
    const sugar = (params as Record<string, number>).ledgerFoodEnergyFix === 1;
    const nonRep = (['adult male', 'female, other'] as Cls[]).map(by).filter(r => r.days > 0);
    const e8 = nonRep.length ? nonRep.reduce((s, r) => s + r.kcalOut / r.m75 * r.days, 0) / nonRep.reduce((s, r) => s + r.days, 0) : NaN;
    out.push('\nstage E1h: staged energy rows on the class the field measured (simulation truth)');
    out.push('| row | class | model | band | verdict |');
    out.push('| --- | --- | --- | --- | --- |');
    if (dig) out.push(`| T-ENE-1 ledger truth (energy eaten, ${sugar ? 'sugar-based' : 'field-formula'} kcal/d) | lactating females | ${f(lac.formulaIn)} | 1,810–2,070 (comparison band, contested row) | ${sugar ? band(lac.formulaIn, 1810, 2070) : 'not comparable (field-formula units)'} |`);
    out.push(`| T-ENE-1 absorbed (kcal in − passed out, /d) | lactating females | ${f(lac.kcalIn - lac.fecal)} | — | — |`);
    out.push(`| T-ENE-1 field method (food eaten at the field formula's kcal/min) | lactating females | ${f(lac.fieldMethodIn)} | 1,900–3,100 (field band) | ${band(lac.fieldMethodIn, 1900, 3100)} |`);
    out.push(`| T-ENE-2 eating min/d | lactating females | ${f(lac.eatingMin)} | 250–370 | ${band(lac.eatingMin, 250, 370)} |`);
    if (dig) out.push(`| T-ENE-3 dry matter g/d | lactating females | ${f(lac.dmIn)} | 650–1,100 | ${band(lac.dmIn, 650, 1100)} |`);
    out.push(`| T-ENE-8 kcal spent ÷ M^0.75 | adult males and other females | ${f(e8, 1)} | 85–130 | ${band(e8, 85, 130)} |`);
  }
  out.push('\nunweaned infants by year of age (kcal per infant-day; shares of daylight ticks; growth kg per year from mass at the window ends)');
  out.push('| age | infant-days | milk day | milk night | own food | kcal out | growth kcal | daytime nursing % | daytime eating % | mass kg | reserves ÷ store | Δ reserves over window | growth kg/y | mother reserves ÷ store | mother milk cost |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const weanPts: [number, number][] = [];
  for (const b of BINS) {
    const B = inf[b], d = B.ticks / DAY; if (!d) continue;
    const ds = dyads.filter(x => binOf(x.age0) === b), dres = ds.length ? ds.reduce((s, x) => s + x.res1 - x.res0, 0) / ds.length : NaN, gv = ds.length ? ds.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / ds.length : NaN;
    const milk = B.milkDay + B.milkNight;
    out.push(`| ${b} | ${f(d)} | ${f(B.milkDay / d)} | ${f(B.milkNight / d)} | ${f((B.kin - milk) / d)} | ${f(B.out / d)} | ${f(B.growth / d)} | ${f(100 * B.nurseDay / Math.max(1, B.dayTicks), 1)} | ${f(100 * B.eatDay / Math.max(1, B.dayTicks), 1)} | ${f(B.kg / B.ticks, 1)} | ${f(B.res / B.ticks, 3)} | ${f(dres, 3)} (n ${ds.length}) | ${f(gv, 2)} | ${f(B.motherRes / Math.max(1, B.mothers), 3)} | ${f(B.motherMilkCost / d)} |`);
  }
  out.push('\nstage E1f: nursing, intake and mothers\' balance by infant age (daylight shares; bouts per daylight hour; own-food kcal per eating minute)');
  out.push('| age | nurse act % of daylight | bouts per daylight h | mean bout min | milk share of intake | own food kcal per eating min | mothers\' balance kcal/d | mothers\' balance ÷ store per d | mother-days |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const b of BINS) {
    const B = inf[b], d = B.ticks / DAY; if (!d && !B.mDays) continue;
    const milk = B.milkDay + B.milkNight, own = B.kin - milk, share = B.kin > 0 ? milk / B.kin : NaN, dayH = B.dayTicks / 240;
    if (b !== '0–0.5 y' && b !== '0.5–1 y' && Number.isFinite(share)) weanPts.push([MID[b], share]);
    out.push(`| ${b} | ${f(100 * B.actDay / Math.max(1, B.dayTicks), 1)} | ${f(dayH ? B.bouts / dayH : NaN, 2)} | ${f(B.bouts ? B.actDay / 4 / B.bouts : NaN, 1)} | ${f(share, 2)} | ${f(B.eatDay ? own / (B.eatDay / 4) : NaN, 2)} | ${f(B.mDays ? B.mBal / B.mDays : NaN)} | ${f(B.mDays ? B.mBalRel / B.mDays : NaN, 4)} | ${B.mDays} |`);
  }
  if (weanPts.length >= 2) {
    const n = weanPts.length, mx = weanPts.reduce((s, p) => s + p[0], 0) / n, my = weanPts.reduce((s, p) => s + p[1], 0) / n;
    const k = weanPts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / weanPts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
    out.push(`milk share of intake against age (bins ≥ 1 y): slope ${f(k, 3)} per y; reaches zero at ${f(mx - my / k, 1)} y (indicative nutritional weaning)`);
  }
  // stage E1n: the weaning-decision readouts by infant age
  const q = (a: number[], p: number) => { if (!a.length) return NaN; const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const weanOut: Record<string, Record<string, number>> = {};
  out.push('\nstage E1n: weaning decision by infant age (per infant-day; decisions = the infant\'s daylight decisions with the nurse option offered; margin = nurse score − best own-food score)');
  out.push('| age | infant-days | day starts (night act starts) | refused (roll, any hour) | refused / ended (mother) | night bouts | milk day | milk night | eating min | own kcal per eating min | decisions | nurse top % | nurse chosen % | own food chosen % | margin p25 / median / p75 | hunger | own-food drive / mother hunger (own ≥ mother %) | foregut fill | gland kcal | dry gland % | mother at starts: reserves ÷ store, hunger, foregut, feeding % | store full % |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const b of BINS) {
    const B = inf[b], W = wean[b], d = B.ticks / DAY; if (!d) continue;
    const milk = B.milkDay + B.milkNight, own = B.kin - milk, n = Math.max(1, W.dec), ms = Math.max(1, W.mStarts);
    const o = { infantDays: d, dayStarts: W.dayStarts / d, refusedRoll: W.refRoll / d, refusedRollShare: W.refRoll / Math.max(1, W.refRoll + W.refMother + W.dayStarts + W.nightActStarts), nightActStarts: W.nightActStarts / d, refusedMother: W.refMother / d, endedMother: W.endMother / d,
      nightBouts: W.nightBouts / d, milkDay: B.milkDay / d, milkNight: B.milkNight / d, eatingMin: B.eatDay / 4 / d, ownPerEatMin: B.eatDay ? own / (B.eatDay / 4) : NaN, decisions: W.dec / d,
      nurseTop: W.nurseTop / n, nurseChosen: W.nurseChosen / n, ownChosen: W.ownChosen / n, marginP25: q(W.margins, 0.25), marginMedian: q(W.margins, 0.5), marginP75: q(W.margins, 0.75), marginN: W.margins.length,
      hunger: W.hunger / n, fill: W.fill / n, gland: W.gland / n, dryGland: W.dryDec / n, ownDrive: W.own / n, motherHungerAtDec: W.mHungerDec / n, ownAboveMother: W.ownAbove / n, mRes: W.mRes / ms, mHunger: W.mHunger / ms, mFill: W.mFill / ms, mFeeding: W.mFeeding / ms, mStarts: W.mStarts, storeFull: W.storeFull / Math.max(1, W.storeTicks) };
    weanOut[b] = o;
    out.push(`| ${b} | ${f(d)} | ${f(o.dayStarts, 1)} (${f(o.nightActStarts, 2)}) | ${f(o.refusedRoll, 2)} (${f(100 * o.refusedRollShare, 1)}%) | ${f(o.refusedMother, 2)} / ${f(o.endedMother, 2)} | ${f(o.nightBouts, 1)} | ${f(o.milkDay)} | ${f(o.milkNight)} | ${f(o.eatingMin)} | ${f(o.ownPerEatMin, 2)} | ${f(o.decisions, 1)} | ${f(100 * o.nurseTop, 1)} | ${f(100 * o.nurseChosen, 1)} | ${f(100 * o.ownChosen, 1)} | ${f(o.marginP25, 2)} / ${f(o.marginMedian, 2)} / ${f(o.marginP75, 2)} | ${f(o.hunger, 2)} | ${f(o.ownDrive, 2)} / ${f(o.motherHungerAtDec, 2)} (${f(100 * o.ownAboveMother, 1)}) | ${f(o.fill, 2)} | ${f(o.gland)} | ${f(100 * o.dryGland, 1)} | ${f(o.mRes, 3)}, ${f(o.mHunger, 2)}, ${f(o.mFill, 2)}, ${f(100 * o.mFeeding, 1)} | ${f(100 * o.storeFull, 1)} |`);
  }
  // stage E1o: what an older infant drinks (docs/staging/e1o-prereg.md §1.2)
  const e1oOut: Record<string, Record<string, number | string>> = {};
  out.push('\nstage E1o: night access in the mother\'s nest, the night budget and day synthesis (per infant-night or infant-day; shares of night-nest ticks; φ = hunger ÷ the satiation term)');
  out.push('| age | night ticks in the nest % | eligible (hunger ≥ 0.08) % | drinking % | asleep (latch) % | drinks while asleep % | drive saturated (φ ≥ 0.999) % | mean φ | drinks gland-limited % | night hunger | night reserves ÷ store | night foregut: milk / solids | nights | night spend kcal | gut energy at dusk | night milk | night synthesis | reserves ÷ store dusk → dawn | gland kcal dusk → dawn | day milk | day synthesis |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const b of BINS) {
    const E = e1o[b], B = inf[b], d = B.ticks / DAY; if (!d) continue;
    const ns = Math.max(1, E.nest), nn = Math.max(1, E.nights), dDays = d;
    const o: Record<string, number | string> = { nestShare: E.nest / Math.max(1, E.nightTicks), elig: E.elig / ns, drink: E.drink / ns, asleep: E.asleep / ns, drinkAsleep: E.drinkAsleep / Math.max(1, E.drink), sat: E.sat / Math.max(1, E.satN), phi: E.nPhi / Math.max(1, E.nPhiN), glandLim: E.glandLim / Math.max(1, E.drink),
      nightHunger: E.nH / ns, nightRes: E.nRes / ns, nightFillMilk: E.nFillMilk / ns, nightFillSolid: E.nFillSolid / ns, nights: E.nights, nightSpend: E.nSpend / nn, gutDusk: E.nGutDusk / nn, nightMilk: E.nMilk / nn, nightSynth: E.nSynth / nn,
      resDusk: E.nResDusk / nn, resDawn: E.nResDawn / nn, glandDusk: E.nGlandDusk / nn, glandDawn: E.nGlandDawn / nn, dayMilk: E.dayMilk / dDays, daySynth: E.daySynth / dDays };
    e1oOut[b] = o;
    const n = (k: string, dg = 0) => f(o[k] as number, dg);
    out.push(`| ${b} | ${f(100 * (o.nestShare as number), 1)} | ${f(100 * (o.elig as number), 1)} | ${f(100 * (o.drink as number), 1)} | ${f(100 * (o.asleep as number), 1)} | ${f(100 * (o.drinkAsleep as number), 1)} | ${f(100 * (o.sat as number), 1)} | ${n('phi', 2)} | ${f(100 * (o.glandLim as number), 1)} | ${n('nightHunger', 2)} | ${n('nightRes', 3)} | ${n('nightFillMilk', 2)} / ${n('nightFillSolid', 2)} | ${E.nights} | ${n('nightSpend')} | ${n('gutDusk')} | ${n('nightMilk')} | ${n('nightSynth')} | ${n('resDusk', 3)} → ${n('resDawn', 3)} | ${n('glandDusk')} → ${n('glandDawn')} | ${n('dayMilk')} | ${n('daySynth')} |`);
  }
  out.push('\nstage E1o: day bout onsets, the day choice, own-food limits, mothers by their youngest infant\'s age (onsets: means at accepted day starts; choice: shares of the infant\'s daylight decisions with the nurse option offered; limits: shares of daylight ticks)');
  out.push('| age | onsets per day | reserves ÷ store | hunger | φ | own-food drive | foregut: milk / solids | gland kcal | bout worth b | without a deficit % | own food on menu % | tree on menu % | carried at decisions % | mother foraging at decisions % | hunger-free part beats own food % (n) | other winners | carried % daylight | mother foraging % daylight | eating % daylight | eating at a full foregut % | intake size | own fruit rate kcal/h (suckling 150) | mother: eating min, daylight fill, daylight hunger, reserves ÷ store |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
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
    out.push(`| ${b} | ${n('onsetsPerDay', 1)} | ${n('oRes', 3)} | ${n('oHunger', 2)} | ${n('oPhi', 2)} | ${n('oOwn', 2)} | ${n('oFillMilk', 2)} / ${n('oFillSolid', 2)} | ${n('oGland', 1)} | ${n('oB', 2)} | ${pc('oNoDeficit')} | ${pc('ownOnMenu')} | ${pc('treeOnMenu')} | ${pc('carriedDec')} | ${pc('motherForagingDec')} | ${pc('freeBeats')} (${E.both}) | ${others} | ${pc('carried')} | ${pc('motherForaging')} | ${pc('eating')} | ${pc('eatFull')} | ${n('size', 2)} | ${n('fruitRate')} | ${n('mEatMin')}, ${n('mFill', 2)}, ${n('mHunger', 2)}, ${n('mRes', 3)} |`);
  }
  out.push('\nstage E1o (D5): while the mother feeds in a crown (shares of those daylight ticks of the infant)');
  out.push('| age | mother in a crown % of daylight | infant eating own food % | in the nurse act % | carried % | infant hunger | infant foregut fill | infant acts (top 5) | own dry matter g/day: mother in a crown / outside | crown-time intake ÷ what a full foregut passes |');
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const b of BINS) {
    const o = e1oOut[b]; if (!o || o.mCrown === undefined) continue;
    out.push(`| ${b} | ${f(100 * (o.mCrown as number), 1)} | ${f(100 * (o.mcEat as number), 1)} | ${f(100 * (o.mcNurse as number), 1)} | ${f(100 * (o.mcCarried as number), 1)} | ${f(o.mcHunger as number, 2)} | ${f(o.mcFill as number, 2)} | ${o.mcActs} | ${f(o.ownDmInPerDay as number)} / ${f(o.ownDmOutPerDay as number)} | ${f(o.passUse as number, 2)} |`);
  }
  const jv = (sex: string, lo: number, hi: number) => { const j = juvs.filter(x => x.sex === sex && x.age0 >= lo && x.age0 < hi); return j.length ? `${f(j.reduce((s, x) => s + (x.kg1 - x.kg0) / (x.days / 365.25), 0) / j.length, 2)} kg/y (n ${j.length}, mean ${f(j.reduce((s, x) => s + x.kg0, 0) / j.length, 1)} kg at ${f(j.reduce((s, x) => s + x.age0, 0) / j.length, 1)} y)` : '—'; };
  out.push(`juvenile growth velocity, weaned to 12 y: female 4–8 y ${jv('female', 4, 8)}, 8–12 y ${jv('female', 8, 12)}; male 4–8 y ${jv('male', 4, 8)}, 8–12 y ${jv('male', 8, 12)}`);
  // stage E1p: growth against the body's state (docs/staging/e1p-prereg.md §1.2)
  const e1pOut: Record<string, Record<string, number | number[]>> = {};
  {
    const order = [...BINS.filter(b => e1p[b]), ...Object.keys(e1p).filter(k => k.startsWith('juvenile')).sort()];
    out.push('\nstage E1p: growth against the body\'s state (per animal-day; S = absorbed − spending other than growth; f = min(1, cond ÷ condGood) as energyTick reads it; velocity kg per bio-year and reserve change per day per animal over the window)');
    out.push('| group | animal-days | absorbed | spending other than growth | growth paid | potential cost (f = 1) | paid ÷ potential | S | S day / night | growth day / night | mean f (growing ticks) | f < 1 % | cond mean / min | reserves ÷ store mean / min | mAvg kcal/h against realised | days S < growth % | days S < 0 % | growth paid out of S % | growing ticks paid below the potential % | velocity kg/y (n) | weighed-mass velocity kg/y | Δ reserves ÷ store per day % (n) | first-half / second-half slope %/day |');
    out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const k of order) {
      const E = e1p[k], d = E.ticks / DAY; if (!d) continue;
      const T = e1pTraj[k], tr = T ? T.s.map((v, j) => T.n[j] ? v / T.n[j] : NaN) : [];
      const slope = (a: number[]) => { const p = a.map((v, j) => [j, v] as [number, number]).filter(([, v]) => Number.isFinite(v)); if (p.length < 2) return NaN; const n = p.length, mx = p.reduce((s, q) => s + q[0], 0) / n, my = p.reduce((s, q) => s + q[1], 0) / n; return p.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0) / p.reduce((s, q) => s + (q[0] - mx) ** 2, 0); };
      const h = Math.floor(tr.length / 2);
      const o = { animalDays: d, absorbed: E.abs / d, spendOther: E.ng / d, growth: E.gr / d, potential: E.pot / d, paidShare: E.pot > 0 ? E.gr / E.pot : NaN, S: (E.abs - E.ng) / d,
        Sday: (E.absDay - E.ngDay) / d, Snight: (E.absNight - E.ngNight) / d, growthDay: E.grDay / d, growthNight: E.grNight / d, dayShare: E.dayTicks / Math.max(1, E.ticks),
        f: E.growing ? E.f / E.growing : NaN, fLow: E.growing ? E.fLow / E.growing : NaN, cond: E.cond / E.ticks, condMin: E.condMin, res: E.res / E.ticks, resMin: E.resMin,
        mAvg: E.mAvgN ? E.mAvg / E.mAvgN : NaN, ngPerH: E.mAvgN ? E.ngAtM / E.mAvgN : NaN, daysSltG: E.gDays ? E.dLtG / E.gDays : NaN, daysSlt0: E.aDays ? E.dLt0 / E.aDays : NaN, paidFromS: E.gSum > 0 ? E.gFromS / E.gSum : NaN,
        velocity: E.vN ? E.vSum / E.vN : NaN, weighedVelocity: E.vN ? E.wvSum / E.vN : NaN, paidLow: E.growing ? E.paidLow / E.growing : NaN, vN: E.vN, rN: E.rN, dRes: E.rN ? E.drSum / E.rN : NaN, r0: E.rN ? E.r0Sum / E.rN : NaN, r1: E.rN ? E.r1Sum / E.rN : NaN, slope: slope(tr), slope1: slope(tr.slice(0, h)), slope2: slope(tr.slice(h)), traj: tr };
      e1pOut[k] = o;
      out.push(`| ${k} | ${f(d)} | ${f(o.absorbed)} | ${f(o.spendOther)} | ${f(o.growth, 1)} | ${f(o.potential, 1)} | ${f(o.paidShare, 3)} | ${f(o.S, 1)} | ${f(o.Sday, 1)} / ${f(o.Snight, 1)} | ${f(o.growthDay, 1)} / ${f(o.growthNight, 1)} | ${f(o.f, 3)} | ${f(100 * o.fLow, 1)} | ${f(o.cond, 3)} / ${f(o.condMin, 3)} | ${f(o.res, 3)} / ${f(o.resMin, 3)} | ${f(o.mAvg, 1)} / ${f(o.ngPerH, 1)} | ${f(100 * o.daysSltG, 1)} | ${f(100 * o.daysSlt0, 1)} | ${f(100 * o.paidFromS, 1)} | ${f(100 * o.paidLow, 1)} | ${f(o.velocity, 2)} (${o.vN}) | ${f(o.weighedVelocity, 2)} | ${f(100 * o.dRes, 3)} (${o.rN}) | ${f(100 * o.slope1, 3)} / ${f(100 * o.slope2, 3)} |`);
    }
  }
  out.push('dyads (seed, id, age at start, kg start → end, reserves start → end, milk kcal/d, mother mean reserves):');
  for (const x of dyads) out.push(`  ${x.seed} ${x.id} ${x.age0.toFixed(2)} y  ${x.kg0.toFixed(2)} → ${x.kg1.toFixed(2)} kg  ${x.res0.toFixed(3)} → ${x.res1.toFixed(3)}  milk ${x.milk.toFixed(0)}  mother ${x.mRes.toFixed(3)}`);
  for (const [n, t] of Object.entries(traj)) out.push(`reserves ÷ store, ${n}, every 5 d: ${t.filter((_, i) => i % 5 === 0).map(v => f(v, 3)).join(' ')}`);
  return { text: out.join('\n'), json: { profile, seeds, burnIn, days, params, termBirths, rows, births, deaths, deathsByClass, living: [livingStart, livingEnd], traj, daily: ea.daily, infants: inf, dyads, juvs, wean: weanOut, e1o: e1oOut, e1p: e1pOut } };
}
