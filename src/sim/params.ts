import type { World } from '../types';
import { DEFAULTS, HARD_RANGES, INTEGER_IDS, PROFILE_VALUES, REGISTRY_HASH, type ParamId } from './params.gen';

// The parameter registry at run time (docs/realism-design.md §4.3). data/params.json is the source; params.gen.ts is
// generated from it. A world stores only its profile and override set (world.sim.params, small plain data); the
// resolved object is derived and cached per world, like index(). Reading a parameter never touches world.rng.

export type { ParamId } from './params.gen';
export { DEFAULTS, REGISTRY_HASH } from './params.gen';
export type Profile = 'compressed' | 'field';
export type Overrides = Partial<Record<ParamId, number>>;

/** Stored in world.sim.params: the registry hash the world was created with, its profile and its overrides. */
export interface ParamSettings { registry: string; profile: Profile; overrides: Overrides }

/** Values computed once from parameters (module-level constants before the registry). */
interface Derived {
  tickHours: number; slowHours: number;
  /** Daily tension decay factor from the half-life. */
  tensionDailyDecay: number;
  /** Share of tension removed per tick of grooming contact. */
  groomTensionPerTick: number;
  /** Ecological hours in a memory month. */
  monthHours: number;
}
export type Params = Readonly<Record<ParamId, number>> & Readonly<Derived>;

const INTEGERS = new Set<string>(INTEGER_IDS);

/** Throws for an unknown id, a non-finite value, a value outside the hard range, or a fraction where a whole number is required. */
export function checkOverrides(overrides: Record<string, unknown>): void {
  for (const [id, v] of Object.entries(overrides)) {
    if (!Object.hasOwn(DEFAULTS, id)) throw new RangeError(`Unknown parameter "${id}"`);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new RangeError(`Parameter ${id} must be a finite number`);
    const [lo, hi] = HARD_RANGES[id as ParamId];
    if (v < lo || v > hi) throw new RangeError(`Parameter ${id} = ${v} is outside its hard range [${lo}, ${hi}]`);
    if (INTEGERS.has(id) && !Number.isInteger(v)) throw new RangeError(`Parameter ${id} must be a whole number`);
  }
}

/** Defaults, then the profile's values, then overrides, plus derived values. Frozen, with a fixed shape. */
export function resolveParams(profile: Profile = 'compressed', overrides: Overrides = {}): Params {
  if (profile !== 'compressed' && profile !== 'field') throw new RangeError(`Unknown profile "${String(profile)}"`);
  checkOverrides(overrides);
  const base: Record<string, number> = { ...DEFAULTS, ...PROFILE_VALUES[profile], ...overrides };
  const tickHours = base.tickSeconds / 3600;
  const derived: Derived = {
    tickHours, slowHours: base.slowEveryTicks * tickHours,
    tensionDailyDecay: Math.pow(0.5, 1 / base.tensionHalfLifeDays),
    groomTensionPerTick: 1 - Math.exp(-base.groomTensionRepairPerH * tickHours),
    monthHours: base.memoryMonthDays * 24,
  };
  return Object.freeze({ ...base, ...derived }) as Params;
}

export const DEFAULT_PARAMS: Params = resolveParams();

export function defaultSettings(): ParamSettings { return { registry: REGISTRY_HASH, profile: 'compressed', overrides: {} }; }

// Resolved objects per world. The last-world fast path matters: paramsOf runs in every hot function.
const cache = new WeakMap<World, Params>();
let lastWorld: World | null = null, lastParams: Params = DEFAULT_PARAMS;

/** The resolved parameters of a world (fixed at creation; overrides are not meant to change afterwards). */
export function paramsOf(world: World): Params {
  if (world === lastWorld) return lastParams;
  let p = cache.get(world);
  if (!p) {
    const s = (world as World & { sim?: { params?: ParamSettings } }).sim?.params;
    p = !s || (s.profile === 'compressed' && Object.keys(s.overrides).length === 0) ? DEFAULT_PARAMS : resolveParams(s.profile, s.overrides);
    cache.set(world, p);
  }
  lastWorld = world; lastParams = p;
  return p;
}

/** Test aid: record every parameter id this world reads from now on into `into`. Slows reads; the app never calls it. */
export function traceParamReads(world: World, into: Set<string>): void {
  const traced = new Proxy(paramsOf(world), { get: (t, k) => { if (typeof k === 'string') into.add(k); return Reflect.get(t, k); } });
  cache.set(world, traced); lastWorld = world; lastParams = traced;
}
