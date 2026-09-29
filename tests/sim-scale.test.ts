import assert from 'node:assert/strict';
import test from 'node:test';
import { dateOrder, parseCsv, parseMonth, perTree, siteSeries, toData } from '../scripts/ingest-phenology';
import { applyIntervention, createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';
import { cropTarget, forageYield, fruitAt, materializeFruit, phenologySource, simDay } from '../src/sim/phenology';
import { simOf } from '../src/sim/state';
import { BANK_A, BANK_B, CHANNEL, FORD, streamCell } from '../src/sim/stream';
import type { World } from '../src/types';
import { canonical, fnv } from './fixtures/golden';

// Stage C5a: the field profile in real metres (docs/realism-design.md §5.1): profile switching, the stream segment
// grid, lazy fruit, the chimp grid, phenology and its ingest.

const DAY = 5760;
/** Canonical world text without registry settings and without the lazily refreshed crop fields of trees. */
function core(w: World): string {
  const copy = JSON.parse(JSON.stringify(w));
  for (const t of copy.trees) { delete t.fruit; delete t.depletion; }
  delete copy.sim.params;
  return canonical(copy);
}

test('the field profile builds a real-scale world and the compressed default is unchanged', () => {
  const c = createWorld(48), f = createWorld(48, { profile: 'field' });
  assert.equal(c.size, 160); assert.equal(c.trees.length, 240); assert.equal(c.stream!.crossings.length, 3);
  assert.equal(simOf(f).params.profile, 'field');
  const P = paramsOf(f);
  assert.equal(f.size, 8000);
  // ranges are seeded from the nominal circles (stage C6); the kernel-smoothed 95% isopleth is about as wide
  const nominal = [P.rangeRadiusWestM, P.rangeRadiusEastM, P.rangeRadiusNorthM];
  f.troops.forEach((t, i) => assert.ok(t.range && t.radius >= 0.9 * nominal[i] && t.radius <= 1.3 * nominal[i], `${t.name}: ${t.radius} m vs ${nominal[i]} m`));
  assert.ok(f.trees.length > 20000, `${f.trees.length} food patches`);
  assert.ok(f.stream!.crossings.length > 10 && f.water.length > 50 && f.prey.length === P.preyMinGroups);
  // every founder sleeps in a nest on dry ground inside its range, and no patch stands in the channel
  for (const ch of f.chimps) assert.ok(ch.nest && streamCell(f, ch.position[0], ch.position[2]) <= BANK_B);
  for (let i = 0; i < f.trees.length; i += 37) assert.ok(streamCell(f, f.trees[i].position[0], f.trees[i].position[2]) <= BANK_B);
  assert.match(f.events[0].text, /field scale 8 km/);
  // the ingested Ngogo record (Potts et al. 2020, CC0) since C7a; the synthetic record when none is ingested
  assert.ok(['synthetic', 'ngogo-phenology-1998-2017'].includes(phenologySource(f)), phenologySource(f));
  assert.equal(phenologySource(createWorld(48, { profile: 'field', params: { phenologyForcing: 0 } })), 'synthetic');
});

test('the stream segment grid classifies the compressed map exactly as the 1 m occupancy grid', () => {
  for (const seed of [48, 7, 21]) {
    const grid = createWorld(seed), seg = createWorld(seed, { params: { streamAnalytic: 1 } });
    assert.equal(JSON.stringify(seg.stream), JSON.stringify(grid.stream));
    const half = grid.size / 2 + 2, n = Math.ceil(half * 2);
    let differ = 0, fords = 0, channel = 0;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const x = cx + 0.5 - half, z = cz + 0.5 - half, a = streamCell(grid, x, z);
      if (a !== streamCell(seg, x, z)) differ++;
      if (a === FORD) fords++; else if (a === CHANNEL) channel++;
    }
    assert.equal(differ, 0, `seed ${seed}`);
    assert.ok(fords > 0 && channel > 300);
  }
});

test('field banks: the two sides of the stream stay apart and fords join them', () => {
  const w = createWorld(7, { profile: 'field' });
  const s = w.stream!;
  const lefts = new Set<number>();
  let n = 0;
  for (let i = 5; i < s.points.length - 5; i += 25) {
    const p = s.points[i], q = s.points[i + 1], tx = q[0] - p[0], tz = q[2] - p[2], l = Math.hypot(tx, tz);
    const left = streamCell(w, p[0] - tz / l * 20, p[2] + tx / l * 20), right = streamCell(w, p[0] + tz / l * 20, p[2] - tx / l * 20);
    if (Math.abs(p[0]) > w.size / 2 - 50 || Math.abs(p[2]) > w.size / 2 - 50) continue;
    assert.notEqual(left, right, `point ${i}`);
    lefts.add(left); n++;
    assert.equal(streamCell(w, p[0], p[2]) >= CHANNEL, true);
  }
  assert.ok(n > 20);
  assert.equal(lefts.size, 1, 'the left bank is the same bank all along the stream');
  assert.ok(lefts.has(BANK_A) || lefts.has(BANK_B));
  for (const c of s.crossings) assert.equal(streamCell(w, c[0], c[2]), FORD);
});

test('the chimp grid gives the same world as scanning every living individual', () => {
  const run = (cell: number) => { const w = createWorld(21, { profile: 'field', params: { chimpGridCellM: cell } }); for (let i = 0; i < DAY; i++) tickWorld(w); return w; };
  const grid = run(50), scan = run(0);
  assert.equal(fnv(core(grid)), fnv(core(scan)));
});

test('lazy fruit: refreshing every patch each hour changes nothing the chimpanzees do, and reads equal the refreshed crop', () => {
  const lazy = createWorld(5, { profile: 'field' }), eager = createWorld(5, { profile: 'field' });
  applyIntervention(lazy, 'fig-mast', { troopId: 1 }); applyIntervention(eager, 'fig-mast', { troopId: 1 });
  let depleted = 0;
  for (let i = 0; i < DAY; i++) {
    tickWorld(lazy); tickWorld(eager);
    if (i % 240 === 0) {
      materializeFruit(eager);
      for (let k = 0; k < eager.trees.length; k += 101) { const t = eager.trees[k]; assert.equal(t.fruit, fruitAt(eager, t)); }
    }
  }
  assert.equal(fnv(core(lazy)), fnv(core(eager)));
  for (const t of lazy.trees) if (t.depletion) depleted++;
  assert.ok(depleted > 0, 'chimpanzees depleted some patches');
  // a depleted patch recovers toward its phenology crop: the gap below the crop shrinks (whatever the crop does meanwhile)
  const gap = (q: typeof lazy.trees[number], time: number) => cropTarget(lazy, q, time) - fruitAt(lazy, q, time);
  const t = lazy.trees.find(q => q.depletion && gap(q, lazy.time) > 0.01 && fruitAt(lazy, q, lazy.time + 48) > 0)!;
  assert.ok(t, 'a depleted patch still in fruit two days later');
  assert.ok(gap(t, lazy.time + 48) < gap(t, lazy.time) && gap(t, lazy.time + 48) >= 0);
});

test('phenology (ingested Ngogo record, or synthetic): about 8.7% of stems ripe on a transect (T-FOOD-1), seasonal, figs asynchronous', () => {
  const w = createWorld(48, { profile: 'field' });
  const bySpecies = new Map<string, typeof w.trees>();
  for (const t of w.trees) { const l = bySpecies.get(t.species) ?? []; if (l.length < 40) l.push(t); bySpecies.set(t.species, l); }
  const stems = [...bySpecies.values()].flat();
  const monthly: number[] = [];
  for (let m = 0; m < 24; m++) {
    const time = m * 24 * 365 / 12;
    monthly.push(stems.filter(t => cropTarget(w, t, time) >= 0.06).length / stems.length);
  }
  const mean = monthly.reduce((a, b) => a + b, 0) / monthly.length;
  const cv = Math.sqrt(monthly.reduce((a, b) => a + (b - mean) ** 2, 0) / monthly.length) / mean;
  assert.ok(mean > 0.06 && mean < 0.11, `mean ${mean.toFixed(3)}`);
  assert.ok(cv > 0.15, `monthly CV ${cv.toFixed(2)}`);
  assert.ok(simDay(0) > 270 && simDay(0) < 272);
  // the forage field is never exhausted and varies by habitat within its bounds
  const P = paramsOf(w);
  for (let i = 0; i < 50; i++) { const y = forageYield(w, i * 137 - 3000, i * 71 - 2000); assert.ok(y >= P.forageYieldMin * (1 - P.youngLeafAmp) - 1e-9 && y <= P.forageYieldMax * (1 + P.youngLeafAmp) + 1e-9); }
});

test('field worlds are deterministic and resume from JSON', () => {
  const a = createWorld(11, { profile: 'field' }), b = createWorld(11, { profile: 'field' });
  for (let i = 0; i < 1500; i++) { tickWorld(a); tickWorld(b); }
  const copy = JSON.parse(JSON.stringify(a)) as World;
  for (let i = 0; i < 1500; i++) { tickWorld(a); tickWorld(b); tickWorld(copy); }
  const h = fnv(canonical(a));
  assert.equal(fnv(canonical(b)), h);
  assert.equal(fnv(canonical(copy)), h);
});

test('phenology ingest parses per-tree (long and wide) and site-level files', () => {
  assert.deepEqual(parseMonth('1998-03'), [1998, 2]); assert.deepEqual(parseMonth('Mar-98'), [1998, 2]); assert.deepEqual(parseMonth('03/2001'), [2001, 2]);
  // n/n/yyyy: day-first by default, month-first when a column shows a second field above 12 (the Ngogo set, C7a)
  assert.equal(dateOrder(['6/1/1998', '9/19/2011']), 'mdy'); assert.equal(dateOrder(['19/9/2011', '1/6/1998']), 'dmy');
  assert.deepEqual(parseMonth('6/1/1998', 'mdy'), [1998, 5]); assert.deepEqual(parseMonth('6/1/1998'), [1998, 0]);
  assert.deepEqual(parseCsv('a,"b, c",d\n1,"x ""y""",3\n'), [['a', 'b, c', 'd'], ['1', 'x "y"', '3']]);
  const long = 'Tree,Species,Year,Month,RipeFruit\n1,Uvariopsis congensis,1998,1,1\n2,Uvariopsis congensis,1998,1,0\n3,Ficus mucuso,1998,2,1\n1,Uvariopsis congensis,1999,1,0\n';
  const report: string[] = [];
  const t = perTree(parseCsv(long), report)!;
  const d = toData(t, { source: 'test', license: 'CC0', citation: 'fixture' });
  assert.deepEqual(d.years, [1998, 1999]);
  assert.equal(d.species['Uvariopsis congensis'].months[0][0], 0.5);
  assert.ok(Number.isNaN(d.species['Uvariopsis congensis'].months[0][5] as number));
  assert.equal(d.species['Ficus mucuso'].fig, true);
  assert.equal(d.matched!['Uvariopsis congensis'], 'Uvariopsis congensis');
  assert.ok(d.unmatched!.includes('Celtis durandii'));
  const wide = 'species,1998-01,1998-02,1998-03,1998-04,1998-05,1998-06\nCeltis durandii,0,1,1,0,0,1\nCeltis durandii,0,0,1,0,0,1\n';
  const tw = perTree(parseCsv(wide), [])!;
  assert.equal(toData(tw, { source: 't', license: 'x', citation: 'y' }).species['Celtis durandii'].months[0][2], 1);
  const site = siteSeries(parseCsv('year,month,trees_monitored,n_ripe\n1998,Jan,100,8\n1998,Feb,100,12\n'), [])!;
  assert.deepEqual(site.years, [1998]); assert.equal(site.share[0][0], 0.08); assert.equal(site.share[0][1], 0.12);
});
