import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { energyTap, energyTick, growthPotential, ledgerOf, massOf, nurseBoutWorth, reserveCap } from '../src/sim/energy';
import { executeAction } from '../src/sim/execution';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix, TICK_HOURS } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { Chimp, World } from '../src/types';
import { worldHash } from './fixtures/golden';

// Stage E1f (docs/staging/e1f-prereg.md): one nursing rule (ledgerNurseBout) and growth potential from captive data paid
// from the day's surplus (ledgerGrowPotential). Off by default; these tests turn them on over the full stack.
const STACK: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseByMilk: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1 };
const ON: Overrides = { ...STACK, ledgerNurseBout: 1, ledgerGrowPotential: 1 };
const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
const gutEnergy = (L: { gut: number; fib?: number; hind?: number }, y: number) => L.gut + y * ((L.fib ?? 0) + (L.hind ?? 0));
const dyad = (w: World, lo: number, hi: number): [Chimp, Chimp] => {
  const i = w.chimps.find(c => c.alive && c.age > lo && c.age < hi && w.chimps.some(m => m.id === c.motherId && m.alive))!;
  return [i, w.chimps.find(m => m.id === i.motherId)!];
};

test('E1f switches off: the stack is unchanged (and without the ledger nothing is read)', () => {
  const a = createWorld(7, { profile: 'field', params: STACK }), b = createWorld(7, { profile: 'field', params: { ...STACK, ledgerNurseBout: 0, ledgerGrowPotential: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  assert.ok(a.chimps.every(c => ix(c).en?.mAvg === undefined), 'no growth books with the switch off');
  const c = createWorld(7), d = createWorld(7, { params: { ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerLetDownS: 30, ledgerGrowFemaleKgPerY: 5 } });
  run(c, DAY / 4); run(d, DAY / 4);
  assert.equal(worldHash(c), worldHash(d));
});

test('E1f: energy is conserved exactly for every individual, births included (field stack)', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w), Y = P.digestaFermentKcalPerG;
  run(w, 600);
  // a pregnancy at term: a newborn opens its books during the window
  const f = w.chimps.find(c => c.alive && c.pregnancy > 0);
  if (f) f.pregnancy = ix(f).gestation - 1e-3;
  const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
  run(w, DAY);
  let checked = 0, growing = 0;
  for (const c of w.chimps) {
    const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
    if (!b || !L) continue;
    const flow = (L.in - b.in) - (L.out - b.out) - ((L.fec ?? 0) - (b.fec ?? 0)), stock = (gutEnergy(L, Y) - gutEnergy(b, Y)) + (L.res - b.res);
    assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, Math.abs(L.in), L.out), `${c.name}: flow ${flow} vs stock ${stock}`);
    const adult = c.sex === 'female' ? P.ledgerMassFemaleKg : P.ledgerMassMaleKg;
    assert.ok(L.kg! >= b.kg! && L.kg! <= adult + 1e-9, 'mass never falls, never above adult');
    if (L.kg! < adult) { growing++; assert.ok(Number.isFinite(L.aAvg!) && Number.isFinite(L.mAvg!) && L.mAvg! > 0, 'growth books open below adult mass'); }
    else assert.equal(L.mAvg, undefined, 'no growth books at adult mass');
    checked++;
  }
  assert.ok(checked >= 40 && growing >= 8, `${checked} checked, ${growing} growing`);
  if (f) assert.ok(w.chimps.some(c => c.alive && c.motherId === f.id && c.age < 0.01 && ix(c).en?.kg !== undefined), 'the newborn has books');
});

test('E1f: determinism, and saves resume exactly', () => {
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
  run(off, 2900);
  assert.notEqual(worldHash(off), worldHash(a), 'the switches change the world');
});

test('E1f growth potential: captive rates, founders open on the potential curve, adult mass caps it', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  const [inf] = dyad(w, 1.5, 4), L = ledgerOf(inf, P);
  const v = inf.sex === 'female' ? 3.4 : 3.8;
  assert.equal(growthPotential(inf, P), v);
  assert.ok(Math.abs(L.kg! - (1.8 + 2.8 + v * (inf.age - 1))) < 1e-9, `founder at ${L.kg} kg, age ${inf.age}`);
  const young = { ...inf, age: 0.4 } as Chimp;
  assert.equal(growthPotential(young, P), 2.8);
  const oldF = w.chimps.find(c => c.alive && c.sex === 'female' && c.age > 9 && c.age < 12);
  if (oldF) assert.equal(massOf(oldF, P), P.ledgerMassFemaleKg, 'a female of 9+ y is at adult mass on the potential (8.9 y)');
});

test('E1f growth is paid from the day\'s surplus: none below maintenance, the potential at or above it, a fraction between', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  const [inf] = dyad(w, 1.5, 4), x = ix(inf), L = ledgerOf(inf, P);
  inf.action = 'rest';
  let grown = 0;
  energyTap.fn = (_c, term, kcal) => { if (term === 'growth') grown += kcal; };
  try {
    energyTick(w, inf, x, false); // opens the books
    const G = 1000 * P.ledgerGrowthKcalPerG / 365.25 / 24 * TICK_HOURS * growthPotential(inf, P); // kcal per tick at the potential
    const at = (surplus: number) => { L.mAvg = 20; L.aAvg = 20 + surplus * G / TICK_HOURS; const kg = L.kg!; grown = 0; energyTick(w, inf, x, false); return [L.kg! - kg, grown] as const; };
    const [k0, g0] = at(-1); assert.equal(k0, 0); assert.equal(g0, 0);
    const [k1, g1] = at(2);
    assert.ok(Math.abs(g1 - G) < 1e-9, `${g1} vs ${G}`);
    assert.ok(Math.abs(k1 - growthPotential(inf, P) / 24 / 365.25 * TICK_HOURS) < 1e-12);
    const [k2, g2] = at(0.4);
    assert.ok(Math.abs(g2 - 0.4 * G) < 1e-3 * G && Math.abs(k2 - 0.4 * k1) < 1e-3 * k1, 'a fraction of the potential');
    // the reserve level does not gate it (E1c's gate is replaced)
    L.res = -0.2 * reserveCap(inf, P); const [k3] = at(2); assert.ok(k3 > 0);
  } finally { energyTap.fn = null; }
});

test('E1f nursing: a bout is worth E / (E + rate × latency); a dry gland or a full gut is worth nothing', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  run(w, 4);
  const [inf, mom] = dyad(w, 1, 3), I = ix(inf).en!, M = ix(mom).en!;
  const F = P.ledgerMilkKcalPerMin * 60, y = P.ledgerMilkYieldCoef / 24 * massOf(mom, P) ** P.ledgerRmrExp;
  I.dm = 0; I.gut = 0; I.fib = 0;
  M.milk = 0; assert.equal(nurseBoutWorth(inf, mom, P), 0, 'dry gland');
  M.milk = 10;
  const E = 10 * F / (F - y);
  assert.ok(Math.abs(nurseBoutWorth(inf, mom, P) - E / (E + F * P.ledgerLetDownS / 3600)) < 1e-12);
  M.milk = 0.6; const small = nurseBoutWorth(inf, mom, P); M.milk = 60; const big = nurseBoutWorth(inf, mom, P);
  assert.ok(small < 0.3 && big > 0.9 && small < big, `${small} ${big}`);
  I.dm = 1e9; assert.equal(nurseBoutWorth(inf, mom, P), 0, 'full gut');
});

test('E1f nurse act: no milk for the milk-ejection latency, then the full flow; the bout ends when the flow fails', () => {
  const w = createWorld(48, { profile: 'field', params: ON }), P = paramsOf(w);
  run(w, 4);
  const [inf, mom] = dyad(w, 1.3, 3), x = ix(inf), I = ix(inf).en!, M = ix(mom).en!;
  inf.action = 'nurse'; inf.targetId = mom.id; x.phase = 1; x.prog = 0; x.finished = false;
  inf.position = [mom.position[0], mom.position[1], mom.position[2]];
  I.dm = 0; I.gut = 0; I.fib = 0; I.res = -0.2 * reserveCap(inf, P); inf.hunger = 0.9; M.milk = 50;
  const flow = P.ledgerMilkKcalPerMin / 4, drunk: number[] = [];
  energyTap.fn = (c, term, kcal) => { if (c === inf && term === 'suckled') drunk[drunk.length - 1] += kcal; };
  try {
    for (let i = 0; i < 6; i++) { drunk.push(0); inf.hunger = 0.9; executeAction(w, inf); }
  } finally { energyTap.fn = null; }
  const wait = P.ledgerLetDownS / 15; // ticks of 15 s
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, Math.max(0, i + 1 - wait));
    assert.ok(Math.abs(drunk[i] - k * flow) < 1e-9, `tick ${i + 1}: ${drunk[i]} vs ${k * flow}`);
  }
  assert.equal(x.finished, false);
  // the gland runs short: the bout ends and the next one waits for ejection again
  M.milk = 0.1; inf.hunger = 0.9; executeAction(w, inf);
  assert.equal(x.finished, true); assert.equal(x.prog, 0);
});
