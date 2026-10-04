import type { World } from '../types';
import { sunAltitudeAt } from './environment';
import type { Params } from './params';
import { paramsOf } from './params';

// Stage E2c (docs/staging/e2c-prereg.md, switch darkCost): what darkness does to an animal, from physics and physiology
// measured apart from chimpanzee behaviour, replacing the darkness weight of the nest (rhythmDarkW).
//   light:  illuminance of the sky from the sun's altitude (the U.S. Naval Observatory sky model, janiczekDeYoung1987)
//           under the cloud attenuation the heat balance already uses (kastenCzeplak1980), times the share of open-sky
//           light reaching the animal's height under the canopy (the E2a profile rhythmShadeGround … rhythmShadeCrown);
//   vision: relative visual acuity at that light (shlaer1937, human; cross-species), through a retinal illuminance in
//           trolands per lux (reflectance × dark-adapted pupil ÷ π, assumed);
//   use:    vision relative to full daylight at the same place and sky (1 whenever daylight is 1). Feeding (finding
//           and picking ripe fruit, picking leaves) and the sight radius follow it, and the walking pace rises from its
//           near-darkness share (walkDarkPace, figueiro2011) to 1 with it (candidates.ts, execution.ts, perception.ts;
//           the three couplings are design assumptions, docs/staging/e2c-prereg.md §2.3).
// Everything here is pure: no rng, no world mutation.

const DEG = Math.PI / 180;
/** Earth radius over the scale height of the atmosphere, and the extinction terms of the sky model (janiczekDeYoung1987). */
const EARTH_H = 753.66156, EXT_DIRECT = 0.21, EXT_SKY = 0.042, SKY_SHARE = 0.0289;

/** Refraction of the apparent altitude (degrees), as in the sky model: none below −5/6°. */
function refracted(hDeg: number): number {
  return hDeg < -5 / 6 ? hDeg : hDeg + 1 / Math.tan((hDeg + 8.6 / (hDeg + 4.42)) * DEG) / 60;
}

/** Direct plus scattered sunlight on a horizontal surface, as a share of the solar constant term (sky model). */
function atmos(hDeg: number): number {
  const u = Math.sin(hDeg * DEG), s = Math.asin(EARTH_H * Math.cos(hDeg * DEG) / (EARTH_H + 1));
  const m = EARTH_H * (Math.cos(s) - u) + Math.cos(s);
  return Math.exp(-EXT_DIRECT * m) * u + SKY_SHARE * Math.exp(-EXT_SKY * m) * (1 + (hDeg + 90) * u / (180 / Math.PI));
}

/** Illuminance of the open sky on a horizontal surface (lux): the sun at `alt` (radians, geometric) under `cloud` 0..1. */
export function skyLux(P: Params, alt: number, cloud: number): number {
  const sun = P.skyLuxSun * Math.max(0, atmos(refracted(alt / DEG)));
  return sun * (1 - P.rhythmCloudAtt * Math.pow(cloud, P.rhythmCloudExp)) + P.skyLuxNight;
}

/** Share of open-sky light reaching height `y` (m) under the canopy: the E2a profile, linear from the floor to the canopy. */
export function canopyShare(P: Params, y: number): number {
  return P.rhythmShadeGround + (P.rhythmShadeCrown - P.rhythmShadeGround) * Math.min(1, Math.max(0, y) / P.rhythmCanopyM);
}

/** Visual acuity relative to its photopic maximum at illuminance `lux` (shlaer1937 fit: 1 / (1 + (K / T)^n), T in trolands). */
export function acuity(P: Params, lux: number): number {
  const td = lux * P.sightRetinaTdPerLux;
  return td > 0 ? 1 / (1 + Math.pow(P.sightAcuityHalfTd / td, P.sightAcuityExp)) : 0;
}

/**
 * Vision at height `y` with the sun at `alt` under `cloud`, relative to full daylight at the same height under the same
 * sky (the sun at daylightHighDeg, where the simulation's daylight reaches 1): 0..1, and exactly 1 from there up.
 */
export function visionAt(P: Params, alt: number, cloud: number, y: number): number {
  const hi = P.daylightHighDeg * DEG;
  if (alt >= hi) return 1;
  const share = canopyShare(P, y);
  const v = acuity(P, skyLux(P, alt, cloud) * share) / acuity(P, skyLux(P, hi, cloud) * share);
  return v < 1 ? v : 1;
}

/** Vision now at height `y` (1 in full daylight, without computing anything). */
export function visionNow(world: World, y: number): number {
  const env = world.environment;
  return env.daylight >= 1 ? 1 : visionAt(paramsOf(world), env.sunAltitude, env.cloud, y);
}

/** Stage E2c: darkCost replaces a term of the E2a nest value, so it acts only with rhythmSleep. */
export const darkOn = (P: Params): boolean => P.darkCost === 1 && P.rhythmSleep === 1;

/** Sight radius at vision `v`: the night radius in the dark, the day radius in full light (the E2a interpolation, by vision). */
export function sightAt(P: Params, v: number): number { return P.sightNightM + (P.sightDayM - P.sightNightM) * v; }

/** Walking and climbing pace at vision `v`, a share of the daylight pace: walkDarkPace in near-darkness, 1 in full light. */
export function paceAt(P: Params, v: number): number { return P.walkDarkPace + (1 - P.walkDarkPace) * v; }

/** The light on a trip: the mean walking pace over the walk and the vision in the crown on arrival. */
export interface TripLight { pace: number; see: number }

/**
 * Light on a trip of `distM` metres to a crown fed in at height `crownY`: the pace averaged between now and arrival (on
 * the floor) and the vision in the crown on arrival, with the sun where it will be when the animal arrives at the
 * daylight pace under today's cloud. Both 1 when the sun stays above daylightHighDeg until then. Writes into `out`.
 */
export function tripLight(world: World, P: Params, distM: number, crownY: number, out: TripLight, speed = P.walkMps): TripLight {
  // stage E2i (walkGait): the walk at the animal's walking speed (gait.ts tripSpeed), walkMps by default
  const env = world.environment, walkH = distM / speed / 3600, hi = P.daylightHighDeg * DEG;
  // the sun's altitude changes by at most 15° an hour (the Earth's rotation): full light until arrival
  if (env.sunAltitude >= hi + walkH * (360 / 24) * DEG) { out.pace = 1; out.see = 1; return out; }
  const alt = sunAltitudeAt(world.time + walkH);
  out.pace = (paceAt(P, visionAt(P, env.sunAltitude, env.cloud, 0)) + paceAt(P, visionAt(P, alt, env.cloud, 0))) / 2;
  out.see = visionAt(P, alt, env.cloud, crownY);
  return out;
}
