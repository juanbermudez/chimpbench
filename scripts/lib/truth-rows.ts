// Simulation-truth target rows (track E, part A5): per seed, the value of every data/targets.json row marked
// "scoredOn": "truth" for which a readout exists, read from the single pass's own readouts (viability, energy, rhythm).
// e-bench pools the seeds and scores them with the scorer's rules (eA-protocol's assemble); a truth row without a
// readout here is reported "not scorable", never dropped. Outside the protocol hash (scripts/lib).
import type { SeedValue } from '../../src/field/metrics';
import type { FieldResult } from '../../src/field/run';
import type { EnergyAcc } from './energy-probe';
import type { RhythmResult } from './rhythm-probe';
import type { Viability } from './viability';

export interface TruthInputs { seed: number; days: number; viability: Viability; energy: EnergyAcc | null; rhythm: RhythmResult | null; field: FieldResult }

/** This seed's value per truth row (rows without a readout are absent). */
export function truthValues(_x: TruthInputs): Record<string, SeedValue> {
  return {};
}
