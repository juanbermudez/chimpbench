import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { eat, energyTap, energyTick, gutCap, intakeSize, ledgerOf, ledgerSlow, massOf, nurseTick, reserveCap } from '../src/sim/energy';
import { fruitRate } from '../src/sim/intake';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1 (docs/staging/e1-prereg.md): the energy ledger. Off by default; these tests turn it on.
const ON: Overrides = { energyLedger: 1 };
const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
const adult = (w: World, sex: 'female' | 'male') => w.chimps.find(c => c.alive && c.sex === sex && c.age >= 20 && c.pregnancy === 0 && !c.lactating)!;

test('energy is conserved for every individual over a day: in − out = Δgut + Δreserves (both profiles)', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const w = createWorld(48, { profile, params: ON });
    run(w, 600); // every ledger is open after the first tick; start the day mid-morning
    const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
    run(w, DAY);
    let checked = 0, eaten = 0, spent = 0;
    for (const c of w.chimps) {
      const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
      if (!b || !L) continue;
      const flow = (L.in - b.in) - (L.out - b.out), stock = (L.gut - b.gut) + (L.res - b.res);
      assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, L.in, L.out), `${profile} ${c.name}: flow ${flow} vs stock ${stock}`);
      assert.ok(L.gut >= 0 && L.gut <= gutCap(c, paramsOf(w)) + 1e-9, 'gut within its capacity');
      assert.ok(L.out > b.out, 'everyone spends energy');
      checked++; eaten += L.in - b.in; spent += L.out - b.out;
    }
    assert.ok(checked >= 40, `${checked} individuals checked`);
    assert.ok(eaten > 0 && spent > 0);
  }
});

test('switch off: the world is what it was before E1 (no ledger state, same hash as the default world)', () => {
  const a = createWorld(7), b = createWorld(7, { params: { energyLedger: 0 } });
  run(a, DAY / 2); run(b, DAY / 2);
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(a.chimps.every(c => (c as Chimp & { sim?: { en?: unknown } }).sim?.en === undefined), 'no ledger is opened with the switch off');
});

test('switch on: the hunger timers and hunger-unit conversions have no effect', () => {
  const old: Overrides = { hungerAwakePerH: 0.3, hungerRunPerH: 0.5, hungerSleepPerH: 0.2, hungerLactationPerH: 0.2, hungerPregnancyPerH: 0.2, bodyChildBase: 0.2,
    fruitHungerFactor: 9, fallbackHungerPerH: 0.5, meatHungerFactor: 5, lactTaper: 0 };
  for (const profile of ['compressed', 'field'] as const) {
    const a = createWorld(21, { profile, params: ON }), b = createWorld(21, { profile, params: { ...ON, ...old, ...(profile === 'field' ? { fallbackRateRatio: 0.9 } : {}) } });
    run(a, DAY / 2); run(b, DAY / 2);
    assert.equal(worldHash(a), worldHash(b), profile);
  }
  // and the ledger does change the world
  const off = createWorld(21), on = createWorld(21, { params: ON });
  run(off, 400); run(on, 400);
  assert.notEqual(worldHash(off), worldHash(on));
});

test('determinism with the ledger on: the same seed gives the same world however ticks are batched', () => {
  const a = createWorld(48, { params: ON }), b = createWorld(48, { params: ON }), c = createWorld(48, { params: ON });
  run(a, 2400);
  for (let i = 0; i < 2400 / 8; i++) stepWorld(b, 2); // 2 wall seconds at 1× = 8 ticks
  for (let i = 0; i < 2400 / 60; i++) stepWorld(c, 15);
  assert.equal(worldHash(a), worldHash(b));
  assert.equal(worldHash(a), worldHash(c));
});

test('saves: a world with ledgers is plain data, passes the load-time shape check and resumes exactly', () => {
  const w = createWorld(5, { profile: 'field', params: ON });
  run(w, DAY);
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  assert.equal(worldHash(copy), worldHash(w));
  run(w, 500); run(copy, 500);
  assert.equal(worldHash(copy), worldHash(w), 'the loaded world continues as the saved one');
  const L = ix(w.chimps.find(c => c.alive)!).en!;
  assert.deepEqual(Object.keys(L).sort(), ['gut', 'in', 'milk', 'out', 'res', 'x', 'y', 'z']);
  assert.ok(Object.values(L).every(Number.isFinite));
});

test('a fasting animal loses reserves at its resting cost, grows hungry, and dies when the reserve is gone', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w), c = adult(w, 'female'), x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), M = massOf(c, P);
  L.gut = 0; L.res = 0; L.x = c.position[0]; L.y = c.position[1]; L.z = c.position[2];
  for (let i = 0; i < DAY; i++) energyTick(w, c, x, false);
  // a day awake at rest: Kleiber × 1.25, nothing else
  const expected = P.ledgerRmrCoef * M ** P.ledgerRmrExp * P.ledgerActRest;
  assert.ok(Math.abs(-L.res - expected) < 1e-6 * expected, `${-L.res} vs ${expected} kcal`);
  assert.ok(expected > 900 && expected < 1400, 'an adult female at rest spends about 1,150 kcal a day');
  assert.ok(c.hunger > 0.5, 'empty gut and a deficit: hungrier than at the set point');
  assert.equal(ledgerSlow(c, x, P), false);
  assert.ok(x.cond < P.ledgerCondSet);
  L.res = -reserveCap(c, P);
  assert.equal(ledgerSlow(c, x, P), true, 'an exhausted reserve is starvation');
  assert.equal(x.cond, 0);
});

test('a fed animal cannot overfill its gut, gains reserves and loses its appetite', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w), c = adult(w, 'male'), x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), cap = gutCap(c, P);
  L.gut = 0; L.res = 0;
  assert.equal(eat(c, P, 10 * cap), cap, 'only what fits is eaten');
  assert.equal(eat(c, P, 50), 0, 'a full gut takes no more');
  assert.equal(c.hunger, 0);
  for (let i = 0; i < 3 * DAY; i++) { eat(c, P, 1e6); energyTick(w, c, x, false); }
  assert.ok(L.res > 0.1 * reserveCap(c, P), 'reserves above the set point');
  ledgerSlow(c, x, P);
  assert.ok(x.cond > P.ledgerCondSet);
  L.gut = 0; energyTick(w, c, x, false);
  assert.equal(c.hunger, 0, 'no appetite at a 10% surplus even with an empty gut');
});

test('milk: what the infant drinks leaves the mother, at the cost of synthesis; locomotion costs energy per metre', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w);
  const infant = w.chimps.find(c => c.alive && c.age < 2 && w.chimps.some(m => m.id === c.motherId && m.alive))!, mother = w.chimps.find(m => m.id === infant.motherId)!;
  const I = ledgerOf(infant, P), Mo = ledgerOf(mother, P);
  I.gut = 0; Mo.milk = 0;
  const in0 = I.in;
  nurseTick(infant, mother, P);
  assert.equal(I.in, in0, 'empty glands give nothing');
  // a lactating mother makes milk at the yield rate, up to what her glands hold
  mother.lactating = true; mother.action = 'rest';
  const perDay = P.ledgerMilkYieldCoef * massOf(mother, P) ** P.ledgerRmrExp;
  for (let i = 0; i < 240; i++) energyTick(w, mother, ix(mother), false);
  assert.ok(Math.abs(Mo.milk - perDay / 24) < 1e-9, 'an hour of synthesis');
  for (let i = 0; i < DAY; i++) energyTick(w, mother, ix(mother), false);
  assert.ok(Math.abs(Mo.milk - perDay * P.ledgerMilkStoreH / 24) < 1e-9, 'full glands stop synthesis');
  const out1 = Mo.out, res1 = Mo.res, store = Mo.milk;
  nurseTick(infant, mother, P);
  const milk = I.in - in0;
  assert.ok(Math.abs(milk - P.ledgerMilkKcalPerMin / 4) < 1e-9, 'a 15 s tick of nursing');
  assert.ok(Math.abs(store - Mo.milk - milk) < 1e-9);
  assert.ok(Math.abs((Mo.out - out1) - milk / P.ledgerMilkEff) < 1e-9 && Math.abs((res1 - Mo.res) - milk / P.ledgerMilkEff) < 1e-9);
  // 100 m on the ground and 10 m up, in steps a walker can make
  const c = adult(w, 'female'), x = ix(c), L = ledgerOf(c, P), M = massOf(c, P);
  c.action = 'rest'; c.position[1] = 0; L.x = c.position[0]; L.y = 0; L.z = c.position[2];
  const still = createWorld(48, { params: ON }), sc = still.chimps.find(k => k.id === c.id)!, sx = ix(sc);
  sc.action = 'rest'; const SL = ledgerOf(sc, P); SL.out = L.out; SL.x = sc.position[0]; SL.y = sc.position[1]; SL.z = sc.position[2];
  for (let i = 0; i < 100; i++) { c.position[0] += 1; c.position[1] += 0.1; energyTick(w, c, x, false); energyTick(still, sc, sx, false); }
  const extra = (L.out - SL.out) * 4184; // J
  assert.ok(Math.abs(extra - (100 * P.ledgerWalkJPerKgM * M + 10 * M * 9.81 / P.ledgerClimbEff)) < 1e-3 * extra, `${extra} J`);
});

// ---------------------------------------------------------------------------------------------------------------------
// Stage E1c (docs/staging/e1c-prereg.md): growth from surplus, night nursing, intake capacity by body size. Off by default.
const E1C: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1 };
const curveKg = (c: Chimp, P: ReturnType<typeof paramsOf>) => {
  const f = c.sex === 'female', adult = f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg, at = f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY;
  return c.age >= at ? adult : P.ledgerMassBirthKg + (adult - P.ledgerMassBirthKg) * c.age / at;
};

test('E1c: the switches do nothing without the ledger (default world unchanged)', () => {
  const a = createWorld(7), b = createWorld(7, { params: { ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerIntakeSizeExp: 0.5 } });
  run(a, DAY / 2); run(b, DAY / 2);
  assert.equal(worldHash(a), worldHash(b));
});

test('E1c: energy is conserved with growth from surplus, night nursing and intake by size (both profiles)', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const w = createWorld(48, { profile, params: profile === 'field' ? { ...E1C, rhythmSleep: 1, rhythmHeat: 1, ledgerMilkStoreH: 11 } : E1C });
    run(w, 600);
    const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
    run(w, DAY);
    let checked = 0;
    for (const c of w.chimps) {
      const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
      if (!b || !L) continue;
      const flow = (L.in - b.in) - (L.out - b.out), stock = (L.gut - b.gut) + (L.res - b.res);
      assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, L.in, L.out), `${profile} ${c.name}: flow ${flow} vs stock ${stock}`);
      assert.ok(L.kg !== undefined && L.kg >= b.kg! && L.kg <= (c.sex === 'female' ? paramsOf(w).ledgerMassFemaleKg : paramsOf(w).ledgerMassMaleKg) + 1e-9, 'mass is state, never falls, never above adult');
      checked++;
    }
    assert.ok(checked >= 40, `${checked} individuals checked`);
  }
});

test('E1c growth: only from reserves above the set point, at the curve slope, up to adult mass', () => {
  const w = createWorld(48, { params: E1C }), P = paramsOf(w);
  const inf = w.chimps.find(c => c.alive && c.age > 1 && c.age < 4)!, x = ix(inf);
  inf.action = 'rest';
  const L = ledgerOf(inf, P);
  assert.equal(L.kg, curveKg(inf, P), 'a founder opens on the curve');
  assert.equal(massOf(inf, P), L.kg);
  let grown = 0;
  energyTap.fn = (_c, term, kcal) => { if (term === 'growth') grown += kcal; };
  try {
    // below the set point: no growth, no growth cost
    L.res = -50; const kg0 = L.kg!;
    for (let i = 0; i < 240; i++) { L.res = -50; energyTick(w, inf, x, false); }
    assert.equal(L.kg, kg0); assert.equal(grown, 0);
    // above it: the curve's slope per bio-year, 4.5 kcal per g
    const f = inf.sex === 'female', v = ((f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg) - P.ledgerMassBirthKg) / (f ? P.ledgerMassMatureFemaleY : P.ledgerMassMatureMaleY);
    for (let i = 0; i < 240; i++) { L.res = 1e5; energyTick(w, inf, x, false); }
    const dkg = v / 24 / 365.25;
    assert.ok(Math.abs(L.kg! - kg0 - dkg) < 1e-9, `${L.kg! - kg0} kg in an hour vs ${dkg}`);
    assert.ok(Math.abs(grown - dkg * 1000 * P.ledgerGrowthKcalPerG) < 1e-6, `${grown} kcal`);
    assert.ok(Math.abs(gutCap(inf, P) - P.ledgerGutCapKcalPerKg * L.kg!) < 1e-9, 'capacities follow the own mass');
    // it stops exactly at adult mass, and an adult never grows
    const adultKg = f ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
    L.kg = adultKg - 1e-7; grown = 0;
    for (let i = 0; i < 10; i++) { L.res = 1e5; energyTick(w, inf, x, false); }
    assert.equal(L.kg, adultKg);
    assert.ok(grown > 0 && grown < 1e-7 * 1000 * P.ledgerGrowthKcalPerG + 1e-9, 'only the remaining gram is paid for');
    const ad = adult(w, 'male'), AL = ledgerOf(ad, P); grown = 0;
    for (let i = 0; i < 100; i++) { AL.res = 1e5; energyTick(w, ad, ix(ad), false); }
    assert.equal(grown, 0); assert.equal(AL.kg, P.ledgerMassMaleKg);
  } finally { energyTap.fn = null; }
});

test('E1c intake: capacity scales with (mass / adult mass)^exp, 1 for adults, and the fruit valuation uses it', () => {
  const w = createWorld(48, { params: E1C }), P = paramsOf(w);
  const inf = w.chimps.find(c => c.alive && c.age > 1 && c.age < 4)!, ad = adult(w, inf.sex);
  ledgerOf(inf, P); ledgerOf(ad, P);
  assert.equal(intakeSize(ad, P), 1);
  const r = massOf(inf, P) / (inf.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg);
  assert.ok(Math.abs(intakeSize(inf, P) - r ** P.ledgerIntakeSizeExp) < 1e-12);
  const skill = (c: Chimp) => P.fruitIntakeSkillBase + P.fruitIntakeSkillGain * c.skills.foraging;
  assert.ok(Math.abs(fruitRate(inf, P).fruitPerH / fruitRate(ad, P).fruitPerH - intakeSize(inf, P) * skill(inf) / skill(ad)) < 1e-12);
  // switch off: the old young factor
  const P0 = paramsOf(createWorld(48, { params: ON }));
  assert.ok(Math.abs(fruitRate(inf, P0).fruitPerH - P0.fruitIntakePerH * skill(inf) * P0.fruitIntakeYoungFactor) < 1e-12);
});

test('E1c night nursing: infants drink in their mother\'s nest in the dark only with the switch', () => {
  const nightMilk = (params: Overrides) => {
    const w = createWorld(48, { params });
    let milk = 0;
    energyTap.fn = (_c, term, kcal) => { if (term === 'suckled' && w.environment.daylight < 0.1) milk += kcal; };
    try { run(w, DAY); } finally { energyTap.fn = null; }
    return milk;
  };
  const on = nightMilk({ ...ON, ledgerNightNurse: 1 }), off = nightMilk(ON);
  assert.ok(on > 100, `${on} kcal drunk at night with the switch`);
  assert.ok(on > 5 * off, `night milk ${on} with vs ${off} without`);
});

test('E1c saves and determinism: ledgers with mass are plain data, load, resume exactly, and batch-invariant', () => {
  const w = createWorld(5, { profile: 'field', params: E1C });
  run(w, DAY / 2);
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(w, 300); run(copy, 300);
  assert.equal(worldHash(copy), worldHash(w));
  assert.deepEqual(Object.keys(ix(w.chimps.find(c => c.alive)!).en!).sort(), ['gut', 'in', 'kg', 'milk', 'out', 'res', 'x', 'y', 'z']);
  const a = createWorld(48, { params: E1C }), b = createWorld(48, { params: E1C });
  run(a, 1200);
  for (let i = 0; i < 1200 / 60; i++) stepWorld(b, 15);
  assert.equal(worldHash(a), worldHash(b));
});
