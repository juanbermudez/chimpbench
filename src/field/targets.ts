import { CELL_MIN, METRICS, type MetricDef, type SeedValue } from './metrics';
import { finite, mean, poissonInterval, sd } from './stats';
export { poissonInterval } from './stats';

// Scores metric values against data/targets.json (docs/realism-design.md §2): per-seed values, their spread, the
// pooled value, and a verdict. Fitted and held-out targets are kept apart in every report; encoded targets are flagged.
// The JSON is passed in so this module stays free of file I/O (scripts read it).

export interface TargetSpec {
  id: string; metric: string; role: 'fitted' | 'held-out'; encoded: boolean; evidence: string;
  /** Its protocol was changed after its value had been seen, for a source-text or bug reason (logged in protocolLog). */
  protocolRevisedPostHoc?: boolean;
  /** Held-out target whose protocol was changed after unblinding without a source or truth justification, or after the freeze: reported, never counted as validation. */
  compromised?: boolean;
  /** Fitted target whose value was reached by tuning on the scoring seeds (review label, with its reason). */
  tuned?: string;
  /** The instrument behind this target is below its validation bar (review label): reported, not scored. */
  instrumentWarning?: string;
  /** Reported as a fail whatever its value, with this reason (C7a: T-RNG-4 until trajectories are goal-directed). */
  heldAsFail?: string;
  /** Held-out target touched by a model change after the freeze, re-tested on fresh seeds (C6 patrol corrections): counts only if no parameter was set by looking at it. */
  revisedPostFreeze?: string;
  /** Partly encoded by a later model change (label with its reason); still scored, against the paired baseline where stated. */
  partiallyEncoded?: string;
  /** The real record cannot support the comparison (instrument limitation on the field side): reported, never counted. */
  notScorable?: string;
  accept: { lo: number | null; hi: number | null; units: string; basis: string };
  observer: { protocol: string; interval_min: number | null; unit: string };
}
export interface TargetFile { targets: TargetSpec[] }

/** scale: a length or area target under the compressed profile, reported but not scored until C5a (C3 review). */
export type Verdict = 'pass' | 'fail' | 'inconclusive' | 'insufficient' | 'n/a' | 'structural' | 'scale' | 'sealed';

export interface ScoreRow {
  id: string; metric: string; role: 'fitted' | 'held-out'; encoded: boolean; evidence: string;
  units: string; band: string; protocol: string; verdict: Verdict; note: string;
  perSeed: (number | null)[]; seedPass: (boolean | null)[];
  mean: number | null; sd: number | null; min: number | null; max: number | null;
  pooled: number | null; parts: Record<string, number | null>; truth: number | null; n: number;
  interval: [number, number] | null; scaleSensitive: boolean;
  /** 'revised post hoc', 'compromised' (from data/targets.json). */
  flags: string[];
}

/** Two-sided 95% Student t quantiles by degrees of freedom (1–30); 1.96 beyond. */
const T975 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
/** 95% interval of the mean of per-seed values (null with fewer than 3 seeds). */
export function seedInterval(v: number[]): [number, number] | null {
  if (v.length < 3) return null;
  const m = mean(v), h = (T975[v.length - 1] ?? 1.96) * sd(v) / Math.sqrt(v.length);
  return [m - h, m + h];
}

/** Part bands where the target's band is written per sex (lo/hi null in the JSON). */
const PART_BANDS: Record<string, Record<string, [number, number]>> = {
  'T-DEM-2': { female: [31, 39], male: [18, 24] },
  // stage C8: the bands written in the rows' basis text
  'T-DEM-4': { disease: [0.25, 0.6], aggression: [0.1, 0.25] },
  'T-DEM-6': { attack: [0.4, 0.9], mortality: [0, 0.17] },
};

/** One seed's value as the pooled rule would compute it from that seed alone. */
function seedValue(def: MetricDef, s: SeedValue): SeedValue {
  if (def.pool === 'custom' && def.pooled) return def.pooled([s]);
  if (def.pool === 'ratio') return { ...s, value: s.den ? (s.num ?? 0) / s.den : s.value };
  return s;
}

export function pool(def: MetricDef, seeds: SeedValue[]): SeedValue {
  if (def.pool === 'custom' && def.pooled) return def.pooled(seeds);
  const ok = seeds.filter(s => s.value !== null && finite(s.value));
  const parts: Record<string, number | null> = {};
  for (const k of new Set(seeds.flatMap(s => Object.keys(s.parts ?? {})))) { const v = seeds.map(s => s.parts?.[k]).filter((x): x is number => x !== null && x !== undefined && finite(x)); parts[k] = v.length ? mean(v) : null; }
  const truths = seeds.map(s => s.truth).filter((x): x is number => x !== null && x !== undefined && finite(x));
  const n = seeds.reduce((a, s) => a + s.n, 0);
  const truth = truths.length ? mean(truths) : null;
  if (def.pool === 'ratio') {
    const num = seeds.reduce((a, s) => a + (s.num ?? 0), 0), den = seeds.reduce((a, s) => a + (s.den ?? 0), 0);
    return { value: den > 0 ? num / den : null, num, den, n, parts, truth, note: den > 0 ? undefined : seeds.find(s => s.note)?.note };
  }
  if (def.pool === 'pattern') {
    const verdicts = seeds.map(s => s.pass).filter((p): p is boolean => p === true || p === false);
    return { value: ok.length ? mean(ok.map(s => s.value!)) : null, n, parts, truth, pass: verdicts.length ? verdicts.filter(p => p).length > verdicts.length / 2 : null,
      note: verdicts.length ? `${verdicts.filter(p => p).length}/${verdicts.length} seeds show the pattern` : seeds.find(s => s.note)?.note };
  }
  return { value: ok.length ? mean(ok.map(s => s.value!)) : null, n, parts, truth, note: ok.length ? undefined : seeds.find(s => s.note)?.note };
}

const inBand = (v: number, lo: number | null, hi: number | null) => (lo === null || v >= lo) && (hi === null || v <= hi);
const fmtBand = (lo: number | null, hi: number | null) => lo !== null && hi !== null ? `${lo}–${hi}` : lo !== null ? `≥ ${lo}` : hi !== null ? `≤ ${hi}` : 'pattern';

/**
 * Scores every target. `values[id]` holds one SeedValue per seed (missing ids are n/a). Under the compressed profile,
 * scale-sensitive targets (lengths and areas reported ×50) get the verdict 'scale': their values are shown but not
 * scored, because walking speeds, sight and party links are not scaled by the same factor (C3 review).
 */
export function scoreTargets(file: TargetFile, values: Record<string, SeedValue[]>, profile = 'compressed'): ScoreRow[] {
  const rows: ScoreRow[] = [];
  for (const t of file.targets) {
    const def = METRICS.find(m => m.id === t.id);
    const flags = [...(t.protocolRevisedPostHoc ? ['revised post hoc'] : []), ...(t.compromised ? ['compromised'] : []), ...(t.tuned ? ['tuned'] : []), ...(t.instrumentWarning ? ['instrument below bar'] : []), ...(t.heldAsFail ? ['held as fail'] : []),
      ...(t.revisedPostFreeze ? ['model revised post-freeze'] : []), ...(t.partiallyEncoded ? ['partially encoded'] : []),
      ...(t.notScorable ? ['not scorable'] : [])];
    const base = { id: t.id, metric: t.metric, role: t.role, encoded: t.encoded, evidence: t.evidence, units: t.accept.units, protocol: def?.protocol ?? t.observer.protocol, scaleSensitive: !!def?.scaleSensitive, flags };
    const partBands = PART_BANDS[t.id];
    const band = partBands ? Object.entries(partBands).map(([k, [a, b]]) => `${k} ${a}–${b}`).join(', ') : t.accept.lo === null && t.accept.hi === null ? t.accept.basis : fmtBand(t.accept.lo, t.accept.hi);
    const empty = { perSeed: [], seedPass: [], mean: null, sd: null, min: null, max: null, pooled: null, parts: {}, truth: null, n: 0, interval: null };
    if (!def || def.na) { rows.push({ ...base, ...empty, band, verdict: 'n/a', note: `n/a (mechanism missing${def?.na ? `: ${def.na}` : ''})` }); continue; }
    if (def.structural) { rows.push({ ...base, ...empty, band, verdict: 'structural', note: def.structural }); continue; }
    const seeds = values[t.id] ?? [];
    // stage C8 sealing: a sealed metric has no values unless the run was unsealed; its row carries nothing but the id and metric
    if (def.sealed && !seeds.length) { rows.push({ ...base, ...empty, protocol: '', band: '', verdict: 'sealed', note: def.sealed }); continue; }
    const per = seeds.map(s => seedValue(def, s));
    const perSeed = per.map(s => (s.value !== null && finite(s.value) ? s.value : null));
    const got = perSeed.filter((x): x is number => x !== null);
    const p = pool(def, seeds);
    let verdict: Verdict;
    let interval: [number, number] | null = null;
    let note = p.note ?? '';
    if (p.value === null || !finite(p.value)) verdict = 'insufficient';
    else if (p.pass === true || p.pass === false) verdict = p.pass ? 'pass' : 'fail';
    else if (def.pool === 'pattern' || (def.pool === 'custom' && t.accept.lo === null && t.accept.hi === null && !partBands)) verdict = 'insufficient';
    else if (partBands || def.bandParts) {
      const pb = partBands ?? Object.fromEntries((def.bandParts ?? []).map(k => [k, [t.accept.lo ?? -Infinity, t.accept.hi ?? Infinity] as [number, number]]));
      const vals = Object.entries(pb).map(([k, [lo, hi]]) => { const v = p.parts?.[k]; return v === null || v === undefined ? null : v >= lo && v <= hi; });
      verdict = vals.some(v => v === null) ? 'insufficient' : vals.every(v => v) ? 'pass' : 'fail';
    } else {
      verdict = inBand(p.value, t.accept.lo, t.accept.hi) ? 'pass' : 'fail';
      if (p.interval) interval = p.interval;
      if (verdict === 'fail' && p.interval && (t.accept.hi === null || p.interval[0] <= t.accept.hi) && (t.accept.lo === null || p.interval[1] >= t.accept.lo)) {
        verdict = 'inconclusive';
        note = `${note ? note + '; ' : ''}95% interval ${p.interval[0].toFixed(2)}–${p.interval[1].toFixed(2)} overlaps the band`;
      }
      if (def.poisson && p.num !== undefined && p.den) {
        const [a, b] = poissonInterval(p.num);
        interval = [a / p.den, b / p.den];
        if (verdict === 'fail' && (t.accept.hi === null || interval[0] <= t.accept.hi) && (t.accept.lo === null || interval[1] >= t.accept.lo)) {
          verdict = 'inconclusive';
          note = `${note ? note + '; ' : ''}${p.num} events; 95% interval ${interval[0].toFixed(2)}–${interval[1].toFixed(2)} overlaps the band`;
        }
      }
      // Seed spread (C3 review): a pass or fail whose 95% interval over seeds crosses a band edge is not established either way.
      const si = seedInterval(got);
      const crosses = (e: number | null) => si !== null && e !== null && si[0] < e && si[1] > e;
      if ((verdict === 'pass' || verdict === 'fail') && (crosses(t.accept.lo) || crosses(t.accept.hi))) {
        note = `${note ? note + '; ' : ''}would be ${verdict}, but the 95% interval over seeds ${si![0].toFixed(2)}–${si![1].toFixed(2)} crosses the band edge`;
        verdict = 'inconclusive';
      }
    }
    // cell-based metrics on too few 500 m cells: reported, not scored (C6 review)
    const cells = seeds.map(s => s.cells).filter((x): x is number => x !== undefined);
    if (def.cellBased && profile === 'field' && cells.length && Math.min(...cells) < CELL_MIN && verdict !== 'insufficient') {
      note = `not scored: a community-year used ${Math.min(...cells)} (< ${CELL_MIN}) cells of 500 m, so one cell moves the value (would be ${verdict})${note ? '; ' + note : ''}`;
      verdict = 'scale';
    }
    if (t.heldAsFail && (verdict === 'pass' || verdict === 'inconclusive')) { note = `held as fail: ${t.heldAsFail} (would be ${verdict})${note ? '; ' + note : ''}`; verdict = 'fail'; }
    if (def.scaleSensitive && profile === 'compressed' && verdict !== 'insufficient') {
      note = `not scored under the compressed profile (would be ${verdict}; lengths ×50 mix two scales until C5a)${note ? '; ' + note : ''}`;
      verdict = 'scale';
    }
    rows.push({
      ...base, band, verdict, note, perSeed, seedPass: per.map(s => (s.pass === undefined ? null : s.pass)),
      mean: got.length ? mean(got) : null, sd: got.length > 1 ? sd(got) : null, min: got.length ? Math.min(...got) : null, max: got.length ? Math.max(...got) : null,
      pooled: p.value !== null && finite(p.value) ? p.value : null, parts: p.parts ?? {}, truth: p.truth ?? null, n: p.n, interval,
    });
  }
  return rows;
}

export type SummaryKey = Verdict | 'compromised' | 'instrument' | 'unscorable' | 'tuned' | 'encoded';

/**
 * A row as written to JSON and Markdown: sealed rows (stage C8) keep only the id, the metric, the role and the sealing
 * text: no value, n, parts, interval, verdict or note (early-life-prereg §1.2).
 */
export function publicRow(r: ScoreRow): ScoreRow | { id: string; metric: string; role: string; encoded: boolean; sealed: string } {
  return r.verdict === 'sealed' ? { id: r.id, metric: r.metric, role: r.role, encoded: r.encoded, sealed: r.note } : r;
}

/**
 * `--unseal` binding (early-life-prereg §1.2): allowed only when data/targets.json records a C8 freeze whose protocol hash
 * and parameter-registry hash equal the current ones. Returns the refusal reason, or null when unsealing is allowed.
 */
export function unsealRefusal(freeze: { stage?: string; hash?: string; registryHash?: string } | undefined, protocolHash: string, registryHash: string): string | null {
  if (!freeze || !/^C8\b/.test(freeze.stage ?? '')) return `no C8 freeze is logged (protocolFreeze.stage is "${freeze?.stage ?? 'none'}")`;
  if (freeze.hash !== protocolHash) return `the protocol hash ${protocolHash} differs from the C8 freeze ${freeze.hash}`;
  if (freeze.registryHash !== registryHash) return `the parameter-registry hash ${registryHash} differs from the C8 freeze ${freeze.registryHash ?? 'none'}`;
  return null;
}
/**
 * Counts by role and verdict. Compromised rows and rows whose instrument is below its bar are counted apart (never as
 * a pass or fail), passes of tuned rows are counted as 'tuned', not as passes (C5a review), and encoded rows (a match
 * is weak evidence; data/targets.json) are counted as 'encoded' whatever their verdict (C6 review). Rows whose real
 * record cannot support the comparison ('not scorable', e.g. T-PAT-8 without observation effort) are counted apart.
 */
export function summarize(rows: ScoreRow[]): Record<string, Record<SummaryKey, number>> {
  const z = (): Record<SummaryKey, number> => ({ pass: 0, fail: 0, inconclusive: 0, insufficient: 0, 'n/a': 0, structural: 0, scale: 0, sealed: 0, compromised: 0, instrument: 0, unscorable: 0, tuned: 0, encoded: 0 });
  const out: Record<string, Record<SummaryKey, number>> = { fitted: z(), 'held-out': z(), all: z() };
  for (const r of rows) {
    const counted = r.verdict === 'pass' || r.verdict === 'fail' || r.verdict === 'inconclusive';
    const k: SummaryKey = r.flags.includes('compromised') ? 'compromised' : r.flags.includes('not scorable') ? 'unscorable' : r.flags.includes('instrument below bar') ? 'instrument' : r.encoded && counted ? 'encoded' : r.flags.includes('tuned') && r.verdict === 'pass' ? 'tuned' : r.verdict;
    out[r.role][k]++; out.all[k]++;
  }
  return out;
}

/**
 * Instrument bar (C3; applied mechanically from stage C6; extended to the encounter classifier after the C7a review):
 * rows scored by the patrol or encounter classifier count only when the classifier on the team set that scores them
 * reaches precision and recall >= 0.8 against truth in the same run; otherwise they are flagged 'instrument below bar'
 * (reported, not scored). A missing measurement (older results) leaves the rows unflagged.
 */
export const INSTRUMENT_BAR = 0.8;
export const PATROL_ROWS: Readonly<Record<'focal' | 'males', readonly string[]>> = {
  focal: ['T-PAT-1', 'T-PAT-2', 'T-PAT-3', 'T-PAT-4', 'T-PAT-5', 'T-PAT-7', 'T-PAT-8', 'T-LET-6'],
  males: ['T-PAT-6'],
};
/** Rows scored by the encounter classifier (C7a review, finding 5): the focal team set, and the party follows for T-IGE-1. */
export const ENCOUNTER_ROWS: Readonly<Record<'focal' | 'party', readonly string[]>> = {
  focal: ['T-IGE-2', 'T-IGE-3', 'T-IGE-5', 'T-PAT-7'],
  party: ['T-IGE-1'],
};
type Acc = { precision: number; recall: number };
export function applyInstrumentBar(rows: ScoreRow[], acc: Record<'focal' | 'males', Acc>, enc?: Partial<Record<'focal' | 'party', Acc>>): void {
  const flag = (ids: readonly string[], a: Acc | undefined) => {
    if (!a || (a.precision >= INSTRUMENT_BAR && a.recall >= INSTRUMENT_BAR)) return;
    for (const r of rows) if (ids.includes(r.id) && !r.flags.includes('instrument below bar')) r.flags.push('instrument below bar');
  };
  for (const set of ['focal', 'males'] as const) flag(PATROL_ROWS[set], acc[set]);
  if (enc) for (const set of ['focal', 'party'] as const) flag(ENCOUNTER_ROWS[set], enc[set]);
}
