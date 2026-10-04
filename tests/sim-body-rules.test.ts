import assert from 'node:assert/strict';
import test from 'node:test';
import { guardBySize, guardianOf, wardHoldsOwn } from '../src/sim/candidates';
import { coalitionKin } from '../src/sim/conflict';
import { assessOdds } from '../src/sim/hierarchy';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E4o (bodyRules; docs/staging/e4o-prereg.md §5), a sum of bits. Bit 1: protection follows the ward's own strength:
// a guardian deters a charger, and defends its ward, while the ward cannot hold its own against that animal (E4h
// assessOdds below even), at any age; a caretaker stays guardian and coalition kin at any age, as a mother does.

test('bodyRules is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).bodyRules, 0);
});

test('bit 1: a ward holds its own when its assessed chance against the threat is at least even', () => {
  const w = createWorld(48, { profile: 'field', params: { bodyRules: 1 } }), P = paramsOf(w);
  assert.ok(guardBySize(P));
  const alive = index(w).alive;
  const infant = alive.find(c => c.age < 4)!, male = alive.find(c => c.sex === 'male' && c.age >= 20)!;
  assert.ok(infant && male);
  assert.equal(wardHoldsOwn(w, infant, male, P), assessOdds(w, infant, male, P) >= 0.5);
  assert.equal(wardHoldsOwn(w, infant, male, P), false, 'an infant cannot hold its own against an adult male');
  assert.equal(wardHoldsOwn(w, male, infant, P), true, 'an adult male holds its own against an infant');
});

test('bit 1: an adoptive caretaker stays guardian and coalition kin past guardMaxAgeY; bit 0 keeps the age limit', () => {
  for (const bodyRules of [0, 1]) {
    const w = createWorld(48, { profile: 'field', params: { bodyRules } }), P = paramsOf(w);
    const alive = index(w).alive;
    // an orphan of 13 y with a living caretaker in its community (constructed: the mother is marked dead)
    const ward = alive.find(c => c.age >= P.guardMaxAgeY && c.age < 16 && c.motherId > 0)!;
    const keeper = alive.find(c => c.sex === 'female' && c.age >= 20 && c.troopId === ward.troopId && c.id !== ward.motherId)!;
    assert.ok(ward && keeper);
    const mother = index(w).byId.get(ward.motherId);
    if (mother) mother.alive = false;
    ix(ward).caretaker = keeper.id;
    const g = guardianOf(w, ward);
    assert.equal(g?.id, bodyRules ? keeper.id : undefined, `bodyRules ${bodyRules}`);
    assert.equal(coalitionKin(keeper, ward, P), bodyRules !== 0 && P.maternalLevers === 1);
  }
});

test('bodyRules 1 (field): deterministic over a day, JSON-lossless; guardMaxAgeY is not read; count −1', () => {
  const T = { contestAssess: 1, bodyRules: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('guardMaxAgeY'), 'guardMaxAgeY is not read');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const base = prescriptionCount({}).total;
  assert.equal(prescriptionCount({ bodyRules: 1 }).total, base - 1);
});

test('bit 0 reads guardMaxAgeY, so the switch is what removes it', () => {
  const w = createWorld(48, { profile: 'field', params: { contestAssess: 1 } });
  const read = new Set<string>();
  traceParamReads(w, read);
  for (let i = 0; i < 5760; i++) tickWorld(w);
  assert.ok(read.has('guardMaxAgeY'));
});
