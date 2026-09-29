import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDecision, createWorld, getEligibleActions, lifeStage, relationOf, stepWorld, TICK_SECONDS, tickWorld } from '../src/simulation';

test('identical seeds and tick counts give identical worlds regardless of batching', () => {
  const a = createWorld(48), b = createWorld(48), c = createWorld(48);
  stepWorld(a, 60);                                   // 3600 eco-s = 240 ticks
  for (let i = 0; i < 240; i++) stepWorld(b, 0.25);   // 15 eco-s = 1 tick each
  for (let i = 0; i < 240; i++) tickWorld(c);
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
  assert.equal(TICK_SECONDS, 15);
  assert.equal(a.tick, 240);
  assert.ok(Math.abs(a.time - 1) < 1e-10);
  assert.ok(Math.abs(a.hour - 7.5) < 1e-9);
  const before = JSON.stringify(a); stepWorld(a, 0); assert.equal(JSON.stringify(a), before);
  assert.throws(() => stepWorld(a, 61), RangeError); assert.throws(() => stepWorld(a, NaN), RangeError); assert.throws(() => stepWorld(a, -1), RangeError);
  assert.notDeepEqual(createWorld(49).chimps.map(k => k.position), a.chimps.map(k => k.position));
});

test('the world opens at 06:30 on 28 September with three unequal communities in night nests', () => {
  const w = createWorld(48);
  assert.equal(w.hour, 6.5); assert.equal(w.day, 1); assert.equal(w.environment.dayOfYear, 271); assert.equal(w.environment.season, 'wet');
  assert.equal(w.chimps.length, 49); assert.equal(w.troops.length, 3); assert.ok(w.trees.length >= 200);
  const count = (id: number) => w.chimps.filter(c => c.troopId === id).length;
  const adultMales = (id: number) => w.chimps.filter(c => c.troopId === id && c.sex === 'male' && c.age >= 15).length;
  assert.deepEqual([count(1), count(2), count(3)], [22, 15, 12]);
  assert.deepEqual([adultMales(1), adultMales(2), adultMales(3)], [7, 4, 3]);
  assert.deepEqual(w.troops.map(t => t.adultMales), [7, 4, 3]);
  assert.deepEqual(w.modelPolicy, { mode: 'async', asyncGraceMinutes: 6 });
  assert.ok(w.environment.daylight > 0 && w.environment.daylight < 0.2, 'civil twilight');
  for (const c of w.chimps) {
    assert.equal(c.controller, 'rules');
    assert.equal(c.action, 'nest');
    assert.ok(c.nest, `${c.name} has a nest`);
    const tree = w.trees.find(t => t.id === c.nest!.treeId)!;
    assert.ok(c.nest!.position[1] >= tree.height * 0.55 && c.nest!.position[1] <= tree.height * 0.85, 'nest in the crown');
    assert.ok(c.position[1] > 4, 'asleep in a tree');
    if (c.age < 4) { const m = w.chimps.find(k => k.id === c.motherId)!; assert.equal(c.nest!.treeId, m.nest!.treeId, 'infant shares mother\'s nest'); }
  }
  // founders: adult females are mostly immigrants; adult males are natal; immature founders have synthetic sires
  const adultFemales = w.chimps.filter(c => c.sex === 'female' && c.age >= 15);
  assert.ok(adultFemales.filter(c => c.natalTroopId !== c.troopId).length / adultFemales.length > 0.8);
  assert.ok(w.chimps.filter(c => c.sex === 'male' && c.age >= 15).every(c => c.natalTroopId === c.troopId));
  assert.ok(w.chimps.filter(c => c.age >= 15).every(c => c.fatherId === -1));
  const sired = w.chimps.filter(c => c.age < 15 && c.fatherId > 0);
  assert.ok(sired.length >= 15);
  for (const k of sired) { const f = w.chimps.find(c => c.id === k.fatherId)!; assert.equal(f.sex, 'male'); assert.equal(f.troopId, k.troopId); assert.ok(f.age - k.age >= 15); }
  assert.ok(w.chimps.some(c => c.sex === 'male' && c.age >= 15 && c.motherId > 0), 'philopatric sons of resident females');
  const names = w.chimps.map(c => c.name); assert.equal(new Set(names).size, names.length);
});

test('every shared-contract field is populated and meaningful', () => {
  const w = createWorld(3);
  stepWorld(w, 60); stepWorld(w, 60);
  for (const t of w.troops) {
    assert.ok(t.alphaId > 0 && t.maleHierarchy[0] === t.alphaId);
    assert.ok(t.femaleHierarchy.length > 0 && t.alphaHistory.length >= 1 && t.alphaHistory.at(-1)!.to === null);
    assert.ok(typeof t.emblem === 'string' && t.emblem.length > 0 && t.radius > 0);
  }
  for (const c of w.chimps) {
    for (const v of [c.hunger, c.thirst, c.energy, c.social, c.stress, c.health, c.injury, c.swelling, c.carryingMeat, c.rank]) assert.ok(v >= 0 && v <= 1);
    assert.ok(Number.isFinite(c.elo) && Number.isFinite(c.birthTime) && c.position.every(Number.isFinite));
    assert.ok(['calm', 'excited', 'fearful', 'aggressive', 'playful', 'distressed'].includes(c.mood));
    assert.ok(c.candidates.length > 0 && c.candidates.every(k => k.reason.length > 0 && k.reason.length <= 120));
    if (c.sex === 'male') { assert.equal(c.swelling, 0); assert.equal(c.cycleDay, -1); }
    assert.ok(c.partyId > 0);
  }
  const env = w.environment;
  for (const v of [env.rain, env.cloud, env.wind, env.humidity, env.daylight, env.moonPhase, env.fruitIndex]) assert.ok(v >= 0 && v <= 1);
  assert.ok(w.parties.length > 0 && w.parties.every(p => p.members.length > 0));
  assert.ok(w.prey.length >= 3);
  assert.ok(w.events.every(e => Array.isArray(e.actors) && typeof e.troopId === 'number' && e.severity >= 0 && e.severity <= 3));
});

test('life stages, kin relations and decision validation', () => {
  assert.equal(lifeStage(4.9), 'infant'); assert.equal(lifeStage(5), 'juvenile'); assert.equal(lifeStage(10), 'adolescent');
  assert.equal(lifeStage(15), 'adult'); assert.equal(lifeStage(40), 'elder');
  const w = createWorld(48);
  const infant = w.chimps.find(c => c.age < 1)!;
  const mother = w.chimps.find(c => c.id === infant.motherId)!;
  assert.equal(relationOf(w, infant, mother), 'mother');
  assert.equal(relationOf(w, mother, infant), 'offspring');
  const stranger = w.chimps.find(c => c.troopId !== infant.troopId)!;
  assert.equal(relationOf(w, infant, stranger), 'stranger');
  const cands = getEligibleActions(w, infant);
  assert.ok(!cands.some(k => ['mate', 'hunt', 'patrol', 'display', 'charge', 'attack', 'guard'].includes(k.action)));
  assert.ok(!applyDecision(w, infant.id, { action: 'hunt', targetId: w.prey[0].id }, 'decide'));
  const adult = w.chimps.find(c => c.sex === 'male' && c.age > 20)!;
  const ok = getEligibleActions(w, adult)[0];
  const v = adult.decisionVersion;
  assert.equal(applyDecision(w, adult.id, ok, 'decide', v + 5), false, 'stale version rejected');
  assert.ok(applyDecision(w, adult.id, ok, 'decide', v));
  assert.equal(adult.decisionSource, 'decide'); assert.equal(adult.decisionVersion, v + 1); assert.equal(adult.awaitingDecisionSince, null);
  assert.ok(!getEligibleActions(w, adult).some(k => k.targetId === adult.id), 'never targets self');
});
