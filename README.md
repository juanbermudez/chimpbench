# ChimpBench

ChimpBench (formerly MGOGO) is a 3D eastern-chimpanzee society in a synthetic Kibale-like rainforest, and a live demonstration of a local decision model (GLiNER2.5-Decide) choosing what a chimp does next from the state it perceives. Three communities with dominance hierarchies, alliances, kinship, fission-fusion parties, territorial patrols, hunting, mating, births and deaths, under a real day/night cycle and seasonal weather.

Environment variables, debug hooks and browser storage keys keep the `MGOGO` prefix on purpose, so settings, saves and scripts keep working.

## Run

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [the forest](http://127.0.0.1:5173) and [the science and architecture guide](http://127.0.0.1:5173/docs/architecture.html). `pnpm dev` starts one resident GLiNER2.5-Decide worker (see below); set `MGOGO_NO_MODEL=1` to run without it.

```sh
pnpm test                      # simulation, clock, decision loop and server validation (node:test)
pnpm build                     # typecheck + production build
node scripts/verify-browser.mjs  # end-to-end check against a running `pnpm dev` (real model); add --no-model for a MGOGO_NO_MODEL=1 server
pnpm exec tsx scripts/bench-sim.ts
```

## What you are looking at

- **Communities, not troops.** Chimpanzees live in communities that split into temporary parties. West is large (7 adult males), East and North are smaller: an imbalance of power, as between Ngogo and its neighbors.
- **The good and the bad.** Grooming, play, reconciliation, consolation, meat sharing, mothers carrying infants. Also displays, charges, fights, redirected aggression, coercion of cycling females, silent border patrols, and rare lethal gang attacks and infanticide.
- **Hierarchy.** Male rank is a progressive Elo score updated by decided contests. Alphas rise with coalition support and are usually deposed alive. Female rank follows age and tenure.
- **Kinship.** Mothers, maternal siblings and genetic sires are recorded. Females transfer between communities in adolescence; males stay.
- **Scale.** A new world is the field profile: about 8 km across in real metres, with the three communities' ranges at field sizes. It opens in a low close view on the West alpha at dawn; zoom out (or press `R`, then Reset camera) for the whole map. The 160 m compressed map is still there: Simulations › New › Compressed, or `?profile=compressed`. Saved simulations keep their own profile.
- **Environment.** Kibale's two wet seasons, afternoon storms, 15–24 °C, a real sun path near the equator, moon phases, night nests in the canopy, and a stream crossed only at fords.

## Time

Every chimp runs every 15-second ecological tick at every speed. Faster playback runs more ticks per frame; it never enlarges the tick. Presets: 1 min/s, 10 min/s, 1 h/s, 6 h/s, 1 day/s, and Max (as many ticks as fit in the frame: about 65% of the frame, minus render and UI time, adapted to 60 or 120 Hz). The time bar shows the achieved rate and says when the simulation, not the preset, is the limit. The default world simulates a day in about 0.13 s in Node (Apple M3 Pro). Animals are drawn between the last two ticks, so motion stays continuous at every speed.

Settings also offer a life-course clock (one biological year per ecological day) for watching generations. Behavior stays on ecological time; this separation is an experimental control, not a biological claim.

## The decision loop

1. At a decision point (scheduled, or interrupted by an event such as being charged, hearing strangers, or rain), the simulation builds a private percept with `observe()`. It holds the chimp's body state, rank, mood and personality, the time and weather, and up to 8 perceived individuals with relation, rank, bond and activity. It also holds recent memories and any experiment it can perceive.
2. Code enumerates the legal actions and targets. The bridge offers at most 8, always including the rules' own pick and any response to an active stimulus.
3. GLiNER2.5-Decide scores the options (~500 input tokens, ~0.25–0.4 s on Apple-silicon MPS). The server validates the request and the answer, and logs receipts to `artifacts/local-decide-receipts.jsonl`.
4. Code re-checks legality before applying. A late answer is still applied if the move is still legal ("applied to newer state"), otherwise it is discarded. Rules take over when the model is late, loading or failing.

Model policies:

- **Off:** rules decide for everyone.
- **Async:** the world keeps running and rules fill in when the model is late.
- **Lockstep:** the clock stops at each model decision point until GLiNER answers or a 6 s timeout falls back to rules.

The roster is the selected chimp, a focal set (each alpha, a mother with an infant, a juvenile), or everyone.

The **Mind** tab shows each decision as SAW → OPTIONS → GLiNER vs RULES → APPLIED, with the full distribution and the complete percept.

**Field experiments** change the world the model perceives:

- stranger pant-hoot playback (after Wilson, Hauser & Wrangham 2001)
- a snake model (after Crockford et al. 2012)
- a fig mast
- a storm
- a drought
- removing the alpha
- a red colobus group arriving

The Mind tab then shows the before/after decision.

Model scores are softmax scores, uncalibrated for chimpanzee behavior. A working inference path is engineering evidence, not biological validity.

## Local GLiNER2.5-Decide

- **Model:** `fastino/GLiNER2.5-Decide`, revision `7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6`.
- **Worker:** `~/Desktop/GHN/experiments/active_perception/decide_provider.py`, identity-checked by source hash and never modified.
- **Interpreter:** `~/Desktop/GHN/data/raw/decide-env/bin/python`.
- **Device:** MPS with FP16. Set `MGOGO_DECIDE_DEVICE=cpu` to force CPU; CPU speed is unverified. Path overrides are in `.env.example`.

## Controls

- **Mouse:** drag to pan, right-drag to orbit, scroll to zoom. Click a chimp, roster entry, event or minimap point to select.
- **Playback:** Space pauses; `1`–`6` pick speeds.
- **Camera:** `F` focuses, `C` toggles close view, `V` toggles the cinematic director, `R` returns to the overview (strategy view). The overview shows a map scale bar; Reset camera frames the whole map.
- **Range map:** the camera menu (views, Reset camera) and the layer toggles run across its top; hover a control for what it does. Scroll or pinch over the map to zoom (1–8×), drag to pan when zoomed; with the map focused, `+` `−` zoom and `0` shows the whole map.
- **Panels:** `T` opens the society overlay (kinship forest, dominance ladders, bond network, alpha history). `E` opens experiments, `M` the model panel, `I` the inspector. `L` toggles labels. `[` and `]` cycle chimps. Esc closes.
- **Sound:** starts on your first click or key (browser autoplay rule). `S` or the speaker button mutes; Settings › Sound has Master, Ambience, Animals and Weather volumes.
- **Simulations:** the name in the menu bar opens Simulations (new, open, rename, duplicate, delete, export, import). `Ctrl`/`⌘`+`S` saves now.

## Sound

Spatial, simulation-driven audio (`src/audio/*`, Web Audio). The listener stands at the camera's focus and turns with the camera, so panning and distance match the screen. Calls play when the simulation emits them (`world.calls`) or when a salient interaction starts (fights, chases, play, alarms, displays), at each caller's position, with distance loss and air/foliage low-pass. Animals are full in the close and cinematic views and fade out as the overview zooms out, leaving the ambience. Beds follow the clock and weather: dawn and dusk bird choruses, night insects, rain, storm with delayed thunder, and the stream by proximity. At 10 min/s calls are subsampled, at 1 h/s only choruses and nearby screams play, and from 6 h/s only ambience.

- **Assets:** `node scripts/build-audio.mjs` rebuilds `public/audio/` (≈7 MB of AAC) from the Epidemic Sound files in `~/Downloads`. `public/audio/SOURCES.md` lists every clip's source, span, species and classification confidence.
- **License:** Epidemic Sound, licensed to the user's subscription. Do not redistribute the raw files or deploy the build publicly without checking the license.
- **Species and sites:** chimpanzee voices are library clips of unknown site. Files labelled "Bonobos" are a different species (higher-pitched, no pant-hoot) and are used only behind Settings › Sound › "Fill gaps with bonobo recordings", off by default. The birds and rain were recorded in the Andaman Islands and the storm in the Himalaya: stand-ins for Kibale. Buttress drumming and laughter are synthesized; `alarm-hoo` uses single hoos cut from whimper recordings (a proxy); per-individual pitch is a stylization.
- **Checks:** `node scripts/audio-probe.mjs` records the output losslessly in fixed scenarios (needs `?audiodebug=1`, done by the script) and reports loudness, true peak and dropouts.

## Saving

Reloading the page brings back the last simulation where you left it, **paused** (Space continues). The world, the decision loop's counters and its 50 newest traces, and the view (selection, tab, layers, speed) are saved as one gzip JSON snapshot in an SQLite file in the browser's private storage (OPFS), through the official SQLite WASM build in a worker (`src/persist/*`; design and measurements in `docs/persistence.md`).

- **Autosave:** every minute while the tab is visible, when you leave the tab or close it, and before switching simulations. Each simulation keeps its 3 newest autosaves plus every manual save. Saving does not hitch the frame loop: the snapshot is serialized in time-budgeted slices (about 3 ms of main-thread work per frame) while the clock holds, then encoded, compressed and written in the worker.
- **Simulations menu:** the name in the menu bar. New (with seed and name), open, rename, duplicate, delete, export one simulation (`.chimpbench.json.gz`) or all of them (`.sqlite3`), import either (also older `.mgogo.json.gz` exports and the old Settings › Export JSON). The dot next to it says "Saved 12 s ago", "Saving…", or why it is not saving.
- **Where saves live:** this browser profile, per site address (`127.0.0.1:5173` and `localhost:5173` are different). Export to back up or move them. "Keep saves" asks the browser not to clear them under storage pressure.
- **One tab at a time:** a second tab shows "open in another tab" and runs unsaved; "Use this tab" asks the first tab to save and hand over.
- **Old saves:** while the simulation's state layout keeps changing, saves from an older layout are marked incompatible: listed, exportable, but not openable by this build.
- **Debug URLs:** `?seed=N`, `?pop=N` and `?fresh=1` open an unsaved scratch world (field profile; Simulations › Save as simulation keeps it); `?profile=compressed` or `?profile=field` opens an unsaved world of that profile; `?perf=1` and `?persist=0` turn saving off.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/types.ts` | Shared plain-data contract: World, Chimp, Troop, DecisionContext, SceneAPI |
| `src/simulation.ts`, `src/sim/*` | Seeded ecology, weather, perception, candidates, hierarchy, conflict, reproduction, parties, calls, stream, interventions, `observe()` |
| `src/clock.ts` | Fixed ticks, speed presets, frame budget, lockstep gate |
| `src/decision.ts`, `server/decide.ts`, `server/local-worker.ts` | Roster, queue, traces, validation, prompt packet, resident model process |
| `src/scene.ts`, `src/render/env/*` | Sky, lighting, weather, terrain, vegetation, stream, territory, cameras, post-processing |
| `src/render/creatures.ts`, `src/render/creatures/*` | GPU-skinned procedural chimps, poses, FX, labels, nests, colobus, selection |
| `src/main.ts`, `src/ui/*`, `src/style.css` | HUD, inspector, family trees, hierarchy, society overlay, experiments, model panel |
| `src/persist/*`, `src/ui/simulations.ts` | Saved simulations: envelope and determinism, SQLite schema, store worker (opfs-sahpool), autosave, Simulations menu |
| `src/audio/*`, `scripts/build-audio.mjs` | Spatial sound engine (beds, voices, thunder, zoom mix), pure mixing math, synthesized drum/laugh; asset pipeline |
| `docs/simulation.md` | How the simulation works: tick pipeline, state, actions, mechanisms, parameters, validation, extension recipes |
| `docs/research.md`, `docs/architecture.html` | Evidence, citations, stylizations, validation status; illustrated system guide |
| `AGENTS.md` | Working notes for coding agents: commands, invariants, conventions, gotchas |

Harness pages for isolated visual work: `/src/render/env/harness.html`, `/src/render/creatures/harness.html`, `/src/ui/preview.html`.

## Scientific scope

This is an uncalibrated model informed by primary research. It is not a reconstruction of Ngogo or Kanyawara and not a prediction of chimpanzee behavior.

Measured with `pnpm exec tsx scripts/sim-metrics.ts` (defaults: 365 days natural aging, 40 years life course, 4 weather years, each × seeds 48, 7, 21; full table in [docs/simulation.md §18](docs/simulation.md#18-validation)).

**Near published values** (several are tuning targets, not independent checks):

- population stable over a year (49 → 52–53)
- a patrol every 13.2 days per community (Ngogo ~9.7), from an hourly hazard that rises with adult males and with time since the boundary was last visited (stage C6)
- 11.4 hunts per community-year, 34% successful, every capture by 3 or more hunters
- reconciliation after 17% of decided conflicts (wild 14–22%)
- interbirth interval 5.13 years (Gombe 5.15), age at first birth 14.9 years (Gombe 14.9), first-year mortality 0.16 (Ngogo 0.15)
- alpha tenure 4.0 years, 70 of 90 alphas deposed alive; rainfall ~1,650 mm/yr, 15–24 °C

**Off target:**

- intergroup encounters: 47 per community-year (22–78 per seed) against ~8 at Kanyawara, and 71% heard only against 85%; the compressed map puts ranges within earshot
- killings: none in 9 community-years, likely too few even for communities this small
- adult males feed 37% of the day, below the ~45–55% design target; females 54%
- life expectancy at 15 is 32.6 years (females) and 19.5 (males), 1.5–2.5 years below Ngogo
- life-course mode needs 12.9 cycles per conception instead of the ~4 targeted (3.7 at natural aging), because a cycle passes in ~2.4 ecological hours

**Deliberately stylized:** the 160 m map compresses space, so daily travel covers about 2 range diameters instead of ~0.4; life-course mode uses proxies for events that don't fit its compressed clock.

`docs/simulation.md` documents every mechanism and parameter; `docs/research.md` lists evidence levels, citations and known limits.
