import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, careFollow, computeCandidates, V } from '../src/sim/candidates';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';

// Stage E4g (followCarer; docs/staging/e4g-prereg.md §3): a care follow (a dependent keeping up with its carer) is not a
// departure. Scored on one world state under each setting (party cohesion switched on in the compressed world, as in
// tests/sim-party-food.test.ts), so the scene does not depend on runs diverging.
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48); for (let i = 0; i < 600; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Record<string, number>): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  return w;
};

/** An adult male at rest with a juvenile of his community 5 m away in a care follow of its mother, 8 m away. */
function scene(followCarer: number, carerAct: 'forage' | 'travel', care: number) {
  const w = withParams({ partyFollowW: 1, partyFollowBase: 0.7, partyLeaderFollow: 1, followCarer });
  const alive = (id: number) => w.chimps.some(k => k.id === id && k.alive);
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 20)!;
  const j = w.chimps.find(c => c.alive && c.troopId === m.troopId && c.age >= 5 && c.age < 12 && c.motherId > 0 && c.motherId !== m.id && alive(c.motherId))!;
  const mo = w.chimps.find(k => k.id === j.motherId)!;
  m.action = 'rest'; m.targetId = -1; m.hunger = 0.1;
  j.position = [m.position[0] + 5, 0, m.position[2]]; j.action = 'follow'; j.targetId = mo.id; ix(j).v = care;
  mo.position = [m.position[0] + 8, 0, m.position[2]];
  const tree = w.trees[0];
  if (carerAct === 'travel') { mo.action = 'travel'; mo.targetId = -1; ix(mo).v = V.HOME; }
  else { mo.action = 'forage'; mo.targetId = tree.id; ix(mo).phase = 1; }
  ix(m).seen = [j.id, mo.id];
  const out: Candidate[] = [];
  computeCandidates(w, m, out);
  const follows = (id: number) => out.some(k => k.action === 'follow' && k.targetId === id && candidateMeta.get(k)?.v === V.PARTY);
  return { follows, j, mo, w };
}

test('followCarer: a companion keeping up with its carer is followed today and not with the switch; a carer who travels is followed either way', () => {
  for (const care of [V.MOTHER, V.JUVENILE]) {
    const off = scene(0, 'forage', care);
    assert.ok(careFollow(off.j), 'the scene puts the juvenile in a care follow');
    assert.ok(off.follows(off.j.id), `today: the male follows the juvenile copying its mother's move (care ${care})`);
    assert.ok(!off.follows(off.mo.id), 'a mother walking into a crown is not followed');
    const on = scene(1, 'forage', care);
    assert.ok(!on.follows(on.j.id), `followCarer: the care follow is not a departure (care ${care})`);
    const onTravel = scene(1, 'travel', care);
    assert.ok(onTravel.follows(onTravel.mo.id), 'followCarer: the carer setting off is followed as before');
    assert.ok(!onTravel.follows(onTravel.j.id), 'followCarer: not her follower');
  }
});

test('followCarer is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).followCarer, 0);
});
