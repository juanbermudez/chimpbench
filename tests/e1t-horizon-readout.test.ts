// Stage E1t (docs/staging/e1t-prereg.md §3): e-bench's feeding-horizon readout (--feed-horizon,
// scripts/lib/feed-horizon-probe.ts) never moves the world, and its own record of each animal's sleep is the mechanism's.
import assert from 'node:assert/strict';
import test from 'node:test';
import { runBenchSeed, type BenchJob, type BenchPart } from '../scripts/lib/bench-run';
import { mergeEnergy } from '../scripts/lib/energy-probe';
import { HUNGER_BINS, HZ_CLASSES } from '../scripts/lib/feed-horizon-probe';
import { decodeLossless, encodeLossless } from '../scripts/lib/lossless-json';
import { rulesTap } from '../src/sim/decide';

// the S39 stack (bench-run artifacts/validation/e/runs/M6-S39/params.json)
const S39 = { energyLedger: 1, ledgerGrowSurplus: 1, ledgerNightNurse: 1, ledgerInfantIntake: 1, ledgerNurseBout: 1, ledgerGrowPotential: 1, ledgerDigesta: 1,
  ledgerDrive: 1, rhythmSleep: 1, rhythmHeat: 1, endoStates: 1, endoEscalate: 1, endoRedirect: 1, endoFast: 1, endoRainDisplay: 1, ledgerFoodEnergyFix: 1,
  ledgerSatiationReserve: 1, ledgerLactGut: 1, callValue: 1, rhythmCircadian: 1, departRace: 1, nestLightDecide: 1, sleepChimp: 1, rhythmFreeNight: 1,
  nestCompany: 1, nestAudience: 1, darkCost: 1, preyKanyawara: 1, waterLedger: 1, followCarer: 1, cohesionValue: 1, companyMargin: 1, weanDecide: 1,
  weanDeficit: 1, growYield: 1, revisitByCrop: 1, groomDrive: 1, socialUpkeep: 2, followMargin: 1, huntValue: 1, forageRate: 1, contestAssess: 1,
  socialTiming: 15, patrolValue: 2, patrolFusion: 1, huntPursuit: 2, choiceBelief: 2, leftoverRules: 3, huntDrive: 1, crownMove: 1, walkGait: 1,
  departValue: 2, bodyRules: 1, aggressionGaps: 7, callGaps: 7, tripBeliefs: 3 };
// half a day of burn-in (to 18:30), then 2.6 days observed (to 08:54 three days later): three sleep onsets, so a day after
// the readout's first complete waking day resolves at the next onset
const job = (params: Record<string, number>, over: Partial<BenchJob> = {}): BenchJob => ({ seed: 48, profile: 'field', params, burnInDays: 0.5, days: 2.6, observerSeed: 1, experimentEveryDays: 30,
  truth: true, energy: true, rhythm: false, checkpointDays: [], stopDay: null, checkpointPrefix: null, resume: null, identity: { code: 'test' }, ...over });
const part = (r: ReturnType<typeof runBenchSeed>): BenchPart => { assert.equal(r.kind, 'part'); return (r as { part: BenchPart }).part; };

for (const lived of [0, 1] as const) {
  test(`feed-horizon readout (horizonLived ${lived}): the world is unchanged, decisions resolve at sleep onsets, the record is the mechanism's`, () => {
    const params = lived ? { ...S39, horizonLived: 1 } : S39;
    const on = part(runBenchSeed(job(params, { feedHorizon: true }))), off = part(runBenchSeed(job(params)));
    assert.equal(rulesTap.fn, null, 'the rules tap is removed at the end');
    // measurement only: the observed world and every other readout are the run without it
    assert.equal(on.field.hash, off.field.hash);
    assert.deepStrictEqual({ ...on.energy!, feedHorizon: undefined }, { ...off.energy!, feedHorizon: undefined });
    assert.equal(off.energy!.feedHorizon, undefined, 'off unless asked');
    assert.equal(off.config.feedHorizon, undefined);
    assert.equal(on.config.feedHorizon, true);
    const [r] = on.energy!.feedHorizon!;
    assert.equal(r.horizonLived, lived);
    assert.ok(r.day.n > 1000 && r.all.n >= r.day.n && r.day.unresolved > 0, `${r.day.n} daylight decisions resolved, ${r.day.unresolved} not`);
    assert.ok(r.day.within1 <= r.day.n && r.day.at1Left <= r.day.at1 && r.day.altN <= r.day.n && r.day.nestN <= r.day.n);
    assert.equal(r.dayByClass.reduce((s, c) => s + c.n, 0), r.day.n);
    assert.equal(r.byHour.reduce((s, h) => s + h[0], 0), r.day.n);
    assert.equal(r.day.err.reduce((a, b) => a + b, 0), r.day.n);
    // the hunger readout: every tick of every living animal with a ledger, by class and clock hour
    assert.equal(r.hunger.length, HZ_CLASSES.length);
    const ticks = r.hunger.flat().reduce((s, h) => s + h.reduce((a, b) => a + b, 0), 0);
    assert.ok(r.hunger.every(c => c.length === 24 && c.every(h => h.length === HUNGER_BINS)) && ticks > 40 * 2.6 * 5760, `${ticks} animal-ticks`);
    if (lived) {
      // the readout's own record of sleep onsets and wakings equals the one livedDay keeps in the world, every tick
      assert.equal(r.recordMismatch, 0);
      assert.equal(r.noAlt, 0, 'E1e\'s estimator is always available as the other one');
    } else assert.ok(r.noAlt > 0 && r.day.altN > 0, 'the lived-day estimator needs a first complete day');
    // the part's lossless JSON keeps the result, and pooling one seed keeps it
    const back = decodeLossless<BenchPart>(encodeLossless(on)).energy!;
    assert.deepStrictEqual(mergeEnergy([back]).feedHorizon, back.feedHorizon);
  });
}
