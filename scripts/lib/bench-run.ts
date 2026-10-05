// One seed of e-bench's single pass (track E, parts E1 and E2): the observed field run of src/field/run.ts runFieldJob
// (same burn-in, the same three team sets, the same field experiments on world copies, the same per-seed metrics), with
// every other readout of an arm taken from the same world in the same loop: viability (scripts/lib/viability.ts), the
// energy readouts (scripts/lib/energy-probe.ts, energy-diagnose.ts's) and the rhythm readouts (scripts/lib/rhythm-probe.ts,
// rhythm-metrics.ts's). One simulation per seed instead of four (field-metrics, the viability replay, energy-diagnose,
// rhythm-metrics). None of the readouts writes the world; the energy taps are switched off while the field experiments
// tick their world copies.
//
// The loop is runFieldJob's, composed from src/field's exported pieces, because src/field/run.ts neither hands its world
// out nor can be edited without moving the frozen protocol hash (scripts/lib/protocol-hash.ts hashes src/field and the
// field worker; this file is outside it). tests/e-bench-single-pass.test.ts checks that this loop's FieldResult equals
// runFieldJob's, so a later change to run.ts that is not mirrored here fails a test.
//
// Checkpoints (E2): the whole run state (world, the three observers, the trial RNG, every readout's state and the clocks)
// is written at chosen days (scripts/lib/checkpoint.ts) and a run can continue from one: a continued run is the same
// run, tick for tick, as an uninterrupted one (tests/e-bench-single-pass.test.ts).
import { createWorld, tickWorld } from '../../src/simulation';
import { patrolAccuracy } from '../../src/field/classifiers';
import { PROFILES, TARGET_FOLLOW, type ProfileName } from '../../src/field/config';
import { derive } from '../../src/field/derive';
import { runTrials, trialRng, type TrialRng } from '../../src/field/experiments';
import { METRICS, type SeedValue } from '../../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer } from '../../src/field/observer';
import { recordsHash } from '../../src/field/records';
import { accuracyOf, encounterAccuracy, type FieldResult } from '../../src/field/run';
import { section18 } from '../../src/field/section18';
import type { Overrides } from '../../src/sim/params';
import type { World } from '../../src/types';
import { readCheckpoint, restoreColumns, writeCheckpoint } from './checkpoint';
import { energyAfter, energyBefore, energyFinish, energyStart, energyTapsOff, energyTapsOn, newEnergyAcc, type EnergyAcc, type EnergySeedState } from './energy-probe';
import { TICKS_PER_DAY } from './horizon';
import { rhythmFinish, rhythmStart, rhythmStep, type RhythmResult, type RhythmState } from './rhythm-probe';
import { truthHooksOff, truthHooksOn, truthStart, truthStep, truthValues, type TruthState } from './truth-rows';
import { viabilityFinish, viabilityStart, viabilityStep, type Viability, type ViabilityState } from './viability';

export interface BenchJob {
  seed: number; profile: ProfileName; params: Overrides; burnInDays: number; days: number;
  /** runFieldJob's settings (scripts/field-metrics.ts defaults: observer seed 1, experiments every 30 days, truth on). */
  observerSeed: number; experimentEveryDays: number; truth: boolean;
  /** Readouts besides the scorecard and viability. */
  energy: boolean; rhythm: boolean;
  /** Absolute days (burn-in included) at which to write a checkpoint; at `stopDay` the run writes one and stops. */
  checkpointDays: number[]; stopDay: number | null;
  /** Checkpoint files are `${checkpointPrefix}.ckpt-d${day}.v8.gz` (and their sidecars). */
  checkpointPrefix: string | null;
  /** A checkpoint to continue from (refused when its settings or code identity differ). */
  resume: string | null;
  /** Code identity written into checkpoints and required on resume (git trees of src, scripts, data; registry and protocol hashes). */
  identity: Record<string, unknown>;
}

/** What one seed contributes to an arm: everything the arm's outputs pool, in seed order (e-bench --part writes it). */
export interface BenchPart {
  tool: 'e-bench-part'; version: 1; seed: number;
  config: { profile: ProfileName; days: number; burnInDays: number; params: Overrides; observerSeed: number; experimentEveryDays: number; truth: boolean; energy: boolean; rhythm: boolean };
  field: FieldResult; viability: Viability; energy: EnergyAcc | null; rhythm: RhythmResult | null;
  /** Simulation-truth target rows (data/targets.json scoredOn "truth"): this seed's value per row that has a readout. */
  truth: Record<string, SeedValue>;
  /** Wall time over every segment of the seed, segments (1 + resumes), checkpoints written. */
  timing: { wallMs: number; segments: number };
  resumedFrom: string | null; checkpoints: string[];
}
export type BenchSeedResult = { kind: 'part'; part: BenchPart } | { kind: 'stopped'; day: number; checkpoint: string };

/** A resume refused for a settings or code mismatch (e-bench exits 2). */
export class ResumeRefused extends Error { constructor(msg: string) { super(msg); this.name = 'ResumeRefused'; } }

/** Everything a run carries from tick to tick: what a checkpoint holds. */
export interface RunState {
  v: 1; seed: number;
  /** Ticks done since createWorld. */
  done: number;
  world: World;
  obs: Observer | null; pobs: Observer | null; mobs: Observer | null; trials: TrialRng | null; prevHour: number;
  /** Clocks summed over segments (ms): simulation, observers, field experiments, wall. */
  ms: { sim: number; obs: number; exp: number; wall: number }; segments: number;
  via: ViabilityState | null; en: { st: EnergySeedState; acc: EnergyAcc } | null; rh: RhythmState | null;
  /** Simulation-truth target rows' own readouts (scripts/lib/truth-rows.ts). */
  tr: TruthState | null;
  checkpoints: string[];
}

/** The settings a checkpoint must share with a job that continues it (the scored length may differ: the ladder). */
const settingsOf = (j: BenchJob) => ({ seed: j.seed, profile: j.profile, params: j.params, burnInDays: j.burnInDays, observerSeed: j.observerSeed, experimentEveryDays: j.experimentEveryDays, truth: j.truth, energy: j.energy, rhythm: j.rhythm });
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, (x as Record<string, unknown>)[k]])) : x);

export function checkpointFile(prefix: string, day: number): string { return `${prefix}.ckpt-d${day}.v8.gz`; }

function startObserving(s: RunState, job: BenchJob): void {
  const world = s.world, profile = PROFILES[job.profile];
  s.obs = createObserver(world, { seed: job.observerSeed, profile, truth: job.truth, demography: false });
  // further team sets on party follows for the targets whose source followed parties (config.ts TARGET_FOLLOW), as runFieldJob
  s.pobs = createObserver(world, { seed: job.observerSeed + 7919, profile, truth: job.truth, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  s.mobs = createObserver(world, { seed: job.observerSeed + 2 * 7919, profile, truth: job.truth, followMode: 'party-males', lite: true, pointIntervalMin: 1 });
  s.trials = trialRng(job.observerSeed);
  s.prevHour = world.hour;
  s.via = viabilityStart(world);
  if (job.energy) { const acc = newEnergyAcc(); s.en = { st: energyStart(world, acc, job.seed, job.days), acc }; }
  if (job.rhythm) s.rh = rhythmStart(world, job.seed);
  s.tr = truthStart(world);
}

/** Runs (or continues) one seed to its end, or to job.stopDay. */
export function runBenchSeed(job: BenchJob, log: (msg: string) => void = () => {}): BenchSeedResult {
  const t0 = performance.now();
  const burnTicks = Math.round(job.burnInDays * TICKS_PER_DAY), endTick = burnTicks + Math.round(job.days * TICKS_PER_DAY);
  let s: RunState, resumedAt = -1;
  if (job.resume) {
    const { header, state } = readCheckpoint<RunState>(job.resume);
    const want = canon(settingsOf(job)), have = canon(header.settings);
    if (want !== have) throw new ResumeRefused(`checkpoint ${job.resume} was made with other settings:\n  checkpoint ${have}\n  this run   ${want}`);
    if (canon(header.identity) !== canon(job.identity)) throw new ResumeRefused(`checkpoint ${job.resume} was made from other code or data:\n  checkpoint ${canon(header.identity)}\n  this run   ${canon(job.identity)}`);
    if (state.done > endTick) throw new ResumeRefused(`checkpoint ${job.resume} is at day ${state.done / TICKS_PER_DAY}, past this run's end (day ${endTick / TICKS_PER_DAY})`);
    s = state; resumedAt = s.done; s.segments++;
    for (const o of [s.obs, s.pobs, s.mobs]) restoreColumns(o);
    // the ladder continues a shorter run (an m6 checkpoint into m12): the window is this job's (energy-diagnose's juveniles report it)
    if (s.en) s.en.st.days = job.days;
    log(`seed ${job.seed}: resumed at day ${s.done / TICKS_PER_DAY} from ${job.resume}`);
  } else {
    s = { v: 1, seed: job.seed, done: 0, world: createWorld(job.seed, { profile: job.profile, params: job.params }), obs: null, pobs: null, mobs: null, trials: null, prevHour: 0,
      ms: { sim: 0, obs: 0, exp: 0, wall: 0 }, segments: 1, via: null, en: null, rh: null, tr: null, checkpoints: [] };
  }
  const ckAt = new Map(job.checkpointDays.map(d => [Math.round(d * TICKS_PER_DAY), d]));
  const stopTick = job.stopDay === null ? null : Math.round(job.stopDay * TICKS_PER_DAY);
  if (stopTick !== null && !ckAt.has(stopTick)) ckAt.set(stopTick, job.stopDay!);
  const every = job.experimentEveryDays;
  const hooksOn = () => { if (s.en) energyTapsOn(s.en.st, s.en.acc, s.world); if (s.tr) truthHooksOn(s.tr, s.world); };
  const hooksOff = () => { energyTapsOff(); truthHooksOff(); };
  hooksOn();
  const save = (day: number) => {
    if (!job.checkpointPrefix) throw new Error('a checkpoint day was given without a checkpoint prefix');
    const file = checkpointFile(job.checkpointPrefix, day);
    s.checkpoints.push(file);
    const wall = s.ms.wall;
    s.ms.wall = wall + (performance.now() - t0); // the clock at the checkpoint, so a continued run's wall time covers both segments
    const { bytes } = writeCheckpoint(file, { tool: 'e-bench-checkpoint', version: 1, seed: job.seed, day, tick: s.done, settings: settingsOf(job), identity: job.identity, scoredDays: job.days, date: new Date().toISOString() }, s);
    s.ms.wall = wall;
    log(`seed ${job.seed}: checkpoint at day ${day} (${(bytes / 1e6).toFixed(1)} MB) ${file}`);
    return file;
  };
  try {
    for (;;) {
      if (s.done === burnTicks && !s.obs) { startObserving(s, job); hooksOn(); }
      if (ckAt.has(s.done) && s.done !== resumedAt) save(ckAt.get(s.done)!);
      if (stopTick !== null && s.done >= stopTick) {
        const file = s.checkpoints[s.checkpoints.length - 1];
        return { kind: 'stopped', day: s.done / TICKS_PER_DAY, checkpoint: file };
      }
      if (s.done >= endTick) break;
      const w = s.world;
      if (s.done < burnTicks) { tickWorld(w); s.done++; continue; }
      const i = s.done - burnTicks;
      if (s.en) energyBefore(s.en.st, w, i);
      const a = performance.now();
      tickWorld(w);
      const b = performance.now();
      observerStep(s.obs!, w); observerStep(s.pobs!, w); observerStep(s.mobs!, w);
      const c = performance.now();
      s.ms.sim += b - a; s.ms.obs += c - b;
      // field experiments at 10:00 on every `every`-th day, on copies of the world (runFieldJob); the energy taps and the
      // contest hook are module hooks, so they are off while the copies tick
      if (every > 0 && s.prevHour < 10 && w.hour >= 10 && w.day % every === 10 % every) {
        hooksOff();
        s.obs!.rec.experiments.push(...runTrials(w, 'playback', s.trials!, s.obs!.cfg.profile.approachM), ...runTrials(w, 'snake', s.trials!, s.obs!.cfg.profile.approachM));
        hooksOn();
        s.ms.exp += performance.now() - c;
      }
      s.prevHour = w.hour;
      viabilityStep(s.via!, w, i);
      if (s.en) energyAfter(s.en.st, s.en.acc, w, i);
      if (s.rh) rhythmStep(s.rh, w, i);
      if (s.tr) truthStep(s.tr, w);
      s.done++;
    }
  } finally { hooksOff(); }

  // the readouts' ends first (each reads the world as its own tool did), then the observers' (as runFieldJob)
  const w = s.world;
  const wallMs = s.ms.wall + (performance.now() - t0);
  const viability = viabilityFinish(s.via!, w, job.seed, wallMs);
  if (s.en) energyFinish(s.en.st, s.en.acc, w);
  const rhythm = s.rh ? rhythmFinish(s.rh, w) : null;
  const rec = finishObserver(s.obs!, w), prec = finishObserver(s.pobs!, w), mrec = finishObserver(s.mobs!, w);
  const m0 = performance.now();
  const d = derive(rec), pd = derive(prec), md = derive(mrec);
  const values: Record<string, SeedValue> = {};
  for (const m of METRICS) if (m.compute && !m.sealed) { const mode = TARGET_FOLLOW[m.id]; values[m.id] = m.compute(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d); }
  // T-PAT-1 is scored on focal follows (its band comes from Gombe and Taï); the Ngogo-style male-party value is reported beside it (C6 review)
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
  const field: FieldResult = { seed: job.seed, days: job.days, profile: job.profile, hash: `${recordsHash(rec)}/${recordsHash(prec)}/${recordsHash(mrec)}`, wallMs: s.ms.wall + (performance.now() - t0),
    simMs: s.ms.sim, observerMs: s.ms.obs, experimentMs: s.ms.exp, metricsMs, values, s18, accuracy, encounterParty: encounterAccuracy(prec), counts };
  const energy = s.en ? s.en.acc : null;
  const truth = truthValues({ seed: job.seed, days: job.days, viability, energy, rhythm, rhythmState: s.rh, field, truth: s.tr, params: job.params as Record<string, number> });
  return { kind: 'part', part: { tool: 'e-bench-part', version: 1, seed: job.seed, config: { profile: job.profile, days: job.days, burnInDays: job.burnInDays, params: job.params, observerSeed: job.observerSeed, experimentEveryDays: job.experimentEveryDays, truth: job.truth, energy: job.energy, rhythm: job.rhythm },
    field, viability, energy, rhythm, truth, timing: { wallMs: field.wallMs, segments: s.segments }, resumedFrom: job.resume, checkpoints: s.checkpoints } };
}
