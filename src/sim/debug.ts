import type { Chimp, World } from '../types';
import { paramsOf } from './params';
import { markAliveChanged, simOf } from './state';

/**
 * Stress-test helper for benchmarks and the browser profiler (?pop=N): clones living individuals, offset a few
 * metres, until `target` are alive (capped at the world's popCap). Not part of the model; never called by default.
 * Deterministic (no rng), so a seed plus target still gives one world.
 */
export function growPopulation(world: World, target: number): void {
  const s = simOf(world);
  const want = Math.min(paramsOf(world).popCap, Math.max(0, Math.floor(target)));
  const base = world.chimps.filter(c => c.alive);
  let alive = base.length, k = 0;
  if (!base.length) return;
  while (alive < want) {
    const src = base[k++ % base.length];
    const c = structuredClone(src) as Chimp;
    c.id = s.nextChimpId++; c.name = `${src.name} ${c.id}`;
    c.position = [src.position[0] + ((k * 7) % 11) - 5, src.position[1], src.position[2] + ((k * 3) % 9) - 4];
    world.chimps.push(c);
    alive++;
  }
  markAliveChanged(world);
}
