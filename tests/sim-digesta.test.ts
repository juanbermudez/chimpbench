import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { digestaCaps, eat, energyTap, energyTick, gutCap, gutRoom, ledgerOf } from '../src/sim/energy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1b (docs/staging/e1b-prereg.md): digesta in the gut. Off by default; these tests turn it on over the E1 ledger.
const E1: Overrides = { energyLedger: 1 };
const ON: Overrides = { energyLedger: 1, ledgerDigesta: 1 };
const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
const adult = (w: World, sex: 'female' | 'male') => w.chimps.find(c => c.alive && c.sex === sex && c.age >= 20 && c.pregnancy === 0 && !c.lactating)!;
/** Energy held in the gut, in the ledger's units: non-fibre energy plus fibre at its fermentation yield, in both pools. */
const gutEnergy = (L: { gut: number; fib?: number; hind?: number }, yieldKcal: number) => L.gut + yieldKcal * ((L.fib ?? 0) + (L.hind ?? 0));

test('energy is conserved for every individual over a day: in − out − passed out = Δgut + Δreserves (both profiles)', () => {
  for (const profile of ['compressed', 'field'] as const) {
    const w = createWorld(48, { profile, params: ON }), P = paramsOf(w), Y = P.digestaFermentKcalPerG;
    run(w, 600);
    const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
    run(w, DAY);
    let checked = 0, eaten = 0, passed = 0;
    for (const c of w.chimps) {
      const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
      if (!b || !L) continue;
      const flow = (L.in - b.in) - (L.out - b.out) - (L.fec! - b.fec!), stock = (gutEnergy(L, Y) - gutEnergy(b, Y)) + (L.res - b.res);
      assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, L.in, L.out), `${profile} ${c.name}: flow ${flow} vs stock ${stock}`);
      const [capF, capH] = digestaCaps(c, P);
      assert.ok(L.dm! >= 0 && L.dm! <= capF + 1e-9, 'foregut within its capacity');
      assert.ok(L.hind! >= 0 && L.hind! <= capH + 1e-9, 'hindgut within its capacity');
      assert.ok(L.fib! >= 0 && L.fib! <= L.dm! + 1e-9, 'fibre is part of the foregut dry matter');
      checked++; eaten += L.fin! - b.fin!; passed += L.fec! - b.fec!;
    }
    assert.ok(checked >= 40, `${checked} individuals checked`);
    assert.ok(eaten > 0 && passed > 0, 'food is eaten and residue passes out');
  }
});

test('switch off: the E1 ledger is unchanged (no digesta state, same world as the E1 default)', () => {
  const a = createWorld(7, { profile: 'field', params: E1 }), b = createWorld(7, { profile: 'field', params: { ...E1, ledgerDigesta: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const L = ix(a.chimps.find(c => c.alive)!).en!;
  assert.deepEqual(Object.keys(L).sort(), ['gut', 'in', 'milk', 'out', 'res', 'x', 'y', 'z']);
  // and with the ledger itself off the switch is not read
  const c = createWorld(7), d = createWorld(7, { params: { ledgerDigesta: 1 } });
  run(c, DAY / 4); run(d, DAY / 4);
  assert.equal(worldHash(c), worldHash(d));
});

test('determinism with digesta on: the same seed gives the same world however ticks are batched', () => {
  const a = createWorld(48, { params: ON }), b = createWorld(48, { params: ON }), c = createWorld(48, { params: ON });
  run(a, 2400);
  for (let i = 0; i < 2400 / 8; i++) stepWorld(b, 2);
  for (let i = 0; i < 2400 / 60; i++) stepWorld(c, 15);
  assert.equal(worldHash(a), worldHash(b));
  assert.equal(worldHash(a), worldHash(c));
  const e1 = createWorld(48, { params: E1 });
  run(e1, 2400);
  assert.notEqual(worldHash(a), worldHash(e1), 'the switch changes the world');
});

test('saves: a world with digesta is plain data, passes the load-time shape check and resumes exactly', () => {
  const w = createWorld(5, { profile: 'field', params: ON });
  run(w, DAY / 2);
  assert.deepEqual(plainDataProblems(w), []);
  const copy = JSON.parse(JSON.stringify(w)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(w, 500); run(copy, 500);
  assert.equal(worldHash(copy), worldHash(w));
  const L = ix(w.chimps.find(c => c.alive)!).en!;
  assert.deepEqual(Object.keys(L).sort(), ['dm', 'dmIn', 'fec', 'fib', 'fin', 'gut', 'hind', 'in', 'milk', 'out', 'res', 'x', 'y', 'z']);
  assert.ok(Object.values(L).every(Number.isFinite));
});

test('bulk: fibre-rich food fills the foregut faster per kcal, and hunger reads the fill', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w), c = adult(w, 'female');
  const L = ledgerOf(c, P), [capF] = digestaCaps(c, P);
  L.gut = 0; L.dm = 0; L.fib = 0; L.hind = 0; L.res = 0;
  const drupe = gutRoom(c, P, 'drupe'), fallback = gutRoom(c, P, 'fallback'), milk = gutRoom(c, P, 'milk');
  assert.ok(Math.abs(drupe - gutCap(c, P)) < 1e-9, 'gut capacity in kcal is what fills the empty foregut with drupes');
  assert.ok(fallback < 0.75 * drupe, `fallback food fills it on ${fallback.toFixed(0)} kcal, drupes on ${drupe.toFixed(0)}`);
  assert.ok(milk > drupe, 'milk is energy-dense per gram of dry matter');
  // the measured feeding rates set the dry matter per kcal: 3.0 g/min of drupes at 9.9 kcal/min
  assert.ok(Math.abs(drupe - capF * P.ledgerFruitKcalPerMin / P.digestaDrupeDmGPerMin) < 1e-9);
  const before = c.hunger;
  assert.equal(eat(c, P, 10 * drupe, 'drupe'), drupe, 'only what fits is eaten');
  assert.ok(Math.abs(L.dm! - capF) < 1e-9 && c.hunger === 0 && before > 0, 'a full foregut: no hunger');
  assert.equal(eat(c, P, 10, 'fallback'), 0, 'a full foregut takes no more');
  assert.ok(Math.abs(L.fib! - capF * P.digestaFruitNdf) < 1e-9, 'fibre is the measured share of the dry matter');
});

test('digestion: the fermented share of fibre is its digestibility, residue leaves at the mean retention time, absorbing costs energy', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w), c = adult(w, 'male'), x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), Y = P.digestaFermentKcalPerG;
  L.gut = 0; L.dm = 0; L.fib = 0; L.hind = 100; L.res = 0; L.fec = 0; L.x = c.position[0]; L.y = c.position[1]; L.z = c.position[2];
  let tef = 0;
  energyTap.fn = (_c, term, k) => { if (term === 'digestion') tef += k; };
  for (let i = 0; i < 40 * DAY; i++) energyTick(w, c, x, false);
  energyTap.fn = null;
  assert.ok(L.hind! < 1e-6, 'the hindgut empties');
  const passedG = L.fec! / Y;
  assert.ok(Math.abs(passedG / 100 - (1 - P.digestaNdfDigestibility)) < 1e-6, `passed share ${(passedG / 100).toFixed(4)}`);
  assert.ok(Math.abs(tef - P.digestaTefFrac * 100 * P.digestaNdfDigestibility * Y) < 1e-6, 'diet-induced thermogenesis is a share of what is absorbed');
  // the time constants: residue leaves the hindgut as k·(1 − d) with k(1 − d) = 1 / (MRT − foregut time)
  const w2 = createWorld(48, { params: ON }), c2 = w2.chimps.find(k => k.id === c.id)!, L2 = ledgerOf(c2, P);
  c2.action = 'rest'; L2.gut = 0; L2.dm = 0; L2.fib = 0; L2.hind = 100; L2.fec = 0;
  const hours = 10, ticks = hours * 240;
  for (let i = 0; i < ticks; i++) energyTick(w2, c2, ix(c2), false);
  const k = 1 / ((P.digestaMrtH - P.ledgerGutEmptyH) * (1 - P.digestaNdfDigestibility));
  assert.ok(Math.abs(L2.hind! - 100 * Math.exp(-k * hours)) < 1e-6, `hindgut ${L2.hind} vs ${100 * Math.exp(-k * hours)}`);
});

test('a full hindgut holds the foregut full: the gut empties only as fast as fibre leaves the hindgut', () => {
  const w = createWorld(48, { params: ON }), P = paramsOf(w), c = adult(w, 'female'), x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), [capF, capH] = digestaCaps(c, P);
  L.gut = 0; L.dm = 0; L.fib = 0; L.res = 0;
  eat(c, P, 1e6, 'fallback');
  const free = createWorld(48, { params: ON }), fc = free.chimps.find(k => k.id === c.id)!, FL = ledgerOf(fc, P);
  fc.action = 'rest'; FL.gut = 0; FL.dm = 0; FL.fib = 0; FL.res = 0; FL.hind = 0; eat(fc, P, 1e6, 'fallback');
  L.hind = capH;
  for (let i = 0; i < 240; i++) { energyTick(w, c, x, false); energyTick(free, fc, ix(fc), false); }
  assert.ok(L.dm! > FL.dm! + 0.2 * capF, `blocked foregut ${L.dm!.toFixed(1)} g vs free ${FL.dm!.toFixed(1)} g after an hour`);
  assert.ok(L.hind! <= capH + 1e-9);
  assert.ok(c.hunger < fc.hunger, 'and the blocked animal is less hungry');
});
