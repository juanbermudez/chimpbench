// Stage E2g (Track E; docs/staging/e2g-prereg.md): the water ledger. With P.waterLedger 1 (read only with energyLedger
// and ledgerDigesta 1), thirst is read from a water balance in mL instead of the thirst timers of life.ts needs():
//   in   food water: each food's dry matter (E1b's grams per kcal) × its water share ÷ its dry share, counted when eaten
//        (free water in fruit pulp is taken as absorbed within the tick; design); metabolic water per kcal the energy
//        ledger spends (milk energy a mother exports is not oxidised, so it is left out); drinking at a site
//        (drinkTick, at waterDrinkMlPerKgMin until the deficit is replaced);
//   out  regulated evaporation: the evaporative heat E2a's heat balance uses (rhythm.ts heatOut; 0 without rhythmHeat) ÷
//        the latent heat; insensible respiration and skin diffusion (Fanger / ISO 7730 with the air's vapour pressure;
//        insensible evaporation is already inside the measured dry conductance of E2a's balance, so it cools nothing
//        twice); faecal water (E1b's faecal dry matter × the faecal water share); obligatory urine; milk (a mother loses
//        what her infant drinks, energy.ts nurseTick); and any water above euhydration, passed as urine at once.
// Thirst (0..1) = 0 below a deficit of waterThirstOnsetPct of body mass, rising linearly to 1 at waterThirstFullPct.
// Every input is physiology or physics from the registry (ids water*); no hourly thirst rate, no hot-hour bonus, no fruit
// factor. Conservation per individual: in − out = −(def − its opening value), exactly (tests/sim-water.test.ts); a
// mother's milk water out equals her infant's milk water in.
import type { Chimp, World } from '../types';
import { dryMatterPerKcal, ledgerOf, massOf, type FoodKind } from './energy';
import { paramsOf, type Params } from './params';
import { heatOut } from './rhythm';
import { TICK_HOURS, TICK_SECONDS, ix, type ChimpX, type WaterLedger } from './state';

const J_PER_KCAL = 4184;
// saturation vapour pressure over water (Pa) at air temperature t (°C): rh × 1000 × exp(16.6536 − 4030.183 / (t + 235)),
// the form the ISO 7730 comfort model uses with relative humidity (rinjea2022); physics
const SAT_A = 16.6536, SAT_B = 4030.183, SAT_C = 235;

export const waterOn = (P: Params) => P.waterLedger === 1 && P.energyLedger === 1 && P.ledgerDigesta === 1;

/** Water ledger terms (mL), for diagnostics (scripts/water-diagnose.ts). Never set by the app; reads only. */
export type WaterTerm = 'food' | 'metabolic' | 'drunk' | 'milkIn' | 'evap' | 'insensible' | 'faecal' | 'urine' | 'milkOut';
export const waterTap: { fn: ((c: Chimp, term: WaterTerm, mL: number) => void) | null } = { fn: null };

/** The individual's water ledger, opened euhydrated on first use (design), its energy books read from the current state. */
export function waterOf(c: Chimp, P: Params): WaterLedger {
  const x = ix(c);
  if (x.wat) return x.wat;
  const L = ledgerOf(c, P);
  const W: WaterLedger = { def: 0, in: 0, out: 0, oAt: L.out, fAt: L.fec ?? 0, mx: 0 };
  x.wat = W;
  return W;
}

/** Water (mL) carried by `kcal` of food `kind` eaten: its dry matter × water share ÷ dry share. */
export function foodWater(P: Params, kcal: number, kind: FoodKind): number {
  const f = kind === 'drupe' ? P.waterFruitFrac : kind === 'fig' ? P.waterFigFrac : kind === 'fallback' ? P.waterFallbackFrac : kind === 'meat' ? P.waterMeatFrac : P.waterMilkFrac;
  return kcal * dryMatterPerKcal(P, kind) * f / (1 - f);
}

/** Thirst readout from the deficit as a share of body mass (mL ÷ (kg × 10) = %). */
function setThirst(c: Chimp, W: WaterLedger, P: Params, kg: number): void {
  const pct = W.def / (kg * 10), t = (pct - P.waterThirstOnsetPct) / (P.waterThirstFullPct - P.waterThirstOnsetPct);
  c.thirst = t > 1 ? 1 : t > 0 ? t : 0;
}

/** Food just eaten (energy.ts eat): its water enters the body. Milk is booked as 'milkIn'. */
export function eatWater(c: Chimp, P: Params, kcal: number, kind: FoodKind): void {
  const q = foodWater(P, kcal, kind);
  if (!(q > 0)) return;
  const W = waterOf(c, P);
  W.def -= q; W.in += q;
  if (waterTap.fn) waterTap.fn(c, kind === 'milk' ? 'milkIn' : 'food', q);
}

/** A mother's milk drunk by her infant (energy.ts nurseTick): its water leaves her, and its energy is exported, not oxidised. */
export function milkWaterOut(mother: Chimp, P: Params, milkKcal: number): void {
  const q = foodWater(P, milkKcal, 'milk'), W = waterOf(mother, P);
  W.def += q; W.out += q; W.mx += milkKcal;
  if (waterTap.fn) waterTap.fn(mother, 'milkOut', q);
}

/**
 * Water lost by evaporation without sweating (W/m² of skin), at metabolic rate `m` W/m² and ambient vapour pressure
 * `pa` Pa: respiration plus diffusion through the skin (Fanger / ISO 7730; human bare skin, [L]). Pure.
 */
export function insensibleW(P: Params, m: number, pa: number): number {
  const resp = P.waterRespCoef * m * (P.waterRespPa - pa), skin = P.waterSkinDiffCoef * (P.waterSkinPa - P.waterSkinMetCoef * m - pa);
  return (resp > 0 ? resp : 0) + (skin > 0 ? skin : 0);
}
/** Ambient water-vapour pressure (Pa) from air temperature (°C) and relative humidity (0..1). */
export const vapourPa = (t: number, rh: number) => rh * 1000 * Math.exp(SAT_A - SAT_B / (t + SAT_C));

/** One tick of the water balance for `c` (from needs(), after the energy ledger and E2a's heat balance): losses, metabolic water, the readout. */
export function waterTick(world: World, c: Chimp, x: ChimpX): void {
  const P = paramsOf(world), W = x.wat ?? waterOf(c, P), L = x.en ?? ledgerOf(c, P), kg = massOf(c, P), env = world.environment, tap = waterTap.fn;
  // metabolic water: energy spent since the last water tick (energyTick, milk and carrying), less milk energy exported
  const spent = L.out - W.oAt - W.mx; W.oAt = L.out; W.mx = 0;
  const met = spent > 0 ? spent * P.waterMetabolicMlPerKcal : 0;
  // faecal water: dry matter passed out (E1b books it as energy at the fermentation yield)
  const fec = L.fec ?? 0, fdm = (fec - W.fAt) / P.digestaFermentKcalPerG; W.fAt = fec;
  const faec = fdm > 0 ? fdm * P.waterFaecalFrac / (1 - P.waterFaecalFrac) : 0;
  // regulated evaporation (E2a heat balance, W/kg) and insensible evaporation (W/m² of skin at this metabolic rate)
  const evap = P.rhythmHeat === 1 ? heatOut.evapW * kg * TICK_SECONDS / P.waterLatentJPerG : 0;
  const area = P.waterSkinAreaM2 * Math.pow(kg, 2 / 3), m = (spent > 0 ? spent : 0) * J_PER_KCAL / TICK_SECONDS / area;
  const ins = insensibleW(P, m, vapourPa(env.temperature, env.humidity)) * area * TICK_SECONDS / P.waterLatentJPerG;
  const urine = P.waterUrineMinMlPerKgD * kg * TICK_HOURS / 24;
  W.in += met; W.out += evap + ins + faec + urine;
  W.def += evap + ins + faec + urine - met;
  // water above euhydration is passed at once (renal excess clearance)
  let excess = 0;
  if (W.def < 0) { excess = -W.def; W.out += excess; W.def = 0; }
  if (tap) { tap(c, 'metabolic', met); tap(c, 'evap', evap); tap(c, 'insensible', ins); tap(c, 'faecal', faec); tap(c, 'urine', urine + excess); }
  setThirst(c, W, P, kg);
}

/**
 * One tick of drinking at a site (execution.ts drink, once at the water): water at waterDrinkMlPerKgMin until the deficit
 * is replaced. Returns true when the animal is sated (no deficit left).
 */
export function drinkTick(c: Chimp, P: Params): boolean {
  const W = waterOf(c, P), kg = massOf(c, P);
  const q = Math.min(W.def > 0 ? W.def : 0, P.waterDrinkMlPerKgMin * kg * TICK_HOURS * 60);
  if (q > 0) { W.def -= q; W.in += q; if (waterTap.fn) waterTap.fn(c, 'drunk', q); }
  setThirst(c, W, P, kg);
  return !(W.def > 1e-9);
}

/**
 * What a trip to a drinking site `d` metres away is worth (rules score; candidates.ts): thirst × the share of the trip
 * spent drinking, walk included (the deficit replaced at the drinking rate against the walk at walkMps: the share of the
 * full intake rate a trip delivers, as a food trip is valued under the ledger), with the drink offer's weights (1.5 and
 * the constant 0.05, design, unchanged). Sites hold no stock in the model, so every site can fill the whole deficit.
 */
export function drinkWorth(c: Chimp, P: Params, d: number, speed = P.walkMps): number {
  const W = waterOf(c, P), kg = massOf(c, P);
  // stage E2i (walkGait): `speed` is the animal's walking speed (gait.ts tripSpeed), walkMps by default
  const drinkH = (W.def > 0 ? W.def : 0) / (P.waterDrinkMlPerKgMin * kg * 60), walkH = d / speed / 3600;
  const share = drinkH > 0 ? drinkH / (drinkH + walkH) : 0;
  return c.thirst * 1.5 * share - 0.05;
}
