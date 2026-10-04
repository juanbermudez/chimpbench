// Track E (IMPLEMENTATION_PLAN.md "Track E: Emergence"): every stage ships behind switches that are 0 by default. The
// compressed golden fixture cannot see a leak into the field profile, so this pins the field world itself to main.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';

const TRACK_E_SWITCHES = [
  'energyLedger', 'ledgerGrowSurplus', 'ledgerNightNurse', 'ledgerInfantIntake', 'ledgerNurseByMilk', 'ledgerDigesta', 'ledgerDrive', // E1, E1c, E1d, E1b, E1e
  'rhythmSleep', 'rhythmHeat', 'rhythmFreeNight', // E2a
  'urgencyChoice', 'urgencyPersist', 'urgencySwitchCost', // E3
  'endoStates', 'endoEscalate', 'endoRedirect', 'endoRainDisplay', // E4a
  'endoFast', 'endoFastRedirect', // E4b
  'departRace', 'nurseWake', 'nestLightDecide', // E2b
  'ledgerNurseBout', 'ledgerGrowPotential', // E1f
  'darkCost', // E2c
  'rhythmCircadian', // E2d
  'nestAudience', 'nestCompany', // E2e
  'ledgerFoodEnergyFix', // E1h
  'callValue', // E4c
  'endoRhythm', // E4d
  'ledgerSatiationReserve', 'ledgerLactGut', // E1i
  'huntValue', // E4e
  'sleepChimp', // E2f
  'preyKanyawara', // E4f
  'groomNeedDyad', // E1k
  'waterLedger', // E2g
  'followCarer', // E4g
  'weanDecide', // E1n
  'milkInDrive', 'weanDeficit', // E1o
  'cohesionValue', // E5a
  'companyMargin', // E5b
  'crownShare', // E5c
  'revisitByCrop', // E3b
  'growYield', // E1p
  'groomDrive', 'socialUpkeep', 'followMargin', // E5d
  'forageRate', // E3c
  'contestAssess', // E4h
  'socialTiming', // E5e
  'patrolValue', // E4i
  'patrolFusion', // E4j
  'redecideValue', // E3d
  'huntPursuit', // E4k
  'choiceBelief', // E3e
  'leftoverRules', // E4m
  'walkGait', // E2i
  'tripBodyCost', 'youngArrival', // E2j
  'huntDrive', // E4n
  'crownMove', // E1q
  'departValue', // E5f
  'bodyRules', // E4o
  'aggressionGaps', // E4q
] as const;

test('Track E switches are all 0 by default in both profiles', () => {
  for (const profile of ['field', 'compressed'] as const) {
    const P = paramsOf(createWorld(5, { profile })) as unknown as Record<string, number>;
    for (const id of TRACK_E_SWITCHES) assert.equal(P[id], 0, `${id} (${profile})`);
  }
});

test('Track E switches off reproduce the field world of main (hash-identical, seeds 48 and 7, 12 h)', async () => {
  const { worldHash } = await import('./fixtures/golden');
  const run = (seed: number) => { const w = createWorld(seed, { profile: 'field' }); for (let i = 0; i < 2880; i++) tickWorld(w); return worldHash(w); };
  // recorded on main f24c9ae (a clean checkout), before any Track E stage was merged
  assert.equal(run(48), 'b263aac035d333ab');
  assert.equal(run(7), '2cadbff96ca7b534');
});
