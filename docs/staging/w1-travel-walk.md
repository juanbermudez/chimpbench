# Stage W1: travel is drawn as a walk on the field map, and a watching speed

10 October 2026, branch `w1-travel-walk` (cut from `track-e` at dea2643). Render and interface only: nothing under `src/sim` changed, no parameter was added, the golden hashes and the field pin are untouched by construction.

Source of the stage: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-animation_and_motion.md`, fact-checked in `reports/check-verify_visual_faults.md`, claim 1) and the user's decision of the same day ("add a watching speed near 4×").

## 1. What was wrong

On the field map (the app's default) a travelling animal was never drawn walking at the app's speeds.

- **At 1 min/s, the default, every ground mover galloped.** Adults travelling on the ground were on the gallop clip in the time-lapse regime in 98.9% of samples, and so were animals going to drink, following or foraging. The gallop also left the coloured streak and the dust the layer draws behind chases.
- **At Real time a trip began with a glide in the stand pose, and slow animals glided for the whole trip.** Of eight adults leaving at dawn, three took 6.8 to 9.0 s to reach the walk clip and four never reached it in the 20 s recorded. An animal already mid-trip when the page opened stood for as long as it travelled (100% of samples).
- **A walk with planted feet existed only between about 1.3 and 6.5 s/s, and no speed preset lay there.**
- **Cause.** The creature layer's moving test (enter above 0.30 body lengths a second, leave below 0.18) and its gallop entries (3.2 and lower) were tuned on the 160 m map, where an adult walks at 0.04 m per ecological second and 1 min/s is the natural playback rate. The field map walks at 0.35 m/s (`data/params.json`, `walkMps`), and 0.78 to 0.88 m/s with the gait mechanism of Track E (`walkGait`, `src/sim/gait.ts`). So the same thresholds read a field walker as a runner at 1 min/s (14 body lengths a second) and as standing at Real time (0.23).

Three smaller faults in the same code, also in the review:

- **An animal moving sideways in a crown was drawn walking or galloping on the spot.** Above 0.3 m the layer draws an animal at its place on a branch whatever its simulated position does, so a locomotion clip there never goes anywhere. Players at 12 m galloped (90 to 99% of the samples of animals moving sideways at height at 1 min/s; 73% on the 160 m map).
- **Climbing had no cadence cap.** In the climb act at 1 min/s the limbs cycled 15 to 30 times a second (measured; the review had computed about 16).
- **A walker that stopped held a hand or foot in the air.** Reproduced on a real animal in the field world, at 4 s/s and at 1 min/s: for about 0.6 s after the body stopped the animal stayed on the walk clip with one hand up (or both feet, when the stop fell in the other half of the stride), and only then blended into the next clip. `docs/visual-plan.md` (line 321) records "stop-on-plant" as shipped; it was not in the code.

## 2. What changed

**The clip and the moving test are read at the world's own walking pace** (`src/render/creatures/pace.ts`, new; `src/render/creatures.ts`).

- A world that does not walk at the 160 m map's speed has a *reference rate*: the playback rate at which its walk would be drawn like the 160 m map's walk at 1 min/s. It is 60 × 0.04 ÷ the world's adult walking speed: exactly 60 on the 160 m map, 6.86 s/s on the field map, 2.73 s/s when the gait mechanism is on (the faster sex's speed, 0.88 m/s, so that no walker reads as a runner).
- On such a world the choice of clip reads the animal's speed at the reference rate, whatever the playback speed. A field walker therefore reads 1.66 body lengths a second at Real time, at 4 s/s and at 1 min/s alike, and takes the walk clip; a runner reads 11.8 and gallops. Charge, flee and hunt gallop by act, as before.
- The moving test reads the faster of that and the speed as drawn, so nothing that counted as moving at 1 min/s stops counting, and a walker counts as moving at Real time. The heading follows the path on the same test (otherwise a Real time walker would turn to the simulation's newer heading, 30 s ahead of the drawn body, and walk sideways).
- The easing of pairing and spacing offsets is real-time movement and enters both speeds exactly as drawn. A partner sliding into place reads as it did at 1 min/s, at every speed; it is not multiplied by the reference rate (the fact-check's warning). Measured: animals whose drawn path never moved had 0 moving toggles at Real time before and after.
- On the 160 m map the layer runs its original expressions, bit for bit (`refMode` is false when the world's walking speed equals the registry default; the two new speeds are not computed).
- What is drawn at each speed is still decided by the drawn speed, as before (`solveGait`): cadence, stride and whether feet can grip. Only the *choice* between stand, walk and gallop changed.

**At height** (`creatures.ts` `chooseClip`). An animal drawn above 0.3 m that is not in the climb act takes no locomotion clip: it keeps the clip of what it is doing (play, wrestle, forage, groom, perch). This is stricter than "no gallop": a walk on the spot was no better. Both maps.

**Climbing** (`src/render/creatures/gait.ts` `solveClimb`). Above the cadence cap the gait table already named (`GAITS.climb.fCap`, 1.6 cycles a second) the climb is shown as time-lapse, as walking is: the cycle runs at the cap in the direction climbed. Below the cap nothing changed (the phase still follows the height climbed). Both maps; the cap is reached at about 5.8 s/s.

**The stop** (`creatures.ts`, `src/render/creatures/poses.ts`). While a stopped walker still counts as moving (the existing 0.8 s that keeps foragers from flickering between walk and stand), its swinging hand or foot comes down where it is and stays down; it lifts again if the walk resumes. The value is exactly 0 on an animal that has not stopped, so a walk in progress is drawn as before. Both maps.

**The watching speed** (`src/clock.ts`, `src/ui/timebar.ts`, `src/ui/hud.ts`, `src/style.css`). A preset `watch`, 4 s/s, labelled "Watch 4×", between Real time and 1 min/s. The default speed is unchanged (1 min/s; a test asserts it).

- Speed keys are positions in the preset list, so the keys moved: 1 Real time, **2 Watch 4×**, 3 1 min/s, 4 10 min/s, 5 1 h/s, 6 6 h/s, 7 1 day/s, 8 Max.
- `scripts/verify-browser.mjs` pressed 6 for 1 day/s and 2 to return to 1 min/s: now 7 and 3. Run against this worktree's model-free server it passes every step through "renderer fps", including both speed steps, and then stops at "store ready": the SQLite file is not served by a worktree server (the same error is in the console before any change), so the save and reload steps could not run here.
- `scripts/audio-probe.mjs` pressed 2 before its busy close-view recording, which has meant 1 min/s since Real time became key 1: now 3, so it keeps running at 1 min/s. Not run (it needs the audio files). Its comment says "10 min/s", which was already out of date.
- `scripts/perf-probe.mjs` also picks speeds by key, from its own list, which had no Real time entry: since Real time became key 1 its scenarios named `1x` had run at Real time and those named `1d` at 6 h/s, and this stage's new key moved them one further (`1d` ran at 1 h/s). Found and fixed in the review (section 9): the list follows `SPEED_PRESETS` again and the probe stops when the app reports another speed than the one asked for.
- The time panel is 92 px wider (420 to 512 px) for the eighth button, takes two rows of four buttons below 480 px, and reads "1 tick / 3.8 s" at this speed. (As first built it was 470 px wide: the selected "Watch 4×" label was 2 px wider than its button, and on a phone the first two labels ran into their neighbours; fixed in the review.)
- Below one tick a second (Real time and the watching speed) the measured rate swings by half between ticks although every tick lands on time; the readouts now show the rate being kept ("4 s/s") instead of "3 s/s".

**Saying "time-lapse" on screen** (`src/ui/timebar.ts`, `src/ui/hud.ts`, `src/ui/contracts.ts`, `src/main.ts`). Above the rate at which this map's walk can be drawn with feet that grip (`pace.ts` `lapseRate`: the walk's cadence cap × its longest stride ÷ the walking speed; about 9.4 s/s on the field map, 82 on the 160 m map) the time panel's state line reads "Time-lapse · bodies outrun their steps; every tick still runs", and the second line of the clock control in the menu bar reads "time-lapse" instead of repeating the chosen rate (a capped clock keeps its number, and so does one that measures under half the chosen rate; the time panel shows the measured rate).

**A harness option** (`src/render/env/harness.ts`). `&params={"walkGait":1}` opens the environment harness on a world with parameter overrides. Used here to check the gait-mechanism path.

### Constants and their labels

| Constant | Value | Where | Label |
| --- | --- | --- | --- |
| Rate the 160 m map's thresholds were tuned at | 60 s/s | `pace.ts` `SMALL_MAP_RATE` | stylization (carries the small map's tuning over; not a measured gait transition) |
| Adult body size for the rates | 1.45 m | `pace.ts` `ADULT_BODY_M` | design assumption (rendered adults are 1.36 to 1.54 m) |
| Watching speed | 4 s/s | `clock.ts` | design assumption; the user's decision of 10 October |
| Settle of a stopped walker | rate 12 per second (down in about 0.2 s), counts as planted above 0.9 | `creatures.ts`, `poses.ts` | stylization |
| "time-lapse" shown in the menu bar while the measured rate is at least | half the chosen rate | `hud.ts` | design assumption (a wide margin, so the line does not flicker) |
| Climbing cadence cap | 1.6 cycles a second | `gait.ts` `GAITS.climb.fCap` (already there, now used) | design assumption (the table's own label) |

No source was added to `docs/research.md`. The walking speeds quoted are the registry's (`walkMps`; `walkGaitMaleMps` and `walkGaitFemaleMps`, Hunt 1989 as cited by nguessan2009, [L]); the climbing cycle is neufuss2018.

### Does anything new run per frame?

Yes, on the CPU only, with no allocation: on a world that is not the 160 m map, two more smoothed speeds per animal per frame (one `hypot` and one exponential each); on both maps one more smoothed value per pose evaluation (the settle) and a comparison per climber. The interface asks for the time-lapse rate at its own refresh (4 times a second), a division. No render pass, no shader, no texel, no geometry. `gpu-probe` was not run (per the brief).

## 3. The pace numbers, from the code

Printed by `pace-numbers.ts` (in the output directory) from `pace.ts`, `gait.ts` and the parameter registry; adult body 1.45 m.

| World | Adult walking speed (m/s) | Reference rate (s/s) | A walker reads (body lengths/s) | A runner at runMps reads | Natural walk up to (s/s) | Feet grip up to = time-lapse above (s/s) | Moving above (m/s, ecological, below the reference rate) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 160 m map | 0.04 | 60 | 1.66 | 12.4 | 55.1 | 82.3 | 0.007 |
| field map | 0.35 | 6.86 | 1.66 | 11.8 | 6.3 | 9.4 | 0.063 |
| field map, gait mechanism (walkGait 1) | 0.88 | 2.73 | 1.66 | 4.7 | 2.5 | 3.7 | 0.159 |

| Field-map walk (0.35 m/s, adult 1.45 m) at | Drawn speed (m/s) | Regime | Cadence (Hz) | Stride (m) |
| --- | --- | --- | --- | --- |
| Real time | 0.35 | natural | 1.06 | 0.33 |
| 4 s/s | 1.4 | natural | 1.67 | 0.84 |
| 1 min/s | 21 | time-lapse | 3.2 | 1.03 |
| gait mechanism, male 0.88 m/s, Real time | 0.88 | natural | 1.37 | 0.64 |
| gait mechanism, male 0.88 m/s, 4 s/s | 3.52 | time-lapse | 3.2 | 1.03 |
| gait mechanism, female 0.78 m/s, 4 s/s | 3.12 | warped | 3.03 | 1.03 |

Climbing: cap 1.6 Hz, stride 0.55 body lengths; climbMps 0.22 at 1 min/s for a 1.45 m adult = 16.6 Hz uncapped; the cap is reached at 5.8 s/s.

Reading the first table: a walker reads the same 1.66 body lengths a second in every world, which is the point of the reference rate. On the default field map 4 s/s sits inside the natural window (up to 6.3 s/s). With the gait mechanism on, the window ends at 2.5 s/s and feet grip only to 3.7 s/s, so 4 s/s is at the edge there (section 7, item 3).

## 4. Measurements

How they were taken. `census.mjs` loads the environment harness (the app's own scene and creature layer, without panels) on seed 48 at an exact tick, so before and after start from the same world, and reads every animal's clip on every rendered frame from the creature layer's debug handle. "Before" is this worktree before any change (dea2643); "after" is the branch at bdfef92 (the commits after it change comments and one line of the menu bar; the interface pictures are from the head, 17fa403). A sample is one animal on one frame; frame counts differ a little between runs, so compare shares, not counts. `app.mjs` does the same in the running app; its "before" is the review's fact-check, taken with the same method at the same code. Ticks and animals were chosen with a model-free scan of the simulation (`prescan*.ts`). All tables below are printed by `tables.py` from the JSON files.

Three things to know when reading them:

- **The 160 m map.** Its travelling adults are drawn as before at all three speeds (table 4.1: walk with a stretched stride 97.0% before, 98.2% after at 1 min/s; standing at Real time and 4 s/s, where its 0.04 m/s walk has always been below the moving threshold, which this stage leaves alone). One difference is real and comes from the at-height rule, which applies to both maps on purpose: 5 of 984 samples (0.5%) are an animal that has just come down a tree and holds its crown clip for the rest of the 0.35 s minimum a clip plays (before, it was already on a walk or gallop clip while still on the trunk). The motion probe on the 160 m map is unchanged within its run-to-run spread (tables 4.13 and 4.14; three runs after and two before are in `motion-gait-repeats.txt`).
- **Locomotion clips still counted at height after the change** (table 4.7: walk 1 to 11%, gallop up to 4%) are animals outside the camera's view, whose pose and clip are re-evaluated four times a second. A separate count (`after/height-check.json`): of animals drawn above 0.5 m and moving sideways, 0 of 2,576 samples in view were on a locomotion clip, 36 of 307 out of view.
- **Trip starts** (tables 4.4 and 4.5): the two animals at 0.1 s in the harness were already moving when the recording caught them; in the app table Dalubi's "never" after the change is 11 frames at the end of the recording, not a result; Sanaki's 0.1 s before the change comes from the easing of his layout offset (drawn at 0.42 body lengths a second while his path moved at 0.007 m/s), which has always counted as moving.

### 4.1 Adults travelling on the ground: which clip (environment harness, same tick before and after)

| Map | Speed | | Animals | Samples | Clip and regime | Not on a locomotion clip |
| --- | --- | --- | --- | --- | --- | --- |
| field | Real time | before | 10 | 23960 | stand/natural 100.0% | 100.0% |
| field | Real time | after | 10 | 23650 | walk/natural 100.0% | 0.0% |
| field | 4 s/s | before | 10 | 18010 | walk/natural 100.0% | 0.0% |
| field | 4 s/s | after | 10 | 15430 | walk/natural 100.0% | 0.0% |
| field | 1 min/s | before | 18 | 13399 | gallop/timelapse 98.9%, walk/timelapse 0.4%, walk/natural 0.3%, gallop/natural 0.1%, stand/natural 0.1%, gallop/warped 0.1%, perch/natural 0.1% | 0.2% |
| field | 1 min/s | after | 18 | 13216 | walk/timelapse 99.2%, walk/natural 0.3%, stand/natural 0.2%, walk/warped 0.1%, perch/natural 0.1% | 0.3% |
| 160 m | Real time | before | 3 | 7203 | stand/natural 66.7%, groomee/natural 33.3% | 100.0% |
| 160 m | Real time | after | 3 | 6780 | stand/natural 66.7%, groomee/natural 33.3% | 100.0% |
| 160 m | 4 s/s | before | 3 | 4781 | stand/natural 75.3%, groomee/natural 24.7% | 100.0% |
| 160 m | 4 s/s | after | 3 | 4478 | stand/natural 75.8%, groomee/natural 24.2% | 100.0% |
| 160 m | 1 min/s | before | 3 | 1235 | walk/warped 97.0%, walk/natural 3.0% | 0.0% |
| 160 m | 1 min/s | after | 3 | 984 | walk/warped 98.2%, walk/natural 1.3%, perch/natural 0.5% | 0.5% |

### 4.2 Every animal displaced on the ground, by clip (all ages and acts)

| Map | Speed | | Samples | Clip |
| --- | --- | --- | --- | --- |
| field | Real time | before | 33754 | stand 85.2%, drink 12.0%, climb 2.8% |
| field | Real time | after | 33421 | walk 97.1%, climb 2.9% |
| field | 4 s/s | before | 23413 | walk 100.0% |
| field | 4 s/s | after | 20059 | walk 100.0% |
| field | 1 min/s | before | 15766 | gallop 98.4%, walk 1.1%, perch 0.2%, drink 0.2%, stand 0.1%, carryDorsal 0.0%, forage 0.0%, play 0.0% |
| field | 1 min/s | after | 15426 | walk 99.1%, gallop 0.5%, stand 0.2%, perch 0.1%, drink 0.1% |
| field, later hour | 1 min/s | before | 6585 | gallop 96.2%, walk 2.5%, forage 0.4%, drink 0.4%, stand 0.2%, play 0.1%, perch 0.1% |
| field, later hour | 1 min/s | after | 6575 | walk 97.5%, drink 1.5%, stand 0.4%, forage 0.4%, perch 0.1%, play 0.1% |
| 160 m | Real time | before | 17582 | stand 27.3%, drink 22.0%, groomee 13.7%, sitIdle 13.7%, forage 13.2%, mate 9.7%, walk 0.4% |
| 160 m | Real time | after | 16551 | stand 27.3%, drink 22.3%, groomee 13.7%, sitIdle 13.7%, forage 13.2%, mate 9.4%, walk 0.5% |
| 160 m | 4 s/s | before | 8589 | stand 41.9%, drink 21.0%, groomee 13.7%, play 8.9%, mate 8.5%, forage 2.5%, groom 2.3%, sitIdle 1.1% |
| 160 m | 4 s/s | after | 8006 | stand 42.4%, drink 21.2%, groomee 13.5%, play 9.0%, mate 8.3%, groom 2.4%, forage 2.2%, sitIdle 0.8% |
| 160 m | 1 min/s | before | 4924 | walk 91.5%, gallop 5.0%, forage 1.4%, perch 0.8%, mate 0.7%, sitIdle 0.3%, drink 0.3% |
| 160 m | 1 min/s | after | 4018 | walk 89.6%, gallop 5.2%, forage 1.8%, mate 0.8%, perch 0.8%, groom 0.7%, guard 0.5%, sitIdle 0.3%, drink 0.2% |

### 4.3 Runners (charge, flee, hunt) displaced on the ground

| Capture | | Act and clip (samples) |
| --- | --- | --- |
| field-1x | before | {'charge:gallop': 15} |
| field-1x | after | {'charge:gallop': 15} |
| field-height-1x | before | none in the window |
| field-height-1x | after | none in the window |
| small-1x | before | none in the window |
| small-1x | after | none in the window |

### 4.4 Trips that start at Real time (field, eight adults leaving at dawn, ticks 101 to 105)

| Animal | | Seconds until a locomotion clip | Seconds displaced on another clip (first 20 s) | Clips in the first 20 s (frames) |
| --- | --- | --- | --- | --- |
| Kiboro (f, 28 y) | before | never | 20.0 | {'stand': 888} |
| Tindiro (f, 17 y) | before | never | 20.0 | {'stand': 888} |
| Koruza (m, 24 y) | before | never | 19.5 | {'stand': 954} |
| Tavuni (m, 27 y) | before | 9.0 | 8.5 | {'stand': 448, 'walk': 624} |
| Sanaki (m, 22 y) | before | 0.1 | 4.2 | {'stand': 210, 'walk': 862} |
| Rukaso (m, 17 y) | before | 8.2 | 7.7 | {'stand': 399, 'walk': 673} |
| Oyaku (f, 12 y) | before | 6.8 | 6.3 | {'stand': 390, 'walk': 782} |
| Fumbira (f, 44 y) | before | never | 19.4 | {'stand': 1158} |
| Kiboro (f, 28 y) | after | 0.1 | 0.1 | {'stand': 4, 'walk': 967} |
| Tindiro (f, 17 y) | after | 0.1 | 0.1 | {'stand': 4, 'walk': 967} |
| Koruza (m, 24 y) | after | 0.9 | 0.4 | {'stand': 39, 'walk': 965} |
| Tavuni (m, 27 y) | after | 0.8 | 0.3 | {'stand': 48, 'walk': 1002} |
| Sanaki (m, 22 y) | after | 0.1 | 0.0 | {'stand': 3, 'walk': 1047} |
| Rukaso (m, 17 y) | after | 0.8 | 0.3 | {'stand': 48, 'walk': 1002} |
| Oyaku (f, 12 y) | after | 0.7 | 0.2 | {'stand': 36, 'walk': 891} |
| Fumbira (f, 44 y) | after | 0.8 | 0.2 | {'stand': 42, 'walk': 986} |

### 4.5 The same in the app (Real time from 06:54; before = the review's app3.json, Real time from 06:44)

| Animal | | Seconds until a locomotion clip | Longest run on the stand clip while displaced (s) | Clips (frames) |
| --- | --- | --- | --- | --- |
| Tavuni (m, 27 y) | before (review) | 7.2 | 7.0 | {'stand': 29, 'walk': 1005} |
| Rukaso (m, 17 y) | before (review) | 6.5 | 6.2 | {'stand': 26, 'walk': 1008} |
| Tindiro (f, 17 y) | before (review) | 5.0 | 4.8 | {'stand': 20, 'walk': 834} |
| Sanaki (m, 22 y) | before (review) | 0.8 | 3.2 | {'stand': 17, 'walk': 717} |
| Oyaku (f, 12 y) | before (review) | 5.2 | 5.0 | {'stand': 21, 'walk': 713} |
| Fumbira (f, 44 y) | before (review) | never | 167.8 | {'stand': 672} |
| Dalubi (m, 35 y) | before (review) | 4.5 | 4.3 | {'stand': 18, 'walk': 36} |
| Kidoti (m, 20 y) | before (review) | 6.7 | 6.5 | {'stand': 27, 'walk': 287} |
| Olumbe (f, 24 y) | before (review) | 5.0 | 4.8 | {'stand': 20, 'walk': 174} |
| Kidoti (m, 20 y) | after | 0.7 | 0.3 (all clips) | {'perch': 7, 'stand': 17, 'walk': 977} |
| Olumbe (f, 24 y) | after | 0.8 | 0.3 (all clips) | {'stand': 47, 'walk': 983} |
| Jiwero (f, 30 y) | after | 1.0 | 0.5 (all clips) | {'stand': 57, 'walk': 1144} |
| Dalubi (m, 35 y) | after | never | 0.0 (all clips) | {'stand': 11} |

### 4.6 The app, adults travelling on the ground (before = the review's app.json at the same code)

| Speed | | Animals | Samples | Clip and regime |
| --- | --- | --- | --- | --- |
| 1 min/s | before (review) | 11 | 7047 | gallop/timelapse 98.9%, perch/natural 0.5%, walk/timelapse 0.5%, walk/natural 0.1% |
| Real time, switched mid-trip | before (review) | 7 | 637 | walk/natural 100.0% |
| 1 min/s | after | 8 | 8666 | walk/timelapse 99.8%, perch/natural 0.2% |
| 4 s/s (the new preset) | after | 8 | 13179 | walk/natural 100.0% |
| Real time, switched mid-trip | after | 11 | 26495 | walk/natural 100.0% |

Runners in the app at 1 min/s after: none in the window; every displaced ground animal by clip: walk 99.4%, perch 0.2%, pantGrunt 0.2%, gallop 0.1%, forage 0.1%

### 4.7 At height (drawn more than 0.5 m up), moving sideways: which clip

| Capture | | Samples | Clip |
| --- | --- | --- | --- |
| field-1x | before | 543 | gallop 90.6%, walk 4.2%, play 2.8%, perch 2.4% |
| field-1x | after | 558 | play 66.3%, forage 11.6%, walk 10.9%, groom 3.8%, perch 3.8%, gallop 3.6% |
| field-height-1x | before | 2956 | gallop 99.4%, walk 0.5%, play 0.1% |
| field-height-1x | after | 2955 | wrestle 89.7%, play 6.1%, forage 2.5%, walk 1.4%, perch 0.3% |
| small-1x | before | 4186 | gallop 73.4%, walk 26.0%, perch 0.6%, groomee 0.1%, carryVentral 0.0% |
| small-1x | after | 3375 | play 39.3%, wrestle 20.4%, forage 16.9%, tickle 13.2%, perch 3.6%, sitIdle 1.4%, groom 1.3%, pantGrunt 1.2%, embrace 1.0%, walk 0.9%, groomee 0.7%, rest 0.1% |
| field-watch | before | 1735 | play 100.0% |
| field-watch | after | 1492 | play 100.0% |
| small-watch | before | 8793 | play 22.9%, tickle 20.5%, wrestle 20.5%, forage 20.1%, perch 11.1%, groomee 2.5%, groom 1.4%, walk 1.0% |
| small-watch | after | 8279 | play 23.1%, tickle 20.5%, wrestle 20.5%, forage 19.8%, perch 11.3%, groom 2.5%, groomee 2.3% |

Moving vertically at height, by act and clip (1 min/s, field, later hour):
- before: {'play:play': 6, 'play:gallop': 21, 'display:perch': 30, 'play:walk': 31, 'forage:perch': 14, 'forage:forage': 99, 'travel:perch': 74, 'forage:gallop': 227, 'forage:walk': 208, 'follow:perch': 40, 'call:perch': 2, 'call:pantHoot': 21, 'drink:perch': 34}
- after: {'play:play': 59, 'display:perch': 28, 'forage:forage': 500, 'travel:perch': 74, 'forage:walk': 44, 'follow:perch': 40, 'call:perch': 5, 'call:pantHoot': 18, 'drink:perch': 33}

### 4.8 Climbing cadence (animal 41 in the climb act, 1 min/s)

| | Frames moving vertically | Frames on the climb clip | Cadence, cycles a second (min, median, max) | By act, clip and regime |
| --- | --- | --- | --- | --- |
| before | 57 | 28 | 15.46, 25.15, 30.39 | {'climb:clingTrunk/0': 27, 'climb:perch/0': 2, 'climb:climb/0': 28} |
| after | 57 | 28 | 1.6, 1.6, 1.6 | {'climb:clingTrunk/0': 16, 'climb:clingTrunk/2': 11, 'climb:perch/0': 2, 'climb:climb/2': 28} |

### 4.9 The stop (Chiriku, field; the walk ends and the animal rests)

| Speed | | Clip at the stop | Limbs in stance at the stop (hand L, hand R, foot L, foot R) | ms on the walk clip after the stop | ms with a hand or foot in the air after the stop |
| --- | --- | --- | --- | --- | --- |
| 4 s/s | before | walk | [0, 1, 1, 1] | 600 | 600 |
| 4 s/s | after | walk | [0, 1, 1, 1] | 617 | 17 |
| 1 min/s | before | walk | [1, 1, 0, 0] | 633 | 633 |
| 1 min/s | after | walk | [1, 0, 0, 1] | 650 | 33 |

### 4.10 Foot drift of the walk at the watching speed (Akiwe, field, 4 s/s, 25 s, planted contacts)

| | Frames on the walk clip | Stances | Drift median, 95th percentile, largest (cm) | Hind foot under the ground by more than 1 cm | Cadence (Hz) | Stride (body lengths) | Speed (body lengths a second) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before | 1501 of 1501 | 160 | 0, 0.17, 0.53 | 0 of 1863 frames | 1.61 | 0.55 | 0.89 |
| after | 1249 of 1249 | 161 | 0, 0.21, 0.61 | 0 of 1550 frames | 1.61 | 0.55 | 0.89 |

### 4.11 Walk and stand flicker (the layer's own counters, per animal per 5 s)

| Capture | | All animals: moving toggles, clip switches | Animals whose drawn path never moved: moving toggles, clip switches |
| --- | --- | --- | --- |
| field-rt | before | 0.006, 0.009 (42 animals) | 0, 0 (25 animals) |
| field-rt | after | 0.009, 0.012 (42 animals) | 0, 0 (25 animals) |
| field-watch | before | 0, 0.016 (42 animals) | 0, 0.02 (25 animals) |
| field-watch | after | 0.004, 0.02 (42 animals) | 0, 0.02 (25 animals) |
| field-1x | before | 0.282, 0.604 (44 animals) | 0.035, 0.235 (17 animals) |
| field-1x | after | 0.282, 0.468 (44 animals) | 0.027, 0.2 (15 animals) |
| small-rt | before | 0.011, 0.165 (44 animals) | 0, 0 (28 animals) |
| small-rt | after | 0.011, 0.165 (44 animals) | 0, 0 (28 animals) |
| small-watch | before | 0.015, 0.207 (45 animals) | 0.012, 0.036 (28 animals) |
| small-watch | after | 0.015, 0.193 (45 animals) | 0.012, 0.03 (28 animals) |
| small-1x | before | 0.425, 0.787 (47 animals) | 0.027, 0.2 (15 animals) |
| small-1x | after | 0.43, 0.834 (47 animals) | 0.027, 0.187 (15 animals) |

### 4.12 The field map with the gait mechanism on (walkGait 1; after only), adults travelling on the ground

| Speed | Animals | Samples | Clip and regime | Median speed (m per ecological second) |
| --- | --- | --- | --- | --- |
| Real time | 3 | 6792 | walk/natural 100.0% | 0.691 |
| 4 s/s | 4 | 5706 | walk/warped 85.6%, walk/timelapse 12.8%, walk/natural 1.6% | 0.691 |
| 1 min/s | 19 | 7598 | walk/timelapse 98.0%, walk/natural 1.1%, stand/natural 0.3%, perch/natural 0.2%, walk/warped 0.2%, forage/natural 0.1% | 0.856 |

### 4.13 scripts/motion-probe.mjs gait on the 160 m map (creature harness, 30 s; before = a snapshot of the base commit)

| | Stances | Drift at natural speed: median, 95th percentile (cm) | Drift with the stride stretched: median, 95th percentile (cm) | Hind foot under the ground by more than 1 cm | Clip switches per animal per 5 s | Moving toggles per animal per 5 s |
| --- | --- | --- | --- | --- | --- | --- |
| before | 428 | 0.25, 2.11 | 0.71, 3.77 | 0 | 1 | 1 |
| after | 437 | 0.2, 2.3 | 0.69, 3.74 | 0 | 1 | 1 |

### 4.14 scripts/motion-probe.mjs toggles on the 160 m map (1 min/s; strategy view 60 s, close view 30 s)

| | View | Moving toggles per animal per 5 s | Clip switches per animal per 5 s | Largest joint jump at a clip change (rad) | 99th percentile (rad) |
| --- | --- | --- | --- | --- | --- |
| before | strategy | 0.62 | 1.21 | n/a | n/a |
| before | close | 0.69 | 1.25 | 1.36 | 0.50 |
| after | strategy | 0.62 | 1.18 | n/a | n/a |
| after | close | 0.70 | 1.30 | 1.47 | 0.32 |

## 5. Pictures and files

Everything is in `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w1-travel-walk/`, with `before/` and `after/` holding the same file names and framing. Each contact sheet is one animal, time left to right, taken with a camera that rides beside it.

| File (in `before/` and `after/`) | What it shows |
| --- | --- |
| `field-1x-sheet.png` | Akiwe travelling at 1 min/s, 5 frames 150 ms apart: a bounding gallop with dust before, the walk clip after |
| `field-watch-sheet.png` | The same animal at 4 s/s, 5 frames 170 ms apart: a walk with planted feet, before and after (before, only the harness could reach this speed) |
| `field-rt-sheet.png` | The same animal at Real time, 5 frames 450 ms apart: one frozen stand pose sliding before, a slow walk after |
| `field-start-rt-sheet.png` | Fumbira (44 y) starting a trip at Real time, 1, 2, 4, 7 and 11 s after her drawn body first moves: the stand pose throughout before, stepping after |
| `field-stop-watch-sheet.png` | Chiriku stopping at 4 s/s, 6 frames 250 ms apart: the left hand held up before, down after |
| `app-ui-time-panel-1min.png` | The time panel at 1 min/s: seven speeds before; eight after, with the time-lapse line |
| `app-ui-time-panel-watch.png`, `app-watch-1440x900.png` (after only) | The time panel and the whole app at the watching speed |

Fourteen pictures in all. Data: one JSON per capture (`field-*.json`, `small-*.json`, `app-*.json`, `motion-*.json`). Scripts: `census.mjs` (environment harness at an exact tick), `app.mjs` (the running app), `sheet.py`, `tables.py` (prints section 4), `pace-numbers.ts` (prints section 3), `prescan*.ts` (model-free scans of seed 48 used to choose ticks and animals). Single frames were kept out of the directory.

## 6. What a viewer sees now

- **Real time (key 1).** A traveller walks from the first second of its trip: a slow, short-stepped walk (about a 33 cm stride once a second).
- **Watch 4× (key 2).** A travelling animal walks at 1.4 m/s on screen with feet that stay where they land. A 300 m trip takes a little over three and a half minutes to watch.
- **1 min/s (key 3, still the default) and faster.** Travellers are on the walk clip in the time-lapse regime (cadence at its cap, feet not pinned) and cover 21 m a second; the interface says "time-lapse". Runners gallop.
- **In crowns.** No animal walks or gallops on the spot; a climber's limbs cycle at most 1.6 times a second.
- **At a stop.** The walker puts its raised hand or foot down, stands for the rest of the 0.8 s, then changes clip.

## 7. What is left, and what was not done

1. **The Real time walk on the default field map is a shuffle**, as the fact-check said: `walkMps` 0.35 m/s is an effective speed with the pauses folded in, not a walking speed, so the body covers 35 cm a second. With the gait mechanism on (`walkGait` 1) the Real time walk is a real one (about 0.64 m a stride for a male). That is a simulation choice, outside this stage.
2. **1 min/s on the field map is still time-lapse**, now an honest one. The follow camera still cannot hold a 21 m/s animal in the close view. The default speed was not changed (section 8).
3. **With the gait mechanism on, 4 s/s is at the edge of what feet can grip** (they grip up to about 3.7 s/s for an adult male): in the capture 85.6% of samples were a walk with the stride at full reach and 12.8% time-lapse. If a Track E stack becomes the app's default, the watching speed should come down to about 3 s/s, or Real time used.
4. **Nothing moves through a crown on screen.** An animal at height is still drawn at one place on a branch; it no longer runs there, but a clamber or branch-walk clip that travels (and the branch to stand on) is a later stage. Hunters in the canopy sit.
5. **Most climbing is not drawn as climbing.** In the first 1,400 ticks of seed 48 on the field map, vertical moves of more than 0.5 m were made in the forage act in 516 animal-ticks, travel 216, follow 94, pant-grunt 87, play 68, and in the climb act in 13. Only the climb act gets the climb clip; the others are placed on their branch as soon as they are 0.3 m up and on the ground when they come down. Not touched ("cap and no-gallop only").
6. **The stop is a foot put down, not a step finished.** The limb lands where its swing had reached; the stance is not squared, and sitting or lying down is still a pose blend. Labels still change one to two ticks before the body (stage W4).
7. **A few gallop samples remain at 1 min/s** (under 1% of displaced ground animals): real runners, and bodies finishing a run after their act label has changed (the label leads the body by two ticks).
8. **The menu bar's second line** reads "time-lapse" instead of the achieved rate at time-lapse speeds, unless the clock is capped or measures under half the chosen rate. The time panel still shows the measured rate. If the integrator prefers the number in the bar, it is one expression in `src/ui/hud.ts`.
9. **Not run, by the brief:** the whole test suite, `pnpm build`, `gpu-probe`, `perf-probe`. Not possible here: the save and reload steps of `verify-browser.mjs` (no SQLite file on a worktree server) and `audio-probe.mjs` (no audio files).
10. **Trip starts in the app:** only three were caught in the app run after the change (0.7, 0.8 and 1.0 s to the walk clip; table 4.5). A fourth, Dalubi, began 11 frames before the recording ended, so his "never" is not a result. The recorder registers an animal only when it first sees it moving at under 0.1 m/s; I did not check why the others were missed. The harness run has all eight starts, before and after.
11. **A held clock freezes walkers mid-stride on the field map** (found in the review, not changed). The moving test reads the path at the reference rate, and the path's velocity does not fall to zero when the clock is paused or waits for the model, so a walker keeps the walk clip and its raised hand or foot for as long as the clock is held (7 of 7 adults mid-trip after 3 s paused, table R4). Before, and still on the 160 m map, it stood up after 0.8 s. As a freeze-frame this reads correctly; one side effect: a walker held in the stream keeps ringing the water.
12. **Slow circling play is a creeping walk at Real time** (found in the review, not changed). Players that circle at about 0.1 m/s were drawn on the play clip while sliding; they now count as moving and take the walk clip at a third of a cycle a second (table R2). The same reading as the 160 m map at 1 min/s, but the play clip is lost while they circle.
13. **Left behind outside the repository:** a 5 MB dependency cache, `node_modules/.vite-probe-5196`, in the main checkout's untracked `node_modules`, written by `scripts/vite.probe.config.mjs` when the base commit was served for the "before" motion probe.

## 8. For the user to decide: should the close view open at the watching speed?

Proposal: **yes, on the field map.** After the dawn prologue the clock would settle at Watch 4× instead of 1 min/s when the view is the close view (one line in `src/ui/app.ts` `endPrologue`, and the assertion "prologue settles to 1 min/s" in `scripts/verify-browser.mjs`). Not done: the brief reserves it for the user.

- For: the app opens low beside one animal. At 1 min/s that animal is drawn at 21 m/s, the camera loses it, and every step is schematic. At 4 s/s the first thing a visitor sees is a chimpanzee walking, and a model decision (about 0.44 s on this computer) fits inside one 3.75 s tick.
- Against: at 4 s/s a simulated day takes six hours. A visitor who wants to see the day must find the speed keys; the strategy view would keep 1 min/s.
- A middle way: keep 1 min/s as the default and show a one-line hint under the clock on first entry to the close view ("Press 2 to watch at walking pace").

## 9. Review (a second agent, 10 October 2026)

A second agent read the whole diff, re-ran the checks and re-measured the headline numbers with its own capture script on the branch as built (0dbcc45), then fixed what it confirmed. Its scripts, data and pictures are in `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w1-travel-walk/review/` (`review.mjs`: a census by age class and act on the environment harness; `app-check.mjs`: the running app; `ui-check.mjs`: the speed control at three widths; `prescan-young.ts`, `prescan-gallop.ts`: model-free scans used to choose ticks; `census-recheck.mjs`: the builder's `census.mjs` writing to `review/recheck/`; `review-tables.py` prints the tables below from the JSON files).

**What held.** The headline claims reproduce: adults travelling on the ground are on the walk clip at Real time, at 4 s/s and at 1 min/s, in the harness and in the app, in the close view and the strategy view, by day and at night in rain (tables R1, R4); a trip started at Real time is on the walk clip within a second (R3); the stop, the climbing cap and the rule at height do what the document says (R5). Young animals on their own feet and players walk too, and no gallop in slow motion was seen (R2; a scan of the first 1,400 ticks, `prescan-gallop.ts`, found 13 animal-ticks in which a body would take the gallop clip by its speed at the reference rate while moving slower than a natural gallop at Real time: 3 in the play act at 0.21 to 0.28 m/s, 10 at about 1 m/s under other act labels). The tables of section 4 print unchanged from the builder's JSON files. `git diff dea2643..HEAD` is empty for `src/sim`, `data`, `tests/fixtures`, `src/types.ts` and the shared documents. Nothing new allocates per frame. On the 160 m map the ground path is the old code (`refMode` false); the three changes that do apply there are the ones section 2 names.

**What was wrong, and is fixed on the branch.**

1. `scripts/perf-probe.mjs` pressed the wrong speed keys, and the document said it was unaffected. Its own list of speeds had no Real time entry, so it was already one key off before this stage and two keys off after it: the scenario `rts-1d-day` ran at 1 h/s (its output said `"speed":"1h"`). The list now follows `SPEED_PRESETS`, the soak picks 1 day/s by id, and the probe stops when the app reports another speed than the one asked for. Re-run: `rts-1d-day` reports `1d`, `close-1x-day` reports `1x`. A clock test (`tests/clock.test.ts`) now reads the probe's list and compares it with `SPEED_PRESETS`, so the next preset cannot move the keys unnoticed.
2. The time panel did not fit its eight buttons (table R6). The selected "Watch 4×" label was 2 px wider than its button at every desktop width, and at 390 px "Real time" and "Watch 4×" overflowed their cells and ran into "1 min/s". The panel is now 512 px wide and takes two rows of four buttons below 480 px.
3. `src/ui/app.ts` kept the panel inside the window with a constant written for the 420 px panel (`innerWidth - 440`). It now uses the panel's measured width. No overflow was seen with the old constant at the widths tried; it would have let the 470 px panel pass the right edge by up to 30 px wherever the clock control sits within 490 px of it.
4. The stop had no test. `tests/render-pace.test.ts` now poses the walk, sneak, gallop and swagger clips over a whole cycle: settled, every hand and foot is at its stance height and counted as planted, where its swing had reached; a walk in progress keeps the swing heights it had. Both assertions fail when the corresponding line of `poses.ts` is removed (tried).

**What was found and left** (items 11 and 12 of section 7): a held clock freezes field-map walkers mid-stride, and slow circling play is drawn as a creeping walk at Real time. Neither is a fault of the picture; both are changes the first report did not name. Seen in passing and older than this stage: at 1 min/s about half the frames of a climb made in the climb act hold the cling clip and not the climb clip (R5; the same before, table 4.8), so the capped cycle is on screen for about half a second of such a climb.

**What the review did not do.** It did not run the whole test suite, `pnpm build`, `gpu-probe` or `audio-probe` (no audio files here). `scripts/verify-browser.mjs --no-model` was re-run and behaves as section 2 says: eleven steps pass, including both speed-key steps, then "store ready" fails because the SQLite file is not served from a worktree. The 160 m map was censused after the change only (the builder's before and after stand); `scripts/motion-probe.mjs gait` was re-run once on it (natural drift median 0.22 cm, 95th percentile 2.01 cm, 434 stances, no foot under the ground), inside the builder's spread. One seed (48), one machine, load 3 to 5.

### R1 Adults travelling or following on the ground (environment harness, field map unless said; every frame; path speed of 0.03 m/s or more)

| Capture | Speed | Samples | Clip and regime |
| --- | --- | --- | --- |
| field-rt | Real time | 21010 | walk/natural 100.0% |
| field-watch | 4 s/s | 16700 | walk/natural 100.0% |
| field-1x | 1 min/s | 13788 | walk/timelapse 99.3%, walk/natural 0.4%, perch/natural 0.1%, stand/natural 0.1% |
| night-watch | 4 s/s, 21:00, rain 0.8 | 8970 | walk/natural 100.0% |
| small-1x | 160 m map, 1 min/s | 1179 | walk/warped 96.9%, walk/natural 2.5%, perch/natural 0.5% |

### R2 Young animals (4 to 12 y) and players moving on the ground on their own feet (field map)

| Capture | Speed | Who | Samples | Clip and regime | Frames in view on a gallop slower than its own slowest natural cadence |
| --- | --- | --- | --- | --- | --- |
| young-rt | Real time | young, any act | 4296 | walk/natural 99.6%, forage/natural 0.4% | 0 |
| young-watch | 4 s/s | young, any act | 3289 | walk/natural 97.0%, walk/warped 2.6%, stand/natural 0.4% | 0 |
| field-1x | 1 min/s | young, any act | 640 | walk/timelapse 100.0% | 0 |
| play-rt | Real time | young, any act | 8328 | walk/natural 99.8%, stand/natural 0.2% | 0 |
| play-rt | Real time | adults in the play act | 6378 | walk/natural 100.0% | 0 |
| play-watch | 4 s/s | young, any act | 9988 | walk/natural 99.2%, walk/warped 0.7%, stand/natural 0.1% | 0 |
| play-watch | 4 s/s | adults in the play act | 6870 | walk/natural 100.0% | 0 |

### R3 Trips that start at Real time (the builder's eight adults, ticks 101 to 105): seconds from the first frame the path moves to the first locomotion clip

| Animal | Seconds | Clips in the first 20 s (frames) |
| --- | --- | --- |
| Kiboro (28 y) | 0.2 | {'stand': 12, 'walk': 1099} |
| Tindiro (17 y) | 0.2 | {'stand': 12, 'walk': 1099} |
| Koruza (24 y) | 0.9 | {'stand': 49, 'walk': 1122} |
| Tavuni (27 y) | 0.8 | {'stand': 49, 'walk': 1151} |
| Sanaki (22 y) | 0.1 | {'stand': 4, 'walk': 1196} |
| Rukaso (17 y) | 0.7 | {'stand': 44, 'walk': 1156} |
| Oyaku (12 y) | 0.8 | {'stand': 47, 'walk': 1154} |
| Fumbira (44 y) | 0.8 | {'stand': 49, 'walk': 1152} |

### R4 The running app (field map, seed 48, 1440 x 900, from 09:39): adults travelling or following on the ground

| Speed and view | Menu bar | Animals | Samples | Clip and regime |
| --- | --- | --- | --- | --- |
| 1 min/s, close view | 1 min/s / time-lapse | 12 | 5187 | walk/timelapse 98.1%, perch/natural 1.0%, stand/natural 0.4%, walk/natural 0.4% |
| Watch 4x, close view | Watch 4× / 4 s/s | 9 | 12323 | walk/natural 100.0% |
| Real time, close view | Real time / 1 s/s | 8 | 11856 | walk/natural 100.0% |
| 1 min/s, strategy view | 1 min/s / time-lapse | 9 | 3959 | walk/timelapse 99.8%, perch/natural 0.2% |

Paused at 1 min/s for 3 s: 7 adults were mid-trip; on the walk clip 7, still counted as moving 7, with at least one hand or foot off the ground 7.

### R5 The stop, climbing and height (field map)

- Stop at 4 s/s (Chiriku): on the walk clip for 700 ms after the body stops, a stance flag off for 83 ms of that.
- Climb act at 1 min/s (animal 41): cadence on the climb clip min 1.6, median 1.6, max 1.6 cycles a second over 25 frames.
- Stop at 1 min/s (the builder's own capture script, run again): on the walk clip for 667 ms after the body stops, a hand or foot in the air for 50 ms of that.
- Foot drift of the walk at 4 s/s (Akiwe, the builder's own capture script, run again): median 0 cm, 95th percentile 0.19 cm, largest 0.56 cm over 161 stances; 1501 of 1501 frames on the walk clip; hind foot under the ground by more than 1 cm in 0 of 1860 frames; cadence 1.61 cycles a second.
- The same climb with the builder's script: 28 of 57 frames that move vertically are on the climb clip; by act, clip and regime {'climb:clingTrunk/0': 15, 'climb:clingTrunk/2': 12, 'climb:perch/0': 2, 'climb:climb/2': 28} (the same split between the climb and cling clips as before this stage, table 4.8).
- Above 0.3 m and moving sideways, all captures: in view, locomotion clip: 4; in view, other clip: 3151; out of view, locomotion clip: 286; out of view, other clip: 6652 frames.

### R6 The time panel's speed buttons: width a label needs against the width its button has (px), with the Watch 4x button selected

| Window width | | Panel (left to right edge) | Labels wider than their button |
| --- | --- | --- | --- |
| 1440 | as built (0dbcc45) | 320 to 790 | Watch 4× needs 54, has 52 |
| 900 | as built (0dbcc45) | 69 to 539 | Watch 4× needs 54, has 52 |
| 390 | as built (0dbcc45) | 8 to 382 | Real time needs 44, has 40, Watch 4× needs 46, has 40 |
| 1440 | after the review | 320 to 832 | none |
| 900 | after the review | 69 to 581 | none |
| 390 | after the review | 8 to 382 | none |

Keys, after: 1 rt, 2 watch, 3 1x, 4 10x, 5 1h, 6 6h, 7 1d, 8 max, 9 max (9 selects nothing; the speed stays).

| Map | Speed | Menu bar | Time panel state line | Time panel rate |
| --- | --- | --- | --- | --- |
| field | 1 min/s | 1 min/s / time-lapse | Time-lapse · bodies outrun their steps; every tick still runs | 55 s/s 4 ticks/s |
| field | Real time | Real time / 1 s/s | Running · every chimp resolves every tick | 1 s/s 1 tick / 15 s |
| field | Watch 4x | Watch 4× / 4 s/s | Running · every chimp resolves every tick | 4 s/s 1 tick / 3.8 s |
| field | 10 min/s | 10 min/s / time-lapse | Time-lapse · bodies outrun their steps; every tick still runs | 9.8 min/s 39 ticks/s |
| field | paused | 10 min/s / Paused | Paused · Space to resume | Paused |
| 160 m | 1 min/s | 1 min/s / 1.2 min/s | Running · every chimp resolves every tick | 1.2 min/s 5 ticks/s |
| 160 m | Real time | Real time / 1 s/s | Running · every chimp resolves every tick | 1 s/s 1 tick / 15 s |
| 160 m | Watch 4x | Watch 4× / 4 s/s | Running · every chimp resolves every tick | 4 s/s 1 tick / 3.8 s |
| 160 m | 10 min/s | 10 min/s / time-lapse | Time-lapse · bodies outrun their steps; every tick still runs | 10 min/s 40 ticks/s |
| 160 m | paused | 10 min/s / Paused | Paused · Space to resume | Paused |

Pictures (in `review/after/` unless said): `field-1x-sheet.png`, `field-watch-sheet.png`, `field-rt-sheet.png` (Akiwe at the three speeds, the builder's framing), `young-rt-sheet.png` (a 7-year-old travelling at Real time), `play-rt-sheet.png`, `play-watch-sheet.png` (players circling), `stop-watch-sheet.png`, `night-watch-sheet.png` (4 s/s at 21:00 in rain), `app-paused-1440x900.png`, `app-strategy-1min-1440x900.png`, and the time panel at 390 and 900 px as built (`review/builder/ui-field-*.png`) and after the fix (`review/after/ui-field-*.png`). The builder's `after/app-ui-time-panel-*.png` and `after/app-watch-1440x900.png` (section 5) show the panel as first built, 470 px wide.

## For the integrator

**Merge notes.**
- Files: `src/clock.ts`, `src/main.ts`, `src/style.css`, `src/render/creatures.ts`, `src/render/creatures/gait.ts`, `src/render/creatures/poses.ts`, `src/render/creatures/pace.ts` (new), `src/render/env/harness.ts`, `src/ui/app.ts` (review), `src/ui/contracts.ts`, `src/ui/hud.ts`, `src/ui/timebar.ts`, `scripts/verify-browser.mjs`, `scripts/audio-probe.mjs`, `scripts/perf-probe.mjs` (review), `tests/clock.test.ts`, `tests/render-pace.test.ts` (new), this document.
- Likely conflicts: `src/render/creatures/poses.ts` and `src/render/creatures.ts` with W5 (grooming: `quadGait` and `PoseCtx` are touched here; the grooming clips are not) and with W3 if it edits `creatures.ts`; `src/ui/hud.ts`, `src/ui/contracts.ts`, `src/main.ts`, `src/ui/app.ts` and `src/style.css` with W4 (this stage adds one optional dependency, `lapseRate`, the time panel's width, one rule for phones, and one line of `toggleTimePanel`).
- Any script or note that names a speed by its key must use the new keys (1 Real time, 2 Watch 4×, 3 1 min/s, 4 10 min/s, 5 1 h/s, 6 6 h/s, 7 1 day/s, 8 Max). Three scripts press speed keys: `verify-browser.mjs`, `audio-probe.mjs` and `perf-probe.mjs`; all three are updated. Saves store the preset id and are unaffected; the new id is `watch`.
- `scripts/perf-probe.mjs` numbers taken between the commit that added Real time (bd961de) and this branch are labelled with the wrong speed: `1x` scenarios ran at Real time, `1h` at 10 min/s, `1d` at 6 h/s, `max` at 1 day/s (each scenario's own `speed` field in the output says what ran). Anything quoted from such a run as a 1 day/s or Max figure should be re-taken.
- Run at the merge: `pnpm test`, `pnpm build`, and `node scripts/verify-browser.mjs` against `pnpm dev` (the save and reload steps did not run here).

**IMPLEMENTATION_PLAN.md**, under "Stages W1 to W5", replace the W1 bullet's ending or add after it:

> **W1 status:** Built on branch `w1-travel-walk` (10 October 2026; agent-reported, then reviewed by a second agent that re-measured the numbers below and fixed the speed keys of `scripts/perf-probe.mjs` and the time panel's layout; awaiting the integrator's merge; `docs/staging/w1-travel-walk.md`). On the field map the creature layer reads the moving test and the choice of clip at the world's reference rate (`src/render/creatures/pace.ts`: 6.86 s/s; 2.73 with `walkGait`), so adults travelling on the ground are on the walk clip at Real time (stand 100% before), at the new watching speed and at 1 min/s (gallop 98.9% before, walk in time-lapse 99% after); a trip started at Real time is on the walk clip within a second (4 of 8 never before). The 160 m map keeps its expressions bit for bit. Also: no locomotion clip above 0.3 m, the climb cadence capped at 1.6 cycles a second (15 to 30 before at 1 min/s), a stopped walker lowers its raised limb (0.6 s in the air before). A preset Watch 4× (4 s/s) is key 2 and the other speed keys moved up by one; the default speed is unchanged. Open for the user: whether the close view opens at the watching speed. Left: the 0.35 m/s walk is a shuffle at Real time (`walkMps` is an effective speed), nothing moves through a crown on screen, most climbing is not in the climb act.

**AGENTS.md**, Gotchas, one line:

> - Creature pace (stage W1): the creature layer's moving thresholds (0.30 and 0.18 body lengths a second) and gallop entries were tuned where the 160 m map's walk plays at 1 min/s. A world that walks at another speed reads them at its reference rate (`render/creatures/pace.ts`; 6.86 s/s on the field map, from the faster sex's speed with `walkGait`), whatever the playback speed; the 160 m map keeps the original expressions. Above `lapseRate` (about 9 s/s on the field map) a walk is time-lapse and the interface says so. Speed keys are positions in `SPEED_PRESETS` (1 Real time, 2 Watch 4×, 3 1 min/s … 8 Max): a new preset moves the keys that `scripts/verify-browser.mjs`, `scripts/audio-probe.mjs` and `scripts/perf-probe.mjs` press (the last one keeps its own list, `SPEEDS`, and stops when the app reports another speed).

**AGENTS.md**, "Verifying a change", the environment harness line becomes:

> - `/src/render/env/harness.html?hour=&rain=&view=&quality=` (`&profile=field`, `&advance=<hours>`, `&rate=<eco s per s>`, `&focus=<id>`, `&params={"walkGait":1}` for parameter overrides)

**README.md**, line 34, the presets sentence becomes:

> Presets: real time (1 s/s: one tick every 15 real seconds, with motion interpolated between ticks), a watching speed (4 s/s, "Watch 4×": on the field map a walk is drawn at walking pace, with feet that stay where they land), 1 min/s, 10 min/s, 1 h/s, 6 h/s, 1 day/s, and Max (as many ticks as fit in the frame: about 65% of the frame, minus render and UI time, adapted to 60 or 120 Hz). On the field map everything from 1 min/s up is time-lapse (animals cover ground faster than steps can show), and the time bar says so.

**README.md**, line 103:

> - **Playback:** Space pauses; `1`–`8` pick speeds (`1` is real time, `2` the watching speed, `3` 1 min/s).

**docs/simulation.md §17:** no rows. This stage adds no simulation parameter and reads four existing ones (`walkMps`, `walkGait` with `patchEcology`, `walkGaitMaleMps`, `walkGaitFemaleMps`).

**docs/visual-plan.md** (not on the list of shared files, but not this stage's document, so left alone), line 321, suggested wording:

> - A2 and A5: distance-driven phase, stride warp to 1.6×, three regimes with hysteresis, phase-synced walk↔gallop. Stop-on-plant was not in the code until stage W1 (10 October 2026), which lowers a stopped walker's raised limb; it still does not finish the step. Per-individual limb phase in 0.45–0.70 [M].

**HANDOFF.md:** nothing needed beyond the plan's status line.
