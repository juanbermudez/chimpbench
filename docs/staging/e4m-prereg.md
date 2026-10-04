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
| T-PAT-1 (fitted, tuned; 0.1–0.5 per community-week) | wattsMitani2001: Ngogo 52 patrols 1998–99 (24 adult, 15 adolescent males; females essentially absent), patrols recognised on follows by their conduct, which docs/patrol-evidence.md summarises as "frequent stops in a tight, vigilant cluster to look and listen" (the project's paraphrase of the paper; its own sentence was not re-opened this stage); Gombe Kasekela and Taï North 0.3 per week (secondary); massaro2022: Gombe 1978–2007, 180 patrols, males ≥ 12 y, long-term record. Sim: the observer's classifier (≥ 2 adult males, silent ≥ 20 min, travel ≥ 50%, the own 90% isopleth, **≥ 2 listening stops**, focal still 1–5 min) on focal follows | FT at C6p (e4i-prereg §2) |
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

- **Smoke** (logged after the run; working tree at the tool commit, scripts only): S21, seed 48, 1 + 1 days. Every
  readout is produced (no patrol or hunt in one day, as expected); 3 rough escalations, all on eligible pairs (tool
  check 0 ineligible), 2 of them by a mother playing with her own infant (she is the victim's guardian).
- **D0** (as registered in §3), from a frozen detached checkout of the commit that adds this entry
  (`scratchpad/e4m/frozen-d0`): `scripts/e4m-diagnose.ts` on S21, seed 48 then seed 7 (load above 8: one process at a
  time), 30 + 60 days, `artifacts/validation/e4m/D0-{48,7}.json`.
- **D0 note** (logged after the run): both seeds ran (seed 48 08:16–08:18, seed 7 08:18–08:20). The hunt-impulse
  valuation readout found no fresh encounter impulse in either seed (0 read; the six valuations at hunt starts are the
  readout used); every other readout produced values.

## 4. Diagnosis result (D0: S21, seeds 48 and 7, 30 + 60 days, 0.99 community-years; printed by `artifacts/validation/e4m/diag_table.py` from the JSON)

```
## D0 S21 (2 seeds: 48, 7; 30 + 60 days; community-years 0.986)
per seed, seed 48 / seed 7 (totals where summed)

Rough play (roughPlayP)
  immature-days: 840 / 840; play-contact ticks 472824 / 476938; eligible (partner > 2 y younger) 0.5904 / 0.5868 of them
  play bouts (per actor act in contact) 5848 / 6681 = 6.8548 / 7.85 per immature-day; median 11.5 / 9.25 min; play min/day by age <5, 5-8, 8-12: [34.4214, 106.5708, 114.8236] / [40.5542, 137.425, 89.6236]
  rough escalations 399 / 431 (total 830) = 0.475 / 0.5131 per immature-day; per eligible tick 0.0014 / 0.0015 (the die: 0.0015); ineligible (tool check) 0
  share of bouts that turned rough 0.067 / 0.0642; of eligible bouts 0.1255 / 0.1314; minutes into the bout (median) 16.25 / 16
  initiators by age {'>=20': 242, '12-15': 85, '8-12': 24, '5-8': 47, '15-20': 1} / {'5-8': 46, '12-15': 73, '>=20': 279, '8-12': 33}; adults >= 15 y 243 / 279; victims by age {'<5': 280, '8-12': 65, '5-8': 54} / {'<5': 322, '5-8': 75, '8-12': 34}; kin pairs 259 / 303
  mass ratio initiator/partner (median) 2.3387 / 2.6907; fast arousal at escalation, initiator 0.002 / 0.0025, partner 0.0005 / 0.0017
  consequences: guardian charged the rough player within 0.05 h 55 / 55 (of all defence charges 122 / 110, share 0.451 / 0.5); consoled 51 / 55; partner stress rise over a slow step 0.0628 / 0.0568

Listening stops (patrolStopEveryMin)
  patrols 15 / 12 (0.5833 / 0.4667 per community-week, truth); stops on the schedule 137 / 134, at waypoints 25 / 18; schedule share 0.846 / 0.882
  stops per patrol 10.8 / 12.6667; waypoint stops per patrol 1.6667 / 1.5; patrols with >= 2 waypoint stops 11/15 / 7/12
  outbound hours stopped / moving 8.0583 / 32.9083 / 7.6167 / 31.8083 (stopped share 0.197 / 0.193)
  members' new stranger hearings: stopped 24 / 9, moving out 63 / 45, returning 15 / 21; per hour stopped 2.98 / 1.18 vs moving out 1.91 / 1.41
  new stranger sightings: stopped 0 / 0, moving out 0 / 3, returning 1 / 0; stops after a stranger heard in the last 15 min 23 / 12
  own use isopleth at stops (median): schedule 0.9493 / 0.9675, waypoint 0.9423 / 0.9396; turned back 2 / 1; contact 11 / 6

Meat (meatEatPerH)
  K = 60 x ledgerMeatKcalPerMin / meatEatPerH = 1148.5714 kcal per capture; hunts started 2 / 4, successes 2 / 2, captures 2 / 2
  seed 48 carcass: captures 1, kcal eaten 1148.5714, minutes capture to last unit 115, holder-minutes awake 182.5, eaters 2, gut-limited share of holder ticks 0.3315
  seed 48 carcass: captures 1, kcal eaten 1148.5714, minutes capture to last unit 91.5, holder-minutes awake 180.75, eaters 4, gut-limited share of holder ticks 0.1936
  seed 7 carcass: captures 1, kcal eaten 1148.5714, minutes capture to last unit 74, holder-minutes awake 174.5, eaters 3, gut-limited share of holder ticks 0.1504
  seed 7 carcass: captures 1, kcal eaten 1148.5714, minutes capture to last unit 196.75, holder-minutes awake 196.75, eaters 1, gut-limited share of holder ticks 0.6226
  kcal per hunt 1148.5714 / 574.2857; per capture 1148.5714 / 1148.5714
  hunt valuations at starts: 2 / 4, K binding (expected share x K < need) 2 / 4; need median 1125.4283 / 1388.2296 kcal, expected meat median 382.8571 / 382.8571 kcal; encounter impulses read 0 / 0

Protection (guardMaxAgeY)
  charges and attacks started in a community 1141 / 1690; by target age {'<5': 0, '5-8': 95, '8-12': 44, '12-15': 313, '15-20': 154, '>=20': 535} / {'<5': 0, '5-8': 220, '8-12': 59, '12-15': 200, '15-20': 537, '>=20': 674}
  with a qualifying guardian (seen, within defendRangeM, not dominated), by target age {'<5': 0, '5-8': 34, '8-12': 3, '12-15': 37, '15-20': 0, '>=20': 0} / {'<5': 0, '5-8': 19, '8-12': 7, '12-15': 25, '15-20': 3, '>=20': 1}
  the age limit made the difference (target >= 12 y): 37 / 29; by variant {'REDIRECT': 31, 'DEFEND': 6} / {'DEFEND': 6, 'REDIRECT': 13, 'COALITION': 4, 'FEED': 6}; by guardian {'mother': 37} / {'mother': 29}
  of these, variants that read the deterrent (STATUS, REDIRECT, TENSION, COERCE, FEED): 31 / 19; share of all charges 0.0272 / 0.0112
  defence charges by guardians, by ward age {'<5': 88, '5-8': 21, '8-12': 6, '12-15': 7, '15-20': 0, '>=20': 0} / {'<5': 76, '5-8': 27, '8-12': 4, '12-15': 2, '15-20': 0, '>=20': 1}; by guardian {'mother': 122} / {'mother': 110}
  wards with an adoptive caretaker (ward-days by age) none / none; plant shares by ward age {'<5': 4, '5-8': 0, '8-12': 0, '12-15': 0, '15-20': 0, '>=20': 0} / {'<5': 8, '5-8': 0, '8-12': 0, '12-15': 0, '15-20': 0, '>=20': 0}
  share of time a guardian is within defendRangeM, by age {'<5': 0.996, '5-8': 0.4338, '8-12': 0.1829, '12-15': 0.184, '15-20': 0.1372, '>=20': 0.0211} / {'<5': 0.9977, '5-8': 0.4404, '8-12': 0.3584, '12-15': 0.2722, '15-20': 0.0735, '>=20': 0.0217}

Deaths none / none
```

**What each entry decides (with numbers):**

- **`roughPlayP` sets its behaviour.** Every one of the 830 escalations (399 and 431) is the die: 0.0014–0.0015 per
  eligible tick against the die's 0.0015, with no state entering (the fast arousal at an escalation averages 0.002 in
  the initiator and 0.001 in the partner). It turns 6.4–6.7% of play bouts rough (12.6–13.1% of those with a partner more
  than 2 y younger), 0.48–0.51 per immature-day, a median 16 min into the bout. 61–65% are started by adults of 20 y and
  over playing with infants under 5 y, mostly their own (kin pairs 65–70%): mothers made rough by a die. It drives
  45–50% of all guardian defence charges in the run (55 of 122, 55 of 110) and 51–55 consolations, and raises the
  partner's stress by about 0.06. Context, not a target: captive chimpanzee play escalates in 0.003 ± 0.001 of sessions
  of about 1 min (cordoni2018); the self-handicapping that should prevent it is absent from the model.
- **`patrolStopEveryMin` sets its behaviour.** It makes 85–88% of listening stops (137 of 162, 134 of 152): 10.8–12.7
  stops per patrol against 1.5–1.7 at waypoints, holding the patrol still for 19–20% of its outbound time. The stops find
  nothing that walking would not: members' new hearings of strangers per hour are 2.98 / 1.18 stopped against 1.91 /
  1.41 moving out (no stranger was first seen during a stop), because in the model hearing does not depend on
  stillness. Without the schedule 18 of 27 patrols would still hold two waypoint stops (the observer's classifier needs
  two stops of 1–5 min while it follows).
- **`meatEatPerH` sets its behaviour, on few events.** It fixes the energy of a capture (1,149 kcal: all four carcasses
  yielded exactly that) and its eating time (175–197 holder-minutes awake per carcass, 74–197 min from capture to the
  last unit; the gut stopped intake in 15–62% of holder ticks). In all six hunt valuations the meat a hunter could
  expect (383 kcal) was below his energy need (1,125–1,388 kcal), so K, i.e. 1 ÷ `meatEatPerH`, set the hunt's value
  every time. Four captures in 0.99 community-years.
- **`guardMaxAgeY` trims.** No ward had an adoptive caretaker in either run, so the limit never ended a caretaker's
  guardianship. A living mother is the guardian at any age (`guardianOf`), so the limit acts only in the deterrence
  test: 66 charges (37 and 29) started at a target of 12 y or more whose mother qualified, of which 50 (31 and 19)
  are variants that read the deterrent (redirect, feeding), 2.7% and 1.1% of the run's 1,141 and 1,690 charges, and for
  these the limit changes the score by `guardDeterW` 0.3, not whether the charge is offered. Defence charges (which the
  limit does not read for mothers) go to wards under 5 y (164), 5–8 y (48), 8–12 y (10), 12–15 y (9) and 20 y or more
  (1).

**Implicated:** `roughPlayP`, `patrolStopEveryMin` and `meatEatPerH` set their behaviour; `guardMaxAgeY` trims and is
left as it is (no mechanism).

**`meatEatPerH`: implicated but not built this stage.** Removing it needs the edible energy of an average capture as an
input (the intake rate, `ledgerMeatKcalPerMin`, is already sourced; the hourly rate stands in for the carcass). The
inputs found (research.md "Addendum: E4m four small rules") give the Ngogo kill composition (66% immature) and an adult
species mass (7.6 kg), but not immature red colobus masses or the edible share, inside the time box. A carcass value set
by design would only rename the prescription (and with today's 1,149 kcal would change nothing), and one built from
unsourced immature masses would not be an input; so the hourly rate stays and the gap is recorded (§10).

## 5. Mechanism: `leftoverRules` (one switch, a bit per rule; 0 = today)

**Bit 1: rough play from arousal and size** (`src/sim/execution.ts` pairTick, play in contact). Self-handicapping
(cordoni2018, cordoniPalagi2011, captive [M]): the stronger player restrains its force to what the partner can take;
play turns rough when that restraint fails. With the bit, each play tick in contact turns rough, with the same
consequences as today (the partner screams, is stamped a victim of the player, its mood distressed, the player's play
ends), when

  A_c × m_c > (1 − A_o) × m_o

where m is body mass (`energy.ts` massOf: the ledger's own mass with `ledgerGrowSurplus`, else the mass curve; [M]
inputs) and A the acute drive of E4b, min(1, fast × (1 + competitive arousal)) (the fast state of `endoFast`, kicked at
storm onsets and by aggression received, τ 5 min; competitive arousal only in adult males; both 0 without the states).
Reading: the share A_c of its force that the player no longer holds back against the partner's capacity to take it,
which falls with the partner's own arousal. No die, no age rule (the "more than 2 y younger" condition is replaced by
the masses), no new parameter; the comparison rule is a design assumption [L]. Without `endoFast` nothing kicks the
fast state, so play never turns rough. `roughPlayP` is not read.

**Bit 2: listening stops from information** (`src/sim/parties.ts` updatePatrols). The leader stops (as today: the party
waits, 2–4 min by a hash, `patrolStopMinMin`/`MaxMin`, design) at the waypoints, unchanged (the own range edge facing the
neighbour, where E4i's leader weighs the remembered odds; the end of the incursion or sweep), and after a sound: on the
outbound legs, when a member of the patrol has heard a stranger chorus since the last patrol update (`heardAt` within the
update interval, the caller of another community) and no stop has started within the caller-counting window
(`strangerCallerWindowH`, 0.05 h, the window over which `perception.ts` hear() counts distinct callers for the numerical
assessment that turns a patrol home [M-H wilson2001, wattsMitani2001]). The stop holds the patrol still while the
chorus is counted, before it moves on toward the callers; calls of the same chorus within one counting window of the
last stop's start do not stop it again. No scheduled stop: `patrolStopEveryMin` is not read. No new parameter.

Bits 4 (meat) and 8 (protection) are not defined (§4). The switch is registered in `TRACK_E_SWITCHES` (both lists), the
ledger's ACTIVE_WHEN switches out `roughPlayP` (bit 1) and `patrolStopEveryMin` (bit 2); `roughPlayP`'s rule needs no
other switch (with the bit set the die is never drawn).

## 6. Readouts (defined before any arm; smoke-tested with the switch on, run log)

- Simulation truth from `scripts/e4m-diagnose.ts` (§3 definitions, unchanged; 30 + 60 days, both seeds), against D0:
  rough escalations per immature-day and their initiators, play bouts per immature-day and play minutes by age, the
  share of guardian defence charges that answer rough play, consolations after rough play; listening stops per patrol by
  kind (the tool classes a stop as "schedule" when the counter rises without a phase change, so under bit 2 these are
  the stops after a sound), outbound share of time stopped, stops after a stranger heard in the last 15 min, hearings
  per hour stopped and moving; meat and protection readouts as D0 (unchanged mechanisms; reported).
- `e-bench --quick` (seeds 48, 7; 30 + 30 days): fitted and held-out sums against S21q and its three `rngSalt` re-draws
  (judge_vs_reps.py, amendment 2; with and without T-HUN-4, T-BRD-1, T-IGE-3), T-PAT and T-HUN rows, T-ACT-1..4,
  prescription count, viability. `energy-diagnose` (seeds 48, 7; 30 + 30): reserves ÷ store %/day by class.
- Patrol rows as the observer defines them (`src/field/classifiers.ts`, after wattsMitani2001: "≥ 2 adult males,
  silent ≥ 20 min, focal travelling ≥ 50%, reaching the own 90% isopleth, ≥ 2 listening stops", stops = the focal still
  for 1–5 min while its party waits).

## 7. Arms

- **A1** = S21 + `leftoverRules` 3 (both bits). `e-bench --quick` and `energy-diagnose` exactly as the integrator ran
  S21q (scratchpad/integrator/s21q.sh: workers 2 below load 8, else 1), plus `e4m-diagnose` 30 + 60 days per seed;
  from a frozen detached checkout of the commit that registers A1's run in §9. Judged against S21q, S21q1, S21q2, S21q3.
- If A1 crosses a kill criterion, the two bits are run apart (A1a = bit 1, A1b = bit 2) before any change, as the first
  iteration, logged in §9 before its run.

## 8. Predictions and kill criterion (A1 against the S21 group; moderate confidence unless stated)

| Quantity | Prediction |
| --- | --- |
| Prescription count | 45 → 43 (high) |
| Rough escalations per immature-day (truth) | ≤ 0.05, from 0.48–0.51 (≥ 90% fewer), every one with the player's fast state above 0 (by construction, high) |
| Guardian defence charges (truth) | 35–55% fewer than D0's 122 / 110 (the rough-play share) |
| Play bouts per immature-day | within 15% of D0 (6.9 / 7.9): bouts that no longer end rough go on (low) |
| Listening stops per patrol (truth) | 2–4, from 10.8–12.7; stops after a sound ≤ 2 per patrol; outbound time stopped ≤ 8%, from 19–20% |
| T-PAT-1 (observer) | not higher than the S21 group's values; it may become unscored (fewer patrols with ≥ 2 stops) |
| Patrols per community-week (truth) | within the S21 group's spread (the stops do not decide whether a patrol starts) (low) |
| T-HUN rows, T-ACT-1..4 | inside the S21 group's spread (no mechanism touches them directly) |
| Reserves %/day by class | inside the S21 group's spread (high) |
| Fitted, held-out (with and without the rare rows) | inside noise (|z| ≤ 2) |
| Viability | passes (high) |

**Kill criterion** (the switch stays off and the result is recorded as a null): viability fails (a starvation death the
reference does not have, or a seed below 80% of its start); held-out without the rare rows worse beyond noise (z > +2);
the prescription count does not fall by 2; bit 1 leaves rough play at ≥ 0.4 per immature-day (the mechanism does not
act); bit 2 leaves ≥ 8 stops per patrol or makes patrols never stop (it fails its purpose).

## 9. Run log (each entry written before its run)

- **Smoke, switch on** (logged after the run; working tree at 373e62d plus nothing else): S21 + `leftoverRules` 3, seed 48,
  1 + 2 days. Every readout is produced; but rough play stayed at 0.5 per immature-day, in cascades: a 6-year-old (21.6
  kg) with fast arousal 0.67 was rough with a 1.8-year-old, the infant's mother charged him (kicking his fast state),
  he went back to play with the infant at once and was rough again, seven times in four minutes; two adolescents aroused
  by a conflict played and were rough with each other. The rule did what it says; what was missing is that an aroused
  animal still chose to play, because no play score reads arousal.
- **Amendment 1 to §5 (bit 1), written after the smoke test above and before any arm; disclosed.** Play is initiated in a
  relaxed context: Burghardt's fifth criterion of play, as cited by cordoniPalagi2011 ("a playful behavior must be ...
  initiated in a relaxed context"). With bit 1 the incentive terms of both play offers (`candidates.ts`: playfulness,
  energy, youth, social need and the partner's invitation for immatures; the base, playfulness, own-infant and invitation
  terms for adults with young) count by the share of restraint the animal's acute drive leaves, 1 − A; the costs
  (distance, hunger, rain, night) are unchanged; no new parameter. Without the bit the sums are today's. A test pins it
  (`tests/sim-leftover-rules.test.ts`). §8's predictions stand as registered (rough play ≤ 0.05 per immature-day; play
  bouts within 15% of D0); added: play bouts started by an animal with A > 0.5 are rare (≤ 5% of bouts).
- **Smoke, switch on, amendment 1** (logged after the runs; working tree at 373e62d plus amendment 1): seed 48, 1 + 2 days
  (190 play bouts, 0 rough) and 1 + 12 days (1,379 play bouts, 0 rough; 1 patrol: 1 stop after a sound, 2 at waypoints).
  The readouts work with the switch on.
- **Readout added before A1** (scripts only): `e4m-diagnose.ts` records the actor's acute drive when a play bout's contact
  begins (`boutStarts`, `boutsStartedAcuteOver0`, `boutsStartedAcuteOver05`), for amendment 1's added prediction.
- **A1** (as registered in §7): S21 + `leftoverRules` 3, from a frozen detached checkout of the commit that adds this
  entry (`scratchpad/e4m/frozen-a1`): `e-bench --quick` (workers 2 below load 8, else 1) and `energy-diagnose` (seeds
  48, 7; 30 + 30) exactly as scratchpad/integrator/s21q.sh, then judged with judge_vs_reps.py against S21q, S21q1–q3;
  `e4m-diagnose` 30 + 60 days, seeds 48 then 7, beside them. Outputs `artifacts/validation/e4m/A1*`.
- **D1–D3** (the spread of the truth readouts on S21; no change of code or readouts): `e4m-diagnose` on S21 with
  `rngSalt` 1, 2, 3 (the parameters of S21q1–S21q3), 30 + 60 days, seeds 48 then 7, from `scratchpad/e4m/frozen-a1`
  (2783988: every switch-gated change is off at `leftoverRules` 0, field pin unchanged), after A1's diagnosis finishes;
  `artifacts/validation/e4m/D{1,2,3}-diag-{48,7}.json`. The arm's truth readouts are then judged against D0–D3 (mean ± SD).
- **A1 note** (logged after the run): bench 08:35–08:37 (2 workers), energy 08:37–08:42, diagnosis 08:35–08:39; D1–D3
  08:38–08:51; all from `frozen-a1` (2783988, clean: `git.dirty` 0). Readout defect found while reading A1, deferred (the
  readout is not used for a decision): `e4m-diagnose.ts` counts a guardian's defence charge as answering rough play only
  when it starts after the escalation's tick (`dtH > 0`), but the partner's scream interrupts its mother, who can charge
  in the same tick, so "of them answering rough play" undercounts (D0: 110 of 232); the defence charges by ward age are
  unaffected and show the full link (wards under 8 y: 212 → 1).

## 10. Results (A1 against S21's four quick realizations and D0–D3; printed by `artifacts/validation/e4m/judge_e4m.py` from the JSON)

```
reference runs: ['S21q', 'S21q1', 'S21q2', 'S21q3'] ; arms: ['A1']
  S21q: e7d8d8e dirty 0 prescriptions 45 viability pass deaths 0 starvation 0 causes [{}, {}]
  S21q1: e7d8d8e dirty 0 prescriptions 45 viability pass deaths 1 starvation 0 causes [{'illness': 1}, {}]
  S21q2: e7d8d8e dirty 0 prescriptions 45 viability pass deaths 0 starvation 0 causes [{}, {}]
  S21q3: e7d8d8e dirty 0 prescriptions 45 viability pass deaths 0 starvation 0 causes [{}, {}]
  A1: 2783988 dirty 0 prescriptions 43 viability pass deaths 0 starvation 0 causes [{}, {}]

quick, reference custom (4 runs), rows counted in all runs: fitted 15, held-out 15
  fitted             (15 rows) ref 1.23, 2.15, 0.84, 1.36 (mean 1.39, sd 0.55; used 0.69) | A1.json: 1.65, Δ +0.25, z +0.3 (inside noise)
  held-out           (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 1.26) | A1.json: 5.13, Δ +0.50, z +0.4 (inside noise)
  held-out w/o rare  (15 rows) ref 5.77, 3.47, 4.78, 4.47 (mean 4.63, sd 0.95; used 0.95) | A1.json: 5.13, Δ +0.50, z +0.5 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-11  fitted   ref 0.69±0.28 | A1.json 0.09 (fail)
   T-SOC-3   held-out ref 0.01±0.02 | A1.json 0.37 (fail)
   T-SOC-5   held-out ref 0.00±0.00 | A1.json 0.26 (fail)


| Reserves ÷ store, % per day (OLS) | S21 runs | S21 mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | +0.011 / -0.005 / -0.007 / +0.013 | +0.003 ± 0.010 | +0.009 (z +0.5) |
| female, other | +0.011 / +0.011 / -0.020 / +0.007 | +0.002 ± 0.015 | +0.003 (z +0.1) |
| female, lactating | +0.026 / +0.014 / -0.030 / +0.021 | +0.008 ± 0.025 | +0.006 (z -0.1) |
| juvenile 5–12 y | -0.001 / +0.020 / -0.040 / -0.008 | -0.007 ± 0.025 | +0.004 (z +0.4) |
| infant 2–5 y | +0.040 / +0.010 / -0.012 / +0.014 | +0.013 ± 0.021 | +0.016 (z +0.1) |
| infant 0.5–2 y | +0.013 / +0.004 / -0.034 / +0.037 | +0.005 ± 0.029 | -0.006 (z -0.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

deaths (energy-diagnose): {'S21q': {}, 'S21q1': {'adult male: illness': 1}, 'S21q2': {}, 'S21q3': {}, 'A1': {}}

| Row (pooled; verdict) | Band | S21 runs | S21 mean ± SD | A1 |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.33–0.5 | 0.378 (pass) / 0.369 (pass) / 0.374 (pass) / 0.371 (pass) | 0.373 ± 0.004 | 0.374 (pass) z +0.3 |
| T-ACT-2 | 0.12–0.25 | 0.151 (pass) / 0.156 (pass) / 0.162 (pass) / 0.172 (pass) | 0.160 ± 0.009 | 0.152 (pass) z -0.8 |
| T-ACT-3 | 0.08–0.18 | 0.094 (fail) / 0.092 (fail) / 0.094 (fail) / 0.090 (fail) | 0.092 ± 0.002 | 0.094 (fail) z +0.8 |
| T-ACT-4 | 0.3–0.47 | 0.391 (pass) / 0.358 (pass) / 0.372 (pass) / 0.368 (pass) | 0.372 ± 0.014 | 0.409 (pass) z +2.4 |
| T-PAT-1 | 0.1–0.5 | 0.038 (inconclusive) / 0.232 (pass) / 0.115 (pass) / 0.115 (pass) | 0.125 ± 0.080 | 0.077 (inconclusive) z -0.5 |
| T-PAT-2 | 7–18 | 1.262 (fail) / 9.055 (pass) / 4.724 (fail) / 4.474 (fail) | 4.878 ± 3.200 | 2.173 (fail) z -0.8 |
| T-PAT-3 | 0.55–0.85 | 1.000 (fail) / 0.808 (pass) / 0.607 (pass) / 0.750 (pass) | 0.791 ± 0.163 | 0.464 (fail) z -1.8 |
| T-PAT-5 | 60–240 | 300.000 (fail) / 189.875 (pass) / 210.250 (pass) / 112.750 (pass) | 203.219 ± 76.982 | 152.000 (pass) z -0.6 |
| T-PAT-6 | 0.4–0.7 | 0.600 (pass) / 0.333 (fail) / 0.667 (pass) / 0.167 (fail) | 0.442 ± 0.233 | — |
| T-PAT-7 | 0.15–0.45 | 0.000 (fail) / 0.167 (pass) / 0.000 (fail) / 0.000 (fail) | 0.042 ± 0.083 | 0.000 (fail) z -0.4 |
| T-BRD-1 | 0.037–0.107 | — / — / — / — | — | — |
| T-HUN-1 | 5–25 | 6.016 (pass) / 0.000 (inconclusive) / 0.000 (inconclusive) / 4.011 (inconclusive) | 2.507 ± 3.008 | 0.000 (inconclusive) z -0.7 |
| T-HUN-2 | 0.5–0.8 | 0.500 (pass) / — / — / 0.500 (pass) | 0.500 ± 0.000 | — |
| T-HUN-3 | 0.05–0.4 | 0.007 (fail) / 0.000 (fail) / 0.000 (fail) / 0.008 (fail) | 0.004 ± 0.004 | 0.000 (fail) z -0.8 |
| T-HUN-4 | 1.05–1.8 | 2.568 (fail) / — / — / 1.885 (fail) | 2.227 ± 0.483 | — |
| T-HUN-7 | 1.2–2 | 1.000 (fail) / — / — / 1.000 (fail) | 1.000 ± 0.000 | — |
| T-HUN-8 | 0.8–0.95 | 1.000 (fail) / — / — / 1.000 (fail) | 1.000 ± 0.000 | — |
| T-IGE-1 | 5–12 | 8.977 (pass) / 1.535 (inconclusive) / 1.480 (inconclusive) / 6.072 (pass) | 4.516 ± 3.671 | 8.982 (pass) z +1.1 |
| T-IGE-2 | 0.7–0.9 | 1.000 (fail) / 0.500 (fail) / 1.000 (fail) / 1.000 (fail) | 0.875 ± 0.250 | 1.000 (fail) z +0.4 |
| T-IGE-3 | 0.25–0.75 | — / — / — / — | — | — |
| T-SOC-9 | 0.08–0.22 | 0.082 (pass) / -0.042 (fail) / 0.079 (fail) / 0.117 (pass) | 0.059 ± 0.070 | -0.057 (fail) z -1.5 |
| T-SOC-10 | 0.1–0.3 | 0.173 (pass) / 0.238 (pass) / 0.165 (pass) / 0.240 (pass) | 0.204 ± 0.041 | 0.203 (pass) z -0.0 |
  S21q T-PAT-1 parts: {'perMaleFollowWeek': 0.081, 'withStopsPerWeek': 0.038, 'maleParties': 0.194}
  S21q1 T-PAT-1 parts: {'perMaleFollowWeek': 0.438, 'withStopsPerWeek': 0.232, 'maleParties': 0.467}
  S21q2 T-PAT-1 parts: {'perMaleFollowWeek': 0.254, 'withStopsPerWeek': 0.115, 'maleParties': 0.231}
  S21q3 T-PAT-1 parts: {'perMaleFollowWeek': 0.175, 'withStopsPerWeek': 0.114, 'maleParties': 0.233}
  A1 T-PAT-1 parts: {'perMaleFollowWeek': 0.171, 'withStopsPerWeek': 0.077, 'maleParties': 0}

| Truth readouts (e4m-diagnose, 30 + 60 days, seeds 48 + 7) | S21 runs | S21 mean ± SD | A1 |
| --- | --- | --- | --- |
| rough escalations per immature-day | 0.494 / 0.448 / 0.502 / 0.458 | 0.475 ± 0.027 | 0.001 (z -16.0) |
| play bouts per immature-day | 7.458 / 7.386 / 7.615 / 6.750 | 7.302 ± 0.380 | 6.043 (z -3.0) |
| play min per day, immatures 5–8 y | 121.998 / 128.044 / 127.654 / 110.757 | 122.113 ± 8.059 | 131.199 (z +1.0) |
| guardian defence charges (2 seeds) | 232.000 / 215.000 / 228.000 / 210.000 | 221.250 ± 10.436 | 14.000 (z -17.8) |
|   of them answering rough play | 110.000 / 97.000 / 112.000 / 93.000 | 103.000 ± 9.416 | 0.000 (z -9.8) |
| patrols (truth, 2 seeds) | 27.000 / 24.000 / 34.000 / 19.000 | 26.000 ± 6.272 | 22.000 (z -0.6) |
| listening stops per patrol | 11.630 / 11.000 / 11.382 / 8.105 | 10.529 ± 1.637 | 2.818 (z -4.2) |
|   at waypoints per patrol | 1.593 / 1.917 / 1.824 / 1.737 | 1.767 ± 0.138 | 1.818 (z +0.3) |
|   schedule (S21) or after a sound (arm) per patrol | 10.037 / 9.083 / 9.559 / 6.368 | 8.762 ± 1.642 | 1.000 (z -4.2) |
| outbound share of time stopped | 0.195 / 0.195 / 0.189 / 0.200 | 0.195 ± 0.004 | 0.042 (z -31.8) |
| patrols with >= 2 stops | 27.000 / 24.000 / 34.000 / 19.000 | 26.000 ± 6.272 | 20.000 (z -0.9) |
| captures (2 seeds) | 4.000 / 3.000 / 3.000 / 4.000 | 3.500 ± 0.577 | 0.000 (z -5.4) |
| kcal per capture | 1148.571 / 1148.571 / 1148.571 / 1148.571 | 1148.571 ± 0.000 | — |
| kcal per hunt | 765.714 / 344.571 / 861.429 / 656.327 | 657.010 ± 224.516 | 0.000 (z -2.6) |
| holder-minutes awake per carcass | 183.625 / 173.583 / 184.167 / 171.688 | 178.266 ± 6.551 | — |
| charges at 12+ y with a qualifying mother (age limit decides) | 66.000 / 112.000 / 71.000 / 147.000 | 99.000 ± 38.061 | 63.000 (z -0.8) |
| defence charges, ward <5 y | 164.000 / 137.000 / 168.000 / 134.000 | 150.750 ± 17.727 | 0.000 (z -7.6) |
| defence charges, ward 5-8 y | 48.000 / 36.000 / 36.000 / 31.000 | 37.750 ± 7.228 | 1.000 (z -4.5) |
| defence charges, ward 8-12 y | 10.000 / 27.000 / 9.000 / 21.000 | 16.750 ± 8.732 | 3.000 (z -1.4) |
| defence charges, ward 12-15 y | 9.000 / 11.000 / 13.000 / 22.000 | 13.750 ± 5.737 | 4.000 (z -1.5) |
| defence charges, ward 15-20 y | 0.000 / 4.000 / 1.000 / 2.000 | 1.750 ± 1.708 | 6.000 (z +2.2) |
| defence charges, ward >=20 y | 1.000 / 0.000 / 1.000 / 0.000 | 0.500 ± 0.577 | 0.000 (z -0.8) |
  A1: play bouts started with acute drive > 0: 3164 of 10152; > 0.5: 0; rough initiators by age [{}, {'5-8': 1, '<5': 1}]; deaths [{}, {}]
```

**Against the predictions (§8 and amendment 1):**

| Quantity | Predicted | Observed (A1; S21 mean ± SD of four realizations) | Verdict |
| --- | --- | --- | --- |
| Prescription count | 45 → 43 (high) | 43 | held |
| Rough escalations per immature-day | ≤ 0.05 (from 0.48–0.51) | 0.001 (0.475 ± 0.027): 2 escalations in two seeds, one pair in one tick, each rough with the other (the lighter one can be rough only when both are aroused: a kick in that tick, both fast states 0 before it) | held |
| Guardian defence charges | 35–55% fewer | 14 against 221 ± 10 (−94%); wards under 8 y 212 → 1 | missed: nearly every defence charge followed rough play (the D0 attribution readout undercounted it, run log) |
| Play bouts per immature-day | within 15% of D0 (low) | 6.04 against 7.30 ± 0.38 (−17%, z −3.0); play minutes of 5–8-year-olds 131 against 122 ± 8 (z +1.0): fewer, longer bouts | missed narrowly |
| Bouts begun with acute drive > 0.5 | ≤ 5% | 0 of 10,152 (31% begin with some arousal above 0) | held |
| Stops per patrol | 2–4 | 2.82 (10.53 ± 1.64): 1.82 at waypoints (1.77 ± 0.14), 1.00 after a sound | held |
| Outbound time stopped | ≤ 8% | 4.2% (19.5 ± 0.4%) | held |
| T-PAT-1 | not higher than the S21 runs; may go unscored | 0.077, inconclusive (0.125 ± 0.080; S21q 0.038); its male-party part 0 (0.19–0.47); T-PAT-6 below the classifier's instrument bar (unscored) | held |
| Patrols (truth) | within the S21 spread (low) | 22 against 26 ± 6 (z −0.6) | held |
| T-HUN rows, T-ACT-1..4 | inside the S21 spread | T-HUN rows unscored or at the reference's values (hunts 3 against 4–10, captures 0 against 3–4: counts too small to judge, P(0 captures at a mean of 3.5) ≈ 0.03); T-ACT-1..3 inside; **T-ACT-4 rest 0.409 against 0.372 ± 0.014 (z +2.4)**, in band | missed (rest) |
| Reserves %/day | inside the S21 spread (high) | every class within ±0.5 SD | held |
| Fitted, held-out, held-out without the rare rows | inside noise | z +0.3, +0.4, +0.5 (the rare rows went unscored in every quick run) | held |
| Viability | passes (high) | passes; no death (S21q1 one illness death) | held |

**Kill criterion (§8): not met.** Viable; held-out without the rare rows inside noise (z +0.5); count 45 → 43; rough play
0.001 per immature-day (the mechanism acts); 2.8 stops per patrol (they neither stay at the schedule's level nor stop).

**Beyond the reference's spread, not registered:** T-SOC-3 (grooming reciprocity slope 0.32 against 0.58–0.82; band
0.45–0.8) and T-SOC-5 (male hierarchy steepness 0.07 against 0.21–0.41) fail where the four reference runs passed;
T-COM-11 better (0.22 against 0–0.17). Both seeds move the same way for T-SOC-3 (0.25, 0.40 against 0.49–0.93). A
plausible route for T-SOC-5 is the loss of the conflict chain that rough play fed (rough play → the mother's defence
charge → the juvenile's loss and redirected charges: charges at 12–15-year-olds with a qualifying mother were mostly
redirects); not tested here. Both are held-out rows inside the summed noise; the confirm decides.

### Verdict

**`leftoverRules` 3: a provisional keep candidate (45 → 43)**, by the keep rule in quick mode: viable, every sum inside
noise against S21's four realizations, prescriptions down by the two entries the diagnosis implicated. A 5-seed confirm
on the stack (S21 + `leftoverRules` 3) should decide, watching rest (T-ACT-4), T-SOC-3, T-SOC-5 and the patrol rows'
instrument bar.

What the switch changes: play no longer turns rough by a die, so mothers are no longer made rough with their own infants
(56–64% of S21's escalations in D0–D3 were by the victim's own mother), and the guardians' defence charges, which nearly
all followed rough play, fall from 221 ± 10 to 14; rough
play now arises only when a player is acutely aroused during play (a storm onset, aggression received), which almost
never happens because an aroused animal rarely starts to play. Patrols stop where the model gives a stop something to do
(the range edge, the end of the incursion, and after a heard chorus while it is counted): 2.8 stops instead of 10.5,
19.5% → 4.2% of the way out spent still.

Not built: `meatEatPerH` (implicated; the edible energy of an average red colobus capture could not be sourced, §4) and
`guardMaxAgeY` (trims). Both stay counted.

## 11. Open problems and deferred defects

- **Listening has no value in the model's perception** (the biggest): hearing does not depend on the listener's own
  movement, so a stop gains nothing but time to count a chorus, and patrols now stop 2.8 times instead of the field's
  "frequent stops"; the observer's classifier, which needs ≥ 2 listening stops (wattsMitani2001's definition), then
  misses more patrols (T-PAT-6 below its instrument bar, male-party T-PAT-1 part 0). Stops at field frequency need a
  perception in which stillness pays (calls masked by the party's own movement), a perception change beyond this stage.
- **Rough play has no source inside play.** With arousal only from storms and aggression, play almost never turns rough
  (0.001 per immature-day against captive chimpanzees' 0.003 escalations per session of about a minute, cordoni2018,
  context only). Field play fighting is a contest (cordoniPalagi2011: competitive in juveniles, restraint needed); the
  model's play has no exchange of advantage that could build arousal, so no escalation arises from play itself.
- **Meat per capture** (`meatEatPerH`): needs immature red colobus masses and the edible share of a carcass
  (Struhsaker 1975/2010, Teelen 2008 and Watts & Mitani 2002 not reachable openly).
- **`guardMaxAgeY`** trims (no caretaker ward in 10 seed-runs of 60 days, D0–D3 and A1; it changes the deterrent of
  43–118 of 2,831–4,439 charges, 1.3–2.7%).
- Deferred readout defect: same-tick defence charges (run log, A1 note); `e4m-diagnose.ts` encounter-impulse valuations
  read none (D0 note).
