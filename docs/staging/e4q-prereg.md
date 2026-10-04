# E4q pre-registration: aggression without cooldowns

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e4q-aggression`, from `track-e`
aa698bd). The diagnosis readouts, field rows and their samples, mechanism, predictions and kill criterion are added and
committed before any run of a switch on. Track E, stage E4, piece q.

Rule served: field values of behaviour are targets, never inputs. No interval, value, bonus or weight is chosen to hit an
aggression or display rate.

## 0. The literals in question (S27, field profile; `src/sim/candidates.ts` at aa698bd)

Counted by E0b's ledger as quotas (rule L3: a time literal that bars an act for a fixed time after the animal's own last
act); S27 counts 51 prescriptions on the current ledger.

| Literal | Where | What it states | Moved S27 (E0b §6.3: 5 d; 20 d) |
| --- | --- | --- | --- |
| `time - x.lastAgg > 1.5` (`cooled`) | candidates.ts:946 | a ranked male's status challenge at his closest-rank rival, the E4a escalated attack, the grudge charge, the coercive charge at a swollen female and an adolescent male's charge at an adult female wait 1.5 h after his own last charge or attack | 0/2; 2/2 |
| `time - x.lastAgg > 0.2` | candidates.ts:1098 | a male's charge at strangers (with ≥ 3 own males, two more than theirs) waits 0.2 h after his own last aggression | 0/2; 0/2 |
| `time - x.lastDisplay > 0.75` (with energy > 0.3) | candidates.ts:775 | a male's display (status, reunion, rival) waits 0.75 h after his own last display | 2/2; · |

Out of scope: the mate guard's 0.25-h chase gap (execution.ts:807) belongs to stage E4p, running now.

## 1. Plan

1. Diagnosis (step 1, simulation truth, S27 quick: seeds 48 and 7, 30-day burn-in + 30 days): how often each literal
   binds (an offer withheld at a decision where it would otherwise have been chosen), challenges, charges and displays
   per male-hour, what is chosen instead, the arousal, stress and fast states and the assessed contest odds (E4h) at those
   moments; and, in scratch arms (diagnostic only, never a candidate), each behaviour's rate with the literal removed.
   Name what sets each rate, with numbers. (§2, written before its runs.)
2. Mechanism behind one new switch (0 = today), only for the literals the diagnosis implicates. (§4.)
3. At most three iterations, each logged here and committed before its run.

## 2. Diagnosis (step 1)

(to be registered before its runs)

## 3. Field rows and readouts

Sources already in docs/research.md (E.45, "Addendum: E4h contests") give per-male-hour rates; their Methods are quoted in
§3 before any arm: mullerWrangham2004b (Kanyawara 1998, 9 adult males, 40-min group focal follows, charging displays and
chases and attacks per observation hour, parties with at least two adult males), wranghamWilsonMuller2006 (contact
aggression per male-hour), muller2007 (per-dyad rates), mouginot2024 (Gombe males, dyadic aggression per focal hour).
T-DEM-23 (aggression received by immatures) is a sealed C8 proof row: e-bench does not compute it (sealed means never
computed, early-life-prereg.md ruling), so it is not computed here.

## 4. Mechanism

(after the diagnosis)

## 5. Reference and judging

Reference: S27 quick (docs/staging/e-stack2-confirm.md, "S26 and S27 results"), run once plus three re-draws (`rngSalt`
1, 2, 3) at bench-run3 28d249e (simulation code identical to aa698bd for S27), each with energy-diagnose (seeds 48 and 7,
burn-in 30, days 30): `bench-run3/artifacts/validation/e/s27q/{S27q,S27q1,S27q2,S27q3}.json` and `…-energy.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4, T-BRD-1 and T-IGE-3 (amendment 3). Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

(each entry written and committed before its run)
