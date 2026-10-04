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
