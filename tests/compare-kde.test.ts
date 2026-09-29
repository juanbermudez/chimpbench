import assert from 'node:assert/strict';
import test from 'node:test';
import { utm } from '../src/compare/geo';
import { bhattacharyya, href, isoplethEdges, kernelUD, makeGrid, signedEdgeDistance, udShape, volumeLevels } from '../src/compare/kde';
import { normAffinity, normIsoplethArea, normMass, normalizeUD } from '../src/compare/normalize';
import { mulberry32 } from '../src/compare/sampling';

/** Deterministic standard normals (Box–Muller on a seeded generator). */
function normals(seed: number, n: number): number[] {
  const r = mulberry32(seed), out: number[] = [];
  while (out.length < n) { const u = 1 - r(), v = r(); out.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v), Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v)); }
  return out.slice(0, n);
}
function gaussianTrack(seed: number, n: number, sx: number, sy: number, angle = 0, cx = 0, cy = 0): { x: number[]; y: number[] } {
  const a = normals(seed, n), b = normals(seed + 1000, n), c = Math.cos(angle), s = Math.sin(angle);
  return { x: a.map((v, i) => cx + c * v * sx - s * b[i] * sy), y: a.map((v, i) => cy + s * v * sx + c * b[i] * sy) };
}

test('UTM 36N: known points and the meridian arc', () => {
  const [e0, n0] = utm(0, 30);
  assert.ok(Math.abs(e0 - 166021.443) < 0.01 && Math.abs(n0) < 1e-6, `equator 3° west of the central meridian: ${e0}, ${n0}`);
  const [e1, n1] = utm(1, 33);
  assert.ok(Math.abs(e1 - 500000) < 1e-6, 'central meridian easting');
  // independent meridian-arc series (Snyder 1987, eq. 3-21) for WGS84 at 1°N, scaled by k0
  const a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f), e4 = e2 * e2, e6 = e4 * e2, p = Math.PI / 180;
  const M = a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * p - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * p) + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * p) - 35 * e6 / 3072 * Math.sin(6 * p));
  assert.ok(Math.abs(n1 - 0.9996 * M) < 0.01, `northing ${n1} vs ${0.9996 * M}`);
  const [ew] = utm(0.5, 32.6), [ee] = utm(0.5, 33.4);
  assert.ok(Math.abs((ew - 500000) + (ee - 500000)) < 1e-6, 'symmetric about the central meridian');
});

test('grid follows adehabitatHR kernelUD(grid = 100, extent = 1)', () => {
  const g = makeGrid([0, 1000], [0, 500]);
  assert.equal(g.x0, -1000); assert.equal(g.y0, -500);
  assert.ok(Math.abs(g.cell - 3000 / 99) < 1e-9);
  assert.equal(g.nx, 100); assert.equal(g.ny, 51);
});

test('href is mean(sd x, sd y) · n^(−1/6)', () => {
  const x = [0, 2, 4, 6], y = [0, 4, 8, 12];
  const sdx = Math.sqrt((9 + 1 + 1 + 9) / 3), sdy = 2 * sdx;
  assert.ok(Math.abs(href(x, y) - (sdx + sdy) / 2 * 4 ** (-1 / 6)) < 1e-12);
});

test('isotropic Gaussian fixes: 95% and 50% areas, core fraction, edge distances', () => {
  const s = 500, h = 200, t = gaussianTrack(1, 4000, s, s), g = makeGrid(t.x, t.y);
  const ud = kernelUD(t.x, t.y, h, g), lv = volumeLevels(ud, g.cell), sh = udShape(ud, lv, g);
  const s2 = s * s + h * h, a95 = 2 * Math.PI * s2 * Math.log(20), a50 = 2 * Math.PI * s2 * Math.log(2);
  assert.ok(Math.abs(sh.area95 - a95) / a95 < 0.06, `95% ${sh.area95.toFixed(0)} vs ${a95.toFixed(0)}`);
  assert.ok(Math.abs(sh.area50 - a50) / a50 < 0.08, `50% ${sh.area50.toFixed(0)} vs ${a50.toFixed(0)}`);
  assert.ok(Math.abs(sh.area50 / sh.area95 - Math.log(2) / Math.log(20)) < 0.02, 'core fraction ≈ ln 2 / ln 20');
  let sum = 0;
  for (const v of ud) sum += v;
  assert.ok(Math.abs(sum * g.cell * g.cell - 1) < 1e-9, 'unit volume');
  const edges = isoplethEdges(lv, g, 0.95), R = Math.sqrt(2 * s2 * Math.log(20));
  const dc = signedEdgeDistance(edges, lv, g, 0.95, sh.cx, sh.cy);
  assert.ok(Math.abs(dc - R) < 0.06 * R + g.cell, `centre is ~R inside (${dc.toFixed(0)} vs ${R.toFixed(0)})`);
  const out = signedEdgeDistance(edges, lv, g, 0.95, sh.cx + 2 * R, sh.cy);
  assert.ok(out < 0 && Math.abs(-out - R) < 0.06 * R + g.cell, 'a point at 2R is ~R outside');
  let inside = 0;
  for (let i = 0; i < t.x.length; i++) if (signedEdgeDistance(edges, lv, g, 0.95, t.x[i], t.y[i]) > 0) inside++;
  assert.ok(Math.abs(inside / t.x.length - 0.95) < 0.03, `share of fixes inside the 95% isopleth ${(inside / t.x.length).toFixed(3)}`);
});

test('Bhattacharyya affinity: 1 for identical UDs, exp(−d²/8σ²) for shifted normals', () => {
  const s = 400, h = 150, a = gaussianTrack(2, 4000, s, s), d = 900;
  const b = { x: a.x.map(v => v + d), y: a.y };
  const g = makeGrid([...a.x, ...b.x], [...a.y, ...b.y]);
  const ua = kernelUD(a.x, a.y, h, g), ub = kernelUD(b.x, b.y, h, g);
  assert.ok(Math.abs(bhattacharyya(ua, ua, g.cell) - 1) < 1e-9);
  const expected = Math.exp(-d * d / (8 * (s * s + h * h)));
  assert.ok(Math.abs(bhattacharyya(ua, ub, g.cell) - expected) < 0.02, `${bhattacharyya(ua, ub, g.cell).toFixed(3)} vs ${expected.toFixed(3)}`);
});

test('principal axes and elongation of a rotated elliptical range', () => {
  const h = 150, ang = Math.PI / 6, t = gaussianTrack(3, 5000, 1000, 250, ang), g = makeGrid(t.x, t.y);
  const ud = kernelUD(t.x, t.y, h, g), sh = udShape(ud, volumeLevels(ud, g.cell), g);
  const got = Math.atan2(sh.ux[1], sh.ux[0]), diff = Math.abs(((got - ang) % Math.PI + 1.5 * Math.PI) % Math.PI - Math.PI / 2);
  assert.ok(diff < 2 * Math.PI / 180, `major axis within 2° (${(got * 180 / Math.PI).toFixed(1)}°)`);
  const expected = Math.sqrt((1000 ** 2 + h * h) / (250 ** 2 + h * h));
  assert.ok(Math.abs(sh.sd1 / sh.sd2 - expected) / expected < 0.06, `elongation ${(sh.sd1 / sh.sd2).toFixed(2)} vs ${expected.toFixed(2)}`);
});

test('normalized maps are invariant to position, rotation, reflection and scale', () => {
  // a skewed range (main lobe plus an offset satellite) so the canonical orientation is well defined
  const m = gaussianTrack(4, 2000, 900, 400, 0.4), l = gaussianTrack(5, 700, 300, 300, 0, 1500, 600);
  const t = { x: [...m.x, ...l.x], y: [...m.y, ...l.y] };
  const a = (() => { const g = makeGrid(t.x, t.y), u = kernelUD(t.x, t.y, 200, g); return normalizeUD(u, g, udShape(u, volumeLevels(u, g.cell), g)); })();
  // the same fixes moved 30 km, rotated 70°, mirrored and scaled ×3 (bandwidth scaled with them)
  const c = Math.cos(1.22), s = Math.sin(1.22), k = 3;
  const x2 = t.x.map((x, i) => 30000 + k * (c * x - s * t.y[i])), y2 = t.x.map((x, i) => -5000 - k * (s * x + c * t.y[i]));
  const b = (() => { const g = makeGrid(x2, y2), u = kernelUD(x2, y2, 200 * k, g); return normalizeUD(u, g, udShape(u, volumeLevels(u, g.cell), g)); })();
  assert.ok(normAffinity(a, b) > 0.995, `affinity ${normAffinity(a, b).toFixed(4)}`);
  assert.ok(normMass(a) > 0.98, 'the ±2.5 r window holds the range');
  assert.ok(Math.abs(normIsoplethArea(a, 0.95) - Math.PI) / Math.PI < 0.1, '95% area ≈ π r² in normalized units');
});
