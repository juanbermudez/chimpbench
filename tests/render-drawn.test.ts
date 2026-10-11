import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action } from '../src/types';
import { ABOUT_MAX_RATE, ABOUT_TICKS, ACT_HIST, ARRIVED_M, BODY_SIGN, SHUFFLE_SHARE, aboutTo, actBefore, actChanged, actSince, bodyShows, createActTrack, pushAct, readBody,
  readDrawn, shuffles, type ActTrack, type BodyState, type DrawnAct } from '../src/render/creatures/drawn';
import { TICK_HOURS, advancePlayback, createPlayback, createTrack, pushSample, relocationJump2, type Track } from '../src/render/creatures/playback';
import { sampleSmooth } from '../src/render/creatures/motion';
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';

// Stage W4: which act the drawn body is in (src/render/creatures/drawn.ts). Bodies are drawn two ticks behind the
// simulation and then still have to get there; the record of the last tick states says when the current act began,
// and the rule says whether the body has started it.

const T = TICK_HOURS;
const fill = (acts: [Action, number][], t0 = 10) => { const tr = createActTrack(); acts.forEach(([a, g], i) => pushAct(tr, t0 + i * T, a, g)); return tr; };
const body = (o: Partial<BodyState> = {}): BodyState => ({ moving: false, climbing: false, gap: 0, shuffling: false, passive: false, ...o });

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
  assert.equal(bodyShows('groom', body({ gap: 0.2, moving: true })), true, 'a small shuffle on the spot is not an approach');
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
  assert.equal(aboutTo('rest', since, lag, body({ gap: 0.1 }), 60), false, 'it is there: the pose is already the act');
  assert.equal(aboutTo('forage', since, past, body({ gap: 9, moving: true }), 1), false, 'at most the window');
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
  const out: DrawnAct = { action: 'dead', targetId: 0, about: true };
  const tr = fill([['forage', 100300], ['forage', 100300], ['travel', 100777]]);
  const since = tr.t[tr.head];
  readDrawn(tr, since - 1.2 * T, body(), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100300, about: true });
  assert.ok(Number.isNaN(tr.shown));
  readDrawn(tr, since - 0.4 * T, body({ moving: true }), 1, out);       // the body has set off
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false });
  assert.equal(tr.shown, since);
  readDrawn(tr, since + 2 * T, body(), 1, out);                         // a pause on the way is not a new start
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false });
  readDrawn(createActTrack(), 0, body(), 1, out);                       // nothing recorded yet
  assert.equal(out.about, false);
});

test('a stationary act: plain at once when the animal is already there, announced when the simulation moves it, once', () => {
  const out: DrawnAct = { action: 'rest', targetId: -1, about: false };
  const tr = fill([['rest', -1], ['rest', -1], ['groom', 12]]);
  const since = tr.t[tr.head];
  // Partner beside it: the pose changes at once, nothing is announced. Not noted as begun yet: the simulation may
  // still move the animal (the drawn time has not reached the state that first showed the act).
  readDrawn(tr, since - 1.8 * T, body({ gap: 0 }), 1, out);
  assert.equal(out.about, false); assert.ok(Number.isNaN(tr.shown));
  // A tick later the simulation walks it to the partner: the body has ground to cover.
  pushAct(tr, since + T, 'groom', 12);
  readDrawn(tr, since - 0.8 * T, body({ gap: 4 }), 1, out);
  assert.deepEqual(out, { action: 'rest', targetId: -1, about: true });
  readDrawn(tr, since + 0.5 * T, body({ gap: 2.5, moving: true }), 1, out);
  assert.equal(out.about, true, 'still walking up, after the lag');
  readDrawn(tr, since + 1.5 * T, body({ gap: 0.3, moving: true }), 1, out);
  assert.deepEqual(out, { action: 'groom', targetId: 12, about: false });
  assert.equal(tr.shown, since, 'arrived');
  readDrawn(tr, since + 2.5 * T, body({ gap: 3, moving: true }), 1, out);   // it shifts around its partner later
  assert.equal(out.about, false, 'not announced again');
});

test('inside the playback lag an announcement is held while the body stands where the animal is for a moment', () => {
  const out: DrawnAct = { action: 'rest', targetId: -1, about: false };
  const tr = fill([['travel', 100300], ['travel', 100300], ['forage', 100300]]);
  const since = tr.t[tr.head];
  readDrawn(tr, since - 1.6 * T, body({ gap: 6, moving: true }), 1, out);
  assert.equal(out.about, true, 'walking in');
  readDrawn(tr, since - 0.9 * T, body({ gap: 0.2 }), 1, out);
  assert.equal(out.about, true, 'at the foot of the tree, the climb not drawn yet: still announced');
  readDrawn(tr, since - 0.2 * T, body({ gap: 7, climbing: true }), 1, out);
  assert.equal(out.about, true, 'climbing to the food');
  readDrawn(tr, since + 1.4 * T, body({ gap: 0.4 }), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100300, about: false });
  // A trip is different: the moment the body sets off the announcement ends, lag or not.
  const trip = fill([['rest', -1], ['rest', -1], ['travel', 5]]), s2 = trip.t[trip.head];
  readDrawn(trip, s2 - 1.5 * T, body(), 1, out); assert.equal(out.about, true);
  readDrawn(trip, s2 - 1.0 * T, body({ climbing: true }), 1, out); assert.equal(out.about, false, 'coming down is the trip beginning');
});

test('driven like the frame loop at Real time and at 1 min/s, a trip from the ground is announced for two ticks and never after the body sets off', () => {
  for (const rate of [1, 60]) {
    const pb = createPlayback(), tr = createActTrack(), out: DrawnAct = { action: 'rest', targetId: -1, about: false };
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
  const pb = createPlayback(), tr = createActTrack(), out: DrawnAct = { action: 'rest', targetId: -1, about: false };
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

test('a ground forager creeping as it feeds is announced only until its drawn time is inside the act', () => {
  const out: DrawnAct = { action: 'rest', targetId: -1, about: false };
  const tr = fill([['play', 19], ['play', 19], ['forage', -1]]);
  const since = tr.t[tr.head];
  // Inside the playback lag the body is still in the act before; the simulation has crept on.
  pushAct(tr, since + T, 'forage', -1);
  readDrawn(tr, since - 0.9 * T, body({ gap: 2.2, shuffling: true }), 1, out);
  assert.deepEqual(out, { action: 'play', targetId: 19, about: true });
  // Its drawn time reaches the act: it creeps along feeding, metres behind the simulation, and that is the act.
  readDrawn(tr, since + 0.1 * T, body({ gap: 3.1, moving: true, shuffling: true }), 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: -1, about: false });
  assert.equal(tr.shown, since, 'noted as begun');
  readDrawn(tr, since + 3 * T, body({ gap: 3.1, moving: true, shuffling: true }), 1, out);
  assert.equal(out.about, false);
  // By distance alone it would have been announced for the whole window.
  assert.equal(aboutTo('forage', since, since + 3 * T, body({ gap: 3.1, moving: true }), 1), true);
  assert.equal(bodyShows('forage', body({ gap: 3.1, shuffling: true })), false, 'not before its drawn time is inside the act');
  assert.equal(bodyShows('forage', body({ gap: 3.1, shuffling: true }), true), true);
  // A trip never begins by shuffling.
  assert.equal(bodyShows('travel', body({ gap: 3.1, shuffling: true }), true), false);
});

test('the field simulation through the frame loop\'s own parts: ground foragers are not announced once their drawn time is inside the act; walks to a crown still are', () => {
  // Field map, seed 48, 06:30 to 09:10, two frames per tick, animals aged 8 and over. The clip state is left out
  // (false): the rule reads the path.
  const w = createWorld(48, { profile: 'field' }), P = paramsOf(w), jump2 = relocationJump2(P);
  const pb = createPlayback(), tracks = new Map<number, Track>(), acts = new Map<number, ActTrack>(), fromGround = new Map<string, boolean>();
  const b = body(), out: DrawnAct = { action: 'rest', targetId: -1, about: false };
  let groundStarts = 0, groundInAct = 0, groundInLag = 0, crownInAct = 0, byDistance = 0;
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
        const since = actSince(at);
        if (since === -Infinity) continue;
        const key = `${c.id}@${since}`;
        if (!fromGround.has(key)) { fromGround.set(key, y < 0.05); if (c.targetId < 0 && y < 0.05) groundStarts++; }
        readBody(b, tr, c.position[0], y, c.position[2], false, false, P.walkMps);
        const inAct = rt >= since, onGround = c.targetId < 0 && fromGround.get(key) === true;
        // What distance alone would say (the rule as first built), before the record is touched by readDrawn.
        if (onGround && inAct && at.shown !== since && aboutTo('forage', since, rt, { ...b, shuffling: false }, 1)) byDistance++;
        readDrawn(at, rt, b, 1, out);
        if (!out.about) continue;
        if (onGround) { if (inAct) groundInAct++; else groundInLag++; } else if (c.targetId >= 0 && inAct) crownInAct++;
      }
    }
  }
  assert.ok(groundStarts >= 3, `animals started foraging on the ground (${groundStarts})`);
  assert.ok(byDistance > 0, `by distance alone they would be announced while already feeding (${byDistance} half-ticks)`);
  assert.equal(groundInAct, 0, 'never "about to forage" over a ground forager whose drawn time is inside the act');
  assert.ok(groundInLag > 0, 'still announced while the body is in the act before');
  assert.ok(crownInAct > 20, `a walk or a climb to a crown is still announced (${crownInAct} half-ticks)`);
});
