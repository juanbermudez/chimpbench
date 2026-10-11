// Stage R7 (docs/staging/r7-prereg.md §5): the short scorecard's 15 rows read by the existing observer code on a world
// that is being ticked by someone else (a control arm here; an engine arm or a replay later).
//
// Unit P (a population): the loop of scripts/lib/bench-run.ts composed from the same exported pieces: the virtual
// observer's focal-follow team set and the truth readouts (truth-rows.ts with the rhythm and energy probes). No
// party-follow team set and no field experiment: none of the 15 rows reads one.
// Unit F (a focal group): the observer and the probes are frozen and take no list of animals, so each is handed a
// read-only view of the world: an observer per focal adult on a view that lists only the focal community, its rotation
// set to that one animal; the rhythm and truth probes on a view whose animals are the focal animals.
// Nothing here writes the world. Outside the protocol hash; it edits nothing under src/field.
import { PROFILES } from '../../src/field/config';
import { derive } from '../../src/field/derive';
import { METRICS, type MetricDef, type SeedValue } from '../../src/field/metrics';
import { createObserver, finishObserver, observerStep, type Observer } from '../../src/field/observer';
import { dayStep } from '../../src/field/protocols';
import { pool } from '../../src/field/targets';
import { index } from '../../src/sim/state';
import type { World } from '../../src/types';
import { energyAfter, energyBefore, energyFinish, energyStart, energyTapsOff, energyTapsOn, newEnergyAcc, type EnergyAcc, type EnergySeedState } from './energy-probe';
import { rhythmFinish, rhythmStart, rhythmStep, type RhythmState } from './rhythm-probe';
import { truthHooksOff, truthHooksOn, truthStart, truthStep, truthValues, type TruthState } from './truth-rows';

/** The 15 rows of the short scorecard (the review of 10 October 2026, understand-targets_and_wild_data §4), in its order. */
export const SHORT_ROWS = ['T-ACT-1', 'T-ACT-4', 'T-ACT-2', 'T-ACT-3', 'T-RNG-4', 'T-FOOD-2', 'T-ENE-3', 'T-RHY-1', 'T-RHY-4', 'T-RHY-5', 'T-RHY-6', 'T-COM-1', 'T-SOC-14', 'T-SOC-10', 'T-SOC-6'] as const;
/** Read by the virtual observer (src/field/metrics.ts METRICS); the others are simulation-truth rows (scripts/lib/truth-rows.ts). */
export const OBSERVER_ROWS = ['T-ACT-1', 'T-ACT-4', 'T-ACT-2', 'T-ACT-3', 'T-RNG-4', 'T-FOOD-2', 'T-COM-1', 'T-SOC-10', 'T-SOC-6'] as const;
export const TRUTH_ROWS = ['T-ENE-3', 'T-RHY-1', 'T-RHY-4', 'T-RHY-5', 'T-RHY-6', 'T-SOC-14'] as const;
/** Community rows: read at unit P only. */
export const POPULATION_ONLY = ['T-SOC-14', 'T-SOC-10', 'T-SOC-6'] as const;
/** The observer profile of a world (the field map is the one over a kilometre: AGENTS.md, Field profile). */
const profileOf = (w: World) => PROFILES[w.size > 1000 ? 'field' : 'compressed'];
const defOf = (id: string): MetricDef => { const m = METRICS.find(x => x.id === id); if (!m || !m.compute) throw new Error(`no observer metric for ${id}`); return m; };

/** Pools one row over seeds (or over focal animals) as the row's own scorer does: a custom or ratio pool where the metric names one, Σ num ÷ Σ den for a truth row whose readouts carry them, else the mean. */
export function poolRow(id: string, values: SeedValue[]): SeedValue {
  if ((OBSERVER_ROWS as readonly string[]).includes(id)) return pool(defOf(id), values);
  const ratio = values.length > 0 && values.every(s => s.num !== undefined && s.den !== undefined);
  return pool({ id, protocol: 'simulation truth', pool: ratio ? 'ratio' : 'mean' }, values);
}

// ---------------------------------------------------------------------------------------------------------------------
// Unit P
// ---------------------------------------------------------------------------------------------------------------------

export interface PopReader { obs: Observer; en: EnergySeedState; acc: EnergyAcc; rh: RhythmState; tr: TruthState; seed: number; days: number; i: number }
/** Starts the observer and the truth readouts on the world as it stands (the end of the burn-in). Connects the module-level taps: one world at a time. */
export function popStart(w: World, seed: number, days: number, observerSeed = 1): PopReader {
  const obs = createObserver(w, { seed: observerSeed, profile: profileOf(w), truth: true, demography: false });
  const acc = newEnergyAcc(), en = energyStart(w, acc, seed, days, {});
  const rh = rhythmStart(w, seed), tr = truthStart(w);
  energyTapsOn(en, acc, w); truthHooksOn(tr, w);
  return { obs, en, acc, rh, tr, seed, days, i: 0 };
}
/** Before tickWorld (the energy readout's own step). */
export function popBefore(r: PopReader, w: World): void { energyBefore(r.en, w, r.i); }
/** After tickWorld, in bench-run's order. */
export function popAfter(r: PopReader, w: World): void {
  observerStep(r.obs, w);
  truthStep(r.tr, w, r.en.milkTick);
  energyAfter(r.en, r.acc, w, r.i);
  rhythmStep(r.rh, w, r.i);
  r.i++;
}
/** Disconnects the taps (always call, also after an error). */
export function popStop(): void { energyTapsOff(); truthHooksOff(); }
/** The 15 rows' values for this seed, and what the observer collected. */
export function popFinish(r: PopReader, w: World, params: Record<string, number>): { rows: Record<string, SeedValue>; counts: Record<string, number> } {
  popStop();
  energyFinish(r.en, r.acc, w);
  const rhythm = rhythmFinish(r.rh, w), rec = finishObserver(r.obs, w), d = derive(rec);
  const rows: Record<string, SeedValue> = {};
  for (const id of OBSERVER_ROWS) rows[id] = defOf(id).compute!(d);
  const truth = truthValues({ seed: r.seed, days: r.days, viability: null as never, energy: r.acc, rhythm, rhythmState: r.rh, field: null as never, truth: r.tr, params });
  for (const id of TRUTH_ROWS) if (truth[id]) rows[id] = truth[id];
  return { rows, counts: { follows: rec.follows.length, completeFollows: rec.follows.filter(f => f.complete).length, lostFollows: rec.follows.filter(f => f.lost).length, points: rec.points.t.n, conflicts: rec.conflicts.length, detectedConflicts: rec.conflicts.filter(c => c.detected).length, calls: rec.calls.length } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Unit F
// ---------------------------------------------------------------------------------------------------------------------

/** A read-only view of the world whose animal list holds only `ids` (the same animal objects); everything else is the world's. */
export function animalsView(w: World, ids: Set<number>): World {
  let src: unknown = null, len = -1, list: World['chimps'] = [];
  return Object.create(w, { chimps: { get() { if (w.chimps !== src || w.chimps.length !== len) { src = w.chimps; len = w.chimps.length; list = w.chimps.filter(c => ids.has(c.id)); } return list; } } }) as World;
}
/** A read-only view of the world that lists only one community (the same object); the animals are all there. */
export function communityView(w: World, troopId: number): World {
  let src: unknown = null, len = -1, list: World['troops'] = [];
  return Object.create(w, { troops: { get() { if (w.troops !== src || w.troops.length !== len) { src = w.troops; len = w.troops.length; list = w.troops.filter(t => t.id === troopId); } return list; } } }) as World;
}

export interface FocalReader {
  /** One observer per focal adult (the observer follows adults of 15 and over), each on its community view. */
  obs: { id: number; view: World; o: Observer }[];
  view: World; rh: RhythmState; tr: TruthState; seed: number; days: number; i: number; ids: number[];
}
export function focalStart(w: World, seed: number, days: number, focalIds: number[]): FocalReader {
  const byId = index(w).byId, obs: FocalReader['obs'] = [];
  for (const id of focalIds) {
    const c = byId.get(id);
    if (!c || !c.alive || c.age < 15) continue;
    const view = communityView(w, c.troopId);
    // the observer's own protocol; only the rotation is set: this animal, every day (rotationBlockDays keeps it from being redrawn)
    const o = createObserver(view, { seed: 1000 + id, profile: profileOf(w), truth: true, demography: false, rotationBlockDays: 1e9 });
    const tm = o.teams[0];
    tm.rotation = [id]; tm.rotIdx = 0; tm.blockStart = w.day;
    dayStep(o, view, true);
    if (o.teams.length !== 1 || tm.focal !== id) throw new Error(`the observer did not take focal ${id} (teams ${o.teams.length}, focal ${tm.focal})`);
    obs.push({ id, view, o });
  }
  const view = animalsView(w, new Set(focalIds));
  return { obs, view, rh: rhythmStart(view, seed), tr: truthStart(view), seed, days, i: 0, ids: focalIds };
}
/** After tickWorld. */
export function focalAfter(r: FocalReader, w: World): void {
  for (const x of r.obs) observerStep(x.o, x.view);
  truthStep(r.tr, r.view);
  rhythmStep(r.rh, r.view, r.i);
  r.i++;
}
/**
 * Per focal adult, the observer rows' values from its own records (one individual each); the truth rows T-RHY-1, -4, -5
 * and -6 from the probes on the focal animals. T-ENE-3 at this unit is read by the timing card (the ledger's dry
 * matter per day of the lactating focal female); the three community rows are read at unit P.
 */
export function focalFinish(r: FocalReader, params: Record<string, number>): { perAnimal: Record<number, Record<string, SeedValue>>; truth: Record<string, SeedValue>; follows: Record<number, { follows: number; complete: number; lost: number; hours: number; focalOk: boolean }> } {
  const perAnimal: Record<number, Record<string, SeedValue>> = {}, follows: Record<number, { follows: number; complete: number; lost: number; hours: number; focalOk: boolean }> = {};
  for (const x of r.obs) {
    const rec = finishObserver(x.o, x.view), d = derive(rec), rows: Record<string, SeedValue> = {};
    for (const id of OBSERVER_ROWS) if (!(POPULATION_ONLY as readonly string[]).includes(id)) rows[id] = defOf(id).compute!(d);
    perAnimal[x.id] = rows;
    follows[x.id] = { follows: rec.follows.length, complete: rec.follows.filter(f => f.complete).length, lost: rec.follows.filter(f => f.lost).length, hours: +rec.follows.reduce((s, f) => s + Math.max(0, f.end - f.start), 0).toFixed(2), focalOk: rec.follows.every(f => f.focal === x.id) };
  }
  const tv = truthValues({ seed: r.seed, days: r.days, viability: null as never, energy: null, rhythm: rhythmFinish(r.rh, r.view), rhythmState: r.rh, field: null as never, truth: r.tr, params });
  const truth: Record<string, SeedValue> = {};
  for (const id of ['T-RHY-1', 'T-RHY-4', 'T-RHY-5', 'T-RHY-6']) if (tv[id]) truth[id] = tv[id];
  return { perAnimal, truth, follows };
}
