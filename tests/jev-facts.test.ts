import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { buildRequest } from '../src/decision';
import { bucketOf, buildFacts, kindOf, UNKNOWN_CROP } from '../src/decide/facts';
import { computeCandidates, V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { forageYield } from '../src/sim/phenology';
import type { SimChimp, SimWorld } from '../src/sim/state';

const x = (c: Chimp) => (c as SimChimp).sim;
const adults = (w: World) => w.chimps.filter(c => c.alive && c.age >= 8);

/** Runs fn with Math.random disabled, so any use of it fails the test. */
function noMathRandom<T>(fn: () => T): T {
  const orig = Math.random;
  Math.random = () => { throw new Error('Math.random used'); };
  try { return fn(); } finally { Math.random = orig; }
}

let field: World | null = null;
/** A field world one day in, with private tree memories, crop beliefs and community known-tree lists. */
function fieldWorld(): World {
  if (field) return field;
  field = createWorld(6301, { profile: 'field' });
  for (let i = 0; i < 5760; i++) tickWorld(field);
  return field;
}

test('facts are pure: no RNG, no Math.random, no change to the world, same answer twice', () => {
  for (const w of [(() => { const c = createWorld(48); for (let i = 0; i < 800; i++) tickWorld(c); return c; })(), fieldWorld()]) {
    const before = JSON.stringify(w), rng = w.rng;
    let checked = 0;
    for (const c of adults(w)) {
      const { options } = buildRequest(w, c);
      const a = noMathRandom(() => buildFacts(w, c, options)), b = buildFacts(w, c, options);
      assert.deepEqual(a, b, `${c.name}: same facts twice`);
      checked++;
    }
    assert.ok(checked > 10);
    assert.equal(w.rng, rng, 'world.rng untouched');
    assert.equal(JSON.stringify(w), before, 'world unchanged');
  }
});

test('facts are deterministic across identical worlds', () => {
  const run = () => { const w = createWorld(21); for (let i = 0; i < 600; i++) tickWorld(w); return adults(w).map(c => buildFacts(w, c, buildRequest(w, c).options)); };
  assert.deepEqual(run(), run());
});

test('facts stay inside perception and private memory, and align with the legal menu', () => {
  const w = fieldWorld(), P = paramsOf(w);
  const known = (w as SimWorld).sim.knownTrees ?? {};
  let menuTrips = 0, memTrips = 0, remembered = 0;
  for (const c of adults(w)) {
    const { options } = buildRequest(w, c), s = buildFacts(w, c, options), h = x(c);
    const legal = computeCandidates(w, c, []);
    assert.equal(s.options.length, options.length);
    s.options.forEach((f, i) => {
      assert.equal(f.index, i); assert.equal(f.action, options[i].action); assert.equal(f.targetId, options[i].targetId);
      assert.ok(legal.some(l => l.action === f.action && l.targetId === f.targetId), `${f.action} ${f.targetId} is legal`);
      if (f.bond !== null && f.action !== 'travel') assert.ok(h.seen.includes(f.targetId), 'partner facts only for individuals in view');
      if (f.kind === 'go_to_food' && f.place) {
        const inMemory = c.memory.some(m => m.kind === 'tree' && m.entityId === f.targetId);
        if (!inMemory && f.place.source === 'menu') { menuTrips++; if (!(h.treeCrop && f.targetId in h.treeCrop)) assert.equal(f.place.crop, UNKNOWN_CROP, 'no belief: the prior, never the community list'); }
        if (inMemory) memTrips++;
      }
    });
    for (const p of s.inSight) assert.ok(h.trees.includes(p.treeId), 'trees in sight come from the perception snapshot');
    for (const p of s.remembered) {
      remembered++;
      assert.equal(p.source, 'memory');
      assert.ok(c.memory.some(m => m.kind === 'tree' && m.entityId === p.treeId), 'remembered trees are the animal\'s own memories');
      assert.ok(!h.trees.includes(p.treeId), 'remembered means out of sight');
      assert.equal(p.crop, h.treeCrop?.[p.treeId] ?? UNKNOWN_CROP, 'believed crop: what the animal last saw, never the true crop');
    }
    for (const m of s.movingOff) assert.ok(h.seen.includes(m.id));
    if (s.water) assert.ok(c.memory.some(m => m.kind === 'water' && m.entityId === s.water!.waterId));
    assert.ok(s.remembered.length <= 3);
    // leaves here: the sim's fallback rate at this spot (fallback depletion is off in the field profile by default)
    assert.ok(Math.abs(s.here.leafRateH - P.fallbackHungerPerH * forageYield(w, c.position[0], c.position[2])) < 1e-12);
  }
  assert.ok(remembered > 0, 'some animals remember out-of-sight trees');
  assert.ok(memTrips + menuTrips > 0, 'some menus hold a trip to a tree');
  assert.ok(Object.keys(known).length > 0, 'the community lists exist (and are not read)');
});

test('ripe fruit feeds 0.18–0.24 hunger per hour in the field profile, and walking lowers the per-hour value', () => {
  const w = fieldWorld();
  for (const c of adults(w).filter(k => k.age >= 12)) {
    const s = buildFacts(w, c, []);
    for (const p of [...s.inSight, ...s.remembered]) {
      assert.ok(p.rateH >= 0.18 && p.rateH <= 0.2421, `rate ${p.rateH}`);
      assert.ok(p.perHourInclWalk <= p.rateH + 1e-12);
      if (p.feedH > 0 && p.distM > 0) assert.ok(p.perHourInclWalk < p.rateH);
    }
  }
});

test('kinds follow what an act is for, and need buckets use the packet words', () => {
  assert.equal(kindOf('charge', V.DEFEND), 'back_ally_or_defend');
  assert.equal(kindOf('charge', V.STATUS), 'contest');
  assert.equal(kindOf('charge', V.STRANGER), 'confront_strangers');
  assert.equal(kindOf('travel', V.TREE), 'go_to_food');
  assert.equal(kindOf('travel', V.TREE, 17), 'keep_with_party', 'a companion\'s trip is keeping with the party');
  assert.equal(kindOf('travel', V.HOME), 'go_home');
  assert.equal(kindOf('flee', V.STRANGERS), 'avoid_strangers');
  assert.equal(kindOf('flee', V.AGGRESSOR), 'escape');
  assert.equal(kindOf('forage', V.NONE), 'eat_here');
  assert.deepEqual([0.39, 0.4, 0.55, 0.7, 0.88].map(bucketOf), ['none', 'mild', 'moderate', 'strong', 'severe']);
});
