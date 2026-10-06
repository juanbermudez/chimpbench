# Graphics, next level: animation, the forest as you zoom out, light

## Status (paused 5 October)

Paused at the coordinator's request (the project is moving to another computer). Phase 1 (assessment) is partly done and Phase 2 (prototypes) has not started. **No renderer code has changed on this branch**; this file is the only change.

**Done so far**
- Read the rendering stack: `src/scene.ts`, `render/env/{field-env,field,overview,terrain,vegetation,shared,sky,post}.ts`, `render/creatures/poses.ts` and the pairing code in `render/creatures.ts`, plus `docs/visual-plan.md` and `docs/graphics-camera-plan.md` (both fully implemented, except the deferred items listed there).
- Captured a zoom ladder of the field profile (8 km map, the app default): seed 48, 10:00, paused, env harness, frame heights (Hf) of 7,000 (the whole map), 3,000, 1,500, 700, 480, 320, 200, 120, 64 and 30 m. Screenshots are in the session scratchpad (`…/scratchpad/gfx-next/shots/zoom-10h/`), which does not move with the project. To reproduce them, see "How to reproduce" below.
- Found the subjects for the close-view and animation shots (seed 48, field profile, `&advance=N` in hours, hour forced to 10):
  - Ground grooming: `advance=6`: 11 grooms 21 at 0.6 m. `advance=7`: 1 grooms 11 and 11 grooms 21 at 0.6 m; 12 grooms 17 on the ground.
  - Grooming in crowns: `advance=5` and `advance=6`: 26 and 28 groom each other at 15.1 m. `advance=6`: 24 and 31 groom 37 at 6.8 m.
  - Play on the ground: `advance=5`: 9 and 17.
  - Nursing: `advance=5`: 22 and 14 at 9.5 m. `advance=9`: 18 and 12 at 0.6 m.
  - Feeding in crowns: many at every offset, e.g. ids 3, 10, 12 and 40 at `advance=5`. Feeding on the ground: 46 at `advance=6`; 8 and 9 at `advance=10`.

**Findings so far (ranked by visible impact)**

1. **Zooming out shows a park in a crater, not a rainforest.** This is the biggest problem, and it is visible in the default strategy framing (Hf ≈ 64 m).
   - The detailed window (±140 m) reads as open parkland or a plantation. Long, pale, bare trunks hold small separate crowns, and between them lies a sunlit, lawn-green floor. A real Kibale (Ngogo) canopy seen from above is closed. The main canopy sits at about 25–30 m with emergents to 40–50 m, the crowns touch, the gaps between them are deep shadow, and the floor is hidden.
   - The canopy ring (124 m to 1.3 km) and the overview share one height surface shaded with Voronoi cells of a single size (7.5 m; `FIELD_CANOPY_COLOR`). At Hf 200–480 that surface reads as faceted turtle-shell plates. It also stands higher than the window's crowns, so the window looks sunken: a garden plot at the bottom of a crater with a plate-covered rim.
   - At Hf ≥ 1,500 m the overview is a flat square of green felt. There is no relief, no stream valley and no visible tone mosaic (`CANOPY_BROAD` is too weak). The stream is a 1 px blue line, and the map edge is a hard square fading into white haze.
   - At Hf 700 the overview's cells read as a uniform pebble or crocodile-skin mosaic: every crown the same size and tone, with no emergents and no gaps.
2. **The forest floor is lit like a lawn.** The moss mask and direct sun make large areas bright yellow-green. The litter patches are brown, but under a closed canopy the whole floor should be dark litter with sunflecks (`terrain.ts` ground colour; direct light is not reduced by canopy cover, only indirect light is, through `envSkyVisibility`).
3. **Grooming barely moves** (`poses.ts` `groom`/`groomee`, layout in `creatures.ts` `pairingFor`):
   - The groomer's hands rest on one partner point and move only 1–3.5 cm.
   - The head pitches down, but the face never comes close to the partner's hair.
   - The work point never travels over the body, and there is no pick-to-mouth.
   - The groomee always sits hunched. Groomees often lie prone, on their side or on their back, or present a limb.
   - Mutual grooming is two seated animals face to face.
   - From the strategy camera a grooming pair reads as two animals sitting near each other.
4. **Lighting at km scale is flat.** It is untested in the field profile at dawn, dusk, night and in storms; the next captures cover them.
   - The overview gets one haze colour.
   - The overview's fog density is scaled down by frame size (`scene.ts`).
   - There is no aerial perspective by distance or altitude.
   - The valley mist is a sine lattice tied to ground height, so it cannot show the morning mist lying in Kibale's valleys at map scale.
   - Cloud shadows (`envCloudShade`) work at 240–420 m scales, too small to read from 3 km.

**Ranked list as it stands** (gain, cost and size are estimates; nothing has been measured yet)

| # | Item | Expected gain | Cost (est.) | Size |
|---|---|---|---|---|
| 1 | Closed canopy in the window plus a seamless ring: more canopy-layer crowns and clumps (emergents, crowns that touch), the ring's inner rim lowered to the window's canopy top, and ring shading drawn from the same crown scales and tones as the window. The strategy lens may need to open up to Hf ≈ 120 so animals stay readable | Removes the crater and the parkland look at Hf 64–480 | Build-time CPU in the window slices; GPU +0.3–0.8 ms in the strategy view (more clumps), so it needs a quality gate | M |
| 2 | Overview canopy shader v2: a multi-scale crown field (emergents 20–30 m, main canopy 8–12 m, shaded gaps), a phenology and species tone mosaic (flush, fruiting crowns, a few bare deciduous crowns), hillshade from the base terrain, swamp and riverine bands along the stream, treefall gaps, km-scale cloud shadows, valley mist and aerial perspective | The 8 km map reads as forested hills instead of felt | One fragment shader on one surface: ≤ 0.5 ms (est.) | M |
| 3 | Grooming choreography v2: a work point that travels over the partner's bones (back, shoulder, arm, head, leg), the groomer's face 10–20 cm from the hair, part-and-pick strokes of 5–10 cm, a pick-to-mouth every few seconds, groomee postures (prone, side, presenting a limb), eased role changes. The Kibale grooming hand-clasp only if a source goes into `docs/research.md` first | Grooming reads from the strategy camera and up close | CPU only, < 0.05 ms | M |
| 4 | Forest floor under canopy: dark litter, moss only where it belongs (banks, logs), sunflecks from the shadow map, direct light reduced by cover | The floor stops looking like a lawn | ≈ 0 GPU | S |
| 5 | Light at km scale: aerial perspective by distance in the strategy view, morning mist pooled in valleys (from the base height), cloud shadows at map scale, warm and cool grading by time of day | Depth and mood from above | ≤ 0.3 ms | S–M |
| 6 | Other actions: feeding in crowns (bending branches, reaching), nursing (the infant's mouth at the nipple), resting variants, displays (branch drag and slap) | Up-close realism | CPU only | M |
| 7 | Stream at km scale: a valley with a darker riverine band instead of a 1 px line | Map legibility | ≈ 0 | S |
| 8 | Post and camera polish: contact shadows (deferred F3 in the visual plan), godrays when the sun is in the frame | Close-up depth | 0.4–0.5 ms, close views only | M |

**What I was about to prototype (Phase 2)**: items 1 and 2 together (closed canopy plus seam plus overview shader v2, behind 'high'), and item 3 (grooming v2, CPU only). These are the best visible gains for their cost.

**Exact next steps**

1. Re-capture the remaining baseline scenes in the field profile:
   - close-view shots of the subjects listed above (groom, play, nurse, crown feeding);
   - 6.8 h dawn, 18.3 h dusk, 21.5 h night and a storm (`&rain=0.9&cloud=1&weather=storm&wind=1`), at Hf 64, 480 and 3,000 and in the close view;
   - the app's opening close view (`/?seed=48`).
2. Measure the GPU baseline: `node scripts/gpu-probe.mjs --ab` on the field scenes (`--apps "URL|&profile=field"`; strat-* and close-day), on the probe server (`pnpm exec vite --config scripts/vite.probe.config.mjs`, port 5192). Record the noise (load was 35–67 when this pass ran).
3. Prototype 1:
   - In `vegetation.ts` (field window): raise canopy-layer filler density and crown width, add emergents, and keep the midstory.
   - In `terrain.ts` (ring): set the rim height to the window's 90th-percentile crown top and soften the 124–150 m rise.
   - In `terrain.ts` `FIELD_CANOPY_COLOR` and `overview.ts`: replace the single Voronoi scale with two or three crown scales, plus hillshade from `createBaseHeight`, a stronger tone mosaic and a riverine band.
   - Gate the extra clumps by quality.
   - Check: before and after shots at the same Hf; `gpu-probe --apps` before and after; `scripts/field-probe.mjs` crown check still 100%; the lens keeps the focal animal visible.
4. Prototype 2: `groom`/`groomee` v2 in `poses.ts` (work-point path over `pb` partner bones, head proximity, pick-to-mouth, groomee lying variants keyed by seed and `pairT`). Label it as a stylization unless a source exists in `docs/research.md`. Check it in the creature harness (`?mode=single&action=groom`, C8 scene) and close views of the ground pairs above. `pnpm test`, `pnpm build`.
5. Finish this document: write per-item sections (what is wrong, technique, gain, cost, risk, size, with screenshots) and staged plans in `IMPLEMENTATION_PLAN.md` format.

**How to reproduce the zoom ladder**: start the probe server, open `/src/render/env/harness.html?profile=field&view=rts&strat=1&hour=10&advance=3&auto=0&hud=0&pause=1&seed=48`, then in the console set a frame height `HF` (m):

```js
const e = document.querySelector('canvas').__env;
e.rig.setZoomNow(e.rig.camera.zoom * e.rig.frameHeight() / HF);
```

Wait until `e.field.stats.building` is false before taking each shot. `e.rig.reset()` frames the whole map.

---

*(The full plan — per-item analysis, measured GPU costs, staged plan — follows when work resumes.)*
