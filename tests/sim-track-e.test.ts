// Track E (IMPLEMENTATION_PLAN.md "Track E: Emergence"): every stage ships behind switches that are 0 by default. The
// compressed golden fixture cannot see a leak into the field profile, so this pins the field world itself to main.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';

const TRACK_E_SWITCHES = [
  'energyLedger', 'ledgerGrowSurplus', 'ledgerNightNurse', 'ledgerInfantIntake', 'ledgerNurseByMilk', // E1, E1c, E1d
  'rhythmSleep', 'rhythmHeat', 'rhythmFreeNight', // E2a
  'urgencyChoice', 'urgencyPersist', 'urgencySwitchCost', // E3
  'endoStates', 'endoEscalate', 'endoRedirect', 'endoRainDisplay', // E4a
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
