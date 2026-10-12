// Stage R14, the energy reading (docs/staging/r14-diag-energy.md): one pass over a trace of scripts/r14-trace.ts that
// gathers everything scripts/r14-energy.ts prints. Reads only; every definition is named where it is used.
import { ACTION_CODE } from '../../src/field/categories';
import { F, NF } from './r14-trace';
import { K, KINDS, kindAt, loadDay, loadMeta, type Meta } from './r14-read';

/** Clock hour (0 to 24) of record k of a day file: the window's days run from 06:30 to 06:30. */
export const clockOf = (k: number) => (6.5 + (k + 1) / 240) % 24;
/** A patch visit ends when the animal has not fed in that crown for more than 10 minutes (scripts/lib/timing-card.ts VISIT_GAP_TICKS). */
export const VISIT_GAP = 40;
/**
 * The simulation's own thresholds at a crown (src/sim/execution.ts forageTick): the feeding act ends itself when the crop
 * falls below 0.02 fruit units or the animal's hunger below 0.06. Both are met inside a tick whose record already shows
 * the next act, so the readers below look one tick on: `endedHow`.
 */
export const EMPTY_CROP = 0.02, SATED = 0.06;
/** A foregut this full takes food only as fast as it passes on (a reading threshold of this report, not a constant of the simulation). */
export const GUT_FULL = 0.95;
/** The late morning: a nest after 07:45, when no animal of the rules arm is still in one (section 4), and before 13:00. */
export const LATE_FROM_H = 7.75, LATE_TO_H = 13;
/** "Up at" is the last nest record of the day before this hour (evening nests begin after it in both arms). */
export const UP_BEFORE_H = 16;
export const HOUR_FIELDS = ['nest', 'crown', 'ground', 'rest', 'social', 'fin', 'step'] as const;
const HN = HOUR_FIELDS.length;

export interface Visit { a: number; tree: number; g0: number; g1: number; ticks: number; fin: number; cropIn: number; fullIn: number; feedersIn: number; cropOut: number; feedersOut: number; hungerOut: number; fillOut: number; whole: boolean; light: number }
export interface Trip { a: number; tree: number; g0: number; g1: number; m: number; d0: number; d1: number; crop0: number; crop1: number; done: boolean; next: number; whole: boolean }
export interface Bout { a: number; kind: number; g0: number; ticks: number; m: number; whole: boolean }

export interface Arm {
  dir: string; meta: Meta; n: number; days: number; T: number; dayTicks: number;
  /** Per animal: the sum of every field per day (days × NF). */ day: Float64Array[];
  /** Per animal and tick: the kind of act, reserves (kcal), hunger, foregut fill, daylight. */ kind: Uint8Array[]; res: Float32Array[]; hunger: Float32Array[];
  /** Per animal: minutes, metres, kcal spent and formula kcal eaten per kind, per day (days × kinds). */ kMin: Float64Array[]; kMet: Float64Array[]; kOut: Float64Array[]; kFin: Float64Array[];
  /** Per animal: per clock hour, HOUR_FIELDS summed over the days. */ hour: Float64Array[];
  /** Per animal and day: minutes in a nest in the dark, in twilight and in daylight; in a nest in the late morning and between 13:00 and 18:00; the clock hour the animal was last in a nest before UP_BEFORE_H (NaN: no nest record from 06:30 on); formula kcal eaten before 09:00; minutes out of a nest in the dark. */
  nestDark: Float64Array[]; nestDim: Float64Array[]; nestDay: Float64Array[]; lateNest: Float64Array[]; pmNest: Float64Array[]; upAt: Float64Array[]; finEarly: Float64Array[]; darkOut: Float64Array[];
  /** Per animal and day: the tick (of the whole trace) of that last nest record, -1 when there is none. */ upG: Float64Array[];
  /** Per animal: crown feeding by tree type (0 drupe, 1 fig) and ground feeding: minutes, formula kcal, minutes by light (dark, twilight, day) and kcal by light, minutes with a full foregut, sums of fill, crop and feeders over feeding ticks. */
  feed: { min: number; fin: number; lmin: number[]; lfin: number[]; full: number; fill: number; crop: number; feeders: number; ticks: number }[][];
  /** Cumulative sums per animal (T + 1 values: the sum of records before the index): formula kcal eaten, usable kcal in, kcal spent, ground metres, 5-minute-fix metres. */
  cFin: Float64Array[]; cIn: Float64Array[]; cOut: Float64Array[]; cStep: Float64Array[];
  kmFix: Float64Array[];
  visits: Visit[]; trips: Trip[]; bouts: Bout[];
  /** Per animal: uninterrupted feeding runs in a crown [g0, ticks, tree]. */ runs: { a: number; g0: number; ticks: number; tree: number; cropOut: number; feedersOut: number; hungerOut: number; fillOut: number; whole: boolean }[];
}

const blankFeed = () => ({ min: 0, fin: 0, lmin: [0, 0, 0], lfin: [0, 0, 0], full: 0, fill: 0, crop: 0, feeders: 0, ticks: 0 });
export const lightClass = (daylight: number) => daylight <= 0.03 ? 0 : daylight < 0.5 ? 1 : 2;
export const LIGHT = ['dark (daylight 0.03 or less)', 'twilight', 'daylight (0.5 or more)'];

export function collect(dir: string): Arm {
  const meta = loadMeta(dir), n = meta.animals.length, days = meta.days, DT = meta.dayTicks, T = days * DT, NK = KINDS.length;
  const f64 = (len: number) => Array.from({ length: n }, () => new Float64Array(len));
  const A: Arm = { dir, meta, n, days, T, dayTicks: DT, day: f64(days * NF), kind: Array.from({ length: n }, () => new Uint8Array(T)), res: Array.from({ length: n }, () => new Float32Array(T)), hunger: Array.from({ length: n }, () => new Float32Array(T)),
    kMin: f64(days * NK), kMet: f64(days * NK), kOut: f64(days * NK), kFin: f64(days * NK), hour: f64(24 * HN),
    nestDark: f64(days), nestDim: f64(days), nestDay: f64(days), lateNest: f64(days), pmNest: f64(days), upAt: f64(days), finEarly: f64(days), darkOut: f64(days), upG: f64(days),
    feed: Array.from({ length: n }, () => [blankFeed(), blankFeed(), blankFeed()]), cFin: f64(T + 1), cIn: f64(T + 1), cOut: f64(T + 1), cStep: f64(T + 1), kmFix: f64(days), visits: [], trips: [], bouts: [], runs: [] };
  for (const u of A.upAt) u.fill(NaN);
  for (const u of A.upG) u.fill(-1);
  const fig = new Set(Object.entries(meta.trees).filter(([, t]) => t.fig).map(([id]) => +id));
  const vis: (Visit | null)[] = Array(n).fill(null), trip: (Trip | null)[] = Array(n).fill(null), bout: (Bout | null)[] = Array(n).fill(null), run: (Arm['runs'][number] | null)[] = Array(n).fill(null);
  const fx = new Float64Array(n).fill(NaN), fz = new Float64Array(n);
  const closeVisit = (a: number, end: boolean) => { const v = vis[a]; if (v) { if (end) v.whole = false; A.visits.push(v); vis[a] = null; } };
  for (let d = 0; d < days; d++) {
    const buf = loadDay(dir, d + 1);
    for (let k = 0; k < DT; k++) {
      // hl: hours since midnight of the day the file begins on, 06:30 to 30:30 (the windows of one day are cut on it, so the
      // record at 06:30 of the next morning is not read as this morning's); h: the clock hour
      const g = d * DT + k, hl = 6.5 + (k + 1) / 240, h = clockOf(k), hi = Math.floor(h) % 24, worldTick = meta.tick0 + g + 1;
      for (let a = 0; a < n; a++) {
        const o = (k * n + a) * NF, kd = kindAt(buf, o), sum = A.day[a], step = buf[o + F.step], fin = buf[o + F.dFin], out = buf[o + F.dOut], L = lightClass(buf[o + F.daylight]);
        for (let f = 0; f < NF; f++) sum[d * NF + f] += buf[o + f];
        A.kind[a][g] = kd; A.res[a][g] = buf[o + F.res]; A.hunger[a][g] = buf[o + F.hunger];
        A.kMin[a][d * NK + kd] += 0.25; A.kMet[a][d * NK + kd] += step; A.kOut[a][d * NK + kd] += out; A.kFin[a][d * NK + kd] += fin;
        A.cFin[a][g + 1] = A.cFin[a][g] + fin; A.cIn[a][g + 1] = A.cIn[a][g] + buf[o + F.dIn]; A.cOut[a][g + 1] = A.cOut[a][g] + out; A.cStep[a][g + 1] = A.cStep[a][g] + step;
        // distance by 5-minute fixes, as the night script's meter takes them (scripts/lib/r10-run.ts meterTick: every 20th world tick)
        // (the meter's first fix is the place at the start; the trace's first record is one tick later)
        if (Number.isNaN(fx[a])) { fx[a] = buf[o + F.x]; fz[a] = buf[o + F.z]; }
        if (worldTick % 20 === 0) { A.kmFix[a][d] += Math.hypot(buf[o + F.x] - fx[a], buf[o + F.z] - fz[a]) / 1000; fx[a] = buf[o + F.x]; fz[a] = buf[o + F.z]; }
        const H = A.hour[a], hb = hi * HN;
        H[hb + 5] += fin; H[hb + 6] += step;
        const nest = kd === K['in a nest'];
        if (nest) { H[hb] += 0.25; (L === 0 ? A.nestDark : L === 1 ? A.nestDim : A.nestDay)[a][d] += 0.25; if (hl >= LATE_FROM_H && hl < LATE_TO_H) A.lateNest[a][d] += 0.25; if (hl >= 13 && hl < 18) A.pmNest[a][d] += 0.25; if (hl < UP_BEFORE_H) { A.upAt[a][d] = hl + 1 / 240; A.upG[a][d] = g; } }
        else if (L === 0) A.darkOut[a][d] += 0.25;
        if (hl < 9) A.finEarly[a][d] += fin;
        if (kd === K['feed in a crown'] || kd === K['feed on the ground']) {
          const ground = kd === K['feed on the ground'], tree = buf[o + F.target], fd = A.feed[a][ground ? 2 : fig.has(tree) ? 1 : 0];
          H[hb + (ground ? 2 : 1)] += 0.25;
          fd.min += 0.25; fd.fin += fin; fd.lmin[L] += 0.25; fd.lfin[L] += fin; fd.ticks++; fd.fill += buf[o + F.foreFill]; if (buf[o + F.foreFill] >= GUT_FULL) fd.full += 0.25;
          if (!ground) { fd.crop += buf[o + F.crop]; fd.feeders += buf[o + F.feeders]; }
        } else if (kd === K.rest) H[hb + 3] += 0.25;
        else if (kd === K.grooming || kd === K['other social']) H[hb + 4] += 0.25;
        // patch visits and uninterrupted runs in a crown
        if (kd === K['feed in a crown']) {
          const tree = buf[o + F.target];
          let v = vis[a];
          if (v && (v.tree !== tree || g - v.g1 > VISIT_GAP)) { closeVisit(a, false); v = null; }
          if (!v) v = vis[a] = { a, tree, g0: g, g1: g, ticks: 0, fin: 0, cropIn: buf[o + F.crop], fullIn: buf[o + F.cropFull], feedersIn: buf[o + F.feeders], cropOut: 0, feedersOut: 0, hungerOut: 0, fillOut: 0, whole: g > 0, light: buf[o + F.daylight] };
          v.g1 = g; v.ticks++; v.fin += fin; v.cropOut = buf[o + F.crop]; v.feedersOut = buf[o + F.feeders]; v.hungerOut = buf[o + F.hunger]; v.fillOut = buf[o + F.foreFill];
          let r = run[a];
          if (r && r.tree !== tree) { A.runs.push(r); r = null; }
          if (!r) r = run[a] = { a, g0: g, ticks: 0, tree, cropOut: 0, feedersOut: 0, hungerOut: 0, fillOut: 0, whole: g > 0 };
          r.ticks++; r.cropOut = buf[o + F.crop]; r.feedersOut = buf[o + F.feeders]; r.hungerOut = buf[o + F.hunger]; r.fillOut = buf[o + F.foreFill];
        } else {
          if (vis[a] && g - vis[a]!.g1 > VISIT_GAP) closeVisit(a, false);
          if (run[a]) { A.runs.push(run[a]!); run[a] = null; }
        }
        // trips to food by the night script's rule (scripts/lib/r10-run.ts meterTick): begun when the animal's own trip to a tree starts or changes its tree; completed when the next act is feeding at that tree
        const own = kd === K['trip to food'], target = buf[o + F.target];
        let t = trip[a];
        if (t && (!own || t.tree !== target)) { t.done = !own && buf[o + F.act] === ACTION_CODE.forage && target === t.tree; t.next = own ? K['trip to food'] : kd; A.trips.push(t); t = trip[a] = null; }
        if (own) {
          if (!t) t = trip[a] = { a, tree: target, g0: g, g1: g, m: 0, d0: buf[o + F.dTarget], d1: 0, crop0: buf[o + F.crop], crop1: 0, done: false, next: -1, whole: g > 0 };
          t.g1 = g; t.m += step; t.d1 = buf[o + F.dTarget]; t.crop1 = buf[o + F.crop];
        }
        // bouts: maximal runs of one kind
        let b = bout[a];
        if (b && b.kind !== kd) { A.bouts.push(b); b = null; }
        if (!b) b = bout[a] = { a, kind: kd, g0: g, ticks: 0, m: 0, whole: g > 0 };
        b.ticks++; b.m += step;
      }
    }
  }
  for (let a = 0; a < n; a++) {
    closeVisit(a, true);
    if (run[a]) { run[a]!.whole = false; A.runs.push(run[a]!); }
    if (trip[a]) { trip[a]!.whole = false; A.trips.push(trip[a]!); }
    if (bout[a]) { bout[a]!.whole = false; A.bouts.push(bout[a]!); }
  }
  return A;
}

/** One animal's value per day from the day sums of a field. */
export const dayField = (A: Arm, a: number, f: number): number[] => Array.from({ length: A.days }, (_, d) => A.day[a][d * NF + f]);
/** One value per animal: its mean per day of a field. */
export const perDay = (A: Arm, f: number): number[] => A.day.map(s => { let t = 0; for (let d = 0; d < A.days; d++) t += s[d * NF + f]; return t / A.days; });
/** One value per animal: its mean per day of a per-kind table. */
export const kindPerDay = (A: Arm, table: Float64Array[], kind: number): number[] => table.map(s => { let t = 0; for (let d = 0; d < A.days; d++) t += s[d * KINDS.length + kind]; return t / A.days; });

/** How a stretch of feeding in a crown ended, from its last record and the animal's hunger one tick on: 0 the crown eaten out (the crop within one tick's feeding of the threshold), 1 sated by the act's own rule, 2 left by a decision with the foregut full, 3 left by a decision with room in the gut. */
export function endedHow(A: Arm, x: { a: number; cropOut: number; feedersOut: number; fillOut: number }, lastTick: number): 0 | 1 | 2 | 3 {
  const oneTick = Math.max(1, x.feedersOut) * A.meta.params.fruitIntakePerH * A.meta.tickSeconds / 3600;
  if (x.cropOut < EMPTY_CROP + oneTick) return 0;
  if (lastTick + 1 < A.T && A.hunger[x.a][lastTick + 1] < SATED) return 1;
  return x.fillOut >= GUT_FULL ? 2 : 3;
}
