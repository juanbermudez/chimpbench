import assert from 'node:assert/strict';
import test from 'node:test';
import { placeTip } from '../src/ui/tooltip';

// Shared tooltip (src/ui/tooltip.ts): above the control, centred; below when there is no room; inside the viewport.

const rect = (left: number, top: number, width = 30, height = 30) => ({ left, top, right: left + width, bottom: top + height, width, height });

test('the tip sits above the control, centred on it', () => {
  const p = placeTip(rect(200, 600), 120, 26, 1440, 900);
  assert.equal(p.below, false);
  assert.equal(p.x, 200 + 15 - 60);
  assert.equal(p.y, 600 - 8 - 26);
});

test('no room above: the tip flips below the control', () => {
  const p = placeTip(rect(200, 10), 120, 26, 1440, 900);
  assert.equal(p.below, true);
  assert.equal(p.y, 40 + 8);
});

test('the tip is clamped to the viewport', () => {
  assert.equal(placeTip(rect(2, 600), 160, 26, 1440, 900).x, 6, 'left edge');
  assert.equal(placeTip(rect(1420, 600), 160, 26, 1440, 900).x, 1440 - 6 - 160, 'right edge');
  const tall = placeTip(rect(200, 4, 30, 880), 120, 40, 1440, 900);
  assert.ok(tall.y >= 6 && tall.y + 40 <= 900 - 6, `vertical clamp (${tall.y})`);
});
