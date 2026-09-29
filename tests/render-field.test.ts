import assert from 'node:assert/strict';
import test from 'node:test';
import { CENTRE_SNAP, OVERVIEW_FULL, OVERVIEW_IN, RECENTRE_M, approach, needsRecentre, overviewWeight, partyMarkerPx, rtsDistanceFor, runSteps, stepFor, tileRange, tileSeed, windowCentre } from '../src/render/env/field';
import { cellOf, createGrid } from '../src/render/env/cells';
import { createTreeIndex } from '../src/render/creatures/tree-index';
import { createWorld } from '../src/simulation';
import { buildFieldRiver, buildFieldTrails, createBaseHeight, createCanopyHeight } from '../src/render/env/terrain';
import type { World } from '../src/types';

// Field view (C5b): the pure pieces of window streaming and the overview.

test('tile seeds are stable, and differ between tiles, salts and worlds', () => {
  assert.equal(tileSeed(48, 3, -7, 11), tileSeed(48, 3, -7, 11));
  const seen = new Set<number>();
  for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) seen.add(tileSeed(48, x, z, 11));
  assert.equal(seen.size, 41 * 41, 'no collisions over a 41 × 41 tile patch');
  assert.notEqual(tileSeed(48, 1, 2, 11), tileSeed(48, 1, 2, 12));
  assert.notEqual(tileSeed(48, 1, 2, 11), tileSeed(49, 1, 2, 11));
  assert.notEqual(tileSeed(48, 1, 2), tileSeed(48, 2, 1), 'axes are not symmetric');
});

test('tile ranges cover the window on both sides of zero', () => {
  assert.deepEqual(tileRange(0, 140, 64), [-3, 2]);
  assert.deepEqual(tileRange(-1264, 118, 64), [-22, -18]);
  const [a, b] = tileRange(100.5, 10, 64);
  assert.ok(a * 64 <= 90.5 && (b + 1) * 64 > 110.5);
});

test('window centres snap, lead the focus by at most 30 m, and stay inside the map', () => {
  const out = [0, 0];
  windowCentre(101, -37, 0, 0, out);
  assert.deepEqual(out, [Math.round(101 / CENTRE_SNAP) * CENTRE_SNAP, Math.round(-37 / CENTRE_SNAP) * CENTRE_SNAP]);
  windowCentre(0, 0, 100, 0, out);
  assert.ok(out[0] <= 32 && out[0] >= 16, `lead capped at 30 m (got ${out[0]})`);
  windowCentre(3990, -3990, 0, 0, out, 1.5, 4000);
  assert.ok(out[0] <= 3850 && out[1] >= -3850, 'clamped inside the map');
});

test('recentre only past the threshold', () => {
  assert.equal(needsRecentre(0, 0, RECENTRE_M - 1, 0), false);
  assert.equal(needsRecentre(0, 0, RECENTRE_M + 1, 0), true);
  assert.equal(needsRecentre(100, 100, 100, 100 + RECENTRE_M + 0.5), true);
});

test('the overview weight is 0 in perspective views and rises monotonically over its band', () => {
  assert.equal(overviewWeight(5000, true), 0);
  assert.equal(overviewWeight(OVERVIEW_IN, false), 0);
  assert.equal(overviewWeight(OVERVIEW_FULL, false), 1);
  let prev = 0;
  for (let hf = OVERVIEW_IN; hf <= OVERVIEW_FULL; hf += 20) { const w = overviewWeight(hf, false); assert.ok(w >= prev); prev = w; }
});

test('the strategy camera distance keeps 260 m for strategy frames and grows at km scale (field profile only)', () => {
  assert.equal(rtsDistanceFor(150), 260);
  assert.ok(rtsDistanceFor(7000) > 7000);
});

test('anchor approach is frame-rate independent and marker size grows with the party', () => {
  let a = 0, b = 0;
  a = approach(a, 10, 0.016, 0.5); a = approach(a, 10, 0.016, 0.5);
  b = approach(b, 10, 0.032, 0.5);
  assert.ok(Math.abs(a - b) < 1e-9);
  assert.ok(partyMarkerPx(9) > partyMarkerPx(1));
});

test('step generators: runSteps finishes; stepFor stops at its budget and reports the longest step', () => {
  function* gen() { for (let i = 0; i < 10; i++) yield; return 42; }
  assert.equal(runSteps(gen()), 42);
  let t = 0;
  const now = () => t;
  const g = gen(), stats = { maxStepMs: 0 };
  // Each step advances the fake clock by 1 ms: a 3 ms budget runs 3 steps per call.
  const clocked = (function* () { for (const _ of g) { t += 1; yield; } return 42; })();
  let r = stepFor(clocked, 3, now, stats);
  assert.equal(r.done, false);
  assert.equal(t, 3);
  while (!(r = stepFor(clocked, 3, now, stats)).done);
  assert.equal(r.value, 42);
  assert.equal(stats.maxStepMs, 1);
});

test('cell grids follow their origin', () => {
  const g0 = createGrid(160, 16), g1 = createGrid(160, 16, -1264, 1040);
  assert.equal(cellOf(g1, -1264 + 5, 1040 + 5), cellOf(g0, 5, 5));
  assert.equal(cellOf(g1, 0, 0), g1.n - 1, 'far points clamp to the edge');
});

test('tree index: nearest within range equals a linear scan', () => {
  const w = createWorld(48, { profile: 'field' });
  const index = createTreeIndex(() => w);
  let s = 5;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < 200; k++) {
    const x = (r() - 0.5) * 7000, z = (r() - 0.5) * 7000, d = 5 + r() * 40;
    let best: World['trees'][number] | null = null, bd = d * d;
    for (const t of w.trees) { const dd = (t.position[0] - x) ** 2 + (t.position[2] - z) ** 2; if (dd < bd) { bd = dd; best = t; } }
    assert.equal(index.nearest(x, z, d)?.id ?? null, best?.id ?? null);
  }
  assert.equal(index.byId(w.trees[10].id), w.trees[10]);
});

test('field river and trails are deterministic and cover the map; heights are the same function everywhere', () => {
  const w = createWorld(48, { profile: 'field' });
  const a = buildFieldRiver(w), b = buildFieldRiver(w);
  assert.equal(a.river.points.length, b.river.points.length);
  assert.ok(a.river.points.length > 5000, 'an 8 km stream sampled every 0.8 m');
  assert.deepEqual(a.crossings.map(c => [c.x, c.z, c.kind]), b.crossings.map(c => [c.x, c.z, c.kind]));
  const t1 = buildFieldTrails(w), t2 = buildFieldTrails(w);
  assert.deepEqual(t1, t2);
  assert.ok(t1.every(s => Math.hypot(s.bx - s.ax, s.bz - s.az) <= 90));
  const h = createBaseHeight(48), h2 = createBaseHeight(48), c = createCanopyHeight(48);
  assert.equal(h(-1264.5, 1040.25), h2(-1264.5, 1040.25));
  assert.ok(c(100, 100) > 10 && c(100, 100) < 30);
});
