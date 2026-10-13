# Stage W12: out of step

Branch `w12-out-of-step`, cut from `track-e` at 4ecd1a3. Started 12 October 2026, 20:15 EDT. Renderer only: nothing under `src/sim`, `data/` or `tests/fixtures` changes, drawing writes nothing to the World, no `Math.random` is added, and no render pass, render target or material is added.

Where the stage comes from: the user, looking at the running app on 12 October 2026: "all the chimps nesting are moving in sync doing the same exact movement..... that looks so ridiculous".

Scripts, pictures and readouts of this stage: `/Volumes/Drive/chimpbench/shots/watch-2026-10-12/w12-out-of-step/` (`before/`, `after/`; `serve.sh`, `w12lib.mjs`, `film.mjs`, `an.mjs`, `an-sleep.mjs`, `explore.mjs`, `scan2.mjs`, `hprobe.mjs`, `audit.mts`, `settle.mts`).

## 0. Registration (committed before any changed code ran)

Sections 0.1 to 0.5 were written and committed after the measurements on the unchanged build and before any changed code was run. Everything after section 0 was written afterwards.

### 0.1 How "in step" is measured

- **The world.** The field map, seed 48, opened in the app from a no-model server on port 5197 with the model policy off from the first frame (`w12lib.mjs`, the earlier stages' way), so every load holds the same rules-driven world. The world's hash at each starting tick is in each film's JSON file.
- **A film** (`film.mjs`): the close view on one animal, Real time, every animation frame read in the page for 20 s (70 s at the opening): for each animal within 40 m, the clip it is drawn in, the height of each wrist in its own body, the turn of the chest, the heading, the lids, the nest's progress, and what the simulation says of it (its act, whether it has a finished nest, the seconds in the act).
- **In step, for a pair of animals drawn in the same clip** (`an.mjs`): the correlation over the film of the wrist's height, left with left and right with right (*wrist r*: 1 is the same movement at the same instant); the share of frames in which both reach with the same arm, of the frames in which both reach (*same arm*); and the correlation of the higher wrist's height at the best time shift within 3 s (*rhythm r*: 1 is the same movement started apart, which still looks mechanical).
- **The audit of the clips** (`audit.mts`, no browser): every clip of `src/render/creatures/poses.ts`, in every variant, evaluated for eight animals (four pairs for the paired clips) that enter it in the same frame, each with the pose context `src/render/creatures.ts` gives it, for 30 s and for 120 s at 30 frames a second. Per pair: *r0*, the correlation of the two animals' movement at the same instant (every channel of the pose with its own mean removed, pooled over channels and frames; the larger of the plain and the left-right mirrored comparison, since two animals doing the same thing with opposite arms are in step to the eye), and *rBest*, the same at the best shift within 6 s. A clip whose largest movement is under 0.02 rad is "still".
- **The harness** (`hprobe.mjs`, `/src/render/creatures/harness.html`): ten animals of the `stages` row started in the same frame. `clips`: every stationary clip forced on all ten in the same frame, 12 s each, the pose the layer draws (after idle life, breathing, the look and the blends) compared as in the audit, from 2 s after the change. `life`: the ten at rest for 120 s: when idle events, blinks and changes of gaze start, and the breathing. `pairs`: four grooming pairs and four playing pairs started in the same frame, 40 s.
- **Idle events after a common release** (`settle.mts`, no browser): twelve animals whose idle schedule is held (a walk, a call listened to, a time-lapse) and released in the same frame: when each starts its first event.
- At most three runs of changed code against the statements of section 0.5. A run is one pass of the tests and of these measurements on a changed build. Every run is reported, whichever way it reads.
- One slip to report: at 21:08 two of this stage's own probe browsers ran at once for under a minute (film `G` was started a second time while its first run was still going). No model process was running. The film was taken again alone; that take is the one read below.

### 0.2 Measured on the unchanged build (4ecd1a3; 12 October 2026, 20:40 to 21:10 EDT)

**The opening of a new world (film `A-open-rt`, tick 0, 06:30, Real time from the first second).** All 41 animals that are not carried are drawn in the building clip (`nestBuild`); the simulation has every one of them in a finished nest (`Chimp.nest` set, its reason line reads "Sleeping in my night nest"). Of the 9 within 40 m of the camera's animal (36 pairs), over 20 s: wrist r median 0.984 (lowest 0.945, highest 1.000), same arm 98.9% of the frames (lowest pair 93.7%), rhythm r 0.976. Their clip clocks are 0.01 to 0.17 s apart. All 9 turn 1.9 rad the same way between 56.9 and 57.2 s into the film (the simulation's fourth tick). The pictures show two neighbours raising the same arm together (`before/A-open-rt.png`).

**Dusk, the first evening (animals 1 and 4, who build 1 m apart at 18:36; two sleepers, 8 and 19, beside them).**

| Film | How the moment was reached | Clip clocks apart | Wrist r | Same arm | Rhythm r (shift) |
| --- | --- | --- | --- | --- | --- |
| `C-jump-dusk` | the clock jumped to tick 2904 | 0.06 s | 0.994 | 100% | 1.000 (0.06 s) |
| `E-lapse-dusk` | played at 10 min/s from tick 2780, stopped at 2904 | 0.95 s | 0.05 | 58% | 0.998 (0.94 s) |
| `B-dusk-watched` | watched at Watch 4x from tick 2894, Real time from 2904 | 10.0 s | -0.16 | 49.5% | 0.997 (1.1 s) |

So after a jump the two builders are in step; watched all the way, or after a time-lapse, they make the same movement a second apart. In `B` and `E` builder 4 makes its 1.9 rad turn in the film; in `A` all nine make theirs within a third of a second.

**Night and the next dawn (the clock jumped to 23:30, film `D-jump-night`, and to 06:19 of day 2, `F-jump-dawn2`).** The four animals at that site are drawn asleep in both (the sleep clip, lids shut), none building. They breathe at 0.25, 0.30, 0.35 and 0.30 breaths a second; over the six pairs the breath's correlation has a median of 0.05 (one pair of equal rate reaches 0.95 over the 20 s). Sleepers are not in step.

**So the dawn fault is at a world's opening** (and wherever the simulation starts a nest act's clock with the nest already finished): `chooseClip` draws the building clip while fewer than 240 s have passed in the act, and reads the simulation's `actionTime` when it did not see the act begin. A new world starts with every animal in a finished nest and `actionTime` 0. After a jump into the night or to a later dawn `actionTime` is hours, and the animals sleep. (The simulation also resets that clock when it puts an animal back into the nest it tried to leave, `src/sim/execution.ts` "Stayed in its nest: nobody came along"; that did not happen in the first 1,300 ticks of this world, `scan2.mjs`.) The nest under a sleeper first seen in a finished nest is drawn at a quarter of its size and grows for six simulated minutes (`nests.ts`: "grows in by the clock").

**The audit of the clips (`before/audit-clips.json`, 30 s, and `before/audit-clips-120s.json`; every variant's figures are in `before/audit-table.md`, the readings in section 0.3).** For animals that enter in the same frame, r0: `nestBuild` 1.00; solo `play` 1.00 for animals in the same variant (infants all take one: 1.00); `wrestle` 1.00 (the one on top: the four animals' poses identical in every frame) and 1.00; `display` 1.00; `charge` 1.00; `pantGrunt` 1.00 (identical); `drum` 1.00; `mate` 1.00 (identical); `defend` 0.96; `tickle` 0.92; `drink` with the lips: identical. On one rhythm with only a start of their own (rBest over 120 s): ground `forage` 0.99, `share` 0.96, `alarm` 0.99, `listen` (sniffing) 0.97, `attack` 0.94, `pantHoot` 0.98, the infant's head on its mother's back 1.00, a sleeper's chest 1.00.

**The harness (`before/h-life.json`, `h-pairs.json`, `h-clips.json`).**
- Ten animals at rest for 120 s: 78 idle events, 10 of them within 0.25 s of another animal's start of the same kind; first events between 1.6 and 20.6 s; 230 blinks, 72 within 0.1 s of another's (chance for ten animals blinking every six seconds or so is about 30%); 319 changes of gaze, 122 within 0.1 s of another's (chance about 45%); breathing 0.25 to 0.33 a second, pair correlation median 0.004. Idle life, blinks, gaze and breathing are each animal's own.
- Four grooming pairs started together: the groomers' drawn poses correlate 0.73 at the same instant (the lip-smack, which runs on the clip's own clock, is the largest movement in the pose); the four receivers 0.00. Four playing pairs: 0.0 at the same instant, 0.97 and 1.00 at the best shift (every pair on one beat, roles swapped every 3 s for all).
- Forced clips, ten animals, the pose as drawn (role 0, no partner), r0 at the same instant: `nestBuild` 1.00, `groom` 0.99, `display` 0.99, `wrestle` 0.96, `drum` 0.96, `defend` 0.95, `carryDorsal` 0.94, `share` 0.92, `pantGrunt` 0.88, `charge` 0.69; on one loop (rBest): `forage` 0.99, `alarm` 0.99, `pantHoot` 0.97. `stand`, `sitIdle`, `rest`, `perch`, `guard`: 0.01 to 0.09 (idle life and the look are each animal's own).

**Idle events after a common release (`before/settle.log`).** Twelve animals held for 45 s and released in the same frame: 12 of 12 start their first idle event exactly 3.00 s later (kinds differ). Held for 2.4 s after 20 s of idling (a call listened to): 7 of 12 at exactly 3.00 s. Cause: while nothing may start, `idleStep` keeps the next start at "now + 3 s" for every animal whose turn is due.

**The seconds after a time-lapse stops, by day (film `G-lapse-midday`, 11:50; animal 17 resting under three animals feeding in the crown above; the film starts in the frame the speed goes from 10 min/s to Real time; `an-idle.mjs`).** Three of the four start an idle event 2.86, 2.86 and 3.01 s after the change of speed: a weight shift, a glance and a scratch, together. The fourth starts its first at 13.8 s.

### 0.3 The audit: every clip and every other per-frame movement

Clock: **clip** = seconds since the clip started (`PoseCtx.t`; nothing of the animal in it); **shared+offset** = the layer's animation clock plus the animal's own offset (`PoseCtx.time`); **pair** = the shared clock plus the pair's offset (`PoseCtx.pairT`); **stride** = the gait phase, which starts at the animal's own value and advances by its own distance over its own stride; **own schedule** = hash-scheduled per animal. r0 and rBest: medians over pairs, 30 s, animals entered in the same frame (section 0.1). "Plan" is what this stage will do.

| Clip (variant) | Clock | r0 | rBest | Reading | Plan |
| --- | --- | --- | --- | --- | --- |
| `nestBuild` | clip | 1.00 | 1.00 | in step: same cycle, same arm | own bar length, own start, arms and pauses drawn per bar |
| `play` (solo; infants) | clip | 1.00 | 1.00 | in step within a variant | own tempo and start, bursts of its own |
| `wrestle`, `tickle` | clip (restarted at each swap of roles; swaps every 3 s for every pair, pair offset) | 1.00, 0.92 | 1.00, 0.99 | partners together (meant); two pairs in step | the pair's own tempo and swap period |
| `display` | clip | 1.00 | 1.00 | in step | own tempo and start |
| `charge` | clip | 1.00 | 1.00 | in step (hands slapping the ground) | own tempo and start |
| `pantGrunt` | clip | 1.00 | 1.00 | in step | own tempo and start |
| `drum` | clip | 1.00 | 1.00 | in step | own tempo and start |
| `mate` (male) | clip | 1.00 | 1.00 | in step (2 cm of movement) | the pair's own tempo |
| `attack`, `defend` | pair (blows and flinches), clip (the rest) | 0.65, 0.96 | 0.94, 0.96 | attacker and victim together (meant); two fights on one beat | the pair's own tempo; own tempo for the rest |
| `forage` (ground) | clip + own start | 0.07 | 0.99 | same loop of 3.3 s for all | own bar length, pauses per bar, now and then the other hand |
| `forage` (crown) | shared+offset, cycle 11 to 14 s by animal | 0.34 | 0.84 (0.38 over 120 s) | own rhythm (stage W9) | chewing rate by animal; the rest left |
| `drink` | clip (+ own start for the leaf sponge) | identical for the animals that drink with the lips | 1.00 | lips in step; the sponge on one loop of 2.9 s | own tempo and start |
| `share` | clip + own start | 0.59 | 0.96 | same loop | own tempo |
| `groom` | pair (site every 9 s, strokes 1.5 a second), clip (lip-smack) | 0.56 to 0.87 | 0.78 to 0.93 | groomer and receiver together (meant); lip-smack in step across pairs, strokes on one beat | lip-smack, stroke rate and time at a site by groomer |
| `groomee` | shared+offset, pair | -0.14 to 0.39 | 0.53 to 1.00 | own (slow leans of 20 to 60 s by animal; a prone receiver's head on one slow tempo) | the prone head's tempo by animal; the rest left |
| `pantHoot` | clip + own start (0 to 3 s) of a 9 s cycle | 0.02 | 0.98 | a chorus: callers that start together climax within 3 s of each other | **left: they call together** |
| `alarm` | clip + own start | 0.00 | 0.99 | arm raised on one beat | own tempo |
| `listen` (sniffing) | clip + own start | 0.73 | 0.97 | sniffing bursts on one beat | own tempo |
| `listen` (others), `patrol`, `hunt`, `guard` | own schedule (patrol.ts), shared+offset | 0.09 to 0.35 | 0.61 to 1.00 | held still; the head's drift only | head drift by animal |
| `stand`, `sitIdle`, `rest`, `perch`, `clingTrunk`, `portrait`, `nurse`, `shelter`, `embrace`, `beg`, `sleep` | shared+offset | -0.27 to 0.35 | 0.02 to 1.00 | still poses carrying sines of one tempo (breathing in the clip 0.012 rad, head drift 0.03 rad, ear flick every 9 s, a sleeper's chest 0.02 rad, shivering) | each sine's tempo by animal |
| `carryDorsal` | shared+offset | 0.82 | 1.00 | every riding infant turns its head on an 18 s cycle | tempo by animal |
| `carryVentral`, `deadCarried`, `dead`, `submit`, `cower`, `mate` (female) | none | - | - | still | none |
| `walk`, `gallop`, `sneak`, `swagger`, `bipedWalk`, `climb`, `clamber` | stride | 0.21 to 0.57 | 0.91 to 1.00 | two animals of one size at one speed keep one cadence, each at its own phase and footfall order | **left: the feet are tied to the ground covered** |

| Other per-frame movement | Where | Clock | Two animals started together | Plan |
| --- | --- | --- | --- | --- |
| Building or asleep in the nest | `creatures.ts` `chooseClip` | 240 s from the drawn arrival, or the simulation's `actionTime` | every animal of a new world builds for four minutes in a finished nest | read the simulation's finished nest (`Chimp.nest`) |
| The builder's five headings | `perch.ts` `nestTurn` | the nest's progress | all turn in the same frame by the same 1.9 rad | own moments, sizes and direction |
| The nest that grows | `nests.ts` | the progress; six minutes by the clock for a nest first seen finished | a sleeper's nest is drawn at a quarter size at the opening | a nest the simulation has finished is drawn finished |
| Idle events (scratch, yawn, weight shift, glance, nod) | `secondary.ts` `idleStep` | own schedule | own; but released together, all start 3.00 s later | the wait after a release by animal |
| Breathing | `creatures.ts` `stepIdle` | own rate and phase | own (median r 0.004) | none |
| Blinks | `secondary.ts` `blinkAt` | own schedule | own | none |
| Gaze | `secondary.ts` `selectAttention`, `creatures.ts` `updateAttention` | own holds of 1.5 to 6 s | own; all heads turn to a call that reaches them, and a patrol looks where it is led | **left: they react to one event** |
| Decision beat, the order a party sets off in | `beat.ts` | the act's start, by animal | staggered on purpose (stage W6) | none |
| Resting posture in a crown, the receiver's posture, a patrol's listening variants and looks | `perch.ts`, `creatures.ts`, `patrol.ts` | own periods | own | none |
| A mother and the infant she carries | `placeCarried` | the infant is placed on her skeleton | together | **left: one body on another** |
| The face of a call (`vocalOverlay`) | `poses.ts` | shared + own offset, one tempo per call kind | same beat, own phase | tempo by animal |
| Breathing after exertion | `creatures.ts` | shared + own offset, tempo by exertion | own once exertion differs | none |
| Role swap of a playing pair | `creatures.ts` `pairingFor` | shared + pair offset, 3 s for all | every pair swaps every 3 s | period by pair |
| The ring on the water under a drinker | `creatures.ts` `drinkSpot` | shared + the animal's id, a whole number | every drinker's ring in the same frame | own offset and rate |
| The tail of a transition | `secondary.ts` | starts when the clip changes | the same blend when two clips change together | follows from the clips; none |
| Colobus (tail sway, breathing) | `prey.ts` | shared + own offset | one tempo, own phase | **left** (not the report; noted in section "not done") |

### 0.4 Causes, as found

1. **A clip's cycle on the clip's own clock.** `PoseCtx.t` is set to 0 when an animal's clip changes and advanced each frame (`creatures.ts`: `a.clipT`). `nestBuild` takes its cycle and its arm from it alone, so animals that enter the clip in the same frame are in step for as long as they stay in it. The same holds for the other clips of the first block of the table. The integrator's finding stands.
2. **A whole community enters `nestBuild` in the same frame when a world opens**, because the renderer takes "fewer than 240 s in the nest act" for "building" and a new world has every animal in a finished nest with that clock at 0. It never asks the simulation whether the nest is finished, though the simulation says so (`Chimp.nest` is published when the building ends). The same after a jump of the clock that lands among builders (their clips start in one frame).
3. **The builder's turns and the end of the building are on the nest's progress**, which is the same clock for everyone who began together.
4. **One tempo for all** in the clips that do carry the animal's offset: started apart, they still make the same movement a moment later (ground feeding, the two builders watched at dusk).
5. **The idle schedule's wait after a release** is the same 3 s for every animal, so whatever holds a party's idle life at once (a time-lapse, a call they all listen to, a walk they end together) lets it go at once.

### 0.5 What will count as fixed

Read on the changed build with the same scripts, the same world and the same ticks.

1. **The opening.** In film `A-open-rt` no animal that the simulation has in a finished nest is drawn in the building clip (before: 9 of 9 near the camera, 41 of 41 in the world). They are drawn in the sleep clip with the lids shut until their act changes, they do not turn, and the nest under each is drawn at its full size from the first frame.
2. **Builders.** In `C-jump-dusk` the two builders have wrist r under 0.5 (before 0.994) and rhythm r under 0.85 (before 1.000) over the first 20 s; the film is taken for 60 s on the changed build, and over those 60 s they reach with the same arm in under 80% of the frames in which both reach (the unchanged build reads 100% for as long as both build, since both arms follow one clock). In `B-dusk-watched` and `E-lapse-dusk` rhythm r is under 0.85 (before 0.997 and 0.998). Both are drawn building for as long as the simulation has not finished their nests, and lie down within two ticks of its finishing them.
3. **Sleepers stay asleep.** In `D-jump-night` and `F-jump-dawn2` all four are in the sleep clip, as before.
4. **The audit.** For `nestBuild`, solo `play`, `wrestle`, `tickle`, `display`, `charge`, `pantGrunt`, `drum`, `mate`, `attack`, `defend`, ground `forage`, `drink`, `share`, `groom`, `alarm` and `listen` (sniffing), with animals entered in the same frame: no pair identical, r0 median at most 0.6 over 30 s, and rBest median at most 0.85 over 120 s. For eight builders entered in the same frame: no pair has more than one of its turns within 2% of the build of a turn of the other, no two have the same sequence of arms over their first twelve reaches, and no two have the same bar. For the small slow sines (the still poses, the infant on the back, the head's drift): no two of eight animals share a tempo; no figure of correlation is promised for them, their cycles being too long for these windows. `pantHoot`, the gaits and what section 0.3 marks "left" read as before.
5. **The same animal twice.** Every clip gives the same pose for the same animal at the same time on two runs (a test), and no `Math.random` is added under `src/render`.
6. **After a common release.** Of twelve animals released in the same frame, at most two start their first idle event within 0.25 s of another's (before: twelve at 3.00 s); in film `G-lapse-midday` no two of the four start one within 0.25 s of each other in the first 10 s (before: three within 0.15 s).
7. **Nothing else moves.** `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` untouched and passing; `git diff --stat track-e` names only `src/render/`, `tests/render-*` and `docs/staging/`; `tsc --noEmit`, `gen-params --check`, the render and interface tests, the whole suite and `pnpm build` pass.

What this registration does not cover: frame time on the graphics card (no probe of it may run today; the change adds no draw call, texture or material, and the clips' new arithmetic is a few hashes per animal per frame); a live model; the colobus.
