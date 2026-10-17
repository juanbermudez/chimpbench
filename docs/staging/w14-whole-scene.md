# Stage W14: the whole scene

Branch `w14-whole-scene`, cut from `track-e` at 20efbd6. The fixes began on 17 October 2026 at 15:31 EDT. Renderer and interface only: nothing under `src/sim`, `data/` or `tests/fixtures` changes, drawing writes nothing to the World, no `Math.random` is added to the renderer, and no render pass, render target or material is added. A default world keeps its hash.

Why this stage exists: on 12 October the user opened the app and saw every nesting chimp make the same movement at once. Five viewer stages had each passed their measured reviews, and none had looked at several animals at once at the moments a user sees. Stages W12 and W13 fixed the lockstep and the chorus. Nobody had since looked at the whole app at its defaults. A first pass on 17 October (the look) filmed 60 scenes of the unchanged build and ranked what a user meets. This document is the second pass: it fixes, in that order, what the renderer and the interface own.

Probes, films and pictures: `/Volumes/Drive/chimpbench/shots/watch-2026-10-17/w14-whole-scene/`. The look's probes (`film14.mjs`, `an14.mjs`, `tools/`) and its films (`films/`) are there. This pass's own probes and outputs are under `fix/`: `water14.mjs`, `cine14.mjs`, `storm14.mjs`, `open-an.mjs`, `spin-an.mjs`, `slide-an.mjs`, `drinks.mts`, `wake.mts`, `serve.sh`, `base-run.sh`, the unchanged build's measurements in `fix/base/`, and a copy of the unchanged source in `fix/base-src/` (a `git archive` of 20efbd6).

## 0. Registration (committed before any changed code ran)

Sections 0.1 to 0.4 were written and committed after the measurements on the unchanged build and before any changed code ran (3df3737). Sections 0.5 and 0.6 are addenda, each committed before the run it names (0403b43, 47df86f). Everything after section 0 was written afterwards. (This sentence said "0.1 to 0.5" in the first commit, before there was a 0.5; corrected here.)

### 0.1 How it is looked at and measured

- One no-model probe server at a time (`fix/serve.sh`, port 5244, `scripts/vite.probe.config.mjs`, `MGOGO_NO_MODEL=1`), one headless Chrome at 1440 x 900, the app opened with `provider=server`, the model policy switched off before the first frame and saving off (`persist=0`), as the look did (`lib14.mjs`). No model process. Worlds: seed 48 and seed 7, on the field map (the app's default) and the 160 m map.
- The look's films are the unchanged build's record for the scenes this pass re-films with the same probe and the same specs (`films/*.json`). This pass re-ran the scenes it needed new readings of on the unchanged build (`fix/base/`, 17 October 15:43 to 15:50).
- At most three runs of changed code. A run is one pass of the measurements below on a changed build. Every run is reported, whichever way it reads.

### 0.2 What a person sees on the unchanged build, and the measures

The look's ranked list, in its order, with the owner of each item and this pass's measure of it on the unchanged build.

**1. At 1 min/s the close camera loses the animal it follows (renderer).** A field-map walker is drawn at about 21 m/s at 1 min/s, and the close camera's tracking spring is capped at 12 m/s (`render/env/camera.ts` `FOLLOW_MAX_SPEED`). It falls behind until it is 22 m off, then cuts (`FOLLOW_CUT_DISTANCE`). Films (an14's camera reading, `tools/inview.mjs`):
- `T2` (seed 48, the party travelling at 1 min/s, close view): 12 camera moves of 21.5 to 22.2 m in one frame in 25 s, one every 2.1 s; the followed alpha off screen 1.6 s.
- `O1` (seed 48, the opening as a user gets it): 12 moves of 22 to 26 m in 45 s; the alpha off screen 5.1 s.
- `O3` (seed 7, the opening): 11 moves of 22 to 23 m in 45 s; the alpha off screen 15.7 s, in eleven runs of 0.5 to 2 s.
- `N2` (seed 48, dusk at 1 min/s): 3 moves of 22 m.
- `T1` (the same travel at Watch 4x): no camera jump; camera 8.7 to 9.8 m from the alpha (median 8.8).

**2. The opening never shows the party rising from its nests (interface; the renderer draws a trunk descent above 2 min/s in a few frames by design).** The dawn fast-forward at 10 min/s ends only once the selected animal's simulated act is no longer `nest` (`src/ui/app.ts`), checked four times a second, while the simulation runs two ticks ahead of the drawn bodies. Headless (`fix/wake.mts`, policy off): on seed 48 the alpha's party of ten leaves its nests between ticks 80 and 99 (06:50 to 06:55), the alpha among the last; at 10 min/s those 19 ticks pass in under half a second. Films (`fix/open-an.mjs`): in `O1` all eight animals of the group that start in a tree are drawn starting down at 596 to 616 s/s, reach the ground in 6 to 14 frames, and move 6.9 to 16.5 m in a single frame on the way; in `O3` the first riser (a female 21 m up, within 30 m of the alpha) comes down at 590 s/s with 9 m in one frame, and the fast-forward had ended at 2.6 s because the alpha's act changed while he was still drawn in his nest (he starts down 1.1 s later, at 1 min/s). The fast-forward lasted 2.8 s (`O1`) and 2.6 s (`O3`).

**3. On the field map animals drink on dry ground (renderer).** The field map's simulation places pools in each range (`src/sim/generation.ts`: `waterSitesPerKm2`, "pools and tree holes scattered through each range"), 75 of its 81 water sites. The renderer draws only the stream (`render/env/water.ts`). Headless (`fix/drinks.mts`, first day): seed 48, 56 of 77 drinking bouts are at a pool; seed 7, 40 of 59. In the app (`fix/water14.mjs`; the drinker followed at Real time a few ticks after it reached its site): at all 10 sampled pool bouts (6 on seed 48, 4 on seed 7) no water is drawn within 43 m of the drinker's mouth (at 4 of them none in the whole window); at the 3 sampled stream-bank bouts the mouth is over drawn water (0 m). A drinker crouches with its lips to a trail (`fix/base/water-48-585-36.jpg`).

**4. The cinematic view on the field map films something else than its caption names (renderer and interface).** The director picks its subject from the world's episodes anywhere, discounting only those beyond about 250 m of its last subject (`camera.ts` `pickShot`, `nearby`), and falls back to "the most active-looking individual" of the whole map; the caption describes the selected animal (`app.ts` `updateCaption`). `fix/cine14.mjs`: `C3` (seed 48, Rukaso feeding in a crown, Watch 4x, 40 s): the camera 424 m from Rukaso (median), the caption "Rukaso · foraging" throughout, Rukaso on screen in no frame. `CI2` (seed 7, the same id): camera median 10.5 m, but the named animal on screen in 50% of frames. On the 160 m map (`CI1c`, seed 48, Mbelo selected at tick 1432): the caption names Mbelo throughout, the camera films other episodes 43 m from him (median), and he is on screen in 17% of frames.

**5. Starting the Storm experiment takes the watched animal away (interface).** With the model off, `fire()` (`app.ts`) selects the adult of the community nearest the stimulus, which for a habitat-wide experiment is an arbitrary animal, and focuses the camera on it. `fix/storm14.mjs` `ST1` (seed 48, Sanaki selected in the close view, Watch 4x): the selection changes to Rukaso in the first frame after the click and stays there; the camera ends 723 m from Sanaki; the Mind tab opens on Rukaso.

**6. On the 160 m map at Watch 4x and Real time, animals that move are drawn standing and glide (renderer).** The moving test reads the drawn speed against a threshold tuned for 1 min/s (`creatures.ts` `MOVE_ENTER` 0.3 body lengths a second); the field map reads it at its reference rate whatever the speed (stage W1), the 160 m map does not (`pace.ts` `smallMapPace`). At Watch 4x a walk there is drawn at 0.16 m/s, 0.11 body lengths a second. `fix/slide-an.mjs` on the look's twelve 160 m map films at Watch 4x (`RG1`, `GR1`, `GR3`, `CI1`, `CG1`, `CG2`, `DR2`, `GF1`, `GF2`, `CH2`, `DP2`, `PL4`): 94 glides (runs of at least 0.3 s on the ground faster than 0.1 m/s in a clip that does not walk), 511 s in all, 55 of them in the standing clip; 15 runs faster than 0.25 m/s. On the field map (`T1`, `R2`, `TR4`) none.

**7. Bodies in a crown whip round (renderer).** A body that starts to clamber takes its line of travel as its heading target, up to half a turn away, and is turned toward it by an exponential damper at rate 8 (`creatures.ts`, the clamber block of the crown placement); a seated body is turned to its seat facing at rate 3 per 1/30 s, the trunk approach at rate 8. Only an animal in its nest has a limit (stage W13, `slewHeading`). `fix/spin-an.mjs` on ten of the look's films (`DP1`, `G1`, `CL1`, `C1b`, `C4`, `NB2`, `DP2`, `CF1`, `P1b`, `SP3`; frames above 130 s/s left out): in a tree, 111 turns faster than 3.5 rad/s over a quarter second and 68 faster than 6, the fastest 16.1 rad/s (a clamber at the start of a display); on the ground 8 and 3.

**8 to 12 (renderer), not measured yet:** a forearm, hand or toe jumps 0.5 to 1.2 m in one frame where a climb begins or ends; the selected animal's hidden parts read as a solid orange slab in the close view; play in crowns (wrestlers' hands jump, an infant put down by its mother jumps 2.8 m, a laugh ring every 1.8 s); fruit clusters bigger than a head; the panel's portrait often shows hands.

**13 (simulation): ground foragers on the 160 m map step on a 4-second beat** (`OV1`): reported, not changed here. **14 (renderer): long stillness** (an animal holding completely still for 4 to 8 s, an infant following its resting mother for 50 s): not taken on in this stage.

### 0.3 What will count as fixed

Read on the changed build with the same probes, worlds, ticks and specs.

1. **The camera keeps up at 1 min/s.** In `T2`, `O1` and `O3` no camera move of more than 3 m in one frame (before 12, 12 and 11 moves of about 22 m) and in `N2` none (before 3); the followed animal off screen for less than 2% of each film (before 1.6, 5.1 and 15.7 s). At Watch 4x (`T1`) still no jump, and the camera's distance to the alpha has a median within 15% of 8.8 m. A test holds that a subject walking at 21 m/s is followed without a cut and that the camera stops within 1 m past where the walker stops.
2. **The party rises at the default speed.** In `O1` and `O3`, every animal of the selected one's party, and every other animal within 40 m of it, that begins the film in a tree starts down at 1 min/s or slower (the achieved rate in the frame its body starts down at most 75 s/s; before, all eight in `O1` at 596 to 616 s/s and one in `O3` at 590), and none of those bodies moves more than 1.2 m in one frame on its way down (before 6.9 to 16.5 m). The dawn still plays fast: at least 1.5 s at 10 min/s in both films. The 160 m map's opening (to 07:15, in the overview) is unchanged. A test holds the rule that ends the fast-forward.
3. **Water where an animal drinks.** At every bout `water14.mjs` samples on the two worlds (10 at pools, 3 on the stream bank), drawn water lies within 0.3 m of the drinker's mouth and the drinker is drawn at its edge facing the water. Nothing grows or stands inside a pool in those shots. On the 160 m map nothing changes (its water sites are all on the stream bank; its water mesh has the same vertices). A test holds that a pool is drawn at a site off the stream and not at one on its bank.
4. **The cinematic view films what its caption names.** On the field map (`C3`, `CI2`) the animal the caption names first is on screen and within 40 m of the camera in at least 80% of the frames (before 0% and 50%), and the camera stays within 90 m of the selected animal in every frame (before a median of 424 m in `C3`). On the 160 m map (`CI1c`) the same 80% holds (before 17%); there the director still films episodes anywhere on the map.
5. **An experiment keeps the watched animal.** In `ST1` the selected animal stays selected in every frame after Storm starts (before: changed in all 480), the camera stays within 25 m of it (before: ended 723 m away), and the Mind tab opens on it. A test holds the choice of animal: the selected animal when it is within the experiment's reach (a habitat-wide experiment reaches everyone), as before otherwise.
6. **Walkers walk on the 160 m map at every speed.** In the twelve films of item 6, no glide in the standing clip (before 55) and at most a quarter of the glides of before in all (before 94 runs, 511 s). The field map's films `T1`, `R2`, `TR4` stay at none. At 1 min/s and faster the 160 m map's moving test is what it was (a test).
7. **No spin in a crown.** In the ten films of item 7, no body in a tree turns faster than 6 rad/s over a quarter second (before 68) and at most 10 turn faster than 3.5 rad/s (before 111). On the ground no more than before (8 and 3). A test holds the turn limit.
8. **Nothing else moves.** `git diff --stat track-e` names only `src/render/`, `src/ui/`, `src/scene.ts`, `tests/render-*`, `tests/ui-*` and `docs/staging/`; `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` untouched and passing; `tsc --noEmit`, `gen-params --check`, the render and interface tests, the whole suite and `pnpm build` pass. No `Math.random` added under `src/render`. No page errors in any film.

Items 8 to 12 are taken on only if a run is left after these, and then only after an addendum to this section that registers what will count, committed before that run. Item 13 is the simulation's and is reported in section 6.

### 0.4 The planned changes, and what each rests on

- 1: the close camera's tracking spring carries the velocity of its goal forward and caps only its own correction, so it travels with a subject drawn faster than the cap; the lead ahead of a moving subject is capped to a share of the frame. The chase used by the glide (`follow.ts`) already feeds the animal's velocity forward for this reason. Camera feel: a design assumption.
- 2: the fast-forward ends in the frame the first animal of the selected one's party, or within 40 m of it, that was in its nest at the start leaves its `nest` act in the simulation: the simulation leads the drawn bodies by two ticks, so the drop to 1 min/s comes before any body moves. A drawing rule.
- 3: the field map's terrain hollows a small pool at each water site off the stream, inside the forest window, with a wet rim; the water mesh draws its surface (one more piece of the same mesh, same material); a drinker there is placed at its rim facing in. The pools' size and depth are a stylization; that the site holds water is the simulation's.
- 4: on the field map the director takes its subjects from the selected animal and the episodes within 60 m of it; the caption names what the shot shows (the scene tells the interface its subject). Stylization.
- 5: an experiment keeps the selected animal when the experiment reaches it. Interface rule.
- 6: the moving test on the 160 m map reads the walk at the reference rate when the playback is slower, as the field map does since stage W1. Unchanged at 1 min/s and faster. Stylization (W1's).
- 7: a body in a crown turns no faster than a limit, as an animal in its nest does since stage W13; a drawing rule.

### 0.5 Addendum before run 2 (17 October 2026, written after run 1 and before any run-2 code ran)

Item 9 is taken on in run 2: **the selected animal's hidden parts read as a solid orange plank or slab in the close and cinematic views** (renderer). Cause: the see-through fill of the selected animal (`creatures.ts`, `xrayFill`, `material.ts` `createSilhouetteMaterial`) is meant to be faint in those views (14% of the community colour), but it is blended once for every part of the hidden body that covers a pixel, and three or four overlapping parts (an arm over the chest, a leg over the belly) pile up into a solid colour. Planned change: in those views the fill is blended by maximum (the faint colour over whatever is behind it, the same however many parts overlap); the strategy view keeps its fill. What will count as fixed: in the page shots of films `G1`, `I1` and `ST2` re-filmed with the same specs, at the moments the look cropped (`crops/G1-center.png`, `crops/I1-p03.png`, `crops/ST2-ilobe.png`), the hidden part reads as a faint tint inside the gold outline, not as a solid plank or slab (by eye, crops side by side); a test holds the blend state; the strategy view's silhouettes are unchanged (a page shot of `T3`, the party in the overview, side by side with the look's).

Corrections to items already registered, found in run 1 and changed for run 2 (the statements of section 0.3 are unchanged): the close camera also carries its goal's vertical velocity (in `O1` and `O3` the alpha left the frame below for 1.5 s while climbing down at 1 min/s); the cinematic director always sets a shot (from a starting score of −1, a moment when every candidate was rejected set none, and on the 160 m map the camera stood still for 33 s); the drinker's waterline place is looked up at all (its cache started at NaN, so it never was, on the stream bank either); a pool's water is a round disc with a soft edge over a hollow wider than it, with a narrow muddy rim (run 1's pool was outlined by the 1 m height grid's polygon, with a light foam ring and a dark apron 7 m across).

### 0.6 Addendum before run 3 (17 October 2026, written after run 2's first part and before any run-3 code ran)

No statement of sections 0.3 and 0.5 changes. Corrections found in run 2, changed for run 3:
- **Item 3.** No drinker was placed at the water in run 2 either: a lookup of the waterline that found none was kept for as long as the body stayed put, and a probe that jumps the clock reaches the drinker before the forest window around it is built (a user following an animal to water does not; its lookup runs on the way). A failed lookup is no longer kept. And the pool read as a black disc: its bed was the stream bank's black mud; the bed under the water is now bare soil, as the stream's is silt, with the mud as a ring round the edge.
- **Item 4.** On the 160 m map the director framed an episode on the middle of all its participants: a display aimed at a rival 90 m away put the camera over the empty ground between them, looking down (run 2's always-a-shot correction made it visible). An episode is now framed on its actor and the participants within 12 m of it.
- **Item 9.** Blended by maximum, the faint fill was still a flat brown block over the mother's dark back in `I1` (`fix/pictures/xray-I1-p03-crop.jpg`, left the unchanged build, right run 2). In the close and cinematic views the selected animal's hidden parts are now drawn by the gold outline alone, as the code's own comment describes them; the strategy view keeps its fill. The maximum blend of run 2 is taken out again.

Before run 3, one development look (not a run of the measurements, and reported as such in section 4): one pool and the infant of `I1`, a page screenshot each, to see the look before the run.

## 1. What a person sees now

Read from run 3's films and screenshots (build cac10d0), unless named otherwise.

**The opening.** The forest opens at dawn, close on the West alpha asleep in his nest, and fast-forwards at 10 min/s for about two seconds. As the first of his party stirs, it drops to 1 min/s: the party climbs down one by one over the next twenty seconds, each descent drawn over about a second, and the camera stays on the alpha down his trunk and along the trail. No body falls out of a tree in a frame.

**Following at 1 min/s.** The close camera travels with the walking party at the distance it was set to (T2: 10.0 to 10.6 m all the way), with no jumps; the followed animal never leaves the frame, also when it climbs down a trunk.

**Drinking on the field map.** Where the simulation puts a water site in the forest, there is now a pool: a round patch of dark water about three metres across in a shallow hollow, with a ring of wet mud round it. The drinker comes to its rim and leans in with its lips over the water. At the stream the drinker now leans over the water too (before, at the stream as at a pool, it crouched where the simulation put it: on the bank, its mouth over dry ground). The pool is as dark as the stream is in this light, and the mud ring is darker still: from above it reads as a dark ring round grey-brown water (`fix/pictures/3-pool-drinker.jpg`).

**The cinematic view on the field map** films the selected animal or an episode within 60 m of it, and the caption names what it films. In `C3` it frames a nursing pair in the fig crown where the selected male feeds, he in the shot as well (`fix/pictures/4-cinematic-C3.jpg`). On the 160 m map run 3 still filmed empty ground from overhead; the cause was found after the run and repaired in a commit no film has seen (section 4).

**Experiments.** Starting Storm while watching an animal keeps that animal selected and the camera on it; the Mind tab opens on it.

**On the 160 m map at Watch 4x** animals that move walk; the standing glide is gone but for two young followers sliding into place beside their mothers (section 6).

**In a crown** a body that sets off, sits down or turns to the bark turns at most half a turn a second; the whip rounds are gone.

**The selected animal behind a bough or another animal** is drawn by its gold outline alone in the close and cinematic views; the orange plank and the slab on a mother's back are gone (`fix/pictures/9b-seethrough-G1.jpg`, `9-seethrough-I1.jpg`). The strategy view's silhouettes are as before.

## 2. What was changed

Renderer and interface only (`git diff --stat 20efbd6`: 20 files, `src/render/`, `src/ui/`, `src/scene.ts`, `tests/render-*`, `tests/ui-*`, this document).

- `src/render/env/follow.ts` `trackStep` (new, pure): the close view's tracking spring after the glide. The point carries its goal's smoothed velocity (all three axes, rate 30 per second) and the spring with its 12 m/s cap acts only on the rest; a jump of more than 22 m still cuts. `camera.ts` `updateFollow` uses it, and caps the lead ahead of a moving subject at a tenth of the frame height.
- `src/ui/watch-rules.ts` (new, pure): `wakeWatch` and `partyWaking`, the field map's dawn fast-forward ending, read every frame from `app.ts` `tick`, as the first animal of the selected one's party or within 40 m of it that was asleep leaves its `nest` act; `experimentTarget`, used by `app.ts` `fire()`: the selected animal stays watched when the experiment reaches it.
- `src/render/env/camera.ts`: on the field map with an animal selected, the director takes episodes within 60 m of it (`CINE_NEAR_M`) and otherwise films it; an episode is framed on its actor and the participants within 12 m (`CINE_GROUP_M`, `camera-rules.ts` `groupFrame`, with its own scratch: subjectOf used to read positions into the vector it summed into); a shot is always set (the best candidate, then the overhead fallback, even when every candidate is rejected); the rig reports its subject (`shotSubject`), the scene passes it on (`scene.ts` `cineSubject()`), and `app.ts` `updateCaption` names it.
- `src/render/env/terrain.ts`, `water.ts`, `vegetation.ts`: pools. Each field-map water site off the stream (more than 3 m from its edge) inside a window's ground is levelled and hollowed (`POOL_*`), its water drawn as a 32-sided disc in the water mesh at its own surface (`aLevel`, a near-zero flow that the shader reads as still water and a soft round edge), with a mud ring and bare ground round it in the ground texture; shrubs, ferns and herbs are left out of it after their random draws, so the rest of each tile is placed as before. `waterEdge` finds a pool's rim and gives the way into the water.
- `src/render/creatures.ts` `drinkSpot`: the waterline place is looked up at all (its cache started at NaN and `NaN > 0.3` is false), a lookup that found no water is not kept, and a drinker whose path stands in a pool goes to the rim and faces in.
- `src/render/creatures/pace.ts` `movingK`, used by `creatures.ts`: the moving test and the heading read the path at the faster of the playback and the reference rate on every map, as the field map has since stage W1.
- `src/render/creatures/perch.ts` `crownTurn`, `CROWN_TURN_MAX` 3 rad/s, applied once at the end of the crown placement in `creatures.ts` (not on a frame drawn at once, not in a nest).
- `src/render/creatures.ts`: the close and cinematic views draw the selected animal's see-through outline without the fill.

Nothing allocates per frame (the director's group and the pools' lookups use fixed scratch). No render pass, target or material was added; the pools are vertices of the existing water mesh (33 per pool, about 0.3 pools per window).

## 3. Before and after

| Item | Unchanged build | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- | --- |
| 1. Camera jumps over 3 m in a frame, T2 / O1 / O3 / N2 | 12 / 12 / 11 / 3 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| 1. Alpha off screen, T2 / O1 / O3 | 1.6 / 5.1 / 15.7 s | 0 / 3.4 / 2.3 s | 0 / 0 / 0 s | 0 / 0 / 0 s |
| 1. Camera to alpha at Watch 4x (T1), median | 8.8 m (8.7 to 9.8) | 10.3 m | 10.3 m | 10.3 m (10.1 to 10.3) |
| 2. Rate when each party body starts down, O1 | 596 to 616 s/s (all eight) | 48 to 70 | 48 to 70 | 48 to 70 |
| 2. Largest body move in a frame on the way down, O1 / O3 | 16.5 / 9.0 m | 0.73 / 0.67 m | 0.73 / 0.67 m | as run 2 |
| 2. Dawn at 10 min/s, O1 / O3 | 2.8 / 2.6 s | 2.1 / 2.1 s | 2.0 / 2.1 s | as run 2 |
| 3. Pool bouts with water under the drinker's mouth | 0 of 10 | 10 of 10, drinker standing in the pool | 10 of 10, standing in it | 10 of 10, at the rim |
| 3. Drinker placed at the water's edge (pools and stream) | 0 of 13 | 0 of 13 | 0 of 13 | 13 of 13 |
| 4. Field map: named animal on screen and within 40 m, C3 / CI2 | 0 / 50% | 100 / 80.3% | 100 / 80.9% | 100 / 80.3% |
| 4. Field map: camera to selected animal, largest | 437 m (C3) | 39.6 m | 39.6 m | 39.6 m |
| 4. 160 m map: named animal on screen (CI1c) | 17% | 17% | 11% | 11% (fixed after the run, not filmed) |
| 5. Storm: selection changed / camera to the watched animal at the end | 480 of 480 frames / 723 m | 0 / 7.6 m | 0 / 7.6 m | 0 / 7.6 m |
| 6. Glides on the 160 m map at Watch 4x (12 films): runs, seconds, in the standing clip | 94, 511 s, 55 | 14, 17.2 s, 2 | 9, 11.6 s, 2 | not re-filmed |
| 7. Turns in a tree over 3.5 / over 6 rad/s (10 films) | 111 / 68, fastest 16.1 | 9 / 0 | 8 / 0 | not re-filmed |
| 7. Turns on the ground over 3.5 / over 6 rad/s | 8 / 3 | 8 / 4 | 8 / 4 | not re-filmed |
| 9. See-through slab (G1, I1, by eye) | orange plank, slab | unchanged | brown block on the back (max blend) | outline only |

Frame time in every film held at a median of 16.6 to 16.7 ms (p95 17 to 18.5 ms) with the creature update at 0.5 to 0.6 ms, as on the unchanged build. No film logged a page error.

## 4. The three runs, and what ran outside them

- **Run 1** (814c57c, 17 October 16:05 to 16:45): items 1 to 7 as first written. Found: the alpha left the frame below while climbing down at 1 min/s (the vertical spring carried nothing); the cinematic director set no shot for 33 s on the 160 m map; no drinker was ever placed at the water (a cache that started at NaN, from before this stage); a pool outlined by the 1 m grid's polygon with a foam ring and a mud apron 7 m across.
- **Run 2** (ff2066b, 16:46 to 17:31): those corrections and item 9 by a maximum blend. Found: drinkers still not placed (a failed lookup kept while the window was being built), pools black, the see-through block still there, and the 160 m map's director framing empty ground from overhead.
- **Development look** (between runs 2 and 3, registered in section 0.6): one pass of `water14.mjs` with three bouts on seed 48 against the run-3 build, to see a pool before the run. Nothing was changed after it.
- **Run 3** (cac10d0, 17:32 to 17:50): water, cinematic, storm, the four films of items 1 and 2, the see-through films (`G1`, `I1`, `ST2`, `T3`), `T1`, and the drinking films `DR2` and `D1b`. Items 6 and 7 were last measured in run 2; run 3's changes do not reach them (drink placement, the pool terrain, the see-through fill, the director).
- **After run 3** (4fa59b2, not filmed): a diagnosis on the run-3 build (`fix/diag-cine.mjs`, reads only) showed the 160 m map's director framing an episode of one animal at twice its coordinates: `subjectOf` read each participant's position into the vector it was summing into. Fixed with a pure helper and a test; no film has seen it.

## 5. The registered statements, one by one

1. **Camera.** No jump over 3 m in a frame: met in all three runs. Off screen under 2%: not met in run 1 (O1 7.5%, O3 5.1%), met in runs 2 and 3 (0%). T1's median distance within 15% of 8.8 m: **not met** (10.3 m, +17%). The probe set the orbit at 9.9 m in both builds; the old spring trailed the walkers by about a metre toward the camera, the new one holds the orbit (10.1 to 10.4 m, a narrower spread than 8.7 to 9.8). The statement was badly chosen; the reading is the fix working. Test: met.
2. **Opening.** Met in all three runs. The 160 m map's opening was not re-filmed; its rule is unchanged in the code (`w.size > 1000` gates the new one).
3. **Water.** Met in run 3 only: 13 of 13 sampled bouts with the mouth over drawn water, the ground under it 5 to 22 cm below the surface, the drinker at the rim or bank facing in. Nothing grew inside the pools in the shots looked at (four of ten). The 160 m map has no pool (a test; its water mesh is built by the unchanged path). Test: met.
4. **Cinematic.** Field map: met (100% and 80.3%, the camera at most 39.6 m from the selected animal). 160 m map: **not met** in any run (17%, 17%, 11%, 11%); the cause was found after run 3 and fixed in an unfilmed commit.
5. **Experiment.** Met in all three runs. Test: met.
6. **Glides.** No glide in the standing clip: **not met** (2 of 55 left, both young followers slid into place by the layout, a mechanism other than the moving test: section 6). At most a quarter of before: met (14 and 9 runs of 94). Field map controls at none: met. 1 min/s and faster unchanged: a test.
7. **Turns in a crown.** Met (none over 6 rad/s; 9 and 8 over 3.5). On the ground "no more than before": **not met by one** (four over 6 rad/s against three; walkers turning along their path on the ground, which this change does not touch, and on the 160 m map at Watch 4x, where walkers now turn along their path because they now walk). Test: met.
8. **Nothing else moves.** Met (section 7).
9. **See-through** (addendum 0.5). Not met in run 2 (a flat brown block), met in run 3 by eye (G1, I1), the strategy view unchanged (T3). No test holds it: the rule is one count in the layer, and the max-blend test of run 2 went with the max blend.

## 6. Not done, and what is left

Owned by the renderer or the interface, not taken on (the look's items 8, 10, 11, 12 and 14):
- **Limb jumps at the start and end of a climb** (item 8). In the look's 60 films, 1,568 single-frame steps of a joint over 30 cm; 1,103 of them inside the climb clip itself, 30 at a change from clamber to climb, mostly forearms (891) and shins (291). It needs the climb clip's holds and the blend out of it studied on their own.
- **Play in crowns** (item 10), **fruit clusters** (item 11), **the portrait showing hands** (item 12), **long stillness** (item 14).
- **The pool's look.** It reads as dark water in a ring of black mud; the stream reads as dark in the same light. The mud ring could be narrower and lighter.
- **The 160 m map's cinematic view** after 4fa59b2: not filmed.
- **Young followers sliding into place** (two glides on the 160 m map): a layout offset easing at 0.1 m/s, which stage W1 counts as drawn, not as walking. A follower in `follow` also has no idle movements (the look's item 14).
- **CI2 at 80.3%:** a groomer still walking 9 m to its partner is framed between them, off screen for 8 s.
- **The opening's first frame is black** (both maps), and on the 160 m map the dawn still plays at 10 min/s in the overview with bodies dropping in a few frames (by design there; not changed).
- **Turns on the ground** over 6 rad/s: four in ten films, walkers turning along their path.

For the simulation (reports, nothing changed):
- **Ground foragers on the 160 m map step on a fixed 4-second beat** (the look's `OV1`: three foragers, period 4.0 s each, a move every 16 ticks). Not re-examined here.
- **A grooming episode starts while the groomer is still 9 m away** (`CI2`, "Groom my mother Lwazo, 9 m away"), so a caption names a groomer who is not yet there.
- **Water sites**: the simulation places 75 of the field map's 81 sites in the forest, and about seven drinks in ten of a first day are drunk there (`fix/drinks.mts`). They are now drawn as pools; whether pools should be that common is the simulation's question.

## 7. Tests and checks

- New and changed tests: `tests/render-follow.test.ts` (a 21 m/s walker followed without a cut and stopped within a metre; a 20 m/s descent followed within 2.5 m; the old spring cuts), `tests/ui-watch-rules.test.ts` (the dawn ends at the first riser, before the alpha, on seed 48; experiments keep the selected animal in reach), `tests/render-water.test.ts` (a pool at an off-stream site of seed 48's field map, its hollow, rim and wading depth, its edge and the way in, its disc at its own level facing up; no pool at a bank site or on the 160 m map), `tests/render-pace.test.ts` (`movingK`), `tests/render-perch.test.ts` (`crownTurn`), `tests/render-camera.test.ts` (`groupFrame`). The new and changed test files type-check under the project's strict options.
- 17 October 2026, on 4fa59b2: `tsc --noEmit` passes; `gen-params --check`: valid, up to date, lint clean; render and interface tests 344 of 344; the whole suite once (1-minute load 2.7 before it, no other suite running): 1,556 tests, 1,555 pass, 1 skipped (the C7a validation fixture is not on this computer), none failed, 4 min 39 s; `pnpm build` passes.
- `tests/fixtures/golden-world.json`, `tests/sim-track-e.test.ts`, `src/sim` and `data/` untouched; no `Math.random` added under `src`.
- Not measured: frame time on the graphics card (no probe of it was run; the pools add vertices to an existing mesh and nothing else draws more); a live model; sound.

## 8. For the integrator

### Commits (on `w14-whole-scene`, from `track-e` at 20efbd6; not pushed, not merged)

3df3737 registration; f517a8c and 814c57c run 1; 0403b43 addendum; ff2066b run 2; 47df86f addendum; cac10d0 run 3; 4fa59b2 the director's group (after run 3, not filmed); and this document's last commit.

### Merge notes

Touches `src/render/creatures.ts`, `src/render/env/camera.ts`, `terrain.ts`, `water.ts`, `vegetation.ts`, `follow.ts`, `camera-rules.ts`, `src/render/creatures/pace.ts`, `perch.ts`, `src/scene.ts`, `src/ui/app.ts`, `src/ui/contracts.ts`, and adds `src/ui/watch-rules.ts`. If a model stage changes `app.ts` (the prologue, `fire()`) at the same time, the conflicts are in those two functions. The water material's program key moved to `mgogo-water-v3` (a new attribute). Before merging, film the 160 m map's cinematic view (`fix/cine14.mjs` with `CI1c`) once on the merged head: commit 4fa59b2 has not been seen in the app.

### Lines proposed for AGENTS.md (not edited on this branch)

- The close camera's tracking (stage W14, `render/env/follow.ts` `trackStep`): the point carries its goal's velocity on all three axes and the 12 m/s cap holds only the spring's own correction. Do not cap the whole speed again: at 1 min/s a field-map walker is drawn at about 21 m/s, and the camera fell 22 m behind and cut forward every two seconds. The lead ahead of a moving subject is at most a tenth of the frame.
- The field map's dawn fast-forward ends in the frame the first animal of the selected one's party, or within 40 m of it, that was asleep leaves its `nest` act (`ui/watch-rules.ts`, read every frame in `app.ts` `tick`): the simulation leads the drawn bodies by two ticks, so the drop to 1 min/s comes before any body moves. An experiment keeps the selected animal when it reaches it (`experimentTarget`).
- The cinematic director (stage W14): on the field map with an animal selected it films that animal and episodes within 60 m of it; an episode is framed on its actor and the participants within 12 m (`camera-rules.ts` `groupFrame`: never pass a caller's scratch vector as the result of a function that reads positions into scratch); a shot is always set; `scene.cineSubject()` says what it films and the caption names that.
- Pools (stage W14, `render/env/terrain.ts`): every field-map water site more than 3 m from the stream's edge is a pool, hollowed into the window's ground and drawn in the water mesh at its own level (`aLevel`; a near-zero `aFlow` marks a pool's still water and its soft round edge). Placement that must keep out of pools tests `terrain.poolDistance` after its random draws, so the rest of the tile is placed as before. `drinkSpot` keeps only a waterline lookup that found water.
- The moving test and the heading read the simulated path at the faster of the playback and the reference rate on every map (`pace.ts` `movingK`; the 160 m map's reference is 1 min/s, so at 1 min/s and faster nothing changes there).
- A body in a crown turns at most `CROWN_TURN_MAX` (3 rad/s, `perch.ts` `crownTurn`), applied once at the end of the crown placement; not on a frame drawn at once and not in a nest (which has its own lower limit).
- In the close and cinematic views the selected animal's hidden parts are drawn by the see-through outline alone: a fill, however faint, piles up where hidden parts overlap and reads as a solid plank or slab.

### Block proposed for IMPLEMENTATION_PLAN.md

```
## Stage W14: the whole scene (renderer and interface)
**Status:** branch `w14-whole-scene` from `track-e` at 20efbd6, 17 October 2026, not merged. Registration, three runs and results: `docs/staging/w14-whole-scene.md`. A look at the app as a user gets it (60 films, both maps, three speeds, three views) ranked what a user meets; this stage fixed, in that order, what the renderer and the interface own: the close camera at 1 min/s, the dawn opening, drinking at water that is not drawn, the cinematic view filming something else than its caption, an experiment taking the watched animal away, the standing glide on the 160 m map, the spin in crowns, and the solid see-through slab. No simulation, data or fixture changes; default world hashes unchanged.
**Verified:** run 3 (and run 2 for the glide and turn films): no camera jump in the four 1 min/s films and the followed animal always on screen (before: a 22 m jump every two seconds, off screen up to 16 s of 45); every party body starts down at 1 min/s (before 600 s/s, up to 16.5 m in a frame); 13 of 13 sampled drinkers at drawn water, at its edge (before 0 of 10 pools had water within 43 m); the field map's cinematic caption names an animal on screen in 80 to 100% of frames, the camera within 40 m of the selected animal (before 0%, 437 m); Storm keeps the watched animal (before: a switch to one 723 m away); glides on the 160 m map 94 to 9; turns over 6 rad/s in crowns 68 to 0. Tests, build and the whole suite (1,555 of 1,556, one fixture skip) pass.
**Open:** the 160 m map's cinematic view (fixed after the last run, not filmed); T1's camera distance moved 17% (the orbit is now held); two followers slide into place; four fast turns on the ground; pools read as dark water in a black mud ring; climb limb jumps, play in crowns, fruit clusters, the portrait, long stillness not taken on. For the simulation: the 160 m map's 4-second forager beat; grooming begun 9 m away.
```
