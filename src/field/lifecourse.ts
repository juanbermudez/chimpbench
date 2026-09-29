import type { World } from '../types';
import { createWorld, tickWorld } from '../simulation';
import { index } from '../sim/state';
import { mean, median } from './stats';

// Life-course demography (ageRate 365: one ecological day ≈ one biological year) for the life-course rows of
// docs/simulation.md §18. Protocol: a complete census read every slow step (births with mothers, deaths, transfers,
// alpha changes and cycle states). Ages are exact here; the design validates demography in natural aging instead
// (life course is a demonstration, docs/realism-design.md §5.7).

const BINS = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 80];

export interface LifeResult {
  seed: number; years: number; popEnd: number; births: number;
  exposure: Record<'male' | 'female', number[]>; deaths: Record<'male' | 'female', number[]>;
  q1: [number, number]; ibi: number[]; afb: number[]; cycles: number[]; alphaChanges: string[]; transfers: number[];
}

export function lifeCourseRun(seed: number, years: number, every = 20): LifeResult {
  const w: World = createWorld(seed);
  w.ageRate = 365;
  const startAge = new Map(w.chimps.map(c => [c.id, c.age]));
  const known = new Set(w.chimps.map(c => c.id));
  const births: { y: number; id: number; mother: number; motherAge: number }[] = [];
  const prevCD = new Map(w.chimps.map(c => [c.id, c.cycleDay])), wraps = new Map<number, number>();
  const prevTroop = new Map(w.chimps.map(c => [c.id, c.troopId])), prevAlpha = new Map(w.troops.map(t => [t.id, t.alphaId]));
  const r: LifeResult = { seed, years, popEnd: 0, births: 0, exposure: { male: BINS.map(() => 0), female: BINS.map(() => 0) }, deaths: { male: BINS.map(() => 0), female: BINS.map(() => 0) },
    q1: [0, 0], ibi: [], afb: [], cycles: [], alphaChanges: [], transfers: [] };
  const ticks = Math.round(years * 5760);
  for (let tick = 0; tick < ticks; tick++) {
    tickWorld(w);
    if (tick % every !== every - 1 && tick !== ticks - 1) continue;
    for (const t of w.troops) if (prevAlpha.get(t.id) !== t.alphaId) { if (t.alphaId > 0) r.alphaChanges.push(t.alphaHistory.at(-1)?.how ?? ''); prevAlpha.set(t.id, t.alphaId); }
    const byId = index(w).byId;
    for (const c of w.chimps) {
      if (!known.has(c.id)) { known.add(c.id); prevCD.set(c.id, c.cycleDay); prevTroop.set(c.id, c.troopId); const m = byId.get(c.motherId); births.push({ y: w.time / 24, id: c.id, mother: c.motherId, motherAge: m ? m.age - c.age : NaN }); }
      if (!c.alive) continue;
      if (prevTroop.get(c.id) !== c.troopId) { r.transfers.push(c.age); prevTroop.set(c.id, c.troopId); }
      if (c.sex !== 'female') continue;
      const pc = prevCD.get(c.id) ?? -1;
      if (pc >= 0 && c.cycleDay >= 0 && c.cycleDay < pc) wraps.set(c.id, (wraps.get(c.id) ?? 0) + 1);
      if (pc < 0 && c.cycleDay >= 0) wraps.set(c.id, 0);
      if (pc >= 0 && c.cycleDay < 0 && c.pregnancy > 0) { r.cycles.push((wraps.get(c.id) ?? 0) + 1); wraps.set(c.id, 0); }
      prevCD.set(c.id, c.cycleDay);
    }
  }
  const byId = index(w).byId, endY = w.time / 24;
  for (const c of w.chimps) {
    const a0 = startAge.get(c.id) ?? 0;
    for (let i = 0; i < BINS.length - 1; i++) { const lo = Math.max(a0, BINS[i]), hi = Math.min(c.age, BINS[i + 1]); if (hi > lo) r.exposure[c.sex][i] += hi - lo; }
    if (!c.alive) { const i = BINS.findIndex((b, k) => c.age >= b && c.age < BINS[k + 1]); if (i >= 0) r.deaths[c.sex][i]++; }
  }
  for (const b of births) { if (endY - b.y < 1) continue; r.q1[1]++; const c = byId.get(b.id); if (c && !c.alive && c.age < 1) r.q1[0]++; }
  const byMother = new Map<number, typeof births>();
  for (const b of births) (byMother.get(b.mother) ?? byMother.set(b.mother, []).get(b.mother)!).push(b);
  for (const [mid, bs] of byMother) {
    for (let i = 1; i < bs.length; i++) { const prev = byId.get(bs[i - 1].id); if (prev && (prev.alive || (prev.deathTime ?? 0) / 24 >= bs[i].y)) r.ibi.push(bs[i].y - bs[i - 1].y); }
    const nullip = !startAge.has(mid) || (startAge.get(mid)! < 13 && !w.chimps.some(k => k.motherId === mid && startAge.has(k.id)));
    if (nullip && Number.isFinite(bs[0].motherAge)) r.afb.push(bs[0].motherAge);
  }
  r.popEnd = index(w).alive.length; r.births = births.length;
  return r;
}

function e15(exposure: number[], deaths: number[]): number {
  let l = 1, e = 0;
  for (let i = 4; i < BINS.length - 1; i++) {
    const h = deaths[i] / Math.max(1e-9, exposure[i]), width = BINS[i + 1] - BINS[i], end = l * Math.exp(-h * width);
    e += h > 0 ? (l - end) / h : l * width;
    l = end;
  }
  return e;
}

export interface LifeRow { key: string; label: string; value: string; field: string }

/** The §18 life-course rows from pooled runs. */
export function lifeRows(runs: LifeResult[]): LifeRow[] {
  if (!runs.length) return [];
  const pool = (sex: 'male' | 'female', k: 'exposure' | 'deaths') => BINS.map((_, i) => runs.reduce((a, r) => a + r[k][sex][i], 0));
  const all = <T>(k: (r: LifeResult) => T[]) => runs.flatMap(k);
  const changes = all(r => r.alphaChanges), alive = changes.filter(c => /rose above|defeated|contests/.test(c)).length;
  const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const yrs = runs[0].years;
  return [
    { key: 'lifePop', label: `Life course (${yrs} y × ${runs.length}): population`, value: runs.map(r => `49→${r.popEnd}`).join(', '), field: 'cap 120 living' },
    { key: 'q1', label: '  first-year mortality', value: f(runs.reduce((a, r) => a + r.q1[0], 0) / Math.max(1, runs.reduce((a, r) => a + r.q1[1], 0)), 2), field: '0.15 (Ngogo)' },
    { key: 'e15', label: '  e15 female / male (y)', value: `${f(e15(pool('female', 'exposure'), pool('female', 'deaths')))} / ${f(e15(pool('male', 'exposure'), pool('male', 'deaths')))}`, field: '35.1 / 21.0 (Ngogo)' },
    { key: 'ibi', label: '  interbirth interval, median (y)', value: f(median(all(r => r.ibi)), 2), field: '4.8–6.6 (T-DEM-12)' },
    { key: 'afb', label: '  age at first birth, mean (y)', value: f(mean(all(r => r.afb))), field: '13.5–16 (T-DEM-11)' },
    { key: 'lifeCycles', label: '  cycles to conception, mean', value: f(mean(all(r => r.cycles)), 1), field: '~4 (design target)' },
    { key: 'tenure', label: '  alpha tenure, mean (y)', value: f(yrs * 3 * runs.length / Math.max(1, changes.length)), field: '3–7 (T-SOC-7)' },
    { key: 'deposed', label: '  alphas deposed alive', value: `${alive}/${changes.length}`, field: 'usually' },
    { key: 'transferAge', label: '  female transfer age, mean (y)', value: f(mean(all(r => r.transfers))), field: '~11–13' },
  ];
}
