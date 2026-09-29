// Behavioral and demographic metrics of the simulation, compared with field values from docs/research.md
// and src/sim code comments. Rules only (no model). Ported from the v0.2 science audit instrumentation.
//
//   pnpm exec tsx scripts/sim-metrics.ts                       # 365 days x seeds 48,7,21; 40 life-years; 4 weather-years
//   pnpm exec tsx scripts/sim-metrics.ts --days 60 --seeds 48  # quicker natural-aging run
//   pnpm exec tsx scripts/sim-metrics.ts --life-years 0 --weather-years 0 --json out.json
//
// Natural aging (ageRate 1) measures behavior; life-course mode (ageRate 365: one ecological day = one
// biological year) measures demography. Both are deterministic for a given seed list.
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { dependentOn } from '../src/sim/candidates';
import { updateClock, updateSun, updateWeatherValues, weatherTransition } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { index, ix, SLOW_EVERY, TICK_HOURS } from '../src/sim/state';
import { CHANNEL, streamCell } from '../src/sim/stream';
import type { Chimp, Interaction, SimEvent, World } from '../src/types';

const args = process.argv.slice(2);
const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
const DAYS = +flag('days', '365');
const SEEDS = flag('seeds', '48,7,21').split(',').map(Number);
const LIFE_YEARS = +flag('life-years', '40');
const LIFE_SEEDS = flag('life-seeds', SEEDS.join(',')).split(',').map(Number);
const WEATHER_YEARS = +flag('weather-years', '4');
const JSON_OUT = flag('json', '');
const TPD = Math.round(24 / TICK_HOURS);

const mean = (a: number[]) => a.length ? a.reduce((p, q) => p + q, 0) / a.length : NaN;
const median = (a: number[]) => { if (!a.length) return NaN; const b = [...a].sort((p, q) => p - q); return b[Math.floor(b.length / 2)]; };
const f = (v: number, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
const pct = (v: number) => Number.isFinite(v) ? `${(v * 100).toFixed(0)}%` : '—';

function capture(w: World) {
  const events: SimEvent[] = [], inters: Interaction[] = [];
  const pe = w.events.push.bind(w.events), pi = w.interactions.push.bind(w.interactions);
  (w.events as any).push = (...e: SimEvent[]) => { events.push(...e); return pe(...e); };
  (w.interactions as any).push = (...i: Interaction[]) => { inters.push(...i); return pi(...i); };
  return { events, inters };
}

// ---------------------------------------------------------------------------
// Natural aging
// ---------------------------------------------------------------------------
interface Natural {
  seed: number; popStart: number; popEnd: number; births: number; deaths: number; stats: World['stats'];
  encountersSeen: number; encountersHeard: number; patrols: number; huntHunters: number[]; huntSuccessHunters: number[];
  conflicts: number; fights: number; consolations: number; groomBoutsMin: number[]; adultDayTicks: number;
  budget: Record<'male' | 'female', Record<string, number>>; pathM: number[]; largestFrac: number[]; wholeFrac: number[];
  nestFrac: number[]; wakeMin: number[]; settleMin: number[]; ground: number; channel: number;
  mates: number; swollenDayHours: number; cycles: number[]; alphaChanges: string[]; rangeShift: number; tenseShare: number;
}

function naturalRun(seed: number): Natural {
  const w = createWorld(seed);
  const { events, inters } = capture(w);
  const r: Natural = { seed, popStart: w.chimps.length, popEnd: 0, births: 0, deaths: 0, stats: w.stats, encountersSeen: 0, encountersHeard: 0, patrols: 0,
    huntHunters: [], huntSuccessHunters: [], conflicts: 0, fights: 0, consolations: 0, groomBoutsMin: [], adultDayTicks: 0,
    budget: { male: {}, female: {} }, pathM: [], largestFrac: [], wholeFrac: [], nestFrac: [], wakeMin: [], settleMin: [], ground: 0, channel: 0,
    mates: 0, swollenDayHours: 0, cycles: [], alphaChanges: [], rangeShift: 0, tenseShare: 0 };
  const home = w.troops.map(t => [t.center[0], t.center[2]]);
  const path = new Map<number, number>(), last = new Map<number, [number, number]>();
  const leftToday = new Map<number, number>(), settledToday = new Map<number, number>();
  const prevCD = new Map<number, number>(w.chimps.map(c => [c.id, c.cycleDay])), wraps = new Map<number, number>();
  const prevAlpha = new Map(w.troops.map(t => [t.id, t.alphaId]));
  let prevAlt = w.environment.sunAltitude, sunrise = 6.8, sunset = 18.8;
  for (let tick = 0; tick < DAYS * TPD; tick++) {
    tickWorld(w);
    const env = w.environment, hour = w.hour, alive = index(w).alive;
    if (prevAlt <= 0 && env.sunAltitude > 0) sunrise = hour;
    if (prevAlt > 0 && env.sunAltitude <= 0) sunset = hour;
    prevAlt = env.sunAltitude;
    for (const t of w.troops) if (prevAlpha.get(t.id) !== t.alphaId) { r.alphaChanges.push(`d${(w.time / 24).toFixed(0)} ${t.name}: ${t.alphaHistory.at(-1)?.how ?? 'vacant'}`); prevAlpha.set(t.id, t.alphaId); }
    for (const c of alive) {
      const x = ix(c);
      const l = last.get(c.id);
      if (l && !(c.age < 4 && dependentOn(w, c))) path.set(c.id, (path.get(c.id) ?? 0) + Math.hypot(c.position[0] - l[0], c.position[2] - l[1]));
      last.set(c.id, [c.position[0], c.position[2]]);
      if (c.sex === 'female') {
        const pc = prevCD.get(c.id) ?? -1;
        if (pc >= 0 && c.cycleDay >= 0 && c.cycleDay < pc) wraps.set(c.id, (wraps.get(c.id) ?? 0) + 1);
        if (pc < 0 && c.cycleDay >= 0) wraps.set(c.id, 0);
        if (pc >= 0 && c.cycleDay < 0 && c.pregnancy > 0) { r.cycles.push((wraps.get(c.id) ?? 0) + 1); wraps.set(c.id, 0); }
        prevCD.set(c.id, c.cycleDay);
        if (c.swelling >= 0.95 && env.daylight > 0.5) r.swollenDayHours += TICK_HOURS;
      }
      if (!x.weaned) continue;
      const day = w.day;
      if (c.action !== 'nest' && hour > 4 && hour < 12 && leftToday.get(c.id) !== day) { leftToday.set(c.id, day); if (day > 1) r.wakeMin.push((hour - sunrise) * 60); }
      if (c.action === 'nest' && x.phase === 2 && hour > 15 && settledToday.get(c.id) !== day) { settledToday.set(c.id, day); r.settleMin.push((hour - sunset) * 60); }
    }
    if (tick % 4 === 0) {
      for (const c of alive) {
        if (c.position[1] < 0.6) { r.ground++; if (streamCell(w, c.position[0], c.position[2]) === CHANNEL) r.channel++; }
        if (c.age < 15 || env.daylight <= 0.5) continue;
        const x = ix(c);
        const cat = c.action === 'forage' ? (c.targetId < 0 || x.phase >= 2 ? 'feed' : 'travel')
          : ['travel', 'follow', 'patrol', 'consort', 'transfer', 'hunt', 'drink'].includes(c.action) ? 'travel'
          : ['rest', 'shelter', 'nest'].includes(c.action) ? 'rest' : c.action === 'groom' ? 'groom'
          : ['charge', 'attack', 'display', 'flee', 'submit'].includes(c.action) ? 'agonistic' : 'social';
        r.budget[c.sex][cat] = (r.budget[c.sex][cat] ?? 0) + 1;
        r.adultDayTicks += 4;
      }
    }
    if (tick % 8 === 0 && env.daylight > 0.9) {
      for (const t of w.troops) {
        const members = alive.filter(c => c.troopId === t.id && !dependentOn(w, c)).length;
        if (!members) continue;
        const biggest = Math.max(0, ...w.parties.filter(p => p.troopId === t.id).map(p => p.members.filter(id => { const c = index(w).byId.get(id); return c && !dependentOn(w, c); }).length));
        r.largestFrac.push(biggest / members); r.wholeFrac.push(biggest === members ? 1 : 0);
      }
    }
    if (Math.abs(hour - 22) < TICK_HOURS / 2) {
      const weaned = alive.filter(c => ix(c).weaned);
      r.nestFrac.push(weaned.filter(c => c.action === 'nest' && ix(c).phase === 2 && c.position[1] > 4).length / weaned.length);
    }
  }
  r.popEnd = index(w).alive.length;
  r.births = w.stats.births; r.deaths = w.stats.deaths;
  r.encountersSeen = events.filter(e => e.kind === 'territory' && / met a /.test(e.text)).length;
  r.encountersHeard = events.filter(e => e.kind === 'territory' && / heard .* pant-hoots/.test(e.text)).length;
  r.patrols = inters.filter(i => i.kind === 'patrol').length;
  for (const e of events) { const m = /hunters \((\d+)\) (captured|chased)/.exec(e.text); if (m) { r.huntHunters.push(+m[1]); if (m[2] === 'captured') r.huntSuccessHunters.push(+m[1]); } }
  r.conflicts = w.stats.conflicts;
  r.fights = inters.filter(i => i.kind === 'fight').length;
  r.consolations = inters.filter(i => i.kind === 'console').length;
  r.mates = inters.filter(i => i.kind === 'mate').length;
  r.groomBoutsMin = inters.filter(i => i.kind === 'groom' && i.end !== null).map(i => (i.end! - i.start) * 60);
  for (const [id, d] of path) { const c = index(w).byId.get(id); if (c && c.age >= 15 && c.alive) r.pathM.push(d / DAYS); }
  r.rangeShift = Math.max(...w.troops.map((t, i) => Math.hypot(t.center[0] - home[i][0], t.center[2] - home[i][1])));
  const living = index(w).alive; let dyads = 0, tense = 0;
  for (const a of living) for (const b of living) if (a !== b && a.troopId === b.troopId) { dyads++; if ((ix(a).tension[b.id] ?? 0) >= 0.35) tense++; }
  r.tenseShare = tense / Math.max(1, dyads);
  return r;
}

// ---------------------------------------------------------------------------
// Life course
// ---------------------------------------------------------------------------
const BINS = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 80];
interface Life { seed: number; popEnd: number; births: number; exposure: Record<'male' | 'female', number[]>; deaths: Record<'male' | 'female', number[]>;
  q1: [number, number]; ibi: number[]; afb: number[]; cycles: number[]; alphaChanges: { how: string }[]; transfers: number[]; killings: number }

function lifeRun(seed: number): Life {
  const w = createWorld(seed);
  w.ageRate = 365;
  const startAge = new Map(w.chimps.map(c => [c.id, c.age]));
  const known = new Set(w.chimps.map(c => c.id));
  const births: { y: number; id: number; mother: number; motherAge: number }[] = [];
  const prevCD = new Map(w.chimps.map(c => [c.id, c.cycleDay])), wraps = new Map<number, number>();
  const prevTroop = new Map(w.chimps.map(c => [c.id, c.troopId])), prevAlpha = new Map(w.troops.map(t => [t.id, t.alphaId]));
  const r: Life = { seed, popEnd: 0, births: 0, exposure: { male: BINS.map(() => 0), female: BINS.map(() => 0) }, deaths: { male: BINS.map(() => 0), female: BINS.map(() => 0) },
    q1: [0, 0], ibi: [], afb: [], cycles: [], alphaChanges: [], transfers: [], killings: 0 };
  for (let tick = 0; tick < LIFE_YEARS * TPD; tick++) {
    tickWorld(w);
    for (const t of w.troops) if (prevAlpha.get(t.id) !== t.alphaId) { if (t.alphaId > 0) r.alphaChanges.push({ how: t.alphaHistory.at(-1)?.how ?? '' }); prevAlpha.set(t.id, t.alphaId); }
    for (const c of w.chimps) {
      if (!known.has(c.id)) { known.add(c.id); prevCD.set(c.id, c.cycleDay); prevTroop.set(c.id, c.troopId); const m = index(w).byId.get(c.motherId)!; births.push({ y: w.time / 24, id: c.id, mother: m.id, motherAge: m.age }); }
      if (!c.alive) continue;
      if (prevTroop.get(c.id) !== c.troopId) { r.transfers.push(c.age); prevTroop.set(c.id, c.troopId); }
      if (c.sex !== 'female') continue;
      const pc = prevCD.get(c.id) ?? -1;
      if (pc >= 0 && c.cycleDay >= 0 && c.cycleDay < pc) wraps.set(c.id, (wraps.get(c.id) ?? 0) + 1);
      if (pc < 0 && c.cycleDay >= 0) wraps.set(c.id, 0);
      if (pc >= 0 && c.cycleDay < 0 && c.pregnancy > 0) { r.cycles.push((wraps.get(c.id) ?? 0) + 1); wraps.set(c.id, 0); }
      prevCD.set(c.id, c.cycleDay);
    }
  }
  const byId = index(w).byId, endY = w.time / 24;
  for (const c of w.chimps) {
    const a0 = startAge.get(c.id) ?? 0;
    for (let i = 0; i < BINS.length - 1; i++) { const lo = Math.max(a0, BINS[i]), hi = Math.min(c.age, BINS[i + 1]); if (hi > lo) r.exposure[c.sex][i] += hi - lo; }
    if (!c.alive) { const i = BINS.findIndex((b, k) => c.age >= b && c.age < BINS[k + 1]); if (i >= 0) r.deaths[c.sex][i]++; }
  }
  for (const b of births) { if (endY - b.y < 1) continue; r.q1[1]++; const c = byId.get(b.id)!; if (!c.alive && c.age < 1) r.q1[0]++; }
  const byMother = new Map<number, typeof births>();
  for (const b of births) (byMother.get(b.mother) ?? byMother.set(b.mother, []).get(b.mother)!).push(b);
  for (const [mid, bs] of byMother) {
    for (let i = 1; i < bs.length; i++) { const prev = byId.get(bs[i - 1].id)!; if (prev.alive || (prev.deathTime ?? 0) / 24 >= bs[i].y) r.ibi.push(bs[i].y - bs[i - 1].y); }
    const nullip = !startAge.has(mid) || (startAge.get(mid)! < 13 && !w.chimps.some(k => k.motherId === mid && startAge.has(k.id)));
    if (nullip) r.afb.push(bs[0].motherAge);
  }
  r.popEnd = index(w).alive.length; r.births = births.length; r.killings = w.stats.killings;
  return r;
}

function e15(exposure: number[], deaths: number[]): number {
  let l = 1, e = 0;
  for (let i = 4; i < BINS.length - 1; i++) {
    const h = deaths[i] / Math.max(1e-9, exposure[i]), width = BINS[i + 1] - BINS[i], end = l * Math.exp(-h * width);
    e += h > 0 ? (l - end) / h : l * width;
    l = end;
  }
  return e;
}

// ---------------------------------------------------------------------------
// Weather only (fast)
// ---------------------------------------------------------------------------
function weatherRun(seed: number, years: number) {
  const w = createWorld(seed);
  let mm = 0, tmin = 0, tmax = 0, days = 0, dmin = 99, dmax = -99, afternoon = 0;
  for (let t = 1; t <= TPD * 365 * years; t++) {
    w.tick = t; w.time = t * TICK_HOURS; updateClock(w); updateSun(w);
    if (t % SLOW_EVERY === 0) weatherTransition(w);
    updateWeatherValues(w);
    const r = w.environment.rain * paramsOf(w).rainMmPerH * TICK_HOURS;
    mm += r; if (w.hour >= 13 && w.hour < 19) afternoon += r;
    dmin = Math.min(dmin, w.environment.temperature); dmax = Math.max(dmax, w.environment.temperature);
    if (t % TPD === 0) { if (t > TPD) { tmin += dmin; tmax += dmax; days++; } dmin = 99; dmax = -99; }
  }
  return { mmPerYear: mm / years, afternoonShare: afternoon / mm, tmin: tmin / days, tmax: tmax / days };
}

// ---------------------------------------------------------------------------
const t0 = performance.now();
const nat = SEEDS.map(s => { const r = naturalRun(s); console.error(`natural seed ${s}: ${DAYS} days done (${((performance.now() - t0) / 1000).toFixed(0)} s)`); return r; });
const life = LIFE_YEARS > 0 ? LIFE_SEEDS.map(s => { const r = lifeRun(s); console.error(`life seed ${s}: ${LIFE_YEARS} years done (${((performance.now() - t0) / 1000).toFixed(0)} s)`); return r; }) : [];
const weather = WEATHER_YEARS > 0 ? SEEDS.map(s => weatherRun(s, WEATHER_YEARS)) : [];

const years = DAYS / 365, commYears = 3 * years * nat.length;
const sum = (k: (r: Natural) => number) => nat.reduce((a, r) => a + k(r), 0);
const all = (k: (r: Natural) => number[]) => nat.flatMap(k);
const budget = (sex: 'male' | 'female', cat: string) => { const tot = sum(r => Object.values(r.budget[sex]).reduce((a, b) => a + b, 0)); return sum(r => r.budget[sex][cat] ?? 0) / tot; };
const conflicts = sum(r => r.conflicts);
const rows: [string, string, string, string][] = [];
const row = (m: string, sim: string, lit: string, ev: string) => rows.push([m, sim, lit, ev]);

row('Population after the run', nat.map(r => `${r.popStart}→${r.popEnd}`).join(', '), 'stable', 'design');
row('Intergroup encounters per community-year', f(2 * sum(r => r.stats.intergroupEncounters) / commYears), 'O(10); Kanyawara 120 in 15 y', '[M]');
row('  share heard only', pct(sum(r => r.encountersHeard) / Math.max(1, sum(r => r.encountersHeard + r.encountersSeen))), '85% acoustic (Kanyawara)', '[M]');
row('Killings per community-year', f(sum(r => r.stats.killings) / commYears, 2), 'O(0.1–1); Ngogo 18 in ~10 y', '[M]');
row('Max range-center shift (m)', f(Math.max(...nat.map(r => r.rangeShift))), 'ranges follow use (stage C6)', 'design');
row('Days between patrols (per community)', sum(r => r.patrols) ? f(commYears * 365 / sum(r => r.patrols)) : '—', 'Ngogo 9.7 d', '[H]');
row('Hunts per community-year', f(sum(r => r.stats.hunts) / commYears), 'scaled from Ngogo (docs/simulation.md §12)', '[M]');
row('  hunt success', pct(sum(r => r.stats.huntSuccesses) / Math.max(1, sum(r => r.stats.hunts))), '53–82% (field); rises with hunters', '[M-H]');
row('  fewest hunters in a capture', all(r => r.huntSuccessHunters).length ? String(Math.min(...all(r => r.huntSuccessHunters))) : '—', '≥2 (no solo colobus kills)', '[M-H]');
row('Decided conflicts per day (49 founders)', f(conflicts / (DAYS * nat.length), 1), 'mostly non-contact', '[H]');
row('  contact (fight) share of conflicts', pct(sum(r => r.fights) / conflicts), 'a minority', '[H]');
row('  reconciled', pct(sum(r => r.stats.reconciliations) / conflicts), '14–22% (wild, corrected)', '[M-H]');
row('  consoled', pct(sum(r => r.consolations) / conflicts), 'a minority', '[M]');
row('Tense dyads at run end (tension ≥ 0.35, directed)', pct(mean(nat.map(r => r.tenseShare))), 'a minority', 'design');
row('Grooming bout, median (min)', f(median(all(r => r.groomBoutsMin))), 'minutes-long bouts', '[L]');
row('Adult male day: feed / rest / groom / travel', ['feed', 'rest', 'groom', 'travel'].map(k => pct(budget('male', k))).join(' / '), 'feed 33–50%, groom 8–18%, travel 12–25%', '[M]');
row('Adult female day: feed / rest / groom / travel', ['feed', 'rest', 'groom', 'travel'].map(k => pct(budget('female', k))).join(' / '), 'feed 33–50%, groom 8–18%, travel 12–25%', '[M]');
row('Daily path, adults (m/day)', f(mean(all(r => r.pathM)), 0), '~0.4 range diameters (stylized here)', '[M]');
row('Largest party, share of community', pct(mean(all(r => r.largestFrac))), 'fission-fusion', '[H]');
row('  whole community together', pct(mean(all(r => r.wholeFrac))), 'rare', '[H]');
row('Weaned in a nest at 22:00', pct(mean(all(r => r.nestFrac))), 'nearly all', '[H]');
row('Leave nest vs sunrise, median (min)', f(median(all(r => r.wakeMin)), 0), 'around sunrise', '[H]');
row('Settle in nest vs sunset, median (min)', f(median(all(r => r.settleMin)), 0), 'around sunset', '[H]');
row('Ground time inside the stream channel', pct(sum(r => r.channel) / sum(r => r.ground)), '0', 'design');
row('Copulations per daylight hour per max-swollen female', f(sum(r => r.mates) / Math.max(1e-9, sum(r => r.swollenDayHours)), 2), 'Taï 0.14 – Ngogo 3.5', '[M]');
row('Cycles to conception (natural aging)', f(mean(all(r => r.cycles)), 1) + ` (n=${all(r => r.cycles).length})`, '~4 (design target)', '[M]');
row('Alpha changes', String(sum(r => r.alphaChanges.length)), 'tenures of years', '[M]');

if (life.length) {
  const pool = (sex: 'male' | 'female', k: 'exposure' | 'deaths') => BINS.map((_, i) => life.reduce((a, r) => a + r[k][sex][i], 0));
  const lifeAll = <T>(k: (r: Life) => T[]) => life.flatMap(k);
  const changes = lifeAll(r => r.alphaChanges);
  const alive = changes.filter(c => /rose above|defeated|contests/.test(c.how)).length;
  row(`Life course (${LIFE_YEARS} y × ${life.length}): population`, life.map(r => `49→${r.popEnd}`).join(', '), 'cap 120 living', 'design');
  row('  first-year mortality', f(life.reduce((a, r) => a + r.q1[0], 0) / Math.max(1, life.reduce((a, r) => a + r.q1[1], 0)), 2), '0.15 (Ngogo)', '[M]');
  row('  e15 female / male (y)', `${f(e15(pool('female', 'exposure'), pool('female', 'deaths')))} / ${f(e15(pool('male', 'exposure'), pool('male', 'deaths')))}`, '35.1 / 21.0 (Ngogo)', '[M]');
  row('  interbirth interval, median (y)', f(median(lifeAll(r => r.ibi)), 2), '5.15 (Gombe)', '[M]');
  row('  age at first birth, mean (y)', f(mean(lifeAll(r => r.afb))), '14–15.5 (Kibale); 14.9 (Gombe)', '[M]');
  row('  cycles to conception, mean', f(mean(lifeAll(r => r.cycles)), 1), '~4 (design target)', '[M]');
  row('  alpha tenure, mean (y)', f(LIFE_YEARS * 3 * life.length / Math.max(1, changes.length)), '~1.7–8 (Gombe)', '[M]');
  row('  alphas deposed alive', `${alive}/${changes.length}`, 'usually', '[M]');
  row('  female transfer age, mean (y)', f(mean(lifeAll(r => r.transfers))), '~11–13', '[M-H]');
}
if (weather.length) {
  row(`Rainfall (${WEATHER_YEARS} y × ${weather.length} seeds), mm/yr`, f(mean(weather.map(q => q.mmPerYear)), 0), '~1,500–1,700 (Kanyawara ~1,570)', '[M]');
  row('  share falling 13:00–19:00', pct(mean(weather.map(q => q.afternoonShare))), 'afternoon storms', '[M]');
  row('  mean daily min / max (°C)', `${f(mean(weather.map(q => q.tmin)))} / ${f(mean(weather.map(q => q.tmax)))}`, '~15 / ~24', '[M]');
}

console.log(`\nMGOGO simulation metrics — natural aging ${DAYS} days × seeds ${SEEDS.join(', ')}${life.length ? `; life course ${LIFE_YEARS} y × seeds ${LIFE_SEEDS.join(', ')}` : ''}${weather.length ? `; weather ${WEATHER_YEARS} y × seeds ${SEEDS.join(', ')}` : ''} (${((performance.now() - t0) / 1000).toFixed(0)} s)\n`);
console.log('| Metric | Simulated | Field value / target | Evidence |');
console.log('| --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.join(' | ')} |`);
const alphaNotes = nat.flatMap(r => r.alphaChanges.map(a => `seed ${r.seed} ${a}`));
if (alphaNotes.length) console.log(`\nAlpha changes (natural aging): ${alphaNotes.join('; ')}`);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ days: DAYS, seeds: SEEDS, lifeYears: LIFE_YEARS, rows, natural: nat.map(r => ({ ...r, stats: { ...r.stats } })), life, weather }, null, 1));
