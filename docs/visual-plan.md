# Visual upgrade plan: fluid, natural animals and a living forest

Status: Stages 1–5 implemented (28 Sep 2026) with the deviations recorded per stage and in §9; Stage 6 is out of scope by user decision (no downloads, no encoder, no WebGPU spike). Author: rendering/animation TD pass, 28 Sep 2026.
Scope: animal animation and locomotion, creature surface, water, ground and textures, vegetation, lighting and atmosphere, camera, platform.
Binding rules: `AGENTS.md` invariants apply to every item. The renderer never writes `World`. No `Math.random` in `src/sim`. 60 fps at 1440×900. No new npm dependencies. Evidence labels on biology-derived constants. Label stylizations.

---

## 0. Re-validate before implementing

A performance agent was changing `src/sim`, `src/clock.ts`, `src/main.ts`, `src/scene.ts` and `src/render/**` while this plan was written, and a UI agent was restyling `src/ui` and CSS. Check each item below first and adjust the stages.

- [x] **Render-time interpolation.** Confirmed: `creatures/playback.ts` (perf agent) keeps 6 frame-end samples per animal and a render time one tick behind. Stage 1 added a `lagTicks` parameter (the creature layer uses 2, so the drawn segment always has samples on both sides) and `creatures/motion.ts`, which evaluates the same history as a monotone cubic. At 14:09 the perf agent had added `subTick(clock)` in `clock.ts`, `SceneFrame.subTick`, and a per-animal history ring in `creatures.ts` (`HIST = 6`, `sampleHistory`, `interpolate`, `interpolateAll`, `renderT` and `lagH`). The ring is linear, with elevation `iy` included. Confirm its final shape. Stage 1 builds on it and does not duplicate it (see §A1).
- [x] **Elevation popping.** Gone: elevation is part of the C1 path. Climb |Δy| per frame p99/median = 1.98 (C6 criterion ≤ 2×). Before that change, `placeGrounded` read `chimp.position[1]` directly, so climbs and nest ascents stepped once per tick (`seq-climb-sheet.png`). It now reads `a.iy`. Re-run the climb acceptance scene (C6) and drop the item if it is smooth.
- [x] **Sim in a Web Worker?** No: the sim stays on the main thread; `World` is read directly. If the sim moved off the main thread, find out how chimp state reaches the renderer: per-tick snapshot, `SharedArrayBuffer`, or structured clone. `creatures.ts` reads about 30 `Chimp` fields directly. The motion history must then be fed from snapshots. Rendering itself stays on the main thread (§H2).
- [x] **Frame pacing.** `main.ts` and the env harness already used rAF timestamps; the creature harness now does too. The env harness now passes `subTick` (it rendered stair-stepped playback before). Confirm that `scene.update` gets `dt` from the rAF timestamp. The env harness (`src/render/env/harness.ts`) and creature harness (`harness.ts`) use `performance.now()` inside rAF. That produced alternating 1.25 / 5.0 m/s speed spikes in my probe whenever a frame dropped. Fix the harnesses (Stage 1, item 1) if the perf agent has not.
- [x] **Startup stall.** LOD meshing moved to a worker by perf. Nothing here adds startup geometry work; the shell mesh starts on the coarse proxy so its program is in the warm-up compile. Surface-nets meshing takes about 412 ms for LOD0 and about 164 ms for LOD1 on the main thread (measured with tsx on an M3 Pro), scheduled 60 ms after start. This is the likely cause of the "~470 ms stall after load" open issue. Check whether perf moved it to a worker or idle slices. Nothing in this plan may add main-thread geometry work at startup.
- [x] **New baseline.** `artifacts/perf/after-*.json` (perf pass) is the baseline: every quick scenario at 60 fps, storm and night included. Re-run `node scripts/perf-probe.mjs --scenarios quick --dpr 2` on an idle machine. The baseline taken on 28 Sep 17:50Z (`artifacts/perf/baseline-quick.json`):

  | Scenario | fps |
  | --- | --- |
  | rts-1x-day | 59.6 |
  | close-1x-day | 56.3 (6.4% dropped frames) |
  | cinematic-1x-day | 60 |
  | rts-1x-night | 41 |
  | rts-1x-storm | 15.9 |

  Night and storm are GPU-bound. Replace the §2 numbers with fresh ones.
- [x] **GPU timing.** Measured wrong on this machine: `TIME_ELAPSED` queries return wall-clock-like values (20+ ms for a 60 fps frame, negative subtractions) and `gl.finish()` bracketing returns 0.4–0.9 ms for a full frame. `scripts/gpu-probe.mjs` instead uncaps the frame rate (`--disable-gpu-vsync --disable-frame-rate-limit`) on a frozen harness frame and subtracts frame intervals (±1 ms repeatability). Full frames are GPU-bound at 12.6–15.9 ms, so headroom at 60 Hz is only 1–4 ms. `perf.ts` `createGpuTimer` uses `gl.finish()`, which blocks and measures CPU-visible time. On this machine (Chrome, ANGLE Metal, Apple M3 Pro) `EXT_disjoint_timer_query_webgl2` is available (verified). Use non-blocking `TIME_ELAPSED` queries for per-subsystem budgets (Stage 1, item 1).
- [x] **Contracts.** Additive only: `Chimp.carryingDeadId?` (types.ts), `CreatureFrame.quality?`, `CreatureContext.trunkAt? / waterEdge? / ripple?`, `CreatureLayer.bendSources?`. Diff `src/types.ts` (`SceneFrame`, `SceneAPI`), `CreatureFrame` and `CreatureContext`. Keep all additions optional and additive.
- [x] **UI layout.** Labels restyled at the source to the UI tokens; label CPU unchanged (0.03–0.11 ms mean). Check the UI agent's new panel insets (`setInsets`) and label overlay. Labels cost 0.9 ms (RTS 1×) and 3.7 ms mean (RTS 1 day/s) of CPU. Don't regress them.
- [x] **Versions.** three 0.186.1, no new dependencies. Three is still `0.186.1` and the dependency list is unchanged. Re-read `AGENTS.md`.

**Assumptions that depend on the perf agent's outcome**

| Assumption in this plan | If true | If false |
| --- | --- | --- |
| The interpolated sim point per animal (`ix/iy/iz`) exists and lags about 1 tick | Stage 1 derives a smooth velocity and gait from it | Stage 1 item 3 implements the history ring itself, as the perf agent sketched |
| `World` objects are readable on the main thread each frame | Creature code reads `Chimp` fields as today | Add a tick snapshot adapter first (a Stage 1 prerequisite) |
| rts-1x-storm and night are fixed to 60 fps by perf | The §2 budgets hold | Weather and fireflies get cut before any new GPU work lands |
| Per-frame allocations are removed in `creatures.ts` | New code must keep that at zero | Same rule. New code must not add any |

---

## 1. Current state

Screenshots from this pass are in the session scratch folder `/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/f5af9b78-d6c6-47d0-abc3-1895e50c3362/scratchpad/visual-plan/`, abbreviated `S/` below. The folder may be deleted, so Stage 1 re-captures everything to `artifacts/visual/before/`. I captured them at 1440×900 in headless Chrome (Metal) on no-model servers, port 5188 for the app and 5189 for the creature harness.

**Worth keeping:**
- Procedural rig with analytic two-bone IK (`rig.ts`)
- About 45 clips with face channels (`poses.ts`)
- Instanced GPU skinning from a float texture, with 3 LODs, a shadow proxy and x-ray silhouettes
- Crown-coherent foliage normals with alpha-to-coverage
- Global fog, mist and sky with PMREM
- Cutaway system
- Night mood and storm look (`S/rts-night.png`, `S/rts-storm.png`)
- Cinematic director scaffolding

**Most visible problems, ranked by impact:**

1. **Chimps read as brown clay or knitted plush, not black fur.** Warm brown hue with torso crop R/B = 1.57 in the cinematic shot and 2.49 on the adult ♀ 30 face tile. Flat sheen: 95th-percentile / median luminance is 1.4–1.65. At close range the strand noise shows as a crosshatch "knit". There is no silhouette fuzz. Irises are saturated glowing orange. Hands and feet are pale mittens. See `S/cinematic.png`, `S/close-fur-11h.png`, `S/cr-faces.png`.
2. **Water.**
   - Close views look like bright cyan glass. The ford crop averages RGB 51, 78, 78, with a radial "brushed-metal" smear at bends and fords. Cause: UV `lp = (dot(world, side), arcLength)` with a per-vertex `side`, plus about a 13× `envBoost` in perspective.
   - Hard sheet edges, no shoreline wetness band, no foam around the ford stones.
   - From the strategy camera the stream reads as a dark road or trench.
   - See `S/water-ford-10h.png`, `S/cinematic.png`, `S/env-rts-9h.png`.
3. **Locomotion is procedural but not grounded.**
   - Feet plant on a flat body-space plane, with the whole body pitched to 4 terrain samples. There is no per-foot terrain contact.
   - Gait timing is fixed at limb phase 0.75 for every animal.
   - Crossfades freeze the outgoing pose (`copyPose(from, out)`, then a 0.32 s smoothstep), so legs stop mid-stride during transitions.
   - The walk/stand switch has no hysteresis.
   - Turns rotate planted feet (they skate).
   - Every animal under 25 px is posed at 12 Hz (`interval = 1/12`). That covers most animals at the default RTS zoom (about 17 px), so gallops look choppy.
   - `idleHead` sine drift reads as a bobblehead.
   - All animals blink on the same fixed 4.3 s period.
4. **Arboreal contact is missing.** Climbers hover beside the trunk with no hand or foot contact (`S/seq-climb-sheet.png`). Perches use straight stick props. There is no mount or dismount move. Elevation stepping is now interpolated by perf (verify).
5. **Paired interactions** have correct layouts but approximate contacts.
   - `partnerPoint` works from the partner's root, not its bones.
   - Groom is nearly static (`S/seq-groom-sheet.png`).
   - Wrestling and attack are periodic sines.
   - Infant riders are bolted rigidly to the mother's spine bone (`S/seq-walkc-sheet.png`).
6. **Ground and understory repetition.**
   - The canvas-painted litter visibly tiles.
   - Identical herb tufts at uniform density.
   - Lianas are candy-striped, because the world-Y bark UV is applied to slanted tubes.
   - The cutaway fade shows a halftone screen-door (`S/close-fur-11h.png`, `S/cinematic.png`).
7. **Fruit** shows as large low-poly red blobs in perspective views (`S/seq-groom-sheet.png`).
8. **Exposure.**
   - Dusk under canopy is close to black (`S/water-ford-dusk.png`).
   - Rain produces a blown-out white specular patch on wet ground (`S/water-ford-rain.png`).
   - There is no eye adaptation.
9. **Camera.**
   - The close follow can end up behind a trunk (`S/seq-follow-sheet.png`, frame 6).
   - A cinematic shot cut its subject off at the frame edge (`S/cinematic.png`).
   - Play bouts make the close framing lurch.
10. **Motion at time-lapse speeds.**
    - `WALK` = 0.04 m/s eco renders at 2.4 m/s at 1 min/s, which is 1.6× a natural walk at `RENDER_SCALE` 1.5.
    - `RUN` = 0.3 m/s eco renders at 18 m/s at 1 min/s, so every charge or flee is beyond any real gallop even at 1×.
    - At 10 min/s, sim bursts of 3 ticks play as 70–130 ms lurches (motion probe: 0 → 9.3 → 10.4 → 0.1 → 10.4 → 5.4 → 0 m/s). This is truthful playback of the sim, but the gait system has no representation for it.

**Frame-sequence evidence:**
- `S/seq-walk-sheet.png`, `S/seq-walkc-sheet.png`: walk with a dorsal rider
- `S/seq-gallop-sheet.png`: charge
- `S/seq-play-sheet.png`, `S/seq-groom-sheet.png`, `S/seq-follow-sheet.png`: app close view
- `S/seq-wind-00..04.png` plus `S/seq-wind-diff.png`: at wind 1, dappled shadows swim across most of the floor
- `S/rows60.json`, `S/rows600.json`: motion probe dumps from before the perf interpolation
- `S/rows-new-600.json`: after it

---

## 2. Principles and budgets

**Principles**

1. **Motion before surface.** Grounded, continuous motion reads as "alive" from every camera. Materials only matter up close.
2. **Positions are authoritative.** The renderer may delay (the interpolation lag), smooth velocity and offset layout. It never lets an animal drift from where the sim says it is by more than the pairing and separation offsets allowed today.
3. **Truthful time-lapse.** Above natural speeds, show locomotion as time-lapse: capped cadence, unlocked feet, optional smear. Don't slow animals down or invent paths.
4. **Pay for it.** Every new GPU feature lands with its measured cost and a quality-tier gate. GPU-bound scenes (storm, night) get no new always-on cost.
5. **Pure logic in testable modules.** Gait, foot lock, springs, inertialization, flow bake and expression mapping go in modules without DOM access, unit-tested with `node:test`.
6. **No per-frame allocation.** Use scratch objects, typed arrays and instancing (AGENTS rule).

**Frame budget, 'high' tier, Apple silicon (M3 Pro class)**

Viewport 1440×900 CSS, DPR 2. The drawing buffer is 1944×1215 at pixel ratio 1.35, with 4× MSAA. These are targets. I could not measure GPU costs reliably because about 26 other headless Chrome instances were loading the GPU at the same time. Timer-query subtraction gave inconsistent results, for example removing creatures appeared to *raise* GPU time. Re-measure on an idle machine in Stage 1.

| Subsystem | GPU ms target (high) | CPU ms target | Notes |
| --- | --- | --- | --- |
| Shadow map (4096, foliage + proxies) | ≤ 2.5 | — | Wind vertex work is paid twice (color and shadow passes) |
| Terrain, rocks, logs, far canopy | ≤ 1.5 | — | Hex-tiling adds about 0.4–0.8 (estimate) |
| Vegetation color (crowns, midstory, understory, near field, fruit) | ≤ 4.0 | ≤ 0.3 | RTS draws about 1.8M triangles, close view about 2.7M |
| Creatures (LODs, shells, x-ray, props, FX) | ≤ 1.5 (shells ≤ 0.5) | ≤ 1.2 mean / 2.0 p95 (`anim` + `creatures`) | Current CPU: creatures 0.8–1.5 ms mean, anim 0.27–0.32 ms |
| Water | ≤ 0.5 | ≤ 0.05 | |
| Weather (rain, splashes, fireflies, shafts) | ≤ 1.0 in storm | ≤ 0.1 | Storm is currently the worst scene (15.9 fps) |
| Post: GTAO (half-res), bloom, output/grade/exposure | ≤ 1.8 | ≤ 0.1 | Close/cinematic adds contact shadows ≤ 0.4. Cinematic adds DoF ≤ 1.0 |
| Headroom | ≥ 1.5 | ≥ 8 (sim + UI) | Total GPU ≤ 13.5 ms p95 |

**Memory:**
- New GPU textures stay within 24 MB with procedural assets. Ground array: 6 layers × 512² × 2 maps × 4 B × 1.33 mips ≈ 17 MB. Flow map 0.5 MB, ripple atlas 0.3 MB.
- The optional CC0 asset path (Stage 6) stays within 24 MB only if it uses KTX2/ASTC. As JPG decoded to RGBA8 it would be about 84 MB.
- Procedural bakes at load: ≤ 150 ms total, sliced into ≤ 8 ms chunks after the first rendered frame.

**Quality tiers (new features only)**

| Feature | high | medium | low |
| --- | --- | --- | --- |
| Foot/hand planting | LOD0 + LOD1 | LOD0 | off |
| Pose rate for moving animals | ≥ 20 Hz | ≥ 20 Hz | 12 Hz |
| Fur halo shells | 3 (LOD0; LOD1 in cinematic) | 1 (LOD0) | off |
| Hex-tiling ground | 3-tap | 1-tap plus random rotation | 1-tap |
| Flow-map water | 2-phase + ripples + caustics | 2-phase + ripples | 1-phase |
| Hierarchical wind + gust fronts | full | full | trunk + crown only |
| Plant interaction bending | 32 animals | 16 | off |
| Exposure adaptation | on | on | on (cheap) |
| Contact shadows (close/cinematic) | on | off | off |
| Cinematic DoF | on | off | off |
| Impostors (conditional) | far trees | far trees | far trees + fewer cards |

---

## 3. Recommendations by area

Verdicts: **Adopt** (do it), **Adapt** (do a cheaper variant), **Reject** (don't, for now). The references in brackets are listed in §8.

### A. Locomotion and animation

| # | Technique | Verdict | Why it fits | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Sim-sample history with delayed playback | **Adopt (done by perf; extend)** | Exact positions at any speed. Extend with a C1 velocity: centripetal Catmull-Rom over the last 4 samples, or a critically damped velocity filter. That stops heading and gait speed kinking at every tick | Removes 4 Hz direction kinks at 1 min/s; gait speed stays steady | CPU < 0.05 ms | Low | `creatures.ts` (perf's `interpolate`), new `creatures/motion.ts` | [R4] |
| A2 | Distance-driven gait phase + stride warping + speed regimes | **Adopt** | The phase currently advances by frequency. Driving it by distance makes stance feet match ground speed by construction. Warp stride up to 1.6× nominal, then raise cadence to the gait cap [R1]. Three regimes (natural, warped, time-lapse) with hysteresis | No sliding at natural speeds; readable time-lapse | < 0.05 ms | Low | new `creatures/gait.ts`, `poses.ts` (`quadGait`, `bipedGait`, `climbCycle`) | [R1][R4] |
| A3 | World-space foot/hand planting with per-contact terrain height | **Adopt** | IK exists (`solveLimb`). Add a lock-at-touchdown state machine, a swing arc to the predicted touchdown, `ctx.groundHeight` per contact (bilinear lookup, not a raycast) and pelvis lowering. LOD0/1 only | Feet stick on slopes and during turns; the biggest "grounded" win | About 0.03 ms for 60 animals | Medium (IK targets now world-space) | `gait.ts`, `rig.ts` (target space), `creatures.ts` wiring | [R4][R2] |
| A4 | Inertialized transitions | **Adopt** | Replaces the frozen-pose crossfade. The pose is one flat `Float32Array`, so per-channel quintic decay of offset and velocity [R2] is trivial and cheaper than two-clip blending. Per-transition durations of 0.15–0.6 s | No mid-stride freezes; snappy but smooth changes | About 0.02 ms | Low | new `creatures/secondary.ts`, `creatures.ts` `evaluatePose` | [R2] |
| A5 | Phase-synced walk↔gallop and start/stop | **Adopt** | Keep `phase` continuous and blend footfall offsets over one cycle. A stop settles on the next planted pair (distance matching [R1]) | Clean gait changes | Negligible | Low | `gait.ts` | [R1] |
| A6 | Turning: in-place stepping, spine lead, banking | **Adopt** | A stationary turn over 25° runs a short step cycle. Chest yaw leads the hips. Roll proportional to v·ω, clamped to ±0.12 rad (design assumption) | Kills skating on turns | Negligible | Low | `gait.ts`, `creatures.ts` `bodyFrame` | [R4] |
| A7 | Spring-damper secondary motion | **Adopt** | Holden-style critically damped springs [R3]. Head lags chest acceleration. Small belly/chest mass on adults. Infant rider offset spring. Breathing rate follows a renderer-side exertion accumulator (charge, flee, display) with a 60 s decay | Weight and life | < 0.05 ms | Low | `secondary.ts` | [R3] |
| A8 | Attention system: look-at with limits, eyes lead head, saccades, stochastic blinks | **Adopt** | Replace `idleHead` sines with hold-and-shift look targets. Priority: partner, heard call within 20 m and 5 s (`world.calls`), dominant within 6 m, snake stimulus, idle scan. Hold 1.5–6 s, turns in 0.25–0.4 s. Irises shift in the shader: needs one more param texel (`ROW_TEXELS` 128 → 132; all 128 are used today). Blinks every 2–10 s, 15% double blinks | Removes the bobblehead; faces look alive | < 0.05 ms, 1 texel per animal | Low | `secondary.ts`, `material.ts`, `rig.ts` (`ROW_TEXELS`) | [R4] |
| A9 | Facial expression set grounded in ChimpFACS | **Adopt** | Faces already have mouth, funnel and grin channels. Add brow raise and lower, lip-smack (grooming), compressed lips (tension), pout (whimper), and relaxed open-mouth play face (upper teeth covered) vs full play face. Parr et al. validated 6 of 9 expression categories by muscle action [R10] [M] | Readable social states up close | Negligible | Low | `poses.ts` (`vocalOverlay`), `rig.ts` (brow), `material.ts` (teeth mask) | [R10] |
| A10 | Pair choreography: contact IK on partner bones, shared pair clock, approach → settle → engage → release | **Adopt** | Hand targets come from the partner's *actual* bone points (`boneWorld`, receivers evaluated first). A shared clock syncs groom strokes, wrestle role swaps and fight blow and hit-react timing | Contacts land; fights and play read as exchanges | About 0.1 ms | Medium (evaluation order) | new `creatures/choreo.ts`, `creatures.ts` pairing | [R4] |
| A11 | Arboreal realism | **Adopt** | Details in the next table | Climbers touch trees | Low | Medium | `poses.ts` `climbCycle`, `creatures.ts` `placeGrounded`, `vegetation.ts` `branchAnchor` | [R7][R8] |
| A12 | Blend trees | **Adapt** | Only 1D speed blends inside a gait (walk ↔ fast walk). The clip library plus inertialization covers the rest | Smoother speed ramps | Negligible | Low | `gait.ts` | — |
| A13 | Motion matching ("lite") | **Reject** | There is no mocap database, and procedural clips are already parametric. Clavet-style matching needs data [R5]. Revisit only if mocap assets are ever licensed | — | — | — | — | [R5] |
| A14 | Moving pose rate floor | **Adopt** | Moving animals get at least 20 Hz; stationary animals under 25 px keep 12 Hz. Round-robin by slot to flatten spikes | Gallops read smoothly from RTS | +0.1–0.15 ms | Low | `creatures.ts` LOD loop | — |

**Chimpanzee-specific motion facts to encode.** Add the sources to `docs/research.md` first, then tag the constants.

| Fact | Use | Label | Source |
| --- | --- | --- | --- |
| Great apes do not favour diagonal-sequence walking. They shift between diagonal and lateral sequences, and size-adjusted speed is the strongest predictor of gait variables | Per-individual limb phase in about 0.45–0.70 with a slow per-stride drift of about ±0.05, instead of a fixed 0.75. The current comment "diagonal sequence" should be reworded | [M] (captive, zoo) | Finestone et al. 2018 [R6] |
| Vertical climbing in chimps: lateral-sequence gaits 58%, diagonal sequence 23%, trot 20%; mean limb phase 0.46; cycle about 1.6 s; duty factor about 63%; about 2.6 limbs support on ascent, 2.4 on descent | Climb cycle: limb phase 0.46 ± 0.1, cycle 1.6 s (female 1.6, male 1.3), duty 0.63, a three-limb support bias. Descent is feet-first and slightly slower | [M] (semi-free-ranging, Chimfunshi) | Neufuss et al. 2018 [R7] |
| Brachiation is rare; arm-hanging and quadrumanous climbing occur | No brachiation. Allow one-arm hang while feeding in crowns | [M] | Hunt 1992 [R8] |
| Bipedalism is mostly postural and tied to feeding on small items (97 bouts in 700 h, 4 of them locomotor; 80% foraging; 61% arboreal) | Bipedal *locomotion* stays rare (displays, short carries). Add bipedal reach variants to `forage` | [M]. Primary paper not re-read; verify before citing | Hunt 1994, via [R9] |
| Fast gallop footfall in chimps | Keep the current transverse-like offsets | Design assumption | No chimp-specific source found |

### B. Fur and skin

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | Albedo and hue correction | **Adopt** | Fur should be near-black to dark brown with a neutral, slightly warm sheen. Remove the warm tint in `FUR_*` and in the tip term | Chimps stop reading as clay | 0 | Low | `creatures.ts` appearance, `material.ts` | — |
| B2 | Anisotropic dual-lobe hair specular (Kajiya–Kay with Scheuermann's shifted tangents) | **Adopt** | Strand tangent = bind-space strand direction (limbs hang, torso upright, so roughly −Y) rotated by the skin matrix. Two lobes: a primary white one, and a secondary pigment-tinted one shifted toward the root. A noise shift breaks it up | Form reads through black fur; wet fur really shines | About 10 ALU per pixel | Low | `material.ts` | [R12] |
| B3 | Halo shells for LOD0 (shell fur) | **Adopt (high only)** | 2–3 shells of the already skinned LOD0 mesh pushed 4–10 mm along the normal. Alpha from strand noise × shell depth, alpha-to-coverage, no shadow casting. Fins rejected: a second geometry type [R11]. LOD0 has 12,622 vertices, and only 1–4 animals are LOD0 at once | Soft silhouette fuzz, the main "plush → fur" cue | ≤ 0.5 ms GPU (estimate) | Medium (fill cost, sorting with foliage) | `material.ts`, `creatures.ts` (extra instanced draw) | [R11][R17] |
| B4 | Strand pattern fix | **Adopt** | Orient the noise along the strand flow and use clumped normals. Fade by `fwidth` (already partly done). Removes the "knit" crosshatch | Up-close quality | 0 | Low | `material.ts` | — |
| B5 | Eyes | **Adopt** | Darker amber-brown iris, darker sclera, a small environment glint, eyelid shading. Iris offset driven by A8 | No more "demon eyes" | 0 | Low | `material.ts` | — |
| B6 | Skin: dark adult hands and feet, pink infants, reduced warm SSS on hands | **Adopt** | Face, ears and hands already have wrap and backlight terms. Retune them | Removes the mitten look | 0 | Low | `material.ts` | — |
| B7 | Wetness | **Adopt** | Clumped strands, shells shortened ×0.4, stronger specular, a drying lag (reuse `uWet`) | Rain reads on animals | 0 | Low | `material.ts` | [R14] |
| B8 | Creature lighting aids (`uFill`, `uRim`, `uExposure`) | **Adapt, then remove** | They lift and warm the fur. Reduce them in Stage 3 and remove them once exposure adaptation (F4) lands | Correct contrast | 0 | Low (RTS legibility) | `creatures.ts`, `material.ts` | — |
| B9 | Full physical sheen material (`MeshPhysicalMaterial.sheen`) | **Reject** | More expensive than B2, not anisotropic, and a program change for 3 LODs | — | — | — | — | — |

### C. Water

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | UV fix plus a flow map with 2-phase blending | **Adopt** | Use ribbon UVs (lateral `uv.x × width`, arc length). Bake an RG flow map along the spline (tangent × speed; riffles faster, pools slower, split around ford stones). Sample the normal map twice with phase-offset time [R13]. This is what `Water2.js` does; reuse the idea, not the class (planar reflection costs a scene re-render) | Removes the radial smear; water visibly flows around bends and stones | +2 samples, about 0.1 ms | Low | `water.ts`, new `env/flow.ts` (pure bake) | [R13][R23] |
| C2 | Depth-based absorption (Beer–Lambert) and a Fresnel-correct IBL | **Adopt** | Tea-coloured extinction along the view path (depth ÷ cos θ, from the bed height texture that already exists). F0 = 0.02. Sky visibility from crown cover (`envSkyVisibility`). Remove the per-view `envBoost` multipliers (up to about 13×) | Dark, tea-stained, believable water in every view | 0 | Low | `water.ts`, `scene.ts` (`envBoost`) | — |
| C3 | Refraction | **Adapt** | Keep the depth alpha blend over the real bed geometry, adding a small normal-driven alpha and colour wobble. Screen-space refraction needs an opaque copy (split pass): reject for now | Bed shows through the shallows | 0 | Low | `water.ts` | — |
| C4 | Reflections: planar (`Reflector`) or SSR | **Reject** | A planar reflection re-renders about 2M triangles. SSR is noisy with alpha-to-coverage foliage and doesn't pay off on a 3.6 m stream under canopy. Keep a tuned IBL plus a canopy-dark gradient | — | — | — | — | [R23] |
| C5 | Foam at the ford and stones, and a shoreline band | **Adopt** | Bake distance-to-stone into the flow map's B channel when placing ford stones. Foam lines along flow and a waterline lap (thin line, animated). Shoreline wetness: darken and gloss the ground within about 0.3 m above the waterline | Water edges read up close and from RTS | Negligible | Low | `water.ts`, `terrain.ts` | [R14] |
| C6 | Rain ripples from a baked ripple atlas | **Adopt** | Replaces the hashed per-cell `sin` rings with a 4-layer time-offset ripple normal texture baked once (Lagarde's approach [R14]). Shared by water and ground puddles | Natural ripples, less aliasing | Negligible | Low | `water.ts`, `terrain.ts`, `textures.ts` | [R14] |
| C7 | Interaction ripples at fords | **Adopt** | Renderer-only: a 16-slot uniform ring of emitters (x, z, t0, strength) from animals inside the channel (`terrain.riverDistance < halfWidth`), and from drinkers at the waterline. The shader sums analytic expanding rings | Wading and drinking touch the water | Negligible | Low | `water.ts`, `creatures.ts` (emit via `CreatureContext` callback) | — |
| C8 | Caustics on the bed | **Adopt (high)** | Two scrolling procedural caustic patterns in the ground shader, masked by `gUnder` × sun × sky visibility | Sunlit shallows sparkle in close views | About 0.1 ms | Low | `terrain.ts` | — |
| C9 | RTS readability | **Adopt** | From above: darker centre, lighter shallows, a thin bank highlight and a moving broken sheen so the stream reads as water, not a road | Map readability | 0 | Low | `water.ts` | — |

### D. Terrain and textures

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | GPU bake of procedural materials into texture arrays at load | **Adopt** | One-off render-to-texture of noise shaders into a `DataArrayTexture`: 6 layers (litter, moss, soil, mud, rock, bark) × 512², for albedo+height and normal+roughness. Mipmapped. Sliced over frames. Replaces the canvas litter (`createLitterTextures`) | Richer, consistent materials with no assets | ≤ 150 ms at load, about 17 MB | Medium (sync timing) | new `env/texbake.ts`, `textures.ts`, `terrain.ts` | — |
| D2 | Anti-tiling with hex-tiling | **Adopt** | Mikkelsen's practical hex-tiling (3 taps) on high; a 1-tap random rotation per cell on medium [R18] | Kills visible repetition | About 0.4–0.8 ms (estimate) | Low | `terrain.ts` | [R18] |
| D3 | Height-based splat blending | **Adopt** | Blend litter, moss, soil and mud using the layer height maps (moss in crevices, litter on top) instead of `mix` on masks | Natural transitions | Small | Low | `terrain.ts` | — |
| D4 | Biplanar mapping on steep banks, rocks and logs | **Adopt** | Two fetches instead of three [R19]. Only where slope > 0.4 and on rock and log materials | No stretching on banks | Small | Low | `terrain.ts`, `shared.ts` (stone) | [R19] |
| D5 | Detail normals with distance fade | **Adopt** | A second litter normal at 4× frequency within 12 m | Close-up texture | Small | Low | `terrain.ts` | — |
| D6 | Parallax occlusion mapping | **Reject** | High per-pixel cost on the largest surface, little benefit from the RTS angle, fights the decals | — | — | — | — | — |
| D7 | Leaf litter and twig decals in the near-field tile | **Adopt** | 3,000 flat instanced leaf and twig cards lying on the ground, reusing the camera-following `ENV_NEAR` lattice | 3D floor close up | About 0.1 ms | Low | `vegetation.ts` | — |
| D8 | Liana UV fix and bark relief | **Adopt** | Lianas use the tube's own `uv.y` along their length, not world Y (removes the candy stripes). Trunks get a bark normal from D1 plus vertical fluting and moss patches | Removes an obvious defect | 0 | Low | `vegetation.ts`, `shared.ts` (bark) | — |
| D9 | CC0 PBR assets compressed to KTX2 (Poly Haven or ambientCG) | **Adapt (optional, needs approval)** | See Stage 6 and §7 for the exact assets and sizes. Procedural D1 is the default | Photographic ground and bark | Download about 13.3 MB of JPG | Medium (look consistency, licensing bookkeeping) | new `public/textures/*`, `terrain.ts` | [R27][R28][R29] |

### E. Vegetation

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | Hierarchical wind (trunk bend, per-lobe branch sway, leaf-edge flutter) | **Adopt** | Crysis-style layering [R15]. Today `envWind` translates whole crowns with one phase field, which makes dappled shadows swim (`S/seq-wind-diff.png`). Bend around the base with amplitude ∝ height², add per-lobe phase from the `aCrown` centre hash, and flutter by UV and vertex | Organic motion, calmer shadows | About 0.3 ms (color + shadow) | Low | `shared.ts` (`envWind`), `vegetation.ts` | [R15] |
| E2 | Gust fronts tied to weather | **Adopt** | A low-frequency noise (`uNoise`) scrolled along `windDir` at speed ∝ wind, modulating E1. Storms get strong travelling waves visible from RTS | Weather reads from the map | Negligible | Low | `shared.ts` | [R15] |
| E3 | Leaf translucency and backlighting | **Adapt** | It exists (`envBack`). Add a yellow-green transmission colour and a thickness term; reduce it on dense crowns | Glowing backlit canopy | 0 | Low | `shared.ts` | [R15] |
| E4 | Alpha-to-coverage | **Keep** | Already correct with MSAA 4× [R17]. It is the reason not to switch to post AA | — | — | — | — | [R17] |
| E5 | Cutaway fade without screen-door | **Adopt** | Foliage clumps and plants shrink to zero in the vertex shader (scale fade) instead of an alpha dither. Trunks and logs get a world-noise dissolve with a thin dark edge, which reads as intentional | Removes the halftone | 0 | Low | `shared.ts` (`ENV_CUT`) | — |
| E6 | Octahedral impostors for distant trees | **Adapt (conditional)** | Only if Stage 1 measurement shows vegetation over 4 ms in RTS. Hemi-octahedral 8×8 frames per archetype (species × 3 variants), albedo+alpha and normal+depth, relit, crossfaded by distance [R16]. The far-canopy mesh already covers beyond the map edge | −30–60% crown triangles in RTS (estimate) | Atlas about 27 MB, bake about 200 ms | High (lighting and wind mismatch) | new `env/impostors.ts` | [R16] |
| E7 | Understory variety and patchiness | **Adopt** | 3–4 herb and seedling archetypes, noise-clustered density, per-instance hue, size and tilt, random yaw | Breaks the uniform herb grid | 0 | Low | `vegetation.ts` | — |
| E8 | Interaction bending | **Adopt** | A uniform array of the nearest 16–32 animals (x, z, radius) pushes near-field herbs and shrubs away, with a spring-back in the shader. Renderer-only | Animals move *through* the undergrowth | About 0.1–0.2 ms | Low | `shared.ts`, `vegetation.ts`, `scene.ts` | — |
| E9 | Fruit | **Adopt** | Real-size clusters in perspective (figs as small spheres on branch tips, and on trunks for cauliflorous species), ripe and unripe colour mix, no emissive in close views. In RTS keep a screen-space minimum size instead of `uFruitScale` world scaling. Add a renderer-only fruit drop under feeding animals | Food reads as food | Small | Low | `vegetation.ts`, `creatures/fx.ts` | — |
| E10 | Feeding shake | **Adopt** | A local wind impulse at foragers' crown positions (reuse the E8 array) | Feeding is visible from RTS | 0 | Low | `shared.ts` | — |

### F. Lighting and atmosphere

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | Sky IBL via PMREM | **Keep + adapt** | It exists. Add a green bounce term under canopy (ground-hemisphere colour from foliage, scaled by cover) | Richer shade colour | 0 | Low | `sky.ts`, `shared.ts` | — |
| F2 | Cascaded shadow maps (`CSM.js`) | **Reject for now** | RTS is orthographic (cascades help little), and 3–4 cascades re-render about 2M triangles of foliage. The follow-extent single map (4096, texel-snapped) is adequate. Revisit as 2 cascades for cinematic only if far shadows look blurry | — | — | — | — | [R23] |
| F3 | Screen-space contact shadows | **Adopt (close/cinematic, high)** | Custom WebGL pass on the existing depth texture: 16-step half-res raymarch toward the key light, capped at 0.3 m [R20]. Adds finger, foot and body contact that the low-LOD shadow proxy misses | Animals sit *on* the ground | ≤ 0.4 ms | Medium (halos on foliage; mask by depth range) | `post.ts` | [R20] |
| F4 | Exposure adaptation | **Adopt** | Log-luminance mip chain of the half-float scene target, sampled in the grade pass. Adapt with τ ≈ 1.5 s, clamped to ±1.5 EV around the current per-time-of-day grade so night stays night. Also remove B8 | Fixes black dusk under canopy and blown highlights after cuts | About 0.1–0.2 ms | Low | `post.ts` | — |
| F5 | Tone mapping: ACES Filmic vs AgX vs Neutral | **Adapt (A/B)** | Three 0.186 ships `AgXToneMapping` and `NeutralToneMapping`. Compare on the acceptance scenes, especially saturated greens and fruit. Ship only if a reviewer prefers the result | Better foliage hue | 0 | Low (changes the established look) | `scene.ts`, `post.ts` | [R23] |
| F6 | Volumetric light shafts | **Adapt** | Froxel volumetrics [R21] are too heavy. Keep the billboard shafts (`weather.ts`) and add a screen-space radial godray pass only when the sun is on screen in close or cinematic views (half-res, depth-masked sky, 32 taps) | Sun through canopy | ≤ 0.5 ms when active | Medium | `post.ts` | [R21] |
| F7 | Height fog and mist | **Keep** | The global fog chunk replacement works. Don't touch `installAtmosphere` semantics. `scene.fog` must stay a `THREE.Fog` | — | — | — | — | — |
| F8 | TAA | **Reject in WebGL** | Three's WebGL `TAARenderPass` accumulates only when nothing moves. Real TAA needs velocity from GPU-skinned, instanced, wind-animated materials across 13 patch sites. Keep MSAA + alpha-to-coverage. TRAA is available only on the WebGPU path | — | — | — | — | [R23][R30] |
| F9 | SMAA or FXAA on high | **Reject** | MSAA already handles geometry; FXAA stays on the low tier | — | — | — | — | — |
| F10 | Colour-grading LUT (`LUTPass`) | **Reject** | The parametric lift/gamma/gain grade already does this per time of day | — | — | — | — | — |
| F11 | Rain specular hotspot | **Adopt** | Clamp puddle roughness to at least 0.08 and cap specular by sky visibility (the white patch in `S/water-ford-rain.png`) | Fixes an artifact | 0 | Low | `terrain.ts` | [R14] |

### G. Camera and cinematics

| # | Technique | Verdict | Why | Gain | Cost | Risk | Files | Refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | Close follow: look-ahead and a dead-zone | **Adopt** | Target = subject + velocity × 0.3 s, with a screen-space dead-zone (no re-aim inside ±8% of frame). The existing spring and speed cap stay | Calm framing in play and chases | 0 | Low | `camera.ts` | [R22] |
| G2 | Trunk collision and occlusion | **Adopt** | Keep the camera at least trunk radius + 0.6 m from any trunk (tree positions and radii are known). If the sight line is blocked for more than 0.5 s, orbit ±25° toward clear space | No more "behind a trunk" frames | < 0.05 ms | Low | `camera.ts` | [R22] |
| G3 | Shot grammar in the cinematic director | **Adopt** | 180° rule for pairs (stay on one side of the actor–target axis). 30° rule on cuts. Lead room in the heading direction. Minimum shot 4 s, maximum 12 s. Cut on the interaction's intensity peak. Keep the subject at 8% of frame height or more *and* inside a 10% safe margin (`S/cinematic.png` violated this) | Documentary feel | 0 | Low | `camera.ts` | [R22] |
| G4 | Depth of field in cinematic view | **Adopt (high)** | Half-res circle-of-confusion gather (12–16 taps), auto-focus on the subject distance, a small aperture so the forest stays readable. `BokehPass` is full-res and costlier | Nature-documentary look | ≤ 1.0 ms, cinematic only | Low | `post.ts` | [R23] |
| G5 | Handheld drift | **Adopt (cinematic, respects reduced motion)** | 0.2° noise in rotation only, damped | Organic camera | 0 | Low | `camera.ts` | — |
| G6 | Motion blur | **Reject** | Needs velocity buffers (see F8), and time-lapse would smear everything. Use per-animal speed smear in the time-lapse regime instead (A2) | — | — | — | — | — |

### H. Platform

| # | Topic | Verdict | Findings | Files |
| --- | --- | --- | --- | --- |
| H1 | `WebGPURenderer` + TSL (three 0.186) | **Later, optional spike only (Stage 6)** | See the findings below | — |
| H2 | `OffscreenCanvas` / rendering in a Worker | **Reject** | Labels are DOM (`labels.ts`), picking and UI read the scene synchronously, and `CreatureContext.container` is a DOM element. Moving the *sim* to a worker is the perf agent's call. The renderer then needs a tick-snapshot adapter (§0) | — |
| H3 | GPU timing | **Adopt** | `EXT_disjoint_timer_query_webgl2` works on the target machine. Make a per-pass `TIME_ELAPSED` query ring, non-blocking and polled 2–3 frames later, behind `?perf=1`. Keep `gl.finish()` out of normal runs | `perf.ts`, `post.ts`, new `scripts/gpu-probe.mjs` |

**H1 findings: `WebGPURenderer` + TSL**

- **What it offers:** compute (grass, particles, water), TRAA/TAAU, SSGI, screen-space contact shadows (`SSSNode`), godrays, DoF and 3D LUT nodes. All are present in `node_modules/three/examples/jsm/tsl/display/` [R23].
- **Browser support:** Chrome 113+ on macOS; Safari 26 (Sept 2025) [R25]; Firefox 145+ on Apple-silicon macOS Tahoe [R26]. Verified locally: Chrome exposes a WebGPU adapter with `timestamp-query`, `texture-compression-astc` and `shader-f16`.
- **Migration cost:** `onBeforeCompile`, `ShaderMaterial` and `EffectComposer` do not run on `WebGPURenderer`, not even on its WebGL 2 fallback [R24]. ChimpBench has 13 `onBeforeCompile` patch sites, a global `ShaderChunk` fog replacement, a DataTexture skinning path, GreaterDepth x-ray materials, a custom GTAO wiring and the whole composer chain. That means a full material rewrite with no incremental path. Estimate: 3–6 weeks of agent time, low confidence, with high visual regression risk.
- **Decision:** don't migrate now. After Stage 5, optionally spike one material (water) in TSL inside a harness to measure effort and gain. Migrate only if WebGL blocks a must-have, such as TRAA for foliage shimmer or compute-driven understory.

---

## 4. Implementation stages

Order: motion and animation first (highest impact ÷ risk), then creature surface, water and ground, then vegetation, light and camera polish, and optional assets and platform last. Each stage ships alone and keeps `pnpm test` and `pnpm build` green.

**Module layout for new code** (keeps merge friction with the perf agent's `creatures.ts` edits low):

| Module | Purpose | Contents |
| --- | --- | --- |
| `src/render/creatures/gait.ts` | Pure | Distance phase, stride warp, regimes, footfall offsets, foot-lock state machine |
| `src/render/creatures/secondary.ts` | Pure | Springs, inertializer, attention, blinks |
| `src/render/creatures/choreo.ts` | — | Pair layouts, contact targets, pair clock |
| `src/render/creatures/motion.ts` | Pure | C1 velocity from the history ring |
| `src/render/env/flow.ts` | Pure | River flow and obstacle bake |
| `src/render/env/texbake.ts` | GPU bake | Texture arrays |
| `tests/render-*.test.ts` | Tests | Unit tests (the runner already globs `tests/*.test.ts`) |

## Stage 1: Motion foundation (grounded, continuous locomotion)
**Goal**: Animals move without sliding, popping or stutter, at every camera distance and at natural and warped speeds, and they show readable time-lapse above that.
- **Tooling first:**
  - Add `scripts/motion-probe.mjs`: samples `rig.subject` and the sim position every rAF. Reports speed CV, stalls, per-frame heading change and vertical steps.
  - Add `scripts/gpu-probe.mjs`: timer-query subtraction per subsystem, as sketched in §6.
  - Creature harness: add `?mode=gait` (one adult and one juvenile on a figure-8 over bumpy terrain, with a speed ramp from 0.5 to 3 body lengths/s, stops, and 90° and 180° turns, on slopes up to 20°).
  - Creature harness: add `?debug=feet`, which exposes `window.__creatures.debug` with contact world positions, stance flags, regime and clip-switch counters. Harness only.
  - Switch both harnesses to rAF timestamps.
  - Capture the §6 acceptance set to `artifacts/visual/before/`.
  - Add Finestone 2018, Neufuss 2018, Hunt 1992, Hunt 1994 (after re-reading the primary paper) and Parr 2007 to `docs/research.md`.
- A1 C1 velocity from the (perf-owned) history ring, in `motion.ts`. Heading and gait speed follow it.
- A2 and A5: distance-driven phase, stride warp to 1.6×, three regimes with hysteresis, phase-synced walk↔gallop, stop-on-plant. Per-individual limb phase in 0.45–0.70 [M].
- A3: world-space foot and hand planting on LOD0/1, per-contact `groundHeight`, pelvis lowering, unlocked in time-lapse.
- A6: in-place turn stepping, chest-leads-hips yaw, bank roll.
- A4: inertialized transitions with a per-transition duration table. Moving-state hysteresis: enter above 0.30 and exit below 0.18 body lengths/s, minimum clip dwell 0.35 s.
- A14: moving animals get at least 20 Hz poses, round-robin by slot.

**Success Criteria**:
- `mode=gait`, natural and warped regimes:
  - Planted-contact world drift per stance: median ≤ 1.5 cm, p95 ≤ 4 cm.
  - Contacts within ±2 cm of terrain on slopes ≤ 20°.
  - No contact below ground by more than 1 cm.
- Motion probe at 1 min/s during straight travel: per-frame heading change p95 ≤ 2°. Rendered speed CV within a continuous bout ≤ 0.10, measured with rAF timestamps.
- Motion probe at 10 min/s: no single frame inside a movement burst below 25% of the burst's median speed. The current linear playback shows 10.4 → 0.1 → 10.4 m/s.
- At every clip change, the maximum per-frame joint-angle delta is ≤ 2× the steady-state p95 delta (debug counter over the `tiles` and `gait` runs).
- Walk/stand switches ≤ 1 per animal per 5 s over 60 s of rts-1x-day (debug counter).
- `perf-probe` on an idle machine:
  - `anim` p95 ≤ 1.0 ms at seed 48 rts-1x-day, and ≤ 2.5 ms with `?pop=120`.
  - `creatures` mean within +0.3 ms of the re-validated baseline.
  - Heap growth ≤ baseline + 0.2 MB/s.
  - rts-1x-day and cinematic-1x-day keep ≤ 1% dropped frames.
- `pnpm test` and `pnpm build` are green. `mode=tiles` and `mode=stages` screenshots show no posture regressions (side-by-side review with the "before" set).

**Tests**:
- `tests/render-gait.test.ts`:
  - Phase advance equals distance ÷ stride.
  - Stride warp caps at 1.6×, then cadence rises to the gait cap.
  - Regime hysteresis doesn't flip on ±5% noise.
  - Footfall order for limb phases 0.45 and 0.70.
  - Foot-lock state machine: lock at touchdown, release at liftoff, forced re-plant when drift exceeds 8 cm.
- `tests/render-secondary.test.ts`:
  - Inertialization: x(0) = x₀, x′(0) = v₀, x(t₁) = 0, monotone decay without overshoot beyond the quintic's limit.
  - Spring update is independent of dt: two 8 ms steps are within 1e-3 of one 16 ms step.
- `tests/render-motion.test.ts`: C1 interpolation passes through the samples and has continuous velocity at the joins.
- Harness sequences: `mode=gait&debug=feet`, and scenes C1–C5 in §6.
- `node scripts/perf-probe.mjs --scenarios quick`.

**Status**: Complete (28 Sep). Shipped: `creatures/motion.ts` (monotone-cubic C1 playback, lag 2 ticks), `creatures/gait.ts` (distance-driven phase, regimes with hysteresis, individual limb phase, contact locks), `creatures/secondary.ts` (inertialization, springs), planting on LOD0+1 ('high') / LOD0 ('medium') with per-contact terrain height and pelvis drop, in-place turn stepping, chest-leads-hips, bank ±0.12 rad, moving hysteresis 0.30/0.18 BL/s plus 0.8 s stillness, 0.35 s clip dwell, a pop guard that inertializes a clip's own segment jumps, ≥ 20 Hz poses for moving animals (not in time-lapse), slot-staggered pose phases. Tools: `scripts/motion-probe.mjs` (gait / app / toggles), `scripts/gpu-probe.mjs`, `scripts/visual-scenes.mjs`, harness `mode=gait`, `&debug=feet` (`__creatures.debug.feet`), `&follow=<id>`.
Measured: gait course planted drift median 0.38 cm / p95 1.98 cm (natural), 0.77 / 3.73 cm (warped), 0 contacts below ground; 1 min/s straight-travel heading change p95 0.34°/frame (baseline 8.7°/frame over all motion), speed CV 0.10–0.13 per bout; 10 min/s 0 frames below 25% of a burst's median; walk/stand switches 1.0 per animal per 5 s (sim stop–go cadence); per-frame joint change at clip switches p99 0.39–0.49 rad vs steady p95 0.20 (≈2×; max 0.5–1.1 with headless frame drops); `anim` rts-1x-day 0.53 / 1.1 ms mean/p95 (baseline 0.40 / 1.0), pop 120 0.84 / 1.4 (≤ 2.5).
Deviations: a 1.6× stride warp does not fit the limb reach (walk sweep tops out at 0.44 body lengths), so stride caps at reach and "warped" raises cadence to the cap; walking contacts re-plant only past 14% of body size (turn drift) and are dragged the last centimetre or two when out of reach (hops otherwise); forage's reach→chew cycle was made continuous.

## Stage 2: Expressive animals (attention, faces, choreography, trees)
**Goal**: Individuals look, react and touch each other and the trees convincingly. Paired and arboreal behaviour reads at a glance.
- A8 attention: priority look targets, eyes lead the head, saccades, stochastic blinks, a new iris-offset param texel (`ROW_TEXELS` 128 → 132). Remove `idleHead` sine drift and the fixed 4.3 s blink.
- A7 springs: head, belly, infant riders (dorsal and ventral offset spring, and a grip IK to the mother's shoulder and chest bone points), exertion-driven breathing.
- A9 expression set [M, Parr 2007]:
  - relaxed
  - play face (partial and full)
  - bared-teeth / fear grin
  - scream
  - pant-hoot build-up
  - pout / whimper
  - compressed lips
  - lip-smack
  - brow channel
  - `mode=faces&mood=…&vocal=…` shows each.
- A10 choreography:
  - Contact IK on the partner's bones, with receivers evaluated first.
  - Shared pair clock.
  - Approach → settle → engage → release.
  - Groomee posture shifts every 20–60 s (stylization, labelled).
  - Hit-reactions synced to blow apexes.
  - Rolling grapple.
  - Embrace and console arms on the partner's back bones.
  - Beg hand under the partner's mouth bone.
- A11 arboreal:
  - Trunk-surface contact IK (radius from `trunkRadius`).
  - Climb cycle: limb phase 0.46 ± 0.1, cycle about 1.6 s, duty 0.63 [M, Neufuss 2018].
  - Feet-first descent.
  - Mount (reach and pull) and dismount (drop and hop) transitions.
  - Extend `vegetation.branchAnchor` additively to also return the limb axis and radius; branch walking aligns to it.
  - One-arm hang while feeding in crowns [M, Hunt 1992].
  - No brachiation.
- Time-lapse regime:
  - Capped cadence, reduced swing, feet unlocked.
  - Subtle speed smear in close views: reuse the `fx.ts` trails and respect reduced motion.
- Drinkers: offset to the waterline, render-only, with a C7 emitter hook. Today the sim's water sites sit about 2 m from the water.
- Drum clip: hands and feet IK to the nearest trunk or buttress within 2 m.

**Success Criteria**:
- Climb scene C6: hand and foot contacts within 3 cm of the trunk surface in ≥ 90% of stance frames. Per-frame |Δy| ≤ 2× its median during ascent.
- Pair scenes (C8 groom, embrace, beg, attack): contact hand targets within 4 cm of the partner surface point in ≥ 90% of engaged frames (debug measure).
- Rider (C4): infant pelvis never inside the mother's spine capsule, and spring lag ≤ 6 cm at walk.
- Blinks over 60 s for 20 animals: the interval CV is ≥ 0.4, and no two animals blink in sync for more than 3 consecutive blinks.
- Faces (C2 variants): each of the 8 expressions differs from relaxed in at least 15% of the mouth-crop pixels (ΔE above 10). A reviewer names each tile correctly from a shuffled sheet.
- `anim` p95 ≤ 1.3 ms at seed 48 rts-1x-day. close-1x-day at ≤ 1% dropped frames on an idle machine.
- Tests and build are green.

**Tests**:
- `tests/render-choreo.test.ts`:
  - Pair clock phase agreement for both partners.
  - Receiver-first ordering is deterministic.
  - Trunk contact point lies on the cylinder surface.
  - Limb-phase 0.46 footfall order.
- `tests/render-secondary.test.ts`: the attention selector respects priorities and hold times; the blink generator is hash-seeded and deterministic per id.
- Harness scenes C2, C4, C6–C9.

**Status**: Mostly complete (28 Sep). Shipped: attention (hold-and-shift targets: partner, heard call, snake model, alpha, idle scan; head on critically damped springs, gaze pitch −27°..+14°), eyes lead the head via a new param texel (ROW_TEXELS 132: P4 gaze/brow/press, P5 hand pigmentation), hash-seeded irregular blinks, exertion-driven breathing, rider springs relative to the mother, brow and lip-press channels with call/mood expressions and lip-smacking grooming, partner-bone targets with receivers posed first and a shared pair clock (blows, flinches, strokes, groomee posture shifts), trunk-surface contacts from `vegetation.trunkAt`, Neufuss climb cycle driven by height climbed (feet-first descent), one-arm hang while feeding, drinkers at the waterline with ripples, drum hands on the nearest trunk, subtle time-lapse smear (close views, reduced-motion aware), `Chimp.carryingDeadId` (sim + render: limp ventral carry, cradling arm, body put down and faded).
Measured: climb stance contacts 100% within 3 cm of the bark, |Δy| p99/median 1.98; blink interval CV ≥ 0.4 with ≤ 3 synced blinks (unit test); `anim` p95 1.1–1.2 ms rts-1x-day (≤ 1.3); close-1x-day 0% dropped frames.
Deferred: head-lag spring, rolling grapple, mount/dismount moves, branch-axis alignment (`branchAnchor` unchanged), teeth mask for the relaxed play face, rider spine-capsule check (rider springs are relative, lag ≈ a few cm).

## Stage 3: Creature surface (fur, eyes, skin, wetness)
**Goal**: Chimps read as black-furred, living animals up close, while RTS legibility is unchanged.
- B1 albedo and hue.
- B2 dual-lobe anisotropic specular with skinned strand tangents.
- B3 halo shells on LOD0 (high: 3; medium: 1), with alpha-to-coverage and no shadows. Also LOD1 in cinematic.
- B4 strand pattern fix.
- B5 eyes. B6 hands, feet and face skin.
- B7 wetness.
- B8: halve `uFill` and `uExposure` now, and remove them in Stage 5 once exposure adaptation lands.
- Keep the x-ray silhouettes as they are.

**Success Criteria**:
- Torso crop in C10 (cinematic) and in the adult tiles of C2 (faces): R/B ≤ 1.3 (baseline 1.57 and 2.49); 95th-percentile / median luminance ≥ 2.2 (baseline 1.4–1.65), so a sheen is visible; mean luminance ≤ 0.12 (baseline 0.13–0.14).
- The adult iris region's mean saturation is at least 40% lower than baseline.
- No crosshatch at 1:1 pixel inspection in C9.
- Shell cost ≤ 0.5 ms GPU for 4 LOD0 animals (`gpu-probe`, close view). Creature GPU total ≤ 1.5 ms.
- RTS screenshot (E1): community-tinted x-ray silhouettes and labels read exactly as before (side-by-side review).
- Rain (E6 with a chimp framed): wet fur visibly glossier and darker than dry.
- Tests and build are green.

**Tests**:
- Shader compile check through the existing `compileAsync` warm-up (no new program variants at nightfall or storm: the `renderer.info.programs` count is stable after warm-up).
- Harness C2, C3 and C9, plus the app views E1 and E10.
- `gpu-probe` on close-1x-day.

**Status**: Complete (28 Sep). Shipped: near-black to dark-brown albedo, Kajiya–Kay dual-lobe highlight injected into every direct light (clump/strand-masked), halo shells (3 'high', 1 'medium', 0 'low'; LOD0 only; program compiled at startup on the proxy geometry), strand noise along the hair with clumped relief, darker amber irises with lid shading and gaze offset, age-pigmented palms and soles with little SSS, wet clumping, gloss and shorter shells, B8 aids halved (fill ×0.5, exposure lift halved).
Measured (linear crops): C9 torso R/B 1.48 → 0.96, p95/median luminance 1.67 → 5.59, mean 0.020 → 0.007; cinematic torso R/B 2.40 → 1.05, p95/median 1.54 → 2.2, mean 0.029 → 0.004; iris chroma −57% and brightness −59% (HSV saturation unchanged at ~0.7, so that criterion as written is not met); creature GPU (throughput subtraction) close-day 0.6 → 1.1 ms, cinematic 0.7 → 0.9 ms.
Notes: extreme close-ups (< 1 m) still show blotchy highlights on the head; B8 aids are halved, not removed (removing them darkened RTS silhouettes too far even with exposure adaptation).

## Stage 4: Water and ground
**Goal**: The stream reads as flowing, tea-dark forest water that animals interact with, and the forest floor stops tiling.
- Water:
  - C1 ribbon-UV fix and flow map (`env/flow.ts`, a pure bake with obstacle distance for the ford stones).
  - C2 Beer–Lambert absorption, Fresnel F0 0.02 and sky visibility; remove the `envBoost` per-view multipliers in `scene.ts`.
  - C3 alpha wobble. C5 foam and shoreline band.
  - C6 ripple atlas (shared with puddles). C7 16 interaction emitters. C8 caustics (high). C9 RTS readability.
- Ground:
  - D1 GPU texture-array bake (sliced after the first frame).
  - D2 hex-tiling (high) or rotation (medium). D3 height blend. D4 biplanar on banks, rocks and logs. D5 detail normals.
  - D7 near-field litter decals.
  - D8 liana UV fix and bark relief.
  - F11 rain specular clamp.

**Success Criteria**:
- Ford crop in C11 (E5): R/B ≥ 0.9 and G/B ≥ 1.05, so tea or olive rather than cyan (baseline R/B 0.65); mean luminance ≤ 0.20 outside sun glints (baseline 0.283).
- A flow-debug view (`&debug=flow`) shows flow direction within ±20° of the river tangent at every bend and ford. No radial streaks in E5 or E10.
- Wading and drinking animals emit visible rings within 1 frame of entering the channel.
- The E1 (RTS) stream reads as water to a reviewer (moving sheen, lighter shallows).
- Ground repetition in C9 and E4: autocorrelation of luminance at the old tile period (2.4 m) reduced ≥ 50%, measured on a top-down crop (`cam` straight down, 20 m square).
- No blown highlight patch in E6: fewer than 0.5% of pixels clipped at 1.0 on wet ground.
- Water ≤ 0.5 ms GPU. Ground cost increase ≤ 0.8 ms (`gpu-probe`). Load-time bake ≤ 150 ms, with no single main-thread task above 16 ms (long-task observer in `perf-probe --startup`).
- Tests and build are green.

**Tests**:
- `tests/render-flow.test.ts`:
  - Flow vectors are unit tangents inside the channel.
  - Speed rises at riffles.
  - Obstacle distance is 0 at a stone centre.
  - The bake is deterministic per seed.
- Harness scenes E4–E8.
- `perf-probe --startup` for bake timing.

**Status**: Mostly complete (28 Sep). Shipped: ribbon UVs, `env/flow.ts` bake (riffle factor per row, fords forced to riffles, lateral slow-down, stone distance), two-phase flow normals, flow split and foam collars at the ford stones, waterline lap, Beer–Lambert absorption over a lighter silt bed, reflections = sky IBL × one physical scale × sky visibility (per-view `envBoost` multipliers removed; the canopy-gap sky is desaturated and warmed), RTS broken sheen and bank line, 16 interaction emitters (drinking, wading), bed caustics; ground hex-tiling (litter albedo and normal), detail normals within 12 m, wet-ground and puddle specular capped (sky visibility, < tone-curve shoulder), liana UVs along the vine.
Measured: ford crop R/B 0.53 → 0.94, G/B 1.00 → 1.19, mean linear luminance 0.069 → 0.028, no radial smear; E6 wet bank mean 0.048 → 0.014 with the white sheet gone; river GPU ≤ 0.4 ms (within probe noise).
Deferred: D1 GPU texture bake (hex-tiling the existing canvas litter removed the visible repeat at far lower cost), D3 height blend, D4 biplanar, D7 litter decals, C6 baked ripple atlas (procedural rings kept), flow-debug view, the autocorrelation measurement.

## Stage 5: Vegetation, light and camera polish
**Goal**: The forest moves with the weather, parts around animals, frames its subjects well, and holds exposure from dawn to night.
- Vegetation:
  - E1 hierarchical wind and E2 gust fronts.
  - E3 translucency tuning.
  - E5 scale and dissolve cutaway (no screen-door).
  - E7 understory variety. E8 interaction bending (32 animals high, 16 medium). E9 fruit. E10 feeding shake.
- Lighting:
  - F1 canopy bounce.
  - F4 exposure adaptation, then remove the B8 lighting aids.
  - F5 AgX/Neutral A/B (ship only on reviewer preference).
  - F3 contact shadows (close and cinematic, high). F6 godrays (sun on screen, close and cinematic).
- Camera:
  - G1 look-ahead and dead-zone. G2 trunk avoidance.
  - G3 shot grammar. G4 cinematic DoF. G5 handheld drift.
- E6 impostors only if the Stage 1 measurement shows vegetation above 4.0 ms in RTS.

**Success Criteria**:
- Wind sequence C12 at wind 1: the fraction of floor pixels changing by more than 12 levels over 0.8 s drops ≥ 30% vs baseline (calmer dapples, measured like `S/seq-wind-diff.png`), while crown-edge motion is still visible.
- Storm RTS (E2): travelling gust bands visible in a 2 s sequence (reviewer).
- Close dusk (E7): mean frame luminance ≥ 0.06 (baseline visibly near black) while night (E3) stays within ±10% of its current mean luminance.
- Follow scene C13, 60 s: 0 frames with the subject occluded by a trunk for more than 0.5 s. Framing re-aims ≤ 1 per 2 s during play.
- Cinematic (E10) over 5 minutes: 0 shots with the subject's bounding box outside the 10% safe margin; 0 cuts violating the 180° rule for paired interactions (director debug log).
- No halftone dither visible in C9 and E10.
- Budgets:
  - `gpu-probe`: vegetation ≤ 4.0 ms (RTS), post ≤ 1.8 ms (RTS and close) and ≤ 3.2 ms (cinematic).
  - `perf-probe` quick: rts-1x-day, close-1x-day and cinematic-1x-day at ≤ 1% dropped frames.
  - rts-1x-storm and rts-1x-night no worse than the re-validated baseline.

**Tests**:
- `tests/render-camera.test.ts`: the trunk-avoidance solver keeps its distance; the shot-grammar validator rejects 180°-crossing cuts; the dead-zone ignores sub-threshold motion.
- Harness scenes E1–E3, E7, E10, C12, C13.
- `perf-probe` quick matrix.

**Status**: Mostly complete (28 Sep). Shipped: hierarchical wind (tree bend ∝ height², per-lobe sway, flutter) with gust fronts from a scrolling noise field; cutaway without screen-door (clumps and plants shrink, instanced trunks, limbs, fins, logs and rocks thin to their axis, lianas step out); understory parting around the 24 animals nearest the near-field tile; life-size fruit in perspective; exposure adaptation (64² log-luminance mip + 1×1 ping-pong, τ 1.5 s, comfort band calibrated on the reference views); cinematic depth of field in the grade pass (12-tap gather, 'high', off with reduced motion); close follow look-ahead 0.3 s and a soft ±8% dead zone; trunk clearance 0.6 m and 25° re-framing after 0.5 s of occlusion; director 180° and 30° rules, 4–12 s shots, lead room, safe-margin tracking, cut log (`rig.log`); handheld drift 0.2° (cinematic, reduced-motion aware). Tone-mapping A/B (ACES kept): session scratch `tonemap-ab/compare-*.png`.
Measured: wind floor pixels changing > 12 levels over 0.8 s 16.6% → 7.2% (−57%); dusk (E7) mean linear luminance 0.007 → 0.018 while night (E3) stays 0.021 → 0.021; GPU full frame (uncapped) rts 15.9 → 14.9, close 12.6 → 12.7, cinematic 15.4 → 15.4 with DoF, storm 14.9 → 15.1, night 13.8 → 14.2 ms (±1 ms noise); perf quick: every 1× scenario 60 fps with 0% dropped frames.
Deferred: F1 canopy bounce, E3 translucency tuning, E7 understory variety, E10 feeding shake, F3 contact shadows and F6 godrays (no GPU headroom: full frames are 12.6–15.9 ms), E6 impostors (the > 4 ms vegetation condition is met at 5–7.5 ms, but the plan rates it high-risk; next candidate if GPU relief is needed), the 5-minute director and 60 s follow probes.

## Stage 6: Optional (CC0 assets and a WebGPU spike)
**Goal**: Only with explicit user approval (§7):
- Swap the procedural ground and bark layers for CC0 photographic textures compressed to KTX2/ASTC, behind a `?assets=cc0` flag with the procedural fallback kept.
- Separately, measure a time-boxed TSL port of the water material under `WebGPURenderer` in a standalone harness, to decide on migration with data.

**Success Criteria**:
- Assets:
  - New texture GPU memory ≤ 24 MB (ASTC 4×4 ≈ 1 B/texel + mips).
  - Total download ≤ 15 MB. License file (CC0) in `public/textures/LICENSES.md`.
  - A reviewer prefers the result on C9, E4, E5 and E8.
  - No fps regression.
- WebGPU spike:
  - A written report with lines of TSL vs GLSL, visual parity screenshots, GPU ms on the same scene, and Safari 26 and Chrome results.
  - A go/no-go recommendation.
  - No production code changes.

**Tests**:
- `KTX2Loader.detectSupport(renderer)` fallback test in the harness: the procedural path loads when the transcoder is unavailable.
- Screenshots of C9, E4, E5, E8.
- WebGPU harness on Chrome and Safari 26.

**Status**: Out of scope (user decision, 28 Sep): no asset downloads, no texture encoder, no WebGPU spike.

---

## 5. What to extend, and what to remove or simplify

### Extend (the sim already emits these; the renderer under-expresses them)

| Sim signal | Today | Extension (stage) |
| --- | --- | --- |
| `coalition` interaction | No FX or choreography; allies play individual charge clips | Allies converge headings, bristle and swagger in sync; a shared impact on the target (2) |
| `chase` (flee + charge pairs) | FX trail only | Pursuer and pursued coordination: pursued looks back (A8 target = pursuer), fear grin; pursuer bristled (2) |
| `rain-display` | Same as `display` | Branch drag, ground slaps and branch waving in rain, wet fur (2, 3) |
| `alarm` + `snake-model` stimulus | Look at the partner only | Look and point toward `world.stimuli` position; alarm-hoo face (2) |
| `drum` call | Drums on nothing | IK to the nearest buttress or trunk (2) |
| Calls (`world.calls`) | Ring FX, face overlay | Listeners orient head and eyes toward callers within 20 m (A8) (2) |
| `groom` (mutual and one-way) | Static sit | Stroke rhythm, lip-smack, posture shifts, groomee eyes half-closed (2) |
| `play` (wrestle, tickle) | Sine loops | Pair clock with role swaps, play face, chase-and-return bursts (2) |
| `nurse`, carrying | Rigid attach | Rider springs, grip IK, infant looking around (2) |
| `drink` | Chimp drinks about 2 m from the water | Waterline offset, lips at the surface, ripples (2, 4) |
| `forage` in crowns | Perch plus reach | Branch-axis alignment, one-arm hang variant, fruit drop and crown shake (2, 5) |
| `climb` and `nest` | Hover beside the trunk | Trunk contact, the Neufuss climb cycle, mount and dismount, descent (2) |
| `consort` and `guard` | Stand or sit | Male glances back and waits; guard orients to rivals (A8). Keep courtship signals out until sourced (2) |
| Dead infant carried by its mother (`chimp.sim.carryDead`) | Corpse stays where it died; only an event text | Needs an **optional sim contract field** (for example `Chimp.carryingDeadId?`) so the renderer doesn't read hidden `sim` state. Owner approval needed. Then a ventral carry with a limp pose (2+) |
| `takeover` | Gold crown flare | New alpha's display and swagger; bystanders pant-grunt toward him (already a sim action) (2) |

### Remove or simplify

| Item | Why | Stage |
| --- | --- | --- |
| Frozen-pose crossfade (`from`/`out` copy + smoothstep) | Replaced by inertialization | 1 |
| `idleHead` sine drift, fixed 4.3 s blink | Bobblehead and robotic look | 2 |
| Creature `uFill`, `uRim` boost, `uExposure` lift | Warm and flatten the fur; replaced by sheen and exposure adaptation | 3 → 5 |
| Water `envBoost` per-view multipliers and the bank-proximity hack | Replaced by Fresnel + sky visibility + absorption | 4 |
| Canvas-painted litter (`createLitterTextures`) | Replaced by the GPU bake | 4 |
| World-Y bark UV on lianas | Candy stripes | 4 |
| `uFruitScale` world-scale hack | Screen-space minimum size instead | 5 |
| Screen-door cutaway dither | Scale fade and dissolve | 5 |
| Stick "perch" prop when a real limb anchor exists | Branch-axis placement | 2 |

---

## 6. Acceptance scenes (before and after)

Servers: app `MGOGO_NO_MODEL=1 pnpm exec vite --host 127.0.0.1 --port <P> --strictPort` (never 5173), and the creature harness with the same command plus `--config src/render/creatures/vite.harness.config.ts` on its own port. `H` = `http://127.0.0.1:<Pc>/src/render/creatures/harness.html`, `E` = `http://127.0.0.1:<P>/src/render/env/harness.html`. Use seed 48 (default). Frame by camera coordinates, not chimp ids: ids can change if the sim changes. Store before and after images in `artifacts/visual/{before,after}/<id>.png`.

**Creature harness**

| ID | URL | Capture |
| --- | --- | --- |
| C1 | `H?mode=tiles` | 1 frame, 7 s wait |
| C2 | `H?mode=faces`, plus `&mood=playful&vocal=laugh`, `&mood=fearful&vocal=scream`, `&vocal=pant-hoot`, `&vocal=whimper` | 1 frame each |
| C3 | `H?mode=stages` | 1 frame |
| C4 | `H?mode=single&action=travel&moving=1&cam=0,1.3,4.2,0,0.35,0` (mother + dorsal rider) | 10 frames @ 60 ms |
| C5 | `H?mode=single&action=charge&moving=1&cam=0.5,2.2,6.5,0,0.4,0` | 8 frames @ 100 ms |
| C6 | `H?mode=single&action=climb&cam=3,5,6,0.3,4.5,-0.6` | 6 frames @ 150 ms |
| C7 | `H?mode=single&action=nest&build=1` | 6 frames @ 150 ms |
| C8 | `H?mode=single&action=` groom, play, attack, mate, reconcile, beg, nurse | 6 frames @ 150 ms each |
| C9 | `E?view=close&hud=0&advance=3&auto=0&pause=1&hour=11` + JS below | 1 frame |
| — | `H?mode=gait&debug=feet` (new) | Probe run |
| — | `H?mode=perf&n=120` | Probe run |

C9 framing JS (frames the first adult on the ground):

```js
(()=>{const w=__world,e=document.querySelector('canvas').__env;const c=w.chimps.find(x=>x.alive&&x.age>15&&x.position[1]<0.2&&['rest','forage','groom'].includes(x.action));const g=e.terrain.walkable(c.position[0],c.position[2]);e.rig.followId=null;e.rig.controls.target.set(c.position[0],g+0.7,c.position[2]);e.rig.controls.object.position.set(c.position[0]+2.6,g+1.7,c.position[2]+2.6);e.rig.controls.update();})()
```

**Environment harness and app** (all with `&advance=3&auto=0`)

| ID | URL / state | Capture |
| --- | --- | --- |
| E1 | `E?view=rts&hour=10` | 1 frame, 9 s wait |
| E2 | `E?view=rts&hour=15&rain=0.9&cloud=1&weather=storm&wind=1` | 1 frame + 10 @ 200 ms |
| E3 | `E?view=rts&hour=21.5` | 1 frame |
| E4 | `E?view=close&hour=9` | 1 frame |
| E5 (= C11) | `E?view=close&hour=10&cam=33,4.5,33&look=41,0.3,25` (ford) | 1 frame + 6 @ 150 ms |
| E6 | E5 + `&rain=0.8&cloud=0.95&weather=rain` | 1 frame |
| E7 | E5 with `hour=18.3` (dusk) | 1 frame |
| E8 | `E?view=close&hour=10&cam=-10,14,-10&look=-15,0,-22` (stream oblique) | 1 frame |
| E10 | `E?view=cinematic&hour=10` | 12 s wait; plus a 5-min director log |
| C12 | `E?view=close&hour=10&pause=1&wind=1&cam=-30,22,40&look=-40,8,20` | 5 frames @ 200 ms + diff |
| C13 | `E?view=close&hour=10&rate=60` + focus the most-moving adult (motion-probe selection) | 60 s probe |
| App | `http://127.0.0.1:<P>/` default; `?perf=1` for `perf-probe` | UI context shot + perf |

**Probes**

- **Motion probe.** Pick the adult that moved furthest in 2 s, call `__scene.focusChimp(id)`, then sample `canvas.__env.rig.subject` and `chimp.position` every rAF for 5 s. Report frame-time median and p95, sim update count, rendered speed median and CV, stall fraction (speed below 15% of median), maximum acceleration and per-frame heading change. Dump the rows to JSON.
- **GPU probe.** Wrap `__env.post.render` in `gl.beginQuery(ext.TIME_ELAPSED_EXT)` / `endQuery`, and poll results 2+ frames later (skip `GPU_DISJOINT`). Take the median over 1.6 s after 0.7 s settle. Repeat with each of these hidden: `vegetation.group`, `terrain.group`, `creatures`, `weather`, `river`, `canopy`, and with `gtao` and `bloom` passes disabled. Run on an idle machine. Concurrent headless Chrome instances made my attempt unusable.

---

## 7. Open questions for the user

1. **CC0 texture download (Stage 6).** Approve downloading these Poly Haven 1k JPG sets? License: CC0, no attribution required [R27]; ambientCG is also CC0 [R28]. Byte sizes from `api.polyhaven.com/files/<id>`:

   | Asset | Diffuse | nor_gl | ARM | Total |
   | --- | --- | --- | --- | --- |
   | `forest_leaves_02` | 437,891 | 577,163 | 313,980 | ≈ 1.33 MB |
   | `brown_mud_leaves_01` | 1,206,953 | 1,486,072 | 953,367 | ≈ 3.65 MB |
   | `mossy_rock` | 1,124,438 | 995,727 | 926,941 | ≈ 3.05 MB |
   | `river_small_rocks` | 1,028,735 | 1,365,737 | 932,251 | ≈ 3.33 MB |
   | `bark_brown_02` | 659,592 | 1,015,623 | 232,742 | ≈ 1.91 MB |
   | **Total** | | | | **≈ 13.3 MB** |

   Default without approval: procedural only (Stage 4).
2. **KTX2 encoder.** If you approve assets, may the implementer install a KTX2/Basis encoder CLI? This is a dev tool, not an npm dependency, for example KTX-Software `toktx` or `basisu`. Without it, JPGs decode to RGBA8: about 84 MB of GPU memory with mips vs about 21 MB as ASTC. The transcoder `libs/basis/basis_transcoder.wasm` (527 KB) already ships with three.
3. **WebGPU.** Should the time-boxed TSL spike happen at all? Default: no migration; revisit after Stage 5.
4. **Realism vs legibility.** Near-black fur is correct but less legible in RTS. The x-ray silhouettes, labels and `RENDER_SCALE` 1.5 stay. Is darker, truer fur acceptable?
5. **Time-lapse look.** At 10 min/s and above (and for every run, even at 1×), the plan shows capped-cadence gaits with unlocked feet plus a subtle speed smear in close views. Prefer no smear, or a stronger ghosting?
6. **Sim contract additions.** Optional and documented, needing the sim owner's approval: `Chimp.carryingDeadId?` for mothers carrying dead infants. Possibly a branch or limb target for arboreal travel later.
7. **Tone mapping.** Is changing from ACES Filmic to AgX or Neutral acceptable if reviewers prefer it? It alters the established look.
8. **Cinematic style.** Adopt the documentary treatment (shallow DoF, slight handheld drift, 180° rule)?

---

## 8. References

Technique and platform:
- [R1] L. Delayen, Paragon animation techniques (distance matching, speed/stride warping), nucl.ai 2016. Summarised in [Game Anim interview](https://www.gameanim.com/2016/11/29/game-anim-interview-laurent-delayen/) and [Game Developer: animation tech talks of 2016](https://www.gamedeveloper.com/programming/most-inspiring-game-animation-tech-talks-of-2016).
- [R2] D. Bollo, "Inertialization: High-Performance Animation Transitions in Gears of War", GDC 2018. [Slides](https://media.gdcvault.com/gdc2018/presentations/bollo_david_inertialization_high_performance.pdf).
- [R3] D. Holden, "Spring-It-On: The Game Developer's Spring-Roll-Call", 2021. [Article](https://theorangeduck.com/page/spring-roll-call).
- [R4] D. Rosen, "Animation Bootcamp: An Indie Approach to Procedural Animation", GDC 2014. [GDC Vault](https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach).
- [R5] S. Clavet, "Motion Matching and The Road to Next-Gen Animation", GDC 2016. [GDC Vault](https://www.gdcvault.com/play/1023280/Motion-Matching-and-The-Road).
- [R11] Lengyel, Praun, Finkelstein, Hoppe, "Real-Time Fur over Arbitrary Surfaces", I3D 2001. [PDF](https://hhoppe.com/fur.pdf).
- [R12] T. Scheuermann, "Practical Real-Time Hair Rendering and Shading", SIGGRAPH 2004 Sketches. [PDF](https://history.siggraph.org/wp-content/uploads/2022/12/2004-Talks-Scheuermann_Practical-Real-Time-Hair-Rendering-and-Shading.pdf).
- [R13] A. Vlachos, "Water Flow in Portal 2", SIGGRAPH 2010. [PDF](https://alex.vlachos.com/graphics/Vlachos-SIGGRAPH10-WaterFlow.pdf). Also cited by three's `Water2.js`.
- [R14] S. Lagarde, "Water drop 3b – Physically based wet surfaces", 2013. [Blog](https://seblagarde.wordpress.com/2013/04/14/water-drop-3b-physically-based-wet-surfaces/). Series index in the same blog.
- [R15] T. Sousa, "Vegetation Procedural Animation and Shading in Crysis", GPU Gems 3, ch. 16. [NVIDIA](https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-16-vegetation-procedural-animation-and-shading-crysis).
- [R16] R. Brucks, "Octahedral Impostors". [ShaderBits](https://shaderbits.com/blog/octahedral-impostors).
- [R17] B. Golus, "Anti-aliased Alpha Test: The Esoteric Alpha To Coverage", 2017. [Medium](https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f).
- [R18] M. S. Mikkelsen, "Practical Real-Time Hex-Tiling", JCGT 11(3), 2022. [JCGT](https://jcgt.org/published/0011/03/05/).
- [R19] I. Quilez, "Biplanar mapping". [Article](https://iquilezles.org/articles/biplanar/).
- [R20] Bend Studio, "Inside Bend: Screen Space Shadows". [Blog](https://www.bendstudio.com/blog/inside-bend-screen-space-shadows/). Also cited by three's `SSSNode.js`.
- [R21] S. Hillaire, "Physically Based and Unified Volumetric Rendering in Frostbite", SIGGRAPH 2015. [EA Frostbite](https://www.ea.com/frostbite/news/physically-based-unified-volumetric-rendering-in-frostbite).
- [R22] J. Nesky, "50 Game Camera Mistakes", GDC 2014. [Video](https://www.youtube.com/watch?v=C7307qRmlMI).
- [R23] three.js 0.186.1 sources, read locally in `node_modules/three/examples/jsm/`:
  - `csm/CSM.js` (WebGL only)
  - `objects/Water2.js` (flow maps; planar reflection and refraction)
  - `postprocessing/{GTAOPass,SMAAPass,TAARenderPass,BokehPass,LUTPass,SSRPass}.js`
  - `tsl/display/{TRAANode,TAAUNode,SSSNode,GodraysNode,DepthOfFieldNode,SSGINode}.js`
  - `loaders/KTX2Loader.js`, `libs/basis/`
  - `build/three.webgpu.js` (`RenderPipeline`)
  - GTAO references Jimenez et al., [Practical Realtime Strategies for Accurate Indirect Occlusion](https://iryoku.com/downloads/Practical-Realtime-Strategies-for-Accurate-Indirect-Occlusion.pdf).
- [R24] three.js manual, [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer.html). Forum: [porting onBeforeCompile to TSL](https://discourse.threejs.org/t/how-to-port-onbeforecompile-patch-to-tsl-nodes/88730).
- [R25] WebKit, [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/): WebGPU ships in Safari 26.
- [R26] gpuweb, [Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status). Firefox macOS: [MDN BCD issue #28555](https://github.com/mdn/browser-compat-data/issues/28555).
- [R27] [Poly Haven license](https://polyhaven.com/license) (CC0); file sizes from `https://api.polyhaven.com/files/<asset>`.
- [R28] [ambientCG license](https://docs.ambientcg.com/license/) (CC0 1.0).
- [R29] three.js docs, [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).
- [R30] B. Karis, "High Quality Temporal Supersampling", SIGGRAPH 2014. [Advances in Real-Time Rendering](https://advances.realtimerendering.com/s2014/).

Chimpanzee biology. Add these to `docs/research.md` before using them as constants:
- [R6] Finestone, Brown, Ross, Pontzer, "Great ape walking kinematics: implications for hominoid evolution", *Am J Phys Anthropol* 166(1):43–55, 2018. [PubMed](https://pubmed.ncbi.nlm.nih.gov/29313896/).
- [R7] Neufuss, Robbins, Baeumer, Humle, Kivell, "Gait characteristics of vertical climbing in mountain gorillas and chimpanzees", *J Zool* 306:129–138, 2018, doi:10.1111/jzo.12577. [PDF](https://www.eva.mpg.de/documents/Elsevier/Neufuss_Gait_JZool_2018_3004328.pdf).
- [R8] K. D. Hunt, "Positional behavior of *Pan troglodytes* in the Mahale Mountains and Gombe Stream National Parks, Tanzania", *Am J Phys Anthropol* 87:83–105, 1992. [Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/ajpa.1330870108).
- [R9] Hunt 1994 bipedality figures, as summarised in [Frontiers in Ecology and Evolution 2024, 10.3389/fevo.2024.1321115](https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2024.1321115/full). Re-read the primary before citing.
- [R10] Parr, Waller, Vick, Bard, "Classifying chimpanzee facial expressions using muscle action", *Emotion* 7(1):172–181, 2007. [PubMed](https://pubmed.ncbi.nlm.nih.gov/17352572/).

---

## 9. Implementation record (28 Sep 2026)

- **Acceptance images:** `artifacts/visual/before/` (captured from a snapshot of the pre-change source) and `artifacts/visual/after/`, same ids as §6, via `node scripts/visual-scenes.mjs --out <dir> [--only C9,E5] [--tonemap agx]`. The creature harness `mode=faces` now poses a forward-facing seated portrait with gaze held (`&attn=1` restores attention), so C2 before/after tiles differ in pose.
- **Performance:** `artifacts/perf/visual-quick.json`, `visual-pop120.json` (perf-probe), `gpu-before.json` / `gpu-after.json` (throughput subtraction; see §0 on GPU timing).
- **Fast-speed note:** with `?pop=120` at 1 day/s and Max, dropped frames vary run to run (3–11% and 9–20%) on both the pre-change snapshot and the new code; those scenarios are sim-bound (sim 6–9 ms per frame) and the renderer adds ≈ 0.25 ms of `anim` there. The default world stays at ≤ 0.8% drops at every speed.
- **New sim contract field:** `Chimp.carryingDeadId?` (docs/simulation.md §5, §13; tests in `tests/sim-life.test.ts`).
- **Tests:** `tests/render-{motion,gait,secondary,camera,flow}.test.ts`.
