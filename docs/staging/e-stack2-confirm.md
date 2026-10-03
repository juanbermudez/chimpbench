# Integrated confirm of the provisional candidates (integrator, registered 2 October 2026 before its run)

## Why
Each Track E stage was judged on its own reference. This run puts every provisional candidate together once, to
measure how close the emergent model now gets to the field against today's model (B) and the reference stack (R), and
whether the pieces stay viable together. Nothing goes on by default from it (Track E sequencing rule).

## The stack S2
R (handoff §3: `energyLedger`, `ledgerGrowSurplus`, `ledgerNightNurse`, `ledgerInfantIntake`, `ledgerNurseBout`,
`ledgerGrowPotential`, `ledgerDigesta`, `ledgerDrive`, `rhythmSleep`, `rhythmHeat`, `endoStates`, `endoEscalate`,
`endoRedirect`, `endoFast`, `endoRainDisplay`) plus:
- E1h `ledgerFoodEnergyFix` (keep conditional on the gut; its real effect is the activity budget);
- E1i `ledgerSatiationReserve`, `ledgerLactGut` (null under the strict viability line, but the only configuration
  with corrected food energy and no starvation; `ledgerLactGut` flagged: size matched to its load by construction);
- E4c `callValue` (confirmed provisional keep candidate);
- the E2f package as validated on its reference R0: `rhythmCircadian`, `departRace`, `nestLightDecide`, `sleepChimp`,
  `rhythmFreeNight`, `nestCompany`, `nestAudience`, `darkCost` (night safety confirmed on 5 seeds);
- E4f `preyKanyawara` (site-matched input, [L]).
Left out: E4d `endoRhythm` (recorded, removes nothing), E4e `huntValue` (held off: two errors cancelling), E3's switches
(not confirmed), `ledgerWildCostMult` (sensitivity tool).

## Runs
Field profile, rules policy, seeds 48, 7, 21, 5, 11, 30-day burn-in + 60 days, from `bench-run` at the commit that adds
this file: `e-bench --confirm` (S2), `energy-diagnose` (S2), `rhythm-metrics` (S2), one at a time, `--workers` 2 when
the load is under 8, else 1.

## Judgement
- Benchmark: S2's fitted and held-out sums (with and without T-HUN-4 and T-BRD-1) against the means of B's and of R's
  four confirm realizations (e-noise.md amendment 2; z with SD × √1.25), and the row-by-row picture against both.
- Prescriptions: S2 against B (135) and R (103).
- Viability: no starvation death; reserve slopes by class (the 0.05%/day line reported, as in E1i §8); night safety
  (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033, no night death).

Expected (integrator, before the run): prescriptions about 90 (high confidence); no starvation death (moderate);
mothers −0.1 to −0.3% of the store a day (low); night safety holds (low to moderate: interactions untested); fitted
below R's mean by 0.5–1.5 (moderate, the activity rows); held-out within noise of B's mean (low).

## Results (integrator, 2 October 2026; bench-run at 6f2ee87, clean; numbers generated from the JSON)

**Benchmark** (`e-bench --confirm`; against the four-run means of B and R, e-noise.md amendment 2):

| | B (today's model, 4 runs) | R (reference stack, 4 runs) | S2 |
| --- | --- | --- | --- |
| Prescriptions | 135 | 103 | **89** |
| Viability | pass | pass | pass (0 deaths in 5 seeds × 60 days) |
| Fitted, rows counted in all runs | 2.65 (16 rows) | 3.13 (17 rows) | 2.69: vs B +0.04 (z +0.1); vs R −0.44 (z −1.3): inside noise |
| Held-out, 14 rows | 4.74 | 4.54 | 7.15: vs B +2.41 (z +1.5); vs R +2.61 (z +1.3): inside noise |
| Held-out without T-HUN-4 and T-BRD-1, 12 rows | 1.78 | 2.57 | **4.69: vs B +2.92 (z +11.6); vs R +2.13 (z +9.1): worse, a result** |

Rows beyond the references' spread: better than R on T-ACT-1 (feeding, now inside its band) and T-ACT-3 (grooming,
inside); worse than both on **T-FOOD-10** (breakfast planning, the share of departures before sunrise in fruit-scarce
months, band 0.08–0.30: B 0.017, R 0, S2 0.764; distance 0.29–0.36 → 2.11), T-ACT-2 (travel share: S2 0.32 males,
0.29 females, band 0.12–0.25), T-FOOD-2 (fruit share 0.81, band 0.60–0.78), T-FOOD-5, T-FOOD-7 and T-RNG-5 (0.86; E1j
showed the observer's T-RNG-5 is mostly follow-day sampling).

**Energy** (`energy-diagnose`, simulation truth): no deaths. Reserves ÷ store per day: lactating −0.289%, juveniles
5–12 y −0.173%, other females −0.055%, males −0.031%. Lactating females eat 286 min and 795 g of dry matter and absorb
0.929 of what they spend; field-method intake 2,465 kcal (in its band). Ground path per day: males 3.79 km, other
females 3.48, lactating 3.17, juveniles 3.93.

**Night** (`rhythm-metrics`): adults out of a nest 2.37% of the night (per seed 1.98–2.57; line 3.3%), T-RHY-5 0.0245,
juveniles 5–15 y 2.33%, no night death. Departures before sunrise 0.73 (males 0.62, lactating 0.88; field 0.18).

**Against the expectations registered above:** prescriptions about 90 held (89); no starvation held; mothers −0.1 to
−0.3%/day held (−0.289, at the edge); night safety held; fitted below R's mean by 0.5–1.5 missed narrowly (−0.44);
held-out within noise of B's mean held on all rows (z +1.5) but **missed without the rare-event rows** (z +11.6).

**Reading.**
- *What the candidates achieve together:* 46 fewer prescriptions than today's model, everyone alive, the activity
  budget's feeding and grooming rows back in their bands, the staged intake rows in theirs, and a safe night without
  the night menu.
- *What they cost:* the non-rare held-out rows, by 2.9 against today's model. The largest single cost is T-FOOD-10
  (+1.8): the rhythm package (E2b–E2f lineage) makes animals leave well before sunrise (73%), and the row's band
  punishes that more than today's late departures. The second is the day's travel: animals walk about 3.2–3.9 km a day,
  the travel share leaves its band, and the mothers' and juveniles' deficits double against the E1i pair alone.
- *Next (registered below before its runs):* attribute the extra travel and deficit by leaving each package out, and
  test the water ledger (E2g, which removes the timed walks to water) on top.

## Attribution (registered 2 October 2026 before its runs)

Question: which package makes S2's animals walk 3.2–3.9 km a day and doubles the mothers' and juveniles' deficits,
and does the water ledger (E2g, merged since) take the timed walks to water out?

Runs: `energy-diagnose --seeds 48,7 --burn-in 30 --days 30` (quick length, simulation truth: ground path, reserve slopes
and eating minutes by class), from `bench-run` at the commit that adds this section, three at a time, one process each:
**R**; **S2**; **S2 − rhythm** (without `rhythmCircadian`, `departRace`, `nestLightDecide`, `sleepChimp`,
`rhythmFreeNight`, `nestCompany`, `nestAudience`, `darkCost`); **S2 − calls** (without `callValue`); **S2 − E1i**
(without `ledgerSatiationReserve`, `ledgerLactGut`); **S3** = S2 + `waterLedger`.

Reading rule: a package is named as the source of the extra travel if leaving it out brings males' ground path at
least halfway back from S2 to R; the water ledger "takes the walks out" if S3's males walk at least 0.4 km a day less
than S2's (E2g measured 0.38 km on R). Single runs: differences under 0.2 km or 0.05%/day are reported as not resolved.

### Attribution results (bench-run at 3329520, clean; energy-diagnose, seeds 48 and 7, 30 + 30 days; generated from the JSON)

| Arm | Ground km per day: males / other females / lactating / juveniles | Eating min: males / lactating | Reserves %/day: lactating / juveniles / other females | Deaths |
| --- | --- | --- | --- | --- |
| R | 2.16 / 1.79 / 1.60 / 2.33 | 179 / 208 | −0.010 / −0.012 / −0.000 | 0 |
| S2 | 3.71 / 3.43 / 3.07 / 3.95 | 253 / 287 | −0.191 / −0.148 / +0.009 | 0 |
| S2 − rhythm package | 3.42 / 3.08 / 2.45 / 3.32 | 247 / 277 | −0.139 / −0.113 / −0.008 | 0 |
| S2 − `callValue` | 2.97 / 2.70 / 2.61 / 3.12 | 255 / 292 | −0.135 / +0.004 / −0.017 | 0 |
| S2 − E1i pair | 4.17 / 3.74 / 3.27 / 4.19 | 249 / 221 | −1.029 / −0.306 / −0.090 | 0 |
| S3 = S2 + `waterLedger` | 2.82 / 2.58 / 2.45 / 2.79 | 246 / 288 | −0.159 / −0.071 / −0.022 | 0 |

**Reading (registered rule).** No single package brings males' path halfway back from S2 (3.71 km) to R (2.16 km):
leaving out `callValue` comes closest (−0.74 km, 48% of the gap; and the juveniles' deficit disappears), the rhythm
package −0.29 km (19%). The extra walking is shared: value-based calls are its largest single source. Leaving out
E1i's pair raises it (+0.46 km) and starves the mothers (−1.03%/day), as E1i predicts. **The water ledger takes the
timed walks out** (S3 −0.89 km against S2, more than its −0.38 km on R) and halves the juveniles' deficit. Next: the
integrated confirm of S3 (registered below), and a stage on why value-based calls add about 0.7 km of walking a day.

## S3 confirm (registered 2 October 2026 before its run)

S3 = S2 + `waterLedger` (E2g, provisional keep candidate). Same runs and judgement as S2 (§Runs, §Judgement):
`e-bench --confirm`, `energy-diagnose` and `rhythm-metrics` on seeds 48, 7, 21, 5, 11, 30 + 60 days, from `bench-run`
at the commit that adds this section; S3 against the four-run means of B and R, and against S2 (a single run; reported,
not judged). Expected (integrator, before the run): prescriptions about 83 (high); viable (moderate); travel share
(T-ACT-2) lower than S2's, still above its band for males (low); held-out without the rare-event rows still worse than
B beyond noise (moderate: T-FOOD-10 is not touched by water); night safety holds (moderate).

### S3 results (bench-run at d066cdc, clean; numbers generated from the JSON)

| | B (4 runs) | R (4 runs) | S2 | **S3 = S2 + `waterLedger`** |
| --- | --- | --- | --- | --- |
| Prescriptions | 135 | 103 | 89 | **83** |
| Viability | pass | pass | pass | pass (0 deaths) |
| Fitted against B's mean (16 rows) | 2.65 | — | +0.04 (z +0.1) | +0.17 (z +0.4) |
| Fitted against R's mean (18 rows) | — | 3.87 | — | −0.45 (z −0.8) |
| Held-out against B's mean (14 rows) | 4.74 | — | +2.41 (z +1.5) | +0.69 (z +0.4) |
| Held-out without T-HUN-4 and T-BRD-1 against B's mean (12 rows) | 1.78 | — | +2.92 (z +11.6) | **+2.97 (z +11.8)** |
| T-ACT-2 travel share, males / females (band 0.12–0.25) | 0.22 / 0.17 (base-head) | — | 0.32 / 0.29 | **0.26 / 0.24** |
| T-FOOD-10 breakfast planning (band 0.08–0.30) | 0.017 | 0 | 0.764 | 0.686 |
| Ground km per day, males / lactating (simulation truth) | — | 2.16 / 1.60 (quick) | 3.79 / 3.17 | **2.93 / 2.56** |
| Reserves %/day, lactating / juveniles | — | −0.068 / −0.014 (e1h-R) | −0.289 / −0.173 | **−0.249 / −0.118** |
| Adults out of a nest at night; departures before sunrise | — | — | 2.37%; 0.73 | 2.19%; 0.67 |

**Against the S3 expectations:** prescriptions about 83 held (83); viable held; travel share lower than S2's held, and
still above its band for males held (0.262); held-out without the rare rows still worse than B beyond noise held;
night safety held.

**Reading.** The water ledger removes most of the extra walking (males 3.79 → 2.93 km) and brings the travel share to
the edge of its band, with six fewer prescriptions, and softens the mothers' and juveniles' deficits. It does not touch
the held-out cost without the rare rows (+3.0 against today's model), which rests on T-FOOD-10 (the rhythm package's
departures before sunrise, 1.75) and on rows that need longer windows or better scoring (T-RNG-5, follow-day sampling;
T-FOOD-5, T-FOOD-7). Remaining problems of the candidate stack, in order of cost: departures before sunrise (67% vs
18%), the nursing and juvenile deficits (−0.25 and −0.12% of the store a day), hunting (T-HUN-1 48 per community-year,
with the scorer fixes of E4f unapplied), T-RNG-5 (single-site band, staged).

## S4 confirm (registered 2 October 2026 before its run)

S4 = S3 + `followCarer` + `cohesionValue` (E4g's defect fix and E5a's party cohesion, confirmed on 5 seeds on R).
Same runs and judgement as S2 and S3 (`e-bench --confirm`, `energy-diagnose`, `rhythm-metrics`; seeds 48, 7, 21, 5, 11;
30 + 60 days; from `bench-run` at the commit that adds this section), against the four-run means of B and R and beside
S3 (a single run; reported, not judged). Expected (integrator, before the run): prescriptions 77 (high: S3's 83 minus
the six party weights); viable (moderate); T-PTY-1 inside its band (moderate); held-out without the rare-event rows
still worse than B beyond noise (moderate: T-FOOD-10 is untouched); night safety holds (moderate).

### S4 results (bench-run at d256096, clean; numbers generated from the JSON)

| | S3 (single run) | **S4 = S3 + `followCarer` + `cohesionValue`** |
| --- | --- | --- |
| Prescriptions | 83 | **77** |
| Viability | pass | pass (3 deaths in seed 48, all a respiratory outbreak) |
| Fitted against B's mean / R's mean | +0.17 (z +0.4) / −0.45 (z −0.8) | +0.49 (z +1.2) / +0.07 (z +0.1) |
| Held-out against B's mean | +0.69 (z +0.4) | +0.51 (z +0.3) |
| Held-out without the rare rows against B's mean | +2.97 (z +11.8) | **+3.33 (z +13.2)** |
| T-ACT-2 travel, males / females (band 0.12–0.25) | 0.262 / 0.236 | 0.290 / 0.268 |
| T-PTY-1 (band 3–9) / T-ACT-3 males, females | 4.48 / 0.161, 0.180 | 4.16 / 0.126, 0.169 |
| Ground km per day, males / lactating (truth) | 2.93 / 2.56 | **3.43 / 2.84** |
| Reserves %/day, lactating / juveniles | −0.249 / −0.118 | −0.272 / −0.174 |
| Night: adults out of a nest; T-RHY-5; departures before sunrise | 2.19%; 0.0218; 0.67 | 2.68%; 0.0264; 0.77 (one death at night, during the outbreak) |

**Against the S4 expectations:** prescriptions 77 held; viable held; T-PTY-1 in band held; held-out without the rare
rows still worse than B held; night safety held (one death at night, recorded as the outbreak's).

**Reading.** Party cohesion valued by social need (E5a) passed on R alone, but on the integrated stack it adds about
0.5 km of walking a day for males, the travel share leaves its band again and the mothers' and juveniles' deficits
deepen: it interacts with value-based calls (the walking E4g traced to calls is joining and following parties). S3
stays the best integrated candidate; the E5a pair needs a stage on the call–cohesion interaction before it joins.

## S5 confirm (registered 2 October 2026 before its run)

S5 = S4 + `companyMargin` (E5b: an approach to a caller is worth only the company the caller adds beyond the best
companion already present; a correction to E5a's company valuation). Same runs and judgement as S2–S4 (`e-bench
--confirm`, `energy-diagnose`, `rhythm-metrics`; seeds 48, 7, 21, 5, 11; 30 + 60 days; from `bench-run` at the commit
that adds this section), against the four-run means of B and R and beside S3 and S4. Expected (integrator, before the
run): prescriptions 77 (high); viable (moderate); males' ground path at or below S3's (2.93 km) and the travel share
inside its band (moderate); the mothers' and juveniles' deficits at or better than S3's (moderate); T-PTY-1 inside its
band (moderate); held-out without the rare rows still worse than B beyond noise (moderate: T-FOOD-10 is untouched).

### S5 results (bench-run at 5911b36, clean; numbers generated from the JSON)

| | S3 | S4 | **S5 = S4 + `companyMargin`** |
| --- | --- | --- | --- |
| Prescriptions | 83 | 77 | **77** |
| Viability | pass | pass | pass (2 deaths: one outbreak, one illness) |
| Fitted against B's mean (16 rows) / R's mean (17–18 rows) | +0.17 (z +0.4) / −0.45 (z −0.8) | +0.49 (z +1.2) / +0.07 (z +0.1) | **−0.75 (z −1.8) / −1.09 (z −3.2)** |
| Held-out against B's mean (14 rows) | +0.69 (z +0.4) | +0.51 (z +0.3) | +1.99 (z +1.2) |
| Held-out without the rare rows against B's mean (12 rows) | +2.97 (z +11.8) | +3.33 (z +13.2) | +3.39 (z +13.5) |
| T-ACT-1 / T-ACT-3 / T-ACT-4 | pass / pass / — | pass / pass / — | pass / pass / pass |
| T-ACT-2 travel, males / females (band 0.12–0.25) | 0.262 / 0.236 | 0.290 / 0.268 | 0.258 / 0.216 |
| T-PTY-1 (band 3–9) / T-HUN-1 (5–25) | 4.48 / 48.3 | 4.16 / 41.0 | 3.38 / 34.7 |
| T-FOOD-10 (distance) | 0.686 (1.75) | 0.779 (2.18) | 0.806 (2.30) |
| Ground km per day, males / lactating | 2.93 / 2.56 | 3.43 / 2.84 | **2.73 / 2.44** |
| Reserves %/day, lactating / juveniles | −0.249 / −0.118 | −0.272 / −0.174 | **−0.233 / −0.086** |
| Night: adults out of a nest; T-RHY-5 | 2.19%; 0.0218 | 2.68%; 0.0264 | 2.73%; 0.0284 (one death at night; deaths were illness) |

**Against the S5 expectations:** prescriptions 77 held; viable held; males' path below S3's held (2.73 km); travel
share inside its band missed narrowly for males (0.258 against 0.25); the deficits better than S3's held; T-PTY-1 in
band held; held-out without the rare rows still worse than B held.

**Reading.** S5 is the best integrated candidate so far: 58 prescriptions fewer than today's model (77 against 135),
viable and safe at night, its fitted distance better than R's beyond noise (z −3.2) and level with or better than
today's model, every activity row but travel inside its band, and the walking and deficits that S4 added gone. Its cost
is still the held-out rows without the rare ones, mostly T-FOOD-10 (2.30): E2h showed that row rests on 5 Taï mothers
in fruit-scarce periods and is scored differently by the observer; its staged scoring (e2h-protocol.patch.json) would
change this reading and needs the user's approval.

## S6 confirm (registered 2 October 2026 before its runs)

**S6 = S5 + E1o's arm B** (`weanDecide` 1, `weanDeficit` 1: the mother refuses suckling while her relative reserve
deficit exceeds her infant's, and the refusal stands while she sleeps). E1o found it a provisional keep candidate in
quick mode (milk at 1–4 y 240 / 224 / 213 kcal/day against the 307 cap; nursing mothers −0.114 → +0.010% of the store a
day; sums inside noise; viable; night safe; 76 prescriptions). `milkInDrive` (arm A, a defect fix, null for the volume)
is left out: E1o did not test it with B (§2.2 of its prereg).

**Reference group, new:** S5 in confirm mode, the existing run (S5c) plus three re-draws (`rgTemperature` 0.1641,
0.1639, 0.16405: S5c1, S5c2, S5c3), each with energy-diagnose (5 seeds, 30 + 60 days). Judged by e-noise.md amendment 2:
z = (S6 − S5 mean) ÷ (SD × √(1 + 1/4)), SD = the registered confirm per-run SD (fitted 0.30, held-out 1.45, held-out
without T-HUN-4 and T-BRD-1 0.21) or the group's own spread if larger; energy readouts against the group's spread.
Runs: bench-run at this commit (code identical for S5: every new switch is 0 there), `--confirm`, workers 1–2 by load.

**Keep rule (as every stage):** viability passes; held-out not up beyond noise against the S5 mean (with and without
the rare rows); prescriptions fall (76 < 77). Night safety (rhythm-metrics, 5 seeds): adults out of a nest ≤ 3.3% of the
night and T-RHY-5 ≤ 0.033.

**Predictions (against the S5 group; moderate confidence unless stated).**

| Quantity | S5c (one run) | Predicted S6 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 77 | 76 | high |
| Viability | pass | pass | moderate |
| Milk drunk, infants 1–2 / 2–3 / 3–4 y (kcal/day) | at the cap (307) | below the cap, falling with age | moderate |
| Lactating females' reserves (%/day) | −0.146 (S5-energy) | better by ≥ 0.10 | moderate |
| Mothers' balance by infant age | falls or flat | rises with infant age (T-ENE-5's direction) | moderate |
| Juveniles' reserves (%/day) | −0.077 | within 0.05 | low |
| Fitted; held-out; held-out without the rare rows | group mean | inside noise | moderate |
| Night: adults out of a nest; T-RHY-5 | 2.73%; 0.0284 | ≤ 3.3%; ≤ 0.033 | moderate |

### S6 results (bench-run at cac9598, clean; every number below printed by the integrator's judge_s6.py and night.py from the JSON)

S5 group: S5c (5911b36, code identical for S5) and three re-draws S5c1–S5c3 (cac9598). All five runs viable with no
deaths in the S6 run. **Disclosures.** (1) The energy-diagnose runs of S5c2 and S5c3 were killed by the background time
limit while the machine ran at a load near 970 from other applications (hundreds of iOS Simulator and computer-use
processes); their benchmarks had finished. The energy readouts below therefore compare S6 with two S5 runs (S5c, S5c1),
whose spread is tiny, so their z values overstate significance: read them by size. (2) The registration's table quoted
S5's lactating "reserves" as −0.146 %/day: that number is the mean level of reserves ÷ store, not the daily slope. The
prediction (better by ≥ 0.10) is judged on the slope, as E1o measured it, and the level is reported beside it.
(3) One S5 re-draw (S5c2) scored T-IGE-3 (held out; the approach depending on own males, an intergroup statistic on few
events) at a distance of 21.6 against 1.1–2.6 in the others. That makes the group's held-out SD 9.3–9.8, so the
registered held-out test cannot detect much; a sensitivity reading without T-IGE-3 is printed below it, labelled as such.

```
bench reference runs: ['S5c', 'S5c1', 'S5c2', 'S5c3']; energy reference runs: ['S5c', 'S5c1']
  S5c: 5911b36 dirty 0 prescriptions 77
  S5c1: cac9598 dirty 0 prescriptions 77
  S5c2: cac9598 dirty 0 prescriptions 77
  S5c3: cac9598 dirty 0 prescriptions 77
  S6c: cac9598 dirty 0 prescriptions 76

confirm, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 15
  fitted             (16 rows) ref 1.90, 2.13, 2.15, 1.81 (mean 1.99, sd 0.17; used 0.30) | S6c.json: 1.99, Δ +0.00, z +0.0 (inside noise)
  held-out           (15 rows) ref 8.73, 10.01, 27.43, 7.99 (mean 13.54, sd 9.30; used 9.30) | S6c.json: 8.40, Δ -5.14, z -0.5 (inside noise)
  held-out w/o rare  (13 rows) ref 7.16, 7.24, 26.58, 6.43 (mean 11.85, sd 9.82; used 9.82) | S6c.json: 6.73, Δ -5.13, z -0.5 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 0.84±0.20 | S6c.json 0.91 (fail)
   T-HUN-1   fitted   ref 0.46±0.03 | S6c.json 0.30 (inconclusive)
   T-HUN-4   held-out ref 0.84±0.65 | S6c.json 0.76 (inconclusive)
   T-SOC-9   fitted   ref 0.00±0.00 | S6c.json 0.10 (inconclusive)

| Reserves ÷ store, % per day (OLS over the window) | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| adult male | -0.032 / -0.033 | -0.033 ± 0.000 | -0.031 | +13.5 |
| female, other | -0.054 / -0.045 | -0.050 ± 0.006 | -0.028 | +3.0 |
| female, lactating | -0.233 / -0.255 | -0.244 ± 0.016 | -0.125 | +6.3 |
| juvenile 5–12 y | -0.086 / -0.085 | -0.085 ± 0.001 | -0.075 | +10.8 |
| infant 2–5 y | -0.013 / -0.013 | -0.013 ± 0.000 | -0.106 | -213.0 |
| infant 0.5–2 y | -0.007 / -0.007 | -0.007 ± 0.000 | -0.147 | -441.2 |
| infant < 0.5 y | +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 | +nan |

| Milk drunk, kcal per infant-day | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 284 / 284 | 284 ± 0 | 279 | -14.9 |
| 1–2 y | 308 / 308 | 308 ± 0 | 238 | -513.6 |
| 2–3 y | 307 / 307 | 307 ± 0 | 198 | -4112.0 |
| 3–4 y | 307 / 307 | 307 ± 0 | 190 | -10606.6 |

| Mothers' balance, kcal/day by infant age | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| 0.5–1 y | -47 / -48 | -48 ± 1 | -36 | +16.8 |
| 1–2 y | -93 / -98 | -96 ± 3 | -79 | +4.2 |
| 2–3 y | -144 / -151 | -147 ± 5 | -65 | +13.8 |
| 3–4 y | -129 / -142 | -136 ± 9 | -43 | +8.1 |

| Ground km per day / eating min / reserves level | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.73 / 2.72 | 2.73 ± 0.01 | 2.68 | -4.6 |
| adult male: eatingMin | 255 / 255 | 255 ± 0 | 256 | +38.4 |
| adult male: reserves | -0.022 / -0.021 | -0.022 ± 0.001 | -0.022 | -0.4 |
| female, other: groundKm | 2.33 / 2.38 | 2.35 ± 0.03 | 2.22 | -3.4 |
| female, other: eatingMin | 248 / 250 | 249 ± 1 | 249 | +0.1 |
| female, other: reserves | -0.045 / -0.045 | -0.045 ± 0.000 | -0.042 | +12.2 |
| female, lactating: groundKm | 2.44 / 2.49 | 2.47 ± 0.04 | 2.50 | +0.7 |
| female, lactating: eatingMin | 284 / 284 | 284 ± 0 | 268 | -47.3 |
| female, lactating: reserves | -0.146 / -0.148 | -0.147 ± 0.002 | -0.079 | +32.3 |
| juvenile 5–12 y: groundKm | 2.68 / 2.69 | 2.69 ± 0.01 | 2.66 | -1.8 |
| juvenile 5–12 y: eatingMin | 268 / 268 | 268 ± 0 | 268 | +2.2 |
| juvenile 5–12 y: reserves | -0.077 / -0.079 | -0.078 ± 0.001 | -0.079 | -0.5 |
| infant 2–5 y: groundKm | 0.18 / 0.19 | 0.19 ± 0.01 | 0.23 | +5.5 |
| infant 2–5 y: eatingMin | 109 / 109 | 109 ± 0 | 150 | +136.7 |
| infant 2–5 y: reserves | -0.019 / -0.020 | -0.020 ± 0.001 | -0.082 | -84.6 |
S5c: births 0, deaths {'respiratory illness (outbreak)': 1, 'illness': 1}, living [245, 243]
S5c1: births 0, deaths {}, living [245, 245]
S6c: births 0, deaths {}, living [244, 244]
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s6/S6c-rhythm5.json: adults out of a nest 2.77% of night; T-RHY-5 0.0277; night deaths 0; deaths 0
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s5/S5-rhythm5.json: adults out of a nest 2.73% of night; T-RHY-5 0.0284; night deaths 1; deaths 2

Sensitivity (not the registered test): held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S5 5.17 / 4.70 / 4.94 / 5.33 (mean 5.03, sd 0.27; used 0.27); S6 5.39, delta +0.36, z +1.2
T-IGE-3 distance by run (S5c, S5c1, S5c2, S5c3, S6c): [1.99, 2.55, 21.64, 1.1, 1.34]
```

**Against the predictions.** Prescriptions 76: held. Viability: held. Milk at 1–2 / 2–3 / 3–4 y below the cap and
falling with age: held (238 / 198 / 190 kcal/day against 307–308). Lactating females' reserves better by ≥ 0.10 %/day:
held on the slope (−0.244 → −0.125); on the level, +0.07 (−0.147 → −0.079). Mothers' balance rising with infant age:
partly held (−79 → −65 → −43 kcal/day from 1–2 to 3–4 y, where S5 fell from −96 to −147 and −136; the 0.5–1 y class,
−36, is the highest). Juveniles within 0.05: held (−0.085 → −0.075). Sums inside noise: held (fitted z 0.0, held-out
z −0.5 with and without the rare rows; sensitivity without T-IGE-3 as well, z +1.2). Night: held (adults out of a nest
2.77% of the night, T-RHY-5 0.0277, no night deaths).

**Not predicted, a cost.** Infants now carry part of the dyad's deficit: reserves fall 0.11–0.15% of the store a day at
0.5–5 y (S5 about 0.01), most of it in the window's second half, when every class loses (the season's fruit), while
they still grow at the captive rate (E1o's open problem: growth yields only below condition 0.5). Over 90 days no infant
died; whether they settle or keep falling needs a run longer than the cap.

**Verdict: S6 passes the keep rule and replaces S5 as the best integrated candidate** (76 prescriptions, viable, night
safe, sums level with S5, nursing mothers' deficit halved and mothers recovering as infants grow), with the infants'
reserves the open cost. Energy readouts of S5c2 and S5c3 to be re-run when the machine is free.

**Rows the decision guide quotes** (printed by the integrator's rows_s6.py from the JSON; pooled over 5 seeds; S5 = its four confirm runs; T-ACT-2 on S6 by sex: males 0.242, females 0.213):

| Row | Band | S5 runs | S5 mean ± SD | S6 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.382 / 0.381 / 0.387 / 0.383 | 0.383 ± 0.002 | 0.378 |
| T-ACT-2 | 0.12–0.25 | 0.235 / 0.228 / 0.230 / 0.229 | 0.230 ± 0.003 | 0.226 |
| T-ACT-3 | 0.08–0.18 | 0.158 / 0.169 / 0.161 / 0.165 | 0.163 ± 0.005 | 0.164 |
| T-ACT-4 | 0.3–0.47 | 0.339 / 0.366 / 0.366 / 0.367 | 0.359 ± 0.014 | 0.377 |
| T-PTY-1 | 3–9 | 3.376 / 3.374 / 3.408 / 3.372 | 3.382 ± 0.017 | 3.307 |
| T-RNG-4 | 1.5–3.5 | 2.811 / 2.800 / 2.693 / 2.738 | 2.761 ± 0.055 | 2.575 |
| T-HUN-1 | 5–25 | 34.685 / 33.878 / 33.365 / 34.570 | 34.125 ± 0.619 | 31.021 |
| T-HUN-3 | 0.05–0.4 | 0.055 / 0.071 / 0.061 / 0.065 | 0.063 ± 0.007 | 0.057 |
| T-FOOD-2 | 0.6–0.78 | 0.772 / 0.772 / 0.756 / 0.764 | 0.766 ± 0.008 | 0.761 |
| T-FOOD-10 | 0.08–0.3 | 0.806 / 0.760 / 0.761 / 0.770 | 0.774 ± 0.022 | 0.766 |

**S6: energy group completed (19:20).** The energy-diagnose runs of S5c2 and S5c3 were re-run once the machine was free (bench-run cac9598, same parameters). With all four S5 runs the readings above stand: nursing mothers −0.241 ± 0.010 → −0.125%/day, juveniles inside S5's spread, infants beyond it (the cost). Printed by judge_s6.py:

| Reserves ÷ store, % per day (OLS over the window) | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| adult male | -0.032 / -0.033 / -0.030 / -0.034 | -0.032 ± 0.002 | -0.031 | +0.7 |
| female, other | -0.054 / -0.045 / -0.039 / -0.047 | -0.046 ± 0.006 | -0.028 | +2.6 |
| female, lactating | -0.233 / -0.255 / -0.239 / -0.238 | -0.241 ± 0.010 | -0.125 | +10.9 |
| juvenile 5–12 y | -0.086 / -0.085 / -0.068 / -0.092 | -0.083 ± 0.010 | -0.075 | +0.7 |
| infant 2–5 y | -0.013 / -0.013 / -0.014 / -0.014 | -0.013 ± 0.001 | -0.106 | -108.9 |
| infant 0.5–2 y | -0.007 / -0.007 / -0.002 / -0.003 | -0.005 ± 0.003 | -0.147 | -48.8 |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 | +nan |

| Milk drunk, kcal per infant-day | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 284 / 284 / 285 / 284 | 284 ± 0 | 279 | -9.5 |
| 1–2 y | 308 / 308 / 308 / 309 | 308 ± 0 | 238 | -267.9 |
| 2–3 y | 307 / 307 / 307 / 307 | 307 ± 0 | 198 | -6756.0 |
| 3–4 y | 307 / 307 / 307 / 307 | 307 ± 0 | 190 | -10377.4 |

| Mothers' balance, kcal/day by infant age | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| 0.5–1 y | -47 / -48 / -40 / -42 | -44 ± 4 | -36 | +1.8 |
| 1–2 y | -93 / -98 / -101 / -93 | -96 ± 4 | -79 | +4.3 |
| 2–3 y | -144 / -151 / -143 / -150 | -147 ± 4 | -65 | +17.3 |
| 3–4 y | -129 / -142 / -136 / -134 | -135 ± 5 | -43 | +15.0 |

| Ground km per day / eating min / reserves level | S5 runs | S5 mean ± SD | S6 | z |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.73 / 2.72 / 2.77 / 2.73 | 2.74 ± 0.02 | 2.68 | -2.4 |
| adult male: eatingMin | 255 / 255 / 256 / 254 | 255 ± 1 | 256 | +0.5 |
| adult male: reserves | -0.022 / -0.021 / -0.023 / -0.023 | -0.022 ± 0.001 | -0.022 | +0.1 |
| female, other: groundKm | 2.33 / 2.38 / 2.35 / 2.29 | 2.34 ± 0.04 | 2.22 | -2.7 |
| female, other: eatingMin | 248 / 250 / 250 / 247 | 249 ± 1 | 249 | +0.1 |
| female, other: reserves | -0.045 / -0.045 / -0.044 / -0.042 | -0.044 ± 0.001 | -0.042 | +1.3 |
| female, lactating: groundKm | 2.44 / 2.49 / 2.48 / 2.45 | 2.47 ± 0.03 | 2.50 | +1.0 |
| female, lactating: eatingMin | 284 / 284 / 284 / 284 | 284 ± 0 | 268 | -34.4 |
| female, lactating: reserves | -0.146 / -0.148 / -0.145 / -0.144 | -0.146 ± 0.002 | -0.079 | +29.2 |
| juvenile 5–12 y: groundKm | 2.68 / 2.69 / 2.70 / 2.69 | 2.69 ± 0.01 | 2.66 | -2.3 |
| juvenile 5–12 y: eatingMin | 268 / 268 / 270 / 269 | 269 ± 1 | 268 | -0.1 |
| juvenile 5–12 y: reserves | -0.077 / -0.079 / -0.075 / -0.081 | -0.078 ± 0.003 | -0.079 | -0.3 |
| infant 2–5 y: groundKm | 0.18 / 0.19 / 0.20 / 0.19 | 0.19 ± 0.01 | 0.23 | +6.4 |
| infant 2–5 y: eatingMin | 109 / 109 / 109 / 110 | 109 ± 1 | 150 | +72.2 |
| infant 2–5 y: reserves | -0.019 / -0.020 / -0.020 / -0.019 | -0.020 ± 0.001 | -0.082 | -110.5 |

## S7a and S7b confirms (registered 2 October 2026 before their runs)

Two corrections, each a provisional keep candidate in quick mode, confirmed on S6 one at a time so each effect is its own:
- **S7a = S6 + `growYield` 1** (E1p: growth in proportion to the relative store, reserves first as the sources order it).
- **S7b = S6 + `revisitByCrop` 1** (E3b: a crown fed in is valued by the crop believed left, not devalued for 12 h).

**Reference group, new:** S6 in confirm mode, the existing run (S6c, cac9598) plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405: S6c1, S6c2, S6c3), each with energy-diagnose. Judged by e-noise.md amendment 2 against the
group's mean (registered confirm per-run SD or the group's own spread if larger); sums reported with and without T-HUN-4
and T-BRD-1, and without T-IGE-3 as well (unstable on few events, S6 results). Runs: bench-run at this commit (code
identical for S6: every newer switch is 0), `--confirm`, workers 1–2 by load; energy-diagnose and rhythm-metrics (5 seeds,
30 + 60 days) for both arms.

**Keep rule for a correction (as E4g's `followCarer` was taken into S4 and S5):** viability passes; held-out not up
beyond noise against the S6 mean; night safe (adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033); the count of
prescriptions does not rise (a correction removes a design stand-in, not a counted prescription; its case rests on its
stage's sources: E1p's partition, E3b's absence of any source for time-decay avoidance).

**Predictions (against the S6 group; moderate confidence unless stated).**

| Quantity | S6c (one run) | S7a | S7b |
| --- | --- | --- | --- |
| Prescriptions | 76 | 76 (high) | 76 (high) |
| Viability; night safe | pass; 2.77% | pass; ≤ 3.3% | pass; ≤ 3.3% |
| Growth, infants 1–4 y (kg/y) | 3.6 | 3.3–3.5 | unchanged (low) |
| Reserves, infants 0.5–2 / 2–5 y (%/day, slope) | −0.147 / −0.106 | less negative by ≥ 25% (low) | — |
| Reserves, nursing mothers (%/day, slope) | −0.125 | less negative (low) | less negative by ≥ 0.05 |
| Males' ground km per day | 2.68 | unchanged | 1.75–2.0 |
| T-ACT-2 males; T-RNG-4 (observer, km) | 0.242; 2.58 | unchanged | 0.16–0.21; 1.8–2.3 (low) |
| T-HUN-1 (per community-year, band 5–25) | 31.0 | unchanged | 15–25 |
| T-FOOD-2 fruit share (band 0.6–0.78) | 0.761 | unchanged | 0.80–0.88, above its band (a known cost) |
| Fitted; held-out with and without the rare rows | group mean | inside noise | inside noise (low: T-FOOD-5's scorer counts a return as a nearest-tree choice) |

### S7a and S7b results (bench-run at cf22cde, clean; every number printed by the integrator's judge_s7.py and night.py from the JSON)

S6 group: S6c (cac9598, code identical for S6) and three re-draws S6c1–S6c3 (cf22cde), each with energy-diagnose.
Deaths: S7a one respiratory outbreak in seed 5 (6 deaths across classes: an adult male, two other females, a nursing
mother, an infant, a juvenile; no starvation); S7b two illness deaths; the S6 runs none or illness only.

```
bench reference runs: ['S6c', 'S6c1', 'S6c2', 'S6c3']; energy reference runs: ['S6c', 'S6c1', 'S6c2', 'S6c3']; arms: ['S7a', 'S7b']
  S6c: cac9598 dirty 0 prescriptions 76
  S6c1: cf22cde dirty 0 prescriptions 76
  S6c2: cf22cde dirty 0 prescriptions 76
  S6c3: cf22cde dirty 0 prescriptions 76
  S7a: cf22cde dirty 0 prescriptions 76
  S7b: cf22cde dirty 0 prescriptions 76

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.99, 2.27, 1.40, 2.02 (mean 1.92, sd 0.37; used 0.37) | S7a.json: 1.41, Δ -0.51, z -1.2 (inside noise) | S7b.json: 2.01, Δ +0.09, z +0.2 (inside noise)
  held-out           (14 rows) ref 7.07, 5.71, 9.61, 6.33 (mean 7.18, sd 1.71; used 1.71) | S7a.json: 7.99, Δ +0.81, z +0.4 (inside noise) | S7b.json: 7.43, Δ +0.25, z +0.1 (inside noise)
  held-out w/o rare  (12 rows) ref 5.39, 5.32, 4.98, 5.22 (mean 5.23, sd 0.18; used 0.21) | S7a.json: 5.44, Δ +0.22, z +0.9 (inside noise) | S7b.json: 4.45, Δ -0.77, z -3.3 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-3   fitted   ref 0.04±0.02 | S7a.json 0.03 (fail) | S7b.json 0.21 (fail)
   T-BRD-1   held-out ref 1.31±1.28 | S7a.json 1.65 (fail) | S7b.json 1.77 (fail)
   T-FOOD-10 held-out ref 2.14±0.03 | S7a.json 2.08 (fail) | S7b.json 1.96 (fail)
   T-FOOD-2  fitted   ref 0.00±0.00 | S7a.json 0.00 (inconclusive) | S7b.json 0.17 (fail)
   T-FOOD-5  held-out ref 0.23±0.01 | S7a.json 0.25 (fail) | S7b.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 0.64±0.62 | S7a.json 0.89 (fail) | S7b.json 1.21 (fail)
   T-RNG-5   held-out ref 1.07±0.11 | S7a.json 1.39 (fail) | S7b.json 0.49 (fail)
   T-SOC-9   fitted   ref 0.04±0.05 | S7a.json 0.00 (inconclusive) | S7b.json 0.19 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S6 5.39 / 5.32 / 4.98 / 5.22 (mean 5.23, sd 0.18; used 0.21); S7a 5.44 (z +0.9); S7b 4.45 (z -3.3)
T-IGE-3 distance by run: [1.34, None, 0.8, None, 1.44, 2.32]

| Reserves ÷ store, % per day (OLS) | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- |
| adult male | -0.031 / -0.032 / -0.033 / -0.029 | -0.031 ± 0.002 | -0.031 (z +0.3) | -0.021 (z +5.4) |
| female, other | -0.028 / -0.045 / -0.047 / -0.035 | -0.039 ± 0.009 | -0.046 (z -0.7) | -0.029 (z +0.9) |
| female, lactating | -0.125 / -0.106 / -0.113 / -0.124 | -0.117 ± 0.009 | -0.094 (z +2.3) | -0.054 (z +6.1) |
| juvenile 5–12 y | -0.075 / -0.088 / -0.087 / -0.078 | -0.082 ± 0.006 | -0.068 (z +2.0) | -0.033 (z +6.8) |
| infant 2–5 y | -0.106 / -0.082 / -0.086 / -0.107 | -0.095 ± 0.013 | -0.068 (z +1.8) | -0.035 (z +4.1) |
| infant 0.5–2 y | -0.147 / -0.140 / -0.190 / -0.145 | -0.156 ± 0.023 | -0.124 (z +1.2) | -0.090 (z +2.5) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 2.94 / 2.94 / 2.93 / 2.94 | 2.94 ± 0.00 | 2.73 (z -37.1) | 2.96 (z +4.0) |
| 1–2 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.35 (z +nan) | 3.60 (z +nan) |
| 2–3 y | 3.60 / 3.60 / 3.62 / 3.60 | 3.60 ± 0.01 | 3.30 (z -27.3) | 3.60 (z -0.4) |
| 3–4 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.32 (z +nan) | 3.60 (z +nan) |

| Milk drunk, kcal per infant-day | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 279 / 278 / 279 / 279 | 279 ± 0 | 276 (z -6.7) | 282 (z +6.0) |
| 1–2 y | 238 / 237 / 234 / 235 | 236 ± 2 | 240 (z +1.8) | 274 (z +18.8) |
| 2–3 y | 198 / 201 / 206 / 194 | 200 ± 5 | 197 (z -0.5) | 236 (z +6.5) |
| 3–4 y | 190 / 190 / 196 / 187 | 191 ± 4 | 184 (z -1.5) | 236 (z +10.4) |

| Mothers' balance, kcal/day by infant age | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- |
| 0.5–1 y | -36 / -39 / -41 / -38 | -39 ± 2 | -39 (z -0.2) | -26 (z +6.2) |
| 1–2 y | -79 / -69 / -74 / -82 | -76 ± 6 | -64 (z +1.9) | -42 (z +5.4) |
| 2–3 y | -65 / -53 / -50 / -67 | -58 ± 9 | -47 (z +1.2) | -21 (z +3.9) |
| 3–4 y | -43 / -42 / -39 / -51 | -44 ± 5 | -32 (z +2.0) | -14 (z +5.1) |

| Ground km / eating min / fruit share | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.68 / 2.73 / 2.74 / 2.71 | 2.71 ± 0.03 | 2.74 (z +1.0) | 2.00 (z -25.3) |
| adult male: eatingMin | 255.76 / 255.39 / 254.97 / 254.74 | 255.21 ± 0.45 | 254.12 (z -2.2) | 237.91 (z -34.3) |
| adult male: fruitShare | 0.75 / 0.76 / 0.76 / 0.76 | 0.75 ± 0.00 | 0.76 (z +1.4) | 0.83 (z +21.8) |
| female, other: groundKm | 2.22 / 2.35 / 2.28 / 2.36 | 2.30 ± 0.07 | 2.35 (z +0.7) | 1.67 (z -8.6) |
| female, other: eatingMin | 248.73 / 251.10 / 247.71 / 246.46 | 248.50 ± 1.97 | 249.33 (z +0.4) | 228.77 (z -9.0) |
| female, other: fruitShare | 0.63 / 0.63 / 0.64 / 0.64 | 0.63 ± 0.00 | 0.64 (z +0.6) | 0.69 (z +13.3) |
| female, lactating: groundKm | 2.50 / 2.48 / 2.44 / 2.54 | 2.49 ± 0.04 | 2.44 (z -1.1) | 1.59 (z -19.7) |
| female, lactating: eatingMin | 268.45 / 271.67 / 271.37 / 269.39 | 270.22 ± 1.56 | 271.11 (z +0.5) | 264.30 (z -3.4) |
| female, lactating: fruitShare | 0.81 / 0.80 / 0.81 / 0.80 | 0.81 ± 0.01 | 0.80 (z -0.8) | 0.85 (z +5.6) |
| juvenile 5–12 y: groundKm | 2.66 / 2.71 / 2.71 / 2.71 | 2.70 ± 0.02 | 2.68 (z -0.8) | 1.81 (z -36.6) |
| juvenile 5–12 y: eatingMin | 268.48 / 269.58 / 270.10 / 268.46 | 269.15 ± 0.82 | 267.75 (z -1.5) | 257.70 (z -12.5) |
| juvenile 5–12 y: fruitShare | 0.89 / 0.90 / 0.89 / 0.89 | 0.89 ± 0.00 | 0.90 (z +1.7) | 0.92 (z +17.3) |

| Row (pooled) | Band | S6 runs | S6 mean ± SD | S7a | S7b |
| --- | --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.378 / 0.378 / 0.380 / 0.376 | 0.378 ± 0.002 | 0.377 | 0.366 |
| T-ACT-2 | 0.12–0.25 | 0.226 / 0.225 / 0.228 / 0.225 | 0.226 ± 0.001 | 0.224 | 0.169 |
| T-ACT-3 | 0.08–0.18 | 0.164 / 0.165 / 0.161 / 0.165 | 0.164 ± 0.002 | 0.168 | 0.194 |
| T-ACT-4 | 0.3–0.47 | 0.377 / 0.335 / 0.356 / 0.377 | 0.361 ± 0.020 | 0.355 | 0.418 |
| T-PTY-1 | 3–9 | 3.307 / 3.448 / 3.293 / 3.427 | 3.369 ± 0.080 | 3.416 | 3.305 |
| T-RNG-4 | 1.5–3.5 | 2.575 / 2.576 / 2.701 / 2.628 | 2.620 ± 0.059 | 2.572 | 1.948 |
| T-HUN-1 | 5–25 | 31.021 / 35.776 / 25.755 / 33.401 | 31.488 ± 4.287 | 28.201 | 23.769 |
| T-HUN-3 | 0.05–0.4 | 0.057 / 0.059 / 0.057 / 0.053 | 0.057 ± 0.002 | 0.068 | 0.062 |
| T-FOOD-2 | 0.6–0.78 | 0.761 / 0.764 / 0.766 / 0.755 | 0.761 ± 0.005 | 0.764 | 0.811 |
| T-FOOD-4 | 4–15 | 7.493 / 7.376 / 7.521 / 7.482 | 7.468 ± 0.063 | 7.596 | 8.006 |
| T-FOOD-6 | 2–7 | 5.214 / 4.927 / 5.216 / 4.901 | 5.065 ± 0.174 | 5.021 | 5.431 |
| T-FOOD-10 | 0.08–0.3 | 0.766 / 0.781 / 0.772 / 0.766 | 0.771 ± 0.007 | 0.757 | 0.732 |
S7a T-ACT-2 by sex: {'male': 0.23481900163659986, 'female': 0.21483996158074822}
S7b T-ACT-2 by sex: {'male': 0.1922357084524383, 'female': 0.14929181902489427}
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s7/S7a-rhythm5.json: adults out of a nest 2.71% of night; T-RHY-5 0.0275; night deaths 2; deaths 6
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s7/S7b-rhythm5.json: adults out of a nest 2.52% of night; T-RHY-5 0.0261; night deaths 2; deaths 2
```

**S7a against the predictions.** Prescriptions 76: held. Viability and night: held (2.71%, T-RHY-5 0.0275). Growth 3.3–3.5
kg/y at 1–4 y: held (3.30–3.35). Infants' reserves less negative by ≥ 25%: held at 2–5 y (−0.095 → −0.068, 28%), missed
narrowly at 0.5–2 y (−0.156 → −0.124, 21%). Nursing mothers less negative: held (−0.117 → −0.094). Sums inside noise:
held (fitted z −1.2, held-out +0.4, without the rare rows +0.9).

**S7b against the predictions.** Prescriptions 76, viability, night (2.52%, 0.0261): held. Nursing mothers better by
≥ 0.05: held (−0.117 → −0.054); every class gains. Males' ground km 1.75–2.0: held at the edge (2.00). T-ACT-2 males
0.16–0.21: held (0.192); T-RNG-4 1.8–2.3: held (1.95). T-HUN-1 15–25: held (23.8, into its band). T-FOOD-2 0.80–0.88:
held (0.811, above its band, the known cost). Sums: fitted and held-out inside noise; held-out without the rare rows
**better beyond noise** (z −3.3; T-RNG-5 1.07 → 0.49, T-FOOD-10 2.14 → 1.96, and T-FOOD-5 0.23 → 0, which E3b showed is
partly its scorer counting a return as a nearest-tree choice). Not predicted: grooming rises above its band (T-ACT-3
0.164 → 0.194; band 0.08–0.18) and rest rises (T-ACT-4 0.361 → 0.418, in band), filling the time walking freed; and
infants drink more milk (1–2 / 2–3 / 3–4 y: 236 / 200 / 191 → 274 / 236 / 236 kcal/day) because better-fed mothers
refuse less (E1o's rule compares the two deficits).

**Verdict: both pass the keep rule for a correction.** S7a is small and in the sources' direction. S7b is large: every
class's balance improves, walking and hunting move into their bands and held-out improves beyond noise, at the cost of
two fitted rows leaving their bands (fruit share, grooming). Next: both together on S6 (S8).

## S8 confirm (registered 2 October 2026 before its run)

**S8 = S6 + `growYield` 1 + `revisitByCrop` 1** (both corrections that passed as S7a and S7b). Judged against the same S6
group (S6c, S6c1–S6c3) by the same rule as S7a and S7b; bench-run stays at cf22cde (code identical to this commit, which
changes only this file); bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days.

**Predictions (against the S6 group; moderate confidence unless stated).** Prescriptions 76 (high); viability and night
safety pass; nursing mothers' reserves near S7b's (−0.054 ± 0.02 %/day); infants' reserves less negative than S7b's
(−0.090 / −0.035 at 0.5–2 / 2–5 y; low); growth at 1–4 y 3.3–3.55 kg/y (low: S7b's better reserves leave less to yield);
males' ground km 1.9–2.1; T-ACT-2 males 0.17–0.21; T-RNG-4 1.8–2.1; T-HUN-1 15–28 (low); T-FOOD-2 0.80–0.83 and T-ACT-3
0.18–0.21, both above their bands (the costs S7b showed); fitted inside noise; held-out without the rare rows better
beyond noise, as S7b.

### S8 results (bench-run at cf22cde, clean; printed by judge_s7.py and night.py from the JSON; S7a and S7b repeated beside it)

```
bench reference runs: ['S6c', 'S6c1', 'S6c2', 'S6c3']; energy reference runs: ['S6c', 'S6c1', 'S6c2', 'S6c3']; arms: ['S7a', 'S7b', 'S8']
  S6c: cac9598 dirty 0 prescriptions 76
  S6c1: cf22cde dirty 0 prescriptions 76
  S6c2: cf22cde dirty 0 prescriptions 76
  S6c3: cf22cde dirty 0 prescriptions 76
  S7a: cf22cde dirty 0 prescriptions 76
  S7b: cf22cde dirty 0 prescriptions 76
  S8: cf22cde dirty 0 prescriptions 76

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.99, 2.27, 1.40, 2.02 (mean 1.92, sd 0.37; used 0.37) | S7a.json: 1.41, Δ -0.51, z -1.2 (inside noise) | S7b.json: 2.01, Δ +0.09, z +0.2 (inside noise) | S8.json: 1.85, Δ -0.08, z -0.2 (inside noise)
  held-out           (14 rows) ref 7.07, 5.71, 9.61, 6.33 (mean 7.18, sd 1.71; used 1.71) | S7a.json: 7.99, Δ +0.81, z +0.4 (inside noise) | S7b.json: 7.43, Δ +0.25, z +0.1 (inside noise) | S8.json: 5.49, Δ -1.69, z -0.9 (inside noise)
  held-out w/o rare  (12 rows) ref 5.39, 5.32, 4.98, 5.22 (mean 5.23, sd 0.18; used 0.21) | S7a.json: 5.44, Δ +0.22, z +0.9 (inside noise) | S7b.json: 4.45, Δ -0.77, z -3.3 RESULT | S8.json: 3.60, Δ -1.63, z -6.9 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-3   fitted   ref 0.04±0.02 | S7a.json 0.03 (fail) | S7b.json 0.21 (fail) | S8.json 0.26 (fail)
   T-BRD-1   held-out ref 1.31±1.28 | S7a.json 1.65 (fail) | S7b.json 1.77 (fail) | S8.json 1.39 (fail)
   T-FOOD-10 held-out ref 2.14±0.03 | S7a.json 2.08 (fail) | S7b.json 1.96 (fail) | S8.json 1.82 (fail)
   T-FOOD-2  fitted   ref 0.00±0.00 | S7a.json 0.00 (inconclusive) | S7b.json 0.17 (fail) | S8.json 0.17 (fail)
   T-FOOD-5  held-out ref 0.23±0.01 | S7a.json 0.25 (fail) | S7b.json 0.00 (inconclusive) | S8.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 0.64±0.62 | S7a.json 0.89 (fail) | S7b.json 1.21 (fail) | S8.json 0.50 (inconclusive)
   T-IGE-2   held-out ref 0.50±0.00 | S7a.json 0.50 (fail) | S7b.json 0.50 (fail) | S8.json 0.08 (inconclusive)
   T-RNG-5   held-out ref 1.07±0.11 | S7a.json 1.39 (fail) | S7b.json 0.49 (fail) | S8.json 0.52 (fail)
   T-SOC-9   fitted   ref 0.04±0.05 | S7a.json 0.00 (inconclusive) | S7b.json 0.19 (inconclusive) | S8.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S6 5.39 / 5.32 / 4.98 / 5.22 (mean 5.23, sd 0.18; used 0.21); S7a 5.44 (z +0.9); S7b 4.45 (z -3.3); S8 3.60 (z -6.9)
T-IGE-3 distance by run: [1.34, None, 0.8, None, 1.44, 2.32, None]

| Reserves ÷ store, % per day (OLS) | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- |
| adult male | -0.031 / -0.032 / -0.033 / -0.029 | -0.031 ± 0.002 | -0.031 (z +0.3) | -0.021 (z +5.4) | -0.020 (z +6.3) |
| female, other | -0.028 / -0.045 / -0.047 / -0.035 | -0.039 ± 0.009 | -0.046 (z -0.7) | -0.029 (z +0.9) | -0.023 (z +1.5) |
| female, lactating | -0.125 / -0.106 / -0.113 / -0.124 | -0.117 ± 0.009 | -0.094 (z +2.3) | -0.054 (z +6.1) | -0.046 (z +7.0) |
| juvenile 5–12 y | -0.075 / -0.088 / -0.087 / -0.078 | -0.082 ± 0.006 | -0.068 (z +2.0) | -0.033 (z +6.8) | -0.042 (z +5.6) |
| infant 2–5 y | -0.106 / -0.082 / -0.086 / -0.107 | -0.095 ± 0.013 | -0.068 (z +1.8) | -0.035 (z +4.1) | -0.030 (z +4.4) |
| infant 0.5–2 y | -0.147 / -0.140 / -0.190 / -0.145 | -0.156 ± 0.023 | -0.124 (z +1.2) | -0.090 (z +2.5) | -0.067 (z +3.5) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 2.94 / 2.94 / 2.93 / 2.94 | 2.94 ± 0.00 | 2.73 (z -37.1) | 2.96 (z +4.0) | 2.79 (z -26.4) |
| 1–2 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.35 (z +nan) | 3.60 (z +nan) | 3.46 (z +nan) |
| 2–3 y | 3.60 / 3.60 / 3.62 / 3.60 | 3.60 ± 0.01 | 3.30 (z -27.3) | 3.60 (z -0.4) | 3.42 (z -16.5) |
| 3–4 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.32 (z +nan) | 3.60 (z +nan) | 3.45 (z +nan) |

| Milk drunk, kcal per infant-day | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 279 / 278 / 279 / 279 | 279 ± 0 | 276 (z -6.7) | 282 (z +6.0) | 279 (z -0.2) |
| 1–2 y | 238 / 237 / 234 / 235 | 236 ± 2 | 240 (z +1.8) | 274 (z +18.8) | 279 (z +20.9) |
| 2–3 y | 198 / 201 / 206 / 194 | 200 ± 5 | 197 (z -0.5) | 236 (z +6.5) | 239 (z +6.9) |
| 3–4 y | 190 / 190 / 196 / 187 | 191 ± 4 | 184 (z -1.5) | 236 (z +10.4) | 234 (z +10.0) |

| Mothers' balance, kcal/day by infant age | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- |
| 0.5–1 y | -36 / -39 / -41 / -38 | -39 ± 2 | -39 (z -0.2) | -26 (z +6.2) | -19 (z +9.2) |
| 1–2 y | -79 / -69 / -74 / -82 | -76 ± 6 | -64 (z +1.9) | -42 (z +5.4) | -27 (z +7.8) |
| 2–3 y | -65 / -53 / -50 / -67 | -58 ± 9 | -47 (z +1.2) | -21 (z +3.9) | -22 (z +3.8) |
| 3–4 y | -43 / -42 / -39 / -51 | -44 ± 5 | -32 (z +2.0) | -14 (z +5.1) | -15 (z +5.0) |

| Ground km / eating min / fruit share | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- |
| adult male: groundKm | 2.68 / 2.73 / 2.74 / 2.71 | 2.71 ± 0.03 | 2.74 (z +1.0) | 2.00 (z -25.3) | 1.88 (z -29.5) |
| adult male: eatingMin | 255.76 / 255.39 / 254.97 / 254.74 | 255.21 ± 0.45 | 254.12 (z -2.2) | 237.91 (z -34.3) | 237.21 (z -35.6) |
| adult male: fruitShare | 0.75 / 0.76 / 0.76 / 0.76 | 0.75 ± 0.00 | 0.76 (z +1.4) | 0.83 (z +21.8) | 0.83 (z +20.5) |
| female, other: groundKm | 2.22 / 2.35 / 2.28 / 2.36 | 2.30 ± 0.07 | 2.35 (z +0.7) | 1.67 (z -8.6) | 1.57 (z -10.0) |
| female, other: eatingMin | 248.73 / 251.10 / 247.71 / 246.46 | 248.50 ± 1.97 | 249.33 (z +0.4) | 228.77 (z -9.0) | 228.99 (z -8.9) |
| female, other: fruitShare | 0.63 / 0.63 / 0.64 / 0.64 | 0.63 ± 0.00 | 0.64 (z +0.6) | 0.69 (z +13.3) | 0.70 (z +14.1) |
| female, lactating: groundKm | 2.50 / 2.48 / 2.44 / 2.54 | 2.49 ± 0.04 | 2.44 (z -1.1) | 1.59 (z -19.7) | 1.52 (z -21.3) |
| female, lactating: eatingMin | 268.45 / 271.67 / 271.37 / 269.39 | 270.22 ± 1.56 | 271.11 (z +0.5) | 264.30 (z -3.4) | 266.76 (z -2.0) |
| female, lactating: fruitShare | 0.81 / 0.80 / 0.81 / 0.80 | 0.81 ± 0.01 | 0.80 (z -0.8) | 0.85 (z +5.6) | 0.84 (z +4.2) |
| juvenile 5–12 y: groundKm | 2.66 / 2.71 / 2.71 / 2.71 | 2.70 ± 0.02 | 2.68 (z -0.8) | 1.81 (z -36.6) | 1.73 (z -39.9) |
| juvenile 5–12 y: eatingMin | 268.48 / 269.58 / 270.10 / 268.46 | 269.15 ± 0.82 | 267.75 (z -1.5) | 257.70 (z -12.5) | 259.59 (z -10.4) |
| juvenile 5–12 y: fruitShare | 0.89 / 0.90 / 0.89 / 0.89 | 0.89 ± 0.00 | 0.90 (z +1.7) | 0.92 (z +17.3) | 0.91 (z +13.4) |

| Row (pooled) | Band | S6 runs | S6 mean ± SD | S7a | S7b | S8 |
| --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.378 / 0.378 / 0.380 / 0.376 | 0.378 ± 0.002 | 0.377 | 0.366 | 0.359 |
| T-ACT-2 | 0.12–0.25 | 0.226 / 0.225 / 0.228 / 0.225 | 0.226 ± 0.001 | 0.224 | 0.169 | 0.161 |
| T-ACT-3 | 0.08–0.18 | 0.164 / 0.165 / 0.161 / 0.165 | 0.164 ± 0.002 | 0.168 | 0.194 | 0.208 |
| T-ACT-4 | 0.3–0.47 | 0.377 / 0.335 / 0.356 / 0.377 | 0.361 ± 0.020 | 0.355 | 0.418 | 0.430 |
| T-PTY-1 | 3–9 | 3.307 / 3.448 / 3.293 / 3.427 | 3.369 ± 0.080 | 3.416 | 3.305 | 3.317 |
| T-RNG-4 | 1.5–3.5 | 2.575 / 2.576 / 2.701 / 2.628 | 2.620 ± 0.059 | 2.572 | 1.948 | 1.754 |
| T-HUN-1 | 5–25 | 31.021 / 35.776 / 25.755 / 33.401 | 31.488 ± 4.287 | 28.201 | 23.769 | 23.796 |
| T-HUN-3 | 0.05–0.4 | 0.057 / 0.059 / 0.057 / 0.053 | 0.057 ± 0.002 | 0.068 | 0.062 | 0.053 |
| T-FOOD-2 | 0.6–0.78 | 0.761 / 0.764 / 0.766 / 0.755 | 0.761 ± 0.005 | 0.764 | 0.811 | 0.811 |
| T-FOOD-4 | 4–15 | 7.493 / 7.376 / 7.521 / 7.482 | 7.468 ± 0.063 | 7.596 | 8.006 | 7.861 |
| T-FOOD-6 | 2–7 | 5.214 / 4.927 / 5.216 / 4.901 | 5.065 ± 0.174 | 5.021 | 5.431 | 5.325 |
| T-FOOD-10 | 0.08–0.3 | 0.766 / 0.781 / 0.772 / 0.766 | 0.771 ± 0.007 | 0.757 | 0.732 | 0.701 |
S7a T-ACT-2 by sex: {'male': 0.23481900163659986, 'female': 0.21483996158074822}
S7b T-ACT-2 by sex: {'male': 0.1922357084524383, 'female': 0.14929181902489427}
S8 T-ACT-2 by sex: {'male': 0.1821861000386548, 'female': 0.1431784819283101}
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s7/S8-rhythm5.json: adults out of a nest 2.59% of night; T-RHY-5 0.0260; night deaths 0; deaths 0
```

**Against the predictions.** Prescriptions 76, viability (no deaths) and night (2.59%, T-RHY-5 0.0260): held. Nursing
mothers near S7b's: held (−0.046). Infants' reserves less negative than S7b's: held (−0.067 / −0.030 against −0.090 /
−0.035). Growth at 1–4 y 3.3–3.55: held (3.42–3.46). Males' ground km 1.9–2.1: missed narrowly (1.88). T-ACT-2 males
0.17–0.21: held (0.182). T-RNG-4 1.8–2.1: missed narrowly (1.75, inside its band 1.5–3.5). T-HUN-1 15–28: held (23.8).
T-FOOD-2 and T-ACT-3 above their bands: held (0.811; 0.208). Fitted inside noise: held (z −0.2). Held-out without the
rare rows better beyond noise: held (z −6.9: 5.23 → 3.60; T-RNG-5, T-FOOD-10, T-FOOD-5 and T-IGE-2 move most).

**Verdict: S8 passes the keep rule and replaces S6 as the best integrated candidate.** 76 prescriptions; every class's
energy balance improves (nursing mothers −0.117 → −0.046% of the store a day, infants −0.156 / −0.095 → −0.067 / −0.030);
walking, travel share and hunting inside their bands; held-out better beyond noise. Costs: the time walking and eating
freed goes to grooming and rest, so grooming (T-ACT-3, a fitted row) and fruit share (T-FOOD-2, fitted) leave their bands;
males' path (1.88 km) and T-RNG-4 (1.75) sit in the lower half of their bands. Infants drink more milk again (279 / 239 /
234 kcal/day at 1–2 / 2–3 / 3–4 y) because better-fed mothers refuse less; mothers' balance stays near −15 to −27 kcal/day
at every infant age. The next lever these costs name is what fills free time: the social need still rises on fixed timers.
