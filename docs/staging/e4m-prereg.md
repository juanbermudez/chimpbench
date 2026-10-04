# E4m pre-registration: four small rules (rough play, listening stops, meat eating, the end of protection)

Branch `e4m-leftovers` from `track-e` 6871f3d. Track E, stage E4m. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all. Started 4 October 2026, 08:05.

This file is written in steps, each committed before the step it governs: §1–§3 (the problem, the rows and their
samples, the diagnosis plan) before the diagnosis runs on unchanged code; §4–§8 (diagnosis result, mechanism, readouts,
arms, predictions, kill criterion) before any run of changed code; every iteration in the run log (§9) before its run.

Rule served: field values of behaviour are targets, never inputs. No rate, interval or age is tuned to hit a row.

## 1. The problem (from the brief; verified in §4)

Four counted prescriptions are still active on S21 (the best integrated candidate, 45 prescriptions;
`docs/staging/e-stack2-confirm.md` "S21 results"; `scripts/prescription-ledger.ts --count --params <S21>` lists all four):

| Entry (field value) | Ledger class | Where | What it decides (as read from the code at 6871f3d) |
| --- | --- | --- | --- |
| `roughPlayP` 0.0015 per 15-s tick | hazard ("[H] occurs; rate design") | `src/sim/execution.ts:1121` (pairTick, play) | each play tick in contact in which the initiator is more than 2 y older than its partner, a die turns the play rough: the partner screams, is stamped a victim of the initiator (`victimOf`, `victimAt`; read by the guardian's defence charge within 0.05 h, consolation, the slow stress kick of E4a) and the play ends |
| `patrolStopEveryMin` 15 min | quota ("a patrol stops to listen on a fixed schedule") | `src/sim/parties.ts:195` (updatePatrols) | on the outbound legs (phase < 2) the patrol leader stops 2–4 min (`patrolStopMinMin`/`MaxMin`, a hash) every 15 min of travel, besides the stops at each waypoint; the party waits; the observer's patrol classifier needs ≥ 2 stops of 1–5 min (`src/field/classifiers.ts`, wattsMitani2001) |
| `meatEatPerH` 0.35 units per eco-hour | timer (per eco-h), encoding T-ACT-1 by the ledger's rule | `src/sim/life.ts:164` (needs), `src/sim/energy.ts:605` (`meatKcalPerUnit`) | a holder eats 0.35 of a carcass an hour while awake (gut permitting), so one capture is worth 60 × `ledgerMeatKcalPerMin` ÷ 0.35 = 1,149 kcal and takes 2.9 h to eat; the same 1,149 kcal (K) enters the hunt's value (`huntvalue.ts`: E = min(need, expected captures × K)) |
| `guardMaxAgeY` 12 y | field copy ([M] crockford2020, hobaiter2014, stanton2020; partly encodes T-DEM-15) | `src/sim/candidates.ts:155, 162`, `src/sim/conflict.ts:43` | the oldest ward whose guardian deters charges at it (`guarded`: mother or caretaker in sight, within `defendRangeM`, not dominated by the charger: −`guardDeterW` or −`guardFeedDeterW` on status, redirect, grudge, coercion and feeding-supplant charges); the end of an adoptive caretaker's guardianship (defence charges, plant-food sharing, the follow) and of caretaker kinship in coalitions. A living mother stays the guardian at any age (`guardianOf`); only the deterrence test reads the age for her |

Sketches from the brief (first principles, to be tested by the diagnosis before anything is built): rough play from
the players' arousal and the size gap (E4b's fast state is on in S21); listening stops where information is worth
stopping for (at the range edge, after a sound, when the party is uncertain); meat eaten at the rate the body can chew
and digest it (the ledger's intake and gut with a sourced intake rate), not a separate hourly rate; protection that ends
when the ward no longer needs it (its own size, rank or the threat it faces), not at an age.

## 2. Rows scored, and their samples

Rows from `data/targets.json`. Samples as opened and recorded by the stages that audited them (cited); sources re-opened
by this stage are marked. Body mass enters none of these rows.

| Row (role; band) | Source and sample (sex, reproductive state, mass, method) | Opened |
| --- | --- | --- |
| T-PAT-1 (fitted, tuned; 0.1–0.5 per community-week) | wattsMitani2001: Ngogo 52 patrols 1998–99 (24 adult, 15 adolescent males; females essentially absent), patrols recognised on follows by "frequent stops in a tight, vigilant cluster to look and listen" (patrol-evidence.md); Gombe Kasekela and Taï North 0.3 per week (secondary); massaro2022: Gombe 1978–2007, 180 patrols, males ≥ 12 y, long-term record. Sim: the observer's classifier (≥ 2 adult males, silent ≥ 20 min, travel ≥ 50%, the own 90% isopleth, **≥ 2 listening stops**, focal still 1–5 min) on focal follows | FT at C6p (e4i-prereg §2) |
| T-PAT-2, -3, -5, -6, -7 | langergraber2017 (Ngogo 1996–2015, 284 patrols, males ≥ 13 y), massaro2022, amsler2010 (Ngogo 2004–06, 29 patrols, focal follows of patrolling males; abstract), mitaniWatts2005 (Ngogo 1999–2003, 72 patrols), watts2006 (Ngogo 1997–2003, 95 patrols, case records); all males, no mass | FT at C6p, amsler2010 abstract (e4i-prereg §2) |
| T-BRD-1 (held-out, rare row) | lemoine2023: Taï East and South (P. t. verus) 2013–16, 625 stops ≥ 5 min on 283 group-days, adults present (both sexes); the sim counts halts ≥ 1 min of the focal at 0.8–1.0 R | FT (e4i-prereg §2) |
| T-IGE-1..3 | wilson2012: Kanyawara 1992–2006, 120 encounters in 35,083 party-follow hours; T-IGE-3 a rare row (amendment 3) | FT (e4i-prereg §2) |
| T-HUN-1..4, -7, -8 | gilby2015 (Kanyawara 1996–2014, 194 hunts, 11.4 adult males; Kasekela; Mitumba; party follows), mitaniWatts1999 (Ngogo, 49 hunts, 128 prey), wattsMitani2002 (Ngogo 1995–99, not verified), stanford1994 (abstract); hunters adult and adolescent males; community counts | e4e-prereg §2.2, e4k-prereg §2.1 |
| T-HUN-9 (pattern, not summed) | wattsMitani2002 (Ngogo: 15.2 adult males present, 8.7 ate meat; 12.1 individuals ate per hunt); samuni2018 (Taï, 312 events, owners shared with 48% of adults present) | as recorded in `data/targets.json` |
| T-ACT-1..4 (fitted) | uwimbabazi2019, villioth2025, amsler2010, potts2011 (as in the E1 and E5d preregs): adult daytime activity shares | as recorded |
| T-DEM-15, -16, -17, -24 (orphans; need years) | crockford2020 (Taï, 23 males, 48 paternities, sons orphaned at 4–12 y), nakamura2014 (Mahale), stanton2020 | not scorable under the 90-day cap (reported insufficient) |

No row measures rough play, listening stops per patrol, meat-eating minutes or kcal per carcass, or protection by ward
age. They are reported as simulation truth beside the rows above (context, never summed).

## 3. Diagnosis plan (step 1; unchanged simulation code; written and committed before any run)

Tool: `scripts/e4m-diagnose.ts` (new, read-only: it reads the world after each tick and calls only pure functions,
as `scripts/patrol-diagnose.ts` does). Simulation truth, field profile, S21's parameters
(`bench-run2/artifacts/validation/e/s21q/S21q-params.json`), seeds 48 and 7, 30-day burn-in + 60 days (patrols and
hunts are rare; 90 days, the cap), one seed per process.

Readouts (each defined here before the first run):

- **Play and rough play.** A play bout = a `play` act entering contact (`ix(c).phase` 0 → 1). Per bout: initiator and
  partner ages and masses (`energy.ts massOf`), the age gap, minutes in contact. Eligible ticks = play ticks in contact
  with the partner more than 2 y younger (the die's condition). A rough-play escalation = at a tick's end the partner
  `o` carries `victimAt` = this tick's time and `victimOf` = the initiator `c`, while `c` was in play contact with `o`
  at the tick's start and is not charging or attacking `o` at its end. Per escalation: both ages and masses, minutes
  into the bout, both animals' fast arousal (`fastNow`) and stress, and the consequences: a charge by the partner's
  guardian (`guardianOf`) at the initiator starting within 0.05 h (the defence window, `candidates.ts`), a consolation
  of the partner within `consoleWindowH`, the partner's stress change over the next slow step. Rates: play bouts and
  escalations per immature-day (immature: alive, < 12 y, counted at each tick as a share of a day).
- **Listening stops.** Per truth patrol (start to end, as patrol-diagnose): stops on the schedule (the stop counter
  rises while the phase is unchanged) and at waypoints (it rises with a phase change), stop minutes, the leader's own
  use isopleth at each stop, whether any patrol member had heard a stranger community in the 15 min before the stop.
  Detections: new hearing episodes (`heardAt` moving to the tick's time for a member) and stranger sightings
  (`strangers` > 0 rising from 0) by patrol members, counted while the patrol is stopped and while it moves on the
  outbound legs, per hour in each state. Turn-backs by numerical assessment. Whether each patrol would still hold ≥ 2
  stops from waypoints alone (the classifier's minimum).
- **Meat.** Per capture (a chimp's `carryingMeat` set to 1): the community's meat units summed over all animals each
  tick; units eaten = the fall of that sum (sharing moves units, eating removes them); kcal = units × `meatKcalPerUnit`.
  Per carcass: holder-minutes awake with meat, minutes from capture to the last unit eaten, eaters, kcal eaten in all
  and by the captor. Gut limit: holder ticks awake in which the units eaten fell short of `meatEatPerH` × tick (the
  ledger's `eat` took less: gut full). Kcal per hunt (hunts = hunt acts started by a leader; failed hunts give 0). At
  each hunt start: the leader's energy need (`energyNeed`) against the meat he could expect (`evenCaptures` ÷ hunters ×
  K): the share of hunt valuations in which K, not the need, sets E (what `meatEatPerH` decides in the hunt's value).
- **Protection by ward age.** For every charge or attack started within the community (the act's first tick): the
  target's age and whether its guardian (`guardianOf`) is in the charger's view, within `defendRangeM` of it and not
  dominated by the charger (the deterrence test without the age limit), and whether the age limit made the
  difference (target ≥ `guardMaxAgeY` with a qualifying guardian). Defence charges by guardians (variant DEFEND) by
  ward age; adoptive caretakers with wards by ward age (the cases the limit ends); coalition alerts that count a
  caretaker as kin. Rates per ward-day by age class (< 5, 5–8, 8–12, 12–15, 15–20, ≥ 20 y).
- **Context from the same run:** deaths by cause, reserves %/day by class (from the scorecards of the e-bench runs, not
  from this tool).

Runs (frozen detached checkout of the commit that adds the tool, in my scratch directory): smoke (seed 48, 1 + 1 days,
every readout produced); D0 = the tool on S21, seeds 48 and 7, 30 + 60 days. The e-bench quick reference (S21q and
its three `rngSalt` re-draws, the integrator's) is not re-run.

### Run log (each entry written before its run, unless marked)

