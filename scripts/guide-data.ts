// Derived data for the visual guide (docs/architecture.html, drawn by docs/guide/guide.js). Reads open field data in
// data/raw/ (never copied out), the derived comparison files in docs/data/ and the latest field scorecards in
// artifacts/validation/, and writes small aggregates only:
//
//   docs/data/guide-fruit.json       Ngogo ripe-fruit calendar and rainfall by month (Potts et al. 2020, CC0)
//   docs/data/guide-paths.json       six day paths each, Gombe and simulated, normalized to the range radius on a 0.1 r lattice
//   docs/data/guide-patrols.json     anonymous per-male patrol participation, Gombe and Ngogo (CC0)
//   docs/data/guide-validation.json  every target with its latest verdict (standard and fresh seeds), the dataset
//                                    inventory and the parameter registry's evidence mix
//
//   pnpm exec tsx scripts/guide-data.ts [--scorecard <field json>] [--fresh <field json>] [--check] [--out-dir <dir>]
//
// --check recomputes everything and fails if a committed file differs (numbers only; `generated` is ignored).
//
// Location sensitivity (data/raw/*/PROVENANCE.md, binding): no coordinates, basemaps, place names below site level,
// dates finer than a month or individual names/codes leave this script. Paths are translated to start at the origin,
// scaled by the range radius r, rotated so the day's net displacement points up and snapped to a 0.1 r lattice (cells
// ≥ 0.1 R, as for every map drawn from real points). assertNonSensitive guards each output.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { communityRange, every30, gombeFollows, type PathPoint } from '../src/compare/gombe-paths';
import { csvRecords, gombeExcursions, ngogoPatrols, postFission, readXlsx } from '../src/compare/patrols';
import { assertNonSensitive } from '../src/compare/report';
import { histogram, median } from '../src/compare/stats';
import { byFollow, scaleMatchedBandwidth, territory, type TrackPoint } from '../src/compare/tracks';
import { records } from '../src/compare/xlsx';

const root = new URL('../', import.meta.url), rel = (p: string) => new URL(p, root);
const readJson = (p: string) => JSON.parse(readFileSync(rel(p), 'utf8'));
const round = (v: number | null | undefined, d = 4) => (v !== null && v !== undefined && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

// ================================================================================================ pure helpers (tested)

/** Months × years matrices from the Ngogo site file (phenology_file_Jan2020.csv): ripe fruit score, share of trees with fruit, rain. */
export function siteCalendar(recs: Record<string, string>[]) {
  const rows = recs.map(r => ({ y: +r.year, m: +r.NumericMonth, rfs: parseFloat(r.RFS), share: parseFloat(r['Proportion.of.trees.w.fruit']), rain: parseFloat(r.rainfall) }))
    .filter(r => Number.isInteger(r.y) && r.m >= 1 && r.m <= 12);
  if (!rows.length) throw new Error('phenology site file: no monthly rows');
  const y0 = Math.min(...rows.map(r => r.y)), y1 = Math.max(...rows.map(r => r.y)), n = y1 - y0 + 1;
  const mat = () => Array.from({ length: n }, () => new Array<number | null>(12).fill(null));
  const rfs = mat(), share = mat(), rain = mat();
  for (const r of rows) {
    if (Number.isFinite(r.rfs)) rfs[r.y - y0][r.m - 1] = round(r.rfs, 0);
    if (Number.isFinite(r.share)) share[r.y - y0][r.m - 1] = round(r.share, 3);
    if (Number.isFinite(r.rain)) rain[r.y - y0][r.m - 1] = round(r.rain, 1);
  }
  const first = rows.reduce((a, r) => (r.y * 12 + r.m < a.y * 12 + a.m ? r : a)), last = rows.reduce((a, r) => (r.y * 12 + r.m > a.y * 12 + a.m ? r : a));
  return { years: [y0, y1] as [number, number], first: `${first.y}-${String(first.m).padStart(2, '0')}`, last: `${last.y}-${String(last.m).padStart(2, '0')}`, rfs, share, rain };
}

/** Median over the years of each month (nulls skipped). */
export function monthlyMedian(mat: (number | null)[][]): (number | null)[] {
  return Array.from({ length: 12 }, (_, m) => { const v = mat.map(r => r[m]).filter((x): x is number => x !== null); return v.length ? median(v) : null; });
}

/**
 * A path in its own frame: start at the origin, units of the range radius r, rotated so the net displacement points
 * up (+y), vertices snapped to a lattice of `cell` r and consecutive repeats dropped. Returns integer lattice steps.
 */
export function normalizePath(pts: { x: number; y: number }[], r: number, cell = 0.1): [number, number][] {
  if (pts.length < 2 || !(r > 0)) return [];
  const x0 = pts[0].x, y0 = pts[0].y, dx = pts[pts.length - 1].x - x0, dy = pts[pts.length - 1].y - y0;
  const a = Math.hypot(dx, dy) > 0 ? Math.PI / 2 - Math.atan2(dy, dx) : 0, c = Math.cos(a), s = Math.sin(a);
  const out: [number, number][] = [];
  for (const p of pts) {
    const u = (p.x - x0) / r, v = (p.y - y0) / r;
    const q: [number, number] = [Math.round((u * c - v * s) / cell), Math.round((u * s + v * c) / cell)];
    const last = out[out.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  // -0 → 0 so the JSON stays clean
  return out.map(([u, v]) => [u || 0, v || 0]);
}

/** k items spread evenly over the sorted order of `key`: the ones at quantiles (2i + 1) / 2k. */
export function pickByQuantile<T>(items: T[], key: (t: T) => number, k: number): T[] {
  const s = items.filter(t => Number.isFinite(key(t))).sort((a, b) => key(a) - key(b));
  if (s.length <= k) return s;
  return Array.from({ length: k }, (_, i) => s[Math.min(s.length - 1, Math.floor((2 * i + 1) / (2 * k) * s.length))]);
}

export interface DayPath { straight: number; pathR: number; netR: number; hours: number; pts: [number, number][] }

/**
 * Full-day follows (≥ minSpan h, no gap > maxGap h; the rule of src/compare/tracks followPaths) as normalized paths with
 * their straightness (net ÷ path, from the unsnapped records).
 */
export function dayPaths(follows: { t: number; x: number; y: number }[][], r: number, minSpan = 8, maxGap = 1): DayPath[] {
  const out: DayPath[] = [];
  for (const f of follows) {
    if (f.length < 2 || f[f.length - 1].t - f[0].t < minSpan) continue;
    let path = 0, ok = true;
    for (let i = 1; i < f.length; i++) { if (f[i].t - f[i - 1].t > maxGap) { ok = false; break; } path += Math.hypot(f[i].x - f[i - 1].x, f[i].y - f[i - 1].y); }
    if (!ok || !(path > 0)) continue;
    const net = Math.hypot(f[f.length - 1].x - f[0].x, f[f.length - 1].y - f[0].y);
    out.push({ straight: net / path, pathR: path / r, netR: net / r, hours: f[f.length - 1].t - f[0].t, pts: normalizePath(f, r) });
  }
  return out;
}

/**
 * How a scorecard row counts in the summary (src/field/targets.ts summarize): compromised, not scorable and
 * instrument-below-bar rows apart, encoded rows as 'encoded' whenever they are scored, tuned passes as 'tuned', else the verdict.
 */
export function countedAs(r: { verdict: string; flags: string[]; encoded: boolean }): string {
  const counted = r.verdict === 'pass' || r.verdict === 'fail' || r.verdict === 'inconclusive';
  if (r.flags.includes('compromised')) return 'compromised';
  if (r.flags.includes('not scorable')) return 'unscorable';
  if (r.flags.includes('instrument below bar')) return 'instrument';
  if (r.encoded && counted) return 'encoded';
  if (r.flags.includes('tuned') && r.verdict === 'pass') return 'tuned';
  return r.verdict;
}

/** "0.33–0.5" → { lo, hi }; anything that is not a plain numeric range → null. */
export function parseBand(s: string | undefined): { lo: number; hi: number } | null {
  const m = /^\s*(-?[\d.]+)\s*[–-]\s*(-?[\d.]+)\s*$/.exec(s ?? '');
  if (!m) return null;
  const lo = +m[1], hi = +m[2];
  return Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo ? { lo, hi } : null;
}

export const DOMAINS: Record<string, string> = {
  ACT: 'Activity', PTY: 'Parties', RNG: 'Ranging', IGE: 'Encounters', PAT: 'Patrols', BRD: 'Patrols', LET: 'Killings', FIS: 'Fission',
  FOOD: 'Food', HUN: 'Hunting', SOC: 'Social life', DEM: 'Life and death', COM: 'Communication',
};
export const domainOf = (id: string) => DOMAINS[id.split('-')[1]] ?? 'Other';

/** "Villioth et al." style short citation from a targets.json source entry. */
export function shortCite(src: { authors?: string; year?: number } | undefined, key: string): string {
  if (!src?.authors) return key;
  const names = src.authors.split(/,\s*|\s+&\s+|\s+and\s+/).map(a => a.trim().split(/\s+/)[0]).filter(Boolean);
  const who = names.length > 2 ? `${names[0]} et al.` : names.length === 2 ? `${names[0]} & ${names[1]}` : names[0];
  return `${who} ${src.year ?? ''}`.trim();
}

const fin2 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Compact number for JSON: 4 significant digits. */
export const sig = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? +v.toPrecision(4) : null);

// ================================================================================================ derivations

function fruit() {
  const site = siteCalendar(csvRecords(readFileSync(rel('data/raw/dryad-gf1vhhmk8/phenology_file_Jan2020.csv'), 'utf8')));
  const phen = readJson('data/phenology/ngogo.json') as { years: number[]; species: Record<string, { fig: boolean; months: (number | null)[][] }>; matched: Record<string, string>; unmatched: string[]; citation: string };
  // Trim trailing and leading years with no value at all (the per-tree file runs 1998–2019 with empty edges).
  const hasAny = (y: number) => Object.values(phen.species).some(s => s.months[y]?.some(v => v !== null));
  let a = 0, b = phen.years.length - 1;
  while (a < b && !hasAny(a)) a++;
  while (b > a && !hasAny(b)) b--;
  const species = Object.entries(phen.matched).map(([sim, data]) => {
    const s = phen.species[data];
    if (!s) throw new Error(`ngogo.json: matched species ${data} missing`);
    const months = s.months.slice(a, b + 1).map(r => r.map(v => round(v, 2)));
    return { name: sim, fig: s.fig, months, monthly: monthlyMedian(months).map(v => round(v, 3)) };
  });
  const annualRain = site.rain.map(r => (r.every(v => v !== null) ? round(r.reduce((s, v) => s + (v as number), 0), 0) : null));
  return {
    title: 'Ngogo ripe fruit and rain by month',
    script: 'scripts/guide-data.ts',
    attribution: 'Real data: Potts KB, Watts DP, Langergraber KE, Mitani JC (2020) Biotropica 52: 521–532. Data: Dryad doi:10.5061/dryad.gf1vhhmk8, CC0. Ngogo, Kibale National Park, Uganda. Derived monthly aggregates by ChimpBench; not endorsed by the authors.',
    privacy: 'Site-level monthly values and species shares only; no tree positions or trail labels.',
    site: { ...site, annualRain, monthlyRfs: monthlyMedian(site.rfs).map(v => round(v, 0)), monthlyRain: monthlyMedian(site.rain).map(v => round(v, 1)),
      note: 'RFS is the site ripe fruit score of the source file (a crop-weighted index); rain in mm per month.' },
    species: { years: [phen.years[a], phen.years[b]], unit: 'share of monitored stems with ripe fruit', list: species, unmatched: phen.unmatched,
      note: 'The eight species of my forest that the Ngogo transect records; the ninth (Ficus sansibarica) uses the fig mean. My field-profile forest steps through these record years in order.' },
  };
}

function hashFiles(files: URL[]): string {
  const h = createHash('sha256');
  for (const f of files) { h.update(f.pathname.split('/MGOGO/')[1] ?? f.pathname); h.update(readFileSync(f)); }
  return h.digest('hex').slice(0, 16);
}

function paths() {
  const move = readJson('docs/data/movement-compare.json');
  const k = move.provenance.sim.bandwidthOverR as number;
  if (!(k > 0 && k < 1)) throw new Error(`movement-compare.json: bad bandwidthOverR ${k}`);
  // Gombe: the community range from all 15-min records (as scripts/compare-gombe-paths.ts), paths at 30 min like Taï and the sim.
  const wb = readXlsx(readFileSync(rel('data/raw/dryad-jg05d/ChimpanzeeRanges.xlsx')), b => inflateRawSync(b));
  const { follows, report } = gombeFollows(wb.sheet('AllPoints'));
  const range = communityRange(follows, k);
  const gDays = dayPaths(every30(follows) as PathPoint[][], range.r);
  // Sim: the follows cached by scripts/compare-movement.ts, each community normalized by its own range radius.
  const SIM = 'artifacts/compare-movement/sim-follows.json';
  const cache = JSON.parse(readFileSync(rel(SIM), 'utf8')) as { key: { simCodeHash: string; seeds: number[]; years: number; burnInDays: number }; sims: { seed: number; points: TrackPoint[] }[] };
  const sDays: DayPath[] = [], simR: number[] = [];
  for (const s of cache.sims) for (const g of [...new Set(s.points.map(p => p.group))].sort()) {
    const pts = s.points.filter(p => p.group === g), t = territory(pts, scaleMatchedBandwidth(pts, k, 50, 4));
    simR.push(t.shape.r);
    sDays.push(...dayPaths(byFollow(pts), t.shape.r));
  }
  const tsIn = (d: string) => readdirSync(rel(d)).filter(f => f.endsWith('.ts')).sort().map(f => rel(`${d}${f}`));
  const currentSim = hashFiles([...tsIn('src/sim/'), rel('src/simulation.ts'), rel('src/types.ts'), rel('data/params.json'), rel('src/field/categories.ts')]);
  const side = (days: DayPath[]) => ({
    fullDays: days.length,
    straight: round(median(days.map(d => d.straight)), 3), pathR: round(median(days.map(d => d.pathR)), 3), netR: round(median(days.map(d => d.netR)), 3),
    straightHist: histogram(days.map(d => d.straight), 0, 1, 20).density.map(v => round(v, 3)),
    paths: pickByQuantile(days, d => d.straight, 6).map(d => ({ straight: round(d.straight, 3), pathR: round(d.pathR, 3), netR: round(d.netR, 3), hours: round(d.hours, 1), pts: d.pts })),
  });
  return {
    title: 'Day paths, Gombe vs simulated',
    script: 'scripts/guide-data.ts',
    attribution: 'Real data: Pusey AE, Schroepfer-Walker K (2013) Female competition in chimpanzees. Phil Trans R Soc B 368: 20130077. Data: Dryad doi:10.5061/dryad.jg05d, CC0. Kasekela community, Gombe National Park, Tanzania, 2000–2003. Derived, normalized paths by ChimpBench; not endorsed by the authors.',
    privacy: 'Each path starts at the origin, is scaled by its community range radius r, rotated so its net displacement points up and snapped to a 0.1 r lattice. No coordinates, dates or identities.',
    method: 'Full-day follows (≥ 8 h, no gap > 1 h) at 30-min records. Six per side at evenly spaced straightness ranks (quantiles 1/12, 3/12 … 11/12), so neither side is cherry-picked. Straightness = net displacement ÷ summed 30-min steps, before snapping.',
    cell: 0.1,
    gombe: { rKm: round(range.r / 1000, 3), years: report.years, ...side(gDays) },
    sim: { rKm: round(median(simR) / 1000, 3), seeds: cache.key.seeds, status: cache.key.simCodeHash === currentSim ? 'measured' : 'measured on older sim code', simCodeHash: cache.key.simCodeHash, currentSimCodeHash: currentSim,
      generated: statSync(rel(SIM)).mtime.toISOString(), note: 'Simulated follows copy Taï group-day schedules (scripts/compare-movement.ts).', ...side(sDays) },
  };
}

function patrols() {
  const kk = readXlsx(readFileSync(rel('data/raw/dryad-kk33f/Patrol+data.xlsx')), b => inflateRawSync(b));
  const kkRecs = records(kk.sheet('data'));
  const ng = ngogoPatrols(kkRecs);
  const G = 'data/raw/dryad-z8w9ghxdb/';
  const whole = (() => { const b = readXlsx(readFileSync(rel(`${G}WholeStudyPatrolRate.xlsx`)), x => inflateRawSync(x)); return records(b.sheet(b.names[0])); })();
  const names = new Set<string>([...kkRecs.map(r => String(r.Male)), ...whole.map(r => String(r.Individual))]);
  // Ngogo: males listed on ≥ 20 patrols (60 of 61; the rest are too few to give a share). Gombe: all 24 males of the whole-study sheet.
  const ngShares = ng.males.filter(m => m.opp >= 20).map(m => m.joined / m.opp).sort((a, b) => a - b);
  const gShares = whole.map(r => Number(r['Patrol.Participation'])).filter(Number.isFinite).sort((a, b) => a - b);
  // Timeline: patrols per year with the community's adult males that year, so rates per male can be drawn.
  // Ngogo males per year = distinct males listed on that year's patrols (every listed male was a potential participant).
  const ngYears = new Map<number, { n: number; males: Set<string> }>();
  for (const r of kkRecs) {
    const y = +String(ng.patrols.find(p => p.id === Number(r['Patrol#']))?.date).slice(0, 4);
    const e = ngYears.get(y) ?? ngYears.set(y, { n: 0, males: new Set() }).get(y)!;
    e.males.add(String(r.Male));
  }
  for (const p of ng.patrols) ngYears.get(+p.date.slice(0, 4))!.n++;
  const book1 = (f: string) => { const b = readXlsx(readFileSync(rel(f)), x => inflateRawSync(x)); return records(b.sheet(b.names[0])); };
  const gEx = gombeExcursions(book1(`${G}PatrolsandPeriph.xlsx`)).filter(e => e.type === 'patrol'), pp = book1(`${G}PPdata.xlsx`);
  const gMales = new Map<number, number[]>();
  for (const r of pp) (gMales.get(Number(r.Year)) ?? gMales.set(Number(r.Year), []).get(Number(r.Year))!).push(Number(r['KK.Males']));
  const S = 'data/raw/dryad-sf7m0cgkg/';
  const fis = postFission(csvRecords(readFileSync(rel(`${S}patrol-data-quarterly.csv`), 'utf8')), csvRecords(readFileSync(rel(`${S}population_snapshots.csv`), 'utf8')));
  const timeline = {
    gombe: Array.from({ length: 2007 - 1978 + 1 }, (_, i) => 1978 + i).map(year => ({ year, n: gEx.filter(e => e.year === year).length, males: gMales.has(year) ? round(median(gMales.get(year)!), 1) : null })),
    ngogo: [...ngYears].sort((a, b) => a[0] - b[0]).map(([year, e]) => ({ year, n: e.n, males: e.males.size })),
    split: fis.perYear.map(y => ({ year: y.year, quarters: y.quarters, west: y.west, central: y.central, westMales: y.westMales, centralMales: y.centralMales, ngogoMales: y.ngogoMales })),
    notes: [
      'Gombe: patrols seen on year-round daily focal follows; males = the median count of adult males in the community that year (PPdata KK.Males).',
      'Ngogo 1996–2015: observed patrols only; the record carries no observation effort, so a quiet year may be a year with few observers. Males = distinct males listed on that year\'s patrols.',
      'Ngogo after the split: patrols per quarter by group; males = adults and late adolescents on 1 July.',
    ],
  };
  const out = {
    title: 'Who joins patrols: per-male participation',
    script: 'scripts/guide-data.ts',
    attribution: [
      'Ngogo: Langergraber KE, Watts DP, Vigilant L, Mitani JC (2017) PNAS 114: 7337–7342. Data: Dryad doi:10.5061/dryad.kk33f, CC0.',
      'Gombe: Massaro A, Gilby IC, Desai N, Weiss A, Feldblum JT, Pusey AE, Wilson ML (2022) Phil Trans R Soc B 377: 20210151. Data: Dryad doi:10.5061/dryad.z8w9ghxdb, CC0.',
      'Ngogo after the split: Sandel A, Mitani J, Langergraber K et al. (2026) Science. Data: Dryad doi:10.5061/dryad.sf7m0cgkg, CC0.',
    ],
    privacy: 'One anonymous share per male, sorted; no names, codes, dates or covariates.',
    ngogo: { site: 'Ngogo', years: [+ng.patrols[0].date.slice(0, 4), +ng.patrols[ng.patrols.length - 1].date.slice(0, 4)], males: ngShares.length, rule: 'share of the patrols a male was listed on that he joined (males listed on ≥ 20)', median: round(median(ngShares), 3), shares: ngShares.map(v => round(v, 3)) },
    gombe: { site: 'Gombe', years: [1978, 2007], males: gShares.length, rule: 'share of observed patrol opportunities a male joined over the whole study', median: round(median(gShares), 3), shares: gShares.map(v => round(v, 3)) },
    timeline,
    sim: { status: 'pending (patrol proof not run yet)' },
  };
  return { out, names };
}

function latest(files: string[], pred: (m: { profile?: string; days?: number; seeds?: number[] }) => boolean): string | null {
  let best: string | null = null, when = '';
  for (const f of files) {
    try { const m = readJson(f).manifest; if (m && pred(m) && m.date > when) { best = f; when = m.date; } } catch { /* not a scorecard */ }
  }
  return best;
}

function validation(scoreFile: string, freshFile: string | null, names: Set<string>) {
  // Published papers name some victims; the guide does not repeat chimp names (PROVENANCE files), so they are withheld.
  const redact = (v: unknown) => (typeof v === 'string' ? v.split(/(\b[A-Za-z]+\b)/).map(w => (names.has(w) ? '(name withheld)' : w)).join('') : v);
  const T = readJson('data/targets.json');
  const sc = readJson(scoreFile), fr = freshFile ? readJson(freshFile) : null;
  const rows = new Map<string, any>(sc.rows.map((r: any) => [r.id, r])), frows = new Map<string, any>((fr?.rows ?? []).map((r: any) => [r.id, r]));
  // Cross-check: the per-row keys reproduce the scorecard's own summary.
  const check = (rs: any[], summary: Record<string, Record<string, number>>, file: string) => {
    const c: Record<string, number> = {};
    for (const r of rs) { const k = countedAs(r); c[k] = (c[k] ?? 0) + 1; }
    for (const [k, v] of Object.entries(summary.all)) if ((c[k] ?? 0) !== v) throw new Error(`${file}: summary.all.${k} = ${v} but the rows give ${c[k] ?? 0}`);
  };
  check(sc.rows, sc.summary, scoreFile);
  if (fr) check(fr.rows, fr.summary, freshFile!);
  const cited: Record<string, { short: string; url: string | null }> = {};
  const cite = (key: string) => { const s = T.sources[key]; cited[key] = { short: shortCite(s, key), url: s?.url ?? (s?.doi ? `https://doi.org/${s.doi}` : null) }; return key; };
  const targets = T.targets.map((t: any) => {
    const r = rows.get(t.id), f = frows.get(t.id);
    const base = { id: t.id, domain: domainOf(t.id), metric: t.metric, role: t.role, encoded: !!t.encoded, evidence: t.evidence, units: t.accept?.units ?? '', basis: redact(t.accept?.basis ?? ''),
      field: (t.field ?? []).slice(0, 2).map((x: any) => ({ population: redact(x.population), years: x.years, value: redact(x.value) })), sources: (t.sources ?? []).slice(0, 3).map(cite) };
    if (!r) {
      const reason = t.notScorable ? `not scorable: ${t.notScorable}` : 'added after this run; scored at the next proof';
      return { ...base, verdict: 'unscored', key: t.notScorable ? 'unscorable' : 'unscored', flags: t.notScorable ? ['not scorable'] : [], band: t.accept ? `${t.accept.lo ?? ''}–${t.accept.hi ?? ''}` : '', range: t.accept && Number.isFinite(t.accept.lo) && Number.isFinite(t.accept.hi) ? { lo: t.accept.lo, hi: t.accept.hi } : null, note: reason, mean: null, perSeed: [], fresh: null };
    }
    // Sex-specific targets are scored on each part (e.g. male and female feeding shares), so the parts are kept with the pooled mean.
    const parts = r.parts && fin2(r.parts.male) && fin2(r.parts.female) ? { male: sig(r.parts.male), female: sig(r.parts.female) } : undefined;
    return { ...base, verdict: r.verdict, key: countedAs(r), flags: r.flags, band: r.band, range: parseBand(r.band), note: redact(r.note), mean: sig(r.mean), perSeed: (r.perSeed ?? []).map(sig), ...(parts ? { parts } : {}),
      fresh: f ? { verdict: f.verdict, key: countedAs(f), mean: sig(f.mean) } : null };
  });
  const tally = (key: (t: any) => string | null) => { const o: Record<string, Record<string, number>> = { fitted: {}, 'held-out': {}, all: {} }; for (const t of targets) { const k = key(t); if (!k) continue; o[t.role][k] = (o[t.role][k] ?? 0) + 1; o.all[k] = (o.all[k] ?? 0) + 1; } return o; };
  const params = readJson('data/params.json').params as { evidence: string }[];
  const evidence: Record<string, number> = {};
  for (const p of params) evidence[p.evidence] = (evidence[p.evidence] ?? 0) + 1;
  const man = (s: any, file: string) => ({ file, date: s.manifest.date.slice(0, 10), days: s.manifest.days, seeds: s.manifest.seeds, burnInDays: s.manifest.burnInDays, protocolHash: s.manifest.protocolHash, frozenAt: s.manifest.frozenAt, phenology: s.manifest.phenology });
  return {
    title: 'Validation program: every target and its latest verdict',
    script: 'scripts/guide-data.ts',
    runs: { standard: man(sc, scoreFile), fresh: fr ? man(fr, freshFile!) : null },
    counts: { targets: targets.length, fitted: targets.filter((t: any) => t.role === 'fitted').length, heldOut: targets.filter((t: any) => t.role === 'held-out').length, encoded: targets.filter((t: any) => t.encoded).length, sources: Object.keys(T.sources).length },
    summary: { standard: tally(t => t.key), fresh: tally(t => (t.fresh ? t.fresh.key : t.key)) },
    registry: { params: params.length, evidence, note: 'data/params.json: H/M = field studies (high / medium evidence); calibrated = fitted to targets; assumed, stylized and design = choices, labelled as such.' },
    datasets: DATASETS,
    sources: cited,
    targets,
  };
}

// Open datasets integrated so far (years and sizes as stated in each data/raw/*/PROVENANCE.md and the derived files).
const DATASETS = [
  { id: 'gombe-patrols', name: 'Boundary patrols and periphery visits', site: 'Gombe', years: [1978, 2007], size: '180 patrols, 147 periphery visits', use: 'test', licence: 'CC0', cite: 'Massaro et al. 2022', url: 'https://doi.org/10.5061/dryad.z8w9ghxdb' },
  { id: 'ngogo-patrols', name: 'Boundary patrols and who joined', site: 'Ngogo', years: [1996, 2015], size: '284 patrols, 61 males', use: 'test', licence: 'CC0', cite: 'Langergraber et al. 2017', url: 'https://doi.org/10.5061/dryad.kk33f' },
  { id: 'tai-territory', name: 'Territory sizes', site: 'Taï', years: [1997, 2016], size: '53 group-years', use: 'test', licence: 'CC BY 4.0', cite: 'Lemoine et al. 2020', url: 'https://doi.org/10.1098/rsos.200577' },
  { id: 'ngogo-phenology', name: 'Tree phenology and rain', site: 'Ngogo', years: [1998, 2017], size: '177,349 tree-months, 20 species', use: 'build', licence: 'CC0', cite: 'Potts et al. 2020', url: 'https://doi.org/10.5061/dryad.gf1vhhmk8' },
  { id: 'gombe-paths', name: '15-minute focal paths', site: 'Gombe', years: [2000, 2003], size: '55,076 positions, 1,330 follows', use: 'test', licence: 'CC0', cite: 'Pusey & Schroepfer-Walker 2013', url: 'https://doi.org/10.5061/dryad.jg05d' },
  { id: 'ngogo-gps', name: 'GPS ranging', site: 'Ngogo', years: [2011, 2023], size: '166,826 fixes, 162 chimps', use: 'test', licence: 'CC BY 4.0', cite: 'Sandel et al. 2026', url: 'https://doi.org/10.5281/zenodo.18603419' },
  { id: 'tai-movement', name: 'Movement, activity and border stops', site: 'Taï', years: [2013, 2016], size: '42,385 records, 625 border stops', use: 'test', licence: 'CC BY 4.0', cite: 'Lemoine et al. 2023', url: 'https://doi.org/10.1371/journal.pbio.3002350' },
  { id: 'ngogo-fission', name: 'Patrols after the split', site: 'Ngogo', years: [2016, 2024], size: '36 quarters, two groups', use: 'test', licence: 'CC0', cite: 'Sandel et al. 2026', url: 'https://doi.org/10.5061/dryad.sf7m0cgkg' },
];

// ================================================================================================ main

function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };
  const CHECK = args.includes('--check'), OUT_DIR = flag('out-dir'); // --out-dir: write there instead of docs/data (proof dry runs)
  const dir = 'artifacts/validation/', files = readdirSync(rel(dir)).filter(f => f.endsWith('.json')).map(f => dir + f);
  const std = [48, 7, 21, 5, 11].join();
  const scoreFile = flag('scorecard') ?? latest(files.filter(f => /-field[^/]*\.json$/.test(f) && !/review/.test(f)), m => m.profile === 'field' && m.days === 365 && (m.seeds ?? []).join() === std);
  const freshFile = flag('fresh') ?? latest(files.filter(f => /-fresh\.json$/.test(f)), m => m.profile === 'field' && m.days === 365);
  if (!scoreFile) throw new Error('no field scorecard with the standard seeds in artifacts/validation/');

  const { out: pat, names: chimpNames } = patrols();
  // Author surnames of the cited sources (e.g. Wilson) can coincide with a chimp's name; they are citations, not identities.
  const authors = new Set<string>(Object.values(readJson('data/targets.json').sources as Record<string, { authors?: string }>).flatMap(s => (s.authors ?? '').split(/[^A-Za-z]+/)));
  const names = new Set([...chimpNames].filter(n => !authors.has(n)));
  const outputs: Record<string, unknown> = {
    'docs/data/guide-fruit.json': fruit(),
    'docs/data/guide-paths.json': paths(),
    'docs/data/guide-patrols.json': pat,
    'docs/data/guide-validation.json': validation(scoreFile, freshFile, names),
  };
  const counts = ['rfs', 'monthlyRfs', 'annualRain', 'n', 'males', 'fullDays', 'params', 'targets', 'fitted', 'heldOut', 'encoded', 'sources', 'days', 'burnInDays', 'protocolHash'];
  let drift = 0;
  for (const [file, data] of Object.entries(outputs)) {
    // Attribution strings are fixed literals above (author names may coincide with a chimp's name); everything else is guarded.
    const { attribution: _a, ...guarded } = data as Record<string, unknown>;
    assertNonSensitive(guarded, names, counts);
    const text = JSON.stringify({ ...(data as object), generated: new Date().toISOString() }) + '\n';
    if (CHECK) {
      const strip = (s: string) => { const o = JSON.parse(s); delete o.generated; return JSON.stringify(o); };
      const same = existsSync(rel(file)) && strip(readFileSync(rel(file), 'utf8')) === strip(text);
      if (!same) { drift++; console.error(`${file}: differs from a fresh derivation`); }
    } else writeFileSync(rel(OUT_DIR ? `${OUT_DIR}/${file.split('/').pop()}` : file), text);
    console.log(`${CHECK ? 'checked' : 'wrote'} ${file} (${(Buffer.byteLength(text) / 1024).toFixed(1)} KB)`);
  }
  console.log(`scorecards: ${scoreFile}${freshFile ? `, fresh ${freshFile}` : ''}`);
  if (drift) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
