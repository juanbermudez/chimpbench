import workingBase from '../docs/staging/integrator-kit/params/M6-W50.json';
import { createWorld } from './simulation';
import type { World } from './types';

/** Explicit unsaved development world; the normal app never calls this path. */
export function createR15Demo(): World {
  const world = createWorld(48, { profile: 'field', params: { ...workingBase,
    observeV4: 1, observeV5: 1, menuParity: 1, activityFirst: 2, resourceTargets: 1, kernelGate: 1 } });
  world.modelPolicy.mode = 'lockstep';
  return world;
}
export function r15FocalIds(world: World): number[] {
  return world.chimps.filter(c => c.alive && c.age >= 8).slice(0, 5).map(c => c.id);
}
