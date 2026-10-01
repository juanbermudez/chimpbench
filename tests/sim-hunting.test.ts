import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { resolveHunt } from '../src/sim/ecology';
import { startAction } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_HUNT, perceive } from '../src/sim/perception';
import { rgMenu } from '../src/sim/rg';
import { chimpCells, ix, simOf } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Hunting fix (docs/staging/hunting-fix.patch.json): the hunt is decided at the colobus encounter (huntEncounter, field),
// and a successful hunt can make several captures (huntExtraKillP).

const run = (w: World, days: number) => { for (let i = 0, n = Math.round(days * 5760); i < n; i++) tickWorld(w); return w; };
const OFF = { huntEncounter: 0, huntExtraKillP: 0 };
const BEFORE = { ...OFF, departPersist: 0, joinLoneW: 0, fruitWaterRelief: 0 }; // the recorded hashes also predate the moving-together and finding-company stages

/** Midday in a field world: adult male `a` of community 1 with a colobus group 40 m east; `company` adult males stand beside him, the others are far away. */
function scene(params: Record<string, number> = {}, company = 1) {
  const w = run(createWorld(33, { profile: 'field', params }), 0.25);
  const males = w.chimps.filter(k => k.alive && k.sex === 'male' && k.age >= 15 && k.troopId === 1), a = males[0];
  males.slice(1).forEach((b, i) => { b.position = i < company ? [a.position[0] + 5 * (i + 1), 0, a.position[2]] : [a.position[0] + 2000 + 50 * i, 0, a.position[2]]; });
  const p = w.prey[0];
  for (const q of w.prey) q.position = [q === p ? a.position[0] + 40 : a.position[0] - 3000, q.position[1], a.position[2]];
  chimpCells(w); // the moved animals into the spatial grid (it is rebuilt once per tick)
  w.environment.rain = 0; a.energy = 1;
  delete simOf(w).lastHunt[a.troopId];
  const x = ix(a);
  x.preyId = -1; x.impulse = 0; x.impulseUntil = -1e9; x.patrolRoll = w.time; // no patrol hazard accrues before this perception
  return { w, a, p, males };
}
const lead = (w: World, a: Chimp) => computeCandidates(w, a, []).find(k => k.action === 'hunt' && candidateMeta.get(k)?.v === V.LEAD);

test('the ablation set reproduces the model before the hunting fix (hash-identical); the fix is on in the field profile only', () => {
  // field seeds 48 and 7 after 3 days, recorded on main before the change (21592c1)
  assert.equal(worldHash(run(createWorld(48, { profile: 'field', params: BEFORE }), 3)), '1f52745b86507338');
  assert.equal(worldHash(run(createWorld(7, { profile: 'field', params: BEFORE }), 3)), '0c43f4c12dd3d172');
  const field = paramsOf(createWorld(33, { profile: 'field' })), compressed = paramsOf(createWorld(33));
  assert.deepEqual([field.huntEncounter, field.huntEncMinMales, field.huntExtraKillP], [1, 2, 0.17]);
  assert.deepEqual([compressed.huntEncounter, compressed.huntExtraKillP], [0, 0]);
});

test('an adult male who meets a colobus group in company may lead a hunt; alone, or with the switch off, he may not', () => {
  const on = scene();
  perceive(on.w, on.a);
  assert.equal(ix(on.a).ownMales, 2);
  assert.deepEqual([ix(on.a).impulse, ix(on.a).impulseTarget], [IMPULSE_HUNT, on.p.id]);
  const k = lead(on.w, on.a);
  assert.ok(k && k.targetId === on.p.id, 'the lead option is offered');
  assert.ok(rgMenu(on.w, on.a, computeCandidates(on.w, on.a, [])).some(o => o.action === 'hunt'), 'and stays on the bounded menu');

  const alone = scene({}, 0);
  perceive(alone.w, alone.a);
  assert.equal(ix(alone.a).ownMales, 1);
  assert.notEqual(ix(alone.a).impulse, IMPULSE_HUNT);
  assert.equal(lead(alone.w, alone.a), undefined, 'no solo hunt');

  const off = scene(OFF);
  perceive(off.w, off.a);
  assert.notEqual(ix(off.a).impulse, IMPULSE_HUNT);
  assert.equal(lead(off.w, off.a), undefined, 'switch off: no hunting day, no hunt');
});

test('the hunt is considered once per encounter: the impulse ends with his next choice and the same group is not a new encounter', () => {
  const { w, a, p } = scene();
  perceive(w, a);
  const rest = computeCandidates(w, a, []).find(k => k.action === 'rest')!;
  startAction(w, a, rest, 'rules');
  assert.equal(ix(a).impulse, 0, 'cleared by the choice');
  perceive(w, a);
  assert.equal(ix(a).preyId, p.id);
  assert.notEqual(ix(a).impulse, IMPULSE_HUNT, 'the group he already perceived is not met again');
  assert.equal(lead(w, a), undefined);
  // out of sight and back: a new encounter
  p.position[0] += 3000; perceive(w, a);
  p.position[0] -= 3000; ix(a).patrolRoll = w.time; perceive(w, a);
  assert.equal(ix(a).impulse, IMPULSE_HUNT);
});

test('rain, low energy and the gap since the community\'s last hunt still close the option; leading starts a hunt others may join', () => {
  for (const [name, spoil] of [['rain', (s: ReturnType<typeof scene>) => { s.w.environment.rain = 0.5; }], ['energy', (s: ReturnType<typeof scene>) => { s.a.energy = 0.2; }],
    ['gap', (s: ReturnType<typeof scene>) => { simOf(s.w).lastHunt[s.a.troopId] = s.w.time - 1; }]] as const) {
    const s = scene();
    perceive(s.w, s.a); spoil(s);
    assert.equal(lead(s.w, s.a), undefined, name);
  }
  const { w, a, p, males } = scene();
  perceive(w, a);
  const huntsBefore = w.stats.hunts; // the warm-up may hold a hunt already
  startAction(w, a, lead(w, a)!, 'rules');
  assert.equal(w.stats.hunts, huntsBefore + 1);
  assert.equal(ix(a).impulse, 0);
  const b = males[1];
  perceive(w, b);
  const join = computeCandidates(w, b, []).find(k => k.action === 'hunt');
  assert.ok(join && join.targetId === p.id && candidateMeta.get(join)?.v === V.JOIN, 'his companion may join');
});

test('with the switch on no hunting day is drawn; one set by the colobus-troop experiment still opens the hunt for 3 adult males', () => {
  const day = (params: Record<string, number>) => Object.keys(simOf(run(createWorld(33, { profile: 'field', params: { huntDayPerMale: 1, ...params } }), 1.01)).huntDay).length;
  assert.equal(day({}), 0);
  assert.equal(day(OFF), 3);
  for (const [company, want] of [[1, false], [2, true]] as const) {
    const { w, a } = scene({}, company);
    perceive(w, a);
    ix(a).impulse = 0; ix(a).impulseUntil = -1e9; // no encounter impulse: only the hunting day
    simOf(w).huntDay[a.troopId] = w.time + 6;
    assert.equal(!!lead(w, a), want, `${company + 1} adult males`);
  }
});

test('captures: each other hunter makes one of his own with huntExtraKillP; 0 keeps one capture per successful hunt', () => {
  for (const [extra, want] of [[1, 3], [0, 1]] as const) {
    const { w, a, p, males } = scene({ huntExtraKillP: extra, huntSuccessMax: 1, huntSuccessRate: 100 }, 2);
    const hunters = males.slice(0, 3), size = p.size;
    for (const c of hunters) { c.position = [p.position[0] + 2, 0, p.position[2]]; c.action = 'hunt'; c.targetId = p.id; c.carryingMeat = 0; }
    const h = { preyId: p.id, troopId: a.troopId, start: w.time, resolveAt: w.time, hunters: hunters.map(c => c.id), interId: -1 };
    simOf(w).hunts.push(h);
    const before = w.interactions.length, successesBefore = w.stats.huntSuccesses; // the warm-up may hold a hunt already
    resolveHunt(w, h);
    assert.equal(w.stats.huntSuccesses, successesBefore + 1);
    assert.equal(size - p.size, want, `${want} taken from the group`);
    assert.equal(hunters.filter(c => c.carryingMeat === 1).length, want);
    const flashes = w.interactions.slice(before).filter(i => i.kind === 'hunt' && i.end !== null);
    assert.equal(flashes.length, want, 'one capture record each (the observer counts them)');
    assert.equal(new Set(flashes.map(i => i.actorId)).size, want, 'by different captors');
  }
});
