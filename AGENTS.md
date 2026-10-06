# AGENTS.md

ChimpBench (formerly MGOGO) is a 3D eastern-chimpanzee society simulation (Kibale-inspired) and a live demo of a local decision model, GLiNER2.5-Decide, choosing actions from the state a chimp perceives. Vite 8, TypeScript 7 strict, three.js 0.186 (WebGL), vanilla DOM UI, `node:test` via tsx. Git repo with a public remote (https://github.com/juanbermudez/chimpbench; history rewritten 5 October 2026, see HANDOFF.md); parallel agents work in git worktrees and the integrator merges.

## Commands

```sh
pnpm dev                          # app + resident GLiNER worker on http://127.0.0.1:5173
MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port 5181 --strictPort   # extra server, no model
pnpm test                         # all unit tests (must stay green)
pnpm build                        # tsc --noEmit + production build
pnpm exec tsx scripts/bench-sim.ts [--profile field] [--params-file p.json]   # sim speed; compressed ≤ 0.8 s per eco-day (now ~0.13 s idle); field ≤ 0.3 s, ≤ 0.8 s at 120 living; --params(-file) times a Track E stack
pnpm exec tsx scripts/bench-ticks.ts [pop] [--profile field] [--params-file p.json]  # per-tick cost by cadence (plain, party, slow, hourly, daily), wall and CPU per eco-day
pnpm exec tsx scripts/e-run.ts plan --label L --m6 --params-file p.json | run <out>/run.json | status <out>/run.json   # long Track E runs as resumable jobs (one per seed, each < 2 h; registry + done markers in <out>, default artifacts/validation/e/runs/L); refuses dirty checkouts and reserved seeds; keeps ≥ 5 GB free; launch `run` in the background and re-launch until done
node scripts/perf-probe.mjs --url <no-model server> [--scenarios quick|matrix|rts-1d-day,...] [--pop 120] [--profile] [--trace] [--startup] [--hitches] [--motion] [--soak 300] [--query profile=field]
                                            # frame-time distribution, per-phase main-thread ms (?perf=1), long tasks, heap, style/layout; strat-* = strategy view zoomed on the selected party
node scripts/shot-compare.mjs <beforeUrl> <afterUrl> [outDir]   # visual-regression diff of fixed env-harness scenes
pnpm exec tsx scripts/sim-metrics.ts        # behavior and demography vs field values (~4 min; table in docs/simulation.md §18)
pnpm exec tsx scripts/field-metrics.ts [--profile field] --days 365 [--burn-in 180] --seeds 48,7,21,5,11 --workers 4 --json f.json --md f.md [--params '{"id":v}']   # virtual field observer (src/field), worker pool; scorecards in artifacts/validation/ (c3-, c5a-, c6-)
pnpm exec tsx scripts/field-scenario.ts baseline|expansion --years 10 --seeds 48,7,21,5,11 --workers 4 --out artifacts/validation/c6   # territory scenarios (UD maps, stability, T-LET-4)
pnpm exec tsx scripts/movement-metrics.ts [--seeds 48,7,21] [--burn-in 120] [--days 8] [--workers 2] [--fitted-only] [--params '{…}']   # field movement diagnosis (targets, endings, feeding bouts, reversals); --fitted-only hides held-out C12 statistics
pnpm exec tsx scripts/hunt-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}']   # hunting diagnosis (field, sim truth): gates and score of the hunt option at colobus encounters, hunts, hunters, captures, deaths by cause
pnpm exec tsx scripts/territory-sensitivity-metrics.ts [--seeds 48,7,21]   # one-at-a-time territory-cost sensitivity (C6 review)
pnpm exec tsx scripts/proof.ts --list|--estimate|--dry-run|--run [--plan lean|full] [--parallel] [--workers 6] [--from step]   # combined proof (lean: 3 × 75-year generation worlds, the default) (docs/simulation.md "Combined proof"); ablation sets in data/proof-ablations.json
pnpm exec tsx scripts/c9-scenario.ts [--kinds baseline,large,large-off] [--years 40] [--seeds 5303,5404,5505,5606,5707] [--workers 6]   # C9 fission scenarios, T-FIS scoring (truth); --days for dry runs
pnpm exec tsx scripts/fission-bands-metrics.ts   # T-FIS-5 band from the Ngogo post-fission patrols (derived statistics only)
pnpm exec tsx scripts/patrol-bands-metrics.ts   # real-data bands of T-PAT-8 (Ngogo patrols × fruit) and T-BRD-1 (Taï border stops); derived statistics only
pnpm exec tsx scripts/rw-score.ts --part train,development [--kernels null,past-given,past-either,nearest,stack] [--shuffles 5] [--limit N] [--md docs/staging/rw-bench-numbers.md]   # wild-choice benchmark (stage RW; src/rw, docs/staging/rw-bench-prereg.md): scores any kernel on whom wild Ngogo males groomed; the held-out part is sealed (--open-sealed "<reason>" logs to docs/staging/rw-sealed-log.md and needs the user's go); gliner needs --load-model, codex (an outside model) --codex-approved and --codex-max-calls; packets and per-record output stay in artifacts/
pnpm exec tsx scripts/gen-params.ts [--check]   # regenerate src/sim/params.gen.ts from data/params.json; --check validates, detects drift and lints src/sim for evidence-tagged literals outside the registry
pnpm exec tsx scripts/ingest-phenology.ts [--dir d] [--site ngogo|kanyawara] [--synthetic]   # Kibale phenology CSVs (~/Downloads) → data/phenology/*.json + src/sim/phenology.gen.ts
node scripts/verify-browser.mjs [url] [--no-model]   # end-to-end check against a running `pnpm dev` (real model); --no-model for a MGOGO_NO_MODEL=1 server (incl. save → reload → exact resume)
node scripts/shot.mjs <url> <out.png> [waitMs] [w] [h] ["js"]   # headless screenshot for visual checks
node scripts/visual-scenes.mjs --out artifacts/visual/after [--only C9,E5] [--tonemap agx]   # docs/visual-plan.md §6 acceptance scenes
node scripts/motion-probe.mjs gait|app|toggles   # foot drift, heading/speed smoothness, walk/stand flicker (servers 5190/5191)
node scripts/gpu-probe.mjs [--ab] [--apps a,b]    # GPU ms per subsystem by uncapped-frame subtraction; --ab alternates toggles (robust on a shared machine), --apps A/Bs two builds ("URL|&profile=field" A/Bs the profiles)
node scripts/field-probe.mjs [--url u] [--out artifacts/visual/c5b] [--json f.json]   # field profile (C5b): overview, party, night and storm shots; animals-in-crowns check (field and compressed); window rebuild times
pnpm exec vite --config scripts/vite.probe.config.mjs   # probe server on 5192: no HMR/watch (restart after edits), own dep cache; MGOGO_PROBE_ROOT/PORT for a snapshot
node scripts/occlusion-probe.mjs --scenes A1,A5,A6,A9,A11,A12 [--compare before.json]   # keep-clear camera: subject/party visibility, near clutter, fade stability
node scripts/zoom-probe.mjs --scenes A10,A8f       # one zoom axis: Hf continuity through the zoom-through, camera clearance, terrain in sight
node scripts/cull-probe.mjs                        # vegetation triangles submitted per pass vs inside the camera/light frusta
node scripts/upscale-compare.mjs                   # FSR 1 vs browser-bilinear output: sharpness (Tenengrad) and crops of C9, E1, E5
node scripts/build-audio.mjs                     # rebuild public/audio/ (clips, beds, manifest, SOURCES.md) from ~/Downloads Epidemic Sound files
node scripts/audio-probe.mjs [--url <no-model server>] [--only close-vocal,...]   # lossless output capture per scenario: LUFS, true peak, dropouts
```

## Architecture

| Layer | Files | Rule |
| --- | --- | --- |
| Contract | `src/types.ts` | Shared plain data. Add fields as optional and documented; never repurpose one. |
| Simulation | `src/simulation.ts` (public API), `src/sim/*` | Only writer of behavior, body and relationship state. |
| Clock | `src/clock.ts` | Runs whole fixed ticks within a frame budget; lockstep gate. |
| Decision loop | `src/decision.ts`, `src/providers/*` (browser GLiNER, server GLiNER, Jev gateway client; `packet.ts` is the one packet-text builder), `server/decide.ts` (HTTP bridge; re-exports the packet module), `server/jev.ts`, `server/local-worker.ts` | Roster, queue, traces; routes each request through the selected `DecisionProvider`; strict request validation (`src/sim/context-check.ts`); one resident worker. |
| Kernel contract (stage R1) | `src/kernel/*` (interface, kernels, answer check, between-tick loop), `src/sim/request.ts` (`buildRequest`), `src/sim/context-check.ts` (request validation), `scripts/lib/kernels.ts` (GLiNER adapter and stand-in behind the batch scorers) | A kernel only chooses: the request in, one option position out; no state, no random generator of its own. Every kernel but the in-simulation rules passes the same request validation, answer check and `applyDecision`. Jev is gated (approval and a call cap) and holds no key. Switches `kernelSim`, `kernelGate`, `kernelNoRulesPick` are 0 by default. Stage R2 (`docs/staging/r2-prereg.md`; `src/kernel/packet-words.ts`, `packet-rules.ts`; all 0 by default): `observeV4` (more of the state in the packet, words before numbers), `menuParity` (every kernel's menu is the rules' menu), `activityFirst` (one entry per kind of activity, then the target), `kernelSim` 2 (the packet-reading rules). |
| Rendering | `src/scene.ts`, `src/render/env/*`, `src/render/creatures*` | Reads World, never writes it. |
| Audio | `src/audio/*` (`mix.ts` pure math, `engine.ts` Web Audio) | Reads World and `scene.getListener()`; never writes either. |
| Persistence | `src/persist/*` (envelope, schema, store worker, controller), `src/ui/simulations.ts` | Serializes World, never mutates it; only `main.ts` swaps the World object (open/new). SQLite WASM + opfs-sahpool in a worker. |
| UI | `src/main.ts`, `src/ui/*`, `src/style.css` | Reads World; writes only control fields (`chimp.controller`, `world.modelPolicy`, `world.ageRate`) through the APIs. |

Frame loop order (in `src/main.ts`): `pumpDecisions` → `advance` (clock runs `tickWorld`) → `scene.update` → `audio.update` (20 Hz inside) → throttled UI → `persist.tick` (autosave; one snapshot slice per frame, during which pump and clock hold).

## Invariants (do not break)

- **Determinism.** All sim randomness comes from `world.rng`; no `Math.random` in `src/sim`. `tickWorld` always advances exactly `TICK_SECONDS` (15 s). The same seed and tick count give a deep-equal world however ticks are batched. `observe()` and `rulesChoice()` are pure: no RNG use, no mutation.
- **Speed never changes the tick.** Faster playback runs more ticks per frame; the clock reports `limited` when the budget caps it.
- **The model only chooses.** Code builds legal candidates, validates the answer, and re-checks legality before applying. `observe()` is local-only (no unseen entities). The server accepts no client instructions. `~/Desktop/GHN` is read-only and identity-checked by source hash.
- **Evidence labels.** Every new behavioral constant is tagged `[H]`, `[M]`, `[L]` or "design assumption" in a comment. Cite only sources in `docs/research.md`, and add new sources there first. Label stylizations in code and docs.
- **Performance.** Keep the sim bench target and 60 fps at 1440×900. No per-frame allocation in render loops; use instancing and shared materials.

## Conventions

- **Coordinates:** +x is east, −z is north, y is height above ground. The app's new and scratch worlds use the field profile (8 km in real metres, stage C5a/C5b); `?profile=compressed` or Simulations › New › Compressed opens the 160 m map, and saves keep their own profile. `createWorld(seed)` still defaults to compressed (tests, golden hashes and scripts rely on it); pass `{ profile: 'field' }` for the field map. Browser probes that need the small map pass `profile=compressed` (perf-probe does unless `--query` names a profile).
- **Id ranges:** chimps < 100000, trees 100001+, water 200001+, prey 300001+, dynamic ids (interactions, calls, stimuli) 1,000,000+.
- **Time:** `world.time` is ecological hours since 06:30 on 28 Sep (day-of-year 271). Life history runs on a separate clock scaled by `world.ageRate`.
- **Plain-data extras:** internal sim state lives in `world.sim` / `chimp.sim`. It is serializable and part of determinism checks.
- **Saves:** World must stay JSON-lossless (no Map/Set/class instances, `undefined` values, non-finite numbers or shared references; `tests/persist-envelope.test.ts` guards it). Changing `ChimpX`/`SimState` keys changes `STATE_SHAPE` and marks older saves incompatible (by design during the realism program; no migrations). Bump `STATE_VERSION` in `src/persist/envelope.ts` when a field keeps its name but changes meaning. Keys a mechanism adds lazily must be listed as optional for the load-time shape check (`OPTIONAL_*` in `src/sim/state.ts`; the field-profile ones in `LAZY_*`, `src/persist/envelope.ts`), or saves made after it fires are refused.
- **Troop fields:** `troop.alphaId` is `-1` during a contested vacancy (up to 48 h). Since stage C6 `troop.center`/`radius` are the use-weighted centre and equal-area radius of the 95% utilization isopleth (`troop.range`, updated daily by `src/sim/territory.ts`); nothing scripts range shifts.
- **Interventions:** `applyIntervention(world, kind, { troopId, position })` treats `position` as the observer's focus. Each protocol places its stimulus relative to it.
- **Naming:** the product is ChimpBench. Env vars (`MGOGO_*`), debug hooks (`__MGOGO_*__`), storage keys and names (`mgogo.sqlite3`, `mgogo-pool`, `mgogo-store`, `mgogo:uncapped`, `mgogo.sidebar`, `mgogo.chimp`, `mgogo.sound.v1`) and shader/material flags and cache keys stay `MGOGO`-prefixed on purpose, for compatibility with saves, settings, scripts and running sessions; don't rename them. Exports are `.chimpbench.json.gz`; `.mgogo.json.gz` still imports.
- **Terminology:** use "community" in UI and docs ("troop" is baboon usage) and "party" for temporary subgroups. The code type is still `Troop`.
- **Style:** compact TypeScript, comments explain why. Match surrounding code. No new npm dependencies without strong reason (three/addons are available).

## Verifying a change

1. `pnpm test` and `pnpm build`. Add tests in the matching `tests/*.test.ts` (sim tests are `tests/sim-*.test.ts`).
2. Sim changes: run the bench and `scripts/sim-metrics.ts`, and compare with the metrics table in `docs/simulation.md`.
3. Visual changes: screenshot with `scripts/shot.mjs` on a no-model server. Use the harnesses to isolate work:
   - `/src/render/env/harness.html?hour=&rain=&view=&quality=`
   - `/src/render/creatures/harness.html?mode=tiles|stages|faces|scene|perf` (own cache config: `--config src/render/creatures/vite.harness.config.ts`)
   - `/src/ui/preview.html` (synthetic world, no 3D)
4. Model or loop changes: run `node scripts/verify-browser.mjs` against `pnpm dev`.

## Gotchas

- Editing `vite.config.ts` or `server/*.ts` restarts the dev server and reloads the model worker (~12 s on MPS). The first inference after long idle can take ~4 s.
- Don't kill or restart someone else's `pnpm dev` on 5173; use another port with `MGOGO_NO_MODEL=1`. Only one model worker should run at a time (~1 GB on MPS).
- Field profile phenology: the Ngogo record (Potts et al. 2020, Dryad gf1vhhmk8, CC0) is ingested (`scripts/ingest-phenology.ts --dir data/raw/dryad-gf1vhhmk8 --site ngogo`); `phenologyForcing` 0 forces the synthetic record. Reserved proof seeds, never to be run for development, direction checks or training: C8 proof 1111–1515 and 1717–2626 (step 101); patrol re-tests 707, 808, 909, 1013, 1014; C9 proof 5303, 5404, 5505, 5606, 5707; C11 calibration pool C 7004–7023, V1 8101–8505, V2 8606–9010 and V3 9202–9606 (step 101). Retired, never to be used as proof seeds: 606, 1010, 1616, 5101, 5202, 7001–7003, 9101 (run before, by proof dry runs or the decide-ft track; protocolLog 30 September). Pick new development seeds outside all of these, and grep artifacts/ first.
- Field profile: patch crops are lazy (sim code reads `fruitAt(world, tree)`; `tree.fruit` is refreshed daily for other readers), ~40k trees and a stream segment grid; field-only mechanisms are gated by parameters that are 0 in the compressed profile, so compressed golden hashes stay put.
- Sim constants live in `data/params.json`, not in code. Read `P.id` from `const P = paramsOf(world)` (never `DEFAULTS.id` for an overridable entry), regenerate after edits, and name new ids in docs/simulation.md §17. A changed default moves the golden hashes in `tests/fixtures/golden-world.json`: re-record them (`pnpm exec tsx tests/fixtures/golden.ts --record`) only for an intended change.
- `scripts/shot.mjs`, `scripts/verify-browser.mjs` and the probes load Playwright through `scripts/lib/playwright.mjs` (installed outside the repo: `npm install --prefix ~/.cache/chimpbench/playwright playwright-core`, or `MGOGO_PLAYWRIGHT`) and use `/Applications/Google Chrome.app`.
- Use Node 22.22.3 (`.node-version`). Node 22.19.0 passes the tests but tsx's loader does not reach worker threads there, so every worker-pool script (e-bench, e-run, field-metrics) fails with `ERR_MODULE_NOT_FOUND`.
- The environment renderer replaces three's fog shader chunks globally. `scene.fog` must stay a `THREE.Fog`, and creature materials opt into softer mist via the `MGOGO_CREATURE` flag.
- `artifacts/` is gitignored. It holds model receipts (rotated at 64 MB), the worker log, identity and E2E screenshots.
- Real inference: ~500 input tokens (hard limit 1,280), ~0.25–0.4 s. Model scores are uncalibrated softmax values.
- GPU timer queries and `gl.finish()` do not measure GPU time on this machine (ANGLE/Metal); use `scripts/gpu-probe.mjs`. Full frames are GPU-bound at ~10–13 ms, so new GPU work needs a quality gate.
- Overlays drawn inside the tone-mapped scene (selection ring, model rings, focal outline) take `preToneMapped()` colours from `creatures/util.ts`; raw gold goes lime under ACES.
- Sound starts only on a user gesture (autoplay policy): the AudioContext is created on the first click/key, never at load (that would log a warning). Headless checks use `--autoplay-policy=no-user-gesture-required` and `?audiodebug=1`.
- Sound memory: beds stream through two `<audio>` elements each (crossfaded at the loop point, which also hides AAC padding gaps); one-shots decode at 32 kHz and thunder at 24 kHz via OfflineAudioContext (≈24 MB). Don't decode beds into AudioBuffers (~23 MB per minute of stereo).
- `public/audio/` is derived from the user's Epidemic Sound subscription files and is gitignored (removed from the public history): rebuild it locally with `scripts/build-audio.mjs`, never commit, redistribute or deploy it publicly. Bonobo clips stay opt-in (`optional` in the manifest) and never enter chimpanzee pools by default.
- Saves live in the browser profile per origin (each port is separate), so servers on other ports and fresh Playwright contexts start from a new simulation. `?seed`, `?pop`, `?fresh=1` open unsaved scratch worlds; `?perf=1` and `?persist=0` start no store worker; `?test=1` exposes `window.__MGOGO_TEST__` (exact save/fork/tick hashes). Only one tab owns the save library (Web Lock + exclusive OPFS handles); others report `locked`. Playwright's `browser.newPage()` context cannot open a second page: use `browser.newContext()`.
- Keep-clear camera (`render/env/occluders.ts`): every tree, buttress flare, rock and log is a slot in one RGBA8 fade texture; instances carry `aObj` (limbs add 4096). A new occluding mesh needs `aObj` and `patchMaterial({ fade })`, or it will never clear. Leaf clumps clear per clump on the GPU (`envKeepClump`), not per tree.
- Vegetation, rocks and logs are cell-culled (`render/env/cells.ts`): after `culler.add(mesh)` the mesh's instance buffers are overwritten each re-pack and it no longer casts (a `-shadow` twin does). Change instances through the culler's sorted sources, not `setMatrixAt`; quality trims go through `mesh.userData.keep`.
- The canvas backs at native DPR (≤ 2); scene and post render at `INTERNAL_RATIO` and FSR 1 upscales (`post.ts` `FsrPass`, vignette and grain after RCAS). Anything sized in drawing-buffer pixels must use the post targets, not the canvas.
- The 3D view renders at 60 Hz on ≥ 100 Hz displays (Settings → Frame rate, `localStorage mgogo:uncapped`); probes that need uncapped frames set `__env.debug.frameCap = false` (gpu-probe does).
- Field profile (C5b; the app default, `world.size > 1000`): a new world opens in a low close view on the selected animal (`createScene(…, { focusId, view: 'close' })`; the strategy view keeps a ~64 m frame on its party for `R`), and the dawn prologue stops once that animal leaves its nest (at 10 min/s a travelling party outruns the window). Reset camera frames the whole map; the strategy view shows a scale bar (`src/ui/scalebar.ts`, DOM writes only when the zoom changes). Render = logical metres (no floating origin). The environment is a window (forest ±140 m, canopy ring and far floor to 1.3 km) rebuilt around the camera focus in time slices, uploaded over a few frames on layer 5 (lights stay enabled there) and swapped in (`render/env/field-env.ts`, `scene.ts` fieldStep); `render/env/overview.ts` (whole-map canopy, ranges, stream, party markers) takes over at strategy frames of 260–700 m. Window content must be a pure function of its 64 m tile seed and the sim trees (per-tree RNG); never draw from a shared sequential RNG there. Shader lookups of `uHeight`/`uGround` subtract `uOrigin`. Nothing may bake community spacing or patch density: read `world.troops` / `world.trees`.
- The wheel can change the view (zoom-through); `main.ts` syncs the UI from `scene.getZoom().view`. Scripts that place the close camera should call `rig.place()` / `rig.setOrbit()` (direct `controls` edits are adopted, but springs and the pitch curve then take over).
- Creature playback trails the sim by 2 ticks (`motion.ts` needs a sample on both sides of the drawn segment). Per-animal shader params live in texels P0..P5 (`ROW_TEXELS` 132); a new texel means raising it.

- `data/raw/` holds downloaded field datasets with their `PROVENANCE.md` (source, license, checksum). Raw chimpanzee coordinates are location-sensitive: never publish them or copy them into `public/`, `docs/` or `dist/`; the app and guide show only normalized maps, credited per license.

- Worktrees (parallel work): `node_modules` and `data/raw/` are not tracked. Symlink them from the main checkout (`ln -s /Users/juanbermudez/Desktop/MGOGO/node_modules node_modules`). Commit on your branch in small steps. Never commit to `main` from a worktree. Proof runs count only on merged `main`.

## Docs

- `docs/simulation.md`: how the simulation works. Tick pipeline, state, actions, mechanisms, parameters, validation, extension recipes.
- `docs/research.md`: evidence, citations, evidence levels, stylizations.
- `docs/architecture.html`: illustrated guide to the whole system (served at `/docs/architecture.html`).
- `README.md`: overview, controls, running the model.
- `docs/persistence.md`: saved simulations: option study (SQLite WASM vs Turso vs IndexedDB), schema, worker, versioning, measurements.
- `docs/realism-roadmap.md`: realism objectives O1–O12 and the proof standard; `IMPLEMENTATION_PLAN.md` tracks the current program (stages, owners, sequencing).

## Open issues

- Startup: the old ~470 ms stall was the first rendered frame recompiling ~50 programs (warm-up compiled them against the screen and without the IBL, but frames render into the MSAA target with the environment map) plus ~210 ms of per-program info-log reads. Now: warm-up compiles against the real target after a state-only frame, program first use is spread over frames, and the loading screen stays up until the first frame. The first frame still takes ~130–250 ms (shadow depth and post programs compile synchronously) behind the loading screen; `createScene` is one ~500 ms task before it.
- GPU at devicePixelRatio 2, quality high, after the graphics pass (B4): overview ~11.6 ms, close ~10.0 ms, cinematic ~12.6 ms, night close ~12.9 ms per frame on an M3 Pro (measured while sharing the GPU with a training job). Cinematic and night still exceed the ≤ 11 ms target. Auto-quality steps down after 3 s under 40 fps or over 30% dropped frames, and steps back up after 20 s of headroom, once.
- At 120 living, 1 day/s is sim-limited to about 0.8 day/s (the adaptive tick budget keeps 60 fps instead of overrunning frames).
- UI layout: left column (field log, range map), right sidebar (`.rside`: Communities, Society, Experiments, Model; one pane refreshes at a time) and the bottom chimp panel (`.chimp-panel`, `src/ui/inspector.ts`; its tab body renders only while expanded). The scene's keep-clear insets include the bottom panel (`app.ts` `queueLayout`). The chimp snapshot is a rendered picture read back from the GPU (`render/creatures/portrait.ts`): the readback can cost one long frame when the GPU is saturated, so it is requested rarely and never at quality 'low'.
- UI refresh (`?perf=1`, RTS, 1440×900 at dpr 2): ~0.07 ms per frame at 1 min/s and ~0.1 ms at 1 day/s, worst frame ~1.5–2 ms, no forced layouts. DOM churn: 0 nodes/s at 1 min/s, ~115 nodes/s at 1 day/s (field-log turnover); `window.__MGOGO_UI__.mutations()` counts it. The ~40–50 style recalcs/s are mostly the 3D label overlay's per-frame transforms, not the panels.
- Lockstep throughput is about 5.7 simulated min/s with 1 model-driven chimp, and about 2.3 with 6.
- The model agrees with the rules about 40–65% of the time and leans toward social options.
- Off-target metrics (default `scripts/sim-metrics.ts` run, seeds 48, 7, 21; see `docs/simulation.md` §18):
  - intergroup encounters 47 per community-year (compressed) vs ~8 at Kanyawara; the field profile gives ~5–10 through the observer, but a community pair whose ranges drift within earshot (1 km) records a heard contact almost daily, so single seeds can reach hundreds (docs/simulation.md §18)
  - no killings in 9 community-years: plausible at the median field rate (happens ~half the time); use experiments or 1 day/s to see conflict
  - activity budget (compressed): travel 5% of daylight vs 12–25%, male grooming 23% vs 8–18% (male feeding 41% is within 33–50%)
  - e15 33.9 / 19.7 y vs Ngogo 35.1 / 21.0
  - life-course mode needs 14.1 cycles per conception vs ~4 targeted (3.1 at natural aging)
- The 160 m compressed map compresses space (daily travel ~2 range diameters instead of ~0.4); the field profile fixes the ratios (docs/simulation.md §22).
