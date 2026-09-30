import type { Chimp, World } from '../types';
import { addEvent, episode } from './events';
import { killChimp } from './life';
import { paramsOf, type Params } from './params';
import { clamp, random } from './rng';
import { index, ix } from './state';

// Stage C8 snare injuries (docs/realism-design.md §5.7). Wire snares set for other animals maim chimpanzees throughout
// Kibale, more near the park boundary; T-DEM-9 (fitted): about 10–30% of individuals over 3 y carry a snare injury (wood2017,
// emeryThompson2020, fedurek2022). Risk grid: a map-edge ramp as the park-boundary proxy over an interior floor (design).
// Hazard per km walked on the ground in risky cells; the injury is a permanent limb disability that lowers feeding intake
// (slower climbing is not modelled: a stylization), with a small death risk (Ngogo reports no known snare deaths).

/** Snare risk 0..1 at (x, z): snareInteriorRisk everywhere, rising to 1 at the map edge over the outer snareEdgeBandFrac of the half-width. */
export function snareRisk(world: World, x: number, z: number, P: Params): number {
  const half = world.size / 2, edge = Math.min(half - Math.abs(x), half - Math.abs(z));
  const ramp = clamp(1 - edge / Math.max(1e-6, P.snareEdgeBandFrac * half));
  return P.snareInteriorRisk + (1 - P.snareInteriorRisk) * ramp;
}

/** Feeding intake multiplier of a snare-injured animal (permanent). */
export const snareIntake = (c: Chimp, P: Params) => 1 - P.snareIntakeLoss * ix(c).snare;

/** Slow step: ground travel since the last step exposes independent walkers to snares. */
export function slowSnares(world: World): void {
  const P = paramsOf(world);
  if (P.snareHazardPerKm <= 0) return;
  for (const c of index(world).alive.slice()) {
    if (!c.alive) continue;
    const x = ix(c), px = c.position[0], pz = c.position[2];
    const d = Math.hypot(px - x.trX, pz - x.trZ);
    x.trX = px; x.trZ = pz;
    if (x.snare > 0 || d < 0.05 || c.position[1] > 0.5 || (!x.weaned && c.age < 4)) continue;
    const p = 1 - Math.exp(-P.snareHazardPerKm * snareRisk(world, px, pz, P) * d / 1000);
    if (random(world) >= p) continue;
    x.snare = P.snareSeverityMin + (1 - P.snareSeverityMin) * random(world); // severity of the disability
    c.snared = true; // contract mirror (permanent)
    c.injury = clamp(c.injury + P.snareWound);
    episode(world, c, 'life', 'Caught a hand in a wire snare');
    addEvent(world, `${c.name} was caught in a wire snare and injured a limb`, 'life', [c.id], c.troopId, 1);
    if (random(world) < P.snareDeathP) killChimp(world, c, 'snare injury', 2);
  }
}
