import type { Environment, Weather, World } from '../types';
import { clamp, hash01, random, smoothstep } from './rng';
import { DEFAULTS, paramsOf, type Params } from './params';
import { patchFruitIndex } from './phenology';
import { NEVER, SLOW_HOURS, START_DOY, START_HOUR, TICK_HOURS, simOf } from './state';

// Kibale (Ngogo) sits at ~0.5°N, 30.4°E; clocks run East Africa Time (UTC+3).
// Near the equator days are ~12 h year-round; sunrise ~06:45-07:00, sunset ~18:50-19:05. [M]
const LAT = DEFAULTS.siteLatDeg * Math.PI / 180; // registry siteLatDeg, siteLonDeg, siteTzH (fixed)
const LON = DEFAULTS.siteLonDeg;
const TZ = DEFAULTS.siteTzH;
const SYNODIC = 29.530588853;
// Days from the reference new moon (2000-01-06 18:14 UTC) to the run start (2026-09-28 03:30 UTC = 06:30 EAT).
const MOON_START = (Date.UTC(2026, 8, 28, 3, 30) - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;

// Approximate Kibale monthly rainfall (registry rainJanMm..rainDecMm), bimodal: Mar-May and Sep-Nov wet. These monthly
// values (sum ~1,500 mm) only modulate the weather chain below, which yields ~1,650 mm/yr (scripts/sim-metrics.ts).
const monthMmCache = new WeakMap<Params, number[]>();
function monthMm(P: Params): number[] {
  let mm = monthMmCache.get(P);
  if (!mm) { mm = [P.rainJanMm, P.rainFebMm, P.rainMarMm, P.rainAprMm, P.rainMayMm, P.rainJunMm, P.rainJulMm, P.rainAugMm, P.rainSepMm, P.rainOctMm, P.rainNovMm, P.rainDecMm]; monthMmCache.set(P, mm); }
  return mm;
}
const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function monthOf(doy: number): number {
  let m = 0;
  for (let i = 0; i < 12; i++) if (doy - 1 >= MONTH_START[i]) m = i;
  return m;
}

/** Smooth monthly rainfall (mm) interpolated between month midpoints. */
export function rainfallAt(doy: number, P: Params): number {
  const MONTH_MM = monthMm(P);
  const d = ((doy - 1) % 365 + 365) % 365;
  let i = 11;
  for (let k = 0; k < 12; k++) if (d >= MONTH_START[k] + 15) i = k;
  let a = MONTH_START[i] + 15; if (a > d) a -= 365;
  const j = (i + 1) % 12;
  let b = MONTH_START[j] + 15; if (b <= a) b += 365;
  const t = (d - a) / (b - a);
  return MONTH_MM[i] * (1 - t) + MONTH_MM[j] * t;
}

export function isWetSeason(doy: number): boolean { const m = monthOf(doy); return (m >= 2 && m <= 4) || (m >= 8 && m <= 10); }

export function updateClock(world: World): void {
  const t = START_HOUR + world.time;
  world.hour = t % 24;
  world.day = Math.floor(t / 24) + 1;
  world.environment.dayOfYear = ((START_DOY - 1 + Math.floor(t / 24)) % 365) + 1;
}

/** NOAA-style solar position for lat 0.5°N, lon 30.4°E, EAT. */
export function updateSun(world: World): void {
  const env = world.environment;
  const g = 2 * Math.PI / 365 * (env.dayOfYear - 1 + (world.hour - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const trueSolarMin = world.hour * 60 + eqt + 4 * LON - 60 * TZ;
  const ha = (trueSolarMin / 4 - 180) * Math.PI / 180;
  const sinAlt = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  let az = Math.atan2(-Math.sin(ha) * Math.cos(decl), Math.cos(LAT) * Math.sin(decl) - Math.sin(LAT) * Math.cos(decl) * Math.cos(ha));
  if (az < 0) az += Math.PI * 2;
  env.sunAltitude = alt; env.sunAzimuth = az;
  // ~0 below -8° (end of nautical twilight), rising through civil twilight to full light by ~+12°
  const P = paramsOf(world);
  env.daylight = smoothstep(P.daylightLowDeg, P.daylightHighDeg, alt * 180 / Math.PI);
  const phase = (MOON_START + world.time / 24) / SYNODIC;
  env.moonPhase = phase - Math.floor(phase);
}

export function dayPhase(world: World): 'dawn' | 'day' | 'dusk' | 'night' {
  const d = world.environment.daylight;
  if (d <= 0.03) return 'night';
  if (d >= 0.97) return 'day';
  return world.hour < 12 ? 'dawn' : 'dusk';
}

const CLOUD: Record<Weather, number> = { clear: 0.12, cloudy: 0.62, rain: 0.88, storm: 1 };
const WIND: Record<Weather, number> = { clear: 0.12, cloudy: 0.22, rain: 0.3, storm: 0.85 };
// Rain intensity 1.0 ≈ 30 mm/h (design; registry rainMmPerH): read it with paramsOf(world).rainMmPerH.

/**
 * Seeded Markov chain over clear/cloudy/rain/storm, stepped every 5 eco-minutes, modulated by
 * season (monthly rainfall) and hour (afternoon convective storms). [M] Rates tuned so a simulated
 * year totals ~1,500-1,700 mm (see tests/sim-environment.test.ts).
 */
export function weatherTransition(world: World): Weather | null {
  const s = simOf(world);
  const w = s.weather;
  const P = paramsOf(world);
  const wet = rainfallAt(world.environment.dayOfYear, P) / 120;
  const h = world.hour;
  const afternoon = h >= 12.5 && h < 19 ? P.weatherAfternoonFactor : h >= 19 || h < 5 ? P.weatherNightFactor : P.weatherMorningFactor;
  const r = random(world);
  let next: Weather = w.state;
  switch (w.state) {
    case 'clear': if (r < 0.012 * (0.6 + wet) * (h >= 10 && h < 18 ? 1.8 : 0.7)) next = 'cloudy'; break;
    case 'cloudy':
      if (r < 0.0015 * wet * afternoon) next = h >= 12.5 && h < 19 && random(world) < 0.4 ? 'storm' : 'rain';
      else if (r > 1 - 0.03 * (1.5 - Math.min(1, wet))) next = 'clear';
      break;
    case 'rain': if (r < 0.07) next = 'cloudy'; else if (r > 0.994 && afternoon > 1) next = 'storm'; break;
    case 'storm': if (r < 0.1) next = 'rain'; break;
  }
  if (next === w.state) return null;
  setWeather(world, next);
  return next;
}

export function setWeather(world: World, next: Weather, intensity = -1): void {
  const w = simOf(world).weather;
  w.state = next; w.since = world.time;
  w.rainTarget = next === 'rain' ? (intensity >= 0 ? intensity : 0.12 + random(world) * 0.28) : next === 'storm' ? (intensity >= 0 ? intensity : 0.55 + random(world) * 0.35) : 0;
}

/** Per-tick smoothing of continuous weather values and diurnal temperature/humidity. Returns true at heavy-rain onset. */
export function updateWeatherValues(world: World): boolean {
  const env = world.environment;
  const w = simOf(world).weather;
  const k = 0.06;
  env.weather = w.state;
  env.cloud += (CLOUD[w.state] - env.cloud) * k;
  env.wind += (WIND[w.state] + (w.state === 'storm' ? 0.1 * Math.sin(world.tick * 0.7) : 0) - env.wind) * k;
  const before = env.rain;
  env.rain += (w.rainTarget - env.rain) * (w.rainTarget > env.rain ? 0.12 : 0.05);
  if (env.rain < 0.002) env.rain = 0;
  const P = paramsOf(world);
  w.rainMm += env.rain * P.rainMmPerH * TICK_HOURS;
  const h = world.hour;
  // ~15 °C before dawn to ~24 °C by early afternoon at ~1,500 m; cloud and rain cool. [M]
  const d0 = P.diurnalStartH, d1 = P.diurnalEndH;
  const diurnal = h >= d0 && h < d1 ? Math.pow(Math.max(0, Math.sin(Math.PI * (h - d0) / (d1 - d0))), P.diurnalShape) : 0;
  const nightCool = h >= d1 || h < d0 ? ((h >= d1 ? h - d1 : h + (24 - d1)) / (24 - d1 + d0)) * P.tempNightCoolC : 0;
  const target = P.tempBaseC + P.tempDiurnalC * diurnal - nightCool - env.cloud * P.tempCloudC * diurnal - env.rain * P.tempRainC;
  env.temperature += (target - env.temperature) * 0.04;
  const hum = clamp(0.95 - 0.3 * diurnal + env.rain * 0.4 + env.cloud * 0.08, 0.45, 1);
  env.humidity += (hum - env.humidity) * 0.05;
  if (w.state === 'storm' && random(world) < 0.035 * env.rain) env.lightningAt = world.time;
  const onset = !w.heavy && env.rain >= 0.35;
  if (onset) w.heavy = true;
  else if (w.heavy && env.rain < 0.15) w.heavy = false;
  return onset && before < 0.35;
}

/**
 * Habitat ripe-fruit availability lags rainfall by ~6 weeks (design, phenology is site-specific [L]),
 * scaled down by an active drought intervention.
 */
export function fruitIndexNow(world: World): number {
  const P = paramsOf(world);
  const lagDoy = ((world.environment.dayOfYear - P.fruitLagDays - 1) % 365 + 365) % 365 + 1;
  const base = clamp(0.32 + 0.38 * rainfallAt(lagDoy, P) / 185 + 0.08 * Math.sin((world.environment.dayOfYear / 365) * Math.PI * 6), 0.12, 0.95);
  return simOf(world).droughtUntil > world.time ? base * P.droughtFruitFactor : base;
}

const FIG = /Ficus/;

/** Slow fruit update: each tree ripens toward a species/season target; figs fruit asynchronously. [H for fig asynchrony, rates L] */
export function updateFruit(world: World): void {
  const env = world.environment;
  const s = simOf(world);
  if (paramsOf(world).patchEcology === 1) {
    // patch ecology: crops are read lazily from phenology (phenology.ts); only the habitat index and the fig mast timer here
    env.fruitIndex = patchFruitIndex(world);
    if (s.figUntil !== NEVER && s.figUntil <= world.time) { s.figTree = -1; s.figUntil = NEVER; }
    return;
  }
  env.fruitIndex = fruitIndexNow(world);
  const drought = s.droughtUntil > world.time;
  const days = world.time / 24;
  const dt = SLOW_HOURS / 24;
  const P = paramsOf(world);
  const rise = 1 - Math.exp(-dt * P.cropRiseRate), fall = 1 - Math.exp(-dt * P.cropFallRate);
  for (const t of world.trees) {
    let avail: number;
    if (FIG.test(t.species)) {
      const ph = hash01(t.id, 7, 3);
      const c = Math.sin(Math.PI * 2 * (days / P.figCycleDays + ph));
      avail = 0.12 + 0.88 * Math.pow(Math.max(0, c), 2) * (drought ? P.droughtFigFactor : 1);
    } else {
      const ph = hash01(t.id, 11, 5);
      avail = env.fruitIndex * (0.35 + 0.65 * Math.max(0, Math.sin(Math.PI * 2 * (days / P.fruitCycleDays + ph))));
    }
    if (t.id === s.figTree && s.figUntil > world.time) avail = P.figMastLevel;
    const target = t.maxFruit * avail;
    if (t.fruit < target) t.fruit += (target - t.fruit) * rise;
    else t.fruit -= (t.fruit - target) * fall;
    if (t.fruit < 0) t.fruit = 0;
  }
  if (s.figUntil !== NEVER && s.figUntil <= world.time) { s.figTree = -1; s.figUntil = NEVER; }
}

export function initEnvironment(): Environment {
  return { weather: 'cloudy', rain: 0, cloud: 0.55, wind: 0.15, humidity: 0.95, temperature: 15.6, lightningAt: -1, season: 'wet',
    dayOfYear: START_DOY, daylight: 0, sunAltitude: 0, sunAzimuth: 0, moonPhase: 0, fruitIndex: 0.5 };
}

export function updateSeason(world: World): void {
  world.environment.season = isWetSeason(world.environment.dayOfYear) ? 'wet' : 'dry';
}
