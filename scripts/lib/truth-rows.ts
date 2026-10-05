// Simulation-truth target rows (track E, part A5): the data/targets.json rows marked "scoredOn": "truth" (stage freeze
// of 5 October 2026; each row's truthDefinition gives the definition, its source's Methods sentence and the readout).
// Per seed, e-bench's single pass gives every such row that has a readout one SeedValue (src/field/metrics.ts): numeric
// rows a value with num/den so that the seeds pool as Σnum/Σden (src/field/targets.ts scoreTruthRow), pattern rows a
// pass. A truth row without a readout here is reported "not scorable" by the bench, never dropped (NO_READOUT says why).
//
// Readouts come from three places, all on the bench's own world: the energy readouts (scripts/lib/energy-probe.ts, as
// energy-diagnose.ts prints them), the rhythm readouts (scripts/lib/rhythm-probe.ts, as rhythm-metrics.ts), and the
// probe below for the rows no tool measured in the row's own terms (stepped after every tick like the others; its whole
// state is plain data, checkpointed with the world). It reads the world and never writes it; its contest hook is a
// module-level hook of src/sim (conflict.ts contestTrace), so e-bench switches it off while field experiments tick copies.
// Outside the protocol hash (scripts/lib).
import { activityCategory, CAT_FEED } from '../../src/field/categories';
import type { SeedValue } from '../../src/field/metrics';
import type { FieldResult } from '../../src/field/run';
import { V } from '../../src/sim/candidates';
import { contestTrace, type ContestTrace } from '../../src/sim/conflict';
import { sunAltitudeAt } from '../../src/sim/environment';
import { massOf } from '../../src/sim/energy';
import { paramsOf } from '../../src/sim/params';
import { index, ix, TICK_HOURS } from '../../src/sim/state';
import type { Chimp, World } from '../../src/types';
import type { EnergyAcc } from './energy-probe';
import type { RhythmResult } from './rhythm-probe';
import type { Viability } from './viability';

const DAY = 5760, HOUR = 240;
const H0 = -0.833 * Math.PI / 180; // apparent sunrise and sunset, as scripts/rhythm-metrics.ts (NOAA's −0.833°)

/** Truth rows with no readout yet, and why (reported "not scorable" by the bench; never dropped, never summed). */
export const NO_READOUT: Readonly<Record<string, string>> = {
  'T-ENE-4': 'no readout of the net balance at urinations against the month\'s fruit index within individuals',
  'T-ENE-5': 'no within-mother readout: energy-diagnose gives the balance by the youngest infant\'s age pooled over mothers, not within mothers',
  'T-ENE-6': 'no readout of a female\'s balance against the adult males in her party',
  'T-ENE-7': 'no readout yet in the single pass (scripts/e4p-diagnose.ts item 9 measures it on its own world)',
  'T-ENE-9': 'no monthly readout of feeding time and day range against fruit (a statistic across months: needs a year)',
  'T-RHY-2': 'no readout of receptive females\' active day (rhythm-metrics classes adults as male, lactating, other female)',
  'T-RHY-7': 'model water sites have no stream or pool kind (eA-protocol: leave unread)',
  'T-RHY-8': 'no logistic readout of resting and ground use against temperature with hour as a covariate',
  'T-RHY-10': 'no readout of leaf feeding by half of each individual\'s active day',
  'T-END-1': 'no readout of male stress in months with rank reversals (a statistic across months: needs a year)',
  'T-END-2': 'no readout of mean male stress against Elo rank in the single pass',
  'T-END-3': 'no readout of male stress on days with a swollen parous female',
  'T-END-4': 'no readout of the stress ratio around aggression against rests',
  'T-END-5': 'no readout of relative stress by bond partner and context',
  'T-END-6': 'no monthly readout of lactating females\' stress against fruit and rank (a statistic across months: needs a year)',
  'T-END-7': 'no readout of arousal by the swollen female\'s parity',
  'T-END-8': 'no readout yet in the single pass (scripts/endocrine-diagnose.ts measures fedurek2016\'s form on its own world)',
  'T-END-9': 'no readout of arousal on patrol days',
  'T-END-10': 'no readout of affiliation after grooming by partner',
  'T-END-11': 'no readout of affiliation after food sharing',
  'T-END-12': 'no readout yet in the single pass (scripts/endocrine-diagnose.ts measures its intergroup half on its own world)',
  'T-INF-1': 'no readout of infants\' eating share in 0.5-y blocks with the Gombe values per block',
  'T-INF-4': 'no mass-for-age readout (life history: needs a year)',
};

// ---------------------------------------------------------------------------------------------------------------------
// The probe
// ---------------------------------------------------------------------------------------------------------------------

interface NestTrack { nesting: boolean; start: number; lastStart: number; inNest: boolean; lastEntry: number }
/** A contest as E4h's readouts count it (scripts/contest-diagnose.ts): the two sides at the time, and contact. */
interface Side { male: boolean; age: number; rank: number; adult: boolean }
/** The probe's whole state (plain data; checkpointed with the world). */
export interface TruthState {
  prevAlt: number; prevRise: boolean; sunset: number; noon: number;
  /** T-ENE-2: lactating adult females' ticks, and those in the field category feed. */
  lacTicks: number; lacFeed: number;
  /** T-ENE-8: per adult neither pregnant nor lactating: kcal spent, Σ mass^0.75 and ticks in that state; every ledger animal's kcal spent at the last tick. */
  e8: Map<number, { out: number; m75: number; ticks: number }>; prevOut: Map<number, number>;
  /** T-RHY-4: nest tracking of weaned individuals; minutes before sunset at which the night nest's building started. */
  nest: Map<number, NestTrack>; builds: number[];
  /** T-RHY-6: adult females' daylight ticks, daylight ticks drinking at the water, drinking events started in daylight; at the water last tick. */
  fDay: number; fDrink: number; fEvents: number; atWater: Map<number, boolean>;
  /** T-INF-2, T-INF-5: unweaned infants' daylight ticks outside the night nest, those in the nurse act, bouts begun; each infant's last nurse tick. */
  infTicks: number; infNurse: number; infBouts: number; lastNurse: Map<number, number>;
  /** T-INF-3: ages at weaning of offspring weaned in the window; the weaned flag at the last tick. */
  weanAges: number[]; weaned: Map<number, boolean>;
  /** T-INF-6: mothers' daylight ticks outside the night nest with an unweaned infant of 1–2 y and 2–3 y, those grooming it; those infants' ticks and ticks grooming anyone. */
  mt: [number, number]; mg: [number, number]; it: [number, number]; ig: [number, number];
  /** T-SOC-14..16: contests (R1, deduplicated per pair within 1 min; R2 by rank difference) and aggression started by males ≥ 12 y (R3). */
  r1: { n: number; contact: number }; pairLast: Map<string, { t: number; contact: boolean }>;
  r2: Record<string, { n: number; contact: number }>; escalatedAt: Map<string, number>;
  r3: { all: number; coalition: number }; version: Map<number, number>; prevKey: Map<number, string>;
  tick: number;
}

const inNest = (c: Chimp) => c.action === 'nest' && (ix(c).phase === 2 || ix(c).v === V.MOTHER);
const unweanedWithMother = (w: World, c: Chimp) => c.alive && !ix(c).weaned && c.age < 6 && !!index(w).byId.get(c.motherId)?.alive;
const sideOf = (c: Chimp): Side => ({ male: c.sex === 'male', age: c.age, rank: c.rankOrder, adult: c.age >= 15 });

export function truthStart(w: World): TruthState {
  const st: TruthState = {
    prevAlt: w.environment.sunAltitude, prevRise: w.environment.sunAltitude > sunAltitudeBefore(w), sunset: NaN, noon: NaN,
    lacTicks: 0, lacFeed: 0, e8: new Map(), prevOut: new Map(), nest: new Map(), builds: [], fDay: 0, fDrink: 0, fEvents: 0, atWater: new Map(),
    infTicks: 0, infNurse: 0, infBouts: 0, lastNurse: new Map(), weanAges: [], weaned: new Map(), mt: [0, 0], mg: [0, 0], it: [0, 0], ig: [0, 0],
    r1: { n: 0, contact: 0 }, pairLast: new Map(), r2: {}, escalatedAt: new Map(), r3: { all: 0, coalition: 0 }, version: new Map(), prevKey: new Map(), tick: 0,
  };
  for (const c of w.chimps) if (c.alive) {
    st.weaned.set(c.id, ix(c).weaned);
    st.version.set(c.id, c.decisionVersion); st.prevKey.set(c.id, `${c.action}:${c.targetId}:${ix(c).v}`);
    const L = ix(c).en; if (L) st.prevOut.set(c.id, L.out);
  }
  return st;
}
const sunAltitudeBefore = (w: World) => sunAltitudeAt(w.time - TICK_HOURS);

/** Connects the contest hook (again after a checkpoint is restored). */
export function truthHooksOn(st: TruthState, w: World): void { contestTrace.on = e => onContest(st, w, e); }
export function truthHooksOff(): void { contestTrace.on = null; }

/** E4h's R1 and R2 (scripts/contest-diagnose.ts): charges resolved and fights begun as attacks, with contact. */
function onContest(st: TruthState, w: World, e: ContestTrace): void {
  if (e.kind !== 'charge' && e.kind !== 'fight') return;
  const time = w.time, key = `${e.c.id}>${e.o.id}`;
  let contact: boolean;
  if (e.kind === 'charge') { contact = e.hit || e.escalated; if (e.escalated) st.escalatedAt.set(key, time); }
  else {
    // a fight that a counter-charge escalated into is that charge's contest, already counted (contest-diagnose's origin)
    const esc = st.escalatedAt.get(key);
    if (esc !== undefined) st.escalatedAt.delete(key);
    if (esc !== undefined && time - esc < 0.1) return;
    contact = true;
  }
  const cs = sideOf(e.c), os = sideOf(e.o);
  // R1 (mouginot2024, T-SOC-14): individuals >= 12 y with a male >= 12 y as a party; acts between the same pair within 1 min count once
  if (cs.age >= 12 && os.age >= 12 && (cs.male || os.male)) {
    const pk = e.c.id < e.o.id ? `${e.c.id}-${e.o.id}` : `${e.o.id}-${e.c.id}`, last = st.pairLast.get(pk);
    if (last && time - last.t <= 1 / 60) { if (contact && !last.contact) { st.r1.contact++; last.contact = true; } last.t = time; }
    else { st.r1.n++; if (contact) st.r1.contact++; st.pairLast.set(pk, { t: time, contact }); }
  }
  // R2 (wittigBoesch2003b, T-SOC-15): same-sex ranked dyads by rank difference (their cut-offs)
  if (cs.rank > 0 && os.rank > 0) {
    const d = Math.abs(cs.rank - os.rank);
    const cat = cs.male && os.male ? (d <= 1 ? 'small' : d === 2 ? 'middle' : 'large') : !cs.male && !os.male && cs.adult && os.adult ? (d <= 3 ? 'small' : d <= 6 ? 'middle' : 'large') : null;
    if (cat) { const b = (st.r2[cat] ??= { n: 0, contact: 0 }); b.n++; if (contact) b.contact++; }
  }
}

/** One measured tick, after tickWorld (and the observers). */
export function truthStep(st: TruthState, w: World): void {
  const P = paramsOf(w), env = w.environment, alt = env.sunAltitude, rising = alt > st.prevAlt, time = w.time;
  const isSunset = st.prevAlt >= H0 && alt < H0, isNoon = st.prevRise && !rising && alt > 0, isMidnight = !st.prevRise && rising && alt < 0;
  if (isSunset) st.sunset = time;
  if (isNoon) st.noon = time;
  const light = env.daylight > 0.1, byId = index(w).byId;
  for (const c of w.chimps) {
    if (!c.alive) continue;
    const x = ix(c), L = x.en;
    // T-ENE-8: kcal spent per day ÷ mass^0.75, adults neither pregnant nor lactating (per individual)
    if (L) {
      const prev = st.prevOut.get(c.id);
      if (prev !== undefined && c.age >= 15 && c.pregnancy <= 0 && !c.lactating) { const e = st.e8.get(c.id) ?? { out: 0, m75: 0, ticks: 0 }; e.out += L.out - prev; e.m75 += Math.pow(massOf(c, P), P.ledgerRmrExp); e.ticks++; st.e8.set(c.id, e); }
      st.prevOut.set(c.id, L.out);
    }
    // T-ENE-2: a lactating adult female's tick in the field category feed (the observer's truth category, protocols.ts)
    if (c.sex === 'female' && c.age >= 15 && c.lactating) {
      st.lacTicks++;
      let groomed = false;
      if (c.action === 'rest' || c.action === 'shelter' || c.action === 'nest') for (const m of index(w).alive) if (m.action === 'groom' && m.targetId === c.id && m.alive && ix(m).phase >= 1) { groomed = true; break; }
      let atW = false;
      if (c.action === 'drink') { const s = index(w).waterById.get(c.targetId); atW = !!s && (s.position[0] - c.position[0]) ** 2 + (s.position[2] - c.position[2]) ** 2 <= 1.44; }
      if (activityCategory(c.action, x.phase, c.targetId, groomed, c.carryingMeat > 0.02, atW) === CAT_FEED) st.lacFeed++;
    }
    // T-RHY-6: adult females' drinking events (runs of ticks in the drink act within 1.2 m of the water site; water-diagnose.ts)
    if (c.sex === 'female' && c.age >= 15) {
      let at = false;
      if (c.action === 'drink') { const s = index(w).waterById.get(c.targetId); at = !!s && (s.position[0] - c.position[0]) ** 2 + (s.position[2] - c.position[2]) ** 2 <= 1.44; }
      if (light) { st.fDay++; if (at) { st.fDrink++; if (!st.atWater.get(c.id)) st.fEvents++; } }
      st.atWater.set(c.id, at);
    }
    // T-RHY-4: the start of building the night nest, weaned individuals
    if (x.weaned) {
      const nest = inNest(c);
      let t = st.nest.get(c.id);
      if (!t) { t = { nesting: c.action === 'nest', start: NaN, lastStart: NaN, inNest: nest, lastEntry: NaN }; st.nest.set(c.id, t); }
      if ((c.action === 'nest') !== t.nesting) { t.nesting = c.action === 'nest'; if (t.nesting) t.start = time; }
      if (nest !== t.inNest) { t.inNest = nest; if (nest) { t.lastEntry = time; t.lastStart = t.start; } }
      if (isMidnight && nest && t.lastEntry > st.noon && Number.isFinite(t.lastStart) && st.sunset > st.noon) st.builds.push((st.sunset - t.lastStart) * 60);
    }
    // T-INF-3: weaned in the window
    const was = st.weaned.get(c.id);
    if (was === false && x.weaned) st.weanAges.push(c.age);
    st.weaned.set(c.id, x.weaned);
    // T-INF-2, T-INF-5, T-INF-6: unweaned infants with a living mother, daylight outside the night nest
    if (light && unweanedWithMother(w, c) && !inNest(c)) {
      st.infTicks++;
      if (c.action === 'nurse') {
        st.infNurse++;
        // badescu2022: bouts are distinct when separated by at least 1 minute
        const ln = st.lastNurse.get(c.id);
        if (ln === undefined || st.tick - ln > 4) st.infBouts++;
        st.lastNurse.set(c.id, st.tick);
      }
      const m = byId.get(c.motherId)!;
      const b: 0 | 1 | -1 = c.age >= 1 && c.age < 2 ? 0 : c.age >= 2 && c.age < 3 ? 1 : -1;
      if (b !== -1 && !inNest(m)) {
        st.mt[b]++; if (m.action === 'groom' && m.targetId === c.id && ix(m).phase >= 1) st.mg[b]++;
        st.it[b]++; if (c.action === 'groom' && x.phase >= 1) st.ig[b]++;
      }
    }
    // T-SOC-16 (R3): acts started this tick by males >= 12 y at community members >= 12 y (contest-diagnose.ts)
    const key = `${c.action}:${c.targetId}:${x.v}`;
    if (c.decisionVersion !== st.version.get(c.id) && key !== st.prevKey.get(c.id) && (c.action === 'charge' || c.action === 'attack')) {
      const o = byId.get(c.targetId);
      if (o && o.troopId === c.troopId && c.sex === 'male' && c.age >= 12 && o.age >= 12) { st.r3.all++; if (x.v === V.COALITION) st.r3.coalition++; }
    }
    st.version.set(c.id, c.decisionVersion); st.prevKey.set(c.id, key);
  }
  st.prevRise = rising; st.prevAlt = alt; st.tick++;
}

// ---------------------------------------------------------------------------------------------------------------------
// Per-seed values
// ---------------------------------------------------------------------------------------------------------------------

export interface TruthInputs { seed: number; days: number; viability: Viability; energy: EnergyAcc | null; rhythm: RhythmResult | null; field: FieldResult; truth: TruthState | null; params: Record<string, number> }
const median = (v: number[]) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(0.5 * s.length))]; };
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const ratio = (num: number, den: number, n: number, parts?: Record<string, number | null>, note?: string): SeedValue => ({ value: den > 0 ? num / den : null, num, den, n, ...(parts ? { parts } : {}), ...(note ? { note } : {}) });
const fin = (v: number) => (Number.isFinite(v) ? v : null);

/** This seed's value per truth row that has a readout (rows absent here are "not scorable"; see NO_READOUT). */
export function truthValues(x: TruthInputs): Record<string, SeedValue> {
  const out: Record<string, SeedValue> = {};
  const ledger = (x.params.energyLedger ?? 0) === 1, digesta = (x.params.ledgerDigesta ?? 0) === 1;
  const lacE = x.energy?.acc['female, lactating'], lacDays = lacE ? lacE.ticks / DAY : 0;
  // T-ENE-1 (contested): lactating females' food eaten at the field formula's kcal/min (energy-diagnose's field method); part `ledger` = the ledger's formula kcal eaten (with ledgerDigesta)
  if (lacE && ledger) out['T-ENE-1'] = ratio(lacE.fm, lacDays, Math.round(lacDays), { ledger: digesta && lacDays > 0 ? lacE.fin / lacDays : null });
  const t = x.truth;
  if (t) {
    // T-ENE-2: minutes per lactating-female-day in the field category feed; part `eating` = minutes swallowing (energy-diagnose's eating minutes)
    const days = t.lacTicks / DAY;
    out['T-ENE-2'] = ratio(t.lacFeed / 4, days, Math.round(days), { eating: lacE && ledger && lacDays > 0 ? lacE.eating / 4 / lacDays : null });
  }
  // T-ENE-3: dry matter eaten per lactating-female-day (the ledger's dry-matter intake; needs ledgerDigesta)
  if (lacE && ledger && digesta) out['T-ENE-3'] = ratio(lacE.dmIn, lacDays, Math.round(lacDays));
  if (t && ledger) {
    // T-ENE-8: per individual with at least a day in the state, kcal spent per day ÷ its mean mass^0.75; mean over individuals
    const v: number[] = [];
    for (const e of t.e8.values()) if (e.ticks >= DAY) v.push(e.out / (e.ticks / DAY) / (e.m75 / e.ticks));
    out['T-ENE-8'] = ratio(v.reduce((a, b) => a + b, 0), v.length, v.length);
  }
  const r = x.rhythm;
  if (r) {
    // T-RHY-1: active day (nest to nest) per adult individual-day, hours; parts by class
    const act = (k?: string) => r.dayRec.filter(d => !k || d.cls === k).map(d => d.active);
    const all = act();
    out['T-RHY-1'] = ratio(all.reduce((a, b) => a + b, 0), all.length, all.length, { males: fin(mean(act('male'))), lactating: fin(mean(act('lactating'))) });
    // T-RHY-3: median adult departure, minutes after sunrise (the sun's centre at −0.833°); parts by class and the share before sunrise
    const dep = (f: (d: RhythmResult['deps'][number]) => boolean) => r.deps.filter(f).map(d => d.wake);
    const wake = dep(() => true);
    out['T-RHY-3'] = { value: fin(median(wake)), n: wake.length, parts: { males: fin(median(dep(d => d.cls === 'male'))), adultFemales: fin(median(dep(d => d.cls !== 'male'))), lactating: fin(median(dep(d => d.cls === 'lactating'))),
      shareBeforeSunrise: wake.length ? wake.filter(v => v < 0).length / wake.length : null } };
    // T-RHY-5: adults' out-of-nest activity ticks at night ÷ all their activity ticks (rhythm-metrics.ts's T-RHY-5)
    const at = r.night.adultTicks, night = at.feed + at.travel + at.groom + at.other;
    const allAct = r.hourly.reduce((s, h) => s + h[2] + h[3] + h[4] + h[5], 0);
    out['T-RHY-5'] = ratio(night, allAct, allAct);
    // T-RHY-9 (pattern): feeding share in the first and last 3 h of the active day above the middle; resting highest in the middle
    const share = (i: number, k: number) => { const p = r.parts[i], s = p.reduce((a, b) => a + b, 0); return s ? p[k] / s : NaN; };
    const FEED = 3, REST = 1, f0 = share(0, FEED), f1 = share(1, FEED), f2 = share(2, FEED), r0 = share(0, REST), r1 = share(1, REST), r2 = share(2, REST);
    const ok = [f0, f1, f2, r0, r1, r2].every(Number.isFinite);
    out['T-RHY-9'] = { value: null, pass: ok ? f0 > f1 && f2 > f1 && r1 > r0 && r1 > r2 : null, n: r.parts.flat().reduce((a, b) => a + b, 0), parts: { feedFirst: fin(f0), feedMiddle: fin(f1), feedLast: fin(f2), restFirst: fin(r0), restMiddle: fin(r1), restLast: fin(r2) } };
  }
  if (t) {
    // T-RHY-4: median minutes before sunset at which weaned individuals started building their night nest
    out['T-RHY-4'] = { value: fin(median(t.builds)), n: t.builds.length };
    // T-RHY-6: drinking events per adult female per 12 h of daylight; part: share of daylight minutes drinking
    out['T-RHY-6'] = ratio(t.fEvents, t.fDay * TICK_HOURS / 12, t.fEvents, { shareMinutesDrinking: t.fDay ? t.fDrink / t.fDay : null });
    // T-INF-2: % of unweaned infants' daylight ticks outside the night nest in the nurse act (the milk-ejection wait included)
    out['T-INF-2'] = ratio(100 * t.infNurse, t.infTicks, Math.round(t.infTicks / HOUR));
    // T-INF-3: age at weaning of offspring weaned in the window
    out['T-INF-3'] = ratio(t.weanAges.reduce((a, b) => a + b, 0), t.weanAges.length, t.weanAges.length);
    // T-INF-5: nurse bouts (separated by at least 1 min) per daylight hour outside the night nest; part: minutes per bout
    out['T-INF-5'] = ratio(t.infBouts, t.infTicks / HOUR, Math.round(t.infTicks / HOUR), { boutMin: t.infBouts ? t.infNurse / 4 / t.infBouts : null });
    // T-INF-6: share of mothers' daylight ticks outside the night nest grooming their own infant of 1–3 y; parts by age and the infants' own grooming
    out['T-INF-6'] = ratio(t.mg[0] + t.mg[1], t.mt[0] + t.mt[1], Math.round((t.mt[0] + t.mt[1]) / HOUR), { '1-2 y': t.mt[0] ? t.mg[0] / t.mt[0] : null, '2-3 y': t.mt[1] ? t.mg[1] / t.mt[1] : null,
      infantGrooms1to2: t.it[0] ? t.ig[0] / t.it[0] : null, infantGrooms2to3: t.it[1] ? t.ig[1] / t.it[1] : null });
    // T-SOC-14 (R1): contact share of contests between individuals >= 12 y with a male >= 12 y as a party
    out['T-SOC-14'] = ratio(t.r1.contact, t.r1.n, t.r1.n);
    // T-SOC-15 (R2, pattern): contact share at a large rank difference below small and middle; insufficient below 20 contests per category
    const c = (k: string) => t.r2[k] ?? { n: 0, contact: 0 }, sh = (k: string) => c(k).n ? c(k).contact / c(k).n : NaN;
    const enough = ['small', 'middle', 'large'].every(k => c(k).n >= 20);
    out['T-SOC-15'] = { value: null, pass: enough ? sh('large') < sh('small') && sh('large') < sh('middle') : null, n: ['small', 'middle', 'large'].reduce((a, k) => a + c(k).n, 0),
      parts: { small: fin(sh('small')), middle: fin(sh('middle')), large: fin(sh('large')) }, ...(enough ? {} : { note: 'fewer than 20 contests in a rank-difference category' }) };
    // T-SOC-16 (R3): coalition charges started by males >= 12 y at community members >= 12 y ÷ all charges and attacks they started
    out['T-SOC-16'] = ratio(t.r3.coalition, t.r3.all, t.r3.all);
  }
  return out;
}
