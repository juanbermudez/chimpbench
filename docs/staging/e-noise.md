# Track E noise threshold (integrator, registered 1 October 2026 before any noise arm ran)

## Why

Stages registered five different thresholds (0.3/0.5, 0.8, ~1, 1.1) while their own noise arms moved the summed band
distances by 1.1 (E4a, quick) and by −1.37 / −3.13 (E4c, quick), mostly through hunting, patrol and intergroup rows
(handoff §4.5, §8 item 7). The simulation is deterministic but chaotic: a change that alters one draw in thousands
re-draws the whole trajectory, so any two runs that differ at all differ by at least this much. One threshold per
benchmark mode, measured once, replaces the stage-by-stage values.

## Noise arms

A noise arm is a reference plus `rgTemperature` 0.164 → a value within 0.06% of it. That changes the choice softmax
by a behaviourally negligible amount and re-draws the trajectory (E4a and E4c used 0.1641). Every arm is compared
with its own reference, with `e-bench --compare`, on rows scored in both runs.

| Arm | Reference | Override added |
| --- | --- | --- |
| NB1 | B (all switches off) | `rgTemperature` 0.1641 |
| NR1 | R (the E1h reference stack, handoff §3) | `rgTemperature` 0.1641 |
| NR2 | R | `rgTemperature` 0.1639 |

Two references, so the threshold covers both today's model and the stack, where hunting is about twice as frequent
and the hunting rows are noisier.

Runs: field profile, rules policy, `--workers 2`, one at a time, from the frozen checkout `.claude/worktrees/bench-run`
at the commit that adds this file (simulation code identical to 56342c2).
- **Confirm mode** (seeds 48, 7, 21, 5, 11; 30 + 60 days): the references are the E1h confirm's `base-head` and
  `e1h-R` (e1h-prereg.md §9; same simulation code), re-scored at this commit; three new runs.
- **Quick mode** (seeds 48, 7; 30 + 30 days): new references `base-quick` and `R-quick` (shared: any stage may reuse
  them as its quick B or R reference) and three new runs.
Outputs in `artifacts/validation/e/noise/` (gitignored).

## Rule

For each mode, and separately for the fitted and the held-out sums, each computed twice (all shared rows; without
T-HUN-4 and T-BRD-1, `RARE_EVENT_ROWS` in `scripts/e-bench.ts`):

- Δ_i = the arm's change on rows scored in both, for the three arms;
- **threshold = 2 × √(mean Δ_i²), rounded up to the next 0.1** (two standard deviations of the change between two
  runs that differ only by chance; three arms give a rough estimate, so the largest |Δ_i| is reported beside it).

A stage's difference on shared rows is a result only if it exceeds the threshold for its mode, sum and row set;
otherwise it is "inside noise". Both row sets are always reported; a stage verdict names the one its prereg
registered. The thresholds go into IMPLEMENTATION_PLAN.md ("Track E") and apply to every pre-registration written
after they are recorded. A pre-registration written before then keeps its own registered threshold for its verdict;
the new one may be applied to its saved runs with `e-bench --rescore` as a separate, later reading.

Re-measure when the scorer, the targets or the benchmark modes change, or when a new reference stack becomes the
common base.

## Amendment (2 October 2026, after the three quick arms, before any stage used a threshold)

The three quick arms gave held-out changes of +0.16, −0.09 and −0.26 on all shared rows (rule: threshold 0.4), while
two quick noise arms already on record moved held-out by more: E4a's by +1.1 (raw sum) and E4c's by −3.13 (rows scored
in both). Three arms are too few to estimate the held-out spread. Both modes are therefore extended to six arms,
balanced over the two references, at the same commit and against the same references, and the threshold is recomputed
on all six by the same rule:

| Arm | Reference | Override added |
| --- | --- | --- |
| NB2 | B | `rgTemperature` 0.1639 |
| NB3 | B | `rgTemperature` 0.16405 |
| NR3 | R | `rgTemperature` 0.16405 |

This amendment was written knowing the first three quick values (one confirm-mode arm, NB1c, had finished but its result had not been read);
it adds samples and leaves the rule unchanged. The E4a and E4c arms (other commits, other references) are reported
beside the result, not pooled.

## Results (2 October 2026; every number generated from the JSON by the integrator's scripts `noise_threshold.py` and `replicates.py`)

All twelve noise runs at 612bf15, clean (`git.dirty` 0); references `base-quick` and `R-quick` at 612bf15, `base-head`
and `e1h-R` at 9392b67 (identical simulation code: the commits between them touch scripts and docs only).

**By the registered rule** (2 × RMS of each arm's change against its single reference, six arms):

| Mode | Fitted | Held-out, all shared rows | Held-out without T-HUN-4 and T-BRD-1 |
| --- | --- | --- | --- |
| Quick | 2.4 (Δ +0.57, −1.37, −1.70, −0.77, +0.23, −1.56) | 3.5 (Δ +0.16, −0.09, −0.26, −3.16, −2.78, +0.21) | 1.9 (Δ −0.85, −0.24, −0.26, −1.54, −1.22, −0.60) |
| Confirm | 1.6 (Δ −0.28, −0.72, −1.32, −0.85, −0.19, −0.72) | 5.8 (Δ −1.51, −2.87, −4.67, −2.07, −2.30, −2.80) | 1.0 (Δ −0.52, −0.46, −0.58, −0.37, −0.39, −0.60) |

**The rule is biased, and the bias is visible.** In confirm mode all twelve changes are negative: the simulation code is
the same, so the arms are not noise centred on zero; the two references (`base-head`, `e1h-R`) happen to be draws with
high distance. A change measured against one reference run carries that run's own luck, and every arm compared with
it inherits the same offset. The noise of a comparison has to be estimated from the spread of exchangeable runs.

## Amendment 2 (2 October 2026, written after all results above were seen; disclosed)

Method from now on: a reference and its noise re-draws are exchangeable realizations of one model. On rows counted in
every run compared, the per-run SD of each sum is pooled over the two reference groups (B and R, four runs each, six
degrees of freedom). A single arm is judged against the **mean of its reference's realizations**: z = (arm − reference
mean) ÷ (SD × √(1 + 1/n)), n the number of reference realizations; |z| > 2 is a result, anything less is "inside
noise". Two single runs compared directly differ by chance up to 2·√2·SD.

| Mode | Per-run SD: fitted / held-out / held-out without rare rows | Single run vs single run (2·√2·SD) | Single run vs the mean of 4 reference runs (2·SD·√1.25) |
| --- | --- | --- | --- |
| Quick (15 / 12 / 11 rows) | 0.69 / 1.26 / 0.48 | 2.0 / 3.6 / 1.4 | 1.6 / 2.9 / 1.1 |
| Confirm (16 / 14 / 12 rows) | 0.30 / 1.45 / 0.21 | 0.9 / 4.1 / 0.6 | 0.7 / 3.3 / 0.5 |

Practice for every stage from now on: run the reference once and re-draw it three times (`rgTemperature` 0.1641,
0.1639, 0.16405 added to its overrides); judge each arm against the reference mean with the SDs above (or with the
stage's own reference spread if that is larger). The integrator's shared realizations: `base-quick` + `NB1q..NB3q`,
`R-quick` + `NR1q..NR3q` (quick, 612bf15); `base-head` + `NB1c..NB3c`, `e1h-R` + `NR1c..NR3c` (confirm), all in
`bench-run/artifacts/validation/e/` and `…/e/noise/`. They stay valid while the simulation code with every new switch
at 0 is unchanged (the field pin and an identity run check it).

**Readings this gives at once (confirm, against the four-run means):**
- E1h (e1h-prereg.md §9): T against R's mean: fitted −0.98 (z −2.9, a result: T-ACT-1 0.19 → 0, T-ACT-3 0.53 → 0.10),
  held-out without rare rows −0.38 (z −1.6, inside noise), with them +2.20 (z +1.4, inside). G: fitted −0.49 (z −1.5),
  held-out +0.00 (z 0.0) and +2.82 (z +1.7): inside noise.
- R against B (the stack against today's model): fitted +0.39 (inside), held-out without rare rows **+0.79** (beyond
  0.6: mostly T-RNG-5, mothers' day range relative to males, +0.49; T-SOC-6 +0.19; T-FOOD-7 +0.15), with them −0.20
  (inside).
- Rare-event rows: T-BRD-1 has a per-run SD of 1.55 on R and 0.38 on B; T-HUN-4 1.10 on B and 0.25 on R. A single
  60-day run cannot judge either.
