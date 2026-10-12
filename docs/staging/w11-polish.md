# Stage W11: viewer polish

Branch `w11-polish`, cut from `integrate-t2` at 9be7d44 (stages W6 to W10 merged). Started 12 October 2026, 04:36 EDT. Renderer only: nothing under `src/sim`, `data/` or `tests/fixtures` changes, drawing writes nothing to the World, and no render pass, render target or material is added.

Where the stage comes from: an independent check of the merged viewer (12 October 2026; its notes are the last result of the merge workflow's journal, its scripts and pictures are in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/merged-t2b/check/`). It listed eight things a person will notice. This stage fixes them.

Pictures, readouts and scripts of this stage: `/Volumes/Drive/chimpbench/shots/watch-2026-10-12/w11-polish/` (`before/`, `after/`, `probes/`, `tiles/`).

## 0. Registration (committed before any changed code ran)

Sections 0.1 to 0.3 were written and committed after the measurements on the unchanged build and before the first run of changed code. Everything after section 0 was written afterwards.

### 0.1 How things are measured

- **Two builds, one world.** "Before" is an export of commit 9be7d44; "after" is this branch. One model-free dev server at a time, on port 5197, with a private dependency cache (`serve.sh`). The app is opened on the field map, seed 48, with the model policy off from the first frame (`probes/lib.mjs`, the check's own), so both builds hold the same rules-driven world. Each script prints the world's hash at the tick it starts from; a before and an after reading are compared only when those hashes are equal.
- **Speeds.** Real time (1 simulated second a second) and Watch 4x (4 a second). At 1 min/s a walk already moves a body more than a metre a frame, so a limit on movement per frame is read at Real time and Watch 4x only.
- **A step of the placement alone.** For one animal in one frame: the distance its drawn body moved, less the distance its own drawn path moved in that frame. The drawn path is the simulated path as played back; what is left is what the renderer's placement did by itself (a seat, the blend between a branch and the trunk).
- At most three iterations of changed code against these statements. Every iteration is reported, whichever way it reads.

### 0.2 Measured on the unchanged build (12 October 2026, 04:53 to 05:23 EDT)

| Item | Probe (in `probes/`) | Reading on the unchanged build |
| --- | --- | --- |
| 1. A jump across a crown | `pairwatch.mjs` on the pair of animals 28 and 26 from tick 1585, Watch 4x, 26 s | Animal 28 moved 7.82 m in one frame at tick 1587 (its pairing ended and its own limb was more than 6 m away). Animal 26 moved 0.77 m in one frame as it went to the trunk. |
| 1. | `steps.mjs`: every animal within 80 m of the camera, every frame, Watch 4x, 75 s | From tick 1575 around animal 28: four placement steps over 50 cm (7.82, 0.62, 0.78 and 0.63 m), 22 over 25 cm. From tick 1130 around animal 35: none over 50 cm, largest 0.37 m. |
| 2. Drawn resting while the tag says grooming | `pairwatch.mjs` and `pairstat.py` on three partings (animals 35 and 30 from tick 1142; 12 and 17 from 2003; 28 and 26 from 1585), Watch 4x | In two of the three partings each animal of the pair spent 3.9 s (one tick) with its drawn act still grooming and its partner still at its seat, drawn in a resting or nursing pose; for the one that stays the tag read plain "grooming" all that time. In the third 0.17 s. |
| 2. (not the renderer's) | the same | After the partner's body has left, the simulation keeps the one that stays in its grooming act for two or three more ticks (it measures the pair's distance in the plane, and the partner is going down the trunk): 15.0 s and 18.7 s with the drawn act grooming and nobody to groom. |
| 3. A scratch cut short | `cut.mjs` and `cutstat.py`: a scratch held on by the harness hook, cut by a long call (animal 1 on the ground, tick 1373; animal 24 in a crown, tick 562) and by a new act (animal 27, tick 246), Watch 4x | The wrist travels 55 to 58 cm back; its largest step in one frame is 11.3 to 12.0 cm (11.8 to 16.7 cm when scaled to a frame of one sixtieth of a second); the reach is under 3% after 0.23 to 0.26 s. |
| 4. A lone animal is busier | `idlecensus.mjs`: all 49 animals for 90 s at Real time from tick 1100 | Weight shifts per animal-minute: 2.91 for an animal feeding alone in a crown (48 in 990 animal-seconds) against 1.48 for one feeding in a crown with a neighbour within 9 m (17 in 691). Other stationary clips, all events but glances: 2.48 alone against 2.13 in company. |
| 4. | `hidle.mjs`, the creature harness, one animal alone in a crown, 120 s | Feeding: 7 weight shifts at Real time, 17 at 1 min/s. Resting: 7 events at Real time. |
| 5. A nest builder's heading | `nestturn.mjs` on animal 16 from tick 2833, Watch 4x, 80 s, with every third frame made 35 ms longer in the page (`JITTER=1`) | The heading travels 97.7 rad with 2,040 reversals; the turns between the five headings come out at 0.99, 1.00, 0.99 rad and one of 2.29 rad the other way, where the code asks for four of 1.9 rad. |
| 5. | the same on animal 16 asleep, tick 3020, Real time, 10 s | 9.4 rad of travel, 152 reversals, largest single step 0.14 rad. |
| 6. No nest under a sleeper | `nestshot.mjs`: the clock jumped to four ticks before, then played; animals 16 (tick 3020) and 14 (tick 3100) | The nest is drawn at full size, but 4.79 m above the body of animal 16 and 2.07 m below that of animal 14. Cause, found here: a nest's place is worked out once, when the nest is first listed. If its tree is then outside the forest the environment draws round the camera, the place is found without the crown, and it is never worked out again; the body's place is worked out every frame. So the fault is not the clock jump: it is there for any nest first listed while the camera was elsewhere. |
| 7. The bough and the leaf cluster | `film.mjs` pictures (`bough-chain-10-7-13`, `bough-pair-35-30`, `bough-lying-27`, `feed-infant-44`, `feed-infant-12`), `hsheet.mjs` harness sheets (`harness/boughs.png`, `harness/crown-feed.png`) | The bough is one level six-sided log of constant thickness, near black in the app (its material is a dark brown; the tree's limbs are drawn mossy green), ending in the air at both ends. The cluster is a 20-faced block 26 by 16 by 20 cm in body lengths of 1 m, drawn at 1.5 times that on an adult, held in front of the chest. |
| 8. The hand meets the cheek | `feedmouth.mjs` and `feedstat.py` on animal 3 from tick 900, Real time, 60 s | 12 picks. The picking hand's finger joint comes within 7.4 to 9.6 cm of the lower lip's joint in nine of them and 10.8, 13.3 and 13.9 cm in the three where the head was turned 0.52 rad from the chest by the look system. |

World hashes at the starting ticks are in each probe's JSON file.

### 0.3 Fixed settings and the statements to be read

All of the following are drawing rules (stylizations); none has a source in `docs/research.md`. No simulation parameter is added, so there is no switch to default to off.

**1. Long moves in a crown.**
- The rule "a seat more than 6 m away is drawn at once" goes. A place more than 14 m from the drawn body is still drawn at once (a safety bound: wider than a crown, so a stale place cannot carry a body across the map). The other draw-at-once cases stay as they are: a relocation, a first frame in a crown, the frame in which the forest window gives or takes the tree's limbs, and everything above 2 min/s.
- The drawn body of an animal in a tree moves toward its place by at most 2.5 m a second of real time, plus whatever its own drawn path moved in that frame. Above Watch 4x the figure grows with the playback rate (2.5 m/s times the rate over 4), so a move takes the same simulated time at 1 min/s as at Watch 4x.
- While the body is more than 1.0 m from its place it is drawn in a new clip, `clamber`: on all fours with hands and feet gripping, the walking gait's cycle advanced by the distance moved, the body turned along its line of travel and pitched with it by up to 0.9 rad. The clip ends within 0.3 m of the place. Shorter moves slide in the seated pose as before.
- While an animal in a stationary act clambers to its seat, its tag reads "going to" with the act's verb (the wording stage W6 already uses for a body that has set off and is not there yet).

Statements:
- S1a. `pairwatch.mjs`, animals 28 and 26 from tick 1585, Watch 4x: no step of the placement alone over 0.5 m for either animal (before: 7.82 m and 0.77 m).
- S1b. `steps.mjs` from ticks 1575 and 1130, Watch 4x, 75 s each: no step of the placement alone over 0.5 m for any animal within 80 m (before: 4 and 0).
- S1c. In the S1a film animal 28 is drawn in the clamber clip for part of its way (more than 0.5 s).

**2. Pairs follow the drawn bodies.**
- Whether two animals are within reach of each other for a paired pose (4.5 m in the plane, 1.5 m in height) is read from their two drawn paths, not from their simulated positions. An animal on its trunk is not paired.

Statements:
- S2a. In the three partings of section 0.2, the time an animal's drawn act is grooming, its partner is still at its seat and it is not drawn in a grooming pose is under 0.3 s for every animal (before: 3.9 s for four animals, 0.17 s for one).
- S2b. Reported, not a pass mark: the time one that stays is left with a grooming act and nobody to groom after its partner's body has gone. That is the simulation's state and this stage cannot change it.

**3. A scratch cut short lets go like one that ends.**
- From the reach it had, the reach falls along the curve a finished scratch ends on, over 0.5 s (0.25 s for a body that has started to move). The body's part of the scratch (head, trunk, raking fingers) follows the same reach.

Statements:
- S3a. The three cuts of section 0.2: the wrist's largest step in one frame, scaled to a frame of one sixtieth of a second, is 4 cm or less (before: 11.8 to 16.7 cm), and the reach is gone in 0.4 to 0.6 s (before: 0.23 to 0.26 s).
- S3b. A unit test holds the curve: it starts with no speed, never rises, and is 0 at the end.

**4. A lone animal.**
- A glance with nobody to glance at uses up its turn: the schedule waits as long as the glance would have lasted and then the ordinary gap. Nothing else about the schedule changes (the gap, the shares and the lengths are the user's to decide).

Statements:
- S4a. A unit test: one animal's schedule has the same events at the same moments with and without a neighbour, less the glances.
- S4b. `idlecensus.mjs` (90 s, Real time, tick 1100): weight shifts per animal-minute of an animal feeding alone in a crown are no more than 1.3 times those of one feeding in company (before: 1.97 times).
- S4c. `hidle.mjs`, feeding alone in a crown for 120 s at Real time: 4 weight shifts or fewer (before: 7).

**5. One turn for the nest.**
- An animal whose drawn body is in the nest act in a tree faces one heading, set in `layoutCrowns` and used by both the motion step and the placement: the bearing of its place from the trunk, its own offset, and while it builds one of five headings 1.9 rad apart.

Statements:
- S5a. `nestturn.mjs` with `JITTER=1` on the builder: each turn between successive headings is 1.9 rad, within 0.1, taken the same way round (before: 0.99, 1.00, 0.99, -2.29), and the heading's travel over the 80 s is under 12 rad (before: 97.7).
- S5b. The same on the sleeper for 10 s: travel under 0.1 rad (before: 9.4).

**6. The nest under the sleeper.**
- Each listed nest keeps its simulated place, and its drawn place is worked out again whenever the nest list is redrawn (twice a second), so it follows the forest window as the body does.

Statements:
- S6a. `nestshot.mjs` for animals 16 and 14: the nest nearest the body is within 0.3 m of it in height and in the plane (before: 4.79 m above and 2.07 m below).
- S6b. A unit test: a nest listed while its tree has no crown anchor moves to the anchored place once the anchor exists.

**7. The bough and the cluster.**
- The bough is drawn from the existing branch prop as two tapered halves that fork at the host's seat (the tip 0.6 of the base, the top of each half level with the seat) and, where the fork does not already lie in a limb the environment draws, a tapered stem from the nearest such limb, or from the bark when the tree has none in reach. Its colour comes from the tree (a new optional hook of the creature layer's context: the environment gives its bark's look, the harness its trunk's colour). The single stick drawn under a perched animal in a tree with no drawn limbs runs from the bark, thick end at the trunk.
- The cluster is a spray: a twig with five leaf blades, about 16 by 10 by 12 cm for a body length of 1 m. A feeding animal with an infant on its belly holds it out to the side of the infant.

Statements:
- S7a. Pictures of the same five moments and the two harness sheets, before and after.
- S7b. Read from the layer's probe in the three bough films: every bough drawn has its fork in a drawn limb or a stem that begins on a drawn limb or on the bark.
- S7c. A unit test: with an infant on the belly the hand that holds the cluster is further from the infant than without one; the before and after distances are reported.

**8. The head is held while a hand is at the mouth.**
- The crown feeding clip asks for the head (a negative look weight that follows the hand's way to the mouth and back), and the layer scales the look system's weight down by it.

Statements:
- S8a. `feedmouth.mjs` on animal 3: at every pick the finger joint comes within 10 cm of the lip joint (before: 3 of 12 further).
- S8b. A unit test: with a look target far to one side at full weight the fingers stay within 0.06 body lengths of the lip.

**Unchanged pictures.** `scripts/groom-shots.mjs tiles` against the before sheet: tiles are expected to differ only where this stage changes what is drawn (the nest tile, tiles that show the branch prop or the leaf spray). `scripts/groom-shots.mjs cases`: 11 of 11.

## 1. What a viewer sees now

1. **Nobody jumps across a crown.** An animal whose place in a tree changes (its partner leaves, it joins a partner, it goes to the trunk to come down, it arrives up the trunk) goes there at a clamber, 2.5 m a second at Real time and Watch 4x. More than a metre from the place it is bound for it is drawn on all fours with hands and feet gripping, turned and pitched along its way; nearer than that it slides in its seated pose as before. An animal clambering to a partner's bough is tagged "going to groom" until it sits.
2. **A pair stays a pair until a body leaves.** Two animals grooming in a crown are drawn grooming until the leaving one's drawn body sets off, not one or two ticks before.
3. **A scratch that is interrupted lets go.** The arm comes away over half a second along the same curve a finished scratch ends on, and the head and fingers come back with it.
4. **An animal alone is no busier than one in a party.** A glance that finds nobody to glance at uses up its turn in the schedule. An animal feeding alone in a crown now shifts its weight about as often as one with a neighbour.
5. **An animal in its nest sits still, and a builder turns as asked.** Five headings, 1.9 rad apart, and no trembling when frame times are uneven.
6. **The nest is under the sleeper wherever the camera was when the nest was first listed.**
7. **The bough reads as a limb of its tree.** It forks at its host's seat into two tapering halves, has the colour of the tree's own limbs, and is joined to the nearest drawn limb or to the bark by a stem. The cluster a feeding animal holds is a small leafy spray, and a mother with an infant on her belly holds it out to the side.
8. **The feeding hand meets the mouth.** The head is held for the moment a hand is at the mouth.

Also changed, found by the probes on the way (section 4): the last 0.3 m of a climb down a trunk, and the first of a climb up, are no longer dropped or risen in one frame.

## 2. What was changed

Everything is in the renderer. `git diff 9be7d44 --stat -- src/sim data tests/fixtures src/types.ts src/simulation.ts` prints nothing.

| Item | Where | The rule |
| --- | --- | --- |
| 1 | `src/render/creatures/perch.ts` (`crownStep`, `clamberSpeed`, `clambering`), `src/render/creatures.ts` (`placeGrounded`, `chooseClip`, `layoutCrowns`, `evaluatePose`), `src/render/creatures/poses.ts` (clip `clamber`) | The drawn body of an animal in a tree moves toward its place by at most 2.5 m a second of real time (times the playback rate over 4 above Watch 4x) plus what its own drawn path moved in the frame. More than 1.0 m from the place it is bound for (its seat or nest, or the bark while its path goes up or down) it is drawn in the `clamber` clip until it is within 0.3 m. The rule "more than 6 m away: drawn at once" is gone; a place more than 14 m away is still drawn at once, as are the four cases that were there before. |
| 1 | `creatures.ts` (`Anim.tagWay`, `drawnAct`) | The tags and the interface are told "going to" for a body clambering to a seat on another animal's bough. The body's own reading (`Anim.way`) is not touched. |
| 2 | `perch.ts` (`pairReach`), `creatures.ts` (`pairingFor`, `groomsThird`) | Reach for a paired pose is read from the two drawn paths. No pairing with a body on its trunk, or with one whose drawn act is a trip and whose path is moving. |
| 3 | `src/render/creatures/idle.ts` (`scratchRelease`, `idleOverlay`), `creatures.ts` (`stepIdle`, the arm's own record `Anim.scr*`) | A scratch the schedule drops lets go from the reach it had over 0.5 s (0.25 s on a body that has started to move) along the smooth step a finished scratch ends on. The body's part of the scratch follows the same reach. |
| 4 | `src/render/creatures/secondary.ts` (`idleSpend`), `creatures.ts` (`stepIdle`) | A glance with no neighbour within 9 m waits as long as it would have lasted and then the ordinary gap. |
| 5 | `perch.ts` (`nestTurn`), `creatures.ts` (`layoutCrowns`, `placeGrounded`) | An animal whose drawn body is in the nest act in a tree gets one heading target, used by both the motion step and the placement. |
| 6 | `src/render/creatures/nests.ts` (`place`) | Every listed nest keeps its simulated place and has its drawn place found again when the list is redrawn, twice a second. |
| 7 | `src/render/creatures/props.ts` (`limb`, `leafSprayGeometry`), `creatures.ts` (`emitProps`), `perch.ts` (`boughStem`), `src/render/env/vegetation.ts` and `src/scene.ts` (the hooks `limbNear` and `barkColor`), `poses.ts` (`PoseCtx.bears`, `FEED_HOLD_INFANT`), `src/render/creatures/harness.ts` (`barkColor`, `&action=forage&infant=`) | The branch prop's geometry is a tapered limb (tip 0.6 of the base) placed from point to point and coloured per instance. A bough is two halves from the fork at the host's seat and a stem from the nearest drawn limb within 3 m, else from the bark. The same mesh, the same material (its colour is now white and the instance carries the colour), no new mesh. The leaf block's geometry is a twig with five two-sided blades. |
| 8 | `secondary.ts` (`headLook`), `poses.ts` (`crownFeed`), `creatures.ts` (`evaluatePose`) | The feeding clip writes a negative look weight that follows the hand to the mouth and back; the layer scales the look system's weight down by it. |

Two optional functions were added to the creature layer's context (`limbNear`, `barkColor`). They read the forest the environment has already built; nothing is added to it and no draw is taken from its random streams.

## 3. Measured before and after

Before: the export of 9be7d44, 04:53 to 05:23 and 06:52 to 06:55 EDT. After: commit 546113e, the third and last run, 06:24 to 06:57 EDT (folder `after/`). The world hash at the starting tick is the same before and after for every probe. A world played and drawn for 24 ticks at 1 min/s through one of the partings has the same hash as the same world stepped there without drawing (`after/played.json`).

| Statement | Before | After | Reading |
| --- | --- | --- | --- |
| S1a. Largest step of the placement alone, animals 28 and 26, tick 1585, Watch 4x | 7.82 m and 0.77 m | 0.049 m and 0.052 m | holds |
| S1b. Steps of the placement alone over 0.5 m, every animal within 80 m, 75 s at Watch 4x, from ticks 1575 and 1130 | 4 and 0 (largest 7.82 m and 0.37 m; 22 and 4 steps over 25 cm) | 0 and 0 (largest 0.053 m and 0.103 m; none over 25 cm) | holds |
| S1c. Animal 28 drawn clambering on its way to the trunk | 0 s | 1.63 s | holds |
| (added) A joiner: animal 26 arrives up the trunk and its partner sits 8.9 m away, tick 1187 | carried there by the blend with the trunk in well under a second: 0.42 m in its largest frame, 11 frames over 25 cm | clambers 8.5 m in 3.3 s, largest frame 0.05 to 0.08 m (two runs), tagged "going to groom" for 3.2 of those 3.3 s | not registered |
| S2a. Drawn act grooming, partner still at its seat, no grooming pose | 3.9 s for four animals, 0.17 s for one | 0.00 s for all seven | holds |
| S2b. Left grooming nobody after the partner's body has gone (the simulation's act) | 15.0 s and 18.7 s | 15.0 s and 18.7 s | reported; see section 6 |
| S3a. A scratch cut short: the wrist's largest step, scaled to a sixtieth of a second; time until the reach is gone | 16.7, 11.8 and 15.9 cm; 0.23 to 0.26 s | 4.6, 3.0 and 3.4 cm; 0.42 to 0.45 s | holds for two cuts; the third reads 4.6 cm against the 4 cm registered (first run: 3.5, 3.1, 4.0). In that film one sample of the probe spans two drawn frames (the reach goes from 0.695 to 0.600 in it, two steps of the curve); by the curve the largest step of a sixtieth of a second is 5% of the reach, 3.2 cm of that wrist's 64 cm. |
| S4b. Weight shifts per animal-minute, feeding in a crown, alone against in company (90 s, Real time) | 2.91 against 1.48 (1.97 times) | 1.09 against 1.56 (0.70 times) | holds |
| S4c. Harness, feeding alone in a crown, 120 s at Real time | 7 weight shifts (17 at 1 min/s) | 3 (9 at 1 min/s) | holds |
| S5a. The builder's four turns, every third frame 35 ms longer | 0.99 to 1.00 rad three times and 2.3 rad the other way (two runs) | 1.90, 1.90, 1.90, 1.90 rad | holds |
| S5a. The heading's travel over the 80 s | 97.7 and 98.3 rad (two runs) | 24.8 rad | does not hold as registered (under 12 rad). The 80 s also hold the animal's last seconds at its old seat, a clamber and a climb. By clip: while it builds 9.8 rad with 3 reversals (before: 75.6 rad, 1,723 reversals), which is the four turns and the turn onto the nest's first heading; asleep 1.3 rad, no reversal (before 13.2 rad, 342); at its old seat 6.4 rad (before 7.7); clambering 5.1 rad; on the trunk 2.3 rad with 82 reversals (before 1.9 rad, 88). |
| S5b. The sleeper's heading over 10 s | 9.4 rad, 152 reversals | 0 rad | holds |
| S6a. The nest nearest the sleeper, animals 16 and 14 | 4.79 m above and 2.07 m below the body | 0.17 m below in both, 0 m off in the plane (the body lies 0.12 of its size above the nest's floor) | holds |
| S7b. How each bough drawn in the films is joined | joined to nothing | three boughs, each with a stem that begins on the axis of a limb the environment draws | holds |
| S7c. The hand that holds the cluster, from the mother's mid-line (forward kinematics) | 0.11 body lengths, with or without an infant | 0.11 without, 0.30 with an infant on the belly | holds |
| S8a. Finger joint to lip joint at each pick, animal 3, 60 s | 12 picks, 7.4 to 13.9 cm, three over 10 cm (head turned 0.52 rad) | 12 picks, 7.4 to 7.5 cm (head within 0.02 rad of the chest) | holds |

Pictures (S7a), before and after under the same names: `bough-chain-10-7-13`, `bough-pair-35-30`, `bough-lying-27`, `feed-infant-44`, `feed-infant-12` (each a sheet and a `-full` frame), `harness/boughs.png`, `harness/crown-feed.png`, `harness/nest.png`; after only: `harness/feed-infant.png`, `leave-26-28.png` and `clamber-28.png` (the parting of item 1), `join-28-26.png`.

The tile sheet of `scripts/groom-shots.mjs`: 27 of 30 tiles are pixel-identical and no animal is in another clip. Three differ: the nest tile (the sleeper's heading, 0.003 rad), and the tiles `follow` and `transfer`, each a standing animal with nobody near, whose idle schedules stand elsewhere at the moment of the picture (`before/tileidle.json`, `after/tileidle.json`: four and eight turns taken by then before, two and one after). The grooming cases: 11 of 11.

## 4. The three runs

1. **First run** (the eight fix commits, 05:44 to 06:04). Every statement but S5a held. The builder was drawn clambering for 1,590 of 3,598 frames. It clambered the last metre to its nest place; the tag's "going to" had been written into the body's own reading, from which the nest's progress is worked out, so the nest read as not being built; its place was dropped, the animal was sent back to its limb, and it went to and fro between the two for the whole build. The fault was this stage's own. The films also showed a leaver drawn as a groomed receiver, then in the trunk's climbing cycle, for a third of a second before it clambered, and a guest going back to its own limb tagged "going to groom".
2. **Second run** (06:07 to 06:15, the probes those changes can move). Changed: the nest's progress is worked out before the clamber clip is returned; an animal that lies keeps its bough while it clambers to it; the tag has its own reading and only says "going to" for a body bound for another animal's bough; whether a body clambers is judged by its distance from the place it is bound for; a partner that has set off is told by its path. S5a's turns read 1.90 rad four times; S1 and S2 held. The largest step left was 0.30 m at every landing: the tree's placement and the ground's differ by the 0.3 m of height at which one hands over to the other.
3. **Third run** (06:24 to 06:57, everything). Changed: the ground placement keeps the height the drawn path still has, so that hand-over is continuous. This is the run of section 3.

## 5. Tests and checks

- New and extended tests: `tests/render-idle.test.ts` (an animal alone has the same events at the same moments as one in company, less the glances; a scratch cut short lets go with no speed at the cut, never rising, gone in half a second, and the body's part follows), `tests/render-perch.test.ts` (the head held at the mouth against a look point at full weight; the builder's five headings and why one target does not depend on the frame time; pairs by the drawn bodies; the clamber's step, speed and hysteresis; the bough's stem; the spray's size and the hand beside the infant), `tests/render-nests.test.ts` (new: a nest listed without a crown anchor follows the anchor).
- The checks run at the end are in section 7.

## 6. What is left

- **The one that stays is tagged grooming with nobody to groom.** After the leaver's body has gone, the simulation keeps the other animal in its grooming act for two or three ticks (15.0 s and 18.7 s at Watch 4x in the two partings filmed, a minute or more at Real time). It measures the pair's distance in the plane, and the partner is going down the trunk under it. The renderer draws that animal seated, which is what is there to draw; its tag says what the simulation says. Curing it is a change to the simulation (`src/sim/execution.ts` `pairTick`), outside this stage.
- **The clamber clip of a paired actor is restarted about three times a second.** Its pairing rewrites its role every frame, and the clip is returned with role 0 (the fault stage W5 found on receivers). The clip is driven by distance, not by its own clock, so nothing shows in the picture; the clip-change counter shows it (`after/join-28-26.json`). The cure is one line in `chooseClip` (return the pairing's role with the clip). It was found in the third run and is not made, since a fourth run is not allowed.
- **A move of under a metre is still a seated slide**, and the clamber has no branch under it: the body walks the straight line between two seats, through leaves or air, pitched by at most 0.9 rad.
- **On the trunk the heading still trembles a little** when frame times are uneven (2.3 rad of travel and 82 reversals in 141 frames, the same as before): the motion step and the placement pull two ways there as they did in the nest. Not one of the eight items; the cure is the same.
- **An animal alone has fewer idle events in all**, since it has nobody to glance at: 1.1 a minute against 3.6 for one feeding in company. Its head still looks about between events as before.
- **An animal whose two hands both hold on** (two of the five resting postures) cannot scratch; a scratch that is drawn for it is cancelled and its turn drawn again after 2 s, the same mechanism as item 4. Over an hour of schedule it has 26% more yawns, shifts and glances than one with a free hand and no scratches, the same number of events in all. Left as it is: it bears on how busy idle life is.
- **The bough's colour is matched by eye** to the limbs (the bark texture's mean colour, the tree's tint and 45% of the bark material's moss tint); a prop has none of the forest material's shading, so it is a little flatter than the limbs beside it. It is still not one of the environment's limbs: it does not fade with the keep-clear camera.
- **The spray is small.** At a 3 m orbit it reads as a twig with leaves; against foliage it is easy to miss.
- **Not measured:** frame time on the graphics card (the probe is off limits tonight) and main-thread cost. What was added per frame: a dozen multiplications for each animal in a tree, one search of a tree's limbs (seven or fewer segments) per bough drawn, one instance colour per branch prop; twice a second, one placement per listed nest (240 at most).
- **Not seen:** anything with a model; a second day or another seed; the small map; a clamber at 1 min/s (there it moves at 37.5 m a second of real time, so that it takes the simulated time it takes at Watch 4x); a lying animal clambering to its bough.

## 7. For the integrator

### Commits (on `w11-polish`, from 9be7d44)

| Commit | What |
| --- | --- |
| 282f7a6 | The registration (section 0), before any changed code ran |
| d81acae | Item 4: a glance with nobody to glance at uses up its turn |
| 604ae2f | Item 3: a scratch cut short lets go like one that ends |
| 90a9faf | Item 8: the head is held while a hand is at the mouth |
| 8f5ea29 | Item 6: a nest's drawn place is found again at every redraw |
| 7fc3cb8 | Item 5: one heading for an animal in its nest |
| ec9aa80 | Item 2: pairs from the drawn bodies |
| 32f8187 | Item 1: long moves in a crown are clambered |
| 592107b | Item 7: the bough as a limb of its tree, the leaf spray |
| 546113e | Items 1 and 2, second and third run: the faults the first run found, and the last 0.3 m of a climb |
| def1ff2 and the one after it | This document's sections 1 to 7, the plan block, four lines of `AGENTS.md` |

### Checks at the head

Run on this branch's final code, 12 October 2026, 06:58 to 07:07 EDT (the commits after 546113e change documents only):

- `pnpm exec tsc --noEmit`: clean. The three changed test files type-check under the same strict options with node's types added.
- `pnpm exec tsx scripts/gen-params.ts --check`: valid, 1,050 entries, up to date, lint clean.
- `pnpm test`, once: 1,411 tests, 1,410 pass, none fail, one skipped (it needs a validation file under `artifacts/` that is not in this worktree), 6 min 18 s. Nine of the tests are new. `tests/fixtures/golden-world.json` and `tests/sim-track-e.test.ts` are untouched.
- `pnpm build`: passes.
- `scripts/groom-shots.mjs`: the grooming cases 11 of 11; the tile sheet as in section 3.
- Not run: `scripts/verify-browser.mjs`, the graphics probe, anything with a model.

### Documents changed on this branch

- `IMPLEMENTATION_PLAN.md`: a block "Stage W11: viewer polish" after Stage W9. The blocks of stages W8 and W9 are left as they were; the new block says which of their open points it closes.
- `AGENTS.md`, only where a line had become untrue: "Idle life" (a turn that cannot be drawn is used up; a cut scratch lets go), "Seats in crowns" (the bough drawn as a limb; the clamber and its five draw-at-once cases in place of "more than 6 m away"; pairings from the drawn paths; the tag's own reading), "Postures and clips in a crown" (the head hold, the spray beside an infant, the nest's place and heading), and the open-issues line for the viewer (the floating log and the builder's heading are out; the tag over an animal left grooming nobody is in).
- No line was added to `docs/research.md`: the stage cites nothing. Every rule it adds is a drawing rule, labelled a stylization or a design assumption where it stands in the code.

### Merge notes

- `src/render/creatures.ts` carries most of it: new fields on `Anim` (`tagWay`, `scr*`, `gJoin`, `cx` to `qz`, `clamber*`), `pairingFor`, `groomsThird`, `layoutCrowns` (the nest's heading, the clamberer's facing, the lying latch), `chooseClip` (the clamber, in two places), `evaluatePose` (the gait's speed and distance, the look weight, the scratching arm), `stepIdle`, `placeGrounded` (the place it is bound for, the step limit, the ground placement's height), `emitProps`, `drawnAct`.
- The creature layer's context gained two optional functions, `limbNear` and `barkColor`. Without them a bough is joined to the bark and takes a default colour.
- The branch prop's material is now white and its colour is per instance; its geometry runs from its base along +Y (it was centred and lay along X). Nothing else drew with it.
- `PoseCtx` gained an optional field, `bears`. The pose buffer's look weight may now be negative.
- Run after the merge: frame time on the graphics card in a close view on a crown with a pair on a bough; `scripts/verify-browser.mjs`; one look at a model-driven animal leaving a partner in a crown.

### Decisions that are the user's

1. **The clamber.** 2.5 m a second, drawn from a metre. Recommended: keep. Slower reads calmer at Real time but lags the body behind its own path at Watch 4x.
2. **The tag "going to groom"** over an animal clambering to its partner. Recommended: keep; it is stage W6's wording for a body that has set off.
3. **An animal alone has fewer idle events in all** (1.1 a minute against 3.6 feeding in company), since its glance turns pass unused. The other reading of "the same rate" would give it a look about in place of each glance. Recommended: keep; its head already looks about between events.
4. **An animal whose two hands hold on** gets its unmakeable scratch turns back after 2 s, as the lone animal's glances were. Recommended: leave it until idle busyness as a whole is decided, since its total of events equals that of an animal with a free hand.
5. **The bough's colour and the spray's size**, both set by eye. Recommended: keep, and look again when the environment can seat two on a limb.
6. **The simulation keeps a groomer grooming while its partner climbs down** (it measures the pair's distance in the plane). Recommended: a small simulation stage of its own, registered, since it moves the golden hashes.
7. **The restart of the clamber clip on a paired actor** (section 6). Recommended: make the one-line change at integration and film `join-28-26` once more.

## 8. Second reading (12 October 2026)

A second reader went through this stage from 07:08 EDT on 12 October 2026: the whole difference from 9be7d44, every claim of sections 1 to 3 measured again with a probe of its own, and a look for what the eight fixes broke. Scripts, readouts and pictures: `/Volumes/Drive/chimpbench/shots/watch-2026-10-12/w11-polish/review/` (`rv.mjs` is the probe; `after/` holds the builder's head 50c6d00, `before/` the export of 9be7d44, `repaired/` the head of this section). One model-free server at a time, port 5198. No model process was started and no graphics probe was run.

### 8.0 Registered before the repaired code was served or filmed

Written at 08:13 EDT, after the builder's head had been read and filmed and before any line below was changed in a build that was served. (The two pure rules of repairs R1 and R4 were written first and their unit tests run once; nothing else of the changed code ran before this commit.) Four repairs, all in the renderer, no switch, nothing under `src/sim`. One run of the repaired build against the statements Q1 to Q6; every reading is reported, whichever way it reads.

**How it is measured.** The probe wraps the creature layer's own update in the page and reads every living animal right after it, with the frame time the layer was given, so a speed is the layer's own. Field map and 160 m map, seed 48, the model policy off from the first frame; a before and an after reading are compared only when the world hashes at the starting tick are equal.

**R1. The animal that stays drops onto all fours for a third of a second when its partner leaves.** Filmed at Watch 4x (`part-watch-1142`, animals 35 and 30): in the frame animal 30 set off down its trunk it was still counted as seated at its own place, that place crowded animal 35 onto its bough 1.04 m away, and animal 35 was flagged clambering for that one frame. The clip then held for its shortest time: 21 frames in the clamber clip while the body moved 0.2 m, and one frame tagged "going to groom". Cause: the crown layout reads whether a body is on its trunk from the placement of the frame before. Repair: the layout and the placement ask one rule of the same frame's path (`perch.ts` `trunkBound`).

**R2. A paired animal's clamber clip is restarted about three times a second** (section 6, second point; the builder's own finding). It shows: `join-watch-1187`, animal 26: 9 restarts in 3.5 s, and because each restart resets the clip's clock, the animal stayed on all fours for 18 frames (0.32 s) after it had reached its partner. Repair: the clip is returned with the role the pairing writes.

**R3. A body that clambers during its decision beat, or onto its trunk, trembles when frame times are uneven.** `nest-14-2812` (animal 14, Watch 4x, frames made 0 to 45 ms longer at random): 55 reversals of the heading in 223 frames of the clamber clip, 11.4 rad of travel on a straight way of 8 m. Cause: the fault of item 5 again. A clambering body is turned along its way, and the placement also turns it to what it chose (stage W6) or to the trunk. Repair: while it clambers, neither of those two turns.

**R4. The clamber clip plays above 2 min/s, and its flag stays on a carried infant.** Section 0.3 keeps "everything above 2 min/s" drawn at once, and the place is. But the bark a body is bound for and the blend it is drawn at are apart for half a second, which sets the clip going: at 10 min/s 133 clamber episodes in 30 s on the field map (61 of them under a tenth of a second) and 329 on the 160 m map (161). An infant picked up while clambering keeps the flag while it is carried (up to 2.2 s filmed; nothing reads it then, but nothing clears it either). Repair: no clambering above 2 min/s (`perch.ts` `clambering`), none on a carried body.

Statements, read on the repaired build:

- Q1 (R1). `part-watch-1142`, animal 35, the two seconds after animal 30 is first on its trunk: no frame in the clamber clip and none tagged "going to" (builder's head: 21 and 1).
- Q2 (R2). `join-watch-1187`, animal 26: no restart of the clip while it clambers, and at most 3 frames in the clip after it has arrived (builder's head: 9 restarts, 18 frames). It is still tagged "going to groom" for more than 3 s.
- Q3 (R3). `nest-14-2812`, animal 14, the same uneven frames: fewer than 10 reversals of the heading while the clamber clip plays (builder's head: 55).
- Q4 (R4). `lapse-10x-field-1300` and `lapse-10x-small-700`: no clamber episode (builder's head: 133 and 329). At 1 min/s the clamber still plays: `steps-1x-field-1575` has its three episodes.
- Q5 (nothing else moved). `steps-rt-field-1585`: largest step of the placement alone under 0.1 m, none over 25 cm, three clamber episodes, as on the builder's head. `part-rt-853`: no second with a plain "grooming" tag and no grooming pose. The nest builder's four turns are still 1.9 rad within 0.1.
- Q6. `tsc --noEmit`, the whole suite once and `pnpm build` on the final head.

### 8.0b Second run, registered at 08:50 EDT before its code was served

The first run of the repaired build (commits 96672fd to 7f0df75) read Q1, Q2 and Q4 as registered. Q3 did not hold: 14 reversals of the heading in 216 frames of the clamber clip, where fewer than 10 were registered (builder's head: 55). During the decision beat there were none left (38 before the repair). All but one of the 14 fell in the 39 frames in which the animal clambered to its trunk. Read frame by frame, the body's own steps there point one way within 0.08 rad (2.03 rad west of north) while its heading settles a whole radian from that and trembles by 0.03 rad with the frame time. Cause: a third pull that the first repair did not see. The motion step turns any body whose simulated path moves over the ground along that path, and a path on its way up a trunk also drifts sideways. So a body clambering to the bark was never turned along its own way at all: it stood between the two.

**R3b.** While a body clambers, the motion step does not turn it along its simulated path (`creatures.ts` `updateMotion`). One line.

- Q3b. `nest-14-2812`, animal 14, the same uneven frames: fewer than 10 reversals of the heading while the clamber clip plays, and over its way to the trunk the heading ends within 0.3 rad of the direction its steps take (first repair: a radian off).
- Q5b. `steps-rt-field-1585`: none of the placement's steps over 25 cm, three clamber episodes, and no step faster than the clamber's 2.5 m a second. (Q5 as first written asked for "under 0.1 m" a frame and read 0.125 m: one frame of the film lasted 50 ms, and the body covered it at exactly 2.5 m a second. The statement should have named the speed; it is put right here, and the first reading stands as reported.) `join-watch-1187`: Q2 again.
