# E4f pre-registration: colobus encounters from sourced ecology

Branch `e4f-encounters` from `track-e` 6781cb7. Track E, stage E4f. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all. Started 2 October 2026, 05:44.

This file is written in steps, each committed before the step it governs: §1–§2 (problem, audit) before any run;
§3 (diagnosis plan) before the diagnosis runs on unchanged code; §4–§8 (correction, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

**Rule of this stage (brief, verbatim intent):** ecological inputs (prey density, group size, group spread, ranging)
and perception (detection distance in forest) must be sourced; never fit an input to an encounter or hunting rate.
The unmerged branch `worktree-agent-a954b443db4b6f22a` (`preySightFactor` 1.39, fitted to Kanyawara's encounter rate)
is not used, merged or copied.

## 1. The problem (from E4e, docs/staging/e4e-prereg.md §2.4, §3, §9; to be verified in §3 below)

- On the reference stack R (track-e-handoff.md §3) the observer records 9.5 ± 0.4 colobus encounters per 100
  follow-hours (quick, R and its three re-draws) against Kanyawara's 3.73 (gilby2015), about 2.5 ×; in truth adult
  males newly perceive a colobus group 5.45 ± 0.38 times per community-day.
- T-HUN-1 (hunts per community-year) = encounters × T-HUN-3 (hunted share). With the encounter rate 2.5 × too high,
  T-HUN-1 and T-HUN-3 cannot both pass: E4e's `huntValue` put T-HUN-1 in band by hunting 0.28 × Kanyawara's share of
  encounters (two errors cancelling).
- Suspected first: a site mismatch. The model's colobus density is Ngogo's red colobus density in 1997–99, before the
  predation-driven decline; the encounter and hunting targets are Kanyawara's.

## 2. Audit (step 0; started 05:46; nothing run)

### 2.1 The target: what gilby2015 counted, and what the model's observer counts

(in progress)

### 2.2 Every input that sets the encounter rate (model side read from code at 6781cb7)

| Input | Model value | Where | Tag in the registry | Source, site, years | Site match |
| --- | --- | --- | --- | --- | --- |
| Colobus density | 159 groups on the 8 × 8 km map = 2.48 groups/km² | `preyMinGroups` field 159 (`data/params.json`; "design unless noted", realism-design.md §5.1); `colobusDensityPerKm2` 2.48 is documentary only (`file` null, `planned` C7: no code reads it) | [M] | mitaniWatts1999, wattsMitani2002: **Ngogo 1997–99, pre-decline** | (in progress) |
| Group placement and ranging | uniform random over the whole map at birth; correlated random walk, heading jitter ±0.45 rad per slow step, reflected at the map edge; **no home range** | `spawnPrey` (`src/sim/generation.ts:312`), `movePrey`/`slowPrey` (`src/sim/ecology.ts:24–48`) | none (literals) | none | (in progress) |
| Group speed | 0.025 m/s calm (90 m/h), + 0.1 × alert; moves **day and night** (~2.2 km per 24 h calm) | `src/sim/ecology.ts:30` | none (literals) | none | (in progress) |
| Group size | 14–37, uniform | `spawnPrey` literal | none | none ("~42 per group" in the P-HUN-1 note) | (in progress) |
| Group spread | a point at 17 m height; distance measured to that point | `PreyGroup.position` | none | none | (in progress) |
| Chimpanzee detection of colobus | sight 35 m × `preySightFactor` 2.86 = 100 m, by day (daylight > 0.3) | `src/sim/perception.ts:194` | design; "[M] gilby2015 (prey)" in §17: set equal to the field's encounter radius | gilby2015's **observer rule**, not a perception measurement | (in progress) |
| Observer's encounter rule | nearest group whose point lies within `preyEncounterM` 100 m of **any** member of the followed party (50 m chain), at 15-min scans when daylight > 0.3; a new encounter when the scanned group id differs from the previous scan's; detection certain | `src/field/protocols.ts:643`, `src/field/metrics.ts:118`, `src/field/config.ts:74` | gilby2015 | Kanyawara rule | (in progress) |
| Party travel | emergent (the stack's day ranges) | sim | — | — | — |
