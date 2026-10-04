import assert from 'node:assert/strict';
import test from 'node:test';
import { audienceCompany, audienceSig, candidateMeta, computeCandidates, departAudience, V } from '../src/sim/candidates';
import { executeAction, startAction } from '../src/sim/execution';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { perceive } from '../src/sim/perception';
import { ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E5f (departValue; docs/staging/e5f-prereg.md §3): an attempt nobody answers ends in the initiator's own decision.
// No re-launch hold (departRetryMin) and no go-alone cap (departPersistMaxMin): while the same companions are there doing
// what they did, a trip goes alone, valued less the company it leaves; once they change, a trip is an attempt again.

/** The moving-together scene of tests/sim-party-food.test.ts: a hungry adult with one companion 10 m away. */
function scene(params: Record<string, number> = {}) {
  const w = createWorld(33, { profile: 'field', params: { travelHooP: 0, travelHooAllyP: 0, departValue: 1, ...params } });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const [a, b] = w.chimps.filter(k => k.alive && k.age >= 15 && k.troopId === 1);
  const far = w.trees.find(t => Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) > 300)!;
  a.position[1] = 0; a.hunger = 0.8;
  b.position = [a.position[0] + 10, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1; ix(b).phase = 0;
  const trip = (aux: number): Candidate => { const k: Candidate = { action: 'travel', targetId: far.id, score: 1, reason: 'test' }; candidateMeta.set(k, { v: V.TREE, aux }); return k; };
  const setOff = () => startAction(w, a, trip(-1), 'rules');
  const step = () => { w.tick++; w.time += paramsOf(w).tickHours; executeAction(w, a); };
  const ownTrips = () => { perceive(w, a); return computeCandidates(w, a, []).filter(k => k.action === 'travel' && candidateMeta.get(k)?.v === V.TREE && (candidateMeta.get(k)?.aux ?? -1) <= 0); };
  return { w, a, b, far, setOff, step, ownTrips, P: paramsOf(w) };
}

test('departValue is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).departValue, 0);
});

test('departValue: an unanswered attempt ends in a decision now, with no effort, hold or cap', () => {
  const s = scene(), x = ix(s.a), at = [s.a.position[0], s.a.position[2]];
  assert.ok(departAudience(s.w, s.a) >= 1, 'a companion of 12 y or more is within the party link');
  s.setOff();
  assert.equal(x.tryN, departAudience(s.w, s.a), 'an attempt, with its audience');
  for (let i = 0; i < 3; i++) { s.step(); assert.ok(!x.finished && x.tryN !== undefined, 'standing and checking'); }
  s.step();
  assert.deepEqual([s.a.position[0], s.a.position[2]], at, 'it has not moved');
  assert.equal(x.tryN, undefined);
  assert.equal(x.dfa, audienceSig(s.w, s.a), 'it noted what its companions are doing');
  assert.ok(x.trySince === undefined && x.tryAt === undefined, 'no effort and no hold');
  assert.ok(!x.finished && x.intr !== '' && s.a.nextDecision <= s.w.time, 'it decides now; the trip is not given up for it');
  assert.equal(s.a.action, 'travel');
  assert.ok(Number.isInteger(x.dfa) && x.dfa! >= 0, 'a JSON-safe integer');
});

test('departValue: while the companions are unchanged a trip is worth less their company and goes alone; once they change it is an attempt again', () => {
  const s = scene(), x = ix(s.a);
  s.a.social = 0.8; // a modest social need, so the company it leaves stays below the trips' values (scores clamp at 0)
  const before = new Map(s.ownTrips().map(k => [k.targetId, k.score]));
  assert.ok(before.size > 0, 'own trips are on the menu');
  x.dfa = audienceSig(s.w, s.a);
  const lost = audienceCompany(s.w, s.a, s.P);
  assert.ok(lost > 0, 'the companion is worth something to it');
  const after = s.ownTrips();
  assert.ok(after.length > 0, 'no hold: own trips stay on the menu');
  let checked = 0;
  for (const k of after) {
    const b0 = before.get(k.targetId);
    if (b0 === undefined || b0 >= 3 || k.score <= 0) continue;
    assert.ok(Math.abs((b0 - k.score) - lost) < 0.0021, `trip ${k.targetId}: ${b0} − ${k.score} = the company left (${lost.toFixed(3)})`);
    checked++;
  }
  assert.ok(checked > 0, 'at least one trip compared');
  s.setOff();
  assert.equal(x.tryN, undefined, 'the same companions doing the same: it goes alone, no attempt');
  assert.equal(x.dfa, undefined);
  // the companions have changed what they do: a trip is an attempt again, valued as before
  const t = scene(), tx = ix(t.a);
  t.a.social = 0.8;
  tx.dfa = audienceSig(t.w, t.a);
  t.b.action = 'groom';
  assert.notEqual(tx.dfa, audienceSig(t.w, t.a), 'what it perceives of its audience changed');
  const again = new Map(t.ownTrips().map(k => [k.targetId, k.score]));
  for (const [id, v] of before) if (again.has(id)) { assert.equal(again.get(id), v, 'valued as before'); break; }
  t.setOff();
  assert.equal(tx.tryN, departAudience(t.w, t.a), 'an attempt');
  assert.equal(tx.dfa, undefined);
});

test('departValue (field): deterministic over 12 h, JSON-lossless; departRetryMin and departPersistMaxMin are not read; count −2', () => {
  const T = { departValue: 1 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('departRetryMin') && !read.has('departPersistMaxMin'), 'the hold and the cap are not read');
  assert.ok(read.has('departCheckMin'), 'the check is');
  assert.ok(a.chimps.some(c => ix(c).dfa !== undefined), 'some attempt went unanswered');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(prescriptionCount(T).total, prescriptionCount({}).total - 2);
});

test('departValue 2: the audience watched and the company left are the settled companions only (not travelling, following or in a nest)', () => {
  const one = scene(), two = scene({ departValue: 2 });
  for (const s of [one, two]) s.a.social = 0.8;
  // a resting companion is settled: the same company and signature under 1 and 2
  assert.ok(audienceCompany(one.w, one.a, one.P) > 0);
  assert.equal(audienceCompany(two.w, two.a, two.P), audienceCompany(one.w, one.a, one.P));
  assert.equal(audienceSig(two.w, two.a), audienceSig(one.w, one.a));
  // a companion on the move is audience (it may join) but not company staying keeps
  for (const s of [one, two]) { s.b.action = 'travel'; s.b.targetId = s.far.id; ix(s.b).v = V.TREE; ix(s.b).aux = -1; }
  assert.ok(departAudience(two.w, two.a) >= 1, 'still an audience: a trip is an attempt');
  assert.ok(audienceCompany(one.w, one.a, one.P) > 0, 'iteration 1 counts it');
  assert.equal(audienceCompany(two.w, two.a, two.P), 0, 'iteration 2 does not');
  // what iteration 2 watches does not change while companions in transit change course
  const sig = audienceSig(two.w, two.a);
  two.b.targetId = two.w.trees.find(t => t.id !== two.far.id)!.id;
  assert.equal(audienceSig(two.w, two.a), sig);
});

test('departValue 2 (field): deterministic over 12 h, JSON-lossless; the hold and the cap are not read; count −2', () => {
  const T = { departValue: 2 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 2880; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('departRetryMin') && !read.has('departPersistMaxMin'));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  assert.equal(prescriptionCount(T).total, prescriptionCount({}).total - 2);
});
