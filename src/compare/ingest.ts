import { utm } from './geo';
import type { Fix } from './sampling';

// Reads the Ngogo space-use archive (Sandel et al., Zenodo 10.5281/zenodo.18603419, CC BY 4.0): gps_qualified.csv
// and cluster_membership_by_year.csv. Raw coordinates are location-sensitive (data/raw/zenodo-18603419/PROVENANCE.md):
// the fixes returned here stay in memory or under artifacts/, never in public/, docs/ or dist/.
//
// Clock times: the CSV's DateTime carries a "Z" suffix, but the values are not UTC. Rendered in America/Chicago,
// every fix falls in 08:00–17:59 and on its GPS_date (all 166,826 rows; checked by scripts/compare-ranging.ts), which
// is what the notebook's hour filter selected; rendered as UTC they span 13:00–23:59 and jump by an hour across US
// daylight-saving changes. So the archive was written by readr from local times parsed in a US Central session.
// We recover the field clock by rendering in that zone.

export interface GpsRow { ind: string; sex: 'M' | 'F'; date: string; iso: string; lat: number; lon: number; year: number; month: number; age: number }

/** Minimal RFC 4180 line splitter (quoted fields may contain commas). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseGpsCsv(text: string): GpsRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  const head = splitCsvLine(lines[0]);
  const col = (name: string) => { const i = head.indexOf(name); if (i < 0) throw new Error(`gps csv: missing column ${name}`); return i; };
  const I = { ind: col('Individual'), date: col('GPS_date'), iso: col('DateTime'), lat: col('Lat'), lon: col('Lon'), sex: col('Sex'), year: col('Year'), month: col('Month'), age: col('Age_at_sampling') };
  return lines.slice(1).map((l, n) => {
    const c = splitCsvLine(l);
    const sex = c[I.sex];
    if (sex !== 'M' && sex !== 'F') throw new Error(`gps csv row ${n + 2}: sex "${sex}"`);
    const row: GpsRow = { ind: c[I.ind], sex, date: c[I.date], iso: c[I.iso], lat: +c[I.lat], lon: +c[I.lon], year: +c[I.year], month: +c[I.month], age: +c[I.age] };
    if (![row.lat, row.lon, row.year, row.month, row.age].every(Number.isFinite)) throw new Error(`gps csv row ${n + 2}: non-numeric field`);
    return row;
  });
}

const CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Field clock date (YYYY-MM-DD) and minute of day of an archive DateTime (see header). */
export function fieldClock(iso: string): { date: string; min: number } {
  const p: Record<string, string> = {};
  for (const x of CLOCK.formatToParts(new Date(iso))) p[x.type] = x.value;
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
}

const DAY_MS = 86400000;
export const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
export const dayOfYear = (date: string) => dayNumber(date) - dayNumber(`${date.slice(0, 4)}-01-01`) + 1;

export interface IngestReport { rows: number; clockDateMismatch: number; yearMismatch: number; monthMismatch: number; minAge: { M: number; F: number } }

/** Rows → fixes in UTM zone 36N metres (EPSG:32636, as the notebook), with the field clock recovered. */
export function toFixes(rows: GpsRow[]): { fixes: Fix[]; report: IngestReport } {
  let clockDateMismatch = 0, yearMismatch = 0, monthMismatch = 0;
  const minAge = { M: Infinity, F: Infinity };
  const fixes = rows.map(r => {
    const c = fieldClock(r.iso);
    if (c.date !== r.date) clockDateMismatch++;
    if (+r.date.slice(0, 4) !== r.year) yearMismatch++;
    if (+r.date.slice(5, 7) !== r.month) monthMismatch++;
    minAge[r.sex] = Math.min(minAge[r.sex], r.age);
    const [x, y] = utm(r.lat, r.lon, 36);
    return { ind: r.ind, sex: r.sex, year: r.year, month: r.month, doy: dayOfYear(r.date), day: dayNumber(r.date), min: c.min, x, y } satisfies Fix;
  });
  return { fixes, report: { rows: rows.length, clockDateMismatch, yearMismatch, monthMismatch, minAge } };
}

export interface NetworkCluster { year: number; cluster: number; region: string; members: string[] }

export function parseClusterCsv(text: string): NetworkCluster[] {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  const head = splitCsvLine(lines[0]);
  const I = { year: head.indexOf('year'), cluster: head.indexOf('cluster'), region: head.indexOf('region_name'), members: head.indexOf('all_members') };
  if (Object.values(I).some(i => i < 0)) throw new Error('cluster csv: missing column');
  return lines.slice(1).map(l => { const c = splitCsvLine(l); return { year: +c[I.year], cluster: +c[I.cluster], region: c[I.region], members: c[I.members].split(',').map(s => s.trim()).filter(Boolean) }; });
}
