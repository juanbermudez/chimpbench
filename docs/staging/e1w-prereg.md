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


## 3. Results of the settling check (iteration 1; code bf357f6, runs from a frozen checkout of 5f4649d)

Run on 7 October 2026 between 12:37 and 12:48, one job at a time; swap used before the five jobs 4.9, 4.9, 4.7, 4.7 and
4.7 GB (limit 6), 1-minute load 3.1 to 4.6. Outputs in `artifacts/validation/e1w/` of this worktree (gitignored). No
code or value was changed after a run: one iteration of three was used.

### 3.1 What the runs say

- **The forks may be read.** With the switch off this branch reproduces the continuations made with the checkpoints'
  own code on all 120 days, every animal-day row and every class trajectory (R1 = P1, R3 = P3), although its `src` tree
  is not the checkpoints'. R0 (one day) had shown the same for day 365 before R1 was launched.
- **Seed 48: the stored date is what starts id 37's decline** (the note's cause (c), now by experiment in one animal).
  The two arms are identical to day 410. From day 411, with the date read, id 37 loses its milk (1 kcal/d against 297) and the
  36 kcal/d of plant food its mother hands it, eats 353 minutes a day against 160 with 57% of them at a full foregut
  against 2%, walks 4.7 km against 2.4, and runs 39 kcal a day short against 11; on day 484 it stands at −0.14 of its
  store against −0.05. All eight registered predictions held.
- **The bill moves to the mother, as registered.** With the date read, id 31 stops paying for milk on day 411: she
  spends 1,280 kcal/d against 1,739, eats 191 minutes against 268, and ends at −0.013 of her store against −0.044.
- **Nothing in the window ends milk.** With the switch on id 37 still drinks 297 kcal/d at 4.2 to 4.4 y, close to what a
  mother can make (307), and every unweaned animal of both seeds drank within the last 7 days of the window (all but
  two within the last half day; those two 1.0 and 6.7 days before). No animal came near 90 dry days. The check cannot test F1 (§2.4), but what it shows points
  the way the registration expected: milk does not taper by itself.
- **Id 22, weaned by the date on day 222, is not helped** (−0.64 and −0.68 on day 484): the switch does not un-wean.
- **Seed 7 is the control it was registered as**: nobody reaches a stored date, and the on arm equals the off arm on
  all 120 days.
- One animal, 74 days: a direction check. Nothing here is a confirmed effect on survival, weaned age or births.

### 3.2 Tables (output of `scripts/e1w/analyse.py`)

#### E1w settling check: forks of the day-365 worlds of M12-W50 (swallowed share 0.5, S39), scored days 365 to 484

#### C0. What was run, and whether a fork may be read

| run | arm | overrides | checkpoint src tree | checkout src tree (head) | wall, s | deaths in the window |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | seed 48, switch off | {} | e88a533e | cbb88c7a (5f4649d) | 155 | none |
| R2 | seed 48, switch on | {"weanOutcome": 1} | e88a533e | cbb88c7a (5f4649d) | 130 | none |
| R3 | seed 7, switch off | {} | e88a533e | cbb88c7a (5f4649d) | 136 | none |
| R4 | seed 7, switch on | {"weanOutcome": 1} | e88a533e | cbb88c7a (5f4649d) | 133 | none |

- **R1 (seed 48, switch off) against P1** (the same world continued with the checkpoint's own code, src tree e88a533e): every animal-day row and every class reserve trajectory equal on **120 of 120 days**.
- **R3 (seed 7, switch off) against P3** (the same world continued with the checkpoint's own code, src tree e88a533e): every animal-day row and every class reserve trajectory equal on **120 of 120 days**.
- R2 against R1: identical on the first 46 days of the window (scored days 365 to 410); first difference on scored day 411.
- R4 against R3: identical on the first 120 days of the window (scored days 365 to 484); the two arms never differ.

#### C1. Seed 48: id 37 reaches its stored weaning age on scored day 411

Per animal-day, from the per-animal readout: absorbed = energy in − passed out; spent = every expenditure term (for a mother, the milk she pays for included); "at a full foregut" = share of eating ticks with the foregut at least 0.95 full. Stored weaning ages: id 22 4.19 y (weaned at the window's start, age 4.58 y), id 37 4.21 y (unweaned at the window's start, age 4.08 y).

| animal | run | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk drunk | plant food handed | eating min | at a full foregut | walking + climbing | km on the ground | growth paid | milk paid for |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 37 (M) | R1 off | 365–410 | 4.21 y, 16.7 | on milk | -0.01 | 841 | 833 | +8 | 313 | 41 | 150 | 3% | 53 | 2.2 | 46 | 0 |
| id 37 (M) | R2 on | 365–410 | 4.21 y, 16.7 | on milk | -0.01 | 841 | 833 | +8 | 313 | 41 | 150 | 3% | 53 | 2.2 | 46 | 0 |
| id 37 (M) | R1 off | 411–484 | 4.41 y, 17.4 | weaned | -0.14 | 876 | 915 | -39 | 1 | 0 | 353 | 57% | 100 | 4.7 | 44 | 0 |
| id 37 (M) | R2 on | 411–484 | 4.41 y, 17.4 | on milk | -0.05 | 855 | 866 | -11 | 297 | 36 | 160 | 2% | 65 | 2.4 | 46 | 0 |
| id 31 (id 37's mother) | R1 off | 365–410 | 23.21 y, 31.3 | adult | -0.01 | 1750 | 1742 | +8 | 0 | -41 | 311 | 8% | 105 | 2.3 | 0 | 391 |
| id 31 (id 37's mother) | R2 on | 365–410 | 23.21 y, 31.3 | adult | -0.01 | 1750 | 1742 | +8 | 0 | -41 | 311 | 8% | 105 | 2.3 | 0 | 391 |
| id 31 (id 37's mother) | R1 off | 411–484 | 23.41 y, 31.3 | adult | -0.01 | 1279 | 1280 | -2 | 0 | 0 | 191 | 4% | 96 | 2.0 | 0 | 2 |
| id 31 (id 37's mother) | R2 on | 411–484 | 23.41 y, 31.3 | adult | -0.04 | 1722 | 1739 | -17 | 0 | -36 | 268 | 3% | 124 | 2.6 | 0 | 372 |
| id 22 (F) | R1 off | 365–484 | 4.91 y, 16.6 | weaned | -0.64 | 824 | 854 | -30 | 0 | 0 | 627 | 90% | 72 | 3.8 | 17 | 0 |
| id 22 (F) | R2 on | 365–484 | 4.91 y, 16.6 | weaned | -0.68 | 808 | 846 | -38 | 0 | 0 | 643 | 91% | 66 | 3.5 | 16 | 0 |
| id 14 (id 22's mother) | R1 off | 365–484 | 25.41 y, 31.3 | adult | -0.05 | 1679 | 1690 | -11 | 0 | 0 | 309 | 3% | 125 | 3.0 | 0 | 313 |
| id 14 (id 22's mother) | R2 on | 365–484 | 25.41 y, 31.3 | adult | -0.04 | 1697 | 1705 | -9 | 0 | 0 | 324 | 3% | 135 | 3.1 | 0 | 314 |
| id 35 (F, founder juvenile) | R1 off | 365–484 | 6.91 y, 24.2 | weaned | -0.07 | 1150 | 1151 | -1 | 0 | 0 | 215 | 26% | 138 | 3.3 | 40 | 0 |
| id 35 (F, founder juvenile) | R2 on | 365–484 | 6.91 y, 24.2 | weaned | -0.06 | 1149 | 1149 | +0 | 0 | 0 | 224 | 28% | 134 | 3.1 | 40 | 0 |
| id 19 (F, founder juvenile) | R1 off | 365–484 | 8.41 y, 29.3 | weaned | -0.05 | 1305 | 1311 | -5 | 0 | 0 | 203 | 7% | 146 | 2.7 | 41 | 0 |
| id 19 (F, founder juvenile) | R2 on | 365–484 | 8.41 y, 29.3 | weaned | -0.04 | 1314 | 1315 | -1 | 0 | 0 | 205 | 7% | 148 | 2.6 | 41 | 0 |

Animals unweaned at the window's start (13): weaned at its end, off arm: id 37; on arm: none. On arm, days since the last milk at the window's end (animals alive and unweaned): id 18: 0.0, id 20: 0.0, id 21: 0.0, id 34: 0.0, id 37: 0.0, id 48: 0.0, id 49: 0.0, id 50: 0.4, id 51: 0.0, id 52: 0.0, id 53: 0.4, id 54: 0.0, id 55: 0.0.

Class mean reserve ÷ store on the window's last day (off / on): adult male -0.005 / -0.005; female, other -0.011 / -0.017; female, lactating -0.044 / -0.041; juvenile 5–12 y -0.049 / -0.039; infant 2–5 y -0.139 / -0.130; infant 0.5–2 y -0.047 / -0.042; infant < 0.5 y +0.000 / +0.000.

**Against the registered predictions (§2.5), seed 48.**

| prediction | registered | off arm | on arm | held? |
| --- | --- | --- | --- | --- |
| id 37 not weaned on day 411 with the switch on | not weaned | weaned | on milk | yes |
| id 37, milk drunk, days 411–484 | 150–310 kcal/d | 1 | 297 | yes |
| id 37, eating minutes | below 250 | 353 | 160 | yes |
| id 37, eating ticks at a full foregut | under 20% | 57% | 2% | yes |
| id 37, net per day, on − off | +15 kcal or more | -39 | -11 | yes (+28) |
| id 37, reserve ÷ store on day 484 | −0.03 to −0.12 | -0.14 | -0.05 | yes |
| id 37's mother, reserve ÷ store on day 484, on − off | −0.01 to −0.06 | -0.013 | -0.044 | yes (-0.032) |
| id 22, reserve ÷ store on day 484, both arms | −0.5 to −0.7 | -0.64 | -0.68 | yes |

#### C2. Seed 7: nobody reaches a stored weaning age in the window (the control)

Per animal-day, from the per-animal readout: absorbed = energy in − passed out; spent = every expenditure term (for a mother, the milk she pays for included); "at a full foregut" = share of eating ticks with the foregut at least 0.95 full. Stored weaning ages: id 22 5.04 y (unweaned at the window's start, age 4.58 y), id 37 4.44 y (unweaned at the window's start, age 4.08 y).

| animal | run | days | age, kg at the block's end | state | reserve ÷ store at the block's end | absorbed | spent | net | milk drunk | plant food handed | eating min | at a full foregut | walking + climbing | km on the ground | growth paid | milk paid for |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id 37 (M) | R3 off | 365–484 | 4.41 y, 17.4 | on milk | -0.11 | 862 | 870 | -7 | 254 | 108 | 180 | 20% | 77 | 3.7 | 44 | 0 |
| id 37 (M) | R4 on | 365–484 | 4.41 y, 17.4 | on milk | -0.11 | 862 | 870 | -7 | 254 | 108 | 180 | 20% | 77 | 3.7 | 44 | 0 |
| id 31 (id 37's mother) | R3 off | 365–484 | 23.41 y, 31.3 | adult | -0.11 | 1716 | 1728 | -12 | 0 | -108 | 345 | 21% | 150 | 3.9 | 0 | 317 |
| id 31 (id 37's mother) | R4 on | 365–484 | 23.41 y, 31.3 | adult | -0.11 | 1716 | 1728 | -12 | 0 | -108 | 345 | 21% | 150 | 3.9 | 0 | 317 |
| id 22 (F) | R3 off | 365–484 | 4.91 y, 17.7 | on milk | -0.11 | 906 | 913 | -7 | 226 | 104 | 190 | 35% | 110 | 5.1 | 38 | 0 |
| id 22 (F) | R4 on | 365–484 | 4.91 y, 17.7 | on milk | -0.11 | 906 | 913 | -7 | 226 | 104 | 190 | 35% | 110 | 5.1 | 38 | 0 |
| id 14 (id 22's mother) | R3 off | 365–484 | 25.41 y, 31.3 | adult | -0.11 | 1736 | 1750 | -13 | 0 | -104 | 347 | 28% | 216 | 5.5 | 0 | 283 |
| id 14 (id 22's mother) | R4 on | 365–484 | 25.41 y, 31.3 | adult | -0.11 | 1736 | 1750 | -13 | 0 | -104 | 347 | 28% | 216 | 5.5 | 0 | 283 |
| id 35 (F, founder juvenile) | R3 off | 365–484 | 6.91 y, 24.4 | weaned | -0.13 | 1148 | 1161 | -13 | 0 | 0 | 302 | 57% | 134 | 4.0 | 39 | 0 |
| id 35 (F, founder juvenile) | R4 on | 365–484 | 6.91 y, 24.4 | weaned | -0.13 | 1148 | 1161 | -13 | 0 | 0 | 302 | 57% | 134 | 4.0 | 39 | 0 |
| id 19 (F, founder juvenile) | R3 off | 365–484 | 8.41 y, 29.3 | weaned | -0.15 | 1355 | 1362 | -8 | 0 | 0 | 285 | 46% | 185 | 4.2 | 37 | 0 |
| id 19 (F, founder juvenile) | R4 on | 365–484 | 8.41 y, 29.3 | weaned | -0.15 | 1355 | 1362 | -8 | 0 | 0 | 285 | 46% | 185 | 4.2 | 37 | 0 |

Animals unweaned at the window's start (12): weaned at its end, off arm: none; on arm: none. On arm, days since the last milk at the window's end (animals alive and unweaned): id 18: 0.0, id 20: 1.0, id 21: 6.7, id 22: 0.0, id 34: 0.0, id 37: 0.0, id 48: 0.0, id 49: 0.0, id 51: 0.0, id 52: 0.0, id 53: 0.0, id 54: 0.0.

Class mean reserve ÷ store on the window's last day (off / on): adult male -0.040 / -0.040; female, other -0.053 / -0.053; female, lactating -0.100 / -0.100; juvenile 5–12 y -0.157 / -0.157; infant 2–5 y -0.089 / -0.089; infant 0.5–2 y -0.093 / -0.093; infant < 0.5 y -0.072 / -0.072.

## 4. Verdict of the stage

- **Audit.** Shown wrong by the field sources: weaning by a date, milk stopping in a day at a quarter to over a third of
  intake, and every provision ending in one step. Missing: any rule for what ends milk. Unmeasured at this body size:
  the whole gut rule, the walking cost, the intake rate. The joint outcome of those three (a juvenile of 4 to 6 y that
  cannot live without milk) contradicts the field.
- **Built.** `weanOutcome` (off by default), with one design assumption (`weanDryDays`, 90 days, range 30–180, never
  fitted) and one lazy state key. Goldens and the field pin unmoved; saves resume exactly; the prescription ledger
  counts the timer (S39: 42 → 43 with the switch on).
- **What it is and is not.** It removes the date as the cause of the end of milk and makes T-INF-3 an output. It is
  **not a repair of the small body's budget**: with it on, a 16 kg animal is carried by 297 kcal a day of milk that its
  mother pays 372 kcal a day for. Whether weaning then happens by the pair's state, or milk simply runs to the 6-year
  limit, is the three-year question (W1 against F1); the registrant expects F1 (about 70% after this check, 65% before).
- **Not to be concluded from this stage:** that the starvation deaths are fixed. A lower death count with milk running
  to 6 y is registered as a failure (§2.4).

## 5. Known limits and deferred defects (file:line at this branch's head)

- `src/sim/candidates.ts`:167 (`dependentOn`): no caretaker from 6 y, a literal age. With the switch it is the last stop
  of milk; Gombe's latest weaned age is 8.01 y. Not changed (it also bounds the orphan rules).
- `src/sim/candidates.ts`:398 (the nurse score): the hunger-free part (0.25 × the bout's worth) and the age factor
  (1 − age ÷ 7) are literal weights; the first is why an infant asks whatever its state (e1o-prereg §1.4).
- `src/sim/energy.ts`:234–241 (`ledgerLactGut`): a mother's gut is enlarged by her full milk yield while her lactation
  flag is on, whatever she is asked for. With the switch the flag stays on longer, and so does the larger gut.
- Two offspring at one gland: no rule ranks them (the mother compares each with herself, `execution.ts`:914–917). The
  switch makes that state last longer. Read F2 before anything else in the long run.
- `src/sim/energy.ts`:363 (`feedRate`): an unweaned animal's drive counts milk at the full suckling rate all day
  (E1n §5, addressed only by `milkInDrive`, which S39 does not use). The switch keeps animals in that state longer.
- The switch never un-weans, so it does nothing for an animal the date has already weaned in a saved world.
- `scripts/lib/prescriptions.ts`:160: the old date (`weanAgeMinY`, `weanAgeSpanY`) is classed *input*; not changed.

## 6. For the integrator: the three-year confirmation (not run here)

Parameter files (S39 at a swallowed share of 0.5, as Y3-W50 and Y3-W50-s1, plus `weanOutcome` 1):
`docs/staging/integrator-kit/params/Y3-W50-wean.json` and `Y3-W50-wean-s1.json` (`rngSalt` 1).

From a frozen detached checkout of the merged head, with the worktree links of AGENTS.md:

```sh
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts plan --label Y3-W50-wean --seeds 48,7,21,5,11 --days 1095 --burn-in 30 --animal-days \
  --params-file docs/staging/integrator-kit/params/Y3-W50-wean.json --out artifacts/validation/e/runs/Y3-W50-wean
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts run artifacts/validation/e/runs/Y3-W50-wean/run.json --budget-min 100 --parallel 1   # in the background; launch again until done
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts status artifacts/validation/e/runs/Y3-W50-wean/run.json
```

(The same with `Y3-W50-wean-s1` for the second draw.) `--animal-days` is new in `scripts/e-run.ts` at this stage: it
passes e-bench's per-animal readout to every seed job, which the saved three-year runs lacked. The comparison is the
saved Y3-W50 and Y3-W50-s1 (bench-y3, ff25953), not re-run. Judge by §2.3 and §2.4 in this order: F2 (newborns), F1
(who still drinks at 6 y: per-animal rows, `eMilk` by age), W2 (milk at 4–5 y against 3–4 y: the energy readout's bins),
W1 and T-INF-3 (the truth row now reads the age at the last milk), W3 (the weaned animals' rows against ids 35 and 17),
W5 and F3 (nursing mothers' trend, births), W4 (mass at 5 y). The starvation count is read last and decides nothing alone.
Three years hold few animals that pass 6 y: id 22 from scored day 884, id 37 only from day 1,067 of 1,095. F1 will
rest on about one animal per seed-run, 10 in the two draws; milk per day at 5 to 6 y (ids 22, 37 and 21, from days 519,
701 and 884) is the wider readout to print beside it, as a description and not as a registered criterion. If the
user wants F1 settled properly, the run needs a fourth year.

## 7. Integrator: the three-year confirmation, logged before it runs (7 October 2026, 18:19)
As §6 leaves it: label Y3-W50-wean, `docs/staging/integrator-kit/params/Y3-W50-wean.json` (S39, swallowed share 0.5,
`weanOutcome` 1), seeds 48, 7, 21, 5, 11, 30 + 1,095 days, `--animal-days`, from a frozen detached checkout of the
commit that holds this entry (`bench-wean`), two simulation jobs at a time. One run (rngSalt 0); the re-draw
(`Y3-W50-wean-s1.json`) only if this one leaves the question open. Compared with Y3-W50 (same parameters without the
switch; `e-years-prereg.md` §7: 7 starvation deaths, all juveniles the run weaned). Readouts as §2.3 and §2.4 fix
them: when and how milk ends for each animal that reaches a weaning age (by 90 dry days, or by the 6-year limit, which
is the registered failure), the weaned animals' reserves and growth, their mothers' reserves and next births, starvation
by class. The death count alone decides nothing.


## 8. The three-year confirmation, read by the registered readouts (7 October 2026)

Run by the integrator as §7 logged it: `Y3-W50-wean` (bench-wean, frozen at a7ed356, clean; seeds 48, 7, 21, 5, 11; 30 +
1,095 days; `--animal-days`), against the saved `Y3-W50` (the same parameters without the switch; no per-animal rows).
Both read only; no simulation was run for this section. Every number below is printed by `scripts/e1w/y3.py` (§8.6);
the prose quotes the tables Y0 to Y5. Nothing was changed in response to the result.

### 8.1 The answer

**The mechanism failed, on two of the four failures registered in §2.4, and it moved the starving from the weaned
juvenile to its newborn sibling.**
- **F1, one clock for another: met.** 10 animals passed 6 y in the run and all 10 were still drinking when the age
  limit of dependence stopped them (184 kcal/d in their last 30 days). The dry rule weaned nobody at any age. Of the 29
  animals that reached a weaning age, 18 were still drinking at the end of the run and one died unweaned of another
  cause. The weaned age is 6.00 y in every seed: the limit in `candidates.ts`, not the pair's state.
- **F2, the next infant pays: met.** 14 starvation deaths against 7, and none of the 14 is a juvenile: 6 infants under
  half a year and 8 of 0.5 to 2 y, against none without the switch. **All 14 were born while an older sibling was still
  nursing.** Of the 24 newborns born into that state 14 starved, 3 died of another cause, and 3 of the 7 alive at the end
  stand below half their store. Of the 52 born to a mother with no other nursing offspring, none starved.
- The 7 juvenile starvation deaths of the run without the switch are gone because those animals were kept on milk to
  6 y. By §2.4 that is not a pass.

### 8.2 The questions, one by one

**When and how milk ended (Y1).** By the limit, always. Milk falls a little with age (255, 232 and 217 kcal/d at 3–4,
4–5 and 5–6 y) and does not taper to an end: 200 kcal/d in the last 180 days before the limit (W2 missed).

**Who the 14 are (Y2).** Newborns of the four mothers whose older offspring the switch kept on milk: id 31 (mother of
id 37) 5, id 11 (of id 21) 4, id 14 (of id 22) 3, id 43 (of id 48) 2. The older sibling was 4.0 to 5.4 y at the birth.
They died at 0.34 to 0.70 y, 124 to 258 days after birth.

**How the milk was split.** A newborn alone drinks 208 kcal/d over its first 180 days and its mother's gland makes
just that. A newborn that shares drinks 166, its sibling 136, and the gland makes 303, which is 99% of the 307 kcal/d
it can make. The newborn spends less than a lone one (176 against 189 kcal/d in its first 90 days) by giving up
growth (25 against 32 kcal/d paid), runs 16 kcal a day short, and is at −0.49 of its small store by 90 days.

**The mothers' reserves.** Not what limits the milk. Over those days the mothers of the 14 stood at −0.059 of their
store on average (lowest single day −0.269). A mother with two unweaned offspring pays for 373 kcal/d of milk, eats 362
minutes a day against 306 with one infant, and is in balance (1,793 absorbed, 1,783 spent); her mean reserve is −0.110
against −0.047, with 10.0% of her days below −0.3 against 1.0%. Nursing one offspring of 4 y or more costs her about
what a younger one does (313 against 327 kcal/d of milk paid, reserve −0.055 against −0.047).

**So: the sharing rule, not the mother's energy.** The gland runs at its ceiling and the mother can afford it. What
starves the newborn is that the ceiling is one number for one or two offspring (`ledgerMilkYieldCoef`, the human yield
scaled by mass, "assumed") and that nothing decides who drinks first: the mother compares each offspring with herself
(`weanDeficit`), never one with the other, so the older, larger animal takes nearly half. The data hold no refusals
(the per-animal rows do not record them), so who was turned away when is not shown.

**Would serving the newborn first settle it? No.** A newborn alone drinks 188, 224 and 269 kcal/d at 0–90, 91–180 and
181–365 days. That leaves 119, 83 and 38 of the 307 for the older sibling, which had been drinking 193. The birth
would then wean the older animal at 4.0 to 5.5 y in all but name, and return it to the budget that starved it without
the switch (§1.6). Either the older one starves or the younger one does: the small body's energy budget is the defect
under both, as the audit said, and this run adds a second way of seeing it.

**The weaned animals afterwards (Y3).** Only id 22 can be read (211 to 213 days after the limit, at 20 to 21 kg). Four
of the five ended lower than they stood at the last milk (mean change −0.11), one fell below −0.5 (to −0.68), and they
ate 418 minutes a day with 70% of them at a full foregut against 319 minutes and 55% for the founder juveniles at the
same age. W3 held in one seed of five. The decline that began at 16 kg without the switch begins at 21 kg with it, more
slowly; 212 days cannot say where it ends. Growth: 18.6 kg at 5 y (17.7 to 19.6), outside T-INF-4's 7 to 13 kg, as
registered.

**The mothers' next births (Y4).** The next birth came 4.62 y after the older offspring's (4.00 to 5.54, 22 mothers
over the five seeds), on the model's own clock (`amenorrheaMinY`), whether or not she was still nursing: the older
animal was drinking 113 to 268 kcal/d in the month before. Three mothers whose newborn died gave birth again in the
run, 343 to 451 days later, which is part of why births rose (76 against 71). Nursing females as a class are unchanged
(mean reserve −0.050 against −0.048; trend −0.0019 against −0.0021% of the store a day): W5 held.

### 8.3 Verdict by what was registered

| | registered | result |
| --- | --- | --- |
| W1 | weaning by the pair's state | missed: 0 weaned by the dry rule, 10 of 10 at the limit |
| W2 | milk tapers before it ends | missed: 232 against 255 kcal/d at 4–5 and 3–4 y, then 200 to the end |
| W3 | the weaned animal copes | missed in 4 of 5 (212 days of the registered 365) |
| W4 | growth, reported | 18.6 kg at 5 y, outside the band, as registered |
| W5 | mothers and births | held |
| F1 | one clock for another | **met** |
| F2 | the next infant pays | **met** |
| F3 | mothers cross the line or births fall | not met |
| F4 | weaned animals sink as today's | met in direction, not yet in size |

**It failed. `weanOutcome` stays off** (§2.4: "Any one of these, and the switch stays off"). The registrant expected F1
(65 to 70%); F2 was registered as a risk and listed first to read, and it is the larger failure: the switch as built
kills more animals than the clock it replaces, and younger ones. What the stage keeps: the audit (§1), the experiment
that the stored date starts the decline (§3), and this run's two findings, that nothing in the pair's state ends milk
and that a second dependent at one gland starves.

### 8.4 What is missing, and the field evidence a design would need

No input is proposed for change, `weanDryDays` least of all: it never fired, so its value changed nothing. Two
mechanisms are missing, and both are about the same event, the mother's next reproduction.

1. **What makes a mother refuse an older offspring.** In the model her only cost of nursing is her own reserve
   deficit, and her cycles restart on a clock whether or not she nurses. So keeping the older one on milk costs her
   nothing she can read, and she never has a reason to stop. The theory the decision was built on puts the cost in her
   next offspring (trivers1974, research.md E.38). The field direction agrees: maternal rejections "grew stronger when
   mothers resumed oestrus, at infant ages of about 3–4 y" (clark1977 through maestripieri2002, six Gombe pairs);
   "Cycling resumed only after a sustained period of energy gain" (emeryThompson2012); juvenile lean mass rose "with
   the interval to the next sibling's birth" and "offspring growth suffers when mothers wean early" (emeryThompson2016).
   Derived from two Gombe figures already in research.md: the mean weaned age (4.71 y, lonsdorf2020) is 0.44 y short of
   the mean interval between births (5.15 y, Wallis), less than a gestation (225 days in the field; Y4 prints the
   arithmetic), so on average suckling ends
   during the next pregnancy, not at a date and not at the birth.
   *A design would need, and research.md does not hold:* how suckling by the older offspring changes from the mother's
   first cycle through her pregnancy (rates, by her state); "No rates of nipple refusal by infant age were found"
   (E.14.4); whether and how much milk a pregnant chimpanzee makes ("Any chimpanzee or other great-ape milk volume or
   milk energy output, at any stage": not found, E.14.7); and a coupling of her return to cycling to her energy state
   or her nursing in place of the amenorrhoea clock.
2. **How a mother with two dependents allocates milk.** The model has no rule, and the field says the case is rare and
   brief: "Four older siblings briefly resumed suckling after a younger sibling was born, more than 8 months after
   their own last suckling" (lonsdorf2020, of 65 offspring). In this run 24 of 76 births met a nursing sibling and it
   kept drinking 136 kcal/d for months.
   *A design would need:* how often an older offspring suckles after the birth, for how long and whether it is fed
   (nipple contact without milk is common: badescu2017, matsumoto2017); the mother's response to it; and the same milk
   output data as above. With mechanism 1 in place this case should become as rare as the field's, and a rule for it
   would matter little.

Neither mechanism repairs what §1.6 found. A juvenile weaned at any age from 4 to 6 y has to live on its own gut, and
in this ledger it cannot: at 16 kg it starves in one to two years, at 21 kg it is sinking after seven months. That
needs the measurement or the user's range of §2.9.

### 8.5 Limits

- One draw (`rngSalt` 0). F1 and F2 do not need a second: 10 of 10 and 14 of 14, in every seed.
- F1 rests on 10 animals, five of them (id 37) reaching the limit 29 days before the end. A fourth year would show
  where id 22 ends, not whether milk ends by itself.
- The run without the switch has no per-animal rows: its side of every comparison is a class readout.
- A death is read as starvation from the animal's last living row (less than a fifth of the store left, mother alive);
  the count equals the run's own in every seed (Y0).
- The founder juveniles of W3 are compared at the same age on earlier days of the same seed; none is 6 to 8 y on the
  days id 22 is followed.

### 8.6 Tables (output of `scripts/e1w/y3.py`)

```sh
W=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
/usr/bin/python3 scripts/e1w/y3.py --run $W/bench-wean/artifacts/validation/e/runs/Y3-W50-wean --base $W/bench-y3/artifacts/validation/e/runs/Y3-W50
```

#### E1w, three-year confirmation: Y3-W50-wean (weanOutcome 1) against Y3-W50 (the same parameters without it)

Printed by `scripts/e1w/y3.py` from the run's per-animal rows (one row per living animal and scored day; seeds 48, 7, 21, 5, 11; commit a7ed356, dirty 0) and from both runs' merged class readouts. Y3-W50 has no per-animal rows. Scored day 0 is the day after the 30-day burn-in; ages in years; kcal per animal-day.

#### Y0. The headline, checked

| | Y3-W50-wean (switch on) | Y3-W50 (switch off) |
| --- | --- | --- |
| starvation deaths | 14 (infant 0.5–2 y 8, infant < 0.5 y 6) | 7 (juvenile 5–12 y 7) |
| starvation deaths by seed (48, 7, 21, 5, 11) | 2 / 3 / 2 / 3 / 4 | 3 / 1 / 2 / 0 / 1 |
| births | 76 (15 / 14 / 16 / 15 / 16) | 71 (12 / 13 / 17 / 15 / 14) |
| deaths, all causes | 42 (6 / 6 / 12 / 9 / 9) | 34 (6 / 9 / 9 / 5 / 5) |
| living, start → end, by seed | 49→58 / 49→57 / 49→53 / 49→55 / 49→56 | 49→55 / 49→53 / 49→57 / 49→59 / 49→58 |
| lowest daily mean reserve ÷ store, infant < 0.5 y | -0.452 | -0.181 |
| lowest daily mean reserve ÷ store, infant 0.5–2 y | -0.165 | -0.165 |
| lowest daily mean reserve ÷ store, infant 2–5 y | -0.109 | -0.157 |
| lowest daily mean reserve ÷ store, juvenile 5–12 y | -0.146 | -0.239 |
| lowest daily mean reserve ÷ store, female, lactating | -0.111 | -0.102 |

Check of the per-animal reading: animals whose last living row holds less than a fifth of their store and whose mother is alive, by seed: 2 / 3 / 2 / 3 / 4; the run's own count of starvation deaths by seed: 2 / 3 / 2 / 3 / 4: **equal**. (Two more unweaned animals reached the end of their store after their mother had died, seed 7 id 62, seed 21 id 63; the run books them as orphans.)

#### Y1. Every animal that reached a weaning age: when and how its milk ended

The animals unweaned on scored day 0 that lived to 4.1 y (the earliest stored weaning age) in the run. Milk = `eMilk`, kcal drunk per day lived in the age band. Last milk = the last day with milk drunk. "The 6-year limit" = it drank until the day it turned 6, when it stops being its mother's dependent (`candidates.ts` `dependentOn`); "dry rule" = weaned after 90 days without milk before that.

| seed | animal | mother | age on day 0 | milk at 3–4 y | at 4–5 y | at 5–6 y | in its last 180 days of milk | last milk: day (age) | how it ended | mass at 5 y, kg | reserve ÷ store at the end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | id 22 (F) | id 14 | 3.58 | 188 | 146 | 262 | 237 | 882 (6.00 y) | the 6-year limit | 17.7 | -0.54 |
| 48 | id 37 (M) | id 31 | 3.08 | 263 | 213 | 195 | 119 | 1065 (6.00 y) | the 6-year limit | 19.6 | -0.04 |
| 48 | id 21 (M) | id 11 | 2.58 | 283 | 259 | 111 | 109 | 1094 (5.58 y) | still drinking at the end, 5.58 y (123 kcal/d in its last 30 days) | 19.3 | -0.11 |
| 48 | id 48 (F) | id 43 | 2.08 | 289 | 262 | 307 | 265 | 1094 (5.08 y) | still drinking at the end, 5.08 y (307 kcal/d in its last 30 days) | 17.9 | -0.02 |
| 48 | id 20 (M) | id 13 | 1.88 | 282 | 248 | — | 246 | 1094 (4.88 y) | still drinking at the end, 4.88 y (284 kcal/d in its last 30 days) | — | -0.03 |
| 48 | id 34 (F) | id 29 | 1.28 | 237 | 300 | — | 246 | 1094 (4.28 y) | still drinking at the end, 4.28 y (299 kcal/d in its last 30 days) | — | -0.04 |
| 7 | id 22 (F) | id 14 | 3.58 | 266 | 252 | 188 | 129 | 881 (6.00 y) | the 6-year limit | 17.9 | -0.46 |
| 7 | id 37 (M) | id 31 | 3.08 | 270 | 234 | 224 | 273 | 1065 (6.00 y) | the 6-year limit | 19.5 | -0.05 |
| 7 | id 21 (M) | id 11 | 2.58 | 203 | 176 | 231 | 229 | 1094 (5.58 y) | still drinking at the end, 5.58 y (160 kcal/d in its last 30 days) | 19.3 | -0.05 |
| 7 | id 48 (F) | id 43 | 2.08 | 277 | 202 | 317 | 208 | 1094 (5.08 y) | still drinking at the end, 5.08 y (317 kcal/d in its last 30 days) | 17.8 | -0.01 |
| 7 | id 20 (M) | id 13 | 1.88 | 245 | 265 | — | 274 | 1094 (4.88 y) | still drinking at the end, 4.88 y (277 kcal/d in its last 30 days) | — | -0.01 |
| 7 | id 34 (F) | id 29 | 1.28 | 261 | 266 | — | 261 | 1094 (4.28 y) | still drinking at the end, 4.28 y (317 kcal/d in its last 30 days) | — | -0.02 |
| 21 | id 22 (F) | id 14 | 3.58 | 193 | 210 | 54 | 45 | 882 (6.00 y) | the 6-year limit | 17.9 | -0.18 |
| 21 | id 37 (M) | id 31 | 3.08 | 268 | 244 | 215 | 280 | 1065 (6.00 y) | the 6-year limit | 19.5 | -0.06 |
| 21 | id 21 (M) | id 11 | 2.58 | 243 | 158 | 276 | 272 | 1094 (5.58 y) | still drinking at the end, 5.58 y (242 kcal/d in its last 30 days) | 19.0 | -0.03 |
| 21 | id 48 (F) | id 43 | 2.08 | 272 | 253 | 147 | 200 | 1094 (5.08 y) | still drinking at the end, 5.08 y (147 kcal/d in its last 30 days) | 17.9 | -0.03 |
| 21 | id 20 (M) | id 13 | 1.88 | 219 | 187 | — | 190 | 938 (4.45 y) | died unweaned on day 939 at 4.45 y (not of starvation: reserve -0.13) | — | -0.13 |
| 21 | id 34 (F) | id 29 | 1.28 | 275 | 308 | — | 282 | 1094 (4.28 y) | still drinking at the end, 4.28 y (309 kcal/d in its last 30 days) | — | -0.01 |
| 5 | id 22 (F) | id 14 | 3.58 | 257 | 243 | 213 | 277 | 883 (6.00 y) | the 6-year limit | 17.9 | -0.28 |
| 5 | id 37 (M) | id 31 | 3.08 | 284 | 183 | 259 | 282 | 1065 (6.00 y) | the 6-year limit | 19.5 | -0.06 |
| 5 | id 21 (M) | id 11 | 2.58 | 230 | 221 | 272 | 269 | 1094 (5.58 y) | still drinking at the end, 5.58 y (248 kcal/d in its last 30 days) | 19.4 | -0.03 |
| 5 | id 48 (F) | id 43 | 2.08 | 273 | 181 | 126 | 127 | 1094 (5.08 y) | still drinking at the end, 5.08 y (126 kcal/d in its last 30 days) | 17.8 | -0.03 |
| 5 | id 20 (M) | id 13 | 1.88 | 263 | 202 | — | 169 | 1094 (4.88 y) | still drinking at the end, 4.88 y (100 kcal/d in its last 30 days) | — | -0.22 |
| 11 | id 22 (F) | id 14 | 3.58 | 199 | 292 | 192 | 173 | 883 (6.00 y) | the 6-year limit | 18.0 | -0.03 |
| 11 | id 37 (M) | id 31 | 3.08 | 222 | 225 | 216 | 180 | 1065 (6.00 y) | the 6-year limit | 19.6 | -0.05 |
| 11 | id 21 (M) | id 11 | 2.58 | 294 | 248 | 241 | 257 | 1094 (5.58 y) | still drinking at the end, 5.58 y (307 kcal/d in its last 30 days) | 19.4 | -0.03 |
| 11 | id 48 (F) | id 43 | 2.08 | 281 | 189 | 289 | 188 | 1094 (5.08 y) | still drinking at the end, 5.08 y (289 kcal/d in its last 30 days) | 17.9 | -0.02 |
| 11 | id 20 (M) | id 13 | 1.88 | 299 | 266 | — | 259 | 1094 (4.88 y) | still drinking at the end, 4.88 y (307 kcal/d in its last 30 days) | — | -0.02 |
| 11 | id 34 (F) | id 29 | 1.28 | 259 | 303 | — | 298 | 1094 (4.28 y) | still drinking at the end, 4.28 y (311 kcal/d in its last 30 days) | — | -0.03 |

- Animals in the table: 29. How their milk ended: still drinking at the end 18; the 6-year limit 10; died unweaned 1.
- **Passed 6 y in the run: 10. Still drinking when the limit stopped them: 10** (milk in their last 30 days before 6 y: 184 kcal/d, lowest 65). Weaned by the dry rule, at any age: **0**.
- Milk by age over the table's animals (mean of the animals' own means): 3–4 y 255, 4–5 y 232, 5–6 y 217 kcal/d; in the last 180 days before the last milk of those stopped at the limit: 200 (lowest 45).
- The run's truth row T-INF-3 (age at the last milk of animals weaned in the window), by seed: 6.00 y (n 1) / 6.00 y (n 1) / 6.00 y (n 1) / 6.00 y (n 1) / 6.00 y (n 1). Band 3.7–5.8 y.
- Class readout, milk per unweaned animal-day with a living mother, Y3-W50-wean against Y3-W50: 3–4 y 259 against 257; 4–5 y 226 against 241 (9166 and 5324 animal-days); 5 y and over 208 against 244 (4858 and 58 animal-days).

#### Y2. The animals born in the run, by whether an older sibling was still nursing

"An older sibling still nursing" = at the birth the mother had another unweaned offspring that drank milk in the following 30 days. Means over animals of each animal's own mean; "the mother's gland made" = the milk she paid for × the efficiency of synthesis (0.80). The most a 31.3 kg mother makes: **307 kcal/d** (`ledgerMilkYieldCoef` × mass^0.75, the human yield scaled by mass, "assumed").

| newborns | born | starved | died of another cause | alive on day 1094 | of those, below −0.5 of their store |
| --- | --- | --- | --- | --- | --- |
| no older sibling nursing | 52 | **0** | 12 | 40 | 0 |
| an older sibling still nursing | 24 | **14** | 3 | 7 | 3 |

| newborns | days of age | animals | milk the newborn drank | milk the older sibling drank | the mother's gland made | newborn: spent | net | growth paid | reserve ÷ store at the span's end | mother's reserve ÷ store: mean (lowest) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| no older sibling nursing | 0–90 | 51 | 188 | — | 189 | 189 | -1 | 32 | -0.06 | -0.059 (-0.625) |
| no older sibling nursing | 91–180 | 47 | 224 | — | 224 | 224 | -1 | 33 | -0.04 | -0.027 (-0.280) |
| no older sibling nursing | 181–365 | 40 | 269 | — | 269 | 271 | -2 | 33 | -0.08 | -0.041 (-0.309) |
| an older sibling still nursing | 0–90 | 24 | 161 | 143 | 304 | 176 | -16 | 25 | -0.49 | -0.090 (-0.539) |
| an older sibling still nursing | 91–180 | 21 | 179 | 120 | 300 | 185 | -6 | 15 | -0.64 | -0.093 (-0.541) |
| an older sibling still nursing | 181–365 | 8 | 188 | 108 | 296 | 207 | -19 | 16 | -0.70 | -0.121 (-0.466) |

**The 14 that starved** (first 180 days of life, or the days lived):

| seed | animal | born on day | mother | older sibling (age at the birth) | died on day (age) | milk it drank | milk the sibling drank | the mother's gland made | it spent | mother's reserve ÷ store: mean (lowest) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | id 54 (M) | 222 | id 14 | id 22 (4.19 y) | 480 (0.70 y) | 191 | 117 | 307 | 192 | -0.085 (-0.141) |
| 48 | id 56 (M) | 462 | id 31 | id 37 (4.35 y) | 628 (0.45 y) | 151 | 157 | 308 | 169 | -0.023 (-0.060) |
| 7 | id 56 (F) | 580 | id 11 | id 21 (4.17 y) | 793 (0.58 y) | 165 | 143 | 308 | 178 | -0.054 (-0.108) |
| 7 | id 57 (M) | 650 | id 31 | id 37 (4.86 y) | 835 (0.51 y) | 157 | 150 | 308 | 174 | -0.033 (-0.079) |
| 7 | id 60 (M) | 839 | id 43 | id 48 (4.38 y) | 1011 (0.47 y) | 166 | 140 | 306 | 184 | -0.075 (-0.162) |
| 21 | id 59 (F) | 568 | id 11 | id 21 (4.14 y) | 814 (0.67 y) | 191 | 111 | 302 | 195 | -0.215 (-0.269) |
| 21 | id 61 (M) | 712 | id 31 | id 37 (5.03 y) | 902 (0.52 y) | 159 | 149 | 308 | 175 | -0.036 (-0.065) |
| 5 | id 56 (F) | 511 | id 14 | id 22 (4.98 y) | 687 (0.48 y) | 164 | 140 | 304 | 181 | -0.074 (-0.231) |
| 5 | id 57 (F) | 517 | id 31 | id 37 (4.50 y) | 753 (0.64 y) | 157 | 150 | 308 | 173 | -0.037 (-0.112) |
| 5 | id 61 (F) | 701 | id 11 | id 21 (4.50 y) | 825 (0.34 y) | 150 | 158 | 308 | 170 | -0.016 (-0.059) |
| 11 | id 54 (M) | 336 | id 31 | id 37 (4.00 y) | 512 (0.48 y) | 154 | 154 | 309 | 171 | -0.020 (-0.055) |
| 11 | id 59 (F) | 650 | id 14 | id 22 (5.36 y) | 843 (0.53 y) | 158 | 150 | 308 | 175 | -0.038 (-0.064) |
| 11 | id 60 (M) | 785 | id 11 | id 21 (4.73 y) | 972 (0.51 y) | 161 | 147 | 308 | 178 | -0.073 (-0.185) |
| 11 | id 62 (F) | 868 | id 43 | id 48 (4.46 y) | 1041 (0.47 y) | 162 | 144 | 306 | 180 | -0.042 (-0.111) |

- Of the 14 starved, **14 had an older sibling still nursing when they were born** (the siblings were 4.0 to 5.4 y old). Their mothers: id 31 (5), id 11 (4), id 14 (3), id 43 (2).
- The 14 starved died 124 to 258 days after birth, at 0.34 to 0.70 y.
- A newborn alone on its mother's milk drinks 208 kcal/d in its first 180 days (range 186 to 212, 43 animals) and its mother's gland makes just that, 208; one that shares drinks 166 (range 138 to 191, 24 animals), its sibling 136, and the gland makes 303, 99% of the 307 it can.
- If the newborn were served first: a newborn alone drinks 188, 224 and 269 kcal/d at 0–90, 91–180 and 181–365 days of age, which would leave 119, 83 and 38 of the gland's 307 for the older sibling; the older sibling took 143, 120 and 108, and had been drinking 193 in the 30 days before the birth (range 113 to 268).
- The sharing mothers' own reserves over those days: mean -0.090 of their store (the mothers of the 14 starved, over those days: mean -0.059, lowest single day -0.269). Mothers nursing one newborn: -0.040.

#### Y3. After the limit: the animals whose milk ended, against the founder juveniles of 6 to 8 y

From the day after the last milk to the end of the run (the registered span is 365 days; the run holds fewer). Founder juveniles = animals already weaned on day 0, on the days of the run on which they were 6 to 8 y old, same seed. The registration said "in the same run"; on the same days none exists (the youngest founder juvenile is 8 y by day 884), so their days are earlier ones.

| seed | animal | mass at the last milk, kg | days followed | reserve ÷ store: at the last milk → +30 d → +90 d → at the end (lowest) | net, kcal/d | eating min | at a full foregut | growth, kg/y | founder juveniles at 6–8 y, same seed: reserve mean (n animal-days) | eating min | at a full foregut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | id 22 (F) | 21.0 | 212 | -0.27 → -0.43 → -0.66 → -0.54 (-0.68) | -38 | 544 | 87% | 1.5 | -0.14 (1766) | 305 | 53% |
| 48 | id 37 (M) | 22.8 | 29 | -0.06 → — → — → -0.04 (-0.07) | +15 | 255 | 28% | 3.5 | -0.14 (1766) | 305 | 53% |
| 7 | id 22 (F) | 21.1 | 213 | -0.31 → -0.29 → -0.23 → -0.46 (-0.46) | -23 | 464 | 81% | 2.3 | -0.13 (1766) | 306 | 53% |
| 7 | id 37 (M) | 23.1 | 29 | -0.03 → — → — → -0.05 (-0.06) | -19 | 245 | 20% | 3.5 | -0.13 (1766) | 306 | 53% |
| 21 | id 22 (F) | 20.1 | 212 | -0.26 → -0.31 → -0.36 → -0.18 (-0.38) | +8 | 496 | 84% | 2.4 | -0.22 (1766) | 374 | 67% |
| 21 | id 37 (M) | 23.1 | 29 | -0.04 → — → — → -0.06 (-0.08) | -19 | 278 | 36% | 3.4 | -0.22 (1766) | 374 | 67% |
| 5 | id 22 (F) | 21.1 | 211 | -0.09 → -0.11 → -0.08 → -0.28 (-0.33) | -26 | 351 | 66% | 2.8 | -0.11 (1766) | 302 | 52% |
| 5 | id 37 (M) | 23.1 | 29 | -0.04 → — → — → -0.06 (-0.06) | -12 | 253 | 23% | 3.5 | -0.11 (1766) | 302 | 52% |
| 11 | id 22 (F) | 21.3 | 211 | -0.03 → -0.06 → -0.06 → -0.03 (-0.08) | -1 | 234 | 33% | 3.2 | -0.14 (1766) | 307 | 52% |
| 11 | id 37 (M) | 23.2 | 29 | -0.04 → — → — → -0.05 (-0.05) | -2 | 248 | 15% | 3.5 | -0.14 (1766) | 307 | 52% |

- The 5 animals followed for 180 days or more (id 22 in each seed, 211 to 213 days): 1 fell below −0.5 of their store, 4 ended lower than they stood at the last milk (mean change -0.11); they ate 418 minutes a day, 70% of them at a full foregut, against 319 minutes and 55% for the founder juveniles at 6 to 8 y. The 5 followed for 29 days (id 37) cannot be read yet.
- Mass at 5 y of the table Y1 animals that reached it: 18.6 kg (range 17.7 to 19.6, 20 animals); T-INF-4's band 7–13 kg.

#### Y4. The mothers

Every adult female-day by the unweaned offspring she has alive that day. Milk paid = `oMilk` (what her offspring drank ÷ 0.80).

| a mother with | female-days | reserve ÷ store: mean | lowest | days below −0.3 | milk paid | absorbed | spent | eating min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| no unweaned offspring | 28520 | -0.046 | -0.64 | 470 (1.6%) | 0 | 1331 | 1339 | 261 |
| one, under 4 y | 52964 | -0.047 | -0.64 | 530 (1.0%) | 327 | 1728 | 1725 | 306 |
| one, 4 y or older | 10075 | -0.055 | -0.38 | 98 (1.0%) | 313 | 1748 | 1751 | 315 |
| two unweaned offspring | 4557 | -0.110 | -0.54 | 455 (10.0%) | 373 | 1793 | 1783 | 362 |

The mothers of the animals of table Y1 and their next births (interval = from the older offspring's birth, read from its age on day 0, to the next birth):

| seed | mother | older offspring | births in the run: day (interval, y; the older one's age and its milk in the 30 days before; the newborn's fate) |
| --- | --- | --- | --- |
| 48 | id 14 | id 22 (F) | 222 (4.19 y; 4.19 y, 148 kcal/d; starved); 931 (1.94 y; 6.13 y, 0 kcal/d; alive) |
| 48 | id 31 | id 37 (M) | 462 (4.35 y; 4.35 y, 244 kcal/d; starved); 971 (1.39 y; 5.74 y, 113 kcal/d; alive) |
| 48 | id 11 | id 21 (M) | 880 (4.99 y; 4.99 y, 133 kcal/d; alive) |
| 48 | id 43 | id 48 (F) | none |
| 48 | id 13 | id 20 (M) | none |
| 48 | id 29 | id 34 (F) | none |
| 7 | id 14 | id 22 (F) | 714 (5.54 y; 5.54 y, 158 kcal/d; alive) |
| 7 | id 31 | id 37 (M) | 650 (4.86 y; 4.86 y, 204 kcal/d; starved) |
| 7 | id 11 | id 21 (M) | 580 (4.17 y; 4.17 y, 210 kcal/d; starved) |
| 7 | id 43 | id 48 (F) | 839 (4.38 y; 4.38 y, 188 kcal/d; starved) |
| 7 | id 13 | id 20 (M) | none |
| 7 | id 29 | id 34 (F) | none |
| 21 | id 14 | id 22 (F) | 407 (4.70 y; 4.70 y, 226 kcal/d; died of another cause) |
| 21 | id 31 | id 37 (M) | 712 (5.03 y; 5.03 y, 190 kcal/d; starved) |
| 21 | id 11 | id 21 (M) | 568 (4.14 y; 4.14 y, 145 kcal/d; starved) |
| 21 | id 43 | id 48 (F) | 1005 (4.84 y; 4.84 y, 242 kcal/d; alive) |
| 21 | id 13 | id 20 (M) | 850 (4.21 y; 4.21 y, 199 kcal/d; died of another cause) |
| 21 | id 29 | id 34 (F) | none |
| 5 | id 14 | id 22 (F) | 511 (4.98 y; 4.98 y, 139 kcal/d; starved) |
| 5 | id 31 | id 37 (M) | 517 (4.50 y; 4.50 y, 159 kcal/d; starved) |
| 5 | id 11 | id 21 (M) | 701 (4.50 y; 4.50 y, 220 kcal/d; starved) |
| 5 | id 43 | id 48 (F) | 867 (4.46 y; 4.46 y, 165 kcal/d; alive) |
| 5 | id 13 | id 20 (M) | 988 (4.59 y; 4.59 y, 249 kcal/d; alive) |
| 11 | id 14 | id 22 (F) | 650 (5.36 y; 5.36 y, 214 kcal/d; starved) |
| 11 | id 31 | id 37 (M) | 336 (4.00 y; 4.00 y, 179 kcal/d; starved); 956 (1.70 y; 5.70 y, 201 kcal/d; alive) |
| 11 | id 11 | id 21 (M) | 785 (4.73 y; 4.73 y, 263 kcal/d; starved) |
| 11 | id 43 | id 48 (F) | 868 (4.46 y; 4.46 y, 174 kcal/d; starved) |
| 11 | id 13 | id 20 (M) | 1014 (4.66 y; 4.66 y, 268 kcal/d; died of another cause) |
| 11 | id 29 | id 34 (F) | none |

- First interval to the next birth in the run, the Y1 animals' mothers: 4.62 y (range 4.00 to 5.54, 22 mothers over the five seeds). The model starts a mother's cycles from a clock set at the last birth (`amenorrheaMinY` 3.5 + up to 1.0 y), whether or not she is still nursing.
- After a newborn's death its mother gave birth again within the run 3 times, 343 to 451 days after the death (mean 413).
- Field, derived from two Gombe figures in the targets file: mean weaned age 4.71 y (T-INF-3, lonsdorf2020) against a mean interval between births of 5.15 y (T-DEM-12's note): 0.44 y apart; the registry's gestation is 222 to 232 days (0.61 to 0.64 y).
- Class readout, nursing females, Y3-W50-wean against Y3-W50: mean reserve ÷ store -0.050 against -0.048; trend of the daily class mean -0.0019 against -0.0021 % of the store a day (viability line −0.05); births 76 against 71.

#### Y5. The registered criteria (§2.3, §2.4)

| criterion | registered | read | verdict |
| --- | --- | --- | --- |
| F1, one clock for another | half or more of the animals that pass 6 y still drinking at the limit | 10 of 10; 184 kcal/d in their last 30 days | **met: the mechanism fails** |
| W1, weaning by the pair's state | fewer than half at the limit; weaned ages spread (SD above 0.3 y) | 0 weaned by the dry rule; every weaned age is the limit | **missed** |
| W2, milk tapers before it ends | milk at 4–5 y below 3–4 y, and below 100 kcal/d in the 180 days before the last milk | 232 against 255; 200 in the last 180 days | **missed (a small fall, no taper to the end)** |
| F2, the next infant pays | starvation deaths under 0.5 y above the base's | 6 against 0 under 0.5 y; with those of 0.5–2 y, 14 against 0; all 14 had an older sibling nursing | **met: the mechanism fails** |
| W3 / F4, the weaned animal copes | 365 days after the last milk: reserve never below −0.5, mean within 0.1 of the founder juveniles'; eating and full-gut share within a quarter of theirs | 5 animals followed 211 to 213 days: 1 below −0.5; all four parts held in 1 of 5; eating 418 min against 319, full foregut 70% against 55% | **missed** (the span is short of 365 days) |
| W4, growth | mass at 5 y against 7–13 kg, reported | 18.6 kg (17.7 to 19.6) | outside the band, as registered |
| W5 / F3, the mothers | nursing mothers' trend not below −0.05% a day; births not below the base's | trend -0.0019 against -0.0021 % a day; births 76 against 71 | **held** |
| the starvation count | decides nothing alone | 14 against 7: infant 0.5–2 y 8 against 0; infant < 0.5 y 6 against 0; juvenile 5–12 y 0 against 7 | not a criterion |
