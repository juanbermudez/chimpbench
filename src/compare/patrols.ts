import { mulberry32 } from './sampling';
import { histogram } from './stats';
import { excelDate, sharedStrings, sheetRows, type Cell } from './xlsx';

// Real-side boundary-patrol statistics and the pre-registered T-PAT-8 / T-BRD-1 computations (realism C6 patrol
// corrections, docs/realism-design.md §5.3.1 P5). Pure functions over parsed rows; scripts/compare-patrols.ts reads
// data/raw and writes docs/data/patrol-compare.json. Only derived statistics leave this module's callers: no dates finer
// than a month, no coordinates, no individual names.
//
// Also a dependency-free .xlsx reader. An .xlsx file is a zip of XML parts; the caller injects raw-deflate
// decompression (node:zlib inflateRawSync), so this module stays free of node types.

// ------------------------------------------------------------------------------------------------ zip / xlsx

export type Inflate = (raw: Uint8Array) => Uint8Array;

/** Entries of a zip archive (stored or deflated, no ZIP64, no encryption), read through the central directory. */
export function unzip(buf: Uint8Array, inflateRaw: Inflate): Map<string, Uint8Array> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), u32 = (o: number) => dv.getUint32(o, true), u16 = (o: number) => dv.getUint16(o, true);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) if (u32(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip: end of central directory not found (not a zip file?)');
  const count = u16(eocd + 10), cdOff = u32(eocd + 16);
  if (count === 0xffff || cdOff === 0xffffffff) throw new Error('zip: ZIP64 archives are not supported');
  const dec = new TextDecoder(), out = new Map<string, Uint8Array>();
  let p = cdOff;
  for (let k = 0; k < count; k++) {
    if (u32(p) !== 0x02014b50) throw new Error(`zip: bad central directory entry ${k} at byte ${p}`);
    const flags = u16(p + 8), method = u16(p + 10), csize = u32(p + 20), usize = u32(p + 24);
    const nlen = u16(p + 28), xlen = u16(p + 30), clen = u16(p + 32), loc = u32(p + 42);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (flags & 1) throw new Error(`zip: ${name} is encrypted`);
    if (u32(loc) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`);
    const start = loc + 30 + u16(loc + 26) + u16(loc + 28), raw = buf.subarray(start, start + csize);
    let data: Uint8Array;
    if (method === 0) data = raw.slice();
    else if (method === 8) data = inflateRaw(raw);
    else throw new Error(`zip: ${name} uses unsupported compression method ${method}`);
    if (data.length !== usize) throw new Error(`zip: ${name} inflated to ${data.length} bytes, expected ${usize}`);
    out.set(name, data);
  }
  return out;
}

const xmlDecode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag: string, name: string) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag); return m ? xmlDecode(m[1]) : undefined; };

export interface Workbook { names: string[]; sheet(name: string): Cell[][] }

/** Sheets of an .xlsx workbook by name (workbook.xml + its relationships), rows parsed by ./xlsx. */
export function readXlsx(buf: Uint8Array, inflateRaw: Inflate): Workbook {
  const z = unzip(buf, inflateRaw), dec = new TextDecoder(), text = (p: string) => { const b = z.get(p); return b ? dec.decode(b) : ''; };
  const wb = text('xl/workbook.xml');
  if (!wb) throw new Error('xlsx: xl/workbook.xml missing');
  const rels = new Map<string, string>();
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], 'Id'), target = attr(m[0], 'Target');
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const parts = new Map<string, string>();
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], 'name'), rid = attr(m[0], 'r:id'), part = rid ? rels.get(rid) : undefined;
    if (name === undefined || !part) throw new Error(`xlsx: sheet entry without a resolvable part: ${m[0]}`);
    parts.set(name, part);
  }
  const ss = text('xl/sharedStrings.xml'), strings = ss ? sharedStrings(ss) : [];
  return {
    names: [...parts.keys()],
    sheet(name) {
      const part = parts.get(name);
      if (!part) throw new Error(`xlsx: no sheet "${name}" (have ${[...parts.keys()].join(', ')})`);
      const xml = text(part);
      if (!xml) throw new Error(`xlsx: part ${part} of sheet "${name}" missing`);
      return sheetRows(xml, strings);
    },
  };
}

/** Minimal CSV (comma, optional double quotes, no embedded newlines) → header-keyed records. */
export function csvRecords(text: string): Record<string, string>[] {
  const split = (line: string) => { const out: string[] = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  const head = split(lines[0]);
  return lines.slice(1).map(l => { const v = split(l); return Object.fromEntries(head.map((h, i) => [h, v[i] ?? ''])); });
}

// ------------------------------------------------------------------------------------------------ statistics

/** Average ranks (ties share the mean rank). */
export function avgRanks(v: number[]): number[] {
  const idx = v.map((x, i) => i).sort((a, b) => v[a] - v[b]), r = new Array<number>(v.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && v[idx[j + 1]] === v[idx[i]]) j++; for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
}

/** Spearman's ρ: Pearson correlation of average ranks (NaN when either side is constant). */
export function spearmanRho(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return NaN;
  const ra = avgRanks(a), rb = avgRanks(b), n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += ra[i]; mb += rb[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (ra[i] - ma) * (rb[i] - mb); saa += (ra[i] - ma) ** 2; sbb += (rb[i] - mb) ** 2; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : NaN;
}

/** Percentile p (0–1) with linear interpolation between order statistics (R type 7). */
export function percentile(values: number[], p: number): number {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = (s.length - 1) * p, lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
}

export const median = (v: number[]) => percentile(v, 0.5);
export const meanOf = (v: number[]) => { const f = v.filter(Number.isFinite); return f.length ? f.reduce((a, x) => a + x, 0) / f.length : NaN; };
export const sdOf = (v: number[]) => { const f = v.filter(Number.isFinite), m = meanOf(f); return f.length > 1 ? Math.sqrt(f.reduce((a, x) => a + (x - m) ** 2, 0) / (f.length - 1)) : NaN; };

/** Logistic regression of y (0/1) on one predictor with an intercept, by Newton–Raphson. Not converged on separation. */
export function logistic1(x: number[], y: number[], iters = 60): { b0: number; b1: number; converged: boolean } {
  let b0 = 0, b1 = 0;
  for (let it = 0; it < iters; it++) {
    let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
    for (let i = 0; i < x.length; i++) {
      const p = 1 / (1 + Math.exp(-(b0 + b1 * x[i]))), w = p * (1 - p), r = y[i] - p;
      g0 += r; g1 += r * x[i]; h00 += w; h01 += w * x[i]; h11 += w * x[i] * x[i];
    }
    const det = h00 * h11 - h01 * h01;
    if (!(det > 1e-12)) return { b0, b1, converged: false };
    const d0 = (h11 * g0 - h01 * g1) / det, d1 = (h00 * g1 - h01 * g0) / det;
    b0 += d0; b1 += d1;
    if (!Number.isFinite(b0) || !Number.isFinite(b1) || Math.abs(b1) > 50) return { b0, b1, converged: false };
    if (Math.abs(d0) + Math.abs(d1) < 1e-10) return { b0, b1, converged: true };
  }
  return { b0, b1, converged: false };
}

/** 32-bit FNV-1a hash of a label: a readable, deterministic bootstrap seed per target. */
export function seedOf(label: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < label.length; i++) { h ^= label.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// ------------------------------------------------------------------------------------------------ calendar helpers

/** Month index y·12 + (m − 1) of an ISO date. */
export const monthIndex = (iso: string) => +iso.slice(0, 4) * 12 + +iso.slice(5, 7) - 1;
export const monthLabel = (k: number) => `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`;
export const daysInMonth = (k: number) => new Date(Date.UTC(Math.floor(k / 12), (k % 12) + 1, 0)).getUTCDate();
const dayMs = 86400000;
const r4 = (v: number) => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
const spread = (v: number[]) => ({ median: r4(median(v)), mean: r4(meanOf(v)), sd: r4(sdOf(v)), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null, n: v.length });

// ------------------------------------------------------------------------------------------------ Ngogo patrols (Dryad kk33f)

// Langergraber KE, Watts DP, Vigilant L, Mitani JC (2017) PNAS 114: 7337, data Dryad doi:10.5061/dryad.kk33f (CC0). Sheet
// "data": one row per male × patrol: Patrol#, date (Excel serial), male, participation 0/1, covariates. Every male
// listed on a patrol was a potential participant (an "opportunity"). Only males are listed.

export interface NgogoPatrol { id: number; date: string; listed: number; joined: number }
/** Per male (anonymous): opportunities and patrols joined, by year. */
export interface MaleRecord { opp: number; joined: number; byYear: Map<number, { opp: number; joined: number }> }

export function ngogoPatrols(recs: Record<string, Cell>[]): { patrols: NgogoPatrol[]; males: MaleRecord[] } {
  const byId = new Map<number, NgogoPatrol>(), byMale = new Map<string, MaleRecord>();
  for (const r of recs) {
    const id = Number(r['Patrol#']), serial = r['Date (M/D/Y)'], male = String(r.Male ?? ''), part = r['Patrol participation (0 = No, 1 = Yes)'];
    if (!Number.isInteger(id) || typeof serial !== 'number' || !male || (part !== 0 && part !== 1)) throw new Error(`kk33f: malformed row ${JSON.stringify(r)}`);
    const date = excelDate(serial), year = +date.slice(0, 4);
    const p = byId.get(id) ?? byId.set(id, { id, date, listed: 0, joined: 0 }).get(id)!;
    if (p.date !== date) throw new Error(`kk33f: patrol ${id} carries two dates (${p.date}, ${date})`);
    p.listed++; p.joined += part;
    const m = byMale.get(male) ?? byMale.set(male, { opp: 0, joined: 0, byYear: new Map() }).get(male)!;
    const y = m.byYear.get(year) ?? m.byYear.set(year, { opp: 0, joined: 0 }).get(year)!;
    m.opp++; m.joined += part; y.opp++; y.joined += part;
  }
  return { patrols: [...byId.values()].sort((a, b) => a.id - b.id), males: [...byMale.values()] };
}

/** Patrol-date diagnostics: count per month of year, the June–July share, and gaps between consecutive patrols. */
export function dateProfile(dates: string[]) {
  const sorted = [...dates].sort(), byMonth = new Array(12).fill(0), gaps: number[] = [];
  for (const d of sorted) byMonth[+d.slice(5, 7) - 1]++;
  for (let i = 1; i < sorted.length; i++) gaps.push((Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / dayMs);
  return { byMonth, junJulShare: r4((byMonth[5] + byMonth[6]) / Math.max(1, sorted.length)), longestGapDays: gaps.length ? Math.max(...gaps) : 0, gapsOver250Days: gaps.filter(g => g > 250).length, first: sorted[0]?.slice(0, 7) ?? null, last: sorted[sorted.length - 1]?.slice(0, 7) ?? null };
}

/**
 * Ngogo summary. `effortDays` is the observation effort the source paper reports for the whole record (the file has
 * none per month), so the weekly rate is per observed week. Per-male-year counts are patrols a male joined in a year in
 * which he was listed at least once: observed patrols only, a lower bound where observation stopped for months.
 */
export function ngogoSummary(d: { patrols: NgogoPatrol[]; males: MaleRecord[] }, effortDays: number) {
  const P = d.patrols, years = new Map<number, number>();
  for (const p of P) years.set(+p.date.slice(0, 4), (years.get(+p.date.slice(0, 4)) ?? 0) + 1);
  const shares = P.map(p => p.joined / p.listed), perMaleYear: number[] = [];
  for (const m of d.males) for (const y of m.byYear.values()) perMaleYear.push(y.joined);
  const part = d.males.map(m => m.joined / m.opp), part20 = d.males.filter(m => m.opp >= 20).map(m => m.joined / m.opp);
  return {
    patrols: P.length, perYear: [...years].sort((a, b) => a[0] - b[0]).map(([year, n]) => ({ year, n })),
    effortDays, perObservedWeek: r4(P.length / effortDays * 7), daysPerPatrol: r4(effortDays / P.length),
    malesPerPatrol: spread(P.map(p => p.joined)), shareOfListedMales: spread(shares),
    participation: { meanAllMales: r4(meanOf(part)), males: part.length, meanMales20: r4(meanOf(part20)), males20: part20.length },
    perMaleYear: spread(perMaleYear),
    dates: dateProfile(P.map(p => p.date)),
  };
}

// ------------------------------------------------------------------------------------------------ Gombe patrols (Dryad z8w9ghxdb)

// Massaro A, Gilby IC, Desai N, Weiss A, Feldblum JT, Pusey AE, Wilson ML (2022) Phil Trans R Soc B 377: 20210151, data
// Dryad doi:10.5061/dryad.z8w9ghxdb (CC0). PatrolsandPeriph: one row per boundary patrol or periphery visit seen during
// a daily focal follow (1978–2007): date, focal, start time, party counts (males and females ≥ 12 y, swollen
// females), type, minutes, focal feeding. PPdata: per male-year patrols joined of opportunities and the community's
// adult males (KK.Males). WholeStudyPatrolRate: per male, patrols joined over the whole study.

export interface Excursion { year: number; month: number; type: 'patrol' | 'periph'; minutes: number; total: number; males: number; females: number; swollen: number; feedPerH: number }

export function gombeExcursions(recs: Record<string, Cell>[]): Excursion[] {
  return recs.map(r => {
    const t = String(r.Type), date = excelDate(Number(r.DATE));
    if (t !== 'Patrol' && t !== 'Periph') throw new Error(`PatrolsandPeriph: unknown type ${t}`);
    const e: Excursion = { year: +date.slice(0, 4), month: +date.slice(5, 7), type: t === 'Patrol' ? 'patrol' : 'periph', minutes: Number(r.Total_Minutes), total: Number(r.Total_Individuals), males: Number(r.Males), females: Number(r.Females), swollen: Number(r.Swollen_Females), feedPerH: Number(r.Feeding_Minutes_per_hour) };
    if (![e.year, e.minutes, e.total, e.males, e.females, e.swollen, e.feedPerH].every(Number.isFinite)) throw new Error(`PatrolsandPeriph: non-numeric row ${JSON.stringify(r)}`);
    return e;
  });
}

/** Patrols vs periphery visits: counts per year (0 for study years without one), durations, party composition, feeding. */
export function excursionSummary(ex: Excursion[], years: [number, number]) {
  const of = (type: Excursion['type']) => {
    const e = ex.filter(x => x.type === type), perYear: number[] = [], byMonth = new Array(12).fill(0);
    for (let y = years[0]; y <= years[1]; y++) perYear.push(e.filter(x => x.year === y).length);
    for (const x of e) byMonth[x.month - 1]++;
    return { n: e.length, perYear, annual: spread(perYear), perWeek: r4(e.length / ((years[1] - years[0] + 1) * 365.25 / 7)), minutes: spread(e.map(x => x.minutes)), males: spread(e.map(x => x.males)), females: spread(e.map(x => x.females)),
      withFemales: r4(e.filter(x => x.females > 0).length / Math.max(1, e.length)), swollen: spread(e.map(x => x.swollen)), party: spread(e.map(x => x.total)), feedMinPerH: spread(e.map(x => x.feedPerH)), byMonth };
  };
  const patrol = of('patrol'), periph = of('periph');
  return { years, patrol, periph, patrolShareOfExcursions: r4(patrol.n / Math.max(1, patrol.n + periph.n)) };
}

/**
 * Per-male participation: patrols joined per male-year (years with an opportunity), the share of opportunities joined per
 * male-year and over the whole study (Massaro et al. report 74.5 ± 11.1%), and the community's adult males per year
 * (median over that year's male rows; KK.Males is averaged over each male's own days, so single rows can be short).
 */
export function gombeParticipation(ppdata: Record<string, Cell>[], whole: Record<string, Cell>[]) {
  const withOpp = ppdata.filter(r => Number(r['Obs.Patrol']) > 0);
  const kk = new Map<number, number[]>();
  for (const r of ppdata) (kk.get(Number(r.Year)) ?? kk.set(Number(r.Year), []).get(Number(r.Year))!).push(Number(r['KK.Males']));
  const wholePart = whole.map(r => Number(r['Patrol.Participation'])).filter(Number.isFinite);
  return { perMaleYear: spread(withOpp.map(r => Number(r.Patrol))), participationPerMaleYear: spread(withOpp.map(r => Number(r.Patrol) / Number(r['Obs.Patrol']))),
    participationWholeStudy: spread(wholePart), communityMalesPerYear: spread([...kk.values()].map(v => median(v))) };
}

// ------------------------------------------------------------------------------------------------ Ngogo after the fission (Dryad sf7m0cgkg)

// Sandel A, Mitani J, Langergraber K et al. (2026) Science, data Dryad doi:10.5061/dryad.sf7m0cgkg (CC0).
// patrol-data-quarterly.csv: patrols per quarter by the Western and Central groups (2016–2024); population_snapshots.csv:
// group size by age class and sex on 1 July of each year. Males counted: adults (> 15 y) and late adolescents (12–15 y).

export function postFission(quarterly: Record<string, string>[], population: Record<string, string>[]) {
  const q = new Map<number, { West: number; Central: number; quarters: number }>();
  for (const r of quarterly) {
    const y = +r.Year, g = r.Group === 'Western' ? 'West' : r.Group === 'Central' ? 'Central' : null, n = +r.Count;
    if (!g || !Number.isFinite(y) || !Number.isFinite(n)) throw new Error(`patrol-data-quarterly: bad row ${JSON.stringify(r)}`);
    const e = q.get(y) ?? q.set(y, { West: 0, Central: 0, quarters: 0 }).get(y)!;
    e[g] += n; if (g === 'West') e.quarters++;
  }
  const males = new Map<string, number>();
  for (const r of population) if (r.sex === 'M' && (r.age_class === 'adult' || r.age_class === 'l_adolescent')) males.set(`${r.community}|${r.year}`, (males.get(`${r.community}|${r.year}`) ?? 0) + +r.count);
  const perYear = [...q].sort((a, b) => a[0] - b[0]).map(([year, e]) => {
    const wm = males.get(`West|${year}`) ?? null, cm = males.get(`Central|${year}`) ?? null;
    return { year, quarters: e.quarters, west: e.West, central: e.Central, westMales: wm, centralMales: cm, ngogoMales: males.get(`Ngogo|${year}`) ?? null,
      westPer10Males: wm ? r4(e.West / wm * 10) : null, centralPer10Males: cm ? r4(e.Central / cm * 10) : null };
  });
  const quarters = quarterly.filter(r => r.Group === 'Western').map(r => ({ period: `${r.Year} ${r.Quarter}`, west: +r.Count, central: +(quarterly.find(c => c.Group === 'Central' && c.Year === r.Year && c.Quarter === r.Quarter)?.Count ?? NaN) }));
  const after = perYear.filter(y => y.westMales !== null && y.centralMales !== null && y.quarters === 4);
  const sum = (f: (y: (typeof after)[number]) => number) => after.reduce((a, y) => a + f(y), 0);
  return {
    perYear, quarters,
    split: { years: after.length ? [after[0].year, after[after.length - 1].year] : null,
      westPerYear: r4(sum(y => y.west) / Math.max(1, after.length)), centralPerYear: r4(sum(y => y.central) / Math.max(1, after.length)),
      westPer10MaleYears: r4(sum(y => y.west) / sum(y => y.westMales!) * 10), centralPer10MaleYears: r4(sum(y => y.central) / sum(y => y.centralMales!) * 10),
      westMales: spread(after.map(y => y.westMales!)), centralMales: spread(after.map(y => y.centralMales!)) },
    malesByYear: [...males].map(([k, n]) => ({ community: k.split('|')[0], year: +k.split('|')[1], n })).sort((a, b) => a.year - b.year || (a.community < b.community ? -1 : 1)),
  };
}

// ------------------------------------------------------------------------------------------------ Ngogo phenology (Dryad gf1vhhmk8)

// Potts KB, Watts DP, Langergraber KE, Mitani JC (2020) Biotropica, data Dryad doi:10.5061/dryad.gf1vhhmk8 (CC0).
// phenology_file_Jan2020.csv: one row per month; RFS = the site's ripe fruit score (fruit availability index).

export function monthlyFruit(recs: Record<string, string>[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of recs) {
    const y = +r.year, m = +r.NumericMonth, v = parseFloat(r.RFS);
    if (Number.isInteger(y) && m >= 1 && m <= 12 && Number.isFinite(v)) out.set(y * 12 + m - 1, v);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ T-PAT-8: patrols and fruit

export interface PatrolMonth { k: number; patrols: number; rfs: number }

/** Months of `span` (inclusive month indices) that have a fruit value, with the patrols dated in each (0 if none). */
export function patrolMonths(dates: string[], fruit: Map<number, number>, span: [number, number]): PatrolMonth[] {
  const per = new Map<number, number>();
  for (const d of dates) per.set(monthIndex(d), (per.get(monthIndex(d)) ?? 0) + 1);
  const out: PatrolMonth[] = [];
  for (let k = span[0]; k <= span[1]; k++) { const f = fruit.get(k); if (f !== undefined) out.push({ k, patrols: per.get(k) ?? 0, rfs: f }); }
  return out;
}

/**
 * §5.3.1 P5 T-PAT-8: Spearman ρ between the monthly patrol rate and monthly fruit availability, with a bootstrap 90% CI
 * over months (percentile, months resampled with replacement). The rate is the month's patrol count (months are the
 * unit; dividing by days per month only reorders tied counts by month length). Sensitivities, not scored: per-30-day
 * rates, and months with at least one patrol (months that were certainly observed).
 */
export function patrolFruitBand(months: PatrolMonth[], B: number, seed: number) {
  const rate = months.map(m => m.patrols), rfs = months.map(m => m.rfs), n = months.length, rng = mulberry32(seed), boot: number[] = [];
  let degenerate = 0;
  for (let b = 0; b < B; b++) {
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < n; i++) { const j = Math.floor(rng() * n); x.push(rate[j]); y.push(rfs[j]); }
    const v = spearmanRho(x, y);
    if (Number.isFinite(v)) boot.push(v); else degenerate++;
  }
  const seen = months.filter(m => m.patrols > 0);
  return {
    months: n, patrols: rate.reduce((a, v) => a + v, 0), monthsWithoutPatrol: rate.filter(v => v === 0).length,
    rho: spearmanRho(rate, rfs), lo: percentile(boot, 0.05), hi: percentile(boot, 0.95), replicates: boot.length, degenerate,
    rhoPer30Days: spearmanRho(months.map(m => m.patrols / daysInMonth(m.k) * 30), rfs),
    monthsWithPatrol: seen.length, rhoMonthsWithPatrol: spearmanRho(seen.map(m => m.patrols), seen.map(m => m.rfs)),
  };
}

// ------------------------------------------------------------------------------------------------ T-BRD-1: advance after border stops

// Lemoine S, Samuni L, Crockford C, Wittig RM (2023) PLOS Biol 21: e3002350, S3 Data (CC BY 4.0): stops of ≥ 5 min at
// peripheral hills (≥ 230 m) and peripheral low places (≤ 180 m) inside the Taï East–South overlap zone; 'approach
// rivals' = the following movement went toward the rivals (1) or not (0); 'adult party size' = all adults of both sexes
// within visibility of the focal (the article's methods). No count of males is recorded.

export interface BorderStop { cluster: string; group: string; advance: 0 | 1; adults: number; distCentreM: number; distRivalsM: number; minutes: number; hill: boolean }

/** A date cell as ISO: an Excel serial or an M/D/YYYY string (S3 Data mix both). */
export function isoDate(v: Cell): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) return excelDate(v);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v ?? '').trim());
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

export function borderStops(recs: Record<string, Cell>[]): BorderStop[] {
  return recs.map(r => {
    const adv = r['approach rivals'], adults = Number(r['adult party size']), g = String(r.group ?? ''), day = isoDate(r.new_date);
    if ((adv !== 0 && adv !== 1) || !Number.isFinite(adults) || !g || !day) throw new Error(`S3 Data: malformed row ${JSON.stringify(r)}`);
    return { cluster: `${g}|${day}`, group: g, advance: adv, adults, distCentreM: Number(r['distance to centre']), distRivalsM: Number(r['distance to rivals']), minutes: Number(r['time spent']), hill: /^hill/i.test(String(r.location_ID ?? '')) };
  });
}

/**
 * §5.3.1 P5 T-BRD-1: the share of border stops followed by an advance toward the rivals, and its logistic slope on the
 * number of adults present (log-odds per adult; S3 Data count adults, not males). Intervals: percentile 90% of a
 * cluster bootstrap resampling group-days (the article models dates nested in groups as a random effect); a row
 * bootstrap is reported beside it. Replicates in which the slope does not converge are dropped and counted.
 */
export function brd1Band(stops: BorderStop[], B: number, seed: number) {
  const fit = (s: BorderStop[]) => { const f = logistic1(s.map(x => x.adults), s.map(x => x.advance)); return f.converged ? f.b1 : NaN; };
  const shareOf = (s: BorderStop[]) => s.reduce((a, x) => a + x.advance, 0) / s.length;
  const byCluster = new Map<string, BorderStop[]>();
  for (const s of stops) (byCluster.get(s.cluster) ?? byCluster.set(s.cluster, []).get(s.cluster)!).push(s);
  const clusters = [...byCluster.keys()].sort().map(k => byCluster.get(k)!);
  const rng = mulberry32(seed), cs: number[] = [], cb: number[] = [], rs: number[] = [], rb: number[] = [];
  let dropped = 0;
  for (let b = 0; b < B; b++) {
    const s: BorderStop[] = [];
    for (let i = 0; i < clusters.length; i++) s.push(...clusters[Math.floor(rng() * clusters.length)]);
    cs.push(shareOf(s)); const v = fit(s); if (Number.isFinite(v)) cb.push(v); else dropped++;
  }
  for (let b = 0; b < B; b++) {
    const s: BorderStop[] = [];
    for (let i = 0; i < stops.length; i++) s.push(stops[Math.floor(rng() * stops.length)]);
    rs.push(shareOf(s)); const v = fit(s); if (Number.isFinite(v)) rb.push(v);
  }
  return {
    stops: stops.length, groupDays: clusters.length, groups: new Set(stops.map(s => s.group)).size,
    share: shareOf(stops), shareLo: percentile(cs, 0.05), shareHi: percentile(cs, 0.95),
    slope: fit(stops), slopeLo: percentile(cb, 0.05), slopeHi: percentile(cb, 0.95), replicates: cb.length, dropped,
    rowBootstrap: { shareLo: percentile(rs, 0.05), shareHi: percentile(rs, 0.95), slopeLo: percentile(rb, 0.05), slopeHi: percentile(rb, 0.95) },
  };
}

/** Advance share by bins of adults present (descriptive). */
export function advanceByAdults(stops: BorderStop[], edges: [number, number][]) {
  return edges.map(([lo, hi]) => { const s = stops.filter(x => x.adults >= lo && x.adults < hi); return { lo, hi: Number.isFinite(hi) ? hi : null, n: s.length, advance: r4(s.reduce((a, x) => a + x.advance, 0) / Math.max(1, s.length)) }; });
}

/** Where the stops were: distance from the group's range centre and to the rivals, in units of the group's range radius r. */
export function stopDistancesR(stops: BorderStop[], rOf: (group: string) => number, lo = 0, hi = 2, bins = 20) {
  const c = stops.map(s => s.distCentreM / rOf(s.group)).filter(Number.isFinite), v = stops.map(s => s.distRivalsM / rOf(s.group)).filter(Number.isFinite);
  const q = (a: number[]) => ({ p10: r4(percentile(a, 0.1)), median: r4(median(a)), p90: r4(percentile(a, 0.9)), n: a.length });
  return { fromCentre: { ...q(c), lo, hi, bins, density: histogram(c, lo, hi, bins).density.map(r4) }, toRivals: q(v) };
}
