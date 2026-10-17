import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { WAKE_NEAR_M, experimentTarget, partyWaking, wakeWatch } from '../src/ui/watch-rules';
import type { Chimp } from '../src/types';

// Stage W14: interface rules for the animal a user watches (src/ui/watch-rules.ts).

test('the dawn fast-forward ends as the first of the party leaves its nest, before the selected animal does', () => {
  const w = createWorld(48, { profile: 'field' });
  w.modelPolicy.mode = 'off';
  const west = w.troops.find(t => /west/i.test(t.name))!, sel = w.chimps.find(c => c.id === west.alphaId)!;
  const watch = wakeWatch(w, sel);
  assert.ok(watch.includes(sel) && watch.length >= 5, `the alpha and his party (${watch.length})`);
  for (const c of watch) assert.equal(c.action, 'nest');
  for (const c of w.chimps) if (c.alive && c.action === 'nest' && Math.hypot(c.position[0] - sel.position[0], c.position[2] - sel.position[2]) <= WAKE_NEAR_M) assert.ok(watch.includes(c), 'everyone asleep within 40 m');
  assert.equal(partyWaking(watch), false);
  let first = -1, alpha = -1;
  for (let t = 0; t < 200 && (first < 0 || alpha < 0); t++) {
    tickWorld(w);
    if (first < 0 && partyWaking(watch)) first = w.tick;
    if (alpha < 0 && sel.action !== 'nest') alpha = w.tick;
  }
  assert.ok(first > 0 && alpha > 0);
  // In this world the alpha is among the last of ten to wake: watched alone (the old rule) the whole party had come
  // down at 10 min/s before the fast-forward ended.
  assert.ok(first < alpha, `the first riser at tick ${first}, the alpha at ${alpha}`);
});

test('with nobody asleep the fast-forward ends at once', () => {
  assert.equal(partyWaking([]), true);
  assert.deepEqual(wakeWatch(createWorld(7, { profile: 'field' }), undefined), []);
});

const at = (id: number, x: number, o: Partial<Chimp> = {}) => ({ id, alive: true, position: [x, 0, 0], troopId: 1, stage: 'adult', controller: 'rules', ...o }) as unknown as Chimp;

test('an experiment keeps the selected animal when it reaches it', () => {
  const sel = at(4, 0), far = at(7, 690), alive = [sel, far];
  // Storm: habitat-wide, model off. Before, the adult of the community nearest the stimulus (here 690 m away) took over.
  assert.equal(experimentTarget({ scope: 'habitat', selected: sel, alive, at: [700, 0, 0], radius: 40, troopId: 1, modelOn: false, rosterSelected: false }), sel);
  // A community experiment reaches the selected animal of that community.
  assert.equal(experimentTarget({ scope: 'community', selected: sel, alive, at: [700, 0, 0], radius: 40, troopId: 1, modelOn: false, rosterSelected: false }), sel);
  // A party experiment whose radius does not reach it picks, as before, the nearest adult of the community.
  assert.equal(experimentTarget({ scope: 'party', selected: sel, alive, at: [690, 0, 0], radius: 40, troopId: 1, modelOn: false, rosterSelected: false }), far);
  // With the model on, an animal the model does not drive gives way to the nearest one it does.
  const driven = at(9, 600, { controller: 'model' } as Partial<Chimp>);
  assert.equal(experimentTarget({ scope: 'habitat', selected: sel, alive: [sel, far, driven], at: [700, 0, 0], radius: 40, troopId: 1, modelOn: true, rosterSelected: false }), driven);
  // The 'selected' roster hands the selected animal to the model: it stays.
  assert.equal(experimentTarget({ scope: 'habitat', selected: sel, alive: [sel, far, driven], at: [700, 0, 0], radius: 40, troopId: 1, modelOn: true, rosterSelected: true }), sel);
  // Nothing selected: as before.
  assert.equal(experimentTarget({ scope: 'habitat', selected: undefined, alive, at: [700, 0, 0], radius: 40, troopId: 1, modelOn: false, rosterSelected: false }), far);
});
