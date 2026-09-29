// Public simulation API. The world model lives in src/sim/*; this file only re-exports. Reference: docs/simulation.md.
// Conventions: world.time is ecological hours since 06:30 EAT on 28 September (day-of-year 271);
// +x = east, -z = north, y = height above local ground; sunAzimuth is clockwise from north.
// Ids: chimps < 100000, trees 100001+, water 200001+, prey 300001+, interactions/calls/stimuli 1,000,000+.
export { TICK_SECONDS } from './sim/state';
export { createWorld } from './sim/generation';
export type { Overrides, ParamId, Profile } from './sim/params';
export { tickWorld, stepWorld } from './sim/tick';
export { getEligibleActions, rulesChoice } from './sim/candidates';
export { applyDecision, resolveByRules } from './sim/decide';
export { observe } from './sim/observe';
export { applyIntervention } from './sim/interventions';
export { lifeStage, relationOf } from './sim/hierarchy';
export { relationshipOf } from './sim/relations';
