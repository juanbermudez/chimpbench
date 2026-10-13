import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnQuestion } from '../server/decide';
import { createWorld, observe } from '../src/simulation';
import { r14Arm, r14Refusal, selectRows, stateOf, stratumOf, type SelectionRow } from '../scripts/lib/r14';

const world = createWorld(48), chimp = world.chimps.find(c => c.alive)!;
const packet = buildOwnQuestion(observe(world, chimp), { variant: 'short' });
const withState = (state: Record<string, unknown>) => ({ ...packet, state });

test('R14 strata read only the words the kernel sees, with darkness distinct from dusk', () => {
  assert.equal(stratumOf(withState({ doing: 'in my nest, 930 min', now: 'full daylight; clear' })), 'dayNest');
  assert.equal(stratumOf(withState({ doing: 'in my nest, 930 min', now: 'dim light, getting darker; clear' })), 'aloneDusk');
  assert.equal(stratumOf(withState({ doing: 'in my nest, 930 min', now: 'dim light, getting lighter; clear' })), 'plain');
  assert.equal(stratumOf(withState({ doing: 'was in my nest for 930 min; my act ended', now: 'dark; clear' })), 'darkOut');
  assert.equal(stratumOf(withState({ doing: 'building a nest in fig, 2 min', now: 'dark; clear' })), 'darkOut');
  assert.equal(stratumOf(withState({ doing: 'in my nest, 30 min', now: 'dim light, getting darker; clear', nearby: ['A: resting'] })), 'plain');
});

test('selection cannot depend on labels or input ordering; test guard quota never enters training', () => {
  const records: SelectionRow[] = Array.from({ length: 4000 }, (_, i) => ({ id: `ask-${i}`, chimpId: i % 40, day: i % 10,
    split: i < 2000 ? 'train' : 'test', stratum: 'dayNest', state: stateOf(withState({ doing: 'in my nest, 900 min', now: 'full daylight; clear' })) }));
  assert.deepEqual(selectRows(records, 'learner').map(r => r.id), selectRows([...records].reverse(), 'learner').map(r => r.id));
  const picked = selectRows(records, 'learner');
  assert.equal(picked.filter(r => r.split === 'train' && r.selectedVia === 'plain').length, 780);
  const counts = new Map<string, number>();
  for (const r of picked.filter(r => r.selectedVia === 'dayNest')) { const k = `${r.split}:${r.chimpId}:${r.day}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
  assert.ok([...counts.values()].every(n => n <= 2));
  assert.equal(new Set(picked.map(r => r.id)).size, picked.length);
  assert.equal(selectRows(records, 'rules').filter(r => r.split === 'train').length, 0);
});

test('R14 arms preserve P5b and draw; registration rejects a different source/seed/window', () => {
  const arm = r14Arm('r14-source-s7-draw-1'); assert.ok(arm);
  assert.equal(arm.adapter, 'r11-p5b-s7'); assert.deepEqual(arm.decode, { mode: 'draw', salt: 1, hold: 'act' });
  assert.equal(r14Arm('r14-source-s7-top'), null);
  const check = (seed: number, days = 10) => r14Refusal(arm, seed, days, 30, 'field', 'docs/staging/integrator-kit/params/M6-W50.json', true, 120, true);
  assert.equal(check(48), ''); assert.equal(check(21), ''); assert.notEqual(check(7), ''); assert.notEqual(check(4333), ''); assert.notEqual(check(48, 5), '');
});

test('real P5b rendering preserves the registered full-daylight boundary and dark trend suppression', () => {
  const context = observe(world, chimp);
  const render = (level: number, trend: number) => buildOwnQuestion({ ...context, light: { level, trend } }, { variant: 'short' });
  assert.equal(stateOf(render(.97, .1)).day, true);
  assert.equal(stateOf(render(.969, .1)).day, false);
  assert.equal(stateOf(render(.01, -.1)).dark, true);
  assert.equal(stateOf(render(.01, -.1)).dusk, false);
});
