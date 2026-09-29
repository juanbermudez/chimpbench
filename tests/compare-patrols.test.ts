import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';
import {
  advanceByAdults, avgRanks, borderStops, brd1Band, csvRecords, dateProfile, excursionSummary, gombeExcursions, isoDate, logistic1, monthIndex, monthLabel,
  monthlyFruit, ngogoPatrols, ngogoSummary, patrolFruitBand, patrolMonths, percentile, postFission, readXlsx, seedOf, spearmanRho, stopDistancesR, unzip,
} from '../src/compare/patrols';
import { records } from '../src/compare/xlsx';

// ------------------------------------------------------------------ synthetic zip / xlsx fixture (no raw data)

const enc = new TextEncoder();
/** A minimal zip: local headers, data (stored or deflated), central directory, end record. */
function makeZip(entries: { name: string; text: string; deflate: boolean }[]): Uint8Array {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let off = 0;
  for (const e of entries) {
    const raw = Buffer.from(enc.encode(e.text)), data = e.deflate ? deflateRawSync(raw) : raw, name = Buffer.from(e.name, 'utf8'), crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(e.deflate ? 8 : 0, 8); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(e.deflate ? 8 : 0, 10); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, name, data); centrals.push(ch, name);
    off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

const WORKBOOK = '<workbook xmlns:r="x"><sheets><sheet name="data" sheetId="1" r:id="rId1"/><sheet name="Q &amp; A" sheetId="2" r:id="rId2"/></sheets></workbook>';
const RELS = '<Relationships><Relationship Id="rId2" Type="ws" Target="worksheets/sheet2.xml"/><Relationship Id="rId1" Type="ws" Target="/xl/worksheets/sheet1.xml"/></Relationships>';
const SHARED = '<sst><si><t>Patrol#</t></si><si><t>Male</t></si><si><r><t>Ba</t></r><r><t>sie</t></r></si></sst>';
const SHEET1 = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2"><v>7</v></c><c r="C2" t="s"><v>2</v></c></row></sheetData></worksheet>';
const SHEET2 = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>x &lt; y</t></is></c><c r="B1" t="b"><v>1</v></c></row></sheetData></worksheet>';
const inflate = (b: Uint8Array) => inflateRawSync(b);
const fixture = (deflate: boolean) => makeZip([
  { name: 'xl/workbook.xml', text: WORKBOOK, deflate }, { name: 'xl/_rels/workbook.xml.rels', text: RELS, deflate: false },
  { name: 'xl/sharedStrings.xml', text: SHARED, deflate }, { name: 'xl/worksheets/sheet1.xml', text: SHEET1, deflate }, { name: 'xl/worksheets/sheet2.xml', text: SHEET2, deflate },
]);

test('unzip reads stored and deflated entries through the central directory', () => {
  const z = unzip(fixture(true), inflate);
  assert.deepEqual([...z.keys()].sort(), ['xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
  assert.equal(new TextDecoder().decode(z.get('xl/worksheets/sheet2.xml')), SHEET2);
  assert.equal(new TextDecoder().decode(z.get('xl/_rels/workbook.xml.rels')), RELS, 'stored entry');
  assert.throws(() => unzip(enc.encode('not a zip at all, just some bytes'), inflate), /end of central directory/);
});

test('readXlsx resolves sheets by name through the workbook relationships', () => {
  for (const deflate of [false, true]) {
    const wb = readXlsx(fixture(deflate), inflate);
    assert.deepEqual(wb.names, ['data', 'Q & A']);
    assert.deepEqual(wb.sheet('data'), [['Patrol#', 'Male'], [7, null, 'Basie']], 'shared strings, rich-text runs joined, gaps filled with null');
    assert.deepEqual(records(wb.sheet('data')), [{ 'Patrol#': 7, Male: null }]);
    assert.deepEqual(wb.sheet('Q & A'), [['x < y', 1]], 'inline string decoded, boolean as 1');
    assert.throws(() => wb.sheet('nope'), /no sheet "nope"/);
  }
});

test('csvRecords handles a BOM, quotes and blank lines', () => {
  assert.deepEqual(csvRecords('﻿"","a","b"\n"1","x, y",2\n\n'), [{ '': '1', a: 'x, y', b: '2' }]);
});

// ------------------------------------------------------------------ statistics

test('average ranks and Spearman rho', () => {
  assert.deepEqual(avgRanks([10, 20, 20, 5]), [2, 3.5, 3.5, 1]);
  assert.equal(spearmanRho([1, 2, 3, 4], [10, 20, 30, 40]), 1);
  assert.equal(spearmanRho([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.ok(Math.abs(spearmanRho([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]) - 0.8) < 1e-12, '1 − 6·4 / (5·24) = 0.8');
  assert.ok(Number.isNaN(spearmanRho([1, 1, 1], [1, 2, 3])), 'constant side');
});

test('percentile interpolates between order statistics (R type 7)', () => {
  assert.equal(percentile([4, 1, 3, 2], 0.5), 2.5);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.05), 1.2);
  assert.equal(percentile([1, 2, 3, 4, 5], 1), 5);
  assert.ok(Number.isNaN(percentile([], 0.5)));
});

test('logistic1 recovers the slope from exact-proportion data, and flags separation', () => {
  const x: number[] = [], y: number[] = [];
  for (let v = 0; v < 10; v++) { const p = 1 / (1 + Math.exp(-(-1 + 0.3 * v))), n = 20000, k = Math.round(p * n); for (let i = 0; i < n; i++) { x.push(v); y.push(i < k ? 1 : 0); } }
  const f = logistic1(x, y);
  assert.ok(f.converged);
  assert.ok(Math.abs(f.b1 - 0.3) < 1e-3 && Math.abs(f.b0 + 1) < 1e-2, `b0 ${f.b0}, b1 ${f.b1}`);
  assert.equal(logistic1([1, 2, 3, 4], [0, 0, 1, 1]).converged, false, 'perfectly separated');
});

test('seeds and month helpers are deterministic', () => {
  assert.equal(seedOf('T-PAT-8'), seedOf('T-PAT-8'));
  assert.notEqual(seedOf('T-PAT-8'), seedOf('T-BRD-1'));
  assert.equal(monthIndex('1998-02-15'), 1998 * 12 + 1);
  assert.equal(monthLabel(1998 * 12 + 1), '1998-02');
  assert.equal(isoDate(42339), '2015-12-01');
  assert.equal(isoDate('1/18/2015'), '2015-01-18');
  assert.equal(isoDate('junk'), null);
});

// ------------------------------------------------------------------ T-PAT-8 band computation

test('patrol months join dates to the fruit series; zero months kept, months without fruit dropped', () => {
  const k0 = monthIndex('2000-01-01'), fruit = new Map([[k0, 10], [k0 + 1, 20], [k0 + 3, 40]]);
  const m = patrolMonths(['2000-01-05', '2000-01-20', '2000-04-02', '1999-06-01'], fruit, [k0, k0 + 3]);
  assert.deepEqual(m, [{ k: k0, patrols: 2, rfs: 10 }, { k: k0 + 1, patrols: 0, rfs: 20 }, { k: k0 + 3, patrols: 1, rfs: 40 }]);
});

test('T-PAT-8 band: perfect monotone months give rho 1 and a degenerate-free band; same seed, same band', () => {
  const months = Array.from({ length: 36 }, (_, i) => ({ k: 24000 + i, patrols: i, rfs: 100 + 3 * i }));
  const a = patrolFruitBand(months, 500, 7);
  assert.equal(a.rho, 1);
  assert.ok(a.lo > 0.99 && a.hi <= 1 + 1e-12);
  assert.equal(a.monthsWithoutPatrol, 1);
  assert.equal(a.monthsWithPatrol, 35);
  const noisy = months.map((m, i) => ({ ...m, patrols: (i * 7) % 5 }));
  const b = patrolFruitBand(noisy, 800, 11), c = patrolFruitBand(noisy, 800, 11), d = patrolFruitBand(noisy, 800, 12);
  assert.deepEqual(b, c, 'deterministic under a fixed seed');
  assert.notEqual(b.lo, d.lo, 'the seed matters');
  assert.ok(b.lo < b.rho && b.rho < b.hi, 'the point estimate sits inside its bootstrap band');
});

test('T-PAT-8 per-30-day rate only reorders tied counts by month length', () => {
  // Feb (28 d) and Mar (31 d) with the same count: per 30 days, Feb ranks higher; as counts they tie.
  const k = 2001 * 12 + 1;
  const months = [{ k, patrols: 1, rfs: 5 }, { k: k + 1, patrols: 1, rfs: 1 }, { k: k + 2, patrols: 0, rfs: 3 }];
  const r = patrolFruitBand(months, 50, 1);
  assert.notEqual(r.rho, r.rhoPer30Days);
});

// ------------------------------------------------------------------ T-BRD-1 band computation

const stopRow = (group: string, day: number, adults: number, advance: 0 | 1) => ({ group, new_date: day, 'adult party size': adults, 'approach rivals': advance, 'distance to centre': 1000 * adults, 'distance to rivals': 500, 'time spent': 10, location_ID: 'hill1' });

test('border stops: validation and cluster keys from mixed date formats', () => {
  const s = borderStops([stopRow('S', 42339, 3, 1), { ...stopRow('S', 0, 5, 0), new_date: '12/1/2015' }]);
  assert.equal(s[0].cluster, s[1].cluster, 'serial and M/D/YYYY of the same day share a cluster');
  assert.throws(() => borderStops([{ ...stopRow('E', 42339, 3, 1), 'approach rivals': 2 }]), /malformed/);
});

test('T-BRD-1: share, positive slope on adults, cluster bootstrap over group-days, determinism', () => {
  const rows: Record<string, number | string>[] = [];
  for (let d = 0; d < 60; d++) for (let a = 1; a <= 12; a++) rows.push(stopRow(d % 2 ? 'S' : 'E', 42000 + d, a, ((a * 7 + d) % 12) < a ? 1 : 0));
  const stops = borderStops(rows), b = brd1Band(stops, 400, 3);
  assert.equal(b.stops, 720);
  assert.equal(b.groupDays, 60);
  assert.equal(b.share, stops.filter(s => s.advance).length / 720);
  assert.ok(b.slope > 0.2, `advance rises with adults (slope ${b.slope})`);
  assert.ok(b.slopeLo < b.slope && b.slope < b.slopeHi && b.shareLo < b.share && b.share < b.shareHi);
  assert.deepEqual(brd1Band(stops, 400, 3), b, 'deterministic');
  const bins = advanceByAdults(stops, [[0, 6], [6, Infinity]]);
  assert.equal(bins[0].n + bins[1].n, 720);
  assert.ok(bins[1].advance! > bins[0].advance!);
  const where = stopDistancesR(stops, () => 4000, 0, 4, 4);
  assert.equal(where.fromCentre.median, 1.625, 'adults × 1000 m ÷ 4000 m, median of 0.25 … 3');
});

// ------------------------------------------------------------------ patrol summaries

const kkRow = (id: number, serial: number, male: string, part: 0 | 1) => ({ 'Patrol#': id, 'Date (M/D/Y)': serial, Male: male, 'Patrol participation (0 = No, 1 = Yes)': part });

test('Ngogo patrols: one date per patrol, per-male opportunities, summary without names', () => {
  const recs = [kkRow(1, 36526, 'A', 1), kkRow(1, 36526, 'B', 0), kkRow(2, 36900, 'A', 1), kkRow(2, 36900, 'B', 1), kkRow(3, 36910, 'A', 0), kkRow(3, 36910, 'B', 1)];
  const d = ngogoPatrols(recs);
  assert.deepEqual(d.patrols.map(p => [p.id, p.date, p.listed, p.joined]), [[1, '2000-01-01', 2, 1], [2, '2001-01-09', 2, 2], [3, '2001-01-19', 2, 1]]);
  const s = ngogoSummary(d, 70);
  assert.equal(s.perObservedWeek, 0.3);
  assert.equal(s.participation.meanAllMales, 0.6667, 'mean of 2/3 and 2/3, rounded to 4 places');
  assert.deepEqual(s.perYear, [{ year: 2000, n: 1 }, { year: 2001, n: 2 }]);
  assert.ok(!JSON.stringify(s).includes('"A"'), 'no male names in the summary');
  assert.throws(() => ngogoPatrols([kkRow(1, 36526, 'A', 1), kkRow(1, 36527, 'B', 1)]), /two dates/);
});

test('date profile counts months and long gaps', () => {
  const p = dateProfile(['2000-06-01', '2000-07-01', '2001-07-02', '2000-01-10']);
  assert.equal(p.byMonth[5] + p.byMonth[6], 3);
  assert.equal(p.junJulShare, 0.75);
  assert.equal(p.gapsOver250Days, 1);
  assert.equal(p.first, '2000-01');
});

test('Gombe excursions: patrols vs periphery visits with zero years', () => {
  const row = (serial: number, type: string, minutes: number, males: number, females: number) => ({ DATE: serial, Type: type, Total_Minutes: minutes, Total_Individuals: males + females, Males: males, Females: females, Swollen_Females: 0, Feeding_Minutes_per_hour: 6 });
  const ex = gombeExcursions([row(29221, 'Patrol', 90, 8, 2), row(29600, 'Periph', 60, 5, 0), row(30000, 'Patrol', 120, 6, 0)]);
  const s = excursionSummary(ex, [1980, 1983]);
  assert.deepEqual(s.patrol.perYear, [1, 0, 1, 0]);
  assert.equal(s.patrol.minutes.median, 105);
  assert.equal(s.patrol.withFemales, 0.5);
  assert.equal(s.patrolShareOfExcursions, 0.6667);
  assert.throws(() => gombeExcursions([row(29221, 'Hunt', 1, 1, 1)]), /unknown type/);
});

test('post-fission patrols per group and per 10 males', () => {
  const quarterly = csvRecords(['Year,Quarter,Group,Count', ...['Q1', 'Q2', 'Q3', 'Q4'].flatMap(q => [`2018,${q},Western,3`, `2018,${q},Central,1`])].join('\n'));
  const pop = csvRecords(['community,age_class,sex,count,year', 'West,adult,M,8,2018', 'West,l_adolescent,M,2,2018', 'Central,adult,M,20,2018', 'Central,adult,F,30,2018'].join('\n'));
  const f = postFission(quarterly, pop);
  assert.deepEqual(f.perYear[0], { year: 2018, quarters: 4, west: 12, central: 4, westMales: 10, centralMales: 20, ngogoMales: null, westPer10Males: 12, centralPer10Males: 2 });
  assert.deepEqual(f.split.years, [2018, 2018]);
});

test('monthly fruit keeps finite ripe fruit scores only', () => {
  const m = monthlyFruit(csvRecords('year,NumericMonth,RFS\n1998,2,106.5\n1998,3,NA\n1998,13,5'));
  assert.deepEqual([...m], [[1998 * 12 + 1, 106.5]]);
});
