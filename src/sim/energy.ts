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
// Stage E1e (docs/staging/e1e-prereg.md; P.ledgerDrive 1, read only with energyLedger 1): a two-signal appetite. The
// drive to eat is the energy the animal still needs before its next chance to feed (reserve deficit, minus what the gut
// will still yield, plus what it expects to spend through the rest of its waking day and the fast after it) as a share
// of what it could eat in the waking time left; gut fill inhibits it only near distension (1 − fill²). The waking time
// left is read from sleep pressure against the pressure at which the animal last fell asleep (E2a's process S), never
// from the hour. A tree is worth the energy it can deliver over the bout (crop share, need, and the gut's room plus its
// emptying), and a nursing bout the milk the mother's glands can deliver.
// Stage E1f (docs/staging/e1f-prereg.md; switches 0 by default, read only with energyLedger 1): ledgerNurseBout values a
// day nursing bout like a tree visit, by the milk it delivers over the time it takes, the milk-ejection latency included
// (nurseBoutWorth; the act waits that latency before milk flows, execution.ts), and supersedes E1d's and E1e's nursing
// terms; ledgerGrowPotential (with ledgerGrowSurplus) takes the growth potential from captive rates (growthPotential),
// charges growth as spending at that potential, limited only by condition through C8's rule (min(1, cond ÷ condGood);
// iteration 2: a shortfall draws on the reserves, which the drive reads), and lets the drive (ledgerDrive) anticipate
// the potential growth (spendRate, from the day-long mean of all other spending, mAvg).
// Stage E1h (docs/staging/e1h-prereg.md; P.ledgerFoodEnergyFix, 0 by default, read only with energyLedger 1): plant foods
// carry metabolisable energy computed from measured water-soluble sugar plus pectin instead of TNC by difference (the
// field formula), simmen2017's rule on uwimbabazi2019's composition (plantKcalPerMin). Dry matter per minute and fibre are
// measured on the food and unchanged, so each kcal now brings more bulk.
// Stage E1i (docs/staging/e1i-prereg.md; P.ledgerSatiationReserve, 0 by default, read only with ledgerDrive 1): the
// drive saturates (φ ≤ 1) when the reserve deficit exceeds what the waking day can supply, so a depleted mother's hunger
// was 1 − fill² alone, the same curve as a balanced animal's. With the switch the satiation term is weighted by the
// relative store (setHunger), as adiposity signals weight satiation signals.
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
  /** Stage E1e: weight of one tick in the day-long average of expenditure. */ avg: number;
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
      drupe: food(P, plantKcalPerMin(P, 'drupe'), P.digestaDrupeDmGPerMin, P.digestaFruitNdf),
      fig: food(P, plantKcalPerMin(P, 'fig'), P.digestaFigDmGPerMin, P.digestaFruitNdf),
      fallback: food(P, plantKcalPerMin(P, 'fallback'), P.digestaFallbackDmGPerMin, P.digestaFallbackNdf),
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
    avg: 1 - Math.exp(-TICK_HOURS / P.driveAvgH),
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
  return kg !== undefined ? kg : growPot(P) ? potentialMass(c, P) : curveMass(c, P);
}
const adultMass = (c: Chimp, P: Params) => c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
/** Stage E1f: the captive growth potential is in use (ledgerGrowPotential with mass as state, ledgerGrowSurplus). */
const growPot = (P: Params) => P.ledgerGrowPotential === 1 && P.ledgerGrowSurplus === 1;
/**
 * Stage E1f (ledgerGrowPotential): the growth potential at this age, kg per bio-year: the captive first-year gain
 * (desilva2011), then the sanctuary rate by sex (curry2023), up to the adult mass (the caller stops at it).
 */
export function growthPotential(c: Chimp, P: Params): number {
  return c.age < 1 ? P.ledgerGrowFirstYearKg : c.sex === 'female' ? P.ledgerGrowFemaleKgPerY : P.ledgerGrowMaleKgPerY;
}
/** Stage E1f: mass on the potential curve at this age (a founder's opening mass), capped at the adult mass. */
function potentialMass(c: Chimp, P: Params): number {
  const v = c.sex === 'female' ? P.ledgerGrowFemaleKgPerY : P.ledgerGrowMaleKgPerY, a = c.age;
  const m = P.ledgerMassBirthKg + P.ledgerGrowFirstYearKg * (a < 1 ? a : 1) + v * (a > 1 ? a - 1 : 0), adult = adultMass(c, P);
  return m < adult ? m : adult;
}
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
  return D ? D.capF * gutKg(c, P) / D.food.drupe.g : P.ledgerGutCapKcalPerKg * massOf(c, P);
}
export const reserveCap = (c: Chimp, P: Params) => P.ledgerReserveKcalPerKg * massOf(c, P);
/**
 * Stage E1i (ledgerLactGut, with ledgerDigesta and ledgerDrive): the body mass that sizes the gut. A lactating female's
 * gut grows in proportion to the extra intake lactation demands (speakman2008 [M]: growth of the alimentary tract in
 * lactation; no primate measurement, [L]): × (1 + m ÷ max(E − m, m)), E her day-long mean spending (eAvg, milk paid
 * included), m the cost of synthesising her full milk yield. The isometric matched-capacity form is a design assumption
 * with no free parameter; no time course. Everyone else (and the switch at 0): the body mass.
 */
function gutKg(c: Chimp, P: Params): number {
  const M = massOf(c, P);
  if (P.ledgerLactGut !== 1 || !c.lactating || P.ledgerDigesta !== 1 || !driveOn(P)) return M;
  const E = ix(c).en?.eAvg;
  if (E === undefined) return M;
  const m = P.ledgerMilkYieldCoef / 24 * Math.pow(M, P.ledgerRmrExp) / P.ledgerMilkEff, o = E - m;
  return M * (1 + m / (o > m ? o : m));
}
/** Gut capacity (kcal of drupes) of an adult female, for rates quoted without an animal. */
export function refGutCap(P: Params): number {
  const D = rates(P).dig;
  return D ? D.capF * P.ledgerMassFemaleKg / D.food.drupe.g : P.ledgerGutCapKcalPerKg * P.ledgerMassFemaleKg;
}
/** Stage E1b: foregut and hindgut dry-matter capacity (g), or 0 with ledgerDigesta 0. */
export function digestaCaps(c: Chimp, P: Params): [number, number] {
  const D = rates(P).dig, M = gutKg(c, P);
  return D ? [D.capF * M, D.capH * M] : [0, 0];
}

/** Stage E1b: open the digesta pools (a gut that held only energy is read as drupes; the hindgut starts empty). */
function openDigesta(c: Chimp, L: EnergyLedger, D: Digesta, P: Params): void {
  const f = D.food.drupe, dm = Math.min(D.capF * gutKg(c, P), L.gut * f.g); // L.gut was formula kcal of drupes
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
  if (P.ledgerGrowSurplus === 1) L.kg = growPot(P) ? potentialMass(c, P) : curveMass(c, P); // stage E1c: a founder starts on the curve (E1f: the potential), a newborn at birth mass
  if (D) openDigesta(c, L, D, P); // stage E1b (after the mass, which sizes the gut)
  if (driveOn(P)) openDrive(c, L, P);
  return L;
}

// ---- stage E1e: the two-signal appetite ----------------------------------------------------------------------------
export const driveOn = (P: Params) => P.energyLedger === 1 && P.ledgerDrive === 1;

/** Stage E1e: open the drive state: expenditure expected at the awake resting rate, a 12-hour waking day until the first night. */
function openDrive(c: Chimp, L: EnergyLedger, P: Params): void {
  L.eAvg = P.ledgerRmrCoef / 24 * Math.pow(massOf(c, P), P.ledgerRmrExp) * P.ledgerActRest * P.ledgerWildCostMult;
  L.sBed = 1 - Math.exp(-P.driveFirstDayH / P.rhythmSleepRiseH); L.sWake = 0; L.slept = 0; L.outAt = L.out;
}

/** Stage E1f: open the growth books of an animal below adult mass: spending other than growth at the awake resting rate (as openDrive). */
function openGrowth(c: Chimp, L: EnergyLedger, P: Params): void {
  L.mAvg = P.ledgerRmrCoef / 24 * Math.pow(massOf(c, P), P.ledgerRmrExp) * P.ledgerActRest; L.gAt = L.out;
}
/**
 * Spending the drive expects (kcal/h): the day-long average of everything spent (E1e), or with ledgerGrowPotential, for
 * an animal below adult mass, the day-long average of everything but growth plus growth at the potential (a growing
 * animal's requirement is its expenditure plus the energy it deposits; fao2004 §4.4).
 */
function spendRate(c: Chimp, L: EnergyLedger, P: Params): number {
  if (growPot(P) && L.kg !== undefined && L.kg < adultMass(c, P)) {
    const m = L.mAvg !== undefined ? L.mAvg : P.ledgerRmrCoef / 24 * Math.pow(massOf(c, P), P.ledgerRmrExp) * P.ledgerActRest; // read-only before the books open
    return m + rates(P).grow * growthPotential(c, P) / TICK_HOURS;
  }
  return L.eAvg!;
}

/** Energy in the gut still to be absorbed (kcal): the foregut's non-fibre energy, plus the expected yield of the fibre in both pools. */
function gutEnergy(L: EnergyLedger, P: Params, D: Digesta | null): number {
  return D ? L.gut + P.digestaFermentKcalPerG * D.ferm * (L.fib! + L.hind!) : L.gut;
}

/** Foregut fill 0..1: dry matter against capacity with digesta, energy against capacity without. */
function gutFill(c: Chimp, L: EnergyLedger, P: Params, D: Digesta | null): number {
  const f = D ? L.dm! / (D.capF * gutKg(c, P)) : L.gut / (P.ledgerGutCapKcalPerKg * massOf(c, P));
  return f > 1 ? 1 : f < 0 ? 0 : f;
}

/**
 * Hours of waking time left, and hours of the fast after it (stage E1e). With rhythmSleep 1, from sleep pressure S: awake
 * since S = S_wake, S(t) = 1 − (1 − S_wake)·exp(−t/τ), so the hours awake so far and the length of yesterday's waking day
 * (from S_wake to the S at which the animal last fell asleep) follow from S alone; the fast is the rest of the 24-hour day.
 * Without rhythmSleep there is no cue of a coming fast: the horizon is one gut-emptying time and no fast.
 */
export function feedHorizon(c: Chimp, L: EnergyLedger, P: Params): [number, number] {
  if (P.rhythmSleep !== 1) return [P.ledgerGutEmptyH, 0];
  const S = ix(c).slp ?? 1 - c.energy, tau = P.rhythmSleepRiseH, w = 1 - L.sWake!;
  const day = tau * Math.log(w / Math.max(1e-9, 1 - L.sBed!)), done = tau * Math.log(w / Math.max(1e-9, 1 - S));
  return [day > done ? day - done : 0, day < 24 ? 24 - day : 0];
}

/** Intake while feeding (kcal/h): ripe fruit at the animal's skill and size (as intake.ts fruitRate), plus milk while unweaned. */
function feedRate(c: Chimp, P: Params): number {
  const fruitPerH = P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : c.age < 5 ? P.fruitIntakeYoungFactor : 1);
  return fruitPerH * fruitKcalPerUnit(P, false) + (ix(c).weaned ? 0 : P.ledgerMilkKcalPerMin * 60);
}

/**
 * Stage E1e: energy the animal needs before its next chance to feed (kcal): the reserve deficit (a surplus counts
 * against it), less what the gut will still yield, plus the expenditure expected over the waking time left and the fast
 * after it, at the day-long average rate. Positive = hungry ahead or behind.
 */
export function energyNeed(c: Chimp, P: Params): number {
  const L = ledgerOf(c, P), D = rates(P).dig;
  if (L.eAvg === undefined) openDrive(c, L, P);
  const [left, fast] = feedHorizon(c, L, P);
  return -L.res - gutEnergy(L, P, D) + spendRate(c, L, P) * (left + fast);
}

/**
 * Stage E1e: the energy (kcal of drupes) a feeding bout can take before the foregut is full: its room plus what it
 * empties while filling, at intake rate R against full-gut emptying Q (capacity ÷ ledgerGutEmptyH, an upper bound).
 * Satiation at distension ends the bout (iteration 2 of the pre-registration; iteration 1 paced it to the end of the need).
 */
export function boutRoom(c: Chimp, P: Params, R: number): number {
  const room = gutRoom(c, P, 'drupe'), Q = gutCap(c, P) / P.ledgerGutEmptyH;
  return R > Q ? room * R / (R - Q) : Infinity;
}

/**
 * Stage E1e: the share of a full flow of milk the mother's glands give now (0..1): what they hold plus one tick of
 * synthesis, against one tick of full flow; a dry gland gives the trickle of synthesis. The infant senses the let-down on
 * contact; reading the store is a modelling shortcut (rules only, not the model packet).
 */
export function milkShare(infant: Chimp, mother: Chimp, P: Params): number {
  if (!mother.lactating) return 0;
  const flow = P.ledgerMilkKcalPerMin * 60 * TICK_HOURS, y = P.ledgerMilkYieldCoef / 24 * TICK_HOURS * Math.pow(massOf(mother, P), P.ledgerRmrExp);
  const v = (ledgerOf(mother, P).milk + y) / flow;
  void infant;
  return v < 1 ? v : 1;
}

/** hunger 0..1 = gut emptiness × appetite; appetite = set − gain × reserves ÷ usable reserve, clamped (readout; design). */
function setHunger(c: Chimp, L: EnergyLedger, P: Params): void {
  if (driveOn(P)) {
    // stage E1e: drive = need ÷ (intake rate × waking time left), inhibited near distension by 1 − fill²
    const D = rates(P).dig;
    if (L.eAvg === undefined) openDrive(c, L, P);
    const [left, fast] = feedHorizon(c, L, P), need = -L.res - gutEnergy(L, P, D) + spendRate(c, L, P) * (left + fast);
    const phi = need > 0 ? need / (feedRate(c, P) * (left > TICK_HOURS ? left : TICK_HOURS)) : 0, f = gutFill(c, L, P, D);
    if (P.ledgerSatiationReserve === 1) {
      // stage E1i (docs/staging/e1i-prereg.md): adiposity signals modulate the processing of satiation signals
      // (grill2010 [M]), so the satiation term is weighted by the relative store w = 1 + reserves ÷ usable store (1 at the
      // set point, 0 when the store is gone, above 1 in surplus; the proportional form is a design assumption). A
      // depleted animal's meal then runs toward the gut wall instead of stopping at a balanced animal's fill.
      const r = 1 + L.res / reserveCap(c, P), s = 1 - (r > 0 ? r : 0) * f * f;
      c.hunger = (phi > 1 ? 1 : phi) * (s > 0 ? s : 0);
      return;
    }
    c.hunger = (phi > 1 ? 1 : phi) * (1 - f * f);
    return;
  }
  const M = massOf(c, P), D = rates(P).dig;
  // stage E1b: emptiness is bulk, the foregut's dry matter against its capacity
  const e = D ? 1 - L.dm! / (D.capF * M) : 1 - L.gut / (P.ledgerGutCapKcalPerKg * M), a = P.ledgerAppetiteSet - P.ledgerAppetiteGain * L.res / (P.ledgerReserveKcalPerKg * M);
  c.hunger = (e > 1 ? 1 : e < 0 ? 0 : e) * (a > 1 ? 1 : a < 0 ? 0 : a);
}

/**
 * Optional tap for diagnostics (scripts/energy-diagnose.ts): called with each expenditure term, and with 'suckled' (an
 * intake, not an expenditure: milk the infant drank). Never set by the app; reads only.
 */
export type EnergyTerm = 'rest' | 'activity' | 'wild' | 'walk' | 'climb' | 'carry' | 'pregnancy' | 'growth' | 'milk' | 'digestion' | 'suckled' | 'eaten';
/** 'eaten' (stage E1h) is food taken into the gut, with its kind: an intake, not an expenditure. */
export const energyTap: { fn: ((c: Chimp, term: EnergyTerm, kcal: number, kind?: FoodKind) => void) | null } = { fn: null };

/** One tick of the balance for `c` (called from needs()): absorption, expenditure, and the hunger readout. */
export function energyTick(world: World, c: Chimp, x: ChimpX, sleeping: boolean): void {
  const P = paramsOf(world), r = rates(P), L = x.en ?? ledgerOf(c, P);
  const M = massOf(c, P), m75 = Math.pow(M, P.ledgerRmrExp), tap = energyTap.fn, D = r.dig;
  let absorbed: number, out = 0;
  if (D) {
    if (L.dm === undefined) openDigesta(c, L, D, P);
    // foregut: a first-order share leaves; its fibre must fit in the hindgut, or the foregut empties only as fast as it does
    let a = r.absorb;
    const move = L.fib! * a, room = D.capH * gutKg(c, P) - L.hind!;
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
  // stage E1g (docs/staging/e1g-prereg.md): ledgerWildCostMult scales the non-locomotor maintenance term for wild costs no
  // term models (thermoregulation, immune function, tissue repair, vigilance). Unmeasured in wild apes; 1 = the captive-based
  // sum (a sensitivity parameter, assumed, never fitted)
  const wild = P.ledgerWildCostMult;
  out += base * act * wild;
  if (tap) { tap(c, 'rest', base); tap(c, 'activity', base * (act - 1)); if (wild !== 1) tap(c, 'wild', base * act * (wild - 1)); }
  // NOT VALID AT ageRate > 1: gestation, milk synthesis and growth below are charged per ecological tick at their natural
  // daily rate, so at a life-course ageRate (365) reproduction and growth cost 1/ageRate of their real energy. Do not run
  // demography with the ledger on and trust it (docs/simulation.md; scripts/energy-diagnose.ts refuses it).
  if (c.pregnancy > 0) {
    // gestation: twice the mean cost × progress, so the mean over the pregnancy is the registry value
    const k = r.preg * m75 * 2 * Math.min(1, c.pregnancy / x.gestation);
    out += k; if (tap) tap(c, 'pregnancy', k);
  }
  // milk synthesis is limited: the store fills at the yield rate and holds ledgerMilkStoreH hours of it
  if (c.lactating) { const y = r.milk * m75, full = y * r.milkTicks; L.milk = L.milk + y < full ? L.milk + y : full; } else if (L.milk !== 0) L.milk = 0;
  let grown = 0;
  if (P.ledgerGrowSurplus === 1 && growPot(P)) {
    // stage E1f (iteration 2): growth is spending at the captive potential, limited only by condition through C8's rule
    // (f = min(1, cond ÷ condGood); growth falters only when condition is poor, design): a shortfall of intake draws on the
    // reserves, which the drive reads. Mass advances on the life-history clock, the cost is charged at the natural daily
    // rate (as in E1). (Iteration 1 paid growth from the day's surplus and hid every shortfall from the appetite.)
    if (L.kg === undefined) L.kg = potentialMass(c, P);
    const adult = adultMass(c, P);
    if (L.kg < adult) {
      if (L.mAvg === undefined) openGrowth(c, L, P);
      const v = growthPotential(c, P), G = r.grow * v, q = x.cond / P.condGood;
      let f = q >= 1 ? 1 : q > 0 ? q : 0;
      const step = v * f * TICK_HOURS / 24 / DAYS_PER_YEAR * (world.ageRate > 0 ? world.ageRate : 0);
      if (step > adult - L.kg) { f = f * (adult - L.kg) / step; L.kg = adult; } else L.kg += step;
      grown = G * f; out += grown; if (tap) tap(c, 'growth', grown);
    }
  } else if (P.ledgerGrowSurplus === 1) {
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
  if (L.mAvg !== undefined) {
    // stage E1f: the day-long mean of everything spent but growth (milk and carrying are charged elsewhere, so read the
    // books), for the drive; kept while the animal is below adult mass
    if (growPot(P) && L.kg !== undefined && L.kg < adultMass(c, P)) {
      L.mAvg += ((L.out - L.gAt! - grown) / TICK_HOURS - L.mAvg) * r.avg; L.gAt = L.out;
    } else { delete L.mAvg; delete L.gAt; }
  }
  if (driveOn(P)) {
    // stage E1e: the day-long average of everything spent (milk and carrying are charged elsewhere, so read the books),
    // and the sleep pressure at the last falling asleep and waking (the animal's own measure of its waking day)
    if (L.eAvg === undefined) openDrive(c, L, P);
    L.eAvg! += ((L.out - L.outAt!) / TICK_HOURS - L.eAvg!) * r.avg; L.outAt = L.out;
    const S = x.slp ?? 1 - c.energy;
    if (sleeping && L.slept === 0) L.sBed = S; else if (!sleeping && L.slept === 1) L.sWake = S;
    L.slept = sleeping ? 1 : 0;
  }
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
  const room = D ? (D.capF * gutKg(c, P) - L.dm!) / D.food[kind].g : gutCap(c, P) - L.gut;
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
    if (take > 0) { L.gut += take; L.in += take; if (energyTap.fn) energyTap.fn(c, 'eaten', take, kind); }
    setHunger(c, L, P);
    return take;
  }
  if (L.dm === undefined) openDigesta(c, L, D, P);
  const f = D.food[kind], room = (D.capF * gutKg(c, P) - L.dm!) / f.g;
  const take = kcal < room ? kcal : room > 0 ? room : 0;
  if (take > 0) {
    const dm = take * f.g, fib = take * f.fib, nf = take * f.nf;
    L.gut += nf; L.dm! += dm; L.fib! += fib;
    L.in += nf + fib * P.digestaFermentKcalPerG; L.fin! += take; L.dmIn! += dm;
    if (energyTap.fn) energyTap.fn(c, 'eaten', take, kind);
  }
  setHunger(c, L, P);
  return take;
}

/**
 * Stage E1h: energy per feeding minute of a plant food at full rate (kcal/min). With ledgerFoodEnergyFix 1 the sugar-based
 * values (measured water-soluble sugar plus pectin at 5% of dry matter in place of TNC by difference, simmen2017's rule on
 * uwimbabazi2019 Table 2), with it 0 the field formula's (uwimbabazi2019 Table 1). Meat and milk carry no carbohydrate
 * term and are unchanged.
 */
export function plantKcalPerMin(P: Params, kind: 'drupe' | 'fig' | 'fallback'): number {
  const fix = P.ledgerFoodEnergyFix === 1;
  if (kind === 'drupe') return fix ? P.ledgerFruitKcalPerMinSugar : P.ledgerFruitKcalPerMin;
  if (kind === 'fig') return fix ? P.ledgerFigKcalPerMinSugar : P.ledgerFigKcalPerMin;
  return fix ? P.ledgerFallbackKcalPerMinSugar : P.ledgerFallbackKcalPerMin;
}
/** Energy of one fruit unit (the crop still depletes at fruitIntakePerH fruit units per hour). */
export const fruitKcalPerUnit = (P: Params, fig: boolean) => plantKcalPerMin(P, fig ? 'fig' : 'drupe') * 60 / P.fruitIntakePerH;
/** Energy of one unit of carried meat (eaten at meatEatPerH units per hour). */
export const meatKcalPerUnit = (P: Params) => P.ledgerMeatKcalPerMin * 60 / P.meatEatPerH;
/** Fallback foods at a mean cell at full stock (kcal per hour). */
export const fallbackKcalPerH = (P: Params) => plantKcalPerMin(P, 'fallback') * 60;

/**
 * One tick of nursing: the infant drinks at the suckling rate what the mother's glands hold and its gut takes; the mother
 * spends that energy ÷ the efficiency of milk synthesis. `frac` is the share of the tick in which milk flows (stage E1f:
 * the tick in which the milk-ejection latency ends). Returns the milk drunk (kcal).
 */
export function nurseTick(infant: Chimp, mother: Chimp, P: Params, frac = 1): number {
  const ML = ledgerOf(mother, P), flow = P.ledgerMilkKcalPerMin * 60 * TICK_HOURS * frac;
  const milk = eat(infant, P, flow < ML.milk ? flow : ML.milk, 'milk');
  if (milk <= 0) return 0;
  const cost = milk / P.ledgerMilkEff;
  ML.milk -= milk; ML.res -= cost; ML.out += cost;
  if (energyTap.fn) { energyTap.fn(mother, 'milk', cost); energyTap.fn(infant, 'suckled', milk); }
  return milk;
}

/**
 * Stage E1f (ledgerNurseBout): what a day nursing bout is worth, as the share of the full suckling rate it delivers over
 * the time it takes, the milk-ejection latency included: E ÷ (E + rate × latency), E the milk it can deliver (the gland
 * store plus what is made while it drains, up to what the infant's foregut can take of milk). 0 for a dry gland or a
 * full gut; 1 while either ledger is not open. Pure: reads existing ledgers only.
 */
export function nurseBoutWorth(infant: Chimp, mother: Chimp, P: Params): number {
  const I = ix(infant).en, M = ix(mother).en;
  if (!I || !M) return 1;
  const F = P.ledgerMilkKcalPerMin * 60, y = P.ledgerMilkYieldCoef / 24 * Math.pow(massOf(mother, P), P.ledgerRmrExp), D = rates(P).dig;
  const room = D && I.dm !== undefined ? (D.capF * massOf(infant, P) - I.dm) / D.food.milk.g : gutCap(infant, P) - I.gut;
  const gland = F > y ? M.milk * F / (F - y) : Infinity, E = gland < room ? gland : room;
  return E > 0 ? E / (E + F * P.ledgerLetDownS / 3600) : 0;
}

/**
 * Stage E1d (ledgerNurseByMilk): what a nursing bout is worth now, as the share of the infant's gut room the mother's
 * gland store can fill (0 with a full gut; 1 when either ledger is not open yet). Pure: reads existing ledgers only.
 */
export function milkWorth(infant: Chimp, mother: Chimp, P: Params): number {
  const I = ix(infant).en, M = ix(mother).en;
  if (!I || !M) return 1;
  const room = gutCap(infant, P) - I.gut;
  return room > 0 ? (M.milk < room ? M.milk / room : 1) : 0;
}
/** Stage E1d: the gland holds less than one tick of suckling, so it can no longer sustain the suckling rate. */
export function glandEmpty(mother: Chimp, P: Params): boolean {
  const M = ix(mother).en;
  return !M || M.milk < P.ledgerMilkKcalPerMin * 60 * TICK_HOURS;
}

/** A piece of plant food handed to a begging offspring. */
/**
 * A piece of plant food handed by `giver` to a begging offspring `o`: it comes out of the giver's foregut, with its
 * composition, up to ledgerPlantShareKcal and what the receiver's gut takes; both books record the transfer as intake
 * (negative for the giver), so energy is conserved across the two (the piece used to be created from nothing).
 */
export function sharePlant(giver: Chimp, o: Chimp, P: Params): number {
  const G = ledgerOf(giver, P), O = ledgerOf(o, P), D = rates(P).dig, Y = D ? P.digestaFermentKcalPerG : 0;
  if (D) { if (G.dm === undefined) openDigesta(giver, G, D, P); if (O.dm === undefined) openDigesta(o, O, D, P); }
  const pot = G.gut + Y * (D ? G.fib! : 0);
  if (!(pot > 0)) return 0;
  let q = P.ledgerPlantShareKcal < pot ? P.ledgerPlantShareKcal / pot : 1;
  if (D) { const room = D.capF * massOf(o, P) - O.dm!; if (q * G.dm! > room) q = room > 0 && G.dm! > 0 ? room / G.dm! : 0; }
  else { const room = gutCap(o, P) - O.gut; if (q * G.gut > room) q = room > 0 ? room / G.gut : 0; }
  if (!(q > 0)) return 0;
  const gut = q * G.gut;
  G.gut -= gut; O.gut += gut;
  let e = gut;
  if (D) {
    const dm = q * G.dm!, fib = q * G.fib!, fin = gut + P.digestaNdfCreditKcalPerG * fib;
    G.dm! -= dm; G.fib! -= fib; O.dm! += dm; O.fib! += fib; e += Y * fib;
    G.fin! -= fin; O.fin! += fin; G.dmIn! -= dm; O.dmIn! += dm;
  }
  G.in -= e; O.in += e;
  setHunger(giver, G, P); setHunger(o, O, P);
  return e;
}

/**
 * Slow step (slowLife): condition reads reserves (ledgerCondSet at the set point, 0 when the usable reserve is gone).
 * Returns true when the reserve is exhausted, which is death by starvation.
 */
export function ledgerSlow(c: Chimp, x: ChimpX, P: Params): boolean {
  const L = x.en ?? ledgerOf(c, P), cap = reserveCap(c, P), v = P.ledgerCondSet * (1 + L.res / cap);
  x.cond = v > 1 ? 1 : v < 0 ? 0 : v;
  return L.res <= -cap;
}
