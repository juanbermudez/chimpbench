import type { World } from '../types';
import { createStoreClient, type StoreClient } from './client';
import { APP_VERSION, SAVE_FORMAT, STATE_SHAPE, STATE_VERSION, SaveError, compatibility, envelopeChunks, paramsChange, parseEnvelope, takeSlice, type ParamsChange, type SaveEnvelope } from './envelope';
import type { Committed, StoreState } from './protocol';
import { paramsAcceptedKey, type SimRow, type SnapshotMeta } from './schema';

// App-facing persistence: which simulation is open, autosave, streamed saves that never hitch the frame loop,
// open/new/rename/duplicate/delete/export/import, and the second-tab handoff. main.ts owns the world; this module
// asks it for envelopes (host.capture) and never mutates world state. Design: docs/persistence.md.

/** Autosave cadence while the tab is visible (plus on hide, on page exit and before switching simulations). */
export const AUTOSAVE_MS = 60_000;
/**
 * Main-thread time a streamed save may take per frame. Slices are time-budgeted, not sized: on a loaded machine the
 * same world takes more frames instead of longer ones. A slice overshoots by at most one piece (one chimp, trace or
 * tree, well under a millisecond) plus handing the text to the worker (which does the UTF-8 encoding). Garbage
 * collection or the OS descheduling the tab can still stretch a slice; that is outside this budget. After
 * SLOW_SAVE_SLICES frames the budget doubles so the hold on the clock stays short.
 */
const SLICE_BUDGET_MS = 3, SLOW_SAVE_SLICES = 60;
const RETRY_MS = 2_000, BACKOFF_MS = 30_000, FULL_BACKOFF_MS = 5 * 60_000;

export interface PersistHost {
  /** The current world, decision-loop state and session as one envelope (no copying; serialized right away). */
  capture(): SaveEnvelope;
  world(): World;
  /** Changes whenever the world or the decision loop changed outside a tick (UI action, model answer). */
  mutationKey(): string;
  /** Changes whenever anything worth saving changed (ticks, mutations, view state). */
  dirtyKey(): string;
  notify(text: string, severity?: number): void;
  /** Status changed (the menu bar re-reads it on its next refresh). */
  changed(): void;
}

export type PersistMode = 'off' | 'starting' | StoreState;
export interface SaveTiming { mode: 'streamed' | 'immediate'; kind: string; tick: number; bytes: number; rawBytes: number; mainMs: number; maxSliceMs: number; slices: number; totalMs: number; gzipMs: number; writeMs: number }
export interface LoadTiming { tick: number; bytes: number; rawBytes: number; totalMs: number; workerMs: number; parseMs: number; skipped: number }
export interface PersistStatus {
  mode: PersistMode; message: string; sqlite: string;
  /** Store start-up (worker, wasm, VFS, schema) and the whole wait before the world could be built, ms. */
  initMs: number | null; startMs: number | null;
  simId: string | null; simName: string;
  /** Non-empty while the open simulation runs on a newer parameter registry than it was created with (user chose it). */
  paramsNote: string;
  /** The world on screen is not saved as a simulation (debug URL, storage unavailable, or not adopted yet). */
  scratch: boolean;
  autosave: boolean; saving: boolean; lastSavedAt: number | null; lastError: string;
  lastSave: SaveTiming | null; lastLoad: LoadTiming | null;
  saves: number; aborted: number;
  usage: number | null; quota: number | null; persisted: boolean | null;
}
export interface SimSummary extends SimRow { compatible: boolean; reason: string; current: boolean }
/**
 * ok: readable and compatible. `params` is set when it was created with another parameter registry; `accepted` says
 * the user already chose to run it on the current one (no need to ask again until the registry changes again).
 */
export type OpenResult = { ok: true; env: SaveEnvelope; sim: SimRow; savedAt: number; params: ParamsChange | null; accepted: boolean } | { ok: false; sim: SimRow | null; reason: string };

interface Job {
  gen: Generator<string, void, void>; world: World; key: string; dirty: string; saveId: number; simId: string; kind: 'auto' | 'manual';
  meta: SnapshotMeta; t0: number; mainMs: number; maxSliceMs: number; slices: number; resolve: (c: Committed | null | 'aborted') => void;
}

/** Summary numbers stored next to each snapshot, so the list never has to open a blob. */
export function snapshotMeta(world: World): SnapshotMeta {
  const alive = world.chimps.filter(c => c.alive);
  const communities = world.troops.map(t => ({ name: t.name, alive: alive.filter(c => c.troopId === t.id).length, alpha: world.chimps.find(c => c.id === t.alphaId)?.name ?? null }));
  return { tick: world.tick, simTime: world.time, day: world.day, hour: world.hour, population: alive.length, ageRate: world.ageRate,
    communities: JSON.stringify(communities), format: SAVE_FORMAT, stateVersion: STATE_VERSION, stateShape: STATE_SHAPE, appVersion: APP_VERSION };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'simulation';
// Export file names. Import detects the format by content; the name only seeds the imported simulation's name, so
// exports from before the rename (.mgogo.json.gz, mgogo-simulations-*.sqlite3) still import.
export const exportFileName = (name: string, day: number) => `${slug(name)}-day-${day}.chimpbench.json.gz`;
export const libraryFileName = (date: Date) => `chimpbench-simulations-${date.toISOString().slice(0, 10)}.sqlite3`;
export const importedName = (fileName: string) => `${fileName.replace(/\.((chimpbench|mgogo)\.)?json(\.gz)?$/i, '')} (imported)`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function createPersistence(host: PersistHost, options: { enabled: boolean; autosaveMs?: number }) {
  const status: PersistStatus = {
    mode: options.enabled ? 'starting' : 'off', message: options.enabled ? '' : 'Saving is off for this page (debug URL).', sqlite: '', initMs: null, startMs: null,
    simId: null, simName: '', paramsNote: '', scratch: true, autosave: options.enabled, saving: false, lastSavedAt: null, lastError: '',
    lastSave: null, lastLoad: null, saves: 0, aborted: 0, usage: null, quota: null, persisted: null,
  };
  const interval = options.autosaveMs ?? AUTOSAVE_MS;
  const decoder = new TextDecoder();
  let client: StoreClient | null = null, job: Job | null = null, saveSeq = 0, pendingCommits = 0;
  let nextAutoAt = 0, savedKey = '', submittedKey = '', lastErrorToast = '', lastErrorAt = 0, suspended = false, waitingHandoff = false, abortsInRow = 0;
  const writable = () => status.mode === 'ready' || status.mode === 'memory';
  const readable = () => writable() || status.mode === 'readonly';
  const changed = () => { status.saving = !!job || pendingCommits > 0; host.changed(); };

  function fail(prefix: string, e: unknown, backoff = BACKOFF_MS) {
    const text = `${prefix}: ${message(e)}`;
    status.lastError = text;
    if (/storage is full/i.test(text)) backoff = FULL_BACKOFF_MS;
    nextAutoAt = performance.now() + backoff;
    // Never silent, but one toast per distinct problem per minute.
    if (text !== lastErrorToast || Date.now() - lastErrorAt > 60_000) { lastErrorToast = text; lastErrorAt = Date.now(); host.notify(text, 2); }
    changed();
  }
  function committed(c: Committed, t: Omit<SaveTiming, 'bytes' | 'rawBytes' | 'gzipMs' | 'writeMs' | 'totalMs'>, t0: number, dirty: string) {
    savedKey = dirty; status.lastSavedAt = Date.now(); status.saves++; status.lastError = '';
    status.lastSave = { ...t, bytes: c.bytes, rawBytes: c.rawBytes, gzipMs: c.ms.gzip, writeMs: c.ms.write, totalMs: performance.now() - t0 };
  }

  // ---------------------------------------------------------------------------
  // Streamed saves: one slice per frame with the clock held (see envelopeChunks)
  // ---------------------------------------------------------------------------

  function startStreamed(kind: 'auto' | 'manual'): Promise<Committed | null | 'aborted'> {
    const t0 = performance.now(), env = host.capture();
    return new Promise(resolve => {
      const saveId = ++saveSeq;
      job = { gen: envelopeChunks(env), world: env.world, key: host.mutationKey(), dirty: host.dirtyKey(), saveId, simId: status.simId!, kind,
        meta: snapshotMeta(env.world), t0, mainMs: 0, maxSliceMs: 0, slices: 0, resolve };
      submittedKey = job.dirty;
      client!.saveBegin(saveId).catch(() => {});
      changed();
      step(false, t0); // the first slice also pays for the capture above
    });
  }
  /** Next time-budgeted slice (or everything left when draining). Aborts if anything but this save touched the world. */
  function step(drain: boolean, start = performance.now()) {
    const j = job!;
    if (host.world() !== j.world || host.mutationKey() !== j.key) { abort(j); return; }
    const budget = drain ? Infinity : j.slices >= SLOW_SAVE_SLICES ? SLICE_BUDGET_MS * 2 : SLICE_BUDGET_MS;
    // Text goes to the worker as is: UTF-8 encoding a few hundred KB cost the page as much again as serializing it.
    const { text, done } = takeSlice(j.gen, budget - (performance.now() - start));
    if (text) client!.saveChunk(j.saveId, text).catch(() => {});
    const ms = performance.now() - start;
    j.mainMs += ms; j.maxSliceMs = Math.max(j.maxSliceMs, ms); j.slices++;
    if (done) finish(j);
  }
  function abort(j: Job) {
    job = null; status.aborted++; abortsInRow++; submittedKey = savedKey;
    client!.saveAbort(j.saveId).catch(() => {});
    nextAutoAt = performance.now() + RETRY_MS;
    j.resolve('aborted'); changed();
  }
  function finish(j: Job) {
    job = null; pendingCommits++; changed();
    client!.saveCommit(j.saveId, j.simId, j.kind, j.meta).then(c => {
      committed(c, { mode: 'streamed', kind: j.kind, tick: j.meta.tick, mainMs: j.mainMs, maxSliceMs: j.maxSliceMs, slices: j.slices }, j.t0, j.dirty);
      abortsInRow = 0;
      j.resolve(c);
    }, e => { submittedKey = savedKey; fail('Autosave failed', e); j.resolve(null); }).finally(() => { pendingCommits--; changed(); });
  }

  /** Finishes a streamed save now, in this task. True if its commit already covers the current state. */
  function drain(): boolean {
    if (!job) return false;
    const j = job;
    step(true);
    return job === null && submittedKey === j.dirty && host.dirtyKey() === j.dirty;
  }

  /** Whole envelope in one task: for hidden tabs (no animation frames), page exit and world switches. */
  function saveWhole(kind: 'auto' | 'manual'): Promise<Committed | null> {
    drain();
    const t0 = performance.now(), env = host.capture(), dirty = host.dirtyKey(), meta = snapshotMeta(env.world);
    const sent = client!.saveWhole(status.simId!, kind, meta, JSON.stringify(env));
    const mainMs = performance.now() - t0; // serialize + hand the text to the worker (which encodes and compresses)
    submittedKey = dirty; pendingCommits++; changed();
    return sent.then(c => {
      committed(c, { mode: 'immediate', kind, tick: meta.tick, mainMs, maxSliceMs: mainMs, slices: 1 }, t0, dirty);
      abortsInRow = 0;
      return c;
    }, e => { submittedKey = savedKey; fail('Save failed', e); return null; }).finally(() => { pendingCommits--; changed(); });
  }

  /** Writes the state on screen now unless a pending or finished save already holds it. */
  function saveIfDirty() {
    if (drain()) return;
    const dirty = host.dirtyKey();
    if (dirty !== savedKey && dirty !== submittedKey) void saveWhole('auto');
  }

  /** On hide and page exit: finish or write the pending state now, in one task. */
  function flush() {
    if (writable() && status.simId && status.autosave && !suspended) saveIfDirty();
  }
  if (options.enabled) {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('pagehide', flush);
  }

  // ---------------------------------------------------------------------------
  // Second tab: ask the owner to hand the library over, then reload
  // ---------------------------------------------------------------------------

  const channel = options.enabled && typeof BroadcastChannel === 'function' ? new BroadcastChannel('mgogo-store') : null;
  if (channel) channel.onmessage = async (e: MessageEvent<{ type: string }>) => {
    if (e.data?.type === 'handoff-request' && (status.mode === 'ready' || status.mode === 'readonly')) {
      try { if (status.mode === 'ready' && status.simId && host.dirtyKey() !== savedKey) await saveWhole('auto'); } catch { /* reported by saveWhole */ }
      try { await client!.release(); } catch (err) { fail('Could not hand saving to the other tab', err); return; }
      status.mode = 'released'; status.autosave = false; status.message = 'Saving moved to another tab. Reload this tab to take it back.';
      host.notify(status.message, 2); changed();
      channel.postMessage({ type: 'released' });
    }
    if (e.data?.type === 'released' && waitingHandoff) location.reload();
  };

  function attach(sim: { id: string; name: string } | null, savedAt: number | null = null, paramsNote = '') {
    if (job) abort(job);
    status.simId = sim?.id ?? null; status.simName = sim?.name ?? ''; status.scratch = !sim; status.lastSavedAt = savedAt; status.lastError = '';
    status.paramsNote = sim ? paramsNote : '';
    savedKey = submittedKey = host.dirtyKey();
    nextAutoAt = performance.now() + interval;
    changed();
  }
  async function adopt(name: string, seed: number): Promise<string | null> {
    if (!client || !writable()) return null;
    const id = crypto.randomUUID();
    try {
      await client.create({ id, name, seed, ...snapshotMeta(host.world()) });
      attach({ id, name });
      savedKey = submittedKey = '';
      return (await saveWhole('auto')) ? id : null;
    } catch (e) { fail('Could not create the simulation', e); return null; }
  }
  function flushBeforeSwitch() {
    if (writable() && status.simId && !suspended) saveIfDirty();
  }

  return {
    status,
    /** True while a streamed save is serializing: main.ts holds the clock and the decision pump. */
    get holdClock() { return job !== null; },
    canRead: readable,
    canWrite: writable,

    /** Starts the worker and opens the library. Never rejects: failures become status.mode 'error' with a message. */
    async start(timeoutMs = 8000): Promise<PersistStatus> {
      if (!options.enabled) return status;
      const t0 = performance.now();
      try {
        client = createStoreClient();
        const info = await Promise.race([client.init(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`no answer from the save worker within ${timeoutMs / 1000} s`)), timeoutMs))]);
        Object.assign(status, { mode: info.state, message: info.message, sqlite: info.sqlite, usage: info.usage, quota: info.quota, persisted: info.persisted, initMs: info.ms });
        if (info.quota && info.usage && info.usage / info.quota > 0.9) host.notify(`Browser storage is ${Math.round(info.usage / info.quota * 100)}% full; delete or export old simulations.`, 2);
      } catch (e) { status.mode = 'error'; status.message = `Saving is unavailable: ${message(e)}`; }
      status.autosave = writable();
      status.startMs = performance.now() - t0;
      changed();
      return status;
    },

    /** Opens a simulation (default: the last one). Corrupt snapshots fall back to older ones; incompatible ones are refused. */
    async open(simId?: string): Promise<OpenResult | null> {
      if (!client || !readable()) return null;
      let before: number | undefined, id = simId, skipped = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const t0 = performance.now();
        const got = await client.load(id, before);
        if (!got) return skipped ? { ok: false, sim: null, reason: 'none of its snapshots could be read' } : null;
        skipped += got.skipped; id = got.sim.id;
        const compat = compatibility(got.snapshot);
        if (!compat.ok) return { ok: false, sim: got.sim, reason: compat.reason };
        const t1 = performance.now();
        try {
          const env = parseEnvelope(decoder.decode(got.json));
          status.lastLoad = { tick: env.world.tick, bytes: got.snapshot.bytes, rawBytes: got.snapshot.rawBytes, totalMs: performance.now() - t0, workerMs: t1 - t0, parseMs: performance.now() - t1, skipped };
          if (skipped) host.notify(`${skipped} damaged save${skipped > 1 ? 's were' : ' was'} skipped; opened the newest readable one (tick ${env.world.tick}).`, 2);
          const params = paramsChange(env.world);
          const accepted = !params || (await client.meta(paramsAcceptedKey(got.sim.id)).catch(() => null)) === params.current;
          return { ok: true, env, sim: got.sim, savedAt: got.snapshot.savedAt, params, accepted };
        } catch (e) {
          if (e instanceof SaveError && e.code === 'corrupt') { skipped++; before = got.snapshot.id; continue; }
          return { ok: false, sim: got.sim, reason: message(e) };
        }
      }
      return { ok: false, sim: null, reason: 'too many damaged snapshots' };
    },

    /** The world now on screen came from this simulation (after open), or is unsaved (null). */
    attach,
    /** Saves the world on screen as a new simulation (first snapshot written immediately). */
    adopt,
    /** Before replacing the world: write the current one in one task (queued ahead of whatever comes next). */
    flushBeforeSwitch,

    /** Per frame, after rendering: advances a streamed save or starts a due autosave. */
    tick(now: number) {
      if (job) { step(false); return; }
      if (!status.autosave || suspended || !status.simId || !writable() || now < nextAutoAt || document.visibilityState !== 'visible') return;
      nextAutoAt = now + interval;
      const dirty = host.dirtyKey();
      if (dirty === savedKey || dirty === submittedKey) return;
      // Model answers or UI actions landing mid-save abort a streamed save; after two in a row, write it in one task.
      if (abortsInRow >= 2) void saveWhole('auto'); else void startStreamed('auto');
    },

    /** Save now. Streamed when the tab is visible (no hitch), otherwise in one task. Scratch worlds are adopted first. */
    async saveNow(mode: 'streamed' | 'immediate' = 'streamed'): Promise<boolean> {
      if (!client || !writable()) { host.notify(status.message || 'Saving is unavailable in this tab.', 2); return false; }
      if (!status.simId) return (await adopt(`Seed ${host.world().seed}`, host.world().seed)) !== null;
      drain();
      let c = mode === 'streamed' && document.visibilityState === 'visible' ? await startStreamed('manual') : await saveWhole('manual');
      // A manual save always completes: if something changed the world mid-stream, write it in one task.
      if (c === 'aborted') c = await saveWhole('manual');
      return c !== null;
    },

    async list(): Promise<SimSummary[]> {
      if (!client || !readable()) return [];
      return (await client.list()).map(s => { const c = compatibility(s); return { ...s, compatible: c.ok, reason: c.ok ? '' : c.reason, current: s.id === status.simId }; });
    },
    async rename(simId: string, name: string) { await client!.rename(simId, name); if (simId === status.simId) status.simName = name; changed(); },
    async duplicate(simId: string, name: string) { if (simId === status.simId) flushBeforeSwitch(); const id = crypto.randomUUID(); await client!.duplicate(simId, id, name); return id; },
    async remove(simId: string) { await client!.remove(simId); if (simId === status.simId) attach(null); },
    async exportSimulation(simId: string, name: string, day: number): Promise<{ blob: Blob; filename: string }> {
      if (simId === status.simId) flushBeforeSwitch();
      const bytes = await client!.exportSim(simId);
      return { blob: new Blob([bytes], { type: 'application/gzip' }), filename: exportFileName(name, day) };
    },
    async exportLibrary(): Promise<{ blob: Blob; filename: string }> {
      flushBeforeSwitch();
      const bytes = await client!.exportLibrary();
      return { blob: new Blob([bytes], { type: 'application/vnd.sqlite3' }), filename: libraryFileName(new Date()) };
    },
    /** .sqlite3 libraries merge; .chimpbench.json(.gz), older .mgogo.json(.gz) and the legacy Settings export become a new simulation. */
    async importFile(file: File): Promise<{ ids: string[]; text: string }> {
      if (!client || !writable()) throw new Error(status.message || 'Saving is unavailable in this tab.');
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (decoder.decode(head.subarray(0, 15)) === 'SQLite format 3') {
        const ids = await client.importLibrary(await file.arrayBuffer());
        return { ids, text: `${ids.length} simulation${ids.length === 1 ? '' : 's'} imported from ${file.name}` };
      }
      const text = head[0] === 0x1f && head[1] === 0x8b ? await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await file.text();
      const env = parseEnvelope(text); // throws a SaveError that says why
      const id = crypto.randomUUID(), name = importedName(file.name), meta = snapshotMeta(env.world);
      await client.create({ id, name, seed: env.world.seed, ...meta });
      await client.saveWhole(id, 'import', meta, JSON.stringify(env));
      return { ids: [id], text: `Imported “${name}” (day ${env.world.day})` };
    },
    /** navigator.storage.persist(): call from a user gesture (Firefox asks the user; Chrome decides by engagement). */
    async requestPersist(): Promise<boolean> {
      try { status.persisted = (await navigator.storage?.persist?.()) ?? false; } catch { status.persisted = false; }
      if (client) try { Object.assign(status, await client.estimate()); } catch { /* keep old numbers */ }
      changed();
      return status.persisted ?? false;
    },
    async refreshEstimate() { if (client && status.mode !== 'error') try { const e = await client.estimate(); status.usage = e.usage; status.quota = e.quota; status.persisted = e.persisted; changed(); } catch { /* ignore */ } },
    setAutosave(on: boolean) { status.autosave = on && writable(); nextAutoAt = performance.now() + interval; changed(); },
    /** Second tab: ask the owning tab to save and let go, then reload to resume here. */
    requestHandoff() {
      if (status.mode !== 'locked' || !channel) return;
      waitingHandoff = true;
      channel.postMessage({ type: 'handoff-request' });
      setTimeout(() => { if (!waitingHandoff) return; waitingHandoff = false; fail('The other tab did not answer', new Error('close it, then reload this tab')); }, 6000);
    },
    /** Remember that the user chose to run this simulation with the current parameter registry. */
    async acceptParams(simId: string, change: ParamsChange) { if (client && writable()) await client.meta(paramsAcceptedKey(simId), change.current); },
    /** Test hook: stop writing for the rest of this page's life (so a reload resumes an explicit save). */
    suspend() { suspended = true; job = null; changed(); },
  };
}
export type Persistence = ReturnType<typeof createPersistence>;
