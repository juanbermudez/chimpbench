// Stage E1r readouts (docs/staging/e1r-prereg.md §5), pure functions over e-bench parts: monthly energy budgets by class
// from the class readout every energy run holds (energy.daily, energy.trajSeeds, energy.acc), and the finer monthly and
// per-animal tables from the per-animal daily records of `e-bench --animal-days` (energy.animalDays). Nothing here runs
// a simulation or reads a world; scripts/lean-season.ts reads the files and the end worlds.
//
// Calendar: the run opens on day-of-year startDoy (sim/state.ts START_DOY, 28 September) at 06:30, and a window day d
// starts at 06:30 of day-of-year startDoy + burnIn + d; its calendar month is the month of that date (365-day years, as
// phenology.ts simDay). A 365-day window from a 30-day burn-in runs 28 October to 27 October: "Oct" pools its first 4 and
// last 27 days.
import { AD, type Day, type EnergyAcc } from './energy-probe';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const DAY_TICKS = 5760;

/** Calendar month (0 = January) of window day `d`. */
export function monthOfDay(d: number, burnIn: number, startDoy: number): number {
  const doy0 = (((startDoy - 1 + burnIn + d) % 365) + 365) % 365;
  let m = 0;
  while (m < 11 && doy0 >= MONTH_START[m + 1]) m++;
  return m;
}
/** The calendar months of a window of `days` days, in the order their first day occurs. */
export function monthOrder(days: number, burnIn: number, startDoy: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < days; d++) { const m = monthOfDay(d, burnIn, startDoy); if (!out.includes(m)) out.push(m); }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// The class readout (every energy run): energy.daily, energy.trajSeeds, energy.acc
// ---------------------------------------------------------------------------------------------------------------------

/** One class in one month, per animal-day unless named otherwise. */
export interface MonthCell {
  /** Animal-days. */ n: number;
  /** Minutes in which own food was swallowed (milk excluded; with the ledger off, the forage act in a crown or on the ground). */ eatMin: number;
  /** Energy in (fibre at its fermentation yield; milk included for infants), passed out, absorbed (in − out of the gut), spent, net (absorbed − spent). */
  kin: number; fec: number; absorbed: number; out: number; net: number;
  /** Energy in per kg^0.75 (the class's mean of mass^0.75 over the window), null without it. */ kinPerKg75: number | null;
  /** Dry matter eaten (g). */ dm: number;
  /** Energy in per eating minute (weaned classes; infants' energy in includes milk drunk outside eating ticks). */ kinPerEatMin: number;
  /** Daylight means: hunger, share of daylight with the foregut ≥ 95% full. */ hunger: number; foreFull: number;
  /** Mean reserves ÷ usable store over the month's days and the seeds (energy.trajSeeds), null for classes it does not hold. */ reserve: number | null;
}
export type MonthTable = Record<string, Record<number, MonthCell>>;

const absent = (v: unknown) => v === undefined || v === null;

/**
 * Pools the parts' class readouts by class and calendar month (sums over seeds and days, then per animal-day; the
 * reserve is the mean of the seeds' daily class means).
 */
export function dailyMonthly(parts: EnergyAcc[], burnIn: number, startDoy: number): MonthTable {
  const sums: Record<string, Record<number, Day>> = {};
  const res: Record<string, Record<number, { s: number; n: number }>> = {};
  const m75: Record<string, { s: number; t: number }> = {};
  for (const p of parts) {
    for (const [cls, days] of Object.entries(p.daily)) days.forEach((d, i) => {
      if (absent(d)) return;
      const m = monthOfDay(i, burnIn, startDoy), A = ((sums[cls] ??= {})[m] ??= { ticks: 0, dayTicks: 0, eating: 0, kin: 0, fec: 0, out: 0, dm: 0, hunger: 0, foreFull: 0 });
      for (const k of Object.keys(A) as (keyof Day)[]) A[k] += d![k] ?? 0;
    });
    for (const series of p.trajSeeds) for (const [cls, v] of Object.entries(series)) v.forEach((x, i) => {
      if (absent(x)) return;
      const R = ((res[cls] ??= {})[monthOfDay(i, burnIn, startDoy)] ??= { s: 0, n: 0 }); R.s += x; R.n++;
    });
    for (const [cls, a] of Object.entries(p.acc)) { const M = (m75[cls] ??= { s: 0, t: 0 }); M.s += a.m75; M.t += a.ticks; }
  }
  const out: MonthTable = {};
  for (const [cls, months] of Object.entries(sums)) for (const [mk, A] of Object.entries(months)) {
    const n = A.ticks / DAY_TICKS, R = res[cls]?.[+mk], M = m75[cls], k75 = M && M.t > 0 ? M.s / M.t : 0, absorbed = (A.kin - A.fec) / n;
    (out[cls] ??= {})[+mk] = { n, eatMin: A.eating / 4 / n, kin: A.kin / n, fec: A.fec / n, absorbed, out: A.out / n, net: absorbed - A.out / n, kinPerKg75: k75 > 0 ? A.kin / n / k75 : null,
      dm: A.dm / n, kinPerEatMin: A.eating > 0 ? A.kin / (A.eating / 4) : NaN, hunger: A.dayTicks ? A.hunger / A.dayTicks : NaN, foreFull: A.dayTicks ? A.foreFull / A.dayTicks : NaN, reserve: R && R.n ? R.s / R.n : null };
  }
  return out;
}

/** The year's spending by term, eating minutes, fruit share of eating ticks and ground km per animal-day, by class. */
export function yearByClass(parts: EnergyAcc[]): Record<string, { n: number; terms: Record<string, number>; out: number; kin: number; eatMin: number; fruitShare: number; groundKm: number; reserve: number; m75: number }> {
  const o: Record<string, { n: number; terms: Record<string, number>; out: number; kin: number; eatMin: number; fruitShare: number; groundKm: number; reserve: number; m75: number }> = {};
  const sum: Record<string, { ticks: number; terms: Record<string, number>; kin: number; eating: number; fruit: number; walked: number; res: number; m75: number }> = {};
  for (const p of parts) for (const [cls, a] of Object.entries(p.acc)) {
    const S = (sum[cls] ??= { ticks: 0, terms: {}, kin: 0, eating: 0, fruit: 0, walked: 0, res: 0, m75: 0 });
    S.ticks += a.ticks; S.kin += a.kin; S.eating += a.eating; S.fruit += a.fruit; S.walked += a.walked; S.res += a.res; S.m75 += a.m75;
    for (const [t, v] of Object.entries(a.out)) S.terms[t] = (S.terms[t] ?? 0) + v;
  }
  for (const [cls, S] of Object.entries(sum)) {
    if (!S.ticks) continue;
    const n = S.ticks / DAY_TICKS, terms = Object.fromEntries(Object.entries(S.terms).map(([t, v]) => [t, v / n]));
    o[cls] = { n, terms, out: Object.values(terms).reduce((a, b) => a + b, 0), kin: S.kin / n, eatMin: S.eating / 4 / n, fruitShare: S.eating ? S.fruit / S.eating : NaN, groundKm: S.walked / n / 1000, reserve: S.res / S.ticks, m75: S.m75 / S.ticks };
  }
  return o;
}

// ---------------------------------------------------------------------------------------------------------------------
// Per-animal daily records (e-bench --animal-days)
// ---------------------------------------------------------------------------------------------------------------------

/** The class of an animal-day row, by its state at the day's end (adolescents and juveniles by sex). */
export function rowClass(r: (number | null)[]): string {
  const age = r[AD.age] as number, f = r[AD.female] === 1;
  if (age < 0.5) return 'infant < 0.5 y';
  if (age < 2) return 'infant 0.5–2 y';
  if (age < 5) return 'infant 2–5 y';
  if (age < 12) return `juvenile 5–12 y ${f ? 'F' : 'M'}`;
  if (age < 15) return `adolescent 12–15 y ${f ? 'F' : 'M'}`;
  if (!f) return 'adult male';
  if (r[AD.lactating] === 1) return 'female, lactating';
  return (r[AD.pregnancy] as number) > 0 ? 'female, pregnant' : 'female, other';
}
export const ROW_CLASSES = ['adult male', 'female, other', 'female, pregnant', 'female, lactating', 'adolescent 12–15 y F', 'adolescent 12–15 y M', 'juvenile 5–12 y F', 'juvenile 5–12 y M',
  'infant 2–5 y', 'infant 0.5–2 y', 'infant < 0.5 y'] as const;

/** Sums of the additive fields (ticks onward) of rows, with the reserve ÷ store summed per row and the row count. */
export interface RowSum { rows: number; resRel: number; resRows: number; mRes: number; mResRows: number; f: number[] }
const ADDITIVE_FROM = AD.ticks;
function addRow(S: RowSum, r: (number | null)[]): void {
  S.rows++;
  for (let k = ADDITIVE_FROM; k < r.length; k++) S.f[k] += (r[k] as number) || 0;
  const res = r[AD.res] as number, store = r[AD.store] as number;
  if (Number.isFinite(res) && store > 0) { S.resRel += res / store; S.resRows++; }
  if (typeof r[AD.motherRes] === 'number' && Number.isFinite(r[AD.motherRes])) { S.mRes += r[AD.motherRes] as number; S.mResRows++; }
}
const blankSum = (len: number): RowSum => ({ rows: 0, resRel: 0, resRows: 0, mRes: 0, mResRows: 0, f: new Array<number>(len).fill(0) });

/** What a sum of rows says per animal-day (see energy-probe.ts for each field). */
export interface RowCell {
  n: number;
  eatMin: number; eatMinByKind: { drupe: number; fig: number; fallback: number; meat: number };
  /** Share of own-food eating minutes at a full foregut; of eating minutes on fallback foods; own food (formula kcal) per eating minute. */
  eatFullShare: number; fallbackTimeShare: number; ownPerEatMin: number;
  /** Formula energy eaten (the food's own kcal units, milk and food handed over included). */ fin: number;
  kin: number; fec: number; absorbed: number; out: number; net: number; dm: number;
  /** Food taken by kind (formula kcal; shared = handed over by a mother), and the share of plant energy from drupes, figs and fallback. */
  eaten: { drupe: number; fig: number; fallback: number; meat: number; milk: number; shared: number }; plantShare: { drupe: number; fig: number; fallback: number };
  terms: { rest: number; activity: number; walk: number; climb: number; carry: number; pregnancy: number; growth: number; milk: number; digestion: number };
  walkKm: number;
  /** Shares of daylight by act. */ acts: { crown: number; toTree: number; ground: number; travel: number; rest: number; social: number; nurse: number; drink: number; other: number };
  hunger: number; fill: number; fullDay: number; party: number; charged: number; feedCharged: number;
  reserve: number | null; motherReserve: number | null;
}
export function rowCell(S: RowSum): RowCell {
  const f = S.f, n = f[AD.ticks] / DAY_TICKS, dt = f[AD.dayTicks] || NaN, per = (k: number) => f[k] / n;
  const plant = f[AD.eDrupe] + f[AD.eFig] + f[AD.eFallback];
  const absorbed = (f[AD.kin] - f[AD.fec]) / n;
  const terms = { rest: per(AD.oRest), activity: per(AD.oActivity) + per(AD.oWild), walk: per(AD.oWalk), climb: per(AD.oClimb), carry: per(AD.oCarry), pregnancy: per(AD.oPregnancy), growth: per(AD.oGrowth), milk: per(AD.oMilk), digestion: per(AD.oDigestion) };
  const out = Object.values(terms).reduce((a, b) => a + b, 0);
  return {
    n, eatMin: f[AD.tEat] / 4 / n, eatMinByKind: { drupe: f[AD.tDrupe] / 4 / n, fig: f[AD.tFig] / 4 / n, fallback: f[AD.tFallback] / 4 / n, meat: f[AD.tMeat] / 4 / n },
    eatFullShare: f[AD.tEat] ? f[AD.tEatFull] / f[AD.tEat] : NaN,
    fallbackTimeShare: f[AD.tDrupe] + f[AD.tFig] + f[AD.tFallback] + f[AD.tMeat] > 0 ? f[AD.tFallback] / (f[AD.tDrupe] + f[AD.tFig] + f[AD.tFallback] + f[AD.tMeat]) : NaN,
    ownPerEatMin: f[AD.tEat] ? (f[AD.eDrupe] + f[AD.eFig] + f[AD.eFallback] + f[AD.eMeat]) / (f[AD.tEat] / 4) : NaN, fin: per(AD.fin),
    kin: per(AD.kin), fec: per(AD.fec), absorbed, out, net: absorbed - out, dm: per(AD.dm),
    eaten: { drupe: per(AD.eDrupe), fig: per(AD.eFig), fallback: per(AD.eFallback), meat: per(AD.eMeat), milk: per(AD.eMilk), shared: per(AD.eShared) },
    plantShare: { drupe: plant ? f[AD.eDrupe] / plant : NaN, fig: plant ? f[AD.eFig] / plant : NaN, fallback: plant ? f[AD.eFallback] / plant : NaN },
    terms, walkKm: per(AD.walkM) / 1000,
    acts: { crown: f[AD.aCrown] / dt, toTree: f[AD.aToTree] / dt, ground: f[AD.aGround] / dt, travel: f[AD.aTravel] / dt, rest: f[AD.aRest] / dt, social: f[AD.aSocial] / dt, nurse: f[AD.aNurse] / dt, drink: f[AD.aDrink] / dt, other: f[AD.aOther] / dt },
    hunger: f[AD.hunger] / dt, fill: f[AD.fill] / dt, fullDay: f[AD.fullDay] / dt, party: f[AD.party] / dt, charged: per(AD.charged), feedCharged: per(AD.feedCharged),
    reserve: S.resRows ? S.resRel / S.resRows : null, motherReserve: S.mResRows ? S.mRes / S.mResRows : null,
  };
}

/** Rows pooled by class and calendar month. */
export function rowMonthly(rows: (number | null)[][], burnIn: number, startDoy: number): Record<string, Record<number, RowCell>> {
  const S: Record<string, Record<number, RowSum>> = {};
  for (const r of rows) { const m = monthOfDay(r[AD.day] as number, burnIn, startDoy); addRow(((S[rowClass(r)] ??= {})[m] ??= blankSum(r.length)), r); }
  const o: Record<string, Record<number, RowCell>> = {};
  for (const [c, ms] of Object.entries(S)) for (const [m, s] of Object.entries(ms)) (o[c] ??= {})[+m] = rowCell(s);
  return o;
}

/** One animal's rows over a span of window days (inclusive), as cells per day, oldest first. */
export function animalSpan(rows: (number | null)[][], id: number, from: number, to: number): { day: number; cell: RowCell; age: number; cls: string; dead: boolean; pregnancy: number }[] {
  return rows.filter(r => r[AD.id] === id && (r[AD.day] as number) >= from && (r[AD.day] as number) <= to).sort((a, b) => (a[AD.day] as number) - (b[AD.day] as number))
    .map(r => { const s = blankSum(r.length); addRow(s, r); return { day: r[AD.day] as number, cell: rowCell(s), age: r[AD.age] as number, cls: rowClass(r), dead: r[AD.dead] === 1, pregnancy: r[AD.pregnancy] as number }; });
}
/** Pools one animal's rows over a span into one cell (per animal-day means). */
export function animalPool(rows: (number | null)[][], id: number, from: number, to: number): RowCell | null {
  const s = blankSum(rows[0]?.length ?? 0);
  for (const r of rows) if (r[AD.id] === id && (r[AD.day] as number) >= from && (r[AD.day] as number) <= to) addRow(s, r);
  return s.rows ? rowCell(s) : null;
}
/** Animals whose row says they died (dead 1), with the day of death (the row's window day). */
export function deathsInRows(rows: (number | null)[][]): { id: number; day: number; cls: string }[] {
  return rows.filter(r => r[AD.dead] === 1).map(r => ({ id: r[AD.id] as number, day: r[AD.day] as number, cls: rowClass(r) }));
}

/** Reserve bins (reserves ÷ store at the day's end, upper bound inclusive) of byReserve. */
export const RESERVE_BINS: [number, number][] = [[0.5, -0.1], [-0.1, -0.3], [-0.3, -0.5], [-0.5, -0.7], [-0.7, -1.01]];
/**
 * Stage E1r: what animals do by how depleted they are. Rows of window days from..to (inclusive), of animals aged 5 y or
 * more, pooled by group (adult males, everyone else) and by reserve bin at the day's end.
 */
export function byReserve(rows: (number | null)[][], from: number, to: number): { group: string; bin: [number, number]; cell: RowCell }[] {
  const out: { group: string; bin: [number, number]; cell: RowCell }[] = [];
  for (const group of ['adult male', 'others aged 5 y or more']) for (const bin of RESERVE_BINS) {
    const s = blankSum(rows[0]?.length ?? 0);
    for (const r of rows) {
      const d = r[AD.day] as number, rel = (r[AD.res] as number) / (r[AD.store] as number);
      if (d < from || d > to || (r[AD.age] as number) < 5 || (rowClass(r) === 'adult male') !== (group === 'adult male') || !(rel <= bin[0] && rel > bin[1])) continue;
      addRow(s, r);
    }
    if (s.rows) out.push({ group, bin, cell: rowCell(s) });
  }
  return out;
}
