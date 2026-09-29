// Fix sampling shared by the real and simulated sides. The real subsample (01-data-preparation.Rmd) keeps 1–2 fixes
// per individual-day, at least 3 h apart, between 08:00 and 17:59, of mature individuals, and only individual-years
// with ≥ 30 fixes over ≥ 4 months. The simulated side copies whole real sampling schedules (which days and clock times
// an individual-year was sampled), so effort, season, time of day and fixes per day match the real data by
// construction; the same checks below then run on both sides.

export interface Fix {
  /** Individual key and sex (M/F), as in the source CSV. */
  ind: string; sex: 'M' | 'F';
  /** Analysis year (calendar year for real data; simulated year index for the sim), month 1–12, calendar day of year 1–366. */
  year: number; month: number; doy: number;
  /** Integer day key (unique per calendar day within a dataset) and clock minute of day. */
  day: number; min: number;
  /** Planar metres (x east, y north). */
  x: number; y: number;
}

export const indYearKey = (f: Pick<Fix, 'ind' | 'year'>) => `${f.ind}\u0001${f.year}`;

export interface SamplingReport {
  fixes: number; individuals: number; indYears: number; indDays: number;
  /** Individual-days by number of fixes (1, 2, more). */
  daysWith1: number; daysWith2: number; daysWithMore: number;
  /** Rule violations: same-day pairs < 3 h apart, fixes outside 08:00–17:59, individual-years below the 30-fix / 4-month bar. */
  pairsUnder3h: number; outsideHours: number; underQualified: number;
}

/** Checks a fix set against the source subsampling rules (see header). */
export function checkSampling(fixes: Fix[], minPoints = 30, minMonths = 4): SamplingReport {
  const byDay = new Map<string, number[]>(), byYear = new Map<string, { n: number; months: Set<number> }>();
  let outsideHours = 0;
  for (const f of fixes) {
    const k = `${f.ind}\u0001${f.day}`;
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(f.min);
    if (f.min < 8 * 60 || f.min >= 18 * 60) outsideHours++;
    const y = byYear.get(indYearKey(f)) ?? byYear.set(indYearKey(f), { n: 0, months: new Set() }).get(indYearKey(f))!;
    y.n++; y.months.add(f.month);
  }
  let d1 = 0, d2 = 0, dm = 0, under3 = 0;
  for (const mins of byDay.values()) {
    if (mins.length === 1) d1++; else if (mins.length === 2) d2++; else dm++;
    mins.sort((a, b) => a - b);
    for (let i = 1; i < mins.length; i++) if (mins[i] - mins[i - 1] < 180) under3++;
  }
  let underQ = 0;
  for (const y of byYear.values()) if (y.n < minPoints || y.months.size < minMonths) underQ++;
  return { fixes: fixes.length, individuals: new Set(fixes.map(f => f.ind)).size, indYears: byYear.size, indDays: byDay.size,
    daysWith1: d1, daysWith2: d2, daysWithMore: dm, pairsUnder3h: under3, outsideHours, underQualified: underQ };
}

/** Keeps individual-years with ≥ minPoints fixes spanning ≥ minMonths distinct months (the source filter). */
export function qualify(fixes: Fix[], minPoints = 30, minMonths = 4): Fix[] {
  const stats = new Map<string, { n: number; months: Set<number> }>();
  for (const f of fixes) { const k = indYearKey(f); const s = stats.get(k) ?? stats.set(k, { n: 0, months: new Set() }).get(k)!; s.n++; s.months.add(f.month); }
  return fixes.filter(f => { const s = stats.get(indYearKey(f))!; return s.n >= minPoints && s.months.size >= minMonths; });
}

/** One real individual-year's sampling schedule: calendar days of year and clock minutes of its fixes (no locations). */
export interface Schedule { sex: 'M' | 'F'; doy: number[]; min: number[] }

export function schedulesOf(fixes: Fix[]): Schedule[] {
  const m = new Map<string, Schedule>();
  for (const f of fixes) { const k = indYearKey(f); const s = m.get(k) ?? m.set(k, { sex: f.sex, doy: [], min: [] }).get(k)!; s.doy.push(f.doy); s.min.push(f.min); }
  return [...m.values()];
}

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
/** Month 1–12 of a day of year in a non-leap calendar (day 366 counts as December). */
export function monthOfDoy(doy: number): number {
  let m = 1;
  while (m < 12 && doy > MONTH_START[m]) m++;
  return m;
}

/** Calendar day of year of absolute simulated day `d` (day 0 is the start day, `startDoy`). */
export const simDoy = (d: number, startDoy: number) => ((startDoy - 1 + d) % 365 + 365) % 365 + 1;

/** The absolute simulated day in [yearStart, yearStart + 365) whose calendar day of year is `doy` (366 → 365). */
export function simDayOf(doy: number, yearStart: number, startDoy: number): number {
  const target = Math.min(365, doy) - 1, first = simDoy(yearStart, startDoy) - 1;
  return yearStart + ((target - first) % 365 + 365) % 365;
}

/** Small seeded generator (mulberry32) for sampling choices; never the world's RNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
