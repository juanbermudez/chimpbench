import assert from 'node:assert/strict';
import test from 'node:test';
import { computeCandidates } from '../src/sim/candidates';
import { massOf } from '../src/sim/energy';
import { roughByForce } from '../src/sim/execution';
import { chorusHeard } from '../src/sim/parties';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { PARTY_EVERY, TICK_HOURS, index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
import type { Candidate } from '../src/types';
import { prescriptionCount } from '../scripts/prescription-ledger';
import { worldHash } from './fixtures/golden';

// Stage E4m (leftoverRules; docs/staging/e4m-prereg.md §5). Bit 1: play turns rough when the player's acute drive times
// its mass exceeds the partner's mass times (1 − the partner's acute drive); no die. Bit 2: a patrol leader stops after a
// stranger chorus heard by a member (and at the waypoints), never on a schedule.

test('leftoverRules is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).leftoverRules, 0);
});

test('bit 1: no play turns rough without acute arousal; a heavier aroused player is too rough, a frightened partner takes less', () => {
  const w = createWorld(48, { profile: 'field', params: { leftoverRules: 1 } }), P = paramsOf(w);
  const alive = index(w).alive;
  const big = alive.filter(c => c.age >= 20).sort((a, b) => massOf(b, P) - massOf(a, P))[0];
  const small = alive.filter(c => c.age >= 1 && c.age < 5)[0];
  assert.ok(big && small && massOf(big, P) > massOf(small, P));
  const bx = ix(big), sx = ix(small), t = w.time;
  bx.fast = 0; sx.fast = 0;
  assert.equal(roughByForce(big, small, t, P), false, 'no arousal, full restraint');
  assert.equal(roughByForce(small, big, t, P), false);
  bx.fast = 0.8; bx.fastAt = t;
  assert.equal(roughByForce(big, small, t, P), true, 'an aroused heavier player');
  // a lighter player needs a partner whose own arousal leaves it little to take: a·m_c > (1 − A_o)·m_o
  sx.fast = 0.8; sx.fastAt = t; bx.fast = 0;
  assert.equal(roughByForce(small, big, t, P), 0.8 * massOf(small, P) > massOf(big, P));
  bx.fast = 0.95; bx.fastAt = t;
  assert.equal(roughByForce(small, big, t, P), 0.8 * massOf(small, P) > (1 - 0.95) * massOf(big, P));
  // the fast state decays: an hour later the restraint holds again
  bx.fast = 0.8; bx.fastAt = t; sx.fast = 0;
  assert.equal(roughByForce(big, small, t + 1, P), 0.8 * Math.exp(-60 / P.endoFastTauMin) * massOf(big, P) > massOf(small, P));
});

test('bit 2: a chorus heard by a member on the patrol since the last update, from another community', () => {
  const w = createWorld(48, { profile: 'field' });
  const c = index(w).alive.find(o => o.sex === 'male' && o.age >= 15)!, x = ix(c), own = c.troopId;
  const other = w.troops.find(t => t.id !== own)!.id;
  c.action = 'patrol';
  x.heardTroop = other; x.heardAt = w.time;
  assert.equal(chorusHeard(w, [c.id], own, w.time), true);
  assert.equal(chorusHeard(w, [c.id], own, w.time + (PARTY_EVERY - 1) * TICK_HOURS), true, 'within the update interval');
  assert.equal(chorusHeard(w, [c.id], own, w.time + PARTY_EVERY * TICK_HOURS), false, 'heard before the last update');
  x.heardTroop = own;
  assert.equal(chorusHeard(w, [c.id], own, w.time), false, 'own community');
  x.heardTroop = other; c.action = 'rest';
  assert.equal(chorusHeard(w, [c.id], own, w.time), false, 'not on the patrol');
});

test('leftoverRules on (field): deterministic over a day, JSON-lossless; roughPlayP is not read; count −1 per bit', () => {
  const T = { endoStates: 1, endoFast: 1, leftoverRules: 3 };
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  const read = new Set<string>();
  traceParamReads(a, read);
  for (let i = 0; i < 5760; i++) { tickWorld(a); tickWorld(b); }
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(!read.has('roughPlayP'), 'roughPlayP is not read');
  assert.ok(!read.has('patrolStopEveryMin'), 'patrolStopEveryMin is not read');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const base = prescriptionCount({}).total;
  assert.equal(prescriptionCount({ leftoverRules: 1 }).total, base - 1);
  assert.equal(prescriptionCount({ leftoverRules: 2 }).total, base - 1);
  assert.equal(prescriptionCount({ leftoverRules: 3 }).total, base - 2);
});

test('bit 0 reads roughPlayP (the die is still drawn in play), so the switch is what removes it', () => {
  const w = createWorld(48, { profile: 'field', params: { endoStates: 1, endoFast: 1 } });
  const read = new Set<string>();
  traceParamReads(w, read);
  for (let i = 0; i < 5760; i++) tickWorld(w);
  assert.ok(read.has('roughPlayP'));
});

test('bit 1, amendment 1: an aroused animal values play less (play is initiated in a relaxed context); costs unchanged', () => {
  const w = createWorld(48, { profile: 'field', params: { leftoverRules: 1 } });
  for (let i = 0; i < 240; i++) tickWorld(w);
  const playScores = (c: ReturnType<typeof index>['alive'][number]) => { const list: Candidate[] = []; computeCandidates(w, c, list); return list.filter(q => q.action === 'play').map(q => q.score); };
  const c = index(w).alive.find(o => o.age >= 2 && o.age < 10 && playScores(o).length > 0);
  assert.ok(c, 'an immature with a play option');
  const x = ix(c!); x.fast = 0;
  const calm = playScores(c!);
  x.fast = 0.9; x.fastAt = w.time;
  const aroused = playScores(c!);
  assert.equal(aroused.length, calm.length);
  for (let k = 0; k < calm.length; k++) assert.ok(aroused[k] < calm[k], `aroused ${aroused[k]} < calm ${calm[k]}`);
  // without the bit the same arousal changes nothing
  const w0 = createWorld(48, { profile: 'field' });
  for (let i = 0; i < 240; i++) tickWorld(w0);
  const c0 = index(w0).byId.get(c!.id)!, x0 = ix(c0);
  const list0: Candidate[] = []; x0.fast = 0; computeCandidates(w0, c0, list0); const a0 = list0.filter(q => q.action === 'play').map(q => q.score);
  const list1: Candidate[] = []; x0.fast = 0.9; x0.fastAt = w0.time; computeCandidates(w0, c0, list1); const a1 = list1.filter(q => q.action === 'play').map(q => q.score);
  assert.deepEqual(a1, a0);
});
