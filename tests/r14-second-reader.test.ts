import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawAt } from '../src/kernel/decode';
import { divergence, TRANSFORMS } from '../scripts/lib/r14-decode';
import { FAMILY, jitterOdds, kl, takeAt } from '../scripts/r14-second-reader';

// Stage R14, the second reader (docs/staging/r14-diag-decode.md §7): the two routes meet here and nowhere else. The second
// reader's script writes the transforms, the draw and the divergence again without importing the first reader's; this
// file holds the two against each other on seeded inputs, and checks the rules' odds approximated from saved values.

/** A small seeded generator (mulberry32). */
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Probability vectors of 2 to 8 options, some of them peaked as a nest at dusk is. */
function vectors(n: number, seed: number): number[][] {
  const r = rng(seed), out: number[][] = [];
  for (let k = 0; k < n; k++) {
    const m = 2 + Math.floor(r() * 7), sharp = 1 + Math.floor(r() * 6), raw = Array.from({ length: m }, () => Math.pow(r(), sharp)), s = raw.reduce((a, b) => a + b, 0);
    out.push(raw.map(v => v / s));
  }
  return out;
}

test('the two readers\' families are the same settings and give the same odds', () => {
  assert.deepEqual(FAMILY.map(t => t.name), TRANSFORMS.map(t => t.id));
  for (const p of vectors(400, 14)) for (let i = 0; i < FAMILY.length; i++) {
    const a = FAMILY[i].f(p), b = TRANSFORMS[i].apply(p);
    for (let j = 0; j < p.length; j++) assert.ok(Math.abs(a[j] - b[j]) < 1e-12, `${FAMILY[i].name}: option ${j} of ${JSON.stringify(p)}`);
  }
});

test('the running sum written again takes the option the decode\'s own draw takes', () => {
  const r = rng(15);
  for (const p of vectors(400, 16)) for (let k = 0; k < 5; k++) { const u = r(); assert.equal(takeAt(p, u), drawAt(p, u)); }
  assert.equal(takeAt([0, 0, 0], 0.4), drawAt([0, 0, 0], 0.4));   // no option with a positive probability: both say so
  assert.equal(takeAt([0.2, 0, 0.8], 0.999999), 2);
});

test('the divergence written again is the first reader\'s', () => {
  const v = vectors(200, 17), w = vectors(200, 18);
  for (let i = 0; i < v.length; i++) if (v[i].length === w[i].length) assert.ok(Math.abs(kl(v[i], w[i]) - divergence(v[i], w[i])) < 1e-12);
});

test('the rules\' odds from values and a uniform jitter: certain past the span, even on a tie, the closed form for two options', () => {
  const span = 0.24;
  assert.deepEqual(jitterOdds([1, 0.7], span).map(v => +v.toFixed(6)), [1, 0]);            // further apart than the span: the higher value always wins
  assert.deepEqual(jitterOdds([0.5, 0.5, 0.5], span).map(v => +v.toFixed(3)), [0.333, 0.333, 0.333]);
  for (const d of [0.02, 0.06, 0.12, 0.2, 0.2399]) {
    // two options d apart, each with an independent uniform jitter of the span: the lower one wins with (1 - d / span)^2 / 2
    const want = 1 - (1 - d / span) ** 2 / 2, got = jitterOdds([0.8 + d, 0.8], span);
    assert.ok(Math.abs(got[0] - want) < 2e-3, `d = ${d}: ${got[0]} against ${want}`);
    assert.ok(Math.abs(got[0] + got[1] - 1) < 1e-12);
  }
  // an option out of reach of the top one takes nothing, whatever the others do
  const q = jitterOdds([1.2, 1.1, 0.5, 0.3], span);
  assert.equal(q[2], 0); assert.equal(q[3], 0); assert.ok(q[0] > q[1] && q[1] > 0);
});
