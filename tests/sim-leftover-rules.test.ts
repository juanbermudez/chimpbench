import assert from 'node:assert/strict';
import test from 'node:test';
import { massOf } from '../src/sim/energy';
import { roughByForce } from '../src/sim/execution';
import { chorusHeard } from '../src/sim/parties';
import { paramsOf, traceParamReads } from '../src/sim/params';
import { PARTY_EVERY, TICK_HOURS, index, ix } from '../src/sim/state';
import { createWorld, tickWorld } from '../src/simulation';
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
