// Stage E1r (docs/staging/e1r-prereg.md): the per-animal daily records of e-bench's energy readout (--animal-days,
// scripts/lib/energy-probe.ts ANIMAL_DAY_FIELDS) never move the world and add up to the class readout they refine.
import assert from 'node:assert/strict';
import test from 'node:test';
import { runBenchSeed, type BenchJob, type BenchPart } from '../scripts/lib/bench-run';
import { AD, ANIMAL_DAY_FIELDS, mergeEnergy } from '../scripts/lib/energy-probe';
import { decodeLossless, encodeLossless } from '../scripts/lib/lossless-json';

// the ledger stack the readout is meant for (S31's switches; E1r runs S31 and S39 on seed 48)
const STACK = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1, ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1,
  endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1, ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, waterLedger: 1,
  weanDecide: 1, weanDeficit: 1, growYield: 1, revisitByCrop: 1, forageRate: 1, choiceBelief: 2, walkGait: 1, crownMove: 1 };
// half a day of burn-in, then a day and a quarter observed: one whole window day and a partial one
const job = (over: Partial<BenchJob> = {}): BenchJob => ({ seed: 48, profile: 'field', params: STACK, burnInDays: 0.5, days: 1.25, observerSeed: 1, experimentEveryDays: 30, truth: true,
  energy: true, rhythm: false, checkpointDays: [], stopDay: null, checkpointPrefix: null, resume: null, identity: { code: 'test' }, ...over });
const part = (r: ReturnType<typeof runBenchSeed>): BenchPart => { assert.equal(r.kind, 'part'); return (r as { part: BenchPart }).part; };
const TERMS = ['oRest', 'oActivity', 'oWild', 'oWalk', 'oClimb', 'oCarry', 'oPregnancy', 'oGrowth', 'oMilk', 'oDigestion'] as const;

test('animal-day records: the world is unchanged, one row per animal and day, sums match the class readout', () => {
  const on = part(runBenchSeed(job({ animalDays: true }))), off = part(runBenchSeed(job()));
  // measurement only: the observed world and every other readout are the run without it
  assert.equal(on.field.hash, off.field.hash);
  assert.deepStrictEqual({ ...on.energy!, animalDays: undefined }, { ...off.energy!, animalDays: undefined });
  assert.equal(off.energy!.animalDays, undefined, 'off unless asked');
  assert.equal(off.config.animalDays, undefined);
  assert.equal(on.config.animalDays, true);
  const rows = on.energy!.animalDays!;
  assert.ok(rows.every(r => r.length === ANIMAL_DAY_FIELDS.length));
  const days = [...new Set(rows.map(r => r[AD.day]))].sort();
  assert.deepEqual(days, [0, 1]);
  const living = rows.filter(r => r[AD.day] === 0).length;
  assert.ok(living > 30 && rows.filter(r => r[AD.day] === 1).length === living, 'every living animal has a row each day (no deaths in the window)');
  assert.ok(rows.filter(r => r[AD.day] === 0).every(r => r[AD.ticks] === 5760) && rows.filter(r => r[AD.day] === 1).every(r => r[AD.ticks] === 1440), 'a whole day and the partial last one');
  // the rows of animals in the class readout's classes (it leaves out 12–15 y) add up to its sums (classes are refreshed
  // every 240 ticks, the rows every tick: an animal crossing a class boundary makes the last small difference)
  const acc = Object.entries(on.energy!.acc).filter(([k]) => !k.startsWith('lact:')).map(([, v]) => v);
  const inClasses = rows.filter(r => r[AD.age] < 12 || r[AD.age] >= 15);
  const sum = (f: (r: number[]) => number) => inClasses.reduce((s, r) => s + f(r), 0);
  const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1e-3 * Math.abs(b), `${what}: rows ${a} against classes ${b}`);
  close(sum(r => r[AD.kin]), acc.reduce((s, a) => s + a.kin, 0), 'energy in');
  close(sum(r => TERMS.reduce((s, k) => s + r[AD[k]], 0)), acc.reduce((s, a) => s + Object.values(a.out).reduce((t, x) => t + x, 0), 0), 'energy spent');
  close(sum(r => r[AD.fec]), acc.reduce((s, a) => s + a.fec, 0), 'passed out');
  close(sum(r => r[AD.dm]), acc.reduce((s, a) => s + a.dmIn, 0), 'dry matter');
  // food by kind adds up to the formula energy eaten; acts add up to daylight; eating at a full gut is part of eating
  for (const r of rows) {
    assert.ok(Math.abs(r[AD.eDrupe] + r[AD.eFig] + r[AD.eFallback] + r[AD.eMeat] + r[AD.eMilk] + r[AD.eShared] - r[AD.fin]) < 1e-6);
    assert.equal(r[AD.aCrown] + r[AD.aToTree] + r[AD.aGround] + r[AD.aTravel] + r[AD.aRest] + r[AD.aSocial] + r[AD.aNurse] + r[AD.aDrink] + r[AD.aOther], r[AD.dayTicks]);
    assert.ok(r[AD.tEatFull] <= r[AD.tEat] && r[AD.fullDay] <= r[AD.dayTicks] && r[AD.feedCharged] <= r[AD.charged]);
    assert.ok(r[AD.res] < r[AD.store] && r[AD.store] > 0 && r[AD.kg] > 0);
  }
  assert.ok(rows.some(r => r[AD.tFallback] > 0) && rows.some(r => r[AD.tDrupe] + r[AD.tFig] > 0) && rows.some(r => r[AD.eMilk] > 0), 'fruit, fallback and milk are seen');
  // the part's lossless JSON keeps the rows, and pooling one seed keeps them in order
  const back = decodeLossless<BenchPart>(encodeLossless(on)).energy!;
  assert.deepStrictEqual(mergeEnergy([back]).animalDays, back.animalDays);
});

// ---------------------------------------------------------------------------------------------------------------------
// scripts/lib/lean-season.ts on synthetic parts (no simulation)
// ---------------------------------------------------------------------------------------------------------------------
import { AD as ADF } from '../scripts/lib/energy-probe';
import { animalPool, animalSpan, dailyMonthly, deathsInRows, monthOfDay, monthOrder, rowClass, rowMonthly, yearByClass } from '../scripts/lib/lean-season';
import { newEnergyAcc } from '../scripts/lib/energy-probe';

test('calendar: a 30-day burn-in from 28 September puts window day 0 on 28 October and day 4 in November', () => {
  assert.equal(monthOfDay(0, 30, 271), 9);
  assert.equal(monthOfDay(3, 30, 271), 9);
  assert.equal(monthOfDay(4, 30, 271), 10);
  assert.equal(monthOfDay(65, 30, 271), 0); // 1 January
  assert.equal(monthOfDay(364, 30, 271), 9); // 27 October of the next year
  assert.deepEqual(monthOrder(365, 30, 271), [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('class readout by month: sums per animal-day, net = absorbed − spent, reserves from the seeds\' trajectories', () => {
  const a = newEnergyAcc(), b = newEnergyAcc();
  // two seeds; juveniles: day 4 (November) and day 65 (January)
  const day = (k: number) => ({ ticks: 5760 * k, dayTicks: 2880 * k, eating: 1200 * k, kin: 1500 * k, fec: 400 * k, out: 1200 * k, dm: 600 * k, hunger: 0.3 * 2880 * k, foreFull: 288 * k });
  a.daily['juvenile 5–12 y'] = []; a.daily['juvenile 5–12 y'][4] = day(2); a.daily['juvenile 5–12 y'][65] = day(1);
  b.daily['juvenile 5–12 y'] = []; b.daily['juvenile 5–12 y'][4] = day(1);
  a.trajSeeds.push({ 'juvenile 5–12 y': Object.assign([], { 4: -0.1, 65: -0.3 }) }); b.trajSeeds.push({ 'juvenile 5–12 y': Object.assign([], { 4: -0.2 }) });
  a.acc['juvenile 5–12 y'].m75 = 10 * 5760 * 3; a.acc['juvenile 5–12 y'].ticks = 5760 * 3;
  const t = dailyMonthly([a, b], 30, 271), nov = t['juvenile 5–12 y'][10], jan = t['juvenile 5–12 y'][0];
  assert.equal(nov.n, 3);
  assert.equal(nov.eatMin, 300); // 1,200 ticks a day × 15 s
  assert.equal(nov.kin, 1500); assert.equal(nov.absorbed, 1100); assert.equal(nov.net, -100);
  assert.equal(nov.kinPerKg75, 150);
  assert.ok(Math.abs(nov.reserve! - -0.15) < 1e-12, 'the mean of the two seeds\' daily class means');
  assert.equal(jan.n, 1); assert.ok(Math.abs(jan.reserve! - -0.3) < 1e-12);
  assert.ok(Math.abs(nov.foreFull - 0.1) < 1e-12 && Math.abs(nov.hunger - 0.3) < 1e-12);
  // the window by class
  a.acc['juvenile 5–12 y'].out.walk = 90; a.acc['juvenile 5–12 y'].kin = 1500 * 3; // window sums over 3 animal-days
  const y = yearByClass([a]);
  assert.equal(y['juvenile 5–12 y'].n, 3); assert.equal(y['juvenile 5–12 y'].terms.walk, 30); assert.equal(y['juvenile 5–12 y'].kin, 1500); assert.equal(y['juvenile 5–12 y'].m75, 10);
});

test('per-animal rows: classes, monthly cells, an animal\'s last days and its death', () => {
  const row = (o: Partial<Record<keyof typeof ADF, number | null>>): (number | null)[] => { const r = new Array(Object.keys(ADF).length).fill(0) as (number | null)[]; for (const [k, v] of Object.entries(o)) r[ADF[k as keyof typeof ADF]] = v; return r; };
  const base = { ticks: 5760, dayTicks: 2880, kin: 1300, fec: 300, oRest: 800, oWalk: 100, oGrowth: 20, tDrupe: 400, tFallback: 800, tEat: 1200, tEatFull: 600, eDrupe: 700, eFallback: 300, fin: 1000,
    aCrown: 400, aGround: 800, aTravel: 400, aRest: 1280, hunger: 0.4 * 2880, fill: 0.8 * 2880, fullDay: 1440, party: 4 * 2880, charged: 2, feedCharged: 1, kg: 20, store: 26000 };
  const rows = [
    row({ ...base, day: 4, id: 7, female: 1, age: 6, res: -2600, motherRes: -0.2 }),
    row({ ...base, day: 5, id: 7, female: 1, age: 6, res: -5200, motherRes: -0.3 }),
    row({ ...base, day: 6, id: 7, female: 1, age: 6, res: -26000, dead: 1, motherRes: null, ticks: 2880, dayTicks: 1440, aCrown: 200, aGround: 400, aTravel: 200, aRest: 640 }),
    row({ ...base, day: 4, id: 8, female: 0, age: 13, res: 0, store: 50000 }),
    row({ ...base, day: 4, id: 9, female: 1, age: 20, pregnancy: 100, res: 0, store: 40000 }),
  ];
  assert.equal(rowClass(rows[0]), 'juvenile 5–12 y F');
  assert.equal(rowClass(rows[3]), 'adolescent 12–15 y M');
  assert.equal(rowClass(rows[4]), 'female, pregnant');
  const t = rowMonthly(rows, 30, 271), c = t['juvenile 5–12 y F'][10];
  assert.equal(c.n, 2.5);
  assert.equal(c.eatMin, 3 * 1200 / 4 / 2.5 - (600 * 0) / 2.5); // every row eats 1,200 ticks
  assert.equal(c.eatFullShare, 0.5);
  assert.equal(c.absorbed, 3 * 1000 / 2.5); assert.equal(c.out, 3 * 920 / 2.5); assert.equal(c.net, 3 * 80 / 2.5);
  assert.ok(Math.abs(c.plantShare.drupe - 0.7) < 1e-12 && Math.abs(c.fallbackTimeShare - 2 / 3) < 1e-12);
  assert.ok(Math.abs(c.ownPerEatMin - 1000 / 300) < 1e-12);
  assert.ok(Math.abs(c.acts.ground - 2000 / 7200) < 1e-12 && Math.abs(c.party - 4 * 2880 * 3 / 7200) < 1e-12);
  assert.ok(Math.abs(c.reserve! - (-0.1 - 0.2 - 1) / 3) < 1e-12, 'mean of the rows\' reserves ÷ store');
  assert.ok(Math.abs(c.motherReserve! - -0.25) < 1e-12, 'a missing mother is left out');
  assert.deepEqual(deathsInRows(rows), [{ id: 7, day: 6, cls: 'juvenile 5–12 y F' }]);
  const span = animalSpan(rows, 7, 5, 6);
  assert.deepEqual(span.map(s => s.day), [5, 6]);
  assert.equal(span[1].dead, true);
  assert.equal(animalPool(rows, 7, 4, 6)!.n, 2.5);
  assert.equal(animalPool(rows, 7, 10, 20), null);
});
