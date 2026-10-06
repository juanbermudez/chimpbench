import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP_ZOOM_MAX, clampView, fromMap, layerOffset, toMap, wheelFactor, zoomAbout, type MapView } from '../src/ui/map-view';

// Range map zoom (src/ui/minimap.ts): one view transform for every mark, the click inverse and the cached layers.

const FIELD = 8000, COMPRESSED = 160;
const view = (zoom = 1, x = 0, z = 0): MapView => ({ zoom, x, z });

test('at 1× the transform is exactly the old whole-map formula (the map is pixel-identical)', () => {
  for (const size of [FIELD, COMPRESSED]) for (const px of [428, 556, 596]) {
    for (let x = -size / 2; x <= size / 2; x += size / 37.3) {
      assert.equal(toMap(x, 0, 1, size, px), (x / size + 0.5) * px);
      const f = x / size + 0.5;
      assert.equal(fromMap(f, 0, 1, size), (f - 0.5) * size, 'click inverse at 1×');
    }
  }
});

test('zooming about a point keeps the world point under it', () => {
  const out = view();
  zoomAbout(FIELD, view(2, 300, -500), 4, 0.3, 0.6, out);
  assert.equal(out.zoom, 4);
  for (const [u, before, after] of [[0.3, fromMap(0.3, 300, 2, FIELD), fromMap(0.3, out.x, 4, FIELD)], [0.6, fromMap(0.6, -500, 2, FIELD), fromMap(0.6, out.z, 4, FIELD)]]) {
    assert.ok(Math.abs(before - after) < 1e-9, `anchor ${u} stays (${before} → ${after})`);
  }
});

test('the view never shows beyond the world edge, and 1× is the whole map exactly centred', () => {
  const out = view();
  for (const size of [FIELD, COMPRESSED]) {
    for (let z = 1; z <= MAP_ZOOM_MAX; z *= 1.37) {
      for (const x of [-size, -size / 3, 0, size / 5, size]) {
        clampView(size, z, x, -x, out);
        const half = size / (2 * out.zoom);
        assert.ok(out.x - half >= -size / 2 - 1e-9 && out.x + half <= size / 2 + 1e-9, `x edge at ${z}×`);
        assert.ok(out.z - half >= -size / 2 - 1e-9 && out.z + half <= size / 2 + 1e-9, `z edge at ${z}×`);
      }
    }
    clampView(size, 1, size / 4, -size / 7, out);
    assert.deepEqual(out, view(1, 0, 0));
  }
});

test('zoom stays within 1–8×; a hair above 1× snaps back to the whole map', () => {
  const out = view();
  assert.equal(zoomAbout(FIELD, view(), 40, 0.5, 0.5, out).zoom, MAP_ZOOM_MAX);
  assert.equal(zoomAbout(FIELD, view(2, 1000, 1000), 0.3, 0.9, 0.1, out).zoom, 1);
  assert.deepEqual(out, view(1, 0, 0));
  assert.deepEqual(clampView(FIELD, 1.0004, 900, 900, out), view(1, 0, 0));
});

test('map pixel and click inverse agree at any zoom', () => {
  const v = view(5.5, -1234, 2048), px = 512;
  for (let x = -1800; x <= -700; x += 97) {
    const f = toMap(x, v.x, v.zoom, FIELD, px) / px;
    assert.ok(Math.abs(fromMap(f, v.x, v.zoom, FIELD) - x) < 1e-9);
  }
});

test('a layer drawn for one view lands on the right pixels in another (scaled during a drag or wheel burst)', () => {
  const px = 480;
  for (const [from, to] of [[view(1), view(3, 1500, -900)], [view(4, 200, 300), view(2.5, -100, 450)], [view(2, 0, 0), view(2, 600, -600)]]) {
    const s = to.zoom / from.zoom;
    for (const x of [-2100, -350, 0, 777, 1999]) {
      const want = toMap(x, to.x, to.zoom, FIELD, px);
      const got = s * toMap(x, from.x, from.zoom, FIELD, px) + layerOffset(s, from.x, to.x, to.zoom, FIELD, px);
      assert.ok(Math.abs(want - got) < 1e-6, `x ${x}: ${got} vs ${want}`);
    }
  }
});

test('wheel: 1.25× per notch in pixels, lines or pages; a pinch follows the gesture within one notch', () => {
  assert.ok(Math.abs(wheelFactor(-100, 0, false) - 1.25) < 1e-12, 'one notch in');
  assert.ok(Math.abs(wheelFactor(100, 0, false) - 1 / 1.25) < 1e-12, 'one notch out');
  assert.ok(Math.abs(wheelFactor(-3, 1, false) - 1.25) < 1e-12, 'three lines = one notch');
  assert.ok(Math.abs(wheelFactor(-0.1, 2, false) - 1.25) < 1e-12, 'a tenth of a page = one notch');
  assert.ok(Math.abs(wheelFactor(-1000, 0, false) - 1.25 ** 3) < 1e-12, 'a fling is capped at three notches');
  assert.ok(Math.abs(wheelFactor(-4, 0, true) - Math.exp(0.04)) < 1e-12, 'pinch: the browser zoom convention');
  assert.equal(wheelFactor(-100, 0, true), 1.25, 'ctrl+wheel notch capped');
  assert.equal(wheelFactor(0, 0, false), 1);
});
