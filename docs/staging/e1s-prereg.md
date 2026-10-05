# E1s: digestion-limited food value (registered 5 October 2026, before any code)

Owner: agent `e1s-gut` (branch `e1s-gut` from `track-e`; development iterations); the integrator runs and judges the
confirm. Basis: E1r's verdict and proposal (`docs/staging/e1r-prereg.md` §11–12, merged at a9739c3).

## 1. Why

E1r: in the lean season the small and reproducing females' absorbed energy falls because their foregut is the limit
(full in 76–89% of their eating minutes in March–April), and a valuation trap keeps depleted animals losing after fruit
returns. Under `forageRate` a crown is worth a bout capped by the foregut's room counted in drupe units (nothing at a
full gut), while the fallback where the animal stands keeps its full rate value whatever the gut holds
(`candidates.ts:498–500`, `intake.ts` `leafWorth` and `netRateShare`, `energy.ts` `boutRoom`). Depleted animals, kept
hungry by E1i's reserve-weighted satiation, fill the gaps with the food the gut passes least energy from (fallback 1.57
absorbed kcal per g of dry matter against figs 1.83 and drupes 2.36). Five of S39's six starvation deaths follow.

## 2. Mechanism (switch `gutValue`, 0 by default; read only with `energyLedger`, `ledgerDigesta`, `ledgerDrive` and `forageRate` 1)

Every feeding option (a crown in view, a trip, a joined trip, the fallback where the animal stands) is worth the energy
of the bout the gut allows, over the bout's time: the foregut's present room filled at the food's ingestion rate (its
kcal per minute at the animal's size and skill, as now), then the food at the rate a full foregut passes it (the
foregut's dry-matter capacity ÷ `ledgerGutEmptyH` × that food's own energy per gram of dry matter), up to the crop share
and the animal's need, every term in the food's own units (figs as figs). At a full gut foods rank by the energy per gram
the gut passes; with room in the gut they rank by ingestion rate, as now. A correction: no prescription is removed, and
none may be added (no new constant; `gutValue` is a design switch). At 0 the code is today's, bit for bit.

Theory: the digestive rate model (verlindenWiley1989, not verified; research.md "Addendum: E1r lean season"), entered
as a design assumption. Directions: knott2005 (gut capacity limits feeding longer), harrisonMarshall2011 (fruit is
pursued; pith and leaves are fillers). **Inputs:** none new (each food's measured energy and dry matter per feeding
minute, uwimbabazi2019 [H], already in the registry; the model's own gut). No field rate enters.

## 3. Development (agent; at most 3 iterations, each logged in this file before its run)

Runs: S39 + `gutValue` 1, rngSalt 0, seeds 48 and 7 only, `e-bench --m6` (30 + 180 days) with `--animal-days`, from a
frozen checkout of the iteration's commit; one job at a time while the load is above 8. Reference: S39's 6-month runs
at rngSalt 0 (`bench-run/…/e/runs/M6-S39`, seeds 48 and 7: class readouts and the day-210 checkpoint worlds) and E1r's
R3 (S39 rngSalt 2, seed 48, with `--animal-days`).

**Pass to the confirm** (all four): (1) no starvation death on either seed; (2) at day 180, fewer animals below −0.3 of
their store than S39 on the same seeds, and the lowest individual reserve higher; (3) eating minutes of the juvenile,
adolescent and pregnant females still rise from November–December to March–April; (4) viability passes. Reported, not
judged: the behaviour-by-reserve table (E1r §9.6), the fallback share of plant energy and of eating time by class, km by
phase, the class readout by month.

**Tests:** at `gutValue` 0, identical decision values on a saved world and unchanged compressed goldens, field pin test
(`tests/sim-track-e.test.ts`) and golden hashes; at 1, a unit test that at a full foregut a drupe crown in reach outranks
the fallback here, and that with an empty gut the ranking equals today's; determinism (batching).

## 4. Confirm (integrator, from a frozen detached checkout)

S39 + `gutValue` 1 with `rngSalt` 0, 1, 2, 3 (four runs × seeds 48, 7, 21, 5, 11) at 6 months, then each extended to 12
months from its checkpoint (the runner, `--from`). References: S39's four 6-month and four 12-month runs (Part C).

- **6 months:** viability in all four runs; the keep rule (e-noise.md amendment 4: the rngSalt 0 run's z against S39's
  group, |z| > 2 a result; held-out and held-out without the rare rows not worse beyond noise); night safety (adults out
  of a nest ≤ 3.3% of night, T-RHY-5 ≤ 0.033); prescriptions not up.
- **12 months (the decision):** starvation deaths over the 20 seed-runs, against S39's 6.
  - **Viable** (S39 + E1s becomes the base): 0 starvation deaths, and the 12-month keep rule against S39's group.
  - **Kept as a correction, base still not viable:** 1 or 2 starvation deaths (P ≈ 0.06 of ≤ 2 if the rate were
    unchanged at 6), and the keep rule. The remaining deaths go to the stages E1r left open (§6).
  - **Killed:** 3 or more starvation deaths, or eating minutes no longer rising as fruit falls, or the keep rule fails.
- Reported at both horizons: each class's reserve trajectory and its lowest monthly mean (S39: juveniles −0.21); the
  lean-season dip's direction (class means dip and recover); feeding minutes by month; the E1r readouts.

## 5. Predictions (integrator, low confidence)

Starvation falls but does not reach 0 (the immigrant females' access and conception without an energy gain remain);
depleted animals recover once fruit returns; the females' fallback share and their March–April eating minutes fall;
the fig months' walking falls a little; held-out sums move inside noise.

## 6. Left for other stages (not E1s)

Immigrant females' access (resident females' charges; their counterstrategy of staying near males, kahlenberg2008);
conception without a sustained energy gain (emeryThompson2012); the fallback's bulk and site (wadging; Kanyawara's pith
and leaves against Ngogo's phenology, potts2011, watts2012b): an audit before any input moves; no fat stored in good
months (no magnitude source).
