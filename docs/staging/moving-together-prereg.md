# Moving together: measurement, design and pre-registration

Status: design for the integrator, 1 October 2026. Nothing is implemented. Measurements are truth probes on `main` 21592c1 behaviour: field profile, seeds 48 and 7, 30-day burn-in then 20 days, 2 processes (`artifacts/validation/party/visit-probe.ts`, `visits-48.json`, `visits-7.json`). Animals of 12 y or more are the subjects and the companions, so a mother with her juvenile is not counted as a party.

## 1. The model against the field pattern

| Quantity | Model (seed 48 / 7) | Field | Source |
| --- | --- | --- | --- |
| Feeding bout per crown visit, median | 38.8 / 38.5 min (middle half 30–55) | 27–46 min | potts2011 |
| Crown visits per adult per day | 5.5 / 5.3 | 4–15 feeding trees per day (Taï); 7–11 if Kanyawara's 309 min of feeding were all crown visits (derived) | T-FOOD-4 band; uwimbabazi2019 |
| Share of a day's intake per visit | 13% (hunger 0.13 of about 1.0 gained per day) | 12–20% (27–46 min × 10.7 kcal/min of 2,500 kcal; derived) | uwimbabazi2019 |
| Visit ends because the animal is sated | 8% / 6% | — | — |
| Visit ends because the crown is empty | 1% / 2% | — | — |
| Crop left when leaving, median | 0.43 / 0.39 units (a median crown holds 0.47) | — | — |
| Arrivals with a companion (another arrival at the crown within 5 min) | 25% / 25% | not reported; feeding parties of 7.3–8.4 | potts2011 |
| Visits alone throughout | 66% / 64% | — | — |
| Departures with a co-feeder present | 21% / 23% | — | — |
| of those, a companion leaves within 5 min | 51% / 53% | not reported | — |
| Pairs leaving together that feed in the same next crown | 35% / 42% | not reported | — |
| Time with no companion (animals of 12 y or more) | 60% / 59% | females alone 15–45%, males less | T-PTY-4 band (doran1997, lehmannBoesch2008, wakefield2008) |
| Travel events made by a solitary animal | not measured as such; 77–79% of crown departures have no co-feeder | at least 11% (51 of 456) | gruberZuberbuhler2013 |
| A pair still in one party after 60 min | 55% / 60% | not reported | — |
| A solitary animal in company 60 min later | 20% / 20% | not reported | — |
| Companions in the party at 05:00 (in nests) | 0.73 / 0.76, the same as by day | — | — |

- **Correction to docs/staging/food-landscape-prereg.md §2.** I derived a crown visit of "about 55 min" and called a model meal "2.3 h in one crown". Measured, a visit is 39 min and removes 13% of a day's need. Bout length and intake per visit already match the field.
- Party size does not rise with community size: an adult's party holds 2.0–2.1 animals in the community of 21–22, 2.1–2.2 in the one of 15 and 2.2–2.4 in the one of 12. Parties are mostly a mother and her dependants, or a chance pair.

## 2. Why the model differs

- **Not the satiation rule.** 6–8% of visits end sated.
- **Not the intake rate.** A visit supplies 13% of the day, inside the field's 12–20%.
- **Not intention holding.** It gives the 39-min bout, which is the field's.
- **Not crop size.** Crowns are left 85–90% full. No party is there to empty them.
- **Leaving is one animal's decision, and it is final.**
  - An initiator leaves whether or not anyone follows. Each companion in range joins with probability about 0.46 (science agent).
  - C13e fitted the share of hooed initiations that recruit at least one follower to the field's 71%. With one companion present, that is a per-companion probability near 0.5–0.7, and every failure splits the pair.
  - In the field a failed initiation is not the end. Initiators wait (54–58% of initiations), check back (26–39%), and when unsuccessful re-launch the effort after a mean of 3.8 min (range 0–13; 9 cases) (gruberZuberbuhler2013). A travel party is defined there as two or more.
- **The balance of rates explains the level.** Accompanied animals are alone an hour later in 26–28% of cases; solitary ones find company in 20%. That balance gives 57% alone, as measured.
- Nothing gathers animals in the evening either: nest groups are no larger than day parties.

## 3. The change (not implemented)

`departPersist` (field profile 1, compressed 0; 0 is today's model, hash-identical).

- **Audience:** own-community animals of 12 y or more within the party link (50 m), awake, other than the initiator's dependants. Design definition.
- **A failed attempt is abandoned.** An initiator with an audience starts its own trip to a tree as today (travel hoo, departure cue, the wait for a joiner). If after `departCheckMin` (1 min; design, one round of companions' decisions) no audience member is travelling to that tree or following it, the initiator gives the attempt up and stays.
- **It re-launches.** Its own trips to trees are off its menu for `departRetryMin` = 3.8 min ([M] gruberZuberbuhler2013, mean of 9 cases), then it may try again, to any tree.
- **It leaves alone in the end.** Once `departPersistMaxMin` = 13 min ([M] the upper end of the range in the same 9 cases) have passed since the first failed attempt, the next attempt is not abandoned.
- **Unchanged:** an animal with no audience; joining and following; trips to water; every join value. So the C13e fitted row (71% of hooed initiations recruit within 5 min) should not move.
- **Design assumptions, labelled:** that a failed attempt is abandoned at all (the source reports re-launching but not how often an initiator left alone); the audience definition; the 1-min check.
- **State:** three lazy keys on `chimp.sim` (the audience of the attempt under way, the first failed attempt, the next allowed attempt), declared optional.
- **Implementation notes (added before any run).** During the check the initiator stands where it is (waiting and checking back), so an abandoned attempt leaves it with its companions; a companion who joins ends the wait at once. An effort that is not re-launched within 13 min of its last failure is over, and the next departure starts a new one. Ablation row `moving-together`.
- Expected arithmetic for a pair: about three attempts fit in 13 min; at 0.46 per attempt a joint departure follows in about 85% of cases, against 46% now.

Not proposed: a cost of staying alone in the join value. It would raise recruitment per initiation above the sourced 71%.

## 4. Pre-registration

**Fitted:** nothing. **Untuned:** everything; the two times are sourced and the check window is design.

**Checks.** Field profile, seeds 48 and 7, on against off, at most 2 processes.
- 30-day burn-in + 60 days: observer rows and the visit probe. About 5 minutes.
- 30-day burn-in + 180 days (6 months), only if the guard passes: T-PTY-2 and T-FOOD-6, which 60 days cannot resolve. About 10 minutes.

**Guard (merge gate).**
- G1: switch off reproduces the field model (hash) and the compressed goldens do not move.
- G2: T-ACT-1 (0.33–0.5), T-ACT-2 (0.12–0.25), T-ACT-3, T-ACT-4 and T-RNG-4 (1.5–3.5 km) stay in band with the change on.
- G3: adult and lactating median hunger at most 0.03 above the off arm; no starvation death the off arm lacks.
- G4: the share of crown departures with a co-feeder present in which a companion leaves within 5 min is higher on than off, each seed.
- G5: hooed initiations that recruit at least one companion stay within 0.71 ± 0.05 (the C13e fitted row), **read per attempt**: an attempt recruits if a companion joins it before it ends, at most 5 min (`visit-probe.ts`, both arms).
  - *Amended before any run (1 October 2026), after reading the C13e instrument.* `scripts/c13-direction.ts` counts a companion who takes up a trip to the same tree within 5 min of an initiation. With the change on, that also counts companions who join a re-launch a few minutes after a failed first attempt, so its figure is expected to rise without any change in the join values. It is reported beside the per-attempt reading (called, silent and their ratio), not used as the gate.

**Predictions (pass or fail reported; not a gate).**

| Quantity | Off (as measured) | Predicted on | Role |
| --- | --- | --- | --- |
| Bout per crown visit, median | 39 min | 36–44 min | untuned |
| Crown visits per adult per day | 5.3–5.5 | 4.8–5.5 | untuned |
| Joint departure, given a co-feeder | 0.51–0.53 | 0.70–0.90 | untuned |
| A pair still together after 60 min | 0.55–0.60 | 0.70–0.85 | untuned |
| Time with no companion | 0.59–0.60 | 0.35–0.50 | untuned |
| Feeders per occupied crown | 1.2 | 1.3–1.6 | untuned |
| T-PTY-1 | 2.5–2.7 | 3.0–3.8 | fitted row, not tuned here |
| T-PTY-4, female time alone | 0.59 | 0.40–0.52 | held out, untuned |
| T-RNG-4, day range | 2.4–2.6 km | 2.2–2.7 km | fitted row, guard |
| T-ACT-1 / T-ACT-2 | 0.42 / 0.19 | 0.40–0.43 / 0.17–0.20 | fitted rows, guard |
| Adult median hunger | 0.32–0.36 | +0.00 to +0.03 | guard |
| T-FOOD-6, revisit interval (6-month run) | 15.6 d | unchanged, 13–18 d: nothing here acts on revisits | held out, untuned |
| T-PTY-2, patch R² (6-month run) | 0.016 | 0.02–0.08: co-feeding becomes common enough for crowding to matter a little | held out, untuned |

**What these runs cannot resolve.** T-RNG-1 (annual range), T-PTY-3 if fewer than 5 periphery follows occur, demography, and whether nest groups matter.

**If T-PTY-1 stays below 3.** No re-fit is pre-registered. The next lever by the measurements is fusion (a solitary animal finds company in only 20% of hours; nothing gathers animals at the nest), which needs its own design.

## 5. Result (development; 1 October 2026)

Code 587054f (c16-moving-together on `main` aa950b1: hunting fix and C14 in both arms). Field profile, seeds 48 and 7, `departPersist` on against off, at most 2 processes. Two windows after a 30-day burn-in: 60 days, then 180 days (6 months) for T-PTY-2 and T-FOOD-6; the 180-day values are given for the other rows too, where they are the better read. Outputs in `artifacts/validation/party/` (`*-mt60-*`, `*-mt180-*`; a first 60-day run on the earlier base 9570a3f is kept in `pre-aa950b1/` and gave the same picture).

**The guard passes. The change works in the predicted direction at about a third to a half of the predicted size. T-PTY-1 stays just below its band.**

**Guard.**

| Guard | Result (seed 48 / 7) | Verdict |
| --- | --- | --- |
| G1: off = the field model on `main` aa950b1 | hash reproduced over 2 days (tests/sim-party-food.test.ts); compressed goldens unchanged | pass |
| G2: activity and ranging rows in band, on | 180 d: T-ACT-1 0.425, T-ACT-2 0.195, T-ACT-3 0.131, T-ACT-4 0.360, T-RNG-4 2.59 km | pass |
| G3: median hunger at most 0.03 above off; no extra starvation | 180 d: adults +0.003 / +0.019, lactating +0.018 / +0.020; no deaths. 60 d: adults +0.016 / +0.016, lactating +0.025 / +0.029 | pass (see the note) |
| G4: joint departure given a co-feeder, higher on than off in each seed | 180 d: 0.63 against 0.58; 0.57 against 0.53 | pass |
| G5: hooed attempts that recruit, per attempt, inside 0.71 ± 0.05 | 180 d: 0.715 / 0.671 on (0.683 / 0.679 off) | pass |

- *Note on G3.* The pre-registration did not name the hunger instrument. The truth read of the party check (`party-truth.ts`) is the one above. The C13 direction script samples differently and gave lactating +0.032 in seed 7 over 60 days, 0.002 over the limit; over 180 days it gives +0.017 and +0.021.

**The C13e rows (must not move).**

| Reading | Called | Silent | Ratio |
| --- | --- | --- | --- |
| Field (gruberZuberbuhler2013) | 71% | 34% | 2.1 |
| Per attempt, on (180 d, seed 48 / 7) | 0.72 / 0.67 | 0.31 / 0.29 | 2.3 / 2.3 |
| Per attempt, off | 0.68 / 0.68 | 0.34 / 0.34 | 2.0 / 2.0 |
| `c13-direction.ts`, on | 0.73 / 0.69 | 0.33 / 0.31 | 2.2 / 2.2 |
| `c13-direction.ts`, off | 0.70 / 0.70 | 0.35 / 0.35 | 2.0 / 2.0 |

- Called recruitment holds. Silent recruitment falls by about 0.03, so the ratio rises from 2.0 to 2.2–2.3.

**Predictions: 6 pass, 6 fail, 1 right in direction only.**

| Quantity | Predicted on | Off (seed 48 / 7) | On (seed 48 / 7) | Verdict |
| --- | --- | --- | --- | --- |
| Bout per crown visit, median | 36–44 min | 38.0 / 39.3 | 37.3 / 38.8 | pass |
| Crown visits per adult per day | 4.8–5.5 | 5.3 / 5.1 | 5.4 / 5.1 | pass (60 d: 5.7 / 5.2) |
| Joint departure, given a co-feeder | 0.70–0.90 | 0.58 / 0.53 | 0.63 / 0.57 | **fail** |
| A pair still together after 60 min | 0.70–0.85 | 0.52 / 0.57 | 0.62 / 0.63 | **fail** |
| Time with no companion | 0.35–0.50 | 0.59 / 0.61 | 0.47 / 0.53 | **fail** (one seed above) |
| Feeders per occupied crown | 1.3–1.6 | 1.18 / 1.16 | 1.26 / 1.21 | **fail** |
| T-PTY-1 (fitted row, not tuned) | 3.0–3.8 | 2.51 (2.55 / 2.46) | 2.86 (3.03 / 2.69); 60 d: 2.98 | **fail** (below 3) |
| T-PTY-4, female time alone | 0.40–0.52 | 0.594 | 0.509 | pass |
| T-RNG-4, day range | 2.2–2.7 km | 2.80 | 2.59 | pass |
| T-ACT-1 / T-ACT-2 | 0.40–0.43 / 0.17–0.20 | 0.427 / 0.200 | 0.425 / 0.195 | pass |
| Adult median hunger | +0.00 to +0.03 | 0.427 / 0.393 | 0.430 / 0.412 | pass |
| T-FOOD-6, revisit interval (6 months) | unchanged, 13–18 d | 7.8 d (6.2 / 9.4) | 7.5 d (5.5 / 9.6) | unchanged, as predicted; my range was wrong for a 6-month window |
| T-PTY-2, patch R² (6 months) | 0.02–0.08 | 0.013 | 0.010 | **fail** (unchanged; habitat-fruit R² 0.15 in both) |

- Other held-out reads, untuned: T-PTY-3 1.14 on against 1.47 off (noisy). T-FOOD-6 sits just outside its band (2–7 d) in both arms.

**Patrol reads from truth (integrator's request; nothing tuned).** 180 days, both seeds pooled.

| | Off | On |
| --- | --- | --- |
| Patrols | 34 | 46 |
| Share reaching 3 adult males | 0.68 | 0.67 |
| Adult males per patrol | 2.68 | 2.57 |

- Patrol size does not rise. **The number of patrols rises by a third** (0.22 → 0.30 per community-week in this window: 6 community-runs of 25.7 weeks). That is the quantity C14 fitted `patrolH0` to (0.30, on its own window of 90 days after a 180-day burn-in), so it needs its own look if this change merges.

**Why the effect is smaller than predicted, as I read it.**
- Parting within an hour fell by about a third (accompanied animals alone 60 min later: 0.29 → 0.19–0.22), not by the two thirds the pair arithmetic gave. Persistence only governs own trips to trees. The other ways of parting are untouched: trips to water, drifting to crowns beyond the 50 m link, followers dropping out, leaving after the 13-min cap, and nesting apart. I have not measured their shares.
- Fusion did not change: a solitary animal is in company an hour later in 20–23% of cases, in both arms. It is now the limiting rate.
- Party size still does not grow with community size (2.4–2.8 in the community of 23, 2.5–2.6 in the one of 12).
