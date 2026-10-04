# E5e pre-registration: social quotas and clocks

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e5e-social-quotas`, from `track-e`
8cae2c4). Diagnosis readouts, field rows, mechanism, predictions and kill criterion are added and committed before any
run of a switch on. Track E, stage E5, piece e.

Rule served: field values of behaviour are targets, never inputs. No interval, hour or distance scale is chosen to hit a
rate, a travel share or a day range.

## 0. The entries in question (S13, field profile; `src/sim/candidates.ts` at 8cae2c4)

| Entry | Value (field) | Where | What it states |
| --- | --- | --- | --- |
| `pantGruntRepeatH` | 8 h | candidates.ts:584 | a subordinate pant-grunts to the same dominant at most once per 8 h (a quota per dyad) |
| `feedChargeGapH` | 0.75 h | candidates.ts:822 | at most one feeding charge per 45 min after the animal's last aggression (a quota) |
| `immigrantChargeGapH` | 0.75 h | candidates.ts:814 | at most one charge at an immigrant female per 45 min after the last aggression (a quota) |
| `consortLatestHour` | 16 | candidates.ts:951 | a consortship can start only before 16:00 (a clock hour) |
| `joinCallDistScaleM` | 1,500 m (field; 60 m compressed) | candidates.ts:442 | the approach to a heard caller loses 1 score unit per 1,500 m (fitted to T-ACT-2 and T-RNG-4 in C5a) |

Note: the brief names 60 m for `joinCallDistScaleM`; that is the compressed default. The field profile, which every
Track E run uses, overrides it to 1,500 m (data/params.json, `profiles.field`).

Each states how often or when a behaviour happens. From first principles: greeting is given on reunion and where a
relationship is uncertain, so it should follow from memory of the last meeting and the relationship; a charge's
repetition should follow from the aggressor's state and the target's response (E4a's states, E4h's assessment); a
consortship needs daylight left to travel away from rivals, so daylight and sleep pressure can replace the clock; a walk
to a caller costs energy and time in the same currency as foraging (E3c; sockol2007).

## 1. Plan

1. Diagnosis (step 1, simulation truth, S13 quick: seeds 48 and 7, 30-day burn-in + 30 days): for each entry, how
   often it binds (the share of opportunities it blocks), the animals' states and memories when it binds, and each
   behaviour's rate per dyad and per animal-day with the entry removed in a scratch arm (diagnostic only). Name the
   entries that set their behaviour's rate rather than trim it, with numbers. (§2, written before its runs.)
2. Mechanism behind one new switch (0 = today), only for the entries the diagnosis implicates. (§4.)
3. At most three iterations, each logged here and committed before its run.

## 2. Diagnosis (to be written before its runs)

## 3. Field rows scored and their samples (to be written before any arm)

## 4. Mechanism (to be written before any code of it)

## 5. Reference and judging

Reference: S13 quick (docs/staging/e-stack2-confirm.md "S13 results"), run once plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405) by the integrator at bench-run3 ea92d20 (simulation code identical to 8cae2c4 for S13), each
with energy-diagnose (seeds 48, 7, burn-in 30, days 30): `bench-run3/artifacts/validation/e/s13q/{S13q,S13q1,S13q2,S13q3}.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4 and T-BRD-1, and without T-IGE-3. Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

## 7. Results
