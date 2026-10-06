import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { countedAs, dayPaths, domainOf, monthlyMedian, normalizePath, parseBand, pickByQuantile, shortCite, siteCalendar } from '../scripts/guide-data';

// Pure helpers of scripts/guide-data.ts on synthetic inputs (no raw data), then privacy and consistency checks on the
// committed docs/data/guide-*.json files.

test('site calendar: years × months matrices, missing months null, first and last month', () => {
  const recs = [
    { year: '1998', NumericMonth: '2', RFS: '106.7', 'Proportion.of.trees.w.fruit': '0.026', rainfall: '68.2' },
    { year: '1998', NumericMonth: '3', RFS: '15.3', 'Proportion.of.trees.w.fruit': '0.026', rainfall: '176.5' },
    { year: '1999', NumericMonth: '1', RFS: 'NA', 'Proportion.of.trees.w.fruit': '0.01', rainfall: '40' },
  ];
  const c = siteCalendar(recs);
  assert.deepEqual(c.years, [1998, 1999]);
  assert.equal(c.first, '1998-02'); assert.equal(c.last, '1999-01');
  assert.equal(c.rfs[0][0], null, 'January 1998 is not in the file');
  assert.equal(c.rfs[0][1], 107); assert.equal(c.rain[0][2], 176.5); assert.equal(c.rfs[1][0], null, 'NA stays missing');
  assert.equal(c.share[1][0], 0.01);
  assert.throws(() => siteCalendar([]), /no monthly rows/);
});

test('monthly median skips missing values', () => {
  const m = monthlyMedian([[1, null, ...new Array(10).fill(0)], [3, 5, ...new Array(10).fill(0)], [2, null, ...new Array(10).fill(0)]]);
  assert.equal(m[0], 2); assert.equal(m[1], 5);
});

test('normalizePath: starts at the origin, net move points up, 0.1 r lattice, repeats dropped', () => {
  // 1 km east in 100 m steps, r = 1 km → 10 lattice steps straight up after rotation
  const pts = Array.from({ length: 11 }, (_, i) => ({ x: 5e5 + 100 * i, y: 9.8e6 }));
  const p = normalizePath(pts, 1000);
  assert.deepEqual(p[0], [0, 0]);
  assert.deepEqual(p[p.length - 1], [0, 10]);
  assert.ok(p.every(([u]) => u === 0), 'a straight walk stays on the axis');
  // sub-cell jitter collapses onto one lattice point
  const q = normalizePath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 0, y: 300 }], 1000);
  assert.deepEqual(q, [[0, 0], [0, 3]]);
  assert.deepEqual(normalizePath([{ x: 1, y: 1 }], 1000), []);
});

test('normalizePath never leaks absolute position or orientation', () => {
  const walk = [{ x: 0, y: 0 }, { x: 300, y: 400 }, { x: 900, y: 100 }];
  const shifted = walk.map(p => ({ x: p.x + 712345, y: p.y + 9876543 }));
  const turned = walk.map(p => ({ x: -p.y, y: p.x }));  // the same walk rotated by 90°
  assert.deepEqual(normalizePath(shifted, 1000), normalizePath(walk, 1000));
  assert.deepEqual(normalizePath(turned, 1000), normalizePath(walk, 1000));
});

test('dayPaths keeps only full days and reports straightness from the unsnapped records', () => {
  const day = (gapAt = -1) => Array.from({ length: 19 }, (_, i) => ({ t: 7 + i * 0.5 + (i > gapAt && gapAt >= 0 ? 1 : 0), x: i % 2 ? 100 : 0, y: 0 }));
  const straight = Array.from({ length: 19 }, (_, i) => ({ t: 7 + i * 0.5, x: 100 * i, y: 0 }));
  const d = dayPaths([straight, day(), day(5), straight.slice(0, 10)], 1000);
  assert.equal(d.length, 2, 'the gapped day and the short day are dropped');
  assert.equal(d[0].straight, 1);
  assert.ok(Math.abs(d[0].pathR - 1.8) < 1e-9);
  assert.equal(d[1].straight, 0, 'back and forth ends where it started');
});

test('pickByQuantile spreads picks over the ranks', () => {
  const v = Array.from({ length: 120 }, (_, i) => i);
  assert.deepEqual(pickByQuantile(v, x => x, 6), [10, 30, 50, 70, 90, 110]);
  assert.deepEqual(pickByQuantile([3, 1], x => x, 6), [1, 3]);
});

test('countedAs mirrors the scorecard summary rules', () => {
  assert.equal(countedAs({ verdict: 'pass', flags: [], encoded: false }), 'pass');
  assert.equal(countedAs({ verdict: 'pass', flags: ['tuned'], encoded: false }), 'tuned');
  assert.equal(countedAs({ verdict: 'fail', flags: ['tuned'], encoded: false }), 'fail');
  assert.equal(countedAs({ verdict: 'fail', flags: [], encoded: true }), 'encoded');
  assert.equal(countedAs({ verdict: 'insufficient', flags: [], encoded: true }), 'insufficient');
  assert.equal(countedAs({ verdict: 'pass', flags: ['compromised'], encoded: true }), 'compromised');
  assert.equal(countedAs({ verdict: 'fail', flags: ['not scorable'], encoded: false }), 'unscorable');
});

test('band parsing, domains and short citations', () => {
  assert.deepEqual(parseBand('0.33–0.5'), { lo: 0.33, hi: 0.5 });
  assert.deepEqual(parseBand('-0.057–0.17'), { lo: -0.057, hi: 0.17 });
  assert.equal(parseBand('as reported'), null);
  assert.equal(parseBand('female 31–39, male 18–24'), null);
  assert.equal(domainOf('T-FOOD-3'), 'Food'); assert.equal(domainOf('T-BRD-1'), 'Patrols');
  assert.equal(shortCite({ authors: 'Wilson ML, Kahlenberg SM, Wells M, Wrangham RW', year: 2012 }, 'k'), 'Wilson et al. 2012');
  assert.equal(shortCite({ authors: 'Watts DP, Mitani JC', year: 2001 }, 'k'), 'Watts & Mitani 2001');
  assert.equal(shortCite(undefined, 'key2020'), 'key2020');
});

// ------------------------------------------------------------------------------------------------ committed files
const FILES = ['guide-fruit', 'guide-paths', 'guide-patrols', 'guide-validation'].map(n => `docs/data/${n}.json`);
const read = (f: string) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const have = FILES.every(f => existsSync(new URL(`../${f}`, import.meta.url)));

test('guide data stays small', { skip: !have }, () => {
  const total = FILES.reduce((s, f) => s + readFileSync(new URL(`../${f}`, import.meta.url)).length, 0);
  assert.ok(total < 300 * 1024, `guide data is ${Math.round(total / 1024)} KB`);
});

test('no coordinates or field dates finer than a month in the guide data', { skip: !have }, () => {
  for (const f of FILES) {
    // Field-derived content never carries a day (run dates of my own simulations, in validation.runs, are fine).
    const data = read(f), fieldPart = f.endsWith('guide-validation.json') ? data.targets.map((t: { field: unknown }) => t.field) : data;
    assert.doesNotMatch(JSON.stringify(fieldPart), /\b(19|20)\d\d-\d\d-\d\d\b/, `${f}: a full date in field-derived content`);
    const walk = (v: unknown, key: string): void => {
      if (typeof v === 'number') assert.ok(Math.abs(v) < 5e4 || ['rfs', 'monthlyRfs', 'annualRain'].includes(key), `${f}: ${key} = ${v} looks like a coordinate`);
      else if (Array.isArray(v)) v.forEach(x => walk(x, key));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(read(f), '');
  }
  const paths = read('docs/data/guide-paths.json');
  for (const side of [paths.gombe, paths.sim]) for (const p of side.paths) {
    assert.deepEqual(p.pts[0], [0, 0], 'every path starts at the origin');
    assert.ok(p.pts.every((q: number[]) => q.every(Number.isInteger)), 'lattice points only');
    const [ex, ey] = p.pts[p.pts.length - 1];
    assert.ok(ex === 0 && ey >= 0, 'the net move points up');
  }
});

test('validation data covers every target and reproduces the scorecard counts', { skip: !have }, t => {
  const v = read('docs/data/guide-validation.json'), T = read('data/targets.json');
  assert.equal(v.targets.length, T.targets.length);
  assert.deepEqual(v.targets.map((t: { id: string }) => t.id), T.targets.map((t: { id: string }) => t.id));
  // The scorecard is a run output (artifacts/ is gitignored; copy it by hand to a new computer): without it the counts
  // cannot be checked, so the rest of this test is skipped rather than failed.
  if (!existsSync(new URL(`../${v.runs.standard.file}`, import.meta.url))) { t.skip(`${v.runs.standard.file} is not on this computer`); return; }
  const sc = read(v.runs.standard.file);
  for (const [k, n] of Object.entries(sc.summary.all as Record<string, number>)) assert.equal(v.summary.standard.all[k] ?? 0, n, `summary ${k}`);
  for (const t of v.targets) if (t.key === 'tuned' || t.key === 'encoded' || t.key === 'compromised') assert.notEqual(t.key, 'pass');
  assert.ok(v.targets.every((t: { sources: string[] }) => t.sources.every(s => v.sources[s])), 'every cited key resolves');
});
