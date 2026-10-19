import workingBase from '../../docs/staging/integrator-kit/params/M6-W50.json';
import { R15_PACKET_VERSION } from '../kernel/resource-contract';
import type { Overrides, ParamSettings } from '../sim/params';
import { TICK_HOURS } from '../sim/state';
import { createWorld, tickWorld } from '../simulation';
import type { Chimp, DriveSpec, World } from '../types';

// The app mode "Model decides for every adult" (docs/staging/app-model-drives.md): stage R16's population-test unit,
// built in the app. A world in this mode is the field map on the working base with R15's path switched on from the first
// tick, settled by the rules for a number of days (R16: 30), then handed to the trained two-stage path for every living
// animal aged 8 or over, with R16's kernel-arm settings (the intention gate on, the rules' pick kept on the menu,
// lockstep). R16's own files are pinned by its chain (scripts/r16.py SOURCES) and are not edited from here: the numbers
// below are R16's, each held equal to its source by tests/app-model-drives.test.ts. Nothing in this file is read by a
// default world.

/** Animals this age or older are on the model (R16's MIN_AGE, scripts/lib/r10-run.ts). */
export const DRIVE_MIN_AGE = 8;
/** R16's burn-in under the rules, in simulated days (scripts/lib/r16-collect.ts R16.burnInDays). */
export const DRIVE_BURN_IN_DAYS = 30;
/** R16's watchdog on one call, ms (scripts/lib/r16-worker.ts OPS.callMs); in the app a call past it goes to the rules. */
export const DRIVE_CALL_MS = 30_000;
/** R15's path, from the first tick (R16's LOOP_SWITCHES and R15_SWITCHES, scripts/lib/r16-collect.ts). */
export const DRIVE_SWITCHES = { observeV4: 1, observeV5: 1, menuParity: 1, resourceTargets: 1, activityFirst: 2 } as const;
/** R16's kernel-arm settings, laid on the world after the burn-in (scripts/lib/r16-arms.ts kernelArmWorld). */
export const DRIVE_ARM = { kernelGate: 1, kernelNoRulesPick: 0 } as const;
/** R16's decode: one seeded draw per call at salt 1, epochs by act (scripts/r16-population.ts DECODE). */
export const DRIVE_DECODE: DriveSpec['decode'] = { mode: 'draw', salt: 1, hold: 'act' };
/** The name every result of the mode carries (the plan's names; scripts/r16-population.ts NAME, short and long). */
export const DRIVE_RESULT = 'rules-taught model on the R15 menu';
export const DRIVE_RESULT_LONG = 'rules-taught model on the R15 menu (the rules\' activity kinds, then the trees and waters the animal itself perceives or remembers; taught by the rules\' activity odds and their counterfactual valuation of those targets)';
/**
 * Seeds the mode refuses: those R16 never runs (spent, reserved by another stage or sealed: R16.refused) and R16's own
 * test worlds (its two population worlds and its two ten-animal worlds), which no viewing may open before R16 has run.
 */
export const DRIVE_REFUSED_SEEDS: readonly number[] = [3613, 4111, 4222, 3457, 3823, 4333, 4444, 3011, 3643, 3701, 3187, 3079, 3517];

/** Ticks in a simulated day (R16's DAY). */
export const DAY_TICKS = Math.round(24 / TICK_HOURS);

/** The parameters a world in the mode is created with: the working base and R15's path. */
export function driveParams(): Overrides {
  return { ...(workingBase as Overrides), ...DRIVE_SWITCHES };
}

/** Why the mode will not open a world on this seed, or ''. */
export function driveSeedRefusal(seed: number): string {
  return DRIVE_REFUSED_SEEDS.includes(seed) ? `Seed ${seed} is held by a registered stage (R16's sealed, reserved or test worlds); choose another seed for this mode.` : '';
}

/** A new world on the mode's parameters, before any burn-in (R16's burnIn with its switches, at day 0). */
export function driveBase(seed: number): World {
  return createWorld(seed, { profile: 'field', params: driveParams() });
}

/** The rules' burn-in, a simulated hour at a time: yields the share done. All animals are on the rules while it runs. */
export function* burnIn(world: World, days: number): Generator<number, void, void> {
  const n = days * DAY_TICKS;
  for (let i = 0; i < n; i++) {
    tickWorld(world);
    if ((i + 1) % 240 === 0 || i + 1 === n) yield (i + 1) / n;
  }
}

/**
 * The world handed to the model: a copy of the settled world with R16's kernel-arm settings (the copy matters: a world's
 * parameters are resolved once and cached by object), lockstep, and the mode's record. R16 also salts the world's random
 * stream by its arm's salt; its model arms use salt 0, which leaves it unchanged.
 */
export function armDriveWorld(base: World, burnInDays: number): World {
  const w = structuredClone(base), settings = (w as unknown as { sim: { params: ParamSettings } }).sim.params;
  settings.overrides = { ...settings.overrides, ...DRIVE_ARM };
  const drive: DriveSpec = { who: 'adults', minAge: DRIVE_MIN_AGE, contract: R15_PACKET_VERSION, burnInDays, decode: { ...DRIVE_DECODE }, adapter: null };
  w.modelPolicy = { ...w.modelPolicy, mode: 'lockstep', drive };
  return w;
}

/** The whole world at once (tests and scripts; the app runs the burn-in in slices). */
export function createDriveWorld(seed: number, burnInDays = DRIVE_BURN_IN_DAYS): World {
  const base = driveBase(seed);
  for (const _ of burnIn(base, burnInDays)) { /* the burn-in runs */ }
  return armDriveWorld(base, burnInDays);
}

export const isDriveWorld = (w: World): boolean => w.modelPolicy.drive !== undefined;
/** On the model in the mode: alive and aged `minAge` or over (R16's isDriven16). */
export const isDrivenAdult = (c: Chimp, minAge = DRIVE_MIN_AGE): boolean => c.alive && c.age >= minAge;

/** Membership, taken again before every tick as R16's day runner does: every animal's controller from its age. */
export function setMembership(world: World, minAge = world.modelPolicy.drive?.minAge ?? DRIVE_MIN_AGE): void {
  for (const c of world.chimps) c.controller = isDrivenAdult(c, minAge) ? 'model' : 'rules';
}

/** The ids on the model now, in world order. */
export function drivenIds(world: World, minAge = world.modelPolicy.drive?.minAge ?? DRIVE_MIN_AGE): number[] {
  return world.chimps.filter(c => isDrivenAdult(c, minAge)).map(c => c.id);
}

/** What the server says it serves (src/providers ProviderStatus, narrowed). */
export interface Serving { ready: boolean; phase: string; error?: string; identity?: { adapter: string; sha256: string; packetVersion: string } }

/**
 * Why this world may not play now, or '' when it may: the mode refuses to run without a verified adapter of its own
 * contract, and a world bound to an adapter plays only with that adapter (name, weights hash and packet version).
 */
export function driveArmProblem(spec: DriveSpec, s: Serving): string {
  if (!s.ready) return `No verified adapter is ready on this server${s.error ? `: ${s.error}` : ` (${s.phase || 'not started'})`}. Start it in the model panel (M); the model decides for every adult only with verified weights.`;
  const id = s.identity;
  if (!id) return 'The server did not say which adapter it loaded, so nothing is played.';
  if (id.packetVersion !== spec.contract) return `The adapter ${id.adapter} serves the contract ${id.packetVersion}; this world's menu is ${spec.contract}.`;
  const b = spec.adapter;
  if (b && (b.adapter !== id.adapter || b.sha256 !== id.sha256 || b.packetVersion !== id.packetVersion))
    return `This world was saved with the adapter ${b.adapter} (weights ${b.sha256.slice(0, 12)}); the server now serves ${id.adapter} (weights ${id.sha256.slice(0, 12)}). It plays only with the adapter it was saved with.`;
  return '';
}
