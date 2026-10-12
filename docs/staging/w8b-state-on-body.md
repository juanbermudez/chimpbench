# Stage W8: the state that drives decisions on the body, and idle life

Branch `w8b-state-on-body`, cut from `integrate-t2` at e883e6e (stages W6, W7 and W10 merged). Written 11 and 12 October 2026. It is a rebuild: an earlier builder of this stage was cut off before running anything, and its uncommitted tree is kept as commit 5ee2096 on `w8-state-on-body` (old base 7f9ec5b). Section 3 says what was taken from it.

Renderer and interface only, with one addition to the public simulation API: a read-only reader, `bodyStateOf` in `src/simulation.ts` (section 2). Nothing under `src/sim`, `src/types.ts`, `data/` or `tests/fixtures` changed. No parameter and no stored contract field was added. The World is read and never written; the golden hashes and the field pin were run and did not move (section 7).

Where the stage comes from: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-chimp_body_and_face.md`, issues "Raised hair is invisible" and "The state that drives decisions does not reach the body"; `visual-animation_and_motion.md`, issue "No idle life: every stationary animal is a statue"). The renderer read four things from an animal's state (injury, mood, energy below 0.25, the current call), a coat value of 1 moved the surface 6 to 24 mm, and about 70% of animal-time is stationary and was drawn without movement.

Everything this stage invents about how a chimpanzee looks or moves is a **stylization**, labelled so in code and listed in section 5. Two statements rest on a source already in `docs/research.md`: hair stands on end in a charging display, and self-scratching stays raised for ten minutes after aggression received ("Addendum: W8 state on the body and idle life").

Pictures and readouts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w8b-state-on-body/` (`before/`, `after/`, the capture script and probes in `probes/`). Section 4 lists them.

A second reader went over the branch on 12 October 2026 and repaired three faults (section 8; pictures and readouts in `review/` beside the others). Sections 1 to 7 are the builder's, brought up to date where a repair changed what they say.

## 1. What a viewer sees now

1. **Raised hair shows.** A coat on end lifts the surface up to 5 cm on the back, shoulders and upper arms (tapering down the forearm), six tenths of that on the lower back and half on the crown; nothing on the face, ears, hands, feet or belly. An adult is drawn at 1.5 times life size, so on screen that is up to 7.5 cm. The coat also loses its sheen and its fuzz stands further out. Shadows and the see-through silhouettes of the strategy view follow, because the lift is in the vertex code all passes share. An animal that is small on screen gets up to twice the lift, so the difference survives in the strategy view.
2. **The coat follows a continuous value, not only the display clip.** The value is the larger of what the clip holds (a display holds 1) and the animal's arousal. Arousal comes from the simulation's fast and slow arousal states where they exist, else from public stress above 0.3, with a floor from the published mood (aggressive 0.6, excited 0.3). A frightened animal's coat is pulled flat instead: sleek, a little shinier, the fuzz lying in.
3. **A fed animal and a hungry one differ.** The belly rounds by up to 6.5 cm with a full gut and tucks by up to 3.5 cm with an empty one (bind metres, as above); the flanks follow at half strength, and hollow with lost reserves or poor health. A pregnancy rounds the belly from a quarter of gestation on, at term by four fifths of what a full gut adds.
4. **A sleepy animal looks sleepy.** The upper lid sinks over the eye (to a little over half), blinks last up to three times as long, yawns come up to seven times as often, a seated animal nods off and comes back up, and breathing slows.
5. **Nothing stationary is a statue.** Every living animal breathes, at its own rate and phase: chest and shoulders in the pose, ribcage and belly in the shader; deeper lying down and after exertion. Over stationary clips, each animal runs its own schedule of one-shot events: a scratch of the flank, thigh or head (belly when on its back), a yawn, a shift of weight, a glance at a neighbour. No two animals share a schedule.
6. **Scratching follows state.** The scratch rate rises with arousal and is 3.5 times the baseline for ten simulated minutes after the animal lost a conflict.

Two things a viewer of the default app world will rarely or never see (section 4.5):
- **Drooping lids: never.** That world keeps no sleep pressure, and the public stand-in (1 minus energy) stays under 0.2 all day. Lids droop on a world that runs the Track E mechanisms (the working base): there they sink from about 16:00.
- **A coat raised outside a display, a sleek coat, a post-conflict scratch: rarely.** Arousal is above 0.1 in 1.0% of waking animal-time, an animal is afraid in 0.08% and within ten minutes of a lost conflict in 0.37%. The belly, in contrast, moves every day: tucked at dawn, round by late morning.

## 2. How it is built

| Part | File | What it does |
| --- | --- | --- |
| State to channels | `src/render/creatures/bodystate.ts` (new, pure) | Belly, flank, lid, arousal, fear, scratch rate and yawn rate from public fields, or from the Track E record when the simulation gives one. The coat value from clip, arousal and fear. |
| The reader | `src/simulation.ts` `bodyStateOf` | A living animal's Track E body state as the contract's `BodyPercept`; null on the default parameters. Read-only. |
| Shader | `src/render/creatures/material.ts` | The signed coat, belly, flanks and breath in the shared vertex code (`SKIN_VERTEX`, `BODY_STATE`); coat shading, the lowered lid. |
| Texels | `src/render/creatures/rig.ts` | The layout comment. `ROW_TEXELS` stays 132. |
| Idle schedule | `src/render/creatures/secondary.ts` | `idleStep` and its helpers; a blink length for `blinkAt`. |
| Idle layer | `src/render/creatures/idle.ts` (new, pure) | Breathing, weight shift, yawn, nod and the body's part in a scratch laid over a pose; the scratching wrist's place on the animal's own body. |
| The layer | `src/render/creatures.ts` | Reads the state about once a second per animal, eases it, steps the schedule, lays the idle layer over the clip, re-solves the scratching arm, writes the texels. One more gaze in `updateAttention`. |
| Old scratch removed | `src/render/creatures/poses.ts` | Two lines: the seated rest's own scratch on a 30 s sine (about 9 s of every 30, whatever the animal's state). |
| Harness | `src/render/creatures/harness.ts` | `&idle=0`, `&w8=0`. |

### What the renderer reads

Public contract fields: `Chimp.hunger`, `energy`, `stress`, `health`, `pregnancy`, `mood`, `action`, `lastConflict`, `alive`, `carryingMeat`, `carryingDeadId`. Never `chimp.sim`. Rank, injury and lactation are public too and are not drawn by this stage (the limp from injury is unchanged).

### The one reader, and why it is not a stored field

Gut fill, body reserves, sleep pressure and the two arousal states live in `chimp.sim` and are published only inside a decision packet (`DecisionContext.body`, type `BodyPercept`, at `observeState` 1). The brief allowed one optional read-only contract field for them. I added a reader instead:

```ts
export function bodyStateOf(world: World, c: Chimp): BodyPercept | null
```

It returns the same record `observe()` builds, through the same function (`src/sim/observe-state.ts` `bodyPercept`), for a living animal when the energy ledger, the sleep rhythm or the endocrine states run, and null otherwise. Reasons for a reader over a stored `Chimp.body`:

- Nothing is stored, so no key enters `Chimp` or a save, and no world hash can move, on any parameter set. A stored field would have to be written every tick for every animal of every Track E world, for a reader that needs it once a second for the animals on screen.
- It is the existing contract type, not a new one.

This is a deviation from the letter of the brief ("one optional contract field"). If the integrator wants a stored field, the change is local: have the simulation write `chimp.body` where it now refreshes the public needs, and replace the one call in `creatures.ts` `readState`.

Each public stand-in, and what replaces it when the record exists:

| Channel | Default world (public fields) | Track E world (`BodyPercept`) |
| --- | --- | --- |
| Belly | 1 − `hunger` as gut fill | `gutFill` |
| Flanks | `health` under 0.9, plus half the gut's part | `reserves`, plus half the gut's part |
| Lid, yawns, nods, breathing rate | 1 − `energy` | `sleepiness` |
| Coat, scratch rate, breathing rate | `stress` above 0.3; the mood's floor | `acute` × (1 + 0.5 × `arousal`), at least 0.2 × `arousal`; the mood's floor |
| Sleek coat | `mood` fearful, except while giving an alarm | the same |
| Scratch boost | `lastConflict` lost, under 10 simulated minutes old | the same |

Under the sleep rhythm the simulation already sets `energy` to 1 minus felt sleepiness, and under the ledger `hunger` is gut emptiness times appetite, so the public fields carry part of this by themselves.

### Who takes the head: the idle glance is last

The order set at the merge of W6 and W10 is unchanged: a patrol's look; a snake model; the last part of a decision beat; a long call just heard; the rest of the beat; the ordinary candidates (partner, caller, snake model, alpha); the idle scan. The idle glance is reached only when all of those have passed and the selector has chosen the aimless idle scan: it then looks at the neighbour instead of at a random direction. It never preempts anything.

Beyond the gaze: no idle event starts, and one under way ends, while the body moves, is carried or is on patrol; while a decision beat plays (any phase), while the intention movement is in, or while an initiator waits; while the animal listens to a call (W10's 2.4 s) or calls itself; and above 2 min/s (`ABOUT_MAX_RATE`, the limit the beat and the listeners use). An animal that has just become idle waits at least 3 seconds of idle clock before its first event. A yawn or a nod that is ended this way in mid-course does not drop: the pose's own quarter-second blend takes it out (the review's repair 1, section 8).

W10's hold of a listener's clip copies the previous frame's pose, so during the 1.5 s of a hold the idle layer's part of the pose is frozen too (the breath's part, a lean, the trunk's bend toward a scratch). The breath in the shader goes on. A yawn or a nod is not frozen: the hold starts one frame after the cut, on the clip's own pose, while the blend closes the jaw.

### Which clips permit what

A drawing rule (`creatures.ts` `IDLE_ALLOW`). Standing, sitting, resting and perching: everything. Guarding: everything but a nod. Feeding: a weight shift or a glance (arm and mouth are busy). Nursing: yawn, glance, shift. Being groomed, sitting out rain: a yawn. Clinging to a trunk: a glance. Nothing (breathing only): asleep, drinking, grooming, calling, displaying, greeting, fighting, mating, playing, nest building, hunting, every pause of a patrol, every moving clip. A clip the table does not know gets yawn and glance, or everything if its name begins with rest, sit or perch (for clips a later stage adds).

On top of the table, by posture read from the pose (`intention.ts` `postureOf`, `idle.ts` `lieOf`): a scratch needs a seated body or one lying on its side or back, a free hand (not holding on overhead, no prop, no meat), no infant or body held and no partner; a weight shift needs a body that is not lying and carries no infant; a nod needs a seated body with lids already lowered.

Scratches are not drawn on all fours or upright. I tried both: the arm's elbow pole rides with the chest (`rig.ts` `LIMBS`), so with a level trunk the elbow stands straight up over the back (`probes/` has no picture of this kept; it is the fault the grooming stage recorded for picks to the mouth). It needs a per-clip elbow pole in the rig.

### What runs per animal per frame

GPU. No new pass, target, texture or draw call. `ROW_TEXELS` is unchanged at 132: the belly, flank and breath use texel 130 (it was free), the lid uses `P5.z` (free). Still free: `P5.w`, `P6.w`, texel 131.

- **Vertex code, every creature vertex, in the colour, shadow, silhouette and shell passes:** one more texel fetch; smoothstep masks for the coat (upper arm, lower back, crown) and for belly, flank and chest (about 60 arithmetic operations); for an animal whose coat value is above 0.004, two octaves of value noise (16 hash evaluations). Calm animals skip the noise.
- **Fragment code, every creature fragment:** the lid (one comparison; a smoothstep when it is lowered), two clamps; where the coat is raised, two more noise lookups (the same pattern as the vertex lift).

CPU, in `creatures.ts`:

- **Every animal, every frame** (`writeParams`): six more floats written, the blink's length (one division), the far gain (one smoothstep).
- **Every animal whose pose is evaluated this frame** (every frame up close, 12 to 30 times a second for small or distant animals): five eased values, the breathing phase, the tests for what may start, one step of the idle schedule (a few comparisons; hashes only when an event starts or ends), the idle layer (about a dozen additions to pose channels; more during an event).
- **About once a second per animal, staggered:** the channels are read (`bodyChannels`: a dozen arithmetic operations). On a Track E world this calls `bodyStateOf`, which allocates one small object and a key list per call: about one allocation per animal per second, none per frame. On the default world nothing is allocated.
- **Only while an animal scratches:** one more solve of its skeleton per pose evaluation.
- **When a glance starts:** one pass over the drawn animals to find a neighbour.
- **Every carried animal, every frame:** one bit set on its carrier (`Anim.bears`: an infant on the belly, one on the back).
- **On a frame in which the panel's portrait is drawn** (a new selection, then at most every 15 s): one float written and the parameter texture uploaded once more, if the animal's coat is raised and it is small on screen.
- **Allocation per frame:** none. Per animal, created with it: two small records and the idle state.

Frame time was not measured (the GPU probe is off limits; the integrator measures). What I read is the harness's own stopwatch around the layer's update on the main thread (section 4.10).

### Constants (all stylizations or drawing conventions; none is a simulation parameter)

| Constant | Value | Meaning |
| --- | --- | --- |
| `BODY_STATE.COAT_RAISE`, `COAT_SLEEK` (`material.ts`) | 0.05, 0.006 m | lift of a coat on end at the top of a lock (70% of it is even, 30% follows a noise); how far a sleek coat is drawn in. Bind metres: an adult is drawn 1.5 times that |
| coat masks | back mask 1, lower back 0.6, upper arm 0.9 tapering to the wrist, crown 0.5 | where the coat stands |
| `COAT_FAR_GAIN` (`creatures.ts`) | 1 | a raised coat is drawn up to twice as high on an animal under 140 px (fully under 40 px) |
| `BELLY_FULL`, `BELLY_EMPTY`, `FLANK` | 0.065, 0.035, 0.03 m | belly at channel +1 and −1, flanks at ±1 |
| `BREATH_CHEST`, `BREATH_BELLY` | 0.006, 0.008 m | half the travel of a resting breath in the shader; in the pose the chest pitches 0.02 rad and the shoulders roll 0.028 rad |
| breathing rate | 0.26 to 0.36 per s by animal; × (1 + 1.3 exertion + 0.5 arousal) × (1 − 0.25 sleepiness); depth × 1.6 lying | |
| `FILL_NEUTRAL` (`bodystate.ts`) | 0.7 | gut fill drawn as the mesh is built: the daytime median (section 4.5) |
| `PREGNANT`, `PREGNANT_FROM`, `GESTATION_DAYS` | 0.8, 0.25, 227 | what a pregnancy at term adds to the belly channel; from when it shows; the gestation divided by |
| `GUT_FLANK` | 0.5 | how much of the gut's part the flanks follow |
| `HEALTH_SOUND`, `HEALTH_SPAN` | 0.9, 0.5 | health under which the flanks hollow where no reserves are given |
| `LID_FROM`, `LID_FULL`, `LID_MAX` | 0.45, 0.85, 0.55 | felt sleepiness between which the lid sinks; the most it covers |
| `BLINK_SLOW` (`secondary.ts`) | 0.42 s | a blink at full droop (0.13 s otherwise) |
| `STRESS_FROM`, `STRESS_FULL`, `STRESS_COAT` | 0.3, 0.8, 0.6 | public stress to arousal on the default world |
| `TONIC_COAT`, `SLOW_GAIN` | 0.2, 0.5 | the slow arousal's own share; how much it amplifies the fast state |
| `MOOD_AGGRESSIVE`, `MOOD_EXCITED` | 0.6, 0.3 | floors from the published mood |
| `SCRATCH_AROUSAL`, `SCRATCH_AFTER_AGGRESSION`, `POST_CONFLICT_H` | 2, 2.5, 10 min | scratch rate = 1 + 2 × arousal + 2.5 within ten simulated minutes of a lost conflict |
| `YAWN_SLEEPY`, `YAWN_FROM` | 6, 0.35 | yawn rate = 1 + 6 × a smooth step of sleepiness |
| `IDLE_GAP` | 6 to 20 s | idle-clock time between events |
| `IDLE_SHARE`, `NOD_SHARE` | scratch 0.22, yawn 0.06, shift 0.34, glance 0.38; nod 0.3 when lids are down | share of events at baseline drives. A kind the pose forbids becomes a glance, else a shift, else the turn is skipped |
| `idleRate` | 1 up to 4 s/s, √(rate / 4) above, at most 3 | how much faster the idle clock runs: 3 at 1 min/s |
| `IDLE_SETTLE` | 3 s of idle clock | wait after becoming idle |
| event lengths | scratch 2.2 to 3.6 s, yawn 2.7 to 3.3, shift 1.4, glance 1.2 to 2.6, nod 3.6 | real seconds at every speed |
| `SCRATCH_HZ`, `SCRATCH_STROKE` (`idle.ts`) | 3.3 per s, 0.03 body lengths | the rake |
| easing (`creatures.ts` `stepState`) | belly and flank 0.6 per s, lid 0.8, arousal 1.5, fear 2.5 | how fast a drawn channel follows the state read |
| `RIDER_COAT` (`bodystate.ts`; review) | 0.3 | the highest coat value drawn under an infant riding on the back (1.5 cm). Under an infant on the belly the belly is drawn no rounder than built, and gives way at 3 per s |

## 3. From the partial work (5ee2096)

Read as a reference and re-applied by hand; nothing was cherry-picked. It had never been run.

**Kept, with the changes named:**
- `bodystate.ts`, almost whole. Changed after measuring the states (section 4.5) and looking: the lid's thresholds (0.45 to 0.9 became 0.45 to 0.85) and its ceiling (0.7 read as an eye shut, now 0.55); the slow arousal's own share (at 0.35 the animals whose slow state sits at 0.5 to 0.8 all day would have carried a visibly raised coat all day; now 0.2); a pregnancy at term (0.5, hardly visible, now 0.8); the flanks now follow the gut at half strength (reserves stay within 0.01 of the set point over three days of the working base, so that channel hardly moved).
- The reader `bodyStateOf`, as written.
- The shader design: the signed coat value, the belly, flank and breath masks in the shared vertex code, texel 130, the lid on `P5.z`, the shell and shading terms, the far gain. The amounts were raised after looking: belly 4.5 and 2.2 cm became 6.5 and 3.5, the breath 4.5 and 5.5 mm became 6 and 8.
- The idle schedule's design and most of its code.
- The harness flag `&idle=0`, the debug overrides for proof pictures.

**Rewritten:**
- The coat's lift. As written (a quarter even, three quarters noise in cells of 3 cm) the mesh, whose vertices are 1 to 3 cm apart, drew lumps with grey highlights and specks floating off the outline (seen in the first look; that picture was not kept). Now seven tenths are even and three tenths follow a coarser noise, the sheen is cut harder, the fuzz stands out less far, and the coat tapers down the forearm instead of ending at the elbow. The lower back was added and a bald crown is left alone.
- The idle layer's place. It was written into `poses.ts` with its own posture reading. It is now its own file, `idle.ts`, and reads the posture stage W6 already reads (`intention.ts` `postureOf`), with one small addition for how a lying body lies. `poses.ts`, which another stage is editing, loses two lines and gains none.
- Where the layer is called and what stops it. The partial work was written before W6 and W10: it knew nothing of the decision beat, the intention movement, the waiting initiator or the listeners. The tests for "is this animal idle" are new (section 2), and the glance moved from a candidate of priority 2 (above the alpha, and able to hold the head for seconds after the event) to the last place in the merged order.
- The scratch. Sites and sides are as written for seated and lying bodies. On all fours and upright it is no longer drawn (the partial work sent the hand to the crown there; the elbow stands over the back). Over the crown the wrist is now held beside the head with the hand laid in across it, by the rig's end lock: as written the hand ran over the head onto the face.
- The schedule's start after a pause: as written an animal that stopped walking had its next event due at once.
- A slow blink followed by a double blink popped shut; the double blink now waits for the slow one to end.
- The state clock: the read was scheduled on the frame's `elapsed`, which the env harness can freeze (`&t=`); it runs on its own real-time count.
- Event shares, gaps and what happens to a forbidden kind, after counting in the running app (section 4.8). As written a forbidden kind became the next kind in the list, so every forbidden scratch became a yawn, and a clip that permits only a yawn yawned at every turn.

**Dropped:**
- Its second posture reading in `poses.ts` (`POSTURE`, `postureOf`): a duplicate of stage W6's.
- The idle glance as an attention candidate.
- The scratch on all fours and upright.

## 4. Proof

Folder `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w8b-state-on-body/`. `before/` is the merged head e883e6e, `after/` this branch, same file names and framings, taken by `probes/cap.mjs --label before|after <job>`. Harness pictures are on a frozen page clock with a seeded `Math.random`: the same build gives the same pixels (the before tile sheet taken twice differs by 0 in every pixel). App pictures are the field world of seed 48 with the model policy off, brought to a tick by whole ticks, so both builds show the same world (the world hashes match, 4.6).

### 4.1 A calm against an aroused male in the same stance

Harness, one adult male standing on all fours (`mode=single&action=follow`), idle life off so the stance is the same frame. "Figure" is the count of dark pixels (luma under 40) in a 960 by 600 picture; `stance.json`.

Pictures: `01-stance-calm-vs-aroused.png` (from the side, 3.4 m), `02-stance-high-enlarged.png` (from 25.5 m, 54 degrees down, enlarged four times), `08-strategy-calm-vs-aroused.png` and `09-strategy-enlarged.png` (the strategy view of the real scene).

| State set on the harness world | Coat value | Figure before | Figure after | Top of the figure after |
| --- | --- | --- | --- | --- |
| calm | 0 | 59,408 | 59,408 | row 113 |
| public stress 0.6 | 0 before, 0.39 after | 59,408 (+0.0%) | 63,565 (+7.0%) | row 109 |
| mood aggressive (what a display or a charge publishes) | 0.6 | 63,001 (+6.0%) | 65,933 (+11.0%) | row 107 |
| coat held at 1 (what the display clip holds) | 1 | not available | 70,267 (+18.3%) | row 102 |

- Before, the 6% of an aggressive mood was the whole furred surface moved out 4 to 14 mm, the belly and legs with it. After, the back, shoulders, upper arms and crown stand out and the rest does not: the outline is another shape, not a slightly larger copy.
- From the high camera the animal is 66 pixels tall. Figure: 1,391 calm; before, 1,419 with the aggressive mood (+2.0%); after, 1,516 with stress 0.6 (+9.0%), 1,593 with the mood (+14.5%), 1,732 at coat 1 (+24.5%), four pixels wider. That includes the far gain.
- **The strategy view of the real scene** (env harness, default field world, 10:30, paused, a 30 m frame, the adult male Ilobe standing in the open 19.6 m from the nearest tree, 45 pixels of body). His public mood was set on the harness page's own world; nothing else differs. Pixels within 160 px of him that differ from calm by more than 8 of 255: before 123; after 304 with the aggressive mood and 466 at coat 1. In `09-strategy-enlarged.png` the calm animal is a narrow back; the aroused one is humped at the shoulders and about a third wider there.

### 4.2 The display, and fear

- `03-display.png`: six frames of the display clip, 0.35 s apart. The coat value is 1 in both builds. Before, the outline is the smooth muscled body. After, the shoulders, back and raised arm are bulked and matte.
- `04-afraid-sleek.png`: a crouched female (the clip a fleeing animal pauses in). Before, mood calm and mood fearful are the same picture, coat 0.6 (the clip's own value). After, calm keeps the clip's 0.6 and fearful goes to −1: slimmer, with the sheen back on the coat.

### 4.3 A fed against a hungry animal

Harness, an adult female, public hunger set on the harness world; idle life off. 0.70 and 0.13 are the 90th and 10th percentile of public hunger on the default field world. `05-fed-vs-hungry-standing.png` (from the side, 2.6 m), `05-fed-vs-hungry-seated.png` (from the front, 2.7 m); `belly.json`.

| State | Belly channel | Flank channel | Figure, standing | Figure, seated |
| --- | --- | --- | --- | --- |
| before, any hunger | none | none | 83,097 | 75,828 |
| hunger 0.95 | −0.93 | −0.46 | 81,720 | 75,403 |
| hunger 0.70 | −0.57 | −0.29 | 82,306 | 75,566 |
| hunger 0.13 | +0.57 | +0.28 | 84,279 | 76,196 |
| hunger 0.02 | +0.93 | +0.47 | 84,890 | 76,424 |
| pregnant 200 days, hunger 0.3 | +0.75 | 0 | 84,515 | 76,222 |

Pixels differing by more than 8 between hunger 0.70 and 0.13: 3,738 standing, 2,637 seated (0 before). Standing, the underline of the trunk goes from concave to a hanging curve. Seated from the front it is a hollow against a rounded lap; seated from the side the thigh and forearm hide it.

### 4.4 A sleepy animal

- `06-sleepy-faces.png`: twelve faces at public energy 0.9, 0.45 and 0.12 (lid 0, 0.09 and 0.55). Before, the three rows are the same. After, the lids of the last row are down to slits; on the young, pale faces the middle row already shows.
- `07-sleepy-nod-and-yawn.png`: a seated adult at energy 0.12, six frames through its first nod (from 37.5 s) and six through its first yawn (from 61.6 s). Before, at the same page times: a seated animal whose head drifts.
- `14-dusk-working-base-12s.png`: **the working base at 17:30 on day 1** (the env harness with `docs/staging/integrator-kit/params/M6-W50.json`, the real scene, paused). The 35 adults out of the nest have felt sleepiness 0.63 to 0.76 (median 0.69) and lids at 0.23 to 0.48 (median 0.36). The picture is the male Aroko, resting seated in a low fork, lid 0.25, with an infant in front of him whose lids show better on its pale face. Events in the twelve seconds: a weight shift, a glance.

### 4.5 What the states are in a real world

`probes/channels.ts` (output in `probes/channels.txt`): the channel targets by hour, three days of seed 48, animals aged 8 and over out of the nest, simulation only. `probes/states.ts` and `states-w50.ts` print the underlying states.

| | Default field world | Working base (M6-W50) |
| --- | --- | --- |
| The reader returns | null, always (15,666 of 15,666 samples) | a record, always (15,534 of 15,534) |
| Belly at dawn | −0.26 median at 07:00 | −0.97 at 05:00 and 06:00 (an empty gut) |
| Belly by late morning | +0.11 median at 11:00; 10th to 90th percentile −0.20 to +0.60 | +0.27 median at 09:00; −0.47 to +0.80 |
| Lid | 0 in every sample | 0 until 15:00; median 0.14 at 16:00, 0.36 at 17:00, 0.49 at 18:00 |
| Yawn rate (multiple of baseline) | 1 | median 1.9 at 15:00, 3.6 at 16:00, 5.6 at 17:00, 6.6 at 18:00 |
| Arousal over 0.1, 0.3, 0.6 (share of waking samples) | 1.0%, 0.13%, 0 | 6.0%, 1.2%, 0.46% |
| Afraid | 0.08% | 0.17% |
| Within ten minutes of a lost conflict | 0.37% | 0.89% |

So on the default world the belly is the channel that moves daily; a raised coat outside a display is rare and a lowered lid does not happen. On the working base all channels move.

### 4.6 Twelve seconds of a resting party

**Harness** (`mode=stages`: ten animals of all ages side by side, Real time, frozen clock; six frames 2.4 s apart; the pictures frame animals 4 to 6, the readout covers all ten; `idle-rest.json`, `idle-stand.json`, `idle-sit.json`). `10-idle-rest-12s.png`, `10-idle-stand-12s.png`, `10-idle-sit-12s.png`.

| Row | Before | After |
| --- | --- | --- |
| resting (`rest`: two seated, eight lying) | no events exist. The two seated animals play the old scratch on its sine (wrists travel 402 and 327 cm, heads 92 and 71 cm); the eight lying ones do not move a wrist (0 to 26 cm) | 9 events: 2 scratches (wrists 190 and 152 cm), 3 weight shifts, 4 glances; one animal has none in the window. The old scratch is gone: those two seated animals now have 0 cm of wrist travel and a shift or nothing |
| standing on all fours (`stand`) | 0 events, 0 cm of wrist travel, heads 65 cm in all (the attention scan) | 9 events: 7 weight shifts, 2 glances; heads 85 cm in all |
| seated (`sitIdle`) | 0 events, 0 cm of wrist travel, heads 55 cm in all | 9 events: 2 scratches (117 and 122 cm), 7 weight shifts; heads 78 cm in all |

The before build is therefore not all statues in the resting row: its one moving thing was a scratch that ran for about 9 s of every 30 in one variant of one clip, whatever the animal's state. Everything else was still.

**The app** (field world, seed 48, tick 1,496, 12:44, Real time, close view; `12-app-resting-party-12s.png`, `rest.json`): Koruza, Sanaki and Wendoro resting on the ground under the canopy. Before: no events; wrist travel 3 to 26 cm. After: Koruza a glance and a scratch (94 cm of wrist travel), Sanaki a scratch (255 cm), Wendoro a weight shift. The scene is dark (overcast, under canopy) and the animals small: the sheet shows less than the numbers.

**One breath** (`15-one-breath.png`, `breath.json`, `breath-torso.json`): a seated adult and one lying on its side, the picture at the top of a breath in and at the bottom of the breath out (2.0 and 2.45 s apart), with other idle events kept away. Pixels of the torso that differ by more than 8: seated 5,354 before and 9,103 after (of 92,400); lying 17,829 and 22,092 (of 244,400; the lying crop includes the head). The before figures are not zero because the head drifts and the old 0.012 rad chest sine is still there. A still cannot show a breath; these numbers say it is larger than it was, not that it is large.

### 4.7 An animal perched in a tree

- Harness (`11-perch-harness-12s.png`, `perch.json`): a female resting at 8.5 m beside a male feeding at 7 m. Before: no events. After: a weight shift each; the perched female's head travels 8.1 cm against 5.7.
- The app (`13-app-perched-12s.png`, `tree.json`; tick 1,040, 10:50, Real time): the female Ereko resting in a crown. Before: no events. After: a yawn in the window.

**Found while measuring, not caused by this stage and not repaired: a perched body's heading depends on the frame time.** Both wrists of the perched animal travelled the same distance with the body's origin still (33 cm before, 93 to 183 cm in the after films): the whole body turns. `updateMotion` pulls the heading toward the simulation's heading by a step that scales with the frame's length, and `placeGrounded` pulls it toward the branch by a fixed step of 1/30 s, so the resting place of the heading moves whenever a frame is long. Read every frame in one page, six seconds at a time, with this stage switched on and off (`tree.json` `headingWobble`, three films): with a 95th-percentile frame of 33 ms the heading travelled 1.5 to 3.4 rad in six seconds (stage on: 2.5, 2.1, 1.5, 2.3, 3.4; off: 2.2, 2.1, 2.9); with steady 16.7 ms frames 0.04 to 0.8 rad (on: 0.04, 0.05, 0.31; off: 0.05, 0.05, 0.37, 0.57, 0.80). No difference between on and off. On a display that holds 60 frames a second it is small; under load a perched animal twitches.

### 4.8 Counted in the running app

`probes/census.mjs` reads every drawn animal every frame (field world, seed 48, 49 animals, model policy off, headless at 45 to 50 frames a second), from tick 1,480 (12:40); the Real time run from tick 1,490. `census-*.json`.

| Speed | Seconds | Stationary animal-seconds | Events (scratch, yawn, shift, glance) | Events per stationary animal-minute | Stationary time inside an event | Frames with an event where there must be none |
| --- | --- | --- | --- | --- | --- | --- |
| Real time | 45 | 1,665 | 96 (25, 8, 46, 17) | 3.5 | 11.4% | 0 |
| Watch 4× | 60 | 2,171 | 129 (35, 8, 62, 24) | 3.6 | 11.6% | 0 |
| 1 min/s | 60 | 2,302 | 293 (80, 26, 123, 64) | 7.6 | 26.7% | 40 of 143,962 animal-frames, all "a beat has begun" |
| 10 min/s | 20 | 440 | 0 | 0 | 0 | 0 |

- "Must be none": the body moves, is carried, a decision beat plays, the intention movement is in, an initiator waits, or the animal is dead. The 40 frames at 1 min/s are the frames between a beat's start and that animal's next pose evaluation (small animals are posed 12 to 30 times a second, and the event is ended when the pose is next evaluated).
- At 10 min/s nothing but the breath is drawn, as designed.
- No value was non-finite in any frame, and no page error was logged.
- The world hash at tick 1,480 was 7e8ce12f:4250303 in all three runs that start there; the Real time run's, at tick 1,490, is the resting-party film's (49c741cc:4251657).
- The same census counted the channels as drawn. Animal-frames with a coat value above 0.05: none at Real time or Watch 4×, 322 of 143,962 at 1 min/s, 698 of 44,149 at 10 min/s. With a coat value under −0.05 (sleek): 121 at 10 min/s, none at the slower speeds. With a lid lowered past 0.05: none at any speed. So a raised and a sleek coat did occur in the running app; they were counted, not looked at.

### 4.9 Every other action, and the small map

**The action sheet** (`20-tiles.png`, 30 tiles of 300 px at 8 s on a frozen clock; `tiles-diff.json`). The before sheet taken twice differs by 0 in every one of 2,700,000 pixels, so any difference below is the build.

- With the stage switched off (`&w8=0`, `20-tiles-w8off.png`): 25,461 pixels differ from the before sheet, in the ten tiles whose clip or mood holds a coat value (attack 5,705; submit 5,692; display 3,149; charge 3,045; alarm 1,736; flee 1,719; hunt 1,301; guard 1,194; patrol 1,031; shelter 794), plus 95 pixels in four tiles where a neighbouring tile's animal shows in the background. The other sixteen tiles are identical to the pixel. So the only thing that cannot be switched off is the taller coat of a clip that already raised it, which is the point of item 1.
- With the stage on: 50,252 pixels differ. `dead` is identical (0). `rest` (a lying animal: breath only) 107. The rest: breath on every living animal, a held weight shift where the clip permits one (forage 2,490, guard 4,583, consort 1,765), and the coat tiles above (submit 8,054 with a sleek victim and a displaying male).

**The small map** (`21-small-map-strategy.png`, `22-small-map-close.png`; the app on the 160 m map, tick 961, paused in both builds, world hash at tick 960 b449cc58:466286 in both). The census of clips is the same in both builds (forage 15, groom 13, rest 6, and so on, `small.json`). Pixels differing by more than 8: 4,395 of 1,296,000 in the strategy view and 22,580 in the close view (`small-diff.json`), which also counts a name tag that was placed differently and the panel's portrait, taken at another moment. The same code runs there: idle life and the channels are drawn on the small map as on the field map.

### 4.10 The layer's update on the main thread

The harness's own stopwatch around `layer.update`, mean over up to 240 frames after 12 s; headless Chrome on a machine doing other work (`perf.json`, `perf-run3.json`, the capture logs). Nothing about the GPU is measured.

| Scene | Before (2 readings) | After (6 readings) |
| --- | --- | --- |
| 120 animals, strategy scene | 1.08, 1.09 ms | 0.83, 1.02, 1.03, 1.08, 1.26, 1.32 ms |
| 10 animals close up | 0.31, 0.33 ms | 0.18, 0.25, 0.30, 0.34, 0.45, 0.59 ms |

The after readings scatter around the before readings by more than any difference between them. No cost could be resolved this way. The GPU side (one more texel fetch and about 60 operations per creature vertex in every pass) was not measured.

## 5. What is sourced and what is a stylization

- **Sourced:** "Charging displays involved exaggerated locomotion, piloerection and branch shaking" (mullerWrangham2004b [M], Kanyawara). Used for: the coat stands in a display and with arousal.
- **Sourced:** recipients' self-scratching stayed above matched controls for the whole ten minutes observed after aggression (fraser2008 [M, captive]). Used for: the scratch rate is raised for ten simulated minutes after a lost conflict. The size of the rise is a design assumption.
- **Stylizations with no source:** every mapping of section 2's table and every amount in the constants table; that a frightened animal's coat lies sleek (the brief's choice; nothing in `docs/research.md` settles it); the far gain; that stationary animals scratch, yawn, shift, glance and nod at the rates drawn, which were chosen so that a resting party reads as alive (no field rate was compared with them, and none should be read off the screen); the breathing rate and depth; the shapes of all movements.
- **Not looked for:** sources on any of these. `docs/research.md` was searched, the web was not.

## 6. Limits, not done, and what could not be seen

- **Frame time was not measured.** The GPU probe was off limits. Section 2 says what runs; section 4.10 could resolve no main-thread cost.
- **Nothing was seen with a model.** No model process was allowed. The idle glance stands down while a model's answer is in flight (the scan of stage W6 keeps the head); that is read in the code, not seen.
- **Not run, as briefed:** `pnpm test` (the whole suite), `pnpm build`, `scripts/verify-browser.mjs`.
- **In the default app world the lids never droop and a raised coat outside a display is rare** (section 4.5). The sleepy animal and the arousal mapping were seen on the working base only through the env harness at one moment (17:30 of day 1); the app cannot open a Track E world from its address. A coat raised by the working base's fast arousal state was not looked at in a picture (it is above 0.3 in 1.2% of waking animal-time); the mapping is tested as a rule.
- **Not looked at in the running app:** a display or a fight (the coat was seen in the harness and, by a mood set on the harness world, in the env harness); a frightened animal's sleek coat (harness only); a scratch rate raised after a lost conflict (0.37% of waking animal-time on the default world: the rule is tested, the moment was not found and filmed); a pregnant female (the belly was seen in the harness only); night, rain, patrols, hunts.
- **Breathing cannot be shown in a still.** Section 4.6 gives pixel counts over one breath; nobody has watched it as motion except through frame sequences.
- **No scratch on all fours or upright** (section 2): the rig's elbow pole. A standing animal shifts, glances and yawns.
- **The scratching arm of a body lying on its side stands its elbow up** (`10-idle-rest-12s.png`, last frame). It reads as an arm at work on the flank, not as a natural scratch.
- **The raised coat is a swollen surface with a fringe of strand tips, not hair.** At 3 m a fully raised male looks heavily built and matte. It reads as bigger; it does not read as bristling. The mesh has no coat volume (the review's first body issue, not this stage).
- **Seated, the belly is hidden from the side** by the thigh and forearm; it shows from the front.
- **The lid is paint on the eyeball.** On dark adult faces a half-lowered lid is hard to tell from an open eye beyond about 3 m; on the young it is clear.
- **The clips' own breathing sines are still there** under the new breath (0.012 rad on the chest in `poses.ts`, 0.02 rad in the lying poses). They were left because `poses.ts` is being edited by another stage; the two do not share a phase.
- **W10's hold freezes the idle layer's pose for its 1.5 s** (the breath in the shader goes on), except a yawn or a nod, which is blended out first (section 8). Not filmed.
- **The idle events are busy.** A stationary animal starts 3.5 events a minute at Real time and 7.6 at 1 min/s, where a quarter of stationary time is inside an event. No field rate was compared. If it reads as fidgeting, `IDLE_GAP` is the one number to raise.
- **Rank, lactation and injury** are public and were not given a channel (the brief's list of mappings did not ask for them).
- **The reader allocates** one record per animal per second on a Track E world (section 2).
- **The before pictures of the retaken framings** (stance, belly, the idle rows, the breath, the nod and yawn) were taken from an export of the base commit e883e6e served in turn on port 5186, not from this worktree before the first change: the framings were improved after the first look. The rest of `before/` is from the worktree before any change.

## 7. Tests and checks

Run on the final code, Node 22.22.3:

- `pnpm exec tsc --noEmit`: clean. The two new test files were type-checked by hand with the same strict options: clean.
- `pnpm exec tsx --test tests/render-*.test.ts`: 237 of 237 pass after the review (28 files; 211 tests in 26 files before this stage; 235 at the builder's head). The two new files hold 26 tests.
  - `tests/render-bodystate.test.ts` (10, one from the review: a carrier gives way to what it carries): each channel never falls as its input rises and stays in its range; the coat value; the public stand-ins and the Track E record in their place; the reader gives null on the default parameters and a record on Track E ones, and after reading every animal the world hash and the world's JSON are unchanged; the shader's vertex code carries the coat, belly and breath in the body, shell, shadow and silhouette passes and `ROW_TEXELS` is 132.
  - `tests/render-idle.test.ts` (16, one from the review: an event cut short has something to blend out of, one that ended by itself has not): the schedule is the same for the same animal and steps; every pair of twelve neighbours has different sequences and at most two chance meetings in three minutes; shares, gaps and lengths are what the constants say; events come faster at a faster rate and keep their length; scratches rise with the scratch drive (never fall), yawns with the yawn drive; a forbidden kind becomes a glance and never a yawn; nothing starts while the animal is not idle nor the moment it is idle again; the weight shift; slow blinks do not pop; what the layer does to a pose (breath, yawn, nod, shift, scratch); the seated rest no longer scratches by itself.
- Seven mutations were each seen to fail a test and then restored (one schedule for everyone; a belly that falls with fill; the old sine scratch back; the shadow pass without the coat; a reader that stores its record on the animal; fear that does not sleek; an event the moment an animal is idle).
- `tests/sim-params.test.ts` and `tests/sim-track-e.test.ts`: 13 of 13. **The golden world hashes and the field pin did not move.**
- The world hashes of the app films are the same before and after (49c741cc:4251657 at tick 1,490; d256a1d3:4242589 at tick 1,034; b449cc58:466286 on the small map).

Not run: the whole suite, the build, the browser end-to-end check.

## 8. Review (second reader, 12 October 2026)

A second reader read the whole diff and this document, ran the checks again, and then looked for what the builder had not looked at: infants on mothers, every age, a raised coat from the front, from behind and at the armpit, an idle event cut short, the panel's portrait, night, rain, dusk on the working base, a display and a submission in the running app, and the small map. Everything is in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w8b-state-on-body/review/` (`look.mjs` for the harness pictures, `app.mjs` for the census in the running app, `film.mjs` and `scan-app.mjs` for one moment of the app's own world, `coatshare.ts` and `coatwhy.mjs` for the coat counts).

### 8.1 What held

- **The renderer writes nothing and does not open `chimp.sim`.** No added line reads it; the one reader goes through `bodyStateOf`. Read for every animal at every tick from tick 0 for 300 ticks, on the 160 m map and on the field map with the Track E mechanisms on, the world's hash and JSON are those of a world that was never read. In the running app the exact hash of the paused world is the same before and after eight seconds of frames (7e8ce12f:4250303 at tick 1,480, the builder's own figure). The reader costs 1.0 microsecond per animal per read on the working base (0.05 ms a second for 49 animals).
- **Golden hashes, the field pin and the save shape:** `tests/sim-params.test.ts`, `tests/sim-track-e.test.ts` and `tests/persist-envelope.test.ts`, 27 of 27.
- **No new pass, target or texel; no per-frame allocation; no `Math.random`, no clock read** in the added lines. The masks were evaluated on the five mesh levels (grid 0.009 to 0.045 m): the belly and flank masks reach no arm vertex (the breath's chest mask touches 2% of the upper arm's), and the coat covers the same share of each bone at every level (chest 79 to 83%). One pair of coincident vertices with different normals exists, on the finest level only, at the front of the right shoulder where the coat mask is 0.38; with the coat on end nothing larger than a speck shows there (`review/r17-shoulders-coat1.png`). Elsewhere the lift cannot open the mesh.
- **The decision beat and the heard call.** The mood that raises or sleeks the coat follows acts that stage W6 draws with the simulation (a display, a charge, a flight, a call), so the coat is not two ticks ahead of the body. The idle layer reads the clip (chosen from the drawn act) and the drawn body's movement, never `chimp.action`, except for the test "is giving an alarm", an act drawn with the simulation. In the app at 1 min/s the idle glance was never set while a beat had the gaze on the field map (0 animal-frames in 60 s and in 90 s); on the small map it stayed set for 4 to 9 frames, between two pose evaluations of a distant animal, during which the beat's gaze is the one used.
- **Every clip has its row** in `IDLE_ALLOW` (46 of 46 in `poses.ts`).
- **The builder's numbers** repeat: 7.9 events per stationary animal-minute at 1 min/s (90 s), 3.1 at Real time (45 s), 10.0 on the small map at 1 min/s; no event on a moving, carried or dead body; no non-finite value; the action sheet after the repairs is the builder's to the pixel (0 of 2,700,000 differ, with the stage on and with `&w8=0`).

### 8.2 What was found and repaired

Three faults, each seen before it was touched.

1. **A yawn or a nod cut short snapped shut.** A decision beat, a heard call or the animal's own call ends an idle event at once, and the layer simply stopped drawing it. Measured in the harness (`review/cancel-builder-head.json`): cut at its peak, a yawn moved the jaw 0.30 rad, the mouth from 0.95 to 0 and the eyes from 0.9 to 0 in one 16 ms frame; a nod moved the head 0.30 rad and opened the eyes at once. Both stay under the pose's pop threshold (0.45 rad), so nothing blended them. A listener's hold, which copies the previous frame's pose, also froze the open jaw for its 1.5 s. Repaired in `creatures.ts` (`stepState` notes the cut, the pop guard starts its quarter-second blend, the hold starts a frame later) with a pure rule in `idle.ts` (`idleFace`). After (`review/cancel-fixed.json`): at most 0.04 rad of joint, 0.13 of mouth and 0.13 of lid in a frame. A scratch cut short already blended (its finger curl crosses the threshold). In the app at 1 min/s two of 38 yawns were cut short in 90 s.
2. **A full belly grew into the infant clinging to it** (`review/r05-ventral-infant.png`, `r09-carried-builder.png` and `-fixed.png`). An infant is placed on its carrier's skeleton, not on the drawn surface. With a full gut (belly channel 0.93) the mother's belly covered most of an infant carried on it, and at term (1.46) nearly all of it; a mother with her coat on end rose around the infant on her back. A fed mother is the ordinary case: the belly channel's 90th percentile is +0.57. Repaired in `bodystate.ts` (`bellyUnder`, `coatUnder`, `RIDER_COAT`) and `creatures.ts` (`Anim.bears`): with an infant, or a dead infant, on the belly the belly is drawn no rounder than built; under a rider the coat stands no higher than 0.3. In the app at 1 min/s, of 11,645 animal-frames with an infant on the belly 104 had a belly still rounded (the easing as the infant gets on); at Real time 0 of 6,390. A pregnancy does not show while an infant is carried on the belly.
3. **The panel's portrait showed a raised coat twice as high** (`review/r16-portrait-builder.png` and `-fixed.png`). A raised coat is drawn up to twice as high on an animal small on screen, and the portrait is drawn from the same per-animal row, so a portrait asked for from the strategy view showed the doubled coat from an arm's length: the crown a pale dome, a ragged ruff at the neck. 9,335 of the portrait's 30,976 pixels differed from the same portrait asked for from the close view. The row's coat value is now the ungained one for the portrait's own draw (it comes after the main frame; the next frame writes the row again). After: 1,702 pixels, which is what two calm portraits taken from the two views differ by (1,604 to 1,811).

One repair was tried and taken out: keeping the coat off the inside of the arms (to cure the sliver below) left a step under a raised arm and a pale band at the shoulder, worse than the fault.

### 8.3 What the reader saw elsewhere

- **A real display** (`review/r14-app-display-akiwe.png` and `.txt`; the app's field world, tick 573, Watch 4x): the alpha male Akiwe on the ground. His coat value goes from 0 to 1 within the tick of the display (the swagger clip, a branch in his hand), stays at 0.6 for the next tick while he walks on with the aggressive mood still published, and is back at 0 three seconds after the mood ends. In the picture his back and shoulders are a hump at the display and are not before or after.
- **A real submission** (`review/r15-app-submit-nabiru.txt`; tick 2,095): the female Nabiru, charged in a crown. Her coat value goes to -1 within a second and a half of the fearful mood and returns when it ends; from the tick of the lost conflict her scratch rate reads 3.5 times the baseline (3.8 with her stress). She is behind a trunk in the film: the numbers show it, the picture does not.
- **Night** (`review/r10-night.png`, 23:30): 41 animals asleep and 8 carried; no idle event in twelve seconds; every body breathes (depth 1.6).
- **Rain** (`review/r11-rain.png`) and **dusk on the working base** (`review/r12-dusk-working-base.png`, 17:30): lids at 0.23 to 0.48 (median 0.36), nods and yawns among the perched; a male resting on his back with a round belly (+0.67) scratches it. Nothing broken.
- **Every age** (`review/r02-ages-coat-belly.png`): the coat, the belly at term and the tucked belly on all ten animals of the stages row, infants included, from the front and from behind. Infants take the same lift in proportion.
- **A perched animal** scratching its flank, its thigh and its head, yawning and shifting (`review/r13-perched-events.png`): all read; the hands keep the branch.
- **The scratches close up** (`review/r06-scratch-seated.png`): flank and thigh read as a hand at work; over the crown the hand lies across the head.

### 8.4 Left open by the review

- **A pale sliver at the armpit of a raised arm when the coat is on end** (`review/r04-armpit-outline.png`, the display from 1.5 m): the arm's lifted surface meets the trunk's and one triangle stretches. It is there with the stage switched off too, since a display's own coat value cannot be switched off. Small, and only close up.
- **A scratch of the head shows the stretched skin of the armpit** close up (`review/r08-axilla-head-scratch.png`). The rig's, as in every raised-arm pose; the scratch now shows it on resting animals.
- **The portrait is a picture of the live body**, so it can catch a yawn or a hand over the crown, as it could already catch a blink or a call.
- **On the small map coats are up more often than the builder measured on the field map.** Simulation only, three days of seed 48 (`review/coatshare.txt`): the coat channel is above 0.05 in 3.5% of waking animal-time on the 160 m map against 1.1% on the field map, and nine tenths of it there comes from public stress above 0.3 alone (it is above 0.3 in 5.4% of animal-time there, 0.9% on the field map), on animals that groom, rest and feed. In a late-morning window of day 1 with several charges it was 14% of animal-frames, 11% from stress alone (`coatwhy.mjs`). Most of those values are small (above 0.3, a lift of 1.5 cm, in 1.5% of waking time). Whether stress should raise the coat at all is the user's (decision 7 below).
- **A balding male's crown** rises as a pale dome at a coat value of 1 (the portraits above): the crown's lift is reduced by baldness, not removed.
- **A listener's hold** still freezes the trunk's bend toward a scratch and a lean for its 1.5 s.
- **Not run by the reader either:** the whole test suite, the build, the browser end-to-end check, the GPU probe (off limits tonight). Run: the 28 render test files, the three simulation and save tests above, `tests/simulation.test.ts`, `tests/em-observe.test.ts` and the two panel tests (28 of 28), the type check, and both new test files type-checked by hand.
- **Nothing was seen with a model**, as before.

## For the integrator

### Status line for `IMPLEMENTATION_PLAN.md` (a new block after "Stage W6")

> ## Stage W8: the state on the body, and idle life (render and interface only)
> **Goal**: two body issues and one motion issue of the 10 October review: raised hair could not be seen, the state that drives decisions did not reach the body, and every stationary animal was a statue.
> **Status**: Built on branch `w8b-state-on-body` (12 October 2026; `docs/staging/w8b-state-on-body.md`), a rebuild on the merged head of a stage that was cut off; reviewed by a second reader the same day, who repaired three faults (a yawn cut short snapped shut; a full belly grew into the infant on it; the panel's portrait showed a raised coat twice as high). Nothing under `src/sim` and no stored contract field changed; one read-only reader was added to the public API (`bodyStateOf`, the Track E body state as the contract's `BodyPercept`); the golden hashes and the field pin did not move. A coat on end now lifts the back, shoulders, upper arms and crown by up to 5 cm and follows a continuous arousal value; a frightened animal's coat lies sleek. In the harness a standing male's figure grows 11.0% with an aggressive mood and 18.3% at the display's coat value (6.0% before, as a uniform swelling), and from the strategy view of the real scene 304 pixels around him change against 123. The belly follows gut fill (or public hunger) and pregnancy, the upper lid and yawns follow felt sleepiness, scratching follows arousal and is raised for ten simulated minutes after a lost conflict. Every living animal breathes at its own rate, and stationary animals scratch, yawn, shift their weight and glance at a neighbour on a per-animal schedule: 3.5 events per stationary animal-minute at Real time and Watch 4×, 7.6 at 1 min/s, none above 2 min/s, none during a decision beat or while a call is listened to. Open: frame time is the integrator's to measure; nothing was seen with a model; on the default app world lids never droop and a raised coat outside a display is rare (the sleepy animal was seen on the working base only); the raised coat reads as bigger, not as bristling; no scratch on all fours; on the small map coats are up in 3.5% of waking animal-time (1.1% on the field map), mostly from public stress; a pale sliver at the armpit of a raised arm with the coat on end; found and not repaired: a perched animal's heading depends on the frame time.

### Lines for `AGENTS.md`

Gotchas, after the line on the decision beat:

> - The state on the body (stage W8, `render/creatures/bodystate.ts`): the creature layer reads each animal's state about once a second into `Anim.tg` and eases it into `Anim.ch`; it never opens `chimp.sim`. Public fields give the channels on the default world (belly from 1 − hunger, lid from 1 − energy, coat from stress above 0.3 and the mood); where a Track E mechanism runs, `bodyStateOf(world, chimp)` in `src/simulation.ts` gives the `BodyPercept` (gut fill, reserves, sleepiness, the two arousal states) and those are used instead. The reader stores nothing and allocates its record: call it about once a second per animal, never per frame. On the default world lids never droop (energy stays above 0.8). An infant is placed on its carrier's skeleton, not on the drawn surface, so anything that swells a carrier must give way under it: `Anim.bears` says what rides on an animal this frame (bit 1 on the belly, bit 2 on the back), and `bellyUnder` and `coatUnder` hold the belly and the coat down there. Every mapping is a stylization.
> - Creature shader parameters (stage W8): `P2.x` is a signed coat value (−1 sleek .. 1 on end, up to 2 for an animal small on screen), `P5.z` the upper lid, and texel 130 (`P6`) belly, flank and breath. `ROW_TEXELS` is still 132; free are `P5.w`, `P6.w` and texel 131. The coat, belly and breath are in `SKIN_VERTEX`, which the colour, shell, shadow and silhouette passes share: a displacement added elsewhere will not cast a shadow. `tests/render-bodystate.test.ts` holds this. The gain for a small animal is written per animal from the main camera's view (`writeParams`); the panel's portrait reads the same row, so `portrait()` writes the ungained coat for its own draw (`coatNear`): anything else scaled by on-screen size needs the same.
> - Idle life (stage W8, `render/creatures/secondary.ts` `idleStep`, `render/creatures/idle.ts`): one-shot scratches, yawns, weight shifts, glances and nods over stationary clips, hash-scheduled per animal; breathing on every living animal. `creatures.ts` `IDLE_ALLOW` says which clip permits which event: a new stationary clip needs a row there (a clip it does not know gets yawn and glance, or everything if its name begins with rest, sit or perch). The layer reads the posture from the pose (`intention.ts` `postureOf`), so a clip that changes posture needs no entry in `idle.ts`. No event starts or goes on while the body moves, during a decision beat, while an initiator waits, while a call is listened to or above 2 min/s. The idle glance is the lowest gaze: it only takes the place of the aimless idle scan. A new gaze source goes in front of it. Scratches are drawn on seated and lying bodies only (the arm's elbow pole stands the elbow over the back otherwise). An event that is ended early must not drop out of the pose: a yawn or a nod cut short sets `idleCut`, and `evaluatePose` starts the pop guard's blend on it (`idle.ts` `idleFace` says how much of the event is in the pose); a new event kind that moves the head or the face by more than a few hundredths of a radian belongs in `idleFace`.
> - Creature harness: `&idle=0` switches idle life and breathing off (use it for any picture that must compare frame for frame), `&w8=0` every channel of stage W8 as well. `layer.debug.channels` holds drawn values (`coat`, `belly`, `flank`, `lid`; `only: <id>` for one animal), `debug.idleForce` holds an idle event, `debug.body` stands in for the reader.

Verifying a change, after the fruit and calls line:

> - State on the body and idle life (stage W8): `node cap.mjs --label before|after <job,…>` in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w8b-state-on-body/probes/` (a no-model server on 5186; jobs `tiles stance display belly sleepy idle perch breath scan rest tree small strat dusk perf`), `tables.py` prints the numbers; `census.mjs <name> <rt|watch|1x|10x> <seconds> <fromTick>` counts idle events in the running app and the frames in which one runs where it must not; `channels.ts` prints the channels by hour on the default world and on the working base (simulation only).

Open issues, the viewer line: add

> a perched animal's heading depends on the frame time (`updateMotion` and `placeGrounded` pull it two ways by steps of different length: 1.5 to 3.4 rad of travel in six seconds when a twentieth of the frames take 33 ms, `docs/staging/w8b-state-on-body.md` section 4.7).

### Lines for `docs/visual-plan.md`

Item A8 (attention): "Stage W8 added the idle glance at a neighbour, below every other gaze: it replaces the aimless idle scan for 1.2 to 2.6 s."

Section 5, a new row: "Stage W8: the body shows state (coat on end or sleek from arousal and fear, belly and flanks from gut fill, reserves and pregnancy, a lowered lid, slow blinks and yawns from sleepiness) and stationary animals breathe, scratch, yawn, shift and glance. All stylizations (`docs/staging/w8b-state-on-body.md`)."

### Parameter rows for `docs/simulation.md` section 17

None: no simulation parameter was added. One line for its API section, if the integrator keeps the reader: "`bodyStateOf(world, chimp)`: read-only, the Track E body state of a living animal as a `BodyPercept`, null when no Track E mechanism runs; for the renderer and the interface."

### Merge notes

- **Stage W9 (tree postures), being rebuilt in parallel, edits the same files.** Expect conflicts in `src/render/creatures.ts` (this branch adds fields to `Anim` and to the `debug` object, one call in `evaluatePose` between the patrol tension and the face rig, a block after `plantContacts`, a block in `updateAttention` just before `goalOf`, a block of functions before `writeParams`, lines in `writeParams` and one line in `update`; from the review: the argument of the `heardHold` call and the pop guard's line in `evaluatePose`, the two lines of `update` that reset and set what each animal carries, and three lines in `portrait()`) and possibly in `src/render/creatures/harness.ts` (two lines after the `groomee` flag). `src/render/creatures/poses.ts`: this branch only removes the sine scratch from the seated variant of `rest` (five lines, replaced by a comment); nothing was added to that file.
- **If W9 adds clips:** give each a row in `IDLE_ALLOW` (`creatures.ts`). A clip that holds on with a hand below 0.9 body lengths is not seen as "busy" by `armBusy`: a scratch would take that hand off its hold. A new lying posture must still read as lying to `intention.ts` `postureOf`.
- **If W9 changes how a perched body is placed**, look at the heading: the wobble of section 4.7 lives in the two lines that set `a.heading` in `updateMotion` and `placeGrounded`.
- **`docs/research.md`** has a new section at its end, "Addendum: W8 state on the body and idle life". It adds no source. Other stages append there too: keep both.
- **The partial work** (5ee2096 on `w8-state-on-body`) is superseded by this branch; section 3 says what was taken. That branch and its worktree can go.
- **Run after the merge:** `pnpm test`, `pnpm build`, the frame-time comparison (the close view by day with a party at rest, and the strategy view: the vertex code of every creature pass grew), and one look in the app at a display, a fight and a resting party at Real time and at 1 min/s.
- **The app's save store did not load in this worktree's pages** (the SQLite module is served as a page through the linked `node_modules`: "expected magic word 00 61 73 6d" in the console). It was so before this stage's first change and every capture here uses unsaved scratch worlds; I did not look into it.
- **Servers:** the dev server on 5186 was started and stopped several times (the worktree, and in turn an export of the base commit in the session's scratch folder for the before pictures of retaken framings). None is running.

### Decisions that are the user's

1. **A reader in place of a stored contract field** (section 2). Keep `bodyStateOf`, or have the simulation store `chimp.body`?
2. **Sleek when afraid.** The brief asked for it; no source in the project settles whether a frightened chimpanzee's hair lies flat or stands. Keep?
3. **How busy idle life is** (section 4.8): about one event per stationary animal every 17 s at Real time, of which a quarter are scratches. Calmer, as it is, or busier?
4. **The far gain:** a raised coat is drawn up to twice as high on a small animal so that it shows from the strategy view. Keep?
5. **The default world shows no sleepiness.** Leave it to the Track E worlds, or give the default world a stand-in (the hour, the light)? That would be a state the simulation does not hold.
6. **How large:** the coat at 5 cm, the belly at 6.5 cm, a breath at 6 to 8 mm (all before the 1.5 times at which animals are drawn).
7. **Should public stress raise the coat?** (from the review, section 8.4.) On the default worlds the coat's continuous value is public stress above 0.3. On the field map that is rare; on the 160 m map it lifts the coats of grooming, resting and feeding animals in 3% of waking time, and of one animal in nine in a busy hour. Keep it, raise the threshold, or leave the coat to the mood and the display?
8. **The crown.** The brief named it; at a coat value of 1 it reads as a taller head, and as a pale dome on a balding male. Keep the crown in, or lower it from one half?
