// Stage R16 (docs/staging/r16-prereg.md §12.4): the readouts the diagnosis of stage R13 showed were missing, read after
// every tick of any arm (the control arms, the imitator and planted arms, a model run's replay) on the animals aged
// `minAge` or over at the start of the window. Like the timing card (scripts/lib/timing-card.ts) it reads the world and
// never writes it, and its whole state is plain data. A day is the card's: 06:30 to 06:30 of the window. The clock enters
// only these readout boundaries (13:00 for the morning, midnight for the halves of a night); no stratum and no training row
// is cut by them.
import { index, isTreeId, ix, TICK_HOURS } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';
import { familyOf } from '../em-sample';
import { inNest, NIGHT_IN_NEST } from './timing-card';

export const DAY_TICKS = Math.round(24 / TICK_HOURS), TICK_MIN = TICK_HOURS * 60;
/** Daylight at or above this is "full daylight" (the packet's word and the rules' day phase); at or below DARK is dark. */
export const FULL = 0.97, DARK = 0.03;
/** The morning ends at 13:00 (a readout boundary, a design assumption of memo 3: neither arm acts there). */
export const MORNING_END_H = 13;
/** The sampler's distance bands of a food trip (src/sim/resources.ts resourceTargetsFor): under 150, under 400, under 1,000 m, and beyond. */
export const BANDS = [150, 400, 1000] as const;
export const bandOf = (m: number): number => m < BANDS[0] ? 0 : m < BANDS[1] ? 1 : m < BANDS[2] ? 2 : 3;
/** The diagnosis's own late-morning window (docs/staging/r14-diag-energy.md: a nest after 07:45; the rules never after 08:00). */
export const LATE_FROM_H = 7.75, LATE_RULES_H = 8, EARLY_KCAL_TO_H = 9;

export interface ReadoutDay {
  id: number; day: number; ticks: number;
  /** Minutes in a finished nest at full daylight, before and after 13:00. */ dayNestAM: number; dayNestPM: number;
  /** Minutes in a nest from 07:45 and from 08:00 to 13:00 at any light (the diagnosis's definitions). */ nest0745: number; nest0800: number;
  /** Dark minutes before midnight and after, and of them out of a finished nest. */ eveDark: number; eveOut: number; mornDark: number; mornOut: number;
  /** Exits from a finished nest in the dark after midnight; exits while the light falls or in the dark before midnight. */ earlyRises: number; lateLeaves: number;
  /** New pant-hoots by this animal; grooming minutes; formula kcal eaten from 06:30 to 09:00; minutes on a food trip in the dark. */ pantHoots: number; groomMin: number; kcalEarly: number; darkTripMin: number;
  /** The morning that ends in this day: the clock hour of the last exit from a finished nest between midnight and 13:00; 'stayed' (in a nest at 13:00, no exit), 'no-nest' (no nest that morning). */
  rise: number | null; riseKind: 'rose' | 'stayed' | 'no-nest' | null;
  /** Food trips begun while the light falls or in the dark, by band; how they ended: arrived in light, arrived in the dark, abandoned. */
  tripsFall: number[]; tripsFallEnd: [number, number, number][];
  /** Drink trips begun then, by band, and those that reached the water. */ drinkFall: number[]; drinkFallArrived: number[];
  /** Feeding stretches that ended this day (a run of crown feeding and food trips) and the crowns fed in over them. */ stretches: number; stretchCrowns: number;
}
export interface ReadoutResult { minAge: number; animals: { id: number; name: string; age: number }[]; days: ReadoutDay[]; ticks: number }

interface Trip { tree: number; band: number; fall: boolean }
interface Drink { site: number; band: number; fall: boolean; reached: boolean }
interface Track {
  id: number; alive: boolean; wasNest: boolean; fam: string; tgt: number; trip: Trip | null; drink: Drink | null; atW: boolean;
  stretch: number[] | null; fin: number; exit: number | null; /** A midnight has passed in the window (so this morning is read whole). */ nestSinceMidnight: boolean; d: ReadoutDay;
}
export interface ReadoutState { tracks: Track[]; res: ReadoutResult; tick: number; maxCall: number; lastHour: number }

const blank = (id: number, day: number): ReadoutDay => ({ id, day, ticks: 0, dayNestAM: 0, dayNestPM: 0, nest0745: 0, nest0800: 0, eveDark: 0, eveOut: 0, mornDark: 0, mornOut: 0,
  earlyRises: 0, lateLeaves: 0, pantHoots: 0, groomMin: 0, kcalEarly: 0, darkTripMin: 0, rise: null, riseKind: null,
  tripsFall: [0, 0, 0, 0], tripsFallEnd: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], drinkFall: [0, 0, 0, 0], drinkFallArrived: [0, 0, 0, 0], stretches: 0, stretchCrowns: 0 });
const famNow = (c: Chimp) => familyOf(c.action, ix(c).v, ix(c).aux);
const feedingTree = (c: Chimp) => c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase >= 2;
const finOf = (c: Chimp) => { const L = ix(c).en; return L ? (L.fin ?? L.in) : 0; };
/** Light falling or dark, for a readout (afternoon light below full daylight, or dark). */
export const failing = (w: World) => (w.hour >= 12 && w.environment.daylight < FULL) || w.environment.daylight <= DARK;

export function readoutStart(w: World, minAge: number): ReadoutState {
  const animals = w.chimps.filter(c => c.alive && c.age >= minAge);
  const tracks = animals.map(c => ({ id: c.id, alive: true, wasNest: inNest(c), fam: famNow(c), tgt: c.targetId, trip: null, drink: null, atW: false,
    stretch: null, fin: finOf(c), exit: null, nestSinceMidnight: false, d: blank(c.id, 0) }));
  const maxCall = w.calls.reduce((m, k) => Math.max(m, k.id), 0);
  return { tracks, res: { minAge, animals: animals.map(c => ({ id: c.id, name: c.name, age: +c.age.toFixed(2) })), days: [], ticks: 0 }, tick: 0, maxCall, lastHour: w.hour };
}

/** One tick, read after the tick and its answers. Reads only. */
export function readoutStep(st: ReadoutState, w: World): void {
  const idx = index(w), light = w.environment.daylight, hour = w.hour, dark = light <= DARK, i = st.tick, endOfDay = (i + 1) % DAY_TICKS === 0, day = Math.floor(i / DAY_TICKS);
  const fall = failing(w), crossedMidnight = hour < st.lastHour, crossed13 = st.lastHour < MORNING_END_H && hour >= MORNING_END_H;
  // new pant-hoots, each call id once
  const hoots = new Map<number, number>();
  let maxCall = st.maxCall;
  for (const k of w.calls) if (k.id > st.maxCall) { maxCall = Math.max(maxCall, k.id); if (k.kind === 'pant-hoot') hoots.set(k.callerId, (hoots.get(k.callerId) ?? 0) + 1); }
  st.maxCall = maxCall;
  for (const t of st.tracks) {
    const c = idx.byId.get(t.id), d = t.d;
    if (c && c.alive) {
      const nest = inNest(c), fam = famNow(c);
      d.ticks++;
      if (nest && light >= FULL) { if (hour < MORNING_END_H && hour >= 6) d.dayNestAM += TICK_MIN; else d.dayNestPM += TICK_MIN; }
      if (nest && hour >= LATE_FROM_H && hour < MORNING_END_H) { d.nest0745 += TICK_MIN; if (hour >= LATE_RULES_H) d.nest0800 += TICK_MIN; }
      if (dark) { if (hour >= 12) { d.eveDark += TICK_MIN; if (!nest) d.eveOut += TICK_MIN; } else { d.mornDark += TICK_MIN; if (!nest) d.mornOut += TICK_MIN; } }
      if (t.wasNest && !nest) {
        if (dark && hour < 12) d.earlyRises++;
        if (hour >= 12 && light < FULL) d.lateLeaves++;
        if (hour < MORNING_END_H) t.exit = hour;
      }
      // the morning runs from midnight to 13:00; the window's first morning began before the window and is not read
      if (crossedMidnight) { t.exit = null; t.nestSinceMidnight = true; }
      if (crossed13 && t.nestSinceMidnight) { d.rise = t.exit; d.riseKind = t.exit !== null ? 'rose' : nest ? 'stayed' : 'no-nest'; }
      d.pantHoots += hoots.get(c.id) ?? 0;
      if (c.action === 'groom' && ix(c).phase >= 1) d.groomMin += TICK_MIN;
      const fin = finOf(c);
      if (hour >= 6.5 && hour < EARLY_KCAL_TO_H) d.kcalEarly += fin - t.fin;
      t.fin = fin;
      if (fam === 'food-trip' && dark) d.darkTripMin += TICK_MIN;
      // food trips (the card's rule: begun when the trip starts or changes its tree; arrived when the next act is feeding there)
      if (t.trip && (fam !== 'food-trip' || c.targetId !== t.trip.tree)) {
        const arrived = fam !== 'food-trip' && c.action === 'forage' && c.targetId === t.trip.tree;
        if (t.trip.fall) d.tripsFallEnd[t.trip.band][arrived ? (dark ? 1 : 0) : 2]++;
        t.trip = null;
      }
      if (fam === 'food-trip' && (t.fam !== 'food-trip' || c.targetId !== t.tgt) && !t.trip) {
        const tree = idx.treeById.get(c.targetId), m = tree ? Math.hypot(tree.position[0] - c.position[0], tree.position[2] - c.position[2]) : 0;
        t.trip = { tree: c.targetId, band: bandOf(m), fall };
        if (fall) d.tripsFall[t.trip.band]++;
      }
      // drink trips: begun when a drink act starts toward a site; reached when the animal stands at the water
      const site = c.action === 'drink' ? idx.waterById.get(c.targetId) : undefined;
      const atW = !!site && (site.position[0] - c.position[0]) ** 2 + (site.position[2] - c.position[2]) ** 2 <= 1.44;
      if (t.drink && (c.action !== 'drink' || c.targetId !== t.drink.site)) { if (t.drink.fall && t.drink.reached) d.drinkFallArrived[t.drink.band]++; t.drink = null; }
      if (site && !t.drink) { const m = Math.hypot(site.position[0] - c.position[0], site.position[2] - c.position[2]); t.drink = { site: c.targetId, band: bandOf(m), fall, reached: atW }; if (fall) d.drinkFall[t.drink.band]++; }
      if (t.drink && atW) t.drink.reached = true;
      t.atW = atW;
      // feeding stretches: a run of crown feeding and food trips; the crowns fed in over it
      const inStretch = feedingTree(c) || fam === 'food-trip';
      if (inStretch) { t.stretch ??= []; if (feedingTree(c) && !t.stretch.includes(c.targetId)) t.stretch.push(c.targetId); }
      else if (t.stretch) { if (t.stretch.length) { d.stretches++; d.stretchCrowns += t.stretch.length; } t.stretch = null; }
      t.wasNest = nest; t.fam = fam; t.tgt = c.targetId;
    } else if (t.alive) { t.alive = false; t.trip = null; t.drink = null; t.stretch = null; }
    if (endOfDay) { if (d.ticks > 0) st.res.days.push(d); t.d = blank(t.id, day + 1); }
  }
  st.lastHour = hour; st.tick++; st.res.ticks = st.tick;
}
export const readoutFinish = (st: ReadoutState): ReadoutResult => st.res;

/** A night (one readout day) is short below 0.9 of its dark minutes in a nest (the card's NIGHT_IN_NEST). */
export function nightOf(d: ReadoutDay): { dark: number; short: boolean; cls: 'evening' | 'morning' | 'both' | null; alone: 'evening' | 'morning' | 'each' | 'together' | null } | null {
  const dark = d.eveDark + d.mornDark;
  if (!(dark > 0)) return null;
  const out = d.eveOut + d.mornOut, short = out > (1 - NIGHT_IN_NEST) * dark + 1e-9;
  if (!short) return { dark, short, cls: null, alone: null };
  const eve = d.eveDark > 0 && d.eveOut > (1 - NIGHT_IN_NEST) * d.eveDark + 1e-9, morn = d.mornDark > 0 && d.mornOut > (1 - NIGHT_IN_NEST) * d.mornDark + 1e-9;
  // the registered classes (part shares, docs/staging/r16-prereg.md §12.4); and the diagnosis's (r14-diag-nights.md §0: which part alone would make the night short)
  const eveAlone = d.eveOut > (1 - NIGHT_IN_NEST) * dark + 1e-9, mornAlone = d.mornOut > (1 - NIGHT_IN_NEST) * dark + 1e-9;
  return { dark, short, cls: eve && morn ? 'both' : eve ? 'evening' : morn ? 'morning' : 'both', alone: eveAlone && mornAlone ? 'each' : eveAlone ? 'evening' : mornAlone ? 'morning' : 'together' };
}

const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const q90 = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(0.9 * s.length))]; };
/** The readouts this stage registers (§12.4), with their side: 'up' means upward is harm, 'both' both sides are read, '' no side named. */
export const READOUTS: Record<string, { label: string; side: 'up' | 'both' | ''; floor: number; group: 'morning' | 'night' | 'level' | 'target' }> = {
  dayNestAM: { label: 'daylight minutes in a nest before 13:00, per animal-day', side: 'up', floor: 1, group: 'morning' },
  riseHourMean: { label: 'hour of rising, mean', side: 'up', floor: 0.05, group: 'morning' },
  riseHourP90: { label: 'hour of rising, 90th percentile', side: 'up', floor: 0.05, group: 'morning' },
  eveDarkOut: { label: 'evening dark minutes out of a nest, per animal-day', side: 'up', floor: 1, group: 'night' },
  mornDarkOut: { label: 'morning dark minutes out of a nest, per animal-day', side: 'both', floor: 1, group: 'night' },
  earlyRises: { label: 'early rises (exits from a nest in the dark after midnight), per animal-day', side: 'both', floor: 0.05, group: 'night' },
  lateLeaves: { label: 'late leaves (exits while the light falls or in the dark before midnight), per animal-day', side: 'up', floor: 0.05, group: 'night' },
  shortNightDays: { label: 'days with a short night (any animal)', side: 'up', floor: 1, group: 'night' },
  pantHoots: { label: 'pant-hoots given, per animal-day', side: '', floor: 0.05, group: 'level' },
  groomMin: { label: 'grooming minutes, per animal-day', side: '', floor: 1, group: 'level' },
  kcalEarly: { label: 'energy eaten from 06:30 to 09:00, kcal per animal-day', side: '', floor: 1, group: 'level' },
  darkTripMin: { label: 'minutes on a food trip in the dark, per animal-day', side: '', floor: 1, group: 'target' },
  tripsFall: { label: 'food trips begun while the light falls or in the dark, per animal-day', side: '', floor: 0.05, group: 'target' },
  tripsFallFar: { label: 'of them to a tree 400 m or more away, per animal-day', side: '', floor: 0.05, group: 'target' },
  tripsFallArrivedDark: { label: 'of them arriving in the dark, per animal-day', side: '', floor: 0.05, group: 'target' },
  drinkFall: { label: 'drink trips begun while the light falls or in the dark, per animal-day', side: '', floor: 0.05, group: 'target' },
  crownsPerStretch: { label: 'crowns per feeding stretch', side: '', floor: 0.05, group: 'target' },
};

/** One value per readout for one arm (per animal: its rate over its living days; the mean over animals), plus the counts the diagnosis printed. */
export function readoutSummary(r: ReadoutResult, keep: (id: number) => boolean = () => true): Record<string, number | null> {
  const per: Record<string, number[]> = {}, push = (k: string, v: number | null) => { if (v !== null && Number.isFinite(v)) (per[k] ??= []).push(v); };
  const rises: number[] = [], shortDays = new Set<number>();
  let nights = 0, short = 0, cls = { evening: 0, morning: 0, both: 0 }, alone = { evening: 0, morning: 0, each: 0, together: 0 }, earlyNights = 0, animalDays = 0, late0745 = 0, late0800 = 0, noNest = 0, mornings = 0, stretches = 0, crowns = 0;
  for (const a of r.animals) {
    if (!keep(a.id)) continue;
    const rows = r.days.filter(d => d.id === a.id), days = rows.reduce((s, d) => s + d.ticks, 0) / DAY_TICKS;
    if (!(days > 0)) continue;
    const sum = (f: (d: ReadoutDay) => number) => rows.reduce((s, d) => s + f(d), 0) / days;
    push('dayNestAM', sum(d => d.dayNestAM)); push('dayNestPM', sum(d => d.dayNestPM)); push('eveDarkOut', sum(d => d.eveOut)); push('mornDarkOut', sum(d => d.mornOut));
    push('earlyRises', sum(d => d.earlyRises)); push('lateLeaves', sum(d => d.lateLeaves)); push('pantHoots', sum(d => d.pantHoots)); push('groomMin', sum(d => d.groomMin));
    push('kcalEarly', sum(d => d.kcalEarly)); push('darkTripMin', sum(d => d.darkTripMin)); push('tripsFall', sum(d => d.tripsFall.reduce((x, y) => x + y, 0)));
    push('tripsFallFar', sum(d => d.tripsFall[2] + d.tripsFall[3])); push('tripsFallArrivedDark', sum(d => d.tripsFallEnd.reduce((x, e) => x + e[1], 0))); push('drinkFall', sum(d => d.drinkFall.reduce((x, y) => x + y, 0)));
    for (const d of rows) {
      animalDays++; if (d.nest0745 > 0) late0745++; if (d.nest0800 > 0) late0800++;
      if (d.riseKind) { mornings++; if (d.riseKind === 'rose' && d.rise !== null) rises.push(d.rise); if (d.riseKind === 'no-nest') noNest++; }
      stretches += d.stretches; crowns += d.stretchCrowns;
      const n = nightOf(d);
      if (!n) continue;
      nights++; if (d.earlyRises > 0) earlyNights++;
      if (n.short) { short++; shortDays.add(d.day); cls[n.cls!]++; alone[n.alone!]++; }
    }
  }
  const out: Record<string, number | null> = {};
  for (const k of ['dayNestAM', 'dayNestPM', 'eveDarkOut', 'mornDarkOut', 'earlyRises', 'lateLeaves', 'pantHoots', 'groomMin', 'kcalEarly', 'darkTripMin', 'tripsFall', 'tripsFallFar', 'tripsFallArrivedDark', 'drinkFall']) out[k] = per[k] ? mean(per[k]) : null;
  out.riseHourMean = mean(rises); out.riseHourP90 = q90(rises); out.noNestMornings = mornings ? noNest / mornings : null;
  out.shortNightDays = shortDays.size; out.shortNights = short; out.animalNights = nights;
  out.shortEvening = cls.evening; out.shortMorning = cls.morning; out.shortBoth = cls.both;
  out.shortByEveningAlone = alone.evening + alone.each; out.shortTogether = alone.together; out.shortByMorningAlone = alone.morning + alone.each;
  out.earlyRiseNights = earlyNights; out.animalDays = animalDays; out.nest0745Share = animalDays ? late0745 / animalDays : null; out.nest0800Share = animalDays ? late0800 / animalDays : null;
  out.crownsPerStretch = stretches ? crowns / stretches : null;
  return out;
}

/** A read-only tap for scripts/lib/r10-run.ts runDay and stage R16's runner: `start` on the window's first world. */
export function readoutTap(minAge: number) {
  let st: ReadoutState | null = null;
  return { name: 'r16', start(w: World) { st = readoutStart(w, minAge); }, tick(w: World) { if (st) readoutStep(st, w); },
    end(): { result: ReadoutResult; summary: Record<string, number | null> } | null { return st ? { result: readoutFinish(st), summary: readoutSummary(readoutFinish(st)) } : null; } };
}
