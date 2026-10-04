# E4i pre-registration: why males go on patrol (patrolling as the males' own decision in place of the patrol clock, hazard and dice)

Status: skeleton committed in the stage's first 15 minutes (4 October 2026, branch `e4i-patrols`, from `track-e`
8cae2c4): the problem, the field rows and their samples, the diagnosis plan. The diagnosis results, sources, mechanism,
readouts, predictions and kill criterion are written and committed before any run of the switch on. Track E, stage E4,
piece i (the last piece of the E4 order: "then patrols last", IMPLEMENTATION_PLAN.md). Rules policy only; development
seeds 48 and 7; no run longer than 90 days in all.

Rule served: field values of behaviour are targets, never inputs. No patrol rate, start or end hour, duration, incursion
share or joining probability is set from a field value or tuned to hit a row.

## 1. The problem: every patrol decision on S13 is prescribed

S13 (docs/staging/e-stack2-confirm.md "S13 results"; parameters in bench-run3 `artifacts/validation/e/s13q/S13q-params.json`)
counts 65 prescriptions (`scripts/prescription-ledger.ts --count --params <S13>`). Twelve are patrol entries, all in use:

| Entry (field value) | Class (ledger) | Where | What it decides |
| --- | --- | --- | --- |
| `patrolH0` 0.0183 per h (compressed 0.004) | fitted (T-PAT-1) | perception.ts `rollImpulses` | the base hourly hazard of a patrol impulse per eligible adult male; refitted at C14 by bisection to 0.3 truth patrols per community-week |
| `patrolMaleOddsRatio` 1.17 | probability (T-PAT-4) | perception.ts | the hazard × 1.17^(adult males in view − 3): mitaniWatts2005's own odds ratio copied in |
| `patrolStartH` 8, `patrolEndH` 15.5 | clock (T-PAT-1) | perception.ts | no impulse outside 08:00–15:30 clock hours |
| `patrolIncursionP` 0.4 | probability (T-PAT-6) | execution.ts `startPatrol` | a die at the start: whether the route pushes into the neighbour's range or sweeps along the own edge |
| `patrolMaxH` 6 h | field copy (T-PAT-5) | execution.ts, parties.ts `updatePatrols` | the patrol is ended at 6 h whatever the animals' state |
| `patrolReleaseP` 0.5, `patrolReleaseContactP` 1 | probability | parties.ts | dice for the closing pant-hoot chorus, drum and display |
| `patrolStopEveryMin` 15 | quota | parties.ts | a listening stop every 15 min of travel |
| `patrolFemaleJoin` 0.2, `patrolFemaleStay` −0.3, `patrolLactatingJoin` −1 | field copy (T-PAT-3) | candidates.ts `patrolAndCalls` | Ngogo's near-absence of females written in as join and stay scores |

Also on the path, classed design (not counted): `patrolMinMales` 3 (eligibility), `patrolMaxHunger` 0.75 and
`patrolMaxRain` 0.3 (gates), `patrolStaleTauDays` 7 (staleness S in the hazard), `patrolRollMaxH` 1, the lead score
(`patrolLeadScore` 1.1, `patrolLeadMaleW`, `patrolLeadBoldW`), the route score (`patrolStaleW`, `patrolContactW`,
`patrolLossW`: Amendment A1), the join literals for males (0.85 + 0.3·bond + 0.2·boldness − 0.2 if < 15 y), the
continue score (1.25 − max(0, hunger − 0.6)), `patrolHeardWindowH` and the turn-back rule (stranger males seen or heard
≥ own males: numerical assessment [M-H]), `patrolEdgeSpeed`, `patrolReturnSpeed`, `patrolStopMinMin`/`MaxMin`.

The field picture (research.md "Patrols"; docs/patrol-evidence.md): patrols are made by parties with many males
(mitaniWatts2005: +17% odds per male in the day's largest male party; gilbyWilsonPusey2013: +17% per male for a
periphery visit to become a patrol), more often where the boundary is contested (wattsMitani2001: repeat patrols on
contested edges; mitani2010: killings and expansion in the most patrolled area) and around large fruit crops
(watts2006; wilson2012), silent, in file, with stops to look and listen (wattsMitani2001); patrols cost travel and
feeding time (amsler2010); intruder pressure (days since the last encounter) did not predict a patrol (mitaniWatts2005).

## 2. Field rows scored, and their samples

Read from `data/targets.json`, research.md "Patrols" and docs/patrol-evidence.md (full texts read at C6p, 29 September
2026, unless marked). Sex, reproductive state, body mass and method as the source gives them; body mass enters no row.

| Row (role; band) | Source and sample | Method | Sim scoring (src/field/metrics.ts) |
| --- | --- | --- | --- |
| T-PAT-1 (fitted, tuned; 0.1–0.5 per week) | wattsMitani2001 (FT): Gombe Kasekela 0.30 per week (1977–82) and Taï North 0.3, both cited second hand; Ngogo 52 patrols in 1998–99 (24 adult, 15 adolescent males), 1 per 9.7 d. massaro2022 (FT): Gombe Kasekela 1978–2007, 180 patrols, median 4.5 a year (0–19), 23 males ≥ 12 y | patrols recognised by observers following parties (Ngogo) or from the long-term record (Gombe); males (adult and adolescent) | classified patrols on focal follows ÷ community-days with a follow × 7; instrument bar applies |
| T-PAT-2 (held-out; 7–18 per male-year) | langergraber2017 (FT): Ngogo Sep 1996–Aug 2015, 284 patrols over 2,621 observation days, 24–44 males aged ≥ 13 y; Taï ~10 and Gombe 14.4 as cited | each male's participation per patrol | classified patrols joined per adult male ÷ his community's follow days × 365 |
| T-PAT-3 (held-out; 0.55–0.85 of males) | massaro2022 (FT): 74.5 ± 11.1% of males per patrol, median 8 adult males (1–13), adult females median 3 (0–20); wattsMitani2001: Taï 72% of males, females on 57% of 38 patrols (second hand), Ngogo 9.4 adult males and females essentially absent; langergraber2017: 37.5 ± 15.5% of Ngogo's males | composition of patrol parties | adult males seen on a classified patrol ÷ the community's adult males |
| T-PAT-5 (held-out; 60–240 min) | amsler2010 (abstract; numbers from the realism pass, not re-read): Ngogo 2004–06, 29 patrols, 134 min (15–348, SD 88), 2,456 m (SD 1,492), travel 58% of patrol time; mitaniWatts2005: 2.13 ± 1.01 h (72 patrols); massaro2022: median 88.5 min (3–595) | focal follows of patrolling males | duration of classified patrols |
| T-PAT-6 (fitted; 0.4–0.7) | mitaniWatts2005 (FT): Ngogo 1999–2003, 42 of 72 patrols entered the neighbours' range; 22–24 adult and 13–15 adolescent males | patrol routes | share of classified patrols (male-party follows) entering a neighbour's 95% isopleth |
| T-PAT-7 (held-out; contact 0.15–0.45) | watts2006 (FT): Ngogo 1997–2003, 95 patrols, contact 30/95, physical aggression 12/95 | case records | share of classified patrols with a seen or physical encounter |
| T-BRD-1 (held-out, rare row; slope 0.037–0.107) | lemoine2023 (FT, CC BY S3 Data): Taï East and South (P. t. verus) 2013–16, 625 ≥ 5-min stops on 283 group-days, adults present (not males) | stops at peripheral hills or low places in the overlap zone; advance vs retreat | halts of the focal at 0.8–1.0 of the own equal-area radius; logistic slope of advance on adults present |
| T-IGE-1 (fitted; 5–12 per community-year) | wilson2012 (FT): Kanyawara 1992–2006, 120 encounters in 15 y, 5,527 party follows, 35,083 h; lemoine2020a: Taï 384 in 54 group-years | party follows | encounters on party follows ÷ follow-hours × source effort |
| T-IGE-2 (held-out; 0.7–0.9 auditory) | wilson2012: 102 acoustic, 15 visual, 3 physical of 120 | as above | share of encounters with no stranger seen |
| T-IGE-3 (held-out; 0.25–0.75 log-odds per male) | wilson2012: approach +0.49 (SE 0.12) per adult male, 120 encounters | as above | logistic regression of the focal's approach on own adult males |
| T-PAT-4, T-PAT-8, T-PAT-9 | need a year (NEEDS_YEAR in e-bench) or are not scorable (T-PAT-8); T-PAT-4 compromised, T-PAT-9 encoded-descriptive | — | reported, never summed |

On S13's confirm (bench-run3 `artifacts/validation/e/s13/S13.json`) T-PAT-1, -2, -3, -5 and -7 sit below the patrol
classifier's instrument bar (precision and recall < 0.8) and are excluded from the sums; T-PAT-6, T-BRD-1 and
T-IGE-1..3 are summed. Every T-PAT row is reported here whatever its bar.

## 3. Diagnosis plan (step 1; unchanged code; written and committed before any run)

Tool: `scripts/patrol-diagnose.ts` (new, read-only: it reads the world after each tick and calls no function that
writes world state; the world it watches is the world e-bench simulates, as `e4e-hunt-diagnose.ts` and
`e4f-encounter-diagnose.ts` do). Simulation truth, field profile, seeds 48 and 7, 30-day burn-in + 60 days (the confirm
length the cap allows; patrols are rare).

Readouts (each defined here before the first run):
- **Opportunities.** Every adult male's perception (perception ran this tick) in daylight with ≥ `patrolMinMales` adult
  males of his community in view, no patrol of his community under way, rain below `patrolMaxRain`: the clock hour, in
  or out of the 08:00–15:30 window, adult males in view, party size, distance from the own range centre in equal-area
  radii and the own use isopleth at his cell, a neighbour heard in the last 1 h and 24 h, his contact and loss weight
  in the sector he faces, his states (testosterone-like arousal, stress, hunger, reserves ÷ usable store, sleep
  pressure as 1 − energy), the crop believed at the periphery of the stalest neighbour-facing sector (daily, from the
  sim trees: mean ripe crop of trees between the 0.8 and 0.95 use isopleths in that octant, against the range mean), and
  the dice: the hazard h, the roll's probability 1 − exp(−h·dt), whether an impulse fired, and whether the lead was taken.
- **Patrols** (each from start to end, truth): start hour and daylight left (h to the next 18:40 dusk proxy from
  `environment.daylight`), leader, adult males in view at the start, the most adult males, adolescent males, adult
  females (lactating or not) on it, path length and duration, the incursion die and whether the route entered a
  neighbour's 95% isopleth, contact, turn-back by numerical assessment, listening stops (on schedule vs at waypoints),
  how it ended (route home, the 6 h cap, no member left), the release dice, members' mean states at start and end, and
  for every member who left early: when, to do what, at what hunger.
- **Joining.** Every community member with the leader in view during a patrol and not on it, by class (adult male,
  adolescent male 12–15 y, adult female not lactating, lactating female), and whether it joined.
- **What each prescribed entry decides, with numbers:** the share of opportunities the clock window blocks; expected
  (Σ roll probabilities) against realised impulses; incursion share by the die; patrols ended by the cap; stops on the
  schedule; release dice; female joins against opportunities.
- **Observer rows:** T-PAT-1..9, T-BRD-1 and T-IGE-1..3 from `e-bench` run with `--seeds 48,7 --burn-in 30 --days 60`
  on S13 (once plus one re-draw, `rgTemperature` 0.1641): the patrol reference of this stage.

Runs (frozen detached checkout of the commit that adds the tool, in `scratchpad/e4i`): smoke (seed 48, 1 + 1 days,
every readout produced); D0 = the tool on S13, seeds 48 and 7, 30 + 60 days, one seed per process; P0, P1 = e-bench on
S13 at 30 + 60 days (P1 with `rgTemperature` 0.1641). The shared quick reference (S13q and its three re-draws, the
integrator's) is not re-run.

### Run log (each entry written before its run, unless marked)

- **Smoke** (logged after the run; working tree at the tool commit, scripts only): S13, seed 48, 1 + 1 days and 3 + 12
  days. Every readout is produced; 2 patrols in 12 days, both traced from the fired roll to the release; no patrol
  without a fired roll (tool check).
- **D0, P0, P1** (as registered in §3), from a frozen detached checkout of the commit that adds this entry:
  `scratchpad/e4i/frozen-d0`. D0 = `scripts/patrol-diagnose.ts` on S13, seeds 48 and 7 (one process each), 30 + 60 days,
  `artifacts/validation/e4i/D0-{48,7}.json`; P0 = `e-bench --seeds 48,7 --burn-in 30 --days 60 --params <S13>`; P1 =
  the same with `rgTemperature` 0.1641 (`artifacts/validation/e4i/P{0,1}.json`).
- **D0 note** (logged after the run): D0 (52cafa5) classified every patrol end as "home" (a tool defect: the last
  non-empty member list was kept). Fixed in 1e61c76 (an end with no member on the patrol is "empty"; releases by end;
  daylight left at each opportunity) and re-run as **D0b** from a second frozen checkout (`scratchpad/e4i/frozen-d1`
  at 1e61c76), seeds one after the other (load above 8). P0 and P1 ran from `frozen-d0` (52cafa5; scripts only differ).

### D0b and P0/P1 results (printed by `scratchpad/e4i/diag_table.py` and `patrol_rows.py` from the JSON)

```
## D0b S13 (tool 1e61c76; seeds 48, 7; 30 + 60 days): 2 seeds, 51.4 community-weeks
patrols started 38 = 0.74 per community-week (truth)
daylight opportunities (adult male perception, >= 3 adult males in view, no patrol, rain below the gate): 45268; in the 08:00-15:30 window 27159, outside 18109 (40%)
expected impulses (sum of roll probabilities): in window 44.1, blocked by the clock 15.2 (26% of the would-be total); impulses fired 39, of which led 38
  all rolls    : males 3.61, party 6.7, r/R 0.35, periphery 0.12, heard 24 h 0.035, contact 1.59, loss 0.48, border crop 0.84, light left 6.9 h | hunger 0.27, sleep 0.33, thirst 0.047, arousal 0.069, stress 0.12, reserve -0.013
  fired rolls  : males 3.46, party 6.6, r/R 0.27, periphery 0.03, heard 24 h 0.000, contact 1.44, loss 0.42, border crop 0.77, light left 7.3 h | hunger 0.21, sleep 0.31, thirst 0.023, arousal 0.117, stress 0.15, reserve -0.010
  clock-blocked: males 3.63, party 6.6, r/R 0.41, periphery 0.21, heard 24 h 0.029, contact 1.08, loss 0.33, border crop 0.83, light left 3.3 h | hunger 0.44, sleep 0.43, thirst 0.138, arousal 0.071, stress 0.16, reserve -0.015
rolls by adult males in view (n, expected, fired): {3: (16270, 27.4, 25), 4: (6656, 10.5, 11), 5: (3129, 4.3, 2), 6: (815, 1.3, 1), 7: (289, 0.5, 0)}
start hour: {8: 5, 9: 7, 10: 5, 11: 1, 12: 7, 13: 8, 14: 5}
duration min: median 162, range 64-272, > 6 h 0; path km median 2.12
ended by: {'empty': 19, 'home': 19} | release: 11 of 38 | release after contact: 3 of 14
incursion die true 16/38 (0.42); entered a neighbour 95% isopleth: die true 10/16, die false 0/22; overall 0.26
contact 0.37, turned back 0.11
stops: on schedule 273, at waypoints 57
most adult males at once: {1: 2, 2: 11, 3: 17, 4: 6, 5: 1, 6: 1} | >= 3: 0.66; with females 4/38
joining (opportunities, joined): {'adultMale': [69, 27], 'adolescentMale': [10, 2], 'adultFemale': [36, 1], 'lactatingFemale': [20, 0]}
members leaving early, to: {'travel': 62, 'forage': 19, 'flee': 3, 'call': 2, 'drink': 2, 'hunt': 2, 'groom': 1, 'rest': 1, 'charge': 1}
adult male members at start -> end: hunger 0.19 -> 0.60, sleep 0.31 -> 0.41, thirst 0.026 -> 0.089, arousal 0.092 -> 0.056
daylight left at start median 6.7 h, at end 4.2 h
patrol day vs most adult males in one party (truth, per seed): OR [1.7928, 1.5558] | mean max males patrol days [5.5263, 4.1111] other days [3.6087, 3.2407]
intergroup encounters per community-week (stats): [0.8556, 2.0222] | deaths: [{}, {}]
```

Observer rows at 30 + 60 days (P0 = S13, P1 = S13 with `rgTemperature` 0.1641; "(x)": below the instrument bar,
excluded from the sums; "ins": insufficient):

| Row (band) | ref 1 | ref 2 | ref mean |  |
| --- | --- | --- | --- | --- |
| T-PAT-1 (0.1–0.5) | 0.116 (x) | 0.0773 (x) | 0.0967 |  |
| T-PAT-2 (7–18) | 4.33 (x) | 2.6 (x) | 3.47 |  |
| T-PAT-3 (0.55–0.85) | 0.688 (x) | 0.546 (x) | 0.617 |  |
| T-PAT-5 (60–240) | 155 (x) | 189 (x) | 172 |  |
| T-PAT-6 (0.4–0.7) | 0.562 | 0.154 (x) | 0.358 |  |
| T-PAT-7 (0.15–0.45) | 0 (x) | 0 (x) | 0 |  |
| T-BRD-1 (0.037–0.107) | — ins | — ins | — |  |
| T-IGE-1 (5–12) | 18 | 6.7 (x) | 12.3 |  |
| T-IGE-2 (0.7–0.9) | 0.962 | 1 (x) | 0.981 |  |
| T-IGE-3 (0.25–0.75) | 0.104 | — (x) ins | 0.104 |  |
ref 1: git 52cafa5 dirty 0, fitted 2.09, held-out 4.89, prescriptions 65, viability True, deaths 0, starvation 0
ref 2: git 52cafa5 dirty 0, fitted 2.24, held-out 4.13, prescriptions 65, viability True, deaths 0, starvation 0

**What each prescribed entry decides on S13 (truth, two seeds, 51 community-weeks):**
- **Start (`patrolH0`, `patrolMaleOddsRatio`, `patrolStartH`/`EndH`).** Every patrol starts from the hazard roll: 39
  impulses fired, 38 led within the impulse's six minutes, no patrol without a fired roll. The roll ignores the males'
  state and place: fired rolls look like all rolls (hunger 0.21 against 0.27, sleep pressure 0.31 against 0.33, 3.5
  against 3.6 males in view, mostly in the core: r/R 0.27, 3% at the periphery). The clock window blocks 40% of daylight
  opportunities and 26% of the would-be impulses; the blocked hours hold hungrier, sleepier males (hunger 0.44, sleep
  0.43, 3.3 h of daylight left). Truth rate **0.74 per community-week**, 2.5 × the 0.30 that `patrolH0` was refitted to at
  C14 (the stack's males spend more time in parties of three or more), while the observer sees 0.08–0.12 per week
  (T-PAT-1, below the instrument bar).
- **Incursion (`patrolIncursionP`).** The die decides every incursion: 10 of 16 die-true patrols entered a neighbour's
  95% isopleth, 0 of 22 die-false ones; truth incursion share 0.26 (observer T-PAT-6 0.56 and 0.15).
- **Length (`patrolMaxH`).** Never binds: 0 of 38 patrols reached 6 h (longest 272 min). Patrols end when the route
  comes home (19) or when every member has left (19), members leaving mostly to travel (62) or forage (19) as their
  hunger rises from 0.19 at the start to 0.60 at the end (sleep pressure 0.31 → 0.41): the end is already the animals'
  state, through the design continuation score (1.25 − max(0, hunger − 0.6)).
- **Release (`patrolReleaseP`, `patrolReleaseContactP`).** 11 releases in 38 patrols (3 of 14 after contact: most
  contact patrols end with no member left, so no release).
- **Stops (`patrolStopEveryMin`).** 273 of 330 listening stops (83%) come from the 15-min schedule, 57 from waypoints.
- **Joining (`patrolFemaleJoin`, `patrolFemaleStay`, `patrolLactatingJoin`).** Later opportunities (the leader in view,
  not on the patrol): adult males joined 27 of 69, adolescent males 2 of 10, adult females 1 of 36, lactating females 0
  of 20; 4 of 38 patrols had a female (all from the start alert).
- **Party males.** 66% of patrols reached three adult males at once. The day's most adult males in one party predicts a
  patrol day (truth odds ratio 1.79 and 1.56 per male; the field's 1.17 is per adult and adolescent male, Ngogo) through
  the hazard's three-male gate and its own 1.17 factor: encoded.
- **Rows.** T-PAT-1, -2, -3, -5, -7 sit below the instrument bar in both references; T-PAT-7 is 0 (no classified patrol
  with a seen encounter); T-BRD-1 is insufficient at two seeds; T-IGE-1 18.0 and 6.7, T-IGE-2 0.96 and 1.00 (encounters
  heard, almost never seen), T-IGE-3 0.10 and insufficient. No deaths.
