# Stage W3: five defects of the body

Branch `w3-body-defects`, cut from `track-e` at dea2643. Written 10 October 2026, 23:35 EDT. Render only: mesh
primitives, the creature material, one pose and the creature harness. Nothing under `src/sim`, no parameter in
`data/params.json`, no new texel, no new render pass.

Reviewed by a second agent on 11 October 2026, 00:11 EDT: what it re-ran, what it corrected in this document and what
it left open are in "Second pair of eyes" near the end.

## Answer first

All five defects are fixed and each has a before and after picture of the same framing.

1. **The young have eyes.** Infants and juveniles now show large dark eyes at every mesh level, in the harness and in
   the running app. Adults keep theirs, a little darker and sharper.
2. **No hole in the ear.** The ear is a solid plate at every level and its hollow is painted. No level of the mesh has
   a triangle facing inward any more, anywhere on the body.
3. **The swelling and the tail tuft sit on the rump.** In the knuckle-walking stance the swelling faces backward at hip
   height and the tuft lies above it at the tail-bone. Their sizes were not changed.
4. **The knuckle hand rests on the backs of the middle finger segments.** The wrist height and the walk are unchanged
   to a micrometre; the gallop alone moves, by 4 mm at most around touchdown. Fingers and toes show dark grooves
   between them.
5. **The highlight is a soft band broken by strands**, and wet fur is a dark sheen instead of chrome. Animals read the
   same from the strategy view.

The creature harness's tile sheets (faces, tiles) are also fixed: each tile is now drawn on its own mesh level.

## The cause of the missing eyes

The eye was painted through a per-vertex mask, and that mask is a weight-normalised mean over every primitive near
the vertex (the eyeball, but also the skull, cheek, nose bridge, muzzle and brow, each with a wide falloff). On the
eyeball itself it never exceeds 0.46 and averages 0.23 to 0.38 over the iris, at every mesh level and every age (table
below). So the eye was drawn at about a third of its strength and two thirds of what showed was the face colour. On an
adult that is dark skin under a glossy dark iris, which reads as an eye. On an infant it is pale pink skin, which reads
as a blank socket. It was not level of detail (the mask is as weak on the finest mesh), not the young brow bone (the
eyeball is the nearest surface over the iris at every age) and not a closed lid. Painting the eye at full strength
brings the infants' eyes back on its own: with the young animal's larger, darker iris switched off, the four young
faces of the sheet all show eyes (`cause-check-gate-only.png` in the output directory). The review's face sheet made
it look worse than it was for a second reason found here: two of its twelve animals (2 y and 7 y) were caught
mid-blink at the usual 11 s capture.

## What changed, by defect

**1. Eyes** (`src/render/creatures/material.ts`, `body.ts`, `creatures.ts`)
- The eye gate is now the eyeball's own sphere in bind space (`EYE` in `body.ts`), at full strength, with a rim of 1
  to 2 mm that draws the lid line. Straight in front of the iris the rim is 1.6 mm deeper, which takes in the eyeball
  that the two coarser levels thicken sideways. The per-vertex mask (`aRegA.y`) is still built but the material no
  longer reads it.
- The young get a larger, darker iris: up to 22% wider and a third darker, easing out between 3 and 11 years. It uses
  the free float P5.y of the existing parameter texels; `ROW_TEXELS` is unchanged.
- The iris colour is 0.62 of its old value. It had been tuned to show through a gate of about one third; at full
  strength the old colour read as a bright yellow ring in the app's light.

**2. Ear** (`body.ts`, `material.ts`)
- The concha subtraction is removed. It left a wall thinner than the mesh spacing can hold. The hollow is painted on
  the outer face of the plate instead, as the nostrils are painted.
- Quads are now wound from the grid edge they cross instead of from the SDF normals of their corners. Corner normals
  point anywhere on a feature thinner than the grid, so some triangles were wound inward, were culled, and let the
  viewer see through the body (the white speck on the alpha's ear at 3 m). This holds for every level and for the
  shadow and x-ray proxy, which share the builder.

**3. Swelling and tail tuft** (`body.ts`, `material.ts`)
- The two region masks moved from the lower back to the back of the pelvis (`SWELL`, `TUFT`).
- The tuft's edge is broken by the strand noise and it stands 16 mm proud, so it shows from the side.

**4. Knuckle hand, fingers and toes** (`poses.ts`, `material.ts`)
- `fist()`: the joint at the base of the fingers is bent back 0.387 rad and the finger joint flexed until the middle
  and end segment lies level, pointing back under the wrist. The bend is the mirror image of the old flexion, solved
  so the stance's ground snap is the same number. That is why no IK target had to move: the difference the brief
  expected is zero.
- Three dark grooves between the fingers and three between the toes, plus one that sets off the big toe, drawn in bind
  space and faded before they alias. No new geometry.

**5. Highlights** (`material.ts`)
- The product of the three highlight masks is held under 1.2 (it reached 3.7). The clumps now only shade the
  highlight (0.55 to 1.1; they swung it between 0.15 and 1.5), and the strands streak it.
- Both lobes are about 1.4 times wider (exponents halved) and weigh about 0.7 of what they did, so the band carries
  about the same light.
- Wet fur: the tip lobe is a third of its old weight, the surface is rougher (0.48, was 0.36) and keeps 0.3 of the
  specular lobe (was 0.6).

**Harness** (`harness.ts`, `creatures.ts` debug flags)
- Tile sheets update the layer once per tile with a time step of zero, so a mesh-level cross-fade never advanced and
  each tile showed the level chosen for the tile before it. In tile sheets a level change is now drawn at once.
- The face sheet holds eyes open (`&blink=1` lets them blink).
- `mode=single` takes `&age=`, `&sex=` and `&swelling=` for its first animal.
- `window.__tileLods` reports the level each tile's animal was drawn on.

## Measurements

Every number below is printed by `probes/tables.py` from the readout files in the output directory
(`before/*-readout.json` from a copy of commit da1a707, which has the harness option and no body change;
`after/*-readout.json` from this branch).

| Mesh level (spacing) | Eye mask the old paint used: peak, mean over the iris (infant 0.3 y / adult 25 y) | Iris covered by the new paint region (infant / adult) |
| --- | --- | --- |
| hero (9 mm) | 0.46, 0.38 / 0.37 | 98% / 99% |
| fine (12.5 mm) | 0.42, 0.36 / 0.34 | 98% / 99% |
| mid (19 mm) | 0.41, 0.26 / 0.23 | 79% / 71% |
| coarse (33 mm) | 0.43, 0.28 / 0.27 | 60% / 56% |

On the two far levels the brow and the eyeball are built 1.45 times thicker so they survive the coarse grid, and the
thick brow covers the top of the eye. At those sizes the eye is one to four pixels.

| Mesh level (spacing) | Edges bordering an inward-facing triangle, whole body (on the ears): before | after | Ear, 49 lines of sight: see into the mesh / meet no ear, before | after |
| --- | --- | --- | --- | --- |
| hero (9 mm) | 42 (22) | 0 (0) | 0 / 0 | 0 / 0 |
| fine (12.5 mm) | 70 (56) | 0 (0) | 0 / 1 | 0 / 0 |
| mid (19 mm) | 38 (34) | 0 (0) | 14 / 13 | 0 / 0 |
| coarse (33 mm) | 51 (3) | 0 (0) | 0 / 22 | 0 / 8 |
| proxy (45 mm) | 48 (9) | 0 (0) | 0 / 21 | 0 / 7 |

"Meet no ear" means the plate is not resolved there and the head behind it is drawn: not a hole. It remains on the
coarse level and the shadow proxy, where an ear is under three pixels.

| In the knuckle-walking stance, hero level | Swelling before | after | Tail tuft before | after |
| --- | --- | --- | --- | --- |
| Above the hip joint (unit metres, adult male of size 1) | 8.8 cm | 1.7 cm | 11.2 cm | 7.3 cm |
| Behind the hip joint (unit metres, adult male of size 1) | 7.9 cm | 11.8 cm | 3.1 cm | 9.6 cm |
| Surface faces up (1 = straight up) | 0.76 | 0.15 | 0.96 | 0.61 |
| Surface faces back (1 = straight back) | 0.61 | 0.92 | 0.25 | 0.77 |

| Standing knuckle-walker, unit space (adult male of size 1) | Before | After |
| --- | --- | --- |
| Ground snap (lift of the whole body) | 0.028404 m | 0.028404 m |
| Wrist height | 0.158404 m | 0.158404 m |
| Hip height | 0.558404 m | 0.558404 m |
| Ankle height | 0.108404 m | 0.108404 m |
| Finger joint height | 0.016000 m | 0.016000 m |
| Fingertip height | 0.033421 m | 0.014797 m |
| Slope of the middle and end finger segment (0 = level, + = tip up) | 23.9 degrees | -1.6 degrees |
| Finger joint, distance in front of the wrist | -0.0155 m | 0.0155 m |

The walk at eight phases of the stride gives the same ground snap and hip height before and after, to the six decimals
the readout keeps (`pose-readout.json`). The gallop was read at one phase only, where it is also the same; the review's
sweep of every clip found that the gallop does move at other phases (see "Second pair of eyes").

Strategy view: the two field-map shots differ from their before pictures by less than 1 of 255 per channel on average
(0.77, 0.91, 0.67 at the 47 m frame; 0.06, 0.05, 0.04 at the 150 m frame).

## Constants and their labels

| Constant | Where | Label |
| --- | --- | --- |
| Hand rests on the backs of the middle finger segments; base joint bent back, finger joint flexed | `poses.ts` `fist()` | [M] tamagawa2020, matarazzo2015, thompson2020 (`docs/research.md`, "Addendum: W3 body defects") |
| `KNUCKLE_EXTEND` 0.3868 rad, `FINGER_LEVEL` a quarter turn less 0.075 rad | `poses.ts` | design assumption (chosen so the hand keeps its height; the source gives stride peaks of 26 to 59 degrees, no standing value) |
| Swelling and tuft on the back of the pelvis | `body.ts` `SWELL`, `TUFT` | [L] shefferly2005 for the region; the centres are a stylization |
| Swelling mask radii 5.2 x 4.2 x 4.2 cm (an ellipsoid of 384 cc; 366 cc before), inflation 5 cm (unchanged) | `body.ts`, `material.ts` | stylization; the source's 938 to 1,400 cc is not reached |
| Tuft stands 16 mm proud, edge broken by strands | `material.ts` | stylization |
| Eye paint rim 0.8 to 2.2 mm, 1.6 mm deeper in front of the iris | `material.ts` `EYE_RIM`, `EYE_FRONT` | stylization |
| Young iris up to 22% wider and a third darker, 3 to 11 years | `creatures.ts` P5.y, `material.ts` | stylization (no measured ratio) |
| Iris albedo at 0.62 of the old value | `material.ts` | stylization |
| Ear hollow painted, radii 2.1 x 1.6 cm | `body.ts` `EAR.concha`, `material.ts` | stylization |
| Finger, toe and big-toe grooves | `material.ts` | stylization |
| Highlight mask limit 1.2, clump range 0.55 to 1.1, lobe exponents 40 and 12, weights 0.008 and 0.006, wet 0.02, wet roughness 0.48, wet specular 0.3 | `material.ts` | stylization (a look, as before) |

## Pictures

Output directory: `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w3-body-defects/`, with `before/` and `after/`
holding the same 21 file names (42 pictures), plus `cause-check-gate-only.png`. `cap.mjs` (harness), `scene.mjs` (field map, repeatable) and `live.mjs`
(the running app) reproduce them; `probes/` holds the three readout scripts and `tables.py`. `review/` holds the
review's six pictures (`r1` to `r6`, each a before and after pair or a contact sheet), its scripts and its readouts.

| File | Framing | What to look at |
| --- | --- | --- |
| `01-faces-front` | harness `mode=faces`, frontal, all ages | eyes of the four young animals; before, the first row is also on a stale mesh level |
| `02-faces-profile` | harness `mode=faces`, profile | the ear: 6 of 12 with sky through it before, none after |
| `03-stages`, `04-stages-young-front` | harness `mode=stages` | eyes at the mid and coarse levels, and close |
| `05-tiles` | harness `mode=tiles`, eight actions | hands, no sparkle on the ears |
| `06`, `07-swollen-female-rear`, `-side` | harness `mode=single`, a swollen female | the swelling, from behind and from the side |
| `08`, `09-infant-rear`, `-side` | harness `mode=single`, a 1.5-year-old | the tuft, from behind and from the side |
| `10-knuckle-side`, `11-knuckle-hand` | harness `mode=single`, stand | the hand on the ground; the stance unchanged |
| `12-toes` | harness `mode=single`, the left foot from in front | grooves between the toes (and the hand beside it) |
| `13-sit-dry`, `14-sit-wet` | harness `mode=single`, seated, full sun | the highlight; wet fur |
| `15-scene-infant-face`, `16-scene-juvenile-face` | field map, seed 48, a 1.2-year-old and a 7-year-old | eyes |
| `17-scene-adult-male-3m` | field map, the alpha at 3 m | the ear speck, the eye, the hands |
| `18-scene-swollen-3m` | field map, a swollen female walking | the swelling |
| `19`, `20-scene-strategy` | field map, strategy view, 47 m and 150 m frames | animals read as before |
| `21-live-young-face` | the running app at Real time, a 2-year-old at 0.8 m | eyes (the fact-check's own framing and animal) |

Two things about the framings, said plainly:
- The six field-map pictures use the env harness as the review did (the app's own scene and creature layer, seed 48,
  1,200 ticks run before the first frame, then paused), because the running app is not repeatable to the tick: the
  same run twice put the same animal in a tree once and on the ground once. `21-live-young-face` is the running app.
- `12-toes` is a new framing (the review's foot shot looked at the heel). Its before picture was taken from a
  read-only copy of commit da1a707 served from the scratchpad.

## Checks

- `tests/render-body.test.ts` (new, 7 tests): every mesh level is closed and wound one way; no line of sight onto the
  ear sees into the mesh; the eye paint region is the nearest surface over the iris at four ages and four levels; the
  swelling and tuft positions in the stance; the knuckle stance keeps its ground snap and wrist height; and, added by
  the review, the stand, walk, sneak and patrol keep the ground snap of the old hook hand over a whole stride (the
  gallop within 5 mm), and the material's shader text gates the eye on `EYE`, not on the per-vertex mask, with the
  swelling and the tuft raised in the colour, shadow and x-ray passes alike.
- All 17 `tests/render-*.test.ts` files: 118 tests, 118 pass.
- `tsc --noEmit`: clean.
- Not run, by the brief: `pnpm test`, `pnpm build`, `gpu-probe`. No parameter was touched, so `gen-params --check`
  does not apply; the goldens and the field pin cannot move (nothing under `src/sim` changed).

## Frame cost

Nothing was measured (the brief bars the GPU probe). What runs per frame:
- CPU: one more float written per animal per frame (the iris term, in `writeParams`). No allocation.
- GPU: a few dozen more arithmetic operations in the creature fragment shader on every creature fragment (the eye
  sphere, the grooves with two `fwidth` calls, the ear hollow) and one more multiply-add in the shared skinning
  vertex code (the tuft). No new pass, texture, uniform, texel or draw call.
- Mesh building is no slower (the new winding rule replaces a per-triangle normal test).

## Not done, and limits

- **Sizes are as they were.** The drawn swelling is well under the 938 to 1,400 cc of the one source; enlarging it
  changes the outline and is the user's call.
- **The ear is still a flat plate.** Its hollow is paint. Its faceted outline was left alone.
- **Eyes have no lids.** A blink still fades the eye to skin colour rather than closing a lid. In profile the young
  animal's eyeball stands out of the face as a dark bulge: that is the existing geometry, now visible.
- **The feet still hover.** In the stance the hand's ground probe is fatter than the finger, so the whole body is
  lifted 2.8 cm in unit space and the soles float (visible in `12-toes`, before and after). Fixing it moves the wrist
  and the walk, which this stage was told not to do.
- **One finger slab.** The four fingers share two bones, so differences between digits cannot be drawn.
- **Wet fur was judged by the builder in the harness only**, which keeps full sun in rain. The review shot the field
  scene in heavy rain and at night (`review/r1`, `r2`): the chrome is gone there too and the eyes do not glow.
- **The app's fill light still turns black fur brown** (review item, out of scope).
- Left alone as instructed: coat volume, proportions, neck, shoulders, life size, per-animal faces.
- The research addendum was committed after the code that cites it; both are at the branch head.

## Second pair of eyes (11 October 2026)

A second agent read the whole diff, re-ran the checks and tried to break the stage. Its pictures, scripts and readouts
are in `review/` of the output directory; the two tables below are printed by `review/probes/review-tables.py`. Its
"before" is a read-only copy of `track-e` (dea2643) served from a scratch directory.

**Re-run and confirmed**
- The three readout scripts, on this branch and on the copy of `track-e`: all six files come out byte for byte as the
  builder's, and `tables.py` prints the 29 table rows of this document as they stand.
- Six of the builder's framings retaken from the worktree differ from its after pictures by 0.36 of 255 or less.
- The holes, measured another way: a depth picture of each mesh level from 26 directions at 1.5 mm per pixel. A pixel
  is see-through when the nearest triangle faces away from the viewer and nothing facing the viewer lies within 3 mm
  behind it. The holes were not only in the ears: on the coarse level and the shadow proxy most were in the hands and
  feet.

| Mesh level | Pixels drawn, 26 directions | See-through pixels before (of those on the ears, hands, feet) | after |
| --- | --- | --- | --- |
| hero | 3,570,702 | 106 (98, 0, 4) | 0 |
| fine | 3,556,398 | 1,040 (880, 0, 160) | 0 |
| mid | 3,561,669 | 3,359 (3,359, 0, 0) | 0 |
| coarse | 3,440,518 | 25,867 (559, 15,148, 10,160) | 0 |
| proxy | 3,416,628 | 21,383 (429, 3,648, 16,713) | 0 |

- Looked at, before against after where a before exists: the young animals' eyes on the mid and coarse levels (7.5 m
  and 15 m, `r3`), an adult eye from 0.45 m (`r4`), the face sheet from three quarters, from below, at night, in rain
  and with gaze and blinking on, the field scene at night and in heavy rain at 1 m, 3 m and 9 m (`r1`, `r2`), the
  swelling seated, mating, consorting, climbing, lying, galloping and at half size (`r5` holds the first three), the
  tuft seated, asleep and on a carried infant, and the hands through a walk on the gait course (`r6`). The running
  app opens on the field map and on the small map with the creature shaders compiled.
- The research addendum's quotations that carry a number or a place (thompson2020 and wunderlich2009 through PubMed,
  shefferly2005 on the Animal Diversity Web) were opened again and are there as written.

**Corrected by the review**
- **The gallop is not unchanged.** Every clip was swept (46 clips, 256 poses each) against `track-e`: 45 keep their
  ground snap, hip height and wrist heights to a micrometre; the gallop differs in 18 of 256 poses, by 4.1 mm at most.
  Around touchdown the swinging hand's fingertip, which now points back and down, reaches the ground before its
  knuckle. It was left: undoing it means another swing pose or other ground probes, for 4 mm.
- Two tests were added (see "Checks"). Each was seen to fail first: with `KNUCKLE_EXTEND` set to 0.46, and with the
  eye gate put back on the per-vertex mask.
- Three look constants in `material.ts` had no stylization label (the iris colour factor, the wet specular share, the
  painted ear hollow) and have one now.

**Found and left open (none blocks the merge)**
- **The swelling no longer shows from above.** On the lower back it was a pink mark that the strategy camera saw from
  most sides; on the rump it is seen from behind and from the side only. That is the correct place, and it costs a cue.
  If the user wants the state readable from above, it needs its own marker, not the old place.
- **The swelling now shears a little with the legs.** 28% of its mask's weight rides on the two thigh bones (4%
  before; `review/swellbones-*.txt`). Walking, galloping, climbing, lying and mating it reads as one mass; seated,
  the animal sits on it and a lip shows under the rump (`r5`).
- **"No triangle faces inward" is true of what is drawn**, and of the winding. A few triangles that the projection
  step folds over remain, most of them in the crease where the ear meets the head; they are hidden, and the share of
  pixels drawn with the shading normal facing away is about what it was:

| Mesh level | Triangles folded over (facing against their shading normals) before | after | Pixels drawn with the shading normal facing away, per million, before | after |
| --- | --- | --- | --- | --- |
| hero | 1 | 13 | 18 | 16 |
| fine | 4 | 26 | 61 | 89 |
| mid | 6 | 4 | 204 | 102 |
| coarse | 2 | 13 | 736 | 679 |
| proxy | 6 | 8 | 1420 | 1326 |

- The eye test also asserts that the per-vertex eye mask stays under one half. Nothing reads that channel now; if a
  later stage rebuilds it, drop the assertion.
- At night an adult's iris is a little lighter than the skin around it, as it was before (`r1`); it is sharper now,
  not brighter.
- Frame cost is still unmeasured, as the brief required.

## For the integrator

Merge notes
- Files: `src/render/creatures/{body,material,poses,harness}.ts`, `src/render/creatures.ts`,
  `tests/render-body.test.ts`, `docs/research.md` (an addendum appended at the end), this document.
- Likely conflicts: `docs/research.md` (every stage appends at the end: keep both); `src/render/creatures.ts` with W1
  (this branch touches only the `debug` object, `writeParams` and the level-change line); `poses.ts` with W5 (this
  branch touches only `fist()` near line 73, the grooming clip is near line 390).
- Stale pictures: the 42 pictures show the body without W1, W2 and W5.

Proposed line for `IMPLEMENTATION_PLAN.md`, in the W1 to W5 block, replacing the W3 bullet's status:

> - **W3 (branch `w3-body-defects`): built** (10 October 2026; agent-reported; `docs/staging/w3-body-defects.md`). The young had no eyes because the eye was painted through a per-vertex mask that never exceeds 0.46 on the eyeball, so two thirds of what showed was the face colour; the eye is now painted at full strength from the eyeball's sphere in bind space at every mesh level. The ear is solid with a painted hollow and no mesh level has an inward-facing triangle (38 to 70 edges per level bordered one before). The swelling and the tail tuft sit on the back of the pelvis (sizes unchanged). The knuckle hand rests on the backs of the middle finger segments with the wrist height and the walk unchanged (the gallop moves by 4 mm at most around touchdown). The highlight masks are held under 1.2. Reviewed by a second agent (11 October 2026): no see-through pixel on any mesh level from 26 directions (106 to 25,867 before), 45 of 46 clips unchanged in ground snap. `tests/render-body.test.ts` 7 tests; the 17 render test files 118 of 118. Open for the user: the swelling's size, the hovering feet, whether the swelling needs a cue the strategy view can see now that it sits on the rump.

Proposed lines for `AGENTS.md`
- Under "Verifying a change", replacing the creature harness line:
  `- /src/render/creatures/harness.html?mode=tiles|stages|faces|scene|perf|single (own cache config: --config src/render/creatures/vite.harness.config.ts; single takes &age=&sex=&swelling=; tile sheets draw each tile on its own mesh level, window.__tileLods; faces holds eyes open, &blink=1 lets them blink)`
- Under "Gotchas", after the line on per-animal shader params:
  `- Creature body landmarks the shader paints from live in body.ts (EYE, EAR, SWELL, TUFT) and are checked at every mesh level by tests/render-body.test.ts. The eye is painted from EYE in bind space, not from the per-vertex mask aRegA.y (a weight-normalised mean that stays under one half on the eyeball). P5.y is the young animal's iris term; P5.zw and texels 130 to 131 are still free. Quads are wound from the grid edge they cross: do not go back to winding by corner normals (thin features then get inward-facing triangles, drawn as holes).`

Proposed rows for `docs/simulation.md` section 17: none. No entry in `data/params.json` was added or changed.

Proposed addition to the stylization list of `docs/research.md` section 14 (the addendum already says it): "the young
animal's larger and darker iris, the eye paint's rim, the painted ear hollow, the grooves between fingers and toes, the
16 mm the infant's tail tuft stands proud, and where on the pelvis the swelling and tuft masks sit".

Commands to run at the merge: `pnpm test`, `pnpm build`; then one look at
`/src/render/creatures/harness.html?mode=faces&view=0.5,0.1,4.4` and `mode=single&action=rest&clip=stand`.

Decisions that are the user's: the swelling's size; whether to fix the hovering feet (it moves the wrist and the
walk); whether the young animal's protruding eyeball should be set back (geometry, part of the held shape pass);
whether the swelling needs a cue that the strategy view can see, now that it sits on the rump.
