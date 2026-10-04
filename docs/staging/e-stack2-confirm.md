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

## S9 confirm (registered 3 October 2026 before its runs)

**S9 = S8 + E5d's G4** (`groomDrive` 1, `socialUpkeep` 2, `followMargin` 1): partner terms of grooming weighted by the
groomer's need; the social need rises by what relationships lose to their daily relaxation and only grooming meets it
(the two social timers `socialAwakePerH` and `socialSleepPerH` out: 76 → 74 prescriptions); the company margin of E5b
extended to every move toward a companion. In quick mode G4 put grooming in band for both sexes and had the stage's best
fitted sum, but failed held-out without the rare rows (z +2.2), all of it T-RNG-5 (the observer's ratio of mothers' to
males' day range, on 9–10 follow-days per seed; E1j showed that row is mostly follow-day sampling).

**Reference group, new:** S8 in confirm mode, the existing run (S8, cf22cde) plus three re-draws (`rgTemperature` 0.1641,
0.1639, 0.16405: S8c1, S8c2, S8c3), each with energy-diagnose. Judged by e-noise.md amendment 2 as before.

**Keep rule (the standard one):** viability passes; held-out not up beyond noise against the S8 mean, with and without
T-HUN-4 and T-BRD-1 (and reported without T-IGE-3); prescriptions fall (74 < 76); night safe (≤ 3.3%, T-RHY-5 ≤ 0.033).
**Reported, not part of the test:** the true ratio of nursing mothers' to adult males' ground path (energy-diagnose) and a
sensitivity of the held-out sums without T-RNG-5, labelled as such.

**Predictions (against the S8 group; moderate confidence unless stated).**

| Quantity | S8 (one run) | Predicted S9 |
| --- | --- | --- |
| Prescriptions | 76 | 74 (high) |
| Viability; night safe | pass; 2.59% | pass; ≤ 3.3% |
| T-ACT-3 (band 0.08–0.18) | 0.208 | 0.08–0.13, both sexes in band |
| Grooming minutes per day, every adult class | — | lower than S8 (high) |
| T-ACT-2 (band 0.12–0.25) | 0.161 | 0.14–0.21 |
| T-PTY-1 (band 3–9) | 3.32 | 3.6–4.6 |
| Nursing mothers' reserves (%/day) | −0.046 | within ± 0.03 of S8 (low) |
| Juveniles' reserves (%/day) | −0.042 | worse than S8, above −0.08 (low) |
| Mothers ÷ males, true ground path | 0.81 | 0.85–0.95 (low) |
| Fitted | group mean | inside noise or better |
| Held-out, with and without the rare rows | group mean | inside noise (low: quick mode gave z +2.2 without the rare rows) |

### S9 results (bench-run at 2bcbd33, clean; every number printed by the integrator's judge_s9.py and night.py from the JSON)

S8 group: S8 (cf22cde, code identical for S8) and three re-draws S8c1–S8c3 (2bcbd33), each with energy-diagnose. S9 had
one death (not starvation); the S8 group none. T-IGE-3 scored 30.5 and 22.3 in two S8 re-draws (it remains unstable on
few events; the sums are reported without it as registered).

```
bench reference runs: ['S8', 'S8c1', 'S8c2', 'S8c3']; energy reference runs: ['S8', 'S8c1', 'S8c2', 'S8c3']; arms: ['S9']
  S8: cf22cde dirty 0 prescriptions 76
  S8c1: 2bcbd33 dirty 0 prescriptions 76
  S8c2: 2bcbd33 dirty 0 prescriptions 76
  S8c3: 2bcbd33 dirty 0 prescriptions 76
  S9: 2bcbd33 dirty 0 prescriptions 74

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.85, 1.85, 2.08, 2.26 (mean 2.01, sd 0.20; used 0.30) | S9.json: 1.72, Δ -0.28, z -0.8 (inside noise)
  held-out           (14 rows) ref 5.49, 7.22, 5.39, 6.15 (mean 6.06, sd 0.84; used 1.45) | S9.json: 5.94, Δ -0.12, z -0.1 (inside noise)
  held-out w/o rare  (12 rows) ref 3.60, 4.06, 4.41, 4.08 (mean 4.04, sd 0.33; used 0.33) | S9.json: 4.49, Δ +0.45, z +1.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-3   fitted   ref 0.21±0.05 | S9.json 0.00 (pass)
   T-BRD-1   held-out ref 1.39±1.08 | S9.json 0.20 (fail)
   T-FOOD-2  fitted   ref 0.19±0.02 | S9.json 0.02 (inconclusive)
   T-HUN-1   fitted   ref 0.16±0.17 | S9.json 0.52 (fail)
   T-HUN-4   held-out ref 0.64±0.23 | S9.json 1.25 (fail)
   T-HUN-8   held-out ref 0.00±0.00 | S9.json 0.33 (fail)
   T-RNG-5   held-out ref 0.55±0.04 | S9.json 0.68 (fail)
   T-SOC-3   held-out ref 0.47±0.04 | S9.json 0.17 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S8 3.60 / 4.06 / 4.41 / 4.08 (mean 4.04, sd 0.33; used 0.33); S9 4.49 (z +1.2)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S8 3.08 / 3.54 / 3.82 / 3.51 (mean 3.49, sd 0.30; used 0.30); S9 3.81 (z +0.9)
T-RNG-5 distance by run (S8 group, then arms): [0.52, 0.52, 0.59, 0.57, 0.68]
T-IGE-3 distance by run: [None, 30.48, 0.17, 22.33, 0.63]

| Reserves ÷ store, % per day (OLS) | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- |
| adult male | -0.020 / -0.020 / -0.023 / -0.020 | -0.021 ± 0.002 | -0.021 (z -0.3) |
| female, other | -0.023 / -0.029 / -0.034 / -0.039 | -0.031 ± 0.007 | -0.045 (z -1.9) |
| female, lactating | -0.046 / -0.063 / -0.066 / -0.063 | -0.060 ± 0.009 | -0.058 (z +0.2) |
| juvenile 5–12 y | -0.042 / -0.053 / -0.043 / -0.045 | -0.046 ± 0.005 | -0.060 (z -2.6) |
| infant 2–5 y | -0.030 / -0.047 / -0.055 / -0.043 | -0.044 ± 0.011 | -0.050 (z -0.5) |
| infant 0.5–2 y | -0.067 / -0.082 / -0.080 / -0.087 | -0.079 ± 0.009 | -0.069 (z +1.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.78 / 2.80 / 2.79 | 2.79 ± 0.01 | 2.79 (z +0.0) |
| 1–2 y | 3.46 / 3.45 / 3.44 / 3.44 | 3.45 ± 0.01 | 3.42 (z -2.6) |
| 2–3 y | 3.42 / 3.42 / 3.40 / 3.43 | 3.42 ± 0.01 | 3.46 (z +3.0) |
| 3–4 y | 3.45 / 3.43 / 3.44 / 3.43 | 3.44 ± 0.01 | 3.45 (z +1.2) |

| Milk drunk, kcal per infant-day | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- |
| 0.5–1 y | 279 / 277 / 278 / 278 | 278 ± 1 | 278 (z +0.2) |
| 1–2 y | 279 / 277 / 278 / 279 | 278 ± 1 | 271 (z -7.6) |
| 2–3 y | 239 / 235 / 232 / 235 | 235 ± 3 | 258 (z +7.2) |
| 3–4 y | 234 / 224 / 231 / 232 | 230 ± 4 | 254 (z +5.0) |

| Mothers' balance, kcal/day by infant age | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- |
| 0.5–1 y | -19 / -31 / -28 / -30 | -27 ± 5 | -26 (z +0.2) |
| 1–2 y | -27 / -44 / -38 / -39 | -37 ± 7 | -44 (z -0.9) |
| 2–3 y | -22 / -33 / -29 / -26 | -28 ± 5 | -21 (z +1.3) |
| 3–4 y | -15 / -27 / -22 / -21 | -21 ± 5 | -26 (z -0.8) |

| Ground km / eating min / fruit share | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- |
| adult male: groundKm | 1.88 / 1.94 / 1.98 / 2.01 | 1.95 ± 0.06 | 2.11 (z +2.5) |
| adult male: eatingMin | 237.21 / 235.81 / 236.81 / 237.06 | 236.72 ± 0.63 | 239.08 (z +3.3) |
| adult male: fruitShare | 0.83 / 0.83 / 0.84 / 0.84 | 0.83 ± 0.00 | 0.83 (z -1.7) |
| female, other: groundKm | 1.57 / 1.56 / 1.70 / 1.61 | 1.61 ± 0.06 | 1.70 (z +1.3) |
| female, other: eatingMin | 228.99 / 224.74 / 229.06 / 225.64 | 227.11 ± 2.24 | 236.11 (z +3.6) |
| female, other: fruitShare | 0.70 / 0.70 / 0.69 / 0.69 | 0.70 ± 0.00 | 0.64 (z -12.9) |
| female, lactating: groundKm | 1.52 / 1.60 / 1.60 / 1.66 | 1.59 ± 0.06 | 1.78 (z +3.1) |
| female, lactating: eatingMin | 266.76 / 263.79 / 265.32 / 264.32 | 265.05 ± 1.31 | 282.38 (z +11.9) |
| female, lactating: fruitShare | 0.84 / 0.83 / 0.83 / 0.84 | 0.84 ± 0.00 | 0.77 (z -16.9) |
| juvenile 5–12 y: groundKm | 1.73 / 1.76 / 1.86 / 1.84 | 1.80 ± 0.06 | 1.94 (z +2.1) |
| juvenile 5–12 y: eatingMin | 259.59 / 252.70 / 254.66 / 253.21 | 255.04 ± 3.15 | 267.19 (z +3.5) |
| juvenile 5–12 y: fruitShare | 0.91 / 0.91 / 0.92 / 0.92 | 0.92 ± 0.00 | 0.91 (z -1.4) |

| Row (pooled) | Band | S8 runs | S8 mean ± SD | S9 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.359 / 0.360 / 0.359 / 0.363 | 0.360 ± 0.002 | 0.368 |
| T-ACT-2 | 0.12–0.25 | 0.161 / 0.167 / 0.174 / 0.170 | 0.168 ± 0.006 | 0.182 |
| T-ACT-3 | 0.08–0.18 | 0.208 / 0.197 / 0.185 / 0.197 | 0.197 ± 0.010 | 0.101 |
| T-ACT-4 | 0.3–0.47 | 0.430 / 0.428 / 0.439 / 0.412 | 0.427 ± 0.011 | 0.380 |
| T-PTY-1 | 3–9 | 3.317 / 3.381 / 3.530 / 3.434 | 3.415 ± 0.090 | 4.042 |
| T-RNG-4 | 1.5–3.5 | 1.754 / 1.902 / 2.056 / 2.010 | 1.930 ± 0.134 | 2.108 |
| T-HUN-1 | 5–25 | 23.796 / 26.158 / 32.230 / 29.812 | 27.999 ± 3.753 | 35.453 |
| T-HUN-3 | 0.05–0.4 | 0.053 / 0.070 / 0.065 / 0.072 | 0.065 ± 0.009 | 0.083 |
| T-FOOD-2 | 0.6–0.78 | 0.811 / 0.813 / 0.812 / 0.819 | 0.814 ± 0.004 | 0.783 |
| T-FOOD-4 | 4–15 | 7.861 / 7.957 / 8.206 / 8.172 | 8.049 ± 0.167 | 8.136 |
| T-FOOD-6 | 2–7 | 5.325 / 5.468 / 5.247 / 5.508 | 5.387 ± 0.122 | 5.320 |
| T-FOOD-10 | 0.08–0.3 | 0.701 / 0.705 / 0.736 / 0.711 | 0.713 ± 0.015 | 0.744 |
S8 T-ACT-2 by sex: {'male': 0.182, 'female': 0.143}; T-ACT-3 by sex: {'male': 0.185, 'female': 0.227}
S8c1 T-ACT-2 by sex: {'male': 0.181, 'female': 0.155}; T-ACT-3 by sex: {'male': 0.17, 'female': 0.22}
S8c2 T-ACT-2 by sex: {'male': 0.191, 'female': 0.161}; T-ACT-3 by sex: {'male': 0.155, 'female': 0.209}
S8c3 T-ACT-2 by sex: {'male': 0.189, 'female': 0.154}; T-ACT-3 by sex: {'male': 0.163, 'female': 0.224}
S9 T-ACT-2 by sex: {'male': 0.205, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.12, 'female': 0.085}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S8: 1.52 ÷ 1.88 = 0.809
  S8c1: 1.60 ÷ 1.94 = 0.826
  S8c2: 1.60 ÷ 1.98 = 0.806
  S8c3: 1.66 ÷ 2.01 = 0.824
  S9: 1.78 ÷ 2.11 = 0.847
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s9/S9-rhythm5.json: adults out of a nest 2.38% of night; T-RHY-5 0.0264; night deaths 0; deaths 1
```

**Against the predictions.** Prescriptions 74: held. Viability and night (2.38%, T-RHY-5 0.0264): held. T-ACT-3 in
0.08–0.13 with both sexes in band: held (0.101; males 0.120, females 0.085; S8 0.197). T-ACT-2 0.14–0.21: held (0.182).
T-PTY-1 3.6–4.6: held (4.04). Nursing mothers within ± 0.03 of S8: held (−0.058 against −0.060). Juveniles worse than S8
but above −0.08: held (−0.060 against −0.046). Mothers ÷ males true ground path 0.85–0.95: missed narrowly (0.847; S8
group 0.81–0.83). Fitted inside noise or better: held (z −0.8). Held-out inside noise: held (z −0.1 with the rare rows,
+1.2 without them; the quick-mode failure did not replicate; the sensitivity without T-RNG-5, not the test, z +0.9).

**Verdict: S9 passes the keep rule and replaces S8 as the best integrated candidate.** 74 prescriptions (the two social
timers out); grooming inside its band for both sexes; rest down (T-ACT-4 0.427 → 0.380); fruit share back to its band's
edge (T-FOOD-2 0.814 → 0.783); reciprocity better (T-SOC-3). Costs: hunting back above its band (T-HUN-1 28.0 ± 3.8 →
35.5), juveniles' and other females' reserves a little lower (−0.046 → −0.060; −0.031 → −0.045 %/day), every class
walking 0.1–0.2 km a day more, and nursing mothers eating 17 more minutes a day. The open problem E5d named stands:
company is valued by a need that only grooming relieves.

## S10 confirm (registered 3 October 2026 before its runs)

**S10 = S9 + E4e's `huntValue` 1**: the hunt lead valued as food (expected meat from the model's own success curve, in
the ledger's currency), with no community-wide gap since the last hunt (`huntGapH` switched out: 74 → 73
prescriptions). E4e passed the keep rule on 5 seeds on R but was held off because T-HUN-3 (the share of colobus
encounters that become hunts) fell below its band while the model meets colobus far more often than Kanyawara's
observers report (E4f; scorer fixes staged, not applied: the user's decision). On S9 hunting is above its band again
(T-HUN-1 35.5), so whether `huntValue` belongs in the stack is tested here, under the scoring in force.

**Reference group, new:** S9 in confirm mode, the existing run (S9, 2bcbd33) plus three re-draws (`rgTemperature`
0.1641, 0.1639, 0.16405: S9c1, S9c2, S9c3), each with energy-diagnose. Judged by e-noise.md amendment 2 as before; sums
with and without T-HUN-4 and T-BRD-1, and without T-IGE-3.

**Keep rule (the standard one):** viability passes; held-out not up beyond noise against the S9 mean; prescriptions
fall (73 < 74); night safe. **Reported, not part of the test:** T-HUN-3 under the scoring in force, with E4f's reading.

**Predictions (against the S9 group; moderate confidence unless stated).** Prescriptions 73 (high); viability and night
safety pass; T-HUN-1 inside its band 5–25 (E4e's confirm on R: 9.7); T-HUN-3 below its band (0.05–0.4) (E4e: 0.28 × the
field's share); T-HUN-2 (success) unchanged within its spread (low); males' and juveniles' reserves within the group's
spread (low: less meat); fitted inside noise or better; held-out inside noise (low: T-HUN-3 is held out).

## S11 confirm (registered 3 October 2026 before its run)

**S11 = S9 + E3c's `forageRate` 1** (every feeding option valued by the net energy rate it promises; `forageDistScaleM`,
`fallbackForageW` and `memTravelHungerW` switched out: 74 → 71 prescriptions). Judged against S9's confirm group (S9,
S9c1–S9c3; shared with S10) by the standard keep rule (viability; held-out not up beyond noise with and without the
rare rows, and without T-IGE-3; prescriptions fall; night safe). Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days, bench-run at 2bcbd33 is not enough (the switch is newer): bench-run moves to this commit for S11 only
after the S9 group's runs finish, or S11 runs from a second frozen checkout of this commit.

**Predictions (against the S9 group; moderate confidence unless stated).** Prescriptions 71 (high); viability and night
safety pass; T-ACT-4 0.29–0.34 (rest near its band floor 0.30); T-ACT-2 0.20–0.23; T-ACT-3 0.08–0.10 (low); T-FOOD-2
0.68–0.74 (into its band); T-RNG-4 2.3–2.8; T-HUN-1 20–30 (low); nursing mothers' reserves a little lower than S9's
(−0.06 to −0.09 %/day; low); juveniles within the group's spread (low); fitted and held-out inside noise.

## S12 confirm (registered 3 October 2026 before its run)

**S12 = S9 + E4h's `contestAssess` 1** (A4: escalation, contact and coalition support decided by each animal's
assessment, the remembered dominance relationship as its starting estimate; `escalationBaseP`, `escalationEvenP`, `hitP`,
`coalitionBondP`, `coalitionStrangerP` switched out: 74 → 69 prescriptions). Judged against S9's confirm group (S9,
S9c1–S9c3; shared with S10 and S11) by the standard keep rule. Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days, from a third frozen checkout of this commit (`.claude/worktrees/bench-run3`).

**Predictions (against the S9 group; moderate confidence unless stated).** Prescriptions 69 (high); viability and night
safety pass; no deaths from injury (low); T-SOC-5 inside its band 0.2–0.7; fitted and held-out inside noise; reported
from the bench and conflict readouts where the e-bench JSON carries them (low: contacts and coalition joins about twice
and three times S9's, as in quick mode).

### S10 and S11 results (bench-run 2bcbd33 for the S9 group and S10, bench-run2 dd83395 for S11, all clean; each arm judged on its own against the four S9 runs; printed by judge_s9group.py and night.py from the JSON)

S9 group: S9 and S9c1–S9c3 (2bcbd33). Deaths: S10 one, S11 one, none from starvation; the S9 runs as before. T-IGE-3 was
not scored in S9c2 (too few events), so the shared sums leave it out, as the registration asked them to be reported.

```
bench reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; energy reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; arms: ['S10']
  S9: 2bcbd33 dirty 0 prescriptions 74
  S9c1: 2bcbd33 dirty 0 prescriptions 74
  S9c2: 2bcbd33 dirty 0 prescriptions 74
  S9c3: 2bcbd33 dirty 0 prescriptions 74
  S10: 2bcbd33 dirty 0 prescriptions 73

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.72, 2.13, 1.40, 2.49 (mean 1.93, sd 0.47; used 0.47) | S10.json: 0.72, Δ -1.21, z -2.3 RESULT
  held-out           (14 rows) ref 5.94, 8.51, 5.92, 6.37 (mean 6.69, sd 1.24; used 1.45) | S10.json: 5.76, Δ -0.92, z -0.6 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.49, 4.29, 3.77 (mean 4.26, sd 0.34; used 0.34) | S10.json: 3.71, Δ -0.56, z -1.5 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.27±1.24 | S10.json 2.06 (fail)
   T-HUN-1   fitted   ref 0.60±0.15 | S10.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 1.15±0.11 | S10.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.49 / 4.49 / 4.29 / 3.77 (mean 4.26, sd 0.34; used 0.34); S10 3.71 (z -1.5)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S9 3.81 / 3.67 / 3.42 / 3.16 (mean 3.51, sd 0.28; used 0.28); S10 3.17 (z -1.1)
T-RNG-5 distance by run (S9 group, then arms): [0.68, 0.82, 0.87, 0.61, 0.53]
T-IGE-3 distance by run: [0.63, 0.82, None, 2.09, 2.8]

| Reserves ÷ store, % per day (OLS) | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- |
| adult male | -0.021 / -0.023 / -0.019 / -0.023 | -0.022 ± 0.002 | -0.023 (z -0.5) |
| female, other | -0.045 / -0.036 / -0.033 / -0.031 | -0.036 ± 0.006 | -0.036 (z +0.0) |
| female, lactating | -0.058 / -0.053 / -0.040 / -0.049 | -0.050 ± 0.007 | -0.067 (z -2.1) |
| juvenile 5–12 y | -0.060 / -0.045 / -0.055 / -0.057 | -0.054 ± 0.006 | -0.055 (z -0.1) |
| infant 2–5 y | -0.050 / -0.046 / -0.037 / -0.049 | -0.046 ± 0.006 | -0.063 (z -2.5) |
| infant 0.5–2 y | -0.069 / -0.059 / -0.049 / -0.049 | -0.057 ± 0.010 | -0.073 (z -1.5) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.82 / 2.81 | 2.80 ± 0.01 | 2.79 (z -1.0) |
| 1–2 y | 3.42 / 3.45 / 3.44 / 3.44 | 3.44 ± 0.01 | 3.42 (z -1.2) |
| 2–3 y | 3.46 / 3.46 / 3.46 / 3.47 | 3.46 ± 0.01 | 3.45 (z -2.2) |
| 3–4 y | 3.45 / 3.47 / 3.48 / 3.47 | 3.47 ± 0.01 | 3.46 (z -0.5) |

| Milk drunk, kcal per infant-day | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- |
| 0.5–1 y | 278 / 278 / 281 / 279 | 279 ± 1 | 279 (z -0.4) |
| 1–2 y | 271 / 278 / 277 / 280 | 277 ± 4 | 272 (z -1.0) |
| 2–3 y | 258 / 260 / 265 / 261 | 261 ± 3 | 253 (z -2.3) |
| 3–4 y | 254 / 257 / 266 / 258 | 259 ± 6 | 251 (z -1.3) |

| Mothers' balance, kcal/day by infant age | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- |
| 0.5–1 y | -26 / -22 / -7 / -18 | -18 ± 8 | -18 (z -0.0) |
| 1–2 y | -44 / -34 / -38 / -36 | -38 ± 4 | -49 (z -2.1) |
| 2–3 y | -21 / -23 / -25 / -27 | -24 ± 3 | -30 (z -2.1) |
| 3–4 y | -26 / -23 / -13 / -24 | -21 ± 6 | -31 (z -1.4) |

| Ground km / eating min / fruit share | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.11 / 2.03 / 2.03 / 2.16 | 2.08 ± 0.06 | 2.16 (z +1.2) |
| adult male: eatingMin | 239.08 / 239.37 / 237.95 / 239.19 | 238.90 ± 0.64 | 240.53 (z +2.3) |
| adult male: fruitShare | 0.83 / 0.82 / 0.82 / 0.83 | 0.82 ± 0.00 | 0.82 (z -0.2) |
| female, other: groundKm | 1.70 / 1.72 / 1.61 / 1.61 | 1.66 ± 0.06 | 1.71 (z +0.8) |
| female, other: eatingMin | 236.11 / 235.87 / 238.13 / 236.48 | 236.65 ± 1.02 | 234.49 (z -1.9) |
| female, other: fruitShare | 0.64 / 0.65 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.66 (z +2.6) |
| female, lactating: groundKm | 1.78 / 1.83 / 1.74 / 1.78 | 1.78 ± 0.04 | 1.87 (z +1.9) |
| female, lactating: eatingMin | 282.38 / 283.25 / 283.23 / 283.26 | 283.03 ± 0.43 | 282.94 (z -0.2) |
| female, lactating: fruitShare | 0.77 / 0.77 / 0.77 / 0.77 | 0.77 ± 0.00 | 0.76 (z -4.6) |
| juvenile 5–12 y: groundKm | 1.94 / 1.93 / 1.84 / 1.96 | 1.92 ± 0.05 | 1.93 (z +0.2) |
| juvenile 5–12 y: eatingMin | 267.19 / 263.85 / 266.89 / 266.40 | 266.08 ± 1.53 | 265.51 (z -0.3) |
| juvenile 5–12 y: fruitShare | 0.91 / 0.92 / 0.91 / 0.92 | 0.91 ± 0.01 | 0.91 (z -0.3) |

| Row (pooled) | Band | S9 runs | S9 mean ± SD | S10 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.368 / 0.374 / 0.370 / 0.370 | 0.371 ± 0.002 | 0.372 |
| T-ACT-2 | 0.12–0.25 | 0.182 / 0.175 / 0.171 / 0.179 | 0.177 ± 0.004 | 0.179 |
| T-ACT-3 | 0.08–0.18 | 0.101 / 0.096 / 0.100 / 0.097 | 0.098 ± 0.002 | 0.098 |
| T-ACT-4 | 0.3–0.47 | 0.380 / 0.379 / 0.382 / 0.381 | 0.380 ± 0.002 | 0.376 |
| T-PTY-1 | 3–9 | 4.042 / 3.811 / 3.689 / 3.785 | 3.832 ± 0.149 | 3.989 |
| T-RNG-4 | 1.5–3.5 | 2.108 / 2.029 / 1.947 / 2.118 | 2.050 ± 0.080 | 2.033 |
| T-HUN-1 | 5–25 | 35.453 / 36.258 / 34.685 / 41.404 | 36.950 ± 3.038 | 23.418 |
| T-HUN-2 | 0.5–0.8 | 0.279 / 0.194 / 0.290 / 0.247 | 0.253 ± 0.043 | 0.327 |
| T-HUN-3 | 0.05–0.4 | 0.083 / 0.075 / 0.111 / 0.088 | 0.089 ± 0.015 | 0.054 |
| T-FOOD-2 | 0.6–0.78 | 0.783 / 0.776 / 0.770 / 0.781 | 0.777 ± 0.006 | 0.776 |
| T-FOOD-4 | 4–15 | 8.136 / 7.847 / 8.129 / 8.051 | 8.041 ± 0.134 | 8.083 |
| T-FOOD-6 | 2–7 | 5.320 / 5.516 / 5.589 / 5.363 | 5.447 ± 0.127 | 5.544 |
| T-FOOD-10 | 0.08–0.3 | 0.744 / 0.746 / 0.759 / 0.766 | 0.754 ± 0.011 | 0.771 |
S9 T-ACT-2 by sex: {'male': 0.205, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.12, 'female': 0.085}
S9c1 T-ACT-2 by sex: {'male': 0.199, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.117, 'female': 0.08}
S9c2 T-ACT-2 by sex: {'male': 0.19, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.127, 'female': 0.077}
S9c3 T-ACT-2 by sex: {'male': 0.203, 'female': 0.159}; T-ACT-3 by sex: {'male': 0.119, 'female': 0.078}
S10 T-ACT-2 by sex: {'male': 0.198, 'female': 0.163}; T-ACT-3 by sex: {'male': 0.126, 'female': 0.075}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S9: 1.78 ÷ 2.11 = 0.847
  S9c1: 1.83 ÷ 2.03 = 0.906
  S9c2: 1.74 ÷ 2.03 = 0.855
  S9c3: 1.78 ÷ 2.16 = 0.824
  S10: 1.87 ÷ 2.16 = 0.864
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run/artifacts/validation/e/s10/S10-rhythm5.json: adults out of a nest 2.32% of night; T-RHY-5 0.0253; night deaths 0; deaths 1

bench reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; energy reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; arms: ['S11']
  S9: 2bcbd33 dirty 0 prescriptions 74
  S9c1: 2bcbd33 dirty 0 prescriptions 74
  S9c2: 2bcbd33 dirty 0 prescriptions 74
  S9c3: 2bcbd33 dirty 0 prescriptions 74
  S11: dd83395 dirty 0 prescriptions 71

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.72, 2.13, 1.40, 2.49 (mean 1.93, sd 0.47; used 0.47) | S11.json: 2.14, Δ +0.20, z +0.4 (inside noise)
  held-out           (14 rows) ref 5.94, 8.51, 5.92, 6.37 (mean 6.69, sd 1.24; used 1.45) | S11.json: 4.93, Δ -1.76, z -1.1 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.49, 4.29, 3.77 (mean 4.26, sd 0.34; used 0.34) | S11.json: 4.24, Δ -0.02, z -0.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.27±1.24 | S11.json 0.69 (fail)
   T-COM-8   fitted   ref 0.02±0.03 | S11.json 0.13 (inconclusive)
   T-FOOD-10 held-out ref 2.06±0.05 | S11.json 2.35 (fail)
   T-HUN-4   held-out ref 1.15±0.11 | S11.json 0.00 (pass)
   T-SOC-6   held-out ref 0.55±0.06 | S11.json 0.42 (fail)
   T-SOC-9   fitted   ref 0.00±0.00 | S11.json 0.57 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.49 / 4.49 / 4.29 / 3.77 (mean 4.26, sd 0.34; used 0.34); S11 4.24 (z -0.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S9 3.81 / 3.67 / 3.42 / 3.16 (mean 3.51, sd 0.28; used 0.28); S11 3.56 (z +0.2)
T-RNG-5 distance by run (S9 group, then arms): [0.68, 0.82, 0.87, 0.61, 0.68]
T-IGE-3 distance by run: [0.63, 0.82, None, 2.09, 0]

| Reserves ÷ store, % per day (OLS) | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- |
| adult male | -0.021 / -0.023 / -0.019 / -0.023 | -0.022 ± 0.002 | -0.038 (z -8.2) |
| female, other | -0.045 / -0.036 / -0.033 / -0.031 | -0.036 ± 0.006 | -0.051 (z -2.0) |
| female, lactating | -0.058 / -0.053 / -0.040 / -0.049 | -0.050 ± 0.007 | -0.081 (z -3.7) |
| juvenile 5–12 y | -0.060 / -0.045 / -0.055 / -0.057 | -0.054 ± 0.006 | -0.044 (z +1.5) |
| infant 2–5 y | -0.050 / -0.046 / -0.037 / -0.049 | -0.046 ± 0.006 | -0.065 (z -2.9) |
| infant 0.5–2 y | -0.069 / -0.059 / -0.049 / -0.049 | -0.057 ± 0.010 | -0.108 (z -4.7) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.82 / 2.81 | 2.80 ± 0.01 | 2.78 (z -1.7) |
| 1–2 y | 3.42 / 3.45 / 3.44 / 3.44 | 3.44 ± 0.01 | 3.46 (z +1.6) |
| 2–3 y | 3.46 / 3.46 / 3.46 / 3.47 | 3.46 ± 0.01 | 3.45 (z -2.2) |
| 3–4 y | 3.45 / 3.47 / 3.48 / 3.47 | 3.47 ± 0.01 | 3.49 (z +1.6) |

| Milk drunk, kcal per infant-day | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- |
| 0.5–1 y | 278 / 278 / 281 / 279 | 279 ± 1 | 278 (z -0.9) |
| 1–2 y | 271 / 278 / 277 / 280 | 277 ± 4 | 276 (z -0.1) |
| 2–3 y | 258 / 260 / 265 / 261 | 261 ± 3 | 246 (z -4.6) |
| 3–4 y | 254 / 257 / 266 / 258 | 259 ± 6 | 248 (z -1.7) |

| Mothers' balance, kcal/day by infant age | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- |
| 0.5–1 y | -26 / -22 / -7 / -18 | -18 ± 8 | -31 (z -1.5) |
| 1–2 y | -44 / -34 / -38 / -36 | -38 ± 4 | -51 (z -2.5) |
| 2–3 y | -21 / -23 / -25 / -27 | -24 ± 3 | -39 (z -5.3) |
| 3–4 y | -26 / -23 / -13 / -24 | -21 ± 6 | -29 (z -1.1) |

| Ground km / eating min / fruit share | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.11 / 2.03 / 2.03 / 2.16 | 2.08 ± 0.06 | 2.55 (z +6.7) |
| adult male: eatingMin | 239.08 / 239.37 / 237.95 / 239.19 | 238.90 ± 0.64 | 258.74 (z +27.6) |
| adult male: fruitShare | 0.83 / 0.82 / 0.82 / 0.83 | 0.82 ± 0.00 | 0.74 (z -16.0) |
| female, other: groundKm | 1.70 / 1.72 / 1.61 / 1.61 | 1.66 ± 0.06 | 1.99 (z +5.1) |
| female, other: eatingMin | 236.11 / 235.87 / 238.13 / 236.48 | 236.65 ± 1.02 | 264.84 (z +24.7) |
| female, other: fruitShare | 0.64 / 0.65 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.53 (z -21.6) |
| female, lactating: groundKm | 1.78 / 1.83 / 1.74 / 1.78 | 1.78 ± 0.04 | 2.38 (z +13.4) |
| female, lactating: eatingMin | 282.38 / 283.25 / 283.23 / 283.26 | 283.03 ± 0.43 | 314.13 (z +64.0) |
| female, lactating: fruitShare | 0.77 / 0.77 / 0.77 / 0.77 | 0.77 ± 0.00 | 0.62 (z -86.8) |
| juvenile 5–12 y: groundKm | 1.94 / 1.93 / 1.84 / 1.96 | 1.92 ± 0.05 | 2.33 (z +7.2) |
| juvenile 5–12 y: eatingMin | 267.19 / 263.85 / 266.89 / 266.40 | 266.08 ± 1.53 | 280.05 (z +8.2) |
| juvenile 5–12 y: fruitShare | 0.91 / 0.92 / 0.91 / 0.92 | 0.91 ± 0.01 | 0.82 (z -14.0) |

| Row (pooled) | Band | S9 runs | S9 mean ± SD | S11 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.368 / 0.374 / 0.370 / 0.370 | 0.371 ± 0.002 | 0.399 |
| T-ACT-2 | 0.12–0.25 | 0.182 / 0.175 / 0.171 / 0.179 | 0.177 ± 0.004 | 0.223 |
| T-ACT-3 | 0.08–0.18 | 0.101 / 0.096 / 0.100 / 0.097 | 0.098 ± 0.002 | 0.082 |
| T-ACT-4 | 0.3–0.47 | 0.380 / 0.379 / 0.382 / 0.381 | 0.380 ± 0.002 | 0.303 |
| T-PTY-1 | 3–9 | 4.042 / 3.811 / 3.689 / 3.785 | 3.832 ± 0.149 | 3.858 |
| T-RNG-4 | 1.5–3.5 | 2.108 / 2.029 / 1.947 / 2.118 | 2.050 ± 0.080 | 2.534 |
| T-HUN-1 | 5–25 | 35.453 / 36.258 / 34.685 / 41.404 | 36.950 ± 3.038 | 31.862 |
| T-HUN-2 | 0.5–0.8 | 0.279 / 0.194 / 0.290 / 0.247 | 0.253 ± 0.043 | 0.289 |
| T-HUN-3 | 0.05–0.4 | 0.083 / 0.075 / 0.111 / 0.088 | 0.089 ± 0.015 | 0.084 |
| T-FOOD-2 | 0.6–0.78 | 0.783 / 0.776 / 0.770 / 0.781 | 0.777 ± 0.006 | 0.665 |
| T-FOOD-4 | 4–15 | 8.136 / 7.847 / 8.129 / 8.051 | 8.041 ± 0.134 | 8.370 |
| T-FOOD-6 | 2–7 | 5.320 / 5.516 / 5.589 / 5.363 | 5.447 ± 0.127 | 5.111 |
| T-FOOD-10 | 0.08–0.3 | 0.744 / 0.746 / 0.759 / 0.766 | 0.754 ± 0.011 | 0.817 |
S9 T-ACT-2 by sex: {'male': 0.205, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.12, 'female': 0.085}
S9c1 T-ACT-2 by sex: {'male': 0.199, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.117, 'female': 0.08}
S9c2 T-ACT-2 by sex: {'male': 0.19, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.127, 'female': 0.077}
S9c3 T-ACT-2 by sex: {'male': 0.203, 'female': 0.159}; T-ACT-3 by sex: {'male': 0.119, 'female': 0.078}
S11 T-ACT-2 by sex: {'male': 0.253, 'female': 0.199}; T-ACT-3 by sex: {'male': 0.104, 'female': 0.064}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S9: 1.78 ÷ 2.11 = 0.847
  S9c1: 1.83 ÷ 2.03 = 0.906
  S9c2: 1.74 ÷ 2.03 = 0.855
  S9c3: 1.78 ÷ 2.16 = 0.824
  S11: 2.38 ÷ 2.55 = 0.931
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run2/artifacts/validation/e/s11/S11-rhythm5.json: adults out of a nest 2.54% of night; T-RHY-5 0.0276; night deaths 1; deaths 1
```

**S10 against the predictions.** Prescriptions 73: held. Viability and night (2.32%, 0.0253): held. T-HUN-1 inside its
band: held (36.9 ± 3.0 → 23.4). T-HUN-3 below its band: **missed, the good way** (0.054, inside 0.05–0.4: on S9, with
E4f's Kanyawara prey density, the hunt share no longer collapses). T-HUN-2 unchanged within spread: missed slightly
(0.253 ± 0.043 → 0.327, still below its band). Males' and juveniles' reserves within spread: held; nursing mothers and
infants 2–5 y a little lower (−0.050 → −0.067; −0.046 → −0.063). Fitted inside noise or better: held, better beyond
noise (z −2.3). Held-out inside noise: held (z −0.6; −1.5 without the rare rows). **S10 passes the keep rule.**

**S11 against the predictions.** Prescriptions 71: held. Viability and night (2.54%, 0.0276): held. T-ACT-4 0.29–0.34:
held (0.303, at its band's floor). T-ACT-2 0.20–0.23: held (0.223; males 0.253, just above their band). T-ACT-3
0.08–0.10: held (0.082; females 0.064, below band). T-FOOD-2 0.68–0.74: missed low (0.665, inside its band). T-RNG-4
2.3–2.8: held (2.53). T-HUN-1 20–30: missed (31.9). Nursing mothers −0.06 to −0.09: held (−0.081); juveniles within
spread: held (−0.044). Sums inside noise: held (fitted z +0.4; held-out −1.1; without the rare rows 0.0). Not predicted:
every adult class's balance falls (males −0.022 → −0.038, infants 0.5–2 y −0.057 → −0.108) as walking and feeding rise
(males 2.55 km a day). **S11 passes the keep rule**, with a real energy cost.

Next: S10 + S11 (and S12 if it passes) together on S9.

### S12 results (bench-run3 ea92d20, clean; judged on its own against the four S9 runs; printed by judge_s9group.py and night.py from the JSON)

```
bench reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; energy reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; arms: ['S12']
  S9: 2bcbd33 dirty 0 prescriptions 74
  S9c1: 2bcbd33 dirty 0 prescriptions 74
  S9c2: 2bcbd33 dirty 0 prescriptions 74
  S9c3: 2bcbd33 dirty 0 prescriptions 74
  S12: ea92d20 dirty 0 prescriptions 69

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.72, 2.13, 1.40, 2.49 (mean 1.93, sd 0.47; used 0.47) | S12.json: 1.71, Δ -0.22, z -0.4 (inside noise)
  held-out           (14 rows) ref 5.94, 8.51, 5.92, 6.37 (mean 6.69, sd 1.24; used 1.45) | S12.json: 6.23, Δ -0.46, z -0.3 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.49, 4.29, 3.77 (mean 4.26, sd 0.34; used 0.34) | S12.json: 4.27, Δ +0.01, z +0.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.27±1.24 | S12.json 1.96 (fail)
   T-HUN-4   held-out ref 1.15±0.11 | S12.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.49 / 4.49 / 4.29 / 3.77 (mean 4.26, sd 0.34; used 0.34); S12 4.27 (z +0.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S9 3.81 / 3.67 / 3.42 / 3.16 (mean 3.51, sd 0.28; used 0.28); S12 3.29 (z -0.7)
T-RNG-5 distance by run (S9 group, then arms): [0.68, 0.82, 0.87, 0.61, 0.98]
T-IGE-3 distance by run: [0.63, 0.82, None, 2.09, 0.92]

| Reserves ÷ store, % per day (OLS) | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- |
| adult male | -0.021 / -0.023 / -0.019 / -0.023 | -0.022 ± 0.002 | -0.022 (z -0.1) |
| female, other | -0.045 / -0.036 / -0.033 / -0.031 | -0.036 ± 0.006 | -0.028 (z +1.1) |
| female, lactating | -0.058 / -0.053 / -0.040 / -0.049 | -0.050 ± 0.007 | -0.051 (z -0.1) |
| juvenile 5–12 y | -0.060 / -0.045 / -0.055 / -0.057 | -0.054 ± 0.006 | -0.067 (z -1.8) |
| infant 2–5 y | -0.050 / -0.046 / -0.037 / -0.049 | -0.046 ± 0.006 | -0.051 (z -0.8) |
| infant 0.5–2 y | -0.069 / -0.059 / -0.049 / -0.049 | -0.057 ± 0.010 | -0.056 (z +0.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.82 / 2.81 | 2.80 ± 0.01 | 2.79 (z -1.0) |
| 1–2 y | 3.42 / 3.45 / 3.44 / 3.44 | 3.44 ± 0.01 | 3.45 (z +0.9) |
| 2–3 y | 3.46 / 3.46 / 3.46 / 3.47 | 3.46 ± 0.01 | 3.47 (z +1.3) |
| 3–4 y | 3.45 / 3.47 / 3.48 / 3.47 | 3.47 ± 0.01 | 3.49 (z +1.6) |

| Milk drunk, kcal per infant-day | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- |
| 0.5–1 y | 278 / 278 / 281 / 279 | 279 ± 1 | 279 (z +0.0) |
| 1–2 y | 271 / 278 / 277 / 280 | 277 ± 4 | 282 (z +1.2) |
| 2–3 y | 258 / 260 / 265 / 261 | 261 ± 3 | 261 (z +0.1) |
| 3–4 y | 254 / 257 / 266 / 258 | 259 ± 6 | 266 (z +1.2) |

| Mothers' balance, kcal/day by infant age | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- |
| 0.5–1 y | -26 / -22 / -7 / -18 | -18 ± 8 | -19 (z -0.0) |
| 1–2 y | -44 / -34 / -38 / -36 | -38 ± 4 | -39 (z -0.1) |
| 2–3 y | -21 / -23 / -25 / -27 | -24 ± 3 | -23 (z +0.4) |
| 3–4 y | -26 / -23 / -13 / -24 | -21 ± 6 | -21 (z +0.1) |

| Ground km / eating min / fruit share | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.11 / 2.03 / 2.03 / 2.16 | 2.08 ± 0.06 | 2.09 (z +0.1) |
| adult male: eatingMin | 239.08 / 239.37 / 237.95 / 239.19 | 238.90 ± 0.64 | 237.67 (z -1.7) |
| adult male: fruitShare | 0.83 / 0.82 / 0.82 / 0.83 | 0.82 ± 0.00 | 0.83 (z +1.9) |
| female, other: groundKm | 1.70 / 1.72 / 1.61 / 1.61 | 1.66 ± 0.06 | 1.70 (z +0.6) |
| female, other: eatingMin | 236.11 / 235.87 / 238.13 / 236.48 | 236.65 ± 1.02 | 237.75 (z +1.0) |
| female, other: fruitShare | 0.64 / 0.65 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.65 (z +1.4) |
| female, lactating: groundKm | 1.78 / 1.83 / 1.74 / 1.78 | 1.78 ± 0.04 | 1.77 (z -0.4) |
| female, lactating: eatingMin | 282.38 / 283.25 / 283.23 / 283.26 | 283.03 ± 0.43 | 283.57 (z +1.1) |
| female, lactating: fruitShare | 0.77 / 0.77 / 0.77 / 0.77 | 0.77 ± 0.00 | 0.77 (z -1.9) |
| juvenile 5–12 y: groundKm | 1.94 / 1.93 / 1.84 / 1.96 | 1.92 ± 0.05 | 1.88 (z -0.6) |
| juvenile 5–12 y: eatingMin | 267.19 / 263.85 / 266.89 / 266.40 | 266.08 ± 1.53 | 267.30 (z +0.7) |
| juvenile 5–12 y: fruitShare | 0.91 / 0.92 / 0.91 / 0.92 | 0.91 ± 0.01 | 0.91 (z -0.6) |

| Row (pooled) | Band | S9 runs | S9 mean ± SD | S12 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.368 / 0.374 / 0.370 / 0.370 | 0.371 ± 0.002 | 0.366 |
| T-ACT-2 | 0.12–0.25 | 0.182 / 0.175 / 0.171 / 0.179 | 0.177 ± 0.004 | 0.177 |
| T-ACT-3 | 0.08–0.18 | 0.101 / 0.096 / 0.100 / 0.097 | 0.098 ± 0.002 | 0.100 |
| T-ACT-4 | 0.3–0.47 | 0.380 / 0.379 / 0.382 / 0.381 | 0.380 ± 0.002 | 0.391 |
| T-PTY-1 | 3–9 | 4.042 / 3.811 / 3.689 / 3.785 | 3.832 ± 0.149 | 3.743 |
| T-RNG-4 | 1.5–3.5 | 2.108 / 2.029 / 1.947 / 2.118 | 2.050 ± 0.080 | 1.913 |
| T-HUN-1 | 5–25 | 35.453 / 36.258 / 34.685 / 41.404 | 36.950 ± 3.038 | 33.108 |
| T-HUN-2 | 0.5–0.8 | 0.279 / 0.194 / 0.290 / 0.247 | 0.253 ± 0.043 | 0.267 |
| T-HUN-3 | 0.05–0.4 | 0.083 / 0.075 / 0.111 / 0.088 | 0.089 ± 0.015 | 0.069 |
| T-FOOD-2 | 0.6–0.78 | 0.783 / 0.776 / 0.770 / 0.781 | 0.777 ± 0.006 | 0.788 |
| T-FOOD-4 | 4–15 | 8.136 / 7.847 / 8.129 / 8.051 | 8.041 ± 0.134 | 8.145 |
| T-FOOD-6 | 2–7 | 5.320 / 5.516 / 5.589 / 5.363 | 5.447 ± 0.127 | 5.688 |
| T-FOOD-10 | 0.08–0.3 | 0.744 / 0.746 / 0.759 / 0.766 | 0.754 ± 0.011 | 0.740 |
S9 T-ACT-2 by sex: {'male': 0.205, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.12, 'female': 0.085}
S9c1 T-ACT-2 by sex: {'male': 0.199, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.117, 'female': 0.08}
S9c2 T-ACT-2 by sex: {'male': 0.19, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.127, 'female': 0.077}
S9c3 T-ACT-2 by sex: {'male': 0.203, 'female': 0.159}; T-ACT-3 by sex: {'male': 0.119, 'female': 0.078}
S12 T-ACT-2 by sex: {'male': 0.194, 'female': 0.164}; T-ACT-3 by sex: {'male': 0.124, 'female': 0.08}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S9: 1.78 ÷ 2.11 = 0.847
  S9c1: 1.83 ÷ 2.03 = 0.906
  S9c2: 1.74 ÷ 2.03 = 0.855
  S9c3: 1.78 ÷ 2.16 = 0.824
  S12: 1.77 ÷ 2.09 = 0.845
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s12/S12-rhythm5.json: adults out of a nest 2.46% of night; T-RHY-5 0.0274; night deaths 0; deaths 0
T-SOC-5 (male hierarchy steepness, band 0.2–0.7), pooled: S9 group 0.603 / 0.485 / 0.577 / 0.533; S12 0.618
```

**Against the predictions.** Prescriptions 69: held. Viability and night (no deaths; 2.46%, 0.0274): held. No deaths from
injury: held. T-SOC-5 inside its band: held (0.618). Fitted and held-out inside noise: held (z −0.4; −0.3; 0.0 without
the rare rows). Contacts and coalition joins are not in the e-bench JSON; E4h's quick-mode readouts stand for them.
Every energy readout is inside the S9 group's spread (juveniles −0.067, z −1.8). **S12 passes the keep rule.**

## S13 confirm (registered 4 October 2026 before its run)

**S13 = S9 + `huntValue` 1 + `forageRate` 1 + `contestAssess` 1** (S10, S11 and S12 together: 74 → 65 prescriptions).
Judged against the S9 group by the standard keep rule; bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days,
from bench-run3 (ea92d20 carries all three switches; this commit changes only this file).

**Predictions (against the S9 group; moderate confidence unless stated).** Prescriptions 65 (high); viability and night
safety pass (moderate: S10 and S11 each lowered nursing mothers' and infants' reserves); T-HUN-1 inside its band
(S10); T-ACT-4 near its floor and T-ACT-2 near 0.22 (S11); T-SOC-5 inside its band; nursing mothers −0.07 to −0.11 and
infants 0.5–2 y −0.08 to −0.13 %/day (low); fitted inside noise or better (S10's gain); held-out inside noise.

### S13 results (bench-run3 ea92d20, clean; judged against the four S9 runs; printed by judge_s9group.py and night.py from the JSON)

```
bench reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; energy reference runs: ['S9', 'S9c1', 'S9c2', 'S9c3']; arms: ['S13']
  S9: 2bcbd33 dirty 0 prescriptions 74
  S9c1: 2bcbd33 dirty 0 prescriptions 74
  S9c2: 2bcbd33 dirty 0 prescriptions 74
  S9c3: 2bcbd33 dirty 0 prescriptions 74
  S13: ea92d20 dirty 0 prescriptions 65

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.72, 2.13, 1.40, 2.49 (mean 1.93, sd 0.47; used 0.47) | S13.json: 1.49, Δ -0.44, z -0.8 (inside noise)
  held-out           (14 rows) ref 5.94, 8.51, 5.92, 6.37 (mean 6.69, sd 1.24; used 1.45) | S13.json: 5.95, Δ -0.73, z -0.5 (inside noise)
  held-out w/o rare  (12 rows) ref 4.49, 4.49, 4.29, 3.77 (mean 4.26, sd 0.34; used 0.34) | S13.json: 4.48, Δ +0.22, z +0.6 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.27±1.24 | S13.json 1.47 (fail)
   T-FOOD-10 held-out ref 2.06±0.05 | S13.json 2.32 (fail)
   T-HUN-1   fitted   ref 0.60±0.15 | S13.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 1.15±0.11 | S13.json 0.00 (inconclusive)
   T-HUN-7   fitted   ref 0.00±0.00 | S13.json 0.15 (inconclusive)
   T-SOC-6   held-out ref 0.55±0.06 | S13.json 0.43 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S9 4.49 / 4.49 / 4.29 / 3.77 (mean 4.26, sd 0.34; used 0.34); S13 4.48 (z +0.6)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S9 3.81 / 3.67 / 3.42 / 3.16 (mean 3.51, sd 0.28; used 0.28); S13 3.51 (z -0.0)
T-RNG-5 distance by run (S9 group, then arms): [0.68, 0.82, 0.87, 0.61, 0.97]
T-IGE-3 distance by run: [0.63, 0.82, None, 2.09, 0]

| Reserves ÷ store, % per day (OLS) | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- |
| adult male | -0.021 / -0.023 / -0.019 / -0.023 | -0.022 ± 0.002 | -0.033 (z -5.4) |
| female, other | -0.045 / -0.036 / -0.033 / -0.031 | -0.036 ± 0.006 | -0.037 (z -0.1) |
| female, lactating | -0.058 / -0.053 / -0.040 / -0.049 | -0.050 ± 0.007 | -0.077 (z -3.2) |
| juvenile 5–12 y | -0.060 / -0.045 / -0.055 / -0.057 | -0.054 ± 0.006 | -0.037 (z +2.4) |
| infant 2–5 y | -0.050 / -0.046 / -0.037 / -0.049 | -0.046 ± 0.006 | -0.067 (z -3.2) |
| infant 0.5–2 y | -0.069 / -0.059 / -0.049 / -0.049 | -0.057 ± 0.010 | -0.093 (z -3.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.82 / 2.81 | 2.80 ± 0.01 | 2.80 (z -0.3) |
| 1–2 y | 3.42 / 3.45 / 3.44 / 3.44 | 3.44 ± 0.01 | 3.47 (z +2.3) |
| 2–3 y | 3.46 / 3.46 / 3.46 / 3.47 | 3.46 ± 0.01 | 3.47 (z +1.3) |
| 3–4 y | 3.45 / 3.47 / 3.48 / 3.47 | 3.47 ± 0.01 | 3.47 (z +0.2) |

| Milk drunk, kcal per infant-day | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- |
| 0.5–1 y | 278 / 278 / 281 / 279 | 279 ± 1 | 280 (z +0.4) |
| 1–2 y | 271 / 278 / 277 / 280 | 277 ± 4 | 282 (z +1.3) |
| 2–3 y | 258 / 260 / 265 / 261 | 261 ± 3 | 256 (z -1.5) |
| 3–4 y | 254 / 257 / 266 / 258 | 259 ± 6 | 245 (z -2.2) |

| Mothers' balance, kcal/day by infant age | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- |
| 0.5–1 y | -26 / -22 / -7 / -18 | -18 ± 8 | -29 (z -1.2) |
| 1–2 y | -44 / -34 / -38 / -36 | -38 ± 4 | -40 (z -0.3) |
| 2–3 y | -21 / -23 / -25 / -27 | -24 ± 3 | -27 (z -0.9) |
| 3–4 y | -26 / -23 / -13 / -24 | -21 ± 6 | -38 (z -2.4) |

| Ground km / eating min / fruit share | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.11 / 2.03 / 2.03 / 2.16 | 2.08 ± 0.06 | 2.57 (z +6.9) |
| adult male: eatingMin | 239.08 / 239.37 / 237.95 / 239.19 | 238.90 ± 0.64 | 256.11 (z +23.9) |
| adult male: fruitShare | 0.83 / 0.82 / 0.82 / 0.83 | 0.82 ± 0.00 | 0.76 (z -13.5) |
| female, other: groundKm | 1.70 / 1.72 / 1.61 / 1.61 | 1.66 ± 0.06 | 2.00 (z +5.2) |
| female, other: eatingMin | 236.11 / 235.87 / 238.13 / 236.48 | 236.65 ± 1.02 | 272.59 (z +31.5) |
| female, other: fruitShare | 0.64 / 0.65 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.52 (z -22.9) |
| female, lactating: groundKm | 1.78 / 1.83 / 1.74 / 1.78 | 1.78 ± 0.04 | 2.35 (z +12.8) |
| female, lactating: eatingMin | 282.38 / 283.25 / 283.23 / 283.26 | 283.03 ± 0.43 | 313.42 (z +62.5) |
| female, lactating: fruitShare | 0.77 / 0.77 / 0.77 / 0.77 | 0.77 ± 0.00 | 0.63 (z -81.4) |
| juvenile 5–12 y: groundKm | 1.94 / 1.93 / 1.84 / 1.96 | 1.92 ± 0.05 | 2.29 (z +6.5) |
| juvenile 5–12 y: eatingMin | 267.19 / 263.85 / 266.89 / 266.40 | 266.08 ± 1.53 | 284.23 (z +10.6) |
| juvenile 5–12 y: fruitShare | 0.91 / 0.92 / 0.91 / 0.92 | 0.91 ± 0.01 | 0.83 (z -12.6) |

| Row (pooled) | Band | S9 runs | S9 mean ± SD | S13 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.368 / 0.374 / 0.370 / 0.370 | 0.371 ± 0.002 | 0.393 |
| T-ACT-2 | 0.12–0.25 | 0.182 / 0.175 / 0.171 / 0.179 | 0.177 ± 0.004 | 0.217 |
| T-ACT-3 | 0.08–0.18 | 0.101 / 0.096 / 0.100 / 0.097 | 0.098 ± 0.002 | 0.084 |
| T-ACT-4 | 0.3–0.47 | 0.380 / 0.379 / 0.382 / 0.381 | 0.380 ± 0.002 | 0.320 |
| T-PTY-1 | 3–9 | 4.042 / 3.811 / 3.689 / 3.785 | 3.832 ± 0.149 | 3.790 |
| T-RNG-4 | 1.5–3.5 | 2.108 / 2.029 / 1.947 / 2.118 | 2.050 ± 0.080 | 2.385 |
| T-HUN-1 | 5–25 | 35.453 / 36.258 / 34.685 / 41.404 | 36.950 ± 3.038 | 18.914 |
| T-HUN-2 | 0.5–0.8 | 0.279 / 0.194 / 0.290 / 0.247 | 0.253 ± 0.043 | 0.236 |
| T-HUN-3 | 0.05–0.4 | 0.083 / 0.075 / 0.111 / 0.088 | 0.089 ± 0.015 | 0.043 |
| T-FOOD-2 | 0.6–0.78 | 0.783 / 0.776 / 0.770 / 0.781 | 0.777 ± 0.006 | 0.695 |
| T-FOOD-4 | 4–15 | 8.136 / 7.847 / 8.129 / 8.051 | 8.041 ± 0.134 | 8.540 |
| T-FOOD-6 | 2–7 | 5.320 / 5.516 / 5.589 / 5.363 | 5.447 ± 0.127 | 5.063 |
| T-FOOD-10 | 0.08–0.3 | 0.744 / 0.746 / 0.759 / 0.766 | 0.754 ± 0.011 | 0.810 |
S9 T-ACT-2 by sex: {'male': 0.205, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.12, 'female': 0.085}
S9c1 T-ACT-2 by sex: {'male': 0.199, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.117, 'female': 0.08}
S9c2 T-ACT-2 by sex: {'male': 0.19, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.127, 'female': 0.077}
S9c3 T-ACT-2 by sex: {'male': 0.203, 'female': 0.159}; T-ACT-3 by sex: {'male': 0.119, 'female': 0.078}
S13 T-ACT-2 by sex: {'male': 0.246, 'female': 0.194}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.066}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S9: 1.78 ÷ 2.11 = 0.847
  S9c1: 1.83 ÷ 2.03 = 0.906
  S9c2: 1.74 ÷ 2.03 = 0.855
  S9c3: 1.78 ÷ 2.16 = 0.824
  S13: 2.35 ÷ 2.57 = 0.916
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s13/S13-rhythm5.json: adults out of a nest 2.57% of night; T-RHY-5 0.0280; night deaths 0; deaths 1
T-SOC-5 (band 0.2–0.7), pooled: 0.472
```

**Against the predictions.** Prescriptions 65: held. Viability and night (one death, not starvation; 2.57%, 0.0280):
held. T-HUN-1 in its band: held (36.9 → 18.9). T-ACT-4 near its floor and T-ACT-2 near 0.22: held (0.320; 0.217, males
0.246). T-SOC-5 in its band: held. Nursing mothers −0.07 to −0.11 %/day: held (−0.077); infants 0.5–2 y −0.08 to −0.13:
held (−0.093). Fitted inside noise or better: held (z −0.8). Held-out inside noise: held (z −0.5; +0.6 without the rare
rows). Not predicted: T-HUN-3 falls just below its band (0.089 → 0.043; S10 alone 0.054) and T-FOOD-10 moves further
from its band (0.754 → 0.810); adult males' balance −0.022 → −0.033 %/day; juveniles' better (−0.054 → −0.037).

**Verdict: S13 passes the keep rule and replaces S9 as the best integrated candidate.** 65 prescriptions (today's model
135); hunting, fruit share and grooming inside their bands; contests settled by assessment, foraging by energy rate,
hunts valued as food. Costs: the foraging rate raises walking and feeding (T-RNG-4 2.39, males 2.57 km a day), so males',
mothers' and infants' reserves fall faster than on S9; T-HUN-3 and T-FOOD-10 sit outside their bands (both rows with
staged scorer fixes awaiting the user).

## S14 confirm (registered 4 October 2026 before its run)

**S14 = S13 + E5e's `socialTiming` 15** (iteration 1: a greeting reopens after a reunion or a charge at the animal;
consortships need daylight left; the walk to a caller costs energy in E3c's currency; charges repeat by state;
`pantGruntRepeatH`, `feedChargeGapH`, `immigrantChargeGapH`, `consortLatestHour` and `joinCallDistScaleM` out: 65 → 60
prescriptions). **Reference group, new:** S13 in confirm mode (S13, ea92d20) plus three re-draws (`rgTemperature` 0.1641,
0.1639, 0.16405: S13c1–S13c3, bench-run3 ea92d20). Standard keep rule. Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days, from bench-run2 moved to this commit.

**Predictions (against the S13 group; moderate confidence unless stated).** Prescriptions 60 (high); viability and night
safety pass; T-ACT-1..4 and T-RNG-4 within the group's spread; T-SOC-5 inside its band; nursing mothers' reserves within
± 0.03 %/day of the group's mean (low: E5e's two arms disagreed in sign); fitted and held-out inside noise.

## S15 confirm (registered 4 October 2026 before its run)

**S15 = S13 + E4i's `patrolValue` 2** (the patrol lead weighed once, when a party first holds three adult males, from
border staleness, the odds against the neighbour's remembered males, daylight left, fatigue and arousal; 11 patrol
entries out: 65 → 54 prescriptions). E4i recorded it, off: it passed the standard keep rule in quick mode but nursing
mothers' reserve trend crossed the stage's own line (−3.6 SD against two quick realizations' spread). Judged here against
S13's confirm group (S13, S13c1–S13c3) by the standard keep rule, **plus, registered now, the stage's concern as a
criterion:** nursing mothers' reserve slope (%/day) not below the group's mean by more than 2 SD of the group (or 0.02,
whichever is larger). Bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from a frozen checkout of this
commit (`bench-run4`).

**Predictions (against the S13 group; moderate confidence unless stated).** Prescriptions 54 (high); viability and night
safety pass; patrols per community-week up ~2× (T-PAT-1 inside its band 0.1–0.5, low); incursion share up (T-PAT-6
0.5–0.7, low); T-IGE-1 up; fitted and held-out inside noise; nursing mothers' slope within the line (low: quick mode
crossed it, the cause unclear).

### S14 results (bench-run2 26f6ea1 for S14, bench-run3 ea92d20 for the S13 group, all clean; printed by judge_s13group.py and night.py from the JSON)

S13 group: S13 and S13c1–S13c3 (ea92d20). One re-draw (S13c3) scored T-BRD-1 3.98 and T-IGE-3 3.50, so the group's
held-out spread is wide (SD 3.4; 1.75 without the rare rows); the registered sums without T-IGE-3 as well are tight (SD
0.09) and are printed below. S14's two deaths: an infant that did not survive its mother's death, and an illness.

```
bench reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; energy reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; arms: ['S14']
  S13: ea92d20 dirty 0 prescriptions 65
  S13c1: ea92d20 dirty 0 prescriptions 65
  S13c2: ea92d20 dirty 0 prescriptions 65
  S13c3: ea92d20 dirty 0 prescriptions 65
  S14: 26f6ea1 dirty 0 prescriptions 60

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.49, 2.02, 1.55, 1.90 (mean 1.74, sd 0.26; used 0.30) | S14.json: 1.61, Δ -0.13, z -0.4 (inside noise)
  held-out           (15 rows) ref 5.95, 4.98, 5.13, 12.08 (mean 7.04, sd 3.39; used 3.39) | S14.json: 5.44, Δ -1.59, z -0.4 (inside noise)
  held-out w/o rare  (13 rows) ref 4.48, 4.69, 4.66, 8.10 (mean 5.48, sd 1.75; used 1.75) | S14.json: 5.44, Δ -0.04, z -0.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.43±1.82 | S14.json 0.00 (pass)
   T-COM-8   fitted   ref 0.04±0.04 | S14.json 0.16 (fail)
   T-FOOD-10 held-out ref 2.34±0.02 | S14.json 2.23 (fail)
   T-HUN-1   fitted   ref 0.00±0.00 | S14.json 0.18 (inconclusive)
   T-HUN-2   fitted   ref 0.95±0.15 | S14.json 0.63 (fail)
   T-HUN-4   held-out ref 0.13±0.15 | S14.json 0.00 (inconclusive)
   T-IGE-2   held-out ref 0.46±0.07 | S14.json 0.28 (fail)
   T-RNG-5   held-out ref 0.93±0.08 | S14.json 1.31 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S13 4.48 / 4.69 / 4.66 / 4.60 (mean 4.61, sd 0.09; used 0.21); S14 4.62 (z +0.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S13 3.51 / 3.81 / 3.64 / 3.75 (mean 3.68, sd 0.13; used 0.21); S14 3.31 (z -1.6)
T-RNG-5 distance by run (S13 group, then arms): [0.97, 0.88, 1.02, 0.85, 1.31]
T-IGE-3 distance by run: [0, 0, 0, 3.5, 0.82]

| Reserves ÷ store, % per day (OLS) | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- |
| adult male | -0.033 / -0.028 / -0.035 / -0.037 | -0.033 ± 0.004 | -0.032 (z +0.4) |
| female, other | -0.037 / -0.036 / -0.040 / -0.043 | -0.039 ± 0.003 | -0.054 (z -4.0) |
| female, lactating | -0.077 / -0.076 / -0.082 / -0.059 | -0.074 ± 0.010 | -0.083 (z -0.8) |
| juvenile 5–12 y | -0.037 / -0.043 / -0.058 / -0.046 | -0.046 ± 0.009 | -0.071 (z -2.5) |
| infant 2–5 y | -0.067 / -0.046 / -0.064 / -0.048 | -0.056 ± 0.011 | -0.068 (z -1.0) |
| infant 0.5–2 y | -0.093 / -0.120 / -0.117 / -0.078 | -0.102 ± 0.020 | -0.085 (z +0.7) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.80 / 2.77 / 2.77 / 2.81 | 2.79 ± 0.02 | 2.76 (z -1.2) |
| 1–2 y | 3.47 / 3.45 / 3.47 / 3.45 | 3.46 ± 0.01 | 3.46 (z +0.0) |
| 2–3 y | 3.47 / 3.49 / 3.49 / 3.46 | 3.48 ± 0.02 | 3.48 (z +0.1) |
| 3–4 y | 3.47 / 3.48 / 3.48 / 3.49 | 3.48 ± 0.01 | 3.43 (z -5.5) |

| Milk drunk, kcal per infant-day | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- |
| 0.5–1 y | 280 / 278 / 277 / 280 | 278 ± 1 | 275 (z -2.5) |
| 1–2 y | 282 / 278 / 279 / 276 | 279 ± 3 | 273 (z -1.9) |
| 2–3 y | 256 / 263 / 261 / 257 | 259 ± 3 | 246 (z -3.4) |
| 3–4 y | 245 / 248 / 245 / 254 | 248 ± 5 | 225 (z -4.5) |

| Mothers' balance, kcal/day by infant age | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- |
| 0.5–1 y | -29 / -38 / -43 / -21 | -33 ± 10 | -50 (z -1.6) |
| 1–2 y | -40 / -59 / -63 / -52 | -53 ± 10 | -53 (z +0.1) |
| 2–3 y | -27 / -35 / -37 / -35 | -34 ± 5 | -41 (z -1.5) |
| 3–4 y | -38 / -31 / -29 / -21 | -30 ± 7 | -28 (z +0.2) |

| Ground km / eating min / fruit share | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.57 / 2.55 / 2.57 / 2.64 | 2.58 ± 0.04 | 2.66 (z +1.7) |
| adult male: eatingMin | 256.11 / 256.71 / 254.08 / 256.38 | 255.82 ± 1.19 | 255.18 (z -0.5) |
| adult male: fruitShare | 0.76 / 0.75 / 0.76 / 0.75 | 0.75 ± 0.01 | 0.76 (z +0.5) |
| female, other: groundKm | 2.00 / 1.89 / 1.95 / 1.94 | 1.94 ± 0.05 | 2.02 (z +1.4) |
| female, other: eatingMin | 272.59 / 262.44 / 269.62 / 267.57 | 268.06 ± 4.27 | 272.46 (z +0.9) |
| female, other: fruitShare | 0.52 / 0.54 / 0.52 / 0.51 | 0.52 ± 0.01 | 0.51 (z -1.3) |
| female, lactating: groundKm | 2.35 / 2.41 / 2.33 / 2.33 | 2.36 ± 0.04 | 2.59 (z +5.4) |
| female, lactating: eatingMin | 313.42 / 313.82 / 310.77 / 311.81 | 312.46 ± 1.42 | 315.01 (z +1.6) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.62 (z -7.3) |
| juvenile 5–12 y: groundKm | 2.29 / 2.34 / 2.29 / 2.31 | 2.31 ± 0.03 | 2.55 (z +8.6) |
| juvenile 5–12 y: eatingMin | 284.23 / 277.24 / 283.12 / 283.80 | 282.10 ± 3.27 | 283.96 (z +0.5) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.80 / 0.80 / 0.80 | 0.81 ± 0.01 | 0.80 (z -0.5) |

| Row (pooled) | Band | S13 runs | S13 mean ± SD | S14 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.393 / 0.394 / 0.396 / 0.393 | 0.394 ± 0.002 | 0.398 |
| T-ACT-2 | 0.12–0.25 | 0.217 / 0.213 / 0.211 / 0.217 | 0.214 ± 0.003 | 0.221 |
| T-ACT-3 | 0.08–0.18 | 0.084 / 0.088 / 0.085 / 0.084 | 0.085 ± 0.002 | 0.085 |
| T-ACT-4 | 0.3–0.47 | 0.320 / 0.340 / 0.362 / 0.329 | 0.338 ± 0.018 | 0.325 |
| T-PTY-1 | 3–9 | 3.790 / 3.703 / 3.747 / 3.724 | 3.741 ± 0.038 | 4.037 |
| T-RNG-4 | 1.5–3.5 | 2.385 / 2.382 / 2.326 / 2.427 | 2.380 ± 0.041 | 2.425 |
| T-HUN-1 | 5–25 | 18.914 / 21.731 / 22.511 / 23.392 | 21.637 ± 1.938 | 28.541 |
| T-HUN-2 | 0.5–0.8 | 0.236 / 0.160 / 0.264 / 0.205 | 0.216 ± 0.045 | 0.310 |
| T-HUN-3 | 0.05–0.4 | 0.043 / 0.043 / 0.055 / 0.048 | 0.047 ± 0.006 | 0.067 |
| T-FOOD-2 | 0.6–0.78 | 0.695 / 0.690 / 0.688 / 0.680 | 0.688 ± 0.006 | 0.702 |
| T-FOOD-4 | 4–15 | 8.540 / 8.552 / 8.416 / 7.962 | 8.367 ± 0.277 | 8.469 |
| T-FOOD-6 | 2–7 | 5.063 / 4.972 / 5.202 / 5.433 | 5.167 ± 0.200 | 4.693 |
| T-FOOD-10 | 0.08–0.3 | 0.810 / 0.814 / 0.812 / 0.821 | 0.814 ± 0.005 | 0.790 |
S13 T-ACT-2 by sex: {'male': 0.246, 'female': 0.194}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.066}
S13c1 T-ACT-2 by sex: {'male': 0.241, 'female': 0.189}; T-ACT-3 by sex: {'male': 0.11, 'female': 0.07}
S13c2 T-ACT-2 by sex: {'male': 0.237, 'female': 0.19}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.065}
S13c3 T-ACT-2 by sex: {'male': 0.24, 'female': 0.199}; T-ACT-3 by sex: {'male': 0.104, 'female': 0.068}
S14 T-ACT-2 by sex: {'male': 0.242, 'female': 0.205}; T-ACT-3 by sex: {'male': 0.11, 'female': 0.064}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S13: 2.35 ÷ 2.57 = 0.916
  S13c1: 2.41 ÷ 2.55 = 0.947
  S13c2: 2.33 ÷ 2.57 = 0.906
  S13c3: 2.33 ÷ 2.64 = 0.883
  S14: 2.59 ÷ 2.66 = 0.974
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run2/artifacts/validation/e/s14/S14-rhythm5.json: adults out of a nest 2.48% of night; T-RHY-5 0.0269; night deaths 2; deaths 2
T-SOC-5 (band 0.2–0.7), pooled: S14 0.631
```

**Against the predictions.** Prescriptions 60: held. Viability and night (2.48%, 0.0269): held. T-ACT-1..4 and T-RNG-4
within the group's spread: held for T-ACT-1, -3, -4 and T-RNG-4; T-ACT-2 0.221 against 0.214 ± 0.003, a little above.
T-SOC-5 inside its band: held (0.631). Nursing mothers within ± 0.03 of the group: held (−0.074 → −0.083). Fitted and
held-out inside noise: held (z −0.4; −0.4; 0.0 without the rare rows; +0.0 without T-IGE-3 as well). Not predicted:
other females' and juveniles' reserves lower (−0.039 → −0.054; −0.046 → −0.071 %/day), parties larger (T-PTY-1 3.74 →
4.04), hunting back above its band (T-HUN-1 21.6 → 28.5), T-RNG-5 worse (0.93 → 1.31).

**Verdict: S14 passes the keep rule** (60 prescriptions: greeting, charges, consort timing and the walk to callers no
longer set by quotas, a clock or a fitted scale). Costs as listed; whether it joins the stack is judged with S15.

### S15 results (bench-run4 721b0fb for S15, bench-run3 ea92d20 for the S13 group, all clean; printed by judge_s13group.py and night.py from the JSON)

S15's six deaths were one respiratory outbreak in seed 48 (two adult males, a female, three infants); none from
starvation or aggression.

```
bench reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; energy reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; arms: ['S15']
  S13: ea92d20 dirty 0 prescriptions 65
  S13c1: ea92d20 dirty 0 prescriptions 65
  S13c2: ea92d20 dirty 0 prescriptions 65
  S13c3: ea92d20 dirty 0 prescriptions 65
  S15: 721b0fb dirty 0 prescriptions 54

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.49, 2.02, 1.55, 1.90 (mean 1.74, sd 0.26; used 0.30) | S15.json: 2.35, Δ +0.61, z +1.8 (inside noise)
  held-out           (15 rows) ref 5.95, 4.98, 5.13, 12.08 (mean 7.04, sd 3.39; used 3.39) | S15.json: 12.69, Δ +5.66, z +1.5 (inside noise)
  held-out w/o rare  (13 rows) ref 4.48, 4.69, 4.66, 8.10 (mean 5.48, sd 1.75; used 1.75) | S15.json: 5.75, Δ +0.27, z +0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.43±1.82 | S15.json 6.94 (fail)
   T-COM-11  fitted   ref 0.51±0.21 | S15.json 0.08 (inconclusive)
   T-HUN-2   fitted   ref 0.95±0.15 | S15.json 0.59 (fail)
   T-HUN-4   held-out ref 0.13±0.15 | S15.json 0.00 (inconclusive)
   T-IGE-1   fitted   ref 0.00±0.00 | S15.json 1.52 (fail)
   T-SOC-3   held-out ref 0.10±0.03 | S15.json 0.28 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S13 4.48 / 4.69 / 4.66 / 4.60 (mean 4.61, sd 0.09; used 0.21); S15 4.61 (z +0.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S13 3.51 / 3.81 / 3.64 / 3.75 (mean 3.68, sd 0.13; used 0.21); S15 3.78 (z +0.4)
T-RNG-5 distance by run (S13 group, then arms): [0.97, 0.88, 1.02, 0.85, 0.84]
T-IGE-3 distance by run: [0, 0, 0, 3.5, 1.14]

| Reserves ÷ store, % per day (OLS) | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- |
| adult male | -0.033 / -0.028 / -0.035 / -0.037 | -0.033 ± 0.004 | -0.035 (z -0.5) |
| female, other | -0.037 / -0.036 / -0.040 / -0.043 | -0.039 ± 0.003 | -0.029 (z +2.7) |
| female, lactating | -0.077 / -0.076 / -0.082 / -0.059 | -0.074 ± 0.010 | -0.051 (z +2.0) |
| juvenile 5–12 y | -0.037 / -0.043 / -0.058 / -0.046 | -0.046 ± 0.009 | -0.030 (z +1.6) |
| infant 2–5 y | -0.067 / -0.046 / -0.064 / -0.048 | -0.056 ± 0.011 | -0.039 (z +1.5) |
| infant 0.5–2 y | -0.093 / -0.120 / -0.117 / -0.078 | -0.102 ± 0.020 | -0.076 (z +1.2) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.80 / 2.77 / 2.77 / 2.81 | 2.79 ± 0.02 | 2.76 (z -1.2) |
| 1–2 y | 3.47 / 3.45 / 3.47 / 3.45 | 3.46 ± 0.01 | 3.46 (z +0.0) |
| 2–3 y | 3.47 / 3.49 / 3.49 / 3.46 | 3.48 ± 0.02 | 3.47 (z -0.4) |
| 3–4 y | 3.47 / 3.48 / 3.48 / 3.49 | 3.48 ± 0.01 | 3.49 (z +1.1) |

| Milk drunk, kcal per infant-day | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- |
| 0.5–1 y | 280 / 278 / 277 / 280 | 278 ± 1 | 277 (z -1.0) |
| 1–2 y | 282 / 278 / 279 / 276 | 279 ± 3 | 282 (z +1.1) |
| 2–3 y | 256 / 263 / 261 / 257 | 259 ± 3 | 258 (z -0.4) |
| 3–4 y | 245 / 248 / 245 / 254 | 248 ± 5 | 243 (z -1.1) |

| Mothers' balance, kcal/day by infant age | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- |
| 0.5–1 y | -29 / -38 / -43 / -21 | -33 ± 10 | -35 (z -0.2) |
| 1–2 y | -40 / -59 / -63 / -52 | -53 ± 10 | -44 (z +0.8) |
| 2–3 y | -27 / -35 / -37 / -35 | -34 ± 5 | -33 (z +0.1) |
| 3–4 y | -38 / -31 / -29 / -21 | -30 ± 7 | -23 (z +0.9) |

| Ground km / eating min / fruit share | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.57 / 2.55 / 2.57 / 2.64 | 2.58 ± 0.04 | 2.68 (z +2.2) |
| adult male: eatingMin | 256.11 / 256.71 / 254.08 / 256.38 | 255.82 ± 1.19 | 253.50 (z -1.7) |
| adult male: fruitShare | 0.76 / 0.75 / 0.76 / 0.75 | 0.75 ± 0.01 | 0.77 (z +1.9) |
| female, other: groundKm | 2.00 / 1.89 / 1.95 / 1.94 | 1.94 ± 0.05 | 2.02 (z +1.4) |
| female, other: eatingMin | 272.59 / 262.44 / 269.62 / 267.57 | 268.06 ± 4.27 | 266.86 (z -0.2) |
| female, other: fruitShare | 0.52 / 0.54 / 0.52 / 0.51 | 0.52 ± 0.01 | 0.53 (z +0.9) |
| female, lactating: groundKm | 2.35 / 2.41 / 2.33 / 2.33 | 2.36 ± 0.04 | 2.40 (z +1.1) |
| female, lactating: eatingMin | 313.42 / 313.82 / 310.77 / 311.81 | 312.46 ± 1.42 | 314.53 (z +1.3) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.63 (z -1.3) |
| juvenile 5–12 y: groundKm | 2.29 / 2.34 / 2.29 / 2.31 | 2.31 ± 0.03 | 2.30 (z -0.1) |
| juvenile 5–12 y: eatingMin | 284.23 / 277.24 / 283.12 / 283.80 | 282.10 ± 3.27 | 277.95 (z -1.1) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.80 / 0.80 / 0.80 | 0.81 ± 0.01 | 0.82 (z +0.8) |

| Row (pooled) | Band | S13 runs | S13 mean ± SD | S15 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.393 / 0.394 / 0.396 / 0.393 | 0.394 ± 0.002 | 0.393 |
| T-ACT-2 | 0.12–0.25 | 0.217 / 0.213 / 0.211 / 0.217 | 0.214 ± 0.003 | 0.224 |
| T-ACT-3 | 0.08–0.18 | 0.084 / 0.088 / 0.085 / 0.084 | 0.085 ± 0.002 | 0.079 |
| T-ACT-4 | 0.3–0.47 | 0.320 / 0.340 / 0.362 / 0.329 | 0.338 ± 0.018 | 0.336 |
| T-PTY-1 | 3–9 | 3.790 / 3.703 / 3.747 / 3.724 | 3.741 ± 0.038 | 3.465 |
| T-RNG-4 | 1.5–3.5 | 2.385 / 2.382 / 2.326 / 2.427 | 2.380 ± 0.041 | 2.556 |
| T-HUN-1 | 5–25 | 18.914 / 21.731 / 22.511 / 23.392 | 21.637 ± 1.938 | 14.519 |
| T-HUN-2 | 0.5–0.8 | 0.236 / 0.160 / 0.264 / 0.205 | 0.216 ± 0.045 | 0.324 |
| T-HUN-3 | 0.05–0.4 | 0.043 / 0.043 / 0.055 / 0.048 | 0.047 ± 0.006 | 0.026 |
| T-FOOD-2 | 0.6–0.78 | 0.695 / 0.690 / 0.688 / 0.680 | 0.688 ± 0.006 | 0.706 |
| T-FOOD-4 | 4–15 | 8.540 / 8.552 / 8.416 / 7.962 | 8.367 ± 0.277 | 8.320 |
| T-FOOD-6 | 2–7 | 5.063 / 4.972 / 5.202 / 5.433 | 5.167 ± 0.200 | 5.330 |
| T-FOOD-10 | 0.08–0.3 | 0.810 / 0.814 / 0.812 / 0.821 | 0.814 ± 0.005 | 0.813 |
S13 T-ACT-2 by sex: {'male': 0.246, 'female': 0.194}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.066}
S13c1 T-ACT-2 by sex: {'male': 0.241, 'female': 0.189}; T-ACT-3 by sex: {'male': 0.11, 'female': 0.07}
S13c2 T-ACT-2 by sex: {'male': 0.237, 'female': 0.19}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.065}
S13c3 T-ACT-2 by sex: {'male': 0.24, 'female': 0.199}; T-ACT-3 by sex: {'male': 0.104, 'female': 0.068}
S15 T-ACT-2 by sex: {'male': 0.256, 'female': 0.197}; T-ACT-3 by sex: {'male': 0.094, 'female': 0.066}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S13: 2.35 ÷ 2.57 = 0.916
  S13c1: 2.41 ÷ 2.55 = 0.947
  S13c2: 2.33 ÷ 2.57 = 0.906
  S13c3: 2.33 ÷ 2.64 = 0.883
  S15: 2.40 ÷ 2.68 = 0.897
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s15/S15-rhythm5.json: adults out of a nest 2.81% of night; T-RHY-5 0.0305; night deaths 1; deaths 6

| Row (pooled) | Band | S13 / S13c1 / S13c2 / S13c3 | S15 |
| --- | --- | --- | --- |
| T-PAT-1 | 0.1–0.5 | 0.0851 / 0.0463 / 0.0923 / 0.0772 | 0.231 |
| T-PAT-2 | 7–18 | 2.86 / 1.64 / 2.95 / 3.28 | 7.24 |
| T-PAT-3 | 0.55–0.85 | 0.594 / 0.626 / 0.59 / 0.738 | 0.584 |
| T-PAT-5 | 60–240 | 148 / 158 / 121 / 192 | 167 |
| T-PAT-6 | 0.4–0.7 | 0.385 / 0.174 / 0.0526 / 0.25 | 0.568 |
| T-PAT-7 | 0.15–0.45 | 0 / 0 / 0 / 0 | 0 |
| T-BRD-1 | 0.037–0.107 | 0.21 / 0.0672 / 0.0197 / -0.242 | 0.593 |
| T-IGE-1 | 5–12 | 11.4 / 7.19 / 7.46 / 6.55 | 22.6 |
| T-IGE-2 | 0.7–0.9 | 0.971 / 1 / 1 / 1 | 0.979 |
| T-IGE-3 | 0.25–0.75 | 0.286 / 0.701 / 0.349 / 2.5 | 1.32 |
| T-SOC-5 | 0.2–0.7 | 0.472 / 0.435 / 0.512 / 0.52 | 0.416 |
```

**Against the predictions and the registered mothers' line.** Prescriptions 54: held. Viability and night (2.81%,
T-RHY-5 0.0305): held. Nursing mothers' slope not below the group's mean by more than 2 SD (or 0.02): **held, the quick-mode
concern did not replicate** (−0.074 ± 0.010 → −0.051, better). Patrols up and T-PAT-1 in its band: held (T-PAT-1 0.23);
incursion share 0.5–0.7: held (T-PAT-6 0.57); T-IGE-1 up: held, and above its band (22.6 against 5–12). Fitted and
held-out inside noise: held (z +1.8; +1.5; +0.1 without the rare rows; +0.0 without T-IGE-3 as well). Not predicted:
T-PAT-7 (contact and violence on patrols) 0, T-HUN-3 0.026 below its band, parties smaller (T-PTY-1 3.74 → 3.47).

**Verdict: S15 passes the keep rule and the registered mothers' line** (54 prescriptions: patrols started, ended and
steered by the males' assessment instead of a fitted hazard, clock hours and dice). Costs: intergroup encounters about
twice S13's and above their band; no violence on patrols. Next: S14 and S15 together (S16).

## S16 confirm (registered 4 October 2026 before its run)

**S16 = S13 + `socialTiming` 15 + `patrolValue` 2** (S14 and S15 together: 65 → 49 prescriptions). Judged against the
S13 group by the standard keep rule and the mothers' line registered for S15. Bench, energy-diagnose and rhythm-metrics,
5 seeds, 30 + 60 days, from bench-run4 (721b0fb carries both switches; this commit changes only this file).

**Predictions (against the S13 group; moderate confidence unless stated).** Prescriptions 49 (high); viability and night
safety pass; T-PAT-1 and T-PAT-6 in their bands, T-IGE-1 above its band (from S15); other females' and juveniles'
reserves lower (from S14; low); nursing mothers within the line; fitted and held-out inside noise.

### S16 results (bench-run4 721b0fb, clean; judged against the four S13 runs; printed by judge_s13group.py and night.py from the JSON)

```
bench reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; energy reference runs: ['S13', 'S13c1', 'S13c2', 'S13c3']; arms: ['S16']
  S13: ea92d20 dirty 0 prescriptions 65
  S13c1: ea92d20 dirty 0 prescriptions 65
  S13c2: ea92d20 dirty 0 prescriptions 65
  S13c3: ea92d20 dirty 0 prescriptions 65
  S16: 721b0fb dirty 0 prescriptions 49

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.49, 2.02, 1.55, 1.90 (mean 1.74, sd 0.26; used 0.30) | S16.json: 3.06, Δ +1.32, z +3.9 RESULT
  held-out           (15 rows) ref 5.95, 4.98, 5.13, 12.08 (mean 7.04, sd 3.39; used 3.39) | S16.json: 6.75, Δ -0.29, z -0.1 (inside noise)
  held-out w/o rare  (13 rows) ref 4.48, 4.69, 4.66, 8.10 (mean 5.48, sd 1.75; used 1.75) | S16.json: 5.79, Δ +0.31, z +0.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.43±1.82 | S16.json 0.96 (fail)
   T-COM-8   fitted   ref 0.04±0.04 | S16.json 0.18 (fail)
   T-FOOD-10 held-out ref 2.34±0.02 | S16.json 2.23 (fail)
   T-HUN-4   held-out ref 0.13±0.15 | S16.json 0.00 (inconclusive)
   T-HUN-8   held-out ref 0.00±0.00 | S16.json 0.33 (fail)
   T-IGE-1   fitted   ref 0.00±0.00 | S16.json 1.54 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S13 4.48 / 4.69 / 4.66 / 4.60 (mean 4.61, sd 0.09; used 0.21); S16 4.55 (z -0.3)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S13 3.51 / 3.81 / 3.64 / 3.75 (mean 3.68, sd 0.13; used 0.21); S16 3.77 (z +0.4)
T-RNG-5 distance by run (S13 group, then arms): [0.97, 0.88, 1.02, 0.85, 0.77]
T-IGE-3 distance by run: [0, 0, 0, 3.5, 1.24]

| Reserves ÷ store, % per day (OLS) | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- |
| adult male | -0.033 / -0.028 / -0.035 / -0.037 | -0.033 ± 0.004 | -0.033 (z +0.1) |
| female, other | -0.037 / -0.036 / -0.040 / -0.043 | -0.039 ± 0.003 | -0.039 (z +0.1) |
| female, lactating | -0.077 / -0.076 / -0.082 / -0.059 | -0.074 ± 0.010 | -0.067 (z +0.6) |
| juvenile 5–12 y | -0.037 / -0.043 / -0.058 / -0.046 | -0.046 ± 0.009 | -0.071 (z -2.5) |
| infant 2–5 y | -0.067 / -0.046 / -0.064 / -0.048 | -0.056 ± 0.011 | -0.053 (z +0.3) |
| infant 0.5–2 y | -0.093 / -0.120 / -0.117 / -0.078 | -0.102 ± 0.020 | -0.093 (z +0.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.80 / 2.77 / 2.77 / 2.81 | 2.79 ± 0.02 | 2.74 (z -2.1) |
| 1–2 y | 3.47 / 3.45 / 3.47 / 3.45 | 3.46 ± 0.01 | 3.44 (z -1.5) |
| 2–3 y | 3.47 / 3.49 / 3.49 / 3.46 | 3.48 ± 0.02 | 3.48 (z +0.1) |
| 3–4 y | 3.47 / 3.48 / 3.48 / 3.49 | 3.48 ± 0.01 | 3.48 (z +0.0) |

| Milk drunk, kcal per infant-day | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- |
| 0.5–1 y | 280 / 278 / 277 / 280 | 278 ± 1 | 274 (z -2.9) |
| 1–2 y | 282 / 278 / 279 / 276 | 279 ± 3 | 273 (z -2.0) |
| 2–3 y | 256 / 263 / 261 / 257 | 259 ± 3 | 249 (z -2.7) |
| 3–4 y | 245 / 248 / 245 / 254 | 248 ± 5 | 239 (z -1.8) |

| Mothers' balance, kcal/day by infant age | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- |
| 0.5–1 y | -29 / -38 / -43 / -21 | -33 ± 10 | -45 (z -1.2) |
| 1–2 y | -40 / -59 / -63 / -52 | -53 ± 10 | -41 (z +1.1) |
| 2–3 y | -27 / -35 / -37 / -35 | -34 ± 5 | -34 (z +0.0) |
| 3–4 y | -38 / -31 / -29 / -21 | -30 ± 7 | -23 (z +0.9) |

| Ground km / eating min / fruit share | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.57 / 2.55 / 2.57 / 2.64 | 2.58 ± 0.04 | 2.86 (z +6.3) |
| adult male: eatingMin | 256.11 / 256.71 / 254.08 / 256.38 | 255.82 ± 1.19 | 254.80 (z -0.8) |
| adult male: fruitShare | 0.76 / 0.75 / 0.76 / 0.75 | 0.75 ± 0.01 | 0.77 (z +3.3) |
| female, other: groundKm | 2.00 / 1.89 / 1.95 / 1.94 | 1.94 ± 0.05 | 2.17 (z +4.3) |
| female, other: eatingMin | 272.59 / 262.44 / 269.62 / 267.57 | 268.06 ± 4.27 | 267.76 (z -0.1) |
| female, other: fruitShare | 0.52 / 0.54 / 0.52 / 0.51 | 0.52 ± 0.01 | 0.53 (z +0.9) |
| female, lactating: groundKm | 2.35 / 2.41 / 2.33 / 2.33 | 2.36 ± 0.04 | 2.58 (z +5.3) |
| female, lactating: eatingMin | 313.42 / 313.82 / 310.77 / 311.81 | 312.46 ± 1.42 | 313.90 (z +0.9) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.64 / 0.64 | 0.64 ± 0.00 | 0.64 (z +0.8) |
| juvenile 5–12 y: groundKm | 2.29 / 2.34 / 2.29 / 2.31 | 2.31 ± 0.03 | 2.54 (z +8.2) |
| juvenile 5–12 y: eatingMin | 284.23 / 277.24 / 283.12 / 283.80 | 282.10 ± 3.27 | 283.24 (z +0.3) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.80 / 0.80 / 0.80 | 0.81 ± 0.01 | 0.82 (z +0.7) |

| Row (pooled) | Band | S13 runs | S13 mean ± SD | S16 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.393 / 0.394 / 0.396 / 0.393 | 0.394 ± 0.002 | 0.388 |
| T-ACT-2 | 0.12–0.25 | 0.217 / 0.213 / 0.211 / 0.217 | 0.214 ± 0.003 | 0.237 |
| T-ACT-3 | 0.08–0.18 | 0.084 / 0.088 / 0.085 / 0.084 | 0.085 ± 0.002 | 0.082 |
| T-ACT-4 | 0.3–0.47 | 0.320 / 0.340 / 0.362 / 0.329 | 0.338 ± 0.018 | 0.319 |
| T-PTY-1 | 3–9 | 3.790 / 3.703 / 3.747 / 3.724 | 3.741 ± 0.038 | 4.018 |
| T-RNG-4 | 1.5–3.5 | 2.385 / 2.382 / 2.326 / 2.427 | 2.380 ± 0.041 | 2.662 |
| T-HUN-1 | 5–25 | 18.914 / 21.731 / 22.511 / 23.392 | 21.637 ± 1.938 | 20.569 |
| T-HUN-2 | 0.5–0.8 | 0.236 / 0.160 / 0.264 / 0.205 | 0.216 ± 0.045 | 0.208 |
| T-HUN-3 | 0.05–0.4 | 0.043 / 0.043 / 0.055 / 0.048 | 0.047 ± 0.006 | 0.033 |
| T-FOOD-2 | 0.6–0.78 | 0.695 / 0.690 / 0.688 / 0.680 | 0.688 ± 0.006 | 0.710 |
| T-FOOD-4 | 4–15 | 8.540 / 8.552 / 8.416 / 7.962 | 8.367 ± 0.277 | 8.617 |
| T-FOOD-6 | 2–7 | 5.063 / 4.972 / 5.202 / 5.433 | 5.167 ± 0.200 | 4.942 |
| T-FOOD-10 | 0.08–0.3 | 0.810 / 0.814 / 0.812 / 0.821 | 0.814 ± 0.005 | 0.790 |
S13 T-ACT-2 by sex: {'male': 0.246, 'female': 0.194}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.066}
S13c1 T-ACT-2 by sex: {'male': 0.241, 'female': 0.189}; T-ACT-3 by sex: {'male': 0.11, 'female': 0.07}
S13c2 T-ACT-2 by sex: {'male': 0.237, 'female': 0.19}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.065}
S13c3 T-ACT-2 by sex: {'male': 0.24, 'female': 0.199}; T-ACT-3 by sex: {'male': 0.104, 'female': 0.068}
S16 T-ACT-2 by sex: {'male': 0.27, 'female': 0.211}; T-ACT-3 by sex: {'male': 0.102, 'female': 0.066}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S13: 2.35 ÷ 2.57 = 0.916
  S13c1: 2.41 ÷ 2.55 = 0.947
  S13c2: 2.33 ÷ 2.57 = 0.906
  S13c3: 2.33 ÷ 2.64 = 0.883
  S16: 2.58 ÷ 2.86 = 0.904
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s16/S16-rhythm5.json: adults out of a nest 2.69% of night; T-RHY-5 0.0283; night deaths 0; deaths 1

Fitted rows that moved most (distance: S13 mean -> S16; value S16):
  T-IGE-1: 0.00 -> 1.54 (value 22.8, band 5–12)
  T-COM-8: 0.04 -> 0.18 (value 0.655, band 0.3–0.6)
  T-ACT-2: 0.00 -> 0.08 (value 0.237, band 0.12–0.25)
  T-HUN-3: 0.01 -> 0.05 (value 0.0331, band 0.05–0.4)
  T-PAT-1 0.247 (band 0.1–0.5)
  T-PAT-2 7.43 (band 7–18)
  T-PAT-6 0.571 (band 0.4–0.7)
  T-PAT-7 0.0312 (band 0.15–0.45)
  T-IGE-1 22.8 (band 5–12)
  T-SOC-5 0.543 (band 0.2–0.7)
```

**Against the predictions.** Prescriptions 49: held. Viability and night (one illness death; 2.69%, 0.0283): held.
T-PAT-1 and T-PAT-6 in their bands: held (0.247; 0.571). T-IGE-1 above its band: held (22.8). Other females' and
juveniles' reserves lower: held for juveniles (−0.046 → −0.071), not for other females (−0.039, unchanged). Nursing
mothers within the line: held (−0.067). Held-out inside noise: held (z −0.1; +0.2 without the rare rows; −0.3 without
T-IGE-3 as well). **Fitted inside noise: missed** (z +3.9: 1.74 → 3.06), mostly T-IGE-1 (0 → 1.54: intergroup encounters
twice S13's, as in S15) and T-HUN-2 (back to 0.97 after S15's 0.59).

**Verdict: S16 passes the keep rule** (viability, held-out, prescriptions 65 → 49, night safe) and becomes the best
integrated candidate by that rule, **with a fitted cost beyond noise** that the rule does not test: intergroup encounters
at twice the band's top. The patrol rate and encounter rate are the next problem (E4i: the rate is set by design
constants; half the patrols never hold three adult males).

## S17 confirm (registered 4 October 2026 before its run)

**S17 = S16 + E4j's `patrolFusion` 1** (the patrol lead weighed only when a party truly joins up, judged by the adult
males met in the last hour; a correction: no counted prescription changes, 49). **Reference group, new:** S16 in confirm
mode (S16, 721b0fb) plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405: S16c1–S16c3, bench-run4). **Keep rule
for a correction:** viability; held-out not up beyond noise (with and without the rare rows, and without T-IGE-3);
prescriptions not up; night safe. Reported: T-IGE-1 (fitted) and the patrol rows. Bench, energy-diagnose and
rhythm-metrics, 5 seeds, 30 + 60 days, from a frozen checkout of this commit (bench-run2 moved here).

**Predictions (against the S16 group; moderate confidence unless stated).** Prescriptions 49 (high); viability and night
safety pass; T-IGE-1 inside its band 5–12 (moderate; S16 22.8); T-PAT-1 lower than S16's but inside its band (low);
nursing mothers' and juveniles' reserves no worse than S16's; fitted better (T-IGE-1) and held-out inside noise; T-SOC-9
reported (it fell in quick mode).

### S17 results (bench-run2 37f04e8 for S17, bench-run4 721b0fb for the S16 group, all clean; printed by judge_s16group.py and night.py from the JSON)

```
bench reference runs: ['S16', 'S16c1', 'S16c2', 'S16c3']; energy reference runs: ['S16', 'S16c1', 'S16c2', 'S16c3']; arms: ['S17']
  S16: 721b0fb dirty 0 prescriptions 49
  S16c1: 721b0fb dirty 0 prescriptions 49
  S16c2: 721b0fb dirty 0 prescriptions 49
  S16c3: 721b0fb dirty 0 prescriptions 49
  S17: 37f04e8 dirty 0 prescriptions 49

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 3.06, 2.24, 2.95, 3.27 (mean 2.88, sd 0.45; used 0.45) | S17.json: 1.08, Δ -1.80, z -3.6 RESULT
  held-out           (15 rows) ref 6.75, 6.01, 12.40, 6.91 (mean 8.02, sd 2.95; used 2.95) | S17.json: 6.34, Δ -1.68, z -0.5 (inside noise)
  held-out w/o rare  (13 rows) ref 5.79, 5.83, 7.98, 5.82 (mean 6.35, sd 1.08; used 1.08) | S17.json: 4.97, Δ -1.39, z -1.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.66±1.88 | S17.json 1.37 (fail)
   T-HUN-4   held-out ref 0.00±0.00 | S17.json 0.00 (inconclusive)
   T-IGE-1   fitted   ref 1.16±0.30 | S17.json 0.16 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S16 4.55 / 4.70 / 5.10 / 4.47 (mean 4.70, sd 0.28; used 0.28); S17 4.52 (z -0.6)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S16 3.77 / 3.72 / 3.95 / 3.62 (mean 3.77, sd 0.14; used 0.21); S17 3.70 (z -0.3)
T-RNG-5 distance by run (S16 group, then arms): [0.77, 0.97, 1.15, 0.84, 0.81]
T-IGE-3 distance by run: [1.24, 1.13, 2.87, 1.35, 0.45]

| Reserves ÷ store, % per day (OLS) | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- |
| adult male | -0.033 / -0.044 / -0.039 / -0.037 | -0.038 ± 0.005 | -0.035 (z +0.7) |
| female, other | -0.039 / -0.051 / -0.032 / -0.053 | -0.044 ± 0.010 | -0.047 (z -0.3) |
| female, lactating | -0.067 / -0.075 / -0.076 / -0.069 | -0.072 ± 0.004 | -0.059 (z +2.9) |
| juvenile 5–12 y | -0.071 / -0.084 / -0.091 / -0.072 | -0.080 ± 0.010 | -0.069 (z +1.0) |
| infant 2–5 y | -0.053 / -0.062 / -0.050 / -0.057 | -0.055 ± 0.005 | -0.050 (z +0.9) |
| infant 0.5–2 y | -0.093 / -0.096 / -0.117 / -0.092 | -0.100 ± 0.012 | -0.075 (z +1.8) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.74 / 2.75 / 2.77 / 2.76 | 2.75 ± 0.01 | 2.79 (z +2.4) |
| 1–2 y | 3.44 / 3.46 / 3.45 / 3.46 | 3.45 ± 0.01 | 3.45 (z -0.2) |
| 2–3 y | 3.48 / 3.48 / 3.49 / 3.48 | 3.48 ± 0.01 | 3.48 (z -0.4) |
| 3–4 y | 3.48 / 3.48 / 3.47 / 3.49 | 3.48 ± 0.01 | 3.47 (z -1.1) |

| Milk drunk, kcal per infant-day | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- |
| 0.5–1 y | 274 / 276 / 275 / 277 | 276 ± 1 | 277 (z +1.1) |
| 1–2 y | 273 / 280 / 278 / 283 | 279 ± 4 | 281 (z +0.4) |
| 2–3 y | 249 / 251 / 256 / 252 | 252 ± 3 | 250 (z -0.5) |
| 3–4 y | 239 / 238 / 237 / 246 | 240 ± 4 | 235 (z -1.2) |

| Mothers' balance, kcal/day by infant age | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- |
| 0.5–1 y | -45 / -41 / -44 / -40 | -43 ± 3 | -36 (z +2.5) |
| 1–2 y | -41 / -41 / -54 / -42 | -44 ± 6 | -37 (z +1.1) |
| 2–3 y | -34 / -36 / -32 / -39 | -35 ± 3 | -38 (z -0.8) |
| 3–4 y | -23 / -29 / -31 / -25 | -27 ± 3 | -21 (z +1.6) |

| Ground km / eating min / fruit share | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.86 / 2.93 / 2.82 / 2.87 | 2.87 ± 0.04 | 2.69 (z -3.5) |
| adult male: eatingMin | 254.80 / 257.43 / 254.23 / 254.84 | 255.33 ± 1.43 | 254.53 (z -0.5) |
| adult male: fruitShare | 0.77 / 0.76 / 0.77 / 0.77 | 0.77 ± 0.01 | 0.76 (z -1.4) |
| female, other: groundKm | 2.17 / 2.25 / 2.10 / 2.11 | 2.16 ± 0.07 | 2.02 (z -1.8) |
| female, other: eatingMin | 267.76 / 265.60 / 269.48 / 265.00 | 266.96 ± 2.06 | 267.90 (z +0.4) |
| female, other: fruitShare | 0.53 / 0.54 / 0.51 / 0.52 | 0.53 ± 0.01 | 0.52 (z -0.8) |
| female, lactating: groundKm | 2.58 / 2.60 / 2.54 / 2.49 | 2.55 ± 0.05 | 2.50 (z -0.9) |
| female, lactating: eatingMin | 313.90 / 314.84 / 313.28 / 314.05 | 314.02 ± 0.65 | 313.77 (z -0.3) |
| female, lactating: fruitShare | 0.64 / 0.64 / 0.63 / 0.64 | 0.64 ± 0.00 | 0.63 (z -2.3) |
| juvenile 5–12 y: groundKm | 2.54 / 2.60 / 2.44 / 2.53 | 2.53 ± 0.07 | 2.47 (z -0.8) |
| juvenile 5–12 y: eatingMin | 283.24 / 285.65 / 289.54 / 278.54 | 284.24 ± 4.60 | 283.95 (z -0.1) |
| juvenile 5–12 y: fruitShare | 0.82 / 0.82 / 0.80 / 0.82 | 0.82 ± 0.01 | 0.80 (z -0.8) |

| Row (pooled) | Band | S16 runs | S16 mean ± SD | S17 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.388 / 0.397 / 0.398 / 0.392 | 0.394 ± 0.004 | 0.404 |
| T-ACT-2 | 0.12–0.25 | 0.237 / 0.229 / 0.230 / 0.233 | 0.232 ± 0.004 | 0.216 |
| T-ACT-3 | 0.08–0.18 | 0.082 / 0.085 / 0.084 / 0.083 | 0.083 ± 0.001 | 0.085 |
| T-ACT-4 | 0.3–0.47 | 0.319 / 0.319 / 0.315 / 0.342 | 0.324 ± 0.013 | 0.334 |
| T-PTY-1 | 3–9 | 4.018 / 3.913 / 4.067 / 3.975 | 3.993 ± 0.065 | 3.930 |
| T-RNG-4 | 1.5–3.5 | 2.662 / 2.624 / 2.449 / 2.648 | 2.596 ± 0.099 | 2.549 |
| T-HUN-1 | 5–25 | 20.569 / 21.352 / 23.014 / 22.586 | 21.880 ± 1.123 | 24.226 |
| T-HUN-2 | 0.5–0.8 | 0.208 / 0.286 / 0.269 / 0.111 | 0.219 ± 0.079 | 0.347 |
| T-HUN-3 | 0.05–0.4 | 0.033 / 0.039 / 0.038 / 0.041 | 0.038 ± 0.003 | 0.042 |
| T-FOOD-2 | 0.6–0.78 | 0.710 / 0.683 / 0.677 / 0.689 | 0.690 ± 0.014 | 0.674 |
| T-FOOD-4 | 4–15 | 8.617 / 8.277 / 8.469 / 8.618 | 8.495 ± 0.161 | 8.515 |
| T-FOOD-6 | 2–7 | 4.942 / 5.031 / 4.693 / 4.870 | 4.884 ± 0.143 | 5.147 |
| T-FOOD-10 | 0.08–0.3 | 0.790 / 0.822 / 0.827 / 0.824 | 0.816 ± 0.017 | 0.813 |
| T-IGE-1 | 5–12 | 22.785 / 17.874 / 20.648 / 19.084 | 20.098 ± 2.121 | 13.153 |
| T-IGE-2 | 0.7–0.9 | 0.975 / 1.000 / 1.000 / 0.929 | 0.976 ± 0.034 | 1.000 |
| T-PAT-1 | 0.1–0.5 | 0.247 / 0.201 / 0.208 / 0.278 | 0.233 ± 0.036 | 0.154 |
| T-PAT-6 | 0.4–0.7 | 0.571 / 0.578 / 0.500 / 0.514 | 0.541 ± 0.040 | 0.419 |
| T-PAT-7 | 0.15–0.45 | 0.031 / 0.000 / 0.000 / 0.056 | 0.022 ± 0.027 | 0.000 |
| T-SOC-5 | 0.2–0.7 | 0.543 / 0.542 / 0.554 / 0.534 | 0.543 ± 0.009 | 0.490 |
| T-SOC-9 | 0.08–0.22 | 0.146 / 0.133 / 0.116 / 0.111 | 0.126 ± 0.016 | 0.121 |
S16 T-ACT-2 by sex: {'male': 0.27, 'female': 0.211}; T-ACT-3 by sex: {'male': 0.102, 'female': 0.066}
S16c1 T-ACT-2 by sex: {'male': 0.254, 'female': 0.21}; T-ACT-3 by sex: {'male': 0.105, 'female': 0.068}
S16c2 T-ACT-2 by sex: {'male': 0.252, 'female': 0.211}; T-ACT-3 by sex: {'male': 0.11, 'female': 0.062}
S16c3 T-ACT-2 by sex: {'male': 0.274, 'female': 0.201}; T-ACT-3 by sex: {'male': 0.104, 'female': 0.067}
S17 T-ACT-2 by sex: {'male': 0.249, 'female': 0.188}; T-ACT-3 by sex: {'male': 0.101, 'female': 0.073}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S16: 2.58 ÷ 2.86 = 0.904
  S16c1: 2.60 ÷ 2.93 = 0.888
  S16c2: 2.54 ÷ 2.82 = 0.899
  S16c3: 2.49 ÷ 2.87 = 0.867
  S17: 2.50 ÷ 2.69 = 0.929
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run2/artifacts/validation/e/s17/S17-rhythm5.json: adults out of a nest 2.57% of night; T-RHY-5 0.0279; night deaths 0; deaths 0
```

**Against the predictions.** Prescriptions 49: held. Viability (no deaths) and night (2.57%, 0.0279): held. T-IGE-1 inside
its band 5–12: missed narrowly (20.1 ± 2.1 → 13.2, just above the top). T-PAT-1 lower but in band: held (0.233 → 0.154).
Mothers' and juveniles' reserves no worse: held, better (−0.072 → −0.059; −0.080 → −0.069). Fitted better: held, beyond
noise (z −3.6: 2.88 → 1.08, through T-IGE-1 and T-HUN-2). Held-out inside noise: held (z −0.5; −1.1 without the rare
rows; −0.6 without T-IGE-3 as well). T-SOC-9: in band (0.121; the quick-mode drop did not replicate).

**Verdict: S17 passes the keep rule for a correction and replaces S16 as the best integrated candidate** (49
prescriptions; S16's fitted cost removed: intergroup encounters back near their band, the fitted sum better than S16's
beyond noise; nursing mothers better).

## S18 confirm (registered 4 October 2026 before its run)

**S18 = S17 + E3d's `redecideValue` 2** (an act kept while it stays the animal's best option; a fresh choice when a need
changes level or the light changes phase; `rgMaxAgeH` and `continueBonus` out: 49 → 47 prescriptions). **Reference
group, new:** S17 in confirm mode (S17, 37f04e8) plus three re-draws (S17c1–S17c3, bench-run2). Standard keep rule.
Bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run3 moved to this commit.

**Predictions (against the S17 group; moderate confidence unless stated).** Prescriptions 47 (high); viability and night
safety pass; T-ACT-1 0.42–0.46, T-ACT-2 0.20–0.24, T-ACT-4 in band; T-FOOD-2 0.63–0.68 (in band); T-RNG-4 2.2–2.5;
nursing mothers 0.02–0.04 %/day lower than S17's (low); T-HUN-1 above its band (low); fitted and held-out inside noise.

## S19 confirm (registered 4 October 2026 before its run)

**S19 = S17 + E4k's `huntPursuit` 2** (success and kills from the pursuit, read each tick; `huntSuccessMax`,
`huntSuccessRate` and `huntExtraKillP` out: 49 → 46 prescriptions). Judged against S17's confirm group (S17,
S17c1–S17c3) by the standard keep rule. Bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run4
moved to this commit.

**Predictions (against the S17 group; moderate confidence unless stated).** Prescriptions 46 (high); viability and night
safety pass; T-HUN-1 lower than S17's but inside its band (10–20); T-HUN-2 0.4–0.6 (low); T-HUN-7 1.0, below its band;
juveniles' reserves lower than S17's (low: the quick run's z −4.9 was untested); fitted and held-out inside noise.

### S18 results (bench-run3 0044bfe for S18, bench-run2 37f04e8 for the S17 group, all clean; printed by judge_s17group.py and night.py from the JSON)

One S17 re-draw (S17c1) scored T-IGE-3 at 24.7, so the group's held-out spread is wide; the sums without T-IGE-3 as well
are tight (4.52–4.60) and are the informative test here.

```
bench reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; energy reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; arms: ['S18']
  S17: 37f04e8 dirty 0 prescriptions 49
  S17c1: 37f04e8 dirty 0 prescriptions 49
  S17c2: 37f04e8 dirty 0 prescriptions 49
  S17c3: 37f04e8 dirty 0 prescriptions 49
  S18: 0044bfe dirty 0 prescriptions 47

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.08, 2.20, 2.84, 2.65 (mean 2.19, sd 0.79; used 0.79) | S18.json: 2.55, Δ +0.36, z +0.4 (inside noise)
  held-out           (15 rows) ref 6.34, 29.45, 5.63, 5.83 (mean 11.81, sd 11.76; used 11.76) | S18.json: 7.96, Δ -3.86, z -0.3 (inside noise)
  held-out w/o rare  (13 rows) ref 4.97, 29.26, 5.52, 5.22 (mean 11.24, sd 12.01; used 12.01) | S18.json: 5.90, Δ -5.34, z -0.4 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 0.57±0.58 | S18.json 2.05 (fail)
   T-HUN-4   held-out ref 0.00±0.00 | S18.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S17 4.52 / 4.59 / 4.60 / 4.53 (mean 4.56, sd 0.04; used 0.21); S18 4.62 (z +0.3)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S17 3.70 / 3.50 / 3.59 / 3.54 (mean 3.58, sd 0.09; used 0.21); S18 3.57 (z -0.1)
T-RNG-5 distance by run (S17 group, then arms): [0.81, 1.1, 1.0, 0.99, 1.05]
T-IGE-3 distance by run: [0.45, 24.66, 0.93, 0.69, 1.28]

| Reserves ÷ store, % per day (OLS) | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.039 / -0.038 | -0.038 ± 0.002 | -0.024 (z +6.3) |
| female, other | -0.047 / -0.052 / -0.049 / -0.033 | -0.045 ± 0.008 | -0.078 (z -3.6) |
| female, lactating | -0.059 / -0.072 / -0.062 / -0.059 | -0.063 ± 0.006 | -0.086 (z -3.4) |
| juvenile 5–12 y | -0.069 / -0.082 / -0.100 / -0.068 | -0.080 ± 0.015 | -0.083 (z -0.2) |
| infant 2–5 y | -0.050 / -0.056 / -0.042 / -0.050 | -0.049 ± 0.006 | -0.050 (z -0.2) |
| infant 0.5–2 y | -0.075 / -0.099 / -0.095 / -0.078 | -0.087 ± 0.012 | -0.151 (z -4.8) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.75 / 2.78 | 2.77 ± 0.02 | 2.68 (z -4.8) |
| 1–2 y | 3.45 / 3.44 / 3.46 / 3.46 | 3.45 ± 0.01 | 3.40 (z -4.9) |
| 2–3 y | 3.48 / 3.47 / 3.49 / 3.47 | 3.48 ± 0.01 | 3.47 (z -0.7) |
| 3–4 y | 3.47 / 3.47 / 3.47 / 3.49 | 3.48 ± 0.01 | 3.47 (z -0.4) |

| Milk drunk, kcal per infant-day | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- |
| 0.5–1 y | 277 / 277 / 275 / 278 | 277 ± 1 | 272 (z -3.7) |
| 1–2 y | 281 / 269 / 278 / 279 | 277 ± 5 | 266 (z -1.7) |
| 2–3 y | 250 / 244 / 254 / 244 | 248 ± 5 | 253 (z +0.9) |
| 3–4 y | 235 / 236 / 238 / 252 | 240 ± 8 | 242 (z +0.2) |

| Mothers' balance, kcal/day by infant age | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- |
| 0.5–1 y | -36 / -39 / -45 / -33 | -38 ± 5 | -63 (z -4.4) |
| 1–2 y | -37 / -57 / -33 / -41 | -42 ± 10 | -53 (z -0.9) |
| 2–3 y | -38 / -32 / -30 / -33 | -33 ± 3 | -25 (z +2.5) |
| 3–4 y | -21 / -30 / -27 / -19 | -24 ± 5 | -22 (z +0.3) |

| Ground km / eating min / fruit share | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.69 / 2.77 / 2.84 / 2.80 | 2.78 ± 0.06 | 2.75 (z -0.4) |
| adult male: eatingMin | 254.53 / 253.82 / 259.05 / 256.02 | 255.85 ± 2.32 | 274.51 (z +7.2) |
| adult male: fruitShare | 0.76 / 0.77 / 0.75 / 0.76 | 0.76 ± 0.01 | 0.69 (z -8.9) |
| female, other: groundKm | 2.02 / 2.11 / 2.24 / 2.12 | 2.12 ± 0.09 | 2.20 (z +0.8) |
| female, other: eatingMin | 267.90 / 267.88 / 273.97 / 267.54 | 269.32 ± 3.10 | 332.28 (z +18.1) |
| female, other: fruitShare | 0.52 / 0.52 / 0.51 / 0.52 | 0.52 ± 0.01 | 0.41 (z -12.0) |
| female, lactating: groundKm | 2.50 / 2.62 / 2.53 / 2.50 | 2.54 ± 0.06 | 2.53 (z -0.2) |
| female, lactating: eatingMin | 313.77 / 314.57 / 315.87 / 314.21 | 314.60 ± 0.90 | 356.31 (z +41.3) |
| female, lactating: fruitShare | 0.63 / 0.63 / 0.64 / 0.63 | 0.63 ± 0.00 | 0.54 (z -28.6) |
| juvenile 5–12 y: groundKm | 2.47 / 2.59 / 2.62 / 2.56 | 2.56 ± 0.06 | 2.62 (z +0.8) |
| juvenile 5–12 y: eatingMin | 283.95 / 286.44 / 288.86 / 282.95 | 285.55 ± 2.65 | 296.88 (z +3.8) |
| juvenile 5–12 y: fruitShare | 0.80 / 0.82 / 0.79 / 0.81 | 0.81 ± 0.01 | 0.77 (z -3.1) |

| Row (pooled) | Band | S17 runs | S17 mean ± SD | S18 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.404 / 0.396 / 0.401 / 0.395 | 0.399 ± 0.004 | 0.449 |
| T-ACT-2 | 0.12–0.25 | 0.216 / 0.232 / 0.230 / 0.229 | 0.227 ± 0.007 | 0.231 |
| T-ACT-3 | 0.08–0.18 | 0.085 / 0.086 / 0.084 / 0.086 | 0.085 ± 0.001 | 0.077 |
| T-ACT-4 | 0.3–0.47 | 0.334 / 0.323 / 0.330 / 0.321 | 0.327 ± 0.006 | 0.288 |
| T-PTY-1 | 3–9 | 3.930 / 4.130 / 3.972 / 4.007 | 4.010 ± 0.086 | 4.045 |
| T-RNG-4 | 1.5–3.5 | 2.549 / 2.543 / 2.478 / 2.613 | 2.546 ± 0.055 | 2.479 |
| T-HUN-1 | 5–25 | 24.226 / 30.182 / 20.121 / 32.159 | 26.672 ± 5.517 | 32.194 |
| T-HUN-2 | 0.5–0.8 | 0.347 / 0.246 / 0.191 / 0.243 | 0.257 ± 0.065 | 0.189 |
| T-HUN-3 | 0.05–0.4 | 0.042 / 0.051 / 0.054 / 0.040 | 0.047 ± 0.007 | 0.072 |
| T-FOOD-2 | 0.6–0.78 | 0.674 / 0.683 / 0.698 / 0.685 | 0.685 ± 0.010 | 0.611 |
| T-FOOD-4 | 4–15 | 8.515 / 8.581 / 8.706 / 8.410 | 8.553 ± 0.124 | 8.460 |
| T-FOOD-6 | 2–7 | 5.147 / 4.815 / 4.991 / 4.882 | 4.959 ± 0.145 | 4.990 |
| T-FOOD-10 | 0.08–0.3 | 0.813 / 0.804 / 0.837 / 0.798 | 0.813 ± 0.017 | 0.825 |
| T-HUN-7 | 1.2–2 | 1.353 / 1.375 / 1.308 / 1.294 | 1.332 ± 0.038 | 1.471 |
| T-IGE-1 | 5–12 | 13.153 / 13.964 / 18.955 / 14.387 | 15.115 ± 2.611 | 14.478 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.985 / 0.962 / 0.980 | 0.982 ± 0.016 | 0.981 |
| T-PAT-1 | 0.1–0.5 | 0.154 / 0.177 / 0.146 / 0.146 | 0.156 ± 0.015 | 0.200 |
| T-PAT-6 | 0.4–0.7 | 0.419 / 0.618 / 0.422 / 0.561 | 0.505 ± 0.100 | 0.429 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.038 |
| T-SOC-5 | 0.2–0.7 | 0.490 / 0.600 / 0.643 / 0.542 | 0.569 ± 0.067 | 0.615 |
| T-SOC-9 | 0.08–0.22 | 0.121 / 0.114 / 0.101 / 0.065 | 0.100 ± 0.025 | 0.114 |
S17 T-ACT-2 by sex: {'male': 0.249, 'female': 0.188}; T-ACT-3 by sex: {'male': 0.101, 'female': 0.073}
S17c1 T-ACT-2 by sex: {'male': 0.257, 'female': 0.212}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.067}
S17c2 T-ACT-2 by sex: {'male': 0.249, 'female': 0.214}; T-ACT-3 by sex: {'male': 0.107, 'female': 0.065}
S17c3 T-ACT-2 by sex: {'male': 0.257, 'female': 0.206}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.069}
S18 T-ACT-2 by sex: {'male': 0.252, 'female': 0.214}; T-ACT-3 by sex: {'male': 0.102, 'female': 0.056}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S17: 2.50 ÷ 2.69 = 0.929
  S17c1: 2.62 ÷ 2.77 = 0.948
  S17c2: 2.53 ÷ 2.84 = 0.888
  S17c3: 2.50 ÷ 2.80 = 0.892
  S18: 2.53 ÷ 2.75 = 0.919
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s18/S18-rhythm5.json: adults out of a nest 2.57% of night; T-RHY-5 0.0272; night deaths 1; deaths 1
```

**Against the predictions.** Prescriptions 47: held. Viability (one death, not starvation) and night (2.57%, 0.0272):
held. T-ACT-1 0.42–0.46: held (0.449). T-ACT-2 0.20–0.24: held (0.231). T-ACT-4 in band: **missed** (0.288, below the
band's floor 0.30). T-FOOD-2 0.63–0.68: missed low (0.611, inside its band). T-RNG-4 2.2–2.5: held (2.48). Nursing
mothers 0.02–0.04 %/day lower: held (−0.063 → −0.086). T-HUN-1 above its band: held (32.2). Fitted and held-out inside
noise: held (z +0.4; −0.3; −0.4; +0.3 without T-IGE-3 as well). Not predicted: other females (−0.045 → −0.078) and
infants 0.5–2 y (−0.087 → −0.151) lower; males better (−0.038 → −0.024).

**Verdict: S18 passes the keep rule** (47 prescriptions: no re-decision clock, no fixed persistence bonus). Costs: rest
below its band, fruit share near its floor, nursing mothers', other females' and young infants' reserves lower (more
feeding time with a lower fruit share). Judged with S19 for the next stack.

### S19 results (bench-run4 ef13aa8 for S19, bench-run2 37f04e8 for the S17 group, all clean; printed by judge_s17group.py and night.py from the JSON)

```
bench reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; energy reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; arms: ['S19']
  S17: 37f04e8 dirty 0 prescriptions 49
  S17c1: 37f04e8 dirty 0 prescriptions 49
  S17c2: 37f04e8 dirty 0 prescriptions 49
  S17c3: 37f04e8 dirty 0 prescriptions 49
  S19: ef13aa8 dirty 0 prescriptions 46

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.08, 2.20, 2.84, 2.65 (mean 2.19, sd 0.79; used 0.79) | S19.json: 1.58, Δ -0.61, z -0.7 (inside noise)
  held-out           (15 rows) ref 6.34, 29.45, 5.63, 5.83 (mean 11.81, sd 11.76; used 11.76) | S19.json: 6.01, Δ -5.80, z -0.4 (inside noise)
  held-out w/o rare  (13 rows) ref 4.97, 29.26, 5.52, 5.22 (mean 11.24, sd 12.01; used 12.01) | S19.json: 6.01, Δ -5.23, z -0.4 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 0.57±0.58 | S19.json 0.00 (pass)
   T-HUN-4   held-out ref 0.00±0.00 | S19.json 0.00 (inconclusive)
   T-HUN-7   fitted   ref 0.00±0.00 | S19.json 0.25 (fail)
   T-HUN-8   held-out ref 0.01±0.02 | S19.json 0.33 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S17 4.52 / 4.59 / 4.60 / 4.53 (mean 4.56, sd 0.04; used 0.21); S19 4.98 (z +1.8)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S17 3.70 / 3.50 / 3.59 / 3.54 (mean 3.58, sd 0.09; used 0.21); S19 4.02 (z +1.9)
T-RNG-5 distance by run (S17 group, then arms): [0.81, 1.1, 1.0, 0.99, 0.96]
T-IGE-3 distance by run: [0.45, 24.66, 0.93, 0.69, 1.03]

| Reserves ÷ store, % per day (OLS) | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.039 / -0.038 | -0.038 ± 0.002 | -0.044 (z -3.2) |
| female, other | -0.047 / -0.052 / -0.049 / -0.033 | -0.045 ± 0.008 | -0.049 (z -0.4) |
| female, lactating | -0.059 / -0.072 / -0.062 / -0.059 | -0.063 ± 0.006 | -0.084 (z -3.2) |
| juvenile 5–12 y | -0.069 / -0.082 / -0.100 / -0.068 | -0.080 ± 0.015 | -0.083 (z -0.2) |
| infant 2–5 y | -0.050 / -0.056 / -0.042 / -0.050 | -0.049 ± 0.006 | -0.065 (z -2.4) |
| infant 0.5–2 y | -0.075 / -0.099 / -0.095 / -0.078 | -0.087 ± 0.012 | -0.113 (z -2.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.75 / 2.78 | 2.77 ± 0.02 | 2.77 (z -0.1) |
| 1–2 y | 3.45 / 3.44 / 3.46 / 3.46 | 3.45 ± 0.01 | 3.44 (z -1.2) |
| 2–3 y | 3.48 / 3.47 / 3.49 / 3.47 | 3.48 ± 0.01 | 3.48 (z +0.2) |
| 3–4 y | 3.47 / 3.47 / 3.47 / 3.49 | 3.48 ± 0.01 | 3.47 (z -0.4) |

| Milk drunk, kcal per infant-day | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- |
| 0.5–1 y | 277 / 277 / 275 / 278 | 277 ± 1 | 276 (z -0.4) |
| 1–2 y | 281 / 269 / 278 / 279 | 277 ± 5 | 271 (z -0.9) |
| 2–3 y | 250 / 244 / 254 / 244 | 248 ± 5 | 249 (z +0.2) |
| 3–4 y | 235 / 236 / 238 / 252 | 240 ± 8 | 234 (z -0.7) |

| Mothers' balance, kcal/day by infant age | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- |
| 0.5–1 y | -36 / -39 / -45 / -33 | -38 ± 5 | -44 (z -1.1) |
| 1–2 y | -37 / -57 / -33 / -41 | -42 ± 10 | -54 (z -1.0) |
| 2–3 y | -38 / -32 / -30 / -33 | -33 ± 3 | -39 (z -1.7) |
| 3–4 y | -21 / -30 / -27 / -19 | -24 ± 5 | -38 (z -2.3) |

| Ground km / eating min / fruit share | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.69 / 2.77 / 2.84 / 2.80 | 2.78 ± 0.06 | 2.75 (z -0.3) |
| adult male: eatingMin | 254.53 / 253.82 / 259.05 / 256.02 | 255.85 ± 2.32 | 255.29 (z -0.2) |
| adult male: fruitShare | 0.76 / 0.77 / 0.75 / 0.76 | 0.76 ± 0.01 | 0.76 (z -0.1) |
| female, other: groundKm | 2.02 / 2.11 / 2.24 / 2.12 | 2.12 ± 0.09 | 2.07 (z -0.5) |
| female, other: eatingMin | 267.90 / 267.88 / 273.97 / 267.54 | 269.32 ± 3.10 | 265.05 (z -1.2) |
| female, other: fruitShare | 0.52 / 0.52 / 0.51 / 0.52 | 0.52 ± 0.01 | 0.53 (z +1.5) |
| female, lactating: groundKm | 2.50 / 2.62 / 2.53 / 2.50 | 2.54 ± 0.06 | 2.57 (z +0.5) |
| female, lactating: eatingMin | 313.77 / 314.57 / 315.87 / 314.21 | 314.60 ± 0.90 | 316.17 (z +1.5) |
| female, lactating: fruitShare | 0.63 / 0.63 / 0.64 / 0.63 | 0.63 ± 0.00 | 0.62 (z -4.4) |
| juvenile 5–12 y: groundKm | 2.47 / 2.59 / 2.62 / 2.56 | 2.56 ± 0.06 | 2.54 (z -0.2) |
| juvenile 5–12 y: eatingMin | 283.95 / 286.44 / 288.86 / 282.95 | 285.55 ± 2.65 | 284.00 (z -0.5) |
| juvenile 5–12 y: fruitShare | 0.80 / 0.82 / 0.79 / 0.81 | 0.81 ± 0.01 | 0.81 (z +0.8) |

| Row (pooled) | Band | S17 runs | S17 mean ± SD | S19 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.404 / 0.396 / 0.401 / 0.395 | 0.399 ± 0.004 | 0.392 |
| T-ACT-2 | 0.12–0.25 | 0.216 / 0.232 / 0.230 / 0.229 | 0.227 ± 0.007 | 0.230 |
| T-ACT-3 | 0.08–0.18 | 0.085 / 0.086 / 0.084 / 0.086 | 0.085 ± 0.001 | 0.089 |
| T-ACT-4 | 0.3–0.47 | 0.334 / 0.323 / 0.330 / 0.321 | 0.327 ± 0.006 | 0.332 |
| T-PTY-1 | 3–9 | 3.930 / 4.130 / 3.972 / 4.007 | 4.010 ± 0.086 | 4.151 |
| T-RNG-4 | 1.5–3.5 | 2.549 / 2.543 / 2.478 / 2.613 | 2.546 ± 0.055 | 2.541 |
| T-HUN-1 | 5–25 | 24.226 / 30.182 / 20.121 / 32.159 | 26.672 ± 5.517 | 10.050 |
| T-HUN-2 | 0.5–0.8 | 0.347 / 0.246 / 0.191 / 0.243 | 0.257 ± 0.065 | 0.318 |
| T-HUN-3 | 0.05–0.4 | 0.042 / 0.051 / 0.054 / 0.040 | 0.047 ± 0.007 | 0.031 |
| T-FOOD-2 | 0.6–0.78 | 0.674 / 0.683 / 0.698 / 0.685 | 0.685 ± 0.010 | 0.694 |
| T-FOOD-4 | 4–15 | 8.515 / 8.581 / 8.706 / 8.410 | 8.553 ± 0.124 | 8.632 |
| T-FOOD-6 | 2–7 | 5.147 / 4.815 / 4.991 / 4.882 | 4.959 ± 0.145 | 4.761 |
| T-FOOD-10 | 0.08–0.3 | 0.813 / 0.804 / 0.837 / 0.798 | 0.813 ± 0.017 | 0.805 |
| T-HUN-7 | 1.2–2 | 1.353 / 1.375 / 1.308 / 1.294 | 1.332 ± 0.038 | 1.000 |
| T-IGE-1 | 5–12 | 13.153 / 13.964 / 18.955 / 14.387 | 15.115 ± 2.611 | 7.144 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.985 / 0.962 / 0.980 | 0.982 ± 0.016 | 1.000 |
| T-PAT-1 | 0.1–0.5 | 0.154 / 0.177 / 0.146 / 0.146 | 0.156 ± 0.015 | 0.178 |
| T-PAT-6 | 0.4–0.7 | 0.419 / 0.618 / 0.422 / 0.561 | 0.505 ± 0.100 | 0.304 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.000 |
| T-SOC-5 | 0.2–0.7 | 0.490 / 0.600 / 0.643 / 0.542 | 0.569 ± 0.067 | 0.521 |
| T-SOC-9 | 0.08–0.22 | 0.121 / 0.114 / 0.101 / 0.065 | 0.100 ± 0.025 | 0.107 |
S17 T-ACT-2 by sex: {'male': 0.249, 'female': 0.188}; T-ACT-3 by sex: {'male': 0.101, 'female': 0.073}
S17c1 T-ACT-2 by sex: {'male': 0.257, 'female': 0.212}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.067}
S17c2 T-ACT-2 by sex: {'male': 0.249, 'female': 0.214}; T-ACT-3 by sex: {'male': 0.107, 'female': 0.065}
S17c3 T-ACT-2 by sex: {'male': 0.257, 'female': 0.206}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.069}
S19 T-ACT-2 by sex: {'male': 0.254, 'female': 0.21}; T-ACT-3 by sex: {'male': 0.112, 'female': 0.069}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S17: 2.50 ÷ 2.69 = 0.929
  S17c1: 2.62 ÷ 2.77 = 0.948
  S17c2: 2.53 ÷ 2.84 = 0.888
  S17c3: 2.50 ÷ 2.80 = 0.892
  S19: 2.57 ÷ 2.75 = 0.933
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s19/S19-rhythm5.json: adults out of a nest 2.58% of night; T-RHY-5 0.0276; night deaths 0; deaths 1
```

**Against the predictions.** Prescriptions 46: held. Viability (one death, not starvation) and night (2.58%, 0.0276):
held. T-HUN-1 lower but in band (10–20): held (26.7 ± 5.5 → 10.1). T-HUN-2 0.4–0.6: missed (0.318, still below its band).
T-HUN-7 1.0, below band: held. Juveniles lower: missed (−0.080 → −0.083, within spread); instead nursing mothers and
adult males lower (−0.063 → −0.084; −0.038 → −0.044) and young infants lower (−0.087 → −0.113). Fitted and held-out inside
noise: held (z −0.7; −0.4; −0.4; +1.8 without T-IGE-3 as well). Not predicted: intergroup encounters into their band
(T-IGE-1 15.1 → 7.1).

**Verdict: S19 passes the keep rule** (46 prescriptions: hunts succeed from the pursuit, without a fitted curve or dice).
Costs: success still below the field's band, one kill per success, adults' and young infants' reserves a little lower.

## S20 confirm (registered 4 October 2026 before its run)

**S20 = S17 + `redecideValue` 2 + `huntPursuit` 2** (S18 and S19 together: 49 → 44 prescriptions). Judged against S17's
confirm group by the standard keep rule; bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run4
(ef13aa8 carries both switches; this commit changes only this file).

**Predictions (against the S17 group; moderate confidence unless stated).** Prescriptions 44 (high); viability and night
safety pass (moderate: S18 and S19 each lowered nursing mothers' and young infants' reserves); T-HUN-1 in its band, lower
than S17's; T-ACT-4 near or below its floor (S18); nursing mothers −0.08 to −0.12 and infants 0.5–2 y −0.11 to −0.18 %/day
(low); fitted and held-out inside noise.

### S20 results (bench-run4 ef13aa8, clean; judged against the four S17 runs; printed by judge_s17group.py and night.py from the JSON)

```
bench reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; energy reference runs: ['S17', 'S17c1', 'S17c2', 'S17c3']; arms: ['S20']
  S17: 37f04e8 dirty 0 prescriptions 49
  S17c1: 37f04e8 dirty 0 prescriptions 49
  S17c2: 37f04e8 dirty 0 prescriptions 49
  S17c3: 37f04e8 dirty 0 prescriptions 49
  S20: ef13aa8 dirty 0 prescriptions 44

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.08, 2.20, 2.84, 2.65 (mean 2.19, sd 0.79; used 0.79) | S20.json: 1.88, Δ -0.31, z -0.4 (inside noise)
  held-out           (15 rows) ref 6.34, 29.45, 5.63, 5.83 (mean 11.81, sd 11.76; used 11.76) | S20.json: 30.64, Δ +18.83, z +1.4 (inside noise)
  held-out w/o rare  (13 rows) ref 4.97, 29.26, 5.52, 5.22 (mean 11.24, sd 12.01; used 12.01) | S20.json: 29.10, Δ +17.86, z +1.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-4   fitted   ref 0.00±0.00 | S20.json 0.28 (inconclusive)
   T-BRD-1   held-out ref 0.57±0.58 | S20.json 1.54 (fail)
   T-HUN-4   held-out ref 0.00±0.00 | S20.json 0.00 (inconclusive)
   T-HUN-7   fitted   ref 0.00±0.00 | S20.json 0.25 (fail)
   T-HUN-8   held-out ref 0.01±0.02 | S20.json 0.33 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S17 4.52 / 4.59 / 4.60 / 4.53 (mean 4.56, sd 0.04; used 0.21); S20 5.27 (z +3.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S17 3.70 / 3.50 / 3.59 / 3.54 (mean 3.58, sd 0.09; used 0.21); S20 4.06 (z +2.0)
T-RNG-5 distance by run (S17 group, then arms): [0.81, 1.1, 1.0, 0.99, 1.21]
T-IGE-3 distance by run: [0.45, 24.66, 0.93, 0.69, 23.83]

| Reserves ÷ store, % per day (OLS) | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.039 / -0.038 | -0.038 ± 0.002 | -0.048 (z -5.0) |
| female, other | -0.047 / -0.052 / -0.049 / -0.033 | -0.045 ± 0.008 | -0.062 (z -1.8) |
| female, lactating | -0.059 / -0.072 / -0.062 / -0.059 | -0.063 ± 0.006 | -0.078 (z -2.2) |
| juvenile 5–12 y | -0.069 / -0.082 / -0.100 / -0.068 | -0.080 ± 0.015 | -0.125 (z -2.8) |
| infant 2–5 y | -0.050 / -0.056 / -0.042 / -0.050 | -0.049 ± 0.006 | -0.060 (z -1.7) |
| infant 0.5–2 y | -0.075 / -0.099 / -0.095 / -0.078 | -0.087 ± 0.012 | -0.123 (z -2.7) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.75 / 2.78 | 2.77 ± 0.02 | 2.67 (z -5.4) |
| 1–2 y | 3.45 / 3.44 / 3.46 / 3.46 | 3.45 ± 0.01 | 3.42 (z -3.0) |
| 2–3 y | 3.48 / 3.47 / 3.49 / 3.47 | 3.48 ± 0.01 | 3.45 (z -2.6) |
| 3–4 y | 3.47 / 3.47 / 3.47 / 3.49 | 3.48 ± 0.01 | 3.44 (z -3.1) |

| Milk drunk, kcal per infant-day | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- |
| 0.5–1 y | 277 / 277 / 275 / 278 | 277 ± 1 | 274 (z -2.2) |
| 1–2 y | 281 / 269 / 278 / 279 | 277 ± 5 | 270 (z -1.2) |
| 2–3 y | 250 / 244 / 254 / 244 | 248 ± 5 | 240 (z -1.4) |
| 3–4 y | 235 / 236 / 238 / 252 | 240 ± 8 | 240 (z +0.0) |

| Mothers' balance, kcal/day by infant age | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- |
| 0.5–1 y | -36 / -39 / -45 / -33 | -38 ± 5 | -56 (z -3.1) |
| 1–2 y | -37 / -57 / -33 / -41 | -42 ± 10 | -46 (z -0.4) |
| 2–3 y | -38 / -32 / -30 / -33 | -33 ± 3 | -35 (z -0.4) |
| 3–4 y | -21 / -30 / -27 / -19 | -24 ± 5 | -26 (z -0.4) |

| Ground km / eating min / fruit share | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.69 / 2.77 / 2.84 / 2.80 | 2.78 ± 0.06 | 2.87 (z +1.4) |
| adult male: eatingMin | 254.53 / 253.82 / 259.05 / 256.02 | 255.85 ± 2.32 | 272.46 (z +6.4) |
| adult male: fruitShare | 0.76 / 0.77 / 0.75 / 0.76 | 0.76 ± 0.01 | 0.70 (z -8.1) |
| female, other: groundKm | 2.02 / 2.11 / 2.24 / 2.12 | 2.12 ± 0.09 | 2.25 (z +1.3) |
| female, other: eatingMin | 267.90 / 267.88 / 273.97 / 267.54 | 269.32 ± 3.10 | 343.59 (z +21.4) |
| female, other: fruitShare | 0.52 / 0.52 / 0.51 / 0.52 | 0.52 ± 0.01 | 0.39 (z -14.3) |
| female, lactating: groundKm | 2.50 / 2.62 / 2.53 / 2.50 | 2.54 ± 0.06 | 2.66 (z +1.9) |
| female, lactating: eatingMin | 313.77 / 314.57 / 315.87 / 314.21 | 314.60 ± 0.90 | 352.57 (z +37.6) |
| female, lactating: fruitShare | 0.63 / 0.63 / 0.64 / 0.63 | 0.63 ± 0.00 | 0.55 (z -25.4) |
| juvenile 5–12 y: groundKm | 2.47 / 2.59 / 2.62 / 2.56 | 2.56 ± 0.06 | 2.73 (z +2.4) |
| juvenile 5–12 y: eatingMin | 283.95 / 286.44 / 288.86 / 282.95 | 285.55 ± 2.65 | 303.11 (z +5.9) |
| juvenile 5–12 y: fruitShare | 0.80 / 0.82 / 0.79 / 0.81 | 0.81 ± 0.01 | 0.73 (z -6.6) |

| Row (pooled) | Band | S17 runs | S17 mean ± SD | S20 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.404 / 0.396 / 0.401 / 0.395 | 0.399 ± 0.004 | 0.447 |
| T-ACT-2 | 0.12–0.25 | 0.216 / 0.232 / 0.230 / 0.229 | 0.227 ± 0.007 | 0.235 |
| T-ACT-3 | 0.08–0.18 | 0.085 / 0.086 / 0.084 / 0.086 | 0.085 ± 0.001 | 0.079 |
| T-ACT-4 | 0.3–0.47 | 0.334 / 0.323 / 0.330 / 0.321 | 0.327 ± 0.006 | 0.252 |
| T-PTY-1 | 3–9 | 3.930 / 4.130 / 3.972 / 4.007 | 4.010 ± 0.086 | 4.205 |
| T-RNG-4 | 1.5–3.5 | 2.549 / 2.543 / 2.478 / 2.613 | 2.546 ± 0.055 | 2.562 |
| T-HUN-1 | 5–25 | 24.226 / 30.182 / 20.121 / 32.159 | 26.672 ± 5.517 | 12.073 |
| T-HUN-2 | 0.5–0.8 | 0.347 / 0.246 / 0.191 / 0.243 | 0.257 ± 0.065 | 0.346 |
| T-HUN-3 | 0.05–0.4 | 0.042 / 0.051 / 0.054 / 0.040 | 0.047 ± 0.007 | 0.023 |
| T-FOOD-2 | 0.6–0.78 | 0.674 / 0.683 / 0.698 / 0.685 | 0.685 ± 0.010 | 0.630 |
| T-FOOD-4 | 4–15 | 8.515 / 8.581 / 8.706 / 8.410 | 8.553 ± 0.124 | 8.867 |
| T-FOOD-6 | 2–7 | 5.147 / 4.815 / 4.991 / 4.882 | 4.959 ± 0.145 | 4.955 |
| T-FOOD-10 | 0.08–0.3 | 0.813 / 0.804 / 0.837 / 0.798 | 0.813 ± 0.017 | 0.844 |
| T-HUN-7 | 1.2–2 | 1.353 / 1.375 / 1.308 / 1.294 | 1.332 ± 0.038 | 1.000 |
| T-IGE-1 | 5–12 | 13.153 / 13.964 / 18.955 / 14.387 | 15.115 ± 2.611 | 10.349 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.985 / 0.962 / 0.980 | 0.982 ± 0.016 | 1.000 |
| T-PAT-1 | 0.1–0.5 | 0.154 / 0.177 / 0.146 / 0.146 | 0.156 ± 0.015 | 0.147 |
| T-PAT-6 | 0.4–0.7 | 0.419 / 0.618 / 0.422 / 0.561 | 0.505 ± 0.100 | 0.440 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.000 |
| T-SOC-5 | 0.2–0.7 | 0.490 / 0.600 / 0.643 / 0.542 | 0.569 ± 0.067 | 0.530 |
| T-SOC-9 | 0.08–0.22 | 0.121 / 0.114 / 0.101 / 0.065 | 0.100 ± 0.025 | 0.123 |
S17 T-ACT-2 by sex: {'male': 0.249, 'female': 0.188}; T-ACT-3 by sex: {'male': 0.101, 'female': 0.073}
S17c1 T-ACT-2 by sex: {'male': 0.257, 'female': 0.212}; T-ACT-3 by sex: {'male': 0.109, 'female': 0.067}
S17c2 T-ACT-2 by sex: {'male': 0.249, 'female': 0.214}; T-ACT-3 by sex: {'male': 0.107, 'female': 0.065}
S17c3 T-ACT-2 by sex: {'male': 0.257, 'female': 0.206}; T-ACT-3 by sex: {'male': 0.106, 'female': 0.069}
S20 T-ACT-2 by sex: {'male': 0.262, 'female': 0.214}; T-ACT-3 by sex: {'male': 0.108, 'female': 0.055}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S17: 2.50 ÷ 2.69 = 0.929
  S17c1: 2.62 ÷ 2.77 = 0.948
  S17c2: 2.53 ÷ 2.84 = 0.888
  S17c3: 2.50 ÷ 2.80 = 0.892
  S20: 2.66 ÷ 2.87 = 0.926
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s20/S20-rhythm5.json: adults out of a nest 2.57% of night; T-RHY-5 0.0269; night deaths 0; deaths 0
Held-out rows (without T-HUN-4, T-BRD-1, T-IGE-3) that moved most, distance S17 mean ± SD → S18 / S19 / S20:
  T-HUN-8   0.01 ± 0.02 → 0 / 0.33 / 0.33   (value 1.0 against 0.8–0.95: one kill per success under huntPursuit)
  T-RNG-5   0.98 ± 0.12 → 1.05 / 0.96 / 1.21
  T-FOOD-10 2.33 ± 0.08 → 2.39 / 2.29 / 2.47
  T-IGE-2   0.41 ± 0.08 → 0.40 / 0.50 / 0.50
```

**Reading.** The registered sums pass (held-out z +1.4; +1.3 without the rare rows), but only because one S17 re-draw
(S17c1) scored T-IGE-3 at 24.7, which inflates the group's held-out SD to 11.8 and makes the test unable to detect much;
S20 itself scored T-IGE-3 at 23.8. On the sum without T-IGE-3 as well, where the group is tight (4.52–4.60), **S20 is worse
beyond noise (z +3.0)**: T-HUN-8 (huntPursuit's single kill), T-RNG-5 and T-FOOD-10 (both rows with known sampling or
scoring problems) and T-IGE-2. S18 and S19 alone were inside noise on this sum (z +0.3, +1.8). Energy: adult males
(−0.038 → −0.048), juveniles (−0.080 → −0.125) and infants 0.5–2 y (−0.087 → −0.123) lower; rest well below its band
(T-ACT-4 0.252). Viable (no deaths), night safe (2.57%, 0.0269), 44 prescriptions.

**Verdict: S20 is not adopted.** It passes the registered test only through an insensitive reference spread, fails the
informative sum, and stacks S18's and S19's energy costs. **The best integrated candidate is S19** (46 prescriptions; it
passed every sum, with and without T-IGE-3; hunting and intergroup encounters in band). S18 passes alone but does not
combine with S19 yet: its costs (rest below band, females' and infants' reserves) need their own stage first.

**Protocol amendment (integrator, 4 October, before any further confirm is registered; e-noise.md amendment 3).** T-IGE-3
joins T-HUN-4 and T-BRD-1 as a rare-event row: decisive held-out sums are computed with and without all three. Reason:
on few events it scores 20–30 in about one run in six (S5c2 21.6; S8c1 30.5; S8c3 22.3; S17c1 24.7; S20 23.8), which
makes a reference group's spread uninformative.

## S21 confirm (registered 4 October 2026 before its run)

**S21 = S19 + E3e's `choiceBelief` 2** (no fitted temperature: unseen crops drawn from the animal's belief, the rules'
jitter as evaluation noise, awake nest-mates holding each other in the dark; `rgTemperature` out: 46 → 45). Judged
against S19's confirm group (S19, ef13aa8, plus re-draws S19c1–S19c3 by `rgTemperature`, bench-run4) by the standard keep
rule with amendment 3's rare rows (T-HUN-4, T-BRD-1, T-IGE-3). Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days, from bench-run2 moved to this commit. From S21 on, replicate references are re-drawn with `rngSalt`.

**Predictions (against the S19 group; moderate confidence unless stated).** Prescriptions 45 (high); viability and night
safety pass (adults out of a nest ≤ 3.3%); T-ACT-2 lower (0.14–0.18) and T-ACT-4 higher (0.36–0.42); T-FOOD-2 higher
(0.72–0.79); T-RNG-4 lower (1.4–1.9; low); nursing mothers' and infants' reserves better than S19's; fitted and held-out
inside noise or better.

### S21 results (bench-run2 e7d8d8e for S21, bench-run4 ef13aa8 for the S19 group, all clean; printed by judge_s19group.py and night.py from the JSON; rare rows per amendment 3)

```
bench reference runs: ['S19', 'S19c1', 'S19c2', 'S19c3']; energy reference runs: ['S19', 'S19c1', 'S19c2', 'S19c3']; arms: ['S21']
  S19: ef13aa8 dirty 0 prescriptions 46
  S19c1: ef13aa8 dirty 0 prescriptions 46
  S19c2: ef13aa8 dirty 0 prescriptions 46
  S19c3: ef13aa8 dirty 0 prescriptions 46
  S21: e7d8d8e dirty 0 prescriptions 45

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.58, 0.87, 1.57, 1.84 (mean 1.47, sd 0.42; used 0.42) | S21.json: 1.16, Δ -0.30, z -0.7 (inside noise)
  held-out           (15 rows) ref 6.01, 8.57, 6.39, 8.10 (mean 7.27, sd 1.26; used 1.45) | S21.json: 7.39, Δ +0.13, z +0.1 (inside noise)
  held-out w/o rare  (12 rows) ref 4.98, 4.67, 4.96, 4.68 (mean 4.82, sd 0.17; used 0.21) | S21.json: 3.66, Δ -1.16, z -5.0 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 0.40±0.79 | S21.json 0.36 (fail)
   T-FOOD-10 held-out ref 2.33±0.03 | S21.json 1.25 (fail)
   T-HUN-2   fitted   ref 0.41±0.20 | S21.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 0.19±0.29 | S21.json 0.44 (inconclusive)
   T-HUN-8   held-out ref 0.33±0.00 | S21.json 0.00 (inconclusive)
   T-IGE-2   held-out ref 0.42±0.06 | S21.json 0.20 (inconclusive)
   T-IGE-3   held-out ref 1.86±1.28 | S21.json 2.94 (fail)
   T-RNG-5   held-out ref 0.83±0.17 | S21.json 1.46 (fail)
   T-SOC-3   held-out ref 0.18±0.06 | S21.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S19 4.98 / 4.67 / 4.96 / 4.68 (mean 4.82, sd 0.17; used 0.21); S21 3.66 (z -5.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S19 4.02 / 4.02 / 3.97 / 3.94 (mean 3.99, sd 0.04; used 0.21); S21 2.19 (z -7.6)
T-RNG-5 distance by run (S19 group, then arms): [0.96, 0.65, 0.98, 0.74, 1.46]
T-IGE-3 distance by run: [1.03, 3.77, 1.43, 1.22, 2.94]

| Reserves ÷ store, % per day (OLS) | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- |
| adult male | -0.044 / -0.042 / -0.044 / -0.041 | -0.043 ± 0.002 | -0.035 (z +4.1) |
| female, other | -0.049 / -0.047 / -0.043 / -0.027 | -0.041 ± 0.010 | -0.047 (z -0.5) |
| female, lactating | -0.084 / -0.076 / -0.061 / -0.066 | -0.072 ± 0.010 | -0.066 (z +0.5) |
| juvenile 5–12 y | -0.083 / -0.079 / -0.068 / -0.087 | -0.079 ± 0.008 | -0.081 (z -0.2) |
| infant 2–5 y | -0.065 / -0.055 / -0.038 / -0.054 | -0.053 ± 0.011 | -0.049 (z +0.4) |
| infant 0.5–2 y | -0.113 / -0.109 / -0.097 / -0.092 | -0.103 ± 0.010 | -0.092 (z +1.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.77 / 2.77 / 2.77 / 2.79 | 2.77 ± 0.01 | 2.79 (z +1.3) |
| 1–2 y | 3.44 / 3.45 / 3.47 / 3.44 | 3.45 ± 0.01 | 3.51 (z +3.8) |
| 2–3 y | 3.48 / 3.48 / 3.49 / 3.49 | 3.49 ± 0.01 | 3.46 (z -3.9) |
| 3–4 y | 3.47 / 3.47 / 3.48 / 3.48 | 3.48 ± 0.01 | 3.49 (z +2.3) |

| Milk drunk, kcal per infant-day | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- |
| 0.5–1 y | 276 / 276 / 277 / 279 | 277 ± 1 | 276 (z -0.3) |
| 1–2 y | 271 / 274 / 279 / 273 | 274 ± 4 | 284 (z +2.4) |
| 2–3 y | 249 / 248 / 249 / 254 | 250 ± 3 | 248 (z -0.4) |
| 3–4 y | 234 / 234 / 245 / 238 | 238 ± 5 | 258 (z +3.4) |

| Mothers' balance, kcal/day by infant age | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- |
| 0.5–1 y | -44 / -47 / -32 / -33 | -39 ± 8 | -39 (z +0.0) |
| 1–2 y | -54 / -50 / -51 / -37 | -48 ± 8 | -37 (z +1.3) |
| 2–3 y | -39 / -33 / -27 / -29 | -32 ± 5 | -38 (z -1.0) |
| 3–4 y | -38 / -24 / -21 / -23 | -27 ± 8 | -30 (z -0.4) |

| Ground km / eating min / fruit share | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.75 / 2.80 / 2.75 / 2.79 | 2.77 ± 0.03 | 2.19 (z -19.3) |
| adult male: eatingMin | 255.29 / 255.84 / 253.88 / 255.01 | 255.00 ± 0.82 | 230.78 (z -26.3) |
| adult male: fruitShare | 0.76 / 0.76 / 0.77 / 0.77 | 0.76 ± 0.01 | 0.86 (z +12.8) |
| female, other: groundKm | 2.07 / 2.08 / 2.11 / 2.15 | 2.10 ± 0.03 | 1.67 (z -11.3) |
| female, other: eatingMin | 265.05 / 268.91 / 270.55 / 269.34 | 268.46 ± 2.38 | 235.94 (z -12.2) |
| female, other: fruitShare | 0.53 / 0.52 / 0.52 / 0.53 | 0.52 ± 0.01 | 0.61 (z +13.0) |
| female, lactating: groundKm | 2.57 / 2.56 / 2.51 / 2.54 | 2.55 ± 0.03 | 2.07 (z -14.7) |
| female, lactating: eatingMin | 316.17 / 313.97 / 314.36 / 315.03 | 314.88 ± 0.96 | 304.37 (z -9.8) |
| female, lactating: fruitShare | 0.62 / 0.63 / 0.63 / 0.64 | 0.63 ± 0.01 | 0.63 (z +0.5) |
| juvenile 5–12 y: groundKm | 2.54 / 2.51 / 2.54 / 2.56 | 2.54 ± 0.02 | 2.18 (z -15.1) |
| juvenile 5–12 y: eatingMin | 284.00 / 289.07 / 281.17 / 284.59 | 284.70 ± 3.27 | 274.37 (z -2.8) |
| juvenile 5–12 y: fruitShare | 0.81 / 0.81 / 0.82 / 0.80 | 0.81 ± 0.01 | 0.83 (z +2.0) |

| Row (pooled) | Band | S19 runs | S19 mean ± SD | S21 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.392 / 0.394 / 0.401 / 0.395 | 0.395 ± 0.004 | 0.376 |
| T-ACT-2 | 0.12–0.25 | 0.230 / 0.237 / 0.226 / 0.226 | 0.230 ± 0.005 | 0.184 |
| T-ACT-3 | 0.08–0.18 | 0.089 / 0.085 / 0.083 / 0.084 | 0.085 ± 0.003 | 0.090 |
| T-ACT-4 | 0.3–0.47 | 0.332 / 0.307 / 0.321 / 0.314 | 0.318 ± 0.011 | 0.402 |
| T-PTY-1 | 3–9 | 4.151 / 4.140 / 3.991 / 3.982 | 4.066 ± 0.092 | 4.009 |
| T-RNG-4 | 1.5–3.5 | 2.541 / 2.644 / 2.553 / 2.517 | 2.564 ± 0.056 | 1.790 |
| T-HUN-1 | 5–25 | 10.050 / 10.463 / 5.237 / 9.246 | 8.749 ± 2.395 | 5.226 |
| T-HUN-2 | 0.5–0.8 | 0.318 / 0.440 / 0.417 / 0.333 | 0.377 ± 0.060 | 0.500 |
| T-HUN-3 | 0.05–0.4 | 0.031 / 0.027 / 0.018 / 0.017 | 0.023 ± 0.007 | 0.014 |
| T-FOOD-2 | 0.6–0.78 | 0.694 / 0.678 / 0.683 / 0.695 | 0.688 ± 0.008 | 0.759 |
| T-FOOD-4 | 4–15 | 8.632 / 8.582 / 8.338 / 8.489 | 8.510 ± 0.129 | 8.143 |
| T-FOOD-6 | 2–7 | 4.761 / 4.986 / 4.936 / 5.240 | 4.981 ± 0.198 | 4.763 |
| T-FOOD-10 | 0.08–0.3 | 0.805 / 0.814 / 0.813 / 0.822 | 0.814 ± 0.007 | 0.576 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 7.144 / 11.584 / 14.294 / 15.421 | 12.111 ± 3.682 | 9.361 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.981 / 0.984 / 0.974 | 0.985 ± 0.011 | 0.939 |
| T-PAT-1 | 0.1–0.5 | 0.178 / 0.170 / 0.178 / 0.177 | 0.176 ± 0.004 | 0.093 |
| T-PAT-6 | 0.4–0.7 | 0.304 / 0.535 / 0.592 / 0.426 | 0.464 ± 0.127 | 0.462 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.043 / 0.000 | 0.011 ± 0.022 | 0.000 |
| T-SOC-5 | 0.2–0.7 | 0.521 / 0.615 / 0.589 / 0.533 | 0.565 ± 0.045 | 0.562 |
| T-SOC-9 | 0.08–0.22 | 0.107 / 0.129 / 0.105 / 0.112 | 0.113 ± 0.011 | 0.103 |
S19 T-ACT-2 by sex: {'male': 0.254, 'female': 0.21}; T-ACT-3 by sex: {'male': 0.112, 'female': 0.069}
S19c1 T-ACT-2 by sex: {'male': 0.262, 'female': 0.215}; T-ACT-3 by sex: {'male': 0.108, 'female': 0.067}
S19c2 T-ACT-2 by sex: {'male': 0.249, 'female': 0.208}; T-ACT-3 by sex: {'male': 0.111, 'female': 0.059}
S19c3 T-ACT-2 by sex: {'male': 0.256, 'female': 0.201}; T-ACT-3 by sex: {'male': 0.105, 'female': 0.067}
S21 T-ACT-2 by sex: {'male': 0.204, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.061}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S19: 2.57 ÷ 2.75 = 0.933
  S19c1: 2.56 ÷ 2.80 = 0.915
  S19c2: 2.51 ÷ 2.75 = 0.912
  S19c3: 2.54 ÷ 2.79 = 0.909
  S21: 2.07 ÷ 2.19 = 0.947
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run2/artifacts/validation/e/s21/S21-rhythm5.json: adults out of a nest 2.03% of night; T-RHY-5 0.0215; night deaths 1; deaths 1
```

**Against the predictions.** Prescriptions 45: held. Viability (one death, not starvation) and night (2.03%, 0.0215):
held. T-ACT-2 0.14–0.18: missed narrowly (0.184). T-ACT-4 0.36–0.42: held (0.402). T-FOOD-2 0.72–0.79: held (0.759).
T-RNG-4 1.4–1.9: held (1.79). Nursing mothers' and infants' reserves better: held, slightly (−0.072 → −0.066; −0.103 →
−0.092). Fitted and held-out inside noise or better: held, **held-out without the rare rows better beyond noise**
(z −5.0: 4.82 → 3.66), led by T-FOOD-10 (departures before sunrise 0.814 → 0.576, distance 2.33 → 1.25). Also: T-HUN-2
into its band (0.377 → 0.500); adult males' reserves better (−0.043 → −0.035). Costs: T-PAT-1 just below its band (0.176
→ 0.093), T-HUN-1 at its floor (5.2), T-HUN-3 lower (0.014).

**Verdict: S21 passes the keep rule and replaces S19 as the best integrated candidate** (45 prescriptions; no fitted
choice temperature; held-out better beyond noise; the longest-standing miss, T-FOOD-10, halved).

## S22 confirm (registered 4 October 2026 before its run)

**S22 = S21 + E4m's `leftoverRules` 3** (rough play only when the stronger player is acutely aroused relative to the
size gap; aroused animals rarely start play; patrol listening stops at waypoints and after a heard chorus; `roughPlayP`
and `patrolStopEveryMin` out: 45 → 43). **Reference group, new:** S21 in confirm mode (S21, e7d8d8e) plus three re-draws
by `rngSalt` 1, 2, 3 (S21c1–S21c3, bench-run2). Standard keep rule with amendment 3's rare rows. Bench, energy-diagnose
and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run3 moved to this commit.

**Predictions (against the S21 group; moderate confidence unless stated).** Prescriptions 43 (high); viability and night
safety pass; T-ACT-4 a little higher than S21's (low); T-PAT-1 lower or unscored (the observer's patrol classifier needs
two listening stops; low); T-SOC-3 and T-SOC-5 within or just below the group's spread (low); reserves within spread;
fitted and held-out inside noise.

## S23 confirm (registered 4 October 2026 before its run)

**S23 = S21 + E2i's `walkGait` 1** (walking speed from measured Mahale speeds scaled by body mass; `walkMps` out: 45 →
44). Judged against S21's confirm group (S21 + S21c1–S21c3 by `rngSalt`, bench-run2) by the standard keep rule with
amendment 3's rare rows. Bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run4 moved to this
commit.

**Predictions (against the S21 group; moderate confidence unless stated).** Prescriptions 44 (high); viability and night
safety pass; true day ranges longer (males 2.5–3.0 km); T-RNG-4 2.0–2.6; T-ACT-2 below its band (0.10–0.13; the stage's
cost); juveniles' reserves within or below the group's spread (low); fitted and held-out inside noise.

### S22 results (bench-run3 ea794ff for S22, bench-run2 e7d8d8e for the S21 group re-drawn by `rngSalt`, all clean; printed by judge_s21group.py and night.py from the JSON; rare rows per amendment 3)

```
bench reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; energy reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; arms: ['S22']
  S21: e7d8d8e dirty 0 prescriptions 45
  S21c1: e7d8d8e dirty 0 prescriptions 45
  S21c2: e7d8d8e dirty 0 prescriptions 45
  S21c3: e7d8d8e dirty 0 prescriptions 45
  S22: ea794ff dirty 0 prescriptions 43

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.16, 2.24, 1.57, 1.33 (mean 1.58, sd 0.47; used 0.47) | S22.json: 1.78, Δ +0.20, z +0.4 (inside noise)
  held-out           (15 rows) ref 7.39, 6.30, 8.26, 6.48 (mean 7.11, sd 0.91; used 1.45) | S22.json: 10.34, Δ +3.23, z +2.0 (inside noise)
  held-out w/o rare  (12 rows) ref 3.66, 3.60, 4.04, 3.70 (mean 3.75, sd 0.20; used 0.21) | S22.json: 3.51, Δ -0.24, z -1.0 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.35±0.98 | S22.json 1.20 (fail)
   T-FOOD-10 held-out ref 1.22±0.07 | S22.json 1.07 (fail)
   T-HUN-1   fitted   ref 0.05±0.04 | S22.json 0.15 (inconclusive)
   T-HUN-4   held-out ref 0.68±0.89 | S22.json 0.73 (inconclusive)
   T-IGE-3   held-out ref 1.33±1.18 | S22.json 4.90 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S21 3.66 / 3.60 / 4.04 / 3.70 (mean 3.75, sd 0.20; used 0.21); S22 3.51 (z -1.0)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S21 2.19 / 2.45 / 2.41 / 2.52 (mean 2.39, sd 0.14; used 0.21); S22 2.47 (z +0.3)
T-RNG-5 distance by run (S21 group, then arms): [1.46, 1.14, 1.64, 1.18, 1.04]
T-IGE-3 distance by run: [2.94, 0.99, 1.27, 0.12, 4.9]

| Reserves ÷ store, % per day (OLS) | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.038 / -0.039 | -0.038 ± 0.002 | -0.032 (z +2.9) |
| female, other | -0.047 / -0.028 / -0.038 / -0.052 | -0.041 ± 0.011 | -0.043 (z -0.2) |
| female, lactating | -0.066 / -0.070 / -0.074 / -0.074 | -0.071 ± 0.004 | -0.068 (z +0.8) |
| juvenile 5–12 y | -0.081 / -0.077 / -0.070 / -0.085 | -0.078 ± 0.007 | -0.049 (z +4.0) |
| infant 2–5 y | -0.049 / -0.054 / -0.066 / -0.070 | -0.060 ± 0.010 | -0.052 (z +0.6) |
| infant 0.5–2 y | -0.092 / -0.097 / -0.081 / -0.086 | -0.089 ± 0.007 | -0.090 (z -0.2) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.80 / 2.78 | 2.79 ± 0.01 | 2.79 (z +0.3) |
| 1–2 y | 3.51 / 3.45 / 3.46 / 3.44 | 3.46 ± 0.03 | 3.47 (z +0.1) |
| 2–3 y | 3.46 / 3.48 / 3.47 / 3.48 | 3.47 ± 0.01 | 3.49 (z +1.6) |
| 3–4 y | 3.49 / 3.47 / 3.49 / 3.49 | 3.49 ± 0.01 | 3.50 (z +1.3) |

| Milk drunk, kcal per infant-day | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- |
| 0.5–1 y | 276 / 277 / 277 / 276 | 277 ± 0 | 277 (z +1.5) |
| 1–2 y | 284 / 279 / 276 / 273 | 278 ± 4 | 283 (z +0.9) |
| 2–3 y | 248 / 253 / 247 / 253 | 250 ± 3 | 264 (z +4.0) |
| 3–4 y | 258 / 245 / 249 / 258 | 252 ± 7 | 260 (z +0.9) |

| Mothers' balance, kcal/day by infant age | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- |
| 0.5–1 y | -39 / -36 / -32 / -35 | -35 ± 3 | -33 (z +0.7) |
| 1–2 y | -37 / -41 / -45 / -45 | -42 ± 4 | -39 (z +0.8) |
| 2–3 y | -38 / -41 / -45 / -42 | -41 ± 3 | -24 (z +4.8) |
| 3–4 y | -30 / -19 / -25 / -22 | -24 ± 5 | -25 (z -0.2) |

| Ground km / eating min / fruit share | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.19 / 2.25 / 2.27 / 2.33 | 2.26 ± 0.06 | 2.07 (z -2.9) |
| adult male: eatingMin | 230.78 / 232.92 / 231.63 / 233.29 | 232.16 ± 1.16 | 230.74 (z -1.1) |
| adult male: fruitShare | 0.86 / 0.85 / 0.85 / 0.85 | 0.85 ± 0.00 | 0.85 (z -0.4) |
| female, other: groundKm | 1.67 / 1.66 / 1.65 / 1.76 | 1.69 ± 0.05 | 1.49 (z -3.6) |
| female, other: eatingMin | 235.94 / 237.86 / 226.22 / 238.82 | 234.71 ± 5.79 | 238.52 (z +0.6) |
| female, other: fruitShare | 0.61 / 0.60 / 0.65 / 0.60 | 0.62 ± 0.02 | 0.57 (z -1.7) |
| female, lactating: groundKm | 2.07 / 2.17 / 2.13 / 2.12 | 2.12 ± 0.04 | 1.95 (z -3.9) |
| female, lactating: eatingMin | 304.37 / 306.96 / 305.67 / 308.15 | 306.28 ± 1.63 | 305.39 (z -0.5) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.62 / 0.63 | 0.63 ± 0.01 | 0.64 (z +1.1) |
| juvenile 5–12 y: groundKm | 2.18 / 2.26 / 2.20 / 2.21 | 2.21 ± 0.04 | 2.04 (z -4.5) |
| juvenile 5–12 y: eatingMin | 274.37 / 276.88 / 273.05 / 280.77 | 276.26 ± 3.40 | 276.42 (z +0.0) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.83 / 0.84 / 0.83 | 0.83 ± 0.01 | 0.83 (z -0.2) |

| Row (pooled) | Band | S21 runs | S21 mean ± SD | S22 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.376 / 0.378 / 0.380 / 0.380 | 0.379 ± 0.002 | 0.380 |
| T-ACT-2 | 0.12–0.25 | 0.184 / 0.189 / 0.189 / 0.195 | 0.189 ± 0.004 | 0.179 |
| T-ACT-3 | 0.08–0.18 | 0.090 / 0.085 / 0.089 / 0.085 | 0.087 ± 0.003 | 0.091 |
| T-ACT-4 | 0.3–0.47 | 0.402 / 0.378 / 0.363 / 0.371 | 0.378 ± 0.017 | 0.383 |
| T-PTY-1 | 3–9 | 4.009 / 4.077 / 4.217 / 4.042 | 4.086 ± 0.092 | 3.882 |
| T-RNG-4 | 1.5–3.5 | 1.790 / 1.959 / 1.834 / 1.964 | 1.887 ± 0.088 | 1.926 |
| T-HUN-1 | 5–25 | 5.226 / 4.033 / 4.042 / 3.237 | 4.135 ± 0.820 | 2.019 |
| T-HUN-2 | 0.5–0.8 | 0.500 / 0.200 / 0.333 / 0.636 | 0.417 ± 0.191 | 0.375 |
| T-HUN-3 | 0.05–0.4 | 0.014 / 0.024 / 0.008 / 0.010 | 0.014 ± 0.007 | 0.011 |
| T-FOOD-2 | 0.6–0.78 | 0.759 / 0.748 / 0.766 / 0.751 | 0.756 ± 0.008 | 0.755 |
| T-FOOD-4 | 4–15 | 8.143 / 8.067 / 8.151 / 8.324 | 8.171 ± 0.109 | 8.115 |
| T-FOOD-6 | 2–7 | 4.763 / 4.770 / 4.588 / 4.699 | 4.705 ± 0.084 | 4.807 |
| T-FOOD-10 | 0.08–0.3 | 0.576 / 0.581 / 0.549 / 0.563 | 0.567 ± 0.014 | 0.535 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 9.361 / 7.884 / 9.793 / 5.466 | 8.126 ± 1.952 | 10.704 |
| T-IGE-2 | 0.7–0.9 | 0.939 / 0.926 / 0.936 / 0.952 | 0.938 ± 0.011 | 0.947 |
| T-PAT-1 | 0.1–0.5 | 0.093 / 0.109 / 0.139 / 0.116 | 0.114 ± 0.019 | 0.124 |
| T-PAT-6 | 0.4–0.7 | 0.462 / 0.450 / 0.737 / 0.394 | 0.511 ± 0.154 | 0.808 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.143 / 0.000 / 0.000 | 0.036 ± 0.071 | 0.062 |
| T-SOC-3 | 0.45–0.8 | 0.671 / 0.754 / 0.733 / 0.760 | 0.729 ± 0.041 | 0.650 |
| T-SOC-5 | 0.2–0.7 | 0.562 / 0.584 / 0.587 / 0.598 | 0.583 ± 0.015 | 0.546 |
| T-SOC-9 | 0.08–0.22 | 0.103 / 0.078 / 0.139 / 0.110 | 0.108 ± 0.025 | 0.107 |
S21 T-ACT-2 by sex: {'male': 0.204, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.061}
S21c1 T-ACT-2 by sex: {'male': 0.21, 'female': 0.171}; T-ACT-3 by sex: {'male': 0.111, 'female': 0.063}
S21c2 T-ACT-2 by sex: {'male': 0.215, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.118, 'female': 0.065}
S21c3 T-ACT-2 by sex: {'male': 0.22, 'female': 0.174}; T-ACT-3 by sex: {'male': 0.112, 'female': 0.063}
S22 T-ACT-2 by sex: {'male': 0.199, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.062}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S21: 2.07 ÷ 2.19 = 0.947
  S21c1: 2.17 ÷ 2.25 = 0.967
  S21c2: 2.13 ÷ 2.27 = 0.941
  S21c3: 2.12 ÷ 2.33 = 0.909
  S22: 1.95 ÷ 2.07 = 0.940
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s22/S22-rhythm5.json: adults out of a nest 1.89% of night; T-RHY-5 0.0203; night deaths 0; deaths 1
```

**Against the predictions.** Prescriptions 43: held. Viability (one death, not starvation) and night (1.89%, 0.0203):
held. T-ACT-4 a little higher: held (0.378 → 0.383). T-PAT-1 lower or unscored: missed (0.114 → 0.124, scored); T-PAT-6
rose above its band (0.808). T-SOC-3 and T-SOC-5 within or just below the group's spread: held (0.650, 0.546).
Reserves within spread: held, and better for juveniles (−0.078 → −0.049) and adult males (−0.038 → −0.032). Fitted and
held-out inside noise: held (z +0.4; +2.0 with all rows, from the rare rows (S22's T-IGE-3 4.9); −1.0 without them).
Hunting is rare on the S21 stack (T-HUN-1 4.1 ± 0.8 on S21's group, below its band) and lower on S22 (2.0).

**Verdict: S22 passes the keep rule** (43 prescriptions: rough play and listening stops from state and events). Costs:
incursion share above its band; hunting, already below its band on S21, lower still.

### S23 results (bench-run4 23db70b for S23, bench-run2 e7d8d8e for the S21 group, all clean; printed by judge_s21group.py and night.py from the JSON)

S23's six deaths: three illness (adult males), one outbreak of three (a nursing mother, another female, an infant); none
from starvation.

```
bench reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; energy reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; arms: ['S23']
  S21: e7d8d8e dirty 0 prescriptions 45
  S21c1: e7d8d8e dirty 0 prescriptions 45
  S21c2: e7d8d8e dirty 0 prescriptions 45
  S21c3: e7d8d8e dirty 0 prescriptions 45
  S23: 23db70b dirty 0 prescriptions 44

confirm, reference custom (4 runs), rows counted in all runs: fitted 18, held-out 19
  fitted             (18 rows) ref 1.18, 2.24, 1.57, 1.33 (mean 1.58, sd 0.47; used 0.47) | S23.json: 1.33, Δ -0.25, z -0.5 (inside noise)
  held-out           (19 rows) ref 8.24, 6.59, 8.95, 7.22 (mean 7.75, sd 1.05; used 1.45) | S23.json: 5.54, Δ -2.21, z -1.4 (inside noise)
  held-out w/o rare  (16 rows) ref 4.50, 3.88, 4.73, 4.45 (mean 4.39, sd 0.36; used 0.36) | S23.json: 4.46, Δ +0.07, z +0.2 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.35±0.98 | S23.json 0.48 (fail)
   T-FOOD-10 held-out ref 1.22±0.07 | S23.json 1.85 (fail)
   T-HUN-4   held-out ref 0.68±0.89 | S23.json 0.06 (inconclusive)
   T-IGE-3   held-out ref 1.33±1.18 | S23.json 0.55 (fail)
   T-PAT-2   held-out ref 0.26±0.06 | S23.json 0.13 (inconclusive)
   T-RNG-5   held-out ref 1.36±0.23 | S23.json 0.71 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (16 rows): S21 4.50 / 3.88 / 4.73 / 4.45 (mean 4.39, sd 0.36; used 0.36); S23 4.46 (z +0.2)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (15 rows): S21 3.04 / 2.74 / 3.09 / 3.27 (mean 3.03, sd 0.22; used 0.22); S23 3.75 (z +2.9)
T-RNG-5 distance by run (S21 group, then arms): [1.46, 1.14, 1.64, 1.18, 0.71]
T-IGE-3 distance by run: [2.94, 0.99, 1.27, 0.12, 0.55]

| Reserves ÷ store, % per day (OLS) | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.038 / -0.039 | -0.038 ± 0.002 | -0.046 (z -4.2) |
| female, other | -0.047 / -0.028 / -0.038 / -0.052 | -0.041 ± 0.011 | -0.059 (z -1.4) |
| female, lactating | -0.066 / -0.070 / -0.074 / -0.074 | -0.071 ± 0.004 | -0.084 (z -3.1) |
| juvenile 5–12 y | -0.081 / -0.077 / -0.070 / -0.085 | -0.078 ± 0.007 | -0.112 (z -4.6) |
| infant 2–5 y | -0.049 / -0.054 / -0.066 / -0.070 | -0.060 ± 0.010 | -0.067 (z -0.7) |
| infant 0.5–2 y | -0.092 / -0.097 / -0.081 / -0.086 | -0.089 ± 0.007 | -0.121 (z -4.1) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.80 / 2.78 | 2.79 ± 0.01 | 2.77 (z -1.0) |
| 1–2 y | 3.51 / 3.45 / 3.46 / 3.44 | 3.46 ± 0.03 | 3.44 (z -0.7) |
| 2–3 y | 3.46 / 3.48 / 3.47 / 3.48 | 3.47 ± 0.01 | 3.44 (z -3.0) |
| 3–4 y | 3.49 / 3.47 / 3.49 / 3.49 | 3.49 ± 0.01 | 3.45 (z -3.1) |

| Milk drunk, kcal per infant-day | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- |
| 0.5–1 y | 276 / 277 / 277 / 276 | 277 ± 0 | 275 (z -3.1) |
| 1–2 y | 284 / 279 / 276 / 273 | 278 ± 4 | 279 (z +0.1) |
| 2–3 y | 248 / 253 / 247 / 253 | 250 ± 3 | 238 (z -3.6) |
| 3–4 y | 258 / 245 / 249 / 258 | 252 ± 7 | 235 (z -2.3) |

| Mothers' balance, kcal/day by infant age | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- |
| 0.5–1 y | -39 / -36 / -32 / -35 | -35 ± 3 | -43 (z -2.6) |
| 1–2 y | -37 / -41 / -45 / -45 | -42 ± 4 | -50 (z -1.8) |
| 2–3 y | -38 / -41 / -45 / -42 | -41 ± 3 | -35 (z +1.9) |
| 3–4 y | -30 / -19 / -25 / -22 | -24 ± 5 | -27 (z -0.5) |

| Ground km / eating min / fruit share | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.19 / 2.25 / 2.27 / 2.33 | 2.26 ± 0.06 | 3.36 (z +17.0) |
| adult male: eatingMin | 230.78 / 232.92 / 231.63 / 233.29 | 232.16 ± 1.16 | 236.88 (z +3.6) |
| adult male: fruitShare | 0.86 / 0.85 / 0.85 / 0.85 | 0.85 ± 0.00 | 0.88 (z +4.9) |
| female, other: groundKm | 1.67 / 1.66 / 1.65 / 1.76 | 1.69 ± 0.05 | 2.52 (z +15.3) |
| female, other: eatingMin | 235.94 / 237.86 / 226.22 / 238.82 | 234.71 ± 5.79 | 235.12 (z +0.1) |
| female, other: fruitShare | 0.61 / 0.60 / 0.65 / 0.60 | 0.62 ± 0.02 | 0.65 (z +1.2) |
| female, lactating: groundKm | 2.07 / 2.17 / 2.13 / 2.12 | 2.12 ± 0.04 | 3.05 (z +20.8) |
| female, lactating: eatingMin | 304.37 / 306.96 / 305.67 / 308.15 | 306.28 ± 1.63 | 322.63 (z +9.0) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.62 / 0.63 | 0.63 ± 0.01 | 0.61 (z -2.3) |
| juvenile 5–12 y: groundKm | 2.18 / 2.26 / 2.20 / 2.21 | 2.21 ± 0.04 | 3.26 (z +26.6) |
| juvenile 5–12 y: eatingMin | 274.37 / 276.88 / 273.05 / 280.77 | 276.26 ± 3.40 | 293.94 (z +4.7) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.83 / 0.84 / 0.83 | 0.83 ± 0.01 | 0.84 (z +0.7) |

| Row (pooled) | Band | S21 runs | S21 mean ± SD | S23 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.376 / 0.378 / 0.380 / 0.380 | 0.379 ± 0.002 | 0.383 |
| T-ACT-2 | 0.12–0.25 | 0.184 / 0.189 / 0.189 / 0.195 | 0.189 ± 0.004 | 0.133 |
| T-ACT-3 | 0.08–0.18 | 0.090 / 0.085 / 0.089 / 0.085 | 0.087 ± 0.003 | 0.082 |
| T-ACT-4 | 0.3–0.47 | 0.402 / 0.378 / 0.363 / 0.371 | 0.378 ± 0.017 | 0.419 |
| T-PTY-1 | 3–9 | 4.009 / 4.077 / 4.217 / 4.042 | 4.086 ± 0.092 | 4.458 |
| T-RNG-4 | 1.5–3.5 | 1.790 / 1.959 / 1.834 / 1.964 | 1.887 ± 0.088 | 2.718 |
| T-HUN-1 | 5–25 | 5.226 / 4.033 / 4.042 / 3.237 | 4.135 ± 0.820 | 6.453 |
| T-HUN-2 | 0.5–0.8 | 0.500 / 0.200 / 0.333 / 0.636 | 0.417 ± 0.191 | 0.429 |
| T-HUN-3 | 0.05–0.4 | 0.014 / 0.024 / 0.008 / 0.010 | 0.014 ± 0.007 | 0.014 |
| T-FOOD-2 | 0.6–0.78 | 0.759 / 0.748 / 0.766 / 0.751 | 0.756 ± 0.008 | 0.779 |
| T-FOOD-4 | 4–15 | 8.143 / 8.067 / 8.151 / 8.324 | 8.171 ± 0.109 | 9.350 |
| T-FOOD-6 | 2–7 | 4.763 / 4.770 / 4.588 / 4.699 | 4.705 ± 0.084 | 4.618 |
| T-FOOD-10 | 0.08–0.3 | 0.576 / 0.581 / 0.549 / 0.563 | 0.567 ± 0.014 | 0.707 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 9.361 / 7.884 / 9.793 / 5.466 | 8.126 ± 1.952 | 6.675 |
| T-IGE-2 | 0.7–0.9 | 0.939 / 0.926 / 0.936 / 0.952 | 0.938 ± 0.011 | 0.951 |
| T-PAT-1 | 0.1–0.5 | 0.093 / 0.109 / 0.139 / 0.116 | 0.114 ± 0.019 | 0.163 |
| T-PAT-6 | 0.4–0.7 | 0.462 / 0.450 / 0.737 / 0.394 | 0.511 ± 0.154 | 0.718 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.143 / 0.000 / 0.000 | 0.036 ± 0.071 | 0.000 |
| T-SOC-3 | 0.45–0.8 | 0.671 / 0.754 / 0.733 / 0.760 | 0.729 ± 0.041 | 0.706 |
| T-SOC-5 | 0.2–0.7 | 0.562 / 0.584 / 0.587 / 0.598 | 0.583 ± 0.015 | 0.702 |
| T-SOC-9 | 0.08–0.22 | 0.103 / 0.078 / 0.139 / 0.110 | 0.108 ± 0.025 | 0.121 |
S21 T-ACT-2 by sex: {'male': 0.204, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.061}
S21c1 T-ACT-2 by sex: {'male': 0.21, 'female': 0.171}; T-ACT-3 by sex: {'male': 0.111, 'female': 0.063}
S21c2 T-ACT-2 by sex: {'male': 0.215, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.118, 'female': 0.065}
S21c3 T-ACT-2 by sex: {'male': 0.22, 'female': 0.174}; T-ACT-3 by sex: {'male': 0.112, 'female': 0.063}
S23 T-ACT-2 by sex: {'male': 0.144, 'female': 0.124}; T-ACT-3 by sex: {'male': 0.111, 'female': 0.059}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S21: 2.07 ÷ 2.19 = 0.947
  S21c1: 2.17 ÷ 2.25 = 0.967
  S21c2: 2.13 ÷ 2.27 = 0.941
  S21c3: 2.12 ÷ 2.33 = 0.909
  S23: 3.05 ÷ 3.36 = 0.906
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s23/S23-rhythm5.json: adults out of a nest 2.53% of night; T-RHY-5 0.0194; night deaths 2; deaths 6
```

**Against the predictions.** Prescriptions 44: held. Viability and night (2.53%, 0.0194): held. True day ranges longer:
held (males 3.36 km). T-RNG-4 2.0–2.6: missed high (2.72, inside its band). T-ACT-2 below its band: missed (0.133, just
inside). Juveniles' reserves within or below spread: held, below (−0.078 → −0.112). Fitted and held-out inside noise:
held (z −0.5; −1.4; +0.2 without the rare rows). Not predicted: every class's reserves lower (adult males −0.046,
nursing mothers −0.084, infants 0.5–2 y −0.121 %/day), departures before sunrise back up (T-FOOD-10 0.567 → 0.707; the
sensitivity without T-RNG-5 is +2.9, mostly this row), hunting into its band (T-HUN-1 4.1 → 6.5), T-SOC-5 at its top
(0.702).

**Verdict: S23 passes the keep rule** (44 prescriptions: walking speed from the body). Costs: the energy of longer walks
on every class; departures before sunrise up again.

## S24 confirm (registered 4 October 2026 before its run)

**S24 = S21 + `leftoverRules` 3 + `walkGait` 1** (S22 and S23 together: 45 → 42). Judged against S21's confirm group by
the standard keep rule with amendment 3's rare rows. Bench, energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days,
from bench-run4 (23db70b carries both switches).

**Predictions (against the S21 group; moderate confidence unless stated).** Prescriptions 42 (high); viability and night
safety pass; day ranges longer and reserves lower than S21's (from S23), juveniles less so (S22; low); T-PAT-6 above its
band (S22); T-FOOD-10 above S21's; fitted and held-out inside noise.

### S24 results (bench-run4 23db70b, clean; judged against the four S21 runs; printed by judge_s21group.py and night.py from the JSON)

```
bench reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; energy reference runs: ['S21', 'S21c1', 'S21c2', 'S21c3']; arms: ['S24']
  S21: e7d8d8e dirty 0 prescriptions 45
  S21c1: e7d8d8e dirty 0 prescriptions 45
  S21c2: e7d8d8e dirty 0 prescriptions 45
  S21c3: e7d8d8e dirty 0 prescriptions 45
  S24: 23db70b dirty 0 prescriptions 42

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 1.16, 2.24, 1.57, 1.33 (mean 1.58, sd 0.47; used 0.47) | S24.json: 1.48, Δ -0.10, z -0.2 (inside noise)
  held-out           (14 rows) ref 4.45, 5.31, 6.99, 6.36 (mean 5.78, sd 1.12; used 1.45) | S24.json: 4.62, Δ -1.15, z -0.7 (inside noise)
  held-out w/o rare  (12 rows) ref 3.66, 3.60, 4.04, 3.70 (mean 3.75, sd 0.20; used 0.21) | S24.json: 4.31, Δ +0.56, z +2.4 RESULT
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.35±0.98 | S24.json 0.00 (pass)
   T-FOOD-10 held-out ref 1.22±0.07 | S24.json 1.60 (fail)
   T-HUN-4   held-out ref 0.68±0.89 | S24.json 0.31 (inconclusive)
   T-IGE-2   held-out ref 0.19±0.05 | S24.json 0.00 (inconclusive)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S21 3.66 / 3.60 / 4.04 / 3.70 (mean 3.75, sd 0.20; used 0.21); S24 4.31 (z +2.4)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S21 2.19 / 2.45 / 2.41 / 2.52 (mean 2.39, sd 0.14; used 0.21); S24 2.57 (z +0.8)
T-RNG-5 distance by run (S21 group, then arms): [1.46, 1.14, 1.64, 1.18, 1.74]
T-IGE-3 distance by run: [2.94, 0.99, 1.27, 0.12, None]

| Reserves ÷ store, % per day (OLS) | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.039 / -0.038 / -0.039 | -0.038 ± 0.002 | -0.043 (z -2.6) |
| female, other | -0.047 / -0.028 / -0.038 / -0.052 | -0.041 ± 0.011 | -0.061 (z -1.6) |
| female, lactating | -0.066 / -0.070 / -0.074 / -0.074 | -0.071 ± 0.004 | -0.090 (z -4.5) |
| juvenile 5–12 y | -0.081 / -0.077 / -0.070 / -0.085 | -0.078 ± 0.007 | -0.108 (z -4.1) |
| infant 2–5 y | -0.049 / -0.054 / -0.066 / -0.070 | -0.060 ± 0.010 | -0.061 (z -0.1) |
| infant 0.5–2 y | -0.092 / -0.097 / -0.081 / -0.086 | -0.089 ± 0.007 | -0.133 (z -5.7) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.77 / 2.80 / 2.78 | 2.79 ± 0.01 | 2.73 (z -3.8) |
| 1–2 y | 3.51 / 3.45 / 3.46 / 3.44 | 3.46 ± 0.03 | 3.44 (z -0.7) |
| 2–3 y | 3.46 / 3.48 / 3.47 / 3.48 | 3.47 ± 0.01 | 3.46 (z -1.2) |
| 3–4 y | 3.49 / 3.47 / 3.49 / 3.49 | 3.49 ± 0.01 | 3.44 (z -4.0) |

| Milk drunk, kcal per infant-day | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- |
| 0.5–1 y | 276 / 277 / 277 / 276 | 277 ± 0 | 274 (z -6.2) |
| 1–2 y | 284 / 279 / 276 / 273 | 278 ± 4 | 276 (z -0.5) |
| 2–3 y | 248 / 253 / 247 / 253 | 250 ± 3 | 239 (z -3.4) |
| 3–4 y | 258 / 245 / 249 / 258 | 252 ± 7 | 230 (z -3.0) |

| Mothers' balance, kcal/day by infant age | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- |
| 0.5–1 y | -39 / -36 / -32 / -35 | -35 ± 3 | -55 (z -6.2) |
| 1–2 y | -37 / -41 / -45 / -45 | -42 ± 4 | -57 (z -3.3) |
| 2–3 y | -38 / -41 / -45 / -42 | -41 ± 3 | -39 (z +0.6) |
| 3–4 y | -30 / -19 / -25 / -22 | -24 ± 5 | -28 (z -0.7) |

| Ground km / eating min / fruit share | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.19 / 2.25 / 2.27 / 2.33 | 2.26 ± 0.06 | 3.43 (z +18.1) |
| adult male: eatingMin | 230.78 / 232.92 / 231.63 / 233.29 | 232.16 ± 1.16 | 238.48 (z +4.9) |
| adult male: fruitShare | 0.86 / 0.85 / 0.85 / 0.85 | 0.85 ± 0.00 | 0.88 (z +4.3) |
| female, other: groundKm | 1.67 / 1.66 / 1.65 / 1.76 | 1.69 ± 0.05 | 2.64 (z +17.5) |
| female, other: eatingMin | 235.94 / 237.86 / 226.22 / 238.82 | 234.71 ± 5.79 | 247.01 (z +1.9) |
| female, other: fruitShare | 0.61 / 0.60 / 0.65 / 0.60 | 0.62 ± 0.02 | 0.60 (z -0.6) |
| female, lactating: groundKm | 2.07 / 2.17 / 2.13 / 2.12 | 2.12 ± 0.04 | 3.24 (z +25.0) |
| female, lactating: eatingMin | 304.37 / 306.96 / 305.67 / 308.15 | 306.28 ± 1.63 | 322.51 (z +8.9) |
| female, lactating: fruitShare | 0.63 / 0.64 / 0.62 / 0.63 | 0.63 ± 0.01 | 0.62 (z -1.1) |
| juvenile 5–12 y: groundKm | 2.18 / 2.26 / 2.20 / 2.21 | 2.21 ± 0.04 | 3.42 (z +30.7) |
| juvenile 5–12 y: eatingMin | 274.37 / 276.88 / 273.05 / 280.77 | 276.26 ± 3.40 | 287.27 (z +2.9) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.83 / 0.84 / 0.83 | 0.83 ± 0.01 | 0.85 (z +2.2) |

| Row (pooled) | Band | S21 runs | S21 mean ± SD | S24 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.376 / 0.378 / 0.380 / 0.380 | 0.379 ± 0.002 | 0.391 |
| T-ACT-2 | 0.12–0.25 | 0.184 / 0.189 / 0.189 / 0.195 | 0.189 ± 0.004 | 0.137 |
| T-ACT-3 | 0.08–0.18 | 0.090 / 0.085 / 0.089 / 0.085 | 0.087 ± 0.003 | 0.090 |
| T-ACT-4 | 0.3–0.47 | 0.402 / 0.378 / 0.363 / 0.371 | 0.378 ± 0.017 | 0.418 |
| T-PTY-1 | 3–9 | 4.009 / 4.077 / 4.217 / 4.042 | 4.086 ± 0.092 | 4.585 |
| T-RNG-4 | 1.5–3.5 | 1.790 / 1.959 / 1.834 / 1.964 | 1.887 ± 0.088 | 2.611 |
| T-HUN-1 | 5–25 | 5.226 / 4.033 / 4.042 / 3.237 | 4.135 ± 0.820 | 6.849 |
| T-HUN-2 | 0.5–0.8 | 0.500 / 0.200 / 0.333 / 0.636 | 0.417 ± 0.191 | 0.385 |
| T-HUN-3 | 0.05–0.4 | 0.014 / 0.024 / 0.008 / 0.010 | 0.014 ± 0.007 | 0.009 |
| T-FOOD-2 | 0.6–0.78 | 0.759 / 0.748 / 0.766 / 0.751 | 0.756 ± 0.008 | 0.775 |
| T-FOOD-4 | 4–15 | 8.143 / 8.067 / 8.151 / 8.324 | 8.171 ± 0.109 | 9.627 |
| T-FOOD-6 | 2–7 | 4.763 / 4.770 / 4.588 / 4.699 | 4.705 ± 0.084 | 4.571 |
| T-FOOD-10 | 0.08–0.3 | 0.576 / 0.581 / 0.549 / 0.563 | 0.567 ± 0.014 | 0.652 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 9.361 / 7.884 / 9.793 / 5.466 | 8.126 ± 1.952 | 5.141 |
| T-IGE-2 | 0.7–0.9 | 0.939 / 0.926 / 0.936 / 0.952 | 0.938 ± 0.011 | 0.875 |
| T-PAT-1 | 0.1–0.5 | 0.093 / 0.109 / 0.139 / 0.116 | 0.114 ± 0.019 | 0.108 |
| T-PAT-6 | 0.4–0.7 | 0.462 / 0.450 / 0.737 / 0.394 | 0.511 ± 0.154 | 0.609 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.143 / 0.000 / 0.000 | 0.036 ± 0.071 | 0.071 |
| T-SOC-3 | 0.45–0.8 | 0.671 / 0.754 / 0.733 / 0.760 | 0.729 ± 0.041 | 0.800 |
| T-SOC-5 | 0.2–0.7 | 0.562 / 0.584 / 0.587 / 0.598 | 0.583 ± 0.015 | 0.654 |
| T-SOC-9 | 0.08–0.22 | 0.103 / 0.078 / 0.139 / 0.110 | 0.108 ± 0.025 | 0.079 |
S21 T-ACT-2 by sex: {'male': 0.204, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.061}
S21c1 T-ACT-2 by sex: {'male': 0.21, 'female': 0.171}; T-ACT-3 by sex: {'male': 0.111, 'female': 0.063}
S21c2 T-ACT-2 by sex: {'male': 0.215, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.118, 'female': 0.065}
S21c3 T-ACT-2 by sex: {'male': 0.22, 'female': 0.174}; T-ACT-3 by sex: {'male': 0.112, 'female': 0.063}
S24 T-ACT-2 by sex: {'male': 0.143, 'female': 0.131}; T-ACT-3 by sex: {'male': 0.121, 'female': 0.065}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S21: 2.07 ÷ 2.19 = 0.947
  S21c1: 2.17 ÷ 2.25 = 0.967
  S21c2: 2.13 ÷ 2.27 = 0.941
  S21c3: 2.12 ÷ 2.33 = 0.909
  S24: 3.24 ÷ 3.43 = 0.942
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run4/artifacts/validation/e/s24/S24-rhythm5.json: adults out of a nest 2.52% of night; T-RHY-5 0.0192; night deaths 1; deaths 1
```

**Against the predictions.** Prescriptions 42: held. Viability (one illness death) and night (2.52%, 0.0192): held. Day
ranges longer and reserves lower: held, and juveniles not spared (−0.078 → −0.108); nursing mothers −0.071 → −0.090 and
infants 0.5–2 y −0.089 → −0.133. T-PAT-6 above its band: missed (0.609, in band). T-FOOD-10 above S21's: held (0.652).
Fitted inside noise: held (z −0.2). **Held-out without the rare rows: worse beyond noise (z +2.4)**; the sensitivity
without T-RNG-5 is +0.8, so T-RNG-5 and T-FOOD-10 carry it.

**Verdict: S24 is not adopted** (the keep rule's held-out test fails, and the walking cost falls on mothers, juveniles
and infants). **The best integrated candidate is S22** (43 prescriptions; every sum inside noise; juveniles' and males'
reserves better than S21's). S23 (`walkGait`) passes alone but does not yet combine: its energy cost needs its own stage
(E2i's open problem: travel phases still slower than the field's with more halts, and climbing takes 16–19% of travel).

## S25 confirm (registered 4 October 2026 before its run)

**S25 = S22 + E4n's `huntDrive` 1** (the hunt weighed at the energy-deficit drive without the distension satiation; a
correction: 43 prescriptions, unchanged). **Reference group, new:** S22 in confirm mode (S22, ea794ff) plus three re-draws
by `rngSalt` 1, 2, 3 (S22c1–S22c3, bench-run3). **Keep rule for a correction:** viability; held-out not up beyond noise
(with and without the rare rows of amendment 3); prescriptions not up; night safe. Bench, energy-diagnose and
rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run2 moved to this commit.

**Predictions (against the S22 group; moderate confidence unless stated).** Prescriptions 43 (high); viability and night
safety pass; T-HUN-1 inside its band 5–25 (moderate; S22 2.0); T-HUN-3 still below its band (low); hunters' and their
families' reserves within the group's spread; fitted better (T-HUN-1) and held-out inside noise.

### S25 results (bench-run2 7cd6bb1 for S25, bench-run3 ea794ff for the S22 group re-drawn by `rngSalt`, all clean; printed by judge_s22group.py and night.py from the JSON)

S25's eight deaths were one respiratory outbreak in seed 48 (seven: two adult males, two nursing mothers, a pregnant
female, a juvenile, an infant) and an infant that did not survive its mother's death; none from starvation. Outbreaks
have struck about one confirm run in five across arms (S7a, S15, S23, here).

```
bench reference runs: ['S22', 'S22c1', 'S22c2', 'S22c3']; energy reference runs: ['S22', 'S22c1', 'S22c2', 'S22c3']; arms: ['S25']
  S22: ea794ff dirty 0 prescriptions 43
  S22c1: ea794ff dirty 0 prescriptions 43
  S22c2: ea794ff dirty 0 prescriptions 43
  S22c3: ea794ff dirty 0 prescriptions 43
  S25: 7cd6bb1 dirty 0 prescriptions 43

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.78, 1.11, 1.53, 1.15 (mean 1.39, sd 0.32; used 0.32) | S25.json: 1.23, Δ -0.16, z -0.5 (inside noise)
  held-out           (15 rows) ref 10.34, 8.01, 5.34, 7.67 (mean 7.84, sd 2.04; used 2.04) | S25.json: 9.88, Δ +2.03, z +0.9 (inside noise)
  held-out w/o rare  (12 rows) ref 3.51, 3.94, 3.94, 4.22 (mean 3.90, sd 0.30; used 0.30) | S25.json: 3.86, Δ -0.04, z -0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 1.09±0.59 | S25.json 3.98 (fail)
   T-HUN-4   held-out ref 0.28±0.35 | S25.json 0.82 (inconclusive)
   T-IGE-3   held-out ref 2.57±1.66 | S25.json 1.21 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S22 3.51 / 3.94 / 3.94 / 4.22 (mean 3.90, sd 0.30; used 0.30); S25 3.86 (z -0.1)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S22 2.47 / 2.90 / 2.72 / 2.70 (mean 2.69, sd 0.18; used 0.21); S25 2.74 (z +0.2)
T-RNG-5 distance by run (S22 group, then arms): [1.04, 1.05, 1.22, 1.53, 1.12]
T-IGE-3 distance by run: [4.9, 2.23, 0.97, 2.17, 1.21]

| Reserves ÷ store, % per day (OLS) | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- |
| adult male | -0.032 / -0.022 / -0.035 / -0.029 | -0.030 ± 0.006 | -0.035 (z -0.9) |
| female, other | -0.043 / -0.031 / -0.037 / -0.034 | -0.036 ± 0.005 | -0.050 (z -2.4) |
| female, lactating | -0.068 / -0.063 / -0.070 / -0.059 | -0.065 ± 0.005 | -0.061 (z +0.7) |
| juvenile 5–12 y | -0.049 / -0.086 / -0.082 / -0.061 | -0.069 ± 0.018 | -0.060 (z +0.5) |
| infant 2–5 y | -0.052 / -0.058 / -0.056 / -0.043 | -0.052 ± 0.007 | -0.120 (z -9.2) |
| infant 0.5–2 y | -0.090 / -0.077 / -0.088 / -0.081 | -0.084 ± 0.006 | -0.088 (z -0.5) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.84 / 2.78 / 2.81 | 2.80 ± 0.03 | 2.79 (z -0.5) |
| 1–2 y | 3.47 / 3.44 / 3.46 / 3.47 | 3.46 ± 0.01 | 3.43 (z -1.9) |
| 2–3 y | 3.49 / 3.49 / 3.48 / 3.48 | 3.49 ± 0.01 | 3.39 (z -14.7) |
| 3–4 y | 3.50 / 3.48 / 3.49 / 3.51 | 3.50 ± 0.01 | 3.49 (z -0.3) |

| Milk drunk, kcal per infant-day | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- |
| 0.5–1 y | 277 / 277 / 275 / 279 | 277 ± 1 | 275 (z -1.0) |
| 1–2 y | 283 / 271 / 279 / 284 | 279 ± 6 | 278 (z -0.2) |
| 2–3 y | 264 / 257 / 253 / 258 | 258 ± 5 | 263 (z +1.0) |
| 3–4 y | 260 / 244 / 251 / 268 | 256 ± 10 | 253 (z -0.2) |

| Mothers' balance, kcal/day by infant age | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- |
| 0.5–1 y | -33 / -18 / -39 / -28 | -30 ± 9 | -36 (z -0.7) |
| 1–2 y | -39 / -39 / -48 / -44 | -42 ± 4 | -38 (z +0.9) |
| 2–3 y | -24 / -33 / -35 / -27 | -30 ± 5 | -34 (z -0.7) |
| 3–4 y | -25 / -33 / -22 / -18 | -25 ± 6 | -32 (z -1.0) |

| Ground km / eating min / fruit share | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.07 / 2.20 / 2.18 / 2.21 | 2.16 ± 0.06 | 2.21 (z +0.7) |
| adult male: eatingMin | 230.74 / 231.22 / 232.26 / 233.20 | 231.85 ± 1.10 | 232.60 (z +0.6) |
| adult male: fruitShare | 0.85 / 0.86 / 0.84 / 0.86 | 0.85 ± 0.01 | 0.84 (z -1.9) |
| female, other: groundKm | 1.49 / 1.71 / 1.64 / 1.64 | 1.62 ± 0.09 | 1.69 (z +0.7) |
| female, other: eatingMin | 238.52 / 239.09 / 237.11 / 231.13 | 236.46 ± 3.65 | 237.14 (z +0.2) |
| female, other: fruitShare | 0.57 / 0.61 / 0.60 / 0.63 | 0.60 ± 0.02 | 0.60 (z +0.1) |
| female, lactating: groundKm | 1.95 / 2.09 / 2.07 / 2.01 | 2.03 ± 0.06 | 2.10 (z +1.0) |
| female, lactating: eatingMin | 305.39 / 305.83 / 306.88 / 298.85 | 304.24 ± 3.65 | 302.78 (z -0.4) |
| female, lactating: fruitShare | 0.64 / 0.63 / 0.62 / 0.66 | 0.64 ± 0.02 | 0.64 (z +0.1) |
| juvenile 5–12 y: groundKm | 2.04 / 2.16 / 2.15 / 2.10 | 2.11 ± 0.06 | 2.18 (z +1.1) |
| juvenile 5–12 y: eatingMin | 276.42 / 276.21 / 272.04 / 272.00 | 274.17 ± 2.48 | 273.50 (z -0.2) |
| juvenile 5–12 y: fruitShare | 0.83 / 0.82 / 0.84 / 0.84 | 0.83 ± 0.01 | 0.84 (z +1.0) |

| Row (pooled) | Band | S22 runs | S22 mean ± SD | S25 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.380 / 0.380 / 0.381 / 0.373 | 0.378 ± 0.004 | 0.376 |
| T-ACT-2 | 0.12–0.25 | 0.179 / 0.181 / 0.189 / 0.184 | 0.183 ± 0.004 | 0.183 |
| T-ACT-3 | 0.08–0.18 | 0.091 / 0.092 / 0.090 / 0.088 | 0.090 ± 0.001 | 0.087 |
| T-ACT-4 | 0.3–0.47 | 0.383 / 0.357 / 0.351 / 0.364 | 0.364 ± 0.014 | 0.395 |
| T-PTY-1 | 3–9 | 3.882 / 4.187 / 4.255 / 3.971 | 4.074 ± 0.176 | 4.051 |
| T-RNG-4 | 1.5–3.5 | 1.926 / 1.866 / 1.900 / 1.837 | 1.882 ± 0.039 | 1.896 |
| T-HUN-1 | 5–25 | 2.019 / 4.033 / 2.014 / 4.024 | 3.023 ± 1.162 | 17.362 |
| T-HUN-2 | 0.5–0.8 | 0.375 / 0.778 / 0.667 / 0.636 | 0.614 ± 0.171 | 0.610 |
| T-HUN-3 | 0.05–0.4 | 0.011 / 0.013 / 0.004 / 0.008 | 0.009 ± 0.004 | 0.035 |
| T-FOOD-2 | 0.6–0.78 | 0.755 / 0.749 / 0.748 / 0.779 | 0.758 ± 0.014 | 0.758 |
| T-FOOD-4 | 4–15 | 8.115 / 8.309 / 8.166 / 8.153 | 8.186 ± 0.085 | 7.997 |
| T-FOOD-6 | 2–7 | 4.807 / 4.615 / 4.663 / 5.001 | 4.772 ± 0.173 | 4.817 |
| T-FOOD-10 | 0.08–0.3 | 0.535 / 0.590 / 0.543 / 0.557 | 0.556 ± 0.024 | 0.549 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 10.704 / 9.423 / 7.660 / 11.263 | 9.763 ± 1.599 | 6.357 |
| T-IGE-2 | 0.7–0.9 | 0.947 / 1.000 / 1.000 / 1.000 | 0.987 ± 0.026 | 1.000 |
| T-PAT-1 | 0.1–0.5 | 0.124 / 0.108 / 0.116 / 0.077 | 0.106 ± 0.021 | 0.070 |
| T-PAT-6 | 0.4–0.7 | 0.808 / 0.424 / 0.355 / 0.600 | 0.547 ± 0.202 | 0.724 |
| T-PAT-7 | 0.15–0.45 | 0.062 / 0.000 / 0.000 / 0.000 | 0.016 ± 0.031 | 0.000 |
| T-SOC-3 | 0.45–0.8 | 0.650 / 0.747 / 0.750 / 0.679 | 0.707 ± 0.050 | 0.714 |
| T-SOC-5 | 0.2–0.7 | 0.546 / 0.665 / 0.632 / 0.551 | 0.599 ± 0.059 | 0.610 |
| T-SOC-9 | 0.08–0.22 | 0.107 / 0.104 / 0.175 / 0.103 | 0.122 ± 0.035 | 0.198 |
S22 T-ACT-2 by sex: {'male': 0.199, 'female': 0.162}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.062}
S22c1 T-ACT-2 by sex: {'male': 0.21, 'female': 0.156}; T-ACT-3 by sex: {'male': 0.124, 'female': 0.065}
S22c2 T-ACT-2 by sex: {'male': 0.212, 'female': 0.17}; T-ACT-3 by sex: {'male': 0.126, 'female': 0.061}
S22c3 T-ACT-2 by sex: {'male': 0.2, 'female': 0.171}; T-ACT-3 by sex: {'male': 0.122, 'female': 0.06}
S25 T-ACT-2 by sex: {'male': 0.203, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.113, 'female': 0.065}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S22: 1.95 ÷ 2.07 = 0.940
  S22c1: 2.09 ÷ 2.20 = 0.950
  S22c2: 2.07 ÷ 2.18 = 0.953
  S22c3: 2.01 ÷ 2.21 = 0.910
  S25: 2.10 ÷ 2.21 = 0.950
/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run2/artifacts/validation/e/s25/S25-rhythm5.json: adults out of a nest 1.84% of night; T-RHY-5 0.0203; night deaths 2; deaths 8
Infants 2–5 y, reserve change per dyad (%/day) by seed, from energy-diagnose's dyad records:
  S25   5: −0.070  7: −0.081  11: −0.117  21: −0.051  48: −0.330 (the outbreak seed: mothers ill or dead)
  S22   5: −0.056  7: −0.042  11: −0.121  21: −0.040  48: −0.007
  S22c1 5: −0.025  7: −0.099  11: −0.136  21: −0.066  48: −0.020
```

**Against the predictions.** Prescriptions 43: held. Viability (no starvation) and night (1.84%, 0.0203): held. T-HUN-1
inside its band: held (3.0 ± 1.2 → 17.4). T-HUN-3 still below its band: held (0.035). Hunters' and families' reserves
within spread: held for every class but infants 2–5 y (−0.052 → −0.120), whose drop is the outbreak seed's (−0.33 there;
the other four seeds −0.05 to −0.12, as on S22). Fitted better: missed (z −0.5, inside noise). Held-out inside noise:
held (z +0.9; −0.1 without the rare rows).

**Verdict: S25 passes the keep rule for a correction and replaces S22 as the best integrated candidate** (43
prescriptions; hunting back inside its band without a new magnitude).

## S26 and S27 confirms (registered 4 October 2026 before their runs)

**S26 = S25 + E1q's `crownMove` 1** (moving within a crown without descending; a correction: 43 prescriptions).
**S27 = S25 + `walkGait` 1 + `crownMove` 1** (whether the body-set walk combines once re-climbs are gone: 42). **Reference
group:** S25 in confirm mode (S25, 7cd6bb1) plus three re-draws by `rngSalt` 1, 2, 3 (S25c1–S25c3, bench-run2). Keep rule:
standard for S27 (prescriptions fall), for a correction for S26; rare rows per amendment 3; night safe. Bench,
energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days, from bench-run3 moved to this commit.

**Predictions (against the S25 group; moderate confidence unless stated).** S26: 43 prescriptions; viability and night
safety pass; metres climbed lower (males −5 to −15%), infants' reserves no worse; sums inside noise. S27: 42; viability and
night safety pass; day ranges longer (males 2.6–3.1 km), T-ACT-2 at or just below its band's floor (0.11–0.14), nursing
mothers', juveniles' and infants' reserves within 0.03 %/day of the group's (low: S24's cost); sums inside noise (low).

### S26 and S27 results (bench-run3 28d249e, clean; judged against the four S25 runs; printed by judge_s25group.py, night.py and a climbing readout from the JSON)

Each arm had one death, an illness on seed 11 in the rhythm run; none from starvation.

```
bench reference runs: ['S25', 'S25c1', 'S25c2', 'S25c3']; energy reference runs: ['S25', 'S25c1', 'S25c2', 'S25c3']; arms: ['S26']
  S25: 7cd6bb1 dirty 0 prescriptions 43
  S25c1: 7cd6bb1 dirty 0 prescriptions 43
  S25c2: 7cd6bb1 dirty 0 prescriptions 43
  S25c3: 7cd6bb1 dirty 0 prescriptions 43
  S26: 28d249e dirty 0 prescriptions 43

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.23, 1.02, 1.11, 1.05 (mean 1.10, sd 0.09; used 0.30) | S26.json: 1.34, Δ +0.24, z +0.7 (inside noise)
  held-out           (15 rows) ref 9.88, 7.07, 5.27, 6.49 (mean 7.18, sd 1.95; used 1.95) | S26.json: 8.27, Δ +1.09, z +0.5 (inside noise)
  held-out w/o rare  (12 rows) ref 3.86, 3.83, 3.79, 4.00 (mean 3.87, sd 0.09; used 0.21) | S26.json: 3.55, Δ -0.31, z -1.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 2.01±1.38 | S26.json 3.77 (fail)
   T-FOOD-10 held-out ref 1.16±0.05 | S26.json 1.05 (fail)
   T-HUN-2   fitted   ref 0.00±0.00 | S26.json 0.21 (inconclusive)
   T-HUN-4   held-out ref 0.78±0.47 | S26.json 0.30 (inconclusive)
   T-IGE-2   held-out ref 0.46±0.07 | S26.json 0.32 (fail)
   T-IGE-3   held-out ref 0.52±0.61 | S26.json 0.65 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S25 3.86 / 3.83 / 3.79 / 4.00 (mean 3.87, sd 0.09; used 0.21); S26 3.55 (z -1.3)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S25 2.74 / 2.58 / 2.58 / 2.47 (mean 2.59, sd 0.11; used 0.21); S26 2.49 (z -0.5)
T-RNG-5 distance by run (S25 group, then arms): [1.12, 1.26, 1.2, 1.52, 1.07]
T-IGE-3 distance by run: [1.21, 0.85, 0, 0, 0.65]

| Reserves ÷ store, % per day (OLS) | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.035 / -0.041 / -0.020 | -0.033 ± 0.009 | -0.027 (z +0.6) |
| female, other | -0.050 / -0.037 / -0.034 / -0.031 | -0.038 ± 0.009 | -0.031 (z +0.7) |
| female, lactating | -0.061 / -0.077 / -0.069 / -0.061 | -0.067 ± 0.008 | -0.057 (z +1.1) |
| juvenile 5–12 y | -0.060 / -0.062 / -0.078 / -0.048 | -0.062 ± 0.012 | -0.059 (z +0.3) |
| infant 2–5 y | -0.120 / -0.071 / -0.057 / -0.055 | -0.076 ± 0.030 | -0.051 (z +0.7) |
| infant 0.5–2 y | -0.088 / -0.085 / -0.095 / -0.070 | -0.084 ± 0.010 | -0.068 (z +1.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.79 / 2.80 | 2.79 ± 0.01 | 2.81 (z +2.3) |
| 1–2 y | 3.43 / 3.46 / 3.46 / 3.46 | 3.45 ± 0.01 | 3.47 (z +1.0) |
| 2–3 y | 3.39 / 3.44 / 3.49 / 3.49 | 3.45 ± 0.05 | 3.47 (z +0.3) |
| 3–4 y | 3.49 / 3.47 / 3.50 / 3.47 | 3.48 ± 0.01 | 3.49 (z +0.4) |

| Milk drunk, kcal per infant-day | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- |
| 0.5–1 y | 275 / 278 / 278 / 278 | 277 ± 1 | 278 (z +0.5) |
| 1–2 y | 278 / 278 / 276 / 279 | 278 ± 1 | 276 (z -1.3) |
| 2–3 y | 263 / 244 / 254 / 257 | 255 ± 8 | 257 (z +0.2) |
| 3–4 y | 253 / 251 / 266 / 247 | 255 ± 8 | 248 (z -0.7) |

| Mothers' balance, kcal/day by infant age | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- |
| 0.5–1 y | -36 / -35 / -31 / -29 | -33 ± 3 | -23 (z +2.6) |
| 1–2 y | -38 / -41 / -42 / -37 | -39 ± 3 | -34 (z +1.8) |
| 2–3 y | -34 / -45 / -31 / -26 | -34 ± 8 | -36 (z -0.3) |
| 3–4 y | -32 / -29 / -23 / -31 | -29 ± 4 | -21 (z +1.8) |

| Ground km / eating min / fruit share | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.21 / 2.24 / 2.21 / 2.05 | 2.18 ± 0.09 | 2.21 (z +0.3) |
| adult male: eatingMin | 232.60 / 232.33 / 231.98 / 229.39 | 231.57 ± 1.48 | 230.84 (z -0.4) |
| adult male: fruitShare | 0.84 / 0.85 / 0.84 / 0.86 | 0.85 ± 0.01 | 0.85 (z -0.0) |
| female, other: groundKm | 1.69 / 1.66 / 1.69 / 1.65 | 1.67 ± 0.02 | 1.65 (z -0.8) |
| female, other: eatingMin | 237.14 / 240.04 / 234.28 / 234.50 | 236.49 ± 2.70 | 234.83 (z -0.6) |
| female, other: fruitShare | 0.60 / 0.60 / 0.63 / 0.62 | 0.61 ± 0.01 | 0.60 (z -0.8) |
| female, lactating: groundKm | 2.10 / 2.13 / 2.04 / 2.03 | 2.07 ± 0.05 | 2.05 (z -0.5) |
| female, lactating: eatingMin | 302.78 / 307.30 / 301.76 / 305.11 | 304.24 ± 2.48 | 303.00 (z -0.4) |
| female, lactating: fruitShare | 0.64 / 0.62 / 0.65 / 0.64 | 0.64 ± 0.01 | 0.64 (z +0.2) |
| juvenile 5–12 y: groundKm | 2.18 / 2.17 / 2.08 / 2.09 | 2.13 ± 0.05 | 2.16 (z +0.5) |
| juvenile 5–12 y: eatingMin | 273.50 / 272.26 / 276.65 / 272.21 | 273.66 ± 2.09 | 260.41 (z -5.7) |
| juvenile 5–12 y: fruitShare | 0.84 / 0.85 / 0.83 / 0.85 | 0.85 ± 0.01 | 0.86 (z +1.5) |

| Row (pooled) | Band | S25 runs | S25 mean ± SD | S26 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.376 / 0.377 / 0.377 / 0.370 | 0.375 ± 0.003 | 0.377 |
| T-ACT-2 | 0.12–0.25 | 0.183 / 0.191 / 0.183 / 0.175 | 0.183 ± 0.007 | 0.185 |
| T-ACT-3 | 0.08–0.18 | 0.087 / 0.089 / 0.091 / 0.096 | 0.091 ± 0.004 | 0.094 |
| T-ACT-4 | 0.3–0.47 | 0.395 / 0.378 / 0.385 / 0.392 | 0.388 ± 0.007 | 0.369 |
| T-PTY-1 | 3–9 | 4.051 / 4.137 / 3.882 / 4.093 | 4.041 ± 0.111 | 4.040 |
| T-RNG-4 | 1.5–3.5 | 1.896 / 1.913 / 1.902 / 1.726 | 1.859 ± 0.089 | 1.979 |
| T-HUN-1 | 5–25 | 17.362 / 24.548 / 19.359 / 17.323 | 19.648 ± 3.402 | 19.381 |
| T-HUN-2 | 0.5–0.8 | 0.610 / 0.500 / 0.574 / 0.649 | 0.583 ± 0.063 | 0.438 |
| T-HUN-3 | 0.05–0.4 | 0.035 / 0.073 / 0.054 / 0.052 | 0.054 ± 0.016 | 0.058 |
| T-FOOD-2 | 0.6–0.78 | 0.758 / 0.755 / 0.759 / 0.783 | 0.764 ± 0.013 | 0.764 |
| T-FOOD-4 | 4–15 | 7.997 / 8.199 / 8.134 / 8.248 | 8.145 ± 0.109 | 8.095 |
| T-FOOD-6 | 2–7 | 4.817 / 4.769 / 4.863 / 4.864 | 4.828 ± 0.045 | 4.950 |
| T-FOOD-10 | 0.08–0.3 | 0.549 / 0.573 / 0.549 / 0.552 | 0.556 ± 0.012 | 0.532 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 6.357 / 10.029 / 10.860 / 6.141 | 8.347 ± 2.448 | 12.158 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.971 / 1.000 / 1.000 | 0.993 ± 0.014 | 0.964 |
| T-PAT-1 | 0.1–0.5 | 0.070 / 0.124 / 0.054 / 0.108 | 0.089 ± 0.032 | 0.077 |
| T-PAT-6 | 0.4–0.7 | 0.724 / 0.655 / 0.600 / 0.552 | 0.633 ± 0.074 | 0.743 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.000 |
| T-SOC-3 | 0.45–0.8 | 0.714 / 0.699 / 0.707 / 0.727 | 0.712 ± 0.012 | 0.721 |
| T-SOC-5 | 0.2–0.7 | 0.610 / 0.609 / 0.576 / 0.539 | 0.584 ± 0.034 | 0.523 |
| T-SOC-9 | 0.08–0.22 | 0.198 / 0.150 / 0.114 / 0.102 | 0.141 ± 0.043 | 0.125 |
S25 T-ACT-2 by sex: {'male': 0.203, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.113, 'female': 0.065}
S25c1 T-ACT-2 by sex: {'male': 0.208, 'female': 0.177}; T-ACT-3 by sex: {'male': 0.122, 'female': 0.062}
S25c2 T-ACT-2 by sex: {'male': 0.201, 'female': 0.168}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.063}
S25c3 T-ACT-2 by sex: {'male': 0.193, 'female': 0.16}; T-ACT-3 by sex: {'male': 0.135, 'female': 0.064}
S26 T-ACT-2 by sex: {'male': 0.216, 'female': 0.16}; T-ACT-3 by sex: {'male': 0.123, 'female': 0.07}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S25: 2.10 ÷ 2.21 = 0.950
  S25c1: 2.13 ÷ 2.24 = 0.949
  S25c2: 2.04 ÷ 2.21 = 0.922
  S25c3: 2.03 ÷ 2.05 = 0.992
  S26: 2.05 ÷ 2.21 = 0.927

/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s26/S26-rhythm5.json: adults out of a nest 1.97% of night; T-RHY-5 0.0196; night deaths 1; deaths 1

bench reference runs: ['S25', 'S25c1', 'S25c2', 'S25c3']; energy reference runs: ['S25', 'S25c1', 'S25c2', 'S25c3']; arms: ['S27']
  S25: 7cd6bb1 dirty 0 prescriptions 43
  S25c1: 7cd6bb1 dirty 0 prescriptions 43
  S25c2: 7cd6bb1 dirty 0 prescriptions 43
  S25c3: 7cd6bb1 dirty 0 prescriptions 43
  S27: 28d249e dirty 0 prescriptions 42

confirm, reference custom (4 runs), rows counted in all runs: fitted 17, held-out 15
  fitted             (17 rows) ref 1.23, 1.02, 1.11, 1.05 (mean 1.10, sd 0.09; used 0.30) | S27.json: 0.98, Δ -0.12, z -0.4 (inside noise)
  held-out           (15 rows) ref 9.88, 7.07, 5.27, 6.49 (mean 7.18, sd 1.95; used 1.95) | S27.json: 5.76, Δ -1.41, z -0.6 (inside noise)
  held-out w/o rare  (12 rows) ref 3.86, 3.83, 3.79, 4.00 (mean 3.87, sd 0.09; used 0.21) | S27.json: 4.18, Δ +0.31, z +1.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-BRD-1   held-out ref 2.01±1.38 | S27.json 1.12 (fail)
   T-FOOD-10 held-out ref 1.16±0.05 | S27.json 1.62 (fail)
   T-HUN-4   held-out ref 0.78±0.47 | S27.json 0.18 (inconclusive)
   T-IGE-3   held-out ref 0.52±0.61 | S27.json 0.28 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (12 rows): S25 3.86 / 3.83 / 3.79 / 4.00 (mean 3.87, sd 0.09; used 0.21); S27 4.18 (z +1.3)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (11 rows): S25 2.74 / 2.58 / 2.58 / 2.47 (mean 2.59, sd 0.11; used 0.21); S27 3.02 (z +1.8)
T-RNG-5 distance by run (S25 group, then arms): [1.12, 1.26, 1.2, 1.52, 1.16]
T-IGE-3 distance by run: [1.21, 0.85, 0, 0, 0.28]

| Reserves ÷ store, % per day (OLS) | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- |
| adult male | -0.035 / -0.035 / -0.041 / -0.020 | -0.033 ± 0.009 | -0.034 (z -0.2) |
| female, other | -0.050 / -0.037 / -0.034 / -0.031 | -0.038 ± 0.009 | -0.039 (z -0.1) |
| female, lactating | -0.061 / -0.077 / -0.069 / -0.061 | -0.067 ± 0.008 | -0.062 (z +0.5) |
| juvenile 5–12 y | -0.060 / -0.062 / -0.078 / -0.048 | -0.062 ± 0.012 | -0.069 (z -0.5) |
| infant 2–5 y | -0.120 / -0.071 / -0.057 / -0.055 | -0.076 ± 0.030 | -0.050 (z +0.8) |
| infant 0.5–2 y | -0.088 / -0.085 / -0.095 / -0.070 | -0.084 ± 0.010 | -0.086 (z -0.1) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- |
| 0.5–1 y | 2.79 / 2.80 / 2.79 / 2.80 | 2.79 ± 0.01 | 2.79 (z -0.8) |
| 1–2 y | 3.43 / 3.46 / 3.46 / 3.46 | 3.45 ± 0.01 | 3.44 (z -0.7) |
| 2–3 y | 3.39 / 3.44 / 3.49 / 3.49 | 3.45 ± 0.05 | 3.48 (z +0.5) |
| 3–4 y | 3.49 / 3.47 / 3.50 / 3.47 | 3.48 ± 0.01 | 3.45 (z -1.9) |

| Milk drunk, kcal per infant-day | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- |
| 0.5–1 y | 275 / 278 / 278 / 278 | 277 ± 1 | 279 (z +1.1) |
| 1–2 y | 278 / 278 / 276 / 279 | 278 ± 1 | 271 (z -4.1) |
| 2–3 y | 263 / 244 / 254 / 257 | 255 ± 8 | 252 (z -0.2) |
| 3–4 y | 253 / 251 / 266 / 247 | 255 ± 8 | 228 (z -2.9) |

| Mothers' balance, kcal/day by infant age | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- |
| 0.5–1 y | -36 / -35 / -31 / -29 | -33 ± 3 | -26 (z +1.9) |
| 1–2 y | -38 / -41 / -42 / -37 | -39 ± 3 | -40 (z -0.1) |
| 2–3 y | -34 / -45 / -31 / -26 | -34 ± 8 | -34 (z -0.0) |
| 3–4 y | -32 / -29 / -23 / -31 | -29 ± 4 | -32 (z -0.8) |

| Ground km / eating min / fruit share | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.21 / 2.24 / 2.21 / 2.05 | 2.18 ± 0.09 | 3.26 (z +11.0) |
| adult male: eatingMin | 232.60 / 232.33 / 231.98 / 229.39 | 231.57 ± 1.48 | 233.45 (z +1.1) |
| adult male: fruitShare | 0.84 / 0.85 / 0.84 / 0.86 | 0.85 ± 0.01 | 0.88 (z +2.6) |
| female, other: groundKm | 1.69 / 1.66 / 1.69 / 1.65 | 1.67 ± 0.02 | 2.24 (z +23.2) |
| female, other: eatingMin | 237.14 / 240.04 / 234.28 / 234.50 | 236.49 ± 2.70 | 228.80 (z -2.5) |
| female, other: fruitShare | 0.60 / 0.60 / 0.63 / 0.62 | 0.61 ± 0.01 | 0.67 (z +3.4) |
| female, lactating: groundKm | 2.10 / 2.13 / 2.04 / 2.03 | 2.07 ± 0.05 | 3.04 (z +18.5) |
| female, lactating: eatingMin | 302.78 / 307.30 / 301.76 / 305.11 | 304.24 ± 2.48 | 318.48 (z +5.1) |
| female, lactating: fruitShare | 0.64 / 0.62 / 0.65 / 0.64 | 0.64 ± 0.01 | 0.63 (z -0.8) |
| juvenile 5–12 y: groundKm | 2.18 / 2.17 / 2.08 / 2.09 | 2.13 ± 0.05 | 3.19 (z +17.5) |
| juvenile 5–12 y: eatingMin | 273.50 / 272.26 / 276.65 / 272.21 | 273.66 ± 2.09 | 280.82 (z +3.1) |
| juvenile 5–12 y: fruitShare | 0.84 / 0.85 / 0.83 / 0.85 | 0.85 ± 0.01 | 0.87 (z +2.8) |

| Row (pooled) | Band | S25 runs | S25 mean ± SD | S27 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.376 / 0.377 / 0.377 / 0.370 | 0.375 ± 0.003 | 0.379 |
| T-ACT-2 | 0.12–0.25 | 0.183 / 0.191 / 0.183 / 0.175 | 0.183 ± 0.007 | 0.132 |
| T-ACT-3 | 0.08–0.18 | 0.087 / 0.089 / 0.091 / 0.096 | 0.091 ± 0.004 | 0.093 |
| T-ACT-4 | 0.3–0.47 | 0.395 / 0.378 / 0.385 / 0.392 | 0.388 ± 0.007 | 0.426 |
| T-PTY-1 | 3–9 | 4.051 / 4.137 / 3.882 / 4.093 | 4.041 ± 0.111 | 4.511 |
| T-RNG-4 | 1.5–3.5 | 1.896 / 1.913 / 1.902 / 1.726 | 1.859 ± 0.089 | 2.563 |
| T-HUN-1 | 5–25 | 17.362 / 24.548 / 19.359 / 17.323 | 19.648 ± 3.402 | 20.903 |
| T-HUN-2 | 0.5–0.8 | 0.610 / 0.500 / 0.574 / 0.649 | 0.583 ± 0.063 | 0.606 |
| T-HUN-3 | 0.05–0.4 | 0.035 / 0.073 / 0.054 / 0.052 | 0.054 ± 0.016 | 0.060 |
| T-FOOD-2 | 0.6–0.78 | 0.758 / 0.755 / 0.759 / 0.783 | 0.764 ± 0.013 | 0.783 |
| T-FOOD-4 | 4–15 | 7.997 / 8.199 / 8.134 / 8.248 | 8.145 ± 0.109 | 9.339 |
| T-FOOD-6 | 2–7 | 4.817 / 4.769 / 4.863 / 4.864 | 4.828 ± 0.045 | 4.731 |
| T-FOOD-10 | 0.08–0.3 | 0.549 / 0.573 / 0.549 / 0.552 | 0.556 ± 0.012 | 0.656 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 |
| T-IGE-1 | 5–12 | 6.357 / 10.029 / 10.860 / 6.141 | 8.347 ± 2.448 | 6.443 |
| T-IGE-2 | 0.7–0.9 | 1.000 / 0.971 / 1.000 / 1.000 | 0.993 ± 0.014 | 1.000 |
| T-PAT-1 | 0.1–0.5 | 0.070 / 0.124 / 0.054 / 0.108 | 0.089 ± 0.032 | 0.085 |
| T-PAT-6 | 0.4–0.7 | 0.724 / 0.655 / 0.600 / 0.552 | 0.633 ± 0.074 | 0.538 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.000 / 0.000 | 0.000 ± 0.000 | 0.000 |
| T-SOC-3 | 0.45–0.8 | 0.714 / 0.699 / 0.707 / 0.727 | 0.712 ± 0.012 | 0.719 |
| T-SOC-5 | 0.2–0.7 | 0.610 / 0.609 / 0.576 / 0.539 | 0.584 ± 0.034 | 0.686 |
| T-SOC-9 | 0.08–0.22 | 0.198 / 0.150 / 0.114 / 0.102 | 0.141 ± 0.043 | 0.153 |
S25 T-ACT-2 by sex: {'male': 0.203, 'female': 0.167}; T-ACT-3 by sex: {'male': 0.113, 'female': 0.065}
S25c1 T-ACT-2 by sex: {'male': 0.208, 'female': 0.177}; T-ACT-3 by sex: {'male': 0.122, 'female': 0.062}
S25c2 T-ACT-2 by sex: {'male': 0.201, 'female': 0.168}; T-ACT-3 by sex: {'male': 0.125, 'female': 0.063}
S25c3 T-ACT-2 by sex: {'male': 0.193, 'female': 0.16}; T-ACT-3 by sex: {'male': 0.135, 'female': 0.064}
S27 T-ACT-2 by sex: {'male': 0.139, 'female': 0.127}; T-ACT-3 by sex: {'male': 0.123, 'female': 0.068}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S25: 2.10 ÷ 2.21 = 0.950
  S25c1: 2.13 ÷ 2.24 = 0.949
  S25c2: 2.04 ÷ 2.21 = 0.922
  S25c3: 2.03 ÷ 2.05 = 0.992
  S27: 3.04 ÷ 3.26 = 0.932

/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s26/S27-rhythm5.json: adults out of a nest 2.48% of night; T-RHY-5 0.0191; night deaths 0; deaths 1

Climbing cost, kcal/day (energy-diagnose; linear in metres climbed at a class's mass, src/sim/energy.ts:502), and true ground km/day
| class | S25 group climb (mean ± SD) | S26 climb | S27 climb | S25 group km | S26 km | S27 km |
| --- | --- | --- | --- | --- | --- | --- |
| adult male | 56.4 ± 1.4 | 49.4 (-12%) | 58.7 (+4%) | 2.18 | 2.21 | 3.26 |
| female, other | 35.4 ± 0.8 | 29.7 (-16%) | 35.2 (-0%) | 1.67 | 1.65 | 2.24 |
| female, pregnant | 33.2 ± 1.4 | 27.7 (-17%) | 35.0 (+5%) | 1.69 | 1.69 | 2.66 |
| female, lactating | 37.7 ± 0.7 | 34.3 (-9%) | 40.7 (+8%) | 2.07 | 2.05 | 3.04 |
| lact: infant 0.5–2 y | 40.6 ± 1.2 | 37.7 (-7%) | 43.4 (+7%) | 1.96 | 1.96 | 2.83 |
| lact: infant ≥ 2 y | 35.2 ± 0.6 | 31.3 (-11%) | 38.4 (+9%) | 2.18 | 2.12 | 3.23 |
| juvenile 5–12 y | 45.8 ± 0.6 | 36.6 (-20%) | 41.7 (-9%) | 2.13 | 2.16 | 3.19 |
| infant 2–5 y | 13.2 ± 0.6 | 11.0 (-17%) | 13.9 (+6%) | 0.31 | 0.26 | 0.44 |
| infant 0.5–2 y | 5.4 ± 0.4 | 4.0 (-25%) | 5.2 (-4%) | 0.17 | 0.13 | 0.23 |
```

**S26 against the predictions.** Prescriptions 43: held. Viability (no starvation) and night (1.97%, 0.0196): held.
Metres climbed lower, males −5 to −15%: held (−12%; −7% to −25% across classes, read as the climbing cost, which is
linear in metres climbed at a class's mass). Infants' reserves no worse: held (2–5 y −0.051 against −0.076 ± 0.030;
0.5–2 y −0.068 against −0.084 ± 0.010). Sums inside noise: held (fitted z +0.7, held-out +0.5, without the rare rows −1.3).
Walking is unchanged (adult males 2.21 km against 2.18 ± 0.09).

**S27 against the predictions.** Prescriptions 42: held. Viability (no starvation) and night (2.48%, 0.0191): held. Day
ranges longer, males 2.6–3.1 km: longer held, the size missed (3.26 km; females 2.24, nursing mothers 3.04, juveniles 3.19).
T-ACT-2 0.11–0.14: held (0.132, inside its band 0.12–0.25; males 0.139, females 0.127). Nursing mothers', juveniles' and
infants' reserves within 0.03 %/day of the group's: held (−0.062, −0.069, −0.050 and −0.086 against −0.067, −0.062, −0.076
and −0.084). Sums inside noise: held (fitted z −0.4, held-out −0.6, without the rare rows +1.3; the sensitivity without
T-RNG-5 is +1.8, not the registered test).

**Why S27's reserves hold where S24's fell (reported, not a test).** Intake rises with spending: adult males +48 kcal a
day in and +47 out, nursing mothers +45 and +33, juveniles +23 and +25 (energy-diagnose, S27 against the S25 group's
mean); the longer walks reach more fruit (males' fruit share 0.85 → 0.88, mothers' eating time 304 → 318 min). Climbing
returns to S25's level (males +4%) because more trees are reached, so crownMove's saving alone does not pay for the walk.
Not separated: whether crownMove or S25's `huntDrive` is why this combination holds where S24 (S22 + walkGait) did not
(no S25 + walkGait arm). Costs: departures before sunrise rise (T-FOOD-10 0.656 against 0.556 ± 0.012; the field band is
0.08–0.30), day ranges by the field observer lengthen inside their band (T-RNG-4 2.56 against 1.86), parties grow
slightly (T-PTY-1 4.51 against 4.04).

**Verdict.** S26 passes the keep rule for a correction. **S27 passes the keep rule (prescriptions fall, 43 → 42) and
replaces S25 as the best integrated candidate**: the walking speed is set by the body (`walkGait`) instead of a fixed
`walkMps`, and the extra walking pays for itself in food. The open cost is the pre-dawn departure share (T-FOOD-10),
off target on S25 too (0.556).

## S28q, a quick check of re-decision on S27 (registered 4 October 2026 before its run)

**S28q = S27 + E3d's `redecideValue` 2** (a fresh choice when a need changes level or the light changes phase; removes
`rgMaxAgeH` and `continueBonus`: 42 → 40). S18 passed alone on S17; S20 (with `huntPursuit`) was not adopted, and its
verdict asked that S18's costs (rest below its band; females' and young infants' reserves) get their own stage first.
**Reading to test, not assume:** those costs came from re-drawn choices under the fitted choice temperature (E3d's open
problem: the noise picked feeding options the animal could rank by rate), which `choiceBelief` removed in S21; on S27 the
re-decisions would then cost little. **Run:** quick mode (seeds 48 and 7, 30 + 30 days) plus energy-diagnose, from
bench-run3 at 28d249e (code identical to track-e for these switches), judged with judge_vs_reps.py against the S27 quick
group (S27q, S27q1–S27q3 by `rngSalt` 1, 2, 3); night safety from rhythm-metrics (seeds 48 and 7, 30 + 30).

**Predictions (against the S27q group).** 40 prescriptions (high). Viability and night safety pass (moderate). Sums inside
noise, with and without the rare rows (moderate). Rest (T-ACT-4) inside its band, 0.30–0.47 (low: S18 put it below).
Fruit share (T-FOOD-2) within the group's spread (moderate). Nursing mothers', juveniles' and young infants' reserves
within 0.03 %/day of the group's mean (low).

**Decision rule.** If the sums are inside noise, viability and night safety pass and rest stays in its band, a 5-seed
confirm (S28) is registered next; otherwise the costs go to a stage of their own, and `redecideValue` stays off the stack.

## S27q-noCM, an ablation of `crownMove` on S27 (registered 4 October 2026 before its run)

**S27q-noCM = S27 without `crownMove`** (= S25 + `walkGait`), quick mode (seeds 48 and 7, 30 + 30 days) plus
energy-diagnose, from bench-run3 at 28d249e, against the S27 quick group. **Question:** "S26 and S27 results" left open
whether `crownMove` or S25's `huntDrive` is why the body-set walk holds on S27 where S24 failed. If removing `crownMove`
alone brings back S24's cost, `crownMove` is why. **Predictions (against the S27q group).** 41 prescriptions (`crownMove` is
a correction; high). Climbing cost per class higher by 10–25% (moderate; S26 cut it 7–25%). Reserves: males', juveniles'
and nursing mothers' within the group's spread or lower by up to 0.03 %/day (low: S27's intake rose with its spending,
and climbing is a small share of the walk's cost). Sums inside noise (moderate). This is an ablation for attribution,
not a candidate: nothing is adopted from it.

### S28q and S27q-noCM results (bench-run3 28d249e, all clean; judged against the four S27q runs; printed by judge_s27q.py and night.py from the JSON)

No deaths in either arm.

```
bench reference runs: ['S27q', 'S27q1', 'S27q2', 'S27q3']; energy reference runs: ['S27q', 'S27q1', 'S27q2', 'S27q3']; arms: ['S28q', 'S27q-noCM']
  S27q: 28d249e dirty 0 prescriptions 42
  S27q1: 28d249e dirty 0 prescriptions 42
  S27q2: 28d249e dirty 0 prescriptions 42
  S27q3: 28d249e dirty 0 prescriptions 42
  S28q: 28d249e dirty 0 prescriptions 40
  S27q-noCM: 28d249e dirty 0 prescriptions 42

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | S28q.json: 2.61, Δ +0.74, z +0.9 (inside noise) | S27q-noCM.json: 1.12, Δ -0.75, z -0.9 (inside noise)
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | S28q.json: 3.21, Δ -0.60, z -0.4 (inside noise) | S27q-noCM.json: 5.07, Δ +1.25, z +0.9 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | S28q.json: 2.91, Δ -0.69, z -1.3 (inside noise) | S27q-noCM.json: 3.99, Δ +0.39, z +0.7 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.11±0.02 | S28q.json 0.31 (fail) | S27q-noCM.json 0.08 (fail)
   T-HUN-4   held-out ref 0.21±0.41 | S28q.json 0.30 (fail) | S27q-noCM.json 1.07 (fail)
   T-RNG-5   held-out ref 1.34±0.33 | S28q.json 0.40 (fail) | S27q-noCM.json 1.38 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (11 rows): S27q 3.45 / 4.04 / 3.73 / 3.22 (mean 3.61, sd 0.36; used 0.48); S28q 2.91 (z -1.3); S27q-noCM 3.99 (z +0.7)
Sensitivity, not the registered test: held-out without T-HUN-4, T-BRD-1, T-IGE-3 and T-RNG-5 (10 rows): S27q 2.44 / 2.51 / 2.62 / 1.52 (mean 2.27, sd 0.51; used 0.51); S28q 2.52 (z +0.4); S27q-noCM 2.62 (z +0.6)
T-RNG-5 distance by run (S27q group, then arms): [1.01, 1.53, 1.11, 1.7, 0.4, 1.38]
T-IGE-3 distance by run: [None, None, None, None, None, None]

| Reserves ÷ store, % per day (OLS) | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- |
| adult male | -0.002 / +0.007 / +0.001 / +0.003 | +0.002 ± 0.004 | +0.003 (z +0.2) | +0.002 (z -0.1) |
| female, other | -0.017 / +0.008 / -0.007 / +0.038 | +0.006 ± 0.024 | -0.054 (z -2.2) | +0.005 (z -0.0) |
| female, lactating | +0.005 / -0.008 / -0.005 / +0.006 | -0.000 ± 0.007 | -0.036 (z -4.6) | +0.004 (z +0.6) |
| juvenile 5–12 y | -0.015 / -0.016 / -0.019 / -0.059 | -0.027 ± 0.021 | -0.086 (z -2.5) | +0.016 (z +1.8) |
| infant 2–5 y | +0.007 / -0.036 / -0.016 / +0.001 | -0.011 ± 0.019 | -0.016 (z -0.2) | +0.002 (z +0.6) |
| infant 0.5–2 y | +0.012 / +0.011 / +0.006 / +0.007 | +0.009 ± 0.003 | -0.051 (z -16.6) | +0.008 (z -0.2) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Growth, kg/y (unweaned infants) | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 2.73 / 2.72 / 2.70 / 2.72 | 2.72 ± 0.01 | 2.62 (z -6.9) | 2.71 (z -0.5) |
| 1–2 y | 3.48 / 3.45 / 3.47 / 3.48 | 3.47 ± 0.01 | 3.43 (z -2.5) | 3.47 (z +0.0) |
| 2–3 y | 3.53 / 3.53 / 3.52 / 3.53 | 3.53 ± 0.00 | 3.45 (z -13.9) | 3.52 (z -1.3) |
| 3–4 y | 3.47 / 3.48 / 3.49 / 3.48 | 3.48 ± 0.01 | 3.46 (z -2.2) | 3.45 (z -3.3) |

| Milk drunk, kcal per infant-day | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- |
| 0.5–1 y | 284 / 284 / 282 / 281 | 283 ± 2 | 272 (z -5.8) | 281 (z -0.7) |
| 1–2 y | 280 / 275 / 286 / 278 | 280 ± 5 | 259 (z -3.9) | 277 (z -0.5) |
| 2–3 y | 289 / 283 / 291 / 294 | 289 ± 5 | 242 (z -9.3) | 271 (z -3.6) |
| 3–4 y | 237 / 248 / 245 / 256 | 246 ± 8 | 220 (z -2.9) | 232 (z -1.6) |

| Mothers' balance, kcal/day by infant age | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- |
| 0.5–1 y | +11 / +3 / +17 / +4 | +9 ± 7 | -46 (z -7.4) | +15 (z +0.9) |
| 1–2 y | -12 / +9 / -6 / +6 | -1 ± 10 | +2 (z +0.3) | +1 (z +0.2) |
| 2–3 y | -2 / -4 / +1 / +2 | -1 ± 3 | -1 (z -0.1) | +11 (z +4.1) |
| 3–4 y | -6 / -18 / -4 / +1 | -7 ± 8 | -16 (z -1.1) | -11 (z -0.5) |

| Ground km / eating min / fruit share | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 2.87 / 2.98 / 2.86 / 2.53 | 2.81 ± 0.19 | 4.02 (z +5.5) | 2.70 (z -0.5) |
| adult male: eatingMin | 233.50 / 234.82 / 233.74 / 230.72 | 233.19 ± 1.75 | 242.40 (z +4.7) | 234.03 (z +0.4) |
| adult male: fruitShare | 0.91 / 0.90 / 0.91 / 0.91 | 0.91 ± 0.00 | 0.93 (z +4.6) | 0.91 (z +1.5) |
| female, other: groundKm | 2.01 / 2.05 / 2.24 / 1.99 | 2.08 ± 0.12 | 3.09 (z +7.8) | 2.01 (z -0.5) |
| female, other: eatingMin | 232.78 / 221.89 / 233.42 / 234.87 | 230.74 ± 5.97 | 244.45 (z +2.1) | 239.35 (z +1.3) |
| female, other: fruitShare | 0.66 / 0.71 / 0.66 / 0.67 | 0.68 ± 0.03 | 0.66 (z -0.7) | 0.63 (z -1.7) |
| female, lactating: groundKm | 2.44 / 2.45 / 2.57 / 2.46 | 2.48 ± 0.06 | 3.66 (z +17.9) | 2.54 (z +0.9) |
| female, lactating: eatingMin | 310.16 / 313.31 / 316.04 / 313.31 | 313.20 ± 2.41 | 330.97 (z +6.6) | 320.76 (z +2.8) |
| female, lactating: fruitShare | 0.64 / 0.62 / 0.63 / 0.64 | 0.63 ± 0.01 | 0.63 (z -0.2) | 0.61 (z -2.1) |
| juvenile 5–12 y: groundKm | 2.75 / 2.88 / 2.96 / 2.74 | 2.83 ± 0.11 | 3.87 (z +8.6) | 2.86 (z +0.2) |
| juvenile 5–12 y: eatingMin | 281.27 / 280.49 / 283.56 / 297.76 | 285.77 ± 8.10 | 294.18 (z +0.9) | 292.37 (z +0.7) |
| juvenile 5–12 y: fruitShare | 0.89 / 0.90 / 0.88 / 0.82 | 0.87 ± 0.04 | 0.88 (z +0.2) | 0.89 (z +0.5) |

| Row (pooled) | Band | S27q runs | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.378 / 0.377 / 0.378 / 0.368 | 0.375 ± 0.005 | 0.406 | 0.387 |
| T-ACT-2 | 0.12–0.25 | 0.116 / 0.121 / 0.125 / 0.103 | 0.116 ± 0.009 | 0.158 | 0.108 |
| T-ACT-3 | 0.08–0.18 | 0.099 / 0.088 / 0.102 / 0.104 | 0.098 ± 0.007 | 0.090 | 0.105 |
| T-ACT-4 | 0.3–0.47 | 0.418 / 0.406 / 0.410 / 0.450 | 0.421 ± 0.020 | 0.412 | 0.397 |
| T-PTY-1 | 3–9 | 4.781 / 4.630 / 4.487 / 4.448 | 4.586 ± 0.151 | 4.944 | 4.848 |
| T-RNG-4 | 1.5–3.5 | 2.424 / 2.179 / 2.519 / 1.934 | 2.264 ± 0.262 | 3.558 | 2.235 |
| T-HUN-1 | 5–25 | 13.886 / 45.625 / 22.182 / 22.182 | 25.969 ± 13.675 | 49.863 | 15.870 |
| T-HUN-2 | 0.5–0.8 | 0.667 / 0.737 / 0.364 / 0.700 | 0.617 ± 0.171 | 0.562 | 0.667 |
| T-HUN-3 | 0.05–0.4 | 0.057 / 0.080 / 0.078 / 0.057 | 0.068 ± 0.013 | 0.069 | 0.070 |
| T-FOOD-2 | 0.6–0.78 | 0.819 / 0.766 / 0.818 / 0.830 | 0.808 ± 0.029 | 0.820 | 0.794 |
| T-FOOD-4 | 4–15 | 9.426 / 9.249 / 8.891 / 9.682 | 9.312 ± 0.332 | 13.965 | 9.214 |
| T-FOOD-6 | 2–7 | 4.072 / 3.871 / 4.115 / 3.719 | 3.944 ± 0.184 | 3.663 | 4.381 |
| T-FOOD-10 | 0.08–0.3 | 0.599 / 0.643 / 0.607 / 0.503 | 0.588 ± 0.060 | 0.599 | 0.613 |
| T-HUN-7 | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.000 | 1.000 ± 0.000 | 1.000 | 1.000 |
| T-IGE-1 | 5–12 | 9.167 / 3.010 / 10.398 / 0.000 | 5.644 ± 4.960 | 19.279 | 6.101 |
| T-PAT-1 | 0.1–0.5 | 0.038 / 0.114 / 0.153 / 0.039 | 0.086 ± 0.057 | 0.115 | 0.000 |
| T-PAT-6 | 0.4–0.7 | 0.250 / 0.667 / 0.875 / 0.250 | 0.510 ± 0.312 | 0.375 | 0.000 |
| T-PAT-7 | 0.15–0.45 | 0.000 / 0.000 / 0.250 / 0.000 | 0.062 ± 0.125 | 0.000 | — |
| T-SOC-3 | 0.45–0.8 | 0.535 / 0.646 / 0.410 / 0.612 | 0.551 ± 0.105 | 0.782 | 0.428 |
| T-SOC-5 | 0.2–0.7 | 0.521 / 0.558 / 0.332 / 0.358 | 0.442 ± 0.114 | 0.443 | 0.534 |
| T-SOC-9 | 0.08–0.22 | 0.180 / 0.043 / 0.132 / 0.342 | 0.174 ± 0.125 | 0.119 | 0.205 |
S27q T-ACT-2 by sex: {'male': 0.125, 'female': 0.109}; T-ACT-3 by sex: {'male': 0.127, 'female': 0.074}
S27q1 T-ACT-2 by sex: {'male': 0.136, 'female': 0.109}; T-ACT-3 by sex: {'male': 0.123, 'female': 0.06}
S27q2 T-ACT-2 by sex: {'male': 0.137, 'female': 0.114}; T-ACT-3 by sex: {'male': 0.123, 'female': 0.084}
S27q3 T-ACT-2 by sex: {'male': 0.106, 'female': 0.1}; T-ACT-3 by sex: {'male': 0.149, 'female': 0.069}
S28q T-ACT-2 by sex: {'male': 0.177, 'female': 0.141}; T-ACT-3 by sex: {'male': 0.123, 'female': 0.062}
S27q-noCM T-ACT-2 by sex: {'male': 0.12, 'female': 0.098}; T-ACT-3 by sex: {'male': 0.148, 'female': 0.069}

True ground path, nursing mothers ÷ adult males (energy-diagnose; reported, not the test):
  S27q: 2.44 ÷ 2.87 = 0.848
  S27q1: 2.45 ÷ 2.98 = 0.821
  S27q2: 2.57 ÷ 2.86 = 0.898
  S27q3: 2.46 ÷ 2.53 = 0.972
  S28q: 3.66 ÷ 4.02 = 0.911
  S27q-noCM: 2.54 ÷ 2.70 = 0.940

Climbing cost, kcal/day (energy-diagnose; linear in metres climbed at a class's mass)
| class | S27q mean ± SD | S28q | S27q-noCM |
| --- | --- | --- | --- |
| adult male | 59.0 ± 2.4 | 96.2 (+63%) | 65.7 (+11%) |
| female, other | 34.2 ± 2.0 | 56.9 (+67%) | 39.7 (+16%) |
| female, pregnant | 32.4 ± 1.6 | 50.2 (+55%) | 39.0 (+20%) |
| female, lactating | 37.5 ± 1.2 | 56.8 (+52%) | 42.1 (+12%) |
| lact: infant 0.5–2 y | 39.2 ± 1.0 | 58.9 (+50%) | 44.8 (+14%) |
| lact: infant ≥ 2 y | 35.8 ± 2.6 | 54.7 (+53%) | 39.4 (+10%) |
| juvenile 5–12 y | 41.5 ± 1.8 | 56.5 (+36%) | 52.5 (+26%) |
| infant 2–5 y | 13.3 ± 0.9 | 17.7 (+34%) | 15.8 (+19%) |
| infant 0.5–2 y | 5.9 ± 0.3 | 7.3 (+25%) | 7.6 (+29%) |

/Users/juanbermudez/Desktop/MGOGO/.claude/worktrees/bench-run3/artifacts/validation/e/s27q/S28q-rhythm.json: adults out of a nest 2.26% of night; T-RHY-5 0.0194; night deaths 0; deaths 0
```

**S28q against the predictions.** 40 prescriptions: held. Viability and night safety (2.26%, 0.0194): held. Sums inside
noise: held (fitted z +0.9, held-out −0.4, without the rare rows −1.3). Rest inside its band: held (T-ACT-4 0.412). Fruit
share within the group's spread: held (T-FOOD-2 0.820 against 0.808 ± 0.029). Nursing mothers', juveniles' and young
infants' reserves within 0.03 %/day of the group's mean: **missed** (−0.036 against −0.000; −0.086 against −0.027; −0.051
against +0.009; other females −0.054 against +0.006).

**The registered reading is not supported.** With the choice noise gone, re-deciding still adds walking (adult males
2.81 → 4.02 km a day, nursing mothers 2.48 → 3.66), climbing (+25% to +67% by class) and feeding time (nursing mothers
313 → 331 min), and lowers the reserves above. Other rows move with it: T-RNG-4 3.56 (band top 3.5), T-FOOD-4 14.0 against
9.3 ± 0.3, T-HUN-1 49.9 (group 26.0 ± 13.7; band 5–25), T-IGE-1 19.3 (group 5.6 ± 5.0; band 5–12).

**Decision (the registered rule).** The sums are inside noise, viability and night safety pass and rest stays in its
band, so the 5-seed confirm S28 is registered next. The energy cost is reported with it, as S13's and S16's were; the
keep rule decides.

**S27q-noCM against the predictions.** 41 prescriptions: **missed, a counting slip in the registration** (42: `crownMove`
is a correction and removes nothing, so S27 without it is S25 + `walkGait`, 43 − 1). Climbing cost 10–25% higher: held
for 7 of 9 classes (+10% to +20%; juveniles +26%, infants 0.5–2 y +29%). Reserves within the group's spread or lower by
up to 0.03 %/day: held (every class inside its spread). Sums inside noise: held (fitted z −0.9, held-out +0.9, without the
rare rows +0.7). **Reading:** removing `crownMove` does not bring back S24's cost on S27, so `crownMove` is not why the
body-set walk holds here (moderate confidence: 2 seeds, 30 days). What differs from S24 is S25's `huntDrive` and the
reference (S24 was judged against S21's group); not separated further.

## S28 confirm (registered 4 October 2026 before its run)

**S28 = S27 + E3d's `redecideValue` 2** (40 prescriptions). **Reference group:** S27 in confirm mode (28d249e, `s26/S27`)
plus three re-draws by `rngSalt` 1, 2, 3 (S27c1–S27c3, `s28/`), all from bench-run3 at 28d249e. Keep rule: standard
(prescriptions fall, 42 → 40); rare rows per amendment 3; night safe. Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days; judged with `integrator/judge_s27group.py`.

**Predictions (against the S27 group; moderate confidence unless stated).** 40 prescriptions (high). Viability and night
safety pass. Sums inside noise (low: the quick run's held-out without the rare rows was better, z −1.3). Adult males walk
3.6–4.6 km a day (S27 3.26). Adults' climbing cost up by 25% or more. Nursing mothers', juveniles' and infants' 0.5–2 y
reserves lower than the group's mean by more than its SD. T-RNG-4 above 3.0. Rest (T-ACT-4) inside its band.

## S29 confirm (registered 4 October 2026 before its run)

**S29 = S27 + E5f's `departValue` 2** (an unanswered departure attempt ends in the initiator's own decision, valued over
its settled companions; `departRetryMin` and `departPersistMaxMin` out: 39 with the corrected ledger, S27 41).
**Reference group:** the S27 confirm group (S27 at 28d249e plus S27c1–S27c3 by `rngSalt` 1, 2, 3, bench-run3); the arm runs
from bench-run4 moved to this commit (E5f's code behind a switch that is 0 in S27; S27's behaviour is unchanged). Keep rule:
standard (prescriptions fall, 41 → 39 on the corrected ledger); rare rows per amendment 3; night safe. Bench,
energy-diagnose and rhythm-metrics, 5 seeds, 30 + 60 days; judged with `integrator/judge_s27group.py`.

**Predictions (against the S27 group; low confidence unless stated: E5f's quick runs are the only evidence).** 39
prescriptions (high). Viability and night safety pass (moderate). Sums inside noise (moderate). Parties a little smaller:
T-PTY-1 lower than the group's mean by 0.1–0.5. Nursing mothers and juveniles walk 0.1–0.4 km a day more. Nursing mothers'
and young infants' reserves within 0.03 %/day of the group's mean.

## S30 confirm (registered 4 October 2026 before its run)

**S30 = S27 + E4o's `bodyRules` 1** (a guardian deters and defends while its ward's assessed chance against that threat is
below even; `guardMaxAgeY` out: 40 on the corrected ledger, S27 41). **Reference group:** the S27 confirm group (S27 at
28d249e plus S27c1–S27c3, bench-run3); the arm runs from bench-run moved to this commit (`bodyRules` is 0 in S27).
Keep rule: standard (41 → 40); rare rows per amendment 3; night safe. Bench, energy-diagnose and rhythm-metrics, 5 seeds,
30 + 60 days; judged with `integrator/judge_s27group.py`.

**Predictions (against the S27 group; moderate confidence unless stated).** 40 prescriptions (high). Viability and night
safety pass. Sums inside noise. Reserves of every class within the group's spread (E4o's quick run: within 1.2 SD except
one infant's fatal illness). Grooming (T-ACT-3) at or below the group's mean (low: E4o's quick run 0.082 against
0.098 ± 0.007).
