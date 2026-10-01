// Track E benchmark (IMPLEMENTATION_PLAN.md "Track E: Emergence", iteration protocol steps 3–4). One command, run
// before and after a prescriptive rule is removed, that reports:
//   1. summed band distance on fitted target rows      (how close the model is to the field where it may be fitted)
//   2. summed band distance on held-out target rows    (how close where it may not)
//   3. the prescription count                           (how much of that closeness is prescribed; E0 ledger)
//   plus viability: births, deaths, births ÷ deaths, starvation deaths, living at the end, per seed.
// It wraps the field scorecard: scripts/field-metrics.ts runs unchanged in a child process (same observer, pool, scorer
// and instrument bar; sealed rows stay sealed), then each world is replayed without the observer for viability
// (scripts/lib/viability.ts). Band distance: scripts/lib/band-distance.ts. Prescriptions: scripts/lib/prescriptions.ts.
//
//   pnpm exec tsx scripts/e-bench.ts --quick   [--params '{"id":v}'] [--workers 2] [--out artifacts/validation/e/<label>] [--compare other.json]
//   pnpm exec tsx scripts/e-bench.ts --confirm …    # the deciding benchmark for now
//   pnpm exec tsx scripts/e-bench.ts --rescore artifacts/validation/e/<label>.json [--compare other.json]   # re-derive from a saved run, no simulation
//
// Modes (field profile; the user's limit of 1 October 2026: no simulation longer than 3 months in total):
//   --quick    seeds 48, 7; 30 days after a 30-day burn-in: a direction check.
//   --confirm  seeds 48, 7, 21, 5, 11; 60 days after a 30-day burn-in (90 days in all): decides keep or drop.
//   --full     seeds 48, 7, 21, 5, 11; 365 days after a 180-day burn-in: the plan's benchmark. Kept, not to be run for
//              now: any run longer than 90 days in all is refused without --allow-long.
// Rows that need a year of observation (annual ranges, statistics across months, life tables, rare events per year:
// NEEDS_YEAR below) are reported as "insufficient" in shorter runs and left out of the sums; their count is printed
// beside each headline number, so a before and an after run of the same mode sum over the same rows.
// --seeds, --days N and --burn-in N override a mode (labelled custom). --reuse keeps <out>.scorecard.json and the
// viability of <out>.json when they were made with the same settings (after an interrupted run). --no-viability skips
// the replay. Writes <out>.json, <out>.md, <out>.scorecard.{json,md,log}. Development seeds only (AGENTS.md lists the
// reserved ones).
import { execFileSync, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { METRICS } from '../src/field/metrics';
import { REGISTRY_HASH, type Overrides } from '../src/sim/params';
import { openBandDistance, rowDistance, sumDistances, type DistanceSum, type OpenBand, type RowDistance } from './lib/band-distance';
import { runPool } from './lib/pool';
import type { PrescriptionCount } from './lib/prescriptions';
import { MIN_EVENTS, MIN_LIVING_SHARE, viabilityVerdict, type Viability, type ViabilityJob, type ViabilityVerdict } from './lib/viability';
import { prescriptionCount } from './prescription-ledger';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MODES = {
  quick: { days: 30, burnInDays: 30, seeds: [48, 7] },
  confirm: { days: 60, burnInDays: 30, seeds: [48, 7, 21, 5, 11] },
  full: { days: 365, burnInDays: 180, seeds: [48, 7, 21, 5, 11] },
} as const;
/** Longest simulation (burn-in + scored days) run without --allow-long (user limit, 1 October 2026). */
export const MAX_TOTAL_DAYS = 90;
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

export interface Distances { fitted: DistanceSum; heldOut: DistanceSum; fittedEncoded: DistanceSum; heldOutEncoded: DistanceSum; sealed: number }
export function distances(rows: BenchRow[]): Distances {
  const sum = (keep: (r: BenchRow) => boolean) => sumDistances(rows.filter(r => !r.sealed && keep(r)).map(r => ({ d: { kind: r.kind as RowDistance['kind'], distance: r.distance, oneSided: r.oneSided, degenerate: r.degenerate }, verdict: r.verdict, excluded: r.excluded, window: r.window })));
  return { fitted: sum(r => r.role === 'fitted'), heldOut: sum(r => r.role === 'held-out'), fittedEncoded: sum(r => r.role === 'fitted' && r.encoded), heldOutEncoded: sum(r => r.role === 'held-out' && r.encoded), sealed: rows.filter(r => r.sealed).length };
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
export interface Comparison {
  rows: { id: string; role: string; before: number | null; after: number | null; delta: number | null; beforeVerdict: string; afterVerdict: string }[];
  /** Change in each headline: `raw` over each run's own rows; `common` over rows summed in both runs (the fair comparison). */
  fitted: { before: number; after: number; raw: number; common: number; commonRows: number };
  heldOut: { before: number; after: number; raw: number; common: number; commonRows: number };
  prescriptionCount: { before: number; after: number; delta: number };
  viability: { before: string; after: string };
  /** Rows summed in one run only (insufficient data in the other, or a changed flag). */
  onlyBefore: string[]; onlyAfter: string[];
  sameSettings: boolean;
}
export function compare(before: BenchDoc, after: BenchDoc): Comparison {
  const B = new Map(before.rows.map(r => [r.id, r])), rows: Comparison['rows'] = [], onlyBefore: string[] = [], onlyAfter: string[] = [];
  const head = (role: 'fitted' | 'held-out', b: number, a: number) => {
    let common = 0, n = 0;
    for (const r of after.rows) { const p = B.get(r.id); if (r.role === role && counted(r) && counted(p)) { common += r.distance! - p!.distance!; n++; } }
    return { before: b, after: a, raw: a - b, common, commonRows: n };
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
    o.push('| Number | Before | After | Change | Change on rows scored in both |', '| --- | --- | --- | --- | --- |');
    o.push(`| Fitted distance | ${f(c.fitted.before)} | ${f(c.fitted.after)} | ${signed(c.fitted.raw)} | ${signed(c.fitted.common)} (${c.fitted.commonRows} rows) |`);
    o.push(`| Held-out distance | ${f(c.heldOut.before)} | ${f(c.heldOut.after)} | ${signed(c.heldOut.raw)} | ${signed(c.heldOut.common)} (${c.heldOut.commonRows} rows) |`);
    o.push(`| Prescription count | ${c.prescriptionCount.before} | ${c.prescriptionCount.after} | ${signed(c.prescriptionCount.delta, 0)} | |`);
    o.push(`| Viability | ${c.viability.before} | ${c.viability.after} | | |`, '');
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
  console.log(`3. prescription count       ${doc.headline.prescriptionCount}   (${doc.prescriptions.registryActive} registry entries in use + ${doc.prescriptions.literals} literals${doc.prescriptions.inactive.length ? `; not in use: ${doc.prescriptions.inactive.join(', ')}` : ''})`);
  console.log(`   viability                ${doc.headline.viability}${v ? `   births ${v.verdict.births}, deaths ${v.verdict.deaths}, ratio ${f(v.verdict.ratio, 2)}, starvation deaths ${v.verdict.starvationDeaths}${v.verdict.fewEvents ? '; too few births and deaths to compare them' : ''}${v.verdict.reasons.length ? `; ${v.verdict.reasons.join('; ')}` : ''}` : ''}`);
  if (v) for (const s of v.perSeed) console.log(`     seed ${pad(String(s.seed), 4)} living ${s.livingStart} → ${s.livingEnd}, births ${s.births}, deaths ${s.deaths}, ratio ${f(s.ratio, 2)}, starvation ${s.starvationDeaths}, adult hunger ${f(s.medianAdultHunger, 2)}, lactating ${f(s.medianLactatingHunger, 2)}`);
  if (doc.config.days < YEAR_DAYS) console.log(`   note: ${doc.config.days}-day window; rows that need a year are insufficient and left out of both sums (counts above).`);
  console.log('\nFurthest from their bands:');
  for (const r of furthest(doc.rows)) console.log(`  ${pad(r.id, 10)} ${pad(r.role, 9)} ${pad(f(r.distance), 8)} ${r.metric} (band ${r.band}; value ${r.partDistances ? Object.entries(r.parts).filter(([k]) => k in r.partDistances!).map(([k, x]) => `${k} ${f(x, 2)}`).join(', ') : f(r.pooled, 2)})`);
  if (cmp) {
    console.log(`\nBefore → after${cmp.sameSettings ? '' : '   (the runs differ in length or seeds: not like for like)'}`);
    console.log(`  fitted distance     ${f(cmp.fitted.before)} → ${f(cmp.fitted.after)}   ${signed(cmp.fitted.raw)}   (on ${cmp.fitted.commonRows} rows scored in both: ${signed(cmp.fitted.common)})`);
    console.log(`  held-out distance   ${f(cmp.heldOut.before)} → ${f(cmp.heldOut.after)}   ${signed(cmp.heldOut.raw)}   (on ${cmp.heldOut.commonRows} rows scored in both: ${signed(cmp.heldOut.common)})`);
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

  const mode = has('full') ? 'full' : has('confirm') ? 'confirm' : 'quick';
  const days = +flag('days', String(MODES[mode].days)), burnInDays = +flag('burn-in', String(MODES[mode].burnInDays));
  const seeds = flag('seeds', MODES[mode].seeds.join(',')).split(',').map(Number), workers = Math.max(1, +flag('workers', '2'));
  const label = days === MODES[mode].days && burnInDays === MODES[mode].burnInDays && seeds.join() === MODES[mode].seeds.join() ? mode : 'custom';
  if (days + burnInDays > MAX_TOTAL_DAYS && !has('allow-long')) { console.error(`e-bench: ${burnInDays} + ${days} days is longer than ${MAX_TOTAL_DAYS} days in all (user limit, 1 October 2026). Use --quick or --confirm; --allow-long lifts the limit once it is withdrawn.`); process.exit(2); }
  const paramsText = flag('params', '{}'), params = JSON.parse(paramsText) as Overrides;
  if (seeds.some(s => !Number.isInteger(s))) { console.error('--seeds must be integers'); process.exit(2); }
  const out = resolve(flag('out', `artifacts/validation/e/${label}`)), cardFile = `${out}.scorecard.json`;
  mkdirSync(dirname(out), { recursive: true });
  const same = (m: { days: number; burnInDays: number; seeds: number[]; params: Overrides }) => m.days === days && m.burnInDays === burnInDays && JSON.stringify(m.seeds) === JSON.stringify(seeds) && JSON.stringify(m.params ?? {}) === JSON.stringify(params);
  const t0 = performance.now();

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e); process.exit(1); });
