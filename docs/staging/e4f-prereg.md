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

Other rows scored here: T-HUN-2 and T-HUN-4's Gombe rows come from the same paper (Kasekela 1976–2013, Mitumba
2000–2014; focal follows, colobus within ~50 m of the focal); the Ngogo rows (T-HUN-1 wattsMitani2002, T-HUN-2
mitaniWatts1999/wattsMitani2002, T-HUN-3 mitaniWatts2001: 61 of 164 encounters, definition not recorded) were not
re-opened (E4e: closed, the University of Michigan repository behind a bot check); values as recorded. T-HUN-1's
staged band 4–11 (E4e audit, not applied) is reported beside the registered 5–25.

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

## 3. Diagnosis plan (step 1; unchanged code; written and committed before any run)

Tool: `scripts/e4f-encounter-diagnose.ts` (new, read-only; header lists every readout). It runs e-bench's world and its
three observer team sets with e-bench's seeds (focal at observer seed 1, party-larger at 1 + 7919, party-males at
1 + 2·7919; field experiments left out, they act on copies), so its scans are e-bench's scans.

Readouts (definitions):
- **Observer encounters, three counting rules on the same 15-min scans** (focal follows score T-HUN-3/4; party-larger
  follows T-HUN-1): *model rule* = today's (`metrics.ts:126`, nearest group id differs from the previous scan's);
  *gilby rule* = gilby2015's sentence quoted in §2.1 (a positive scan not immediately preceded by a positive scan of the
  same follow); *focal rule* = the gilby rule measured from the focal animal only. Per 100 follow-hours and per
  follow-day. Tool check: the model rule per 100 h on focal follows must equal T-HUN-3's `encountersPer100h`.
- Distance of the nearest group at each encounter's first scan, by 25 m band; share of positive scans with ≥ 2 groups
  within 100 m; the farthest party member from the focal; the party centroid's travel per follow-hour.
- **Truth**: adult males' colobus encounters per community-day (e4e-hunt-diagnose's definition, so R's 5.45 ± 0.38 is
  comparable) and the distance at the encounter by band.
- **Ecology**: colobus groups inside each community's range (use-weighted centre, equal-area radius) at noon, and that
  density per km² against the map's 2.48; colobus travel by day and by night (m/h).

Runs (frozen detached checkout of the commit that adds this section, in the stage scratch directory; R as in the
handoff §3; rules policy):
- **I0 identity**: R, 2 days, seeds 48 and 7, world hash (tests/fixtures/golden.ts `worldHash`) must equal E4e's
  9deaf1df367a7d34 / 51357e4fb3248108 (612bf15, 5923a07, 5ca5b3c). If it does, the integrator's R quick realizations
  (`bench-run/artifacts/validation/e/noise/R-quick.json`, `NR1q`–`NR3q`) are this stage's reference.
- **S0 smoke**: the tool on R, seed 48, 1-day burn-in + 1 day: every readout produced, the tool check holds.
- **D0 diagnosis**: the tool on R, seeds 48 and 7, 30-day burn-in + 30 days (`artifacts/validation/e4f/diag/R-{48,7}.json`),
  one seed at a time (load > 8). The observer encounter rate must match R-quick's T-HUN-3 part per seed (identity of
  the observer). Table generated by `artifacts/validation/e4f/diag_table.py` from the JSON.

Reading rules, fixed now:
- Method mismatch 1 is a driver if the gilby rule removes more than R's own spread of the rate (0.42 of 9.5 per 100 h,
  i.e. > 5%).
- Density: if the density inside the communities' ranges equals the map's (uniform placement), the site correction
  2.48 → ~2.2 can remove at most ~11% (rate proportional to density): a minor driver at best.
- Detection: the share of encounters first scanned at 50–100 m measures how much an omniscient 100 m adds over a
  closer detection; it is reported, but no detection distance is set from it (no source pins one; §2.3).
- Movement: colobus travel per hour by day and by night against the party's travel; if colobus move at night or
  faster than the party, their drift adds encounters a home-ranging, day-active group would not.

## 4. Correction (switch `preyKanyawara`, 0 = today; field profile only)

### 4.1 Input: site-matched colobus density

With `preyKanyawara` 1 in the field profile, the number of colobus groups (at world creation and as the respawn floor
in `slowPrey`) is round(`colobusDensityKanyawaraPerKm2` × map area in km²) instead of `preyMinGroups` 159 (Ngogo
1997–99). `colobusDensityKanyawaraPerKm2` = 2.22 groups/km² [L]: bonnell2010 (read in full) placed "five distinct social
groups, of different sizes (70, 25, 84, 45, 40), as measured by Snaith and Chapman (2008), representing average density
of red colobus in our study area" (Kanyawara K-30) on a 225 ha grid: 5 ÷ 2.25 km². chapman2010ecol (read in full,
figures excepted): red colobus group density "remained fairly stable over time in all areas" (K-30, K-14, K-15, all in
the Kanyawara study site; 26–36 years), and "no difference … between the unlogged and the heavily logged areas", so the
K-30 value stands for the community's range [L]. 142 groups on the 8 × 8 km map. Compressed profile: unchanged.
Removed: nothing (an input correction; `removesNothing` in the switch registry).

Not changed, with the reason: group size (14–37, a literal, `src/sim/generation.ts:316`; Kanyawara's mean 53 [L] does
not enter the encounter rate, a point has no size; it would change hunting outcomes, deferred); colobus speed and
night travel (`src/sim/ecology.ts:30`, literals; no field day range reached: null; bounded at ≤ 10% by D0); group
spread (a point; Kibale red colobus groups spread 50–1000 m, chapman2010ecol citing unpublished data, which would raise
encounters, not lower them: not built); chimpanzee detection of colobus (100 m, design: null).

### 4.2 Scorer correction, staged (not applied: a protocol change after the freeze is the integrator's decision)

`docs/staging/e4f-protocol.patch.json`: T-HUN-3 and T-HUN-4 counted on the party follows that already score T-HUN-1,
with gilby2015's run rule (a positive 15-min scan not immediately preceded by a positive scan; hunts matched to the
run). Deferred defects with file:line: `src/field/metrics.ts:126` (new encounter when the nearest group's id changes),
`src/field/config.ts:25` (T-HUN-3/4 not in `TARGET_FOLLOW`). Every arm reports both scorings from the tool; only the
current scorer is judged.

## 5. Readouts (defined in §3; all smoke-tested on S0/S1 before any arm)

e-bench rows T-HUN-1..4 and sums (judged); the tool's observer encounters per 100 h and per follow-day (= per
community-day with a follow) under both rules and both follow types, hunted share under both rules, T-HUN-4's odds per
male recomputed from the tool's rows (pooled logistic, `diag_table.py`), detected hunts per follow-day, truth encounters
per community-day, density in ranges. "Share hunted" in the report = e-bench T-HUN-3 (today's scorer).

## 6. Arms and predictions (stated before any run of changed code)

Reference: R-quick, NR1q–NR3q (e-bench, integrator's, 612bf15; valid by I0). Tool runs on R and its three re-draws at
this stage's switch commit (`RD0`–`RD3`: R + `rgTemperature` 0.164, 0.1641, 0.1639, 0.16405; unchanged code) give the
tool readouts a spread. Judged with `judge_vs_reps.py quick R` (copied from the integrator's scratch): z against R's mean,
SD fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or R's own spread if larger.

- **H** = R + `huntValue` 1 (E4e's H1, same code): e-bench quick + tool. Must reproduce E4e's H1 rows (T-HUN-1 14.2,
  T-HUN-3 0.0267): the "with huntValue" reference.
- **K** (iteration 1) = R + `preyKanyawara` 1: e-bench quick + tool. Predictions against R's mean: observer
  encounters per 100 h (T-HUN-3 part) about −11% (9.5 → ~8.5), truth encounters per community-day about −11%
  (5.45 → ~4.9), T-HUN-1 about −11% in expectation (inside R's spread), T-HUN-3 unchanged in expectation, the encounter
  rate still ≥ 2 × Kanyawara's; fitted and held-out sums inside noise; prescriptions 103 (unchanged); viability passes.
- **KH** = K + `huntValue` 1: against H: T-HUN-1 about −11%; T-HUN-3 still below its band (~0.02–0.03): the site-matched
  density does **not** let the hunt decision land T-HUN-1 and T-HUN-3 in band together. Under the staged scorer, T-HUN-3
  rises (direction only).

## 7. Kill criterion

`preyKanyawara` stays off and is recorded if viability fails, or if held-out without T-HUN-4 and T-BRD-1 rises beyond
noise (z > +2 against R's mean). It removes no rule, so the count leg does not apply. Otherwise it is recorded as the
site-matched input, inside noise or not, for the integrator to decide (it is [L]).

## 8. Iterations

At most 3, each logged in §9 and committed before its run. Iteration 1 = K (with H and KH as its comparison runs).
A further iteration only if a source for colobus day range or for detection distance is reached (registered first).

## 9. Results

### Run log (each entry written before its run, unless marked)

- **I0 identity and S0 smoke** (frozen checkout of f5a4bb5; logged after the run, as registered in §3). I0: R after
  2 days gives 9deaf1df367a7d34 (seed 48) and 51357e4fb3248108 (seed 7), E4e's hashes: R is unchanged at this head and
  the integrator's R quick realizations (R-quick, NR1q–NR3q at 612bf15) are this stage's reference. S0 (seed 48, 1 + 1
  days): every readout produced; tool check holds (focal model rule 19.4175 per 100 h = T-HUN-3 `encountersPer100h`
  19.4175); colobus travel 90.0 m/h by day and by night.
- **D0 diagnosis** (as registered in §3): launched 05:57 from the same frozen checkout.
- **I1 identity and S1 smoke (before any arm).** Frozen checkout of 518295c (the switch commit). I1: R with
  `preyKanyawara` 0, 2 days, seeds 48 and 7: E4e's hashes again. S1: R + `preyKanyawara` 1, seed 48, 1 + 2 days through
  the tool: 142 groups, every readout produced, the model-rule hunted share on focal follows equals T-HUN-3's value.
- **I1 and S1 results** (518295c): R with the switch at 0 gives 9deaf1df367a7d34 and 51357e4fb3248108 (unchanged);
  S1 makes 142 groups and produces every readout (no hunt in 2 days, so the hunted-share check waits for the arms).
- **Iteration 1 (K, with H and KH; and the tool's reference spread).** Same frozen checkout, rules policy, seeds 48 and
  7, 30 + 30 days. Two background chains, one process each (load ~11): (a) `e-bench --quick --workers 1` for H = R +
  `huntValue` 1, K = R + `preyKanyawara` 1, KH = K + `huntValue` 1 (`artifacts/validation/e4f/{H,K,KH}.json`); (b) the
  tool for RD0–RD3 (R and its three re-draws, unchanged code), H, K, KH (`artifacts/validation/e4f/diag/<label>-{48,7}.json`).
  Judged by §6–§7: `judge_vs_reps.py quick R` on e-bench JSON; tool readouts by `diag_table.py` against RD0–RD3.

#### D0 result (f5a4bb5; R, seeds 48 and 7, 30 + 30 days; pooled by `artifacts/validation/e4f/d0_pool.py` from `diag/D0-{48,7}.json`, the frozen run's `R-{48,7}.json` renamed)

- Tool checks: the focal model rule reproduces R-quick's T-HUN-3 per seed (0.1236, 0.0847) and its encounter part
  (12.13 and 7.97 per 100 h; e-bench pools by the seed mean, 10.05); truth 5.59 encounters per community-day (E4e's R:
  5.59). The observer and the truth readouts are the reference's.
- **Counting rule** (same scans): focal follows 10.04 → 8.82 per 100 h under gilby2015's rule (−12%); party follows
  7.54 → 6.97 (−8%). Two or more groups within 100 m at 3–9% of positive scans.
- **Follow type**: T-HUN-3 counts its encounters on focal follows (10.04 per 100 h); gilby2015's are party scans, and
  the model's party follows (which already score T-HUN-1) give 7.54 (×0.75).
- **Distance**: 83% (focal) and 73% (party) of encounters are first scanned 50–100 m away; party spread is small (mean
  9–15 m, median 1–4 m), so "any member within 100 m" adds little (focal animal only: 8.00 against 8.82).
- **Density**: 2.35 and 2.60 groups/km² inside the communities' ranges (map 2.48): placement is uniform, nothing
  concentrates colobus where chimpanzees range.
- **Movement**: colobus travel 90 m/h by day and 90 m/h by night (the literal; no rest at night); the followed party's
  centroid 139–155 m/h. Colobus drift raises the relative speed by about 10% over stationary groups (mean relative
  speed of two random headings), so ranging can account for at most ~10%.
- **Decomposition of the 2.7 × (focal, today's rule, 10.04 against 3.73):** follow type ×1.33, counting rule ×1.08,
  density (Ngogo against Kanyawara K-30, [L]) ×1.13, colobus drift ≤ ×1.1; on party follows with gilby2015's rule and
  Kanyawara's density the model would record ~6.2 per 100 h, **1.7 × Kanyawara**. The remaining ×1.7 has no sourced
  input behind it: the field counts colobus that "can be detected" (no detection probability in any source reached),
  colobus avoidance of chimpanzees is not modelled (no rate found). **Decision:** the inputs (density, ranging) are
  minor drivers; most of the excess is how the encounter is counted (scorer) plus an unexplained residual. The one
  sourced, site-matched input correction is the density, and it is small.

#### Iteration 1 results

- **H reproduces E4e's H1 exactly** (518295c, `git.dirty` 0): T-HUN-1 14.19, T-HUN-3 0.0267 with 11.96 encounters per
  100 h, T-HUN-4 2.27, fitted 2.25 (z −1.8), held-out 3.18 (z +0.5), without the rare rows 2.56 (z +0.5), count 102
  (`judge_vs_reps.py quick R H.json`). With RD0 = D0 and I1, the code under test is E4e's on every path R and H use.
- **Tool checks on the reference**: RD0 reproduces D0 scan for scan; the focal model-rule rows give T-HUN-3 (0.1236,
  0.0847 per seed) and T-HUN-4 (1.7594, pooled logistic) exactly as R-quick; RD1's truth (5.71) equals E4e's NR1q.
