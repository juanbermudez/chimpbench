import { applyDecision, resolveByRules } from './simulation';
import { buildRequest } from './sim/request';
import { secondRequest } from './sim/decide';
import { readAnswer } from './kernel/answer';
import type { Candidate, Chimp, DecisionContext, ModelPolicy, World } from './types';
import { httpProvider } from './providers/http';
import { ProviderError, type DecisionProvider, type ProviderAnswer } from './providers/types';

// The decision loop: model-controlled chimps pause at decision points
// (awaitingDecisionSince), this loop sends one chimp's local percept at a time
// to the selected decision provider, validates the answer and applies it
// through the engine. Whenever the model cannot answer in time, rules decide,
// so lockstep mode can never deadlock the clock.

export interface DecisionTrace {
  id: string; chimpId: number; chimpName: string; time: number; context: DecisionContext;
  /** The bounded menu shown to the model; score is the sim's rules score. */
  options: Candidate[];
  /** Model softmax aligned with options; empty for rules fallbacks. */
  probabilities: number[];
  choiceIndex: number; rulesIndex: number;
  applied: boolean; discardedReason: string; latencyMs: number; inputTokens: number; source: 'model' | 'rules-fallback';
  /** '' or how an applied answer was applied, e.g. 'applied to newer state (still legal)'. */
  note: string;
  /** Provider that produced this trace; absent on older saves. */
  provider?: string; model?: string;
}

export type Roster = 'selected' | 'focal-set' | 'all';

export interface DecisionController {
  enabled: boolean; ready: boolean; busy: boolean; phase: string; status: string; lastError: string;
  provider: string; providerLabel: string; progress: number | null;
  model: string; device: string; latencyMs: number | null; inputTokens: number | null; calls: number;
  /** Model answers applied: fresh (same version) + revalidated (newer version, still legal). */
  applied: number;
  /** Subset of applied: the chimp's state changed during inference but the choice was still legal and it was still waiting. */
  revalidated: number;
  discarded: number;
  roster: Roster; focalIds: number[]; traces: DecisionTrace[]; agreement: { same: number; total: number };
  /** Rules fallbacks for model-controlled chimps (timeouts, errors, model unavailable). */
  fallbacks: number;
  /** Model-controlled living chimps currently waiting at a decision point. */
  waiting: number;
  /** Chimp whose request is in flight, -1 when idle. */
  inflightChimpId: number;
  /** A model-controlled chimp waiting longer than this (real ms) is decided by rules. */
  timeoutMs: number;
  /** Prefix for the bridge URL; '' in the browser (same origin), absolute in Node scripts. */
  baseUrl: string;
  generation: number; backoffUntil: number;
}

/** Non-serializable per-controller state kept out of the UI-facing object. */
interface Internal { provider: DecisionProvider; world: World | null; abort: AbortController | null; waitingSince: Map<number, number>; statusPollAt: number; }
const internals = new WeakMap<DecisionController, Internal>();
function internal(controller: DecisionController): Internal {
  let state = internals.get(controller);
  if (!state) { state = { provider: httpProvider('server', () => `${controller.baseUrl}/api/decide`), world: null, abort: null, waitingSince: new Map(), statusPollAt: 0 }; internals.set(controller, state); }
  return state;
}

export const MAX_TRACES = 200;
const MODEL_NAME = 'fastino/GLiNER2.5-Decide';
/** Fallback traces recorded per pump; the rest are only counted, so a stalled model at max speed cannot flood the log or the frame. */
const FALLBACK_TRACES_PER_PUMP = 3;
const STATUS_POLL_MS = 3000;

export function createDecisionController(provider?: DecisionProvider): DecisionController {
  const controller: DecisionController = { enabled: false, ready: false, busy: false, phase: 'loading', status: 'Local Decide loading', lastError: '',
    provider: 'server', providerLabel: 'Server GLiNER', progress: null, model: MODEL_NAME, device: '', latencyMs: null, inputTokens: null, calls: 0, applied: 0, revalidated: 0, discarded: 0,
    roster: 'selected', focalIds: [], traces: [], agreement: { same: 0, total: 0 },
    fallbacks: 0, waiting: 0, inflightChimpId: -1, timeoutMs: 6000, baseUrl: '', generation: 0, backoffUntil: 0 };
  if (provider) setDecisionProvider(controller, provider);
  return controller;
}

/** Changing providers fences late inference and readiness replies from the previous provider. */
export function setDecisionProvider(controller: DecisionController, provider: DecisionProvider): void {
  const state = internal(controller);
  cancelDecisionRequests(controller); state.provider.dispose?.(); state.provider = provider; state.statusPollAt = 0;
  controller.provider = provider.id; controller.providerLabel = provider.label; controller.progress = null;
  controller.ready = false; controller.phase = provider.id === 'browser' ? 'stopped' : 'loading';
  controller.model = provider.id === 'jev' ? 'jev-latest' : MODEL_NAME; controller.device = ''; controller.lastError = '';
  controller.status = idleStatus(controller);
}

/** Invalidates every in-flight request; late answers are ignored. Use on world regeneration. */
export function cancelDecisionRequests(controller: DecisionController): void {
  controller.generation++;
  const state = internal(controller);
  state.abort?.abort(); state.abort = null; state.waitingSince.clear();
  controller.busy = false; controller.inflightChimpId = -1; controller.backoffUntil = 0;
}

export async function refreshDecideStatus(controller: DecisionController): Promise<void> {
  const provider = internal(controller).provider;
  try {
    const body = await provider.status();
    if (internal(controller).provider !== provider) return;
    controller.ready = body.ready; controller.phase = body.phase;
    controller.model = body.model || controller.model; controller.device = body.device ?? controller.device;
    controller.progress = body.progress ?? null;
    controller.lastError = body.error ?? '';
    if (!controller.busy) controller.status = idleStatus(controller);
  } catch (error) {
    if (internal(controller).provider !== provider) return;
    controller.ready = false; controller.phase = 'unavailable';
    controller.lastError = error instanceof Error ? error.message : 'Decision provider unavailable';
    controller.status = idleStatus(controller);
  }
}

/** Historical name kept for existing script consumers; starts whichever provider is selected. */
export async function startLocalModel(controller: DecisionController): Promise<void> {
  const provider = internal(controller).provider;
  try { await provider.start(); }
  catch (error) { if (internal(controller).provider === provider) controller.lastError = error instanceof Error ? error.message : String(error); }
  if (internal(controller).provider === provider) await refreshDecideStatus(controller);
}

function idleStatus(controller: DecisionController): string {
  const label = controller.providerLabel;
  if (!controller.enabled) return 'Rules decide · model off';
  if (controller.ready) return `${label} ready`;
  if (controller.phase === 'stopped') return `${label} not loaded · rules decide`;
  if (controller.phase === 'unavailable' || controller.phase === 'failed') return `${label} ${controller.phase} · rules decide`;
  return `${label} loading${controller.progress !== null ? ` · downloading file ${Math.round(controller.progress)}%` : ''} · rules decide meanwhile`;
}

// ---------------------------------------------------------------------------
// Policy and roster
// ---------------------------------------------------------------------------

export function setPolicy(controller: DecisionController, world: World, mode: ModelPolicy['mode']): void {
  world.modelPolicy.mode = mode;
  controller.enabled = mode !== 'off';
  if (mode === 'off') {
    cancelDecisionRequests(controller);
    // Nobody may stay parked waiting for a model that is no longer asked.
    for (const chimp of world.chimps) if (chimp.alive && chimp.awaitingDecisionSince !== null) resolveByRules(world, chimp.id);
  }
  controller.status = idleStatus(controller);
}

/** Selected + each community's alpha + a mother with a dependent infant + a juvenile, at most six. */
export function focalSet(world: World, selectedId: number): number[] {
  const alive = world.chimps.filter(c => c.alive);
  const ids: number[] = [];
  const add = (c: Chimp | undefined) => { if (c && ids.length < 6 && !ids.includes(c.id)) ids.push(c.id); };
  const selected = alive.find(c => c.id === selectedId);
  add(selected);
  for (const troop of world.troops) add(alive.find(c => c.id === troop.alphaId));
  const home = selected?.troopId ?? world.troops[0]?.id;
  const byHome = (a: Chimp, b: Chimp) => Number(b.troopId === home) - Number(a.troopId === home) || a.id - b.id;
  const mothers = alive.filter(c => c.sex === 'female' && (c.stage === 'adult' || c.stage === 'elder')
    && alive.some(i => i.motherId === c.id && i.stage === 'infant')).sort(byHome);
  add(mothers.find(c => !ids.includes(c.id)));
  add(alive.filter(c => c.stage === 'juvenile').sort(byHome).find(c => !ids.includes(c.id)));
  return ids;
}

function rosterIds(world: World, roster: Roster, selectedId: number): number[] {
  if (roster === 'all') return world.chimps.filter(c => c.alive).map(c => c.id);
  if (roster === 'focal-set') return focalSet(world, selectedId);
  return world.chimps.some(c => c.alive && c.id === selectedId) ? [selectedId] : [];
}

function rosterStale(controller: DecisionController, world: World, ids: number[]): boolean {
  if (ids.length !== controller.focalIds.length || ids.some((id, i) => controller.focalIds[i] !== id)) return true;
  const members = new Set(ids);
  return world.chimps.some(c => (c.controller === 'model') !== members.has(c.id));
}

/** Writes chimp.controller for every chimp; focalIds is the resulting model-controlled set. */
export function setRoster(controller: DecisionController, world: World, roster: Roster, selectedId: number): void {
  controller.roster = roster;
  applyRoster(controller, world, rosterIds(world, roster, selectedId));
  internal(controller).world = world;
}

function applyRoster(controller: DecisionController, world: World, ids: number[]): void {
  controller.focalIds = ids;
  const members = new Set(ids);
  for (const chimp of world.chimps) {
    const next = members.has(chimp.id) ? 'model' : 'rules';
    const parked = chimp.controller === 'model' && next === 'rules' && chimp.alive && chimp.awaitingDecisionSince !== null;
    chimp.controller = next;
    // A chimp leaving the roster while parked must not wait for an answer that will never come.
    if (parked) resolveByRules(world, chimp.id);
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

// The menu itself lives in src/sim/menu.ts: the rules decision policy (stage C13) samples the same bounded menu.
export { boundedCandidates, copyCandidate, MAX_OPTIONS, nightMenu, phaseMenu } from './sim/menu';

// The request itself (packet, menu, rules index) lives in src/sim/request.ts (stage R1), so a kernel deciding inside the
// tick is offered exactly what this loop sends.
export { buildRequest, collapseMemories } from './sim/request';

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

function usable(controller: DecisionController, world: World, now: number): boolean {
  return controller.enabled && world.modelPolicy.mode !== 'off' && controller.ready && now >= controller.backoffUntil;
}

function waitingChimps(world: World): Chimp[] {
  return world.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
}

/** Clock gate: in lockstep the world waits while a usable model owes a model-controlled chimp an answer. */
export function isBlocking(controller: DecisionController, world: World, now = Date.now()): boolean {
  if (world.modelPolicy.mode !== 'lockstep' || !usable(controller, world, now)) return false;
  return world.chimps.some(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
}

function pushTrace(controller: DecisionController, trace: DecisionTrace): void {
  controller.traces.push(trace);
  if (controller.traces.length > MAX_TRACES) controller.traces.splice(0, controller.traces.length - MAX_TRACES);
}

let traceSequence = 0;
function traceId(world: World, chimpId: number): string { return `${world.tick}-${chimpId}-${++traceSequence}`; }

/** Rules decide for a waiting chimp and the fallback is recorded (context only when recordTrace). */
function fallBack(controller: DecisionController, world: World, chimp: Chimp, reason: string, recordTrace: boolean): void {
  let trace: DecisionTrace | null = null;
  if (recordTrace) {
    const { context, options, rulesIndex } = buildRequest(world, chimp);
    trace = { id: traceId(world, chimp.id), chimpId: chimp.id, chimpName: chimp.name, time: world.time, context, options, probabilities: [],
      choiceIndex: rulesIndex, rulesIndex, applied: false, discardedReason: reason, latencyMs: 0, inputTokens: 0, source: 'rules-fallback', note: '', provider: controller.provider };
  }
  const applied = resolveByRules(world, chimp.id);
  controller.fallbacks++;
  internal(controller).waitingSince.delete(chimp.id);
  if (trace) { trace.applied = applied; pushTrace(controller, trace); }
  controller.status = `Rules decided for ${chimp.name} · ${reason}`;
}

/**
 * Call once per frame, before advancing the clock. Keeps the roster current,
 * falls back to rules where the model cannot answer, and starts at most one
 * request: the selected chimp first, then whoever has waited longest.
 */
export function pumpDecisions(controller: DecisionController, world: World, selectedId: number, now = Date.now()): void {
  const state = internal(controller);
  if (state.world !== world) { cancelDecisionRequests(controller); state.world = world; }
  // Selection, deaths, births and alpha changes all move the roster; recomputing is cheap next to a frame.
  const ids = rosterIds(world, controller.roster, selectedId);
  if (rosterStale(controller, world, ids)) applyRoster(controller, world, ids);
  // Self-healing: a worker that finishes loading, restarts or recovers is picked up without the UI polling.
  if (controller.enabled && !controller.ready && now >= state.statusPollAt) { state.statusPollAt = now + STATUS_POLL_MS; void refreshDecideStatus(controller); }
  const waiting = waitingChimps(world);
  controller.waiting = waiting.length;
  const parked = new Set(waiting.map(c => c.id));
  for (const id of [...state.waitingSince.keys()]) if (!parked.has(id)) state.waitingSince.delete(id);
  for (const chimp of waiting) if (!state.waitingSince.has(chimp.id)) state.waitingSince.set(chimp.id, now);
  if (!waiting.length) return;

  let traces = 0;
  if (!usable(controller, world, now)) {
    const reason = !controller.enabled || world.modelPolicy.mode === 'off' ? 'model off' : !controller.ready ? `model ${controller.phase}` : 'model backing off after an error';
    for (const chimp of waiting) fallBack(controller, world, chimp, reason, traces++ < FALLBACK_TRACES_PER_PUMP);
    return;
  }
  // Anyone parked longer than the timeout gets rules now, including the chimp in flight (its late answer is then discarded by version).
  for (const chimp of waiting) {
    if (now - (state.waitingSince.get(chimp.id) ?? now) < controller.timeoutMs) continue;
    if (chimp.id === controller.inflightChimpId) { state.abort?.abort(); controller.generation++; controller.busy = false; controller.inflightChimpId = -1; controller.backoffUntil = now + 250; }
    fallBack(controller, world, chimp, `no model answer within ${Math.round(controller.timeoutMs / 1000)} s`, traces++ < FALLBACK_TRACES_PER_PUMP);
  }
  if (controller.busy || now < controller.backoffUntil) return;
  const pending = waitingChimps(world);
  if (!pending.length) return;
  const chimp = pending.find(c => c.id === selectedId)
    ?? pending.sort((a, b) => (a.awaitingDecisionSince! - b.awaitingDecisionSince!) || ((state.waitingSince.get(a.id) ?? now) - (state.waitingSince.get(b.id) ?? now)) || a.id - b.id)[0];
  void requestDecision(controller, world, chimp);
}

type BridgeAnswer = ProviderAnswer;

async function requestDecision(controller: DecisionController, world: World, chimp: Chimp): Promise<void> {
  const state = internal(controller);
  const request = buildRequest(world, chimp), { context } = request;
  let { options, rulesIndex } = request;
  if (options.length < 2) { fallBack(controller, world, chimp, 'fewer than two options', true); return; }
  const generation = controller.generation;
  const version = context.version;
  const abort = new AbortController();
  state.abort = abort;
  controller.busy = true; controller.inflightChimpId = chimp.id; controller.calls++;
  controller.status = `Deciding for ${chimp.name} · ${options.length} options`;
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const trace: DecisionTrace = { id: traceId(world, chimp.id), chimpId: chimp.id, chimpName: chimp.name, time: world.time, context, options,
    probabilities: [], choiceIndex: -1, rulesIndex, applied: false, discardedReason: '', latencyMs: 0, inputTokens: 0, source: 'model', note: '', provider: controller.provider };
  let failure = '';
  let answer: BridgeAnswer = {};
  let status = 0;
  let clock = 0;
  /** One provider call. False: superseded (the answer is not ours), or it failed and the failure was handled; the flight is over either way. */
  const ask = async (ctx: DecisionContext, more: (a: BridgeAnswer) => boolean): Promise<boolean> => {
    failure = ''; answer = {}; status = 0;
    try {
      answer = await state.provider.decide(ctx, abort.signal);
    } catch (error) {
      failure = error instanceof Error ? error.message : 'request failed';
      if (error instanceof ProviderError) { status = error.status; answer.phase = error.phase; }
    }
    // Superseded by cancel, timeout or a new world: the answer is not ours to apply.
    if (controller.generation !== generation) return false;
    // (the flight stays open only while a second call for the same decision follows at once: activityFirst 2)
    if (failure || !more(answer)) { controller.busy = false; controller.inflightChimpId = -1; state.abort = null; }
    clock = Date.now();
    if (failure) {
      controller.lastError = failure;
      if (typeof answer.phase === 'string' && answer.phase !== 'ready') { controller.ready = false; controller.phase = answer.phase; controller.backoffUntil = clock + 2000; }
      else if (status === 429) { controller.backoffUntil = clock + (controller.provider === 'jev' ? 10000 : 100); return false; } // someone else holds the worker; retry soon, timeout still applies
      else controller.backoffUntil = clock + (status === 400 ? 1000 : 3000);
      if (chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, `model error: ${failure}`, true);
      return false;
    }
    return true;
  };
  // Stage R2 (activityFirst 2; docs/staging/r2-prereg.md §1 C and §10 b): the menu is one entry per kind of activity, and
  // when the kind the model chose has two or more options a second request over them settles the target (the same
  // provider, the same checks). null at activityFirst 0 and 1, where this loop is unchanged.
  let second: ReturnType<typeof secondRequest> = null;
  if (!await ask(context, a => (second = secondRequest(world, request, a)) !== null)) return;
  const sum = (a: unknown, b: unknown): number | undefined => typeof a === 'number' ? (typeof b === 'number' ? a + b : a) : undefined;
  if (second !== null) {
    const two: NonNullable<ReturnType<typeof secondRequest>> = second, first = answer, kind = options[readAnswer(first, options.length)!.index];
    controller.calls++;
    controller.status = `Deciding for ${chimp.name} · ${two.options.length} options within the chosen activity`;
    if (!await ask(two.context, () => false)) return;
    answer = { ...answer, latencyMs: sum(answer.latencyMs, first.latencyMs), inputTokens: sum(answer.inputTokens, first.inputTokens) };
    // the trace shows the request whose answer is applied; the agreement count is on the final choice
    trace.context = two.context; trace.options = options = two.options; trace.rulesIndex = rulesIndex = two.rulesIndex; // (-1: the rules' pick is of another kind)
    trace.note = `activity chosen first: ${describeOption(world, kind)}`;
  }
  // the answer check every kernel shares (src/kernel/answer.ts, stage R1)
  const read = readAnswer(answer, options.length);
  trace.latencyMs = typeof answer.latencyMs === 'number' ? answer.latencyMs : (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
  trace.inputTokens = typeof answer.inputTokens === 'number' ? answer.inputTokens : 0;
  controller.latencyMs = trace.latencyMs; controller.inputTokens = trace.inputTokens;
  if (typeof answer.device === 'string' && answer.device) controller.device = answer.device;
  if (!read) {
    controller.lastError = 'Model answer did not match the submitted options'; controller.backoffUntil = clock + 1000;
    trace.discardedReason = 'invalid model answer'; controller.discarded++; pushTrace(controller, trace);
    if (chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, 'invalid model answer', true);
    return;
  }
  controller.lastError = '';
  const { probabilities, index } = read;
  if (typeof answer.model === 'string' && answer.model) controller.model = answer.model;
  trace.model = controller.model;
  trace.probabilities = probabilities; trace.choiceIndex = index;
  // the rules' pick as the first request held it (after a second call it may be of another kind: counted, not agreed)
  const rulesOption = request.rulesIndex >= 0 ? request.options[request.rulesIndex] : null;
  if (rulesOption) { controller.agreement.total++; if (rulesIndex === index) controller.agreement.same++; }
  const choice = options[index];
  trace.applied = applyDecision(world, chimp.id, choice, 'decide', version);
  // Minor interrupts (someone approached, rain began) bump the version during the ~350 ms of inference.
  // If the chimp is still waiting at this decision point, still ours, and the choice is still legal now,
  // apply it to the newer state: applyDecision re-checks the pair against a freshly computed eligible list.
  const stillWaiting = chimp.alive && chimp.controller === 'model' && chimp.awaitingDecisionSince !== null;
  if (!trace.applied && stillWaiting && chimp.decisionVersion !== version) {
    trace.applied = applyDecision(world, chimp.id, choice, 'decide', chimp.decisionVersion);
    if (trace.applied) { trace.note = `${trace.note ? `${trace.note}; ` : ''}applied to newer state (still legal)`; controller.revalidated++; }
  }
  const verb = describeOption(world, choice);
  const confidence = Math.round(probabilities[index] * 100);
  if (trace.applied) {
    controller.applied++;
    controller.status = `${chimp.name} → ${verb} (${confidence}%)${!rulesOption ? '' : rulesIndex === index ? ' · rules agree' : ` · rules: ${describeOption(world, rulesOption)}`}`;
  } else {
    controller.discarded++;
    trace.discardedReason = !chimp.alive ? 'chimp died before the answer'
      : chimp.controller !== 'model' ? 'chimp left the model roster'
      : chimp.awaitingDecisionSince === null ? 'rules decided while the model was thinking'
      : chimp.decisionVersion !== version ? 'no longer legal in the newer state' : 'engine rejected the choice';
    controller.status = `${chimp.name}: model answer discarded · ${trace.discardedReason}`;
  }
  pushTrace(controller, trace);
  // Same decision point but the engine refused: rules settle it rather than asking again forever.
  if (!trace.applied && chimp.alive && chimp.awaitingDecisionSince !== null && chimp.decisionVersion === version) fallBack(controller, world, chimp, 'engine rejected the model choice', false);
}

/** "groom Nala", "rest", "forage" — for status lines. */
export function describeOption(world: World, c: Pick<Candidate, 'action' | 'targetId'>): string {
  const target = c.targetId >= 0 ? world.chimps.find(o => o.id === c.targetId) : undefined;
  return target ? `${c.action} ${target.name}` : c.action;
}
