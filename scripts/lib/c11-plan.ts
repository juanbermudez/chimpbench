// C11 constants fixed by the pre-registration (docs/realism-design.md "C11 pre-registration", 29 September 2026).
// Changing any of them after the C11 freeze is a logged protocol change.
import type { StatRules } from './calib';

/** Reserved seed sets, never run before C11 (AGENTS.md reserved list). */
export const SEED_SETS = {
  C: Array.from({ length: 20 }, (_, i) => 7001 + i),
  V1: [8101, 8202, 8303, 8404, 8505],
  V2: [8606, 8707, 8808, 8909, 9010],
  V3: [9101, 9202, 9303, 9404, 9505],
} as const;

/** Plumbing-only seeds for `--smoke` (outside every reserved and development set). */
export const SMOKE_SEEDS = [9901, 9902, 9903, 9904, 9905];

/** The seeds each step may use (§2). */
export const STEP_SEEDS: Record<string, readonly number[]> = {
  noise: SEED_SETS.C, morris: SEED_SETS.C.slice(0, 2), oat: SEED_SETS.C.slice(0, 2), hm: SEED_SETS.C.slice(0, 5), confirm: SEED_SETS.C.slice(0, 5),
  validate: SEED_SETS.V1, scenario: SEED_SETS.V2, demography: SEED_SETS.V3,
};

/** Throws unless `seeds` are exactly the step's pre-registered seeds (or, in a smoke run, smoke seeds only). */
export function assertSeeds(step: string, seeds: readonly number[], smoke: boolean): void {
  if (smoke) {
    if (!seeds.every(s => SMOKE_SEEDS.includes(s))) throw new Error(`smoke run of ${step} may use only smoke seeds ${SMOKE_SEEDS.join(', ')}`);
    return;
  }
  const want = STEP_SEEDS[step];
  if (!want) throw new Error(`no seed set for step ${step}`);
  if (seeds.length !== want.length || seeds.some((s, i) => s !== want[i])) throw new Error(`step ${step} must run on seeds ${want.join(', ')} (got ${seeds.join(', ')})`);
}

/** Statistic rules (§1). */
export const C11_RULES: StatRules = {
  fixedByConstruction: ['T-FOOD-1', 'T-COM-5'],
  hunting: ['T-HUN-1', 'T-HUN-2', 'T-HUN-3', 'T-HUN-7'],
  discFrac: 0.1, discFracHunting: 0.25,
  demography: id => id.startsWith('T-DEM-'),
};

/** Budget (§3, §7); `shrink` applies the pre-registered order: r = 12, then a smaller third wave, then step 5b last. */
export const PLAN = {
  burnInDays: 180,
  noise: { years: 1 },
  morris: { r: 16, candidates: 500, levels: 4, years: 1, bootstrap: 1000, freezeFrac: 0.05, oatTop: 5, oatLevels: 7 },
  waves: { points: [200, 200, 200], years: 2, cut: 3, second: 2.5, third: 2.0, looZ: 2, looShare: 0.9, candidates: 20000, maxBatches: 50, maxExtra: 2 },
  abc: { draws: 100000, keep: 0.01 },
  confirm: { draws: 100, ksP: 0.05 },
  sobol: { N: 8192 },
  validate: { draws: 50, years: 1 },
  demography: { points: 12, years: 40, draws: 10 },
};
