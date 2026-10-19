// Public simulation API. The world model lives in src/sim/*; this file only re-exports (and holds one read-only
// reader, bodyStateOf). Reference: docs/simulation.md.
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

import type { BodyPercept, Chimp, World } from './types';
import { bodyPercept } from './sim/observe-state';
import { paramsOf } from './sim/params';
/**
 * Read-only (stage W8, for the renderer and the interface): a living animal's Track E body state as the contract's
 * BodyPercept (src/types.ts), the same record observe() puts in a decision packet at observeState 1: gut fill, body
 * reserves, sleep pressure and felt sleepiness, competitive and fast arousal, each field only while its mechanism
 * runs. For readers that may not open chimp.sim: the renderer draws these on the body (src/render/creatures/
 * bodystate.ts). Returns null for a dead animal and when none of those mechanisms runs (the default parameters), where
 * the public fields are all there is.
 * Nothing is stored for it: no key is added to Chimp or to the save layout, and the simulation never calls it, so no
 * world hash can move. Pure: no world.rng, nothing written, no books opened. It allocates the record it returns, so
 * a per-frame reader should call it about once a second per animal, not every frame.
 */
export function bodyStateOf(world: World, c: Chimp): BodyPercept | null {
  if (!c.alive) return null;
  const P = paramsOf(world);
  return P.energyLedger === 1 || P.rhythmSleep === 1 || P.endoStates === 1 ? bodyPercept(world, c, P) : null;
}

/**
 * Read-only (stage V1, for the page "How close to the wild", docs/staging/v1-field.md): which model a world runs, in
 * the terms a comparison must name. The map profile, the parameter overrides the world was created with (a fresh copy;
 * empty for today's default model), whether the Track E ledgers run, where patrols come from (patrolValue 0: the
 * patrol hazard, tuned against T-PAT-1; 2 or more: the males' own decision), and the life-history clock (ageRate 1 is
 * natural aging). Nothing is stored for it and the simulation never calls it. Pure: no world.rng, nothing written.
 */
export function modelIdentityOf(world: World): {
  profile: 'compressed' | 'field'; overrides: Record<string, number>; registry: string | null;
  energyLedger: boolean; nursing: boolean; water: boolean; patrols: 'hazard' | 'decision'; ageRate: number;
  /** The population cap (a design limit); fertility rows leave out days at or above 90% of it. */
  popCap: number;
  /** Stage ED's bodies (deadBody 1): a dead animal's position is then where its body ended up, not where it died. */
  bodiesMove: boolean;
} {
  const s = (world as World & { sim?: { params?: { registry?: string; profile?: string; overrides?: Record<string, number> } } }).sim?.params;
  const P = paramsOf(world);
  return {
    profile: world.size > 1000 ? 'field' : 'compressed',
    overrides: { ...(s?.overrides ?? {}) },
    registry: s?.registry ?? null,
    energyLedger: P.energyLedger === 1, nursing: P.ledgerNurseBout === 1, water: P.waterLedger === 1,
    patrols: P.patrolValue >= 2 ? 'decision' : 'hazard',
    ageRate: world.ageRate, popCap: P.popCap, bodiesMove: P.deadBody === 1,
  };
}
