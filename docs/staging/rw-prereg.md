# RW: wild choice benchmark, registration

Stage RW of Track R (`IMPLEMENTATION_PLAN.md`, direction amendment of 6 October 2026). Branch `rw-wild-choice`, from track-e 24cf896.

**Status: version 2 (three parts after the user's rule change; baselines not yet computed). Version 1 was registered before any outcome was computed.** Only these were looked at before this commit: the README and PROVENANCE of the dataset, the column names, the number of rows, sessions and focal animals per year, the punctuation shape of each field on development rows (letters and digits masked), and the number of animals the held-out rule selects. No grooming, proximity or party value has been counted or read. Sections marked *(to fill)* get their numbers from `scripts/rw-ngogo-choices.py` in version 2; nothing is typed by hand.

This stage runs no model, no simulation and no training. It decides whether a sound benchmark of individual wild choices can be built from data already on this computer, and registers its design.

## 1. Data and what is known about how it was collected

- **Dataset.** `data/raw/dryad-sf7m0cgkg/chimp_behav_data.csv`, from Sandel et al. 2026, Dryad doi:10.5061/dryad.sf7m0cgkg, CC0 [sandel2026]. Private (`AGENTS.md`, PROVENANCE): only aggregate counts and rates leave `data/raw`.
- **Structure counts (whole file).** 88,046 rows (scans), 12,536 focal sessions, 77 focal males, years 1998–2022 with no 2020; a session has 7 scans in 12,046 of 12,536 cases.
- **What the README says.** "Social behavior of mature male chimpanzees sampled at 10-minute intervals" in "hour-long observation sessions of adult males". `prox2`: others within 2 m of the focal. `prox5`: also described as "within 2 meters" (an error in the README; to be bounded from the data, section 4). `party`: "other mature males observed during 1 hour following the session". `gdyad`, `grooming`, `groomer`, `groomee`: who groomed whom. "NA" means no value.
- **What `docs/research.md` records.** [sandel2026] was read at abstract level only. The protocol is described for the same site, the same males and the first ten of these years by [mitani2009] (full text): "hour-long focal samples with 10-min scans of partners within 5 m or grooming", adult males of 16 years or more.
- **Not known (stated, not guessed).** Whether `party` is the party during the session hour or the hour after it; whether it is complete; whether `prox*` lists only mature males; how a grooming direction was assigned at an instantaneous scan; whether mutual grooming has its own code; the clock time of a session (the file has a date and a scan number, no time of day); whether the focal order was random; whether the 77 are all males who were ever adult or a subset. The full text of [sandel2026] and its supplement are **missing** from `docs/research.md`; reading them is a decision for the user (section 12).

## 2. Three parts: rule fixed now (version 2, after the user's rule change)

**Rule change (user, 6 October 2026, relayed by the integrator; recorded in `IMPLEMENTATION_PLAN.md` on track-e at 1e052c3):** "yes, i would say field choices are the source of truth, so it should be part of the training data, when we ar eoptimizing the specialized model, and adapting its behavior." Recorded wild choices may now be training labels for the decision kernel. This replaces "test records only" in version 1. The benchmark therefore needs three parts.

**What had been looked at when this rule was written.** Version 1 fixed the held-out part (below, unchanged) before any outcome was read. Between version 1 and this version, on the pooled rows that are not held out, only the coding of the fields was examined: how often each field is filled, how `gdyad` writes direction, mutual grooming and several dyads, that such scans are stored as several rows, that `prox2` and `prox5` share no animal, that `party` is written on a session's first scan, and how many names are off the male roster. No baseline, no available-set coverage, no record count per animal or year and no choice-set size had been computed. The split of those rows into train and development below was fixed from structure counts only (rows, sessions, animals).

With `h = int(sha256("rw-heldout-v1:" + lowercase(code))[:8], 16) % 5` for the focal animal of a session:

| part | rule | sessions | focal animals | scans |
| --- | --- | --- | --- | --- |
| **held-out (sealed)** | year 2016 or later, or `h == 0` (unchanged from version 1) | 3,281 | 54 | 22,915 |
| **development** | not held out, and year 2014 or 2015, or `h == 1` | 3,233 | 33 | 22,586 |
| **train** | the rest: `h` in 2, 3, 4 and year 1998–2013 | 6,022 | 38 | 42,085 |

Development mirrors the held-out part on purpose, so that what is chosen on development says something about the sealed score: it has unseen animals (10, with 2,701 sessions in 1998–2015) and later years of animals seen in training (23 animals, 532 sessions in 2014–2015), as the held-out part has unseen animals in 1998–2015, seen animals in 2016–2022 and unseen animals in 2016–2022.

**Why this prevents leakage, and what it does not prevent (declared).**
- *The same bout.* A session belongs to one focal animal and one day, so it lies in one part, and a bout is defined inside a session. But two males can be focal animals on the same day, and then one bout can be written in two sessions of different parts. Rule: a record whose partner is the focal animal of a session of another part on the same day is flagged `sameDayOtherPart`, kept in the counts, and left out of training and of the scores (a rule on codes and dates only, so it can be applied against the sealed part without reading its outcomes). Sessions of the same day never enter a record's history either (the file has no clock time).
- *The same male.* No male is a chooser in more than one of: train, the unseen-animal stratum of development, the unseen-animal strata of the held-out part. A male does appear as a chooser in train and in the later-years strata (that is their point: the same animals later), and every male appears as a partner in every part. So "unseen" means unseen as a chooser, not a new community. Declared.
- *The same dyad history.* Grooming is dyadic and reciprocal, so A's choices of B in one part and B's choices of A in another are not independent. This cannot be removed with 77 males in one community; it is declared, and it is the main reason the unseen-animal strata are a weaker test than a second community would be. A packet must carry per-record pseudonyms, never the animal's code, so that a trained kernel cannot memorise identities or dyads across parts and can use only what the packet says about history.
- *History is input, not outcome,* but it must come from the same place for every part. For train and development records it is built from train and development sessions of earlier days and earlier scans of the same session; sealed sessions never enter it. When the held-out part is unsealed its records get history from all earlier sessions, and a second score with history from train and development sessions only is reported beside it, because history counts built from fewer sessions are smaller. Packets should carry history as ranks or coarse words, not raw counts, for the same reason.

**The sealed part.** The script reads held-out rows only to count rows, scans, sessions and animals; every outcome field of a held-out row is blanked at load unless it is run with `--unseal`, which is for stage R5 and needs the user's go. Held-out sample sizes here are **projections** from the development rate, labelled as such. Baselines are computed on train and development only. The sealed score, when it is opened, is reported per stratum, never pooled silently.

**Use of the parts.** Train: labels for adapting a kernel (stage R4), and nothing else is fitted on any other part. Development: choosing among packet wordings, kernels and training settings. Held-out: one final score per kernel.

## 3. One wild choice record (provisional definitions, fixed before the development numbers)

**Task A, primary: whom the focal grooms.** One record is one grooming bout given by the focal animal. A bout is a maximal run of consecutive scans of one focal session in which the focal is a groomer of the same partner. The label is the partner. The decision time is the first scan of the bout. Six consecutive scans of one bout are one choice.
- Sensitivity units, reported beside the primary: one record per (session, partner); one record per session (its first bout).
- Bouts in which the focal only receives grooming are counted, not scored: the chooser is the other animal, and his proximity is not recorded.
- A bout already under way at the first scan of a session is kept and flagged (its start was not seen).

**Task B, secondary: whether he grooms at all at a scan**, among scans with at least one male recorded as available. Reported as a base rate; a kernel has almost no input for it here (no body state, no food, no time of day).

**Task C, secondary: whom he sits within 2 m or 5 m of.** A set-valued outcome, not one choice; reported as association, not as accuracy.

**The available set.** Candidates, compared on the development part by coverage (the chosen partner is in the set) and size:
- `party`: the session's `party` list;
- `prox-before`: males within 5 m at the previous scan of the session;
- `union`: party, plus everyone named in any proximity or grooming field of the session before the decision scan.
The label is never used to build the set. A record whose partner is outside the set is **excluded with a reason and counted**; a second score counts it as a miss for every kernel. The partner is never added to the set after the fact.

**Proximity at the decision scan is not an input.** Grooming needs contact, so "who is within 2 m now" contains the answer. Proximity enters only from earlier scans.

## 4. Planned development analysis *(to fill)*

Filling of each field per row and per session; whether `party` is session-level; `prox2` against `prox5` (subset, superset or disjoint rings) to bound the README error; coverage and size of each available set; share of sets larger than 8 (the simulation's cap on the social percept); bouts per session, per individual, per year; exclusions in order with counts.

## 5. Exclusions, in order *(counts to fill)*

Session has no usable scan order; scan has no grooming record; focal is not the groomer; partner code not parseable or equal to the focal; more than one partner at the decision scan (kept as a multi-label record, scored as a hit if the pick is any of them); no available set recorded; available set has fewer than 2 members (no choice); partner outside the set.

## 6. Independent unit

Scan < bout < session < focal-day < individual < year. The record is the bout. Uncertainty is a cluster bootstrap over focal individuals (the independent unit for inference), with the per-individual score as the summary and per-year scores beside it. Sessions and bouts are never treated as independent draws.

## 7. Baselines, train and development parts only *(to fill)*

- **Chance:** uniform over the available set, as the mean of 1/|set| over records.
- **Most frequent past partner:** the member of the set the focal groomed most often before the decision scan (earlier dates, and earlier scans of the same session); ties and no-history cases fall back to uniform over the tied members.
- **Nearest:** the member of the set closest at the previous scan of the session (2 m before 5 m before the rest); ties and bouts at a session's first scan fall back to uniform over the tied members.
- **Last partner** and **most frequent past neighbour** as further simple rules.
Scores are top-1 accuracy as an expectation over ties (no random draw), per record and as the mean of per-individual means.

## 8. What the animal could know, and what is missing *(to fill)*

Allowed inputs: the available set; events before the decision scan (grooming given and received, proximity, party co-membership, by partner); how long each male has been in the record. Barred: `combined_membership_labels.csv` and the yearly network files (they are built from the whole period, including the future); anything dated at or after the decision scan; the label.
Missing from the data, used by the simulation's kernels: dominance rank, kinship, age, body state (hunger, energy, stress), time of day, food, females and immatures.

## 9. Mapping to the kernel's packet *(to fill)*

Which fields of `SocialPercept` and `DecisionContext` (`src/types.ts`, `src/sim/observe.ts`) can be filled from a record and which must be masked; what that asks of stage R2.

## 10. Leakage *(to fill)*

Targets in `data/targets.json` and parameters in `data/params.json` whose sources share these records or these animals.

## 11. Verdict *(to fill)*

## 12. Decisions for the user *(to fill)*

## Hard rules of this stage

Since the user's rule change of 6 October field choices of the training part may be training labels for the decision kernel; this stage itself trains nothing. No download, no network. Only sources already in `docs/research.md` are cited; a missing one is named as missing. No individual-level table, no date finer than a year and no copy of the CSV enters git; outputs go under `artifacts/` (gitignored).
