import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { dayPhase } from '../src/sim/environment';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage C15 (docs/realism-design.md "Stage C15"): foraging choices. C15a: the hunger-independent worth of the fallback
// option (fallbackBase). C15b: a far breakfast lowers the dawn nest drive, and fruiting trees are avoided as nests.

const OFF = { fallbackBase: 0.03, breakfastPlan: 0 };
const field = (params: Record<string, number>) => createWorld(48, { profile: 'field', params });
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); return w; };
/** A copy of the world with other parameter overrides (params are resolved per world object). */
const withParams = (w: World, params: Record<string, number>) => {
  const copy = structuredClone(w), s = (copy as World & { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  s.overrides = { ...s.overrides, ...params };
  return copy;
};
const scoreOf = (w: World, c: Chimp, action: string, targetId?: number) =>
  computeCandidates(w, w.chimps.find(k => k.id === c.id)!, []).find(k => k.action === action && (targetId === undefined || k.targetId === targetId))?.score;

test('C15 defaults: on in the field profile, off in the compressed one', () => {
  const c = paramsOf(createWorld(3)), f = paramsOf(createWorld(3, { profile: 'field' }));
  assert.deepEqual([c.fallbackBase, c.breakfastPlan], [0.03, 0]);
  assert.deepEqual([f.fallbackBase, f.breakfastPlan], [0.191, 1]);
});

test('C15 off reproduces the field model before it (hash-identical); on changes the world', () => {
  // field seed 48 after 2 days on main f24c9ae (moving together in), before C15
  assert.equal(worldHash(run(field(OFF), 2 * 5760)), 'b6e154069d1ec297');
  assert.notEqual(worldHash(run(field({}), 2 * 5760)), 'b6e154069d1ec297');
});

test('C15a: the fallback option is worth fallbackBase more, whatever the hunger', () => {
  const w = run(field(OFF), 1.25 * 5760); // 12:30 on day 2
  let checked = 0;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 15)) {
    const off = scoreOf(structuredClone(w), c, 'forage', -1), on = scoreOf(withParams(w, { fallbackBase: 0.191 }), c, 'forage', -1);
    if (off === undefined || on === undefined) continue;
    assert.ok(on >= off);
    if (off <= 0) continue; // scores are floored at 0 (rain)
    assert.ok(Math.abs(on - off - 0.161) < 0.0021, `fallback worth ${off} -> ${on}`);
    checked++;
  }
  assert.ok(checked > 5, `adults with the fallback option (${checked})`);
});

test('C15b: at dawn a far remembered fruit tree lowers the nest drive, a near one hardly; off leaves it alone', () => {
  const w = run(field(OFF), 5000);
  while (dayPhase(w) !== 'dawn') tickWorld(w);
  const P = paramsOf(withParams(w, { breakfastPlan: 1 }));
  let checked = 0;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 15 && k.action === 'nest' && k.nest)) {
    const remember = (copy: World, metres: number) => {
      const k = copy.chimps.find(q => q.id === c.id)!, t = copy.trees[0];
      k.memory = [{ entityId: t.id, kind: 'tree', seenAt: copy.time, position: [k.position[0] + metres, 0, k.position[2]] }];
      ix(k).treeCrop = { [t.id]: 0.8 };
      return copy;
    };
    const base = scoreOf(remember(structuredClone(w), 4000), c, 'nest');
    const far = scoreOf(remember(withParams(w, { breakfastPlan: 1 }), 4000), c, 'nest');
    const near = scoreOf(remember(withParams(w, { breakfastPlan: 1 }), 100), c, 'nest');
    if (base === undefined || far === undefined || near === undefined) continue;
    const walkMin = (m: number) => Math.min(1, m / P.walkMps / 60 / 80);
    assert.ok(Math.abs(base - far - P.breakfastW * walkMin(4000)) < 0.0021, `far breakfast: ${base} -> ${far}`);
    assert.ok(Math.abs(base - near - P.breakfastW * walkMin(100)) < 0.0021, `near breakfast: ${base} -> ${near}`);
    assert.ok(base - near < 0.2 * (base - far), 'a near breakfast pulls far less');
    checked++;
  }
  assert.ok(checked > 3, `adults in a nest at dawn (${checked})`);
});

test('C15b: fewer night nests are built in a tree bearing fruit', () => {
  const inFruit = (params: Record<string, number>) => {
    const w = run(field(params), 3 * 5760 + 4320); // midnight after 3 days
    let n = 0, fruiting = 0;
    for (const c of w.chimps) {
      if (!c.alive || c.age < 15 || c.action !== 'nest' || !c.nest) continue;
      const t = w.trees.find(k => k.id === c.nest!.treeId)!;
      n++; if (t.fruit > 0.05) fruiting++;
    }
    return fruiting / Math.max(1, n);
  };
  const off = inFruit(OFF), on = inFruit({});
  assert.ok(on < off, `share of adults nesting in a fruiting tree: ${off.toFixed(2)} -> ${on.toFixed(2)}`);
});
