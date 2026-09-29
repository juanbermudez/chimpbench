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
import { P_CALLED, emptyRecords, recordsHash, type DeathRec, type RosterEntry } from '../src/field/records';
import { derive } from '../src/field/derive';
import { communityAt, lossOf, npiTools, EARLY_LIFE_METRICS } from '../src/field/early-life';
import { hash01 } from '../src/sim/rng';

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



// ---------------------------------------------------------------------------
// Stage C8 observer protocols (docs/staging/early-life-prereg.md §4.1)
// ---------------------------------------------------------------------------

const Y = 365.25 * 24;
const kid = (id: number, sex: 'male' | 'female', mother: number, born: number, troop = 1): RosterEntry => ({ id, sex, troop, natal: troop, mother, birthEst: born, knownAge: true, founder: false, firstSeen: born });
const dead = (id: number, t: number, how: 'body' | 'disappeared', last = t): DeathRec => ({ id, troop: 1, tEst: t, how, truthTime: t, violent: false, cause: how === 'body' ? 'other' : 'unknown', respiratory: false, last, ill: false });

test('C8 orphan classification: age at loss from the carcass date or the last sighting, the community rule, transfers followed', () => {
  const r = emptyRecords();
  r.days = 30 * 365.25;
  r.roster.push({ id: 1, sex: 'female', troop: 1, natal: 2, mother: -1, birthEst: -20 * Y, knownAge: false, founder: true, firstSeen: 0 },
    { id: 2, sex: 'female', troop: 1, natal: 1, mother: -1, birthEst: -20 * Y, knownAge: false, founder: true, firstSeen: 0 },
    kid(10, 'female', 1, 1 * Y), kid(11, 'male', 2, 1 * Y), kid(12, 'female', 2, 2 * Y));
  r.deaths.push(dead(1, 8 * Y, 'body'), dead(2, 12 * Y, 'disappeared', 11.5 * Y));
  // daughter 12 transferred to community 3 at 10 y, before her mother disappeared
  r.transfers.push({ id: 12, from: 1, to: 3, tSeen: 12 * Y - 1 });
  const d = derive(r);
  assert.deepEqual(lossOf(d, 10), { t: 8 * Y, age: 7, inCommunity: true }, 'carcass date');
  const l11 = lossOf(d, 11)!;
  assert.ok(Math.abs(l11.t - 11.5 * Y) < 1e-6 && Math.abs(l11.age - 10.5) < 1e-9 && l11.inCommunity, 'a disappearance dates the loss at the last sighting');
  assert.equal(communityAt(d, 12, 12 * Y), 3); assert.equal(communityAt(d, 12, 5 * Y), 1);
  assert.equal(lossOf(d, 12)!.inCommunity, true, 'still in her community at the last sighting (11.5 y)');
  r.transfers[0].tSeen = 11 * Y;
  assert.equal(lossOf(derive(r), 12)!.inCommunity, false, 'transferred before the loss');
});

test('C8 T-DEM-15 cohort rules on a constructed genealogy (known-age sons; orphans at 4–11.99; exclusions; paternity from 10, offspring surviving 2 y in his community)', () => {
  const r = emptyRecords();
  r.days = 40 * 365.25;
  const moms = [1, 2, 3, 4, 5, 6];
  for (const m of moms) r.roster.push({ id: m, sex: 'female', troop: 1, natal: 2, mother: -1, birthEst: -20 * Y, knownAge: false, founder: true, firstSeen: 0 });
  r.roster.push(kid(21, 'male', 1, 1 * Y), kid(22, 'male', 2, 1 * Y), kid(23, 'male', 3, 1 * Y), kid(24, 'male', 4, 1 * Y), kid(25, 'male', 5, 1 * Y), kid(26, 'male', 6, 30 * Y));
  r.deaths.push(dead(1, 7 * Y, 'body'), dead(3, 2 * Y, 'body'), dead(5, 15 * Y, 'body'));
  r.transfers.push({ id: 24, from: 1, to: 2, tSeen: 16 * Y });
  // son 21 (orphan at 6) sires at conception age 17 an offspring that survives; another born in community 2 does not count;
  // son 22 (mother alive) sires one that dies at 1 y (not counted) and one that survives (conception age 19)
  const birth = (id: number, mother: number, father: number, t: number, troop = 1) => { r.roster.push(kid(id, 'female', mother, t, troop)); r.births.push({ id, mother, troop, tSeen: t, truthBirth: t, father }); };
  birth(31, 2, 21, 1 * Y + 17 * Y + 228 * 24); birth(32, 4, 21, 20 * Y, 2);
  birth(33, 6, 22, 18 * Y); r.deaths.push(dead(33, 19 * Y, 'body'));
  birth(34, 6, 22, 1 * Y + 19 * Y + 228 * 24);
  const d = derive(r), m = EARLY_LIFE_METRICS.find(x => x.id === 'T-DEM-15')!.compute!(d);
  const ids = [21, 22, 25];
  // 23 lost the mother at 1 y (excluded), 24 transferred (excluded), 26 is under 14 at the end (no paternity part)
  assert.deepEqual(m.raw!.mOrphan, [1, 0, 0], 'son 21 orphan; 22 and 25 (loss at 14) non-orphans');
  assert.equal(m.raw!.mOrphan.length, ids.length);
  assert.ok(Math.abs(m.raw!.mFirst[0] - 17) < 1e-9 && Math.abs(m.raw!.mFirst[1] - 19) < 1e-9 && m.raw!.mFirst[2] === -1);
  assert.deepEqual(m.raw!.mPats, [1, 1, 0]);
  // survival rows from age 4: son 21 switches on at 6; 23 and 24 are not at risk
  const sx = m.raw!.sx, sstart = m.raw!.sstart;
  assert.equal(sx.filter(x => x === 1).length, 1);
  assert.ok(sstart.every(a => a >= 4 - 1e-9));
});

test('C8 observer: stress readings only at 06:00–08:00 for immatures and males >= 12, once a day; urine samples one per 10 follow-days at 4–15 y', () => {
  const world = createWorld(21);
  const obs = createObserver(world, { seed: 2 });
  for (let i = 0; i < 24 * DAY; i++) { tickWorld(world); observerStep(obs, world); }
  const rec = finishObserver(obs, world);
  assert.ok(rec.stress.length > 0, 'readings were taken');
  const perDay = new Set<string>();
  for (const s of rec.stress) {
    const hour = (s.t + 6.5) % 24, r = rec.roster.find(x => x.id === s.id)!, age = (s.t - r.birthEst) / Y;
    assert.ok(hour >= 6 && hour < 8, `hour ${hour}`);
    assert.ok(age < 12 || r.sex === 'male');
    const k = `${s.id}|${Math.floor((s.t + 6.5) / 24)}`;
    assert.ok(!perDay.has(k), 'one reading per individual per day'); perDay.add(k);
  }
  for (const s of rec.lean) { const r = rec.roster.find(x => x.id === s.id)!, age = (s.t - r.birthEst) / Y; assert.ok(age >= 4 && age < 16 && s.v > 0); }
  const days = new Map<number, number>();
  for (const s of rec.lean) days.set(s.id, (days.get(s.id) ?? 0) + 1);
  for (const n of days.values()) assert.ok(n <= 24 / 10 + 1e-9, 'at most one sample per 10 days present');
});

test('C8 T-DEM-23 exposure: 0.25 h per 15-min scan in the focal party; T-DEM-24 one-year survival by age at loss', () => {
  const r = emptyRecords();
  r.days = 20 * 365.25;
  r.roster.push({ id: 1, sex: 'female', troop: 1, natal: 1, mother: -1, birthEst: -20 * Y, knownAge: false, founder: true, firstSeen: 0 }, kid(5, 'male', 1, 1 * Y), kid(6, 'female', 1, 3 * Y));
  const S = r.scans, tick = (t: number) => Math.round(t / r.tickHours);
  for (let k = 0; k < 8; k++) {
    S.t.push(tick(6 * Y + k * 0.25)); S.team.push(0); S.focal.push(1); S.size.push(2); S.ind.push(2); S.am.push(0); S.af.push(1); S.swollen.push(0); S.prey.push(-1); S.preyDist.push(0); S.tree.push(-1);
    S.canopy.push(0); S.feedN.push(0); S.cx.push(0); S.cz.push(0); S.memOff.push(S.members.n); S.memN.push(2); S.members.push(1); S.members.push(5); S.nearOff.push(0); S.nearN.push(0);
  }
  r.conflicts.push({ t: 6 * Y + 0.5, winner: 1, loser: 5, troop: 1, contact: false, detected: true, pc: -1, mc: -3, thirdToWinner: 0, thirdToLoser: 0 });
  const d = derive(r), v = EARLY_LIFE_METRICS.find(x => x.id === 'T-DEM-23')!.compute!(d);
  assert.deepEqual(v.raw!.hours, [2]); assert.deepEqual(v.raw!.count, [1]); assert.deepEqual(v.raw!.bin, [10], 'age 5.0–5.5');
  // the mother dies at 8 y (son 7 y, daughter 5 y): both orphaned at >= 4 and alive a year later
  r.deaths.push(dead(1, 8 * Y, 'body'));
  const w = EARLY_LIFE_METRICS.find(x => x.id === 'T-DEM-24')!.compute!(derive(r));
  assert.deepEqual(w.raw!.young, [0, 0]); assert.deepEqual(w.raw!.alive, [1, 1]);
});

test('C8 neighbour-pressure index against a hand calculation: an encounter at the core scores I·K = 1, one beyond the 75% border 0; F = 1 / observation days between them', () => {
  const r = emptyRecords('field');
  r.mapSize = 8000; r.days = 420;
  const normal = (i: number, k: number) => Math.sqrt(-2 * Math.log(1 - hash01(i, k, 1))) * Math.cos(2 * Math.PI * hash01(i, k, 2));
  const P = r.points, perH = Math.round(1 / r.tickHours);
  let n = 0;
  for (let day = 0; day < 420; day++) {
    const start = day * 24 + 1;
    r.follows.push({ team: 0, troop: 1, focal: 1, sex: 'male', lactating: false, start, end: start + 12, complete: true, lost: false, sunrise: 6.8, sunset: 18.8, truthTicks: [0, 0, 0, 0, 0, 0], nestTree: -1, firstTree: -1 });
    for (let k = 0; k < 24; k++, n++) {
      P.t.push(Math.round((start + k * 0.5) * perH)); P.team.push(0); P.focal.push(1); P.cat.push(0); P.action.push(0); P.height.push(0); P.party.push(1); P.partyInd.push(1); P.partyAM.push(1);
      P.n5.push(0); P.n10.push(0); P.flags.push(0); P.feed.push(0); P.tree.push(-1); P.x.push(300 * normal(n, 1)); P.z.push(300 * normal(n, 2)); P.truthPatrol.push(0);
    }
  }
  const enc = (day: number, x: number) => ({ team: 0, troop: 1, other: 2, t0: day * 24 + 5, t1: day * 24 + 6, modality: 'heard' as const, ownSize: 3, ownAM: 1, otherSize: 3, otherAM: 1, approach: false, avoid: false, called: false, x, z: 0, patrolling: false });
  r.encounters.push(enc(400, 0), enc(405, 1500));
  const { npi } = npiTools(derive(r));
  assert.ok(Math.abs(npi(1, 399 * 24, 410 * 24) - (1 * 1 + 0) / 2 / 5) < 0.02, `NPI ${npi(1, 399 * 24, 410 * 24)}`);
  assert.equal(npi(1, 380 * 24, 390 * 24), 0, 'no encounters, no pressure');
});
