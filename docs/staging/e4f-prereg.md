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

## 2. Audit (step 0; 05:46–06:05; nothing run)

### 2.1 The target: what gilby2015 counted

**Read in full this stage** through the PMC article page (`pmc.ncbi.nlm.nih.gov/articles/PMC4633842/`; E4e's BioC and
efetch routes had failed). Methods, Kanyawara, verbatim:

> "every 15 min, the field assistants record party composition, and since 1996, whether colobus can be detected
> within 100 m of the chimpanzees."

> "we have identified all chimpanzee encounters with colobus (1996–August 2014) by querying the database for any 15 min
> scan when the chimpanzees were within 100 m of colobus that was not immediately preceded by another 'positive' colobus
> scan."

Gombe (Kasekela, Mitumba): "all encounters with colobus monkeys (when observed within approximately 50 m of the focal
chimpanzee …)". Results: "Encounters with colobus were more frequent at Kanyawara than at the other sites (3.73 per
100 h of observation versus 2.34 and 2.31 …), perhaps owing to site-specific operational definitions of encounter
(100 m at Kanyawara versus 50 m at Gombe)."

Sample (Table 1, Kanyawara): 224 months (1996–August 2014), adult males mean 11.4 (9–14), 2,461 red colobus
encounters, 3.73 per 100 h, 194 hunt attempts (7.9%), 119 successful (61.3%), 152 prey (1.28 per success). Derived:
2,461 ÷ 3.73 × 100 ≈ 66,000 h of observation, ≈ 3,530 h a year. Party follows by field assistants ("When a party is
located …"); a hunt attempt = a chimpanzee climbs to the height of the lowest monkey. No sex, reproductive-state or
mass restriction (community-level counts). **Two features of the method matter here:** an encounter is a run of
consecutive positive scans (identity of the colobus group not used), and the colobus must be *detected* by the field
assistants (sight or sound in forest; no detection probability is given).

### 2.2 What the model's observer counts (code at 6781cb7)

- Scans every 15 min by day (daylight > 0.3); the scan stores the nearest colobus group whose point lies within
  `preyEncounterM` 100 m of **any** member of the followed party (party = 50 m chain) (`src/field/protocols.ts:643`).
- **New encounter = the scanned group id differs from the previous scan's** (`src/field/metrics.ts:126`), not "a
  positive scan not preceded by a positive scan". A run of positive scans in which the nearest group changes counts
  twice or more. **Method mismatch 1** (overcounts; size measured in §3).
- Detection is certain within 100 m (omniscient). gilby2015 counts colobus that "can be detected". **Method mismatch 2**
  (overcounts if field detection within 100 m is incomplete; no source gives that probability: see 2.3).
- T-HUN-3 and T-HUN-4 are scored on focal follows (one focal per community per day, half of them females), T-HUN-1 on
  party follows staying with the larger subgroup (`src/field/config.ts:25`); gilby2015's are party scans.

### 2.3 Every input that sets the encounter rate

| Input | Model value | Where | Registry tag | Source, site, years | Site match |
| --- | --- | --- | --- | --- | --- |
| Colobus density | 159 groups on the 8 × 8 km map = 2.48 groups/km², uniform | `preyMinGroups` field 159 (`data/params.json`; "design unless noted"); `colobusDensityPerKm2` 2.48 is documentary (`file` null, `planned` C7: no code reads it) | [M] | mitaniWatts1999, wattsMitani2002: **Ngogo 1997–99** (2.04–2.92), pre-decline | **Mismatch of site, small in size.** Kanyawara K-30 (unlogged core, ~250 ha): 5 groups on a 225 ha grid "representing average density of red colobus in our study area" (Snaith & Chapman 2008's groups, as used by bonnell2010, read in full) ≈ **2.2 groups/km²** [L, secondary, a model's parameterization]. Kanyawara red colobus group density "stable in all areas" over 26–36 years (chapman2010ecol, abstract) [M]: no decline over gilby2015's years. The Ngogo decline (lwanga2011, chapman2023) is not Kanyawara's. Kanyawara's density averaged over the chimpanzees' range (which includes logged K-14/K-15 and non-forest) is **not pinned** by any source reached: null. |
| Group placement and ranging | uniform at birth; correlated random walk (heading ±0.45 rad per slow step), reflected at the map edge; **no home range** | `spawnPrey` (`src/sim/generation.ts:312`), `movePrey`/`slowPrey` (`src/sim/ecology.ts:24–48`) | none (literals) | snaithChapman2008 (abstract): 9 Kanyawara groups; larger groups have larger home ranges, longer daily travel and wider spread; values not read (closed) | **No source in the model**; field values not reached: null |
| Group speed | 0.025 m/s calm (90 m/h) + 0.1 m/s × alert; moves **day and night** (~2.2 km per 24 h calm) | `src/sim/ecology.ts:30` | none (literals) | not reached (snaithChapman2008, struhsaker1974: publisher host behind a bot check, dropped) | no source: null |
| Group size | 14–37, uniform (mean 25.5) | `spawnPrey` literal | none | Kanyawara groups of 70, 25, 84, 45 and 40 (mean 53; snaithChapman2008 via bonnell2010) [L]; Ngogo ~42 (P-HUN-1 note) | **Mismatch** (half the field size), but in the model a group is a point, so size does not enter the encounter rate |
| Group spread | a point at 17 m height | `PreyGroup.position` | none | snaithChapman2008: spread grows with group size (values not read) | Mismatch in kind; a spread group would *raise* encounters within 100 m of "colobus", not lower them |
| Chimpanzee detection of colobus | sight 35 m × `preySightFactor` 2.86 = 100 m by day | `src/sim/perception.ts:194` | "design"; §17 "[M] gilby2015 (prey)" | set equal to the field's **observer rule**; sight 35 m is Taï fruit-tree detection (P-SCALE-2: normand2009, janmaat2013a; "no primary Kibale visibility measurement found") | Not a perception measurement. Truth only (the observer does not use it); no source reached for chimpanzee detection of colobus: null |
| Observer detection | certain within 100 m | `src/field/protocols.ts:643` | gilby2015 | "can be detected within 100 m" | Mismatch 2 above; no detection probability in any source reached: null |
| Chimpanzee party travel | emergent | sim | — | — | — |

### 2.4 What the audit says before any run

- The site mismatch is real but small: Ngogo 1997–99 (2.48) against Kanyawara K-30 (~2.2, [L]) is a factor of ~1.1,
  far from the 2.5 × excess. The density cannot be the main driver unless Kanyawara's range-wide density is about
  1 group/km², which no source reached supports or excludes.
- A plain encounter model (rate ≈ density × 2 × radius × relative speed) at 2.2–2.5 groups/km², a 100 m radius and
  party travel of ~2 km in a 12-h follow (0.17 km/h, colobus drift adding a little) gives ~7–10 per 100 h, near the
  model's 9.5; the field's 3.73 is what the same arithmetic gives with an effective radius of ~45–50 m. That points to
  **how encounters are detected and counted** (mismatches 1 and 2) and to movement, not to density. The ~45–50 m is
  derived from the target and is **not** an input candidate.
- Sources not reached (time box; publisher hosts Wiley and OUP answered with a bot check and were dropped):
  chapman2010ecol full text (Kanyawara transect group densities), chapman2000cons, chapman2005ijp, snaithChapman2008
  full text, gillespieChapman2001, struhsaker1974. A person with library access could supply chapman2010ecol's table
  of group densities by area.
