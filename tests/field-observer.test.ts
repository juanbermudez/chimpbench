import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { killChimp } from '../src/sim/life';
import { index } from '../src/sim/state';
import type { Action, Interaction, World } from '../src/types';
import { ACTIONS, ACTION_CODE, BASE_CATEGORY, CAT_AGONISTIC, CAT_FEED, CAT_GROOM, CAT_NONE, CAT_REST, CAT_SOCIAL, CAT_TRAVEL, activityCategory } from '../src/field/categories';
import { classifyPatrols, patrolAccuracy, PATROL_RULE } from '../src/field/classifiers';
import { runTrials, trialRng } from '../src/field/experiments';
import { createObserver, finishObserver, observerStep, type Observer } from '../src/field/observer';
import { P_CALLED, emptyRecords, recordsHash } from '../src/field/records';

const DAY = 5760;
function run(seed: number, days: number, ageRate: number, withObserver: boolean): { world: World; obs: Observer | null } {
  const world = createWorld(seed);
  world.ageRate = ageRate;
  const obs = withObserver ? createObserver(world, { seed: 3 }) : null;
  for (let i = 0; i < days * DAY; i++) { tickWorld(world); if (obs) observerStep(obs, world); }
  if (obs) finishObserver(obs, world);
  return { world, obs };
}

test('the observer is read-only: a run with it deep-equals a run without it (seeds 48, 7, 21; 3 eco-days; ageRate 1 and 365)', () => {
  for (const ageRate of [1, 365]) for (const seed of [48, 7, 21]) {
    const a = run(seed, 3, ageRate, false), b = run(seed, 3, ageRate, true);
    assert.equal(b.world.rng, a.world.rng, `world.rng identical (seed ${seed}, ageRate ${ageRate})`);
    assert.deepEqual(b.world, a.world, `world identical (seed ${seed}, ageRate ${ageRate})`);
    assert.ok(b.obs!.rec.points.t.n > 0, 'the observer sampled');
  }
});

test('the observer draws from its own RNG, never world.rng', () => {
  const world = createWorld(48);
  const rng0 = world.rng;
  const obs = createObserver(world, { seed: 5 });
  assert.equal(world.rng, rng0, 'creating the observer leaves world.rng alone');
  const orng0 = obs.rng;
  const ref = createWorld(48);
  for (let i = 0; i < DAY; i++) { tickWorld(world); observerStep(obs, world); tickWorld(ref); }
  assert.equal(world.rng, ref.rng, 'world.rng follows the unobserved trajectory');
  assert.notEqual(obs.rng, orng0, 'the observer consumed its own random numbers (rotation, lost follows)');
});

test('observer records are byte-identical on rerun and depend on the observer seed', () => {
  const h = (seed: number) => { const w = createWorld(7); const o = createObserver(w, { seed }); for (let i = 0; i < DAY; i++) { tickWorld(w); observerStep(o, w); } return recordsHash(finishObserver(o, w)); };
  assert.equal(h(1), h(1));
  assert.notEqual(h(1), h(2));
});

test('field experiments on world copies do not change the observed run', () => {
  const a = createWorld(21), b = createWorld(21);
  const rng = trialRng(1);
  let trials = 0;
  for (let i = 0; i < DAY; i++) {
    tickWorld(a); tickWorld(b);
    if (i === 1500) { trials += runTrials(b, 'playback', rng, 3).length; trials += runTrials(b, 'snake', rng, 3).length; }
  }
  assert.ok(trials >= 3, 'trials ran');
  assert.deepEqual(b, a);
});

test('every one of the 30 actions maps to a field activity category', () => {
  assert.equal(ACTIONS.length, 30);
  assert.equal(new Set(ACTIONS).size, 30);
  assert.deepEqual(Object.keys(BASE_CATEGORY).sort(), [...ACTIONS].sort());
  assert.deepEqual(Object.values(ACTION_CODE).sort((a, b) => a - b), ACTIONS.map((_, i) => i));
  const expect: Record<Action, number> = {
    rest: CAT_REST, forage: CAT_FEED, drink: CAT_FEED, travel: CAT_TRAVEL, groom: CAT_GROOM, play: CAT_SOCIAL, follow: CAT_TRAVEL, climb: CAT_TRAVEL,
    patrol: CAT_TRAVEL, display: CAT_AGONISTIC, flee: CAT_AGONISTIC, hunt: CAT_TRAVEL, mate: CAT_SOCIAL, nurse: CAT_FEED, dead: CAT_NONE, nest: CAT_REST,
    'pant-grunt': CAT_SOCIAL, charge: CAT_AGONISTIC, attack: CAT_AGONISTIC, submit: CAT_AGONISTIC, reconcile: CAT_SOCIAL, console: CAT_SOCIAL, share: CAT_SOCIAL,
    beg: CAT_SOCIAL, guard: CAT_SOCIAL, consort: CAT_TRAVEL, shelter: CAT_REST, call: CAT_SOCIAL, transfer: CAT_TRAVEL, alarm: CAT_SOCIAL,
  };
  // settled state (phase 2, in contact, at the water site), not groomed, no meat
  for (const a of ACTIONS) assert.equal(activityCategory(a, 2, 100001, false, false, true), expect[a], a);
  // phase and state refinements
  assert.equal(activityCategory('forage', 0, 100001, false, false, false), CAT_TRAVEL, 'walking to the crown');
  assert.equal(activityCategory('forage', 1, 100001, false, false, false), CAT_TRAVEL, 'climbing to the crown');
  assert.equal(activityCategory('forage', 0, -1, false, false, false), CAT_FEED, 'ground foods');
  assert.equal(activityCategory('groom', 0, 5, false, false, false), CAT_TRAVEL, 'approaching the partner');
  assert.equal(activityCategory('drink', 0, 200001, false, false, false), CAT_TRAVEL, 'walking to the water');
  assert.equal(activityCategory('rest', 0, -1, true, false, false), CAT_GROOM, 'being groomed');
  assert.equal(activityCategory('rest', 0, -1, false, true, false), CAT_FEED, 'eating meat');
  assert.equal(activityCategory('charge', 0, 5, true, true, false), CAT_AGONISTIC, 'refinements apply to resting only');
});

/** A world advanced to mid-morning with the teams following. */
function morning(seed: number, over: Parameters<typeof createObserver>[1] = {}): { world: World; obs: Observer } {
  const world = createWorld(seed);
  const obs = createObserver(world, { seed: 1, ...over });
  while (world.hour < 9.5) { tickWorld(world); observerStep(obs, world); }
  return { world, obs };
}
const stepTo = (world: World, obs: Observer, hours: number) => { const end = world.time + hours; while (world.time < end) { tickWorld(world); observerStep(obs, world); } };

test('encounter classifier: strangers in sight of the focal party make a "seen" encounter', () => {
  const { world, obs } = morning(48);
  const tm = obs.teams.find(t => t.state === 2)!;
  assert.ok(tm, 'a team is following');
  const focal = index(world).byId.get(tm.focal)!;
  const strangers = index(world).alive.filter(c => c.troopId !== tm.troop && c.age >= 10).slice(0, 3);
  // constructed scene: three strangers step next to the focal
  strangers.forEach((s, k) => { s.position[0] = focal.position[0] + 2 + k; s.position[1] = 0; s.position[2] = focal.position[2] + 2; });
  stepTo(world, obs, 3 / 60);
  assert.ok(tm.encounters.size > 0 || obs.rec.encounters.some(e => e.team === tm.index), 'an encounter is open');
  // the episode closes after an hour without detection; stranger males' travel pant-hoots (stage C6) can keep it open longer
  const found = () => obs.rec.encounters.find(x => x.team === tm.index && x.other === strangers[0].troopId);
  for (let h = 0; h < 8 && !found(); h++) stepTo(world, obs, 1);
  const e = found();
  assert.ok(e, 'the encounter was closed and recorded');
  assert.notEqual(e!.modality, 'heard', 'strangers were seen (or contacted)');
});

test('encounter classifier: stranger pant-hoots heard by the team are an acoustic encounter with or without a response (wilson2012); the old response rule is a switch', () => {
  for (const [needs, respond] of [[false, false], [false, true], [true, true], [true, false]] as const) {
    const { world, obs } = morning(7, { heardNeedsResponse: needs });
    const tm = obs.teams.find(t => t.state === 2)!;
    const focal = index(world).byId.get(tm.focal)!;
    const other = world.troops.find(t => t.id !== tm.troop && !index(world).alive.some(c => c.troopId === t.id && Math.hypot(c.position[0] - focal.position[0], c.position[2] - focal.position[2]) < 40))!.id;
    // constructed scene: a stranger pant-hoot 20 m away (within the 36 m hearing radius); the party then counter-calls, or stays at rest
    world.calls.push({ id: world.nextId++, kind: 'pant-hoot', callerId: -1, troopId: other, position: [focal.position[0] + 20, 0, focal.position[2]], time: world.time, radius: 36 });
    for (let i = 0; i < 12 * 4; i++) {
      tickWorld(world);
      for (const id of tm.party) { const m = index(world).byId.get(id)!; m.action = respond && i > 8 ? 'call' : 'rest'; }
      observerStep(obs, world);
    }
    const heard = tm.encounters.has(other) || obs.rec.encounters.some(e => e.team === tm.index && e.other === other);
    assert.equal(heard, !needs || respond, needs ? (respond ? 'a response makes it an encounter' : 'an unanswered call is not an encounter under the response rule') : 'a heard foreign call is an encounter');
    assert.ok(!tm.heard.some(h => h.other === other), 'no call is left pending after 10 min');
  }
});

test('hunt classifier: a hunt started near the team is observed, with its capture', () => {
  const { world, obs } = morning(21);
  const tm = obs.teams.find(t => t.state === 2)!;
  const focal = index(world).byId.get(tm.focal)!;
  const t = world.time;
  // constructed scene: a hunt interaction starts at the focal, then resolves with one capture
  const start: Interaction = { id: world.nextId++, kind: 'hunt', actorId: focal.id, targetId: -1, participants: [focal.id], start: t, end: null, position: [focal.position[0], 0, focal.position[2]], intensity: 0.8, troopId: tm.troop };
  world.interactions.push(start);
  stepTo(world, obs, 6 / 60);
  start.end = world.time;
  world.interactions.push({ id: world.nextId++, kind: 'hunt', actorId: focal.id, targetId: -1, participants: [focal.id, 999], start: world.time, end: world.time + 1 / 60, position: start.position, intensity: 1, troopId: tm.troop });
  stepTo(world, obs, 3 / 60);
  const rec = finishObserver(obs, world);
  const h = rec.hunts.find(x => x.id === start.id);
  assert.ok(h && h.detected, 'hunt observed');
  assert.equal(h!.captures, 1);
  assert.deepEqual(h!.captors, [focal.id]);
});

test('death classifier: an individual not seen for 30 days is recorded as disappeared; dispersal-age natal females are not', () => {
  const { world, obs } = morning(48);
  const byId = index(world).byId;
  const male = index(world).alive.find(c => c.sex === 'male' && c.age >= 20 && !obs.teams.some(t => t.focal === c.id))!;
  const female = index(world).alive.find(c => c.sex === 'female' && c.troopId === c.natalTroopId && c.age >= 11 && c.age < 14 && !obs.teams.some(t => t.focal === c.id));
  // constructed scene: both vanish from view (moved to the map corner) and the census last saw them 31 days ago (the study is older than that)
  for (const c of [male, female]) if (c) { c.position[0] = 79; c.position[2] = 79; }
  killChimp(world, male, 'test');
  if (female) killChimp(world, female, 'test');
  stepTo(world, obs, 0.1);
  for (const c of [male, female]) if (c) { obs.id.seen[c.id] = world.time - 31 * 24; obs.roster.get(c.id)!.firstSeen = world.time - 31 * 24; }
  while (world.hour < 21.2) { tickWorld(world); observerStep(obs, world); }
  const d = obs.rec.deaths.find(x => x.id === male.id);
  assert.ok(d && d.how === 'disappeared', 'male recorded as a disappearance death');
  assert.equal(d!.truthTime, byId.get(male.id)!.deathTime);
  if (female) { assert.ok(!obs.rec.deaths.some(x => x.id === female.id), 'natal female of dispersal age is not called dead'); assert.equal(obs.status.get(female.id), 'gone'); }
});

test('patrol classifier on constructed follows: silent travel of >= 2 males beyond the 90% isopleth for >= 20 min with >= 2 listening stops', () => {
  const rec = emptyRecords();
  const follow = (samples: { am: number; cat: number; called?: boolean; truth?: number; x: number }[]) => {
    const f = rec.follows.length, idx: number[] = [];
    rec.follows.push({ team: 0, troop: 1, focal: 1, sex: 'male', lactating: false, start: f * 24, end: f * 24 + samples.length / 60, complete: true, lost: false, sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1 });
    samples.forEach((s, k) => {
      const P = rec.points; idx.push(P.t.n);
      P.t.push(Math.round((f * 24 + k / 60) * 240)); P.team.push(0); P.focal.push(1); P.cat.push(s.cat); P.action.push(0); P.height.push(0); P.party.push(4); P.partyInd.push(4); P.partyAM.push(s.am);
      P.n5.push(0); P.n10.push(0); P.flags.push(s.called ? P_CALLED : 0); P.feed.push(0); P.tree.push(-1); P.x.push(s.x); P.z.push(0); P.truthPatrol.push(s.truth ?? 0);
    });
    return idx;
  };
  const edge = (k: number) => k * 0.6;             // walks out from the core (x 0) past the edge (x > 20)
  // with two listening stops (still for 2 samples at minutes 12–13 and 27–28), as the source requires
  const stopAt = (k: number) => edge(k - (k >= 12 ? Math.min(2, k - 11) : 0) - (k >= 27 ? Math.min(2, k - 26) : 0));
  const pts = [
    follow(Array.from({ length: 48 }, (_, k) => ({ am: 3, cat: CAT_TRAVEL, truth: 1, x: stopAt(k) }))),                      // a patrol
    follow(Array.from({ length: 45 }, (_, k) => ({ am: 3, cat: CAT_TRAVEL, called: k === 30, truth: 0, x: edge(k) }))),       // pant-hoots on the way: neither part is a silent 20-min run beyond the edge
    follow(Array.from({ length: 45 }, (_, k) => ({ am: 1, cat: CAT_TRAVEL, truth: 0, x: edge(k) }))),                        // a lone male
    follow(Array.from({ length: 45 }, (_, k) => ({ am: 3, cat: CAT_TRAVEL, truth: 0, x: (k % 5) * 0.5 }))),                  // silent male travel inside the core
    follow(Array.from({ length: 15 }, (_, k) => ({ am: 3, cat: CAT_TRAVEL, truth: 0, x: edge(k * 3) }))),                    // too short
    follow(Array.from({ length: 45 }, (_, k) => ({ am: 3, cat: CAT_TRAVEL, truth: 0, x: edge(k) }))),                        // silent male travel past the edge without listening stops
  ];
  const level = (_t: number, x: number) => (x > 20 ? 1 : x / 25);
  const p = classifyPatrols(rec, pts, level, PATROL_RULE);
  assert.deepEqual(p.map(x => x.follow), [0]);
  assert.ok(p[0].minutes >= 44 && p[0].maxLevel >= 0.9);
  const acc = patrolAccuracy(rec, pts, p);
  assert.equal(acc.precision, 1); assert.equal(acc.recall, 1); assert.equal(acc.truthEpisodes, 1);
});

