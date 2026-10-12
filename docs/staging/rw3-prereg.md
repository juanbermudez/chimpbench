# RW3: a small adapter taught wild Taï first-grooming-partner choices: registered and built, not trained (registration)

Stage RW3 of Track R. Branch `rw3-tai-adapter`, from track-e d6a8e0e. Registered Monday 12 October 2026, 04:47 EDT (by `date`), **before any code of this stage was written or run**. It follows stage RW2 (`docs/staging/rw2-prereg.md`): the same derived records, the same packet, the same scorer, the same seal.

## The plain page

- **What this is.** A small set of added weights (an adapter) on top of the frozen model, taught one narrow thing: when a wild Taï chimpanzee starts a grooming session, which of the adults in sight it grooms first. It is taught from 557 wild choices of 11 animals.
- **Why now.** Stage RW2 found that on 329 later or unseen Taï choices no kernel reaches the simple rule "the adult it most often groomed first before" (0.353; chance 0.244; the untuned model 0.301; the Ngogo-taught adapter 0.319; the rules-taught adapters 0.26 to 0.29). RW2's own rule says a separate small Taï adapter is then the next step.
- **What tonight does.** It fixes every setting, builds the tools and proves them without a model. **Nothing is trained tonight**: the processor belongs to stage R11's retraining.
- **What will be read, later.** Whether the adapter beats the untuned model, whether it reaches the simple rule, and whether teaching on Taï choices beats teaching on Ngogo choices, on the 329 development records, with two training seeds.
- **What it cannot show.** Gains under about 0.04 to 0.06 when paired, and under 0.08 to 0.10 unpaired. The untuned model sits 0.05 under the simple rule, so an adapter that exactly reaches the rule may not be told apart from the untuned model.
- **What it is never.** The main label source; a kernel of the simulation's loop (that needs a further registered stage); evidence of when or whether chimpanzees groom.

## 0. Status and order of work

Timestamps from `date`, 12 October 2026, EDT.

| step | when | what |
| --- | --- | --- |
| This registration, committed | 04:47 | nothing of this stage exists yet; no record was read by this stage |
| Code and tests (invented fixtures only) | after it | sections 10 and 12 |
| The dry step on the real train part (no model) | after the tests | section 12, aggregates only |

Known at registration: every number of `rw2-prereg.md` sections 8.1 and 8.4 (the simple rules on train and development; the untuned model and four existing adapters on development). Not known to anyone: any outcome of the sealed part; how any Taï-taught adapter scores anywhere.

**This stage loads no model, trains nothing, opens no sealed part and sends nothing off this computer.** The model steps (section 13) are the integrator's, after stage R11's chain has ended.

## 1. What is taught, and from what

| | fixed now |
| --- | --- |
| Label source, by name | `field choices, Tai first grooming partner` (the name `data/rw-compromised.json` keys on) |
| Record | Taï grooming, Mielke et al. 2018, Dryad t8c88vh, as stage RW2 derives it (`scripts/rw2/rw2_ingest.py`, packet `rw2-v1`) |
| Part | **the train part only**: the 557 eligible records of 11 animals (499 by male choosers, 58 by female; 115 with more than 8 options). The 42 train events left out by RW2's same-day rule stay out |
| View | **own**: what the animal itself knows (`rw2-prereg.md` §2.4). The bystander-bond lines (the "third" view) are never shown |
| Label | **hard**: the one adult actually groomed first. Every eligible record has exactly one |
| Development part (329 records, 13 animals) | **for reading only.** Never fitted on, never used to choose a checkpoint, a setting or a seed. The assembler reads its record keys alone, for the leak check |
| Sealed part (420 events) | **stays sealed.** No script of this stage takes a sealed part, passes `--open-sealed` or reads an opened sealed file; the wrapper refuses to run beside one |
| Adapters | `rw3-tai-groom-s7` and `rw3-tai-groom-s11` (two training seeds, 7 and 11), under `artifacts/decide-ft/rw3/adapters/` (git-ignored) |
| Result name | "Taï-taught adapter on the Taï record's own menu". Beside it: "untuned model", "Ngogo-taught adapter" (`r4-field-groom`), "rules-taught adapters" |

## 2. The training file

One row per record per epoch, in the format `training/decide_ft` reads (`{"id", "packet", "pick", "epoch"}`).

- **The words are the scorer's.** A row's packet is `buildRw2Question(request)` of `src/rw2/packet.ts`, on the request `buildRw2Packet(record, { seed 20261011, shuffle k, view own })` builds: the same two functions, with the same seed, through which `scripts/rw2-score.ts` sends a record to the model. Nothing is added, reworded or removed. A test holds a training packet equal, byte for byte, to the packet the scoring path sends for the same record and shuffle.
- **Four epochs, four option orders.** Epoch k (0 to 3) shows every record once, under shuffle k. A record's invented names are the same in each order (the packet deals names per record, not per shuffle).
- **Menus wider than 8** (115 of 557) are cut, as in stage R4, to a seeded sub-menu of 8 that contains the adult actually groomed, built by the fan-out wrapper's own `narrowRw2Request`, so a training sub-menu has the form of a fan-out sub-request. Each epoch deals a new sub-menu. A consequence, declared: the adapter is never trained on a whole menu of 9 to 13 options, which is what the plain score sends for 59 of the 329 development records.
- **A row over the registered token budget** (1,200 on the server's estimate) is dropped and counted. None is expected (RW2: the largest train packet is 450).
- **The trainer's own shuffle is kept.** As in R4, in each epoch a row is shown either as written or with its option labels dealt to other aliases (a seeded coin). In the second form the order of the labels differs from the order of the `nearby` lines, which the scorer never sends. It is R4's recipe and is kept so that nothing is chosen here.

## 3. The recipe: stage R4's field adapter, copied; nothing searched

Copied from `r4-field-groom` (`docs/staging/r4-prereg.md` §2 b and §4; `training/decide_ft/train_r4.py`), the adapter taught wild Ngogo grooming choices. No setting was tried, compared or tuned for this stage, and none will be.

| setting | value |
| --- | --- |
| Base model | `fastino/GLiNER2.5-Decide`, revision `7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6`, frozen |
| Added weights | low-rank adapters (LoRA): rank 16, alpha 32, dropout 0.05, no bias terms; on the classifier and the top 8 of the 24 encoder layers |
| Precision | bf16 autocast on the Apple GPU backend (MPS); gradient checkpointing off |
| Batch | 2 examples, 4 accumulation steps (effective 8) |
| Optimiser | AdamW, learning rate 2e-4, weight decay 0, the library's other defaults |
| Schedule | linear warm-up over the first 10% of optimiser steps, then linear decay to 0; gradient clipped at norm 1.0 |
| Epochs | 4; epoch k shows the 557 rows of shuffle k (2,228 rows in all; 70 optimiser steps an epoch, 280 in all, 28 of warm-up) |
| Loss | softmax cross-entropy over the offered options; weight 1 per example; no class weight, prior, temperature or resampling |
| Order | rows shuffled within an epoch by the training seed; the seeded coin of section 2 |
| Memory settings | `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.6`, `PYTORCH_MPS_LOW_WATERMARK_RATIO=0.4`; a batch that hits the allocation cap is shown one example at a time (the same gradient) |
| Training seeds | **7** (R4's) and **11** (the second seed of stages R9 and R11). A seed sets the adapter's starting weights, dropout, the coin and the row order. The training file is the same for both |

**The one departure from R4, forced by section 1.** R4 kept the epoch with the lowest loss on validation animals (5 of 34 Ngogo males, by a hash). Here **no checkpoint is chosen: the adapter saved is the one after the last of the 4 epochs.** Reasons, fixed before any run: the development part may not choose; the train part has 11 animals, one of which holds 35% of its records, so a validation set by animal would be one or two animals and would cost a tenth to a third of a small training set; a validation set by record would share animals and days with the training rows. The departure removes a choice; it adds none. Its risk is declared: four epochs with no stop may fit the 557 records too closely. The trainer reports the mean training loss of each epoch as a description of fit, never as a score.

## 4. What is scored

By `scripts/rw2-score.ts`, unchanged, on the **development part** of the Taï record: 329 records of 13 animals, own view, shuffle 0, base seed 20261011.

- **Score:** top-1 of the answered option, pooled over records, with the score of each animal weighted equally beside it.
- **Two ways of asking:** plain (one call a record, the whole menu) and fanned out (`+fan2`: a menu wider than 8 as sub-menus of at most 8). **Plain is the primary reading**, as in `rw2-prereg.md` §8.4. The fanned-out reading stands beside it.
- **Against:** chance (0.244); the bar, the simple rule `stack-own` (0.353; "past partner, then the partner of earlier today, then highest rank"); the untuned model (0.301 plain, 0.295 fanned out); the Ngogo-taught adapter `r4-field-groom` (0.319, 0.328). The untuned model and the Ngogo-taught adapter are scored again in the same checkout, so that every comparison is on the same records and packets; their re-scores are printed beside RW2's figures.
- **Comparisons are paired** on the same records (`pairedDifference`, stage RW), with a 95% interval from a bootstrap over animals (2,000 draws, seed 20261011). **A difference is called one only if its interval excludes 0.**
- **Cuts, described and not claimed:** menus of 8 or fewer against wider (59 records); the three strata (unseen animals before 2015, 160 records of 4 animals; seen animals in January and February 2015, 131; unseen animals in January and February 2015, 38); male against female choosers (37 records of 5 females).
- **Optional, a description of fit only:** the same scores on the train part.

## 5. The statements to be read, and what each outcome means

Each statement is read for each training seed on the primary (plain) reading. **It counts as met only if both seeds meet it.** Met on one seed alone is written "seed-dependent: not shown". Met with the fan-out only is written "with the fan-out only", never "met".

**S0. The run is valid** (read first; if it fails, nothing else is read and the fault is repaired without looking further):
- each adapter's manifest carries the label source of section 1, the hyperparameters of section 3 and its training seed;
- no development record is refused;
- each adapter's answers differ from the untuned model's on at least one record (the scoring worker answers with the untuned model when it cannot find an adapter);
- chance and the bar, recomputed in the run, are 0.244 and 0.353.

**S1. The Taï choices taught the model something.** The Taï-taught adapter minus the untuned model, paired, is above 0.
- Met: teaching on 557 wild Taï choices raises top-1 on later and unseen Taï choices over the untuned model.
- Interval includes 0: not shown. With this record's power (section 6) that is not "no effect".
- Below 0 on both seeds: the teaching made the model worse on this choice.

**S2. It reaches the simple rule.** The Taï-taught adapter minus the bar, paired.
- Above 0 on both seeds: the adapter beats "the adult it most often groomed first before": it has learned more than a three-line rule knows.
- Includes 0: level with the bar within the interval. Nothing is shown beyond the rule, and the rule is the cheaper kernel.
- Below 0 on both seeds: below the simple rule; the rule remains the better kernel for this choice.

**S3. Teaching on the site's own choices against teaching on another site's.** The Taï-taught adapter minus the Ngogo-taught adapter, paired.
- Above 0: Taï labels teach more about Taï choices than Ngogo labels do.
- Includes 0: no difference is shown between a Taï-taught and a Ngogo-taught adapter; whatever either learned is not shown to be particular to the site.
- Below 0: worse than the adapter taught another site's choices.

**S4. The two seeds, no threshold.** The two seeds' scores, the share of records on which they answer the same option, and their paired difference. If that difference excludes 0, every statement above is seed-dependent.

**S5. The fan-out, beside.** S1 to S3 read again with `+fan2`, reported in the same table.

**S6. Cuts, no claim.** The cuts of section 4, as descriptions.

**What the whole says, fixed now.**

| outcome | what is written |
| --- | --- |
| S1 met and S2 above 0 | "a small Taï adapter beats the simple rule on development"; the sealed part would then be worth one registered opening, which needs the user's go |
| S1 met and S2 includes 0 | "the adapter learned about what the simple rule knows; no more is shown" |
| S1 not met | "557 choices did not teach the model anything this record can show; the Taï record stays a test, not a teacher, at this size" |
| S2 below 0 | "below the simple rule", whatever S1 says |

In no case does a result of this stage change the main label source, enter the simulation's loop, or support a sentence about when or whether chimpanzees groom.

## 6. Power, stated before any score

- `rw2-prereg.md` §2.6 and §10.1: with animals as the unit, **no unpaired difference under about 0.08 to 0.10 can be shown** on this record.
- Paired on the same records the intervals are tighter: on 11 October the paired differences against the bar had half-widths of 0.03 to 0.06 (`rw2-prereg.md` §8.4). So **a paired gain under about 0.04 to 0.06 cannot be shown either.**
- The untuned model sits 0.052 under the bar and the Ngogo-taught adapter 0.033 under it. An adapter that exactly reaches the bar may therefore not be told apart from the untuned model, and one that beats the bar must do so by about 0.04 or more to show it. The likeliest outcome by far is intervals that include 0.
- Thirteen development animals; female choice rests on 37 records of 5 females; wide menus on 59 records. No cut is claimed.
- The development part is read, not fitted, and nothing is selected on it, so with one run per seed its score is an honest estimate. **That holds only as long as nothing in the recipe is changed after a development score of a Taï-taught adapter has been read** (section 11).

## 7. Leaks and the seal

Checked by the assembler on every build, and written into the data manifest; any failure stops the build.

1. **Only the registered train records.** Every row comes from a record whose part is `train` and which is eligible; the hash of the sorted record keys equals the train hash of the committed `data/rw2-manifest.json`, and the count is its 557. Each record gives one row per epoch.
2. **No development key.** No row's record key is among the development part's keys (the only thing this stage's assembler reads of that part), and the development keys on hand hash to the committed manifest's development hash.
3. **No sealed key.** No sealed record exists unless the seal was opened. The assembler and the wrapper refuse to run when an opened sealed file lies beside the records, without reading it.
4. **The label is not in the words.** Rebuilding a packet with the label moved to another option gives the same packet. No packet holds a record key or a chooser's label. The share of rows whose answer is the first option is reported beside its expectation.
5. **The chooser's own future is never in a packet.** The derived records carry no date, so this cannot be checked from them. It is checked where the dates are, through the reader's own functions and in memory, with nothing written: (a) every development outcome is moved to another option and the train records must not change; (b) for each chooser, the outcomes of its later events (from a cut at a quarter, a half and three quarters of its events in time) are moved and its records before the cut must not change, while records after the cut do change (so the test can see a dependence). Counts only are printed. It needs `data/raw` linked; without it the wrapper says the check was not run. By the split rule a train animal's development events all lie after its train events, so (a) also shows that no development outcome reaches a training packet as history.
6. **Declared, not prevented** (`rw2-prereg.md` §2.2, unchanged): development and held-out animals are options in train records; dyads are shared across parts; the bond order comes from the authors' running index, which can echo grooming recorded in another part.

## 8. Compromised targets

As `rw2-prereg.md` §2.7 proposes, and until the user rules otherwise:

- **T-HUN-9 and T-END-12 are treated as compromised** for any kernel that includes one of these adapters, from the moment an adapter exists. The adapters' manifests name the label source exactly as `data/rw-compromised.json` keys it, and a test holds that `compromisedFor` (`src/rw/manifest.ts`) then returns those two targets.
- **Flagged only:** T-BRD-1, T-END-1, T-END-2, T-SOC-9.
- No target cites the paper or shares its records. `data/targets.json` is frozen and is not edited.
- This stage reads no scorecard row with these adapters (they never enter a simulation here). The marks bind any later stage that would.

## 9. Standing limits

- **A named, separate thing.** These adapters are never mixed with the rules' labels or the Ngogo labels without saying so, and never the main label source.
- **Never in the simulation's loop without a further registered stage.** The simulation offers no menu of this form today (the first adult to groom, with the order of rank and of a bond index among those in sight). A stage that used the adapter there would have to register how simulation state becomes this packet and what is read.
- **What partner choice at one site can teach:** given that a grooming session starts, which adult in sight is groomed first, from sex, the order of rank, the order of a bond index, a recent quarrel, a female's state and the animal's own earlier first partners; for both sexes, though female choice rests on 58 train records.
- **What it cannot teach:** whether or when to groom, how long, or any other act; anything about immatures; a refusal (a zero means "in the party and not groomed first", not "declined"); reach rather than sight. Attributes cannot be separated from identity (28 partners in all). The covariates are the authors' modelled quantities, and the bond index already contains past grooming. Western subspecies, two communities, 2013 to 2015, 11 animals in the train part: carrying it to a Kibale-like simulation is an assumption, not a finding.
- **Field numbers stay targets.** Nothing here tunes an input to a behavioural rate. No simulation parameter, switch or default changes; no golden hash moves.

## 10. What is built, and its acceptance tests (invented fixtures only; never a real row)

| file | what |
| --- | --- |
| `scripts/rw3-assemble.ts` | the train part's derived records into the training file and its data manifest; the leak checks 1 to 4 of section 7; counts, token estimates and time estimates (aggregates only) |
| `scripts/rw3/rw3_history_check.py` | leak check 5: standard library, run as `/usr/bin/python3 -I`, through the reader's own loader, in memory, counts only |
| `training/decide_ft/train_rw3.py` | `train_r4.py` with the departure of section 3 (no development file, the last epoch saved) and a flag that stops before the model is loaded; everything before the load runs on the standard library |
| `scripts/rw3-report.ts` | the statements of section 5 from the scorer's per-record files (aggregates only) |
| `scripts/rw3-run.sh` | the steps `check`, `dry`, `train <seed>`, `eval <seed>`, `report`: refuses a sealed part, refuses while another model process is running, writes a status line per step, holds the adapters under `artifacts/` |
| `tests/rw3.test.ts` | the tests below |

1. A training packet equals the packet the scoring path sends for the same record and shuffle, byte for byte; a wide menu's training packet is a valid sub-request of 8 that contains the label.
2. The file holds one row per record per epoch, labels are one-hot on the adult actually groomed, and a build is deterministic.
3. Each leak check fails when its leak is planted: a development key among the rows, a record of another part, a key set that does not hash to the manifest, an opened sealed file on hand, a label written into the words.
4. The history check passes on a fixture and fails when a later outcome is made to reach an earlier record.
5. The trainer's pre-load step refuses a row that is not of the train part, a row without a pick among its options and a path that names the development or sealed part; it reports the registered step counts; it stops before any import of the model's code.
6. The wrapper refuses `sealed` in any argument, an unknown seed and a model step beside another model process, and writes its status lines.
7. The report reads the statements as registered on made-up scores: met only on both seeds; "with the fan-out only" is not "met"; an adapter identical to the untuned model fails S0.
8. The label source marks T-HUN-9 and T-END-12 and nothing else; the manifest passes `manifestError`.

## 11. Iterations and stop rules

At most 3 iterations, each logged in this document before it runs.

- An iteration may repair a failure to run (a crash, memory). If a training is killed or its footprint passes 11 GB, R4's order applies, one change at a time: the top 4 layers instead of 8; then batch 1 with 8 accumulation steps. Both seeds are then trained with the changed setting, and the change is named with every result.
- **No iteration may follow a development score.** Once a development score of a Taï-taught adapter has been read, the recipe is closed. A changed recipe after that is a new stage, and its development score is no longer an honest estimate.
- A training cut short (weights without `manifest.json`) is deleted and run again from the start; it is never scored.

## 12. Results of the dry step

To be written after the build (aggregates only).

## 13. For the integrator

To be written after the build: the command lines, the paragraph for `IMPLEMENTATION_PLAN.md`, the lines for `AGENTS.md`.

## Privacy

Nothing derived from a raw row goes into git except aggregate counts, rates and hashes. The training file, the derived records, the per-record scores and the adapters stay under `artifacts/` (git-ignored). A training row holds invented names, a hashed record key and no animal code, date, clock time or value of the source. The raw file is read only through `scripts/rw2/rw2_ingest.py` and its own functions, as `/usr/bin/python3 -I`. Tests use invented fixtures only.
