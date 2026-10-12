# Stage R14, the energy reading: where the reserves and the extra walking of stage R13's model arm go

Written 12 October 2026, 15:28 to 16:19 EDT, on branch `r14-diag-energy`. **A description of two finished runs.** It
registers nothing, runs no model, changes nothing under `src`, `server`, `training`, `data` or `tests/fixtures`, and
proposes no setting. Field numbers are not used. Every number below is in the generated file
[r14-diag-energy-numbers.md](r14-diag-energy-numbers.md); the section of that file is named in brackets, as (N4) for
its section 4.

**Every number of the model arm is a "rules-taught model on a rules menu"**: stage R11's first honest-packet adapter
(`r11-p5b-s7`, one training), one seeded draw from its odds per ask, the rules' menu, the gate on, animals under 8 on
the rules. One world seed (3613), one run of 20 days. Nothing here is about wild chimpanzees.

## What was read, and how to run it again

Stage R13's two run folders (the model arm and the paired rules arm) were only read. Each run was replayed with no
model, the model arm from its own receipts, and written out once per tick for the 38 animals aged 8 and over: the
act, the place, what was eaten by kind of food, what was spent by the ledger's own terms, the books, and the crop of
the tree at hand. For the rules arm every decision of the rules was logged as well. Both replays reproduce their
runs (20 of 20 day hashes, every receipt line, every row file). Then one script reads the traces beside the runs' own
rows, receipts and saved contexts, and stage R11's loop receipts and training file.

```sh
B=.claude/worktrees/bench-r13/artifacts/r13          # stage R13's run folders (read only)
W=.claude/worktrees/r11-honest-retrain/artifacts     # stage R11's files (read only)
pnpm exec tsx scripts/r14-trace.ts --run $B/model-s3613 --out artifacts/r14/energy/model     # about a minute
pnpm exec tsx scripts/r14-trace.ts --run $B/rules-s3613 --out artifacts/r14/energy/rules     # half a minute
pnpm exec tsx scripts/r14-energy.ts --model-run $B/model-s3613 --rules-run $B/rules-s3613 \
  --r11-loop $W/r11/loop --r11-ft $W/decide-ft/r11 --md docs/staging/r14-diag-energy-numbers.md   # a minute
pnpm exec tsx --test tests/r14-energy.test.ts
```

(Paths from the main checkout; all under Node 22.22.3. The traces are 1.5 GB and stay under `artifacts/`.)

"Per animal and day" is the mean over the 38 animals of each animal's own mean over its 20 days. A difference is the
model arm less the rules arm per animal, with a 95% interval over animals in brackets. The two runs are different
worlds after the first decision, so a difference between them is a description, not an experiment.

## The answer in short

1. **The reserves go on the eating side, not the spending side.** The model arm absorbs 30 kcal a day less and spends
   3 kcal a day less. The extra walking costs 14 kcal a day and is paid back by 54 minutes more in a nest and by less
   milk.
2. **The eating is lost in the morning.** On 73.6% of its animal-days a model-arm animal has no nest minute after
   07:45, as in the rules arm. On the rest it is still in its night nest when every animal of the rules arm is up: on
   5.8% of animal-days for two to five hours more, and on 5.5% for the whole morning. The first feed of the day is
   missed: 84 kcal less before 09:00, 60 kcal more made up between 09:00 and 18:00.
3. **This is the model's own top option, not an unlucky draw.** At asks of an animal in its nest between 07:45 and
   13:00, staying was the model's top option at 89%, and it was never the rules' best-valued option. The draw is
   what gets the animal up: 61% of all risings were draws of an option that was not the model's top.
4. **The training file hardly holds that state.** Of 3,120 training draws, 460 show a nest in progress; 8 of them are
   between 07:30 and 07:45 and 1 is later. The rules are never there, so the adapter was never shown it.
5. **It was already there at ten animals, and worse under the top pick.** In stage R11's own receipts the top-pick
   arms of the honest-packet adapters have a late-morning nest ask on 7 to 21 of 50 animal-days, the draw arms on 0
   to 8, the first adapter on none.
6. **The extra half kilometre is mostly walking toward callers** (+347 m a day; twice as many bouts, each as long as
   the rules'), then own trips to food that are dropped on the way (+193 m), then walks to water (+73 m), less 143 m
   of trips behind a leader. It is walked on the days the animal rose on time.
7. **The drift is a step, then nearly level.** Days 1 to 5 carry the registered shortfall (−0.18% of the store a day
   against the rules). Over days 6 to 20 the model arm eats what the rules arm eats and its reserves change by −0.02%
   a day against the rules, with an interval that includes 0. By day 20 its level is 1.2 points of the store lower.

## 1. The registered figures, from the run's own files (N1)

| Per animal and day | The model arm | The paired rules arm | Difference |
| --- | --- | --- | --- |
| reserves, % of the usual store | −0.054 | +0.008 | −0.061 (−0.080 to −0.042) |
| energy eaten, kcal (the field's intake measure) | 1,591 | 1,617 | −26 (−48 to −3) |
| distance, km (5-minute fixes) | 2.37 | 1.90 | +0.47 (+0.35 to +0.59) |

These are the figures of `r13-numbers.md`, from the rows by the same method. The traces hold the same books: over
760 animal-days an arm the largest difference from the rows is 0.50 kcal (the rows are rounded to 1 kcal) and 12 m of
distance by fixes.

## 2. The energy account (N2)

| kcal per animal and day | The model arm | The paired rules arm | Difference |
| --- | --- | --- | --- |
| eaten (formula energy) | 1,591 | 1,617 | −25.6 (−47.9 to −3.3) |
| · drupes / figs / ground foods | 1,185 / 186 / 228 | 1,207 / 208 / 206 | −22 / −23 / +23 (each interval includes 0) |
| **absorbed** | 1,477 | 1,507 | **−30.0 (−45.8 to −14.3)** |
| **spent** | 1,500 | 1,503 | **−2.7 (−13.8 to +8.5)** |
| · walking | 83.4 | 69.1 | +14.3 (+9.5 to +19.1) |
| · activity above rest | 135.9 | 144.3 | −8.4 (−11.0 to −5.7) |
| · milk | 70.1 | 77.4 | −7.3 (−13.0 to −1.7) |
| · digestion | 147.7 | 150.7 | −3.0 (−4.6 to −1.4) |
| reserves, change | −23.7 | +3.7 | −27.4 (−35.8 to −19.0) |

- **"Eats less" is 110% of the difference in the reserves and "spends more" is −10%.** Resting metabolism is the same
  to the kilocalorie; climbing, carrying, growth and pregnancy differ by about 1 kcal or less. The ledger has no
  thermoregulation term in this parameter set.
- Activity costs less because a minute asleep in a nest is charged at 1.00 times resting and a minute awake at 1.25:
  the model arm is in a nest 798 minutes a day against 744 (+54, +42 to +67), and rests 48 minutes less.
- **By class** (N2, the class table). Every class loses reserves against the rules: adult males −24 kcal a day (−38
  to −10; 14 animals), other females −30 (−50 to −10; 9), adolescents −29 (−46 to −11; 4), lactating females −21 (−44
  to +3; 8), juveniles −51 with an interval of three animals that includes 0. The classes differ in how. Males and
  other females eat about what they eat on the rules and walk more (+16 and +21 kcal). **Lactating females eat 78
  kcal less (−133 to −23)** and spend 33 less, of it 35 less on milk.
- **The mothers with an unweaned infant are those 8 lactating females.** Their infants (on the rules in both arms)
  take in as much energy as in the rules arm (556 against 546 kcal a day, +10, −7 to +26); their reserves read lower
  with an interval that includes 0.

## 3. Where the eating is lost: the nest after first light (N3, N4)

**The day by the clock.** Before 09:00 the model arm eats 376 kcal against 460 (−84, −104 to −64). From 09:00 to 18:00
it eats 1,171 against 1,112 (+60, +37 to +83). In the hour from 07:00 it feeds 22 minutes in a crown against 31 and
is in a nest 21 minutes against 10. From 08:00 the rules arm is in a nest for 0.0 minutes of every hour until the
evening; the model arm for 11.8 minutes of the hour from 08:00, 7.7 from 09:00, 5.8 from 10:00 and still 1.4 from
16:00.

**How often.** A model-arm animal is in a nest for 88 daylight minutes a day against 35 (+53, +43 to +64). The dark
hours are the same: 659 minutes in a nest in the dark in both arms.

| Up for good by | 07:30 | 07:45 | 08:00 | 09:00 | 10:00 | 12:00 | 15:00 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| the model arm, share of animal-days | 0.668 | 0.736 | 0.754 | 0.843 | 0.893 | 0.939 | 0.967 |
| the rules arm | 0.957 | 0.997 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |

On 17 animal-days of 760 the model-arm animal spends 600 or more of the day's 700 daylight minutes in a nest; the
rules arm has none.

**What a late morning costs** (model arm, animal-days grouped by their minutes in a nest between 07:45 and 13:00):

| Late-morning nest minutes | Animal-days | Eaten, kcal | Reserves, % of the store | km |
| --- | --- | --- | --- | --- |
| none | 559 (73.6%) | 1,722 | +0.086 | 2.62 |
| up to 30 | 40 (5.3%) | 1,583 | −0.057 | 2.13 |
| 30 to 120 | 75 (9.9%) | 1,484 | −0.129 | 1.92 |
| 120 to under 315 | 44 (5.8%) | 1,187 | −0.448 | 1.69 |
| all 315 | 42 (5.5%) | 477 | −1.360 | 0.82 |
| the rules arm, all days | 760 | 1,617 | +0.008 | 1.90 |

- Within an animal, its days with more than 30 late minutes against its own days with none: 573 kcal less eaten (484
  to 662), 301 kcal off the reserves (246 to 355), 0.98 km less walked (34 animals have both kinds of day).
- **By this split the whole shortfall sits in the late mornings.** The 201 animal-days with any late minute carry
  −0.117 of the −0.054% a day; the 559 days with none carry +0.063. On its on-time days the model arm eats more than
  the rules arm (1,722 against 1,617 kcal) and gains reserves: it is making up for the other days and does not make
  up all of it. Different animals and days fall in different rows, so this is an accounting, not an experiment.

**Why the animal stays** (N4, the morning asks). While the light grows the gate asks every few minutes. The rules stay
in the nest at 0.91 to 0.93 of their own decisions between 06:30 and 07:15, at 0.58 between 07:15 and 07:30 and at
0.09 between 07:30 and 07:45; by 07:45 they are up. The model gives the nest 0.89 between 07:15 and 07:30 and 0.77
between 07:30 and 07:45. Once the light is full the gate stops asking for that reason and keeps the act "nest"
without an ask. An animal still in its nest is then asked only when an interrupt comes or the intention grows old,
and at those asks the model gives the nest 0.80 to 0.93 (by the hour, 07:45 to 13:00).

- Asks of an animal in its nest between 07:45 and 13:00: 956. **Staying was the model's top option at 853 (89.2%) and
  the rules' best-valued option on the same menu at 0.** The draw stayed at 800.
- Of the 156 leavings, 93 were draws of an option that was not the model's top (mean probability 0.165), and 100 of
  the 156 were the option "drink".
- Of all 557 risings the model arm's receipts show, **342 (61.4%) were set by a draw that was not the model's top
  option.** In the rules arm 296 of 489 risings were the rules' own decision as the light grew.

**Why the model does not know better** (N10). Stage R11's training file has 3,120 fresh draws of rules worlds. A nest
is in progress at 460 of them. Their labels (the rules' own odds on the nest) are 0.86 to 0.96 between 06:30 and
07:15 and 0.69 between 07:15 and 07:30. Between 07:30 and 07:45 there are 8 draws, all labelled 0 on the nest, and
from 07:45 to 16:00 there is 1. The held-out file has 1 such draw after 07:30, so the offline tables could not show
it. Between 07:15 and 07:30, where the held-out labels give the nest 0.65, the adapter gives it 0.80. The rules are
never in a nest by day, and a model taught only where the rules go has not been shown that a nest by day is to be
left.

**The same asks at ten animals** (N9, stage R11's own receipts; 50 animal-days an arm).

| Arm | Animal-days with an ask in a nest between 07:45 and 13:00 | Staying is the model's top option at those asks |
| --- | --- | --- |
| `p5b-s7-top`, `p5b-s11-top` (the top pick) | 15 and 21 of 50 | 0.85 and 0.96 |
| `p5a-s7-top`, `p5a-s11-top` | 13 and 7 of 50 | 0.82 and 0.97 |
| `p5b-s7-draw-1`, `-draw-2`, `p5b-s11-draw-1` | 5, 3 and 8 of 50 | 0.73, 0.67 and 0.79 |
| `p5a-s7-draw-1`, `p5a-s11-draw-1` | 0 and 4 of 50 | no ask, and 0.75 |
| `old-top`, `old-draw-1` (the first adapter) | 0 and 0 of 50 | no ask |

So the late mornings are a property of both honest-packet recipes and both trainings, they do not need a population,
and the top pick has more of them than the draw. Stage R11's timing card has no row that sees a late rising: an
animal asleep in its nest by day keeps its night in a nest, changes act less and walks less.

## 4. Feeding: more of the waking day, less fruit, the same patches (N1, N5)

- **"Feeds for more of the day" is mostly a shorter day.** Feeding is 258.5 minutes a day against 249.5 (+9.0, +0.8 to
  +17.2). The animal is out of a nest 642 minutes against 696, so feeding is 0.403 of its minutes out of a nest
  against 0.358 (+0.045, +0.036 to +0.054). By the night script's own daylight minutes, where a nest by day is scored
  as rest, the feeding share is 0.359 against 0.351, with an interval that includes 0.
- **Less fruit is fewer daylight minutes in a crown.** Fruit is 1,354 kcal a day against 1,405 (−51, −90 to −12). In
  daylight the model arm feeds in a crown 187.2 minutes against 194.7 and eats at the same 7.13 kcal a minute: −53
  kcal. In twilight and the dark it feeds 6.9 minutes against 3.2 and gets 18 kcal against 16.
- **Ground foods take the place of some of it, at a lower rate.** 64.3 minutes a day against 51.5 (+12.8, +0.7 to
  +24.9) at 3.50 kcal a minute against 4.02 (−0.51, −0.62 to −0.41), and twice the metres walked while at it (34
  against 17). Fruit's share of feeding minutes is 0.756 against 0.810.
- **The patches are the rules' patches.** Visits a day 9.43 against 9.20. Crop at arrival 0.340 fruit units against
  0.345; ripeness 0.963 against 0.965; share already eaten down 0.426 against 0.437; feeders in the crown 1.62
  against 1.64; crop at leaving 0.285 against 0.282. No arrival in either arm is at a crown eaten out. Arrivals at a
  crown holding less than an hour of feeding for one animal are a little more frequent: 0.145 of visits against
  0.122 (+0.022, +0.007 to +0.038).
- **Feeding is not cut short more often.** A visit ends with the animal sated by the feeding act's own rule at 0.579
  of visits against 0.572, with the crown eaten out at 0.052 against 0.045, and by a decision with food left and
  room in the gut at 0.345 against 0.372. Runs cut short that way are 3.59 a day against 3.66 (−0.07, −0.37 to
  +0.23). A visit is a minute shorter (20.7 against 21.7 minutes) and yields 10 kcal less; the gut is fuller when the
  animal leaves (0.845 against 0.807 of the foregut).
- Of the model arm's runs cut short, 27.8% were ended by a draw of an option that was not the model's top after an
  interrupt and 17.9% by such a draw at the act's own end (mean probability of the option 0.182). In the rules arm
  all were ended by a fresh draw of the rules, 51.1% of them after an interrupt.

## 5. Walking: where the half kilometre comes from (N6)

| Ground metres per animal and day | The model arm | The paired rules arm | Difference |
| --- | --- | --- | --- |
| toward a caller | 754 | 407 | +347 (+275 to +420) |
| own trips to food | 794 | 554 | +240 (+146 to +334) |
| trips to food behind a leader | 429 | 572 | −143 (−198 to −87) |
| to water | 306 | 233 | +73 (+38 to +107) |
| play, mating, greeting and other social acts | 108 | 184 | −76 (−143 to −8) |
| all | 2,627 | 2,171 | +456 (+306 to +607) |

Every other kind of act differs by under 20 m a day.

- **Toward a caller.** 2.60 bouts a day against 1.33 (+1.27, +0.99 to +1.54), each about 300 m and 7.7 minutes in both
  arms. Between 07:45 and 17:30 the option is on the menu 6.5 times a day in the model arm and 2.9 times in the rules
  arm. When it is on the menu the draw takes it at 0.38; the rules' own draws take it at 0.35 in the rules arm, and it
  is the rules' best-valued option on the model arm's menus at 0.51. So per offer the model goes no more often than
  the rules; it is offered the walk more than twice as often. Why it is offered more often the records read here do
  not say.
- **Own trips to food.** Trips begun (7.32 against 6.90) and completed (2.07 against 1.92) are the rules', as
  registered. The metres are not: 383 m a day on completed trips against 336, and **403 m a day on trips not
  completed against 210 (+193, +123 to +262)**. A trip not completed is 84 m long against 51. Of those 403 m, 214 m
  are on trips given up for a trip to another tree (115 m in the rules arm). The long ones are ended at the act's own
  end by an ask (251 m a day where the draw took the model's top option, 133 m where it took another); the many trips
  ended by an interrupt are short (11 m and 6 m a day).
- **Behind a leader.** 3.49 bouts a day against 4.43. When the option is on the menu the draw takes it at 0.22; it is
  the rules' best-valued option on those menus at 0.31, and the rules' own draws take it at 0.28.
- **To water.** 0.97 walks a day against 0.75, 316 m each in both arms. "Drink" is what a late animal most often
  draws to leave its nest (section 3).
- **It is walked on the days the animal rose on time.** On those days the model arm covers 2.62 km against the rules
  arm's 1.90; on its late days 2.13 km down to 0.82 km, the later the less. It does not grow with the number of late
  companions: an on-time animal walks 927 m toward callers on days when nobody of its community was late and 749 m
  when more than a fifth were.
- By the clock, 338 m of the extra are between 09:00 and 18:00 (+230 to +446) and 109 m before 09:00.

## 6. Which asks (N7)

48,034 asks, 63.2 per animal and day; the model's answer settled 47,007. The draw took the model's top option at
66.6% of them. It took another option given 0.2 or more at 16.1%, one given 0.1 to 0.2 at 8.7% and one given under
0.1 at 8.6% (5.3 asks per animal and day).

**What is drawn in place of what.** The commonest pairs are a trip to food in place of feeding at a tree (1.30 a
day, mean probability 0.30), a social act in place of rest (1.22), rest in place of a trip to food (0.91), a trip to
food in place of rest (0.90) and grooming in place of rest (0.87). "Drink" in place of the nest is 0.34 a day at a
mean probability of 0.13; more than half of those draws are under 0.1.

**How much of the day those draws hold** (every tick counted to the animal's last decision before it):

| The act in progress was set by | Share of the day | Metres a day | Share of the metres |
| --- | --- | --- | --- |
| an ask, the model's top option drawn | 46.6% | 1,544 | 58.8% |
| an ask, another option given 0.2 or more | 5.7% | 492 | 18.7% |
| an ask, another option given 0.1 to 0.2 | 2.7% | 216 | 8.2% |
| an ask, another option given under 0.1 | 2.4% | 162 | 6.2% |
| the gate kept the act, no ask | 36.6% | 136 | 5.2% |
| the gate turned an arrival into feeding, no ask | 5.6% | 17 | 0.7% |

- **Under 0.1:** 162 m a day, of which 106 m are in a going act drawn where the model's top option was a staying one.
  **From 0.1 to 0.2:** 216 m a day, 170 m of them so. That is the most these draws can carry of the 456 m; the rules
  draw too, and the rules arm has no such record to set beside it.
- **The hour after.** After a day-phase ask whose top option was rest, the next hour holds 186 m when another option
  was drawn against 121 m when the top was. After one whose top was feeding at a tree: 216 m against 128, and 167
  kcal eaten against 184. After one whose top was the nest: 154 kcal eaten against 23. Added over all day-phase asks
  against "top drawn" of the same kind, draws under 0.1 are followed by 61 m more and 24 kcal less eaten a day, draws
  of 0.1 to 0.2 by 16 m and 12 kcal, draws of 0.2 or more by 58 m and 29 kcal. An hour holds about five more asks, so
  these windows overlap: they describe what followed and are not the cost of a draw.
- **The reserves' shortfall does not sit in low-odds draws.** It sits in the late mornings, where the costly option
  is the model's top one, and a low-odds draw is what ends the loss.

## 7. Over the 20 days, and whether the state reaches the model (N8)

| Days | Reserves, % of the store a day: model arm / rules arm | Difference | Eaten, kcal: model arm / rules arm | Late-morning nest minutes |
| --- | --- | --- | --- | --- |
| 1 to 5 | −0.142 / +0.040 | −0.182 (−0.247 to −0.117) | 1,533 / 1,629 | 47.2 |
| 6 to 20 | −0.024 / −0.003 | −0.021 (−0.052 to +0.010) | 1,611 / 1,613 | 33.5 |

- **It levels off, at a lower level.** The reserves stand at −0.75% of the store at the start in both arms. After day
  5 the model arm is at −1.46 and the rules arm at −0.55; after day 20 at −1.82 and −0.60 (−1.22, −1.61 to −0.84).
  Each animal's daily change rises by 0.0064% of the store a day per day in the model arm (+0.0007 to +0.0121).
- **The late mornings do not go away** (28 to 38 minutes a day in every later block of five days). What changes is
  the eating on the other days. The extra walking does not fade either: +0.52 km over days 6 to 20.
- **The state reaches the model, in the direction the probes gave.** At 37,705 day-phase asks with a food option on
  the menu, the model's probability on the food options rises from 0.17 where the day's energy deficit is under 0.1
  to 0.39 where it is 0.8 or more; the rules' best-valued option is a food option at 0.04 and 0.33 of those asks.
  Within an animal, with the deficit held in the same fit, the probability rises by 0.014 per point of reserves
  lower (+0.006 to +0.022) and by 0.017 per 0.1 of deficit (+0.014 to +0.019); the rules' best-valued option by
  0.023 and 0.020. The reserves moved in a narrow band in these 20 days (the middle half of the asks lies between
  −2.30% and −0.60% of the store), so the answer to them alone is small in both.
- **The leanest animals cannot make it up.** The third of the animals with the lowest reserves at the start (−1.77%
  of the store) eat 83 kcal a day less than on the rules (−120 to −46) and lose 0.093% of the store a day against
  them; the other two thirds eat 5 kcal less and 14 kcal more than on the rules and lose 0.043 and 0.047.

## 8. What this reading does not show

- **Cause.** The two arms are different worlds after the first ask. The splits by late morning, by draw and by hour
  are accountings of one run. That a late morning costs the morning's feed is as near to mechanism as the records
  come: the animal is in its nest and eats nothing. That removing the late mornings would bring the reserves to the
  rules' level is not shown.
- **Why callers are on the menu twice as often.** Party size by the field observer is no smaller in the model arm
  (row T-PTY-1 of stage R13's own replay reports, `replay/replay.md` in each run folder: 4.61 against 4.20), and the
  walk does not follow late companions. The calls themselves, who gave them and why, were not read.
- **The nights.** The model arm has 739 of 760 animal-nights in a nest (N1). The others are not read here beyond
  this: the model arm feeds 3.2 minutes a day in a crown in the dark at 0.23 kcal a minute.
- **Other seeds and the second training.** One world seed, one training of the recipe. Section 3's table at ten
  animals says the second training has the late mornings too; nothing here says how large they are in a population.
- A record's act is the one after the tick's decisions, so a metre walked in the tick an act changes is counted to
  the new act. This moves a few metres between rows and none between arms.

## 9. Candidate changes this reading supports

None is chosen to hit a rate, and none was tried.

1. **Teach the adapter the states its own population reaches.** Label the model arm's own saved contexts (48,034, of
   them the 956 late-morning asks) with the rules' own odds by stage R11's labeller, and add them to the training
   file. Rests on: the training file has 1 draw of a nest in progress after 07:45; the model gives the nest 0.80 to
   0.93 there; the rules' best-valued option is the nest at 0 of 956. Refuted if the rules' own odds at those
   contexts, once computed, also favour the nest, or if an adapter retrained with them still gives the nest more
   than the label there on held-out draws of the same kind. Labelling, and scoring the present adapter's logged odds
   against the labels, need no model.
2. **Read rising before any population run on the top pick.** Stage R13's registered next step is a population run on
   the top pick. Rests on: staying is the model's top option at 89.2% of the late asks; 61.4% of this run's risings
   were draws off the top; at ten animals the top-pick arms have more late mornings than the draw arms. Refuted if a
   top-pick run shows the animals up by 07:45 as often as the rules. "Up by 07:45" and "daylight minutes in a nest"
   can be read from any saved run with no model.
3. **Let the loop ask again when an animal is in a nest in full light.** Today the gate keeps "nest" without an ask
   once the light stops growing. Rests on: the acts "nest" kept by the gate after 07:30 (N4). It would give a drawing
   model more chances to leave; it would not help a top pick whose top option is to stay. Refuted if the stay, not
   the wait, is what holds the animal: the draw stayed at 800 of the 956 late asks. This is a change to the loop and
   would need its own registration.
4. **For the walking, nothing yet.** The record supports no change: per offer the model walks toward a caller no
   more often than the rules. The next reading is of the calls: who calls, how often, and why the option reaches the
   menu twice as often.

## 10. Files

- `scripts/lib/r14-trace.ts`, `scripts/r14-trace.ts`: the read-only tap and the replay that writes a trace.
- `scripts/lib/r14-read.ts`, `scripts/lib/r14-collect.ts`, `scripts/r14-energy.ts`: the readers and the report.
- `tests/r14-energy.test.ts`: the pure readers (6 tests; the only test file run).
- `docs/staging/r14-diag-energy-numbers.md`: the generated tables.

Not committed: the traces under `artifacts/r14/energy/` (1.5 GB; rebuilt by the commands above in two minutes).
