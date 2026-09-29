import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { candidateMeta, computeCandidates, guardianOf, V } from '../src/sim/candidates';
import { observe } from '../src/sim/observe';
import { paramsOf } from '../src/sim/params';
import { index, ix, markAliveChanged, NEVER } from '../src/sim/state';
import type { Candidate, Chimp, World } from '../src/types';

// Stage C8 guardian levers (docs/staging/early-life-prereg.md §2.1–2.5, §4.1).

const day = (seed: number) => { const w = createWorld(seed); while (w.hour < 10) tickWorld(w); return w; };

/**
 * A feeding-supplant scene: an adult female `c` feeds in a scarce crown with an unrelated juvenile `o`; `o`'s mother `g`
 * outranks `c` and sits next to `o`, in `c`'s sight.
 */
function scene(seed = 48): { w: World; c: Chimp; o: Chimp; g: Chimp } {
  const w = day(seed), alive = index(w).alive;
  const o = alive.find(k => k.age >= 5 && k.age < 12 && k.motherId > 0 && alive.some(m => m.id === k.motherId && m.troopId === k.troopId))!;
  const g = alive.find(m => m.id === o.motherId)!;
  const c = alive.find(k => k.troopId === o.troopId && k.sex === 'female' && k.age >= 15 && k.id !== g.id && k.motherId !== g.id && g.motherId !== k.id && !(k.motherId > 0 && k.motherId === g.motherId) && k.motherId !== o.id && o.motherId !== k.id)!;
  assert.ok(o && g && c, 'scene individuals');
  const t = w.trees[0];
  t.fruit = 0.1;
  for (const k of [c, o]) { k.action = 'forage'; k.targetId = t.id; k.position = [t.position[0] + (k === c ? 1 : 2), 0, t.position[2]]; }
  g.position = [o.position[0] + 1, 0, o.position[2]]; g.action = 'rest'; g.targetId = -1;
  g.elo = c.elo + 200;
  const x = ix(c);
  x.trees = [t.id]; x.seen = [o.id, g.id]; x.lastAgg = NEVER; x.lostAt = NEVER; c.hunger = 0.95; w.environment.fruitIndex = 0.1;
  return { w, c, o, g };
}
const feedScore = (w: World, c: Chimp, o: Chimp): number | null => {
  const out: Candidate[] = [];
  computeCandidates(w, c, out);
  const k = out.find(q => q.action === 'charge' && q.targetId === o.id && candidateMeta.get(q)?.v === V.FEED);
  return k ? k.score : null;
};

test('guardianOf: the mother, else the caretaker while the ward is under guardMaxAgeY, else nothing; never across communities', () => {
  const w = createWorld(48), P = paramsOf(w), alive = index(w).alive;
  const o = alive.find(k => k.age >= 5 && k.age < 10 && alive.some(m => m.id === k.motherId))!;
  const mother = alive.find(m => m.id === o.motherId)!;
  assert.equal(guardianOf(w, o), mother);
  const carer = alive.find(k => k.troopId === o.troopId && k.sex === 'female' && k.age > 20 && k !== mother)!;
  mother.alive = false; markAliveChanged(w);
  assert.equal(guardianOf(w, o), undefined, 'no caretaker yet');
  ix(o).caretaker = carer.id;
  assert.equal(guardianOf(w, o), carer);
  const age = o.age; o.age = P.guardMaxAgeY;
  assert.equal(guardianOf(w, o), undefined, 'a caretaker is honoured only to independence');
  o.age = age; carer.troopId = o.troopId === 1 ? 2 : 1;
  assert.equal(guardianOf(w, o), undefined, 'not across communities');
});

test('feeding tolerance: a seen, close, undominated guardian lowers the supplant score by exactly guardFeedDeterW', () => {
  const { w, c, o, g } = scene(), P = paramsOf(w);
  const near = feedScore(w, c, o);
  g.position = [o.position[0] + P.defendRangeM + 5, 0, o.position[2]];
  const far = feedScore(w, c, o);
  assert.ok(near !== null && far !== null, 'a feeding supplant is offered in both');
  assert.ok(Math.abs((far! - near!) - P.guardFeedDeterW) < 0.0015, `drop ${(far! - near!).toFixed(3)}`);
});

test('no deterrence when the guardian is out of range, unseen, dominated or dead; adult males are never deterred', () => {
  const base = () => { const s = scene(); s.g.position = [s.o.position[0] + paramsOf(s.w).defendRangeM + 5, 0, s.o.position[2]]; return feedScore(s.w, s.c, s.o)!; };
  const ref = base();
  const unseen = scene(); ix(unseen.c).seen = [unseen.o.id];
  assert.equal(feedScore(unseen.w, unseen.c, unseen.o), ref, 'unseen');
  const dominated = scene(); dominated.g.elo = dominated.c.elo - 200;
  assert.equal(feedScore(dominated.w, dominated.c, dominated.o), ref, 'dominated by the supplanter');
  const dead = scene(); dead.g.alive = false; markAliveChanged(dead.w);
  assert.equal(feedScore(dead.w, dead.c, dead.o), ref, 'dead');
  // an adult male dominates every female: never deterred
  const m = scene(), male = index(m.w).alive.find(k => k.troopId === m.o.troopId && k.sex === 'male' && k.age >= 15 && k.motherId !== m.g.id)!;
  Object.assign(male, { action: 'forage', targetId: m.c.targetId, position: [...m.c.position], hunger: 0.95 });
  Object.assign(ix(male), { trees: [...ix(m.c).trees], seen: [m.o.id, m.g.id], lastAgg: NEVER, lostAt: NEVER });
  m.c.position = [500, 0, 500];
  const withG = feedScore(m.w, male, m.o);
  m.g.position = [m.o.position[0] + paramsOf(m.w).defendRangeM + 5, 0, m.o.position[2]];
  assert.equal(withG, feedScore(m.w, male, m.o), 'adult male');
});

test('a guardian never supplants its ward', () => {
  const { w, c, o, g } = scene();
  g.alive = false; markAliveChanged(w);
  assert.ok(feedScore(w, c, o) !== null, 'an unrelated adult may supplant the orphan');
  ix(o).caretaker = c.id;
  assert.equal(guardianOf(w, o), c);
  assert.equal(feedScore(w, c, o), null, 'the caretaker does not');
});

test('computeCandidates and observe() stay pure with guardians present', () => {
  const { w, c, o } = scene();
  const before = structuredClone(w), rng = w.rng;
  const out: Candidate[] = [];
  computeCandidates(w, c, out); computeCandidates(w, o, out); observe(w, c); observe(w, o);
  assert.equal(w.rng, rng);
  assert.deepEqual(w.chimps.map(k => [k.id, k.action, k.hunger, k.position, ix(k).seen]), before.chimps.map(k => [k.id, k.action, k.hunger, k.position, ix(k).seen]));
});
