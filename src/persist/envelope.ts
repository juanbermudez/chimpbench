import type { World } from '../types';
import type { DecisionController, DecisionTrace, Roster } from '../decision';
import { newSimState, newX, OPTIONAL_SIM, OPTIONAL_X } from '../sim/state';
import { REGISTRY_HASH } from '../sim/params';

// The save envelope: everything a resumed run needs to continue exactly where it stopped (the whole World,
// including world.sim and chimp.sim, plus the decision loop's counters and recent traces, plus how the user was
// looking at it). Pure and DOM-free so Node tests can prove save → load → continue is deterministic.
// Design and measurements: docs/persistence.md.

/** Envelope layout version (owned here). */
export const SAVE_FORMAT = 1;
/** Keep in step with package.json (tests/persist-envelope.test.ts checks it). */
export const APP_VERSION = '0.2.0';
/**
 * Bump when simulation state keeps its keys but changes meaning or units. Key changes are caught automatically
 * by STATE_SHAPE. During the realism program a mismatch marks old saves incompatible; no migrations are written.
 */
export const STATE_VERSION = 1;
/** Traces kept in a snapshot (the live ring holds MAX_TRACES = 200); the newest are the ones worth resuming. */
export const SNAPSHOT_TRACES = 50;

export interface PersistedDecider {
  roster: Roster; agreement: { same: number; total: number };
  calls: number; applied: number; revalidated: number; discarded: number; fallbacks: number;
  traces: DecisionTrace[];
}
export interface PersistedSession {
  clock: { speedId: string; playing: boolean };
  /** UI-owned view state (selection, tab, view, layers…), opaque here; src/ui/app.ts captures and restores it. */
  ui: Record<string, unknown> | null;
}
export interface SaveEnvelope {
  format: number; app: string; stateVersion: number; stateShape: string; savedAt: number;
  world: World; decider: PersistedDecider; session: PersistedSession;
}
/** Just the version stamps, as stored in the database next to each snapshot. */
export type Stamp = Pick<SaveEnvelope, 'format' | 'stateVersion' | 'stateShape'>;

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/** Key structure of a plain value (arrays and scalars by type only), sorted so declaration order does not matter. */
function shape(v: unknown): string {
  if (Array.isArray(v)) return '[]';
  if (v !== null && typeof v === 'object') return `{${Object.keys(v).sort().map(k => `${k}:${shape((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return typeof v;
}
/** Fingerprint of the hidden simulation state layout (ChimpX and SimState defaults) plus STATE_VERSION. */
export const STATE_SHAPE = fnv(`${STATE_VERSION}|x${shape(newX())}|w${shape(newSimState())}`);

export type Compat = { ok: true } | { ok: false; reason: string };

/** Can this build continue a save with these stamps? */
export function compatibility(stamp: Stamp): Compat {
  if (stamp.format !== SAVE_FORMAT) return { ok: false, reason: `saved in format ${stamp.format}; this build reads format ${SAVE_FORMAT}` };
  if (stamp.stateVersion !== STATE_VERSION || stamp.stateShape !== STATE_SHAPE)
    return { ok: false, reason: `saved with an older simulation state layout (v${stamp.stateVersion}/${stamp.stateShape}); this build uses v${STATE_VERSION}/${STATE_SHAPE}` };
  return { ok: true };
}

/** A world's parameter registry (world.sim.params.registry, set at creation) against this build's. */
export interface ParamsChange { saved: string; current: string }

/**
 * Softer than a layout mismatch: the world still opens, but paramsOf() resolves today's registry defaults (plus the
 * world's own profile and overrides), so it would silently continue with other constants than it was created with.
 */
export function paramsChange(world: World): ParamsChange | null {
  const saved = (world as World & { sim?: { params?: { registry?: unknown } } }).sim?.params?.registry;
  const s = typeof saved === 'string' ? saved : '';
  return s === REGISTRY_HASH ? null : { saved: s, current: REGISTRY_HASH };
}
/** The change the user must decide on before this world may run: none, or one not yet accepted for this registry. */
export function needsParamsChoice(world: World, acceptedFor: string | null): ParamsChange | null {
  const c = paramsChange(world);
  return c && acceptedFor !== c.current ? c : null;
}
/** Label shown while such a world runs. */
export const paramsNote = (c: ParamsChange) => `Created with an older parameter set (${c.saved || 'unknown'}); running with the current defaults (${c.current}).`;

/** Structural check on the loaded world itself (also covers legacy exports that carry no stamp). */
export function worldShapeProblem(world: World): string {
  const w = world as World & { sim?: object };
  if (!w || !Array.isArray(w.chimps) || !Array.isArray(w.troops) || !Array.isArray(w.trees) || typeof w.tick !== 'number' || typeof w.rng !== 'number') return 'not a MGOGO world';
  if (!w.sim) return 'world has no simulation state (world.sim)';
  // keys that appear only once their mechanism fires (travel hoo, fission) are not part of the layout
  const keys = (o: object, optional: readonly string[]) => Object.keys(o).filter(k => !optional.includes(k)).sort().join(',');
  if (keys(w.sim, OPTIONAL_SIM) !== keys(newSimState(), OPTIONAL_SIM)) return 'world.sim layout differs from this build';
  const living = w.chimps.find(c => c.alive && (c as { sim?: object }).sim) as { sim: object } | undefined;
  if (living && keys(living.sim, OPTIONAL_X) !== keys(newX(), OPTIONAL_X)) return 'chimp.sim layout differs from this build';
  return '';
}

export function captureDecider(d: DecisionController, maxTraces = SNAPSHOT_TRACES): PersistedDecider {
  return { roster: d.roster, agreement: { ...d.agreement }, calls: d.calls, applied: d.applied, revalidated: d.revalidated,
    discarded: d.discarded, fallbacks: d.fallbacks, traces: d.traces.slice(-maxTraces) };
}

/**
 * Counters and traces back into a live controller. Restored trace ids get a per-save prefix: decision.ts numbers
 * new traces from 1 again after a reload, so an unprefixed id could collide with a restored one.
 */
export function restoreDecider(d: DecisionController, saved: PersistedDecider, savedAt: number): void {
  const prefix = `s${savedAt.toString(36)}:`;
  d.agreement = { same: saved.agreement?.same ?? 0, total: saved.agreement?.total ?? 0 };
  d.calls = saved.calls ?? 0; d.applied = saved.applied ?? 0; d.revalidated = saved.revalidated ?? 0;
  d.discarded = saved.discarded ?? 0; d.fallbacks = saved.fallbacks ?? 0;
  d.traces = (saved.traces ?? []).map(t => (/^s[0-9a-z]+:/.test(t.id) ? t : { ...t, id: prefix + t.id }));
}

/**
 * JSON text of a plain value in small pieces; joined, they are byte-identical to JSON.stringify(value). Containers
 * shallower than `depth` are opened and closed here (object keys and array items become separate pieces); anything
 * at `depth` is one JSON.stringify call. For an envelope the default makes each chimp, trace, tree and event its own
 * piece, so a caller can stop after any piece when its time budget runs out.
 */
export function* jsonPieces(value: unknown, depth = 3): Generator<string, void, void> {
  if (depth <= 0 || value === null || typeof value !== 'object' || typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    yield JSON.stringify(value) ?? 'null';
    return;
  }
  const skip = (v: unknown) => v === undefined || typeof v === 'function' || typeof v === 'symbol';
  if (Array.isArray(value)) {
    yield '[';
    for (let i = 0; i < value.length; i++) {
      if (i) yield ',';
      if (skip(value[i])) yield 'null'; else yield* jsonPieces(value[i], depth - 1);
    }
    yield ']';
    return;
  }
  yield '{';
  let first = true;
  for (const key of Object.keys(value)) {
    const v = (value as Record<string, unknown>)[key];
    if (skip(v)) continue;
    yield `${first ? '' : ','}${JSON.stringify(key)}:`;
    first = false;
    yield* jsonPieces(v, depth - 1);
  }
  yield '}';
}

/** The envelope in pieces (see jsonPieces); the caller keeps the world unchanged between them (the clock is held). */
export const envelopeChunks = (env: SaveEnvelope): Generator<string, void, void> => jsonPieces(env, 3);

/**
 * Takes pieces until `budgetMs` of this call has passed (checked after each piece), so a slice adapts to how fast
 * the machine is right now instead of to a fixed amount of data. Returns the text and whether the pieces ran out.
 */
export function takeSlice(pieces: Iterator<string, void>, budgetMs: number, now: () => number = () => performance.now()): { text: string; done: boolean } {
  const start = now(), parts: string[] = [];
  for (;;) {
    const next = pieces.next();
    if (next.done) return { text: parts.join(''), done: true };
    parts.push(next.value);
    if (now() - start >= budgetMs) return { text: parts.join(''), done: false };
  }
}

export class SaveError extends Error {
  constructor(message: string, readonly code: 'corrupt' | 'incompatible' | 'unknown-format') { super(message); this.name = 'SaveError'; }
}

/** Parses and validates envelope text; throws SaveError (never returns a half-valid world). */
export function parseEnvelope(text: string): SaveEnvelope {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch (e) { throw new SaveError(`Save is not valid JSON (${e instanceof Error ? e.message : e})`, 'corrupt'); }
  const env = (isLegacy(raw) ? fromLegacy(raw) : raw) as SaveEnvelope;
  if (!env || typeof env !== 'object' || typeof env.format !== 'number' || !env.world) throw new SaveError('Not a MGOGO save', 'unknown-format');
  const compat = compatibility(env);
  if (!compat.ok) throw new SaveError(`Cannot open this save: ${compat.reason}`, 'incompatible');
  const problem = worldShapeProblem(env.world);
  if (problem) throw new SaveError(`Cannot open this save: ${problem}`, 'incompatible');
  env.decider ??= { roster: 'selected', agreement: { same: 0, total: 0 }, calls: 0, applied: 0, revalidated: 0, discarded: 0, fallbacks: 0, traces: [] };
  env.session ??= { clock: { speedId: '1x', playing: false }, ui: null };
  return env;
}

/** Settings › Export (v0.2.0) JSON: { version, clock, policy, decider, traces, world }. */
interface LegacyExport { version: string; world: World; traces?: DecisionTrace[]; decider?: { roster?: Roster; agreement?: { same: number; total: number } }; clock?: { speedId?: string } }
function isLegacy(v: unknown): v is LegacyExport {
  return !!v && typeof v === 'object' && typeof (v as LegacyExport).version === 'string' && !!(v as LegacyExport).world && (v as SaveEnvelope).format === undefined;
}
/** Legacy exports carry no stamp; they are stamped as current and then must pass the structural world check. */
function fromLegacy(v: LegacyExport): SaveEnvelope {
  return { format: SAVE_FORMAT, app: v.version, stateVersion: STATE_VERSION, stateShape: STATE_SHAPE, savedAt: Date.now(), world: v.world,
    decider: { roster: v.decider?.roster ?? 'selected', agreement: v.decider?.agreement ?? { same: 0, total: 0 }, calls: 0, applied: 0, revalidated: 0, discarded: 0, fallbacks: 0, traces: (v.traces ?? []).slice(-SNAPSHOT_TRACES) },
    session: { clock: { speedId: v.clock?.speedId ?? '1x', playing: false }, ui: null } };
}

/** Values JSON cannot carry faithfully. An empty list means a save → load round trip is lossless. */
export function plainDataProblems(root: unknown, limit = 10): string[] {
  const out: string[] = [], seen = new Map<object, string>();
  const walk = (v: unknown, path: string) => {
    if (out.length >= limit) return;
    if (typeof v === 'number') { if (!Number.isFinite(v)) out.push(`${path}: non-finite number`); else if (Object.is(v, -0)) out.push(`${path}: -0`); return; }
    if (v === undefined) { out.push(`${path}: undefined`); return; }
    if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') { out.push(`${path}: ${typeof v}`); return; }
    if (v === null || typeof v !== 'object') return;
    const prev = seen.get(v);
    if (prev) { out.push(`${path}: shared reference with ${prev}`); return; }
    seen.set(v, path);
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (Object.getPrototypeOf(v) !== Object.prototype) { out.push(`${path}: ${(v as object).constructor?.name ?? 'non-plain'} object`); return; }
    for (const k of Object.keys(v)) walk((v as Record<string, unknown>)[k], `${path}.${k}`);
  };
  walk(root, 'world');
  return out;
}
