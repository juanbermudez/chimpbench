import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action } from '../src/types';
import { ABOUT_MAX_RATE, ABOUT_TICKS, ACT_HIST, ARRIVED_M, BODY_SIGN, PATH_MOVING_MPS, SHUFFLE_SHARE, SKIP_TICKS, WAY_WORDS, Way, aboutTo, actBefore, actChanged, actSince, actStart, bodyShows, createActTrack,
  movingMps, pushAct, readBody, readDrawn, shuffles, startUnseen, wayVerb, type ActTrack, type BodyState, type DrawnAct } from '../src/render/creatures/drawn';
import { actionOnWay } from '../src/ui/format';
import { TICK_HOURS, advancePlayback, createPlayback, createTrack, pushSample, relocationJump2, type Track } from '../src/render/creatures/playback';
import { sampleSmooth } from '../src/render/creatures/motion';
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';

// Stage W4: which act the drawn body is in (src/render/creatures/drawn.ts). Bodies are drawn two ticks behind the
// simulation and then still have to get there; the record of the last tick states says when the current act began,
// and the rule says whether the body has started it.
// Stage W6 changed the rule in two places, on purpose: a stationary act is announced until the body's own drawn time
// has reached it (the pose now waits for the same moment, creatures.ts), and an approach is announced for as long as
// it lasts, in words for what the body does. The tests below that say "W6" assert the new behaviour.

const T = TICK_HOURS;
const fill = (acts: [Action, number][], t0 = 10) => { const tr = createActTrack(); acts.forEach(([a, g], i) => pushAct(tr, t0 + i * T, a, g)); return tr; };
const body = (o: Partial<BodyState> = {}): BodyState => ({ moving: false, climbing: false, gap: 0, shuffling: false, passive: false, ...o });
const drawn = (): DrawnAct => ({ action: 'rest', targetId: -1, about: false, way: 0 });

test('the record keeps the last tick states in a fixed ring', () => {
  const tr = createActTrack();
  assert.equal(tr.n, 0);
  assert.equal(actSince(tr), -Infinity, 'an empty record names no new act');
  assert.equal(actBefore(tr), -1);
  for (let i = 0; i < 25; i++) pushAct(tr, i * T, i < 20 ? 'rest' : 'travel', i < 20 ? -1 : 100200);
  assert.equal(tr.n, ACT_HIST);
  assert.equal(tr.action.length, ACT_HIST); assert.equal(tr.t.length, ACT_HIST); assert.equal(tr.target.length, ACT_HIST);
  assert.equal(tr.action[tr.head], 'travel'); assert.equal(tr.target[tr.head], 100200);
  assert.equal(actSince(tr), 20 * T, 'the first state that showed the trip');
  assert.equal(tr.action[actBefore(tr)], 'rest');
  assert.ok(ACT_HIST >= ABOUT_TICKS + 2 + 1, 'the ring reaches back over the window, the playback lag and the state before the act');
});

test('a repeated time rewrites the newest state: a decision applied between two ticks counts as first seen then', () => {
  const tr = fill([['rest', -1], ['rest', -1], ['rest', -1]]);
  const t = tr.t[tr.head];
  assert.equal(actChanged(tr, 'rest', -1), false);
  assert.equal(actChanged(tr, 'groom', 7), true);
  pushAct(tr, t, 'groom', 7);
  assert.equal(tr.n, 3, 'no new state');
  assert.equal(tr.action[tr.head], 'groom');
  assert.equal(actSince(tr), t);
  assert.equal(tr.action[actBefore(tr)], 'rest');
});

test('an act older than the record, or a record that has just begun, is never new', () => {
  assert.equal(actSince(fill(new Array(ACT_HIST).fill(['forage', 5]))), -Infinity);
  assert.equal(actSince(fill([['travel', 5]])), -Infinity, 'one state: nothing before it to change from');
  assert.equal(actBefore(fill([['travel', 5]])), -1);
  // A new target under the same verb is a new act (walking over to another partner).
  const tr = fill([['groom', 3], ['groom', 3], ['groom', 9]]);
  assert.equal(actSince(tr), tr.t[tr.head]);
});

test('a rewound world starts the record again', () => {
  const tr = fill([['rest', -1], ['rest', -1], ['travel', 4]], 100);
  tr.shown = 100 + 2 * T; tr.told = 100 + 2 * T;
  pushAct(tr, 5, 'forage', 2);
  assert.equal(tr.n, 1);
  assert.equal(actSince(tr), -Infinity);
  assert.ok(Number.isNaN(tr.shown) && Number.isNaN(tr.told));
});

test('what counts as the body showing the act', () => {
  assert.equal(bodyShows('travel', body()), false, 'a trip: the body sits');
  assert.equal(bodyShows('travel', body({ moving: true })), true, 'it walks');
  assert.equal(bodyShows('travel', body({ climbing: true })), true, 'it comes down from its perch');
  assert.equal(bodyShows('forage', body({ gap: 12, moving: true })), false, 'a stationary act: still 12 m away');
  assert.equal(bodyShows('forage', body({ gap: 4, climbing: true })), false, 'still climbing to the food');
  assert.equal(bodyShows('forage', body({ gap: ARRIVED_M })), true, 'it is where the animal is');
  // W6: within reach of its place but still in its last strides, it has not begun the act (the tag turned a moment
  // before the pose could); a feeding shuffle is the act itself.
  assert.equal(bodyShows('groom', body({ gap: 0.2, moving: true })), false, 'still walking the last step');
  assert.equal(bodyShows('groom', body({ gap: 0.2 })), true, 'there, and stopped');
  assert.equal(bodyShows('forage', body({ gap: 0.2, moving: true, shuffling: true })), true, 'a shuffle on the spot is not an approach');
  assert.equal(bodyShows('charge', body({ gap: 30 })), true, 'urgent acts are never waited for');
});

test('the rule: announced while the body has not begun the act, inside the window, at watching speeds', () => {
  const since = 10, lag = since - 1.5 * T, inWindow = since + (ABOUT_TICKS - 0.5) * T, past = since + ABOUT_TICKS * T;
  // A trip begun in the simulation; the drawn body has not set off.
  assert.equal(aboutTo('travel', since, lag, body(), 60), true);
  assert.equal(aboutTo('travel', since, lag, body({ moving: true }), 60), false, 'it walks: the plain verb');
  assert.equal(aboutTo('travel', since, lag, body({ climbing: true }), 1), false, 'it is coming down: the plain verb');
  assert.equal(aboutTo('follow', since, inWindow, body(), 1), true, 'still waiting, inside the window');
  assert.equal(aboutTo('follow', since, past, body(), 1), false, 'the window has closed: the wait is the act');
  // Arrived in the simulation; the drawn body is still on its way.
  assert.equal(aboutTo('forage', since, lag, body({ gap: 9, moving: true }), 60), true);
  assert.equal(aboutTo('groom', since, inWindow, body({ gap: 3, moving: true }), 1), true, 'still walking up to the partner');
  assert.equal(aboutTo('forage', since, inWindow, body({ gap: 6, climbing: true }), 1), true, 'still climbing to the food');
  // W6: where the animal already is, the act is announced until the body's own drawn time has reached it (the pose
  // waits for that moment too), and not after.
  assert.equal(aboutTo('rest', since, lag, body({ gap: 0.1 }), 60), true, 'its drawn time has not reached the act');
  assert.equal(aboutTo('rest', since, since, body({ gap: 0.1 }), 60), false, 'it has, and the body is there');
  // W6: an approach is announced for as long as it lasts (a walk to water takes minutes); a trip keeps its window.
  assert.equal(aboutTo('forage', since, past, body({ gap: 9, moving: true }), 1), true, 'still on its way after the old window');
  assert.equal(aboutTo('drink', since, since + 150 * T, body({ gap: 9, moving: true }), 1), true, 'a walk of 150 ticks');
  assert.equal(aboutTo('drink', since, since + 150 * T, body({ gap: 0.5 }), 1), false, 'there');
  // Once the body has been seen to begin the act it is not announced again.
  assert.equal(aboutTo('forage', since, inWindow, body({ gap: 5, moving: true }), 1, true), false);
  // An act whose start is unknown is not new.
  assert.equal(aboutTo('travel', -Infinity, lag, body(), 1), false);
  // Urgent or pose-only acts are never announced; carried or dead animals neither.
  for (const a of ['charge', 'flee', 'display', 'attack', 'call', 'alarm', 'play', 'climb', 'dead'] as Action[]) assert.equal(aboutTo(a, since, lag, body({ gap: 20 }), 1), false, a);
  assert.equal(aboutTo('travel', since, lag, body({ passive: true }), 1), false);
  // Fast playback: the gap is too short to read.
  assert.equal(aboutTo('travel', since, lag, body(), ABOUT_MAX_RATE), true);
  assert.equal(aboutTo('travel', since, lag, body(), 600), false);
});

test('every action has a body sign', () => {
  const all: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead', 'nest',
    'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm'];
  for (const a of all) assert.ok(['go', 'stay', 'any'].includes(BODY_SIGN[a]), a);
  assert.equal(Object.keys(BODY_SIGN).length, all.length);
});

test('readDrawn reports the act the body is still in, and notes when the body has begun the new one', () => {
  const out: DrawnAct = { action: 'dead', targetId: 0, about: true, way: 9 };
  const tr = fill([['forage', 100300], ['forage', 100300], ['travel', 100777]]);
  const since = tr.t[tr.head];
  readDrawn(tr, since - 1.2 * T, body(), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100300, about: true, way: Way.soon });
  assert.ok(Number.isNaN(tr.shown));
  readDrawn(tr, since - 0.4 * T, body({ moving: true }), 1, out);       // the body has set off
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false, way: Way.none });
  assert.equal(tr.shown, since);
  readDrawn(tr, since + 2 * T, body(), 1, out);                         // a pause on the way is not a new start
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false, way: Way.none });
  readDrawn(createActTrack(), 0, body(), 1, out);                       // nothing recorded yet
  assert.equal(out.about, false);
});

test('W6, a stationary act: announced until the body\'s drawn time reaches it, then for as long as it walks there, once', () => {
  const out = drawn();
  const tr = fill([['rest', -1], ['rest', -1], ['groom', 12]]);
  const since = tr.t[tr.head];
  // Partner beside it. Stage W4 turned the tag (and the pose) at once; now both wait for the body's own time.
  readDrawn(tr, since - 1.8 * T, body({ gap: 0 }), 1, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true, way: Way.soon });
  assert.ok(Number.isNaN(tr.shown));
  // A tick later the simulation walks it to the partner: the body has ground to cover.
  pushAct(tr, since + T, 'groom', 12);
  readDrawn(tr, since - 0.8 * T, body({ gap: 4 }), 1, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true, way: Way.soon });
  readDrawn(tr, since + 0.5 * T, body({ gap: 2.5, moving: true }), 1, out);
  assert.equal(out.about, true, 'still walking up, after the lag');
  assert.equal(out.way, Way.walking);
  readDrawn(tr, since + 1.4 * T, body({ gap: 0.3, moving: true }), 1, out);
  assert.equal(out.way, Way.walking, 'within reach, still in its last strides');
  readDrawn(tr, since + 1.5 * T, body({ gap: 0.3 }), 1, out);
  assert.deepEqual(out, { action: 'groom', targetId: 12, about: false, way: Way.none });
  assert.equal(tr.shown, since, 'arrived');
  assert.equal(tr.shownAt, since + 1.5 * T, 'and when: the nest clip counts its building from here');
  readDrawn(tr, since + 2.5 * T, body({ gap: 3, moving: true }), 1, out);   // it shifts around its partner later
  assert.equal(out.about, false, 'not announced again');
  // In place from start to end: the tag and the act turn together when the drawn time reaches the act.
  const here = fill([['forage', 3], ['forage', 3], ['rest', -1]]), s2 = here.t[here.head];
  readDrawn(here, s2 - 0.01 * T, body(), 1, out); assert.equal(out.about, true); assert.equal(out.action, 'forage');
  readDrawn(here, s2, body(), 1, out); assert.deepEqual(out, { action: 'rest', targetId: -1, about: false, way: Way.none });
});

test('inside the playback lag an announcement is held while the body stands where the animal is for a moment', () => {
  const out = drawn();
  const tr = fill([['travel', 100300], ['travel', 100300], ['forage', 100300]]);
  const since = tr.t[tr.head];
  readDrawn(tr, since - 1.6 * T, body({ gap: 6, moving: true }), 1, out);
  assert.equal(out.about, true, 'walking in');
  readDrawn(tr, since - 0.9 * T, body({ gap: 0.2 }), 1, out);
  assert.equal(out.about, true, 'at the foot of the tree, the climb not drawn yet: still announced');
  readDrawn(tr, since - 0.2 * T, body({ gap: 7, climbing: true }), 1, out);
  assert.equal(out.about, true, 'climbing to the food');
  readDrawn(tr, since + 1.4 * T, body({ gap: 0.4 }), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100300, about: false, way: Way.none });
  // A trip is different: the moment the body sets off the announcement ends, lag or not.
  const trip = fill([['rest', -1], ['rest', -1], ['travel', 5]]), s2 = trip.t[trip.head];
  readDrawn(trip, s2 - 1.5 * T, body(), 1, out); assert.equal(out.about, true);
  readDrawn(trip, s2 - 1.0 * T, body({ climbing: true }), 1, out); assert.equal(out.about, false, 'coming down is the trip beginning');
});

test('driven like the frame loop at Real time and at 1 min/s, a trip from the ground is announced for two ticks and never after the body sets off', () => {
  for (const rate of [1, 60]) {
    const pb = createPlayback(), tr = createActTrack(), out = drawn();
    let acc = 0, time = 0, tick = 0, aboutFrames = 0, firstAbout = -1, lastAbout = -1, lateAbout = 0;
    const START = 12;                         // the tick whose state first shows the trip; the simulation moves it from the next tick
    const dt = 1 / 60, frames = Math.ceil((22 * 15) / rate / dt), b = body();
    for (let f = 0; f < frames; f++) {
      acc += dt * rate;
      while (acc >= 15) { acc -= 15; tick++; time = tick * T; }
      const act: Action = tick >= START ? 'travel' : 'rest', target = tick >= START ? 100400 : -1;
      if (advancePlayback(pb, time, acc / 15, 2) || actChanged(tr, act, target)) pushAct(tr, time, act, target);
      b.moving = pb.renderT >= START * T;      // the drawn path starts to move when the drawn time passes that state
      readDrawn(tr, pb.renderT, b, rate, out);
      if (out.about) { aboutFrames++; if (firstAbout < 0) firstAbout = f; lastAbout = f; if (b.moving) lateAbout++; assert.equal(out.action, 'rest'); }
      else assert.equal(out.action, act);
    }
    const seconds = aboutFrames * dt;
    assert.ok(aboutFrames > 0, `announced at rate ${rate}`);
    assert.equal(lateAbout, 0, 'never over a body that has set off');
    assert.equal(lastAbout - firstAbout + 1, aboutFrames, 'one unbroken stretch');
    assert.ok(Math.abs(seconds - 30 / rate) <= 3 * dt + 1e-9, `two ticks (${seconds.toFixed(2)} s at rate ${rate})`);
  }
});

test('a follower that never sets off is announced for the window and no longer', () => {
  const pb = createPlayback(), tr = createActTrack(), out = drawn();
  let acc = 0, time = 0, tick = 0, aboutFrames = 0;
  const START = 12, rate = 60, dt = 1 / 60, b = body();
  for (let f = 0; f < Math.ceil((40 * 15) / rate / dt); f++) {
    acc += dt * rate;
    while (acc >= 15) { acc -= 15; tick++; time = tick * T; }
    const act: Action = tick >= START ? 'follow' : 'rest';
    if (advancePlayback(pb, time, acc / 15, 2) || actChanged(tr, act, tick >= START ? 3 : -1)) pushAct(tr, time, act, tick >= START ? 3 : -1);
    if (readDrawn(tr, pb.renderT, b, rate, out).about) aboutFrames++;
  }
  const ticks = (aboutFrames * dt * rate) / 15;
  assert.ok(Math.abs(ticks - (ABOUT_TICKS + 2)) < 0.3, `the window plus the playback lag (${ticks.toFixed(2)} ticks)`);
});

// --- A feeding shuffle is not an approach (review of stage W4). On the field map the simulation's ground foragers
// eat from their first tick while creeping at 0.3 of a walk, which leaves the drawn body about 3 m behind for as long
// as the creep lasts: by distance alone the tag read "about to forage" over a body already feeding, for up to two
// simulated minutes (two real minutes at Real time).

/** A position record of steps (metres along x, and up) taken one per tick, newest last. */
const path = (steps: [number, number][], t0 = 10) => { const tr = createTrack(0, 0, 0); let x = 0, y = 0; pushSample(tr, t0, x, y, 0); steps.forEach(([dx, dy], i) => { x += dx; y += dy; pushSample(tr, t0 + (i + 1) * T, x, y, 0); }); return tr; };

test('a shuffle is told from a walk or a climb by the simulation\'s own last two steps', () => {
  const walk = 0.35, max = SHUFFLE_SHARE * walk, creep = 0.3 * walk * 15, stride = walk * 15;   // the field map's walk, m per tick
  assert.ok(creep < max * 15 && 0.9 * stride > max * 15, 'the threshold sits between the feeding creep and the slowest approach');
  assert.equal(shuffles(path([[creep, 0], [creep, 0], [creep, 0]]), max), true, 'creeping as it feeds');
  assert.equal(shuffles(path([[0, 0], [0, 0]]), max), true, 'sitting still');
  assert.equal(shuffles(path([[stride, 0], [stride, 0]]), max), false, 'walking to a place');
  assert.equal(shuffles(path([[stride, 0], [creep, 0]]), max), false, 'the walk in is still to be played');
  assert.equal(shuffles(path([[creep, 0], [stride, 0]]), max), false, 'it has just set off at a walk');
  assert.equal(shuffles(path([[0, 3.3], [0, 3.3]]), max), false, 'climbing');
  assert.equal(shuffles(path([[creep, 0]]), max), false, 'two states: nothing is known yet');
  assert.equal(shuffles(path([[creep, 0], [creep, 0]]), 0), false, 'no walking speed given: never a shuffle');
  // The small map walks at 0.04 m/s: its creep is a shuffle, its walk is not.
  assert.equal(shuffles(path([[0.012 * 15, 0], [0.012 * 15, 0]]), SHUFFLE_SHARE * 0.04), true);
  assert.equal(shuffles(path([[0.04 * 15, 0], [0.04 * 15, 0]]), SHUFFLE_SHARE * 0.04), false);
  // Several ticks in one step (fast playback) are judged by speed, not by distance.
  const far = createTrack(0, 0, 0); pushSample(far, 10, 0, 0, 0); pushSample(far, 10 + 4 * T, 4 * creep, 0, 0); pushSample(far, 10 + 8 * T, 8 * creep, 0, 0);
  assert.equal(shuffles(far, max), true);
});

test('readBody reads the drawn path: on the move, going up or down, the gap, and whether only a shuffle is left', () => {
  const out = body({ passive: true }), tr = path([[1.5, 0], [1.5, 0], [1.5, 0]]);
  sampleSmooth(tr, 10 + 1.5 * T);
  readBody(out, tr, 4.5, 0, 0, false, false, 0.35);
  assert.equal(out.passive, false); assert.equal(out.climbing, false);
  assert.equal(out.moving, true, 'the path moves at 0.1 m/s, over the 0.05 m/s that counts as on the move');
  assert.ok(Math.abs(out.gap - 2.25) < 0.05, `a tick and a half of creep behind (${out.gap.toFixed(2)} m)`);
  assert.equal(out.shuffling, true);
  readBody(out, tr, 4.5, 0, 0, false, true, 0.04);
  assert.equal(out.shuffling, false, 'on the small map 0.1 m/s is faster than a walk'); assert.equal(out.passive, true);
  const up = path([[0, 3.3], [0, 3.3], [0, 3.3]]); sampleSmooth(up, 10 + 1.5 * T);
  readBody(out, up, 0, 9.9, 0, false, false, 0.35);
  assert.equal(out.climbing, true); assert.equal(out.shuffling, false);
  const sat = path([[0, 0], [0, 0], [0, 0]]); sampleSmooth(sat, 10 + 1.5 * T);
  readBody(out, sat, 0, 0, 0, true, false, 0.35);
  assert.equal(out.moving, true, 'drawn in a walking clip'); assert.equal(out.gap, 0);
});

test('a ground forager creeping as it feeds is announced until its drawn time reaches the act and not after; a walk in until only a shuffle is left', () => {
  const out = drawn();
  const tr = fill([['play', 19], ['play', 19], ['forage', -1]]);
  const since = tr.t[tr.head];
  // The simulation creeps on from the first tick, eating. Inside the playback lag the body is drawn at the old spot in
  // the pose of the act before (W6: the pose follows this record), so "about to forage" is true of it. Stage W4 did
  // not announce it, because the body was then already drawn in the feeding clip.
  pushAct(tr, since + T, 'forage', -1);
  readDrawn(tr, since - 0.9 * T, body({ gap: 2.2, shuffling: true }), 1, out);
  // (Play is drawn the moment it begins and is over the moment it ends: the waiting body stands, drawn as 'travel'.)
  assert.deepEqual(out, { action: 'travel', targetId: -1, about: true, way: Way.soon });
  assert.ok(Number.isNaN(tr.shown), 'not noted as begun inside the lag: the simulation may still walk it off');
  // Once its drawn time is inside the act a creep is the act itself, however far behind the body trails.
  readDrawn(tr, since + 0.1 * T, body({ gap: 3.1, moving: true, shuffling: true }), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: -1, about: false, way: Way.none });
  assert.equal(tr.shown, since, 'noted as begun once its drawn time is inside the act');
  readDrawn(tr, since + 3 * T, body({ gap: 3.1, moving: true }), 1, out);
  assert.equal(out.about, false, 'and not announced again');
  // By distance alone it would have been announced for as long as it creeps.
  assert.equal(aboutTo('forage', since, since + 3 * T, body({ gap: 3.1, moving: true }), 1), true);
  assert.equal(aboutTo('forage', since, since + 3 * T, body({ gap: 3.1, moving: true, shuffling: true }), 1), false);
  // Had it set off at a walk inside the lag instead, it is announced until only a shuffle is left.
  const walk = fill([['rest', -1], ['rest', -1], ['forage', 100300]]), s2 = walk.t[walk.head];
  readDrawn(walk, s2 - 1.9 * T, body({ gap: 0, shuffling: true }), 1, out); assert.equal(out.way, Way.soon, 'nothing has moved yet');
  pushAct(walk, s2 + T, 'forage', 100300);
  readDrawn(walk, s2 - 0.9 * T, body({ gap: 5 }), 1, out); assert.equal(out.about, true, 'the simulation walked it 5 m: the body has that to play');
  readDrawn(walk, s2 + 0.5 * T, body({ gap: 2.5, moving: true }), 1, out); assert.equal(out.way, Way.walking);
  readDrawn(walk, s2 + 1.2 * T, body({ gap: 1.4, moving: true, shuffling: true }), 1, out); assert.equal(out.about, false, 'the last short step is not waited for');
  // A trip never begins by shuffling.
  assert.equal(bodyShows('forage', body({ gap: 3.1, shuffling: true })), true);
  assert.equal(bodyShows('travel', body({ gap: 3.1, shuffling: true })), false);
});

test('W6: the approach is named for what the body does, for as long as it lasts, and the words are the same on the tag and in the strip', () => {
  const out = drawn();
  // A walk to water: the act is "drink" from the first tick of the walk. 40 ticks of walking, then the bank.
  const tr = fill([['forage', -1], ['forage', -1], ['drink', 200035]]), since = tr.t[tr.head];
  readDrawn(tr, since - 1.5 * T, body({ gap: 5 }), 1, out);
  assert.equal(out.way, Way.soon, 'not set off: about to drink');
  for (let k = 1; k <= 40; k++) pushAct(tr, since + k * T, 'drink', 200035);
  assert.equal(actSince(tr), -Infinity, 'the ring has forgotten when the act began');
  assert.equal(actStart(tr), since, 'the note beside it has not');
  readDrawn(tr, since + 38 * T, body({ gap: 10, moving: true }), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: -1, about: true, way: Way.walking }, 'ten minutes in: still walking to drink, and the body is not drawn drinking');
  readDrawn(tr, since + 39 * T, body({ gap: 4 }), 1, out);
  assert.equal(out.way, Way.going, 'a pause on the way: going to drink');
  readDrawn(tr, since + 40 * T, body({ gap: 0.4 }), 1, out);
  assert.deepEqual(out, { action: 'drink', targetId: 200035, about: false, way: Way.none }, 'at the water: drinking');
  // Up to a crown and down from one.
  const up = fill([['travel', 100300], ['travel', 100300], ['forage', 100300]]), s2 = up.t[up.head];
  readDrawn(up, s2 + T, body({ gap: 6, climbing: true }), 1, out); assert.equal(out.way, Way.climbing);
  const down = fill([['rest', -1], ['rest', -1], ['drink', 200001]]), s3 = down.t[down.head];
  readDrawn(down, s3 - 0.5 * T, body({ gap: 9, climbing: true, down: true }), 1, out); assert.equal(out.way, Way.down);
  // A trip has no way to it: it is "about to" until the body sets off.
  const trip = fill([['rest', -1], ['rest', -1], ['travel', 5]]), s4 = trip.t[trip.head];
  readDrawn(trip, s4 - T, body(), 1, out); assert.equal(out.way, Way.soon);
  // The words.
  assert.deepEqual([...WAY_WORDS], ['', 'about to', 'going to', 'walking to', 'climbing to', 'coming down to']);
  assert.equal(`${WAY_WORDS[Way.walking]} ${wayVerb('drink', Way.walking, 'drink')}`, 'walking to drink');
  assert.equal(`${WAY_WORDS[Way.climbing]} ${wayVerb('forage', Way.climbing, 'forage')}`, 'climbing to feed');
  assert.equal(`${WAY_WORDS[Way.soon]} ${wayVerb('forage', Way.soon, 'forage')}`, 'about to forage');
  assert.equal(`${WAY_WORDS[Way.going]} ${wayVerb('groom', Way.going, 'groom')}`, 'going to groom');
  assert.equal(actionOnWay('drink', Way.walking), 'Walking to drink');
  assert.equal(actionOnWay('forage', Way.climbing), 'Climbing to feed');
  assert.equal(actionOnWay('drink', Way.down), 'Coming down to drink');
  assert.equal(actionOnWay('travel', Way.soon), 'About to travel');
  for (const a of Object.keys(BODY_SIGN) as Action[]) for (const w of [Way.soon, Way.going, Way.walking, Way.climbing, Way.down])
    assert.equal(actionOnWay(a, w).toLowerCase().startsWith(`${WAY_WORDS[w]} `), true, `${a} ${w}: the strip leads with the tag's words`);
});

test('W6: the body stays in the act it was seen to begin when the animal changes its mind on the way', () => {
  const out = drawn();
  const tr = fill([['rest', -1], ['rest', -1], ['groom', 7]]), s1 = tr.t[tr.head];
  readDrawn(tr, s1 - T, body({ gap: 6 }), 1, out);
  assert.equal(out.action, 'rest');
  // Before the body has begun the grooming the animal turns to a trip: the body is still in the rest, not in a
  // grooming it never started.
  pushAct(tr, s1 + T, 'travel', 100500);
  readDrawn(tr, s1 - 0.5 * T, body(), 1, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true, way: Way.soon });
  // It had set off for the grooming when it changed its mind: the body is in neither act, it is on the move.
  const tr3 = fill([['rest', -1], ['rest', -1], ['groom', 7]]), s3 = tr3.t[tr3.head];
  readDrawn(tr3, s3 + 0.5 * T, body({ gap: 6, moving: true }), 1, out);
  assert.equal(out.way, Way.walking);
  pushAct(tr3, s3 + 2 * T, 'travel', 100500);
  readDrawn(tr3, s3 + 0.6 * T, body(), 1, out);
  assert.deepEqual(out, { action: 'travel', targetId: -1, about: true, way: Way.soon }, 'drawn standing or walking, not resting and not grooming');
  // An urgent act (drawn the moment it begins) is over the moment it ends: the body does not go on calling while it
  // waits for the next act, it stands.
  const tr4 = fill([['rest', -1], ['call', -1], ['call', -1], ['travel', 100500]]), s4 = tr4.t[tr4.head];
  readDrawn(tr4, s4 - T, body(), 1, out);
  assert.deepEqual(out, { action: 'travel', targetId: -1, about: true, way: Way.soon });
  // An act it did begin is the one it is in when the next is announced.
  const tr2 = fill([['rest', -1], ['rest', -1], ['groom', 7]]), s2 = tr2.t[tr2.head];
  readDrawn(tr2, s2 + 0.2 * T, body({ gap: 0.1 }), 1, out);
  assert.equal(tr2.shown, s2);
  pushAct(tr2, s2 + T, 'travel', 100500);
  readDrawn(tr2, s2 - 0.5 * T + T, body(), 1, out);
  assert.deepEqual(out, { action: 'groom', targetId: 7, about: true, way: Way.soon });
});

test('the field simulation through the frame loop\'s own parts: animals that start feeding on the ground where they are are not announced once their drawn time is in the act; walks and climbs to a crown still are', () => {
  // Field map, seed 48, 06:30 to 09:10, two frames per tick, animals aged 8 and over. The clip state is left out
  // (false): the rule reads the path.
  const w = createWorld(48, { profile: 'field' }), P = paramsOf(w), jump2 = relocationJump2(P);
  const pb = createPlayback(), tracks = new Map<number, Track>(), acts = new Map<number, ActTrack>(), fromGround = new Map<string, boolean>();
  const b = body(), out = drawn();
  let groundStarts = 0, groundAbout = 0, crownInAct = 0, crownInLag = 0, byDistance = 0;
  for (let tick = 0; tick < 640; tick++) {
    tickWorld(w);
    for (let f = 0; f < 2; f++) {
      const fresh = advancePlayback(pb, w.time, f / 2, 2), rt = pb.renderT;
      for (const c of w.chimps) {
        if (!c.alive) continue;
        const y = Math.max(0, c.position[1] ?? 0);
        let tr = tracks.get(c.id), at = acts.get(c.id);
        if (!tr) { tr = createTrack(c.position[0], y, c.position[2]); tracks.set(c.id, tr); }
        if (!at) { at = createActTrack(); acts.set(c.id, at); }
        const changed = actChanged(at, c.action, c.targetId);
        if (fresh || tr.n === 0) pushSample(tr, w.time, c.position[0], y, c.position[2]);
        if (fresh || changed) pushAct(at, w.time, c.action, c.targetId);
        sampleSmooth(tr, rt, jump2);
        if (c.age < 8 || c.action !== 'forage') continue;
        const since = actStart(at);
        if (since === -Infinity) continue;
        const key = `${c.id}@${since}`;
        // "Where it is": on the ground, and neither of the two steps before the act was faster than a feeding shuffle
        // (it did not walk or come down into the act; such an arrival is rightly announced while the body plays it).
        if (!fromGround.has(key)) { const here = y < 0.05 && shuffles(tr, SHUFFLE_SHARE * P.walkMps); fromGround.set(key, here); if (c.targetId < 0 && here) groundStarts++; }
        readBody(b, tr, c.position[0], y, c.position[2], false, false, P.walkMps);
        const inAct = rt >= since, onGround = c.targetId < 0 && fromGround.get(key) === true;
        // What distance alone would say (the rule as first built), before the record is touched by readDrawn.
        if (onGround && at.shown !== since && aboutTo('forage', since, rt, { ...b, shuffling: false }, 1)) byDistance++;
        readDrawn(at, rt, b, 1, out);
        if (!out.about) continue;
        // (W6: inside the lag every stationary act is announced, the pose waits with it; the claim is about afterwards.)
        if (onGround) { if (inAct) groundAbout++; } else if (c.targetId >= 0) { if (inAct) crownInAct++; else crownInLag++; }
      }
    }
  }
  assert.ok(groundStarts >= 2, `animals started foraging on the ground where they were (${groundStarts})`);
  assert.ok(byDistance > 0, `by distance alone they would be announced while already feeding (${byDistance} half-ticks)`);
  assert.equal(groundAbout, 0, 'never "about to forage" over an animal feeding on the ground where it is, once its drawn time is in the act');
  assert.ok(crownInLag > 20 && crownInAct > 20, `a walk or a climb to a crown is still announced (${crownInLag} half-ticks inside the lag, ${crownInAct} after it)`);
});

// --- W6 review (11 October 2026): the act a body is drawn in must be one it was drawn in a moment ago. Before these
// rules an infant carried since dawn, or any animal after a fast-forward, was drawn in the night's nest act (asleep,
// at its nest tree, hundreds of metres from where the simulation had it) for the two ticks of its next announcement.

test('W6 review: a body drawn in an act without an announcement (carried, or a fast rate) is in that act when the next one begins', () => {
  const out = drawn();
  // An infant carried from its nest: nothing it does is announced, and each act is the one its body is in.
  const tr = fill([['nest', 121236], ['nest', 121236]]);
  let t = tr.t[tr.head];
  const carried = body({ passive: true, gap: 0 });
  for (const [a, g] of [['nurse', 43], ['rest', -1], ['play', 20], ['nurse', 43], ['rest', -1]] as [Action, number][]) {
    t += T; pushAct(tr, t, a, g);
    readDrawn(tr, t - 2 * T, carried, 1, out);
    assert.deepEqual(out, { action: a, targetId: g, about: false, way: Way.none }, `carried: drawn in ${a} at once`);
  }
  // Set down by its mother, it takes a new act: its body is still in the rest it was in on her, not in the nest of the morning.
  t += T; pushAct(tr, t, 'forage', 100200);
  readDrawn(tr, t - 2 * T, body({ gap: 0 }), 1, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true, way: Way.soon });
  assert.notEqual(out.action, 'nest');
  // Played fast, nothing is announced either; slowed down, the next act is announced over the act just drawn.
  const fast = fill([['nest', 121236], ['nest', 121236]]);
  let u = fast.t[fast.head];
  for (const [a, g] of [['travel', 100300], ['forage', 100300], ['groom', 7]] as [Action, number][]) {
    u += T; pushAct(fast, u, a, g);
    readDrawn(fast, u - 2 * T, body({ gap: 9, moving: true }), ABOUT_MAX_RATE * 5, out);
    assert.equal(out.about, false); assert.equal(out.action, a);
  }
  u += T; pushAct(fast, u, 'rest', -1);
  readDrawn(fast, u - 2 * T, body({ gap: 0 }), 60, out);
  assert.deepEqual(out, { action: 'groom', targetId: 7, about: true, way: Way.soon }, 'the grooming it was drawn in, not the nest');
  // An act that was drawn plain and is then announced after all (the rate dropped while the body was still walking
  // to it) is not one the body is in: the stage's own rule for a change of mind on the way still holds.
  const walk = fill([['rest', -1], ['rest', -1]]);
  let v = walk.t[walk.head];
  v += T; pushAct(walk, v, 'drink', 200001);
  readDrawn(walk, v - 2 * T, body({ gap: 40, moving: true }), ABOUT_MAX_RATE * 5, out);
  assert.equal(out.about, false);
  readDrawn(walk, v + T, body({ gap: 30, moving: true }), 4, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true, way: Way.walking });
  pushAct(walk, v + 2 * T, 'travel', 100500);
  readDrawn(walk, v + 1.1 * T, body({ gap: 5 }), 4, out);
  assert.deepEqual(out, { action: 'travel', targetId: -1, about: true, way: Way.soon }, 'on the move, not drinking where there is no water');
});

test('W6 review: after a skip of states (a fast-forward, a jump of the clock) nothing is announced by time and no older act is drawn; an approach still under way is named', () => {
  const out = drawn();
  const tr = fill([['nest', 121236], ['nest', 121236], ['nest', 121236]]);
  const t0 = tr.t[tr.head], s = t0 + 700 * T;
  // Hours later in one step: the act changed somewhere in between.
  pushAct(tr, s, 'forage', 100200);
  assert.equal(startUnseen(tr), true);
  assert.equal(actStart(tr), s, 'the first state seen after the skip stands for its start');
  // In its crown, where the simulation has it: drawn foraging at once, never "about to forage" and never in the nest.
  readDrawn(tr, s - 2 * T, body({ gap: 0 }), 4, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100200, about: false, way: Way.none });
  readDrawn(tr, s + 0.1 * T, body({ gap: 0 }), 4, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100200, about: false, way: Way.none });
  assert.equal(tr.shown, s, 'and seen in it once the position record can tell');
  // From there on single ticks are announced as usual, over the act just drawn.
  pushAct(tr, s + T, 'forage', 100200);
  pushAct(tr, s + 2 * T, 'travel', 100300);
  assert.equal(startUnseen(tr), false);
  readDrawn(tr, s, body({ gap: 0 }), 4, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100200, about: true, way: Way.soon });
  // An animal that was half way to water when the states were skipped: plain while the position record has nothing
  // to say (the body is cut to where the simulation has it), then "walking to drink" for the rest of the walk, drawn
  // on the move and not in the act of hours before.
  const w = fill([['nest', 121236], ['nest', 121236]]), sw = w.t[w.head] + 500 * T;
  pushAct(w, sw, 'drink', 200001);
  readDrawn(w, sw - 2 * T, body({ gap: 0 }), 4, out);
  assert.equal(out.about, false); assert.equal(out.action, 'drink');
  assert.notEqual(w.shown, sw, 'standing where it was cut to is not yet having arrived');
  pushAct(w, sw + T, 'drink', 200001); pushAct(w, sw + 2 * T, 'drink', 200001);
  readDrawn(w, sw + 0.1 * T, body({ gap: 10, moving: true }), 4, out);
  assert.deepEqual(out, { action: 'travel', targetId: -1, about: true, way: Way.walking });
  readDrawn(w, sw + 1.1 * T, body({ gap: 9 }), 4, out);
  assert.equal(out.way, Way.going, 'a pause on the way is "going to", never "about to": it set off before the skip');
  readDrawn(w, sw + 9 * T, body({ gap: 0.2 }), 4, out);
  assert.deepEqual(out, { action: 'drink', targetId: 200001, about: false, way: Way.none });
  // A trip in progress is travelling, not "about to travel", however still the cut body stands.
  const g = fill([['rest', -1], ['rest', -1]]), sg = g.t[g.head] + 40 * T;
  pushAct(g, sg, 'travel', 100300);
  readDrawn(g, sg - 2 * T, body(), 4, out);
  assert.deepEqual(out, { action: 'travel', targetId: 100300, about: false, way: Way.none });
  assert.equal(aboutTo('travel', sg, sg - 2 * T, body(), 4, false, true), false);
  assert.equal(aboutTo('travel', sg, sg - 2 * T, body(), 4, false, false), true, 'seen to begin, it would be announced');
  // The limit: a step of two ticks (a slow frame at 2 min/s) is still a change that was seen; three are not.
  assert.ok(SKIP_TICKS > 2 && SKIP_TICKS < 3);
  const two = fill([['rest', -1], ['rest', -1]]); pushAct(two, two.t[two.head] + 2 * T, 'groom', 7);
  assert.equal(startUnseen(two), false);
  const three = fill([['rest', -1], ['rest', -1]]); pushAct(three, three.t[three.head] + 3 * T, 'groom', 7);
  assert.equal(startUnseen(three), true);
  readDrawn(three, three.t[three.head] - 2 * T, body({ gap: 0 }), 1, out);
  assert.equal(out.action, 'groom', 'not the rest of three ticks ago');
});

test('W6 review: a body still going up a trunk is not shuffling, however short the last step of its climb', () => {
  const out = body();
  // Climbing 3.3 m a tick, then the last 2 m, then still: the two newest steps are as slow as a feeding shuffle.
  const up = path([[0, 3.3], [0, 3.3], [0, 2.0], [0, 0]]);
  assert.equal(shuffles(up, SHUFFLE_SHARE * 0.35), true, 'by the last two steps alone it would be');
  sampleSmooth(up, 10 + 2.4 * T);   // the drawn body is on the last, shorter step
  readBody(out, up, 0, 8.6, 0, false, false, 0.35);
  assert.equal(out.climbing, true); assert.equal(out.shuffling, false);
  assert.equal(bodyShows('forage', out), false, 'so the tag still reads "climbing to feed"');
  const d = drawn(), tr = fill([['travel', 100200], ['travel', 100200], ['forage', 100200], ['forage', 100200], ['forage', 100200]]);
  readDrawn(tr, tr.t[tr.head] - 0.6 * T, out, 1, d);
  assert.equal(d.way, Way.climbing);
  // Arrived and still: the act.
  sampleSmooth(up, 10 + 3.2 * T);
  readBody(out, up, 0, 8.6, 0, false, false, 0.35);
  assert.equal(out.climbing, false); assert.equal(bodyShows('forage', out), true);
});

test('W6 review: on the move is judged by the world\'s own walking speed, so a walk on the 160 m map counts', () => {
  assert.equal(movingMps(0.35), PATH_MOVING_MPS, 'the field map: unchanged');
  const small = movingMps(0.04);
  assert.ok(small < 0.9 * 0.04 && small > 0.3 * 0.04, 'the small map: between its feeding creep and its slowest approach');
  const out = body(), tr = path([[0.04 * 15, 0], [0.04 * 15, 0], [0.04 * 15, 0]]);
  sampleSmooth(tr, 10 + 1.5 * T);
  readBody(out, tr, 1.8, 0, 0, false, false, 0.04);
  assert.equal(out.moving, true, 'a walk at 0.04 m/s is a walk there, whatever clip the body is drawn in');
  const creep = path([[0.012 * 15, 0], [0.012 * 15, 0], [0.012 * 15, 0]]);
  sampleSmooth(creep, 10 + 1.5 * T);
  assert.ok(Math.hypot(creep.vx, creep.vz) / 3600 > 0.01, 'the path does creep');
  readBody(out, creep, 0.54, 0, 0, false, false, 0.04);
  assert.equal(out.moving, false, 'its feeding creep is not');
});
