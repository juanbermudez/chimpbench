# Persistence: save, resume and manage simulations

Status: **implemented** (Stage C2, 28 Sep 2026) as `src/persist/*` + `src/ui/simulations.ts`. §0 describes what was built and where it differs from the design study (§1–§15, Stage B2), which is kept for its measurements and rationale.

**Goal.** Reloading the page brings back the last simulation exactly where it stopped. The user can also start new simulations, open older ones, and rename, duplicate, delete, export or import them. All data stays in the browser.

---

## 0. As implemented (Stage C2)

**Decisions taken** (coordinator defaults, user asked for SQLite): `@sqlite.org/sqlite-wasm` 3.53.4-build1 (Apache-2.0) with opfs-sahpool in a dedicated module worker; reload resumes the last simulation **paused**, with "New simulation…" on the resume toast and in the menu; autosave every 60 s while visible, on `visibilitychange → hidden`, on `pagehide` and before switching simulations; 3 autosaves kept per simulation plus every manual save; saves from an older state layout are **incompatible** (listed and exportable, never opened; no migrations); snapshots keep the **50** newest decision traces.

**Modules**

| File | Role |
| --- | --- |
| `src/persist/envelope.ts` | Pure: envelope type, `STATE_VERSION` + automatic `STATE_SHAPE` fingerprint (key layout of `newX()` and `newSimState()`), compatibility, `jsonPieces`/`envelopeChunks` (JSON in small pieces, byte-identical to `JSON.stringify`) and `takeSlice` (time-budgeted slices), validating `parseEnvelope` (also reads the legacy Settings export), `captureDecider`/`restoreDecider`, `plainDataProblems` |
| `src/persist/schema.ts`, `adapter.ts` | SQL layer against a 4-method adapter: schema v1, migrations, autosave ring, fallback reads, rename, duplicate, cascade delete, library merge |
| `src/persist/worker.ts`, `protocol.ts`, `client.ts` | Store worker (Web Lock ownership, opfs-sahpool, in-memory fallback, read-only for newer databases, gzip streams, friendly quota/corruption errors) and its RPC |
| `src/persist/controller.ts` | Current simulation, autosave, streamed saves with tear detection, open/new/rename/duplicate/delete/export/import, `navigator.storage.persist()`, second-tab handoff |
| `src/ui/simulations.ts`, `simulations.css` | Menu-bar name + save indicator, Simulations dialog; `app.ts` gained `captureUi`/`restoreUi`/`worldReplaced` and toast actions |
| `src/main.ts` | Boot (open last simulation before building the scene), `replaceWorld`, clock/pump hold, `__MGOGO__.snapshot().persistence`, `?test=1` hook |

**Differences from the design below**

- The view state rides inside the envelope (`session`), not in a separate column; the dirty check includes it, so a paused world with a new selection is still saved on hide.
- Schema columns: `hour`, `communities`, `format`, `state_version`, `state_shape` added; `thumbnail` and `label` left out.
- Versioning is automatic: any key change in `ChimpX`/`SimState` changes `STATE_SHAPE`, and the loader also checks the loaded world's key layout. No `hydrate`, no migrations (decision above).
- Tear safety: while a streamed save serializes (≈ 7–15 frames), the clock and the decision pump hold, and a mutation key (UI-action epoch, `world.nextId`, event count, `ageRate`, decision counters) is compared slice by slice. A model answer or UI action mid-save aborts it; autosave retries in 2 s and after two aborts in a row writes in one task; a manual save falls back to one task at once.
- Second tab: runs an unsaved world with a "Use this tab" toast; the owner saves, closes, pauses the VFS and releases the lock over `BroadcastChannel('mgogo-store')`, then the second tab reloads and resumes.
- Scratch worlds: `?seed`, `?pop`, `?fresh=1` (and a deleted current simulation) run unsaved until "Save as simulation"; `?perf=1` and `?persist=0` start no worker.
- Parameter registry: a world records the registry hash it was created with (`world.sim.params.registry`). On open and on start-up resume, a different hash never resumes silently: "Created with an older parameter set" offers Open anyway (runs on the current defaults, labeled in the menu bar, dialog and resume toast), Export, or Start new (same seed). The choice is remembered per simulation for the current registry (`meta` key `params_ok:<id>`) and asked again when the registry changes again.
- Debug hook `?test=1`: `window.__MGOGO_TEST__` (`saveAndFork`, `tick`, `hash`, `save`, `open`, `list`, `touch`, `forgeOlderParams`) for exact resume checks.

**Tests**

- `tests/persist-envelope.test.ts`: save → chunked JSON → validating load → continue M ticks deep-equals an uninterrupted N + M run (default world 1440 + 1440, 120 living 480 + 480, life-course with an odd save tick 1537 + 1000); plain-data guard on long runs; piecewise output equals `JSON.stringify` at every depth (incl. `$&` names and JSON's undefined/function/toJSON rules); slices are time-budgeted (a fake slow clock gives more slices, never a partial piece); incompatible/corrupt/legacy handling; decider round trip; `APP_VERSION` = package.json.
- `tests/persist-schema.test.ts` (SQLite WASM Node build, in-memory): migrations and read-only refusal, autosave ring, fallback reads, rename/duplicate/cascade delete, library merge with fresh ids.
- `scripts/verify-browser.mjs` (add `--no-model` for a no-model server): Simulations › Save now after pausing (streamed, largest slice under one 60 Hz frame, 16.7 ms), reload resumes the same simulation paused, **exact resume across a real reload** (restored hash = saved hash; +2000 ticks = the uninterrupted run), second tab reports `locked` with a clear message, no console errors.

**Time-budgeted slices** (replaced "10 chimps per frame" after the no-model E2E saw 8–17 ms slices on a loaded machine): `jsonPieces` yields every chimp, trace, tree, event and top-level field as its own piece, and each frame takes pieces until **3 ms** of main-thread time has passed (`SLICE_BUDGET_MS`; doubled after 60 frames so the clock hold stays short), so a slower machine takes more frames instead of longer ones. The text goes to the worker unencoded: UTF-8 encoding in the page had cost as much again as serializing (1.5–35 ms per slice measured). Whole saves (hide, page exit, switch) also hand their text to the worker.

Streamed saves, time-budgeted, measured 29 Sep on this machine at a load average of 17–25 on 12 cores (other agents plus a GPU training job), `MGOGO_NO_MODEL=1` server on 5198:

| World | Largest slice per save | Slices · main-thread total · round trip | Envelope |
| --- | --- | --- | --- |
| 120 living, day 1 (`?pop=120`), playing 1 day/s | 3.1–3.5 ms | 2 · 4–6 ms · 54–67 ms | 1.2 MB |
| same, paused | 3.5–7.3 ms | 2–3 · 7–11 ms · 86–118 ms | 1.5 MB |
| 120 living, day 46 (imported), playing 1 day/s | 4.3–4.9 ms | 4–5 · 14–19 ms · 174–232 ms | 1.8 MB |
| same, paused | 4.1–14.4 ms | 5–6 · 14–36 ms · 286–350 ms | 1.9 MB |
| life course, day 61, 309 chimps (189 dead, slimmed), playing | 3.9–12.2 ms | 4–5 · 12–28 ms · 193–448 ms | 2.0 MB |
| same, paused | 4.1–5.6 ms | 5–6 · 17–21 ms · 235–293 ms | 2.1 MB |
| E2E persistence section (default world, day 3–9, paused), 11 runs | 3.6, 3.9, 5.7, 8.3, 8.4, 11.1, 12.8, 12.9, 14.6, 17.2, 41.9 ms | 3–7 · — · 85–542 ms | 0.6 MB |

Most slices land at 3–5 ms. The spikes are not serialization: a probe that timed every piece (48,680 pieces over 80 slices, app running at 1 day/s) found 4 pieces of 0.3–10 KB taking 7–13 ms, where such a piece normally takes 20–50 µs. Garbage collection or the OS descheduling the renderer on an oversubscribed machine lands in whatever work runs at that moment; a save slice cannot budget for it. On an idle machine the idle target (≤ 8 ms per slice) holds with margin. The full no-model E2E also failed 5 of 6 times at its 1 day/s throughput check (> 20,000 eco-s/s; achieved 2,400–12,000), before reaching the persistence steps, for the same reason.

**Measured in the real app, size-based slices (28 Sep)** (headless Chrome on this machine under a load average of ~26 from other agents, `MGOGO_NO_MODEL=1` dev server):

| | Default world (49 alive, day 1–7) | 120 living, day 181 (imported, 1.93 MB world) |
| --- | --- | --- |
| Envelope → gzip | 290–330 KB → 53–64 KB on day 1; 110–112 KB gzip by day 6 | 2.2–2.5 MB → 420–470 KB |
| Streamed save: slices, largest main-thread slice | 7, 1.0–3.4 ms | 15, 2.3–2.6 ms (≈20 ms in total, spread over 15 frames) |
| Streamed save, round trip | 125–162 ms | 381–544 ms (worker commit 93–144 ms) |
| One-task save (hide, page exit, switch) main thread | 1.7 ms | 15–19 ms |
| Frames during saves at 1 day/s | — | no frame beyond the baseline (baseline max 67 ms, during saves max 33 ms; the loaded machine ran ~30 fps either way) |
| Open / resume (worker read + gunzip, then parse) | 15–44 ms | 62 ms (54 + 8–9) |
| Store start-up before the world is built | first visit 244 ms, reload 114–141 ms (incl. the load) | reload to ready 3.6 s in total, mostly scene creation |

**Bundle impact** (`pnpm build`): main JS +26 KB raw / +10 KB gzip and CSS +5.5 KB / +1.6 KB gzip (persistence + dialog); store worker 227 KB / 67 KB gzip plus `sqlite3.wasm` 869 KB / 402 KB gzip (349 KB brotli), fetched by the worker at start-up and cached after. Two helper files from the package (`sqlite3-worker1` 213 KB, `sqlite3-opfs-async-proxy` 33 KB) are emitted but never fetched. `@sqlite.org/sqlite-wasm` 3.53.4-build1: Apache-2.0, no dependencies, 3.0 MB unpacked.

---

## 1. Recommendation

**Use the official SQLite WASM build (`@sqlite.org/sqlite-wasm` 3.53.4-build1, SQLite 3.53.4, Apache-2.0) with the `opfs-sahpool` VFS, running in its own module worker.** Each save stores the resume state as one gzip-compressed JSON envelope in a BLOB. The envelope is serialized one slice per frame, and the clock holds while it does. Compression, SQL and file I/O all run in the worker.

Why:

- **No COOP/COEP headers.** `opfs-sahpool` needs no `SharedArrayBuffer`, so Google Fonts, the guide page and hosting stay as they are. The prototype ran with `crossOriginIsolated === false` in both dev and production builds.
- **Nothing hitches the frame loop.** On the main thread, the largest slice for a 120-chimp, 1-year world was 2.3–4.6 ms. Compression and the SQLite commit (5–14 ms) run in the worker.
- **Crash-safe.** Every save is one SQLite transaction with a rollback journal. The prototype killed the page 5 ms into a 3.7 MB save. On reopen, `integrity_check` returned `ok`, the in-flight save was simply absent, and the previous snapshots loaded.
- **Portable.** The whole library exports as one real `.sqlite3` file (the `sqlite3` CLI opens it) and imports back with fresh ids.
- **Mature and small enough.** Made by the SQLite project. The file format is stable. It adds about 470 KB gzip (wasm 402 KB + worker JS 66 KB), loaded only by the worker, in parallel with scene creation.

**Strongest counterargument: IndexedDB alone would do this job with no dependency.** In the same worker, an IndexedDB put of the same 660 KB gzip blob took 5.6–9.2 ms (durability `strict`), the same as the SQLite commit. Storage is not the bottleneck; serialization and compression are. SQLite earns its dependency (AGENTS.md: "no new npm dependencies without strong reason") because of:

1. The user explicitly asked for SQLite or Turso.
2. A single, inspectable, portable file for export, import and backup.
3. Multi-row atomic commits: snapshot, summary, autosave-ring pruning and "last opened" pointer in one transaction.
4. Cascade deletes, plus `user_version` migrations.
5. Room for queryable history (events, traces, observer samples for the realism program) without inventing an index layer on top of IndexedDB.

If the dependency is refused, the design below still works on IndexedDB: only `src/store/schema.ts` and the worker's storage calls change.

**Turso: not now.** `@tursodatabase/database-wasm` 0.7.2 works (prototyped, §3.4), but:

- It requires COOP/COEP, because it uses shared WebAssembly memory.
- It ships an 11 MB wasm (3.6 MB gzip).
- It runs the SQL engine on the page thread; its worker only does OPFS I/O. A 1.1 MB save spent 30–42 ms in insert and dropped a frame.
- A second tab throws `NoModificationAllowedError`.
- It is pre-1.0 ("we recommend keeping backups").

Turso's real advantage is sync with Turso Cloud, which a local-only app does not need. Revisit only if cloud sync becomes a goal.

---

## 2. Options compared

| | **SQLite WASM + opfs-sahpool** (recommended) | SQLite WASM + `opfs` / `opfs-wl` | Turso `database-wasm` 0.7.2 | wa-sqlite (OPFSCoopSyncVFS / IDBBatchAtomicVFS) | IndexedDB directly | `@libsql/client/web` 0.18 |
|---|---|---|---|---|---|---|
| Local persistence in the browser | Yes (OPFS) | Yes (OPFS) | Yes (OPFS) | Yes (OPFS or IndexedDB) | Yes | **No.** Remote only: "does not support local file URLs". Embedded replicas are Node-only. |
| COOP/COEP needed | **No** | Yes (`SharedArrayBuffer`) for `opfs`. `opfs-wl` (new in 3.53) is a Web Locks variant of `opfs`; not verified whether it drops the requirement. | **Yes** (shared wasm memory; verified in `database-wasm-common`) | No | No | n/a |
| Where SQL runs | Our worker | Our worker | **Page thread** (worker does I/O only) | Our worker | Any thread | Server |
| Multi-tab | One tab owns the pool; others must wait (`pauseVfs`/`unpauseVfs` enable handoff) | One connection at a time; lock contention | Second tab throws | OPFSCoopSyncVFS: several connections, one transaction at a time | Native | n/a |
| Browsers | Chromium ~2022+, Firefox 111+ (module workers 114+), Safari 16.4+ | Same; Safari < 17 buggy | Same as OPFS, plus cross-origin isolation | Chrome 108+, Safari 16.4+, Firefox 111+ (IDB VFS: older) | All | n/a |
| Transfer size (gzip) | wasm 402 KB + worker JS 66 KB (measured build) | Same | wasm **3.61 MB** (2.50 MB brotli) + ~80 KB JS, page + I/O worker (measured build, net of the sim) | ~0.5–1 MB depending on build (not measured) | 0 | n/a |
| Maturity | SQLite project; oo1 API stable | Same | Pre-1.0, weekly pre-releases (0.8.0-pre.14 on 28 Sep 2026) | Upstream npm package stale (1.0.0, Jan 2024; install from GitHub); PowerSync fork `@journeyapps/wa-sqlite` 2.0.6 maintained | Platform | Stable, but remote |
| License | Apache-2.0 | Apache-2.0 | MIT | MIT (upstream, since 2023) | n/a | MIT |
| Measured save of 1.1–3.8 MB state | Main thread ≤ 4.6 ms per frame (streamed); worker compress 34–57 ms + commit 5–14 ms | Not measured (headers rule it out) | 45–58 ms, of which insert 30–42 ms on the page thread; one frame at 33 ms | Not measured | put 5.6–9.2 ms (blob only) | n/a |

Also not viable:

- **kvvfs:** localStorage, main thread only, ~5 MB. Our database is several MB.
- **`@tursodatabase/sync-wasm`:** a local OPFS replica that pushes and pulls with a Turso Cloud database. It needs a remote database and COOP/COEP, and has an open issue about replicas left incomplete or unusable ([#8725](https://github.com/tursodatabase/turso/issues/8725)).

If multi-tab editing ever becomes a requirement, the upgrade path is wa-sqlite `OPFSCoopSyncVFS`. The SQL layer below is written against a small adapter (§7.1), so the engine can be swapped.

---

## 3. Measurements

Machine: this Mac (M3 Pro per AGENTS.md), loaded by other agents during the runs. Browser: system Google Chrome, headless, driven by Playwright from the path in `scripts/shot.mjs`, with a persistent profile so OPFS survives reloads and restarts. Worlds come from a read-only copy of `src/sim` taken at the start of this stage. Numbers are ranges over 3 runs unless noted.

### 3.1 How big a world is

Node 22, `World` only (no traces), gzip via `CompressionStream`:

| World | Chimps (alive) | JSON | gzip | `JSON.stringify` | `JSON.parse` | gzip time |
|---|---|---|---|---|---|---|
| Default, day 1 | 49 (49) | 414 KB | 78 KB | 1.8 ms | 1.4 ms | 5.8 ms |
| Default, day 30 | 49 (49) | 558 KB | 104 KB | 2.0 ms | 1.9 ms | 6.2 ms |
| Default, day 120 | 50 (49) | 685 KB | 127 KB | 2.7 ms | 3.1 ms | 7.9 ms |
| 120 living (`growPopulation`), day 1 | 120 (120) | 1.10 MB | 196 KB | 5.4 ms | 3.8 ms | 11.8 ms |
| 120 living, day 90 | 120 (119) | 1.71 MB | 348 KB | 17.2 ms | 8.0 ms | 25 ms |
| 120 living, day 365 | 123 (120) | 2.90 MB | 547 KB | 15.0 ms | 11.5 ms | 34 ms |
| Life-course (ageRate 365), day 30 | 191 (116) | 2.03 MB | 431 KB | 11.6 ms | 7.2 ms | 27 ms |
| Life-course, day 60 (60 bio-years) | 287 (120) | 3.33 MB | 754 KB | 28.1 ms | 19.9 ms | 55 ms |

Where the bytes go:

- **120 living, day 365:** chimps 2.79 MB. Memory digests are 1.41 MB of that (12 monthly digests × 120 chimps, which plateaus) and `chimp.sim` is 0.58 MB. Trees are 55 KB, events 29 KB, `world.sim` 8 KB.
- **Life-course, day 60:** 167 dead chimps take 1.66 MB, about 10 KB each. They keep their full `sim`, memory and episodes. **Life-course worlds grow without bound** (see Risk 1).
- **Decision traces:** 200 traces (`MAX_TRACES`) with full `DecisionContext` take 750–785 KB, about 3.9 KB each. That is ~40% of an envelope for a default world.
- **gzip vs deflate-raw:** same size and speed. gzip wins because its CRC-32 detects a corrupt blob on load.

### 3.2 Save and load in the browser (SQLite WASM, opfs-sahpool)

Envelope = world + 200 traces + session. "One-shot" means stringify, encode and transfer in one task. "Streamed" is the recommended design (§7.3), 10 chimps per frame, clock held.

| | Default world (49), tick 2000 | 120 living, day 1 | 120 living, day 365 |
|---|---|---|---|
| Envelope → gzip | 1.20 MB → 149 KB | 1.86–2.06 MB → 258–305 KB | 3.65–3.83 MB → 614–665 KB |
| One-shot main-thread block | 5.5–7.9 ms | 9.6–12.0 ms | **19.3–23.8 ms** (one run 37 ms) |
| Streamed: max main-thread slice / slices | 2.4 ms / 7 | not run | **2.3–4.6 ms / 15** |
| Worker gzip | 8–15 ms | 17–27 ms | 34–57 ms |
| Worker SQLite commit (1 transaction) | 3–11 ms | 4.6–5.8 ms | 5–14 ms (one outlier 97 ms) |
| Save round trip, one-shot / streamed | 17–34 ms / 97 ms | 35–47 ms / not run | 62–102 ms / 224–319 ms |
| Load total: worker select + gunzip, then main decode + parse | 11.9 ms (main 4.2) | 11.2–26.3 ms (main 5.7–9.7) | 19.8–39.5 ms (main 12.4–20.1) |
| Frames over 20 ms during saves | 0 | 0 | 0 streamed; one-shot dropped one (33 ms) |

The Stage C2 target is "saves under 1 s for a 120-chimp world". Measured: 0.22–0.32 s streamed and 0.06–0.10 s one-shot.

Store start-up (worker fetch + wasm compile + VFS + open + schema):

- First visit: 200–340 ms.
- Reload: 50–85 ms (wasm 21–43, VFS 4–23, open 9–16).
- After a full browser restart: 74–86 ms.

The app's `createScene` alone is ~500 ms, so on reload the store is ready before the scene.

Production build (`vite build` + `vite preview`, no headers) matched dev: default one-shot 7.9 ms, 120-chimp one-shot 12 ms, load 11 ms, first init 201 ms.

### 3.3 Correctness in the browser

| Check | Result |
|---|---|
| Save at tick 2000 → **real page reload** → load → +2000 ticks, compared with an uninterrupted 4000-tick run (FNV hash of `JSON.stringify(world)`) | Equal (`e333b3a1`), dev and production builds, every run |
| Full browser-process restart, then list + load | All simulations and snapshots present |
| Second tab in the same profile | Its worker gets no Web Lock and reports `locked`; no exception, no corruption |
| Page killed 5 ms into a 3.7 MB save | `integrity_check = ok`; in-flight save absent; prior 3 snapshots load |
| Export whole DB → import | 1.9 MB file, header `SQLite format 3`, export 0.5–1.1 ms, import (3 simulations, fresh ids) 20–22 ms |
| Rename, duplicate (newest snapshot only), delete (cascade + `incremental_vacuum`) | Correct |
| `navigator.storage.persist()` | `false` in headless Chrome (Chrome grants it by engagement heuristics); quota reported ~10 GB |

### 3.4 Turso comparison

Production build, COOP/COEP on, world only (no traces), 3 runs:

| | Default (416 KB → 80 KB) | 120 living (1.10 MB → 196 KB) |
|---|---|---|
| Save total | 20–36 ms (insert 14–26 ms) | 45–58 ms (insert 30–42 ms, page thread; one frame at 33 ms) |
| Load | 6.5 ms | 5.6–6.4 ms |
| Connect | 42 ms first, 8 ms on reload | |
| Second tab | `NoModificationAllowedError: Failed to execute 'createSyncAccessHandle'` | |
| Build output | wasm 11.07 MB (3.61 MB gzip, 2.50 MB brotli); JS ~190 KB + worker 171 KB raw | |

Turso's dev server path (`@tursodatabase/database-wasm/vite`) inlines the wasm as a 14.7 MB base64 JS module to work around [vite#8427](https://github.com/vitejs/vite/issues/8427).

### 3.5 Determinism of save → load → continue (Node)

| Case | Save at | Continue | `isDeepStrictEqual` vs uninterrupted |
|---|---|---|---|
| Seed 48, default | 5760 ticks (1 day) | 5760 | Equal |
| Seed 7, 120 living | 11520 | 5760 | Equal |
| Seed 21, life-course | 17417 (odd tick) | 4000 | Equal |

A loss scan of the default world at day 120 found no `undefined` values, non-finite numbers, `-0`, shared references or non-plain objects. JSON is therefore lossless for today's `World`, including `world.sim` and `chimp.sim`. The sim's module-level state is scratch or caches keyed by object identity (`index`, stream grid, `exitsCache`), and it rebuilds for a new world object.

---

## 4. What a save contains

A resumed world must continue exactly as an uninterrupted run would, so the snapshot is the whole `World` plus the controller state that affects the future, and nothing derived.

```ts
/** Snapshot blob (gzip JSON). Format 1. */
interface SaveEnvelope {
  format: 1;                 // envelope layout, owned by src/store
  simVersion: number;        // SIM_STATE_VERSION from src/sim/state.ts (new, sim-owned; see §8)
  appVersion: string;        // package.json version
  savedAt: number;           // epoch ms
  world: World;              // everything, including world.sim, chimp.sim, world.rng, modelPolicy, ageRate, chimp.controller
  decider: PersistedDecider; // see below
}
/** Session: how the user was looking at the world. Stored per simulation, updated cheaply (no snapshot needed). */
interface PersistedSession {
  clock: { speedId: string; playing: boolean };
  ui: {
    selectedId: number; highlightTroopId: number | null; tab: InspectorTab; view: ViewMode;
    layers: Record<Layer, boolean>; society: { open: boolean; troop: number | 'all'; view: SocietyView };
    dock: Dock; inspectorOpen: boolean; pinnedTraceId: string | null; feedMuted: string[];
  };
}
interface PersistedDecider {
  roster: Roster; agreement: { same: number; total: number };
  calls: number; applied: number; revalidated: number; discarded: number; fallbacks: number;
  traces: DecisionTrace[];   // the ring (≤ MAX_TRACES)
}
```

**Excluded on purpose:**

- **Decision controller:** `enabled/ready/busy/phase/status/lastError/model/device/latencyMs/inputTokens/waiting/inflightChimpId/generation/backoffUntil`, and the internals (`abort`, `waitingSince`). These are transient, or re-derived by `refreshDecideStatus` and `pumpDecisions`.
- **Clock:** `accumulator` (under one tick of real-time debt; restoring it only shifts the first tick by under a frame) and the telemetry fields.
- **UI:** `hoverTroopId`, `experiment` (an in-flight annotation), `mobileSheet`.
- **Scene and audio:** fully derived from `World`.
- **Quality:** a global setting, not per simulation.

**Restore order** (one `replaceWorld(world, session)` path in `main.ts`, shared with "New world"):

1. `cancelDecisionRequests(decider)`.
2. `world = env.world`, then `hydrate(world)` (§8).
3. `setPolicy(decider, world, world.modelPolicy.mode)`.
4. `restoreDecider(decider, env.decider)`. This must bump `decision.ts`'s module-level `traceSequence` past the loaded ids, or new trace ids `${tick}-${chimpId}-${seq}` can collide with restored ones (and `pinnedTraceId`).
5. `setRoster(decider, world, roster, ui.selectedId)`.
6. `scene.dispose()` + `startScene()`.
7. UI reset (`ranks.reset`, `feed.reset/prime`), then `app.restoreUi(ui)`. The UI already falls back to `defaultSelection` if the selected chimp is gone.
8. `setSpeed(clock, speedId)`, then set `clock.playing`.

**Determinism boundary.** Resume is exact for rule-driven chimps. Model-controlled chimps depend on model latency and batching, which is already true of uninterrupted runs. A chimp saved while parked (`awaitingDecisionSince !== null`) is picked up by `pumpDecisions` on the first frame; its real-time timeout restarts.

---

## 5. Schema (SQLite, `user_version = 1`)

```sql
PRAGMA auto_vacuum = INCREMENTAL;          -- set before the first table; lets delete reclaim space
PRAGMA foreign_keys = ON; PRAGMA journal_mode = TRUNCATE; PRAGMA synchronous = FULL;   -- every connection

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
-- keys: 'last_sim' (id), 'settings' (JSON: quality, autosave interval, audio), 'persist_asked' (epoch ms)

CREATE TABLE simulations (
  id          TEXT PRIMARY KEY,            -- crypto.randomUUID()
  name        TEXT NOT NULL,
  seed        INTEGER NOT NULL,
  created_at  INTEGER NOT NULL, updated_at INTEGER NOT NULL,   -- epoch ms
  sim_time    REAL NOT NULL,               -- world.time (ecological hours)
  day         INTEGER NOT NULL, tick INTEGER NOT NULL,
  population  INTEGER NOT NULL,            -- living
  communities TEXT NOT NULL,               -- JSON [{name, alive, alphaName}] for the list view
  age_rate    REAL NOT NULL,
  app_version TEXT NOT NULL, sim_version INTEGER NOT NULL,     -- of the newest snapshot
  session     TEXT NOT NULL,               -- JSON PersistedSession (clock + ui), updated on a 2 s debounce
  parent_id   TEXT REFERENCES simulations(id) ON DELETE SET NULL,   -- duplicated or branched from
  thumbnail   BLOB                         -- optional ~15 KB WebP (Stage P4)
) STRICT;

CREATE TABLE snapshots (
  id          INTEGER PRIMARY KEY,
  sim_id      TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('auto','manual','import')),
  label       TEXT,                        -- manual checkpoints
  saved_at    INTEGER NOT NULL,
  tick        INTEGER NOT NULL, sim_time REAL NOT NULL, day INTEGER NOT NULL, population INTEGER NOT NULL,
  format      INTEGER NOT NULL, sim_version INTEGER NOT NULL, app_version TEXT NOT NULL,
  encoding    TEXT NOT NULL,               -- 'json+gzip'
  raw_bytes   INTEGER NOT NULL,
  data        BLOB NOT NULL
) STRICT;
CREATE INDEX snapshots_by_sim ON snapshots(sim_id, tick DESC, id DESC);
```

Each save is one transaction:

1. Insert the snapshot.
2. Update the simulation summary.
3. Prune the autosave ring: `DELETE … WHERE kind='auto' AND id NOT IN (newest K)`.
4. Set `last_sim`.

Manual checkpoints stay until deleted. The prototype ran exactly this schema, minus `communities`, `session` and `label`.

**Not in v1 (reserved):** an append-only `events` table (the world keeps only the last `EVENT_CAP = 200` events) and observer samples for the realism program's O1. Both are additive tables with no migration risk. Traces stay in the snapshot while `MAX_TRACES` is 200. If it grows, move them to their own table.

---

## 6. `SimStore` API

```ts
// src/store/types.ts
export type StoreState = 'starting' | 'ready' | 'locked' | 'memory-only' | 'error';
export interface StoreStatus {
  state: StoreState; simId: string | null; saving: boolean; lastSavedAt: number | null;
  lastError: string; usageBytes: number | null; persisted: boolean | null;
}
export interface SimSummary {
  id: string; name: string; seed: number; createdAt: number; updatedAt: number;
  day: number; hour: number; tick: number; population: number; communities: { name: string; alive: number; alphaName: string | null }[];
  ageRate: number; appVersion: string; simVersion: number;
  compatibility: 'current' | 'migrates' | 'incompatible';
  snapshots: number; bytes: number; parentId: string | null; thumbnailUrl: string | null;
}
export interface SnapshotInfo {
  id: number; simId: string; kind: 'auto' | 'manual' | 'import'; label: string | null; savedAt: number;
  tick: number; day: number; population: number; bytes: number; rawBytes: number; simVersion: number;
}
export interface Resumable { summary: SimSummary; envelope: SaveEnvelope; session: PersistedSession; migratedFrom: number | null; skippedCorrupt: number }
export interface SaveOptions { kind?: 'auto' | 'manual'; label?: string; mode?: 'streamed' | 'immediate' }
export interface SaveResult { snapshotId: number; bytes: number; rawBytes: number; maxSliceMs: number; totalMs: number }

export interface SimStore {
  readonly status: StoreStatus;
  onStatus(fn: (s: StoreStatus) => void): () => void;
  ready(): Promise<StoreState>;
  listSimulations(): Promise<SimSummary[]>;
  listSnapshots(simId: string): Promise<SnapshotInfo[]>;
  /** New simulation row plus its first snapshot (tick 0 or current). */
  create(name: string, envelope: SaveEnvelope, session: PersistedSession): Promise<SimSummary>;
  save(simId: string, envelope: SaveEnvelope, options?: SaveOptions): Promise<SaveResult>;
  saveSession(simId: string, session: PersistedSession): Promise<void>;
  /** Newest valid snapshot of simId (default: last opened). Falls back to older snapshots if a blob fails gzip CRC, parse or validation. */
  load(simId?: string, snapshotId?: number): Promise<Resumable | null>;
  rename(simId: string, name: string): Promise<void>;
  /** Copies the newest (or given) snapshot into a new simulation: a branch point, not the history. */
  duplicate(simId: string, name: string, snapshotId?: number): Promise<SimSummary>;
  delete(simId: string): Promise<void>;
  exportSimulation(simId: string): Promise<Blob>;   // .mgogo.json.gz: envelope + session, readable across DB schema versions
  exportLibrary(): Promise<Blob>;                   // .sqlite3: every simulation (pool.exportFile)
  /** Detects .sqlite3, .mgogo.json(.gz) and the legacy Settings "Export" JSON (version '0.2.0'). New ids; never overwrites. */
  import(file: Blob): Promise<SimSummary[]>;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<void>;
  requestPersistence(): Promise<boolean>;           // navigator.storage.persist(), called from a user gesture
  /** Handoff: save, close the DB, pauseVfs, release the lock (another tab asked to take over). */
  release(): Promise<void>;
}

// src/store/autosave.ts
export interface Autosave {
  /** Once per frame from main.ts, after scene.update. Starts a streamed save when due. */
  tick(now: number): void;
  /** OR-ed into the clock's isBlocked predicate while a streamed save is serializing (≈ 7–15 frames). */
  readonly holdClock: boolean;
  saveNow(reason: 'manual' | 'hidden' | 'pause' | 'switch' | 'pagehide'): Promise<SaveResult | null>;
  setEnabled(on: boolean): void;
}
```

The helpers that capture and restore owned state sit next to their owners, so the store never reaches into internals:

- `decision.ts`: `exportDecider(controller)` and `restoreDecider(controller, saved)`.
- `ui/app.ts`: `captureUi()` and `restoreUi(ui)`.
- `clock.ts`: nothing new (`setSpeed`, `playing`).
- `sim/state.ts`: `SIM_STATE_VERSION` and `hydrate(world)`.

---

## 7. Architecture

```
MAIN THREAD (frame loop)                                STORE WORKER (module, 'mgogo-store')
main.ts  pump → advance(isBlocked = model || autosave.holdClock) → scene.update → ui → autosave.tick
                                                        navigator.locks 'mgogo-store' (held for the worker's life)
autosave due → saveBegin ───────────────────────────▶  CompressionStream('gzip') opened
  frame k    head slice (all but chimps)  ─ saveChunk ▶  writer.write(bytes)            ← bytes transferred, not copied
  frame k+1  chimps[0..10)                ─ saveChunk ▶  writer.write
  …          chimps[…]                    ─ saveChunk ▶  …
  frame k+n  tail + saveCommit(meta)      ────────────▶  close → BEGIN; INSERT snapshot; UPDATE simulation;
                                                          prune auto ring; set last_sim; COMMIT
  ◀──────────────────────────────── { snapshotId, bytes, timing }
startup / open: load ───────────────────────────────▶  SELECT newest → DecompressionStream (CRC) → bytes (transferred)
  TextDecoder + JSON.parse (4–20 ms, behind the loading screen) ◀──
                                                        sqlite3.wasm + opfs-sahpool ('.mgogo-pool') → /mgogo.sqlite3
```

### 7.1 Modules

| File | Role | Testable in Node |
|---|---|---|
| `src/store/envelope.ts` | `captureEnvelope`, `serializeSlices(envelope, perSlice)` (generator), `parseEnvelope`, `validate`, `migrate`, legacy-export mapping | Yes |
| `src/store/schema.ts` | DDL, migrations (`user_version`), every query, written against a tiny adapter `{ exec, all, get, tx }` | Yes: SQLite WASM's Node build supports in-memory DBs (verified: `node:test` + tsx, 31 ms) |
| `src/store/worker.ts` | Lock, VFS install (`initialCapacity: 8`), open, message loop, gzip streams, export/import | Browser only |
| `src/store/client.ts` | `SimStore`: id-matched RPC, transfers `ArrayBuffer`s, requests serialized in the worker | Browser |
| `src/store/autosave.ts` | Policy (§9), clock hold, visibility and pagehide hooks | Yes (fake store and clock) |
| `src/ui/simulations.ts` | Menu, dialog, indicator (Stage P4) | `src/ui/preview.html` with a fake store |

### 7.2 Worker rules

- **One request at a time.** A promise chain serializes requests, so a load can never interleave with a half-streamed save.
- **Ownership lock.** `navigator.locks.request('mgogo-store', { ifAvailable: true })` runs before `installOpfsSAHPoolVfs`. A second tab gets `null`, reports `locked`, and never touches the pool. A second pool install would fail inside the VFS anyway. The lock releases when the tab closes.
- **Failure modes:**
  - No OPFS (Safari private windows, some embedded webviews): `memory-only`, using an in-memory `oo1.DB` in the same worker. The app works, and the indicator offers Export.
  - Quota errors: the save fails, the indicator shows an error, and older snapshots stay untouched.
  - A database whose `user_version` is newer than the app: read-only mode (refuse writes). This protects data from an older build.
- **Capacity.** `opfs-sahpool` pre-allocates file slots (default 6). Use `reserveMinimumCapacity(8)` to cover the DB, its journal, and an imported file plus journal.

### 7.3 Streamed serialization (why and how)

One-shot `JSON.stringify` + `TextEncoder` of a 3.7 MB envelope blocked the main thread for 19–24 ms (37 ms worst), more than a frame. A worker cannot help with serializing: the `World` lives on the main thread, and `postMessage(world)` pays the same structured-clone cost (26 ms for the 1-year world in Node). So:

1. **Hold the clock.** `advance`'s `isBlocked` predicate already stops ticks mid-frame and forgets the blocked time, as in lockstep. `autosave.holdClock` joins it. The world cannot change between slices, so the slices form one consistent snapshot. Add `clock.blockedBySave` (or generalize `blockedByModel`) so the UI does not say "waiting for model".
2. **Serialize in slices.** (Prototype design; the implementation now takes time-budgeted pieces and encodes in the worker, see §0.) First the head, `JSON.stringify({...envelope, world: {...world, chimps: MARK}})`, split at the quoted marker. Then 10 chimps per frame. Then the tail.
   - Use a plain ASCII marker (`"__mgogo_chimps__"`). A control-character marker is escaped by `JSON.stringify` and never matches; the prototype hit exactly this bug.
   - If a joined string is ever built, use a function replacement, because a string replacement expands `$&`.
   - Each slice is encoded and its buffer transferred at once.
3. **The worker feeds each chunk to one gzip stream** and commits after the tail.

Prototype results: the output is byte-identical to one-shot `JSON.stringify`. Worst slice 2.3–4.6 ms. 15 frames without ticks per save, about 0.25 s per autosave, invisible at 1× and about 0.4% of throughput at 1 day/s with a 60 s cadence.

Hidden tabs get no `requestAnimationFrame`, so `hidden`, `pagehide` and world-switch saves use `mode: 'immediate'` (one-shot). That is 6–24 ms once, when no frame is on screen or behind a "Saving…" state.

### 7.4 Vite and project config changes

```ts
// vite.config.ts (additions only)
optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },  // pre-bundling breaks its new URL('sqlite3.wasm', import.meta.url)
worker: { format: 'es' },                                // module worker; the default 'iife' is wrong for this ESM package
```

- **No `server.headers`, no `preview.headers`, no `index.html` change,** and no production-host header config.
- **`package.json`:** `"@sqlite.org/sqlite-wasm": "3.53.4-build1"` (exact pin like the others; 3.0 MB unpacked).
- **Worker creation:** `new Worker(new URL('./store/worker.ts', import.meta.url), { type: 'module', name: 'mgogo-store' })`.
- **TypeScript:** `/// <reference lib="webworker" />` at the top of the worker. This compiled under TypeScript 7.0.2 in the prototype.
- **Build output:** `pnpm build` emits the hashed `sqlite3.wasm` plus two package helpers the recommended path never fetches (`sqlite3-worker1` 213 KB, `sqlite3-opfs-async-proxy` 33 KB).
- **Unaffected:** the `research-note` plugin and the guide input.
- **Origins are per port.** Saves made at `127.0.0.1:5173` are invisible to the no-model servers on 5181/5190/…, and Playwright scripts use fresh profiles. Existing scripts therefore keep seeing fresh seed-48 worlds.

### 7.5 If COOP/COEP were ever needed (Turso or `opfs`)

- **Google Fonts:** the stylesheet `<link>` needs `crossorigin` (font files are already CORS).
- **Guide page:** `docs/architecture.html` must be served with the same headers.
- **`COEP: credentialless`** is not an escape hatch, because Safari does not support it.
- **Local model bridge:** same-origin, so unaffected.

---

## 8. Versioning and migration

There are three independent version numbers:

| Version | Owner | Bump when | On mismatch |
|---|---|---|---|
| DB schema (`PRAGMA user_version`) | `src/store/schema.ts` | Tables or columns change | Always migrate forward in SQL (additive, in one transaction). A DB newer than the app opens read-only. |
| Envelope `format` | `src/store/envelope.ts` | Envelope layout changes | Upgrade function per format; cheap, written every time |
| `SIM_STATE_VERSION` | `src/sim/state.ts` (new constant, sim-owned) | A `World`, `Chimp`, `ChimpX` or `SimState` field is **removed, renamed, re-typed or given a new meaning**, or units or id ranges change | Run the migration chain v→v+1… if present, else mark the save **incompatible** |

**Additive changes need no bump.** AGENTS.md already requires new contract fields to be optional. Internal state gets its defaults from `newX()` and `newSimState()`. On every load, `hydrate(world)` fills missing keys of `world.sim` and each `chimp.sim` from those defaults, with a shallow, key-wise fill that never overwrites. For a same-version save nothing is missing, so it is a no-op and determinism holds. A nested shape change (for example `MonthLedger`) is not additive and needs a bump.

**Policy during the realism program (C3–C11), recommended:** don't write sim migrations yet. Each stage that breaks state bumps `SIM_STATE_VERSION`. Old saves then show as **Incompatible**: "saved with simulation v3; this build runs v5". They are never loaded silently, and the list offers:

- **Export**, a portable `.mgogo.json.gz` that can be loaded by a matching older build.
- **Start new with the same seed and settings.**
- **Delete.**

Write migrations only once the state shape settles, or for a run someone cares about. Separately, a same-version save made by an older app shows a note, "saved with 0.2.0, continues under 0.3.0 rules". Behavior changes are expected and are not a blocker.

**Legacy import.** The current Settings "Export" JSON (`{ version: '0.2.0', clock, policy, decider, traces, world }`) maps to envelope format 1, sim v1. Stage P4 replaces that export with "Export simulation" in the envelope format.

---

## 9. Autosave policy

- **Dirty rule:** save only if `world.tick` advanced since the last snapshot. UI or session changes go to `simulations.session` on a 2 s debounce; no snapshot is written.
- **Every 60 s of real time while playing,** a streamed save. The interval is a setting: 30 s, 1 min, 5 min or off. At 1×, 60 s is 1 ecological hour; at 1 day/s, 60 days.
- **On pause** (Space): streamed.
- **On `visibilitychange → hidden`:** immediate. This fires before tab close in Chromium and covers backgrounded tabs, whose timers are throttled.
- **On `pagehide`:** immediate, best effort. The worker may be killed mid-commit; the journal rolls it back and the previous snapshot survives (verified).
- **Before replacing the world** (open, new, import, handoff): immediate and awaited, behind a "Saving…" state.
- **Retention:** keep **K = 3** autosaves per simulation plus all manual checkpoints. That is about 0.5–2 MB per simulation, and ~50 MB for 20 simulations against a multi-GB quota.
- **Persistence:** call `navigator.storage.persist()` once, from the first manual save or the Simulations dialog (a user gesture). Record the answer in `meta`.

---

## 10. UX flows (fits the single top menu bar of Stage C1)

- **Start-up:**
  - URL has `?seed`, `?pop` or `?fresh`: a new **scratch** world with autosave off, and an indicator "Scratch · not saved [Save as simulation]".
  - URL has `?perf=1`: persistence is off entirely (no worker, no noise in perf probes).
  - Otherwise, await `store.load()` with a 2 s timeout. It needs ~50–100 ms on reload; `createScene` takes ~500 ms, so the existing loading screen covers it.
    - Found and current: resume it **paused**, with the toast "Resumed ‘Seed 48’ · day 34, 14:05 · Space to continue".
    - Incompatible: start a fresh world and open the Simulations dialog with the explanation.
    - None, or store unavailable: a new simulation "Seed 48", with its first snapshot written immediately (~20 ms).
- **Menu bar `Simulation ▾`:**
  - New simulation… (name, seed with dice, aging mode; saves the current one first)
  - Open… ⌘O
  - Save checkpoint ⌘S (`preventDefault` on the browser's "Save page")
  - Rename…
  - Duplicate (branch here)
  - Export ▸ (This simulation `.mgogo.json.gz` · All simulations `.sqlite3`)
  - Import…
  - Delete… (type-to-confirm the name)
- **Open dialog:**
  - A list sorted by last saved. Each row shows name, day and time, population, communities with alphas, last saved (relative), size, a compatibility badge, and an optional thumbnail.
  - Row actions: Open, Rename, Duplicate, Export, Delete.
  - An expander lists checkpoints. **Restore** a checkpoint creates a branch ("Seed 48 · from day 12") rather than rewinding the original, so nothing is lost.
  - A footer shows storage usage and persistence state.
- **Indicator** (right of the clock in the menu bar):
  - "Saved · 12 s ago"
  - "Saving…"
  - "⚠ Not saving — MGOGO is open in another tab [Use here]"
  - "⚠ Not saving — storage unavailable (private window?) [Export]"
  - "Read-only — saved by a newer MGOGO"
- **Second tab:**
  - It runs without saving and shows a banner.
  - **Use here** asks the owner over `BroadcastChannel('mgogo-store')` to `release()`: save, close, `pauseVfs`, drop the lock. The owner then shows "Moved to another tab [Take back]". The new tab acquires the lock and loads the latest.
  - A frozen or unresponsive owner cannot be forced: `locks.request({ steal: true })` frees the lock but not the owner's open access handles. The banner says to close the other tab.
- **Settings:** "New world" becomes "New simulation…". "Export snapshot" becomes "Export simulation". Autosave interval and on/off move here too.

---

## 11. Test plan

**Unit tests (`pnpm test`, node:test via tsx):**

- `tests/persistence-envelope.test.ts`:
  - Resume determinism, `assert.deepStrictEqual` vs uninterrupted, on three cases: seed 48 default (N = M = 1440), 120 living (N = M = 720), and life-course with an odd save tick (N = 1537, M = 1000). Under 2 s total. The long variants from §3.5 go in `scripts/persistence-check.ts`.
  - **Plain-data guard** after one day at 120 living and 3 days of life-course: no `undefined` values, `NaN`/`±Infinity`, `-0`, shared object references, `Map`/`Set`/typed arrays or class instances anywhere in `World`. This protects the invariant that makes JSON lossless (Risk 2).
  - `serializeSlices` output equals `JSON.stringify` for every slice size, including chimp names containing `$&` and `"`.
  - Captured envelope has no transient controller fields. After `restoreDecider`, new trace ids never collide with restored ones.
  - `hydrate` fills a missing `ChimpX`/`SimState` key and leaves existing values and key order alone. It is a no-op on a current world.
  - Incompatible `simVersion` yields a typed error. The migration chain runs in order. The legacy 0.2.0 export maps correctly.
- `tests/persistence-schema.test.ts` (SQLite WASM Node build, in-memory):
  - Migration from empty is idempotent. A newer `user_version` gives read-only.
  - Ring keeps K autosaves and never deletes manual checkpoints. Cascade delete works. Duplicate copies only the newest snapshot. Import merge assigns new ids and never overwrites.
  - `load` skips a corrupt newest blob and returns the previous snapshot.

**Browser (`scripts/verify-persistence.mjs`**, on a no-model server on its own port, fresh persistent Chrome profile, Playwright from the path in `scripts/shot.mjs`):

1. **Determinism resume in the real app.**
   - Open with `?fresh=1&test=1`. Set policy off (rule-driven, so batching cannot matter) and pause.
   - Advance exactly N ticks through a `?test=1` hook, then `saveNow('manual')`.
   - **Reload** without parameters. Assert the resumed tick equals N.
   - Advance M ticks. Hash the world with `controller` and `awaitingDecisionSince` normalized, and compare with a Node reference hash of `createWorld(48)` run N + M ticks.
2. Browser restart → list and load. Second tab → `locked` banner, no writes. Kill during save → `integrity_check = ok` and the previous snapshot loads. Export `.sqlite3` → import → list. Rename, duplicate, delete.
3. **Performance.** `?pop=120` at 1 day/s with autosave every 10 s for 60 s under `scripts/perf-probe.mjs`:
   - no frame over 20 ms attributable to saving (new `save` phase in `perf.ts`);
   - main-thread slice ≤ 5 ms;
   - save round trip < 1 s.
4. `verify-browser.mjs`: `__MGOGO__.snapshot().store` exists (state, simId, lastSavedAt).

---

## 12. Risks

1. **World size grows without bound in life-course mode.** Each dead chimp keeps ~10 KB (full `sim`, memory, episodes, candidates): 1.66 MB for 167 dead at 60 bio-years. Streaming keeps frames smooth at any size, but load time and parse cost (20 ms at 3.3 MB) grow. Recommendation for the sim owner: compact dead individuals at death, keeping genealogy and display fields. Dead chimps are never ticked, so this should not change behavior, but it needs its own determinism test.
2. **Plain-data drift.** One `Map`, `Set`, `Infinity`, class instance or shared array inside `World` silently breaks resume. JSON turns `Infinity` into `null`, and an alias turns into two copies. The guard test in §11 catches it. Worth a line in AGENTS.md invariants.
3. **Storage eviction.** Best-effort storage can be evicted under disk pressure. Safari (ITP) deletes script-writable storage after 7 days of Safari use without interaction with the site, unless it is installed to the home screen. Private windows lack OPFS (Safari) or cap it (Chrome). Mitigations: `persist()`, visible indicator states, export, `memory-only` fallback.
4. **Single-owner multi-tab.** It is inherent to `opfs-sahpool`. The handoff protocol covers live tabs. A frozen tab must be closed by the user. If concurrent tabs become a requirement, swap to wa-sqlite `OPFSCoopSyncVFS` behind the adapter.
5. **State churn from the realism program** will make old saves incompatible several times. The policy in §8 makes that explicit, with an export path, instead of risking corrupt resumes.
6. **Clock hold visibility.** 7–15 tickless frames per autosave. The `limited` and effective-rate readouts dip briefly; the UI must label it as saving, not as model wait.
7. **Dependency and tooling drift.** A Vite or Rolldown upgrade can break wasm-asset or worker handling, and an SQLite WASM API change could break the worker. Mitigations: exact pin, and the E2E script in `pnpm build` verification.
8. **Traces are ~40% of each snapshot.** Acceptable at 200 traces. If `MAX_TRACES` rises, move them to a table and write them incrementally.

---

## 13. Implementation stages (replaces the single Stage C2)

## Stage P1: Envelope and determinism
**Goal**: `src/store/envelope.ts` (capture, slice serializer, parse, validate, hydrate, migrate, legacy import). Add `exportDecider`/`restoreDecider` to `decision.ts` and `captureUi`/`restoreUi` to `ui/app.ts`. Add `SIM_STATE_VERSION` + `hydrate` in `sim/state.ts`, coordinated with the sim owner. No new dependency.
**Success Criteria**: save → JSON → load → continue is deep-equal to uninterrupted for the three cases. Plain-data guard passes on long runs. Slice output is byte-identical to `JSON.stringify`. `scripts/bench-sim.ts` unchanged.
**Tests**: `tests/persistence-envelope.test.ts`; `scripts/persistence-check.ts` (long variants).
**Status**: Complete (as `tests/persist-envelope.test.ts`; `STATE_SHAPE` in `src/persist/envelope.ts` instead of a sim-owned constant)

## Stage P2: Store worker and schema
**Goal**: Add `@sqlite.org/sqlite-wasm@3.53.4-build1`. Build `src/store/{schema,worker,client}.ts` (lock, sahpool, streamed save, load with corrupt-blob fallback, rename/duplicate/delete, export/import, settings) and the Vite config lines from §7.4.
**Success Criteria**: Node schema tests pass. In the browser: save, list and load survive a page reload and a browser restart; 120-chimp, 1-year save < 1 s; main-thread slice ≤ 5 ms; `pnpm build` passes without COOP/COEP.
**Tests**: `tests/persistence-schema.test.ts`; `scripts/verify-persistence.mjs` store-level steps.
**Status**: Complete (as `tests/persist-schema.test.ts`; browser steps live in `scripts/verify-browser.mjs`)

## Stage P3: App integration (resume and autosave)
**Goal**: `main.ts` bootstrap (resume last, debug-parameter rules, one `replaceWorld` path for new, open and import). `src/store/autosave.ts` with clock hold and `clock.blockedBySave`. A `save` perf phase. `__MGOGO__.snapshot().store`.
**Success Criteria**: reload resumes the same simulation at the same tick with UI restored. Determinism-resume passes in the real app. `perf-probe` at 1 day/s, pop 120 shows no save-attributable frame over 20 ms. Reload start-up grows ≤ 100 ms. `verify-browser.mjs` passes.
**Tests**: `scripts/verify-persistence.mjs` (full), `scripts/perf-probe.mjs --pop 120`, `scripts/verify-browser.mjs`.
**Status**: Complete (frame impact measured with a rAF monitor in the real app, §0; perf-probe runs with `?perf=1`, which turns saving off)

## Stage P4: Simulations UI
**Goal**: `Simulation ▾` menu in the C1 menu bar, Open dialog with checkpoints and branch-restore, indicator states, second-tab banner and handoff, export/import, and Settings export replaced. Optional thumbnails.
**Success Criteria**: every §10 flow works by keyboard and mouse. ⌘S saves a checkpoint. Incompatible saves render with export and start-new actions. The UI preview harness renders all indicator states with a fake store.
**Tests**: `verify-persistence.mjs` UI steps; `src/ui/preview.html` states; `verify-browser.mjs`.
**Status**: Complete (no thumbnails; Settings › Export snapshot kept as is)

## Stage P5: Versioning operations and docs
**Goal**: Migration registry and the incompatible path exercised end to end. A `docs/simulation.md` extension recipe ("adding state safely: defaults in `newX()`/`newSimState()`, when to bump `SIM_STATE_VERSION`"). Plain-data invariant added to AGENTS.md.
**Success Criteria**: a synthetic v0 save shows as incompatible and exports. A synthetic additive field loads through `hydrate`. Docs updated.
**Tests**: envelope migration tests; browser step loading a fixture DB with an old save.
**Status**: Superseded: no migrations during the realism program (decision); incompatible handling is tested in `tests/persist-envelope.test.ts`, and AGENTS.md documents `STATE_SHAPE`/`STATE_VERSION`

---

## 14. Decisions for the user

1. **Approve the dependency** `@sqlite.org/sqlite-wasm` (Apache-2.0, ~470 KB gzip, worker only). The zero-dependency alternative is IndexedDB, equally fast here, but it has no portable file and no SQL.
2. **On reload:** auto-resume the last simulation, paused (recommended), or show a chooser first.
3. **Old saves during the realism program:** mark incompatible with export and start-new (recommended), or write a migration for each breaking stage.
4. **Autosave cadence and retention:** 60 s and 3 autosaves per simulation (recommended).
5. **Keep decision traces in snapshots** (+~40% size), or drop them from autosaves.
6. **Ask the sim owner to compact dead chimps** (Risk 1).
7. **Debug URLs (`?seed`, `?pop`):** open unsaved scratch worlds (recommended), or create saved simulations.

---

## 15. Prototype

Location: `/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/f5af9b78-d6c6-47d0-abc3-1895e50c3362/scratchpad/persist-proto/`. It is scratch and will not survive the session. It has its own `package.json` with `@sqlite.org/sqlite-wasm` 3.53.4-build1, `@tursodatabase/database-wasm` 0.7.2, `vite` 8.3.1 and `tsx`.

| File | What it does |
|---|---|
| `node-measure.ts` | World sizes, JSON and gzip costs, loss scan, Node determinism (`tsx node-measure.ts sizes\|resume`) |
| `src/store-worker.ts`, `src/store-client.ts`, `src/protocol.ts` | The recommended worker: lock, sahpool, schema, one-shot and streamed saves, load, rename, duplicate, delete, export/import, IndexedDB baseline |
| `src/main.ts` | Page API (`window.__proto`): real worlds from the copied sim, 200 real traces via `buildRequest`, streamed serializer, frame and long-task monitor |
| `drive.mjs` | Headless Chrome end to end: save → reload → resume hash, big-world timings, restart, second tab, kill-during-save, management, export/import |
| `src/turso-main.ts`, `vite.turso.config.ts`, `drive-turso.mjs` | Turso comparison (COOP/COEP server) |
| `node-sql.test.ts` | Proves the SQL layer is unit-testable in Node (in-memory SQLite WASM) |
| `*.log` | Raw results behind §3 |

Rerun:

```sh
vite                                          # port 5198, no headers
node drive.mjs http://127.0.0.1:5198/ /worlds/pop120-365d.json
vite build && vite preview                    # port 5199, then drive.mjs against it
```

The prototype servers used only ports 5198–5199 and were stopped afterwards.

## Sources

- SQLite WASM persistence (VFS options, requirements, sahpool API, kvvfs limits, `opfs-wl`): https://sqlite.org/wasm/doc/trunk/persistence.md
- `@sqlite.org/sqlite-wasm` README (worker usage, Vite `optimizeDeps.exclude`): https://github.com/sqlite/sqlite-wasm and the package's shipped `index.d.mts` (SAHPoolUtil)
- Turso in the browser (COOP/COEP, worker I/O, single-tab lock): https://turso.tech/blog/introducing-turso-in-the-browser
- Turso project status ("has not yet reached 1.0 … keep backups", MIT): https://github.com/tursodatabase/turso and the `database-wasm` 0.7.2 README
- libSQL TypeScript reference (`@libsql/client/web` does not support local files): https://docs.turso.tech/sdk/ts/reference
- Turso sync-wasm issue #8725: https://github.com/tursodatabase/turso/issues/8725
- PowerSync, "The Current State of SQLite Persistence on the Web: May 2026" (wa-sqlite VFS matrix, browser support, private-mode limits): https://powersync.com/blog/sqlite-persistence-on-the-web
- wa-sqlite (MIT since 2023, VFS list): https://github.com/rhashimoto/wa-sqlite
- COEP `credentialless` browser support (no Safari): https://caniuse.com/mdn-http_headers_cross-origin-embedder-policy_credentialless
- npm registry metadata for versions, dates and licenses (queried 28 Sep 2026)
