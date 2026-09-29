// Golden-world hashing for the parameter registry (docs/realism-design.md §4.4). FNV-1a (32-bit, two lanes) over
// canonical JSON of the whole World: keys sorted, registry bookkeeping (world.sim.params) excluded so hashes recorded
// before the registry existed stay comparable. Derived caches live in WeakMaps and never appear in the World.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld, tickWorld } from '../../src/simulation';
import type { World } from '../../src/types';

export function canonical(value: unknown, path = ''): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(v => canonical(v, path)).join(',')}]`;
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec).filter(k => rec[k] !== undefined && !(path === 'sim' && k === 'params')).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(rec[k], path === '' ? k : `${path}.${k}`)}`).join(',')}}`;
}

export function fnv(text: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x01000193 + 2); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

export const worldHash = (w: World) => fnv(canonical(w));

/** The golden scenarios: seeds 48, 7, 21 after 2 eco-days at ageRate 1 and after 3 eco-days at ageRate 365. */
export const GOLDEN_CASES = [48, 7, 21].flatMap(seed => [{ seed, ageRate: 1, days: 2 }, { seed, ageRate: 365, days: 3 }]);
export const caseKey = (c: { seed: number; ageRate: number; days: number }) => `seed${c.seed}-rate${c.ageRate}-${c.days}d`;

export function runCase(c: { seed: number; ageRate: number; days: number }, make: (seed: number) => World = createWorld): World {
  const w = make(c.seed);
  w.ageRate = c.ageRate;
  for (let i = 0; i < c.days * 5760; i++) tickWorld(w);
  return w;
}

// `pnpm exec tsx tests/fixtures/golden.ts --record` rewrites golden-world.json. Only for an intended change of defaults.
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--record')) {
  const file = fileURLToPath(new URL('./golden-world.json', import.meta.url));
  const old = JSON.parse(readFileSync(file, 'utf8')) as { about: string };
  const hashes = Object.fromEntries(GOLDEN_CASES.map(c => [caseKey(c), worldHash(runCase(c))]));
  writeFileSync(file, JSON.stringify({ about: old.about, recorded: new Date().toISOString().slice(0, 10), hashes }, null, 1) + '\n');
  console.log(hashes);
}
