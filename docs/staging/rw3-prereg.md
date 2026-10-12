# RW3: a small adapter taught wild Taï first-grooming-partner choices: registered and built, not trained (registration)

Stage RW3 of Track R. Branch `rw3-tai-adapter`, from track-e d6a8e0e. Registered Monday 12 October 2026, 04:47 EDT (by `date`), **before any code of this stage was written or run**. It follows stage RW2 (`docs/staging/rw2-prereg.md`): the same derived records, the same packet, the same scorer, the same seal.

## The plain page

*(Its third and fourth lines, section 0 and sections 12 and 13 were written after the build. Sections 1 to 11 stand as registered at 1d81d34.)*

- **What this is.** A small set of added weights (an adapter) on top of the frozen model, taught one narrow thing: when a wild Taï chimpanzee starts a grooming session, which of the adults in sight it grooms first. It is taught from 557 wild choices of 11 animals.
- **Why now.** Stage RW2 found that on 329 later or unseen Taï choices no kernel reaches the simple rule "the adult it most often groomed first before" (0.353; chance 0.244; the untuned model 0.301; the Ngogo-taught adapter 0.319; the rules-taught adapters 0.26 to 0.29). RW2's own rule says a separate small Taï adapter is then the next step.
- **What tonight did.** It fixed every setting, built the tools and proved them without a model. **Nothing was trained**: the processor belongs to stage R11's retraining. The training file is built from the real train part (557 choices of 11 animals, shown in four option orders: 2,228 rows) and every leak check passes (section 12).
- **What it will cost.** About an hour of model time in all: two trainings of 16 to 27 minutes and four scorings of about 5 minutes (section 13).
- **What will be read, later.** Whether the adapter beats the untuned model, whether it reaches the simple rule, and whether teaching on Taï choices beats teaching on Ngogo choices, on the 329 development records, with two training seeds.
- **What it cannot show.** Gains under about 0.04 to 0.06 when paired, and under 0.08 to 0.10 unpaired. The untuned model sits 0.05 under the simple rule, so an adapter that exactly reaches the rule may not be told apart from the untuned model.
- **What it is never.** The main label source; a kernel of the simulation's loop (that needs a further registered stage); evidence of when or whether chimpanzees groom.

## 0. Status and order of work

Timestamps from `date`, 12 October 2026, EDT.

| step | when | what |
| --- | --- | --- |
| This registration, committed (1d81d34) | 04:49:14 | nothing of this stage existed yet; no record had been read by this stage |
| Code and tests on invented fixtures (6d19b48) | 05:03 to 05:04 | `tests/rw3.test.ts`, 10 of 10; no real record read |
| The dry step on the real train part, no model | 05:04:17 to 05:04:21, again at 05:06 | section 12, aggregates only |
| The report checked against the per-record scores of 11 October (read only) | 05:05 | it reproduces `rw2-prereg.md` §8.4 to the last digit |

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

## 12. Amendments, and results of the dry step (12 October 2026; no model; aggregates only)

### 12.1 Amendments

All made after the registration commit (1d81d34, 04:49:14) and before any model step; no score of a Taï-taught adapter exists. Amendments 1, 2 and 5 were made **before any real record was read by this stage's code** (the dry step, 05:04:17). Amendments 3, 4, 6 and 7 were made after the dry step (05:06 to 05:16), which had shown counts and passing checks only: each adds a refusal or fixes an order, and none answers a number. None of the eight changes a label, a packet, the recipe, what is scored or the reading of S1 to S6.

1. **Of the development part the assembler reads each record's key and the flag that says whether the record is scored** (section 1 said the keys alone). The flag is needed to hash the scored development keys against the committed manifest. Nothing else of a development record is kept.
2. **Leak check 4 also holds every row equal to the row the builder makes again from its record**, so nothing can be written into a row after it is built.
3. **A training needs its checks on file.** The trainer refuses a file whose data manifest does not say the leak checks passed, or whose hash is not the one the manifest records. The wrapper refuses to train on a file built without the history check (check 5 of section 7), which needs `data/raw` linked.
4. **S0 also reads, from each adapter's manifest, that the leak checks passed and the sealed part was not read.**
5. **A model step is also refused while a registered chain of model steps says it is running** (the state files of stage R11's nights and of stage RW2's scoring). Between two steps of a chain no model process is alive, and the guards written before this stage do not know this stage's trainer by name.
6. **The order of the model steps** (section 13): both trainings come before any Taï-taught adapter is scored, so no development score of such an adapter exists while a training is still to run.
7. **S0 also holds each adapter to the training file on hand**: the hash its manifest records must be the file's.
8. **A figure corrected.** Section 3 says one animal holds 35% of the train part's records. That is its share of the 599 events (`rw2-prereg.md` §2.6); of the 557 eligible records it holds 38% (below). The reason it supports stands.

### 12.2 The training file, built from the real train part

`scripts/rw3-run.sh dry`, with the main checkout's `data/raw` read through the reader only. The reader's manifest, made again, is the committed `data/rw2-manifest.json` byte for byte.

| | |
| --- | --- |
| Records written by the reader for the train part | 599; **557 eligible**, 42 left out by the same-day rule |
| Choosers | 11 (499 records by males, 58 by females) |
| Records per chooser | 1 to 210, median 24; the largest holds 38% |
| Chance on these records | 0.232 |
| Options per record | 2 to 13, median 6; by size 2 to 13: 81, 80, 63, 48, 81, 50, 39, 36, 34, 19, 8, 18 |
| Wider than 8 | 115, each cut to a sub-menu of 8 around the adult actually groomed |
| Rows | **2,228**: 557 in each of 4 epochs; none dropped for length |
| Options shown per row | 2 to 8; 616 rows show 8 (460 of them sub-menus) |
| Tokens per row, the server's estimate | median 224, 90th percentile 288, largest 337 (stage R4's field file: median 221, largest 398) |
| Optimiser steps | 70 an epoch, 280 in all, 28 of warm-up: as registered |
| The file's sha256 | `db788d447291ba6decd92452c6a86bdff22a80726494d619a66e44c91ce8b693` (a frozen checkout must build the same) |

**Projected model time** (arithmetic on earlier measurements, not measured here). One training: 15 minutes at stage R4's field rate (0.41 s an example, on packets of the same length; 5.4 GiB) to 22 minutes at stage R11's (0.6 s), plus a model load of 1 to 5 minutes: **16 to 27 minutes a seed**. One scoring of the development part: 329 calls plain (about 50 s by the packets' length) and 177 more sub-menu calls fanned out (about 20 s); on 11 October a scoring of both wild records took 5.5 to 7.5 minutes with the load and the rules, so **about 5 minutes a kernel** for the Taï record alone.

### 12.3 The leak checks on the real file

| check (section 7) | result |
| --- | --- |
| 1. Only the registered train records | 557 records; their key hash is the committed manifest's train hash; one row per record per epoch; no row of another part |
| 2. No development key | 353 development keys read (329 scored; their hash is the committed manifest's); 0 rows share one |
| 3. No sealed key | no sealed record exists; no opened sealed file on hand |
| 4. The label is not in the words | 0 of 2,228 packets change when the label is moved; 0 hold a record key or a chooser's label; every pick is the option that names the adult actually groomed; every row equals the builder's own; the answer is the first option on 0.251 of rows against 0.238 expected |
| 5. The chooser's own future | (a) all 353 development outcomes moved: **0 of 599 train records changed** (301 development records did, so the test reads outcomes). (b) Cuts a quarter, a half and three quarters through each of 15 animals' events: 719, 480 and 242 outcomes moved; **0 of 232, 471 and 709 records before the cut changed**; 0 of the 15 records at each cut changed apart from the label; 636, 392 and 186 records after the cut did. No sealed outcome was in memory (1,372 events loaded with the seal on, 952 records built) |

### 12.4 What was exercised without a model

| what | when | result |
| --- | --- | --- |
| `tests/rw3.test.ts` (invented fixtures; ten tests that cover the eight items of section 10, the trainer always stopped before its load) | 05:03, 05:06, 05:16 | 10 of 10 |
| `scripts/rw3-run.sh check` | 05:04 | exit 3, as it should: it listed stage R11's scorer by its script name (the interpreter shows under the framework's path, so the path alone would have missed it) and the chain's state file |
| `scripts/rw3-run.sh dry` | 05:04, 05:06 | 4 seconds; sections 12.2 and 12.3 |
| The trainer's entry point for seeds 7 and 11, `--stop-before-load 1`, the system's interpreter | 05:04, 05:06 | the pre-load check passed for both (2,228 rows, 280 steps, the registered recipe, the leak and history checks on file) and stopped before any import of the model's code |
| The trainer's loop against `train_r4.py`, line by line | 05:05 | the same but for the registered differences: no development file or evaluation, the last epoch saved, the model's code imported inside the training function |
| A real `scripts/rw3-run.sh train 7`, while stage R11's scorer was running | 05:17 | refused at once with exit 3 ("another model process is running"), a REFUSED line in the status log, nothing started |
| `scripts/rw3-run.sh report` with no score on file | 05:17 | the table is written with every model row "not on file", S0 reads NO and nothing else is read |
| `scripts/rw3-report.ts` on the per-record scores of 11 October (frozen checkout `bench-rw2`, read only) | 05:05 | chance 0.244, the bar 0.353, the untuned model 0.301 and 0.295, the Ngogo-taught adapter 0.319 and 0.328; the untuned model minus the bar −0.052 (−0.106 to 0.010), the Ngogo-taught adapter minus the bar −0.033 (−0.062 to 0.006): `rw2-prereg.md` §8.4 to the last digit. Also, new from the same files: the Ngogo-taught adapter minus the untuned model +0.018 (−0.029 to 0.070), a half-width of 0.05, which is what S3 will have to clear |

**Type-check, tests and build.**

| what | when | result |
| --- | --- | --- |
| `tsc --noEmit` (the project's own); the new scripts and the test file under the same strict options | 05:06; 05:16 | clean |
| The whole suite, once (`pnpm test`, head c8b42aa) | 05:06:44 to 05:15:44 | 1,315 tests: 1,314 pass, 0 fail, 1 skipped (it needs a validation file that is not on this computer) |
| `tests/rw3.test.ts` alone, after the last change to the wrapper and the report (nothing else changed after the suite but this document) | 05:16 | 10 of 10 |
| `pnpm build` | 05:16 | passes |
| `tests/fixtures/golden-world.json`, `tests/sim-track-e.test.ts`, everything under `src/` | | untouched: this stage adds scripts, one trainer file and one test file |

### 12.5 Not done, and not verified

- **Nothing was trained and no model was loaded.** The trainer has never run past its pre-load step. Its loop is stage R4's, but its first real run is the integrator's.
- The scoring path was not run with a Taï-taught adapter (none exists). It is `scripts/rw2-score.ts`, which scored five kernels on 11 October.
- Memory and time of a training are projections (section 12.2).
- The older guards (`scripts/r11-run.sh` and before) were not changed: they do not see a running `train_rw3.py` by name (section 13).
- The user's ruling on T-HUN-9 and T-END-12 is still open (`rw2-prereg.md` §10.1); they are treated as compromised until it comes.

## 13. For the integrator

**Read first.** Nothing here is a result. No adapter of this stage exists. The model steps below are the first run of the trainer past its pre-load check.

**When.** After stage R11's chain has ended (`cat .claude/worktrees/bench-r11/artifacts/r11-chain/state` reads `done` or `failed`). Until then every model step of this stage refuses.

**What to launch, in order.** From a frozen detached checkout of the head that holds this branch, in a detached `screen` session, one model process at a time. About an hour in all.

```sh
# 0. the frozen checkout (a minute)
cd /Volumes/Drive/chimpbench/MGOGO
git worktree add --detach .claude/worktrees/bench-rw3 <the head that holds this branch>
cd .claude/worktrees/bench-rw3
ln -s /Volumes/Drive/chimpbench/MGOGO/node_modules node_modules
ln -s /Volumes/Drive/chimpbench/MGOGO/data/raw data/raw     # the dry step makes the derived records again and runs the history check; git ignores both links
git status --short                                            # must print nothing

# 1. no model (seconds)
scripts/rw3-run.sh dry                                        # must end "RW3 dry: done; no model was loaded"
shasum -a 256 artifacts/decide-ft/rw3/tai/train.jsonl         # must be db788d447291ba6decd92452c6a86bdff22a80726494d619a66e44c91ce8b693
scripts/rw3-run.sh check                                      # must end rc=0: no other model process, no chain running, the tree clean

# 2. the chain: the two references first, then both trainings, then the two adapters' scores, then the table
mkdir -p artifacts/rw3-chain
cat > artifacts/rw3-chain/chain.sh <<'CHAIN'
#!/bin/sh
# Stage RW3: both training seeds and the development scores (docs/staging/rw3-prereg.md section 13). Frozen checkout bench-rw3.
cd /Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-rw3 || exit 1
export MGOGO_GHN_ROOT=/Volumes/Drive/chimpbench/GHN MGOGO_DECIDE_PYTHON=/Volumes/Drive/chimpbench/decide-env/bin/python
export HF_HOME=/Volumes/Drive/chimpbench/hf-cache HF_HUB_CACHE=/Volumes/Drive/chimpbench/hf-cache/hub
C=artifacts/rw3-chain
say() { echo "$(date '+%d %b %H:%M:%S') $*" | tee -a $C/status.log; }
run() { say "START [$STEP] $*"; "$@" >> "$C/$STEP.log" 2>&1; rc=$?; say "END   [$STEP] rc=$rc"; if [ $rc -ne 0 ]; then say "CHAIN FAILED at $STEP"; echo failed > $C/state; exit 1; fi; }
echo running > $C/state; say "chain starts at $(git rev-parse --short HEAD)"
STEP=00-check;       run scripts/rw3-run.sh check
STEP=01-dry;         run scripts/rw3-run.sh dry
STEP=10-eval-base;   run scripts/rw3-run.sh eval base        # the untuned model: must read 0.301 (and proves the runtime before any training)
STEP=11-eval-ngogo;  run scripts/rw3-run.sh eval ngogo       # the Ngogo-taught adapter r4-field-groom: must read 0.319
STEP=20-train-7;     run scripts/rw3-run.sh train 7
STEP=21-train-11;    run scripts/rw3-run.sh train 11
STEP=30-eval-7;      run scripts/rw3-run.sh eval 7
STEP=31-eval-11;     run scripts/rw3-run.sh eval 11
STEP=40-report;      run scripts/rw3-run.sh report
echo done > $C/state; say "CHAIN DONE"
CHAIN
chmod +x artifacts/rw3-chain/chain.sh
screen -dmS rw3chain artifacts/rw3-chain/chain.sh

# 3. to check it, only read
cat artifacts/rw3-chain/state; cat artifacts/rw3-chain/status.log; cat artifacts/rw3/status.log

# 4. when the state reads done
cat artifacts/rw3/tables/rw3-numbers.md                       # S0 first: if it says NO, nothing else is read
scripts/rw3-run.sh publish                                    # copies the table to docs/staging/rw3-numbers.md; commit it on a branch
```

- **The four runtime variables** are set by the wrapper to the values above when they are unset; the chain exports them so the log shows them.
- **Where things land** (all git-ignored, in the frozen checkout): the training file and the adapters under `artifacts/decide-ft/rw3` (`adapters/rw3-tai-groom-s7`, `-s11`); status, logs, per-record scores and tables under `artifacts/rw3`. Keep the checkout: the adapters are not in git. The Ngogo-taught adapter is read from `.claude/worktrees/r4-train/artifacts/decide-ft/r4` (`RW3_NGOGO_FT` names another folder).
- **Optional, a description of fit, never a result:** `scripts/rw3-run.sh eval 7 train`, `eval 11 train`, `eval base train`, then `report` again (it also writes `rw3-fit.md`). About 6 minutes each.
- **If a step failed.** `state` reads `failed` and the last line of `status.log` names the step; its output is `artifacts/rw3-chain/<step>.log`, and a model step's own log is under `artifacts/rw3/logs`. A training cut short leaves weights without `manifest.json`: delete `artifacts/decide-ft/rw3/adapters/<name>` and run the step again. A step that has finished does nothing when it is run again (it says "on file" and ends with rc=0), so the chain can simply be launched again.
- **If a training cannot hold in memory**, section 11 applies: log the iteration here first, then run the trainer by hand with the changed setting and `--unregistered 1` under another adapter name. No iteration may follow a development score.
- **One defect outside this stage, not repaired.** The guards of `scripts/r11-run.sh` and of the earlier run scripts look for the model scripts by a fixed list of names, which does not hold `train_rw3`. While a training of this stage runs, start no other stage's model step by hand, or add `train_rw3` to those lists. This stage's own guard knows every name on R11's list.

**`IMPLEMENTATION_PLAN.md`, Track R: a block for stage RW3** (not written into the plan by this branch).

```
## Stage RW3: A small adapter taught wild Taï first-grooming-partner choices
**Goal**: follow stage RW2's own rule (no kernel reached the simple rule on the Taï development part, so a separate small Taï adapter is the next step): teach one, named and separate, on the 557 eligible train records, and read on the 329 development records whether it beats the untuned model, reaches the simple rule and beats the Ngogo-taught adapter.
**Success Criteria** (registered in `docs/staging/rw3-prereg.md` before any code): the recipe is stage R4's field adapter copied with nothing searched (the one departure: no checkpoint is chosen, the last of 4 epochs is saved, because the development part may not choose and 11 animals cannot spare a validation set); two training seeds (7 and 11), hard labels, the own view; a statement counts only if both seeds meet it on the plain reading, paired on the same records with an interval over animals; the sealed part (420 events) stays sealed and no script of the stage can open it.
**Status**: Registered and built on 12 October 2026 (branch `rw3-tai-adapter`); **not trained**. The training file is built from the real train part: 557 choices of 11 animals (499 by males, 58 by females; one animal holds 38%), 115 menus wider than 8 cut to sub-menus of 8 around the adult actually groomed, four option orders, 2,228 rows whose words are the scorer's own packets byte for byte. Every leak check passes: the records are the committed manifest's, no development key is among them, the label is not in the words, and no later outcome reaches an earlier record (with all 353 development outcomes moved, none of the 599 train records changes). The trainer has run only up to its model load. `scripts/rw3-run.sh check | dry | train <seed> | eval <seed|base|ngogo> | report | publish` refuses the sealed part, another model process and a running chain, and holds everything under `artifacts/`. Model time to come: about an hour (two trainings of 16 to 27 minutes, four scorings of about 5). *What it can show*: paired gains of about 0.04 to 0.06 or more; the untuned model sits 0.05 under the simple rule, so an adapter that exactly reaches the rule may not be told apart from the untuned model. *Standing limits*: never the main label source; never in the simulation's loop without a further registered stage; it teaches which adult in sight is groomed first at one western site, not whether or when to groom; T-HUN-9 and T-END-12 are treated as compromised for it until the user rules.
```

**`AGENTS.md`, Commands** (one line, after the RW2 lines) **and Gotchas** (one sentence for the model-harness item).

```
scripts/rw3-run.sh check | dry | train <7|11> | eval <7|11|base|ngogo> [train] | report | publish   # stage RW3 (docs/staging/rw3-prereg.md): the small adapters taught wild Taï first-grooming-partner choices (rw3-tai-groom-s7 and -s11; label source "field choices, Tai first grooming partner"; the train part only, hard labels, stage R4's field recipe, the last epoch saved, no development file). dry (no model): the derived records again when data/raw is linked, the history check (scripts/rw3/rw3_history_check.py), the training file with its leak checks and counts (scripts/rw3-assemble.ts), and training/decide_ft/train_rw3.py up to the model load (--stop-before-load 1); eval scores the Taï development part through scripts/rw2-score.ts, plain and fanned out; report prints the registered statements (scripts/rw3-report.ts); no step takes the sealed part; a model step refuses beside another model process, a running chain or a tree that is not clean; everything stays under artifacts/ until publish
```

```
Stage RW3's trainer is `train_rw3.py`: the guards of `scripts/r11-run.sh` and the earlier run scripts list the model scripts by name and do not hold it, so add `train_rw3` there before running them beside it. Between two steps of a chain no model process is alive: `scripts/rw3-run.sh` therefore also reads the chains' state files (`RW3_WAIT_STATES`).
```

## 14. The second reader (12 October 2026)

A second agent read the stage at a943ec0 with the brief to refute the builder's report. Sections 1 to 11 are untouched. This section has two parts: the amendments, committed before any changed code was run, and what was measured.

### 14.1 Amendments 9 to 15, each registered before its code was written or run (9 to 13: Monday 12 October 2026, 05:34 EDT by `date`; 14 and 15: 05:37)

No model step has run and no score of a Taï-taught adapter exists. Each amendment closes a gap between what sections 5, 7, 11 and 12.1 say and what the code did; each was found by reading the code and by made-up scores, never by a real score. None changes a label, a packet, the training file, the recipe, what is scored or the meaning registered for an outcome.

9. **S4 governs S1 to S3, as section 5 says.** Section 5 registers: "If that difference excludes 0, every statement above is seed-dependent", and a seed-dependent statement is written "seed-dependent: not shown". The report as built printed "met" for S1 to S3 and "a small Taï adapter beats the simple rule on development" for the whole when both seeds lay above and the two seeds differed from each other, beside an S4 line that said every statement was seed-dependent. From now on: on a reading (one call a record, or fanned out) where the paired difference between the two seeds excludes 0, a statement that would read "met" is written "seed-dependent: not shown", and the whole follows from the statements so written. "Below on both seeds" stays as it is: both seeds are below, and that is the more cautious reading. This can only take a "met" away.
10. **S0 holds three more things, each a consequence of what is already registered.**
    - "Each adapter's answers differ from the untuned model's on at least one record" is also read for the Ngogo-taught adapter when its scores are on file. As built, a Ngogo-taught adapter that the scoring worker had not loaded left the run valid and S3 read against the untuned model under another name.
    - Each adapter's manifest must say that the history check (check 5 of section 7) passed. Amendment 3 says a training needs its checks on file; as built, S0 read checks 1 to 4 only.
    - The scores on file must have been made with the adapter on file. The scoring step writes the sha256 of the adapter's weights beside the scores it makes, and S0 compares it with the manifest's. As built, scores made with an adapter that was later deleted and trained again would have been read as the new adapter's.
11. **The order of amendment 6 and the closing of section 11 are enforced by the wrapper, not only written.** `eval 7` and `eval 11` (either part) refuse unless both adapters are trained to the end. `train` refuses once any score of a Taï-taught adapter is on file, on either part: "once a development score of a Taï-taught adapter has been read, the recipe is closed". A finished adapter is still a no-op, so a chain can be launched again.
12. **An override leaves a line, and one is removed.** `RW3_ALLOW_OTHER_MODEL`, `RW3_ALLOW_DIRTY` and `RW3_RERUN` (the same kind of switches as stage R11's wrapper has; all unset by default) each write an `OVERRIDE` line to the status log when they take effect. `RW3_ALLOW_NO_HISTORY`, which let a file built without the history check teach, is removed: the wrapper always refuses such a file, and the trainer itself refuses to go past its pre-load step with one. The pre-load step alone (`--stop-before-load 1`) still runs and says "NOT RUN", as section 7 registers for a checkout without the raw files.
13. **Two holes in "the registered recipe" and in where the answers come from.** The trainer counts the device as part of the registered recipe (section 3: the Apple GPU backend); as built, a training on another device would have been marked registered. The wrapper unsets `MGOGO_DECIDE_SERVER`: with it set, the scorer joins a shared scoring server that does not hold this stage's adapters.

**Amendments 14 and 15, registered Monday 12 October 2026, 05:37 EDT (by `date`), before their code was written.** Found while the report's repair for amendments 9 and 10 was being checked on made-up scores (iteration 2 of at most 3; still no model step and no score of a Taï-taught adapter).

14. **When S0 fails, the figures of the Taï-taught adapters are withheld.** Section 5 registers that if S0 fails "nothing else is read and the fault is repaired without looking further". As built, the generated table and its data file printed every score, paired difference and cut of the Taï-taught adapters under an S0 that said NO. From now on, when S0 fails the table and the data file hold, for the Taï-taught adapters, only what the repair needs: the faults, the manifests' description of the training, and the count of answers unlike the untuned model's. The chance, bar, untuned and Ngogo-taught rows stay (they are stage RW2's known figures). A fault that needs a new training is an iteration: it is logged here first, and the invalid scores are moved away before the wrapper will train again (amendment 11). Not closed, declared: the scorer of stage RW2, which this stage does not change, prints each kernel's top-1 to its own log as it runs.
15. **A model step refuses when it cannot read the process list.** As built, a process list that could not be read (the tool missing or failing) read as "no other model process". From now on the wrapper first asks the process list for its own script, and refuses a model step when not even that is found.

**Iterations.** Amendments 9 to 13 are iteration 1 of at most 3 for the second reader's changes; amendments 14 and 15 are iteration 2. There was no third. What will be run after this commit: `tests/rw3.test.ts`, the dry step, the wrapper's refusals with `RW3_NO_MODEL=1` (which stops before any model step whatever came before), the report on made-up scores and on the read-only scores of 11 October, `tsc --noEmit`, and the whole suite once. No model process at any point.

### 14.2 What the second reader measured (12 October 2026, 05:26 to 05:46 EDT; no model; aggregates only)

Each line is a claim of the builder's report, measured again with the reader's own scripts (kept outside the repository) or by running the stage's entry points.

| claim | how it was tried | what was read |
| --- | --- | --- |
| The registration came before the code | the files' creation times against the registration commit; sections 1 to 11 at that commit against now | the six code files were created between 04:52:55 and 05:02:15, after the commit of 04:49:14; sections 1 to 11 are unchanged |
| The dry step | run again at 05:29:40 (4 seconds) and on the repaired head at 05:44:00 | exit 0 both times; the reader's manifest is the committed one; the training file's sha256 is the registered `db788d44…e8b693`; both pre-load checks pass (2,228 rows, 280 steps, 28 of warm-up) and stop before any of the model's code |
| The counts of section 12.2 | from the dry step's own count file | all as written: 599 written, 557 eligible, 11 choosers, 499 and 58, 1 to 210 a chooser, 115 wide menus, 616 rows that show 8 options |
| The recipe is stage R4's field adapter | the manifest of `r4-field-groom`, read only | the same ten settings and seed 7. That adapter kept its third epoch of four (validation loss 1.2525 against 1.2597 for the fourth), so "the last epoch" is a small step from what R4's own choice gave |
| The training words are the scorer's | every whole-menu row of the real file against what the real scoring path (`scoreRw2`, the GLiNER kernel, a stand-in scorer in process) sends for the same record and shuffle | 1,768 of 1,768 equal, and each found as the very bytes of its line in the file. The 460 sub-menu rows: 460 of 460 equal the fan-out's own narrowing of the whole request, with the whole menu's "in sight" line |
| The label is not in the words | the label moved to **every** other option (the builder's check moves it to one), all whole-menu rows rebuilt | 6,400 packets rebuilt, 0 changed |
| The order of options does not carry the label | where the label sits, on the real file | first option 0.251 and last 0.243 of rows against 0.238 expected. Whole menus: 0.285 and 0.271 against 0.267. Sub-menus: 0.122 and 0.135 against 0.125. Rows that show 8 options, by position: 76, 71, 74, 84, 74, 84, 73, 80 (chi-square 2.3 on 7 degrees of freedom; the 5% line is 14.1). In the record's own order, before any shuffle: first 0.248, last 0.233, expected 0.232 |
| No simple reading of the text gives the answer away | rules that read only the text, ties split, on the 2,228 rows | "the most-mentioned name" 0.274 and "the least-mentioned" 0.189 against chance 0.238. That is the registered history and no more: "the first name of the line of earlier first partners" scores 0.350, the simple rule `stack-own` 0.343 on the train part, and on the 61 rows with no earlier partner "the most-mentioned name" is exactly chance (0.280). "The name first in the alphabet" 0.233 |
| No outcome reaches a record that does not lie after it | two tests stronger than check 5, through the reader's own functions, in memory, the seal on (0 sealed outcomes in memory). (a) Nine cuts in calendar time over all animals at once: every outcome from the cut on is moved. (b) One event at a time, all 952: its outcome alone is moved | (a) 0 changed among the 95, 190, 285, 380, 476, 571, 666, 761 and 856 records before the cuts, while 794 down to 61 of the later ones did. (b) The event's own record changed in nothing but its label 952 times of 952 (no count includes the event itself); 0 earlier records changed; 18,572 later records of the same animal did; 0 records of another animal did |
| The records the assembler read are the reader's | the two files on hand against the records built in memory | 952 of 952 equal |
| A train animal's development events all lie after its train events | from the events' dates, in memory | 0 animals with a development event that is not after all of its train events; 0 train events in 2015 |
| No script takes the sealed part, and the trainer takes no development file | 24 tries to name the sealed part, to ask for the seal to be opened or to hand the trainer a development file: the wrapper by word and by flag (12), the assembler by flag and beside a stand-in sealed file (3), the report (3), the history check (2), the trainer by path and by flag (4) | every one refused, nothing read. The only code that can open the seal is stage RW2's reader and scorer with their own flag, which no file of this stage holds |
| The wrapper's refusals | live, with the stop that ends a model step before its model (`RW3_NO_MODEL=1`), while stage R11's chain ran | `check`, `train 7`, `train 11`, `eval base`, `eval ngogo`: exit 3, stage R11's scorer listed by its script name and the chain's state file named. `eval 7`, `eval 11`: exit 2, no adapter. Nothing was started |
| The report reproduces stage RW2 | run on the per-record scores of 11 October, read only, before and after the repairs | chance 0.244, the bar 0.353, 0.301 and 0.295, 0.319 and 0.328, the three paired reference rows: to the last digit, and the same table after the repairs |
| Privacy | every word of the seven files of the stage and of its commit messages against the 28 animal codes of the Taï record and the 29 of the Kanyawara record (in any case), and against the 1,176 derived keys and chooser labels of both records; dates and long decimals | 0 codes, 0 keys or labels, 0 dates of events, 0 long decimals. The test fixtures are generated from seeds; their animal codes have an invented shape |

### 14.3 What was found, and what was done about it

Repaired, each in its own commit after its amendment (14.1):

- **The report could print "met" and "beats the simple rule" beside "every statement is seed-dependent"** (amendment 9).
- **S0 passed three runs it should not:** a Ngogo-taught adapter that answered exactly as the untuned model; an adapter trained on a file without the history check; scores made with another adapter than the one on file (amendment 10).
- **The order "both trainings, then the scores" and "no training after a score" were words only** (amendment 11). The wrapper now refuses.
- **Overrides left no trace, one let a file without the history check teach, and a training on another device was marked registered** (amendments 12 and 13).
- **A run that failed S0 was printed in full** (amendment 14), and **a process list that could not be read counted as "nothing is running"** (amendment 15).

Found and left as they are, declared here:

- **No training row has the shape of a development call for a wide menu.** The 460 sub-menu rows (21% of the file) show 8 options under a line that says 9 to 13 are in sight. One call a record sends such a menu whole (59 of the 329 development records), and the fan-out, on menus of 9 to 13, only ever sends sub-menus of 4 to 7 options (measured: 345 sub-requests, sizes 4, 5, 6 and 7, none of 8). Section 2 says a training sub-menu "has the form of a fan-out sub-request": that holds for its lines and not for its size. It is stage R4's way and is not changed; it bears on S5 and on the cut "more than 8 options".
- **A sub-menu row depends on the label by construction** (the adult groomed is always among the 8 shown), so the "label moved" check can only be run on whole menus. Where the label sits among the 8 is even (above).
- **The scorer prints each kernel's top-1 to its log as it runs** (stage RW2's script, unchanged). The chain's logs therefore hold the development scores before S0 is read: read the table, and S0 first.
- **An iteration under section 11 cannot be read by the tools as they are.** The wrapper scores and the report reads the two registered adapter names only, and S0 refuses a manifest that is not the registered recipe. If a training cannot hold in memory, the changed setting needs a logged change to the wrapper and the report as well as to the recipe.
- **The wrapper's refusals bind the wrapper.** The trainer run by hand can still train after a score; S0's comparison of the hash beside the scores with the adapter's manifest is what then catches a score that is not the adapter's.
- **Amendment 9 leaves "below on both seeds" standing when the seeds differ.** The registered sentence says every statement is then seed-dependent; the more cautious reading was kept for the outcome that is against the adapter. The user may rule otherwise before any score exists.
- The builder's notes stand: the older guards do not know `train_rw3` by name; nothing was trained; memory and time of a training are projections.

### 14.4 For the integrator: what changes in section 13

- **The chain of section 13 is unchanged and still the order to use.** `eval base` and `eval ngogo` may run at any time; `eval 7` and `eval 11` now refuse until both adapters are trained to the end; `train` refuses once a score of a Taï-taught adapter is on file.
- **`check` must end with 0** and now also says whether the process list can be read and whether a score of a Taï-taught adapter is on file.
- **If the two reference scorings do not read 0.301 and 0.319, stop the chain** before the trainings: the runtime or the records are not stage RW2's. (S0 holds chance and the bar to 0.244 and 0.353 and now fails when the Ngogo-taught adapter answers as the untuned model; it does not hold the two reference figures.)
- **If S0 says NO**, the table shows no figure of the Taï-taught adapters. Repair the fault it names. A fault that needs a new training is an iteration: log it in this document first, move the invalid scores out of `artifacts/rw3/bench`, delete the adapter's folder, then train.
- **`AGENTS.md`**, added to the line of section 13: "eval 7 and eval 11 refuse until both adapters are trained to the end, and train refuses once a score of a Taï-taught adapter is on file; the scoring step writes adapter.sha256 beside the scores, which the report's S0 holds against the adapter's manifest; a run that fails S0 is written without the Taï-taught adapters' figures; RW3_ALLOW_OTHER_MODEL, RW3_ALLOW_DIRTY and RW3_RERUN each leave an OVERRIDE line in the status log".
- **Checked at the end:** `tsc --noEmit` and the whole suite were run once on the head that holds this section, after it was committed. Their output is kept, outside git, in `artifacts/rw3/logs/whole-suite-second-reader.out`, and their result is in the second reader's report to the integrator.

## 15. Results (the integrator, 12 October 2026, written 10:42 EDT; frozen checkout `bench-rw3` at c6024c7)

Table, generated: [rw3-numbers.md](rw3-numbers.md) (aggregates only; the sealed part not opened). The chain ran from
09:31 to 10:41 EDT with every step at exit code 0: the two reference scorings read stage RW2's figures again (0.301
and 0.319) before any training; the trainings took 18.6 and 15.1 minutes; both adapters were trained before either
was scored.

- **S0, the run is valid: yes.**
- **Top-1 on the 329 development records, one call a record** (chance 0.244; the bar, the simple rule, 0.353; the
  untuned model 0.301; the Ngogo-taught adapter 0.319): training seed 7 **0.307**, training seed 11 **0.353**.
- **S1 (taught something), S2 (reaches the simple rule), S3 (beats the Ngogo-taught adapter): not shown**, each on
  both seeds (every paired interval includes 0; fanned out, seed 11 alone lies above the untuned model, which the
  registration writes "seed-dependent: not shown"). **S4**: no difference between the seeds is shown (−0.046, −0.070
  to 0.000; the same option on 0.802 of records).
- **The whole, in the registered words: 557 choices did not teach the model anything this record can show; the Taï
  record stays a test, not a teacher, at this size.** With this record's power (no paired difference under about 0.04
  to 0.06) that is not "no effect".
- Nothing follows for the simulation: neither adapter enters a loop, the main label source is unchanged, the sealed
  part stays sealed (its opening was tied to "beats the simple rule on both seeds", which did not happen). The
  adapters stay under `bench-rw3/artifacts/decide-ft/rw3` (not in git).

## Privacy

Nothing derived from a raw row goes into git except aggregate counts, rates and hashes. The training file, the derived records, the per-record scores and the adapters stay under `artifacts/` (git-ignored). A training row holds invented names, a hashed record key and no animal code, date, clock time or value of the source. The raw file is read only through `scripts/rw2/rw2_ingest.py` and its own functions, as `/usr/bin/python3 -I`. Tests use invented fixtures only.
