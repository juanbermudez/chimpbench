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
