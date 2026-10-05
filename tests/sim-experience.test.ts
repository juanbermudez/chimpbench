import assert from 'node:assert/strict';
import test from 'node:test';
import { candidateMeta, computeCandidates, V } from '../src/sim/candidates';
import { startAction } from '../src/sim/execution';
import { tripAte, tripBoutEnergy, tripYieldOf } from '../src/sim/experience';
import { paramsOf } from '../src/sim/params';
import { IMPULSE_HUNT, perceive } from '../src/sim/perception';
import { isTreeId, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E3g (experienceValue; docs/staging/e3g-prereg.md §5): values that follow the animal's own experience. Bit 1: a
// trip is worth the meal the animal's trips deliver (a learned share of its bout energy). Bit 2: a colobus group the animal
// perceived within reunionH is not met anew.

/** The ledger and forage-rate valuation the mechanism reads (E1, E1e, E3c), with the switch value given. */
const BASE = { energyLedger: 1, ledgerDrive: 1, intakeValue: 1, forageRate: 1, ledgerDigesta: 1 };

test('experienceValue is 0 by default in both profiles; tripYieldRate is a design step', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile }));
    assert.equal(P.experienceValue, 0);
    assert.equal(P.tripYieldRate, 0.1);
  }
});

test('experienceValue 1: a trip is valued at the meal its trips deliver; crowns in view are not', () => {
  const w = createWorld(48, { profile: 'field', params: { ...BASE, experienceValue: 1 } });
  for (let i = 0; i < 5760 / 2; i++) tickWorld(w);
  const scored = (c: typeof w.chimps[number]) => { perceive(w, c); return computeCandidates(w, c, []).map(k => ({ k, m: candidateMeta.get(k) })); };
  let checked = 0;
  for (const c of w.chimps.filter(k => k.alive && k.age >= 15)) {
    const x = ix(c);
    delete x.ty;
    assert.equal(tripYieldOf(c, paramsOf(w)), 1, 'an animal with no trip behind it trusts its beliefs');
    const full = scored(c);
    x.ty = 0.3;
    const low = scored(c);
    const trips = full.filter(o => o.k.action === 'travel' && o.m?.v === V.TREE && (o.m?.aux ?? -1) <= 0);
    if (!trips.length) continue;
    for (const o of trips) {
      const after = low.find(q => q.k.action === 'travel' && q.k.targetId === o.k.targetId);
      if (!after || o.k.score >= 3 || after.k.score <= -0.4) continue;
      assert.ok((after.m?.raw ?? after.k.score) < (o.m?.raw ?? o.k.score) + 1e-9, `trip ${o.k.targetId} is worth less at ty 0.3`);
      checked++;
    }
    for (const o of full.filter(q => q.k.action === 'forage' && isTreeId(q.k.targetId))) {
      const after = low.find(q => q.k.action === 'forage' && q.k.targetId === o.k.targetId);
      if (after) assert.equal(after.m?.raw ?? after.k.score, o.m?.raw ?? o.k.score, 'a crown in view keeps its value');
    }
    delete x.ty;
    if (checked >= 3) break;
  }
  assert.ok(checked > 0, 'some own trip was compared');
});

test('experienceValue 1: a trip episode teaches the animal what its trips deliver', () => {
  const w = createWorld(48, { profile: 'field', params: { ...BASE, experienceValue: 1 } });
  for (let i = 0; i < 5760 / 2; i++) tickWorld(w);
  const P = paramsOf(w), c = w.chimps.find(k => k.alive && k.age >= 15 && k.sex === 'male')!, x = ix(c);
  delete x.tt; delete x.ty;
  const tree = w.trees.find(t => Math.hypot(t.position[0] - c.position[0], t.position[2] - c.position[2]) > 200)!;
  const trip: Candidate = { action: 'travel', targetId: tree.id, score: 1, reason: 'test' };
  candidateMeta.set(trip, { v: V.TREE, aux: -1, bel: [tree.id, 0.5, 2, 0, 250] });
  startAction(w, c, trip, 'rules');
  const E0 = tripBoutEnergy(w, c, P, tree.id, [tree.id, 0.5, 2, 0, 250]);
  assert.ok(x.tt && x.tt[0] === tree.id && x.tt[1] > 0 && Math.abs(x.tt[1] - E0) < 1e-9 && x.tt[2] === 0, 'the trip opens an episode with the bout energy it was valued at');
  // it eats at the target, then rests: the share eaten moves the expectation by tripYieldRate
  const feed: Candidate = { action: 'forage', targetId: tree.id, score: 1, reason: 'test' };
  candidateMeta.set(feed, { v: V.NONE, aux: -1 });
  startAction(w, c, feed, 'rules');
  assert.ok(x.tt, 'feeding at the target continues the episode');
  tripAte(c, tree.id, E0 / 2);
  tripAte(c, tree.id + 1, 100); // another crown does not count
  const rest: Candidate = { action: 'rest', targetId: -1, score: 1, reason: 'test' };
  candidateMeta.set(rest, { v: V.NONE, aux: -1 });
  startAction(w, c, rest, 'rules');
  assert.equal(x.tt, undefined, 'another act closes it');
  assert.ok(Math.abs(x.ty! - (1 + P.tripYieldRate * (0.5 - 1))) < 1e-12, `ty ${x.ty}`);
  // a trip abandoned without feeding at its target counts as nothing delivered
  startAction(w, c, trip, 'rules');
  startAction(w, c, rest, 'rules');
  assert.ok(Math.abs(x.ty! - (0.95 + P.tripYieldRate * (0 - 0.95))) < 1e-12, `ty ${x.ty}`);
});

test('experienceValue 2: a colobus group seen within reunionH raises no new hunt impulse', () => {
  const run = (bits: number) => {
    const w = createWorld(48, { profile: 'field', params: { experienceValue: bits } });
    const pair = () => {
      for (const m of w.chimps) {
        if (!m.alive || m.age < 15 || m.sex !== 'male') continue;
        const n = w.chimps.find(o => o !== m && o.alive && o.age >= 15 && o.sex === 'male' && o.troopId === m.troopId && Math.hypot(o.position[0] - m.position[0], o.position[2] - m.position[2]) < 8);
        if (n) return m;
      }
      return undefined;
    };
    let m = undefined as ReturnType<typeof pair>;
    for (let i = 0; i < 5760 && !m; i++) { tickWorld(w); if (i > 240 && w.environment.daylight > 0.9) m = pair(); }
    assert.ok(m, 'two adult males of one community together in daylight');
    const P = paramsOf(w), p = w.prey[0], x = ix(m!);
    p.position = [m!.position[0] + 5, p.position[1], m!.position[2]]; // a colobus group 5 m away (perception scans every group)
    x.preyId = -1; x.impulse = 0; x.impulseUntil = -1e9;
    m!.memory = m!.memory.filter(e => !(e.kind === 'prey' && e.entityId === p.id));
    m!.memory.push({ kind: 'prey', entityId: p.id, position: [p.position[0], p.position[1], p.position[2]], seenAt: w.time - P.reunionH / 2 });
    perceive(w, m!);
    return { met: x.impulse === IMPULSE_HUNT && x.impulseTarget === p.id, seen: x.preyId === p.id, males: x.ownMales };
  };
  const off = run(0), on = run(2);
  assert.ok(off.seen && on.seen, 'the group is in sight');
  assert.ok(off.males >= 2, 'in company');
  assert.ok(off.met, 'today the group differs from the last decision point\'s, so it is met');
  assert.ok(!on.met, 'seen half an hour ago: not met anew');
});

test('experienceValue 3 (field): deterministic over 12 h, JSON-lossless, finite state; the count is unchanged', () => {
  const T = { ...BASE, experienceValue: 3 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const ty = a.chimps.map(c => ix(c).ty).filter(v => v !== undefined) as number[];
  assert.ok(ty.length > 0 && ty.every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'some animal learned, in [0, 1]');
  for (const c of a.chimps) { const tt = ix(c).tt; if (tt) assert.ok(tt.length === 4 && tt.every(Number.isFinite)); }
  assert.equal(prescriptionCount(T).total, prescriptionCount(BASE).total);
});
