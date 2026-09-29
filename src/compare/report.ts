import { distanceVerdict, scalarVerdict, type Verdict } from './score';
import { median } from './stats';

// Scorecard rows, the Markdown table and the publication guard shared by the real-vs-simulated comparisons
// (scripts/compare-ranging.ts, scripts/compare-movement.ts).

export interface ScoreRow {
  id: string; label: string; unit: string; level: string;
  distance: 'ratio' | 'difference' | 'KS D' | '1 − BA' | 'mean |Δ|' | 'none';
  /** Real central value and its spread (what `spreadOf` says), sample size, and an optional extra reference column. */
  real: { value: number; lo: number; hi: number; spreadOf: string; n: number; preFission?: number };
  /** Sim central value (median of seed medians) and the seed range, per-seed values, sample size. */
  sim: { value: number; lo: number; hi: number; seeds: number[]; n: number };
  dist: number; distSeeds?: [number, number]; baseline?: number; verdict: Verdict; note: string;
}

/** A scalar row: real median with the range of per-unit (e.g. annual) medians; sim median of per-seed medians. */
/**
 * The C12 statistics declared fitted in stage C7a before tuning (docs/realism-design.md "C7a mechanisms"); every other
 * statistic is held out. The label goes into the row note, the scorecard and the guide JSON.
 */
/** Role of the Taï and Ngogo C12 scorecards since the C12 relabel (integrator, 2026-09-29); the Gombe 15-min paths are the held-out movement validation. */
export const C12_DEV_ROLE = 'development diagnostic (seen): looked at repeatedly during development and used for direction checks; not validation (integrator ruling, 2026-09-29)';
export const C12_FITTED: Readonly<Record<string, string>> = { dispKm: 'fitted in C7a: tuned against Ngogo GPS', pathRate: 'fitted in C7a: tuned against Taï' };
/** C12 statistics seen before a model choice (C7a review finding 3): reported as diagnostic, not held out. */
export const C12_SEEN: Readonly<Record<string, string>> = Object.fromEntries(['area95', 'area50', 'area95M', 'area95F', 'commArea95', 'territory']
  .map(id => [id, 'diagnostic, seen: rule 9 chosen after a range-size sensitivity run']));
const c12Label = (id: string, note: string) => { const l = C12_FITTED[id] ?? C12_SEEN[id]; return l ? (note ? `${l}. ${note}` : l) : note; };

export function scalarRow(id: string, label: string, unit: string, level: string, kind: 'ratio' | 'difference', realAll: number[], realUnits: number[], seedVals: number[], simN: number, note = '', pre?: number): ScoreRow {
  note = c12Label(id, note);
  const rv = median(realAll), sv = median(seedVals), fin = seedVals.filter(Number.isFinite);
  return { id, label, unit, level, distance: kind, real: { value: rv, lo: Math.min(...realUnits), hi: Math.max(...realUnits), spreadOf: 'unit medians', n: realAll.length, preFission: pre },
    sim: { value: sv, lo: fin.length ? Math.min(...fin) : NaN, hi: fin.length ? Math.max(...fin) : NaN, seeds: seedVals, n: simN }, dist: kind === 'ratio' ? sv / rv : sv - rv,
    verdict: fin.length ? scalarVerdict(realUnits, fin, sv) : 'not comparable', note };
}

/** A distance row: distance sim vs real, per-seed distances, and the real leave-one-unit-out baseline. */
export function distanceRow(id: string, name: string, unit: string, level: string, kind: ScoreRow['distance'], d: number, perSeed: number[], baseline: number[], real: ScoreRow['real'], sim: ScoreRow['sim'], nSeeds: number, note: string): ScoreRow {
  note = c12Label(id, note);
  return { id, label: name, unit, level, distance: kind, real, sim, dist: d, distSeeds: perSeed.length ? [Math.min(...perSeed), Math.max(...perSeed)] : undefined,
    baseline: baseline.length ? Math.max(...baseline) : undefined, verdict: sim.n ? distanceVerdict(d, baseline, nSeeds) : 'not comparable', note };
}

export function fmt(v: number | null | undefined, d = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(d);
}

/** Markdown scorecard. `extra` names the optional reference column (row.real.preFission). */
export function scorecardMd(title: string, header: string[], rows: ScoreRow[], attribution: string, rules: string, extra = 'Real 2011–14', caveats: string[] = []): string {
  return [
    `# ${title}`, '', ...header.flatMap(h => [h, '']), `Rules (stated before running): ${rules}`, '',
    `| Statistic | Unit | Real (spread) | ${extra} | Sim (seed spread) | Distance | Verdict |`, '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(r => {
      const d = r.distance === 'ratio' ? `×${fmt(r.dist)}` : r.distance === 'difference' ? `${r.dist >= 0 ? '+' : ''}${fmt(r.dist, 3)}` : r.distance === 'none' ? '—' : `${r.distance} ${fmt(r.dist, 3)}${r.baseline !== undefined ? ` (real ≤ ${fmt(r.baseline, 3)})` : ''}`;
      return `| ${r.label} | ${r.unit} | ${fmt(r.real.value)} (${fmt(r.real.lo)}–${fmt(r.real.hi)}) | ${fmt(r.real.preFission)} | ${fmt(r.sim.value)} (${fmt(r.sim.lo)}–${fmt(r.sim.hi)}) | ${d} | **${r.verdict}** |`;
    }), '', '## Notes', ...rows.filter(r => r.note).map(r => `- ${r.label}: ${r.note}`),
    ...(caveats.length ? ['', '## Caveats', ...caveats.map(c => `- ${c}`)] : []), '', `Attribution: ${attribution}`, '',
  ].join('\n');
}

/**
 * Guard for published summaries (the data/raw PROVENANCE.md files: no raw or absolute locations, no identities): every
 * number must be small (areas in km², ratios, affinities, densities, metres per step) unless its key is a count, year
 * or setting, and no string may contain a real individual's name or code. UTM coordinates (≥ 5e4 m) fail the first check.
 */
export function assertNonSensitive(obj: unknown, names: Set<string>, allowedKeys: string[] = []): void {
  const allowed = new Set(['fixes', 'records', 'follows', 'individuals', 'individualYears', 'daysWith1Fix', 'daysWith2Fixes', 'n', 'year', 'from', 'to', 'years', 'seeds', 'seed', 'bandwidthM', 'h', 'burnInDays', 'samplerSeed', 'yearsSampled', 'alive', 'mature', 'nWest', 'nCentral', 'bins', ...allowedKeys]);
  const walk = (v: unknown, key: string, path: string): void => {
    if (typeof v === 'number') { if (Math.abs(v) > 1000 && !allowed.has(key)) throw new Error(`summary: ${path} = ${v} looks like a coordinate`); return; }
    if (typeof v === 'string') { for (const w of v.split(/[^A-Za-z]+/)) if (w.length > 2 && names.has(w)) throw new Error(`summary: ${path} names an individual (${w})`); return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, key, `${path}[${i}]`)); return; }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k, `${path}.${k}`);
  };
  walk(obj, '', 'summary');
}
