# E1w pre-registration: the newly weaned juvenile

Branch `e1w-weaned` (from `track-e` 7bbb752), 7 October 2026. Track E, stage E1w. Follows the diagnosis
`ey-juvenile-starvation.md` (read in full; its tables T1 to T9 are quoted as "T1" … "T9"). This file is committed in two
steps before any code: §1 the audit (docs only), then §2 the registration. Nothing has been run for this stage.

**Rules served (user, verbatim).** "Field numbers are targets, never inputs; never tune an input to hit a behavioural
rate. Before building toward a field number that is far off, audit its source: sample, method, formula." "Pre-register
and commit before any run of changed code. At most 3 iterations per stage, each logged before its run." "Seeds:
development 48 and 7 only; confirm runs 48, 7, 21, 5, 11." "All switches stay 0 by default. Goldens and the field pin
test (tests/sim-track-e.test.ts) must not move."

**Seen before this registration (disclosed).** The whole of `ey-juvenile-starvation.md` (three-year runs of stack S39 at
swallowed shares 0.5 and 0.25, the four 120-day continuations P1 to P4, the offline gut ceiling); `e1n-prereg.md` and
`e1o-prereg.md` with their results. No source was re-read on the network for this stage: every statement about a source
below is taken from `docs/research.md` (section named each time) as it stands at 7bbb752.

## 1. Audit: what the model does to a 4 to 6 year old, 16 kg animal, and what its sources measured

File and line at 7bbb752. "Label" is the registry's evidence tag in `data/params.json`. "In sample" asks one thing: was
an animal of 4 to 6 y and about 16 kg among the animals the cited source measured?

### 1.1 (a) Gut capacity and passage by body mass

| What the model does | Registry entry (value, range, label) | What the source measured | 16 kg, 4 to 6 y in sample? |
| --- | --- | --- | --- |
| Foregut and hindgut capacity = mL per kg × body mass × a dry-matter density (`src/sim/energy.ts`:133–134, 243–246). Small bodies get the adult proportion, exactly. The only departure from mass is a lactating female's gut (`energy.ts`:229–236, `ledgerLactGut`). | `digestaGutMlPerKg` 83 mL/kg, 60–111, **assumed**: "isometric scaling with body mass assumed" | One captive female chimpanzee, 3,322 cm³ for the whole tract (stomach 965 cm³), cited by nakamura2017 from chiversHladik1980; "Her body mass and age, and how the volume was measured, are not given" (research.md E.25). 83 = 3,322 ÷ an assumed 40 kg. Across species, wet gut contents scale about as mass^1.0 in herbivorous mammals, birds and reptiles (clauss2013, a review; "no primate value") | **No.** n = 1 adult of unknown mass. "Not found: … within-species (ontogenetic) scaling of a simple gut's capacity" (research.md, gut inputs audit, stage E1u) |
| Share of the gut that is foregut | `digestaForegutShare` 0.45, 0.40–0.48, **assumed** | Milton 1987's table, read on a secondary web page: stomach 17–20%, small intestine 23–28%, orangutans and chimpanzees pooled; the one captive female above had a stomach of 29% | No (adults; the two disagree) |
| Dry matter a full gut holds | `digestaForegutDmGPerMl` 0.15, `digestaHindgutDmGPerMl` 0.20, **assumed** | "No ape value found"; pigs after weaning and humans (jerezBogota2025, highamRead1992, sender2016) | No |
| The foregut empties first-order with one time constant for every size (`energy.ts`:144, 546–551), and only as fast as its fibre fits in the hindgut | `ledgerGutEmptyH` 3 h, 1.5–6, **assumed** | Human solid meals (tougas2000: 123 volunteers); 7 captive adult chimpanzees, barium spheres, emptied in "more than 3 hours and less than 16" (ardente2011, abstract) | No |
| The hindgut passes residue with one retention time for every size (`energy.ts`:122–123, 553–556) | `digestaMrtH` 38 h, 31–48, **assumed** | miltonDemment1988: six captive adult females, 47.0 ± 4.9 kg (second-hand, nrc2003), particle markers, 38 h on 34% NDF and 48 h on 14% NDF; lambert2002 31.5 h | No (adults three times the mass) |
| Share of fibre fermented | `digestaNdfDigestibility` 0.449, 0.40–0.75, **assumed** | Captive western gorillas (remisDierenfeld2004 through masi2015); the chimpanzee trial gave 54.3% and 70.6% (miltonDemment1988, the same six adults) | No |

Direction evidence that a gut is not a fixed volume per kg, none of it on a growing ape: gut fill rose with intake and
with fibre in four adult male macaques of 11–16 kg (sawada2011); human colonic content follows the residue eaten
(bendezu2017); across 19 captive primate species retention time "is not related to body mass but falls with relative
intake" (clauss2008, abstract); the alimentary tract of small mammals grows in lactation (speakman2008, the source of
`ledgerLactGut`).

**Reading.** Every gut input is an adult or a cross-species value labelled "assumed", and the rule that carries it to a
16 kg body (the same mL per kg, the same hours) was never measured in any ape of any age. The evidence does not show
this rule wrong, input by input; it is **unmeasured**. What is shown wrong is its consequence (§1.6).

### 1.2 (b) What the juvenile spends

| What the model does | Registry entry | What the source measured | In sample? |
| --- | --- | --- | --- |
| Resting cost = 70 × mass^0.75 kcal/d (`energy.ts`:145, 561–566) | `ledgerRmrCoef` 70, 60–90, **assumed**; `ledgerRmrExp` 0.75, **assumed** | Kleiber's cross-species equation. pontzer2016 puts the basal rate of *Pan* at 0.96 of it, "estimated from published respirometry of chimpanzees aged 2 months to 15 years (Bruhn & Benedict 1936; Bruhn 1934), not measured in these adults" (research.md E.3) | **Yes, second-hand**: immatures are the animals behind the 0.96; the 1930s papers were not read |
| Awake × 1.25, feeding × 1.38, asleep × 1.0 (`energy.ts`:561) | `ledgerActRest`, `ledgerActFeed`, `ledgerActSleep`, **assumed** | Cross-species primate time-energy budgets (leonardRobertson1997 through nguessan2009; "the multipliers themselves were not seen") | No |
| Total: nothing is fitted to it | (check only) | Doubly labelled water in 27 chimpanzees and 8 bonobos, all "adults (10 years or older)", 46.4 kg (F) and 57.9 kg (M) (pontzer2016) | No |
| Growth is charged as spending at a captive potential, 3.4 (F) or 3.8 (M) kg a year × 4.5 kcal/g = 41.9 or 46.8 kcal/d (`energy.ts`:188–190, 579–594) | `ledgerGrowFemaleKgPerY` 3.4, 2.8–4.1, **M**; `ledgerGrowMaleKgPerY` 3.8, 3.4–4.3, **M**; `ledgerGrowthKcalPerG` 4.5, 2.9–6.0, **assumed** | curry2023: 298 sanctuary chimpanzees (151 M, 147 F; 252 wild-born orphans confiscated at about 1–3 y), one randomly chosen mass per animal, piecewise linear regression of mass on age: "the first slope is the growth rate". Cost per gram: human infants (robertsYoung1988) | **Yes for the rate** (captive animals of this age are in the regression); no for the cost |
| Growth yields when energy is short: with `ledgerGrowSurplus`, `ledgerGrowPotential` and `growYield` 1 (all on in S39) the share paid is the relative store, min(1, cond ÷ `ledgerCondSet`) (`energy.ts`:523–524); mass never falls | `growYield` switch, **design** ("the proportional form is a design assumption with no free parameter") | schoenbuchner2019 (5,160 Gambian children under 2 y: wasting precedes stunting), richard2012, thissen1994: the order, no number | Human children; direction only |
| Walking is charged at 3.8 J per kg and metre for every size (`energy.ts`:148, 611–620) | `ledgerWalkJPerKgM` 3.8, 2.8–5.8, **M** | sockol2007: "5 captive chimpanzees aged 6–33 years, 33.9–82.3 kg (mean 59.8 kg), on a treadmill at 1.0 m/s" | **No.** The lightest animal weighed twice the juvenile |
| Walking speed: adult speed of the sex × (mass ÷ adult mass)^⅙ (`src/sim/gait.ts`:63, `walkGait`, on in S39). It sets time, not cost per metre. A weaned juvenile follows its mother when more than 15 m away (`src/sim/candidates.ts`:402–407, `juvenileFollowM`) and is carried only below 4 y (`candidates.ts`:215–218) | `walkGaitSizeExp` 0.1667, **assumed**; `walkGaitFemaleMps` 0.78, **L** | Hunt 1989 through nguessan2009 (not read; method and sample "not given"): 0.75 m/s for "females carrying an infant and for young individuals", put at 20 kg; equal Froude number (alexanderJayes1983) | Roughly (one second-hand figure for "young individuals") |

Arithmetic from the registry (`scripts/e1w/arith.py`, §1.5): a 16.5 kg animal has 0.85 of an adult female's gut per
kcal of resting need; the ledger charges it 15.0 kcal per km walked, and taylor1982's all-mammal equation (10.7 ×
M^−0.316 J per kg and metre, 62 species) would charge 17.4, because cost per kg rises as bodies get smaller. If the
equation's slope holds within chimpanzees the ledger under-charges a small walker by about a fifth: an error against
the animal, so not a candidate repair. Measured in P1 (T4): after its weaning id 37 walks 4.0 to 4.9 km a day on its own
legs (2.3 before) and walking and climbing rise from 54 to 103 kcal/d; the founder juveniles of 6.9 and 8.4 y walk 2.6
to 4.2 km. No source in research.md gives a juvenile's day range (lonsdorf2014: independent travel 8.7% of observation
time at 4.5 y, riding 1.4%).

**Reading.** Resting cost: inside its source's sample, second-hand. Growth: the rate is a captive measurement that
includes this age, and research.md already records that the wild outcome is about half of it (about 10 kg at 5 y
against the potential's 18.2 and 19.8 kg; gurvenWalker2006 reading pusey2005's curves, "a very rough estimation",
T-INF-4, band 7–13 kg): the model's 4.2 to 4.9 year olds weigh 16.3 to 17.4 kg (T4). That is a miss against a target the
potential is not allowed to be fitted to; growth does yield to the reserve, mass does not come down. Walking cost:
outside its sample, and the likely error makes the juvenile's position worse, not better. **Nothing here is shown wrong
by a source; the walking cost and the activity multipliers are unmeasured at this size.**

### 1.3 (c) Intake rate, diet and access

| What the model does | Registry entry | What the source measured | In sample? |
| --- | --- | --- | --- |
| Fruit and fallback intake rate = the adult rate × (mass ÷ adult mass)^0.75 × a skill factor (`energy.ts`:208–211, 356–359; `src/sim/execution.ts`:1122–1123, 1161) | `ledgerIntakeSizeExp` 0.75, 0.5–1, **design**: "No chimpanzee measurement of ingestion rate against body size was found" | bray2018 (Kanyawara, 26 immatures and 31 adults; ingestion rates from 1992–1993 samples, 321 records on five ripe fruits): infants below adults (β = −4.72 items/min), "juveniles lower but not significantly (β = −1.72, SE 0.79)"; "Absolute rates are only in a figure (not read)". schuppli2016 (orangutans): adult rates on easy foods just after weaning; "The E1c size exponent (0.75, design) finds no support here" | Juveniles are in bray2018; it gives a direction, no magnitude |
| Energy and dry matter per feeding minute, fibre share: one value per food for every size (`energy.ts`:121–137) | `ledgerFruitKcalPerMinSugar` and the `digesta*` food entries, **H** | uwimbabazi2019: Kanyawara adult females, January 2014 to June 2015; "No water content and no body mass are reported" | No (adult females' bites) |
| Before weaning the animal feeds itself only on the ground, at its mother's tree, or by begging: a foraging mother within 5 m hands a piece of 50 kcal out of her own gut (`candidates.ts`:400–401; `energy.ts`:800–820) | `ledgerPlantShareKcal` 50, **design**; `begPlantRangeM` 5, **design** | none | Unmeasured |
| Access: an adult may supplant a feeder only if the feeder is 5 y or older, and a guardian in sight deters it (`candidates.ts`:1154–1157) | literal 5 y; "strength L" | "[H for contest competition; strength L]" | Unmeasured |

Measured in the runs (T4): on milk at 3.4 to 4.9 y the animals feed themselves for 104 to 204 minutes a day and are
handed 10 to 150 kcal/d of plant food (to 176 at a share of 0.25); the field's infants of 3 to 5 y eat in 32 to 49% of observation time (lonsdorf2014,
40 Gombe infants, 1-min point samples) and forage 46.7 ± 6.0% of the time at 4–5 y (badescu2022, 72 Ngogo immatures,
1,245 focal hours), about 230 to 350 minutes of a 12-hour day (T-INF-1, a miss known since E1m). After the clock the
same animals eat 292 to 635 minutes a day with the foregut full in 47 to 91% of them: the limit is the gut, not the
bite rate and not exclusion (the deficit starts on the day of weaning; nobody may supplant them before 5 y).

**Reading.** The intake rate by size is **unmeasured** in magnitude (a design exponent). Self-feeding time before
weaning is **wrong against T-INF-1** and was already known. Neither is what starves the weaned animal.

### 1.4 (d) Weaning

**What the model does.**
- A date ends milk. `src/sim/generation.ts`:112–113 draws `weanAge = weanAgeMinY + r() × weanAgeSpanY` at creation
  (`weanAgeMinY` 4.1 y, label **M**, "Earliest weaning (Kanyawara mean suckling end 4.8 y)", ref bray2018;
  `weanAgeSpanY` 1.1 y, **assumed**). `src/sim/life.ts`:277–282 sets `weaned` on the slow step in which the age passes
  it. Nothing reads the animal's size, reserves, milk intake or its mother's state.
- Everything stops in that step: the mother's lactation flag (`life.ts`:281), so her gland is emptied and stays dry
  (`energy.ts`:577, 440–441); the dependent's branch of the menu (`candidates.ts`:165–170, 381–401), so no begging and
  no handed plant food; the milk term of its drive (`energy.ts`:358). The nurse option stays on the menu for 0.3 y more
  (`candidates.ts`:395; `execution.ts`:1030) at a dry gland.
- Milk does not taper by age. The gland fills at the full yield whatever the offspring's age (`energy.ts`:577; at most
  307 kcal/d). Measured at 0.5: 225 to 309 kcal/d at 4.2 to 4.9 y, 25 to 37% of what the animal absorbs, to the last day (T4).
- `weanDecide` (E1n) replaces the weaning refusal roll by the mother's decision at each bout; `weanDeficit` (E1o) makes
  that decision a comparison of relative reserve deficits, day and night (`execution.ts`:914–917, 1006–1011). Both are
  on in S39. They lower milk at 1–4 y from 307 to 240, 224, 213 kcal/d (e1o-prereg §2.2). **They do not end it**: "Weaning
  does not emerge: milk is 213 kcal/day at 3–4 y and nothing drives it to zero before the prescribed age, so
  `weanAgeMinY`/`weanAgeSpanY` stay" (e1o-prereg §2.2). Three terms keep it flowing: a tie allows the bout (both at or
  above their set points); the infant's nurse score has a part that needs no hunger (0.25 × the bout's worth,
  `candidates.ts`:396), which alone beats its best own food in 52–56% of its decisions (e1o-prereg §1.4); and the
  infant's need exceeds the yield from 1 y on. So the stored clock is the only thing that ends milk in these runs.
- A second age limit sits behind the clock: no animal of 6 y or more has a caretaker (`candidates.ts`:167), so it
  cannot be offered the nurse act or suckle at night whatever its `weaned` flag says.

**What the field sources say** (research.md E.12 to E.14, E.38, E.40; "Early life and maternal effects").

| Question | Source: sample, method | Finding | Limit |
| --- | --- | --- | --- |
| Age at the end of suckling | lonsdorf2020 [H]: Gombe Kasekela, 41 years of mother–offspring follows, 1-min point samples; 65 offspring of 29 mothers, 37 with a known weaned age. "Weaned age = midpoint between the last observed nipple contact and the next session without it, using only gaps under 90 days" | 4.71 y, SD 1.04, range 2.82–8.01; females 88.5 days earlier; "The lowest-ranking mothers weaned latest"; Table 1: 4–5 y (Mahale), 4.1–6 (Kanyawara), 4–7 (Ngogo) | Nipple contact, comfort suckling included |
| | bray2018 [M]: Kanyawara, "the last day on which a subject was observed to suckle", no suckling in the next 90 days | 4.8 ± 0.7 y (4.1–6.0), n = 8 | n = 8 |
| Gradual or abrupt | badescu2017 [M, abstract]: Ngogo, 560 faecal samples of 48 infants, δ15N and δ13C, infant minus mother | Largest milk signal at 1 y or younger, "then a steady decline; weaning ends at 4–4.5 y", before nipple contact ends | The course between 1 and 4.5 y is read second-hand (lonsdorf2020, badescu2016) |
| | badescu2022 [M]: Ngogo, 72 immatures 0–9 y, 1,245 focal hours | Nursing about 3% of time and 1.00 bout an hour from 6 months to 4 y, no change with age; "decreasing after 4 y, to 7 y in some"; the authors: "infants were effectively leading their own gradual physiological weaning process" | Milk transfer not measured; no night data |
| | badescu2023 [M]: 164 shed hairs, 29 infants | Milk signal still present at 2.5–3.5 y; "Three males aged 4–7.5 y still had higher δ15N than their mothers" | 1–13 hairs per age class |
| | matsumoto2017 [M, abstract]: Mahale, 19 infants, 518 h | "nutritional independence long before cessation of nipple contact"; milk dependence fell at about 3 y | abstract |
| Supply | kent1999, daly1993, deweyLonnerdal1986 (women), wilde1995 (goats), wildePrenticePeaker1995; smith2017 (4 wild orangutans, barium in teeth) | Production follows removal under a ceiling the mother sets; orangutan milk intake after the first year cycles with food and ends at 8.1–8.8 y | No chimpanzee or ape milk output exists (research.md E.14.7) |
| The mother's refusals | vandeRijtPlooij1987 (six pairs to 30 months), clark1977 through maestripieri2002 (six Gombe pairs), badescuThesis2017 | Rebuffs from 5–6 months; rejections from 2–3 y before suckling ceased, "stronger when mothers resumed oestrus"; at Ngogo "rarely seen with older offspring" | "No rates of nipple refusal by infant age were found" |
| Nursing after the next sibling's birth | lonsdorf2020 | "Four older siblings briefly resumed suckling after a younger sibling was born, more than 8 months after their own last suckling" | Four cases; no rate, no amount |
| Body mass at weaning | gurvenWalker2006 reading pusey2005 [L] | "a very rough estimation": 10 kg at 5 y, both sexes | The primary curves were not read |
| Growth after weaning | emeryThompson2016 [M, abstract]: Kanyawara, urinary creatinine | Juvenile lean mass "rose with the interval to the next sibling's birth"; "offspring growth suffers when mothers wean early" | abstract |
| | samuni2020 [H]: Taï, 1,318 urine samples of 70 chimpanzees aged 4–15 | Orphans (mother lost after weaning) had less muscle mass; title: "post-weaning juvenile dependence" | What the mother gives after weaning is not measured |
| Mortality after weaning | badescu2016 [H]: Ngogo, 42 pairs | "No weanling (4–6 y) had died at Ngogo so far" | A food-rich community; n of weanlings not given |
| | hobaiter2014 [H]: four sites, 36 adoptions; one-year survival, N = 33 | "42% of orphans under 4 survived vs 95% of those aged 4 or more" | Small N; survival for one year only |
| | registry: `hazardJuvenile` 0.011 a year at 5–15 y (wood2017, Ngogo life table, **M**) | The lowest hazard of the life course | all causes |

**Reading.** The sources show the model **wrong** on three points and leave one **missing**:
1. *A date ends milk.* In the field the end of suckling ranges from 2.82 to 8.01 y and follows the pair's state
   (maternal rank, offspring sex, the mother's return to cycling). T-INF-3's own note says the row "counts as
   validation only once weaning follows from milk supply and maternal state".
2. *Milk stops in a day while it is still a quarter to over a third of intake.* In the field the milk share has fallen to
   about nothing by 4–4.5 y, and nipple contact goes on after that.
3. *Every provision ends in the same step* (milk, handed food, the mother's lead). The field shows dependence after
   weaning (samuni2020, emeryThompson2016), without saying what it consists of.
4. *Missing: any rule for what ends milk.* No refusal rate, no milk output at any age, no night nursing, no rule for
   two offspring at one gland. E1n and E1o looked for the rule in the mother's decision and did not find it.

### 1.5 Size arithmetic (output of `scripts/e1w/arith.py`, registry values only)

| body mass, kg | resting, kcal/d | foregut, g dry matter | gut per kcal of resting need ÷ adult female | intake rate ÷ adult female (ledgerIntakeSizeExp) | walking speed ÷ adult female (walkGaitSizeExp) | walking, kcal per km: ledger / taylor1982 | walking per kg and km ÷ adult female: ledger / taylor1982 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 394 | 56 | 0.75 | 0.42 | 0.83 | 9.1 / 12.4 | 1.00 / 1.43 |
| 12 | 451 | 67 | 0.79 | 0.49 | 0.85 | 10.9 / 14.0 | 1.00 / 1.35 |
| 16.5 | 573 | 92 | 0.85 | 0.62 | 0.90 | 15.0 / 17.4 | 1.00 / 1.22 |
| 20 | 662 | 112 | 0.89 | 0.71 | 0.93 | 18.2 / 19.8 | 1.00 / 1.15 |
| 24 | 759 | 134 | 0.94 | 0.82 | 0.96 | 21.8 / 22.5 | 1.00 / 1.09 |
| 31.3 | 926 | 175 | 1.00 | 1.00 | 1.00 | 28.4 / 27.0 | 1.00 / 1.00 |
| 39 | 1092 | 218 | 1.06 | 1.00 | 1.00 | 35.4 / 31.3 | 1.00 / 0.93 |

- Growth at the potential: 41.9 (F, 3.4 kg/y) and 46.8 (M, 3.8 kg/y) kcal/d at 4.5 kcal/g; at the Gombe-derived 1.6 kg/y (T-INF-4, low confidence): 19.7 kcal/d.
- Mass on the potential curve at 4.5 y: F 16.5 kg, M 17.9 kg; at 5 y: F 18.2, M 19.8 kg (T-INF-4's band at 5 y: 7 to 13 kg).
- Milk: a 31.3 kg mother makes at most 307 kcal/d (54% of the resting need of a 16.5 kg animal) and pays 384 kcal/d for it.
- Weaning clock: 4.1 to 5.2 y (uniform), drawn once per animal.

A wild-sized 5-year-old (10 kg) would be worse off in this ledger than the model's 16.5 kg one: 0.75 of an adult's gut
per kcal of resting need against 0.85. So the captive growth potential is not what starves the weaned animal; a
lighter juvenile would starve sooner.

### 1.6 Verdict of the audit

| | Shown wrong by a source | Missing | Merely unmeasured |
| --- | --- | --- | --- |
| (a) gut by body mass | no single input | — | **all of it at this size**: capacity per kg (n = 1 adult), its split, digesta density, emptying and retention times, fibre digestibility; the rule that a small body gets the adult proportion |
| (b) expenditure | — (growth: the potential is captive by design and the wild mass at 5 y, a target, is about half of it) | — | walking cost per kg below 34 kg; the activity multipliers; a juvenile's daily travel. Resting cost is in sample, second-hand |
| (c) intake and access | self-feeding time before weaning, against T-INF-1 (known since E1m) | — | intake rate by size (a design exponent); what a mother hands over; supplants by age |
| (d) weaning | **a date ends milk; milk stops in a day at a quarter to over a third of intake; all provision ends in one step** | a rule for what ends milk; milk after a sibling's birth | milk output, refusal rates, night nursing |

**The outcome that is wrong, whatever its input.** The field's juveniles of 4 to 6 y live without milk: none had died
at Ngogo, 95% of orphans of 4 y or more survive a year having lost milk and mother at once, and the life-table hazard
at this age is the lowest of all. The model's cannot: the most the gut passes is 1.03 of what a 16 kg animal spends
(T9), and 12 of the 48 founder animal-runs weaned in three years at 0.5 starved. That joint result of (a), (b) and (c)
is shown wrong. Which input carries the error is not shown by any source in research.md: the animal is outside the
sample of every gut input, of the walking cost and of the intake rates.

**What the sources support building, and what they do not.**
- *Supported:* point 1 of §1.4. That the end of milk is an outcome of the pair's state and not a date is measured
  (lonsdorf2020), the supply side is sourced (production follows removal: kent1999, daly1993, wilde1995; already the
  ledger's gland rule), and the mother's side exists (`weanDecide`, `weanDeficit`). It removes an encoded target
  (T-INF-3).
- *Not supported:* any change to (a), (b) or (c). A juvenile gut scaling, a faster passage or a cheaper small body
  would each be a number nobody measured, and the only reason to pick one today would be that it closes the gap in T9.
  That is tuning an input to a behavioural rate. It is put to the user as a decision (§2.9), not built.
- *Consequence, stated before any run:* removing the date does not give the animal a gut it can live on. If nothing in
  the pair's state ends milk, milk will run to the code's other age limit (6 y). The registration below is written so
  that this outcome counts as the mechanism failing, not as the deaths being fixed.

## 2. Registration (committed before any code of this stage; nothing has been run)

### 2.1 What is registered

**One mechanism, for point 1 of §1.4 only: the end of milk is an outcome, not a date.** Switch `weanOutcome` (0 by
default in both profiles; read only with `energyLedger`, `ledgerDrive`, `weanDecide` and `weanDeficit` 1, so the
compressed goldens and the field pin cannot move). Nothing is registered for (a), (b) or (c): §2.9.

**What it replaces** (for an animal whose mother is alive):
- `life.ts`:277, "weaned when the age passes the stored `weanAge`" → weaned when it has drunk no milk for
  `weanDryDays` days. Until then it stays what it is today before the clock: its mother's dependent, with the nurse
  option on its menu and the mother deciding each bout by `weanDeficit` (her relative reserve deficit against its own),
  by day and at night, and the gland making milk only as it is removed (the existing rule: a full store stops
  synthesis; kent1999, daly1993, wilde1995).
- `candidates.ts`:395 and `execution.ts`:1030, "the nurse option until `weanAge` + 0.3 y" → no age bound of its own.

**What it does not touch.** The mother's decision and the infant's nurse score (E1n, E1o; the score's age factor
1 − age ÷ 7 and its hunger-free part stay). The age limit of dependence (`candidates.ts`:167: no caretaker from 6 y),
which becomes the last stop if milk has not ended by itself. An animal whose mother is dead: the stored age decides as
today (the orphan rules of stage C8 and T-DEM-24 are not this stage's subject). Founders: which of them start weaned is
still read from the stored age at creation (`generation.ts`:113, 388). Births, amenorrhoea, growth, the gut: unchanged.
A weaned animal never becomes unweaned again (the four Gombe cases of resumed suckling are not modelled).

**State.** One key added lazily to an unweaned animal while the switch is on, `ChimpX.lm`: the simulation time (h) at
which it last drank milk (set where milk is drunk, `execution.ts` nurse act and night suckling; opened at the first slow
step that sees the animal, so the count starts when the switch does). Listed in `OPTIONAL_X`. Kept after weaning, so a
readout can give the age at the last milk (T-INF-3's definition: the end of suckling, not the day the status changes).

### 2.2 Inputs

| id | value | range | label | why this value |
| --- | --- | --- | --- | --- |
| `weanOutcome` | 0 (1 = on) | 0–1 | design (switch) | — |
| `weanDryDays` | 90 d | 30–180 | **design assumption**, never fitted | How long without milk counts as weaned. No source measures when a chimpanzee's lactation is over. 90 days is the field's own convention for calling an animal weaned (lonsdorf2020: "gaps under 90 days"; bray2018: no suckling "in the subsequent 90 days"), so the model's weaned age is counted the way T-INF-3's is. A convention of measurement, not a rate of behaviour; the ecological clock (physiology), like every other ledger term |

Prescription ledger (honest classes, `scripts/lib/prescriptions.ts`): `weanDryDays` is a **timer**, so it is classed
outcome-encoding (kind `timer`, borderline), active only while the switch and its needs are on: the count of a stack
that turns the switch on rises by one. The clock it retires (`weanAgeMinY`, `weanAgeSpanY`) is classed *input* by the
ledger's rule 4 although it encodes T-INF-3 (flagged in e1o-prereg §4, never changed), so the count does not fall for
it; the switch therefore carries a `removesNothing` note saying exactly that. Reclassing the old clock is the
integrator's call (it changes every stack's count) and is not done here.

### 2.3 What would count as it working (none of these is the death count)

To be read in the three-year confirmation (§2.8), which this stage does not run. Per seed-run, founders and animals born
in the run alike; "weaned age" = age at the last milk of an animal weaned by the dry rule.
- **W1, weaning happens by the pair's state.** Fewer than half of the animals that pass 6 y in the run are still
  drinking when the age limit of dependence stops them. Weaned ages spread (SD above 0.3 y). Their mean against
  T-INF-3 (3.7–5.8 y) is reported as a target, no longer encoded.
- **W2, milk tapers before it ends.** Milk per day at 4–5 y below milk at 3–4 y, and below 100 kcal/d in the 180 days
  before an animal's last milk (the isotope signal ends at 4–4.5 y, before nipple contact does).
- **W3, the weaned animal copes like the older juveniles do.** In the 365 days after its last milk: reserve ÷ store
  never below −0.5 and its mean not below the founder juveniles' of 6–8 y in the same run by more than 0.1; eating
  minutes and the share of them at a full foregut not above those juveniles' by more than a quarter.
- **W4, growth.** Mass at 5 y against T-INF-4 (7–13 kg), reported. Expected to stay near 18–20 kg (the captive
  potential, more milk): this mechanism cannot improve it and may worsen it; said here so it is not read as a surprise.
- **W5, the mothers and the next infant pay no hidden bill.** Nursing mothers' reserve trend not below the viability
  line (−0.05% of the store a day) where the base's is above it; births per female-year not below the base's by more
  than its seed spread; starvation deaths under 0.5 y not above the base's (an older sibling and a newborn can share
  one gland, and no rule ranks them).

### 2.4 What would count as it failing

Any one of these, and the switch stays off:
- **F1, one clock for another.** Half or more of the animals that pass 6 y are still drinking at the limit. Then the
  end of milk is set by `candidates.ts`:167's literal instead of `weanAgeMinY`, the cliff has moved from 16 kg to
  about 22 kg and nothing has emerged. Expected by the registrant with about 65% confidence, because E1o found nothing
  in the pair's state that drives milk to zero.
- **F2.** Starvation deaths under 0.5 y rise, or newborns of mothers with an unweaned older offspring sit lower in
  reserve than other newborns by more than the base's spread.
- **F3.** Nursing mothers cross the viability line, or births fall beyond the base's spread.
- **F4.** Animals weaned by the dry rule sink as today's do (W3 missed). That would say the small body's budget, not
  the date, is the defect, and that (a) to (c) need a measurement.
- A lower starvation count with F1 is **not** a pass. It would mean the animals were kept on milk until they were big
  enough for this gut.

### 2.5 The cheap check (step 4 of the brief): what it can and cannot show

The note's settling check (`ey-juvenile-starvation.md` §3): continue seed 48's day-365 world of M12-W50 (swallowed
share 0.5, S39) for 120 days twice, switch off and on. In that world id 22 was weaned by the clock on day 222 and stays
weaned in both arms (the switch never un-weans); id 37 reaches its stored age on day 411, so the off arm weans it there
and the on arm does not. Then seed 7 the same way: there ids 22 and 37 reach their stored ages on days 533 and 498,
after the window (T2), so **nobody is weaned in either arm**.

It can show: that the code at switch 0 is the saved run (identity, §2.6); that with the switch on id 37 keeps its milk
and how its budget, its mother's and the gut-full share then differ from the off arm over 74 days. It cannot show W1,
W2, F1 or F2: 120 days hold one animal crossing one date, nobody reaches 6 y, and nobody can go 90 days dry.

**Readouts** (per-animal rows of `scripts/lib/energy-probe.ts`, `animalDays`, defined as in the note's T4): reserve ÷
store at the end of a block (`res` ÷ `store`); absorbed = (`kin` − `fec`) per day; spent = the sum of the expenditure
terms (`o*`); net; milk (`eMilk`); plant food handed (`eShared`); eating minutes (`tEat` ÷ 4); share of eating ticks
at a foregut at least 0.95 full (`tEatFull` ÷ `tEat`); walking + climbing (`oWalk` + `oClimb`); km on the ground
(`walkM`); mass (`kg`). Blocks: days 365–410 (before the stored date) and 411–484 (after it) for id 37; the whole
window for id 22, for id 37's mother and for the founder juveniles ids 35 and 19.

**Predictions (before any run).**
- Seed 48, off arm: equal to the note's P1, float for float (every animal-day row and every class trajectory). High.
- Seed 48, on against off, days 365–410: identical (the arms differ by nothing until the off arm's clock fires). High.
- Seed 48, on arm, id 37, days 411–484: not weaned; milk 150–310 kcal/d (off: 0 after a few days); eating minutes
  below 250 a day (off: 292 to 383); foregut full in under 20% of its eating minutes (off: 47 to 61%); net per day
  higher than the off arm's by 15 kcal or more; reserve ÷ store on day 484 between −0.03 and −0.12 (off: −0.14 in P1).
  Moderate.
- Seed 48, on arm, id 37's mother: reserve ÷ store on day 484 lower than in the off arm by 0.01 to 0.06 (she pays for
  74 more days of milk). Moderate to low.
- Seed 48, id 22 (weaned since day 222): −0.5 to −0.7 on day 484 in both arms (the switch does nothing for her). High.
- Seed 48: no animal weaned by the dry rule in the window. High.
- Seed 7: on = off = the note's P3, float for float, apart from the added key (nobody reaches a stored age). High.
  This pair is a control of "the switch changes nothing before a date would have fired", not evidence for the mechanism.

**Reading rule.** One animal over 74 days is a direction check, not a result: every difference is reported with its
size, none is called confirmed. If id 37's on-arm values land outside the predicted ranges the miss is reported as a
miss. No value of `weanDryDays` or of anything else is changed in response to these runs.

### 2.6 The checkpoint's identity, and what is done about it

A checkpoint records the git tree of `src`, `scripts` and `data` it was made from and its settings (`scripts/lib/checkpoint.ts`;
`scripts/e-bench.ts` header: `--resume` is "refused (exit 2) for other settings or code"). M12-W50's were made from src
tree e88a533e; this branch's src differs (90 files since, plus this stage), and the on arm changes a setting. So
`e-bench --resume` refuses both arms, rightly: neither is a resume of that run.

What is done instead, in the open: the arms are **forks** of the saved world, made by a script of this stage
(`scripts/e1w/fork-probe.ts`, after the note's `scripts/ey-juv/resume-probe.ts`) that loads the checkpoint's world,
ticks it with a frozen checkout of this branch's committed head, writes the two src trees and the changed setting into
its output, and never writes into a saved run. What makes a fork readable is not the identity check it cannot pass but
a test it can fail: **the off arm must reproduce the note's P1 (seed 48) and P3 (seed 7), which were made with the
checkpoint's own code, float for float over all 120 days.** If it does, this branch at switch 0 is the saved run's code
on this world. If it does not, the on arm is not read.

Registered fallbacks, in order: (1) if the off arm differs because `track-e` moved on since the checkpoint (a state key
the saved world lacks), the arms are run from a frozen checkout of the checkpoint's commit with only this stage's
`src` patch applied, and the same test applies; (2) if that fails too, no continuation is run. A fresh run from day 0
cannot replace it inside the limits: the first founder is weaned on scored day 215 (absolute day 245), twice the 120
days a job may simulate. The check would then be reported as not made.

### 2.7 Iterations and run log (each line written before its run)

At most 3 iterations. An iteration is a change of this stage's `src` code followed by runs; the registered design above
is iteration 1. Seeds 48 and 7 only, `rngSalt` 0, the saved S39 parameters, at most 120 simulated days a job, one job at
a time, `uptime` and `sysctl -n vm.swapusage` before each (no launch above 6 GB of swap used). Outputs under this
worktree's `artifacts/validation/e1w/` (gitignored). (The brief sets 120 days a job; the integrator kit's older 90-day
line is superseded by it.)

| run | world | arm | days | meant to show |
| --- | --- | --- | --- | --- |
| R0 | M12-W50 seed 48, day 395 | off | 1 | smoke: the fork loads and ticks; day 365 equals P1's |
| R1 | M12-W50 seed 48, day 395 | off | 120 | identity (equal to P1); the reference arm |
| R2 | M12-W50 seed 48, day 395 | on | 120 | id 37 past its stored date with the switch on |
| R3 | M12-W50 seed 7, day 395 | off | 120 | identity (equal to P3) |
| R4 | M12-W50 seed 7, day 395 | on | 120 | control: equal to R3 |

### 2.8 Left for the integrator (not run here)

The three-year confirmation: S39 at a swallowed share of 0.5 with `weanOutcome` 1, seeds 48, 7, 21, 5, 11, against the
saved Y3-W50 and Y3-W50-s1, with the per-animal readout on (the saved three-year runs have none, which is why the note
had to infer who died). Parameter file and command are written at the end of this file once the code exists (§6).

### 2.9 Not registered: the small body's budget (a decision for the user)

The audit finds the juvenile's gut, walking cost and intake rate unmeasured, and no source to build on. Two ways
forward that are not tuning, neither taken here:
1. **A range, as for wadging** (user, 5 October: "Test a range"). The registry already holds a design form for sizing
   a capacity to need instead of mass (`ledgerIntakeSizeExp` 0.75 for the intake rate; `ledgerLactGut` for a nursing
   mother's gut). The same form for a growing animal's gut would be an exponent between 0.75 (capacity follows the
   resting need) and 1 (today: capacity follows mass), run at both ends and reported at both, never fitted. At 0.75 a
   16.5 kg female's gut would be 1.17 times today's (derived: (31.3 ÷ 16.5)^0.25). It would be the user's choice to
   test an unmeasured input as a range; an agent picking it because it closes T9's gap would be breaking the first rule.
2. **A measurement.** Gut volume or digesta mass by age in any ape, or in a simple-gutted analogue with a growth
   series (pigs, humans); pusey2005's growth curves (the wild mass at weaning is known only as "a very rough
   estimation"); intake per minute by age (bray2018's figure 5, never read); a juvenile's daily travel.
