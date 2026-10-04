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

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**Tool.** `scripts/quota-diagnose.ts` (readouts defined in its header), simulation truth. It reads the five gates as
candidates.ts evaluates them through a hook, `quotaTrace` (candidates.ts; null in every simulation, reads only, draws
nothing: S13 seed 48 after 2 days hashes 5e062689df89591c at 8cae2c4 and with the hook), the contests through
`contestTrace` and the RG decisions through `rgTap`. Smoke test: S13, seed 48, 1 + 1 days (4 s); every block filled except
the immigrant and consort gates, which had no opportunity that day.

**Definitions** (header of the tool, in short):
- *Opportunity*: a decision at which every other condition of the gated option holds for this target (greeting: a
  subordinate ≥ 5 y and a dominant in sight within `pantGruntRangeM`; feeding charge: a subordinate feeding, scarce
  fruit, in range, not kin or ward; immigrant charge: a resident female ≥ 15 y and a female < 2 y after immigration in
  range; consortship: a non-alpha male ≥ 15 y, a swollen female he is bonded to, not guarded). *Blocked*: the quota or
  clock removed it. For `joinCallDistScaleM` (a scale, not a gate): every approach offered, its distance term d ÷ 1,500
  and its choice probability with and without that term (first step, menu held fixed).
- *Association*: two community members ≥ 5 y within `sightDayM` (35 m) at a 5-min scan, any hour; a *reunion* is the
  first such scan (or greeting opportunity) after ≥ 1 h apart, the model's own reunion span (perception.ts newcomers).
- *Memory and state at a blocked opportunity*: hours since the gated event (last greeting of that dominant; last
  aggression), whether the subordinate already greeted that dominant in the current association bout, the bout's age,
  the Elo gap, whether the dominant is the alpha or displaying; for charges, what the last aggression was, whether at the
  same target and the target's last response (contestTrace); hunger, stress, arousal, fast arousal; for consortships the
  daylight left (hours until daylight < 0.1), sleep pressure, energy. Whether the blocked option's would-be score exceeds
  the score of the option the animal chose (RG decisions only, ≥ 8 y).
- *Rates*: pant-grunts per subordinate-day (chimp-days ≥ 5 y), per dyad-day (ordered pairs subordinate ≥ 5 y → eligible
  dominant, counted at each day's midpoint) and per co-present dyad-day (pairs with ≥ 1 opportunity that day); first in
  their association bout or repeats; feeding charges per adult-day (≥ 15 y); charges at immigrants per resident
  female-day; consortships started per adult-male-day and by hour of day, their duration, path and minutes in darkness;
  approaches to callers per chimp-day by class, their path, minutes and locomotion kcal, and km per day walked to callers.

**Runs** (seeds 48 and 7; 30-day burn-in + 30 days; S13 = `bench-run3/artifacts/validation/e/s13q/S13q-params.json`):
- **D0**: S13 and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405): the reference spread of every readout.
- **Scratch arms (diagnostic only, never a candidate)**, S13 with one entry removed each: **D1** `pantGruntRepeatH` 0;
  **D2** `feedChargeGapH` 0; **D3** `immigrantChargeGapH` 0; **D4** `consortLatestHour` 24; **D5** `joinCallDistScaleM`
  1,000,000 (its hard maximum: the distance term ≤ 0.008 on the map).

**Decision rule (registered).** An entry *binds* if it blocks ≥ 10% of its opportunities in D0 (mean of the four runs).
It *sets its behaviour's rate* if it binds and removing it multiplies the behaviour's rate per animal-day by ≥ 1.5 or
≤ 1/1.5, beyond 2 SD of D0's four runs (pant-grunts per subordinate-day; feeding charges per adult-day; charges at
immigrants per resident female-day; consortships per adult-male-day; for the distance scale, km walked to callers per
adult-male-day or approaches per chimp-day). It *trims* if it binds and the rate moves less than that; it is *inert* if it
blocks < 10% or has < 30 opportunities pooled over D0. Fewer than 30 events in both D0 and its arm: "too few to name".
For the clock (`consortLatestHour`) the timing is reported as well: the share of D4's consortships started at or after
16:00, and their minutes in darkness. Only entries that set a rate (or a timing) go to step 2.

### 2.1 Diagnosis results (frozen checkout of 25d9820, clean; S13 seeds 48 and 7, 30 + 30 days; simulation truth)

Printed by `diag_table.py` (stage scratch `e5e/`) from the quota-diagnose JSON: D0 = mean ± SD of S13 and its three
re-draws; each scratch arm as its value and its ratio to the D0 mean.

```
reference runs: ['D0', 'D0r1', 'D0r2', 'D0r3']; arms: ['D1', 'D2', 'D3', 'D4', 'D5']
readout                                                D0 mean ± SD (n)               D1               D2               D3               D4               D5
greet: blocked share                                  0.502 ± 0.008  (4)    0.086 ×0.17      0.518 ×1.03      0.497 ×0.99      0.498 ×0.99      0.491 ×0.98   
greet: opportunities                             206982.000 ± 19134.374(4) 236258.000 ×1.14   187351.000 ×0.91   236270.000 ×1.14   217350.000 ×1.05   354453.000 ×1.71   
greet: blocked outranks chosen                        0.497 ± 0.013  (4)    0.724 ×1.46      0.504 ×1.01      0.495 ×0.99      0.479 ×0.96      0.478 ×0.96   
greet: blocked, already greeted this bout             0.736 ± 0.014  (4)    1.000 ×1.36      0.753 ×1.02      0.722 ×0.98      0.733 ×1.00      0.655 ×0.89   
greet: blocked, mean bout age h                       4.121 ± 0.288  (4)    4.651 ×1.13      4.573 ×1.11      4.007 ×0.97      4.530 ×1.10      3.041 ×0.74   
pant-grunts given                                  5504.000 ± 255.407(4) 20207.000 ×3.67   5009.000 ×0.91   5975.000 ×1.09   5260.000 ×0.96   8359.000 ×1.52   
pant-grunts per subordinate-day                       2.237 ± 0.104  (4)    8.214 ×3.67      2.036 ×0.91      2.429 ×1.09      2.138 ×0.96      3.398 ×1.52   
pant-grunts per dyad-day                              0.342 ± 0.016  (4)    1.272 ×3.72      0.313 ×0.92      0.373 ×1.09      0.333 ×0.97      0.522 ×1.53   
pant-grunts per co-present dyad-day                   0.682 ± 0.022  (4)    2.656 ×3.90      0.684 ×1.00      0.672 ×0.99      0.681 ×1.00      0.694 ×1.02   
repeats in bout                                     307.500 ± 24.201 (4) 14858.000 ×48.32   333.000 ×1.08    315.000 ×1.02    329.000 ×1.07    266.000 ×0.87   
first in bout                                      5196.500 ± 249.967(4) 5349.000 ×1.03   4676.000 ×0.90   5660.000 ×1.09   4931.000 ×0.95   8093.000 ×1.56   
to alpha share                                        0.235 ± 0.007  (4)    0.499 ×2.12      0.214 ×0.91      0.255 ×1.08      0.244 ×1.04      0.230 ×0.98   
male-male to top 3 (truth)                            0.799 ± 0.021  (4)    0.922 ×1.15      0.813 ×1.02      0.825 ×1.03      0.819 ×1.03      0.802 ×1.00   
latency from reunion min                            101.585 ± 3.481  (4)   87.275 ×0.86    107.270 ×1.06     98.977 ×0.97    109.999 ×1.08     93.316 ×0.92   
feed: blocked share                                   0.074 ± 0.011  (4)    0.062 ×0.83      0.000 ×0.00      0.080 ×1.07      0.064 ×0.86      0.112 ×1.50   
feed: opportunities                                5352.750 ± 478.425(4) 5052.000 ×0.94   4651.000 ×0.87   5971.000 ×1.12   5390.000 ×1.01   12278.000 ×2.29   
feed: blocked outranks chosen                         0.012 ± 0.004  (4)    0.014 ×1.19      0.000 ×0.00      0.006 ×0.51      0.017 ×1.45      0.016 ×1.36   
feed charges started                                 91.500 ± 7.188  (4)   78.000 ×0.85     82.000 ×0.90     94.000 ×1.03     81.000 ×0.89    134.000 ×1.46   
feed charges per adult-day                            0.049 ± 0.004  (4)    0.042 ×0.86      0.044 ×0.90      0.051 ×1.04      0.044 ×0.90      0.072 ×1.47   
immigrant: blocked share                              0.307 ± 0.029  (4)    0.329 ×1.07      0.323 ×1.05      0.000 ×0.00      0.313 ×1.02      0.329 ×1.07   
immigrant: opportunities                           2243.250 ± 739.643(4) 2582.000 ×1.15   1279.000 ×0.57   1605.000 ×0.72   1337.000 ×0.60   1726.000 ×0.77   
immigrant: blocked outranks chosen                    0.410 ± 0.029  (4)    0.318 ×0.78      0.414 ×1.01      0.000 ×0.00      0.445 ×1.08      0.370 ×0.90   
immigrant: blocked, same target                     650.000 ± 273.329(4)  773.000 ×1.19    385.000 ×0.59      0.000 ×0.00    410.000 ×0.63    462.000 ×0.71   
immigrant charges started                           140.250 ± 47.884 (4)  150.000 ×1.07     75.000 ×0.53    142.000 ×1.01     88.000 ×0.63     95.000 ×0.68   
immigrant charges per resident female-day             0.141 ± 0.048  (4)    0.152 ×1.07      0.076 ×0.54      0.143 ×1.01      0.089 ×0.63      0.096 ×0.68   
immigrant female-days                                30.000 ± 0.000  (4)   30.000 ×1.00     30.000 ×1.00     30.000 ×1.00     30.000 ×1.00     30.000 ×1.00   
consort: blocked share                                0.249 ± 0.166  (4)    0.323 ×1.30      0.175 ×0.70      0.444 ×1.78      0.000 ×0.00      0.319 ×1.28   
consort: opportunities                              359.000 ± 354.522(4) 1141.000 ×3.18     97.000 ×0.27     63.000 ×0.18    786.000 ×2.19    182.000 ×0.51   
consort: blocked outranks chosen                      0.141 ± 0.104  (4)    0.220 ×1.55      0.353 ×2.49      0.107 ×0.76      0.000 ×0.00      0.086 ×0.61   
consortships started                                 19.250 ± 16.919 (4)   73.000 ×3.79      5.000 ×0.26      1.000 ×0.05     45.000 ×2.34      7.000 ×0.36   
consortships per adult-male-day                       0.023 ± 0.020  (4)    0.087 ×3.82      0.006 ×0.26      0.001 ×0.04      0.054 ×2.37      0.008 ×0.35   
consort mean duration h                               0.063 ± 0.042  (4)    0.107 ×1.69      0.077 ×1.22      0.054 ×0.85      0.127 ×2.01      0.084 ×1.33   
consort dark minutes                                  0.000 ± 0.000  (4)    0.000           0.000           0.000          50.750           0.000        
consort: daylight left at blocked h                   1.202 ± 0.803  (4)    1.567 ×1.30      1.873 ×1.56      0.952 ×0.79      0.000 ×0.00      1.799 ×1.50   
caller: approaches started, adult male /day           2.378 ± 0.217  (4)    1.858 ×0.78      1.974 ×0.83      2.571 ×1.08      2.387 ×1.00      4.563 ×1.92   
caller: approaches, adult female /day                 1.842 ± 0.077  (4)    1.743 ×0.95      1.697 ×0.92      2.079 ×1.13      1.837 ×1.00      4.431 ×2.41   
caller: km/day adult male                             0.441 ± 0.027  (4)    0.318 ×0.72      0.387 ×0.88      0.455 ×1.03      0.423 ×0.96      0.825 ×1.87   
caller: km/day adult female                           0.326 ± 0.007  (4)    0.290 ×0.89      0.283 ×0.87      0.350 ×1.08      0.308 ×0.95      0.756 ×2.32   
caller: mean distance term                            0.241 ± 0.021  (4)    0.208 ×0.86      0.251 ×1.04      0.225 ×0.93      0.252 ×1.04      0.000 ×0.00   
caller: choice p                                      0.400 ± 0.006  (4)    0.361 ×0.90      0.400 ×1.00      0.405 ×1.01      0.418 ×1.05      0.508 ×1.27   
caller: choice p without distance                     0.552 ± 0.005  (4)    0.500 ×0.91      0.551 ×1.00      0.550 ×1.00      0.570 ×1.03      0.508 ×0.92   
caller: reached share                                 0.468 ± 0.006  (4)    0.516 ×1.10      0.521 ×1.11      0.471 ×1.01      0.465 ×0.99      0.424 ×0.91   
path km/day adult male                                2.371 ± 0.088  (4)    2.101 ×0.89      2.329 ×0.98      2.473 ×1.04      2.420 ×1.02      3.108 ×1.31   
path km/day adult female                              2.013 ± 0.056  (4)    1.922 ×0.96      1.942 ×0.96      2.077 ×1.03      2.021 ×1.00      2.648 ×1.32   
path km/day juvenile                                  2.630 ± 0.092  (4)    2.473 ×0.94      2.716 ×1.03      2.703 ×1.03      2.592 ×0.99      3.240 ×1.23   
consortships by hour (D0 group, then arms): [{'8': 1, '9': 2, '11': 1, '13': 1, '14': 3, '15': 4}, {'7': 1, '8': 5, '9': 5, '10': 1, '11': 6, '12': 6, '13': 5, '14': 5, '15': 5}, {}, {'7': 1, '8': 5, '9': 3, '10': 5, '11': 3, '12': 4, '13': 1, '14': 1, '15': 3}] {'D1': {'6': 5, '8': 3, '9': 5, '10': 5, '11': 9, '12': 9, '13': 13, '14': 12, '15': 12}, 'D2': {'8': 1, '10': 1, '14': 2, '15': 1}, 'D3': {'13': 1}, 'D4': {'5': 3, '6': 1, '7': 3, '8': 2, '9': 3, '10': 2, '11': 3, '12': 5, '13': 2, '14': 6, '15': 5, '16': 6, '17': 4}, 'D5': {'10': 1, '12': 1, '14': 4, '15': 1}}
```

### 2.2 Reading by the registered rule

- **`pantGruntRepeatH` sets the greeting rate.** It blocks 0.50 ± 0.01 of the greeting opportunities; at 74% of the
  blocked ones the subordinate had already greeted that dominant in the current association bout (bout age 4.1 ± 0.3 h),
  at the other 26% the pair had come together again within 8 h of the last greeting. Removed (D1): pant-grunts per
  subordinate-day 2.24 ± 0.10 → 8.21 (× 3.7), repeats within an association 308 ± 24 → 14,858, the alpha's share 0.24 →
  0.50; first greetings in an association do not change (5,197 ± 250 → 5,349). What the quota does is stop repeated
  greetings inside one association; what it costs is greetings at reunions within 8 h.
- **`feedChargeGapH` is inert.** It blocks 0.074 ± 0.011 of the feeding-charge opportunities (below 0.10), and the blocked
  charge would have outscored the act chosen in 1.2% of those decisions; at the blocked ones the last aggression was
  mostly of another kind (mate guarding, coalitions). Removed (D2): 0.049 ± 0.004 → 0.044 feeding charges per adult-day
  (× 0.90, inside 2 SD).
- **`immigrantChargeGapH` trims.** It blocks 0.31 ± 0.03 (its blocked charge would have won the decision in 41%), nearly
  always a renewed charge at the same immigrant the resident had just charged; the immigrant gave way in 62 of 65 resolved
  charges (D0). Removed (D3): 0.141 ± 0.048 → 0.143 charges per resident female-day (× 1.01): the immigrant's concession
  and departure, not the gap, bound the repetition (its opportunities fell from 2,243 ± 740 to 1,605). One immigrant female
  in the window on the two seeds (30 female-days): a thin sample.
- **`consortLatestHour` sets the timing, not (measurably) the rate.** It blocks 0.25 ± 0.17 of the consortship
  opportunities, all from 16:00 on, with 1.2 ± 0.8 h of daylight left. Removed (D4): 45 consortships (D0 19 ± 17; × 2.3
  but inside 2 SD of D0's wide spread), 10 of them (22%) started at or after 16:00, 3 before dawn (05:xx), and 51 minutes of
  consortship in darkness (D0: 0). Few events: 0–39 per run.
- **`joinCallDistScaleM` sets the walking to callers.** Removed (D5): approaches per adult-male-day 2.38 ± 0.22 → 4.56
  (× 1.9), adult females × 2.4; km a day walked to callers × 1.9 (males) and × 2.3 (females); every class's daily path ×
  1.2–1.3. At the first step its distance term (0.24 on average) lowers an approach's choice probability from 0.55 to
  0.40.
- Not registered but seen: D5's extra walking raises every encounter-driven act (pant-grunts × 1.5, feeding-charge
  opportunities × 2.3).

**Step 2 therefore covers** greeting (`pantGruntRepeatH`: rate), consortships (`consortLatestHour`: timing) and
approaches to callers (`joinCallDistScaleM`: rate). The two charge gaps do not set their behaviour (§4.4).

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
