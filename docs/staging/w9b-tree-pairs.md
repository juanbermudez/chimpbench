# Stage W9: pairs and postures in trees

Branch `w9b-tree-pairs`, cut from `integrate-t2` at e883e6e (stages W6, W7 and W10 merged). Written 11 October 2026. Renderer only: nothing under `src/sim`, `data/` or `tests/fixtures` changed, no parameter and no contract field was added, the World is read and never written, `chimp.sim` is not read. No shader, no render pass, no texel was added (`ROW_TEXELS` is unchanged). This is a rebuild: an earlier builder was cut off, and its uncommitted work (commit 30b8251 on `w9-tree-pairs`, made on the old base) was used as a reference. Section 3 says what was kept. Reviewed by a second reader on 12 October 2026, who changed five things: section 7a says what, and sections 2 and 8 are brought up to date with it.

Where the stage comes from: the grooming stage's largest open limit ("In trees a grooming pair is not laid out as a pair", `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/reports/w5-grooming.md`) and the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-animation_and_motion.md`, issues "'perch', the most-shown clip, is a frozen ground sit" and "Feeding: one arm repeats a 3.4 s loop and picks from empty air"; `visual-behaviour_legibility.md`, moments 2 and 4).

Pictures and readouts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w9b-tree-pairs/` (`before/`, `after/`, `base/`, `harness/`, `census/`, the capture scripts beside them). Section 5 lists them.

## 1. What a viewer sees now

**A pair in a tree is a pair.** Two animals that groom, play, mate, embrace, beg or share in the crown of one tree sit together on one level bough, at the distance the ground layout uses, facing as they do on the ground. The groomer's hands are on its partner. Before, each sat on its own limb, up to several metres from the other and at another height, and the hands worked on air.

**A chain is a chain.** Every animal joined to another by such a pairing sits on the same bough, each at its partner: in a chain of three the first groomer sits behind the middle animal, wherever that one sits, and two animals working on one sit on its two sides.

**Nobody sits inside anybody.** An animal whose own place in the crown falls inside a body already seated there (the environment draws a handful of limbs per crown, and animals often drew the same spot) sits beside it on that animal's bough.

**A partner with an infant is groomed where the infant is not.** With an infant riding on its back (on the ground) the receiver turns to its groomer, who works on its front. Face to face, with an infant on the partner's belly between the two, the hands keep to the shoulders and head.

**Resting in a crown is five postures, not one.** Seated with a hand on the limb; seated with a hand on a branch overhead; seated with one leg down and the foot gripping; reclining on the back along a bough with a knee up and a leg hanging; lying prone along a large limb with the limbs hanging. Each individual takes one for 50 to 120 s and then changes, over about a second. In each a hand or a foot is on a support. Only an animal that rests, or keeps a resting companion company, lies down; lying postures are taken only in trees of 10 m or more, prone only in trees of 18 m or more, and not by an infant or by an animal with an infant on its body. A lying animal sits up when its decision beat begins.

**A perched animal sits still.** It no longer rocks on its seat when the frame time changes (section 2.1, "Facing").

**Nursing, sheltering and alarm in a crown have their own poses.** A mother whose infant is suckling on her sits in the nursing posture; an animal sheltering from rain huddles on its branch; an alarmed one stands on the branch with a hand holding on overhead. All three were the one seated pose before. A mating, embracing, begging or sharing animal in a crown now plays its own part of the pair (its partner already did).

**Crown feeding is done with two hands.** One hand reaches into the leaves, pulls a leaf-and-fruit cluster in front of the chest and holds it; the other plucks from it one to three times and takes each fruit to the mouth with the elbow down; then the animal chews for 3 to 10 s. The hands swap every cycle, the picks land on different points, and every 40 to 75 s the animal shifts a little along its limb.

**A nest grows while it is built, and the builder turns.** The builder sits at its nest place from the start; the nest grows under it from a few bent branches to the finished bowl over the four simulated minutes of building, and the builder turns four times as it pulls branches in. Before, it built on a bare branch and jumped into a small nest when the simulation finished it.

On the ground nothing changes except the infant-on-the-back case above.

## 2. How it works

All of section 2 is a stylization unless it says otherwise (section 6).

### 2.1 Seats in a crown (`src/render/creatures.ts` `layoutCrowns`, `src/render/creatures/perch.ts`)

- **Its own place.** An animal off the ground sits where it sat before this stage: on a limb the environment draws (`branchAnchor`), else out from the crown anchor. That code (`ownSeat`) was moved out of `placeGrounded` unchanged, so that the layout can ask for a partner's place.
- **Who is in a crown** (`Anim.up`): alive, not carried, drawn above 0.3 m, not on the trunk, and the act its DRAWN body is in (`Anim.act`, stage W6) is not climbing or nesting.
- **One bough for a group.** Pairings whose two animals are both in the crown of one tree go to `seatGroups` (pure, tested) instead of the ground layout. Everything joined by such pairings is one group and gets one bough, laid at one member's own place, the host's. The host is the animal that hosted the bough in the frame before (so it stays put while the group changes), else an animal that is only worked on (the others come to it), else the lowest id. From the host outward each pairing seats its unseated animal at the pairing's distance (`sep` times the two body sizes, the ground's figure) from its seated one; the side is set by the two ids, not by who acts, so a pair keeps its seats when the grooming changes direction; a side that is taken sends the newcomer to the other side.
- **The bough** is a prop, the stick the harness has always drawn under perched animals, level, laid across the host's limb at its seat. The environment's limbs are steep and a metre or two long: two animals at grooming distance do not fit on one at one height. It keeps 0.45 body lengths from the bark (in small trees the limbs start at the bole, and the first pictures had the trunk between the pair), is never drawn thicker than half the trunk beside it, and eases out to its members and back.
- **The largest offset.** A pair member is seated on the bough only if that seat is no more than 9 m (in the plane) from its own simulated position, or no further than its own branch already is from it, whichever is more (`perch.ts` `seatAllowed`). 9 m is as far as an own limb already draws an animal: with the camera at each occupied crown, an animal's own place was more than 6 m from its simulated position one time in ten and up to 8.9 m (section 7a; the builder's first figure was 6 m, the radius within which an animal counts as in a tree, and it refused about one groomer in twenty). Otherwise it keeps its own branch, as before. The camera's keep-clear, the selection ring and the name tag all follow the drawn body, as before. In the pairs the builder filmed the offset went from 0.8 to 7.4 m before to 1.1 to 5.4 m after (section 5.1). (The builder's census figures for offsets, in section 5.5, were read with the camera elsewhere: section 7a.)
- **Crowding.** After the groups, an animal on its own whose place is within 0.42 of the two body sizes of a seated body, or of the stretch of a bough others sit on, joins that bough at its nearer end, 0.44 of the two sizes from the last animal.
- **Lying.** An animal drawn in a lying posture gets a bough through its own seat and lies along it, unless a body is already seated within its own length of that place: then it stays seated (the crowding test runs first; section 7a).
- **Facing.** On a bough an animal faces its partner (the receiver is turned as on the ground), or along the bough. On its own limb it faces outward along it as before, but now by one damped turn: the motion step's heading target is that facing too. Before, the motion step pulled the heading toward the simulated heading at a rate that follows the frame time and the placement pulled it back at a fixed rate, so the balance between the two moved whenever the frame time did, and the body rocked.
- **Getting there.** The drawn seat eases to its place at 2.5 per second and never faster than 2.5 m/s. Drawn at once: a relocation, a first frame in the crown, a place more than 6 m away in any direction, the frame in which the forest window gives or takes the tree's limbs (the field map draws its forest round the camera), and everything above 2 min/s (stage W6's limit `ABOUT_MAX_RATE`). A seat that does not move is exactly where it was. The eased seat goes through stage W6's blend with the trunk, so coming off a climb is as before.
- **Hands on the partner.** In a crown the partner's place in the groomer's body frame is taken from the two DRAWN bodies. It used to be taken from the two simulated ground points, which a body on a branch is not drawn at.

### 2.2 The resting posture (`perch.ts` `perchPosture`, `poses.ts` clip `perch`)

A pure function of the individual, its bout and what its tree offers. A bout lasts 50 to 120 s of animation time by individual; each individual's bouts start at its own moments. Even bouts draw from the shares (26, 22, 22, 18 and 12% for hand on the limb, hand overhead, foot down, reclining, prone); an odd bout draws from the postures neither of its neighbours has, so the posture always changes with the bout. Role 0 (hand on the limb) is also the plain seat stage W6 uses for an animal paused on its way.

### 2.3 Which clip at height (`creatures.ts` `chooseClip`)

Reads the act the drawn body is in (`a.act`), as stage W6 requires. Feeding: the feeding clip (its crown half is new). Paired grooming, play, mating, embracing, begging and sharing: the pair's clips. Sheltering and alarm: their own clips (crown variants by `PoseCtx.inTree`). A mother whose carried infant's drawn act is nursing: the nursing clip. Resting, or following a companion: the resting posture of the bout. Any other act with no clip of its own at height (guarding a mate, a pause in a trip, grooming a partner out of reach): the resting posture when it is a seated one, else the plain seat. The actor of a pairing with no clip of its own at height (a pant-grunt, a submission, an attack): the plain seat (its role is rewritten by its pairing every frame; section 7a).

### 2.4 Crown feeding (`poses.ts` `crownFeed`)

One cycle is 11 to 14 s by individual: 1.6 s to reach into the leaves and pull a cluster to the chest, one to three picks of 2.1 s each, the rest chewing. The picking hand goes from its knee to the cluster by an IK target; for the leg to the mouth the IK weight is eased to zero and the arm ends in fixed joint angles (`MOUTH_ARM`), which is the forward-kinematics drive the brief asked for: the rig's elbow pole, which lifts a folded arm's elbow over the head, is not used on that leg and the rig is not changed. The angles were solved against `rig.ts`'s own forward kinematics and are held by a test: fingers within 0.06 body lengths of the lower lip, elbow at least 0.2 below the shoulder, at four ages and on both sides. The feeding loop on the ground is untouched.

### 2.5 A partner with an infant (`poses.ts` `groomerRole`, `creatures.ts` `pairingFor`)

Two new roles of the `groom` clip: 3, facing a partner that is not grooming back (it has an infant on its back and turns to the groomer); 4, facing a partner with an infant on its belly, with work sites on the two shoulders and the crown of the head only. In a tree a carried infant is always on the belly, so one-way grooming from behind was already clear of it.

### 2.6 The nest (`creatures/nests.ts` `build`, `creatures.ts`)

The simulation publishes `Chimp.nest` when the nest is finished; while it builds (3 to 5 simulated minutes [H: `nestBuildMinS`, `nestBuildSpanS`]) the animal stays where the nest will be, in the tree its act names. Once the drawn body is in the nest act the renderer takes that place as the nest's, seats the builder there, and reports the building clip's progress (0 to 1 over stage W6's 240 simulated seconds from the body's arrival) to `nests.ts`, which draws the nest at 0.3 to 1 of its size. The record is the one the finished nest is later found under, so nothing changes hands when `Chimp.nest` appears. A nest nobody was seen building grows in by the clock as before. The nest place is now a seat like any other: the body eases into it and off the trunk. The builder's heading target steps by 1.9 rad four times during the build (five headings) and goes back as it lies down.

## 3. From the partial work

Read as a reference, re-typed by hand onto the merged code, nothing cherry-picked. None of it had been run by its builder beyond four pictures in its `mid/` folder: two from the harness (one missed its subject) and two from the app.

**Kept** (checked here before keeping):
- The idea and most of the mechanics of the shared level bough, the per-frame cache of an animal's own place, the easing of the drawn seat, taking the partner's place from the drawn bodies, and the crowding rule. The crowding rule looked like scope creep and was dropped at first; the first chain filmed in the app had a bystander sitting inside it, so it came back.
- The five postures and their clip (`perchRest`), with two hand positions moved onto the support (a forward-kinematics readout found one 0.2 body lengths beside the limb).
- The crown-feeding clip and its hand-to-mouth joint angles: the claim in its comment ("tests/render-perch.test.ts holds both") named a test that did not exist. The angles were checked against the rig and are right; the test now exists.
- The groomer roles for a partner with an infant, the crown variants of nursing, sheltering and alarm, the harness options `&up=`, `&posture=`, `&third=1`.

**Rewritten:**
- `seatGroups`. The partial's version seated animals relative to chain roots and then re-based the places on the lowest slot; it was replaced by a shorter rule (choose the host first, seat outward from it) with the host kept from frame to frame, so a bough does not move to another animal's limb when a third animal joins or the grooming changes direction.
- The posture rule. The partial's "a bout never repeats the bout before" was not true (two equal draws in a row followed by a shifted one could repeat, and turning prone into reclining could too). It is now true by construction and tested. What a tree offers is three classes, not a yes or no: nobody lies down in a tree under 10 m (the first app pictures had a bough thicker than the trunk).
- Everything in `placeGrounded`, `chooseClip` and the frame update, on stage W6's code: the seat goes through W6's trunk blend; who is in a crown, the nursing mother and the clip choice read the drawn act; a lying animal sits up for its decision beat; W6's turn toward the goal on a branch is kept.
- The crown variants are chosen by `PoseCtx.inTree`, not by a role the caller must pass.

**Dropped:**
- The guard clip's crown variant (not in the brief; a guarding animal keeps to the seated resting postures instead).
- `perchFace` as a separate field (one field, `seatFace`, serves pairs, lying animals and animals on their own limb).

**Added beyond the partial:** the bough's clearance from the trunk and its thickness limit; mating, embracing, begging and sharing actors in crowns playing their part; the steadier heading of perched animals; the nest (item 4 of the brief, which the partial had not started); the tests; the capture scripts' probe (`debug.crown`).

## 4. What runs per animal per frame, and allocation

Per frame, for every animal: six fields reset and one test of whether it is in a crown.

For every animal in a crown (30 of 49 in the census of section 5.5):
- its resting posture: 45 ns (one to three hashes and two short loops; measured in node, section 5.6);
- its own place: the two environment look-ups it already made each frame in `placeGrounded`, now made once in the layout and reused;
- the crowding test against the seats already taken in crowns: a distance test per pair of animals in crowns, at most a few hundred a frame;
- in `placeGrounded`, the easing of its seat: a dozen multiplications, skipped when the seat has not moved.

For pairings in crowns: `seatGroups` (22 ns for one pair, 135 ns for a chain of three and a star of three together), one trunk look-up per bough, and one instance of the existing branch prop per bough drawn.

Clips: the resting clip costs 131 to 211 ns a call by posture (the plain seated clip, which the old one equalled, 189 ns); crown feeding 393 ns against 371 ns for the ground loop; the crown variants of nursing, sheltering and alarm 10 to 20 ns more than their ground poses.

**Allocation.** Nothing in the new code creates an object, array, closure or string per frame: the layout works in typed arrays and two fixed lists made once with the layer; `seatGroups` and the posture rule measure 0.003 bytes of heap growth per call. A nest record and its key are allocated once per nest, when its building is first seen. The probe `debug.crown` allocates and is called only by capture scripts. Two things that were already so and still are: `chooseClip` returns a fresh three-element array per pose evaluation (the new branches follow the existing pattern), and `nests.update` builds a key string per animal with a nest per frame. In node the collector ran 7 times during 2 million calls of crown feeding (5 for the ground feeding loop, 1 to 3 for the other clips, old and new): short-lived boxed numbers from helpers the compiler did not inline, as in the existing clips.

**Frame time was not measured** (the GPU probe is off limits tonight). No GPU work was added except the bough instances (at most one per group or lying animal, in the existing instanced prop mesh).

## 5. Proof

Field map, seed 48, rules for everyone, model off, the app's own clock on a model-free server (port 5188); the before set from the untouched worktree (e883e6e) at 22:12 to 22:23 on 11 October, the after set from commit 675ac1d at 23:41 to 00:02. Each film: the camera at a 4 m orbit on the first animal (5 m for the chain, the two resting animals and the pair forming), Real time unless noted, four to six frames 2.4 to 3 s apart in one sheet, a JSON of the same name with the per-frame readout (clip and role, drawn and simulated position, the pair's distance, the distance from each of the groomer's wrists to the partner's spine from hips to head) and the wrist travel sampled every 50 ms. `python3 tables.py` prints every number below from those files. World hashes at the start of each film are in the JSONs and are equal before and after.

How much of a day this is about (`after/scan-field.json`: day 1 walked tick by tick from 08:30 to 19:30 on a paused world, 129,360 animal-ticks): 71% of animal-time is off the ground. Of that time 33% is feeding, 30% resting, 14% in the nest act, 10% grooming, 4% following, 3% nursing, 2% climbing, 2% play and 1% guarding a mate. 76% of grooming is off the ground. Nobody sheltered or gave an alarm in a crown that day.

### 5.1 Pairs in crowns

Seven moments of day 1 (the chain takes two rows), each on the same tick before and after. "Hand" is the distance from the nearer of the groomer's wrists to the partner's spine line, hips to head (a hand on an adult's back is 0.2 to 0.3 m from that line).

| Moment (file) | Before: apart, height difference, hand | After |
| --- | --- | --- |
| Ebini grooms Dalubi (`pair-tree-a`) | 2.34 m, 0.29 m, 1.62 to 1.72 m | 1.21 m, 0, 0.26 to 0.27 m |
| Bweru grooms Hembara (`pair-tree-b`) | 1.37 m, 1.09 m, 0.53 to 0.67 m | 1.17 m, 0, 0.24 to 0.30 m |
| Ilobe grooms Dembiri (`pair-tree-c`) | 0.62 m, 0.57 m, 1.30 to 1.33 m | 1.18 m, 0, 0.24 to 0.25 m |
| Dembiri and Nkeru groom each other (`mutual-tree`) | 0.65 m, 0.60 m, 0.36 to 0.38 m | 1.25 m, 0, 0.22 to 0.24 m |
| A chain, Ugazi on Nkeru (`chain-tree`) | 6.63 m, 2.02 m, 6.23 to 6.25 m | 0.98 m, 0, 0.28 to 0.30 m |
| The same chain, Nkeru on Dembiri | 0.65 m, 0.60 m, 0.83 to 0.97 m | 1.25 m, 0, 0.22 to 0.27 m |
| Nkeru with her infant on her belly, groomed by Dembiri (`recv-infant-tree`) | 0.65 m, 0.60 m, 0.37 to 0.47 m | 1.14 to 1.25 m, 0, 0.24 to 0.33 m |
| Pakwe tickles Rwasi (`play-tree`) | 1.90 m, 0, 2.27 to 2.31 m | 0.67 m, 0, 0.04 to 0.05 m |

- **The pair's distance is now the ground layout's**: 0.40 (one-way) or 0.44 (mutual) of the two body sizes, 1.17 to 1.25 m for two adults, 0.98 m with the juvenile Ugazi. Two pairs were closer before (0.62 and 0.65 m) and no better for it: they sat at different heights, so the hands were 0.4 to 1.3 m from the partner.
- **Wrist travel of the groomer over 12 s** (path of the right wrist): 79 to 410 cm, 252 to 404, 128 to 414, 117 to 390 (mutual), 136 to 223 (the chain's first groomer), 178 to 364 (the mother with an infant). Range of the right wrist in `pair-tree-a`, sideways, up and down, front to back: 4, 7 and 4 cm before; 19, 33 and 25 cm after. The moving hands of the grooming stage did not show in crowns because the clip only works on a partner within reach.
- **The mother with an infant** (`recv-infant-tree`): while the two groom each other the groomer is in role 4 (shoulders and head; the infant is between them); when it turns one-way the mother turns her back and is groomed from behind. In the chain's picture a fourth animal (Ilobe), whose own place was inside the group, sits at the end of the bough.
- **Offset from the simulated position** of the 13 animals in these pairs: 0.80 to 7.38 m before, 1.08 to 5.42 m after. Nearest body to the bark: 0.63 m.
- **A pair forming** (`pair-form`, Watch 4x, one frame a second, around the moment Bweru's drawn body begins to groom): before, the clips change and nobody moves (1.37 m apart, 1.09 m difference in height, hands 0.57 to 0.68 m off). After, the groomer moves 0.95 m in the first second and 0.50 m in the next, and the receiver sits up from its reclining posture; from then 1.17 m, the same height, hands 0.23 to 0.30 m.
- **In the creature harness** (`harness/after/pairs.png`): a pair, a mutual pair, a chain of three, two groomers on one animal, a receiver holding an infant, a tickling pair, a mating pair and an embrace, each on one bough in a tree. `harness/after/groom-infant-on-back.png`: on the ground, a receiver with an infant of 0.8 years on her back faces her groomer (`groom/3`); with one of 0.3 years on her belly she is groomed from behind.

### 5.2 Resting

- **Twelve seconds of two resting animals** (`perch-12s`): before, both in the same seated pose (`perch/0`), nothing moving but the heads. After, one sits with a hand on a branch overhead and the other reclines along a bough.
- **A census of the field map at one tick** (tick 1450, 30 animals in crowns): of the 15 drawn in the resting clip, 5 sit with a hand on the limb, 4 with a hand overhead, 2 with a foot down, 4 recline. Before, all 15 were in the one pose. On the small map (tick 900): 2, 1, 1, none reclining and 1 prone.
- **Stillness**: path of the wrists over 12 s, which is the body turning on its seat: 244 cm and 7 cm in the two before films (taken while the machine's load changed), 1 to 3 cm on the same code at a steady frame time (`base/`), 0.0 cm after. Head path 7 to 14 cm before, 7 to 8 cm after.
- **The five postures** in the harness: `harness/after/perch-postures.png`. **A change of posture** (`harness/after/perch-change.png`, 21 frames 0.15 s apart): from a hand overhead to reclining, the body turns along its new bough and is down in about 0.8 s. Over 190 s of harness time that animal went hand overhead, reclining, hand on the limb, foot down, changing every 48 s (`perch-change-scan.json`).
- **Nursing**: the mother of a suckling infant (`nurse-tree`) is drawn in `nurse` where she was in `perch`.
- **In the harness only** (`harness/after/others.png`): nursing, sheltering, alarm and a begging pair in a crown.

### 5.3 Crown feeding

One animal (Ereko, in a tree of 23 m), from the side over 14 s and from below, before and after (`feed-side`, `feed-below`).

| | Before | After |
| --- | --- | --- |
| Hands that work | one (right wrist path 1,014 cm, left 67 cm) | both (136 and 192 cm in this window; 348 and 422 cm in another) |
| What the hand picks from | a point in the air above the head | a cluster held in the other hand |
| Nearest the picking wrist comes to the lower lip | 34 cm (`base/feed-side.json`) | 20 cm (the fingers are at the lips) |
| Elbow against shoulder at that moment | 26 cm above | 40 cm below |
| Highest an elbow rises over its shoulder | 36 cm (the picking arm), 41 cm (the arm held overhead) | 33 cm (the arm reaching into the leaves); the picking arm stays below |

In the harness (`harness/after/feed-side.png`, `feed-below.png`, 18 frames 0.6 s apart): the cluster in one hand and the other hand at the mouth, 8 s of chewing, the reach into the leaves, the cluster pulled in.

### 5.4 The nest

One builder (Ebini, tick 2812 on, Watch 4x, a frame every 6 s; `after/nest-grow.*`, `base/nest-grow.*` for the unchanged code).

| | Before | After |
| --- | --- | --- |
| Where the builder is while it builds | on its branch, 2.5 m from where its nest then appears; it jumps there when the simulation finishes the nest (36 s into the film) | at its nest place from the first frame (0.18 m from the nest's centre) |
| The nest while it is built | none (the nearest nest is 389 m away) | drawn at scale 0.40, 0.48, 0.58, 0.71, 0.85, 0.99, 1.10, 1.19, 1.24, then 1.25 (the finished nest) as the animal lies down |
| The nest when the builder lies down | scale 0.31 (it then grows by the clock for six simulated minutes under the sleeper) | 1.25 |
| The builder's heading | -2.12 to -2.23 rad throughout | 4.13, 4.96, 5.15, 6.31, 6.31, 3.72, 3.72, 4.82, 4.78, then 4.06 asleep |

Stage W6's every-frame census over 120 s at Watch 4x from tick 2800 counts the frames in which a body moves more than 0.8 m: 9 before (18.7 m in all; 6 of them animals jumping into or within a nest), 3 after (9.3 m; the same three that are not about nests). The builder faces five ways in turn; the four turns between them come out as steps of 1.0 to 1.2 rad (one of 2.6 rad the other way round), not the 1.9 rad the code asks for: section 7.

### 5.5 Everything else unchanged

- **Creature harness tiles** (`scripts/groom-shots.mjs tiles` on a frozen page clock with seeded randomness, 30 actions): 30 of 30 tiles pixel-identical to the unchanged code, no animal in another clip (`harness/tiles-diff.json`).
- **The grooming-roles check of stage W5** (`scripts/groom-shots.mjs cases`): 11 of 11 pass (`harness/after/cases.json`).
- **A census of every drawn animal** at one tick of a paused world, before against after (`python3 census-diff.py`): field map, tick 1450: 16 animals on the ground, none drawn differently (clip, role and position); 30 in crowns, 17 differently (10 in another resting posture, 7 groomers moved onto a shared bough, by 0.06 to 4.25 m); 2 of 3 carried infants moved with their carriers, by 3 and 7 cm. Small map, tick 900: 25 on the ground, one wrestling pair with its two roles swapped (they swap every 3 s of the animation clock, which two page loads do not share) and nothing else; 22 in crowns, 12 differently (5 groomers and a receiver onto shared boughs, by 0.19 to 8.81 m; 3 in another resting posture; 3 feeding animals moved 0.30 to 1.72 m off a spot another animal sat in). World hashes equal in both.
- **Offsets from the simulated position, all animals in crowns of those censuses**: field map, largest 4.58 m before and after, mean 1.20 m before and 1.39 m after; small map, largest 8.76 m before and after, mean 3.47 and 3.55 m.
- **Stage W6's every-frame census** (copied to `census.mjs`; Watch 4x, 120 s, all 49 animals): from tick 1430, where a mutual pair and a chain form in a crown, no frame with a body moving more than 0.8 m before or after; no body held while moving, no plain tag over an approach, and 0.14 against 0.16 animal-seconds of a pose ahead of its tag. From tick 2800 (dusk): section 5.4.
- **After a fast-forward** (stage W6's check, copied to `skip.mjs`): 6 h/s for 1.2 s then Watch 4x, and 1 h/s for 4 s then Real time: no body further than 30 m from where the simulation has it in any of the four samples of each; 2 or 3 animals drawn in an older act, all on their way to the new one.
- **The renderer writes nothing**: world hashes at the start of every film, at each census and at the jump and the end of each every-frame census are equal before and after.

### 5.6 Checks

- `pnpm exec tsc --noEmit`: clean.
- The 27 files `tests/render-*.test.ts`, run one by one with `pnpm exec tsx --test` at the head, 221 tests, all passing: new `render-perch` 10; unchanged `render-groom` 6, `render-drawn` 23, `render-beat` 10, `render-intention` 4, `render-secondary` 6, `render-patrol` 10, `render-playback` 4, `render-motion` 6, `render-gait` 6, `render-pace` 7, `render-body` 7, `render-callreach` 9, `render-camera` 5, `render-camera-zoom` 7, `render-cells` 5, `render-field` 12, `render-flow` 3, `render-follow` 12, `render-footprint` 5, `render-fruit` 16, `render-occluders` 18, `render-party-map` 11, `render-pick` 6, `render-portrait` 3, `render-post` 3, `render-sky` 7. The new test file type-checks under the project's strict options (with node's types added, which `tsconfig.json` does not include).
- `tests/render-perch.test.ts` holds: a pair shares one bough at the ground's distance whoever acts; a chain keeps each groomer at its partner and two groomers of one animal take its two sides; the bough stays with the best-ranked animal; the 9 m rule; the posture is a pure function of individual and bout, changes with every bout, and respects what the tree offers; a hand or foot is on a support in every posture; crown feeding has a cluster in one hand, one to three picks, 3 to 10.5 s of chewing, alternating hands and varying pick points; the hand reaches the mouth with the elbow below the shoulder at four ages on both sides; the groomer's role by where the infant is; the crown variants leave the ground poses alone.
- `git diff e883e6e --stat -- src/sim src/simulation.ts src/types.ts src/decision.ts src/kernel src/providers src/persist server data tests/fixtures` is empty.
- Cost per call in node (`clip-cost.json`, `cost.mts`): section 4.
- Not run, as briefed: `pnpm test`, `pnpm build`, the GPU probe, anything with a model.

### 5.7 Files

In `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w9b-tree-pairs/`:

| Folder or file | What |
| --- | --- |
| `before/`, `after/` | the 13 films of `specs.json` in the same framings (`pair-tree-a`, `-b`, `-c`, `mutual-tree`, `chain-tree`, `recv-infant-tree`, `play-tree`, `perch-12s`, `perch-solo-12s`, `feed-side`, `feed-below`, `nurse-tree`, `nest-build`), each a sheet and a JSON; `census-field-1450`, `census-compressed-900`; in `after/` also `pair-form`, `nest-grow` and `scan-field.json` (the day walked tick by tick) |
| `base/` | the unchanged code served again from an export of e883e6e, for the films and measures added after the first before set: `feed-side`, `pair-form`, `perch-12s`, `perch-solo-12s`, `nest-grow` |
| `harness/before/tiles.png`, `harness/after/` | the creature harness: tiles, the grooming cases, `perch-postures`, `perch-change`, `pairs`, `others`, `feed-side`, `feed-below`, `groom-infant-on-back` (`perch-lying.png` is an earlier, wider view of the two lying postures, taken before the reclining hand was moved 6 cm onto the bough) |
| `census/` | stage W6's every-frame census and fast-forward check on both builds |
| `mid/` | working captures taken while building (not the final code) |
| `cap.mjs`, `nest.mjs`, `hshot.mjs`, `starts.mjs`, `probe.mjs`, `census.mjs`, `skip.mjs`, `cost.mts`, `tables.py`, `census-diff.py`, `run-*.sh` | the scripts; `run-before.sh`, `run-base.sh` and `run-after.sh` reproduce the sets |

The after films were taken at commit 675ac1d, the last commit that changes what is drawn; the commits after it change this document, the research addendum and one code comment.

## 6. What is sourced and what is a stylization

- **Sourced** (all already in `docs/research.md`; its new section "Addendum: W9 pairs and postures in trees" says which line carries what): arm-hanging occurs and brachiation is rare (Hunt 1992 [moderate]), used for the hand on a branch overhead in one resting posture and in the crown alarm pose; adult great apes take 2 to 5 minutes to build a night nest (khayer2025 [M]), which is the simulation's building time and the span the drawn nest grows over.
- **Stylizations with no source**, labelled so in code: that animals interacting in a crown share one level bough, where it is laid and who sits on which side; the bough itself; the crowding rule; the five postures, their shares, their durations and the tree heights for lying; the whole of crown feeding (the cluster, one to three picks, the chewing time, the swapping of hands, the shift along the limb) and the arm angles at the mouth; the nursing, sheltering and alarm poses in a crown; grooming a partner where its infant is not; the nest's size while it is built and the builder's turns.
- **Not looked for:** a source on how chimpanzees space themselves on a branch, on resting postures in crowns by frequency, on how a fruit cluster is handled, or on the steps of nest building. `docs/research.md` has none and the web was not searched for this stage.

## 7. Limits, and what is not done

- **Nothing was seen with a model.** No model process was allowed. Nothing here depends on who decides.
- **Frame time was not measured** (the GPU probe is off limits tonight; left to the integrator). Section 4 says what runs.
- **`pnpm test`, `pnpm build`, the golden hashes, the field pin and `scripts/verify-browser.mjs` were not run**, as briefed. No file they read was changed.
- **The bough is a prop.** It is a plain level cylinder in the crown, drawn where the pair sits, not a limb of the tree: it does not join the tree's own limbs except where it crosses the host's, it is not one of the keep-clear camera's objects (it never fades when the camera passes behind it), and in a thin tree it is thin (down to 3% of the body's size). A real fix is a limb in the environment that can seat two, which is the environment's file.
- **An animal joining a bough slides there.** Its seat moves at up to 2.5 m/s while its pose blends from one seated pose to the next; there is no clamber or branch-walk clip (the review's "movement inside crowns has no clip" is still open). One formation was filmed (section 5.1): 1.5 m in two seconds. The end of a pairing was not filmed.
- **"Leaning back against the trunk" is not one of the postures.** The brief named it. An animal's seat is out on a limb, 0.6 to 3.8 m from the bark in the filmed crowns, and the creature layer has no way to ask the environment for a seat at the bole; a seated animal leaning back on nothing read worse than the hand on the limb that stands in its place.
- **The hand on a branch overhead holds nothing that is drawn.** No branch is drawn there; in a leafy crown it reads as holding on, against the sky it reads as a raised arm.
- **Hands do not move between posture changes.** Over 12 s a resting animal's wrists do not move at all (the head does: the look system). The idle life of a seated animal belongs to another stage working in the same file.
- **Seen only in the creature harness, never in the app:** sheltering and alarm in a crown (no rain and no alarm in a crown in the windows filmed), mating, embracing, begging and sharing pairs on a bough, two animals grooming one, and the receiver with an infant on its back (a case on the ground). (The prone posture was filmed in the app by the second reader: section 7a.)
- **Not seen at all:** a host leaving a bough others sit on (the bough then moves to the next host's place and the others slide there). (A lying animal sitting up for its decision beat was filmed by the second reader: section 7a.)
- **A change of posture is quick.** From seated to lying the body turns along its bough and is down in about 0.8 s (the renderer's blend between two poses, as for the grooming receiver); there is no lie-down motion. The bough under a lying animal appears and goes in about half a second.
- **The builder's turns are smaller than asked.** An animal in its nest is still turned by two things at once, the motion step toward the simulated heading and the placement toward its seat, so the steps come out at 1.0 to 1.2 rad instead of 1.9, and a builder or sleeper can still rock a little when the frame time changes. The single turn of section 2.1 was not extended to nests so that the harness's nest tile stays pixel-identical; it is a few lines in `layoutCrowns`.
- **Chewing is still for seconds.** After the picks the animal chews for 3 to 10 s with both hands on its knees; only the jaw and the head move.
- **The hand at the mouth is not tied to the head.** The joint angles were solved for the head tipped down as the clip sets it. The look system may turn the head meanwhile, and the hand then meets the cheek, not the lips. In the pick filmed in the app the wrist came within 20 cm of the lower lip (0.13 body lengths).
- **A bough can pass close to another group's.** The crowding rule moves an animal that is on its own; two groups whose hosts sit on one limb are not kept apart.
- **A pair is seated together only in one tree.** Two animals in neighbouring crowns that the simulation has grooming across the gap keep their own branches, as before (on the small map 3 of 17 groomer samples in crowns: hands 4.7 to 11.9 m from the partner), and so does a pair member whose seat would be further than the rule of section 2.1 allows (none in the second reader's census once the rule was 9 m).
- **The small map** was compared by a census of clips and positions at one tick (section 5.5), not filmed.
- **The nest** was filmed once, for one builder, at Watch 4x. A nest whose builder is not drawn building (a fast-forward through dusk) grows in by the clock as before, after the fact. A builder that leaves early leaves a part-built nest for the 45 days a nest is kept.
- **Fast-forwards** were checked twice with stage W6's script (section 5.5), not at every speed. The seat is drawn at once after a relocation or when its place is more than 6 m away, so a stale seat cannot carry a body further than that; above 2 min/s every seat is drawn at once (section 7a).
- **Everything is from day 1 of one seed**, each moment filmed once per build. Rain, a second day and other seeds were not looked at.

## 7a. Second reader (12 October 2026)

Read the whole diff and the document, then looked in the running app and the harness with other framings than the builder's. Pictures, readouts and scripts: `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w9b-tree-pairs/review/` (`r1/` as built, `fix/` after the changes below, `census/`, `harness/`). Model-free server on 5188; rules for everyone from the first frame.

**What held.** Nothing under `src/sim`, `src/types.ts`, `data/` or `tests/fixtures` is in the diff; the renderer writes nothing (world hashes equal tick for tick between the build as delivered and the build as changed, twelve ticks) and does not read `chimp.sim`; no pass, target, texel or per-frame allocation was added; scheduling is by hash. The 30 harness tiles are pixel-identical to the builder's "before" sheet with the changes below, the 11 grooming cases pass, the 27 render test files pass (221 tests), the type-check is clean. In the app: a mutual pair at a 4 m orbit sits 1.28 m apart at one height, the nearer hand 0.21 to 0.28 m from the partner's spine over 12 s, right wrist path 311 cm (`fix/pair-4m`); a partner arriving up the trunk is seated on the bough within two seconds of leaving the bark (`fix/pair-form`); a nest grows under its builder, who turns (`fix/nest-grow-olumbe`); crown feeding is as described (`fix/feed-side`); on the small map two mutual pairs sit together, hands 0.14 to 0.35 m (`fix/small-map-pair`). Seen in the app for the first time: an animal lying prone (`fix/beat-lying-fwambo-b-f6.png`), and a reclining animal sitting up before its decision beat's glance and keeping its seat through the look and the intention movement (`fix/beat-lying-fwambo-b`; over 120 s at 1 min/s, 94 beats began on animals in crowns, 2 of them lying, both sat up).

**Found and changed (five commits after d5ea610).**
1. **A clip flickered.** The actor of a pant-grunt, a submission or an attack in a crown has no clip of its own there and fell through to the resting posture, while its role is rewritten by its pairing every frame: when its posture of the bout was not the plain seat the clip was dropped and started again about three times a second (harness, `&posture=1` or `2`: 11 clip changes in 4 s; none after). It now keeps the plain seat.
2. **Bodies rose through the crown after the camera arrived.** The field map draws its forest in a window round the camera; a tree outside it gives the layer no limbs and a place is found without them. When the camera reached a far tree on a playing world, every animal in its crown eased from that place to its limb: 4.1 m over 2.6 s and 5.2 m over 3.3 s in two arrivals (`r1/jumpplay-*`); one step again after, as before the stage (`fix/jumpplay-*`). The layer now notes when the environment's answer for an animal's place changes and draws that frame at once.
3. **Bodies drifted in time-lapse.** Above 2 min/s pairs form and part several times a second and the eased seats never arrived: seated bodies were away from their places 41% of the time at 10 min/s and 80% at 1 h/s (`census/r1-glide-*`; 0% at Watch 4x, 4% at 1 min/s). Above stage W6's limit every seat is now drawn at once (0% at both speeds, `census/fix-glide-*`).
4. **An animal lay down through its neighbour.** A lying posture was given its bough before the test for a body already seated there (`r1/lying-on-neighbour`: a three-year-old reclining inside a feeding adult, 0.27 m apart; 1.06 m apart on one bough after). The test runs first now, and an animal with a neighbour within its own length stays seated.
5. **The 6 m rule refused seats the environment already draws.** A census with the camera at every occupied crown (twelve ticks of day 1, 346 animal samples in crowns, `census/r1b-field.json`): an animal's own place is 2.5 m from its simulated position at the median, more than 6 m in 9.6% of samples and 8.9 m at most. Of 53 groomers with a partner in the same crown, 3 were not seated with it: a chain's first groomer at two ticks (`r1/chain-first-refused`: working on the air 8.65 m from its partner) and one that the crowding rule then seated on a bystander's bough. With 9 m none is refused (`fix/chain-first-joined`: 1.08 m from its partner, hands 0.25 to 0.27 m), and no two bodies share a place (2 before). Guests on a bough are now up to 7.6 m from their simulated position (7.3 m as built); the mean over all animals in crowns went from 2.68 to 3.00 m, the largest (an own limb) is 8.92 m in both.
6. **Smaller:** the nest record built a key string for every sleeper not in its map of 64 builders (with more animals asleep than that, one each per frame; read from the code, not measured: the field map has 49 animals); a build that was given up kept its progress for the next nest; a paired actor could be read as lying from the role its pairing gave it. The distance beyond which a seat is drawn at once is measured in three directions (limbs of one crown are metres apart in height). One assertion was added to the posture test.

**Found and left.**
- **The bough under a lying animal reads as a floating log** (`fix/beat-lying-fwambo-b-f6.png`): level, about 3 m long, as thick as the limbs round it or thicker and much darker than they are (the prop is brown; the tree's limbs are green), joined to nothing. The seated pairs carry it better (`fix/pair-4m-full.png`). This is the builder's first question to the user, and the picture to decide it by.
- **Rows on a bough.** The crowding rule alone seats bystanders in a row: four animals that were not interacting on one bough 4.95 m long (`r1/bench-of-bystanders`), and chains of four (`r1/chain-koruza`).
- **In time-lapse boughs come and go**: 93 times in 30 s at 10 min/s over the whole map, 181 at 1 h/s. Not changed.
- **A mother feeding with an infant on her belly** holds the cluster over the infant's back (`fix/feed-with-infant`). The ground loop reached past the infant's head.
- **An own seat can be in the bark.** In 15 of 346 samples the body's root is 0.2 to 0.4 m inside the trunk's radius, all on their own limb (the environment's limbs start at the bole). That placement is the code moved unchanged from before the stage; it was not measured on the old build.
- **The end of a pairing**: the body slides back to its own limb, seated: 0.6 to 2.3 m in the six ends read at 1 min/s, five of them over within about 2 s (`census/fix-beats-1x-b.json`). Not filmed.
- **A juvenile that nests beside its mother** while she builds reports a nest of its own at its own place (it is not carried and its act names her tree); by reading, not seen. It would leave a part-built nest beside hers.
- **Displaying in a crown is still the resting clip** (as before the stage), and now in the animal's posture of the bout.
- **Not looked at by either reader:** rain and alarm in a crown in the app (none on day 1 with rules for everyone), a second day, another seed, a model-driven animal, frame time, `pnpm test`, `pnpm build`.

**About the builder's censuses.** Their one-tick censuses and the every-frame census read every animal with the camera on one party, so most crowns were outside the forest window and those animals were at places found without limbs: "largest offset 4.58 m, unchanged" is true of that reading and is not the largest offset near a camera (8.9 m, an own limb). The pair films were taken with the camera at the pair and stand.

**For whoever probes next.** A paused page still pumps decisions: stepping a paused world by the public tick with the model policy on (the default) freezes the animals on the model roster where they are, for hundreds of ticks. `review/lib.mjs` opens the app with the policy off from the first frame (the W6 review's preset). And on a paused world every track stays marked as a relocation, so every seat is drawn at once: easing has to be measured on a playing world.

## 8. For the integrator

### Status block for `IMPLEMENTATION_PLAN.md` (after the block for stage W6)

> ## Stage W9: pairs and postures in trees (render only)
> **Goal**: the grooming stage's largest open limit and two of the review's motion issues: animals that interact in a crown sit together, an animal resting in a crown is not a frozen ground sit, crown feeding picks from something, a nest grows while it is built.
> **Status**: Built on branch `w9b-tree-pairs` (11 October 2026; `docs/staging/w9b-tree-pairs.md`), a rebuild on the merged head of a stage that was cut off; Nothing under `src/sim` and no contract field changed; world hashes are the same before and after in every film and census. In seven moments filmed in crowns of the field map (six of grooming, one of play; seed 48, the same ticks before and after) the two bodies of a pair are 0.67 to 1.25 m apart at one height, where they were 0.62 to 6.63 m apart and up to 2.0 m apart in height; in the grooming moments the groomer's nearer hand is 0.22 to 0.33 m from the partner's spine (0.36 to 6.25 m before); a chain's first groomer sits 0.98 m from the animal it grooms (6.63 m before). Of 15 animals resting in crowns at one tick, 5, 4, 2 and 4 are in four different postures (all 15 in one before), and a perched body no longer turns on its seat when the frame time changes. In crown feeding both hands work, the picking wrist comes within 20 cm of the lip with the elbow 40 cm below the shoulder (34 cm away with the elbow 26 cm above, before). A nest grows from 0.40 to 1.25 of its size under its builder, who sits in it from the start (before: no nest while it built, then a jump of 2.5 m into one at a quarter of its size). The 30 harness tiles are pixel-identical and stage W5's 11 grooming cases pass; no animal on the ground is drawn differently in a census of each map, apart from the one case meant: a receiver with an infant on its back now faces its groomer. Reviewed by a second reader on 12 October, who changed five things (a clip that flickered on pant-grunting, submitting and attacking animals in crowns; bodies easing 4 to 5 m through a crown for three seconds after the camera arrived at a far tree, and drifting in time-lapse; an animal lying down through its neighbour; the largest offset, now 9 m, after the 6 m rule left one groomer in twenty away from its partner). Open: the shared support is a prop bough, not a limb of the tree, and under a lying animal it reads as a floating log; an animal joining it slides there (no clamber clip); "leaning back against the trunk" is not built; hands do not move between posture changes; the prone posture, the crown poses for sheltering and alarm, and mating, embracing, begging and sharing pairs on a bough were seen only in the creature harness; nothing was seen with a model; frame time is the integrator's to measure.

### Lines for `AGENTS.md`

Gotchas, after "An animal in a tree is placed and looked up by where its body is DRAWN":

> - Seats in crowns (stage W9, `render/creatures/perch.ts`, `creatures.ts` `layoutCrowns`): an animal off the ground sits at its own place (`ownSeat`: a limb the environment draws, else out from the crown anchor) unless the layout seats it on a bough (`Anim.seatHost`): everyone joined by pairings in the crown of one tree shares one level bough laid at one member's place (`seatGroups`, pure and tested), an animal whose place is inside another's body joins that animal's bough, and an animal drawn lying gets one along its body. The bough is the branch prop, never a limb of the tree. A seat is refused when it is more than 9 m from the animal's simulated position and further than its own branch (`seatAllowed`; an own limb is up to 8.9 m away). The drawn seat eases to its place (`Anim.sx/sy/sz`) and then goes through stage W6's blend with the trunk; the nest place is a seat too. It is drawn at once after a relocation, more than 6 m away, above 2 min/s, and in the frame the forest window gives or takes the tree's limbs (`Anim.ownCut`: a tree outside the window has no limbs, and its animals sit at places found without them). An animal with a body seated within its own length does not lie down. A paired actor with no clip of its own at height takes the plain seat: its role is its pairing's every frame. Pair poses in a crown take the partner's place from the two drawn bodies (`Anim.seated`), not from the simulated ground points. New placement code for animals off the ground goes through `ownSeat` and `seatHost`, not into `placeGrounded` directly.
> - Resting in a crown (stage W9): the `perch` clip has five postures by role (`perch.ts` `PERCH`; role 0 is the plain seat and the neutral pose of an animal paused on its way), one per individual and bout (`perchPosture`: pure; it always changes with the bout; lying needs a tree of 10 m, prone 18 m). The layer learns that an animal lies from the clip and role it was last drawn in (`Anim.lies`). An overlay that moves the hands of a seated animal must leave the holding hand of roles 0 to 2 where it is (left when the individual's seed is 0.5 or less, else right) and must not run on roles 3 and 4.
> - Crown clips (stage W9): `forage`, `nurse`, `shelter` and `alarm` have crown variants chosen by `PoseCtx.inTree`, not by role. Crown feeding takes the hand to the mouth by joint angles with the IK weight eased out (`poses.ts` `MOUTH_ARM`, held by `tests/render-perch.test.ts`): do not give that leg an IK target, the elbow pole lifts the elbow over the head. `groom` has roles 3 and 4 for a partner with an infant on its body (`groomerRole`).
> - Nests (stage W9): the simulation publishes `Chimp.nest` when the nest is finished. While the drawn body builds, the nest's place is the builder's own position in the tree its act names; `creatures.ts` seats it there and `nests.ts` `build` grows the nest with the building clip. The record is found again under the same key when `Chimp.nest` appears.

Verifying a change, in the harness lines:

> - crowns: `/src/render/creatures/harness.html?mode=single&action=<act>&up=<metres>` puts the tile's animals in a tree and follows the first (`&posture=0..4` forces the resting posture, `&third=1` adds a second groomer, `&view=x,y,z` places the camera); `node hshot.mjs`, `cap.mjs`, `nest.mjs`, `starts.mjs` and `tables.py` in `/Volumes/Drive/chimpbench/shots/watch-2026-10-11/w9b-tree-pairs/` film crowns in the harness and the app (server on 5188). In `review/` beside them: `lib.mjs` (opens the app with the model policy off from the first frame: a paused page still pumps decisions, and a world stepped by the public tick with the policy on freezes the roster's animals), `crowns.mjs` and `crowns.py` (a census with the camera at every occupied crown: a tree outside the forest window has no limbs), `film.mjs`, `jump.mjs` (a body as the camera arrives), `glide.mjs` (seats at a playback speed), `beatwatch.mjs` (decision beats in crowns), `hprobe.mjs` (clip changes in the harness).

Open issues, the line "Viewer, left open by stages W1 to W5": strike "grooming pairs in trees are drawn on separate branches, 0.6 to 2.3 m apart;" and add at its end: "a pair in a crown sits on a prop bough and slides to it (stage W9)".

### Lines for `docs/visual-plan.md`

The action table, the rows for resting, feeding, grooming and nesting:

> In a crown (stage W9): resting is one of five postures per individual and bout; feeding holds a cluster in one hand and picks from it with the other; animals that groom, play, mate, embrace, beg or share sit together on one level bough; the nest grows under its builder.

Section 5, "Remove or simplify" (the stick perch prop): the prop now also carries pairs and lying animals; it stays until the environment can seat two on a limb.

### Parameter rows for `docs/simulation.md` section 17

None. The stage adds no simulation parameter and no contract field.

### Merge notes

- **Likely conflicts with the state-on-body and idle stage** (it was working in the same files at the same time):
  - `src/render/creatures/poses.ts`: this branch adds one import, a block after `GROOM_LAP` (`GROOM_FRONT`, `GROOM_HIGH`, `groomerRole`), three entries at the end of `GROOM_SITES` and one line in `groomSite`, a new section "In a crown (stage W9)" before "Locomotion", and inside the clips: the first line of `forage`, the first line of `groom`, the last line of `nurse` and of `shelter`, a block at the top of `alarm`, and `perch`. If the other stage's idle overlay runs on `perch`, see the AGENTS line above.
  - `src/render/creatures.ts`: new fields on `Anim` and in `addAnim`; `pairingFor` (roles, two fields of `Pairing`); a new block after `treeFor`; the `high` branch and the nest lines of `chooseClip`; the partner's origin and the blend time in `evaluatePose`; the elevated half of `placeGrounded` (restructured: own seat, shared seat and nest place, then the easing, then stage W6's trunk blend and facing); `emitProps`; four places in `update`. Take this branch's `placeGrounded` whole and re-apply the other side's lines to it.
  - `src/render/creatures/harness.ts`: the header comment, one line in the grooming set-up, a block in `single` mode, one line for `&posture`, the default of `followId`.
  - `docs/research.md`: a new section at the end and one "Used" clause at the Hunt 1992 line.
- **`src/render/creatures/nests.ts`** gains `build` and a `grow` field; `update` is otherwise as it was.
- **Tests**: new `tests/render-perch.test.ts` (10). No existing test was changed.
- **Second reader's commits** (after d5ea610, all in `creatures.ts`, `creatures/nests.ts`, `creatures/perch.ts`, the test and this document): section 7a lists them. `Anim` gains `ownSrc` and `ownCut`.
- **Run after the merge:** `pnpm test`, `pnpm build`, the frame-time comparison in a close view on a crown with a grooming pair and at dusk, `node scripts/groom-shots.mjs --out <dir> --url <server> cases tiles` (passed here: 11 of 11; 30 of 30 tiles identical to the base), and one look at a model-driven animal resting in a crown.
- **An incident to know about.** While preparing a second base measurement I extracted commit e883e6e into a folder named `base` in the session's shared scratchpad, which another agent had created about a minute earlier (its `node_modules` link was already there). Every file I wrote there is the content of e883e6e. I did not serve from it, change it further or delete anything; my own export is `w9b-base-e883e6e` beside it. If that other folder was meant to hold a different commit, it no longer does.

### Decisions that are the user's


1. **The bough.** A pair in a crown sits on a level prop bough. It reads from the watching camera, and it is not part of the tree. Keep it until the environment can seat two on a limb, or hold pairs in crowns back until then? (Second reader: under a seated pair it carries; under a lying animal it reads as a floating dark log, `review/fix/beat-lying-fwambo-b-f6.png`. The two lying postures could be held back by themselves: `perchPosture` with `limb` 0.)
2. **A bystander is moved.** An animal whose place is inside another's body is seated beside it. Before, two animals could be drawn in one spot. Keep?
3. **The five postures and their shares** (26, 22, 22, 18, 12%), a posture lasting 50 to 120 s, lying only in trees of 10 m or more and prone only from 18 m. "Leaning back against the trunk" was asked for and is not built (section 7).
4. **Crown feeding**: one to three picks and then 3 to 10 s of chewing with still hands. Shorter chewing shows more action; the review asked for 4 to 8 s.
5. **On the ground, a receiver with an infant on its back now turns to face its groomer** (the hands used to comb through the infant). It changes a ground picture; it is one line to take out (`pairingFor`).
6. **The nest starts at 0.3 of its size** when building begins and the builder turns four times in four minutes.
7. **The largest offset (second reader).** A pair member may now be drawn up to 9 m from its simulated position (6 m as built): an own limb already is beyond 6 m one time in ten, and the 6 m rule left about one groomer in twenty reaching into the air. Keep 9 m, or go back to 6 m and accept those?
