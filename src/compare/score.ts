// Similarity verdicts for the real-vs-simulated ranging scorecard. The rules are fixed here, before any comparison is
// run, and calibrated by the real data's own variation (not by a p-value, which is always tiny with thousands of fixes):
//
//  scalar statistic   real = median over individual-years (or study-years); tolerance = the range of the real annual
//                     medians; sim = median of per-seed medians, spread = min–max over seeds.
//                     similar      the sim median lies inside the real annual range
//                     different    no seed lies inside the real annual range (the seed range misses it entirely)
//                     inconclusive otherwise
//  distribution       distance = two-sample KS D between pooled real and pooled sim values; baseline = D between each
//                     real year and all other real years (leave-one-year-out).
//                     similar      D ≤ the largest real leave-one-year-out D
//                     different    D > 2 × that
//                     inconclusive otherwise
//  normalized shape   distance = 1 − BA between the mean normalized UDs; baseline = 1 − BA between each real year's
//                     mean map and the other years' mean map; same thresholds as distributions.
//  Fewer than 5 seeds: every verdict is reported as inconclusive (the brief asks for ≥ 5).

export type Verdict = 'similar' | 'different' | 'inconclusive' | 'not comparable';
export const MIN_SEEDS = 5;

export function scalarVerdict(realAnnual: number[], simSeeds: number[], simMedian: number): Verdict {
  const r = realAnnual.filter(Number.isFinite), s = simSeeds.filter(Number.isFinite);
  if (!r.length || !s.length) return 'not comparable';
  const lo = Math.min(...r), hi = Math.max(...r);
  let v: Verdict = 'inconclusive';
  if (simMedian >= lo && simMedian <= hi) v = 'similar';
  else if (Math.max(...s) < lo || Math.min(...s) > hi) v = 'different';
  return s.length < MIN_SEEDS ? 'inconclusive' : v;
}

export function distanceVerdict(dSim: number, baseline: number[], seeds: number): Verdict {
  const b = baseline.filter(Number.isFinite);
  if (!Number.isFinite(dSim) || !b.length) return 'not comparable';
  const tol = Math.max(...b);
  const v: Verdict = dSim <= tol ? 'similar' : dSim > 2 * tol ? 'different' : 'inconclusive';
  return seeds < MIN_SEEDS ? 'inconclusive' : v;
}
