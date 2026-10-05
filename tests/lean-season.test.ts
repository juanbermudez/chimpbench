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
