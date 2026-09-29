import assert from 'node:assert/strict';
import test from 'node:test';
import { dayOfYear, fieldClock, parseClusterCsv, parseGpsCsv, splitCsvLine, toFixes } from '../src/compare/ingest';
import { checkSampling, monthOfDoy, qualify, schedulesOf, simDayOf, simDoy, type Fix } from '../src/compare/sampling';
import { distanceVerdict, scalarVerdict } from '../src/compare/score';
import { bimodalityCoefficient, histogram, ks2, silhouette, wardTwo } from '../src/compare/stats';

test('two-sample KS statistic', () => {
  assert.equal(ks2([1, 2, 3], [1, 2, 3]), 0);
  assert.equal(ks2([1, 2, 3], [10, 11]), 1);
  assert.ok(Math.abs(ks2([1, 2, 3], [2, 3, 4]) - 1 / 3) < 1e-12);
});

test('bimodality coefficient as the notebook computes it (moments::kurtosis is Pearson, not excess)', () => {
  // x = ±1: skewness 0, Pearson kurtosis 1, correction 3·9/(2·1) = 13.5 → 1 / 14.5
  assert.ok(Math.abs(bimodalityCoefficient([-1, -1, 1, 1]) - 1 / 14.5) < 1e-12);
  const two = [...Array(40)].map((_, i) => (i < 20 ? 0.1 : 0.8) + (i % 5) * 0.01), one = [...Array(40)].map((_, i) => 0.4 + ((i * 7) % 40) * 0.005);
  assert.ok(bimodalityCoefficient(two) > bimodalityCoefficient(one), 'two clusters score higher than one');
});

test('Ward two-group cut and silhouette on a known split', () => {
  const pos = [0, 0.1, 0.2, 5, 5.1, 5.3, 0.15];
  const dist = pos.map(a => pos.map(b => Math.abs(a - b)));
  const lab = wardTwo(dist);
  assert.deepEqual(lab, [0, 0, 0, 1, 1, 1, 0], 'groups by position, label 0 holds item 0 (cutree order)');
  const sil = silhouette(dist, lab);
  assert.ok(sil.every(v => v > 0.9), 'well separated');
});

test('histogram densities integrate to the in-range share', () => {
  const h = histogram([0.1, 0.2, 0.6, 2], 0, 1, 2);
  assert.deepEqual(h.density, [1, 0.5]);
  assert.equal(h.outside, 0.25);
});

const fx = (ind: string, day: number, min: number, month: number, year = 2020): Fix => ({ ind, sex: 'M', year, month, doy: day, day, min, x: 0, y: 0 });

test('sampling rules: fixes per day, 3 h spacing, 08:00–17:59, 30 fixes over 4 months', () => {
  const good: Fix[] = [];
  for (let d = 0; d < 20; d++) { good.push(fx('A', d, 8 * 60, 1 + (d % 4))); good.push(fx('A', d, 12 * 60, 1 + (d % 4))); }
  const r = checkSampling(good);
  assert.equal(r.daysWith2, 20); assert.equal(r.pairsUnder3h, 0); assert.equal(r.outsideHours, 0); assert.equal(r.underQualified, 0);
  const bad = [...good, fx('A', 0, 10 * 60, 1), fx('B', 1, 18 * 60, 1)];
  const b = checkSampling(bad);
  assert.equal(b.daysWithMore, 1); assert.equal(b.pairsUnder3h, 2); assert.equal(b.outsideHours, 1); assert.equal(b.underQualified, 1);
  const q = qualify([...good, ...[...Array(40)].map((_, i) => fx('C', 100 + i, 9 * 60, 1 + (i % 3)))]);
  assert.equal(new Set(q.map(f => f.ind)).size, 1, 'C has 40 fixes but only 3 months');
  const sch = schedulesOf(good);
  assert.equal(sch.length, 1); assert.equal(sch[0].doy.length, 40);
});

test('simulated calendar: day-of-year mapping and months', () => {
  for (const start of [180, 365 + 180]) for (let doy = 1; doy <= 365; doy++) {
    const d = simDayOf(doy, start, 271);
    assert.ok(d >= start && d < start + 365);
    assert.equal(simDoy(d, 271), doy);
  }
  assert.equal(simDayOf(366, 0, 271), simDayOf(365, 0, 271), 'leap day maps to 31 Dec');
  assert.deepEqual([1, 31, 32, 59, 60, 334, 335, 365, 366].map(monthOfDoy), [1, 1, 2, 2, 3, 11, 12, 12, 12]);
  assert.equal(dayOfYear('2012-03-01'), 61, 'leap year');
});

test('archive parsing: field clock recovered from the "Z" timestamps, quoted member lists', () => {
  assert.deepEqual(fieldClock('2012-01-05T15:00:00Z'), { date: '2012-01-05', min: 9 * 60 }, 'January: UTC−6');
  assert.deepEqual(fieldClock('2012-07-05T15:45:00Z'), { date: '2012-07-05', min: 10 * 60 + 45 }, 'July: UTC−5');
  assert.deepEqual(splitCsvLine('1998,2,West,3,"A, B, C"'), ['1998', '2', 'West', '3', 'A, B, C']);
  const cl = parseClusterCsv('year,cluster,region_name,n_individuals,all_members\n2020,1,West,2,"Ax, By"\n');
  assert.deepEqual(cl, [{ year: 2020, cluster: 1, region: 'West', members: ['Ax', 'By'] }]);
  const csv = 'Individual,GPS_date,DateTime,Lat,Lon,n_obs_at_time,Sex,Year,Month,Age_at_sampling\nZed,2015-06-02,2015-06-02T19:30:00Z,0.5,30.4,1,F,2015,6,20.5\n';
  const { fixes, report } = toFixes(parseGpsCsv(csv));
  assert.equal(report.clockDateMismatch, 0);
  assert.equal(fixes[0].min, 14 * 60 + 30);
  assert.equal(fixes[0].doy, 153);
  assert.ok(fixes[0].x > 100000 && fixes[0].x < 500000, 'west of the zone 36 central meridian');
});

test('verdict rules', () => {
  assert.equal(scalarVerdict([1, 2, 3], [1.5, 2.5, 2, 2.2, 1.9], 2), 'similar');
  assert.equal(scalarVerdict([1, 2, 3], [5, 6, 7, 8, 9], 7), 'different');
  assert.equal(scalarVerdict([1, 2, 3], [2.5, 4, 5, 6, 7], 5), 'inconclusive');
  assert.equal(scalarVerdict([1, 2, 3], [2, 2], 2), 'inconclusive', 'fewer than 5 seeds');
  assert.equal(distanceVerdict(0.05, [0.04, 0.06], 5), 'similar');
  assert.equal(distanceVerdict(0.2, [0.04, 0.06], 5), 'different');
  assert.equal(distanceVerdict(0.1, [0.04, 0.06], 5), 'inconclusive');
});
