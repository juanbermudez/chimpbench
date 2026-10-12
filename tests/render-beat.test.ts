import assert from 'node:assert/strict';
import test from 'node:test';
import type { Candidate } from '../src/types';
import {
  BACK_AFTER_S, BACK_FOR_S, BEAT_S, CATCH_UP, DEPART_RADIUS_M, DEPART_WINDOW_TICKS, GLANCE_S, GONE_EPS, Gaze, INTENT_S, LATE_MAX_TICKS, LOOK_S, Phase, RUNNER_MARGIN, STAGGER_ECO_S,
  STAGGER_REAL_S, THINK_SCAN_S, WAIT_CYCLE_S, beatPhase, choseBefore, deliberating, departFirst, departFollowers, departNearestFollower, departRank, firstMove, gazeFor, lateTarget,
  looksBack, ownsStep, realSeconds, restedBefore, runnerUp, staggerGap, startTime, stateBefore, stepLate, steppedAlready, waitLooksBack,
} from '../src/render/creatures/beat';
import { PATH_MOVING_MPS } from '../src/render/creatures/drawn';
import { TICK_HOURS, createTrack, pushSample } from '../src/render/creatures/playback';

// Stage W6: the decision shown on the body (src/render/creatures/beat.ts). The renderer knows an animal's next act
// two ticks before the drawn body performs it; the pure rules here say what the body does with that lead: which
// target the gaze takes and when, when the body starts, and in which order a party sets off. Every duration and
// spacing is a stylization; the tests pin the rules, not chimpanzee facts.

const T = TICK_HOURS;
const cand = (action: Candidate['action'], targetId: number, score: number): Candidate => ({ action, targetId, score, reason: '' });
/** A position record of steps (metres east, metres up) taken one per tick from time t0, newest last. */
const path = (steps: [number, number][], t0 = 10) => { const tr = createTrack(0, 0, 0); let x = 0, y = 0; pushSample(tr, t0, x, y, 0); steps.forEach(([dx, dy], i) => { x += dx; y += dy; pushSample(tr, t0 + (i + 1) * T, x, y, 0); }); return tr; };

test('the beat: a glance at the runner-up, then the chosen target, then the intention movement, counted back from the start', () => {
  assert.equal(BEAT_S, GLANCE_S + LOOK_S + INTENT_S);
  assert.ok(BEAT_S <= 15 / 4, 'the whole beat fits in one tick at the watching speed (3.75 s)');
  assert.equal(beatPhase(BEAT_S + 0.5, true), Phase.none, 'too early: the animal goes on with what it was doing');
  assert.equal(beatPhase(BEAT_S - 0.1, true), Phase.glance);
  assert.equal(beatPhase(INTENT_S + LOOK_S - 0.1, true), Phase.look);
  assert.equal(beatPhase(INTENT_S - 0.1, true), Phase.intent);
  assert.equal(beatPhase(0, true), Phase.none, 'the body has started');
  assert.equal(beatPhase(-3, true), Phase.none);
  assert.equal(beatPhase(Infinity, true), Phase.none, 'paused: no rate, no countdown');
  // No close runner-up: no glance, the look starts at its own time.
  assert.equal(beatPhase(BEAT_S - 0.1, false), Phase.none);
  assert.equal(beatPhase(INTENT_S + LOOK_S - 0.1, false), Phase.look);
  // Only the end of the beat plays when the lead is short: at 1 min/s two ticks are half a second.
  assert.equal(beatPhase(realSeconds(2 * T, 60), true), Phase.intent);
  assert.equal(realSeconds(T, 1), 15); assert.equal(realSeconds(T, 4), 3.75); assert.equal(realSeconds(T, 0), Infinity);
  // The parts come in order as the start nears, each once.
  const seen: number[] = [];
  for (let tau = 6; tau > -1; tau -= 0.05) { const p = beatPhase(tau, true); if (seen[seen.length - 1] !== p) seen.push(p); }
  assert.deepEqual(seen, [Phase.none, Phase.glance, Phase.look, Phase.intent, Phase.none]);
});

test('which target the gaze takes', () => {
  // Before the start: the runner-up, then the chosen target; nothing when the target has no place (a rest).
  assert.equal(gazeFor(Phase.glance, true, false, false, false, false, NaN), Gaze.alt);
  assert.equal(gazeFor(Phase.look, true, false, false, false, false, NaN), Gaze.goal);
  assert.equal(gazeFor(Phase.intent, true, false, false, false, false, NaN), Gaze.goal, 'it keeps looking at the goal while it rises');
  assert.equal(gazeFor(Phase.look, false, false, false, false, false, NaN), Gaze.none);
  assert.equal(gazeFor(Phase.none, true, false, false, false, false, NaN), Gaze.none, 'before the beat the ordinary attention looks');
  // Gone: the first mover of a departure looks back at a follower for a moment, nobody else does.
  const during = BACK_AFTER_S + BACK_FOR_S / 2;
  assert.equal(gazeFor(Phase.none, true, false, true, true, true, during), Gaze.back);
  assert.equal(gazeFor(Phase.none, true, false, true, true, true, BACK_AFTER_S / 2), Gaze.none, 'not at once');
  assert.equal(gazeFor(Phase.none, true, false, true, true, true, BACK_AFTER_S + BACK_FOR_S + 0.1), Gaze.none, 'and not for long');
  assert.equal(gazeFor(Phase.none, true, false, true, false, true, during), Gaze.none, 'a follower does not');
  assert.equal(gazeFor(Phase.none, true, false, true, true, false, during), Gaze.none, 'nobody behind');
  assert.equal(looksBack(during), true); assert.equal(looksBack(0), false);
  // Waiting for company: the goal, and back for part of every cycle.
  assert.equal(gazeFor(Phase.none, true, true, false, false, true, 1), Gaze.goal);
  assert.equal(gazeFor(Phase.none, true, true, false, false, true, WAIT_CYCLE_S - 0.2), Gaze.back);
  assert.equal(gazeFor(Phase.none, true, true, false, false, false, WAIT_CYCLE_S - 0.2), Gaze.goal, 'alone: only the goal');
  assert.equal(gazeFor(Phase.none, false, true, false, false, false, 1), Gaze.none);
  let back = 0; for (let t = 0; t < 4 * WAIT_CYCLE_S; t += 0.01) if (waitLooksBack(t)) back++;
  assert.ok(Math.abs(back * 0.01 - 4 * BACK_FOR_S) < 0.1, 'back for BACK_FOR_S of every WAIT_CYCLE_S');
});

test('the runner-up glanced at: the best other option that was close, goes elsewhere and can be found', () => {
  const everywhere = () => true;
  const list = [cand('travel', 100300, 0.65), cand('forage', 100200, 0.66), cand('rest', -1, 0.6), cand('groom', 7, 0.58), cand('drink', 200001, 0.2)];
  // Chosen: the trip. The feeding tree scored a hair higher (the rules draw among close scores): it is the runner-up.
  assert.equal(runnerUp(list, 'travel', 100300, everywhere), 1);
  // A place the renderer cannot find is skipped (a rest has none): the next best that has one.
  assert.equal(runnerUp(list, 'travel', 100300, id => id >= 0 && id !== 100200), 3);
  assert.equal(runnerUp(list, 'travel', 100300, () => false), -1);
  // Not close: more than the margin below the chosen option.
  assert.equal(runnerUp([cand('travel', 100300, 0.9), cand('forage', 100200, 0.9 - RUNNER_MARGIN - 0.01)], 'travel', 100300, everywhere), -1);
  assert.equal(runnerUp([cand('travel', 100300, 0.9), cand('forage', 100200, 0.9 - RUNNER_MARGIN + 0.01)], 'travel', 100300, everywhere), 1);
  // Another act on the same target is not somewhere else to look.
  assert.equal(runnerUp([cand('travel', 100300, 0.5), cand('forage', 100300, 0.6)], 'travel', 100300, everywhere), -1);
  // An act that is not on the list was not chosen from it (a reaction, a wait): nothing was weighed.
  assert.equal(runnerUp(list, 'flee', -1, everywhere), -1);
  assert.equal(runnerUp([], 'rest', -1, everywhere), -1);
  // The list is read, not changed.
  const copy = JSON.stringify(list); runnerUp(list, 'travel', 100300, everywhere); assert.equal(JSON.stringify(list), copy);
});

test('when the body starts: at the simulation\'s first step if it sets off from rest, else when its drawn time reaches the act', () => {
  const walk = 0.35 * 15, since = 10 + 3 * T;
  // The simulation decides and steps in one tick: the step that ends at `since` is the trip's first.
  const sameTick = path([[0, 0], [0, 0], [walk, 0], [walk, 0]]);
  assert.equal(firstMove(sameTick, since, PATH_MOVING_MPS), since - T);
  assert.equal(restedBefore(sameTick, since - T, PATH_MOVING_MPS), true);
  assert.equal(startTime(since, since - T, true), since - T);
  // The step comes a tick later (the act was chosen at the end of a tick).
  const nextTick = path([[0, 0], [0, 0], [0, 0], [walk, 0]]);
  assert.equal(firstMove(nextTick, since, PATH_MOVING_MPS), since);
  // Not moved yet (an initiator waiting for company): unknown, and it stands ready from `since`.
  const waits = path([[0, 0], [0, 0], [0, 0], [0, 0]]);
  assert.equal(firstMove(waits, since, PATH_MOVING_MPS), Infinity);
  assert.equal(startTime(since, Infinity, true), since);
  // A feeding creep is not a start; a climb down is.
  assert.equal(firstMove(path([[0, 0], [0, 0], [0.5, 0], [0.5, 0]]), since, PATH_MOVING_MPS), Infinity);
  assert.equal(firstMove(path([[0, 0], [0, 0], [0, -4.6], [0, -4.6]]), since, PATH_MOVING_MPS), since - T);
  // The act was chosen at the end of a tick, as the act before it finished its last stride: the step that ends at
  // `since` was the old act's (Chimp.actionTime is still 0 in the state that first shows the new one), and the
  // initiator then stands and waits for company.
  assert.equal(steppedAlready(15), true); assert.equal(steppedAlready(0), false); assert.equal(steppedAlready(undefined), false); assert.equal(steppedAlready(45), true);
  const tail = path([[walk, 0], [walk, 0], [walk, 0], [0, 0]]);
  assert.equal(firstMove(tail, since, PATH_MOVING_MPS, true), since - T, 'read as its own step it would count as gone');
  assert.equal(firstMove(tail, since, PATH_MOVING_MPS, false), Infinity, 'it has not moved in the new act: it waits');
  assert.equal(firstMove(nextTick, since, PATH_MOVING_MPS, false), since);
  assert.equal(ownsStep(0, tail, since, PATH_MOVING_MPS), false, 'it was walking before: the stride into the new act is the old act\'s');
  // The simulation moves a groomer toward its partner the moment the act starts, inside the tick that chose it, with
  // the act's clock still at 0. The animal stood still before, so that move is the new act's own first step.
  const dash = path([[0, 0], [0, 0], [19.4, 0], [4, 0]]);
  assert.equal(ownsStep(0, dash, since, PATH_MOVING_MPS), true);
  assert.equal(firstMove(dash, since, PATH_MOVING_MPS, ownsStep(0, dash, since, PATH_MOVING_MPS)), since - T, 'the body starts with that step, and the beat is counted down to it');
  assert.equal(ownsStep(15, tail, since, PATH_MOVING_MPS), true, 'an act that has run a tick owns its step whatever came before');
  assert.equal(stateBefore(dash, since), since - T); assert.equal(stateBefore(path([]), 3), -Infinity);
  // Movement before the act is not the act's: only steps that end at or after `since` count.
  const arrived = path([[walk, 0], [walk, 0], [0, 0], [0, 0]]);
  assert.equal(firstMove(arrived, since, PATH_MOVING_MPS), Infinity, 'it walked in before the act and has stood since');
  // Already walking when the act changes (a walker with a new goal): no rest to start from, so no intention movement.
  const walking = path([[walk, 0], [walk, 0], [walk, 0], [walk, 0]]);
  assert.equal(firstMove(walking, since, PATH_MOVING_MPS), since - T);
  assert.equal(restedBefore(walking, since - T, PATH_MOVING_MPS), false);
  assert.equal(startTime(since, since - T, false), since);
  assert.equal(restedBefore(path([[walk, 0]]), 3, PATH_MOVING_MPS), true, 'a record that does not reach back counts as rest');
});

test('the stagger order: who chose first goes first; within a tick the simulation\'s roster order decides', () => {
  assert.equal(choseBefore(10, 5, 10 + T, 1), true);
  assert.equal(choseBefore(10, 1, 10, 5), true, 'same tick: the earlier in the roster decided first');
  assert.equal(choseBefore(10, 5, 10, 1), false);
  // Five animals of one party; four take the trip to tree 100300, one stays (key -1). Roster order = array order.
  const TREE = 100300, key = [TREE, -1, TREE, TREE, TREE], since = [10 + T, 0, 10, 10, 10 + 3 * T], x = [0, 1, 2, 3, 4], z = [0, 0, 0, 0, 0];
  const win = DEPART_WINDOW_TICKS * T, rank = (i: number) => departRank(i, 5, key, since, x, z, win, DEPART_RADIUS_M);
  assert.deepEqual([0, 1, 2, 3, 4].map(rank), [2, 0, 0, 1, 3], 'animal 2 chose first (earliest tick, earlier in the roster than 3)');
  assert.equal(departFirst(0, 5, key, since, x, z, win, DEPART_RADIUS_M), 2);
  assert.equal(departFirst(2, 5, key, since, x, z, win, DEPART_RADIUS_M), 2);
  assert.equal(departFollowers(2, 5, key, since, x, z, win, DEPART_RADIUS_M), 3);
  assert.equal(departFollowers(4, 5, key, since, x, z, win, DEPART_RADIUS_M), 0);
  assert.equal(departNearestFollower(2, 5, key, since, x, z, win, DEPART_RADIUS_M), 3, 'the first mover looks back at the nearest of those behind it');
  assert.equal(departNearestFollower(4, 5, key, since, x, z, win, DEPART_RADIUS_M), -1);
  assert.equal(rank(1), 0); assert.equal(departFollowers(1, 5, key, since, x, z, win, DEPART_RADIUS_M), 0);
  // Not one departure: another tree, too far apart, or too long after.
  assert.equal(departRank(1, 2, [TREE, TREE + 1], [10, 10 + T], [0, 1], [0, 0], win, DEPART_RADIUS_M), 0);
  assert.equal(departRank(1, 2, [TREE, TREE], [10, 10 + T], [0, DEPART_RADIUS_M + 1], [0, 0], win, DEPART_RADIUS_M), 0);
  assert.equal(departRank(1, 2, [TREE, TREE], [10, 10 + win + T], [0, 1], [0, 0], win, DEPART_RADIUS_M), 0);
  assert.equal(departRank(1, 2, [TREE, TREE], [10, 10 + win], [0, 1], [0, 0], win, DEPART_RADIUS_M), 1);
});

test('a follower is drawn behind its own path by its place in the departure, never backwards, and catches up', () => {
  assert.equal(staggerGap(1) * 3600, STAGGER_ECO_S, 'Real time: 4 s apart');
  assert.equal(staggerGap(4) * 3600, STAGGER_REAL_S * 4, 'the watching speed: 1.5 real seconds apart');
  const move = 10;
  // Everyone's first step is in the same tick: the follower's lateness is its place times the gap.
  assert.equal(lateTarget(0, move, move, move - T, 1), 0, 'the first mover is never late');
  assert.ok(Math.abs(lateTarget(1, move, move, move - T, 1) * 3600 - 4) < 1e-9);
  assert.ok(Math.abs(lateTarget(2, move, move, move - T, 1) * 3600 - 8) < 1e-9);
  // The follower stepped a tick before the first mover did: it is held until the first mover has gone, and the gap more.
  assert.ok(Math.abs(lateTarget(1, move - T, move, move - T, 1) * 3600 - 19) < 1e-9);
  // The first mover has not moved yet: the follower is held at its own start (its drawn time stands still there)...
  assert.equal(lateTarget(1, move, Infinity, move - 0.5 * T, 1), 0, 'its own start is still ahead');
  assert.ok(Math.abs(lateTarget(1, move, Infinity, move + 0.4 * T, 1) - 0.4 * T) < 1e-12);
  // ...but never more than the record allows.
  assert.equal(lateTarget(1, move, Infinity, move + 5 * T, 1), LATE_MAX_TICKS * T);
  assert.equal(lateTarget(9, move, move, move, 1), LATE_MAX_TICKS * T);
  assert.equal(lateTarget(1, Infinity, move, move, 1), 0, 'the simulation has not moved it: nothing to delay');
  // W6 review: a follower that was already on the move when it took the trip (walking, or half way down a trunk) is
  // never held: its drawn time would stand still and it would freeze in mid-stride for up to a tick and a half.
  assert.equal(lateTarget(2, move, move, move - T, 1, false), 0);
  assert.equal(lateTarget(1, move - T, move, move - T, 4, false), 0);
  assert.equal(lateTarget(1, move, Infinity, move + 0.4 * T, 1, false), 0);
  assert.ok(lateTarget(2, move, move, move - T, 1, true) > 0, 'one that starts from rest still is');
  // One frame: the lateness grows no faster than drawn time (the body's time never runs backwards)...
  const d = T / 900;
  assert.equal(stepLate(0, 4 / 3600, d), d);
  assert.equal(stepLate(0, d / 2, d), d / 2);
  // ...and shrinks at CATCH_UP of drawn time.
  assert.ok(Math.abs(stepLate(4 / 3600, 0, d) - (4 / 3600 - CATCH_UP * d)) < 1e-15);
  assert.equal(stepLate(1e-9, 0, d), 0);
  assert.equal(stepLate(0.001, 0.5, 0), 0.001, 'paused: nothing changes');
  // W6 review: once the body has set off its lateness never grows (it would stop in mid-stride); it still shrinks.
  assert.equal(stepLate(0, 4 / 3600, d, true), 0);
  assert.equal(stepLate(2 / 3600, 4 / 3600, d, true), 2 / 3600);
  assert.ok(Math.abs(stepLate(4 / 3600, 0, d, true) - (4 / 3600 - CATCH_UP * d)) < 1e-15);
  // A follower held exactly at its own start has not set off: the hold goes on (the slack is far under a frame).
  assert.ok(GONE_EPS > 0 && GONE_EPS * 3600 < 0.01, 'a few milliseconds of ecological time');
});

test('three animals leaving on the same tick are drawn setting off one after another, at Real time and at the watching speed', () => {
  for (const rate of [1, 4]) {
    const move = 10, dt = 1 / 60, late = [0, 0, 0], startReal = [NaN, NaN, NaN];
    let renderT = move - T, real = 0, prev = renderT;
    for (let f = 0; f < 60 * 60 && startReal.some(Number.isNaN); f++) {
      real += dt; renderT += dt * rate / 3600;
      for (let k = 0; k < 3; k++) {
        // (as the frame loop calls it: with the test for a body that has set off)
        late[k] = stepLate(late[k], lateTarget(k, move, move, renderT, rate), renderT - prev, prev - late[k] > move + GONE_EPS);
        assert.ok(renderT - late[k] >= prev - (k === 0 ? 0 : late[k]) - 1e-12);
        if (Number.isNaN(startReal[k]) && renderT - late[k] >= move) startReal[k] = real;
      }
      prev = renderT;
    }
    const gap = Math.max(STAGGER_ECO_S / rate, STAGGER_REAL_S);
    assert.ok(startReal[0] < startReal[1] && startReal[1] < startReal[2], `in order at rate ${rate}`);
    assert.ok(Math.abs(startReal[1] - startReal[0] - gap) < 0.1 && Math.abs(startReal[2] - startReal[1] - gap) < 0.1, `${gap} s apart at rate ${rate} (${startReal.map(v => v.toFixed(2))})`);
  }
});

test('W6 review: a joiner the simulation moves a tick before its initiator is held at its own start until the initiator has gone, frame by frame', () => {
  // The simulation moves a joiner in the tick it joins, while the initiator still checks for company: the joiner's
  // first step is a tick before the first mover's, and the first mover's is not known until a tick later. The frame
  // loop must catch the joiner in the frame its drawn time first passes its own start (a fraction of a frame late)
  // and must not take that for a body that has set off (stepLate's `gone`, tested on the frame before).
  for (const rate of [1, 4, 60]) {
    const moveFirst = 10, moveSelf = moveFirst - T, dt = 1 / 60, step = dt * rate / 3600;
    let rt = moveSelf - 1.37 * T, late = 0, startSelf = NaN, startFirst = NaN;   // frames do not land on the start
    for (let f = 0; f < 200000 && Number.isNaN(startSelf); f++) {
      const prev = rt; rt += step;
      const known = rt + 2 * T >= moveFirst + T;   // the first mover's step is recorded a tick after it begins
      late = stepLate(late, lateTarget(1, moveSelf, known ? moveFirst : Infinity, rt, rate), step, prev - late > moveSelf + GONE_EPS);
      if (Number.isNaN(startFirst) && rt >= moveFirst) startFirst = rt;
      if (rt - late > moveSelf + 2 * step) startSelf = rt;
    }
    const gap = (startSelf - startFirst) * 3600, want = Math.min(Math.max(STAGGER_ECO_S, STAGGER_REAL_S * rate), LATE_MAX_TICKS * 15 - 15);
    assert.ok(startFirst < startSelf, `the first mover goes first at rate ${rate}`);
    assert.ok(Math.abs(gap - want) < 0.2 + 3 * step * 3600, `the joiner follows ${want} s later at rate ${rate} (${gap.toFixed(2)} s)`);
  }
  // A body that has been walking for a tick is gone: joined to a departure then, it is not stopped.
  assert.equal(stepLate(0, lateTarget(1, 10, 10, 10 + T, 1), T / 900, (10 + T) - 0 > 10 + GONE_EPS), 0);
});

test('a model-driven animal waiting for an answer keeps scanning; nobody else does (not seen with a model)', () => {
  assert.equal(deliberating('model', 12.5, 'lockstep'), true);
  assert.equal(deliberating('model', 12.5, 'async'), true);
  assert.equal(deliberating('model', null, 'async'), false, 'not parked at a decision point');
  assert.equal(deliberating('model', 12.5, 'off'), false, 'the rules decide for everyone');
  assert.equal(deliberating('rules', 12.5, 'async'), false);
  assert.ok(THINK_SCAN_S < 1.5, 'quicker than the shortest ordinary hold of a gaze (secondary.ts: 1.5 s)');
});

test('the field simulation: the first step read from the position record is the step the simulation took, also when it keeps an initiator waiting', async () => {
  // Field map, seed 48, 06:30 to 09:10, animals aged 8 and over. For every trip (travel, follow) that begins, the record
  // kept as the frame loop keeps it must name the tick in which the simulation first moved the animal in that act:
  // not the last stride of the act before (the act was chosen at the end of a tick), and not a start that has not
  // happened (the initiator stands and checks for company).
  const { createWorld, tickWorld } = await import('../src/simulation');
  const { BODY_SIGN } = await import('../src/render/creatures/drawn');
  const w = createWorld(48, { profile: 'field' });
  const tracks = new Map<number, ReturnType<typeof createTrack>>(), last = new Map<number, { k: string; x: number; y: number; z: number }>();
  interface Open { id: number; since: number; own: boolean; truth: number; read: number; ticks: number; tailMoved: boolean; k0: string }
  const open: Open[] = [], done: Open[] = [];
  for (let tick = 0; tick < 640; tick++) {
    tickWorld(w);
    for (const c of w.chimps) {
      if (!c.alive || c.age < 8) continue;
      const y = Math.max(0, c.position[1] ?? 0), p = last.get(c.id), k = `${c.action}>${c.targetId}`;
      let tr = tracks.get(c.id); if (!tr) { tr = createTrack(c.position[0], y, c.position[2]); tracks.set(c.id, tr); }
      pushSample(tr, w.time, c.position[0], y, c.position[2]);
      const stepped = p ? Math.hypot(c.position[0] - p.x, y - p.y, c.position[2] - p.z) > PATH_MOVING_MPS * 15 : false;
      for (const o of open) if (o.id === c.id) {
        if (k !== o.k0) { o.ticks = 99; continue; }
        o.ticks++;
        if (o.truth === Infinity && stepped) o.truth = w.time - T;                       // the step of this tick starts at the state before it
        if (o.read === Infinity) o.read = firstMove(tr, o.since, PATH_MOVING_MPS, o.own);
      }
      if (p && p.k !== k && BODY_SIGN[c.action] === 'go' && c.carryingDeadId === undefined) {
        const own = ownsStep(c.actionTime, tr, w.time, PATH_MOVING_MPS);
        const o: Open = { id: c.id, since: w.time, own, truth: own && stepped ? w.time - T : Infinity, read: firstMove(tr, w.time, PATH_MOVING_MPS, own), ticks: 0, tailMoved: !own && stepped, k0: k };
        open.push(o);
      }
      last.set(c.id, { k, x: c.position[0], y, z: c.position[2] });
    }
    for (let i = open.length - 1; i >= 0; i--) if (open[i].ticks >= 4) { if (open[i].ticks < 99) done.push(open[i]); open.splice(i, 1); }
  }
  assert.ok(done.length > 60, `trips that lasted four ticks (${done.length})`);
  const wrong = done.filter(o => !(o.read === o.truth || Math.abs(o.read - o.truth) < 1e-9));
  assert.equal(wrong.length, 0, `the first step is read as the simulation took it (${wrong.slice(0, 3).map(o => JSON.stringify(o)).join(' ')})`);
  const waited = done.filter(o => o.truth > o.since + 1e-9), tails = done.filter(o => o.tailMoved);
  assert.ok(waited.length >= 1, `some initiators were kept standing for a tick or more after their trip was first seen (${waited.length})`);
  assert.ok(tails.length >= 1, `some trips were chosen as the act before took its last stride (${tails.length}): read as its own step, that stride would be the trip beginning`);
});
