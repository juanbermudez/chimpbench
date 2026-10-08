# E1x pre-registration: the small body's energy budget as tested ranges

Branch `e1x-small-body` (from `track-e` 7d7d468), 7 October 2026, 20:23 EDT. Track E, stage E1x. Follows
`ey-juvenile-starvation.md` (the diagnosis; its tables are quoted as "T4", "T9"), `e1w-prereg.md` (§1 the audit, §2.9
"Not registered: the small body's budget", §8 the failed weaning switch) and the precedent `e1v-prereg.md` (the user,
5 October: **"Test a range"**: run the simulation at several values of an input nobody has measured, report the outcome
for each, choose no value). §1 to §4 below are the registration, committed before any code. Nothing has been run.

**Rules served (user, verbatim).** "Field numbers are targets, never inputs; never tune an input to hit a behavioural
rate. Before building toward a field number that is far off, audit its source: sample, method, formula." "Pre-register
and commit before any run of changed code. At most 3 iterations per stage, each logged before its run." "All switches
stay 0 by default. Goldens and the field pin test (tests/sim-track-e.test.ts) must not move." Seeds: development 48 and
7 only.

**Seen before this registration (disclosed).** The three documents above in full, `e1u-prereg.md` §5 to 6, the gut
ceiling tool and its two scripts, the registry entries named below. One source was re-read on the network, once:
clauss2013 (PMC3812987, through the NCBI BioC API; CC BY), for the scaling exponents research.md had not recorded; what
it adds is in research.md, "Addendum: E1x small body". No other fetch. No simulation, no offline arithmetic of this stage
exists yet: the numbers in §1 are registry values and one-line derivations from them.

## 1. The question

A weaned animal of 16 to 21 kg cannot absorb more than it spends (T9: the most its gut passes ÷ what it spends is 1.03
at 16 kg against 1.32 for an adult female), so it starves 194 to 670 days after weaning. Field juveniles of 4 to 6 y
live without milk (e1w §1.6). Every input that carries the adult's budget down to that body was measured on adults or
across species. This stage asks, offline first: **which of those inputs, moved one at a time across the range its own
sources allow for a 16 to 21 kg animal, can account for the shortfall, and which cannot.** Then it builds, as input
ranges and not as chosen values, the ones that matter, and hands the integrator the three-year arms.

Not asked here: which value is true. No value is adopted. An arm that stops the deaths shows that the model's viability
depends on that unmeasured input, as E1v showed for wadging; it does not show the input's value.

## 2. The candidates: how the code scales each, what its source measured, and the range for 16 to 21 kg

File and line at 7d7d468. "Label" is the registry's evidence tag (`data/params.json`). "Exponent" is the power of body
mass the code applies. Ranges cite only sources in `docs/research.md` (section named); a source that would be needed and
is not there is named as missing and the range is given as unknown.

### 2.1 Gut capacity (foregut and hindgut) against body mass

- **Code.** `src/sim/energy.ts`:138–139 (capacity per kg: `digestaGutMlPerKg` × the foregut or hindgut share × a
  dry-matter density), 248–251 (`digestaCaps`: × the mass that sizes the gut), 234–241 (`gutKg`: the body mass, or a
  lactating female's enlarged one). **Exponent 1**: a small body gets the adult's millilitres per kg exactly.
- **Registry.** `digestaGutMlPerKg` 83 mL/kg, range 60–111, **assumed**; its note: "isometric scaling with body mass
  assumed". `digestaForegutShare` 0.45, `digestaForegutDmGPerMl` 0.15, `digestaHindgutDmGPerMl` 0.20: all **assumed**.
- **What the source measured.** One captive female chimpanzee, whole tract 3,322 cm³, mass, age and method unknown
  (chiversHladik1980 through nakamura2017; research.md E.25). No animal of 16 to 21 kg; no second animal.
- **Allometry cited.** clauss2013 (review; herbivorous mammals, birds and reptiles; **across species**): wet gut
  contents scale about as mass^1.0; "dry matter gut contents … has a slightly lower scaling"; "no statistical difference
  in the scaling of intake … and dry matter gut capacity can be demonstrated, but nevertheless they both scale higher
  than metabolism in large herbivores"; intake in mammals shows "a lower scaling in smaller … species" (research.md
  E.25 and the E1x addendum). Daily energy input of 17 wild primate species scales as mass^0.75 ± 0.04 (simmen2017,
  abstract; E.18). Direction that a gut is not a fixed volume per kg: sawada2011 (four adult macaques of 11–16 kg: gut
  fill rose with intake), speakman2008 (the gut grows in lactation; the source of `ledgerLactGut`).
- **Range for 16 to 21 kg.** Exponent **0.75 to 1.0**: from capacity following intake and need (the lower bracket
  clauss2013 states for dry-matter capacity: not different from intake, above metabolism) to isometry (wet contents;
  today). Both ends are cross-species. **Within a species, by age: unknown.** Missing: any gut volume or digesta mass
  by age in an ape (e1u §5.7); chiversHladik1980's specimen table; the coefficients of clauss2013's Fig. 6 (Müller et
  al. 2013, not read).
- **What the range means for the animal.** At 0.75, anchored at the adult female mass (31.3 kg): capacity × 1.183 at
  16 kg, × 1.148 at 18 kg, × 1.105 at 21 kg ((31.3 ÷ M)^0.25); × 1 at 31.3 kg and above.

### 2.2 Digesta passage time against body mass

- **Code.** `energy.ts`:127–128 (the hindgut's residue constant, `digestaMrtH` − `ledgerGutEmptyH`), 149 (the foregut's
  first-order emptying, `ledgerGutEmptyH`), 551–559 (the tick). **Exponent 0**: one time for every size.
- **Registry.** `digestaMrtH` 38 h, 31–48, **assumed**; `ledgerGutEmptyH` 3 h, 1.5–6, **assumed**.
- **What the sources measured.** miltonDemment1988: six captive adult females, 47.0 ± 4.9 kg, particle markers, 38 h on
  34% NDF and 48 h on 14% NDF (second-hand, nrc2003; e1u §6.1). lambert2002: 31.5 h (through nakamura2017). Emptying:
  seven captive adult chimpanzees, barium spheres, "more than 3 hours and less than 16" (ardente2011); human meals.
  No animal under 40 kg.
- **Allometry cited.** clauss2008 (19 captive primate species): retention "is not related to body mass but falls with
  relative intake". clauss2013: the classical derivation gives retention ∝ mass^0.25 (capacity^1.0 ÷ intake^0.75), and
  "digesta retention time does not scale as predicted … but shows a less clear-cut or no relationship with BM" above
  1–10 kg. sawada2011: 33–60 h in adult macaques of 11–16 kg by diet and amount (another species).
- **Range for 16 to 21 kg.** By body mass: **no change** is what the cited comparisons support (exponent 0), so the
  range is the adults' own span, 31.5–48 h, which is not a small-body input: it moves every animal. By relative intake
  (a growing animal eats more per kg^0.75): shorter, **magnitude unknown** (clauss2008's regression was read as an
  abstract). The quarter-power (38 h × (M ÷ 31.3)^0.25: 32.1 h at 16 kg) is computed offline **for information only**:
  its only cited source describes it in order to reject it. Missing: Demment & Van Soest 1985 (named in e-sources as
  closed, never read); clauss2008's full text; any retention time of an immature ape.

### 2.3 Intake rate against body mass

- **Code.** `energy.ts`:213–216 (`intakeSize`: (mass ÷ the adult mass of the sex)^`ledgerIntakeSizeExp`), read by
  `src/sim/intake.ts`:15–19 (`fruitRate`), `src/sim/execution.ts`:1091, 1126 and 1164, `energy.ts`:362. **Exponent
  0.75**, × a skill factor on fruit.
- **Registry.** `ledgerIntakeSizeExp` 0.75, range 0.5–1, **design**: "No chimpanzee measurement of ingestion rate against
  body size was found".
- **What the source measured.** bray2018 (Kanyawara, 26 immatures and 31 adults; 321 records on five ripe fruits,
  1992–1993): items per minute, infant ÷ adult 0.57 (0.35–0.83 by fruit), juvenile ÷ adult 0.80 (0.85 from the model
  coefficients), not significant for juveniles (E.12, E.21). No body mass, no grams or kcal per minute. schuppli2016
  (orangutans, 21 immatures): adult rates on easy foods just after weaning; "the E1c size exponent (0.75, design) finds
  no support here" (E.14.5).
- **Range for 16 to 21 kg.** Relative to an adult: **0.57 to 1.0** (bray2018's infants to schuppli2016's adult rate just
  after weaning; bray2018's juveniles, 0.80–0.85, lie inside). The code gives 0.60, 0.66 and 0.74 at 16, 18 and 21 kg
  (female). As an exponent at 16 kg: 0 to 0.84. The registry's own range, 0.5–1, gives 0.72 to 0.51 at 16 kg. Items
  per minute are not kcal per minute (bite size by age: missing).

### 2.4 Resting cost against body mass

- **Code.** `energy.ts`:150 (`ledgerRmrCoef` ÷ 24 per hour), 566 (× mass^`ledgerRmrExp`), × `ledgerActSleep` 1.0,
  `ledgerActRest` 1.25 or `ledgerActFeed` 1.38 (566), × `ledgerWildCostMult` (570). **Exponent 0.75** at every size.
- **Registry.** `ledgerRmrCoef` 70, 60–90, **assumed**; `ledgerRmrExp` 0.75, 0.67–0.76, **assumed**; the three activity
  multiples **assumed** (cross-species; "the multipliers themselves were not seen").
- **What the source measured.** Kleiber's cross-species equation (kleiber1947, not read). pontzer2016: basal rate of
  *Pan* 1,214 and 1,401 kcal/d at 46.4 and 57.9 kg, i.e. 68.3 and 66.7 × mass^0.75 (0.96 of Kleiber), "estimated from
  published respirometry of chimpanzees aged 2 months to 15 years (Bruhn & Benedict 1936; Bruhn 1934)" (E.3). So
  immatures are the animals behind the estimate, second-hand; total expenditure was measured only in adults of 10 y or
  more.
- **Range for 16 to 21 kg.** The coefficient: **0.96 to 1.0 of today's** (pontzer2016's estimate to Kleiber), which is
  not a small-body input (it moves adults alike). The exponent within the species, anchored at the adult: the registry's
  0.67–0.76 gives × 1.055 to × 0.993 at 16 kg, × 1.032 to × 0.996 at 21 kg. **Whether a growing chimpanzee's resting
  rate per kg^0.75 differs from an adult's: unknown.** Missing: Bruhn & Benedict 1936 and Bruhn 1934 (the per-animal
  rates by mass and age); any activity multiple measured on an ape.

### 2.5 Growth demand, and whether growth yields under shortfall

- **Code.** `energy.ts`:193–195 (`growthPotential`: 3.4 kg/y for a female, 3.8 for a male after the first year), 152 (×
  `ledgerGrowthKcalPerG`), 584–599 (charged as spending, × the share paid), 528–533 (`growFraction`; with `growYield`
  1, on in S39: the share paid is the relative store, min(1, 1 + reserves ÷ store)). **No mass term**: the same kg a
  year from 1 y to adult mass. Mass never falls.
- **Registry.** `ledgerGrowFemaleKgPerY` 3.4, 2.8–4.1, **M**; `ledgerGrowMaleKgPerY` 3.8, 3.4–4.3, **M**;
  `ledgerGrowthKcalPerG` 4.5, 2.9–6.0, **assumed**; `growYield` **design**.
- **What the source measured.** curry2023: 298 sanctuary chimpanzees, one mass per animal, piecewise regression of mass
  on age (animals of this age are in it; captive, well fed). Cost per gram: human infants (robertsYoung1988, abstract).
  Yield: human children, the order only (schoenbuchner2019, richard2012, thissen1994).
- **Range for 16 to 21 kg.** Demand at the potential: **22 to 67 kcal/d** for a female (2.8 × 2.9 to 4.1 × 6.0; today
  41.9), 27 to 71 for a male (today 46.8). Yield: growth does give way (to nothing at an empty store), so the least a
  starving animal pays is 0; that is the model's outcome, not an input. The wild rate (about 1.6 kg/y to 5 y, 2.2 to 2.8
  kg/y from 5 to 10 y; gurvenWalker2006 reading pusey2005, low confidence) is the target T-INF-4 and **is not used as an
  input or as a range end**.

### 2.6 Walking cost for a short-legged animal at the party's pace

- **Code.** `energy.ts`:153 (`ledgerWalkJPerKgM` ÷ 4,184 kcal per kg and metre), 616–624 (× metres moved × mass).
  **Exponent 0 per kg** (cost ∝ mass^1.0), no speed term. Speed: `src/sim/gait.ts`:63–67 (adult speed × (mass ÷ adult
  mass)^`walkGaitSizeExp`, 1/6); it sets time, not cost per metre.
- **Registry.** `ledgerWalkJPerKgM` 3.8 J per kg and metre, 2.8–5.8, **M**.
- **What the source measured.** sockol2007: five captive chimpanzees of 6 to 33 y and **33.9 to 82.3 kg** (mean 59.8),
  treadmill, 1.0 m/s; individuals 2.8 to 5.8. The lightest weighed twice the juvenile.
- **Allometry cited.** taylor1982 (62 species): 10.7 × mass^−0.316 J per kg and metre; it gives 2.9 at 59.8 kg, so
  chimpanzees sit 1.29 above the line. Speed: for chimpanzees the cost per distance was "approximately constant" with
  speed (luciano2024, bipedal, five adults), so no speed term is sourced.
- **Range for 16 to 21 kg.** **3.8 (today: no size term) to 5.8, 5.6 and 5.3 at 16, 18 and 21 kg** (taylor1982's slope
  carried down from the chimpanzee mean at 59.8 kg: 3.8 × (M ÷ 59.8)^−0.316); the all-mammal line itself gives 4.5, 4.3
  and 4.1. Below 3.8 nothing is sourced for a small animal (2.8 is one adult). **Every sourced departure from today
  charges the juvenile more.** How far it walks (3.6 to 4.9 km a day after weaning, T4) is behaviour, not an input.
  Missing: any cost of transport of an immature ape.

### 2.7 Examined and set aside

- The activity multiples and `ledgerWildCostMult`: unmeasured, not scaled by size; a gut-bound juvenile pays the feeding
  multiple for ten hours. Reported as one line of the offline table for scale, not a candidate.
- `ledgerReserveKcalPerKg` (the store per kg): sets how long a deficit takes to kill, not whether there is one.
- Fibre digestibility, fermentation yield, digesta densities: not scaled by size; E1u covers them.
- Milk, handed food, the weaning rule: E1w.

## 3. Offline first (no simulation): what will be computed, fixed before any number

**Tool.** `scripts/lib/gut-ceiling.ts` (`gutCeiling`: the gut's own first-order dynamics for one animal eating whenever
its foregut has room through a 12-hour active day, 30 days, the last 7 averaged), driven by a new script,
`scripts/e1x-small-body.ts`, committed with its output pasted into §5. No world tick.

**Animals and parameters.** The working base (S39 with `pithFibreSwallowed` 0.5; `integrator-kit/params/M6-W50.json`)
on a seed-48 field world as created (never ticked): a weaned juvenile female (a copy of a founder juvenile, its mass set
to 16, 18 and 21 kg) and an adult female neither pregnant nor nursing (31.3 kg) as the reference.

**Diets.** (i) Fruit only, the best case and T9's reference. (ii) The lean-season diets of E1u and E1v (E1r's
March–April mix): fallback 29% (S39) and 38% (S31) of plant energy. Figs 0.25 of fruit energy, as E1u, E1v and T9.

**The measure.** R = A ÷ E for one day at the gut's ceiling.
- A: energy absorbed (the tool's `absorbed`).
- E: what the animal spends on that day, from the ledger's own terms: resting rate × the feeding multiple in the ticks
  it eats, the rest multiple in the other active ticks and the sleep multiple for 12 hours; diet-induced thermogenesis
  (the tool's `tef`); growth at the potential (a growing animal's requirement; the yielded case is a separate row);
  walking and climbing a fixed day: 4 km on the ground and 100 m climbed for the juvenile, 2.5 km and 100 m for the
  adult (the model's own weaned juveniles and their mothers in the saved runs, T4 and e1w C1: 3.6–4.9 km and 2.0–3.1
  km; the climb is what their walking-plus-climbing energy leaves after the walk). Travel takes no time from eating in
  this bound, as in T9.
- Also printed: A − E in kcal a day (the saved run's weaned animals run 6 to 50 short, T4), and R for the adult under
  the same change, so an input that lifts every animal alike is told from one that closes the gap between sizes.
- **Check of the formula before it is used:** with the measured eating minutes, growth paid, walking-plus-climbing
  energy and absorbed energy of four animals of T4 and T9, E must come within 3% of their measured spending. If it
  does not, the formula is wrong and is fixed before any table is read. **Check of the tool:** A at 16.2 kg and at 31.3
  kg on fruit must equal T9's 868 and 1,677 within 1% (T9 used the day-395 world; here the animal is a founder copy).
- R here is not T9's ratio: T9 divided the ceiling by the spending of a day the animal actually lived (an adult eating
  195 minutes), this divides by the spending of the ceiling day itself. Both are printed for today's values.

**One at a time, the others at today's values**, each end of §2's range:

| candidate | low end | high end | how it is applied offline |
| --- | --- | --- | --- |
| gut capacity exponent | 0.75 | 1 (today) | both pools × (31.3 ÷ M)^0.25 below 31.3 kg; also the foregut alone and the hindgut alone |
| passage: retention | 31.5 h | 48 h | `digestaMrtH`, every size (not a small-body input); for information 38 × (M ÷ 31.3)^0.25 |
| passage: foregut emptying | 1.5 h | 6 h | `ledgerGutEmptyH`, every size (registry range) |
| intake rate | adult rate (exponent 0) | exponent 1 | `ledgerIntakeSizeExp`; also 0.5 (registry low end) |
| resting: coefficient | 0.96 × | 1 × (today) | `ledgerRmrCoef` 67.2, every size |
| resting: exponent within the species | 0.67 | 0.76 | resting rate × (M ÷ 31.3)^(e − 0.75) below 31.3 kg |
| growth demand | 2.8 kg/y × 2.9 kcal/g | 4.1 × 6.0 | the two registry entries; and growth paid 0 (fully yielded) |
| walking cost | 3.8 (today) | 3.8 × (M ÷ 59.8)^−0.316 | per kg and metre below 59.8 kg; also 2.8 (one adult) for scale |
| activity multiples (not a candidate) | 1.1 / 1.2 | 1.5 / 1.6 | `ledgerActRest` / `ledgerActFeed`, every size |

**Reading rules, fixed now.**
- An input **matters** if one end of its range moves R at 16 kg on fruit by 0.03 or more (about 25 kcal a day, half the
  measured deficit). It **can account for the shortfall** if one end closes half or more of the gap between R at 16 kg
  and the adult's R at today's values. It is **size-specific** if it changes the 16 kg animal's R relative to the
  adult's.
- **Built (at most three):** an input that matters, is size-specific, has a range from cited sources or cited allometry
  for this body size (not "unknown"), and is not already a registry parameter that an arm can set. The direction is
  not a criterion: an input whose sources say the juvenile is charged too little is built on the same terms as one
  whose sources say it is given too little. An input is not built because it would stop the deaths.
- **Not built, usable in an arm:** a registry parameter whose registered range already covers §2's (growth, the intake
  exponent).
- **Not built and not armed:** a range that is unknown, or a change that is not about body size.

**Prediction (before any number; moderate confidence unless said).** The gut capacity exponent matters most and is the
only candidate that can account for the shortfall (R at 16 kg up by about 0.15 at 0.75). Retention moves R as much or
more but for every size, and its mass exponent is unknown. The intake rate does not move R (the gut binds; high
confidence). Resting cost and growth each move R by 0.02 to 0.05. Walking cost moves it by 0.02 to 0.04 the wrong way.
No single input other than the gut's capacity or its passage lifts R at 16 kg to the adult's.

## 4. What is registered beyond the offline step

**Build (§6, after §5).** Each built input is one parameter whose default reproduces today bit for bit (as
`pithFibreSwallowed` does), classed in the prescription ledger as an input and a design assumption with its range,
`calibrationExcluded`, read only with the ledger switches it needs. Tests: at the default the compressed goldens, the
field pin and S39's pinned world and decision hashes (`tests/sim-wadging.test.ts`: ticks 6720 and 8160) do not move; at
the range end the quantity moves by exactly the registered factor for a small animal and not at all for an animal at or
above the reference mass; determinism whatever the batching; a save resumes exactly; inert without its switches; the
offline tool follows the parameter and equals §5's arithmetic.

**Smoke runs (§7).** One per built input, each logged before it runs: `e-bench --quick --seeds 48` (30 + 30 days) at
the range end against the default, to show the run completes and the quantity moves in the registered direction.
Nothing longer. One simulation job at a time; `uptime` and swap checked first, no launch above 6 GB of swap used.

**Arms for the integrator (§8; not run here).** At most four parameter files on the working base, labels
`Y3-W50-<name>`, 30 + 1,095 days, seeds 48, 7, 21, 5, 11, with the per-animal readout, each with a prediction and a
confidence level written before the run.

**Iterations.** At most 3 for the stage; an iteration is a change of this stage's `src` code followed by a run. The
registered design is iteration 1.

**What would count as failing.** If no candidate with a sourced range lifts R at 16 kg by 0.03, nothing is built and the
stage reports that the sources leave the shortfall unexplained. If the offline formula misses the measured spending by
more than 3% and cannot be made to match from the ledger's own terms, no table is read.

## 5. Offline result (7 October 2026, 20:31 EDT; no simulation, no world tick; §1 to §4 above are the registration, unchanged)

`scripts/e1x-small-body.ts` at the commit that adds this section; output in `artifacts/validation/e1x/small-body.{md,json}`
(gitignored) and pasted in §5.4. Both registered checks pass: the spending formula is within 1.4% of the measured
spending of four animals of the saved run (limit 3%), and the tool gives T9's ceilings (868 and 1,677 kcal/d).

### 5.1 The answer

**One candidate can account for most of the shortfall: how gut capacity scales with body mass. None of the others can,
and three of them can only make it worse.** On fruit alone R (most absorbed ÷ spent on that day) is 0.98 at 16 kg, 1.01
at 18 kg and 1.05 at 21 kg against 1.22 for an adult female; on the lean-season diet 0.91, 0.93 and 0.97 against 1.12
(S1). (T9's ratio, which divides by a day the animal actually lived, is reproduced: 1.03 and 1.32.)

| candidate | range for a 16 to 21 kg animal | R at 16 kg, fruit (today 0.98; adult 1.22) | gap closed | size-specific | verdict |
| --- | --- | --- | --- | --- | --- |
| gut capacity against mass | exponent 0.75 to 1 (cross-species; within a species unknown) | 1.14 at 0.75, 1.06 at 0.875 | 67%, 33% | yes | **can account**; the hindgut's part is three times the foregut's (+0.09 against +0.03) |
| retention time | by body mass: unknown; adults' span 31.5–48 h | 1.08 at 31.5 h, 0.83 at 48 h | 40%, −67% | no: the adult goes to 1.33 or 1.03 and the juvenile stays at 0.81 of her | matters, cannot account, not a small-body input |
| foregut emptying | 1.5–6 h (registry) | 0.99, 0.66 | 2%, −140% | no | only downward |
| intake rate against mass | 0.57 to 1.0 of the adult's | 0.98 to 0.99 | 0 to 2% | yes | **cannot**: the gut binds, not the bite rate |
| resting cost | × 0.96 (every size); exponent within the species unknown (registry 0.67–0.76) | 1.02; 0.94 to 0.99 | 13%; −17% to 2% | the coefficient no | cannot |
| growth demand | 22 to 67 kcal/d (today 42) | 1.01 to 0.96 (1.03 if nothing is paid) | 10% to −12% | yes | cannot; below the registered threshold |
| walking cost | 3.8 (today) up to 5.8 at 16 kg | 0.95 (slope from 59.8 kg), 0.97 (from 31.3 kg) | −14%, −7% | yes | **cannot: every sourced end lowers R** |

- At an exponent of 0.75 R is 1.14 at all three masses (capacity then follows the same power as the resting need), and
  the 16 kg animal has 124 kcal a day to spare on fruit and 47 on the lean-season diet, where today it is 14 and 79
  short. At the midpoint, 0.875, it has 52 to spare on fruit and is 19 short on the lean diet.
- Even at 0.75 the juvenile stays below the adult (1.14 against 1.22): what is left is its growth (42 kcal/d, 0.05 of
  R) and its longer walk. No input closes the whole gap.
- Retention is the only other large lever, and it is not about size: the cited comparisons find no relation with body
  mass. The quarter power, shown for information, would give +0.09; its source describes it to reject it.
- The activity multiples (not a candidate) move R by +0.06 to −0.07 for every size.

**Against the prediction (§3).** Held: the gut capacity exponent matters most and alone can account (predicted about
+0.15, found +0.16); the intake rate does nothing; resting cost and growth move R by 0.02 to 0.04; walking by 0.02 to
0.03 the wrong way. Not held as written: retention moves R less than the gut exponent upward (+0.09) and as much
downward (−0.16), not "as much or more"; and no input, the gut included, lifts R at 16 kg to the adult's.

### 5.2 What is built, by the registered rules

| candidate | matters (0.03) | size-specific | sourced range for this body | already a registry parameter | built |
| --- | --- | --- | --- | --- | --- |
| gut capacity exponent | yes (+0.16) | yes | 0.75 to 1, cross-species | no | **yes: `gutSizeExp`** |
| walking cost by size | yes at the registered end (−0.03) | yes | taylor1982's slope | no | **yes: `walkCostSizeExp`** (see 5.3) |
| retention | yes | no | unknown by mass | `digestaMrtH` | no, and no arm |
| foregut emptying | yes, downward | no | — | `ledgerGutEmptyH` | no |
| intake rate | no | yes | yes | `ledgerIntakeSizeExp` | no; an arm would show nothing |
| resting cost | coefficient yes (+0.03), exponent yes (−0.04) | exponent only | coefficient: not about size; exponent: unknown | `ledgerRmrCoef`, `ledgerRmrExp` | no |
| growth demand | no (+0.02, −0.03 unrounded 0.028) | yes | yes | both entries | no; could be an arm, not proposed |

Two inputs, not three. Neither is built because it stops deaths: the first is the one scaling rule the registry itself
calls assumed, bracketed by the allometry cited for it; the second makes the juvenile's position worse.

### 5.3 Amendment, logged before any code of the build: where the walking term is anchored

§3 registered the walking end as 3.8 × (M ÷ 59.8)^−0.316, the slope carried down from sockol2007's mean animal. Applied
to every animal below 59.8 kg it also charges the model's adults more per metre (× 1.23 at 31.3 kg, × 1.14 at 39 kg):
a statement about wild adults being lighter than the captive sample, not about a small body, and it would move the
adults the three-year readouts need unchanged. **The built term is anchored at the adult female mass instead (31.3 kg,
2.6 kg below the lightest animal sockol2007 measured, 33.9 kg): cost per kg and metre × (M ÷ 31.3)^`walkCostSizeExp`
below 31.3 kg, unchanged at and above it.** At taylor1982's exponent that is 4.7, 4.5 and 4.3 J per kg and metre at 16,
18 and 21 kg: inside §2.6's range (3.8 to 5.8, 5.6, 5.3), above the all-mammal line (4.5, 4.3, 4.1), below the range's
top. Its offline effect is half the registered end's: R −0.02 (unrounded 0.015) at 16 kg, under the 0.03 threshold; the
registered end gives −0.03 and also lowers the adult's R from 1.22 to 1.20. So the built range understates what the
slope from the sample mean would charge. It is built all the same, because a range tested only at its favourable input
would be one-sided; whether its arms are worth running is put to the user (§9).

### 5.4 Tables (output of `scripts/e1x-small-body.ts`)

```sh
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e1x-small-body.ts [--ckpt <M12-W50.s48.ckpt-d395.v8.gz> --ids 22,10] [--built]
```

Working base: `docs/staging/integrator-kit/params/M6-W50.json` (pithFibreSwallowed 0.5), seed-48 field world as created, never ticked. Juvenile: a copy of founder id 35 (F, 5.5 y) with its mass set; adult: id 10 (F, 44.0 y, 31.3 kg, not pregnant, not nursing). Active day 12 h, figs 0.25 of fruit energy. Travel: juvenile 4 km and 100 m climbed, adult 2.5 km and 100 m.

#### S0. Checks, read before any table

| animal of the saved run (T4, P1) | kg | eating min | measured spent | formula | difference |
| --- | ---: | ---: | ---: | ---: | ---: |
| id 22, weaned, days 365–404 | 16.3 | 635 | 845 | 839 | −0.7% |
| id 37, on milk, days 365–404 | 16.6 | 150 | 832 | 839 | +0.9% |
| id 35, founder juvenile, days 365–484 | 24.2 | 215 | 1151 | 1167 | +1.4% |
| id 19, founder juvenile, days 365–484 | 29.3 | 203 | 1311 | 1325 | +1.1% |

- Spending formula against the measured spending of four animals: largest difference 1.4% (registered limit 3%): **passes**. The formula takes their measured eating minutes, growth paid, walking-plus-climbing energy and absorbed energy; a 12-hour waking day.
- Tool against T9 (fruit only): 868 kcal/d at 16.2 kg against T9's 868 (−0.1%); 1677 at 31.3 kg against 1677 (−0.0%) (registered limit 1%): **passes**.
- Saved world M12-W50.s48.ckpt-d395.v8.gz, id 22 (16.2 kg): ceiling on fruit 868 kcal/d there, 865 for this script's animal at the same mass.
- Saved world M12-W50.s48.ckpt-d395.v8.gz, id 10 (31.3 kg): ceiling on fruit 1677 kcal/d there, 1677 for this script's animal at the same mass.

#### S1. Today's values: the ceiling day by body mass and diet

| diet | animal | absorbed A | spent E | of which resting × activity | thermogenesis | growth | walking + climbing | A − E | **R = A ÷ E** | foregut full | hindgut full |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| fruit only | juvenile F 16 kg | 857 | 871 | 666 | 86 | 42 | 77 | −14 | **0.98** | 91% | 42% |
| fruit only | juvenile F 18 kg | 964 | 953 | 728 | 96 | 42 | 86 | +11 | **1.01** | 91% | 42% |
| fruit only | juvenile F 21 kg | 1123 | 1072 | 817 | 112 | 42 | 101 | +51 | **1.05** | 91% | 41% |
| fruit only | adult F 31.3 kg | 1677 | 1378 | 1102 | 168 | 0 | 108 | +299 | **1.22** | 92% | 42% |
| lean season, fallback 29% | juvenile F 16 kg | 784 | 864 | 666 | 78 | 42 | 77 | −79 | **0.91** | 89% | 40% |
| lean season, fallback 29% | juvenile F 18 kg | 882 | 945 | 728 | 88 | 42 | 86 | −63 | **0.93** | 89% | 40% |
| lean season, fallback 29% | juvenile F 21 kg | 1028 | 1063 | 817 | 103 | 42 | 101 | −35 | **0.97** | 88% | 40% |
| lean season, fallback 29% | adult F 31.3 kg | 1532 | 1363 | 1102 | 153 | 0 | 108 | +169 | **1.12** | 88% | 40% |
| lean season, fallback 38% | juvenile F 16 kg | 763 | 861 | 666 | 76 | 42 | 77 | −99 | **0.89** | 88% | 40% |
| lean season, fallback 38% | juvenile F 18 kg | 857 | 942 | 728 | 86 | 42 | 86 | −85 | **0.91** | 88% | 40% |
| lean season, fallback 38% | juvenile F 21 kg | 1000 | 1060 | 817 | 100 | 42 | 101 | −60 | **0.94** | 87% | 39% |
| lean season, fallback 38% | adult F 31.3 kg | 1489 | 1359 | 1102 | 149 | 0 | 108 | +130 | **1.10** | 87% | 39% |

- The gap to explain (fruit only): R 0.98 at 16 kg against 1.22 for the adult female, 0.23 apart. On the lean-season diet (fallback 29%) 0.91 against 1.12.
- T9's ratio for comparison (the ceiling ÷ the spending of a day the animal actually lived): 1.03 at 16.2 kg and 1.32 for the adult female (T9: 1.03 and 1.32). R is lower for the adult because the ceiling day charges her twelve hours at the feeding multiple and the thermogenesis of all she could absorb; she needs neither.
- Lean-season diet at the other swallowed shares (today's values otherwise): all of the pith fibre swallowed R 0.83 at 16 kg and 1.03 for the adult; a quarter 0.95 and 1.18.

#### S2. Each candidate at each end of its range, one at a time (the others at today's values)

R on fruit only and on the lean-season diet (fallback 29%). "Gap closed" = the change of R at 16 kg on fruit ÷ the gap of S1; "16 kg ÷ adult" = R at 16 kg over the adult's R under the same change (fruit; today 0.81). Basis: sourced = a cited source or cited allometry gives this end for this body; registry = the registry's range for every size; info = for scale only.

| candidate | end | basis | R at 16 kg | 18 kg | 21 kg | adult | ΔR at 16 kg | A − E at 16 kg | gap closed | 16 kg ÷ adult | lean diet: R at 16 kg (Δ) | adult |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| today | | | 0.98 | 1.01 | 1.05 | 1.22 | | −14 | | 0.81 | 0.91 | 1.12 |
| gut capacity | exponent 0.75, both pools | sourced | 1.14 | 1.14 | 1.14 | 1.22 | +0.16 | +124 | 67% | 0.94 | 1.05 (+0.14) | 1.12 |
| gut capacity | exponent 0.875 (midpoint), both pools | sourced | 1.06 | 1.08 | 1.09 | 1.22 | +0.08 | +52 | 33% | 0.87 | 0.98 (+0.07) | 1.12 |
| gut capacity | exponent 0.75, foregut alone | info | 1.01 | 1.04 | 1.07 | 1.22 | +0.03 | +11 | 12% | 0.83 | 0.93 (+0.03) | 1.12 |
| gut capacity | exponent 0.75, hindgut alone | info | 1.08 | 1.11 | 1.12 | 1.22 | +0.09 | +69 | 40% | 0.89 | 0.99 (+0.08) | 1.12 |
| passage: retention | 31.5 h, every size | registry | 1.08 | 1.11 | 1.15 | 1.33 | +0.09 | +69 | 40% | 0.81 | 0.99 (+0.08) | 1.22 |
| passage: retention | 48 h, every size | registry | 0.83 | 0.85 | 0.88 | 1.03 | −0.16 | −148 | -67% | 0.81 | 0.76 (−0.14) | 0.95 |
| passage: retention | 38 h × (M ÷ 31.3)^0.25 (rejected by its source) | info | 1.08 | 1.10 | 1.11 | 1.22 | +0.09 | +69 | 40% | 0.89 | 0.99 (+0.08) | 1.12 |
| passage: foregut emptying | 1.5 h, every size | registry | 0.99 | 1.02 | 1.05 | 1.22 | +0.00 | −10 | 2% | 0.81 | 0.91 (+0.00) | 1.13 |
| passage: foregut emptying | 6 h, every size | registry | 0.66 | 0.68 | 0.70 | 0.82 | −0.33 | −288 | -140% | 0.80 | 0.61 (−0.30) | 0.75 |
| intake rate | the adult rate (exponent 0) | sourced | 0.99 | 1.02 | 1.05 | 1.22 | +0.00 | −10 | 2% | 0.81 | 0.91 (+0.01) | 1.12 |
| intake rate | exponent 0.5 | registry | 0.99 | 1.01 | 1.05 | 1.22 | +0.00 | −12 | 1% | 0.81 | 0.91 (+0.00) | 1.12 |
| intake rate | exponent 0.84 (0.57 of the adult rate at 16 kg) | sourced | 0.98 | 1.01 | 1.05 | 1.22 | −0.00 | −15 | 0% | 0.81 | 0.91 (−0.00) | 1.12 |
| intake rate | exponent 1 | registry | 0.98 | 1.01 | 1.05 | 1.22 | −0.00 | −16 | -1% | 0.81 | 0.91 (−0.00) | 1.12 |
| resting cost | coefficient × 0.96, every size | sourced | 1.02 | 1.04 | 1.08 | 1.26 | +0.03 | +13 | 13% | 0.81 | 0.94 (+0.03) | 1.16 |
| resting cost | exponent 0.67 below 31.3 kg | registry | 0.94 | 0.98 | 1.02 | 1.22 | −0.04 | −51 | -17% | 0.78 | 0.87 (−0.04) | 1.12 |
| resting cost | exponent 0.76 below 31.3 kg | registry | 0.99 | 1.02 | 1.05 | 1.22 | +0.01 | −10 | 2% | 0.81 | 0.91 (+0.00) | 1.12 |
| growth demand | 2.8 kg/y × 2.9 kcal/g | sourced | 1.01 | 1.03 | 1.07 | 1.22 | +0.02 | +6 | 10% | 0.83 | 0.93 (+0.02) | 1.12 |
| growth demand | 4.1 kg/y × 6.0 kcal/g | sourced | 0.96 | 0.99 | 1.02 | 1.22 | −0.03 | −39 | -12% | 0.79 | 0.88 (−0.03) | 1.12 |
| growth demand | growth paid 0 (fully yielded; an outcome, not an input) | info | 1.03 | 1.06 | 1.09 | 1.22 | +0.05 | +28 | 21% | 0.85 | 0.95 (+0.05) | 1.12 |
| walking cost | 3.8 × (M ÷ 59.8)^−0.316 (adults move too) | sourced | 0.95 | 0.98 | 1.02 | 1.20 | −0.03 | −44 | -14% | 0.79 | 0.88 (−0.03) | 1.11 |
| walking cost | 3.8 × (M ÷ 31.3)^−0.316 below 31.3 kg (adults fixed) | sourced | 0.97 | 1.00 | 1.04 | 1.22 | −0.02 | −28 | -7% | 0.80 | 0.89 (−0.01) | 1.12 |
| walking cost | the all-mammal line, 10.7 × M^−0.316 | info | 0.97 | 1.00 | 1.04 | 1.22 | −0.01 | −24 | -5% | 0.80 | 0.90 (−0.01) | 1.13 |
| walking cost | 2.8, every size (one adult) | info | 1.00 | 1.03 | 1.07 | 1.23 | +0.02 | +1 | 8% | 0.81 | 0.92 (+0.02) | 1.14 |
| activity multiples (not a candidate) | rest 1.1, feeding 1.2, every size | registry | 1.04 | 1.07 | 1.11 | 1.30 | +0.06 | +36 | 26% | 0.81 | 0.96 (+0.06) | 1.20 |
| activity multiples (not a candidate) | rest 1.5, feeding 1.6, every size | registry | 0.92 | 0.94 | 0.98 | 1.13 | −0.07 | −76 | -28% | 0.81 | 0.85 (−0.06) | 1.05 |

#### S3. Read by the registered rules (§3): matters = |ΔR| at 16 kg on fruit of 0.03 or more; can account = closes half the gap or more

| candidate | largest ΔR at 16 kg at a sourced or registry end (which) | matters | can account for the shortfall | size-specific | range for this body |
| --- | --- | --- | --- | --- | --- |
| gut capacity | up +0.16 (exponent 0.75, both pools); down +0.08 (exponent 0.875 (midpoint), both pools) | yes | yes (67% of the gap) | yes | exponent 0.75, both pools (sourced); exponent 0.875 (midpoint), both pools (sourced) |
| passage: retention | up +0.09 (31.5 h, every size); down −0.16 (48 h, every size) | yes | no (40% of the gap at best) | no | 31.5 h, every size (registry); 48 h, every size (registry) |
| passage: foregut emptying | up +0.00 (1.5 h, every size); down −0.33 (6 h, every size) | yes | no (2% of the gap at best) | no | 1.5 h, every size (registry); 6 h, every size (registry) |
| intake rate | up +0.00 (the adult rate (exponent 0)); down −0.00 (exponent 1) | no | no (2% of the gap at best) | yes | the adult rate (exponent 0) (sourced); exponent 0.5 (registry); exponent 0.84 (0.57 of the adult rate at 16 kg) (sourced); exponent 1 (registry) |
| resting cost | up +0.03 (coefficient × 0.96, every size); down −0.04 (exponent 0.67 below 31.3 kg) | yes | no (13% of the gap at best) | yes | coefficient × 0.96, every size (sourced); exponent 0.67 below 31.3 kg (registry); exponent 0.76 below 31.3 kg (registry) |
| growth demand | up +0.02 (2.8 kg/y × 2.9 kcal/g); down −0.03 (4.1 kg/y × 6.0 kcal/g) | no | no (10% of the gap at best) | yes | 2.8 kg/y × 2.9 kcal/g (sourced); 4.1 kg/y × 6.0 kcal/g (sourced) |
| walking cost | up −0.02 (3.8 × (M ÷ 31.3)^−0.316 below 31.3 kg (adults fixed)); down −0.03 (3.8 × (M ÷ 59.8)^−0.316 (adults move too)) | yes | no (-7% of the gap at best) | yes | 3.8 × (M ÷ 59.8)^−0.316 (adults move too) (sourced); 3.8 × (M ÷ 31.3)^−0.316 below 31.3 kg (adults fixed) (sourced) |
| activity multiples (not a candidate) | up +0.06 (rest 1.1, feeding 1.2, every size); down −0.07 (rest 1.5, feeding 1.6, every size) | yes | no (26% of the gap at best) | no | rest 1.1, feeding 1.2, every size (registry); rest 1.5, feeding 1.6, every size (registry) |

#### S5. The three-year arms, offline (several inputs at once where the arm sets several)

| arm | fruit only: R at 16 kg | 18 kg | 21 kg | adult | A − E at 16 kg | lean diet (fallback 29%): R at 16 kg | 18 kg | 21 kg | adult | A − E at 16 kg | lean diet (38%): R at 16 kg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Y3-W50 (the working base, today) | 0.98 | 1.01 | 1.05 | 1.22 | −14 | 0.91 | 0.93 | 0.97 | 1.12 | −79 | 0.89 |
| Y3-W50-gut75 (gutSizeExp 0.75) | 1.14 | 1.14 | 1.14 | 1.22 | +124 | 1.05 | 1.05 | 1.06 | 1.12 | +47 | 1.03 |
| Y3-W50-gut875 (gutSizeExp 0.875) | 1.06 | 1.08 | 1.09 | 1.22 | +52 | 0.98 | 0.99 | 1.01 | 1.12 | −19 | 0.95 |
| Y3-W50-walk (walkCostSizeExp −0.316) | 0.97 | 1.00 | 1.04 | 1.22 | −28 | 0.89 | 0.92 | 0.96 | 1.12 | −93 | 0.87 |
| Y3-W50-gut75-walk (gutSizeExp 0.75 and walkCostSizeExp −0.316) | 1.12 | 1.13 | 1.13 | 1.22 | +111 | 1.04 | 1.04 | 1.05 | 1.12 | +33 | 1.01 |

## 6. The build (code 58aed13; iteration 1 of 3)

| id | default | range | hard range | label | read only with | what it scales |
| --- | --- | --- | --- | --- | --- | --- |
| `gutSizeExp` | 1 (today) | 0.75 to 1 | 0.5 to 1 | **design assumption**, input range, `calibrationExcluded` | `energyLedger`, `ledgerDigesta` | foregut and hindgut dry-matter capacity = the per-kg capacity × 31.3 × (mass ÷ 31.3)^it below 31.3 kg; × mass at and above |
| `walkCostSizeExp` | 0 (today) | −0.316 to 0 | −1 to 0 | **design assumption**, input range, `calibrationExcluded` | `energyLedger` | walking cost per kg and metre × (mass ÷ 31.3)^it below 31.3 kg on the animal's own legs; × 1 at and above, for climbing and for a load carried |

- **Code** (`src/sim/energy.ts`): `sizedKg` and `gutSizeKg` (the mass that sizes the gut; `gutKg` multiplies a lactating
  female's term onto it as before), read by every capacity (`digestaCaps`, `gutCap`, `gutRoom`, `eat`, `gutBout`, the
  hindgut brake of `energyTick`, the fill readout), and now also by the two places that sized a young animal's gut from
  its mass directly (`nurseBoutWorth`, `sharePlant`; equal at the default). `walkSize`: the factor on the ground term
  of `energyTick`, of `locomotionKcal` (the trip cost the forager weighs) and, as the carrier's factor, of `rideTick`
  and the new `loadKcal`, which `src/sim/gait.ts` `riderKcal` now calls (a carried infant is a load, charged at its
  carrier's cost; equal to the old call at the default). At the defaults the code path multiplies by 1 or returns the
  mass itself: no random draw, no state, no new key.
- **Registry and ledger.** `data/params.json` (two entries, evidence design, `calibrate` false, refs to research.md),
  `src/sim/params.gen.ts`, `docs/simulation.md` §17 (two rows) and one paragraph. `scripts/lib/prescriptions.ts`: both
  classed **input** (kind "body scaling", marked as judgement calls; reason "design assumption: …"), each active only
  with its switches. The count does not move: S39 42 at every value (`decision-guide --check` agrees).
- **Tests** (`tests/sim-e1x.test.ts`, 10, all pass): the defaults in both profiles; at the defaults, and with both set
  explicitly to 1 and 0, S39's world and every animal's decision values at ticks 6720 and 8160 are the pins recorded
  before E1v (`be3269e9cc69f676`, `93ced3a9df1c66ce`, `f57cf21e1f863541`, `0ff4d71478f53323`); at 0.75 and 0.875 both
  pools and the capacity the intake valuation reads grow by exactly (31.3 ÷ mass)^(1 − exponent) at 16, 18 and 21 kg
  (× 1.183, 1.148, 1.105 at 0.75) and not at all at 31.3 kg, for an adult of either sex, a male of 35 kg or a lactating
  female; a 16 kg foregut takes exactly that much more and a hindgut that was full has room; at −0.316 walking costs
  exactly (mass ÷ 31.3)^−0.316 more per kg and metre at the three masses (4.7, 4.5, 4.3 J), climbing, adults and a load
  on an adult carrier do not move, and the tick charges it; at both range ends the run is the same whatever the
  batching, a save resumes exactly and the world differs from today's; each is inert without its switches; the offline
  tool reads the parameters and equals §5's arithmetic to 1e-9 (S4 below: twelve of twelve equal); the ledger classes
  both as inputs and the count holds.
- **Not moved** (run, all pass): `tsc --noEmit`; `gen-params --check` (1,046 entries, lint clean); the compressed golden
  hashes (`tests/sim-params.test.ts`, `kernel`, `sim-life`, `sim-rg`, `sim-endocrine`), the field pin
  (`tests/sim-track-e.test.ts`), `tests/prescription-ledger.test.ts`, `tests/sim-wadging.test.ts`, and the gut and energy
  files (`sim-energy`, `sim-digesta`, `e1u-gut-ceiling`, `sim-gut-value`, `sim-food-energy`, `sim-tripcost`, `sim-water`,
  `sim-forage-rate`, `sim-e1w`, `sim-e1p`, `persist-envelope`): 217 tests in 20 files, 217 pass. The full suite was
  not run (the integrator runs it at the merge).
- **Known limits (deferred, file:line at 58aed13).** `energy.ts` `sizedKg`: one exponent for both pools and one
  reference mass for both sexes; the offline split says the hindgut's part is about three times the foregut's. `walkSize`:
  the anchor understates taylor1982's slope from the sample mean (§5.3). `src/sim/gait.ts`:63: walking speed still
  scales as mass^(1/6) whatever these two are set to. `scripts/forage-rate-diagnose.ts`:120 recomputes the walking cost
  without the size term (a diagnosis script, not used here).

#### S4. The built parameters against S2's arithmetic (the same animals; fruit only)

| parameter | value | animal | from the model's own functions | S2's arithmetic | equal |
| --- | ---: | --- | ---: | ---: | --- |
| gutSizeExp | 0.75 | 16 kg | 1010.648 kcal/d absorbed | 1010.648 | yes |
| gutSizeExp | 0.75 | 18 kg | 1103.988 kcal/d absorbed | 1103.988 | yes |
| gutSizeExp | 0.75 | 21 kg | 1239.294 kcal/d absorbed | 1239.294 | yes |
| gutSizeExp | 0.75 | 31.3 kg | 1676.605 kcal/d absorbed | 1676.605 | yes |
| gutSizeExp | 0.875 | 16 kg | 930.661 kcal/d absorbed | 930.661 | yes |
| gutSizeExp | 0.875 | 18 kg | 1031.446 kcal/d absorbed | 1031.446 | yes |
| gutSizeExp | 0.875 | 21 kg | 1180.011 kcal/d absorbed | 1180.011 | yes |
| gutSizeExp | 0.875 | 31.3 kg | 1676.605 kcal/d absorbed | 1676.605 | yes |
| walkCostSizeExp | -0.316 | 16 kg | 71.856 kcal per 4 km | 71.856 | yes |
| walkCostSizeExp | -0.316 | 18 kg | 77.884 kcal per 4 km | 77.884 | yes |
| walkCostSizeExp | -0.316 | 21 kg | 86.545 kcal per 4 km | 86.545 | yes |
| walkCostSizeExp | -0.316 | 31.3 kg | 113.709 kcal per 4 km | 113.709 | yes |

## 7. Smoke runs, logged before they run (7 October 2026, 20:39 EDT)

One short run per built input and one paired reference, as registered in §4. From a frozen detached checkout of the
commit that adds this section (`.claude/worktrees/bench-e1x`; `node_modules`, `data/raw` and the scorecard file linked,
`git status --short` empty there), `scripts/e-bench.ts --quick --seeds 48 --workers 1 --animal-days` (seed 48, 30-day
burn-in, 30 scored days), one job at a time, `uptime` and `sysctl -n vm.swapusage` before each (no launch above 6 GB of
swap used). Outputs in this worktree's `artifacts/validation/e1x/` (gitignored).

| run | parameters | meant to show |
| --- | --- | --- |
| smoke-ref | the working base (`integrator-kit/params/M6-W50.json`) | the paired reference (both inputs at their defaults) |
| smoke-gut75 | the working base and `gutSizeExp` 0.75 | the run completes; animals under 31.3 kg end fewer of their eating ticks at a full foregut |
| smoke-walk | the working base and `walkCostSizeExp` −0.316 | the run completes; animals under 31.3 kg are charged more per kg and metre walked, adults the same |

**Registered directions** (read by `scripts/e1x/smoke.py` from the runs' JSON, by body-mass band):
- smoke-walk: walking energy ÷ (metres on the ground × mass) equals 3.8 × (mass ÷ 31.3)^−0.316 J for animal-days under
  31.3 kg (above 3.8) and 3.8 at 31.3 kg and over, to three figures. This is exact, not a tendency: the charge is the
  ledger's own arithmetic.
- smoke-gut75: in the bands under 31.3 kg the share of eating ticks at a full foregut is lower than in the reference.
  The window (late October to late November) is not the lean season and the only weaned animals under 21 kg come later
  (the first is weaned on scored day 222), so the bands under 21 kg hold animals on milk whose gut is seldom full:
  the fall may be small there; it should show in the 21 to 31.3 kg band (the founder juveniles: 26% of eating minutes
  at a full foregut in T4). Low confidence on size, moderate on direction.
- Nothing else is predicted and nothing is judged: no survival, reserve or band-distance statement is read from 30
  days. No value is changed in response.

### 7.1 Result (frozen checkout at 133b75f, clean; 7 October 2026, 20:40 to 20:43 EDT)

Three runs, one at a time; swap used 3.8 GB before each (limit 6), 1-minute load 1.9 to 2.7. Outputs
`artifacts/validation/e1x/smoke-{ref,gut75,walk}*` (gitignored); the tables below are `scripts/e1x/smoke.py`'s output.
No code or value was changed after a run: one iteration of three used.

- **All three completed** (53, 55 and 56 s), viability passes, 49 animals at the start and the end, no death.
- **`gutSizeExp` 0.75 moves as registered.** The share of eating ticks at a full foregut falls in every band under
  31.3 kg: 6% → 1% (under 10 kg), 18% → 5% (10 to 21 kg), 20% → 11% (21 to 31.3 kg); mean foregut fill falls with it
  (0.47 → 0.31, 0.62 → 0.53, 0.78 → 0.74). Adults: 7% → 5%, in a world that has diverged (their capacity is unchanged:
  the unit test).
- **`walkCostSizeExp` −0.316: the direction is as registered; the exact readout I registered was wrong.** I registered
  that walking energy ÷ (metres on the ground × mass) would equal the ledger's cost to three figures. It cannot: the
  per-animal readout counts metres on the ground only (height under 0.3 m), and the ledger charges every horizontal
  metre, in a crown too. In the default run itself that ratio is 4.09 for adults, not 3.8. Read as a ratio to the
  default run it is × 1.605, × 1.149 and × 1.058 in the three bands under 31.3 kg against registered factors of 1.588,
  1.176 and 1.091, and × 0.995 for adults against 1.000: the right direction and about the right size, not exact (two
  diverged worlds, crown metres uncounted). The exact statement stands on the unit test, which reads the tick's own
  charge. A readout of crown metres would be needed to check it in a run; none was added.
- **Not predicted, reported, not judged** (one seed, 30 days, outside the lean season). Under `gutSizeExp` 0.75 the 10
  to 21 kg animals, all on milk, drank 194 against 224 kcal/d and each band under 31.3 kg ended 0.009 to 0.015 higher
  in reserve. Under `walkCostSizeExp` −0.316 the 21 to 31.3 kg band ate 273 against 245 minutes a day, with 33% against
  20% of its eating ticks at a full foregut, and ended at −0.061 against −0.046 of its store.

#### E1x smoke runs: seed 48, 30 + 30 days, the working base; printed by `scripts/e1x/smoke.py` from the runs' JSON

| run | parameters beyond the working base | commit | dirty | viability | living start → end | births / deaths | starvation deaths | wall, s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | none | 133b75f | 0 | pass | 49 → 49 | 0 / 0 | 0 | 53 |
| gutSizeExp 0.75 | {"gutSizeExp": 0.75} | 133b75f | 0 | pass | 49 → 49 | 0 / 0 | 0 | 55 |
| walkCostSizeExp −0.316 | {"walkCostSizeExp": -0.316} | 133b75f | 0 | pass | 49 → 49 | 0 / 0 | 0 | 56 |

By body mass (animal-days of the 30 scored days; an animal-day is counted in the band of its mass that day). "Walking energy per kg and ground metre" = walking energy charged ÷ (metres on the ground × mass), J, over animal-days that walked: the readout counts ground metres only and the ledger charges crown metres too, so it is above the ledger's 3.8 in every run; "÷ default" = that figure over the default run's; "registered factor" = (mass ÷ 31.3)^exponent below 31.3 kg, the mean over the same animal-days. "At a full foregut" = eating ticks ending with the foregut at least 0.95 full ÷ eating ticks.

| body mass | run | animal-days | mean kg | walking energy per kg and ground metre, J | ÷ default | registered factor | km on the ground | eating min | at a full foregut | dry matter eaten, g per kg | mean foregut fill | reserve ÷ store | absorbed − spent, kcal/d | milk drunk, kcal/d |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| under 10 kg | default | 150 | 6.0 | 6.49 | 1.000 | 1.000 | 0.2 | 47 | 6% | 15.7 | 0.47 | -0.020 | -2 | 292 |
| under 10 kg | gutSizeExp 0.75 | 150 | 6.0 | 6.77 | 1.044 | 1.000 | 0.3 | 46 | 1% | 15.9 | 0.31 | -0.011 | -2 | 286 |
| under 10 kg | walkCostSizeExp −0.316 | 150 | 6.0 | 10.41 | 1.605 | 1.588 | 0.3 | 46 | 4% | 15.6 | 0.44 | -0.017 | +0 | 298 |
| 10 to 21 kg | default | 120 | 14.3 | 4.77 | 1.000 | 1.000 | 1.2 | 178 | 18% | 19.0 | 0.62 | -0.027 | +1 | 224 |
| 10 to 21 kg | gutSizeExp 0.75 | 120 | 14.3 | 4.61 | 0.967 | 1.000 | 1.3 | 181 | 5% | 19.9 | 0.53 | -0.014 | -0 | 194 |
| 10 to 21 kg | walkCostSizeExp −0.316 | 120 | 14.3 | 5.48 | 1.149 | 1.176 | 1.3 | 185 | 26% | 18.7 | 0.60 | -0.030 | -5 | 233 |
| 21 to 31.3 kg | default | 60 | 23.7 | 4.66 | 1.000 | 1.000 | 3.1 | 245 | 20% | 22.0 | 0.78 | -0.046 | -15 | 0 |
| 21 to 31.3 kg | gutSizeExp 0.75 | 60 | 23.7 | 4.47 | 0.958 | 1.000 | 3.6 | 242 | 11% | 22.3 | 0.74 | -0.031 | -2 | 0 |
| 21 to 31.3 kg | walkCostSizeExp −0.316 | 60 | 23.7 | 4.93 | 1.058 | 1.091 | 3.6 | 273 | 33% | 22.4 | 0.80 | -0.061 | -6 | 0 |
| 31.3 kg and over | default | 1140 | 34.9 | 4.09 | 1.000 | 1.000 | 2.3 | 250 | 7% | 20.3 | 0.66 | -0.008 | -2 | 0 |
| 31.3 kg and over | gutSizeExp 0.75 | 1140 | 34.9 | 4.08 | 0.997 | 1.000 | 2.4 | 245 | 5% | 20.0 | 0.65 | -0.005 | +1 | 0 |
| 31.3 kg and over | walkCostSizeExp −0.316 | 1140 | 34.9 | 4.07 | 0.995 | 1.000 | 2.4 | 241 | 4% | 20.0 | 0.65 | -0.005 | -2 | 0 |

**The registered directions (§7), read:**

- under 10 kg: at a full foregut 6% (default) → 1% (gutSizeExp 0.75); walking energy per kg and ground metre × 1.605 under walkCostSizeExp −0.316 (registered factor 1.588). Registered: the full-foregut share falls and the walking charge rises.
- 10 to 21 kg: at a full foregut 18% (default) → 5% (gutSizeExp 0.75); walking energy per kg and ground metre × 1.149 under walkCostSizeExp −0.316 (registered factor 1.176). Registered: the full-foregut share falls and the walking charge rises.
- 21 to 31.3 kg: at a full foregut 20% (default) → 11% (gutSizeExp 0.75); walking energy per kg and ground metre × 1.058 under walkCostSizeExp −0.316 (registered factor 1.091). Registered: the full-foregut share falls and the walking charge rises.
- 31.3 kg and over: at a full foregut 7% (default) → 5% (gutSizeExp 0.75); walking energy per kg and ground metre × 0.995 under walkCostSizeExp −0.316 (registered factor 1.000). Registered: the walking charge does not move (the full-foregut share may, the world having diverged).

## 8. For the integrator: the three-year arms (not run here)

Four parameter files on the working base (S39 with `pithFibreSwallowed` 0.5), each the base's file with the values named
and nothing else: `docs/staging/integrator-kit/params/Y3-W50-<name>.json`. The reference is the saved `Y3-W50` and
`Y3-W50-s1` (bench-y3, ff25953; both inputs at their defaults are hash-identical to that code on the pinned world, §6).

| arm | parameters beyond the base | offline, 16 kg: A − E on fruit / lean-season diet (today −14 / −79 kcal/d) | order |
| --- | --- | --- | --- |
| `Y3-W50-gut75` | `gutSizeExp` 0.75 | +124 / +47 | 1 |
| `Y3-W50-gut75-walk` | `gutSizeExp` 0.75, `walkCostSizeExp` −0.316 | +111 / +33 | 2 |
| `Y3-W50-gut875` | `gutSizeExp` 0.875 | +52 / −19 | 3 |
| `Y3-W50-walk` | `walkCostSizeExp` −0.316 | −28 / −93 | 4 |

From a frozen detached checkout of the merged head, with the worktree links of AGENTS.md (one command per arm; the label
and the file change):

```sh
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts plan --label Y3-W50-gut75 --seeds 48,7,21,5,11 --days 1095 --burn-in 30 --animal-days \
  --params-file docs/staging/integrator-kit/params/Y3-W50-gut75.json --out artifacts/validation/e/runs/Y3-W50-gut75
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts run artifacts/validation/e/runs/Y3-W50-gut75/run.json --budget-min 100 --parallel 1   # in the background; launch again until done
fnm exec --using=22.22.3 -- pnpm exec tsx scripts/e-run.ts status artifacts/validation/e/runs/Y3-W50-gut75/run.json
```

(The same with `Y3-W50-gut75-walk`, `Y3-W50-gut875`, `Y3-W50-walk`.) Cost, from `Y3-W50-wean`'s registry: 34 to 42
minutes a seed, about 3.1 job-hours an arm. Optional and not an arm: the base itself with the per-animal readout
(`--label Y3-W50-ad --params-file …/M6-W50.json`), since the saved reference has no per-animal rows; its class readouts
should equal the saved `Y3-W50`'s (`e-run.ts diff`). Without it the reference's deaths are read as the diagnosis read
them (T1, T2: inferred from survivor lists).

### 8.1 Readouts, fixed now (in this order; every number from the runs' JSON by a script)

1. **Starvation, by class and by whether the animal was weaned in the run.** Per seed. An animal is "weaned in the
   run" if it was unweaned on scored day 0 (the founders ids 22, 37, 21, 48, 20, 34, 18, 49) or born in the run, and
   its `weaned` flag is set on its last living row. A starvation death is read as `e1w/y3.py` reads it (last living row
   under a fifth of the store, mother alive) and must equal the run's own count by seed. Reference: 12 juvenile
   starvation deaths in the 10 seed-runs of the two base draws (7 and 5), all founders weaned in the run; 1 newborn.
2. **The weaned animals' reserves.** For every animal weaned in the run: day, age and mass at weaning; reserve ÷ store
   30, 90, 180 and 365 days later and at the end; its lowest value; days below −0.5. With them, in 90-day blocks after
   weaning: absorbed − spent, eating minutes, the share of eating ticks at a full foregut, the fallback's share of plant
   energy, km on the ground. Against the founder juveniles of 6 to 8 y of the same seed (as e1w §2.3 W3: never below
   −0.5; mean not below theirs by more than 0.1; eating minutes and full-foregut share not above theirs by more than a
   quarter).
3. **Their growth, against the targets already in `data/targets.json`.** Growth paid ÷ the potential after weaning; kg
   gained in the year after weaning; mass at 5 y by sex against T-INF-4 (the Gombe-derived mass for age; about 10 kg
   at 5 y, band 7 to 13 kg). Reported as a target. Registered now: an arm that feeds the weaned animal better will
   move mass at 5 y **further from** this band (toward the captive potential, 18 to 20 kg), not closer.
4. **Adults unchanged.** Adult males, females without infants, pregnant and nursing females, by run year: eating
   minutes, absorbed, spent, the share of daylight at a full foregut, the lowest 30-day mean reserve; adult starvation
   deaths; births per female-year; the nursing females' reserve trend. "Unchanged" = inside the spread of the base's
   two draws.
5. **The unweaned.** Animals of 2 to 5 y on milk have a smaller body too, so both inputs act on them: milk drunk per
   day by age, self-feeding minutes (T-INF-1), reserves; starvation deaths under 2 y.
6. **The rows that move.** `e-bench --compare` against `Y3-W50`: the fitted and the held-out sums (with and without
   the rare rows) with z by `e-noise.md` amendment 4 against the base's two draws; and every row whose band distance
   differs from both base draws by more than they differ from each other, listed with its values. Named in advance as
   likely: T-INF-1, T-INF-2, T-INF-4, T-INF-5, the juvenile rows of the activity budget, and the first-year mortality row T-DEM-1 only
   through illness (its noise is one death in about 25 births).
7. **Viability**: births, deaths by cause, living at the end, per seed.

The death count is read with the reserves and never alone: fewer deaths with the weaned cohort below −0.5 is "slower,
not viable", as the 0.25 wadging arm was (ey §4). No value of either input is adopted from any arm.

### 8.2 Predictions (before any run)

| arm | what I expect | confidence |
| --- | --- | --- |
| `Y3-W50-gut75` | No starvation among animals weaned in the run (0 in 5 seeds; at most 1). Their reserve never below −0.5; mean at the end between −0.05 and −0.2 (base: −0.47 among the survivors). After weaning they eat 300 to 450 minutes a day (base 290 to 635) with under 60% of eating ticks at a full foregut (base up to 91%). Growth paid above 35 of 42 kcal/d; mass at 5 y 18 to 20 kg, outside T-INF-4. Adults unchanged. | moderate to high (75%) for no starvation; moderate (60%) for the reserve range |
| `Y3-W50-gut75-walk` | As `gut75`, reserves lower by up to 0.05; still no starvation among the weaned. | moderate (65%) |
| `Y3-W50-gut875` | Between the base and `gut75`, like wadging at 0.25: 0 or 1 starvation death among the weaned in 5 seeds, but at least one of them below −0.5 at some point and a mean end reserve of −0.15 to −0.35: it loses in lean months and recovers after. | low to moderate (50% for 0 deaths; 60% for a trough below −0.5) |
| `Y3-W50-walk` | Not fewer juvenile starvation deaths than the base (5 or more in 5 seeds; base 7 and 5), and no later. The difference from the base stays inside the difference between its two draws. Adults unchanged. | moderate (65%) that it is not fewer; low that any difference can be told from noise |
| every arm | Adults' class readouts inside the base's spread; prescription count 42; the unweaned 2 to 5 y drink a little less milk under `gut75` (their own gut holds more), by under 30 kcal/d. | moderate; low for the milk |

What each outcome would say. `gut75` without starvation and with reserves above −0.5: the juvenile's viability in this
model depends on an unmeasured scaling, as S39's depended on wadging; it does not say the exponent is 0.75. `gut75`
with starvation: gut capacity within its cited bracket is not enough, and the offline ceiling (which gives the animal
no time to travel or wait) overstates what it can absorb. `gut875` with starvation and `gut75` without: the model needs
nearly the whole bracket, a weak position. `gut75-walk` with starvation where `gut75` has none: the result does not
survive the one sourced correction that goes against the animal.

## 9. Decisions for the user

1. **Run the arms?** Four arms, about 12 job-hours. `gut75` alone answers the main question (about 3 hours).
2. **The walking term's anchor.** Built at the adult female mass so that adults do not move (4.7 J per kg and metre at
   16 kg). The slope carried from sockol2007's mean animal (5.8 at 16 kg) would also charge every adult 14 to 23% more
   per metre. Keep the built anchor, ask for the other, or drop the two walking arms (offline effect −0.02 of R).
3. **If `gut75` holds:** whether a working value of `gutSizeExp` is declared for the engine comparisons, as 0.5 was for
   wadging, or the default stays 1 with the dependence stated. Nothing is adopted here.
4. **A measurement would replace the range.** chiversHladik1980's specimen table (a HAL copy a person can open in a
   browser; the bot check stops an agent), Müller et al. 2013 (gut-fill allometry with coefficients), Bruhn & Benedict
   1936 (resting rate of immature chimpanzees), any necropsy series of ape gut volume with body mass.
5. **Not proposed:** an arm on retention time (31.5 h lifts R by 0.09 for every size; its scaling with mass is
   unknown and it is not a small-body input), on the resting coefficient (× 0.96, every size) or on growth (below the
   registered threshold).

## Integrator: the three-year arms, logged before they run (7 October 2026, 20:46)
From a frozen detached checkout of the commit that holds this entry (`bench-e1x3`), with the parameter files and the
plan command of the section above (30 + 1,095 days, seeds 48, 7, 21, 5, 11, `--animal-days`), two simulation jobs at
a time. Order: `gut75` first (the registered main question), then `gut875`; `gut75-walk` and `walk` only if those two
leave a question the walking input can answer. Reference: Y3-W50 (`e-years-prereg.md` §7; 7 starvation deaths, all
juveniles weaned in the run). Readouts and predictions as registered above; no value is adopted from the result.

## 10. Result of the three-year arms, read by the registered readouts (8 October 2026, 00:24 EDT)

Run by the integrator as logged above: `Y3-W50-gut875` and `Y3-W50-gut75` (bench-e1x3, frozen at 7f6b197, clean; seeds
48, 7, 21, 5, 11; 30 + 1,095 days; `--animal-days`), against the saved `Y3-W50` and its second draw `Y3-W50-s1`
(bench-y3, ff25953; no per-animal rows). The walking arms were not run. Everything was read only; no simulation was run
for this section. Every number is printed by `scripts/e1x/y3.py` (§10.7); the prose quotes its tables X0 to X10.
Nothing was changed in response to the result. **No value of `gutSizeExp` is adopted, and none is proposed.**

### 10.1 The answer

**With gut capacity following mass^0.75 below the adult female mass, no weaned juvenile starved and the weaned cohort
stayed at its set point; at the midpoint of the range none starved either, but a fifth of them fell below half their
store.** The integrator's headline is confirmed from the JSON (X0): starvation deaths 7 (reference) and 6 (its second
draw), 2 at 0.875, 0 at 0.75; viability passes at 0.75 only.

- **Of the 24 animals whose weaning date falls in the run:** in the reference 7 are dead and the 17 alive end at −0.46
  of their store, 7 of them below −0.5 (second draw: 8 dead, −0.47, 8 below). At 0.875 none starved, 23 are alive at
  −0.15, 2 below −0.5 at the end, 5 below −0.5 at some point, and one died of illness at −0.53. At 0.75 none starved
  and the 19 alive end at −0.03 (lowest −0.07); one dipped to −0.51 for 11 days (X3).
- **The two starvation deaths at 0.875 are newborns, and neither is the small body's gut failing** (§10.3).
- **Adult males and females without infants are unchanged; nursing females are not.** Every animal under 31.3 kg has
  the larger gut, the unweaned included: at 1 to 5 y they drink 20 to 28 kcal a day less milk at 0.75, and their
  mothers spend 2% less (§10.2, readouts 4 and 5).
- **Growth moves further from the field target, as registered.** Mass at 5 y is 18.0 kg (females) and 19.6 kg (males)
  at 0.75 against a band of 7 to 13 kg.
- **The outbreak deaths at 0.75 are the draw** (§10.4): as many outbreaks as the reference had (5), no path in the
  code from the input to who dies of one, and victims at their set point.

What this shows and does not show is §10.6. It is the wadging result over again: the model's weaned juvenile lives or
starves by an input nobody has measured.

### 10.2 The registered readouts (§8.1), in order

1. **Starvation by class and by weaning (X1).** Reference: 7 juveniles, all weaned in the run (second draw: 5
   juveniles and 1 newborn). 0.875: 2, both unweaned newborns, none weaned. 0.75: 0. **The registered reading did not
   equal the run's count at 0.875** (1 against 2): I registered "last living row under a fifth of the store", and one
   of the two newborns died at −0.59. The run books as starvation any death by the background hazard while condition
   is below `condLow` (reserve below −0.57), not only an empty store; X1 counts by that line and then agrees in every
   seed. My reading rule was too narrow; the run's count stands.
2. **The weaned animals' reserves (X3, X4).** At 0.75: reserve −0.03 to −0.07 in every block after weaning, and in the
   first two years 262 to 282 eating minutes a day with 20 to 31% of eating ticks at a full foregut, against 245 minutes and 29% for the founder
   juveniles of 6 to 8 y. At 0.875: −0.10 to −0.19 in the first year (−0.28 for the two followed past two years), 319
   to 359 minutes, 49 to 59% at a full foregut, against 264 and 38%. By the registered comparison (never below −0.5,
   reserve within 0.1 of the founder juveniles', eating and full-foregut share within a quarter) 6 of the 7 animals
   followed a year pass at 0.75 and 6 of 10 at 0.875. The reference's weaned animals ate 290 to 635 minutes with up
   to 91% at a full foregut (T4).
3. **Growth (X5).** Mass at 5 y: 17.9 and 19.4 kg (0.875), 18.0 and 19.6 kg (0.75), females and males; T-INF-4's band
   is 7 to 13 kg. In the year after weaning they gain 3.2 kg (females) and 3.4 to 3.7 kg (males) of a potential of 3.4
   and 3.8. The share of the potential paid at 5 to 8 y rises from 0.78 and 0.59 (reference, females and males) to
   0.90 and 0.83 at 0.875 and 0.94 and 0.92 at 0.75. The reference's slower juvenile growth was nearer the wild
   figure only because its juveniles were starving.
4. **Adults (X6).** By the rule I registered ("inside the spread of the base's two draws") about half the cells are
   outside in both arms (28 and 32 of 57), because the two reference draws lie within a few kcal of each other; the
   rule says nothing at that resolution, and the sizes are what can be read. Adult males: within 0.4% on every
   readout. Females without infants: within 0.3% on energy and 3% on eating minutes. Pregnant females: within 1% on
   energy, eating minutes up to 4.5% higher. **Nursing females change with the input:** at 0.75 they eat 6.7% fewer
   minutes, absorb and spend 2% less, have a full foregut in 5 points less of the day and their lowest reserve is
   0.03 higher (0.875: −2.9%, −1.2%, −2.2 points, +0.02). No adult starved in any run. Adult deaths 5 and 19
   (reference draws), 7 and 23 (arms) follow the outbreaks.
5. **The unweaned (X7).** Under 1 y: unchanged (milk 204 and 272 kcal/d in every run). From 1 to 5 y milk falls with
   the input: 281, 272, 257 and 241 kcal/d at 1–2, 2–3, 3–4 and 4–5 y in the reference; 254, 245, 231 and 219 at 0.75;
   263, 259, 241 and 225 at 0.875. Their reserves are higher by 0.02 to 0.04 and their eating minutes about the same.
   Deaths under 2 y booked as starvation: 0, 1, 2, 0.
6. **The rows that move (X8).** For information only: the reference is on the protocol before the freeze of 7
   October (five revised rows left out) and has two draws. Fitted sum: 4.42 and 4.13 (reference draws), 4.33 at 0.875
   (z +0.2), **3.40 at 0.75 (z −2.4, past the rule, toward the field)**; held-out: z +0.2 and 0.0; without the rare
   rows +0.7 and −0.6. By the registered row rule 11 rows move at 0.875 (9 closer to their band, 2 further) and 17 at
   0.75 (12 closer, 5 further), most by a few hundredths. The ones of a size worth naming: first-year mortality
   T-DEM-1 (0.25 and 0.22 → 0.17 and 0.20; closer), fallback switching T-FOOD-3 (0.24 → 0.25 and 0.28, band ≥ 0.3;
   closer), nursing females' day range relative to males T-RNG-5 (1.04 → 1.01 and 0.99, band 0.3–0.75; closer),
   intergroup encounters T-IGE-1 (20 → 20.5 and 18.5, band 5–12), grooming reciprocity T-SOC-3 (closer at 0.875,
   further at 0.75), and the two outbreak rows T-DEM-5 and T-DEM-8 (the draw). The fitted z at 0.75 is carried by
   T-DEM-1 and T-IGE-1, both demographic counts with large chance spread; I would not read it as the input improving
   the fit without a second draw of the arm. Verdicts with a "pass" involved change in four rows: three lose it, one gains it.
7. **Viability (X0).** Births 71 and 66 (reference draws), 69, 65. Living at the end 53 to 59, 51 to 56, 54 to 62, 51
   to 54. Prescription count 42 everywhere.

### 10.3 The two infant deaths at 0.875 (X2)

- **Seed 48, id 62, a female born on scored day 948 (2 June of year 3), dead at 21 days.** Her mother (id 11, 38 y)
  was pregnant through the leanest stretch of that seed's three years and stood at −0.55 of her own store in the 30
  days before the birth (lowest −0.63), eating 615 minutes a day with 89% of her eating ticks at a full foregut and
  59% of her plant energy from fallback. The newborn got no milk for 7 days: under `weanDeficit` a mother lets an
  infant suckle only when its relative deficit is at least her own (`src/sim/execution.ts`:917, 930, 1009), so a newborn of a
  mother at −0.59 is refused until it has fallen to −0.59 itself, and is then held there, below the condition line,
  where the background hazard is raised and the death is booked as starvation. It died at −0.59. This is an adult's
  lean-season depletion passed to her newborn by the mother's decision rule. The adult's gut is untouched by the
  input: under 0.75 the same female, not pregnant, stood at −0.29 on the same days with 86% at a full foregut.
- **Seed 11, id 55, a male born on day 301, dead at 0.46 y at an empty store.** His mother (id 31) was at her set
  point (−0.02). He shared her gland with a sibling of 3.9 y still on milk until its date on day 507: he drank 159
  kcal a day and the sibling 148. This is the second dependent at one gland that E1w found (e1w §8: the gland's
  ceiling is one number for one or two offspring and nothing ranks them). Of the 9 newborns born into that state at
  0.875 one starved; of the 8 at 0.75 none starved and one ends below −0.5.
- Neither is a weaned animal and neither death is the input failing. Both are defects already recorded (the adult
  females' lean season, E1r; two dependents at one gland, E1w). Whether the input makes either more or less likely
  cannot be read from 2 deaths against 1 in the ten seed-runs of the reference draws.

### 10.4 The two questions the integrator asked to be judged

**(1) Is the higher outbreak mortality at 0.75 connected to the input? No path in the code, and the numbers are those
of a draw. Confidence: high that it is not through body condition; moderate to high (about 80%) that it is the draw
altogether.**
- *The code.* An outbreak arrives by a daily random draw per community that reads nothing but whether one is already
  running (`src/sim/disease.ts`:17–37). A case ends in death with odds set by age and by one draw of virulence per
  outbreak (:74); **nothing there reads reserves, condition or body mass.** The only step that reads the animals'
  behaviour is transmission, inside parties (:46–58). Body condition does feed the *background* hazard
  (`src/sim/life.ts`:233, through health), and there the input can only lower it.
- *Arrivals.* 0.75 had 5 outbreaks, the reference 5, the expectation 4.5 (X9). 0.875 had 1 (chance of 1 or fewer:
  0.06), which is why it has no outbreak deaths: it is the low draw, 0.75 is not a high one.
- *Deaths per outbreak.* 3.6 at 0.75. The five three-year runs without the input give 1.4, 4.7, 2.8, 2.0 and 3.5, and
  2 to 14 deaths a run; the reference's second draw has 14. For the five outbreaks of 0.75, the registry's own odds by
  age for the communities as they stood the day before, at a virulence of 1 with every member infected, give 14.5
  deaths; 18 died. So 0.75 is at what the mechanism expects, and the reference (7 from 5 outbreaks) is the run below
  it.
- *Exposure.* Attack rates are 0.87 to 1.00 in every run that has one (0.99 at 0.75); mean party size 4.20 to 4.33 in
  all seven runs (4.29 at 0.75); the communities struck had 12 to 24 members, as founded or little more. More animals
  alive is not it: the juveniles the input saves are 7 in 245.
- *Condition.* The 18 victims stood at −0.01 to −0.04 of their store on their last day (lowest −0.06).
- *What it costs the reading.* The outbreaks are why 0.75 has the most deaths (47), the fewest births (65: six nursing
  females died in them) and the smallest communities at the end, and why its viability ratio is the lowest of the
  four runs although nothing starved. One draw per arm cannot separate that from the input; a second draw of the arm
  (`rngSalt` 1) would.

**(2) Does a gut that is larger for its mass change anything for the wrong reason? Not in how much the juveniles eat;
yes in two side effects that the weaned juvenile's budget did not ask for.**
- *They do not out-eat the adults beyond their own demand (X10).* A weaned animal under 21 kg eats 24.5 g of dry
  matter per kg a day at 0.75 against an adult female's 19.9 (1.23 of hers per kg, 1.08 per kg^0.75), absorbs 1.12 of
  her energy per kg^0.75 and spends 1.12: the excess is its growth and its walking, and it is spent. The ratio is the
  same at 0.875 (1.23, 1.08, absorbing 1.10 and spending 1.11). For the whole juvenile class dry matter per kg^0.75 is
  49.1 and 49.0 in the reference draws and 49.3 in both arms. **The larger gut does not raise what a juvenile eats; it
  lets it eat the same in less time:** 301 and 294 eating minutes in the reference, 261 at 0.875, 242 at 0.75; daylight
  at a full foregut 24%, 17%, 12%.
- *No surplus is stored.* Reserves are above the set point on 5% of a weaned animal's days at 0.75 and never by more
  than 0.02 of the store; growth is capped at the potential by construction.
- *Side effect 1: growth.* Fed animals grow at the captive potential, so mass at 5 y sits at 18 to 20 kg against 7 to
  13. The input did not cause this (the potential and the milk before weaning do: 17.9 against 18.0 kg between the
  arms), but it removes the shortfall that was hiding it after weaning.
- *Side effect 2: the unweaned and their mothers.* The scaling applies to every body under 31.3 kg. Infants of 1 to
  5 y drink 20 to 28 kcal a day less milk at 0.75 and their mothers spend 2% less. That is a change in lactation the
  registration predicted only as "a little less milk" and it is not what the input was built to test. It also bears
  on E1w's finding that nothing ends milk: with a larger gut milk still runs at 219 kcal/d at 4 to 5 y.
- *Not checked, because no target exists:* whether 24.5 g of dry matter per kg a day is a plausible intake for a
  juvenile chimpanzee. research.md holds no intake per kg for an immature ape.

### 10.5 The registered predictions (§8.2) against the result

| arm | prediction | result | held? |
| --- | --- | --- | --- |
| `gut75` | no starvation among animals weaned in the run (0 in 5 seeds; at most 1) | 0 of 21 | **yes** |
| `gut75` | their reserve never below −0.5 | one animal at −0.51 for 11 days; the other 20 never below −0.23 | **no**, narrowly |
| `gut75` | mean reserve at the end −0.05 to −0.2 | −0.03 | **no**: better than the range |
| `gut75` | 300 to 450 eating minutes after weaning | 262 to 282 | **no**: fewer |
| `gut75` | under 60% of eating ticks at a full foregut | 20 to 31% | yes |
| `gut75` | growth paid above 35 of 42 kcal/d; mass at 5 y 18 to 20 kg, outside T-INF-4 | 0.93 to 0.97 of the potential; 18.0 and 19.6 kg | yes |
| `gut75` | adults unchanged | males and females without infants yes (under 0.5% on energy); nursing females spend 2% less | **partly** |
| `gut875` | 0 or 1 starvation death among the weaned | 0 of 24 | yes |
| `gut875` | at least one below −0.5 at some point | 5 of 24 (lowest −0.77) | yes |
| `gut875` | mean end reserve −0.15 to −0.35 | −0.15 | yes, at the edge |
| `gut875` | loses in lean months and recovers after | seed 48's three: lowest −0.70, −0.52, −0.77, ending −0.32, −0.18, −0.51 | yes |
| every arm | adults inside the base's spread | not by the registered rule (it cannot resolve this); by size as above | **the rule failed** |
| every arm | prescription count 42 | 42 | yes |
| every arm | the unweaned 2 to 5 y drink under 30 kcal/d less milk at 0.75 | 20 to 28 less, and from 1 y, not 2 | yes; the age was wrong |
| rows | likely to move: T-INF-1, -2, -4, -5, juvenile activity rows, T-DEM-1 | only T-DEM-1 moved; T-INF-5 fell 1.26 → 1.18 inside its band; T-INF-1 reads 0 in every run and T-INF-4 is not scorable | **no**, 1 of 6 |
| `gut75-walk`, `walk` | — | not run | — |

Not predicted at all: the newborn deaths at 0.875 (I named deaths under 2 y as a readout, not as an expectation), the
fitted sum moving past the noise rule at 0.75, and the size of the outbreak toll.

### 10.6 What the result shows and does not show

**Shows.**
- The weaned juvenile's starvation in this model turns on one unmeasured scaling rule. With the adult's gut volume
  per kg (today) 7 of 24 die and the survivors sit at half their store; with capacity following mass^0.75 none dies
  and they sit at the set point; halfway, none dies and a fifth of them go below half their store.
- The offline ceiling of §5 predicted the order and roughly the size: +47 kcal a day spare on the lean diet at 0.75
  and 19 short at 0.875.
- Most of the cited bracket is needed. The midpoint is not comfortable: 5 of 24 below −0.5, 2 still there at the end,
  one dead of illness at −0.53, 0.04 above the line where the run would have called it starvation.

**Does not show.**
- That a growing chimpanzee's gut scales as mass^0.75, or as anything. Both ends of the range are comparisons between
  species; within a species nothing is measured. The run says what the model needs, not what the animal has.
- That the model is viable at 0.75. One draw; 0 starved of 21 still allows a risk of up to 13% an animal (X3); two thirds of
  the cohort was followed for under a year after weaning, and the reference's deaths took 194 to 670 days.
- That anything else is repaired. A pregnant female fell to −0.55 in a lean season and a second dependent at one
  gland still starves a newborn; mass at 5 y is further from its target; milk still runs to the weaning date.
- Anything about the cost of walking: those two arms were not run, so the one sourced correction that goes against
  the animal is untested. Offline it takes 0.015 of R at 16 kg, about a tenth of what the gut exponent gives.
- That the fit to the field improved. The fitted sum at 0.75 is past the noise rule on rows that count deaths and
  encounters, against a reference of two draws on an older protocol.

**What the sources would have to say to narrow the range** (none is in research.md; each is named there as missing):
- Gut volume or digesta mass against body mass **within a species**, across ages: any ape necropsy series with
  masses, or a simple-gutted analogue with a growth series. One immature chimpanzee with a known mass would already
  say which half of the bracket it is in.
- chiversHladik1980's specimen table: the mass of the one chimpanzee the registry's 83 mL/kg rests on, and whether its
  117 primates include immatures.
- The coefficients of the dry-matter gut-fill allometry (Müller et al. 2013; clauss2013's Fig. 6): the review says
  only "slightly lower" than 1.0. A fitted exponent with its interval would replace 0.75 to 1 by a narrower bracket
  between species, still not within one.
- A voluntary dry-matter intake per kg of immature against adult chimpanzees on one diet (captive feeding records).
  The model at 0.75 says 1.23 of an adult female's per kg (X10); that is a number a record could contradict.
- Wild body mass at weaning (pusey2005's curves), since the body tested here is the captive potential's 15 to 20 kg
  and a wild 10 kg animal has a smaller gut for its need under every exponent below 1.

### 10.7 Limits

- One draw of each arm. The reference has two; they differ by 7 and 5 juvenile starvation deaths and by 7 and 14
  outbreak deaths.
- The reference runs are at an earlier commit and protocol and have no per-animal rows: for them the weaned animals'
  fate is read from the survivors' list and the class counts, and five revised rows are left out of X8.
- The per-animal rows carry no cause of death. Outbreak deaths are found as two or more deaths in a community within
  four days; they equal the run's count in every seed (X9). The newborn deaths are matched to the run's starvation
  count by the condition line (X1).
- The arms differ from the reference in every random draw after the first tick in which the input acts, so any
  rare-event count (outbreaks, killings, births) differs by chance as well.
- Final checks after merging track-e (bbd8b3e) into this branch, 8 October 2026: `tsc --noEmit` clean; the full suite run once at four files at a time with no other heavy process on the machine: 1,092 tests, 1,092 pass, 0 fail, 0 skipped.
- Tables from the saved runs:

```sh
B=/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees
/usr/bin/python3 scripts/e1x/y3.py --arms $B/bench-e1x3/artifacts/validation/e/runs --base $B/bench-y3/artifacts/validation/e/runs --wean $B/bench-wean/artifacts/validation/e/runs
```

#### E1x, the three-year arms: Y3-W50-gut875 and Y3-W50-gut75 against Y3-W50 and its second draw Y3-W50-s1

Printed by `scripts/e1x/y3.py` from the arms' per-animal rows (one row per living animal and scored day; seeds 48, 7, 21, 5, 11) and from every run's bench and merged energy readouts. The reference runs have no per-animal rows. Scored day 0 is 28 October of run year 1 (after the 30-day burn-in); ages in years; kcal per animal-day; reserve = reserves ÷ store (0 the set point, −1 death).

#### X0. The runs and the headline, checked

| | Y3-W50 (reference) | Y3-W50-s1 (reference, second draw) | Y3-W50-gut875 (gutSizeExp 0.875) | Y3-W50-gut75 (gutSizeExp 0.75) |
| --- | --- | --- | --- | --- |
| commit, dirty, protocol | ff25953, 0, 5d4fa5a2 | ff25953, 0, 5d4fa5a2 | 7f6b197, 0, 215ed6ab | 7f6b197, 0, 215ed6ab |
| parameters beyond the working base | {} | {"rngSalt": 1} | {"gutSizeExp": 0.875} | {"gutSizeExp": 0.75} |
| viability | FAIL: 7 starvation deaths | FAIL: 6 starvation deaths | FAIL: 2 starvation deaths | pass |
| starvation deaths (by class) | 7 (juvenile 5–12 y 7) | 6 (infant < 0.5 y 1, juvenile 5–12 y 5) | 2 (infant < 0.5 y 2) | 0 (—) |
| starvation deaths by seed | 3 / 1 / 2 / 0 / 1 | 3 / 0 / 1 / 1 / 1 | 1 / 0 / 0 / 0 / 1 | 0 / 0 / 0 / 0 / 0 |
| births | 71 (12 / 13 / 17 / 15 / 14) | 66 (12 / 12 / 13 / 14 / 15) | 69 (14 / 14 / 12 / 15 / 14) | 65 (12 / 13 / 12 / 13 / 15) |
| deaths, all causes | 34 (6 / 9 / 9 / 5 / 5) | 42 (5 / 9 / 7 / 8 / 13) | 23 (1 / 8 / 4 / 3 / 7) | 47 (7 / 11 / 9 / 10 / 10) |
| of them: respiratory outbreak | 7 (0 / 4 / 0 / 2 / 1) | 14 (0 / 2 / 2 / 5 / 5) | 0 (0 / 0 / 0 / 0 / 0) | 18 (2 / 7 / 0 / 6 / 3) |
| of them: illness (the background hazard) | 17 | 15 | 14 | 21 |
| living, start → end, by seed | 49→55 / 49→53 / 49→57 / 49→59 / 49→58 | 49→56 / 49→52 / 49→55 / 49→55 / 49→51 | 49→62 / 48→54 / 49→57 / 49→61 / 49→56 | 49→54 / 49→51 / 49→52 / 49→52 / 49→54 |
| lowest daily mean reserve, juvenile 5–12 y | −0.24 | −0.21 | −0.12 | −0.09 |
| target rows with the verdict "pass" (of 150) | 41 | 43 | 41 | 39 |
| prescription count | 42 | 42 | 42 | 42 |

- The arms ran at one commit and protocol; the reference runs at an earlier commit and the protocol before the freeze of 7 October, which revised the observer of five rows (T-LET-1, T-LET-2, T-LET-3, T-LET-6, T-DEM-9) and changed no band. Those five rows are left out of every comparison below.

#### X1. Starvation by class and by whether the animal was weaned in the run

"Weaned in the run" = unweaned on scored day 0 or born in the run, with the weaned flag set on its last living row. Registered reading of a starvation death (§8.1): last living row under a fifth of the store (reserve ≤ −0.8), mother alive or the animal weaned. The run itself books as starvation any death at an empty store or by the background hazard while condition is below `condLow` (reserve below −0.57; `src/sim/life.ts` slowLife), so the second column counts dead animals whose last living row is below that line.

| run | seed | starvation deaths the run books | registered reading (≤ −0.8) | dead below the condition line | who |
| --- | --- | ---: | ---: | ---: | --- |
| gutSizeExp 0.875 | 48 | 1 | 0 | 1 | id 62 (F, 0.06 y, 1.9 kg, unweaned, born in the run, last reserve −0.59, died day 969) |
| gutSizeExp 0.875 | 7 | 0 | 0 | 0 | — |
| gutSizeExp 0.875 | 21 | 0 | 0 | 0 | — |
| gutSizeExp 0.875 | 5 | 0 | 0 | 0 | — |
| gutSizeExp 0.875 | 11 | 1 | 1 | 1 | id 55 (M, 0.46 y, 2.5 kg, unweaned, born in the run, last reserve −1.00, died day 469) |
| gutSizeExp 0.75 | 48 | 0 | 0 | 0 | — |
| gutSizeExp 0.75 | 7 | 0 | 0 | 0 | — |
| gutSizeExp 0.75 | 21 | 0 | 0 | 0 | — |
| gutSizeExp 0.75 | 5 | 0 | 0 | 0 | — |
| gutSizeExp 0.75 | 11 | 0 | 0 | 0 | — |
- gutSizeExp 0.875: the run books 2; the registered reading finds 1; 2 dead below the condition line, of them weaned 0 (weaned in the run 0), unweaned 2.
- gutSizeExp 0.75: the run books 0; the registered reading finds 0; 0 dead below the condition line, of them weaned 0 (weaned in the run 0), unweaned 0.
- Reference (no per-animal rows): 7 and 6 starvation deaths, classes {"juvenile 5–12 y": 7} and {"juvenile 5–12 y": 5, "infant < 0.5 y": 1}; the diagnosis read all 12 juvenile deaths of the two draws as founders weaned in the run (ey-juvenile-starvation.md T1).

#### X2. The animals born in the run, and the two infant deaths at 0.875

"An older sibling still nursing" = at the birth the mother had another unweaned offspring that drank milk in the following 30 days (as e1w-prereg.md Y2).

| run | newborns | born | dead below the condition line | died otherwise | alive at the end | of those, below −0.5 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| gutSizeExp 0.875 | no older sibling nursing | 60 | 1 | 9 | 50 | 0 |
| gutSizeExp 0.875 | an older sibling still nursing | 9 | 1 | 1 | 7 | 0 |
| gutSizeExp 0.75 | no older sibling nursing | 57 | 0 | 11 | 46 | 0 |
| gutSizeExp 0.75 | an older sibling still nursing | 8 | 0 | 3 | 5 | 1 |

**The deaths below the condition line, traced** (every one in the two arms):

| run | seed | animal | born (date) | died (age) | last reserve | days without milk at the start | milk it drank, kcal/d | mother: reserve in the 30 days before the birth (lowest) | mother then: eating min, at a full foregut, fallback share | older sibling at the birth: age, weaned on day, its milk over the newborn's life |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| gutSizeExp 0.875 | 48 | id 62 (F), mother id 11 | day 948 (Jun 2, year 3) | day 969 (0.06 y) | −0.59 | 7 | 101 | −0.55 (−0.63) | 615, 89%, 59% | id 21: 5.18 y, weaned on day 749, 0 kcal/d |
| gutSizeExp 0.875 | 11 | id 55 (M), mother id 31 | day 301 (Aug 25, year 1) | day 469 (0.46 y) | −1.00 | 0 | 159 | −0.02 (−0.03) | 280, 4%, 4% | id 37: 3.91 y, weaned on day 507, 148 kcal/d |
- Mother id 11 of seed 48 on scored days 918 to 947 under gutSizeExp 0.875: reserve −0.55 (lowest −0.63), 615 eating minutes, 89% at a full foregut, fallback 59% of plant energy; pregnant.
- Mother id 11 of seed 48 on scored days 918 to 947 under gutSizeExp 0.75: reserve −0.29 (lowest −0.31), 573 eating minutes, 86% at a full foregut, fallback 65% of plant energy; neither pregnant nor nursing.
- Mother id 31 of seed 11 on scored days 271 to 300 under gutSizeExp 0.875: reserve −0.02 (lowest −0.03), 280 eating minutes, 4% at a full foregut, fallback 4% of plant energy; pregnant.
- Mother id 31 of seed 11 on scored days 271 to 300 under gutSizeExp 0.75: reserve −0.02 (lowest −0.02), 272 eating minutes, 3% at a full foregut, fallback 4% of plant energy; pregnant.

#### X3. Every animal weaned in the run: reserve from the day of weaning

**gutSizeExp 0.875.**

| seed | animal | weaned on day (age, kg) | reserve at weaning | +30 d | +90 d | +180 d | +365 d | at the end | lowest | days below −0.5 | days followed | fate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| 48 | id 22 (F) | 222 (4.19 y, 15.3 kg) | −0.05 | −0.06 | −0.06 | −0.03 | −0.06 | −0.32 | −0.70 | 120 | 873 | alive |
| 48 | id 37 (M) | 411 (4.21 y, 16.7 kg) | −0.02 | −0.03 | −0.07 | −0.03 | −0.04 | −0.18 | −0.52 | 24 | 684 | alive |
| 48 | id 21 (M) | 749 (4.64 y, 18.2 kg) | −0.05 | −0.07 | −0.15 | −0.61 | — | −0.51 | −0.77 | 193 | 346 | alive |
| 48 | id 48 (F) | 969 (4.74 y, 16.8 kg) | −0.41 | −0.34 | −0.17 | — | — | −0.06 | −0.41 | 0 | 126 | alive |
| 7 | id 37 (M) | 497 (4.45 y, 17.6 kg) | −0.09 | −0.14 | −0.04 | −0.09 | −0.16 | −0.11 | −0.21 | 0 | 598 | alive |
| 7 | id 22 (F) | 533 (5.04 y, 18.0 kg) | −0.03 | −0.02 | −0.04 | −0.04 | −0.22 | −0.08 | −0.23 | 0 | 562 | alive |
| 7 | id 21 (M) | 661 (4.39 y, 17.3 kg) | −0.04 | −0.08 | −0.07 | −0.20 | −0.39 | −0.34 | −0.45 | 0 | 434 | alive |
| 7 | id 48 (F) | 820 (4.33 y, 15.8 kg) | −0.03 | −0.08 | −0.12 | −0.06 | — | −0.02 | −0.17 | 0 | 275 | alive |
| 7 | id 20 (M) | 884 (4.31 y, 16.8 kg) | −0.25 | −0.27 | −0.26 | −0.52 | — | −0.51 | −0.53 | 47 | 211 | alive |
| 21 | id 22 (F) | 383 (4.63 y, 16.8 kg) | −0.02 | −0.02 | −0.16 | −0.47 | — | −0.53 | −0.60 | 153 | 346 | died on day 729 of another cause (reserve −0.53) |
| 21 | id 37 (M) | 480 (4.40 y, 17.4 kg) | −0.06 | −0.15 | −0.34 | −0.34 | −0.05 | −0.03 | −0.38 | 0 | 615 | alive |
| 21 | id 21 (M) | 843 (4.89 y, 19.0 kg) | −0.05 | −0.12 | −0.22 | −0.06 | — | −0.10 | −0.23 | 0 | 252 | alive |
| 21 | id 20 (M) | 866 (4.26 y, 16.7 kg) | −0.05 | −0.07 | −0.20 | −0.13 | — | −0.17 | −0.21 | 0 | 229 | alive |
| 21 | id 48 (F) | 994 (4.81 y, 17.3 kg) | −0.02 | −0.05 | −0.05 | — | — | −0.03 | −0.07 | 0 | 101 | alive |
| 5 | id 22 (F) | 463 (4.85 y, 17.4 kg) | −0.16 | −0.24 | −0.23 | −0.05 | −0.08 | −0.16 | −0.32 | 0 | 632 | alive |
| 5 | id 37 (M) | 542 (4.57 y, 18.0 kg) | −0.05 | −0.03 | −0.05 | −0.03 | −0.15 | −0.10 | −0.22 | 0 | 553 | alive |
| 5 | id 21 (M) | 743 (4.62 y, 18.2 kg) | −0.06 | −0.07 | −0.13 | −0.30 | — | −0.29 | −0.40 | 0 | 352 | alive |
| 5 | id 20 (M) | 915 (4.39 y, 17.1 kg) | −0.05 | −0.06 | −0.12 | — | — | −0.24 | −0.29 | 0 | 180 | alive |
| 5 | id 48 (F) | 963 (4.72 y, 17.1 kg) | −0.02 | −0.06 | −0.17 | — | — | −0.07 | −0.19 | 0 | 132 | alive |
| 11 | id 22 (F) | 215 (4.17 y, 15.3 kg) | −0.02 | −0.03 | −0.05 | −0.06 | −0.02 | −0.03 | −0.15 | 0 | 880 | alive |
| 11 | id 37 (M) | 507 (4.47 y, 17.7 kg) | −0.02 | −0.05 | −0.04 | −0.07 | −0.12 | −0.02 | −0.13 | 0 | 588 | alive |
| 11 | id 21 (M) | 926 (5.12 y, 20.0 kg) | −0.01 | −0.04 | −0.05 | — | — | −0.03 | −0.10 | 0 | 169 | alive |
| 11 | id 48 (F) | 939 (4.66 y, 16.8 kg) | −0.03 | −0.01 | −0.02 | — | — | −0.02 | −0.04 | 0 | 156 | alive |
| 11 | id 20 (M) | 946 (4.47 y, 17.5 kg) | −0.02 | −0.04 | −0.11 | — | — | −0.06 | −0.14 | 0 | 149 | alive |

**gutSizeExp 0.75.**

| seed | animal | weaned on day (age, kg) | reserve at weaning | +30 d | +90 d | +180 d | +365 d | at the end | lowest | days below −0.5 | days followed | fate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| 48 | id 22 (F) | 222 (4.19 y, 15.3 kg) | −0.03 | −0.03 | −0.03 | −0.02 | — | −0.01 | −0.07 | 0 | 286 | died on day 508 of another cause (reserve −0.01) |
| 48 | id 37 (M) | 411 (4.21 y, 16.7 kg) | −0.01 | −0.01 | −0.03 | −0.01 | −0.02 | −0.02 | −0.23 | 0 | 684 | alive |
| 48 | id 21 (M) | 749 (4.64 y, 18.2 kg) | −0.02 | −0.03 | −0.10 | −0.43 | — | −0.06 | −0.51 | 11 | 346 | alive |
| 48 | id 48 (F) | 969 (4.74 y, 17.1 kg) | −0.10 | −0.02 | −0.02 | — | — | −0.02 | −0.10 | 0 | 126 | alive |
| 7 | id 37 (M) | 497 (4.45 y, 17.5 kg) | −0.08 | −0.04 | −0.01 | −0.03 | −0.10 | −0.03 | −0.14 | 0 | 598 | alive |
| 7 | id 48 (F) | 820 (4.33 y, 15.8 kg) | −0.02 | −0.03 | −0.00 | +0.02 | — | +0.01 | −0.05 | 0 | 275 | alive |
| 7 | id 20 (M) | 884 (4.31 y, 17.0 kg) | −0.12 | −0.03 | −0.02 | −0.11 | — | −0.04 | −0.15 | 0 | 211 | alive |
| 21 | id 22 (F) | 383 (4.63 y, 16.9 kg) | −0.02 | +0.01 | −0.03 | −0.18 | −0.02 | −0.02 | −0.23 | 0 | 712 | alive |
| 21 | id 37 (M) | 480 (4.40 y, 17.4 kg) | −0.07 | −0.09 | −0.13 | −0.01 | — | −0.04 | −0.16 | 0 | 316 | died on day 796 of another cause (reserve −0.04) |
| 21 | id 21 (M) | 843 (4.89 y, 19.1 kg) | −0.05 | −0.05 | −0.07 | −0.03 | — | −0.03 | −0.10 | 0 | 252 | alive |
| 21 | id 20 (M) | 866 (4.26 y, 16.7 kg) | −0.05 | −0.04 | −0.07 | −0.04 | — | −0.02 | −0.09 | 0 | 229 | alive |
| 5 | id 22 (F) | 463 (4.85 y, 17.6 kg) | −0.04 | −0.12 | −0.04 | −0.06 | −0.04 | −0.02 | −0.19 | 0 | 632 | alive |
| 5 | id 37 (M) | 542 (4.57 y, 18.0 kg) | −0.01 | −0.02 | −0.03 | −0.01 | −0.03 | −0.01 | −0.13 | 0 | 553 | alive |
| 5 | id 21 (M) | 743 (4.62 y, 18.2 kg) | −0.02 | −0.03 | −0.07 | −0.11 | — | −0.05 | −0.23 | 0 | 352 | alive |
| 5 | id 20 (M) | 915 (4.39 y, 17.2 kg) | −0.02 | −0.03 | −0.08 | — | — | −0.07 | −0.22 | 0 | 180 | alive |
| 5 | id 48 (F) | 963 (4.72 y, 17.1 kg) | −0.02 | −0.03 | −0.09 | — | — | −0.04 | −0.11 | 0 | 132 | alive |
| 11 | id 22 (F) | 215 (4.17 y, 15.3 kg) | −0.02 | −0.04 | −0.01 | −0.02 | −0.00 | −0.04 | −0.10 | 0 | 880 | alive |
| 11 | id 37 (M) | 507 (4.47 y, 17.7 kg) | −0.03 | −0.02 | −0.01 | −0.03 | −0.06 | −0.01 | −0.07 | 0 | 588 | alive |
| 11 | id 21 (M) | 926 (5.12 y, 20.0 kg) | −0.04 | −0.03 | −0.04 | — | — | −0.04 | −0.05 | 0 | 169 | alive |
| 11 | id 48 (F) | 939 (4.66 y, 16.9 kg) | −0.02 | −0.01 | +0.02 | — | — | +0.01 | −0.03 | 0 | 156 | alive |
| 11 | id 20 (M) | 946 (4.47 y, 17.6 kg) | −0.02 | −0.03 | −0.07 | — | — | −0.03 | −0.07 | 0 | 149 | alive |

| run | animals weaned in the run | dead below the condition line | died of another cause | alive at the end | their end reserve: mean (lowest) | alive below −0.5 at the end | ever below −0.5 | ever below −0.3 |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| reference (the 24 animals whose weaning date falls in the run; its saved readout lists the survivors) | 24 | not readable per animal (the run books 7 juvenile starvation deaths) | 7 dead in all | 17 | −0.46 (−0.91) | 7 | — | — |
| reference, second draw (the 24 animals whose weaning date falls in the run; its saved readout lists the survivors) | 24 | not readable per animal (the run books 5 juvenile starvation deaths) | 8 dead in all | 16 | −0.47 (−0.90) | 8 | — | — |
| gutSizeExp 0.875 | 24 | 0 | 1 | 23 | −0.15 (−0.51) | 2 | 5 | 10 |
| gutSizeExp 0.75 | 21 | 0 | 2 | 19 | −0.03 (−0.07) | 0 | 1 | 1 |
- gutSizeExp 0.875: 0 of 24 weaned animals starved; if each ran the same risk independently, a risk of up to 12% per animal over the days followed would still give 0 with a chance of 5% (1 − 0.05^(1/n)). Days followed after weaning: median 346, 10 of them 365 or more.
- gutSizeExp 0.75: 0 of 21 weaned animals starved; if each ran the same risk independently, a risk of up to 13% per animal over the days followed would still give 0 with a chance of 5% (1 − 0.05^(1/n)). Days followed after weaning: median 286, 7 of them 365 or more.

#### X4. After weaning, in blocks, against the founder juveniles of 6 to 8 y

Pooled animal-days of the animals weaned in the run, by days since weaning; "founder juveniles" = animals already weaned on day 0, on the days they were 6 to 8 y old. "At a full foregut" = eating ticks ending with the foregut at least 0.95 full ÷ eating ticks; growth paid ÷ the potential (41.9 kcal/d for a female, 46.8 for a male).

| run | days since weaning | animals | animal-days | mean kg | reserve | absorbed − spent | eating min | at a full foregut | fallback share of plant energy | km on the ground | growth paid ÷ potential |
| --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| gutSizeExp 0.875 | 0 to 90 | 24 | 2160 | 17.7 | −0.10 | −15 | 319 | 49% | 5% | 4.4 | 0.90 |
| gutSizeExp 0.875 | 90 to 180 | 24 | 1913 | 18.5 | −0.15 | −10 | 347 | 55% | 7% | 4.5 | 0.85 |
| gutSizeExp 0.875 | 180 to 270 | 17 | 1412 | 19.1 | −0.19 | −5 | 359 | 58% | 9% | 4.3 | 0.81 |
| gutSizeExp 0.875 | 270 to 365 | 14 | 1189 | 19.9 | −0.18 | −3 | 352 | 59% | 6% | 4.3 | 0.82 |
| gutSizeExp 0.875 | 365 to 730 | 10 | 2476 | 21.3 | −0.14 | −5 | 323 | 54% | 5% | 4.3 | 0.86 |
| gutSizeExp 0.875 | 730 to the end | 2 | 293 | 22.0 | −0.28 | +28 | 377 | 67% | 8% | 3.9 | 0.72 |
| gutSizeExp 0.875 | founder juveniles, 6 to 8 y | — | 8830 | 25.1 | −0.08 | −2 | 264 | 38% | 4% | 3.9 | 0.92 |
| gutSizeExp 0.75 | 0 to 90 | 21 | 1890 | 17.7 | −0.04 | −1 | 264 | 20% | 4% | 4.6 | 0.96 |
| gutSizeExp 0.75 | 90 to 180 | 21 | 1722 | 18.6 | −0.07 | −6 | 282 | 31% | 5% | 4.5 | 0.93 |
| gutSizeExp 0.75 | 180 to 270 | 15 | 1232 | 19.3 | −0.07 | +4 | 275 | 29% | 4% | 4.5 | 0.93 |
| gutSizeExp 0.75 | 270 to 365 | 12 | 890 | 20.2 | −0.06 | +10 | 277 | 31% | 2% | 4.5 | 0.94 |
| gutSizeExp 0.75 | 365 to 730 | 7 | 1942 | 21.7 | −0.05 | +2 | 262 | 30% | 2% | 4.3 | 0.95 |
| gutSizeExp 0.75 | 730 to the end | 1 | 150 | 22.6 | −0.03 | −3 | 205 | 10% | 1% | 3.8 | 0.97 |
| gutSizeExp 0.75 | founder juveniles, 6 to 8 y | — | 8561 | 25.1 | −0.07 | −3 | 245 | 29% | 3% | 4.0 | 0.94 |

**The registered comparison (e1w §2.3 W3), per animal followed 365 days or more after weaning:** reserve never below −0.5 in those 365 days; its mean not below the founder juveniles' of the same seed by more than 0.1; eating minutes and the full-foregut share not above theirs by more than a quarter.

| run | animals followed 365 days | never below −0.5 | reserve within 0.1 | eating minutes within a quarter | full-foregut share within a quarter | all four |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gutSizeExp 0.875 | 10 | 10 | 8 | 8 | 6 | 6 |
| gutSizeExp 0.75 | 7 | 7 | 7 | 7 | 6 | 6 |

#### X5. Growth, against the target T-INF-4 (5-y mass 7-13 kg; 10-y mass 16-26 kg (F) and 18-30 kg (M); growth slowing at 9-11 y (F) and 12-14 y (M))

| run | mass at 5 y, females: mean (range, n) | males | kg gained in the 365 days after weaning, females (n) | males (n) | potential, F / M |
| --- | --- | --- | --- | --- | --- |
| gutSizeExp 0.875 | 17.9 (17.5 to 18.0, 10) | 19.4 (19.0 to 19.6, 10) | 3.17 (4) | 3.37 (6) | 3.4 / 3.8 kg/y |
| gutSizeExp 0.75 | 18.0 (17.9 to 18.1, 7) | 19.6 (19.5 to 19.7, 9) | 3.20 (3) | 3.69 (4) | 3.4 / 3.8 kg/y |

From every run's merged growth readout (`e1p`), which the reference runs also hold: the share of the growth potential paid, the growth velocity, the group's mean reserve and the lowest individual reserve reached.

| group | reference: paid share, kg/y, reserve (lowest) | reference, second draw: paid share, kg/y, reserve (lowest) | gutSizeExp 0.875: paid share, kg/y, reserve (lowest) | gutSizeExp 0.75: paid share, kg/y, reserve (lowest) |
| --- | --- | --- | --- | --- |
| 3–4 y | 0.96, 3.01, −0.04 (−0.27) | 0.96, 2.73, −0.04 (−0.28) | 0.97, 3.32, −0.03 (−0.21) | 0.98, 3.50, −0.02 (−0.15) |
| 4–5 y | 0.92, —, −0.07 (−0.53) | 0.92, —, −0.08 (−0.65) | 0.94, —, −0.06 (−0.59) | 0.96, —, −0.04 (−0.26) |
| juvenile 5–8 y F | 0.78, 2.62, −0.22 (−1.00) | 0.79, 2.67, −0.21 (−1.00) | 0.90, 2.75, −0.10 (−0.70) | 0.94, 2.81, −0.06 (−0.36) |
| juvenile 5–8 y M | 0.59, —, −0.41 (−1.00) | 0.50, —, −0.50 (−1.00) | 0.83, —, −0.17 (−0.78) | 0.92, —, −0.08 (−0.51) |
| juvenile 8–12 y F | 0.93, 0.00, −0.05 (−0.45) | 0.93, 0.00, −0.05 (−0.47) | 0.93, 0.00, −0.05 (−0.37) | 0.94, 0.00, −0.04 (−0.32) |
| juvenile 8–12 y M | 0.98, 1.79, −0.01 (−0.15) | 0.98, 1.86, −0.01 (−0.13) | 0.98, 1.86, −0.01 (−0.14) | 0.98, 1.94, −0.01 (−0.16) |

#### X6. Adults: are they unchanged?

From the class-by-day readout, pooled over the five seeds, by run year. "Outside" marks an arm value that lies beyond the two reference draws by more than the draws differ from each other.

| class | year | eating min: reference / reference, second draw / gutSizeExp 0.875 / gutSizeExp 0.75 | absorbed | spent | daylight at a full foregut | lowest 30-day mean reserve | outside |
| --- | --- | --- | --- | --- | --- | --- | --- |
| adult male | 1 | 226 / 227 / 225 / 226 | 1564 / 1561 / 1560 / 1565 | 1564 / 1562 / 1560 / 1566 | 3.1% / 3.3% / 3.1% / 3.2% | −0.020 / −0.025 / −0.021 / −0.022 | — |
| adult male | 2 | 225 / 224 / 225 / 225 | 1568 / 1570 / 1570 / 1574 | 1568 / 1569 / 1570 / 1573 | 2.8% / 2.9% / 3.0% / 3.1% | −0.016 / −0.015 / −0.017 / −0.014 | absorbed at 0.75; spent at 0.75; full foregut at 0.875; full foregut at 0.75; reserve at 0.875; reserve at 0.75 |
| adult male | 3 | 229 / 228 / 230 / 229 | 1570 / 1570 / 1573 / 1570 | 1569 / 1569 / 1573 / 1570 | 4.3% / 4.3% / 4.6% / 4.5% | −0.027 / −0.027 / −0.030 / −0.025 | absorbed at 0.875; absorbed at 0.75; spent at 0.875; spent at 0.75; full foregut at 0.875; full foregut at 0.75; reserve at 0.875; reserve at 0.75 |
| female, other | 1 | 218 / 219 / 218 / 219 | 1289 / 1288 / 1285 / 1284 | 1286 / 1287 / 1285 / 1284 | 6.6% / 6.6% / 6.6% / 6.9% | −0.033 / −0.039 / −0.040 / −0.041 | absorbed at 0.875; absorbed at 0.75; spent at 0.75; full foregut at 0.875; full foregut at 0.75 |
| female, other | 2 | 213 / 214 / 212 / 215 | 1292 / 1294 / 1291 / 1295 | 1291 / 1293 / 1288 / 1294 | 6.5% / 6.8% / 6.4% / 7.4% | −0.030 / −0.031 / −0.034 / −0.031 | spent at 0.875; full foregut at 0.75; reserve at 0.875 |
| female, other | 3 | 233 / 232 / 229 / 239 | 1307 / 1298 / 1305 / 1303 | 1305 / 1297 / 1300 / 1303 | 10.9% / 10.1% / 9.2% / 11.7% | −0.062 / −0.067 / −0.076 / −0.060 | eating minutes at 0.875; eating minutes at 0.75; full foregut at 0.875; reserve at 0.875 |
| female, pregnant | 1 | 274 / 267 / 269 / 280 | 1386 / 1384 / 1395 / 1398 | 1407 / 1402 / 1411 / 1417 | 17.0% / 15.7% / 16.5% / 18.2% | — / — / — / — | absorbed at 0.875; absorbed at 0.75; spent at 0.75 |
| female, pregnant | 2 | 253 / 260 / 263 / 252 | 1386 / 1382 / 1391 / 1378 | 1403 / 1395 / 1410 / 1391 | 13.4% / 13.8% / 15.3% / 13.7% | — / — / — / — | absorbed at 0.875; full foregut at 0.875 |
| female, pregnant | 3 | 255 / 264 / 259 / 271 | 1397 / 1403 / 1394 / 1386 | 1408 / 1415 / 1423 / 1408 | 14.3% / 15.4% / 15.7% / 16.9% | — / — / — / — | absorbed at 0.75; spent at 0.875; full foregut at 0.75 |
| female, lactating | 1 | 304 / 307 / 297 / 293 | 1727 / 1724 / 1706 / 1692 | 1724 / 1722 / 1703 / 1687 | 9.4% / 9.6% / 7.3% / 6.5% | −0.092 / −0.097 / −0.076 / −0.064 | eating minutes at 0.875; eating minutes at 0.75; absorbed at 0.875; absorbed at 0.75; spent at 0.875; spent at 0.75; full foregut at 0.875; full foregut at 0.75; reserve at 0.875; reserve at 0.75 |
| female, lactating | 2 | 301 / 304 / 299 / 294 | 1731 / 1734 / 1719 / 1708 | 1729 / 1733 / 1717 / 1707 | 9.6% / 10.3% / 8.8% / 7.5% | −0.071 / −0.069 / −0.064 / −0.058 | eating minutes at 0.75; absorbed at 0.875; absorbed at 0.75; spent at 0.875; spent at 0.75; full foregut at 0.875; full foregut at 0.75; reserve at 0.875; reserve at 0.75 |
| female, lactating | 3 | 317 / 311 / 309 / 293 | 1735 / 1732 / 1724 / 1700 | 1735 / 1730 / 1721 / 1696 | 12.8% / 11.7% / 11.1% / 7.3% | −0.099 / −0.092 / −0.087 / −0.063 | eating minutes at 0.75; absorbed at 0.875; absorbed at 0.75; spent at 0.875; spent at 0.75; full foregut at 0.75; reserve at 0.75 |

- Cells outside by that rule: gutSizeExp 0.875 28, gutSizeExp 0.75 32 of 57 each. The two reference draws lie within a few kcal of each other in most cells, so the rule flags differences of any size; their sizes:

| class | run | largest difference from the mean of the two reference draws, over the three years: eating minutes | absorbed | spent | daylight at a full foregut, points | lowest 30-day reserve |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| adult male | gutSizeExp 0.875 | −0.4% | +0.2% | +0.2% | +0.3 | −0.003 |
| adult male | gutSizeExp 0.75 | +0.3% | +0.3% | +0.3% | +0.2 | +0.002 |
| female, other | gutSizeExp 0.875 | −1.5% | −0.3% | −0.3% | −1.3 | −0.012 |
| female, other | gutSizeExp 0.75 | +2.9% | −0.3% | +0.2% | +1.2 | +0.005 |
| female, pregnant | gutSizeExp 0.875 | +2.6% | +0.7% | +0.8% | +1.7 | — |
| female, pregnant | gutSizeExp 0.75 | +4.5% | −1.0% | +0.9% | +2.1 | — |
| female, lactating | gutSizeExp 0.875 | −2.9% | −1.2% | −1.2% | −2.2 | +0.019 |
| female, lactating | gutSizeExp 0.75 | −6.7% | −2.0% | −2.1% | −5.0 | +0.032 |

- reference: deaths of adults and adolescents 5 (illness 1, respiratory illness (outbreak) 3, wounds from a fight 1); nursing females' reserve trend −0.0021 % of the store a day (viability line −0.05); births 71.
- reference, second draw: deaths of adults and adolescents 19 (illness 5, respiratory illness (outbreak) 10, wounds from a fight 4); nursing females' reserve trend −0.0010 % of the store a day (viability line −0.05); births 66.
- gutSizeExp 0.875: deaths of adults and adolescents 7 (illness 4, wounds from a fight 3); nursing females' reserve trend −0.0020 % of the store a day (viability line −0.05); births 69.
- gutSizeExp 0.75: deaths of adults and adolescents 23 (illness 8, killed in an intergroup attack 1, respiratory illness (outbreak) 10, wounds from a fight 4); nursing females' reserve trend −0.0002 % of the store a day (viability line −0.05); births 65.

#### X7. The unweaned: milk, self-feeding and reserve by age

| age | milk drunk, kcal/d: reference / reference, second draw / gutSizeExp 0.875 / gutSizeExp 0.75 | minutes eating solid food by day | mean reserve | mean kg |
| --- | --- | --- | --- | --- |
| 0–0.5 y | 204 / 202 / 204 / 205 | 0 / 0 / 0 / 0 | −0.071 / −0.084 / −0.070 / −0.057 | 2.4 / 2.4 / 2.4 / 2.4 |
| 0.5–1 y | 272 / 271 / 272 / 273 | 0 / 0 / 0 / 0 | −0.048 / −0.052 / −0.045 / −0.038 | 3.8 / 3.8 / 3.8 / 3.8 |
| 1–2 y | 281 / 279 / 263 / 254 | 62 / 64 / 66 / 72 | −0.082 / −0.079 / −0.074 / −0.056 | 6.1 / 6.1 / 6.1 / 6.2 |
| 2–3 y | 272 / 274 / 259 / 245 | 128 / 125 / 126 / 131 | −0.040 / −0.039 / −0.027 / −0.020 | 9.7 / 9.7 / 9.7 / 9.7 |
| 3–4 y | 257 / 255 / 241 / 231 | 149 / 148 / 149 / 152 | −0.037 / −0.037 / −0.028 / −0.020 | 13.6 / 13.5 / 13.6 / 13.6 |
| 4–5 y | 241 / 237 / 225 / 219 | 182 / 181 / 177 / 174 | −0.075 / −0.081 / −0.062 / −0.038 | 16.4 / 16.2 / 16.4 / 16.5 |
- T-INF-2 (Suckling share of observation time; band 1–6): 11.485 / 11.416 / 11.404 / 11.420.
- T-INF-5 (Nursing bout rate and length; band 0.5–2): 1.263 / 1.259 / 1.199 / 1.181.
- T-DEM-1 (First-year mortality; band 0.11–0.19): 0.246 / 0.225 / 0.171 / 0.201.
- Deaths under 2 y booked as starvation: 0 / 1 / 2 / 0.

#### X8. The fitted and held-out rows

Sums of band distance over the rows scored in all four runs (66 rows; the five revised rows left out), with z by e-noise.md amendment 4 against the two reference draws (n = 2; SD floored). The reference is on the earlier protocol, so this is for information.

| sum | rows | reference draws | mean ± SD | gutSizeExp 0.875 (z) | gutSizeExp 0.75 (z) |
| --- | ---: | --- | --- | --- | --- |
| fitted | 26 | 4.42 / 4.13 | 4.28 ± 0.20 (used 0.30) | 4.33 (+0.2) | 3.40 (−2.4) |
| held-out | 40 | 39.47 / 38.32 | 38.90 ± 0.81 (used 1.45) | 39.17 (+0.2) | 38.87 (−0.0) |
| held-out w/o rare | 37 | 38.33 / 37.64 | 37.98 ± 0.49 (used 0.49) | 38.38 (+0.7) | 37.62 (−0.6) |

**Rows that move** (registered rule: the arm's band distance differs from both reference draws by more than they differ from each other):

| row | role | band | value: reference / reference, second draw / gutSizeExp 0.875 / gutSizeExp 0.75 | band distance | moves at |
| --- | --- | --- | --- | --- | --- |
| T-PTY-1 Mean party size | fitted | 4.5–9.2 | 4.272 / 4.234 / 4.330 / 4.288 | 0.048 / 0.057 / 0.036 / 0.045 | 0.875 (closer) |
| T-RNG-1 Annual home range of a 22-member community | fitted | 5–16 | 5.410 / 5.044 / 5.268 / 4.986 | 0.000 / 0.000 / 0.000 / 0.001 | 0.75 (further) |
| T-RNG-5 Lactating female day range relative to males | held-out | 0.3–0.75 | 1.035 / 1.040 / 1.011 / 0.988 | 0.634 / 0.643 / 0.579 / 0.530 | 0.875 (closer), 0.75 (closer) |
| T-RNG-6 Range variability over years | held-out | 1.2–3 | 1.144 / 1.157 / 1.142 / 1.182 | 0.031 / 0.024 / 0.032 / 0.010 | 0.75 (closer) |
| T-IGE-1 Intergroup encounters per community-year | fitted | 5–12 | 20.359 / 19.875 / 20.455 / 18.538 | 1.194 / 1.125 / 1.208 / 0.934 | 0.75 (closer) |
| T-IGE-2 Share of encounters that are auditory only | held-out | 0.7–0.9 | 0.948 / 0.943 / 0.950 / 0.936 | 0.239 / 0.215 / 0.250 / 0.181 | 0.75 (closer) |
| T-FOOD-3 Fallback switching | held-out | ≥ 0.3 | 0.245 / 0.240 / 0.252 / 0.280 | 0.185 / 0.200 / 0.159 / 0.066 | 0.875 (closer), 0.75 (closer) |
| T-FOOD-5 Nearest-tree choice share | held-out | 0.15–0.45 | 0.091 / 0.091 / 0.092 / 0.093 | 0.195 / 0.198 / 0.195 / 0.192 | 0.75 (closer) |
| T-FOOD-10 Breakfast planning | held-out | 0.08–0.78 | 0.868 / 0.868 / 0.865 / 0.843 | 0.125 / 0.126 / 0.122 / 0.090 | 0.875 (closer), 0.75 (closer) |
| T-HUN-4 More males, more hunting | held-out | 1.05–1.8 | 2.284 / 2.210 / 2.160 / 2.362 | 0.646 / 0.546 / 0.480 / 0.750 | 0.75 (further) |
| T-HUN-7 Kills per successful hunt | fitted | 1.2–2 | 1.000 / 1.000 / 1.000 / 1.002 | 0.250 / 0.250 / 0.250 / 0.248 | 0.75 (closer) |
| T-HUN-8 Adult males make most kills | held-out | 0.8–0.95 | 0.967 / 0.967 / 0.961 / 0.968 | 0.116 / 0.110 / 0.075 / 0.118 | 0.875 (closer) |
| T-SOC-3 Grooming reciprocity | held-out | 0.45–0.8 | 0.833 / 0.827 / 0.790 / 0.881 | 0.094 / 0.077 / 0.000 / 0.231 | 0.875 (closer), 0.75 (further) |
| T-SOC-5 Male hierarchy steepness | held-out | 0.2–0.7 | 0.882 / 0.904 / 0.853 / 0.850 | 0.363 / 0.408 / 0.306 / 0.299 | 0.875 (closer), 0.75 (closer) |
| T-SOC-7 Alpha tenure | fitted | 3–7 | 3.214 / 3.214 / 3.750 / 2.812 | 0.000 / 0.000 / 0.000 / 0.047 | 0.75 (further) |
| T-DEM-1 First-year mortality | fitted | 0.11–0.19 | 0.246 / 0.225 / 0.171 / 0.201 | 0.705 / 0.436 / 0.000 / 0.134 | 0.875 (closer), 0.75 (closer) |
| T-DEM-5 Epidemic frequency | fitted | 0.07–0.15 | 0.111 / 0.067 / 0.022 / 0.111 | 0.000 / 0.042 / 0.597 / 0.000 | 0.875 (further) |
| T-DEM-8 Respiratory death rate | held-out | 5–20 | 8.769 / 15.541 / 0.000 / 21.844 | 0.000 / 0.000 / 0.333 / 0.123 | 0.875 (further), 0.75 (further) |
| T-DEM-10 Age-specific fertility | fitted | 0.15–0.25 | 0.282 / 0.290 / 0.290 / 0.272 | 0.324 / 0.403 / 0.400 / 0.222 | 0.75 (closer) |
| T-COM-11 Alarm calls track audience knowledge | fitted | 0.25–0.55 | 0.087 / 0.079 / 0.075 / 0.098 | 0.542 / 0.571 / 0.584 / 0.506 | 0.75 (closer) |
| T-SOC-14 Contact share of aggression among individuals of 12 y and over | held-out | 0.08–0.37 | 0.067 / 0.065 / 0.069 / 0.067 | 0.045 / 0.051 / 0.037 / 0.046 | 0.875 (closer) |

- Rows that move: gutSizeExp 0.875: 9 closer to the band, 2 further; gutSizeExp 0.75: 12 closer to the band, 5 further.
- Rows whose verdict is the same in both reference draws and differs in an arm, a "pass" involved: T-PAT-4 (held-out): pass / pass / fail / pass; T-HUN-1 (fitted): pass / pass / pass / inconclusive; T-SOC-9 (fitted): pass / pass / pass / inconclusive; T-END-9 (held-out): fail / fail / pass / fail.

#### X9. The respiratory outbreaks

An outbreak reaches a community as a random arrival (`epidemicArrivalPerY` 0.10 per community-year, drawn from the world's generator each day), spreads inside parties, and each case ends in death with odds set by age (under 5 y × 5.01, 30 y or more × 3.86, base 0.07) and by one draw of virulence per outbreak (log-normal, SD 0.8 on the odds); nothing in `src/sim/disease.ts` reads reserves, condition or body mass. Expected arrivals in the three scored years of five seeds of three communities: 4.5. Every three-year run on the S39 stack is listed.

| run | outbreaks by seed (total) | outbreak deaths by seed (total) | deaths per outbreak | attack rate | share of the community that died: mean (largest) | respiratory deaths per 1,000 chimp-years | mean party size |
| --- | --- | --- | ---: | ---: | --- | ---: | ---: |
| Y3-W50 (reference) | 1 / 1 / 0 / 2 / 1 (5) | 0 / 4 / 0 / 2 / 1 (7) | 1.4 | 0.87 | 0.08 (0.22) | 8.8 | 4.27 |
| Y3-W50-s1 (reference, second draw) | 0 / 1 / 0 / 1 / 1 (3) | 0 / 2 / 2 / 5 / 5 (14) | 4.7 | 1.00 | 0.20 (0.28) | 15.5 | 4.23 |
| Y3-W25 (swallowed 0.25) | 1 / 1 / 1 / 0 / 1 (4) | 4 / 4 / 0 / 0 / 3 (11) | 2.8 | 0.92 | 0.17 (0.33) | 14.0 | 4.20 |
| Y3-W25-s1 (swallowed 0.25, second draw) | 0 / 0 / 0 / 0 / 1 (1) | 0 / 0 / 0 / 0 / 2 (2) | 2.0 | — | — (—) | 2.5 | 4.31 |
| Y3-W50-wean (weanOutcome 1) | 0 / 0 / 1 / 1 / 0 (2) | 0 / 0 / 5 / 2 / 0 (7) | 3.5 | — | — (—) | 10.0 | 4.25 |
| Y3-W50-gut875 (gutSizeExp 0.875) | 0 / 0 / 1 / 0 / 0 (1) | 0 / 0 / 0 / 0 / 0 (0) | 0.0 | — | — (—) | 0.0 | 4.33 |
| Y3-W50-gut75 (gutSizeExp 0.75) | 1 / 2 / 0 / 1 / 1 (5) | 2 / 7 / 0 / 6 / 3 (18) | 3.6 | 0.99 | 0.18 (0.33) | 21.8 | 4.29 |

- Without the input (5 runs): 1 to 5 outbreaks and 2 to 14 outbreak deaths a run; 1.4 / 4.7 / 2.8 / 2.0 / 3.5 deaths per outbreak. With it: 5 outbreaks and 18 deaths at 0.75, 1 and 0 at 0.875.
- Chance of 1 outbreak or fewer when 4.5 are expected (Poisson): 0.06; of 5 or more: 0.47.

**The outbreaks of the two arms, found in the per-animal rows** (two or more deaths in one community within four days of each other; the per-animal rows carry no cause, so the count is checked against the run's own by seed). "Expected deaths" = the sum over the community's living members of the registry's odds of death by age at a virulence of 1, if every member is infected.

| run | seed | community | days (date) | living in the community the day before | of them under 5 y / 30 y or more | deaths | who (age) | expected deaths at virulence 1 | victims' reserve: mean (lowest) | the run's outbreak deaths in that seed |
| --- | --- | --- | --- | ---: | --- | ---: | --- | ---: | --- | ---: |
| gutSizeExp 0.875 | all | | | | | 0 | | 0.0 | | 0 |
| gutSizeExp 0.75 | 48 | 1 | 506 to 508 (Mar 18, year 2) | 24 | 6 / 5 | 2 | id 15 (22.5), id 22 (5.0) | 3.7 | −0.01 (−0.02) | 2 |
| gutSizeExp 0.75 | 7 | 1 | 368 to 370 (Oct 31, year 2) | 23 | 6 / 5 | 5 | id 6 (42.1), id 22 (4.6), id 52 (0.4), id 21 (3.6), id 12 (34.1) | 3.6 | −0.04 (−0.06) | 7 |
| gutSizeExp 0.75 | 7 | 3 | 380 to 384 (Nov 12, year 2) | 12 | 2 / 3 | 2 | id 49 (1.6), id 42 (39.1) | 1.7 | −0.03 (−0.03) | 7 |
| gutSizeExp 0.75 | 5 | 2 | 613 to 614 (Jul 3, year 2) | 18 | 6 / 3 | 6 | id 23 (30.8), id 29 (31.8), id 31 (23.8), id 58 (0.1), id 28 (42.8), id 35 (7.3) | 2.9 | −0.01 (−0.02) | 6 |
| gutSizeExp 0.75 | 11 | 2 | 970 to 971 (Jun 24, year 3) | 18 | 4 / 3 | 3 | id 29 (32.7), id 31 (24.7), id 55 (1.7) | 2.5 | −0.01 (−0.01) | 3 |
| gutSizeExp 0.75 | all | | | | | 18 | | 14.5 | | 18 |

#### X10. Does the larger gut change anything for the wrong reason? Intake by body size

Per animal-day, from the arms' per-animal rows. Dry matter and energy are divided by body mass and by mass^0.75 (the power of the resting need). "Above the set point" = share of animal-days with reserves above 0, and the highest reserve reached.

| run | group | animal-days | mean kg | dry matter, g per kg | g per kg^0.75 | absorbed, kcal per kg^0.75 | spent, kcal per kg^0.75 | eating min | at a full foregut | reserve | above the set point (highest) | growth paid, kcal/d |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| gutSizeExp 0.875 | weaned in the run, under 21 kg | 7312 | 18.7 | 24.3 | 50.5 | 107.4 | 108.6 | 334 | 54% | −0.14 | 0% (+0.00) | 38 |
| gutSizeExp 0.875 | weaned in the run, 21 kg and over | 2131 | 21.9 | 23.8 | 51.4 | 108.8 | 108.4 | 348 | 58% | −0.17 | 0% (−0.01) | 37 |
| gutSizeExp 0.875 | on milk, 2 to 5 y | 29807 | 12.5 | 20.0 | 37.4 | 101.3 | 101.5 | 146 | 10% | −0.04 | 1% (+0.03) | 43 |
| gutSizeExp 0.875 | founder juveniles under 31.3 kg | 14404 | 26.3 | 22.4 | 50.6 | 107.8 | 107.8 | 257 | 35% | −0.08 | 0% (+0.02) | 39 |
| gutSizeExp 0.875 | adult females, not pregnant, not nursing | 16661 | 31.3 | 19.7 | 46.7 | 97.6 | 97.5 | 219 | 13% | −0.02 | 18% (+0.02) | 0 |
| gutSizeExp 0.875 | adult males | 80407 | 39.0 | 18.8 | 46.9 | 100.5 | 100.5 | 227 | 5% | −0.01 | 29% (+0.03) | 0 |
| gutSizeExp 0.75 | weaned in the run, under 21 kg | 5873 | 18.7 | 24.5 | 50.9 | 109.4 | 109.5 | 268 | 26% | −0.05 | 5% (+0.02) | 42 |
| gutSizeExp 0.75 | weaned in the run, 21 kg and over | 1953 | 22.1 | 23.6 | 51.2 | 109.0 | 108.5 | 276 | 33% | −0.06 | 0% (+0.00) | 42 |
| gutSizeExp 0.75 | on milk, 2 to 5 y | 28654 | 12.4 | 20.5 | 38.3 | 101.7 | 101.8 | 153 | 7% | −0.03 | 3% (+0.03) | 44 |
| gutSizeExp 0.75 | founder juveniles under 31.3 kg | 13857 | 26.3 | 22.4 | 50.5 | 107.7 | 107.8 | 242 | 27% | −0.06 | 1% (+0.02) | 39 |
| gutSizeExp 0.75 | adult females, not pregnant, not nursing | 17799 | 31.3 | 19.9 | 47.0 | 97.7 | 97.7 | 223 | 16% | −0.02 | 16% (+0.02) | 0 |
| gutSizeExp 0.75 | adult males | 76803 | 39.0 | 18.8 | 47.0 | 100.6 | 100.6 | 227 | 5% | −0.01 | 29% (+0.03) | 0 |
- gutSizeExp 0.875: a weaned animal under 21 kg eats 1.23 of an adult female's dry matter per kg and 1.08 per kg^0.75, absorbs 1.10 of her energy per kg^0.75 and spends 1.11; it eats 334 minutes a day against her 219.
- gutSizeExp 0.75: a weaned animal under 21 kg eats 1.23 of an adult female's dry matter per kg and 1.08 per kg^0.75, absorbs 1.12 of her energy per kg^0.75 and spends 1.12; it eats 268 minutes a day against her 223.

The same from the class readout, which the reference runs also hold (per class-day; m75 = mean mass^0.75):

| class | dry matter, g per kg^0.75: reference / reference, second draw / gutSizeExp 0.875 / gutSizeExp 0.75 | absorbed, kcal per kg^0.75 | eating min | daylight at a full foregut | mean reserve |
| --- | --- | --- | --- | --- | --- |
| infant 2–5 y | 38.8 / 38.4 / 39.7 / 40.5 | 101.4 / 101.2 / 102.3 / 102.9 | 189 / 178 / 168 / 166 | 13.5% / 12.0% / 7.6% / 4.2% | −0.079 / −0.070 / −0.045 / −0.029 |
| juvenile 5–12 y | 49.1 / 49.0 / 49.3 / 49.3 | 104.1 / 103.9 / 105.0 / 104.8 | 301 / 294 / 261 / 242 | 24.2% / 23.0% / 16.8% / 11.7% | −0.124 / −0.120 / −0.066 / −0.041 |
| female, other | 46.9 / 46.8 / 46.7 / 47.0 | 97.8 / 97.6 / 97.6 / 97.7 | 220 / 221 / 219 / 223 | 7.7% / 7.5% / 7.2% / 8.3% | −0.018 / −0.018 / −0.017 / −0.023 |
| adult male | 46.9 / 46.9 / 46.9 / 47.0 | 100.4 / 100.4 / 100.5 / 100.6 | 227 / 226 / 227 / 227 | 3.4% / 3.5% / 3.6% / 3.6% | −0.006 / −0.006 / −0.006 / −0.006 |
