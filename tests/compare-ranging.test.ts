import assert from 'node:assert/strict';
import test from 'node:test';
import { analyseYear, fixedBandwidth, pooledOverlap, sameDayPairs, yearToYear } from '../src/compare/ranging';
import { mulberry32, type Fix } from '../src/compare/sampling';

/** Synthetic individual-year: n Gaussian fixes around (cx, cy) with SD s, spread over 12 months. */
function track(ind: string, year: number, n: number, cx: number, cy: number, s: number, seed: number): Fix[] {
  const r = mulberry32(seed), out: Fix[] = [];
  for (let i = 0; i < n; i++) {
    const u = 1 - r(), v = r(), m = Math.sqrt(-2 * Math.log(u));
    out.push({ ind, sex: i % 2 ? 'M' : 'F', year, month: 1 + (i % 12), doy: 1 + (i % 365), day: i, min: 600, x: cx + s * m * Math.cos(2 * Math.PI * v), y: cy + s * m * Math.sin(2 * Math.PI * v) });
  }
  return out;
}

test('two spatially separate groups: the split recovers them and their ranges diverge', () => {
  const fixes: Fix[] = [];
  for (let k = 0; k < 6; k++) fixes.push(...track(`A${k}`, 2020, 150, 0, 0, 600, 10 + k));
  for (let k = 0; k < 6; k++) fixes.push(...track(`B${k}`, 2020, 150, 6000, 0, 600, 20 + k));
  const h = fixedBandwidth(fixes), y = analyseYear(fixes, h);
  assert.equal(y.inds.length, 12);
  const s = y.split!;
  assert.deepEqual(s.labels, [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  assert.ok(s.silhouette > 0.8 && s.between < 0.02 && s.within > 0.8, `silhouette ${s.silhouette.toFixed(2)}, within ${s.within.toFixed(2)}, between ${s.between.toFixed(3)}`);
  assert.ok(s.groupBA < 0.02 && s.sepR > 3, 'pooled group ranges barely overlap and sit several radii apart');
  assert.ok(y.inds.every(i => i.share > 0.25 && i.share < 0.7), 'each individual uses about half of the pooled range');
});

test('one cohesive group: no spatial split, individual ranges alike', () => {
  const fixes: Fix[] = [];
  for (let k = 0; k < 10; k++) fixes.push(...track(`C${k}`, 2020, 200, 0, 0, 800, 40 + k));
  const y = analyseYear(fixes, fixedBandwidth(fixes));
  const s = y.split!;
  assert.ok(s.within > 0.9 && s.between > 0.9 && s.groupBA > 0.95, `within ${s.within.toFixed(2)}, between ${s.between.toFixed(2)}, groups ${s.groupBA.toFixed(2)}`);
  const cores = y.inds.map(i => i.core);
  assert.ok(cores.every(c => Math.abs(c - Math.log(2) / Math.log(20)) < 0.05), 'Gaussian core fraction ≈ 0.23');
  // the 95% isopleth is that of the smoothed UD (σ² + h²), so it holds more than 95% of the raw fixes:
  // 1 − 20^−(σ² + h²)/σ² for a Gaussian, plus each fix's own kernel bump at small n
  const inside = y.edge.filter(e => e > 0).length / y.edge.length, expected = 1 - 20 ** (-(800 ** 2 + y.h ** 2) / 800 ** 2);
  assert.ok(inside >= expected - 0.02 && inside < 1, `fixes inside their own 95% isopleth ${inside.toFixed(3)} (expected ≥ ${expected.toFixed(3)})`);
  assert.ok(Math.abs(y.inds[0].r - Math.sqrt(y.inds[0].area95 / Math.PI)) < 1e-9);
});

test('year to year: a stable range overlaps strongly, a moved range shifts by the distance moved', () => {
  const a = track('D', 2019, 300, 0, 0, 700, 60), same = track('D', 2020, 300, 0, 0, 700, 61);
  const stay = yearToYear(a, same, 250);
  assert.ok(stay.indBA[0] > 0.97 && stay.indShiftR[0] < 0.1, `stable: BA ${stay.indBA[0].toFixed(3)}, shift ${stay.indShiftR[0].toFixed(3)} r`);
  const big = track('D', 2019, 3000, 0, 0, 700, 62), moved = track('D', 2020, 3000, 2000, 0, 700, 63), go = yearToYear(big, moved, 250);
  assert.ok(Math.abs(go.indShiftM[0] - 2000) < 150, `moved ${go.indShiftM[0].toFixed(0)} m`);
  const s2 = 700 * 700 + 250 * 250;
  assert.ok(Math.abs(go.indBA[0] - Math.exp(-2000 * 2000 / (8 * s2))) < 0.03, `BA of shifted normals ${go.indBA[0].toFixed(3)}`);
  const po = pooledOverlap([big, moved], 250);
  assert.ok(Math.abs(po.sepM[0][1] - go.indShiftM[0]) < 1e-6, 'pooled and individual shift agree for one individual');
});

test('same-day displacement pairs: only days with two fixes, earlier fix first', () => {
  const f = (day: number, min: number, x: number): Fix => ({ ind: 'E', sex: 'F', year: 2020, month: 1, doy: day, day, min, x, y: 0 });
  const pairs = sameDayPairs([f(1, 900, 300), f(1, 540, 0), f(2, 600, 50), f(3, 480, 0), f(3, 720, 100)]);
  assert.deepEqual(pairs.map(([a, b]) => [a.day, a.min, b.min, b.x - a.x]), [[1, 540, 900, 300], [3, 480, 720, 100]]);
});
