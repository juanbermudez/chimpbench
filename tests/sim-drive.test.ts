import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { digestaCaps, eat, energyNeed, energyTick, feedHorizon, gutCap, ledgerOf, milkShare, reserveCap, sharePlant } from '../src/sim/energy';
import { eatFallback, fallbackStock } from '../src/sim/fallback';
import { needFruit, treeIntake } from '../src/sim/intake';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1e (docs/staging/e1e-prereg.md): the two-signal appetite. Off by default; these tests turn it on over the stack.
const STACK: Overrides = { energyLedger: 1, rhythmSleep: 1, rhythmHeat: 1, ledgerDigesta: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1 };
const ON: Overrides = { ...STACK, ledgerDrive: 1 };
const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
const adult = (w: World, sex: 'female' | 'male') => w.chimps.find(c => c.alive && c.sex === sex && c.age >= 20 && c.pregnancy === 0 && !c.lactating)!;
const gutEnergy = (L: { gut: number; fib?: number; hind?: number }, y: number) => L.gut + y * ((L.fib ?? 0) + (L.hind ?? 0));

test('switch off: the stack is unchanged by the switch (no drive state, same world)', () => {
  const a = createWorld(7, { profile: 'field', params: STACK }), b = createWorld(7, { profile: 'field', params: { ...STACK, ledgerDrive: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const L = ix(a.chimps.find(c => c.alive)!).en!;
  assert.ok(L.eAvg === undefined && L.sBed === undefined, 'no drive state with the switch off');
  // and without the ledger the switch is not read
  const c = createWorld(7), d = createWorld(7, { params: { ledgerDrive: 1 } });
  run(c, DAY / 4); run(d, DAY / 4);
  assert.equal(worldHash(c), worldHash(d));
});

test('energy is conserved for every individual with the drive on (field stack and compressed ledger), sharing included', () => {
  for (const [profile, params] of [['field', ON], ['compressed', { energyLedger: 1, ledgerDrive: 1 }]] as const) {
    const w = createWorld(48, { profile, params }), P = paramsOf(w), Y = P.ledgerDigesta === 1 ? P.digestaFermentKcalPerG : 0;
    run(w, 600);
    const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
    run(w, DAY);
    let checked = 0;
    for (const c of w.chimps) {
      const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
      if (!b || !L) continue;
      const flow = (L.in - b.in) - (L.out - b.out) - ((L.fec ?? 0) - (b.fec ?? 0)), stock = (gutEnergy(L, Y) - gutEnergy(b, Y)) + (L.res - b.res);
      assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, Math.abs(L.in), L.out), `${profile} ${c.name}: flow ${flow} vs stock ${stock}`);
      assert.ok(Number.isFinite(L.eAvg!) && L.eAvg! > 0 && c.hunger >= 0 && c.hunger <= 1);
      checked++;
    }
    assert.ok(checked >= 40, `${checked} individuals checked`);
  }
});

test('determinism with the drive on, and saves resume exactly', () => {
  const a = createWorld(48, { profile: 'field', params: ON }), b = createWorld(48, { profile: 'field', params: ON });
  run(a, 2400);
  for (let i = 0; i < 2400 / 60; i++) stepWorld(b, 15);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(plainDataProblems(a), []);
  const copy = JSON.parse(JSON.stringify(a)) as World;
  assert.equal(worldShapeProblem(copy), '');
  run(a, 500); run(copy, 500);
  assert.equal(worldHash(copy), worldHash(a));
  const off = createWorld(48, { profile: 'field', params: STACK });
  run(off, 2400 + 500);
  assert.notEqual(worldHash(off), worldHash(a), 'the switch changes the world');
});

test('drive: a deficit is not capped by gut emptiness; a full foregut sates; a coming fast raises hunger', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w), c = adult(w, 'female'), x = ix(c);
  c.action = 'rest';
  const L = ledgerOf(c, P), [capF] = digestaCaps(c, P);
  x.slp = 0.2; L.sWake = 0.02; L.sBed = 0.48; L.eAvg = 52;
  L.gut = 0; L.dm = 0; L.fib = 0; L.hind = 0; L.res = -0.1 * reserveCap(c, P);
  eat(c, P, 0, 'drupe');
  const empty = c.hunger;
  // half the foregut full: E1's readout would cap hunger at 0.5; here the drive keeps 1 − 0.5² = 75% of itself
  eat(c, P, 0.5 * capF / (P.digestaDrupeDmGPerMin / P.ledgerFruitKcalPerMin), 'drupe');
  assert.ok(Math.abs(ix(c).en!.dm! - 0.5 * capF) < 1e-6);
  assert.ok(c.hunger > 0.5 && Math.abs(c.hunger - 0.75 * Math.min(1, empty / 1)) < 0.1, `deficit, half-full gut: hunger ${c.hunger.toFixed(3)} (empty ${empty.toFixed(3)})`);
  eat(c, P, 1e6, 'drupe');
  assert.equal(c.hunger, 0, 'a full foregut: no hunger');
  // the same body later in the day (higher sleep pressure, less waking time left) is hungrier: the fast ahead looms
  L.gut = 0; L.dm = 0; L.fib = 0; L.res = 0;
  x.slp = 0.1; eat(c, P, 0, 'drupe'); const morning = c.hunger;
  x.slp = 0.44; eat(c, P, 0, 'drupe'); const evening = c.hunger;
  assert.ok(evening > 2 * morning, `evening ${evening.toFixed(3)} vs morning ${morning.toFixed(3)}`);
  const [left, fast] = feedHorizon(c, L, P);
  assert.ok(left > 0 && left < 2 && Math.abs(fast - (24 - P.rhythmSleepRiseH * Math.log(0.98 / 0.52))) < 1e-9, `${left} h left, fast ${fast} h`);
  // the horizon reads sleep pressure only: changing the hour of the world changes nothing
  const t0 = feedHorizon(c, L, P)[0]; w.hour = (w.hour + 7) % 24; w.time += 7;
  assert.equal(feedHorizon(c, L, P)[0], t0);
  void energyTick;
});

test('a tree is worth the energy a bout can deliver: nothing to a sated animal; a bout ends when the foregut is full', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w), c = adult(w, 'male'), x = ix(c);
  const L = ledgerOf(c, P);
  x.slp = 0.2; L.sWake = 0.02; L.sBed = 0.48; L.eAvg = 60; L.gut = 0; L.dm = 0; L.fib = 0; L.hind = 0;
  L.res = 2 * reserveCap(c, P); // a large surplus: no need
  assert.ok(energyNeed(c, P) < 0);
  assert.equal(treeIntake(c, P, 5, 0, 0).perHourInclWalk, 0, 'a sated animal gains nothing from a crown');
  L.res = -0.2 * reserveCap(c, P);
  const here = treeIntake(c, P, 50, 0, 0);
  assert.ok(Math.abs(here.perHourInclWalk - here.rateH) < 1e-9 * here.rateH, 'the crown it sits in is worth its full rate, whatever the need');
  const far = treeIntake(c, P, 50, 0, 300);
  assert.ok(far.perHourInclWalk < here.rateH && far.perHourInclWalk > 0);
  // a nearly full foregut leaves a short bout, so the same walk costs a larger share of the trip
  const [capF] = digestaCaps(c, P);
  eat(c, P, 0.9 * capF / (P.digestaDrupeDmGPerMin / P.ledgerFruitKcalPerMin), 'drupe');
  const fullFar = treeIntake(c, P, 50, 0, 300);
  assert.ok(fullFar.perHourInclWalk < 0.7 * far.perHourInclWalk, `${fullFar.perHourInclWalk} vs ${far.perHourInclWalk}`);
  assert.ok(needFruit(c, P, c.hunger) > 0, 'the crop-share rules read the kcal need');
  void gutCap;
});

test('nursing is worth the milk the glands can deliver', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  const infant = w.chimps.find(c => c.alive && c.age < 2 && w.chimps.some(m => m.id === c.motherId && m.alive))!, mother = w.chimps.find(m => m.id === infant.motherId)!;
  const I = ledgerOf(infant, P), M = ledgerOf(mother, P);
  mother.lactating = true; I.res = -0.3 * reserveCap(infant, P);
  M.milk = 1e4; assert.equal(milkShare(infant, mother, P), 1, 'full glands: the full flow');
  M.milk = 0;
  const dry = milkShare(infant, mother, P), F = P.ledgerMilkKcalPerMin * 60;
  assert.ok(dry > 0 && dry < 0.2, `a dry gland gives the trickle of synthesis: ${dry.toFixed(3)} of ${F} kcal/h`);
  M.milk = 0.5 * F / 240; assert.ok(milkShare(infant, mother, P) > 0.5 && milkShare(infant, mother, P) < 1, 'half a tick of flow in store');
  mother.lactating = false; assert.equal(milkShare(infant, mother, P), 0);
});

test('plain-bug fixes: a shared piece leaves the giver; the forage cell loses only what the gut takes', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  const giver = adult(w, 'female'), o = w.chimps.find(c => c.alive && c.age > 1 && c.age < 5)!;
  const G = ledgerOf(giver, P), O = ledgerOf(o, P);
  eat(giver, P, 300, 'fallback');
  O.gut = 0; O.dm = 0; O.fib = 0;
  const g0 = G.in, o0 = O.in, gGut = G.gut, oGut = O.gut;
  const e = sharePlant(giver, o, P);
  assert.ok(e > 0 && e <= P.ledgerPlantShareKcal + 1e-9);
  assert.ok(Math.abs((g0 - G.in) - e) < 1e-9 && Math.abs((O.in - o0) - e) < 1e-9, 'the transfer is booked on both sides');
  assert.ok(Math.abs((gGut - G.gut) - (O.gut - oGut)) < 1e-9, 'the energy moved, it was not created');
  // a full gut refuses fallback food, and the cell keeps it
  const c = adult(w, 'male');
  eat(c, P, 1e6, 'fallback');
  const s0 = fallbackStock(w, c.position[0], c.position[2]);
  eatFallback(w, c, 0.25, g => eat(c, P, g, 'fallback'));
  assert.ok(Math.abs(fallbackStock(w, c.position[0], c.position[2]) - s0) < 1e-12, 'nothing eaten, nothing depleted');
});
