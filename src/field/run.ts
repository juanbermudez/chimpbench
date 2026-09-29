import { createWorld, tickWorld, type Overrides } from '../simulation';
import { CATEGORIES } from './categories';
import { patrolAccuracy } from './classifiers';
import { PROFILES, TARGET_FOLLOW, type ObserverConfig, type ProfileName } from './config';
import { derive } from './derive';
import { runTrials, trialRng } from './experiments';
import { METRICS, type SeedValue } from './metrics';
import { createObserver, finishObserver, observerStep } from './observer';
import { recordsHash, type Records } from './records';
import { section18, type S18Value } from './section18';

// One observed run: a world with the observer attached, field experiments on copies, then every metric for that
// seed. Used in-process by tests and by the worker pool (scripts/lib/field-worker.ts). No file or thread I/O here.

export interface FieldJob {
  seed: number; days: number; profile: ProfileName;
  /** Registry overrides for createWorld (calibration and sensitivity runs; the proof run uses none). */
  params?: Overrides;
  /** Days simulated before the observer starts (territories settle from their seeded circles; docs/realism-design.md §5.2). */
  burnInDays?: number;
  observerSeed?: number;
  /** Playback and snake trials on world copies every `experimentEveryDays` (0 disables). */
  experimentEveryDays?: number;
  truth?: boolean;
  /** Other observer settings (sensitivity runs); the proof run uses the defaults. */
  observer?: Partial<ObserverConfig>;
  /**
   * Stage C8: compute the sealed metrics too. Only scripts/field-metrics.ts --unseal sets it, after checking the hashes
   * against the logged C8 freeze; otherwise sealed metric functions are never called (early-life-prereg §1.2).
   */
  unseal?: boolean;
  /** Stage C8 long demography runs: no party-follow team sets, and the observer stores only what demography rows read. */
  demography?: boolean;
}

export interface Accuracy {
  /** Pooled focal-time shares: 1-min point samples vs continuous (per-tick) truth over the same follows. */
  activity: { observed: number[]; truth: number[]; maxAbsDiff: number; samples: number; ticks: number };
  patrol: { precision: number; recall: number; truthEpisodes: number; classified: number };
  /** The same classifier on the male-party follows that score T-PAT-1 and T-PAT-6 (stage C6). */
  patrolMales?: { precision: number; recall: number; truthEpisodes: number; classified: number };
  /**
   * Encounter classifier against truth (C5a; reference corrected after the C7a review): recall = observable truth
   * episodes (a followed-party member saw strangers, or heard their long calls) that the team classified as an
   * encounter with that community within ±60 min; `recallAll` keeps the earlier reference, which also counted acoustic
   * episodes in which only the stranger heard the followed party (nothing reaches the team's ears; wilson2012 scores
   * foreign calls heard by the observers' party). Precision = classified encounters with a truth episode of the same
   * community pair within the simulation's episode gap (12 h). Detection = classified ÷ truth episodes.
   */
  encounter: EncounterAccuracy;
  /** Hunt classifier: hunts detected by a team ÷ hunts by followed communities (truth). */
  hunt: { detected: number; truth: number };
}

export interface EncounterAccuracy { recall: number; recallAll: number; precision: number; followedTruth: number; observableTruth: number; classified: number; truthEpisodes: number }

export interface FieldResult {
  seed: number; days: number; profile: ProfileName; hash: string;
  wallMs: number; simMs: number; observerMs: number; experimentMs: number; metricsMs: number;
  values: Record<string, SeedValue>;
  s18: Record<string, S18Value>;
  accuracy: Accuracy;
  /** The encounter classifier on the party follows that score T-IGE-1 (C7a review; kept outside `accuracy`, whose shape other runners reproduce). */
  encounterParty?: EncounterAccuracy;
  counts: Record<string, number>;
}

export function runFieldJob(job: FieldJob, keepRecords = false): FieldResult & { records?: Records } {
  const t0 = performance.now();
  const world = createWorld(job.seed, { profile: job.profile, params: job.params ?? {} });
  for (let i = 0, n = Math.round((job.burnInDays ?? 0) * 5760); i < n; i++) tickWorld(world);
  const obs = createObserver(world, { ...job.observer, seed: job.observerSeed ?? 1, profile: PROFILES[job.profile], truth: job.truth ?? true, demography: !!job.demography });
  // further team sets on party follows for the targets whose source followed parties (config.ts TARGET_FOLLOW): the
  // larger subgroup (2-min points suffice for party size and encounters), and male parties at 1-min points (listening
  // stops of 2–5 min must be resolved by the patrol classifier)
  const pobs = createObserver(world, { ...job.observer, seed: (job.observerSeed ?? 1) + 7919, profile: PROFILES[job.profile], truth: job.truth ?? true, followMode: 'party-larger', lite: true, pointIntervalMin: 2 });
  const mobs = createObserver(world, { ...job.observer, seed: (job.observerSeed ?? 1) + 2 * 7919, profile: PROFILES[job.profile], truth: job.truth ?? true, followMode: 'party-males', lite: true, pointIntervalMin: 1 });
  const trials = trialRng(job.observerSeed ?? 1);
  const every = job.experimentEveryDays ?? 30;
  const ticks = Math.round(job.days * 5760);
  let simMs = 0, obsMs = 0, expMs = 0, prevHour = world.hour;
  for (let i = 0; i < ticks; i++) {
    const a = performance.now();
    tickWorld(world);
    const b = performance.now();
    observerStep(obs, world);
    if (!job.demography) { observerStep(pobs, world); observerStep(mobs, world); }
    const c = performance.now();
    simMs += b - a; obsMs += c - b;
    // field experiments at 10:00 on every `every`-th day, on copies of the world
    if (every > 0 && prevHour < 10 && world.hour >= 10 && world.day % every === 10 % every) {
      obs.rec.experiments.push(...runTrials(world, 'playback', trials, obs.cfg.profile.approachM), ...runTrials(world, 'snake', trials, obs.cfg.profile.approachM));
      expMs += performance.now() - c;
    }
    prevHour = world.hour;
  }
  const rec = finishObserver(obs, world), prec = finishObserver(pobs, world), mrec = finishObserver(mobs, world);
  const m0 = performance.now();
  const d = derive(rec), pd = derive(prec), md = derive(mrec);
  const values: Record<string, SeedValue> = {};
  for (const m of METRICS) if (m.compute && (!m.sealed || job.unseal)) { const mode = TARGET_FOLLOW[m.id]; values[m.id] = m.compute(mode === 'party-larger' ? pd : mode === 'party-males' ? md : d); }
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
  const out: FieldResult & { records?: Records } = { seed: job.seed, days: job.days, profile: job.profile, hash: `${recordsHash(rec)}/${recordsHash(prec)}/${recordsHash(mrec)}`, wallMs: performance.now() - t0, simMs, observerMs: obsMs, experimentMs: expMs, metricsMs,
    values, s18, accuracy, encounterParty: encounterAccuracy(prec), counts };
  if (keepRecords) out.records = rec;
  return out;
}

export function accuracyOf(rec: Records, d: ReturnType<typeof derive>): Accuracy {
  const k = CATEGORIES.length, obs = new Array(k).fill(0), tru = new Array(k).fill(0);
  let samples = 0, ticks = 0;
  rec.follows.forEach((f, fi) => {
    for (const i of d.followPts[fi]) { const c = rec.points.cat.data[i]; if (c < k) { obs[c]++; samples++; } }
    for (let c = 0; c < k; c++) { tru[c] += f.truthTicks[c]; ticks += f.truthTicks[c]; }
  });
  const o = obs.map(v => (samples ? v / samples : NaN)), t = tru.map(v => (ticks ? v / ticks : NaN));
  return {
    activity: { observed: o, truth: t, maxAbsDiff: Math.max(...o.map((v, i) => Math.abs(v - t[i]))), samples, ticks },
    patrol: patrolAccuracy(rec, d.followPts, d.patrols),
    encounter: encounterAccuracy(rec),
    hunt: { detected: rec.hunts.filter(h => h.detected).length, truth: rec.truth.hunts },
  };
}

/** Encounter classifier vs truth on one team set's records (see Accuracy.encounter). */
export function encounterAccuracy(rec: Records): EncounterAccuracy {
  const H = 1, gap = 12, E = rec.encounters, T = rec.truth;
  const hit = (f: { team: number; other: number; t: number }) => E.some(e => e.team === f.team && e.other === f.other && e.t0 - H <= f.t && f.t <= e.t1 + H);
  const all = T.followedEncounters, observable = all.filter(f => !f.caller);
  const real = E.filter(e => T.encounterLog.some(l => ((l.a === e.troop && l.b === e.other) || (l.b === e.troop && l.a === e.other)) && l.t >= e.t0 - gap && l.t <= e.t1 + gap)).length;
  return { recall: observable.length ? observable.filter(hit).length / observable.length : NaN, recallAll: all.length ? all.filter(hit).length / all.length : NaN, precision: E.length ? real / E.length : NaN,
    followedTruth: all.length, observableTruth: observable.length, classified: E.length, truthEpisodes: T.encounterLog.length };
}
