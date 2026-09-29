import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { startAction } from '../src/sim/execution';
import { dailyKnownTrees } from '../src/sim/foraging';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { ix, simOf } from '../src/sim/state';
import { cellAt, gridOf, levels } from '../src/sim/territory';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate } from '../src/types';

// Stage C7a (field profile): goal-directed foraging (docs/realism-design.md "C7a mechanisms").

test('crop capacity scales with crown area and keeps each species mean (cropSkewExp)', () => {
  const flat = createWorld(48, { profile: 'field', params: { cropSkewExp: 0 } }), skew = createWorld(48, { profile: 'field' });
  assert.equal(flat.trees.length, skew.trees.length);
  const bySp = (w: typeof flat) => { const m = new Map<string, number[]>(); for (const t of w.trees) (m.get(t.species) ?? m.set(t.species, []).get(t.species)!).push(t.maxFruit); return m; };
  const a = bySp(flat), b = bySp(skew);
  for (const [sp, v] of a) {
    const ma = v.reduce((x, y) => x + y, 0) / v.length, mb = b.get(sp)!.reduce((x, y) => x + y, 0) / v.length;
    assert.ok(Math.abs(mb / ma - 1) < 0.1, `${sp}: mean ${ma.toFixed(3)} → ${mb.toFixed(3)}`);
  }
  // larger crowns hold more fruit within a species
  const t0 = skew.trees.find(t => t.species === 'Celtis durandii')!;
  const same = skew.trees.filter(t => t.species === t0.species);
  const big = same.reduce((p, t) => (t.canopy > p.canopy ? t : p)), small = same.reduce((p, t) => (t.canopy < p.canopy ? t : p));
  assert.ok(big.maxFruit > small.maxFruit);
});

test('each day a community lists its best-known productive trees inside its familiar range; compressed worlds list none', () => {
  const w = createWorld(7, { profile: 'field' });
  for (let i = 0; i < 5760 + 10; i++) tickWorld(w);
  const s = simOf(w), P = paramsOf(w), g = gridOf(w, P), L = levels(w);
  for (const t of w.troops) {
    const list = s.knownTrees?.[t.id] ?? [];
    assert.ok(list.length > 0 && list.length <= 2 * P.knownTreesK, `${t.name}: ${list.length / 2} trees`);
    for (let i = 0; i < list.length; i += 2) {
      const tree = w.trees.find(q => q.id === list[i])!;
      assert.ok(L[t.id][cellAt(g, tree.position[0], tree.position[2])] <= P.udRangeLevel);
      if (i >= 2) assert.ok(list[i + 1] <= list[i - 1], 'sorted by expected crop');
    }
  }
  const c = createWorld(7);
  dailyKnownTrees(c);
  assert.equal(simOf(c).knownTrees, undefined);
});

test('an animal remembers the crop it saw in a remembered tree (field only)', () => {
  const w = createWorld(21, { profile: 'field' });
  for (let i = 0; i < 5760 / 2; i++) tickWorld(w);
  const withBelief = w.chimps.filter(c => c.alive && ix(c).treeCrop && Object.keys(ix(c).treeCrop!).length);
  assert.ok(withBelief.length > 0);
  for (const c of withBelief) for (const [id, v] of Object.entries(ix(c).treeCrop!)) {
    assert.ok(Number.isFinite(v) && v >= 0);
    assert.ok(+id > 100000 && +id < 200000, 'beliefs are about trees');
  }
  const c = createWorld(21);
  for (let i = 0; i < 2000; i++) tickWorld(c);
  assert.ok(c.chimps.every(ch => ix(ch).treeCrop === undefined));
});

test('a trip to a remembered tree lasts the walk (travelCommit), and party followers follow the leader, not a follower', () => {
  const w = createWorld(48, { profile: 'field' });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const [a, b, c] = w.chimps.filter(ch => ch.alive && ch.age >= 15 && ch.troopId === 1);
  const far = w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) - 800) < Math.abs(Math.hypot(p.position[0] - a.position[0], p.position[2] - a.position[2]) - 800) ? t : p));
  const cand: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' };
  candidateMeta.set(cand, { v: V.TREE, aux: -1 });
  startAction(w, a, cand, 'rules');
  const walkH = Math.hypot(far.position[0] - a.position[0], far.position[2] - a.position[2]) / paramsOf(w).walkMps / 3600;
  assert.ok(ix(a).actEnd - w.time >= walkH, `bout ${(ix(a).actEnd - w.time).toFixed(2)} h vs walk ${walkH.toFixed(2)} h`);
  // b follows a; c sees both: c's party-follow candidate targets the leader a
  b.position = [a.position[0] + 8, 0, a.position[2]]; c.position = [a.position[0] + 20, 0, a.position[2]];
  b.action = 'follow'; b.targetId = a.id; ix(b).v = V.PARTY;
  c.action = 'rest'; c.targetId = -1;
  perceive(w, c);
  const out = computeCandidates(w, c, []);
  const follows = out.filter(k => k.action === 'follow' && candidateMeta.get(k)?.v === V.PARTY).map(k => k.targetId);
  assert.ok(!follows.includes(b.id), 'no follow of a follower');
  if (follows.length) assert.ok(follows.includes(a.id));
});
