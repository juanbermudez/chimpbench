import type { World } from '../types';

/** xorshift32 on world.rng; the only source of randomness in the simulation. */
export function random(world: World): number {
  let x = world.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  world.rng = x >>> 0;
  return world.rng / 4294967296;
}

export function mixSeed(seed: number): number {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) || 0x6d2b79f5;
}

/** Stateless integer hash to [0, 1). Used where variety must not consume world.rng (pure rule choice, layout offsets). */
export function hash01(a: number, b: number, c: number, d = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1) ^ Math.imul(d | 0, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export function clamp(v: number, min = 0, max = 1): number { return v < min ? min : v > max ? max : v; }

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export function pick<T>(world: World, list: readonly T[]): T { return list[Math.floor(random(world) * list.length) % list.length]; }
