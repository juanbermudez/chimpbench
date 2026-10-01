// Stage E1 (Track E; docs/staging/e1-prereg.md): the energy ledger. With P.energyLedger 1, hunger, body condition and
// starvation follow from an energy balance in kcal instead of the hunger timers of life.ts needs():
//   gut      metabolisable energy eaten and not yet absorbed; filled by feeding up to a capacity that scales with body
//            mass, emptied into the body first-order (ledgerGutEmptyH);
//   reserves body energy relative to a set point (0); absorbed energy flows in, expenditure flows out.
// Expenditure per tick = resting rate (Kleiber) × an activity multiple + cost per metre moved on the ground and per metre
// climbed (a carried infant's mass is charged to its carrier, rideTick) + gestation + growth; a mother also pays for the milk her
// infant drinks. Readouts: c.hunger = gut emptiness × appetite (appetite rises as reserves fall below the set point),
// C8's cond reads reserves, and reserves at minus the usable store are death by starvation.
// Every input is physiology or physics from the registry (ids ledger*); the two appetite numbers and the condition set
// point are readouts. Field values of behaviour (feeding time, daily intake) are targets and appear nowhere here.
// Conservation: for every individual, in − out = Δgut + Δreserves, exactly (tests/sim-energy.test.ts).
//
// Stage E1b (docs/staging/e1b-prereg.md; P.ledgerDigesta 1, on top of the ledger): the gut holds digesta, not energy.
//   foregut  stomach and small intestine, in grams of dry matter; filled by eating (each food brings its measured dry
//            matter per kcal and its fibre share), emptied first-order (ledgerGutEmptyH). What leaves it is split: the
//            non-fibre energy is absorbed, the fibre (NDF) passes on to the hindgut, and only as fast as the hindgut has
//            room (a full hindgut holds the foregut full);
//   hindgut  fibre in grams; fermented (yield digestaFermentKcalPerG per gram) or passed out, competing first-order so
//            that the fermented share is the measured fibre digestibility and the residue leaves after the mean
//            retention time.
// Hunger reads foregut fill (bulk) instead of energy in the gut; absorbing costs digestaTefFrac of what is absorbed
// (diet-induced thermogenesis). Conservation: in − out − fec = Δ(gut + yield × fibre in both pools) + Δreserves, where
// `in` counts fibre at its fermentation yield and `fin` keeps the formula energy eaten (the field's intake measure).
// Stage E1c (docs/staging/e1c-prereg.md; switches 0 by default): ledgerGrowSurplus makes mass state and pays growth only
// from a surplus; ledgerInfantIntake scales intake capacity with body size (intakeSize); night suckling in the mother's
// nest (ledgerNightNurse) goes through nurseTick from execution.ts.
import type { Chimp, World } from '../types';
import { paramsOf, type Params } from './params';
import { TICK_HOURS, TICK_SECONDS, ix, type ChimpX, type EnergyLedger } from './state';

const J_PER_KCAL = 4184, G_MPS2 = 9.81, DAYS_PER_YEAR = 365.25;

export const ledgerOn = (P: Params) => P.energyLedger === 1;

// Per-tick rates derived from the registry, rebuilt only when the world's parameter object changes (like needRates).
interface Rates {
  /** Share of the gut absorbed in one tick. */ absorb: number;
  /** kcal per tick per kg^exp at rest. */ rest: number;
  /** kcal per tick per kg^exp of maternal mass at the mean cost of gestation. */ preg: number;
  /** kcal per tick per kg of mass gained per bio-year (growth charged at its natural daily rate). */ grow: number;
  /** kcal per kg per metre on the ground, and per metre climbed. */ walk: number; climb: number;
  /** Milk made per tick per kg^exp of maternal mass (kcal), and how many ticks of synthesis the glands hold. */ milk: number; milkTicks: number;
  /** Longest plausible move in one tick (m); a longer jump is a placement, not locomotion. */ maxStep: number;
  /** Stage E1b (ledgerDigesta), else null. */ dig: Digesta | null;
}
/** A food as digesta: dry matter (g), fibre (g) and non-fibre energy (kcal) per kcal of formula energy eaten. */
interface Food { g: number; fib: number; nf: number }
export type FoodKind = 'drupe' | 'fig' | 'fallback' | 'meat' | 'milk';
interface Digesta {
  food: Record<FoodKind, Food>;
  /** Foregut and hindgut dry-matter capacity per kg of body mass (g). */ capF: number; capH: number;
  /** Share of the hindgut fibre that leaves in one tick (fermented or passed), and the fermented share of what leaves. */ leave: number; ferm: number;
}
/** Formula energy (fibre at the formula's credit) split into dry matter, fibre and non-fibre energy, from a feeding rate in kcal/min and g/min. */
function food(P: Params, kcalPerMin: number, gPerMin: number, ndf: number): Food {
  const g = gPerMin / kcalPerMin, fib = g * ndf;
  return { g, fib, nf: 1 - fib * P.digestaNdfCreditKcalPerG };
}
function digesta(P: Params): Digesta {
  const kp = 1 / Math.max(1e-6, P.digestaMrtH - P.ledgerGutEmptyH), d = P.digestaNdfDigestibility;
  const k = kp / Math.max(1e-6, 1 - d); // fermentation k·d and passage k·(1 − d): the fermented share is d
  const nonFibre = (gPerKcal: number): Food => ({ g: gPerKcal, fib: 0, nf: 1 });
  return {
    food: {
      drupe: food(P, P.ledgerFruitKcalPerMin, P.digestaDrupeDmGPerMin, P.digestaFruitNdf),
      fig: food(P, P.ledgerFigKcalPerMin, P.digestaFigDmGPerMin, P.digestaFruitNdf),
      fallback: food(P, P.ledgerFallbackKcalPerMin, P.digestaFallbackDmGPerMin, P.digestaFallbackNdf),
      meat: nonFibre(P.digestaMeatDmGPerKcal), milk: nonFibre(P.digestaMilkDmGPerKcal),
    },
    capF: P.digestaGutMlPerKg * P.digestaForegutShare * P.digestaForegutDmGPerMl,
    capH: P.digestaGutMlPerKg * (1 - P.digestaForegutShare) * P.digestaHindgutDmGPerMl,
    leave: 1 - Math.exp(-k * TICK_HOURS), ferm: d,
  };
}
let ratesOf: Params | null = null;
let R: Rates;
function rates(P: Params): Rates {
  if (P === ratesOf) return R;
  ratesOf = P;
  R = {
    absorb: 1 - Math.exp(-TICK_HOURS / P.ledgerGutEmptyH),
    rest: P.ledgerRmrCoef / 24 * TICK_HOURS,
    preg: P.ledgerPregnancyCoef / 24 * TICK_HOURS,
    grow: 1000 * P.ledgerGrowthKcalPerG / DAYS_PER_YEAR / 24 * TICK_HOURS,
    walk: P.ledgerWalkJPerKgM / J_PER_KCAL,
    climb: G_MPS2 / P.ledgerClimbEff / J_PER_KCAL,
    milk: P.ledgerMilkYieldCoef / 24 * TICK_HOURS, milkTicks: P.ledgerMilkStoreH / TICK_HOURS,
    maxStep: 2 * P.runMps * TICK_SECONDS + 2,
    dig: P.ledgerDigesta === 1 ? digesta(P) : null,
  };
  return R;
}

/** Body mass (kg) by age and sex: linear from birth mass to the adult mass at the age growth ends (registry; stylized curve). */
function curveMass(c: Chimp, P: Params): number {
  const f = c.sex === 'female', adult = f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg, at = f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY;
  return c.age >= at ? adult : P.ledgerMassBirthKg + (adult - P.ledgerMassBirthKg) * c.age / at;
}
/** Body mass (kg): the curve by age, or with ledgerGrowSurplus 1 (stage E1c) the animal's own mass, once its ledger holds one. */
export function massOf(c: Chimp, P: Params): number {
  const kg = P.ledgerGrowSurplus === 1 ? ix(c).en?.kg : undefined;
  return kg !== undefined ? kg : curveMass(c, P);
}
const adultMass = (c: Chimp, P: Params) => c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
/** The curve's slope (kg per bio-year): with ledgerGrowSurplus 1 the growth potential of a well-fed animal below adult mass. */
const potentialKgPerY = (c: Chimp, P: Params) => (adultMass(c, P) - P.ledgerMassBirthKg) / (c.sex === 'female' ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY);
/** Mass gained per bio-year (kg) at this age. */
function growthKgPerY(c: Chimp, P: Params): number {
  const f = c.sex === 'female', at = f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY;
  return c.age >= at ? 0 : ((f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg) - P.ledgerMassBirthKg) / at;
}
/**
 * Stage E1c (ledgerInfantIntake): intake capacity relative to an adult of the same sex, (mass ÷ adult mass)^ledgerIntakeSizeExp
 * (design: like the resting rate, so a skilled animal of any size covers its resting needs in an adult's feeding time).
 */
export function intakeSize(c: Chimp, P: Params): number {
  const r = massOf(c, P) / adultMass(c, P);
  return r >= 1 ? 1 : Math.pow(r, P.ledgerIntakeSizeExp);
}

/**
 * Gut capacity (kcal) and usable reserve at the set point (kcal). With ledgerDigesta 1 the gut is sized in dry matter;
 * its capacity in kcal is then what fills the foregut when eating drupes (the unit the intake valuation reads, intake.ts).
 */
export function gutCap(c: Chimp, P: Params): number {
  const D = rates(P).dig;
  return D ? D.capF * massOf(c, P) / D.food.drupe.g : P.ledgerGutCapKcalPerKg * massOf(c, P);
}
export const reserveCap = (c: Chimp, P: Params) => P.ledgerReserveKcalPerKg * massOf(c, P);
/** Stage E1b: foregut and hindgut dry-matter capacity (g), or 0 with ledgerDigesta 0. */
export function digestaCaps(c: Chimp, P: Params): [number, number] {
  const D = rates(P).dig, M = massOf(c, P);
  return D ? [D.capF * M, D.capH * M] : [0, 0];
}

/** Stage E1b: open the digesta pools (a gut that held only energy is read as drupes; the hindgut starts empty). */
function openDigesta(c: Chimp, L: EnergyLedger, D: Digesta, P: Params): void {
  const f = D.food.drupe, dm = Math.min(D.capF * massOf(c, P), L.gut * f.g); // L.gut was formula kcal of drupes
  L.gut = dm * f.nf / f.g; L.dm = dm; L.fib = dm * f.fib / f.g; L.hind = 0; L.fin = 0; L.fec = 0; L.dmIn = 0;
}

/**
 * The individual's ledger, opened on first use from the state it already has: reserves from its condition (a founder
 * starts at the set point, a newborn in its mother's pregnancy condition) and the gut from its hunger.
 */
export function ledgerOf(c: Chimp, P: Params): EnergyLedger {
  const x = ix(c);
  if (x.en) return x.en;
  const dev = x.cond / P.ledgerCondSet - 1; // the inverse of the condition readout
  const p = c.position, D = rates(P).dig;
  const L: EnergyLedger = { gut: gutCap(c, P) * (1 - (c.hunger > 1 ? 1 : c.hunger < 0 ? 0 : c.hunger)), res: reserveCap(c, P) * (dev < -0.9 ? -0.9 : dev > 0.5 ? 0.5 : dev), in: 0, out: 0, x: p[0], y: p[1], z: p[2], milk: 0 };
  x.en = L;
  if (P.ledgerGrowSurplus === 1) L.kg = curveMass(c, P); // stage E1c: a founder starts on the curve, a newborn at birth mass
  if (D) openDigesta(c, L, D, P); // stage E1b (after the mass, which sizes the gut)
  return L;
}

/** hunger 0..1 = gut emptiness × appetite; appetite = set − gain × reserves ÷ usable reserve, clamped (readout; design). */
function setHunger(c: Chimp, L: EnergyLedger, P: Params): void {
  const M = massOf(c, P), D = rates(P).dig;
  // stage E1b: emptiness is bulk, the foregut's dry matter against its capacity
  const e = D ? 1 - L.dm! / (D.capF * M) : 1 - L.gut / (P.ledgerGutCapKcalPerKg * M), a = P.ledgerAppetiteSet - P.ledgerAppetiteGain * L.res / (P.ledgerReserveKcalPerKg * M);
  c.hunger = (e > 1 ? 1 : e < 0 ? 0 : e) * (a > 1 ? 1 : a < 0 ? 0 : a);
}

/**
 * Optional tap for diagnostics (scripts/energy-diagnose.ts): called with each expenditure term, and with 'suckled' (an
 * intake, not an expenditure: milk the infant drank). Never set by the app; reads only.
 */
export type EnergyTerm = 'rest' | 'activity' | 'walk' | 'climb' | 'carry' | 'pregnancy' | 'growth' | 'milk' | 'digestion' | 'suckled';
export const energyTap: { fn: ((c: Chimp, term: EnergyTerm, kcal: number) => void) | null } = { fn: null };

/** One tick of the balance for `c` (called from needs()): absorption, expenditure, and the hunger readout. */
export function energyTick(world: World, c: Chimp, x: ChimpX, sleeping: boolean): void {
  const P = paramsOf(world), r = rates(P), L = x.en ?? ledgerOf(c, P);
  const M = massOf(c, P), m75 = Math.pow(M, P.ledgerRmrExp), tap = energyTap.fn, D = r.dig;
  let absorbed: number, out = 0;
  if (D) {
    if (L.dm === undefined) openDigesta(c, L, D, P);
    // foregut: a first-order share leaves; its fibre must fit in the hindgut, or the foregut empties only as fast as it does
    let a = r.absorb;
    const move = L.fib! * a, room = D.capH * M - L.hind!;
    if (move > room) a = room > 0 ? a * room / move : 0;
    absorbed = L.gut * a; L.gut -= absorbed;
    const fib = L.fib! * a;
    L.dm! -= L.dm! * a; L.fib! -= fib; L.hind! += fib;
    // hindgut: fibre is fermented or passed out, in the measured proportion
    const leave = L.hind! * D.leave, fermented = leave * D.ferm;
    L.hind! -= leave;
    absorbed += fermented * P.digestaFermentKcalPerG;
    L.fec! += (leave - fermented) * P.digestaFermentKcalPerG;
    // diet-induced thermogenesis: the cost of processing what is absorbed
    const tef = absorbed * P.digestaTefFrac;
    out += tef; if (tap) tap(c, 'digestion', tef);
  } else { absorbed = L.gut * r.absorb; L.gut -= absorbed; }
  const base = r.rest * m75, act = sleeping ? P.ledgerActSleep : c.action === 'forage' ? P.ledgerActFeed : P.ledgerActRest;
  out += base * act;
  if (tap) { tap(c, 'rest', base); tap(c, 'activity', base * (act - 1)); }
  if (c.pregnancy > 0) {
    // gestation: twice the mean cost × progress, so the mean over the pregnancy is the registry value
    const k = r.preg * m75 * 2 * Math.min(1, c.pregnancy / x.gestation);
    out += k; if (tap) tap(c, 'pregnancy', k);
  }
  // milk synthesis is limited: the store fills at the yield rate and holds ledgerMilkStoreH hours of it
  if (c.lactating) { const y = r.milk * m75, full = y * r.milkTicks; L.milk = L.milk + y < full ? L.milk + y : full; } else if (L.milk !== 0) L.milk = 0;
  if (P.ledgerGrowSurplus === 1) {
    // stage E1c: lean growth only from a surplus (reserves above the set point), at the well-fed potential, up to adult
    // mass; mass advances on the life-history clock, the cost is charged at the natural daily rate (as in E1)
    if (L.kg === undefined) L.kg = curveMass(c, P);
    const adult = adultMass(c, P);
    if (L.kg < adult && L.res > 0) {
      const v = potentialKgPerY(c, P), step = v * TICK_HOURS / 24 / DAYS_PER_YEAR * (world.ageRate > 0 ? world.ageRate : 0);
      const frac = step > adult - L.kg ? (adult - L.kg) / step : 1;
      L.kg = frac < 1 ? adult : L.kg + step;
      const k = r.grow * v * frac; out += k; if (tap) tap(c, 'growth', k);
    }
  } else {
    const g = growthKgPerY(c, P);
    if (g > 0) { const k = r.grow * g; out += k; if (tap) tap(c, 'growth', k); }
  }
  // locomotion: metres actually moved since the last tick
  const p = c.position, dx = p[0] - L.x, dy = p[1] - L.y, dz = p[2] - L.z;
  L.x = p[0]; L.y = p[1]; L.z = p[2];
  if (dx !== 0 || dz !== 0 || dy > 0) {
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d <= r.maxStep && dy <= r.maxStep) {
      const walk = d * r.walk * M, climb = dy > 0 ? dy * r.climb * M : 0;
      out += walk + climb;
      if (tap) { tap(c, 'walk', walk); tap(c, 'climb', climb); }
    }
  }
  L.res += absorbed - out;
  L.out += out;
  setHunger(c, L, P);
}

/**
 * A carried infant has just been moved with its carrier (tick.ts carryInfants): the ride is no work of its own, and the
 * carrier pays for the load, the rider's mass over the metres moved and climbed. Nobody pays before both ledgers exist.
 */
export function rideTick(rider: Chimp, carrier: Chimp, P: Params): void {
  const L = ix(rider).en, ML = ix(carrier).en;
  if (!L) return;
  const p = rider.position, dx = p[0] - L.x, dy = p[1] - L.y, dz = p[2] - L.z;
  L.x = p[0]; L.y = p[1]; L.z = p[2];
  if (!ML || (dx === 0 && dz === 0 && dy <= 0)) return;
  const r = rates(P), d = Math.sqrt(dx * dx + dz * dz);
  if (d > r.maxStep || dy > r.maxStep) return;
  const cost = (d * r.walk + (dy > 0 ? dy * r.climb : 0)) * massOf(rider, P);
  ML.res -= cost; ML.out += cost;
  if (energyTap.fn) energyTap.fn(carrier, 'carry', cost);
}

/** Energy the gut can still take (kcal of `kind`; stage E1b: by the food's dry matter per kcal). */
export function gutRoom(c: Chimp, P: Params, kind: FoodKind = 'drupe'): number {
  const D = rates(P).dig, L = ledgerOf(c, P);
  if (D && L.dm === undefined) openDigesta(c, L, D, P);
  const room = D ? (D.capF * massOf(c, P) - L.dm!) / D.food[kind].g : gutCap(c, P) - L.gut;
  return room > 0 ? room : 0;
}

/**
 * Eat up to `kcal` of formula energy of food `kind`: what fits goes into the gut. Returns the energy taken and refreshes
 * the hunger readout. Stage E1b: the food fills the foregut by its dry matter, and its fibre enters the books at its
 * fermentation yield (`in`); the formula energy and dry matter eaten are kept for comparison with field intake.
 */
export function eat(c: Chimp, P: Params, kcal: number, kind: FoodKind = 'drupe'): number {
  const L = ledgerOf(c, P), D = rates(P).dig;
  if (!D) {
    const room = gutCap(c, P) - L.gut;
    const take = kcal < room ? kcal : room > 0 ? room : 0;
    if (take > 0) { L.gut += take; L.in += take; }
    setHunger(c, L, P);
    return take;
  }
  if (L.dm === undefined) openDigesta(c, L, D, P);
  const f = D.food[kind], room = (D.capF * massOf(c, P) - L.dm!) / f.g;
  const take = kcal < room ? kcal : room > 0 ? room : 0;
  if (take > 0) {
    const dm = take * f.g, fib = take * f.fib, nf = take * f.nf;
    L.gut += nf; L.dm! += dm; L.fib! += fib;
    L.in += nf + fib * P.digestaFermentKcalPerG; L.fin! += take; L.dmIn! += dm;
  }
  setHunger(c, L, P);
  return take;
}

/** Energy of one fruit unit (the crop still depletes at fruitIntakePerH fruit units per hour). */
export const fruitKcalPerUnit = (P: Params, fig: boolean) => (fig ? P.ledgerFigKcalPerMin : P.ledgerFruitKcalPerMin) * 60 / P.fruitIntakePerH;
/** Energy of one unit of carried meat (eaten at meatEatPerH units per hour). */
export const meatKcalPerUnit = (P: Params) => P.ledgerMeatKcalPerMin * 60 / P.meatEatPerH;
/** Fallback foods at a mean cell at full stock (kcal per hour). */
export const fallbackKcalPerH = (P: Params) => P.ledgerFallbackKcalPerMin * 60;

/**
 * One tick of nursing: the infant drinks at the suckling rate what the mother's glands hold and its gut takes; the mother
 * spends that energy ÷ the efficiency of milk synthesis.
 */
export function nurseTick(infant: Chimp, mother: Chimp, P: Params): void {
  const ML = ledgerOf(mother, P), flow = P.ledgerMilkKcalPerMin * 60 * TICK_HOURS;
  const milk = eat(infant, P, flow < ML.milk ? flow : ML.milk, 'milk');
  if (milk <= 0) return;
  const cost = milk / P.ledgerMilkEff;
  ML.milk -= milk; ML.res -= cost; ML.out += cost;
  if (energyTap.fn) { energyTap.fn(mother, 'milk', cost); energyTap.fn(infant, 'suckled', milk); }
}

/** A piece of plant food handed to a begging offspring. */
export const sharePlant = (o: Chimp, P: Params) => eat(o, P, P.ledgerPlantShareKcal, 'fallback');

/**
 * Slow step (slowLife): condition reads reserves (ledgerCondSet at the set point, 0 when the usable reserve is gone).
 * Returns true when the reserve is exhausted, which is death by starvation.
 */
export function ledgerSlow(c: Chimp, x: ChimpX, P: Params): boolean {
  const L = x.en ?? ledgerOf(c, P), cap = reserveCap(c, P), v = P.ledgerCondSet * (1 + L.res / cap);
  x.cond = v > 1 ? 1 : v < 0 ? 0 : v;
  return L.res <= -cap;
}
