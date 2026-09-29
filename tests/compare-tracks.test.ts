import assert from 'node:assert/strict';
import test from 'node:test';
import { mulberry32 } from '../src/compare/sampling';
import { activityShares, byFollow, followPaths, hourProfile, levelsOf, profileDistance, scaleMatchedBandwidth, steps, territory, travelShareIn, TRAVEL, REST, FEED, type Act, type TrackPoint } from '../src/compare/tracks';
import { excelDate, records, sharedStrings, sheetRows } from '../src/compare/xlsx';

const pt = (follow: string, t: number, x: number, y: number, act: Act = TRAVEL, party = 3): TrackPoint => ({ follow, unit: 'u', group: 'g', sex: 'M', t, x, y, act, party });

test('a straight walk: equal 30-min steps, no turning, straightness 1, rate = speed', () => {
  const f = Array.from({ length: 21 }, (_, i) => pt('a', 7 + i * 0.5, i * 200, 0));
  const s = steps(byFollow(f));
  assert.equal(s.len.length, 20); assert.ok(s.len.every(v => Math.abs(v - 200) < 1e-9));
  assert.ok(s.turn.every(v => v < 1e-9) && s.turn.length === 19);
  const [p] = followPaths(byFollow(f));
  assert.equal(p.span, 10); assert.ok(Math.abs(p.rate - 400) < 1e-9); assert.ok(Math.abs(p.straightness - 1) < 1e-12);
});

test('reversals turn by π; gaps other than the interval break steps; short steps carry no heading', () => {
  const zig = [pt('z', 8, 0, 0), pt('z', 8.5, 100, 0), pt('z', 9, 0, 0), pt('z', 9.5, 100, 0)];
  const s = steps(byFollow(zig));
  assert.deepEqual(s.turn.map(v => +v.toFixed(6)), [+Math.PI.toFixed(6), +Math.PI.toFixed(6)]);
  const gap = [pt('g', 8, 0, 0), pt('g', 8.5, 100, 0), pt('g', 10, 200, 0), pt('g', 10.5, 300, 0)];
  assert.equal(steps(byFollow(gap)).len.length, 2, 'the 1.5 h gap is not a step');
  const still = [pt('s', 8, 0, 0), pt('s', 8.5, 5, 0), pt('s', 9, 100, 0), pt('s', 9.5, 200, 0)];
  assert.equal(steps(byFollow(still)).turn.length, 1, 'a 5 m step (below GPS/bin precision) gives no heading');
  assert.equal(followPaths(byFollow(gap), 2, 1).length, 0, 'a follow with a gap > 1 h is not a path');
});

test('activity shares, hourly travel profile and profile distance', () => {
  const pts = [pt('a', 7.2, 0, 0, TRAVEL), pt('a', 7.7, 0, 0, REST), pt('a', 8.2, 0, 0, FEED), pt('a', 8.7, 0, 0, FEED)];
  assert.deepEqual(activityShares(pts), [0.25, 0.25, 0.5]);
  const prof = hourProfile(pts, 7, 10, 1);
  assert.deepEqual(prof.slice(0, 2), [0.5, 0]); assert.ok(Number.isNaN(prof[2]));
  assert.equal(profileDistance([0.5, 0, NaN], [0.3, 0.2, 0.9]), 0.2);
});

test('territory levels: travel in the periphery vs the core; scale-matched bandwidth keeps h / r', () => {
  const r = mulberry32(9), pts: TrackPoint[] = [];
  for (let i = 0; i < 3000; i++) {
    const u = 1 - r(), v = r(), m = Math.sqrt(-2 * Math.log(u)), x = 1000 * m * Math.cos(2 * Math.PI * v), y = 1000 * m * Math.sin(2 * Math.PI * v);
    pts.push(pt(`f${i % 100}`, 7 + (i % 20) * 0.5, x, y, m > 2 ? TRAVEL : REST));
  }
  const t = territory(pts, 150), lv = levelsOf(pts, t);
  assert.ok(travelShareIn(pts, lv, 0.9, 1) > 0.5 && travelShareIn(pts, lv, 0, 0.5) === 0, 'travel only far from the centre');
  const k = 150 / t.shape.r;
  const scaled = pts.map(p => ({ ...p, x: p.x * 0.2, y: p.y * 0.2 }));
  const h = scaleMatchedBandwidth(scaled, k, 100);
  assert.ok(Math.abs(h - 30) / 30 < 0.05, `scale-matched h ${h.toFixed(1)} ≈ 150 × 0.2`);
});

test('xlsx reader: shared strings, sparse cells, Excel dates', () => {
  const ss = sharedStrings('<sst><si><t>name</t></si><si><t>value</t></si><si><t>A &amp; B</t></si></sst>');
  assert.deepEqual(ss, ['name', 'value', 'A & B']);
  const xml = '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>4.5</v></c></row></sheetData>';
  const rows = sheetRows(xml, ss);
  assert.deepEqual(rows, [['name', 'value'], ['A & B', null, 4.5]]);
  assert.deepEqual(records(rows), [{ name: 'A & B', value: null }]);
  assert.equal(excelDate(41609), '2013-12-01');
});

test('Taï S2 records: activity flags, duration per group-day, class O excluded; territory sheet header search', async () => {
  const { taiPoints, taiTerritories } = await import('../src/compare/tai');
  const rec = (day_group: string, daytime: number, duration: number, sex: string, rest: number, travel: number, feed: number) =>
    ({ daytime, duration, horde: 'East Group', date: 41609, target_sex: sex, kernel: 50, elevation: 200, party_size: 5, 'food.availability': 1, nb_oestrus: 0, 'binned.long': 1005, 'binned.lat': 2005, rest, travel, feed, day_group, day_nb: 1 });
  const { points, report } = taiPoints([rec('d_East Group_AAA_M', 7, 0.5, 'M', 1, 0, 0), rec('d_East Group_BBB_O', 7.5, 0.5, 'O', 0, 1, 0), rec('d_East Group_AAA_M', 8, 0.5, 'M', 0, 0, 1)]);
  assert.equal(report.durationMismatch, 0, 'duration counts from the previous record of the group-day, whichever follow it belongs to');
  assert.equal(report.excludedOther, 1);
  assert.deepEqual(points.map(p => [p.t, p.act, p.group, p.unit]), [[7, REST, 'East', 'East 2013'], [8, FEED, 'East', 'East 2013']]);
  const terr = taiTerritories([['title'], ['group', 'year', 'obs_time_hour', 'food_availability', 'territ_size', 'group_size', 'males12', 'mature_individuals'], ['N', 2014, 3242.8, 2, 10.85, 11.2, 3, 11.2]]);
  assert.deepEqual(terr, [{ group: 'N', year: 2014, obsHours: 3242.8, territoryKm2: 10.85, groupSize: 11.2, males12: 3, mature: 11.2 }]);
});
