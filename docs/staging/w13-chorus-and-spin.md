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

## 1. What a person sees now

Read from the third run's films and harness rows (the build at 2a09e9d). Two things seen in those films were repaired afterwards in a commit that no film has seen (a645742; section 6): they are named where they belong.

- **A caller.** It calls once. A female, a young animal or a quiet male stays as it was: seated where it fed or rested, each in its own seat (hunched or leaning back, a hand on a knee, on a shin or with the knuckles on the ground, some squatting), or standing on all fours if it had been standing or drinking. Its lips push forward and open a little on each low hoo, the head comes up, the pants quicken, the mouth opens wide for a second or two with the head back, the pants slow, the mouth shuts, and it sits with its head a little raised, listening, until its act ends. A male of some vigour gets up onto all fours through the build-up, with his hands going down in front of him, and sits again afterwards. A top-ranking or aroused adult male now and then stands up on two legs for the climax, hair on end, arms hanging out from his body, swaying or stamping, and comes down again. Nobody raises an arm. On a limb everybody stays seated with a hand on a branch.
- **A chorus.** Callers that begin together are a group: the row of ten shows seated animals, squatting ones, two males who rise to all fours at different moments, and their mouths open wide at moments spread over four seconds (`pictures/2-ten-callers-after.jpg`; with the animals top-ranking and aroused one male stands, three more animals rise to all fours, `pictures/3-...`). Before: `pictures/1-ten-callers-before.jpg`. In the app the alpha male and a female of 12 called together on the field map: he stood once at the climax with his arms down, she stood on all fours as she had while drinking (`pictures/4-...`).
- **The start of a call.** The body no longer swings round: it calls facing as it faced.
- **A builder.** While it builds, a turn takes two to four seconds and the heading never moves faster than 0.9 rad a second. At 1 min/s it turns once, a little, or not at all, and does not turn back when it lies down. At 10 min/s it does not turn. What is still wrong in the films: in its first second in the nest, as it arrives, the body turns from the way it came to the way it sits as fast as before (up to 3 rad in a third of a second); and at 1 min/s its arm jumped up and down for about a second (`pictures/5-builder-heading-before-after.png` shows the headings). Both are what a645742 repairs.
- **Feeding in a crown.** No two feeders run one sequence. One pulls a cluster in and picks from it three times with a pause between; its neighbour reaches into the leaves once and chews; a third only looks round. A cycle lasts 3 to 23 s.
- **Drinking.** The sponge goes down and comes up at its own time each time, is sucked for a longer or shorter moment, and now and then stays on the knee while the animal looks up. The animal with its lips at the water lifts its head every 6 to 12 s.

## 2. What was changed

Renderer only. Five source files, one new; three test files, one new.

- `src/render/creatures/poses.ts`.
  - **The pant-hoot** (`pantHoot`, `callStyle`, `callVigour`, `hootEnv`, `hootFace`, `hootSeat`, `hootQuad`, `hootUpright`, `hootLimb`). One sequence per call, each part of a length drawn for that call (low hoos 1.5 to 5 s, build-up 2.2 to 5.2 s, climax 1 to 3.3 s, let-down 0.9 to 2.5 s), then listening. A vigour from 0 to 1: the class by age and sex, standing for adults, arousal above a calm caller's, and a share of the call's own. From it: whether the caller rises to all fours (0.46 and over, nobody under eight years), whether an adult male stands upright at the climax (0.78 and over: 8.8% of calm adult males' calls over the ranks, 36% of a top male's and none of a middle or bottom male's; with arousal at 0.6, 87%, 47% and 6%; no female, adolescent or younger animal ever), what he does there (sway or stamp; a slap of the ground on all fours; a shake of the branch on a limb), how wide the mouth opens, how long the climax lasts. The base posture is the clip's role: seated or on all fours. A rising body keeps its feet where they are. The head is held against the look system through the build-up and climax and given back afterwards.
  - **The face of a pant-hoot given during another act** (`vocalOverlay` with the caller's context): the same parts, eased in and out, with half the head raise. It was one pulse for 45 simulated seconds, with the head tipped back in one frame.
  - **Crown feeding** (`feedPlan`, `crownFeed`): cycles of uneven length; each is a cluster with one to five picks and pauses, a reach into the leaves, or a look round; the pull and pick times are the animal's own.
  - **Drinking**: the leaf sponge on uneven bars with a soak, a suck and pauses; a look up for the lip drinker.
  - **Nest building**: mean bars of 2.6 to 5.2 s (they were 2.6 to 4.0), each bar its own length, on a clock that drifts (`ownDrift`), each reach its own length; and a brief building (`PoseCtx.span` under 15 s: one reach or two, none under 1.5 s).
  - `barStart`, `ownBar`: bars of uneven length without a running sum.
- `src/render/creatures/perch.ts`. `nestTurnStep` (which planned turns are made, given the real seconds left of the building), `slewTurn` and `slewHeading` (a turn at no more than 0.9 rad a second, eased), `nestTurnAngle`. `nestTurn` and `nestTurnAt` are still the plan.
- `src/render/creatures/call.ts` (new). `callJoin`: whether a call began alone, joined a pant-hoot begun within 40 m no more than a tick before, or answered an earlier one that reached the caller, read from `World.calls`. `callAge`, `callNumber`.
- `src/render/creatures.ts`. A record of the pant-hoot each animal is giving (when its voice ends, seconds since first drawn, its number, the arousal and the join it began with); the base posture chosen when the clip begins; the heading held through a call; the builder's turns through `nestTurnStep` and its heading through `slewHeading`; 0.45 s into and out of the call clip.
- `src/render/creatures/harness.ts`. In `mode=stages`: `&action=call` gives the row a voice; `&was=<act>&after=<s>` starts it in another act; `&chorus=1` publishes the calls; `&rank=`, `&stress=` (also in `mode=single`).
- Tests: `tests/render-call.test.ts` (new, 15); `tests/render-perch.test.ts` (stage W9's four crown feeding tests now find a cycle through `feedPlan`; they hold what they held); `tests/render-step.test.ts` (stage W12's line "a chorus keeps one cycle" is gone; a comment on the turn plan).

## 3. Before and after

Seed 48, the same ticks; the world's hash at the start of the four films that jump the clock is the same on both builds (`f29ba727:4227453`, `8107aa27:521718`, `35b6964b:431024`, `80026a98:540131`). "After" is the third run (2a09e9d). One rule of the probes was tightened during run 1 (section 4): the unchanged build is given as read with the final rule.

**Ten callers started together, 45 s (`audit13.mts` A).**

| | Before | After |
| --- | --- | --- |
| Both wrists above the head | all ten, 9 s each, up to six at one instant | nobody, 0 s (also in a crown and from all fours) |
| Upright on two legs | all ten, five times each | nobody in a calm, middle-ranking row; one of ten for 3 s when top-ranking and aroused |
| Pant-hoots in a call | five | one |
| Share of the call two animals are in one posture, median pair; at the best shift | 0.72; 0.99 | 0; 0 |
| Pairs in one posture for more than 0.85 of the call | 6 of 45 at the same instant, 45 of 45 at the best shift | 11 of 45 |
| Postures at the climax | one | seated, squatting, on all fours (and upright, top-ranking and aroused) |
| The mouths first open wide over | 2.6 s | 4.1 s |

**Callers in the films (`an13.mjs`).**

| Film | Caller | Before: upright; both wrists above the head (in the clip) | After |
| --- | --- | --- | --- |
| `CH1` | male 17, after a pant-grunt | 8.6 s in 5 rises; 8.1 s | on all fours throughout; 0 s; one pant-hoot |
| | female 21, after resting | 12.1 s in 7; 11.2 s | seated; 0 s; one |
| | female 36, on a limb | 8.7 s in 5; 8.1 s | seated on the limb; 0 s; one |
| | male 13, on a limb | 1.8 s in 1; 1.5 s | seated on the limb; 0 s |
| `CH2` | alpha male 27, after feeding | 8.6 s in 5; 8.0 s | seated, then upright once for 2.0 s at the climax, arms down; 0 s |
| | female 12, after drinking | 6.2 s in 4; 5.9 s | on all fours; 0 s |
| `CH3` | male 33, alone, standing | 8.7 s in 5; 8.1 s | on all fours; 0 s; one |
| `CH4` | female 15, alone, feeding | 8.6 s in 5; 8.0 s | seated; 0 s; one |
| `CH5` | male 41, answering from 402 m | 8.6 s in 5; 8.2 s | seated, on all fours for 3.3 s, seated; 0 s; one |
| `CH6` | male 17, after a display | 1.7 s in 1; 1.6 s | on all fours; 0 s; one |

**The start and the end of a call (the same films).**

| | Before | After |
| --- | --- | --- |
| Heading in the first second, alpha after feeding | 2.64 rad | 0 |
| Heading in the first second, male standing | 1.11 rad | 0 |
| Largest step of a joint in one frame, the second after the start | 4 to 21 cm (21 at the lips of the feeding alpha) | 2 to 16 cm (the alpha 1.2 cm at the change, then 11 cm at a fingertip 0.3 s in; 16 cm at an elbow of a female that was picking) |
| Inside the clip | 52 to 101 cm at every rise | 1 to 8 cm; 19 cm in one long frame as the alpha stands (7 cm an ordinary frame, at a fingertip) |
| The second after the end, where the animal stands up at once | 12 cm | 21 cm in one long frame (5 to 8 cm an ordinary frame: the layer's sit-to-stand) |

**The builder: 49 builders, one whole building (`audit13.mts` B; the turn as `nestTurnStep` draws it).**

| Speed | On screen | Heading travels | Fastest quarter second | Most in one second | Turns | After lying down |
| --- | --- | --- | --- | --- | --- | --- |
| Real time | 270 s | 8.6 -> 7.0 rad | 8.6 -> 0.9 rad/s | 2.3 -> 0.9 rad | 4 -> 4 | 1.3 -> 0 rad |
| Watch 4x | 67.5 s | 8.6 -> 6.5 | 8.6 -> 0.9 | 2.3 -> 0.9 | 4 -> 4 | 1.3 -> 0 |
| 1 min/s | 4.5 s | 8.5 -> 1.1 (most 1.4) | 8.7 -> 0.85 | 3.8 -> 0.73 | 4 -> 1 | 1.3 -> 0 |
| 10 min/s | 0.45 s | 6.3 -> 0 | 15.6 -> 0 | 6.3 -> 0 | 1 -> 0 | 1.4 -> 0 |

**Builders in the films.** The first 1.2 s in the nest (the arrival) are given apart.

| Film | Before: after the first 1.2 s | After: after the first 1.2 s | The arrival, both builds |
| --- | --- | --- | --- |
| Real time (`N6`) | 2.2 and 5.0 rad/s over the fastest half second; 1.1 and 2.5 rad in a second | 0.76 and 0.90 rad/s; 0.68 and 0.90 rad | up to 2.2 rad at 5 to 10 rad/s |
| Watch 4x (`N2`, four builders) | 1.8 to 4.8 rad/s; 0.9 to 2.4 rad in a second | 0.65 to 0.93 rad/s; 0.58 to 0.90 rad | up to 3.1 rad at 13 rad/s |
| 1 min/s (`N3`, `N5`, nine builders) | travels 3.4 to 6.7 rad at 3.3 to 8.4 rad/s; 0.5 to 2.6 rad more after lying down | travels 0.13 to 0.81 rad at 0.16 to 0.90 rad/s; 0 to 0.07 rad after lying down | 0.4 to 3.0 rad at up to 12 rad/s |
| 1 min/s, the whole building | 7.4 to 12.5 rad | 0.75 to 3.5 rad | |
| 10 min/s (`N4`, nine builders) | 0.4 to 6.8 rad in 0.1 to 0.7 s; 0.3 to 2.0 after lying down | 0 to 3.1 rad (the arrival); 0 to 0.08 after lying down | |

**The loops.**

| | Before | After |
| --- | --- | --- |
| Feeding in a crown, 8 feeders, 120 s, best shift within 15 s: median pair; closest; pairs over 0.7 | 0.42; 0.94; 9 of 28 | 0.29; 0.62; 0 |
| The same, 49 feeders: pairs over 0.7 | 378 of 1,176 | 5 |
| Film `G1`, five feeders in one crown, a minute, higher wrist at the best shift: median; closest | 0.62; 0.94 | 0.42; 0.70 |
| Film `G2`, nine feeders | 0.30; 0.89 | 0.26; 0.47 |
| Leaf sponge, 13 drinkers, 120 s: closest pair; pairs over 0.5 | 0.985; 6 of 78 | 0.34; 0 |
| Film `L1`, two sponge drinkers | 0.92 | 0.50 |
| Builders, 49: pairs with bars within 0.1 s | 143 of 1,176 | 76 |
| Builders: pairs whose higher wrist correlates over 0.6 in a minute; closest | 6; 0.78 | 0; 0.59 |

## 4. The three runs

- **Run 1 (01:41 EDT).** The new tests and the audit, no browser. 5 of the 15 new tests passed; the 29 of the two older files passed. Found: a hand put down beside a seated caller went under the ground and the ground snap lifted the whole body 12 cm; the probes' rule for "upright" (hips above 0.42 body lengths) read the crouch between sitting and all fours as upright, and was tightened to hips above 0.5 with the trunk within 0.6 rad of upright (the unchanged build reads the same five rises with it, 8.6 to 8.7 s where it read 8.8); the slap of a hand was faster than a hand moves; the tests had mistakes of their own (a negative zero, a float compared exactly, a drawing rule I had written down wrongly). Builder, feeding, sponge and bars already read within the registered figures except one pair of builders at 0.61.
- **Run 2 (01:48).** Tests and audit again: 41 of 44. Found: the pants of the build-up opened a quiet caller's mouth as wide as its climax, so "one pant-hoot" read as nine; 14 of 45 pairs of the row sat in one posture for the whole call; one pair of builders at 0.65. Changed: the seat (lean, hunch, a squat), the pants scaled by vigour, the parts of a call longer or shorter by more, a rising body's feet kept in place, a clock that drifts for builders and sponge drinkers.
- **Run 3 (01:56 to 02:20).** The 44 tests passed. The audit, four harness rows and the 17 films are the "after" of section 3. The films showed the two faults of section 6. No code was run after it but the checks of section 5.

Two of the three runs were spent before the first film was taken. That left one look at the app, and what that look found could not be filmed again.

## 5. The registered statements, one by one

1. **Nobody raises both arms: met.**
2. **A call is one pant-hoot: met. No joint steps more than 5 cm in a frame inside the clip: not met as worded.** 1 to 8 cm for callers that sit or stand; 7 cm an ordinary frame at a fingertip while the alpha stands up (it was 52 to 101 cm at every rise). A fast arm, not a jump.
3. **The picture follows who the animal is: met.**
4. **Not copies: met for the median pair (0 and 0, under 0.4 and 0.5); not met for "no pair over 0.85".** Eleven of 45 pairs of the calm row sit alike for the whole call: quiet callers whose seats happen to be close. Before, six pairs did at the same instant and every pair did a moment apart. The row shows three postures at the climax, but not the three I named: nobody stands in a calm, middle-ranking row, because an upright climax is rare by design. Mouths open over 4.1 s: met.
5. **Joining: met** (a test). Eight joiners enter 2.4 to 5.4 s into sequences of 9 to 12 s: 3.25, 5.40, 5.16, 3.28, 2.37, 4.82, 4.86 and 3.64 s. Two pairs of them fall within 0.05 s of each other by chance.
6. **No step into or out of a call: met for the heading (0 rad; it was 2.64), not met as worded for the joints.** The turn that stepped the lips is gone. Other blends still move a joint 5 to 16 cm in a frame at some starts (an arm that was picking, a body rising from the drinking crouch, a hand going down onto its knuckles), and an animal that stands up the moment its call ends does so at the layer's ordinary pace.
7. **The builder's limit: met in the audit at every speed; in the films met after the first 1.2 s and not met in them.** The arrival turn is as fast as before.
8. **The turns fit the time: met in the audit (four, four, one, none). In films `N3` and `N5` not met:** 0.75 to 3.5 rad in a building where I registered 1.5 (it was 7.4 to 12.5); the arrival turn is the difference. One or two reaches at 1 min/s: held by a test with the span fixed, not seen in the films, where the arm jumped.
9. **It settles: met** (0 to 0.08 rad after lying down; it was 0.3 to 2.6).
10. **Feeding: met.**
11. **The leaf sponge: met.**
12. **Builders' tempos: met.**
13. **The same animal twice: met.**
14. **Nothing else moves: met** (section 7).

## 6. Not done, and what is left

- **Repaired after the third run and not filmed (a645742, two lines of `creatures.ts`).** (a) The limit on a builder's heading skipped a body that "is moving", and a body that has just reached its place counts as moving for 0.8 s more: so the arrival turn went through the old damper. The test is now "in its nest and not clambering". (b) A brief building is laid out in shares of the seconds a building is on screen, and that was worked out from the rate the clock achieved in the frame, which moves between 45 and 75 at 1 min/s: the builder's arm jumped between its first and second reach for about a second. It is now worked out from the speed that is set. Both were type-checked and built; no unit test loads the creature layer; nobody has seen them in the app. Reverting a645742 gives the build the films are of.
- **A hand flicks** 11 cm in one frame, a third of a second into the call of an animal whose hand goes down onto its knuckles (the rig turns a locked hand by the short way round between two orientations, and the short way changes). **A male's arms** come up fast as he stands (7 cm a frame at a fingertip).
- **From a climb into a call** a hand or a toe steps 35 to 66 cm, as into any clip after the climbing clip (its holds on the bark end at once). Older; not this stage.
- **A body first drawn in a call** (the clock jumped into one, or the harness row started in the call act) has no posture to keep and is taken for a standing animal: it calls on all fours.
- **A pant-hoot given outside the call act** (110 of 267 on the field map while travelling) keeps that act's body. Only its face follows the call now.
- **At 1 min/s a call is on screen for under a second**: its first moment, as before.
- **Quiet callers that sit alike** stay alike (statement 4).
- **The three drinkers** still stand up in one frame: the simulation ends their drinks in one tick.
- **A source for the parts of a pant-hoot and for how callers sit or stand** is not in `docs/research.md`. Everything about them is labelled a stylization. Not looked for in this stage.
- **Frame time on the graphics card** was not measured. The creature layer's own update read 0.6 to 0.8 ms a frame before and 0.6 to 0.9 after over the 17 films (film by film 0 to 0.2 ms more; the films of the changed build ran beside this stage's own analyses).
- **Not seen** with a live model, on a second seed, or in a chorus of more than four (the simulation gave none in these two worlds).

## 7. Tests and checks

At the head (a645742), 13 October 2026, 02:24 to 02:32 EDT:

- `tsc --noEmit`: clean. The three test files type-checked by hand with the project's strict options: clean.
- `scripts/gen-params.ts --check`: valid, 1,050 entries, up to date, lint clean.
- The render and interface tests: 326, all pass.
- The whole suite, once (02:25 to 02:31, no other suite and no model process running, the 1-minute load at 3 before it and 17 at its height): 1,485 tests, 1,484 pass, none fails, 1 is skipped as on `track-e` (it needs `artifacts/validation/c7a-field1y.json`, which is not on this computer).
- `pnpm build`: passes.
- `git diff --stat track-e`: `src/render/creatures.ts`, `src/render/creatures/{call,harness,perch,poses}.ts`, `tests/render-{call,perch,step}.test.ts` and this document. Nothing under `src/sim`, `data`, `tests/fixtures` or `src/types.ts`; no `Math.random` added; no pass, target or material.
- Both probe servers (5203, 5204) are stopped and no browser of the stage is left.

## 8. For the integrator

### Commits (on `w13-chorus-and-spin`, from `track-e` at 10f8a70)

- d03758a: the registration, before any changed code ran.
- 2a09e9d: the change and its tests. The films, the audit and the pictures are of this build.
- a645742: two lines repaired after the third run, not filmed.
- this commit: sections 1 to 8.

### For the second reading

- Film builders arriving at their nests at Real time and at 1 min/s on a645742: the first second (`an13.mjs` gives the arrival apart), and the reaches at 1 min/s.
- Look at a male standing up in a call (`CH2`, the alpha at 18.7 s) and at a hand going down onto its knuckles (`CH2`, 12.1 s).
- The probes: `rv13.mjs '<json spec>'` (a film), `batch13.mjs before|after`, `an13.mjs <film.json>` (callers and builders), `hrow13.mjs <name> '<query>'` (the harness row; start it from another act with `was=forage&after=1`, or the row has no posture to keep), `audit13.mts` (no browser), `pics13.py`. `serve.sh before|after start|stop`.

### Merge notes

- `PoseCtx` has six new optional fields (`rank`, `arousal`, `callN`, `join`, `enter`, `span`). `vocalOverlay` has three new optional arguments. `feedCycle` is now a feeder's MEAN cycle; cycle n begins at `feedPlan(n, seed).start`. `Anim` has nine new fields.
- The role of the `pantHoot` clip is the base posture (`CALL_BASE`).
- Any picture comparison against an older build differs wherever an animal calls, feeds in a crown, drinks or builds.

### Lines proposed for AGENTS.md (not edited on this branch)

Under "Gotchas":

- The pant-hoot (stage W13, `render/creatures/poses.ts` `callStyle`, `render/creatures/call.ts`): one call of the simulation is one drawn pant-hoot, on a clock the layer starts when it first sees the voice (`Chimp.vocalUntil` changes), whatever clip the body is in. What the caller looks like is fixed then: its vigour from age, sex, rank and arousal, whether it joins or answers (from `World.calls`), and the posture it was in (the clip's role, `CALL_BASE`). Nobody raises an arm; only an adult male of high vigour stands. A clip that mixes postures keeps the feet where they are (`shiftPose`) and marks a hand planted only once the posture has stopped changing, or the contact locks re-plant in steps. All stylizations but the lines the section's comment cites.
- The layer is given the rate the clock ACHIEVES (`frame.simRate` is `clock.effectiveRate`: 45 to 75 at 1 min/s, from frame to frame). Anything laid out in shares of "how long this is on screen" must read the speed that is set, or it moves every frame (a builder's arm did).
- A builder's heading (stage W13, `perch.ts` `nestTurnStep`, `slewHeading`): `nestTurn` is the plan; the turns drawn are those a watcher has the time for, at no more than `NEST_TURN_MAX` (0.9 rad/s, the layer's own figure for a turn too fast to make on the spot), and what was turned stays when the nest is done. An animal in its nest is turned by `updateMotion` alone.
- Bars of uneven length without a running sum: `poses.ts` `barStart` (each boundary moved by a draw) and `ownDrift` (a clock that runs fast and slow by turns). `barStart` alone wobbles about a fixed grid: two animals with equal mean bars stay within a bar of each other for ever.

Under "Verifying a change": the stage's probes are in `…/watch-2026-10-13/w13-chorus-and-spin/` (servers on 5203 and 5204).

### Block proposed for IMPLEMENTATION_PLAN.md

```
## Stage W13: the chorus and the spin (render only)
**Goal**: what stage W12's second reader found still mechanical: every caller of a pant-hoot making the same stand with both arms raised on one nine-second loop; a nest builder turning through all its headings in the three seconds a building lasts at 1 min/s; feeders in a crown, leaf-sponge drinkers and builders on shared loops; a step into a call.
**Status**: Built on branch `w13-chorus-and-spin` from `track-e` at 10f8a70 (13 October 2026; `docs/staging/w13-chorus-and-spin.md`, registered before any changed code ran, three runs). Not merged. Nothing under `src/sim`, `data`, `tests/fixtures` or the contract changed. Field map and 160 m map, seed 48. A call is now one pant-hoot drawn by who gives it: nobody raises an arm (every caller did, five times in a call); females, the young and quiet males call seated or on all fours as they were, a male of some vigour rises to all fours, a top-ranking or aroused adult male sometimes stands (36% of a calm top male's calls, 8.8% over the ranks); callers that join enter part-way; a caller no longer swings round as it starts (2.6 rad in the first second, now none). A builder's turns take two to four seconds (0.9 rad/s at most; they were 8.6), at 1 min/s it turns once or not at all (1.1 rad of heading in a building in the audit, 8.5 before) and it no longer turns back as it lies down. Two feeders in a crown no longer match at any shift (0.42 to 0.29 on the median pair over two minutes, 378 of 1,176 pairs over 0.7 to 5), nor two sponge drinkers (0.985 to 0.34), nor two builders (six pairs over 0.6 to none).
**Open**: two faults seen in the third run's films were repaired afterwards in a commit nobody has filmed (a645742): a builder's first turn as it arrives in its nest was as fast as before, and at 1 min/s its arm jumped for a second. Registered clauses not met as worded: 11 of 45 pairs of quiet callers sit alike for a whole call; joints still move 5 to 16 cm in a frame at some starts of a call and 7 cm a frame as a male stands up; in the films a builder's heading travelled 0.75 to 3.5 rad at 1 min/s (7.4 to 12.5 before) where 1.5 was registered. No source in `docs/research.md` for the parts of a pant-hoot or for callers' postures. Frame time on the graphics card not measured.
**The user's**: how often a male should stand at the climax (now 8.8% of calm adult males' calls, 36% of a top male's); whether quiet callers should differ more in how they sit; whether a builder at 1 min/s should turn at all.
```


## 9. Continuation registration, 13 October 2026

The user asked Codex to take over, finish and verify the animation fixes. This is the continuation of the second reading, not a fourth run hidden inside section 4. The three original implementation runs and their failures remain above. Before any new run of changed code, this amendment records what is being inherited and what will be checked.

### 9.1 Inherited working state

The branch head is `49bbc57`. Four files have uncommitted second-reading changes: `src/render/creatures.ts`, `src/render/creatures/perch.ts`, `src/render/creatures/poses.ts`, and `tests/render-call.test.ts`, each with filesystem modification time 13 October 2026, 04:26:53 EDT. They add arrival-facing preservation, a five-second gap between nest turns, held playback-speed classification across pauses, slower entry into a call squat, visible voice movement, and idle life after the vocal sequence. These changes are preserved. The earlier `review/repaired-2` films ended at 04:32 EDT, but their contents and tests are not assumed to validate the current files.

### 9.2 The continuation checks

The continuation uses one private no-model probe server on port 5224 and one browser at a time, with `provider=server` and model policy off before the first frame. The frozen world, final source hashes, capture specifications, raw per-frame data, contact sheets and readings are kept under `/Volumes/Drive/chimpbench/shots/watch-2026-10-13/w13-chorus-and-spin/codex-final/`. The existing review's scenes and probes are reused. Nothing under simulation, data, fixtures or the shared world contract is to change.

The first pass reads the inherited changes and runs the focused call, perch and step tests, then records the actual current code in the browser. It covers nest arrival and completion at Real time, Watch 4x and 1 min/s, the 10 min/s transition, dawn finished nests, calls and their entry/exit in groups and alone, crown and ground feeding, drinking, and a second seed. The source stops changing during each capture. Every selected scene is inspected as pictures, not just read as correlations. Any repair is followed by the affected scenes again; at most two repair passes follow this initial continuation pass. New limits are not invented after a result is seen.

For nest turns, the existing 0.9 rad/s drawing limit and no return spin after sleep remain the targets. The first 1.2 seconds of arrival are included. At 1 min/s a build should have no more than one planned turn and visibly finish with the simulation. The transition into the nest must not consume the entire brief building in a spin. Callers must not repeat the old synchronized arms-up loop; they retain age/sex/posture differences and finish one vocal sequence before ordinary idle life resumes. The older five-centimetre frame-step claim is not silently relaxed: any remaining transition that fails it is reported with its clip and size. Quiet animals sharing a still posture is not a synchronization failure by itself.

After the focused checks and actual visual reading, the integrator will run one whole suite with test concurrency four and one production build on the combined W13 and model-repair head. This ownership amendment avoids duplicating the suite on a branch that will immediately be integrated; it changes no threshold. The integrator also owns a normal-Vite no-model browser check including persistence, because the scene probe server does not use the production WASM-serving plugins. GPU timing is separate: no GPU number is claimed from a capped, screenshot-recorded or concurrent workload. No model process runs beside this verification. The results below will distinguish inherited evidence, fresh evidence and any remaining limits. The branch is committed for the integrator; it is not merged or pushed by this worker.


### 9.3 Requested playback speed, before the first continuation run

Code review found that the inherited `speedSet` guesses the selected playback speed from smoothed achieved throughput, waits 0.6 seconds to accept a different bucket, and remembers it across pauses. The clock already publishes `ecoSecondsPerSecond`. The continuation instead passes that requested rate explicitly through a renderer-local extension of `SceneFrame` in `scene.ts`, then `CreatureFrame`, and through the two harnesses. The shared world contract in `types.ts` is unchanged. The achieved rate still drives interpolation, lighting, sound and animation time. The requested rate only sizes brief nest-building movements and chooses how many planned turns fit. This replaces the inference state and its tests. Browser checks include changing speed while paused and resuming, alongside the existing Real time, Watch 4x and 1 min/s films. A true change of playback speed takes effect on its first rendered frame; throughput noise does not re-plan the builder's movement.

### 9.4 First continuation repair, registered before execution

The first matrix exposed a remaining arrival case: seed 7 on the field map, animal 23, turns 2.55 radians as the renderer starts clambering from the bark to its nest; the fastest quarter-second reads 10.66 rad/s. Its offscreen pose is evaluated every quarter-second, so the recorded clip remains `nestBuild` through the first part of this move. This is not a planned construction turn. Both `updateMotion` and `placeGrounded` damp its clamber heading, bypassing the nest limit. At 10 min/s an explicit `arrived` snap also bypasses that limit. The repair gives a nest approach one heading owner: motion while seated, placement while clambering, both using the existing 0.9 rad/s limit; it removes the separate time-lapse arrival snap. It does not change the clamber path, simulation, or construction timing. The two affected scenes (N8 and N4), focused seed 48 compressed default/Watch approaches, and requested-speed/pause/Max checks will be filmed or measured again. Other first-pass scenes remain evidence of the unchanged call and gesture code. Remaining five-centimetre call measurements are classified using actual pose intervals and neighboring samples, not silently redefined as passing.

### 9.5 Call transition repair scope, before changed-code execution

The first continuation matrix also reproduces a real solved-limb discontinuity: CH1 animal 11 changes from climbing to calling at 33.45 seconds, with successive elbow and knee steps of 0.47, 0.42 and 0.40 metres at normal visible-frame cadence. This is not an offscreen sampling artifact. The two-bone solver's preferred bend plane changes sides while the target passes its pole; blending pose channels alone does not ensure continuous solved joints. The diagnostic replay saves exact pose buffers and solved skeletons before the repair.

The repair will keep the solver's current targets, reach limits and end-orientation locks, and add an optional caller-only previous bend-plane hint. It snapshots the prior visible skeleton once per pose evaluation, projects that plane onto the current reach direction, and rotates toward the normal preferred plane at no more than 4 rad/s (a drawing assumption: a half-turn takes at least about 0.8 seconds). Repeated contact solves in one evaluation use the same snapshot. The hint stays active through a call's exit until it reaches the ordinary plane; ordinary clips without the hint retain the original solver. Call transitions also receive the existing 0.45-second call blend before the shorter climbing transition is considered. Tests inspect solved positions, target preservation, repeated-solve stability, first/paused frames, exit convergence and the unhinted path. The affected calls are replayed after the repair, including the male's rise; remaining five-centimetre failures are still reported. This belongs to the first registered continuation repair, alongside the nest-arrival correction, not a new hidden tuning pass.
