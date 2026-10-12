# Stage R14 diagnosis: where the short nights of stage R13's model arm come from

A reading of finished runs, made on 12 October 2026 between 15:28 and 16:24 EDT on branch `r14-diag-nights`.
**It is a description.** It registers nothing, ran no model, changed nothing under `src`, `server`, `training`,
`data` or `tests/fixtures`, and proposes no setting chosen to reach a behavioural rate or a field number (§9 lists
candidates, each with what would refute it). Field numbers enter nothing.

What was read: stage R13's population run on seed 3613 (`bench-r13/artifacts/r13`: the model arm, the paired rules
arm, the card), stage R11's ten-animal loop arms and its training and held-out files (worktree `r11-honest-retrain`).
**Every number of the model arm is a "rules-taught model on a rules menu"**: a model taught the rules' own odds
(stage R11's first adapter on packet 5), choosing on the rules' menu with the loop's gate on, one seeded draw from
its odds per ask.

Every number below is printed by `scripts/r14-nights.ts` (with `scripts/lib/r14-trace.ts` and
`scripts/lib/r14-nights.ts`); the command is named at each table, and §11 lists them in order. Tables are pasted as
printed. Animal names and numbers are the simulation's own.

Words used here. **Dark**: the card's rule, daylight at or under 0.03 (about 19:06 to 06:18 in this window, 672
minutes). **In a nest**: in a finished nest. **A short night**: under 0.9 of the dark ticks in a nest, so 67.2 dark
minutes or more out of one. **Dusk**: the light phase before the dark (from about 18:01). **Late dusk**: from 18:45
to the dark, a reading aid only. **The sleep latch**: the simulation's own switch between awake and asleep
(`src/sim/circadian.ts`); in this window it closes at about 19:52 and opens at about 05:35 (§2).

## 0. The answer

1. **The figure reproduces.** 739 of 760 animal-nights in a nest in the model arm (0.972) and 760 of 760 in the
   paired rules arm, from the card's arm files and again from the runs' own rows.
2. **Every short night is the same event: an evening stretch out of the nest that runs into the dark.** In 20 of
   the 21 the animal was in a finished nest at dusk, left it (16 of the 20 in the last twenty minutes of light),
   fed, and was in a nest again 24 to 212 dark minutes later. In the other one the first nest was not finished
   until 164 minutes after dark. There is no night without a nest, no nest begun and given up, and no nest left in
   the middle of the night (one leave in the evening dark in 760 animal-nights, 14 minutes).
3. **Eight of the 21 are short only because the rules' own early rise is added on top.** The rules themselves
   leave the nest in the dark, about 40 minutes before first light, on 224 of 760 animal-nights (the model arm:
   172), about 40 dark minutes each time and never a short night by itself. 13 of the 21 nights are short by the
   evening alone; 8 are an evening of 24 to 49 dark minutes plus that early rise.
4. **The model does not leave the nest option more often than the rules do. It leaves it at the wrong asks.** Over
   the 3,771 asks at dusk or in the dark with a nest on the menu, the model's odds on the nest average 0.848 and
   595 draws left it: 15.8 per 100. The rules' own odds at those same asks (stage R11's label machinery, run at
   each ask) average 0.846: 15.4 per 100. On the paired world the rules left the nest option at 15.3 per 100 of
   their own draws. The difference is where:
   - **In a finished nest in late dusk** the rules put 0.999 on the nest (0.99 or more at 0.995 of asks); the
     model puts 0.964 (0.99 or more at 0.678 of asks). There are 1.34 such asks per animal-night. The model's draw
     left the nest at 38 of 1,020 (3.7 per 100); the rules at 2 of 1,048 of their own draws.
   - **Once out of a nest in the dark** the rules put 0.95 on a nest before the sleep latch and 1.00 after it;
     the model puts 0.65 and 0.47, and its draw fails to take the nest at 39 and 61 asks of 100. So a leave is
     not undone at the next ask: the 38 late-dusk leaves cost 1,702 dark minutes, 9 of them a tenth of the dark
     alone.
   - **Where the rules themselves are unsure** (waking in the dark: 0.68 on the nest) the model stays more than
     they do (0.77), which is why the two arms spend the same share of the dark in a nest.
5. **At the 20 asks that began the short nights' evening stretches** the rules' own odds on the nest are 1.000 at
   18 and the model's run from 0.35 to 0.97 (mean 0.641). The model's top pick was the nest at 19 of the 20: the
   draw took what a top pick would not have. While those animals were out, the model's odds on a nest averaged
   0.52 against the rules' 0.95; the top pick was the nest at 45 of those 70 asks and the rules' top option at
   66.
6. **Rules worlds hold almost no example of the state that makes a stretch long.** Of the 3,420 training and
   development draws of the adapter, 1 is out of the nest act in the dark of the evening, and none after 19:54.
   On the paired rules world the rules drew 17 times in that state before the latch and never after it.
7. **It is everyone, it does not compound, and it does not grow.** 15 of 38 animals, both sexes, every class and
   community, in the numbers equal risk would give; 10 short nights in days 1 to 10 and 11 in days 11 to 20; of
   the 111 leaves of a finished nest at dusk, 4 were opened by another animal moving off or calling, and none of
   the 27 costly ones. No animal asleep in its nest was asked anything in 760 animal-nights.
8. **Ten animals showed the same thing at the same rate; 50 nights could not see it.** At ten animals the same
   asks come as often (1.49 late-dusk asks in the nest act per animal-night against 1.35), with the same odds
   (0.966 against 0.964), and a draw left the nest at 2.2 per 100 against 3.7 (Fisher's exact test p = 0.32). The
   recipe's three draw arms lost 2 nights of 150; at the population's rate (2.76%) an arm of 50 nights shows no
   short night one time in four, and all three arms keep stage R11's line of 49 of 50 one time in five.
9. **An animal in a nest is asked at dusk and at waking, never in between.** Per animal-night in a finished nest:
   2.6 asks at dusk, 0.03 in the dark before the latch, none while the latch is on, 1.01 at waking. The rules get
   the same number of fresh draws there (2.7, 0.03, none, 1.01).

Confidence. Items 1 to 3, 7 and 9 are counts of the run and exact. Items 4 to 6 rest on stage R11's label
machinery, which reproduces the rules' own behaviour on the rules arm to within 0.02 (§5); they are firm for this
adapter on this world. Item 8 is a statement about what 50 or 150 nights can show; it does not prove the two units
are the same, only that nothing found here tells them apart. One world seed, one training of the recipe.

## 1. The registered figure again

`scripts/r14-nights.ts figure`

| Arm | From the card's arm file: nights in a nest | animal-nights | short | From the run's own rows: in a nest, of animal-nights | share |
| --- | --- | --- | --- | --- | --- |
| the model arm (rules-taught model on a rules menu) | 0.972 | 760 | 21 | 739 of 760 | 0.9724 |
| the paired rules arm | 1.000 | 760 | 0 | 760 of 760 | 1.0000 |

The card's rule is `scripts/lib/timing-card.ts` `cardSummary`: per animal the share of its nights with at least
0.9 of the dark ticks in a finished nest, then the mean over animals. With 38 animals and 20 nights each that is
the pooled share.

The 21 short animal-nights by animal, sex, class, age and day are the first table of the appendix (§12). How far a
night falls, in both arms:

| Dark minutes out of a nest | the model arm: animal-nights | the paired rules arm: animal-nights |
| --- | --- | --- |
| none | 559 | 523 |
| over 0 to under 15 | 18 | 18 |
| 15 to under 30 | 10 | 14 |
| 30 to under 45 | 91 | 180 |
| 45 to under 60 | 57 | 25 |
| 60 to under 67.2 | 4 | 0 |
| 67.2 to under 90 | 7 | 0 |
| 90 to under 120 | 6 | 0 |
| 120 to under 180 | 7 | 0 |
| 180 and over | 1 | 0 |

Mean dark minutes out of a nest per animal-night: the model arm 12.5, the rules arm 11.9; the largest: 211.8 and 58.7. A night falls short from 67.2 dark minutes out of a nest (a tenth of about 672).

The rules arm is not a clean zero under the line: 205 of its 760 animal-nights lose 30 to 60 dark minutes. That is
the early rise of §2, and it matters for how the model arm's nights go short.

## 2. What a short night is

`scripts/r14-nights.ts trace model`, `trace rules`, then `classify`. Each arm is replayed from its start world
through its own receipts with no model, every tick of the 38 animals is read, and the replay must land on all 20
day hashes with no receipt line and no row file differing (it does, in both arms).

Check against the rows: the model arm 21 short nights and 9526 dark minutes out of a nest in all (the rows: 21 and 9526); the rules arm 0 and 9081 (the rows: 0 and 9081).

The sleep latch (src/sim/circadian.ts) in the model arm closes 760 times, between 19:42 and 20:03 (median 19:52), and opens between 05:24 and 06:42 (median 05:35); in the rules arm it closes 760 times, between 19:40 and 20:03 (median 19:54), and opens between 05:23 and 05:47 (median 05:37).

| Kind of stretch | the model arm: stretches | dark minutes in all | mean | longest | the rules arm: stretches | dark minutes in all | mean | longest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| left a finished nest at dusk, back in a nest after dark | 56 | 2262 | 40.4 | 211.8 | 21 | 223 | 10.6 | 29.3 |
| no nest before dark: the first one finished after dark | 7 | 234 | 33.5 | 164.3 | 4 | 27 | 6.8 | 14.0 |
| left a finished nest in the dark of the evening and came back | 1 | 14 | 14.3 | 14.3 | 0 | 0 | none | none |
| left a finished nest in the evening and stayed out till light | 0 | 0 | none | none | 0 | 0 | none | none |
| left the nest in the dark before first light | 175 | 7016 | 40.1 | 53.0 | 226 | 8831 | 39.1 | 55.5 |
| in no nest all night | 0 | 0 | none | none | 0 | 0 | none | none |
| all | 239 | 9526 | | | 251 | 9081 | | |

Nests begun and given up before they were finished, inside those stretches: the model arm 0, the rules arm 0. Animal-nights with a finished nest at no dark tick: 0 and 0.

So the question's four classes come out as: **a nest left at dusk** and found again after dark (the model arm's
own; 56 stretches, 2,262 dark minutes, against 21 and 223 in the rules arm); **a first nest begun late** (7
stretches, of which one is long); **a nest left during the night**: one, in the evening dark, for 14 minutes;
**a night with no nest** and **a nest never finished**: none. The largest block of dark out of a nest in either
arm is something else, which both arms do: the nest left in the dark before first light.

| | the model arm | the rules arm |
| --- | --- | --- |
| animal-nights | 760 | 760 |
| with dark minutes out of a nest before the morning (evening or mid-night) | 64 | 25 |
| ... of 23 dark minutes or more | 29 | 2 |
| ... of a tenth of the dark or more (short by the evening alone) | 13 | 0 |
| with an early rise (out of the nest in the dark before first light) | 172 | 224 |
| with both | 35 | 12 |
| short | 21 | 0 |
| dark minutes out of a nest before the morning, in all | 2510 | 250 |
| dark minutes of early rises, in all (mean per early rise) | 7016 (40.8) | 8831 (39.4) |
| the longest early rise, dark minutes | 53.0 | 55.5 |

Of the 21 short nights of the model arm: 13 are short by the evening alone; 8 need the evening and the early rise together (neither is a tenth of the dark); 0 have no evening part. The evening part runs from 24.3 to 211.8 dark minutes over the 21; in the 8 that need both, from 24.3 to 48.8, with an early rise of 42.5 to 51.3. With the early rises left out (every dark minute of the morning counted as in a nest) 13 nights of the model arm and 0 of the rules arm would be short; with the evenings left out, 0 and 0.

The registered description "the share of the dark hours in a nest is the rules'" (0.981 against 0.982) hides two
differences of opposite sign: the model arm is out 2,510 dark minutes before the morning where the rules arm is
out 250, and it rises early on 172 nights where the rules arm does on 224 (7,016 against 8,831 dark minutes).

How the evening stretches start, in both arms:

| When it left | Arm | Leaves | Back in a nest before dark | Minutes away: median | 9 in 10 under | longest | Dark minutes away: in all | mean | Leaves with 23 dark minutes or more | with a tenth of the dark or more | First act (leaves) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| at dusk, before 18:45 | model | 73 | 46 | 34.0 | 49.5 | 183.5 | 560 | 7.7 | 5 | 3 | forage 38, travel 28, guard 2, submit 2, charge 1, groom 1, pant-grunt 1 |
| at dusk, before 18:45 | rules | 104 | 84 | 34.5 | 52.3 | 75.0 | 197 | 1.9 | 1 | 0 | travel 51, forage 51, nest 1, guard 1 |
| at dusk, from 18:45 to dark | model | 38 | 9 | 43.8 | 153.0 | 221.0 | 1702 | 44.8 | 22 | 9 | forage 19, travel 19 |
| at dusk, from 18:45 to dark | rules | 2 | 1 | 42.0 | 42.0 | 42.0 | 26 | 12.9 | 1 | 0 | travel 1, forage 1 |
| in the dark | model | 1 | 0 | 14.3 | 14.3 | 14.3 | 14 | 14.3 | 0 | 0 | travel 1 |
| in the dark | rules | 0 | 0 | none | none | none | 0 | none | 0 | 0 |  |

Both arms leave a finished nest at dusk about as often (111 leaves against 106) and stay away about as long at
the median (34 and 44 minutes against 35 and 42). What differs is the clock. The rules leave early in dusk and
are back before dark (84 of 104); they left in late dusk twice in 20 days. The model arm left in late dusk 38
times, 29 of them ran into the dark, and its long tail (9 in 10 under 153 minutes, the longest 221) has no
counterpart.

## 3. The asks behind the short nights

`scripts/r14-nights.ts asks` and `nights` (the per-night tables are in the appendix, §12: for every short night
the clock, the reason line, the menu with the model's odds on every option, the option drawn, the top pick, the
rules' top option and the rules' own odds on the nest).

At the evening leaves of a finished nest in the short nights (20 asks; 16 in late dusk, 4 earlier in dusk, 0 in the dark): the model's odds on the nest are mean 0.641, median 0.680, from 0.349 to 0.972; 1 at 0.9 or more; the top pick was the nest at 19; the rules' top option on that menu was the nest at 18; the gate had opened on need-bucket 18, period 1, ended 1.

At the waking asks at which the nest was left before first light in the short nights (17 asks; 0 in late dusk, 0 earlier in dusk, 17 in the dark): the model's odds on the nest are mean 0.263, median 0.298, from 0.046 to 0.552; 0 at 0.9 or more; the top pick was the nest at 5; the rules' top option on that menu was the nest at 0; the gate had opened on need-bucket 15, light 2.

While out after leaving a finished nest in the evening (the short nights; from the leave to the next finished nest): 63 asks, 63 with a nest on the menu (0 without one). At those 63: odds on the nest mean 0.515, median 0.517; the draw took the nest at 20; the top pick was the nest at 41; the rules' top option was the nest at 59; the draw carried on the act in progress (the option applied last) at 16.

Before a late first nest (the short nights; from 66 minutes before dark to the nest): 7 asks, 7 with a nest on the menu (0 without one). At those 7: odds on the nest mean 0.603, median 0.597; the draw took the nest at 1; the top pick was the nest at 4; the rules' top option was the nest at 7; the draw carried on the act in progress (the option applied last) at 3.

Both together: 70 asks with a nest on the menu; the top pick was the nest at 45; the rules' top option was the nest at 66.

In words. The leaving ask is an ordinary one: the nest's bout ended and the gate opened because a need had moved
into another bucket (18 of 20). The menu is short (feeding in a crown near by, a trip to another, the nest). The
model's top pick is the nest at 19 of the 20, but with 0.35 to 0.97 on it, and the draw takes the feeding or the
trip. From then on the animal is out of a nest in the dark, the gate holds what it is doing for up to half an hour
at a time, and at each of the few asks it gets (70 in the 21 nights) the model puts about half on a nest. The
waking asks are another matter: at all 17 the rules' own top option was to leave (to drink, mostly), and the
model's draw did what the rules would have done.

Every evening leave of a finished nest in the model arm, not only those of the short nights (`asks`):

| When it left | Leaves | with an ask at that tick | odds on the nest at it: mean | median | the top pick was the nest | the rules' top option was the nest | Leaves that ran into the dark | their dark minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| at dusk, before 18:45 | 73 | 72 | 0.567 | 0.521 | 51 | 45 | 27 | 560 |
| at dusk, from 18:45 to dark | 38 | 38 | 0.662 | 0.687 | 36 | 38 | 29 | 1702 |

## 4. The model's odds on the nest, against every ask of dusk and night

`scripts/r14-nights.ts asks`. 48,034 asks in the run; 4,074 fall at dusk or in the dark; 3,771 of those have a nest
on the menu. The rules arm's columns are the rules' own decisions on the paired world, read by a tap in its replay.

| Situation | In a finished nest | the model arm: asks | with a nest on the menu | odds on the nest: mean | median | 1 in 10 under | share at 0.99 or more | at 0.9 or more | under 0.5 | a draw left it, per 100 | the top pick was not the nest, per 100 | the rules' top option on that menu was not the nest, per 100 | the rules arm: fresh draws | with a nest on the menu | did not take the nest, per 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dusk, before 18:45 | yes | 961 | 960 | 0.927 | 0.991 | 0.728 | 0.506 | 0.849 | 0.050 | 71 (7.4) | 29 (3.0) | 76 (7.9) | 1017 | 1013 | 84 (8.3) |
| dusk, from 18:45 to dark | yes | 1020 | 1020 | 0.964 | 0.995 | 0.922 | 0.678 | 0.914 | 0.014 | 38 (3.7) | 3 (0.3) | 1 (0.1) | 1048 | 1048 | 2 (0.2) |
| dark, evening, before its sleep latch | yes | 22 | 22 | 0.988 | 0.999 | 0.977 | 0.727 | 0.955 | 0.000 | 1 (4.5) | 0 (0.0) | 0 (0.0) | 24 | 24 | 0 (0.0) |
| dark, evening, its sleep latch on | yes | 0 | 0 | no value | no value | no value | no value | no value | no value | 0 (none) | 0 (none) | 0 (none) | 0 | 0 | 0 (none) |
| dark, morning, before first light | yes | 767 | 767 | 0.772 | 0.913 | 0.205 | 0.029 | 0.546 | 0.186 | 175 (22.8) | 129 (16.8) | 244 (31.8) | 767 | 767 | 226 (29.5) |
| dusk, before 18:45 | no | 853 | 817 | 0.729 | 0.831 | 0.311 | 0.011 | 0.362 | 0.197 | 236 (28.9) | 110 (13.5) | 227 (27.8) | 872 | 848 | 221 (26.1) |
| dusk, from 18:45 to dark | no | 54 | 54 | 0.791 | 0.893 | 0.437 | 0.037 | 0.463 | 0.148 | 10 (18.5) | 4 (7.4) | 5 (9.3) | 47 | 46 | 1 (2.2) |
| dark, evening, before its sleep latch | no | 67 | 67 | 0.653 | 0.700 | 0.284 | 0.000 | 0.209 | 0.239 | 26 (38.8) | 14 (20.9) | 3 (4.5) | 17 | 17 | 0 (0.0) |
| dark, evening, its sleep latch on | no | 38 | 38 | 0.472 | 0.435 | 0.082 | 0.000 | 0.026 | 0.553 | 23 (60.5) | 17 (44.7) | 0 (0.0) | 0 | 0 | 0 (none) |
| dark, morning, before first light | no | 292 | 26 | 0.363 | 0.270 | 0.056 | 0.000 | 0.038 | 0.692 | 15 (57.7) | 16 (61.5) | 23 (88.5) | 467 | 76 | 55 (72.4) |
| all of dusk and the dark | yes | 2770 | 2769 | 0.898 | 0.985 | 0.650 | 0.439 | 0.790 | 0.074 | 285 (10.3) | 161 (5.8) | 321 (11.6) | 2856 | 2852 | 312 (10.9) |
| all of dusk and the dark | no | 1304 | 1002 | 0.708 | 0.806 | 0.265 | 0.011 | 0.336 | 0.224 | 310 (30.9) | 161 (16.1) | 258 (25.7) | 1403 | 987 | 277 (28.1) |
| all of dusk and the dark | either | 4074 | 3771 | 0.848 | 0.963 | 0.446 | 0.325 | 0.669 | 0.114 | 595 (15.8) | 322 (8.5) | 579 (15.4) | 4259 | 3839 | 589 (15.3) |

The distribution over all 3771 such asks: the odds on the nest are 0.99 or more at 1227, 0.9 to 0.99 at 1297, 0.7 to 0.9 at 547, 0.5 to 0.7 at 271, 0.3 to 0.5 at 199 and under 0.3 at 230. The sum of (1 less the odds on the nest) over them is 574: what one draw an ask is expected to take away from the nest option; 595 draws did.

Read by row:

- **In a nest before 18:45** the two arms leave at the same rate (7.4 and 8.3 per 100). These leaves are the
  rules' own behaviour, and most end before dark.
- **In a nest from 18:45** the rules stop leaving (0.2 per 100) and the model does not (3.7 per 100).
- **At waking, before first light**, the rules leave more than the model (29.5 against 22.8 per 100).
- **Out of a nest in the dark of the evening** the rules always went to a nest (17 of 17 draws) and the model's
  draw does not at 38.8 per 100 before the latch and 60.5 per 100 after it. After the latch the rules arm has no draw at
  all: no animal of the rules arm is out of a nest then.

By the clock, in a finished nest:

| Clock | the model arm: asks in a nest | the gate held the nest without asking | odds on the nest, mean | a draw left the nest, per 100 | the top pick was not the nest | the rules arm: fresh draws in a nest | the gate kept the nest | the rules left the nest, per 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 17:30 to 18:00 | 14 | 53 | 0.974 | 0 (0.0) | 0 | 11 | 27 | 7 (63.6) |
| 18:00 to 18:15 | 283 | 450 | 0.932 | 21 (7.4) | 9 | 311 | 435 | 49 (15.8) |
| 18:15 to 18:30 | 207 | 1150 | 0.896 | 24 (11.6) | 9 | 288 | 1084 | 29 (10.1) |
| 18:30 to 18:45 | 473 | 1038 | 0.937 | 27 (5.7) | 12 | 424 | 1102 | 14 (3.3) |
| 18:45 to 18:54 | 374 | 595 | 0.961 | 15 (4.0) | 2 | 337 | 636 | 2 (0.6) |
| 18:54 to 19:07 | 660 | 529 | 0.967 | 23 (3.5) | 1 | 724 | 515 | 0 (0.0) |
| 19:07 to 19:54 | 8 | 1 | 0.978 | 1 (12.5) | 0 | 11 | 0 | 0 (0.0) |

And where the 38 late-dusk leaves fall among the model's own odds (they are draws, so they fall where the odds
allow them):

| The model's odds on the nest | Asks (18:45 to dark, in a finished nest) | share of them | a draw left the nest | the sum of (1 less the odds): leaves a draw is expected to make | the rules' top option was not the nest |
| --- | --- | --- | --- | --- | --- |
| 0.99 or more | 692 | 0.678 | 0 | 2.2 | 0 |
| 0.9 to under 0.99 | 240 | 0.235 | 4 | 7.3 | 1 |
| 0.7 to under 0.9 | 51 | 0.050 | 13 | 9.6 | 0 |
| 0.5 to under 0.7 | 23 | 0.023 | 12 | 8.9 | 0 |
| under 0.5 | 14 | 0.014 | 9 | 8.2 | 0 |
| all | 1020 | 1.000 | 38 | 36.3 | 1 |

A third of the late-dusk asks (0.322) carry less than 0.99 on the nest, and 8.6% carry less than 0.9; those 88
asks account for 34 of the 38 leaves.

Was it hunger? No (`scripts/r14-nights.ts state`, from the saved context of each ask):

| Hunger | Asks | the model's odds on the nest: mean | under 0.9, share | a draw left the nest, per 100 | the rules' margin for the nest: mean | smallest | asks with a margin over 0.24 | the rules' top option was not the nest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| none (under 0.4) | 182 | 0.977 | 0.066 | 6 (3.3) | 1.26 | -0.21 | 181 | 1 |
| mild (0.4 to 0.55) | 315 | 0.955 | 0.108 | 12 (3.8) | 1.17 | 0.10 | 312 | 0 |
| moderate (0.55 to 0.7) | 412 | 0.968 | 0.075 | 16 (3.9) | 1.20 | 0.07 | 404 | 0 |
| strong (0.7 to 0.88) | 90 | 0.950 | 0.122 | 4 (4.4) | 1.14 | 0.23 | 89 | 0 |
| severe (0.88 and over) | 21 | 0.981 | 0.000 | 0 (0.0) | 0.85 | 0.26 | 21 | 0 |
| all | 1020 | 0.964 | 0.086 | 38 (3.7) | 1.19 | -0.21 | 1007 | 1 |

At the 38 late-dusk asks at which the draw left the nest: hunger mean 0.51 (all late-dusk asks: 0.51); the rules' margin for the nest mean 0.64, smallest 0.07; the option drawn: forage 19, travel 19.

Rank correlation of the model's odds on the nest over the 1020 late-dusk asks: with hunger -0.11; with thirst -0.12; with felt sleepiness 0.12; with the rules' margin for the nest 0.49; with the number of options 0.15.

The leaves come at every level of hunger at about the same rate, and the animals of the two arms are equally
hungry as the light goes (hunger 0.270 and 0.270 when dusk begins; 0.542 and 0.531 when the dark falls). At 1,007
of the 1,020 asks the rules score the nest more than 0.24 above every other option, beyond what their own
evaluation noise can turn. The model's odds do follow that margin (rank correlation 0.49), but not far enough.

## 5. The rules' own odds at those asks

`scripts/r14-nights.ts odds model`, then `odds-report`. Stage R11's label is the rules' choice with its noise
averaged out: every candidate's jitter redrawn through the simulation's own menu code, a belief draw for each
option that carries one, the rules' own rule applied, and the share of each option among the redraws that offer the
same menu (`scripts/r11-contexts.ts` `labelData`; the registered rule of at least 2,000 redraws, on until 500 offer
the same menu or 20,000 are made). It is what the adapter was taught to answer. Here it is computed inside the
replay at the moment of each ask, on the world as the model was asked, for every one of the 3,771 asks (not a
sample): 16.4 million redraws in 17 minutes, and the replay still lands on all 20 day hashes, so computing it
moved nothing.

| Situation | In a finished nest | Asks with a label | the rules' odds on the nest: mean | share at 0.99 or more | at 0.9 or more | under 0.5 | the model's odds on the nest: mean | share at 0.99 or more | at 0.9 or more | under 0.5 | the model less the rules, mean | a draw from the rules' odds leaves the nest, per 100 | a draw from the model's, per 100 | the model's draw did, per 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dusk, before 18:45 | yes | 957 | 0.922 | 0.863 | 0.885 | 0.073 | 0.927 | 0.507 | 0.848 | 0.050 | 0.005 | 7.8 | 7.3 | 7.4 |
| dusk, from 18:45 to dark | yes | 1018 | 0.999 | 0.995 | 0.998 | 0.001 | 0.964 | 0.678 | 0.914 | 0.014 | -0.034 | 0.1 | 3.6 | 3.7 |
| dark, evening, before its sleep latch | yes | 22 | 1.000 | 1.000 | 1.000 | 0.000 | 0.988 | 0.727 | 0.955 | 0.000 | -0.012 | 0.0 | 1.2 | 4.5 |
| dark, morning, before first light | yes | 747 | 0.677 | 0.568 | 0.608 | 0.316 | 0.769 | 0.029 | 0.541 | 0.189 | 0.093 | 32.3 | 23.1 | 22.9 |
| dusk, before 18:45 | no | 816 | 0.719 | 0.565 | 0.620 | 0.279 | 0.728 | 0.011 | 0.362 | 0.197 | 0.009 | 28.1 | 27.2 | 28.9 |
| dusk, from 18:45 to dark | no | 54 | 0.922 | 0.870 | 0.889 | 0.093 | 0.791 | 0.037 | 0.463 | 0.148 | -0.131 | 7.8 | 20.9 | 18.5 |
| dark, evening, before its sleep latch | no | 67 | 0.951 | 0.881 | 0.955 | 0.045 | 0.653 | 0.000 | 0.209 | 0.239 | -0.297 | 4.9 | 34.7 | 38.8 |
| dark, evening, its sleep latch on | no | 38 | 1.000 | 1.000 | 1.000 | 0.000 | 0.472 | 0.000 | 0.026 | 0.553 | -0.528 | 0.0 | 52.8 | 60.5 |
| dark, morning, before first light | no | 26 | 0.178 | 0.000 | 0.000 | 0.731 | 0.363 | 0.000 | 0.038 | 0.692 | 0.185 | 82.2 | 63.7 | 57.7 |
| all of dusk and the dark | either | 3745 | 0.846 | 0.772 | 0.800 | 0.150 | 0.847 | 0.327 | 0.668 | 0.114 | 0.001 | 15.4 | 15.3 | 15.8 |

Where the rules put 0.99 or more on the nest (2890 of 3745 asks): the model's odds on it are mean 0.913, 0.9 or more at 0.787, under 0.5 at 0.047; the model's draw left the nest at 257 of them (8.9 per 100). By situation: dusk, before 18:45, in a nest: 826 asks, the model 0.959, draws that left it 32; dusk, from 18:45 to dark, in a nest: 1013 asks, the model 0.965, draws that left it 37; dark, evening, before its sleep latch, in a nest: 22 asks, the model 0.988, draws that left it 1; dark, morning, before first light, in a nest: 424 asks, the model 0.866, draws that left it 54; dusk, before 18:45, out of a nest: 461 asks, the model 0.828, draws that left it 80; dusk, from 18:45 to dark, out of a nest: 47 asks, the model 0.821, draws that left it 9; dark, evening, before its sleep latch, out of a nest: 59 asks, the model 0.689, draws that left it 21; dark, evening, its sleep latch on, out of a nest: 38 asks, the model 0.472, draws that left it 23.

Three things in it:

- **On average the model has the rules' odds** (0.847 against 0.846), and where the rules are spread it is close
  to them (early dusk, in and out of a nest: within 0.01).
- **It lacks the rules' certainty.** In a nest in late dusk the rules are at 0.99 or more on 0.995 of asks; the
  model on 0.678. This is stage R11's offline finding (the mark O4, and its table "where the rules are
  near-certain": 0.910 on a nest at dusk or night) seen on this run's own states: where the rules put 0.99 or
  more on the nest the model puts 0.913 and one draw in eleven leaves it.
- **Out of a nest in the dark it is far off** (−0.30 and −0.53), in the direction of carrying on.

At the asks behind the short nights:

| Asks | with a label | the rules' odds on the nest: mean | at 0.99 or more | at 0.9 or more | the model's odds on the nest: mean | at 0.9 or more | the model's draw took the nest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| the asks at which a finished nest was left (evening stretches and early rises) | 37 | 0.511 | 18 | 18 | 0.467 | 1 | 0 |
| ... of them at dusk or in the evening dark | 20 | 0.944 | 18 | 18 | 0.641 | 1 | 0 |
| ... of them the waking ask before first light | 17 | 0.001 | 0 | 0 | 0.263 | 0 | 0 |
| the asks while out in the evening, a nest on the menu | 70 | 0.951 | 63 | 66 | 0.524 | 3 | 21 |

The instrument checked on the rules themselves (`odds rules --every 3`: the same label on one in three of the
rules arm's own fresh draws; if the label is the rules' odds, its mean must equal how often the rules took the
nest):

| Situation | In a finished nest | Draws with a label | the label on the nest, mean | the rules took the nest, share | at 0.99 or more |
| --- | --- | --- | --- | --- | --- |
| dusk, before 18:45 | yes | 338 | 0.909 | 0.908 | 0.834 |
| dusk, from 18:45 to dark | yes | 343 | 0.992 | 0.994 | 0.988 |
| dark, evening, before its sleep latch | yes | 6 | 1.000 | 1.000 | 1.000 |
| dark, morning, before first light | yes | 242 | 0.697 | 0.694 | 0.607 |
| dusk, before 18:45 | no | 304 | 0.735 | 0.724 | 0.599 |
| dusk, from 18:45 to dark | no | 12 | 0.996 | 1.000 | 0.917 |
| dark, evening, before its sleep latch | no | 6 | 1.000 | 1.000 | 1.000 |
| dark, morning, before first light | no | 30 | 0.318 | 0.300 | 0.000 |

It does: within 0.003 in a finished nest (338, 343 and 242 draws) and within 0.02 elsewhere.

Why the adapter is far off out of a nest in the dark (`scripts/r14-nights.ts offline`: stage R11's training,
development and held-out files, cut the same way):

| Situation | In the nest act | Training draws | with a nest on the menu | the label on the nest, mean | Held-out draws with a nest on the menu | the label on the nest, mean | the adapter's odds on the nest, mean | a draw from the label leaves the nest, per 100 | from the adapter, per 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dusk, before 18:45 | yes | 75 | 74 | 0.888 | 30 | 0.911 | 0.892 | 8.9 | 10.8 |
| dusk, from 18:45 to dark | yes | 90 | 90 | 1.000 | 35 | 1.000 | 0.965 | 0.0 | 3.5 |
| dark, evening, to 19:54 | yes | 2 | 2 | 1.000 | 0 | none | none | none | none |
| dark, evening, after 19:54 | yes | 0 | 0 | none | 0 | none | none | none | none |
| dark, morning, before first light | yes | 70 | 70 | 0.643 | 22 | 0.502 | 0.666 | 49.8 | 33.4 |
| dusk, before 18:45 | no | 60 | 58 | 0.688 | 25 | 0.604 | 0.594 | 39.6 | 40.6 |
| dusk, from 18:45 to dark | no | 5 | 5 | 0.618 | 0 | none | none | none | none |
| dark, evening, to 19:54 | no | 1 | 1 | 1.000 | 1 | 1.000 | 0.759 | 0.0 | 24.1 |
| dark, evening, after 19:54 | no | 0 | 0 | none | 0 | none | none | none | none |
| dark, morning, before first light | no | 54 | 10 | 0.384 | 2 | 0.241 | 0.473 | 75.9 | 52.7 |

Training and development draws in all: 3420; at dusk or in the dark: 357; out of the nest act in the dark of the evening: 1, of which after 19:54: 0.

The held-out file already showed the late-dusk gap (the label 1.000, the adapter 0.965: 3.5 leaves per 100 draws,
against the 3.7 this run made). It could not show the other half, because a world that runs on the rules is
almost never in that state.

## 6. Why an animal in a nest is asked at all

From the code, then the counts (`scripts/r14-nights.ts asks`).

- A nest bout lasts 60 to 100 minutes in the dark, 4 to 9 minutes while the light is changing and 12 to 20 in
  full light (`src/sim/execution.ts` `boutHours`; `boutNestMin`, `boutNestMorningMin`, `boutNestDayMin` and their
  maxima). Each bout end is a decision point.
- At a decision point the gate decides whether anything is asked (`src/sim/rg.ts` `gate`, which the rules use
  for themselves and the loop uses for a model, `src/sim/decide.ts` `loopGate`). It keeps the act unless: the light
  is rising on an animal in its nest (`light`); an interrupt arrived (`interrupt`); hunger, thirst, felt
  sleepiness or loneliness crossed into another bucket (`need-bucket`; the buckets of `src/decide/facts.ts`); the
  gate's period of the day changed (`period`); the choice is more than 30 minutes old (`max-age`, `rgMaxAgeH`
  0.5); or the act ended (`ended`).
- With the sleep latch on, an animal in its nest reaches no decision point: its bout is held a tick ahead, every
  tick. Waking is a decision point (`src/sim/circadian.ts` `circadianTick`).
- The menu at night is the day's menu (`rhythmFreeNight` 1, `src/sim/rg.ts` `rgMenuParts`): feeding and trips are
  offered in the dark. A new nest is offered to an animal out of one only while its nest drive is over 0.25
  (`src/sim/candidates.ts` `offerOwnNest`), which it is not just after waking: of the 292 asks out of a nest in
  the dark of the morning, 26 have a nest on the menu.

| Situation, in a finished nest | the model arm: asks | per animal-night | the gate held the nest | Reason of the asks (count) | the rules arm: fresh draws | per animal-night | the gate kept the nest | Reason of the draws (count) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dusk, before 18:45 | 961 | 1.26 | 2624 | bout end, need-bucket 547; bout end, period 180; bout end, max-age 147; interrupt (another is moving off) 47; interrupt (another gave a travel hoo) 26; bout end, ended 6; interrupt (another is charging at me) 3; interrupt (another invites me to play) 2; bout end, no-intent 1; interrupt (heard another scream) 1; bout end, patrol 1 | 1017 | 1.34 | 2611 | need-bucket 649; period 127; max-age 121; interrupt (another is moving off) 85; interrupt (another gave a travel hoo) 21; ended 11; interrupt (another approaches to mate) 2; interrupt (another invites me to play) 1 |
| dusk, from 18:45 to dark | 1020 | 1.34 | 1125 | bout end, need-bucket 984; bout end, max-age 31; bout end, ended 4; interrupt (another is moving off) 1 | 1048 | 1.38 | 1151 | need-bucket 990; max-age 56; ended 1; interrupt (heard another scream) 1 |
| dark, evening, before its sleep latch | 22 | 0.03 | 0 | bout end, period 15; bout end, need-bucket 7 | 24 | 0.03 | 0 | period 17; need-bucket 7 |
| dark, evening, its sleep latch on | 0 | 0.00 | 0 | none | 0 | 0.00 | 0 | none |
| dark, morning, before first light | 767 | 1.01 | 0 | bout end, need-bucket 759; interrupt (another is moving off) 5; bout end, light 2; bout end, ended 1 | 767 | 1.01 | 0 | need-bucket 760; interrupt (another is moving off) 6; ended 1 |

Asks of the model arm in a finished nest in the dark with the sleep latch on at the tick before: 758, of which 758 are the bout end the waking itself raises (src/sim/circadian.ts: "waking is a decision point") and 0 an interrupt. Their clock times: 05:24 to 06:17, median 05:35. Asks in a finished nest between the latch closing and that waking: 0.
The rules arm: 760 decisions of the rules in a finished nest in the dark with the sleep latch on at the tick before, 0 of them opened by an interrupt; their clock times 05:23 to 05:47, median 05:37; decisions in a finished nest between the latch closing and that waking: 0.

So "asks at night" are two things. At dusk, felt sleepiness climbs through the buckets as the latch approaches,
and each crossing opens the gate at the next bout end, a few minutes later: 1.3 asks per animal-night in the last
twenty minutes of light, nearly all of them `need-bucket`. At waking, one ask. Between the two, nothing: no
interrupt opened a decision for an animal asleep in its nest in either arm (0 of 758 and 0 of 760). The rules get
a fresh draw at exactly the same points and as often; nothing here is an artefact of the loop asking a model more
than the rules ask themselves.

## 7. A few animals or everyone, compounding, growth

`scripts/r14-nights.ts spread`

Animals with a short night: 15 of 38: Dembiri (8) 3, Tavuni (1) 2, Ebini (26) 2, Kasoko (30) 2, Jambiri (47) 2, Sanaki (4) 1, Fumbira (10) 1, Semwai (15) 1, Tindiro (16) 1, Dalubi (25) 1, Nabiru (33) 1, Dunduri (41) 1, Fazaki (43) 1, Hembara (45) 1, Ikwera (46) 1.

If every animal-night ran the same risk (21 of 760), 20 nights each: animals expected with none, one, two, three or more short nights 21.7, 12.3, 3.3, 0.6; found 23, 10, 4, 1.

By class (short of animal-nights): adult male 6 of 280; adolescent 12-15 y 4 of 80; female, other 7 of 180; female, lactating 1 of 160; juvenile 8-12 y 3 of 60. By sex: male 11 of 380; female 10 of 380. By community: community 1 9 of 320; community 2 6 of 240; community 3 6 of 200.

Animals with at least one evening of 23 dark minutes or more out of a nest: 19 of 38 in the model arm (29 such evenings), 2 in the rules arm (2). Animals with at least one early rise: 38 and 36.

### By day

| Days | the model arm: short nights | evenings of 23 dark minutes or more | dark minutes out before the morning | early rises | late-dusk asks in a nest | a draw left the nest at them | odds on the nest at them, mean | the rules arm: short nights | evenings of 23 dark minutes or more | early rises |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 to 5 | 3 | 6 | 714 | 33 | 252 | 7 | 0.964 | 0 | 0 | 63 |
| 6 to 10 | 7 | 10 | 743 | 54 | 272 | 15 | 0.957 | 0 | 0 | 53 |
| 11 to 15 | 2 | 2 | 132 | 36 | 236 | 3 | 0.978 | 0 | 1 | 45 |
| 16 to 20 | 9 | 11 | 921 | 49 | 260 | 13 | 0.961 | 0 | 1 | 63 |
| 1 to 10 | 10 | 16 | 1457 | 87 | 524 | 22 | 0.960 | 0 | 0 | 116 |
| 11 to 20 | 11 | 13 | 1053 | 85 | 496 | 16 | 0.969 | 0 | 2 | 108 |

Short nights per day, days 1 to 20: 1, 0, 0, 0, 2, 1, 3, 3, 0, 0, 0, 1, 0, 0, 1, 3, 1, 1, 1, 3.

No trend: the days 11 to 15 are the quiet ones and the days 16 to 20 the busiest, with the model's late-dusk odds
the same throughout (0.957 to 0.978).

### Does one animal's leaving wake or draw another?

| Asks in a finished nest at dusk or in the dark, by what opened them | the model arm: asks | odds on the nest, mean | a draw left the nest, per 100 | the rules arm: fresh draws | the rules left the nest, per 100 |
| --- | --- | --- | --- | --- | --- |
| a bout end (no interrupt) | 2684 | 0.898 | 278 (10.4) | 2737 | 309 (11.3) |
| interrupt: another is moving off | 53 | 0.928 | 4 (7.5) | 91 | 3 (3.3) |
| interrupt: another is charging at me | 3 | 0.266 | 2 (66.7) | 0 | 0 (none) |
| interrupt: another gave a travel hoo | 26 | 0.990 | 0 (0.0) | 20 | 0 (0.0) |
| interrupt: another invites me to play | 2 | 0.935 | 0 (0.0) | 1 | 0 (0.0) |
| interrupt: heard another scream | 1 | 0.631 | 1 (100.0) | 1 | 0 (0.0) |
| interrupt: another approaches to mate | 0 | no value | 0 (none) | 2 | 0 (0.0) |

Evening leaves of a finished nest at dusk in the model arm: 111; 7 were at an ask an interrupt opened, 4 of them another animal moving off or giving a travel hoo. Of the 27 leaves that cost 23 dark minutes or more, 0 were opened that way. The first act of a leave was following another animal at 0.
The rules arm: 106 such leaves, 4 at a decision an interrupt opened (4 another moving off or a travel hoo).

Short nights of two animals of one community on one day: 2 pairs among the 21 short nights: day 8, community 1: Dembiri (left 18:49) and Fumbira (left 19:01); nearest to each other while both were out in the dark: 461 m; day 20, community 1: Dembiri (left 18:42) and Tindiro (left 18:53); nearest to each other while both were out in the dark: 188 m. Short nights by day and community: day 8 community 1: 2; day 20 community 1: 2.
Short nights per day: mean 1.05, variance 1.31 (equal for independent rare events; a variance well above the mean would say nights go short together).

No. An ask opened by another animal moving off is no likelier to end in a leave than any other (7.5 against 10.4
per 100), a travel hoo never did, the two pairs of short nights in one community on one day were 188 and 461
metres apart, and nobody is woken.

## 8. Ten animals against the population

`scripts/r14-nights.ts ten`

| Arm | Animal-nights | Short | Dark minutes out of a nest: mean | Animal-nights with none | with 30 to under a tenth of the dark | the largest |
| --- | --- | --- | --- | --- | --- | --- |
| p5b-s7-draw-1 (ten animals) | 50 | 0 | 7.7 | 40 | 8 | 66.0 |
| p5b-s7-draw-2 (ten animals) | 50 | 1 | 14.9 | 33 | 16 | 82.3 |
| p5b-s11-draw-1 (ten animals) | 50 | 1 | 15.2 | 34 | 14 | 134.8 |
| p5b-s7-top (ten animals) | 50 | 0 | 3.0 | 46 | 3 | 46.5 |
| p5b-s11-top (ten animals) | 50 | 0 | 5.4 | 44 | 6 | 49.8 |
| rules-1 to rules-8 (ten animals) | 400 | 2 | 9.8 | 304 | 85 | 107.8 |
| the population's model arm (stage R13) | 760 | 21 | 12.5 | 559 | 154 | 211.8 |
| the population's paired rules arm | 760 | 0 | 11.9 | 523 | 205 | 58.8 |

The rules' own control arms lose nights at ten animals too (2 of 400), and the draw arms' nights already sit a
little worse than the top-pick arms' (mean 7.7 to 15.2 dark minutes out against 3.0 and 5.4).

| The ten-animal evidence | Short of animal-nights | Its rate, with the exact 95% interval | Short nights that rate gives in 760 animal-nights (the interval) | How often a true rate of the population's (2.76%) shows no more short nights than that in so few | Fisher's exact test against the population's 21 of 760 |
| --- | --- | --- | --- | --- | --- |
| the same arm (`p5b-s7-draw-1`) | 0 of 50 | 0.00% (0.00 to 7.11) | 0.0 (0.0 to 54.1) | 0.246 | p = 0.634 |
| the same adapter, both decode salts | 1 of 100 | 1.00% (0.03 to 5.45) | 7.6 (0.2 to 41.4) | 0.233 | p = 0.500 |
| the recipe's three draw arms | 2 of 150 | 1.33% (0.16 to 4.73) | 10.1 (1.2 to 36.0) | 0.214 | p = 0.404 |

The population's own rate: 21 of 760, 2.76% (exact 95% interval 1.72 to 4.19; animal-nights of one animal are not independent, so the true interval is somewhat wider). At that rate 50 animal-nights hold 1.38 short nights on average and 100 hold 2.76. Stage R11's mark N1 asked 49 of 50 nights or more of each draw arm (docs/staging/r11-prereg.md §11.1): at the population's rate one arm of 50 nights keeps that line with probability 0.596, and three arms all keep it with probability 0.212.

| Arm | Animal-nights | Asks in the nest act, 18:00 to 18:45 | per animal-night | odds on the nest, mean | a draw left it, per 100 | Asks in the nest act, 18:45 to dark | per animal-night | odds on the nest, mean | a draw left it, per 100 | options on those menus, mean | Asks out of the nest act in the dark of the evening, a nest on the menu | odds on the nest, mean | the nest not taken, per 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p5b-s7-draw-1 (ten animals) | 50 | 67 | 1.34 | 0.961 | 5 (7.5) | 72 | 1.44 | 0.984 | 1 (1.4) | 4.00 | 2 | 0.680 | 1 (50.0) |
| p5b-s7-draw-2 (ten animals) | 50 | 78 | 1.56 | 0.942 | 5 (6.4) | 72 | 1.44 | 0.954 | 1 (1.4) | 3.85 | 1 | 0.524 | 0 (0.0) |
| p5b-s11-draw-1 (ten animals) | 50 | 66 | 1.32 | 0.961 | 1 (1.5) | 80 | 1.60 | 0.960 | 3 (3.8) | 3.95 | 4 | 0.612 | 3 (75.0) |
| the three draw arms together (ten animals) | 150 | 211 | 1.41 | 0.954 | 11 (5.2) | 224 | 1.49 | 0.966 | 5 (2.2) | 3.93 | 7 | 0.619 | 4 (57.1) |
| the population's model arm | 760 | 998 | 1.31 | 0.925 | 75 (7.5) | 1023 | 1.35 | 0.964 | 38 (3.7) | 4.11 | 105 | 0.588 | 49 (46.7) |

The five focal animals of each ten-animal seed carry the ids 1, 2, 4, 8, 10, 11; the animals of the population run with those ids (Tavuni (1), Mbelo (2), Sanaki (4), Dembiri (8), Fumbira (10), Lwazo (11); another world, so other individuals) have 7 short nights of 120.
Leaves at the late-dusk asks in the nest act: the population 38 of 1023 (3.71 per 100); the three ten-animal draw arms 5 of 224 (2.23 per 100; exact 95% interval 0.73 to 5.13); Fisher's exact test p = 0.318.

The candidates the question named, one by one:

| Candidate | What the records say |
| --- | --- |
| more asks per night in a population | No: 1.35 late-dusk asks in the nest act per animal-night against 1.49 at ten animals |
| different menus | No: 4.11 options on those menus against 3.93 |
| different states | No: the model's odds on the nest at those asks are 0.964 against 0.966 |
| companions that are also drawing | No sign: 4 of 111 dusk leaves were opened by another animal's leaving, none of the costly ones (§7) |
| chance | Enough by itself: 2 of 150 at ten animals and 21 of 760 here are not told apart (p = 0.40), and the per-ask leave rates are not either (p = 0.32) |

The plain reading: the draw cost nests at ten animals as it does here, and the test was too small to see it.
Stage R11's registration said so in advance ("cannot tell one lost night from none"); what it could not say was
how large a rate 50 nights can hide. A rate of 2.8% is hidden one time in four by one arm.

## 9. What this reading supports

Candidates only. Each rests on what is named and would be refuted by what is named; none is chosen to reach a
rate, and none is registered here.

1. **Teach the states a draw reaches and the rules do not.** Out of a nest after dark the adapter has one training
   example in 3,420 and answers 0.47 to 0.65 where the rules' label is 0.95 to 1.00. Labels for such states can
   be made with no model (this stage computed them for 105 asks of this run; the control arms with a share of
   random choices visit them too). *Rests on:* §5's last two tables. *Refuted if:* an adapter retrained with them
   still puts under 0.9 on the nest on held-out draws of those states, or the evening stretches do not shorten in
   the loop.
2. **Close the gap where the label is 1.** In a nest in late dusk the label is 0.999 and the adapter 0.964, with
   90 training draws of that situation. *Rests on:* §4 and §5; the gap times 1.34 asks a night is the 38 leaves.
   *Refuted if:* the gap on held-out draws does not close with more such examples or longer training; it would
   then be what the packet does not show or what this model cannot read (its odds follow the rules' margin only at
   a rank correlation of 0.49).
3. **The top pick, which stage R13's own rule already names for the next population run.** It would not have
   started 19 of the 20 evening stretches of the short nights, and at ten animals it kept 100 of 100 nights.
   *What it does not repair:* the odds. While out in the dark the top pick was the nest at 45 of 70 asks only, and
   by day the top pick is told from the rules (stage R11). *Refuted as a repair of nights if:* a top-pick
   population run still shows evenings of 23 dark minutes or more above the rules' 2 in 760.
4. **Read the nights in two parts.** The registered readout adds the model's evening to the rules' own early rise:
   8 of the 21 short nights need both, and the rules arm sits 7 to 37 dark minutes under the line on 205 nights.
   Evening and morning apart (13 nights short by the evening alone; 2,510 against 250 dark minutes; 172 against
   224 early rises) say the same thing without that interplay. A description beside the registered readout, which
   stands.
5. **A ruling for stage R12's table.** The menu offers "leave a finished nest in the last light" and "go on
   feeding with the sleep latch closed". The rules take the first twice in 1,048 draws and are never in a position
   to take the second. Whether these are possible or only inadvisable is the kind of question that table puts to
   the user. *Refuted as a repair if:* with them off the menu the dark minutes move to late first nests (7
   stretches and 234 dark minutes here).

What this reading does not support: fewer asks (the rules draw at the same points, §6); anything about hunger
(§4); anything special to a population (§8).

## 10. Limits, and what was not done

- One world seed, one training of the recipe, one decode salt. The second training was not run on a population.
- The ten-animal arms were read from their receipts and card days only. No tick trace was made of them, so "in the
  nest" is the nest act in progress there, and their evenings and mornings are not told apart.
- The rules' own odds were computed for every ask at dusk or in the dark with a nest on the menu (26 of 3,771
  have no label: their menu came up in fewer than 100 redraws), and for one in three of the rules arm's draws.
  Asks without a nest on the menu and all daytime asks were not labelled.
- Why the model hedges at a particular late-dusk ask was not found. It is not hunger, thirst or sleepiness (rank
  correlations of 0.12 or less); finding it needs the model asked again with lines of the packet removed, which
  this stage could not do (no model process).
- The reserves (the other failed readout) are not read here. The two arms are equally hungry at dusk; that is all
  this stage can say about them.
- The animals under 8, on the rules in both arms, were not read.
- The intermediate files (`artifacts/r14/nights`: two traces, two label files, the printed tables) are not
  committed; the commands below write them again.

## 11. How to run it again

From a checkout of this branch, with `node_modules` linked, Node 22.22.3, no model and no `data/raw`. One process
at a time; about 25 minutes in all, of which `odds model` is 17.

```sh
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts figure
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts trace model      # 40 s; must land on 20 of 20 day hashes
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts trace rules      # 20 s
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts classify
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts asks
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts state
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts spread
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts odds model       # 17 min; the rules' own odds at 3,771 asks
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts odds rules --every 3   # 5 min; the check of the instrument
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts odds-report
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts nights
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts ten
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/r14-nights.ts offline
fnm exec --using=22.22.3 -- pnpm exec tsx --test tests/r14-nights.test.ts        # 9 tests of the pure readers
```

`--r13 <dir>`, `--r11 <dir>` and `--r11-loop <dir>` point the script at the records when they are not in the
worktrees `bench-r13` and `r11-honest-retrain` beside the checkout. It writes only under `artifacts/r14/nights` of
its own checkout.

## For the integrator

- Nothing here touches `src`, `server`, `training`, `data` or `tests/fixtures`. The branch adds
  `scripts/r14-nights.ts`, `scripts/lib/r14-trace.ts`, `scripts/lib/r14-nights.ts`, `tests/r14-nights.test.ts` and
  this document. `AGENTS.md` was left alone (other diagnoses of this stage may add to the same lines); a line for
  it, if wanted: `pnpm exec tsx scripts/r14-nights.ts figure | trace model|rules | classify | asks | nights | state |
  spread | odds model|rules [--every N] | odds-report | ten | offline   # stage R14 diagnosis
  (docs/staging/r14-diag-nights.md), no model: the nights of stage R13's model arm tick by tick, the asks behind the
  short ones, the rules' own odds at them by stage R11's label machinery`.
- `scripts/lib/r14-trace.ts` `traceRun` is a replay with a hook at every ask (the world still in the state the
  request was built from) and the rules' own taps for a rules arm. Another reading of a finished run can use it;
  a hook must leave the world as it found it, and the day hashes say whether it did.
- The label of every dusk and night ask of the model arm is on file after `odds model`
  (`artifacts/r14/nights/odds.model.json`, not committed): 3,745 states with the rules' own odds, 105 of them out
  of a nest in the dark of the evening.

## 12. Appendix: the short nights, one by one

`scripts/r14-nights.ts nights` (after `odds model`, which gives the column "the rules' own odds on the nest").

### Each night: the evening stretch and the early rise

| Day | Animal | Sex | Class | Age | Community | Dark minutes out of a nest | Evening: what happened | left the nest | in a nest again | dark minutes | what it did in them (minutes) | Early rise: left the nest | dark minutes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Sanaki (4) | male | adult male | 22.1 | 1 | 211.8 | left a finished nest at dusk, back in a nest after dark | 18:57 | 22:38 | 211.8 | forage 208, going to or building a nest 4 | no early rise | 0 |
| 5 | Semwai (15) | female | female, other | 21.1 | 1 | 160.3 | left a finished nest at dusk, back in a nest after dark | 19:06 | 21:44 | 158.0 | forage 124, travel 30, going to or building a nest 4 | 06:16 | 2.3 |
| 5 | Fazaki (43) | female | female, lactating | 29.1 | 3 | 156.3 | left a finished nest at dusk, back in a nest after dark | 18:55 | 21:41 | 155.0 | forage 86, travel 64, going to or building a nest 5, share 1 | 06:17 | 1.3 |
| 6 | Tavuni (1) | male | adult male | 27.1 | 1 | 135.0 | left a finished nest at dusk, back in a nest after dark | 18:01 | 21:04 | 118.0 | forage 98, travel 16, going to or building a nest 4 | 06:01 | 17.0 |
| 7 | Tavuni (1) | male | adult male | 27.1 | 1 | 133.8 | left a finished nest at dusk, back in a nest after dark | 18:53 | 21:03 | 116.8 | forage 100, travel 12, going to or building a nest 4 | 06:01 | 17.0 |
| 7 | Kasoko (30) | female | female, other | 26.1 | 2 | 101.8 | left a finished nest at dusk, back in a nest after dark | 19:01 | 20:48 | 101.8 | forage 83, travel 16, going to or building a nest 4 | no early rise | 0 |
| 7 | Jambiri (47) | female | juvenile 8-12 y | 11.1 | 3 | 114.3 | left a finished nest at dusk, back in a nest after dark | 18:56 | 20:28 | 81.8 | forage 78, going to or building a nest 4 | 05:46 | 32.5 |
| 8 | Dembiri (8) | male | adolescent 12-15 y | 13.1 | 1 | 92.8 | left a finished nest at dusk, back in a nest after dark | 18:49 | 19:55 | 48.8 | forage 44, going to or building a nest 5 | 05:34 | 44.0 |
| 8 | Fumbira (10) | female | female, other | 44.1 | 1 | 102.0 | left a finished nest at dusk, back in a nest after dark | 19:01 | 20:13 | 67.3 | forage 62, going to or building a nest 5 | 05:43 | 34.8 |
| 8 | Jambiri (47) | female | juvenile 8-12 y | 11.1 | 3 | 88.3 | left a finished nest at dusk, back in a nest after dark | 18:56 | 19:49 | 43.0 | forage 38, going to or building a nest 5 | 05:33 | 45.3 |
| 12 | Kasoko (30) | female | female, other | 26.1 | 2 | 80.3 | left a finished nest at dusk, back in a nest after dark | 18:55 | 19:42 | 36.0 | forage 32, going to or building a nest 4 | 05:34 | 44.3 |
| 15 | Nabiru (33) | female | female, other | 15.1 | 2 | 68.5 | left a finished nest at dusk, back in a nest after dark | 18:36 | 19:31 | 24.3 | forage 20, going to or building a nest 4 | 05:34 | 44.3 |
| 16 | Dembiri (8) | male | adolescent 12-15 y | 13.1 | 1 | 80.3 | left a finished nest at dusk, back in a nest after dark | 18:49 | 19:37 | 29.8 | forage 26, going to or building a nest 4 | 05:28 | 50.5 |
| 16 | Ebini (26) | male | adult male | 18.1 | 2 | 147.0 | left a finished nest at dusk, back in a nest after dark | 18:38 | 21:25 | 137.8 | forage 122, travel 12, going to or building a nest 4 | 06:09 | 9.3 |
| 16 | Dunduri (41) | male | adolescent 12-15 y | 14.1 | 3 | 164.3 | no nest before dark: the first one finished after dark | had none | 21:52 | 164.3 | forage 159, going to or building a nest 5 | no early rise | 0 |
| 17 | Hembara (45) | female | female, other | 16.1 | 3 | 70.0 | left a finished nest at dusk, back in a nest after dark | 18:59 | 19:35 | 27.5 | forage 23, going to or building a nest 5 | 05:37 | 42.5 |
| 18 | Dalubi (25) | male | adult male | 35.1 | 2 | 150.0 | left a finished nest at dusk, back in a nest after dark | 18:55 | 21:28 | 140.3 | forage 137, going to or building a nest 4 | 06:09 | 9.8 |
| 19 | Ebini (26) | male | adult male | 18.1 | 2 | 76.8 | left a finished nest at dusk, back in a nest after dark | 18:53 | 19:37 | 29.5 | forage 26, going to or building a nest 4 | 05:32 | 47.3 |
| 20 | Dembiri (8) | male | adolescent 12-15 y | 13.1 | 1 | 114.0 | left a finished nest at dusk, back in a nest after dark | 18:42 | 20:28 | 80.5 | forage 74, going to or building a nest 5, travel 1 | 05:46 | 33.5 |
| 20 | Tindiro (16) | female | female, other | 17.1 | 1 | 78.3 | left a finished nest at dusk, back in a nest after dark | 18:53 | 19:35 | 27.0 | forage 22, going to or building a nest 5 | 05:28 | 51.3 |
| 20 | Ikwera (46) | male | juvenile 8-12 y | 9.1 | 3 | 110.0 | left a finished nest at dusk, back in a nest after dark | 18:49 | 20:58 | 110.0 | forage 99, travel 6, going to or building a nest 5 | no early rise | 0 |

### The evening: the ask at which the finished nest was left, and the asks while out

The odds are the model's, in menu order. "The rules' top option": the rules' own best-scored option on that menu.
"The rules' own odds on the nest": stage R11's label at that ask. "While out": the asks from the leave to the next
finished nest (for the late first nest: from 66 minutes before dark); every one of them, one line each, is written
by `asks` to `artifacts/r14/nights/short-night-asks.md`.

| Day | Animal | Clock | Why it was asked | Menu with the model's odds | Drawn | Top pick | The rules' top option | The rules' own odds on the nest | While out: asks (the last one took the nest) | with a nest on the menu | the model's odds on the nest, mean | the top pick was the nest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Sanaki (4) | 18:57 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.389, travel 0.173, nest 0.439 | forage | nest | nest | 1.000 | 5 | 5 | 0.426 | 2 |
| 5 | Semwai (15) | 19:06 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.107, travel 0.444, nest 0.449 | travel | nest | nest | 1.000 | 4 | 4 | 0.446 | 2 |
| 5 | Fazaki (43) | 18:55 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.411, travel 0.128, play (an animal) 0.005, nest 0.456 | forage | nest | nest | 1.000 | 11 | 11 | 0.273 | 3 |
| 6 | Tavuni (1) | 18:01 (dusk) | the bout ended; the gate opened on period | forage 0.044, travel 0.028, groom (an animal) 0.010, play (an animal) 0.015, nest 0.737, charge (an animal) 0.027, guard (an animal) 0.131, call 0.008 | guard (an animal) | nest | guard (an animal) | 0.684 | 8 | 8 | 0.624 | 8 |
| 7 | Tavuni (1) | 18:53 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.318, travel 0.209, nest 0.473 | forage | nest | nest | 1.000 | 3 | 3 | 0.607 | 3 |
| 7 | Kasoko (30) | 19:01 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.186, travel 0.178, nest 0.636 | forage | nest | nest | 1.000 | 2 | 2 | 0.695 | 2 |
| 7 | Jambiri (47) | 18:56 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.121, travel 0.089, climb 0.001, nest 0.788 | travel | nest | nest | 1.000 | 2 | 2 | 0.529 | 1 |
| 8 | Dembiri (8) | 18:49 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.346, travel 0.118, climb 0.002, nest 0.534 | forage | nest | nest | 1.000 | 2 | 2 | 0.721 | 2 |
| 8 | Fumbira (10) | 19:01 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.060, travel 0.040, nest 0.900 | forage | nest | nest | 1.000 | 2 | 2 | 0.547 | 2 |
| 8 | Jambiri (47) | 18:56 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.219, travel 0.092, climb 0.002, nest 0.687 | travel | nest | nest | 1.000 | 1 | 1 | 0.297 | 0 |
| 12 | Kasoko (30) | 18:55 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.344, travel 0.253, nest 0.403 | forage | nest | nest | 1.000 | 1 | 1 | 0.722 | 1 |
| 15 | Nabiru (33) | 18:36 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.049, travel 0.245, nest 0.706 | travel | nest | travel | 0.204 | 2 | 2 | 0.742 | 2 |
| 16 | Dembiri (8) | 18:49 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.094, travel 0.074, climb 0.002, nest 0.831 | forage | nest | nest | 1.000 | 1 | 1 | 0.718 | 1 |
| 16 | Ebini (26) | 18:38 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.474, travel 0.171, nest 0.349, call 0.006 | forage | forage | nest | 1.000 | 4 | 4 | 0.483 | 3 |
| 16 | Dunduri (41) | no nest was left |  |  |  |  |  |  | 7 | 7 | 0.603 | 4 |
| 17 | Hembara (45) | 18:59 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.002, travel 0.026, nest 0.972 | travel | nest | nest | 1.000 | 1 | 1 | 0.828 | 1 |
| 18 | Dalubi (25) | 18:55 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.168, travel 0.134, nest 0.698 | forage | nest | nest | 1.000 | 4 | 4 | 0.357 | 0 |
| 19 | Ebini (26) | 18:53 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.071, travel 0.320, nest 0.609 | travel | nest | nest | 1.000 | 1 | 1 | 0.711 | 1 |
| 20 | Dembiri (8) | 18:42 (dusk) | the bout ended; the gate opened on ended | forage 0.026, travel 0.079, nest 0.891, call 0.004 | forage | nest | nest | 1.000 | 4 | 4 | 0.612 | 4 |
| 20 | Tindiro (16) | 18:53 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.158, travel 0.162, nest 0.680 | forage | nest | nest | 1.000 | 1 | 1 | 0.906 | 1 |
| 20 | Ikwera (46) | 18:49 (dusk) | the bout ended; the gate opened on need-bucket | forage 0.275, travel 0.139, climb 0.002, nest 0.584 | forage | nest | nest | 1.000 | 4 | 4 | 0.568 | 2 |

### The morning: the waking ask at which the nest was left before first light

| Day | Animal | Clock | Why it was asked | Menu with the model's odds | Drawn | Top pick | The rules' top option | The rules' own odds on the nest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | Semwai (15) | 06:16 | the bout ended; the gate opened on light | forage 0.108, drink 0.674, travel 0.172, nest 0.046 | drink | drink | drink | 0.000 |
| 5 | Fazaki (43) | 06:17 | the bout ended; the gate opened on light | forage 0.004, drink 0.394, travel 0.050, nest 0.552 | drink | nest | drink | 0.000 |
| 6 | Tavuni (1) | 06:01 | the bout ended; the gate opened on need-bucket | forage 0.027, drink 0.409, travel 0.167, nest 0.397 | travel | drink | travel | 0.000 |
| 7 | Tavuni (1) | 06:01 | the bout ended; the gate opened on need-bucket | forage 0.218, drink 0.468, travel 0.179, nest 0.135 | forage | drink | travel | 0.000 |
| 7 | Jambiri (47) | 05:46 | the bout ended; the gate opened on need-bucket | forage 0.116, drink 0.603, travel 0.180, nest 0.101 | drink | drink | drink | 0.000 |
| 8 | Dembiri (8) | 05:34 | the bout ended; the gate opened on need-bucket | forage 0.155, drink 0.234, travel 0.313, nest 0.298 | forage | travel | drink | 0.003 |
| 8 | Fumbira (10) | 05:43 | the bout ended; the gate opened on need-bucket | forage 0.006, drink 0.744, travel 0.099, nest 0.151 | drink | drink | drink | 0.000 |
| 8 | Jambiri (47) | 05:33 | the bout ended; the gate opened on need-bucket | forage 0.124, drink 0.589, travel 0.223, nest 0.063 | drink | drink | drink | 0.000 |
| 12 | Kasoko (30) | 05:34 | the bout ended; the gate opened on need-bucket | forage 0.074, drink 0.234, travel 0.252, nest 0.440 | travel | nest | drink | 0.000 |
| 15 | Nabiru (33) | 05:34 | the bout ended; the gate opened on need-bucket | forage 0.019, drink 0.668, travel 0.187, nest 0.126 | drink | drink | drink | 0.000 |
| 16 | Dembiri (8) | 05:28 | the bout ended; the gate opened on need-bucket | forage 0.215, drink 0.485, travel 0.182, nest 0.118 | drink | drink | drink | 0.000 |
| 16 | Ebini (26) | 06:09 | the bout ended; the gate opened on need-bucket | forage 0.088, drink 0.387, travel 0.158, nest 0.367 | drink | drink | travel | 0.000 |
| 17 | Hembara (45) | 05:37 | the bout ended; the gate opened on need-bucket | forage 0.038, drink 0.488, travel 0.267, nest 0.208 | drink | drink | drink | 0.000 |
| 18 | Dalubi (25) | 06:09 | the bout ended; the gate opened on need-bucket | forage 0.082, drink 0.311, travel 0.281, nest 0.325 | travel | nest | drink | 0.000 |
| 19 | Ebini (26) | 05:32 | the bout ended; the gate opened on need-bucket | forage 0.024, drink 0.458, travel 0.215, nest 0.303 | travel | drink | drink | 0.006 |
| 20 | Dembiri (8) | 05:46 | the bout ended; the gate opened on need-bucket | forage 0.088, drink 0.341, travel 0.170, nest 0.401 | drink | nest | drink | 0.000 |
| 20 | Tindiro (16) | 05:28 | the bout ended; the gate opened on need-bucket | forage 0.068, drink 0.214, travel 0.274, nest 0.444 | drink | nest | drink | 0.004 |
