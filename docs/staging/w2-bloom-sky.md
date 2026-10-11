# Stage W2: the white-out, and sky against haze

Agent w2-bloom-sky, branch `w2-bloom-sky`, cut from `track-e` dea2643. Work done 10 October 2026, 19:30 to 21:29.
Render only: nothing under `src/sim`, `data/` or `tests/` changed, so the golden hashes and the field pin cannot have moved.

## Short answer

All three faults are fixed, each in its own commit.

1. **The white-out is gone.** Facing the sun at 18:21 from eye level the picture's mean brightness goes from 206 to 61
   of 255 (58 with the bloom pass switched off). The sky and the sun no longer feed the bloom pass; a small flare is
   left where the sun shows.
2. **Haze and sky now meet.** The fog colour, the lowest band of the sky and the overcast sky come from one function.
   The sky also has a floor, so it is never darker than the light it is supposed to give. The worst case was not in
   the review: at 19:12 the sky was black over a forest lit like day.
3. **The mountain has no stripes and is never brighter than the sky behind it.** The stripes were the ambient
   occlusion pass, not the mesh. The mountain is now drawn by the sky, and occlusion fades out with distance.

Found by the review, not by the builder: the whole-map strategy view had the same white-out by day and at low sun
and loses it too (12:36: mean brightness 212.2 before, 170.7 after; 66% of pixels change by more than 8). See "Field
map, strategy views" and "Review".

Pictures: `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w2-bloom-sky/before` and `after` (17 each, same names and
framing), `compare` (small map), `cause` (the stripes). Every number below was printed by `w2tables.py` there from the
readouts in that folder.

How the numbers were read: each framing is the environment harness on the field map (seed 48, three hours in, quality
high, 1440 x 900, paused, frozen clock) with the camera placed as the review and the fact-check placed it. Display
brightness is the mean of (r+g+b)/3 over the screenshot, decoded in a page. Linear values are read back from the scene
target the bloom pass receives. My "before" for the fact-check's b1 is 206 and 62.2% against its 213 and 65.5%; the
linear readout matches it exactly (11.08% of pixels over the threshold, 4.5 per pixel, sun disc 19,270).

## 1. Bloom

**What was wrong.** The threshold pass keeps a pixel's full value once it is over 2.2, and the widest of the five
blurs spans the frame, so by the pass's own weights a frame-wide average of E over the threshold adds about 0.54 E
to every pixel. Round a low sun the dome is 40 to 130 and the disc 19,000, against a forest at 0.02. It is not only
eye level: from crown height facing west at 17:30 the frame was at 212 too.

**What I chose and why.** The dome limits itself, at the end of the sky shader: a soft shoulder that never passes
85% of the bloom threshold, and a fixed 40 for the sun's disc. Of the three options in the brief:
- *Clamp what the sky passes* (chosen). It works on every pixel that holds any sky, including the half-covered pixels
  along every leaf edge, and it needs nothing from the post chain.
- *Mask the sky by depth.* Not sound here: the scene target is multisampled, so an edge pixel resolves to a colour
  that is partly sky (20 where the sky is 40) with a depth that says "leaf", and those pixels would still flood the
  pass. Fireflies and rain also write no depth.
- *A soft knee.* Not enough alone: the sky is 18 to 60 times over the threshold, so any knee that stops it also stops
  every real highlight.

The bloom pass is untouched (same pass, same threshold, same strength). The image-based light is rendered without
the limit, so water and wet leaves reflect the sky's full range as before. Both limits sit past the tone curve's
shoulder, so the sky itself looks the same: with the bloom pass off, the frames differ by less than one level (last
two columns), except the three from above the canopy, which held the old mountain mesh (up to 2.6 brighter without it).

| Framing | Mean before | Mean after | At 200+ before | At 200+ after | Bloom pass off: mean before | Bloom pass off: mean after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 18:21, eye level, facing the sun (fact-check b1) | 206.0 | 60.7 | 62.2% | 7.7% | 58.7 | 58.2 |
| 18:21, same view, clear sky (b4) | 201.0 | 59.4 | 58.8% | 7.7% | 57.4 | 56.9 |
| 07:36, eye level, facing the sun | 212.3 | 106.7 | 67.2% | 16.8% | 104.3 | 103.5 |
| 07:36, eye level, 40° off the sun (review sunrise-sun40) | 113.8 | 55.7 | 10.4% | 5.2% | 55.7 | 55.7 |
| 12:36, eye level, looking at the animal (b6) | 88.3 | 84.9 | 3.6% | 3.4% | 85.0 | 84.9 |
| 12:36, above the canopy, open sky (b8) | 173.6 | 149.6 | 36.9% | 30.0% | 147.0 | 149.6 |
| 17:30, crown height, facing west | 212.3 | 141.0 | 66.0% | 30.9% | 139.7 | 141.1 |
| 18:21, crown height, facing west | 214.5 | 135.4 | 69.2% | 31.6% | 132.7 | 134.1 |
| 21:30, eye level, fireflies | 26.7 | 26.7 | 0.0% | 0.0% | 26.7 | 26.7 |
| 19:36, eye level, full moon in the frame | 39.1 | 39.1 | 0.1% | 0.1% | 39.1 | 39.1 |
| 13:30 storm, eye level, peak of a lightning flash | 168.9 | 169.1 | 39.9% | 40.0% | 168.4 | 168.7 |

What the bright pass receives (the sun disc is the only thing left over the threshold):

| Framing | Brightest pixel before | after | Pixels over the threshold before | after | Energy over the threshold per pixel before | after | Scene median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 18:21, eye level, facing the sun (fact-check b1) | 19270 | 40 | 11.08% | 0.01% | 4.5 | 0.003 | 0.0193 |
| 18:21, same view, clear sky (b4) | 17790 | 40 | 10.55% | 0.01% | 3.51 | 0.003 | 0.0189 |
| 07:36, eye level, facing the sun | 21230 | 40 | 21.19% | 0.02% | 8.39 | 0.00706 | 0.0633 |
| 07:36, eye level, 40° off the sun (review sunrise-sun40) | 25.49 | 1.869 | 1.82% | 0.00% | 0.143 | 0 | 0.0193 |
| 12:36, eye level, looking at the animal (b6) | 2.664 | 1.795 | 0.36% | 0.00% | 0.00837 | 0 | 0.0989 |
| 12:36, above the canopy, open sky (b8) | 3.249 | 1.829 | 10.51% | 0.00% | 0.274 | 0 | 0.262 |
| 17:30, crown height, facing west | 86.18 | 1.869 | 35.36% | 0.00% | 4.84 | 0 | 0.258 |
| 18:21, crown height, facing west | 19350 | 40 | 27.90% | 0.03% | 12 | 0.00963 | 0.174 |
| 21:30, eye level, fireflies | 0.8254 | 0.8254 | 0.00% | 0.00% | 0 | 0 | 0.00983 |
| 19:36, eye level, full moon in the frame | 0.6019 | 0.6019 | 0.00% | 0.00% | 0 | 0 | 0.0109 |
| 13:30 storm, eye level, peak of a lightning flash | 3.09 | 3.09 | 0.02% | 0.02% | 0.000396 | 0.000396 | 0.239 |
| 15:00 rain, eye level | 0.4841 | 0.5059 | 0.00% | 0.00% | 0 | 0 | 0.0253 |

**What bloom still does.** The sun's disc (a flare a few degrees wide, see `after/dusk-sun.png`) and highlights on
things: at the peak of a lightning flash the same 0.02% of pixels are over the threshold before and after. Two things
the comments in the code promise never happened and still do not: fireflies are capped at 1.3 by their own shader
("kept below the tone-mapper's shoulder") and the full moon's disc measures 0.60, both under the threshold of 2.2
(the brightest pixel of the firefly framing is 0.83). The moon's halo is drawn by the sky shader, not by bloom.
At night the frame is the same with the pass on or off, before and after. Left as found; see "Decisions".

## 2. One horizon colour

**What was wrong.** The fog colour came from a hand-set ramp and the dome from the Preetham model plus a separate
overcast grey. Measured on the dome alone (table below): at 07:03 the haze was 12 times the sky 10° above it, in rain 7
times, and through twilight 47 to 65 times, because the dome between sunset and night was darker than the night dome.

**What changed** (`src/render/env/sky.ts` only).
- One function, `horizonColor`, gives the fog colour (unchanged, so the look inside the forest is unchanged), the
  lowest band of the dome (painted with it: about 3.4° high in clear air, up to 15° in rain and dawn mist) and the
  overcast dome (half of it at the horizon).
- A luminance floor under the dome: the radiance of a white card lying under the rig's own sky light, plus 8% of the
  sun. A sky cannot be darker than a card it lights. By day the dome is far above it; it acts at low sun, through
  twilight and under heavy cloud, and fades out with nightfall.
- These terms are for perspective views. The strategy view is orthographic and shows the dome only as the backdrop
  round the whole map; with the terms on, that backdrop went from dark to pale at dawn, which belongs to the held
  stage N4, so it keeps the dome it had. The bloom guard of step 1 stays on there, which changes the whole-map view
  by day (see "Field map, strategy views" below).
- The image-based light is rendered without these terms too. At eye level the pixel differences are confined to the
  sky gaps; trunks, leaves and ground are unchanged.

Clear weather (the dome drawn alone, 90° from the sun; linear luminance):

| Hour | Sun altitude | Fog colour | Sky at the horizon before | after | Sky 10° up before | after | Sky 45° up before | after | Haze ÷ sky at 10° before | after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 06:27 | -7.5° | 0.019 | 0.00789 | 0.019 | 0.00792 | 0.0113 | 0.00597 | 0.0089 | 2.4 | 1.7 |
| 06:48 | -2.3° | 0.122 | 0.00199 | 0.122 | 0.00261 | 0.112 | 0.00273 | 0.0887 | 46.7 | 1.1 |
| 07:03 | 1.5° | 0.332 | 0.014 | 0.332 | 0.0278 | 0.158 | 0.00982 | 0.125 | 11.9 | 2.1 |
| 07:18 | 5.2° | 0.435 | 0.0814 | 0.435 | 0.095 | 0.134 | 0.0291 | 0.0989 | 4.6 | 3.2 |
| 07:36 | 9.7° | 0.53 | 0.225 | 0.53 | 0.197 | 0.208 | 0.0575 | 0.113 | 2.7 | 2.5 |
| 10:00 | 45.6° | 0.446 | 1.95 | 0.446 | 1.03 | 1.01 | 0.324 | 0.329 | 0.4 | 0.4 |
| 12:36 | 83.7° | 0.446 | 3.49 | 0.446 | 1.91 | 1.57 | 0.808 | 0.776 | 0.2 | 0.3 |
| 17:30 | 21.7° | 0.5 | 0.781 | 0.5 | 0.471 | 0.474 | 0.131 | 0.164 | 1.1 | 1.1 |
| 18:21 | 9.0° | 0.531 | 0.198 | 0.53 | 0.179 | 0.192 | 0.0527 | 0.108 | 3.0 | 2.8 |
| 18:54 | 0.7° | 0.275 | 0.00727 | 0.275 | 0.0183 | 0.151 | 0.00704 | 0.12 | 15.0 | 1.8 |
| 19:12 | -3.8° | 0.1 | 0.000771 | 0.1 | 0.00154 | 0.0631 | 0.00208 | 0.0501 | 64.9 | 1.6 |
| 21:30 | -38.2° | 0.00699 | 0.0103 | 0.00699 | 0.0102 | 0.0102 | 0.00732 | 0.00732 | 0.7 | 0.7 |

Rain 0.8 under cloud 0.95:

| Hour | Sun altitude | Fog colour | Sky at the horizon before | after | Sky 10° up before | after | Sky 45° up before | after | Haze ÷ sky at 10° before | after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 07:03 | 1.5° | 0.137 | 0.0163 | 0.137 | 0.0132 | 0.198 | 0.0105 | 0.166 | 10.4 | 0.7 |
| 12:36 | 83.7° | 0.333 | 0.0838 | 0.333 | 0.0717 | 0.278 | 0.105 | 0.229 | 4.6 | 1.2 |
| 15:00 | 59.1° | 0.333 | 0.0712 | 0.333 | 0.048 | 0.275 | 0.125 | 0.239 | 6.9 | 1.2 |
| 18:21 | 9.0° | 0.241 | 0.0326 | 0.241 | 0.0254 | 0.197 | 0.0303 | 0.151 | 9.5 | 1.2 |
| 21:30 | -38.2° | 0.0666 | 0.0037 | 0.0666 | 0.00296 | 0.0315 | 0.00221 | 0.0192 | 22.5 | 2.1 |

Read with care: at the horizon they now agree at every hour (the two "sky at the horizon" columns: after equals the
fog colour). By day that makes the lowest band of the sky darker than it was (at the horizon 1.95 before and 0.446
after at 10:00, 3.49 and 0.446 at 12:36): the fog colour is darker than the Preetham horizon, so a clear day now has
a pale grey band of haze, about 3.4° high, under the brighter sky. Ten degrees up, the dome is still 2.5 to 3.2 times darker than the haze around 07:18 to 07:36 and at
18:21, because the fog ramp is at its brightest there; that is now a gradient, not an edge. I did not change the fog
ramp. On rainy nights the fog itself is ten times brighter than on clear nights (0.067 against 0.007); the dome follows it.

Pictures: `mist-eye`, `mist-drone` (07:03), `twilight-drone` (19:12), `rain-eye`, `rain-drone`, `night-rain-drone`, `dusk-drone`.

## 3. The mountain

**The cause of the stripes** (the review did not find it). They are the ambient occlusion pass. At 5.2 km the depth
buffer steps by about 4 m by my arithmetic (near plane 0.4 m, 32-bit float), more than the 1.6 m radius the pass
looks in. The review's
switch-off did not stick because the scene re-enables the pass every frame; forced off, the stripes go
(`cause/ridge-ao-on.png`, `cause/ridge-ao-forced-off.png`, from `probe-ridge.mjs` on the base commit). The brightness
fault was separate: the mesh's colour was mixed from the fog colour, so it was brighter than the sky wherever the
haze was.

**What changed.**
- The mesh is removed (`terrain.ts`, `scene.ts`). The sky shader draws the ridge line by bearing (215° to 310°, up to
  about 5° high, as the mesh had it) and fills it with the sky behind it, 14 to 26% darker and cooler. It hides the
  moon and the sun's disc, stands with its foot in the horizon band, and fades out from 50% cloud and in rain.
- Ambient occlusion fades out between 1.2 and 2.4 km in perspective views (`post.ts`). This is the cause itself, and
  it also clears the same dark marks along the far forest's edge, which the new soft horizon would otherwise show.
  Nothing within the detailed window or the canopy ring (to 1.3 km) changes.

| Case | Sun altitude | Mesh before | Sky behind it | Mesh ÷ sky | Massif after | Sky behind it | Massif ÷ sky | Shown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 06:27 before sunrise | -7.5° | 0.0202 | 0.00786 | 2.57 | 0.0187 | 0.0188 | 0.99 | yes |
| 07:03 sunrise | 1.5° | 0.257 | 0.0112 | 22.95 | 0.326 | 0.327 | 1.00 | yes |
| 10:00 | 45.6° | 0.347 | 1.33 | 0.26 | 0.559 | 0.611 | 0.91 | yes |
| 12:36 | 83.7° | 0.347 | 3.25 | 0.11 | 0.637 | 0.97 | 0.66 | yes |
| 17:30 | 21.7° | 0.386 | 9.54 | 0.04 | 0.68 | 1.8 | 0.38 | yes |
| 18:21 | 9.0° | 0.408 | 27.4 | 0.01 | 0.705 | 1.86 | 0.38 | yes |
| 18:54 sunset | 0.7° | 0.215 | 7.44 | 0.03 | 0.481 | 1.21 | 0.40 | yes |
| 19:12 twilight | -3.8° | 0.0831 | 0.000813 | 102.21 | 0.0913 | 0.0939 | 0.97 | yes |
| 21:30 night | -38.2° | 0.0116 | 0.0105 | 1.10 | 0.00725 | 0.00764 | 0.95 | yes |
| 12:36 overcast (cloud 0.92) | 83.7° | 0.279 | 0.282 | 0.99 | 0.36 | 0.36 | 1.00 | hidden |
| 15:00 rain | 59.1° | 0.266 | 0.137 | 1.94 | 0.332 | 0.332 | 1.00 | hidden |
| 07:03 rain | 1.5° | 0.117 | 0.0159 | 7.36 | 0.139 | 0.139 | 1.00 | hidden |
| 21:30 rain | -38.2° | 0.0545 | 0.00366 | 14.89 | 0.066 | 0.066 | 1.00 | hidden |

Before, the mesh was brighter than the sky behind it in 7 of 13 cases (up to 102 times at twilight). After, never.
At sunrise it is hidden in the mist band, and facing the setting sun it is lost in the glow.
Pictures: `massif-10h` (facing it), `10h-drone` and `10h-drone-ridge-crop` (the review's framing).

## What did not change

Small map, the five fixed scenes of `scripts/shot-compare.mjs` (these hold almost no sky; a close view of the small
map with sky in it changes as the field map does, see the review's table of framings below):

| Scene | Constant random: same code twice | Constant random: before against after | Seeded random: same code twice | Seeded random: before against after | Mean before | Mean after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| dawn-rts | 0.06, 0.15% | 0.04, 0.10% | 0.02, 0.05% | 0.03, 0.08% | 72.2 | 72.2 |
| noon-close | 0.06, 0.10% | 0.18, 0.51% | 0.00, 0.01% | 1.03, 0.82% | 75.1 | 75.0 |
| night-rts | 0.00, 0.01% | 0.06, 0.12% | 0.00, 0.00% | 0.00, 0.01% | 33.9 | 33.9 |
| storm-rts | 0.03, 0.07% | 0.05, 0.12% | 0.04, 0.10% | 0.05, 0.13% | 210.8 | 210.8 |
| cinematic | 0.01, 0.02% | 0.05, 0.09% | 0.05, 0.16% | 0.21, 0.35% | 31.5 | 31.5 |

Every difference explained:
- **noon-close, 0.18 (0.51% of pixels).** A few patches of dome seen below the horizon at the top of the frame are
  now the fog colour instead of the Preetham horizon white (`compare/noon-close-before.png`, `-after.png`).
- **noon-close 1.03 and cinematic 0.21 with a seeded random source.** Not a change in the picture: three.js draws
  each object's UUID from `Math.random`, the stage removes three objects (the mountain's geometry, material and
  mesh), so the page makes 4,851 draws before its first frame instead of 4,863 (`random-draws.txt`) and the ambient
  occlusion noise texture, built from the same sequence, comes out different. With a constant `Math.random` both
  builds share one dither and the difference falls to the first bullet.
- **dawn, night, storm:** at the noise floor. These are strategy views; the sky is not in them.
- The stock script's storm scene differed by 6.5 (21.64% of pixels) between the two builds on its first run here:
  the lightning flash light is re-placed from `Math.random` on every frame of the frozen clock. I gave the script a
  seeded random source (its own commit); `compare/shot-compare-repo.txt` holds its output in both modes.

Field map, strategy views (constant random source):

| View | Mean absolute difference | Pixels differing by more than 8 | Mean before | Mean after |
| --- | ---: | ---: | ---: | ---: |
| whole-map-07h05 | 0.00 | 0.00% | 52.4 | 52.4 |
| whole-map-19h12 | 0.00 | 0.00% | 50.5 | 50.5 |
| map-edge-10h-frame-900m | 0.05 | 0.00% | 160.5 | 160.5 |
| party-frame-rain | 0.00 | 0.00% | 60.2 | 60.2 |

**Corrected by the review: the whole-map view by day is not unchanged.** The two whole-map rows above are in the dark.
By day and at low sun the dome behind the map is over the bloom threshold, so on the base the whole-map view had the
same fault as the close view (at 12:36 the map is a pale ghost, mean brightness 212). The bloom guard of step 1 acts
on every view, so that veil is gone; the backdrop itself is still the old dome. Party frames and the small map's
strategy views hold no backdrop and do not change. Pictures: `review/whole-map-12h36-before.png`, `-after.png`,
`review/whole-map-18h21-before.png`, `-after.png`.

| View | Mean absolute difference | Pixels differing by more than 8 | Mean before | Mean after |
| --- | ---: | ---: | ---: | ---: |
| field map, whole map, 10:00 | 7.06 | 18.12% | 166.9 | 159.9 |
| field map, whole map, 12:36 | 41.57 | 66.11% | 212.2 | 170.7 |
| field map, whole map, 18:21 | 66.58 | 88.07% | 173.5 | 106.9 |
| field map, whole map, 12:36 overcast | 0.00 | 0.00% | 120.0 | 120.0 |
| field map, party frame, 18:21 | 0.00 | 0.00% | 42.8 | 42.8 |
| field map, party frame, 07:36 | 0.00 | 0.00% | 74.7 | 74.7 |
| small map, 12:00 | 0.12 | 0.28% | 78.4 | 78.4 |
| small map, 18:21 | 0.05 | 0.15% | 49.5 | 49.5 |
| small map, 07:36 | 0.10 | 0.25% | 78.0 | 78.0 |

The app's opening view (`app-opening.png`) looks down at the animals and holds no sky; it is the same picture apart
from the animals' poses (the simulation is running). Medium and low quality were each rendered once facing the low
sun (medium: bloom on, no white-out; low: no bloom pass).

Checks: `pnpm exec tsc --noEmit` clean; nine render test files (`render-field`, `render-post`, `render-cells`,
`render-camera`, `render-camera-zoom`, `render-flow`, `render-follow`, `render-footprint`, `render-occluders`), 70
tests, 70 pass. None of those nine reads `sky.ts` or `createPost`; the review added `tests/render-sky.test.ts`
(7 tests, see "Review"). Not run by me: the whole suite, `pnpm build`, `gpu-probe`.

## Cost per frame

No new render pass, no new render target, no texture read added, no allocation per frame. Not timed (no GPU probe in
this tranche).
- On the CPU, once per rendered frame in `sky.update`: a dozen multiplications and three colour copies into objects
  made once.
- In the sky dome's fragment shader, on pixels where sky shows: one mix for the band, about ten operations for the
  floor, three exponentials for the shoulder, a division and a derivative for the ridge test; under 5.7° of elevation
  on the massif's bearing also an arctangent, a power and two calls of the dome's own noise.
- In the ambient occlusion pass (quality high, perspective): pixels beyond 2.4 km are dropped before the sampling
  loop (less work than before), one mix for the rest.

## Not done, limits, risks

- **Stills only.** I did not watch the flare flicker as the sun passes behind leaves, or the band while the camera
  pitches.
- **The dome 10° up at golden hour** is still darker than the haze by 2.5 to 3.2 times (section 2).
- **The sunset palette is unchanged**: facing the sun at 18:21 from crown height a third of the frame is still a
  cream wash (31.6% of pixels at 200 or more, 31.5% with the bloom pass off). That is the sky model at this
  exposure, not bloom.
- **The mountain's outline is noise**, not the range's real profile, and differs from the old mesh's outline.
- **The image-based light still comes from the old dome.** Bringing it to the corrected dome would brighten rain and
  twilight interiors and the stream; I left the light alone on purpose.
- **Risks.** (a) The shoulder must stay the last line of the sky shader: a term added after it can pass the bloom
  threshold again. (b) The occlusion fade is two string replacements in three's GTAO shader; if a three upgrade
  renames those lines the fade is dropped and the page logs one warning. (c) At midday the dome's brightest band
  (1.5 to 3.5 linear) is compressed to under 1.87: about one display level. (d) `scripts/shot-compare.mjs` now
  seeds `Math.random` in the page; revert commit 7156c14 if that is not wanted, nothing depends on it.
- **Seen in passing, not mine:** on a worktree server the app logs that the SQLite module fails to load (the wasm
  request answers with a page), before and after my changes; scratch worlds still open.

## Files

- `src/render/env/shared.ts`: `BLOOM_THRESHOLD`.
- `src/render/env/sky.ts`: the shoulder, `horizonColor`, the band, the floor, the massif.
- `src/render/env/post.ts`: the threshold by name, the ambient occlusion far fade (`aoFarFade`).
- `tests/render-sky.test.ts` (review): the sky rig's uniforms and shader text, and the far fade against the installed three.
- `src/render/env/terrain.ts`, `src/scene.ts`: the mountain mesh removed.
- `scripts/shot-compare.mjs`: seeded `Math.random` (`RANDOM_MODE=constant` for a constant).

Reproduce (a model-free server of this branch on 5185 and a snapshot of dea2643 on another port, here 5195), from the
pictures folder: `node w2cap.mjs before|after [scene ...]` (W2_SERVER picks the server), `node probe-sky.mjs <server>
<label> [query]`, `node probe-massif.mjs <server> before|after`, `node w2compare.mjs <before> <after> compare`
(RANDOM_MODE=seeded|constant), `node w2strategy.mjs`, `node probe-random.mjs`, then `python3 w2tables.py`.

## Decisions that are the user's

1. **Should fireflies and the moon bloom?** The code comments say they do; they never have (both sit under the
   threshold). Making them bloom is a new look, so I did not.
2. **Should the image-based light follow the corrected dome?** More consistent, but it changes the light in rain and
   at twilight.
3. **The whole-map backdrop** (stage N4): the corrected dome gives a haze-coloured surround instead of black at dawn
   and white by day. Not switched on. The bloom guard does act there, so the map itself is no longer veiled by the
   white backdrop by day (review, "Field map, strategy views").

## Review (second pair of eyes, 10 October 2026)

Read the whole diff, served the branch on 5185 and a snapshot of dea2643 on 5195, re-ran the builder's capture script
on four framings (same numbers to the decimal: 60.7 and 7.7% facing the sun at 18:21, 58.2 with the bloom pass off)
and its numbers-only framings on both builds (overcast, 06:27, night, storm from crown height, moonrise: all as in
its tables), then took framings it had not. Readouts, scripts and four pictures: `review/` in the pictures folder;
every table here was printed by `review/review-tables.py`.

What held: the three fixes do what the brief asked, on the field map, the small map and in the app, at high, medium
and low quality; the far fade of ambient occlusion does remove marks along the far forest's edge; the fixed scenes of
the small map are at the noise floor except noon-close (`review/shot-compare-review.txt`).

What was wrong, and what was done:
- **"Strategy views unchanged" was false** for the whole map by day (table above). The change is the fix itself and an
  improvement; the document, the status line and the gotcha line now say so. No code change.
- **The horizon table was printed twice with the rain values**; the clear-weather table was missing. Restored from
  `tables.md`.
- **No test read the changed code.** Added `tests/render-sky.test.ts`: the bloom guard is the last word of the sky
  shader and under the threshold; fog colour, horizon band and overcast dome are one colour at ten hours and weathers;
  the floor is never under a white card lit by the rig's sky light and is zero at night; the mountain is hidden in
  rain and overcast; the image-based light and the strategy view keep the old dome; the far fade applies to the
  installed three. Each was checked to fail when the behaviour is broken (eleven mutations, eleven failures). The
  occlusion patch became a function (`aoFarFade` in `post.ts`) so the test can call it; the shader text is the same.

Framings the builder did not take:

| Framing | Before | After | Bloom pass off: before | Bloom pass off: after | Brightest pixel before | after | Pixels over the threshold before | after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| field map, 18:53 (sun 1° up), crown height, facing the sun | 181.2 | 136.6 | 133.5 | 136.6 | 22.18 | 1.869 | 7.60% | 0.00% |
| field map, 07:12 (sun 3.7° up), crown height, facing the sun | 210.1 | 154.6 | 153.7 | 153.0 | 4765 | 40 | 21.04% | 0.03% |
| field map, 12:36, eye level, looking up through the crowns | 125.6 | 112.4 | 111.7 | 112.4 | 3.099 | 1.822 | 1.51% | 0.00% |
| field map, 18:21, cinematic view | 149.7 | 35.1 | 36.1 | 35.1 | 135.2 | 1.869 | 1.41% | 0.00% |
| small map, 18:21, eye level, facing the sun | 134.5 | 48.4 | 46.0 | 45.8 | 157.1 | 1.869 | 2.90% | 0.00% |
| small map, 10:00, crown height, facing the mountain | 134.1 | 135.5 |  |  | 0.9024 | 0.7801 | 0.00% | 0.00% |
| small map, 07:03, crown height, facing the mountain | 70.9 | 137.4 |  |  | 0.3183 | 0.3183 | 0.00% | 0.00% |
| small map, 15:00 rain, crown height, facing the mountain | 105.4 | 129.9 |  |  | 0.5499 | 0.5499 | 0.00% | 0.00% |
| small map, 21:30, crown height, facing the mountain | 42.4 | 42.7 |  |  | 0.2163 | 0.2167 | 0.00% | 0.00% |

Branch only (no before taken):

| Framing | Mean | Bloom pass off | Brightest pixel | Pixels over the threshold |
| --- | ---: | ---: | ---: | ---: |
| field map, 18:21, facing the sun, quality medium | 64.5 | 62.1 | 40 | 0.01% |
| field map, 18:21, facing the sun, quality low (no bloom pass) | 59.3 | n/a | 40 | 0.01% |

The flare as the sun slides behind a trunk (18:21, eye level, camera moved sideways 0.25 m per step): no jump larger
than 1.4 levels of mean brightness.

| Step | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mean brightness | 60.7 | 59.3 | 58.2 | 57.4 | 57.4 | 57.2 | 56.8 | 56.4 |
| Brightest pixel (linear) | 40 | 40 | 40 | 30 | 30 | 20.04 | 20.03 | 1.869 |

"The sky itself looks the same" is true of the frame's mean (under one level). On the bright sky pixels themselves
the picture moves by 3 to 5 levels of 255 with the bloom pass off in both builds:

| Framing | Mean absolute difference | Pixels differing by more than 8 | Share of the frame at 200 or more | Mean absolute difference on those pixels |
| --- | ---: | ---: | ---: | ---: |
| 18:21, eye level, facing the sun | 0.50 | 0.46% | 8.2% | 4.67 |
| 07:36, eye level, facing the sun | 0.84 | 0.26% | 17.4% | 3.89 |
| 12:36, eye level, looking at the animal | 0.18 | 0.22% | 3.5% | 3.00 |

The far fade of ambient occlusion, tested on its own. Same page and frame (10:00, crown height, field map), the fade as shipped against the fade pushed out of reach: 255 pixels differ by more than 8, all in rows 385 to 393 of 900 (the far forest's edge); mean absolute difference over the frame 0.12. Farthest mesh in the scene reaches 7266 m (overview-canopy).

Through dawn and dusk the dome was read every 6 minutes on the branch (table R6 in `review/review-tables.md`): it
rises and falls without a jump. Largest change between two readings 6 minutes apart: a factor of 3.6 (19:24 to 19:30, 4° up). That is the floor fading out at nightfall;
frames at 19:24 and 19:30 (looked at, not kept) show a dark blue sky with a paler band at the horizon, and the forest
dims with it.

Left as found, for the integrator and the user:
- The mountain is faint by day (a soft ridge in the haze band) and the sun now sets behind a ridge that cannot be
  told from the glow. The old mesh hid the sun too. A look, not a defect of the brief.
- On a rainy night the horizon is a pale band (the fog colour there is ten times the clear night's).
- At 07:12 to 07:36 the dawn band is wide and cream under a blue sky: graded, no edge, but still the brightest thing
  in the frame away from the sun.
- Frame time is still unmeasured. The sky shader runs on every pixel of the frame before the forest covers it.

## For the integrator

Status line for `IMPLEMENTATION_PLAN.md`, stages W1 to W5, replacing the W2 bullet's tail or added under it:

> **W2 (branch `w2-bloom-sky`, 10 October 2026; built and reviewed by a second agent, awaiting merge):** built. The sky dome limits itself under the bloom threshold and the sun's disc to a fixed value (facing the sun at 18:21 from eye level: mean brightness 206 before, 60.7 after, 58.2 with the bloom pass off); the fog colour, the dome's lowest band and the overcast dome come from one function and the dome has a floor tied to the rig's own sky light (haze against the sky 10° up at 07:03: 11.9 before, 2.1 after; at 19:12: 64.9 before, 1.6 after); the mountain mesh is removed and drawn by the sky (brighter than the sky behind it in 7 of 13 cases before, none after), and the stripes' cause, ambient occlusion on geometry beyond the depth buffer's precision, is fixed by fading occlusion out between 1.2 and 2.4 km. The whole-map strategy view had the same white-out by day and loses it (12:36: mean brightness 212.2 before, 170.7 after); its backdrop and every strategy view without the backdrop are unchanged. Small map: the five fixed scenes change only in a few patches of dome below the horizon; close views with sky in them change as on the field map. No render pass added; frame time not measured. Tests: `tests/render-sky.test.ts`. `docs/staging/w2-bloom-sky.md`.

Lines for `AGENTS.md`:

- Commands, replacing the `shot-compare` line:
  `node scripts/shot-compare.mjs <beforeUrl> <afterUrl> [outDir]   # visual-regression diff of fixed env-harness scenes; Math.random is seeded in the page (RANDOM_MODE=constant for builds that create a different number of three.js objects; BARE=1 hides labels and rings)`
- Gotchas, new:
  `The sky dome keeps itself under the bloom threshold (BLOOM_THRESHOLD in render/env/shared.ts; the shoulder is the last line of the sky shader in sky.ts and the sun's disc is held at 40). A sky term added after it, or a threshold lowered without it, brings back the white-out facing a low sun. The image-based light is rendered with the shoulder, the horizon band, the floor and the massif off; the orthographic strategy view has the band, the floor and the massif off (uDome 0) but keeps the shoulder, so the dome behind the whole map no longer blooms over it. tests/render-sky.test.ts holds these.`
  `Ambient occlusion fades out between 1.2 and 2.4 km in perspective views (post.ts): the depth buffer steps by metres out there and the pass drew bars on anything far. To switch a post pass off in a harness, force it (the scene sets gtao.enabled every frame).`
  `Fog colour, the dome's lowest band and the overcast dome come from horizonColor() in sky.ts: change the haze there and the sky follows.`
  `For pixel comparisons seed Math.random in the page: the lightning flash light and three's occlusion noise draw from it (scripts/shot-compare.mjs does).`

Rows for `docs/simulation.md` section 17: none. The stage adds no simulation parameter; its constants are render
stylizations in `sky.ts` and `post.ts`, each labelled there (`SKY_CEILING` 0.85 of the threshold, `SUN_DISC_CEILING`
40, `HORIZON_BAND_CLEAR` 0.06, `HORIZON_BAND_HAZE` 0.26, `OVERCAST_DOME` 0.5, `SKY_FLOOR_SUN` 0.08, `MOUNTAIN_TINT`,
`AO_FAR_START` 1200 m, `AO_FAR_END` 2400 m).

`HANDOFF.md`, `README.md`: nothing needed. `docs/research.md`: no source added (none cited).

Merge notes: the branch touches `src/render/env/{sky,post,shared,terrain}.ts`, `src/scene.ts` (two lines removed),
`scripts/shot-compare.mjs` and adds `tests/render-sky.test.ts`. A stage that edits the sky shader's injected block or `createPost` may conflict; W1,
W3, W4 and W5 should not. After the merge: `pnpm test`, `pnpm build`, one look at
`/src/render/env/harness.html?profile=field&seed=48&view=close&hour=18.35&advance=3` turned toward the sun, and one at
the whole map by day (`...harness.html?profile=field&seed=48&view=rts&hour=12.6&advance=3`), which now looks different.
