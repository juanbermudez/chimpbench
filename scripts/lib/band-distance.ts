// Band distance: how far a simulated value lies from a target's accept band, in units that can be summed over rows.
// One definition for the Jev decisive test (scripts/lib/jev-arm.ts, pre-registered in docs/staging/jev-decisive-test.md)
// and for the Track E benchmark (scripts/e-bench.ts). Pure: no file I/O, no simulation imports.
//
// Definition, per value x and band [lo, hi]:
//   two-sided band   d = max(0, lo − x, x − hi) ÷ (hi − lo)       0 inside the band; 1 = one band width outside
//   one-sided band   d = max(0, lo − x) ÷ |lo|   (only lo given)   the shortfall as a fraction of the edge, because a
//                    d = max(0, x − hi) ÷ |hi|   (only hi given)   one-sided band has no width to normalise by
//   degenerate       a zero-width band, or a one-sided band whose edge is 0, is normalised by 1 (raw units) and flagged
// A row scored on several parts (both sexes; cause-of-death shares) takes the MEAN of its parts' distances, so every
// target row weighs the same in a sum whatever its number of parts. (The Jev endpoint lists the sex parts as rows of
// their own; it calls bandDistance per part and is unchanged.)
// Rows without a numeric band (pattern rows: the scorer returns pass or fail by majority of seeds) have no distance.
// They are never dropped silently: rowDistance() returns kind 'pattern' and sumDistances() counts them apart, as it
// does rows without a value (insufficient data, mechanism missing, structural, sealed, scale) and rows the caller
// rules out because the run is shorter than the window they need (`window`), so every sum states its own row set.

export interface Band { lo: number; hi: number }
/** A band with an open side (null), as written in data/targets.json `accept`. */
export interface OpenBand { lo: number | null; hi: number | null }

/** Two-sided band: 0 inside, else the gap to the nearest edge divided by the band width. */
export function bandDistance(x: number, b: Band): number { return Math.max(0, b.lo - x, x - b.hi) / (b.hi - b.lo); }

/** The normaliser of a band and whether it is the degenerate fallback (1, raw units). Null when the band has no edge. */
export function bandScale(b: OpenBand): { scale: number; degenerate: boolean } | null {
  if (b.lo === null && b.hi === null) return null;
  const s = b.lo !== null && b.hi !== null ? b.hi - b.lo : Math.abs((b.lo ?? b.hi)!);
  return s > 0 ? { scale: s, degenerate: false } : { scale: 1, degenerate: true };
}

/** Distance to a band that may be one-sided (see the header). Null when the band has no numeric edge or x is not finite. */
export function openBandDistance(x: number | null | undefined, b: OpenBand): number | null {
  const s = bandScale(b);
  if (!s || x === null || x === undefined || !Number.isFinite(x)) return null;
  return Math.max(0, b.lo !== null ? b.lo - x : 0, b.hi !== null ? x - b.hi : 0) / s.scale;
}

/** What the scorer knows about one target row (a subset of src/field/targets.ts ScoreRow plus the target's band). */
export interface RowInput {
  id: string;
  accept: OpenBand;
  /** Bands per part where the row is scored on parts (both sexes inside one band, or a band per part). */
  partBands?: Record<string, OpenBand>;
  pooled: number | null;
  parts?: Record<string, number | null | undefined>;
  /** The scorer's verdict: rows that carry no value (sealed, n/a, structural) or are not scored (scale) have no distance. */
  verdict: string;
}

/**
 * numeric: a distance exists. pattern: the row has no numeric band (pass or fail by pattern). unscored: no value, or the
 * scorer does not score the row in this run (insufficient data, n/a, structural, sealed, scale).
 */
export type DistanceKind = 'numeric' | 'pattern' | 'unscored';
export interface RowDistance { kind: DistanceKind; distance: number | null; oneSided: boolean; degenerate: boolean; parts?: Record<string, number> }

const NO_VALUE = new Set(['insufficient', 'n/a', 'structural', 'sealed', 'scale']);

/** The distance of one target row (see the header for part rows, one-sided bands and pattern rows). */
export function rowDistance(r: RowInput): RowDistance {
  const none = (kind: DistanceKind): RowDistance => ({ kind, distance: null, oneSided: false, degenerate: false });
  const numericBand = r.partBands ? Object.values(r.partBands).some(b => bandScale(b)) : !!bandScale(r.accept);
  if (!numericBand) return none('pattern');
  if (NO_VALUE.has(r.verdict)) return none('unscored');
  const one = (b: OpenBand) => (b.lo === null) !== (b.hi === null);
  if (r.partBands) {
    const parts: Record<string, number> = {};
    for (const [k, b] of Object.entries(r.partBands)) { const d = openBandDistance(r.parts?.[k], b); if (d === null) return none('unscored'); parts[k] = d; }
    const v = Object.values(parts);
    return { kind: 'numeric', distance: v.reduce((a, b) => a + b, 0) / v.length, parts, oneSided: Object.values(r.partBands).some(one), degenerate: Object.values(r.partBands).some(b => !!bandScale(b)?.degenerate) };
  }
  const d = openBandDistance(r.pooled, r.accept);
  return d === null ? none('unscored') : { kind: 'numeric', distance: d, oneSided: one(r.accept), degenerate: !!bandScale(r.accept)?.degenerate };
}

export interface DistanceSum {
  /** Σ distance over the numeric rows: the headline figure. */
  sum: number;
  /** Σ min(distance, 1): the same sum with every row capped at one band width, so one runaway row cannot hide the rest. */
  capped: number;
  /** Numeric rows, and those of them outside their band (distance > 0). */
  rows: number; outside: number;
  /** Rows without a numeric band, by the scorer's verdict; never part of `sum`. */
  pattern: { pass: number; fail: number; other: number };
  /** Rows with a numeric band but no scored value in this run. */
  unscored: number;
  /** Rows the caller excluded (compromised, not scorable, instrument below its bar): reported, never summed. */
  excluded: number;
  /** Rows that need a longer window than the run has: reported as insufficient, never summed. */
  window: number;
}

/** Sums row distances and counts what is left out. `excluded` rows are counted apart whatever their kind. */
export function sumDistances(rows: { d: RowDistance; verdict: string; excluded?: boolean; window?: boolean }[]): DistanceSum {
  const s: DistanceSum = { sum: 0, capped: 0, rows: 0, outside: 0, pattern: { pass: 0, fail: 0, other: 0 }, unscored: 0, excluded: 0, window: 0 };
  for (const r of rows) {
    if (r.window) s.window++;
    else if (r.excluded) s.excluded++;
    else if (r.d.kind === 'pattern') s.pattern[r.verdict === 'pass' ? 'pass' : r.verdict === 'fail' ? 'fail' : 'other']++;
    else if (r.d.kind === 'unscored' || r.d.distance === null) s.unscored++;
    else { s.sum += r.d.distance; s.capped += Math.min(1, r.d.distance); s.rows++; if (r.d.distance > 0) s.outside++; }
  }
  return s;
}
