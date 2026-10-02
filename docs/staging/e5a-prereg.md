# E5a pre-registration: party cohesion from first principles

Status: skeleton committed at the start of the stage (2 October 2026, branch `e5a-cohesion`, from `track-e` 10c8ded),
before any run and before any code change. Track E, stage E5 (emergence of fission–fusion). Rule served: field values
of behaviour are targets, never inputs. This stage **removes** weights tuned to party size; it tunes no new one.

## 0. The problem

- In the field profile, party cohesion rests on weights tuned in C5a against T-PTY-1, T-ACT-2 and T-RNG-4
  (`partyFollowBase` 0.7, `partyFollowW` 1.0, `partyFollowMaleW` 0.4, `partyStayW` 0.05; `partyFollowHungerW` is 0 in
  the field profile) and on `joinHooW` 0.094 (fitted in C13e to gruberZuberbuhler2013's 71.4% recruitment) and
  `joinSocialW` 0.55 (notes: tuned to a target row). The prescription tool (`scripts/lib/prescriptions.ts`) counts all
  six active ones as outcome-encoding (checked 2 October with `classify` on the field profile under R: partyFollowBase,
  partyFollowMaleW, partyFollowW, partyStayW rule 2 "fitted to a target row"; joinHooW rule 6 "fitted"; joinSocialW
  rule 2). So the tool sees them; no tool defect on that count.
- E4g found a defect those weights compensate (`src/sim/candidates.ts:489`, the party-follow offer, before E4g's
  switch): adults follow a dependent that is only keeping up with its carer (a `V.MOTHER` or `V.JUVENILE` follow).
  With E4g's `followCarer` 1, party size falls (T-PTY-1 z −2.4 on R + `callValue`), because the weights were fitted
  with the defect in place.
- Known defect handling (pre-flight rule): the reference of this stage is **R + `followCarer` 1** (the defect fixed).

## 1. Audit (step 0): T-PTY-1's band, the other party rows, the observer

To be written and committed within 30 minutes of the stage start (by 10:03). Any corrected band or scorer fix is
**staged** in `docs/staging/e5a-targets.patch.json`, never applied.

## 2. Diagnosis (step 1)

To be registered here before its runs: why parties form and split on R + `followCarer` and on R (who follows whom
and for which value term; joins after calls; splits at trips to food), party size against the crop of the current
tree, and the share of cohesion each tuned weight carries (each zeroed in turn: attribution only, nothing kept).

## 3. Mechanism (step 2)

To be registered before any run of changed code. One first-principles switch (0 = today) built from terms the model
already computes (crown share under competition from the ledger's intake; bond and kin; oestrous females for males;
the walk's energy cost from the ledger's cost of transport), switching out the tuned weights (ACTIVE_WHEN; the count
must fall). No new tuned constant.

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **RF** = R + `followCarer` 1 at this branch's committed head, e-bench quick (seeds 48 and 7, 30 + 30 days),
  run once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405 added). Also reported against the integrator's
  R quick realizations (`bench-run/artifacts/validation/e/noise/R-quick.json`, `NR1q`, `NR2q`, `NR3q`; 612bf15) after an
  identity check of R at this head.
- R = `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}`.
- Each arm against the reference mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)); quick per-run SD fitted 0.69, held-out
  1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result.
  Judged on the `--compare` figure "on N rows scored in both", with and without T-HUN-4 and T-BRD-1.
- Reported with the reference's spread: T-PTY rows, T-ACT-2, T-RNG-4, T-IGE-1, true day ranges by sex
  (`scripts/ranging-diagnose.ts`), prescription count, viability (must pass).
- Limits: development seeds 48 and 7 only; no run longer than 90 days in all; `--workers 1` if load > 8; rules policy.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)
