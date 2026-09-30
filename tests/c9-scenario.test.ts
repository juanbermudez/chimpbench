import assert from 'node:assert/strict';
import test from 'node:test';
import { enlargeWest, score, type JobResult } from '../scripts/c9-scenario';
import { isAdultMale } from '../src/sim/hierarchy';
import { index } from '../src/sim/state';
import { createWorld } from '../src/simulation';

// Stage C9: the large-community start and the pre-registered T-FIS scoring on a constructed result.

test('the large-community start clones West up to >= 60 members and >= 15 adult males, mothers with their young', () => {
  const w = createWorld(3505);
  enlargeWest(w, 60, 15);
  const west = index(w).alive.filter(c => c.troopId === 1);
  assert.ok(west.length >= 60, `${west.length}`);
  assert.ok(west.filter(isAdultMale).length >= 15);
  const ids = new Set(w.chimps.map(c => c.id));
  assert.equal(ids.size, w.chimps.length, 'fresh ids');
  for (const c of west) if (c.age < 10 && c.motherId > 0) { const m = w.chimps.find(x => x.id === c.motherId); if (m) assert.equal(m.troopId, 1); }
});

test('T-FIS scoring follows the pre-registered rules', () => {
  const Y = 24 * 365, M = Y / 12;
  const monthly: JobResult['monthly'] = [];
  for (let m = 0; m < 48; m++) monthly.push({ month: m, troopId: 1, Q: 0.1 + 0.1 * Math.floor(m / 12), overlap: m >= 30 ? 0.3 : 0.8, met: m >= 30 });
  const splitT = 42 * M;
  const large: JobResult = {
    seed: 1, kind: 'large', days: 365 * 10, monthly,
    splits: [{ t: splitT, month: 42, parent: 1, daughter: 4, onsetMonth: 30, parentMales: 16, sri: { '10-20': 0.6, '11-21': 0.1, '12-22': 0.3 }, sriMedian: 0.3 }],
    kills: [
      { t: splitT + Y, victim: 20, victimTroop: 4, attackers: [10, 13], attackerTroop: 1 },
      { t: splitT + 2 * Y, victim: 21, victimTroop: 4, attackers: [11], attackerTroop: 1 },
      { t: splitT + 3 * Y, victim: 22, victimTroop: 1, attackers: [12], attackerTroop: 4 },
    ],
    years: Array.from({ length: 10 }, (_, i) => ({ year: i + 1, members: { 1: 40, 4: 25 }, males: { 1: 20, 4: 10 }, patrols: { 1: 2, 4: 8 }, udOverlap: {} })),
    alphaChanges: { 1: [31 * M] }, communityYearsByMales: { '10-19': 10, '20-40': 10 }, fissionsByMales: { '10-19': 1 }, wallS: 0 };
  const baseline: JobResult = { ...large, kind: 'baseline', splits: [], kills: [], communityYearsByMales: { '<10': 30 }, fissionsByMales: {} };
  const off: JobResult = { ...large, kind: 'large-off', splits: [], kills: [{ t: Y, victim: 5, victimTroop: 2, attackers: [9], attackerTroop: 1 }] };
  const s = score([baseline, large, off]);
  assert.equal(s['T-FIS-1'].pass, true);
  assert.deepEqual(s['T-FIS-2'].leadYears, [2], 'yearly mean Q rose in the two years before the onset year');
  assert.deepEqual(s['T-FIS-2'].upheavalWithinOneYear, [1]);
  assert.ok(Math.abs(s['T-FIS-3'].postPerYear - 3 / ((10 * Y - splitT) / Y)) < 1e-9, 'window cut at the end of the run');
  assert.ok(Math.abs(s['T-FIS-3'].baselinePerPairYear - 1 / 30) < 1e-9);
  assert.equal(s['T-FIS-4'].victims, 3);
  assert.equal(s['T-FIS-4'].formerAssociates, 2, 'SRI 0.6 and 0.3 reach the median; 0.1 does not');
  assert.equal(s['T-FIS-5'].median, 8, '(8 per 10 males) / (1 per 10 males)');
});
