import type { Chimp } from '../types';
import type { Params } from './params';

// Stage E4k (huntPursuit; docs/staging/e4k-prereg.md §4): whether a hunt succeeds, and how many red colobus die, come from
// the pursuit instead of two dice. Kibale's canopy is high and continuous (mitaniWatts1999), so the monkeys can flee in
// any direction; what cuts an escape off is a hunter at canopy height near its line. A monkey fleeing straight away at
// speed v from a pursuer moving at k·v is intercepted only if it flees within asin(k) of the pursuer's bearing (the
// Apollonius circle of the pair; every direction once the pursuer is faster). At equal speeds an evader is cut off from
// every direction exactly when it lies inside the convex hull of its pursuers: three hunters around a group, never one or
// two. One monkey dies per disjoint set of hunters that closes the circle (kills from the same scene). The pursuit speed
// ratio is design (huntPursuitSpeedRatio 1: no measurement of either species' speed through the canopy was found). Pure:
// no RNG, no state.

export const pursuitOn = (P: Params) => P.huntPursuit >= 1;
/** Iteration 2 (huntPursuit 2): the pursuit is read at the end of every tick (ecology.ts pursuitStep), not at the resolution moment. */
export const pursuitEachTick = (P: Params) => P.huntPursuit === 2;

/** Approach height of a hunter, as a share of the colobus group's height (today's approach target, execution.ts 'hunt'). */
export const HUNT_CLIMB = 0.85;
/** A hunter is at canopy height when no more than this far below his approach height (m; numerical tolerance). */
export const HUNT_CLIMB_TOL_M = 0.5;
/** Standoff of a hunter from the colobus group's point (m; today's approach target, execution.ts 'hunt'). */
export const HUNT_STANDOFF_M = 2;

/**
 * The animal's own movement factor: life stage, injury and alertness (energy). execution.ts speedFactor multiplies it by
 * the rain and light terms, which slow a fleeing colobus as much and so stay out of the pursuit's speed ratio. Pure.
 */
export function bodySpeed(c: Chimp): number {
  const stage = c.age < 2 ? 0.55 : c.age < 5 ? 0.7 : c.age < 10 ? 0.88 : c.age >= 40 ? 0.82 : 1;
  return stage * (1 - 0.6 * c.injury) * (0.7 + 0.3 * c.energy);
}

/** Half-angle (rad) of the escape directions a pursuer at k times the evader's speed cuts off: asin(k), all (π) when k > 1. */
export const coneHalfAngle = (k: number): number => (k > 1 ? Math.PI : Math.asin(Math.max(0, k)));

/** The pursuit cone of hunter c (huntPursuitSpeedRatio × his own movement factor). Pure. */
export const pursuitCone = (c: Chimp, P: Params): number => coneHalfAngle(P.huntPursuitSpeedRatio * bodySpeed(c));

const TAU = 2 * Math.PI;
/** Escape directions closer than this to a cone's edge are not counted as cut off (rad): two hunters exactly opposite leave the escape along their bisector open. */
const MARGIN = 0.001;
const angDist = (x: number, y: number) => { const d = (((x - y) % TAU) + TAU) % TAU; return d > Math.PI ? TAU - d : d; };

/** True when the cones of the hunters in `set` (bearings b, half-angles a) leave no escape direction. Pure. */
export function closes(b: readonly number[], a: readonly number[], set: readonly number[]): boolean {
  for (const i of set) if (a[i] >= Math.PI) return true;
  if (set.length < 2) return false;
  // an open escape direction, if any, begins just past the counter-clockwise edge of some cone
  for (const i of set) {
    const p = b[i] + a[i] + MARGIN;
    let cut = false;
    for (const j of set) if (angDist(p, b[j]) < a[j] - MARGIN) { cut = true; break; }
    if (!cut) return false;
  }
  return true;
}

/** The smallest subset of `left` (indexes) that closes the circle, first in index order among those of its size; null if none. */
function smallestClosing(b: readonly number[], a: readonly number[], left: readonly number[]): number[] | null {
  if (!closes(b, a, left)) return null;
  const n = left.length;
  if (n > 10) {
    // many hunters (not reached by the model's parties): drop hunters in reverse index order while the rest still closes
    const s = [...left];
    for (let k = s.length - 1; k >= 0; k--) { const t = s.slice(0, k).concat(s.slice(k + 1)); if (closes(b, a, t)) s.splice(k, 1); }
    return s;
  }
  for (let size = 1; size <= n; size++) {
    const idx = Array.from({ length: size }, (_, k) => k);
    for (;;) {
      const set = idx.map(k => left[k]);
      if (closes(b, a, set)) return set;
      let k = size - 1;
      while (k >= 0 && idx[k] === n - size + k) k--;
      if (k < 0) break;
      idx[k]++;
      for (let m = k + 1; m < size; m++) idx[m] = idx[m - 1] + 1;
    }
  }
  return null;
}

/**
 * Disjoint sets of hunters (indexes into b and a, in join order) that each close every escape direction, found greedily:
 * the smallest closing set first, then again among the hunters left. One red colobus dies per set. Pure.
 */
export function closingSets(b: readonly number[], a: readonly number[]): number[][] {
  const left = b.map((_, i) => i), out: number[][] = [];
  for (;;) {
    const s = smallestClosing(b, a, left);
    if (!s) return out;
    out.push(s);
    for (const i of s) left.splice(left.indexOf(i), 1);
  }
}

/** Captures that n hunters spread evenly around a group (where the pursuit leads them), each with cone half-angle a, expect. Pure. */
export function evenCaptures(n: number, a: number): number {
  if (n < 1) return 0;
  const b: number[] = [], h: number[] = [];
  for (let i = 0; i < n; i++) { b.push(TAU * i / n); h.push(a); }
  return closingSets(b, h).length;
}

/**
 * Bearing (rad from the group; x = sin, z = cos) a hunter heads for: the middle of the widest escape gap the other
 * hunters leave, or his own bearing when he is alone (the monkeys flee where no one is). Ties: the first gap in bearing
 * order. Pure.
 */
export function spreadBearing(own: number, others: readonly number[]): number {
  if (!others.length) return own;
  const s = others.map(x => ((x % TAU) + TAU) % TAU).sort((x, y) => x - y);
  let best = -1, mid = own;
  for (let i = 0; i < s.length; i++) {
    const g = (i + 1 < s.length ? s[i + 1] : s[0] + TAU) - s[i];
    if (g > best + 1e-9) { best = g; mid = s[i] + g / 2; }
  }
  return mid;
}
