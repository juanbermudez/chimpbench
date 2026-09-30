import assert from 'node:assert/strict';
import test from 'node:test';
import { LABEL_MIN_H, PICK_RADIUS, PICK_RADIUS_TOUCH, PREFER_SLACK, inLabelBox, nearestOnScreen, pickRadius } from '../src/render/creatures/pick';

const pick = (pts: [number, number, number?][], px: number, py: number, prefer = -1, radius = PICK_RADIUS) =>
  nearestOnScreen(pts.length, pts.map(p => p[0]), pts.map(p => p[1]), pts.map(p => p[2] ?? 0), px, py, radius, prefer);

test('screen pick: nothing within reach gives −1', () => {
  assert.equal(pick([[100, 100], [300, 300]], 200, 200), -1);
  assert.equal(pick([], 0, 0), -1);
});

test('screen pick: a click near (not on) an animal selects it, the nearest of several', () => {
  assert.equal(pick([[100, 100]], 120, 110), 0);           // ~22 px away
  assert.equal(pick([[100, 100], [130, 100]], 118, 100), 1);
  assert.equal(pick([[100, 100]], 100 + PICK_RADIUS + 1, 100), -1);
});

test('screen pick: a large close-up body is reachable anywhere on it', () => {
  // 90 px from the centre of an animal whose on-screen half-size is 120 px.
  assert.equal(pick([[400, 400, 120]], 490, 400), 0);
  assert.equal(pick([[400, 400, 120]], 530, 400), -1);
});

test('screen pick: the hovered animal wins close calls, not clear ones', () => {
  const pts: [number, number][] = [[100, 100], [112, 100]];
  assert.equal(pick(pts, 110, 100, 0), 0);                  // hovered is 10 px, other 2 px: within the slack
  assert.equal(pick(pts, 110, 100), 1);                     // without a hover the nearest wins
  const far: [number, number][] = [[100, 100], [100 + PREFER_SLACK + 20, 100]];
  assert.equal(pick(far, 100 + PREFER_SLACK + 18, 100, 0), 1);  // hovered is much farther: the nearest wins
  assert.equal(pick([[100, 100], [300, 300]], 300, 300, 0), 1); // hovered out of reach is ignored
});

test('pick radius: about 28 CSS px for a mouse, more for touch', () => {
  assert.equal(pickRadius('mouse'), PICK_RADIUS);
  assert.equal(PICK_RADIUS, 28);
  assert.equal(pickRadius('touch'), PICK_RADIUS_TOUCH);
  assert.ok(PICK_RADIUS_TOUCH > PICK_RADIUS);
});

test('label hit box: at least 32 px tall with side padding', () => {
  // A 96 × 20 label centred at x = 200 with its bottom edge at y = 100 (spans y 80..100).
  const at = (x: number, y: number) => inLabelBox(x, y, 200, 100, 96, 20);
  assert.ok(at(200, 90));
  assert.ok(at(200, 90 - LABEL_MIN_H / 2 + 0.5) && at(200, 90 + LABEL_MIN_H / 2 - 0.5));
  assert.ok(!at(200, 90 - LABEL_MIN_H / 2 - 1) && !at(200, 90 + LABEL_MIN_H / 2 + 1));
  assert.ok(at(200 + 48 + 5, 90), 'side padding');
  assert.ok(!at(200 + 48 + 8, 90));
  // A tall (two-line) label keeps 4 px of vertical padding.
  assert.ok(inLabelBox(200, 100 + 3, 200, 100, 120, 40) && !inLabelBox(200, 100 + 5, 200, 100, 120, 40));
});
