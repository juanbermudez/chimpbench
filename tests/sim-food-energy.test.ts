// Stage E1h (docs/staging/e1h-prereg.md): ledgerFoodEnergyFix, food energy from measured sugars instead of the field
// formula's TNC by difference. Off by default; 0 leaves every world as it was.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld, stepWorld, tickWorld } from '../src/simulation';
import { digestaCaps, eat, energyTap, fallbackKcalPerH, fruitKcalPerUnit, gutCap, ledgerOf, plantKcalPerMin } from '../src/sim/energy';
import { paramsOf, type Overrides } from '../src/sim/params';
import { ix } from '../src/sim/state';
import { plainDataProblems, worldShapeProblem } from '../src/persist/envelope';
import type { World } from '../src/types';
import { worldHash } from './fixtures/golden';

const DAY = 5760;
const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) tickWorld(w); };
/** The E1h reference stack (docs/staging/e1h-prereg.md §4, arm R). */
const R: Overrides = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1,
  rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1 };
const T: Overrides = { ...R, ledgerFoodEnergyFix: 1 };

test('ledgerFoodEnergyFix is 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) assert.equal(paramsOf(createWorld(5, { profile })).ledgerFoodEnergyFix, 0, profile);
});

test('the sugar-based values are the registered arithmetic on uwimbabazi2019 Table 2 (e1h-prereg §2)', () => {
  const P = paramsOf(createWorld(5));
  // ME per 100 g organic matter: 4 × carbohydrate + 4 × available protein + 9 × lipid + 1.6 × NDF; pectin 5% of dry matter = 5 ÷ 0.9615 % of organic matter
  const pect = 5 / (839 / 872.6), me = (cho: number, ap: number, lip: number, ndf: number) => 4 * cho + 4 * ap + 9 * lip + 1.6 * ndf;
  const factor = (lip: number, ap: number, ndf: number, tnc: number, wsc: number) => me(wsc + pect, ap, lip, ndf) / me(tnc, ap, lip, ndf);
  const drupe = 9.9 * factor(5.2, 10.6, 37.7, 46.6, 20.1), fig = 12.5 * factor(3.5, 6.8, 49.0, 40.7, 9.2);
  const fallback = (17.4 * 3.4 * factor(0.4, 7.5, 58.1, 33.9, 15.5) + 6.9 * 6.2 * factor(0.5, 25.9, 43.1, 30.5, 5.1)) / 24.3;
  assert.ok(Math.abs(P.ledgerFruitKcalPerMinSugar - drupe) < 0.01, `drupes ${drupe}`);
  assert.ok(Math.abs(P.ledgerFigKcalPerMinSugar - fig) < 0.01, `figs ${fig}`);
  assert.ok(Math.abs(P.ledgerFallbackKcalPerMinSugar - fallback) < 0.01, `fallback ${fallback}`);
});

test('the switch picks the food energy wherever it is read: fruit units, fallback per hour, digesta composition', () => {
  const off = paramsOf(createWorld(48, { profile: 'field', params: R })), on = paramsOf(createWorld(48, { profile: 'field', params: T }));
  assert.equal(plantKcalPerMin(off, 'drupe'), off.ledgerFruitKcalPerMin);
  assert.equal(plantKcalPerMin(off, 'fig'), off.ledgerFigKcalPerMin);
  assert.equal(plantKcalPerMin(off, 'fallback'), off.ledgerFallbackKcalPerMin);
  assert.equal(plantKcalPerMin(on, 'drupe'), on.ledgerFruitKcalPerMinSugar);
  assert.equal(plantKcalPerMin(on, 'fig'), on.ledgerFigKcalPerMinSugar);
  assert.equal(plantKcalPerMin(on, 'fallback'), on.ledgerFallbackKcalPerMinSugar);
  assert.equal(fruitKcalPerUnit(on, false), on.ledgerFruitKcalPerMinSugar * 60 / on.fruitIntakePerH);
  assert.equal(fruitKcalPerUnit(on, true), on.ledgerFigKcalPerMinSugar * 60 / on.fruitIntakePerH);
  assert.equal(fallbackKcalPerH(on), on.ledgerFallbackKcalPerMinSugar * 60);
  // the foregut holds the same dry matter, so fewer kcal of drupes: capacity in kcal scales with kcal per gram
  const w = createWorld(48, { profile: 'field', params: T }), c = w.chimps.find(a => a.alive && a.sex === 'female' && a.age >= 20)!;
  const [capF] = digestaCaps(c, on);
  assert.ok(Math.abs(gutCap(c, on) - capF * on.ledgerFruitKcalPerMinSugar / on.digestaDrupeDmGPerMin) < 1e-9);
  // eating fills the foregut by the measured dry matter per minute, whatever the energy: a minute of figs is 4.2 g
  const L = ledgerOf(c, on); L.dm = 0; L.fib = 0; L.gut = 0;
  const dm0 = L.dmIn!;
  eat(c, on, on.ledgerFigKcalPerMinSugar, 'fig');
  assert.ok(Math.abs(L.dmIn! - dm0 - on.digestaFigDmGPerMin) < 1e-9, 'one minute of figs brings its measured dry matter');
});

test('switch off: worlds are unchanged (key absent, 0, and 1 without the ledger)', () => {
  const a = createWorld(7, { profile: 'field', params: R }), b = createWorld(7, { profile: 'field', params: { ...R, ledgerFoodEnergyFix: 0 } });
  run(a, DAY / 4); run(b, DAY / 4);
  assert.equal(worldHash(a), worldHash(b));
  const c = createWorld(7, { profile: 'field' }), d = createWorld(7, { profile: 'field', params: { ledgerFoodEnergyFix: 1 } });
  run(c, DAY / 4); run(d, DAY / 4);
  assert.equal(worldHash(c), worldHash(d), 'not read without energyLedger');
  // and it does change the stack's world
  const e = createWorld(7, { profile: 'field', params: T });
  run(e, DAY / 4);
  assert.notEqual(worldHash(a), worldHash(e));
});

test('energy is conserved exactly with the fix on: in − out − passed out = Δgut + Δreserves for every individual over a day', () => {
  const w = createWorld(48, { profile: 'field', params: T }), P = paramsOf(w), Y = P.digestaFermentKcalPerG;
  const gutE = (L: { gut: number; fib?: number; hind?: number }) => L.gut + Y * ((L.fib ?? 0) + (L.hind ?? 0));
  run(w, 600);
  const before = new Map(w.chimps.filter(c => c.alive).map(c => [c.id, { ...ix(c).en! }]));
  let eatenPlant = 0;
  energyTap.fn = (_c, term, kcal, kind) => { if (term === 'eaten' && kind !== 'milk' && kind !== 'meat') eatenPlant += kcal; };
  try { run(w, DAY); } finally { energyTap.fn = null; }
  let checked = 0, fin = 0;
  for (const c of w.chimps) {
    const b = before.get(c.id), L = c.alive ? ix(c).en : undefined;
    if (!b || !L) continue;
    const flow = (L.in - b.in) - (L.out - b.out) - (L.fec! - b.fec!), stock = (gutE(L) - gutE(b)) + (L.res - b.res);
    assert.ok(Math.abs(flow - stock) < 1e-6 * Math.max(1, L.in, L.out), `${c.name}: flow ${flow} vs stock ${stock}`);
    fin += L.fin! - b.fin!; checked++;
  }
  assert.ok(checked >= 40, `${checked} individuals checked`);
  assert.ok(eatenPlant > 0 && eatenPlant <= fin + 1e-6, 'the eaten tap reports plant food within the formula energy eaten');
});

test('determinism with the fix on: the same seed gives the same world however ticks are batched, and the save is plain data', () => {
  const a = createWorld(48, { profile: 'field', params: T }), b = createWorld(48, { profile: 'field', params: T });
  // (field profile: compare stepWorld batches with each other; stepWorld does per-step work tickWorld alone does not)
  for (let i = 0; i < 1200; i++) stepWorld(a, 1);
  for (let i = 0; i < 1200 / 15; i++) stepWorld(b, 15);
  assert.equal(worldHash(a), worldHash(b));
  assert.deepEqual(plainDataProblems(a), []);
  assert.equal(worldShapeProblem(JSON.parse(JSON.stringify(a))), '');
});
