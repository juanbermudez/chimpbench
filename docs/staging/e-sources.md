# Track E sources: energetics, daily rhythm and endocrine correlates

Evidence pass for Track E (IMPLEMENTATION_PLAN.md, "Track E: Emergence"), 1 October 2026. Nothing here is implemented.

**Rule applied.** Physiology and physics measured independently of behaviour may be a model input. Field values of behaviour are targets, never inputs.

**How to read the tags.**
- Bibliographic data (authors, year, journal, volume, pages, DOI) were checked against the Crossref API on 1 October 2026.
- FT = full text read (PMC or publisher page). Abs = abstract only. "Secondary" = the number was seen only as cited by another paper or in a search snippet.
- [H], [M], [L] rate the observation in its own population, not its transfer to Kibale.
- "Cross-species" = no chimpanzee value exists; the value is human or from other primates and enters the registry as *assumed*.
- "Derived" = arithmetic done here from the cited numbers.

## 1. Summary table

### E1 energy: inputs

| Quantity | Recommended value (range) | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Adult body mass, wild eastern chimpanzees | Males 39 kg, females 31.3 kg (Gombe medians). Mahale: 42.0 and 35.2 kg. Sensitivity range 31–42 kg | pusey2005 (Abs), ueharaNishida1987 (Abs) | [H] | input |
| Age at which mass growth slows | Females 10 y, males 13 y (Gombe) | pusey2005 (Abs) | [M] | input (growth knee) |
| Birth mass | 1.8 kg, not verified to a primary source | none | assumed | input |
| Kibale body mass | No value exists (animals are not weighed) | — | gap | — |
| Total energy expenditure (doubly labelled water), genus *Pan*, captive adults | Females 1,722 ± 363 kcal/d at 46.4 kg; males 2,145 ± 546 kcal/d at 57.9 kg. Derived: 97–102 × M^0.75 kcal/d | pontzer2016 (FT) | [H] captive; [M] as a wild value | check on the ledger, not a set value |
| Basal metabolic rate, *Pan* | 1,214 kcal/d (46.4 kg), 1,401 kcal/d (57.9 kg): estimated from juvenile respirometry, not measured in adults. Derived: 67–68 × M^0.75, i.e. Kleiber × 0.96 | pontzer2016 (FT) | [M] | input |
| Kleiber equation | 70 × M^0.75 kcal/d | kleiber1947 (standard reference) | [H] as an equation; cross-species | input (fallback) |
| Physical activity level (TEE ÷ BMR), captive *Pan* | 1.4 females, 1.5 males | pontzer2016 (FT) | [M] | check |
| Activity multipliers of BMR | 1.25 rest and other, 1.38 feeding (as used for Taï by nguessan2009, from Leonard & Robertson 1997) | nguessan2009 (FT), leonardRobertson1997 (Abs) | assumed, cross-species | input |
| Cost of quadrupedal walking | 0.19 ml O₂ kg⁻¹ m⁻¹ (SE 0.013; individuals 0.14–0.29) = 3.8 J kg⁻¹ m⁻¹ (2.8–5.8), net, at 1.0 m/s | sockol2007 (FT) | [H] captive, n = 5 | input |
| Walking cost, general mammal equation | 10.7 × M^−0.316 J kg⁻¹ m⁻¹. Gives 2.9 at 59.8 kg, about 30% below the chimpanzee measurement | taylor1982 (Abs) | [H] as an equation | fallback only |
| Cost of vertical climbing | 49–70 J kg⁻¹ m⁻¹ of height. 70 = primate regression 107.4 × M^−0.119 extrapolated from ≤ 1.5 kg to 35 kg; 49 = m·g·h at 20% efficiency; the physical floor is 9.8 | hanna2008 (Abs), hannaSchmitt2011 (FT) | [L], cross-species | input |
| Walking speed, wild | 0.88 m/s males, 0.78 m/s females, 0.75 m/s with infant (Mahale, Hunt 1989 as cited) | nguessan2009 (FT), secondary | [L] | input |
| Energy intake rate by food | Ripe fruit 10.7 ± 1.3 kcal/min (figs 12.5, drupes 9.9), young leaves 6.2 ± 0.6, pith 3.4 ± 2.2; unripe fruit 9.0 ± 3.4, flowers 7.7 ± 1.0 | uwimbabazi2019 (FT) | [H] | input (already registered) |
| Dry-matter feeding rate | 3.4, 2.1 and 1.8 g/min (ripe fruit, young leaves, pith) | uwimbabazi2019 (FT) | [H] | input |
| Energy density of foods (derived) | Ripe fruit 3.1–3.2 kcal per g dry matter; young leaves 3.0; pith 1.9 | uwimbabazi2019 (FT), derived | [M] | input |
| Metabolisable-energy formula | 4 kcal/g protein and non-structural carbohydrate, 9 kcal/g lipid, 1.6 kcal/g fibre (NDF) | uwimbabazi2019 (FT), nguessan2009 (FT) | [M]; the fibre credit is likely too high | input |
| Water content of foods | No verified Kibale value | — | gap | — |
| Meat intake rate | 348 g/h; up to 1.9 ± 1.2 kg/h. Energy 115 kcal per 100 g (USDA value assumed for red colobus). Derived: 6.7 kcal/min (to about 36) | hardus2012 (FT), secondary | [L] | input |
| Gastric emptying | More than 3 h and less than 16 h | ardente2011 (Abs) | [M] captive | input (bounds) |
| Gut transit, first marker | 16.5 h mean | ardente2011 (Abs) | [M] captive | input |
| Mean transit time of markers | 38 h (34% fibre diet), 48 h (14% fibre diet): secondary, not confirmed in the abstract | miltonDemment1988 (Abs) | [L] as read | not for the energy pool |
| Energy cost of lactation | Human: milk 749 g/d × 2.8 kJ/g = 501 kcal/d; synthesis efficiency 0.80; total 626 kcal/d, of which 172 kcal/d from tissue | butteKing2005 (Abs) | [H] human; cross-species | input, assumed |
| Energy cost of pregnancy | Human: 321 MJ total (76,700 kcal, deposition included) for 12 kg gain; 90, 287 and 466 kcal/d by trimester | butteKing2005 (Abs) | [H] human; cross-species | input, assumed |
| Lactation and pregnancy as a multiplier | +50% and +25% of daily expenditure (Key & Ross 1999 as used for Taï) | nguessan2009 (FT), secondary | [L] | alternative, assumed |
| Energy cost of growth | 4.5 kcal per g gained (range 2.9–6.0), human infants | robertsYoung1988 (Abs) | [H] human; cross-species | input, assumed |
| Body fat | Females 9.0 ± 5.5%, males 8.4 ± 4.9% of body mass (captive *Pan*); wild animals are expected to be leaner | pontzer2016 (FT) | [M] captive | input (upper bound for reserves) |

### E1 energy: targets

| Quantity | Field value | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Daily metabolisable energy intake, adult females | 2,479 ± 858 kcal/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-1) |
| Daily feeding time, adult females | 308.7 ± 85 min/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-2) |
| Daily dry-matter intake | 872.6 ± 289 g/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-3) |
| Energy balance and fruit | Urinary C-peptide rises with fruit in the diet (519 samples, 13 males, Kanyawara); rises with food availability in both sexes at Taï | emeryThompson2009 (Abs), vale2020 (Abs) | [M] | target, direction (T-ENE-4) |
| Energy balance through lactation | Depressed for about 6 months after birth, net increase through the second year (17 mothers) | emeryThompson2012 (Abs) | [M] | target, direction (T-ENE-5) |
| Energy balance and males in the party | Females have lower C-peptide when they associate with more males | emeryThompson2014 (Abs) | [M] | target, direction (T-ENE-6) |
| Male feeding and mating effort | Males feed less on days with oestrous parous females (12 males, 11 months) | georgiev2014 (Abs) | [M] | target, direction (T-ENE-7) |
| Energy balance and rank | Low-ranking Kanyawara males had higher C-peptide than dominant males | emeryThompson2009 (Abs) | [M] | target, direction (T-ENE-8) |
| Feeding and travel when food is scarce | Taï: shorter daily journey and more feeding time in periods of scarcity | nguessan2009 (FT abstract), vale2020 (Abs) | [M] | target, direction (T-ENE-9) |

## 2. Gaps and known conflicts (E1)

1. **Intake and expenditure do not match.** The Kanyawara intake estimate (2,479 kcal/d) is 1.5–1.9 times the expenditure that doubly labelled water implies for a 31–35 kg female (about 1,300–1,450 kcal/d at the captive activity level; about 1,600 kcal/d at an activity level of 1.75; derived).
   - Possible reasons: the fibre credit of 1.6 kcal/g on fruit that is 41.5% fibre (nguessan2009 says this credit is likely an overestimate); heavier animals at Kanyawara than at Gombe; lactation; error in feeding rates. The standard deviation of the intake estimate (858 kcal/d) is large.
   - Consequence: a ledger that conserves energy and is fed 10.7 kcal/min will be sated in far fewer than 309 minutes. Recommendation: keep intake rates as inputs, keep daily kcal and feeding minutes as targets, add no correction factor. If the targets miss, record it as a finding.
2. **No wild total energy expenditure.** No doubly-labelled-water study of wild chimpanzees exists. pontzer2014 reports that captive and wild primates have similar expenditure, across species.
3. **No adult basal rate was measured.** The *Pan* basal rate in pontzer2016 is a regression on 1930s respirometry of animals aged 2 months to 15 years.
4. **No Kibale body mass, and no wild growth curve read.** pusey2005's curves are in the paywalled full text. Recommendation: Gombe adult medians, growth knee at 10 y (females) and 13 y (males), birth mass 1.8 kg as *assumed*.
5. **No chimpanzee lactation, pregnancy or growth cost.** Human values enter as *assumed, cross-species*. Scaling by M^0.75 is a design assumption.
6. **No chimpanzee climbing cost.** The only primate measurements are on animals under 1.5 kg.
7. **No water content of Kibale foods.** uwimbabazi2019 reports dry matter only.
8. **No measured meat intake at Kibale.** The values are secondary and one is a generic food-table energy density.
9. **No stomach or meal capacity for any ape was found.**
10. **No wild body-fat value.** Reserves above about 9% of body mass as fat are unsupported.

## 3. Sources: E1 energy

### Body mass

- **Body mass, Gombe** [pusey2005] (Abs) [H].
  - Population and n: *P. t. schweinfurthii*, Gombe; 1,286 weighings of 31 males and 26 females aged 2–43 years, over 33 years.
  - Median adult mass: males 39 kg, females 31.3 kg.
  - Female growth slowed at 10 years, male growth at 13 years.
  - Mass was highest during frequent banana provisioning, higher in the wet season, and higher when the range was large and density low.
  - Rank correlated with mass in females, not in males.
  - Use in Track E: input for adult mass and the growth knee. The growth curves themselves were not read (paywalled).
- **Body mass, Mahale** [ueharaNishida1987] (Abs) [H].
  - 10 males and 9 females weighed, 1973–1980. Six adult males averaged 42.0 kg; eight adult females 35.2 kg.
  - Mass tended to fall late in the wet season.
  - Use in Track E: input for the sensitivity range of adult mass.
- **Body mass used for Taï** [nguessan2009] (FT), secondary: 46.3 kg adult males and 41.6 kg adult females for western chimpanzees, from Smith & Jungers 1997 [smithJungers1997] (Abs; the species table was not read). Not a Kibale value.

### Expenditure

- **Total energy expenditure of apes** [pontzer2016] (FT, PMC4942851) [H] for captive animals.
  - Population and n: adults (10 years or older) in US zoos and Congo sanctuaries; 27 chimpanzees and 8 bonobos, analysed as genus *Pan*. Doubly labelled water over 7–10 days.
  - Females (n = 17): 46.4 ± 8.1 kg, fat-free mass 43.3 kg, body fat 9.0 ± 5.5%, expenditure 1,722 ± 363 kcal/d, estimated basal rate 1,214 kcal/d, estimated walking and climbing 102 kcal/d.
  - Males (n = 18): 57.9 ± 13.4 kg, fat-free mass 53.8 kg, body fat 8.4 ± 4.9%, expenditure 2,145 ± 546 kcal/d, estimated basal rate 1,401 kcal/d, walking and climbing 120 kcal/d.
  - Activity level (expenditure ÷ basal rate): 1.4 females, 1.5 males.
  - Six *Pan* subjects with negative calculated body fat were excluded from the fat figure.
  - The basal rate is estimated from published respirometry of chimpanzees aged 2 months to 15 years (Bruhn & Benedict 1936; Bruhn 1934), not measured in these adults.
  - A human-tailored equation gives ape values 11 ± 3% higher.
  - The paper states that wild apes will generally have lower body fat than these cohorts.
  - Derived: basal rate = 68.3 and 66.7 × M^0.75 kcal/d; expenditure = 96.9 and 102.2 × M^0.75 kcal/d. Scaled to Gombe masses: about 1,280 kcal/d (31.3 kg) and 1,600 kcal/d (39 kg).
  - Use in Track E: input for the resting rate and body fat; check on total daily expenditure.
- **Primate expenditure is low** [pontzer2014] (FT, PMC3910615) [H].
  - 17 primate species spend about 50% of the energy expected for a placental mammal of their mass.
  - Chimpanzees (sanctuary and zoo, n = 10): 57.1 kg, 2,386 kcal/d (an older equation than pontzer2016).
  - Captive and wild primate populations show similar expenditure.
  - Use in Track E: support for applying captive expenditure to wild animals.
- **Kleiber's equation** [kleiber1947] (standard reference; not read). Basal rate = 70 × M^0.75 kcal/d, as quoted by nguessan2009. Cross-species.
- **Energy budget method, Taï** [nguessan2009] (FT) [M].
  - Population: *P. t. verus*, Taï North group.
  - Expenditure was built from Kleiber's basal rate, activity multipliers (1.38 feeding, 1.25 other and rest, after Leonard & Robertson 1997), Taylor's walking equation and a human climbing equation; +25% for pregnant and +50% for lactating females (after Key & Ross 1999).
  - Result (abstract): food quality had the largest effect on energy balance; in scarce periods chimpanzees shortened the daily journey and fed longer.
  - These are model estimates from human and captive equations, not measurements.
  - Use in Track E: direction only (T-ENE-9); the multipliers are *assumed*.
- **Activity multipliers** [leonardRobertson1997] (Abs). Total expenditure of primates estimated from body size, resting metabolism and activity budgets. The multipliers themselves were not seen in the abstract.

### Locomotion

- **Walking cost of chimpanzees** [sockol2007] (FT, PMC1941460) [H]. Extends the C7c entry, which had the values only from an index snippet.
  - n: 5 captive chimpanzees aged 6–33 years, 33.9–82.3 kg (mean 59.8 kg), on a treadmill at 1.0 m/s.
  - Quadrupedal: mean 0.19 ml O₂ kg⁻¹ m⁻¹ (SE 0.013); individuals 0.18, 0.18, 0.14, 0.29, 0.16.
  - Bipedal: mean 0.21 (SE 0.014). Humans: 0.05.
  - The cost was greater than expected for their body size.
  - Derived: 3.8 J kg⁻¹ m⁻¹ at 20.1 J per ml O₂ (range 2.8–5.8).
  - Use in Track E: input for walking cost.
- **Bipedal and quadrupedal costs are similar** [pontzer2014jhe] (Abs) [M]. Five captive chimpanzees; no cost value in the abstract. Direction only.
- **Climbing cost in primates** [hanna2008] (Abs) and [hannaSchmitt2011] (FT, PMC3156653) [M] for small primates, [L] for chimpanzees.
  - Five species from 0.16 kg (slender loris) to 1.46 kg (mongoose lemur), on a vertical treadmill.
  - Mass-specific climbing cost did not fall with body size: 107.4 × M^−0.119 J kg⁻¹ m⁻¹ (r = 0.858, P = 0.063; slope not significant).
  - Climbing cost about the same as walking under 0.5 kg and was nearly double in the larger species.
  - The physical cost of lifting the centre of mass is 9.8 J kg⁻¹ m⁻¹.
  - Derived: 70 J kg⁻¹ m⁻¹ at 35 kg, an extrapolation far outside the measured range.
  - Use in Track E: input for climbing cost, cross-species assumption.
- **Climbing as used for Taï** [nguessan2009] (FT), secondary: climbing taken as walking at 1.9 m/s (a human rock-climbing model), 0.12–0.13 kcal/s for adults, at a climbing speed of 0.5 m/s (from pontzerWrangham2004).

### Intake and digestion

- **Intake rates and daily intake, Kanyawara females** [uwimbabazi2019] (FT, PMC7450825) [H]. Extends the C7c entry.
  - Period: January 2014 to June 2015.
  - Table 1 (kcal/min; dry g/min; n food items): ripe fruit 10.7 ± 1.3; 3.4 ± 0.4; 36. Drupes 9.9 ± 1.8; 3.0 ± 0.6; 24. Figs 12.5 ± 1.5; 4.2 ± 0.5; 12. Young leaves 6.2 ± 0.6; 2.1 ± 0.2; 19. Pith 3.4 ± 2.2; 1.8 ± 0.2; 13. Unripe fruit 9.0 ± 3.4; 3.0 ± 0.8; 7. Flowers 7.7 ± 1.0; 2.7 ± 0.3; 7. Seeds 6.9 ± 5.7; 2.3 ± 1.9; 4.
  - Table 2, ripe fruit (% organic matter): lipid 4.6, available protein 9.3, fibre (NDF) 41.5, non-structural carbohydrate 44.6. Young leaves: 0.5, 25.9, 43.1, 30.5. Pith: 0.4, 7.5, 58.1, 33.9.
  - Daily means: feeding 308.7 ± 85 min, dry mass 872.6 ± 289 g, energy 2,479.4 ± 858.1 kcal.
  - Daily dry mass and energy did not differ between drupe and fig months; feeding time was 20% lower in drupe months.
  - Energy formula: 4 × non-structural carbohydrate + 4 × available protein + 9 × lipid + 1.6 × NDF (kcal per 100 g organic matter).
  - Derived energy density: ripe fruit 3.2 kcal per g organic matter from Table 2; 3.1, 3.0 and 1.9 kcal per g dry matter from Table 1 (ripe fruit, young leaves, pith).
  - No water content and no body mass are reported.
  - Use in Track E: intake rates are inputs; the daily totals are targets (T-ENE-1 to 3).
- **Macronutrients of the chimpanzee diet, Kanyawara** [conklinBrittain1998] (Abs) [M]. The chimpanzee diet is higher in sugars and non-structural carbohydrate than the diets of sympatric monkeys, with similar fibre; chimpanzees take ripe fruit when it is abundant. No values in the abstract. Direction only.
- **Diet quality across sites** [hohmann2010] (Abs) [M]. Nutritional quality and gross energy of plant foods were similar across three chimpanzee populations and one bonobo population. Direction only: supports using Kanyawara food values elsewhere.
- **Gastric emptying and transit, captive** [ardente2011] (Abs) [M].
  - n: 7 adults (gastric emptying, barium spheres) and 11 (transit, dye marker), North Carolina Zoo.
  - Gastric emptying took more than 3 hours and less than 16 hours. Mean gastrointestinal transit time was 16.5 hours.
  - Use in Track E: input bounds for the gut-emptying time constant.
- **Passage kinetics, captive** [miltonDemment1988] (Abs) [M].
  - Abstract: more fibre shortened mean transit time; chimpanzee transit was longer than human transit.
  - Secondary (search snippet, not confirmed in the abstract): mean transit time 38 h on the 34% fibre diet and 48 h on the 14% fibre diet.
  - Use in Track E: not the time constant of energy absorption (it is the passage of indigestible markers through the whole tract).
- **Retention times, captive** [lambert2002] (Abs) [M]. Chimpanzees and four guenon species, 4 trials per subject with plastic markers. Relative to body mass, chimpanzee retention is short. No hours in the abstract (a secondary source gives about 31 h mean retention). Direction only.
- **Meat** [hardus2012] (FT), secondary [L].
  - Cites chimpanzee meat intake of 348 g/h (Wrangham & Conklin-Brittain 2003) and up to 1.9 ± 1.2 kg/h (Gilby 2006).
  - Uses 115 kcal per 100 g for red colobus (a USDA food-table value for squirrel or rabbit, via Wrangham & Conklin-Brittain 2003).
  - Derived: 6.7 kcal/min at 348 g/h.
  - [tennie2014] (Abs): no nutritional data exist on the flesh of chimpanzee prey.
  - Use in Track E: input for meat intake, low confidence.

### Reproduction and growth

- **Human pregnancy and lactation** [butteKing2005] (Abs) [H] for humans; cross-species.
  - Pregnancy: 321–325 MJ in total for a 12.0 kg gain; 375, 1,200 and 1,950 kJ/d in the three trimesters. The total includes protein and fat deposition.
  - Lactation (exclusive breastfeeding): 2.62 MJ/d from 749 g/d of milk at 2.8 kJ/g and an efficiency of 0.80; 0.72 MJ/d can come from tissue; net increment 1.9 MJ/d.
  - Use in Track E: input for lactation and pregnancy cost, *assumed*.
- **Human growth cost** [robertsYoung1988] (Abs) [H] for humans; cross-species.
  - Deposition costs 1.17 kJ per kJ of fat and 2.38 kJ per kJ of protein.
  - Weight gain in infancy costs 18.7 kJ/g (4.5 kcal/g) on average, range 12.2–25.1 kJ/g (2.9–6.0 kcal/g).
  - Use in Track E: input for growth cost, *assumed*.
- **Comparative reproductive energetics** [emeryThompson2013] (bibliography only; not read). Listed as the review to consult for a chimpanzee lactation estimate.
- **Offspring growth and reproductive pace, Kanyawara** [emeryThompson2016] (Abs) [M]. Juvenile lean mass (urinary creatinine) was greater when the next sibling came later; low maternal energy balance in lactation predicted larger juveniles. Direction only.

### Energy balance (targets)

- **C-peptide tracks fruit, Kanyawara males** [emeryThompson2009] (Abs) [M].
  - n: 519 urine samples from 13 adult males.
  - C-peptide was predicted by the amount of fruit and of preferred fruit in the diet.
  - C-peptide was very low during a respiratory epidemic despite good feeding conditions.
  - Kanyawara males had lower C-peptide than Ngogo males.
  - Low-ranking males had higher C-peptide than dominant males.
  - Use in Track E: target for energy balance against fruit (T-ENE-4) and rank (T-ENE-8).
- **Energy balance, Taï** [vale2020] (Abs) [M]. One community, 12 months: C-peptide rose with food availability in both sexes; when food was abundant chimpanzees fed for less time and spent more energy. The rank effects came from a model "only close to significance". Target, direction (T-ENE-4, T-ENE-9).
- **Mating effort costs feeding, Kanyawara** [georgiev2014] (Abs) [M]. 12 males followed for 11 months: males fed less on days with oestrous parous females; the drop tracked aggression and copulation rates and did not depend on rank. Target, direction (T-ENE-7).
- **Lactation** [emeryThompson2012] and **males in the party** [emeryThompson2014]: already in research.md ("Lactation energetics" and "Food competition and party size"). Targets T-ENE-5 and T-ENE-6.

## 4. New source list (E1)

- *new* pusey2005: Pusey AE, Oehlert GW, Williams JM, Goodall J 2005. Influence of ecological and social factors on body mass of wild chimpanzees. *International Journal of Primatology* 26(1):3–31. [doi:10.1007/s10764-005-0721-2](https://doi.org/10.1007/s10764-005-0721-2) (Abs).
- *new* ueharaNishida1987: Uehara S, Nishida T 1987. Body weights of wild chimpanzees (*Pan troglodytes schweinfurthii*) of the Mahale Mountains National Park, Tanzania. *American Journal of Physical Anthropology* 72(3):315–321. [doi:10.1002/ajpa.1330720305](https://doi.org/10.1002/ajpa.1330720305) (Abs).
- *new* smithJungers1997: Smith RJ, Jungers WL 1997. Body mass in comparative primatology. *Journal of Human Evolution* 32(6):523–559. [doi:10.1006/jhev.1996.0122](https://doi.org/10.1006/jhev.1996.0122) (Abs; species table not read).
- *new* pontzer2016: Pontzer H, Brown MH, Raichlen DA et al. 2016. Metabolic acceleration and the evolution of human brain size and life history. *Nature* 533(7603):390–392. [doi:10.1038/nature17654](https://doi.org/10.1038/nature17654) (FT, PMC4942851).
- *new* pontzer2014: Pontzer H, Raichlen DA, Gordon AD et al. 2014. Primate energy expenditure and life history. *PNAS* 111(4):1433–1437. [doi:10.1073/pnas.1316940111](https://doi.org/10.1073/pnas.1316940111) (FT, PMC3910615).
- *new* pontzer2014jhe: Pontzer H, Raichlen DA, Rodman PS 2014. Bipedal and quadrupedal locomotion in chimpanzees. *Journal of Human Evolution* 66:64–82. [doi:10.1016/j.jhevol.2013.10.002](https://doi.org/10.1016/j.jhevol.2013.10.002) (Abs).
- *new* kleiber1947: Kleiber M 1947. Body size and metabolic rate. *Physiological Reviews* 27(4):511–541. [doi:10.1152/physrev.1947.27.4.511](https://doi.org/10.1152/physrev.1947.27.4.511) (standard reference; not read).
- *new* nguessan2009: N'guessan AK, Ortmann S, Boesch C 2009. Daily energy balance and protein gain among *Pan troglodytes verus* in the Taï National Park, Côte d'Ivoire. *International Journal of Primatology* 30(3):481–496. [doi:10.1007/s10764-009-9354-1](https://doi.org/10.1007/s10764-009-9354-1) (FT, publisher page).
- *new* leonardRobertson1997: Leonard WR, Robertson ML 1997. Comparative primate energetics and hominid evolution. *American Journal of Physical Anthropology* 102(2):265–281. [doi:10.1002/(SICI)1096-8644(199702)102:2<265::AID-AJPA8>3.0.CO;2-X](https://doi.org/10.1002/(SICI)1096-8644(199702)102:2%3C265::AID-AJPA8%3E3.0.CO;2-X) (Abs).
- *new* hanna2008: Hanna JB, Schmitt D, Griffin TM 2008. The energetic cost of climbing in primates. *Science* 320(5878):898. [doi:10.1126/science.1155504](https://doi.org/10.1126/science.1155504) (Abs).
- *new* hannaSchmitt2011: Hanna JB, Schmitt D 2011. Locomotor energetics in primates: gait mechanics and their relationship to the energetics of vertical and horizontal locomotion. *American Journal of Physical Anthropology* 145(1):43–54. [doi:10.1002/ajpa.21465](https://doi.org/10.1002/ajpa.21465) (FT, PMC3156653).
- *new* conklinBrittain1998: Conklin-Brittain NL, Wrangham RW, Hunt KD 1998. Dietary response of chimpanzees and cercopithecines to seasonal variation in fruit abundance. II. Macronutrients. *International Journal of Primatology* 19(6):971–998. [doi:10.1023/A:1020370119096](https://doi.org/10.1023/A:1020370119096) (Abs).
- *new* hohmann2010: Hohmann G, Potts K, N'Guessan A et al. 2010. Plant foods consumed by *Pan*: exploring the variation of nutritional ecology across Africa. *American Journal of Physical Anthropology* 141(3):476–485. [doi:10.1002/ajpa.21168](https://doi.org/10.1002/ajpa.21168) (Abs).
- *new* ardente2011: Ardente A, Chinnadurai S, De Voe R et al. 2011. Relationship between gastrointestinal transit time and anesthetic fasting protocols in the captive chimpanzee, *Pan troglodytes*. *Journal of Medical Primatology* 40(3):181–187. [doi:10.1111/j.1600-0684.2011.00468.x](https://doi.org/10.1111/j.1600-0684.2011.00468.x) (Abs).
- *new* miltonDemment1988: Milton K, Demment MW 1988. Digestion and passage kinetics of chimpanzees fed high and low fiber diets and comparison with human data. *Journal of Nutrition* 118(9):1082–1088. [doi:10.1093/jn/118.9.1082](https://doi.org/10.1093/jn/118.9.1082) (Abs).
- *new* lambert2002: Lambert JE 2002. Digestive retention times in forest guenons (*Cercopithecus* spp.) with reference to chimpanzees (*Pan troglodytes*). *International Journal of Primatology* 23(6):1169–1185. [doi:10.1023/A:1021166502098](https://doi.org/10.1023/A:1021166502098) (Abs).
- *new* hardus2012: Hardus ME, Lameira AR, Zulfa A et al. 2012. Behavioral, ecological, and evolutionary aspects of meat-eating by Sumatran orangutans (*Pongo abelii*). *International Journal of Primatology* 33(2):287–304. [doi:10.1007/s10764-011-9574-z](https://doi.org/10.1007/s10764-011-9574-z) (FT; used only for the chimpanzee values it cites).
- *new* tennie2014: Tennie C, O'Malley RC, Gilby IC 2014. Why do chimpanzees hunt? Considering the benefits and costs of acquiring and consuming vertebrate versus invertebrate prey. *Journal of Human Evolution* 71:38–45. [doi:10.1016/j.jhevol.2014.02.015](https://doi.org/10.1016/j.jhevol.2014.02.015) (Abs).
- *new* butteKing2005: Butte NF, King JC 2005. Energy requirements during pregnancy and lactation. *Public Health Nutrition* 8(7a):1010–1027. [doi:10.1079/PHN2005793](https://doi.org/10.1079/PHN2005793) (Abs).
- *new* robertsYoung1988: Roberts SB, Young VR 1988. Energy costs of fat and protein deposition in the human infant. *American Journal of Clinical Nutrition* 48(4):951–955. [doi:10.1093/ajcn/48.4.951](https://doi.org/10.1093/ajcn/48.4.951) (Abs).
- *new* emeryThompson2013: Emery Thompson M 2013. Comparative reproductive energetics of human and nonhuman primates. *Annual Review of Anthropology* 42:287–304. [doi:10.1146/annurev-anthro-092412-155530](https://doi.org/10.1146/annurev-anthro-092412-155530) (bibliography only).
- *new* emeryThompson2016: Emery Thompson M, Muller MN, Sabbi K et al. 2016. Faster reproductive rates trade off against offspring growth in wild chimpanzees. *PNAS* 113(28):7780–7785. [doi:10.1073/pnas.1522168113](https://doi.org/10.1073/pnas.1522168113) (Abs).
- *new* emeryThompson2009: Emery Thompson M, Muller MN, Wrangham RW, Lwanga JS, Potts KB 2009. Urinary C-peptide tracks seasonal and individual variation in energy balance in wild chimpanzees. *Hormones and Behavior* 55(2):299–305. [doi:10.1016/j.yhbeh.2008.11.005](https://doi.org/10.1016/j.yhbeh.2008.11.005) (Abs).
- *new* vale2020: Valé PD, Béné JCK, N'Guessan AK et al. 2021 (online 2020). Energetic management in wild chimpanzees (*Pan troglodytes verus*) in Taï National Park, Côte d'Ivoire. *Behavioral Ecology and Sociobiology* 75(1):1. [doi:10.1007/s00265-020-02935-9](https://doi.org/10.1007/s00265-020-02935-9) (Abs).
- *new* georgiev2014: Georgiev AV, Russell AF, Emery Thompson M et al. 2014. The foraging costs of mating effort in male chimpanzees (*Pan troglodytes schweinfurthii*). *International Journal of Primatology* 35(3–4):725–745. [doi:10.1007/s10764-014-9788-y](https://doi.org/10.1007/s10764-014-9788-y) (Abs).
- sockol2007, taylor1982, pontzerWrangham2004, uwimbabazi2019, emeryThompson2012 and emeryThompson2014 are already cited in research.md; the entries above add findings.

Sections for E2 (daily rhythm), E3 (choice theory) and E4 (endocrine correlates) follow in the next commits.
