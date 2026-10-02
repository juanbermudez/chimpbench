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
