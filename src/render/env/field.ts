import { hyp2 } from '../fastmath';
import type { World } from '../../types';
// Field view (realism stage C5b; docs/realism-design.md §5.1): pure helpers for the real-metre profile. No three.js,
// no DOM. The field world is ~8 km across in logical metres; the renderer draws it at 1:1 (render = logical) with a
// detailed *window* (terrain, forest, water, rocks and logs within ~130 m of a centre) that is rebuilt around the
// camera focus as it moves, plus a whole-map *overview* (canopy surface, stream, community ranges, party markers) that
// takes over as the view zooms out. Everything procedural in a window is a pure function of its 64 m tile (tile seed),
// and simulated trees are built from their own id, so a rebuilt window draws the same forest where windows overlap.

/** Streaming tile (m): 4 × 4 of the 16 m culling cells (cells.ts). */
export const FIELD_TILE = 64;
/** Rebuild the window once the focus is this far (m) from its centre; the detailed forest reaches ~130 m. */
export const RECENTRE_M = 40;
/** Window centres snap to this grid (m), so small focus moves never rebuild. */
export const CENTRE_SNAP = 16;
/** Frame height (m) band over which the overview replaces the window when zooming out (strategy camera). */
export const OVERVIEW_IN = 260, OVERVIEW_FULL = 700;
/**
 * Strategy-camera zoom a field scene opens at (frame height ≈ 64 m at 1440 × 900, the party framing of
 * scripts/field-probe.mjs): the forest at real scale around the focus animal's party, not the 8 km overview.
 */
export const FIELD_START_ZOOM = 1.6;
/**
 * A new field world opens in the close view on the focus animal: a low orbit (m, elevation rad) with crowns and trunks
 * filling the frame and its party readable. Design choice (user feedback: "closer to the jungle"), not a measurement.
 */
export const FIELD_START_ORBIT = 8, FIELD_START_PITCH = 0.3;

/** 32-bit hash of a world seed, a tile and a salt (stable across windows and sessions). */
export function tileSeed(seed: number, tx: number, tz: number, salt = 0): number {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (tx | 0), 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h ^ (tz | 0), 0xc2b2ae35); h ^= h >>> 16;
  h = Math.imul(h ^ (salt | 0), 0x27d4eb2f); h ^= h >>> 15;
  return h >>> 0;
}

/** Tile index range [t0, t1] (inclusive) covering [c − r, c + r] on one axis. */
export function tileRange(c: number, r: number, tile = FIELD_TILE): [number, number] {
  return [Math.floor((c - r) / tile), Math.floor((c + r) / tile)];
}

/**
 * Where the next window should be centred for a focus at (fx, fz) moving at (vx, vz) m/s (render-side smoothed): a
 * little ahead of the motion (lead s, capped at 30 m) and snapped to CENTRE_SNAP. out = [x, z].
 */
export function windowCentre(fx: number, fz: number, vx: number, vz: number, out: number[], lead = 1.5, half = 4000): number[] {
  let dx = vx * lead, dz = vz * lead;
  const d = hyp2(dx, dz);
  if (d > 30) { dx *= 30 / d; dz *= 30 / d; }
  const lim = Math.max(0, half - 150);
  out[0] = Math.max(-lim, Math.min(lim, Math.round((fx + dx) / CENTRE_SNAP) * CENTRE_SNAP));
  out[1] = Math.max(-lim, Math.min(lim, Math.round((fz + dz) / CENTRE_SNAP) * CENTRE_SNAP));
  return out;
}

/** Ground point (x, z) a field scene opens on: the centre of the animal's party, else the animal; null if it is unknown. */
export function partyFocus(world: World, id: number | undefined): [number, number] | null {
  const c = id === undefined ? undefined : world.chimps.find(x => x.id === id);
  if (!c) return null;
  const p = world.parties.find(q => q.id === c.partyId && q.troopId === c.troopId);
  return p ? [p.center[0], p.center[2]] : [c.position[0], c.position[2]];
}

/** True when a focus at (fx, fz) has drifted far enough from the window centre (ox, oz) to rebuild. */
export function needsRecentre(ox: number, oz: number, fx: number, fz: number, threshold = RECENTRE_M): boolean {
  return hyp2(fx - ox, fz - oz) > threshold;
}

/** 0 → 1 weight of the overview (whole-map layer) by frame height; perspective views never use it. */
export function overviewWeight(hf: number, perspective: boolean): number {
  if (perspective) return 0;
  const u = Math.min(1, Math.max(0, (hf - OVERVIEW_IN) / (OVERVIEW_FULL - OVERVIEW_IN)));
  return u * u * (3 - 2 * u);
}

/** Strategy-camera zoom that frames `span` metres vertically, for an orthographic frame of `frame` m at zoom 1. */
export function zoomForSpan(span: number, frame: number): number { return frame / Math.max(1, span); }

/**
 * Strategy camera distance (m) for a frame height hf: an orthographic image does not depend on it, but the whole
 * frame must lie between the near and far planes at km scale. Unchanged (260 m) up to the compressed map's zoom-out.
 */
export function rtsDistanceFor(hf: number, base = 260): number { return Math.max(base, hf * 1.6); }

/** Exponential approach of an anchor toward a target (render-side party anchors); returns the new value. */
export function approach(current: number, target: number, dt: number, tau: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) / Math.max(1e-3, tau)));
}

/** Screen radius (px) of a party marker with n members. */
export function partyMarkerPx(n: number): number { return 6 + 3.5 * Math.sqrt(Math.max(1, n)); }

/** Runs a step generator to completion (the compressed map builds its environment synchronously). */
export function runSteps<T>(gen: Generator<unknown, T, void>): T {
  for (;;) { const r = gen.next(); if (r.done) return r.value; }
}

/**
 * Steps a generator until `budgetMs` has elapsed (checked between steps); returns the result once done, else
 * undefined. now() is injectable for tests.
 */
export function stepFor<T>(gen: Generator<unknown, T, void>, budgetMs: number, now: () => number = () => performance.now(), stats?: { maxStepMs: number }): { done: boolean; value?: T } {
  const start = now(), until = start + budgetMs;
  let t = start;
  for (;;) {
    const r = gen.next();
    const t1 = now();
    if (stats && t1 - t > stats.maxStepMs) stats.maxStepMs = t1 - t;
    t = t1;
    if (r.done) return { done: true, value: r.value };
    if (t1 >= until) return { done: false };
  }
}
