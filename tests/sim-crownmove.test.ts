import assert from 'node:assert/strict';
import test from 'node:test';
import { moveTo } from '../src/sim/execution';
import { crownAt, crownHolds, crownMoveOn, sameCrown } from '../src/sim/gait';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Tree, World } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E1q (crownMove; docs/staging/e1q-prereg.md §4): an animal whose goal lies in the crown it is in moves through that
// crown instead of descending to the ground first; a follower in the same crown keeps to its carer's height. No new
// magnitude: speeds and costs per metre are unchanged.

test('crownMove is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.crownMove, 0);
    assert.equal(crownMoveOn(P), false);
  }
});

/** A tree with a crown wide enough for a move of more than 3 m inside it. */
const wideTree = (w: World): Tree => w.trees.find(t => t.canopy >= 6 && t.height >= 16)!;

test('crownAt and sameCrown: a crown is the canopy radius around the trunk, above the ground, up to the tree\'s height', () => {
  const w = createWorld(48, { profile: 'field' }), t = wideTree(w);
  const [x, , z] = t.position, y = t.height * 0.6;
  assert.equal(crownAt(w, x + 1, y, z)?.id, t.id);
  assert.ok(crownHolds(t, x + t.canopy * 0.9, y, z));
  assert.equal(crownHolds(t, x + t.canopy + 0.5, y, z), false, 'beyond the canopy radius');
  assert.equal(crownHolds(t, x + 1, t.height + 2, z), false, 'above the tree');
  assert.equal(crownAt(w, x + 1, 0, z), undefined, 'on the ground no crown holds the animal');
  assert.ok(sameCrown(w, x - t.canopy * 0.7, y, z, x + t.canopy * 0.7, y, z), 'across the crown');
  assert.equal(sameCrown(w, x - t.canopy * 0.7, y, z, x + t.canopy * 0.7, 0, z), false, 'a goal on the ground is not in the crown');
});

/** Moves `c` from one side of `t`'s crown toward the other for one tick; returns its height after the tick. */
function stepAcross(crownMove: number): { y0: number; y1: number; dh: number } {
  const w = createWorld(48, { profile: 'field', params: { crownMove } }), t = wideTree(w);
  const c = index(w).alive.find(k => k.age >= 15)!;
  const [x, , z] = t.position, y = t.height * 0.6;
  c.position[0] = x - t.canopy * 0.7; c.position[1] = y; c.position[2] = z;
  moveTo(w, c, x + t.canopy * 0.7, y, z, 0.8, 0.3);
  return { y0: y, y1: c.position[1], dh: Math.abs(c.position[0] - (x - t.canopy * 0.7)) };
}

test('moveTo: with crownMove off a goal across the crown sends the animal down first; on, it moves across at its height', () => {
  const off = stepAcross(0), on = stepAcross(1);
  assert.ok(off.y1 < off.y0 && off.dh === 0, `off: descends in place (y ${off.y0} → ${off.y1})`);
  assert.equal(on.y1, on.y0, 'on: keeps its height');
  assert.ok(on.dh > 0, 'on: moves across the crown');
});

test('crownMove on (field): deterministic over a day, JSON-lossless; read where it acts; no counted prescription changes', () => {
  const p = { crownMove: 1 };
  const a = createWorld(48, { profile: 'field', params: p }), b = createWorld(48, { profile: 'field', params: p });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(read.has('crownMove'));
  assert.deepEqual(JSON.parse(JSON.stringify(a)) as World, a);
  assert.equal(prescriptionCount(p).total, prescriptionCount({}).total);
});
