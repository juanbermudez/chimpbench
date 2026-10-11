// Stage R7 (docs/staging/r7-prereg.md §3): the timing card. An instrument for when an animal stops what it is doing and
// starts something else, read from the world after every tick on any set of animals: act changes, switches of activity,
// bout lengths, trips to food begun and completed, time in a food patch, feeding trees per day, the share of half-hour
// pairs in the same activity, and the guards (reserve, distance, nights in a nest). No field target sees any of these
// (the review of 10 October 2026: an adapter that began 54 trips a day was invisible to all 150 rows).
//
// It reads the world and never writes it; its whole state is plain data. Every definition is taken from code that
// already measures the same thing, named at each use, or from a source's Methods (quoted in the pre-registration).
// Outside the protocol hash (scripts/lib); it edits nothing under src/field or src/compare.
import { activityCategory, CAT_AGONISTIC, CAT_FEED, CAT_TRAVEL, CATEGORIES } from '../../src/field/categories';
import { FEED, REST, TRAVEL, type Act, type TrackPoint } from '../../src/compare/tracks';
import { V } from '../../src/sim/candidates';
import { reserveCap } from '../../src/sim/energy';
import { paramsOf } from '../../src/sim/params';
import { index, isTreeId, ix, TICK_HOURS, TICK_SECONDS } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';
import { familyOf } from '../em-sample';

export const DAY_TICKS = Math.round(24 / TICK_HOURS), TICK_MIN = TICK_HOURS * 60;
/** A half hour, and the observer's tree-visit gap of 10 minutes (src/field/protocols.ts pointSample), in ticks. */
export const HALF_HOUR_TICKS = Math.round(0.5 / TICK_HOURS), VISIT_GAP_TICKS = Math.round(10 / 60 / TICK_HOURS);
/** potts2011 scored feeding and travel after one minute: a state counts as stable from this many ticks. */
export const STABLE_TICKS = Math.round(1 / 60 / TICK_HOURS);
/** The Taï file's clock hours (6.5 to 18.5; lemoine2023, S2 Data). */
export const TAI_FROM_H = 6.5, TAI_TO_H = 18.5;
/** A night counts as spent in a nest from this share of its dark ticks (scripts/r5-report.ts NIGHT_IN_NEST). */
export const NIGHT_IN_NEST = 0.9;
const N6 = CATEGORIES.length;

/** In a finished nest, or riding in the mother's (scripts/r5-pilot.ts, scripts/lib/truth-rows.ts inNest). */
export const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);
/** The project's Taï mapping of the six field activities to three (scripts/compare-movement.ts actOf; a design assumption of that comparison). */
export const act3Of = (cat6: number): Act => (cat6 === CAT_FEED ? FEED : cat6 === CAT_TRAVEL || cat6 === CAT_AGONISTIC ? TRAVEL : REST);
const atWater = (w: World, c: Chimp) => { if (c.action !== 'drink') return false; const s = index(w).waterById.get(c.targetId); return !!s && (s.position[0] - c.position[0]) ** 2 + (s.position[2] - c.position[2]) ** 2 <= 1.44; };

export interface CardAnimal { id: number; name: string; sex: 'male' | 'female'; age: number; troop: number; cls: string; lactating: boolean }
/** One animal on one day of the window (06:30 to 06:30). Counts are over the animal's living ticks of that day. */
export interface CardDay {
  id: number; day: number; alive: boolean; ticks: number; awakeTicks: number;
  /** C1: ticks at which (action, target) differs from the tick before. */ actChanges: number;
  /** C2: changes of the six-activity category between consecutive awake ticks; C2b: changes between states each held at least a minute. */ switches: number; stableSwitches: number;
  /** Awake ticks by six activities and by the three of the Taï mapping (rest, travel, feed). */ cat: number[]; act3: number[];
  /** Complete bouts that ended this day, and their ticks, by six activities. */ bouts: number[]; boutTicks: number[];
  /** C5 (scripts/r5-pilot.ts): trips to food begun and completed; drinks (arrivals at the water). */ trips: number; tripsDone: number; drinks: number;
  /** C8: distinct crowns fed in; complete patch visits that ended this day and their feeding ticks. */ trees: number; visits: number; visitTicks: number;
  /** C9: half-hour pairs by the first mark's activity (rest, travel, feed), and those in the same activity. */ pairs: number[]; same: number[];
  /** Guards: km by 5-min fixes and by every tick, the reserve's change in % of the reserve cap, dark ticks and those in a nest. */
  kmFix: number; km: number; reservePct: number | null; nightTicks: number; nestTicks: number;
  /**
   * The ledger's books for the day; null without the ledger. `kcalEaten`: formula energy eaten, the field's intake measure
   * (`fin`; what scripts/r5-report.ts calls "energy eaten"); `kcalIn`: usable energy in; `kcalOut`: energy spent; `dmIn`: dry
   * matter eaten in g (T-ENE-3's counter).
   */
  kcalEaten: number | null; kcalIn: number | null; kcalOut: number | null; dmIn: number | null;
  /** State at the day's end. */ lactating: boolean;
}
/** Lengths in ticks → count. */
export type Hist = Record<number, number>;
export interface CardResult {
  animals: CardAnimal[]; days: CardDay[]; ticks: number;
  /** Complete bouts by six activities and by three; patch visits (feeding ticks per visit); uninterrupted feeding runs in one crown. */
  bout6: Hist[]; bout3: Hist[]; visit: Hist; run: Hist;
}

interface Open { key: number; ticks: number; whole: boolean }
interface Track {
  a: CardAnimal; alive: boolean; action: string; target: number; awake: boolean;
  b6: Open | null; b3: Open | null; stable: number;
  fam: string; tgt: number; tripTo: number; atW: boolean;
  vis: Open | null; visLast: number; run: Open | null; runLast: number; trees: number[];
  markTick: number; markAct: number;
  px: number; pz: number; fx: number; fz: number;
  in0: number; out0: number; res0: number; dm0: number; fin0: number;
  d: CardDay;
}
export interface CardState { tracks: Track[]; res: CardResult; tick: number }

const famNow = (c: Chimp) => familyOf(c.action, ix(c).v, ix(c).aux);
const feedingTree = (c: Chimp) => c.action === 'forage' && isTreeId(c.targetId) && ix(c).phase >= 2;
const newDay = (id: number, day: number): CardDay => ({ id, day, alive: true, ticks: 0, awakeTicks: 0, actChanges: 0, switches: 0, stableSwitches: 0, cat: Array(N6).fill(0), act3: [0, 0, 0], bouts: Array(N6).fill(0), boutTicks: Array(N6).fill(0),
  trips: 0, tripsDone: 0, drinks: 0, trees: 0, visits: 0, visitTicks: 0, pairs: [0, 0, 0], same: [0, 0, 0], kmFix: 0, km: 0, reservePct: null, nightTicks: 0, nestTicks: 0, kcalEaten: null, kcalIn: null, kcalOut: null, dmIn: null, lactating: false });
const classOf = (c: Chimp) => c.age >= 15 ? (c.sex === 'male' ? 'adult male' : c.lactating ? 'female, lactating' : 'female, other') : c.age >= 12 ? 'adolescent 12-15 y' : c.age >= 8 ? 'juvenile 8-12 y' : 'under 8 y';
const bump = (h: Hist, k: number) => { h[k] = (h[k] ?? 0) + 1; };

/** Starts the card on the listed animals (living ones), at the state the world is in now. */
export function cardStart(w: World, ids: number[]): CardState {
  const idx = index(w), tracks: Track[] = [];
  for (const id of ids) {
    const c = idx.byId.get(id);
    if (!c || !c.alive) continue;
    const L = ix(c).en, awake = !inNest(c);
    tracks.push({ a: { id, name: c.name, sex: c.sex, age: +c.age.toFixed(2), troop: c.troopId, cls: classOf(c), lactating: c.lactating }, alive: true, action: c.action, target: c.targetId, awake,
      // a bout, a visit or a run already under way is cut by the window's start: opened here as not whole, so it is dropped when it ends
      b6: null, b3: null, stable: -1, fam: famNow(c), tgt: c.targetId, tripTo: -1, atW: atWater(w, c),
      vis: feedingTree(c) ? { key: c.targetId, ticks: 0, whole: false } : null, visLast: -1, run: feedingTree(c) ? { key: c.targetId, ticks: 0, whole: false } : null, runLast: -1, trees: [],
      markTick: -1, markAct: -1, px: c.position[0], pz: c.position[2], fx: c.position[0], fz: c.position[2],
      in0: L?.in ?? 0, out0: L?.out ?? 0, res0: L?.res ?? 0, dm0: L?.dmIn ?? 0, fin0: L?.fin ?? L?.in ?? 0, d: newDay(id, 0) });
  }
  return { tracks, res: { animals: tracks.map(t => t.a), days: [], ticks: 0, bout6: CATEGORIES.map(() => ({})), bout3: [{}, {}, {}], visit: {}, run: {} }, tick: 0 };
}

function closeBouts(st: CardState, t: Track): void {
  if (t.b6) { if (t.b6.whole) { bump(st.res.bout6[t.b6.key], t.b6.ticks); t.d.bouts[t.b6.key]++; t.d.boutTicks[t.b6.key] += t.b6.ticks; } t.b6 = null; }
  if (t.b3) { if (t.b3.whole) bump(st.res.bout3[t.b3.key], t.b3.ticks); t.b3 = null; }
}
function closeVisit(st: CardState, t: Track): void { if (t.vis) { if (t.vis.whole && t.vis.ticks > 0) { bump(st.res.visit, t.vis.ticks); t.d.visits++; t.d.visitTicks += t.vis.ticks; } t.vis = null; } }
function closeRun(st: CardState, t: Track): void { if (t.run) { if (t.run.whole && t.run.ticks > 0) bump(st.res.run, t.run.ticks); t.run = null; } }

/** One tick, read after tickWorld. Reads only. */
export function cardStep(st: CardState, w: World): void {
  const idx = index(w), P = paramsOf(w), env = w.environment, i = st.tick, first = i === 0;
  const groomed = new Set<number>();
  for (const m of idx.alive) if (m.action === 'groom' && ix(m).phase >= 1) groomed.add(m.targetId);
  // C9: a mark on a clock half hour inside the Taï file's hours (world ticks start at 06:30, so half hours fall on multiples of 120)
  const h2 = Math.round(w.hour * 2) / 2, mark = w.tick % HALF_HOUR_TICKS === 0 && h2 >= TAI_FROM_H && h2 <= TAI_TO_H;
  const night = env.daylight <= 0.03, endOfDay = (i + 1) % DAY_TICKS === 0, day = Math.floor(i / DAY_TICKS);
  for (const t of st.tracks) {
    const c = idx.byId.get(t.a.id), d = t.d;
    if (c && c.alive) {
      const x = ix(c), awake = !inNest(c), atW = atWater(w, c);
      d.ticks++;
      if (c.action !== t.action || c.targetId !== t.target) d.actChanges++;
      t.action = c.action; t.target = c.targetId;
      if (awake) {
        const cat = activityCategory(c.action, x.phase, c.targetId, groomed.has(c.id), c.carryingMeat > 0.02, atW), a3 = act3Of(cat);
        if (cat < N6) {
          d.awakeTicks++; d.cat[cat]++; d.act3[a3]++;
          // a bout under way when the window opens (the animal was awake at the start) is not whole
          const whole = !(first && t.awake);
          if (t.b6 && t.b6.key === cat) t.b6.ticks++;
          else { if (t.b6) { d.switches++; if (t.b6.whole) { bump(st.res.bout6[t.b6.key], t.b6.ticks); d.bouts[t.b6.key]++; d.boutTicks[t.b6.key] += t.b6.ticks; } } t.b6 = { key: cat, ticks: 1, whole }; }
          if (t.b6.ticks === STABLE_TICKS) { if (t.stable >= 0 && t.stable !== cat) d.stableSwitches++; t.stable = cat; }
          if (t.b3 && t.b3.key === a3) t.b3.ticks++;
          else { if (t.b3 && t.b3.whole) bump(st.res.bout3[t.b3.key], t.b3.ticks); t.b3 = { key: a3, ticks: 1, whole }; }
          if (mark) { if (t.markTick === w.tick - HALF_HOUR_TICKS && t.markAct >= 0) { d.pairs[t.markAct]++; if (a3 === t.markAct) d.same[t.markAct]++; } t.markTick = w.tick; t.markAct = a3; }
        }
      } else { closeBouts(st, t); t.stable = -1; } // the night in the nest ends the bout and is no bout itself
      t.awake = awake;
      // C5: trips to food begun and completed, drinks (the lines of scripts/r5-pilot.ts runArm, stage R4b)
      const fam = famNow(c);
      if (fam === 'food-trip' && (t.fam !== 'food-trip' || c.targetId !== t.tgt)) { d.trips++; t.tripTo = c.targetId; }
      else if (fam !== 'food-trip' && t.tripTo >= 0) { if (c.action === 'forage' && c.targetId === t.tripTo) d.tripsDone++; t.tripTo = -1; }
      t.fam = fam; t.tgt = c.targetId;
      if (atW && !t.atW) d.drinks++;
      t.atW = atW;
      // C6 to C8: feeding in a crown. A visit holds the feeding ticks in one crown with no gap over 10 min (the observer's rule)
      if (t.vis && t.visLast >= 0 && i - t.visLast > VISIT_GAP_TICKS) closeVisit(st, t);
      if (t.run && t.runLast >= 0 && t.runLast !== i - 1) closeRun(st, t);
      if (feedingTree(c)) {
        const tree = c.targetId;
        if (t.vis && t.vis.key !== tree) closeVisit(st, t);
        if (!t.vis) t.vis = { key: tree, ticks: 0, whole: true };
        t.vis.ticks++; t.visLast = i;
        if (t.run && t.run.key !== tree) closeRun(st, t);
        if (!t.run) t.run = { key: tree, ticks: 0, whole: true };
        t.run.ticks++; t.runLast = i;
        if (!t.trees.includes(tree)) t.trees.push(tree);
      } else if (first) { closeVisit(st, t); closeRun(st, t); } // a visit that ended before the first tick was never seen
      // guards: distance as scripts/r5-pilot.ts (per tick, capped at a run; 5-min fixes), dark ticks in a nest
      d.km += Math.min(Math.hypot(c.position[0] - t.px, c.position[2] - t.pz), P.runMps * TICK_SECONDS * 2) / 1000; t.px = c.position[0]; t.pz = c.position[2];
      if (w.tick % 20 === 0) { d.kmFix += Math.hypot(c.position[0] - t.fx, c.position[2] - t.fz) / 1000; t.fx = c.position[0]; t.fz = c.position[2]; }
      if (night) { d.nightTicks++; if (!awake) d.nestTicks++; }
    } else if (t.alive) { t.alive = false; t.b6 = null; t.b3 = null; t.vis = null; t.run = null; d.alive = false; } // a death cuts whatever was open
    if (endOfDay) {
      // the ledger is read on the living only (ix() would create state on a slimmed dead record): a day cut by a death has no ledger row
      if (c && c.alive) {
        const L = ix(c).en;
        if (L) { const cap = reserveCap(c, P); d.kcalIn = L.in - t.in0; d.kcalOut = L.out - t.out0; d.reservePct = 100 * (L.res - t.res0) / cap; d.dmIn = L.dmIn === undefined ? null : L.dmIn - t.dm0; d.kcalEaten = (L.fin ?? L.in) - t.fin0; t.in0 = L.in; t.out0 = L.out; t.res0 = L.res; t.dm0 = L.dmIn ?? 0; t.fin0 = L.fin ?? L.in; }
        d.lactating = c.lactating;
      }
      d.alive = t.alive; d.trees = t.trees.length; t.trees = [];
      if (d.ticks > 0) st.res.days.push(d);
      t.d = newDay(t.a.id, day + 1);
    }
  }
  st.tick++; st.res.ticks = st.tick;
}

/** The card at the end of the window. Bouts, visits and runs still open are cut by the window's end and dropped. */
export function cardFinish(st: CardState): CardResult { return st.res; }

// ---------------------------------------------------------------------------------------------------------------------
// Summaries (pure): one number per readout for a set of results (the seeds of one arm), optionally a subset of animals
// ---------------------------------------------------------------------------------------------------------------------

/** Quantile q of a histogram of tick lengths, in minutes (the smallest length whose cumulative count reaches q; null when empty). */
export function histQuantile(h: Hist, q: number): number | null {
  const keys = Object.keys(h).map(Number).sort((a, b) => a - b), n = keys.reduce((a, k) => a + h[k], 0);
  if (!n) return null;
  let cum = 0;
  for (const k of keys) { cum += h[k]; if (cum >= q * n) return k * TICK_MIN; }
  return keys[keys.length - 1] * TICK_MIN;
}
export function histMean(h: Hist): number | null { let n = 0, s = 0; for (const k of Object.keys(h)) { n += h[+k]; s += h[+k] * +k; } return n ? s / n * TICK_MIN : null; }
export const histN = (h: Hist) => Object.values(h).reduce((a, b) => a + b, 0);
export function mergeHist(list: Hist[]): Hist { const out: Hist = {}; for (const h of list) for (const k of Object.keys(h)) out[+k] = (out[+k] ?? 0) + h[+k]; return out; }

/** The registered timing rows (prereg §3: the pass mark counts over these 14) and the other readouts printed beside them. */
export const TIMING_ROWS = ['actChanges', 'switchesPerWakingHour', 'boutFeedMedian', 'boutRestMedian', 'boutTravelMedian', 'boutGroomMedian', 'tripsBegun', 'tripsDone', 'visitMean', 'runMedian', 'treesPerDay', 'sameHalfHour', 'sameFromRest', 'sameFromFeed'] as const;
export const GUARD_ROWS = ['reservePctPerDay', 'kmFixPerDay', 'nightsInNest', 'actChanges', 'tripsDone'] as const;
export const CARD_LABELS: Record<string, [string, number]> = {
  actChanges: ['C1 act changes per animal-day', 1], switchesPerWakingHour: ['C2 switches of activity per waking hour', 2], stableSwitchesPerWakingHour: ['C2b the same, states held a minute or more', 2],
  boutFeedMedian: ['C3 feeding bout, median min', 2], boutFeedQ1: ['C3 feeding bout, lower quartile min', 2], boutFeedQ3: ['C3 feeding bout, upper quartile min', 2], boutFeedMean: ['C3 feeding bout, mean min', 2],
  boutRestMedian: ['C3 rest bout, median min', 2], boutRestQ1: ['C3 rest bout, lower quartile min', 2], boutRestQ3: ['C3 rest bout, upper quartile min', 2], boutRestMean: ['C3 rest bout, mean min', 2],
  boutTravelMedian: ['C3 travel bout, median min', 2], boutTravelQ1: ['C3 travel bout, lower quartile min', 2], boutTravelQ3: ['C3 travel bout, upper quartile min', 2], boutTravelMean: ['C3 travel bout, mean min', 2],
  boutGroomMedian: ['C3 grooming bout, median min', 2], boutGroomQ1: ['C3 grooming bout, lower quartile min', 2], boutGroomQ3: ['C3 grooming bout, upper quartile min', 2], boutGroomMean: ['C3 grooming bout, mean min', 2],
  bout3Mean: ['C4 bout in the three activities, mean min', 2], bout3Median: ['C4 bout in the three activities, median min', 2],
  tripsBegun: ['C5 trips to food begun per animal-day', 2], tripsDone: ['C5 trips to food completed per animal-day', 2], tripsDoneShare: ['C5 share of trips begun that were completed', 3], drinks: ['drinks per animal-day', 2],
  visitMean: ['C6 patch residency, mean feeding min per visit', 2], visitMedian: ['C6 patch residency, median min', 2], visitQ1: ['C6 patch residency, lower quartile min', 2], visitQ3: ['C6 patch residency, upper quartile min', 2],
  runMedian: ['C7 continuous feeding at one tree, median min', 2], runQ1: ['C7 continuous feeding at one tree, lower quartile min', 2], runQ3: ['C7 continuous feeding at one tree, upper quartile min', 2],
  treesPerDay: ['C8 feeding trees per animal-day', 2],
  sameHalfHour: ['C9 half-hour pairs in the same activity, share', 3], sameFromRest: ['C9 the same, first mark resting', 3], sameFromTravel: ['C9 the same, first mark travelling', 3], sameFromFeed: ['C9 the same, first mark feeding', 3],
  reservePctPerDay: ['reserve change, % of the reserve cap per day', 3], kmFixPerDay: ['distance by 5-min fixes, km per day', 2], kmPerDay: ['distance by every tick, km per day', 2], nightsInNest: ['nights in a nest, share of nights', 3],
  kcalEatenPerDay: ['energy eaten, kcal per day (the field\'s formula measure; not a guard)', 0], kcalInPerDay: ['usable energy in, kcal per day', 0], dmInPerDay: ['dry matter eaten, g per day', 0],
  shareFeed: ['awake time feeding, share', 3], shareRest: ['awake time resting, share', 3], shareTravel: ['awake time travelling, share', 3], shareGroom: ['awake time grooming, share', 3], shareSocial: ['awake time in other social acts, share', 3], shareAgonistic: ['awake time agonistic, share', 3],
  awakeHours: ['hours awake per day', 2],
};

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
/**
 * One value per readout. Per-day counts are a rate per animal (its count over its living days, a death shortens the
 * days) and the mean over animals; bout, visit and run statistics pool the bouts of every animal (the histograms hold
 * all tracked animals, so `keep` does not narrow them); half-hour shares pool pairs (Σ same ÷ Σ pairs, as the Taï value).
 */
export function cardSummary(results: CardResult[], keep: (a: CardAnimal) => boolean = () => true): Record<string, number | null> {
  const per: Record<string, number[]> = {}, push = (k: string, v: number | null) => { if (v !== null && Number.isFinite(v)) (per[k] ??= []).push(v); };
  const pairs = [0, 0, 0], same = [0, 0, 0];
  let begun = 0, done = 0;
  for (const r of results) for (const a of r.animals) {
    if (!keep(a)) continue;
    const rows = r.days.filter(d => d.id === a.id), sum = (f: (d: CardDay) => number | null) => rows.reduce((s, d) => s + (f(d) ?? 0), 0);
    const days = sum(d => d.ticks) / DAY_TICKS, awakeH = sum(d => d.awakeTicks) * TICK_HOURS, awake = sum(d => d.awakeTicks);
    if (!(days > 0)) continue;
    push('actChanges', sum(d => d.actChanges) / days);
    if (awakeH > 0) { push('switchesPerWakingHour', sum(d => d.switches) / awakeH); push('stableSwitchesPerWakingHour', sum(d => d.stableSwitches) / awakeH); }
    push('tripsBegun', sum(d => d.trips) / days); push('tripsDone', sum(d => d.tripsDone) / days); push('drinks', sum(d => d.drinks) / days);
    begun += sum(d => d.trips); done += sum(d => d.tripsDone);
    push('treesPerDay', sum(d => d.trees) / days);
    push('kmFixPerDay', sum(d => d.kmFix) / days); push('kmPerDay', sum(d => d.km) / days); push('awakeHours', awakeH / days);
    const led = rows.filter(d => d.reservePct !== null), ledDays = led.reduce((s, d) => s + d.ticks, 0) / DAY_TICKS;
    if (ledDays > 0) { push('reservePctPerDay', led.reduce((s, d) => s + d.reservePct!, 0) / ledDays); push('kcalEatenPerDay', led.reduce((s, d) => s + (d.kcalEaten ?? 0), 0) / ledDays); push('kcalInPerDay', led.reduce((s, d) => s + (d.kcalIn ?? 0), 0) / ledDays); push('dmInPerDay', led.reduce((s, d) => s + (d.dmIn ?? 0), 0) / ledDays); }
    const nights = rows.filter(d => d.nightTicks > 0);
    if (nights.length) push('nightsInNest', nights.filter(d => d.nestTicks / d.nightTicks >= NIGHT_IN_NEST).length / nights.length);
    if (awake > 0) ['shareFeed', 'shareRest', 'shareTravel', 'shareGroom', 'shareSocial', 'shareAgonistic'].forEach((k, j) => push(k, sum(d => d.cat[j]) / awake));
    for (let k = 0; k < 3; k++) { pairs[k] += sum(d => d.pairs[k]); same[k] += sum(d => d.same[k]); }
  }
  const out: Record<string, number | null> = {};
  for (const k of Object.keys(CARD_LABELS)) out[k] = per[k] ? mean(per[k]) : null;
  out.tripsDoneShare = begun ? done / begun : null;
  const P = pairs[0] + pairs[1] + pairs[2];
  out.sameHalfHour = P ? (same[0] + same[1] + same[2]) / P : null;
  out.sameFromRest = pairs[REST] ? same[REST] / pairs[REST] : null; out.sameFromTravel = pairs[TRAVEL] ? same[TRAVEL] / pairs[TRAVEL] : null; out.sameFromFeed = pairs[FEED] ? same[FEED] / pairs[FEED] : null;
  const b6 = CATEGORIES.map((_, k) => mergeHist(results.map(r => r.bout6[k]))), b3 = mergeHist(results.flatMap(r => r.bout3)), vis = mergeHist(results.map(r => r.visit)), run = mergeHist(results.map(r => r.run));
  for (const [name, k] of [['Feed', 0], ['Rest', 1], ['Travel', 2], ['Groom', 3]] as [string, number][]) {
    out[`bout${name}Median`] = histQuantile(b6[k], 0.5); out[`bout${name}Q1`] = histQuantile(b6[k], 0.25); out[`bout${name}Q3`] = histQuantile(b6[k], 0.75); out[`bout${name}Mean`] = histMean(b6[k]);
  }
  out.bout3Mean = histMean(b3); out.bout3Median = histQuantile(b3, 0.5);
  out.visitMean = histMean(vis); out.visitMedian = histQuantile(vis, 0.5); out.visitQ1 = histQuantile(vis, 0.25); out.visitQ3 = histQuantile(vis, 0.75);
  out.runMedian = histQuantile(run, 0.5); out.runQ1 = histQuantile(run, 0.25); out.runQ3 = histQuantile(run, 0.75);
  return out;
}
/** How much lies under a summary: animals, animal-days, half-hour pairs, bouts by kind, patch visits. */
export function cardCounts(results: CardResult[], keep: (a: CardAnimal) => boolean = () => true): Record<string, number> {
  const rows = results.flatMap(r => { const ok = new Set(r.animals.filter(keep).map(a => a.id)); return r.days.filter(d => ok.has(d.id)); });
  return { animals: results.reduce((s, r) => s + r.animals.filter(keep).length, 0), animalDays: +(rows.reduce((s, d) => s + d.ticks, 0) / DAY_TICKS).toFixed(2), halfHourPairs: rows.reduce((s, d) => s + d.pairs[0] + d.pairs[1] + d.pairs[2], 0),
    feedBouts: results.reduce((s, r) => s + histN(r.bout6[0]), 0), restBouts: results.reduce((s, r) => s + histN(r.bout6[1]), 0), travelBouts: results.reduce((s, r) => s + histN(r.bout6[2]), 0), groomBouts: results.reduce((s, r) => s + histN(r.bout6[3]), 0),
    patchVisits: results.reduce((s, r) => s + histN(r.visit), 0), feedingRuns: results.reduce((s, r) => s + histN(r.run), 0) };
}

// ---------------------------------------------------------------------------------------------------------------------
// The Taï half-hour anchor (prereg §4; a yardstick, never an input): aggregates only
// ---------------------------------------------------------------------------------------------------------------------

export interface TaiPersistence {
  records: number; follows: number; slots: number; slotsWithSeveral: number; slotsDisagreeing: number; pairs: number;
  /** Share of consecutive half-hour slots of one follow in the same activity: all, and by the first slot's activity; pairs by first activity. */
  same: number | null; fromRest: number | null; fromTravel: number | null; fromFeed: number | null; pairsFrom: [number, number, number];
  /** Shares of slots resting, travelling, feeding. */ shares: [number, number, number];
  /** The same share by group (two groups): its own spread. */ byGroup: Record<string, { pairs: number; same: number | null }>;
  /** Without collapsing: pairs of consecutive records 27 to 33 minutes apart (the fact-check's reading). */ uncollapsed: { pairs: number; same: number | null; fromRest: number | null; fromTravel: number | null; fromFeed: number | null };
  /** Mean run of consecutive slots in one activity, in slots (a run cut by a gap or the follow's end counts as it stands): how coarse the half-hour grid is. */ meanRunSlots: number | null;
}
/**
 * One record per follow and half-hour slot (the record nearest the half hour; the first on a tie), then the share of
 * consecutive slots in the same activity. `points` are src/compare/tai.ts taiPoints (class "O" follows already excluded).
 */
export function taiPersistence(points: Pick<TrackPoint, 'follow' | 'group' | 't' | 'act'>[]): TaiPersistence {
  const by = new Map<string, Pick<TrackPoint, 'follow' | 'group' | 't' | 'act'>[]>();
  for (const p of points) (by.get(p.follow) ?? by.set(p.follow, []).get(p.follow)!).push(p);
  const pairs = [0, 0, 0], same = [0, 0, 0], share = [0, 0, 0], group: Record<string, { pairs: number; same: number }> = {}, un = { pairs: [0, 0, 0], same: [0, 0, 0] };
  let slots = 0, several = 0, disagree = 0, runs = 0, runSlots = 0;
  for (const recs of by.values()) {
    const slot = new Map<number, { act: Act; off: number; n: number; acts: Set<number> }>();
    for (const p of recs) {
      const k = Math.round(p.t * 2), off = Math.abs(p.t * 2 - k), s = slot.get(k);
      if (!s) slot.set(k, { act: p.act, off, n: 1, acts: new Set([p.act]) });
      else { s.n++; s.acts.add(p.act); if (off < s.off) { s.act = p.act; s.off = off; } }
    }
    const keys = [...slot.keys()].sort((a, b) => a - b);
    slots += keys.length;
    let run = 0;
    keys.forEach((k, j) => {
      const s = slot.get(k)!;
      share[s.act]++; if (s.n > 1) several++; if (s.acts.size > 1) disagree++;
      const prev = j > 0 && keys[j - 1] === k - 1 ? slot.get(k - 1)! : null;
      if (prev) { pairs[prev.act]++; const g = (group[recs[0].group] ??= { pairs: 0, same: 0 }); g.pairs++; if (prev.act === s.act) { same[prev.act]++; g.same++; } }
      if (prev && prev.act === s.act) run++; else { if (run) { runs++; runSlots += run; } run = 1; }
    });
    if (run) { runs++; runSlots += run; }
    const sorted = [...recs].sort((a, b) => a.t - b.t);
    for (let j = 1; j < sorted.length; j++) { const gap = (sorted[j].t - sorted[j - 1].t) * 60; if (gap >= 27 && gap <= 33) { un.pairs[sorted[j - 1].act]++; if (sorted[j].act === sorted[j - 1].act) un.same[sorted[j - 1].act]++; } }
  }
  const tot = (v: number[]) => v[0] + v[1] + v[2], div = (a: number, b: number) => (b ? a / b : null);
  return { records: points.length, follows: by.size, slots, slotsWithSeveral: several, slotsDisagreeing: disagree, pairs: tot(pairs), same: div(tot(same), tot(pairs)), fromRest: div(same[REST], pairs[REST]), fromTravel: div(same[TRAVEL], pairs[TRAVEL]), fromFeed: div(same[FEED], pairs[FEED]),
    pairsFrom: [pairs[REST], pairs[TRAVEL], pairs[FEED]], shares: [share[REST] / slots, share[TRAVEL] / slots, share[FEED] / slots],
    byGroup: Object.fromEntries(Object.entries(group).map(([g, v]) => [g, { pairs: v.pairs, same: div(v.same, v.pairs) }])),
    uncollapsed: { pairs: tot(un.pairs), same: div(tot(un.same), tot(un.pairs)), fromRest: div(un.same[REST], un.pairs[REST]), fromTravel: div(un.same[TRAVEL], un.pairs[TRAVEL]), fromFeed: div(un.same[FEED], un.pairs[FEED]) },
    meanRunSlots: div(runSlots, runs) };
}
