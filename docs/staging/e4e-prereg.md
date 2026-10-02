# E4e pre-registration: hunting from state (the hunt decided at the encounter by a value comparison)

Branch `e4e-hunting` from `track-e` 4c86404. Stage E4, third removal in the plan's order (`huntGapH`). Rules policy
only; development seeds 48 and 7; no run longer than 90 days in all. Started 2 October 2026, 04:32.

This file is written in steps, each committed before the step it governs: §1–§3 (problem, target audit, diagnosis
plan) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions, kill criterion)
before any run of changed code; every iteration in the run log (§9) before its run.

## 1. The problem

Hunting is opened by prescriptions (`src/sim/candidates.ts` `meatAndHunting`, the `hunt` offers at lines 826–835):

- a community-wide gap since the community's last hunt (`huntGapH` 6 h, design);
- a hunting-day lottery (`huntDay`, `huntDayPerMale` 0.0045 per adult male per day, design; `src/sim/tick.ts`
  `huntingDays`), not drawn in the field profile since the hunting fix (`huntEncounter` 1, field), which instead opens
  the option for one decision at a newly perceived colobus group with `huntEncMinMales` 2 adult males in view
  (`src/sim/perception.ts:270`);
- male-count minimums (`huntMinMales` 3 on a hunting day, `huntEncMinMales` 2 at an encounter);
- a timer-energy gate (`c.energy > 0.35`, a literal) and a rain gate (`rain < 0.3`, a literal);
- a hand-set lead value: `0.5 + 0.15·(males − 3) + 0.35·skill + 0.15·boldness − dist ÷ huntDistScaleM`.

On the reference stack R (handoff §3) the observer's T-HUN-1 is 39.7 hunts per community-year (5-seed confirm; band
5–25; all switches off, B: 26.8). The stack's spare time (feeding ends early) is the suspected cause, not yet shown.

## 2. Target audit (step 0; written before anything is built)

(to be completed within the first 30 minutes and committed; see the next commit)

## 3. Diagnosis plan (step 1; runs on unchanged code, R and B)

Cheapest decisive check first: `scripts/hunt-diagnose.ts` (sim truth) on R and on B, seeds 48 and 7, 30-day burn-in +
30 days, extended with the readouts listed in §5 (encounters per community-day, share hunted, which gate opened each
hunt, males present, the leader's energy state and arousal at the start, hour of day). The question it answers: what
makes the stack hunt more than B: more encounters, a higher share of encounters hunted, or more decision points per
encounter (spare time).

## 4. Mechanism

(registered after the diagnosis, before any run of changed code)

## 9. Results

### Run log (each entry written before its run)
