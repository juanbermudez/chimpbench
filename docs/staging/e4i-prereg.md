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

### Reading (what the diagnosis implicates)

- The start is a die that ignores the males' state, place and odds; the clock stands in for what the hours carry (later
  hours hold hungrier, sleepier males with less light left). Implicated: `patrolH0`, `patrolMaleOddsRatio`,
  `patrolStartH`, `patrolEndH`.
- The incursion is a die. Implicated: `patrolIncursionP`.
- The end is already the animals' state (members leave as hunger rises; the cap never binds), so `patrolMaxH` decides
  nothing on S13 and can go without a replacement; the release dice decide a call act that the call rules (E4c
  `callValue`, in S13) already value. Implicated: `patrolMaxH`, `patrolReleaseP`, `patrolReleaseContactP`.
- Joining is set for females by Ngogo's absence written in. Implicated: `patrolFemaleJoin`, `patrolFemaleStay`,
  `patrolLactatingJoin`.
- **Not implicated here, deferred:** `patrolStopEveryMin` (the 15-min listening cadence). It makes 83% of stops, but it
  encodes no target row, the patrol classifier of the observer (≥ 2 listening stops) and T-BRD-1 depend on stops, and no
  source gives what sets a cadence (a stop samples a few minutes of sound; neighbours call intermittently). Replacing it
  needs a model of the value of listening; recorded as open (src/sim/parties.ts updatePatrols, `listen(71)`).
- A first idea, a decision at each arrival of a male party at the periphery (gilbyWilsonPusey2013's periphery visits),
  was checked before any code (D1, tool a96271d, read-only): parties with ≥ 3 adult males reach the own-use periphery
  only 2.33 and 1.01 times per community-week, where the neighbours' use is about 0 (0.012, 0.001) and one seed's males
  hold almost no contact memory; a lead valued there would start about 0.04 patrols per community-week. The model's
  large male parties stay in the core; patrols carry them out. So the decision is taken where the males are, as today,
  with the trip's cost and the daylight it needs in the value.

## 4. Mechanism (switch `patrolValue`, 0 = today; src/sim/patrol.ts, committed with this section)

One switch, both profiles default 0 (bit-identical at 0: S13 seed 48 after 12 days, 2 patrols on the path,
80f6d376f3127173 before and after; S13 seed 7 after 4 days and all-off seed 7 after 6 days, identical). With it on:

1. **The lead is an option valued from state** (candidates.ts `patrolAndCalls`, patrol.ts `leadValue`). No hazard roll,
   no odds ratio, no clock. At a decision point an adult male with ≥ `patrolMinMales` adult males of his community in
   view, no patrol under way, hunger below `patrolMaxHunger` and rain below `patrolMaxRain` (the design gates kept) is
   offered the lead at
   `V = ceiling × min(1, S × q × D × (1 − sleep pressure) × (1 + arousal))`, the E4a rule (the score the dice-opened
   option had is the ceiling; levels in 0..1 multiply it; no new score constant):
   - ceiling = `patrolLeadScore` + `patrolLeadMaleW` × (males in view − `patrolMinMales`) + `patrolLeadBoldW` × boldness
     (the C6 lead score, design);
   - S = 1 − exp(−days since the route sector's periphery was last used by a party with an adult male ÷
     `patrolStaleTauDays`): the information a check brings (the hazard's own term; route by Amendment A1, unchanged:
     contested edges attract, losses repel unless many males);
   - q = his males' summed strength (in view, himself included) against the neighbour's males as he last saw them
     together or heard them call together, each assessed as strong as his party's average adult male, by the model's
     contest function (`contestExponent`): numerical assessment [H] (wilson2001; lemoine2023 [M]); parity (0.5) when
     he remembers nothing of that neighbour (design);
   - D = the share of the trip that fits before sunset: out to the sector's range edge, a quarter circle along it and
     home to the centre, at `walkMps` (design geometry) — daylight in place of the clock;
   - 1 − sleep pressure (E2a's state; 1 − energy without it): fatigue in place of the clock;
   - 1 + competitive arousal: E4b's gain of a male competitive act (the testosterone-like state; sobolewski2012 not
     verified: design).
   The energy of the trip is not a level: the lead competes in the same draw with feeding options worth the drive times
   their energy rate (E3c), so a hungry male rarely leads, and members leave by the same comparison. The option is drawn
   like any other (RG softmax); `patrolImpulseDecides` does not apply (no roll raised it).
2. **Incursion by assessed odds** (parties.ts `updatePatrols`, at the first waypoint, the own range edge): the leader
   pushes into the neighbour's range when the patrol's odds (its members' summed strength on it against the neighbour's
   males as he remembers them, each as strong as the patrol's average adult male) are above 0.5 and the way in and home
   (to the incursion point, then to the own centre, at `walkMps`) fits in the daylight left; otherwise the patrol sweeps
   along the edge as today. Parity (nothing remembered) means no push.
3. **Retreat by the same odds**: the patrol turns home when its odds against the strangers perceived (adult males seen,
   or callers heard within `patrolHeardWindowH`) are 0.5 or less (today: when their count matches the males the leader
   sees). Contact memory writes are unchanged.
4. **No length cap and no release dice**: a patrol ends when its route comes home or no member is left (members leave
   by the continuation score against their other options, as on S13). After it the males call or not by the call rules.
5. **Joining**: every community member with the leader in view is scored as a male is (0.85 + 0.3 × bond with the
   leader + 0.2 × boldness − 0.2 under 15 y, the C6 literals) times its strength over the patrol's average adult male
   on it now, capped at 1: the share of a male's contribution to the patrol's power it adds (E4h's currency: joining is
   worth what it changes). No female join or stay score; no lactation term (samuni2021: no young-infant effect).
6. **Memory**: `x.nbm` (ChimpX, lazily added, in OPTIONAL_X), neighbour community id → adult males seen together, or
   distinct callers heard together, at the last contact (perception.ts; written only with the switch on).

Removes (ACTIVE_WHEN, scripts/lib/prescriptions.ts): `patrolH0`, `patrolMaleOddsRatio`, `patrolStartH`, `patrolEndH`,
`patrolIncursionP`, `patrolMaxH`, `patrolReleaseP`, `patrolReleaseContactP`, `patrolFemaleJoin`, `patrolFemaleStay`,
`patrolLactatingJoin`: **S13 65 → 54** (`prescription-ledger.ts --count`); today's model 135 → 124. Stays counted:
`patrolStopEveryMin` (deferred above). Draws removed: the hazard roll, the incursion die, the release dice. No new
randomness.

Rows encoded or genuine under the switch: T-PAT-4's male effect stays partly built in (the lead score's design male
term and the odds both rise with males; the 1.17 ratio itself is gone); T-PAT-1, -2, -3, -5, -6, -7, T-BRD-1 and T-IGE-1..3
are genuine (no rate, share, hour, length or joining value is written in); T-PAT-9 stays encoded-descriptive (route A1).

## 5. Readouts (defined before any arm; smoke-tested with the switch on, 2 days, before any arm)

From `scripts/patrol-diagnose.ts` (truth) unless stated; the observer rows from e-bench.
- **Patrols per community-week**: patrols started (`s.patrols` set) per community-week. Source sense
  (gilbyWilsonPusey2013): patrols are bouts in which "chimpanzees travelled cautiously and … appeared to be watching or
  listening for chimpanzees from neighbouring communities"; the observer's T-PAT-1 classifier is the scored version.
- **Start hour**: the clock hour of the start, the truth version of "the first instance in which chimpanzees were
  identified as patrolling" (gilbyWilsonPusey2013). Share of starts outside 08:00–15:30.
- **Duration and path**: start to end (min), leader path (km); T-PAT-5 (amsler2010) is the scored version.
- **Incursion**: the leader's cell inside a neighbour's 95% use isopleth at any tick (truth); T-PAT-6, "Share of patrols
  that enter the neighbour's range (beyond the own 95% isopleth into the neighbour's)", the scored version.
- **Contact and turn-back**: patrols with a stranger seen or heard (`p.contact`); turned back by assessment.
- **Composition and joining**: most adult males on at once; ≥ 3 adult males; patrols with a female; joins ÷ later
  opportunities by class (adult and adolescent males, adult and lactating females).
- **How patrols end**: home, no member left; members leaving early and to what; hunger and sleep pressure at start and end.
- **Lead value at the start** (leader's lead score) and the share of leaders remembering the neighbour's males.
- **Energy**: reserves ÷ store %/day by class (energy-diagnose, OLS as the integrator's judge scripts), quick mode.
- **Intergroup**: T-IGE-1..3 (observer), encounters per community-week (`stats.intergroupEncounters`), deaths by cause.

## 6. Arm, predictions and kill criterion

**Arm A1** = S13 + `patrolValue` 1. Runs (frozen detached checkout of the commit that adds this section, rules
policy, seeds 48 and 7): (a) `e-bench --quick` and `energy-diagnose` (30 + 30 days), judged against the four S13 quick
realizations (`judge_vs_reps.py quick custom`, REFS = S13q, S13q1, S13q2, S13q3), with and without T-HUN-4 and T-BRD-1
and without T-IGE-3; (b) `e-bench --seeds 48,7 --burn-in 30 --days 60` and `patrol-diagnose.ts` (30 + 60), patrol rows
against P0/P1 and truth against D0b.

| Quantity | S13 reference (D0b, P0/P1) | Prediction for A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 65 | 54 | high |
| Viability; starvation deaths | pass; 0 | pass; 0 | moderate |
| Truth patrols per community-week | 0.74 | 0.2–3 (a lead option of value ~0.1–0.4 against best options ~0.9–1.2, drawn at RG's temperature) | low |
| Starts outside 08:00–15:30 | 0% (by construction) | ≥ 10% | moderate |
| Median start hour | 12 | earlier (≤ 11): sleep pressure lowest after waking, daylight short late | low |
| Truth incursion share | 0.26 | 0.1–0.5 (only with a remembered smaller neighbour party) | low |
| Patrols reaching 3 adult males | 0.66 | 0.5–0.8 (prime males' joining unchanged) | moderate |
| Patrols with a female | 4 of 38 | up (≥ 20%): females join at about half a male's score instead of 0.2 / −1 | moderate |
| Female joins ÷ later opportunities | 1 / 36 (lactating 0 / 20) | ≥ 0.1 (lactating ≥ 0.05) | moderate |
| Median duration; > 6 h | 162 min; 0 | 100–220 min; ≤ 1 | moderate |
| Ended with no member left | 19 of 38 | 30–70% | low |
| Turned back | 0.11 | 0.05–0.2 | low |
| Releases (chorus, drum, display at the end) | 11 of 38 | 0 (by construction) | high |
| Fitted; held-out with and without T-HUN-4 and T-BRD-1 (quick, vs S13q group) | group mean | inside noise | moderate |
| T-PAT rows (30 + 60, vs P0/P1) | see §3 | no direction predicted (two-seed observer rows on few patrols) | — |
| Adult males', nursing mothers' and juveniles' reserves (quick) | S13q group | within 2 SD unless the patrol rate exceeds 2 per community-week (then males and females on patrols lower) | low |

**Kill criterion** (`patrolValue` stays off and the result is recorded): viability fails or any starvation death the
reference group does not have; held-out up beyond noise (z > 2) with or without the rare rows; patrolling degenerate
(truth rate below 0.05 or above 5 per community-week); nursing mothers' or juveniles' reserves more than 3 SD below the
S13 group's mean.

**Keep rule (standard):** viable; held-out not up beyond noise with and without the rare rows; prescriptions fall
(54 < 65).

## 7. Iterations

At most 3, each logged here and committed before its run. An iteration changes the mechanism from first principles
(a defect, an omitted cost or state), never a weight to move a row.

### Run log, the switch on (each entry written before its run)

- **Smoke** (logged after the run, at b2b998c with the tool's end classification fixed after it): S13 + `patrolValue`,
  seed 48, 1 + 2 days and 30 + 4 days: every readout produced; 3 patrols in each (starts at 07:17 and 15:21 among them,
  lead values 0.04–0.16, females on 2 of 6, every patrol entered a neighbour's range with the neighbour's males
  remembered). Tool fix (scripts only): with the switch on the length cap does not exist, so no end is "cap", and the
  incursion is read at the end of the patrol (decided at the range edge).
- **A1** (as registered in §6), from a frozen detached checkout of the commit that adds this entry
  (`scratchpad/e4i/frozen-a1`): chain X `patrol-diagnose` seeds 48 then 7 (30 + 60) then `e-bench --seeds 48,7
  --burn-in 30 --days 60`; chain Y `e-bench --quick` then `energy-diagnose` (seeds 48, 7, 30 + 30); `--workers 2` below
  load 8, else 1. Outputs `artifacts/validation/e4i/A1{d-48,d-7,p,q,q-energy}.json`.

### A1 results (frozen-a1 at 42d94f4, clean; printed by `scratchpad/e4i/judge_e4i.py` and `diag_table.py` from the JSON)

Quick mode against the four S13 realizations, energy-diagnose (30 + 30):

```
quick references: ['S13q.json', 'S13q1.json', 'S13q2.json', 'S13q3.json'] | patrol references: ['P0.json', 'P1.json', 'D1-48.json', 'D1-7.json']
  A1q.json: 42d94f4 dirty 0 prescriptions 54 viability True deaths 1 starvation 0
  A1p.json: missing
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 11
  fitted             (16 rows) ref 2.35, 2.29, 2.79, 2.02 (mean 2.36, sd 0.32; used 0.69) | A1q.json: 8.74, Δ +6.37, z +8.3 RESULT
  held-out           (11 rows) ref 4.34, 3.51, 5.45, 3.28 (mean 4.15, sd 0.98; used 1.26) | A1q.json: 3.98, Δ -0.17, z -0.1 (inside noise)
  held-out w/o rare  (10 rows) ref 4.34, 3.51, 4.11, 3.28 (mean 3.81, sd 0.50; used 0.50) | A1q.json: 3.98, Δ +0.17, z +0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-FOOD-10 held-out ref 2.11±0.14 | A1q.json 2.46 (fail)
   T-HUN-2   fitted   ref 0.90±0.35 | A1q.json 1.67 (fail)
   T-HUN-4   held-out ref 0.33±0.67 | A1q.json 0.00 (pass)
   T-IGE-1   fitted   ref 0.18±0.37 | A1q.json 5.31 (fail)

held-out without T-HUN-4, T-BRD-1 and T-IGE-3 (10 rows): S13q 4.34 / 3.51 / 4.11 / 3.28 (mean 3.81, sd 0.50; used 0.50); A1q.json 3.98 (z +0.3)

| Reserves ÷ store, % per day (OLS) | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | -0.007 / +0.012 / -0.002 / -0.005 | -0.000 ± 0.009 | +0.001 (z +0.2) |
| female, other | +0.010 / +0.016 / -0.004 / +0.014 | +0.009 ± 0.009 | -0.001 (z -1.0) |
| female, lactating | -0.003 / +0.002 / -0.011 / +0.003 | -0.002 ± 0.006 | -0.012 (z -1.4) |
| juvenile 5–12 y | -0.023 / -0.018 / -0.029 / -0.011 | -0.020 ± 0.008 | -0.010 (z +1.3) |
| infant 2–5 y | +0.012 / +0.030 / -0.012 / -0.007 | +0.006 ± 0.019 | -0.008 (z -0.6) |
| infant 0.5–2 y | -0.018 / -0.022 / -0.022 / +0.010 | -0.013 ± 0.016 | -0.013 (z -0.0) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Ground km / eating min | S13q runs | mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male: groundKm | 2.39 / 2.36 / 2.19 / 2.31 | 2.31 ± 0.09 | 2.81 (z +5.1) |
| adult male: eatingMin | 253.71 / 255.39 / 250.65 / 250.70 | 252.61 ± 2.34 | 257.71 (z +1.9) |
| female, other: groundKm | 1.74 / 1.75 / 1.69 / 1.76 | 1.73 ± 0.03 | 1.75 (z +0.6) |
| female, other: eatingMin | 264.53 / 256.05 / 265.99 / 264.62 | 262.80 ± 4.55 | 259.51 (z -0.6) |
| female, lactating: groundKm | 2.12 / 2.14 / 2.01 / 1.96 | 2.06 ± 0.09 | 2.06 (z +0.1) |
| female, lactating: eatingMin | 315.61 / 315.84 / 316.81 / 316.30 | 316.14 ± 0.53 | 317.86 (z +2.9) |
| juvenile 5–12 y: groundKm | 2.16 / 2.22 / 2.00 / 2.16 | 2.13 ± 0.10 | 2.28 (z +1.4) |
| juvenile 5–12 y: eatingMin | 283.43 / 275.03 / 288.52 / 293.35 | 285.08 ± 7.83 | 278.99 (z -0.7) |
deaths (energy-diagnose): {'S13q': {}, 'S13q1': {}, 'S13q2': {}, 'S13q3': {}, 'A1': {'illness': 1}}
```

Truth at 30 + 60 (patrol-diagnose; the S13 reference is D0b/D1 in §3):

```
## A1 (42d94f4): 2 seeds, 51.4 community-weeks
patrols started 203 = 3.95 per community-week (truth)
daylight opportunities (adult male perception, >= 3 adult males in view, no patrol, rain below the gate): 3677; in the 08:00-15:30 window 0, outside 3677 (100%)
patrolValue on: no hazard rolls (the window split of opportunities is kept for comparison only)
  clock-blocked: males 3.34, party 5.8, r/R 0.49, periphery 0.14, heard 24 h 0.413, contact 7.19, loss 1.27, border crop 0.93, light left 4.1 h | hunger 0.30, sleep 0.41, thirst 0.151, arousal 0.073, stress 0.17, reserve -0.010
rolls by adult males in view (n, expected, fired): {}
start hour: {7: 9, 8: 24, 9: 18, 10: 17, 11: 22, 12: 20, 13: 24, 14: 16, 15: 16, 16: 25, 17: 11, 18: 1} | outside 08:00-15:30: 51/203 | median 12.6 h
lead score at the start: median 0.107 (range 0.000-0.952); leaders remembering the neighbour males: 203/203
duration min: median 156, range 30-286, > 6 h 0; path km median 2.20
ended by: {'empty': 123, 'home': 80} | release: 0 of 203 | release after contact: 0 of 111
incursion die true 94/203 (0.46); entered a neighbour 95% isopleth: die true 85/94, die false 43/109; overall 0.63
contact 0.55, turned back 0.22
stops: on schedule 1327, at waypoints 237
most adult males at once: {1: 45, 2: 55, 3: 80, 4: 18, 5: 4, 6: 1} | >= 3: 0.51; with females 71/203
joining (opportunities, joined): {'adultMale': [334, 116], 'lactatingFemale': [68, 9], 'adultFemale': [110, 17], 'adolescentMale': [45, 7]}
members leaving early, to: {'travel': 333, 'forage': 71, 'nest': 40, 'flee': 31, 'mate': 5, 'rest': 3, 'guard': 3, 'call': 3, 'submit': 2, 'drink': 2, 'attack': 1, 'pant-grunt': 1, 'display': 1, 'charge': 1}
adult male members at start -> end: hunger 0.19 -> 0.63, sleep 0.34 -> 0.43, thirst 0.035 -> 0.080, arousal 0.063 -> 0.055
daylight left at start median 6.2 h, at end 3.5 h
patrol day vs most adult males in one party (truth, per seed): OR [12.6923, 12.7256] | mean max males patrol days [4.2055, 3.6761] other days [2.1215, 2.2936]
intergroup encounters per community-week (stats): [2.7222, 4.1611] | deaths: [{'illness': 1}, {}]
periphery arrivals (planned decision point) per community-week: [1.2833, 1.2056] | n [33, 31] | expected patrols at V0 (sum of softmax shares): [1.4252, 1.4591]
   means {'g': 0.0898, 'contact': 7.487, 'kappa': 0.8193, 'light': 4.1136, 'tripH': 1.7349, 'D': 0.8482, 'sleep': 0.4134, 'arousal': 0.0505, 'ceiling': 1.3255, 'v0': 0.2723, 'share': 0.0432, 'males': 3.2121} | top score 0.9819 | kappa 0: 1 | by males {'3': 26, '4': 7} | by hour {'6': 1, '7': 3, '8': 1, '11': 3, '12': 3, '15': 7, '16': 2, '17': 7, '18': 6}
   means {'g': 0.1131, 'contact': 8.8971, 'kappa': 0.8393, 'light': 7.3199, 'tripH': 1.7635, 'D': 0.9844, 'sleep': 0.2985, 'arousal': 0.006, 'ceiling': 1.3058, 'v0': 0.3853, 'share': 0.0471, 'males': 3.129} | top score 1.1088 | kappa 0: 3 | by males {'3': 27, '4': 4} | by hour {'7': 9, '8': 4, '9': 3, '12': 3, '15': 5, '16': 7}
```

**Against the predictions.** Prescriptions 54: held. Viability: held (one death from illness, no starvation). Truth
patrols **3.95 per community-week** against a predicted 0.2–3: missed high (5.3 × S13's 0.74). Starts outside 08:00–15:30:
51 of 203 (held). Median start 12.6 h: not earlier (missed). Truth incursion share 0.63 (predicted 0.1–0.5: missed high;
every leader remembered the neighbour's males, mostly as one or two callers heard, so the odds favoured a push). Patrols
reaching three adult males 0.51 (predicted 0.5–0.8: at the floor); patrols with a female 71 of 203 (held); female joins
17 of 110 and lactating 9 of 68 (held); median duration 156 min, none over 6 h (held); ended with no member left 123 of
203 (held); turned back 0.22 (missed high); releases 0 (held). Sums: held-out inside noise (z −0.1; without the rare rows
+0.3); **fitted worse beyond noise (z +8.3)**, almost all T-IGE-1 (49 encounters per community-year, band 5–12; S13q
0.2 ± 0.4 distance) with T-HUN-2. Reserves within 2 SD of the S13 group for every class; adult males walk 2.81 km a day
(z +5.1).

**Reading.** The lead is drawn at low value: its score when a patrol started had a median of 0.11 (best options ~1.0).
RG samples every option on the menu, so an option offered at every decision point of every male in a three-male party
is drawn at RG's floor, about 0.5–2% of draws (a read-only tap on the A1 world, `scratchpad/e4i/probe-draws.mts`: the
lead is on the menu at ~140 draws per community-week); half of the patrols so started never hold three adult males.
The comparison is made, but at every re-decision of every male, which a rare collective act is not: in the field a
patrol is the decision of a party of males (mitaniWatts2005, gilbyWilsonPusey2013: patrols on the days large male parties
form). The kill criterion is not met (rate below 5, held-out inside noise, viable), and the standard keep rule would pass
(54 < 65), but the fitted cost beyond noise and the 5-fold rate make A1 a mechanism defect, not a candidate.

### Iteration 1 (written after A1, before its run): the lead is weighed when a party first holds enough males

**Change** (`patrolValue` 2; value 1 stays A1, bit for bit: A1 seed 48 after 4 days 5b8bc5d9321f3962 before and after;
switch 0 unchanged: S13 seed 48 day 12 80f6d376f3127173, all-off seed 7 day 6 2a6b718dc8194976). A male weighs leading
a patrol once, when his party first holds `patrolMinMales` adult males (his perception sees at least that many after
seeing fewer at his previous one): perception raises the patrol impulse with no roll (as the hunting fix does at a
colobus encounter), the RG gate treats it as a salient change and draws (the lead stays on the menu), and the impulse
ends with his next choice whatever he chose. Everything else as A1 (the value V, incursion and retreat by odds, no cap,
no release dice, joining by strength). Same 11 entries out (54).

**Why, from the field and the model.** The comparison stays the same; what changes is when it is made. A patrol is a
party's act, and its occurrence follows the forming of large male parties (mitaniWatts2005: male party size the main
predictor; gilbyWilsonPusey2013: patrols on days of large male parties; wilson2001: three or more males act, fewer do
not), not an individual's every re-decision. The design assumption is that the forming of a party with enough males is
the moment the option arises, once per forming; RG's sampling then decides as it does for a hunt at an encounter.

**Readouts** as §5, plus the probe (`scratchpad/e4i/probe-draws.mts`, read-only rgTap): forced draws at formings and the
lead's share in them.

**Predictions** (A2 = S13 + `patrolValue` 2; against S13 and A1). From the A1 world (probe, seed 48): parties first
reaching three adult males 58 per community-week (each male counted), the lead's mean share of a draw 0.020, so about
1.2 patrols per community-week if formings are draws like any other (low confidence):
- truth patrols per community-week 0.3–2 (between S13's 0.74 and A1's 3.95; low);
- T-IGE-1 and the fitted sum down from A1 toward the S13 group (fitted inside noise or worse by less than A1's z +8.3;
  moderate); held-out inside noise (moderate);
- patrols reaching three adult males ≥ 0.5 (the lead is weighed when the party holds at least three; moderate);
- starts outside 08:00–15:30 ≥ 10% (moderate); incursion share 0.4–0.8 (low); patrols with a female ≥ 20% (moderate);
- prescriptions 54 (high); viability passes (moderate); reserves within 2 SD of the S13 group (moderate).
Kill criterion and keep rule as §6.

**Runs**: as A1 (chains X and Y), label A2, from a frozen detached checkout of the commit that adds this entry
(`scratchpad/e4i/frozen-a2`), `--workers 1` while the load is above 8.
