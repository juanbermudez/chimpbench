import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { abcDistance, acceptClosest, fromUnit, frozenFactors, implausibility, knobOf, ks2, localLinearAdjust, morrisSummary, normCdf, normInv, planStats, quantile, ruledOut, ruledOutLazy, sobol, toUnit, type RegistryEntry, type Stat } from '../scripts/lib/calib';
import { C11_RULES, SEED_SETS, SMOKE_SEEDS, assertSeeds } from '../scripts/lib/c11-plan';
import { elementaryEffects, lhs, maximinLhs, maximinSubset, minDist, morrisDesign, rng } from '../scripts/lib/design';
import { fitGp, gpMean, gpPredict, looDiagnostic } from '../scripts/lib/gp';
import { abc, confirm, historyMatch, inRegion, sobolAll, type Evaluate, type HmStat } from '../scripts/lib/hm';
import type { TargetFile } from '../src/field/targets';

// Stage C11 calibration library (docs/realism-design.md "C11 pre-registration"): every step checked on toy functions
// with known answers, so its correctness does not rest on a simulation run.

test('Latin hypercube: one point per stratum in every dimension; maximin spreads points', () => {
  const X = lhs(20, 3, rng(1));
  for (let j = 0; j < 3; j++) assert.deepEqual(X.map(x => Math.floor(x[j] * 20)).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i));
  const best = maximinLhs(20, 3, rng(1), 30), one = lhs(20, 3, rng(1));
  assert.ok(minDist(best) >= minDist(one));
  const C = [[0, 0], [0.01, 0], [1, 1], [0.5, 0.5], [0.99, 1]];
  const pick = maximinSubset(C, 3).map(i => C[i]);
  assert.ok(pick.some(p => p[0] < 0.1) && pick.some(p => p[0] > 0.9) && pick.some(p => p[0] === 0.5));
});

test('Morris: grid trajectories, exact elementary effects of a linear function, and the freezing rule', () => {
  const k = 5, p = 4, T = morrisDesign(k, p, 8, 60, rng(3));
  assert.equal(T.length, 8);
  for (const t of T) {
    assert.equal(t.points.length, k + 1);
    for (const x of t.points) for (const v of x) assert.ok([0, 1 / 3, 2 / 3, 1].some(g => Math.abs(g - v) < 1e-12), `off grid: ${v}`);
    for (let s = 0; s < k; s++) {
      const changed = t.points[s].map((v, j) => (Math.abs(v - t.points[s + 1][j]) > 1e-12 ? j : -1)).filter(j => j >= 0);
      assert.deepEqual(changed, [t.order[s]]);
      assert.ok(Math.abs(Math.abs(t.points[s + 1][t.order[s]] - t.points[s][t.order[s]]) - 2 / 3) < 1e-12);
    }
  }
  const a = [3, -2, 0.5, 0, 1];
  const ee = elementaryEffects(T, T.map(t => t.points.map(x => x.reduce((s, v, j) => s + a[j] * v, 0))), p);
  ee.forEach((e, j) => e.forEach(v => assert.ok(Math.abs(v - a[j]) < 1e-9)));
  const sums = ee.map(e => morrisSummary(e, 200));
  assert.deepEqual(sums.map(s => +s.muStar.toFixed(9)), a.map(Math.abs));
  assert.ok(sums[1].ci[0] <= 2 && sums[1].ci[1] >= 2);
  // factor 3 has no effect on either statistic; factor 2 matters on the second statistic only
  assert.deepEqual(frozenFactors([[3, 2, 0.01, 0, 1], [0.1, 0.1, 5, 0, 0.1]], 0.05), [false, false, false, true, false]);
});

test('GP emulator interpolates a known function, finds the inactive input and passes its LOO diagnostic', () => {
  const f = (x: number[]) => Math.sin(2 * Math.PI * x[0]) + 0.5 * x[1];
  const X = maximinLhs(45, 3, rng(5), 10), y = X.map(f);
  const g = fitGp(X, y, { nugget: 1e-6, iters: 200 });
  const test = lhs(200, 3, rng(9));
  const rmse = Math.sqrt(test.reduce((s, x) => s + (gpMean(g, x) - f(x)) ** 2, 0) / test.length);
  assert.ok(rmse < 0.05, `rmse ${rmse}`);
  assert.ok(g.ls[2] > 3 * g.ls[0], `inactive input length scale ${g.ls[2]} vs ${g.ls[0]}`);
  assert.ok(gpPredict(g, X[0]).var < 1e-3);
  assert.ok(Math.abs(gpPredict(g, test[0]).mean - gpMean(g, test[0])) < 1e-9);
  assert.ok(looDiagnostic(g).pass, `LOO within ${looDiagnostic(g).within}`);
  // with noise and the matching nugget, 95% intervals of the latent mean cover the truth about as often as they should
  const r = rng(11), gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
  const Xn = maximinLhs(80, 2, rng(12), 10), fn = (x: number[]) => 2 * x[0] - x[1] * x[1];
  const gn = fitGp(Xn, Xn.map(x => fn(x) + 0.05 * gauss()), { nugget: 0.0025, iters: 150 });
  const cover = lhs(300, 2, rng(13)).filter(x => { const p = gpPredict(gn, x); return Math.abs(p.mean - fn(x)) <= 1.96 * Math.sqrt(p.var); }).length / 300;
  assert.ok(cover > 0.8, `coverage ${cover}`);
});

test('implausibility, the wave cuts and the lazy test match hand calculations', () => {
  const s: Stat = { key: 'x', id: 'x', lo: 6, hi: 14, z: 10, varObs: 4, varDisc: 4, encoded: false };
  assert.equal(implausibility(s, { mean: 13, var: 1 }), 1);
  assert.ok(Math.abs(implausibility(s, { mean: 1, var: 0 }) - 9 / Math.sqrt(8)) < 1e-12);
  assert.equal(ruledOut([1, 3.1], { max: 3 }), true);
  assert.equal(ruledOut([2.9, 2.6, 1], { max: 3 }), false);
  assert.equal(ruledOut([2.9, 2.6, 1], { max: 3, second: 2.5, third: 2 }), true);
  assert.equal(ruledOut([2.9, 2.4, 2.1], { max: 3, second: 2.5, third: 2 }), true);
  assert.equal(ruledOut([2.9, 2.4, 1.9], { max: 3, second: 2.5, third: 2 }), false);
  const r = rng(21);
  for (let t = 0; t < 500; t++) {
    const I = Array.from({ length: 6 }, () => r() * 4), B = I.map(v => v * (1 + r()));
    for (const cut of [{ max: 3 }, { max: 3, second: 2.5, third: 2 }]) assert.equal(ruledOutLazy(6, cut, i => B[i], i => I[i]), ruledOut(I, cut));
  }
  assert.equal(abcDistance([1, 5], [0, 3], [1, 4]), 2);
  assert.deepEqual(acceptClosest([5, 1, 3, 0.5], 0.5), [3, 1]);
});

test('ABC with local-linear adjustment recovers a known parameter; KS and Sobol match known values', () => {
  // s = 4θ₀ + θ₁, s₂ = θ₁: the observed (2.3, 0.3) sits at θ = (0.5, 0.3)
  const r = rng(31), U = Array.from({ length: 100000 }, () => [r(), r()]);
  const S = U.map(u => [4 * u[0] + u[1], u[1]]), z = [2.3, 0.3], s2 = [0.04, 0.04];
  const d = S.map(s => abcDistance(s, z, s2)), acc = acceptClosest(d, 0.01);
  const A = acc.map(i => U[i]), Sa = acc.map(i => S[i].map((v, j) => (v - z[j]) / Math.sqrt(s2[j])));
  const adj = localLinearAdjust(A, Sa, [0, 0], acc.map(i => d[i]));
  const sd = (v: number[]) => Math.sqrt(v.reduce((a, b) => a + (b - quantile(v, 0.5)) ** 2, 0) / v.length);
  for (const [j, want] of [[0, 0.5], [1, 0.3]] as const) {
    assert.ok(Math.abs(quantile(adj.map(u => u[j]), 0.5) - want) < 0.01, `θ${j} median ${quantile(adj.map(u => u[j]), 0.5)}`);
    assert.ok(sd(adj.map(u => u[j])) < sd(A.map(u => u[j])), 'adjustment tightens the sample');
  }
  const same = ks2([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  assert.equal(same.D, 0); assert.equal(same.p, 1);
  assert.equal(ks2([1, 2, 3, 4], [5, 6, 7, 8]).D, 1);
  assert.ok(Math.abs(ks2([1, 2, 3, 4], [2.5, 3.5, 4.5, 5.5]).D - 0.5) < 1e-12);
  const g = rng(41), n1 = Array.from({ length: 300 }, () => normInv(g())), n2 = Array.from({ length: 300 }, () => normInv(g())), n3 = n2.map(v => v + 0.5);
  assert.ok(ks2(n1, n2).p > 0.05); assert.ok(ks2(n1, n3).p < 1e-4);
  // Ishigami (a = 7, b = 0.1): S = (0.314, 0.442, 0), ST = (0.558, 0.442, 0.244)
  const ish = (x: number[]) => { const [a, b, c] = x.map(v => Math.PI * (2 * v - 1)); return Math.sin(a) + 7 * Math.sin(b) ** 2 + 0.1 * c ** 4 * Math.sin(a); };
  const si = sobol(ish, 3, 40000, rng(51));
  [0.3139, 0.4424, 0].forEach((v, i) => assert.ok(Math.abs(si.S1[i] - v) < 0.03, `S${i + 1} ${si.S1[i]}`));
  [0.5576, 0.4424, 0.2437].forEach((v, i) => assert.ok(Math.abs(si.ST[i] - v) < 0.03, `ST${i + 1} ${si.ST[i]}`));
});

test('priors: quantile maps invert for uniform, loguniform and truncated normal entries', () => {
  assert.ok(Math.abs(normCdf(1.959964) - 0.975) < 1e-6); assert.ok(Math.abs(normInv(0.975) - 1.959964) < 1e-5);
  const base = { value: 1, hardRange: [0, 1e6] as [number, number], rangeBasis: 'assumed-x2', calibrate: true };
  const ks = [
    knobOf({ ...base, id: 'u', range: [2, 6], prior: { dist: 'uniform' } } as RegistryEntry),
    knobOf({ ...base, id: 'l', range: [0.002, 0.008], prior: { dist: 'loguniform', lo: 0.0005, hi: 0.05 } } as RegistryEntry),
    knobOf({ ...base, id: 'n', range: [0.138, 0.187], prior: { dist: 'normal', mean: 0.1625, sd: 0.02 } } as RegistryEntry),
    knobOf({ ...base, id: 'p', range: [40, 90], profiles: { compressed: 9, field: 50 } } as RegistryEntry),
  ];
  assert.equal(ks[3].def, 50);
  assert.ok(Math.abs(fromUnit(ks[1], 0.5) - Math.sqrt(0.0005 * 0.05)) < 1e-12);
  assert.ok(Math.abs(fromUnit(ks[2], 0.5) - 0.1625) < 1e-6);
  for (const k of ks) for (const u of [0, 0.1, 0.5, 0.9, 1]) { const v = fromUnit(k, u); assert.ok(v >= k.lo - 1e-12 && v <= k.hi + 1e-12); assert.ok(Math.abs(toUnit(k, v) - u) < 1e-6, `${k.id} ${u}`); }
});

test('fitted statistics follow the pre-registration: exclusions, midpoints, band variances and discrepancies', () => {
  const T = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const b = planStats(T.targets, C11_RULES, 'behavior'), keys = b.stats.map(s => s.key);
  for (const gone of ['T-RNG-4', 'T-FOOD-1', 'T-COM-5', 'T-IGE-4', 'T-SOC-8', 'T-DEM-1']) assert.ok(!keys.some(k => k.startsWith(gone + '.') || k === gone), gone);
  assert.ok(keys.includes('T-ACT-1.male') && keys.includes('T-ACT-1.female') && keys.includes('T-COM-11'));
  assert.ok(T.targets.filter(t => t.role === 'held-out').every(t => !keys.some(k => k.split('.')[0] === t.id)), 'no held-out row enters');
  const a4 = b.stats.find(s => s.key === 'T-ACT-4')!;
  assert.ok(Math.abs(a4.z - 0.385) < 1e-12 && Math.abs(a4.varObs - (0.17 / 4) ** 2) < 1e-12 && Math.abs(a4.varDisc - 0.1 * 0.385 ** 2) < 1e-12);
  const h1 = b.stats.find(s => s.key === 'T-HUN-1')!;
  assert.ok(Math.abs(h1.varDisc - 0.25 * 15 * 15) < 1e-9);
  const dem = planStats(T.targets, C11_RULES, 'demography');
  assert.ok(dem.stats.some(s => s.key === 'T-DEM-2.female') && dem.stats.every(s => s.id.startsWith('T-DEM')));
});

test('seed sets: pre-registered values, disjoint from each other and from every earlier set; steps take only their own', () => {
  assert.deepEqual(SEED_SETS.C, Array.from({ length: 20 }, (_, i) => 7001 + i));
  assert.deepEqual(SEED_SETS.V1, [8101, 8202, 8303, 8404, 8505]);
  assert.deepEqual(SEED_SETS.V2, [8606, 8707, 8808, 8909, 9010]);
  assert.deepEqual(SEED_SETS.V3, [9101, 9202, 9303, 9404, 9505]);
  const all = [...SEED_SETS.C, ...SEED_SETS.V1, ...SEED_SETS.V2, ...SEED_SETS.V3, ...SMOKE_SEEDS];
  assert.equal(new Set(all).size, all.length);
  const earlier = (s: number) => [48, 7, 21, 5, 11].includes(s) || (s >= 101 && s <= 505) || (s >= 606 && s <= 1010) || (s >= 1111 && s <= 2525) || (s >= 5101 && s <= 5505);
  assert.ok(all.every(s => !earlier(s)));
  assert.doesNotThrow(() => assertSeeds('hm', [7001, 7002, 7003, 7004, 7005], false));
  assert.throws(() => assertSeeds('hm', [7001, 7002, 7003, 7004, 7006], false));
  assert.throws(() => assertSeeds('validate', [7001], false));
  assert.throws(() => assertSeeds('hm', [9901], false));
  assert.throws(() => assertSeeds('hm', [7001], true), /smoke/);
});

test('history matching, emulator ABC and the direct confirmation recover a known point of a toy simulator', async () => {
  // two statistics of a 2-parameter toy with seed noise; the targets sit at θ* = (0.3, 0.7)
  const f = (u: number[]) => [3 * u[0] + u[1], 4 * u[0] * u[1] + 0.5 * u[1]], star = [0.3, 0.7], zs = f(star);
  const noise = 0.02;
  const evaluate: Evaluate = async (points, _tag, seeds) => points.map(u => {
    const r = rng(Math.round(u[0] * 1e6) * 31 + Math.round(u[1] * 1e6) + seeds[0]);
    return f(u).map(v => v + noise * normInv(r()) / Math.sqrt(seeds.length));
  });
  const stats: HmStat[] = zs.map((z, j) => ({ key: `s${j}`, z, varObs: 0.03 ** 2, varDisc: 0.02 ** 2, varSim: noise * noise }));
  const specs = [{ points: 30, cut: { max: 3 } }, { points: 30, cut: { max: 3 } }, { points: 30, cut: { max: 3, second: 2.5, third: 2 } }];
  const waves = await historyMatch({ d: 2, stats, seeds: [1, 2, 3, 4, 5], evaluate, candidates: 2000, maxBatches: 20, seed: 3, looZ: 2, looShare: 0.9 }, specs);
  assert.equal(waves.length, 3);
  assert.ok(inRegion(star, waves, stats), 'the true point stays non-implausible');
  assert.ok(!inRegion([0.9, 0.1], waves, stats), 'a distant point is ruled out');
  const share = waves.map(w => w.data.nroyShare);
  assert.ok(share.every(v => v < 0.1), `shares ${share}`); // the prior cube shrinks to a few percent
  const post = abc(waves, stats, 2, 20000, 0.01, 2000, 200, 5);
  assert.ok(post.accepted.length === Math.round(post.draws * 0.01));
  post.median.forEach((m, j) => assert.ok(Math.abs(m - star[j]) < 0.05, `θ${j} median ${m}`));
  post.lo90.forEach((lo, j) => assert.ok(lo <= star[j] + 0.02 && post.hi90[j] >= star[j] - 0.02));
  const c = await confirm(waves, stats, post, 60, [1, 2, 3, 4, 5], evaluate, 9, 0.05);
  assert.equal(c.points.length, 60);
  assert.ok(Number.isFinite(c.p));
  const so = sobolAll(waves, stats, 2, 4000, 1);
  assert.ok(so[0].ST[0] > so[0].ST[1], 'statistic 0 depends mostly on θ₀ (3 vs 1)');
});
