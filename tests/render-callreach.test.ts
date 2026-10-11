import assert from 'node:assert/strict';
import test from 'node:test';
import type { Call, CallKind } from '../src/types';
import { ARC_FADE_S, ARC_GROW_S, ARC_HOLD_S, ARC_LIFE_S, FRESH_CALL_H, arcAlpha, arcRadius, arrivalDelay, createCallLog, drawsReach, inEarshot, logFind, logSlot, noteCalls } from '../src/render/callreach';
import { HEARD_HOLD_S, HEARD_LOOK_S, HEARD_REFRACTORY_S, createHeard, holding, listening, noteHeard } from '../src/render/creatures/heard';
import { createWorld, tickWorld } from '../src/simulation';

// Stage W10: the reach of a call as it is drawn (src/render/callreach.ts) and who has just heard one
// (src/render/creatures/heard.ts). The radius is the simulation's; the growth and the timings are stylizations.

const call = (id: number, kind: CallKind, x: number, z: number, radius: number, time: number, callerId = 1): Call => ({ id, kind, callerId, troopId: 1, position: [x, 0, z], time, radius });

test('the arc ends at the call\'s own radius, whatever that radius is', () => {
  for (const r of [9, 36, 50, 300, 1000]) {
    assert.equal(arcRadius(r, 0), 0);
    assert.equal(arcRadius(r, ARC_GROW_S), r, 'exactly the audible radius once grown');
    assert.equal(arcRadius(r, ARC_GROW_S + 1), r, 'and it stays there');
    assert.equal(arcRadius(r, -1), 0);
    let prev = 0;
    for (let t = 0; t <= ARC_GROW_S; t += 0.05) { const v = arcRadius(r, t); assert.ok(v >= prev - 1e-9 && v <= r + 1e-9, 'grows, never past the radius'); prev = v; }
  }
  assert.ok(ARC_GROW_S >= 2 && ARC_GROW_S <= 3, 'the brief: over 2 to 3 seconds');
  // Slow at the start: after a tenth of the time a 1 km arc is still inside a view a few hundred metres across.
  assert.ok(arcRadius(1000, ARC_GROW_S * 0.1) < 40);
});

test('the arc is visible while it grows and stands, and gone at the end of its life', () => {
  assert.equal(arcAlpha(-0.1), 0);
  assert.ok(arcAlpha(0.06) > 0 && arcAlpha(0.06) < 1);
  assert.equal(arcAlpha(1), 1);
  assert.equal(arcAlpha(ARC_GROW_S + ARC_HOLD_S), 1);
  assert.ok(Math.abs(arcAlpha(ARC_GROW_S + ARC_HOLD_S + ARC_FADE_S / 2) - 0.5) < 1e-9);
  assert.equal(arcAlpha(ARC_LIFE_S), 0);
  assert.equal(arcAlpha(Number.NaN), 0);
});

test('a listener is reached when the drawn arc passes it', () => {
  assert.equal(arrivalDelay(0, 1000), 0);
  assert.ok(Math.abs(arrivalDelay(1000, 1000) - ARC_GROW_S) < 1e-9);
  assert.ok(Math.abs(arrivalDelay(500, 1000) - ARC_GROW_S / 2) < 1e-9);
  assert.equal(arrivalDelay(1000.5, 1000), Infinity, 'outside the radius the call is not heard');
  assert.equal(arrivalDelay(10, 0), Infinity);
  for (const d of [5, 60, 333, 567, 940]) {
    const t = arrivalDelay(d, 1000);
    assert.ok(Math.abs(arcRadius(1000, t) - d) < 1e-6, `the arc is at ${d} m at that moment`);
  }
  assert.ok(inEarshot(call(1, 'pant-hoot', 100, 100, 36, 0), 120, 125));
  assert.ok(!inEarshot(call(1, 'pant-hoot', 100, 100, 36, 0), 130, 125));
});

test('which calls draw their reach', () => {
  for (const k of ['pant-hoot', 'drum', 'scream', 'bark', 'alarm-hoo', 'travel-hoo'] as CallKind[]) assert.ok(drawsReach(k), k);
  for (const k of ['pant-grunt', 'food-grunt', 'whimper', 'laugh', 'cough'] as CallKind[]) assert.ok(!drawsReach(k), k);
});

test('the call log notes each call once, in a fixed ring, and starts again in another world', () => {
  const log = createCallLog(4);
  const calls: Call[] = [call(1000001, 'laugh', 0, 0, 10, 5), call(1000002, 'pant-hoot', 10, 20, 1000, 5)];
  assert.equal(noteCalls(log, calls, 5, 100), 1, 'the laugh draws nothing');
  assert.equal(log.n, 1);
  assert.equal(logFind(log, 1000002), logSlot(log, 0));
  assert.equal(log.radius[logSlot(log, 0)], 1000); assert.equal(log.at[logSlot(log, 0)], 100); assert.equal(log.x[logSlot(log, 0)], 10);
  assert.equal(noteCalls(log, calls, 5.001, 100.1), 0, 'seen already');
  // An old call first seen long after it was given is not news.
  calls.push(call(1000003, 'drum', 0, 0, 1000, 5.001 - 2 * FRESH_CALL_H));
  assert.equal(noteCalls(log, calls, 5.001, 100.2), 0);
  assert.equal(logFind(log, 1000003), -1);
  for (let i = 0; i < 6; i++) calls.push(call(1000010 + i, 'pant-hoot', i, i, 1000, 5.002));
  assert.equal(noteCalls(log, calls, 5.002, 101), 6);
  assert.equal(log.n, 4, 'the ring keeps the last four');
  assert.equal(log.id[logSlot(log, 0)], 1000015); assert.equal(log.id[logSlot(log, 3)], 1000012);
  assert.equal(logFind(log, 1000002), -1, 'pushed out');
  assert.equal(logSlot(log, 4), -1);
  // The simulation prunes its list: the log does not mind a shorter list.
  assert.equal(noteCalls(log, calls.slice(-2), 5.003, 102), 0);
  // Another world: time ran backwards and ids start again.
  assert.equal(noteCalls(log, [call(1000001, 'scream', 7, 7, 300, 0.01)], 0.01, 200), 1);
  assert.equal(log.n, 1); assert.equal(log.kind[logSlot(log, 0)], 'scream');
});

test('the log follows a real world: every long call of a morning is noted once, with the simulation\'s radius', () => {
  const world = createWorld(48);
  const log = createCallLog(64);
  const want = new Map<number, number>();
  let got = 0;
  for (let t = 0; t < 960; t++) {
    tickWorld(world);
    for (const c of world.calls) if (drawsReach(c.kind) && !want.has(c.id)) want.set(c.id, c.radius);
    const added = noteCalls(log, world.calls, world.time, t / 4);
    for (let k = 0; k < added; k++) { const s = logSlot(log, k); assert.equal(log.radius[s], want.get(log.id[s]), 'the radius of the call record'); got++; }
  }
  assert.ok(want.size > 5, `the morning has long calls (${want.size})`);
  assert.equal(got, want.size);
});

test('a listener orients once, for a moment, and not again at once', () => {
  const t = createHeard(8);
  assert.ok(!listening(t, 3, 17, 10));
  assert.ok(noteHeard(t, 3, 17, 10.5, -40, 60));
  assert.ok(!listening(t, 3, 17, 10.4), 'not before the arc reaches it');
  assert.ok(listening(t, 3, 17, 10.5) && holding(t, 3, 17, 10.5));
  assert.ok(listening(t, 3, 17, 10.5 + HEARD_HOLD_S + 0.01) && !holding(t, 3, 17, 10.5 + HEARD_HOLD_S + 0.01), 'the clip resumes while the head is still turned');
  assert.ok(!listening(t, 3, 17, 10.5 + HEARD_LOOK_S));
  assert.ok(!listening(t, 3, 18, 10.6), 'another animal in the slot is not the listener');
  assert.ok(!noteHeard(t, 3, 17, 10.5 + HEARD_REFRACTORY_S - 0.1, 0, 0), 'within the refractory time');
  assert.equal(t.x[3], -40);
  assert.ok(noteHeard(t, 3, 17, 10.5 + HEARD_REFRACTORY_S + 0.1, 5, 6));
  assert.equal(t.x[3], 5);
  assert.ok(noteHeard(t, 3, 21, 11, 1, 2), 'a new animal in a reused slot is noted at once');
  assert.ok(!noteHeard(t, 9, 1, 0, 0, 0) && !noteHeard(t, -1, 1, 0, 0, 0), 'out of range');
  assert.ok(HEARD_HOLD_S >= 1 && HEARD_HOLD_S <= 2 && HEARD_LOOK_S >= HEARD_HOLD_S, 'the brief: a second or two');
});
