# Stage W6: the decision shown on the body

Branch `w6-decision-beat`, cut from `track-e` at 7f9ec5b. Written 11 October 2026. Renderer and interface only: nothing under `src/sim`, `src/types.ts`, `data/` or `tests/fixtures` changed, no contract field and no parameter was added, the World is read and never written.

Where the stage comes from: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-behaviour_legibility.md`, issue "No decision beat on the body"; `visual-animation_and_motion.md`, issue "Nothing on screen shows what the animal perceives or is about to choose") and the two limits the review of stage W4 left open (`docs/staging/w4-reason-ui.md`, section 6). A viewer could see what each animal does, and not that it decided.

Everything this stage invents about how a chimpanzee looks or moves is a **stylization**, labelled so in code and listed in section 5. One statement rests on a source: initiators of a joint trip wait and check back (Budongo; `docs/research.md`, "Addendum: W6 decision beat").

## 1. What a viewer sees now

The renderer has always known an animal's next act two ticks (30 simulated seconds) before the drawn body performs it. Until now that lead only made name tags run ahead. Now the body uses it.

1. **Orient, then go.** In the last seconds before the body starts a new act:
   - the head glances at the runner-up option, when one was close in score and is somewhere else (0.8 s);
   - the head and eyes turn to what was chosen: the tree, the water, the partner, the caller, or the direction of the first step when the act has no target (1.6 s);
   - an intention movement plays (1.0 s): a seated animal about to walk off leans to its goal, puts its hands down and lifts its rump; one that stays, or sits in a tree, straightens and turns its chest; one on all fours shifts its weight forward. A lying animal sits up first. The body turns to its goal in this second, not two ticks early as before.
   - Then it goes.
2. **A party sets out in the order it chose.** Animals taking the same trip (the same tree, or following one of them) are drawn setting off one after another: 4 simulated seconds apart at Real time, 1.5 real seconds apart at Watch 4x. Before, all of them started on the same frame. A follower held back watches the first mover; the first mover looks back at the nearest follower a second after it sets off.
3. **An initiator that waits is seen waiting.** On the field map the simulation makes the initiator of a trip stand and check for company for up to a minute. It was drawn standing with a tag that read "travelling". It now stands facing its goal and looks between the goal and its companions.
4. **The tag says what the body does, for as long as it does it.** A walk to water read "about to drink" for two minutes and then "drinking" over a walking animal for the rest of the way. It now reads "about to drink", then "walking to drink" until the animal is at the water, then "drinking". The same for "climbing to feed", "coming down to drink", and "going to groom" when the animal pauses or runs. The strip in the chimp panel says the same, with the time: "Walking to drink · 4 min".
5. **The pose waits for the tag.** A body no longer strikes the pose of an act while its tag still reads "about to". Poses, pairings and tags all read one record of which act the drawn body is in. A groomer walking up is not paired with its partner until it is there, and the partner keeps its own pose until then.
6. **A real climb down, and up.** An animal leaving a crown sat on its branch while the simulation took it down, then dropped to the ground. It now goes to the trunk and climbs down in the climb cycle, lands at the foot and walks. Animals climbing to a crown are drawn on the trunk too (the brief asked for the way down; the way up uses the same rule, so that "climbing to feed" is true of the picture).

Not seen: a model-driven animal waiting for an answer. The rule is built (its gaze keeps moving between idle directions) and tested as a pure rule; no model was allowed, so nobody has looked at it.

## 2. How it is built

| Part | File | What it does |
| --- | --- | --- |
| Rules of the beat | `src/render/creatures/beat.ts` (new, no three.js) | The parts of the beat counted back in real seconds from the body's start; which runner-up counts; when the simulation first moves the animal; the order of a departure and how far a follower is drawn behind its own path; the look back; the rule for a model wait. |
| Intention movements | `src/render/creatures/intention.ts` (new) | Reads the posture from the evaluated pose (seated, on all fours, lying) and lays a half rise, a sit-up or a weight shift over it. `poses.ts` is not touched. |
| Which act the body is in | `src/render/creatures/drawn.ts` | The record keeps when the newest act began and the act the body is still in beside its ring of ten states. A stationary act is announced until the body's own drawn time has reached it, then for as long as it is on its way. `readDrawn` also says how it is on its way (`Way`). |
| The layer | `src/render/creatures.ts` | Reads the drawn act once a frame for every animal; pairings, the clip choice, the waterline and the nest place use it. `startBeat` and `updateBeat` fill the per-animal beat; `interpolateAll` draws followers behind their path; `updateAttention` takes the beat's gaze first; `placeGrounded` puts an animal on the trunk while its path goes up or down. |
| Tags and strip | `src/render/creatures/labels.ts`, `src/ui/inspector.ts`, `src/ui/format.ts`, `src/ui/contracts.ts` | The words for each way; `DrawnActView.way`. |

### What the renderer reads

Only the public contract: `Chimp.action`, `targetId`, `actionTime`, `candidates`, `position`, `partyId`, `controller`, `awaitingDecisionSince`; `World.trees`, `water`, `calls`, `modelPolicy`. Never `chimp.sim`. The travel goal the review suggested reading from `chimp.sim` is not needed: a trip's target is a tree, a call or nothing, and for "nothing" the head looks where the animal's own next recorded position is.

Two readings of the contract deserve a note:

- **Who chose first within a tick.** The simulation lets animals decide in roster order inside one tick, so a joiner always comes after its initiator. The order of a departure is therefore: the earlier tick first, and within a tick the earlier place in `world.chimps`.
- **Whether the act has taken its first step.** An act chosen at the start of an animal's turn has run one tick when the renderer first sees it (`actionTime` is 15 s); one chosen at the end of a tick, when the act before finished, has not (`actionTime` is 0). Without this the last stride of the act before was read as the trip beginning, and a waiting initiator was drawn as gone.

### What runs per frame

Nothing was added to the GPU: no pass, no texture, no shader change, no texel (`ROW_TEXELS` stays 132; the unused floats are still unused). On the CPU:

- **Every animal, every frame:** one comparison of act and target (as before); one reading of the drawn act (`readBody` and `readDrawn`: a distance, the two newest steps of the position record, a few comparisons). Stage W4 did this reading only for labelled animals (at most 20); it is now done for all, because the poses need it. One step of the lateness (three operations). In the clip choice a few more comparisons. For an animal above 0.3 m: one absolute value and one eased number for the trunk.
- **Every animal whose pose is evaluated this frame:** the posture is read from the pose (three reads); the intention overlay only while a beat is in its last second.
- **Only an animal whose act changed in the last eight drawn ticks (a beat is open):** the first-step scan of its position record (five steps at most) until the step is found; the countdown; the gaze code. On the field map that is a handful of animals at a time (165 changes of act among 49 animals in 90 s at 1 min/s).
- **Only while some open beat is a trip:** four typed arrays are filled (one entry per animal) and each trip's place in its departure is counted against the others (a loop over the animals per member).
- **When an act changes** (1.3 to 2.5 times per animal-hour): the target and the runner-up are looked up (map reads for trees and water, a scan of the options, at most 12).
- **Allocation:** none per frame. Fixed objects per animal are created with the animal (one beat record of 25 fields). The clip choice returns a small array per call, as it did before.

Frame time was not measured: the GPU probe is off limits today. The census of section 4.6 ran at 56 frames per second in a headless browser at 1440x900, on a shared machine; that is not a measurement of cost.

### Constants (all stylizations or interface conventions; none is a simulation parameter)

| Constant | Value | Meaning |
| --- | --- | --- |
| `GLANCE_S`, `LOOK_S`, `INTENT_S` (`beat.ts`) | 0.8, 1.6, 1.0 real s | the three parts of the beat; together 3.4 s, under the 3.75 s of one tick at Watch 4x |
| `RUNNER_MARGIN` | 0.1 | a runner-up is close when its score is within this of the chosen option's, or above it |
| `STAGGER_ECO_S`, `STAGGER_REAL_S` | 4 simulated s, 1.5 real s | time between two starts of one departure (the longer of the two) |
| `LATE_MAX_TICKS` | 1.5 ticks | the most a follower is drawn behind its own path |
| `CATCH_UP` | 0.15 | a late body plays its path this much faster until it has caught up |
| `DEPART_WINDOW_TICKS`, `DEPART_RADIUS_M` | 8 ticks, 40 m | trips that began this close in time and are drawn this close together are one departure |
| `BACK_AFTER_S`, `BACK_FOR_S`, `WAIT_CYCLE_S` | 1.0, 1.8, 5 real s | the first mover's look back; a waiting initiator looks back for 1.8 s of every 5 s |
| `THINK_SCAN_S` | 0.9 real s | a model-driven animal waiting for an answer changes its idle gaze this often |
| `BEAT_KEEP_TICKS` (`creatures.ts`) | 8 ticks | how long a beat stays open after its act was first seen |
| far look (`beatGoal`) | beyond 12 m, 8 m out | a far target is looked at as a direction at about eye level |
| gaze spring (`updateAttention`) | 0.14 s half-life | a deliberate turn, slower than the 0.09 s of idle glances |
| trunk easing (`placeGrounded`) | rate 5 per s | between branch and bark; over the last metre the bark point meets the ground point |
| `TURN_MAX` and the overlay amounts (`intention.ts`) | 0.55 rad; rump 0.10 up, 0.07 forward | the half rise, the sit-up and the weight shift |

Unchanged from stage W4: `ARRIVED_M` 0.75 m, `SHUFFLE_SHARE` 0.45, `PATH_MOVING_MPS` 0.05, `ABOUT_MAX_RATE` 120 (nothing of the beat is drawn above 2 min/s), `ABOUT_TICKS` 6 (now only for a trip that has not set off).

## 3. What changed in stage W4's rule, on purpose

Three behaviours of `drawn.ts` are different. Seven of stage W4's sixteen tests in `tests/render-drawn.test.ts` were changed to say so (three rewritten: the rule, the stationary act, the ground forager; the simulation-driven one now makes its claim for the time after the two ticks; three gained the new field or the arrival rule), and two were added:

1. A stationary act where the animal already is was not announced: tag and pose turned at once, 30 simulated seconds before the drawn time reached the act. It is now announced for those two ticks, and the pose waits with it.
2. An approach was announced for at most six ticks. It is now announced for as long as the body is on its way.
3. A body within 0.75 m of its place counted as arrived while still walking. It now has to have stopped (a feeding shuffle still counts as the act).

Also new: an urgent act (a call, a display, a charge) is drawn the moment it begins, so it now also ends the moment the simulation ends it: the body stands while it waits for its next act, and does not go on calling. An animal that changes its mind on the way is drawn on the move, not back in the act before.

## 4. Proof

Folder `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w6-decision-beat/`, `before/` (the base commit, served from an exported copy) and `after/` with the same file names and framings. The four moments were found by running the simulation without a browser (`prescan.ts`, `prescan-groom.ts`); the app is brought to the same tick by whole ticks with the model policy off from the first frame, so the world is identical before and after (the world hashes match, table 4.1). Every number below is printed by `tables.py` from the JSON files beside it (`tables.md` is its output).

### 4.1 The same world before and after

| Capture | World hash at the jump, before | after | Same |
| --- | --- | --- | --- |
| leave, Watch 4x | 4d9edf9e:4251255 | 4d9edf9e:4251255 | yes |
| leave, Real time | 4d9edf9e:4251255 | 4d9edf9e:4251255 | yes |
| groom, Watch 4x | 59afaf74:4221306 | 59afaf74:4221306 | yes |
| groom, Real time | 59afaf74:4221306 | 59afaf74:4221306 | yes |
| water, Watch 4x | 5f0705b5:4232811 | 5f0705b5:4232811 | yes |
| water, Real time | 5f0705b5:4232811 | 5f0705b5:4232811 | yes |
| party, Watch 4x | 6df218f3:4259700 | 6df218f3:4259700 | yes |
| party, Real time | 6df218f3:4259700 | 6df218f3:4259700 | yes |
| small map, tick 600 | 4344bb26:450492 | 4344bb26:450492 | yes |
| small map, after 60 played ticks | e1fc52dd:453550 | e1fc52dd:453550 | yes |

### 4.2 The four moments: what the body does before it starts

The moments (West and East communities, the first day, no rain):

| Moment | Tick the act changes | What happens |
| --- | --- | --- |
| leave | 1003 (10:41) | Koruza, adult male, has fed for 69 minutes in a fig crown at 12 m and takes a trip to a fig 257 m east, alone. |
| groom | 246 (07:31) | Fwambo, a male of 12, gets up from a rest of 19 minutes and runs 19 m to groom Dalubi, who is grooming Akiwe. |
| water | 450 (08:22) | Mbelo, adult male, feeding on the ground, goes to drink at a stream 73 m away: 13 ticks of walking. |
| party | 1354 (12:08) | Dembiri (13) stops grooming Ilobe and takes a trip 695 m north; Yerubi (7), Sanaki, Ilobe and Kiboro take the same trip within three ticks. |

From the simulation's change of act to the drawn body's first movement (its path faster than 0.05 m per ecological second).

| Moment, speed | Build | Simulation changes act at | Body starts after | Drawn meanwhile (clip, seconds) | Head off the goal in the last second before it starts | Nearest the head came to the runner-up | Seconds of beat (glance, look, intention) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| leave, Watch 4x | before | +3.9 s | 3.9 s | perch 3.9 s | 102° | 167° | 0.0 |
| leave, Watch 4x | after | +3.7 s | 3.9 s | forage 3.9 s | 3° | 70° | 3.4 |
| leave, Real time | before | +15.0 s | 15.7 s | perch 15.7 s | 48° | 104° | 0.0 |
| leave, Real time | after | +15.0 s | 15.7 s | forage 15.7 s | 15° | 67° | 3.4 |
| groom, Watch 4x | before | +3.8 s | 3.8 s | sitIdle 3.8 s | 10° | 8° | 0.0 |
| groom, Watch 4x | after | +3.7 s | 3.8 s | rest 0.3 s, sitIdle 3.4 s | 18° | 3° | 3.4 |
| groom, Real time | before | +14.9 s | 15.1 s | sitIdle 15.0 s, groom 0.1 s | 44° | 15° | 0.0 |
| groom, Real time | after | +15.0 s | 15.1 s | rest 11.6 s, sitIdle 3.5 s | 16° | 1° | 3.4 |
| water, Watch 4x | before | +3.8 s | 4.0 s | drink 4.0 s | 121° | - | 0.0 |
| water, Watch 4x | after | +3.7 s | 3.9 s | forage 3.9 s | 2° | - | 2.6 |
| water, Real time | before | +15.0 s | 15.6 s | drink 15.6 s | 151° | - | 0.0 |
| water, Real time | after | +15.0 s | 15.6 s | forage 15.6 s | 1° | - | 2.6 |
| party, Watch 4x | before | +3.7 s | 7.6 s | stand 3.7 s, walk 0.7 s, stand 3.2 s | 13° | 2° | 0.0 |
| party, Watch 4x | after | +3.7 s | 7.6 s | groom 7.6 s | 1° | 4° | 3.4 |
| party, Real time | before | +14.9 s | 30.6 s | stand 15.0 s, walk 0.7 s, stand 14.9 s | 7° | 18° | 0.0 |
| party, Real time | after | +15.0 s | 30.6 s | groom 30.6 s | 8° | 5° | 3.4 |

The Real time captures film a window (leave 22 to 82 s, groom 24 to 64 s, water 24 to 44 s, party 38 to 68 s after filming begins, one tick before the simulation changes the act); their readouts run from the start of filming to the end of the window. The Watch 4x captures run to the end of the moment.

Reading:

- **What it does meanwhile.** Before, the body left its old pose the moment the simulation changed the act: the crown feeder sat idle for the whole lead, the forager went into the drinking pose 73 m from the water and held it, the groomer stood up and stood for two ticks, the resting animal sat up at once. After, the old act goes on (the groomer keeps grooming for his two ticks) until the last 3.4 real seconds.
- **The head, where the old code had no reason to look.** Leaving the crown and going to water, the head was 48 to 151 degrees off the chosen place in the last second before the body started; it is now within 1 to 15 degrees (the 15 is Koruza at Real time, still turning on his branch).
- **The head, where it already looked.** In the grooming and the party moments the old numbers are already small, for other reasons: a partner within 14 m was always looked at, and the standing first mover had been turned to its heading by the simulation two ticks early. The runner-up sat beside what the animal was already looking at in both, so the angle to it was small before as well (2 to 18 degrees, 1 to 5 after): the glance is in the pictures, not in this number. What is new there is that the turn happens in the beat, after the old act has run on.
- **The runner-up.** Koruza's close runner-up was the crown he sat in: he looks up into it, which this horizontal measure shows only as 67 to 70 degrees. Mbelo had no runner-up with a place, so his beat has no glance and lasts 2.6 s.

### 4.3 What the tag said

"Plain verb on the way": seconds the tag read the plain verb of a stationary act (drinking, grooming) while the drawn body was still more than 0.75 m from its place and walking or climbing. "About to in the act's own clip": seconds the tag read "about to" while the body was already drawn in the clip of that act.

| Moment, speed | Build | Tags of the subject, with seconds after the simulation's change of act | Plain verb on the way (s) | "About to" in the act's own clip (s) |
| --- | --- | --- | --- | --- |
| water, Watch 4x | before | "about to drink" +0.0; "drinking" +30.1 | 26.0 | 4.1 |
| water, Watch 4x | after | "about to drink" +0.0; "walking to drink" +3.9; "drinking" +56.2 | 0 | 0.0 |
| water, Real time | before | "about to drink" +0.0 | 0 | 15.8 |
| water, Real time | after | "about to drink" +0.0; "walking to drink" +15.6 | 0 | 0.0 |
| groom, Watch 4x | before | "about to groom" +0.0; "grooming" +10.2 | 0 | 0.3 |
| groom, Watch 4x | after | "about to groom" +0.0; "walking to groom" +3.8; "going to groom" +4.2; "walking to groom" +7.4; "grooming" +11.2 | 0 | 0.0 |
| groom, Real time | before | "about to groom" +0.0; "grooming" +40.8 | 0 | 0.4 |
| groom, Real time | after | "about to groom" +0.0; "walking to groom" +15.1; "going to groom" +16.5; "walking to groom" +29.2; "grooming" +45.0 | 0 | 0.0 |
| leave, Watch 4x | before | "about to travel" +0.0; "travelling" +3.9 | - | 0.0 |
| leave, Watch 4x | after | "about to travel" +0.0; "travelling" +3.9 | - | 0.0 |
| leave, Real time | before | "about to travel" +0.0; "travelling" +15.7 | - | 0.0 |
| leave, Real time | after | "about to travel" +0.0; "travelling" +15.7 | - | 0.0 |
| party, Watch 4x | before | "about to travel" +0.0; "travelling" +7.6 | - | 0.0 |
| party, Watch 4x | after | "about to travel" +0.0; "travelling" +7.6 | - | 0.0 |
| party, Real time | before | "about to travel" +0.0; "travelling" +30.6 | - | 0.0 |
| party, Real time | after | "about to travel" +0.0; "travelling" +30.6 | - | 0.0 |

Before, at Watch 4x, the tag read "about to drink" for 30 s (4.1 of them over a body already in the drinking pose, 73 m from the water) and then "drinking" over a walking animal for the last 26.0 s of the walk (104 simulated seconds). At Real time the body held the drinking pose under "about to drink" for 15.8 s. After: "about to drink", "walking to drink" for the 52 s of the walk, "drinking" when he stops at the water; both numbers are 0. The grooming rows show the same tag following the body through a run: "walking to groom", "going to groom" while he gallops, "walking to groom" for the last steps, "grooming".

### 4.4 Coming down

Seconds the drawn path of the subject was going down a tree (faster than 0.05 m/s, above 0.3 m), by the clip it was drawn in.

| Moment, speed | Build | Clip while going down (seconds) |
| --- | --- | --- |
| leave, Watch 4x | before | perch 10.2 |
| leave, Watch 4x | after | climb 10.0, perch 0.3 |
| leave, Real time | before | perch 40.9 |
| leave, Real time | after | climb 40.6, perch 0.3 |
| party, Watch 4x, animal 19 | before | perch 3.0 |
| party, Watch 4x, animal 4 | before | perch 9.2 |
| party, Watch 4x, animal 13 | before | perch 4.6 |
| party, Watch 4x, animal 19 | after | climb 2.9, groom 0.1 |
| party, Watch 4x, animal 4 | after | climb 9.0, forage 0.2 |
| party, Watch 4x, animal 13 | after | climb 4.5, perch 0.2 |

Koruza comes down 12 m in about 40 simulated seconds. Before, he was drawn seated on his branch for all of it and then put on the ground. After, he is on the trunk in the climb clip for all but the first 0.3 to 0.4 s (the clamber from branch to bark).

### 4.5 A party setting out

When each animal's drawn body first moved, in real seconds after the first of them (the animals in the order the simulation had them choose).

- Watch 4x, before: Dembiri +0.0 s, Yerubi -3.8 s, Ilobe +0.0 s, Sanaki +0.0 s, Kiboro +3.7 s (the simulation changed their acts at Dembiri +3.7, Yerubi +3.7, Ilobe +7.5, Sanaki +7.5, Kiboro +15.0)
- Watch 4x, after: Dembiri +0.0 s, Yerubi +1.5 s, Ilobe +4.5 s, Sanaki +3.0 s, Kiboro +3.7 s (the simulation changed their acts at Dembiri +3.7, Yerubi +3.7, Ilobe +7.5, Sanaki +7.5, Kiboro +15.0)
- Real time, before: Dembiri +0.0 s, Yerubi -15.1 s, Ilobe +0.2 s, Sanaki +0.1 s, Kiboro +14.9 s (the simulation changed their acts at Dembiri +14.9, Yerubi +14.9, Ilobe +29.9, Sanaki +29.9, Kiboro +60.0)
- Real time, after: Dembiri +0.0 s, Yerubi +4.0 s, Ilobe +12.1 s, Sanaki +8.1 s, Kiboro +14.9 s (the simulation changed their acts at Dembiri +15.0, Yerubi +15.0, Ilobe +30.0, Sanaki +30.0, Kiboro +60.0)

Before, the joiner Yerubi set off 3.8 s BEFORE the first mover at Watch 4x (15 s at Real time: the simulation moves a joiner in the tick it joins, while its initiator is still checking for company), and Ilobe and Sanaki set off in the same instant as the first mover. After, the four who start from rest go in the order they chose (Dembiri, Yerubi, Sanaki, Ilobe), 1.5 real seconds apart at Watch 4x and 4 s apart at Real time. Kiboro is not part of the order on screen: she was already walking (she had come down to pant-grunt) when she took the trip, a tick later than the others set off.

### 4.6 The small map

- held at tick 606, before: tick 606; clips {"carryVentral": 3, "clingTrunk": 1, "drink": 1, "forage": 15, "groom": 11, "groomee": 1, "guard": 1, "nurse": 1, "pantGrunt": 1, "perch": 2, "play": 2, "rest": 5, "stand": 2, "tickle": 1, "wrestle": 2}
- held at tick 606, after: tick 606; clips {"carryVentral": 3, "clingTrunk": 1, "drink": 1, "forage": 13, "groom": 11, "groomee": 1, "guard": 1, "nurse": 1, "perch": 2, "play": 2, "rest": 5, "sleep": 1, "stand": 4, "tickle": 1, "wrestle": 2}
- after 60 ticks at 1 min/s, before: tick 660; clips {"carryDorsal": 2, "carryVentral": 2, "clingTrunk": 1, "forage": 20, "groom": 5, "groomee": 1, "guard": 1, "pantGrunt": 1, "perch": 2, "play": 4, "rest": 5, "stand": 5}
- after 60 ticks at 1 min/s, after: tick 660; clips {"carryDorsal": 2, "carryVentral": 2, "clingTrunk": 1, "forage": 19, "groom": 5, "groomee": 1, "guard": 1, "perch": 2, "play": 4, "rest": 5, "stand": 7}

The world hashes are the same (4.1). The clips differ by the animals that are inside their two ticks at that moment: after, they are still drawn in the act before (one still asleep in its nest, two more standing) where before they were already in the new pose (two more foraging, one pant-grunting). Pictures: `small-map-tick606.png` and `small-map-played.png` in both folders.

### 4.7 Ninety seconds of the whole field world at the default speed, and two looks

- 90 s at 59.4 ecological seconds per second (360 ticks), 49 animals, 165 changes of act, 57 frames per second in the headless browser.
- animal-seconds by how the tag stood: {"none": 3703.21, "walking": 155.79, "soon": 32.93, "climbing": 20.31, "down": 9.91, "going": 3.69}
- seconds of beat by part (1 glance, 2 look, 3 intention): {"3": 58.06}
- longest announcement by act, in ticks: {"travel": 2, "drink": 137, "groom": 4, "forage": 9, "rest": 2, "mate": 3, "follow": 2, "beg": 80, "pant-grunt": 4}
- on a trunk: 57.3 animal-seconds, 45.7 of them in the climb clips; by act and direction: {"forage up in climb": 19.35, "travel down in climb": 4.66, "follow up in climb": 3.56, "groom up in climb": 3.46, "forage up in walk": 3.44, "forage down in climb": 3.24, "play up in climb": 3.14, "follow down in climb": 2.14, "travel down in perch": 2, "groom down in climb": 1.37}
- drawn behind its own path for the order of a departure: 34.1 animal-seconds, at most 22.5 ecological seconds; problems (non-finite positions): 0

- The 137 ticks are the alpha's 771 m walk to a stream: "walking to drink" for 34 simulated minutes. The 80 ticks are an animal walking after the one it begs from.
- Looks, after only: `after/leave-watch-nest-sheet.png` (Nkeru leaves her nest at dawn, tick 125: she sleeps on in the nest while her tag reads "about to travel", sits up, looks, and climbs down with her infant) and `after/leave-1x-sheet.png` (Koruza at 1 min/s: the whole moment takes 1.3 s; the intention movement and the climb are there, the camera does not keep up with a 12 m descent in 0.7 s, as before).
- `after/wait-watch-close-sheet.png` against `before/wait-watch-close-sheet.png`: Akiwe, kept waiting a minute by the simulation before a trip of 1,035 m (tick 257).

### 4.8 The first step, checked against the simulation

A test runs the field simulation for 640 ticks (`tests/render-beat.test.ts`; counts by `first-step-count.ts`): of 79 trips that lasted four ticks, the position record names the tick of the simulation's first step in all (0 wrong): 56 moved in the tick the trip was chosen, 21 in the next, 2 later (an initiator kept waiting); 7 were chosen as the act before took its last stride.

### 4.9 Pictures

Contact sheets, 20 pictures each with the tag, the clip and the head's angle off the goal under every picture; the same file names in `before/` and `after/` (15 and 17 files, 32 in all):

| File | What it shows |
| --- | --- |
| `leave-watch-sheet`, `leave-rt-sheet`, `leave-watch-close-sheet` | Koruza leaves the crown: Watch 4x (whole moment), Real time (22 to 82 s), and close on the beat |
| `groom-watch-sheet`, `groom-rt-sheet`, `groom-watch-close-sheet` | Fwambo gets up, runs to Dalubi and grooms |
| `water-watch-sheet`, `water-rt-sheet`, `water-watch-close-sheet` | Mbelo goes to drink: the whole walk at Watch 4x, the start at Real time, close on the beat |
| `party-watch-sheet`, `party-rt-sheet`, `party-watch-close-sheet` | Dembiri's party sets out |
| `wait-watch-close-sheet` | Akiwe waits for company (extra) |
| `small-map-tick606`, `small-map-played` | the 160 m map, paused and after 60 played ticks |
| `leave-watch-nest-sheet`, `leave-1x-sheet` (after only) | leaving a nest at dawn; the default speed |

Each sheet has a JSON of the same name with the per-frame readout (`rows`: time, tick, act, tag, clip, drawn height, path speed, head off the goal and off the runner-up, beat part, how the tag stands, lateness). `python3 rows.py after/party-watch.json` prints it one line per change.

The after captures were taken at commit c84657f (the head of the code); the before captures from an export of 7f9ec5b served on the same port.

### 4.10 Checks

- `pnpm exec tsc --noEmit`: clean.
- Test files run one by one with `pnpm exec tsx --test`, all passing: new `render-beat` 9, `render-intention` 4; changed `render-drawn` 18; unchanged `render-secondary` 6, `render-groom` 6, `render-patrol` 10, `render-playback` 4, `render-motion` 6, `render-gait` 6, `render-pace` 7, `render-body` 7, `render-camera` 5, `render-camera-zoom` 7, `render-cells` 5, `render-field` 12, `render-flow` 3, `render-follow` 12, `render-footprint` 5, `render-occluders` 18, `render-pick` 6, `render-portrait` 3, `render-post` 3, `render-sky` 7, `ui-chimp-panel` 2, `ui-map-view` 7, `ui-mind-card` 14, `ui-popover` 4, `ui-scalebar` 2, `ui-tooltip` 3, `ui-units` 6.
- `node scripts/groom-shots.mjs --out <dir> cases` (stage W5's check of who is drawn in which clip in grooming pairs, in the harness): 11 of 11 pass.
- `git diff 7f9ec5b --stat -- src/sim src/simulation.ts src/types.ts src/decision.ts src/kernel src/providers src/persist server data tests/fixtures` is empty.
- Not run, as briefed: `pnpm test`, `pnpm build`, the GPU probe, anything with a model.

## 5. What is sourced and what is a stylization

- **Sourced:** initiators of a joint trip stood motionless for 5 s or more in 58.4% (vocal) and 53.9% (silent) of 166 initiations, and gazed back toward others in 39.0% and 25.8% (gruberZuberbuhler2013 [H], already in `docs/research.md`). Used for the first mover's look back and for drawing the simulation's waiting initiator.
- **A stylization on top of it:** the drawn first mover looks back at every departure that has followers. In the field it is a minority of initiations. A viewer should not read the rate off the screen.
- **Stylizations with no source:** the beat and its three durations; the runner-up margin; the intention movements; that a lying animal sits up first; the spacing and the order of a departure being shown by delaying followers; that a held follower watches the first mover; the timing of the looks back; coming down a trunk in the climb cycle run backwards, feet first (the project's drawing rule since the climb cycle was built; no source in `docs/research.md` says how chimpanzees come down a trunk); the scanning of a model-driven animal that waits.
- **Not looked for:** a source on orienting before moving, on intention movements or on descending a trunk. `docs/research.md` has none, the web was not searched for this stage, and nothing in the code states them as facts.

## 6. Limits, and what is not done

- **Nothing was seen with a model.** No model process was allowed. The scanning of a model-driven animal that waits for an answer (item 4 of the brief) is a rule with a test (`beat.ts` `deliberating`, `THINK_SCAN_S`) and four lines in `updateAttention`; nobody has looked at it. In lockstep, while the clock is held for an answer, drawn time stands still and open beats are dropped: what that looks like was not seen either.
- **Frame time was not measured** (the GPU probe is off limits today; left to the integrator). Section 2 says what runs.
- **`pnpm test`, `pnpm build`, the golden hashes, the field pin and `scripts/verify-browser.mjs` were not run**, as briefed. No file they read was changed.
- **The small map is not exempt.** The same code runs there, so at a change of act its poses wait as on the field map (section 4.6 shows the clip census differing by the animals inside their two ticks). Its simulation, its tests and its world hashes are unchanged. At its natural speed of 1 min/s the wait is half a second.
- **At 1 min/s only the end of the beat shows.** Two ticks are half a real second there: the intention movement and a head turn, no glance, and a departure's order collapses into "first mover, then the rest 0.4 s later". Above 2 min/s nothing of the stage is drawn (the existing cut-off). The beat is made for Real time and Watch 4x.
- **The first mover looks back every time it has followers.** In the field it is a minority of initiations (section 5).
- **Followers do not walk in file.** They set off in order and then walk where the simulation has them, side by side or bunched. A travel formation is a separate item of the review.
- **A held follower is drawn up to 22.5 simulated seconds behind its own path** and catches up at 15%. While it is behind, its tag and its poses run on its own late time, so nothing contradicts on screen; its position is that much staler than everyone else's.
- **The camera is not part of this stage.** The close view still loses an animal that runs (the groomer in section 4 covers 19 m in one tick and leaves the frame for two seconds at Watch 4x); it now keeps an animal that climbs down, because the body no longer jumps.
- **After the tag turns plain, a pair still slides into place** for about a second in a walking clip (the layout of a grooming pair eases in when the pairing starts). The slide existed before; it is now the only moment a plain tag stands over a walking clip in the four moments.
- **Pairs break when the simulation moves one of them away.** Pairing still tests the simulation's positions for reach. When a groomer decides to leave, its partner stops being drawn as groomed at once, and the groomer sits for its two ticks before it goes.
- **An animal walking after a moving target is "walking to" for as long as it walks** (one animal read "walking to beg" for 80 ticks in the census). True of the picture, long for a tag.
- **Only four moments were filmed, on the first day of one seed** (07:31 to 12:08), each once per speed and build (the after set was taken again at the final head after a fault was found in it; the numbers are from that second set). Nests at dusk, leaving a nest at dawn (looked at once, section 4.7), rain, patrols, hunts and fights were not watched. A patrol with a published leg keeps its own looks and clips, which come before the beat in the code; that was read, not seen.
- **In trees a grooming pair is still drawn on two branches** (stage W5's open item), so "the partner it is about to join" is looked at across a gap there.
- **The eyes were not checked on their own.** The irises already lead the head toward whatever the head is turning to (stage A8); no picture here is close enough to show them.
- **A climb up to a crown is drawn on the trunk as well.** The brief asked for the way down. The way up uses the same rule and costs nothing more; if it is not wanted, the test in `placeGrounded` can be made one-sided (`a.track.vy < 0`).
- **The nest's building clip now counts its four minutes from the body's arrival** at the nest tree. The nest mesh (`nests.ts`) was not touched and not watched: whether it appears in step with the building was not seen.

## 7. For the integrator

### Status line for `IMPLEMENTATION_PLAN.md` (a new block after "Stages W1 to W5")

> ## Stage W6: the decision shown on the body (render and interface only)
> **Goal**: the review's first legibility issue, "no decision beat on the body", and the two limits stage W4 left: in the two ticks the renderer knows an act before the drawn body performs it, the head turns to the chosen target after a glance at a close runner-up, an intention movement plays, and the body starts; a party sets out in the order it chose; an approach is named for as long as it lasts; a pose waits for its tag; an animal leaving a crown climbs down.
> **Status**: Built on branch `w6-decision-beat` (11 October 2026; `docs/staging/w6-decision-beat.md`), not yet reviewed. Nothing under `src/sim` and no contract field changed; the World hashes of the filmed moments and of the small map are the same before and after. In four filmed moments of the field map (seed 48, the same ticks before and after, at Watch 4x): the old act runs on until the last 3.4 real seconds, where before the body left its pose the moment the simulation changed the act; leaving a crown or going to water the head is within 2 to 3 degrees of the chosen place in the last second before the body starts (102 and 121 before); a walk to water reads "walking to drink" for its 52 s, where the tag read "drinking" over a walking animal for 26 s and "about to drink" stood over a body in the drinking pose for 4 s; an animal coming down 12 m is drawn on the trunk in the climb clip for 10.0 of 10.3 s (seated on its branch for all of it before); of a party of four that starts from rest, the followers set off 1.5, 3.0 and 4.5 s after the first mover (one 3.8 s before it and two with it, before). A stationary act where the animal already is now reads "about to" for the two ticks before the body's own time reaches it. Open: nothing was seen with a model (the rule for a model wait is tested, not watched); frame time is the integrator's to measure; the first mover looks back at every departure, more often than in the field; followers do not walk in file; the small map shows the same wait at a change of act.

### Lines for `AGENTS.md`

Gotchas, replacing the line that begins "Which act the drawn body is in (stage W4" if the integrator took it from stage W4, else after "Creature playback trails the sim by 2 ticks":

> - Which act the drawn body is in (stages W4 and W6, `render/creatures/drawn.ts`): the creature layer reads it once a frame for every animal into `Anim.act`, `Anim.actTarget` and `Anim.way`, and poses, pairings, the waterline, the nest place and the name tags all read those, never `chimp.action`, so a pose cannot run ahead of its tag. A stationary act is announced until the body's own drawn time reaches it and then for as long as the body is on its way ("walking to drink", "climbing to feed"); a trip until the drawn path moves, at most 6 ticks. An urgent act (`BODY_SIGN` 'any': a call, a charge) is drawn and ended with the simulation. New clip logic should read `a.act`; code that needs the simulation's act for something else (sound, links) keeps `chimp.action`.
> - The decision beat (stage W6, `render/creatures/beat.ts`, `intention.ts`): for an animal whose act changed in the last 8 drawn ticks, the gaze goes to a close runner-up, then to the chosen target, then an intention overlay plays, in the 3.4 real seconds before the body starts; followers of one departure are sampled up to 1.5 ticks behind their own path (`Anim.late`) so they set off in the order chosen. Every per-animal drawn time is `playback.renderT - a.late`. Off above 2 min/s. All stylizations.
> - An animal in a tree is placed and looked up by where its body is DRAWN (`treeFor` uses the track, not `chimp.position`): the simulation is two ticks ahead and has left the tree while the body is still coming down its trunk. `Anim.trunkK` eases a body onto the bark whenever its drawn path goes up or down, whatever its act.

Verifying a change, after the harness lines:

> - Decision beat and tags: `node cap.mjs <before|after> <leave|groom|water|party|wait> <rt|watch|1x>` in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w6-decision-beat/` films one fixed tick of the field world (seed 48) from a no-model server on 5184 with the model policy off from the first frame, so two builds show the same world; `tables.py` prints the numbers. Do not edit source while it runs (Vite reloads the page).

### Lines for `docs/visual-plan.md`

Item A8 (attention), appended to its row or its status:

> Stage W6 added three gaze targets ahead of the others while an act is about to start: the runner-up option, the chosen target (tree, water, partner, caller, or the direction of the first step) and, for the first mover of a departure or a waiting initiator, a companion behind it (`creatures/beat.ts`).

The action table, the rows for travel and climbing:

> Leaving or entering a crown inside any act is drawn on the trunk in the climb cycle (stage W6), not as a seat that drops to the ground.

### Parameter rows for `docs/simulation.md` section 17

None. The stage adds no simulation parameter and no contract field.

### Merge notes

- **Likely conflicts.** `src/render/creatures.ts`: this branch rewrites `chooseClip`, `pairingFor` (only which act and target it reads), `interpolateAll`, `updateAttention`, the elevated half of `placeGrounded`, `treeFor`, `drinkSpot`, the heading lines of `updateMotion`, and adds fields to `Anim` and a block after the clip is evaluated in `evaluatePose`. If the tree-postures or idle-life stages touched `placeGrounded`, `chooseClip` or `updateAttention`, merge by hand. `src/render/creatures/poses.ts`, `material.ts` and `secondary.ts` are NOT touched (the intention movements are in a new file, `intention.ts`, which reads the posture from the evaluated pose, so a changed rest or perch pose does not break it as long as seated hips stay under 0.24 high).
- **If another stage adds clips for stationary animals** (idle life): the clip choice now holds the pose of the act before while `a.way !== 0`; a new idle clip chosen inside the act's own `case` works unchanged. An idle clip that lies the animal down should leave `intention.ts` `postureOf` reading it as lying (hips rolled more than 1 rad or pitched beyond -1.1 or 1.3).
- **Stage W4's tests** in `tests/render-drawn.test.ts` were rewritten where the rule changed on purpose (section 3). 18 tests, all passing; new files `tests/render-beat.test.ts` (8) and `tests/render-intention.test.ts` (4).
- **Run after the merge:** `pnpm test`, `pnpm build`, the frame-time comparison (close view and party framing at Real time and at 1 min/s: every animal now gets the drawn-act reading each frame, section 2), `node scripts/groom-shots.mjs --out <dir> cases` (passed here: 11 of 11), and one look at a model-driven animal waiting for an answer.
- **`docs/research.md`** has a new section at its end, "Addendum: W6 decision beat". It adds no source.

### Decisions that are the user's

1. The first mover looks back at every departure with followers. The field figure is 26 to 39% of initiations. Keep it always (readable), or draw it for a share of departures?
2. A stationary act where the animal already is now reads "about to rest" for the two ticks before the body's drawn time reaches it (30 s at Real time, 7.5 s at Watch 4x, half a second at 1 min/s). Stage W4 turned such a tag at once. Keep?
3. The beat's length (3.4 real seconds) and the spacing of a departure (4 simulated seconds, at least 1.5 real seconds). Longer reads better at Real time and costs nothing; shorter fits more of it into 1 min/s.
4. Climbing up to a crown is drawn on the trunk too, beyond the brief. Keep?
5. "Walking to feed" for the tag of an animal on its way to a crown, where the plain verb is "foraging" and the not-yet-started form is "about to forage" (stage W4's word). One verb throughout?
