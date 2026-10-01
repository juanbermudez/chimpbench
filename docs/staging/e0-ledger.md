# E0 prescription ledger

Generated 2026-10-01T18:55:31.068Z by `scripts/prescription-ledger.ts` (rules and judgement calls: `scripts/lib/prescriptions.ts`). Field profile, registry defaults.

**Prescription count: 132** = 123 outcome-encoding registry entries in use + 9 literals outside the registry.

| Class | Entries | Meaning |
| --- | --- | --- |
| input | 89 | physiology, physics, ecology or life history measured apart from the behaviour |
| design | 565 | weights, thresholds, distances, durations and switches that state no outcome |
| outcome-encoding | 133 | clock hours, hazards, probabilities, rates, quotas, bonuses; values fitted to a target row or copied from a field rate of the behaviour (123 in use, 10 zero, planned or switched out) |
| all | 787 | |

Outcome-encoding entries in use, by kind: probability 34, fitted 21, timer 19, clock 14, field-copy 12, quota 10, hazard 7, designed-from-target 3, bonus 3.

Limits. The classes follow written rules, so they are reproducible, not certain: entries marked † are judgement calls. Bout lengths (`bout*Min`/`Max`) are classed design (re-decision cadence) except the four tied to clock windows (midday rest, morning nest). Score literals in `src/sim` (weights such as the rest score's 0.12) and gap literals (`time - x.lastCall > 1.5`) are outside this lint, which covers hour-of-day comparisons, dice against fixed numbers and the time-of-day menus only.

## Outcome-encoding registry entries

| Id | Group | Field value | Units | Kind | In use | Encodes | Rule | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `activeDayH` | scale | 11.5 | h | field-copy | no (planned) | — | override | the nest-to-nest active day is an outcome of the nest drive and daylight (planned entry; a target from stage E2) |
| `adoptOtherMinAgeY` † | mortality | 12 | y | field-copy | yes | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `adoptOtherP` | mortality | 0.3 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `adoptSiblingInfantP` | mortality | 0.15 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `adoptSiblingMinAgeY` † | mortality | 8 | y | field-copy | yes | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `adoptSiblingP` | mortality | 0.6 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `assocBondW` † | social | 0 | score per bond | field-copy | no (0) | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `bereaveHalfLifeD` | needs | 180 | bio-days | designed-from-target | yes | T-DEM-18 | override | designed from the source of T-DEM-18 (data/targets.json) |
| `bereaveMaxAgeY` | needs | 12 | y | designed-from-target | yes | T-DEM-18 | override | designed from the source of T-DEM-18 (data/targets.json) |
| `boutNestMorningMax` | decision | 9 | eco-min | clock | yes | — | override | nest bouts are short between 05:30 and 12:00 by rule (literal clock window in execution.ts) |
| `boutNestMorningMin` | decision | 4 | eco-min | clock | yes | — | override | nest bouts are short between 05:30 and 12:00 by rule (literal clock window in execution.ts) |
| `boutRestMiddayMax` | decision | 30 | eco-min | clock | yes | T-ACT-4 | override | rest bouts are longer between 11:30 and 14:30 by rule (literal clock window in execution.ts) |
| `boutRestMiddayMin` | decision | 15 | eco-min | clock | yes | T-ACT-4 | override | rest bouts are longer between 11:30 and 14:30 by rule (literal clock window in execution.ts) |
| `carryDeadP` | mortality | 0.35 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `coalitionBondP` | conflict | 0.5 | probability per bond | probability | yes | — | 5b probability | a probability per bond that states how often the behaviour or its outcome happens |
| `coalitionStrangerP` | conflict | 0.8 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `colobusOfftakePerY` | prey | 0.065 | per year | field-copy | no (planned) | — | override | annual predation offtake is the outcome of hunting, not an input to it (planned entry) |
| `consortLatestHour` | social | 16 | h (time of day) | clock | yes | — | 5a clock hour | an hour of the day written into a rule |
| `contactCallGapH` | communication | 0.75 | h | quota | yes | T-COM-1 | 5e quota | at most one act per fixed interval |
| `continueBonus` | decision | 0.25 | score | bonus | yes | — | override | fixed bonus for carrying on with the current act: sets bout persistence directly |
| `dispersalHazardPerY` | reproduction | 3 | per bio-year | hazard | yes | — | 5c hazard or rate | a rate (per bio-year) that states how often the behaviour happens |
| `disperserP` | reproduction | 0.87 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `drinkDistScaleM` | needs | 2000 | m | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `drinkThirstPerH` | feeding | 1.4 | thirst/h | timer | yes | — | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `drumHitsMedian` † | communication | 4 | hits | field-copy | yes | T-COM-6 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `drumHitsSigma` † | communication | 0.45 | log SD | field-copy | yes | T-COM-6 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `drumIntervalMs` † | communication | 229 | ms | field-copy | yes | T-COM-6 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `energyOtherPerH` | needs | 0.02 | per eco-h | timer | yes | T-ACT-4 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `energyRestPerH` | needs | 0.06 | per eco-h | timer | yes | T-ACT-4 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `energyRunPerH` | needs | 0.25 | per eco-h | timer | yes | T-ACT-4 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `energySleepPerH` | needs | 0.1 | per eco-h | timer | yes | T-ACT-4 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `energyWalkPerH` | needs | 0.05 | per eco-h | timer | yes | T-ACT-4 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `epidemicArrivalPerY` † | disease | 0.1 | per community-year | fitted | yes | T-DEM-5 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-DEM-5 |
| `epidemicBetaPerH` † | disease | 0.03 | per infectious co-member per h | fitted | yes | T-DEM-6 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-DEM-6 |
| `epidemicFatality` † | disease | 0.07 | probability per case | fitted | yes | T-DEM-6 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-DEM-6 |
| `escalateImpulseAggr` | conflict | 0.006 | per perception | hazard | yes | — | 5c hazard or rate | a rate (per perception) that states how often the behaviour happens |
| `escalateImpulseBase` | conflict | 0.002 | per perception | hazard | yes | — | 5c hazard or rate | a rate (per perception) that states how often the behaviour happens |
| `escalationBaseP` | conflict | 0.08 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `escalationEvenP` | conflict | 0.3 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `fallbackForageW` | feeding | 0.45 | score per hunger | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `fallbackHungerPerH` | feeding | 0.11 | hunger/h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `feedChargeGapH` | social | 0.75 | h | quota | yes | — | 5e quota | at most one act per fixed interval |
| `finishedPenalty` | decision | 0.5 | score | bonus | yes | — | override | fixed penalty on the act just finished: sets act switching directly |
| `foodCallBase` | communication | 0.35 | probability | probability | yes | T-COM-8 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `foodCallCropW` | communication | 0.3 | probability per crop unit | probability | yes | T-COM-8 | 5b probability | a probability per crop unit that states how often the behaviour or its outcome happens |
| `foodCallMaleW` | communication | 0.05 | probability per male | probability | yes | T-COM-8 | 5b probability | a probability per male that states how often the behaviour or its outcome happens |
| `foodCallPartnerW` | communication | 0.15 | probability | probability | yes | T-COM-8 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `forageDistScaleM` | feeding | 400 | m | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `fruitHungerFactor` | feeding | 2.2 | hunger per fruit unit | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `fruitIntakePerH` | feeding | 0.11 | fruit/h | fitted | yes | T-ACT-2, T-RNG-4, T-ACT-1 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `fruitThirstFactor` | feeding | 0.55 | thirst per fruit unit | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `gangImpulseP` | conflict | 0.5 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `gangKillInfantP` | conflict | 0.3 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `gangKillMaleMax` | conflict | 0.45 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `gangKillMalePerAttacker` | conflict | 0.12 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `gangKillOtherP` | conflict | 0.03 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `gangMinOwnMales` | conflict | 3 | males | designed-from-target | yes | T-LET-3 | override | the ≥ 3-male gang rule is partly designed from the numerical odds in lethal attacks (data/targets.json T-LET-3) |
| `gangRollGapH` | conflict | 6 | h | quota | yes | T-LET-1 | 5e quota | at most one act per fixed interval |
| `gangVictimGapH` | conflict | 24 | h | quota | yes | T-LET-1 | 5e quota | at most one act per fixed interval |
| `goalDistScaleM` | movement | 0 | m | fitted | no (0) | — | 6 notes: fitted | notes say the value was fitted or tuned to a field statistic of the behaviour |
| `guardMaxAgeY` † | social | 12 | y | field-copy | yes | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `hitP` | conflict | 0.12 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `hungerAwakePerH` | needs | 0.06 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `hungerLactationPerH` | needs | 0.012 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `hungerPregnancyPerH` | needs | 0.008 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `hungerRunPerH` | needs | 0.09 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `hungerSleepPerH` | needs | 0.022 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `huntDayPerMale` | hunting | 0.0045 | per male per day | hazard | no (no hunting-day lottery is drawn while huntEncounter is 1 (src/sim/tick.ts)) | T-HUN-1 | 5c hazard or rate | a rate (per male per day) that states how often the behaviour happens |
| `huntEncounterProbBroken` | hunting | 0.64 | probability | probability | no (planned) | T-HUN-3 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `huntExtraKillP` | hunting | 0.17 | probability | probability | yes | T-HUN-7 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `huntGapH` | hunting | 6 | h | quota | yes | T-HUN-1 | 5e quota | at most one act per fixed interval |
| `huntSuccessMax` | hunting | 0.8 | probability | probability | yes | T-HUN-2 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `huntSuccessRate` † | hunting | 0.3 | per extra hunter | probability | yes | T-HUN-2 | override | shape of the hunt-success curve; with huntSuccessMax it sets the success rate |
| `huntSwollenFemaleOdds` | hunting | 0.78 | odds ratio | probability | no (planned) | — | 5b probability | a odds ratio that states how often the behaviour or its outcome happens |
| `immigrantChargeGapH` | social | 0.75 | h | quota | yes | — | 5e quota | at most one act per fixed interval |
| `infanticideKillP` | conflict | 0.7 | probability | probability | yes | T-LET-1 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `infanticideNewAlphaP` | conflict | 0.0005 | per perception | hazard | yes | T-LET-1 | 5c hazard or rate | a rate (per perception) that states how often the behaviour happens |
| `infanticideStrangerP` | conflict | 0.004 | per perception | hazard | yes | T-LET-1 | 5c hazard or rate | a rate (per perception) that states how often the behaviour happens |
| `joinCallDistScaleM` | social | 1500 | m | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `joinHooW` | decision | 0.094 | score | fitted | yes | — | 6 notes: fitted | notes say the value was fitted or tuned to a field statistic of the behaviour |
| `joinSocialW` | social | 0.55 | score per social need | fitted | yes | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `mateIntervalH` | reproduction | 1.5 | h | quota | yes | — | 5e quota | at most one act per fixed interval |
| `meatEatPerH` | needs | 0.35 | per eco-h | timer | yes | T-ACT-1 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `memTravelHungerW` | movement | 1.25 | score per hunger | fitted | yes | T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-ACT-2, T-RNG-4 |
| `nestEveningDrive` | decision | 2.2 | score | clock | yes | — | override | strength of the evening clock ramp (nestEveningStartH to nestEveningEndH): part of the nest clock |
| `nestEveningEndH` | social | 18.9 | h (time of day) | clock | yes | — | 5a clock hour | an hour of the day written into a rule |
| `nestEveningFromH` | social | 12 | h (time of day) | clock | yes | — | 5a clock hour | an hour of the day written into a rule |
| `nestEveningStartH` | social | 17.9 | h (time of day) | clock | yes | — | 5a clock hour | an hour of the day written into a rule |
| `nestMorningDrive` † | decision | 2.6 | score | clock | yes | — | override | strength of the morning stay-in-nest drive: part of the nest clock |
| `nestNightBonus` | decision | 0.6 | score | bonus | yes | — | override | extra nest drive because it is night: states sleeping at night |
| `nestWakeHour` | decision | 5.75 | h (time of day) | clock | yes | — | 5a clock hour | an hour of the day written into a rule |
| `pantGruntRepeatH` | social | 8 | h | quota | yes | — | 5e quota | at most one act per fixed interval |
| `partyFollowBase` | social | 0.7 | score | fitted | yes | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `partyFollowHungerW` | social | 0 | score per hunger | fitted | no (0) | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `partyFollowMaleW` | social | 0.4 | score | fitted | yes | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `partyFollowW` | social | 1 | score per bond | fitted | yes | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `partyStayW` | social | 0.05 | score per companion | fitted | yes | T-PTY-1, T-ACT-2, T-RNG-4 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PTY-1, T-ACT-2, T-RNG-4 |
| `patrolAlphaLeadBonus` † | patrol | 0 | score | field-copy | no (0) | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolEndH` | patrol | 15.5 | h (time of day) | clock | yes | T-PAT-1 | 5a clock hour | an hour of the day written into a rule |
| `patrolFemaleJoin` † | patrol | 0.2 | score | field-copy | yes | T-PAT-3 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolFemaleStay` † | patrol | -0.3 | score | field-copy | yes | T-PAT-3 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolH0` | patrol | 0.0183 | per h | fitted | yes | T-PAT-1 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-PAT-1 |
| `patrolHeardBeta` † | patrol | 0 | x | field-copy | no (0) | — | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolIncursionP` | patrol | 0.4 | probability | probability | yes | T-PAT-6 | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `patrolLactatingJoin` † | patrol | -1 | score | field-copy | yes | T-PAT-3 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolMaleOddsRatio` | patrol | 1.17 | odds ratio per male | probability | yes | T-PAT-4 | 5b probability | a odds ratio per male that states how often the behaviour or its outcome happens |
| `patrolMaxH` † | patrol | 6 | h | field-copy | yes | T-PAT-5 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `patrolReleaseContactP` | patrol | 1 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `patrolReleaseP` | patrol | 0.5 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `patrolStartH` | patrol | 8 | h (time of day) | clock | yes | T-PAT-1 | 5a clock hour | an hour of the day written into a rule |
| `patrolStopEveryMin` † | patrol | 15 | min | quota | yes | — | override | a patrol stops to listen on a fixed schedule |
| `rainDisplayP` | social | 0.12 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `redirectAggrP` | conflict | 0.15 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `redirectBaseP` | conflict | 0.08 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `rgMaxAgeH` | decision | 0.5 | h | clock | yes | — | override | an intention is re-decided after a fixed 30 min whatever the animal's state |
| `rgTemperature` | decision | 0.164 | score | fitted | yes | — | override | set so the rules' top option wins a median 0.77 (the Jev model's own figure): a choice-sharpness outcome, not a mechanism |
| `roughPlayP` | social | 0.0015 | per tick | hazard | yes | — | 5c hazard or rate | a rate (per tick) that states how often the behaviour happens |
| `seriousInjuryP` | conflict | 0.05 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `sigCommunitySD` † | communication | 0.241 | feature SD (call noise = 1) | field-copy | yes | T-COM-5 | 7 field value of behaviour | evidence M in a behaviour group: the value is taken from field observation of the behaviour |
| `sigIdentitySD` | communication | 0.308 | feature SD (call noise = 1) | fitted | yes | T-COM-5 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-COM-5 |
| `snareHazardPerKm` † | mortality | 0.00006 | per km on the ground at risk 1 | fitted | yes | T-DEM-9 | 2 notes: fitted to a target row | notes say the value was fitted or tuned against T-DEM-9 |
| `socialAwakePerH` | needs | 0.035 | per eco-h | timer | yes | T-ACT-3 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `socialSleepPerH` | needs | 0.01 | per eco-h | timer | yes | T-ACT-3 | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `stressRelaxPerH` | needs | 0.25 | per eco-h | timer | yes | — | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `thirstAwakePerH` | needs | 0.026 | per eco-h | timer | yes | — | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `thirstHotPerH` | needs | 0.008 | per eco-h | timer | yes | — | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `thirstSleepPerH` | needs | 0.008 | per eco-h | timer | yes | — | 5d need timer | hunger, thirst, energy and social need run on fixed timers and intake rates in need units, not on a measured balance |
| `travelCallGapH` | communication | 0.1 | h | quota | yes | T-COM-1 | 5e quota | at most one act per fixed interval |
| `travelCallPerH` | communication | 3 | per travel-hour | hazard | yes | T-COM-1, T-COM-4 | 5c hazard or rate | a rate (per travel-hour) that states how often the behaviour happens |
| `travelHooAllyP` | communication | 0.756 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `travelHooP` | communication | 0.554 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |
| `walkMps` | movement | 0.35 | m/s | field-copy | yes | T-RNG-4, T-ACT-2 | override | field value derived from the day range (2.7 km) and the travel share (21% of the day), the two outcomes it produces |
| `weanRefuseMaxP` | reproduction | 0.8 | probability | probability | yes | — | 5b probability | a probability that states how often the behaviour or its outcome happens |

## Prescriptions outside the registry (src/sim literals)

| Where | Kind | Values | Counted | Why | Code |
| --- | --- | --- | --- | --- | --- |
| src/sim/candidates.ts:204 | hour | 12 | **yes** | an hour of the day written into behaviour code | `else if (nestDrive > 0.25 && (hour >= 12 \|\| night)) { const t = c.action === 'nest' && isTreeId(c.targetId) ` |
| src/sim/candidates.ts:206 | hour | 11.5, 14.5 | **yes** | an hour of the day written into behaviour code | `const midday = hour >= 11.5 && hour < 14.5 ? 0.3 : 0;` |
| src/sim/candidates.ts:779 | hour | 18, 19, 6.4, 7.4 | **yes** | an hour of the day written into behaviour code | `if (time - x.lastCall > 1.5 && ((hour >= 18 && hour < 19) \|\| (hour >= 6.4 && hour < 7.4)) && env.daylight > ` |
| src/sim/candidates.ts:825 | hour | 11.5, 14.5 | no | chooses the wording of a reason text; no decision depends on it | `if (world.hour >= 11.5 && world.hour < 14.5) return `Rest through the midday heat (${Math.round(env.temperatur` |
| src/sim/candidates.ts:830 | hour | 12 | no | chooses the wording of a reason text; no decision depends on it | `if (c.nest && c.action === 'nest' && x.phase >= 2) return world.hour < 12 ? `Stay in my night nest; the light ` |
| src/sim/candidates.ts:910 | hour | 12 | no | chooses the wording of a reason text; no decision depends on it | `if (sl.v === V.CHORUS) return world.hour >= 12 ? 'Join the evening pant-hoot chorus before nesting' : 'Pant-ho` |
| src/sim/conflict.ts:161 | probability | 0.2 | no | chance that the winner is hurt too: an injury outcome, not a choice | `if (random(world) < 0.2) w.injury = clamp(w.injury + 0.02 + random(world) * 0.04);` |
| src/sim/conflict.ts:167 | probability | 0.1 | no | death from near-total injury: mortality, not a choice | `if (l.injury >= 0.98 && random(world) < 0.1) killChimp(world, l, `wounds from a fight with ${w.name}`, 2);` |
| src/sim/conflict.ts:220 | probability | 0.35 | **yes** | a dice roll against a fixed number in behaviour code | `defended = random(world) < 0.35 * (strength(mother, P) / Math.max(0.1, strength(c, P))) + help * 0.2;` |
| src/sim/environment.ts:79 | hour | 12 | no | models the world (weather, phenology), not behaviour | `return world.hour < 12 ? 'dawn' : 'dusk';` |
| src/sim/environment.ts:103 | probability | 0.4 | no | models the world (weather, phenology), not behaviour | `if (r < 0.0015 * wet * afternoon) next = h >= 12.5 && h < 19 && random(world) < 0.4 ? 'storm' : 'rain';` |
| src/sim/environment.ts:142 | probability | 0.035 | no | models the world (weather, phenology), not behaviour | `if (w.state === 'storm' && random(world) < 0.035 * env.rain) env.lightningAt = world.time;` |
| src/sim/execution.ts:39 | hour | 11.5, 14.5 | **yes** | an hour of the day written into behaviour code | `if (action === 'rest' && world.hour >= 11.5 && world.hour < 14.5) { a = P.boutRestMiddayMin; b = P.boutRestMid` |
| src/sim/execution.ts:42 | hour | 5.5, 12 | **yes** | an hour of the day written into behaviour code | `if (world.hour >= 5.5 && world.hour < 12) { a = P.boutNestMorningMin; b = P.boutNestMorningMax; }` |
| src/sim/execution.ts:809 | probability | 0.5 | **yes** | a dice roll against a fixed number in behaviour code | `if (crop > 0.55 && c.age >= 12 && time - x.lastCall > 0.75 && (t.common === 'fig' \|\| t.id === simOf(world).f` |
| src/sim/menu.ts:61 | menu | — | **yes** | acts allowed or barred by the time of day | `night: new Set<Action>(['nest', 'rest', 'nurse', 'flee', 'alarm', 'shelter', 'submit']),` |
| src/sim/menu.ts:62 | menu | — | **yes** | acts allowed or barred by the time of day | `dusk: new Set<Action>(['nest', 'rest', 'nurse', 'flee', 'alarm', 'shelter', 'submit', 'forage', 'drink', 'groo` |
| src/sim/parties.ts:195 | probability | 0.5 | no | symmetric left or right coin | `const [dx, dz] = sectorDir((p.sector + (hash01(p.leaderId, world.day, 2) < 0.5 ? SECTORS - 1 : 1)) % SECTORS);` |
| src/sim/reproduction.ts:140 | probability | 0.5 | no | sex ratio at birth (biology) | `const sex = random(world) < 0.5 ? 'female' : 'male';` |

## Encoded targets and what encodes them

| Target | Role | Metric | Parameters (class; in use) | Outside the registry | How |
| --- | --- | --- | --- | --- | --- |
| T-IGE-4 | fitted | Playback response by party composition | — | src/sim/candidates.ts:652 | the ≥ 3-male rule of the response to heard strangers was designed from this playback study; it is a literal, not a registry entry |
| T-PAT-4 | held-out | Patrol predictors | `patrolMaleOddsRatio` (outcome-encoding) | — | the patrol hazard uses the male count with the source's own odds ratio |
| T-PAT-9 | held-out | Patrol sector concentration (check) | `patrolContactW` (design), `patrolLossW` (design), `patrolStaleW` (design) | — | the contact-dominated route score (Amendment A1) was chosen after reading this pattern |
| T-LET-3 | held-out | Numerical odds in lethal attacks | `gangMinOwnMales` (outcome-encoding) | — | the ≥ 3-male gang rule is partly designed from this pattern |
| T-FOOD-1 | fitted | Phenology index | `phenologyForcing` (design) | — | the field profile is driven by the phenology record this target cites: a match by construction |
| T-FOOD-5 | held-out | Nearest-tree choice share | `memCropBelief` (design), `knownTreesK` (design) | — | C7a rules 1 and 8 (crop belief, known trees) were built to reproduce the source value |
| T-FOOD-7 | held-out | Out-of-sight approach distance | `memCropBelief` (design), `knownTreesK` (design) | — | C7a rules 1 and 8 (crop belief, known trees) were built to reproduce the source value |
| T-SOC-4 | held-out | Association by sex | `partyFollowMaleW` (outcome-encoding), `joinMaleW` (design) | — | flagged encoded at the C6 freeze without a stated reason; the male terms of party cohesion build male–male association in (inferred, not stated in data/targets.json) |
| T-SOC-8 | fitted | Females queue | `femaleQueueTauDays` (design) | — | the female queue is a mechanism written from this result |
| T-COM-1 | fitted | Male pant-hoot rate | `travelCallPerH` (outcome-encoding), `travelCallGapH` (outcome-encoding) | — | travelCallPerH was derived from 1.40 pant-hoots per male-hour, this target's own field value |
| T-COM-3 | held-out | Quiet at the edges | `callSuppressW` (design) | — | the call-suppression mechanism was built from this pattern |
| T-COM-4 | held-out | Calling context | `travelCallPerH` (outcome-encoding) | — | travelCallPerH was derived from this target's source value (43% of calls after travel) |
| T-COM-11 | fitted | Alarm calls track audience knowledge | `snakeAlarmRangeM` (design) | src/sim/candidates.ts:450 | the alarm score rises with the number of unaware group members: the audience effect is the rule itself (a literal weight) |
| T-DEM-18 | held-out | Stress activation after maternal loss fades | `bereaveHalfLifeD` (outcome-encoding), `bereaveMaxAgeY` (outcome-encoding), `bereaveStress` (design) | — | the bereavement stress and its fading were designed from this source |
| T-DEM-19 | held-out | Lean-mass proxy: orphans vs non-orphans | `guardFeedDeterW` (design), `condGood` (design), `growTauY` (design) | — | the guardian feeding lever and the condition-to-growth route were designed with this result in view |
| T-DEM-20 | held-out | Lean-mass proxy: alpha mother vs other mothers | `guardFeedDeterW` (design) | — | the feeding deterrence reads dominance relative to the mother, which builds the gradient in |
| T-DEM-22 | held-out | Neighbour pressure: pregnancy window stronger than lactation windows | `birthCondFromMother` (design) | — | the prenatal channel exists because of this source |
| T-DEM-24 | held-out | One-year survival after maternal loss, by age at loss | `selfFeedStartY` (design) | — | the self-feeding ramp to each individual's weaning age builds the direction in |

## Target rows named by outcome-encoding entries

| Target | Entries |
| --- | --- |
| T-ACT-1 | `fallbackHungerPerH`, `fruitIntakePerH`, `hungerAwakePerH`, `hungerLactationPerH`, `hungerPregnancyPerH`, `hungerRunPerH`, `hungerSleepPerH`, `meatEatPerH` |
| T-ACT-2 | `drinkDistScaleM`, `fallbackForageW`, `forageDistScaleM`, `fruitHungerFactor`, `fruitIntakePerH`, `fruitThirstFactor`, `joinCallDistScaleM`, `joinSocialW`, `memTravelHungerW`, `partyFollowBase`, `partyFollowHungerW`, `partyFollowMaleW`, `partyFollowW`, `partyStayW`, `walkMps` |
| T-ACT-3 | `socialAwakePerH`, `socialSleepPerH` |
| T-ACT-4 | `boutRestMiddayMax`, `boutRestMiddayMin`, `energyOtherPerH`, `energyRestPerH`, `energyRunPerH`, `energySleepPerH`, `energyWalkPerH` |
| T-COM-1 | `contactCallGapH`, `travelCallGapH`, `travelCallPerH` |
| T-COM-4 | `travelCallPerH` |
| T-COM-5 | `sigCommunitySD`, `sigIdentitySD` |
| T-COM-6 | `drumHitsMedian`, `drumHitsSigma`, `drumIntervalMs` |
| T-COM-8 | `foodCallBase`, `foodCallCropW`, `foodCallMaleW`, `foodCallPartnerW` |
| T-DEM-5 | `epidemicArrivalPerY` |
| T-DEM-6 | `epidemicBetaPerH`, `epidemicFatality` |
| T-DEM-9 | `snareHazardPerKm` |
| T-DEM-18 | `bereaveHalfLifeD`, `bereaveMaxAgeY` |
| T-HUN-1 | `huntDayPerMale`, `huntGapH` |
| T-HUN-2 | `huntSuccessMax`, `huntSuccessRate` |
| T-HUN-3 | `huntEncounterProbBroken` |
| T-HUN-7 | `huntExtraKillP` |
| T-LET-1 | `gangImpulseP`, `gangKillInfantP`, `gangKillMaleMax`, `gangKillMalePerAttacker`, `gangKillOtherP`, `gangRollGapH`, `gangVictimGapH`, `infanticideKillP`, `infanticideNewAlphaP`, `infanticideStrangerP` |
| T-LET-3 | `gangMinOwnMales` |
| T-PAT-1 | `patrolEndH`, `patrolH0`, `patrolStartH` |
| T-PAT-3 | `patrolFemaleJoin`, `patrolFemaleStay`, `patrolLactatingJoin` |
| T-PAT-4 | `patrolMaleOddsRatio` |
| T-PAT-5 | `patrolMaxH` |
| T-PAT-6 | `patrolIncursionP` |
| T-PTY-1 | `joinSocialW`, `partyFollowBase`, `partyFollowHungerW`, `partyFollowMaleW`, `partyFollowW`, `partyStayW` |
| T-RNG-4 | `drinkDistScaleM`, `fallbackForageW`, `forageDistScaleM`, `fruitHungerFactor`, `fruitIntakePerH`, `fruitThirstFactor`, `joinCallDistScaleM`, `joinSocialW`, `memTravelHungerW`, `partyFollowBase`, `partyFollowHungerW`, `partyFollowMaleW`, `partyFollowW`, `partyStayW`, `walkMps` |

## Input entries (89)

- **physics · 3 world: measured value** (23): `diurnalEndH`, `diurnalShape`, `diurnalStartH`, `rainAprMm`, `rainAugMm`, `rainDecMm`, `rainFebMm`, `rainJanMm`, `rainJulMm`, `rainJunMm`, `rainMarMm`, `rainMayMm`, `rainNovMm`, `rainOctMm`, `rainSepMm`, `tempBaseC`, `tempCloudC`, `tempDiurnalC`, `tempNightCoolC`, `tempRainC`, `weatherAfternoonFactor`, `weatherMorningFactor`, `weatherNightFactor`
- **physiology · 4 reproductive physiology** (22): `amenorrheaMinY`, `amenorrheaSpanY`, `cycleFallEndDay`, `cycleLenMinDays`, `cycleLenSpanDays`, `cycleMaxDay`, `cycleMaxEndDay`, `cycleOvulationDay`, `cyclePeriovulatoryDay`, `cycleRiseDay`, `cycleTemplateDays`, `fecundityDeclineY`, `fecundityEndY`, `fecundityFullY`, `fecundityMax`, `fecundityStartY`, `firstSwellMinY`, `firstSwellSpanY`, `gestationMinDays`, `gestationSpanDays`, `weanAgeMinY`, `weanAgeSpanY`
- **sensory range · 4 sensory range** (17): `hearAlarmHooM`, `hearBarkM`, `hearCoughM`, `hearDrumM`, `hearFoodGruntM`, `hearLaughM`, `hearPantGruntM`, `hearPantHootM`, `hearScreamM`, `hearTravelHooM`, `hearWhimperM`, `preySightFactor`, `sightDayM`, `sightNightM`, `snakeVisualM`, `treeSightFactor`, `treeSightMaxM`
- **life history · 4 life table** (9): `hazardFemaleAdult` †, `hazardFemaleMid` †, `hazardFemaleSenescence` †, `hazardInfant` †, `hazardJuvenile` †, `hazardMalePrime` †, `hazardMaleSenescence` †, `hazardMaleYoungAdult` †, `hazardYoung` †
- **ecology · 3 world: measured value** (7): `colobusDensityPerKm2`, `cropFullExp`, `figFruitingShare`, `foodTreeDensityPerHa`, `speciesSynchrony`, `synthRipeMean`, `synthYearCv`
- **epidemiology · 3 world: measured value** (4): `epidemicIllDays`, `epidemicInfantOR`, `epidemicOldOR`, `epidemicR0`
- **physics · 4 locomotion** (2): `climbMps`, `runMps`
- **physiology · 4 measured physiology** (2): `lactTaperEndY`, `lactTaperStartY`
- **physiology · override** (1): `fallbackRateRatio`
- **ecology · override** (1): `patchesPerHa`
- **physics · override** (1): `travelDistScaleM` †

## Design entries (565)

- **weight or threshold · 8 default** (236): `adoptBondMin`, `adoptInfantAgeY`, `adoptMaxAgeY`, `allyCount`, `allyThreshold`, `approachTimeoutS`, `assocMinScans`, `attentionN`, `avoidBase`, `avoidRepairBondMin`, `avoidTensionFloor`, `avoidTensionW`, `begTensionW`, `bereaveStress`, `bodyChildBase`, `bodyChildGain`, `bondBaselineKin`, `bondBaselineOther`, `bondRelaxPerDay`, `callSuppressW`, `candidateJitterSpan`, `carryDeadMaxAgeY`, `carryDeadMinDays`, `carryDeadSpanDays`, `coalitionBondMin`, `coalitionChargeTensionW`, `coalitionTensionW`, `coerceMaxRepeats`, `coerceSwellingMin`, `condGood`, `condLow`, `condTauD`, `consoleBondMin`, `consoleRepair`, `consortBondMin`, `consortSwellingMin`, `contactCallBase`, `contactCallMaleW`, `contactCallMinDaylight`, `contactCallW`, `contactShareFrac`, `contactSlots`, `contestExponent`, `coreCostFemale`, `coreCostLactating`, `coreHungerRelief`, `crowdCompeteW`, `crowdHighRank`, `crowdHighRankFactor`, `crowdScarcityRef`, `dangerDeathW`, `dangerFleeW`, `dangerInjuryW`, `dangerScale`, `dangerTauDays`, `discrimDistW`, `discrimNoise0`, `discrimThreshold`, `dispersalMinAgeY`, `dispersalMinSwelling`, `drumJitter`, `drumSwing`, `eloKGreeting`, `eloLogisticScale`, `escalateEloGap`, `escalationEvenExp`, `fallbackCapH`, `fallbackMoveOnFrac`, `fallbackPatchExp`, `fallbackRegrowDays`, `familiarFullLevel`, `familiarityStart`, `familiarityYears`, `feedChargeHungerMin`, `feedTensionW`, `femaleDomMaxAgeY`, `femaleQueueTauDays`, `fertilityCondFloor`, `fightInjuryMin`, `fightInjurySpan`, `fissionMinAdults`, `fissionMonths`, `fissionOverlap`, `fissionQ`, `forageYieldMax`, `forageYieldMin`, `founderBuildJitter`, `founderBuildPerRank`, `founderBuildTop`, `fruitIntakeSkillBase`, `fruitIntakeSkillGain`, `fruitIntakeYoungFactor`, `fruitValueRef`, `gangEdgeFrac`, `groomCreditRetainPerH`, `groomFemaleNonKinOffset`, `groomTensionRepairPerH`, `groomTensionW`, `growEndY`, `growStrengthW`, `growTauY`, `grudgeAggrW`, `grudgeBase`, `grudgeHungerW`, `grudgeTensionFloor`, `grudgeTensionW`, `guardDeterW`, `guardFeedDeterW`, `guardSwellingMin`, `hazardHealthThreshold`, `hazardHealthWeight`, `hazardInjuryWeight`, `homeFarRadii`, `homeFarW`, `homeLevel`, `homeW`, `huntEncMinMales`, `huntJoinSkillW`, `huntMinMales`, `immigrantLikeSwelling`, `infanticideMaleMargin`, `infanticideMaxAgeY`, `infanticideNewAlphaDays`, `joinAllyW`, `joinBase`, `joinBondW`, `joinMaleW`, `joinRankW`, `joinSocialInPartyF`, `joinStayW`, `juvenileFollowMaxAgeY`, `lactTaperFloor`, `maleDriftTauDays`, `mateApproachS`, `matingAssocWeight`, `matingSaturation`, `meatHungerFactor`, `meatRepairGiver`, `meatRepairReceiver`, `nestMorningDaylightHigh`, `nestMorningDaylightLow`, `nestTreeDistW`, `nestTreeHashW`, `nestTreeHeightW`, `pantGruntMaleAgeY`, `partyFollowSocialW`, `partyStayMaxN`, `patrolContactW`, `patrolEdgeSpeed`, `patrolEnergyLow`, `patrolLeadBoldW`, `patrolLeadMaleW`, `patrolLeadScore`, `patrolLossW`, `patrolMaxHunger`, `patrolMaxRain`, `patrolMinMales`, `patrolReturnSpeed`, `patrolStaleTauDays`, `patrolStaleW`, `peripheryLevel`, `powerAllyWeight`, `powerEloScale`, `powerRankEdge`, `rainDisplayScore`, `reconcileBase`, `reconcileBondW`, `reconcileKinW`, `reconcileLoserW`, `reconcileRepairBase`, `reconcileRepairBond`, `reconcileRepairW`, `reconcileStressW`, `redirectAggrW`, `redirectBase`, `redirectStressW`, `redirectTensionW`, `revisitW`, `rgMinAge`, `riskMaleW`, `rivalEloGap`, `rivalTension`, `selfFeedStartY`, `seriousInjuryAdd`, `shareAllyW`, `shareBase`, `shareBondW`, `shareHungerW`, `shareKinW`, `sharePlantBase`, `sharePlantBondW`, `shareSwollenMin`, `shareSwollenW`, `shareTensionW`, `slotsForage`, `slotsMulti`, `snareEdgeBandFrac`, `snareIntakeLoss`, `snareInteriorRisk`, `snareSeverityMin`, `snareWound`, `statusTensionW`, `stressFloor`, `supportRepairHelped`, `supportRepairHelper`, `takeoverEloWindow`, `tensionGivenAttack`, `tensionGivenCoerce`, `tensionGivenDisplay`, `tensionGivenFeed`, `tensionGivenThreat`, `tensionHalfLifeDays`, `tensionRecvAttack`, `tensionRecvCoerce`, `tensionRecvDisplay`, `tensionRecvFeed`, `tensionRecvThreat`, `tensionWound`, `territoryCostA`, `territoryCostB`, `thirstHotC`, `thirstRainRelief`, `travelHooFollowW`, `udCoreLevel`, `udMinDaylight`, `udOuterLevel`, `udRangeLevel`, `udSeedDays`, `udTauDays`, `vacancyEloGap`, `waterSitesPerKm2`, `weanRefuseAgeY`, `weanRefuseRampY`, `woundHealPerDay`, `youngLeafAmp`, `youngLeafPeakDoy`
- **world · 3 world: design value** (105): `centerScale`, `chimpGridCellM`, `colobusDistM`, `colobusDurationH`, `colobusHuntDayH`, `colobusRadiusM`, `coughPerH`, `cropFallRate`, `cropFullMin`, `cropRiseRate`, `cropSkewExp`, `daylightHighDeg`, `daylightLowDeg`, `deadSlimDays`, `droughtCropFactor`, `droughtDurationH`, `droughtFigFactor`, `droughtFruitFactor`, `epidemicHealthDrop`, `epidemicRestW`, `epidemicVirulenceSd`, `episodeCap`, `episodeDays`, `eventCap`, `eventPriorityAlpha`, `eventPriorityBirth`, `eventPriorityDeath`, `eventPriorityInfanticide`, `eventPriorityInjury`, `eventPriorityIntergroup`, `eventPriorityRank`, `eventPriorityTransfer`, `figCycleDays`, `figEpisodeDays`, `figMastDurationH`, `figMastInterruptM`, `figMastLevel`, `figMastRadiusM`, `fordRadiusM`, `fordSpacingM`, `fruitCycleDays`, `fruitIndexAtMean`, `fruitLagDays`, `historyFacts`, `historyMaxChars`, `historyMaxLines`, `knownTreesK`, `layoutScale`, `mapSizeM`, `memKeepMonths`, `memLedgerEvents`, `memMonthEvents`, `memMonthPartners`, `memTravelHorizonH`, `memTreeCap`, `memTtlChimpH`, `memTtlPreyH`, `memTtlTreeH`, `memYearEvents`, `memYearPartners`, `memoryCap`, `memoryMonthDays`, `memoryTreeMinM`, `partyEveryTicks`, `patchRangeFactor`, `patchRecoverPerDay`, `patchesOutsidePerHa`, `playbackDistM`, `playbackDurationH`, `playbackRadiusM`, `popCap`, `preyMinGroups`, `preyMoveEveryTicks`, `rainMmPerH`, `removeAlphaEloSpread`, `removeAlphaUnstableH`, `removeAlphaVacancyH`, `ripeRampDays`, `salienceAttack`, `salienceConsole`, `salienceGroom`, `salienceMating`, `salienceMeat`, `salienceReconcile`, `salienceSupport`, `salienceThreat`, `siteLatDeg`, `siteLonDeg`, `siteTzH`, `slowEveryTicks`, `snakeAwareM`, `snakeDistM`, `snakeDurationH`, `snakeRadiusM`, `startDoy`, `startHour`, `stormDurationH`, `stormIntensity`, `streamHalfWidthM`, `streamPointSpacingM`, `synthSeasonAmp`, `synthSpeciesYearCv`, `synthYears`, `tickSeconds`, `treeGridCellM`
- **duration · 8 default** (96): `assocEveryMin`, `asyncGraceMin`, `boutAlarmMax`, `boutAlarmMin`, `boutAttackMax`, `boutAttackMin`, `boutBegMax`, `boutBegMin`, `boutCallMax`, `boutCallMin`, `boutChargeMax`, `boutChargeMin`, `boutClimbMax`, `boutClimbMin`, `boutConsoleMax`, `boutConsoleMin`, `boutConsortMax`, `boutConsortMin`, `boutDeadMax`, `boutDeadMin`, `boutDisplayMax`, `boutDisplayMin`, `boutDrinkMax`, `boutDrinkMin`, `boutFleeMax`, `boutFleeMin`, `boutFollowMax`, `boutFollowMin`, `boutForageMax`, `boutForageMin`, `boutGroomMax`, `boutGroomMin`, `boutGuardMax`, `boutGuardMin`, `boutHuntMax`, `boutHuntMin`, `boutMateMax`, `boutMateMin`, `boutNestDayMax`, `boutNestDayMin`, `boutNestMax`, `boutNestMin`, `boutNurseMax`, `boutNurseMin`, `boutPantGruntMax`, `boutPantGruntMin`, `boutPatrolMax`, `boutPatrolMin`, `boutPlayMax`, `boutPlayMin`, `boutReconcileMax`, `boutReconcileMin`, `boutRestMax`, `boutRestMin`, `boutShareMax`, `boutShareMin`, `boutShelterMax`, `boutShelterMin`, `boutSubmitMax`, `boutSubmitMin`, `boutTransferMax`, `boutTransferMin`, `boutTravelMax`, `boutTravelMin`, `callAlarmHooMin`, `callBarkMin`, `callCoughMin`, `callDrumMin`, `callFoodGruntMin`, `callLaughMin`, `callPantGruntMin`, `callPantHootMin`, `callScreamMin`, `callTravelHooMin`, `callWhimperMin`, `coalitionWindowH`, `consoleWindowH`, `feedMaxMin`, `huntDayDurationH`, `huntResolveMinMin`, `huntResolveSpanMin`, `impulseDurationH`, `instabilityH`, `interruptSpacingMin`, `nestBuildMinS`, `nestBuildSpanS`, `partyWaitMaxMin`, `patrolHeardWindowH`, `patrolRollMaxH`, `patrolStopMaxMin`, `patrolStopMinMin`, `reconcileWindowH`, `redirectWindowH`, `revisitTauH`, `strangerCallerWindowH`, `travelHooWindowMin`
- **distance · 8 default** (91): `alarmSnakeLinkM`, `allyNearM`, `approachStopM`, `assocHistCellM`, `avoidCloseM`, `avoidDoneM`, `avoidRangeM`, `bankLookaheadM`, `begDistScaleM`, `begMeatRangeM`, `begPlantRangeM`, `chargeGiveUpM`, `chargeRangeM`, `chaseOffM`, `coalitionChargeRangeM`, `coalitionRangeM`, `coalitionRangeStrangerM`, `coerceRangeM`, `consoleDistScaleM`, `consoleRangeM`, `consortWaitM`, `defendAggressorNearM`, `defendRangeM`, `displayAlertM`, `displayNearM`, `displayRunM`, `encounterPartyMarginM`, `escalateAttackRangeM`, `escalateDistM`, `feedChargeRangeM`, `femaleDomRangeM`, `fightBackRangeM`, `fleeStepM`, `followMotherDistScaleM`, `forageCellM`, `gangMaxDistM`, `groomDistScaleM`, `groomRangeM`, `grudgeRangeM`, `guardChaseRangeM`, `guardRivalRangeM`, `guardedRangeM`, `heardResponseRangeM`, `hitRangeM`, `huntAlertM`, `huntCaptureRangeM`, `huntDistScaleM`, `huntEarshotM`, `immigrantChargeRangeM`, `immigrantFollowMaxM`, `immigrantFollowMinM`, `infanticideAttackRangeM`, `isolatedStrangerM`, `joinCallMinM`, `joinCallStopM`, `juvenileFollowM`, `juvenileFollowScaleM`, `mateDistScaleM`, `mateFemaleDistScaleM`, `mateFemaleRangeM`, `mateNearM`, `mateRangeM`, `meatAlertM`, `nestClusterJitterM`, `nestTreeMinHeightM`, `nestTreeRadiusM`, `nurseRangeM`, `pantGruntDistScaleM`, `pantGruntRangeM`, `partyFollowMinM`, `partyLinkM`, `patrolAlertM`, `patrolFollowM`, `patrolWaypointM`, `playAdultDistScaleM`, `playDistScaleM`, `playRangeM`, `rangeRadiusEastM`, `rangeRadiusNorthM`, `rangeRadiusWestM`, `reconcileRangeM`, `redirectRangeM`, `shareRangeM`, `snakeAlarmRangeM`, `snakeFleeM`, `strangerCloseScaleM`, `supporterNearM`, `threatResponseRangeM`, `treeValueDistScaleM`, `udCellM`, `udKernelM`
- **switch · 1 switch** (30): `birthCondFromMother`, `callSignatures`, `callerDiscrim`, `departCue`, `fissionOn`, `followCommit`, `foodCallRule`, `huntEncounter`, `intakeCropOnly`, `intakeValue`, `joinChoice`, `lactTaper`, `maternalLevers`, `memCropBelief`, `partyJoinTrip`, `partyLeaderFollow`, `patchEcology`, `patrolContactMemory`, `patrolEnergyGate`, `patrolImpulseDecides`, `patrolSilence`, `patrolSingleFile`, `phenologyForcing`, `rgOn`, `routeChain`, `streamAnalytic`, `travelCommit`, `travelHoo`, `tripRateValue`, `udKernelRef`
- **bookkeeping · override** (2): `contactSeenGapH`, `encounterGapH`
- **method · override** (1): `eloK`
- **world · override** (1): `hazardBaseFloor`
- **geometry · override** (1): `patrolFileGapM`
- **ecology · override** (1): `preyRespawnH`
- **environment · override** (1): `snareDeathP`
