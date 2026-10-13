# Stage W13: the chorus and the spin

Branch `w13-chorus-and-spin`, cut from `track-e` at 10f8a70. Started 13 October 2026, 00:49 EDT. Renderer only: nothing under `src/sim`, `data/` or `tests/fixtures` changes, drawing writes nothing to the World, no `Math.random` is added, and no render pass, render target or material is added.

Where the stage comes from: the user, looking at the running app on 12 October 2026: "all the chimps nesting are moving in sync doing the same exact movement..... that looks so ridiculous". Stage W12 gave each clip the animal's own tempo, start, arm order and pauses. Its second reader, filming whole scenes, found what still reads as a machine (`docs/staging/w12-out-of-step.md`, section 8.7): the pant-hoot chorus, the nest builder's spin at the app's default speed, the loops that are still shared (feeding in a crown, the leaf sponge, builders of nearly one tempo), and a step into a call.

Scripts, pictures and readouts of this stage: `/Volumes/Drive/chimpbench/shots/watch-2026-10-13/w13-chorus-and-spin/` (`before/`, `after/`, `pictures/`; `serve.sh`, `scan13.mjs`, `rv13.mjs`, `batch13.mjs`, `scenes13.json`, `an13.mjs`, `hrow13.mjs`, `audit13.mts`). `rv13.mjs` is the second reader's film probe of stage W12 with more read per frame; its `an12.mjs` is used as it is.

## 0. Registration (committed before any changed code ran)

Sections 0.1 to 0.6 were written and committed after the films and measurements on the unchanged build and before any changed code was run. Everything after section 0 was written afterwards.

### 0.1 How it was looked at and measured

- **Two builds, never served together.** The unchanged build is a `git archive` of `track-e` at 10f8a70 (port 5203); the changed build is this worktree (port 5204). `scripts/vite.probe.config.mjs`, `MGOGO_NO_MODEL=1`, the app opened with `provider=server` and the model policy off from the first frame, one headless browser at a time, no model process. Seed 48 on the field map (world hash at tick 0 `e7ea6473:4167150`) and on the 160 m map (`47748e2b:314521`), the worlds of stage W12.
- **Finding the moments** (`scan13.mjs`): the world stepped to tick 6,200 with the public tick; every long call the simulation publishes (`World.calls`), with who gave it, what it was doing, whether another call came just before within earshot, and who was near; every display.
- **A film** (`rv13.mjs`, the scenes in `scenes13.json`): one moment, every animation frame read in the page after the creature layer's own update. Per animal: the clip, both wrists, the hips and the head in its own body, the mouth, the heading, the largest step of any joint since the frame before, the call it gives. Every tenth to fifteenth frame goes into a contact sheet.
- **Callers and builders in a film** (`an13.mjs`): for a caller, the seconds it is upright on two legs and the seconds both wrists are above its head, and for the second after the pant-hoot clip starts and after it ends, how far the heading travels and the largest step of a joint in one frame. For a builder, the real seconds it is drawn building, how far its heading travels, the fastest quarter second, the most in any one second, the reaches, and what the heading does in the four seconds after it lies down.
- **The row of ten** (`hrow13.mjs`): the creature harness's `stages` row (three infants, a juvenile, an adolescent female and male, an adult female and male, an elder female and male), all calling from the same frame on a frozen page clock, photographed every 0.3 s.
- **The clips themselves, no browser** (`audit13.mts`): A. the same ten animals in the pant-hoot clip from the same frame for 45 s (the length of a pant-hoot's voice in the simulation; a call act lasts 30 to 60 s): who is upright, who has both wrists above the head, how many at one instant, and for the 45 pairs the share of the call two animals spend within a posture tolerance of each other (hips within 0.06 body lengths in height and 0.2 rad in pitch, each wrist within 0.12 in height, the head within 0.1), at the same instant and at the best shift within 6 s. B. 49 builders, the heading over one whole building at Real time, Watch 4x, 1 min/s and 10 min/s. C. Feeders in a crown for 120 s: the correlation of two animals' movement at the best shift within 15 s (longer than a cycle), and stage W12's measure of the higher wrist over 30 s. D. Leaf-sponge drinkers, 120 s. E. 49 builders: pairs whose bars are within 0.1 s, and how alike those pairs move.
- At most three runs of changed code against the statements of section 0.5. A run is one pass of the tests and of these measurements on a changed build. Every run is reported, whichever way it reads.

### 0.2 What a person sees on the unchanged build (10f8a70; 13 October 2026, 00:57 to 01:25 EDT)

**A caller.** It sits, its lips pushed forward and its head back. A few seconds in it jumps to its feet in one frame with both arms thrown up in a V and its mouth wide open, holds that for 1.8 s, and drops back to sitting. Nine seconds later it does it again, and again: five times in the 45 s a call lasts at Real time. Every caller does exactly this: the alpha male, a female of 36, a female of 12, a male alone in the forest, an animal answering a call from 400 m away, an adolescent on a limb 12 m up. The picture of two callers on the field map (`before/CH2-chorus-48F-s2.jpg`) shows the alpha male standing with both arms up beside a female, who does the same nine seconds later.

**A chorus.** In the app a chorus is small: on the 160 m map four animals called together at dawn (a male of 17 and females of 21 and 36 on the ground, a male of 13 in a crown), on the field map two (the alpha and a female of 12). Each stands up with its arms in a V every nine seconds, the female 1.6 to 1.9 s after the male each time: a canon. In the harness row of ten, up to six stand in the identical pose at one instant, infants included (`before/hrow-callers.jpg`).

**Who calls, on seed 48 up to tick 6,200** (`before/scan13-*.json`). Field map: 267 pant-hoots, 117 of them in the call act (the others are given while travelling, feeding, resting or after a display, with only the face of a call drawn over that act's clip); of those 117, 68 are given in a crown and 49 on the ground; 56 by adult females, 46 by adult males, 13 by adolescent males, 2 by adolescent females; before the call the animal was feeding (35), resting (30), in its nest (15), drinking (12) or travelling (10). 174 of the 267 are given with nobody within 20 m. Every one of the 79 drummings is a male's (the simulation's rule). So the usual caller of this world is an animal alone, as often female as male, more often in a crown than not, that was feeding or resting: and it is drawn as the same standing, arm-raising figure.

**At the app's default speed (1 min/s)** a call act is on screen for 0.4 to 1.0 s: a seated figure with its lips pushed forward, then the next act.

**The start of a call.** The alpha male was feeding on the ground, facing his food. In the frame the call started his body swung round at once: the heading travelled 2.64 rad in the first second, and his lips stepped 21 cm in one frame (film `CH2`). The body turns because the renderer lets go of the facing it gave him for feeding and falls back to the simulation's heading; the chest and neck lead a turn, which is the step at the lips. Inside the clip, each jump to the feet and back steps the fingers 0.6 to 1.0 m in one frame (films `CH1` to `CH3`; stage W12's films of the same code read 0.7 to 1.5 m).

**A builder.** At Real time it sits bending branches in, each at its own time since stage W12, and four times in a building it whips round to a new heading: 1.3 rad in about a third of a second (5.7 rad/s over the fastest quarter second; 8.7 in another film). At Watch 4x the same whips, five in a minute. At 1 min/s the whole building is on screen for 3.0 to 3.7 s: six builders' headings travelled 7.4 to 9.9 rad in that time (3.5 to 4.7 rad in one second) with 0 to 2 reaches, and after lying down each turned another 0.5 to 1.9 rad back to its first heading; on the field map 7.9 to 12.5 rad in 2.1 to 3.7 s. It reads as a spin. At 10 min/s a building lasts 0.1 to 0.7 s and the heading travels up to 6.8 rad in it.

**Feeding in a crown.** Nobody moves at the same instant, but every feeder runs the same sequence (reach into the leaves, pull a cluster in, one to three picks to the mouth, chew) on a cycle of 10 to 13.4 s that is its own length and never changes. Five feeders in one crown on the field map, 60 s: the higher wrist of two animals correlates 0.62 at the best shift (highest pair 0.94); nine on the 160 m map 0.30 (highest 0.89).

**Drinking side by side.** Two animals with a leaf sponge dip and lift it without a pause, one a moment after the other (0.92 at the best shift over the ten seconds they drank); the third drinks with its lips at the water and is a still figure. All three stand up in the same frame (the simulation ended the three drinks in one tick; not in this stage).

### 0.3 The measures on the unchanged build

**The chorus: ten animals in the clip from the same frame, 45 s (`before/audit13.json`).** Every one of the ten is upright five times, 9.0 s of the 45, with both wrists above its head for 8.8 to 9.0 s; the hips go from 0.14 to 0.57 to 0.61 body lengths. At one instant up to six of ten are upright with both arms raised; for 21.8 of the 45 s somebody is. In a crown, and for an animal that was on all fours: the same, ten of ten. Over the 45 pairs: two animals are within the posture tolerance of each other for 0.72 of the call at the same instant (highest pair 0.99) and for 0.99 at the best shift within 6 s (highest 1.00); their movement correlates 0.98 to 1.00 at the best shift (about 1 s). One posture class: upright.

**Callers in the films (`before/*.w13.json`).**

| Film | Caller | Upright | Both wrists above the head | At the start of the call |
| --- | --- | --- | --- | --- |
| `CH1`, four callers at dawn, 160 m map | male 17 | 8.8 s in 5 rises | 8.1 s | from a pant-grunt: joint step 8 cm |
| | female 21 | 12.1 s in 7 | 8.4 s | from rest: 7 cm |
| | female 36, coming down a trunk | 8.9 s in 5 | | from the climb clip: 40 cm at a toe |
| | male 13, on a limb | 1.8 s in 1 (12 s in the clip) | 1.5 s | |
| `CH2`, two callers, field map | alpha male 27 | 8.8 s in 5 | 8.0 s | from feeding: heading 2.64 rad in the first second, lips 21 cm in one frame |
| | female 12 | 6.3 s in 4 (34 s in the clip) | 4.9 s | from drinking: 16 cm at a shin |
| `CH3`, a male alone | male 33 | 8.8 s in 5 | 8.1 s | from standing: heading 1.11 rad in the first second, 13 cm |
| `CH4`, a female alone | female 15 | 8.8 s in 5 | 8.0 s | from feeding: 14 cm |
| `CH5`, answering a call from 402 m | male 41 | 8.8 s in 5 | 8.2 s | from rest: 4 cm |
| `CH6`, a display, then a call | male 17, on a limb | 1.8 s in 1 (8 s in the clip) | | from the climb clip: 35 cm at a toe |
| `CH7`, the dawn chorus at 1 min/s | seven animals give a pant-hoot | three of them enter the clip, for 0.4 to 1.0 s; nobody has time to rise | | |

**The builder (`before/audit13.json`: 49 builders, the heading as the layer drives it; and the films).**

| Speed | Building on screen | Heading travels | Fastest quarter second | Most in any one second | After lying down |
| --- | --- | --- | --- | --- | --- |
| Real time | 270 s | 8.6 rad (most 11.6) | 8.6 rad/s (most 10.5) | 2.3 rad (most 2.8) | 1.3 rad (most 2.4) |
| Watch 4x | 67.5 s | 8.6 | 8.6 | 2.3 | 1.3 |
| 1 min/s | 4.5 s | 8.5 (most 11.6) | 8.7 (most 12.3) | 3.8 (most 4.6) | 1.3 |
| 10 min/s | 0.45 s | 6.3 (most 8.1) | 15.6 (most 20.8) | 6.3 | 1.4 |

Films: `N1` and `N6` (Real time) one or two turns in 60 s, fastest quarter second 3.9 to 8.7 rad/s; `N2` (Watch 4x) up to 7.4 rad in a building, five turns in a minute, up to 13.7 rad/s; `N3` (1 min/s, 160 m map) six builders 7.4 to 9.9 rad in 3.0 to 3.7 s, 0 to 2 reaches; `N5` (1 min/s, field map) 7.9 to 12.5 rad in 2.1 to 3.7 s; `N4` (10 min/s) up to 6.8 rad in 0.1 to 0.7 s.

**The loops (`before/audit13.json`).**
- Feeding in a crown, 120 s, best shift within 15 s: eight feeders, median over 28 pairs 0.42, highest 0.94, 9 pairs over 0.7; 49 feeders, median 0.56, 378 of 1,176 pairs over 0.7. The higher wrist over 30 s (stage W12's measure): median 0.53, highest 0.98.
- The leaf sponge, 13 sponge drinkers among ids 1 to 49, 120 s, best shift within 6 s: median 0.06, highest 0.985, 6 of 78 pairs over 0.5.
- Builders, 49: bars 2.62 to 3.95 s; 143 of 1,176 pairs have bars within 0.1 s of each other; for those pairs the higher wrist over 60 s correlates 0.41 at the best shift (highest 0.78, six pairs over 0.6; no other pair is over 0.6).

### 0.4 What the simulation publishes about a call, and what the clip uses

Read in `src/types.ts` and, read-only, in `src/sim/events.ts`, `execution.ts` and `candidates.ts`.

| Published | Where | Used by the clip today |
| --- | --- | --- |
| Who calls and that it is in the call act | `Chimp.action === 'call'` (0.5 to 1 simulated minute) | yes: the pant-hoot clip, or the drumming clip when `vocal` is `drum` |
| The kind of call and when its voice ends | `Chimp.vocal`, `Chimp.vocalUntil` (45 simulated seconds for a pant-hoot) | the face of a call over any clip |
| The call as an event: caller, community, place, time, radius | `World.calls` | sound, the arc, listeners; not the caller's own picture |
| Whether it answers another | not a field; it follows from `World.calls` (an earlier pant-hoot of its own community whose radius holds the caller) | no |
| Age, sex, life stage | `Chimp.age`, `sex`, `stage` | no (the body's size only) |
| Rank | `Chimp.rank` (0 to 1), `rankOrder` | no |
| Mood | `Chimp.mood` (the call act sets `excited`) | hair and brow of an aggressive or fearful mood |
| Arousal | `Chimp.stress`; on Track E worlds the body state `bodyStateOf` gives; read by the layer about once a second (`bodystate.ts` `arousal`) | the coat only |
| What it was doing | the act before, and the posture the body is drawn in | no |
| Whether it is in a crown | the drawn height | no |

Not published and not invented here: who joins a chorus, when, and how loud. A pant-hoot given outside the call act (110 of 267 on the field map while travelling, others on arrival at food or after a display) keeps the clip of that act with the face of the call over it.

### 0.5 What will count as fixed

Read on the changed build with the same scripts, the same worlds and the same ticks.

1. **Nobody raises both arms.** In `audit13.mts` A no animal of the ten has both wrists above its head at any time (before: all ten, 9 s of 45 each, up to six at one instant), on the ground, in a crown, or from all fours. In films `CH1` to `CH6` no caller has both wrists above its head while it is in the pant-hoot clip.
2. **A call is one pant-hoot.** In the films at Real time a caller gives one sequence in its call act (before: five risings in 45 s), and no joint steps more than 5 cm in one frame inside the clip (before: 0.6 to 1.0 m at every rise).
3. **The picture follows who the animal is.** In the row of ten no infant, juvenile or female is upright on two legs at any time, and nobody in a crown is. In the films the females (21, 36, 15 and 12 years) and the callers on a limb are never upright. Over many calls a top-ranking adult male is upright at the climax in fewer than half of his calls and a bottom-ranking one in none unless aroused; a more aroused animal rises further than the same animal calm (a test).
4. **Callers started together are not copies.** Over the 45 pairs of the row, the share of the call two animals spend within the posture tolerance of each other has a median under 0.4 at the same instant (before 0.72) and under 0.5 at the best shift within 6 s (before 0.99), and no pair is within it for more than 0.85 of the call (before 0.99 and 1.00). The ten show at least three posture classes at their climax (seated, on all fours, upright; before one). Their first wide-open mouths are spread over at least 4 s (before 2.6 s).
5. **Joining.** A caller whose call begins just after another's nearby does not start at the beginning of the sequence: eight joiners enter at eight different points (a test); who joins is the simulation's, unchanged.
6. **No step into or out of a call.** In film `CH2` the alpha's heading travels under 0.2 rad in the first second of his call (before 2.64) and no joint of a caller that was feeding, resting or standing steps more than 5 cm in one frame in the second after the clip starts or ends (before 21 cm at the lips). The 35 to 40 cm at a toe of an animal that leaves the climbing clip is older, is the same on every clip that follows a climb, and is not promised here.
7. **The builder turns no faster than a turn is read.** The limit is 0.9 rad a second: the figure above which the layer already draws a standing animal stepping round instead of turning on the spot (`creatures.ts`: "turning more than about 50 degrees a second"). A seated builder has no stepping clip, so its heading must stay under it. In `audit13.mts` B, at every speed, no builder's heading travels more than 0.9 rad in any one second or faster than 0.9 rad/s over a quarter second (before 2.3 to 6.3 rad and 8.6 to 15.6 rad/s), and in films `N1` to `N6` the same within 10% (the film's clock is uneven).
8. **The turns fit the time a watcher has.** At Real time a builder still faces five ways in a building (four turns for at least nine builders in ten); at 1 min/s it makes at most one turn and one or two reaches; at 10 min/s no turn. In films `N3` and `N5` no builder's heading travels more than 1.5 rad in its building (before 7.4 to 12.5).
9. **It settles.** After it lies down a builder's heading travels under 0.2 rad (before 0.5 to 2.6 rad in the films): it sleeps facing as it last sat.
10. **Feeding in a crown is each animal's own.** Eight feeders over 120 s, best shift within 15 s: median at most 0.3 (before 0.42), no pair over 0.7 (before 9 of 28); 49 feeders: at most 12 of 1,176 pairs over 0.7 (before 378). No two of eight feeders have the same order of steps over their first twenty cycles, and one feeder's cycles differ in length by more than 4 s. The hand still reaches the mouth with the elbow below the shoulder (stage W9's tests, kept).
11. **The leaf sponge.** 13 sponge drinkers, 120 s: no pair over 0.6 at the best shift (before 0.985), none over 0.5 (before 6 of 78).
12. **Builders' tempos.** Pairs of the 49 with bars within 0.1 s: at most 110 of 1,176 (before 143), and no pair's higher wrist correlates over 0.6 at the best shift over 60 s (before six).
13. **The same animal twice.** Every changed clip gives the same pose for the same animal at the same time on two runs, and no `Math.random` is added under `src/render`.
14. **Nothing else moves.** `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` untouched and passing; `git diff --stat track-e` names only `src/render/`, `tests/render-*` and `docs/staging/`; `tsc --noEmit`, `gen-params --check`, the render and interface tests, the whole suite and `pnpm build` pass.

Not covered by this registration: frame time on the graphics card (no probe of it may run today; the change adds no draw call, texture or material); a live model; the three drinkers that stand up in one frame because the simulation ends their drinks in one tick; a pant-hoot given outside the call act keeps that act's body.

### 0.6 What each choice will rest on

The project's sources are the entries of `docs/research.md`; `docs/visual-plan.md` (A9) lists the pant-hoot build-up among the faces after Parr 2007. Nothing below is a new source.

| Choice | Rests on |
| --- | --- |
| Most callers keep the posture of what they were doing: seated where they fed, groomed or rested, on all fours where they travelled, seated on the limb in a crown | [fedurek2014] "Context: travel 50.30%, feeding 25.45%, resting 16.60%, displaying 7.65%"; [southern2025] "travel 45%, feeding 29%, rest 18%, display 7.5%". How a caller sits is not in the file: a stylization |
| Standing upright and swaying or stamping at the climax is rare and an adult male's | the same two lines (a display context in about 7.5% of pant-hoots); [hattoriTomonaga2020] "rhythmic swaying, more in males ... adult males perform rhythmic displays" [captive; the wild reports as summarised there]. The share drawn is a design choice aimed at that 7.5% |
| Hair on end at such a climax; on a limb the caller shakes the branch it holds | [mullerWrangham2004b] "Charging displays involved exaggerated locomotion, piloerection and branch shaking" |
| Higher rank, more vigour | [southern2025] "Higher rank called more"; [wilson2007] rank and rate; [fedurek2016] "high-ranking males called more". The sources say how often, not how vigorously: the step from one to the other is a design choice |
| Females and the young call less dramatically | [holden2024, low] "females 0.61 ± 0.58 per hour against males 1.60 ± 1.13; 9.9% of 232 female and 30.5% of 295 male pant hoots were spontaneous, the rest replies"; [crunchant2021] "males 1.91 per hour, females 0.84, juveniles 0.50". Again rates, not postures: a design choice in that direction |
| Nobody drums unless the simulation says so | [clarkArcadi2004] "no females drummed"; the drumming clip stays the simulation's call |
| Others join a caller part-way | [fedurek2013] "males more often joined the pant hoots of preferred long-term partners"; [wilson2001] "Parties with three or more adult males chorused". Where in the sequence a joiner enters is not in the file: a design choice |
| A caller listens after its call | [southern2025] "75% got a vocal reply" |
| The lips pushed forward | Parr et al. 2007 (the pant-hoot among the faces told apart by muscle action) |
| A hand on a branch overhead in a crown | Hunt 1992 (arm-hanging occurs), as stage W9's seat |
| The four parts of a pant-hoot (low hoos, faster pants, a climax, a let-down) and their lengths | no entry in `docs/research.md`. The old clip named them without a source and the stage's brief describes them; kept, and labelled a stylization in the code |
| Both arms raised in a V | no sentence of the project's sources describes it for any animal. Nobody does it |
| The builder's turning limit, how many turns fit, the reaches at 1 min/s | no source; a drawing rule. The building time is the simulation's ([khayer2025] "adult great apes take 2 to 5 min on average") |
| The order and length of a feeder's steps, the sponge's dips | no source (stage W9 and W12 say so of the clips they changed); stylizations |
