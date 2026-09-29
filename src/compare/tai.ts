import { FEED, REST, TRAVEL, type Act, type TrackPoint } from './tracks';
import { excelDate, type Cell } from './xlsx';

// Taï chimpanzee (P. t. verus, western subspecies) focal-follow records, Lemoine et al. 2023, PLOS Biol 21(11):
// e3002350, S2 Data (journal.pbio.3002350.s016.xlsx), CC BY 4.0; and territory sizes, Lemoine et al. 2020, R Soc Open
// Sci 7: 200577, ESM 2 (rsos200577_si_002.xlsx), CC BY 4.0. Binned coordinates are location-sensitive: they stay in
// memory or under artifacts/ (data/raw/plos-pbio-3002350/PROVENANCE.md).
//
// S2 Data semantics (checked on the file): one row per record of a focal follow (`day_group` = date_group_focal_sex);
// `daytime` is the clock hour; `duration` is the hours since the previous record of the same group-day in file order
// (two follows of one group on one day interleave); records fall on a 30-min grid with missing points; exactly one of rest / travel / feed is 1; `kernel` is the record's level (1–99, low =
// core) in its group's territory kernel (adehabitatHR kernelUD, h = 149 m, plug-in; the paper's methods);
// binned.long / binned.lat are UTM (zone 29N) metres on a 10 m grid.

export type TaiPoint = TrackPoint & { year: number; kernel: number };

export interface TaiReport { records: number; follows: number; excludedOther: number; badActivity: number; durationMismatch: number; groups: string[]; dateRange: [string, string] }

/** S2 Data rows → track points (follows of class "O", 1.6% and undocumented, are excluded). */
export function taiPoints(recs: Record<string, Cell>[]): { points: TaiPoint[]; report: TaiReport } {
  const points: TaiPoint[] = [];
  let excluded = 0, bad = 0, mismatch = 0;
  const prevT = new Map<string, number>(), follows = new Set<string>(), dates: string[] = [];
  for (const r of recs) {
    const follow = String(r.day_group), t = Number(r.daytime), sex = String(r.target_sex), groupDay = `${r.horde}\u0001${r.date}`;
    const prev = prevT.get(groupDay);
    if (prev !== undefined && Math.abs(Number(r.duration) - (t - prev)) > 0.011) mismatch++;
    prevT.set(groupDay, t);
    if (sex !== 'M' && sex !== 'F') { excluded++; continue; }
    const flags = [Number(r.rest), Number(r.travel), Number(r.feed)];
    if (flags.reduce((a, v) => a + v, 0) !== 1) { bad++; continue; }
    const act = (flags[0] ? REST : flags[1] ? TRAVEL : FEED) as Act;
    const date = excelDate(Number(r.date)), group = String(r.horde).replace(/ Group$/, ''), year = +date.slice(0, 4);
    follows.add(follow); dates.push(date);
    points.push({ follow, unit: `${group} ${year}`, group, sex, t, x: Number(r['binned.long']), y: Number(r['binned.lat']), act, party: Number(r.party_size), year, kernel: Number(r.kernel) });
  }
  dates.sort();
  return { points, report: { records: recs.length, follows: follows.size, excludedOther: excluded, badActivity: bad, durationMismatch: mismatch, groups: [...new Set(points.map(p => p.group))].sort(), dateRange: [dates[0], dates[dates.length - 1]] } };
}

export interface TerritoryRow { group: string; year: number; obsHours: number; territoryKm2: number; groupSize: number; males12: number; mature: number }

/** RSOS ESM 2 ("Dataset used in the territory analysis"): the header row is found by its first cell "group". */
export function taiTerritories(rows: Cell[][]): TerritoryRow[] {
  const h = rows.findIndex(r => r[0] === 'group');
  if (h < 0) throw new Error('territory sheet: header not found');
  const head = rows[h].map(String), col = (n: string) => { const i = head.indexOf(n); if (i < 0) throw new Error(`territory sheet: missing ${n}`); return i; };
  const I = { g: col('group'), y: col('year'), o: col('obs_time_hour'), t: col('territ_size'), s: col('group_size'), m: col('males12'), a: col('mature_individuals') };
  return rows.slice(h + 1).filter(r => r[I.g] !== null && Number.isFinite(Number(r[I.t]))).map(r => ({ group: String(r[I.g]), year: Number(r[I.y]), obsHours: Number(r[I.o]), territoryKm2: Number(r[I.t]), groupSize: Number(r[I.s]), males12: Number(r[I.m]), mature: Number(r[I.a]) }));
}
