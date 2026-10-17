// Stage R16 (docs/staging/r16-prereg.md §5.4, §7.2, §9, §12): the registered marks, read by machine from files. Pure
// arithmetic on rows, scores, census counts and arm files; no number is typed here but the registered thresholds, each
// with its source. Intervals: 95% bootstrap over animals, 2,000 resamples, fixed seed 16. A stratum under 30 rows or 5
// animals reads "not read", and for a mark that can stop the stage "not read" is not passed.
import { cardSummary, type CardResult } from './timing-card';
import { seeded } from './soft-labels';
import type { R16Row } from './r16-collect';
import { READOUTS, type ReadoutResult } from './r16-readouts';
import type { KindStratum } from './r16-strata';

export const MARK = {
  /** R14 §4. */ minRows: 30, minAnimals: 5, resamples: 2000, seed: 16,
  /** R14 §4 (A1). */ divergence: 0.05, carryError: 0.05, nestDrop: 0.01, sure: 0.99,
  /** R11 O4 (CARRY), O2 (a reading). */ carry: 0.05, trip: 0.03,
  /** R7 §6. */ dFactor: 2.51,
  /** R13 §8.1 (V2's floor), §12.4 (the stay forecast's floor and minutes per held daytime ask). */ v2Floor: 0.01, stayFloorMin: 1, heldAskMin: 30,
  /** §7.2: I0 five of eight imitator arms; K5 six of eight planted arms on both worlds; §12.2 the under-powered heading below six of eight. */ i0: 5, k5: 6, power: 6,
  /** §9.2 P4 (b): far is 400 m or more (the sampler's second band edge). */ farM: 400,
} as const;

const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
const sd = (v: number[]) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };
export const kl = (q: number[], p: number[]): number => q.reduce((s, x, i) => s + (x > 0 ? x * Math.log(x / Math.max(1e-9, p[i])) : 0), 0);
export const aliasesOf = (r: R16Row): string[] => Object.keys(r.packet.questions.action.criteria);
export const labelOf = (r: R16Row): number[] => aliasesOf(r).map(k => r.soft[k]);
const kindsOf = (r: R16Row): string[] => r.context.resourceKinds ?? [];

/** The mean of `values` over rows and its 95% interval, resampling animals (each animal's rows together). */
export function animalInterval(values: { animal: string; v: number }[], resamples: number = MARK.resamples, seed: number = MARK.seed): { mean: number; lo: number; hi: number; n: number; animals: number } {
  const by = new Map<string, number[]>();
  for (const x of values) (by.get(x.animal) ?? by.set(x.animal, []).get(x.animal)!).push(x.v);
  const units = [...by.values()], n = values.length, m = mean(values.map(x => x.v));
  if (units.length < 2) return { mean: m, lo: NaN, hi: NaN, n, animals: units.length };
  const rnd = seeded(`r16-bootstrap:${seed}`), out: number[] = [];
  for (let b = 0; b < resamples; b++) { let s = 0, k = 0; for (let j = 0; j < units.length; j++) { const u = units[Math.floor(rnd() * units.length)]; for (const v of u) { s += v; k++; } } out.push(s / k); }
  out.sort((a, b) => a - b);
  return { mean: m, lo: out[Math.floor(0.025 * resamples)], hi: out[Math.ceil(0.975 * resamples) - 1], n, animals: units.length };
}
export const exposed = (x: { n: number; animals: number }): boolean => x.n >= MARK.minRows && x.animals >= MARK.minAnimals;
const animalOf = (r: R16Row) => `${r.seed}:${r.chimpId}`;

// ---------------------------------------------------------------------------------------------------------------------
// Baselines (§5.4): uniform, the kind prior, the target position prior, from the training file
// ---------------------------------------------------------------------------------------------------------------------

export interface Priors { kind: Record<string, number>; position: Record<string, number[]>; positionByKind: Record<string, number[]> }
export function priors(train: R16Row[]): Priors {
  const kindSum: Record<string, number> = {}, kindN: Record<string, number> = {}, pos: Record<string, { s: number[]; n: number }> = {}, byKind: Record<string, { s: number[]; n: number[] }> = {};
  for (const r of train) {
    const q = labelOf(r);
    if (r.phase === 'kind') kindsOf(r).forEach((k, i) => { kindSum[k] = (kindSum[k] ?? 0) + q[i]; kindN[k] = (kindN[k] ?? 0) + 1; });
    else {
      const kind = kindsOf(r)[0], key = `${kind}:${q.length}`;
      const e = pos[key] ??= { s: new Array(q.length).fill(0), n: 0 }; q.forEach((v, i) => { e.s[i] += v; }); e.n++;
      const b = byKind[kind] ??= { s: new Array(8).fill(0), n: new Array(8).fill(0) }; q.forEach((v, i) => { b.s[i] += v; b.n[i]++; });
    }
  }
  const kind = Object.fromEntries(Object.keys(kindSum).map(k => [k, kindSum[k] / kindN[k]]));
  const position = Object.fromEntries(Object.entries(pos).filter(([, e]) => e.n >= MARK.minRows).map(([k, e]) => [k, e.s.map(v => v / e.n)]));
  const positionByKind = Object.fromEntries(Object.entries(byKind).map(([k, b]) => [k, b.s.map((v, i) => b.n[i] ? v / b.n[i] : 0)]));
  return { kind, position, positionByKind };
}
const norm = (v: number[]) => { const s = v.reduce((a, b) => a + b, 0); return s > 0 ? v.map(x => x / s) : v.map(() => 1 / v.length); };
export function baseline(r: R16Row, pr: Priors, which: 'uniform' | 'prior'): number[] {
  const n = aliasesOf(r).length;
  if (which === 'uniform') return new Array(n).fill(1 / n);
  if (r.phase === 'kind') return norm(kindsOf(r).map(k => pr.kind[k] ?? 0).map(v => v + 1e-6));
  const kind = kindsOf(r)[0], exact = pr.position[`${kind}:${n}`];
  return norm((exact ?? (pr.positionByKind[kind] ?? new Array(8).fill(1)).slice(0, n)).map(v => v + 1e-6));
}

// ---------------------------------------------------------------------------------------------------------------------
// Offline marks (§9)
// ---------------------------------------------------------------------------------------------------------------------

export type Scores = Map<string, number[] | null>;
/** Where the Nest entry of a kind row stands, -1 when it is not offered. */
const nestAt = (r: R16Row) => kindsOf(r).indexOf('nest');
export interface StratumRate { stratum: KindStratum; asks: number; animalNights: number; animalDays: number }
/** P1 (§5.4): a nest stratum where half or more of the rows have a nest-mate the rules count and the packet does not list is read on its other rows. */
export function partlyBeyond(rows: R16Row[]): Set<string> {
  const out = new Set<string>(), by = new Map<string, R16Row[]>();
  for (const r of rows) if (r.phase === 'kind' && r.r16.stratum && r.r16.words.nest) (by.get(r.r16.stratum) ?? by.set(r.r16.stratum, []).get(r.r16.stratum)!).push(r);
  for (const [s, rs] of by) if (rs.filter(r => (r.r16.company?.unseen ?? 0) > 0).length * 2 >= rs.length) out.add(s);
  return out;
}
const inStratum = (r: R16Row, s: KindStratum, beyond: Set<string>) => r.phase === 'kind' && r.r16.stratum === s && (!beyond.has(s) || (r.r16.company?.unseen ?? 0) === 0);

/** Divergence of `model` against a baseline (or another model) on rows: the paired mean difference over animals. */
export function divergenceVs(rows: R16Row[], model: (r: R16Row) => number[] | null, other: (r: R16Row) => number[] | null) {
  const v: { animal: string; v: number }[] = [];
  for (const r of rows) { const p = model(r), o = other(r); if (!p || !o) continue; const q = labelOf(r); v.push({ animal: animalOf(r), v: kl(q, p) - kl(q, o) }); }
  return animalInterval(v);
}
/**
 * A forecast in extra nest departures per 100 animal-nights (or extra minutes in a nest per animal-day): Σ over strata of
 * the upper end of (teacher − model) Nest mass (or model − teacher) × that stratum's asks per animal-night (per animal-day)
 * × 100 (× minutes). Amendment A2 of 17 October 2026 (docs/staging/r16-prereg.md §23): a stratum whose rows on the reading
 * set (after P1's restriction and the filter) are under the exposure floor is "thin": it is named and left out of the sum,
 * on the model and on the teacher's halves alike (thinness is read from the rows, never from the odds), and the forecast is
 * "not read" only when no stratum is read. Before it, one thin stratum made the whole forecast unread, which on the
 * teacher's halves turned the mark into a description.
 */
export function forecast(rows: R16Row[], strata: KindStratum[], rates: StratumRate[], model: (r: R16Row) => number[] | null, o: { sign: 1 | -1; per: 'night' | 'day'; scale: number; filter?: (r: R16Row) => boolean; beyond: Set<string>; teacher?: (r: R16Row) => number[] | null }) {
  const parts: { stratum: string; mean: number; hi: number; n: number; animals: number; rate: number; contribution: number; read: boolean; rows: number; rowAnimals: number }[] = [];
  let total = 0;
  for (const s of strata) {
    const v: { animal: string; v: number }[] = [], held = new Set<string>();
    let n = 0;
    for (const r of rows) {
      if (!inStratum(r, s, o.beyond) || (o.filter && !o.filter(r))) continue;
      const at = nestAt(r);
      if (at < 0) continue;
      n++; held.add(animalOf(r));
      const p = model(r), q = o.teacher ? o.teacher(r) : labelOf(r);
      if (!p || !q) continue;
      v.push({ animal: animalOf(r), v: o.sign * (q[at] - p[at]) });
    }
    const ci = animalInterval(v), rate = rates.find(x => x.stratum === s), per = rate ? (o.per === 'night' ? rate.asks / Math.max(1, rate.animalNights) : rate.asks / Math.max(1, rate.animalDays)) : 0;
    const thick = n >= MARK.minRows && held.size >= MARK.minAnimals, ok = thick && exposed(ci) && Number.isFinite(ci.hi);
    // a thick stratum whose odds are missing on too many rows is not read and is not left out: the forecast is then not read
    const c = ok ? Math.max(0, ci.hi) * per * o.scale : NaN;
    if (ok) total += c;
    parts.push({ stratum: s, mean: ci.mean, hi: ci.hi, n: ci.n, animals: ci.animals, rate: per, contribution: c, read: ok, rows: n, rowAnimals: held.size });
  }
  const thin = parts.filter(p => !(p.rows >= MARK.minRows && p.rowAnimals >= MARK.minAnimals)).map(p => p.stratum);
  const read = parts.some(p => p.read) && parts.every(p => p.read || thin.includes(p.stratum));
  return { total: read ? total : NaN, read, parts, thin };
}
/** Carrying on at the kind level: the mass on the kind of the act in progress, at kind rows where it has not finished and is offered. */
export function carryOn(rows: R16Row[], model: (r: R16Row) => number[] | null) {
  const m: number[] = [], t: number[] = [];
  for (const r of rows) { if (r.phase !== 'kind' || r.r16.carry.index < 0 || r.r16.carry.finished) continue; const p = model(r); if (!p) continue; m.push(p[r.r16.carry.index]); t.push(labelOf(r)[r.r16.carry.index]); }
  return { model: mean(m), teacher: mean(t), n: m.length };
}
/** Far mass at failing light on go-to-food target rows: model less teacher, over animals (P4 b). */
export function farMass(rows: R16Row[], model: (r: R16Row) => number[] | null, teacher: (r: R16Row) => number[] | null = labelOf) {
  const v: { animal: string; v: number }[] = [];
  for (const r of rows) {
    if (r.phase !== 'target' || r.r16.via !== 'FOOD-FALL' || kindsOf(r)[0] !== 'go_to_food' || !r.r16.dist) continue;
    const p = model(r), q = teacher(r); if (!p || !q) continue;
    const far = r.r16.dist.map(d => d >= MARK.farM);
    v.push({ animal: animalOf(r), v: p.reduce((s, x, i) => s + (far[i] ? x : 0), 0) - q.reduce((s, x, i) => s + (far[i] ? x : 0), 0) });
  }
  return animalInterval(v);
}

// ---------------------------------------------------------------------------------------------------------------------
// Arms (§7, §12): D from the eight re-draws, told or not, power and false alarms
// ---------------------------------------------------------------------------------------------------------------------

export interface ArmRead { arm: string; card: CardResult; r16?: { summary: Record<string, number | null>; result?: ReadoutResult }; deaths: { cause: string | null }[] }
export const RULES_REDRAWS = Array.from({ length: 8 }, (_, k) => `rules-${k + 1}`);
/** Every readout of one arm: the card's (nights in a nest, reserves, distance, trips, act changes, energy) and the new ones. */
export function armValues(a: ArmRead): Record<string, number | null> {
  const c = cardSummary([a.card]);
  return { nightsInNest: c.nightsInNest, reservePctPerDay: c.reservePctPerDay, kmFixPerDay: c.kmFixPerDay, tripsBegun: c.tripsBegun, tripsDone: c.tripsDone, actChanges: c.actChanges, kcalEatenPerDay: c.kcalEatenPerDay,
    starved: a.deaths.filter(d => d.cause === 'starvation').length, ...(a.r16?.summary ?? {}) };
}
export interface Yardstick { mean: number; sd: number; d: number; allowance: number }
/** The rules' mean, SD, D (2.51 SD of the eight re-draws) and the allowance (the larger of D and the readout's floor). */
export function yardstick(redraws: Record<string, number | null>[], key: string, floor: number): Yardstick {
  const v = redraws.map(r => r[key]).filter((x): x is number => x !== null && Number.isFinite(x)), s = sd(v), d = MARK.dFactor * s;
  return { mean: mean(v), sd: s, d, allowance: Math.max(d, floor) };
}
/** Told from the rules, and on which side (§12.4): outside the mean ± the allowance. */
export function told(value: number | null, y: Yardstick): 'above' | 'below' | '' {
  if (value === null || !Number.isFinite(value)) return '';
  return value > y.mean + y.allowance ? 'above' : value < y.mean - y.allowance ? 'below' : '';
}
/** The floor of a readout (§12.4; R13's 0.01 for the nights share). */
export const floorOf = (key: string): number => key === 'nightsInNest' ? MARK.v2Floor : READOUTS[key]?.floor ?? 0;
/** V1 to V3 of R13 §8.1 for one arm against the eight re-draws (V0 is the run's own stop check). */
export function viability(values: Record<string, number | null>, redraws: Record<string, number | null>[]): { v1: boolean; v2: boolean; v3: boolean; viable: boolean; floors: { v2: number; v3: number; v1: number } } {
  const maxStarved = Math.max(...redraws.map(r => r.starved ?? 0)), y2 = yardstick(redraws, 'nightsInNest', MARK.v2Floor), y3 = yardstick(redraws, 'reservePctPerDay', 0);
  const v1 = (values.starved ?? 0) <= maxStarved, v2 = (values.nightsInNest ?? -Infinity) >= y2.mean - y2.allowance, v3 = (values.reservePctPerDay ?? -Infinity) >= y3.mean - y3.d;
  return { v1, v2, v3, viable: v1 && v2 && v3, floors: { v1: maxStarved, v2: y2.mean - y2.allowance, v3: y3.mean - y3.d } };
}
/** The harmful side of a readout for a planted fault, for K5 (§7.2): upward for the morning and night readouts named "up", either side for those read on both. */
export const harmSide = (key: string): 'up' | 'both' | 'down' | '' => key === 'nightsInNest' || key === 'reservePctPerDay' ? 'down' : READOUTS[key]?.side ?? '';
export const toldHarm = (key: string, side: 'above' | 'below' | ''): boolean => { const h = harmSide(key); return h === 'up' ? side === 'above' : h === 'down' ? side === 'below' : h === 'both' ? side !== '' : false; };
