# E1h pre-registration: food energy from measured sugars (the field formula's TNC by difference removed)

Registered 1 October 2026, before any run of the changed code (tests included). Track E, stage E1h, branch `e1h-food-energy` (from `track-e` at eb51b39, which carries the field audit). New switch `ledgerFoodEnergyFix`, 0 by default in both profiles, read only with `energyLedger` 1: compressed goldens and the field pin in `tests/sim-track-e.test.ts` cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. This stage corrects an input, the energy a feeding minute delivers, from the measured composition of the foods and a formula that has been checked against doubly labelled water. It is not fitted to anything: the values below are fixed by arithmetic here, before any run, and stay whatever the result. A miss is a finding.

## 0. Why (docs/staging/e-field-audit.md)

- The model's food energy per feeding minute (drupes 9.9, figs 12.5, fallback 4.2 kcal/min) is uwimbabazi2019's, computed with the field formula ME = 4 TNC + 4 AP + 9 lipid + 1.6 NDF (kcal per 100 g organic matter), with TNC (total non-structural carbohydrate) obtained by difference: 100 − NDF − lipid − AP − ash.
- TNC by difference credits at 4 kcal/g everything that is not fibre, protein, lipid or ash: starch, pectin and other soluble fibre, organic acids, tannins and other phenolics, and assay error. At Kanyawara it is 2.7 × the measured water-soluble sugar (WSC) in ripe fruit, 4.4 × in figs, 6.0 × in young leaves (Table 2 below).
- Where the same kind of formula can be paired with doubly labelled water in the same species, it gives 1.13–1.92 × measured expenditure (7 species); the version built from measured sugars plus a pectin (and starch) estimate does not differ from it (8 species) (simmen2017, supplement Table S5; §1.2).
- E1g found intake capped by foregut throughput near 1,980 formula kcal for adult females (650–660 g of dry matter), and the audit predicts that correcting food energy will expose the same ceiling, because the same energy then needs 1.3–1.5 × the dry matter.

## 1. Sources (verified 1 October 2026; added to docs/research.md §E.23 and docs/staging/e-sources.md §23)

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

Runs: field profile, seeds 48 and 7, 30-day burn-in + 60 days, `--workers 1`, one at a time, rules policy, outputs in `artifacts/validation/e1h/` (not tracked: `ref*`, `T*`, `G*`, `*-vs-ref*`, `runs.log`). R ran on eb51b39 + the prereg (unchanged simulation code); T and G on da75162. R's energy diagnosis was repeated on da75162 with the switch off (`ref2-energy`): every class row is identical to the first run, so the switch-off identity holds over the whole 90-day window, not only in the unit tests. Unit tests (`tests/sim-food-energy.test.ts`): the registered arithmetic, switch-off identity (key absent, 0, and 1 without the ledger), exact conservation with the fix on, batching determinism, plain-data saves. `pnpm test` 618 pass, 1 skipped; `tsc --noEmit` clean; goldens and the field pin unchanged. No iteration was run (§8.4).

### 8.1 Energy (simulation truth, `energy-diagnose`), per day

| Class | R: eaten / absorbed / spent / eat min / dry g | T (fix) | G (fix + gut 111 mL/kg) |
| --- | --- | --- | --- |
| Lactating females | 1,725 F / 1,661 / 1,693 / 205 / 571 | 1,380 S / 1,312 / 1,668 / 225 / 621 | 1,734 S / 1,648 / 1,709 / 266 / 783 |
| Other adult females | 1,308 F / 1,255 / 1,257 / 176 / 458 | 1,347 S / 1,277 / 1,290 / 236 / 626 | 1,348 S / 1,277 / 1,277 / 225 / 634 |
| Pregnant females | 1,415 F / 1,358 / 1,364 / 183 / 491 | 1,429 S / 1,356 / 1,430 / 247 / 656 | 1,456 S / 1,378 / 1,390 / 243 / 686 |
| Adult males | 1,567 F / 1,510 / 1,512 / 180 / 522 | 1,611 S / 1,532 / 1,540 / 248 / 729 | 1,607 S / 1,527 / 1,531 / 240 / 736 |
| Juveniles 5–12 y | 1,256 F / 1,212 / 1,223 / 171 / 408 | 1,262 S / 1,202 / 1,242 / 230 / 561 | 1,290 S / 1,229 / 1,236 / 231 / 578 |
| Infants 2–5 y (eat min) | 84 | 112 | 110 |

F = field-formula kcal, S = sugar-based kcal; absorbed = kcal in − kcal passed out.

| | R | T | G |
| --- | --- | --- | --- |
| Lactating: absorbed ÷ spent; foregut fill (all day); daylight hunger; condition | 0.981; 0.41; 0.41; 0.66 | **0.786**; 0.45; 0.46; **0.35** | 0.964; 0.42; 0.48; 0.64 |
| Reserves ÷ store, change per day (least squares over 60 days): lactating / other females / males / juveniles / infants 2–5 y / infants 0.5–2 y | −0.055% / −0.009% / −0.005% / −0.028% / −0.012% / +0.004% | **−0.847%** / −0.033% / −0.013% / **−0.101%** / −0.014% / +0.003% | −0.104% / −0.012% / −0.006% / −0.022% / −0.016% / +0.001% |
| Lactating reserves ÷ store, day 0 → 60 of the window | −0.046 → −0.090 | −0.267 → **−0.785** | −0.061 → −0.147 |
| Deaths (starvation) | 0 (0) | 1, an infant 0.5–2 y, illness (0) | 0 (0) |

Gut-binding test (§4): in T, lactating females absorb 0.786 of what they spend at a foregut fill of 0.45, pregnant females 0.948 at 0.47: **the gut binds**, so G was run. (R's lactating fill was already 0.41, at 0.981.)

### 8.2 Rows

| Row | Band | R | T | G | Registered (T / G) |
| --- | --- | --- | --- | --- | --- |
| T-ENE-1 lactating, ledger truth, sugar-based kcal (comparison band, contested) | 1,810–2,070 | 1,725 field-formula kcal (not comparable) | 1,380 (below) | 1,734 (below by 4%) | 1,300–1,500 / 1,700–1,900: as registered |
| T-ENE-1 lactating, field method | 1,900–3,100 (field mean 2,479) | 1,749 (below) | 1,944 (in) | **2,440 (in)** | 1,800–2,050 / 2,300–2,600: as registered |
| T-ENE-2 lactating eating min | 250–370 | 205 (below) | 225 (below) | **266 (in)** | 230–260 / 280–320: slightly lower than registered |
| T-ENE-3 lactating dry matter | 650–1,100 g | 571 (below) | 621 (below) | **783 (in)** | 620–680 / 780–860: as registered |
| T-ENE-8 kcal ÷ M^0.75, non-reproducing adults | 85–130 | 96.4 | 98.3 | 97.6 | +1–3%: as registered |
| T-ACT-1 feeding (M, F) | 0.33–0.50 | 0.298 (0.285, 0.309) fail | **0.380** (0.387, 0.375) pass | **0.388** (0.384, 0.391) pass | 0.35–0.40 / 0.37–0.42 |
| T-ACT-2 travel | 0.12–0.25 | 0.154 | 0.185 | 0.180 | 0.16–0.21 |
| T-ACT-3 grooming (M, F) | 0.08–0.18 | 0.245 (0.224, 0.263) fail | 0.179 (0.152, **0.201**) fail | 0.185 (0.176, **0.193**) fail | 0.17–0.21 / 0.15–0.19: in range; females still above the band |
| T-ACT-4 rest + groom | 0.30–0.47 | 0.462 | 0.370 | 0.355 | 0.34–0.42 / 0.32–0.40 |
| T-HUN-1 hunts per community-year | 5–25 | 54.8 | 44.6 | 41.6 | within ±30% of R: yes (−19%, −24%) |
| T-FOOD-2 fruit share of feeding | 0.60–0.78 | 0.702 | 0.778 (top edge) | 0.757 | +0.02 to +0.08: as registered |
| T-FOOD-4 trees per day (held out) | 4–15 | 5.6 | 7.3 | 6.0 | +20–50%: T yes, G +7% (no) |
| T-RNG-4 male day range, km | 1.5–3.5 | 1.93 | 2.35 | 2.21 | 2.0–2.4 |
| T-RNG-5 lactating ÷ male day range (held out) | 0.3–0.6 | 0.734 | 0.689 | 0.737 | no trend: as registered |
| T-PTY-1 party size | 3–9 | 3.77 | 3.22 | 3.42 | — |
| Fitted / held-out distance (all scored rows) | — | 5.293 / 4.759 | 3.276 / 3.663 | 3.884 / 4.333 | — |
| On rows scored in both arm and R: fitted / held-out | — | — | **−1.864** (18 rows) / **+0.005** (13) | **−1.256** (17) / **+0.676** (13) | kill at > +0.3 / > +0.5 |
| Prescription count | — | 103 | 103 | 103 | unchanged |
| Viability (e-bench: births, deaths, starvation) | — | pass | pass (1 illness death) | pass | — |

The fitted fall is T-ACT-3 (−0.53 / −0.57), T-ACT-1 (−0.20 / −0.20) and T-HUN-1 (−0.51 / −0.66), plus rare-event rows that move both ways (T-COM-11, T-PAT-6, T-HUN-2, T-HUN-7; in G T-SOC-9 +0.65). The held-out rise in G is **T-HUN-4** (more males, more hunting; a regression on few hunts): 0.45 → 1.41 (+0.96); without it G's shared held-out change is −0.28. T-HUN-4 rose in T too (+1.25), offset there by T-IGE-2, T-HUN-8 and T-SOC-10. E0 measured row moves of up to 0.8 between seed sets for such rows.

### 8.3 Against the predictions

Held:
- eating minutes where the gut does not bind: males +38% in T (registered 35–45%); every adult class +28–33% in G (slightly under);
- gut binding in T, and its size: mothers absorb 1,312 of 1,668 kcal, reserves −0.85%/day (registered −0.8 to −1.0);
- every T-ENE value in both arms within or at the edge of its registered range, except T-ENE-2 (225 and 266 against 230–260 and 280–320);
- T-ACT-1, 2, 3, 4, T-HUN-1, T-FOOD-2, T-RNG-4, T-RNG-5 in their registered ranges in both arms; T-ENE-8 +1–2%;
- other females, juveniles and males in T as registered (−0.03, −0.10, −0.01%/day).

Missed:
- starvation deaths in T: registered 3–10, measured 0. Mothers started the window at −0.27 of the store and ended at −0.79; at −0.85%/day the first would starve within about a month more;
- T-FOOD-4 in G (+7%, registered +20–50%);
- G's lactating slope (−0.10%/day, registered 0 to −0.2: inside, but twice R's).

### 8.4 Kill criterion and verdict

- **T: viability fails.** Juveniles lose 0.10% of their store a day against R's 0.03%; mothers lose 0.85% a day against R's 0.055% (R's mothers are themselves just beyond the 0.05% line, so by the literal wording of §6 only the juveniles trip it; in substance the mothers fail by a factor of 15). The gut binds (§8.1), so the verdict turns on G.
- **G:** viability passes by the registered wording (no starvation; mothers −0.10%/day, but R's mothers also exceed 0.05%/day; every other class at or better than R). Mechanism check 2 passes (every adult class +28–33% eating minutes). Check 3: fitted −1.26, **held-out +0.68 on shared rows, above the registered +0.5**, entirely T-HUN-4.
- **Verdict: null under the registered criterion 3** (`ledgerFoodEnergyFix` stays 0 and is not added to the stack yet). It is a narrow null, driven by one rare-event held-out row in a 2-seed, 60-day run; T itself, at the central gut, leaves held-out unchanged (+0.005) and lowers fitted distance by 1.86 but starves mothers through the gut. What would settle it: the integrator's 5-seed confirm (`e-bench --confirm`) of T and G against R. The default of `digestaGutMlPerKg` does not move.
- **No iteration.** Neither miss is a flaw of the E1h mechanism: T's failure is the throughput of E1b's assumed foregut, which the stage registered as its expected exposure, and G's is a held-out hunting regression with no energetic route to the food correction. Changing the mechanism to rescue either would be fitting.

### 8.5 Reading

- **The correction does what physiology says it should.** With the energy of a feeding minute computed from measured sugars, adults eat 28–38% longer, and the activity rows that the E stack lost through spare time come back without any expenditure multiplier: T-ACT-1 0.30 → 0.38, T-ACT-4 0.46 → 0.36, grooming 0.25 → 0.18, hunts 55 → 42–45 per community-year. E1g needed `ledgerWildCostMult` ≈ 1.6 (PAL ≈ 2.15) for the same rows; here k stays 1 and expenditure is unchanged (T-ENE-8 96 → 98).
- **The field method and the model now agree on the field's own terms.** At the gut's upper bound, the model's nursing mothers eat 266 min (field 309 ± 85), 783 g of dry matter (field 873 ± 289), and an observer applying the field's kcal/min to what they eat would record 2,440 kcal/day (field 2,479 ± 858). Their ledger truth is 1,734 sugar-based kcal, 4% below the audit's comparison band (1,810–2,070), and they absorb 1,648 kcal against 1,709 spent. The factor of about 1.9 that E1–E1g could not explain is the formula and the comparison class, as the audit argued.
- **The foregut is the binding input.** At E1b's central volume (83 mL/kg) the foregut passes about 620 g of dry matter a day for a 31 kg female, and mothers fall 0.85% of their store a day. At 111 mL/kg (3,329 mL ÷ 30 kg, the top of the assumed range) they pass 783 g and nearly balance. The field's 873 g/day, which the formula does not touch, says the same. Gut volume is assumed (one captive capacity of unknown body mass, cited through nakamura2017's abstract, probably from chiversHladik1980), and so are the digesta dry-matter densities and the 3-hour emptying; the gut is now the input to source.
- **What stays unexplained:** female grooming 0.19–0.20 (band ≤ 0.18), hunting at about 2 × the band, lactating mothers still losing reserve at 0.1%/day even with the larger gut (absorbed 0.96 of spent: E1e's satiation curve caps a mother's fill near 0.42), and T-RNG-5 (mothers range 0.7 × as far as males, band 0.3–0.6).

**Biggest open problem.** Gut capacity. Every arm now hinges on it: with corrected food energy the model's mothers need about 790 g of dry matter a day, the central assumed foregut passes about 620 g, and the only chimpanzee gut volume in hand is one captive capacity of unknown body mass, read through an abstract. Sourcing the gut (chiversHladik1980's chimpanzee volumes and the animal's mass, digesta dry matter, gastric emptying of fruit meals) is the step before this switch or any later E1 stage can be judged.

## 9. Five-seed confirm (integrator, registered 1 October 2026 before its run)

Why: §8.4 left a narrow null on 2 seeds, driven by one rare-event held-out row (T-HUN-4). No 5-seed R existed, and neither saved all-off baseline matches the current head (handoff §5.1), so all four arms run fresh from one commit.

Runs: field profile, `e-bench --confirm` (seeds 48, 7, 21, 5, 11; 30-day burn-in + 60 days), `--workers 2`, rules policy, one bench at a time, from the frozen detached checkout `.claude/worktrees/bench-run` at the commit that adds this section (code identical to 56342c2). Outputs in `artifacts/validation/e/` (gitignored).
- **B** all switches off, a fresh baseline at this commit (`base-head`).
- **R**, **T**, **G** exactly as §4 (`e1h-R`, `e1h-T`, `e1h-G`). R is compared with B (context: the stack against today's model); T and G with R (the verdict).
- Simulation truth: `energy-diagnose --seeds 48,7,21,5,11 --burn-in 30 --days 60 --params <arm> --json` for R, T and G, run one at a time beside the bench chain (one process). It gives the reserve slopes by class, the gut-binding test of §4 and the eating minutes of check 2.

Judgement: §6 unchanged (viability; check 2, eating minutes +20% in classes that are not gut-bound; check 3, fitted > +0.3 or held-out > +0.5 on rows scored in both arm and R). Every shared-row sum is reported twice: all shared rows, and without T-HUN-4 and T-BRD-1. **The verdict uses all shared rows, as registered.** If it differs without the two rare-event rows, it is written as "null as registered; passes without the rare-event rows" and is not flipped by this run. The single noise threshold that the integrator sets next (handoff §5.5, from noise arms on other perturbations, independent of these results) may then be applied to the saved JSONs with `--rescore`, no new simulation, and recorded as a separate, later reading. Deaths are checked by cause (respiratory outbreaks kill animals at random); only starvation deaths count against viability. G stays a sensitivity arm: the default of `digestaGutMlPerKg` does not move from this run.

Expected (integrator, before the run): T fails viability as on 2 seeds (lactating reserves −0.7 to −1.0% of the store a day; moderate confidence); the gut binds in T (moderate); G passes viability (moderate); fitted distance falls by at least 0.5 against R in both T and G (moderate); G's held-out change on shared rows within ±0.5 once T-HUN-4 is pooled over 5 seeds (low).
