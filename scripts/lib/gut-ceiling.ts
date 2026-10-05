// Stage E1u (docs/staging/e1u-prereg.md §2.3): the gut-limited ceiling of daily absorbed energy, offline. No world tick:
// the gut's own first-order dynamics (src/sim/energy.ts energyTick's digesta block and eat()) are mirrored here for one
// animal kept eating whenever its foregut has room through an active day, then fasting through the night, until the
// daily cycle repeats. Every capacity, dry matter per kcal and ingestion rate is read from the model's own exported pure
// functions (digestaCaps, dryMatterPerKcal, fruitRate, fruitKcalPerUnit, fallbackKcalPerH, intakeSize) at the parameter
// object given, so a parameter variant is a copy of the world's parameters with one value changed. Measurement only.
//
// Mirrored per tick (energy.ts, in the sim's order: needs() → energyTick, then executeAction → eat):
//   foregut   a = 1 − exp(−dt/ledgerGutEmptyH); the fibre it moves must fit in the hindgut, else a is scaled down to the
//             hindgut's room (the colonic brake); the non-fibre energy leaving is absorbed, dry matter and fibre leave
//             in the same share, the fibre enters the hindgut;
//   hindgut   a share 1 − exp(−k dt) leaves, k = 1 ÷ ((digestaMrtH − ledgerGutEmptyH)(1 − d)), of which a share d
//             (digestaNdfDigestibility) is fermented at digestaFermentKcalPerG per gram and the rest is passed out;
//   cost      diet-induced thermogenesis = digestaTefFrac × energy absorbed (charged as spending);
//   eating    each active tick the animal takes its ingestion rate of the diet's mix, up to the foregut's dry-matter room.
// A food per formula kcal (energy.ts food()): g = dry matter g/min ÷ kcal/min, fibre = g × NDF share, non-fibre energy =
// 1 − fibre × digestaNdfCreditKcalPerG.
import { digestaCaps, dryMatterPerKcal, fallbackKcalPerH, fruitKcalPerUnit, intakeSize, plantKcalPerMin } from '../../src/sim/energy';
import { fruitRate } from '../../src/sim/intake';
import type { Params } from '../../src/sim/params';
import { TICK_HOURS } from '../../src/sim/state';
import type { Chimp } from '../../src/types';

export type PlantKind = 'drupe' | 'fig' | 'fallback';
export const PLANT_KINDS: readonly PlantKind[] = ['drupe', 'fig', 'fallback'];
/** Shares of the diet's formula energy (the model's food units) by kind; they need not sum to 1 (normalised). */
export type Diet = Record<PlantKind, number>;

/** One food per formula kcal: dry matter (g), fibre (g), non-fibre energy (kcal), as energy.ts food() builds it. */
export interface FoodComp { g: number; fib: number; nf: number }
/** NDF share of a food's dry matter, from the registry (energy.ts digesta(): one value for drupes and figs). */
export const ndfOf = (P: Params, kind: PlantKind) => kind === 'fallback' ? P.digestaFallbackNdf : P.digestaFruitNdf;
/** The food's composition per formula kcal, from the model's dry matter per kcal (dryMatterPerKcal) and the registry's NDF share and credit. */
export function foodComp(P: Params, kind: PlantKind): FoodComp {
  const g = dryMatterPerKcal(P, kind), fib = g * ndfOf(P, kind);
  return { g, fib, nf: 1 - fib * P.digestaNdfCreditKcalPerG };
}
/** Energy the body draws from one formula kcal of the food over the gut's passage (non-fibre + fermented fibre), before diet-induced thermogenesis. */
export const absorbedPerKcal = (P: Params, f: FoodComp) => f.nf + P.digestaFermentKcalPerG * P.digestaNdfDigestibility * f.fib;

/** The animal's ingestion rate of each plant food at full light (formula kcal per hour), as execution.ts forageTick and fallbackTick feed it. */
export function ingestionRates(c: Chimp, P: Params, fallbackYield = 1): Record<PlantKind, number> {
  const perH = fruitRate(c, P).fruitPerH;
  return {
    drupe: perH * fruitKcalPerUnit(P, false),
    fig: perH * fruitKcalPerUnit(P, true),
    fallback: fallbackKcalPerH(P) * fallbackYield * (P.ledgerInfantIntake === 1 ? intakeSize(c, P) : 1),
  };
}

export interface CeilingOpts {
  /** Hours a day the animal eats whenever the foregut has room (from dawn); the rest of the day it fasts. */ activeH: number;
  /** Days simulated; the last `avgDays` are averaged (the cycle is periodic well before 20 days). */ days: number; avgDays: number;
  /** Relative yield of the fallback where it feeds (1 = a mean cell at full stock). */ fallbackYield: number;
  /**
   * Share of the active day spent eating, in cycles of `cycleMin` minutes (eat first, then pause): 1 = the foregut is
   * topped up every active tick (the ceiling); below 1 the gut keeps passing while the animal does something else.
   */ eatShare: number; cycleMin: number;
  /** Optional starting state (g of dry matter, fibre, hindgut fibre; kcal non-fibre); default empty. */ start?: { dm: number; fib: number; hind: number; gut: number };
}
export const CEILING_DEFAULTS: CeilingOpts = { activeH: 12, days: 30, avgDays: 7, fallbackYield: 1, eatShare: 1, cycleMin: 50 };

export interface CeilingDay {
  /** Formula kcal and dry matter (g) eaten, fibre swallowed (g). */ fin: number; dm: number; fibIn: number;
  /** Energy absorbed (non-fibre + fermented), of which from fermentation; diet-induced thermogenesis; absorbed − thermogenesis. */ absorbed: number; fermented: number; tef: number; net: number;
  /** Fibre passed out, g. */ fecG: number;
  /** Shares of active ticks ending with the foregut / hindgut ≥ 95% full, and with the hindgut braking the foregut. */ foreFull: number; hindFull: number; braked: number;
  /** Hindgut fill (÷ capacity) at dawn and at the end of the active day; foregut fill at the end of the active day. */ hindDawn: number; hindDusk: number; foreDusk: number;
  /** Foregut and hindgut capacities (g of dry matter, g of fibre). */ capF: number; capH: number;
}

/**
 * The daily cycle of a gut kept as full as it allows through `activeH` hours a day on `diet`, for animal `c` under
 * parameters `P` (its capacities from digestaCaps, its ingestion rates from ingestionRates). Pure: reads the animal and
 * the parameters only (digestaCaps opens no ledger; massOf reads the ledger's mass).
 */
export function gutCeiling(c: Chimp, P: Params, diet: Diet, opts: Partial<CeilingOpts> = {}): CeilingDay {
  const o = { ...CEILING_DEFAULTS, ...opts };
  const [capF, capH] = digestaCaps(c, P);
  const rates = ingestionRates(c, P, o.fallbackYield);
  const tot = PLANT_KINDS.reduce((s, k) => s + Math.max(0, diet[k]), 0);
  if (!(tot > 0) || !(capF > 0)) throw new Error('gutCeiling: empty diet or no digesta (ledgerDigesta must be 1)');
  // the mix per formula kcal, and its ingestion rate (eating time per kcal adds up over the foods)
  let g = 0, fib = 0, nf = 0, hPerKcal = 0;
  for (const k of PLANT_KINDS) {
    const p = Math.max(0, diet[k]) / tot; if (!(p > 0)) continue;
    const f = foodComp(P, k); g += p * f.g; fib += p * f.fib; nf += p * f.nf; hPerKcal += p / rates[k];
  }
  const R = 1 / hPerKcal; // formula kcal per hour of eating
  const dt = TICK_HOURS, ticksDay = Math.round(24 / dt), activeTicks = Math.round(o.activeH / dt);
  const cycle = Math.max(1, Math.round(o.cycleMin / 60 / dt)), eatTicks = Math.round(cycle * Math.min(1, Math.max(0, o.eatShare)));
  const absorb = 1 - Math.exp(-dt / P.ledgerGutEmptyH);
  const d = P.digestaNdfDigestibility, kp = 1 / Math.max(1e-6, P.digestaMrtH - P.ledgerGutEmptyH), k = kp / Math.max(1e-6, 1 - d);
  const leaveH = 1 - Math.exp(-k * dt), Y = P.digestaFermentKcalPerG;
  let Dm = o.start?.dm ?? 0, Fib = o.start?.fib ?? 0, Hind = o.start?.hind ?? 0, Gut = o.start?.gut ?? 0;
  const acc = { fin: 0, dm: 0, fibIn: 0, absorbed: 0, fermented: 0, tef: 0, fecG: 0, foreFull: 0, hindFull: 0, braked: 0, hindDawn: 0, hindDusk: 0, foreDusk: 0 };
  const from = o.days - o.avgDays;
  for (let day = 0; day < o.days; day++) {
    const keep = day >= from;
    if (keep) acc.hindDawn += Hind / capH;
    for (let t = 0; t < ticksDay; t++) {
      // energyTick's digesta block
      let a = absorb;
      const move = Fib * a, room = capH - Hind;
      let braked = false;
      if (move > room) { a = room > 0 ? a * room / move : 0; braked = true; }
      let abs = Gut * a; Gut -= abs;
      const fm = Fib * a;
      Dm -= Dm * a; Fib -= fm; Hind += fm;
      const leave = Hind * leaveH, fer = leave * d;
      Hind -= leave; abs += fer * Y;
      if (keep) { acc.absorbed += abs; acc.fermented += fer * Y; acc.tef += abs * P.digestaTefFrac; acc.fecG += leave - fer; }
      // eat (execution.ts → energy.ts eat): the ingestion rate, up to the foregut's room
      const active = t < activeTicks;
      if (active) {
        const eating = t % cycle < eatTicks;
        const want = eating ? R * dt : 0, roomK = (capF - Dm) / g, take = want < roomK ? want : roomK > 0 ? roomK : 0;
        Dm += take * g; Fib += take * fib; Gut += take * nf;
        if (keep) {
          acc.fin += take; acc.dm += take * g; acc.fibIn += take * fib;
          if (Dm >= 0.95 * capF) acc.foreFull++;
          if (Hind >= 0.95 * capH) acc.hindFull++;
          if (braked) acc.braked++;
        }
        if (keep && t === activeTicks - 1) { acc.hindDusk += Hind / capH; acc.foreDusk += Dm / capF; }
      }
    }
  }
  const n = o.avgDays, nt = n * activeTicks;
  return {
    fin: acc.fin / n, dm: acc.dm / n, fibIn: acc.fibIn / n, absorbed: acc.absorbed / n, fermented: acc.fermented / n, tef: acc.tef / n,
    net: (acc.absorbed - acc.tef) / n, fecG: acc.fecG / n, foreFull: acc.foreFull / nt, hindFull: acc.hindFull / nt, braked: acc.braked / nt,
    hindDawn: acc.hindDawn / n, hindDusk: acc.hindDusk / n, foreDusk: acc.foreDusk / n, capF, capH,
  };
}

/** A copy of the parameters with some values replaced (a new object, so the model's per-parameter caches rebuild). */
export const withParams = (P: Params, over: Partial<Record<keyof Params, number>>): Params => ({ ...P, ...over }) as Params;

/** Diet shares from a fallback share of plant energy and a fig share of the fruit energy. */
export const dietOf = (fallback: number, figOfFruit: number): Diet => ({ drupe: (1 - fallback) * (1 - figOfFruit), fig: (1 - fallback) * figOfFruit, fallback });

/** Formula kcal per minute of each plant food at full rate (the registry's values the model reads, plantKcalPerMin). */
export const kcalPerMinOf = (P: Params): Record<PlantKind, number> => ({ drupe: plantKcalPerMin(P, 'drupe'), fig: plantKcalPerMin(P, 'fig'), fallback: plantKcalPerMin(P, 'fallback') });
