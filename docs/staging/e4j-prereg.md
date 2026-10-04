# E4j pre-registration: how often neighbours meet (intergroup encounters on S16)

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e4j-encounters`, from `track-e`
0777e95): the problem, the field rows and their samples, the diagnosis plan. The diagnosis tool, its readouts and the
run log are written and committed before the diagnosis runs; the mechanism, readouts, predictions and kill criterion
before any run of a switch on. Track E, stage E4, piece j. Rules policy only; development seeds 48 and 7; no run longer
than 90 days in all.

Rule served: field values of behaviour are targets, never inputs. No encounter rate, patrol rate, response share or
detection distance is set from a field value or tuned to hit a row.

## 1. The problem

- S16 (docs/staging/e-stack2-confirm.md "S16 results"; S13 + `socialTiming` 15 + `patrolValue` 2; 49 prescriptions)
  scores T-IGE-1 (intergroup encounters per community-year, fitted, band 5–12) at **22.8** in its 5-seed confirm,
  against 11.4 / 7.19 / 7.46 / 6.55 on S13's four confirm runs. S15 (S13 + `patrolValue` 2 alone) gave 22.6. S16's
  fitted sum is worse beyond noise (z +3.9 against the S13 group), mostly through T-IGE-1 (distance 0 → 1.54).
- `patrolValue` 2 (E4i) raised patrols on the observer from T-PAT-1 0.05–0.09 to 0.23–0.25 per community-week (band
  0.1–0.5) and incursions to T-PAT-6 0.57 (band 0.4–0.7). In truth (E4i, two seeds, 30 + 60 days) S13 started 0.74
  patrols per community-week and value 2 1.85. No patrol turns violent on the observer (T-PAT-7 0 on S13's runs and
  S15; 0.031 on S16).
- E4i left open: the rate of patrolling follows from design constants (`patrolStaleTauDays`, the C6 lead score, RG's
  temperature) that no source fixes, and half of the patrols never hold three adult males. E4f found that the
  observer's colobus encounter scoring differs from the field's (focal against party follows; a new encounter at every
  change of nearest group) and staged scorer fixes, not applied. Whether the intergroup scoring has a like problem is
  part of this stage's diagnosis.

## 2. Field rows scored, and their samples

Sex, reproductive state, body mass and method as the source gives them; body mass enters no row. wilson2012 read in
full this stage (author copy, the E5a stage's download); the rest as E4i recorded them (e4i-prereg.md §2).

| Row (role; band) | Source and sample | Method | Sim scoring (src/field) |
| --- | --- | --- | --- |
| T-IGE-1 (fitted; 5–12 per community-year) | wilson2012 (FT): Kanyawara Jan 1992–Feb 2006 (180 months); community median 47 (43–51), 11 adult males ≥ 12 y (10–13), 15 adult females; 5,527 party follows (median 5.3 h, 0.25–14 h), 35,083 h; 120 encounters (102 acoustic, 15 visual, 3 physical) on 103 follows (1.9%), nine follows with two; 0.34 per 100 h. lemoine2020a (FT): Taï, 4 groups (P. t. verus) 1997–2016, 384 encounters (281 vocal, 103 visual or physical) in 54 group-years, effort as observation days between encounters. watts2006: Ngogo, 95 patrols + 68 other encounters in 41 researcher-months (peak seasons) | party follows staying with the larger subgroup; encounters compiled from the day's narrative notes and the field diary, acoustic ones when calls "appeared to come from a distance and direction towards or beyond the edge" of the range; ambiguous cases rejected; encounters more than 1 h apart scored as separate | encounters on party follows (larger subgroup) ÷ follow-hours × 2,339 h (Kanyawara's effort per year); an encounter = a stranger long call heard by the team or strangers seen by the followed party, one per neighbour community until 60 min without a detection |
| T-IGE-2 (held-out; 0.7–0.9) | wilson2012: 102 acoustic of 120; lemoine2020a: 281 vocal of 384 | as above | share of encounters with no stranger seen, focal follows |
| T-IGE-3 (held-out; 0.25–0.75 log-odds per adult male) | wilson2012: approach +0.49 (SE 0.12) per adult male, 120 encounters | approach = moved at least 50 m toward the foreign chimpanzees within 1 h of first detection | logistic regression of approach on own adult males, focal follows |
| T-PAT-1 (fitted; 0.1–0.5 per week) | wattsMitani2001: Gombe Kasekela and Taï North ~0.3 per week (second hand); massaro2022: Gombe 1978–2007, 180 patrols, median 4.5 a year | observers' recognition of patrols on follows | classified patrols on focal follows ÷ community-days with a follow × 7; instrument bar |
| T-PAT-2 (held-out; 7–18 per male-year) | langergraber2017: Ngogo 1996–2015, 284 patrols, males ≥ 13 y | participation per male | classified patrols joined per adult male-year |
| T-PAT-3 (held-out; 0.55–0.85) | massaro2022: 74.5 ± 11.1% of Gombe's males per patrol; wattsMitani2001: Taï 72% | patrol composition | adult males on a classified patrol ÷ the community's |
| T-PAT-5 (held-out; 60–240 min) | amsler2010: Ngogo, 29 patrols, 134 min (15–348); mitaniWatts2005: 2.13 ± 1.01 h; massaro2022: median 88.5 min | focal follows of patrolling males | duration of classified patrols |
| T-PAT-6 (fitted; 0.4–0.7) | mitaniWatts2005: Ngogo 1999–2003, 42 of 72 patrols entered the neighbours' range | patrol routes | share of classified patrols (male-party follows) entering a neighbour's 95% isopleth |
| T-PAT-7 (held-out; 0.15–0.45) | watts2006: Ngogo 1997–2003, contact on 30 of 95 patrols, physical aggression on 12 | case records | share of classified patrols with a seen or physical encounter |
| T-BRD-1 (held-out, rare row; 0.037–0.107) | lemoine2023: Taï East and South 2013–16, 625 stops ≥ 5 min on 283 group-days, adults present | advance vs retreat at border stops | logistic slope of the focal's advance on adults present at halts at 0.8–1.0 R |
| T-LET-* | need a year (NEEDS_YEAR) | — | reported from truth only (deaths by cause) |

## 3. Diagnosis plan (step 1; unchanged code; written and committed before the diagnosis runs)

Cheapest decisive check first: a read-only tool (`scripts/e4j-encounter-diagnose.ts`, new; its header defines every
readout) on S16 and on S13, seeds 48 and 7, 30-day burn-in + 60 days. It runs e-bench's world and its three observer
team sets with e-bench's observer seeds (no field experiments: they act on copies), so its follows, encounter records
and T-IGE / T-PAT / T-BRD rows are e-bench's. **Tool check:** its T-IGE-1 per seed on S16 must equal P16a's.

### 3.1 What the observer counts, against wilson2012's Methods

wilson2012 compiled encounters from the day's narrative notes and the field diary, keeping "only events that observers
inferred to be intergroup encounters" and rejecting ambiguous cases; an acoustic encounter is "vocalizations heard from
foreign chimpanzees, with or without vocal response"; distant calls were taken as foreign when they came from a
distance and direction toward or beyond the edge of the range; "Encounters that were separated by more than 1 h were
scored as separate encounters"; the rate is per 100 h of observation (party follows, larger subgroup). The model's
observer (src/field/protocols.ts `processCalls`, `encounterStep`): an encounter opens when the team hears a stranger
long call (pant-hoot or drum) within the call's radius (the chimps' own 1 km, P-SCALE) or the followed party sees
strangers; it is kept **per neighbour community** until 60 min pass without a detection of that community; the
caller's community is read from the call (the code calls it "an optimistic proxy" of the field's attribution).
Readouts that test the three differences, on the party-larger observer's encounters:
- **Community-blind 1-h rule:** the share of encounters opened while another neighbour's encounter was open on the
  same team (`concurrent` > 0): a field team that cannot tell communities apart by ear would score them as one.
- **Attribution by direction:** the share of heard encounters whose opening call stood outside the team's own 95%
  isopleth (beyond the edge, `cLevelL` > 0.95) or in its periphery (`cLevelL` ≥ 0.8) farther from its centre than the
  team (`cRL` > `tRL`: toward the edge); the rest came from inside the own range or from the core side, which a field
  observer attributing by direction would not have taken as foreign.
- **Distance of the opening call** by band (0–250, 250–500, 500–750, 750–1000 m): how much of the count rests on the
  1 km audibility (an [L] input whose sources are all secondary).

### 3.2 Readouts (each from the tool's JSON; pooled over the two seeds)

- Observer encounters per community-year as T-IGE-1 scores them (encounters ÷ party follow-hours × 2,339 h), split
  by the followed focal's context at the encounter's start (`patrol`, `pursuit`, `incursion`, `border-forage`,
  `border-other`, `core-forage`, `core-other`; header of the tool) and by the opening caller's context and answer flag.
- **Exposure × rate:** follow-hours by the focal's context (share) and encounters per follow-hour in each context.
- Truth hearing episodes (community L hears C; 60-min gap) per community-year by listener context, caller context
  and answer flag; the share the party-larger observer recorded; seen contacts per community-year.
- Per patrol: hearing episodes with a listener on the patrol, seen contacts with a member, observer encounters while
  the team's focal was on it; patrols per community-week; share followed by the party-larger team.
- `stats.intergroupEncounters` (12-h pair episodes) per community-week; deaths by cause.
- T-IGE-1..3, T-PAT-1..3, -5..7, T-BRD-1 per seed and pooled (num ÷ den), with the patrol classifier's precision and
  recall.

### 3.3 Decision rule (fixed now): what doubled the encounters

With E = encounters per community-year on the observer and E = Σ_k h_k · r_k over focal contexts k (h_k follow-hour
share, r_k encounters per follow-hour × 2,339), the change S13 → S16 splits into: **more patrols** = Δh_patrol ·
r_patrol(S13 ∪ S16 mean); **more contacts per patrol** = Δr_patrol · h_patrol(mean); **outside patrols** = Σ over the
other contexts of Δ(h_k r_k); **the scoring** = the change in the shares counted by the community-blind and
direction-attribution readouts (§3.1), and a seen/heard shift. The component carrying more than half of ΔE (pooled
over seeds 48 and 7, both draws of each stack) is named the cause; if none does, the two largest are named. Because a
patrol is the largest party, the party-larger team follows it whenever it is the community's larger subgroup, so
h_patrol is measured, not assumed.

### 3.4 Runs

- **Smoke** (logged after the run): S16 seed 48 1 + 1 and 2 + 10 days, S13 seed 7 2 + 6 days: every readout produced;
  one tool fix before the runs (the opening call is looked up without the radius test: the observer tests it before
  its follow step moves the team).
- **D16a, D16b, D13a, D13b**: the tool on S16 and S13 (P16a's parameters; S13 = S16 without `socialTiming` and
  `patrolValue`, identical to bench-run3's `S13-params.json`), a and b = without and with `rgTemperature` 0.1641, seeds
  48 and 7, 30 + 60 days, from a frozen detached checkout of the commit that adds this section
  (`scratchpad/e4j/frozen-d`), two chains (S16, S13) one process each. Outputs `artifacts/validation/e4j/D{16,13}{a,b}-{48,7}.json`.
- **Tool v2 and the E runs** (written after D16a/D13a were read, before any v2 run). The first draw split S13 → S16
  (observer, 18.0 → 32.9 per community-year) about equally into patrols (exposure +6.6, rate +1.4) and outside patrols
  (+7.0, mostly a doubled rate of encounters for followed parties in their own core), with stranger-heard calls per
  community-day doubled (1.33 → 2.68) while calls per community-day did not rise (84 → 77). Three readouts are added to
  decide what brings communities within earshot and what sets the patrol rate (scripts only; the world is unchanged):
  **formings** (the E4i occasion: a perception first seeing ≥ 3 adult males; 'flicker' when the other males in view had
  all been seen within `reunionH`, the model's reunion span, so no fusion happened), **ranges** (daily centres, radii,
  distances between centres) and **proximity** (every 15 min in daylight, the least distance between independent
  members of each pair of communities; shares within the pant-hoot radius and half of it). Smoke: S16 seed 48, 2 + 6
  days, every readout produced. Runs **E16a, E16b, E13a, E13b**: the v2 tool on the same eight seed-configurations as
  the D runs, from a frozen detached checkout of the commit that adds this entry (`scratchpad/e4j/frozen-e`), two chains;
  every v1 readout must reproduce the D runs exactly (tool check).
- **Tool v3 and the F runs** (written after E13a/E16a were read, before any v3 run). The first draws put the doubling in
  the time communities spend within earshot (daylight quarter-hours with members of two communities within 1 km: 5.0%
  → 10.1%), with hearing episodes per quarter-hour within earshot unchanged (0.165, 0.170) and centres and radii moved
  little. To say whose positions make that time (patrols, members who left a patrol under way, pursuit, incursions,
  both parties at their borders, or a party in its core), v3 classes every quarter-hour within earshot by the closest
  pair's contexts, and records each community's share of daylight member-time at its periphery (own isopleth ≥ 0.8) and
  outside its range (> 0.95), with and without patrol members. Smoke: S16 seed 48, 2 + 6 days. Runs **F16a, F16b, F13a,
  F13b**: the v3 tool on the eight seed-configurations, from a frozen detached checkout of the commit that adds this
  entry (`scratchpad/e4j/frozen-f`); v1 and v2 readouts must reproduce exactly.

### 3.5 Reference runs (run log; each entry written before its run)

- **P16a, P16b (the stage's encounter reference; unchanged code).** `e-bench --seeds 48,7 --burn-in 30 --days 60
  --workers 1` on S16 (bench-run4 `artifacts/validation/e/s16/S16-params.json`), P16b with `rgTemperature` 0.1641 added,
  one after the other, from a frozen detached checkout of the commit that adds this entry
  (`scratchpad/e4j/frozen-p`); outputs `artifacts/validation/e4j/P16{a,b}.json` there. Load ~10–19 at launch (other
  agents' runs), hence one worker.
- **P16a, P16b results** (logged after the runs; 8bda1b3, `git.dirty` 0, printed from the JSON): fitted 5.07 and 2.94,
  held-out 7.29 and 6.06 (5.95 and 6.06 without T-HUN-4 and T-BRD-1), prescriptions 49, viable (one illness death in
  P16b); T-IGE-1 32.9 and 22.3 (per seed 25.2, 40.5 and 20.7, 23.9: the S16 confirm's seeds 48 and 7 exactly). The rows
  are the tool's (§3.6), so the tool's D16 runs carry the reference from here on.

### 3.6 Diagnosis results (D, E and F runs; every number printed by `scratchpad/e4j/diag_table.py` and `v2_table.py` from the tool's JSON)

Tool checks: the tool's T-IGE-1 per seed equals P16a's and P16b's (25.165, 40.487; 20.722, 23.947) and S13's confirm
runs' seeds 48 and 7 (S13: 10.46, 25.52; S13c1: 3.01, 10.30); v1 readouts identical in the E runs and v1 + v2 in the F
runs (all eight seed-configurations); 30-day burn-in + 60 days, seeds 48 and 7, rules policy.

```
## Rows (pooled num/den over seeds 48, 7; per seed in brackets)
| Row | S13 D13a | S13 D13b | S16 D16a | S16 D16b |
| --- | --- | --- | --- | --- |
| T-IGE-1 | 18 [10.5, 25.5] | 6.7 [3.01, 10.3] | 32.9 [25.2, 40.5] | 22.3 [20.7, 23.9] |
| T-IGE-2 | 0.962 [1, 0.947] | 1 [1, 1] | 0.957 [0.941, 0.967] | 1 [1, 1] |
| T-IGE-3 | — [—, —] | — [—, —] | — [—, —] | — [—, —] |
| T-PAT-1 | 0.116 [0.0769, 0.156] | 0.0773 [0.116, 0.0387] | 0.252 [0.194, 0.309] | 0.251 [0.309, 0.192] |
| T-PAT-2 | — [3.02, 5.65] | — [3.9, 1.3] | — [6.52, 9.5] | — [10.2, 6.04] |
| T-PAT-3 | — [0.661, 0.714] | — [0.663, 0.429] | — [0.798, 0.717] | — [0.658, 0.686] |
| T-PAT-5 | — [156, 155] | — [173, 205] | — [167, 157] | — [165, 214] |
| T-PAT-6 | 0.562 [0.444, 0.714] | 0.154 [0.111, 0.25] | 0.548 [0.615, 0.5] | 0.652 [0.8, 0.375] |
| T-PAT-7 | 0 [0, 0] | 0 [0, 0] | 0.0769 [0, 0.125] | 0 [0, 0] |
| T-BRD-1 | — [—, —] | — [—, —] | — [—, —] | — [—, —] |

## Observer (party-larger) encounters per community-year by the followed focal's context: n, follow-hour share h, rate r (per 2,339 follow-h), contribution h·r
| context | D13a | D13b | D16a | D16b |
| --- | --- | --- | --- | --- |
| patrol | n 4, h 0.007, r 445.1, 2.99 | n 0, h 0.003, r 0.0, 0.00 | n 15, h 0.020, r 550.7, 10.97 | n 10, h 0.017, r 440.9, 7.43 |
| pursuit | n 0, h 0.000, r 0.0, 0.00 | n 0, h 0.000, r 0.0, 0.00 | n 0, h 0.000, r 0.0, 0.00 | n 1, h 0.000, r 25422.5, 0.74 |
| incursion | n 0, h 0.001, r 0.0, 0.00 | n 0, h 0.000, r 0.0, 0.00 | n 2, h 0.006, r 233.0, 1.46 | n 2, h 0.003, r 464.3, 1.49 |
| border-forage | n 2, h 0.063, r 23.6, 1.50 | n 0, h 0.053, r 0.0, 0.00 | n 0, h 0.045, r 0.0, 0.00 | n 1, h 0.052, r 14.2, 0.74 |
| border-other | n 10, h 0.087, r 86.4, 7.49 | n 5, h 0.089, r 41.9, 3.72 | n 11, h 0.076, r 105.7, 8.05 | n 7, h 0.078, r 67.0, 5.20 |
| core-forage | n 1, h 0.332, r 2.3, 0.75 | n 1, h 0.345, r 2.2, 0.74 | n 2, h 0.334, r 4.4, 1.46 | n 1, h 0.339, r 2.2, 0.74 |
| core-other | n 7, h 0.511, r 10.3, 5.24 | n 3, h 0.510, r 4.4, 2.23 | n 15, h 0.519, r 21.1, 10.97 | n 8, h 0.511, r 11.6, 5.94 |
| all (E) | n 24, 18 per CY; follow-h 3124 (derive 3124) | n 9, 6.7 per CY; follow-h 3141 (derive 3141) | n 45, 32.9 per CY; follow-h 3198 (derive 3197) | n 30, 22.3 per CY; follow-h 3148 (derive 3148) |

| Readout | D13a | D13b | D16a | D16b |
| --- | --- | --- | --- | --- |
| share seen (not heard only) | 0 | 0 | 0 | 0 |
| opened while another neighbour's encounter was open | 0 | 0 | 0.0222 | 0 |
| opening call beyond or toward the own edge (field-attributable) | 1 | 1 | 0.978 | 1 |
| opening caller inside the listener's 95% isopleth | 0.0417 | 0 | 0.111 | 0.133 |
| opening caller in a patrol file | 0.125 | 0.111 | 0.133 | 0.1 |
| truth hearing episodes per listener community-year | 152 | 140 | 316 | 270 |
| truth episodes the observer recorded | 0.153 | 0.058 | 0.147 | 0.113 |
| truth episodes with a team following L | 0.733 | 0.732 | 0.795 | 0.722 |
| truth episodes with a listener on L's patrol | 0.0933 | 0.0652 | 0.215 | 0.158 |
| truth episodes, caller inside L's range | 0.02 | 0.0145 | 0.0801 | 0.102 |
| seen contacts per community-year (truth) | 4.06 | 0 | 14.2 | 6.08 |
| seen contacts with a patrol member | 0.5 | — | 0.714 | 0 |
| patrols per community-week (truth) | 0.739 | 0.622 | 2 | 1.69 |
| patrols reaching 3 adult males | 0.658 | 0.719 | 0.515 | 0.471 |
| patrols whose leader entered a neighbour's range | 0.263 | 0.219 | 0.447 | 0.425 |
| hearing episodes per patrol (listener on it) | 0.368 | 0.281 | 0.65 | 0.483 |
| seen contacts per patrol | 0.0263 | 0 | 0.0583 | 0 |
| patrols followed by the party-larger team | 0.316 | 0.219 | 0.301 | 0.276 |
| observer encounters per followed patrol | 0.333 | 0 | 0.484 | 0.417 |
| observer encounters opened on a patrol (n) | 4 | 0 | 15 | 10 |
| observer patrolling flag (n) | 4 | 0 | 16 | 10 |
| stats.intergroupEncounters per community-week (12-h pair episodes) | 1.44 | 1.21 | 2.64 | 2.31 |
| long calls per community-day | 84.2 | 82.9 | 77.2 | 80.5 |
| long calls heard by another community, per community-day | 1.33 | 0.831 | 2.68 | 2.09 |
| of those, calls answering strangers | 0.0563 | 0.0803 | 0.089 | 0.0557 |

## Decomposition S13 -> S16 (both draws and both seeds pooled): E 12.32 -> 27.64, dE +15.32
  patrol         h 0.005 -> 0.018, r  319.7 ->  500.8: exposure part +5.63, rate part +2.09
  pursuit        h 0.000 -> 0.000, r    0.0 -> 7002.6: exposure part +0.18, rate part +0.18
  incursion      h 0.000 -> 0.005, r    0.0 ->  310.3: exposure part +0.67, rate part +0.81
  border-forage  h 0.058 -> 0.049, r   12.8 ->    7.6: exposure part -0.10, rate part -0.28
  border-other   h 0.088 -> 0.077, r   63.8 ->   86.3: exposure part -0.82, rate part +1.85
  core-forage    h 0.338 -> 0.336, r    2.2 ->    3.3: exposure part -0.01, rate part +0.36
  core-other     h 0.510 -> 0.515, r    7.3 ->   16.5: exposure part +0.05, rate part +4.69
  sum +15.32 (check against dE +15.32)
  more patrols (exposure) +5.63; more contacts per patrol (rate) +2.09; outside patrols +7.60 (exposure -0.02, rate +7.62)
  scoring readouts: concurrent 0 -> 0.0133; field-attributable 1 -> 0.987; seen share 0 -> 0
```

```
| Readout | F13a | F13b | F16a | F16b |
| --- | --- | --- | --- | --- |
| formings per community-week | 98.0 | 83.3 | 77.5 | 79.7 |
| share flicker (all formings) | 0.43 | 0.41 | 0.38 | 0.45 |
| formings that led a patrol, per community-week | 0.39 | 0.39 | 2.00 | 1.71 |
| share flicker (formings that led) | 0.15 | 0.25 | 0.39 | 0.52 |
| patrols per community-week (truth) | 0.74 | 0.62 | 2.00 | 1.69 |
| seed 48: radii day 31 -> 91 | 1117->979 / 1133->1046 / 1051->1006 | 1175->1147 / 1151->1049 / 1097->1046 | 1231->1101 / 1130->1012 / 1033->998 | 1167->1031 / 1090->961 / 1040->993 |
| seed 48: centre gaps day 31 -> 91 | 3024->2883 / 2466->2483 / 2804->2708 | 3108->2973 / 2585->2692 / 2725->2753 | 3050->2785 / 2527->2433 / 2882->2610 | 2958->2936 / 2402->2354 / 2372->2277 |
| seed 48: mean gap last 30 d (sum of radii) | 2896 (2065) / 2482 (1969) / 2742 (2055) | 3036 (2191) / 2705 (2188) / 2799 (2106) | 2892 (2141) / 2472 (2058) / 2727 (1988) | 2961 (2011) / 2363 (2007) / 2330 (1979) |
| seed 7: radii day 31 -> 91 | 1175->1060 / 1090->1113 / 1046->1014 | 1240->1097 / 1088->1023 / 1076->1040 | 1163->1190 / 1127->1101 / 1025->1001 | 1091->1101 / 1098->993 / 1034->1095 |
| seed 7: centre gaps day 31 -> 91 | 2921->2879 / 2563->2490 / 2614->2526 | 2961->2935 / 2450->2463 / 2838->2854 | 2965->2785 / 2432->2435 / 2293->2280 | 3032->2875 / 2526->2448 / 2758->2677 |
| seed 7: mean gap last 30 d (sum of radii) | 2883 (2197) / 2500 (2076) / 2480 (2138) | 2905 (2176) / 2457 (2147) / 2808 (2056) | 2798 (2327) / 2428 (2201) / 2274 (2120) | 2890 (2103) / 2463 (2168) / 2698 (2087) |
| pair 1-2: share of daylight quarter-hours within 1 km (500 m); mean least distance | 0.039 (0.005); 1872 m | 0.017 (0.000); 1910 m | 0.107 (0.010); 1530 m | 0.028 (0.001); 2047 m |
| pair 1-3: share of daylight quarter-hours within 1 km (500 m); mean least distance | 0.052 (0.004); 1694 m | 0.065 (0.002); 1656 m | 0.084 (0.012); 1619 m | 0.097 (0.008); 1532 m |
| pair 2-3: share of daylight quarter-hours within 1 km (500 m); mean least distance | 0.059 (0.005); 1645 m | 0.044 (0.003); 1801 m | 0.113 (0.017); 1556 m | 0.131 (0.027); 1475 m |
| all pairs: share within 1 km (500 m) | 0.050 (0.005) | 0.042 (0.002) | 0.101 (0.013) | 0.085 (0.012) |
| truth hearing episodes per quarter-hour within 1 km (both directions) | 0.165 | 0.182 | 0.170 | 0.173 |

| v3 readout | F13a | F13b | F16a | F16b |
| --- | --- | --- | --- | --- |
| within earshot, closest pair class patrol: share of pair-quarter-hours (of time within earshot) | 0.0046 (0.09) | 0.0030 (0.07) | 0.0242 (0.24) | 0.0150 (0.18) |
| within earshot, closest pair class leaver: share of pair-quarter-hours (of time within earshot) | 0.0013 (0.03) | 0.0002 (0.00) | 0.0040 (0.04) | 0.0032 (0.04) |
| within earshot, closest pair class pursuit: share of pair-quarter-hours (of time within earshot) | 0.0001 (0.00) | 0.0001 (0.00) | 0.0007 (0.01) | 0.0003 (0.00) |
| within earshot, closest pair class incursion: share of pair-quarter-hours (of time within earshot) | 0.0030 (0.06) | 0.0011 (0.03) | 0.0096 (0.09) | 0.0042 (0.05) |
| within earshot, closest pair class border: share of pair-quarter-hours (of time within earshot) | 0.0216 (0.43) | 0.0221 (0.53) | 0.0250 (0.25) | 0.0309 (0.36) |
| within earshot, closest pair class core: share of pair-quarter-hours (of time within earshot) | 0.0197 (0.39) | 0.0153 (0.37) | 0.0377 (0.37) | 0.0313 (0.37) |
| community 1: member-time at periphery >= 0.8 / outside > 0.95 (without patrol members) | 0.148 / 0.026 (0.146 / 0.025) | 0.145 / 0.030 (0.141 / 0.028) | 0.145 / 0.028 (0.138 / 0.024) | 0.177 / 0.032 (0.170 / 0.028) |
| community 2: member-time at periphery >= 0.8 / outside > 0.95 (without patrol members) | 0.137 / 0.033 (0.136 / 0.031) | 0.134 / 0.025 (0.133 / 0.025) | 0.132 / 0.030 (0.125 / 0.026) | 0.102 / 0.022 (0.096 / 0.018) |
| community 3: member-time at periphery >= 0.8 / outside > 0.95 (without patrol members) | 0.164 / 0.039 (0.163 / 0.038) | 0.128 / 0.033 (0.126 / 0.032) | 0.166 / 0.048 (0.160 / 0.045) | 0.167 / 0.048 (0.165 / 0.046) |

pooled over both draws and both seeds (prox_pool.py: % of daylight pair-quarter-hours within 1 km, by the closest pair's class):
S13 patrol 0.38 leaver 0.07 pursuit 0.01 incursion 0.20 border 2.18 core 1.75 total 4.60
S16 patrol 1.96 leaver 0.36 pursuit 0.05 incursion 0.69 border 2.79 core 3.45 total 9.31
change S13 -> S16 (points): patrol +1.57 leaver +0.29 pursuit +0.04 incursion +0.48 border +0.61 core +1.71 total +4.71
  patrol-linked (patrol, leaver, pursuit, incursion) +2.39 (51%); border + core +2.32 (49%)
centre gaps over the 60 scored days (gaps.py; 12 pair-runs each): S13 mean change -35 m (min -141, max +107), S16 -108 m (min -272, max +3)
```

**What doubled the encounters (decision rule §3.3).** On the observer (both draws and seeds pooled), 12.3 → 27.6
encounters per community-year: **outside patrols +7.6** (50%; exposure −0.0, rate +7.6), **more patrols +5.6** (37%) and
**more contacts per patrol hour +2.1** (14%). No component carries more than half, so the two largest are named: the rate
at which followed parties outside patrols hear neighbours, and the number of patrols. **The scoring did not change**:
the shares a community-blind 1-h rule (0 → 1.3%) or attribution by direction (100% → 98.7% attributable) would remove, and
the seen share (0), are the same in both stacks, and the observer recorded 10.8% and 13.1% of the truth hearing episodes
(288 and 578 in the four runs of each; truth patrols 0.68 and 1.85 per community-week, pooled the same way).
**Calling did not change**: long calls per community-day 84 → 79, and hearing episodes per quarter-hour within earshot
0.165–0.182 against 0.170–0.173. What doubled is **the time two communities spend within earshot** (daylight
quarter-hours with members of two communities within 1 km: 4.6% → 9.3%), and that is the patrols' doing in two ways:
- **directly**, half of the added time (+2.39 of +4.71 points, `prox_pool.py`): patrol members (+1.57), members who left a
  patrol under way (+0.29) and animals inside a neighbour's range (+0.48). Truth patrols 0.68 → 1.85 per community-week; patrols with at
  least three adult males 48 → 94 in the four runs, their incursions 0.29 → 0.62, hearing episodes per such patrol 0.35 →
  0.70; 39–52% of the formings that led a patrol were sight flicker inside a party that already held three adult males;
- **indirectly**, the other half (+2.32): parties in their own ranges are within earshot of neighbours more often (core
  1.75 → 3.45, border 2.18 → 2.79) although members spend no more time at the periphery or outside their range (shares
  0.10–0.18 and 0.02–0.05 in both stacks, with or without patrol members): the ranges themselves sit closer, the
  distance between centres shrinking three times faster on S16 (−108 m against −35 m over the 60 days, `gaps.py`). Patrol use at
  and beyond the edge enters the use distribution (parties.ts recordUse counts every daylight party), so frequent,
  deep patrols pull each range's use, centre and familiar area toward the neighbour they face.
No patrol turns violent on the observer (T-PAT-7 0–0.08) and seen contacts stay rare (0–14 per community-year).

**With the S16 reference at four draws** (D16c and D16d, registered in §5 and run with A1; logged after the runs). The two
added draws carry less time within earshot (5.66% and 5.59%) at T-IGE-1 20.0 and 19.8, so on four draws against S13's two
the rise is smaller in truth and the same in kind (printed by the same scripts):

```
## Decomposition S13 -> S16 (both draws and both seeds pooled): E 12.32 -> 23.79, dE +11.47
  patrol         h 0.005 -> 0.015, r  319.7 ->  464.6: exposure part +4.08, rate part +1.43
  pursuit        h 0.000 -> 0.000, r    0.0 -> 7055.4: exposure part +0.18, rate part +0.18
  incursion      h 0.000 -> 0.003, r    0.0 ->  247.5: exposure part +0.31, rate part +0.42
  border-forage  h 0.058 -> 0.050, r   12.8 ->   18.6: exposure part -0.14, rate part +0.31
  border-other   h 0.088 -> 0.079, r   63.8 ->   79.8: exposure part -0.66, rate part +1.33
  core-forage    h 0.338 -> 0.340, r    2.2 ->    2.2: exposure part +0.00, rate part -0.01
  core-other     h 0.510 -> 0.513, r    7.3 ->   15.1: exposure part +0.03, rate part +3.98
  sum +11.47 (check against dE +11.47)
  more patrols (exposure) +4.08; more contacts per patrol (rate) +1.43; outside patrols +5.95 (exposure -0.26, rate +6.21)
  scoring readouts: concurrent 0 -> 0.00775; field-attributable 1 -> 0.977; seen share 0 -> 0.00775

S13 patrol 0.38 leaver 0.07 pursuit 0.01 incursion 0.20 border 2.18 core 1.75 total 4.60
S16 patrol 1.72 leaver 0.36 pursuit 0.03 incursion 0.41 border 2.39 core 2.55 total 7.47
change S13 -> S16 (points): patrol +1.34 leaver +0.29 pursuit +0.02 incursion +0.21 border +0.21 core +0.81 total +2.87
  patrol-linked (patrol, leaver, pursuit, incursion) +1.85 (64%); border + core +1.02 (36%)
S13: 12 pair-runs, mean change of centre gaps -35 m (min -141, max +107)
S16: 24 pair-runs, mean change of centre gaps -109 m (min -272, max +61)
A1: 12 pair-runs, mean change of centre gaps -42 m (min -284, max +245)
```

The reading stands with smaller numbers: on the observer the rise (12.3 → 23.8) is half outside patrols (+6.0, a rate change
at unchanged exposure) and half patrols (+4.1 exposure, +1.4 per patrol hour); the time within earshot rises 1.6 times
(4.6% → 7.5%), two thirds of it patrol-linked, a third border and core; the centres close three times faster (−109 against
−35 m); the scoring and calling are unchanged.

## 4. Mechanism (switch `patrolFusion`, 0 = today; src/sim/perception.ts, committed with this section)

**What the diagnosis implicates.** Every part of the doubling runs through the patrol rate: patrol trips put patrol
members within earshot of the neighbours (half of the added time), and frequent, deep patrols pull the ranges together
(the other half). The rate is set by how often the E4i lead is weighed (the occasion) times the lead's share of the
draw. The occasion has a defect: E4i meant it "once, when his party first holds patrolMinMales adult males", and coded
it as a perception that sees that many after seeing fewer at the previous one. A male's view is 35 m in daylight while a
party chains at 50 m, so males stepping out of view and back inside one party re-raise the occasion: 38–45% of all
formings and 39–52% of the formings that led a patrol on S16 were such flicker (F runs), the party having held three
adult males within the hour.

**Change (from first principles; no new magnitude).** A male knows who is in his party by more than his instantaneous
view: the companions he has been with within the model's reunion span (`reunionH`, 1 h; the span after which two members
meeting again count as reuniting, perception.ts, and the observer's fusion convention, girardButtoz2022). With
`patrolFusion` 1 (and `patrolValue` 2 or 3) the occasion is raised when the adult males of his community he had been with
within `reunionH` before this look (himself included; `knownAdultMales`, read from `metAt` before the look updates it)
were fewer than `patrolMinMales` and the adult males now in view are at least that many: a fusion that brings his party
to the minimum. Everything else is E4i's value 2 (the lead's value, incursion and retreat by odds, no cap, no release
dice, joining by strength). No randomness is added; nothing is drawn.

**What it does not change.** The value of the lead (its design ceiling, the staleness time constant, RG's temperature),
the 1 km audibility of calls, the observer, and how patrol use enters the use distribution. If the indirect half (ranges
pulled together) does not follow the patrol rate down, iteration 2 takes it up.

**Prescriptions.** None switched out: a correction of E4i's occasion (`removesNothing` in scripts/lib/prescriptions.ts);
S16 49 → 49 (`prescription-ledger.ts --count`). The standard keep rule's count leg cannot pass; a pass of everything
else makes it a correction, recorded as such (as E3b and E1p).

**Checks before any arm** (this commit): switch 0 bit-identical to the code under test before the change (S16 seed 48 after
4 days `81794c794db1ae0e`, S13 seed 7 after 3 days `f49c113e3e8f1ebf`, from the frozen F checkout and this tree);
tests/sim-patrol-fusion.test.ts (default 0, switch 0 = no override, switch 1 changes the S16 world within two days, the
count unchanged, `knownAdultMales`, and a three-male scene: at 0 the occasion is raised whether the third male was seen 12
min ago or 3 h ago, at 1 only in the second case); `tsc` clean; `gen-params --check` clean. Smoke (switch on, S16 seed 48,
2 + 6 days, the v3 tool): every readout produced; 2 patrols against S16's 4 in the same window, no led forming a flicker.

## 5. Readouts (defined before any arm; smoke-tested above with the switch on)

- **Quick (vs the S16q group, `judge_vs_reps.py quick custom`):** fitted and held-out sums with and without T-HUN-4 and
  T-BRD-1, and without T-IGE-3; rows beyond 2 SD; prescriptions; viability; deaths by cause.
- **Energy (energy-diagnose, seeds 48, 7, 30 + 30, as the S16q group):** reserves ÷ store, % per day by class (OLS, as the
  integrator's judges), nursing mothers and juveniles 5–12 y in particular; ground km and eating minutes.
- **Encounters (the v3 tool, 30 + 60, seeds 48 and 7, two draws):** T-IGE-1..3, T-PAT-1..3, -5..7, T-BRD-1 (the tool's rows
  equal e-bench's: checked on eight seed-configurations); observer encounters per community-year by the followed focal's
  context and the decomposition against S16 (§3.3's arithmetic); **contacts per patrol** (truth hearing episodes with a
  listener on it, per patrol; observer encounters per followed patrol) and **outside patrols** (observer encounters not
  opened on a patrol, per community-year); truth patrols per community-week; the flicker share of led formings; time
  within earshot by class; the change of centre gaps; deaths by cause. The patrol classifier's precision and recall decide
  which T-PAT rows would pass e-bench's instrument bar.
- **The S16 encounter reference at 30 + 60** grows to four realizations: D16a, D16b (above) plus **D16c, D16d** (the tool on S16
  with `rgTemperature` 0.1639 and 0.16405, the quick group's other re-draws), so arm readouts are read against the
  reference's own spread (mean ± SD of four runs).

## 6. Arm A1, predictions and kill criterion

**A1** = S16 + `patrolFusion` 1. Runs (frozen detached checkout of the commit that adds this section, `scratchpad/e4j/frozen-a1`):
`e-bench --quick` and `energy-diagnose` (seeds 48, 7, 30 + 30; `--workers` 2 below load 8, else 1), and the v3 tool at 30 + 60
on seeds 48 and 7 without and with `rgTemperature` 0.1641 (A1a, A1b); D16c and D16d from the same checkout (switch 0).

| Quantity | S16 reference | Prediction for A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 49 | 49 | high |
| Viability; starvation deaths | pass; 0 | pass; 0 | moderate |
| Led formings that are sight flicker | 39–52% | 0 | high (by construction) |
| Truth patrols per community-week (30 + 60) | 1.85 (D16a/b) | 0.8–1.4 | low |
| Time within earshot, % of daylight pair-quarter-hours | 9.31 (patrol-linked 3.06; S13 4.60 and 0.67) | 6–8.5 (patrol-linked 1.3–2.3) | low |
| T-IGE-1 at 30 + 60, two draws pooled (band 5–12) | 27.6 (D16a/b; four-run mean to come) | 15–24, still above 12 | low (direction moderate) |
| Observer encounters on patrols / outside patrols, per community-year (`onoff.py`) | 9.2 / 18.4 (S16 F runs pooled; S13 1.5 / 10.8) | both lower, on patrols by 30–60% | low |
| T-PAT-1 (focal; band 0.1–0.5) | 0.25 | 0.12–0.22 | low |
| T-PAT-6 (band 0.4–0.7); T-PAT-7 | 0.55–0.65; 0–0.08 | 0.4–0.7; 0–0.1 | low |
| Quick fitted; held-out with and without T-HUN-4 and T-BRD-1 (vs S16q group) | group mean | inside noise (fitted may fall with T-IGE-1) | moderate |
| Nursing mothers' and juveniles' reserve trends (quick) | S16q group | within 2 SD | moderate |

**Kill criterion** (`patrolFusion` stays off and the result is recorded): viability fails or a starvation death the
reference group does not have; held-out up beyond noise (z > 2) with or without the rare rows; nursing mothers' or
juveniles' reserves more than 3 SD below the S16q group's mean; patrolling degenerate (truth rate below 0.05 or above 5
per community-week).

**Keep rule (standard):** viable; held-out not up beyond noise with and without the rare rows; prescriptions fall. The
last leg cannot pass (49 = 49), so the best reading is "a correction": recorded as a provisional keep candidate as a
correction if no kill criterion is met and T-IGE-1 at 30 + 60 falls below the S16 four-run mean by more than 2 SD of those
runs; otherwise recorded, off.

## 7. Iterations

At most 3, each logged here and committed before its run. An iteration changes the mechanism from first principles (a
defect, an omitted cost or state), never a weight to move a row. Iteration 1 is A1.

### Run log (each entry written before its run)

- **A1 and the S16 30 + 60 re-draws** (as registered in §5–§6), from `scratchpad/e4j/frozen-a1` at the commit that adds
  this entry: chain Q `e-bench --quick --params <A1> --out artifacts/validation/e4j/A1q` then `energy-diagnose --seeds 48,7
  --burn-in 30 --days 30 --params <A1> --json artifacts/validation/e4j/A1q-energy.json`; chain T the v3 tool A1a, A1b, D16c,
  D16d (seeds 48 then 7 each). Load checked before launch; one process per chain.

### A1 results (frozen-a1 at 41a8fd2, clean; printed by `scratchpad/e4j/judge_e4j.py` and `final_table.py` from the JSON)

```
A1q: 41a8fd2 dirty 0 prescriptions 49 viability pass; deaths by cause [{}, {}]; starvation [0, 0]
  ref S16q.json: 721b0fb dirty 0 prescriptions 49
  ref S16q1.json: 721b0fb dirty 0 prescriptions 49
  ref S16q2.json: 721b0fb dirty 0 prescriptions 49
  ref S16q3.json: 721b0fb dirty 0 prescriptions 49
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 4.82, 1.70, 2.25, 3.95 (mean 3.18, sd 1.45; used 1.45) | A1q.json: 1.50, Δ -1.69, z -1.0 (inside noise)
  held-out           (12 rows) ref 3.38, 3.80, 4.52, 3.88 (mean 3.90, sd 0.47; used 1.26) | A1q.json: 3.69, Δ -0.20, z -0.1 (inside noise)
  held-out w/o rare  (11 rows) ref 3.38, 3.80, 4.52, 3.88 (mean 3.90, sd 0.47; used 0.48) | A1q.json: 3.54, Δ -0.35, z -0.7 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-HUN-4   held-out ref 0.00±0.00 | A1q.json 0.15 (fail)
   T-SOC-9   fitted   ref 0.02±0.05 | A1q.json 0.55 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (11 rows): S16q 3.38 / 3.80 / 4.52 / 3.88 (mean 3.90, sd 0.47; used 0.48); A1q.json 3.54 (z -0.7)
fitted rows, distance (S16q group mean ± SD | arms):
  T-ACT-1   0.00 ± 0.00 | A1q.json 0.00 (value 0.412)
  T-ACT-2   0.02 ± 0.02 | A1q.json 0.00 (value 0.175)
  T-ACT-3   0.07 ± 0.03 | A1q.json 0.02 (value 0.095)
  T-ACT-4   0.00 ± 0.00 | A1q.json 0.00 (value 0.344)
  T-COM-1   0.00 ± 0.00 | A1q.json 0.00 (value 0.711)
  T-COM-11  0.52 ± 0.27 | A1q.json 0.83 (value 0)
  T-COM-5   0.00 ± 0.00 | A1q.json 0.00 (value 2.72)
  T-COM-8   0.07 ± 0.06 | A1q.json 0.03 (value 0.609)
  T-FOOD-2  0.00 ± 0.00 | A1q.json 0.00 (value 0.688)
  T-HUN-1   0.00 ± 0.00 | A1q.json 0.00 (value 15.9)
  T-HUN-2   1.03 ± 0.62 | A1q.json 0.00 (value 0.5)
  T-HUN-3   0.05 ± 0.04 | A1q.json 0.06 (value 0.0275)
  T-IGE-1   1.39 ± 0.73 | A1q.json 0.00 (value 8.97)
  T-PTY-1   0.00 ± 0.00 | A1q.json 0.00 (value 4.1)
  T-RNG-4   0.00 ± 0.00 | A1q.json 0.00 (value 1.99)
  T-SOC-9   0.02 ± 0.05 | A1q.json 0.55 (value 0.00327)

| Reserves ÷ store, % per day (OLS) | S16q runs | S16q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | -0.002 / -0.002 / -0.004 / -0.011 | -0.005 ± 0.004 | -0.004 (z +0.1) |
| female, other | -0.003 / -0.026 / +0.007 / -0.004 | -0.007 ± 0.014 | +0.008 (z +0.9) |
| female, lactating | -0.009 / -0.007 / -0.007 / -0.041 | -0.016 ± 0.017 | +0.007 (z +1.2) |
| juvenile 5–12 y | -0.019 / -0.015 / -0.054 / -0.020 | -0.027 ± 0.018 | +0.001 (z +1.4) |
| infant 2–5 y | -0.013 / +0.005 / +0.007 / -0.031 | -0.008 ± 0.018 | -0.008 (z -0.0) |
| infant 0.5–2 y | -0.003 / -0.024 / -0.022 / -0.044 | -0.023 ± 0.017 | +0.013 (z +2.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Ground km / eating min | S16q runs | S16q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.52 / 2.49 / 2.61 / 2.35 | 2.49 ± 0.11 | 2.21 (z -2.4) |
| adult male: eatingMin | 255.60 / 254.75 / 257.07 / 254.24 | 255.41 ± 1.24 | 256.15 (z +0.5) |
| female, other: groundKm | 1.87 / 1.73 / 1.92 / 1.80 | 1.83 ± 0.08 | 1.46 (z -4.2) |
| female, other: eatingMin | 266.62 / 261.52 / 273.33 / 264.35 | 266.45 ± 5.03 | 259.78 (z -1.2) |
| female, lactating: groundKm | 2.11 / 1.97 / 2.28 / 2.07 | 2.11 ± 0.13 | 1.96 (z -1.0) |
| female, lactating: eatingMin | 318.59 / 316.41 / 320.53 / 318.05 | 318.40 ± 1.70 | 322.33 (z +2.1) |
| juvenile 5–12 y: groundKm | 2.34 / 2.15 / 2.06 / 2.26 | 2.20 ± 0.13 | 2.02 (z -1.3) |
| juvenile 5–12 y: eatingMin | 283.23 / 289.57 / 295.28 / 281.56 | 287.41 ± 6.28 | 275.44 (z -1.7) |
A1 energy deaths: {}

30 + 60, seeds 48 and 7 (tool rows = e-bench rows); S16 reference runs ['D16a', 'D16b', 'D16c', 'D16d']; arms ['A1a', 'A1b']; S13 confirm runs (5 seeds) beside
| Row (pooled) | S16 runs | S16 mean ± SD | A1a | A1b | S13 tool (D13a, D13b) | S13 confirm runs (5 seeds) |
| --- | --- | --- | --- | --- | --- | --- |
| T-IGE-1 | 32.9 / 22.3 / 20 / 19.8 | 23.8 ± 6.2 | 12.6 (z -1.6) | 10.2 (z -2.0) | 18 / 6.7 | 11.4 / 7.19 / 7.46 / 6.55 |
| T-IGE-2 | 0.957 / 1 / 1 / 0.958 | 0.979 ± 0.024 | 1 (z +0.8) | 1 (z +0.8) | 0.962 / 1 | 0.971 / 1 / 1 / 1 |
| T-IGE-3 | — / — / — / — | — | — | — | — / — | 0.286 / 0.701 / 0.349 / 2.5 |
| T-PAT-1 | 0.252 / 0.251 / 0.116 / 0.193 | 0.203 ± 0.064 | 0.154 (z -0.7) | 0.135 (z -0.9) | 0.116 / 0.0773 | 0.0851 / 0.0463 / 0.0923 / 0.0772 |
| T-PAT-2 | — / — / — / — | — | — | — | — / — | 2.86 / 1.64 / 2.95 / 3.28 |
| T-PAT-3 | — / — / — / — | — | — | — | — / — | 0.594 / 0.626 / 0.59 / 0.738 |
| T-PAT-5 | — / — / — / — | — | — | — | — / — | 148 / 158 / 121 / 192 |
| T-PAT-6 | 0.548 / 0.652 / 0.435 / 0.5 | 0.534 ± 0.092 | 0.588 (z +0.5) | 0.5 (z -0.3) | 0.562 / 0.154 | 0.385 / 0.174 / 0.0526 / 0.25 |
| T-PAT-7 | 0.0769 / 0 / 0 / 0.1 | 0.0442 ± 0.052 | 0 (z -0.8) | 0 (z -0.8) | 0 / 0 | 0 / 0 / 0 / 0 |
| T-BRD-1 | — / — / — / — | — | — | — | — / — | 0.21 / 0.0672 / 0.0197 / -0.242 |

| Readout | S16 runs | S16 mean ± SD | A1a | A1b | S13 (D13a / D13b) |
| --- | --- | --- | --- | --- | --- |
| T-IGE-1 (tool) | 32.9 / 22.3 / 20 / 19.8 | 23.8 ± 6.2 | 12.6 (z -1.6) | 10.2 (z -2.0) | 18 / 6.7 |
| observer encounters on patrols, per CY | 11 / 7.43 / 4.45 / 5.87 | 7.18 ± 2.8 | 2.97 (z -1.3) | 2.9 (z -1.4) | 2.99 / 0 |
| observer encounters outside patrols, per CY | 21.9 / 14.9 / 15.6 / 13.9 | 16.6 ± 3.6 | 9.67 (z -1.7) | 7.26 (z -2.3) | 15 / 6.7 |
| truth patrols per community-week | 2 / 1.69 / 2.26 / 1.36 | 1.83 ± 0.39 | 0.836 (z -2.3) | 1.19 (z -1.5) | 0.739 / 0.622 |
| patrols reaching 3 adult males | 0.515 / 0.471 / 0.543 / 0.471 | 0.5 ± 0.035 | 0.512 (z +0.3) | 0.475 (z -0.6) | 0.658 / 0.719 |
| patrol incursions (leader in a neighbour range) | 0.447 / 0.425 / 0.284 / 0.386 | 0.386 ± 0.072 | 0.605 (z +2.7) | 0.41 (z +0.3) | 0.263 / 0.219 |
| contacts per patrol (truth hearing episodes, listener on it) | 0.65 / 0.483 / 0.362 / 0.629 | 0.531 ± 0.13 | 0.628 (z +0.6) | 0.508 (z -0.2) | 0.368 / 0.281 |
| observer encounters per followed patrol | 0.484 / 0.417 / 0.24 / 0.421 | 0.39 ± 0.1 | 0.4 (z +0.1) | 0.286 (z -0.9) | 0.333 / 0 |
| led formings that were flicker | 0.388 / 0.523 / 0.444 / 0.514 | 0.467 ± 0.063 | 0 (z -6.6) | 0 (z -6.6) | 0.15 / 0.25 |
| time within earshot, % | 10.1 / 8.5 / 5.66 / 5.59 | 7.47 ± 2.2 | 4.26 (z -1.3) | 4.42 (z -1.2) | 5.02 / 4.17 |
|   patrol-linked, % | 3.85 / 2.27 / 2.14 / 1.82 | 2.52 ± 0.91 | 1.46 (z -1.0) | 1.41 (z -1.1) | 0.901 / 0.442 |
|   border + core, % | 6.27 / 6.22 / 3.52 / 3.77 | 4.95 ± 1.5 | 2.79 (z -1.3) | 3.01 (z -1.1) | 4.12 / 3.73 |
| centre gap change over 60 d, m | -137 / -80.2 / -138 / -80.7 | -109 ± 33 | 28.3 (z +3.7) | -113 (z -0.1) | -70.5 / 0.5 |
| truth hearing episodes per listener community-year | 316 / 270 / 179 / 186 | 238 ± 67 | 149 (z -1.2) | 152 (z -1.2) | 152 / 140 |
| seen contacts per community-year (truth) | 14.2 / 6.08 / 2.03 / 4.06 | 6.59 ± 5.3 | 0 (z -1.1) | 4.06 (z -0.4) | 4.06 / 0 |
| stats.intergroupEncounters per community-week | 2.64 / 2.31 / 1.81 / 1.77 | 2.13 ± 0.42 | 1.46 (z -1.4) | 1.44 (z -1.5) | 1.44 / 1.21 |
A1a: patrol classifier p/r (focal, males) per seed [(1, 0.8333333333333334, 1, 0.7142857142857143), (1, 0.75, 0.8888888888888888, 0.9230769230769231)]; deaths [{}, {}]
A1b: patrol classifier p/r (focal, males) per seed [(1, 0.7777777777777778, 1, 0.8125), (1, 0.25, 0.7777777777777778, 0.4117647058823529)]; deaths [{}, {}]
```

```
| Readout | S16 ref (4 draws, mean ± SD) | A1 | S13 confirm runs (5 seeds) |
| --- | --- | --- | --- |
| T-IGE-1 (30 + 60) | 23.8 ± 6.2 | 12.6 / 10.2 (mean 11.4) | 11.4 / 7.19 / 7.46 / 6.55 |
| T-IGE-2 (30 + 60) | 0.979 ± 0.0243 | 1 / 1 (mean 1) | 0.971 / 1 / 1 / 1 |
| T-IGE-3 (30 + 60) | — | — | 0.286 / 0.701 / 0.349 / 2.5 |
| T-PAT-1 (30 + 60) | 0.203 ± 0.0641 | 0.154 / 0.135 (mean 0.145) | 0.0851 / 0.0463 / 0.0923 / 0.0772 |
| T-PAT-6 (30 + 60) | 0.534 ± 0.0916 | 0.588 / 0.5 (mean 0.544) | 0.385 / 0.174 / 0.0526 / 0.25 |
| T-PAT-7 (30 + 60) | 0.0442 ± 0.0519 | 0 / 0 (mean 0) | 0 / 0 / 0 / 0 |
| truth patrols per community-week (30 + 60) | 1.83 ± 0.39 | 0.84 / 1.19 (mean 1.01) | — |
| contacts per patrol (truth hearing episodes, a listener on it) | 0.53 ± 0.13 | 0.63 / 0.51 (mean 0.57) | — |
| observer encounters outside patrols, per community-year | 16.6 ± 3.6 | 9.7 / 7.3 (mean 8.5) | — |
| quick sums vs S16q group (rows counted in all runs; arm value, z) | fitted 4.82 / 1.70 / 2.25 / 3.95 ; held-out 3.38 / 3.80 / 4.52 / 3.88 ; held-out w/o rare 3.38 / 3.80 / 4.52 / 3.88 | fitted 1.50 (z -1.0); held-out 3.69 (z -0.1); w/o T-HUN-4, T-BRD-1 3.54 (z -0.7) | — |
| prescriptions; viability (quick) | 49; pass | 49; pass (deaths [{}, {}]) | 65; pass |
```

```
S16 reference T-IGE-1 (4 runs): 32.92 / 22.29 / 20.05 / 19.81; mean 23.76, SD 6.20; threshold mean - 2 SD = 11.36
A1: 12.64 / 10.16; mean 11.40; (mean - ref mean) / SD = -1.99; criterion (below mean - 2 SD): not met

## Decomposition S16 -> A1 (both draws and both seeds pooled): E 23.79 -> 11.39, dE -12.40
  patrol         h 0.015 -> 0.007, r  464.6 ->  432.1: exposure part -3.71, rate part -0.36
  pursuit        h 0.000 -> 0.000, r 7055.4 ->    0.0: exposure part -0.16, rate part -0.21
  incursion      h 0.003 -> 0.001, r  247.5 ->  656.9: exposure part -0.84, rate part +0.84
  border-forage  h 0.050 -> 0.050, r   18.6 ->    7.3: exposure part +0.01, rate part -0.56
  border-other   h 0.079 -> 0.082, r   79.8 ->   53.5: exposure part +0.25, rate part -2.11
  core-forage    h 0.340 -> 0.343, r    2.2 ->    1.1: exposure part +0.00, rate part -0.38
  core-other     h 0.513 -> 0.516, r   15.1 ->    5.0: exposure part +0.03, rate part -5.20
  sum -12.40 (check against dE -12.40)
  more patrols (exposure) -3.71; more contacts per patrol (rate) -0.36; outside patrols -8.33 (exposure -0.71, rate -7.62)
  scoring readouts: concurrent 0.00775 -> 0; field-attributable 0.977 -> 1; seen share 0.00775 -> 0

S16 patrol 1.72 leaver 0.36 pursuit 0.03 incursion 0.41 border 2.39 core 2.55 total 7.47
A1 patrol 1.04 leaver 0.10 pursuit 0.00 incursion 0.29 border 1.66 core 1.24 total 4.34
change S16 -> A1 (points): patrol -0.68 leaver -0.26 pursuit -0.02 incursion -0.12 border -0.73 core -1.31 total -3.13
  patrol-linked (patrol, leaver, pursuit, incursion) -1.08 (35%); border + core -2.04 (65%)
S13: 12 pair-runs, mean change of centre gaps -35 m (min -141, max +107)
S16: 24 pair-runs, mean change of centre gaps -109 m (min -272, max +61)
A1: 12 pair-runs, mean change of centre gaps -42 m (min -284, max +245)
```

**Against the predictions.** Prescriptions 49: held. Viability, no starvation: held (no death in the quick runs or in the
four 90-day tool runs). Led formings that were sight flicker 0: held. Truth patrols 0.8–1.4 per community-week: held
(0.84, 1.19). Time within earshot 6–8.5%: **missed low** — 4.26% and 4.42% (S16's four draws 7.47 ± 2.23; S13 5.02, 4.17);
patrol-linked 1.3–2.3: held (1.46, 1.41). T-IGE-1 15–24, still above 12: **missed low** — 12.6 and 10.2 (mean 11.4, inside the band; S16's four draws 23.8 ± 6.2).
Observer encounters on patrols down 30–60%: held against the four S16 draws (7.18 ± 2.8 → 2.97 and 2.90 per
community-year); outside patrols lower: held (16.6 ± 3.6 → 9.67 and 7.26). T-PAT-1 0.12–0.22: held (0.154, 0.135). T-PAT-6 0.4–0.7 and T-PAT-7 0–0.1: held (0.588, 0.5; 0, 0). Quick
sums inside noise: held (fitted z −1.0, held-out −0.1, without the rare rows −0.7). Nursing mothers' and juveniles'
reserve trends within 2 SD: held, both higher (z +1.2, +1.4). No kill criterion is met.

**Not predicted.** The border and core part of the time within earshot fell further than the patrol rate (4.95 ± 1.5 on
S16's four draws → 2.79 and 3.01, below S13's 4.12 and 3.73): once patrols stop pulling the ranges together, parties in
their ranges are no closer to neighbours than on S13 (centre gaps −42 m over 60 days, S13 −35, S16 −109). Walking falls (adult males 2.21 km, z −2.4; other females 1.46 km, z −4.2) with eating time
unchanged. Patrols reaching three adult males stay at half (0.51, 0.48): the occasion was not the reason. In quick mode
T-SOC-9 (reconciliation, fitted; 11 individuals' PC–MC tendencies) fell to 0.003 against the group's 0.07–0.21
(distance 0.55 against 0.02 ± 0.05): no path from the patrol occasion to reconciliation is known; a reading for the
confirm.

## 8. Verdict

**`patrolFusion` 1 (iteration 1, A1) is recorded, off, by the registered reading, narrowly.** Its T-IGE-1 at 30 + 60
(two draws 12.64 and 10.16, mean 11.40; `criterion.py`) sits 1.99 SD below S16's four-draw mean (23.76 ± 6.20) against
the registered line of 2 SD (11.36). No kill criterion is met; the standard keep rule cannot pass (a correction: 49 = 49
prescriptions); in quick mode every sum is inside noise against S16's four realizations (fitted z −1.0, held-out −0.1,
without T-HUN-4 and T-BRD-1 −0.7, without T-IGE-3 as well −0.7); viable, no death; every class's reserve trend at or above
the group's; walking lower. A 5-seed confirm (S17 = S16 + `patrolFusion` 1, against S16's confirm group) decides: two
seeds × 60 days leave the observer row an SD of 6.2 on 23.8.

What the stage shows:
- **The excess is real and is not the scoring.** The observer's definition follows wilson2012's except for one encounter
  per neighbour community and the caller's community read from the call; applying the source's community-blind 1-h rule
  or its attribution by direction changes at most 2.3% of encounters in either stack. Calling did not change either.
- **It is time within earshot, and the patrol rate drives it.** Communities spend 1.6 times longer within 1 km of each
  other on S16 (4.6% → 7.5% of daylight quarter-hours): two thirds on patrol trips (truth patrols 0.68 → 1.83 per
  community-week), a third because frequent, deep patrols pull the ranges together (centres closing −109 against −35 m in
  60 days) while members spend no more time at their periphery. On the observer, half the rise is encounters outside
  patrols, half on them.
- **Half the S16 patrol rate was an artefact of the occasion.** 39–52% of the patrols that started did so at a flicker of
  sight inside a party that already held three adult males (a 35 m view inside a 50 m party chain). Counting a male's party
  as the adult males he has been with within `reunionH` (the model's reunion span; no new magnitude) halves the patrols
  (0.84, 1.19 per community-week), brings the time within earshot back to S13's (4.26%, 4.42%), halves encounters outside
  patrols with contacts per patrol unchanged, and puts T-IGE-1 in its band in both draws' mean.
- **No second or third iteration.** Nothing else is implicated: what remains sets the rate through E4i's design constants,
  and moving them to lower T-IGE-1 further would be tuning to the row. No scorer change is staged (the diagnosis did not
  put the excess in the scoring).

**Open problems and known defects, deferred (file:line at 41a8fd2).**
- The rate of patrolling still follows from design constants (the lead's ceiling, `patrolStaleTauDays`, RG's sampling at a
  fusion; src/sim/patrol.ts `leadValue`), and T-PAT-1 on focal follows sees about one truth patrol in seven (0.136–0.143
  in S13, S16 and A1), so no scored row polices the truth rate (~1 per community-week on A1).
- Half the patrols never hold three adult males: the males in view at the fusion decide on joining one by one
  (src/sim/candidates.ts:1153), and nothing makes a patrol that leaves with fewer turn back.
- Patrol trips count as use in the range distribution like any party (src/sim/parties.ts:85, territory.ts:181 `recordUse`):
  the pull of frequent, deep patrols on the ranges is real in the model and has no field rate to check against.
- The listening cadence `patrolStopEveryMin` (src/sim/parties.ts:195) is still prescribed (E4i).
- The absolute encounter level rests on the 1 km pant-hoot audibility ([L], every source secondary): 58–70% of the
  opening calls the observer heard came from 750–1,000 m.
- In quick mode T-SOC-9 fell to 0.003 (11 individuals' PC–MC tendencies; group 0.07–0.21) with no known path from the
  patrol occasion; the confirm should read it.

**Final checks** (after `git merge --no-ff track-e` at e60dc85: no conflicts; track-e had moved the decision guide to S16
and the handoff): `gen-params --check` clean, `tsc` clean, `pnpm test` 747 tests, 746 pass, 0 fail,
1 skipped (before the merge as well: 747, 746, 0, 1); switch 0 hash-identical to the code under test before the
stage (S16 seed 48 day 4 `81794c794db1ae0e`, S13 seed 7 day 3 `f49c113e3e8f1ebf`); prescription count S16 49, with
`patrolFusion` 1 49; `git ls-files data/raw node_modules` prints nothing. Artifacts (every run's JSON, the analysis
scripts and their printed tables) are in this worktree's `artifacts/validation/e4j/` (gitignored); the frozen checkouts
in the session scratchpad were removed after the copy, so the scripts' paths point there and need the copy's paths to rerun.
