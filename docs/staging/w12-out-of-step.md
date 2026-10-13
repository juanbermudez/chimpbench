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

## 1. What a viewer sees now

- **A new world at dawn.** Every animal lies asleep in a finished nest of full size, eyes shut, breathing at its own rate, until its own act changes. Nobody builds, nobody turns. (Before: the whole community sat up bending the same branch with the same arm on the same beat for four simulated minutes, in nests drawn at a quarter of their size, and all swung round 1.9 rad in the same third of a second.)
- **Builders at dusk.** Each keeps its own time: a bar of its own length (2.6 to 4.0 s), a reach with one arm or the other toward a place of its own after a pause of its own, now and then a look round or both hands pressing the branches down. It turns at its own moments, by its own amounts, its own way round. It goes on until the simulation has finished its nest, then lies down; two builders who began together do not end together.
- **The other clips.** Ground feeders pick on bars of their own length (3.2 to 4.8 s), skip a bar now and then and sometimes use the other hand. Drinkers, groomers (lip-smack, strokes, time at a site), solo players, displayers, chargers, pant-grunters, drummers, alarm callers, sniffers and meat holders move at their own tempo from their own start. Wrestlers, a tickler, an attacker and its victim and a mating pair keep their own pair's beat, and two pairs differ. A pant-hoot chorus still climbs together.
- **Idle life.** When a time-lapse stops, or a party is let go by a call it listened to, the first scratch, shift or glance of each animal comes at its own moment, 3 to 12 s later, not from all of them at 3.00 s.

## 2. What was changed

Renderer only; six source files and three test files.

- `src/render/creatures/poses.ts`. Three small pure helpers: `ownTempo(seed, k)` (the animal's tempo for its movement number k), `ownClock(t, seed, k)` (the clip clock at that tempo from the animal's own start) and `barProgress` (an irregular beat: bars of the animal's own length, the movement after a pause drawn for each bar). All through the file's own `cyc01` hash of the animal's seed, which is the hash of its id. `nestBuild` is rebuilt on bars (`nestBar`, `nestBeat`, `nestArm`): a hand leaves the lap and comes back to it, so nothing jumps between bars; never more than two bars in a row without a reach; no pressing in the first two bars. Ground `forage` keeps its keyframes on bars of the animal's own length (and its head and chest now go to the hand and back over a moment; they stepped there in one frame). `drink`, `groom`, `play`, `display`, `charge`, `pantGrunt`, `drum`, `alarm`, `listen` (sniffing), `share`, the chewing of crown feeding and the small sines of the still poses (breathing in the clip, the head's drift, the ear flick, the infant's head on its mother's back, shivering) take their tempo from the animal. `wrestle`, `tickle`, the blows of `attack` with the flinches of `defend`, and `mate` run on the pair's clock at the pair's tempo (`PoseCtx.pairSeed`, new and optional). `pantHoot` and the gaits are untouched.
- `src/render/creatures/perch.ts`. `nestProgress`: building or asleep from the simulation's finished nest. `nestTurn(k, id)`: with an id, the turns are that animal's own (without one, as before).
- `src/render/creatures.ts`. The nest branch of `chooseClip` keeps, per animal and nest act, when the simulation's finished nest was first seen (`Chimp.nest`, read only) and asks `nestProgress`; `pairSeed` is set beside the pair clock; a playing pair swaps roles every 2.4 to 4.2 s by pair; the jaw of a call runs at 0.88 to 1.12 of the call's tempo by animal; the ring under a drinker comes at the animal's own moments (the offset was the id, a whole number: every drinker's ring fell in the same frame).
- `src/render/creatures/nests.ts`. A nest the simulation lists is drawn finished (it grew in from a quarter of its size over six simulated minutes).
- `src/render/creatures/secondary.ts`. `idleSettle(id, n)`: the wait after idle life is released is 3 to 12 s by animal and event, where it was 3 s for all.
- `src/render/creatures/harness.ts`. `&action=nest&build` is a builder as the simulation has one: no finished nest, its tree as target; `&build=<seconds>` publishes the nest after that long.
- Tests: `tests/render-step.test.ts` (new, 11 tests), one line in `tests/render-nests.test.ts`, and the window of one grooming test (`tests/render-groom.test.ts`: 28 s instead of 14, so that it holds two changes of site whatever the groomer's own time at a site is).

How "building" against "asleep" is decided now. In the first frame an animal's body is drawn in a nest act: if the simulation already has a finished nest for it, it was never seen being built and the animal is drawn asleep in it (a new world, a jump of the clock, an animal the simulation puts back into the nest it had left). If not, it builds: the progress follows the seconds since its drawn arrival over 240 s and waits at 0.9 for as long as the simulation takes. When the simulation publishes the nest, the body, which trails it by two ticks, draws the rest of the building over those two ticks and lies down when its own drawn time reaches the finished nest.

## 3. Before and after

Field map, seed 48, the same ticks; the world's hash at each starting tick is the same before and after (A `e7ea6473:4167150`, C `717ba35a:4285714`, D `23fab325:4273385`, F `659cd308:4274824`). "After" is the third run. Readouts: `before/` and `after/` (`run2/` holds the second run's).

### 3.1 The films

| Film | Read | Before | After |
| --- | --- | --- | --- |
| `A-open-rt`, the opening, Real time | drawn building in a nest the simulation has finished | 9 of 9 near the camera, 41 of 41 in the world | 0 of 9, 0 of 41: all asleep, lids shut |
| | wrist r, same arm, rhythm r (36 pairs) | 0.984, 98.9%, 0.976 | nobody builds |
| | turns of the heading in 70 s | all 9 within 0.3 s of each other, 1.9 rad | none |
| | the nest under each | a quarter size, growing for six simulated minutes (by the code; in the pictures no nest shows under the two animals) | full size from the first frame (in the pictures) |
| `C-jump-dusk`, two builders after a jump | wrist r, first 20 s | 0.994 | 0.09 |
| | rhythm r, first 20 s | 1.000 | 0.39 |
| | same arm | 100% | 68% over 20 s, 61% over 60 s |
| `B-dusk-watched`, the same two, watched | wrist r; same arm; rhythm r | -0.16; 49.5%; 0.997 | 0.16; 77%; 0.35 |
| `E-lapse-dusk`, after a time-lapse | wrist r; same arm; rhythm r | 0.05; 58%; 0.998 | 0.08; 71%; 0.64 |
| `D-jump-night`, `F-jump-dawn2` | asleep | 4 of 4, 4 of 4 | 4 of 4, 4 of 4 |
| `G-lapse-midday`, first idle events after the speed change | | 2.86, 2.86 and 3.01 s | 6.91, 7.99 and 9.49 s |
| `H-dusk-through`, Watch 4x to the end of both builds (after only) | from the simulation finishing a nest to the body lying down | | 2.00 ticks for both builders; the progress never steps by more than 0.002 in a frame |
| | the two builders' reaches | | `LRRRRRLLLLLRR` with gaps of 2.5 to 6.8 s; `RRLLLLRLRRL` with gaps of 2.5 to 9.8 s |

In `H` the simulation finishes the first builder's nest with the drawn progress at 0.76 and the second's with it waiting at 0.9; each lies down two ticks later. (By the old rule each stopped a fixed 240 simulated seconds after its own arrival, whatever the simulation said: for the first builder that is about four ticks after its nest was finished.) The first builder turns by 1.12, -1.37, -2.19 and 1.45 rad, the second by -1.71, -2.12, -1.41 and -1.53 rad; two turns of each fall within 2 s of a turn of the other in that film (at Watch 4x, where a build lasts under a minute), one of those pairs going opposite ways.

### 3.2 The audit of the clips (animals entered in the same frame)

`audit.mts`, eight animals (four pairs for the paired clips), before -> after. r0: their movement at the same instant; rBest: at the best shift within 6 s; the last column is the harness (`hprobe.mjs clips`: ten animals, the clip forced on all in one frame, 12 s, the pose as drawn; role 0 and no partner, so it is given once per clip; for `listen` that is the scanning variant, not the sniffing one, and for `play` ten animals of mixed ages and variants).

**Clips that were in step or on one loop**

| Variant | Pairs identical | r0, 30 s | rBest, 120 s | Harness, the pose as drawn (role 0, no partner): r0; rBest |
| --- | --- | --- | --- | --- |
| nestBuild | 0/28 -> 0/28 | 1.00 -> 0.08 | 1.00 -> 0.14 | 1.00 -> 0.11; 1.00 -> 0.61 |
| play (solo, infant) | 0/28 -> 0/28 | 1.00 -> 0.02 | 1.00 -> 0.02 | 0.03 -> 0.01; 0.03 -> 0.03 |
| wrestle (on top) | 6/6 -> 0/6 | 1.00 -> 0.04 | 1.00 -> 0.02 | 0.96 -> 0.11; 0.96 -> 0.33 |
| wrestle (under) | 0/6 -> 0/6 | 1.00 -> 0.03 | 1.00 -> 0.02 | 0.96 -> 0.11; 0.96 -> 0.33 |
| tickle | 0/6 -> 0/6 | 0.92 -> 0.02 | 0.99 -> 0.08 | 0.48 -> -0.02; 0.88 -> 0.50 |
| display | 0/28 -> 0/28 | 1.00 -> 0.04 | 1.00 -> 0.02 | 0.99 -> 0.08; 0.99 -> 0.28 |
| charge | 0/28 -> 0/28 | 1.00 -> 0.02 | 1.00 -> 0.01 | 0.69 -> 0.07; 0.85 -> 0.31 |
| pantGrunt | 6/6 -> 0/6 | 1.00 -> 0.02 | 1.00 -> 0.03 | 0.88 -> 0.00; 0.92 -> 0.18 |
| drum | 0/28 -> 0/28 | 1.00 -> 0.01 | 1.00 -> 0.02 | 0.96 -> 0.06; 0.99 -> 0.19 |
| mate (male) | 6/6 -> 0/6 | 1.00 -> 0.00 | 1.00 -> 0.01 | 0.20 -> 0.13; 0.89 -> 0.89 |
| attack | 0/6 -> 0/6 | 0.65 -> 0.06 | 0.94 -> 0.02 | 0.51 -> 0.10; 0.83 -> 0.34 |
| defend | 0/6 -> 0/6 | 0.96 -> 0.02 | 0.96 -> 0.02 | 0.95 -> 0.08; 0.95 -> 0.31 |
| forage (ground) | 0/28 -> 0/28 | 0.07 -> 0.08 | 0.99 -> 0.15 | 0.00 -> 0.00; 0.99 -> 0.64 |
| drink | 10/28 -> 0/28 | 0.00 -> 0.00 | 0.00 -> 0.01 | 0.03 -> -0.01; 0.77 -> 0.45 |
| share | 0/6 -> 0/6 | 0.59 -> 0.11 | 0.96 -> 0.05 | 0.92 -> -0.02; 0.98 -> 0.23 |
| groom (behind) | 0/6 -> 0/6 | 0.64 -> 0.04 | 0.74 -> 0.07 | 0.99 -> 0.01; 0.99 -> 0.21 |
| groom (mutual) | 0/6 -> 0/6 | 0.66 -> 0.10 | 0.91 -> 0.05 | 0.99 -> 0.01; 0.99 -> 0.21 |
| groom (infant held) | 0/6 -> 0/6 | 0.87 -> -0.02 | 0.94 -> 0.03 | 0.99 -> 0.01; 0.99 -> 0.21 |
| groom (front) | 0/6 -> 0/6 | 0.66 -> 0.10 | 0.91 -> 0.05 | 0.99 -> 0.01; 0.99 -> 0.21 |
| groom (high) | 0/6 -> 0/6 | 0.56 -> 0.09 | 0.89 -> 0.06 | 0.99 -> 0.01; 0.99 -> 0.21 |
| alarm | 0/28 -> 0/28 | 0.00 -> 0.01 | 0.99 -> 0.05 | 0.00 -> 0.00; 0.99 -> 0.83 |
| listen (sniff) | 0/28 -> 0/28 | 0.73 -> 0.16 | 0.97 -> 0.08 | 0.27 -> 0.37; 0.88 -> 0.88 |

**Left as they were**

| Variant | Pairs identical | r0, 30 s | rBest, 120 s | Harness, the pose as drawn (role 0, no partner): r0; rBest |
| --- | --- | --- | --- | --- |
| pantHoot | 0/28 -> 0/28 | 0.02 -> 0.02 | 0.98 -> 0.98 | 0.27 -> 0.27; 0.97 -> 0.97 |
| walk | 0/28 -> 0/28 | 0.54 -> 0.54 | 0.93 -> 0.93 |  |
| gallop | 0/28 -> 0/28 | 0.21 -> 0.21 | 1.00 -> 1.00 |  |
| sneak | 0/28 -> 0/28 | 0.50 -> 0.51 | 0.92 -> 0.91 |  |
| swagger | 0/28 -> 0/28 | 0.24 -> 0.24 | 1.00 -> 1.00 |  |
| bipedWalk | 0/28 -> 0/28 | 0.57 -> 0.57 | 1.00 -> 1.00 |  |
| climb | 0/28 -> 0/28 | 0.52 -> 0.52 | 0.94 -> 0.94 |  |
| clamber | 0/28 -> 0/28 | 0.52 -> 0.52 | 0.93 -> 0.93 |  |
| forage (crown) | 0/28 -> 0/28 | 0.34 -> 0.34 | 0.38 -> 0.38 | 0.00 -> 0.00; 0.99 -> 0.64 |
| groomee (seated) | 0/6 -> 0/6 | 0.00 -> -0.01 | 0.24 -> 0.24 | 0.03 -> 0.07; 0.54 -> 0.55 |

**Still poses and slow sines**

| Variant | Pairs identical | r0, 30 s | rBest, 120 s | Harness, the pose as drawn (role 0, no partner): r0; rBest |
| --- | --- | --- | --- | --- |
| stand | 0/28 -> 0/28 | 0.07 -> 0.07 | 0.80 -> 0.14 | 0.09 -> 0.06; 0.56 -> 0.54 |
| sitIdle | 0/28 -> 0/28 | 0.07 -> 0.07 | 0.80 -> 0.14 | 0.01 -> 0.03; 0.24 -> 0.21 |
| perch (seat) | 0/28 -> 0/28 | 0.33 -> 0.26 | 0.62 -> 0.34 | 0.01 -> 0.03; 0.14 -> 0.22 |
| sleep | 0/28 -> 0/28 | 0.26 -> -0.04 | 1.00 -> 0.09 | -0.01 -> -0.09; 0.89 -> 0.88 |
| carryDorsal | 0/28 -> 0/28 | 0.82 -> 0.51 | 1.00 -> 0.19 | 0.94 -> 0.77; 0.98 -> 0.96 |
| shelter | 0/28 -> 0/28 | -0.03 -> -0.04 | 0.98 -> 0.05 | -0.01 -> -0.02; 0.71 -> 0.40 |
| nurse | 0/28 -> 0/28 | 0.09 -> -0.02 | 1.00 -> 0.05 | 0.19 -> 0.07; 0.53 -> 0.61 |
| groomee (prone) | 0/6 -> 0/6 | 0.39 -> 0.55 | 0.90 -> 0.60 | 0.03 -> 0.07; 0.54 -> 0.55 |
| guard | 0/28 -> 0/28 | 0.34 -> 0.27 | 0.62 -> 0.33 | 0.05 -> 0.04; 0.33 -> 0.22 |
| hunt | 0/28 -> 0/28 | 0.34 -> 0.28 | 0.61 -> 0.33 | 0.11 -> 0.20; 0.63 -> 0.64 |
| patrol | 0/28 -> 0/28 | 0.35 -> 0.28 | 0.61 -> 0.33 | 0.22 -> 0.18; 0.64 -> 0.69 |
| clingTrunk | 0/28 -> 0/28 | 0.35 -> 0.28 | 0.60 -> 0.34 | -0.01 -> 0.02; 0.74 -> 0.63 |

Every listed clip meets the registered figures (no pair identical, r0 at most 0.6 over 30 s, rBest at most 0.85 over 120 s): the highest r0 is 0.16 (sniffing), the highest rBest 0.15 (ground feeding). The clips left alone read as before. In the harness's 12 s the slow movements cannot be told apart at the best shift (an arm raised once in seven seconds, a head that turns once in eighteen); over the audit's two minutes they can.

### 3.3 The harness (the pose as the layer draws it)

- **Ten animals at rest for 120 s** (`h-life.json`): unchanged, as it should be: 78 idle events, 10 within 0.25 s of another's of the same kind; 230 blinks, 76 within 0.1 s of another's; 319 changes of gaze, 125 within 0.1 s; breathing 0.25 to 0.33 a second, pair correlation median 0.004. The ear flick's highest pair correlation went from 0.78 to 0.05.
- **Four grooming pairs and four playing pairs started in the same frame** (`h-pairs.json`): the four groomers 0.73 -> 0.09 at the same instant; the players at the best shift 0.97 and 1.00 -> 0.17 and 0.17; three wrestling pairs swapped roles 14, 14 and 14 times in 40 s before, 14, 17 and 13 times now.
- **Clips forced on ten animals in one frame** (`h-clips.json`; the last column of the tables above): `nestBuild` 1.00 -> 0.11, `groom` 0.99 -> 0.01, `display` 0.99 -> 0.08, `wrestle` 0.96 -> 0.11, `drum` 0.96 -> 0.06, `defend` 0.95 -> 0.08, `share` 0.92 -> -0.02, `pantGrunt` 0.88 -> 0.00, `charge` 0.69 -> 0.07. Pictures of the ten in `nestBuild`: `before/h-clips-nestBuild.png` (ten right arms up) and `after/h-clips-nestBuild.png`.

### 3.4 Idle events after a common release

Twelve animals held and released in the same frame (`settle.mts`):

| Held | Before: first event after | After |
| --- | --- | --- |
| 45 s (a walk, a time-lapse) | 3.00 s for all twelve | 4.9 to 12.0 s; two of twelve within 0.25 s of another |
| 2.4 s after 20 s of idling (a call listened to) | 3.00 s for seven of twelve | 3.4 to 11.3 s; six of twelve within 0.25 s of another (three pairs), no three together |

### 3.5 The registered statements, one by one

1. **The opening: met.** Nobody is drawn building in a finished nest; all sleep with the lids shut; no turns; full-size nests from the first frame.
2. **Builders: met.** `C`: wrist r 0.09 (under 0.5), rhythm r 0.39 (under 0.85), same arm 61% over 60 s (under 80%). `B` and `E`: rhythm r 0.35 and 0.64 (under 0.85). Both builders build until the simulation finishes their nests and lie down two ticks later.
3. **Sleepers stay asleep: met.**
4. **The audit: met for the clips, not as worded for the turns.** Every listed clip: no pair identical, r0 at most 0.16 over 30 s (0.6 allowed), rBest at most 0.15 over 120 s (0.85 allowed). Eight builders: no two have the same bar or the same sequence of arms. The clause "no pair has more than one of its turns within 2% of the build of a turn of the other" does not hold and could not: each turn's moment is spread over 18% of the build, so one same-numbered turn in five falls within 2% of the other animal's by chance, and about one pair in five shares two. Read on the build: of 28 pairs, 14 share no turn, 8 share one and 6 share two; none shares three or four (among the 49 ids of this world, 1,176 pairs: 467, 476, 203, 29 and 1). Before, every pair shared all four, in the same frame, by the same angle. The clause was set without working out what chance gives; that was the registration's mistake, not something to tune toward. The small slow sines: no two of eight animals share a tempo. `pantHoot` and the gaits read as before.
5. **The same animal twice: met** (a test over every changed clip; no `Math.random` in the files).
6. **After a common release: met in the film, met for the long hold, not as worded for the short one.** Film `G`: no two within 0.25 s (before, three within 0.15 s). Twelve animals held 45 s: two within 0.25 s of another (at most two allowed). Held 2.4 s: six, in three pairs. Twelve independent starts spread over nine seconds fall within a quarter second of another about half the time, so "at most two" asked for less than chance gives there too; what changed is that no three start together, where all twelve or seven did. The spread was left at 3 to 12 s: a wider one would leave a party that has just stopped without idle life for too long.
7. **Nothing else moves: met.** `git diff --stat track-e` names `src/render/` (six files), `tests/render-{step,nests,groom}.test.ts` and this document; the goldens and `tests/sim-track-e.test.ts` are untouched and pass; the checks of section 5 pass.

## 4. The three runs

- **Run 1 (21:25 EDT).** The new tests on the first build: 8 of 11 passed. (a) The turns: two animals shared three of four turns. The moments were drawn with `util.ts` `hash01`, whose draws for ids 1, 3, 5, 7 and 9 at those salts fell within a tenth of each other; they are now drawn with `secondary.ts` `hashUnit`, the hash of the idle schedules. The registered clause about turns was also found to ask for less than chance gives (section 3.5, item 4); the test now holds what can be held (no pair shares all its turns, the median pair shares one at most, at most four pairs in ten share two). (b) The idle release: the same kind of clause (item 6); the test now holds the size of the largest group that starts together. (c) A tolerance of the test's own (how far apart two poses are on average) was set too high for the alarm clip, whose arm is up a fifth of the time; lowered. One older test failed in the render tests: the grooming test filmed 14 s on the old fixed 9 s at a site; its window is now 28 s.
- **Run 2 (21:33 to 21:56).** All tests passed; every film, the audit and the harness were taken (`run2/`). Every figure of sections 3.1 to 3.4 already read as it does now. The film that follows two builders to the end showed one of them pressing its nest down for five bars on end, 16 s without a reach, and starting its building with two presses: by the draws alone one builder in twenty has such a run.
- **Run 3 (21:58 to 22:22).** `nestBeat` limits a builder to two bars in a row without a reach and to no press in its first two bars. Tests, films, audit and harness again (`after/`): the figures above.

## 5. Tests and checks

At the head (b7cd0b9 plus this document), 12 October 2026, 22:12 to 22:25 EDT:

- `tsc --noEmit`: clean. The new and changed tests and the harness were type-checked by hand with the project's strict options: clean.
- `scripts/gen-params.ts --check`: valid, 1,050 entries, `params.gen.ts` up to date, lint clean.
- The render and interface tests (`tests/render-*.test.ts`, `tests/ui-*.test.ts`): 310 tests, all pass.
- The whole suite, once: 1,469 tests, 1,468 pass, none fails, 1 is skipped as on `track-e` (it needs `artifacts/validation/c7a-field1y.json`, which is not on this computer). It took 7 minutes and held the 1-minute load at 13 to 16 from about 2; no model process was running.
- `pnpm build`: passes.
- `tests/fixtures/golden-world.json`, `tests/sim-track-e.test.ts`, `src/sim`, `data` and `src/types.ts`: no difference from `track-e`.
- New tests, `tests/render-step.test.ts` (11): animals that enter a clip in the same frame do not move in step (21 variants, the registered r0); nor on one rhythm started apart (the registered rBest, and solo play by variant); drinkers; what animals do together stays together (the chorus, the blow and the flinch, the pair's one tempo); the same animal moves the same way on every run; every animal has its own tempo and start; nest builders keep their own bar, arms and pauses, with hands that never jump; their turns; building or asleep (the rule, and a new field world and a new 160 m world, in which every animal is drawn asleep); animals released together; no `Math.random` in the files.

## 6. Not done, and what is left

- **Frame time on the graphics card** was not measured (no probe of it may run beside the other workflow today). The change adds no draw call, texture, pass or material; per animal and frame it adds a few sines. The films' frame intervals read medians of 16.7 to 19.7 ms before and 16.7 to 19.8 ms after, film by film (headless, with a screenshot every few seconds): no difference that can be read.
- **Not seen with a live model**, on a second seed or on the 160 m map in the app (the tests open both maps; the films are the field map, seed 48, day 1).
- **The simulation's "back in its nest"** (`execution.ts`, "Stayed in its nest: nobody came along") did not occur in the first 1,300 ticks of this world, so no film shows it. The rule covers it (a nest that is there when the body is first drawn in the act) and a test holds the rule, not that moment in the app.
- **A builder's turns can still coincide by chance** (section 3.5, item 4), and at Watch 4x and above the building is short, so two turns within a second or two of each other will be seen now and then.
- **The pant-hoot chorus** was left: callers that start together climax within three seconds of each other. If a chorus should spread more, that is a choice about the chorus (below).
- **The gaits** were left: the feet are tied to the ground covered, and two animals of one size walking at one speed keep one cadence, each at its own phase and footfall order.
- **The colobus** (tail sway and breathing on one tempo, each at its own phase) were not touched.
- **A clip that changes on one frame for many animals** still shows the same blend out of the old pose for all of them (the tail of a transition): the new clips differ from their first frame, so it lasts a third of a second.
- **`hash01` of `util.ts`** drew near-equal values for the odd small ids at four neighbouring salts. Over 200 salts it shows no bias (measured: correlation between neighbouring ids 0.02), so nothing else was moved off it; a new per-animal draw for a handful of animals is worth a look at its values.
- **Builders that the camera is not on** end their building on the pose rate of animals out of view (four times a second), like everything else about them.

## 7. For the integrator

### Commits (on `w12-out-of-step`, from `track-e` at 4ecd1a3)

- 0a2947b: the registration (section 0), before any changed code ran.
- 972e923: the change and its tests (runs 1 and 2).
- b7cd0b9: run 3, the two limits on a builder's bars.
- this commit: sections 1 to 7 of this document.

### Checks at the head

Section 5. The probe server of this stage (port 5197) is stopped; nothing of this stage is left running.

### Merge notes

- Touches `src/render/creatures.ts`, `src/render/creatures/{poses,perch,nests,secondary,harness}.ts`, `tests/render-{step,nests,groom}.test.ts` and this document. Nothing under `src/sim`, `data/`, `tests/fixtures`, `src/types.ts` or the interface.
- `PoseCtx` has one new optional field (`pairSeed`). `nestTurn` has one new optional argument. `NEST_BUILD_S` moved from `creatures.ts` to `perch.ts`.
- Every animal's poses differ from the build before in the clips named in section 2, so any picture comparison against an older build will differ wherever those clips play (and by a hair in every still pose: the breathing sine's tempo). The harness's `&idle=0` does not switch that off.
- If another branch adds a clip: see the first proposed line for `AGENTS.md` below.

### Lines proposed for AGENTS.md (not edited on this branch)

Under "Gotchas":

- Each animal's own rhythm (stage W12, `render/creatures/poses.ts`): a clip's cycle never runs on `PoseCtx.t` alone. `t` is 0 for every animal that enters the clip in the same frame, so they would move as one (a whole community was drawn building nests in step). A cyclic movement takes its clock from `ownClock(c.t, c.seed, k)` or its rate from `ownTempo(c.seed, k)` (k: a number no other movement uses); a movement with pauses runs on bars of the animal's own length (`barProgress`; `nestBuild` and ground `forage` show how, with hands that leave a rest place and come back to it so nothing jumps between bars); what two partners do to each other runs on `c.pairT` at `ownTempo(c.pairSeed ?? c.seed, k)`. A start of its own is not enough: one tempo for all still reads as a machine. `tests/render-step.test.ts` holds it: add a new moving clip to its `OUT_OF_STEP` list, or say why its animals move together (a pant-hoot chorus does; the gaits are tied to the ground). All stylizations.
- Building or asleep in a nest is the simulation's word (stage W12, `perch.ts` `nestProgress`): `Chimp.nest` is published when the building ends. The renderer draws building only while there is none, and never in a nest that was there when the body was first drawn in the act (a new world opens with every animal in a finished nest and the act's clock at 0). `nests.ts` draws a listed nest finished. A harness builder needs no nest and its tree as target (`&action=nest&build[=seconds]`).
- Whatever holds the idle life of several animals at once lets it go at once: a wait after it must be the animal's own (`secondary.ts` `idleSettle`), and an offset "by id" must not be the id itself (a whole number shifts nothing: the drinkers' rings).

Under "Verifying a change", the list of harnesses: the stage's probes are in `…/watch-2026-10-12/w12-out-of-step/` (server on 5197): `film.mjs '<json spec>'` films one moment and reads every animal near the camera every frame (`an.mjs` gives wrist r, same arm and rhythm r for the animals in one clip; `an-build.mjs` follows builders to the end; `an-idle.mjs` lists idle starts), `audit.mts` evaluates every clip for eight animals entered in the same frame with no browser, `hprobe.mjs clips|life|pairs` does the same in the creature harness on the pose as drawn.

### Block proposed for IMPLEMENTATION_PLAN.md

```
## Stage W12: out of step (render only)
**Goal**: the user's report of 12 October 2026: "all the chimps nesting are moving in sync doing the same exact movement". Animals in the same clip must not move in step unless they do the thing together, and an animal the simulation has in a finished nest is drawn asleep in it.
**Status**: Built on branch `w12-out-of-step` from `track-e` at 4ecd1a3 (12 October 2026; `docs/staging/w12-out-of-step.md`, registered before any changed code ran, three runs). Not merged. Nothing under `src/sim`, `data`, `tests/fixtures` or the contract changed; no pass, target or material was added; the world's hash at every filmed tick is the same before and after. Field map, seed 48. Cause: a clip's cycle ran on the clip's own clock, which has nothing of the animal in it, and a new world drew every animal building for four minutes because the renderer went by "fewer than 240 s in the nest act" and never asked the simulation whether the nest was finished. At a new world's opening 41 of 41 animals were drawn building in finished nests, in step (wrist height correlated 0.98 between neighbours, the same arm in 99% of frames, all turning 1.9 rad within a third of a second); now none builds, all sleep in full-size nests. Two builders after a jump of the clock into dusk: 0.99 and the same arm always, now 0.09 and 61%; watched or after a time-lapse they made the same movement a second apart (0.997 at the best shift), now 0.35 and 0.64. A builder builds until the simulation finishes its nest and lies down two ticks later. Every clip that was in step or on one loop for all (nest building, solo play, wrestling, display, charge, pant-grunt, drumming, mating, fights, ground feeding, drinking, sharing, grooming, alarm, sniffing), for animals entered in the same frame, now reads at most 0.16 at the same instant (eleven of the 22 variants read 0.92 to 1.00) and at most 0.15 at the best shift over two minutes (they read 0.74 to 1.00, drinking aside). Animals whose idle life is released together (a time-lapse stops) no longer all start an event 3.00 s later.
**Open**: two registered clauses asked for less than chance gives and do not hold as worded (a pair of builders shares two of four turn moments about one time in five; six of twelve released animals start within a quarter second of another, in pairs); frame time on the graphics card is not measured; nothing was seen with a model, on a second seed, or on the 160 m map in the app; the pant-hoot chorus, the gaits and the colobus were left as they were.
**The user's**: whether a pant-hoot chorus should stay as close as it is (callers that start together climax within three seconds); the look of the new building (bars of 2.6 to 4.0 s, one bar in four a look round or a press); whether builders should end with the simulation, as now, or after a fixed four minutes as before.
```

### Decisions that are the user's

- The pant-hoot chorus: left together on purpose. It is the one clip in which several animals still rise and call within seconds of each other.
- The share of a builder's bars that are not a reach (about a quarter) and the 3 to 12 s an animal waits before its first idle event after it becomes still: set by reasoning, not by eye on a long watch.

## 8. Second reading (12 to 13 October 2026, 22:26 to 00:47 EDT)

A second reader went through the stage without trusting sections 1 to 7. The user's complaint is about what the picture looks like, so every scene was filmed on both builds and looked at, and the figures are given beside what the frames show. Everything of this reading is in `/Volumes/Drive/chimpbench/shots/watch-2026-10-12/w12-out-of-step/review/` (`before/`, `after/`, `repaired/`, `pictures/`).

### 8.1 How it was read

- **Two builds, served in turn, never together.** The unchanged build is a `git archive` of `track-e` at 4ecd1a3 (port 5198); the branch is this worktree (port 5199). `scripts/vite.probe.config.mjs`, `MGOGO_NO_MODEL=1`, the app opened with `provider=server` and the model policy off from the first frame, one headless browser at a time, no model process. The world's hash at the start of every film that opens a world or jumps its clock is the same on both builds (27 films).
- **A film** (`rv12.mjs`, the scenes in `scenes.json`): one moment, every animation frame read in the page right after the creature layer's own update. Per animal: the clip, both wrists and both feet in its own body, the turn of the chest and of the head, the jaw, the lids, the heading, the largest step of any joint since the frame before, and what the simulation says (its act, a finished nest or none). Every tenth frame the picture goes into a contact sheet. 41 scenes on each build (the six that carry jittered frames, the performance counters or 100 s of idle life included): a new world at dawn (seeds 48 and 7, the field map and the 160 m map, at Real time, at 1 min/s, and as a user gets it with the dawn prologue left to play); nest builders at dusk in continuous play (Real time and the app's default 1 min/s); the clock jumped into dusk, into the night and to the next dawn; the frame a time-lapse stops (among builders, and at midday over a resting party); a party feeding in one crown (5 and 9 animals) and on the ground; resting parties on the ground and in a crown; five groomers side by side on the ground and four in a crown; eight animals walking in file; a pant-hoot chorus; three animals drinking side by side; four mothers with infants; five animals wrestling; a call heard by a party.
- **Per pair of animals drawn in the same clip** (`an12.mjs`): *wrist r*, the correlation of the wrists' heights at the same instant (left with left and right with right, or left with right when that reads higher); *best r*, the same for the higher wrist at the best time shift within 6 s, with that shift (a canon reads high here); *same arm*, of the frames in which both have one wrist clearly above the other, the share with the same one; and per animal the *cycle*, the first peak of its own autocorrelation.
- **With nothing in the way** (`hstrip.mjs`): the creature harness, ten animals put into one clip in the same frame on a frozen page clock, the row photographed every 0.3 s. In the app the crowns of the 160 m map hide most of an animal from any one camera, so what the eye says below comes from the field-map films, the ground scenes and these rows.

### 8.2 Verdict

**Fixed.** A person who watches nest builders, a new world at dawn, ground feeders, groomers, drinkers or players on this branch sees animals each doing their own thing; on the build before they moved as one.

What the user most likely saw is not the opening (section 7 guessed a new world at Real time or Watch 4x). With the dawn prologue left to play, the unchanged build shows the building clip for 16 to 21 frames, a third of a second. It is **dusk at the app's own speed after the prologue, 1 min/s**: the building then lasts three seconds, and three builders of one party each made the same movement, a rest, the left arm, a rest, the right arm, at the same moments (wrist r 0.94, 0.82 and 0.66; the same arm in 85, 86 and 69% of the frames in which both reach) while all three turned through the same headings together. On the branch the same three make a left and a left, one right, and a right and a right, at their own moments.

### 8.3 Scene by scene

Before -> after. "n" is the number of animals drawn in that clip together.

| Scene | Clip, n | Wrist r | Best r (shift) | Same arm | Cycles (s) | What the frames show |
| --- | --- | --- | --- | --- | --- | --- |
| New world at dawn, Real time, field map, seed 48 | building 8 -> asleep 8 | 0.98 -> nobody moves | 0.98 (0.1 s) -> none | 98% -> none | 2.15 to 2.2 -> none | Before: neighbours sit up and reach with the same arm together. After: bodies lying in full nests, breathing |
| the same, seed 7; the 160 m map, seeds 48 and 7 | building 5, 6, 7 -> asleep | 1.00, 0.98, 0.98 -> none | | 100, 99, 98% -> none | | the same |
| Builders at dusk, continuous play, 160 m map | building 3 -> 4 | 0.76 -> 0.30 | 1.00 (0.4 s) -> 0.66 (2.3 s) | 84% -> 32% | 2.02 for all -> 2.8, 2.9, 3.3 | Before: a canon, the same reach every 2.2 s, 0.2 to 0.6 s apart. After: reaches 2.5 to 11.7 s apart, arms in each animal's own order |
| the same, field map | building 2 | 0.12 -> 0.39 | 1.00 (2.9 s) -> 0.41 | 40% -> 79% | 2.05 both -> one of 2.5 | Before: one copies the other 2.9 s later. After: one reaches while the other sits (these two have bars of 2.64 and 2.76 s, the unlucky one pair in eight; see 8.7) |
| Clock jumped into dusk, field map | building 2 | 1.00 -> 0.26 | 1.00 -> 0.45 | 100% -> 22% | 2.02 both -> 2.5, 4.9 | Before: the same arm at the same moment (picture 2). After: not together |
| the same, 160 m map | building 3 -> 4 | 1.00 -> 0.06 | 1.00 -> 0.68 (3.6 s) | 100% -> 0% | | |
| A time-lapse stops among builders | building 4 | 0.54 -> 0.10 | 0.99 (0.6 s) -> 0.56 (3.1 s) | 67% -> 46% | 1.7 to 2.0 -> 2.9 to 3.3 | |
| Clock jumped into the night and to dawn | asleep 9, 3, 9, 3 | nobody moves | | | | the same on both builds |
| Feeding in one crown (field 5, 160 m map 9) | feeding | 0.04 -> 0.04; -0.02 -> -0.01 | 0.70 -> 0.67; 0.65 -> 0.67 | | 10.3 to 13.6 -> 10.7 to 13.5 | Unchanged (stage W9's clip). Never together at one instant; each on a cycle of its own length |
| Feeding on the ground | feeding 4 | 0.05 -> 0.04 | 0.89 (0.9 s) -> 0.39 | | 3.34 for all -> 3.2, 6.6, 8.5 | Before: one loop, a wave along the row. After: picks at each animal's own moments |
| Resting, ground | resting 5 | 0.07 -> 0.03 | 0.88 -> 0.40 | | | still bodies, idle life each its own |
| Resting, crown | seated 4 | 0.12 -> 0.12 | 0.21 -> 0.21 | | | the same |
| Groomers side by side | grooming 5; 5 | 0.34 -> -0.08; 0.49 -> -0.42 | 0.76 -> 0.51; 0.91 -> 0.60 | | | Before the lips smacked together (jaw r 0.49 and 0.76; now -0.01 and 0.01) |
| Walking in file (Watch 4x) | walking 8 | 0.05 -> 0.04 | 0.21 -> 0.30 | 51% -> 50% | 0.52 to 0.59 -> 0.51 to 0.58 | Unchanged. Not in step: each its own cadence and footfall |
| Pant-hoot chorus | calling 4 | -0.22 -> -0.22 | 0.95 (2.8 s) -> 0.95 (2.8 s) | | 8.5 to 9.0 both | Unchanged, on purpose. See 8.7 |
| Drinking side by side | drinking 3 | 0.86 -> -0.25 | 0.99 -> 0.92 (1.6 s) | 95% -> 46% | 2.12 both -> 2.07, 2.35 | Before: two leaf sponges dipped together. After: one after the other |
| Wrestling | wrestling 5 | -0.14 -> -0.04 | 0.88 (1.8 s) -> 0.41 | | 5.9 to 6.0 for all -> 5.4 and 5.4, 6.3 and 6.6, 6.9 | Before every pair swapped roles on one beat. After each pair has its own |

The harness rows say the same with nothing in the way. Ten builders started in one frame: before, ten right arms go up together and come down, then ten left arms (`pictures/1-builders-before-after.jpg`); after, at any moment two or three are reaching, each with its own arm, and the rest sit with their hands in the lap.

### 8.4 What must stay together, and does

- **A groomer's hands on its receiver** (`hgroom.mjs groom`: 30 s in 50 ms steps on a frozen clock; the distance of each hand from the receiver's trunk, in receiver sizes; nearer hand, median and largest, before -> after): receiver seated 0.089 and 0.192 -> 0.077 and 0.161; prone 0.149 and 0.181 -> 0.146 and 0.180; on its side 0.131 and 0.191 -> 0.143 and 0.191; arm folded up 0.091 and 0.192 -> 0.077 and 0.161; a mutual pair 0.141 and 0.192 -> 0.139 and 0.186; in a crown 0.088 and 0.192 -> 0.077 and 0.158; an infant held 0.411 and 0.463 -> 0.416 and 0.463. The hands are where they were. `scripts/groom-shots.mjs cases`: 11 of 11.
- **An infant on its carrier** (five films): the distance between the two drawn bodies is the same to the millimetre (on a resting mother 0.579 m both; on a builder 0.403 -> 0.401 m; riding in the file 0.884 m both), and so is the largest change of the infant's place on her in one frame.
- **Listeners turning to a call** (field map, a call from a crown with eight animals round it): five of six listeners turn to the caller within 0.01 s of the call before and within 0.02 to 0.22 s after; the sixth does not turn on either build.
- **Partners of one pair**: the two of a wrestling pair keep one swap period (5.39 and 5.43 s; 6.3 and 6.56 s). No fight and no mating pair occurred in the films; the stage's tests hold those.
- **The decision beat** (a film with five beats): the same animals, the same start and end to a tenth of a second, the same phases.

### 8.5 What the change could have broken, and did not

- **Movement continuous at a clip's start and end** (Real time films, animals posed every frame): 89 clip changes before, 93 after; the median step of the fastest joint in the frame of the change is 0.8 mm on both; 7 and 8 changes step more than 5 cm, the same transitions on both builds (a seated or standing animal starting up a trunk). One transition reads worse after: an animal going from ground feeding into a pant-hoot stepped 21 cm at the lips in one frame (9 cm at a foot before): a call starts with the simulation and is not fully blended on either build.
- **The same picture on two runs** (`hgroom.mjs twice`, two loads at the same page times): all 44 animals of the tile sheet, ten builders and one builder: no channel of any pose differs and the screenshots are byte-identical, on the unchanged build, on the branch and after the repair.
- **Idle life (stage W8)**: events per animal-minute, before -> after: a resting party at Real time for 100 s, 3.7 -> 3.7 (33 events on both); at Watch 4x, 3.8 -> 3.9; feeding in a crown 4.5 -> 4.5. After a time-lapse stops over a resting party: six of seven animals started an event at 2.99 s before; after, the seven start between 5.9 and 10.0 s, two of them within 0.25 s of another.
- **Stage W11**: with frames made 0 to 45 ms longer at random, a builder's heading has no reversal on either build (travel 0.9 to 1.9 rad before, 0.5 to 2.2 rad after); after a jump into the night all 41 animals in the nest act have their nest within 0.18 m in height and 0 m in the plane (two that are clambering to it apart, the same two on both builds); the dusk film at 1 min/s shows the same clambers at the same moments on both builds.
- **Cost**: main-thread script time per frame with `?perf=1`, median: 2.2 -> 2.1 ms in a grooming scene of twelve animals and 2.2 -> 2.1 ms among builders (creature layer 1.0 -> 0.9 ms). No difference that can be read. The graphics card was not measured (the probe may not run today).
- **The world**: `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` untouched and passing. Drawing writes nothing (`writes.mjs`): the 160 m world played with the picture on through dusk to tick 2864 has the hash of the same world brought there by the public tick alone.

### 8.6 The dawn opening

On both seeds and both maps, all 41 animals that are not carried (the whole world, not only those near the camera): before, 41 of 41 in the building clip with their eyes open over nests drawn at a quarter size (0.31 against 1.25); after, 41 of 41 in the sleep clip with the lids shut over full-size nests that are under them (0 m in the plane, 0.17 m in height). These are read a few seconds after the clock starts; filmed from the very first frame with the prologue left to play, every animal near the camera starts in the building clip before and stays in it for 16 to 21 frames, and after none is ever in it. Played at 1 min/s until they rise: before, 521 animal-frames drawn building in a finished nest on the field map and 338 on the 160 m map; after, 0 and 0, and nobody's lids are open while it is in the sleep clip. Builders at dusk in view still build, on both maps, and lie down after the simulation finishes their nest.

### 8.7 Found

**Repaired (two commits, on top of 675362b):**

1. **The building went back when a time-lapse stopped** (ff1d26a). In the frame the speed drops among builders the renderer changes the clock it counts a building on and the count starts again: a builder half way through read a tenth (0.50 to 0.08; on the unchanged build 0.44 to 0.13) and turned back through the headings it had already faced (2.3 rad of heading in the next four seconds). Older than this stage, and seen in a scene this stage is about. `perch.ts` `nestProgress` takes what has been drawn of the nest act as a floor (`Anim.nestTop`); the progress waits there until its clock catches up or the simulation finishes the nest. Filmed again: the builder stays at 0.44 and its heading travels 0.3 rad. A test in `tests/render-step.test.ts` holds it.
2. **A comment** in `nests.ts` still said a nest first seen finished grows in by the clock (6e6a007).

**Left, for the integrator and the user:**

- **The pant-hoot chorus** is the one thing that still reads as a machine: every caller makes the same stand with both arms raised, within three seconds of the others, on one cycle of nine seconds (best r 0.95 at a shift of 2.8 s, the same before and after; `pictures/4-chorus-still-together.jpg`). The builder left it on purpose and said so. It is the user's call.
- **At 1 min/s a building lasts about three seconds**, one or two reaches each. Two of the three builders filmed happened to reach with the same arm at overlapping moments (chance: one arm of two), the third with the other. Each also turns through its headings in those seconds, 5 to 11 rad of heading in 3 to 4 s (6.5 to 8.7 rad before, the builders of one party together). The turns per simulated minute are stage W9's; at this speed they read as a spin.
- **Animals whose acts change in one tick change clip in one frame.** Three drinkers stood up in the same frame on both builds. The simulation does that, the decision beat staggers departures only, and this stage does not touch it.
- **About one pair of builders in eight keeps nearly the same bar** (within 0.1 s: 143 of the 1,176 pairs of this world). The two of the field-map dusk are such a pair: wrist r 0.39 and the same arm in 79% of the frames in which both reach, though in the frames one reaches while the other sits.
- **Two leaf-sponge drinkers** are still on one loop at tempos of 2.07 and 2.35 s: over the ten seconds they drank, best r 0.92 at a shift of 1.6 s.
- **Feeding in a crown** was left as stage W9 made it: nothing together at one instant, each animal on a cycle of 10 to 13.5 s. In a 30 s film any two such cycles match at some shift (best r 0.65 to 0.9); section 3.2's 0.38 is over two minutes.
- **A step into a call** is not fully blended (8.5).

### 8.8 Where section 7 and the builder's report do not hold

- "The user most likely saw the fault on a new world at Real time or Watch 4x": see 8.2. It shows at dusk at the default speed, which no film of the stage looked at.
- "Nothing was seen on a second seed or on the 160 m map in the app": it has been now, and reads the same.
- The two registered clauses the builder reported as not met stand as reported. In continuous play two of three builders made a turn within 0.8 s of each other, in opposite directions.
- The builder's figures for its own pair of builders were not filmed again; other pairs on both maps read like them (wrist r 0.06 to 0.39 after, 0.76 to 1.00 before for animals that began together).

### 8.9 Checks at the head

Run on 6e6a007, the last commit that touches code or tests; the commit after it only adds this section.

- `tsc --noEmit`: clean. `tests/render-step.test.ts` type-checked by hand with the project's strict options: clean.
- The whole suite, once (00:34 to 00:40 EDT, no model process running, the 1-minute load at 3 before it and 15 at its height): 1,470 tests, 1,469 pass, none fails, 1 is skipped as on `track-e` (it needs `artifacts/validation/c7a-field1y.json`, which is not on this computer). `tests/render-step.test.ts` now has 12 tests.
- `pnpm build`: passes.
- `git diff --stat track-e` names `src/render/` (six files), `tests/render-{step,nests,groom}.test.ts` and this document. Nothing under `src/sim`, `data`, `tests/fixtures` or `src/types.ts`; no line added under `src/render` holds `Math.random`; no pass, target or material.
- Both probe servers of this reading (5198 and 5199) are stopped and no browser of it is left.

### 8.10 For the integrator and the user

- Commits of this reading, on top of 675362b: ff1d26a (the building never goes back, with its test), 6e6a007 (the comment), then this section. Not pushed, not merged.
- `Anim` has one more field (`nestTop`) and `nestProgress` one more optional argument (`floor`).
- Pictures: `review/pictures/1-builders-before-after.jpg` (ten builders started together, a row every 0.3 s, before beside after), `2-dusk-app-before-after.jpg` (two builders at dusk in the app, every tenth frame), `3-dawn-opening-before-after.jpg` (a new world at 06:30), `4-chorus-still-together.jpg` (the chorus as it is).
- The user's: whether the chorus should spread (8.7); whether a builder should turn less at 1 min/s, where its five headings pass in three seconds (8.7); and the builder's own three questions in section 7.
- Instruments worth keeping, all in `review/`: `rv12.mjs '<json spec>'` (one film, every frame read, a contact sheet of every tenth frame; `how` is `open`, `user`, `jump`, `watch` or `lapse`), `an12.mjs` and `cmp12.mjs` (the measures, one build against the other), `extra.py` (idle events, the infant on its carrier, the beats, the builders' reaches and turns), `hstrip.mjs` (ten animals in one clip on a frozen clock, a row every 0.3 s), `hgroom.mjs` (the hands on the receiver; the same picture twice), `writes.mjs` (drawing writes nothing), `scan.mjs` (finds the moments).
