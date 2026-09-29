# Graphics, performance and camera plan: clean zoom, detail on demand, 4 ms back

Status: Stages G0–G5 implemented 28–29 Sep 2026 (G6 out of scope; D2 and D13 deferred). Measured results and deviations in §8. Author: rendering and camera pass. C5b (field view) in §9.
Scope: camera behaviour when zooming in every view, occluder fading, detail that scales with zoom, and a GPU budget that frees at least 4 ms at 1440×900, DPR 2, quality 'high'.
Binding rules: `AGENTS.md` invariants. The renderer never writes `World`. No new npm dependencies. No per-frame allocation in render loops. 60 fps at 1440×900. Every new GPU feature ships with its measured cost and a quality gate. Stylizations are labelled.
Builds on: `docs/visual-plan.md` (Stages 1–5 shipped; G1–G5 camera items shipped; F3 contact shadows, F6 godrays, E6 impostors, D1/D3/D4/D7 deferred). Must stay compatible with `docs/realism-design.md` §5.1 Stage C5b (field window plus overview, cross-faded by zoom).

---

## 0. Summary

**What is wrong today (measured, §1):**

1. **Zooming in the strategy view shows more leaves, not more chimps.** The cutaway only runs for perspective cameras with a subject (`scene.ts`: `uCut.w = 0` for the orthographic RTS camera). At every RTS zoom from 1.04 to 6, 0% of a ground or tree subject's body is visible; at zoom 6 the frame is a wall of leaf cards with the animal drawn as a flat community-tinted x-ray blob.
2. **The close-view cutaway clears one sight line in plan, not the screen.** It fades objects whose axis lies near the 2D camera→subject line, with a smooth "along" window centred on the subject. Objects beside the subject (a forager at its tree, the commonest case) fade only about halfway and leave a sliver across the body: 30–38% of the subject visible from 40 m down to 3.6 m. Horizontal logs thin toward the wrong axis. Limbs near the camera never fade because the near-camera test uses the trunk base. Other party members are not protected (3–37% of their bodies visible at 6 m in three of four scenes).
3. **The camera never re-frames around the subject's own tree.** `sightBlocked` skips any trunk within bark + 0.5 m of the subject, so a forager hugging a trunk with the camera on the far side stays blocked indefinitely.
4. **Zoom is not one axis.** RTS (orthographic) and close (perspective) are separate modes joined by a hard cut; wheel zoom steps; pitch never changes with distance; C5b will add a third representation cross-faded by zoom.
5. **Up close, surfaces run out of detail.** Leaf cards use one 1024² atlas with 512² cells (≈ 0.9 cm per texel on the largest 4.8 m clump cards, magnified 3–4× at 4 m) and flat per-leaf colour, trunks are 12-sided untextured-relief tubes, fruit is flat-shaded 20-triangle icosahedra, LOD switches pop.
6. **The GPU is spent on things nobody sees.** Every vegetation kind is one map-wide `InstancedMesh`, so neither the view frustum nor the shadow frustum culls anything: every view submits 820 k vegetation/rock/log triangles to the colour pass and 623 k to the shadow pass, although in the default close view only 5% of those instances are inside the camera frustum and 23% inside the light frustum. The 4× MSAA half-float target (with a depth resolve) is stored to memory and blitted every frame: three invalidates multisampled buffers only on the Oculus browser, and this Chrome has no `WEBGL_multisampled_render_to_texture`.

**Top recommendations (expected gain, cost):** see §4.2 for the full ordered list.

| # | Recommendation | Expected gain | Cost |
| --- | --- | --- | --- |
| 1 | Keep-clear camera: per-object fade table (trees, rocks, logs) driven by screen-space overlap with up to 8 protected targets, near-camera fade, temporal hysteresis; analytic capsules for the understory | Subject visibility ≥ 90% in every close/cinematic acceptance scene (from 30–38% worst case); party visibility ≥ 70% | CPU ≈ 0.1 ms, GPU ≈ 0.1 ms; 1 new pure module |
| 2 | Zoom as one axis: RTS canopy lens (strategy-game roof cutaway), zoom-through from RTS into the perspective view, pitch-by-distance curve, smoothed wheel zoom, 0.7 s view blends | Chimps visible (not x-ray) at RTS zoom ≥ 3; one continuous zoom that C5b reuses | Low GPU; medium camera work |
| 3 | Cell-culled instance compaction (16 m cells) so the camera and light frusta actually cull vegetation, rocks and logs; density-sized, camera-fit shadow map | Close ≈ −3.5 ms, RTS zoomed ≈ −4 ms, RTS overview ≈ −2.5 ms (low–moderate confidence); submitted triangles drop to 12% (colour) / 33% (shadow) in close views; cells are also the unit C5b streams | Medium; ≤ 0.3 ms CPU, same draw-call count |
| 4 | Pixel budget: internal DPR 1.2 with FSR 1 (EASU + RCAS) to native, cheaper bloom, GTAO off in the overview, MSAA-store and shadow-target spikes | ≈ −1 to −2.5 ms depending on spikes (low–moderate confidence), and a sharper final image than today's browser bilinear upscale | Medium |
| 5 | Detail on zoom, paid from the savings: near leaf vein normals (and a 2048² atlas if the texture budget allows), bark normal + near-trunk LOD, hero chimp LOD and dithered LOD cross-fades, smooth fruit, near litter decals, contact shadows in close/cinematic | Visibly sharper close-ups; ≤ 1.5 ms of the freed budget | Low–medium each |

**Camera fix in one paragraph:** each frame the rig names up to 8 *keep-clear targets* (selected chimp, camera subject and its partners, chimps near the screen centre, or the view centre when nothing is selected). A pure CPU module projects every tree, rock and log (≈ 970 objects) and marks it as an occluder when its trunk capsule or crown sphere overlaps a target's screen circle *and* lies in front of it, when it is within a zoom-scaled radius of the camera, or (zoomed-in RTS) when its crown falls inside a central canopy lens. Fades ease in over 0.15 s and out over 0.45 s after a 0.35 s hold, with 12 px of screen hysteresis, and are uploaded as a 2-channel per-object texture (crown, wood). Crowns thin clump by clump (per-clump hash thresholds, no screen door), wood dissolves with a world-noise edge under alpha-to-coverage, the understory shrinks analytically around each target's capsule and near the camera. Host trees (climbed, drummed, perched on) never fade; the camera re-orbits instead. Terrain, water, animals, nests and UI never fade.

**Stages:** G0 tooling → G1 keep-clear camera (close, cinematic) → G2 one zoom axis (RTS lens, zoom-through, pitch curve) → G3 geometry budget (cells, culling, shadow fit) → G4 pixel budget (MSAA, FSR 1, dynamic resolution, pacing) → G5 detail on zoom → G6 optional (impostors, foliage depth prepass). §5.

---

## 1. Current-state audit

### 1.1 Method

- **Server and machine.** Model-free probe server on port 5192 (`vite --config` a scratch config with `server.hmr = false, watch = null`, so other agents' edits could not reload probe pages mid-run). Apple M3 Pro, Chrome 154 headless, ANGLE/Metal. The machine was heavily loaded by other agents during this pass (load average 17–26, another project's headless Chrome GPU process at up to 670% CPU), so every GPU number below is marked with its noise.
- **Scratch folder** (session-specific; may be deleted, Stage G0 re-captures to `artifacts/visual/gfx-before/`): `/private/tmp/claude-501/-Users-juanbermudez-Desktop-MGOGO/f5af9b78-d6c6-47d0-abc3-1895e50c3362/scratchpad/gfx-plan/`, abbreviated `S/`. Scripts: `S/occl.mjs`, `S/occl2.mjs` (occlusion sequences), `S/gpu2.mjs` and `S/gpu3.mjs` (GPU subtraction, A/B/A bracketing and 8-cycle alternation), `S/cull.mjs` (culling potential), `S/detail.mjs` (close-up captures), `S/vite.probe.config.mjs`.
- **Subject visibility (SV).** After a frame renders, the resolved depth of `post.sceneTarget` is copied to a float target. 40 points on the subject's body axis (root to head, 4 rings) are projected; a point counts as visible unless the scene depth there is more than 0.45 m × body size in front of it. SV = visible share (%).
- **Party visibility (PSV).** The same test, 10 points each, for every other animal within 14 m of the subject that is on screen; mean %.
- **Near clutter (NC).** Share of screen pixels closer than min(3 m, 0.35 × subject distance).
- **Subjects** are picked by rule, not id: *canopy* = ground adult with most crown lobes overhead; *tree* = highest animal; *trunk* = ground adult closest to a trunk ≥ 0.3 m radius; *slope* = ground adult on the steepest terrain. Env harness, seed 48, `advance=3&pause=1&quality=high`, 1440×900.

### 1.2 Occlusion measurements

**RTS (orthographic), panned onto the subject, `S/occl/rts-*-z*.png`, sheet `S/occl/sheet-rts.png`:**

| Subject | zoom 1.04 | 2 | 3 | 4.5 | 6 | Subject size at zoom 6 |
| --- | --- | --- | --- | --- | --- | --- |
| canopy (Ilobe, foraging) | SV 0% | 0% | 0% | 0% | 0% | 79 px, drawn as x-ray |
| tree (Aroko, 8.8 m up) | 0% | 0% | 0% | 0% | 0% | 80 px, drawn as x-ray |

**Close view, dolly toward the subject at the default ≈ 29° elevation, `S/occl/close-*-d*.png`:**

| Subject | 40 m | 22 m | 12 m | 7 m | 5 m | 3.6 m | Orbit at ≈ 4 m (8 azimuths): min / mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| canopy forager (bark gap 1.0 m) | 33 | 33 | 33 | 35 | 38 | 38 | 30 / 87 |
| tree (8.8 m up) | 100 | 100 | 100 | 100 | 100 | 100 | 95 / 99 |
| near trunk | 100 | 100 | 100 | 100 | 95 | 100 | 93 / 98 |
| slope | 100 | 100 | 100 | 93 | 100 | 95 | 100 / 100 |
| canopy forager, night 21:30 | 33 | 30 | 30 | 38 | 38 | 38 | 30 / 87 |
| canopy forager, rain | 33 | 33 | 25 | 35 | 38 | 38 | 30 / 86 |

**Close view, low elevations and party visibility (8 azimuths each), `S/occl2/*.png`, sheet `S/occl/sheet-low.png`:**

| Subject | 30°, 12 m SV mean / min · PSV | 12°, 12 m | 12°, 6 m | 8°, 3.8 m | NC max |
| --- | --- | --- | --- | --- | --- |
| canopy forager | 72 / 40 · 23 | 71 / 23 · 15 | 80 / 40 · 3 | 86 / 18 · 15 | 3.9% |
| near trunk | 98 / 93 · 77 | 92 / 65 · 63 | 94 / 80 · 37 | 95 / 85 · 32 | 1.0% |
| slope | 100 / 98 · 71 | 97 / 88 · 49 | 99 / 98 · 3 | 100 / 98 · 3 | 0.5% |
| tree | 85 / 48 · 74 | 92 / 75 · 86 | 98 / 88 · 91 | 99 / 95 · 90 | 4.1% |

**Cinematic, 8 samples 2.5 s apart (`S/occl/cine-t*.png`):** SV 50, 100, 100, 93, 93, 100, 98, 100. The one bad shot has a trunk across the subject (`cine-t0.png`).

What the frames show:
- `S/occl/sheet-rts.png`: zoom 1 → 6 turns the view into leaf cards; animals read only as x-ray silhouettes.
- `S/occl/close-canopy-d3.6.png`, `S/occl2/low-canopy-e12-d6-a4.png`: a half-thinned trunk stands as a dark sliver across the forager's body; the gold x-ray fill shows through it.
- `S/occl2/low-canopy-e8-d3.8-a0.png`: a fallen log hides the forager's body at 3.8 m.
- `S/occl2/low-tree-e30-d12-a4.png`: the camera sits among a tree's limbs; green limbs cross the whole frame (NC 4.1%).
- `S/occl/close-canopy-d40.png`: at 40 m the sight-line cut opens a cylindrical tunnel through the crowns; the shaded, fogged floor inside reads as a grey smoke column.
- `S/occl/close-rain-d12.png`: in rain under canopy the frame is near black and the subject reads only through its x-ray outline (an exposure issue, noted for G5).

### 1.3 Root causes (code)

| # | Cause | Where | Effect |
| --- | --- | --- | --- |
| R1 | Cutaway disabled for orthographic cameras; the RTS has no roof/canopy cutaway at any zoom | `scene.ts` `update()`: `if (perspective && subject) … else uCut.w = 0` | RTS SV 0% at every zoom |
| R2 | One subject only; the "subject" is null when nothing is followed or selected | `camera.ts` `hasSubject`; `shared.ts` `uCut` is one `vec4` | Party members and unselected animals are never cleared |
| R3 | The sight test is a 2D line in plan with a smooth along-window centred on the subject (`smoothstep(-reach*0.5-0.5, reach*0.3+0.5, along)`), a crown-radius-based reach and a "top above the line" test | `shared.ts` `envSightFade` | Objects level with the subject fade about 50% and stay as slivers; objects that cover the subject on screen but sit slightly behind the line stay |
| R4 | Instanced wood thins toward `instanceMatrix[1]` (local up) | `shared.ts` ENV_CUT == 1 wood branch | Correct for trunks; wrong for logs (lying along local X) and odd for limbs |
| R5 | Near-camera test uses the trunk base (`aTree.xy`) and 2–4 m in plan | `shared.ts` ENV_CUT == 1 | Limbs and crowns metres from their trunk axis never fade near the camera |
| R6 | No temporal state: the fade is a pure function of this frame's geometry | `shared.ts` | Any subject jitter or camera motion across a threshold would pop; today it is smooth only because the window is wide (which causes R3) |
| R7 | Trunk re-framing skips the subject's own tree (`hypot(b − t) < r + 0.5 → continue`) and only runs after 0.5 s of blocking | `camera-rules.ts` `sightBlocked`, `camera.ts` `avoidTrunks` | Forager-at-trunk stays blocked |
| R8 | Cinematic shot validation tests crowns and terrain, not trunks, logs or understory | `camera.ts` `evaluate` | Occasional trunk-blocked shots |
| R9 | Separate cameras joined by hard cuts, stepwise wheel zoom (OrbitControls damps rotate/pan, not dolly), fixed pitch | `camera.ts` `setView`, OrbitControls | No continuous zoom; C5b needs one |
| R10 | Cut clumps and trunks keep casting shadows (by design, for stability) and the cut radius is `reach + 2.5 m` around a crown-radius reach | `shared.ts`, `foliageDepthMaterial` | The 40 m "smoke tunnel" |

### 1.4 Low detail up close

Measured from the sources, and visible in `S/occl/close-*-d3.6.png` and `S/occl2/*-d3.8-*.png`:

| Item | Today | Symptom at 3.5–6 m |
| --- | --- | --- |
| Leaf cards | 1024² canvas atlas, 4 cells of 512² (`textures.ts` `createLeafAtlas`); cards 1.25 m × clump scale 1.3–3.8 → up to ≈ 4.8 m per 512 px ≈ 0.9 cm per texel; at 4 m one texel covers ≈ 3.7 screen pixels | Soft, magnified leaves with flat per-leaf colour: crowns read as stamped sprites (`S/detail/leaves-crop.png`) |
| Trunks, limbs, buttresses | 12-sided (limbs 6-sided) cylinders, 256×512 canvas bark, no normal map | Faceted silhouettes, smooth "pipe" shading (`close-canopy-d3.6.png`, left edge) |
| Fruit | `IcosahedronGeometry(0.13, 0)`, flat-shaded | Faceted blobs in perspective |
| Ground | 1 m grid, hex-tiled 512² litter, detail normal within 12 m | Acceptable; litter decals (D7) still missing |
| Chimps | LOD0 12.6 k vertices at > 160 px, shells on LOD0, hard LOD switches at 135/160 and 45/55 px | LOD pops; head highlights blotchy under 1 m (visual-plan Stage 3 note) |
| Shadows | 4096² single map fixed at ±42 m around the target in close views (≈ 2 cm texels); in RTS at zoom 6 ±16.9 m (0.8 cm texels) | Close shadows fine; half the close-view map lies behind the camera; zoomed RTS over-resolved |

### 1.5 GPU and CPU breakdown per view

**A. Idle-machine reference (from `AGENTS.md` and visual-plan §9, same probe method):** full frames uncapped 14.9 ms RTS, 12.7 close, 15.4 cinematic (DoF on), 15.1 storm, 14.2 night; split ≈ 5 ms shadow map, ≈ 5 vegetation, ≈ 3 post, ≈ 3 MSAA.

**B. This pass, loaded machine** (`S/gpu2.mjs` A/B/A bracketing and `S/gpu3.mjs` 8-cycle alternation, p25 frame interval, DPR 2, 'high'). Cost of an item = frame time with it − without it. Noise is large (IQR 3–13 ms on single items; another project's headless Chrome shared the GPU), so these numbers only confirm direction; G0 re-measures on an idle machine.

| Item removed | close-day, `S/gpu3.mjs` median (IQR) | rts-day, `S/gpu3.mjs` median (IQR) | close-day, `S/gpu2.mjs` A/B/A |
| --- | --- | --- | --- |
| Full frame (p25 interval) | 13.2 ms | 15.6 ms | 15.2 ms |
| All vegetation (colour + shadow) | 4.8 (3.2) | 5.9 (1.2) | 4.35 |
| Vegetation shadow casting only | 1.75 (6.5) | 0.95 (0.85) | 5.3 |
| Whole shadow pass (map frozen) | 1.15 (4.25) | 0.2 (3.55) | 7.6 |
| Shadow map 4096 → 2048 | 2.9 (5.8) | −0.35 (4.05) | 2.65 |
| MSAA 4× → off | 3.05 (11) | 2.9 (4.55) | 2.4 |
| GTAO | 1.0 (8.5) | 1.2 (2.25) | 5.7 |
| Bloom | 1.95 (13) | 0.0 (0.6) | 2.25 |
| Exposure adaptation | 0.1 (4.6) | 0.05 (0.65) | −0.15 |
| Terrain group | 1.05 (2.5) | 1.05 (6.6) | 2.45 |
| Pixel ratio 1.35 → 1.2 | 4.4 (5.2) | **1.35 (1.05)** | — |
| Pixel ratio 1.35 → 1.0 | 6.65 (5.2) | **3.4 (0.25)** | 3.9 |

Readable signals: vegetation ≈ 5–6 ms and MSAA ≈ 3 ms (consistent with the idle reference); resolution sensitivity in RTS is tight (1.35 → 1.2 saves ≈ 1.35 ms, → 1.0 saves ≈ 3.4 ms); bloom is cheap in RTS. The shadow items contradict each other between methods and are left to G0.

**C. Culling potential (load-independent, `S/cull.mjs`).** Vegetation, rocks, logs and fruit: 820 k triangles submitted to the colour pass and 623 k to the shadow pass in every view (plus 184 k near-field understory, 67 k lianas, 387 k ground, ≈ 180 k creatures). Share whose bounds actually intersect the frustum:

| View (`Hf`) | Colour: per instance | 16 m cells | 32 m tiles | 64 m tiles | Shadow: per instance | 16 m cells | 64 m tiles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RTS zoom 1.04 (98.6 m) | 59% | 72% | 81% | 89% | 89% | 93% | 99% |
| RTS zoom 3 (34.2 m) | 7% | 22% | 35% | 54% | 20% | 32% | 53% |
| RTS zoom 6 (17.1 m) | 2% | 10% | 20% | 48% | 4% | 13% | 42% |
| Close, default 11 m (8.4 m) | 5% | 12% | 21% | 33% | 23% | 33% | 73% |
| Close, 4 m (3.1 m) | 2% | 8% | 14% | 26% | 23% | 33% | 73% |
| Close, 40 m (30.7 m) | 20% | 32% | 41% | 53% | 23% | 33% | 73% |
| Cinematic sample (6.4 m) | 34% | 44% | 50% | 67% | 24% | 36% | 55% |

Crowns are almost never in the close-view colour frustum (0% of 23 k clumps in the default framing: the camera looks down at the floor), yet all of them are vertex-shaded twice a frame.

**D. Shadow density vs screen density.** The 4096² map spans ±42 m in close views (2.0 cm texels) and `min(170, 0.62 × frame width)` in RTS.

| View | Shadow extent | Texel | Screen pixel at focus (1215 px tall) | Texel : pixel |
| --- | --- | --- | --- | --- |
| RTS zoom 1.04 (`Hf` 98.6 m) | ±97.8 m | 4.8 cm | 8.1 cm (13 cm along the 37° view) | 0.6 |
| RTS zoom 3 (`Hf` 34.2 m) | ±33.9 m | 1.7 cm | 2.8 cm | 0.6 |
| RTS zoom 6 (`Hf` 17.1 m) | ±16.9 m | 0.8 cm | 1.4 cm | 0.6 |
| Close default (11 m, `Hf` 8.4 m) | ±42 m (half behind the camera) | 2.0 cm | 0.7 cm | 2.9 |
| Close 4 m (`Hf` 3.1 m) | ±42 m | 2.0 cm | 0.25 cm | 8 |

RTS shadows are over-resolved at every zoom (a 2048² map would give about one texel per screen pixel); close views are under-resolved near the subject while half the map covers ground behind the camera. Hence G3's density-sized, camera-fit shadow map.

**E. CPU.** `scripts/perf-probe.mjs --seconds 6 --dpr 2` (loaded machine), main-thread ms mean/p95: rts-1x-day frame 2.85/4.5 (anim 0.63/1.4, three submit `render` 1.38/2.3, env 0.18, overlays 0.24, labels 0.12), 3.2% dropped frames; close-1x-day frame 2.4/4.0 (anim 0.51/0.9, render 1.19/2.1, 103 draw calls), 0.3% dropped; cinematic-1x-day frame 1.48/2.5, 0% dropped; rts-1d-day frame 6.9/11.9 with sim 3.8/8.1 and 30% dropped (sim-bound, see `AGENTS.md`). At 1× the CPU has ≈ 12 ms of headroom: the GPU is the constraint. Three's submit costs ≈ 12–14 µs per draw call here, which rules out designs that multiply draw calls (§4.2).

**F. Scene stats (close view, seed 48):** 65–70 draw calls, 91 programs, 2.76–2.78 M triangles per frame across both passes; instances: 23,053 leaf clumps, 11,679 limbs, 2,062 buttresses, 1,400 trunk segments, 2,200 shrubs, 6,400 fern fronds, 3,200 herbs, 9,400 near-field plants, 221 rocks, 48 logs. Available WebGL extensions of note: `WEBGL_multi_draw`, `EXT_clip_control`, `WEBGL_clip_cull_distance`, `KHR_parallel_shader_compile`, `EXT_disjoint_timer_query_webgl2` (unreliable here); no `WEBGL_multisampled_render_to_texture` (so three stores and blits the MSAA target).

---

## 2. Camera design spec

### 2.1 One zoom axis

Zoom is measured as the **frame height at the focus**, `Hf` (metres): `(top − bottom) / zoom` for the orthographic camera, `2 · d · tan(fov/2)` for perspective views (the formula `scene.getListener()` already uses for audio, via `zoomFromFrameHeight`). Every rule below keys on `Hf`, so fades, detail and C5b's overview/field cross-fade share one scale.

| Band | `Hf` | Camera | What changes |
| --- | --- | --- | --- |
| Overview | ≥ 60 m | Orthographic RTS (zoom ≤ 1.7) | Full canopy; x-ray silhouettes; C5b overview (canopy surface only) lives here |
| Strategy close | 60 → 17 m | Orthographic RTS (zoom 1.7 → 6) | Canopy lens opens (§2.4); animals drawn as real meshes inside the lens, x-ray outside |
| Zoom-through | wheel-in held past RTS zoom 6 | 0.7 s blend into perspective | Focus = animal under the cursor within 6 m, else the ground point (free look) |
| Field | 54 → 2.7 m (orbit 70 → 3.5 m) | Perspective close view | Keep-clear fades (§2.3), pitch-by-distance (§2.5); C5b field window |
| Out | wheel-out held past orbit 70 m | 0.7 s blend back to RTS | RTS zoom chosen so `Hf` matches (continuity) |

The RTS pitch stays at 37° in every band (predictable map reading; labels and x-ray tuned for it). Why a zoom-through rather than a deeper orthographic zoom: the orthographic camera sits 260 m away at a fixed 37° pitch, so zooming deeper only magnifies canopy. Strategy games that let the player get close hand over to a lower, perspective view (the "tilt as you zoom in" convention); here that view already exists (the close follow). Design assumption; the strategy-camera convention is not sourced to a single talk.

### 2.2 Keep-clear targets (what the camera protects)

Each frame `camera.ts` fills `rig.keepClear` (fixed array of 8, no allocation), in priority order:

1. The selected chimp, if on screen.
2. The camera subject: close-follow animal; cinematic shot participants (up to 4, as `subjectOf` already gathers them).
3. When `Hf` < 40 m: other animals whose screen position is inside the central 60% of the frame, nearest the screen centre first, until 8.
4. When none of the above exist (nothing selected, RTS or free-look close): the view-centre ground point, radius 1.5 m.
5. (Optional) the animal under the pointer, if hover highlighting is added later.

Each target: world centre (body mid-point `bx, by + 0.5·s, bz`), radius `ρ = 0.55 · s` (s = rendered body size, `RENDER_SCALE` included), and `hostId` (tree index of the tree it climbs, drums on or perches in; −1 otherwise). The creature layer already computes `a.visible`, `a.px`, `a.climbTree`, `a.drumTree`, `a.elevated`; it gains `keepClearCandidates(out)` (read-only).

### 2.3 Occluder classes and fade rules

**Per-object fades (CPU, temporally smoothed).** One table of every tree (700 with seed 48: 240 simulated food trees + 460 fillers), rock (221) and log (48): ≈ 970 today, pooled per tile for C5b (§5 G3). Per object: trunk capsule (base → crown base, girth; logs: end to end, radius; rocks: sphere), crown bound (sphere around the lobes), kind, and two smoothed fades: `crownFade`, `woodFade` ∈ [0, 1].

Raw fade targets, recomputed every frame:

| Rule | Applies to | Condition | Raw target |
| --- | --- | --- | --- |
| K: keep-clear | crown and wood separately | projected bound overlaps any target's screen circle (radius = projected ρ × 1.3 + margin; margin 16 px entering, 28 px leaving) **and** the bound's nearest view depth < target depth − ρ | 1 |
| N: near camera (perspective only) | crown and wood | distance camera → bound < `rNear = clamp(0.3 · dFocus, 1.2, 5)` m | 1 |
| L: canopy lens (§2.4) | crown only | `Hf` < 60 m, crown centre inside the lens ellipse, crown bottom > focus height + 2 m | lens weight (0..1, soft edge) |
| H: host exemption | both | object index = any target's `hostId` | forced 0 (crown keeps the existing overhead "skylight" opening `envOverhead`) |

Smoothing per channel: rising `f += (raw − f)(1 − e^(−dt/0.15))`; falling only after `raw` has stayed 0 for 0.35 s, then `f += (raw − f)(1 − e^(−dt/0.45))`. Fade in fast (the view clears as soon as something intrudes), restore slowly (nothing flickers back), the same asymmetry Cinemachine's Deoccluder exposes as a minimum occlusion time and damping [C2]. Output: an RG8 `DataTexture` (64 × 32 = 2,048 slots), updated with one `texSubImage2D` per frame (≈ 4 KB).

**How each class fades on the GPU:**

| Class | Method | Why |
| --- | --- | --- |
| Leaf clumps (crowns) | Stochastic per-clump shrink: clump scale × `smoothstep(h − 0.12, h + 0.12, 1 − crownFade)`, `h` = hash of the clump centre in [0.1, 0.9]. The existing clump-level analytic cut stays as the fine layer near the protected line, with its reach tightened to the clump radius + 0.6 m (fixes R10) | Crowns thin one clump at a time over ≈ 0.1 s; no screen door, no slicing (keeps visual-plan E5) |
| Wood: trunks, limbs, buttresses, lianas, logs, rocks | World-noise dissolve under alpha-to-coverage: `n = noise(world·1.7)`, keep where `n > 1.1·woodFade − 0.05`, darken a 0.04-wide edge; with MSAA off ('low') the same threshold as a plain discard. Replaces the thin-to-axis vertex collapse (fixes R4) | Stable in world space (no crawl when the camera moves), reads as intentional, no axis assumption |
| Understory (shrubs, ferns, herbs, near-field tile) | Analytic in the vertex shader, no CPU state: shrink to the root when inside `rNear` of the camera, or when the plant's top rises into any target's capsule (camera → target segment, radius ρ + 0.4 m) and its root is nearer than the target | ≈ 22 k instances: too many for per-object state; inputs (camera, targets) are already smooth |
| Fruit | Follows its tree's `crownFade` | Consistent with the crown |
| Chimps | Never fade (dead-body fade unchanged). When a non-fadeable occluder (terrain ridge, host tree, another animal) covers a target, the existing x-ray silhouette remains the fallback | Content, not clutter |
| Terrain, water, nests of targets, labels, rings, UI | Never fade | Orientation and legibility |

Shadows: faded objects keep casting (depth materials unchanged), so lighting under an opened canopy stays dappled and stable. Picking: faded objects were never pickable (only creature pick volumes are raycast), so nothing changes.

**Fixes to existing rules:**
- `sightBlocked` keeps skipping the host tree only when the target climbs, drums or perches on it (`hostId`); a trunk beside a ground forager is an ordinary occluder and fades (fixes R7). For host trees the re-orbit stays, and triggers after 0.25 s instead of 0.5 s.
- Cinematic `evaluate()` adds a penalty for host-tree and terrain overlap of the subject's screen circle (non-fadeable occluders); fadeable ones no longer reject shots, so the director can use lower, closer angles and falls back to the overhead crane less often (fixes R8).

### 2.4 RTS canopy lens (roof cutaway for a forest)

In the strategy view, "objects close to the camera" are the crowns. The lens is a soft screen-space ellipse in which crowns fade (rule L), leaving trunks, limbs, understory and animals, with the canopy kept around the frame for context.

- Radius (fraction of frame height): `R(Hf) = 0.42 · smoothstep(60, 20, Hf)`; zero at zoom ≤ 1.7, full at zoom ≥ 5. Aspect follows the viewport (circle in pixels).
- Centre: the screen position of the selected chimp if on screen, else the screen centroid of the keep-clear targets, else the view centre. Eased with τ = 0.3 s so the lens glides.
- Soft edge: weight falls from 1 to 0 over the outer 25% of the radius; with per-clump thresholds this gives a ragged, natural edge.
- Keep-clear rule K still runs in RTS, so a selected chimp outside the lens is still cleared.
- X-ray silhouettes stay for animals outside the lens and under canopy.
- Layer toggle "canopy off" (existing) keeps working as the global override.

Label: stylization (a map-reading aid, like building roof cutaways in strategy and simulation games).

### 2.5 Close view controls

| Behaviour | Spec | Replaces |
| --- | --- | --- |
| Pitch by distance | Preferred elevation `θ(d) = 14° + 31° · smoothstep(0, 1, ln(d/3.5) / ln(20))`: 14° at 3.5 m, ≈ 24° at 11 m, 45° at 70 m. Wheel zoom slides along the curve; right-drag sets an offset from the curve (clamped ±20°) that zoom preserves; view changes reset it | Fixed pitch (user-set only) |
| Smoothed zoom | Wheel sets a target distance (× 0.88 per notch); distance follows a critically damped spring, τ = 0.12 s. Same for RTS `zoom` | OrbitControls stepwise dolly |
| Terrain-aware arm | 8 height samples along camera → target; if terrain rises above the segment by > −0.5 m, raise elevation (not distance) just enough, spring τ 0.25 s up / 0.8 s down, max +25° | Floor clamp at the camera only (0.7 m) |
| Trunk clearance | Keep 0.6 m push-out; re-orbit ±25° only for host trees (§2.3) | Re-orbit for any trunk except the host |
| Near plane | Stays 0.4 m; `rNear ≥ 1.2 m` guarantees nothing reaches it | — |
| Free look | Close view without a follow target (after zoom-through onto empty ground): left-drag pans, keep-clear = animals near the centre + the ground point | Close view always follows |
| Follow framing | Unchanged: 0.3 s look-ahead, ±8% dead zone, speed-capped spring | — |

### 2.6 View transitions

Blend 0.7 s (ease-in-out cubic) instead of cutting: position, quaternion (slerp), FOV. Orthographic → perspective uses a dolly zoom: a perspective camera starts far back on the RTS axis with the narrow FOV that matches the orthographic frame height at the focus (`fov0 = 2·atan(Hf / (2·D0))`, D0 = 260 m), then moves in while the FOV widens to 42°; the reverse on the way out. The fade table and lens use the blended camera, so the canopy opens during the blend. With `prefers-reduced-motion`, cut.

### 2.7 Pseudo-code

```ts
// src/render/env/occluders.ts — pure (no three.js, no DOM), unit-tested.
export interface OccluderTable {
  n: number;
  kind: Uint8Array;                       // 0 tree, 1 rock, 2 log
  cap: Float32Array;                      // 7 per object: ax ay az bx by bz r (trunk/log capsule, rock sphere as a = b)
  crown: Float32Array;                    // 4 per object: cx cy cz r (r = 0: no crown)
  fade: Float32Array;                     // 2 per object: crown, wood (smoothed) → RG8 texture
  raw: Float32Array;                      // 2 per object
  clearT: Float32Array;                   // 2 per object: seconds raw has been 0
}
export interface KeepTarget { x: number; y: number; z: number; r: number; hostId: number }
export interface OccView { viewProj: Float32Array; cam: Float32Array; ortho: boolean; w: number; h: number; hf: number; lens: { x: number; y: number; r: number }; focusY: number }

export function classify(t: OccluderTable, targets: KeepTarget[], nTargets: number, v: OccView, rNear: number): void {
  for (let i = 0; i < t.n; i++) {
    let crown = 0, wood = 0;
    for (let k = 0; k < nTargets; k++) {
      const g = targets[k]; if (g.hostId === i) { crown = wood = -1; break; }
      const tc = projectCircle(v, g.x, g.y, g.z, g.r * 1.3, marginFor(t, i, k));   // px centre, px radius, view depth
      if (capsuleOverlaps(v, t.cap, i, tc) && capsuleNearDepth(v, t.cap, i) < tc.depth - g.r) wood = 1;
      if (t.crown[i * 4 + 3] > 0 && sphereOverlaps(v, t.crown, i, tc) && sphereNearDepth(v, t.crown, i) < tc.depth - g.r) crown = 1;
    }
    if (crown >= 0) {
      if (!v.ortho) { if (distToCapsule(v.cam, t.cap, i) < rNear) wood = 1; if (distToSphere(v.cam, t.crown, i) < rNear) crown = 1; }
      if (v.lens.r > 0) crown = Math.max(crown, lensWeight(v, t.crown, i));
    }
    t.raw[i * 2] = Math.max(0, crown); t.raw[i * 2 + 1] = Math.max(0, wood);
  }
}

export function smooth(t: OccluderTable, dt: number): void {
  const kin = 1 - Math.exp(-dt / 0.15), kout = 1 - Math.exp(-dt / 0.45);
  for (let j = 0; j < t.n * 2; j++) {
    const raw = t.raw[j];
    t.clearT[j] = raw > 0 ? 0 : t.clearT[j] + dt;
    if (raw > t.fade[j]) t.fade[j] += (raw - t.fade[j]) * kin;
    else if (t.clearT[j] >= 0.35) t.fade[j] += (raw - t.fade[j]) * kout;
  }
}
```

```glsl
// shared.ts, ENV_FADE (replaces the per-instance parts of ENV_CUT; the fine clump cut stays)
attribute float aObj;                              // object slot in uFade
uniform sampler2D uFade; uniform vec2 uFadeSize;   // RG: crown, wood
vec2 envObjFade() { vec2 uv = (vec2(mod(aObj, uFadeSize.x), floor(aObj / uFadeSize.x)) + 0.5) / uFadeSize; return texture2D(uFade, uv).rg; }
// crowns (vertex): per-clump threshold
float h = 0.1 + 0.8 * fract(sin(dot(envClumpCentre, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
float keep = smoothstep(h - 0.12, h + 0.12, 1.0 - envObjFade().r);
envWorld.xyz = mix(envClumpCentre, envWorld.xyz, keep);
// wood (fragment, alpha-to-coverage)
float n = texture2D(uNoise, vEnvWorld.xz * 0.37 + vEnvWorld.y * 0.29).g * 0.6 + texture2D(uNoise, vEnvWorld.zy * 0.83).b * 0.4;
float edge = n - (1.1 * vWoodFade - 0.05);
diffuseColor.a *= smoothstep(0.0, 0.02, edge); diffuseColor.rgb *= mix(0.35, 1.0, smoothstep(0.02, 0.06, edge));
```

```ts
// scene.ts, per frame (after rig.update, before vegetation/terrain updates)
rig.fillKeepClear(targets);                           // §2.2, uses creatures.keepClearCandidates
view = occView(rig.camera, rig.hf, rig.lens, rig.focusY);
classify(occTable, targets, rig.keepCount, view, rNear(rig.focusDistance));
smooth(occTable, dt);
writeFadeTexture(occTable, fadeTexture);              // RG8, texSubImage2D of the used rows
uniforms.uKeep.value / uKeepCount / uNearCam          // understory capsules (vec4 × 8)
```

### 2.8 Files and contracts

| File | Change |
| --- | --- |
| `src/render/env/occluders.ts` (new, pure) | Table, classify, smooth, projection helpers |
| `src/render/env/camera-zoom.ts` (new, pure) | `Hf`, pitch curve, `rNear`, lens radius, zoom-through state machine, spring zoom |
| `src/render/env/camera.ts` | Keep-clear list, free look, zoom-through, pitch curve, smoothed zoom, terrain arm, view blends, cinematic scoring |
| `src/render/env/camera-rules.ts` | `sightBlocked` host rule, terrain-arm solver |
| `src/render/env/shared.ts` | ENV_FADE path (object fade texture), understory capsule loop (`uKeep[8]`), clump reach fix; keep ENV_CUT fine layer |
| `src/render/env/vegetation.ts`, `terrain.ts` | `aObj` attribute on every tree part, rock and log; object table export; per-clump hash centre |
| `src/render/creatures.ts` | `keepClearCandidates(out)` (read-only accessor) |
| `src/scene.ts` | Wiring; `SceneAPI` unchanged except optional `getZoom?(): { hf: number; band: string }` for C5b and the UI |
| `tests/render-occluders.test.ts`, `tests/render-camera-zoom.test.ts` (new) | See §5 |

No `World` or `types.ts` changes. `SceneAPI` additions are optional.

### 2.9 Cost

CPU: ≈ 970 objects × ≤ 8 targets of screen-circle tests ≈ 8 k cheap tests, plus ≈ 970 near-camera tests: estimated 0.05–0.1 ms (measure in G1). GPU: one extra texture fetch per vertex for tree parts and one per fragment for wood (dissolve noise, 2 fetches), a ≤ 8-iteration capsule loop per understory vertex: estimated ≤ 0.15 ms total. No new passes.

---

## 3. Zoom detail scaling spec

Principle: detail follows screen size, not view mode. Everything keys on projected size (px) or camera distance, with hysteresis, and transitions are dithered, never popped. Budget: at most 1.5 ms of the GPU time freed by G3/G4, spent mostly in close and cinematic views (which G3 makes cheapest).

| # | Item | Trigger | Change | Transition | Est. cost | Tier | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | Leaf atlas | always | 1024² → 2048² (4 cells of 1024²), mips; alpha sharpening unchanged; per-leaf hue and value jitter baked in | — | +≈ 16 MB GPU memory (with mips), ≈ 0 ms | high | Adapt (needs the texture budget, question 7) |
| D2 | Leaf vein normal + thickness | fragment within 15 m (perspective) | Second 1024² RG texture (normal) baked with the atlas; translucency scaled by thickness | distance fade 12–15 m | ≈ 0.1–0.2 ms close | high | Adopt |
| D3 | Bark normal map | fragment within 20 m | Procedural bake (vertical fissures, flutes, moss pits) 512×1024 RG; cylindrical UVs already exist | distance fade | ≈ 0.1 ms close | high, medium | Adopt |
| D4 | Near-trunk LOD | trees within 15 m of the camera (≤ 24) | 32-sided, 8-row trunk with bark displacement and buttress flare, drawn from a small CPU-repacked `InstancedMesh`; the far trunk hides via the object fade texture | 0.3 s hashed-alpha cross-fade (`getAlphaHashThreshold`, Wyman & McGuire [P1]), hysteresis 15/18 m | ≈ 0.05–0.1 ms | high, medium | Adopt |
| D5 | Parallax occlusion mapping on bark or ground | — | — | — | per-pixel cost on large surfaces, fights A2C and decals | — | Reject (as visual-plan D6) |
| D6 | Hero chimp LOD | focal animal > 400 px | Surface nets at h = 0.009 (≈ 2.4× LOD0 triangles), built in the existing worker after start | dithered cross-fade | ≈ 0.05 ms (1 animal) | high | Adopt |
| D7 | Dithered LOD cross-fade for chimps | every LOD change | Both LODs drawn for 0.25 s with complementary hashed-alpha masks (A2C); per-instance `aLodFade` attribute on each LOD mesh | 0.25 s | ≈ 0.02 ms | high, medium | Adopt [P2][P3] |
| D8 | Fur shells | LOD0 only | Unchanged (3 high, 1 medium); add LOD1 shells only in cinematic when the subject > 250 px | — | ≤ 0.2 ms cinematic | high | Keep / adapt |
| D9 | Fruit | perspective | `mergeVertices` + smooth normals on the icosahedron (same triangles) | — | 0 | all | Adopt |
| D10 | Litter decals (visual-plan D7, deferred) | near-field tile, perspective | 3,000 flat leaf/twig cards on the ground | tile edge fade (exists) | ≈ 0.1 ms | high | Adopt |
| D11 | Detail ground normal | exists (≤ 12 m) | Extend to a third octave within 4 m | distance fade | ≈ 0 | high | Adapt |
| D12 | Shadow density | per view | Camera-fit light frustum (view-frustum slice to 50 m in close and cinematic views, bounding-sphere fit) with texel snapping [S1]; map size from target density (close/cinematic 3072 at ≈ 1 cm texels near the subject, RTS 2048) | stable fit, no pops | saves time (§4) | all | Adopt |
| D13 | Contact shadows (visual-plan F3) | close and cinematic, keep-clear targets on screen | Half-res 16-step depth raymarch toward the key light, capped 0.3 m [visual-plan R20] | — | ≤ 0.4 ms | high | Adopt once G3/G4 land |
| D14 | Close-view depth of field | close view, `d` < 6 m, high, not reduced motion | Reuse the cinematic DoF gather at a smaller aperture | ramps with `d` | ≈ 0.5 ms when on | high | Adapt |
| D15 | Texture LOD bias | — | Keep default; anisotropy 8 on litter, 4 on bark and leaves | — | — | — | Keep |
| D16 | Chimps in the RTS lens | RTS `Hf` < 60 m | Animals inside the lens render as meshes without the x-ray fill (outline only if still occluded) | follows the lens weight | 0 | all | Adopt |

---

## 4. Performance plan

### 4.1 Budget per subsystem ('high', 1440×900, DPR 2, M3 Pro)

"Today" is the idle-machine split from `AGENTS.md` and visual-plan §9 (full frames 12.7 ms close to 15.4 ms cinematic); this pass's loaded-machine medians (§1.5) agree in direction. Targets are for the idle machine and are what G3/G4 must prove with the G0 probes.

| Subsystem | Today (idle ref.) | Target after G3 + G4 | After G5 (detail spent) | Main levers |
| --- | --- | --- | --- | --- |
| Shadow pass | ≈ 5 | close ≤ 2.0, RTS ≤ 2.5 | same | Light-frustum culling of casters (cells), density-sized map (2048 RTS, 3072 close), camera fit, lean colour attachment |
| Vegetation colour | ≈ 5 | close ≤ 2.5, RTS overview ≤ 4.0, RTS zoomed ≤ 2.0 | +0.3 (D2–D4) | Camera-frustum culling (cells), understory distance limit, opaque → alpha-tested order, internal resolution |
| MSAA store and resolve | ≈ 3 | ≤ 2.0 | same | Internal DPR 1.2 (−21% samples), invalidate after resolve (spike), depth resolve only when needed |
| Post (GTAO, bloom, exposure, grade, DoF) | ≈ 3 | ≤ 2.0 + 0.5 for EASU/RCAS | +0.4 contact shadows, +0.5 close DoF when on | Quarter-res or dual-filter bloom, GTAO off in overview, internal resolution |
| Terrain, rocks, logs, far canopy | ≈ 1–1.5 | ≤ 1.2 | +0.1 (D10, D11) | Rock/log culling via cells; ground tiling left to C5b |
| Creatures (LODs, shells, x-ray, FX) | ≈ 1.1 | ≤ 1.1 | +0.1 (D6, D7) | — |
| Keep-clear fades | 0 | ≤ 0.15 | same | — |
| **Total GPU (close / RTS)** | **12.7 / 14.9** | **≤ 8.5 / ≤ 10.5** (≥ 4 ms freed) | **≤ 10 / ≤ 11** (≥ 2.5 ms headroom kept) | |
| CPU added | — | ≤ 0.4 ms mean (fades 0.1, compaction ≤ 0.3) | same | Guard band, preallocated buffers |

### 4.2 Ordered by milliseconds saved per unit of effort

| # | Item | Stage | Expected saving (idle) | Confidence | Effort | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Cell-culled instance compaction** (camera frustum for colour, light frustum for shadow copies), 16 m cells, guard band | G3 | close 2–3 ms; RTS zoomed 3–4 ms; RTS overview 0.5–1 ms | moderate | medium | Only 5% (close) / 2% (RTS zoom 6) of vegetation instances are inside the camera frustum and 23% / 4% inside the light frustum, yet 100% are submitted (§1.5 C) |
| 2 | **Density-sized, camera-fit shadow map** (2048 RTS, 3072 close/cinematic, texel snapping) | G3 | RTS ≈ 2 ms; close ≈ 1.5 ms | low–moderate | small | 4096 → 2048 measured 2.65–2.9 ms in close and −0.35 to 1.95 ms in RTS (noisy); RTS shadow texels are ≈ 1.7× finer than screen pixels today (§1.5 D) |
| 3 | **Internal DPR 1.2 + FSR 1 to native** | G4 | net 0.5–1 ms, and a sharper final image | moderate | medium | 1.35 → 1.2 measured 1.35 ms in RTS (IQR 1.05); EASU + RCAS at 2880×1800 estimated ≈ 0.4–0.6 ms |
| 4 | **Bloom at quarter resolution or dual filter** | G4 | 0.2–0.8 ms | low | small | Bloom measured ≈ 0 ms in RTS (IQR 0.6) but 1.95–2.25 ms in close (very noisy); verify in G0 before doing it |
| 5 | **GTAO off in the overview band** | G4 | 0.5–1.5 ms in RTS overview | low | small | GTAO 1.0 ms median close (IQR large); AO under a closed canopy seen from 260 m adds little |
| 6 | **Lean shadow target** (R8 colour + 16-bit depth, `colorWrite = false`) | G3 spike | 0.3–1 ms at 4096, less at 2048 | low | small | r186 PCF maps carry a full RGBA8 colour texture (64 MB at 4096²) written and stored every frame [T1] |
| 7 | **Invalidate MSAA attachments after resolve** | G4 spike | 0–1.5 ms | unknown | small | three invalidates only on Oculus Browser [T1]; Apple GPUs can keep samples in tile memory if the store is dropped [G2] |
| 8 | Opaque before alpha-tested draw order | G3 | 0–0.5 ms | low | trivial | Apple HSR guidance [G2] |
| 9 | Understory distance limit (perspective) | G3 | 0.2–0.5 ms | moderate | small (with 1) | herbs/ferns are 166 k triangles, sub-pixel beyond ≈ 45 m |
| 10 | Leaf-card trimming | G4 (measure) | −0.5 to +1 ms | unknown | small | Fewer discarded fragments [G3], but twice the crown vertices |
| 11 | Impostors for far crowns; foliage depth prepass | G6 | 1–2 ms each if they work | low | high | Only if targets are missed |

Cumulative (idle, low–moderate confidence): close ≈ −5 ms, RTS overview ≈ −4 ms, RTS zoomed ≈ −6 ms before G5 spends ≤ 1.5 ms of it. The RTS overview is the tightest: if G0 shows the shadow items (2, 6) below 1.5 ms combined, the overview needs item 7 or G6 to reach −4 ms.

**Why cell compaction and not the alternatives.** Chunking into separate `InstancedMesh` objects per 64 m tile keeps too much (33% colour / 73% shadow in close views, because tall trees inflate tile bounds) and 32 m tiles multiply draw calls by ≈ 10 (≈ 680 draws in close views, ≈ 3–7 ms of three/ANGLE CPU overhead). `BatchedMesh` (r186: per-object culling and `WEBGL_multi_draw`, which this Chrome exposes) culls per instance in JavaScript over ≈ 50 k instances per pass and has no custom per-instance attributes, which every patched material needs (`aCrown`, `aTree`, `aSeed`, `aObj`). Compaction keeps today's draw count (≈ 11 kinds × 2 passes), today's shaders and attributes, and costs a copy of the visible cells only when the frustum leaves its guard band.

### 4.3 How AAA teams get "stunning and fast", verdicts for this WebGL 2 stack

| Technique | Verdict | Reason here | Source |
| --- | --- | --- | --- |
| Dynamic resolution scaling, per frame | **Adapt**: discrete internal-resolution steps inside a tier, ≤ 1 change per 20 s | three's post passes assume full-size targets (no viewport sub-rectangles), so per-frame scaling means reallocating MSAA targets (hitches) | [R1] |
| Spatial upscaling (FSR 1: EASU + RCAS) | **Adopt** | Two fragment passes, designed for anti-aliased input; replaces the browser's bilinear 1.35 → 2.0 upscale | [R2] |
| Temporal AA / temporal upscaling | **Reject in WebGL** (unchanged) | Needs motion vectors from GPU-skinned, instanced, wind- and fade-animated materials across every patch site; A2C foliage relies on MSAA; three's TRAA exists only for WebGPU | [R3], visual-plan F8 |
| MSAA 4× + alpha-to-coverage | **Keep, make cheaper** | A2C is what stops thousands of leaf cards shimmering; cut its cost with internal resolution and dropped stores | [P3][G2] |
| Shadow caching (static/dynamic split, cached pages) | **Reject for now** | Swaying crowns dominate the cost and are dynamic; `WebGLShadowMap` clears and redraws one map per light per frame, so a split needs a custom shadow pass; page caching [S3] is a GPU-driven design | [S3] |
| Lower shadow update rate | **Keep for medium/low only** | Alternate-frame work gives uneven frame times on a GPU-bound frame | — |
| Camera-fit shadow frustum, texel snapping | **Adopt** | Half the close-view map lies behind the camera today | [S1] |
| Cascades / sample-distribution shadow maps | **Reject** 3–4 cascades (visual-plan F2); **adapt later** to 2 cascades in close views only if the fit is not enough | Every cascade re-renders foliage; SDSM needs a depth reduction | [S2] |
| Scrolling shadow maps | **Reject** | Needs static casters to reuse texels | — |
| Octahedral impostors for distant trees | **Adapt, conditional (G6)** | Only if RTS overview vegetation stays > 3 ms after G3/G4; lighting and wind mismatch risk | [G5] |
| Dithered LOD cross-fades | **Adopt** (chimps, near trunks) | Removes pops; hashed alpha is stable in world space | [P1][P2] |
| Tighter cards (trimming) | **Measure** | Saves discarded fragments, doubles crown vertices | [G3] |
| Foliage depth prepass | **Spike (G6)** | Apple GPUs cannot defer alpha-tested fragments, so each leaf layer is shaded [G2]; a prepass makes the colour pass opaque-like at the cost of a second vertex pass | [G2] |
| Frustum culling per instance or cell | **Adopt** (compaction) | §1.5 C | [G1] |
| Coarse CPU occlusion culling (grids, portals, Hi-Z) | **Reject** | No large opaque occluders in a forest (crowns are alpha-tested); Hi-Z needs compute or read-back latency WebGL 2 lacks | [G1] |
| Small-object and distance culling with fades | **Adopt** (understory) | Sub-pixel herbs beyond 45 m | — |
| Draw-call batching and GPU instancing | **Keep** instancing; **reject** `BatchedMesh` for vegetation | See §4.2 | [T1] |
| Texture arrays | **Adapt** only when D1–D3 add textures | Few materials today | — |
| Half/quarter-resolution effects with bilateral upsampling | **Keep** GTAO half-res; **adopt** quarter-res bloom and half-res contact shadows with joint bilateral upsample | Low-frequency effects | [R4][R5] |
| Shader LOD and precision | **Adapt**: distance-gated detail branches (D2, D3, D11), fewer GTAO samples in overview; do not rely on `mediump` until measured (whether ANGLE/Metal emits half precision is unknown) | — | — |
| Render-pass consolidation | **Keep** (AO in place, tone map inside the grade); FSR replaces the final copy, no new full-resolution copies | — | — |
| Frame pacing | **Adopt**: 60 Hz on ≥ 100 Hz displays when GPU-bound | Chrome can run rAF at 120 Hz on ProMotion displays (`main.ts` already adapts its tick budget to 60/120 Hz) and renders every rAF, so a 12–15 ms GPU frame lands on an uneven 8.3 / 16.7 ms cadence | [R6] |
| Quality tiers and auto-scaling | **Adapt**: an internal-resolution step inside 'high' before dropping a tier; per-view gates (close/cinematic get detail, RTS gets distance) | Current auto-quality works, only coarse | — |
| Power and thermals | **Adapt**: pacing (above) plus an optional battery-saver tier where the Battery Status API exists | Laptops throttle under sustained full GPU load | — |
| GPU-driven rendering (compute culling, indirect draws) | **Reject in WebGL 2** | No compute shaders or indirect multi-draw | [G1] |
| Vegetation production (global wind field, dithered LODs, density placement) | **Reference** | We already have hierarchical wind; the talk supports dithered LODs and placement rules | [G4] |

### 4.4 WebGPU and TSL, briefly

What changed since visual-plan H1 ("not now"): WebGPU now ships in every major browser, including Safari 26 and Firefox 145 on Apple-silicon macOS [W1]; three 0.186's `WebGPURenderer` is mature with a WebGL 2 fallback. What did not change: `onBeforeCompile`, `ShaderMaterial` and `EffectComposer` still do not run on it [W2], and this plan adds patch code (ENV_FADE, capsules, dissolve). WebGPU would buy temporal AA/upscaling (TRAA, which could replace 4× MSAA), compute-driven culling and real GPU timestamps. **Verdict: still not now.** Decide at C5b design time, which rewrites terrain and vegetation streaming anyway; keep this plan's shader additions in small named functions so a later TSL port is mechanical.

**Note for C5b (added with the G0–G5 implementation, 29 Sep 2026; user decision: no WebGPU work now).** Decide WebGPU when C5b is designed. What would port: the shader additions are small named GLSL functions (`envObjFade`, `envKeepClump`, `envLens`, `envKeepClear`, the wood dissolve, `easuSet`/`easuTap`, RCAS), so a TSL port is mechanical; the pure modules (`occluders.ts`, `camera-zoom.ts`, `cells.ts` core, `output.ts`) have no renderer dependency. What WebGPU would replace: CPU cell compaction (compute culling into indirect draws), 4× MSAA + FSR 1 (TRAA or temporal upscaling), and the frame-interval GPU probes (timestamp queries). What blocks it today is unchanged: `onBeforeCompile` patches on every environment material and the `EffectComposer` chain.

---

## 5. Staged implementation plan

Order: tooling, then the camera (the user's first complaint), then the GPU budget, then detail paid from the savings. Each stage ships alone with `pnpm test` and `pnpm build` green. Measure GPU with `scripts/gpu-probe.mjs` (extended in G0) on an idle machine, three runs, median.

**C5b interaction (applies to all stages).** C5b (renderer owner) adds a field window streamed by tile and an overview cross-faded by zoom. This plan provides three pieces C5b should reuse rather than rebuild: (1) the zoom axis `Hf` and its bands (G2), which is the cross-fade parameter; (2) the cell-culled vegetation instancing (G3: 16 m cells grouped into 64 m tiles), which is the streaming unit (tile key from logical coordinates, built as a pure function of tile key, seed and the sim trees in the tile); (3) the object fade table with per-tile slot pools (G1/G3). Terrain tiling is **not** done here: C5b needs tiled terrain anyway, and G3 only chunks vegetation, rocks and logs. The overview (canopy surface only) needs no fades: the lens is zero above `Hf` 60 m.

## Stage G0: Measurement tooling and baselines
**Goal**: Repeatable occlusion, culling and GPU numbers before any change, robust to a shared machine.
- `scripts/occlusion-probe.mjs` from `S/occl.mjs` + `S/occl2.mjs`: SV, PSV, NC for scenes A1–A12 (§6), JSON out, `--compare before.json`.
- `scripts/cull-probe.mjs` from `S/cull.mjs`: triangles submitted vs inside the camera and light frusta, per pass and per kind.
- `scripts/gpu-probe.mjs`: add the A/B alternation of `S/gpu3.mjs` (8 cycles, p25 of frame intervals, median and IQR), the extra toggles (shadow pass, shadow size, MSAA, pixel ratio, crowns/wood/understory, vegetation shadow casting) and scenes `close-near`, `rts-z6`.
- `scripts/vite.probe.config.mjs`: a probe server config with `server.hmr = false, watch = null`, so edits by other agents cannot reload probe pages mid-run (a full reload killed one probe in this pass).
- Capture §6 scenes to `artifacts/visual/gfx-before/`; baselines to `artifacts/perf/gfx-before-{gpu,cull,occl,perf}.json` on an idle machine (load average < 4, no other GPU clients).

**Success Criteria**:
- Two consecutive gpu-probe runs agree within ±0.7 ms per item (IQR ≤ 1 ms) on the idle machine.
- The occlusion probe reproduces §1.2 within ±5 points on the same seed.
- `pnpm test` and `pnpm build` green.

**Tests**: scripts only; no new unit tests.

**Status**: Complete (29 Sep 2026). Shipped `scripts/occlusion-probe.mjs` (A1–A12, `--compare`), `cull-probe.mjs`, `gpu-probe.mjs` (`--ab` toggle alternation with the new toggles, `--apps` paired A/B of two builds), `zoom-probe.mjs` (A10, A8 follow), `vite.probe.config.mjs`, A13–A16 in `visual-scenes.mjs`, `upscale-compare.mjs` (G4 sharpness). Baselines: `artifacts/perf/gfx-before-{occl,cull,perf}.json`, `artifacts/visual/gfx-before/`. **Deviation:** the machine was never idle (load average 7–19, a concurrent MPS training job), so the idle-machine repeatability criterion could not be checked; GPU numbers are paired `--apps` rounds of the before and after builds instead (§8).

## Stage G1: Keep-clear camera (close and cinematic views)
**Goal**: Protected animals are never hidden by fadeable scenery in perspective views, and nothing pops or flickers.
- `src/render/env/occluders.ts` (pure): object table, `classify`, `smooth`, projection helpers (§2.3, §2.7).
- Object table built in `vegetation.ts` / `terrain.ts`: `aObj` on trunks, limbs, buttresses, lianas, crowns, fruit, rocks, logs; RG8 fade texture.
- Shader path ENV_FADE in `shared.ts`: per-clump stochastic shrink for crowns, world-noise dissolve under A2C for wood, clump cut reach = clump radius + 0.6 m (removes the 40 m tunnel), understory capsules for up to 8 targets and the near-camera shrink.
- Keep-clear list in `camera.ts` (§2.2) from `creatures.keepClearCandidates`; host rules; `sightBlocked` host-only; re-orbit after 0.25 s; cinematic scoring counts only non-fadeable occluders.
- Remove: the xz along-window test for instanced wood and the thin-to-axis collapse (superseded).

**Success Criteria**:
- Occlusion probe, close scenes A5–A8 and A12 (8 azimuths × elevations 8/12/30° × distances 3.8/6/12/40 m): SV mean ≥ 90% and min ≥ 75% in every cell; PSV ≥ 70% at 12 m (baseline 3–77%); NC ≤ 1% (baseline max 4.1%).
- Cinematic A9 (5 min, sample every 2.5 s): ≥ 95% of samples with SV ≥ 80% (baseline 7/8 at ≥ 93%, one at 50%).
- Stability, orbit A11 (20 s): each object's fade crosses 0.5 at most once per 2 s; per-frame fade change ≤ 0.15 outside an onset.
- No halftone or screen door in C9 and A5 at 1:1 crops (reviewer).
- Cost: occluders classify + smooth ≤ 0.15 ms mean CPU (new `occl` sub-timer inside `env`, `?perf=1`) with `?pop=120`; close-day GPU full frame within +0.3 ms of G0.

**Tests**:
- `tests/render-occluders.test.ts`: object in front and overlapping → 1; behind → 0; beside without screen overlap → 0; host exemption; near-camera; orthographic projection path; rise 63% in 0.15 s, 0.35 s hold, fall 63% in 0.45 s; enter/exit margin hysteresis; purity (same input → same output, inputs untouched).
- `tests/render-camera.test.ts`: `sightBlocked` skips only host trees; keep-clear ordering (selected > subject > centre animals > view centre).

**Status**: Complete; two criteria missed (A6 minimum 70 vs 75, A9 83–88% vs 95%). Close scenes A5/A7/A8 SV min 25–33 → 95–100; A6 worst cell mean 70 → 93, NC 4.9 → 0%; A11 stable. **Deviations:** crowns thin per clump on the GPU (`envKeepClump`, a per-clump test against the keep-clear capsules) instead of a per-tree crown channel, because per-tree crown fades opened visible holes; the table is RGBA8 with 4,096 slots (limbs are `obj + 4096`), and flares, aerial roots and lianas are part objects linked to their tree; a subject embedded in a log or trunk is handled by a pierce rule (the object fades only if the sight line enters it ≥ 0.2 m before the subject). Details §8.2.

## Stage G2: One zoom axis (RTS lens, zoom-through, pitch curve)
**Goal**: Zooming in from the overview shows animals, not leaves, and continues seamlessly into the perspective view.
- `src/render/env/camera-zoom.ts` (pure): `Hf`, bands, pitch curve, `rNear`, lens radius, zoom-through state machine (intent: ≥ 2 wheel notches or 150 ms of continued wheel-in at max zoom; cancelled by reverse wheel), critically damped zoom spring.
- RTS canopy lens (§2.4), lens-aware x-ray (animals inside the lens drawn without the fill, D16).
- Zoom-through in and out with 0.7 s dolly-zoom blends (§2.6); free-look close mode; smoothed wheel zoom in both cameras; pitch-by-distance with a preserved user offset; terrain-aware arm; blends for the C / V / R keys; cuts with reduced motion.
- Optional `SceneAPI.getZoom?(): { hf: number; band: 'overview' | 'strategy' | 'field' }` for C5b and the UI.

**Success Criteria**:
- A1/A2 (RTS canopy and tree subjects) at zoom 3 / 4.5 / 6: selected animal SV ≥ 80% (baseline 0%); PSV ≥ 60% for animals inside the lens. At zoom ≤ 1.7 the frame matches G0 (`scripts/shot-compare.mjs` below its threshold).
- A10 zoom-through: one continuous wheel gesture from RTS zoom 1.04 to a 3.5 m orbit; frame height at the handover within ±10% of the pre-handover value; 0 frames with the camera below terrain + 0.4 m; ≤ 1 dropped frame during the blend (`perf-probe --hitches`).
- Wheel zoom: per-frame `Hf` change ≤ 12% at 60 Hz (no steps).
- A8 slope follow, 60 s at `rate=60`: 0 frames with terrain between camera and subject (occlusion probe ground test).
- rts-1x-day unchanged within ±0.3 ms GPU (lens inactive); rts-z6 not above G0.

**Tests**: `tests/render-camera-zoom.test.ts`: pitch curve endpoints and monotonicity; `Hf` for orthographic and perspective; lens radius curve; zoom-through state machine (intent, cancel, reduced motion → cut); zoom spring independent of dt (two 8 ms steps ≈ one 16 ms step within 1e-3).

**Status**: Complete; A10 hitch criterion unverified on the loaded machine. A1/A2 SV at zoom 2–6: 0 → 100%; A10 handover `Hf` ratio 1.00 in and out, max 5.1% `Hf` change per frame, 0 low-camera frames; A8 follow 0 terrain-cut frames. `SceneAPI.getZoom()` also returns `view`, which `main.ts` uses to follow a zoom-through (only on a change, after reveal, so C/V/R and restored views are never overridden). Details §8.2.

## Stage G3: Geometry budget (cells, culling, shadow fit)
**Goal**: Submit only what the camera or the sun can see, and size the shadow map by the density the view needs.
- Cell-culled instance compaction (§4.2 item 1): static 16 m cell index per vegetation kind, rocks and logs; per frame (or when the frustum leaves a 4 m / 3° guard band) copy visible cells' instances into compact buffers; colour meshes cull against the camera frustum, shadow-only copies against the light frustum (shadow copies use the `chimps-shadow` trick: a constant-position colour vertex shader, so only the shadow pass pays). Attributes (`aCrown`, `aTree`, `aObj`, colour) travel with the instance. Forced re-cull on camera cuts.
- Lianas split per 32 m cell (plain meshes, three's per-object culling); fruit packs per cell.
- Understory distance limit in perspective (herbs, ferns beyond 45 m; shrubs beyond 70 m) with a shrink fade over the last 8 m.
- Draw order: opaque (terrain, wood, rocks, animals) before alpha-tested foliage (`renderOrder`), as Apple recommends for HSR [G2].
- Shadow camera fit (close and cinematic: view-frustum slice to 50 m, bounding-sphere fit, texel snapping [S1]); map size by density: 3072 in close and cinematic, 2048 in RTS (overview and zoomed); 'medium' halves.
- Spike (keep if ≥ 0.3 ms): pre-create `key.shadow.map` with an R8 colour attachment and 16-bit depth instead of three's RGBA8 + 32-bit, `colorWrite = false` on depth materials (§4.2 item 6).

**Success Criteria**:
- cull-probe: close-day submitted vegetation triangles ≤ 15% of G0 in colour and ≤ 35% in shadow (16 m cells measured 12% / 33%); rts-z6 ≤ 12% / 15% (10% / 13%); rts-day ≤ 75% / 95% (72% / 93%).
- gpu-probe (idle, 3 runs): close-day ≥ 2.5 ms faster than G0; rts-day ≥ 1.5 ms faster; rts-z6 ≥ 3 ms faster.
- CPU: `env` mean +≤ 0.3 ms at 1×; no long task > 16 ms from re-culls (`perf-probe --hitches`).
- Visual: no vegetation missing at frame edges during a fast pan and orbit (A11 frames, reviewer); no shadow swimming while panning (C12 wind scene diff unchanged); RTS overview shadows at 2048 judged equivalent to 4096 (reviewer, A1 zoom 1).

**Tests**: `tests/render-cells.test.ts`: cell assignment; cell-frustum test is conservative (brute force on 200 random frusta: no instance inside the frustum is culled); compaction preserves per-instance attributes; guard band triggers re-cull at its limits.

**C5b**: 4 × 4 cells form a 64 m streaming tile. Cell build is a pure function of (tile key, seed, sim trees in the tile), so C5b's field window streams the same structures.

**Status**: Complete; submitted-triangle shares within 1–3 points of the targets. rts-day 72/93%, close-day 16/34%, rts-z6 15/18% (colour/shadow); shadow fit 50 m slice, 3072 close/cinematic, 2048 RTS. **Deviations:** the leaving guard band scales with the frame (`clamp(0.1·Hf, 2, 10)` m) rather than a fixed 4 m / 3°, trading 3 points of rts-z6 share for no re-pack every pan frame; lianas stay one merged mesh (≈ 67 k triangles; not worth 5 extra draw calls); the R8 + 16-bit shadow target spike is implemented behind `sky.setLeanShadow` and left off (no measurable gain); ground is drawn after foliage (renderOrder 2), which the plan did not list and which saves ≈ 0.9 ms in rts-day (HSR). Details §8.2.

## Stage G4: Pixel budget (MSAA, output resolution, post, pacing)
**Goal**: Fewer pixels and less bandwidth for an image that is at least as sharp.
- MSAA spike: after the scene pass resolves, invalidate the multisampled colour and depth attachments (three does so only on the Oculus browser); resolve depth only when GTAO or DoF runs. Keep if ≥ 0.3 ms.
- Output path: canvas backing at native DPR (≤ 2); scene and post at internal DPR 1.2 on 'high' (1.35 today); FSR 1 EASU to native and RCAS as the last passes [R2], replacing the browser's bilinear upscale. Grain and vignette after RCAS.
- Bloom at quarter resolution, or a dual-filter chain [R5], whichever is cheaper at equal look.
- GTAO off in the overview band (`Hf` ≥ 60 m) with a 0.5 s intensity ramp; 8 samples instead of 10 in perspective views (if the reviewer sees no loss).
- Leaf-card trimming [G3] only if atlas coverage and an A/B on rts-day show a net win (it doubles crown vertices).
- Frame pacing: on displays ≥ 100 Hz, render the 3D view every other rAF when frames are GPU-bound (drop statistics), uncapped when cheap; coordinate with the `main.ts` owner [R6].
- Auto-quality: one internal-resolution step inside 'high' (1.2 → 1.05) before dropping to 'medium'.

**Success Criteria**:
- gpu-probe (idle): rts-day ≥ 1.5 ms faster than G3; close-day ≥ 1.0 ms faster.
- Image: native-resolution crops of C9, E1, E5 judged as sharp or sharper than G0 by a reviewer; foliage edge aliasing not worse (A2C unchanged).
- `perf-probe --scenarios quick`: every 1× scenario ≤ 1% dropped frames; with 60 Hz pacing on a 120 Hz display, frame-interval standard deviation ≤ 1 ms.
- `renderer.info.programs` count stable after warm-up (no new variants at nightfall or storm).

**Tests**: `tests/render-post.test.ts`: FSR constant setup (pure), internal/native size arithmetic at DPR 1, 1.5, 2; pacing decision function (pure) with hysteresis.

**Status**: Complete. Internal ratio 1.2 ('high') with FSR 1 to native: Tenengrad sharpness +52–66% over the old 1.35 browser-bilinear path at −0.1 ms; quarter-resolution bloom; GTAO ramps out above `Hf` 60 m (two pre-compiled material variants, no recompile on view change); 60 Hz pacing on ≥ 100 Hz displays with a Settings toggle; auto-quality steps 1.2 → 1.05 before 'medium'. **Deviations:** MSAA invalidate spike cost 0.05–0.4 ms on this Chrome (Metal) → off (kept behind `SceneTargetPass.invalidate`); GTAO stays at 10 samples (8 not reviewed); leaf-card trimming not attempted; pacing frame-interval SD not measured (headless probes do not run on a 120 Hz display). Details §8.2.

## Stage G5: Detail on zoom
**Goal**: Close-ups gain real surface detail, paid from the G3/G4 savings.
- §3 items D1–D4, D6–D11, D13, D14, D16 (adopted or adapted).
- Budget: ≤ 1.5 ms GPU in close and cinematic, ≤ 0.3 ms in RTS; every item behind its tier.

**Success Criteria**:
- Close-up scenes A13–A16: a reviewer prefers after over before in each (blind pairs).
- LOD: 0 visible pops in a 10 s dolly from 30 m to 3.5 m (reviewer on a 60 fps capture); LOD cross-fade logs show every crossing blended.
- gpu-probe: close-day ≤ G4 + 1.5 ms; rts-day ≤ G4 + 0.3 ms; total GPU at 'high' ≤ 11 ms in every §4.1 view on the idle machine.
- Texture memory added ≤ 24 MB.

**Tests**: bark and vein bakes deterministic per seed; LOD cross-fade state machine (hysteresis, both LODs listed during the fade, never neither); fruit geometry has smooth normals.

**Status**: Complete except D2 (leaf vein normals) and D13 (contact shadows), deferred. Shipped D1 (2048² atlas), D3 (bark normal, fades 14–20 m), D6 (hero LOD), D7 (0.25 s Bayer cross-fade), D9, D10 (3,000 litter cards, 'high'), D11, D12, D14 (close DoF under 6 m), D16. **Deviation:** D4 became 20-sided trunks and 8-sided limbs everywhere (cell culling made them cheap) instead of a separate near-trunk LOD. Measured cost in close-day: detail (DoF + litter) 0.1–0.3 ms, bark normal 0.05–0.2 ms; net close-day 12.3 → 10.0 ms. Details §8.2.

## Stage G6: Optional (impostors, foliage depth prepass)
**Goal**: Only if §4.1 targets are missed after G4.
- Octahedral impostors for crowns beyond 60 m in the overview [G5] (visual-plan E6), if RTS vegetation colour is still > 3 ms.
- Foliage depth prepass (alpha-tested depth only, then colour with `depthFunc = EqualDepth` and no discard), if a spike shows ≥ 1 ms saved in rts-day; requires bit-identical vertex paths.

**Success Criteria**: each item lands only with ≥ 1 ms measured saving and no visible regression on E1, E2, C12.

**Tests**: impostor bake determinism; prepass program pairs compile and render identical coverage on the harness (pixel diff ≤ 0.5%).

**Status**: Not started (out of scope for this pass).

---

## 6. Acceptance scenes, risks, open questions

### 6.1 Acceptance scenes

Servers: app and env harness on a probe server (`scripts/vite.probe.config.mjs`, never 5173). `E` = `http://127.0.0.1:<P>/src/render/env/harness.html`, all with `&advance=3&auto=0&hud=0&quality=high&pause=1` unless stated. Subjects are chosen by rule (§1.1), not id. Captures at 1440×900, DPR 1 for screenshots, DPR 2 for GPU.

| ID | State | Capture / metric |
| --- | --- | --- |
| A1 | `E?view=rts&hour=10`, pan to the *canopy* subject, zoom 1.04 / 2 / 3 / 4.5 / 6 | 5 frames; SV, PSV |
| A2 | A1 with the *tree* subject | 5 frames; SV |
| A3 | A1 with `&hour=15&rain=0.9&cloud=1&weather=storm&wind=1`, zoom 4.5 | 1 frame + 10 @ 200 ms (lens edge stability in wind) |
| A4 | A1 with `&hour=21.5`, zoom 4.5 | 1 frame |
| A5 | `E?view=close&hour=10&focus=<canopy subject>`, dolly 40 / 22 / 12 / 7 / 5 / 3.6 m, then 8 azimuths at 4 m | 14 frames; SV, NC |
| A6 | A5 subjects *canopy, trunk, slope, tree* × elevation 8 / 12 / 30° × distance 3.8 / 6 / 12 m × 8 azimuths | SV mean/min, PSV, NC |
| A7 | A5 with `&hour=21.5` | as A5 |
| A8 | A5 with `&rain=0.8&cloud=0.95&weather=rain`; plus a 60 s follow of the *slope* subject with `pause=0&rate=60` | as A5; terrain-in-sight frames |
| A9 | `E?view=cinematic&hour=10&pause=0`, 5 minutes | SV every 2.5 s; director log |
| A10 | App `http://127.0.0.1:<P>/`, default RTS; wheel-in on the canopy subject until a 3.5 m orbit | 30 frames @ 50 ms; `Hf` continuity; hitches |
| A11 | A5 at 4 m, one full orbit in 20 s | fade log per object; 20 frames |
| A12 | Close view on a party of ≥ 3 animals within 6 m (grooming or feeding; first found after `advance=3`) | PSV at 12 m and 6 m |
| A13 | Face close-up: close view, camera 2.2 m in front of the first ground adult's head (`S/detail.mjs` placement) | 1 frame DPR 2, crop |
| A14 | Buttressed trunk at 3 m (thickest trunk within ±80 m) | 1 frame DPR 2, crop |
| A15 | Leaf cards 2.5 m outside a mid-height lobe (cutaway subject cleared) | 1 frame DPR 2, crop |
| A16 | Ground litter at 1.8 m looking down | 1 frame DPR 2, crop |
| — | Regression: visual-plan C9, C12, E1, E2, E5, E10 | as in `docs/visual-plan.md` §6 |
| — | Perf: `perf-probe --scenarios quick`; gpu-probe scenes rts-day, rts-z6, close-day, close-near, cine-day, rts-storm, close-night; cull-probe | JSON in `artifacts/perf/` |

### 6.2 Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| The lens reads as a hole and costs the sense of canopy | Medium | RTS looks less like a forest | Soft ragged edge (per-clump thresholds), radius cap 0.42, only zoomed in, a settings toggle, x-ray outside the lens |
| Fades flicker when targets move across object edges | Medium | Distracting | Enter/exit margins (16/28 px), 0.35 s hold, slow restore; fades are per object, not per pixel |
| Too much disappears (a whole crown for one protected animal) | Medium | Scene thins out in dense parties | Crowns fade by clumps near the protected line first (fine layer); cap targets at 8; host trees exempt |
| Compaction re-culls spike the CPU at high sim speed | Low | Dropped frames at 1 day/s | Guard band (re-cull at a few Hz), preallocated buffers, colour and shadow re-culls on alternate frames |
| Guard band misses after cuts or fast zooms | Medium | Missing trees for a frame | Forced re-cull on every camera cut, blend start and zoom-through |
| Camera-fit shadows shimmer | Medium | Crawling shadow edges | Bounding-sphere fit and texel snapping [S1]; fit radius changes only on zoom-band changes |
| `invalidateFramebuffer` does nothing on ANGLE/Metal | Medium | No MSAA saving | Spike only; the internal-resolution + FSR 1 path does not depend on it |
| FSR 1 rings on alpha-tested leaf edges or amplifies grain | Medium | Harsher image | RCAS strength tuned on E1/C9; grain after RCAS; option to fall back to bilinear |
| Measurements in this plan are noisy (loaded machine) | Certain | Budgets may shift ±1–2 ms | G0 re-baselines on an idle machine before G1; stages gate on their own before/after deltas |
| Merge friction: `shared.ts`, `vegetation.ts`, `camera.ts` also change in C5b | High | Rework | G1/G2 before C5b starts; G3 cell interface agreed with the C5b owner first |
| `main.ts` pacing belongs to another owner | Medium | Delay | Pacing is a pure function in `src/render`; `main.ts` change is one call, coordinated |

### 6.3 Open questions for the user

Answered 28 Sep 2026: yes to 1–7 (5 on condition of a measurably sharper image at equal or lower cost; 6 with a Settings toggle to uncap); 8: no work now, revisit in C5b (§4.4).

1. **Canopy lens.** OK to open the canopy around the focus when zoomed in on the strategy view (a labelled stylization), or keep the canopy closed and rely on x-ray silhouettes?
2. **Zoom-through.** Should wheel-zooming past the strategy view's maximum hand over to the perspective view automatically (recommended), or only on the C key / double-click?
3. **Pitch by distance.** Is a close camera that lowers toward eye level as you zoom in (14° at 3.5 m, 45° at 70 m) the feel you want?
4. **Shadow resolution.** Accept 2048² shadows in the strategy view (about one texel per screen pixel at every zoom, instead of 0.6 today) to save an estimated 1–2 ms?
5. **Output upscaling.** Replace the browser's bilinear upscale with FSR 1 (EASU + RCAS): sharper, with a small risk of ringing on leaf edges?
6. **120 Hz displays.** Cap the 3D view at 60 Hz when it cannot hold 120 (smoother, cooler, better battery), or run uncapped?
7. **Texture memory.** Spend up to +16 MB on a 2048² leaf atlas, or keep 1024² and rely on detail normals?
8. **WebGPU.** Revisit when C5b is designed (recommended: that stage rewrites terrain and vegetation streaming anyway), or not at all?

---

## 7. References

References from `docs/visual-plan.md` §8 are cited as "visual-plan Rn". New sources:

Camera
- [C1] J. Nesky, "50 Game Camera Mistakes", GDC 2014 (visual-plan R22). [Video](https://www.youtube.com/watch?v=C7307qRmlMI).
- [C2] Unity, Cinemachine 3.1 manual, "Cinemachine Deoccluder" (strategies such as Pull Camera Forward, minimum occlusion time, damping when occluded). [Manual](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineDeoccluder.html); [API](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/api/Unity.Cinemachine.CinemachineDeoccluder.html).
- [C3] Epic Games, Unreal Engine 4.27, "Using Spring Arm Components" (target arm length, probe size collision test, camera lag). [Docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-spring-arm-components?application_version=4.27).
- [C4] P. Wilkins, "Iterating on a Dynamic Camera System", GDC 2011. [GDC Vault](https://gdcvault.com/play/1014606/Iterating-on-a-Dynamic-Camera).
- [C5] M. Haigh-Hutchinson, *Real-Time Cameras: A Guide for Game Designers and Developers*, Morgan Kaufmann, 2009 (occlusion, collision, interpolation). Not re-read for this pass.

Fading and LOD transitions
- [P1] C. Wyman, M. McGuire, "Hashed Alpha Testing", I3D 2017. [PDF](https://cwyman.org/papers/i3d17_hashedAlpha.pdf). three r186 ships it as `alphaHash` (`alphahash_pars_fragment.glsl.js`, `getAlphaHashThreshold`).
- [P2] Unity Manual, "Make LOD Group transitions smooth" (cross-fade by screen-space dither, transition width). [Manual](https://docs.unity3d.com/6000.2/Documentation/Manual/lod/lod-transitions-lod-group.html).
- [P3] B. Golus, "Anti-aliased Alpha Test: The Esoteric Alpha To Coverage", 2017 (visual-plan R17).

Shadows
- [S1] Microsoft Learn, "Common Techniques to Improve Shadow Depth Maps" (fit the light frustum to the view frustum, snap to texel increments). [Docs](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/common-techniques-to-improve-shadow-depth-maps).
- [S2] A. Lauritzen, M. Salvi, A. Lefohn, "Sample Distribution Shadow Maps", I3D 2011. [ACM](https://dl.acm.org/doi/10.1145/1944745.1944761).
- [S3] Epic Games, "Virtual Shadow Maps in Unreal Engine" (page caching; static vs dynamic invalidation). [Docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine).

Geometry, culling, vegetation, GPU architecture
- [G1] U. Haar, S. Aaltonen, "GPU-Driven Rendering Pipelines", SIGGRAPH 2015 Advances in Real-Time Rendering. [PDF](https://advances.realtimerendering.com/s2015/aaltonenhaar_siggraph2015_combined_final_footer_220dpi.pdf).
- [G2] Apple, "Harness Apple GPUs with Metal", WWDC20 session 10602 (hidden surface removal; draw opaque, then alpha test/discard, then translucent; MSAA samples live in tile memory and resolve on tile flush). [Video](https://developer.apple.com/videos/play/wwdc2020/10602/).
- [G3] E. Persson, "Graphics Gems for Games: Findings from Avalanche Studios", SIGGRAPH 2012 (particle trimming, merge-instancing). [humus.name](https://www.humus.name/index.php?page=Articles).
- [G4] G. Sanders, "Between Tech and Art: The Vegetation of Horizon Zero Dawn", GDC 2018. [Video](https://www.youtube.com/watch?v=wavnKZNSYqU).
- [G5] R. Brucks, "Octahedral Impostors" (visual-plan R16).

Resolution, anti-aliasing, post, pacing
- [R1] D. Binks, "Dynamic Resolution Rendering", Intel / GDC 2011. [PDF](https://www.intel.com/content/dam/develop/external/us/en/documents/dynamicresolutionrendering-183334.pdf).
- [R2] AMD, "FidelityFX Super Resolution 1 (FSR 1)": EASU edge-adaptive upsampling and RCAS sharpening, open source. [GPUOpen](https://gpuopen.com/fidelityfx-superresolution/); [manual](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/super-resolution-spatial/).
- [R3] B. Karis, "High Quality Temporal Supersampling", SIGGRAPH 2014 (visual-plan R30).
- [R4] J. Kopf, M. Cohen, D. Lischinski, M. Uyttendaele, "Joint Bilateral Upsampling", SIGGRAPH 2007. [ACM](https://dl.acm.org/doi/10.1145/1275808.1276497).
- [R5] M. Bjørge, "Bandwidth-Efficient Rendering", SIGGRAPH 2015 Moving Mobile Graphics (dual-filter blur for bloom). [Slides](https://community.arm.com/cfs-file/__key/communityserver-blogs-components-weblogfiles/00-00-00-20-66/siggraph2015_2D00_mmg_2D00_marius_2D00_slides.pdf).
- [R6] Android Developers, "Frame Pacing library" (why 60 fps content on a 120 Hz display needs pacing). [Docs](https://developer.android.com/games/sdk/frame-pacing).

Platform
- [W1] web.dev, "WebGPU is now supported in major browsers", 25 Nov 2025 (Chrome/Edge, Firefox 141 Windows and 145 macOS Tahoe ARM, Safari 26). [Blog](https://web.dev/blog/webgpu-supported-major-browsers).
- [W2] three.js manual, WebGPURenderer (visual-plan R24): `onBeforeCompile`, `ShaderMaterial` and `EffectComposer` do not run on `WebGPURenderer`.
- [T1] three.js 0.186.1 sources, read locally: `renderers/webgl/WebGLShadowMap.js` (PCF maps: colour render target plus a 32-bit `DepthTexture`), `renderers/webgl/WebGLTextures.js` (`invalidateFramebuffer` after MSAA resolve only when the user agent is Oculus Browser), `objects/BatchedMesh.js` (per-object frustum culling, multi-draw), `shaders/ShaderChunk/alphahash_pars_fragment.glsl.js`.

---

## 8. Implementation record (Stages G0–G5, 28–29 Sep 2026)

**Method.** The pre-change tree was snapshotted and served on 5193 ("before"). Every measurement of the new code served the render files (`src/scene.ts`, `src/render/**`, `src/main.ts` wiring) overlaid on that same snapshot on 5192 ("after"), so concurrent simulation and UI edits never entered an A/B. GPU: `gpu-probe --apps` paired rounds alternating the two builds, p25 of uncapped frame intervals, 1440×900, DPR 2, 'high'. The machine was never idle (load average 7–19; an MPS training job shared the GPU for most of the pass), so absolute times carry about ±0.5 ms; the reference paired run (5 rounds, 01:21 on 29 Sep) had round-to-round spreads ≤ 0.3 ms, and its before-build times (12.3 close, 14.2 RTS, 15.0 cinematic) match the idle reference of §1.5 A (12.7 / 14.9 / 15.4). Artifacts: `artifacts/perf/gfx-{before,after}-{occl,cull,perf}.json`, `gfx-after-zoom.json`, `gfx-g5-gpu-ab.json` (the reference paired run of the G5 build, before the ground-last change, which was measured separately with `--ab`), `gfx-after-gpu-ab-contended.json` (a later re-run on the shared GPU, 13–40 ms rounds, not used), `artifacts/perf/upscale/`, `artifacts/visual/gfx-{before,after}/` (same scene ids; `occl/` and `zoom/` subfolders), `artifacts/visual/gfx-compare/` (before/after/diff of five views).

### 8.1 Results against the targets

| Metric (scene) | Target | Before | After | Met |
| --- | --- | --- | --- | --- |
| Subject SV min, dolly / orbit (A5, A7, A8) | ≥ 75 | 25–33 / 30 | 100 / 95–100 | yes |
| Worst-cell SV mean / min (A6, 4 subjects × 3 elevations × 3 distances × 8 azimuths) | ≥ 90 / ≥ 75 | 70 / 0 | 93 / 70 | mean yes, min no |
| Near clutter NC max (A6) | ≤ 1% | 4.9% | 0% | yes |
| Party PSV at 12 m (A6) / A12 12 m, 6 m | ≥ 70 | 61 / 84, 86 | 76 / 84, 81 | yes |
| Cinematic samples with SV ≥ 80 (A9, 5 min) | ≥ 95% | 77% | 83–88% (3 runs) | no |
| Fade stability (A11, 20 s orbit, 6,186 object channels) | ≤ 1 crossing per 2 s; ≤ 0.15 per frame | — | 2 channels re-cross; max 0.07 per 60 Hz frame | yes |
| Keep-clear CPU mean, `?pop=120` (rts / close / cinematic) | ≤ 0.15 ms | — | classify 0.003 / 0.09 / 0.14; with target pick, smoothing and upload 0.08 / 0.18 / 0.23 | classify yes, total +0.08 |
| RTS subject SV at zoom 2, 3, 4.5, 6 (A1, A2; A3 storm, A4 night) | ≥ 80 | 0 | 100 at every zoom | yes |
| Partner PSV inside the lens (A2, zoom 2 / 3 / 4.5 / 6) | ≥ 60 | 0 | 100 / 33 / 100 / 100 | 3 of 4 |
| Zoom-through `Hf` at handover, in / out (A10) | ±10% | hard cut | ratio 1.00 / 1.00 | yes |
| Max `Hf` change per frame (A10) | ≤ 12% | stepped | 5.1% | yes |
| Frames below terrain + 0.4 m (A10) / terrain in sight (A8 follow) | 0 / 0 | — | 0 / 0 | yes |
| Dropped frames during the blend (A10) | ≤ 1 | — | worst gap 117 ms on the loaded machine | unverified |
| Submitted vegetation share colour / shadow: rts-day, rts-z6, close-day | ≤ 75/95, 12/15, 15/35 | 100/100 each | 72/93, 15/18, 16/34 | 1 of 3 (others within 1–3 points) |
| Submitted triangles, close-day colour / shadow | — | 820 k / 623 k | 149 k / 248 k | — |
| GPU full frame, p25 ms (paired): rts-day | ≤ 11 after G5 | 14.2 | 11.6, then 10.5–10.7 with ground last | yes |
| rts-z6 | not above G0 | 9.5 | 7.0 | yes |
| close-day | ≤ 10 after G5 | 12.3 | 10.0 | yes |
| close-near | — | 12.1 | 11.2 | — |
| cinematic-day | ≤ 11 | 15.0 | 12.6 | no |
| rts-storm / close-night | ≤ 11 | 14.4 / 15.2 | 11.9 / 12.9 | no |
| Sharpness vs old output, Tenengrad (C9, E1, E5) | ≥ G0 | 1,420 / 4,391 / 928 | 2,152 / 7,286 / 1,452 (+52–66%) | yes |
| Frame pacing, `perf-probe --scenarios quick` (p95 / drop % at 1×) | ≤ 1% dropped | not measurable: the GPU was shared with a training job for the whole final window (18–38 fps) | same caveat (24–55 fps); `gfx-{before,after}-perf.json` kept for reference | unverified |
| First switch to close view, max frame (3 alternating rounds, fresh pages) | no regression | median 233 ms (167–400) | median 167 ms (133–217) | yes |
| Texture memory added | ≤ 24 MB | — | ≈ 16 MB (2048² leaf atlas with mips, net of the old 1024²) + 0.7 MB (bark normal) | yes |

Freed vs spent: the paired runs measure the net after G5: 2.3–2.6 ms in every view except close-near (0.8 ms), plus ≈ 0.9 ms in RTS from drawing the ground last, against the plan's 4–5 ms freed before re-spending ≤ 1.5 ms. The detail items that have toggles measured 0.15–0.5 ms together, so G3 + G4 freed about 2.5–3 ms, short of the plan's estimate (which §4.2 gave low–moderate confidence). After-build subsystem costs in close-day (single-toggle `--ab`, IQR ≤ 0.5 ms): shadow pass 1.75–2.2 ms (≈ 5 before), MSAA 1.9 (≈ 3), crowns 1.1, terrain 1.15, FSR 0.95–1.05, creatures 0.85, bloom 0.4. In rts-day: crowns 2.9, terrain 1.8, MSAA 0.85, shadow pass 0.55–0.65, FSR 0.75–1.1, bloom 0.4.

### 8.2 Per stage

**G0.** As planned, plus `zoom-probe.mjs` and `upscale-compare.mjs`. The occlusion baseline reproduced §1.2 (A5 dolly minimum 33 vs 30–38).

**G1.** `occluders.ts` (pure; 18 tests) classifies trees, limbs, flares, roots, lianas, rocks and logs against up to 8 keep-clear targets: union prefilter, box rejection, trunk and limb capsules with a clipped silhouette test, crown spheres driving limbs only, a near-camera radius `clamp(0.4·d, 1.5, 5)` m, host exemption, and part links (a flare or liana fades with its tree). Smoothing: rise τ 0.15 s, hold 0.35 s, fall τ 0.45 s, 16/28 px enter/exit margins. The RGBA8 fade texture is uploaded only when bytes change; classification alternates frames. Crowns thin per clump on the GPU (`envKeepClump`) with per-clump hash thresholds; wood dissolves under A2C. The director rejects shots through the subject's host trunk, penalises animals in front of the subject and pair-axis shots, and re-orbits only on the host after 0.25 s. Misses: A6 minimum 70 is one azimuth of the trunk-side subject, resting, at 3.8 m and 8° elevation; the remaining loss is its own body at a grazing angle, not a fadeable object; A9 misses are animal-on-animal occlusion in group shots, which fades do not cover.

**G2.** `camera-zoom.ts` (pure; 7 tests): `Hf`, bands, pitch curve (14° at 3.5 m to 45° at 70 m, user offset ±20°), lens radius `0.42·smoothstep(60, 20, Hf)`, exact critically damped spring, zoom-through state machine (≥ 2 notches or 150 ms at the limit; reverse wheel, leaving or a 0.3 s pause cancels), 0.7 s dolly-zoom blends, terrain lift. Stylization: the canopy lens is a labelled game-camera cutaway, not a real view. Deviation: `getZoom()` also returns `view` so the UI follows a zoom-through (`main.ts`, change-only, after reveal).

**G3.** `cells.ts` (5 tests): 16 m cells per kind, frustum and light-frustum visibility with in/out hysteresis, contiguous re-packs, shadow-only twins, per-kind clip depth materials. Understory limits 45 m (plants) and 70 m (shrubs). Shadow fit to a 50 m view slice with texel snapping; a 40 m slice spike was inconclusive under load and not adopted.

**G4.** `output.ts` (3 tests): internal sizes, EASU constants, pacing with hysteresis. `post.ts` `FsrPass` (EASU + RCAS port with the AMD MIT notice; flat-region early-out), vignette and grain after RCAS. Program count after warm-up was not re-audited at nightfall and storm.

**G5.** See the Status line. The 2048² atlas uses 4 cells of 1024²; the hero LOD (`LOD_RES` 0.009) builds in the existing worker; every LOD change is drawn with complementary Bayer masks for 0.25 s (`debug.lodBlends` counts them). The A13–A16 before/after pairs are in `artifacts/visual/gfx-{before,after}/`; the blind reviewer comparison was not run.

### 8.3 What C5b should reuse

- **Zoom axis:** `camera-zoom.ts` (`Hf`, bands, pitch curve, springs, zoom-through state machine, `blendFrame`) and `SceneAPI.getZoom()` (`{ hf, band, view }`). The overview ↔ field cross-fade should key on `hf` and can reuse `blendFrame` to hand the camera between the diorama and the 1:1 window.
- **Cells:** `cells.ts` sorts any `InstancedMesh` into 16 m cells with per-cell boxes, hysteretic camera and light sets, contiguous re-packs and shadow-only twins. 4 × 4 cells are the 64 m streaming tile; a tile's contents are a pure function of the instances in it, so C5b can build kinds per tile and register them.
- **Keep-clear table:** `occluders.ts` slots (RGBA8, 4,096) with `aObj` per instance and part links; streamed tiles should allocate slot ranges per tile and free them on unload. Leaf clumps need no slots (per-clump GPU test).
- **Output:** `output.ts` (internal ratio, FSR constants, pacing) is renderer-agnostic. WebGPU: see §4.4.

---

## 9. C5b: the field view (29 Sep 2026)

Renderer for the real-metre `field` profile (docs/realism-design.md §5.1, Stage C5). **Status: implemented; the 60 fps proof is pending an idle GPU** (see Results).

### 9.1 What shipped

- **One coordinate system.** The field view renders at 1:1 in logical metres (render = logical, no floating origin; float32 keeps ~0.5 mm at 4 km). Animals, the camera rig, keep-clear, picking and labels are unchanged; only the environment is windowed.
- **Detailed window** (`render/env/field-env.ts`, `scene.ts` fieldStep): terrain (1 m grid ±168 m, shared index buffer), forest (simulated trees within 140 m, filler stand and understory per 64 m tile), water, rocks and logs, a canopy ring from 124 m to 1.3 km and a far floor under it. It is rebuilt around the camera focus once the focus drifts 40 m (centre snapped to 16 m, led by the focus velocity), in time slices of ≤ 3 ms (6–10 ms while the focus is outside it), then uploaded over ~6 frames (each batch drawn on an upload layer into a 1×1 target with the scene's own lights, fog and environment, so no program compiles) and swapped in; the old window is freed 3 frames later. Every procedural element is a pure function of its tile seed and simulated trees are built from their own ids, so overlapping windows draw the same forest. The terrain and vegetation builders are the compressed map's (`terrainSteps`, `vegetationSteps` with an origin and field inputs); the compressed map runs them to completion with identical output.
- **Overview** (`render/env/overview.ts`): the whole map's canopy surface (the far canopy's crowns on one lattice with a bounded warp and a broad tone mosaic; stylization), community ranges drawn into it with ~1.5 px edges, the stream as a map line, one screen-sized marker per party at a smoothed anchor (community colour, the selected animal's party ringed; clicking one selects a member and flies the strategy view to it), and community names at the ranges' north edges. It takes over as the strategy frame grows from 260 to 700 m; over the second half of that band a transparent canopy cap fades in over the window, so the window dissolves into the map instead of popping. Animals hide at ≥ 700 m (party markers stand in).
- **Camera** (`camera.ts`): the strategy view zooms out to ~92% of the map, backs its orthographic camera off with the frame (`rtsDistanceFor`), keeps its focus on the map, and resets to the whole map; haze scales with the frame. The cinematic director prefers episodes within ~250 m of the current subject; a perspective view that jumps outside the window dips to black until the rebuild lands.
- **Profile choice**: `?profile=field` opens an unsaved field world; Simulations → New simulation has a Profile choice (Compressed / Field, real scale, experimental). Saves carry the profile in `world.sim.params` (no envelope change); a saved field simulation reopens as one.
- **Creature layer**: nearest-tree lookups through 32 m buckets (`creatures/tree-index.ts`; the linear scans cost ~0.2 ms each over ~43,000 patches); field nests are kept no lower than just under their nest lobe (render-only).
- **Tooling**: `scripts/field-probe.mjs` (acceptance shots, animals-in-crowns check, rebuild times), `perf-probe --query profile=field` with `strat-*` scenarios, gpu-probe app specs `URL|&profile=field`, env harness `&profile=field&strat=1`; `tests/render-field.test.ts` (11 tests).

### 9.2 Results

Seed 48, `scripts/field-probe.mjs` (JSON `artifacts/perf/c5b-field-probe.json`; shots `artifacts/visual/c5b/`: overview, party-strategy, party-close, midday-close, night-strategy, night-close, storm-strategy, storm-close, new-simulation-profile).

| Check | Result |
| --- | --- |
| Animals up in trees render inside their tree's crown (rendered body inside a crown lobe, or against a trunk) | Day sweep over 8 party windows: 20/20. Night sweep (nests): 27/27 (21 in crowns, 6 on trunks). The selected animal's window at 08:00, 10:00, 13:30, 17:00 and 21:30: 10/10. The compressed map, same check: 89–100% by day, 98% at night (misses are animals stepping on or off a trunk). Before the field nest clamp, 26/28 at night. |
| Compressed map unchanged | `shot-compare` with the simulation frozen: dawn-rts 0.14%, noon-close 0.04%, night-rts 0.07%, cinematic 0.3% of pixels differ by > 8/255 (storm-rts 50%: lightning timing, the baseline against itself gives 44%). `verify-browser --no-model` 14/14; `pnpm test` and `pnpm build` green. |
| Window rebuild | 0.4–1.2 s wall time (18–44 frames); slices ≤ 10 ms (one 47 ms slice seen); staged uploads ≤ 5 ms per frame (14 ms worst). The swap frame had cost 115–130 ms when everything uploaded at once. ~650 trees and ~1,550 keep-clear objects per window (capacity 4,096). |
| Draw load | Overview 22 draw calls, 135 k triangles. Strategy view on a party 64–68 calls, 1.8–2.2 M. Close 70–73 calls, 1.7–1.9 M. The compressed map: strategy 62, close 71–73 calls, 1.75–2.7 M. |
| Frame rate (target ≥ 60 fps at 1440×900) | **Not provable today.** The GPU's device utilization was 98–100% from other applications' GPU processes with none of my probes running, and the compressed view itself measured 10–26 fps in the same minutes. In paired rounds on one build (`artifacts/perf/c5b-{compressed,field}-perf-r{1,2}.json`) the field view was never slower than the compressed one: overview 22–26 fps against the compressed strategy view's 14–16, close 13–14 against 10–17, cinematic 13–16 against 11–13. Rerun on an idle GPU: `perf-probe --query profile=field --scenarios rts-1x-day,strat-1x-day,close-1x-day,cinematic-1x-day,close-1x-night,strat-1x-storm`. |
| Saves | A field simulation made in the dialog saves (7.1 MB raw, 1.0 MB stored, 1.46 s streamed, largest main-thread slice 3.7 ms) and reopens as a field world at the saved tick. |

### 9.3 Deviations from docs/realism-design.md §5.1

- **The overview is not a compressed diorama.** §5.1 draws the whole map into today's 160 m diorama with party anchors at `s · anchor` and soft-capped member offsets. Rendering at 1:1 instead keeps a single coordinate system for animals, camera, keep-clear and picking, and the overview still never draws individual trees (canopy surface only), so there is no animal–tree mismatch; parties become screen-sized markers.
- **Whole-window rebuilds, not per-tile streaming.** The window is rebuilt as a unit (tile-deterministic content) so the compressed builders are reused unchanged in output. A rebuild costs ~0.7–1.5 s of wall time in slices, so a camera following a travelling party at 1 min/s (≈ 21 m/s) keeps up, but at 10 min/s and faster the focus runs ahead of the forest onto the far floor under the canopy ring until the next rebuild. Incremental tiles (cells.ts per tile, fade-slot pools) are the next step if that matters.
- **Density of the non-food stand** (~120 stems/ha with the food trees) is a design assumption matched by eye to the compressed forest, not a field value.
- **Not mine (UI):** the minimap draws its 20 m grid over the 8 km map, which reads as a dense texture; a grid step of `max(20, size / 8)` would fix it (`src/ui/minimap.ts`).
