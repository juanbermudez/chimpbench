# Re-baseline on the new protocol (part C of the user's decision of 4 October 2026)

**Registered 5 October 2026, before any run.** User, verbatim: "apply the audited fixes and targets. You can run more
than 90 days. You can run 2 years for biggest tests, but work up from 6 months, 12 months and 24 months is only when you
do need to test something on a longer horizon."

## What is run

- **Protocol:** freeze 5d4fa5a2a500bce6 (data/targets.json, merged on track-e at ed18c1e); the old bands are scored too,
  from data/targets.c8.json (freeze a2228c2df476680b), for one full cycle, so no band change reads as model progress.
- **Tool:** e-bench's single pass (branch eB-bench at 1824a88, track-e 2a396d3 merged: bench, energy and rhythm readouts
  from one simulation per seed; verified identical to the separate tools on S39 quick and confirm), run from frozen
  detached checkouts (bench-run3, bench-run4) at 1824a88.
- **Stacks:** S39 (S37 + `tripBeliefs` 3; 42 prescriptions; parameters bench-run2/artifacts/validation/e/s39/S39-params.json)
  and today's model (every Track E switch 0; parameters `{}`; 147).
- **Groups (e-noise.md amendment 4):** per stack and horizon, 4 runs: the stack and its re-draws by `rngSalt` 1, 2, 3.
- **Horizons:** 60 days (`--confirm`: seeds 48, 7, 21, 5, 11; 30 + 60) for stage confirms, and 6 months (`--m6`: 30 + 180;
  the end checkpoints are kept so `--m12 --resume` can extend them).

## What is reported per horizon

Rows in band on the new and the old bands; rows newly scorable (truth rows, and rows that needed a longer window);
the biggest misses (expected among them: hunt success, the travel share 0.115, T-COM-11, T-FOOD-10, T-RNG-5); fitted and
held-out sums with and without the rare rows; viability, night safety and deaths by cause.

## Decision rule (part C2)

At 6 months S39 **holds** against today's model if it is viable (no starvation; e-bench's viability pass) and its held-out
sum on the new bands is not worse than today's group beyond noise (z ≤ 2 by amendment 4's 6-month rule; also reported
without the rare rows). If it holds, S39's group is extended to 12 months (`--m12 --resume`) for the year-long rows and
part D's event counts. If it fails, S39's latest switches are switched off one at a time at 6 months (`tripBeliefs` 3,
then `callGaps` 7, then `aggressionGaps` 7, …) to find the cause; past decisions are not re-run.

**Predictions (low confidence, before any run).** S39 viable at 6 months; its held-out sum not worse than today's (it was
better than S27 on the old bands); hunting outside the new 4–11 band (16.9 at 60 days on the old protocol); the travel
share below its band; T-COM-11 below its band; T-FOOD-10 above its band.

**Amendment (5 October 2026, 01:55, before any result).** The first 60-day runs were stopped minutes after starting (no
output read) and restarted on eB-bench 1f8553b, which adds the T-INF-1 readout (lonsdorf2014's ten Gombe blocks): 26
truth rows read, 14 not scorable; nothing else in the code path changes.

**Amendment 2 (5 October 2026, 02:10, before any 6-month run).** The 6-month groups run with the resumable runner
(`scripts/e-run.ts`, single pass, one job per seed) from frozen detached checkouts (bench-run for S39, bench-run2 for
today's model) at track-e 550d08d, which contains eB-bench 1f8553b plus the runner and eR-runs' behaviour-neutral memos
(2-day and 30-day world hashes identical on S39) and E3i's `callTrip` (0 in both stacks): the simulation of these
parameters is the same as at 1f8553b. Results at 60 days stay on 1f8553b.

## 6-month results (bench-run and bench-run2 at 63d699a, the runner's single pass; every number printed by integrator/judge_c.py and a row split from the JSON)

```
## Part C, M6: S39 against today's model (4 runs each; printed by integrator/judge_c.py from the JSON)

| Run | commit | protocol | prescriptions | viability | deaths by cause (energy readout) | adults out of a nest at night, T-RHY-5 |
| --- | --- | --- | --- | --- | --- | --- |
| M6-T0 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 10, 'deaths': 1, 'ratio': 10, 'starvationDeaths': 0, 'minLivingShare': 1.0204081632653061, 'reasons': [], 'fewEvents': False} | {'juvenile 5–12 y: illness': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 1; deaths 1 |
| M6-T0-s1 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 10, 'deaths': 7, 'ratio': 1.4285714285714286, 'starvationDeaths': 0, 'minLivingShare': 0.9791666666666666, 'reasons': [], 'fewEvents': False} | {'infant < 0.5 y: illness': 2, 'adult male: illness': 4, 'female, other: snare injury': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 5; deaths 7 |
| M6-T0-s2 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 10, 'deaths': 10, 'ratio': 1, 'starvationDeaths': 0, 'minLivingShare': 0.8367346938775511, 'reasons': [], 'fewEvents': False} | {'adult male: respiratory illness (outbreak)': 4, 'adolescent: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 2, 'infant 0.5–2 y: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 2} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 2; deaths 10 |
| M6-T0-s3 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 10, 'deaths': 6, 'ratio': 1.6666666666666667, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': False} | {'adult male: illness': 4, 'infant 0.5–2 y: illness': 2} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 2; deaths 6 |
| M6-S39 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 10, 'deaths': 1, 'ratio': 10, 'starvationDeaths': 0, 'minLivingShare': 1.0204081632653061, 'reasons': [], 'fewEvents': False} | {'adolescent: illness': 1} | adults out of a nest 2.71% of night; T-RHY-5 0.0254; night deaths 1; deaths 1 |
| M6-S39-s1 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': False, 'births': 10, 'deaths': 12, 'ratio': 0.8333333333333334, 'starvationDeaths': 0, 'minLivingShare': 0.9183673469387755, 'reasons': ['births 10 < deaths 12'], 'fewEvents': False} | {'infant 0.5–2 y: respiratory illness (outbreak)': 2, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'female, lactating: illness': 2, 'female, lactating: snare injury': 1, 'infant 2–5 y: orphaned infant, did not survive without its mother': 1, 'infant < 0.5 y: respiratory illness (outbreak)': 1, 'adolescent: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'infant < 0.5 y: illness': 1, 'adult male: illness': 1} | adults out of a nest 2.61% of night; T-RHY-5 0.0252; night deaths 6; deaths 12 |
| M6-S39-s2 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 10, 'deaths': 6, 'ratio': 1.6666666666666667, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': False} | {'adult male: illness': 2, 'infant 0.5–2 y: infanticide by Chiriku (East community)': 1, 'infant 0.5–2 y: illness': 1, 'infant < 0.5 y: illness': 2} | adults out of a nest 2.60% of night; T-RHY-5 0.0247; night deaths 2; deaths 6 |
| M6-S39-s3 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 10, 'deaths': 3, 'ratio': 3.3333333333333335, 'starvationDeaths': 0, 'minLivingShare': 1.0204081632653061, 'reasons': [], 'fewEvents': False} | {'juvenile 5–12 y: illness': 2, 'infant 0.5–2 y: illness': 1} | adults out of a nest 2.56% of night; T-RHY-5 0.0243; night deaths 1; deaths 3 |

### New bands (freeze 5d4fa5a2a500bce6, as run)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (18) | 2.63 / 3.15 / 4.07 / 4.75 | 3.65 ± 0.94 | 3.05 / 2.48 / 2.72 / 2.51 | 2.69 ± 0.26 | -0.6 (SD used 0.94) |
| held-out (25) | 12.83 / 15.22 / 13.87 / 13.03 | 13.74 ± 1.08 | 8.98 / 9.11 / 7.79 / 9.39 | 8.82 ± 0.71 | -2.9 (SD used 1.45) |
| held-out w/o rare (22) | 11.32 / 10.82 / 11.09 / 11.46 | 11.17 ± 0.28 | 7.43 / 7.51 / 7.31 / 7.24 | 7.37 ± 0.12 | -12.0 (SD used 0.28) |

### Old bands (data/targets.c8.json, rescored)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (17) | 2.30 / 2.69 / 3.69 / 4.41 | 3.27 ± 0.95 | 2.94 / 2.35 / 2.44 / 2.40 | 2.54 ± 0.27 | -0.3 (SD used 0.95) |
| held-out (15) | 6.72 / 9.04 / 7.77 / 6.90 | 7.61 ± 1.06 | 11.25 / 11.32 / 10.07 / 11.80 | 11.11 ± 0.73 | +2.2 (SD used 1.45) |
| held-out w/o rare (12) | 5.20 / 4.64 / 4.99 / 5.33 | 5.04 ± 0.30 | 9.70 / 9.72 / 9.59 / 9.65 | 9.66 ± 0.06 | +13.8 (SD used 0.30) |

### Rows by verdict (new bands; mean of the 4 runs)

| role · verdict | today's model | S39 |
| --- | --- | --- |
| fitted · fail | 7.50 | 9.25 |
| fitted · inconclusive | 5.50 | 7.75 |
| fitted · insufficient | 15.00 | 14.00 |
| fitted · n/a | 1.00 | 1.00 |
| fitted · pass | 9.00 | 6.00 |
| held-out · fail | 24.50 | 21.50 |
| held-out · inconclusive | 6.25 | 9.25 |
| held-out · insufficient | 22.00 | 21.00 |
| held-out · n/a | 9.00 | 9.00 |
| held-out · not scorable | 18.00 | 14.00 |
| held-out · pass | 18.25 | 24.25 |
| held-out · scale | 1.00 | 0.00 |
| held-out · sealed | 12.00 | 12.00 |
| held-out · structural | 1.00 | 1.00 |

### Simulation-truth rows on M6-S39: 26 scored, 14 not scorable (T-END-1, T-END-10, T-END-11, T-END-12, T-END-4, T-END-5, T-END-6, T-END-7, T-ENE-4, T-ENE-5, T-ENE-6, T-ENE-9, T-INF-4, T-RHY-7)

| row | band | value | verdict |
| --- | --- | --- | --- |
| T-END-2 | not negative: high-ranking males are not less stressed than low-ranking males | 0.2 | fail |
| T-END-3 | higher with a swollen parous female in the party | 1 | pass |
| T-END-8 | positive association | 0.4 | fail |
| T-END-9 | higher on patrol days | 0.2 | fail |
| T-ENE-1 | 1900–3100 | 2585.0363 | pass |
| T-ENE-2 | 250–370 | 341.4214 | inconclusive |
| T-ENE-3 | 650–1100 | 851.569 | pass |
| T-ENE-7 | feeding time lower on days with a swollen parous female present | 0.2 | fail |
| T-ENE-8 | 85–130 | 100.1409 | pass |
| T-INF-1 | rises with age; within a factor 1.5 of the Gombe value in each block from 1 y (e.g. 15-33% at 1.5-2 y, 33-74% at 4.5-5 y) | None | insufficient |
| T-INF-2 | 1–6 | 10.2527 | fail |
| T-INF-3 | 3.7–5.8 | None | insufficient |
| T-INF-5 | 0.5–2 | 1.0835 | pass |
| T-INF-6 | 0.014–0.06 | 0.0297 | pass |
| T-RHY-1 | 10.5–12 | 11.814 | pass |
| T-RHY-10 | more than half of leaf feeding in the second half of the active day | 1 | pass |
| T-RHY-2 | non-receptive (lactating) females shorter than males; receptive females not shorter than males | 0 | fail |
| T-RHY-3 | -20–15 | -10.55 | pass |
| T-RHY-4 | -30–90 | 39.55 | pass |
| T-RHY-5 | 0–0.05 | 0.0254 | pass |
| T-RHY-6 | 0.3–2 | 0.2413 | inconclusive |
| T-RHY-8 | positive association of resting with temperature; midday rest follows from the temperature curve | 0.6 | pass |
| T-RHY-9 | feeding share in the first and last three hours of the active day above the middle hours; resting highest in the middle third | 1 | pass |
| T-SOC-14 | 0.08–0.37 | 0.0694 | fail |
| T-SOC-15 | contact share at a large rank difference below the share at small and middle differences; insufficient below 20 conflicts per category | 0.8 | pass |
| T-SOC-16 | 0.03–0.2 | 0.2399 | inconclusive |

### Biggest misses on M6-S39 (new bands)

| row | role | band | value | distance |
| --- | --- | --- | --- | --- |
| T-FOOD-6 | held-out | 2–7 | 26.745 | 3.95 |
| T-IGE-1 | fitted | 5–12 | 20.786 | 1.26 |
| T-INF-2 | held-out | 1–6 | 10.253 | 0.85 |
| T-HUN-4 | held-out | 1.05–1.8 | 2.424 | 0.83 |
| T-RNG-5 | held-out | 0.3–0.75 | 1.074 | 0.72 |
| T-COM-11 | fitted | 0.25–0.55 | 0.048 | 0.67 |
| T-IGE-3 | held-out | 0.25–0.75 | 1.025 | 0.55 |
| T-SOC-6 | held-out | 0.6–0.9 | 0.468 | 0.44 |
| T-FOOD-2 | fitted | 0.6–0.78 | 0.836 | 0.31 |
| T-SOC-5 | held-out | 0.2–0.7 | 0.847 | 0.29 |
| T-HUN-2 | fitted | 0.5–0.8 | 0.423 | 0.26 |
| T-HUN-7 | fitted | 1.2–2 | 1 | 0.25 |

Held-out rows scored in all 8 six-month runs, mean distance over 4 runs (S39 minus today's model):

band unchanged (13 rows)
  T-BRD-1    band 0.037–0.107        S39    0.021 today   -0.001  distance 0.50 vs 0.88 (-0.38)
  T-FOOD-5   band 0.15–0.45          S39    0.107 today    0.114  distance 0.14 vs 0.12 (+0.02)
  T-FOOD-6   band 2–7                S39   26.070 today   22.737  distance 3.81 vs 3.15 (+0.67)
  T-FOOD-7   band 300–800            S39  192.538 today  291.137  distance 0.21 vs 0.02 (+0.20)
  T-HUN-4    band 1.05–1.8           S39    2.285 today    3.064  distance 0.65 vs 1.69 (-1.04)
  T-HUN-8    band 0.8–0.95           S39    0.972 today    0.934  distance 0.15 vs 0.05 (+0.10)
  T-IGE-2    band 0.7–0.9            S39    0.944 today    0.994  distance 0.22 vs 0.47 (-0.25)
  T-IGE-3    band 0.25–0.75          S39    0.889 today    0.608  distance 0.30 vs 0.00 (+0.30)
  T-SOC-10   band 0.1–0.3            S39    0.195 today    0.151  distance 0.00 vs 0.00 (+0.00)
  T-SOC-2    band 0.55–0.9           S39    0.779 today    0.805  distance 0.00 vs 0.00 (+0.00)
  T-SOC-3    band 0.45–0.8           S39    0.814 today    0.965  distance 0.07 vs 0.47 (-0.40)
  T-SOC-5    band 0.2–0.7            S39    0.816 today    0.511  distance 0.23 vs 0.00 (+0.23)
  T-SOC-6    band 0.6–0.9            S39    0.458 today    0.528  distance 0.47 vs 0.24 (+0.23)
  sum of differences -0.31 (without T-HUN-4, T-BRD-1, T-IGE-3 +0.80)

band revised (old → new) (2 rows)
  T-FOOD-10  band 0.08–0.3 → 0.08–0.78  S39 0.905 today 0.005  distance old 2.75 vs 0.34 (+2.41); new 0.18 vs 0.11 (+0.07)
  T-RNG-5    band 0.3–0.6 → 0.3–0.75  S39 1.077 today 0.654  distance old 1.59 vs 0.18 (+1.41); new 0.73 vs 0.00 (+0.73)
  sum of differences +0.80 (without T-HUN-4, T-BRD-1, T-IGE-3 +0.80)

new rows (new protocol only) (10 rows)
  T-INF-2    band 1–6                S39   10.350 today   17.920  distance 0.87 vs 2.38 (-1.51)
  T-INF-5    band 0.5–2              S39    1.100 today    1.082  distance 0.00 vs 0.00 (+0.00)
  T-INF-6    band 0.014–0.06         S39    0.028 today    0.250  distance 0.00 vs 4.12 (-4.12)
  T-RHY-1    band 10.5–12            S39   11.794 today   11.351  distance 0.00 vs 0.00 (+0.00)
  T-RHY-3    band -20–15             S39  -10.763 today   15.462  distance 0.00 vs 0.01 (-0.01)
  T-RHY-4    band -30–90             S39   39.562 today   37.425  distance 0.00 vs 0.00 (+0.00)
  T-RHY-5    band 0–0.05             S39    0.025 today    0.000  distance 0.00 vs 0.00 (+0.00)
  T-RHY-6    band 0.3–2              S39    0.249 today    1.225  distance 0.03 vs 0.00 (+0.03)
  T-SOC-14   band 0.08–0.37          S39    0.070 today    0.072  distance 0.04 vs 0.03 (+0.01)
  T-SOC-16   band 0.03–0.2           S39    0.235 today    0.056  distance 0.21 vs 0.00 (+0.21)
  sum of differences -5.40 (without T-HUN-4, T-BRD-1, T-IGE-3 -5.40)
```

**Reading.** On the new bands S39 is better than today's model beyond noise (held-out z −2.9; −12.0 without the rare
rows). **That is not progress on the rows both protocols score.** Split by band status (held-out rows scored in all eight
runs, S39 minus today, mean distance): the 13 rows whose band did not change −0.31 (+0.80 without the rare rows: about
even); the 2 rows the audits revised (T-FOOD-10 0.08–0.30 → 0.08–0.78, T-RNG-5 0.3–0.6 → 0.3–0.75) +3.82 on the old bands
and +0.80 on the new (the revisions remove most of S39's two biggest old-band misses: departures before sunrise 0.905 and
mothers' relative day range 1.08); the 10 new rows −5.40, nearly all from two infant rows today's model fails: mothers
grooming their own unweaned infants (T-INF-6: today 25% of the mother's day, S39 2.8%; band 1.4–6%) and the suckling share
(T-INF-2: today 17.9%, S39 10.4%; band 1–6%). On the old bands S39 is worse than today's model (held-out z +2.2; +13.8
without the rare rows), through those two revised rows.

**Viability.** All four runs of today's model pass. Three of S39's four pass; S39-s1 fails births ≥ deaths (10 births,
12 deaths: a respiratory outbreak, other illness, a snare injury and an orphan; no starvation). Births are 10 in every run
(the initial pregnancies; the salt is applied after the world is built).

**Against the predictions.** S39 viable at 6 months: held for the stack's own run (one re-draw fails births ≥ deaths, no
starvation). Held-out not worse than today's: held on the new bands, missed on the old. Hunting outside 4–11, the travel
share below its band, T-COM-11 below its band and T-FOOD-10 above its band: reported in the 60-day section.

**Decision (the registered rule).** S39 holds at 6 months against today's model on the new bands (its own run viable;
held-out z −2.9). Its group is extended to 12 months. Today's model is extended too (amendment 3), because the 12-month
rows need a reference and its runs are cheap.

**Amendment 3 (5 October 2026, 03:00, before any 12-month run).** Both 6-month groups are extended to 12 months with the
runner (`--m12 --from` each 6-month run's checkpoints) at 63d699a; part D's event counts are taken on S39's 12-month group.

## 60-day results (bench-run3 and bench-run4 at 1f8553b, e-bench's single pass; every number printed by integrator/judge_c.py and a row split from the JSON)

C60-S39-s3 was cut at the 2-hour limit after two seeds overnight and re-run in full at 08:07 (same commit and parameters).

```
## Part C, C60: S39 against today's model (4 runs each; printed by integrator/judge_c.py from the JSON)

| Run | commit | protocol | prescriptions | viability | deaths by cause (energy readout) | adults out of a nest at night, T-RHY-5 |
| --- | --- | --- | --- | --- | --- | --- |
| C60-T0 | 1f8553b | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True} | {'juvenile 5–12 y: illness': 1} | adults out of a nest 0.01% of night; T-RHY-5 0.0001; night deaths 1; deaths 1 |
| C60-T0-s1 | 1f8553b | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 0, 'deaths': 4, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9375, 'reasons': [], 'fewEvents': True} | {'adult male: illness': 3, 'female, other: snare injury': 1} | adults out of a nest 0.01% of night; T-RHY-5 0.0001; night deaths 2; deaths 4 |
| C60-T0-s2 | 1f8553b | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True} | — | adults out of a nest 0.01% of night; T-RHY-5 0.0001; night deaths 0; deaths 0 |
| C60-T0-s3 | 1f8553b | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True} | {'infant 0.5–2 y: illness': 1} | adults out of a nest 0.01% of night; T-RHY-5 0.0001; night deaths 0; deaths 1 |
| C60-S39 | 1f8553b | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True} | {'adolescent: illness': 1} | adults out of a nest 2.66% of night; T-RHY-5 0.0219; night deaths 1; deaths 1 |
| C60-S39-s1 | 1f8553b | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 0, 'deaths': 0, 'ratio': None, 'starvationDeaths': 0, 'minLivingShare': 1, 'reasons': [], 'fewEvents': True} | — | adults out of a nest 2.57% of night; T-RHY-5 0.0220; night deaths 0; deaths 0 |
| C60-S39-s2 | 1f8553b | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 0, 'deaths': 2, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True} | {'infant 0.5–2 y: infanticide by Chiriku (East community)': 1, 'adult male: illness': 1} | adults out of a nest 2.52% of night; T-RHY-5 0.0220; night deaths 0; deaths 2 |
| C60-S39-s3 | 1f8553b | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 0, 'deaths': 1, 'ratio': 0, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': True} | {'juvenile 5–12 y: illness': 1} | adults out of a nest 2.39% of night; T-RHY-5 0.0199; night deaths 0; deaths 1 |

### New bands (freeze 5d4fa5a2a500bce6, as run)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (17) | 3.32 / 3.88 / 3.90 / 3.61 | 3.68 ± 0.27 | 1.84 / 1.57 / 1.28 / 1.41 | 1.52 ± 0.24 | -5.5 (SD used 0.30) |
| held-out (24) | 11.93 / 12.99 / 11.67 / 11.30 | 11.97 ± 0.73 | 5.16 / 9.17 / 5.28 / 6.98 | 6.65 ± 1.88 | -4.2 (SD used 1.45) |
| held-out w/o rare (22) | 9.58 / 9.10 / 9.03 / 9.29 | 9.25 ± 0.25 | 4.06 / 4.59 / 4.64 / 4.26 | 4.39 ± 0.28 | -18.7 (SD used 0.25) |

### Old bands (data/targets.c8.json, rescored)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (16) | 2.89 / 3.03 / 3.23 / 3.11 | 3.06 ± 0.14 | 1.73 / 1.44 / 1.09 / 1.32 | 1.40 ± 0.27 | -4.0 (SD used 0.30) |
| held-out (14) | 5.47 / 6.51 / 5.33 / 4.99 | 5.58 ± 0.65 | 7.29 / 11.10 / 7.34 / 8.82 | 8.64 ± 1.79 | +1.1 (SD used 1.45) |
| held-out w/o rare (12) | 3.13 / 2.62 / 2.69 / 2.99 | 2.86 ± 0.24 | 6.19 / 6.52 / 6.70 / 6.10 | 6.38 ± 0.28 | +12.3 (SD used 0.24) |

### Rows by verdict (new bands; mean of the 4 runs)

| role · verdict | today's model | S39 |
| --- | --- | --- |
| fitted · fail | 7.25 | 7.50 |
| fitted · inconclusive | 5.75 | 10.25 |
| fitted · insufficient | 15.00 | 15.00 |
| fitted · n/a | 1.00 | 1.00 |
| fitted · pass | 9.00 | 4.25 |
| held-out · fail | 25.50 | 20.50 |
| held-out · inconclusive | 8.25 | 10.00 |
| held-out · insufficient | 22.25 | 21.00 |
| held-out · n/a | 9.00 | 9.00 |
| held-out · not scorable | 18.00 | 14.00 |
| held-out · pass | 15.00 | 23.50 |
| held-out · scale | 1.00 | 1.00 |
| held-out · sealed | 12.00 | 12.00 |
| held-out · structural | 1.00 | 1.00 |

### Simulation-truth rows on C60-S39: 26 scored, 14 not scorable (T-END-1, T-END-10, T-END-11, T-END-12, T-END-4, T-END-5, T-END-6, T-END-7, T-ENE-4, T-ENE-5, T-ENE-6, T-ENE-9, T-INF-4, T-RHY-7)

| row | band | value | verdict |
| --- | --- | --- | --- |
| T-END-2 | not negative: high-ranking males are not less stressed than low-ranking males | 0.8 | pass |
| T-END-3 | higher with a swollen parous female in the party | 1 | pass |
| T-END-8 | positive association | 0.4 | fail |
| T-END-9 | higher on patrol days | 0.4 | fail |
| T-ENE-1 | 1900–3100 | 2524.1102 | pass |
| T-ENE-2 | 250–370 | 312.8432 | pass |
| T-ENE-3 | 650–1100 | 834.2482 | pass |
| T-ENE-7 | feeding time lower on days with a swollen parous female present | 0.2 | fail |
| T-ENE-8 | 85–130 | 99.0663 | pass |
| T-INF-1 | rises with age; within a factor 1.5 of the Gombe value in each block from 1 y (e.g. 15-33% at 1.5-2 y, 33-74% at 4.5-5 y) | None | insufficient |
| T-INF-2 | 1–6 | 11.6 | fail |
| T-INF-3 | 3.7–5.8 | None | insufficient |
| T-INF-5 | 0.5–2 | 1.1729 | pass |
| T-INF-6 | 0.014–0.06 | 0.033 | pass |
| T-RHY-1 | 10.5–12 | 11.7247 | pass |
| T-RHY-10 | more than half of leaf feeding in the second half of the active day | 1 | pass |
| T-RHY-2 | non-receptive (lactating) females shorter than males; receptive females not shorter than males | 0 | fail |
| T-RHY-3 | -20–15 | -6.7 | pass |
| T-RHY-4 | -30–90 | 40.35 | pass |
| T-RHY-5 | 0–0.05 | 0.0219 | pass |
| T-RHY-6 | 0.3–2 | 0.2951 | inconclusive |
| T-RHY-8 | positive association of resting with temperature; midday rest follows from the temperature curve | 0.6 | pass |
| T-RHY-9 | feeding share in the first and last three hours of the active day above the middle hours; resting highest in the middle third | 1 | pass |
| T-SOC-14 | 0.08–0.37 | 0.0594 | fail |
| T-SOC-15 | contact share at a large rank difference below the share at small and middle differences; insufficient below 20 conflicts per category | 0.4 | fail |
| T-SOC-16 | 0.03–0.2 | 0.1839 | inconclusive |

### Biggest misses on C60-S39 (new bands)

| row | role | band | value | distance |
| --- | --- | --- | --- | --- |
| T-IGE-3 | held-out | 0.25–0.75 | 18.545 | 35.59 |
| T-INF-2 | held-out | 1–6 | 11.6 | 1.12 |
| T-FOOD-6 | held-out | 2–7 | 12.596 | 1.12 |
| T-HUN-4 | held-out | 1.05–1.8 | 2.625 | 1.10 |
| T-COM-11 | fitted | 0.25–0.55 | 0.023 | 0.76 |
| T-RNG-5 | held-out | 0.3–0.75 | 0.972 | 0.49 |
| T-SOC-6 | held-out | 0.6–0.9 | 0.495 | 0.35 |
| T-HUN-2 | fitted | 0.5–0.8 | 0.396 | 0.35 |
| T-IGE-2 | held-out | 0.7–0.9 | 0.958 | 0.29 |
| T-FOOD-2 | fitted | 0.6–0.78 | 0.826 | 0.25 |
| T-HUN-7 | fitted | 1.2–2 | 1 | 0.25 |
| T-FOOD-7 | held-out | 300–800 | 181.117 | 0.24 |


=== held-out rows scored in all 8 sixty-day runs, mean distance over 4 runs (S39 minus today's model)
band unchanged (12 rows)
  T-BRD-1    band 0.037–0.107        S39    0.073 today   -0.060  distance 1.17 vs 1.39 (-0.21)
  T-FOOD-6   band 2–7                S39   12.709 today   11.508  distance 1.14 vs 0.90 (+0.24)
  T-FOOD-7   band 300–800            S39  178.426 today  278.671  distance 0.24 vs 0.04 (+0.20)
  T-HUN-4    band 1.05–1.8           S39    2.563 today    2.800  distance 1.08 vs 1.33 (-0.25)
  T-HUN-8    band 0.8–0.95           S39    0.987 today    0.956  distance 0.25 vs 0.17 (+0.08)
  T-IGE-2    band 0.7–0.9            S39    0.968 today    1.000  distance 0.34 vs 0.50 (-0.16)
  T-SOC-3    band 0.45–0.8           S39    0.692 today    0.941  distance 0.00 vs 0.40 (-0.40)
  T-SOC-6    band 0.6–0.9            S39    0.480 today    0.520  distance 0.40 vs 0.27 (+0.13)
  sum of differences -0.35 (without T-HUN-4, T-BRD-1, T-IGE-3 +0.11); rows with |difference| < 0.05 not listed
band revised (old → new) (2 rows)
  T-FOOD-10  band 0.08–0.3 → 0.08–0.78  S39 0.861 today 0.002  distance old 2.55 vs 0.36 (+2.19); new 0.12 vs 0.11 (+0.00)
  T-RNG-5    band 0.3–0.6 → 0.3–0.75  S39 0.976 today 0.607  distance old 1.25 vs 0.04 (+1.22); new 0.50 vs 0.00 (+0.50)
  sum of differences +0.51 (without T-HUN-4, T-BRD-1, T-IGE-3 +0.51); rows with |difference| < 0.05 not listed
new rows (new protocol only) (10 rows)
  T-INF-2    band 1–6                S39   11.666 today   17.865  distance 1.13 vs 2.37 (-1.24)
  T-INF-6    band 0.014–0.06         S39    0.033 today    0.256  distance 0.00 vs 4.26 (-4.26)
  sum of differences -5.48 (without T-HUN-4, T-BRD-1, T-IGE-3 -5.48); rows with |difference| < 0.05 not listed

=== fitted rows scored in all 8 sixty-day runs, mean distance over 4 runs (S39 minus today's model)
band unchanged (14 rows)
  T-ACT-3    band 0.08–0.18          S39    0.097 today    0.133  distance 0.06 vs 0.00 (+0.06)
  T-COM-11   band 0.25–0.55          S39    0.057 today    0.136  distance 0.64 vs 0.38 (+0.26)
  T-FOOD-2   band 0.6–0.78           S39    0.819 today    0.882  distance 0.22 vs 0.56 (-0.35)
  T-HUN-2    band 0.5–0.8            S39    0.498 today    0.152  distance 0.13 vs 1.16 (-1.02)
  T-HUN-7    band 1.2–2              S39    1.000 today    1.159  distance 0.25 vs 0.08 (+0.17)
  T-SOC-9    band 0.08–0.22          S39    0.119 today    0.105  distance 0.01 vs 0.83 (-0.83)
  sum of differences -1.63 (without T-HUN-4, T-BRD-1, T-IGE-3 -1.63); rows with |difference| < 0.05 not listed
band revised (old → new) (2 rows)
  T-HUN-1    band 5–25 → 4–11  S39 8.358 today 12.978  distance old 0.00 vs 0.00 (+0.00); new 0.02 vs 0.28 (-0.26)
  T-PTY-1    band 3–9 → 4.5–9.2  S39 4.012 today 2.738  distance old 0.00 vs 0.04 (-0.04); new 0.10 vs 0.37 (-0.27)
  sum of differences -0.53 (without T-HUN-4, T-BRD-1, T-IGE-3 -0.53); rows with |difference| < 0.05 not listed
new rows (new protocol only) (1 rows)
  sum of differences +0.00 (without T-HUN-4, T-BRD-1, T-IGE-3 +0.00); rows with |difference| < 0.05 not listed

Rows the user expected among the biggest misses (S39's own run):
T-ACT-2 0.12–0.25 0.11482319776183333 fail
T-PTY-1 4.5–9.2 3.994342318021231 fail
T-RNG-5 0.3–0.75 0.9717273265076006 fail
T-FOOD-10 0.08–0.78 0.9084507042253521 fail
T-HUN-1 4–11 8.05739514348786 inconclusive
T-HUN-2 0.5–0.8 0.3958333333333333 inconclusive
T-COM-11 0.25–0.55 0.023255813953488372 fail
```

**Reading.** As at 6 months: on the new bands S39 beats today's model beyond noise (fitted z −5.5, held-out −4.2, −18.7
without the rare rows); on the old bands S39 is better on the fitted rows (−4.0) and worse on the held-out rows (+1.1;
+12.3 without the rare rows). On held-out rows whose band did not change the two are about even (−0.35; +0.11 without the
rare rows); the audits' two widened bands (T-FOOD-10, T-RNG-5) remove +2.9 of S39's old-band deficit; the new infant rows
give S39 −5.5 (T-INF-6 mothers grooming their own infants: today 25.6% of the day, S39 3.3%; band 1.4–6%; T-INF-2 suckling
share: today 17.9%, S39 11.7%; band 1–6%). On fitted rows with unchanged bands S39 is genuinely better (−1.63: hunt
success 0.50 against 0.15, T-SOC-9, the fruit share). Hunting now scores in band on the new protocol (T-HUN-1 8.4, band
4–11), because e4f's scorer fix counts only encounter-matched hunts (S39's 16.9 was on the old count). All eight runs are
viable (0–4 deaths, none from starvation). Of the 40 truth rows 26 are scored and 14 not scorable.

**Against the predictions** (S39's own run, new bands). Viable: held. Held-out not worse than today's: held. Hunting outside
4–11: **missed** (T-HUN-1 8.06, inside, under the corrected hunt count). Travel share below its band: held (T-ACT-2 0.115;
band 0.12–0.25). T-COM-11 below its band: held (0.023; band 0.25–0.55). T-FOOD-10 above its band: held (0.908 against the
new band 0.08–0.78; group mean 0.861). Not predicted: parties now below their revised band (T-PTY-1 3.99; band 4.5–9.2).
(Integrator correction, before any reader: the first version of this paragraph garbled the travel-share line and called
T-FOOD-10 a miss.)

## Part D: rare-event families (registered 5 October 2026, 09:15, before any count)

User's brief: count events per family on S39's 12-month reference (simulation truth), compare with T-LET, T-DEM and
T-PAT-9, and state the minimum count needed to judge before counting; stage only families with enough events; go to 24
months only for families with too few at 12.

**Families** (S39's 27 rare-event prescriptions, by the ledger): lethal conflict and injury (13: gang impulses and kills,
infanticide, serious injury, the defence roll), deaths, adoption and bereavement (8), disease and snares (4), dispersal (2).

**Events counted (simulation truth, per run and seed, from the worlds and run outputs):** killings by cause (intergroup,
infanticide, within the community), serious injuries, coalitionary attacks on strangers; deaths by cause, mothers' deaths
leaving dependent offspring, adoptions, carrying of dead infants, bereavement episodes; epidemic arrivals, outbreak cases
and deaths, snare injuries; natal transfers (dispersal). Community-years and chimp-years per run are counted with them.

**Minimum counts to judge (fixed now).** A family's rate rows are judged at a horizon only if S39's 4-run reference group
pools at least **10** events of that family (Poisson relative standard error ≤ 0.32, enough to tell a rate from half or
double it); its pattern rows (victim composition, numerical odds, who dies, causes of death) need at least **20** pooled
events; an arm is compared with the reference only if it has at least **5** events of the family itself. A family below
these counts at 12 months goes to 24 months; below them at 24 months it is recorded as not testable within the ladder
(more seeds would be the next lever, not more years).

## 12-month results (bench-run and bench-run2 at 63d699a, extended from the 6-month checkpoints with the runner; printed by integrator/judge_c.py and readouts from the JSON)

The overnight stall (≈ 03:00–07:50: the machine slept or was starved, then load ~300 from another session) left each run on its first seed; the runner's rate estimate was poisoned by that seed (≈ 103 s per seed-day) and reset to its prior (2.5) by hand in the eight registries before relaunching; no output was affected (the seeds' worlds resume from checkpoints).

```
## Part C, M12: S39 against today's model (4 runs each; printed by integrator/judge_c.py from the JSON)

| Run | commit | protocol | prescriptions | viability | deaths by cause (energy readout) | adults out of a nest at night, T-RHY-5 |
| --- | --- | --- | --- | --- | --- | --- |
| M12-T0 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 23, 'deaths': 10, 'ratio': 2.3, 'starvationDeaths': 0, 'minLivingShare': 0.9387755102040817, 'reasons': [], 'fewEvents': False} | {'adult male: illness': 1, 'infant 2–5 y: respiratory illness (outbreak)': 2, 'adult male: respiratory illness (outbreak)': 1, 'adolescent: respiratory illness (outbreak)': 1, 'female, other: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'female, pregnant: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'juvenile 5–12 y: illness': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 3; deaths 10 |
| M12-T0-s1 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 27, 'deaths': 14, 'ratio': 1.9285714285714286, 'starvationDeaths': 0, 'minLivingShare': 0.9375, 'reasons': [], 'fewEvents': False} | {'infant < 0.5 y: illness': 2, 'adult male: illness': 6, 'female, other: snare injury': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: respiratory illness (outbreak)': 1, 'juvenile 5–12 y: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'infant < 0.5 y: respiratory illness (outbreak)': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 7; deaths 14 |
| M12-T0-s2 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 26, 'deaths': 17, 'ratio': 1.5294117647058822, 'starvationDeaths': 0, 'minLivingShare': 0.8979591836734694, 'reasons': [], 'fewEvents': False} | {'adult male: respiratory illness (outbreak)': 6, 'adolescent: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 2, 'infant 0.5–2 y: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 3, 'infant < 0.5 y: illness': 1, 'adult male: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'female, pregnant: respiratory illness (outbreak)': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 4; deaths 17 |
| M12-T0-s3 | 63d699a | 5d4fa5a2a500bce6 | 147 | {'pass': True, 'births': 31, 'deaths': 14, 'ratio': 2.2142857142857144, 'starvationDeaths': 0, 'minLivingShare': 0.9795918367346939, 'reasons': [], 'fewEvents': False} | {'adult male: illness': 4, 'adult male: respiratory illness (outbreak)': 3, 'infant 2–5 y: respiratory illness (outbreak)': 2, 'infant 0.5–2 y: illness': 2, 'infant 0.5–2 y: respiratory illness (outbreak)': 1, 'juvenile 5–12 y: respiratory illness (outbreak)': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 0.00% of night; T-RHY-5 0.0000; night deaths 5; deaths 14 |
| M12-S39 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': False, 'births': 23, 'deaths': 7, 'ratio': 3.2857142857142856, 'starvationDeaths': 2, 'minLivingShare': 1.0408163265306123, 'reasons': ['2 starvation deaths'], 'fewEvents': False} | {'female, lactating: illness': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'female, lactating: wounds from a fight with Jambiri': 1, 'adolescent: starvation': 1, 'adolescent: illness': 1, 'female, pregnant: starvation': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.66% of night; T-RHY-5 0.0245; night deaths 5; deaths 7 |
| M12-S39-s1 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': False, 'births': 26, 'deaths': 18, 'ratio': 1.4444444444444444, 'starvationDeaths': 2, 'minLivingShare': 0.9795918367346939, 'reasons': ['2 starvation deaths'], 'fewEvents': False} | {'infant 0.5–2 y: respiratory illness (outbreak)': 2, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'female, lactating: illness': 2, 'infant 2–5 y: orphaned infant, did not survive without its mother': 3, 'female, lactating: snare injury': 1, 'infant < 0.5 y: respiratory illness (outbreak)': 1, 'adolescent: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'infant < 0.5 y: illness': 3, 'adult male: illness': 1, 'adolescent: starvation': 1, 'female, pregnant: starvation': 1} | adults out of a nest 2.58% of night; T-RHY-5 0.0242; night deaths 9; deaths 18 |
| M12-S39-s2 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': False, 'births': 25, 'deaths': 10, 'ratio': 2.5, 'starvationDeaths': 2, 'minLivingShare': 1.0204081632653061, 'reasons': ['2 starvation deaths'], 'fewEvents': False} | {'adult male: illness': 2, 'infant 2–5 y: starvation': 1, 'infant 0.5–2 y: infanticide by Chiriku (East community)': 1, 'infant 0.5–2 y: illness': 1, 'infant < 0.5 y: illness': 3, 'adolescent: starvation': 1, 'female, other: illness': 1} | adults out of a nest 2.58% of night; T-RHY-5 0.0238; night deaths 3; deaths 10 |
| M12-S39-s3 | 63d699a | 5d4fa5a2a500bce6 | 42 | {'pass': True, 'births': 25, 'deaths': 6, 'ratio': 4.166666666666667, 'starvationDeaths': 0, 'minLivingShare': 1.0408163265306123, 'reasons': [], 'fewEvents': False} | {'juvenile 5–12 y: illness': 2, 'female, other: wounds from a fight with Jambiri': 1, 'infant 2–5 y: illness': 1, 'infant 0.5–2 y: illness': 2} | adults out of a nest 2.59% of night; T-RHY-5 0.0240; night deaths 3; deaths 6 |

### New bands (freeze 5d4fa5a2a500bce6, as run)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (25) | 6.92 / 7.55 / 11.55 / 9.74 | 8.94 ± 2.12 | 4.15 / 4.13 / 4.45 / 3.97 | 4.17 ± 0.20 | -2.0 (SD used 2.12) |
| held-out (32) | 21.59 / 20.75 / 23.67 / 21.30 | 21.83 ± 1.28 | 15.12 / 14.52 / 14.46 / 16.28 | 15.10 ± 0.84 | -4.1 (SD used 1.45) |
| held-out w/o rare (29) | 19.33 / 18.79 / 20.92 / 19.11 | 19.53 ± 0.95 | 13.48 / 13.47 / 13.28 / 13.82 | 13.51 ± 0.23 | -5.7 (SD used 0.95) |

### Old bands (data/targets.c8.json, rescored)

| Sum (rows scored in all 8 runs) | today's model: 4 runs | mean ± SD | S39: 4 runs | mean ± SD | S39 run z vs today |
| --- | --- | --- | --- | --- | --- |
| fitted (24) | 6.57 / 7.06 / 11.22 / 9.29 | 8.53 ± 2.15 | 4.04 / 4.01 / 4.35 / 3.87 | 4.07 ± 0.20 | -1.9 (SD used 2.15) |
| held-out (21) | 15.46 / 14.48 / 17.63 / 15.05 | 15.66 ± 1.38 | 17.35 / 16.72 / 16.68 / 18.60 | 17.34 ± 0.90 | +1.0 (SD used 1.45) |
| held-out w/o rare (18) | 13.21 / 12.52 / 14.88 / 12.86 | 13.37 ± 1.05 | 15.71 / 15.67 / 15.49 / 16.14 | 15.75 ± 0.27 | +2.0 (SD used 1.05) |

### Rows by verdict (new bands; mean of the 4 runs)

Starvation deaths by run and seed (viability), and by class (energy readout):
  M12-S39: seeds [(5, 1), (11, 1)]; classes {'adolescent: starvation': 1, 'female, pregnant: starvation': 1}
  M12-S39-s1: seeds [(5, 1), (11, 1)]; classes {'adolescent: starvation': 1, 'female, pregnant: starvation': 1}
  M12-S39-s2: seeds [(48, 1), (5, 1)]; classes {'infant 2–5 y: starvation': 1, 'adolescent: starvation': 1}
  M12-S39-s3: seeds none; classes none
Reserve relative to the store by class, at days 0, 45, 91, 136, 182, 228, 273, 319, 364 of the scored year (energy readout traj):
  M12-S39
    adult male         +0.003 -0.001 -0.020 -0.018 -0.001 +0.003 +0.002 -0.001 -0.001
    female, other      -0.008 -0.019 -0.034 -0.046 -0.038 -0.049 -0.046 -0.034 -0.029
    female, lactating  -0.021 -0.037 -0.101 -0.129 -0.119 -0.129 -0.075 -0.051 -0.062
    juvenile 5–12 y    -0.038 -0.049 -0.111 -0.161 -0.189 -0.203 -0.174 -0.175 -0.178
    infant 2–5 y       -0.021 -0.031 -0.057 -0.070 -0.052 -0.031 -0.025 -0.043 -0.074
    infant 0.5–2 y     -0.021 -0.050 -0.133 -0.165 -0.170 -0.166 -0.093 -0.072 -0.085
  M12-S39-s1
    adult male         +0.002 -0.005 -0.018 -0.013 +0.000 +0.003 +0.004 -0.001 -0.000
    female, other      -0.005 -0.010 -0.033 -0.062 -0.049 -0.039 -0.023 -0.025 -0.035
    female, lactating  -0.017 -0.033 -0.092 -0.127 -0.124 -0.125 -0.072 -0.044 -0.055
    juvenile 5–12 y    -0.034 -0.049 -0.111 -0.152 -0.165 -0.161 -0.130 -0.120 -0.153
    infant 2–5 y       -0.017 -0.030 -0.055 -0.112 -0.121 -0.103 -0.086 -0.076 -0.119
    infant 0.5–2 y     -0.020 -0.042 -0.121 -0.129 -0.156 -0.191 -0.089 -0.025 -0.028
  M12-S39-s2
    adult male         +0.002 -0.001 -0.017 -0.016 -0.000 +0.003 +0.004 -0.002 -0.003
    female, other      -0.006 -0.009 -0.030 -0.040 -0.041 -0.037 -0.043 -0.047 -0.038
    female, lactating  -0.020 -0.037 -0.093 -0.127 -0.113 -0.114 -0.066 -0.049 -0.054
    juvenile 5–12 y    -0.039 -0.052 -0.117 -0.172 -0.200 -0.221 -0.192 -0.182 -0.211
    infant 2–5 y       -0.018 -0.033 -0.056 -0.069 -0.056 -0.039 -0.039 -0.063 -0.057
    infant 0.5–2 y     -0.022 -0.047 -0.120 -0.185 -0.183 -0.177 -0.090 -0.053 -0.066
  M12-S39-s3
    adult male         +0.003 -0.004 -0.022 -0.015 -0.001 +0.002 +0.004 -0.000 -0.001
    female, other      -0.008 -0.014 -0.042 -0.052 -0.038 -0.039 -0.024 -0.008 -0.016
    female, lactating  -0.018 -0.036 -0.102 -0.129 -0.121 -0.127 -0.065 -0.060 -0.066
    juvenile 5–12 y    -0.035 -0.058 -0.134 -0.184 -0.240 -0.267 -0.234 -0.222 -0.232
    infant 2–5 y       -0.016 -0.032 -0.065 -0.075 -0.056 -0.033 -0.027 -0.044 -0.069
    infant 0.5–2 y     -0.023 -0.044 -0.122 -0.151 -0.167 -0.170 -0.098 -0.073 -0.073
```

**S39 is not viable at 12 months.** Three of its four runs fail viability with 2 starvation deaths each (three adolescents,
two pregnant females, one infant of 2–5 y; seeds 5 and 11 twice, 48 once); today's model has none in its four runs (it has
no energy ledger, so it cannot starve that way). The deaths come after day 210 (none in the 6-month runs). The reserves
show a lean season: juveniles fall to about −0.20 of their store and nursing mothers to −0.13 between days 45 and 230 of
the scored year (mid-December to mid-June, with the world's calendar), then partly recover; adult males barely move.
On the bands, S39 beats today's model on the new bands (fitted z −2.0, held-out −4.1, −5.7 without the rare rows) and is
worse on the old bands' held-out rows (+1.0; +2.0 without the rare rows).

**What it means.** Every Track E keep decision so far was made on 60-day windows starting in late October, before the
model's lean season; none could see this. The registered 6-month rule passed S39 because the deaths come later.

## Walk-back at 12 months (registered 5 October 2026, 10:20, before its runs; the user's rule for part C2: "If it fails,
switch off its latest switches one at a time to find the cause; don't re-run past decisions")

**Arms (one run each, seeds 48, 7, 21, 5, 11; 30 + 365 days; the runner from bench-run and bench-run2 at 63d699a):** the
earlier stacks, each one switch-step back: S37 (S39 without `tripBeliefs`), S34 (S37 without `callGaps`), S31 (S34 without
`aggressionGaps`), S27 (S31 without `departValue` and `bodyRules`).

**Readouts:** starvation deaths (count and class), viability, the reserve trajectories by class (each class's minimum over
the year), the sums against today's 12-month group on the new and old bands.

**Decision rule.** An arm counts as free of the failure if it has no starvation death in its five seeds **and** its
juveniles' lowest reserve is at least 0.05 above S39's (S39's group: about −0.16 to −0.20). Walking back from S39, the first
arm free of the failure points to the switch removed at that step; if none of the four is free of it, the cause is older
than S27 (the energy ledger's response to the lean season), and it goes to a diagnosis stage (monthly energy budget by
class against the field's seasonal condition data) before any further switch is judged.

**Predictions (low confidence).** None of the four is free of the failure (the lean season meets the ledger in every
stack); `tripBeliefs` and `departValue` change its size a little, not its sign.

## Part D1 result: rare-event counts at 12 months (eD-counts, merged at 4717cde; `scripts/rare-events.ts` on simulation truth, S39's four 12-month runs against today's model's; 60 community-years and ~1,000 chimp-years per group)

Second route: deaths by cause, killings and transfers agree between the run parts, the end worlds, `world.stats` and the
observer's truth records in 20 of 20 seeds per group. Full tables: integrator scratch `eD-counts/final-d4eec23.md`.

| family · row | S39 pooled [per run] | S39 value | today's model | band | minimum | reached |
| --- | --- | --- | --- | --- | --- | --- |
| lethal · T-LET-1 killings, all | 3 [1/0/1/1] (1 infanticide, 2 fight wounds, 0 intergroup) | 0.050 per community-year | 0 | 0.02–0.36 | 10 | no |
| lethal · T-LET-2/3/6 (victims, odds, on patrol) | 3 / 0 / 0 | — | 0 | — | 20 | no |
| patrols · T-PAT-9 | 60 community-years | 0.90 meet both | 59, 1.00 | 0.5–1 | 20 | yes (check only) |
| deaths · T-DEM-4 causes | 41 [7/18/10/6] | disease 0.66, aggression 0.07 | 55: 0.96, 0.00 | 0.25–0.6, 0.1–0.25 | 20 | yes |
| deaths · T-DEM-1 first-year deaths | 11 [1/4/4/2] | q1 0.185 | 7, 0.124 | 0.11–0.19 | 10 | yes |
| disease · T-DEM-5 epidemic arrivals | 5 [0/3/2/0] | 0.077 per community-year | 9, 0.139 | 0.07–0.15 | 10 | no |
| disease · T-DEM-6 outbreaks ≥ 20% | 4 | mortality 0.07 | 7, 0.26 | ≤ 0.17 | 10 | no |
| disease · T-DEM-8 respiratory deaths | 5 | 5.0 per 1,000 chimp-years | 34, 34.3 | 5–20 | 10 | no |
| disease · T-DEM-7 who dies | 5 | — | 34 | — | 20 | no |
| snares · T-DEM-9 | 7 injuries | — | 5 | 0.1–0.3 | 10 | no |
| dispersal · natal transfers | 18 [7/3/4/4] | 0.30 per community-year | 20 | no field row | 10 | yes (count only) |

Lower bounds only (no exact record): serious injuries (S39 ≥ 45, today ≥ 1; S39's wound counter 1,604 against 49),
resolved attacks on strangers (≥ 12, ≥ 4), dead-infant carries (≥ 1 of 16 rolls), adoptions of orphans whose records
were already purged. S39's deaths include 6 starvations (part C).

**Measurement findings (no score changed here):**
1. The observer logs an infanticidal attack as a killing when it starts, so failed attacks count: 2 of S39's 4 observed
   T-LET-1 killings were infants that lived.
2. Killings in fights within the community (`conflict.ts` fight wounds) are not in `world.stats.killings` nor in the
   observer's kill events, though T-LET-1's definition counts "all intercommunity and within-community killings".
3. T-DEM-9's census point (t0 + 365.25 days) falls after a 365-day window, so it never scores at 12 months; founders start
   without snare injuries, so a 1–2-year run cannot build the field's standing prevalence. Not testable as defined.

## Part D2: staging decisions (5 October 2026, from the rule registered at 977400e, before any rare-event stage)

1. **Judged at 12 months:** the deaths family (T-DEM-4, T-DEM-1; every S39 run has ≥ 5 deaths) and T-PAT-9 as a check.
   Transfers are counted only (no field row).
2. **Staged:** the deaths family (8 prescriptions: adoption, bereavement, dependents' survival, dead-infant carrying),
   judged on T-DEM-4 and T-DEM-1 at 12 months. It starts only on a base that is viable at 12 months (part C), because
   starvation deaths enter T-DEM-4 and S39's are 6 of 41. T-DEM-4's aggression share also rests on killings, a family
   that cannot be judged at 12 months; the stage reports it but does not claim it.
3. **To 24 months, on the next viable base (not on S39, which starves):** T-LET-1, T-DEM-5, T-DEM-6, T-DEM-8 (the counter
   projects 6–13 events each). Measurement findings 1 and 2 are fixed, registered, before T-LET-1 is counted there.
4. **Projected not testable within the ladder** (need 20; projected well under at 24 months; recorded as such only after
   the 24-month count): T-LET-2, T-LET-3, T-LET-6, T-DEM-7. T-DEM-9 is not testable as defined (finding 3). More seeds,
   not more years, are the lever for these.
