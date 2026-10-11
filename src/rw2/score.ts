import { mulberry32 } from '../compare/sampling';
import type { RecordScore } from '../rw/score';
import type { CompromisedList } from '../rw/manifest';

// Stage RW2 (docs/staging/rw2-prereg.md §2.6 and §3.3): scores with the individual as the unit. Two means of one
// per-record value: pooled over records, and with each individual weighted equally (the mean of the individuals' own
// means); each with a 95% percentile interval from one bootstrap over individuals (the same draws for both).

const r3 = (v: number) => Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
const quant = (a: number[], q: number) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), p = (s.length - 1) * q, lo = Math.floor(p); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (p - lo); };
export interface Mean { value: number | null; ci: (number | null)[] }
export interface IndividualStat { records: number; individuals: number; pooled: Mean; equal: Mean }

export function individualStat(scores: RecordScore[], f: (s: RecordScore) => number | null, reps = 2000, seed = 20261011): IndividualStat {
  const by = new Map<string, number[]>();
  let records = 0;
  for (const s of scores) { const v = f(s); if (v === null) continue; records++; (by.get(s.focal) ?? by.set(s.focal, []).get(s.focal)!).push(v); }
  const groups = [...by.values()].map(v => ({ sum: v.reduce((a, b) => a + b, 0), n: v.length })), g = groups.length;
  const pooled = (ix: number[]) => { let v = 0, n = 0; for (const i of ix) { v += groups[i].sum; n += groups[i].n; } return v / n; };
  const equal = (ix: number[]) => ix.reduce((a, i) => a + groups[i].sum / groups[i].n, 0) / ix.length;
  const all = groups.map((_, i) => i), rng = mulberry32(seed), bp: number[] = [], be: number[] = [];
  for (let k = 0; k < reps && g > 0; k++) { const ix = all.map(() => Math.floor(rng() * g)); bp.push(pooled(ix)); be.push(equal(ix)); }
  const mean = (v: number, b: number[]): Mean => ({ value: g ? r3(v) : null, ci: g > 1 ? [r3(quant(b, 0.025)), r3(quant(b, 0.975))] : [null, null] });
  return { records, individuals: g, pooled: mean(g ? pooled(all) : NaN, bp), equal: mean(g ? equal(all) : NaN, be) };
}

/** The registered readouts of one run on one set of records: the score, chance, and the score minus chance record by record. */
export function summarize2(scores: RecordScore[], reps = 2000, seed = 20261011) {
  return { records: scores.length, individuals: new Set(scores.map(s => s.focal)).size, refused: scores.filter(s => s.refused).length,
    top1: individualStat(scores, s => s.hit, reps, seed), top1Ties: individualStat(scores, s => s.tieHit, reps, seed), chance: individualStat(scores, s => s.chance, reps, seed),
    tiesMinusChance: individualStat(scores, s => s.tieHit - s.chance, reps, seed), top1MinusChance: individualStat(scores, s => s.hit - s.chance, reps, seed),
    mrr: individualStat(scores, s => s.rr, reps, seed) };
}
export type Summary2 = ReturnType<typeof summarize2>;

/** Seconds one kernel call takes at a packet length (the measurement of 10 October: 0.44 s at 467 tokens, growing as about tokens^1.5). */
export const secondsAt = (tokens: number) => 0.44 * (tokens / 467) ** 1.5;

/**
 * The lists of data/rw-compromised.json: its first entry (stage RW, at the top level) and any further label sources
 * under `sources` (the layout stage RW2 proposes). Each is applied with src/rw/manifest.ts compromisedFor.
 */
export function compromisedLists(json: unknown): (CompromisedList & { flagged?: { id: string; overlap: string }[] })[] {
  const ok = (x: unknown): x is CompromisedList => typeof x === 'object' && x !== null && typeof (x as CompromisedList).labelSource === 'string' && Array.isArray((x as CompromisedList).targets);
  const top = json as { sources?: unknown };
  return [...(ok(json) ? [json] : []), ...(Array.isArray(top?.sources) ? top.sources.filter(ok) : [])];
}
