# E1r: lean-season starvation, a diagnosis (registered 5 October 2026, before any analysis)

Owner: agent `e1r-lean` (branch `e1r-lean` from `track-e`); integrator judges. E1r changes no behaviour: no switch, no
parameter value, nothing in `src/sim`.

## 1. Why

- Part C at 12 months (`docs/staging/e-rebaseline.md`): S39 is not viable. 6 starvation deaths in its 20 seeds
  (adolescents 3, pregnant females 2, an infant of 2–5 y 1; seeds 5, 11 and 48). The group's reserves dip from about day
  45 to day 230 of the scored year (juveniles of 5–12 y to about −0.16 to −0.20 of the store, nursing mothers to about
  −0.13), then partly recover. Today's model has no energy ledger and no starvation.
- Walk-back (same file, seed 48): S37, S34, S31 and S27 all starve (2–4 deaths each; S39's four runs 0, 0, 1, 0). By the
  registered rule the cause is older than S27: the energy ledger's response to the lean season.

## 2. Question

Which term of the energy balance leaves juveniles, adolescents and pregnant females in deficit through the lean season,
and how does each term compare with the field? Candidates, named before looking (not ranked):

1. **Supply:** fruit availability by month (the Ngogo phenology record the field profile reads) and what else is
   edible then (figs, young leaves, pith); whether the fallbacks are reachable and eaten.
2. **Feeding time:** whether it rises as fruit falls, and what caps it (daylight, gut fill, rest from heat, the value of
   other acts).
3. **Intake rate:** kcal per feeding minute by food and by class (juveniles and adolescents against adults).
4. **Expenditure:** by term (resting, activity, walking, climbing, carrying, growth, gestation, lactation) and month;
   whether travel rises in the lean season.
5. **Access:** displacement at food, party size and competition, sharing, milk; why these classes and not adult males.
6. **Reserve dynamics:** the store's size and the level at which starvation kills, against the field's dip without
   deep catabolism.

## 3. Field evidence (checks: targets, never inputs; every source already in `docs/research.md`)

- Feeding 309 ± 85 min per day and about 2,500 kcal per day; intake by food: ripe fruit 10.7 kcal/min, young leaves
  6.2, pith 3.4 [uwimbabazi2019].
- When food was abundant chimpanzees fed for less time and spent more energy [vale2020] (Taï; direction).
- Energy balance (urinary C-peptide) tracks fruit in the diet [emeryThompson2009]; no systematic ketone production was
  detected at Kanyawara or Mahale [knott2005]: lean seasons lower energy balance without deep catabolism (direction).
- Pith and stems 17.4% of feeding time at Kanyawara, 1.0% at Ngogo; young leaves about 6.9% at Kanyawara [potts2011];
  pith intake rose when fruit was scarce [wrangham1991] (direction).
- Nursing mothers' energy balance depressed for about 6 months after birth, then rising [emeryThompson2012].

## 4. Data

No new simulation unless a readout is missing. Read only:
- S39's four 12-month runs (20 seeds): `bench-run/artifacts/validation/e/runs/M12-S39{,-s1,-s2,-s3}/parts/*.part.json.gz`
  (`energy.daily`: per class and day, eating ticks, intake, faecal loss, expenditure, dry matter, hunger, gut fill;
  `energy.acc`: the year's expenditure by term; `energy.e1pTraj`, `trajSeeds`, `juvs`, `dyads`; viability deaths by
  cause) and the end worlds `*.ckpt-d395.v8.gz`.
- Today's model's four runs (same phenology; supply and feeding time, no ledger): `bench-run2/…/M12-T0{,-s1,-s2,-s3}`.
- The walk-back's seed-48 parts: `bench-run/…/WB-S37`, `WB-S34`; `bench-run2/…/WB-S31`, `WB-S27`.

If a readout is missing (for example expenditure by term per month, or food mix per month), it is added to e-bench's
energy readout only (measurement; switches 0; goldens and `tests/sim-track-e.test.ts` unchanged), committed, and then
run on development seed 48 only, on S39 (rngSalt 2: 1 starvation) and S31 (rngSalt 0: 4 starvations), 6 months first
(extended from its checkpoint to 12 months only if the deaths in that world fall after day 180). At most 3 runs, each
logged in this file before it starts; one job at a time while the load is above 8.

## 5. Readouts (fixed now)

By class (adult male, female other, lactating, pregnant, adolescent, juvenile 5–12 y, the infant classes) and by month
of the scored year, pooled over S39's 20 seeds and separately for the seeds with starvation: intake (kcal per day and
per kg^0.75), feeding minutes per day, food mix (fruit, figs, leaves, pith and other fallbacks, meat, milk), expenditure
per day by term, net balance, reserve relative to the store; fruit availability by month. Feeding minutes and food mix
for today's model where its readouts hold them. For each starved animal: its last 60 days (intake, expenditure, feeding
minutes, party size, displacements received, its mother's state if dependent) and the day of death.

## 6. Deliverable

The tables above; each candidate of §2 against its field check (inside, outside, no field number); a verdict naming the
responsible term or terms, with a confidence level. Then a proposal for E1s: a mechanism with its sources (in
`docs/research.md`, or added there first), entered from data and never set to hit a target; its switch (0 by default),
readouts and success criteria (viable at 12 months on S39's four runs; the lean-season dip of the right direction and no
starvation of weaned animals; feeding time rising as fruit falls; the keep rule otherwise). The integrator registers and
judges E1s; E1r does not run it.

## 7. Prediction (integrator, low confidence, before any analysis)

Feeding time does not rise enough as fruit falls (the decision values do not trade other acts for feeding as reserves
drop), and the fallbacks supply too little to cover it; expenditure is not the main term.

## 8. Run log (agent `e1r-lean`; sections 1–7 above are the registration, unchanged)

### 8.1 Why a run is needed (5 October 2026, before any run; read from the S39 group's parts and end worlds)

The existing data hold, by class and day: ticks, eating ticks, energy in, passed out, spent (total), dry matter, daylight
hunger and foregut-full ticks; the reserve trajectory for seven classes; the year's spending by term and fruit share by
class; and in the end worlds each dead animal's identity, time and cause of death. They cannot give five readouts of §5
that the verdict needs:
1. **Food mix by month** for any class (daily records have no food kind; only the year's fruit share exists).
2. **Spending by term by month** (only the year's sum per term exists).
3. **Adolescents (12–15 y)**: no class readout holds them (energy-probe.ts `classesOf` returns none for 12–15 y), yet 3
   of S39's 6 starvation deaths are adolescents (one female of seed 5 in three re-draws). Pregnant females have no
   reserve trajectory.
4. **The starved animals' last 60 days**: no readout is per animal; the end worlds keep only identity, time and cause
   (a dead animal's hidden state is slimmed 30 days after death).
5. **What caps feeding** by month: eating at a full foregut, the daylight acts, party size and food-competition charges
   received.

Finding that set the run plan (end worlds, `deathTime`): every starvation death in S39's group and in the walk-back falls
**after** scored day 180 except one (seed 11, rngSalt 1: day 189): S39 rngSalt 2 seed 48, id 22 at day 342; S31
rngSalt 0 seed 48, ids 17, 15, 47, 22 at days 235, 258, 339, 354. All are female.

### 8.2 The readout (committed before any run)

`e-bench --animal-days` (scripts/lib/energy-probe.ts `ANIMAL_DAY_FIELDS`, measurement only): one row per living animal
and window day with food taken by kind (drupe, fig, fallback, meat, milk, plant handed over), eating ticks by kind and
at a full foregut, spending by term, ground metres, daylight acts, hunger, foregut fill, party size, charges received
(and those by an actor competing for food), mass, reserves, store, the mother's reserves. Off unless asked; the part of
a run without it is unchanged. tests/lean-season.test.ts: the world is the same with and without it (field hash and the
whole energy readout), and the rows add up to the class readout (energy in, spent, passed out, dry matter within 0.1%).
No src/ or data/ change: compressed goldens, tests/fixtures and tests/sim-track-e.test.ts are untouched.

### 8.3 Runs (each logged here before it starts; seed 48 only; `--workers 1`; one job at a time while the load is above 8)

Frozen detached checkout of the readout commit (scratch worktree), outputs in this worktree's
`artifacts/validation/e1r/` (gitignored). At most 3 runs; both worlds' deaths fall after day 180, so only one can be
extended within the cap: S31's (four deaths, every starving class: pregnant female, juvenile, adolescent, and the infant
of 2–5 y that is also S39 rngSalt 2's only death).
- **R1**: S31 (WB-S31's parameters, rngSalt 0), `--m6 --seeds 48 --part --animal-days` (30 + 180 days, end checkpoint).
- **R2**: R1 extended to 12 months (`--m12 --resume` R1's checkpoint). Behaviour check: its field hash and deaths (ids,
  times) must equal WB-S31's seed-48 part and end world.
- **R3**: S39 rngSalt 2 (M12-S39-s2's parameters), `--m6 --seeds 48 --part --animal-days`. Behaviour check: its field hash
  must equal M6-S39-s2's seed-48 part. Its death (day 342) stays outside the window; the same animal starves in R2.

## 9. Results (5 October 2026; every number below was printed by `scripts/lean-season.ts` or a scratch reader of the same part files and worlds, none typed from memory)

### 9.0 Runs and checks
- R1 (S31, 210 days, 421 s), R2 (R1 extended to 395 days, 869 s), R3 (S39 rngSalt 2, 210 days, 716 s); `--workers 1`.
  R3 was first started with R1 at 11:53 and stopped at 11:59 when the load passed 8 (11.7 / 8.1); it was re-launched
  after R2, one job at a time. Nothing of the stopped attempt was kept.
- The readout moves nothing: R2 equals WB-S31's seed-48 run (field hash c9b013bffae6970e/cde1f7d58ceea5f3/2a6583368aa91482,
  the whole energy readout, the truth rows, the four starvation deaths on the same days) and R3 equals M6-S39-s2's seed 48
  (field hash 129d7d05b5bad684/ea00fac1e8b1198e/8ee2fd1404ae07f8, energy readout, truth rows).
- Outputs (gitignored): `artifacts/validation/e1r/{s39,t0,r1,r2,r3}.{md,json}`, the parts and checkpoints of R1–R3.

### 9.1 Fruit availability (the phenology the field profile reads, at noon of each window day, in the end worlds; ranges = community centre and radius)
Ripe crop energy per km² of range, best against worst month (figs' share): seed 48 Nov 246k against Feb 78k kcal (−68%;
25% → 79% figs); seed 21 Oct 296k against Feb 81k (−73%; 20% → 72%); seed 11 Oct 260k against Dec 111k (−57%); seeds 5
and 7 (the same record years) Jun 229–234k against Dec 114–115k (−50%). The Ngogo record's site share of stems in ripe
fruit falls from 14–26% to 3–10% in the same months. Seed 48 per member (standing ripe crop): community 1 (24 members,
5.2 km²) 52k kcal in Nov, 17k in Jan–Feb; community 3 (11 members, 4.5 km²) 99k and 30–35k. The fallback foods' season
factor (`youngLeafAmp` 0.25, design) is 0.78–0.81 in Jan–Feb and Jul–Aug, 1.18–1.22 in Apr–May and Oct–Nov: the drupe
trough of seeds 48 and 21 falls on the fallback trough.

### 9.2 S39 group (20 seed-runs): class readout by calendar month, worst against best month by net balance
- juvenile 5–12 y: Jan eat 291 min, in 1,665 kcal (135 per kg^0.75), absorbed 1,242, spent 1,284, net −42, foregut full
  25% of daylight; Jul 347 min, 1,753 (142), 1,332, 1,301, +30, 30%; lowest class reserve −0.212 (Jun).
- female, pregnant: Feb 325 min, 1,833 (139), absorbed 1,344, spent 1,430, net −86, foregut full 31%; Jul 267 min, +5, 14%.
- female, lactating: Dec 306 min, net −49, 12%; Jul 328 min, +59, 16%; lowest reserve −0.124 (May).
- infant 2–5 y: net −13 to +5 all year; lowest reserve −0.081 (Mar). Adult males: −22 to +25; lowest −0.021.
- Pooled over seeds whose troughs fall in different months, the class means show a shallow dip; the depth is in
  individuals (9.3).

### 9.3 Who is depleted (S39 group's 20 middle checkpoints, day 180)
Juveniles of 5–8 y (all female in these five seeds) mean −0.35 of the store (n 60); juveniles of 8–12 y: males −0.02
(n 39), females with their mother in the community −0.01 (n 13), without −0.25 (n 6); adolescent females that transferred
within 3 y −0.48 (n 10; half below −0.5), other adolescent females −0.12, adolescent males −0.005; pregnant females −0.20
(min −0.93); lactating −0.12; adult males −0.003. All six starved animals are female because these worlds hold no male of
5–8 y, and because transfer and pregnancy are female.

### 9.4 Per-animal budgets by phase, seed 48 (R3 = S39 rngSalt 2; R1+R2 = S31 rngSalt 0), kcal per animal-day
Phases: Nov–Dec (before), Jan–Feb (fig months), Mar–Apr (fallback months). Columns: absorbed, spent (of which walking and
climbing), net, eating min, eating at a full foregut, fallback share of plant energy, own food kcal per eating minute, km.

| class | stack | Nov–Dec | Jan–Feb | Mar–Apr |
| --- | --- | --- | --- | --- |
| juvenile F | S39 | 1,147 / 1,164 (124) / −17; 277 min, 35%, 13%, 4.35, 3.0 km | 1,029 / 1,193 (153) / −164; 346, 65%, 15%, 3.15, 4.4 | 1,106 / 1,169 (105) / −62; 552, 86%, 29%, 2.12, 3.3 |
| juvenile F | S31 | 1,136 / 1,177 (134) / −41; 326, 50%, 17%, 3.67, 3.6 | 1,012 / 1,218 (178) / −206; 383, 71%, 19%, 2.80, 5.5 | 1,044 / 1,153 (96) / −109; 608, 89%, 38%, 1.82, 3.3 |
| juvenile M (8–12 y) | S39 | 1,437 / 1,442 (127) / −5; 254, 3%, 2% | 1,426 / 1,483 (156) / −57; 255, 27%, 1% | 1,561 / 1,501 (144) / +59; 280, 26%, 2% |
| adolescent F | S39 | 1,318 / 1,338 (150) / −20; 232, 14%, 13% | 1,266 / 1,388 (198) / −122; 269, 42%, 12%, 4.5 km | 1,300 / 1,368 (154) / −68; 483, 78%, 32% |
| adolescent F | S31 | 1,353 / 1,358 (161) / −5; 247, 16%, 15% | 1,148 / 1,455 (275) / −307; 272, 47%, 15%, 7.3 km | 1,234 / 1,323 (106) / −89; 610, 88%, 45% |
| pregnant | S39 | 1,361 / 1,377 (98) / −17; 235, 17%, 11% | 1,291 / 1,438 (144) / −146; 315, 55%, 12% | 1,354 / 1,427 (102) / −72; 460, 76%, 25% |
| pregnant | S31 | 1,403 / 1,433 (112) / −30; 271, 29%, 15% | 1,200 / 1,476 (197) / −276; 370, 64%, 25% | 1,228 / 1,383 (92) / −155; 651, 89%, 49% |
| lactating | S39 | 1,723 / 1,739 (116) / −16; 279, 6%, 10% | 1,619 / 1,727 (190) / −108; 324, 36%, 12% | 1,706 / 1,675 (138) / +31; 435, 59%, 23% |
| adult male | S39 | 1,554 / 1,558 (158) / −4; 225, 3%, 1%, 7.22, 2.6 km | 1,582 / 1,619 (212) / −37; 235, 19%, 2%, 4.0 km | 1,634 / 1,588 (175) / +46; 242, 11%, 3% |
| adult male | S31 | 1,584 / 1,585 (180) / 0; 232, 2%, 2% | 1,506 / 1,691 (284) / −185; 285, 42%, 6%, 6.0 km | 1,673 / 1,589 (154) / +84; 401, 59%, 15% |

Reading: in the fig months the small and reproducing females lose 50–120 kcal/day of absorbed energy on S39 (120–260 on
S31) while their walking and climbing add 30–75 (45–125); adult males' absorbed energy changes by +28 (S39) and −78
(S31), and their dry matter rises 20–24% from Nov–Dec to Feb (692–706 to 859 g on S39): they had gut room to spare. The
female classes' dry matter rises 0–11% (juvenile females 537–548 to 565 g on S39, flat on S31): their foregut was already
near its passage limit. In the fallback months juvenile, adolescent and pregnant females stay 62–155 kcal/day short,
eating 7.7–10.9 h a day with the foregut full in 76–89% of their eating minutes, while males are back in surplus.

### 9.5 The starved animals
- S39 group (end worlds; state at the day-180 checkpoint): seed 5 id 9, a natal female of community 1 who transferred into
  community 3 at 12.1–12.2 y (139–166 days before day 180), unranked: −0.62 to −0.65 of the store at day 180, dead on days
  228 (rngSalt 2), 356 (1) and 364.5 (0). Seed 11 id 33, a founder immigrant (arrived 629 days before day 180), ranked 5
  of 6, pregnant 116 and 190 days at day 180: −0.69 and −0.93, dead on days 290 (pregnant 226 days) and 189 (199 days).
  Seed 48 id 22, an infant of 4.07 y at day 180: −0.34, dead on day 342 at 4.52 y (rngSalt 2). Five of the six deaths are
  immigrant females.
- S31 seed 48 (R2), the last 60 days of each (per animal-day): juvenile id 17 (6.7 y, 23 kg): 664 eating min, 91% at a
  full foregut, 1.50 kcal per eating min, plant energy 40% drupe / 17% fig / 43% fallback, absorbed 940 against 1,053
  spent (walking 76, growth 5), net −112, 62% of daylight on the ground, mother at −0.43; dead day 235. Pregnant id 15
  (21.8 y): 685 min, 91%, 2.03 kcal/min, absorbed 1,315 against 1,474 (gestation 143 rising to 163), net −159; dead day
  257 at 206 days of pregnancy. Adolescent id 47 (12.0 y, an immigrant since 11.1 y): 690 min, 90%, 1.97 kcal/min,
  absorbed 1,280 against 1,338, net −58, party 2.0, 2 charges a day (none over food), 67% of daylight on the ground; in
  deficit from her arrival (−184 kcal/day in days 0–29); dead day 339. Infant id 22 (4.5 y, no milk): 675 min, 92%, 1.05
  kcal/min, absorbed 668 against 788, net −120, mother at −0.45 to −0.60; dead day 353.

### 9.6 What depleted animals do, and why
Animals aged 5 y or more by reserves ÷ store at the day's end (adult males apart):
- R2 (S31), days 182–364, after the lean season: at −0.1 to −0.3: 461 eating min, 62% at a full foregut, 16% of daylight
  on the ground, 45% in crowns, plant energy 68% drupe / 13% fallback, 4.46 kcal per eating minute, net +218 (they
  recover); at −0.3 to −0.5: 604 min, 84%, ground 50%, crowns 31%, 36% fallback, 2.71 kcal/min, +13; at −0.5 to −0.7:
  631, 88%, 53%, 38% fallback, 2.16, −48; at −0.7 to −1: 668, 90%, 56%, 38%, 2.00, −61 (they keep losing with fruit back).
- R3 (S39), days 90–179: the same gradient (ground 15% → 39% → 47%, fallback 15% → 33% → 34%, kcal/min 4.20 → 2.71 →
  1.98, net −60 → −74 → −98 from −0.1..−0.3 to −0.5..−0.7). Juvenile females' rest and social time fall from 22–29% and
  21–26% of daylight (Oct–Dec) to 7% and 7–12% (Mar–Apr) on S39, and from 18–27% and 16–22% to 5–6% and 3–6% on S31:
  they do trade other acts for feeding.
- Why (code, and an offline check on R1's day-180 world with the sim's own pure functions, no tick): under `forageRate`
  a crown is worth a bout whose energy is capped by the foregut's room (intake.ts netRateShare → energy.ts boutRoom, in
  drupe units even for figs), while the fallback where the animal stands is worth its intake rate whatever the gut holds
  (candidates.ts:498–500, intake.ts leafWorth). For juvenile id 17 (−0.78) the fallback is worth 0.27 / 0.45 / 0.59 of her
  fruit rate (forage yield 0.6 / 1.0 / 1.3) at any fill; a drupe crown alone with crop 0.5 at 50 / 150 / 300 m is worth
  0.92 / 0.82 / 0.71 at half fill, 0.69 / 0.45 / 0.28 at 90%, 0.49 / 0.25 / 0.12 at 95%, 0.18 / 0.04 / 0.00 at 98% and 0
  at a full gut (pregnant id 15 and adult male id 1: the same). E1i's reserve-weighted satiation keeps a depleted animal
  hungry with a full foregut (daylight hunger 0.65–0.85 below −0.5), so it keeps feeding, and between crown bouts it feeds
  on fallback, the food with the least energy per gram the gut passes (absorbed 1.57 kcal per g of dry matter, against
  1.83 for figs and 2.36 for drupes, derived from the registry's composition): a trap, since the gut, not time, is its limit.

### 9.7 Today's model (four 12-month runs)
Eating minutes per day are flat across months (adult males 252–258, pregnant 305–314, juveniles 221–239, lactating
277–298); the year's fruit share of eating ticks is 0.83–0.96. No food mix by month is recorded.

## 10. Each candidate against its field check

| candidate | model (seed-48 animals of S39 rngSalt 2 and S31; S39 group) | field check (docs/research.md) | verdict |
| --- | --- | --- | --- |
| 1. Supply | in-range ripe crop −50% to −73% from best to worst month, figs 48–79% of it at the trough; the fallback season factor (design) troughs in the same Jan–Feb; fallback is unlimited and is eaten: 23–49% of the plant energy of juvenile, adolescent and pregnant females in Mar–Apr, 43–63% of their eating time over S31's year (adult males 17%, juvenile males 5%) | pith and stems 17.4% and young leaves 6.9% of feeding time at Kanyawara, pith 1.0% and leaves 8.5% at Ngogo (potts2011, watts2012b); pith rises when fruit is scarce (wrangham1991); figs the main fallback, leaves and pith fillers (harrisonMarshall2011) | direction inside; fallback share outside (high) for females and juveniles (the phenology is Ngogo's); adult males inside Kanyawara's |
| 2. Feeding time | rises as fruit falls: juvenile females 277 → 346 → 552 min (S39; 326 → 383 → 608 on S31), pregnant 235 → 315 → 460 (271 → 370 → 651), adult males 225 → 235 → 242 (Nov–Dec → Jan–Feb → Mar–Apr); capped by daylight and the gut (76–89% of eating minutes at a full foregut in Mar–Apr); other acts are given up (rest 22–29% → 7%) | longer feeding when food is scarce (vale2020, nguessan2009: T-ENE-9's direction); fig months +20% against drupe months, 308.7 ± 85 min a day for nursing mothers (uwimbabazi2019) | direction inside; fig months inside (female classes +10% to +37% on the two stacks); fallback months outside (high: 435–651 min for juvenile, adolescent, pregnant and lactating females against 224–394) |
| 3. Intake rate | own food per eating minute 3.7–7.2 sugar-based kcal before the lean season, 1.8–3.1 for juvenile, adolescent and pregnant females in Mar–Apr, 1.0–2.5 for depleted animals (gut-limited feeding); energy eaten per day falls 2–11% (S39) and 7–18% (S31) for these classes in the fig months, 5–6% for nursing mothers | ripe fruit 10.7, young leaves 6.2, pith 3.4 kcal per minute of feeding (formula; about 8.0, 4.5 and 2.7 sugar-based); daily energy and dry matter equal in drupe and fig months, leaf-and-pith days 2,169 against non-fig fruit days 2,706 kcal (uwimbabazi2019) | per minute outside (low, below pith's rate: the minutes are gut-limited); daily energy eaten inside for mothers (−5% against 0% in fig months) and within the leaf-and-pith range for the others |
| 4. Expenditure | spending of the starving classes moves −64 to +61 kcal/day between phases (gestation rising, milk cut); walking and climbing +29 to +74 (S39) and +44 to +126 (S31) kcal/day in the fig months, day journeys 1.5–2.4 × longer (adult males 2.6 → 4.0 km on S39, 3.2 → 6.0 on S31), then back to or below baseline | shorter daily journeys and more feeding when food is scarce, less energy spent (T-ENE-9: nguessan2009, vale2020); eastern chimpanzees 3.5 km a day (2.2–4.8) (harrisonMarshall2011) | fig months outside (direction); fallback months inside; not the main term except for pregnant and adolescent females in the fig months (about equal to the intake term) |
| 5. Access | food-competition charges received rise in the fig months (S39 seed 48 in Feb: adolescent females 4.1, juvenile females 1.95 a day); recent immigrant females are charged 3.3–4.7 times a day (mostly not over food), feed in parties of 2.4–2.6 and spend 69–78% of their eating time on fallback, in deficit from arrival; mothers' milk to infants of 2–5 y falls 261–289 → 88–136 kcal/day in Jan–Feb (S31); adult males: gut room to spare, no core-area cost (females ≥ 12 y pay `coreCostFemale`), priority at food | immigrant females meet resident females' aggression and males intervene, mostly for the lower-ranked female (kahlenberg2008); no rate of aggression toward immigrants in research.md | no field number; direction inside |
| 6. Reserve dynamics | store 1,300 kcal/kg (30% of mass, assumed), death at −1; class means dip to −0.08 to −0.21 (S39 group) but juveniles of 5–8 y reach −0.35 and recent immigrant adolescents −0.48 by day 180, and depleted animals keep losing after fruit returns (§9.6); in good months reserves sit at the set point (adult males within ±0.005), so the lean season starts with no buffer | no systematic ketosis at Kanyawara or Mahale (knott2005); C-peptide tracks fruit (emeryThompson2009, vale2020): lean seasons lower the balance without deep catabolism | direction inside; depth outside |

## 11. Verdict

**The responsible term is the energy absorbed, through the gut; expenditure is second; what makes the deficit lethal is a
valuation trap.** Confidence: moderate-to-high that absorbed energy at a gut-bound foregut is the main term and that the
trap keeps depleted animals from recovering (seen on both stacks and reproduced offline from the code); moderate that
removing the trap alone makes S39 viable (five of S39's six dying animals are in seeds 5 and 11, outside the readouts).
- In the lean season the diet turns to figs and then fallback foods, which give 22% and 33% less absorbed energy per gram
  of dry matter than drupes (1.83 and 1.57 against 2.36 kcal/g, registry composition). The foregut (5.6 g of dry matter per
  kg, passing 1.87 g/kg/h at capacity; every input assumed) is full in 42–89% of the eating minutes of small and
  reproducing females, so they cannot eat more dry matter (theirs rises 0–11%, adult males' 20–24%) and their absorbed
  energy falls 50–120 kcal/day on S39 (120–260 on S31), while their feeding time rises up to twofold.
- Walking adds 30–125 kcal/day in the fig months (against the field's shorter journeys), and gestation rises: for pregnant
  and adolescent females this second term is as large as the first in the fig months.
- Once an animal is below about −0.3 of its store, E1i's reserve-weighted satiation keeps it hungry with a full foregut,
  and `forageRate` values every crown by a bout capped by the gut's room (nothing when full; below the fallback from about
  90% fill for a crown 300 m away) while the fallback where it stands keeps its full rate value. It fills the gaps between
  crown bouts with the food the gut passes least energy from, and keeps losing 48–61 kcal/day after fruit returns while
  mildly depleted animals recover at about +218 (S31). Deaths fall where the lean season meets an earlier handicap: recent
  immigrant females (five of S39's six: charged three to five times a day, feeding nearly alone, in deficit from arrival),
  a pregnancy, a weaning infant whose mother cut her milk.
- The integrator's prediction (§7) holds in part: the fallbacks supply too little per gram of gut, and expenditure is not
  the main term; but feeding time does rise (to 7.7–10.9 h a day) and other acts are traded for it.

## 12. Proposal for E1s (for the integrator to register and judge; not run here)

**E1s, digestion-limited food value** (switch `gutValue`, 0 by default; read only with `energyLedger`, `ledgerDigesta`,
`ledgerDrive` and `forageRate` 1; 0 is today's code bit for bit). A correction: it removes no counted prescription.
- **Rule replaced.** `forageRate` treats the gut two ways: a crown's bout is capped by the foregut's room counted in
  drupe units (figs included), so a nearly full gut makes every crown worth nothing; the fallback where the animal stands
  is worth its intake rate whatever the gut holds (candidates.ts:498–500, intake.ts leafWorth and netRateShare,
  energy.ts boutRoom).
- **Mechanism.** Every feeding option — a crown in view, a trip, a joined trip, the fallback here — is worth the energy of
  the bout the gut allows over the bout's time: the foregut's present room filled at the food's ingestion rate (its kcal
  per minute at the animal's size and skill, as now), then the food at the rate the full foregut passes it (the foregut's
  dry-matter capacity ÷ `ledgerGutEmptyH` × that food's own kcal per gram of dry matter), up to the crop share and the
  animal's need, all in the food's own units. At a full gut foods then rank by the energy per gram the gut passes (drupes
  2.46, figs 1.93, fallback 1.71 food-kcal per g of dry matter), so a drupe crown within reach beats the fallback here;
  with room in the gut they rank by their ingestion rates, as now. Theory: the digestive rate model (verlindenWiley1989,
  not verified; research.md "Addendum: E1r lean season"); directions: knott2005 (gut capacity limits feeding longer),
  harrisonMarshall2011 (chimpanzees pursue fruit and use pith and leaves as fillers; their gut is poorly adapted to
  fallback foods).
- **Inputs.** None new: each food's measured energy and dry matter per feeding minute (uwimbabazi2019 [H], already the
  registry's `ledgerFruitKcalPerMinSugar`, `digestaDrupeDmGPerMin`, …) and the model's own gut. Nothing set to hit a
  target; no field rate enters.
- **Readouts** (this stage's tool, `e-bench --animal-days` + `scripts/lean-season.ts`): by class and month as §9.4; the
  behaviour-by-reserve table (§9.6) in both halves of the year; the starved animals' last 60 days; the fallback share of
  plant energy and of eating time by class; eating minutes; km by phase; the S39 group's class readout (§9.2).
- **Predictions** (low confidence): animals below −0.3 recover once fruit returns (absorbed − spent > 0 where today it is
  −48 to −61 after the lean season on S31 and −74 to −98 at its end on S39), and their daylight on the ground falls toward the 15–16% of animals at −0.1..−0.3 (today 39–56%); the
  females' fallback share of plant energy in Mar–Apr falls (today 23–49%); feeding time still rises as fruit falls but
  the fallback months' eating minutes of females and juveniles come down toward 224–394 (today 435–651); fig trips are no
  longer valued as drupe trips, so the fig months' walking rises less (T-ENE-9's direction); a digestive pause (rest at a
  full gut) appears where no better food is in reach (E2a's missing midday rest, direction only).
- **Success criteria** (as §6): viable at 12 months on S39's four runs (`rngSalt` 0–3) with no starvation of weaned
  animals (today 6 in 20 seed-runs); the lean-season dip keeps its direction (class means dip and recover) with no class
  mean below −0.10 (today −0.21); feeding time rising as fruit falls; the keep rule otherwise (held-out not worse beyond
  noise; a correction, prescriptions unchanged). Kill: starvation of weaned animals not lower than S39's, or feeding
  time no longer rising as fruit falls.
- **Left for other stages (not E1s):** immigrant females' access (resident females' charges and their counterstrategy of
  staying near males, kahlenberg2008); conception without a sustained energy gain (emeryThompson2012: cycling resumed
  only after one), which let females carry pregnancies into the lean season with low reserves; the fallback's bulk and
  site (every gram of fibre swallowed, though chimpanzees wadge pith, harrisonMarshall2011 and wrangham1991, share
  unknown; the registry weights Kanyawara's pith and leaves while the phenology is Ngogo's, where leaves are the fallback,
  potts2011 and watts2012b): an audit before any input moves; no fat stored in good months (no magnitude source).

## 13. What the data could not show
- S39's own dying animals in seeds 5 and 11 (five of six deaths) have no per-animal records: the registration allowed
  three runs on seed 48 only. Their state is known at day 180 and at death.
- S39 after day 180: R3 stops there (cap of three runs), so the post-lean trap and the starved animals' last 60 days are
  shown on S31 only; on S39 the trap is seen within days 90–179.
- Who charged the immigrant females and why: only the food-competition code is recorded.
- Decision values during the day: not recorded; the switch from crowns to fallback as the gut fills was computed offline
  on a saved world by setting the gut fill (guts are empty at 06:30, the day boundary), not observed in a decision.
- Field numbers that do not exist in research.md: a chimpanzee's maximum dry-matter intake or passage rate, a rate of
  aggression toward immigrant females, the size of seasonal fattening, and whether wild chimpanzees fill a full gut with
  fallback (the field measures ingestion rates, not passage).
- Today's model holds only eating minutes by month and the year's fruit share; the S39 group's class readout holds no
  adolescents, no reserve of pregnant females and no spending by term by month (seed 48 only, R3).
