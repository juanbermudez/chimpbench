import type { SimEvent, World } from '../types';

// The chimp panel's Log tab (pure, no DOM): the field log filtered to one animal.

export const CHIMP_LOG_MAX = 60;

/** Field-log entries that name this animal, newest first (the log keeps a recent window of the whole forest). */
export function chimpEvents(world: World, id: number, max = CHIMP_LOG_MAX): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = world.events.length - 1; i >= 0 && out.length < max; i--) if (world.events[i].actors?.includes(id)) out.push(world.events[i]);
  return out;
}
