// Stage E1 (Track E; docs/staging/e1-prereg.md): the energy ledger. With P.energyLedger 1, hunger, body condition and
// starvation follow from an energy balance in kcal instead of the hunger timers of life.ts needs():
//   gut      metabolisable energy eaten and not yet absorbed; filled by feeding up to a capacity that scales with body
//            mass, emptied into the body first-order (ledgerGutEmptyH);
//   reserves body energy relative to a set point (0); absorbed energy flows in, expenditure flows out.
// Expenditure per tick = resting rate × an activity multiple (asleep, awake) + cost per metre moved on the ground and per
// metre climbed (a carried infant's mass is charged to its carrier, rideTick) + gestation + growth. Body mass is state:
// an immature grows along the mass curve only while its reserves are at or above the set point, and otherwise falls
// behind the curve instead of burning reserves (E1b); a mother also pays for the milk her
// infant drinks. Readouts: c.hunger = gut emptiness × appetite (appetite rises as reserves fall below the set point),
// C8's cond reads reserves, and reserves at minus the usable store are death by starvation.
// Every input is physiology or physics from the registry (ids ledger*); the two appetite numbers and the condition set
// point are readouts. Field values of behaviour (feeding time, daily intake) are targets and appear nowhere here.
// Conservation: for every individual, in − out = Δgut + Δreserves, exactly (tests/sim-energy.test.ts).
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
  /** Share of a bio-year's growth due in one tick (growth runs at its natural daily rate), and kcal per kg gained. */ growShare: number; kcalPerKg: number;
  /** kcal per kg per metre on the ground, and per metre climbed. */ walk: number; climb: number;
  /** Milk made per tick per kg^exp of maternal mass (kcal), and how many ticks of synthesis the glands hold. */ milk: number; milkTicks: number;
  /** Longest plausible move in one tick (m); a longer jump is a placement, not locomotion. */ maxStep: number;
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
    growShare: TICK_HOURS / 24 / DAYS_PER_YEAR, kcalPerKg: 1000 * P.ledgerGrowthKcalPerG,
    walk: P.ledgerWalkJPerKgM / J_PER_KCAL,
    climb: G_MPS2 / P.ledgerClimbEff / J_PER_KCAL,
    milk: P.ledgerMilkYieldCoef / 24 * TICK_HOURS, milkTicks: P.ledgerMilkStoreH / TICK_HOURS,
    maxStep: 2 * P.runMps * TICK_SECONDS + 2,
  };
  return R;
}

/** The mass curve (kg) by age and sex: linear from birth mass to the adult mass at the age growth ends (registry; stylized curve). */
export function curveMass(c: Chimp, P: Params): number {
  const f = c.sex === 'female', adult = f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg, at = f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY;
  return c.age >= at ? adult : P.ledgerMassBirthKg + (adult - P.ledgerMassBirthKg) * c.age / at;
}
/** Body mass (kg): the curve less the growth this individual has not made (E1b; on the curve until its ledger says otherwise). */
export function massOf(c: Chimp, P: Params): number {
  const L = ix(c).en;
  return L ? curveMass(c, P) - L.lag : curveMass(c, P);
}
/** Mass gained per bio-year (kg) at this age. */
function growthKgPerY(c: Chimp, P: Params): number {
  const f = c.sex === 'female', at = f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY;
  return c.age >= at ? 0 : ((f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg) - P.ledgerMassBirthKg) / at;
}

/** Gut capacity and usable reserve at the set point (kcal). */
export const gutCap = (c: Chimp, P: Params) => P.ledgerGutCapKcalPerKg * massOf(c, P);
export const reserveCap = (c: Chimp, P: Params) => P.ledgerReserveKcalPerKg * massOf(c, P);

/**
 * The individual's ledger, opened on first use from the state it already has: reserves from its condition (a founder
 * starts at the set point, a newborn in its mother's pregnancy condition) and the gut from its hunger.
 */
export function ledgerOf(c: Chimp, P: Params): EnergyLedger {
  const x = ix(c);
  if (x.en) return x.en;
  const dev = x.cond / P.ledgerCondSet - 1; // the inverse of the condition readout
  const p = c.position;
  return x.en = { gut: gutCap(c, P) * (1 - (c.hunger > 1 ? 1 : c.hunger < 0 ? 0 : c.hunger)), res: reserveCap(c, P) * (dev < -0.9 ? -0.9 : dev > 0.5 ? 0.5 : dev), in: 0, out: 0, x: p[0], y: p[1], z: p[2], milk: 0, lag: 0 };
}

/** hunger 0..1 = gut emptiness × appetite; appetite = set − gain × reserves ÷ usable reserve, clamped (readout; design). */
function setHunger(c: Chimp, L: EnergyLedger, P: Params): void {
  const M = massOf(c, P);
  const e = 1 - L.gut / (P.ledgerGutCapKcalPerKg * M), a = P.ledgerAppetiteSet - P.ledgerAppetiteGain * L.res / (P.ledgerReserveKcalPerKg * M);
  c.hunger = (e > 1 ? 1 : e < 0 ? 0 : e) * (a > 1 ? 1 : a < 0 ? 0 : a);
}

/** Optional tap for diagnostics (scripts/energy-diagnose.ts): called with each expenditure term. Never set by the app; reads only. */
export type EnergyTerm = 'rest' | 'activity' | 'walk' | 'climb' | 'carry' | 'pregnancy' | 'growth' | 'milk';
export const energyTap: { fn: ((c: Chimp, term: EnergyTerm, kcal: number) => void) | null } = { fn: null };

/** One tick of the balance for `c` (called from needs()): absorption, expenditure, and the hunger readout. */
export function energyTick(world: World, c: Chimp, x: ChimpX, sleeping: boolean): void {
  const P = paramsOf(world), r = rates(P), L = x.en ?? ledgerOf(c, P);
  const M = massOf(c, P), m75 = Math.pow(M, P.ledgerRmrExp), tap = energyTap.fn;
  const absorbed = L.gut * r.absorb;
  L.gut -= absorbed;
  const base = r.rest * m75, act = sleeping ? P.ledgerActSleep : P.ledgerActAwake;
  let out = base * act;
  if (tap) { tap(c, 'rest', base); tap(c, 'activity', base * (act - 1)); }
  if (c.pregnancy > 0) {
    // gestation: twice the mean cost × progress, so the mean over the pregnancy is the registry value
    const k = r.preg * m75 * 2 * Math.min(1, c.pregnancy / x.gestation);
    out += k; if (tap) tap(c, 'pregnancy', k);
  }
  // milk synthesis is limited: the store fills at the yield rate and holds ledgerMilkStoreH hours of it
  if (c.lactating) { const y = r.milk * m75, full = y * r.milkTicks; L.milk = L.milk + y < full ? L.milk + y : full; } else if (L.milk !== 0) L.milk = 0;
  // growth (E1b): the curve's gain for this tick is made, and paid for, only at or above the reserve set point; then any
  // surplus also buys back growth missed earlier. Below the set point the gain is not made and the animal falls behind.
  const g = growthKgPerY(c, P);
  if (g > 0) {
    const due = g * r.growShare * (world.ageRate < 1 ? Math.max(0, world.ageRate) : 1); // the natural rate, or slower with a slower life-history clock
    if (L.res >= 0) {
      let kg = due;
      if (L.lag > 0) { const back = Math.min(L.lag, L.res / r.kcalPerKg); L.lag -= back; kg += back; }
      const k = kg * r.kcalPerKg; out += k; if (tap) tap(c, 'growth', k);
    } else L.lag += due;
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

/** Energy the gut can still take (kcal). */
export function gutRoom(c: Chimp, P: Params): number {
  const room = gutCap(c, P) - ledgerOf(c, P).gut;
  return room > 0 ? room : 0;
}

/** Eat up to `kcal`: what fits goes into the gut. Returns the energy taken and refreshes the hunger readout. */
export function eat(c: Chimp, P: Params, kcal: number): number {
  const L = ledgerOf(c, P), room = gutCap(c, P) - L.gut;
  const take = kcal < room ? kcal : room > 0 ? room : 0;
  if (take > 0) { L.gut += take; L.in += take; }
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
  const milk = eat(infant, P, flow < ML.milk ? flow : ML.milk);
  if (milk <= 0) return;
  const cost = milk / P.ledgerMilkEff;
  ML.milk -= milk; ML.res -= cost; ML.out += cost;
  if (energyTap.fn) energyTap.fn(mother, 'milk', cost);
}

/** A piece of plant food handed to a begging offspring. */
export const sharePlant = (o: Chimp, P: Params) => eat(o, P, P.ledgerPlantShareKcal);

/**
 * Slow step (slowLife): condition reads reserves (ledgerCondSet at the set point, 0 when the usable reserve is gone).
 * Returns true when the reserve is exhausted, which is death by starvation.
 */
export function ledgerSlow(c: Chimp, x: ChimpX, P: Params): boolean {
  const L = x.en ?? ledgerOf(c, P), cap = reserveCap(c, P), v = P.ledgerCondSet * (1 + L.res / cap);
  x.cond = v > 1 ? 1 : v < 0 ? 0 : v;
  return L.res <= -cap;
}
