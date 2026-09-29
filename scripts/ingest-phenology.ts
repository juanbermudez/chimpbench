// Kibale phenology ingest (docs/realism-design.md §5.6, §9): turns the Ngogo 1998–2017 (potts2020, CC0) and
// Kanyawara 1998–2013 (chapman2018, CC BY 4.0) datasets into data/phenology/<site>.json and writes
// src/sim/phenology.gen.ts, which the field profile's patch ecology uses (src/sim/phenology.ts). Without a dataset the
// simulation uses its labelled synthetic record.
//
//   pnpm exec tsx scripts/ingest-phenology.ts                  # scan ~/Downloads, write whatever it finds, prefer Ngogo
//   pnpm exec tsx scripts/ingest-phenology.ts --dir <folder> --site ngogo|kanyawara
//   pnpm exec tsx scripts/ingest-phenology.ts --synthetic      # reset phenology.gen.ts to the synthetic record
//
// Files are detected by name (case-insensitive):
//   Ngogo_phenology_data_full_set.csv  (Dryad doi:10.5061/dryad.gf1vhhmk8) per-tree monthly presence of ripe fruit
//   phenology_file_Jan2020.csv         (same package) monthly site-level ripe fruit score; used only without the full set
//   forest.csv                         (Zenodo doi:10.5281/zenodo.1194839) Kanyawara monthly trees monitored / with ripe fruit
//
// Expected formats. The column names of these files were not available when this was written, so columns are found
// by pattern and the script prints what it used; check the report before relying on the output.
//   Per-tree, long:  one row per tree and month; a species column (species | taxon | scientific name), a date
//                    (date | yyyy-mm | m/yyyy) or year + month columns, and a ripe-fruit column (ripe | rf | ripe_fruit;
//                    any value > 0 counts as ripe). An optional tree/stem id column is ignored.
//   Per-tree, wide:  a species column and one column per month whose header is a date (1998-01, Jan-98, 01/1998, Jan 1998).
//   Site-level:      year + month (or date) and either a share of trees with ripe fruit (share | prop | percent | pct,
//                    percent values are divided by 100) or a count with ripe fruit plus a count of trees monitored.
// Output shares: per species (or the site), per year, per month, the share of monitored stems with ripe fruit (NaN
// where a month has no record).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SIM_SPECIES, type PhenologyData } from '../src/sim/phenology';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = join(ROOT, 'src/sim/phenology.gen.ts');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Minimal RFC 4180 CSV parser (quoted fields, embedded commas and quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some(v => v.trim() !== '')) rows.push(row); row = []; }
    else field += ch;
  }
  row.push(field); if (row.some(v => v.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * Day-first or month-first for a column of n/n/yyyy dates: month-first when some second field exceeds 12 and no first
 * field does (the Ngogo full set is M/D/YYYY: C7a), day-first otherwise (the earlier default).
 */
export function dateOrder(values: string[]): 'dmy' | 'mdy' {
  let first = false, second = false;
  for (const v of values) { const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/); if (!m) continue; if (+m[1] > 12) first = true; if (+m[2] > 12) second = true; }
  return second && !first ? 'mdy' : 'dmy';
}

/** [year, month 0..11] from a date-like string, or null. Two-digit years: < 50 → 20xx. */
export function parseMonth(s: string, order: 'dmy' | 'mdy' = 'dmy'): [number, number] | null {
  const t = s.trim().toLowerCase();
  let m: RegExpMatchArray | null;
  const yr = (y: string) => { const v = +y; return y.length <= 2 ? (v < 50 ? 2000 + v : 1900 + v) : v; };
  if ((m = t.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?/))) return [+m[1], +m[2] - 1];
  if ((m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) return [yr(m[3]), (order === 'mdy' ? +m[1] : +m[2]) - 1]; // d/m/y or m/d/y
  if ((m = t.match(/^(\d{1,2})[-/.](\d{4})$/))) return [+m[2], +m[1] - 1];
  if ((m = t.match(/^([a-z]{3})[a-z]*[-\s_./]?(\d{2,4})$/)) && MONTHS.includes(m[1])) return [yr(m[2]), MONTHS.indexOf(m[1])];
  return null;
}

const col = (header: string[], re: RegExp) => header.findIndex(h => re.test(h.trim()));
const num = (s: string | undefined) => { const v = parseFloat((s ?? '').trim()); return Number.isFinite(v) ? v : NaN; };

interface Table { years: number[]; bySpecies: Map<string, Map<string, [number, number]>> } // species -> "y-m" -> [ripe, total]

function add(t: Table, sp: string, y: number, m: number, ripe: boolean) {
  let s = t.bySpecies.get(sp); if (!s) t.bySpecies.set(sp, s = new Map());
  const k = `${y}-${m}`, v = s.get(k) ?? [0, 0]; v[0] += ripe ? 1 : 0; v[1]++; s.set(k, v);
  if (!t.years.includes(y)) t.years.push(y);
}

/** Per-tree records (long or wide) into per-species monthly shares. Returns null when the columns are not recognised. */
export function perTree(rows: string[][], report: string[]): Table | null {
  const h = rows[0].map(x => x.toLowerCase());
  const sp = col(h, /^(species|sp|taxon|scientific[ ._]?name|genus[ ._]?species|species[ ._]?name)$/);
  if (sp < 0) { report.push('no species column'); return null; }
  const t: Table = { years: [], bySpecies: new Map() };
  const dateCols = h.map((x, i) => [i, parseMonth(x)] as const).filter(([, v]) => v !== null) as [number, [number, number]][];
  if (dateCols.length >= 6) {
    report.push(`wide format: species "${rows[0][sp]}", ${dateCols.length} month columns (${rows[0][dateCols[0][0]]} … ${rows[0][dateCols[dateCols.length - 1][0]]})`);
    for (const r of rows.slice(1)) for (const [i, [y, m]] of dateCols) { const v = num(r[i]); if (Number.isFinite(v)) add(t, r[sp].trim(), y, m, v > 0); }
    return t;
  }
  const date = col(h, /^(date|month[ ._]?year|year[ ._]?month|yyyymm|period)$/), year = col(h, /^(year|yr)$/), month = col(h, /^(month|mo|mon)$/);
  const ripe = col(h, /(^|[ ._])(ripe|rf|ripe[ ._]?fruit|ripefruit|rip)([ ._]|$)/);
  if (ripe < 0 || (date < 0 && (year < 0 || month < 0))) { report.push('long format needs a ripe column and a date or year + month'); return null; }
  const order = date >= 0 ? dateOrder(rows.slice(1).map(r => r[date] ?? '')) : 'dmy';
  report.push(`long format: species "${rows[0][sp]}", ripe "${rows[0][ripe]}", ${date >= 0 ? `date "${rows[0][date]}" (${order === 'mdy' ? 'month/day/year' : 'day/month/year'})` : `year "${rows[0][year]}" + month "${rows[0][month]}"`}`);
  for (const r of rows.slice(1)) {
    let ym: [number, number] | null;
    if (date >= 0) ym = parseMonth(r[date], order);
    else { const y = num(r[year]), mv = r[month].trim().toLowerCase(), mi = MONTHS.indexOf(mv.slice(0, 3)); ym = Number.isFinite(y) ? [y, mi >= 0 ? mi : num(mv) - 1] : null; }
    const v = num(r[ripe]);
    if (ym && ym[1] >= 0 && ym[1] < 12 && Number.isFinite(v)) add(t, r[sp].trim(), ym[0], ym[1], v > 0);
  }
  return t;
}

/** Site-level monthly share (Kanyawara forest.csv, the Ngogo score file). */
export function siteSeries(rows: string[][], report: string[]): { years: number[]; share: number[][] } | null {
  const h = rows[0].map(x => x.toLowerCase());
  const date = col(h, /^(date|month[ ._]?year|year[ ._]?month)$/), year = col(h, /^(year|yr)$/), month = col(h, /^(month|mo|mon)$/);
  const share = col(h, /(share|prop|percent|pct|proportion).*(ripe|fruit)|(ripe|fruit).*(share|prop|percent|pct|proportion)/);
  const count = col(h, /(n|num|number|count).*(ripe)|(ripe).*(n|num|number|count)$/), total = col(h, /(trees?|stems?)[ ._]?(monitored|sampled|total|n)|(n|number)[ ._]?(trees|stems)/);
  if ((date < 0 && (year < 0 || month < 0)) || (share < 0 && (count < 0 || total < 0))) { report.push('site-level format needs year + month (or date) and a share, or ripe and monitored counts'); return null; }
  report.push(`site-level: ${share >= 0 ? `share "${rows[0][share]}"` : `"${rows[0][count]}" ÷ "${rows[0][total]}"`}, ${date >= 0 ? `date "${rows[0][date]}"` : `year "${rows[0][year]}" + month "${rows[0][month]}"`}`);
  const vals = new Map<string, number>(); const years: number[] = [];
  const order = date >= 0 ? dateOrder(rows.slice(1).map(r => r[date] ?? '')) : 'dmy';
  for (const r of rows.slice(1)) {
    let ym: [number, number] | null;
    if (date >= 0) ym = parseMonth(r[date], order);
    else { const y = num(r[year]), mv = r[month].trim().toLowerCase(), mi = MONTHS.indexOf(mv.slice(0, 3)); ym = Number.isFinite(y) ? [y, mi >= 0 ? mi : num(mv) - 1] : null; }
    if (!ym) continue;
    let v = share >= 0 ? num(r[share]) : num(r[count]) / num(r[total]);
    if (!Number.isFinite(v)) continue;
    if (share >= 0 && v > 1) v /= 100;
    vals.set(`${ym[0]}-${ym[1]}`, v); if (!years.includes(ym[0])) years.push(ym[0]);
  }
  years.sort((a, b) => a - b);
  return { years, share: years.map(y => MONTHS.map((_, m) => vals.get(`${y}-${m}`) ?? NaN)) };
}

/** Match sim species to dataset species by genus and epithet (case-insensitive); unmatched sim species use their class mean. */
export function matchSpecies(names: string[]): { matched: Record<string, string>; unmatched: string[] } {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const matched: Record<string, string> = {}, unmatched: string[] = [];
  for (const sp of SIM_SPECIES) {
    const [g, e] = norm(sp).split(' ');
    const hit = names.find(n => { const [ng, ne] = norm(n).split(' '); return ng === g && ne === e; }) ?? names.find(n => { const [ng, ne] = norm(n).split(' '); return ng?.[0] === g[0] && ne === e; });
    if (hit) matched[sp] = hit; else unmatched.push(sp);
  }
  return { matched, unmatched };
}

export function toData(t: Table, meta: { source: string; license: string; citation: string }): PhenologyData {
  const years = [...t.years].sort((a, b) => a - b);
  const species: PhenologyData['species'] = {};
  for (const [sp, m] of [...t.bySpecies].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    species[sp] = { fig: /^ficus\b/i.test(sp), months: years.map(y => MONTHS.map((_, i) => { const v = m.get(`${y}-${i}`); return v && v[1] > 0 ? v[0] / v[1] : NaN; })) };
  }
  return { ...meta, years, species, ...matchSpecies(Object.keys(species)) };
}

function writeGen(data: PhenologyData | null, note: string) {
  const body = data ? `export const PHENOLOGY_DATA: PhenologyData | null = ${JSON.stringify(data, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v))};\n`
    : 'export const PHENOLOGY_DATA: PhenologyData | null = null;\n';
  writeFileSync(GEN, `// Generated by scripts/ingest-phenology.ts. Do not edit by hand; re-run the script after adding datasets to ~/Downloads.\n// ${note}\nimport type { PhenologyData } from './phenology';\n\n${body}`);
}

function main() {
  const args = process.argv.slice(2);
  const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  if (args.includes('--synthetic')) { writeGen(null, 'Reset to the labelled synthetic record in src/sim/phenology.ts (--synthetic).'); console.log(`wrote ${GEN} (synthetic)`); return; }
  const dir = flag('dir', join(homedir(), 'Downloads'));
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const find = (re: RegExp) => files.find(f => re.test(f));
  const out: Record<string, PhenologyData> = {};
  const ngogo = find(/^ngogo_phenology_data_full_set.*\.csv$/i), score = find(/^phenology_file_jan2020.*\.csv$/i), kany = find(/^forest.*\.csv$/i);
  mkdirSync(join(ROOT, 'data/phenology'), { recursive: true });
  const nullNaN = (_: string, v: unknown) => (typeof v === 'number' && !Number.isFinite(v) ? null : v);
  if (ngogo) {
    const report: string[] = [];
    const t = perTree(parseCsv(readFileSync(join(dir, ngogo), 'utf8')), report);
    console.log(`${ngogo}: ${report.join('; ')}`);
    if (t) out.ngogo = toData(t, { source: 'ngogo-phenology-1998-2017', license: 'CC0 1.0', citation: 'Potts KB et al. 2020, Dryad doi:10.5061/dryad.gf1vhhmk8 (potts2020)' });
  } else if (score) {
    const report: string[] = [];
    const s = siteSeries(parseCsv(readFileSync(join(dir, score), 'utf8')), report);
    console.log(`${score}: ${report.join('; ')}`);
    if (s) out.ngogo = { source: 'ngogo-phenology-score-2020', license: 'CC0 1.0', citation: 'Potts KB et al. 2020, Dryad doi:10.5061/dryad.gf1vhhmk8 (potts2020)', years: s.years, species: {}, site: s.share, ...matchSpecies([]) };
  }
  if (kany) {
    const report: string[] = [];
    const s = siteSeries(parseCsv(readFileSync(join(dir, kany), 'utf8')), report);
    console.log(`${kany}: ${report.join('; ')}`);
    if (s) out.kanyawara = { source: 'kanyawara-phenology-1998-2013', license: 'CC BY 4.0 (attribution: Chapman CA et al. 2018, Zenodo doi:10.5281/zenodo.1194839)', citation: 'Chapman CA et al. 2018 (chapman2018)', years: s.years, species: {}, site: s.share, ...matchSpecies([]) };
  }
  for (const [site, d] of Object.entries(out)) {
    writeFileSync(join(ROOT, `data/phenology/${site}.json`), JSON.stringify(d, nullNaN, 1) + '\n');
    const sp = Object.keys(d.species).length;
    console.log(`data/phenology/${site}.json: ${d.years.length} years (${d.years[0]}–${d.years[d.years.length - 1]}), ${sp} species${sp ? `; matched ${Object.keys(d.matched ?? {}).length} of ${SIM_SPECIES.length} sim species, class means for ${(d.unmatched ?? []).join(', ') || 'none'}` : ' (site series: every species follows it)'}`);
  }
  const want = flag('site', out.ngogo ? 'ngogo' : 'kanyawara');
  const chosen = out[want] ?? null;
  if (!chosen) {
    console.log(`No Kibale phenology dataset found in ${dir} (looked for Ngogo_phenology_data_full_set.csv, phenology_file_Jan2020.csv, forest.csv).`);
    if (!existsSync(GEN)) writeGen(null, 'No dataset found; the synthetic record is used.');
    return;
  }
  writeGen(chosen, `From ${chosen.source} (${chosen.license}); the field profile's patch ecology reads it (P.phenologyForcing = 1).`);
  console.log(`wrote ${GEN} from ${chosen.source}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
