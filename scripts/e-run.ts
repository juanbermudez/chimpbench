// Long runs of Track E arms (IMPLEMENTATION_PLAN.md "Run-length ladder": up to 730 days; docs/staging/track-e-handoff.md
// §8: one background job may run at most 2 hours and a session may end while a run is going). An arm is split into
// jobs, one per seed (or per pass, or per checkpointed segment of a seed), each well under the 2-hour limit. A run
// registry (<out>/run.json) records the commit, the parameters, the command, the seeds, the horizon, every job's command,
// status and outputs; done markers (<out>/done/<job>.json) confirm finished jobs. A new session reads the registry and
// resumes exactly where the run stopped, without redoing a finished job. The runner refuses a dirty checkout (and any
// checkout whose HEAD is not the registry's commit), checks free disk space before every job (never below 5 GB),
// gzips finished per-seed outputs once the merged result no longer needs them, and never asks a tool for per-tick traces.
//
//   pnpm exec tsx scripts/e-run.ts plan --label S39-m6 --m6 --params-file p.json [--seeds 48,7,21,5,11] [--days N --burn-in N]
//        [--out artifacts/validation/e/runs/<label>] [--compare ref.json] [--energy] [--rhythm] [--job-max-min 100]
//        [--path auto|single|fallback] [--from <out of a shorter single-pass run>/run.json]
//   pnpm exec tsx scripts/e-run.ts run <out>/run.json [--budget-min 110] [--parallel auto|N] [--retry-failed] [--attached]
//   pnpm exec tsx scripts/e-run.ts status <out>/run.json
//   pnpm exec tsx scripts/e-run.ts merge <out>/run.json                 (run merges by itself when every job is done)
//   pnpm exec tsx scripts/e-run.ts diff <a.json> <b.json>               (two e-bench results or scorecards, ignoring dates, timing, workers)
//
// Launch `run` with run_in_background (timeout 7200000): it starts a job only if the job's estimate fits in what is left
// of --budget-min (default 110 min, under the 2-hour limit), so it stops cleanly; launch it again (this or a new
// session) to continue. A job's estimate is its seed-days × the slowest rate (s per seed-day) seen so far for its kind
// (priors below), so jobs are split before they could reach --job-max-min. --parallel auto runs two jobs while the
// 1-minute load is below 8 and one above (each job is one simulation thread). Jobs run in their own session and
// survive the runner (a background limit or a session end that kills the runner leaves them running); each writes its
// exit code to <out>/run/<job>.exit, and the next `run` adopts a live job or reads that file. A job killed with the
// runner (--attached, or a machine restart) is queued again. A job that exits non-zero is marked failed (its log is
// kept); `run --retry-failed` re-queues it.
//
// Two paths, chosen at plan time (--path auto: single when scripts/e-bench.ts exports RUN_CONTRACT):
//  single-pass  (the contract agreed with eB-bench, 5 October 2026): one job per seed,
//               `e-bench --<mode> --seeds <s> --part --workers 1 --params … --out <out>/parts/<label>.s<s>` writes
//               <prefix>.part.json.gz last (exit 0 iff written); a seed too long for one job runs as segments
//               (`--until-day D` writes <prefix>.ckpt-d<D>.v8.gz and its sidecar <prefix>.ckpt-d<D>.json last;
//               `--resume <ckpt>` continues); `e-bench --merge p1,p2,… --out <out>/<label>` merges in seed order into
//               exactly what a multi-seed run writes (bench, scorecard, energy and rhythm readouts).
//  fallback     (the tools as they are): per seed `e-bench --seeds <s>` (scorecard then the viability replay; as two
//               passes, --no-viability then --reuse, when one job would be too long); --energy: energy-diagnose over
//               all seeds in one job (per seed, unmerged, when too long); --rhythm: rhythm-metrics per seed (≤ 90 days,
//               the tool's limit). The merge (here) rebuilds the multi-seed scorecard from the per-seed scorecards
//               exactly as scripts/field-metrics.ts pools seeds (values in seed order; patrol accuracies from their
//               per-seed records; encounter accuracies from their integer counts), then e-bench's assemble/compare.
//
// Registry (run.json, version 1): {tool, version, label, created, updated, root, commit, branch, path, mode, horizon:
// {burnInDays, days, totalDays}, seeds, params, compare, readouts: {energy, rhythm}, limits: {jobMaxMin, minFreeGB},
// rates (s per seed-day by job kind, the slowest seen), command (the plan's command line), jobs: [{id, kind, seed,
// after, argv, stdout, outputs, seedDays, estimateMin, status (pending | running | done | failed), attempts, pid,
// started, finished, wallS, exit, log, note}], result, events}. Paths are relative to <out>; argv runs in `root`.
// Development seeds only: the reserved and retired seeds of AGENTS.md are refused.
import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, openSync, closeSync, readFileSync, readSync, renameSync, statSync, statfsSync, unlinkSync, writeFileSync, writeSync, readdirSync } from 'node:fs';
import { loadavg, hostname } from 'node:os';
import { dirname, relative, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createGzip, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { EncounterAccuracy } from '../src/field/run';
import { S18 } from '../src/field/section18';
import { mean } from '../src/field/stats';
import { applyInstrumentBar, publicRow, scoreTargets, summarize, type TargetFile } from '../src/field/targets';
import type { SeedValue } from '../src/field/metrics';
import type { Overrides } from '../src/sim/params';
import * as EB from './e-bench';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TSX = resolve(ROOT, 'node_modules/.bin/tsx');

// ---------------------------------------------------------------------------------------------------------------------
// Registry types
// ---------------------------------------------------------------------------------------------------------------------

export type JobKind = 'seed' | 'seg' | 'bench' | 'card' | 'viab' | 'energy' | 'rhythm' | 'merge';
export type JobStatus = 'pending' | 'running' | 'done' | 'failed';
export interface Job {
  id: string; kind: JobKind; seed: number | null;
  /** Jobs that must be done first. */ after: string[];
  /** Command run in `root` with tsx (empty for the fallback merge, which runs in the runner). */ argv: string[];
  /** File (relative to <out>) that receives the job's stdout (energy-diagnose's printed report), or null. */ stdout: string | null;
  /** Files (relative to <out>) that must exist after the job (a gzipped copy counts). */ outputs: string[];
  seedDays: number; estimateMin: number;
  status: JobStatus; attempts: number; pid: number | null; started: string | null; finished: string | null; wallS: number | null; exit: number | null;
  log: string; note: string;
}
export interface Registry {
  tool: 'e-run'; version: 1; label: string; created: string; updated: string;
  root: string; commit: string; branch: string; path: 'single-pass' | 'fallback';
  mode: string; horizon: { burnInDays: number; days: number; totalDays: number };
  seeds: number[]; params: Overrides; compare: string | null;
  readouts: { energy: boolean; rhythm: boolean };
  limits: { jobMaxMin: number; minFreeGB: number };
  rates: Record<string, number>; command: string;
  jobs: Job[]; result: Record<string, string> | null;
  events: { t: string; msg: string }[];
}

/**
 * Seconds per seed-day by job kind before any job of the kind has run (the slowest seen replaces them): S39 runs about
 * 1.2–1.6 s per eco-day per seed at load 5–11 on an M3 Pro (5 October 2026), the observer adds ~15%, the viability
 * replay is a second simulation, energy-diagnose ~1.2 s and rhythm-metrics ~0.8 s per seed-day. Priors err high.
 */
export const RATE_PRIORS: Record<JobKind, number> = { seed: 2.5, seg: 2.5, bench: 3.2, card: 1.8, viab: 1.6, energy: 1.6, rhythm: 1.2, merge: 0 };
/** One background job may run 2 hours; a job is planned to need at most this many minutes (estimate × 1.3 headroom below). */
export const JOB_MAX_MIN = 100;
export const MIN_FREE_GB = 5;
/** Bytes a job writes per seed-day before any job of the kind has run (rhythm records are the largest: ~25 kB per seed-day). */
export const BYTES_PER_SEED_DAY = 200_000;
const HEADROOM = 1.3;

/** The reserved and retired seeds of AGENTS.md (proof, calibration and re-test pools): never run for development. */
export const RESERVED_SEEDS: ReadonlySet<number> = new Set([
  ...[1111, 1212, 1313, 1414, 1515], ...Array.from({ length: 10 }, (_, i) => 1717 + 101 * i), // C8 proof
  707, 808, 909, 1013, 1014, // patrol re-tests
  5303, 5404, 5505, 5606, 5707, // C9 proof
  ...Array.from({ length: 20 }, (_, i) => 7004 + i), // C11 pool C
  ...Array.from({ length: 5 }, (_, i) => 8101 + 101 * i), ...Array.from({ length: 5 }, (_, i) => 8606 + 101 * i), ...Array.from({ length: 5 }, (_, i) => 9202 + 101 * i), // C11 V1–V3
  606, 1010, 1616, 5101, 5202, 7001, 7002, 7003, 9101, // retired
]);

// ---------------------------------------------------------------------------------------------------------------------
// Planning (pure)
// ---------------------------------------------------------------------------------------------------------------------

export const estimateMin = (kind: JobKind, seedDays: number, rates: Record<string, number>) => seedDays * (rates[kind] ?? RATE_PRIORS[kind]) / 60 * HEADROOM;

/** Absolute days (burn-in included) at which a seed of `totalDays` stops for a checkpoint so each segment's estimate stays within `maxMin`. */
export function segmentDays(totalDays: number, sPerDay: number, maxMin: number): number[] {
  const per = Math.max(1, Math.floor(maxMin * 60 / HEADROOM / sPerDay));
  const k = Math.ceil(totalDays / per);
  if (k <= 1) return [];
  const step = Math.ceil(totalDays / k), out: number[] = [];
  for (let d = step; d < totalDays; d += step) out.push(d);
  return out;
}

export interface PlanOpts {
  label: string; out: string; root: string; modeFlag: string; mode: string; days: number; burnInDays: number; seeds: number[]; params: Overrides;
  path: 'single-pass' | 'fallback'; energy: boolean; rhythm: boolean; compare: string | null; jobMaxMin: number; rates: Record<string, number>;
  /** Single-pass: end checkpoints of a shorter run of the same arm, by seed (absolute paths), to resume from. */
  from?: Record<number, { ckpt: string; day: number }>;
}

const job = (p: Partial<Job> & Pick<Job, 'id' | 'kind' | 'argv' | 'outputs' | 'seedDays'>, rates: Record<string, number>): Job => ({
  seed: null, after: [], stdout: null, status: 'pending', attempts: 0, pid: null, started: null, finished: null, wallS: null, exit: null, log: `logs/${p.id}.log`, note: '',
  estimateMin: Math.round(estimateMin(p.kind, p.seedDays, rates) * 10) / 10, ...p,
});

/** The job graph of an arm. Paths in argv are absolute (`opts.out` resolved); outputs are relative to `opts.out`. */
export function planJobs(o: PlanOpts): Job[] {
  const jobs: Job[] = [], total = o.burnInDays + o.days, pj = JSON.stringify(o.params), abs = (rel: string) => resolve(o.out, rel);
  const horizon = (custom: boolean) => custom ? ['--days', String(o.days), '--burn-in', String(o.burnInDays)] : [];
  const modeDays = EB.MODES[o.mode as keyof typeof EB.MODES];
  const custom = !modeDays || modeDays.days !== o.days || modeDays.burnInDays !== o.burnInDays;
  const modeArgs = [`--${o.modeFlag}`, ...horizon(custom)];
  const prefix = (seed: number) => `parts/${o.label}.s${seed}`;
  const seedJobs: string[] = [];
  if (o.path === 'single-pass') {
    for (const seed of o.seeds) {
      const base = ['scripts/e-bench.ts', ...modeArgs, '--seeds', String(seed), '--part', '--workers', '1', '--params', pj, '--out', abs(prefix(seed))];
      const from = o.from?.[seed];
      const start = from ? from.day : 0, left = total - start;
      const stops = segmentDays(left, o.rates.seed ?? RATE_PRIORS.seed, o.jobMaxMin).map(d => d + start);
      let prev: string | null = from ? from.ckpt : null, prevDay = start;
      for (const d of stops) {
        const id = `s${seed}-d${d}`;
        jobs.push(job({ id, kind: 'seg', seed, after: jobs.length && jobs[jobs.length - 1].seed === seed ? [jobs[jobs.length - 1].id] : [],
          argv: [...base, '--until-day', String(d), ...(prev ? ['--resume', prev] : [])], outputs: [`${prefix(seed)}.ckpt-d${d}.json`, `${prefix(seed)}.ckpt-d${d}.v8.gz`], seedDays: d - prevDay }, o.rates));
        prev = abs(`${prefix(seed)}.ckpt-d${d}.v8.gz`); prevDay = d;
      }
      const id = `s${seed}`;
      jobs.push(job({ id, kind: 'seed', seed, after: stops.length ? [`s${seed}-d${stops[stops.length - 1]}`] : [],
        argv: [...base, ...(prev ? ['--resume', prev] : [])], outputs: [`${prefix(seed)}.part.json.gz`], seedDays: total - prevDay }, o.rates));
      seedJobs.push(id);
    }
    jobs.push(job({ id: 'merge', kind: 'merge', after: seedJobs, seedDays: 0,
      argv: ['scripts/e-bench.ts', '--merge', o.seeds.map(s => abs(`${prefix(s)}.part.json.gz`)).join(','), '--out', abs(o.label), ...(o.compare ? ['--compare', o.compare] : [])],
      outputs: [`${o.label}.json`, `${o.label}.md`, `${o.label}.scorecard.json`, `${o.label}-energy.json`, `${o.label}-rhythm.json`] }, o.rates));
    return jobs;
  }
  // fallback: the tools as they are
  for (const seed of o.seeds) {
    const base = ['scripts/e-bench.ts', ...modeArgs, '--seeds', String(seed), '--workers', '1', '--params', pj, '--out', abs(prefix(seed))];
    const outs = [`${prefix(seed)}.json`, `${prefix(seed)}.scorecard.json`];
    if (estimateMin('bench', total, o.rates) <= o.jobMaxMin) {
      jobs.push(job({ id: `s${seed}`, kind: 'bench', seed, argv: base, outputs: outs, seedDays: total }, o.rates));
    } else {
      jobs.push(job({ id: `s${seed}-card`, kind: 'card', seed, argv: [...base, '--no-viability'], outputs: outs, seedDays: total }, o.rates));
      jobs.push(job({ id: `s${seed}-viab`, kind: 'viab', seed, after: [`s${seed}-card`], argv: [...base, '--reuse'], outputs: outs, seedDays: total }, o.rates));
    }
    if (o.rhythm && total <= 90) {
      jobs.push(job({ id: `s${seed}-rhythm`, kind: 'rhythm', seed, seedDays: total, outputs: [`${prefix(seed)}-rhythm.json`],
        argv: ['scripts/rhythm-metrics.ts', '--seeds', String(seed), '--burn-in', String(o.burnInDays), '--days', String(o.days), '--workers', '1', '--params', pj, '--json', abs(`${prefix(seed)}-rhythm.json`), '--md', abs(`${prefix(seed)}-rhythm.md`)] }, o.rates));
    }
  }
  if (o.energy) {
    const eArgs = (seeds: number[], json: string) => ['scripts/energy-diagnose.ts', '--seeds', seeds.join(','), '--burn-in', String(o.burnInDays), '--days', String(o.days), '--params', pj, '--json', abs(json)];
    if (estimateMin('energy', total * o.seeds.length, o.rates) <= o.jobMaxMin) jobs.push(job({ id: 'energy', kind: 'energy', argv: eArgs(o.seeds, `${o.label}-energy.json`), stdout: `${o.label}-energy.log`, outputs: [`${o.label}-energy.json`, `${o.label}-energy.log`], seedDays: total * o.seeds.length }, o.rates));
    else for (const seed of o.seeds) jobs.push(job({ id: `s${seed}-energy`, kind: 'energy', seed, argv: eArgs([seed], `${prefix(seed)}-energy.json`), stdout: `${prefix(seed)}-energy.log`, outputs: [`${prefix(seed)}-energy.json`, `${prefix(seed)}-energy.log`], seedDays: total, note: 'energy per seed, not merged (one job for all seeds would pass the job limit)' }, o.rates));
  }
  // the merge waits for every job: it gzips parts/ when it is done, so nothing may still be writing there
  jobs.push(job({ id: 'merge', kind: 'merge', after: jobs.map(j => j.id), seedDays: 0, argv: [], outputs: [`${o.label}.json`, `${o.label}.md`, `${o.label}.scorecard.json`, ...(o.rhythm && total <= 90 ? [`${o.label}-rhythm5.json`] : [])] }, o.rates));
  return jobs;
}

/** Jobs that may start now: pending, every dependency done, in plan order. */
export function runnable(jobs: Job[]): Job[] {
  const done = new Set(jobs.filter(j => j.status === 'done').map(j => j.id));
  return jobs.filter(j => j.status === 'pending' && j.after.every(a => done.has(a)));
}

// ---------------------------------------------------------------------------------------------------------------------
// Fallback merge (pure): per-seed field scorecards → the multi-seed scorecard scripts/field-metrics.ts writes
// ---------------------------------------------------------------------------------------------------------------------

type PA = { precision: number | null; recall: number | null; truthEpisodes: number; classified: number };
type Card = { manifest: Record<string, unknown> & { profile: string; days: number; burnInDays: number; seeds: number[]; params: Overrides; protocolHash?: string; hashes: Record<string, string> };
  summary: unknown; rows: unknown[]; s18: { key: string; label: string; field: string; protocol: string; truthProtocol: string; unit: string; observed: (number | null)[]; truth: (number | null)[]; observedMean: number | null; truthMean: number | null }[];
  life: unknown[]; accuracy: { activityMaxAbsDiff: number[]; activity: unknown[]; patrol: { perSeed: (PA | null)[] } & Record<string, unknown>; patrolMales: { perSeed: (PA | null)[] } & Record<string, unknown>;
    encounter: Record<string, number | null>; encounterParty?: Record<string, number | null>; hunt: { detected: number; truth: number } };
  timing: { poolMs: number; jobWallMs: number[]; simMs: number[]; observerMs: number[]; experimentMs: number[]; observerShare: number[] }; counts: Record<string, number>[]; values: Record<string, SeedValue[]> };

const num = (v: number | null | undefined) => v === null || v === undefined ? NaN : v;
/**
 * A seed's raw encounter accuracy from its single-seed scorecard. field-metrics pools seeds (encPool) as Σ(ratio × count)
 * ÷ Σcount, and stores the pool even for one seed, so each ratio there is (k ÷ n) × n ÷ n. The classifier's ratios are
 * integer counts over integer counts (src/field/run.ts encounterAccuracy), so k is recovered exactly by rounding and the
 * raw ratio recomputed by the same division.
 */
export function rawEncounter(e: Record<string, number | null> | undefined): EncounterAccuracy | undefined {
  if (!e) return undefined;
  const n = num(e.observableTruth), m = num(e.followedTruth), c = num(e.classified), t = num(e.truthEpisodes);
  const back = (ratio: number | null | undefined, count: number) => count > 0 && Number.isFinite(num(ratio)) ? Math.round(num(ratio) * count) / count : NaN;
  return { recall: back(e.recall, n), recallAll: back(e.recallAll, m), precision: back(e.precision, c), followedTruth: m, observableTruth: n, classified: c, truthEpisodes: t };
}
/** field-metrics' encPool, verbatim in its arithmetic. */
function encPool(list: (EncounterAccuracy | undefined)[]) {
  const a = list.reduce((a, e) => { if (!e) return a; const obsN = e.observableTruth ?? e.followedTruth; a.found += Number.isFinite(e.recall) ? e.recall * obsN : 0; a.obs += obsN;
    a.foundAll += Number.isFinite(e.recallAll ?? e.recall) ? (e.recallAll ?? e.recall) * e.followedTruth : 0; a.followed += e.followedTruth; a.real += Number.isFinite(e.precision) ? e.precision * e.classified : 0; a.classified += e.classified; a.truth += e.truthEpisodes; a.any = true; return a; },
    { found: 0, obs: 0, foundAll: 0, followed: 0, real: 0, classified: 0, truth: 0, any: false });
  return a.any ? { recall: a.obs ? a.found / a.obs : NaN, recallAll: a.followed ? a.foundAll / a.followed : NaN, precision: a.classified ? a.real / a.classified : NaN, detection: a.truth ? a.classified / a.truth : NaN,
    observableTruth: a.obs, followedTruth: a.followed, classified: a.classified, truthEpisodes: a.truth } : undefined;
}
/** field-metrics' pool of patrol classifier records, verbatim in its arithmetic (null ratios are JSON's NaN). */
function paPool(list: (PA | null | undefined)[]) {
  const a = list.reduce((a, p) => { if (!p) return a; a.correct += Number.isFinite(num(p.precision)) ? num(p.precision) * p.classified : 0; a.classified += p.classified; a.found += Number.isFinite(num(p.recall)) ? num(p.recall) * p.truthEpisodes : 0; a.episodes += p.truthEpisodes; return a; }, { correct: 0, classified: 0, found: 0, episodes: 0 });
  return { ...a, precision: a.classified ? a.correct / a.classified : NaN, recall: a.episodes ? a.found / a.episodes : NaN };
}

/** The multi-seed scorecard from single-seed scorecards in seed order (scripts/field-metrics.ts main, same order of keys). */
export function mergeScorecards(cards: Card[], targets: TargetFile, date = new Date().toISOString()): Card {
  const first = cards[0], same = (k: string) => cards.every(c => JSON.stringify(c.manifest[k]) === JSON.stringify(first.manifest[k]));
  for (const k of ['profile', 'params', 'burnInDays', 'days', 'experimentsEveryDays', 'truth', 'observer', 'protocolHash', 'phenology']) if (!same(k)) throw new Error(`per-seed scorecards differ in manifest.${k}`);
  if (cards.some(c => c.manifest.seeds.length !== 1)) throw new Error('every per-seed scorecard must hold one seed');
  const seeds = cards.map(c => c.manifest.seeds[0]);
  if (new Set(seeds).size !== seeds.length) throw new Error(`duplicate seeds ${seeds.join(', ')}`);
  const values: Record<string, SeedValue[]> = {};
  for (const c of cards) for (const [id, v] of Object.entries(c.values)) (values[id] ??= []).push(v[0]);
  const rows = scoreTargets(targets, values, first.manifest.profile);
  const s18 = S18.map(s => {
    const at = (c: Card) => c.s18.find(x => x.key === s.key);
    const obs = cards.map(c => at(c)?.observed[0] ?? null), tru = cards.map(c => at(c)?.truth[0] ?? null);
    const ok = (a: (number | null)[]) => a.filter((x): x is number => x !== null);
    return { key: s.key, label: s.label, field: s.field, protocol: s.protocol, truthProtocol: s.truthProtocol, unit: at(first)?.unit ?? '',
      observed: obs, truth: tru, observedMean: ok(obs).length ? mean(ok(obs)) : null, truthMean: ok(tru).length ? mean(ok(tru)) : null };
  });
  const act = cards.flatMap(c => c.accuracy.activityMaxAbsDiff);
  const patRaw = cards.map(c => c.accuracy.patrol.perSeed[0]), patMRaw = cards.map(c => c.accuracy.patrolMales.perSeed[0] ?? null);
  const pat = paPool(patRaw), patM = paPool(patMRaw.map(p => p ?? undefined));
  const encounter = encPool(cards.map(c => rawEncounter(c.accuracy.encounter))) ?? { recall: NaN, recallAll: NaN, precision: NaN, detection: NaN, observableTruth: 0, followedTruth: 0, classified: 0, truthEpisodes: 0 };
  const encounterParty = encPool(cards.map(c => rawEncounter(c.accuracy.encounterParty)));
  applyInstrumentBar(rows, { focal: pat, males: patM }, { focal: encounter.observableTruth ? encounter : undefined, party: encounterParty });
  const summary = summarize(rows);
  const hun = cards.reduce((a, c) => { const h = c.accuracy.hunt; if (h) { a.detected += h.detected; a.truth += h.truth; } return a; }, { detected: 0, truth: 0 });
  const hunt = { detection: hun.truth ? hun.detected / hun.truth : NaN, detected: hun.detected, truth: hun.truth };
  const manifest = { ...first.manifest, date, seeds, workers: 1, hashes: Object.fromEntries(cards.map(c => [c.manifest.seeds[0], c.manifest.hashes[c.manifest.seeds[0]]])) };
  const cat = <K extends keyof Card['timing']>(k: K) => cards.flatMap(c => c.timing[k] as number[]);
  const timing = { poolMs: cards.reduce((a, c) => a + c.timing.poolMs, 0), soloMs: null, ratio: null, jobWallMs: cat('jobWallMs'), simMs: cat('simMs'), observerMs: cat('observerMs'), experimentMs: cat('experimentMs'), observerShare: cat('observerShare') };
  const accuracy = { activityMaxAbsDiff: act, activity: cards.flatMap(c => c.accuracy.activity), patrol: { precision: pat.precision, recall: pat.recall, classified: pat.classified, truthEpisodes: pat.episodes, perSeed: patRaw },
    patrolMales: { precision: patM.precision, recall: patM.recall, classified: patM.classified, truthEpisodes: patM.episodes, perSeed: patMRaw }, encounter, encounterParty, hunt };
  // JSON round trip: NaN becomes null exactly as when field-metrics writes its file
  return JSON.parse(JSON.stringify({ manifest, summary, rows: rows.map(publicRow), s18, life: first.life, accuracy, timing, counts: cards.flatMap(c => c.counts), values })) as Card;
}

/**
 * Differences between two JSON documents, as paths, ignoring keys that hold dates, timings, worker counts, labels and
 * file paths (`ignore`, matched against the last path segment or the full path).
 */
export function diffJson(a: unknown, b: unknown, ignore: ReadonlySet<string>, path = '', out: string[] = [], max = 50): string[] {
  if (out.length >= max) return out;
  const last = path.split('.').pop() ?? '';
  if (ignore.has(last) || ignore.has(path)) return out;
  if (a === b || (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b))) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) { out.push(`${path || '(root)'}: ${JSON.stringify(a)?.slice(0, 80)} ≠ ${JSON.stringify(b)?.slice(0, 80)}`); return out; }
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (!Array.isArray(a) && ka.join() !== kb.join()) {
    const only = [...ka.filter(k => !kb.includes(k) && !ignore.has(k)).map(k => `-${k}`), ...kb.filter(k => !ka.includes(k) && !ignore.has(k)).map(k => `+${k}`)];
    if (only.length) out.push(`${path || '(root)'}: keys ${only.join(' ')}`);
  }
  for (const k of new Set([...ka, ...kb])) diffJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], ignore, path ? `${path}.${k}` : k, out, max);
  return out;
}
/** What differs between runs of the same arm without being a result: when, how long, on how many workers, under what label, where. */
export const VOLATILE = new Set(['date', 'timing', 'workers', 'availableParallelism', 'label', 'scorecard', 'with', 'wallMs']);

// ---------------------------------------------------------------------------------------------------------------------
// I/O helpers
// ---------------------------------------------------------------------------------------------------------------------

const now = () => new Date().toISOString();
function git(root: string, ...a: string[]): string { return execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
/** HEAD, branch and the porcelain status lines of the checkout (any line means dirty: tracked changes or untracked files). */
export function gitState(root: string): { commit: string; branch: string; dirty: string[] } {
  return { commit: git(root, 'rev-parse', 'HEAD'), branch: git(root, 'rev-parse', '--abbrev-ref', 'HEAD'), dirty: git(root, 'status', '--porcelain', '--untracked-files=normal').split('\n').filter(Boolean) };
}
/** Free bytes on the volume holding `path` (the nearest existing parent). */
export function freeBytes(path: string): number {
  let p = resolve(path);
  while (!existsSync(p)) p = dirname(p);
  const s = statfsSync(p);
  return Number(s.bavail) * Number(s.bsize);
}
/** The volumes to keep free: the run's own, and /System/Volumes/Data where it exists (the brief's disk). */
function minFree(out: string): { where: string; bytes: number } {
  const all = [out, ...(existsSync('/System/Volumes/Data') ? ['/System/Volumes/Data'] : [])].map(w => ({ where: w, bytes: freeBytes(w) }));
  return all.reduce((a, b) => (b.bytes < a.bytes ? b : a));
}
function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  renameSync(tmp, file);
}
export function readJsonMaybeGz<T>(file: string): T {
  if (existsSync(file)) return JSON.parse(file.endsWith('.gz') ? gunzipSync(readFileSync(file)).toString('utf8') : readFileSync(file, 'utf8')) as T;
  if (existsSync(`${file}.gz`)) return JSON.parse(gunzipSync(readFileSync(`${file}.gz`)).toString('utf8')) as T;
  throw new Error(`missing ${file}`);
}
/** The output exists (or its gzipped copy), is not empty, and a .gz is a gzip stream. */
export function outputOk(file: string): boolean {
  for (const f of [file, `${file}.gz`]) {
    if (!existsSync(f)) continue;
    const st = statSync(f);
    if (!st.isFile() || st.size === 0) return false;
    if (f.endsWith('.gz')) { const fd = openSync(f, 'r'), b = Buffer.alloc(2); try { readSync(fd, b, 0, 2, 0); } finally { closeSync(fd); } return b[0] === 0x1f && b[1] === 0x8b; }
    return true;
  }
  return false;
}
function sha256(file: string): string { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
/** Alive, and still the process we started (a recycled pid would run something else). */
export function alive(pid: number | null, marker: string): boolean {
  if (!pid) return false;
  try { process.kill(pid, 0); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EPERM') return false; }
  try { return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).includes(marker); } catch { return false; }
}
async function gzipFile(file: string): Promise<boolean> {
  if (!existsSync(file) || file.endsWith('.gz')) return false;
  const tmp = `${file}.gz.tmp`;
  await pipeline(createReadStream(file), createGzip({ level: 6 }), createWriteStream(tmp));
  renameSync(tmp, `${file}.gz`); unlinkSync(file);
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
// The registry on disk
// ---------------------------------------------------------------------------------------------------------------------

class Run {
  reg: Registry; readonly dir: string; readonly file: string;
  constructor(file: string) { this.file = resolve(file); this.dir = dirname(this.file); this.reg = JSON.parse(readFileSync(this.file, 'utf8')) as Registry; }
  path(rel: string) { return resolve(this.dir, rel); }
  save() { this.reg.updated = now(); writeJsonAtomic(this.file, this.reg); }
  event(msg: string) { this.reg.events.push({ t: now(), msg }); if (this.reg.events.length > 300) this.reg.events.splice(0, this.reg.events.length - 300); console.error(`e-run ${this.reg.label}: ${msg}`); }
  marker(j: Job) { return this.path(`done/${j.id}.json`); }
  exitFile(j: Job) { return this.path(`run/${j.id}.exit`); }
  /** Done = the marker exists and every output is still there (plain or gzipped). */
  verified(j: Job) { return existsSync(this.marker(j)) && j.outputs.every(o => outputOk(this.path(o))); }
}

/** Refuses a dirty checkout or one whose HEAD is not the registry's commit. Returns the reason, or null. */
export function checkoutRefusal(root: string, commit: string | null): string | null {
  const g = gitState(root);
  if (g.dirty.length) return `the checkout ${root} is dirty (${g.dirty.length} entries, e.g. ${g.dirty.slice(0, 3).join('; ')}): commit, or run from a frozen checkout (git worktree add --detach <dir> <commit>)`;
  if (commit && g.commit !== commit) return `the checkout ${root} is at ${g.commit.slice(0, 10)}, the run was planned at ${commit.slice(0, 10)}: run it from a checkout of that commit`;
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------------------------------------------------

type Args = { pos: string[]; flag: (k: string, d?: string) => string; has: (k: string) => boolean };
function parseArgs(argv: string[]): Args {
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && !BOOL.has(argv[i])) i++; } else pos.push(argv[i]); }
  return { pos, flag: (k, d = '') => { const i = argv.indexOf(`--${k}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; }, has: k => argv.includes(`--${k}`) };
}
const BOOL = new Set(['--quick', '--confirm', '--m6', '--m12', '--m24', '--full', '--energy', '--rhythm', '--retry-failed', '--attached']);

async function plan(a: Args): Promise<void> {
  const label = a.flag('label');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(label)) throw new Error('--label is required (letters, digits, . _ -)');
  const modeFlag = (['full', 'm24', 'm12', 'm6', 'confirm', 'quick'] as const).find(m => a.has(m)) ?? 'quick';
  const mode = EB.MODES[modeFlag];
  const days = +a.flag('days', String(mode.days)), burnInDays = +a.flag('burn-in', String(mode.burnInDays));
  const seeds = a.flag('seeds', mode.seeds.join(',')).split(',').map(Number);
  if (seeds.some(s => !Number.isInteger(s) || s < 0)) throw new Error('--seeds must be non-negative integers');
  const reserved = seeds.filter(s => RESERVED_SEEDS.has(s));
  if (reserved.length) throw new Error(`refused: ${reserved.join(', ')} ${reserved.length === 1 ? 'is a' : 'are'} reserved or retired seed${reserved.length === 1 ? '' : 's'} (AGENTS.md); development seeds only`);
  if (!(days > 0) || !(burnInDays >= 0) || days + burnInDays > EB.MAX_TOTAL_DAYS) throw new Error(`refused: ${burnInDays} + ${days} days (at most ${EB.MAX_TOTAL_DAYS} in all, burn-in included)`);
  const params = (a.has('params-file') ? JSON.parse(readFileSync(a.flag('params-file'), 'utf8')) : JSON.parse(a.flag('params', '{}'))) as Overrides;
  const contract = (EB as Record<string, unknown>).RUN_CONTRACT === 1;
  const want = a.flag('path', 'auto');
  if (want === 'single' && !contract) throw new Error('--path single: scripts/e-bench.ts does not export RUN_CONTRACT (the single-pass contract) in this checkout');
  const path: Registry['path'] = want === 'fallback' || (want === 'auto' && !contract) ? 'fallback' : 'single-pass';
  const out = resolve(ROOT, a.flag('out', `artifacts/validation/e/runs/${label}`));
  if (existsSync(resolve(out, 'run.json'))) throw new Error(`${resolve(out, 'run.json')} exists: resume it with \`run\`, or choose another --out`);
  const refusal = checkoutRefusal(ROOT, null);
  if (refusal) throw new Error(`refused: ${refusal}`);
  const g = gitState(ROOT);
  const jobMaxMin = +a.flag('job-max-min', String(JOB_MAX_MIN));
  // single-pass ladder: a shorter run of the same arm whose seeds ended with a checkpoint
  let from: PlanOpts['from'];
  if (a.has('from')) {
    if (path !== 'single-pass') throw new Error('--from needs the single-pass path (checkpoints)');
    const prev = new Run(a.flag('from'));
    if (JSON.stringify(prev.reg.params) !== JSON.stringify(params) || prev.reg.horizon.burnInDays !== burnInDays) throw new Error('--from: the earlier run has other parameters or another burn-in');
    from = {};
    const d = prev.reg.horizon.totalDays;
    for (const s of seeds) { const side = prev.path(`parts/${prev.reg.label}.s${s}.ckpt-d${d}.json`), ck = prev.path(`parts/${prev.reg.label}.s${s}.ckpt-d${d}.v8.gz`); if (existsSync(side) && existsSync(ck)) from[s] = { ckpt: ck, day: d }; }
  }
  const compare = a.has('compare') ? resolve(a.flag('compare')) : null;
  const opts: PlanOpts = { label, out, root: ROOT, modeFlag, mode: modeFlag, days, burnInDays, seeds, params, path, energy: a.has('energy'), rhythm: a.has('rhythm'), compare, jobMaxMin, rates: {}, from };
  const jobs = planJobs(opts);
  for (const j of jobs) if (j.estimateMin > jobMaxMin) throw new Error(`job ${j.id} is estimated at ${j.estimateMin} min, over the job limit of ${jobMaxMin} min, and cannot be split on the ${path} path`);
  for (const j of jobs) if (j.argv.some(x => /trace/i.test(x) && x.startsWith('--'))) throw new Error(`job ${j.id} asks for a trace: per-tick traces are never written`);
  for (const d of ['parts', 'done', 'logs', 'run']) mkdirSync(resolve(out, d), { recursive: true });
  writeFileSync(resolve(out, 'params.json'), JSON.stringify(params) + '\n');
  const reg: Registry = { tool: 'e-run', version: 1, label, created: now(), updated: now(), root: ROOT, commit: g.commit, branch: g.branch, path,
    mode: modeFlag, horizon: { burnInDays, days, totalDays: burnInDays + days }, seeds, params, compare, readouts: { energy: path === 'single-pass' || a.has('energy'), rhythm: path === 'single-pass' || (a.has('rhythm') && burnInDays + days <= 90) },
    limits: { jobMaxMin, minFreeGB: MIN_FREE_GB }, rates: {}, command: `pnpm exec tsx scripts/e-run.ts ${process.argv.slice(2).map(x => (/[\s'"{}]/.test(x) ? `'${x}'` : x)).join(' ')}`,
    jobs, result: null, events: [{ t: now(), msg: `planned ${jobs.length} jobs (${path}) at ${g.commit.slice(0, 10)}${a.has('rhythm') && burnInDays + days > 90 ? '; rhythm-metrics skipped (its limit is 90 days)' : ''}` }] };
  writeJsonAtomic(resolve(out, 'run.json'), reg);
  console.log(`planned ${resolve(out, 'run.json')}: ${jobs.length} jobs on the ${path} path, ${seeds.length} seeds × ${burnInDays + days} days`);
  for (const j of jobs) console.log(`  ${j.id.padEnd(16)} ${j.kind.padEnd(7)} ~${j.estimateMin} min${j.after.length ? `  after ${j.after.join(', ')}` : ''}${j.note ? `  (${j.note})` : ''}`);
  console.log(`next: pnpm exec tsx scripts/e-run.ts run ${relative(ROOT, resolve(out, 'run.json'))}   (run_in_background; re-launch until done)`);
}

function status(file: string): void {
  const run = new Run(file), r = run.reg;
  const lock = run.path('run.lock'), held = existsSync(lock) ? JSON.parse(readFileSync(lock, 'utf8')) as { pid: number; host: string; started: string } : null;
  const active = held && held.host === hostname() && alive(held.pid, 'e-run');
  console.log(`${r.label}: ${r.path} path, ${r.seeds.length} seeds × ${r.horizon.totalDays} days (burn-in ${r.horizon.burnInDays}), commit ${r.commit.slice(0, 10)} (${r.branch}), planned ${r.created}`);
  console.log(`runner: ${active ? `active (pid ${held!.pid} since ${held!.started})` : held ? `stale lock (pid ${held.pid}, not running)` : 'none'}; free disk ${(minFree(run.dir).bytes / 1e9).toFixed(1)} GB`);
  for (const j of r.jobs) console.log(`  ${j.id.padEnd(16)} ${j.kind.padEnd(7)} ${j.status.padEnd(8)} ${j.wallS !== null ? `${(j.wallS / 60).toFixed(1)} min` : `~${j.estimateMin} min`}${j.attempts > 1 ? `  attempts ${j.attempts}` : ''}${j.note ? `  ${j.note}` : ''}`);
  const done = r.jobs.filter(j => j.status === 'done').length;
  console.log(r.result ? `result: ${Object.values(r.result).join(', ')}` : `${done}/${r.jobs.length} done; ${r.jobs.some(j => j.status === 'failed') ? 'failed jobs need a look (logs/), then `run --retry-failed`' : `continue: pnpm exec tsx scripts/e-run.ts run ${relative(process.cwd(), run.file)}`}`);
}

const SH = 'if [ -n "$E_RUN_OUT" ]; then "$@" > "$E_RUN_OUT" 2>> "$E_RUN_LOG"; else "$@" >> "$E_RUN_LOG" 2>&1; fi; echo $? > "$E_RUN_EXIT.tmp" && mv "$E_RUN_EXIT.tmp" "$E_RUN_EXIT"';

async function runCmd(file: string, a: Args): Promise<number> {
  const run = new Run(file), r = run.reg;
  const budgetMin = +a.flag('budget-min', '110'), par = a.flag('parallel', 'auto'), detach = !a.has('attached'), t0 = Date.now();
  if (r.root !== ROOT) throw new Error(`this registry runs in ${r.root}; launch e-run from there (this checkout is ${ROOT})`);
  // one runner per registry
  const lockFile = run.path('run.lock');
  const takeLock = () => { const fd = openSync(lockFile, 'wx'); writeSync(fd, JSON.stringify({ pid: process.pid, host: hostname(), started: now() })); closeSync(fd); };
  try { takeLock(); } catch {
    let held: { pid: number; host: string } = { pid: 0, host: '' };
    try { held = JSON.parse(readFileSync(lockFile, 'utf8')) as { pid: number; host: string }; } catch { /* half-written: stale */ }
    if (held.host === hostname() && alive(held.pid, 'e-run')) { console.error(`e-run: another runner (pid ${held.pid}) holds ${lockFile}`); return 3; }
    run.event(`stale lock of pid ${held.pid} removed`); unlinkSync(lockFile); takeLock();
  }
  const running = new Map<string, { pid: number }>();
  let stopping = false;
  const release = () => { try { const held = JSON.parse(readFileSync(lockFile, 'utf8')) as { pid: number }; if (held.pid === process.pid) unlinkSync(lockFile); } catch { /* gone */ } };
  const onSignal = (sig: NodeJS.Signals) => {
    if (stopping) return; stopping = true;
    for (const [id, { pid }] of running) {
      const j = r.jobs.find(x => x.id === id)!;
      if (!detach) { try { process.kill(-pid, 'SIGTERM'); } catch { /* gone */ } j.status = 'pending'; j.pid = null; j.note = `interrupted by ${sig}`; }
    }
    run.event(`runner stopped by ${sig}${detach ? ' (detached jobs keep running; the next run adopts them)' : ''}`); run.save(); release(); process.exit(130);
  };
  for (const s of ['SIGTERM', 'SIGINT', 'SIGHUP'] as const) process.on(s, onSignal);
  try {
    // reconcile what the registry says with what is on disk
    if (a.has('retry-failed')) for (const j of r.jobs) if (j.status === 'failed') { j.status = 'pending'; j.note = 'retried'; run.event(`${j.id} re-queued`); }
    for (const j of r.jobs) {
      if (j.status === 'done' && !run.verified(j)) { j.status = 'pending'; j.note = 'outputs missing: re-run'; run.event(`${j.id}: marker or outputs missing, queued again`); }
      if (j.status === 'running') {
        if (existsSync(run.exitFile(j))) finalize(run, j);
        else if (alive(j.pid, 'E_RUN')) { running.set(j.id, { pid: j.pid! }); run.event(`${j.id}: adopted live job (pid ${j.pid})`); }
        else { j.status = 'pending'; j.pid = null; j.note = 'interrupted (its process is gone)'; run.event(`${j.id}: interrupted, queued again`); }
      }
    }
    run.save();
    let blocked = '';
    for (;;) {
      // finished jobs
      for (const [id, { pid }] of [...running]) {
        const j = r.jobs.find(x => x.id === id)!;
        if (existsSync(run.exitFile(j))) {
          running.delete(id); finalize(run, j);
          if (j.kind === 'merge' && j.status === 'done') { r.result = Object.fromEntries(j.outputs.map(o => [o.slice(r.label.length).replace(/^[.-]/, '') || 'json', o])); await compressParts(run); }
          run.save();
        }
        else if (!alive(pid, 'E_RUN')) { running.delete(id); j.status = 'pending'; j.pid = null; j.note = 'interrupted (its process is gone)'; run.event(`${j.id}: process gone without an exit code, queued again`); run.save(); }
      }
      const ready = runnable(r.jobs);
      // the fallback merge runs here, in the runner
      const merge = ready.find(j => j.kind === 'merge' && j.argv.length === 0);
      if (merge && !running.size) {
        const refusal = checkoutRefusal(ROOT, r.commit);
        if (refusal) { blocked = refusal; break; }
        merge.status = 'running'; merge.started = now(); merge.attempts++; run.save();
        try { await fallbackMerge(run); merge.exit = 0; } catch (e) { merge.exit = 1; merge.note = String(e instanceof Error ? e.message : e).slice(0, 300); }
        merge.finished = now(); merge.wallS = Math.round((Date.parse(merge.finished) - Date.parse(merge.started)) / 1000);
        if (merge.exit === 0 && merge.outputs.every(o => outputOk(run.path(o)))) { done(run, merge); await compressParts(run); } else { merge.status = 'failed'; run.event(`merge failed: ${merge.note}`); }
        run.save(); continue;
      }
      const limit = par === 'auto' ? (loadavg()[0] < 8 ? 2 : 1) : Math.max(1, +par);
      blocked = '';
      for (const j of ready) {
        if (stopping || running.size >= limit || (j.kind === 'merge' && j.argv.length === 0)) break;
        const refusal = checkoutRefusal(ROOT, r.commit);
        if (refusal) { blocked = refusal; break; }
        const free = minFree(run.dir), need = MIN_FREE_GB * 1e9 + expectedBytes(r, j);
        if (free.bytes < need) { blocked = `disk: ${(free.bytes / 1e9).toFixed(1)} GB free on ${free.where}, ${(need / 1e9).toFixed(1)} GB needed (${MIN_FREE_GB} GB floor plus this job's outputs)`; break; }
        const leftMin = budgetMin - (Date.now() - t0) / 60000, est = Math.round(estimateMin(j.kind, j.seedDays, r.rates) * 10) / 10;
        if (est > leftMin) { blocked = `budget: ${j.id} needs ~${est} min, ${leftMin.toFixed(0)} min left of --budget-min ${budgetMin}`; break; }
        start(run, j, detach); if (j.status === 'running') running.set(j.id, { pid: j.pid! }); run.save();
      }
      if (!running.size) break;
      await new Promise(res => setTimeout(res, 5000));
    }
    const d = r.jobs.filter(j => j.status === 'done').length;
    if (blocked) run.event(`stopped: ${blocked}`);
    run.event(`${d}/${r.jobs.length} jobs done${r.result ? `; result ${r.result.json}` : ''}`);
    run.save();
    release();
    status(file);
    return r.jobs.every(j => j.status === 'done') ? 0 : r.jobs.some(j => j.status === 'failed') ? 1 : 2;
  } finally { if (!stopping) release(); }
}

function expectedBytes(r: Registry, j: Job): number {
  const per = r.rates[`bytes:${j.kind}`] ?? BYTES_PER_SEED_DAY;
  return per * Math.max(1, j.seedDays) * 2;
}

function start(run: Run, j: Job, detach: boolean): void {
  const r = run.reg;
  for (const f of [run.exitFile(j), `${run.exitFile(j)}.tmp`]) if (existsSync(f)) unlinkSync(f);
  const log = run.path(j.log);
  writeFileSync(log, `# e-run ${r.label} ${j.id} attempt ${j.attempts + 1} at ${now()} (commit ${r.commit.slice(0, 10)})\n# ${['tsx', ...j.argv].map(x => (x.length > 120 ? `${x.slice(0, 117)}...` : x)).join(' ')}\n`);
  const child = spawn('/bin/sh', ['-c', SH, 'E_RUN', TSX, ...j.argv], {
    cwd: r.root, detached: true, stdio: 'ignore',
    env: { ...process.env, E_RUN_LOG: log, E_RUN_EXIT: run.exitFile(j), E_RUN_OUT: j.stdout ? run.path(j.stdout) : '' },
  });
  if (detach) child.unref();
  child.on('error', e => run.event(`${j.id}: spawn error ${e.message}`));
  j.started = now(); j.finished = null; j.exit = null; j.attempts++; j.note = '';
  if (!child.pid) { j.status = 'failed'; j.pid = null; j.note = 'could not start'; run.event(`${j.id} could not start`); return; }
  j.status = 'running'; j.pid = child.pid;
  run.event(`${j.id} started (pid ${j.pid}, ~${j.estimateMin} min)`);
}

function done(run: Run, j: Job): void {
  const outs = j.outputs.map(o => { const p = run.path(o), f = existsSync(p) ? p : `${p}.gz`; return { path: relative(run.dir, f), bytes: statSync(f).size, sha256: sha256(f) }; });
  writeJsonAtomic(run.marker(j), { job: j.id, exit: 0, finished: j.finished, wallS: j.wallS, commit: run.reg.commit, outputs: outs });
  j.status = 'done';
  if (j.kind !== 'merge' && j.wallS && j.seedDays > 0) {
    const rate = j.wallS / j.seedDays, k = j.kind, bytes = outs.reduce((a, o) => a + o.bytes, 0) / j.seedDays;
    run.reg.rates[k] = Math.max(run.reg.rates[k] ?? 0, Math.round(rate * 100) / 100);
    run.reg.rates[`bytes:${k}`] = Math.max(run.reg.rates[`bytes:${k}`] ?? 0, Math.round(bytes));
  }
  run.event(`${j.id} done in ${((j.wallS ?? 0) / 60).toFixed(1)} min`);
}

function finalize(run: Run, j: Job): void {
  const code = +readFileSync(run.exitFile(j), 'utf8').trim();
  j.exit = Number.isFinite(code) ? code : 1; j.finished = now(); j.pid = null;
  j.wallS = j.started ? Math.round((Date.parse(j.finished) - Date.parse(j.started)) / 1000) : null;
  const missing = j.outputs.filter(o => !outputOk(run.path(o)));
  if (j.exit === 0 && !missing.length && viabilityOk(run, j)) done(run, j);
  else { j.status = 'failed'; j.note = j.exit !== 0 ? `exit ${j.exit}; see ${j.log}` : `outputs missing: ${missing.join(', ') || 'viability'}`; run.event(`${j.id} failed: ${j.note}`); }
  unlinkSync(run.exitFile(j));
}

/** A fallback bench or viability pass must leave a per-seed bench JSON with its viability replay. */
function viabilityOk(run: Run, j: Job): boolean {
  if (j.kind !== 'bench' && j.kind !== 'viab') return true;
  try { return readJsonMaybeGz<EB.BenchDoc>(run.path(j.outputs[0])).viability !== null; } catch { return false; }
}

/** The fallback merge: per-seed bench and scorecard JSON → <label>.json, .md and .scorecard.json (and -rhythm5.json). */
async function fallbackMerge(run: Run): Promise<void> {
  const r = run.reg, P = (s: number, ext: string) => run.path(`parts/${r.label}.s${s}${ext}`);
  const cards = r.seeds.map(s => readJsonMaybeGz<Card>(P(s, '.scorecard.json')));
  const docs = r.seeds.map(s => readJsonMaybeGz<EB.BenchDoc>(P(s, '.json')));
  for (const d of docs) if (d.git.commit !== r.commit || d.git.dirty) throw new Error(`${d.label} was made at ${d.git.commit.slice(0, 10)} with ${d.git.dirty} uncommitted files`);
  const targets = JSON.parse(readFileSync(resolve(r.root, 'data/targets.json'), 'utf8')) as TargetFile;
  const card = mergeScorecards(cards, targets);
  const cardFile = run.path(`${r.label}.scorecard.json`);
  writeFileSync(cardFile, JSON.stringify(card, null, 1));
  const m = EB.MODES[r.mode as keyof typeof EB.MODES];
  const mode = m && m.days === r.horizon.days && m.burnInDays === r.horizon.burnInDays && m.seeds.join() === r.seeds.join() ? r.mode : 'custom';
  const sum = (k: 'scorecardS' | 'viabilityS' | 'totalS') => docs.reduce((a, d) => a + (d.timing[k] ?? 0), 0);
  const doc = EB.assemble(card as unknown as Parameters<typeof EB.assemble>[0], docs.map(d => d.viability!.perSeed[0]), { label: r.label, mode, workers: 1,
    timing: { scorecardS: sum('scorecardS'), viabilityS: sum('viabilityS'), totalS: sum('totalS') }, scorecard: cardFile, git: docs[0].git });
  const c = r.compare ? EB.compare(JSON.parse(readFileSync(r.compare, 'utf8')) as EB.BenchDoc, doc) : undefined;
  writeFileSync(run.path(`${r.label}.json`), JSON.stringify(c ? { ...doc, comparison: { with: r.compare, ...c } } : doc, null, 1) + '\n');
  writeFileSync(run.path(`${r.label}.md`), EB.benchMarkdown(doc, c ? { other: r.compare!, c } : undefined));
  if (r.readouts.rhythm) {
    const parts = r.seeds.map(s => readJsonMaybeGz<{ seeds: number[]; burnIn: number; days: number; params: Overrides; results: unknown[] }>(P(s, '-rhythm.json')));
    writeFileSync(run.path(`${r.label}-rhythm5.json`), JSON.stringify({ seeds: r.seeds, burnIn: parts[0].burnIn, days: parts[0].days, params: parts[0].params, results: parts.flatMap(p => p.results) }, null, 1));
  }
  r.result = { json: `${r.label}.json`, md: `${r.label}.md`, scorecard: `${r.label}.scorecard.json`, ...(r.readouts.rhythm ? { rhythm: `${r.label}-rhythm5.json` } : {}),
    ...(r.jobs.some(j => j.id === 'energy') ? { energy: `${r.label}-energy.json` } : r.readouts.energy ? { energy: 'per seed in parts/ (not merged)' } : {}) };
  run.event(`merged ${r.seeds.length} seeds into ${r.label}.json (fallback merge; ${r.label}.scorecard.md is not written on this path)`);
}

/** After the merge: gzip the per-seed outputs the merged result no longer reads (never the merged result itself). */
async function compressParts(run: Run): Promise<void> {
  const dir = run.path('parts');
  let n = 0;
  for (const f of readdirSync(dir)) if (!f.endsWith('.gz') && !f.includes('.tmp') && !/\.ckpt-d\d+\.json$/.test(f)) { if (await gzipFile(resolve(dir, f))) n++; }
  for (const f of readdirSync(run.path('logs'))) if (!f.endsWith('.gz')) { if (await gzipFile(run.path(`logs/${f}`))) n++; }
  if (n) run.event(`gzipped ${n} per-seed files and logs`);
}

async function mergeCmd(file: string): Promise<void> {
  const run = new Run(file), r = run.reg;
  const refusal = checkoutRefusal(ROOT, r.commit);
  if (refusal) throw new Error(`refused: ${refusal}`);
  const m = r.jobs.find(j => j.kind === 'merge')!;
  const missing = m.after.filter(id => r.jobs.find(j => j.id === id)?.status !== 'done');
  if (missing.length) throw new Error(`not every job is done: ${missing.join(', ')}`);
  if (m.argv.length) throw new Error('the single-pass merge runs as a job: use `run`');
  m.started = now(); m.attempts++;
  await fallbackMerge(run);
  m.finished = now(); m.wallS = 0; m.exit = 0; done(run, m); await compressParts(run); run.save();
  console.log(`wrote ${Object.values(r.result ?? {}).join(', ')}`);
}

function diffCmd(a: string, b: string): number {
  const d = diffJson(readJsonMaybeGz(a), readJsonMaybeGz(b), VOLATILE);
  if (!d.length) { console.log(`identical (ignoring ${[...VOLATILE].join(', ')})`); return 0; }
  console.log(`${d.length}${d.length >= 50 ? '+' : ''} differences:`); for (const x of d) console.log(`  ${x}`);
  return 1;
}

async function main(): Promise<number> {
  const [cmd, ...rest] = process.argv.slice(2), a = parseArgs(rest);
  switch (cmd) {
    case 'plan': await plan(a); return 0;
    case 'run': if (!a.pos[0]) throw new Error('run <out>/run.json'); return runCmd(a.pos[0], a);
    case 'status': if (!a.pos[0]) throw new Error('status <out>/run.json'); status(a.pos[0]); return 0;
    case 'merge': if (!a.pos[0]) throw new Error('merge <out>/run.json'); await mergeCmd(a.pos[0]); return 0;
    case 'diff': if (a.pos.length < 2) throw new Error('diff <a.json> <b.json>'); return diffCmd(a.pos[0], a.pos[1]);
    default: console.error('usage: e-run.ts plan|run|status|merge|diff … (see the header of scripts/e-run.ts)'); return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().then(code => process.exit(code), e => { console.error(`e-run: ${e instanceof Error ? e.message : e}`); process.exit(1); });
