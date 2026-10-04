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

## 3. Field rows scored and their samples (written before any arm)

Sources opened for this stage (research.md "Addendum: E5e social quotas and clocks") or by the stage that last scored
the row (named). Rows the mechanism can move are marked ●.

| Row | Band | Source and sample (sex, reproductive state, mass, method) | Opened |
| --- | --- | --- | --- |
| ● T-SOC-6 pant-grunts to the top 3 males (held-out) | 0.6–0.9 | gilby2013: Gombe Kasekela 1995–2008, 16 males; full-day focal follows of adults, pant-grunts from the narrative notes; "The three highest-ranking males received over 75% of all pant grunts given by males each year"; mass not reported. **Scorer difference (known, deferred; src/field/metrics.ts T-SOC-6, maleDominance):** the frozen observer divides by every pant-grunt detected in the community, of any giver (females, juveniles), not by males' pant-grunts; S13q scores 0.45 ± 0.04 while the truth share of males' pant-grunts is 0.80 ± 0.02 (§2.1). Changing the observer needs a protocolLog entry and a freeze (the user's decision). | here (BioC, PMC3582680) |
| ● T-SOC-5 hierarchy steepness (held-out), with a pant-grunt part | 0.2–0.7 | kaburuNewtonFisher2015 (as e4h-prereg §3): Sonso 8 adult males, Mahale M 10; decided contact aggression, chases, directed displays; pant-grunts only checked the order | E4h |
| ● T-ACT-1..4 (fitted) | 0.33–0.5; 0.12–0.25; 0.08–0.18; 0.3–0.47 | villioth2025 (Waibira, 10 adult males and 9 adult females, 7 of them lactating; continuous focal recording, 491 h; travelling = "terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy"; mass not reported), potts2011 (Ngogo and Kanyawara focal follows; rest includes grooming), amsler2010 (Ngogo non-patrol days 0.14), uwimbabazi2019 (14 Kanyawara nursing mothers) | E3c §3, E5d §1 |
| ● T-RNG-4 adult male day range (fitted) | 1.5–3.5 km | batesByrne2009: Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling on full-day follows; mass not reported | E3c §3 |
| ● T-RNG-5 lactating ÷ male day range (held-out) | 0.3–0.6 | batesByrne2009: 15 adults (lactating 1.2 ± 0.8 km, males 2.7 ± 1.5), GPS; one site (a multi-site band staged by E1j, not applied) | E1j |
| ● T-PTY-1 party size (fitted) | 3–9 | wilson2012: Kanyawara 1992–2006, 5,527 party follows, 15-min scans | E5a |
| T-SOC-2, -3, -4, -9, -10 (held-out; -9 fitted) | as JSON | mitani2009, kaburuNewtonFisher2015, foerster2015, kutsukakeCastles2004, wittigBoesch2010 (as E5d §1, E4h §3) | E5d, E4h |
| T-COM-1 male pant-hoot rate (fitted) | 0.5–1.5 per male-hour | mitaniNishida1993 (Mahale M 1990, 7 males, 175 h, focal-initiated bouts); wilson2007 (Kanyawara, 12 males, ~200 h, focal) | targets.json (not re-opened; no call term changes here) |
| Truth readouts: greetings, charges, consortships, approaches, paths (quota-diagnose); reserves %/day, ground km (energy-diagnose) | none scored | defined in §2 and the tools' headers; smoke-tested before any arm (§4.6) | — |

No wild per-dyad pant-grunt rate or interval between greetings of the same dominant was found (research.md addendum,
"Not verified"); nakamura2022's female rates are per observation hour of the observer, not per dyad. The model's
greeting rates are therefore reported, not scored.

## 4. Mechanism: switch `socialTiming` (registered before any code of it)

One switch, 0 = today, bit-identical. Its value is a sum of bits, one per entry, so that iterations can separate them:

| Bit | Entry switched out | Replaced by |
| --- | --- | --- |
| 1 | `pantGruntRepeatH` (quota) | the memory of the current association (§4.1) |
| 2 | `consortLatestHour` (clock hour) | the light on the walk away from the party (§4.2) |
| 4 | `joinCallDistScaleM` (fitted distance scale) | the foraging currency of E3c and the walking energy of E5a (§4.3) |
| 8 | `feedChargeGapH`, `immigrantChargeGapH` (quotas) | nothing new: the target's concession (E4h) already limits repetition (§4.4) |

### 4.1 Greeting by memory of the association (bit 1)

A pant-grunt re-establishes the dominance relationship when two animals meet (girardButtoz2022: "dominance and bonding
relationships are re-established after a period of absence"; the pant-grunt is given during approaches to dominants;
dunphyLelii2019: at the moment of encountering the male). So a subordinate greets a dominant once per association, and
again when the dominant challenges it:
- **Memory** (perception.ts): when an animal perceives a member of its community whom it last perceived more than
  `reunionH` ago (or never), the two are reuniting, and its record of having greeted that animal (`x.greet`) is cleared.
  `reunionH` is the model's existing reunion span (the 1-h literal of perception.ts's newcomers, now a registry entry
  with the same value, so every world is unchanged): the observer's convention for a fusion (girardButtoz2022: parties
  apart for at least 1 h); design, not fitted, its sensitivity untested.
- **Gate** (candidates.ts): the greeting is open toward a dominant the animal has not greeted in the current association,
  or toward one displaying or charging within `displayNearM` (the existing displaying term's condition: a challenge to the
  relationship reopens it). `pantGruntRepeatH` is not read. The score is unchanged.
- **Revised before any arm, after the switch-on smoke test (seed 48, 1 + 2 days; disclosed).** As first written, 86 of
  273 greetings in two days repeated one within an observer's association bout, from two sources the text above did not
  intend: (a) an animal that saw the dominant at its last look and then went more than an hour without a look (a long
  bout) counted the next look as a reunion; (b) a dominant charging a third animal within 35 m reopened every bystander's
  greeting. Now (a) a reunion also needs the other to have been out of sight at the animal's previous look (perception's
  last look before this one; no time constant), and (b) the challenge is a display within `displayNearM` or a charge at
  this animal. Smoke after the revision: 39 repeats of 231. The predictions of §4.7 are left as registered.

### 4.2 Consortships by the light on the walk away (bit 2)

A consortship is a pair's walk away from the party toward the range's edge (wroblewski2009), where the male leads the
female (execution.ts: to a point at 0.85 of the range radius away from the centre). It is worth starting only if the
walk can be made in light: its option's value is multiplied by the light of that walk, the mean walking pace and the
vision on arrival from E2c's `tripLight` (light.ts: both 1 when the sun stays high until arrival; less in twilight,
near 0 arriving in darkness), the walk's distance being the one the male would lead (the same goal as execution.ts,
computed by one shared function, `consortGoal`). `consortLatestHour` is not read. A negative value is left as it is
(the light scales what the consortship is worth, not what it costs). The nest's own value (sleep pressure, darkness;
E2a) competes with it as before. No new magnitude.

### 4.3 Approaches to callers in the foraging currency (bit 4; acts with `cohesionValue`, `forageRate` and their needs)

A walk to a caller costs energy and time in the forager's currency (E3c; charnov1976, stephensKrebs1986; sockol2007's
cost of transport, the ledger's input). E5a already values the two moves this is made of; the approach takes their forms:
- **A call given at food** (the caller feeding in a crown; the listener stores the crown when it hears the call, a new
  lazily added `ChimpX` key `jt`): a trip to that crown, as E5a's joined trip under E3c: the company the caller adds over
  the company the animal has (E5b's margin) plus the crown's drive × the net energy rate of the trip (`rateWorth`: the
  crop it believes there, or the 0.2 of an unremembered crown as E5a's destWorth, shared with the caller and the
  companions it sees going there; walk and climb in the rate), less rain × 0.3.
- **Any other call**: a move to a companion, as E5a's follow: the company margin less the walk's energy at the ledger's
  derived scale (`travelDistScaleM`, an input), less rain × 0.3.
- Not read under the bit: `joinCallDistScaleM` and the call's design pull (0.15 + 0.35 × fruit index + 0.3 × hunger +
  0.15 × sociability at food; 0.3 × sociability × fruit index − 0.05 otherwise): the food it stood for is now valued as
  food. `assocBondW` (C9, 0) is kept. The approach's act (travel to the call's position) is unchanged. No new magnitude.

### 4.4 The charge gaps (bit 8)

The diagnosis shows neither gap sets its behaviour: the feeding gap blocks 7% of its opportunities (its charge would
have won 1.2% of those decisions; removed, 0.049 → 0.044 charges per adult-day, inside the reference's spread), and the
immigrant gap trims (removed, 0.141 → 0.143 per resident female-day): the targets gave way in 56 of 63 (feeding) and 62 of
65 (immigrant) resolved charges and moved off. Repetition already follows from the target's response (E4h: a concession
ends the contest) and from the charge's own score (hunger, scarcity, aggression, tension). Under bit 8 neither gap is
read; nothing replaces them. (Added after the diagnosis, before any arm, as a removal the diagnosis measured directly,
D2 and D3; it is not a mechanism for a rate-setting entry.)

### 4.5 Code, tests and the ledger

Code: candidates.ts (`socialTiming` bits; `consortGoal`; the approach's two forms; the gates), perception.ts
(`reunionH`; the greeting memory; `jt` at hearing), execution.ts (onStart reads `consortGoal`), state.ts (`jt` in
OPTIONAL_X), data/params.json (`socialTiming` design switch, hard range 0–15; `reunionH` design, 1 h, girardButtoz2022),
scripts/lib/prescriptions.ts (ACTIVE_WHEN for the five entries; TRACK_E_SWITCHES), tests/sim-social-timing.test.ts (0 by
default in both profiles; switch 0 hash-identical; on changes the world; each bit's gate and value; the five entries
unread; the count 65 → 60 on S13, one per bit and two for bit 8).

### 4.6 Readouts (smoke-tested with the switch on before any arm)

quota-diagnose (§2) gains nothing; under bit 1 its greeting trace reports the memory gate (blocked = not open), under
bit 2 the consortship trace reports the score after the light (the hour is still recorded), under bit 8 the gaps are
never blocked. energy-diagnose and e-bench as the reference. Smoke test: S13 + `socialTiming` 15, seed 48, 1 + 1 days.

### 4.7 Arm A1, predictions and kill criterion

**A1** = S13 + `socialTiming` 15 (every bit), quick (seeds 48, 7; 30 + 30 days), from a frozen detached checkout of the
commit that adds the code: `e-bench --quick` (`--workers` 1 above load 8, else 2), `energy-diagnose`, `quota-diagnose`.
Judged against the four S13q realizations (e-bench, energy) and the four D0 diagnoses (quota readouts) with
`e5e_judge.py` (stage scratch; the integrator's `judge_vs_reps.py` for the sums).

| Quantity | S13q / D0 (mean ± SD) | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 65 | 60 | high |
| Viability; deaths | pass; 0 | pass; 0 | moderate |
| Pant-grunts per subordinate-day | 2.24 ± 0.10 | 1.8–3.4 (no quota, one per association, reunions within 8 h now greeted) | moderate |
| Greetings repeated within an association | 308 ± 24 | ≤ 615 (challenges only) | moderate |
| Share of greetings to the alpha; males' greetings to the top 3 (truth) | 0.235 ± 0.007; 0.80 ± 0.02 | 0.19–0.30; ≥ 0.70 | low |
| T-SOC-6 (observer) | 0.449 ± 0.044 | 0.35–0.55 | low |
| Consortship minutes in darkness | 0 (D4 without the clock: 51) | ≤ 5 | moderate |
| Consortships started at or after 16:00 | 0 | some (> 0) when the walk is short | low |
| Approaches to callers per adult-male-day; km a day to callers (males) | 2.38 ± 0.22; 0.44 ± 0.03 | × 1.2–2.0; × 1.2–2.0 | low |
| Daily path, adult males (truth) | 2.37 ± 0.09 km | 2.5–3.2 km | low |
| T-ACT-2; T-RNG-4 | 0.193 ± 0.005; 2.08 ± 0.17 | 0.19–0.26; 2.1–2.9 | low |
| Feeding charges per adult-day; charges at immigrants per resident female-day | 0.049 ± 0.004; 0.141 ± 0.048 | 0.03–0.08; 0.05–0.25 | low |
| Reserves %/day, every class | S13q mean ± SD | none more than 0.03 below the mean | low |
| Fitted; held-out with and without T-HUN-4 and T-BRD-1 | reference mean | inside noise (\|z\| ≤ 2) | low |

**Kill criterion (the switch stays off and the result is recorded as a null)**: (a) viability fails (a starvation
death, or a seed below 80% of its start); (b) any class's reserve slope more than 0.05% of the store a day below the S13q
mean; (c) held-out worse beyond noise (z > +2) with or without T-HUN-4 and T-BRD-1; (d) the greeting memory does not hold
(repeats within an association above 5 × D0's mean); (e) consortships run into darkness as without the clock (≥ 51 min).

**Keep rule (standard):** viability passes; held-out not worse beyond noise with and without the rare rows (reported
without T-IGE-3 too); prescriptions 65 → 60. Then a provisional keep candidate for the integrator's 5-seed confirm.

### 4.8 Known defects and limits in the code under test (deferred, with file:line at 7be3a02)

- T-SOC-6's observer divides by every pant-grunt detected in the community, of any giver (src/field/metrics.ts:876–884,
  `maleDominance` at :138–157), while its source counts the pant-grunts given by males (gilby2013). Changing it changes the
  frozen observer (protocolLog and a new freeze: the user's decision). Truth reports the males' share beside it.
- Two reunion definitions under bit 1: `newcomers` (the greeting score's +0.15 and the display's reunion term) counts a
  reunion by time alone (perception.ts:132), the greeting memory also needs the other out of sight at the previous look
  (perception.ts:136). Left so: `newcomers` is unchanged at 0 and is not this stage's entry.
- A consortship in the model is a bout of minutes (D0: 0.06 ± 0.04 h; the female stops reciprocating), not the days of
  the field (wroblewski2009's strict definition: at least 3 days); the light gate prices the walk the male would lead,
  not a multi-day absence (candidates.ts reproduction, execution.ts consort). A stylization, recorded.
- The approach's food part reads the caller's crown at hearing (`jt`): a listener knows which crown a
  call at food came from, as `joinRich` already assumed (E4c), not its crop (perception.ts:326).

## 5. Reference and judging

Reference: S13 quick (docs/staging/e-stack2-confirm.md "S13 results"), run once plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405) by the integrator at bench-run3 ea92d20 (simulation code identical to 8cae2c4 for S13), each
with energy-diagnose (seeds 48, 7, burn-in 30, days 30): `bench-run3/artifacts/validation/e/s13q/{S13q,S13q1,S13q2,S13q3}.json`.
Judged by docs/staging/e-noise.md amendment 2 (`judge_vs_reps.py quick custom`): |z| > 2 is a result; sums with and
without T-HUN-4 and T-BRD-1, and without T-IGE-3. Readouts against the reference's own spread (mean ± SD of its 4 runs).

## 6. Iteration log

- **A1** (the registered mechanism, §4; every bit, `socialTiming` 15): run 4 October 01:22–01:25 from a frozen detached
  checkout of 7be3a02 (clean), `--workers` 2 (load 7.2); e-bench, energy-diagnose, quota-diagnose. Result in §7.1:
  kill criterion (d) met.
- **Iteration 1** (written after A1, before its run; one change): see §7.2.

## 7. Results

### 7.1 A1 (S13 + `socialTiming` 15; 7be3a02, clean): printed by `e5e_judge.py` (stage scratch) from the JSON

```
reference: ['S13q', 'S13q1', 'S13q2', 'S13q3']; arms: ['A1']
  S13q: ea92d20 dirty 0 prescriptions 65 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S13q1: ea92d20 dirty 0 prescriptions 65 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S13q2: ea92d20 dirty 0 prescriptions 65 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  S13q3: ea92d20 dirty 0 prescriptions 65 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
  A1: 7be3a02 dirty 0 prescriptions 60 viability {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True}
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 11
  fitted             (16 rows) ref 2.35, 2.29, 2.79, 2.02 (mean 2.36, sd 0.32; used 0.69) | A1.json: 3.05, Δ +0.69, z +0.9 (inside noise)
  held-out           (11 rows) ref 4.34, 3.51, 5.45, 3.28 (mean 4.15, sd 0.98; used 1.26) | A1.json: 4.15, Δ +0.01, z +0.0 (inside noise)
  held-out w/o rare  (10 rows) ref 4.34, 3.51, 4.11, 3.28 (mean 3.81, sd 0.50; used 0.50) | A1.json: 3.94, Δ +0.13, z +0.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-2   fitted   ref 0.90±0.35 | A1.json 1.67 (fail)
   T-HUN-4   held-out ref 0.33±0.67 | A1.json 0.21 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (10 rows): S13q 4.34 / 3.51 / 4.11 / 3.28 (mean 3.81, sd 0.50; used 0.50); A1 3.94 (z +0.2)

| Row (pooled value; band in the JSON) | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| T-ACT-1 (0.33–0.5) | 0.393 / 0.396 / 0.387 / 0.398 | 0.394 ± 0.005 | 0.388 (z -1.0) |
| T-ACT-2 (0.12–0.25) | 0.195 / 0.197 / 0.191 / 0.186 | 0.193 ± 0.005 | 0.197 (z +0.7) |
| T-ACT-3 (0.08–0.18) | 0.097 / 0.092 / 0.091 / 0.090 | 0.093 ± 0.003 | 0.094 (z +0.4) |
| T-ACT-4 (0.3–0.47) | 0.325 / 0.332 / 0.369 / 0.338 | 0.341 ± 0.019 | 0.332 (z -0.4) |
| T-RNG-4 (1.5–3.5) | 1.927 / 2.318 / 2.005 / 2.081 | 2.083 ± 0.169 | 2.015 (z -0.4) |
| T-RNG-5 (0.3–0.6) | 1.039 / 0.681 / 0.886 / 0.770 | 0.844 ± 0.155 | 0.942 (z +0.6) |
| T-PTY-1 (3–9) | 4.336 / 4.314 / 4.336 / 4.087 | 4.268 ± 0.121 | 4.363 (z +0.7) |
| T-SOC-2 (0.55–0.9) | 0.762 / 0.750 / 0.909 / 0.857 | 0.820 ± 0.077 | 0.895 (z +0.9) |
| T-SOC-3 (0.45–0.8) | 0.834 / 0.696 / 0.784 / 0.772 | 0.771 ± 0.057 | 0.726 (z -0.7) |
| T-SOC-4 (0.1–0.3) | 0.246 / 0.245 / 0.222 / 0.234 | 0.237 ± 0.012 | 0.209 (z -2.2) |
| T-SOC-5 (0.2–0.7) | 0.363 / 0.223 / 0.249 / 0.277 | 0.278 ± 0.061 | 0.414 (z +2.0) |
| T-SOC-6 (0.6–0.9) | 0.483 / 0.385 / 0.452 / 0.475 | 0.449 ± 0.044 | 0.448 (z -0.0) |
| T-SOC-9 (0.08–0.22) | 0.037 / 0.033 / 0.031 / 0.390 | 0.123 ± 0.178 | 0.143 (z +0.1) |
| T-SOC-10 (0.1–0.3) | 0.270 / 0.255 / 0.213 / 0.156 | 0.224 ± 0.051 | 0.215 (z -0.1) |
| T-COM-1 (0.5–1.5) | 0.768 / 0.781 / 0.696 / 0.715 | 0.740 ± 0.041 | 0.770 (z +0.7) |
| T-COM-5 (2–4) | 2.922 / 3.225 / 2.960 / 2.898 | 3.001 ± 0.151 | 3.004 (z +0.0) |
| T-COM-8 (0.3–0.6) | 0.634 / 0.636 / 0.597 / 0.596 | 0.616 ± 0.022 | 0.656 (z +1.6) |
| T-COM-11 (0.25–0.55) | 0.091 / 0.100 / 0.000 / 0.200 | 0.098 ± 0.082 | 0.000 (z -1.1) |
| T-HUN-1 (5–25) | 22.182 / 20.055 / 32.088 / 15.956 | 22.570 ± 6.851 | 15.956 (z -0.9) |
| T-HUN-3 (0.05–0.4) | 0.056 / 0.036 / 0.088 / 0.040 | 0.055 ± 0.024 | 0.025 (z -1.1) |
| T-FOOD-2 (0.6–0.78) | 0.720 / 0.720 / 0.711 / 0.683 | 0.708 ± 0.017 | 0.728 (z +1.0) |
| T-FOOD-10 (0.08–0.3) | 0.746 / 0.775 / 0.802 / 0.731 | 0.763 ± 0.032 | 0.727 (z -1.0) |
| T-IGE-1 (5–12) | 17.158 / 6.066 / 5.839 / 5.830 | 8.723 ± 5.624 | 3.012 (z -0.9) |

| Reserves ÷ store, % per day (OLS) | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | -0.007 / +0.012 / -0.002 / -0.005 | -0.000 ± 0.009 | +0.009 (z +1.0) |
| female, other | +0.010 / +0.016 / -0.004 / +0.014 | +0.009 ± 0.009 | +0.005 (z -0.4) |
| female, lactating | -0.003 / +0.002 / -0.011 / +0.003 | -0.002 ± 0.006 | +0.012 (z +2.0) |
| juvenile 5–12 y | -0.023 / -0.018 / -0.029 / -0.011 | -0.020 ± 0.008 | -0.001 (z +2.3) |
| infant 2–5 y | +0.012 / +0.030 / -0.012 / -0.007 | +0.006 ± 0.019 | +0.006 (z +0.0) |
| infant 0.5–2 y | -0.018 / -0.022 / -0.022 / +0.010 | -0.013 ± 0.016 | +0.024 (z +2.1) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Energy (energy-diagnose) | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.39 / 2.36 / 2.19 / 2.31 | 2.31 ± 0.09 | 2.27 (z -0.5) |
| adult male: eatingMin | 253.71 / 255.39 / 250.65 / 250.70 | 252.61 ± 2.34 | 252.12 (z -0.2) |
| adult male: kcalIn | 2085.02 / 2074.00 / 2062.09 / 2056.08 | 2069.30 ± 12.86 | 2080.37 (z +0.8) |
| female, other: groundKm | 1.74 / 1.75 / 1.69 / 1.76 | 1.73 ± 0.03 | 1.62 (z -3.2) |
| female, other: eatingMin | 264.53 / 256.05 / 265.99 / 264.62 | 262.80 ± 4.55 | 259.94 (z -0.6) |
| female, other: kcalIn | 1762.01 / 1756.31 / 1747.38 / 1749.42 | 1753.78 ± 6.68 | 1754.55 (z +0.1) |
| female, lactating: groundKm | 2.12 / 2.14 / 2.01 / 1.96 | 2.06 ± 0.09 | 2.12 (z +0.7) |
| female, lactating: eatingMin | 315.61 / 315.84 / 316.81 / 316.30 | 316.14 ± 0.53 | 315.45 (z -1.2) |
| female, lactating: kcalIn | 2312.29 / 2298.85 / 2310.04 / 2324.84 | 2311.51 ± 10.66 | 2321.09 (z +0.8) |
| juvenile 5–12 y: groundKm | 2.16 / 2.22 / 2.00 / 2.16 | 2.13 ± 0.10 | 2.08 (z -0.5) |
| juvenile 5–12 y: eatingMin | 283.43 / 275.03 / 288.52 / 293.35 | 285.08 ± 7.83 | 283.55 (z -0.2) |
| juvenile 5–12 y: kcalIn | 1646.64 / 1642.69 / 1635.70 / 1648.57 | 1643.40 ± 5.68 | 1653.61 (z +1.6) |

deaths (energy): {'S13q': {}, 'S13q1': {}, 'S13q2': {}, 'S13q3': {}, 'A1': {}}

| Quota readouts (quota-diagnose) | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| pant-grunts per subordinate-day | 2.328 / 2.246 / 2.286 / 2.090 | 2.237 ± 0.104 | 3.293 (z +9.1) |
| pant-grunts per dyad-day | 0.357 / 0.344 / 0.346 / 0.320 | 0.342 ± 0.016 | 0.508 (z +9.5) |
| pant-grunts per co-present dyad-day | 0.661 / 0.709 / 0.689 / 0.668 | 0.682 ± 0.022 | 0.932 (z +10.3) |
| greetings: repeats in association | 285.000 / 319.000 / 336.000 / 290.000 | 307.500 ± 24.201 | 1674.000 (z +50.5) |
| greetings: first in association | 5441.000 / 5207.000 / 5287.000 / 4851.000 | 5196.500 ± 249.967 | 6427.000 (z +4.4) |
| greetings: to the alpha (share) | 0.244 / 0.237 / 0.228 / 0.232 | 0.235 ± 0.007 | 0.267 (z +4.1) |
| greetings male→male to top 3 (truth) | 0.821 / 0.803 / 0.770 / 0.801 | 0.799 ± 0.021 | 0.818 (z +0.8) |
| greet gate blocked share | 0.490 / 0.507 / 0.507 / 0.505 | 0.502 ± 0.008 | 0.481 (z -2.3) |
| feeding charges per adult-day | 0.048 / 0.055 / 0.047 / 0.046 | 0.049 ± 0.004 | 0.063 (z +3.1) |
| charges at immigrants per resident female-day | 0.088 / 0.131 / 0.205 / 0.142 | 0.141 ± 0.048 | 0.271 (z +2.4) |
| charges at immigrants per adult-day | 0.047 / 0.070 / 0.109 / 0.076 | 0.075 ± 0.026 | 0.144 (z +2.4) |
| consortships started | 12.000 / 39.000 / 0.000 / 26.000 | 19.250 ± 16.919 | 30.000 (z +0.6) |
| consortships per adult-male-day | 0.014 / 0.046 / 0.000 / 0.031 | 0.023 ± 0.020 | 0.036 (z +0.6) |
| consort minutes in darkness | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.000 (z +nan) |
| approaches to callers per adult-male-day | 2.615 / 2.406 / 2.401 / 2.088 | 2.377 ± 0.217 | 1.932 (z -1.8) |
| approaches per adult-female-day | 1.945 / 1.836 / 1.828 / 1.758 | 1.842 ± 0.077 | 1.673 (z -2.0) |
| approaches per juvenile-day | 2.256 / 2.292 / 2.231 / 2.261 | 2.260 ± 0.025 | 2.158 (z -3.6) |
| km/day to callers, adult males | 0.471 / 0.455 / 0.409 / 0.430 | 0.441 ± 0.027 | 0.439 (z -0.1) |
| km/day to callers, adult females | 0.331 / 0.323 / 0.317 / 0.331 | 0.326 ± 0.007 | 0.348 (z +3.0) |
| km/day to callers, juveniles | 0.420 / 0.442 / 0.384 / 0.463 | 0.427 ± 0.034 | 0.470 (z +1.1) |
| approach: mean start distance m | 233.532 / 241.081 / 223.456 / 249.963 | 237.008 ± 11.257 | 294.983 (z +4.6) |
| approach: reached share | 0.462 / 0.469 / 0.465 / 0.475 | 0.468 ± 0.006 | 0.425 (z -6.8) |
| path km/day adult males (truth) | 2.451 / 2.419 / 2.251 / 2.364 | 2.371 ± 0.088 | 2.326 (z -0.5) |
| path km/day adult females (truth) | 2.071 / 2.049 / 1.962 / 1.968 | 2.013 ± 0.056 | 2.037 (z +0.4) |
| path km/day juveniles (truth) | 2.668 / 2.731 / 2.515 / 2.607 | 2.630 ± 0.092 | 2.594 (z -0.4) |

consortships by hour: {'S13q': {'8': 1, '9': 2, '11': 1, '13': 1, '14': 3, '15': 4}, 'S13q1': {'7': 1, '8': 5, '9': 5, '10': 1, '11': 6, '12': 6, '13': 5, '14': 5, '15': 5}, 'S13q2': {}, 'S13q3': {'7': 1, '8': 5, '9': 3, '10': 5, '11': 3, '12': 4, '13': 1, '14': 1, '15': 3}, 'A1': {'6': 1, '9': 4, '10': 3, '11': 3, '13': 1, '14': 5, '15': 6, '16': 1, '17': 5, '18': 1}}
```

Greetings by why the option was open (RG decisions that chose a pant-grunt, kept bouts included): association
8648, challenge 2000; open opportunities: association 107249, challenge 3386.

**Against the predictions (§4.7).** Prescriptions 60: held. Viability, no death: held. Pant-grunts per subordinate-day
3.29 (1.8–3.4): held, at the top. Repeats within an association 1,674 (≤ 615): **missed**. Alpha's share 0.267
(0.19–0.30) and males' greetings to the top 3, 0.818 (≥ 0.70): held. T-SOC-6 0.448 (0.35–0.55): held (the observer's
denominator, §4.8). Consortship minutes in darkness 0 (≤ 5): held; consortships after 16:00: 7 of 30 (some): held.
Approaches to callers per adult-male-day 1.93 (× 0.81) and km a day to callers 0.44 (× 1.0) against × 1.2–2.0:
**missed** (fewer approaches, started farther, 295 m against 237 ± 11, reached less often); adult males' path 2.33 km
(2.5–3.2): **missed**; T-ACT-2 0.197 (held); T-RNG-4 2.02 (2.1–2.9): missed low. Feeding charges 0.063 per adult-day
(0.03–0.08): held (z +3.1); charges at immigrants 0.271 per resident female-day (0.05–0.25): missed (z +2.4; one
immigrant). Reserves: no class below the reference (juveniles +2.3, mothers +2.0, infants 0.5–2 y +2.1 SD above): held.
Sums: fitted z +0.9, held-out 0.0, without the rare rows +0.2 (also without T-IGE-3): inside noise, held.

**Kill criterion.** (a), (b), (c), (e) not met. **(d) met**: 1,674 repeats within an observer's association against a
line of 5 × 307.5 = 1,538. By the registered rule A1 is a null. Reading: the memory holds (98.9% of the blocked
opportunities had greeted the dominant in the current association), but the challenge clause reopens the greeting for
every subordinate within 35 m of a displaying dominant: about a fifth of the greetings chosen (above) were reopened by a
challenge, about the share that repeats (21% of the 8,101 given).

### 7.2 Iteration 1 (written after A1, before its run): a challenge is a contest, not a display

*Finding that motivates it (§7.1):* the memory holds, but the challenge clause reopened the greeting for every subordinate
within 35 m whenever a dominant displayed, and dominants display often: about a fifth of the greetings, the repeats that
met kill criterion (d). A display asserts status to the party; it does not test the relationship between the displayer
and a subordinate that has already greeted it in this association. What tests that relationship is a contest between the
two (E4h: the target of a charge answers by its assessed odds, and a pant-grunt to an aggressor is a concession).
*Change (one; no new magnitude):* under bit 1 the greeting is reopened only when the dominant charges or attacks this
animal; a display no longer reopens it (the existing display term still raises the score of an open greeting). The other
bits are unchanged. Switch 0 still hash-identical.
*Arm A2* = A1's parameters at the commit that adds this text, same settings and judgement.
*Expected (against A1 and the reference; low confidence on sizes):* repeats within an association ≤ 615 (moderate);
pant-grunts per subordinate-day 2.4–3.2; the alpha's share 0.20–0.27; feeding and immigrant charges, consortships,
approaches and paths as A1 within its noise; prescriptions 60; viability; sums inside noise. Kill criterion as §4.7.
