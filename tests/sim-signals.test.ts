import assert from 'node:assert/strict';
import test from 'node:test';
import { emitCall } from '../src/sim/events';
import { foodCallChance } from '../src/sim/execution';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { drumIntervals, featureDistance, pantHootFeatures, perceivedFeatures, signature, SIG_FEATURES } from '../src/sim/signals';
import { createWorld, tickWorld } from '../src/simulation';
import { canonical, fnv, runCase } from './fixtures/golden';

// Stage C10 (docs/realism-design.md "C10 pre-registration").

const OFF = { callSignatures: 0, callerDiscrim: 0, foodCallRule: 0, travelHoo: 0 };

test('C10 off reproduces the pre-C10 model exactly (compressed golden seed 48, 2 days)', () => {
  const w = runCase({ seed: 48, ageRate: 1, days: 2 }, seed => createWorld(seed, { params: OFF }));
  assert.equal(fnv(canonical(w)), '292affa6f213e9cd');
  assert.ok(w.calls.every(c => !('features' in c)), 'no features key when callSignatures is off');
});

test('travel hoo off reproduces the C10 model before addendum 1 (compressed golden seed 48, 2 days)', () => {
  const w = runCase({ seed: 48, ageRate: 1, days: 2 }, seed => createWorld(seed, { params: { travelHoo: 0 } }));
  assert.equal(fnv(canonical(w)), 'e6e4209f3c793aa4');
});

test('a signature is constant for a chimpanzee; calls vary around it; features ride on pant-hoots and drums', () => {
  const w = createWorld(31), P = paramsOf(w);
  const c = w.chimps.find(ch => ch.alive && ch.sex === 'male' && ch.age >= 15)!;
  const s = signature(P, c.id, c.natalTroopId);
  assert.deepEqual(signature(P, c.id, c.natalTroopId), s);
  const calls = Array.from({ length: 400 }, (_, k) => pantHootFeatures(P, c.id, c.natalTroopId, 1_000_000 + k));
  for (let f = 0; f < SIG_FEATURES; f++) {
    const m = calls.reduce((a, v) => a + v[f], 0) / calls.length;
    assert.ok(Math.abs(m - s[f]) < 0.2, `feature ${f}: mean ${m} vs signature ${s[f]}`);
  }
  const id = emitCall(w, c, 'pant-hoot'), call = w.calls.find(k => k.id === id)!;
  assert.deepEqual(call.features, pantHootFeatures(P, c.id, c.natalTroopId, id));
  const drId = emitCall(w, c, 'drum'), dr = w.calls.find(k => k.id === drId)!;
  assert.ok(dr.features && dr.features.length >= 1);
  const gId = emitCall(w, c, 'food-grunt'), grunt = w.calls.find(k => k.id === gId)!;
  assert.ok(!('features' in grunt));
});

test('drum bouts: median 4 hits, mode 3, mean interval near 229 ms, alternating short and long', () => {
  const P = paramsOf(createWorld(31));
  const hits = new Map<number, number>(), all: number[] = [];
  let alt = 0, pairs = 0, sum = 0, n = 0;
  for (let k = 0; k < 4000; k++) {
    const iv = drumIntervals(P, 2_000_000 + k), h = iv.length + 1;
    hits.set(h, (hits.get(h) ?? 0) + 1); all.push(h);
    for (let i = 0; i < iv.length; i++) { sum += iv[i]; n++; if (i > 0) { pairs++; if ((iv[i] > iv[i - 1]) === (i % 2 === 1)) alt++; } }
  }
  all.sort((a, b) => a - b);
  assert.equal(all[all.length >> 1], 4);
  assert.equal([...hits].sort((a, b) => b[1] - a[1])[0][0], 3);
  assert.ok(Math.abs(sum / n - 229) < 25, `${sum / n}`);
  assert.ok(alt / pairs > 0.85, `alternation ${alt / pairs}`);
});

test('perception noise grows with distance, so a caller is told apart from itself less reliably far away', () => {
  const P = paramsOf(createWorld(31)), s = signature(P, 7, 1);
  const split = (d: number) => {
    let n = 0;
    const a: number[] = [], b: number[] = [];
    for (let k = 0; k < 2000; k++) {
      const f1 = pantHootFeatures(P, 7, 1, 3_000_000 + 2 * k), f2 = pantHootFeatures(P, 7, 1, 3_000_001 + 2 * k);
      if (featureDistance(perceivedFeatures(P, f1, 99, 3_000_000 + 2 * k, d, 1000, a), perceivedFeatures(P, f2, 99, 3_000_001 + 2 * k, d, 1000, b)) > P.discrimThreshold) n++;
    }
    return n / 2000;
  };
  assert.ok(s.length === SIG_FEATURES);
  const near = split(10), far = split(900);
  assert.ok(far > near + 0.1, `near ${near}, far ${far}`);
});

test('heardN counts the stranger callers a listener can tell apart (more calls heard, more callers counted)', () => {
  const run = (calls: number, discrim: 0 | 1) => {
    const w = createWorld(32, { params: { callerDiscrim: discrim } });
    for (let i = 0; i < 1200; i++) tickWorld(w);
    const caller = w.chimps.find(c => c.alive && c.troopId === 2 && c.sex === 'male' && c.age >= 15)!;
    const listener = w.chimps.find(c => c.alive && c.troopId === 1 && c.age >= 15)!;
    listener.position = [caller.position[0] + 5, 0, caller.position[2]];
    for (let k = 0; k < calls; k++) emitCall(w, caller, 'pant-hoot');
    return ix(listener).heardN;
  };
  assert.equal(run(3, 0), 1, 'C6 rule: one true caller');
  const few = run(1, 1), many = run(6, 1);
  assert.equal(few, 1);
  assert.ok(many >= 1 && many <= 6, `${many}`);
  assert.ok(many > few, 'repeated noisy calls are sometimes heard as different callers');
});

test('food-call chance rises with the crop and with the audience (males, a bonded partner)', () => {
  const w = createWorld(33);
  for (let i = 0; i < 1200; i++) tickWorld(w);
  const c = w.chimps.find(ch => ch.alive && ch.age >= 15)!, x = ix(c);
  x.seen.length = 0;
  const lone = foodCallChance(w, c, 0.4), rich = foodCallChance(w, c, 0.9);
  assert.ok(rich > lone);
  const mates = w.chimps.filter(o => o.alive && o.troopId === c.troopId && o.id !== c.id && o.sex === 'male' && o.age >= 15).slice(0, 2);
  x.seen.push(...mates.map(m => m.id));
  for (const m of mates) delete c.bonds[m.id];
  const troop = w.troops.find(t => t.id === c.troopId)!, alpha = troop.alphaId;
  troop.alphaId = -1;
  const audience = foodCallChance(w, c, 0.4);
  assert.ok(Math.abs(audience - lone - 2 * paramsOf(w).foodCallMaleW) < 1e-9, `${lone} -> ${audience}`);
  c.bonds[mates[0].id] = 0.8;
  assert.ok(Math.abs(foodCallChance(w, c, 0.4) - audience - paramsOf(w).foodCallPartnerW) < 1e-9);
  troop.alphaId = alpha;
});

test('travel hoo (C10 addendum 1): a trip initiator with a companion near may hoo; the companion hears it and following the caller scores higher', async () => {
  const { candidateMeta, computeCandidates, V } = await import('../src/sim/candidates');
  const { startAction } = await import('../src/sim/execution');
  const { perceive } = await import('../src/sim/perception');
  const w = createWorld(33, { profile: 'field', params: { travelHooP: 1, travelHooAllyP: 1 } });
  for (let i = 0; i < 5760 / 4; i++) tickWorld(w);
  const [a, b] = w.chimps.filter(ch => ch.alive && ch.age >= 15 && ch.troopId === 1);
  b.position = [a.position[0] + 10, 0, a.position[2]]; b.action = 'rest'; b.targetId = -1;
  perceive(w, a); perceive(w, b);
  const far = w.trees.reduce((p, t) => (Math.abs(Math.hypot(t.position[0] - a.position[0], t.position[2] - a.position[2]) - 400) < Math.abs(Math.hypot(p.position[0] - a.position[0], p.position[2] - a.position[2]) - 400) ? t : p));
  const cand = { action: 'travel' as const, targetId: far.id, score: 1, reason: 'test' };
  candidateMeta.set(cand, { v: V.TREE, aux: -1 });
  const before = w.calls.length;
  startAction(w, a, cand, 'rules');
  assert.ok(w.calls.slice(before).some(k => k.kind === 'travel-hoo' && k.callerId === a.id && !('features' in k)), 'the initiator hooed');
  assert.equal(ix(b).hooFrom, a.id);
  a.position = [b.position[0] + 20, 0, b.position[2]];
  perceive(w, b);
  const score = () => computeCandidates(w, b, []).filter(k => (k.action === 'follow' && k.targetId === a.id) || (k.action === 'travel' && k.targetId === far.id)).reduce((m, k) => Math.max(m, k.score), -1);
  const withHoo = score();
  ix(b).hooAt = w.time - 1;
  const without = score();
  assert.ok(withHoo > without, `${withHoo} vs ${without}`);
});
