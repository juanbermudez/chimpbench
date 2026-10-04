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
