# RW: wild choice benchmark, registration

Stage RW of Track R (`IMPLEMENTATION_PLAN.md`, direction amendment of 6 October 2026). Branch `rw-wild-choice`, from track-e 24cf896. This stage ran no model, no simulation and no training, and used no network. It answers whether a sound benchmark of individual wild choices can be built from data already on this computer, and registers its design.

**Status: version 3.** Order of work, each step a commit:
1. Version 1 (66cfe49): the held-out rule and provisional definitions, before any outcome was read. Looked at until then: the README and PROVENANCE, column names, rows, sessions and animals per year, the punctuation shape of each field (letters and digits masked).
2. Version 2 (3cbcba4): three parts after the user's rule change (section 2), before any baseline. Looked at between 1 and 2, on the pooled rows that are not held out: only how the fields are coded (section 3).
3. The parser and its tests on synthetic rows (3b1833d), before its first run on the real file.
4. This version: the numbers, the mapping and the verdict.

**Every number below is copied from `docs/staging/rw-numbers.md`, which `scripts/rw-ngogo-choices.ts --md` writes** (aggregate counts and rates only). If the two disagree, the generated file is right. The held-out part is sealed: no outcome of it was read, and its sample sizes are projections.

## 1. Verdict

**Build the benchmark on this dataset: yes, for one narrow decision — whom an adult male grooms among the adult males recorded in his party. Confidence: moderate as a test of a kernel; low to moderate as a source of training labels.**

- It has 977 eligible choices from 34 males in the training part, 448 from 30 males in the development part, and a projected 455 in the sealed part (3,281 sessions, 54 focal males).
- Choice sets hold a median of 7 males (training) and 8 (development); chance is 0.17. The simple rules a kernel must beat reach 0.39 to 0.44 (most frequent past partner) and 0.45 to 0.49 (the registered stack of three rules).
- **Main threat to validity: the available set.** It is a list of adult males written once per session, of unknown timing and completeness, with no females or immatures. 5 to 6% of the male partners chosen are not in it, 9% of the males seen within 5 m are not in it, and 9% of the partners a male grooms are animals who are in no list at all. The order of the list also gives the answer away a third of the time (section 5), so a packet must never keep that order.
- Second threat: what is missing. No rank, kinship, age, body state, time of day or food. A kernel is tested on social history and proximity only, so a good score says little about the parts of the simulation's kernels that use the rest.
- Third: one community, 77 males. "Unseen" animals are unseen only as choosers.

## 2. Three parts, the rule and why

**Rule change (user, 6 October 2026, relayed by the integrator; recorded in `IMPLEMENTATION_PLAN.md` on track-e at 1e052c3):** "yes, i would say field choices are the source of truth, so it should be part of the training data, when we ar eoptimizing the specialized model, and adapting its behavior." Recorded wild choices may now be training labels for the decision kernel. This replaced "test records only" in version 1.

With `h = int(sha256("rw-heldout-v1:" + lowercase(code))[:8], 16) % 5` for the focal animal of a session:

| part | rule | sessions | focal animals | scans | eligible choices (bouts) | first bout of a session | animals with a choice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **train** | `h` in 2, 3, 4 and year 1998–2013 | 6,022 | 38 | 42,085 | 977 | 750 | 34 |
| **development** | not held out, and year 2014–2015 or `h == 1` | 3,233 | 33 | 22,586 | 448 | 346 | 30 |
| — unseen animals, 1998–2015 | | 2,701 | 10 | 18,868 | 312 | | 9 |
| — seen animals, 2014–2015 | | 532 | 23 | 3,718 | 136 | | 21 |
| **held-out (sealed)** | year 2016 or later, or `h == 0` (fixed in version 1) | 3,281 | 54 | 22,915 | 455 projected | not read | not read |
| — unseen animals, 1998–2015 | | 1,144 | 13 | 7,995 | 159 projected | | |
| — seen animals, 2016–2022 | | 1,621 | 39 | 11,327 | 225 projected | | |
| — unseen animals, 2016–2022 | | 516 | 9 | 3,593 | 72 projected | | |

The year 2016 was chosen in advance because [sandel2026] reports the network polarized in 2015 and two groups by 2018: the sealed later years are the split and its aftermath, a different social regime, and are reported apart. Development mirrors the sealed part (unseen animals, and later years of seen animals) so that what is chosen on development says something about the sealed score. The split of the non-held-out rows was fixed from structure counts only.

**Why this prevents leakage, and what it does not prevent (declared).**
- *The same bout.* A session belongs to one focal animal and one day, so it lies in one part, and a bout is defined inside a session. But several males are focal on the same day, and one bout can be written in two sessions: in the train and development parts the partner is himself a focal animal that day in 1,395 of 2,093 bouts, and his own session shows the same dyad in 314. Rule: a record whose partner is the focal animal of a session of another part on the same day is counted and left out of training and of the scores. It is a rule on codes and days only, so it is applied against the sealed part without reading its outcomes. It costs 393 training records and 275 development records (decision 2 below). Sessions of the same day never enter a record's history either (the file has no clock time).
- *The same male.* No male is a chooser in more than one of: train, the unseen stratum of development, the unseen strata of the sealed part. A male does choose in train and in the later-years strata (their point), and every male appears as a partner in every part.
- *The same dyad history.* Grooming is dyadic and reciprocal: A's choices of B in one part and B's choices of A in another are not independent. This cannot be removed with one community; it is declared. Packets carry per-record pseudonyms, never an animal's code, so a trained kernel cannot memorise an identity or a dyad and can use only what the packet says about history.
- *History is input, not outcome,* and comes from the same place for both open parts: train and development sessions of earlier days, plus earlier scans of the same session. Sealed sessions never enter it. When the sealed part is opened, its records get history from all earlier sessions, and a second score with history from train and development sessions only is reported beside it. Packets carry history as ranks or coarse words, not raw counts, because counts depend on how many sessions fed them.

**The sealed part.** The script blanks every outcome field of a held-out row at load (`seal`, tested: two inputs that differ only in held-out outcomes give identical output). `--unseal` is for stage R5 and needs the user's go. The sealed score is reported per stratum, never pooled silently. Because of this the brief's whole-file first look (9,537 scans with a grooming record, 4,811 with the focal as groomer) was **not re-checked**: doing so would give the sealed base rate by subtraction. The structure counts were checked and hold: 88,046 rows, 12,536 sessions, 77 focal males. The rows are not all scans: a scan with several grooming dyads is stored as several rows, and the file has 87,586 scans.

**Use of the parts.** Train: labels for adapting a kernel (stage R4); nothing is fitted on any other part. Development: choosing among packet wordings, kernels and training settings, and the baselines below. Held-out: one final score per kernel.

## 3. What the data are (questions 1 and 2)

**Collection, as far as it is known.** README: "social behavior of mature male chimpanzees sampled at 10-minute intervals" in "hour-long observation sessions of adult males". `docs/research.md` holds [sandel2026] at abstract level only; the protocol is described for the same site, the same males and the first ten of these years by [mitani2009] (full text): "hour-long focal samples with 10-min scans of partners within 5 m or grooming", adult males of 16 years or more. A session is one focal male on one day with scans 1 to 7.

**Read from the data (train and development rows).**
- `gdyad` writes "a,b" for a grooms b, "a=b" for mutual grooming, "/" between dyads. `groomer` and `groomee` repeat one dyad per row. 5 dyad parts could not be parsed; 130 scans carry a text note and no dyad (not scored).
- **`prox5` is the 2 to 5 m ring, not "within 2 meters" as the README says and not "within 5 m" cumulatively.** On 2,527 scans with both lists they share no animal on 2,514, and `prox2` lies inside `prox5` on 7. So "within 5 m" is the union of the two.
- `party` is written on a session's first scan only, for 8,869 of 9,255 sessions (0.958). It lists roster males almost only (0.005 of names are off the roster).
- The roster of mature males is the 77 focal codes. Names off the roster (females, immatures, "unknown") are 0.075 of `prox2` names, 0.067 of `prox5` names and 0.091 of the partners groomed by the focal. **Females are not absent from the grooming and proximity records; they are absent from the party lists, so from every reconstructable set.**
- Filling: `prox2` on 0.177 of rows, `prox5` 0.126, `gdyad` 0.104, `party` 0.137. Proximity is recorded on 0.259 of scans.

**Not known (stated, not guessed).** Whether `party` is the party at the start of the hour, during it or, as the README's wording says, "during 1 hour following the session"; whether it is complete; whether an empty proximity field means nobody near or not recorded; how a direction was assigned at an instantaneous scan; the clock time; how the focal animal was picked; whether the 77 are all males who were ever adult. The full text and supplement of [sandel2026] are **missing** from `docs/research.md` (decision 5).

**One wild choice record (Task A, the benchmark).** One bout of grooming *given* by the focal male. A bout is a maximal run of consecutive scans of one session in which he grooms the same partner; the decision time is its first scan; the label is the partner. Bouts are short: a mean of 1.3 scans, at least three quarters of them one scan. No record has two partners at its decision scan. 0.214 of bouts are already under way at a session's first scan (start not seen; kept and flagged). Bouts he only receives (1,539 in train) are counted, not scored: the chooser is the other animal.

**The available set: the session's party list, restricted to the roster, without the focal.** The label is never used to build it and the partner is never added.

| candidate set (train; development is within 0.03) | recorded | partner in the set | size, median; mean; max |
| --- | --- | --- | --- |
| party list | 0.994 | 0.951 (outside: 0.049; development 0.064) | 7; 7.9; 33 |
| males within 5 m at the previous scan | 0.453 | 0.674 | 1; 1.9; 8 |
| party plus everyone named earlier in the session | 0.993 | 0.963 | 7; 8.0; 33 |

The party list is the only usable set; proximity at the previous scan is too sparse to be one. A second, independent check: of 12,203 (session, male within 5 m at some scan) pairs, 0.909 are in that session's party. So the list is a 91 to 95% superset of the males actually near, of unknown excess (males listed who were out of reach). At the decision scan itself the partner is listed within 2 m on 0.968 of bouts: **proximity at the decision scan is the answer and is never an input**; proximity enters only from earlier scans.

**Tasks B and C are base rates, not benchmarks.** B (whether he grooms at a scan): he gives grooming on 0.055 of scans with a male in the party and only receives on 0.048; with no body state, food or clock a kernel has nothing to decide it with. C (whom he sits near): a set-valued outcome; on average 0.081 of the party's males are within 5 m at a scan.

## 4. Exclusions, units and sample sizes (questions 3 and 5)

| step, in order | train | development |
| --- | --- | --- |
| bouts given by the focal | 1,654 | 914 |
| partner is not a roster male (female, immature, unknown) | −137 | −97 |
| session has no party list | −9 | −3 |
| party has fewer than 2 males (no choice) | −79 | −52 |
| male partner outside the party | −59 | −39 |
| partner is focal in another part that day (same-day rule) | −393 | −275 |
| **eligible** | **977** | **448** |

**Independent unit.** Scan < bout < session < animal. The record is the bout; the inference unit is the focal animal (cluster bootstrap over animals; per-animal means beside pooled scores). Stricter units, reported beside the primary: the first bout with each partner in a session (882 train, 406 development) and the first bout of a session (750, 346). The scores hardly move between them (section 5), so bouts within a session are not inflating the result.

**Per animal.** Train: 34 animals, median 22 records, quartiles 8 to 42, maximum 85; 24 animals have at least 10 and 14 at least 30; the 5 animals with most hold 0.38 of the records. Development: 30 animals, median 8, maximum 81; 11 have at least 10; the 5 with most hold 0.574, and the unseen stratum rests on 9 animals. **Per year:** 34 to 92 eligible records a year in train (1998–2013), 10 to 99 in development; the table is in the generated file. No year has 2020.

**Splits that are possible:** later years of seen animals, and animals unseen as choosers, both built in. Not possible: an unseen community, an unseen dyad (every male is a partner everywhere), females.

## 5. Baselines a kernel must beat (question 6; train and development only)

Expected top-1 accuracy with ties split evenly; 95% intervals are cluster bootstraps over focal animals. History is as of the decision scan.

| rule | train (977 records, 34 animals) | development (448 records, 30 animals) |
| --- | --- | --- |
| chance, uniform over the set | 0.171 | 0.168 |
| most frequent past partner, grooming given | 0.389 (0.337 to 0.448) | 0.438 (0.357 to 0.493) |
| most frequent past partner, either direction | 0.389 (0.337 to 0.450) | 0.434 (0.355 to 0.489) |
| last partner groomed | 0.372 | 0.369 |
| nearest at the previous scan | 0.314 (0.282 to 0.352) | 0.310 (0.256 to 0.377) |
| the male grooming him at the previous scan | 0.283 | 0.261 |
| most frequent past neighbour, within 5 m | 0.347 | 0.436 |
| most frequent past party companion | 0.304 | 0.365 |
| **stack: groomed me, then nearest, then past partner** | **0.452 (0.399 to 0.511)** | **0.487 (0.416 to 0.548)** |

- **The bar is the stack**, not chance: a kernel that does not beat 0.45 to 0.49 has learned nothing a three-line rule does not know. The stack was defined before any score was seen.
- By what preceded the bout (train): when he was grooming or being groomed at the previous scan, the stack scores 0.605 and "the male grooming him" 0.609; on fresh bouts 0.403; on bouts with no previous scan 0.385. Development: 0.594, 0.431, 0.517. Development strata: 0.496 on unseen animals, 0.467 on seen animals in 2014–2015.
- Counting a partner outside the party as a miss for every rule: chance 0.161, past partner 0.367, stack 0.427 (train).
- Share of eligible records whose partner he had never groomed or been groomed by before, in the record: 0.147 (train), 0.100 (development). History from the open parts only is thinner than the animals' real history.
- **Order check (not a rule): picking the male written first in the party list scores 0.339 in train and 0.344 in development, and 0.587 and 0.556 on bouts already under way at the first scan.** The observer's order carries the answer. Candidates must be shuffled per record with a fixed seed, and a kernel is scored on several orders.
- **Power.** The development interval of the stack is about ±0.07. A kernel must beat it by roughly that much to be told apart on development; the sealed part is projected at the same size. Smaller gains cannot be shown with this dataset.

## 6. What the animal could know, and what is missing (question 4)

**Allowed in a packet:** the shuffled available set; what happened before the decision scan — grooming given and received by partner, who was within 2 m or in the 2 to 5 m ring at earlier scans, party co-membership on earlier days, who was grooming whom at the previous scan.

**Barred:** `combined_membership_labels.csv` and the three zips of yearly networks (built with knowledge of the later split and of whole years, the future included); `population_snapshots.csv` beyond a year's count of adult males; anything dated on or after the decision scan, including other sessions of the same day; proximity at the decision scan; the order of the party list; the animals' codes.

**Missing, and used by the simulation's kernels.** The rules' grooming score (`src/sim/candidates.ts`) adds bond, maternal kinship, recent grooming received, rank difference, alliance with the alpha, an invitation from a partner grooming the focal, tension, distance, hunger, rain and night. From a wild record only three have a counterpart: grooming received, the invitation, and distance in three coarse steps. **Rank, kinship, age, tension, body state (hunger, energy, stress, social need), time of day, weather and food are absent.**

**What the absence of females limits.** 0.091 of the partners a male grooms are in no set, so the benchmark cannot ask "a male or a female?", cannot score male-female grooming (oestrous females, mothers), and overstates how often a male is the answer. It says nothing about female or immature choosers. A kernel that does well here has been tested on male-male choices only.

## 7. From a wild record to a kernel's packet (question 7)

The packet is `DecisionContext` (`src/types.ts`), built for simulated animals by `observe()` (`src/sim/observe.ts`) and written out by `server/decide.ts`.

| field | from a wild record |
| --- | --- |
| `social[].id`, `name` | per-record pseudonym (never the code) |
| `social[].sex`, `stage` | male, adult: by the dataset's design ("mature" and "adult" both appear in the README; adolescents cannot be ruled out) |
| `social[].distance` | three steps from the **previous** scan: within 2 m, 2 to 5 m, further or unknown; masked when there is no previous scan (about a fifth of bouts) |
| `social[].action` | `groom` if in a grooming dyad at the previous scan; otherwise masked |
| `social[].bond` | not in the data. A value could be derived from past grooming and proximity, but the function would be ours; register it in R2 or mask it |
| `social[].relation` | `community` for all; kin relations and `ally`, `rival` masked |
| `social[].ageYears`, `rankOrder`, `isAlpha`, `tension`, `injured`, `hasMeat`, `swelling` | masked |
| `focal` | sex and stage only; rank, every need, mood, personality, skills masked |
| `environment` | `partyAdultMales` = set size + 1; `partySize`, hour, phase, weather, fruit, territory edge, strangers masked |
| `recent` | lines from earlier scans of the session ("B was grooming me at the last scan") |
| `history` | lines from earlier days, as ranks or coarse words ("groomed most often with B") |
| `candidates` | one `groom` option per set member and nothing else; no rules score or reason |
| `body`, `light` (stage M1) | masked |
| **label** | the option naming the partner |

**What this asks of stage R2 and R1.**
1. **A mask.** Today a missing value is a number that means something else (`rankOrder` 0 is a stranger or an immature; `bond` defaults to 0.15; distance is printed in metres). The packet needs a per-field "unknown" that the serializer leaves out, and both serializers must treat it alike.
2. **A menu wider than 8.** `observe()` keeps at most 8 individuals and `server/decide.ts` refuses more; 0.407 of training sets and 0.435 of development sets are larger (90th percentile 16 and 21, maximum 33). Either partner-choice packets may carry the whole set (the outside plan's parity check: "the full set of available partners on a partner-choice menu"), or RW is cut to sets of 8 or fewer: 579 training and 253 development records. Token counts of such packets were not measured here (no tokenizer was run).
3. **An "RW view" of simulated packets.** R2's ablation should include the view that keeps only the fields RW can fill, so a kernel can be scored on simulated and wild packets of the same shape. A kernel adapted on masked wild packets and then run on full packets is otherwise out of distribution.
4. **None of the Track E state that R2 adds (energy, gut, sleep, arousal, beliefs) can be filled.** RW cannot say whether the state matters; that stays R3's question.
5. **The rules kernel needs a world.** `rulesChoice` scores candidates from the `World`, not from a packet. To put the rules beside a model on wild records, R1 needs either a kernel interface the rules satisfy from a packet alone, or a small stub world built from the record. Until then the rules arm of RW is the stack above, which is the wild-data counterpart of the rules' three usable terms.
6. **Shuffled options and pseudonyms** are part of the contract (section 5).

## 8. A training example, and whether there are enough (rule change, point 3)

**An example** is the packet of section 7 (shuffled set of 2 to 33 males, earlier-scan and earlier-day history, everything else masked) with one label: the option naming the male he groomed. It is a ranking of partners given that he grooms. It carries no example of *not* grooming, of choosing a female, or of any other action.

**How many.** 977 from 34 males under the registered rules (750 if one per session; 579 with sets of 8 or fewer; 1,370 if the same-day rule were relaxed), across 362 chooser-partner pairs.

**Enough to evaluate a kernel: yes (moderate confidence).** 448 development and about 455 sealed records separate chance (0.17) from the stack (0.49) many times over, and can show a kernel beating the stack by about 0.07 or more.

**Enough to adapt a small model: only narrowly (low to moderate confidence).** Reasons:
- The project's own estimate for teaching GLiNER the new state was about 1,500 to 2,000 labelled decision points and about 600 probe pairs (`IMPLEMENTATION_PLAN.md`, M1–M3 result). Here there are 977, from 34 independent animals, for one option type.
- The signal is mostly what the stack already uses; 0.45 is reachable with no learning. What an adapter can add beyond that is at most the size of the gap between the stack and the unknown ceiling of a noisy choice, and gains under 0.07 cannot be verified.
- The labels cannot teach when to groom or what else to do, so they cannot move most scorecard rows by themselves; inside the loop the kernel faces full packets, not masked ones.
- The risk is a shortcut ("a masked packet means groom the most familiar male") that helps offline and does nothing, or harm, in the loop.
So the training part is fit for a low-capacity partner-ranking adaptation, or as a small, separately labelled share beside the rules' and the rubric's labels, checked on development against the stack and in the loop against the untuned kernel. It is not enough to be the main label source. This stage trained nothing.

## 9. Leakage against the scorecard (question 8; rule change, point 4)

Targets in `data/targets.json` (150) whose sources share this dataset or these animals. **For a kernel trained on the training part they count as compromised; for a kernel only scored on RW they are flagged.** The list is produced by the script (`leakage`), each target once under its closest overlap.

| overlap | targets |
| --- | --- |
| A. the same data package [sandel2026] | 3: T-FIS-1, T-FIS-3, T-FIS-5 (all held-out) |
| B. the same focal protocol and males, 1998–2007, probably the same records [mitani2009] | 2: T-SOC-1, T-SOC-2 (both held-out) |
| C. the same males, other records (kinship, fission, patrols, hunting, killings) | 29: T-ACT-2, T-PTY-2, T-IGE-1, T-PAT-1 to T-PAT-9, T-LET-4, T-LET-5, T-LET-6, T-FIS-2, T-FIS-4, T-HUN-1 to T-HUN-10, T-END-7, T-END-9 |
| D. the same community, other records (a field value from Ngogo) | 21: T-ACT-4, T-PTY-1, T-PTY-4, T-FOOD-1, T-FOOD-2, T-FOOD-3, T-DEM-1, T-DEM-2, T-DEM-3, T-DEM-6, T-DEM-7, T-DEM-9, T-DEM-10, T-DEM-12, T-ENE-2, T-RHY-4, T-RHY-10, T-END-2, T-INF-1, T-INF-2, T-INF-5 |

- **A and B are the real ones.** T-SOC-1 (male bond persistence) and T-SOC-2 (bonds mostly with non-kin) were measured on grooming and proximity of these males in these years; a kernel trained to reproduce these males' partner choices is being taught the answer to both. T-FIS-1, T-FIS-3 and T-FIS-5 come from the same package (T-FIS-5 from its patrol and population files, which RW does not read), and the networks behind the fission result are built from these scans.
- C and D share animals or the community, not behaviour that partner-choice labels can teach; they are listed because the rule asks for every one. Flagged in all: 55 of 150 targets (19 fitted, 36 held-out by their role in the file).
- `data/params.json`: one parameter (`socialUpkeep`, a design switch) cites [mitani2009] as a reference; none cites [sandel2026]. No constant of the rules was fitted on this file.
- Whether the five A and B rows are marked compromised in `data/targets.json` is a change under the protocol freeze and is the user's (decision 4).

## 10. What the outside plan's other datasets would add (question 9; nothing was downloaded)

| dataset | would add | needs from the user |
| --- | --- | --- |
| Taï grooming partner choice, Dryad t8c88vh (the outside plan's first choice) | by the outside review: individual choices with social context, both sexes, a second site and subspecies; its 1,529 events pool chimpanzees and sooty mangabeys | a manual download (the outside session got HTTP 401); its paper entered in `docs/research.md` first (missing); the chimpanzee rows isolated before any count |
| Sonso peering and demonstrator choice, Mendeley d7csyxvn3y (CC BY 4.0) | a choice of whom to attend to, with kin and age; 358 events on 28 focal animals by the outside review | approval to download; a `docs/research.md` entry (missing); the simulation has no "watch" action, so a mapping decision |
| Paternal association, Dryad t8p51 | kin-dependent association as a target; analysis tables, not choice records | a manual download (HTTP 401); a `docs/research.md` entry (missing) |
| Tool-use diffusion at Sonso, Dryad m6s21 | whether exposure predicts acquisition; not choice records | approval to download; a `docs/research.md` entry (missing; the Hobaiter 2014 paper in the file is the adoption one) |
| Handclasp social culture, Dryad 6wwpzgmxh | community traditions across changing membership; sanctuary, not wild | approval; an entry (missing) |
| Behavioural diversity across 144 communities; Gombe personality ratings | community repertoires; individual ratings. Neither has choice records | entries (both missing) |
| Already local: Gombe patrols, Dryad z8w9ghxdb | join-or-not counts with opportunities, rank and age, per individual-year: a coarse choice with the covariates RW lacks | nothing to download; a yearly rate is a target, not a choice record |
| In `docs/datasets.md`, not downloaded and not in the outside plan: Budongo party scans (Dryad 51b68), Kanyawara female relationships (Dryad 44j0zpchh) | both sexes; party membership at 15-minute scans; females as choosers | approval to download; entries in `docs/research.md` |

None of them has been inspected; what each "would add" is the outside review's description or the catalogue's, not a finding.

## 11. Decisions for the user

1. **Go or no-go** on building RW as registered here, knowing it tests one narrow decision.
2. **The same-day rule.** Strict as registered (977 and 448 records), or relaxed to drop a record only when the other part's session shows the same dyad (up to 1,370 and 723). Relaxing means the script reads sealed rows mechanically to drop records, without reporting them.
3. **How field labels weigh against the rules' and the rubric's labels in R4**, and whether a field-trained adapter is always a separate, named adapter. This document recommends separate and small (section 8).
4. **Marking T-SOC-1, T-SOC-2, T-FIS-1, T-FIS-3 and T-FIS-5 as compromised** for field-trained kernels in `data/targets.json` (a change under the freeze), and whether class C is flagged too.
5. **Reading the full text and supplement of [sandel2026]** and entering them in `docs/research.md`. It would settle what `party` is, what an empty proximity field means and who the 77 are, which is the main threat to validity. It needs the network.
6. **Menus wider than 8** for partner choice (R1, R2), or RW cut to sets of 8 or fewer.
7. **Whether wild-derived packets may go to an outside model** (Jev, or the outside plan's "Luna"). The data are CC0 and packets carry pseudonyms and no dates, but `data/raw` is private by the project's rule.
8. **Opening the sealed part:** once, at R5, by whom.
9. **Other datasets:** which, if any, to download (section 10).
10. Optional: grouped cross-validation over animals inside train and development instead of one development split, since about 60 animals is few.

## Sources and limits

- [sandel2026] Sandel et al. 2026, *Science*, doi:10.1126/science.adz4944; data Dryad doi:10.5061/dryad.sf7m0cgkg, CC0 (abstract level in `docs/research.md`). [mitani2009] (full text in `docs/research.md`).
- Missing from `docs/research.md` and named, not cited: the full text of [sandel2026]; every source of section 10 except the two Gombe and Ngogo patrol datasets.
- Privacy: nothing derived from raw rows is in git except aggregate counts and rates. Records and per-animal counts are in `artifacts/rw/` (gitignored). No animal code and no date finer than a year appears here or in the generated file (tested).
- Reproduce: `pnpm exec tsx scripts/rw-ngogo-choices.ts --md docs/staging/rw-numbers.md` (about 10 s); tests `pnpm exec tsx --test tests/rw-ngogo-choices.test.ts` (synthetic rows only).
