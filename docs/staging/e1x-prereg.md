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
