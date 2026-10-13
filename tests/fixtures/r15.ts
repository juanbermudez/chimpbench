import { createWorld } from '../../src/simulation';
import { ix, START_HOUR } from '../../src/sim/state';
import type { Overrides } from '../../src/sim/params';

/** A local-knowledge fixture, without simulation burn-in or model calls. */
export function resourceFixture(extra: Overrides = {}) {
  const world = createWorld(48, { params: { resourceTargets: 1, activityFirst: 2, observeV5: 1, kernelGate: 1, ...extra } });
  const chimp = world.chimps.find(c => c.alive && c.age >= 15)!;
  chimp.action = 'rest'; chimp.targetId = -1; chimp.nest = null;
  chimp.hunger = 0.95; chimp.thirst = 0.9; chimp.energy = 0.8;
  world.time = 12 - START_HOUR; world.hour = 12; world.environment.daylight = 1;
  const x = ix(chimp);
  x.phase = 0; x.finished = false; x.seen = []; x.trees = world.trees.slice(0, 4).map(t => t.id);
  chimp.memory = [
    ...world.trees.slice(4, 22).map(t => ({ kind: 'tree' as const, entityId: t.id, seenAt: world.time, position: [...t.position] as [number, number, number] })),
    ...world.water.map(t => ({ kind: 'water' as const, entityId: t.id, seenAt: world.time, position: [...t.position] as [number, number, number] })),
  ];
  x.treeCrop = Object.fromEntries(world.trees.slice(4, 22).map(t => [t.id, 2]));
  return { world, chimp };
}
