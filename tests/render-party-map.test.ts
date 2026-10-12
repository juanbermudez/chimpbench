import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action, Chimp, World } from '../src/types';
import {
  ACTIVITY_NAMES, ACT_FEEDING, ACT_PATROLLING, ACT_RESTING, ACT_SOCIAL, ACT_TRAVELLING, GOAL_CALL, GOAL_NONE, GOAL_TREE, HEARD_SHOW_S, TRAIL_SAMPLES, TRAIL_STEP_H, TRAIL_WINDOW_H,
  activityOfAction, createPartyMap, createSummary, createTrails, expireTrails, heardLevel, inheritTrail, pluralActivity, pushTrail, summarizeParty, trailPoints, trailSlot, treeOf, updatePartyMap,
} from '../src/render/env/party-map';
import { ARC_GROW_S, arrivalDelay } from '../src/render/callreach';
import { createWorld, tickWorld } from '../src/simulation';

// Stage W10: what a party marker says (src/render/env/party-map.ts): the activity of a party from its members, its
// heading and goal, and the trail of its last half simulated hour in a fixed ring.

const base = createWorld(48).chimps[0];
let nextId = 1;
const chimp = (action: Action, o: Partial<Chimp> = {}): Chimp => ({ ...base, id: nextId++, alive: true, stage: 'adult', action, targetId: -1, heading: 0, position: [0, 0, 0], controller: 'rules', ...o });
const sum = (members: Chimp[], modelOn = true) => summarizeParty(members, members.length, modelOn, createSummary());

test('every act belongs to one of the five map activities', () => {
  assert.deepEqual([...ACTIVITY_NAMES], ['feeding', 'travelling', 'resting', 'social', 'patrolling']);
  assert.equal(activityOfAction('forage'), ACT_FEEDING); assert.equal(activityOfAction('drink'), ACT_FEEDING);
  assert.equal(activityOfAction('travel'), ACT_TRAVELLING); assert.equal(activityOfAction('follow'), ACT_TRAVELLING);
  assert.equal(activityOfAction('rest'), ACT_RESTING); assert.equal(activityOfAction('nest'), ACT_RESTING);
  assert.equal(activityOfAction('groom'), ACT_SOCIAL); assert.equal(activityOfAction('play'), ACT_SOCIAL);
  assert.equal(activityOfAction('patrol'), ACT_PATROLLING);
  const all: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead', 'nest', 'pant-grunt', 'charge', 'attack', 'submit',
    'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm'];
  for (const a of all) { const k = activityOfAction(a); assert.ok(k >= 0 && k <= 4, a); }
});

test('the marker shows what most members are doing; a tie goes to the more telling activity', () => {
  assert.equal(pluralActivity([3, 1, 0, 0, 0]), ACT_FEEDING);
  assert.equal(pluralActivity([1, 1, 1, 0, 0]), ACT_TRAVELLING, 'a three-way tie: travelling tells where the party will be');
  assert.equal(pluralActivity([2, 0, 2, 0, 0]), ACT_FEEDING);
  assert.equal(pluralActivity([0, 0, 2, 2, 0]), ACT_SOCIAL);
  assert.equal(pluralActivity([0, 2, 0, 0, 2]), ACT_PATROLLING);
  assert.equal(pluralActivity([0, 0, 0, 0, 0]), ACT_RESTING, 'nobody counted');
  assert.equal(sum([chimp('forage'), chimp('forage'), chimp('groom')]).activity, ACT_FEEDING);
  assert.equal(sum([chimp('rest'), chimp('nest'), chimp('groom')]).activity, ACT_RESTING);
  assert.equal(sum([chimp('groom'), chimp('groom'), chimp('rest')]).activity, ACT_SOCIAL);
  assert.equal(sum([chimp('patrol'), chimp('patrol'), chimp('travel')]).activity, ACT_PATROLLING);
});

test('an infant does not set its mother\'s party\'s activity, and is still counted in its size', () => {
  const s = sum([chimp('forage'), chimp('nurse', { stage: 'infant' }), chimp('play', { stage: 'infant' })]);
  assert.equal(s.count, 3);
  assert.equal(s.activity, ACT_FEEDING, 'two infants do not outvote the forager');
  assert.equal(sum([chimp('play', { stage: 'infant' })]).activity, ACT_SOCIAL, 'infants alone speak for themselves');
  const d = sum([chimp('forage'), chimp('rest', { alive: false })]);
  assert.equal(d.count, 1, 'the dead are not counted');
});

test('a travelling party has a heading only when its members go one way', () => {
  const east = Math.PI / 2;   // heading 0 is +z (south), π/2 is +x (east)
  const s = sum([chimp('travel', { heading: east }), chimp('follow', { heading: east + 0.2 }), chimp('rest')]);
  assert.equal(s.activity, ACT_TRAVELLING);
  assert.ok(s.headX > 0.95 && Math.abs(s.headZ) < 0.2, `east (${s.headX.toFixed(2)}, ${s.headZ.toFixed(2)})`);
  assert.ok(Math.abs(Math.hypot(s.headX, s.headZ) - 1) < 1e-9);
  const apart = sum([chimp('travel', { heading: 0 }), chimp('travel', { heading: Math.PI })]);
  assert.equal(apart.activity, ACT_TRAVELLING);
  assert.equal(apart.headX, 0); assert.equal(apart.headZ, 0);
  const feeding = sum([chimp('forage'), chimp('forage'), chimp('travel', { heading: east })]);
  assert.equal(feeding.headX, 0, 'no tick on a party that is not travelling');
});

test('the goal is the tree, or the call, most members are walking to', () => {
  const lead = chimp('travel', { targetId: 100777 });
  const tree = sum([lead, chimp('follow', { targetId: lead.id }), chimp('travel', { targetId: 100777 }), chimp('rest')]);
  assert.equal(tree.goalKind, GOAL_TREE); assert.equal(tree.goalId, 100777);
  const split = sum([chimp('travel', { targetId: 100777 }), chimp('travel', { targetId: 100778 })]);
  assert.equal(split.goalKind, GOAL_NONE, 'half is not most');
  const toCall = sum([chimp('travel', { targetId: 1000478 })]);
  assert.equal(toCall.goalKind, GOAL_CALL); assert.equal(toCall.goalId, 1000478);
  const toChimp = sum([chimp('travel', { targetId: 7 })]);
  assert.equal(toChimp.goalKind, GOAL_NONE, 'a trip to an animal draws no goal line');
  const feed = sum([chimp('forage', { targetId: 100500 }), chimp('forage', { targetId: 100500 }), chimp('forage', { targetId: 100501 })]);
  assert.equal(feed.feedTree, 100500); assert.equal(feed.goalKind, GOAL_NONE);
  assert.equal(sum([chimp('forage', { targetId: -1 })]).feedTree, -1, 'leaves on the ground have no tree');
});

test('a party holding a model-driven animal is marked, unless the loop is off', () => {
  const members = [chimp('rest'), chimp('rest', { controller: 'model' })];
  assert.equal(sum(members, true).model, true);
  assert.equal(sum(members, false).model, false);
  assert.equal(sum([chimp('rest')], true).model, false);
});

test('the trail is a fixed ring per party: half an hour of places, oldest dropped', () => {
  const tr = createTrails(4, TRAIL_SAMPLES);
  const sizes = [tr.t.length, tr.x.length, tr.z.length];
  const out = new Float32Array(TRAIL_SAMPLES * 3);
  let now = 10;
  for (let i = 0; i < 40; i++) { now = 10 + i * TRAIL_STEP_H; pushTrail(tr, 5, now, i * 10, -i * 5); }
  assert.deepEqual([tr.t.length, tr.x.length, tr.z.length], sizes, 'nothing grows');
  const s = trailSlot(tr, 5);
  assert.equal(tr.len[s], TRAIL_SAMPLES);
  const n = trailPoints(tr, s, now, out);
  assert.equal(n, TRAIL_SAMPLES, '16 places two minutes apart span the half hour');
  assert.equal(out[(n - 1) * 3], 390); assert.equal(out[(n - 1) * 3 + 1], -195); assert.equal(out[(n - 1) * 3 + 2], 0, 'newest last, age 0');
  assert.ok(Math.abs(out[2] - 1) < 1e-6, 'the oldest is half an hour old');
  for (let k = 1; k < n; k++) assert.ok(out[k * 3 + 2] < out[(k - 1) * 3 + 2], 'oldest first');
  // A place too soon after the last is not kept; neither is time running backwards.
  pushTrail(tr, 5, now + TRAIL_STEP_H * 0.2, 999, 999);
  assert.equal(tr.x[s * tr.n + tr.head[s]], 390);
  pushTrail(tr, 5, now - 1, 999, 999);
  assert.equal(tr.x[s * tr.n + tr.head[s]], 390);
  // Places older than the window are not returned.
  assert.equal(trailPoints(tr, s, now + TRAIL_WINDOW_H / 2, out), TRAIL_SAMPLES / 2, 'a quarter of an hour later half of them are left');
  assert.equal(trailPoints(tr, -1, now, out), 0);
});

test('slots are reused: a party gone for half an hour frees its slot, and a full table drops the stalest', () => {
  const tr = createTrails(3, 4);
  pushTrail(tr, 1, 10, 0, 0); pushTrail(tr, 2, 10.1, 0, 0); pushTrail(tr, 3, 10.2, 0, 0);
  assert.equal(trailSlot(tr, 9), -1);
  pushTrail(tr, 9, 10.3, 5, 5);
  assert.equal(trailSlot(tr, 1), -1, 'the stalest party made room');
  assert.ok(trailSlot(tr, 9) >= 0 && trailSlot(tr, 2) >= 0 && trailSlot(tr, 3) >= 0);
  expireTrails(tr, 10.1 + TRAIL_WINDOW_H + 0.01);
  assert.equal(trailSlot(tr, 2), -1); assert.ok(trailSlot(tr, 3) >= 0);
  expireTrails(tr, 5);   // another simulation: time ran backwards
  assert.equal(trailSlot(tr, 3), -1); assert.equal(trailSlot(tr, 9), -1);
});

test('a party that splits off starts with the trail it shared', () => {
  const tr = createTrails(4, 8), out = new Float32Array(24);
  for (let i = 0; i < 5; i++) pushTrail(tr, 3, 10 + i * TRAIL_STEP_H, i, i);
  const s = inheritTrail(tr, trailSlot(tr, 3), 5);
  assert.ok(s >= 0 && s !== trailSlot(tr, 3));
  pushTrail(tr, 5, 10 + 5 * TRAIL_STEP_H, 100, 100); pushTrail(tr, 3, 10 + 5 * TRAIL_STEP_H, -100, -100);
  const n5 = trailPoints(tr, trailSlot(tr, 5), 10 + 5 * TRAIL_STEP_H, out);
  assert.equal(n5, 6); assert.equal(out[0], 0); assert.equal(out[12], 4); assert.equal(out[15], 100, 'the shared path, then its own');
  const n3 = trailPoints(tr, trailSlot(tr, 3), 10 + 5 * TRAIL_STEP_H, out);
  assert.equal(n3, 6); assert.equal(out[15], -100);
  assert.equal(inheritTrail(tr, -1, 7), -1); assert.equal(inheritTrail(tr, 3, 7), -1, 'nothing to inherit from a free slot');
  // The split is seen when both parties are placed at the same time, the source first: the source's place after the
  // split is not copied to the heir, whose trail goes from the last shared place to its own.
  const sp = createTrails(4, 8), t0 = 20;
  for (let i = 0; i < 4; i++) pushTrail(sp, 39, t0 + i * TRAIL_STEP_H, -317, -1761);
  const tSplit = t0 + 4 * TRAIL_STEP_H;
  pushTrail(sp, 39, tSplit, -225, -1777);   // the two that walked off keep the id
  const heir = inheritTrail(sp, trailSlot(sp, 39), 43, tSplit);
  assert.equal(pushTrail(sp, 43, tSplit, -317, -1763), heir);   // the three that stayed
  const nh = trailPoints(sp, heir, tSplit, out);
  assert.equal(nh, 5, 'four shared places and its own');
  for (let k = 0; k < nh; k++) assert.equal(out[k * 3], -317, 'the party that stayed never went where the others did');
  assert.equal(out[(nh - 1) * 3 + 1], -1763);
  assert.equal(trailPoints(sp, trailSlot(sp, 39), tSplit, out), 5); assert.equal(out[12], -225, 'the source keeps its own place');
  // A full ring: dropping the source's newest place leaves the older ones in order.
  const fr = createTrails(3, 4);
  for (let i = 0; i < 6; i++) pushTrail(fr, 1, 30 + i * TRAIL_STEP_H, i, 0);
  const fh = inheritTrail(fr, trailSlot(fr, 1), 2, 30 + 5 * TRAIL_STEP_H);
  assert.equal(trailPoints(fr, fh, 30 + 5 * TRAIL_STEP_H, out), 3); assert.deepEqual([out[0], out[3], out[6]], [2, 3, 4]);
  pushTrail(fr, 2, 30 + 5 * TRAIL_STEP_H, 9, 9);
  assert.equal(trailPoints(fr, fh, 30 + 5 * TRAIL_STEP_H, out), 4); assert.deepEqual([out[0], out[3], out[6], out[9]], [2, 3, 4, 9]);
  // A full table never hands the source's own slot to its heir.
  const full = createTrails(2, 4);
  pushTrail(full, 1, 10, 1, 1); pushTrail(full, 2, 10.5, 2, 2);
  const h = inheritTrail(full, trailSlot(full, 1), 8);
  assert.notEqual(h, trailSlot(full, 1)); assert.equal(full.x[h * 4 + full.head[h]], 1);
});

test('the tracker follows a world: one mark per party, a place per re-forming, no growth while it runs', () => {
  const world = createWorld(48);
  for (let t = 0; t < 700; t++) tickWorld(world);
  const pm = createPartyMap();
  assert.ok(updatePartyMap(pm, world, 0));
  assert.equal(pm.n, world.parties.filter(p => p.members.length > 0).length);
  for (let i = 0; i < pm.n; i++) {
    const m = pm.marks[i], p = world.parties.find(q => q.id === m.id)!;
    assert.equal(m.count, p.members.length); assert.equal(m.troopId, p.troopId);
    assert.ok(m.activity >= 0 && m.activity <= 4);
    assert.ok(Math.hypot(m.x - p.center[0], m.z - p.center[2]) < 12, 'the mean of the members is near the party centre');
    assert.ok(m.slot >= 0 && pm.trails.id[m.slot] === m.id);
    assert.ok(p.members.includes(m.firstId));
  }
  assert.ok(!updatePartyMap(pm, world, 0.1), 'nothing new a tenth of a second later');
  assert.ok(updatePartyMap(pm, world, 0.3), 'refreshed a quarter of a second later');
  const pool = pm.marks.length, tables = pm.heardAt.length, v0 = pm.version;
  let now = 0.3, reforms = 0, parties = world.parties;
  for (let t = 0; t < 160; t++) {   // forty simulated minutes at 1 min/s, a frame per tick
    tickWorld(world); now += 0.25;
    if (world.parties !== parties) { parties = world.parties; reforms++; }
    updatePartyMap(pm, world, now);
  }
  assert.ok(reforms >= 19, `parties re-formed ${reforms} times`);
  assert.ok(pm.version > v0);
  assert.equal(pm.heardAt.length, tables, 'the id tables did not grow');
  assert.ok(pm.marks.length <= pool + 8, 'the mark pool is reused');
  const out = new Float32Array(TRAIL_SAMPLES * 3);
  let longest = 0;
  for (let i = 0; i < pm.n; i++) longest = Math.max(longest, trailPoints(pm.trails, pm.marks[i].slot, world.time, out));
  assert.ok(longest >= 15, `a party tracked for the whole time has a full trail (${longest})`);
  // Another simulation starts the tracker again.
  const other = createWorld(7);
  assert.ok(updatePartyMap(pm, other, now + 1));
  assert.equal(pm.n, other.parties.filter(p => p.members.length > 0).length);
  assert.equal(pm.calls.n, 0);
});

test('a call marks the parties inside its radius as the arc reaches them, and a trip toward it gets its place', () => {
  const world = createWorld(48, { profile: 'field' });
  for (let t = 0; t < 40; t++) tickWorld(world);
  const pm = createPartyMap();
  updatePartyMap(pm, world, 0);
  const caller = world.chimps.find(c => c.alive && c.troopId === 1)!;
  const id = world.nextId++;
  world.calls.push({ id, kind: 'pant-hoot', callerId: caller.id, troopId: 1, position: [caller.position[0], 0, caller.position[2]], time: world.time, radius: 1000 });
  assert.ok(updatePartyMap(pm, world, 5), 'a new call refreshes the marks at once');
  assert.equal(pm.calls.n, 1);
  let inside = 0, outside = 0;
  for (let i = 0; i < pm.n; i++) {
    const m = pm.marks[i], p = world.parties.find(q => q.id === m.id)!;
    const ds = p.members.filter(x => x !== caller.id).map(x => world.chimps.find(c => c.id === x)!).map(c => Math.hypot(c.position[0] - caller.position[0], c.position[2] - caller.position[2]));
    const near = ds.filter(d => d <= 1000);
    if (near.length) {
      inside++;
      assert.ok(m.heardAt >= 5 && m.heardAt <= 5 + ARC_GROW_S + 1e-6, 'within the time the arc takes');
      assert.ok(Math.abs(m.heardAt - (5 + Math.max(...near.map(d => arrivalDelay(d, 1000))))) < 1e-6, 'when the arc has reached its last member inside');
      assert.equal(heardLevel(m.heardAt, m.heardAt - 0.01), 0); assert.equal(heardLevel(m.heardAt, m.heardAt), 1);
      assert.ok(heardLevel(m.heardAt, m.heardAt + HEARD_SHOW_S) < 1e-9 && heardLevel(m.heardAt, m.heardAt + HEARD_SHOW_S + 0.1) === 0);
    } else { outside++; assert.equal(m.heardAt, -Infinity); }
  }
  assert.ok(inside >= 3 && outside >= 3, `some parties inside (${inside}), some outside (${outside})`);
  // An animal that then walks toward the call (the simulation names the call as the trip's target): its party's goal.
  const walker = world.chimps.find(c => c.alive && c.troopId === 1 && c.id !== caller.id && c.stage !== 'infant')!;
  const lone = { ...walker, action: 'travel' as Action, targetId: id };
  const fake: World = { ...world, chimps: world.chimps.map(c => (c.id === walker.id ? lone : c)), parties: world.parties.map(p => (p.members.includes(walker.id) ? { ...p, members: [walker.id] } : p)) };
  const pm2 = createPartyMap();
  updatePartyMap(pm2, fake, 0);
  const mark = pm2.marks.slice(0, pm2.n).find(m => m.id === fake.parties.find(p => p.members.includes(walker.id))!.id)!;
  assert.equal(mark.goalKind, GOAL_CALL);
  assert.ok(Math.abs(mark.goalX - caller.position[0]) < 1e-3 && Math.abs(mark.goalZ - caller.position[2]) < 1e-3, 'the goal line ends where the call was given');
  // A tree goal resolves to the tree's place.
  const tree = world.trees[123];
  assert.equal(treeOf(world, tree.id), tree);
  assert.equal(treeOf(world, 5), undefined);
  assert.equal(GOAL_TREE, 1);
});
