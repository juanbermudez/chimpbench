import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sampleR8, hashWithoutOwn, packetsOf, type CapturedDecision } from '../scripts/r8-contexts';
import { r15Packet, r15TrainingRows } from '../scripts/lib/r15-training';
import { rulesTap } from '../src/sim/decide';
import { rgTap } from '../src/sim/rg';
import { createWorld, tickWorld } from '../src/simulation';
import { record } from '../src/sim/context-check';

const raw: unknown = JSON.parse(readFileSync('docs/staging/integrator-kit/params/M6-W50.json', 'utf8'));
if (!record(raw) || !Object.values(raw).every(v => typeof v === 'number')) throw new Error('invalid W50 fixture');
const params: Record<string, number> = {};
for (const [key, value] of Object.entries(raw)) if (typeof value === 'number') params[key] = value;
const ticks = 120;
const options = { seed: 48, base: 'W50', params, burnIn: 0, days: ticks / 5760, p: .5, tag: 'r15' };

test('capture keeps historical selection, classification and trajectory; legacy records still render all four packets', () => {
  const legacy = sampleR8(options), captured: CapturedDecision[] = [];
  const direct = sampleR8({ ...options, capture(row) { captured.push(row); } });
  assert.ok(legacy.recs.length > 0, 'actual sampler produced decisions');
  assert.deepEqual(captured.map(r => [r.id, r.label]), legacy.recs.map(r => [r.id, r.label]));
  assert.deepEqual(captured.map(r => r.request.context), legacy.recs.map(r => r.context));
  assert.equal(direct.hash, legacy.hash);
  assert.deepEqual(direct.decisions, legacy.decisions);
  assert.deepEqual(direct.skipped, legacy.skipped);
  assert.deepEqual(direct.recs, []);
  for (const row of legacy.recs) {
    assert.deepEqual(Object.keys(row.packets), ['state', 'neutral', 'own', 'ownShort']);
    assert.deepEqual(row.packets, packetsOf(row.context));
  }
});

test('real sampled R15 requests reach packet export and scaffold labels without touching legacy variants or changing the world', () => {
  const resourceParams = { ...params, resourceTargets: 1, activityFirst: 2, observeV5: 1, menuParity: 1 };
  let fresh = 0, labeled = 0, calls = 0;
  const sampled = sampleR8({ ...options, params: resourceParams, p: 1,
    capture(row, live) {
      calls++;
      assert.equal(row.request.context.resourceChoice, 'kind');
      assert.deepEqual(r15Packet(row.request.context), r15Packet(JSON.parse(JSON.stringify(row.request.context))));
      if (row.label !== 'fresh') return;
      fresh++;
      if (fresh !== 1) return;
      const before = JSON.stringify(live.w);
      const result = r15TrainingRows(live.w, live.c, row.request, `sampled:${row.id}`);
      assert.deepEqual(result.exclusions, []);
      for (const resultRow of result.rows) {
        assert.deepEqual(resultRow.packet, r15Packet(resultRow.context));
        assert.ok(Math.abs(Object.values(resultRow.soft).reduce((a, b) => a + b, 0) - 1) < 1e-8);
      }
      assert.equal(JSON.stringify(live.w), before);
      labeled = result.rows.length;
    } });
  assert.ok(calls > 0 && fresh > 0 && labeled > 0, `calls=${calls}, fresh=${fresh}, labels=${labeled}`);
  const plain = createWorld(48, { profile: 'field', params: resourceParams });
  for (let i = 0; i < ticks; i++) tickWorld(plain);
  assert.equal(sampled.hash, hashWithoutOwn(plain));
  assert.equal(rulesTap.fn, null); assert.equal(rgTap.fn, null);
});

test('capture failures clear global taps, and capture cannot coexist with the legacy extension hook', () => {
  assert.throws(() => sampleR8({ ...options, p: 1, capture() { throw new Error('capture-fixture'); } }), /capture-fixture/);
  assert.equal(rulesTap.fn, null); assert.equal(rgTap.fn, null);
  assert.throws(() => Reflect.apply(sampleR8, undefined, [{ ...options, capture() {}, extend() {} }]), /mutually exclusive/);
});
