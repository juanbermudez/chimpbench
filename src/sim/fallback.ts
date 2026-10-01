// Stage C7c (field; docs/staging/c7b-prereg.md §6.1): fallback foods (pith, herbs, sapling leaves) as a patchy, depletable
// forage field on forageCellM cells. Intake at full stock is fallbackRateRatio of the ripe-fruit rate (energy intake of pith
// and young leaves vs ripe fruit, weighted by Kanyawara feeding shares; uwimbabazi2019, potts2011) [H], times the cell's
// habitat and season term (forageYield ÷ its mean). A cell holds fallbackCapH × (p + 1) u^p feeding-hours when full
// (patchy; design, malenky1994 [M]); feeding removes stock in proportion to what is left (a linear functional response),
// and a deficit regrows over fallbackRegrowDays (design). Off (the unlimited field) when fallbackCapH is 0.
import type { Chimp, World } from '../types';
import { paramsOf, type Params } from './params';
import { forageYield } from './phenology';
import { hash01 } from './rng';
import { simOf } from './state';

export const fallbackOn = (P: Params) => P.fallbackCapH > 0;

const keyOf = (cx: number, cz: number) => (cx + 1000) * 10000 + (cz + 1000);

/** Capacity of cell (cx, cz) in feeding-hours at the full rate: mean fallbackCapH, skewed by fallbackPatchExp. */
function capacity(P: Params, cx: number, cz: number): number {
  const p = P.fallbackPatchExp;
  return P.fallbackCapH * (p + 1) * hash01(cx + 100000, cz + 100000, 98) ** p;
}

/** Share of the cell's capacity standing now (1 = full). Pure. */
function stockFrac(world: World, P: Params, cx: number, cz: number, time: number): number {
  const d = simOf(world).fallback?.[keyOf(cx, cz)];
  if (!d) return 1;
  const cap = capacity(P, cx, cz);
  if (cap <= 0) return 0;
  const def = d[0] * Math.exp(-(time - d[1]) / (P.fallbackRegrowDays * 24));
  const f = 1 - def / cap;
  return f > 0 ? f : 0;
}

/** Share of the capacity of the cell at (x, z) standing now (1 = full, or when off). Pure. */
export function fallbackStock(world: World, x: number, z: number): number {
  const P = paramsOf(world), cell = P.forageCellM;
  return fallbackOn(P) ? stockFrac(world, P, Math.floor(x / cell), Math.floor(z / cell), world.time) : 1;
}

/** Relative intake rate at (x, z) now: habitat × season (mean 1) × stock share; 1 is a mean cell at full stock. Pure. */
export function fallbackValue(world: World, x: number, z: number): number {
  const P = paramsOf(world), cell = P.forageCellM;
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  if (capacity(P, cx, cz) <= 0) return 0;
  return forageYield(world, x, z) / ((P.forageYieldMin + P.forageYieldMax) / 2) * stockFrac(world, P, cx, cz, world.time);
}

/**
 * The best fallback the animal can see: its own cell, and neighbouring cells whose nearest edge lies within `sight` m.
 * Writes the chosen cell's centre into `out` and returns its relative rate. Pure.
 */
export function bestFallbackNear(world: World, x: number, z: number, sight: number, out: [number, number]): number {
  const P = paramsOf(world), cell = P.forageCellM;
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  let best = fallbackValue(world, x, z);
  out[0] = x; out[1] = z;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dz === 0) continue;
    const x0 = (cx + dx) * cell, z0 = (cz + dz) * cell;
    const ex = x < x0 ? x0 - x : x > x0 + cell ? x - x0 - cell : 0, ez = z < z0 ? z0 - z : z > z0 + cell ? z - z0 - cell : 0;
    if (ex * ex + ez * ez > sight * sight) continue;
    const mx = x0 + cell / 2, mz = z0 + cell / 2, v = fallbackValue(world, mx, mz);
    if (v > best) { best = v; out[0] = mx; out[1] = mz; }
  }
  return best;
}

/** One tick of fallback feeding by `c` for `dtH` hours: returns the hunger removed (stage E1, energyLedger: the kcal offered) and depletes the cell. */
export function eatFallback(world: World, c: Chimp, dtH: number): number {
  const P = paramsOf(world), cell = P.forageCellM, s = simOf(world), time = world.time;
  const cx = Math.floor(c.position[0] / cell), cz = Math.floor(c.position[2] / cell);
  const cap = capacity(P, cx, cz);
  if (cap <= 0) return 0;
  const frac = stockFrac(world, P, cx, cz, time);
  const gain = (P.energyLedger === 1 ? P.ledgerFallbackKcalPerMin * 60 : P.fruitIntakePerH * P.fruitHungerFactor * P.fallbackRateRatio) * forageYield(world, c.position[0], c.position[2]) / ((P.forageYieldMin + P.forageYieldMax) / 2) * frac * dtH;
  const k = keyOf(cx, cz);
  (s.fallback ??= {})[k] = [Math.min(cap, (1 - frac) * cap + frac * dtH), time];
  return gain;
}

/** Daily: drop regrown cells so the saved state stays small. */
export function pruneFallback(world: World): void {
  const P = paramsOf(world), s = simOf(world);
  if (!s.fallback) return;
  for (const k of Object.keys(s.fallback)) {
    const d = s.fallback[+k];
    if (d[0] * Math.exp(-(world.time - d[1]) / (P.fallbackRegrowDays * 24)) < 1e-3 * P.fallbackCapH) delete s.fallback[+k];
  }
}
