import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, tickWorld } from '../src/simulation';
import { moveTo } from '../src/sim/execution';
import { BANK_A, BANK_B, CHANNEL, FORD, bankOf, distToStream, streamCell } from '../src/sim/stream';
import { DEFAULTS } from '../src/sim/params';
const WALK = DEFAULTS.walkMps;

test('the stream crosses the map beside every water site, with fords, and trees and range centers stand clear', () => {
  const w = createWorld(48);
  const s = w.stream!;
  assert.ok(s, 'world.stream is generated');
  assert.ok(s.halfWidth >= 1.6 && s.halfWidth <= 2);
  assert.ok(s.crossings.length >= 2 && s.crossings.length <= 3);
  assert.ok(s.points[0][0] <= -80 && s.points.at(-1)![0] >= 80, 'edge to edge');
  for (let i = 1; i < s.points.length; i++) assert.ok(Math.hypot(s.points[i][0] - s.points[i - 1][0], s.points[i][2] - s.points[i - 1][2]) < 4, 'smooth polyline');
  assert.ok(w.water.length >= 3);
  for (const site of w.water) {
    const d = distToStream(s, site.position[0], site.position[2]);
    assert.ok(d >= s.halfWidth + 1 && d <= s.halfWidth + 2.1, `water site on the bank (${d.toFixed(2)} m)`);
  }
  for (const t of w.trees) assert.ok(distToStream(s, t.position[0], t.position[2]) >= s.halfWidth + 2 - 1e-9);
  for (const t of w.troops) assert.ok(distToStream(s, t.center[0], t.center[2]) >= s.halfWidth + 10, `${t.name} center clear of the channel`);
  for (const c of s.crossings) assert.equal(streamCell(w, c[0], c[2]), FORD);
});

test('chimps stay out of the channel except at fords', () => {
  const w = createWorld(7);
  let ground = 0, inChannel = 0;
  for (let i = 0; i < 5760; i++) {
    tickWorld(w);
    if (i % 4) continue;
    for (const c of w.chimps) if (c.alive && c.position[1] < 0.6) { ground++; if (streamCell(w, c.position[0], c.position[2]) === CHANNEL) inChannel++; }
  }
  assert.ok(inChannel / ground < 0.002, `${(inChannel / ground * 100).toFixed(3)}% of ground time in the channel`);
});

test('a walk to the far bank is routed through a ford', () => {
  const w = createWorld(48);
  const c = w.chimps.find(k => k.sex === 'male' && k.age > 20 && k.troopId === 1)!;
  const s = w.stream!;
  const mid = s.points[Math.floor(s.points.length * 0.12)];
  c.position = [mid[0], 0, mid[2] - 6]; c.nest = null; c.injury = 0; c.energy = 1;
  const from = bankOf(w, c.position[0], c.position[2]);
  const goal: [number, number] = [mid[0] + 1, mid[2] + 7];
  assert.notEqual(bankOf(w, goal[0], goal[1]), from, 'goal is across the stream');
  let usedFord = false, arrived = false;
  for (let i = 0; i < 800 && !arrived; i++) {
    arrived = moveTo(w, c, goal[0], 0, goal[1], WALK, 0.5);
    const cell = streamCell(w, c.position[0], c.position[2]);
    assert.notEqual(cell, CHANNEL, 'never wades the channel');
    if (cell === FORD) usedFord = true;
  }
  assert.ok(arrived, 'reached the far bank');
  assert.ok(usedFord);
  assert.ok([BANK_A, BANK_B].includes(bankOf(w, c.position[0], c.position[2])));
});

test('a goal on the same bank behind the northern loop is reached by walking around it', () => {
  for (const seed of [48, 7, 21]) {
    const w = createWorld(seed);
    const c = w.chimps.find(k => k.sex === 'male' && k.age > 20 && k.troopId === 1)!;
    const home = w.troops[0].center;
    // East of the loop's eastern arm, north of the stream: the same bank as the West range, but the straight line
    // home crosses the loop twice.
    c.position = [28, 0, -5]; c.nest = null; c.injury = 0; c.energy = 1;
    assert.equal(bankOf(w, 28, -5), bankOf(w, home[0], home[2]), 'same bank');
    let arrived = false;
    for (let i = 0; i < 3000 && !arrived; i++) {
      arrived = moveTo(w, c, home[0], 0, home[2], WALK, 3);
      assert.notEqual(streamCell(w, c.position[0], c.position[2]), CHANNEL, 'never wades the channel');
    }
    assert.ok(arrived, `seed ${seed}: reached home from behind the loop (stopped at ${c.position[0].toFixed(1)}, ${c.position[2].toFixed(1)})`);
  }
});
