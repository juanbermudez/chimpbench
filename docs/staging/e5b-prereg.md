# E5b pre-registration: calls and cohesion together

Status: skeleton committed at the start of the stage (2 October 2026, 11:55, branch `e5b-calls-cohesion`, from
`track-e` 8720097), before any run and before any code change. Track E, stage E5 (fission–fusion), second piece.
Rules policy only; development seeds 48 and 7; no run longer than 90 days in all.

Rule served: field values of behaviour are targets, never inputs. Nothing here is tuned to a travel share, a day
range, a party size or a call rate.

This file is written in steps, each committed before the step it governs: §0–§2 (problem, field samples, readouts)
before the diagnosis runs; §3 (diagnosis readouts and reading rule) before the diagnosis runs on unchanged code; §5
onwards (mechanism, switch, arms, predictions, kill criterion) before any run of changed code; every iteration in the
run log before its run.

## 0. The problem (e-stack2-confirm.md, 5-seed confirms, simulation truth)

- On R, E5a's `cohesionValue` with E4g's `followCarer` leaves walking unchanged (adult males 2.10 against 2.17 km a
  day; e5a-prereg.md, five-seed confirm).
- On the integrated stack, adding the same pair to S3 (= S4) raises adult males' ground path from 2.93 to 3.43 km a
  day, pushes the travel share out of its band again (T-ACT-2 males / females 0.29 / 0.27 against 0.12–0.25) and
  deepens the nursing mothers' and juveniles' energy deficits (−0.27 and −0.17% of the store a day against −0.25 and
  −0.12 on S3).
- S3 contains `callValue`. The attribution of S2 found value-based calls the largest single source of extra walking
  (−0.74 km for males when left out), and E4g found that walking mostly "with a party" (joined trips and following),
  not approaching callers.

S3 = `bench-run/artifacts/validation/e/s3/S3-params.json`; S4 = S3 + `followCarer` + `cohesionValue`
(`…/s4/S4-params.json`), both read only:

```json
S3: {"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1,"ledgerFoodEnergyFix":1,"ledgerSatiationReserve":1,"ledgerLactGut":1,"callValue":1,"rhythmCircadian":1,"departRace":1,"nestLightDecide":1,"sleepChimp":1,"rhythmFreeNight":1,"nestCompany":1,"nestAudience":1,"darkCost":1,"preyKanyawara":1,"waterLedger":1}
S4: S3 + {"followCarer":1,"cohesionValue":1}
```

## 1. Field rows scored here: samples (to be filled from the sources before any arm)

(T-ACT-2, T-PTY-1, T-RNG-4, T-RNG-5; the energy rows are staged, read by energy-diagnose.)

## 2. Plan

1. Diagnosis on S3 and S4 (quick: seeds 48 and 7, 30 + 30 days; simulation truth): daily path by purpose, the value
   terms of each following and joining decision, joiners' walks and what they gain on arrival, the energy those walks
   cost (§3, registered before the runs).
2. One mechanism behind a new switch (0 = today) for the term the diagnosis names (§5, registered before any run of
   changed code).
3. Reference: S4 at this branch's committed head, quick, run once plus three re-draws (`rgTemperature` 0.1641, 0.1639,
   0.16405), with `energy-diagnose` for each; arms judged against the reference mean (e-noise.md amendment 2).
4. At most 3 iterations, each logged in §6 and committed before its run.
