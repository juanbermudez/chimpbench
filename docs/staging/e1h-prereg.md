# E1h pre-registration: food energy from measured sugars (the field formula's TNC by difference removed)

Registered 1 October 2026, before any run of the changed code (tests included). Track E, stage E1h, branch `e1h-food-energy` (from `track-e` at eb51b39, which carries the field audit). New switch `ledgerFoodEnergyFix`, 0 by default in both profiles, read only with `energyLedger` 1: compressed goldens and the field pin in `tests/sim-track-e.test.ts` cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. This stage corrects an input, the energy a feeding minute delivers, from the measured composition of the foods and a formula that has been checked against doubly labelled water. It is not fitted to anything: the values below are fixed by arithmetic here, before any run, and stay whatever the result. A miss is a finding.

## 0. Why (docs/staging/e-field-audit.md)

- The model's food energy per feeding minute (drupes 9.9, figs 12.5, fallback 4.2 kcal/min) is uwimbabazi2019's, computed with the field formula ME = 4 TNC + 4 AP + 9 lipid + 1.6 NDF (kcal per 100 g organic matter), with TNC (total non-structural carbohydrate) obtained by difference: 100 − NDF − lipid − AP − ash.
- TNC by difference credits at 4 kcal/g everything that is not fibre, protein, lipid or ash: starch, pectin and other soluble fibre, organic acids, tannins and other phenolics, and assay error. At Kanyawara it is 2.7 × the measured water-soluble sugar (WSC) in ripe fruit, 4.4 × in figs, 6.0 × in young leaves (Table 2 below).
- Where the same kind of formula can be paired with doubly labelled water in the same species, it gives 1.13–1.92 × measured expenditure (7 species); the version built from measured sugars plus a pectin (and starch) estimate does not differ from it (8 species) (simmen2017, supplement Table S5; §1.2).
- E1g found intake capped by foregut throughput near 1,980 formula kcal for adult females (650–660 g of dry matter), and the audit predicts that correcting food energy will expose the same ceiling, because the same energy then needs 1.3–1.5 × the dry matter.

## 1. Sources (verified 1 October 2026; added to docs/research.md §E.22 and docs/staging/e-sources.md §22)

### 1.1 Composition of the Kanyawara foods (uwimbabazi2019, Table 2, read in full through NCBI BioC, author manuscript PMC7450825)

% of organic matter (mean ± SE; n = species):

| Food | Lipid | AP | NDF | TNC (by difference) | WSC (measured) | n |
| --- | --- | --- | --- | --- | --- | --- |
| Ripe fruit (all) | 4.6 ± 1.3 | 9.3 ± 1.1 | 41.5 ± 2.4 | 44.6 ± 2.7 | 16.5 ± 1.7 | 36 |
| Figs | 3.5 ± 0.7 | 6.8 ± 1.9 | 49.0 ± 3.8 | 40.7 ± 3.6 | 9.2 ± 1.2 | 12 |
| Non-fig ripe fruit | 5.2 ± 1.9 | 10.6 ± 1.3 | 37.7 ± 2.9 | 46.6 ± 3.7 | 20.1 ± 1.2 | 24 |
| Young leaves | 0.5 ± 0.2 | 25.9 ± 1.9 | 43.1 ± 2.8 | 30.5 ± 3.1 | 5.1 ± 0.5 | 19 |
| Pith | 0.4 ± 0.2 | 7.5 ± 2.0 | 58.1 ± 3.1 | 33.9 ± 2.9 | 15.5 ± 2.7 | 13 |

Lipid + AP + NDF + TNC sums to 100 ± 0.1 in every row, so TNC is by difference on an ash-free basis. Table 1 (kcal/min; dry g/min): drupes 9.9 ± 1.8; 3.0 ± 0.6. Figs 12.5 ± 1.5; 4.2 ± 0.5. Young leaves 6.2 ± 0.6; 2.1 ± 0.2. Pith 3.4 ± 2.2; 1.8 ± 0.2.

### 1.2 The sugar-based formula (simmen2017, electronic supplement, read in full: figshare 10.6084/m9.figshare.5032301, CC-BY)

- Note S2: the "Low-Energy Value of the Diet" (LEVD) model replaces TNC by difference with measured soluble carbohydrate plus estimates of what the assay misses. Rule, verbatim in substance: where simple soluble sugars were reported, add 5% starch plus 5% pectin of the dry matter; **where water-soluble carbohydrates were reported, add only 5% pectin**; where only TNC by difference exists, multiply the published intake by 0.74.
- Their review: starch averages 3–6% of dry matter in ripe and unripe fruit and 1–4% in vegetative parts; pectin 4–6% of dry matter in fruit and leaves eaten by wild howlers (the only primate data). In ripe-fruit diets simple sugars are 48 ± 13% of TNC by difference; sugars + starch + pectin 68 ± 10%. Over all diets LEVD ÷ HEVD = 74 ± 8% (Table S3).
- Table S5 (paired with doubly labelled water): HEVD exceeds measured expenditure by 1,770 ± 2,208 kJ/day (Wilcoxon, P < 0.02, 7 species); LEVD does not differ (+144 ± 606 kJ/day, t = 0.492, P < 0.7, 8 species). No chimpanzee in the set; orangutan and western gorilla are.
- The fibre term is unchanged in both models (species-specific digestibility × 3 kcal/g). The chimpanzee formula's 1.6 kcal/g NDF stays in the sugar-based version, so the corrected values remain comparable with the audit's sugar-based band (1,810–2,070 kcal/day) and with the digesta split of E1b.

### 1.3 Fibre digestibility

- Chimpanzee: NDF digestibility 0.543 in captive chimpanzees on a biscuit of 34% NDF and about 2.5% lignin (miltonDemment1988, as reported by conklinBrittain2006, full text re-checked by the audit). The wild Kanyawara diet averages about 8% lignin (conklinBrittain2006), and chimpanzee fibre digestibility falls as dietary fibre rises (miltonDemment1988, abstract), so 0.543 is an upper value for wild food. miltonDemment1988's own full text was not reached (publisher challenge page, not bypassed).
- E1b's input stays: 0.449 (captive western gorillas on a highly fibrous diet; remisDierenfeld2004 via masi2015). It is unchanged here. At 0.543 instead, fibre would yield about 0.28 kcal/g more, about 80–110 kcal/day for an adult female eating 300–400 g of NDF (derived); a sensitivity, not run.

### 1.4 Gut capacity and throughput

- nakamura2017 (abstract; full text closed): a wild Mahale female held 489.4 cm³ (258.8 g dry) of seeds, 14.7% of the "previously reported capacity of the digestive tract of a chimpanzee in captivity", which gives 3,329 cm³ (derived). Its reference list (Crossref, 1 October 2026) cites Chivers & Hladik 1980 as the only gut-morphology source, so that is the likely origin; the captive animal's mass is not given in the abstract.
- chiversHladik1980 (abstract; full text closed): gut chambers measured by area, weight and volume in 180 individuals of 78 species; in frugivores the stomach and large intestine are "more voluminous" in larger species than isometry predicts. Direction only: isometric scaling of gut volume with body mass within a species remains an assumption.
- Gut proportions: stomach 17–20%, small intestine 23–28%, colon 52–54% of gut volume in chimpanzees (Milton 1987 via a secondary page; milton1999's Figure 1 shows the proportions graphically, values not printed). Unchanged from E1b: foregut share 0.45.
- Gastric emptying in captive chimpanzees: more than 3 h, less than 16 h (ardente2011, abstract): E1b's 3-hour first-order emptying is at the fast end, so the throughput ceiling it gives is, if anything, high.
- No dry-matter concentration of ape digesta and no maximum voluntary dry-matter intake of chimpanzees were found.

**Gut-capacity input for E1h:** `digestaGutMlPerKg` **83 mL/kg (unchanged), bounds 60–111 mL/kg**: 3,329 mL divided by an adult mass of 30–55 kg (the measured animal's mass is not known; 31.3 kg Gombe female median to about 55 kg captive *Pan*). Foregut 5.6 g dry matter per kg (3.7–7.5 g/kg over the bounds) with the other E1b inputs unchanged. E1g measured the throughput this allows: about 650–660 g of dry matter a day for a 31.3 kg female at 83 mL/kg, about 750–800 g at 111 mL/kg. The upper bound is used in the sensitivity arm (§5) only.

## 2. Derivation of the corrected energy per feeding minute (arithmetic; no run)

Per 100 g organic matter: ME_high = 4 TNC + 4 AP + 9 lipid + 1.6 NDF (the field formula); ME_sugar = 4 (WSC + pectin) + 4 AP + 9 lipid + 1.6 NDF (simmen2017's rule for studies that measured WSC: pectin 5% of dry matter = 5.2% of organic matter at the diet's organic-matter share of dry matter, 839 ÷ 872.6 = 0.96, derived from uwimbabazi2019 Table 4). Corrected kcal/min = Table 1 kcal/min × ME_sugar ÷ ME_high. Bounds: low = pectin 4% of dry matter, no starch; high = pectin 6% plus starch 6% (fruit) or 4% (leaves and pith) of dry matter (simmen2017's ranges), never above TNC.

| Food | ME_high | ME_sugar (central) | Factor | Table 1 kcal/min | **Corrected kcal/min** | Bounds |
| --- | --- | --- | --- | --- | --- | --- |
| Drupes (non-fig ripe fruit) | 335.9 | 250.7 | 0.746 | 9.9 | **7.39** | 7.27–8.25 |
| Figs | 299.9 | 194.7 | 0.649 | 12.5 | **8.12** | 7.94–9.33 |
| Young leaves | 299.1 | 218.3 | 0.730 | 6.2 | 4.52 | 4.44–4.96 |
| Pith | 262.2 | 209.4 | 0.799 | 3.4 | 2.72 | 2.66–2.99 |
| Fallback (pith : leaves feeding time 17.4 : 6.9, potts2011, as the old 4.2) | — | — | 0.770 | 4.2 | **3.23** | 3.17–3.54 |

- Check against the audit's daily figure: the same rule on the day-level totals (Table 4) gives 1,814 kcal/day against 2,479.
- An alternative computation (subtracting the absolute reduction, 4 × (TNC − WSC − pectin) per g, times g/min, instead of scaling) gives drupes 7.44, figs 8.25, leaves 4.57, pith 2.49 (fallback 3.08): within the bounds except pith (Table 1's pith rate, 1.9 kcal per g dry matter, is below what its composition gives, 2.6). The scaling is kept because it preserves Table 1's measured rates' relation to each other.
- Unchanged: meat (6.7 kcal/min, a food-table value for flesh, no carbohydrate) and milk (human milk energy). Dry matter per minute (3.0, 4.2, 1.89 g/min) and fibre shares are measured on the food and stay: the correction lowers only the non-fibre energy, so each corrected kcal carries 1.30–1.54 × the dry matter.
- Per feeding minute, energy absorbed with E1b's digestion (fibre 3 × 0.449 kcal/g, the rest absorbed): drupes 9.59 → 7.06 (× 0.736), figs 12.06 → 7.67 (× 0.636), fallback 3.95 → 2.98 (× 0.754) (derived).

Registry entries (group `feeding`, [M]: derived from [H] composition with a formula checked across species, not in chimpanzees): `ledgerFruitKcalPerMinSugar` 7.39, `ledgerFigKcalPerMinSugar` 8.12, `ledgerFallbackKcalPerMinSugar` 3.23; switch `ledgerFoodEnergyFix` (design, 0).

## 3. Mechanism (code)

With `ledgerFoodEnergyFix` 1 (and `energyLedger` 1) every read of a plant food's energy per feeding minute takes the sugar-based entry instead of the field formula's:
- the energy of one fruit unit (`fruitKcalPerUnit`; the crop still depletes at `fruitIntakePerH` units per hour, so a crown yields less energy before it is empty);
- fallback food per hour (`fallbackKcalPerH`, also in `fallback.ts eatFallback`);
- the digesta composition of each food (E1b's `food()`: dry matter and fibre per kcal);
- through these, the intake valuation (intake.ts), the drive's intake rate (E1e `feedRate`) and the gut capacity expressed in kcal of drupes (`gutCap`).

Nothing else changes: no score weight, no expenditure term, no gut input. `fin` (formula energy eaten) is then in sugar-based kcal, which is the unit of the comparison band. A diagnostic tap reports each plant meal with its kind, so `energy-diagnose` can also report the field-method intake (the same food at the field formula's kcal/min). Without `ledgerDigesta` the E1 energy gut keeps its capacity in kcal (25 kcal/kg, design), so it would hold more food mass; the switch is meant for the digesta stack.

## 4. Arms and benchmark

Field profile, development seeds 48 and 7 only, 30-day burn-in + 60 days (90 in all), `--workers 1`, one run at a time, rules policy (no model API).
- **R** (reference): `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}`. `ledgerNurseBout` and `ledgerGrowPotential` are E1f's switch names (docs/staging/e1f-prereg.md §2.1–2.2); `ledgerNurseByMilk` is superseded by `ledgerNurseBout` and left out. `ledgerWildCostMult` stays 1. R runs on unchanged code (it was started before this registration; switch-off identity is tested).
- **T** (test): R + `{"ledgerFoodEnergyFix":1}`.
- **G** (gut sensitivity, run only if the gut binds in T; §5): T + `{"digestaGutMlPerKg":111}`, the upper bound of §1.4. A sensitivity run, not a fit and not a proposal for the default.
- Tools: `scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 60 --params <arm> --json`; `scripts/e-bench.ts --quick --days 60 --workers 1 --params <arm> --out artifacts/validation/e1h/<arm>`.
- The staged T-ENE rows are read from `energy-diagnose` (simulation truth) for the lactating class, as re-scoped in `docs/staging/e-targets.patch.json` (separate commit, after this registration).

**Gut binding (registered test for running G):** in T, any adult female class (other, pregnant, lactating) absorbs less than 97% of what it spends while its mean foregut fill over the day is 0.40 or more (R-like arms sit near 0.33; E1g's ceiling sat at 0.46–0.49).

## 5. Predictions (by hand, before any run)

Provisional reference values are E1g's k = 1 arm (a stack that differs from R in its nursing and growth switches); R's measured values replace them as the reference, and the predictions are the ratios.

Arithmetic:
- Absorbed energy per eating minute falls to about 0.72 of R's (diet of about 70% fruit time, a third of it figs, 30% fallback; derived from §2), so for the same expenditure eating minutes rise by **35–45%** where the gut does not bind (expenditure rises 1–3% with the extra feeding and trips).
- Dry matter per kcal rises to about 1.36 × (0.464 g per sugar-based kcal for the model's diet against 0.34 g per old kcal).
- Lactating female (spends about 1,690–1,720): unbound she would eat about 1,800 sugar-based kcal, about 840 g of dry matter, in about 290 min. The foregut passes about 650 g at 83 mL/kg, so **she is gut-bound**: about 1,400 sugar-based kcal (about 1,330 absorbed), a deficit of about 350 kcal/day, **reserves falling about 0.8–1.0% of the store a day** (E1g: −0.54%/day at a 226 kcal deficit, 13 lactating deaths at about 520).
- Other adult females need about 630 g: at the ceiling, reserves flat to slowly falling (0 to −0.2%/day). Juveniles 5–12 y (ceiling about 460 g at 22 kg against a need near 500 g): falling (−0.1 to −0.4%/day). Males (39 kg; ceiling about 800 g, need about 750 g): balanced, eating +35–45%.
- In G (foregut 7.5 g/kg, about 870 g/day at 31.3 kg): mothers near balance (0 to −0.2%/day), everyone else balanced.

| Row | Band | R (provisional, E1g k 1) | Expected T | Expected G |
| --- | --- | --- | --- | --- |
| T-ENE-1 lactating, ledger truth in sugar-based kcal (comparison band) | 1,810–2,070 | ~1,720 old kcal (not comparable) | **1,300–1,500: miss low (gut)** | 1,700–1,900: at or into the band |
| T-ENE-1 lactating, field method (same food at the field formula's kcal/min) | 1,900–3,100 | ~1,720 | 1,800–2,050 | 2,300–2,600 |
| T-ENE-2 lactating eating min | 250–370 | ~206 | 230–260 (edge) | 280–320 (in) |
| T-ENE-3 lactating dry matter | 650–1,100 g | ~570 | 620–680 (edge) | 780–860 (in) |
| T-ENE-8 expenditure ÷ M^0.75, non-reproducing adults | 85–130 | 95–97 | +1–3% | +1–3% |
| T-ACT-1 feeding | 0.33–0.50 | 0.30 | 0.35–0.40 (pass) | 0.37–0.42 (pass) |
| T-ACT-2 travel | 0.12–0.25 | 0.16 | 0.16–0.21 | 0.16–0.21 |
| T-ACT-3 grooming | 0.08–0.18 | 0.24 | 0.17–0.21 | 0.15–0.19 |
| T-ACT-4 rest + groom | 0.30–0.47 | 0.48 | 0.34–0.42 (pass) | 0.32–0.40 (pass) |
| T-HUN-1 hunts per community-year | 5–25 | ~41 | no direction; within ±30% of R | same |
| T-FOOD-2 fruit share of feeding | 0.60–0.78 | 0.67 | +0.02 to +0.08 (fruit gives more energy per gram of gut; may leave at the top) | same |
| T-FOOD-4 trees per day (held out) | 4–15 | 5.1 | +20–50% (crowns yield less energy before depletion) | same |
| T-RNG-4 male day range | 1.5–3.5 km | 1.85 | 2.0–2.4 | 2.0–2.4 |
| T-RNG-5 lactating ÷ male day range (held out) | 0.3–0.6 | 0.74 | no trend (E1g: flat with demand) | same |
| Lactating reserves, change per day | — | −0.07% | **−0.8 to −1.0%** | 0 to −0.2% |
| Infants 0.5–5 y reserves | — | about flat | about flat (milk unchanged; own-food minutes +35–45%) | same |
| Starvation deaths in 60 days | 0 | 0 | **3–10 (lactating females first)** | 0–2 (infants under 2 y, the milk yield) |
| Prescription count | — | R's | unchanged (an input is corrected; nothing prescriptive is switched out) | unchanged |
| Viability (no starvation, no adult class below −0.05%/day beyond R) | — | pass or marginal | **fail** | pass or marginal |

Confidence: moderate on the direction of every energy row and on gut binding in T; low on the size of the deficit (it depends on how close to the hard ceiling the satiation curve lets the foregut run) and on the observer rows.

## 6. Kill criterion

The switch corrects an input; it removes no prescription, so under the Track E keep rule it cannot go on by default from this stage. Its verdict is one of:
- **Keep (provisional, candidate input for the E stack)** if T passes viability (no starvation death; no adult or juvenile class falling faster than 0.05% of its store a day while R's does not) and the band-distance checks below hold.
- **Keep conditional on the gut (finding)** if T fails viability, the gut-binding test of §4 holds, and G passes viability and the band checks: the corrected food energy needs a foregut at the top of its assumed range, and the gut volume becomes the input to source next. The default of `digestaGutMlPerKg` does not move here.
- **Null** if any of:
  1. T fails viability and either the gut does not bind in T or G also fails viability (the correction cannot be carried by the rest of the physiology);
  2. in the arm being judged (T, or G under the conditional verdict), the eating minutes of a class that is not gut-bound (males in T; all adults in G) rise by less than 20% over R (food energy does not drive feeding time as registered);
  3. on rows scored in both that arm and R, fitted band distance rises by more than 0.3 or held-out by more than 0.5 (E0's noise floor).

Never grounds to change an input: a miss of T-ENE-1 to T-ENE-3, of any T-ACT row, or of T-HUN-1. They are findings.

## 7. Iterations

At most three, each a change of mechanism logged here with its reason before its run. No input is moved to hit a target; the gut volume is moved only in the registered sensitivity arm G.

Not run (budget, shared machine): body mass 35.2 kg (Mahale females) and a fibre credit of 1.0 kcal/g, both suggested by the audit as sensitivities; fibre digestibility 0.543.

## 8. Results

(Filled in after the runs.)
