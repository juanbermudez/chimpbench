# EY follow-up: why juveniles starve in years two and three at a swallowed share of 0.5

Branch `juv-starve` (from track-e b6e35dc), 7 October 2026. Diagnosis only: nothing under `src/` or `data/` changes, no
parameter moves, no input is proposed for tuning. Question and the result it follows: `e-years-prereg.md` §7. Every
number below is printed by `scripts/ey-juv/analyse.py` (tables T0 to T9 in §10, its output pasted as printed); the prose
quotes them.

## 1. The answer

**The animals that starve are the first infants the simulation itself weans.** Weaning is a clock: each animal gets a
weaning age of 4.1 to 5.2 y when it is created, and on that day its milk stops. A 16 to 17 kg animal then has to live on
a gut that, in this ledger, can pass about as much energy as it spends and no more. It eats ten hours a day, nearly all
of it at a full gut, runs up to 50 kcal a day short, and dies 194 to 670 days later (median 487), at 5.2 to 6.5 y, which
is why the deaths are counted as juveniles.

- **Who.** All 12 juvenile starvation deaths are three founders, ids 22, 37 and 21: the three oldest infants at the
  start (3.58, 3.08 and 2.58 y), so the first three to reach their weaning age in every seed (T1, T2). Of the founders
  weaned in the run a year or more before its end, 10 of 22 starved at 0.5. Of the founder juveniles already weaned at
  the start (6 animals in each of 10 seed-runs), none did (T2).
- **Why not year one.** The founders' juveniles are created at their reserve set point and on the growth curve, as if
  weaning had gone well; the youngest is 5.6 y. No founder is weaned before scored day 215, so a 12-month run never
  holds an animal weaned for more than 150 days, and the fastest death took 194. The process was already running in
  year one: on day 365 the one weaned animal (id 22, in the two seeds that drew her an early weaning age) stands at
  −0.40 of her store at 0.5, against −0.09 for the same animal in the seeds where she is still on milk (T3).
- **Why 0.5 and not 0.25.** It is the same hole, less deep. At 0.25 the same animals fall to −0.88 at the lowest; of
  the 47 alive at the end, 12 are below −0.5 of their store (mean −0.32; at 0.5: 33 alive, mean −0.47, 15 below −0.5, 6
  below −0.8) (T2, T5). Spitting out more pith fibre raises what a full gut passes by about 45 kcal a day on a diet
  with 30% fallback (T9), which turns a steady loss into a loss in lean months and a partial recovery after them.
  Nobody reached the end of the store in three years; one came within 0.12 of it.

## 2. The explanations, ranked

| rank | explanation | verdict | confidence | evidence |
| --- | --- | --- | --- | --- |
| 1 | **(c) a cohort effect: the same individuals losing a provisioning relationship** | **Yes: this is who and when.** Weaning by the clock, first met by the model's own infants after year one. | high (about 90%) | 12 of 12 deaths are founders weaned in the run; 0 of 60 founder juveniles (T1, T2). Same animal on day 365: weaned −0.40, on milk −0.09 (T3). Year pattern follows the weaning days: year 1: 0 deaths, year 2: 1, year 3: 11 (T1). |
| 2 | **(d) a mechanism in the ledger specific to small weaned animals** | **Yes: this is why they cannot cope, and why the share matters.** Gut capacity scales with body mass, needs with mass^0.75 plus growth and its own travel. | high that the gut binds at this size; moderate that 0.25 "covers" it (it does not: it slows it) | Most a gut can pass on fruit alone, eating every free minute of a 12-hour day, ÷ what the animal spends: 1.03 at 16 kg, 1.10 at 23 kg, 1.16 at 28 kg, 1.32 for an adult female. With 30% fallback: 0.94 at 0.5, 0.99 at 0.25 (T9). Measured: weaned id 22 eats 612 to 635 min a day, 90% of them at a full foregut, and absorbs 795 to 859 against 845 to 865 spent (T4). |
| 3 | **(e) something else** | Three things, none a rival cause. (i) The valuation trap of E1r is there but comes second: id 37 is 29 to 40 kcal a day short in its first 70 days weaned with 1 to 3% fallback; id 22, depleted, is at 39%, falling to 13%. (ii) The class tables hide it: a weaned 4-year-old is counted with nursing infants of 2 to 5 y, then dies as a "juvenile". (iii) The three newborn starvation deaths (1 at 0.5, 2 at 0.25) are a separate matter, the same at both shares, and cannot be identified from the saved outputs. | moderate | T4; `scripts/lib/energy-probe.ts`:119–128; T1 |
| 4 | **(b) a harder lean season in one calendar year** | **Not the cause of the year pattern; it sets the pace.** | low as the cause (about 10%) | Each seed reads four record years (seed 48: 2011 to 2014; seeds 7 and 5: 2000 to 2003; 21: 2014 to 2017; 11: 2006 to 2009; no resampling). In the two seeds with 9 of the 12 deaths year one's leanest 30 days are as lean as later years' (seed 21: 1.37 M kcal against 1.55 and 1.85; seed 48: 1.26 against 2.14 and 1.12) and nobody died in year one; only seeds 7 and 5 have leaner later years (1.46 to 1.72 against 2.21 to 2.32), with one death each. Deaths fall in seven different months (T7). But depleted animals lose fastest in lean stretches: four of seed 48's six deaths come within 150 days of a block at 0.36 to 0.39 of the mean crop (T1), and at 0.25 id 37 there recovers to −0.06 and drops to −0.32 in the next trough (T5). |
| 5 | **(a) more animals on the same food** | **Not supported.** | low (about 10%) | Adults show no squeeze from year 1 to 3: adult males net 0 kcal a day and a full gut in 3 to 4% of daylight every year; nursing mothers' lowest reserve −0.106, −0.091, −0.119. The 0.25 runs grow as much (45 to 53 and 55 animals in the class readout, against 54 and 52) with no juvenile death. The deficit starts on the day of weaning with communities of 24, 19 and 11 (22, 15 and 12 at the start) (T4, T6). A small year-three dip in females without infants (−0.045 to −0.086) is the same at both shares and cannot be told from that year's lean season. |

## 3. What would settle the top two

- **(d) is settled here, offline:** table T9 is that check (stage E1u's gut-ceiling tool on the animals of the saved
  day-365 world, no tick, seconds). The gut's margin over spending falls with body size and reaches about nothing at 16 kg.
- **(c), one short run, not done because it is a new arm:** continue seed 48's day-365 world for 120 days at 0.5 twice,
  the only difference being id 37's stored weaning age (as saved, day 411, against after the window). It is an edit of
  one animal's state for diagnosis, not an input change; about three minutes each. If weaning is the cause, the
  unweaned copy keeps a gut that is rarely full and ends the window with more of its store than the weaned one, which
  goes 29 to 40 kcal a day short at a gut full in 47 to 61% of its eating minutes (T4). The natural version of this
  test already exists (T3, the same animal across seeds), which is why confidence is high without it; the 120-day
  windows of seed 7 alone are not clean enough (§7).

## 4. Does this argue for 0.25 as the working base?

Not by itself. The 2-against-13 count looks like a clean difference, but it is a difference in how fast the same
animals sink: at 0.25 a quarter of the weaned cohort is below half its store on day 1,095, and one animal reached
−0.87 before recovering (T5). A longer run would probably starve some of them too; that is a forecast, not a result.
Picking the share by the starvation count would be tuning an unmeasured input to a behavioural rate. What the result
does say: **both bases carry the same defect, and no run of 12 months or less can show it.** Any comparison that
touches juveniles, weaning, birth intervals or population growth should either run past two and a half years or say
that it cannot see this.

## 5. The mechanism in the code

File and line at this branch's head; `energy.ts`, `generation.ts` and `phenology.ts` are unchanged since the runs'
commit (ff25953), `life.ts`, `candidates.ts` and `execution.ts` have later lines added above these.

1. **Weaning is a clock.** `src/sim/generation.ts`:112–113: `weanAge = weanAgeMinY + r() × weanAgeSpanY` at creation.
   `src/sim/life.ts`:277–282: when the age passes it the animal is weaned, and its mother stops lactating unless she
   has a younger infant. Nothing reads the animal's size, reserves or feeding skill.
2. **Milk runs at full yield to that day, then stops.** The gland fills at `ledgerMilkYieldCoef` × the mother's
   mass^0.75 whatever the infant's age (`src/sim/energy.ts`:150, 577): at most 307 kcal a day, 54% of the resting need
   of a 16.5 kg animal (T8). Measured, the 3 and 4-year-olds on milk drink 256 to 309 kcal a day in seed 48 and feed
   themselves for 104 to 159 minutes (T4). After weaning the gland is dry (`energy.ts`:440–441, 577) and nursing is no longer offered
   (`src/sim/candidates.ts`:395, `src/sim/execution.ts`:1030).
3. **The gut is sized by body mass, the need is not.** Foregut and hindgut capacity are `digestaGutMlPerKg` × mass
   (`energy.ts`:133–134, 243–246); the foregut empties only as fast as its fibre fits in the hindgut (`energy.ts`:546–551)
   and `eat` takes only what fits (`energy.ts`:715–716). Resting spending is `ledgerRmrCoef` × mass^0.75
   (`energy.ts`:561–566), growth is charged on top at the potential (`energy.ts`:579–594), and so is every metre walked
   and climbed (`energy.ts`:611–620). So gut capacity per kcal of resting need is 0.85 of an adult female's at 16.5 kg (T8).
4. **Across weaning (id 37, seed 48, 0.5; T4).** Milk 309 → 0 and plant food handed by the mother 47 → 0 kcal a day.
   It makes up all of it by eating: 150 → 383 minutes, absorbed 839 → 884. But spending rises 832 → 924, of which
   walking and climbing 54 → 103 (2.3 → 4.9 km a day on its own legs), and the foregut is full in 61% of its eating
   minutes within 70 days. Net +7 → −40 kcal a day.
5. **The spiral.** Growth is paid in proportion to the relative store (`growYield` 1, `energy.ts`:523–528), so a depleted
   animal grows less (id 22 is paid 16 to 20 of 41.9 kcal a day at 0.5, 28 to 30 at 0.25) and stays at the size where the
   gut binds. Below about −0.3 the valuation trap of `e1r-prereg.md` §9.6 adds fallback, the food the gut passes least
   energy from.
6. **Death.** `energy.ts`:826–830 (`ledgerSlow`: reserves at minus the store, the store being `ledgerReserveKcalPerKg` ×
   mass, `energy.ts`:221) and `life.ts`:267–268, 287–290. All 12 reached the end of the store (lowest reserve in the group
   −0.994 to −0.997, T1).
7. **Why the share matters.** `energy.ts`:115–120 (`swallowed`): at a lower share each kcal of fallback brings less dry
   matter and fibre, so more fits in the foregut and the hindgut clears it sooner. It only acts through the fallback
   eaten, and only on an animal already at its gut's limit.
8. **Why the founders hide it.** `energy.ts`:258–269 (`ledgerOf`): a founder's reserves open at the set point and its mass
   on the growth curve. The founding juveniles never went through the model's own weaning.
9. **Phenology years.** `src/sim/phenology.ts`:142 (the seed's start year in the record, a hash of the seed), 147 and
   219–220 (calendar year of the run from the day), 150–153 (record year; resampled only past the record's end).

## 6. What is missing or wrong, and what evidence a fix would need

No input should be moved to stop these deaths. The finding points at two modelling gaps, both about the step from
infant to juvenile, with field numbers that are targets and already in `docs/research.md`:

- **Weaning as an event instead of a process.** Field: the milk signal is largest at 1 to 2 y, declines from about 1 to
  1.5 y and ends at 4 to 4.5 y, with nipple contact lasting longer (badescu2017, badescu2022); feeding time rises
  fastest up to 5 y and reaches the mothers' level after 6 y (lonsdorf2021); weaned age 4.71 ± 1.04 y, range 2.82 to
  8.01 (lonsdorf2020). The model's 4-year-old still takes 223 to 309 kcal a day of milk and feeds itself for about two and a
  half hours (150 to 177 min), then loses the milk in a day (T4). A fix would make the end of milk an outcome (of the mother's supply and decisions and
  of what the young animal can feed itself) and would need: a lactation course from data, not a fitted taper (no
  chimpanzee milk yield exists; the registry's is the human one scaled by mass); a readout of milk's share of intake and
  of self-feeding minutes by age, judged against the three targets above; and runs of three years or a founding
  population whose juveniles are not placed at the set point.
- **One gut for all sizes.** Capacity per kg, passage and fibre digestibility are adult values, all "assumed" in the
  registry (`e1u-prereg.md` §5.5, §6.3 lists what no study gives). Under them a 16 kg animal has no margin on the best
  diet (T9), and an unweaned 11 kg orphan at 0.25 eats eight hours a day (485 min) and still dies (T4, P2). Whether young chimpanzees have a
  relatively larger gut, faster passage or a richer diet than adults is not in `docs/research.md`; a fix needs that
  measurement (or an ape analogue) and wild body mass at weaning, since the growth potential here is the captive one.
- Not established here: which of the two matters more. Removing the cliff alone would lower the body mass at which the
  animal must cope; a larger juvenile gut alone would leave the cliff. That needs its own registered test.

## 7. What the data could not show

- The three-year runs wrote no end world and no per-animal record, so identity, day and cause of each death are
  inferred from survivor lists and group counts (method above T1). For four deaths in seed 48 the order of ids 37 and
  21 is unknown; both died.
- Community size and the mother's state are known on day 365 only (and to day 484 in seeds 48 and 7), not on the day
  of death.
- The per-animal budgets cover 120 days of two seeds, one `rngSalt`, from late October to late February. In that
  window the 4-year-olds still on milk in seed 7 also slip (to −0.10 to −0.15), so the 120 days alone do not separate weaned
  from unweaned by reserves; the separation is in T2, T3 and T5 over longer spans, and in how full the gut is.
- The three newborn starvation deaths: no identity, no date.
- T9's ceiling assumes non-stop feeding for 12 hours on a fixed diet; real animals travel and wait, so the true
  margin is smaller at every size.

## 8. Run log

Written before any run (first commit of this branch, 894dd1e), kept as registered; results added below it.

**What the saved outputs cannot give.** The three-year parts hold class readouts and group sums, no per-animal record,
and no end checkpoint. They show who died and when (group counts, survivors) but not the energy budget of one animal
after it is weaned: milk lost, energy absorbed against energy spent by term, eating minutes, the share of the day with
a full gut, the fallback share. Those are the variables explanation (d) is about.

**What was checked first, without a run.** The first 365 scored days of every three-year seed-run are equal, float for
float, to the 12-month run with the same seed, share and `rngSalt` (class reserve trajectories; T0). So the 12-month
end checkpoints (`bench-e1v/…/M12-W50`, `M12-W25`, day 395) are the three-year runs' worlds at scored day 365.

**Why not `e-bench --resume … --animal-days`.** A resume is refused unless it shares the checkpoint's settings
(`scripts/lib/bench-run.ts` `settingsOf`), and the checkpoints were made without the per-animal readout. So
`scripts/ey-juv/resume-probe.ts` loads the checkpoint's world and drives the same readout (`scripts/lib/energy-probe.ts`,
`animalDays`) over it with `tickWorld` only: no parameter change, no observer (the observer and the field experiments
never write the world: `bench-run.ts` runs the experiments on copies). The sim code is imported from the frozen
checkout `bench-y3` (src tree e88a533e, the checkpoints' own), read only. Outputs go to this worktree's
`artifacts/validation/ey-juv/` (gitignored). Check on each result: its class reserve trajectories must equal the saved
three-year run's on scored days 365 to 484.

| run | checkpoint | simulated days | what it is meant to show |
| --- | --- | --- | --- |
| P0 | M12-W50, seed 48, day 395 | 1 | smoke run: the script loads the world, the readout writes rows, the trajectory check passes on day 365 |
| P1 | M12-W50, seed 48, day 395 | 120 | the budget of the one weaned animal under 6 y (id 22, weaned on about day 223) at 0.5, and of id 37 before and after its weaning (due about day 413), against the older juveniles and the unweaned of the same age |
| P2 | M12-W25, seed 48, day 395 | 120 | the same animals at 0.25: which term differs |
| P3 | M12-W50, seed 7, day 395 | 120 | the same two animals where the seed drew later weaning ages (both still on milk in the window): the control |
| P4 | M12-W25, seed 7, day 395 | 120 | the control at 0.25 |

Seeds 48 and 7 only, `rngSalt` 0, at most two jobs at a time, `uptime` and swap checked before each launch (no launch
above 6 GB of swap used). Nothing longer, no other arm.

**Results.** P0 passed (rows written, day 365 equal to the saved run). P1 and P2 ran together, P3 and P4 one after
the other; swap used was 2.6 GB before P1 and P2, 5.1 GB before P3, 5.1 GB before P4, 4.7 GB after. All four equal the
saved three-year runs on scored days 365 to 484 (T0). Not registered above and added after P1 to P4: the offline
ceiling of T9 (`scripts/ey-juv/ceiling.ts`; no tick).

## 9. How to reproduce

```sh
Y=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-y3                      # frozen checkout, src tree e88a533e
R=$Y/artifacts/validation/e/runs
M=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/bench-e1v/artifacts/validation/e/runs
O=artifacts/validation/ey-juv
node scripts/ey-juv/ckpt-roster.mjs $M/M12-W*/parts/*.ckpt-d395.v8.gz > $O/roster-m12.jsonl
/usr/bin/python3 scripts/ey-juv/slim.py $O/slim-y3.json $R/Y3-W50 $R/Y3-W50-s1 $R/Y3-W25 $R/Y3-W25-s1
/usr/bin/python3 scripts/ey-juv/slim.py $O/slim-m12.json $M/M12-W50 $M/M12-W50-s1 $M/M12-W50-s2 $M/M12-W50-s3 $M/M12-W25 $M/M12-W25-s1 $M/M12-W25-s2 $M/M12-W25-s3
pnpm exec tsx scripts/ey-juv/phenology-years.ts --root $Y --params $R/Y3-W50/params.json --out $O/phenology.json
pnpm exec tsx scripts/ey-juv/resume-probe.ts --root $Y --ckpt $M/M12-W50/parts/M12-W50.s48.ckpt-d395.v8.gz --days 120 --out $O/P1.json.gz   # P2: M12-W25 s48; P3: M12-W50 s7; P4: M12-W25 s7
pnpm exec tsx scripts/ey-juv/ceiling.ts --root $Y --ckpt $M/M12-W50/parts/M12-W50.s48.ckpt-d395.v8.gz --ids 48,22,37,35,19,10,1 --out $O/ceiling.json
/usr/bin/python3 scripts/ey-juv/analyse.py > $O/tables.md        # §10 is this file, headings one level down
```

(node, pnpm and tsx under `fnm exec --using=22.22.3 --`.)


---

## 10. Tables (output of `scripts/ey-juv/analyse.py`)

Printed by `scripts/ey-juv/analyse.py` from the saved runs (read only) and four 120-day continuations. Scored day 0 is 28 October of the run's first calendar year (30-day burn-in from 28 September).

### T0. Checks

- Three-year seed-runs whose first 365 scored days equal the 12-month run of the same seed, share and rngSalt (seven class reserve trajectories, float for float; same src tree): **20 of 20**.
- P1 (seed 48, swallowed 0.5, scored days 365 to 484, 185 s): class reserve trajectories equal to Y3-W50 on the same days: **yes**; src tree e88a533e; deaths in the window: none.
- P2 (seed 48, swallowed 0.25, scored days 365 to 484, 178 s): class reserve trajectories equal to Y3-W25 on the same days: **yes**; src tree e88a533e; deaths in the window: {"infant 2–5 y: orphaned infant, did not survive without its mother": 1, "infant 0.5–2 y: illness": 1}.
- P3 (seed 7, swallowed 0.5, scored days 365 to 484, 125 s): class reserve trajectories equal to Y3-W50 on the same days: **yes**; src tree e88a533e; deaths in the window: none.
- P4 (seed 7, swallowed 0.25, scored days 365 to 484, 394 s): class reserve trajectories equal to Y3-W25 on the same days: **yes**; src tree e88a533e; deaths in the window: {"infant < 0.5 y: orphaned infant, did not survive without its mother": 1}.
- Starvation deaths by share and class over the 10 seed-runs each: 0.5: juvenile 5–12 y 12; 0.5: infant < 0.5 y 1; 0.25: infant < 0.5 y 2.

### T1. Every starvation death of the three-year S39 runs

Identity, day and cause are inferred, not recorded (the three-year runs wrote no end world): survivors are listed in each part; a death inside a juvenile group is the day the group's saved count falls below the count expected from birthdays and weaning ages; the starvation deaths are the ones in the groups whose lowest individual reserve reached the end of the store. Where two dead animals were in one group the order is not recoverable ("or"). Community, its size, the mother and a younger sibling are read from the day-365 checkpoint of the same seed, share and rngSalt. "Crop" is the ripe crop inside the opening ranges in the death's 30-day block ÷ the seed's three-year mean (and the lowest of the five blocks ending there).

| run | seed | animal | sex | weaned on day (age) | died on day | date, run year | age at death | days weaned | community (size, day 365) | mother alive, younger sibling (day 365) | lowest reserve in its group | animals in class readout, start → that day | crop (lowest of last 5 blocks) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Y3-W50 | 48 | id 22 | F | 222 (4.19 y) | 756 | Nov 23, year 3 | 5.65 y | 534 | 1 (24) | yes, born day 223 | -0.995 | 45 → 51 | 1.24 (0.69) |
| Y3-W50 | 48 | id 37 or id 21 | M/M | 411 (4.21 y) / 749 (4.63 y) | 943 | May 29, year 3 | 5.66 y / 5.16 y | 532 / 194 | 2 (19) / 1 (24) | yes, none / yes, none | -0.996 | 45 → 54 | 0.43 (0.36) |
| Y3-W50 | 48 | id 37 or id 21 | M/M | 411 (4.21 y) / 749 (4.63 y) | 970 | Jun 25, year 3 | 5.74 y / 5.24 y | 559 / 221 | 2 (19) / 1 (24) | yes, none / yes, none | -0.996 | 45 → 53 | 0.69 (0.36) |
| Y3-W50 | 7 | id 21 | M | 661 (4.39 y) | 1021 | Aug 15, year 3 | 5.38 y | 360 | 1 (24) | yes, none | -0.994 | 45 → 50 | 0.56 (0.56) |
| Y3-W50 | 21 | id 22 | F | 384 (4.63 y) | 746 | Nov 13, year 3 | 5.62 y | 362 | 1 (23) | yes, none | -0.997 | 45 → 51 | 1.25 (0.63) |
| Y3-W50 | 21 | id 37 | M | 481 (4.40 y) | 943 | May 29, year 3 | 5.66 y | 462 | 2 (16) | yes, none | -0.995 | 45 → 52 | 0.93 (0.58) |
| Y3-W50 | 11 | id 22 | F | 215 (4.17 y) | 885 | Apr 1, year 3 | 6.01 y | 670 | 1 (23) | yes, none | -0.996 | 45 → 52 | 0.98 (0.52) |
| Y3-W50-s1 | 48 | id 22 | F | 222 (4.19 y) | 735 | Nov 2, year 3 | 5.59 y | 513 | 1 (25) | yes, born day 223 | -0.996 | 45 → 53 | 1.19 (0.69) |
| Y3-W50-s1 | 48 | id 37 or id 21 | M/M | 411 (4.21 y) / 749 (4.63 y) | 963 | Jun 18, year 3 | 5.72 y / 5.22 y | 552 / 214 | 2 (18) / 1 (25) | yes, none / yes, none | -0.996 | 45 → 53 | 0.69 (0.36) |
| Y3-W50-s1 | 48 | id 37 or id 21 | M/M | 411 (4.21 y) / 749 (4.63 y) | 1011 | Aug 5, year 3 | 5.85 y / 5.35 y | 600 / 262 | 2 (18) / 1 (25) | yes, none / yes, none | -0.996 | 45 → 53 | 0.97 (0.39) |
| Y3-W50-s1 | 21 | id 22 | F | 384 (4.63 y) | 641 | Jul 31, year 2 | 5.34 y | 257 | 1 (23) | yes, none | -0.995 | 45 → 49 | 0.63 (0.49) |
| Y3-W50-s1 | 5 | id 22 | F | 464 (4.85 y) | 1073 | Oct 6, year 3 | 6.52 y | 609 | 1 (24) | yes, born day 252 | -0.995 | 45 → 53 | 1.06 (0.52) |
| Y3-W50-s1 | 11 | a newborn (infant < 0.5 y), not identifiable: born in the run, no per-animal record | ? | not weaned | ? | ? | under 0.5 y | — | ? | ? | -1.000 (group 0–0.5 y) | 45 → ? | ? |
| Y3-W25 | 11 | a newborn (infant < 0.5 y), not identifiable: born in the run, no per-animal record | ? | not weaned | ? | ? | under 0.5 y | — | ? | ? | -0.999 (group 0–0.5 y) | 45 → ? | ? |
| Y3-W25-s1 | 21 | a newborn (infant < 0.5 y), not identifiable: born in the run, no per-animal record | ? | not weaned | ? | ? | under 0.5 y | — | ? | ? | -0.999 (group 0–0.5 y) | 45 → ? | ? |

Juvenile starvation deaths by year of the run: swallowed 0.5: year 1: 0, year 2: 1, year 3: 11; swallowed 0.25: year 1: 0, year 2: 0, year 3: 0.
By animal: id 21: 1, id 22: 6, id 37: 1, id 37 or 21: 4. Days from weaning to death: 194 to 670 (median 487, both candidates counted where the order is unknown).

### T2. Who was exposed: founders by when they were weaned

The 14 founders under 12 y are the same animals in every seed (ids, ages, sexes, mothers); only the weaning age differs by seed (4.1 to 5.2 y, drawn at creation). "Weaned in the run" = unweaned at scored day 0 and past its weaning age before day 1,095. End reserve = reserves ÷ store on day 1,095 (the part's dyads).

| share | group | animal-runs | starved | died of another cause | alive at day 1,095 | their end reserve: mean (lowest) | alive below −0.5 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5 | weaned before the start (5.6 to 11.1 y at day 0) | 60 | 0 | 2 | 58 | not in the part (no reserve is saved for them) | — |
| 0.5 | weaned in the run, 365 days or more before its end | 22 | 10 | 2 | 10 | -0.56 (-0.90) | 6 |
| 0.5 | weaned in the run, under 365 days before its end | 26 | 2 | 1 | 23 | -0.43 (-0.91) | 9 |
| 0.5 | still unweaned at day 1,095 | 32 | 0 | 6 | 26 | -0.04 (-0.36) | 0 |
| 0.25 | weaned before the start (5.6 to 11.1 y at day 0) | 60 | 0 | 1 | 59 | not in the part (no reserve is saved for them) | — |
| 0.25 | weaned in the run, 365 days or more before its end | 22 | 0 | 0 | 22 | -0.33 (-0.71) | 6 |
| 0.25 | weaned in the run, under 365 days before its end | 26 | 0 | 1 | 25 | -0.32 (-0.66) | 6 |
| 0.25 | still unweaned at day 1,095 | 32 | 0 | 5 | 27 | -0.04 (-0.24) | 0 |

The founders unweaned at scored day 0, oldest first (age at day 0, the same in every seed): id 22 F 3.58 y, id 37 M 3.08 y, id 21 M 2.58 y, id 48 F 2.08 y, id 20 M 1.88 y, id 34 F 1.28 y, id 18 M 0.88 y, id 49 M 0.58 y. Communities at creation (every seed): 1: 22 animals, 2: 15 animals, 3: 12 animals.

Weaning days of the cohort by seed (scored day; age at weaning), in order of weaning:

- seed 48: id 22 day 222 (4.19 y), id 37 day 411 (4.21 y), id 21 day 749 (4.63 y), id 48 day 969 (4.74 y), id 20 day 1113 (4.93 y), id 49 day 1410 (4.44 y), id 34 day 1412 (5.15 y), id 18 day 1425 (4.78 y)
- seed 7: id 37 day 498 (4.44 y), id 22 day 533 (5.04 y), id 21 day 661 (4.39 y), id 48 day 821 (4.33 y), id 20 day 885 (4.30 y), id 34 day 1124 (4.36 y), id 18 day 1379 (4.66 y), id 49 day 1685 (5.20 y)
- seed 21: id 22 day 384 (4.63 y), id 37 day 481 (4.40 y), id 21 day 843 (4.89 y), id 20 day 866 (4.25 y), id 48 day 994 (4.80 y), id 34 day 1185 (4.53 y), id 18 day 1240 (4.28 y), id 49 day 1654 (5.11 y)
- seed 5: id 22 day 464 (4.85 y), id 37 day 542 (4.57 y), id 21 day 743 (4.62 y), id 20 day 916 (4.39 y), id 48 day 963 (4.72 y), id 34 day 1284 (4.80 y), id 18 day 1367 (4.63 y), id 49 day 1567 (4.87 y)
- seed 11: id 22 day 215 (4.17 y), id 37 day 508 (4.47 y), id 21 day 926 (5.12 y), id 48 day 940 (4.66 y), id 20 day 947 (4.47 y), id 18 day 1203 (4.18 y), id 34 day 1427 (5.19 y), id 49 day 1581 (4.91 y)

Founders weaned inside the first 365 scored days, per seed (48, 7, 21, 5, 11): 1, 0, 0, 0, 1. The earliest such weaning is day 215, so no 12-month run holds an animal weaned for more than 150 days; the shortest time from weaning to a starvation death in T1 is 194 days.

### T3. The same animal weaned or not: id 22 at scored day 365 (40 checkpoints of the 12-month runs)

Id 22 is 4.58 y on day 365 in every seed, with the same mother and community; the seed's draw of her weaning age decides whether she is still on milk. Reserves ÷ store at day 365, rngSalt 0 to 3.

| seed | weaning age | weaned on day | days weaned at day 365 | swallowed 0.5 | swallowed 0.25 |
| --- | --- | --- | --- | --- | --- |
| 48 | 4.19 y | 222 | 143 | -0.49 / -0.41 / -0.53 / -0.48 | -0.29 / -0.39 / -0.38 / -0.42 |
| 7 | 5.04 y | 533 | on milk | -0.07 / -0.16 / -0.17 / -0.19 | -0.09 / -0.16 / -0.07 / -0.09 |
| 21 | 4.63 y | 384 | on milk | -0.03 / -0.04 / -0.02 / -0.04 | -0.03 / -0.02 / -0.06 / -0.05 |
| 5 | 4.85 y | 464 | on milk | -0.06 / -0.13 / -0.11 / -0.11 | -0.08 / -0.15 / -0.14 / dead (respiratory illness (outbreak)) |
| 11 | 4.17 y | 215 | 150 | -0.31 / dead (respiratory illness (outbreak)) / -0.29 / -0.30 | -0.12 / -0.19 / -0.19 / -0.20 |

Mean (n): swallowed 0.5: weaned -0.40 (7), on milk -0.09 (12); swallowed 0.25: weaned -0.27 (8), on milk -0.09 (11).

Every living animal at day 365 by state (all 40 checkpoints; reserves ÷ store, mean and lowest):

| state at day 365 | body mass, kg | swallowed 0.5: n, mean (lowest) | swallowed 0.25: n, mean (lowest) |
| --- | --- | --- | --- |
| on milk, under 2 y | 4.1 | 126, -0.05 (-0.75) | 127, -0.04 (-0.69) |
| on milk, 2 to 5 y | 13.0 | 107, -0.04 (-0.19) | 109, -0.05 (-0.68) |
| weaned in the run, 4 to 5 y (id 22) | 16.3 | 7, -0.40 (-0.53) | 8, -0.27 (-0.42) |
| founder juvenile, 6 to 8 y (ids 35, 17) | 23.9 | 40, -0.11 (-0.31) | 40, -0.08 (-0.22) |
| founder juvenile, 8 to 12 y | 34.1 | 59, -0.03 (-0.16) | 60, -0.02 (-0.15) |
| adolescent, 12 to 15 y | 35.1 | 80, -0.05 (-0.25) | 79, -0.03 (-0.14) |
| adult female | 31.3 | 331, -0.03 (-0.21) | 333, -0.03 (-0.16) |
| adult male | 39.0 | 290, -0.00 (-0.03) | 285, -0.00 (-0.04) |

### T4. Budgets across weaning: the four 120-day continuations (scored days 365 to 484, Oct 28 to Feb 24)

Per animal-day (ids 22 and 37 in 40-day blocks, the others over the window), from the per-animal readout (`animalDays`). Absorbed = energy in − passed out; spent = all terms; "full" = share of eating minutes ending with the foregut at least 0.95 full; "hindgut full" = share of daylight with the hindgut at least 0.95 full; fallback = share of plant energy handled; growth paid against the potential (41.9 kcal/d for a female, 46.8 for a male).

**P1: seed 48, swallowed 0.5.** Communities at the start → end of the window: 1: 24 → 24, 2: 19 → 19, 3: 11 → 11.

| animal | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk | plant food handed by the mother | eating min | full | hindgut full | fallback | growth paid | walking + climbing | km on the ground |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 22 (F) | 365–404 | 4.69 y, 16.3 | weaned | -0.58 | 795 | 845 | -50 | 0 | 0 | 635 | 90% | 40% | 39% | 20 | 68 | 3.6 |
| id 22 (F) | 405–444 | 4.80 y, 16.5 | weaned | -0.63 | 818 | 852 | -33 | 0 | 0 | 634 | 91% | 40% | 26% | 17 | 70 | 3.8 |
| id 22 (F) | 445–484 | 4.91 y, 16.6 | weaned | -0.64 | 859 | 865 | -6 | 0 | 0 | 612 | 90% | 39% | 13% | 16 | 78 | 4.1 |
| id 37 (M) | 365–404 | 4.19 y, 16.6 | on milk | -0.01 | 839 | 832 | +7 | 309 | 47 | 150 | 3% | 0% | 10% | 46 | 54 | 2.3 |
| id 37 (M) | 405–444 | 4.30 y, 17.0 | weaned on day 411 | -0.07 | 865 | 894 | -29 | 53 | 0 | 292 | 47% | 17% | 1% | 45 | 91 | 4.0 |
| id 37 (M) | 445–484 | 4.41 y, 17.4 | weaned | -0.14 | 884 | 924 | -40 | 0 | 0 | 383 | 61% | 24% | 3% | 43 | 103 | 4.9 |
| id 48 (F) | 365–484 | 3.41 y, 12.7 | on milk | -0.02 | 640 | 641 | -1 | 309 | 10 | 104 | 2% | 0% | 5% | 41 | 18 | 0.4 |
| id 35 (F, founder juvenile) | 365–484 | 6.91 y, 24.2 | weaned | -0.07 | 1150 | 1151 | -1 | 0 | 0 | 215 | 26% | 9% | 1% | 40 | 138 | 3.3 |
| id 19 (F, founder juvenile) | 365–484 | 8.41 y, 29.3 | weaned | -0.05 | 1305 | 1311 | -5 | 0 | 0 | 203 | 7% | 1% | 2% | 41 | 146 | 2.7 |

**P2: seed 48, swallowed 0.25.** Communities at the start → end of the window: 1: 23 → 24, 2: 17 → 19, 3: 9 → 8.

| animal | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk | plant food handed by the mother | eating min | full | hindgut full | fallback | growth paid | walking + climbing | km on the ground |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 22 (F) | 365–404 | 4.69 y, 16.6 | weaned | -0.31 | 866 | 877 | -11 | 0 | 0 | 474 | 79% | 25% | 24% | 30 | 87 | 3.9 |
| id 22 (F) | 405–444 | 4.80 y, 16.8 | weaned | -0.32 | 879 | 886 | -7 | 0 | 0 | 504 | 81% | 29% | 17% | 29 | 86 | 3.9 |
| id 22 (F) | 445–484 | 4.91 y, 17.1 | weaned | -0.39 | 852 | 892 | -40 | 0 | 0 | 494 | 83% | 32% | 9% | 28 | 88 | 3.9 |
| id 37 (M) | 365–404 | 4.19 y, 16.6 | on milk | -0.03 | 834 | 837 | -3 | 256 | 31 | 159 | 4% | 0% | 4% | 46 | 59 | 2.4 |
| id 37 (M) | 405–444 | 4.30 y, 17.0 | weaned on day 411 | -0.07 | 867 | 884 | -17 | 40 | 2 | 260 | 27% | 13% | 2% | 45 | 82 | 3.5 |
| id 37 (M) | 445–484 | 4.41 y, 17.4 | weaned | -0.11 | 891 | 914 | -23 | 0 | 0 | 394 | 65% | 25% | 2% | 43 | 91 | 4.3 |
| id 48 (F) | 365–484 | 3.30 y, 11.3 | unweaned, mother dead | -0.99 | 528 | 587 | -59 | 0 | 9 | 485 | 68% | 11% | 50% | 8 | 22 | 0.6 |
| id 35 (F, founder juvenile) | 365–484 | 6.91 y, 24.1 | weaned | -0.07 | 1156 | 1154 | +2 | 0 | 0 | 227 | 30% | 12% | 2% | 40 | 140 | 3.6 |
| id 19 (F, founder juvenile) | 365–484 | 8.41 y, 29.3 | weaned | -0.03 | 1311 | 1311 | +0 | 0 | 0 | 208 | 6% | 1% | 2% | 41 | 143 | 2.6 |

**P3: seed 7, swallowed 0.5.** Communities at the start → end of the window: 1: 24 → 25, 2: 18 → 18, 3: 11 → 11.

| animal | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk | plant food handed by the mother | eating min | full | hindgut full | fallback | growth paid | walking + climbing | km on the ground |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 22 (F) | 365–404 | 4.69 y, 17.0 | on milk | -0.08 | 886 | 891 | -5 | 227 | 148 | 168 | 35% | 0% | 11% | 39 | 102 | 4.9 |
| id 22 (F) | 405–444 | 4.80 y, 17.3 | on milk | -0.07 | 923 | 919 | +4 | 226 | 92 | 204 | 40% | 0% | 7% | 38 | 114 | 5.2 |
| id 22 (F) | 445–484 | 4.91 y, 17.7 | on milk | -0.11 | 909 | 929 | -20 | 225 | 71 | 196 | 31% | 0% | 7% | 39 | 114 | 5.2 |
| id 37 (M) | 365–404 | 4.19 y, 16.6 | on milk | -0.03 | 877 | 852 | +25 | 260 | 150 | 173 | 22% | 0% | 17% | 44 | 71 | 3.3 |
| id 37 (M) | 405–444 | 4.30 y, 17.0 | on milk | -0.06 | 848 | 866 | -19 | 270 | 80 | 177 | 8% | 0% | 17% | 45 | 74 | 3.5 |
| id 37 (M) | 445–484 | 4.41 y, 17.4 | on milk | -0.11 | 863 | 890 | -28 | 232 | 93 | 190 | 29% | 0% | 7% | 43 | 87 | 4.3 |
| id 48 (F) | 365–484 | 3.41 y, 12.7 | on milk | -0.07 | 634 | 641 | -6 | 259 | 41 | 130 | 9% | 0% | 15% | 40 | 17 | 0.4 |
| id 35 (F, founder juvenile) | 365–484 | 6.91 y, 24.4 | weaned | -0.13 | 1148 | 1161 | -13 | 0 | 0 | 302 | 57% | 20% | 4% | 39 | 134 | 4.0 |
| id 19 (F, founder juvenile) | 365–484 | 8.41 y, 29.3 | weaned | -0.15 | 1355 | 1362 | -8 | 0 | 0 | 285 | 46% | 14% | 2% | 37 | 185 | 4.2 |

**P4: seed 7, swallowed 0.25.** Communities at the start → end of the window: 1: 23 → 23, 2: 15 → 16, 3: 12 → 11.

| animal | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk | plant food handed by the mother | eating min | full | hindgut full | fallback | growth paid | walking + climbing | km on the ground |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 22 (F) | 365–404 | 4.69 y, 17.0 | on milk | -0.08 | 881 | 873 | +8 | 222 | 176 | 163 | 38% | 0% | 10% | 39 | 84 | 3.8 |
| id 22 (F) | 405–444 | 4.80 y, 17.3 | on milk | -0.08 | 898 | 904 | -6 | 207 | 96 | 197 | 40% | 0% | 6% | 38 | 101 | 4.3 |
| id 22 (F) | 445–484 | 4.91 y, 17.7 | on milk | -0.15 | 895 | 930 | -36 | 181 | 76 | 222 | 45% | 0% | 6% | 38 | 117 | 5.4 |
| id 37 (M) | 365–404 | 4.19 y, 16.6 | on milk | -0.05 | 860 | 845 | +15 | 223 | 134 | 177 | 26% | 0% | 10% | 44 | 64 | 2.9 |
| id 37 (M) | 405–444 | 4.30 y, 17.0 | on milk | -0.07 | 842 | 853 | -11 | 216 | 86 | 179 | 9% | 0% | 12% | 44 | 62 | 2.9 |
| id 37 (M) | 445–484 | 4.41 y, 17.4 | on milk | -0.10 | 865 | 885 | -20 | 172 | 83 | 222 | 29% | 0% | 8% | 43 | 78 | 3.8 |
| id 48 (F) | 365–484 | 3.41 y, 12.7 | on milk | -0.08 | 636 | 643 | -7 | 224 | 57 | 148 | 12% | 0% | 19% | 40 | 21 | 0.4 |
| id 35 (F, founder juvenile) | 365–484 | 6.91 y, 24.4 | weaned | -0.09 | 1149 | 1147 | +2 | 0 | 0 | 290 | 53% | 19% | 4% | 39 | 121 | 3.6 |
| id 19 (F, founder juvenile) | 365–484 | 8.41 y, 29.2 | weaned | -0.12 | 1338 | 1331 | +7 | 0 | 0 | 295 | 49% | 14% | 3% | 37 | 159 | 3.3 |

### T5. Does 0.25 cover it? The weaned-in-run animals at both shares

Lowest individual reserve ÷ store reached inside each juvenile group over the three years (the part's `e1p` resMin; −1 is death), per seed-run (seeds 48, 7, 21, 5, 11). The 5–8 y male group holds only ids 37 and 21 (both weaned in the run); the 8–12 y groups hold only founders weaned before the start, except id 22 never (she is under 8 y to the end).

| group | Y3-W50 | Y3-W50-s1 | Y3-W25 | Y3-W25-s1 |
| --- | --- | --- | --- | --- |
| juvenile 5–8 y F | -1.00 / -0.83 / -1.00 / -0.81 / -1.00 | -1.00 / -0.83 / -0.99 / -0.99 / -0.43 | -0.84 / -0.43 / -0.80 / -0.41 / -0.40 | -0.88 / -0.50 / -0.66 / -0.57 / -0.36 |
| juvenile 5–8 y M | -1.00 / -0.99 / -1.00 / -0.77 / -0.34 | -1.00 / -0.91 / -0.82 / -0.63 / -0.20 | -0.82 / -0.64 / -0.88 / -0.55 / -0.19 | -0.82 / -0.69 / -0.43 / -0.56 / -0.22 |
| juvenile 8–12 y F | -0.45 / -0.20 / -0.33 / -0.13 / -0.11 | -0.43 / -0.16 / -0.47 / -0.13 / -0.09 | -0.46 / -0.21 / -0.40 / -0.16 / -0.08 | -0.37 / -0.16 / -0.29 / -0.14 / -0.10 |
| juvenile 8–12 y M | -0.15 / -0.09 / -0.09 / -0.05 / -0.07 | -0.13 / -0.07 / -0.11 / -0.05 / -0.06 | -0.15 / -0.07 / -0.06 / -0.08 / -0.06 | -0.15 / -0.06 / -0.12 / -0.07 / -0.06 |
| 4–5 y (on milk) | -0.53 / -0.23 / -0.31 / -0.27 / -0.11 | -0.65 / -0.38 / -0.18 / -0.33 / -0.12 | -0.48 / -0.32 / -0.21 / -0.19 / -0.13 | -0.52 / -0.42 / -0.21 / -0.28 / -0.14 |
| 3–4 y (on milk) | -0.27 / -0.17 / -0.13 / -0.11 / -0.10 | -0.28 / -0.15 / -0.14 / -0.15 / -0.10 | -0.23 / -0.18 / -0.16 / -0.21 / -0.11 | -0.27 / -0.23 / -0.17 / -0.12 / -0.10 |

- Swallowed 0.5: founders weaned in the run and alive on day 1,095: 33; reserve ÷ store mean -0.47, lowest -0.91; below −0.5: 15; below −0.8: 6.
- Swallowed 0.25: founders weaned in the run and alive on day 1,095: 47; reserve ÷ store mean -0.32, lowest -0.71; below −0.5: 12; below −0.8: 0.

One animal at a time: where a juvenile group holds a single animal its saved daily sum is that animal's reserve ÷ store. Id 37 is alone in the 5–8 y male group on scored days 701 to 882 (it turns 5 on day 701; id 21 joins on day 883 or later), id 22 alone in the 5–8 y female group from day 884 (id 35 turns 8) to day 1,065 (id 48 turns 5). Values on the days named; "dead" = the animal died earlier (T1 or another cause).

| run | seed | id 37, weaned on day | day 705 | day 765 | day 825 | day 880 | id 22, weaned on day | day 890 | day 950 | day 1,010 | day 1,060 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Y3-W50 | 48 | 411 | -0.42 | -0.47 | -0.49 | -0.72 | 222 | dead | dead | dead | dead |
| Y3-W50 | 7 | 498 | -0.27 | -0.27 | -0.28 | -0.40 | 533 | -0.54 | -0.49 | -0.51 | -0.67 |
| Y3-W50 | 21 | 481 | -0.74 | -0.77 | -0.81 | -0.81 | 384 | dead | dead | dead | dead |
| Y3-W50 | 5 | 542 | -0.12 | -0.04 | -0.07 | -0.28 | 464 | -0.63 | -0.58 | -0.62 | -0.76 |
| Y3-W50 | 11 | 508 | -0.13 | -0.25 | -0.24 | -0.33 | 215 | dead | dead | dead | dead |
| Y3-W50-s1 | 48 | 411 | -0.34 | -0.44 | -0.46 | -0.65 | 222 | dead | dead | dead | dead |
| Y3-W50-s1 | 7 | 498 | -0.44 | -0.49 | -0.48 | -0.64 | 533 | -0.66 | -0.65 | -0.67 | -0.81 |
| Y3-W50-s1 | 21 | 481 | -0.72 | -0.73 | -0.67 | -0.68 | 384 | dead | dead | dead | dead |
| Y3-W50-s1 | 5 | 542 | dead | dead | dead | dead | 464 | -0.80 | -0.89 | -0.86 | -0.96 |
| Y3-W50-s1 | 11 | 508 | -0.11 | -0.08 | -0.07 | -0.19 | 215 | dead | dead | dead | dead |
| Y3-W25 | 48 | 411 | -0.18 | -0.10 | -0.06 | -0.32 | 222 | -0.63 | -0.78 | -0.75 | -0.61 |
| Y3-W25 | 7 | 498 | -0.26 | -0.17 | -0.19 | -0.34 | 533 | -0.37 | -0.23 | -0.25 | -0.40 |
| Y3-W25 | 21 | 481 | -0.87 | -0.84 | -0.77 | -0.72 | 384 | -0.55 | -0.60 | -0.48 | -0.34 |
| Y3-W25 | 5 | 542 | -0.15 | -0.05 | -0.09 | -0.29 | 464 | -0.28 | -0.19 | -0.27 | -0.41 |
| Y3-W25 | 11 | 508 | -0.15 | -0.14 | -0.09 | -0.14 | 215 | -0.20 | -0.09 | -0.06 | -0.04 |
| Y3-W25-s1 | 48 | 411 | -0.28 | -0.27 | -0.23 | -0.43 | 222 | -0.71 | -0.83 | -0.83 | -0.73 |
| Y3-W25-s1 | 7 | 498 | -0.13 | -0.05 | -0.06 | -0.23 | 533 | -0.48 | -0.35 | -0.32 | -0.48 |
| Y3-W25-s1 | 21 | 481 | -0.42 | -0.40 | -0.30 | -0.19 | 384 | -0.48 | -0.52 | -0.40 | -0.29 |
| Y3-W25-s1 | 5 | 542 | -0.06 | -0.01 | -0.07 | -0.30 | 464 | -0.56 | -0.44 | -0.44 | -0.56 |
| Y3-W25-s1 | 11 | 508 | -0.19 | -0.18 | -0.13 | -0.20 | 215 | -0.25 | -0.12 | -0.03 | -0.03 |

### T6. Explanation (a), more animals on the same food: classes by year of the run

Pooled over the 10 seed-runs of each share, from the class-by-day table. Animals = mean number in the class; net = absorbed − spent per animal-day; full = share of daylight with the foregut at least 0.95 full; lowest reserve = the lowest 30-day mean of the class's daily mean reserve ÷ store in that year (mean over seed-runs of each run's own lowest).

| class | share | year | animals per seed-run | eating min | absorbed | spent | net | full | lowest reserve |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adult male | 0.5 | 1 | 13.9 | 226 | 1562 | 1563 | +0 | 3% | -0.028 |
| adult male | 0.5 | 2 | 14.4 | 225 | 1569 | 1568 | +0 | 3% | -0.018 |
| adult male | 0.5 | 3 | 15.3 | 229 | 1570 | 1569 | +0 | 4% | -0.032 |
| adult male | 0.25 | 1 | 13.8 | 227 | 1564 | 1565 | +0 | 3% | -0.030 |
| adult male | 0.25 | 2 | 14.2 | 225 | 1570 | 1569 | +0 | 3% | -0.022 |
| adult male | 0.25 | 3 | 14.7 | 229 | 1568 | 1568 | +0 | 4% | -0.033 |
| female, other | 0.5 | 1 | 4.5 | 218 | 1288 | 1286 | +2 | 7% | -0.045 |
| female, other | 0.5 | 2 | 2.8 | 214 | 1293 | 1292 | +1 | 7% | -0.041 |
| female, other | 0.5 | 3 | 2.3 | 232 | 1302 | 1301 | +1 | 11% | -0.086 |
| female, other | 0.25 | 1 | 4.3 | 220 | 1285 | 1285 | +0 | 6% | -0.047 |
| female, other | 0.25 | 2 | 2.7 | 211 | 1291 | 1290 | +2 | 5% | -0.040 |
| female, other | 0.25 | 3 | 1.9 | 228 | 1299 | 1300 | -1 | 9% | -0.074 |
| female, pregnant | 0.5 | 1 | 2.7 | 271 | 1385 | 1405 | -20 | 16% | — |
| female, pregnant | 0.5 | 2 | 1.7 | 256 | 1384 | 1400 | -16 | 14% | — |
| female, pregnant | 0.5 | 3 | 1.5 | 260 | 1401 | 1412 | -11 | 15% | — |
| female, pregnant | 0.25 | 1 | 2.8 | 263 | 1391 | 1405 | -14 | 13% | — |
| female, pregnant | 0.25 | 2 | 1.6 | 243 | 1390 | 1398 | -8 | 11% | — |
| female, pregnant | 0.25 | 3 | 1.4 | 259 | 1396 | 1407 | -11 | 15% | — |
| female, lactating | 0.5 | 1 | 9.5 | 306 | 1726 | 1723 | +3 | 10% | -0.106 |
| female, lactating | 0.5 | 2 | 11.7 | 302 | 1732 | 1731 | +2 | 10% | -0.091 |
| female, lactating | 0.5 | 3 | 12.2 | 314 | 1734 | 1732 | +2 | 12% | -0.119 |
| female, lactating | 0.25 | 1 | 9.6 | 308 | 1724 | 1722 | +2 | 8% | -0.104 |
| female, lactating | 0.25 | 2 | 11.9 | 304 | 1733 | 1732 | +1 | 9% | -0.094 |
| female, lactating | 0.25 | 3 | 12.6 | 314 | 1739 | 1738 | +2 | 11% | -0.120 |
| juvenile 5–12 y | 0.5 | 1 | 5.9 | 288 | 1300 | 1301 | -1 | 22% | -0.157 |
| juvenile 5–12 y | 0.5 | 2 | 5.5 | 287 | 1332 | 1334 | -2 | 22% | -0.186 |
| juvenile 5–12 y | 0.5 | 3 | 6.5 | 314 | 1296 | 1300 | -4 | 26% | -0.286 |
| juvenile 5–12 y | 0.25 | 1 | 5.9 | 283 | 1301 | 1302 | -1 | 21% | -0.155 |
| juvenile 5–12 y | 0.25 | 2 | 5.7 | 276 | 1336 | 1335 | +1 | 20% | -0.141 |
| juvenile 5–12 y | 0.25 | 3 | 7.5 | 314 | 1277 | 1276 | +1 | 27% | -0.224 |
| infant 2–5 y | 0.5 | 1 | 5.0 | 150 | 650 | 653 | -2 | 7% | -0.086 |
| infant 2–5 y | 0.5 | 2 | 6.4 | 191 | 703 | 710 | -7 | 13% | -0.142 |
| infant 2–5 y | 0.5 | 3 | 6.4 | 203 | 703 | 713 | -10 | 17% | -0.176 |
| infant 2–5 y | 0.25 | 1 | 5.2 | 157 | 652 | 655 | -3 | 8% | -0.085 |
| infant 2–5 y | 0.25 | 2 | 6.5 | 190 | 713 | 718 | -5 | 13% | -0.131 |
| infant 2–5 y | 0.25 | 3 | 6.3 | 198 | 712 | 721 | -9 | 16% | -0.164 |

Living animals per seed-run (viability: start → end), and animals in the class readout on days 0, 365, 730, 1,094 (mean over the five seeds; the class readout leaves out ages 12 to 15 y):

- Y3-W50: 49 → 55, 49 → 53, 49 → 57, 49 → 59, 49 → 58; class readout 45.0 → 48.8 → 51.6 → 54.4; juvenile starvation deaths per seed 3, 1, 2, 0, 1
- Y3-W50-s1: 49 → 56, 49 → 52, 49 → 55, 49 → 55, 49 → 51; class readout 45.0 → 47.4 → 49.4 → 51.8; juvenile starvation deaths per seed 3, 0, 1, 1, 0
- Y3-W25: 49 → 53, 49 → 48, 49 → 57, 48 → 59, 49 → 58; class readout 44.8 → 47.6 → 50.0 → 53.2; juvenile starvation deaths per seed 0, 0, 0, 0, 0
- Y3-W25-s1: 49 → 59, 49 → 48, 49 → 55, 49 → 61, 49 → 63; class readout 45.0 → 49.0 → 51.5 → 55.2; juvenile starvation deaths per seed 0, 0, 0, 0, 0

### T7. Explanation (b), a harder lean season in one calendar year: the record years each seed reads

Source: ngogo-phenology-1998-2017 (22 record years, 1998 to 2019). The run opens on 28 September of calendar year 0 and ends in late October of year 3, so it reads four record years; none of these seeds runs past the record's end (no resampling). Ripe crop = phenology crop before depletion (kcal) inside the three communities' opening ranges, mean of each 30-day block; lowest block and mean per run year (run year 1 = scored days 0 to 359), with the seed's juvenile starvation deaths (both rngSalt values).

| seed | record years read (calendar years 0 to 3) | run year 1: lowest block (month), mean | run year 2 | run year 3 | juvenile starvation deaths at 0.5: scored days | at 0.25 |
| --- | --- | --- | --- | --- | --- | --- |
| 48 | 2011, 2012, 2013, 2014 | 1.26 M (Feb), 3.11 M | 2.14 M (Aug), 3.54 M | 1.12 M (Mar), 2.57 M | 735 (Nov 2), 756 (Nov 23), 943 (May 29), 963 (Jun 18), 970 (Jun 25), 1011 (Aug 5) | none |
| 7 | 2000, 2001, 2002, 2003 | 2.32 M (Oct), 3.08 M | 1.72 M (Mar), 3.32 M | 1.46 M (Mar), 3.03 M | 1021 (Aug 15) | none |
| 21 | 2014, 2015, 2016, 2017 | 1.37 M (Feb), 3.40 M | 1.55 M (May), 2.75 M | 1.85 M (May), 3.27 M | 641 (Jul 31), 746 (Nov 13), 943 (May 29) | none |
| 5 | 2000, 2001, 2002, 2003 | 2.21 M (Oct), 3.06 M | 1.56 M (Mar), 3.29 M | 1.49 M (Mar), 2.99 M | 1073 (Oct 6) | none |
| 11 | 2006, 2007, 2008, 2009 | 2.00 M (Jan), 3.19 M | 2.85 M (Sep), 4.25 M | 2.00 M (Mar), 3.93 M | 885 (Apr 1) | none |

Juvenile starvation deaths by calendar month: Apr 1, May 2, Jun 2, Jul 1, Aug 2, Oct 1, Nov 3.

### T8. Size arithmetic from the registry (explanation (d); inputs only, no simulation)

Resting need = `ledgerRmrCoef` × mass^`ledgerRmrExp` (energy.ts:561); gut capacity = `digestaGutMlPerKg` × mass, foregut and hindgut shares of it (energy.ts:133–134, 243–246), so what a full gut passes in a day scales with mass and the resting need with mass^0.75. Growth at the potential is charged at `ledgerGrowthKcalPerG` (energy.ts:147, 589–593). Milk: a mother makes at most `ledgerMilkYieldCoef` × her mass^`ledgerRmrExp` a day (energy.ts:150, 577), whatever the infant's age.

| body mass, kg | resting need, kcal/d | foregut capacity, g dry matter | gut capacity per kcal of resting need, ÷ an adult female's | growth at the potential (F / M), kcal/d | as a share of resting need (F) |
| --- | --- | --- | --- | --- | --- |
| 12.0 | 451 | 67 | 0.79 | 42 / 47 | 9% |
| 16.5 | 573 | 92 | 0.85 | 42 / 47 | 7% |
| 20.0 | 662 | 112 | 0.89 | 42 / 47 | 6% |
| 24.0 | 759 | 134 | 0.94 | 42 / 47 | 6% |
| 31.3 | 926 | 175 | 1.00 | 0 | — |
| 39.0 | 1092 | 218 | 1.06 | 0 | — |

A mother of 31.3 kg makes at most 307 kcal of milk a day; the resting need of a 16.5 kg animal is 573 kcal/d, so the gland's full yield is 54% of it. Weaning age: `weanAgeMinY` 4.1 + up to `weanAgeSpanY` 1.1 y, drawn once per animal (generation.ts:112).

### T9. The gut ceiling by body size against what the animal spends (explanation (d); offline, no tick)

Ceiling = the most energy the gut lets the animal absorb in a day when it eats every minute of a 12-hour active day in which the foregut has room (stage E1u's tool, `scripts/lib/gut-ceiling.ts`, on the animals of the seed-48 day-395 checkpoint; figs 0.25 of fruit energy). Measured = the same animal in P1 (swallowed 0.5), scored days 365 to 404. The ceiling is an upper bound: it leaves no time to travel, search or rest.

| animal | kg | ceiling, fruit only | ceiling, 30% fallback: all / half / a quarter of the pith fibre swallowed | measured: spent | measured: absorbed | eating min | ceiling (fruit only) ÷ spent | ceiling (30% fallback, 0.5) ÷ spent | (0.25) ÷ spent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 48 (F, 3.1 y, on milk) | 11.6 | 623 | 515 / 569 / 602 | 628 | 626 | 102 | 0.99 | 0.91 | 0.96 |
| id 22 (F, 4.6 y, weaned on day 222) | 16.2 | 868 | 716 / 791 / 837 | 845 | 795 | 635 | 1.03 | 0.94 | 0.99 |
| id 37 (M, 4.1 y, on milk; weaned on day 411) | 16.2 | 868 | 716 / 791 / 836 | 832 | 839 | 150 | 1.04 | 0.95 | 1.00 |
| id 35 (F, 6.6 y) | 23.1 | 1241 | 1024 / 1131 / 1197 | 1129 | 1145 | 239 | 1.10 | 1.00 | 1.06 |
| id 19 (F, 8.1 y) | 28.2 | 1509 | 1246 / 1375 / 1455 | 1304 | 1319 | 211 | 1.16 | 1.05 | 1.12 |
| id 10 (adult F, not nursing) | 31.3 | 1677 | 1384 / 1528 / 1617 | 1273 | 1269 | 195 | 1.32 | 1.20 | 1.27 |
| id 1 (adult M) | 39.0 | 2082 | 1717 / 1893 / 2002 | 1570 | 1573 | 226 | 1.33 | 1.21 | 1.27 |

