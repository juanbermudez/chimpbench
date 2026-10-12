// Stage R14, a reading (docs/staging/r14-diag-decode.md): decode transforms between the top pick and a plain draw, as
// arithmetic on odds already on file. A transform takes the probabilities p a kernel gave over one menu and returns the
// distribution p' a single seeded draw would then be taken from (src/kernel/decode.ts drawAt with the same uniform draw).
// Nothing here is used by a run: no file under src, server or training imports it, and nothing here is a setting of the
// loop. The grids below were fixed before any number was read and are the whole family; they are a description, not a
// proposal (stage R9 registered a decode with no temperature, offset or threshold: docs/staging/r9-prereg.md §1).
//
//   top          1 on the first maximum of p (the top pick)
//   draw         p as it is (a plain draw; temperature 1)
//   temperature  p_i ^ (1 / T), renormalised; T below 1 sharpens
//   nucleus      the fewest top options whose probabilities sum to P or more, renormalised; the others 0
//   threshold    the top pick when its probability is tau or more, else p as it is
//   floor        options under f dropped (the top option always stays), renormalised
// Pure.

export type Family = 'top' | 'draw' | 'temperature' | 'nucleus' | 'threshold' | 'floor';
export interface Transform { id: string; family: Family; param: number | null; apply: (p: number[]) => number[] }

/** The grids, fixed in advance. Temperature 1 is the plain draw and is not repeated. */
export const TEMPERATURES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const NUCLEI = [0.7, 0.8, 0.9, 0.95] as const;
export const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99] as const;
export const FLOORS = [0.02, 0.05, 0.1, 0.2] as const;
/** A finer temperature grid, on both sides of 1, used only to describe calibration (which temperature fits the rules' odds best). */
export const FIT_TEMPERATURES: number[] = Array.from({ length: 35 }, (_, i) => +(0.3 + 0.05 * i).toFixed(2));

/** The first maximum (src/kernel/decode.ts topIndex; scripts/lib/soft-labels.ts argmax). */
export function first(p: number[]): number { let b = 0; for (let i = 1; i < p.length; i++) if (p[i] > p[b]) b = i; return b; }
/** p scaled to sum to 1 (a score file's row sums to 1 within rounding; a receipt's exactly). */
export function unit(p: number[]): number[] { let s = 0; for (const v of p) s += v; return s > 0 ? p.map(v => v / s) : p.map(() => 1 / p.length); }

export function topPick(p: number[]): number[] { const b = first(p); return p.map((_, i) => +(i === b)); }
export function temperature(p: number[], T: number): number[] {
  if (!(T > 0)) throw new Error('a temperature must be above 0');
  const b = first(p), top = p[b];
  // in logarithms against the top option, so a small T cannot underflow to 0 / 0
  return unit(p.map(v => (v > 0 ? Math.exp((Math.log(v) - Math.log(top)) / T) : 0)));
}
export function nucleus(p: number[], mass: number): number[] {
  const q = unit(p), order = q.map((_, i) => i).sort((a, c) => q[c] - q[a] || a - c), keep = new Array<boolean>(q.length).fill(false);
  let sum = 0;
  for (const i of order) { keep[i] = true; sum += q[i]; if (sum >= mass - 1e-12) break; }
  return unit(q.map((v, i) => (keep[i] ? v : 0)));
}
export function threshold(p: number[], tau: number): number[] { const q = unit(p); return q[first(q)] >= tau ? topPick(q) : q; }
export function floorDrop(p: number[], f: number): number[] { const q = unit(p), b = first(q); return unit(q.map((v, i) => (i === b || v >= f ? v : 0))); }

export const TOP: Transform = { id: 'top pick', family: 'top', param: null, apply: topPick };
export const DRAW: Transform = { id: 'plain draw', family: 'draw', param: null, apply: unit };
/** The whole family, in the order the tables print it. */
export const TRANSFORMS: Transform[] = [
  TOP, DRAW,
  ...TEMPERATURES.map(T => ({ id: `temperature ${T}`, family: 'temperature' as const, param: T, apply: (p: number[]) => temperature(p, T) })),
  ...NUCLEI.map(m => ({ id: `nucleus ${m}`, family: 'nucleus' as const, param: m, apply: (p: number[]) => nucleus(p, m) })),
  ...THRESHOLDS.map(t => ({ id: `top when ${t} or more, else draw`, family: 'threshold' as const, param: t, apply: (p: number[]) => threshold(p, t) })),
  ...FLOORS.map(f => ({ id: `floor ${f}`, family: 'floor' as const, param: f, apply: (p: number[]) => floorDrop(p, f) })),
];

/** The floor the project's cross-entropy puts under a probability (scripts/lib/soft-labels.ts crossEntropy; the trainer's development loss). */
export const P_FLOOR = 1e-9;
/** KL(q || p) in nats with p floored at P_FLOOR: the published "divergence from the rules" of one ask (cross-entropy less the label's entropy). */
export function divergence(q: number[], p: number[]): number { let s = 0; for (let i = 0; i < q.length; i++) if (q[i] > 0) s += q[i] * Math.log(q[i] / Math.max(P_FLOOR, p[i])); return s; }
/** Total variation distance: half the summed absolute difference (0 to 1; bounded where a transform gives an option the rules take probability 0). */
export function totalVariation(q: number[], p: number[]): number { let s = 0; for (let i = 0; i < q.length; i++) s += Math.abs(q[i] - p[i]); return s / 2; }
/** The label's mass on options the transform can never take. */
export function massOnDropped(q: number[], p: number[]): number { let s = 0; for (let i = 0; i < q.length; i++) if (!(p[i] > 0)) s += q[i]; return s; }
export const mean = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
/** Area under the curve of a score for a 0/1 outcome (ties count a half); NaN when one class is empty (scripts/r11-offline.ts auc). */
export function auc(score: number[], y: number[]): number {
  const idx = score.map((_, i) => i).sort((a, b) => score[a] - score[b]);
  let pos = 0, neg = 0, rankSum = 0;
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && score[idx[j]] === score[idx[i]]) j++; const r = (i + j + 1) / 2; for (let k = i; k < j; k++) if (y[idx[k]]) { rankSum += r; pos++; } else neg++; i = j; }
  return pos && neg ? (rankSum - pos * (pos + 1) / 2) / (pos * neg) : NaN;
}

/** The kinds of option the tables print, from an option's family (scripts/em-sample.ts familyOf). */
export const KINDS = ['trip to food', 'feed here', 'drink', 'nest', 'rest', 'social', 'aggression', 'other'] as const;
export type Kind = (typeof KINDS)[number];
export function kindOf(family: string): Kind {
  if (family === 'food-trip') return 'trip to food';
  if (family === 'feed') return 'feed here';
  if (family === 'drink') return 'drink';
  if (family === 'nest') return 'nest';
  if (family === 'rest') return 'rest';
  if (family === 'affiliative' || family === 'greet' || family === 'social-move' || family === 'mating' || family === 'care' || family === 'call') return 'social';
  if (family === 'aggression') return 'aggression';
  return 'other';
}
/** The hour of day of a world time (src/types: world.time is hours since 06:30). */
export const hourOf = (time: number): number => (((time + 6.5) % 24) + 24) % 24;
