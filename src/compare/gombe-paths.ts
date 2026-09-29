import { followPaths, steps, territory, scaleMatchedBandwidth, type TrackPoint } from './tracks';
import { excelDate, type Cell } from './xlsx';

// Gombe Kasekela focal paths at 15 min (realism C12, second real site for path metrics): Pusey AE, Schroepfer-Walker K
// (2013) Female competition in chimpanzees. Phil Trans R Soc B 368: 20130077; data Dryad doi:10.5061/dryad.jg05d (CC0).
// Sheet AllPoints: the focal adult's UTM position every 15 min during day-long follows, 2000–2003 (Follow Date,
// Sequence # from 1 for the first point of the day, X, Y). Sheet AlonePoints: the first daily position where each female
// was seen alone (with dependants), by female (rank class H/M/L plus a number).
// Raw coordinates are location-sensitive (data/raw/dryad-jg05d/PROVENANCE.md): they stay in memory; callers publish
// only statistics normalized by the community range radius. Metric definitions are those of ./tracks (steps,
// followPaths), shared with scripts/compare-movement.ts, so Taï, Gombe and simulated follows are measured alike.

/** A path record: follow id, hours since the follow's first record, planar metres. */
export type PathPoint = Pick<TrackPoint, 'follow' | 't' | 'x' | 'y'>;
// steps(), followPaths() and territory() read only follow, t, x and y; the other TrackPoint fields (activity, party, sex)
// do not exist in these data.
const asTrack = <T extends PathPoint>(v: T[][]) => v as unknown as TrackPoint[][];

export interface FollowReport { rows: number; dates: number; follows: number; datesWithSeveralFollows: number; missingSequence: number; years: [number, number] }

/**
 * AllPoints rows (header first) → follows. A date holds several follows when the sequence number restarts; a missing
 * sequence number is a gap of 15 min per number. t = (sequence − 1) / 4 h: time since the day's first point, not clock time.
 */
export function gombeFollows(rows: Cell[][]): { follows: PathPoint[][]; years: number[]; report: FollowReport } {
  const head = rows[0].map(h => String(h ?? '').trim());
  const want = ['Follow Date', 'Sequence #', 'X Coordinate', 'Y Coordinate'];
  if (want.some((h, i) => head[i] !== h)) throw new Error(`AllPoints: unexpected header ${JSON.stringify(head)}`);
  const follows: PathPoint[][] = [], years: number[] = [];
  let cur: PathPoint[] | null = null, prevDate = NaN, prevSeq = Infinity, missing = 0, several = 0, lastSplitDate = NaN;
  const dates = new Set<number>();
  for (const r of rows.slice(1)) {
    const [d, s, x, y] = r;
    if (typeof d !== 'number' || typeof s !== 'number' || typeof x !== 'number' || typeof y !== 'number') throw new Error(`AllPoints: non-numeric row ${JSON.stringify(r)}`);
    dates.add(d);
    if (d !== prevDate || s <= prevSeq) {
      if (d === prevDate && lastSplitDate !== d) { several++; lastSplitDate = d; }
      cur = []; follows.push(cur); years.push(+excelDate(d).slice(0, 4));
    } else if (s > prevSeq + 1) missing += s - prevSeq - 1;
    cur!.push({ follow: `${d}#${follows.length - 1}`, t: (s - 1) / 4, x, y });
    prevDate = d; prevSeq = s;
  }
  return { follows, years, report: { rows: rows.length - 1, dates: dates.size, follows: follows.length, datesWithSeveralFollows: several, missingSequence: missing, years: [Math.min(...years), Math.max(...years)] } };
}

/** Every second record from the first (t = 0, 0.5, 1 … h): the 30-min resolution of the Taï and simulated follows. */
export const every30 = <T extends PathPoint>(follows: T[][]) => follows.map(f => f.filter(p => Math.abs(p.t * 2 - Math.round(p.t * 2)) < 1e-9)).filter(f => f.length > 1);

export interface PathStats {
  stepM: number[]; stepR: number[]; turn: number[]; zeroShare: number;
  /** Full-day follows (≥ 8 h, no gap > 1 h): path per hour (m/h), straightness, daily path and net displacement (m and r). */
  rate: number[]; straight: number[]; pathM: number[]; pathR: number[]; netM: number[]; netR: number[]; spanH: number[];
  follows: number; fullDays: number;
}

/** Path statistics at one record interval (h), normalized by the range radius r (m). Same rules as compare-movement. */
export function pathStats(follows: PathPoint[][], interval: number, r: number): PathStats {
  const st = steps(asTrack(follows), interval, 0.05, 15), paths = followPaths(asTrack(follows), 8, 1);
  return {
    stepM: st.len, stepR: st.len.map(v => v / r), turn: st.turn, zeroShare: st.len.length ? st.len.filter(v => v === 0).length / st.len.length : NaN,
    rate: paths.map(p => p.rate), straight: paths.map(p => p.straightness).filter(Number.isFinite), pathM: paths.map(p => p.path), pathR: paths.map(p => p.path / r),
    netM: paths.map(p => p.net), netR: paths.map(p => p.net / r), spanH: paths.map(p => p.span), follows: follows.length, fullDays: paths.length,
  };
}

/** Community range from all path records: 95% kernel at a bandwidth whose ratio to the radius matches `k` (the Taï h/r). */
export function communityRange(follows: PathPoint[][], k: number, start = 150) {
  const pts = asTrack(follows).flat(), h = scaleMatchedBandwidth(pts, k, start, 4), t = territory(pts, h);
  return { h, r: t.shape.r, area95: t.shape.area95, cx: t.shape.cx, cy: t.shape.cy };
}

// ------------------------------------------------------------------------------------------------ female core areas

/** Area of the convex hull of planar points (Andrew's monotone chain). */
export function hullArea(pts: [number, number][]): number {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return 0;
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  let a = 0;
  for (let i = 0; i < hull.length; i++) { const [x1, y1] = hull[i], [x2, y2] = hull[(i + 1) % hull.length]; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
}

/**
 * Core area as a fraction-of-points minimum convex polygon: the `frac` of points nearest their arithmetic mean
 * (mean-centre peeling; the source used BIOTAS 50% MCPs, whose peeling rule the README does not state), its hull area and
 * the mean of the kept points.
 */
export function coreMCP(pts: [number, number][], frac = 0.5): { area: number; cx: number; cy: number; kept: number } {
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const keep = Math.max(3, Math.round(pts.length * frac));
  const kept = [...pts].sort((a, b) => (a[0] - mx) ** 2 + (a[1] - my) ** 2 - ((b[0] - mx) ** 2 + (b[1] - my) ** 2)).slice(0, keep);
  return { area: hullArea(kept), cx: kept.reduce((a, p) => a + p[0], 0) / kept.length, cy: kept.reduce((a, p) => a + p[1], 0) / kept.length, kept: kept.length };
}

export interface FemaleCore { rank: 'H' | 'M' | 'L'; points: number; areaFrac: number; radiusR: number; centreDistR: number }

/**
 * AlonePoints rows (header first) → one 50% core per female, normalized by the community range (area as a fraction of
 * π r², equal-area radius and the core centre's distance from the range centre in r). Only the rank class is kept.
 */
export function femaleCores(rows: Cell[][], range: { r: number; cx: number; cy: number }, frac = 0.5, minPoints = 10): FemaleCore[] {
  const head = rows[0].map(h => String(h ?? '').trim());
  if (head[0] !== 'ID' || head[2] !== 'X COORD' || head[3] !== 'Y COORD') throw new Error(`AlonePoints: unexpected header ${JSON.stringify(head)}`);
  const by = new Map<string, [number, number][]>();
  for (const r of rows.slice(1)) {
    const id = String(r[0] ?? ''), x = r[2], y = r[3];
    if (!/^[HML]\d+$/.test(id) || typeof x !== 'number' || typeof y !== 'number') throw new Error(`AlonePoints: bad row ${JSON.stringify(r)}`);
    (by.get(id) ?? by.set(id, []).get(id)!).push([x, y]);
  }
  const out: FemaleCore[] = [];
  for (const [id, pts] of by) {
    if (pts.length < minPoints) continue;
    const c = coreMCP(pts, frac);
    out.push({ rank: id[0] as FemaleCore['rank'], points: pts.length, areaFrac: c.area / (Math.PI * range.r ** 2), radiusR: Math.sqrt(c.area / Math.PI) / range.r, centreDistR: Math.hypot(c.cx - range.cx, c.cy - range.cy) / range.r });
  }
  // sorted by rank class, then by value, so list order carries no identity
  return out.sort((a, b) => 'HML'.indexOf(a.rank) - 'HML'.indexOf(b.rank) || a.areaFrac - b.areaFrac);
}
