// EY juvenile starvation (docs/staging/ey-juvenile-starvation.md), explanation (b): which record years a three-year run
// reads and how its lean seasons compare. No simulation: a world is created (no tick) and its phenology is evaluated as
// the simulation reads it (src/sim/phenology.ts tables, cropTarget: the crop before depletion, a function of the tree,
// the seed and the time only). The sim code is imported from a frozen checkout of the runs' commit (--root), read only.
//
//   pnpm exec tsx scripts/ey-juv/phenology-years.ts --root <frozen checkout> --params <run dir>/params.json \
//     [--seeds 48,7,21,5,11] [--burn-in 30] [--days 1095] --out artifacts/validation/ey-juv/phenology.json
//
// Output, per seed: the record offset and the record year (index and calendar year of the Ngogo record) of each calendar
// year of the run; per 30-day block of the scored window (block 0 = scored days 0–29): the ripe crop energy (kcal) of all
// trees inside the three communities' opening ranges (centre and radius at creation), drupes and figs apart, sampled at
// noon every 5th day; the record's site share of stems in ripe fruit in that block's month; and the fallback season factor.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (k: string, d = '') => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const root = resolve(arg('root'));
const params = JSON.parse(readFileSync(resolve(arg('params')), 'utf8'));
const seeds = arg('seeds', '48,7,21,5,11').split(',').map(Number), burnIn = +arg('burn-in', '30'), days = +arg('days', '1095');

const { createWorld } = await import(`${root}/src/simulation.ts`);
const { tables, cropTarget, simDay } = await import(`${root}/src/sim/phenology.ts`);
const { hash01 } = await import(`${root}/src/sim/rng.ts`);
const { paramsOf } = await import(`${root}/src/sim/params.ts`);
const { fruitKcalPerUnit } = await import(`${root}/src/sim/energy.ts`);
const { PHENOLOGY_DATA } = await import(`${root}/src/sim/phenology.gen.ts`);

const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const monthOf = (doy: number) => { let m = 0; while (m < 11 && doy >= MONTH_START[m + 1]) m++; return m; };
const out: Record<string, unknown> = { root, srcTree: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD:src']).toString().trim(), source: PHENOLOGY_DATA?.source ?? 'synthetic',
  recordYears: PHENOLOGY_DATA?.years ?? null, burnIn, days, seeds: [] as unknown[] };
for (const seed of seeds) {
  const w = createWorld(seed, { profile: 'field', params });
  const P = paramsOf(w), tb = tables(w);
  // phenology.ts recordYear (not exported): the world steps through the record from its start year, then resamples
  const recordYear = (y: number) => { const k = tb.offset + y; return k < tb.nYears ? k : Math.floor(hash01(k, 7104, 3) * tb.nYears); };
  const day0 = simDay(0) + burnIn; // days since 1 January of the run's first calendar year, at the scored window's start
  const years: unknown[] = [];
  for (let y = Math.floor(day0 / 365); y <= Math.floor((day0 + days) / 365); y++) {
    const k = recordYear(y), site = tb.site[k] as number[];
    years.push({ calendarYear: y, recordIndex: k, recordYear: PHENOLOGY_DATA?.years[k] ?? null, resampled: tb.offset + y >= tb.nYears, siteMean: site.reduce((a, b) => a + b, 0) / 12, siteMin: Math.min(...site), siteByMonth: site });
  }
  const inRange = w.trees.filter((t: { position: number[] }) => w.troops.some((tr: { center: number[]; radius: number }) => Math.hypot(t.position[0] - tr.center[0], t.position[2] - tr.center[2]) <= tr.radius));
  const kDrupe = fruitKcalPerUnit(P, false), kFig = fruitKcalPerUnit(P, true);
  const blocks: unknown[] = [];
  for (let b = 0; b * 30 < days; b++) {
    let drupe = 0, fig = 0, n = 0;
    for (let d = b * 30; d < Math.min(days, (b + 1) * 30); d += 5) {
      const time = (burnIn + d) * 24 + 5.5; // noon (the run opens at 06:30)
      for (const t of inRange) { const v = cropTarget(w, t, time); if (v > 0) { if (t.species.startsWith('Ficus')) fig += v * kFig; else drupe += v * kDrupe; } }
      n++;
    }
    const mid = day0 + b * 30 + 15, y = Math.floor(mid / 365), doy = mid - 365 * y, m = monthOf(doy);
    blocks.push({ block: b, day0: b * 30, calendarYear: y, month: m, drupeKcal: drupe / n, figKcal: fig / n, siteShare: (tb.site[recordYear(y)] as number[])[m],
      fallbackSeason: 1 + P.youngLeafAmp * Math.cos(2 * Math.PI * (doy + 1 - P.youngLeafPeakDoy) / 182.5) });
  }
  (out.seeds as unknown[]).push({ seed, offset: tb.offset, nYears: tb.nYears, siteMean: tb.siteMean, treesInRange: inRange.length, trees: w.trees.length,
    troops: w.troops.map((t: { id: number; radius: number }) => ({ id: t.id, radius: t.radius, living: w.chimps.filter((c: { alive: boolean; troopId: number }) => c.alive && c.troopId === t.id).length })), years, blocks });
  console.error(`seed ${seed}: offset ${tb.offset} of ${tb.nYears}`);
}
writeFileSync(resolve(arg('out')), JSON.stringify(out));
console.error(`wrote ${arg('out')}`);
