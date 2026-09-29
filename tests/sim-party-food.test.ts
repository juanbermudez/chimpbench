import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, tripCost, V } from '../src/sim/candidates';
import { startAction } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { cropFullness, cropTarget, meanFullness } from '../src/sim/phenology';
import { ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate } from '../src/types';

// Stage C7b (field profile): feeding competition, joint travel and intake-rate trip values (docs/staging/c7b-prereg.md).
// All four are implemented but off by default after the direction check (prereg addendum); the tests switch them on.
const C7B = { cropFullExp: 11.9, cropFullMin: 0.3, patchesPerHa: 5.9, followCommit: 1, tripRateValue: 1 };

test('crown fullness: crowns more than half filled are ~10% of fruiting crowns, never below the floor; off in compressed', () => {
  const P = paramsOf(createWorld(3, { profile: 'field', params: C7B }));
  let over = 0, sum = 0, min = 1;
  const n = 20000;
  for (let i = 0; i < n; i++) { const f = cropFullness(P, 100001 + i, 7); sum += f; if (f > 0.5) over++; if (f < min) min = f; }
  assert.ok(Math.abs(over / n - 0.1) < 0.01, `P(f > 1/2) = ${(over / n).toFixed(3)}`);
  assert.ok(min >= P.cropFullMin - 1e-12);
  assert.ok(Math.abs(sum / n - meanFullness(P)) < 0.005, `mean ${(sum / n).toFixed(3)} vs ${meanFullness(P).toFixed(3)}`);
  // a pure function: the same tree and episode always give the same fullness
  assert.equal(cropFullness(P, 123456, 3), cropFullness(P, 123456, 3));
  const C = paramsOf(createWorld(3));
  assert.equal(cropFullness(C, 123456, 3), 1);
  assert.equal(meanFullness(C), 1);
});

test('field crops at their peak are capacity × fullness, so most fruiting crowns are far from full', () => {
  const full = createWorld(21, { profile: 'field', params: { ...C7B, cropFullExp: 0 } }), skew = createWorld(21, { profile: 'field', params: C7B });
  assert.equal(full.trees.length, skew.trees.length);
  let a = 0, b = 0, fruiting = 0, overHalf = 0;
  // sample the crop every 5 days over a year: fullness only scales crops, never creates fruit
  for (let day = 0; day < 365; day += 5) {
    const time = day * 24;
    for (let i = 0; i < full.trees.length; i += 7) {
      const ca = cropTarget(full, full.trees[i], time), cb = cropTarget(skew, skew.trees[i], time);
      assert.ok(cb <= ca + 1e-9);
      if (ca > 0) assert.ok(cb >= ca * paramsOf(skew).cropFullMin - 1e-9);
      a += ca; b += cb;
      if (ca >= 0.5 * full.trees[i].maxFruit) { fruiting++; if (cb >= 0.5 * ca) overHalf++; }
    }
  }
  assert.ok(b / a > 0.25 && b / a < 0.5, `crop ratio ${(b / a).toFixed(2)}`);
  assert.ok(overHalf / fruiting < 0.2, `crowns at least half filled: ${(overHalf / fruiting).toFixed(2)}`);
});

test('the community expectation of known trees uses the mean fullness', () => {
  const w = createWorld(7, { profile: 'field', params: C7B });
  for (let i = 0; i < 5760 + 10; i++) tickWorld(w);
  const P = paramsOf(w), list = simOf(w).knownTrees![w.troops[0].id];
  assert.ok(list.length > 0);
  for (let i = 0; i < list.length; i += 2) {
    const t = w.trees.find(q => q.id === list[i])!;
    assert.ok(list[i + 1] <= t.maxFruit * meanFullness(P) + 1e-3);
  }
});

test('trip cost: intake-rate value in the field (nearer is better, no free scale); linear in compressed', () => {
  const F = paramsOf(createWorld(3, { profile: 'field', params: C7B })), C = paramsOf(createWorld(3));
  // hunger 0.5 and a 0.2 crop: Tf = 0.2 / 0.11 h; Tw = d / walkMps
  const worth = 0.4, tf = Math.min(0.2, 0.5 / F.fruitHungerFactor) / F.fruitIntakePerH;
  for (const d of [100, 500, 1500]) {
    const tw = d / F.walkMps / 3600;
    assert.ok(Math.abs(worth - tripCost(worth, 0.2, d, 0.5, F) - worth * tf / (tw + tf)) < 1e-12);
  }
  assert.ok(tripCost(worth, 0.2, 100, 0.5, F) < tripCost(worth, 0.2, 500, 0.5, F));
  assert.ok(tripCost(worth, 0.2, 500, 0.5, F) < tripCost(worth, 0.2, 1500, 0.5, F));
  assert.ok(tripCost(worth, 0.2, 1500, 0.5, F) < worth, 'a far trip keeps some value');
  assert.equal(tripCost(worth, 0.2, 0, 0.5, F), 0);
  assert.equal(tripCost(worth, 0, 300, 0.5, F), worth, 'an empty tree is worth nothing to walk to');
  // a sated animal gets nothing from any trip
  assert.equal(tripCost(worth, 0.5, 300, 0, F), worth);
  assert.equal(tripCost(worth, 0.2, 120, 0.5, C), 120 / C.travelDistScaleM);
  // off by default: the field keeps the declared no-distance-cost linear scale (C7a review finding 4)
  const D = paramsOf(createWorld(3, { profile: 'field' }));
  assert.equal(D.tripRateValue, 0);
  assert.equal(tripCost(worth, 0.2, 120, 0.5, D), 120 / D.travelDistScaleM);
});

test('joint travel: a party follower of a companion on a committed trip follows until the trip ends (field only)', () => {
  const run = (params: Record<string, number>) => {
    const w = createWorld(48, { profile: 'field', params: { ...C7B, ...params } });
    for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
    const [a, b] = w.chimps.filter(ch => ch.alive && ch.age >= 15 && ch.troopId === 1);
    const far = w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) - 800) < Math.abs(Math.hypot(p.position[0] - a.position[0], p.position[2] - a.position[2]) - 800) ? t : p));
    const trip: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' };
    candidateMeta.set(trip, { v: V.TREE, aux: -1 });
    startAction(w, a, trip, 'rules');
    b.position = [a.position[0] + 10, 0, a.position[2]];
    const follow: Candidate = { action: 'follow', targetId: a.id, score: 1, reason: 'test' };
    candidateMeta.set(follow, { v: V.PARTY, aux: -1 });
    startAction(w, b, follow, 'rules');
    return { lead: ix(a).actEnd - w.time, follow: ix(b).actEnd - w.time, maxBout: paramsOf(w).boutFollowMax / 60 };
  };
  const on = run({}), off = run({ followCommit: 0 });
  assert.ok(on.follow >= on.lead - 1e-9, `follow ${on.follow.toFixed(2)} h vs trip ${on.lead.toFixed(2)} h`);
  assert.ok(off.follow <= off.maxBout + 1e-9 && off.follow < off.lead, 'without followCommit: an ordinary follow bout');
  for (const c of [createWorld(48), createWorld(48, { profile: 'field' })]) {
    assert.equal(paramsOf(c).followCommit, 0);
    assert.equal(paramsOf(c).tripRateValue, 0);
    assert.equal(paramsOf(c).cropFullExp, 0);
  }
});
