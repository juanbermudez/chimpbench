// The exact life record of one world (stage V1, docs/staging/v1-field.md, part 1b), read from world.chimps alone: every
// animal stays there after death with its birth and death times, its cause of death, its age, its community at death
// and the place where it lies (slimDead keeps these). Labelled "exact record (all-seeing)" wherever it is shown: it is
// not what a field team could see. Pure: reads public fields only, writes nothing, no world.rng. It allocates its
// result, so the page calls it when a birth, a death or the day changes, never per frame.
//
// Rates use the scorer's own definitions (src/field/metrics.ts) with exact ages in place of the census's estimates:
// first-year mortality is 1 − exp(−deaths ÷ infant-years) in the life table's first bin; respiratory deaths per 1,000
// chimp-years; births to mothers of 20 to 30 per female-year, counted only on days with the living below 90% of the
// population cap; killings per community-year; causes as shares of deaths with a known cause. Deaths an experiment
// caused ("removed by intervention") are kept out of every rate (the animal leaves the record at that time) and listed
// apart. The one cause that names an infant's loss of its mother is folded into "other causes" here, because sealed
// rows (T-DEM-15, -16, -24) protect survival after maternal loss; each animal's own record still names it.

import type { Chimp, LifeStage, World } from '../types';
import { necropsy, poissonInterval } from './field';

export const YEAR_H = 365.25 * 24;
/** The scorer's life-table age bins (src/field/metrics.ts BINS, not exported there). */
export const BINS: readonly number[] = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 80];
/** Census time of a day (21:00, as the field teams' census: src/field/protocols.ts dayStep): world.time 0 is 06:30 of day 1. */
export const censusTime = (day: number) => (day - 1) * 24 + 14.5;
/** The day a time falls in (world.day's rule). */
export const dayOf = (t: number) => Math.floor((t + 6.5) / 24) + 1;

export type CauseClass = 'respiratory' | 'illness' | 'wounds' | 'starvation' | 'other' | 'removed';
export const CAUSE_CLASSES: readonly CauseClass[] = ['respiratory', 'illness', 'wounds', 'starvation', 'other', 'removed'];
export const CAUSE_WORDS: Readonly<Record<CauseClass, string>> = {
  respiratory: 'respiratory outbreak', illness: 'other illness', wounds: 'wounds and killings', starvation: 'starvation', other: 'other causes', removed: 'removed by an experiment',
};
/** The scorer's necropsy class of each page class (illness, aggression, other; removals are not deaths for any rate). */
export const NECROPSY_OF: Readonly<Record<CauseClass, 'disease' | 'aggression' | 'other' | null>> = {
  respiratory: 'disease', illness: 'disease', wounds: 'aggression', starvation: 'other', other: 'other', removed: null,
};

const REMOVED = 'disappeared (removed by intervention';
const ORPHAN = 'orphaned infant';

/** The page's class of a cause string (src/field/protocols.ts necropsy, with starvation, removals and respiratory apart). */
export function causeClass(cause: string | null | undefined): CauseClass {
  const c = cause ?? '';
  if (c.startsWith(REMOVED)) return 'removed';
  if (c === 'starvation') return 'starvation';
  const n = necropsy(c);
  if (n.respiratory) return 'respiratory';
  if (n.cause === 'disease') return 'illness';
  if (n.cause === 'aggression') return 'wounds';
  return 'other';
}
/** The cause in words for the page: the simulation's own, except the folded one. */
export function causeWords(cause: string | null | undefined): string {
  const c = cause ?? 'unknown';
  return c.startsWith(ORPHAN) ? 'other causes' : c;
}
/** A killing as T-LET-1's truth counts it: the simulation's kill counter (intergroup attacks, infanticide) plus deaths
 * of the wounds of a fight inside a community. */
export const isKilling = (cause: string | null | undefined) => { const c = cause ?? ''; return c.startsWith('killed') || c.startsWith('infanticide') || c.startsWith('wounds from a fight'); };

/** Exact age in years at time t (natural aging: the simulation sets birth times from ages at 365.25 days a year). */
export const ageAt = (c: Chimp, t: number) => (t - c.birthTime) / YEAR_H;
/** Alive after the tick that ended at time t: born by then, not yet dead (a death in that tick carries deathTime t). */
export const aliveAt = (c: Chimp, t: number) => c.birthTime <= t && (c.deathTime === null || c.deathTime > t);

export interface BirthRow { id: number; name: string; sex: Chimp['sex']; t: number; troopId: number; motherId: number; motherName: string; motherAge: number | null; fatherId: number; alive: boolean }
export interface DeathRow { id: number; name: string; sex: Chimp['sex']; t: number; age: number; troopId: number; cause: string; klass: CauseClass; x: number; z: number; stage: LifeStage; founder: boolean }
export interface InfantRow { id: number; name: string; sex: Chimp['sex']; t: number; troopId: number; motherId: number; age: number; died: boolean; klass: CauseClass | null }

export interface LifeRecord {
  /** The window: from the world's start (time 0, day 1 at 06:30) to now. */
  t0: number; t1: number; days: number;
  /** Births in the window, newest first; deaths in the window (removals apart), newest first. */
  births: BirthRow[]; deaths: DeathRow[]; removed: DeathRow[];
  /** Every infant born in the window, newest first: its age now or at death, and how it died. */
  infants: InfantRow[];
  living: number;
  /** Life table in the scorer's bins (exact ages): animal-years and deaths by sex. Removals leave at removal time. */
  exposure: { male: number[]; female: number[] }; deathsByBin: { male: number[]; female: number[] };
}

/** The exact life record of `world` from time t0 (default 0) to now. */
export function lifeRecord(world: World, t0 = 0): LifeRecord {
  const t1 = world.time, byId = new Map<number, Chimp>();
  for (const c of world.chimps) byId.set(c.id, c);
  const births: BirthRow[] = [], deaths: DeathRow[] = [], removed: DeathRow[] = [], infants: InfantRow[] = [];
  const exposure = { male: BINS.map(() => 0), female: BINS.map(() => 0) }, deathsByBin = { male: BINS.map(() => 0), female: BINS.map(() => 0) };
  let living = 0;
  for (const c of world.chimps) {
    if (c.alive) living++;
    const born = c.birthTime > t0 && c.birthTime <= t1;
    if (born) {
      const m = byId.get(c.motherId);
      births.push({ id: c.id, name: c.name, sex: c.sex, t: c.birthTime, troopId: c.natalTroopId, motherId: c.motherId, motherName: m?.name ?? '', motherAge: m ? ageAt(m, c.birthTime) : null, fatherId: c.fatherId, alive: c.alive });
    }
    const dt = c.deathTime;
    const dead = !c.alive && dt !== null && dt > t0 && dt <= t1;
    const klass = dead ? causeClass(c.causeOfDeath) : null;
    if (dead) {
      const row: DeathRow = { id: c.id, name: c.name, sex: c.sex, t: dt!, age: ageAt(c, dt!), troopId: c.troopId, cause: c.causeOfDeath ?? 'unknown', klass: klass!, x: c.position[0], z: c.position[2], stage: c.stage, founder: c.birthTime < 0 };
      (klass === 'removed' ? removed : deaths).push(row);
    }
    if (born) {
      const end = dead ? dt! : t1;
      infants.push({ id: c.id, name: c.name, sex: c.sex, t: c.birthTime, troopId: c.natalTroopId, motherId: c.motherId, age: ageAt(c, end), died: dead && klass !== 'removed', klass: dead ? klass : null });
    }
    // life table: from the later of t0 and birth to the earlier of now and death (or removal)
    const from = Math.max(t0, c.birthTime), to = Math.min(t1, dt ?? t1);
    if (to > from && c.birthTime <= t1) {
      const a0 = ageAt(c, from), a1 = ageAt(c, to);
      for (let i = 0; i < BINS.length - 1; i++) { const lo = Math.max(a0, BINS[i]), hi = Math.min(a1, BINS[i + 1]); if (hi > lo) exposure[c.sex][i] += hi - lo; }
      if (dead && klass !== 'removed') { const i = binOf(a1); if (i >= 0) deathsByBin[c.sex][i]++; }
    }
  }
  const newest = (a: { t: number; id: number }, b: { t: number; id: number }) => b.t - a.t || b.id - a.id;
  births.sort(newest); deaths.sort(newest); removed.sort(newest); infants.sort(newest);
  return { t0, t1, days: (t1 - t0) / 24, births, deaths, removed, infants, living, exposure, deathsByBin };
}

export const binOf = (age: number) => { for (let i = 0; i < BINS.length - 1; i++) if (age >= BINS[i] && age < BINS[i + 1]) return i; return -1; };

/** An all-seeing value of one row: null with `short` (in words) below the scorer's own floor. */
export interface SeenValue {
  value: number | null; interval: [number, number] | null;
  parts?: Record<string, number>;
  /** The count the value rests on and the exposure, in words ("3 deaths in 13.2 infant-years"). */
  basis: string; n: number;
  /** Below the scorer's floor: why, in words, and the same in a few words for a row ("2.5 of 3 infant-years"). */
  short?: string; floor?: string;
}

const f1 = (v: number) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));

/** T-DEM-1: first-year mortality, 1 − exp(−deaths ÷ infant-years), Poisson interval; the scorer's floor is 3 infant-years. */
export function firstYearMortality(r: LifeRecord): SeenValue {
  const d = r.deathsByBin.male[0] + r.deathsByBin.female[0], ex = r.exposure.male[0] + r.exposure.female[0];
  const basis = `${d} death${d === 1 ? '' : 's'} in ${f1(ex)} infant-years`;
  if (ex < 3) return { value: null, interval: null, basis, n: d, short: `only ${ex.toFixed(1)} infant-years (the scorer needs 3)`, floor: `${ex.toFixed(1)} of 3 infant-years` };
  const [lo, hi] = poissonInterval(d);
  return { value: 1 - Math.exp(-d / ex), interval: [1 - Math.exp(-lo / ex), 1 - Math.exp(-hi / ex)], basis, n: d };
}

/** T-DEM-4: shares of deaths with a known cause due to disease and to aggression; the scorer's floor is 10 such deaths.
 * Every death in the exact record has a known cause (the field knew the cause of carcasses it found). */
export function causeShares(r: LifeRecord): SeenValue {
  const k = r.deaths.length, dis = r.deaths.filter(x => NECROPSY_OF[x.klass] === 'disease').length, agg = r.deaths.filter(x => NECROPSY_OF[x.klass] === 'aggression').length;
  const basis = `${k} death${k === 1 ? '' : 's'}, every cause known`;
  if (k < 10) return { value: null, interval: null, basis, n: k, short: `only ${k} death${k === 1 ? '' : 's'} (the scorer needs 10 with a known cause)`, floor: `${k} of 10 deaths` };
  return { value: dis / k, interval: null, parts: { disease: dis / k, aggression: agg / k }, basis, n: k };
}

/** Animal-years of all ages in the window (removals leave at removal time). */
export const animalYears = (r: LifeRecord) => r.exposure.male.reduce((a, b) => a + b, 0) + r.exposure.female.reduce((a, b) => a + b, 0);

/** T-DEM-8: respiratory deaths per 1,000 chimp-years, Poisson interval. */
export function respiratoryRate(r: LifeRecord): SeenValue {
  const n = r.deaths.filter(x => x.klass === 'respiratory').length, ex = animalYears(r);
  const basis = `${n} respiratory death${n === 1 ? '' : 's'} in ${f1(ex)} chimp-years`;
  if (!(ex > 0)) return { value: null, interval: null, basis, n, short: 'no exposure yet' };
  const [lo, hi] = poissonInterval(n);
  return { value: n / ex * 1000, interval: [lo / ex * 1000, hi / ex * 1000], basis, n };
}

/** T-LET-1: killings per community-year (intergroup attacks, infanticides and deaths of fight wounds), Poisson interval. */
export function killingRate(r: LifeRecord, communities: number): SeenValue {
  const n = r.deaths.filter(x => isKilling(x.cause)).length, cy = communities * r.days / 365;
  const basis = `${n} killing${n === 1 ? '' : 's'} in ${f1(cy)} community-years`;
  if (!(cy > 0)) return { value: null, interval: null, basis, n, short: 'no exposure yet' };
  const [lo, hi] = poissonInterval(n);
  return { value: n / cy, interval: [lo / cy, hi / cy], basis, n };
}

/**
 * Living animals after the census tick (21:00) of every day from day 1 to today, rebuilt from birth and death times
 * alone: living(t) = animals born by t − animals dead by t. One sort and one sweep, so it costs little at any length.
 */
export function censusSeries(world: World): { day: number[]; living: number[] } {
  const born: number[] = [], died: number[] = [];
  for (const c of world.chimps) { born.push(c.birthTime); if (c.deathTime !== null) died.push(c.deathTime); }
  born.sort((a, b) => a - b); died.sort((a, b) => a - b);
  const day: number[] = [], living: number[] = [];
  let i = 0, j = 0;
  for (let d = 1; ; d++) {
    const t = censusTime(d);
    if (t > world.time) break;
    while (i < born.length && born[i] <= t) i++;
    while (j < died.length && died[j] <= t) j++;
    day.push(d); living.push(i - j);
  }
  return { day, living };
}

/**
 * T-DEM-10: births to mothers aged 20 to 30 per female-year at those ages, counted only on days whose census found the
 * living below 90% of the population cap (the scorer's rule, src/field/derive.ts uncappedDays: the cap blocks
 * conception); a birth counts when the day around it is mostly uncapped. Poisson interval; the scorer's floor is 10
 * female-years.
 */
export function fertility20to30(world: World, r: LifeRecord, popCap: number, cen = censusSeries(world)): SeenValue & { capDays: number } {
  const capDay = new Set<number>();
  if (popCap > 0) cen.day.forEach((d, i) => { if (cen.living[i] >= 0.9 * popCap) capDay.add(d); });
  const day0 = dayOf(r.t0), nDays = Math.ceil(r.days) + 2, pre = new Float64Array(nDays + 1);
  for (let i = 0; i < nDays; i++) pre[i + 1] = pre[i] + (capDay.has(day0 + i) ? 0 : 1);
  const dayPos = (t: number) => Math.min(nDays, Math.max(0, (t + 6.5) / 24 + 1 - day0));
  const uncapped = (a: number, b: number) => {
    if (!capDay.size) return Math.max(0, b - a) / 24;
    const pa = dayPos(a), pb = dayPos(b);
    if (!(pb > pa)) return 0;
    const at = (p: number) => { const i = Math.floor(p); return pre[Math.min(nDays, i)] + (i < nDays ? (pre[i + 1] - pre[i]) * (p - i) : 0); };
    return at(pb) - at(pa);
  };
  let fy = 0, births = 0;
  for (const c of world.chimps) {
    if (c.sex !== 'female') continue;
    const from = Math.max(r.t0, c.birthTime), to = Math.min(r.t1, c.deathTime ?? r.t1);   // a removal ends the exposure too
    const a = Math.max(from, c.birthTime + 20 * YEAR_H), b = Math.min(to, c.birthTime + 30 * YEAR_H);
    if (b > a) fy += uncapped(a, b) / 365.25;
  }
  for (const b of r.births) if (b.motherAge !== null && b.motherAge >= 20 && b.motherAge < 30 && uncapped(b.t - 12, b.t + 12) > 0.5) births++;
  const basis = `${births} birth${births === 1 ? '' : 's'} in ${f1(fy)} female-years at 20 to 30`;
  if (fy < 10) return { value: null, interval: null, basis, n: births, short: `only ${fy.toFixed(1)} female-years at 20 to 30 (the scorer needs 10)`, floor: `${fy.toFixed(1)} of 10 female-years`, capDays: capDay.size };
  const [lo, hi] = poissonInterval(births);
  return { value: births / fy, interval: [lo / fy, hi / fy], basis, n: births, capDays: capDay.size };
}

/** Deaths in the window by page class, removals apart (an aggregate: the orphaned-infant cause is in "other causes"). */
export function deathsByClass(r: LifeRecord): Record<CauseClass, number> {
  const out = Object.fromEntries(CAUSE_CLASSES.map(k => [k, 0])) as Record<CauseClass, number>;
  for (const d of r.deaths) out[d.klass]++;
  out.removed = r.removed.length;
  return out;
}
