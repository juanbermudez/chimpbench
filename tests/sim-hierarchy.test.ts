import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, applyIntervention, createWorld, getEligibleActions, tickWorld } from '../src/simulation';
import { resolveCharge } from '../src/sim/conflict';
import { startAction } from '../src/sim/execution';
import { perceive } from '../src/sim/perception';
import { dominates, power, strength } from '../src/sim/hierarchy';
import { slowLife } from '../src/sim/life';
import { paramsOf } from '../src/sim/params';
import { ix } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };
const byId = (w: World, id: number) => w.chimps.find(c => c.id === id)!;
const place = (c: Chimp, x: number, z: number) => { c.position = [x, 0, z]; c.nest = null; };

test('male hierarchy is ordered by Elo; the alpha is the top adult male; adult males dominate females', () => {
  const w = createWorld(48);
  runTo(w, 12);
  for (const t of w.troops) {
    const males = t.maleHierarchy.map(id => byId(w, id));
    for (let i = 1; i < males.length; i++) assert.ok(males[i - 1].elo >= males[i].elo);
    males.forEach((m, i) => assert.equal(m.rankOrder, i + 1));
    assert.equal(t.alphaId, males.find(m => m.age >= 15)!.id);
    const females = t.femaleHierarchy.map(id => byId(w, id));
    for (const m of males.filter(k => k.age >= 15)) for (const f of females) assert.ok(dominates(m, f));
  }
});

test('pant-grunts go from subordinate to dominant and the recipient gains Elo', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const troop = w.troops[0];
  const alpha = byId(w, troop.alphaId);
  const sub = byId(w, troop.maleHierarchy[3]);
  place(alpha, -46, 18); place(sub, -43, 18);
  alpha.action = 'rest'; alpha.targetId = -1;
  ix(sub).greet = {};
  perceive(w, sub); perceive(w, alpha);
  const grunt = getEligibleActions(w, sub).find(c => c.action === 'pant-grunt' && c.targetId === alpha.id);
  assert.ok(grunt, 'subordinate may pant-grunt to the alpha');
  assert.match(grunt!.reason, /Pant-grunt to .+the alpha \(rank 1 of \d+ males\)/);
  assert.ok(!getEligibleActions(w, alpha).some(c => c.action === 'pant-grunt' && c.targetId === sub.id), 'never downward');
  const before = alpha.elo, subBefore = sub.elo;
  assert.ok(applyDecision(w, sub.id, grunt!, 'rules'));
  for (let i = 0; i < 8 && sub.action === 'pant-grunt'; i++) tickWorld(w);
  assert.ok(alpha.elo > before && sub.elo < subBefore, 'recipient wins');
  assert.ok(w.interactions.some(i => i.kind === 'pant-grunt' && i.actorId === sub.id && i.targetId === alpha.id));
  assert.ok(ix(sub).greet[alpha.id] !== undefined);
});

test('a challenger who defeats the alpha with coalition support takes over', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const troop = w.troops[0];
  const alpha = byId(w, troop.alphaId), challenger = byId(w, troop.maleHierarchy[1]), ally = byId(w, troop.maleHierarchy[2]);
  challenger.elo = alpha.elo - 40;
  place(alpha, -46, 18); place(challenger, -45, 18); place(ally, -44.5, 18.5);
  challenger.action = 'charge'; challenger.targetId = alpha.id;
  ally.action = 'charge'; ally.targetId = alpha.id;
  alpha.action = 'submit'; alpha.targetId = challenger.id;
  const hist = troop.alphaHistory.length;
  resolveCharge(w, challenger, alpha);
  assert.equal(troop.alphaId, challenger.id);
  assert.equal(w.stats.takeovers, 1);
  assert.ok(w.interactions.some(i => i.kind === 'takeover' && i.actorId === challenger.id && i.participants.includes(ally.id)));
  assert.equal(troop.alphaHistory.length, hist + 1);
  assert.notEqual(troop.alphaHistory[hist - 1].to, null);
  assert.match(troop.alphaHistory[hist].how, /support/);
  assert.ok(w.events.some(e => e.kind === 'hierarchy' && e.severity === 2 && e.actors[0] === challenger.id));
  assert.equal(alpha.lastConflict?.won, false);
});

test('without support a single upset does not topple an established alpha', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const troop = w.troops[0];
  const alpha = byId(w, troop.alphaId), challenger = byId(w, troop.maleHierarchy[2]);
  place(alpha, -46, 18); place(challenger, -45, 18);
  challenger.action = 'charge'; challenger.targetId = alpha.id;
  alpha.action = 'submit'; alpha.targetId = challenger.id;
  resolveCharge(w, challenger, alpha);
  assert.equal(troop.alphaId, alpha.id);
});

test('removing the alpha opens a contested vacancy; a new alpha emerges within two days', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const troop = w.troops[0];
  const old = troop.alphaId;
  const contenders = troop.maleHierarchy.slice(1, 4);
  const st = applyIntervention(w, 'remove-alpha', { troopId: troop.id });
  assert.ok(st);
  const gone = byId(w, old);
  assert.equal(gone.alive, false); assert.match(gone.causeOfDeath!, /disappeared/); assert.ok(gone.deathTime !== null);
  assert.ok(w.chimps.includes(gone), 'dead stay in the genealogy');
  assert.equal(troop.alphaId, -1, 'vacant while contested');
  assert.notEqual(troop.alphaHistory.at(-1)!.to, null);
  const conflicts = w.stats.conflicts;
  for (let i = 0; i < 5760 * 2 + 240 && troop.alphaId < 0; i++) tickWorld(w);
  assert.ok(troop.alphaId > 0, 'a new alpha by the end of the vacancy');
  assert.ok(contenders.includes(troop.alphaId) || troop.maleHierarchy[0] === troop.alphaId);
  assert.ok(w.stats.conflicts > conflicts, 'contests happened');
  assert.match(troop.alphaHistory.at(-1)!.how, /after .* disappeared/);
  assert.equal(applyIntervention(w, 'remove-alpha', { troopId: 99 }) !== null, true, 'falls back to the largest community');
});

test('a counter-charge can escalate into a contact fight that is resolved by power', () => {
  let fights = 0, upsets = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const w = createWorld(seed);
    runTo(w, 9);
    const t = w.troops[0];
    const A = byId(w, t.maleHierarchy[1]), B = byId(w, t.maleHierarchy[2]);
    place(A, -52, 8); place(B, -50.8, 8);
    const before = w.interactions.filter(i => i.kind === 'fight').length;
    startAction(w, A, { action: 'charge', targetId: B.id, score: 1, reason: 'probe' }, 'rules');
    startAction(w, B, { action: 'charge', targetId: A.id, score: 1, reason: 'probe' }, 'rules');
    const eloA = A.elo;
    for (let k = 0; k < 12; k++) tickWorld(w);
    if (w.interactions.filter(i => i.kind === 'fight').length > before) fights++;
    if (A.elo < eloA) upsets++;
  }
  // a 30-trial sample: the exact count moves with the RNG stream (stage C6 added draws before 09:00), so the bounds only
  // say that counter-charges sometimes, but not always, escalate
  assert.ok(fights >= 2 && fights <= 25, `${fights}/30 counter-charges escalated`);
  assert.ok(upsets >= 1, 'the higher-ranked male does not always win');
});


test('C8 growth record: strength × ((1 − w) + w × grow); grow changes only below growEndY; contest odds are invariant to an equal growth record', () => {
  const w = createWorld(48), P = paramsOf(w);
  const males = w.chimps.filter(c => c.alive && c.sex === 'male' && c.age >= 18 && c.age < 30);
  const [a, b, ally] = males;
  assert.ok(a && b && ally, 'three prime males');
  const s1 = strength(a, P);
  ix(a).grow = 0.4;
  assert.ok(Math.abs(strength(a, P) / s1 - ((1 - P.growStrengthW) + P.growStrengthW * 0.4)) < 1e-12);
  // equal records: every strength scales by the same factor, so win odds do not change (strengths far above the 0.1 / 0.05 floors)
  for (const c of [a, b, ally]) ix(c).grow = 1;
  const odds = () => { const pa = power(a, b, [ally], P), pb = power(b, a, [], P); return pa ** P.contestExponent / (pa ** P.contestExponent + pb ** P.contestExponent); };
  const o1 = odds();
  for (const c of [a, b, ally]) ix(c).grow = 0.6;
  assert.ok(strength(b, P) > 0.1, 'above the floors');
  assert.ok(Math.abs(odds() - o1) < 1e-12);
  // the record freezes at growEndY
  const kid = w.chimps.find(c => c.alive && c.age > 6 && c.age < P.growEndY - 1)!, adult = a;
  ix(kid).grow = 1; ix(kid).cond = 0.1; ix(adult).grow = 1; ix(adult).cond = 0.1;
  w.ageRate = 365;
  for (let i = 0; i < 20; i++) { ix(kid).cond = 0.1; ix(adult).cond = 0.1; kid.hunger = 0.9; adult.hunger = 0.9; slowLife(w); }
  assert.ok(ix(kid).grow < 1, 'a juvenile\'s record follows condition');
  assert.equal(ix(adult).grow, 1, 'an adult\'s record is frozen');
});
