# E4k pre-registration: why a hunt succeeds (capture from the pursuit, not a die)

Branch `e4k-hunt-success` from `track-e` b3d28c7. Track E, stage E4k. Rules policy only; development seeds 48 and 7;
no run longer than 90 days in all (this stage uses 30 + 60-day runs, as the cap allows). Started 4 October 2026, 04:15.

This file is written in steps, each committed before the step it governs: §1–§2 (problem, target audit) and the
diagnosis plan (§3) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 1. The problem (from the brief and the S17 record; verified in §3)

- On S17 (the best integrated candidate, 49 prescriptions; `docs/staging/e-stack2-confirm.md` "S17 results") whether a
  hunt succeeds is one draw in `resolveHunt` (`src/sim/ecology.ts:73`): with n ≥ 2 hunters still hunting within
  `huntCaptureRangeM` (field 30 m) of the colobus group's point when the hunt resolves (5–11 min after it starts),
  success has probability `huntSuccessMax` 0.8 × (1 − exp(−`huntSuccessRate` 0.3 × (n − 1))). Both parameters are
  counted prescriptions encoding T-HUN-2 (`scripts/lib/prescriptions.ts`).
- Extra captures are a second die: each other hunter captures with probability `huntExtraKillP` (field 0.17; counted,
  encoding T-HUN-7) while the group has more than 4 members.
- The captor is drawn by skill × 0.6 plus a hash; nothing about where the hunters are, the canopy, the colobus group's
  size or its adult males, or the hunters' state enters the outcome.
- `src/sim/huntvalue.ts` (`huntValue`, on in S17) values a hunt with the same curve (the hunter's expectation).
- Success is below its band on the stack: T-HUN-2 0.219 ± 0.079 on S16's four confirm runs, 0.347 on S17 (band
  0.5–0.8; gilby2015, mitaniWatts1999, wattsMitani2002).
- Field picture to model from first principles (sources opened in §2): red colobus escape through the canopy; capture
  depends on how many hunters there are and where they are (blocking escape routes, climbing), the canopy's
  continuity, the monkeys' group size and adult males' defence, and the hunters' own condition and skill.

## 2. Target audit and sources (step 0; to be filled before §3 runs)

Rows scored: T-HUN-1..8 (`data/targets.json`). Each row's source is opened and its sample (population, years, sex,
reproductive state, mass, method) written here before any run. Sources grepped first in `docs/research.md` and
`docs/staging/e-sources.md`; new sources added there first, as an addendum titled "Addendum: E4k hunt success".

## 3. Diagnosis plan (step 1; unchanged code; to be committed before it runs)

### 3.1 Hunt reference (unchanged code; registered before its runs)

The quick reference (S17q and its three re-draws, the integrator's, bench-run2 37f04e8) judges the sums. Hunting rows
rest on a handful of hunts in 30 days, so this stage also runs S17 at 30 + 60 days on seeds 48 and 7, once plus one
re-draw, as its hunt reference:

- **H0** = S17 (`artifacts/validation/e/s17q/S17q-params.json` in bench-run2), `e-bench --seeds 48,7 --burn-in 30
  --days 60` (custom), and **H0r** = the same plus `rgTemperature` 0.1641. Frozen detached checkout of b6630b9 in the
  stage scratch directory (`…/scratchpad/e4k/ref`; simulation code identical to b3d28c7 and to bench-run2 37f04e8),
  `--workers 2` while the load is below 8 (else 1), one run at a time. Outputs `artifacts/validation/e4k/{H0,H0r}.json`
  in that checkout (copied to this worktree's gitignored `artifacts/validation/e4k/`).
- Every hunt row of every arm is reported against H0 and H0r (mean of two), beside the quick judgement.
