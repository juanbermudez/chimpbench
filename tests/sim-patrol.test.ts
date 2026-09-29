import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { lossAt, noteContact, sectorContact, shareContacts } from '../src/sim/contact';
import { startAction } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { ix, simOf } from '../src/sim/state';
import { neighbourSectors, sectorDir } from '../src/sim/territory';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate, World } from '../src/types';
import { canonical, fnv } from './fixtures/golden';

// §5.3.1 C6 patrol corrections (docs/realism-design.md), with Amendment A.

const adultMales = (w: World, troop: number) => w.chimps.filter(c => c.alive && c.troopId === troop && c.sex === 'male' && c.age >= 15);

test('P1: with patrolHeardBeta 0, hearing strangers does not change the patrol hazard', () => {
  const run = (heard: boolean) => {
    const w = createWorld(48, { params: { patrolH0: 0.3 } });
    for (let i = 0; i < 5760 / 3; i++) tickWorld(w); // 14:30: inside the patrol window
    const males = adultMales(w, 1);
    for (const m of males) m.position = [males[0].position[0] + (m.id % 5), 0, males[0].position[2] + (m.id % 3)];
    simOf(w).patrols = {}; w.environment.rain = 0;
    const m = males[0], x = ix(m);
    x.patrolRoll = w.time - 1;
    if (heard) { x.heardAt = w.time - 1; x.heardTroop = 2; }
    perceive(w, m);
    return [x.impulse, x.impulseUntil, w.rng];
  };
  assert.deepEqual(run(true), run(false));
});

test('P3: the female join, lactating join and female stay scores are registry settings', () => {
  const score = (params: Record<string, number>) => {
    const w = createWorld(7, { params });
    for (let i = 0; i < 5760 / 3; i++) tickWorld(w);
    const leader = adultMales(w, 1)[0], f = w.chimps.find(c => c.alive && c.troopId === 1 && c.sex === 'female' && c.age >= 15 && !c.lactating)!;
    f.position = [leader.position[0] + 3, 0, leader.position[2]];
    simOf(w).patrols[1] = { leaderId: leader.id, neighborId: 3, start: w.time, phase: 0, wx: 0, wz: 0, until: w.time + 2, interId: -1, sector: 0, incursion: false, stopUntil: -1e9, lastStop: w.time, stops: 0, file: [leader.id], contact: false };
    leader.action = 'patrol'; f.action = 'rest';
    perceive(w, f);
    return computeCandidates(w, f, []).find(k => k.action === 'patrol' && k.targetId === leader.id)?.score ?? null;
  };
  const a = score({}), b = score({ patrolFemaleJoin: 0.6 });
  assert.ok(a !== null && b !== null && Math.abs(b - a - 0.4) < 1e-9, `${a} → ${b}`);
});

test('P2: contact memory spreads to co-travelling party members at half weight, not to absent animals, and feeds the territory cost', () => {
  const w = createWorld(21);
  for (let i = 0; i < 200; i++) tickWorld(w);
  const [a, b, c] = w.chimps.filter(ch => ch.alive && ch.troopId === 1 && ch.age >= 10);
  noteContact(w, a, 10, 10, 2, 1);
  w.parties = [{ id: Math.min(a.id, b.id), troopId: 1, members: [a.id, b.id].sort((p, q) => p - q), center: [0, 0, 0], kind: 'traveling' }];
  shareContacts(w);
  const P = paramsOf(w);
  assert.ok(Math.abs(lossAt(w, b, 10, 10, P) - 0.5) < 1e-3, `b's loss ${lossAt(w, b, 10, 10, P)}`);
  assert.equal(ix(c).contacts.length, 0, 'an absent animal learns nothing');
  // max, never the sum: sharing again does not grow b's weights
  shareContacts(w);
  assert.ok(Math.abs(lossAt(w, b, 10, 10, P) - 0.5) < 1e-3);
  assert.ok(lossAt(w, a, 10, 10, P) > 0.99);
  // at most contactSlots spots
  for (let k = 0; k < 20; k++) noteContact(w, a, -70 + k * 7, 60, 1, 0);
  assert.ok(ix(a).contacts.length <= P.contactSlots * 5);
});

test('A1: the patrol route follows the leader\'s contact memory', () => {
  const pick = (hot: boolean) => {
    const w = createWorld(48, { profile: 'field' });
    for (let i = 0; i < 5760; i++) tickWorld(w);
    const west = w.troops[0], leader = adultMales(w, 1)[0];
    const secs = neighbourSectors(w, west);
    // make every neighbour-facing sector equally stale
    for (const q of secs) simOf(w).sectorVisit[west.id][q.sector] = w.time - 24 * 30;
    const target = secs[secs.length - 1].sector, [dx, dz] = sectorDir(target);
    ix(leader).contacts = [];
    if (hot) noteContact(w, leader, west.center[0] + dx * west.radius * 1.2, west.center[2] + dz * west.radius * 1.2, 5, 0);
    assert.ok(!hot || sectorContact(w, west, leader).c[target] > 0);
    simOf(w).patrols = {};
    const cand: Candidate = { action: 'patrol', targetId: -1, score: 1, reason: 'test' };
    candidateMeta.set(cand, { v: V.LEAD, aux: -1 });
    startAction(w, leader, cand, 'rules');
    return { chosen: simOf(w).patrols[west.id]!.sector, target, n: secs.length, first: secs[0].sector };
  };
  const hot = pick(true);
  assert.equal(hot.chosen, hot.target);
  const cold = pick(false);
  assert.equal(cold.chosen, cold.first, 'without contact, equally stale sectors tie and the first wins');
  if (cold.n > 1) assert.notEqual(cold.chosen, cold.target);
});

test('P4a: a patrol travels in single file with its phase on the party; determinism holds', () => {
  const make = () => createWorld(48, { params: { patrolH0: 50 } });
  const w = make();
  let seen = false;
  for (let i = 0; i < 5760 * 2 && !seen; i++) {
    tickWorld(w);
    if (w.tick % 8) continue;
    for (const p of w.parties) {
      if (p.kind !== 'patrol') { assert.equal(p.patrolPhase, undefined); continue; }
      const pt = simOf(w).patrols[p.troopId];
      if (!pt || pt.file.length < 2) continue;
      assert.ok(['out', 'listen', 'incursion', 'return'].includes(p.patrolPhase!));
      assert.equal(p.members[0], pt.leaderId, 'leader first');
      const inFile = pt.file.filter(id => p.members.includes(id));
      assert.deepEqual(p.members.slice(0, inFile.length).slice(1), inFile.filter(id => id !== pt.leaderId));
      seen = true;
    }
  }
  assert.ok(seen, 'a multi-member patrol was observed');
  // determinism: another world run for the same ticks is identical, and a JSON copy resumes identically
  const v = make();
  for (let i = 0; i < w.tick; i++) tickWorld(v);
  assert.equal(fnv(canonical(v)), fnv(canonical(w)));
  const copy = JSON.parse(JSON.stringify(w)) as World;
  for (let i = 0; i < 300; i++) { tickWorld(w); tickWorld(copy); }
  assert.equal(fnv(canonical(copy)), fnv(canonical(w)));
});
