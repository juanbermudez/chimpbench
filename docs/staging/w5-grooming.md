# Stage W5: the grooming choreography, merged on its own

Branch `w5-grooming`, cut from `track-e` at `dea2643`. Render only: nothing under `src/sim` is touched, no parameter is added, the world is never written. Written 10 October 2026, 23:45 EDT; reviewed by a second agent on 11 October 2026, 00:32 EDT, which fixed four defects and added the section "Second pair of eyes" below. The harness pictures and readouts under `after/` (poses, wrists, tiles, cases, posture change) were taken again from the reviewed code; the app pictures there are the builder's, taken before the review's fixes, and the review's own are under `review/`.

On 10 October the user approved merging "the grooming clip ahead of the held canopy work". This stage brings the one commit that holds it (`gfx-next` 370b7fe), closes the two risks its own document named, fixes two faults found while looking at it, and leaves the closed canopy, the canopy shading and the relief on `gfx-next`.

Everything in this stage is a **stylization**. `docs/research.md` holds no source for grooming choreography; only the lip-smack is sourced (Parr et al. 2007). The code and `docs/research.md` (§14, "Stylization added by stage W5") say so.

## What a viewer sees now

- **The groomer works.** Its hands move to a new place on the partner every 9 seconds (lower back, mid back, shoulders, nape, flanks). One hand holds the hair apart, the other combs in short strokes, and the head comes down toward the hands. On `track-e` the hands stayed on one spot.
- **The receiver is not always sitting.** For each bout of 40 to 70 seconds it sits hunched (40% of bouts on the ground), lies on its belly (22%), lies on its side (18%) or sits with one arm folded onto its head (20%). Off the ground, or with an infant on its body, it only sits (40%) or folds the arm onto its head (60%). On the scanned day 70% of one-way receiver time was off the ground; by these shares the folded arm is then drawn for about half of that time (0.70 × 60% + 0.30 × 20% = 48%), more than sitting (40%).
- **A mother grooming the infant she holds** now holds it on her belly and works on its back with her head down. Before, her arms folded up in a tangle (the review's "both arms straight up, no visible partner").
- **A grooming chain** (A grooms B while B grooms C) now shows B grooming. Before, B was drawn as a passive receiver and nobody's hands were on C (read from the code on `track-e`; its harness has no option to picture it).

Picks taken to the mouth stay switched off, as on `gfx-next` (`GROOM_PICK_TO_MOUTH = false` in `src/render/creatures/poses.ts`): they need the per-clip elbow pole the user deferred.

## What was brought and what was left

| From 370b7fe | Decision |
| --- | --- |
| `src/render/creatures/poses.ts`, `src/render/creatures.ts`, `src/render/creatures/harness.ts` | Brought whole (cherry-pick `0fc3361`, applied cleanly). |
| `docs/research.md` (+5 lines) | Only the grooming line was kept, reworded. The two lines on the closed canopy and the canopy shading were left out: that work is held. |
| `scripts/gfx-shots.mjs` (1 line) | Dropped. The script is not on `track-e`, and its other sets belong to the held canopy prototypes. `scripts/groom-shots.mjs` (new) covers grooming. |

Nothing else came from `gfx-next`.

## The two named risks

Both are closed in `pairingFor` (`src/render/creatures.ts`) and in the pure rule `groomeePosture` (`poses.ts`), which the harness override also passes through.

1. **A mother cradling a dead infant** stays in the plain seated posture whatever is picked or forced. More widely, a receiver with any infant on its body (alive or dead) never lies down; with a living one it may still raise an arm. Lying postures also need the *drawn* body on the ground, not only the simulated one (bodies are drawn two ticks behind).
2. **A receiver that is itself grooming a third animal** gets no receiver clip and no posture. It keeps its own grooming clip and place, and the first groomer works on it where it sits.

Shown in the harness with a lying posture forced (`&groomee=2`): `after/case-risk-dead-infant-forced-prone.png` (she stays seated, cradling), `after/case-risk-held-infant-forced-prone.png` (arm raised, not lying), `after/case-risk-chain-forced-prone.png` (the middle animal grooms).

## Two faults found and fixed

- **Mother and infant** (reproduced first: `before/app-pair-carried-frame0.png`, Kiboro and Zamiko at 14:43, the pair of the review's `m2-groom-00.png`). The groomer's hands were sent to a partner drawn on her own body. Now an animal grooming the infant it holds takes the role `GROOM_LAP`: the infant is held on the belly while it is groomed (it used to ride on her back from 0.45 years), nobody is laid out, one hand supports it and the other combs strokes of 0.045 body lengths over its back. Small: about 25 lines.
- **The prone receiver** as picked had its elbows and knees standing in the air when seen from the side (the prototype's own `proto2/pose-groom-prone-side-0.png` shows it). With the trunk level the rig's limb poles point up, which is the same fault that keeps picks to the mouth off. The pose now sets the arm and leg joints directly, with angles solved against the rig's own forward kinematics. `after/pose-groom-prone-side.png`.

Also: a receiver changing posture now blends over the renderer's lying-down time (0.55 s base, capped at 0.7 s) instead of the 0.3 s default.

## Proof

Pictures and readouts are in `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w5-grooming/` (`before/` is `track-e`, `after/` is this branch; 36 pictures, and 9 from the review under `review/`). Every number below is printed by `tables.mjs` there from the saved JSON. Harness pictures are taken on a frozen page clock, so before and after land on the same animation times.

### Wrist travel over 14 s, creature harness

Read from the page as the review's fact-check did (`mode=single&action=groom`, wrist bones every 50 ms). Range in cm: sideways / up-down / front-back. The `track-e` row reproduces the fact-check exactly.

| Build and receiver posture | Groomer left wrist | Groomer right wrist | Right wrist path | Receiver wrists |
| --- | --- | --- | --- | --- |
| track-e, seated (the only posture) | 3.3 / 0.0 / 9.9 | 1.1 / 3.0 / 3.4 | 31 | 0.0 |
| branch, seated | 17.9 / 30.8 / 29.3 | 18.7 / 39.0 / 27.1 | 511 | 0.0 |
| branch, prone | 7.3 / 7.1 / 23.4 | 4.9 / 8.6 / 25.3 | 376 | 0.4 at most |
| branch, on its side | 6.2 / 8.1 / 42.2 | 3.7 / 9.9 / 41.2 | 373 | 0.0 |
| branch, arm raised | 17.8 / 30.9 / 30.0 | 18.7 / 39.0 / 27.8 | 511 | 0.0 |

The receiver still does not move within a posture; it changes posture between bouts (in the harness timeline at 7.6 s, 58.2 s and 108.8 s). `after/wrist.json`, `before/wrist.json`.

Sheets, six frames 3.7 s apart: `before/pose-groom-sit-side.png` and `-above.png` against `after/pose-groom-{sit,prone,side,present}-{side,above}.png`. `track-e` ignores `&groomee`, so its other postures do not exist.

### Grooming pairs in the app

Field map, seed 48, day 1, Real time, camera 4 m from the groomer and square to the pair. `before/scan.json` lists the pairs that groom without a break for 16 ticks or more; each is then filmed from a fresh page. The world's hash before filming is the same before and after for every pair, and so is the hash after a 2,400-tick scan: the renderer does not write the world.

| Pair | Hour | Drawn before | Drawn after | Groomer wrists before (L; R), cm | after |
| --- | --- | --- | --- | --- | --- |
| a: Oyaku grooms Sanaki (adults) | 10:27 | groomer + seated receiver | groomer + prone receiver | 8.7 / 1.2 / 3.1; 2.5 / 2.5 / 2.5 | 14.7 / 8.9 / 5.8; 19.9 / 9.9 / 10.6 |
| b: Semwai grooms Ilobe (adults) | 10:47 | groomer + seated receiver | groomer + seated receiver | 8.7 / 0.6 / 2.6; 3.9 / 2.9 / 1.0 | 21.1 / 18.8 / 16.9; 18.9 / 25.0 / 13.2 |
| infant: Jiwero grooms Odemi (1.2 y, sitting in front of her) | 12:02 | groomer + seated receiver | the same clips | 4.6 / 0.1 / 8.6; 2.1 / 2.8 / 3.0 | 11.3 / 29.4 / 12.3; 14.3 / 32.4 / 14.6 |
| carried: Kiboro grooms Zamiko (1.8 y, nursing on her) | 14:43 | groomer clip chasing a carried infant | lap variant | 9.0 / 0.6 / 3.5; 3.0 / 2.9 / 1.6 | 1.7 / 0.7 / 1.2; 6.7 / 14.7 / 6.8 |

Sheets of six frames 3 s apart and the first frame at full size: `before/app-pair-*.png`, `after/app-pair-*.png`. The app runs in real time, so these wrist ranges move by a few centimetres from run to run.

### How much of grooming each case is

One count per groomer per tick, day 1 of seed 48 on the field map, 08:30 to 18:30 (`after/scan.json`). One day of one seed: a description, not a rate to tune to.

| Situation | Groomer-ticks | Share |
| --- | --- | --- |
| All groomers with a chimpanzee target | 11,792 | |
| Mutual pair (both count) | 6,872 | 58.3% |
| One-way pair | 4,779 | 40.5% |
| One of the two above 0.5 m (in a tree) | 8,867 | 75.2% |
| A mother grooming her own infant under 4 | 5,312 | 45.0% |
| of which the infant is drawn on her (the lap variant) | 831 | 7.0% |
| Receiver has an infant under 1.2 y on it | 573 | 4.9% |
| Receiver is itself grooming a third animal | 426 | 3.6% |
| Receiver carries a dead infant | 0 | 0.0% |

So on that day three quarters of grooming was in trees, where no receiver lies down, and the lying postures apply to a small part of what is drawn.

### Every other action is unchanged

- **Clip functions.** All 46 clips were run on 4,000 random contexts each, on `track-e` and on the branch. 44 write bit-identical poses. Only `groom` and `groomee` differ, and `groomee` differs only in the three new postures (the seated one is bit-identical). `clips-compare.json`.
- **Tiles.** The small map's harness tiles (`mode=tiles`, 30 actions), with the effects layer's `Math.random` on a fixed sequence: 28 of 30 tiles are pixel-identical. `groom` changed. `hunt` differs in 209 pixels in a 29 by 16 pixel box at its top edge, where the grooming pair stands in the background of that tile's camera. No other animal changed clip or role. `tiles-diff.json`, `before/tiles.png`, `after/tiles.png`.
- **Tests.** `tests/render-*.test.ts`: 117 of 117 pass in 17 files. Six are new, in `tests/render-groom.test.ts`: hand travel and picks to the mouth off; the lap variant keeps the arms below the shoulders; every receiver posture is a finite pose and prone limbs carry no IK; the posture rule and its two exclusions; the raised arm is folded with the hand at the head at seven ages; on its side no knee is below the ground. `tsc --noEmit` passes. The two named risks are decided in `pairingFor`, which no unit test can reach (the creature layer needs a GPU): `scripts/groom-shots.mjs cases` checks them in the harness and exits with status 1 on a mismatch (11 of 11 cases pass).

## Per-frame work

Nothing is added to the GPU: no render pass, no texel, no material, no mesh. On the CPU, per frame:

- **Per groomer whose pose is evaluated** (every frame up close, 12 to 30 times a second when small, 4 when off screen): two table reads for the work site, one point along the partner's five spine bones, the stroke phase, two hand targets and about ten joint additions.
- **Per one-way pair:** two integer hashes and a few comparisons for the receiver's posture, and one map lookup with a distance for the chain test.
- **Per animal:** one flag reset, and one map lookup per carried infant.

It allocates nothing: the lap pairing reuses the existing pairing pool, the posture rule returns a number, and the receiver clip's per-call closure (it was on `track-e`) is now a module function.

Measured in node on this computer under shared load, 2,000,000 calls, three rounds (`clip-cost.json`):

| Clip | ns per call |
| --- | --- |
| groom on track-e | 218 to 229 |
| groom on the branch (seated or lying partner) | 297 to 323 |
| groom on the branch (lap) | 257 to 274 |
| groomee on track-e | 255 to 262 |
| groomee on the branch (any posture) | 91 to 136 |

Heap growth stayed between 0.1 and 2.1 bytes per call for every row, `track-e` included: no object per call. A groomer costs about 0.1 microseconds more per pose and a receiver at least 0.12 less. No GPU timing was run, as instructed.

## Limits, and what is not done

- **Judged from stills and frame sequences, not from video.**
- **No lie-down motion.** A receiver goes from seated to lying in about 0.7 s, the renderer's ordinary blend (`after/pose-groom-change.png`). It reads as quick.
- **Picks taken to the mouth: off.** Unchanged from `gfx-next`.
- **The face-to-hair distance was not measured.**
- **Mutual grooming** was 58% of groomer-ticks on the scanned day. It uses the prototype's three face-to-face sites; the hands now travel (the left hand's target ranges over 30 by 15 by 7 cm in 14 s against 10 by 0 by 0 on `track-e`, `clip-targets.json`). One harness sheet was looked at (`after/case-mutual.png`); the two animals' forearms cross each other, as they did before. No mutual pair was filmed in the app.
- **The lap variant is approximate.** Her hands come to the infant's back and rump, not always onto the surface. The infant's wide-armed cling is the existing carry clip. With a large infant (1.8 years) it reads less well than with a small one.
- **In trees the pair is not laid out as a pair.** Animals off the ground are placed on branches, as before this stage. Three one-way pairs filmed in crowns by the review were drawn 2.3 m, 1.4 m and 0.6 m apart (the last inside a knot of four overlapping animals). There the groomer's hands work on nothing and the receiver sits apart with a hand on its head. On the scanned day three quarters of grooming was in trees, so most grooming still does not read as two animals in contact. `review/app-tree-present.png`, `review/app-tree-b.png`.
- **A grooming chain's first groomer is placed behind the middle animal's simulated place**, while the middle animal is drawn beside the one it grooms. When those two places differ the first groomer reaches into the air (`review/left-chain-far.png`: it sits 2.4 m from the animal it grooms). This was so on `track-e` too.
- **A receiver with an infant riding on its back** is groomed through the infant: the hands travel over the back where it clings. On `track-e` the hands were there too, on one spot.
- **A posture is drawn from a hash**, not from anything the simulation knows (who solicited, where the groomer wants to work).
- `pnpm test`, `pnpm build`, `gpu-probe` and `motion-probe` were not run (the integrator's, or barred in this tranche).
- The dev server on port 5188 logged a failed load of the saves database (`sqlite3` wasm) on every app page, before and after. It does not touch rendering and was not looked into.

## Second pair of eyes (11 October 2026)

A second agent read the whole diff, re-ran the checks and tried to break the stage. Readouts and pictures are in `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w5-grooming/review/`; every number below is printed by `tables-review.mjs` there.

**Reproduced.** The groomer's wrist travel (identical to the centimetre). 44 of 46 clips bit-identical to `track-e` on a different sample of 6,000 random contexts each, with no non-finite value in any pose. 28 of 30 harness tiles pixel-identical to the `track-e` tiles, with the reviewed code. The world hash before filming pair a and pair b equals the hash recorded on `track-e`. No file under `src/sim`, `data` or `tests/fixtures` is touched.

**Four defects fixed.**

1. **Arm raised: the arm stood straight up.** The posture came from the prototype with the hand 0.4 body lengths above the head on a straight arm, while its comment said the hand rests on the head. The review of 10 October listed arms held straight up as a fault, and off the ground this is 60% of receiver bouts. The arm now folds and the hand sits at the back of the head, at an offset that grows with the head (an infant's is up to 1.75 times an adult's for its body). On flat ground the raised wrist is 98 cm up instead of 138 (head anchor 89). `review/fix-arm-raised.png`, `review/arm-raised-ages.png`, in the app `review/app-pair-b-present.png`.
2. **On its side: the body stood on one knee.** The shared `lieSide` block puts the legs under IK; with the hips rolled the knee of the leg underneath went 0.10 to 0.13 body lengths through the ground and the body was lifted onto it. The builder's camera hid it; a low camera showed the trunk, hands and feet in the air. The receiver's legs are now posed by joint angles (as the prone posture's are). `lieSide` is untouched, so rest, sleep and dead are as before. `review/fix-on-its-side.png`, in the app `review/app-pair-b-side.png`.
3. **Lying receivers ignored the slope.** They kept the seated clips' terrain alignment (0.4), so on a hillside the body stayed near level with one end in the air. They now use 0.85, as rest, sleep and dead do. `review/fix-slope.png`.
4. **A receiver that begs, shares or plays while it is groomed** never reached a posture other than seated: its own pairing rewrites its role every frame, so the picked posture was dropped and started again about three times a second (a twitch of up to 4 mm a frame). It now stays seated.

| Receiver on flat ground (1.41 m female; cm above the ground) | Lift before | after | Wrists before | after | Ankles before | after |
| --- | --- | --- | --- | --- | --- | --- |
| prone | 5.6 | 5.6 | 8, 13 | 8, 13 | 31, 28 | 31, 28 |
| on its side | 21.1 | 12.5 | 30, 28 | 21, 19 | 31, 30 | 19, 28 |
| arm raised | -0.1 | -0.1 | 138, 42 | 98, 42 | 11, 11 | 11, 11 |

| Receiver on a 20 degree slope (1.5 m male; cm above the terrain under each point) | Lift before | after | Wrists before | after | Ankles before | after |
| --- | --- | --- | --- | --- | --- | --- |
| prone | 4.4 | 4.4 | 3, 10 | 11, 17 | 54, 53 | 42, 40 |
| on its side | 28.6 | 17.7 | 38, 36 | 26, 25 | 39, 38 | 46, 34 |

| Receiver that is also an actor (240 frames, 4 s) | Clip restarts before | after | Frames in the picked posture before | after |
| --- | --- | --- | --- | --- |
| begs, prone forced | 12 | 0 | 11 | 0 |
| plays, prone forced | 12 | 0 | 11 | 0 |
| neither, prone forced | 0 | 0 | 240 | 240 |

On the slope the prone ankles are still some 10 cm higher than in the same pose on flat ground: the body follows the slope at 0.85, not fully, and the test hill is curved.

**Per-frame work added by the review.** One cube root and one power per receiver in the arm-raised posture each time its pose is evaluated; six joint writes for the posture on its side; one pass over the frame's pairings. No allocation: heap growth is 0.8 to 4.1 bytes per call for every clip, `track-e` included (`review/clip-cost-review.json`).

**Checked and found sound.** Receivers off the ground never lie down (forced prone at 5 m gives the arm posture). A dead infant keeps its mother seated whatever is forced, the arm posture included. The lap variant holds for infants of 0.3 to 1.8 years, on the ground and at 5 m. Nothing in the diff writes the world.

**Left as it is** (each is under "Limits" above): pairs in trees are not laid out as pairs; a chain's first groomer can reach into the air; the hands pass through an infant riding on the receiver's back.

## Files

- `src/render/creatures/poses.ts`: the `groom` and `groomee` clips, `GROOMEE`, `GROOM_LAP`, `groomeePosture`, `lieProne`, `headScale`.
- `src/render/creatures.ts`: `pairingFor` (posture pick, the two exclusions, the lap pairing, the chain rule), `carryMode` (a groomed infant is held on the belly), the `holds` flag, the posture-change blend time, the actor rule in the pairing loop, the terrain alignment of lying receivers in `placeGrounded`.
- `src/render/creatures/harness.ts`: `&groomee=0|2|3|4`, `&infant=<age>` (`&riding=1`, `&nursing=1`, `&mutual=1`), `&mutual=1`, `&deadinfant=1`, `&heldinfant=<age>`, `&chain=1`, `&begs=1`.
- `scripts/groom-shots.mjs`, `tests/render-groom.test.ts`, `docs/research.md` (§14).

## For the integrator

**Merge notes.** `w5-grooming` head: the commit of this document after the review's commits (`622bf07` to `034583e`). It touches `src/render/creatures.ts` and `src/render/creatures/poses.ts`, which W1 (gait choice in `evaluatePose` and `chooseClip`) and W3 (body) may also touch; the W5 edits are in `pairingFor`, `carryMode`, the pairing loop of the frame update, one line at `pctx.hasBones`, one at `startInertia` and the `align` line of `placeGrounded`. `rig.ts` is not touched: `poses.ts` imports `bodyMass` from it and repeats the head-size formula of `computeMorph` in `headScale`; if W3 changes that formula, change both. `docs/research.md` gets one paragraph after "Stylizations (not sourced)" in §14. No parameter, no golden hash, no save shape, no dependency.

**IMPLEMENTATION_PLAN.md**, replacing the W5 bullet's status:

> - **W5 (branch `w5-grooming`):** the grooming choreography of `gfx-next` (370b7fe) merged on its own. **Done (10 October 2026; `docs/staging/w5-grooming.md`).** The groomer's wrists travel 18 by 31 by 29 cm and 19 by 39 by 27 cm in 14 s against 3 by 0 by 10 and 1 by 3 by 3 before; the receiver sits, lies prone or on its side, or folds an arm onto its head. Both named risks are closed (a receiver with an infant on it never lies down and one cradling a dead infant stays seated; a receiver that is itself grooming keeps grooming), a mother grooming the infant she holds now works on it on her belly, and the lying poses rest on the ground, on slopes too. A second agent reviewed it and fixed four defects (the raised arm stood straight up, the side posture stood on one knee, lying receivers ignored the slope, a receiver that begs or plays restarted its clip). 44 of 46 clips are bit-identical to before and 28 of 30 harness tiles pixel-identical (the other two are the grooming pair). Not done: picks to the mouth (off, needs the rig's per-clip elbow pole), a lie-down motion, a review in video. Open: in trees, where three quarters of grooming happens, the two animals are still placed on branches and not as a pair (filmed 0.6 to 2.3 m apart).

**AGENTS.md**, one command line under Commands:

```sh
node scripts/groom-shots.mjs --out <dir> [--url <no-model server>] [--label before|after] [--seated-only] pose|wrist|tiles|cases|change|scan|app|tilesdiff   # grooming choreography (stage W5): creature harness on a frozen page clock (sheets per receiver posture, wrist travel over 14 s, tiles and their pixel diff, mother-and-infant and risk cases) and grooming pairs filmed in the app on the field map; `cases` exits with status 1 when an animal is not drawn with the expected clip and role
```

and in "Verifying a change", after the creature harness line:

```
   - grooming: `/src/render/creatures/harness.html?mode=single&action=groom` with `&groomee=0|2|3|4` (receiver seated, prone, on its side, arm folded onto the head), `&mutual=1`, `&infant=<age>` (`&riding=1`, `&nursing=1`), `&deadinfant=1`, `&heldinfant=<age>`, `&chain=1`, `&begs=1`
```

**AGENTS.md**, one gotcha:

> - The creature effects layer (dust, leaves) draws from `Math.random`, so two loads of the creature harness differ in the display, charge, attack and hunt tiles. For pixel comparisons freeze the page clock and seed `Math.random` (`scripts/groom-shots.mjs` does both). After editing source, Vite reloads the first page that meets the changed module: discard the first capture.

**docs/simulation.md §17:** no rows. The stage adds no simulation parameter.

**docs/research.md** is already edited on the branch (§14). No new source.

**Commands to run at the merge:** `pnpm test` and `pnpm build` (not run here). Optional, about 12 minutes with a model-free server: `node scripts/groom-shots.mjs --out <dir> --url <server> pose wrist tiles cases change scan app`.

**Decisions that are the user's:**
1. Whether the receiver's posture shares (on the ground: seated 40%, prone 22%, on its side 18%, arm folded onto the head 20%; off the ground: seated 40%, arm 60%) look right in the app. They are design choices with no source. Off the ground the arm posture is common, and there the partner is often drawn a metre or two away.
2. Whether the quick change of posture (about 0.7 s) is acceptable until a lie-down motion exists (it belongs with the held stage N3).
3. Whether the middle animal of a grooming chain should be drawn grooming (this stage) or receiving (before). The simulation says it is grooming.
4. Whether grooming pairs in trees should be laid out as pairs. It is the largest remaining gap (three quarters of grooming on the scanned day) and is not part of this stage: it needs the branch placement to seat two animals together.
