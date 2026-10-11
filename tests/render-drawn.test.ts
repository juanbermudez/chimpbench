import assert from 'node:assert/strict';
import test from 'node:test';
import type { Action } from '../src/types';
import { ABOUT_MAX_RATE, ACT_HIST, BODY_SIGN, aboutTo, actBefore, actChanged, actSince, createActTrack, pushAct, readDrawn, type DrawnAct } from '../src/render/creatures/drawn';
import { TICK_HOURS, advancePlayback, createPlayback } from '../src/render/creatures/playback';

// Stage W4: which act the drawn body is in (src/render/creatures/drawn.ts). Bodies are drawn two ticks behind the
// simulation; the record of the last tick states says when the current act began, and aboutTo() says whether the
// body has started it.

const T = TICK_HOURS;
const fill = (acts: [Action, number][], t0 = 10) => { const tr = createActTrack(); acts.forEach(([a, g], i) => pushAct(tr, t0 + i * T, a, g)); return tr; };

test('the record keeps the last tick states in a fixed ring and ignores nothing but a repeated time', () => {
  const tr = createActTrack();
  assert.equal(tr.n, 0);
  assert.equal(actSince(tr), -Infinity, 'an empty record names no new act');
  assert.equal(actBefore(tr), -1);
  for (let i = 0; i < 10; i++) pushAct(tr, i * T, i < 7 ? 'rest' : 'travel', i < 7 ? -1 : 100200);
  assert.equal(tr.n, ACT_HIST);
  assert.equal(tr.action.length, ACT_HIST); assert.equal(tr.t.length, ACT_HIST); assert.equal(tr.target.length, ACT_HIST);
  assert.equal(tr.action[tr.head], 'travel'); assert.equal(tr.target[tr.head], 100200);
  assert.equal(actSince(tr), 7 * T, 'the first state that showed the trip');
  assert.equal(tr.action[actBefore(tr)], 'rest');
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
  assert.equal(actSince(fill([['forage', 5], ['forage', 5], ['forage', 5], ['forage', 5]])), -Infinity);
  assert.equal(actSince(fill([['travel', 5]])), -Infinity, 'one state: nothing before it to change from');
  assert.equal(actBefore(fill([['travel', 5]])), -1);
  // A new target under the same verb is a new act (walking over to another partner).
  const tr = fill([['groom', 3], ['groom', 3], ['groom', 9]]);
  assert.equal(actSince(tr), tr.t[tr.head]);
});

test('a rewound world starts the record again', () => {
  const tr = fill([['rest', -1], ['rest', -1], ['travel', 4]], 100);
  pushAct(tr, 5, 'forage', 2);
  assert.equal(tr.n, 1);
  assert.equal(actSince(tr), -Infinity);
});

test('the rule: a trip is about to start while the body stands, a stationary act while the body still walks', () => {
  const since = 10, before = since - 1.5 * T, after = since + 0.1 * T;
  // A trip begun in the simulation; the drawn body has not set off.
  assert.equal(aboutTo('travel', since, before, false, false, 60), true);
  assert.equal(aboutTo('travel', since, before, true, false, 60), false, 'it walks: the plain verb');
  assert.equal(aboutTo('follow', since, before, false, false, 1), true);
  // Arrived in the simulation; the drawn body is still walking in.
  assert.equal(aboutTo('forage', since, before, true, false, 60), true);
  assert.equal(aboutTo('rest', since, before, true, false, 1), true);
  assert.equal(aboutTo('groom', since, before, true, false, 1), true, 'still walking up to the partner');
  assert.equal(aboutTo('forage', since, before, false, false, 60), false, 'it has stopped: the pose is already the act');
  // The drawn time has reached the state that first showed the act: never announced after that, whatever the body does.
  assert.equal(aboutTo('travel', since, since, false, false, 1), false);
  assert.equal(aboutTo('travel', since, after, false, false, 1), false);
  assert.equal(aboutTo('forage', since, after, true, false, 1), false);
  // An act whose start is unknown is not new.
  assert.equal(aboutTo('travel', -Infinity, before, false, false, 1), false);
  // Urgent or pose-only acts are never announced; carried infants neither.
  for (const a of ['charge', 'flee', 'display', 'attack', 'call', 'alarm', 'play', 'dead'] as Action[]) {
    assert.equal(aboutTo(a, since, before, false, false, 1), false, a);
    assert.equal(aboutTo(a, since, before, true, false, 1), false, a);
  }
  assert.equal(aboutTo('travel', since, before, false, true, 1), false, 'carried');
  // Fast playback: the gap is too short to read.
  assert.equal(aboutTo('travel', since, before, false, false, ABOUT_MAX_RATE), true);
  assert.equal(aboutTo('travel', since, before, false, false, 600), false);
});

test('every action has a body sign', () => {
  const all: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead', 'nest',
    'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm'];
  for (const a of all) assert.ok(['go', 'stay', 'any'].includes(BODY_SIGN[a]), a);
  assert.equal(Object.keys(BODY_SIGN).length, all.length);
});

test('readDrawn reports the act the body is still in while the new one is ahead of it', () => {
  const out: DrawnAct = { action: 'dead', targetId: 0, about: true };
  const tr = fill([['forage', 100300], ['forage', 100300], ['travel', 100777]]);
  const since = tr.t[tr.head];
  readDrawn(tr, since - 1.2 * T, false, false, 1, out);
  assert.deepEqual(out, { action: 'forage', targetId: 100300, about: true });
  readDrawn(tr, since - 1.2 * T, true, false, 1, out);       // the body has set off
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false });
  readDrawn(tr, since + 0.01 * T, false, false, 1, out);     // the drawn time caught up
  assert.deepEqual(out, { action: 'travel', targetId: 100777, about: false });
  readDrawn(createActTrack(), 0, false, false, 1, out);       // nothing recorded yet
  assert.equal(out.about, false);
});

test('driven like the frame loop at Real time and at 1 min/s, a trip is announced for at most two ticks and never after the body starts', () => {
  for (const rate of [1, 60]) {
    const pb = createPlayback(), tr = createActTrack(), out: DrawnAct = { action: 'rest', targetId: -1, about: false };
    let acc = 0, time = 0, tick = 0, aboutFrames = 0, firstAbout = -1, lastAbout = -1, lateAbout = 0;
    const START = 8;                          // the tick whose state first shows the trip
    const dt = 1 / 60, frames = Math.ceil((14 * 15) / rate / dt);
    for (let f = 0; f < frames; f++) {
      acc += dt * rate;
      while (acc >= 15) { acc -= 15; tick++; time = tick * T; }
      const act: Action = tick >= START ? 'travel' : 'rest';
      if (advancePlayback(pb, time, acc / 15, 2) || actChanged(tr, act, tick >= START ? 100400 : -1)) pushAct(tr, time, act, tick >= START ? 100400 : -1);
      // The simulation moves the animal in the tick it decides, so the drawn body sets off one tick before the drawn
      // time reaches the state that first showed the trip.
      const moving = pb.renderT >= (START - 1) * T;
      readDrawn(tr, pb.renderT, moving, false, rate, out);
      if (out.about) { aboutFrames++; if (firstAbout < 0) firstAbout = f; lastAbout = f; if (moving) lateAbout++; assert.equal(out.action, 'rest'); }
      else assert.equal(out.action, act);
    }
    const seconds = aboutFrames * dt;
    assert.ok(aboutFrames > 0, `announced at rate ${rate}`);
    assert.equal(lateAbout, 0, 'never over a body that has set off');
    assert.equal(lastAbout - firstAbout + 1, aboutFrames, 'one unbroken stretch');
    assert.ok(seconds <= (2 * 15) / rate + 2 * dt, `at most two ticks (${seconds.toFixed(2)} s at rate ${rate})`);
    assert.ok(Math.abs(seconds - 15 / rate) <= 3 * dt + 1e-9, `one tick when the body sets off a tick early (${seconds.toFixed(2)} s at rate ${rate})`);
  }
});
