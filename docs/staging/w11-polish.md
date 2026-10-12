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
