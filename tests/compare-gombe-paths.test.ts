import assert from 'node:assert/strict';
import test from 'node:test';
import { communityRange, coreMCP, every30, femaleCores, gombeFollows, hullArea, pathStats } from '../src/compare/gombe-paths';

// Synthetic AllPoints / AlonePoints rows (no raw data): Excel date serials, 15-min sequence numbers, planar metres.
const HEAD = ['Follow Date', 'Sequence #', 'X Coordinate', 'Y Coordinate'];

test('follows split on sequence restarts; missing sequence numbers become time gaps', () => {
  const rows = [HEAD, [36529, 1, 0, 0], [36529, 2, 10, 0], [36529, 4, 30, 0], [36529, 1, 500, 500], [36529, 2, 500, 520], [36530, 1, 0, 0], [36530, 2, 0, 0]];
  const { follows, years, report } = gombeFollows(rows);
  assert.equal(follows.length, 3);
  assert.deepEqual(follows[0].map(p => p.t), [0, 0.25, 0.75], 't = (sequence − 1) / 4');
  assert.deepEqual(years, [2000, 2000, 2000]);
  assert.deepEqual(report, { rows: 7, dates: 2, follows: 3, datesWithSeveralFollows: 1, missingSequence: 1, years: [2000, 2000] });
  assert.throws(() => gombeFollows([['Date', 'Seq', 'X', 'Y']]), /unexpected header/);
  assert.throws(() => gombeFollows([HEAD, [36529, 1, 'a', 0]]), /non-numeric/);
});

test('every30 keeps every second record from the first', () => {
  const f = [[0, 0.25, 0.5, 0.75, 1].map(t => ({ follow: 'a', t, x: t, y: 0 }))];
  assert.deepEqual(every30(f)[0].map(p => p.t), [0, 0.5, 1]);
});

test('path statistics on a straight, steady walk: known steps, no turning, straightness 1', () => {
  // 9 h at 50 m per 15 min eastward, then normalized by r = 1000 m
  const f = [Array.from({ length: 37 }, (_, i) => ({ follow: 'a', t: i / 4, x: 50 * i, y: 0 }))];
  const s15 = pathStats(f, 0.25, 1000), s30 = pathStats(every30(f), 0.5, 1000);
  assert.equal(s15.stepM.length, 36);
  assert.ok(s15.stepM.every(v => v === 50) && s30.stepM.every(v => v === 100));
  assert.ok(s15.turn.every(v => v === 0));
  assert.deepEqual(s15.straight, [1]);
  assert.equal(s15.pathM[0], 1800);
  assert.equal(s15.pathR[0], 1.8);
  assert.equal(s15.rate[0], 200, 'm per hour');
  assert.equal(s30.netR[0], 1.8);
  assert.equal(s15.zeroShare, 0);
});

test('path statistics: zero steps, turning only between steps ≥ 15 m, short follows excluded from daily paths', () => {
  const pts = [[0, 0], [0, 0], [20, 0], [20, 20], [0, 20]].map(([x, y], i) => ({ follow: 'b', t: i / 4, x, y }));
  const s = pathStats([pts], 0.25, 100);
  assert.equal(s.zeroShare, 0.25);
  assert.deepEqual(s.turn.map(v => Math.round(v * 1000) / 1000), [1.571, 1.571], 'two right-angle turns');
  assert.equal(s.fullDays, 0, 'a 1-h follow is not a full day');
});

test('community range radius follows the spread of the records', () => {
  const ring = (R: number) => [Array.from({ length: 400 }, (_, i) => ({ follow: 'c', t: i / 4, x: R * Math.cos(i * 2.399) * Math.sqrt((i % 20) / 20), y: R * Math.sin(i * 2.399) * Math.sqrt((i % 20) / 20) }))];
  const a = communityRange(ring(1000), 0.05, 50), b = communityRange(ring(2000), 0.05, 100);
  assert.ok(a.r > 500 && a.r < 1500, `r ${a.r}`);
  assert.ok(Math.abs(b.r / a.r - 2) < 0.2, 'twice the spread, about twice the radius');
});

test('hull area and the 50% core by mean-centre peeling', () => {
  assert.equal(hullArea([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]), 1);
  assert.equal(hullArea([[0, 0], [1, 1]]), 0);
  const pts: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-10, -10], [10, -10], [10, 10], [-10, 10]];
  const c = coreMCP(pts, 0.5);
  assert.equal(c.kept, 4);
  assert.equal(c.area, 4, 'the inner square');
  assert.deepEqual([c.cx, c.cy], [0, 0]);
});

test('female cores keep only the rank class and normalize by the community range', () => {
  const rows: (string | number)[][] = [['ID', 'Date', 'X COORD', 'Y COORD']];
  for (let i = 0; i < 12; i++) { rows.push(['H1', 36529 + i, 100 + (i % 4) * 10, (i >> 2) * 10]); rows.push(['L2', 36529 + i, 500 + (i % 4) * 50, (i >> 2) * 50]); }
  rows.push(['M3', 36529, 0, 0]);
  const c = femaleCores(rows, { r: 1000, cx: 0, cy: 0 });
  assert.deepEqual(c.map(x => x.rank), ['H', 'L'], 'M3 has too few points; no identities kept');
  assert.ok(c[0].areaFrac < c[1].areaFrac);
  assert.ok(c[1].centreDistR > 0.5 && c[1].centreDistR < 0.7);
  assert.ok(!('id' in c[0]));
  assert.throws(() => femaleCores([['ID', 'Date', 'X COORD', 'Y COORD'], ['Z9', 1, 0, 0]], { r: 1, cx: 0, cy: 0 }), /bad row/);
});
