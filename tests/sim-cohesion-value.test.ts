import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, companyValue, computeCandidates, forfeitedCompany, mateWorth, V } from '../src/sim/candidates';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E5a (cohesionValue; docs/staging/e5a-prereg.md §3): party cohesion valued from what association yields (a
// companion's company, the food at the goal shared with its feeders, the walk) in place of the weights tuned to party size.

const TUNED = ['partyFollowBase', 'partyFollowW', 'partyFollowMaleW', 'partyFollowHungerW', 'partyStayW', 'joinHooW', 'joinSocialW'];

test('cohesionValue is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).cohesionValue, 0);
});

test('cohesionValue on (field): deterministic over a day; the tuned cohesion weights are never read; parties still follow and join', () => {
  const T = { cohesionValue: 1, followCarer: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  let follows = 0, joined = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(a); tickWorld(b);
    if (i % 31 === 0) for (const c of index(a).alive) {
      if (c.action === 'follow' && ix(c).v === V.PARTY) follows++;
      if (c.action === 'travel' && ix(c).v === V.TREE && ix(c).aux > 0) joined++;
    }
  }
  assert.equal(worldHash(a), worldHash(b));
  for (const id of TUNED) assert.ok(!read.has(id), `${id} is not read`);
  for (const id of ['joinBase', 'joinBondW', 'partyFollowSocialW', 'partyLinkM']) assert.ok(read.has(id), `${id} is read`);
  assert.ok(follows + joined > 0, `party following runs (${follows} follow, ${joined} joined samples)`);
});

// One world state under each setting (compressed world with the field's party switches on, as tests/sim-follow-carer.test.ts).
const snapshot = (() => { let s = ''; return () => { if (!s) { const w = createWorld(48); for (let i = 0; i < 600; i++) tickWorld(w); s = JSON.stringify(w); } return s; }; })();
const withParams = (overrides: Record<string, number>): World => {
  const w = JSON.parse(snapshot()) as World;
  const settings = (w as unknown as { sim: { params: { overrides: Record<string, number> } } }).sim.params;
  settings.overrides = { ...settings.overrides, ...overrides };
  return w;
};
const ON = { partyFollowW: 1, partyFollowBase: 0.7, partyLeaderFollow: 1, partyJoinTrip: 1, joinChoice: 1, cohesionValue: 1 };

/** An adult male at rest; an unrelated adult female of his community 6 m away travels off to a tree; another adult rests 4 m away. */
function scene(over: Record<string, number>, swelling: number, companionAct: 'rest' | 'travel') {
  const w = withParams({ ...ON, ...over });
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 20)!;
  const f = w.chimps.find(c => c.alive && c.troopId === m.troopId && c.sex === 'female' && c.age > 15 && c.motherId !== m.id && m.motherId !== c.id && c.id !== m.motherId)!;
  const k = w.chimps.find(c => c.alive && c.troopId === m.troopId && c.age >= 15 && c !== m && c !== f)!;
  m.action = 'rest'; m.targetId = -1; m.hunger = 0.3;
  f.position = [m.position[0] + 6, 0, m.position[2]]; f.swelling = swelling;
  const tree = w.trees.find(t => Math.hypot(t.position[0] - m.position[0], t.position[2] - m.position[2]) > 20)!;
  f.action = 'travel'; f.targetId = tree.id; ix(f).v = V.TREE; ix(f).aux = -1;
  k.position = [m.position[0], 0, m.position[2] + 4];
  if (companionAct === 'travel') { k.action = 'travel'; k.targetId = -1; ix(k).v = V.HOME; } else { k.action = 'rest'; k.targetId = -1; }
  ix(m).seen = [f.id, k.id];
  const out: Candidate[] = [];
  computeCandidates(w, m, out);
  const join = out.find(c => c.action === 'travel' && c.targetId === tree.id && candidateMeta.get(c)?.v === V.TREE);
  return { w, m, f, k, out, join, P: paramsOf(w) };
}

test('companyValue: a fertile unrelated female is worth her mating value more to an adult male; forfeit counts settled companions only', () => {
  const s0 = scene({}, 0, 'rest'), s1 = scene({}, 1, 'rest');
  assert.ok(Math.abs(companyValue(s1.m, s1.f, s1.P) - companyValue(s0.m, s0.f, s0.P) - mateWorth(s1.m, s1.f)) < 1e-12);
  assert.ok(companyValue(s0.m, s0.f, s0.P) >= s0.P.joinBase);
  // the resting companion is forfeited by leaving; the travelling female is not (she is leaving herself)
  assert.equal(forfeitedCompany(s0.w, s0.m, s0.P), companyValue(s0.m, s0.k, s0.P));
  const t = scene({}, 0, 'travel');
  assert.equal(forfeitedCompany(t.w, t.m, t.P), 0);
});

test('cohesionValue: joining her trip is offered and is worth more with a fertile female; the tuned weights do not move it', () => {
  const s0 = scene({}, 0, 'rest'), s1 = scene({}, 1, 'rest');
  assert.ok(s0.join && s1.join, 'the joint trip is offered');
  assert.ok(Math.abs(s1.join!.score - s0.join!.score - mateWorth(s1.m, s1.f)) < 1e-9, 'the mating value is added to her company');
  // a second companion travelling home 4 m away brings in the plain party follow (V.PARTY)
  const W = { partyFollowBase: 0.1, partyFollowW: 0.3, partyFollowMaleW: 0, partyStayW: 0.2, joinHooW: 0.5, joinSocialW: 0.1 };
  const base = scene({}, 0, 'travel'), moved = scene(W, 0, 'travel');
  assert.ok(base.out.some(c => c.action === 'follow' && c.targetId === base.k.id && candidateMeta.get(c)?.v === V.PARTY), 'the plain follow is offered');
  assert.deepEqual(moved.out.map(c => [c.action, c.targetId, c.score]), base.out.map(c => [c.action, c.targetId, c.score]));
  // without the switch the same scene is scored by the tuned weights (the test exercises them)
  const off0 = scene({ cohesionValue: 0 }, 0, 'travel'), off1 = scene({ cohesionValue: 0, ...W }, 0, 'travel');
  assert.ok(off0.join, 'the joint trip is offered without the switch');
  assert.notDeepEqual(off1.out.map(c => c.score), off0.out.map(c => c.score), 'the tuned weights move scores without the switch');
});
