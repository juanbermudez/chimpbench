import assert from 'node:assert/strict';
import test from 'node:test';
import { bucketOf, optionClass, QUOTA, sampleWorld, type SampleOptions } from '../scripts/ft-contexts';
import { V } from '../src/sim/candidates';

const small: SampleOptions = { split: 'test', seed: 3001, days: 2, warmupDays: 0.5, perWorld: 12, minAge: 8, captureP: 0.08, spacingH: 2, perChimp: 6 };

test('fine-tune contexts are deterministic for a seed', () => {
  assert.deepEqual(sampleWorld(small), sampleWorld(small));
});

test('fine-tune contexts are real choices with aligned aliases and option classes', () => {
  const rows = sampleWorld(small);
  assert.ok(rows.length >= 8, `only ${rows.length} contexts`);
  for (const r of rows) {
    const criteria = r.packet.questions.action.criteria;
    assert.deepEqual(Object.keys(criteria), r.options.map(o => o.alias));
    assert.ok(r.options.length >= 2 && r.options.length <= 8);
    assert.ok(r.age >= small.minAge);
    assert.equal(r.bucket, bucketOf(r.options.map(o => o.cls)));
    assert.ok(r.rulesIndex >= 0 && r.rulesIndex < r.options.length, 'rules pick is offered');
  }
  assert.ok(Math.abs(Object.values(QUOTA).reduce((a, b) => a + b, 0) - 1) < 1e-9);
});

test('option classes separate coalition support and defence from contest aggression', () => {
  assert.equal(optionClass('charge', V.STATUS), 'aggressive');
  assert.equal(optionClass('charge', V.FEED), 'aggressive');
  assert.equal(optionClass('charge', V.COALITION), 'collective');
  assert.equal(optionClass('charge', V.DEFEND), 'protective');
  assert.equal(optionClass('call', V.COUNTERCALL), 'aggressive');
  assert.equal(optionClass('call', V.FOODCALL), 'affiliative');
  assert.equal(optionClass('groom', V.NONE), 'affiliative');
  assert.equal(optionClass('patrol', V.JOIN), 'collective');
  assert.equal(optionClass('flee', V.AGGRESSOR), 'avoidant');
  assert.equal(optionClass('drink', V.NONE), 'maintenance');
});
