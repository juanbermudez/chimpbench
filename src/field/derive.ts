import { CATEGORIES } from './categories';
import { classifyPatrols, type Patrol } from './classifiers';
import { PROFILES, type FieldProfile } from './config';
import type { Records, RosterEntry } from './records';
import { cellOf, cellRange, coreShare, isoplethArea, isoplethLevels, kde, levelAt, type UdGrid } from './space';

// Views over one run's records shared by the metric functions: follow ↔ sample indexes, effort, ranges from the
// observer's own fixes, phenology by month, classified patrols, and roster lookups with estimated ages.

export const MONTH_H = 24 * 365 / 12;
const YEAR_H = 24 * 365.25;

export interface Range {
  troop: number; ud: UdGrid; lv: Float64Array; cx: number; cz: number;
  /** Grid-cell home range (logical m²) and its cells; unique cell-days; 30-min fix counts per cell. */
  area98: number; cells98: string[]; cellDays: Map<string, number>; cellUse: Map<string, number>; core: number; area95: number; fixes: number;
}

export interface Derived {
  rec: Records; profile: FieldProfile; tH: number; days: number; years: number;
  /** Observation window in world hours: start (rec.time0, after any burn-in), end and mid-point. */
  t0: number; t1: number; mid: number;
  troops: number[]; communityYears: number;
  roster: Map<number, RosterEntry>;
  followPts: number[][]; followScans: number[][];
  /** Follows (days with a follow) and follow hours per community. */
  followDays: Map<number, number>; followHours: Map<number, number>;
  ranges: Map<number, Range>;
  /** Monthly phenology index (share of transect trees ripe) by observation month. */
  phen: Map<number, number>;
  patrols: Patrol[];
  /** Recorded calls by caller, in time order. */
  callsBy: Map<number, { t: number; kind: string }[]>;
  /** True when `caller` gave one of `kinds` within [t − before, t + after] hours. */
  calledNear(caller: number, t: number, kinds: string[], before: number, after: number): boolean;
  level(troop: number, x: number, z: number): number;
  ageAt(id: number, t: number): number;
  isAdultMale(id: number, t: number): boolean;
  aliveAt(id: number, t: number): boolean;
  adultMales(troop: number, t: number): number[];
  month(tick: number): number;
  /** Stage C8: uncapped days (living below 90% of the population cap) between two times, in days (all days when no cap is recorded). */
  uncappedDays(a: number, b: number): number;
}

export function derive(rec: Records): Derived {
  const profile = PROFILES[rec.profile as keyof typeof PROFILES] ?? PROFILES.compressed;
  const tH = rec.tickHours, days = rec.days, years = days / 365;
  const troops = rec.troops;
  const roster = new Map(rec.roster.map(r => [r.id, r]));
  const deathAt = new Map<number, number>();
  for (const d of rec.deaths) deathAt.set(d.id, d.tEst);
  // follow ↔ points, follow ↔ scans (both appended in time order per team)
  const byTeam = new Map<number, number[]>();
  rec.follows.forEach((f, i) => { let l = byTeam.get(f.team); if (!l) byTeam.set(f.team, l = []); l.push(i); });
  const assign = (n: number, team: (i: number) => number, t: (i: number) => number) => {
    const out: number[][] = rec.follows.map(() => []), ptr = new Map<number, number>();
    for (let i = 0; i < n; i++) {
      const tm = team(i), list = byTeam.get(tm);
      if (!list) continue;
      let p = ptr.get(tm) ?? 0;
      const time = t(i) * tH;
      while (p + 1 < list.length && rec.follows[list[p + 1]].start <= time + 1e-9) p++;
      ptr.set(tm, p);
      out[list[p]].push(i);
    }
    return out;
  };
  const P = rec.points, S = rec.scans;
  const followPts = assign(P.t.n, i => P.team.data[i], i => P.t.data[i]);
  const followScans = assign(S.t.n, i => S.team.data[i], i => S.t.data[i]);
  const followDays = new Map<number, number>(), followHours = new Map<number, number>();
  for (const t of troops) { followDays.set(t, 0); followHours.set(t, 0); }
  for (const f of rec.follows) {
    if (f.end < f.start) continue;
    followDays.set(f.troop, (followDays.get(f.troop) ?? 0) + 1);
    followHours.set(f.troop, (followHours.get(f.troop) ?? 0) + (f.end - f.start));
  }
  // ranges from the observer's fixes: 5-min fixes for daily cells, 30-min fixes for the kernel and cell use
  const half = rec.mapSize / 2, pad = 4 * profile.kdeCellM, bounds: [number, number, number, number] = [-half - pad, -half - pad, half + pad, half + pad];
  const fixEvery5 = Math.round(5 / 60 / tH), fixEvery30 = Math.round(30 / 60 / tH);
  const ranges = new Map<number, Range>();
  for (const troop of troops) {
    const xs: number[] = [], zs: number[] = [];
    const cellDays = new Map<string, number>(), seenDay = new Set<string>(), cellUse = new Map<string, number>();
    rec.follows.forEach((f, fi) => {
      if (f.troop !== troop) return;
      const day = Math.floor((f.start + 6.5) / 24);
      for (const i of followPts[fi]) {
        const t = P.t.data[i];
        if (t % fixEvery5 !== 0) continue;
        const x = P.x.data[i], z = P.z.data[i], key = cellOf(x, z, profile.cellM);
        const dk = `${day}|${key}`;
        if (!seenDay.has(dk)) { seenDay.add(dk); cellDays.set(key, (cellDays.get(key) ?? 0) + 1); }
        if (t % fixEvery30 === 0) { xs.push(x); zs.push(z); cellUse.set(key, (cellUse.get(key) ?? 0) + 1); }
      }
    });
    const ud = kde(xs, zs, profile.kdeCellM, bounds);
    const lv = isoplethLevels(ud);
    let cx = 0, cz = 0;
    for (let i = 0; i < xs.length; i++) { cx += xs[i]; cz += zs[i]; }
    const r = cellRange(cellDays, profile.cellM, 0.98);
    ranges.set(troop, { troop, ud, lv, cx: xs.length ? cx / xs.length : 0, cz: xs.length ? cz / xs.length : 0, area98: r.area, cells98: r.cells, cellDays, cellUse,
      core: coreShare(cellUse, 0.36), area95: isoplethArea(ud, 0.95), fixes: xs.length });
  }
  const level = (troop: number, x: number, z: number) => { const r = ranges.get(troop); return r && r.fixes > 0 ? levelAt(r.ud, r.lv, x, z) : 1; };
  const phen = new Map<number, number>();
  const pm = new Map<number, [number, number]>();
  for (const p of rec.phenology) { const a = pm.get(p.month) ?? [0, 0]; a[0] += p.ripe ? 1 : 0; a[1]++; pm.set(p.month, a); }
  for (const [m, [r, n]] of pm) phen.set(m, r / n);
  const ageAt = (id: number, t: number) => { const r = roster.get(id); return r ? (t - r.birthEst) / YEAR_H : NaN; };
  const aliveAt = (id: number, t: number) => { const r = roster.get(id); const d = deathAt.get(id); return !!r && r.firstSeen <= t + 1e-9 && (d === undefined || d > t); };
  const isAdultMale = (id: number, t: number) => { const r = roster.get(id); return !!r && r.sex === 'male' && ageAt(id, t) >= 15; };
  const adultMales = (troop: number, t: number) => rec.roster.filter(r => r.troop === troop && r.sex === 'male' && aliveAt(r.id, t) && ageAt(r.id, t) >= 15).map(r => r.id);
  const callsBy = new Map<number, { t: number; kind: string }[]>();
  for (const c of rec.calls) { let l = callsBy.get(c.caller); if (!l) callsBy.set(c.caller, l = []); if (!l.length || l[l.length - 1].t !== c.t || l[l.length - 1].kind !== c.kind) l.push({ t: c.t, kind: c.kind }); }
  const calledNear = (caller: number, t: number, kinds: string[], before: number, after: number) => {
    const l = callsBy.get(caller);
    if (!l) return false;
    let lo = 0, hi = l.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (l[mid].t < t - before) lo = mid + 1; else hi = mid; }
    for (let i = lo; i < l.length && l[i].t <= t + after; i++) if (kinds.includes(l[i].kind)) return true;
    return false;
  };
  // stage C8: census days at or above 90% of the population cap, as a prefix count over world days (the cap blocks conception)
  const capDay = new Set(rec.popCap > 0 ? rec.living.filter(l => l.n >= 0.9 * rec.popCap).map(l => l.day) : []);
  const day0 = Math.floor((rec.time0 + 6.5) / 24) + 1, nDays = Math.ceil(days) + 2, pre = new Float64Array(nDays + 1);
  for (let i = 0; i < nDays; i++) pre[i + 1] = pre[i] + (capDay.has(day0 + i) ? 0 : 1);
  const dayPos = (t: number) => Math.min(nDays, Math.max(0, (t + 6.5) / 24 + 1 - day0));
  const uncappedDays = (a: number, b: number) => {
    if (!capDay.size) return Math.max(0, b - a) / 24;
    const pa = dayPos(a), pb = dayPos(b);
    if (!(pb > pa)) return 0;
    const at = (p: number) => { const i = Math.floor(p); return pre[Math.min(nDays, i)] + (i < nDays ? (pre[i + 1] - pre[i]) * (p - i) : 0); };
    return at(pb) - at(pa);
  };
  const d: Derived = {
    rec, profile, tH, days, years, t0: rec.time0, t1: rec.time0 + days * 24, mid: rec.time0 + days * 12, troops, communityYears: troops.length * years, roster, followPts, followScans, followDays, followHours, ranges, phen,
    patrols: [], callsBy, calledNear, level, ageAt, isAdultMale, aliveAt, adultMales, month: (tick: number) => Math.floor(tick * tH / MONTH_H), uncappedDays,
  };
  d.patrols = classifyPatrols(rec, followPts, level);
  return d;
}

/** Category shares of a set of point indices. */
export function shares(rec: Records, idx: Iterable<number>): { n: number; share: number[] } {
  const c = new Array(CATEGORIES.length).fill(0);
  let n = 0;
  for (const i of idx) { const k = rec.points.cat.data[i]; if (k < c.length) { c[k]++; n++; } }
  return { n, share: c.map(v => (n ? v / n : NaN)) };
}
