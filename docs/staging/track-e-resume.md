# Track E: where to resume (integrator note, 1 October 2026, paused for an app restart)

Integration branch `track-e` at the commit that adds this note. Every stage is merged behind switches that are off
by default; `pnpm test` 624 pass, 0 fail; field pin (tests/sim-track-e.test.ts) and compressed goldens unchanged.

## Next step (was about to run)
5-seed confirm of E1h, run from a frozen checkout (never from a worktree that is being merged into):
1. `git -C .claude/worktrees/bench-run checkout --detach <track-e head>` (or a fresh `git worktree add --detach`).
2. Copy `artifacts/validation/e/baseline-confirm.*` into it.
3. Arms, each `pnpm exec tsx scripts/e-bench.ts --confirm --params '<stack + arm>' --workers 3 --out artifacts/validation/e/<label> --compare artifacts/validation/e/baseline-confirm.json`:
   - stack = `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}`
   - T = stack + `ledgerFoodEnergyFix` 1; G = T + gut capacity at its sourced upper bound (111 mL/kg; see e1h-prereg.md for the parameter id).
4. Judge on rows scored in both runs; treat T-HUN-4 and T-BRD-1 (rare-event rows) separately; noise floor ~1.1 per sum.

## Open problems, in priority order
1. Gut capacity (E1h): mothers need ~790 g dry matter/day, the central foregut passes ~620 g. Only chimpanzee value is one
   captive gut volume via an abstract (nakamura2017, probably from Chivers & Hladik 1980). A sources task should find it.
2. Pre-dawn nest holding: only `rhythmDarkW` (a prescription) holds awake chimps before dawn (E2c, E2d nulls). E2e (thermal
   insulation vs coordinated departure) was started on branch `e2e-predawn` and had no commits at the pause: restart it.
3. Calls (E4c, branch `e4c-calls`, in progress at the pause, last commit 9f41b48): pant-hoots from isolation and a fitted
   travel hazard; to be replaced by a value comparison.
4. Infants: weaning ~6 y vs 4.7 y field; growth above Gombe; mothers' year-2 recovery absent (E1f). Infant intake rate per
   minute is not the cause (bray2018: 0.57 of adult).

## Rules carried by every agent prompt
Development seeds 48 and 7 only (confirm runs: 48, 7, 21, 5, 11); no run over 90 days in total; `--workers 1–2`; no
paid model API; never tune an input to a behavioural target; pre-register before running; never send the user's email
or personal data to any external service (Unpaywall needs one: don't use it).
