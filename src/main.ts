import './style.css';
import { applyIntervention, createWorld, relationOf, relationshipOf, tickWorld, type Profile } from './simulation';
import { createScene, type Scene } from './scene';
import { advance, createClock, frameBudget, SPEED_PRESETS, setSpeed, subTick } from './clock';
import { cancelDecisionRequests, createDecisionController, isBlocking, pumpDecisions, refreshDecideStatus, setPolicy, setRoster, startLocalModel } from './decision';
import { createApp, defaultSelection } from './ui/app';
import { icon } from './ui/icons';
import type { OlderParamsView, PersistenceView } from './ui/contracts';
import type { ModelPolicy, SceneAPI, World } from './types';
import { perf, perfAdd, perfDump, perfEnd, perfFrame, perfNow, perfReset } from './perf';
import { growPopulation } from './sim/debug';
import { createAudioEngine, type AudioEngine } from './audio/engine';
import { APP_VERSION, SAVE_FORMAT, STATE_SHAPE, STATE_VERSION, captureDecider, paramsNote, restoreDecider, type PersistedSession, type SaveEnvelope } from './persist/envelope';
import { createPersistence, type OpenResult } from './persist/controller';

// Composition root: world + clock + decision loop + scene + UI + saved simulations. The UI never
// imports these modules directly; it receives them through UiDeps.

// Debug query parameters (off by default): ?perf=1 records per-phase frame costs for scripts/perf-probe.mjs
// (?perf=gpu also times the GPU with gl.finish, which perturbs pacing) and turns saving off,
// ?pop=N grows the founding world to N living (stress test), ?seed=N picks another world. ?seed, ?pop and
// ?fresh=1 open an unsaved scratch world instead of resuming the last simulation; ?persist=0 turns saving off;
// ?test=1 exposes window.__MGOGO_TEST__ for scripts/verify-browser.mjs.
const params = new URLSearchParams(location.search);
perf.on = params.get('perf') === '1' || params.get('perf') === 'gpu';
perf.gpu = params.get('perf') === 'gpu';
const debugSeed = Number(params.get('seed') ?? 48), debugPop = Number(params.get('pop') ?? 0);
// New and scratch worlds use the real-metre field profile (C5b, ~8 km); ?profile=compressed opens an unsaved 160 m world
// (?profile=field an unsaved field one). New simulations pick their profile in the Simulations dialog; saves keep theirs.
// createWorld's own default stays compressed (tests, golden hashes and scripts rely on it).
const APP_PROFILE: Profile = 'field';
const profileParam = params.get('profile');
const urlProfile: Profile | undefined = profileParam === 'field' || profileParam === 'compressed' ? profileParam : undefined;
const scratch = params.has('seed') || params.has('pop') || params.has('fresh') || urlProfile !== undefined;
const profileOf = (w: World): Profile => w.size > 1000 ? 'field' : 'compressed';
function makeWorld(seed: number, profile: Profile = urlProfile ?? APP_PROFILE): World {
  const w = createWorld(seed, { profile });
  if (debugPop > 0) growPopulation(w, debugPop);
  return w;
}

let world!: World;
const clock = createClock();
const decider = createDecisionController();
let scene: Scene | null = null;
let audio: AudioEngine | null = null;
let elapsed = 0;
/** Bumped by every world or decision-loop change made outside a tick, so a streamed save can tell it was torn. */
let epoch = 0;
// Filled in once the UI exists; the store may report before that (queued, shown when the forest is revealed).
let captureUi: () => Record<string, unknown> | null = () => null;
const early: [string, number, (() => void)?, string?][] = [];
let notifyUi = (text: string, severity = 1, run?: () => void, label?: string) => { early.push([text, severity, run, label]); };

const session = (): PersistedSession => ({ clock: { speedId: clock.speedId, playing: clock.playing }, ui: captureUi() });
const mutationKey = () => `${epoch}|${world.ageRate}|${world.nextId}|${world.events.length}|${decider.calls}|${decider.applied}|${decider.discarded}|${decider.fallbacks}`;
const persist = createPersistence({
  capture: (): SaveEnvelope => ({ format: SAVE_FORMAT, app: APP_VERSION, stateVersion: STATE_VERSION, stateShape: STATE_SHAPE, savedAt: Date.now(),
    world, decider: captureDecider(decider), session: session() }),
  world: () => world,
  mutationKey,
  dirtyKey: () => `${world.tick}|${mutationKey()}|${JSON.stringify(session())}`,
  notify: (text, severity) => notifyUi(text, severity),
  changed: () => {},
}, { enabled: !perf.on && params.get('persist') !== '0' });

// Until the store answers (~50–100 ms on reload, ~0.3 s on a first visit), show the loading screen.
const root = document.querySelector<HTMLElement>('#app')!;
root.innerHTML = `<div class="app"><div class="loading" role="status"><span class="load-name">ChimpBench</span><span>Opening your simulation…</span></div></div>`;
await persist.start();
const opened: OpenResult | null = !scratch && persist.canRead() ? await persist.open().catch(e => ({ ok: false as const, sim: null, reason: String(e instanceof Error ? e.message : e) })) : null;
// A save created with an older parameter registry never resumes silently: the user chooses (after the UI exists).
const olderParams: OlderParamsView | null = opened?.ok && opened.params && !opened.accepted
  ? { id: opened.sim.id, name: opened.sim.name, seed: opened.sim.seed, saved: opened.params.saved, current: opened.params.current } : null;
const resumed = opened?.ok && !olderParams ? opened : null;

const savedSelection = (ui: Record<string, unknown> | null | undefined) => {
  const id = ui?.selectedId;
  return typeof id === 'number' && world.chimps.some(c => c.id === id) ? id : null;
};
/** Speed comes back as saved; play does not: a resumed simulation always opens paused. */
function applyClock(saved: PersistedSession['clock'] | undefined) {
  if (saved && SPEED_PRESETS.some(p => p.id === saved.speedId)) setSpeed(clock, saved.speedId);
  clock.playing = false;
}

// A save waiting on the older-parameters choice keeps its profile for the stand-in world ("start new" reuses it).
world = resumed ? resumed.env.world : olderParams && opened?.ok ? makeWorld(olderParams.seed, profileOf(opened.env.world)) : makeWorld(Number.isFinite(debugSeed) ? debugSeed : 48);
setPolicy(decider, world, resumed ? world.modelPolicy.mode : 'async');
if (resumed) restoreDecider(decider, resumed.env.decider, resumed.env.savedAt);
setRoster(decider, world, resumed?.env.decider.roster ?? 'selected', savedSelection(resumed?.env.session.ui) ?? defaultSelection(world));

/** Swap in another world (new or opened simulation): cancel model requests, rebuild the scene around the selection
 * the UI will show (the saved one, else the default). */
function replaceWorld(next: World, mode: ModelPolicy['mode'], ui: Record<string, unknown> | null = null) {
  cancelDecisionRequests(decider);
  epoch++;
  world = next;
  setPolicy(decider, world, mode);
  scene?.dispose();
  scene = startScene(savedSelection(ui) ?? defaultSelection(world), ui === null);
  elapsed = 0;
}
function newSimulation(seed: number, name?: string, profile?: Profile) {
  persist.flushBeforeSwitch();
  const ageRate = world.ageRate, mode = world.modelPolicy.mode;
  // Default: the current world's scale profile (field maps are ~8 km across).
  replaceWorld(makeWorld(seed, profile ?? profileOf(world)), mode);
  world.ageRate = ageRate;
  setRoster(decider, world, decider.roster, defaultSelection(world));
  if (persist.canWrite()) void persist.adopt(name ?? `Seed ${seed}`, seed); else persist.attach(null);
}
function resumedToast(name: string, note = '') {
  notifyUi(`Resumed “${name}” · day ${world.day}, ${String(Math.floor(world.hour)).padStart(2, '0')}:${String(Math.floor((world.hour % 1) * 60)).padStart(2, '0')} · paused, Space to continue${note ? ` · ${note}` : ''}`, note ? 2 : 1,
    () => app.ctx.openSimulations(), 'New simulation…');
}
/** Opens a saved simulation. One made with an older parameter registry comes back for the user's choice unless accepted. */
async function openSimulation(id: string, acceptOlderParams = false): Promise<OlderParamsView | void> {
  persist.flushBeforeSwitch();
  const r = await persist.open(id);
  if (!r) throw new Error('That simulation no longer exists');
  if (!r.ok) throw new Error(r.reason);
  if (r.params && !r.accepted) {
    if (!acceptOlderParams) return { id: r.sim.id, name: r.sim.name, seed: r.sim.seed, saved: r.params.saved, current: r.params.current };
    await persist.acceptParams(r.sim.id, r.params);
  }
  replaceWorld(r.env.world, r.env.world.modelPolicy.mode, r.env.session.ui);
  restoreDecider(decider, r.env.decider, r.env.savedAt);
  setRoster(decider, world, r.env.decider.roster, savedSelection(r.env.session.ui) ?? defaultSelection(world));
  applyClock(r.env.session.clock);
  app.worldReplaced(r.env.session.ui);
  const note = r.params ? paramsNote(r.params) : '';
  persist.attach({ id: r.sim.id, name: r.sim.name }, r.savedAt, note);
  resumedToast(r.sim.name, note);
}

const persistenceView: PersistenceView = {
  status: () => persist.status,
  list: () => persist.list(),
  saveNow: () => persist.saveNow(),
  open: openSimulation,
  rename: (id, name) => persist.rename(id, name),
  duplicate: async (id, name) => { await persist.duplicate(id, name); },
  remove: id => persist.remove(id),
  exportSimulation: async id => { const s = (await persist.list()).find(x => x.id === id); if (!s) throw new Error('That simulation no longer exists'); return persist.exportSimulation(id, s.name, s.day); },
  exportLibrary: () => persist.exportLibrary(),
  importFile: async file => (await persist.importFile(file)).text,
  requestPersist: () => persist.requestPersist(),
  requestHandoff: () => persist.requestHandoff(),
  setAutosave: on => persist.setAutosave(on),
};

const app = createApp(root, {
  getWorld: () => world,
  clock, speedPresets: SPEED_PRESETS, decider,
  getScene: () => scene,
  getSound: () => audio,
  setSpeed: id => setSpeed(clock, id),
  setPlaying: playing => { clock.playing = playing; },
  setPolicy: mode => { epoch++; setPolicy(decider, world, mode); },
  setRoster: (roster, selectedId) => { epoch++; setRoster(decider, world, roster, selectedId); },
  retryModel: async () => { await startLocalModel(decider); void pollReadiness(); },
  applyIntervention: (kind, options) => { epoch++; return applyIntervention(world, kind, options); },
  relationOf, relationshipOf,
  newWorld: newSimulation,
  setQuality: quality => scene?.setQuality(quality),
  guideUrl: '/docs/architecture.html',
  persistence: persist.status.mode === 'off' ? undefined : persistenceView,
});
captureUi = app.captureUi;
notifyUi = (text, severity = 1, run, label) => app.ctx.notify({ text, cat: 'system', title: 'Simulations', severity, action: run && label ? { label, run } : undefined });

if (resumed) {
  app.restoreUi(resumed.env.session.ui);
  applyClock(resumed.env.session.clock);
  const note = resumed.params ? paramsNote(resumed.params) : '';
  persist.attach({ id: resumed.sim.id, name: resumed.sim.name }, resumed.savedAt, note);
  resumedToast(resumed.sim.name, note);
} else if (olderParams) {
  // Nothing is saved until the user picks: open anyway (labeled), export, or start new with the same seed.
  persist.attach(null);
  void app.resolveOlderParams(olderParams);
} else {
  if (opened && !opened.ok) notifyUi(`${opened.sim ? `“${opened.sim.name}”` : 'Your last simulation'} could not be opened: ${opened.reason}. It stays under Simulations, where it can be exported. Starting a new simulation.`, 2);
  if (!scratch && persist.canWrite()) void persist.adopt(`Seed ${world.seed}`, world.seed);
  else persist.attach(null);
}
const ps = persist.status;
if (ps.mode === 'locked') notifyUi(ps.message, 2, () => persist.requestHandoff(), 'Use this tab');
else if (ps.mode === 'memory' || ps.mode === 'error' || ps.mode === 'readonly') notifyUi(ps.message, 2);

/**
 * focusId: the field profile opens on this animal's party (the selected one). fresh (no saved view): a field world opens
 * in a low close view on it, and the UI adopts that view before its first push into the scene.
 */
function startScene(focusId: number, fresh: boolean): Scene | null {
  const view = fresh && profileOf(world) === 'field' ? 'close' : undefined;
  try {
    const s = createScene(app.viewport, world, id => app.ctx.select(id), { focusId, view });
    if (view) app.ctx.setView(view, { fromScene: true });
    return s;
  }
  catch (error) { app.showError(error instanceof Error ? error.message : String(error)); return null; }
}

async function pollReadiness() {
  await refreshDecideStatus(decider);
  if (decider.phase === 'loading') setTimeout(() => { void pollReadiness(); }, 2000);
}

// Frame pacing: the display interval is the 10th percentile of recent rAF intervals (dropped frames do not
// stretch it) and the non-sim main-thread cost is smoothed, so the tick budget adapts to 60/120 Hz displays
// and to heavier views instead of a fixed 10 ms that overran the frame at Max.
const intervals = new Float64Array(64);
let intervalCount = 0, refreshMs = 1000 / 60, otherMs = 4;
function pace(intervalMs: number, workMs: number, simMs: number) {
  if (intervalMs > 0 && intervalMs < 250) {
    intervals[intervalCount++ % intervals.length] = intervalMs;
    if (intervalCount % 16 === 0) { const sorted = intervals.slice(0, Math.min(intervalCount, intervals.length)).sort(); refreshMs = sorted[Math.floor(sorted.length * 0.1)]; }
  }
  otherMs += (Math.max(0, workMs - simMs) - otherMs) * 0.1;
  clock.budgetMs = frameBudget(refreshMs, otherMs);
}

let previous = performance.now();
let lastZoomView: string | undefined, zoomScene: SceneAPI | null = null;
function frame(now: number) {
  // The clock gets real elapsed time (it caps long frames itself); visuals get a tighter cap.
  const realDt = Math.max(0, (now - previous) / 1000), dt = Math.min(realDt, 0.1);
  previous = now;
  const f0 = performance.now();
  const selectedId = app.state.selectedId;
  // While a streamed save serializes (a few frames), the clock and the decision pump hold so the slices stay consistent.
  const holding = persist.holdClock;
  if (!holding) pumpDecisions(decider, world, selectedId);
  const t1 = performance.now();
  perfEnd('pump', f0);
  let heldForSave = false;
  advance(clock, world, realDt, () => { if (isBlocking(decider, world)) return true; if (persist.holdClock) { heldForSave = true; return true; } return false; });
  if (heldForSave) clock.blockedByModel = false; // a save pause is not the model's wait
  const simMs = performance.now() - t1;
  perfAdd('sim', simMs);
  perfAdd('ticks', clock.ticksLastFrame);
  // Visual time runs a little faster at high speed so motion reads as busy, capped so rigs do not blur.
  if (clock.playing) elapsed += dt * Math.min(Math.max(clock.effectiveRate / 60, 1), 3);
  scene?.update({ dt: clock.playing ? dt : 0, elapsed, selectedId, simRate: clock.playing ? clock.effectiveRate : 0, highlightTroopId: app.state.highlightTroopId, subTick: subTick(clock) });
  // The wheel can move the camera between views (zoom-through): follow only the scene's own view changes, once the UI
  // has pushed its state into the scene (a restored close view must not be overwritten by a fresh scene's default).
  if (scene !== zoomScene) { zoomScene = scene; lastZoomView = undefined; }
  const zoomView = scene?.getZoom?.().view;
  if (zoomView && zoomView !== lastZoomView) { if (revealed && lastZoomView && zoomView !== app.state.view) app.ctx.setView(zoomView, { fromScene: true }); lastZoomView = zoomView; }
  const a0 = perfNow();
  audio?.update(world, scene?.getListener?.() ?? null, clock.playing ? clock.effectiveRate : 0, selectedId);
  perfEnd('audio', a0);
  const t2 = perfNow();
  app.tick(now);
  perfEnd('ui', t2);
  persist.tick(now);
  const workMs = performance.now() - f0;
  perfAdd('frame', workMs);
  perfFrame(now);
  pace(realDt * 1000, workMs, simMs);
  if (!revealed && scene && (scene.getDiagnostics().drawCalls > 0 || now > revealBy)) { revealed = true; app.ready(); audio?.load(); flushEarly(); }
  requestAnimationFrame(frame);
}

scene = startScene(app.state.selectedId, !resumed);
// Sound starts silent and locked; the first click or key unlocks it, and assets load once the forest is on screen.
// ?audiodebug=1 exposes window.__MGOGO_AUDIO__ (lossless output capture) for scripts/audio-probe.mjs.
audio = createAudioEngine({ debug: params.get('audiodebug') === '1' });
// The loading screen stays up until the first frame has rendered, so shader warm-up and first-use GPU uploads
// happen behind it instead of freezing the revealed forest (the old ~470 ms stall right after load).
let revealed = !scene;
const revealBy = performance.now() + 8000;
/** Messages from start-up (resume, storage problems) wait for the forest so the loading screen does not hide them. */
function flushEarly() { for (const [text, severity, run, label] of early.splice(0)) notifyUi(text, severity, run, label); }
if (revealed) flushEarly();
void pollReadiness();
requestAnimationFrame(frame);

// Profiler hook (only with ?perf=1): frame records plus a few scenario drivers for scripts/perf-probe.mjs.
if (perf.on) (window as unknown as { __MGOGO_PERF__: object }).__MGOGO_PERF__ = {
  dump: perfDump, reset: perfReset,
  /** Runs ecological hours synchronously through the public tick (e.g. to reach nightfall). */
  skipHours(hours: number) { const n = Math.round(hours * 3600 / 15); for (let i = 0; i < n; i++) tickWorld(world); return world.hour; },
  intervene(kind: Parameters<typeof applyIntervention>[1]) { const c = world.chimps.find(x => x.id === app.state.selectedId); return applyIntervention(world, kind, { troopId: c?.troopId, position: c ? [...c.position] : undefined }) !== null; },
  /** Pins a quality level and turns auto-downgrade off, so runs are comparable. */
  quality(q: 'high' | 'medium' | 'low') { const env = (document.querySelector('canvas') as HTMLCanvasElement & { __env?: { debug: { autoQuality: boolean } } })?.__env; if (env) env.debug.autoQuality = false; scene?.setQuality(q); return scene?.getQuality?.() ?? null; },
  info() { const r = (document.querySelector('canvas') as HTMLCanvasElement & { __env?: { renderer: { info: { render: object; memory: object; programs?: unknown[] } } } })?.__env?.renderer.info;
    return r ? { render: { ...r.render }, memory: { ...r.memory }, programs: r.programs?.length ?? 0 } : null; },
};

// Read-only inspection hook for development and browser verification.
(window as unknown as { __MGOGO__: object }).__MGOGO__ = {
  snapshot: () => {
    const traces = decider.traces;
    const modelTraces = traces.filter(t => t.source === 'model');
    const last = traces.at(-1);
    return {
      seed: world.seed, profile: profileOf(world), size: world.size, time: world.time, day: world.day, hour: world.hour, tick: world.tick,
      selectedId: app.state.selectedId, highlightTroopId: app.state.highlightTroopId, tab: app.state.tab, view: app.state.view,
      societyOpen: app.state.society.open, dock: app.state.dock, ageRate: world.ageRate,
      environment: { ...world.environment },
      clock: { playing: clock.playing, speedId: clock.speedId, effectiveRate: clock.effectiveRate, ticksPerSecond: clock.ticksPerSecond, limited: clock.limited, blockedByModel: clock.blockedByModel },
      stats: { ...world.stats },
      model: {
        enabled: decider.enabled, ready: decider.ready, phase: decider.phase, status: decider.status, policy: world.modelPolicy.mode, roster: decider.roster,
        focalIds: [...decider.focalIds], calls: decider.calls, applied: decider.applied, discarded: decider.discarded, fallbacks: decider.fallbacks, waiting: decider.waiting,
        agreement: { ...decider.agreement }, latencyMs: decider.latencyMs, inputTokens: decider.inputTokens, traces: traces.length, modelTraces: modelTraces.length,
        lastTrace: last ? { id: last.id, chimpId: last.chimpId, chimpName: last.chimpName, time: last.time, source: last.source, applied: last.applied, discardedReason: last.discardedReason,
          choice: last.options[last.choiceIndex]?.action ?? null, rules: last.options[last.rulesIndex]?.action ?? null, options: last.options.map(o => o.action), probabilities: [...last.probabilities], latencyMs: last.latencyMs, inputTokens: last.inputTokens } : null,
      },
      renderer: scene?.getDiagnostics() ?? null,
      audio: audio?.snapshot() ?? null,
      persistence: { mode: persist.status.mode, message: persist.status.message, simId: persist.status.simId, simName: persist.status.simName, scratch: persist.status.scratch, paramsNote: persist.status.paramsNote,
        autosave: persist.status.autosave, saving: persist.status.saving, lastSavedAt: persist.status.lastSavedAt, lastError: persist.status.lastError, saves: persist.status.saves,
        aborted: persist.status.aborted, lastSave: persist.status.lastSave, lastLoad: persist.status.lastLoad, sqlite: persist.status.sqlite, initMs: persist.status.initMs, startMs: persist.status.startMs },
      troops: world.troops.map(t => ({ id: t.id, name: t.name, alphaId: t.alphaId, alphaSince: t.alphaSince, adultMales: t.adultMales, maleHierarchy: [...t.maleHierarchy], femaleHierarchy: [...t.femaleHierarchy], alphaHistory: t.alphaHistory.length })),
      stimuli: world.stimuli.map(s => ({ id: s.id, kind: s.kind, troopId: s.troopId, label: s.label })),
      events: world.events.slice(-10).map(e => ({ time: e.time, kind: e.kind, severity: e.severity, text: e.text })),
      chimps: world.chimps.map(c => ({ id: c.id, name: c.name, troopId: c.troopId, action: c.action, alive: c.alive, stage: c.stage, controller: c.controller, source: c.decisionSource, awaiting: c.awaitingDecisionSince !== null, position: [...c.position] })),
      ui: { toasts: document.querySelectorAll('.toast').length, feedItems: document.querySelectorAll('.feed-list > li').length, inspectorOpen: app.state.inspectorOpen, sidebarOpen: app.state.sidebarOpen, insets: app.insets(), occluders: document.querySelectorAll('[data-occluder]').length, quality: { requested: app.state.quality, effective: scene?.getQuality?.() ?? null } },
    };
  },
};

// Test hook (only with ?test=1) for scripts/verify-browser.mjs: exact save → reload → resume checks.
if (params.get('test') === '1') {
  const fnv = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return `${(h >>> 0).toString(16)}:${text.length}`; };
  (window as unknown as { __MGOGO_TEST__: object }).__MGOGO_TEST__ = {
    /** Runs whole ticks synchronously through the public tick (no decision pump). */
    tick(n: number) { for (let i = 0; i < n; i++) tickWorld(world); return world.tick; },
    hash: () => fnv(JSON.stringify(world)),
    /**
     * Rules only and paused, then in one task: save, continue a copy parsed from the exact saved text by m ticks, and
     * continue the live world by m ticks (the uninterrupted run). Further saves stop, so a reload resumes this save.
     */
    async saveAndFork(m: number) {
      if (!persist.status.simId) throw new Error('no simulation to save into');
      epoch++; setPolicy(decider, world, 'off'); clock.playing = false;
      const saved = JSON.stringify(world);
      const done = persist.saveNow('immediate'); // captures synchronously, before any await
      const fork = JSON.parse(saved) as World;
      for (let i = 0; i < m; i++) tickWorld(fork);
      for (let i = 0; i < m; i++) tickWorld(world);
      persist.suspend();
      const ok = await done;
      return { ok, savedTick: fork.tick - m, savedHash: fnv(saved), forkHash: fnv(JSON.stringify(fork)), liveHash: fnv(JSON.stringify(world)) };
    },
    /** Saves now and returns the timing record (streamed while visible). */
    async save(mode: 'streamed' | 'immediate' = 'streamed') { const ok = await persist.saveNow(mode); return { ok, ...persist.status.lastSave }; },
    open: (id: string) => openSimulation(id),
    list: () => persist.list(),
    /** Stands in for a UI action or model answer that changes the world outside a tick. */
    touch() { epoch++; },
    /** Saves the world as if created with another parameter registry (test only), then stops writing. */
    async forgeOlderParams(registry = 'older-registry') {
      (world as World & { sim: { params: { registry: string } } }).sim.params.registry = registry;
      epoch++; clock.playing = false;
      const ok = await persist.saveNow('immediate');
      persist.suspend();
      return ok;
    },
  };
}
