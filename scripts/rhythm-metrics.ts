// Daily-rhythm benchmark (stage E2a, docs/staging/e2a-prereg.md; measurement only, simulation truth, field profile).
// When do chimpanzees nest and leave their nests relative to the sun, how long is the nest-to-nest active day, what
// do adults do in each hour, does midday rest follow the weather, what happens at night, and who shelters from rain.
// Field values are printed beside the results to compare against; nothing here feeds back into the model.
//
//   pnpm exec tsx scripts/rhythm-metrics.ts [--seeds 48,7] [--burn-in 30] [--days 30] [--workers 2] [--json out.json] [--md out.md] [--params '{"rhythmSleep":1,"rhythmHeat":1}']
//
// Burn-in + days may not exceed 90 (the limit on simulation length for this stage). Development seeds only.
// It reads the world between ticks and never writes it.
import { writeFileSync } from 'node:fs';
import { isMainThread, parentPort } from 'node:worker_threads';
import { createWorld, tickWorld } from '../src/simulation';
import { V } from '../src/sim/candidates';
import { skyLux } from '../src/sim/light';
import { paramsOf } from '../src/sim/params';
import { fruitAt } from '../src/sim/phenology';
import { ix } from '../src/sim/state';
import type { Chimp } from '../src/types';
import { runPool } from './lib/pool';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export interface RhythmJob { seed: number; burnIn: number; days: number; params: Record<string, number> }
type Cls = 'male' | 'lactating' | 'female';
const CLASSES: Cls[] = ['male', 'lactating', 'female'];
const KINDS = ['nest', 'rest', 'groom', 'feed', 'travel', 'other'] as const;
type Kind = typeof KINDS[number];
const TRAVEL = new Set(['travel', 'follow', 'patrol', 'hunt', 'flee', 'transfer', 'consort', 'drink', 'climb', 'charge']);
function kindOf(c: Chimp): Kind {
  const a = c.action;
  if (a === 'nest') return 'nest';
  if (a === 'rest' || a === 'shelter') return 'rest';
  if (a === 'groom') return 'groom';
  if (a === 'forage') return 'feed';
  return TRAVEL.has(a) ? 'travel' : 'other';
}
const DAYTYPES = ['hot', 'mild', 'cool', 'rainy'] as const;
const RAINBINS = ['none', '0.02–0.12', '0.12–0.3', '0.3–0.5', '> 0.5'] as const;
const rainBin = (r: number) => (r < 0.02 ? 0 : r < 0.12 ? 1 : r < 0.3 ? 2 : r < 0.5 ? 3 : 4);
const TEMPBINS = ['< 18', '18–20', '20–22', '22–24', '≥ 24'] as const;
const tempBin = (t: number) => (t < 18 ? 0 : t < 20 ? 1 : t < 22 ? 2 : t < 24 ? 3 : 4);

export interface RhythmResult {
  seed: number;
  /** One record per adult per full day: minutes from sunrise to leaving the nest, from sunset to the last nest entry, hours between them, nests entered after noon. */
  dayRec: { cls: Cls; wake: number; bed: number; build: number; active: number; entries: number; sWake: number; sBed: number }[];
  /** Adult-days on which the animal was out of a nest at solar midnight. */
  outAtMidnight: number; adultNights: number;
  /** Adult ticks out of a nest in the first three hours after sunrise, the middle of the day and the last three hours before sunset: [part][kind]. */
  parts: number[][];
  /** [hour][kind] adult ticks. */
  hourly: number[][];
  /** Midday (11:30–14:30) adult ticks by day type: [type] → [rest, rest + groom, feed, travel, all], days, mean °C, mean thermal load. */
  midday: Record<string, { n: number[]; days: number; temp: number; heat: number }>;
  /** Morning (08:00–11:00) for the same day types, as the contrast. */
  morning: Record<string, { n: number[] }>;
  /** Daytime adult ticks out of a nest by air temperature and sky: [tempBin][clear 0 / cloudy 1] → [rest, all]. */
  byTemp: number[][][];
  /** Night (daylight ≤ 0.03), independent animals aged 5+: ticks by kind, metres moved, animal-nights. */
  night: { ticks: Record<Kind, number>; metres: number; nights: number; adultTicks: Record<Kind, number> };
  /** Daylight ticks out of a nest by rain intensity: [bin] → [shelter, rest, feed, travel, all], adults and juveniles (5–10 y). */
  rain: { adult: number[][]; juvenile: number[][] };
  /** Thermal load and sleep pressure samples (adults). */
  heatMidday: number[]; sleepAtNoon: number[];
  /**
   * Stage E2b: one record per adult per morning with a nest departure (recorded at solar noon): minutes from sunrise to
   * the last exit from a nest, and the breakfast, the first feeding after it (0 none before noon, 1 fig crown, 2 other
   * crown, 3 fallback on the ground), metres from the nest, and other chimpanzees feeding in that crown when it started.
   */
  deps: { cls: Cls; wake: number; bf: 0 | 1 | 2 | 3; d: number; feeders: number; lux: number }[];
  /**
   * Stage E2c: per fruiting crown (crop ≥ 0.06 at sunrise) and day, the crop at sunset as a share of the crop at sunrise
   * (figs, other fruit): how much of a crown the forest takes within a day (frugivores, chimpanzees, phenology).
   */
  cropDay: { fig: number[]; other: number[] };
  births: number; deaths: number; causes: Record<string, number>; nightDeaths: number; living: number; adults: number;
  hungerAdult: number; hungerLact: number;
}

export function runRhythm(job: RhythmJob): RhythmResult {
  if (job.burnIn + job.days > 90) throw new RangeError('burn-in + days must not exceed 90');
  const w = createWorld(job.seed, { profile: 'field', params: job.params });
  for (let i = 0; i < job.burnIn * 5760; i++) tickWorld(w);
  const H0 = -0.833 * Math.PI / 180; // apparent sunrise and sunset (refraction and the sun's radius)
  const res: RhythmResult = {
    seed: job.seed, dayRec: [], outAtMidnight: 0, adultNights: 0, parts: [0, 1, 2].map(() => KINDS.map(() => 0)), hourly: Array.from({ length: 24 }, () => KINDS.map(() => 0)),
    midday: Object.fromEntries(DAYTYPES.map(k => [k, { n: [0, 0, 0, 0, 0], days: 0, temp: 0, heat: 0 }])),
    morning: Object.fromEntries(DAYTYPES.map(k => [k, { n: [0, 0, 0, 0, 0] }])),
    byTemp: TEMPBINS.map(() => [[0, 0], [0, 0]]),
    night: { ticks: Object.fromEntries(KINDS.map(k => [k, 0])) as Record<Kind, number>, metres: 0, nights: 0, adultTicks: Object.fromEntries(KINDS.map(k => [k, 0])) as Record<Kind, number> },
    rain: { adult: RAINBINS.map(() => [0, 0, 0, 0, 0]), juvenile: RAINBINS.map(() => [0, 0, 0, 0, 0]) },
    heatMidday: [], sleepAtNoon: [], deps: [], cropDay: { fig: [], other: [] }, births: 0, deaths: 0, causes: {}, nightDeaths: 0, living: 0, adults: 0, hungerAdult: 0, hungerLact: 0,
  };
  interface Track { inNest: boolean; nesting: boolean; start: number; lastStart: number; lastEntry: number; wake: number; sWake: number; sBed: number; atMid: boolean; entries: number; cls: Cls | null; px: number; pz: number;
    /** E2b: where the last morning exit was, and the breakfast after it (bf −1 = not yet). E2c: open-sky illuminance at the exit (lux). */
    wx: number; wz: number; bf: number; bd: number; bn: number; lux: number }
  const tr = new Map<number, Track>();
  const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);
  const clsOf = (c: Chimp): Cls => (c.sex === 'male' ? 'male' : c.lactating ? 'lactating' : 'female');
  let prevAlt = w.environment.sunAltitude, prevRise = false, sunrise = NaN, sunset = NaN, noon = NaN;
  // the day's midday and morning tallies are filed under the day type once the midday window has closed
  let mid = [0, 0, 0, 0, 0], morn = [0, 0, 0, 0, 0], midT = 0, midRain = 0, midTicks = 0, midHeat = 0, midHeatN = 0;
  const births0 = w.stats.births, deaths0 = w.stats.deaths, dead = new Set(w.chimps.filter(c => !c.alive).map(c => c.id));
  const treeOf = (id: number) => w.trees[id - 100001];
  let hungerA = 0, hungerAN = 0, hungerL = 0, hungerLN = 0;
  const P = paramsOf(w), dawnCrop = new Map<number, number>();
  for (let i = 0; i < job.days * 5760; i++) {
    tickWorld(w);
    const env = w.environment, alt = env.sunAltitude, rising = alt > prevAlt, time = w.time, hour = w.hour;
    const isSunrise = prevAlt < H0 && alt >= H0, isSunset = prevAlt >= H0 && alt < H0;
    const isNoon = prevRise && !rising && alt > 0, isMidnight = !prevRise && rising && alt < 0;
    if (isSunrise) { sunrise = time; dawnCrop.clear(); for (const tr0 of w.trees) { const f = fruitAt(w, tr0); if (f >= 0.06) dawnCrop.set(tr0.id, f); } }
    if (isSunset) { sunset = time; for (const [id, f0] of dawnCrop) { const tr0 = treeOf(id); (tr0.species.startsWith('Ficus') ? res.cropDay.fig : res.cropDay.other).push(fruitAt(w, tr0) / f0); } dawnCrop.clear(); }
    if (isNoon) noon = time;
    const night = env.daylight <= 0.03, light = env.daylight >= 0.1;
    const midWin = hour >= 11.5 && hour < 14.5, mornWin = hour >= 8 && hour < 11;
    if (midWin) { midT += env.temperature; midRain += env.rain > 0.05 ? 1 : 0; midTicks++; }
    for (const c of w.chimps) {
      if (!c.alive) {
        if (!dead.has(c.id)) { dead.add(c.id); res.causes[c.causeOfDeath ?? 'unknown'] = (res.causes[c.causeOfDeath ?? 'unknown'] ?? 0) + 1; if (night) res.nightDeaths++; }
        continue;
      }
      if (c.age < 5) continue;
      const adult = c.age >= 15, x = ix(c), k = kindOf(c), nest = inNest(c);
      let t = tr.get(c.id);
      if (!t) { t = { inNest: nest, nesting: c.action === 'nest', start: NaN, lastStart: NaN, lastEntry: NaN, wake: NaN, sWake: NaN, sBed: NaN, atMid: false, entries: 0, cls: null, px: c.position[0], pz: c.position[2], wx: 0, wz: 0, bf: -1, bd: NaN, bn: 0, lux: NaN }; tr.set(c.id, t); }
      if ((c.action === 'nest') !== t.nesting) { t.nesting = c.action === 'nest'; if (t.nesting) t.start = time; } // setting off to build
      if (nest !== t.inNest) {
        t.inNest = nest;
        if (nest) { t.lastEntry = time; t.lastStart = t.start; t.sBed = x.slp ?? 1 - c.energy; if (time > noon) t.entries++; }
        else if (rising) { t.wake = time; t.sWake = x.slp ?? 1 - c.energy; t.wx = c.position[0]; t.wz = c.position[2]; t.bf = -1; t.lux = skyLux(P, alt, env.cloud); } // between solar midnight and noon; the last exit counts
      }
      // E2b: the breakfast, the first feeding after the morning exit
      if (rising && !nest && t.bf < 0 && !Number.isNaN(t.wake) && c.action === 'forage' && x.phase === 2) {
        const tree = c.targetId > 100000 && c.targetId < 200000 ? treeOf(c.targetId) : undefined;
        t.bf = tree ? (tree.species.startsWith('Ficus') ? 1 : 2) : 3;
        t.bd = tree ? Math.hypot(tree.position[0] - t.wx, tree.position[2] - t.wz) : NaN;
        t.bn = tree ? w.chimps.reduce((n, o) => n + (o !== c && o.alive && o.action === 'forage' && o.targetId === tree.id ? 1 : 0), 0) : 0;
      }
      if (isNoon) {
        t.cls = adult ? clsOf(c) : null; if (adult) res.sleepAtNoon.push(1 - c.energy);
        if (adult && !Number.isNaN(t.wake) && !Number.isNaN(sunrise) && t.wake > sunrise - 6) res.deps.push({ cls: clsOf(c), wake: (t.wake - sunrise) * 60, bf: (t.bf < 0 ? 0 : t.bf) as 0 | 1 | 2 | 3, d: t.bd, feeders: t.bn, lux: t.lux });
      }
      if (isMidnight) {
        if (adult) { res.adultNights++; if (!nest) res.outAtMidnight++; }
        if (t.cls && t.atMid && nest && !Number.isNaN(t.wake) && !Number.isNaN(t.lastEntry) && t.lastEntry > noon && t.wake < noon && !Number.isNaN(sunrise) && !Number.isNaN(sunset))
          res.dayRec.push({ cls: t.cls, wake: (t.wake - sunrise) * 60, bed: (t.lastEntry - sunset) * 60, build: (sunset - t.lastStart) * 60, active: t.lastEntry - t.wake, entries: t.entries, sWake: t.sWake, sBed: t.sBed });
        t.atMid = nest; t.wake = NaN; t.entries = 0;
      }
      if (night) {
        res.night.ticks[k]++;
        if (adult) res.night.adultTicks[k]++;
        res.night.metres += Math.hypot(c.position[0] - t.px, c.position[2] - t.pz);
      }
      t.px = c.position[0]; t.pz = c.position[2];
      if (isMidnight) res.night.nights++;
      if (light && !nest && env.rain >= 0 && (adult || c.age < 10)) {
        const row = (adult ? res.rain.adult : res.rain.juvenile)[rainBin(env.rain)];
        row[4]++;
        if (c.action === 'shelter') row[0]++; else if (k === 'rest') row[1]++; else if (k === 'feed') row[2]++; else if (k === 'travel') row[3]++;
      }
      if (!adult) continue;
      res.hourly[Math.floor(hour)][KINDS.indexOf(k)]++;
      // thirds of the active day by the sun: sunrise is today's; before today's sunset, yesterday's + 24 h stands in
      if (!nest && alt >= H0 && !Number.isNaN(sunrise) && !Number.isNaN(sunset)) {
        const set = sunset > sunrise ? sunset : sunset + 24;
        res.parts[time - sunrise < 3 ? 0 : set - time < 3 ? 2 : 1][KINDS.indexOf(k)]++;
      }
      if (i % 240 === 0) { hungerA += c.hunger; hungerAN++; if (c.lactating) { hungerL += c.hunger; hungerLN++; } }
      if (midWin || mornWin) {
        const n = midWin ? mid : morn;
        n[4]++;
        if (k === 'rest') { n[0]++; n[1]++; } else if (k === 'groom') n[1]++; else if (k === 'feed') n[2]++; else if (k === 'travel') n[3]++;
        if (midWin) { midHeat += x.heat ?? 0; midHeatN++; if (i % 20 === 0) res.heatMidday.push(x.heat ?? 0); }
      }
      if (env.daylight >= 0.97 && !nest) {
        const cell = res.byTemp[tempBin(env.temperature)][env.cloud < 0.3 ? 0 : 1];
        cell[1]++; if (k === 'rest') cell[0]++;
      }
    }
    if (midTicks > 0 && !midWin) {
      const T = midT / midTicks, type = midRain / midTicks >= 0.2 ? 'rainy' : T >= 23 ? 'hot' : T >= 21 ? 'mild' : 'cool';
      const m = res.midday[type], mo = res.morning[type];
      for (let q = 0; q < 5; q++) { m.n[q] += mid[q]; mo.n[q] += morn[q]; }
      m.days++; m.temp += T; m.heat += midHeatN ? midHeat / midHeatN : 0;
      mid = [0, 0, 0, 0, 0]; morn = [0, 0, 0, 0, 0]; midT = 0; midRain = 0; midTicks = 0; midHeat = 0; midHeatN = 0;
    }
    prevRise = rising; prevAlt = alt;
  }
  res.births = w.stats.births - births0; res.deaths = w.stats.deaths - deaths0;
  res.living = w.chimps.filter(c => c.alive).length; res.adults = w.chimps.filter(c => c.alive && c.age >= 15).length;
  res.hungerAdult = hungerAN ? hungerA / hungerAN : 0; res.hungerLact = hungerLN ? hungerL / hungerLN : 0;
  return res;
}

const q = (v: number[], p: number) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const f0 = (v: number) => (Number.isNaN(v) ? '—' : v.toFixed(0)), f2 = (v: number) => (Number.isNaN(v) ? '—' : v.toFixed(2)), pc = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '—');
const hm = (h: number) => (Number.isNaN(h) ? '—' : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')} min`);
const sumRows = (rows: number[][][]) => rows[0].map((r, i) => r.map((_, j) => rows.reduce((a, b) => a + b[i][j], 0)));

export function report(rs: RhythmResult[], job: Omit<RhythmJob, 'seed'>): string {
  const L: string[] = [];
  const rec = rs.flatMap(r => r.dayRec);
  L.push(`# Daily rhythm (simulation truth, field profile)`, '', `Seeds ${rs.map(r => r.seed).join(', ')}; burn-in ${job.burnIn} d, ${job.days} d measured; params ${JSON.stringify(job.params)}.`, '');
  L.push('## Nest and wake times, active day', '', '| Class | Adult-days | Leaves nest, min after sunrise (median, p10–p90) | Last nest entry, min after sunset (median, p10–p90) | Starts the last nest, min before sunset (median) | Active day (mean; median) | Field (batesByrne2009, Budongo) | Nests entered per evening | Sleep pressure (or 1 − energy) leaving / entering |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const cls of [...CLASSES, 'all'] as const) {
    const v = cls === 'all' ? rec : rec.filter(r => r.cls === cls);
    const field = cls === 'male' ? '11 h 34 min' : cls === 'lactating' ? '10 h 57 min' : '—';
    L.push(`| ${cls} | ${v.length} | ${f0(q(v.map(r => r.wake), 0.5))} (${f0(q(v.map(r => r.wake), 0.1))} to ${f0(q(v.map(r => r.wake), 0.9))}) | ${f0(q(v.map(r => r.bed), 0.5))} (${f0(q(v.map(r => r.bed), 0.1))} to ${f0(q(v.map(r => r.bed), 0.9))}) | ${f0(q(v.map(r => r.build), 0.5))} | ${hm(mean(v.map(r => r.active)))}; ${hm(q(v.map(r => r.active), 0.5))} | ${field} | ${f2(mean(v.map(r => r.entries)))} | ${f2(mean(v.map(r => r.sWake)))} / ${f2(mean(v.map(r => r.sBed)))} |`);
  }
  const nights = rs.reduce((a, r) => a + r.adultNights, 0);
  const fem = rec.filter(r => r.cls !== 'male');
  L.push('', `Staged targets (compared, never set): T-RHY-1 active day 10.5–12.0 h: ${hm(mean(rec.map(r => r.active)))}. T-RHY-3 share of adult-female departures before sunrise 0.05–0.35: ${f2(fem.filter(r => r.wake < 0).length / Math.max(1, fem.length))}. T-RHY-4 start of the last nest −30 to +90 min before sunset: ${f0(q(rec.map(r => r.build), 0.5))}.`);
  // stage E2b: departures and breakfasts (janmaat2014: departure relative to sunrise by breakfast fruit and distance)
  const deps = rs.flatMap(r => r.deps), DB = [[0, 150], [150, 500], [500, Infinity]] as const;
  const pre = (v: { wake: number }[]) => f2(v.filter(r => r.wake < 0).length / Math.max(1, v.length));
  L.push('', '## Nest departure and breakfast (stage E2b; adults, every morning with a departure)', '',
    `Share of departures before sunrise (field: 18% of adult-female departures at Taï, janmaat2014; T-RHY-3 band 0.05–0.35): all adults ${pre(deps)} (n ${deps.length}); males ${pre(deps.filter(r => r.cls === 'male'))}; lactating ${pre(deps.filter(r => r.cls === 'lactating'))}; other females ${pre(deps.filter(r => r.cls === 'female'))}; all adult females ${pre(deps.filter(r => r.cls !== 'male'))}.`,
    `Median departure, min after sunrise: all ${f0(q(deps.map(r => r.wake), 0.5))}; males ${f0(q(deps.filter(r => r.cls === 'male').map(r => r.wake), 0.5))}; lactating ${f0(q(deps.filter(r => r.cls === 'lactating').map(r => r.wake), 0.5))}; other females ${f0(q(deps.filter(r => r.cls === 'female').map(r => r.wake), 0.5))} (Budongo, batesByrne2009, derived: about at sunrise for every class).`, '',
    '| Breakfast | Distance from the nest | Departures | Departure, min after sunrise (median, p10–p90) | Before sunrise | Others feeding there at the start (mean) |', '| --- | --- | --- | --- | --- | --- |');
  for (const [bf, name] of [[1, 'fig crown'], [2, 'other crown']] as const) for (const [lo, hi] of DB) {
    const v = deps.filter(r => r.bf === bf && r.d >= lo && r.d < hi);
    L.push(`| ${name} | ${hi === Infinity ? `≥ ${lo} m` : `${lo}–${hi} m`} | ${v.length} | ${f0(q(v.map(r => r.wake), 0.5))} (${f0(q(v.map(r => r.wake), 0.1))} to ${f0(q(v.map(r => r.wake), 0.9))}) | ${pre(v)} | ${f2(mean(v.map(r => r.feeders)))} |`);
  }
  for (const [bf, name] of [[3, 'fallback on the ground'], [0, 'none before noon']] as const) { const v = deps.filter(r => r.bf === bf); L.push(`| ${name} | — | ${v.length} | ${f0(q(v.map(r => r.wake), 0.5))} (${f0(q(v.map(r => r.wake), 0.1))} to ${f0(q(v.map(r => r.wake), 0.9))}) | ${pre(v)} | — |`); }
  L.push('', 'Field directions (janmaat2014, Taï, fruit breakfasts): figs earlier than other fruit; far figs earlier than near figs; far non-fig sites later than near ones.');
  // stage E2c: the light of departure, and how much of a crown is gone by evening
  const lux = deps.map(r => r.lux).filter(v => Number.isFinite(v)), lb = (lo: number, hi: number) => pc(lux.filter(v => v >= lo && v < hi).length, lux.length);
  L.push('', `Open-sky illuminance at departure (stage E2c; lux, horizontal, sky model): median ${f0(q(lux, 0.5))} (p10 ${f2(q(lux, 0.1))}, p90 ${f0(q(lux, 0.9))}); below 1 lux ${lb(0, 1)}, 1–85 lux ${lb(1, 85)}, 85 lux and above ${lb(85, Infinity)} (field, secondary: feeding activity of great apes at 1–85 lux, Erkert as cited by tagg2018).`);
  const cd = (k: 'fig' | 'other') => rs.flatMap(r => r.cropDay?.[k] ?? []);
  L.push(`Crop at sunset as a share of the crop at sunrise, fruiting crowns (stage E2c): figs median ${f2(q(cd('fig'), 0.5))} (p10 ${f2(q(cd('fig'), 0.1))}; n ${cd('fig').length}), other fruit ${f2(q(cd('other'), 0.5))} (p10 ${f2(q(cd('other'), 0.1))}; n ${cd('other').length}).`);
  L.push('', `Adults out of a nest at solar midnight: ${pc(rs.reduce((a, r) => a + r.outAtMidnight, 0), nights)} of ${nights} adult-nights. Sleep pressure at solar noon: mean ${f2(mean(rs.flatMap(r => r.sleepAtNoon)))}.`, '');
  L.push('## Hourly activity of adults (share of the hour)', '', `| Hour | ${KINDS.join(' | ')} |`, `| --- | ${KINDS.map(() => '---').join(' | ')} |`);
  for (let h = 0; h < 24; h++) {
    const row = KINDS.map((_, k) => rs.reduce((a, r) => a + r.hourly[h][k], 0)), tot = row.reduce((a, b) => a + b, 0);
    L.push(`| ${String(h).padStart(2, '0')} | ${row.map(n => pc(n, tot)).join(' | ')} |`);
  }
  const day = KINDS.map((_, k) => rs.reduce((a, r) => a + r.hourly.slice(7, 19).reduce((s, hrow) => s + hrow[k], 0), 0)), dayTot = day.reduce((a, b) => a + b, 0);
  const part = (i: number) => KINDS.map((_, k) => rs.reduce((a, r) => a + r.parts[i][k], 0)), share = (i: number, k: Kind) => { const p = part(i); return pc(p[KINDS.indexOf(k)], p.reduce((a, b) => a + b, 0)); };
  L.push('', `T-RHY-9 (pattern: feeding higher in the first and last three hours of the day than in the middle; rest highest in the middle). Adults out of a nest, first 3 h after sunrise / middle / last 3 h before sunset: feeding ${share(0, 'feed')} / ${share(1, 'feed')} / ${share(2, 'feed')}; rest ${share(0, 'rest')} / ${share(1, 'rest')} / ${share(2, 'rest')}; travel ${share(0, 'travel')} / ${share(1, 'travel')} / ${share(2, 'travel')}.`);
  L.push('', `07:00–19:00 totals: ${KINDS.map((k, i) => `${k} ${pc(day[i], dayTot)}`).join(', ')}.`, '');
  L.push('## Midday rest by kind of day (adults, 11:30–14:30; morning 08:00–11:00 for contrast)', '', '| Day type | Days | Mean midday °C | Mean thermal load | Rest at midday | Rest + groom at midday | Feeding | Travel | Rest in the morning | Midday − morning rest |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const t of DAYTYPES) {
    const n = [0, 0, 0, 0, 0], mo = [0, 0, 0, 0, 0]; let days = 0, temp = 0, heat = 0;
    for (const r of rs) { const m = r.midday[t]; for (let i = 0; i < 5; i++) { n[i] += m.n[i]; mo[i] += r.morning[t].n[i]; } days += m.days; temp += m.temp; heat += m.heat; }
    const d = n[4] && mo[4] ? ((n[0] / n[4] - mo[0] / mo[4]) * 100).toFixed(1) + ' pt' : '—';
    L.push(`| ${t} | ${days} | ${days ? (temp / days).toFixed(1) : '—'} | ${days ? (heat / days).toFixed(3) : '—'} | ${pc(n[0], n[4])} | ${pc(n[1], n[4])} | ${pc(n[2], n[4])} | ${pc(n[3], n[4])} | ${pc(mo[0], mo[4])} | ${d} |`);
  }
  L.push('', 'Day types: rainy = rain in at least 20% of the midday window; otherwise hot ≥ 23 °C, mild 21–23 °C, cool < 21 °C (mean air temperature of the window).', '');
  const bt = TEMPBINS.map((_, i) => [0, 1].map(s => [0, 1].map(j => rs.reduce((a, r) => a + r.byTemp[i][s][j], 0))));
  L.push('Rest share of adults in full daylight by air temperature (clear sky, cloud < 0.3 / cloudier): ' + TEMPBINS.map((b, i) => `${b} °C ${pc(bt[i][0][0], bt[i][0][1])} / ${pc(bt[i][1][0], bt[i][1][1])}`).join('; ') + '.');
  const hmid = rs.flatMap(r => r.heatMidday);
  L.push(`Thermal load of adults at midday: mean ${f2(mean(hmid))}, p90 ${f2(q(hmid, 0.9))}, share above 0.1 ${pc(hmid.filter(v => v > 0.1).length, hmid.length)}, share below −0.1 ${pc(hmid.filter(v => v < -0.1).length, hmid.length)}.`, '');
  const nt = Object.fromEntries(KINDS.map(k => [k, rs.reduce((a, r) => a + r.night.ticks[k], 0)])) as Record<Kind, number>, ntot = KINDS.reduce((a, k) => a + nt[k], 0);
  const at = Object.fromEntries(KINDS.map(k => [k, rs.reduce((a, r) => a + r.night.adultTicks[k], 0)])) as Record<Kind, number>, atot = KINDS.reduce((a, k) => a + at[k], 0);
  const nn = rs.reduce((a, r) => a + r.night.nights, 0);
  L.push('## Night (daylight ≤ 0.03; independent animals aged 5+)', '', `Share of night time by act: ${KINDS.map(k => `${k} ${pc(nt[k], ntot)}`).join(', ')} (adults: ${KINDS.map(k => `${k} ${pc(at[k], atot)}`).join(', ')}).`,
    `T-RHY-5 share of out-of-nest activity records (feeding, travel, grooming, other) that fall at night, 0–0.05: ${(() => { const act = (o: Record<Kind, number>) => o.feed + o.travel + o.groom + o.other; const dayAct = rs.reduce((a, r) => a + r.hourly.reduce((s, h) => s + h[2] + h[3] + h[4] + h[5], 0), 0); return f2(act(at) / Math.max(1, dayAct)); })()} (adults).`,
    `Out of a nest: ${pc(ntot - nt.nest, ntot)} of night time; ${f0(rs.reduce((a, r) => a + r.night.metres, 0) / Math.max(1, nn))} m moved per animal-night; ${(60 * (nt.feed + nt.travel) / 240 / Math.max(1, nn)).toFixed(1)} min feeding or travelling per animal-night.`, '');
  L.push('## Rain (daylight ≥ 0.1, out of a nest)', '', '| Rain intensity | Adults: shelter | rest | feed | travel | Juveniles 5–10 y: shelter | rest | feed | travel |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const ra = sumRows(rs.map(r => r.rain.adult)), rj = sumRows(rs.map(r => r.rain.juvenile));
  RAINBINS.forEach((b, i) => L.push(`| ${b} | ${[0, 1, 2, 3].map(j => pc(ra[i][j], ra[i][4])).join(' | ')} | ${[0, 1, 2, 3].map(j => pc(rj[i][j], rj[i][4])).join(' | ')} |`));
  const causes: Record<string, number> = {};
  for (const r of rs) for (const [k, n] of Object.entries(r.causes)) causes[k] = (causes[k] ?? 0) + n;
  L.push('', '## Viability', '', `Births ${rs.reduce((a, r) => a + r.births, 0)}, deaths ${rs.reduce((a, r) => a + r.deaths, 0)} (${Object.entries(causes).map(([k, n]) => `${k} ${n}`).join('; ') || 'none'}); deaths at night ${rs.reduce((a, r) => a + r.nightDeaths, 0)}; living at the end ${rs.map(r => r.living).join(', ')}.`,
    `Mean hunger of adults ${f2(mean(rs.map(r => r.hungerAdult)))}, of lactating females ${f2(mean(rs.map(r => r.hungerLact)))}.`);
  return L.join('\n');
}

async function main() {
  const seeds = flag('seeds', '48,7').split(',').map(Number), burnIn = +flag('burn-in', '30'), days = +flag('days', '30'), workers = +flag('workers', '2');
  const params = JSON.parse(flag('params', '{}'));
  if (burnIn + days > 90) throw new RangeError('burn-in + days must not exceed 90');
  const jobs = seeds.map(seed => ({ seed, burnIn, days, params }));
  const res = await runPool<RhythmJob, RhythmResult>(new URL(import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed} in ${(ms / 1000).toFixed(0)} s`) });
  const text = report(res, { burnIn, days, params });
  console.log(text);
  if (flag('md', '')) writeFileSync(flag('md', ''), text + '\n');
  if (flag('json', '')) writeFileSync(flag('json', ''), JSON.stringify({ seeds, burnIn, days, params, results: res.map(r => ({ ...r, heatMidday: undefined, sleepAtNoon: undefined, cropDay: undefined })) }, null, 1));
}

if (!isMainThread) {
  parentPort!.on('message', (m: { index: number; job: RhythmJob }) => {
    try { parentPort!.postMessage({ index: m.index, result: runRhythm(m.job) }); }
    catch (e) { parentPort!.postMessage({ index: m.index, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) }); }
  });
} else if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
