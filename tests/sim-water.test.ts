import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { massOf } from '../src/sim/energy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { drinkTick, drinkWorth, foodWater, insensibleW, vapourPa, waterOf, waterTap, type WaterTerm } from '../src/sim/water';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E2g (docs/staging/e2g-prereg.md): the water ledger. Off by default; these tests turn it on with the ledgers it
// reads (energy, digesta) and the heat balance whose evaporation it books.
const BASE: Overrides = { energyLedger: 1, ledgerDigesta: 1, ledgerDrive: 1, ledgerNurseBout: 1, rhythmSleep: 1, rhythmHeat: 1 };
const ON: Overrides = { ...BASE, waterLedger: 1 };
const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
const wat = (c: Chimp) => ix(c).wat;

test('water is conserved for every individual over a day: in − out = −Δdeficit, and milk water moves from mother to infant (both profiles)', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const w = createWorld(48, { profile, params: ON });
    run(w, 600);
    const before = new Map(w.chimps.filter(c => c.alive && wat(c)).map(c => [c.id, { ...wat(c)! }]));
    const sums: Record<string, number> = {};
    waterTap.fn = (_c, term: WaterTerm, mL) => { sums[term] = (sums[term] ?? 0) + mL; };
    try { run(w, DAY); } finally { waterTap.fn = null; }
    let checked = 0;
    for (const c of w.chimps) {
      const b = before.get(c.id), W = c.alive ? wat(c) : undefined;
      if (!b || !W) continue;
      const flow = (W.in - b.in) - (W.out - b.out), stock = -(W.def - b.def);
      assert.ok(Math.abs(flow - stock) < 1e-9 * Math.max(1, W.in, W.out), `${profile} ${c.name}: flow ${flow} vs stock ${stock}`);
      assert.ok(W.out > b.out, 'everyone loses water');
      checked++;
    }
    assert.ok(checked >= 40, `${checked} individuals checked`);
    for (const t of ['food', 'metabolic', 'insensible', 'faecal', 'urine'] as const) assert.ok((sums[t] ?? 0) > 0, `${profile}: ${t} flows`);
    assert.ok(Math.abs((sums.milkIn ?? 0) - (sums.milkOut ?? 0)) < 1e-9 * Math.max(1, sums.milkIn ?? 0), `${profile}: milk water in ${sums.milkIn} = out ${sums.milkOut}`);
  }
});

test('switch off: the world is what it was before E2g (no water ledger, same hash), and the switch alone does nothing without the ledgers', () => {
  for (const [a, b] of [[createWorld(7), createWorld(7, { params: { waterLedger: 0 } })], [createWorld(7, { params: BASE }), createWorld(7, { params: { ...BASE, waterLedger: 0 } })],
    [createWorld(7), createWorld(7, { params: { waterLedger: 1 } })]]) {
    run(a, DAY / 2); run(b, DAY / 2);
    assert.equal(worldHash(a), worldHash(b));
    assert.ok(b.chimps.every(c => wat(c) === undefined), 'no water ledger is opened');
  }
});

test('switch on: the thirst timers, the fruit factor, the drink rate and the drink distance scale have no effect; the ledger changes the world', () => {
  const old: Overrides = { thirstAwakePerH: 0.3, thirstSleepPerH: 0.2, thirstHotC: 10, thirstHotPerH: 0.2, thirstRainRelief: 0.5, fruitThirstFactor: 3, drinkThirstPerH: 5, drinkDistScaleM: 100 };
  for (const profile of ['compressed', 'field'] as const) {
    const a = createWorld(21, { profile, params: ON }), b = createWorld(21, { profile, params: { ...ON, ...old } });
    run(a, DAY / 2); run(b, DAY / 2);
    assert.equal(worldHash(a), worldHash(b), profile);
  }
  const off = createWorld(21, { params: BASE }), on = createWorld(21, { params: ON });
  run(off, 400); run(on, 400);
  assert.notEqual(worldHash(off), worldHash(on));
});

test('determinism with the water ledger on: the same seed gives the same world however ticks are batched', () => {
  const a = createWorld(48, { params: ON }), b = createWorld(48, { params: ON }), c = createWorld(48, { params: ON });
  run(a, 2400);
  for (let i = 0; i < 2400 / 8; i++) stepWorld(b, 2);
  for (let i = 0; i < 2400 / 60; i++) stepWorld(c, 15);
  assert.equal(worldHash(a), worldHash(b));
  assert.equal(worldHash(a), worldHash(c));
});

test('saves: a world with water ledgers is plain data, passes the load-time shape check and resumes exactly', () => {
  const w = createWorld(5, { profile: 'field', params: ON });
  run(w, DAY / 2);
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(w, 300); run(copy, 300);
  assert.equal(worldHash(copy), worldHash(w), 'the loaded world continues as the saved one');
  const W = wat(w.chimps.find(c => c.alive)!)!;
  assert.deepEqual(Object.keys(W).sort(), ['def', 'fAt', 'in', 'mx', 'oAt', 'out']);
});

test('thirst is 0 below a 1% deficit and full at 2%; drinking replaces the deficit at the measured rate; a far site is worth less', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w);
  run(w, 10);
  const c = w.chimps.find(k => k.alive && k.sex === 'female' && k.age >= 20)!, kg = massOf(c, P), W = waterOf(c, P);
  W.def = kg * 10 * 0.5; drinkTick(c, P); // 0.5% of mass, less one tick of drinking
  assert.equal(c.thirst, 0);
  W.def = kg * 10 * 3; drinkTick(c, P);
  assert.equal(c.thirst, 1, 'still above 2% after one tick');
  const perTick = P.waterDrinkMlPerKgMin * kg * 15 / 60;
  W.def = kg * 10 * 1.5 + perTick; drinkTick(c, P);
  assert.ok(Math.abs(c.thirst - 0.5) < 1e-9, `thirst ${c.thirst} at 1.5%`);
  assert.ok(drinkWorth(c, P, 50) > drinkWorth(c, P, 500), 'a near site is worth more');
  let ticks = 0;
  while (!drinkTick(c, P) && ticks < 1000) ticks++;
  assert.ok(W.def <= 1e-9 && c.thirst === 0, 'sated when the deficit is gone');
  assert.ok(ticks * 15 / 60 < 10, `a 1.5% deficit is replaced in ${ticks * 15 / 60} min`);
});

test('inputs: food water by dry matter; insensible loss near the human values', () => {
  const P = paramsOf(createWorld(48, { params: ON }));
  // drupes: 3.0 g of water per g of dry matter at a water share of 0.75
  assert.ok(foodWater(P, 100, 'drupe') > 0);
  // Fanger at 25 °C, 80% RH, 58 W/m² (resting human): ~420 g/m²/day of insensible water (sawka2015's range for 1.8 m²)
  const gPerM2Day = insensibleW(P, 58, vapourPa(25, 0.8)) * 86400 / P.waterLatentJPerG;
  assert.ok(gPerM2Day > 350 && gPerM2Day < 500, `${gPerM2Day} g/m²/day`);
});
