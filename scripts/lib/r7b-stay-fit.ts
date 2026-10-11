// Stage R7b, part three (docs/staging/r7b-prereg.md §3.2, §3.3): can state predict staying? The features a packet could
// carry, read from observe()'s context (the context packet 5 is written from), the designs of the three models, and
// their comparison on held-out animals. Pure. Nothing here reads the scheduled end of a bout, the age of the held
// intention, a score or rate of an option, or the rules' reason sentence.
import type { DecisionContext } from '../../src/types';
import { auc, clusterInterval, foldsByCluster, fitLogistic, logLoss, meanOf, mulberry32, outOfFold } from './r7b-stats';

/** Why the act in progress began: the packet's `asked` at the decision that began it (own.ts ownPercept), noted by the sampler. */
export const BEGAN = ['event', 'ended', 'felt', 'light', 'none', 'before'] as const;
export type Began = (typeof BEGAN)[number];
/** The class of a packet's `asked`: a perceived event, the previous act's own end, a drive in another word, the light, or none of these. */
export function askedClass(asked: NonNullable<DecisionContext['own']>['asked'] | undefined): Exclude<Began, 'before'> {
  if (!asked) return 'none';
  return asked.event !== undefined ? 'event' : asked.ended !== undefined ? 'ended' : asked.felt && asked.felt.length ? 'felt' : asked.light !== undefined ? 'light' : 'none';
}

/** The four groups of packet features (prereg §3.2 (c)) and their names, in a fixed order. */
export const GROUPS: Record<string, string[]> = {
  body: ['hunger', 'thirst', 'fatigue', 'loneliness', 'stress', 'reserves', 'deficit', 'needK', 'gutFill', 'hindFill', 'sleepPressure', 'sleepiness', 'waterDeficit', 'heatStored', 'heatDebt', 'light', 'lightTrend', 'rain', 'temperature'],
  companions: ['partySize', 'partyMales', 'nFeeding', 'nResting', 'nMoving', 'nGrooming', 'nOther', 'nLeaving', 'nToMe', 'nearestLog', 'partnerListed', 'partnerSame'],
  began: BEGAN.map(b => `began:${b}`),
  returns: ['eating', 'eatingKnown', 'tripsMean', 'tripsLast', 'tripsKnown', 'crowns', 'aggressionH', 'aggressionKnown'],
};
export const GROUP_WORDS: Record<string, string> = { body: 'body words', companions: 'what companions are doing', began: 'the reason the act began', returns: 'own foraging returns and timing' };
const MOVING = new Set(['travel', 'follow', 'patrol', 'flee', 'transfer']), RESTING = new Set(['rest', 'shelter', 'nest']);

/** The packet features of a moment, from the context observe() gives and the sampler's note of why the act began. Every name of GROUPS is present and finite. */
export function featuresOf(ctx: DecisionContext, began: Began): Record<string, number> {
  const f = ctx.focal, e = ctx.environment, b = ctx.body ?? {}, own = ctx.own ?? {}, n = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const out: Record<string, number> = {
    hunger: f.hunger, thirst: f.thirst, fatigue: 1 - f.energy, loneliness: 1 - f.social, stress: f.stress,
    reserves: n(b.reserves), deficit: n(b.deficit), needK: n(b.needKcal) / 1000, gutFill: n(b.gutFill), hindFill: n(b.hindFill), sleepPressure: n(b.sleepPressure), sleepiness: n(b.sleepiness),
    waterDeficit: n(b.waterDeficitPct), heatStored: Math.max(0, n(b.heat)), heatDebt: Math.max(0, -n(b.heat)),
    light: n(ctx.light?.level), lightTrend: n(ctx.light?.trend), rain: e.rain, temperature: e.temperature,
    partySize: e.partySize, partyMales: e.partyAdultMales,
    nFeeding: 0, nResting: 0, nMoving: 0, nGrooming: 0, nOther: 0, nLeaving: 0, nToMe: 0, nearestLog: Math.log1p(200), partnerListed: 0, partnerSame: 0,
  };
  let nearest = 200; // metres: no one listed reads as far away (the cap of the scale, not a behavioural number)
  const doing = own.doing, partner = doing?.who;
  for (const s of ctx.social) {
    if (s.action === 'forage') out.nFeeding++; else if (RESTING.has(s.action)) out.nResting++; else if (MOVING.has(s.action)) out.nMoving++; else if (s.action === 'groom') out.nGrooming++; else out.nOther++;
    if (s.away) out.nLeaving++;
    if (s.toMe) out.nToMe++;
    if (s.distance < nearest) nearest = s.distance;
    if (partner !== undefined && s.name === partner) { out.partnerListed = 1; if (s.action === f.currentAction) out.partnerSame = 1; }
  }
  out.nearestLog = Math.log1p(Math.max(0, nearest));
  for (const k of BEGAN) out[`began:${k}`] = began === k ? 1 : 0;
  const l = own.lately ?? {};
  out.eating = n(l.eating); out.eatingKnown = l.eating !== undefined ? 1 : 0;
  out.tripsMean = l.trips?.length ? meanOf(l.trips) : 0; out.tripsLast = l.trips?.length ? l.trips[l.trips.length - 1] : 0; out.tripsKnown = l.trips?.length ? 1 : 0;
  out.crowns = n(l.crowns);
  out.aggressionH = own.aggression ? Math.min(24, own.aggression.hours) : 24; out.aggressionKnown = own.aggression ? 1 : 0;
  return out;
}

/** A sampled moment (scripts/r7b-stay.ts): who, the act and its kind, the minutes in it, the two labels, why the act began, the packet features. */
export interface Moment { seed: number; tick: number; id: number; cls: string; age: number; action: string; targetId: number; kind: string; minutes: number; stay: 0 | 1; stayKind: 0 | 1; began: Began; f: Record<string, number> }

/** The label's tracker: a moment is "still in this act without a break" if at the end of each of the next `ticks` ticks the animal is alive in the same action and target; `stayKind` the same on the kind. */
export class StayTracker<T> {
  private open: { item: T; id: number; action: string; targetId: number; kind: string; left: number; stay: boolean; stayKind: boolean }[] = [];
  constructor(private ticks: number, private done: (item: T, stay: 0 | 1, stayKind: 0 | 1) => void) {}
  /** A moment enters at the end of its tick, with the animal's act then. */
  add(item: T, id: number, action: string, targetId: number, kind: string): void { this.open.push({ item, id, action, targetId, kind, left: this.ticks, stay: true, stayKind: true }); }
  /** The end of a later tick: `stateOf` gives an animal's act now, or null if it is dead. */
  step(stateOf: (id: number) => { action: string; targetId: number; kind: string } | null): void {
    const rest: typeof this.open = [];
    for (const o of this.open) {
      const s = stateOf(o.id);
      if (!s || s.action !== o.action || s.targetId !== o.targetId) o.stay = false;
      if (!s || s.kind !== o.kind) o.stayKind = false;
      if (--o.left === 0) this.done(o.item, o.stay ? 1 : 0, o.stayKind ? 1 : 0); else rest.push(o);
    }
    this.open = rest;
  }
  get pending(): number { return this.open.length; }
}

export const BANDS: [string, number, number][] = [['under 2 min', 0, 2], ['2 to 5 min', 2, 5], ['5 to 10 min', 5, 10], ['10 to 20 min', 10, 20], ['20 to 30 min', 20, 30], ['30 min or more', 30, Infinity]];
export const bandOf = (minutes: number) => BANDS.findIndex(([, lo, hi]) => minutes >= lo && minutes < hi);
export const POOL_UNDER = 20, CROSS_FROM = 100;

/** The kinds as the designs read them: a family with fewer than POOL_UNDER moments is pooled into "other". */
export function kindsOf(moments: Moment[]): { kindOf: (m: Moment) => string; kinds: string[]; crossed: string[] } {
  const count = new Map<string, number>();
  for (const m of moments) count.set(m.kind, (count.get(m.kind) ?? 0) + 1);
  const kindOf = (m: Moment) => ((count.get(m.kind) ?? 0) >= POOL_UNDER ? m.kind : 'other'), pooled = new Map<string, number>();
  for (const m of moments) pooled.set(kindOf(m), (pooled.get(kindOf(m)) ?? 0) + 1);
  const kinds = [...pooled.keys()].sort();
  return { kindOf, kinds, crossed: kinds.filter(k => pooled.get(k)! >= CROSS_FROM) };
}

/**
 * The design of a model (prereg §3.2): 'a' the kind of act; 'b' adds the minutes in it (log(1 + minutes), the bands,
 * and the bands crossed with every kind of at least CROSS_FROM moments); then the packet groups named in `groups`.
 */
export function design(moments: Moment[], model: 'a' | 'b', groups: string[] = []): { X: number[][]; names: string[] } {
  const { kindOf, kinds, crossed } = kindsOf(moments), names: string[] = kinds.map(k => `kind:${k}`);
  if (model === 'b') { names.push('log(1 + minutes)', ...BANDS.map(([b]) => `band:${b}`)); for (const k of crossed) for (const [b] of BANDS) names.push(`kind:${k} × band:${b}`); }
  const feats = groups.flatMap(g => { if (!GROUPS[g]) throw new Error(`unknown group ${g}`); return GROUPS[g]; });
  names.push(...feats);
  const X = moments.map(m => {
    const row: number[] = kinds.map(k => (kindOf(m) === k ? 1 : 0));
    if (model === 'b') { const band = bandOf(m.minutes); row.push(Math.log1p(m.minutes), ...BANDS.map((_, i) => (i === band ? 1 : 0))); for (const k of crossed) for (let i = 0; i < BANDS.length; i++) row.push(kindOf(m) === k && i === band ? 1 : 0); }
    for (const name of feats) { const v = m.f[name]; if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`moment ${m.seed}:${m.tick}:${m.id} has no feature ${name}`); row.push(v); }
    return row;
  });
  return { X, names };
}

export interface ModelScore { id: string; words: string; features: number; logLoss: number; auc: number }
export interface Difference { from: string; to: string; /** log-loss of `from` minus log-loss of `to` (positive: `to` predicts better), with a 95% interval over animals. */ logLoss: number; ci: [number, number]; aucGain: number; aucCi: [number, number]; beyondNoise: boolean }
export interface StayFit {
  label: 'stay' | 'stayKind'; moments: number; animals: number; staying: number; lambda: number; folds: number;
  models: ModelScore[]; differences: Difference[];
  /** (c) beats (b): the interval of [log-loss of (b) − log-loss of (c)] lies wholly above 0 (prereg §3.3). */ cBeatsB: boolean;
  /** What (c) adds over (b) as a share of what (b) gains over the base rate. */ shareOfB: number | null;
}

/**
 * The comparison on held-out animals for one label: every moment predicted by a model that never saw its animal.
 * `heldOut` 'seed' (a check added after the registered result; description): one fold per seed instead, so every moment
 * is predicted by a model fitted on another world.
 */
export function evaluate(moments: Moment[], label: 'stay' | 'stayKind' = 'stay', lambda = 1, resamples = 2000, k = 5, heldOut: 'animal' | 'seed' = 'animal'): StayFit {
  const y = moments.map(m => m[label] as number), animal = moments.map(m => `${m.seed}:${m.id}`);
  // the animals in the order of a hash of seed and id (the sampler's own hash is by tick too; this one must not be): a fixed, label-free deal
  const order = [...new Set(animal)].sort((a, b) => hashOf(a) - hashOf(b) || (a < b ? -1 : 1)), seedsIn = [...new Set(moments.map(m => m.seed))].sort((a, b) => a - b);
  if (heldOut === 'seed') k = seedsIn.length;
  const fold = heldOut === 'seed' ? moments.map(m => seedsIn.indexOf(m.seed)) : foldsByCluster(animal, order, k);
  const preds: Record<string, number[]> = {}, models: ModelScore[] = [];
  const add = (id: string, words: string, features: number, p: number[]) => { preds[id] = p; models.push({ id, words, features, logLoss: logLoss(p, y), auc: auc(p, y) }); };
  // the base rate: the share staying among the other folds' moments
  add('base', 'the base rate alone', 0, y.map((_, i) => { let s = 0, n = 0; for (let j = 0; j < y.length; j++) if (fold[j] !== fold[i]) { s += y[j]; n++; } return n ? s / n : 0.5; }));
  const fit = (id: string, words: string, model: 'a' | 'b', groups: string[]) => { const d = design(moments, model, groups); add(id, words, d.names.length, outOfFold(d.X, y, fold, lambda)); };
  fit('a', '(a) the kind of act', 'a', []);
  fit('b', '(b) the kind and the minutes already in it', 'b', []);
  fit('c', '(c) those and the packet features', 'b', Object.keys(GROUPS));
  for (const g of Object.keys(GROUPS)) fit(`b+${g}`, `(b) and ${GROUP_WORDS[g]}`, 'b', [g]);
  const rng = mulberry32(20261011);
  const diff = (from: string, to: string): Difference => {
    const ll = (idx?: number[]) => logLoss(preds[from], y, idx) - logLoss(preds[to], y, idx), au = (idx?: number[]) => auc(preds[to], y, idx) - auc(preds[from], y, idx);
    const ci = clusterInterval(animal, rng, ll, resamples), aucCi = clusterInterval(animal, rng, au, resamples);
    return { from, to, logLoss: ll(), ci, aucGain: au(), aucCi, beyondNoise: ci[0] > 0 };
  };
  const differences = [diff('base', 'a'), diff('a', 'b'), diff('b', 'c'), ...Object.keys(GROUPS).map(g => diff('b', `b+${g}`))];
  const bc = differences.find(d => d.from === 'b' && d.to === 'c')!, gainB = models[0].logLoss - models.find(m => m.id === 'b')!.logLoss;
  return { label, moments: moments.length, animals: order.length, staying: meanOf(y), lambda, folds: k, models, differences, cBeatsB: bc.beyondNoise, shareOfB: gainB > 0 ? bc.logLoss / gainB : null };
}
/** A small string hash (FNV-1a) for the deal of animals into folds. */
function hashOf(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** The weights of model (c) fitted on every moment, on standardised features, largest first: which features carry what there is (description). */
export function weightsOf(moments: Moment[], label: 'stay' | 'stayKind' = 'stay', lambda = 1): { name: string; weight: number; group: string }[] {
  const d = design(moments, 'b', Object.keys(GROUPS)), m = fitLogistic(d.X, moments.map(q => q[label] as number), lambda);
  const groupOf = (name: string) => Object.keys(GROUPS).find(g => GROUPS[g].includes(name)) ?? (name.startsWith('kind:') && !name.includes('×') ? 'kind' : 'minutes');
  return d.names.map((name, j) => ({ name, weight: m.w[j], group: groupOf(name) })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}
