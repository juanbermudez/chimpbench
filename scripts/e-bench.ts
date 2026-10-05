// Track E benchmark (IMPLEMENTATION_PLAN.md "Track E: Emergence", iteration protocol steps 3–4). One command, run
// before and after a prescriptive rule is removed, that reports:
//   1. summed band distance on fitted target rows      (how close the model is to the field where it may be fitted)
//   2. summed band distance on held-out target rows    (how close where it may not)
//   3. the prescription count                           (how much of that closeness is prescribed; E0 ledger)
//   plus viability: births, deaths, births ÷ deaths, starvation deaths, living at the end, per seed.
// One simulation per seed (track E part E1, 5 October 2026; scripts/lib/bench-run.ts): the field observer's run of
// src/field/run.ts (same observer, team sets, experiments, metrics, pool, scorer and instrument bar; sealed rows stay
// sealed), with viability, the energy readouts (energy-diagnose.ts's), the rhythm readouts (rhythm-metrics.ts's) and the
// simulation-truth target rows (scripts/lib/truth-rows.ts) read from the same world in the same loop. The scorecard is
// identical to scripts/field-metrics.ts's, viability to the old replay's, rhythm byte-identical to rhythm-metrics.ts's,
// energy identical per seed to energy-diagnose.ts's (pooled floats to ~1e-10: seed totals are summed after each seed).
// Band distance: scripts/lib/band-distance.ts. Prescriptions: scripts/lib/prescriptions.ts.
//
//   pnpm exec tsx scripts/e-bench.ts --quick   [--params '{"id":v}'] [--workers 2] [--out artifacts/validation/e/<label>] [--compare other.json]
//   pnpm exec tsx scripts/e-bench.ts --confirm …    # the deciding benchmark when the rows score in 60 days
//   pnpm exec tsx scripts/e-bench.ts --rescore artifacts/validation/e/<label>.json [--compare other.json]   # re-derive from a saved run, no simulation
//
// Modes (field profile; user, 4 October 2026: work up from 60 days to 6, 12 and 24 months, a longer horizon only when
// a question needs it, at most 730 days in all, burn-in included; IMPLEMENTATION_PLAN.md "Run-length ladder"):
//   --quick    seeds 48, 7; 30 days after a 30-day burn-in: a direction check.
//   --confirm  seeds 48, 7, 21, 5, 11; 60 days after a 30-day burn-in: decides keep or drop when the rows score in 60 days.
//   --m6       seeds 48, 7, 21, 5, 11; 180 days after a 30-day burn-in (6 months).
//   --m12      seeds 48, 7, 21, 5, 11; 365 days after a 30-day burn-in (12 months: the NEEDS_YEAR rows score).
//   --m24      seeds 48, 7, 21, 5, 11; 700 days after a 30-day burn-in (730 in all: rare events, life history).
//   --full     seeds 48, 7, 21, 5, 11; 365 days after a 180-day burn-in: the plan's original benchmark.
// Any run longer than MAX_TOTAL_DAYS in all is refused.
// Rows that need a year of observation (annual ranges, statistics across months, life tables, rare events per year:
// NEEDS_YEAR below) are reported as "insufficient" in shorter runs and left out of the sums; their count is printed
// beside each headline number, so a before and an after run of the same mode sum over the same rows.
// --seeds, --days N and --burn-in N override a mode (labelled custom). Development seeds only (AGENTS.md lists the
// reserved ones).
// Outputs: <out>.json and <out>.md (the bench), <out>.scorecard.{json,md,log} (as field-metrics.ts writes them),
// <out>-energy.{json,log} (as energy-diagnose.ts; --no-energy skips), <out>-rhythm.{json,md} (as rhythm-metrics.ts;
// --no-rhythm skips), and one part per seed, <out>.s<seed>.part.json.gz (what the seed contributes; --reuse keeps the
// parts of an interrupted run made with the same settings and code).
// Long runs (RUN_CONTRACT below; agreed with the long-run runner of eR-runs, 5 October 2026):
//   --part --seeds <s>           one seed: writes only <out>.part.json.gz (last, atomically)
//   --merge p1,p2,…  --out x     pools parts in the order given into every output above, as a multi-seed run writes them
//   --until-day D                writes a checkpoint at absolute day D (burn-in included) and stops (exit 0, no outputs)
//   --resume <file|prefix>       continues a checkpoint (<out>.ckpt-dD.v8.gz with --part; for a multi-seed run the prefix of
//                                <prefix>.s<seed>.ckpt-dD.v8.gz, the newest per seed); refused (exit 2) for other settings or code
//   --checkpoint-at d1,d2,…      writes checkpoints on the way; --checkpoint the end one; --m6 and --m12 write their end
//                                checkpoint by default (the ladder extends them: --m12 --resume <m6 out>), --no-checkpoint not
// Checkpoints (scripts/lib/checkpoint.ts) hold the world, the observer's three team sets and every readout's state; a
// continued run is the uninterrupted run (tests/e-bench-single-pass.test.ts). --legacy runs the two-step path of
// 1 October (field-metrics.ts in a child process, then a viability replay; --no-viability skips the replay).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { REGISTRY_HASH, type Overrides } from '../src/sim/params';
import { openBandDistance, rowDistance, sumDistances, type DistanceSum, type OpenBand, type RowDistance } from './lib/band-distance';
import type { BenchJob, BenchPart, BenchSeedResult } from './lib/bench-run';
import { sidecarOf, writeAtomic } from './lib/checkpoint';
import { energyReport, mergeEnergy } from './lib/energy-probe';
import { MAX_TOTAL_DAYS } from './lib/horizon';
import { decodeLossless, encodeLossless } from './lib/lossless-json';
import { runPool } from './lib/pool';
import type { PrescriptionCount } from './lib/prescriptions';
import { protocolHash } from './lib/protocol-hash';
import { report as rhythmReport, rhythmJsonResult } from './lib/rhythm-probe';
import { scorecard as buildScorecard } from './lib/scorecard';
import { NO_READOUT } from './lib/truth-rows';
import { MIN_EVENTS, MIN_LIVING_SHARE, viabilityVerdict, type Viability, type ViabilityJob, type ViabilityVerdict } from './lib/viability';
import { prescriptionCount } from './prescription-ledger';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODES = {
  quick: { days: 30, burnInDays: 30, seeds: [48, 7] },
  confirm: { days: 60, burnInDays: 30, seeds: [48, 7, 21, 5, 11] },
  full: { days: 365, burnInDays: 180, seeds: [48, 7, 21, 5, 11] },
  m6: { days: 180, burnInDays: 30, seeds: [48, 7, 21, 5, 11] },
  m12: { days: 365, burnInDays: 30, seeds: [48, 7, 21, 5, 11] },
  m24: { days: 700, burnInDays: 30, seeds: [48, 7, 21, 5, 11] },
} as const;
/** Longest simulation, burn-in + scored days (user, 4 October 2026: up to 2 years; it was 90 days from 1 October): scripts/lib/horizon.ts. */
export { MAX_TOTAL_DAYS };
/**
 * Rows that need a year of observation, by why. In a shorter run they are reported as insufficient and never summed,
 * whatever value the scorer produced from the short window (a kernel of two months is not an annual range; a rate of
 * 0.1 per community-year rests on zero events). From each metric's protocol in src/field/metrics.ts.
 */
export const NEEDS_YEAR: Record<string, string> = {
  ...Object.fromEntries(['T-RNG-1', 'T-RNG-2', 'T-RNG-3', 'T-RNG-6'].map(id => [id, 'annual range'])),
  ...Object.fromEntries(['T-PTY-2', 'T-PAT-4', 'T-PAT-8', 'T-FOOD-1', 'T-FOOD-3', 'T-FOOD-11', 'T-HUN-5', 'T-HUN-6'].map(id => [id, 'a statistic across the months of a year'])),
  ...Object.fromEntries(['T-LET-1', 'T-LET-2', 'T-LET-3', 'T-LET-6', 'T-PAT-9', 'T-DEM-5', 'T-DEM-6', 'T-DEM-7', 'T-DEM-8'].map(id => [id, 'rare events counted per community-year'])),
  ...Object.fromEntries(['T-SOC-1', 'T-SOC-7', 'T-SOC-11', 'T-DEM-1', 'T-DEM-2', 'T-DEM-3', 'T-DEM-4', 'T-DEM-9', 'T-DEM-10', 'T-DEM-11', 'T-DEM-12', 'T-DEM-13'].map(id => [id, 'life history over years'])),
};
export const YEAR_DAYS = 365;
/**
 * Rare-event rows (Track E handoff §4.5, registered 1 October 2026). Under the 90-day cap each rests on a handful of
 * events (T-HUN-4 a regression over few hunts, T-BRD-1 few border stops), so a perturbation that changes nothing but
 * one draw moves each by up to ~1, and the two were two thirds of the baseline's held-out sum. They stay in every sum;
 * every sum and every comparison is also reported without them, so no stage sets them aside by hand.
 */
export const RARE_EVENT_ROWS: readonly string[] = ['T-HUN-4', 'T-BRD-1'];
const rare = (id: string) => RARE_EVENT_ROWS.includes(id);
/** Flags under which the scorer reports a row but never counts it: kept out of the sums here too. */
const EXCLUDING_FLAGS = ['compromised', 'not scorable', 'instrument below bar'];

interface Target { id: string; role: 'fitted' | 'held-out'; encoded: boolean; accept: { lo: number | null; hi: number | null; units: string } }
/** A row of the field scorecard JSON (src/field/targets.ts publicRow): sealed rows carry only id, metric, role and the sealing text. */
type CardRow = { id: string; metric: string; role: 'fitted' | 'held-out'; encoded: boolean } & Partial<{ sealed: string; band: string; verdict: string; note: string; perSeed: (number | null)[]; pooled: number | null; parts: Record<string, number | null>; flags: string[]; units: string }>;
export interface BenchRow {
  id: string; metric: string; role: 'fitted' | 'held-out'; encoded: boolean;
  /** Sealed (stage C8): nothing but the id, metric and role is ever shown. */
  sealed: boolean;
  band: string; units: string; pooled: number | null; perSeed: (number | null)[]; parts: Record<string, number | null>;
  verdict: string; flags: string[];
  kind: RowDistance['kind'] | 'sealed'; distance: number | null; partDistances: Record<string, number> | null; perSeedDistance: (number | null)[];
  oneSided: boolean; degenerate: boolean;
  /** Reported and never summed (compromised, not scorable, instrument below its bar). */
  excluded: boolean;
  /** The row needs a longer window than this run (NEEDS_YEAR): verdict insufficient, no distance, never summed. */
  window: boolean;
}

/** "female 31–39, male 18–24" (the scorer's band text of a row with a band per part) → bands by part; null otherwise. */
export function parsePartBands(band: string): Record<string, OpenBand> | null {
  const parts = band.split(', ').map(s => /^(\w+) (-?[\d.]+)–(-?[\d.]+)$/.exec(s));
  return band && parts.every(Boolean) ? Object.fromEntries(parts.map(m => [m![1], { lo: +m![2], hi: +m![3] }])) : null;
}

/** Scorecard rows → benchmark rows with their distances. `days` is the scored window: rows that need a year are insufficient below it. */
export function benchRows(card: CardRow[], targets: Target[], days = YEAR_DAYS): BenchRow[] {
  return card.map(r => {
    const base = { id: r.id, metric: r.metric, role: r.role, encoded: r.encoded };
    if (r.sealed !== undefined || r.verdict === 'sealed') return { ...base, sealed: true, band: '', units: '', pooled: null, perSeed: [], parts: {}, verdict: 'sealed', flags: [], kind: 'sealed' as const, distance: null, partDistances: null, perSeedDistance: [], oneSided: false, degenerate: false, excluded: true, window: false };
    const t = targets.find(x => x.id === r.id), accept: OpenBand = t ? { lo: t.accept.lo, hi: t.accept.hi } : { lo: null, hi: null };
    const bandParts = METRICS.find(m => m.id === r.id)?.bandParts;
    const partBands = (accept.lo === null && accept.hi === null ? parsePartBands(r.band ?? '') : null) ?? (bandParts ? Object.fromEntries(bandParts.map(k => [k, accept])) : undefined);
    const short = days < YEAR_DAYS && r.id in NEEDS_YEAR && !['n/a', 'structural'].includes(r.verdict ?? 'n/a');
    const verdict = short ? 'insufficient' : r.verdict ?? 'n/a';
    const d = rowDistance({ id: r.id, accept, partBands, pooled: r.pooled ?? null, parts: r.parts, verdict });
    const flags = [...(r.flags ?? []), ...(short ? [`window too short (${NEEDS_YEAR[r.id]})`] : [])];
    return { ...base, sealed: false, window: short, band: r.band ?? '', units: r.units ?? '', pooled: r.pooled ?? null, perSeed: r.perSeed ?? [], parts: r.parts ?? {}, verdict, flags,
      kind: d.kind, distance: d.distance, partDistances: d.parts ?? null, perSeedDistance: d.kind === 'numeric' && !partBands ? (r.perSeed ?? []).map(v => openBandDistance(v, accept)) : [],
      oneSided: d.oneSided, degenerate: d.degenerate, excluded: EXCLUDING_FLAGS.some(f => flags.includes(f)) };
  });
}

export interface Distances {
  fitted: DistanceSum; heldOut: DistanceSum; fittedEncoded: DistanceSum; heldOutEncoded: DistanceSum;
  /** The fitted and held-out sums without RARE_EVENT_ROWS. */
  fittedNoRare: DistanceSum; heldOutNoRare: DistanceSum; sealed: number;
}
export function distances(rows: BenchRow[]): Distances {
  const sum = (keep: (r: BenchRow) => boolean) => sumDistances(rows.filter(r => !r.sealed && keep(r)).map(r => ({ d: { kind: r.kind as RowDistance['kind'], distance: r.distance, oneSided: r.oneSided, degenerate: r.degenerate }, verdict: r.verdict, excluded: r.excluded, window: r.window })));
  return { fitted: sum(r => r.role === 'fitted'), heldOut: sum(r => r.role === 'held-out'), fittedEncoded: sum(r => r.role === 'fitted' && r.encoded), heldOutEncoded: sum(r => r.role === 'held-out' && r.encoded),
    fittedNoRare: sum(r => r.role === 'fitted' && !rare(r.id)), heldOutNoRare: sum(r => r.role === 'held-out' && !rare(r.id)), sealed: rows.filter(r => r.sealed).length };
}

export interface BenchDoc {
  tool: 'e-bench'; version: 1; date: string; label: string; mode: string;
  config: { profile: 'field'; days: number; burnInDays: number; seeds: number[]; params: Overrides; workers: number };
  git: { commit: string; branch: string; dirty: number }; protocolHash: string | null; registryHash: string;
  headline: { fittedDistance: number; heldOutDistance: number; prescriptionCount: number; viability: 'pass' | 'fail' | 'not measured' };
  distance: Distances; prescriptions: PrescriptionCount;
  viability: { perSeed: Viability[]; verdict: ViabilityVerdict } | null;
  summary: Record<string, Record<string, number>>; rows: BenchRow[];
  timing: { scorecardS: number | null; viabilityS: number | null; totalS: number | null };
  scorecard: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------------------------------------------------

const counted = (r: BenchRow | undefined) => !!r && !r.sealed && !r.excluded && !r.window && r.kind === 'numeric' && r.distance !== null;
export interface HeadlineChange { before: number; after: number; raw: number; common: number; commonRows: number; commonNoRare: number; commonRowsNoRare: number }
export interface Comparison {
  rows: { id: string; role: string; before: number | null; after: number | null; delta: number | null; beforeVerdict: string; afterVerdict: string }[];
  /**
   * Change in each headline: `raw` over each run's own rows; `common` over rows summed in both runs (the fair
   * comparison); `commonNoRare` the same without RARE_EVENT_ROWS.
   */
  fitted: HeadlineChange; heldOut: HeadlineChange;
  prescriptionCount: { before: number; after: number; delta: number };
  viability: { before: string; after: string };
  /** Rows summed in one run only (insufficient data in the other, or a changed flag). */
  onlyBefore: string[]; onlyAfter: string[];
  sameSettings: boolean;
}
export function compare(before: BenchDoc, after: BenchDoc): Comparison {
  const B = new Map(before.rows.map(r => [r.id, r])), rows: Comparison['rows'] = [], onlyBefore: string[] = [], onlyAfter: string[] = [];
  const head = (role: 'fitted' | 'held-out', b: number, a: number): HeadlineChange => {
    let common = 0, n = 0, commonNoRare = 0, nNoRare = 0;
    for (const r of after.rows) {
      const p = B.get(r.id);
      if (r.role !== role || !counted(r) || !counted(p)) continue;
      const d = r.distance! - p!.distance!;
      common += d; n++;
      if (!rare(r.id)) { commonNoRare += d; nNoRare++; }
    }
    return { before: b, after: a, raw: a - b, common, commonRows: n, commonNoRare, commonRowsNoRare: nNoRare };
  };
  for (const r of after.rows) {
    if (r.sealed) continue;
    const p = B.get(r.id), cb = counted(p), ca = counted(r);
    if (cb && !ca) onlyBefore.push(r.id);
    if (ca && !cb) onlyAfter.push(r.id);
    rows.push({ id: r.id, role: r.role, before: cb ? p!.distance : null, after: ca ? r.distance : null, delta: cb && ca ? r.distance! - p!.distance! : null, beforeVerdict: p?.verdict ?? '—', afterVerdict: r.verdict });
  }
  const c = (d: BenchDoc) => JSON.stringify([d.config.days, d.config.burnInDays, d.config.seeds]);
  return { rows, fitted: head('fitted', before.headline.fittedDistance, after.headline.fittedDistance), heldOut: head('held-out', before.headline.heldOutDistance, after.headline.heldOutDistance),
    prescriptionCount: { before: before.headline.prescriptionCount, after: after.headline.prescriptionCount, delta: after.headline.prescriptionCount - before.headline.prescriptionCount },
    viability: { before: before.headline.viability, after: after.headline.viability }, onlyBefore, onlyAfter, sameSettings: c(before) === c(after) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------------------------------

const f = (v: number | null | undefined, d = 3) => v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d);
const signed = (v: number | null, d = 3) => v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}`;
/** The rows a sum leaves out, beside every headline number. */
export const leftOut = (s: DistanceSum) => `${s.window} need a longer window, ${s.unscored} without a value, ${s.excluded} flagged, ${s.pattern.pass + s.pattern.fail + s.pattern.other} pattern rows`;
const sumLine = (s: DistanceSum) => `${f(s.sum)} over ${s.rows} rows (${s.outside} outside their band; capped at one band width per row: ${f(s.capped)}); left out: ${s.window} rows that need a longer window, ${s.unscored} numeric rows without a value, ${s.excluded} flagged (compromised, not scorable or instrument below its bar); pattern rows ${s.pattern.pass} pass / ${s.pattern.fail} fail / ${s.pattern.other} not scored`;
export const furthest = (rows: BenchRow[], n = 10) => rows.filter(counted).filter(r => r.distance! > 0).sort((a, b) => b.distance! - a.distance!).slice(0, n);

export function benchMarkdown(doc: BenchDoc, cmp?: { other: string; c: Comparison }): string {
  const o: string[] = [], v = doc.viability;
  o.push(`# E-bench: ${doc.label} (${doc.mode})`, '');
  o.push(`Field profile, ${doc.config.days} days after a ${doc.config.burnInDays}-day burn-in, seeds ${doc.config.seeds.join(', ')}, overrides ${Object.keys(doc.config.params).length ? `\`${JSON.stringify(doc.config.params)}\`` : 'none'}. Generated ${doc.date} by \`scripts/e-bench.ts\` at commit \`${doc.git.commit.slice(0, 10)}\` (${doc.git.branch}${doc.git.dirty ? `, ${doc.git.dirty} uncommitted files in src, scripts or data` : ''}). Protocol hash \`${doc.protocolHash ?? '—'}\`, registry hash \`${doc.registryHash}\`. Wall time ${doc.timing.totalS === null ? '—' : `${doc.timing.totalS} s (scorecard ${doc.timing.scorecardS} s, viability replay ${doc.timing.viabilityS ?? '—'} s) on ${doc.config.workers} workers`}.`, '');
  if (doc.config.days < YEAR_DAYS) o.push(`The scored window is ${doc.config.days} days: rows that need a year (annual ranges, statistics across months, life tables, rare events per year) are reported as insufficient and left out of the sums. Compare this run only with runs of the same mode.`, '');
  o.push('## Headline', '', '| Number | Value |', '| --- | --- |');
  o.push(`| 1. Summed band distance, fitted rows | **${f(doc.headline.fittedDistance)}** over ${doc.distance.fitted.rows} rows (${doc.distance.fitted.outside} outside their band); left out: ${leftOut(doc.distance.fitted)} |`);
  o.push(`| 2. Summed band distance, held-out rows | **${f(doc.headline.heldOutDistance)}** over ${doc.distance.heldOut.rows} rows (${doc.distance.heldOut.outside} outside their band); left out: ${leftOut(doc.distance.heldOut)}, ${doc.distance.sealed} sealed |`);
  o.push(`| 1–2 without the rare-event rows (${RARE_EVENT_ROWS.join(', ')}) | fitted ${f(doc.distance.fittedNoRare.sum)} over ${doc.distance.fittedNoRare.rows} rows; held-out ${f(doc.distance.heldOutNoRare.sum)} over ${doc.distance.heldOutNoRare.rows} rows |`);
  o.push(`| 3. Prescription count | **${doc.headline.prescriptionCount}** (${doc.prescriptions.registryActive} outcome-encoding registry entries in use + ${doc.prescriptions.literals} literals in src/sim) |`);
  o.push(`| Viability | **${doc.headline.viability}**${v ? `: births ${v.verdict.births}, deaths ${v.verdict.deaths}, births ÷ deaths ${f(v.verdict.ratio, 2)}, starvation deaths ${v.verdict.starvationDeaths}${v.verdict.fewEvents ? '; too few births and deaths to compare them' : ''}${v.verdict.reasons.length ? ` (${v.verdict.reasons.join('; ')})` : ''}` : ''} |`, '');
  o.push('Band distance is 0 inside a row\'s band, else the gap to the nearest edge ÷ the band width (one-sided bands: ÷ the edge value); rows scored on parts take the mean of their parts. Pattern rows have no distance and are counted apart; so are rows without a value. Rows that need a longer window than the run, and compromised, not-scorable and instrument-below-bar rows, are shown and never summed; sealed rows show nothing (scripts/lib/band-distance.ts).', '');
  o.push(`- Fitted: ${sumLine(doc.distance.fitted)}. Of which encoded rows: ${f(doc.distance.fittedEncoded.sum)} over ${doc.distance.fittedEncoded.rows}.`);
  o.push(`- Held-out: ${sumLine(doc.distance.heldOut)}. Of which encoded rows: ${f(doc.distance.heldOutEncoded.sum)} over ${doc.distance.heldOutEncoded.rows}. Sealed rows (C8 proof only): ${doc.distance.sealed}.`, '');
  if (v) {
    o.push('## Viability (simulation truth, scored window)', '', '| Seed | Living start → end | Births | Deaths | Births ÷ deaths | Starvation deaths | Orphaned-infant deaths | Median adult hunger | Median lactating hunger | Deaths by cause |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const s of v.perSeed) o.push(`| ${s.seed} | ${s.livingStart} → ${s.livingEnd} | ${s.births} | ${s.deaths} | ${f(s.ratio, 2)} | ${s.starvationDeaths}${s.burnInStarvationDeaths ? ` (+${s.burnInStarvationDeaths} in burn-in)` : ''} | ${s.orphanInfantDeaths} | ${f(s.medianAdultHunger, 2)} | ${f(s.medianLactatingHunger, 2)} | ${Object.entries(s.deathsByCause).map(([k, n]) => `${k} ${n}`).join('; ') || '—'} |`);
    o.push('', `Guard: pooled births ≥ pooled deaths (applied from ${MIN_EVENTS} births and deaths together${v.verdict.fewEvents ? '; not applied here' : ''}), no starvation death in the scored window, no seed below ${MIN_LIVING_SHARE * 100}% of its starting population. ${v.verdict.pass ? 'Passes.' : `Fails: ${v.verdict.reasons.join('; ')}.`}`, '');
  }
  if (cmp) {
    const c = cmp.c;
    o.push(`## Compared with ${cmp.other}`, '');
    if (!c.sameSettings) o.push('**The two runs differ in length or seeds: the differences below are not a like-for-like comparison.**', '');
    o.push(`| Number | Before | After | Change | Change on rows scored in both | … without ${RARE_EVENT_ROWS.join(' and ')} |`, '| --- | --- | --- | --- | --- | --- |');
    o.push(`| Fitted distance | ${f(c.fitted.before)} | ${f(c.fitted.after)} | ${signed(c.fitted.raw)} | ${signed(c.fitted.common)} (${c.fitted.commonRows} rows) | ${signed(c.fitted.commonNoRare)} (${c.fitted.commonRowsNoRare} rows) |`);
    o.push(`| Held-out distance | ${f(c.heldOut.before)} | ${f(c.heldOut.after)} | ${signed(c.heldOut.raw)} | ${signed(c.heldOut.common)} (${c.heldOut.commonRows} rows) | ${signed(c.heldOut.commonNoRare)} (${c.heldOut.commonRowsNoRare} rows) |`);
    o.push(`| Prescription count | ${c.prescriptionCount.before} | ${c.prescriptionCount.after} | ${signed(c.prescriptionCount.delta, 0)} | | |`);
    o.push(`| Viability | ${c.viability.before} | ${c.viability.after} | | | |`, '');
    if (c.onlyBefore.length || c.onlyAfter.length) o.push(`Rows summed in one run only: before ${c.onlyBefore.join(', ') || 'none'}; after ${c.onlyAfter.join(', ') || 'none'}.`, '');
    o.push('| Row | Role | Before | After | Change in distance | Verdict before → after |', '| --- | --- | --- | --- | --- | --- |');
    for (const r of [...c.rows].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))) if ((r.delta ?? 0) !== 0 || r.beforeVerdict !== r.afterVerdict || (r.before === null) !== (r.after === null)) o.push(`| ${r.id} | ${r.role} | ${f(r.before)} | ${f(r.after)} | ${signed(r.delta)} | ${r.beforeVerdict} → ${r.afterVerdict} |`);
    o.push('');
  }
  o.push('## Rows furthest from their bands', '', '| Row | Role | Metric | Band | Pooled value | Distance |', '| --- | --- | --- | --- | --- | --- |');
  for (const r of furthest(doc.rows)) o.push(`| ${r.id}${r.encoded ? ' (enc.)' : ''} | ${r.role} | ${r.metric} | ${r.band} | ${r.partDistances ? Object.entries(r.parts).filter(([k]) => k in r.partDistances!).map(([k, x]) => `${k} ${f(x, 2)}`).join(', ') : f(r.pooled, 2)} | ${f(r.distance)} |`);
  o.push('');
  for (const role of ['fitted', 'held-out'] as const) {
    o.push(`## ${role === 'fitted' ? 'Fitted' : 'Held-out'} rows`, '', '| Row | Enc. | Band | Pooled | Per seed | Verdict | Distance | Notes |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of doc.rows.filter(x => x.role === role)) {
      if (r.sealed) { o.push(`| ${r.id} | | sealed | | | sealed | | ${r.metric} |`); continue; }
      const notes = [...r.flags, ...(r.excluded ? ['not summed'] : []), ...(r.kind === 'pattern' ? ['pattern row: no distance'] : []), ...(r.kind === 'unscored' && !r.window ? ['no value: not summed'] : []), ...(r.oneSided ? ['one-sided band'] : []), ...(r.degenerate ? ['raw units'] : [])];
      const band = r.band.length > 60 ? `${r.band.slice(0, 57)}…` : r.band;
      o.push(`| ${r.id} | ${r.encoded ? 'yes' : ''} | ${band} | ${r.partDistances ? Object.entries(r.parts).filter(([k]) => k in r.partDistances!).map(([k, x]) => `${k} ${f(x, 2)}`).join(', ') : f(r.pooled, 2)} | ${r.perSeed.map(x => f(x, 2)).join(' / ') || '—'} | ${r.verdict} | ${f(r.distance)} | ${notes.join('; ')} |`);
    }
    o.push('');
  }
  return o.join('\n');
}

function printStdout(doc: BenchDoc, cmp?: Comparison) {
  const pad = (s: string, n: number) => s.length >= n ? s : s + ' '.repeat(n - s.length);
  console.log(`\nE-bench ${doc.label} (${doc.mode}): field, ${doc.config.days} days after ${doc.config.burnInDays}, seeds ${doc.config.seeds.join(', ')}${Object.keys(doc.config.params).length ? `, overrides ${JSON.stringify(doc.config.params)}` : ''}\n`);
  console.log(`${pad('row', 10)} ${pad('role', 9)} enc ${pad('band', 22)} ${pad('pooled', 10)} ${pad('verdict', 13)} ${pad('distance', 9)} per seed`);
  for (const r of doc.rows) {
    if (r.sealed) { console.log(`${pad(r.id, 10)} ${pad(r.role, 9)}     sealed`); continue; }
    const tag = r.window ? ' (needs a longer window)' : r.excluded ? ' (not summed)' : r.kind === 'pattern' ? ' (pattern)' : r.kind === 'unscored' ? ' (no value)' : '';
    console.log(`${pad(r.id, 10)} ${pad(r.role, 9)} ${r.encoded ? 'yes' : '   '} ${pad(r.band.slice(0, 22), 22)} ${pad(f(r.pooled, 2), 10)} ${pad(r.verdict, 13)} ${pad(f(r.distance), 9)} ${r.perSeed.map(x => f(x, 2)).join(' / ')}${tag}`);
  }
  const v = doc.viability;
  console.log(`\n1. fitted band distance     ${f(doc.headline.fittedDistance)}   (${sumLine(doc.distance.fitted)})`);
  console.log(`2. held-out band distance   ${f(doc.headline.heldOutDistance)}   (${sumLine(doc.distance.heldOut)}; ${doc.distance.sealed} sealed)`);
  console.log(`   without ${RARE_EVENT_ROWS.join(' and ')}   fitted ${f(doc.distance.fittedNoRare.sum)} over ${doc.distance.fittedNoRare.rows} rows, held-out ${f(doc.distance.heldOutNoRare.sum)} over ${doc.distance.heldOutNoRare.rows} rows`);
  console.log(`3. prescription count       ${doc.headline.prescriptionCount}   (${doc.prescriptions.registryActive} registry entries in use + ${doc.prescriptions.literals} literals${doc.prescriptions.inactive.length ? `; not in use: ${doc.prescriptions.inactive.join(', ')}` : ''})`);
  console.log(`   viability                ${doc.headline.viability}${v ? `   births ${v.verdict.births}, deaths ${v.verdict.deaths}, ratio ${f(v.verdict.ratio, 2)}, starvation deaths ${v.verdict.starvationDeaths}${v.verdict.fewEvents ? '; too few births and deaths to compare them' : ''}${v.verdict.reasons.length ? `; ${v.verdict.reasons.join('; ')}` : ''}` : ''}`);
  if (v) for (const s of v.perSeed) console.log(`     seed ${pad(String(s.seed), 4)} living ${s.livingStart} → ${s.livingEnd}, births ${s.births}, deaths ${s.deaths}, ratio ${f(s.ratio, 2)}, starvation ${s.starvationDeaths}, adult hunger ${f(s.medianAdultHunger, 2)}, lactating ${f(s.medianLactatingHunger, 2)}`);
  if (doc.config.days < YEAR_DAYS) console.log(`   note: ${doc.config.days}-day window; rows that need a year are insufficient and left out of both sums (counts above).`);
  console.log('\nFurthest from their bands:');
  for (const r of furthest(doc.rows)) console.log(`  ${pad(r.id, 10)} ${pad(r.role, 9)} ${pad(f(r.distance), 8)} ${r.metric} (band ${r.band}; value ${r.partDistances ? Object.entries(r.parts).filter(([k]) => k in r.partDistances!).map(([k, x]) => `${k} ${f(x, 2)}`).join(', ') : f(r.pooled, 2)})`);
  if (cmp) {
    console.log(`\nBefore → after${cmp.sameSettings ? '' : '   (the runs differ in length or seeds: not like for like)'}`);
    const common = (h: HeadlineChange) => `on ${h.commonRows} rows scored in both: ${signed(h.common)}; without ${RARE_EVENT_ROWS.join(' and ')}, on ${h.commonRowsNoRare}: ${signed(h.commonNoRare)}`;
    console.log(`  fitted distance     ${f(cmp.fitted.before)} → ${f(cmp.fitted.after)}   ${signed(cmp.fitted.raw)}   (${common(cmp.fitted)})`);
    console.log(`  held-out distance   ${f(cmp.heldOut.before)} → ${f(cmp.heldOut.after)}   ${signed(cmp.heldOut.raw)}   (${common(cmp.heldOut)})`);
    console.log(`  prescription count  ${cmp.prescriptionCount.before} → ${cmp.prescriptionCount.after}   ${signed(cmp.prescriptionCount.delta, 0)}`);
    console.log(`  viability           ${cmp.viability.before} → ${cmp.viability.after}`);
    if (cmp.onlyBefore.length || cmp.onlyAfter.length) console.log(`  rows summed in one run only: before ${cmp.onlyBefore.join(', ') || 'none'}; after ${cmp.onlyAfter.join(', ') || 'none'}`);
    console.log(`  ${pad('row', 10)} ${pad('before', 8)} ${pad('after', 8)} change`);
    for (const r of [...cmp.rows].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))) if ((r.delta ?? 0) !== 0 || (r.before === null) !== (r.after === null)) console.log(`  ${pad(r.id, 10)} ${pad(f(r.before), 8)} ${pad(f(r.after), 8)} ${signed(r.delta)}${r.beforeVerdict !== r.afterVerdict ? `   ${r.beforeVerdict} → ${r.afterVerdict}` : ''}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Assembly and CLI
// ---------------------------------------------------------------------------------------------------------------------

type Scorecard = { manifest: { profile: string; days: number; burnInDays: number; seeds: number[]; params: Overrides; protocolHash?: string }; rows: CardRow[]; summary: Record<string, Record<string, number>>; timing?: { poolMs: number } };
const loadTargets = () => (JSON.parse(readFileSync(resolve(ROOT, 'data/targets.json'), 'utf8')) as { targets: Target[] }).targets;

export function assemble(card: Scorecard, viability: Viability[] | null, meta: { label: string; mode: string; workers: number; timing: BenchDoc['timing']; scorecard: string; git: BenchDoc['git'] }): BenchDoc {
  const rows = benchRows(card.rows, loadTargets(), card.manifest.days), d = distances(rows), count = prescriptionCount(card.manifest.params ?? {});
  const verdict = viability ? viabilityVerdict(viability) : null;
  return { tool: 'e-bench', version: 1, date: new Date().toISOString(), label: meta.label, mode: meta.mode,
    config: { profile: 'field', days: card.manifest.days, burnInDays: card.manifest.burnInDays, seeds: card.manifest.seeds, params: card.manifest.params ?? {}, workers: meta.workers },
    git: meta.git, protocolHash: card.manifest.protocolHash ?? null, registryHash: REGISTRY_HASH,
    headline: { fittedDistance: d.fitted.sum, heldOutDistance: d.heldOut.sum, prescriptionCount: count.total, viability: verdict ? (verdict.pass ? 'pass' : 'fail') : 'not measured' },
    distance: d, prescriptions: count, viability: viability && verdict ? { perSeed: viability, verdict } : null, summary: card.summary, rows, timing: meta.timing, scorecard: meta.scorecard };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const has = (name: string) => args.includes(`--${name}`);
  const readDoc = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as BenchDoc;
  const finish = (doc: BenchDoc, out: string) => {
    const other = flag('compare', ''), c = other ? compare(readDoc(other), doc) : undefined;
    writeFileSync(`${out}.json`, JSON.stringify(c ? { ...doc, comparison: { with: other, ...c } } : doc, null, 1) + '\n');
    writeFileSync(`${out}.md`, benchMarkdown(doc, c ? { other, c } : undefined));
    printStdout(doc, c);
    console.log(`\nwrote ${out}.json and ${out}.md${doc.timing.totalS !== null ? ` (${doc.timing.totalS} s)` : ''}`);
  };
  const git = (...a: string[]) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
  const gitInfo = () => ({ commit: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), dirty: git('status', '--porcelain', '--', 'src', 'scripts', 'data').split('\n').filter(Boolean).length });

  if (has('rescore')) {
    const file = resolve(flag('rescore', '')), saved = readDoc(file), out = has('out') ? resolve(flag('out', '')) : file.replace(/\.json$/, '');
    const card = JSON.parse(readFileSync(saved.scorecard, 'utf8')) as Scorecard;
    return finish(assemble(card, saved.viability?.perSeed ?? null, { label: saved.label, mode: saved.mode, workers: saved.config.workers, timing: saved.timing, scorecard: saved.scorecard, git: saved.git }), out);
  }

  if (has('merge')) return mergeCommand(flag('merge', '').split(',').filter(Boolean).map(x => resolve(x)), resolve(flag('out', '')), { workers: Math.max(1, +flag('workers', '1')), finish, has });

  const mode = has('full') ? 'full' : has('m24') ? 'm24' : has('m12') ? 'm12' : has('m6') ? 'm6' : has('confirm') ? 'confirm' : 'quick';
  const days = +flag('days', String(MODES[mode].days)), burnInDays = +flag('burn-in', String(MODES[mode].burnInDays));
  const seeds = flag('seeds', MODES[mode].seeds.join(',')).split(',').map(Number), workers = Math.max(1, +flag('workers', '2'));
  const label = days === MODES[mode].days && burnInDays === MODES[mode].burnInDays && seeds.join() === MODES[mode].seeds.join() ? mode : 'custom';
  if (days + burnInDays > MAX_TOTAL_DAYS) { console.error(`e-bench: ${burnInDays} + ${days} days is longer than ${MAX_TOTAL_DAYS} days in all (user limit, 4 October 2026: at most two years, burn-in included).`); process.exit(2); }
  const paramsText = flag('params', '{}'), params = JSON.parse(paramsText) as Overrides;
  if (seeds.some(s => !Number.isInteger(s))) { console.error('--seeds must be integers'); process.exit(2); }
  const out = resolve(flag('out', `artifacts/validation/e/${label}`)), cardFile = `${out}.scorecard.json`;
  mkdirSync(dirname(out), { recursive: true });
  const same = (m: { days: number; burnInDays: number; seeds: number[]; params: Overrides }) => m.days === days && m.burnInDays === burnInDays && JSON.stringify(m.seeds) === JSON.stringify(seeds) && JSON.stringify(m.params ?? {}) === JSON.stringify(params);
  const t0 = performance.now();
  if (!has('legacy')) return singlePass({ flag, has, mode, label, days, burnInDays, seeds, workers, params, out, t0, finish, git, gitInfo });

  // --legacy: the two-step path of 1 October (kept to compare with the single pass)
  // 1. the field scorecard, unchanged, in a child process
  let scorecardS: number | null = null;
  let card = has('reuse') && existsSync(cardFile) ? JSON.parse(readFileSync(cardFile, 'utf8')) as Scorecard : null;
  if (card && !(card.manifest.profile === 'field' && same(card.manifest))) card = null;
  if (card) { scorecardS = card.timing ? Math.round(card.timing.poolMs / 1000) : null; console.error(`e-bench: reusing ${cardFile}`); }
  else {
    console.error(`e-bench: field scorecard, ${days} days after ${burnInDays}, seeds ${seeds.join(', ')}, ${workers} workers`);
    const log = openSync(`${out}.scorecard.log`, 'w'), s0 = performance.now();
    const r = spawnSync(process.execPath, [...process.execArgv, resolve(ROOT, 'scripts/field-metrics.ts'), '--profile', 'field', '--days', String(days), '--burn-in', String(burnInDays), '--seeds', seeds.join(','),
      '--workers', String(workers), '--params', paramsText, '--json', cardFile, '--md', `${out}.scorecard.md`], { cwd: ROOT, stdio: ['ignore', log, 'inherit'] });
    closeSync(log);
    if (r.status !== 0) { console.error(`e-bench: scripts/field-metrics.ts failed (exit ${r.status}); see ${out}.scorecard.log`); process.exit(1); }
    scorecardS = Math.round((performance.now() - s0) / 1000);
    card = JSON.parse(readFileSync(cardFile, 'utf8')) as Scorecard;
  }

  // 2. viability on simulation truth: the same worlds replayed without the observer
  let viability: Viability[] | null = null, viabilityS: number | null = null;
  if (!has('no-viability')) {
    const prev = has('reuse') && existsSync(`${out}.json`) ? readDoc(`${out}.json`) : null;
    if (prev?.viability && same(prev.config)) { viability = prev.viability.perSeed; viabilityS = prev.timing.viabilityS; console.error(`e-bench: reusing the viability of ${out}.json`); }
    else {
      console.error('e-bench: viability replay');
      const v0 = performance.now(), jobs: ViabilityJob[] = seeds.map(seed => ({ seed, profile: 'field', params, burnInDays, days }));
      viability = await runPool<ViabilityJob, Viability>(new URL('./lib/viability-worker.ts', import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`seed ${jobs[i].seed}: replay in ${(ms / 1000).toFixed(0)} s`) });
      viabilityS = Math.round((performance.now() - v0) / 1000);
    }
  }
  const reused = has('reuse') && (scorecardS === null || viabilityS === null);
  const totalS = reused ? null : has('reuse') ? (scorecardS ?? 0) + (viabilityS ?? 0) : Math.round((performance.now() - t0) / 1000);
  finish(assemble(card, viability, { label: flag('out', label).split('/').pop()!, mode: label, workers, timing: { scorecardS, viabilityS, totalS }, scorecard: cardFile, git: gitInfo() }), out);
}

// ---------------------------------------------------------------------------------------------------------------------
// Single pass, parts, merge and checkpoints (track E, parts E1 and E2; 5 October 2026)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The long-run runner's contract (agreed with eR-runs, 5 October 2026). `--part` (one seed) writes
 * `<out>.part.json.gz` last (temporary name, then rename): the per-seed records an arm pools. `--merge p1,p2,…`
 * (parts in seed order) writes what a multi-seed run writes. `--until-day D` (absolute day, burn-in included) writes
 * `<out>.ckpt-dD.v8.gz` and its sidecar `<out>.ckpt-dD.json`, then stops; `--resume <ckpt>` continues it. Exit 0 when
 * the part, the outputs or the checkpoint are written; 2 on a usage error or a refused resume; 1 on a crash.
 */
export const RUN_CONTRACT = 1;

/** Code and data a run depends on: git trees at HEAD, a hash of uncommitted changes, the registry and protocol hashes. */
export type Identity = { trees: Record<string, string>; uncommitted: string | null; registryHash: string; protocolHash: string };
type Git = (...a: string[]) => string;
function identityOf(git: Git): Identity {
  const dirs = ['src', 'scripts', 'data'];
  const h = createHash('sha256');
  let any = false;
  try {
    const diff = execFileSync('git', ['diff', 'HEAD', '--binary', '--', ...dirs], { cwd: ROOT, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] });
    if (diff.length) { any = true; h.update(diff); }
    for (const f of git('ls-files', '--others', '--exclude-standard', '--', ...dirs).split('\n').filter(Boolean).sort()) { any = true; h.update(f); h.update(readFileSync(resolve(ROOT, f))); }
  } catch { any = true; h.update('not a git checkout'); }
  return { trees: Object.fromEntries(dirs.map(d => [d, git('rev-parse', `HEAD:${d}`)])), uncommitted: any ? h.digest('hex').slice(0, 16) : null, registryHash: REGISTRY_HASH, protocolHash: protocolHash() };
}

/** A part file: the header the runner reads, then the per-seed records (scripts/lib/bench-run.ts BenchPart). */
export type PartFile = BenchPart & { mode: string; git: BenchDoc['git']; identity: Identity; protocolHash: string; registryHash: string; date: string };
const canonJson = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, (x as Record<string, unknown>)[k]])) : x);
export function readPart(file: string): PartFile {
  const buf = readFileSync(file);
  return decodeLossless<PartFile>((file.endsWith('.gz') ? gunzipSync(buf) : buf).toString('utf8'));
}
function writePart(file: string, p: PartFile): void { writeAtomic(file, gzipSync(Buffer.from(encodeLossless(p)), { level: 6 })); }

/** The newest checkpoint `<prefix>.s<seed>.ckpt-d<D>.v8.gz` (complete: with its sidecar) at or before day `end`. */
function findCheckpoint(prefix: string, seed: number, end: number): string | null {
  const dir = dirname(prefix), base = `${basename(prefix)}.s${seed}.ckpt-d`;
  if (!existsSync(dir)) return null;
  const days = readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith('.v8.gz')).map(f => +f.slice(base.length, -'.v8.gz'.length))
    .filter(d => Number.isFinite(d) && d <= end && existsSync(sidecarOf(resolve(dir, `${base}${d}.v8.gz`)))).sort((a, b) => b - a);
  return days.length ? resolve(dir, `${base}${days[0]}.v8.gz`) : null;
}

type Flags = { flag: (name: string, dflt: string) => string; has: (name: string) => boolean };
interface SinglePassOptions extends Flags {
  mode: string; label: string; days: number; burnInDays: number; seeds: number[]; workers: number; params: Overrides; out: string; t0: number;
  finish: (doc: BenchDoc, out: string) => void; git: Git; gitInfo: () => BenchDoc['git'];
}
const usage = (msg: string): never => { console.error(`e-bench: ${msg}`); process.exit(2); };

/** One simulation per seed (scripts/lib/bench-run.ts), in a worker pool; then the parts are pooled (writeOutputs). */
async function singlePass(o: SinglePassOptions): Promise<void> {
  const { flag, has } = o, part = has('part'), end = o.burnInDays + o.days;
  if (part && o.seeds.length !== 1) usage('--part runs exactly one seed (--seeds <s>)');
  const dayList = (v: string) => v.split(',').filter(Boolean).map(Number);
  const ckDays = new Set(dayList(flag('checkpoint-at', '')));
  if ((has('checkpoint') || o.mode === 'm6' || o.mode === 'm12') && !has('no-checkpoint')) ckDays.add(end);
  const stopDay = has('until-day') ? +flag('until-day', '') : null;
  for (const d of [...ckDays, ...(stopDay === null ? [] : [stopDay])]) if (!Number.isFinite(d) || d <= 0 || d > end || !Number.isInteger(Math.round(d * 5760)) || Math.abs(d * 5760 - Math.round(d * 5760)) > 1e-6) usage(`checkpoint day ${d} must fall on a tick between 0 and ${end}`);
  if (stopDay !== null && stopDay >= end) usage(`--until-day ${stopDay} is not before the run's end (day ${end}); a run writes its end checkpoint with --checkpoint`);
  const identity = identityOf(o.git);
  const prefixFor = (seed: number) => part ? o.out : `${o.out}.s${seed}`;
  const partFile = (seed: number) => `${prefixFor(seed)}.part.json.gz`;
  const resumeArg = flag('resume', '');
  const resumeFor = (seed: number) => {
    if (!resumeArg) return null;
    if (part || resumeArg.endsWith('.v8.gz')) return resolve(resumeArg);
    return findCheckpoint(resolve(resumeArg), seed, end) ?? usage(`--resume ${resumeArg}: no complete checkpoint for seed ${seed} at or before day ${end}`);
  };
  const jobs: BenchJob[] = o.seeds.map(seed => ({ seed, profile: 'field', params: o.params, burnInDays: o.burnInDays, days: o.days, observerSeed: 1, experimentEveryDays: 30, truth: true,
    energy: !has('no-energy'), rhythm: !has('no-rhythm'), checkpointDays: [...ckDays].sort((a, b) => a - b), stopDay, checkpointPrefix: prefixFor(seed), resume: resumeFor(seed), identity }));
  // --reuse: a seed whose part is on disk with the same settings and code is not run again
  const settings = (j: Pick<BenchJob, 'params' | 'burnInDays' | 'days' | 'observerSeed' | 'experimentEveryDays' | 'truth' | 'energy' | 'rhythm'>) =>
    canonJson({ params: j.params, burnInDays: j.burnInDays, days: j.days, observerSeed: j.observerSeed, experimentEveryDays: j.experimentEveryDays, truth: j.truth, energy: j.energy, rhythm: j.rhythm });
  const reused = new Map<number, string>();
  if (has('reuse') && stopDay === null) for (const j of jobs) {
    const f = partFile(j.seed);
    if (!existsSync(f)) continue;
    const p = readPart(f);
    if (p.seed === j.seed && settings(p.config) === settings(j) && canonJson(p.identity) === canonJson(identity)) { reused.set(j.seed, f); console.error(`e-bench: reusing ${f}`); }
  }
  const todo = jobs.filter(j => !reused.has(j.seed));
  console.error(`e-bench: single pass, ${o.days} days after ${o.burnInDays}, seeds ${o.seeds.join(', ')}${reused.size ? ` (${reused.size} reused)` : ''}, ${o.workers} workers`);
  const p0 = performance.now();
  type Done = { kind: 'part'; part: string } | Extract<BenchSeedResult, { kind: 'stopped' }>;
  let results: Done[];
  try { results = await runPool<BenchJob, Done>(new URL('./lib/bench-worker.ts', import.meta.url), todo, { size: o.workers, onDone: (i, ms) => console.error(`seed ${todo[i].seed}: done in ${(ms / 1000).toFixed(0)} s`) }); }
  catch (e) { if (String(e).includes('ResumeRefused')) usage(String((e as Error).message ?? e).split('\n')[0]); throw e; }
  const poolMs = performance.now() - p0;
  const stopped = results.filter((r): r is Extract<Done, { kind: 'stopped' }> => r.kind === 'stopped');
  if (stopped.length) { for (const [k, r] of results.entries()) if (r.kind === 'stopped') console.log(`seed ${todo[k].seed}: stopped at day ${r.day}; checkpoint ${r.checkpoint}`); return; }
  const git = o.gitInfo(), date = new Date().toISOString();
  results.forEach((r, k) => {
    if (r.kind !== 'part') return;
    const p = decodeLossless<BenchPart>(r.part);
    const head = { tool: p.tool, version: p.version, seed: p.seed, mode: o.mode, config: p.config, git, identity, protocolHash: identity.protocolHash, registryHash: identity.registryHash, date, timing: p.timing };
    writePart(partFile(todo[k].seed), { ...head, ...p, ...head } as PartFile);
  });
  if (part) { console.log(`wrote ${partFile(o.seeds[0])}`); return; }
  writeOutputs(o.seeds.map(seed => readPart(reused.get(seed) ?? partFile(seed))), o.out, { label: basename(o.out), mode: o.mode, workers: o.workers, poolMs, t0: o.t0, finish: o.finish });
}

/** `--merge p1,p2,…`: the outputs of a multi-seed run from per-seed parts, in the order given. */
function mergeCommand(files: string[], out: string, o: { workers: number; finish: (doc: BenchDoc, out: string) => void; has: (name: string) => boolean }): void {
  if (!files.length) usage('--merge needs part files');
  if (!out || out === resolve('')) usage('--merge needs --out <dir>/<label>');
  mkdirSync(dirname(out), { recursive: true });
  const parts = files.map(readPart);
  writeOutputs(parts, out, { label: basename(out), mode: parts[0].mode, workers: o.workers, poolMs: parts.reduce((a, p) => a + p.timing.wallMs, 0), t0: performance.now(), finish: o.finish });
}

/**
 * Pools per-seed parts in the order given and writes every output of an arm: <out>.scorecard.{json,md,log} (as
 * scripts/field-metrics.ts writes them), <out>.json and <out>.md (the bench, through `finish`), <out>-energy.{json,log}
 * (as scripts/energy-diagnose.ts writes them) and <out>-rhythm.{json,md} (as scripts/rhythm-metrics.ts writes them).
 * The multi-seed run and --merge both come here with parts read from their files, so they write the same bytes
 * (date, timing and workers aside).
 */
function writeOutputs(parts: PartFile[], out: string, o: { label: string; mode: string; workers: number; poolMs: number; t0: number; finish: (doc: BenchDoc, out: string) => void }): void {
  const seeds = parts.map(p => p.seed), c0 = canonJson({ ...parts[0].config }), id0 = canonJson(parts[0].identity);
  if (new Set(seeds).size !== seeds.length) usage(`parts repeat a seed (${seeds.join(', ')})`);
  for (const p of parts) {
    if (p.tool !== 'e-bench-part') usage(`not an e-bench part (seed ${p.seed})`);
    if (canonJson({ ...p.config }) !== c0) usage(`part of seed ${p.seed} has other settings than seed ${parts[0].seed}`);
    if (canonJson(p.identity) !== id0) usage(`part of seed ${p.seed} was made from other code or data than seed ${parts[0].seed}`);
    if (p.mode !== parts[0].mode) usage(`part of seed ${p.seed} is mode ${p.mode}, seed ${parts[0].seed}'s ${parts[0].mode}`);
  }
  const cfg = parts[0].config, cardFile = `${out}.scorecard.json`;
  const card = buildScorecard(parts.map(p => p.field), { profile: cfg.profile, days: cfg.days, seeds, params: cfg.params as Record<string, number>, burnInDays: cfg.burnInDays, experimentsEvery: cfg.experimentEveryDays, truth: cfg.truth, observerSeed: cfg.observerSeed, workers: o.workers, t0: o.t0, poolMs: o.poolMs });
  writeFileSync(cardFile, JSON.stringify(card.json, null, 1));
  writeFileSync(`${out}.scorecard.md`, card.md);
  writeFileSync(`${out}.scorecard.log`, card.text + '\n');
  if (cfg.energy) {
    const r = energyReport(mergeEnergy(parts.map(p => p.energy!)), { profile: cfg.profile, seeds, burnIn: cfg.burnInDays, days: cfg.days, params: cfg.params as Record<string, number>, termBirths: false });
    writeFileSync(`${out}-energy.json`, JSON.stringify(r.json, null, 1));
    writeFileSync(`${out}-energy.log`, r.text + '\n');
  }
  if (cfg.rhythm) {
    const rs = parts.map(p => p.rhythm!), job = { burnIn: cfg.burnInDays, days: cfg.days, params: cfg.params as Record<string, number> };
    writeFileSync(`${out}-rhythm.md`, rhythmReport(rs, job) + '\n');
    writeFileSync(`${out}-rhythm.json`, JSON.stringify({ seeds, burnIn: job.burnIn, days: job.days, params: job.params, results: rs.map(rhythmJsonResult) }, null, 1));
  }
  // simulation-truth rows: one value per seed, in seed order, for every row each seed has a readout for
  const truth: Record<string, SeedValue[]> = {};
  for (const id of Object.keys(parts[0].truth ?? {})) if (parts.every(p => p.truth?.[id])) truth[id] = parts.map(p => p.truth[id]);
  const totalS = Math.round((performance.now() - o.t0) / 1000);
  const doc = assemble(card.json as unknown as Scorecard, parts.map(p => p.viability), { label: o.label, mode: o.mode, workers: o.workers, timing: { scorecardS: Math.round(o.poolMs / 1000), viabilityS: null, totalS }, scorecard: cardFile, git: parts[0].git });
  (doc as BenchDoc & { truth?: Record<string, SeedValue[]> }).truth = truth;
  o.finish(doc, out);
  const missing = Object.keys(NO_READOUT).filter(id => !(id in truth));
  console.log(`simulation-truth rows read: ${Object.keys(truth).length} (${Object.keys(truth).join(', ')}); without a readout (not scorable): ${missing.length} (${missing.join(', ')})`);
  console.log(`wrote ${cardFile.replace(/\.json$/, '')}.{json,md,log}${cfg.energy ? `, ${out}-energy.{json,log}` : ''}${cfg.rhythm ? `, ${out}-rhythm.{json,md}` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
