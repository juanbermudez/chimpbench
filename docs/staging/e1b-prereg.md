# E1b pre-registration: digestion (gut fill, fibre, passage)

Registered 1 October 2026, before any run of the model with `ledgerDigesta` 1 (tests included). Track E, stage E1b, on branch `e1b-digestion` (from `track-e`: E1 `energyLedger`, E2a `rhythmSleep`, `rhythmHeat`, all off by default). The switch is 0 in both profiles, so nothing changes on `track-e` or `main`.

**Rule served.** Field values of behaviour are targets, never inputs. Only physiology or physics measured independently of the behaviour may be a parameter. No input below will be moved to hit a target; a miss is diagnosed term by term and reported.

## 0. The question, and what the sources already say about it

Two findings point at digestion. E1: with food at its measured energy and sourced expenditure, adults balance at about 1.2 × resting, eat 1,100–1,500 kcal in 140–175 min a day, against 2,479 ± 858 kcal and 309 ± 85 min in the field (uwimbabazi2019). E2a: with the clock-written midday rest removed, midday rest does not emerge, and the late-afternoon feeding peak of the baseline was made by the clock.

The reading to test: if the energy a wild chimpanzee absorbs from fibrous, seed-laden fruit is well below the formula value, field intake, field feeding time and measured expenditure could all hold at once, and a bulk-limited gut would make digestive pauses.

**The sources test the first half before any run, and it fails.** Arithmetic from verified numbers only:

| | Ripe fruit (drupes) | Figs | Fallback (pith + young leaves) |
| --- | --- | --- | --- |
| Dry matter per formula kcal (uwimbabazi2019 Table 1) | 3.0 / 9.9 = 0.303 g | 4.2 / 12.5 = 0.336 g | 1.89 / 4.2 = 0.449 g |
| Fibre (NDF) share of dry matter (Table 2, organic-matter basis) | 0.415 | 0.415 | 0.534 |
| Share of formula energy credited to fibre (1.6 kcal/g NDF) | 20% | 22% | 38% |
| Fibre yield actually absorbed: 3 kcal/g × digestibility 0.449 (gorillas on a fibrous diet, remisDierenfeld2004 via masi2015) | 1.35 kcal/g, 84% of the credit | same | same |
| Absorbed ÷ formula energy | **0.968** | **0.965** | **0.939** |

The non-fibre fractions (sugars, available protein, lipid) enter the formula at Atwater factors that are already net of digestion; no source says wild chimpanzees absorb less of them. Great-ape fibre digestibility runs 0.45–0.75 (orangutans, schmidt2005), and the chimpanzee credit implies 0.53: at any of these values the discount is at most 6%. To make 2,479 formula kcal hold with 1,300–1,450 kcal of expenditure (pontzer2016 scaled), absorbed ÷ formula would have to be about 0.55. **No measured digestibility comes near that.**

What could still close part of the gap, and was not reached:
- **Swallowed seeds.** Kibale chimpanzees are "seed swallowers" (lambert1999); 98.5% of 1,849 Kibale dung samples held seeds, viable after passage (wrangham1994); a wild Mahale female held 258.8 g of dry seeds in her gut (nakamura2017). If uwimbabazi2019's food samples include swallowed seeds, their dry matter (and the energy the formula credits to their lipid, protein and fibre) is counted but passes out. Whether they do was not reached (the full text could not be reopened; e-sources did not record it). Not modelled: no number.
- **The field method itself.** The same method gives wild western gorillas 5,038 kcal/d (silverback) and 9,683 kcal/d (lactating females) (masi2015), and mast-season orangutans "several thousand calories" above requirements (knott2005). Direction only: field formula intake overstates absorbed energy by more than digestibility explains.

So E1b cannot be expected to bring T-ENE-1 to T-ENE-3 into their bands. What it can still do is the second half of the reading: shape the day through bulk, and add the one sourced expenditure term the ledger lacks (diet-induced thermogenesis; §3).

## 1. Prescriptive rule removed

None directly. E1b replaces a design structure of E1: the gut held energy (25 kcal/kg, an assumed capacity) and hunger read energy in it. With the switch on, the gut holds dry matter with measured densities, and fibre has its own slow pool. Prescription count is not expected to fall; by the Track E keep rule the switch therefore cannot go on by default from this stage alone.

## 2. Mechanism (`src/sim/energy.ts`, `ledgerDigesta` 1, read only with `energyLedger` 1)

Per individual, three more pools: foregut dry matter `dm` (g) and its fibre `fib` (g), hindgut fibre `hind` (g). The E1 `gut` now holds the foregut's non-fibre energy (kcal).

1. **Eating.** A food of kind drupe, fig, fallback, meat or milk brings, per formula kcal eaten: dry matter g, fibre g = g × NDF share, non-fibre energy 1 − 1.6 × fibre g. Only what fits in the foregut's dry-matter capacity is eaten. `fin` (formula kcal) and `dmIn` (g) are kept for comparison with T-ENE-1 and T-ENE-3.
2. **Foregut.** Each tick a share 1 − exp(−dt / `ledgerGutEmptyH`) (3 h, E1's value) leaves. Its non-fibre energy is absorbed; its fibre moves to the hindgut, and only as much as the hindgut has room for: a full hindgut slows the foregut's emptying in proportion (the colonic brake on gastric emptying; physiology, no number used).
3. **Hindgut.** Fibre leaves first-order at k = 1 / ((MRT − 3 h)(1 − d)): a share d is fermented (absorbed at 3 kcal/g), the rest passes out (`fec`). So the fermented share is the measured digestibility d, and residue leaves after the measured mean retention time.
4. **Diet-induced thermogenesis.** `digestaTefFrac` × energy absorbed is spent (expenditure term `digestion`).
5. **Hunger readout.** Foregut emptiness by bulk, 1 − `dm` ÷ capacity, × E1's appetite (reserves). The intake valuation of options (intake.ts) still compares foods by energy: the gut capacity it reads is the foregut's capacity expressed in kcal of drupes.

Conservation, per individual and exact: in − out − fec = Δ(gut + 3 × (fib + hind)) + Δreserves, where `in` counts fibre at its fermentation yield.

**How a food option reads the gut (noted on the coordinator's report of E3, received before registration).** E3 found that when an option's worth reads only the gut space free now, a small gut makes walking to a fruit crown rarely pay (with E3's persistence test, T-FOOD-2 fell to 0.33 and infants of 2–5 y lost reserve faster); its conclusion is that food should be valued against the reserve deficit over the coming hours as well. E1b does not change how options are valued: the rules still read hunger = foregut emptiness × appetite (appetite from reserves, E1's readout), and the intake valuation still reads energy, in kcal of drupes per foregut capacity. But E1b's foregut holds 26% fewer kcal of drupes than E1's gut (579 against 783 at 31.3 kg), so any valuation that reads momentary gut space (E3's) would see even less room. E3 is not in this branch's stack; the interaction is flagged, not tested here.

## 3. Inputs

| Input | Value | Source | Evidence |
| --- | --- | --- | --- |
| Dry matter per minute: drupes, figs | 3.0, 4.2 g/min (same records as 9.9, 12.5 kcal/min) | uwimbabazi2019 Table 1 | [H] |
| Dry matter per minute: fallback | 1.89 g/min (pith 1.8, young leaves 2.1, weighted 17.4 : 6.9) | uwimbabazi2019, potts2011 | [H] |
| Fibre share: ripe fruit; fallback | 0.415; 0.534 (pith 0.581, leaves 0.431, weighted by dry matter) | uwimbabazi2019 Table 2 (organic-matter basis taken as dry matter) | [H] |
| Fibre credit inside the formula | 1.6 kcal/g (only to split formula energy) | uwimbabazi2019 | [M] |
| Energy absorbed per g fibre fermented | 3 kcal/g | masi2015 (full text: "3 kcal/g × 0.449"), after Conklin-Brittain et al. 2006 | assumed |
| Fibre (NDF) digestibility | 0.449 | remisDierenfeld2004, via masi2015 (captive gorillas, highly fibrous diet) | assumed, cross-species |
| Mean retention time | 38 h | miltonDemment1988 (34% NDF diet; 38 h seen in a snippet, 48 h on 14% NDF confirmed by milton1999 FT) | assumed |
| Gut volume | 83 mL/kg (3,329 mL ÷ an assumed 40 kg reference) | nakamura2017 (abstract: 489.4 cm³ = 14.7% of the reported captive capacity; derived) | assumed |
| Foregut share of gut volume | 0.45 | stomach 17–20%, small intestine 23–28% (Milton 1987, secondary); colon > 45% (milton1999 FT) | assumed |
| Dry matter per mL: foregut; hindgut | 0.15; 0.20 g/mL | none (human contents) | assumed |
| Meat, milk dry matter per kcal | 0.23, 0.185 g/kcal | food table via hardus2012; human milk 0.67 kcal/g (butteKing2005); solids assumed | assumed |
| Diet-induced thermogenesis | 0.10 of energy absorbed | westerterp2004 (5–15% of daily expenditure), westerterp1999 (10.5–14.6% of intake) | assumed, human |

Derived capacities: foregut 5.6 g/kg (175 g at 31.3 kg, which is 579 kcal of drupes against E1's 783 kcal), hindgut 9.1 g/kg (286 g at 31.3 kg).

### 3.1 Pre-registered check: does the ledger reproduce a captive day? (the anchored-cost question)

A captive-like day with the ledger's own terms: 12 h asleep at the resting rate, 12 h awake at 1.25 × (3 h of it feeding at 1.38 ×), Kleiber 70 × M^0.75, plus pontzer2016's own estimate of walking and climbing (102 kcal/d for females, 120 for males). Compared with pontzer2016's doubly labelled water.

| | Mass | DLW (pontzer2016) | Ledger without DIT | Ledger with DIT 0.10 |
| --- | --- | --- | --- | --- |
| Females | 46.4 kg | 1,722 ± 363 | 1,522 (−11.6%) | 1,691 (−1.8%) |
| Males | 57.9 kg | 2,145 ± 546 | 1,797 (−16.2%) | 1,996 (−6.9%) |

Feeding hours from 2 to 5 move these by under 1.5%. **Rule fixed now:** the ledger "reproduces" pontzer2016 if both sexes fall within ±10% of the means. Without DIT it does not; with DIT 0.10 it does. So DIT, a measured (human) physiological term, is added, and **no other anchored activity cost** is added (an awake multiplier fitted to pontzer2016 would be a fit, and is not needed). Caveat: if Leonard & Robertson's activity multiples (1.25, 1.38) already contain some DIT, this counts it twice; their derivation was not read.

## 4. Predictions (by hand, from the inputs, against arm 1)

Arm 1 = `energyLedger` 1 + `rhythmSleep` 1 + `rhythmHeat` 1, measured on this branch before E1b ran (seeds 48 and 7, 30 + 60 days; `artifacts/validation/e1b/arm1*`): adult females (not pregnant or lactating) eat 1,106 kcal and spend 1,114, eating 145 min (forage 148); males 1,333 kcal, 151 min; lactating females 1,477, 173 min. Observer: T-ACT-1 0.27, T-ACT-2 0.15, T-ACT-3 0.26, T-ACT-4 0.45, T-FOOD-2 0.65, T-FOOD-4 3.0. Hourly: feeding 32% / 22% / 20% in the first three hours / middle / last three hours of the day; rest 22% / 30% / 33%.

Expected with `ledgerDigesta` 1 (arm 2):

| Row | Band (field) | Arm 1 | Expected arm 2 | Reason |
| --- | --- | --- | --- | --- |
| Expenditure, adult females / males | — | 1,114 / 1,343 | 1,230–1,250 / 1,480–1,500 | + DIT |
| T-ENE-8 expenditure ÷ M^0.75, non-reproducing adults (held out) | 85–130 | 84 F, 86 M | 92–95 | into the band |
| T-ENE-1 formula intake, adult females (held out) | 1,900–3,100 | 1,106 | 1,250–1,350 | **miss, low** (§0) |
| T-ENE-2 eating minutes, adult females (fitted) | 250–370 | 145 | 160–190 | **miss, low**; +10–30% |
| T-ENE-3 dry matter, adult females (held out) | 650–1,100 g | — | 420–500 g | **miss, low** |
| T-ACT-1 feeding share | 0.33–0.50 | 0.27 | 0.29–0.33 | up, probably still below |
| T-ACT-4 rest + groom | 0.30–0.47 | 0.45 | 0.41–0.45 | down a little |
| T-ACT-3 grooming | 0.08–0.18 | 0.26 | 0.23–0.26 | down a little, still above |
| T-ACT-2 travel | 0.12–0.25 | 0.15 | 0.15–0.17 | unchanged or up (more, smaller meals) |
| T-FOOD-4 trees per day | 4–15 | 3.0 | 3.3–4.0 | up: meals 26% smaller |
| T-FOOD-2 fruit share of feeding | 0.60–0.78 | 0.65 | 0.62–0.68 | no direction (fallback fills faster per kcal, but options are still valued by energy) |
| T-RHY-9 hourly pattern | early and late feeding peaks, rest highest midday | early peak only | **unchanged: early peak only, rest not highest at midday** | the gut's constants (3 h, about 19 h in the hindgut) carry no daily phase except the dawn start |
| Hindgut fill, adults | — | — | mean 0.45–0.65; full (≥ 95%) < 5% of daylight | at central capacity the hindgut binds only on near-pure fallback diets |
| Viability | no starvation | 0 deaths | 0 deaths; adult reserves within ±1% of store of arm 1 | |
| Infants 0.5–5 y | — | reserves fall (−0.10 → −0.29 of store in 60 d, E1's open problem) | **fall faster** | DIT costs them about 10% of an intake already capped by the milk yield |

## 5. Kill criterion

The result is **null** (the switch leaves the E stack), if on seeds 48 and 7 with 30 + 60 days, against arm 1:
1. any death by starvation, or any adult class whose reserves fall steadily (below −0.05% of the usable store per day) while they do not in arm 1; or
2. the fitted band distance rises by more than 0.3, or the held-out band distance by more than 0.5 (E0's spread between quick and confirm runs); or
3. the mechanism moves nothing it was registered to move: T-ENE-8 does not enter its band and T-ENE-2 eating minutes rise by less than 8%.

Otherwise it is **kept** in the E stack as a candidate, still off by default (no prescription removed). The registered misses of T-ENE-1 to T-ENE-3 and of T-RHY-9 are not grounds to change an input; they are findings.

## 6. Benchmark

Field profile, seeds 48 and 7 only, 30-day burn-in + 60 days, `--workers 2`, one heavy run at a time:
- arm 0: no switches; arm 1: `{"energyLedger":1,"rhythmSleep":1,"rhythmHeat":1}`; arm 2: arm 1 + `{"ledgerDigesta":1}`.
- `scripts/e-bench.ts --quick --days 60 --workers 2 --params … --out artifacts/validation/e1b/<arm>`; `scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 60`; `scripts/rhythm-metrics.ts` (same window).
- T-ENE rows are staged (not in `data/targets.json`), so they are read from `energy-diagnose` (simulation truth).

## 7. Further runs (each logged here before it runs)

- **S1, bounded sensitivity on the unsourced capacity** (registered now; not a candidate default): the low end of the assumed ranges, `digestaGutMlPerKg` 60, `digestaForegutDmGPerMl` 0.10, `digestaHindgutDmGPerMl` 0.15 (foregut 85 g, hindgut 155 g at 31.3 kg). It asks whether a bulk-limited gut can make a midday pause and longer feeding at all. Expected: hindgut full a substantial share of daylight (over 20%); eating minutes up again (females 180–230); rest possibly highest in the middle third; fallback-heavy animals in deficit (viability risk). Whatever it shows, the capacity stays an assumption until a source gives it.
- **Iterations 2–3**, only for a flaw of mechanism found in a run, logged here first.

## 8. Results

(To be filled after the runs.)
