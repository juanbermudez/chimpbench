// Real-data band for T-FIS-5 (docs/realism-design.md "C9 pre-registration"), computed before any C9 run. Derived
// statistics only leave data/raw: yearly patrol rates per 10 adult males and their ratio.
//
//   pnpm exec tsx scripts/fission-bands-metrics.ts [--out artifacts/validation/c9]
//
// Rule (stated in the pre-registration): Ngogo after the fission, 2017–2022, patrols per year per group from
// patrol-data-quarterly.csv (Sandel et al. 2026, Dryad sf7m0cgkg, CC0) and adult males (age class "adult", > 15 y) per
// group from population_snapshots.csv; per year, (patrols per 10 males, smaller group) ÷ (the same, larger group); the
// statistic is the median of the yearly ratios, the band its bootstrap 90% CI over years (4,000 replicates, mulberry32
// seed 20260929). Years in which the larger group made no patrol would be skipped (none in 2017–2022).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/compare/sampling';
import { quantile } from '../src/field/stats';

const D = 'data/raw/dryad-sf7m0cgkg/';
const rows = (f: string) => { const [h, ...r] = readFileSync(D + f, 'utf8').trim().split(/\r?\n/).map(l => l.split(',').map(x => x.replace(/^"|"$/g, ''))); return r.map(v => Object.fromEntries(h.map((k, i) => [k, v[i]]))); };
const pat = new Map<number, Record<string, number>>(), males = new Map<number, Record<string, number>>();
for (const r of rows('patrol-data-quarterly.csv')) { const y = +r.Year, g = r.Group === 'Western' ? 'West' : r.Group; const o = pat.get(y) ?? {}; o[g] = (o[g] ?? 0) + +r.Count; pat.set(y, o); }
for (const r of rows('population_snapshots.csv')) if (r.age_class === 'adult' && r.sex === 'M') { const o = males.get(+r.year) ?? {}; o[r.community] = +r.count; males.set(+r.year, o); }
const years: { year: number; smaller: string; ratio: number; perTenSmall: number; perTenLarge: number }[] = [];
for (let y = 2017; y <= 2022; y++) {
  const p = pat.get(y), m = males.get(y);
  if (!p || !m || !m.West || !m.Central) continue;
  const [small, large] = m.West <= m.Central ? ['West', 'Central'] : ['Central', 'West'];
  const a = (p[small] ?? 0) / m[small] * 10, b = (p[large] ?? 0) / m[large] * 10;
  if (b > 0) years.push({ year: y, smaller: small, ratio: Math.round(a / b * 1e4) / 1e4, perTenSmall: Math.round(a * 1e3) / 1e3, perTenLarge: Math.round(b * 1e3) / 1e3 });
}
const med = (v: number[]) => quantile(v, 0.5), rng = mulberry32(20260929), boot: number[] = [];
for (let k = 0; k < 4000; k++) { const s: number[] = []; for (let i = 0; i < years.length; i++) s.push(years[Math.floor(rng() * years.length)].ratio); boot.push(med(s)); }
const out = { rule: 'median over 2017-2022 of yearly (patrols per 10 adult males, smaller daughter) / (larger daughter); band = bootstrap 90% CI over years', years,
  median: Math.round(med(years.map(y => y.ratio)) * 1e4) / 1e4, band: [quantile(boot, 0.05), quantile(boot, 0.95)].map(v => Math.round(v * 1e4) / 1e4),
  credit: 'Sandel AA et al. 2026, Science, doi:10.1126/science.adz4944; data Dryad doi:10.5061/dryad.sf7m0cgkg (CC0). Derived statistics by ChimpBench.' };
const dir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'artifacts/validation/c9';
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/fission-bands.json`, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
