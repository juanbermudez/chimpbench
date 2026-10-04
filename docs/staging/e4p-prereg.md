# E4p pre-registration: mating without quotas

Branch `e4p-mating` from `track-e` aa698bd. Track E, stage E4p. Rules policy only; development seeds 48 and 7; no run
longer than 90 days in all. Started 4 October 2026, 15:49.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a copulation rate or a party composition.

This file is written in steps, each committed before the step it governs: §0–§1 (problem, plan) at the start; §2–§3
(rows and samples, diagnosis readouts) before the diagnosis runs on unchanged code; §5–§8 (mechanism, readouts, arms,
predictions, kill criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief; to be verified in §4)

Four counted mating rules are active on S27 (51 prescriptions on the current ledger, E0b):

| Rule (ledger) | Where (aa698bd) | What it does (as read from the code) |
| --- | --- | --- |
| `mateIntervalH` 1.5 h (registry, design; quota) | `src/sim/candidates.ts:1137, 1159` (offers), `src/sim/execution.ts:810` (guard), `:822` (consort), `:1216` (mateTick) | a male may copulate again only 1.5 h after his last copulation; it gates his offer, a female's offer to him, and copulation inside guarding, consorting and the mate act |
| female gap 0.3 h (literal, E0b) | `src/sim/candidates.ts:1158` | a swollen female offers to mate only 0.3 h after her own last copulation |
| failed-approach block 0.5 h (literal, E0b; with `mateApproachS`) | `src/sim/execution.ts:1212, 1217` (mateTick's two exits) | a male whose approach fails (not reached within `mateApproachS`, or 8 ticks beside her without copulating) is blocked as if he had copulated 1 h ago, i.e. for 0.5 h |
| rival-chase gap 0.25 h (literal, E0b) | `src/sim/execution.ts:807` | a guarding male interrupts himself to chase a rival only 0.25 h after his own last aggression |

E4o's diagnosis on S27 (e4o-prereg.md §4, 30 + 60 days, seeds 48 and 7, four realizations): ~0.6 copulations per
hour for each adult male with a maximally swollen female (dyadic rate 0.59 per daylight hour together), 10–20× Kanyawara's
(0.03–0.064, muller2007) and ~20× Taï's (~0.03, gomesBoesch2009); per adult male-hour 0.12 (Kalinzu 0.12, Mahale
0.20–0.22) only because males are rarely with a swollen female (most maximally swollen female-hours have 0–2 adult males
in the party, against 4–12 in the field); without the quota males would choose to mate about 6× as often. No measured
male refractory physiology exists; captive males ejaculate about hourly (marson1989).

## 1. Plan

1. Sources and samples (§2): every field value the stage reports, opened at its source, with its sample and method.
2. Diagnosis (§3, registered before its runs) on S27 with unchanged simulation code, 30 + 60 days, seeds 48 and 7
   (S27 once plus one `rngSalt` re-draw; E4o's D0b–D3b reused where their readouts suffice): maximally swollen
   female-hours by adult males in her party and why males are absent; attempts, refusals, successes per dyad-hour;
   which of the four gaps binds each time; guarding and rival chases.
3. One switch (0 = today), only for what the diagnosis implicates (§5).
4. Arms on S27 in quick mode against the integrator's S27q group (bench-run3 28d249e, four runs), plus the mating
   readouts at 30 + 60 days against the mating reference; at most three iterations, each logged in §9 and committed
   before its run.
