// The words and positions of the one comparison mark of the page "How close to the wild" (stage V1,
// docs/staging/v1-field.md). Never pass or fail: a value is inside the field band, some distance above or below it, too
// close to call (its interval crosses an edge), or not there yet. Pure; no DOM.

import { bandScale, type OpenBand } from './band-distance';

export interface Distance {
  /** -1 below the band, 0 inside (or too close to call), 1 above. */
  side: -1 | 0 | 1;
  /** Gap to the nearest edge in the band's own unit (see `unit`); 0 inside. */
  d: number;
  /** 'width': band widths (two-sided band); 'edge': a share of the edge value (one-sided band); 'raw': the value's own
   * units (a zero-width band or a one-sided band whose edge is 0: band-distance.ts calls these degenerate). */
  unit: 'width' | 'edge' | 'raw';
  /** The interval crosses an edge of the band. */
  tooClose: boolean;
  words: string;
}

/** Two significant digits at most, no trailing zeros ("0.62", "1.3", "12"). */
export function sig2(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const a = Math.abs(v), p = Math.max(0, 1 - Math.floor(Math.log10(a)));
  return String(+v.toFixed(Math.min(6, p)));
}

/**
 * A value's place against a band, in words. One-sided bands are measured as a share of their edge ("60% above the
 * field's upper limit"), zero-width ones in raw units, two-sided ones in band widths (the gap to the nearest edge ÷ the
 * band width: scripts/lib/band-distance.ts, now src/yardstick/band-distance.ts). An interval that crosses an edge is
 * "too close to call" whatever the point value.
 */
export function distanceOf(x: number, band: OpenBand, interval?: [number, number] | null): Distance | null {
  const s = bandScale(band);
  if (!s || !Number.isFinite(x)) return null;
  const lo = band.lo, hi = band.hi;
  const below = lo !== null && x < lo, above = hi !== null && x > hi;
  const gap = below ? lo! - x : above ? x - hi! : 0;
  const unit: Distance['unit'] = s.degenerate ? 'raw' : lo !== null && hi !== null ? 'width' : 'edge';
  const d = gap / s.scale;
  const crosses = !!interval && ((lo !== null && interval[0] < lo && interval[1] >= lo) || (hi !== null && interval[0] <= hi && interval[1] > hi));
  if (crosses) return { side: 0, d: 0, unit, tooClose: true, words: 'too close to call' };
  if (!below && !above) return { side: 0, d: 0, unit, tooClose: false, words: 'inside the field band' };
  const side = above ? 1 : -1, dir = above ? 'above' : 'below';
  let words: string;
  if (unit === 'width') words = d < 0.05 ? `just ${dir} the field band` : `${sig2(d)} band width${sig2(d) === '1' ? '' : 's'} ${dir}`;
  else if (unit === 'edge') words = `${d < 0.01 ? 'just' : `${sig2(d * 100)}%`} ${dir} the field’s ${above ? 'upper' : 'lower'} limit`;
  else words = `${sig2(gap)} ${dir} the field’s ${above ? 'upper' : 'lower'} limit (in raw units)`;
  return { side, d, unit, tooClose: false, words };
}

/**
 * Where a value sits on the page's overview axis, in band widths from the middle of the band: inside a two-sided band
 * (value − middle) ÷ width, from −0.5 to 0.5; outside ±(0.5 + d) up to one band width out, then ±(1.5 + log2 d), held at
 * 8 band widths (±4.5) with `clamped` set. A one-sided band has no middle: a value inside it sits at 0.
 */
export function axisOf(x: number, band: OpenBand): { pos: number; clamped: boolean } | null {
  const dist = distanceOf(x, band);
  if (!dist) return null;
  if (dist.side === 0) {
    if (band.lo !== null && band.hi !== null && band.hi > band.lo) return { pos: (x - (band.lo + band.hi) / 2) / (band.hi - band.lo), clamped: false };
    return { pos: 0, clamped: false };
  }
  const d = dist.d, far = d > 8;
  const m = d <= 1 ? 0.5 + d : 1.5 + Math.log2(Math.min(d, 8));
  return { pos: dist.side * m, clamped: far };
}

/** A band spanning a factor of at least this (hi ÷ lo, both above 0) is marked wide (design assumption). */
export const WIDE_FACTOR = 3;
/** "wide band: spans a factor of 18" for bands whose ends differ by WIDE_FACTOR or more; null otherwise. */
export function wideBand(band: OpenBand): string | null {
  if (band.lo === null || band.hi === null || !(band.lo > 0) || !(band.hi > band.lo)) return null;
  const f = band.hi / band.lo;
  return f >= WIDE_FACTOR ? `wide band: its ends differ by a factor of ${f >= 10 ? Math.round(f) : sig2(f)}` : null;
}

/** The band as text in its units: "0.11–0.19", "at least 0.3", "at most 0.05". */
export function bandText(band: OpenBand): string {
  if (band.lo !== null && band.hi !== null) return `${band.lo}–${band.hi}`;
  if (band.lo !== null) return `at least ${band.lo}`;
  if (band.hi !== null) return `at most ${band.hi}`;
  return 'no numeric band';
}

/**
 * A number with no more precision than its interval supports: two significant digits of the interval's width; with no
 * interval, three significant digits.
 */
export function fmtValue(v: number | null | undefined, interval?: [number, number] | null): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  let digits: number;
  if (interval && Number.isFinite(interval[0]) && Number.isFinite(interval[1]) && interval[1] > interval[0]) {
    const w = interval[1] - interval[0];
    digits = Math.max(0, 1 - Math.floor(Math.log10(w)));
  } else {
    const a = Math.abs(v);
    digits = a === 0 ? 0 : Math.max(0, 2 - Math.floor(Math.log10(a)));
  }
  digits = Math.min(digits, 4);
  const s = v.toFixed(digits);
  return /\./.test(s) ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** Days of simulated time in words, as a person counts them ("38 days", "1.4 years", "less than a day"). */
export function daysWords(days: number): string {
  if (days < 1) return 'less than a day';
  if (days < 365) { const d = Math.floor(days); return `${d} day${d === 1 ? '' : 's'}`; }
  const y = sig2(days / 365);
  return `${y} year${y === '1' ? '' : 's'}`;
}

/**
 * Rough wall time to watch `days` more simulated days at the nominal 1 day/s (one simulated day per real second; at 120
 * animals the clock reaches about 0.8 day/s, and a background tab stops it). Always marked rough.
 */
export function wallWords(days: number): string {
  const s = Math.max(0, days);
  if (s < 90) return `about ${Math.max(1, Math.round(s))} seconds at 1 day/s, rough`;
  if (s < 5400) return `about ${Math.round(s / 60)} minutes at 1 day/s, rough`;
  return `about ${sig2(s / 3600)} hours at 1 day/s if the tab stays in front, rough`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** "2026-10-06" → "6 October 2026". */
export function dateWords(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}
/** The scorer's pattern note "3/5 seeds show the pattern" in plain words ("shown in 3 of 5 worlds"). */
export function patternWords(note: string): string {
  const m = /^(\d+)\/(\d+) seeds show the pattern/.exec(note);
  return m ? `shown in ${m[1]} of ${m[2]} worlds` : note;
}
