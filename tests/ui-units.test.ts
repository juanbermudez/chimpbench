import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from '../src/simulation';
import type { Chimp } from '../src/types';
import { U_AGE, U_ALPHA, U_CHIP, U_NAME, U_SEL, U_STATE, U_VERB, memberOrder, sameOrder, unitChanges, unitLabel, unitState, unitView } from '../src/ui/unit-view';

// Unit grid tiles (src/ui/unit-view.ts): member order, one tile's view, and the in-place diff that keeps DOM writes to
// the fields that changed.

const world = createWorld(48);
const troop = world.troops[0];

test('members: ranked males, ranked females, then the unranked oldest first; living members of that community only', () => {
  const m = memberOrder(world, troop.id);
  const living = world.chimps.filter(c => c.alive && c.troopId === troop.id);
  assert.equal(m.length, living.length);
  assert.ok(m.every(c => c.alive && c.troopId === troop.id));
  const ranked = [...troop.maleHierarchy, ...troop.femaleHierarchy].filter(id => living.some(c => c.id === id));
  assert.deepEqual(m.slice(0, ranked.length).map(c => c.id), ranked, 'hierarchy order first');
  const rest = m.slice(ranked.length);
  for (let i = 1; i < rest.length; i++) assert.ok(rest[i - 1].age >= rest[i].age, 'then oldest first');
  assert.equal(new Set(m.map(c => c.id)).size, m.length, 'no duplicates');
});

test('a dead member leaves the grid', () => {
  const w = createWorld(48), t = w.troops[0];
  const victim = memberOrder(w, t.id)[3];
  victim.alive = false;
  assert.ok(!memberOrder(w, t.id).some(c => c.id === victim.id));
});

test('a tile view: monogram, sex, age class, coarse state, alpha and selection', () => {
  const alpha = world.chimps.find(c => c.id === troop.alphaId)!;
  const v = unitView(alpha, troop.alphaId, alpha.id);
  assert.equal(v.mono, alpha.name.slice(0, 2));
  assert.equal(v.sex, 'male');
  assert.equal(v.alpha, true);
  assert.equal(v.selected, true);
  assert.match(unitLabel(v), new RegExp(`^${alpha.name}, (adult|adolescent) male, .*, alpha\\. `));
  const infant = world.chimps.find(c => c.alive && c.stage === 'infant');
  if (infant) assert.equal(unitView(infant, troop.alphaId, -1).size, 'inf');
});

test('activity states are coarse: several actions share one glyph', () => {
  assert.equal(unitState('forage'), 'feed');
  assert.equal(unitState('hunt'), 'feed');
  assert.equal(unitState('nest'), 'rest');
  assert.equal(unitState('patrol'), 'travel');
  assert.equal(unitState('charge'), 'conflict');
  assert.equal(unitState('alarm'), 'call');
});

test('the diff flags only what changed (nothing when nothing did)', () => {
  const c = { ...memberOrder(world, troop.id)[0] } as Chimp;
  const a = unitView(c, troop.alphaId, -1);
  assert.equal(unitChanges(undefined, a), U_NAME | U_CHIP | U_AGE | U_STATE | U_VERB | U_ALPHA | U_SEL, 'a new tile writes everything');
  assert.equal(unitChanges(a, unitView(c, troop.alphaId, -1)), 0, 'same state: no writes');
  assert.equal(unitChanges(a, unitView(c, troop.alphaId, c.id)), U_SEL, 'selection only');
  c.action = c.action === 'forage' ? 'hunt' : 'forage';
  const b = unitView(c, troop.alphaId, -1);
  assert.equal(unitChanges(a, b) & U_VERB, U_VERB, 'the exact action changed');
  c.action = 'travel';
  const d = unitView(c, troop.alphaId, -1);
  assert.equal(unitChanges(b, d) & (U_STATE | U_VERB), U_STATE | U_VERB, 'the glyph changes with the coarse state');
  assert.equal(unitChanges(d, unitView(c, -1, -1)), U_ALPHA, 'losing the alpha position');
});

test('order check: reorders only when the member order changed', () => {
  const m = memberOrder(world, troop.id);
  assert.equal(sameOrder(m.map(c => c.id), m), true);
  assert.equal(sameOrder(m.map(c => c.id).reverse(), m), m.length < 2);
  assert.equal(sameOrder(m.slice(1).map(c => c.id), m), false);
});
