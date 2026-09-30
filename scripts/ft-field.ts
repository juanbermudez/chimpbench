// Model-driven societies under the virtual field observer (docs/decide-finetune.md §6; the observer is
// docs/realism-design.md §3). Joins scripts/ft-society.ts (who is model-driven, lockstep answers from the Decide worker)
// with src/field/run.ts (observers, trials, metrics), so model-driven chimps are scored against the field targets in
// data/targets.json exactly as scripts/field-metrics.ts scores rules-driven ones. `--cond rules` reproduces
// field-metrics for the same seed, profile, days, burn-in and trial spacing (tests/ft-field.test.ts proves it).
//
//   pnpm exec tsx scripts/ft-field.ts --cond rules --seed 48 --days 30          # = field-metrics.ts --seeds 48 --days 30 --experiments-every 0
//   MGOGO_FT_ROOT=artifacts/decide-ft/round2 pnpm exec tsx scripts/ft-field.ts --cond all-baseline --seed 48 --days 30
//
// Flags: --cond (every scripts/ft-society.ts assignment(): rules, base, rot0–2, jev1–3, all-base|all-baseline|
// all-aggressive|all-collaborative; the observer pools communities, so compare real chimps with all-* conditions) ·
// --seed N · --profile compressed|field (default compressed) · --days D (default 30) · --burn-in B (days of plain
// rules ticks before the observer AND the model start; default 0) · --experiments-every E (default 0 = off) ·
// --device mps|cuda (default mps) · --out dir (default artifacts/decide-ft/field) · --observe-first (see below).
//
// Per tick: controllers are set (ft-society rule), the world ticks, waiting chimps are answered in one batch, then
// the three observers step. Answering before observing is deliberate: a model-driven chimp at a decision point rests
// ("Waiting for a decision") until answered, so observing first would score that lockstep artefact as rest on
// point samples where a rules chimp shows its new action; ft-society's own activity samples also read actions after
// the answers. --observe-first observes before answering, to measure the artefact.
// Trials (--experiments-every > 0) run inside src/field/experiments.ts on structuredClone copies that no one answers:
// model-driven chimps in a copy wait up to modelPolicy.asyncGraceMinutes (6 eco-min) at each decision, then rules decide.
// Treat the trial-scored rows of model conditions (T-IGE-4 playback, T-COM-11 snake) as not measuring the model.
//
// Output: <out>/<cond>-<seed>.json with field-metrics' --json shape for one seed (manifest, summary, rows, s18, life,
// accuracy, timing, counts, values), so `field-metrics.ts --rescore <json> --md <md>` renders the full scorecard and
// `field-compare.ts rules-48.json all-baseline-48.json` diffs two runs; plus cond, assignment, codeSha256, worker
// (adapter hashes), decisions, applied, modelSeconds (worker wait; the first batch, firstBatchSeconds, includes loading
// GLiNER, which worker.py does lazily), batches. And <out>/<cond>-<seed>.md, a short summary.
import { appendFileSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createWorld, tickWorld } from '../src/simulation';
import type { World } from '../src/types';
import { patrolAccuracy } from '../src/field/classifiers';
import { defaultConfig, PROFILES, TARGET_FOLLOW, type ProfileName } from '../src/field/config';
import { derive } from '../src/field/derive';
import { runTrials, trialRng } from '../src/field/experiments';
import { METRICS, type SeedValue } from '../src/field/metrics';
import { createObserver, finishObserver, observerStep } from '../src/field/observer';
import { recordsHash } from '../src/field/records';
import { accuracyOf, type FieldJob, type FieldResult } from '../src/field/run';
import { S18, section18 } from '../src/field/section18';
import { mean } from '../src/field/stats';
import { applyInstrumentBar, scoreTargets, summarize, type TargetFile } from '../src/field/targets';
import { PHENOLOGY_DATA } from '../src/sim/phenology.gen';
import { codeHash } from './ft-contexts';
import { answerWaiting, assignment, setControllers, Worker as DecideWorker, type LoggedDecision, type Scorer } from './ft-society';
import { StandInScorer } from './ft-standin';

export interface CensusPoint { day: number; troops: Record<number, { n: number; infants: number; immature: number; adultMales: number; adultFemales: number }>; stats: World['stats'] }

function censusPoint(world: World, day: number): CensusPoint {
  const troops: CensusPoint['troops'] = {};
  for (const t of world.troops) troops[t.id] = { n: 0, infants: 0, immature: 0, adultMales: 0, adultFemales: 0 };
  for (const c of world.chimps) {
    const b = c.alive ? troops[c.troopId] : undefined;
    if (!b) continue;
    b.n++;
    if (c.stage === 'infant') b.infants++;
    else if (c.stage === 'adult' || c.stage === 'elder') { if (c.sex === 'male') b.adultMales++; else b.adultFemales++; }
    else b.immature++;
  }
  return { day, troops, stats: { ...world.stats } };
}

export type FtFieldJob = FieldJob & { cond: string; observeFirst?: boolean; decisionLog?: (d: LoggedDecision) => void };
export interface FtFieldResult extends FieldResult {
  cond: string; assignment: Record<number, string | null>; observeFirst: boolean;
  decisions: number; applied: number; modelSeconds: number; firstBatchSeconds: number; firstBatchDecisions: number; batches: number; byCommunity: Record<number, { decisions: number; applied: number }>;
  /** Weekly census (omniscient truth, for population curves): living members by stage per community, and the world's running counters. */
  census: CensusPoint[];
}

/**
 * One observed run with model-driven communities. The sequence mirrors src/field/run.ts runFieldJob (lines 55–101 when
 * written: world, burn-in, the three observers and their seeds, trial RNG and schedule, timing split, metrics, the
 * T-PAT-1 male-party part, §18, accuracy, counts, record hashes); only the model step is added. runFieldJob has no
 * per-tick hook and src/field is protocol-hashed, so the sequence is replicated here; the equivalence test catches drift.
 */
export async function runFtField(job: FtFieldJob, scorer: Scorer | null, log: (msg: string) => void = () => {}): Promise<FtFieldResult> {
  const assign = assignment(job.cond);
  const model = Object.values(assign).some(Boolean);
  if (model && !scorer) throw new Error(`--cond ${job.cond} is model-driven but no scorer was given`);
  const t0 = performance.now();
  const world = createWorld(job.seed, { profile: job.profile, params: job.params ?? {} });
  // burn-in: plain rules ticks, as in runFieldJob; the model starts with the observer
  for (let i = 0, n = Math.round((job.burnInDays ?? 0) * 5760); i < n; i++) tickWorld(world);
  if (model) world.modelPolicy = { ...world.modelPolicy, mode: 'async' };
  const obs = createObserver(world, { ...job.observer, seed: job.observerSeed ?? 1, profile: PROFILES[job.profile], truth: job.truth ?? true });
  const pobs = createObserver(world, { ...job.observer, seed: (job.observerSeed ?? 1) + 7919, profile: PROFILES[job.profile], truth: job.truth ?? true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const mobs = createObserver(world, { ...job.observer, seed: (job.observerSeed ?? 1) + 2 * 7919, profile: PROFILES[job.profile], truth: job.truth ?? true, followMode: 'party-males', lite: true, pointIntervalMin: 1 });
  const trials = trialRng(job.observerSeed ?? 1);
  const every = job.experimentEveryDays ?? 30;
  const ticks = Math.round(job.days * 5760);
  let simMs = 0, obsMs = 0, expMs = 0, prevHour = world.hour;
  let modelSeconds = 0, firstBatchSeconds = 0, firstBatchDecisions = 0, batches = 0, decisions = 0, applied = 0;
  const byCommunity: FtFieldResult['byCommunity'] = Object.fromEntries(world.troops.map(t => [t.id, { decisions: 0, applied: 0 }]));
  const answer = async () => {
    const r = await answerWaiting(world, scorer!, assign, job.cond, job.seed, 'native', job.decisionLog);
    modelSeconds += r.seconds;
    if (r.answers.length && batches++ === 0) { firstBatchSeconds = r.seconds; firstBatchDecisions = r.answers.length; }
    for (const a of r.answers) {
      decisions++; if (a.applied) applied++;
      const b = (byCommunity[a.c.troopId] ??= { decisions: 0, applied: 0 });
      b.decisions++; if (a.applied) b.applied++;
    }
  };
  const census: CensusPoint[] = [censusPoint(world, 0)];
  for (let i = 0; i < ticks; i++) {
    if (i > 0 && i % (5760 * 7) === 0) census.push(censusPoint(world, i / 5760));
    if (model) setControllers(world, assign);
    const a = performance.now();
    tickWorld(world);
    simMs += performance.now() - a;
    if (model && !job.observeFirst) await answer();
    const b = performance.now();
    observerStep(obs, world);
    observerStep(pobs, world);
    observerStep(mobs, world);
    const c = performance.now();
    obsMs += c - b;
    if (model && job.observeFirst) await answer();
    // field experiments at 10:00 on every `every`-th day, on copies of the world
    if (every > 0 && prevHour < 10 && world.hour >= 10 && world.day % every === 10 % every) {
      const e = performance.now();
      obs.rec.experiments.push(...runTrials(world, 'playback', trials, obs.cfg.profile.approachM), ...runTrials(world, 'snake', trials, obs.cfg.profile.approachM));
      expMs += performance.now() - e;
    }
    prevHour = world.hour;
    if (i > 0 && i % 1440 === 0) log(`${job.cond} seed ${job.seed}: day ${i / 5760}/${job.days} (${((performance.now() - t0) / 1000).toFixed(0)} s, model ${modelSeconds.toFixed(0)} s, ${decisions} decisions)`);
  }
  const rec = finishObserver(obs, world), prec = finishObserver(pobs, world), mrec = finishObserver(mobs, world);
  const m0 = performance.now();
  const d = derive(rec), pd = derive(prec), md = derive(mrec);
  const values: Record<string, SeedValue> = {};
  for (const m of METRICS) if (m.compute) { const mode = TARGET_FOLLOW[m.id]; values[m.id] = m.compute(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d); }
  const pat1 = METRICS.find(m => m.id === 'T-PAT-1');
  if (pat1?.compute && values['T-PAT-1']) values['T-PAT-1'].parts = { ...values['T-PAT-1'].parts, maleParties: pat1.compute(md).value };
  const s18 = section18(d);
  const accuracy = accuracyOf(rec, d);
  accuracy.patrolMales = patrolAccuracy(mrec, md.followPts, md.patrols);
  const metricsMs = performance.now() - m0;
  const counts = { points: rec.points.t.n, scans: rec.scans.t.n, follows: rec.follows.length, completeFollows: rec.follows.filter(f => f.complete).length, lostFollows: rec.follows.filter(f => f.lost).length,
    events: rec.events.length, conflicts: rec.conflicts.length, detectedConflicts: rec.conflicts.filter(c => c.detected).length, encounters: rec.encounters.length, hunts: rec.hunts.length,
    detectedHunts: rec.hunts.filter(h => h.detected).length, patrols: d.patrols.length, truthPatrols: rec.truth.patrols.length, calls: rec.calls.length, visits: rec.visits.length,
    births: rec.births.length, deaths: rec.deaths.length, transfers: rec.transfers.length, experiments: rec.experiments.length };
  return { seed: job.seed, days: job.days, profile: job.profile, hash: `${recordsHash(rec)}/${recordsHash(prec)}/${recordsHash(mrec)}`, wallMs: performance.now() - t0, simMs, observerMs: obsMs, experimentMs: expMs, metricsMs,
    values, s18, accuracy, counts, cond: job.cond, assignment: assign, observeFirst: !!job.observeFirst, decisions, applied, modelSeconds, firstBatchSeconds, firstBatchDecisions, batches, byCommunity, census: [...census, censusPoint(world, job.days)] };
}

/**
 * Protocol fingerprint, identical to scripts/field-metrics.ts protocolHash() (that script runs on import, so it cannot
 * be imported): sha256 over src/field/*.ts, the pool worker and each target's id, role, band and observer protocol.
 */
export function protocolHash(): string {
  const h = createHash('sha256');
  const dir = new URL('../src/field/', import.meta.url);
  for (const f of readdirSync(dir).filter(x => x.endsWith('.ts')).sort()) { h.update(f); h.update(readFileSync(new URL(f, dir))); }
  h.update(readFileSync(new URL('./lib/field-worker.ts', import.meta.url)));
  const t = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as { targets: { id: string; role: string; encoded: boolean; accept: unknown; observer: unknown }[] };
  h.update(JSON.stringify(t.targets.map(x => [x.id, x.role, x.encoded, x.accept, x.observer])));
  return h.digest('hex').slice(0, 16);
}
function frozenHash(): { hash: string | null; stage: string | null } {
  const t = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as { protocolFreeze?: { hash: string; stage: string } };
  return { hash: t.protocolFreeze?.hash ?? null, stage: t.protocolFreeze?.stage ?? null };
}

export interface ScorecardMeta { profile: ProfileName; days: number; burnInDays: number; experimentsEveryDays: number; params?: Record<string, number>; observerSeed?: number; truth?: boolean }

/**
 * The --json document of scripts/field-metrics.ts for these results (its main() from "const targets = …" to the JSON
 * write, with no life-course rows and no pool): target rows and summary, §18 table, pooled instrument accuracy,
 * timing, counts, per-seed values.
 */
export function scorecard(results: FieldResult[], meta: ScorecardMeta) {
  const PROFILE = meta.profile, OBS_SEED = meta.observerSeed ?? 1;
  const targets = JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as TargetFile;
  const values: Record<string, SeedValue[]> = {};
  for (const r of results) for (const [id, v] of Object.entries(r.values)) (values[id] ??= []).push(v);
  const rows = scoreTargets(targets, values, PROFILE);
  const s18 = S18.map(s => {
    const obs = results.map(r => r.s18[s.key]?.observed ?? null), tru = results.map(r => r.s18[s.key]?.truth ?? null);
    const ok = (a: (number | null)[]) => a.filter((x): x is number => x !== null);
    return { key: s.key, label: s.label, field: s.field, protocol: s.protocol, truthProtocol: s.truthProtocol, unit: results[0]?.s18[s.key]?.unit ?? '',
      observed: obs, truth: tru, observedMean: ok(obs).length ? mean(ok(obs)) : null, truthMean: ok(tru).length ? mean(ok(tru)) : null };
  });
  const act = results.map(r => r.accuracy.activity.maxAbsDiff);
  type PA = { precision: number; recall: number; truthEpisodes: number; classified: number };
  const pool = (get: (r: FieldResult) => PA | undefined) => {
    const a = results.reduce((a, r) => { const p = get(r); if (!p) return a; a.correct += Number.isFinite(p.precision) ? p.precision * p.classified : 0; a.classified += p.classified; a.found += Number.isFinite(p.recall) ? p.recall * p.truthEpisodes : 0; a.episodes += p.truthEpisodes; return a; }, { correct: 0, classified: 0, found: 0, episodes: 0 });
    return { ...a, precision: a.classified ? a.correct / a.classified : NaN, recall: a.episodes ? a.found / a.episodes : NaN };
  };
  const pat = pool(r => r.accuracy.patrol), patM = pool(r => r.accuracy.patrolMales);
  applyInstrumentBar(rows, { focal: pat, males: patM });
  const summary = summarize(rows);
  const enc = results.reduce((a, r) => { const e = r.accuracy.encounter; if (!e) return a; a.found += Number.isFinite(e.recall) ? e.recall * e.followedTruth : 0; a.followed += e.followedTruth; a.real += Number.isFinite(e.precision) ? e.precision * e.classified : 0; a.classified += e.classified; a.truth += e.truthEpisodes; return a; }, { found: 0, followed: 0, real: 0, classified: 0, truth: 0 });
  const hun = results.reduce((a, r) => { const h = r.accuracy.hunt; if (h) { a.detected += h.detected; a.truth += h.truth; } return a; }, { detected: 0, truth: 0 });
  const encounter = { recall: enc.followed ? enc.found / enc.followed : NaN, precision: enc.classified ? enc.real / enc.classified : NaN, detection: enc.truth ? enc.classified / enc.truth : NaN, followedTruth: enc.followed, classified: enc.classified, truthEpisodes: enc.truth };
  const hunt = { detection: hun.truth ? hun.detected / hun.truth : NaN, detected: hun.detected, truth: hun.truth };
  const obsShare = results.map(r => r.observerMs / r.simMs);
  const fz = frozenHash(), ph = protocolHash();
  const manifest = {
    date: new Date().toISOString(), profile: PROFILE, params: meta.params ?? {}, burnInDays: meta.burnInDays, phenology: PROFILE === 'field' ? (PHENOLOGY_DATA ? PHENOLOGY_DATA.source : 'synthetic (no Kibale dataset ingested)') : 'compressed eager model', days: meta.days, seeds: results.map(r => r.seed), experimentsEveryDays: meta.experimentsEveryDays, truth: meta.truth ?? true, observer: { ...defaultConfig(PROFILE, { seed: OBS_SEED }) },
    protocolHash: ph, frozenProtocolHash: fz.hash, frozenAt: fz.stage,
    node: process.version, availableParallelism: availableParallelism(), workers: 1,
    hashes: Object.fromEntries(results.map(r => [r.seed, r.hash])),
  };
  const poolMs = results.reduce((a, r) => a + r.wallMs, 0);
  const timing = { poolMs, soloMs: null, ratio: null, jobWallMs: results.map(r => r.wallMs), simMs: results.map(r => r.simMs), observerMs: results.map(r => r.observerMs), experimentMs: results.map(r => r.experimentMs), observerShare: obsShare };
  const accuracy = { activityMaxAbsDiff: act, activity: results.map(r => r.accuracy.activity), patrol: { precision: pat.precision, recall: pat.recall, classified: pat.classified, truthEpisodes: pat.episodes, perSeed: results.map(r => r.accuracy.patrol) }, patrolMales: { precision: patM.precision, recall: patM.recall, classified: patM.classified, truthEpisodes: patM.episodes, perSeed: results.map(r => r.accuracy.patrolMales ?? null) }, encounter, hunt };
  return { manifest, summary, rows, s18, life: [] as unknown[], accuracy, timing, counts: results.map(r => ({ seed: r.seed, ...r.counts })), values };
}

const f = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(d));

function markdown(r: FtFieldResult, doc: ReturnType<typeof scorecard>, extra: { codeSha256: string; worker: Record<string, unknown> | null; json: string }): string {
  const m = doc.manifest, o: string[] = [];
  const names: Record<number, string> = { 1: 'West', 2: 'East', 3: 'North' };
  const rate = r.batches > 1 ? `after the first batch (${f(r.firstBatchSeconds, 1)} s, includes loading the model) ${f((r.decisions - r.firstBatchDecisions) / (r.modelSeconds - r.firstBatchSeconds), 1)} decisions per model-second` : 'fewer than two batches';
  o.push(`# Field-observer scorecard: ${r.cond}, seed ${r.seed}`, '');
  o.push(`\`scripts/ft-field.ts\`, ${m.date}. Profile **${m.profile}**, **${m.days} days** after ${m.burnInDays} days of rules burn-in; ${m.experimentsEveryDays ? `trials every ${m.experimentsEveryDays} days (copies get no model answers)` : 'no field trials'}; ${r.observeFirst ? 'observers step before answers (--observe-first)' : 'answers before observers'}.`);
  o.push(`Policies: ${Object.entries(r.assignment).map(([id, a]) => `${names[+id] ?? id} ${a ?? 'rules'}`).join(', ')}. Code sha256 \`${extra.codeSha256.slice(0, 16)}\`; protocol hash \`${m.protocolHash}\`${m.frozenProtocolHash ? (m.frozenProtocolHash === m.protocolHash ? ` (frozen at ${m.frozenAt})` : ` (≠ frozen \`${m.frozenProtocolHash}\`)`) : ''}; record hash \`${r.hash}\`.`);
  if (extra.worker) o.push(`Worker: device ${extra.worker.device}, adapters ${Object.entries((extra.worker.adapters ?? {}) as Record<string, string>).map(([k, v]) => `${k} \`${v.slice(0, 12)}\``).join(', ')}.`);
  o.push('', `Decisions answered by the model: ${r.decisions} (${r.applied} applied, ${r.decisions ? f(100 * r.applied / r.decisions, 1) : '—'}%), ${f(r.modelSeconds, 1)} s in the worker (${rate}); wall ${f(r.wallMs / 1000, 0)} s.`, '');
  o.push('| Role | Pass | Tuned pass | Fail | Inconclusive | Insufficient | Scale | n/a | Structural | Compromised | Instrument below bar | Encoded |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const role of ['fitted', 'held-out'] as const) { const s = doc.summary[role]; o.push(`| ${role} | ${s.pass} | ${s.tuned ?? 0} | ${s.fail} | ${s.inconclusive} | ${s.insufficient} | ${s.scale ?? 0} | ${s['n/a']} | ${s.structural} | ${s.compromised ?? 0} | ${s.instrument ?? 0} | ${s.encoded ?? 0} |`); }
  o.push('', '| Target | Role | Metric | Band | Value | Truth | Verdict |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of doc.rows) o.push(`| ${row.id}${row.encoded ? ' (enc.)' : ''}${row.flags.map(x => ` *${x}*`).join('')} | ${row.role} | ${row.metric} | ${row.band} | ${f(row.pooled)} | ${f(row.truth)} | **${row.verdict}** |`);
  o.push('', `One seed: most rare-event rows stay insufficient or inconclusive. Full scorecard: \`pnpm exec tsx scripts/field-metrics.ts --rescore ${extra.json} --md <file>\`; diff against rules: \`pnpm exec tsx scripts/field-compare.ts <rules json> ${extra.json} [out.md]\`.`, '');
  return o.join('\n');
}

if (process.argv[1]?.endsWith('ft-field.ts')) {
  const args = process.argv.slice(2);
  const flag = (name: string, dflt: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt; };
  const cond = flag('cond', ''), seed = +flag('seed', 'NaN');
  const profile = flag('profile', 'compressed') as ProfileName;
  if (!cond || !Number.isInteger(seed)) { console.error('usage: ft-field.ts --cond <cond> --seed N [--profile compressed|field] [--days D] [--burn-in B] [--experiments-every E] [--device mps|cuda] [--out dir] [--observe-first]'); process.exit(2); }
  if (profile !== 'compressed' && profile !== 'field') { console.error(`Unknown profile "${profile}" (compressed | field).`); process.exit(2); }
  const job: FtFieldJob = { cond, seed, profile, days: +flag('days', '30'), burnInDays: +flag('burn-in', '0'), experimentEveryDays: +flag('experiments-every', '0'), observeFirst: args.includes('--observe-first') };
  // --log-decisions f [--log-rate r]: append a share of decisions (features + probabilities) for the stand-in fits.
  // The share is picked by a hash of (seed, time, chimp), never world.rng, so logging cannot change the run.
  const logFile = flag('log-decisions', ''), logRate = +flag('log-rate', '0.1');
  if (logFile) job.decisionLog = d => {
    const h = createHash('sha256').update(`${d.seed}:${d.time}:${d.chimpId}`).digest().readUInt32BE(0) / 2 ** 32;
    if (h < logRate) appendFileSync(logFile, JSON.stringify({ ...d, cond }) + '\n');
  };
  const out = resolve(flag('out', 'artifacts/decide-ft/field'));
  const assign = assignment(cond); // fail fast on an unknown condition, before starting the worker
  (async () => {
    // --stand-ins dir: answer with the fitted stand-ins (scripts/ft-standin.ts) instead of the model worker.
    const names = Object.values(assign).filter((a): a is string => !!a);
    const standIns = flag('stand-ins', '');
    const worker = !names.length ? null : standIns ? new StandInScorer(standIns, names) : new DecideWorker(flag('device', 'mps'));
    try {
      if (worker instanceof DecideWorker) await worker.start();
      const r = await runFtField(job, worker, msg => console.log(msg));
      const doc = scorecard([r], { profile, days: job.days, burnInDays: job.burnInDays!, experimentsEveryDays: job.experimentEveryDays! });
      const codeSha256 = codeHash();
      const file = `${out}/${cond}-${seed}.json`;
      mkdirSync(out, { recursive: true });
      writeFileSync(file, JSON.stringify({ ...doc, cond, assignment: r.assignment, observeFirst: r.observeFirst, codeSha256, worker: worker?.ready ?? null,
        census: r.census, decisions: r.decisions, applied: r.applied, modelSeconds: +r.modelSeconds.toFixed(2), firstBatchSeconds: +r.firstBatchSeconds.toFixed(2), firstBatchDecisions: r.firstBatchDecisions, batches: r.batches, seconds: +(r.wallMs / 1000).toFixed(1), byCommunity: r.byCommunity }, null, 1));
      writeFileSync(`${out}/${cond}-${seed}.md`, markdown(r, doc, { codeSha256, worker: worker?.ready ?? null, json: file }));
      const s = doc.summary;
      console.log(`wrote ${file} and .md (${(r.wallMs / 1000).toFixed(0)} s; ${r.decisions} decisions, ${r.applied} applied, model ${r.modelSeconds.toFixed(1)} s in ${r.batches} batches, first ${r.firstBatchSeconds.toFixed(1)} s); fitted ${s.fitted.pass} pass / ${s.fitted.fail} fail, held-out ${s['held-out'].pass} pass / ${s['held-out'].fail} fail`);
    } finally { if (worker instanceof DecideWorker) worker.stop(); }
  })().catch(err => { console.error(err); process.exit(1); });
}
