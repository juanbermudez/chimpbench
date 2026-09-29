import type { Tree, World } from '../types';
import { paramsOf, type Params } from './params';
import { PHENOLOGY_DATA } from './phenology.gen';
import { clamp, hash01 } from './rng';
import { START_DOY, START_HOUR, TREE_ID0, simOf } from './state';

// Patch ecology (docs/realism-design.md §5.1 "Food", §5.6): each sim Tree is a food patch whose crop follows a
// phenology record, evaluated lazily from time and depletion state when read. Only used when P.patchEcology is 1
// (the field profile); the compressed profile keeps the eager model in environment.ts.
//
// Phenology record: per species, per record year, per month, the share of stems with ripe fruit. From Kibale data
// when scripts/ingest-phenology.ts has written src/sim/phenology.gen.ts, otherwise a SYNTHETIC record (stylized,
// labelled everywhere it is reported) with the Kibale mean and variability (T-FOOD-1: mean 8.4-8.7% of stems,
// monthly CV ~0.4-0.5, between-year CV ~0.25; potts2020, chapman2018, watts2012b).
//
// A non-fig tree fruits at most once per record year, with probability q = mean share × 365 / episode length; its
// episode starts in a month drawn from that year's monthly shares (centred on the month), so the share of ripe stems
// of a species tracks the record. Figs fruit asynchronously on their own per-tree cycle (P-FOOD-3, watts2012b).
// A depleted patch recovers toward its phenology crop exponentially (tree.depletion = [deficit, time]).

/** Ingested dataset (scripts/ingest-phenology.ts). Shares are 0..1; NaN marks a missing month. */
export interface PhenologyData {
  source: string; license: string; citation: string;
  years: number[];
  species: Record<string, { months: (number | null)[][]; fig: boolean }>;
  /** Site-level share by year and month, when the dataset has no species columns (Kanyawara forest.csv). */
  site?: (number | null)[][];
  /** Sim species matched to dataset species; unmatched ones use their class mean (figs, non-figs) and are listed. */
  matched?: Record<string, string>;
  unmatched?: string[];
}

interface Year { q: number; cdf: number[]; share: number[] }
interface Table { fig: boolean; years: Year[]; meanShare: number }
interface Tables { source: string; synthetic: boolean; species: Map<string, Table>; nYears: number; offset: number; site: number[][]; siteMean: number }

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const MONTH_LEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const SIM_SPECIES = ['Ficus mucuso', 'Ficus natalensis', 'Ficus sansibarica', 'Uvariopsis congensis', 'Pseudospondias microcarpa',
  'Chrysophyllum albidum', 'Pterygota mildbraedii', 'Mimusops bagshawei', 'Celtis durandii'];
const isFig = (sp: string) => sp.startsWith('Ficus');

// Synthetic record shape (stylized): relative mean ripe share and the two peak months of each non-fig species. Kibale
// fruit is bimodal after the two rainy seasons; these peaks are placed in the drier months after them. Not data.
const SYNTH_SHAPE: Record<string, [number, number, number]> = {
  'Uvariopsis congensis': [1.3, 5.5, 11.5], 'Pseudospondias microcarpa': [0.9, 0.5, 6.5], 'Chrysophyllum albidum': [1.1, 1.5, 7.5],
  'Pterygota mildbraedii': [0.8, 4.5, 10.5], 'Mimusops bagshawei': [1.0, 6.5, 0.5], 'Celtis durandii': [0.9, 2.5, 8.5],
};

/** Standard normal from two hashes (Box-Muller). */
function normal(a: number, b: number, c: number): number {
  const u = Math.max(1e-12, hash01(a, b, c, 1)), v = hash01(a, b, c, 2);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** The synthetic record: species × years × months of ripe share, with a site-wide and a species year effect. */
function syntheticRecord(P: Params): Map<string, number[][]> {
  const out = new Map<string, number[][]>();
  const n = P.synthYears, amp = P.synthSeasonAmp;
  // synthRipeMean is the all-stem mean (equal stems per species, as on the transect); figs hold their own cycle share
  const figShare = Math.min(1, P.figEpisodeDays / P.figCycleDays), figs = SIM_SPECIES.filter(isFig).length;
  const mean = Math.max(0, (SIM_SPECIES.length * P.synthRipeMean - figs * figShare) / (SIM_SPECIES.length - figs));
  const siteYear: number[] = [];
  for (let y = 0; y < n; y++) siteYear.push(Math.exp(P.synthYearCv * normal(7101, y, 1) - P.synthYearCv * P.synthYearCv / 2));
  SIM_SPECIES.forEach((sp, i) => {
    const rows: number[][] = [];
    const [rel, p1, p2] = SYNTH_SHAPE[sp] ?? [1, 0, 6];
    for (let y = 0; y < n; y++) {
      const f = siteYear[y] * Math.exp(P.synthSpeciesYearCv * normal(7102 + i, y, 1) - P.synthSpeciesYearCv * P.synthSpeciesYearCv / 2);
      const row: number[] = [];
      for (let m = 0; m < 12; m++) {
        const season = isFig(sp) ? 1 : 1 + amp * (Math.cos(2 * Math.PI * (m - p1) / 12) + 0.6 * Math.cos(2 * Math.PI * (m - p2) / 12)) / 1.6;
        row.push(clamp((isFig(sp) ? figShare : mean * rel) * Math.max(0, season) * f, 0, 0.9));
      }
      rows.push(row);
    }
    out.set(sp, rows);
  });
  return out;
}

/** Monthly shares from the ingested data (per sim species), filling gaps with the species' month means. */
function dataRecord(d: PhenologyData): Map<string, number[][]> {
  const out = new Map<string, number[][]>();
  const n = d.years.length;
  const classMean = (fig: boolean): (number | null)[][] => {
    const src = Object.values(d.species).filter(s => s.fig === fig);
    const pool = src.length ? src : Object.values(d.species);
    return Array.from({ length: n }, (_, y) => Array.from({ length: 12 }, (_, m) => {
      const v = pool.map(s => s.months[y]?.[m]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
      if (v.length) return v.reduce((a, b) => a + b, 0) / v.length;
      return d.site?.[y]?.[m] ?? NaN;
    }));
  };
  for (const sp of SIM_SPECIES) {
    const key = d.matched?.[sp];
    const raw = key && d.species[key] ? d.species[key].months : Object.keys(d.species).length ? classMean(isFig(sp)) : (d.site ?? []);
    const ok = (x: number | null | undefined): x is number => typeof x === 'number' && Number.isFinite(x);
    // missing months: that species' mean for the month over the record
    const mm = Array.from({ length: 12 }, (_, m) => { const v = raw.map(r => r[m]).filter(ok); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });
    out.set(sp, raw.map(r => Array.from({ length: 12 }, (_, m) => (ok(r[m]) ? clamp(r[m] as number, 0, 1) : mm[m]))));
  }
  return out;
}

const cache = new WeakMap<Params, Tables>();
let lastSeed = -1, lastP: Params | null = null, lastT: Tables | null = null;

/** Species tables for a world: the record (data or synthetic) and the world's starting record year (seed hash, no rng). */
export function tables(world: World): Tables {
  const P = paramsOf(world);
  if (P === lastP && world.seed === lastSeed && lastT) return lastT;
  let base = cache.get(P);
  if (!base) {
    const data = P.phenologyForcing >= 1 ? PHENOLOGY_DATA : null;
    const rec = data ? dataRecord(data) : syntheticRecord(P);
    const species = new Map<string, Table>();
    let nYears = Infinity;
    for (const [sp, rows] of rec) {
      const fig = isFig(sp);
      const D = fig ? P.figEpisodeDays : P.episodeDays;
      const years = rows.map(share => {
        const sum = share.reduce((a, b) => a + b, 0);
        const cdf: number[] = []; let acc = 0;
        for (let m = 0; m < 12; m++) { acc += sum > 0 ? share[m] / sum : 1 / 12; cdf.push(acc); }
        return { q: clamp((sum / 12) * 365 / D, 0, 1), cdf, share };
      });
      const all = rows.flat();
      species.set(sp, { fig, years, meanShare: all.reduce((a, b) => a + b, 0) / Math.max(1, all.length) });
      nYears = Math.min(nYears, rows.length);
    }
    const site = Array.from({ length: nYears }, (_, y) => Array.from({ length: 12 }, (_, m) => {
      let s = 0, w = 0;
      for (const sp of SIM_SPECIES) { const t = species.get(sp)!; s += t.years[y].share[m]; w++; }
      return s / w;
    }));
    const siteMean = site.flat().reduce((a, b) => a + b, 0) / Math.max(1, nYears * 12);
    base = { source: data ? data.source : 'synthetic', synthetic: !data, species, nYears, offset: 0, site, siteMean };
    cache.set(P, base);
  }
  lastSeed = world.seed; lastP = P;
  lastT = { ...base, offset: Math.floor(hash01(world.seed, 7103, 1) * base.nYears) };
  return lastT;
}

/** Days since 1 January of the first calendar year of the run (fractional). */
export function simDay(time: number): number { return (START_HOUR + time) / 24 + (START_DOY - 1); }

/** Record year used for calendar year `y` of the run: the world steps through the record from its start year, then resamples. */
function recordYear(tb: Tables, y: number): number {
  const k = tb.offset + y;
  return k < tb.nYears ? k : Math.floor(hash01(k, 7104, 3) * tb.nYears);
}

const ss = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Crop shape (0..1) of the episode tree `id` may have in calendar year y, at day-of-year d (may exceed 365). */
function episode(tb: Tables, t: Table, id: number, y: number, d: number, D: number, ramp: number): number {
  if (y < 0) return 0;
  const yr = t.years[recordYear(tb, y)];
  if (hash01(id, y, 51) >= yr.q) return 0;
  const h = hash01(id, y, 52);
  let m = 0;
  while (m < 11 && yr.cdf[m] < h) m++;
  const start = MONTH_START[m] + hash01(id, y, 53) * MONTH_LEN[m] - D / 2;
  const x = d - start;
  if (x <= 0 || x >= D) return 0;
  return Math.min(ss(x / ramp), ss((D - x) / ramp));
}

/**
 * Stage C7b (field; docs/staging/c7b-prereg.md 3.2): the share of a crown filled with ripe fruit at the peak of episode
 * `k` of tree `id`, f = min + (1 - min) u^exp with u a hash (no rng). Crowns more than half filled are at least 9x scarcer
 * than other fruit-bearing crowns (janmaat2016) [M]; cropFullExp sets P(f > 1/2) = 0.1. 1 when off (cropFullExp 0).
 */
export function cropFullness(P: Params, id: number, k: number): number {
  return P.cropFullExp > 0 ? P.cropFullMin + (1 - P.cropFullMin) * hash01(id, k, 55) ** P.cropFullExp : 1;
}
/** Mean of cropFullness over trees and episodes: min + (1 - min) / (exp + 1). */
export function meanFullness(P: Params): number { return P.cropFullExp > 0 ? P.cropFullMin + (1 - P.cropFullMin) / (P.cropFullExp + 1) : 1; }

/** Phenology crop of a patch now (fruit units), before depletion; drought and fig-mast interventions included. */
// Memo of cropTarget (performance only, same values): many animals look at the same crowns in a tick. An entry is valid
// for one world, one time and the fig-mast and drought state it was computed under (the only other inputs; the
// species tables and parameters are fixed per world, maxFruit and species per tree).
let _mw: World | null = null, _mFig = NaN, _mFigU = NaN, _mDry = NaN;
let _mv = new Float64Array(0), _mt = new Float64Array(0);
export function cropTarget(world: World, t: Tree, time: number): number {
  const s = simOf(world), k = t.id - TREE_ID0;
  if (world !== _mw || s.figTree !== _mFig || s.figUntil !== _mFigU || s.droughtUntil !== _mDry || _mt.length < world.trees.length) {
    _mw = world; _mFig = s.figTree; _mFigU = s.figUntil; _mDry = s.droughtUntil;
    if (_mt.length < world.trees.length) { _mv = new Float64Array(world.trees.length); _mt = new Float64Array(world.trees.length); }
    _mt.fill(NaN);
  }
  if (k >= 0 && k < _mt.length) {
    if (_mt[k] === time) return _mv[k];
    const v = cropTargetOf(world, t, time);
    _mt[k] = time; _mv[k] = v;
    return v;
  }
  return cropTargetOf(world, t, time);
}

function cropTargetOf(world: World, t: Tree, time: number): number {
  const P = paramsOf(world), s = simOf(world);
  if (t.id === s.figTree && s.figUntil > time) return t.maxFruit * P.figMastLevel;
  const tb = tables(world);
  const table = tb.species.get(t.species);
  if (!table) return 0;
  const day = simDay(time);
  let shape: number;
  if (table.fig) {
    // asynchronous per-tree fig cycles (P-FOOD-3); the share of the cycle in fruit follows the record's fig share
    const period = P.figCycleDays, D = Math.min(period, P.figEpisodeDays);
    const phase = day + hash01(t.id, 7, 3) * period, local = (phase % period + period) % period;
    shape = local < D ? Math.min(ss(local / P.ripeRampDays), ss((D - local) / P.ripeRampDays)) : 0;
    if (shape > 0 && P.cropFullExp > 0) shape *= cropFullness(P, t.id, Math.floor(phase / period) + 1000);
  } else {
    const y = Math.floor(day / 365), d = day - 365 * y;
    const a = episode(tb, table, t.id, y, d, P.episodeDays, P.ripeRampDays), b = episode(tb, table, t.id, y - 1, d + 365, P.episodeDays, P.ripeRampDays);
    shape = P.cropFullExp > 0 ? Math.max(a > 0 ? a * cropFullness(P, t.id, y) : 0, b > 0 ? b * cropFullness(P, t.id, y - 1) : 0) : Math.max(a, b);
  }
  let v = t.maxFruit * shape;
  if (s.droughtUntil > time) v *= table.fig ? P.droughtFigFactor : P.droughtFruitFactor;
  return v;
}

/** Current crop of a patch: the phenology crop minus a deficit that recovers exponentially. Pure. */
export function fruitAt(world: World, t: Tree, time = world.time): number {
  const target = cropTarget(world, t, time);
  const dep = t.depletion;
  if (!dep) return target;
  const v = target - dep[0] * Math.exp(-paramsOf(world).patchRecoverPerDay * (time - dep[1]) / 24);
  return v > 0 ? v : 0;
}

/** Remove `amount` of fruit from a patch (feeding). Returns what was eaten. */
export function eatFruit(world: World, t: Tree, amount: number): number {
  const now = world.time;
  const f = fruitAt(world, t, now);
  const eat = Math.min(f, amount);
  const left = f - eat;
  t.depletion = [cropTarget(world, t, now) - left, now];
  t.fruit = left;
  return eat;
}

/** Daily: write every patch's current crop into tree.fruit for readers outside the simulation, and drop spent deficits. */
export function materializeFruit(world: World): void {
  const P = paramsOf(world), now = world.time;
  for (const t of world.trees) {
    t.fruit = fruitAt(world, t, now);
    const dep = t.depletion;
    if (dep && Math.abs(dep[0]) * Math.exp(-P.patchRecoverPerDay * (now - dep[1]) / 24) < 1e-4) delete t.depletion;
  }
}

/** Habitat fruit index 0.12..0.95 for behaviour (feeding competition, joining calls): the site's ripe share relative to its long-run mean. Stylized mapping. */
export function patchFruitIndex(world: World): number {
  const tb = tables(world), P = paramsOf(world);
  const day = simDay(world.time), y = Math.floor(day / 365), d = day - 365 * y;
  let m = 0;
  while (m < 11 && d >= MONTH_START[m + 1]) m++;
  const row = tb.site[recordYear(tb, y)];
  const v = clamp(P.fruitIndexAtMean * row[m] / Math.max(1e-6, tb.siteMean), 0.12, 0.95);
  return simOf(world).droughtUntil > world.time ? v * P.droughtFruitFactor : v;
}

/** Forage field (leaves, pith, herbs): a multiple of the fallback intake at (x, z), by 100 m habitat cell and season. Never exhausted. */
export function forageYield(world: World, x: number, z: number): number {
  const P = paramsOf(world);
  const cell = P.forageCellM;
  const h = hash01(Math.floor(x / cell) + 100000, Math.floor(z / cell) + 100000, 97);
  const doy = world.environment.dayOfYear;
  // young leaves flush after the rains (Mar-May, Sep-Nov): a seasonal term peaking about three weeks after each wet-season peak
  const season = Math.cos(2 * Math.PI * (doy - P.youngLeafPeakDoy) / 182.5);
  return (P.forageYieldMin + (P.forageYieldMax - P.forageYieldMin) * h) * (1 + P.youngLeafAmp * season);
}

/** Phenology source of a world, for reports ("synthetic" when no Kibale dataset was ingested). */
export function phenologySource(world: World): string { return tables(world).source; }

