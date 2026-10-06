import assert from 'node:assert/strict';
import test from 'node:test';
import { placePopover } from '../src/ui/popover';

// Description popover (src/ui/popover.ts): beside the row, on the side that has room; inside the viewport.

const rect = (left: number, top: number, width = 340, height = 36) => ({ left, top, right: left + width, bottom: top + height, width, height });

test('a row in the right sidebar: the popover sits to its left, top edges aligned', () => {
  const p = placePopover(rect(1070, 300), 280, 150, 1440, 900);
  assert.equal(p.side, 'left');
  assert.equal(p.x, 1070 - 10 - 280);
  assert.equal(p.y, 300);
});

test('no room on the left: it goes to the right of the row', () => {
  const p = placePopover(rect(20, 300, 300), 280, 150, 1440, 900);
  assert.equal(p.side, 'right');
  assert.equal(p.x, 320 + 10);
});

test('a full-width row (phone sheet): above it, or below when the row is near the top', () => {
  const above = placePopover(rect(8, 500, 374), 280, 150, 390, 844);
  assert.equal(above.side, 'above');
  assert.equal(above.y, 500 - 10 - 150);
  const below = placePopover(rect(8, 60, 374), 280, 150, 390, 844);
  assert.equal(below.side, 'below');
  assert.equal(below.y, 96 + 10);
  assert.ok(above.x >= 8 && above.x + 280 <= 390 - 8, 'horizontally inside the viewport');
});

test('the popover stays inside the viewport at the bottom edge', () => {
  const p = placePopover(rect(1070, 860), 280, 150, 1440, 900);
  assert.equal(p.y, 900 - 8 - 150);
});
