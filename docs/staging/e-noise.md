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

## Results

(Filled in after the runs.)
