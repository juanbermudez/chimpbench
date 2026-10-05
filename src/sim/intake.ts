import type { Chimp, World } from '../types';
import { boutRoom, energyNeed, fallbackKcalPerH, fruitKcalPerUnit, gutBout, gutCap, gutRoom, intakeSize, locomotionKcal, refGutCap, type GutBout } from './energy';
import { fallbackOn, fallbackValue } from './fallback';
import type { Params } from './params';
import { forageYield } from './phenology';

// Expected food intake of feeding options, from the sim's own rates (execution.ts forageTick, fallback.ts), walk
// included: the marginal-value currency [charnov1976] of design A (docs/decide-jev-design.md §4). Shared by the rules'
// intake valuation (stage C13b, `intakeValue`, src/sim/candidates.ts) and the Jev situation facts (src/decide/facts.ts),
// so both compute the same numbers. Pure.
// Stage E1 (energyLedger): the same rates in kcal, expressed as the share of the animal's gut capacity filled per hour
// (the unit of the derived hunger at full appetite), so every ratio and feeding time below keeps its meaning.

/** Ripe fruit intake for this animal (fruit units per hour) and the hunger it removes per hour: intake × skill × young factor. */
export function fruitRate(c: Chimp, P: Params): { fruitPerH: number; hungerPerH: number } {
  // stage E1c (ledgerInfantIntake): intake capacity by body size instead of the young factor
  const fruitPerH = P.energyLedger === 1 && P.ledgerInfantIntake === 1
    ? P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * intakeSize(c, P)
    : P.fruitIntakePerH * (P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging) * (c.age < 5 ? P.fruitIntakeYoungFactor : 1);
  if (P.energyLedger === 1) return { fruitPerH, hungerPerH: fruitPerH * fruitKcalPerUnit(P, false) / gutCap(c, P) };
  return { fruitPerH, hungerPerH: fruitPerH * P.fruitHungerFactor };
}

/** Hunger removed per hour by fallback foods (leaves, pith, herbs) where the animal stands. */
export function leafRate(world: World, x: number, z: number, P: Params, c?: Chimp): number {
  // ledger: per gut capacity of `c` (of an adult female when no animal is given)
  if (P.energyLedger === 1) return fallbackKcalPerH(P) * (fallbackOn(P) ? fallbackValue(world, x, z) : P.patchEcology === 1 ? forageYield(world, x, z) : 1)
    / (c ? gutCap(c, P) : refGutCap(P)) * (c && P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1);
  if (fallbackOn(P)) return P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio * fallbackValue(world, x, z);
  return P.fallbackHungerPerH * (P.patchEcology === 1 ? forageYield(world, x, z) : 1);
}

/**
 * What fallback foods are worth relative to this animal's ripe fruit (candidates.ts, C13b): the full-stock rate when
 * fallback depletes (the best cell in view scales it), else the rate where it stands. `fruitH` is fruitRate(c).hungerPerH.
 */
export function leafWorth(world: World, c: Chimp, x: number, z: number, P: Params, fruitH: number): number {
  if (P.energyLedger === 1) return (fallbackOn(P) ? fallbackKcalPerH(P) / gutCap(c, P) * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1) : leafRate(world, x, z, P, c)) / fruitH;
  return (fallbackOn(P) ? P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio : leafRate(world, x, z, P)) / fruitH;
}

export interface TreeIntake {
  /** Hunger removed per hour while feeding. */
  rateH: number;
  /** Hours of feeding the crop offers (its share with `feeders` others), up to what the animal needs. */
  feedH: number; walkH: number;
  /** rateH × feedH / (walkH + feedH): hunger removed per hour including the walk. */
  perHourInclWalk: number;
  /** Thirst removed per hour including the walk (fruit carries water). */
  thirstPerHInclWalk: number;
}

/**
 * A fruit tree at `distM` with a believed `crop` shared with `feeders` others. `hungerCap` false: the feeding time is the
 * crop share alone (stage C13c, `intakeCropOnly`: the rules' food worth already scales with hunger, so capping the time
 * by hunger too counted it twice). The Jev facts keep the cap.
 */
export function treeIntake(c: Chimp, P: Params, crop: number, feeders: number, distM: number, hungerCap = true, speed = P.walkMps): TreeIntake {
  const { fruitPerH, hungerPerH } = fruitRate(c, P);
  const walkH = distM / speed / 3600; // stage E2i (walkGait): the animal's walking speed (gait.ts tripSpeed), walkMps by default
  // feeding lasts until the crown's share is eaten or the hunger is gone, whichever comes first
  const share = crop / (1 + feeders);
  if (P.energyLedger === 1 && P.ledgerDrive === 1) {
    // stage E1e: the energy the crown can deliver over a bout that ends at the crop share, the need or a full foregut
    // (energy.ts boutRoom), at the intake rate; the hunger cap does not apply (the need replaces it)
    const kcalPerFruit = fruitKcalPerUnit(P, false), R = fruitPerH * kcalPerFruit, cap = gutCap(c, P);
    const E = Math.max(0, Math.min(share * kcalPerFruit, energyNeed(c, P), boutRoom(c, P, R))), t = R > 0 ? E / R : 0;
    const span = walkH + t;
    return { rateH: hungerPerH, feedH: t, walkH, perHourInclWalk: span > 0 ? E / span / cap : 0, thirstPerHInclWalk: span > 0 ? E / kcalPerFruit * P.fruitThirstFactor / span : 0 };
  }
  const byCrop = share / Math.max(1e-9, fruitPerH);
  // the ledger's hunger includes appetite (0.5 at the set point), so a bout lasts until the gut is full: cap by its emptiness
  const capH = hungerCap ? (P.energyLedger === 1 ? gutRoom(c, P) / gutCap(c, P) : c.hunger) : 0;
  const feedH = Math.max(0, hungerCap ? Math.min(byCrop, capH / Math.max(1e-9, hungerPerH)) : byCrop);
  const frac = feedH > 0 ? feedH / (walkH + feedH) : 0;
  return { rateH: hungerPerH, feedH, walkH, perHourInclWalk: hungerPerH * frac, thirstPerHInclWalk: fruitPerH * P.fruitThirstFactor * frac };
}

/**
 * netRateShare's terms that depend on the animal alone (its full ripe-fruit rate R and its bout room at R), kept across
 * the many trees of one valuation (performance only: the same values, computed the first time netRateShare needs them).
 * Valid while the animal's body and gut do not change: computeCandidates resets it at every call (it mutates nothing of
 * the animal; a ledger opened on first use is opened at the first bout room, as without the memo).
 */
export interface RateMemo {
  c: Chimp | null; P: Params | null; kcal: number; R: number; room: number; roomSet: boolean;
  /** Stage E1s (gutValue): gutBout's terms for drupes and figs, kept for the animal and parameters in `gc`, `gP`. */
  gc: Chimp | null; gP: Params | null; gd: GutBout; gdSet: boolean; gf: GutBout; gfSet: boolean;
}
/** A GutBout to fill (a function declaration: modules that import this one at load time may call it before energy.ts is initialised). */
function gutSlot(): GutBout { return { R: 0, kcal: 0, room: 0, held: 0, pass: 0, need: 0 }; }
export const rateMemo = (): RateMemo => ({ c: null, P: null, kcal: 0, R: 0, room: 0, roomSet: false, gc: null, gP: null, gd: gutSlot(), gdSet: false, gf: gutSlot(), gfSet: false });

/**
 * Stage E3c (forageRate; docs/staging/e3c-prereg.md §5): the net energy rate a fruit tree promises, as a share of this
 * animal's own full ripe-fruit rate R (kcal/h): (E − C) ÷ (walk + E ÷ (R × see)) ÷ R, the long-term average rate of net
 * energy gain of the classical foraging models [charnov1976, stephensKrebs1986]. E is the energy of one bout there: the
 * crop it believes ÷ (1 + the feeders it sees), up to what its foregut takes while it eats (E1e's boutRoom), at its own
 * intake rate; its need is not in it (hunger decides whether to forage, through the drive; not where). C is the energy
 * of the walk and the climb (locomotionKcal: sockol2007's net cost of transport, the ledger's climbing work). The walk
 * takes distM ÷ (walkMps × pace) and feeding runs at the vision `see` (E2c's light on arrival; 1 by day). A tree whose
 * bout does not pay its walk is worth 0. Drupe energy, as treeIntake. Stage E2j (tripBodyCost): `extraH` hours of climbing
 * join the walk's time and `carryK` kcal of a riding load join the trip's energy (gait.ts tripClimbH, riderKcal). Pure.
 */
export function netRateShare(c: Chimp, P: Params, crop: number, feeders: number, distM: number, climbM: number, pace = 1, see = 1, speed = P.walkMps, extraH = 0, carryK = 0, yieldK = 1, memo?: RateMemo): number {
  let kcal: number, R: number;
  if (memo !== undefined && memo.c === c && memo.P === P) { kcal = memo.kcal; R = memo.R; }
  else {
    kcal = fruitKcalPerUnit(P, false); R = fruitRate(c, P).fruitPerH * kcal;
    if (memo !== undefined) { memo.c = c; memo.P = P; memo.kcal = kcal; memo.R = R; memo.roomSet = false; }
  }
  if (!(R > 0) || !(see > 0)) return 0;
  // the bout room at R: computed where it always was (its first use may open the animal's ledger), then reused
  let room: number;
  if (memo === undefined) room = boutRoom(c, P, R);
  else { if (!memo.roomSet) { memo.room = boutRoom(c, P, R); memo.roomSet = true; } room = memo.room; }
  // stage E3g (experienceValue bit 1; experience.ts): `yieldK` the share of a trip's bout the animal's trips have
  // delivered, so a trip is worth the meal it is expected to give (1 with the switch off: × 1 leaves today's numbers)
  const E = Math.min(Math.max(0, crop) / (1 + feeders) * kcal, room) * yieldK;
  if (!(E > 0)) return 0;
  // stage E2j (tripBodyCost; gait.ts): `carryK` the energy of a load riding on the animal, `extraH` the hours spent
  // climbing down and up; both 0 with the switch off (adding 0 leaves today's numbers bit for bit)
  const C = locomotionKcal(c, P, distM, climbM) + carryK;
  // stage E2i (walkGait): `speed` is the animal's walking speed (gait.ts tripSpeed), walkMps by default
  return E > C ? (E - C) / (distM / (speed * pace) / 3600 + extraH + E / (R * see)) / R : 0;
}

const _gbD = gutSlot(), _gbF = gutSlot(), _gbB = gutSlot();
/** gutBout's terms for a crown's food at the animal's full ripe-fruit rate in that food, kept in the memo for this animal when given. */
function crownBout(c: Chimp, P: Params, fig: boolean, memo?: RateMemo): GutBout {
  if (memo !== undefined) {
    if (memo.gc !== c || memo.gP !== P) { memo.gc = c; memo.gP = P; memo.gdSet = false; memo.gfSet = false; }
    if (fig ? memo.gfSet : memo.gdSet) return fig ? memo.gf : memo.gd;
    if (fig) memo.gfSet = true; else memo.gdSet = true;
  }
  const kcal = fruitKcalPerUnit(P, fig), g = gutBout(c, P, fig ? 'fig' : 'drupe', fruitRate(c, P).fruitPerH * kcal, memo !== undefined ? (fig ? memo.gf : memo.gd) : fig ? _gbF : _gbD);
  g.kcal = kcal;
  return g;
}

/**
 * Stage E1s (gutValue; docs/staging/e1s-prereg.md §2 and the integrator's ruling below it): netRateShare with the bout the
 * gut allows, in the crown's own food (figs as figs: their kcal per unit, ingestion rate and dry matter). Phase 1 as
 * netRateShare: the foregut's room filled at the ingestion rate (boutRoom's form), up to the crop share. Phase 2: the
 * food at the rate a full foregut passes it, for as long as the gut takes to pass what it holds now (energy.ts gutBout),
 * while the bout is below the crop share and the need a full foregut does not sate (the reserve deficit; iteration 2).
 * The rate is still a share of the animal's own full ripe-fruit rate R (drupes), walk, climb and the trip's factors as
 * netRateShare has them. A drupe crown whose bout has no second phase (an empty gut, an animal at or above its set point,
 * or a crop or need that the room holds) is netRateShare itself, bit for bit. At a full gut a depleted animal values a
 * crown at the passage rate of its food (energy per gram), less its walk. Design assumption (the digestive rate model,
 * verlindenWiley1989, not verified); no new magnitude. Pure (as netRateShare).
 */
export function gutRateShare(c: Chimp, P: Params, fig: boolean, crop: number, feeders: number, distM: number, climbM: number, pace = 1, see = 1, speed = P.walkMps, extraH = 0, carryK = 0, yieldK = 1, memo?: RateMemo): number {
  const g = crownBout(c, P, fig, memo);
  const share = Math.max(0, crop) / (1 + feeders) * g.kcal;
  const e1 = share < g.room ? share : g.room, top = share < g.need ? share : g.need;
  const e2 = top > e1 ? (top - e1 < g.held ? top - e1 : g.held) : 0;
  if (!fig && !(e2 > 0)) return netRateShare(c, P, crop, feeders, distM, climbM, pace, see, speed, extraH, carryK, yieldK, memo);
  const R = fig ? crownBout(c, P, false, memo).R : g.R; // the currency: the animal's own full ripe-fruit (drupe) rate
  if (!(R > 0) || !(g.R > 0) || !(see > 0)) return 0;
  const E = (e1 + e2) * yieldK;
  if (!(E > 0)) return 0;
  const C = locomotionKcal(c, P, distM, climbM) + carryK, r = g.R * see, q = g.pass < r ? g.pass : r;
  return E > C ? (E - C) / (distM / (speed * pace) / 3600 + extraH + (e1 / r + (e2 > 0 ? e2 / q : 0)) * yieldK) / R : 0;
}

/**
 * Stage E1s (gutValue): the factor on the fallback's value where the animal stands (computeCandidates: the crown's drive ×
 * its rate share) that the bout the gut allows keeps: the bout's mean rate over the rate while the room fills. `rateK`
 * the fallback's intake at full light (kcal/h), `see` the vision it is eaten at. Phase 1 as today (the room filled at that
 * rate; the fallback has no crop limit), phase 2 the passage rate while the gut passes what it holds, up to the need a
 * full foregut does not sate (energy.ts gutBout: the reserve deficit). 1 when the bout has no second phase and the gut
 * has room (an empty gut, an animal at or above its set point, a need the room holds, or a rate the gut passes as fast as
 * it is eaten: today's value exactly); q ÷ (rate × see) at a full gut, so the fallback is then worth its passage rate
 * (energy per gram); 0 at a full gut with no need (a sated animal's bout is empty). Pure (as gutBout).
 */
export function fallbackGutFactor(c: Chimp, P: Params, rateK: number, see: number): number {
  const r = rateK * see;
  if (!(r > 0)) return 1;
  const g = gutBout(c, P, 'fallback', rateK, _gbB), e1 = g.room;
  if (e1 === Infinity) return 1;
  const e2 = g.need > e1 ? (g.need - e1 < g.held ? g.need - e1 : g.held) : 0;
  if (!(e2 > 0)) return e1 > 0 ? 1 : 0;
  const q = g.pass < r ? g.pass : r;
  return (e1 + e2) / (e1 + e2 * r / q);
}

/**
 * Fruit units that would meet this animal's need (the crop-share and trip-cost rules of candidates.ts): the timers'
 * hunger ÷ fruitHungerFactor; under the ledger the gut's kcal at this hunger (or, stage E1e, the energy need) ÷ the energy
 * of a fruit unit. (Under the ledger these rules used the timers' conversion; both are off by default.)
 */
export function needFruit(c: Chimp, P: Params, h: number): number {
  if (P.energyLedger !== 1) return h / P.fruitHungerFactor;
  const kcal = P.ledgerDrive === 1 ? Math.max(0, energyNeed(c, P)) : h * gutCap(c, P);
  return kcal / fruitKcalPerUnit(P, false);
}
