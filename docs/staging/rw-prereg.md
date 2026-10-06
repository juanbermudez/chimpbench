# RW: wild choice benchmark, registration

Stage RW of Track R (`IMPLEMENTATION_PLAN.md`, direction amendment of 6 October 2026). Branch `rw-wild-choice`, from track-e 24cf896.

**Status: version 1, registered before any outcome was computed.** Only these were looked at before this commit: the README and PROVENANCE of the dataset, the column names, the number of rows, sessions and focal animals per year, the punctuation shape of each field on development rows (letters and digits masked), and the number of animals the held-out rule selects. No grooming, proximity or party value has been counted or read. Sections marked *(to fill)* get their numbers from `scripts/rw-ngogo-choices.py` in version 2; nothing is typed by hand.

This stage runs no model, no simulation and no training. It decides whether a sound benchmark of individual wild choices can be built from data already on this computer, and registers its design.

## 1. Data and what is known about how it was collected

- **Dataset.** `data/raw/dryad-sf7m0cgkg/chimp_behav_data.csv`, from Sandel et al. 2026, Dryad doi:10.5061/dryad.sf7m0cgkg, CC0 [sandel2026]. Private (`AGENTS.md`, PROVENANCE): only aggregate counts and rates leave `data/raw`.
- **Structure counts (whole file).** 88,046 rows (scans), 12,536 focal sessions, 77 focal males, years 1998–2022 with no 2020; a session has 7 scans in 12,046 of 12,536 cases.
- **What the README says.** "Social behavior of mature male chimpanzees sampled at 10-minute intervals" in "hour-long observation sessions of adult males". `prox2`: others within 2 m of the focal. `prox5`: also described as "within 2 meters" (an error in the README; to be bounded from the data, section 4). `party`: "other mature males observed during 1 hour following the session". `gdyad`, `grooming`, `groomer`, `groomee`: who groomed whom. "NA" means no value.
- **What `docs/research.md` records.** [sandel2026] was read at abstract level only. The protocol is described for the same site, the same males and the first ten of these years by [mitani2009] (full text): "hour-long focal samples with 10-min scans of partners within 5 m or grooming", adult males of 16 years or more.
- **Not known (stated, not guessed).** Whether `party` is the party during the session hour or the hour after it; whether it is complete; whether `prox*` lists only mature males; how a grooming direction was assigned at an instantaneous scan; whether mutual grooming has its own code; the clock time of a session (the file has a date and a scan number, no time of day); whether the focal order was random; whether the 77 are all males who were ever adult or a subset. The full text of [sandel2026] and its supplement are **missing** from `docs/research.md`; reading them is a decision for the user (section 12).

## 2. The held-out part: rule fixed now

Fixed in this commit, before any outcome is computed, from structure counts only. A focal session is **held out** if either holds:

1. **Later years.** Its `year` is 2016 or later. Reason given in advance: [sandel2026] reports the network polarized in 2015 and two groups by 2018, so 2016–2022 is the split and its aftermath, a different social regime from the single community. 2,137 of 12,536 sessions.
2. **Unseen individuals.** Its focal animal is selected by `int(sha256("rw-heldout-v1:" + lowercase(code))[:8], 16) % 5 == 0`. The rule depends on nothing but the code. It selects 15 of the 77 focal animals.

Everything else is the **development part**: sessions of the other 62 focal animals in 1998–2015; 9,255 sessions, 64,982 scans.

Rules for the held-out part:
- The script reads held-out rows only to count rows, sessions and focal animals. It computes no grooming, proximity or party statistic on them unless it is run with `--unseal`, which is for stage R5 and needs the user's go.
- Held-out sample sizes in this document are **projections** from development rates, labelled as such.
- The held-out score, when it is unsealed, is reported in three strata, never pooled silently: unseen individuals in 1998–2015 (same regime, the confirmatory stratum); seen individuals in 2016–2022; unseen individuals in 2016–2022.
- Limit, stated now: an "unseen" animal is unseen as a chooser, not as a partner. He appears in the development sessions of other males, and grooming is dyadic, so this is a weaker split than a new community would be.
- History is input, not outcome: when a held-out record is finally scored, the kernel may see everything that happened before that scan, including earlier records of either part.

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

## 7. Baselines, development part only *(to fill)*

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

Field records are test records only: nothing here trains or fits a model on them ("field numbers are targets, never inputs"). No download, no network. Only sources already in `docs/research.md` are cited; a missing one is named as missing. No individual-level table, no date finer than a year and no copy of the CSV enters git; outputs go under `artifacts/` (gitignored).
