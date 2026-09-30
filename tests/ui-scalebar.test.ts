import assert from 'node:assert/strict';
import test from 'node:test';
import { SCALE_MAX_PX, scaleFor } from '../src/ui/scalebar';

// Map scale bar (strategy view): nice lengths that fit the bar, labelled in m or km.

test('the scale bar picks 1, 2 or 5 × 10ⁿ m and fits 40–100% of its maximum width', () => {
  for (let mpp = 0.01; mpp < 100; mpp *= 1.07) {
    const s = scaleFor(mpp);
    const lead = s.metres / Math.pow(10, Math.floor(Math.log10(s.metres) + 1e-9));
    assert.ok([1, 2, 5].some(k => Math.abs(lead - k) < 1e-9), `nice length ${s.metres}`);
    assert.ok(s.px > SCALE_MAX_PX * 0.4 - 1 && s.px <= SCALE_MAX_PX, `width ${s.px} px at ${mpp} m/px`);
  }
});

test('scale labels: metres below 1 km, kilometres above', () => {
  // Whole field map: ~7.4 km over 900 px.
  assert.equal(scaleFor(7400 / 900).label, '1 km');
  // Strategy view at a 64 m frame.
  assert.equal(scaleFor(64 / 900).label, '5 m');
  assert.equal(scaleFor(0.02).label, '2 m');
  assert.equal(scaleFor(40).label, '5 km');
  assert.equal(scaleFor(0.004).label, '0.5 m');
});
