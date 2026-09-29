import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, getEligibleActions, tickWorld } from '../src/simulation';
import { IMPULSE_TRANSFER, perceive } from '../src/sim/perception';
import { conditionFertility, fecundity, inPeriovulatory, recordCopulation, reproSlow, swellingAt } from '../src/sim/reproduction';
import { ix } from '../src/sim/state';
import { paramsOf } from '../src/sim/params';
import { DEFAULT_PARAMS } from '../src/sim/params';
import type { Chimp, World } from '../src/types';

const runTo = (w: World, hour: number) => { while (w.time < hour - 6.5 - 1e-9) tickWorld(w); };
const byId = (w: World, id: number) => w.chimps.find(c => c.id === id)!;
const maxSwell = (c: Chimp) => { c.cycleDay = 15 * ix(c).cycleLen / 36; c.swelling = 1; c.pregnancy = 0; };

test('cycle template: ~11 days of maximal swelling with the periovulatory window late in it; adolescent subfecundity', () => {
  let maximal = 0;
  for (let u = 0; u < 36; u += 0.25) if (swellingAt(u, DEFAULT_PARAMS) >= 0.999) maximal += 0.25;
  assert.ok(maximal >= 10 && maximal <= 12, `maximal swelling ${maximal} days`);
  assert.equal(swellingAt(2, DEFAULT_PARAMS), 0); assert.equal(swellingAt(30, DEFAULT_PARAMS), 0);
  assert.equal(fecundity(12, DEFAULT_PARAMS), 0);
  assert.ok(fecundity(14, DEFAULT_PARAMS) > 0 && fecundity(14, DEFAULT_PARAMS) < fecundity(25, DEFAULT_PARAMS));
  assert.ok(fecundity(48, DEFAULT_PARAMS) < fecundity(30, DEFAULT_PARAMS));
});

test('cycle -> conception -> ~228-day gestation -> birth, with the sire drawn from periovulatory copulations', () => {
  const w = createWorld(21);
  w.ageRate = 365;
  const f = w.chimps.find(c => c.troopId === 1 && c.sex === 'female' && c.age > 18 && c.age < 30 && c.cycleDay >= 0 && c.pregnancy === 0)!;
  assert.ok(f, 'a cycling adult female');
  const partner = w.chimps.find(c => c.troopId === 1 && c.sex === 'male' && c.age > 18 && c.motherId !== f.id)!;
  f.health = 1;
  let conceivedAt = -1, sire = -1;
  const recorded = new Set<number>();
  for (let i = 0; i < 20 * 600 && f.pregnancy === 0; i++) {
    if (inPeriovulatory(f, DEFAULT_PARAMS) && i % 40 === 0) recordCopulation(w, f, partner);
    tickWorld(w);
    for (const k in ix(f).cops) recorded.add(+k);
    if (f.pregnancy > 0) { conceivedAt = w.time; sire = ix(f).sireId; }
  }
  assert.ok(conceivedAt > 0, 'conceived within 20 cycles');
  assert.ok(recorded.has(sire), 'sire copulated in the periovulatory window');
  assert.equal(f.cycleDay, -1);
  const n = w.chimps.length;
  const bioDays = (h: number) => h / 24 * 365;
  while (f.pregnancy > 0 && bioDays(w.time - conceivedAt) < 260) tickWorld(w);
  const days = bioDays(w.time - conceivedAt);
  assert.ok(days > 215 && days < 240, `gestation ${days.toFixed(0)} days`);
  const baby = w.chimps.slice(n - 1).find(c => c.motherId === f.id) ?? w.chimps.find(c => c.motherId === f.id && c.birthTime >= conceivedAt)!;
  assert.ok(baby, 'infant born');
  assert.equal(baby.fatherId, sire);
  assert.equal(baby.troopId, f.troopId); assert.equal(baby.natalTroopId, f.troopId);
  assert.ok(f.lactating); assert.ok(baby.bonds[f.id] > 0.9);
  assert.ok(w.events.some(e => e.kind === 'reproduction' && e.severity === 2 && e.actors.includes(baby.id)));
});

test('adolescent females disperse to a neighboring community; males stay', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const f = w.chimps.find(c => c.sex === 'female' && c.age >= 11 && c.age < 13 && c.troopId === c.natalTroopId)!;
  assert.ok(f);
  const natal = f.troopId;
  ix(f).disperser = true; maxSwell(f);
  ix(f).impulse = IMPULSE_TRANSFER; ix(f).impulseUntil = w.time + 1;
  for (let i = 0; i < 1500 && f.troopId === natal; i++) tickWorld(w);
  assert.notEqual(f.troopId, natal, 'joined a new community');
  assert.equal(f.natalTroopId, natal);
  assert.ok(Math.abs(ix(f).immigrantAge - f.age) < 0.1);
  assert.ok(w.stats.transfers >= 1);
  assert.ok(w.interactions.some(i => i.kind === 'transfer' && i.actorId === f.id));
  assert.ok(w.troops.find(t => t.id === f.troopId)!.femaleHierarchy.length >= 1);
  assert.ok(w.chimps.filter(c => c.sex === 'male').every(c => !ix(c).disperser));
});

test('maternal kin do not mate; unrelated swollen females are candidates', () => {
  const w = createWorld(48);
  runTo(w, 9);
  const son = w.chimps.find(c => c.sex === 'male' && c.age >= 15 && c.motherId > 0 && byId(w, c.motherId).alive)!;
  const mother = byId(w, son.motherId);
  const sister = w.chimps.find(c => c.sex === 'female' && c.motherId === mother.id && c.age >= 10);
  const other = w.chimps.find(c => c.sex === 'female' && c.troopId === son.troopId && c.age >= 15 && c.motherId !== mother.id && c.id !== mother.id)!;
  for (const [i, c] of [mother, sister, other].filter(Boolean).entries()) { maxSwell(c!); c!.position = [son.position[0] + 1 + i, 0, son.position[2]]; c!.nest = null; }
  son.hunger = 0.2; ix(son).lastMate = -1e9;
  perceive(w, son);
  const cands = getEligibleActions(w, son);
  assert.ok(!cands.some(c => c.action === 'mate' && c.targetId === mother.id));
  if (sister) assert.ok(!cands.some(c => c.action === 'mate' && c.targetId === sister.id));
  assert.ok(cands.some(c => c.action === 'mate' && c.targetId === other.id));
  perceive(w, mother);
  assert.ok(!getEligibleActions(w, mother).some(c => c.action === 'mate' && c.targetId === son.id));
});

test('with ample mating a fertile adult conceives in about one of four to five cycles', () => {
  const w = createWorld(3);
  const f = w.chimps.find(c => c.sex === 'female' && c.age > 18 && c.age < 30 && c.pregnancy === 0)!;
  const m = w.chimps.find(c => c.sex === 'male' && c.age > 18 && c.troopId === f.troopId && c.motherId !== f.id)!;
  let conceptions = 0, cycles = 0;
  for (let trial = 0; trial < 60; trial++) {
    f.pregnancy = 0; f.cycleDay = 15 * ix(f).cycleLen / 36; ix(f).cops = {}; ix(f).near = {}; f.health = 1; f.age = 22;
    for (let k = 0; k < 4; k++) recordCopulation(w, f, m);
    f.cycleDay = 21.5 * ix(f).cycleLen / 36;
    reproSlow(w, f, 1);
    cycles++;
    if (f.pregnancy > 0) conceptions++;
  }
  const perCycle = conceptions / cycles;
  assert.ok(perCycle > 0.12 && perCycle < 0.35, `conception per cycle ${perCycle.toFixed(2)}`);
});


test('C8 prenatal condition: the newborn\'s condition is the mother\'s pregnancy mean and its growth record min(1, gestCond / condGood)', () => {
  for (const gest of [0.3, 0.8]) {
    const w = createWorld(21), P = paramsOf(w);
    const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 18 && c.age < 30)!;
    const x = ix(f);
    f.pregnancy = x.gestation - 0.5; f.cycleDay = -1; x.cond = gest; x.gestCond = gest;
    const n = w.chimps.length;
    reproSlow(w, f, 1);
    assert.equal(w.chimps.length, n + 1, 'born');
    const baby = w.chimps[n];
    assert.ok(Math.abs(ix(baby).cond - gest) < 1e-12);
    assert.ok(Math.abs(ix(baby).grow - Math.min(1, gest / P.condGood)) < 1e-12);
  }
  // with the switch off the newborn starts as a founder does
  const w = createWorld(21, { params: { birthCondFromMother: 0 } });
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 18 && c.age < 30)!;
  f.pregnancy = ix(f).gestation - 0.5; f.cycleDay = -1; ix(f).gestCond = 0.2; ix(f).cond = 0.2;
  const n = w.chimps.length;
  reproSlow(w, f, 1);
  assert.equal(ix(w.chimps[n]).grow, 1);
  assert.ok(Math.abs(ix(w.chimps[n]).cond - (1 - w.chimps[n].hunger)) < 1e-12);
});


test('C8 fertility curve: adolescent ramp, full to fecundityDeclineY, linear fall to none at fecundityEndY; condition scales conception', () => {
  const P = DEFAULT_PARAMS;
  assert.equal(fecundity(P.fecundityStartY - 0.01, P), 0);
  assert.ok(fecundity(P.fecundityStartY + 0.5, P) < fecundity(P.fecundityFullY, P));
  assert.equal(fecundity(P.fecundityFullY + 1, P), P.fecundityMax);
  assert.equal(fecundity(P.fecundityDeclineY, P), P.fecundityMax);
  assert.ok(Math.abs(fecundity(30, P) - P.fecundityMax * (P.fecundityEndY - 30) / (P.fecundityEndY - P.fecundityDeclineY)) < 1e-12);
  for (let a = P.fecundityDeclineY; a < P.fecundityEndY - 0.5; a += 0.5) assert.ok(fecundity(a + 0.5, P) < fecundity(a, P));
  assert.equal(fecundity(P.fecundityEndY, P), 0);
  assert.equal(conditionFertility(0, P), P.fertilityCondFloor);
  assert.equal(conditionFertility(P.condGood, P), 1);
  assert.equal(conditionFertility(1, P), 1);
});

test('C8 no direct rank term in conception: two copies differing only in the female\'s rank conceive alike, with the same sire', () => {
  const w = createWorld(21);
  const f = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 18 && c.age < 30 && c.pregnancy === 0)!;
  const m = w.chimps.find(c => c.alive && c.sex === 'male' && c.age > 18 && c.troopId === f.troopId)!;
  maxSwell(f); f.health = 1; ix(f).cops = { [m.id]: 4 };
  const w2 = structuredClone(w), f2 = w2.chimps.find(c => c.id === f.id)!;
  f2.elo = f.elo + 400; f2.rank = 1 - f.rank; f2.rankOrder = 1;
  for (let d = 0; d < 40; d++) { reproSlow(w, f, 1); reproSlow(w2, f2, 1); }
  assert.equal(f.pregnancy, f2.pregnancy); assert.equal(ix(f).sireId, ix(f2).sireId); assert.equal(w.rng, w2.rng);
});
