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
| Total energy expenditure (doubly labelled water), genus *Pan*, captive adults | Females 1,722 ± 363 kcal/d at 46.4 kg; males 2,145 ± 546 kcal/d at 57.9 kg. Derived: 97–102 × M^0.75 kcal/d | pontzer2016 (FT) | [H] captive; [M] as a wild value | target (T-ENE-8): a check on the ledger, never a set value |
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
| Energy balance and rank | Low-ranking Kanyawara males had higher C-peptide than dominant males | emeryThompson2009 (Abs) | [M] | direction only (no row proposed) |
| Feeding and travel when food is scarce | Taï: shorter daily journey and more feeding time in periods of scarcity | nguessan2009 (FT abstract), vale2020 (Abs) | [M] | target, direction (T-ENE-9) |

### E2 daily rhythm: inputs

| Quantity | Recommended value (range) | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Heating of dark fur in the sun | Dark pelage reaches 60 °C within minutes under the Budongo sun (an experiment on fur without physiological cooling) | kosheleff2009 (Abs) | [M] | input (heat load in sun) |
| Thermoneutral zone of chimpanzees | No value found | — | gap | — |
| Water intake per unit of energy | About 2.8 mL of water per kcal of energy intake in apes (zoo and sanctuary, similar to estimates for wild animals); humans about 1.5 | pontzer2021 (Abs) | [M] | input |
| Water from food | Rainforest apes typically get enough water from food and can go days or weeks without drinking | pontzer2021 (Abs) | [M] | input, direction |
| Water turnover in litres per day | Not read (full text not accessible). Derived from 2.8 mL/kcal: 3.6–4.5 L/d at 1,300–1,600 kcal/d | pontzer2021 (Abs), derived | [L] | input, assumed |
| Urination interval | 78 ± 32 min, adult males (Budongo) | wittig2015 (FT) | [M] | input (optional) |
| Sleep per night | 8.81 h asleep, with frequent awakenings (20 captive chimpanzees, video) | videan2006 (Abs) | [M] captive | input (sleep need) |
| Sleep-pressure model | Pressure rises during waking and falls during sleep; sleep starts at an upper threshold and ends at a lower one; both thresholds follow the circadian clock | daan1984 (Abs), borbely2022 (Abs) | [H] human; cross-species | input, assumed |
| Sleep-pressure time constants | Rise about 18.2 h (secondary); the decay constant was not verified | daan1984 (secondary) | [L] as read | input, assumed |
| Time to build a night nest | 2–5 min for adult great apes | khayer2025 (FT extract) | [M] | input |

### E2 daily rhythm: targets

| Quantity | Field value | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Active day, nest to nest | 11 h 34 min males, 10 h 57 min lactating females (Budongo Sonso) | batesByrne2009 (in the registry) | [M] | target (T-RHY-1) |
| Active period by sex, state and season | Non-receptive females shorter than males; receptive females longer than males; females longer in the dry season; low-ranking males longer than higher-ranking males (Gombe 1975–1992) | lodwick2004 (Abs) | [M] | target, direction (T-RHY-2) |
| Leaving the nest before sunrise | 18% of departures (5 females, 179 days, Taï, fruit-scarce periods); earlier when breakfast is an ephemeral fruit and far away | janmaat2014 (FT extract) | [M] | target (T-RHY-3) |
| Time of night-nest building | "Around 18:00" at Kibale, "often observed around sunset" (general statement) | khayer2025 (FT extract) | [L] | target (T-RHY-4) |
| Activity at night | 1.80% of camera-trap activity is nocturnal across 22 sites, mostly in twilight hours; 3.3% of forest clips at Sebitoli, Kibale | tagg2018 (Abs), lacroux2022 (Abs) | [M] | target (T-RHY-5) |
| Drinking frequency | Gombe mothers: 788 drinks in 10,517 h (derived: 0.075 per hour, about 0.9 per 12-hour day); 0.001 of observation minutes; more in the dry season | nelson2022 (FT) | [H] | target (T-RHY-6) |
| Where they drink | Kanyawara, 14 years, 81 animals, 4,087 drinking events: streams 3,102 (76%), tree holes and buttress holes 382, puddles and footprints 511; 625 with a tool | mackenzie2025 (FT) | [H] | target (T-RHY-7) |
| Rest and ground use in heat | Resting and time on the ground both rise with temperature in the sun (30 adults, 247 h, Budongo); time in the sun starts to fall at about 30 °C and falls sharply at about 40 °C | kosheleff2009 (Abs) | [M] | target, direction (T-RHY-8) |
| Ground use by season | Bossou: 23.4% of time on the ground (2.9% in August to 42.1% in November); more on warm or dry days; only the day's maximum temperature was significant | takemoto2004 (Abs) | [M] | target, direction (T-RHY-8) |
| Leaf feeding by time of day | Ngogo: sapling leaves eaten more in the evening than in the morning | carlson2013 (Abs) | [M] | target, direction (T-RHY-10) |
| Hourly activity profile (feeding peaks, midday rest) | No verified quantitative source | — | gap | direction-only row at low confidence (T-RHY-9) |
| Behaviour in heavy rain | No quantitative source. Chimpanzees "hunch up in rain" (Goodall 1962, as cited by anderson2019) | anderson2019 (FT), secondary | [L] | gap |
| Nests and overnight weather | Thicker, deeper nests in cooler or wetter conditions; taller trees with denser canopy before rainy nights | alrazi2026 (Abs) | [M] | direction only |

### E3 choice: theory

| Quantity | Statement | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Reward as drive reduction | The reward of an outcome is the reduction it brings in the distance of the internal state from its set point; seeking reward is then equivalent to keeping physiological stability | keramatiGutkin2014 (Abs) | theory | mechanism citation |
| Patch leaving | Marginal value theorem | charnov1976 (already cited) | theory | mechanism citation |

### E4 endocrine correlates: targets and directions

All from wild chimpanzees. None is an input: each is a pattern the slow states should reproduce.

| State | Pattern | Effect size, n, site | Source key | Evidence |
| --- | --- | --- | --- | --- |
| Stress (glucocorticoids), males | Rises with rank | Estimate 0.494 (SE 0.168); 8,029 samples, 20 males, 20 years, Kanyawara. Positive in an earlier Kanyawara sample. No association at Taï (983 samples, 10 males) or Ngogo (faecal, 67 samples, 22 males) | muller2021 (FT), mullerWrangham2004a (Abs), preis2019 (FT extract), muehlenbeinWatts2010 (Abs) | [M], sites disagree |
| Stress, males | Higher when the hierarchy is unstable | Kanyawara: effect grows with rank (0.122, SE 0.044). Taï: higher in all males | muller2021, preis2019 | [M] |
| Stress, males | Higher with parous oestrous females present | Estimate 0.176 (SE 0.013), Kanyawara | muller2021 (FT) | [H] |
| Stress | Rises after a single aggressive interaction, in aggressor and victim | 112% ± 28 of the pre-event level against 85% ± 27 after rest; 9 males, 14 aggressions, 10 rests, 169 samples, Budongo | wittig2015 (FT) | [H] |
| Stress | Lower with a bond partner | 23% lower across contexts; 22% higher after intergroup encounters than after grooming; 17 animals, 394 samples, Budongo | wittig2016 (FT) | [H] |
| Stress, females | Lactating females: higher in months of low fruit consumption. Low rank: higher, most of all in lactation. Oestrous females: higher after male aggression | 6 years, Kanyawara (n not in the abstract) | emeryThompson2010 (Abs) | [M] |
| Stress and food, males | Negative correlation with food availability in one study; no effect of diet quality over 14 days in the 20-year data (−0.012, P = 0.873) | Kanyawara | mullerWrangham2004a (Abs), muller2021 (FT) | conflicting |
| Stress and heat | Cortisol varied with humidity, more at Fongoli (savanna) than Taï | 588 samples, 3 communities | wessling2018 (FT extract) | [M] |
| Stress | Higher in the morning than the afternoon | More than 500 samples, 11 males, Kanyawara | mullerLipson2003 (Abs) | [H] |
| Stress, time scale | Urinary peak 135–270 min after the event (window used); labelled cortisol peaks in urine within 5.5 h and in faeces within 26 h | Budongo; one captive male | wittig2015 (FT), bahr2000 (Abs) | [M] |
| Competitive arousal (testosterone) | Above baseline with parous oestrous females, not with nulliparous ones, not explained by mating or party size | Ngogo; Kanyawara (secondary) | sobolewski2013 (Abs), mullerWrangham2004b (secondary) | [M] |
| Competitive arousal | Rises with rank at Kanyawara and Ngogo; one Ngogo study finds no rank effect; at Ngogo the link runs through lean mass and testosterone is negatively related to aggression rate | 67 faecal samples, 22 males (Ngogo) | muehlenbein2004 (Abs), negrey2023 (Abs), sobolewski2013 (Abs), mullerWrangham2004b (secondary) | [M], studies disagree |
| Competitive arousal | Higher in hours and months with more pant-hooting | Kanyawara | fedurek2016 (Abs) | [M] |
| Competitive arousal | Higher on patrols | Ngogo; seen only as cited by others | sobolewski2012 (secondary) | [L], not verified |
| Competitive arousal and food | Short-term food changes do not lower it (11 males); wild males are below captive males | Kanyawara | mullerWrangham2005 (Abs) | [M] |
| Affiliation (oxytocin) | Higher after grooming with a bond partner than with a non-bond partner or no grooming, whatever the kinship | n not in the abstract | crockford2013 (Abs) | [M] |
| Affiliation | Higher after food sharing than after other social feeding, and higher than after grooming, whatever the bond | n not in the abstract | wittig2014 (Abs) | [M] |
| Affiliation | Higher after reconciliation and bystander affiliation than after aggression alone | Taï males | preis2018 (Abs) | [M] |
| Affiliation | Higher before and during intergroup conflict, in both sexes; linked to cohesion | Taï | samuni2017 (already cited, FT) | [M] |
| Affiliation, time scale | Not verified (the sampling window is in full texts that were not read) | — | — | gap |

## 2. Gaps and known conflicts (E1)

The gaps for E2 and E4 are in section 5.

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
  - Use in Track E: input for the resting rate and body fat; check on total daily expenditure (T-ENE-8).
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
  - Use in Track E: target for energy balance against fruit (T-ENE-4); the rank result is direction only.
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

## 5. Gaps and known conflicts (E2, E4)

1. **No thermoneutral zone or heat-stress threshold for chimpanzees.** Only behavioural responses to heat are documented (kosheleff2009, takemoto2004, pruetz2018). Recommendation: a heat load built from air temperature, sun exposure and exertion, entered as *assumed*; the behavioural responses stay targets.
2. **No water turnover in litres per day was read.** pontzer2021's full text was not accessible; only the ratio of 2.8 mL per kcal is in the abstract. No water content of Kibale foods was found, so the share of water that comes from food cannot be computed.
3. **No sleep need for wild chimpanzees.** Captive sleep is 8.81 h per night (videan2006); nights in the nest are about 12 h. The two-process model is human. Its decay time constant was not verified.
4. **No verified quantitative hourly activity profile.** The morning and late-afternoon feeding peaks and the midday rest are widely described, but no primary source with numbers was reached. Recommendation: register a direction-only row at low confidence, or wait for a source (Wrangham 1977 on Gombe is the usual citation; not read).
5. **Nest timing against sunset is weakly sourced.** One general statement for Kibale ("around 18:00"). Clock times for Toro-Semliki (enter 19:09, leave 07:20) and Fongoli (start 18:48) were seen only in search snippets and are not registered.
6. **No quantitative source for behaviour in heavy rain.**
7. **Drinking rate at Kibale.** mackenzie2025 gives counts but no observation hours in the text read, so no rate per day. The Gombe rate (nelson2022) is for lactating mothers at a drier site.
8. **Hormone time scales.** Only the urinary glucocorticoid window is verified (135–270 min, wittig2015). No half-life or window was verified for urinary oxytocin or testosterone.
9. **Sites disagree on rank and hormones.** Glucocorticoids rise with male rank at Kanyawara, not at Taï or Ngogo. Testosterone rises with rank in three analyses and not in a fourth. A row on rank can only be site-specific.
10. **Food and male stress conflict within Kanyawara.** An early study found a negative correlation with food availability; the 20-year data show no effect of diet quality.
11. **Wiring risk for E4 rows.** If the mechanism makes an event drive a state directly (aggression raises stress), the matching row is encoded and cannot count as validation. Rows where the pattern must arise from the mix of events (rank, instability, bond partners, parous oestrous females) are the informative ones.

## 6. Sources: E2 daily rhythm

### Heat and thermoregulation

- **Temperature, activity and ground use, Budongo** [kosheleff2009] (Abs) [M].
  - n: 30 adults observed for 247 h; 5-min records of shade and sun temperature, sky cover, sun exposure, activity and height.
  - Time on the ground: 26.5% for females, 41.5% for males.
  - Time on the ground and resting both rose with temperature in the sun; that temperature stayed the strongest predictor of ground use after controlling for seven other factors.
  - Continuous time in the sun fell with temperature: it began to fall at about 30 °C and fell markedly at about 40 °C.
  - Dark pelage without physiological cooling reached 60 °C within minutes under the same sun.
  - Use in Track E: the pelage result is an input for heat load; the behavioural responses are targets (T-RHY-8).
- **Ground use and microclimate, Bossou** [takemoto2004] (Abs) [M].
  - Population: *P. t. verus*, 3 focal animals.
  - Monthly mean time on the ground 23.4% (2.9% in August to 42.1% in November); more in warm or dry months.
  - Daily ground use rose with the day's maximum temperature and fell with minimum humidity; only maximum temperature was significant in the full model.
  - The author's reading: resting in trees in cool periods reduces thermoregulation costs, because it is warmer higher up.
  - Use in Track E: target, direction (T-RHY-8).
- **Night activity in a savanna, Fongoli** [pruetz2018] (Abs) [M].
  - 403 h on 40 nights, 2007–2013, *P. t. verus*.
  - More activity after moonrise or before moonset in fuller moon phases in the dry season, not in the wet season. Most night activity was travel or foraging.
  - Chimpanzees lack physiological mechanisms against heat stress and shift behaviour instead.
  - Use in Track E: direction only (heat pushes activity toward cooler hours).
- **Seasonal physiology, Fongoli and Taï** [wessling2018] (FT extract, publisher page) [M].
  - n: 368 urine samples at Fongoli and 220 at Taï; 3 communities.
  - Fongoli reaches 48 °C with 945 mm of rain per year; Taï averages 25.9 °C and reaches 36 °C.
  - Higher temperature predicted higher creatinine at Taï and weakly lower creatinine at Fongoli; rainfall raised creatinine at Fongoli.
  - Humidity affected cortisol at both sites, more at Fongoli.
  - C-peptide followed fruit availability at Taï and overall food availability at Fongoli.
  - Fongoli chimpanzees drink more often in periods of water scarcity.
  - Use in Track E: direction only for heat, water and stress.

### Water

- **Water turnover of apes** [pontzer2021] (Abs) [M].
  - Isotope-depletion water turnover in zoo and sanctuary chimpanzees, bonobos, gorillas and orangutans, against 5 human populations.
  - Turnover scaled with energy expenditure, physical activity, temperature, humidity and fat-free mass.
  - Humans had 30–50% lower turnover than apes after those controls.
  - Apes: about 2.8 mL of water per kcal of energy intake, similar in captive animals and in estimates for wild ones; humans about 1.5.
  - Rainforest apes typically get enough water from food and can go days or weeks without drinking.
  - The litres per day by species are in the full text, which was not read.
  - Use in Track E: input for water need per unit of energy.
- **Drinking by lactating mothers, Gombe** [nelson2022] (FT, accepted manuscript) [H].
  - 41 years of mother–infant follows; all occurrences of drinking free water; 10,517 h of observation of mothers.
  - Drinks counted: 301 in early lactation (25 mothers), 297 in middle lactation (25), 190 in late lactation (22). Mean share of observation minutes with drinking: 0.001 (± 0.002) in each stage.
  - Mothers drank more in the dry season. Low-ranking mothers drank more than others in late lactation. Offspring drank more in the dry season and with age.
  - Derived: 788 drinks in 10,517 h = 0.075 per hour, about 0.9 per 12-hour day.
  - Use in Track E: target for drinking frequency (T-RHY-6).
- **Drinking sources, Kanyawara** [mackenzie2025] (FT, PMC12011317) [H]. Extends research.md §7.
  - 14 years of all-occurrence drinking records from 81 chimpanzees (47 females, 34 males).
  - 4,087 drinking events: streams 3,102, tree holes 356, buttress holes 26, puddles 299, animal footprints 212. 625 events used a tool (604 leaf sponges).
  - Females were seen drinking more often than males; stream drinking rose with age.
  - No observation hours are given in the text read, so no rate per day.
  - Use in Track E: target for the share of drinking by source (T-RHY-7).

### Sleep, nests and the active day

- **Active period, Gombe** [lodwick2004] (Abs) [M].
  - Adults, 1975–1992; effects of sex, reproductive state, rank and season on the time between nests.
  - Non-receptive females had shorter active periods than males; receptive females had longer ones than males.
  - Rank did not matter for non-receptive females; high- and middle-ranking males had shorter active periods than low-ranking males.
  - Non-receptive females were active longer in the dry season; males showed no seasonal effect.
  - No durations are in the abstract.
  - Use in Track E: target, direction (T-RHY-2).
- **Active day, Budongo** [batesByrne2009] (in the registry): 11 h 34 min for males, 10 h 57 min for lactating females. Today this is the parameter `activeDayH`; Track E turns it into a target (T-RHY-1).
- **Leaving the nest, Taï** [janmaat2014] (FT extract) [M].
  - 5 adult females, 275 full days in three fruit-scarce periods (departure model: 179 days).
  - 18% of departures were before sunrise.
  - Departure was earlier when the breakfast fruit was very ephemeral (figs), and more so when it was farther away.
  - Interval between the nest grunt and nest building: 19 ± 23 min when alone with offspring, 30 ± 27 min in a party.
  - Use in Track E: target (T-RHY-3).
- **Nest building, Ngogo** [khayer2025] (FT extract) [L] for timing.
  - General statements: nest building is often seen around sunset; weaned chimpanzees typically start their night nests around 18:00; adult great apes take 2–5 min on average.
  - The study itself is about day nests of 72 immatures.
  - Use in Track E: target for nest timing, low confidence (T-RHY-4); input for the time a nest takes.
- **Nocturnal activity, 22 sites** [tagg2018] (Abs) [M]. Camera traps: ground activity at night at 18 of 22 sites, 1.80% of all chimpanzee activity, at all hours but mostly in twilight; more likely with higher daily temperature. Target (T-RHY-5).
- **Nocturnal activity, Sebitoli (Kibale)** [lacroux2022] (Abs) [M]. Camera traps for 15 months, 1,808 chimpanzee clips: 3.3% of forest clips were at night, against 41.8% in maize fields. Target (T-RHY-5), forest value only.
- **Night awakenings, Mahale** [zamma2014] (Abs) [M]. Sounds were heard on every one of 5 nights (128 events). Direction only: sleep is not continuous.
- **Sleep in captivity** [videan2006] (Abs) [M]. 20 captive chimpanzees, night video: 8.81 h of sleep per night, with frequent awakenings; older animals slept longer; temperature and humidity changed sleep duration and quality. Input for sleep need.
- **Comparative sleep** [nunnSamson2018] (Abs). Humans sleep least of 30 primates studied. Direction only.
- **Two-process model of sleep** [daan1984] (Abs), [borbely2022] (Abs) [H] for humans; cross-species.
  - A sleep variable S rises during waking and falls during sleep.
  - Sleep begins when S reaches an upper threshold and ends at a lower one; both thresholds follow one circadian pacemaker.
  - Time constants come from EEG slow-wave power. Secondary: the rise constant is 18.2 h. The decay constant was not verified.
  - The 1982 paper (Borbély AA, *Human Neurobiology* 1:195–204) has no DOI in Crossref; its details were not verified and it is cited through borbely2022.
  - Use in Track E: input for sleep pressure, *assumed*.
- **Nests and weather** [alrazi2026] (Abs) [M]. Eastern chimpanzees (site not named in the abstract): nests in warmer, less windy spots; thicker and deeper nests when cooler or wetter; taller trees with denser canopy before rainy nights; overnight weather predicted nesting better than weather at building time. Direction only.
- **Review of ape nesting and sleep** [anderson2019] (FT, author copy). Used only for the statement that chimpanzees hunch up in rain (Goodall 1962, as cited). [fruth2018] (FT, author copy): no timing values.
- **Leaf feeding by time of day, Ngogo** [carlson2013] (Abs) [M]. Leaves of two sapling species were eaten more in the evening than in the morning, when their sugars are higher and fibre lower. Target, direction (T-RHY-10).

## 7. Sources: E3 choice (theory)

- **Homeostatic reinforcement learning** [keramatiGutkin2014] (Abs; open access). Primary reward is defined as an outcome that fulfils a physiological need. Seeking reward is then equivalent to keeping physiological stability. Discounting moves the animal along the shortest path toward the set point. The theory also covers acting ahead of a coming deficit. Theory, not evidence about chimpanzees. Use in Track E: citation for valuing an option by the deficit it removes.
- **Marginal value theorem** [charnov1976]: already cited.

## 8. Sources: E4 endocrine correlates

### Glucocorticoids (stress load)

- **Rank, aggression and cortisol, Kanyawara males** [mullerWrangham2004a] (Abs) [M].
  - Male rank correlated positively with urinary cortisol in a stable hierarchy.
  - Cortisol correlated positively with rates of male aggression and negatively with food availability.
  - No n in the abstract.
- **Twenty years of male glucocorticoids, Kanyawara** [muller2021] (FT, accepted manuscript) [H].
  - n: 8,029 urine samples, 20 adult males, November 1997 to June 2017.
  - The hierarchy was unstable on 2,533 of 7,152 days (35%); 145 rank reversals among adult males.
  - Glucocorticoids rose with rank (estimate 0.494, SE 0.168, P = 0.003), in stable and unstable periods and with or without mating competition. Being alpha had no separate effect.
  - Higher with parous oestrous females present (0.176, SE 0.013, P < 0.001).
  - Instability raised glucocorticoids more at higher rank (interaction 0.122, SE 0.044); the lowest-ranking males showed no difference.
  - Rose with age (0.008, SE 0.003).
  - Diet quality over the previous 14 days had no effect (−0.012, SE 0.072, P = 0.873).
  - Abstract: glucocorticoids rose with giving and receiving aggression; giving aggression was the main link between rank and glucocorticoids.
- **Rank, instability and cortisol, Taï males** [preis2019] (FT extract, publisher page) [M].
  - n: 983 urine samples, 10 males in 2 communities, 189 group days.
  - Rank was not associated with cortisol in stable or unstable periods.
  - Cortisol was higher in all males in unstable periods, while aggression rates were lower then.
  - Aggression given rose with the number of fully swollen parous females; individual aggression rates did not predict cortisol.
- **Single aggressions raise glucocorticoids, Budongo** [wittig2015] (FT, open access) [H].
  - n: 169 urine samples from 9 adult males after 14 aggressions and 10 resting events.
  - Relative level (after ÷ before): 112% ± 28 after aggression against 85% ± 27 after resting more than 30 min.
  - Probably for aggressors as well as victims; higher-ranking males rose more; length and intensity of the aggression did not matter.
  - Window used for the urinary peak: 135–270 min after the event. Mean urination interval 78 ± 32 min.
- **Bond partners lower glucocorticoids, Budongo** [wittig2016] (FT, open access) [H].
  - n: 394 urine samples from 9 males and 8 females assigned to single events: 31 grooming, 18 resting and 21 intergroup-encounter data points.
  - Relative level was almost 22% higher after intergroup encounters than after grooming, and more than 8% higher after resting than after grooming.
  - With a bond partner, levels were on average 23% lower across all three contexts (a main effect, not only during stress).
  - Kinship and sex had no significant effect.
- **Female cortisol, Kanyawara** [emeryThompson2010] (Abs) [M].
  - 6 years of urinary cortisol in females.
  - Cortisol rose with age and was high in young immigrants.
  - Cycling females not in oestrus had lower cortisol than lactating, oestrous or pregnant females.
  - Male aggression raised cortisol in oestrous females.
  - Lactating females had higher cortisol in months of low fruit consumption.
  - Low rank went with higher cortisol, most of all in lactation.
  - Female conflict affected many females, aggressors included.
- **Faecal cortisol and rank, Ngogo** [muehlenbeinWatts2010] (Abs; open access) [M]. 67 faecal samples from 22 adult males: testosterone, but not cortisol, was associated with rank; both were associated with parasite richness.
- **Daily pattern** [mullerLipson2003] (Abs) [H]. More than 500 samples from 11 wild males over a year: urinary testosterone and cortisol were higher and more variable in the morning than the afternoon.
- **Excretion time course** [bahr2000] (Abs) [M]. One adult male chimpanzee given labelled cortisol: more than 80% excreted in urine; peak in urine within 5.5 h and in faeces within 26 h.

### Testosterone (competitive arousal)

- **Challenge hypothesis, Kanyawara** [mullerWrangham2004b] (secondary: indexed summaries only; the abstract was not reachable). Aggression and testosterone rose with parous oestrous females present and not with nulliparous ones; baseline testosterone correlated with rank.
- **Challenge hypothesis, Ngogo** [sobolewski2013] (Abs) [M].
  - Rank had no influence on testosterone.
  - Males were more aggressive in parties with parous oestrous females than without reproductively active females.
  - Urinary testosterone was above baseline with parous oestrous females and not with nulliparous ones.
  - Not explained by mating (equal copulation rates) or by large parties (no rise there).
- **Patrols and testosterone, Ngogo** [sobolewski2012] (secondary; still unverified). Other papers cite it for higher testosterone on patrols; a search summary gives about 25% above mean values for testosterone and cortisol. Not registered as a value.
- **Faecal testosterone and rank, Ngogo** [muehlenbein2004] (Abs) [M]. 67 faecal samples from 22 adult males: testosterone rose with rank, during a socially stable period.
- **Rank, testosterone and lean mass, Ngogo** [negrey2023] (Abs) [M]. Rank was positively associated with aggression rate, average testosterone and creatinine (lean mass). Testosterone was negatively associated with aggression rate. Lean mass, not aggression, links rank and testosterone.
- **Testosterone and energy, Kanyawara** [mullerWrangham2005] (Abs) [M]. 11 males: short-term changes in food did not lower testosterone; wild males had lower testosterone than 11 captive males. Short-term variation is more likely social than energetic.
- **Testosterone and pant-hoots, Kanyawara** [fedurek2016] (Abs) [M]. Hourly testosterone was positively associated with hourly pant-hoot rates; monthly levels with monthly rates, controlling for fission–fusion rates.

### Oxytocin (affiliation)

- **Grooming with bond partners** [crockford2013] (Abs) [M]. Urinary oxytocin was higher after grooming with a bond partner than with a non-bond partner or after no grooming, whatever the relatedness or sexual interest; grooming duration and direction did not explain it. Site and n are not in the abstract.
- **Food sharing** [wittig2014] (Abs) [M]. Urinary oxytocin was higher after food sharing than after other social feeding, whatever the prior bond, and higher than after grooming. Site and n are not in the abstract.
- **Post-conflict affiliation, Taï males** [preis2018] (Abs) [M]. Oxytocin after reconciliation, after bystander affiliation and after affiliation unrelated to conflict was higher than after aggression alone or after periods without interaction. Relationship quality raised the chance of reconciliation but not oxytocin.
- **Intergroup conflict, Taï** [samuni2017]: already cited (patrols section). Higher before and during intergroup conflict in both sexes, linked to cohesion.

## 9. New source list (E2, E3, E4)

- *new* kosheleff2009: Kosheleff VP, Anderson CNK 2009. Temperature's influence on the activity budget, terrestriality, and sun exposure of chimpanzees in the Budongo Forest, Uganda. *American Journal of Physical Anthropology* 139(2):172–181. [doi:10.1002/ajpa.20970](https://doi.org/10.1002/ajpa.20970) (Abs).
- *new* takemoto2004: Takemoto H 2004. Seasonal change in terrestriality of chimpanzees in relation to microclimate in the tropical forest. *American Journal of Physical Anthropology* 124(1):81–92. [doi:10.1002/ajpa.10342](https://doi.org/10.1002/ajpa.10342) (Abs).
- *new* pruetz2018: Pruetz JD 2018. Nocturnal behavior by a diurnal ape, the West African chimpanzee (*Pan troglodytes verus*), in a savanna environment at Fongoli, Senegal. *American Journal of Physical Anthropology* 166(3):541–548. [doi:10.1002/ajpa.23434](https://doi.org/10.1002/ajpa.23434) (Abs).
- *new* wessling2018: Wessling EG, Deschner T, Mundry R, Pruetz JD, Wittig RM, Kühl HS 2018. Seasonal variation in physiology challenges the notion of chimpanzees (*Pan troglodytes verus*) as a forest-adapted species. *Frontiers in Ecology and Evolution* 6:60. [doi:10.3389/fevo.2018.00060](https://doi.org/10.3389/fevo.2018.00060) (FT extract).
- *new* pontzer2021: Pontzer H, Brown MH, Wood BM et al. 2021. Evolution of water conservation in humans. *Current Biology* 31(8):1804–1810.e5. [doi:10.1016/j.cub.2021.02.045](https://doi.org/10.1016/j.cub.2021.02.045) (Abs).
- *new* nelson2022: Nelson RS, Lonsdorf EV, Terio KA, Wellens KR, Lee SM, Murray CM 2022. Drinking frequency in wild lactating chimpanzees (*Pan troglodytes schweinfurthii*) and their offspring. *American Journal of Primatology* 84(6):e23371. [doi:10.1002/ajp.23371](https://doi.org/10.1002/ajp.23371) (FT, accepted manuscript at par.nsf.gov).
- *new* mackenzie2025: MacKenzie C, Brodnan S, Felsche E et al. 2025. Wild chimpanzees (*Pan troglodytes schweinfurthii*) use tools to access out of reach water. *American Journal of Primatology* 87(4):e70036. [doi:10.1002/ajp.70036](https://doi.org/10.1002/ajp.70036) (FT, PMC12011317). research.md §7 links this paper without a key.
- *new* lodwick2004: Lodwick JL, Borries C, Pusey AE, Goodall J, McGrew WC 2004. From nest to nest—influence of ecology and reproduction on the active period of adult Gombe chimpanzees. *American Journal of Primatology* 64(3):249–260. [doi:10.1002/ajp.20076](https://doi.org/10.1002/ajp.20076) (Abs).
- *new* khayer2025: Khayer T, Desruelle KJ, Curteanu C, Sellen DW, Watts DP, Bădescu I 2025. Developmental and sex-based variation in nest building among wild immature chimpanzees. *American Journal of Primatology* 87(3):e70011. [doi:10.1002/ajp.70011](https://doi.org/10.1002/ajp.70011) (FT extract, PMC11868824).
- *new* tagg2018: Tagg N, McCarthy M, Dieguez P et al. 2018. Nocturnal activity in wild chimpanzees (*Pan troglodytes*): evidence for flexible sleeping patterns and insights into human evolution. *American Journal of Physical Anthropology* 166(3):510–529. [doi:10.1002/ajpa.23478](https://doi.org/10.1002/ajpa.23478) (Abs).
- *new* lacroux2022: Lacroux C, Robira B, Kane-Maguire N, Guma N, Krief S 2022. Between forest and croplands: nocturnal behavior in wild chimpanzees of Sebitoli, Kibale National Park, Uganda. *PLoS ONE* 17(5):e0268132. [doi:10.1371/journal.pone.0268132](https://doi.org/10.1371/journal.pone.0268132) (Abs).
- *new* zamma2014: Zamma K 2014. What makes wild chimpanzees wake up at night? *Primates* 55(1):51–57. [doi:10.1007/s10329-013-0367-1](https://doi.org/10.1007/s10329-013-0367-1) (Abs).
- *new* videan2006: Videan EN 2006. Sleep in captive chimpanzee (*Pan troglodytes*): the effects of individual and environmental factors on sleep duration and quality. *Behavioural Brain Research* 169(2):187–192. [doi:10.1016/j.bbr.2005.12.014](https://doi.org/10.1016/j.bbr.2005.12.014) (Abs).
- *new* nunnSamson2018: Nunn CL, Samson DR 2018. Sleep in a comparative context: investigating how human sleep differs from sleep in other primates. *American Journal of Physical Anthropology* 166(3):601–612. [doi:10.1002/ajpa.23427](https://doi.org/10.1002/ajpa.23427) (Abs).
- *new* daan1984: Daan S, Beersma DG, Borbély AA 1984. Timing of human sleep: recovery process gated by a circadian pacemaker. *American Journal of Physiology-Regulatory, Integrative and Comparative Physiology* 246(2):R161–R183. [doi:10.1152/ajpregu.1984.246.2.R161](https://doi.org/10.1152/ajpregu.1984.246.2.R161) (Abs).
- *new* borbely2022: Borbély A 2022. The two-process model of sleep regulation: beginnings and outlook. *Journal of Sleep Research* 31(4):e13598. [doi:10.1111/jsr.13598](https://doi.org/10.1111/jsr.13598) (Abs; open access).
- *new* alrazi2026: Al-Razi H, Muhayeyezu F, Mulindahabi F et al. 2026. Thermal adaptation and the potential anticipation of overnight weather in the nesting decisions of chimpanzees. *Current Biology* 36(10):2662–2672.e5. [doi:10.1016/j.cub.2026.04.005](https://doi.org/10.1016/j.cub.2026.04.005) (Abs).
- *new* anderson2019: Anderson JR, Ang MYL, Lock LC, Weiche I 2019. Nesting, sleeping, and nighttime behaviors in wild and captive great apes. *Primates* 60(4):321–332. [doi:10.1007/s10329-019-00723-2](https://doi.org/10.1007/s10329-019-00723-2) (FT, author copy).
- *new* fruth2018: Fruth B, Tagg N, Stewart F 2018. Sleep and nesting behavior in primates: a review. *American Journal of Physical Anthropology* 166(3):499–509. [doi:10.1002/ajpa.23373](https://doi.org/10.1002/ajpa.23373) (FT, author copy).
- *new* carlson2013: Carlson BA, Rothman JM, Mitani JC 2013. Diurnal variation in nutrients and chimpanzee foraging behavior. *American Journal of Primatology* 75(4):342–349. [doi:10.1002/ajp.22112](https://doi.org/10.1002/ajp.22112) (Abs).
- *new* keramatiGutkin2014: Keramati M, Gutkin B 2014. Homeostatic reinforcement learning for integrating reward collection and physiological stability. *eLife* 3:e04811. [doi:10.7554/eLife.04811](https://doi.org/10.7554/eLife.04811) (Abs; open access).
- *new* mullerWrangham2004a: Muller MN, Wrangham RW 2004. Dominance, cortisol and stress in wild chimpanzees (*Pan troglodytes schweinfurthii*). *Behavioral Ecology and Sociobiology* 55(4):332–340. [doi:10.1007/s00265-003-0713-1](https://doi.org/10.1007/s00265-003-0713-1) (Abs).
- *new* mullerWrangham2004b: Muller MN, Wrangham RW 2004. Dominance, aggression and testosterone in wild chimpanzees: a test of the 'challenge hypothesis'. *Animal Behaviour* 67(1):113–123. [doi:10.1016/j.anbehav.2003.03.013](https://doi.org/10.1016/j.anbehav.2003.03.013) (secondary; abstract not reached).
- *new* mullerWrangham2005: Muller MN, Wrangham RW 2005. Testosterone and energetics in wild chimpanzees (*Pan troglodytes schweinfurthii*). *American Journal of Primatology* 66(2):119–130. [doi:10.1002/ajp.20132](https://doi.org/10.1002/ajp.20132) (Abs).
- *new* muller2021: Muller MN, Enigk DK, Fox SA et al. 2021. Aggression, glucocorticoids, and the chronic costs of status competition for wild male chimpanzees. *Hormones and Behavior* 130:104965. [doi:10.1016/j.yhbeh.2021.104965](https://doi.org/10.1016/j.yhbeh.2021.104965) (FT, accepted manuscript at par.nsf.gov).
- *new* mullerLipson2003: Muller MN, Lipson SF 2003. Diurnal patterns of urinary steroid excretion in wild chimpanzees. *American Journal of Primatology* 60(4):161–166. [doi:10.1002/ajp.10103](https://doi.org/10.1002/ajp.10103) (Abs).
- *new* emeryThompson2010: Emery Thompson M, Muller MN, Kahlenberg SM, Wrangham RW 2010. Dynamics of social and energetic stress in wild female chimpanzees. *Hormones and Behavior* 58(3):440–449. [doi:10.1016/j.yhbeh.2010.05.009](https://doi.org/10.1016/j.yhbeh.2010.05.009) (Abs).
- *new* preis2019: Preis A, Samuni L, Deschner T, Crockford C, Wittig RM 2019. Urinary cortisol, aggression, dominance and competition in wild, West African male chimpanzees. *Frontiers in Ecology and Evolution* 7:107. [doi:10.3389/fevo.2019.00107](https://doi.org/10.3389/fevo.2019.00107) (FT extract).
- *new* preis2018: Preis A, Samuni L, Mielke A, Deschner T, Crockford C, Wittig RM 2018. Urinary oxytocin levels in relation to post-conflict affiliations in wild male chimpanzees (*Pan troglodytes verus*). *Hormones and Behavior* 105:28–40. [doi:10.1016/j.yhbeh.2018.07.009](https://doi.org/10.1016/j.yhbeh.2018.07.009) (Abs).
- *new* wittig2015: Wittig RM, Crockford C, Weltring A, Deschner T, Zuberbühler K 2015. Single aggressive interactions increase urinary glucocorticoid levels in wild male chimpanzees. *PLoS ONE* 10(2):e0118695. [doi:10.1371/journal.pone.0118695](https://doi.org/10.1371/journal.pone.0118695) (FT, PMC4340946).
- *new* wittig2016: Wittig RM, Crockford C, Weltring A, Langergraber KE, Deschner T, Zuberbühler K 2016. Social support reduces stress hormone levels in wild chimpanzees across stressful events and everyday affiliations. *Nature Communications* 7:13361. [doi:10.1038/ncomms13361](https://doi.org/10.1038/ncomms13361) (FT, PMC5097121).
- *new* wittig2014: Wittig RM, Crockford C, Deschner T, Langergraber KE, Ziegler TE, Zuberbühler K 2014. Food sharing is linked to urinary oxytocin levels and bonding in related and unrelated wild chimpanzees. *Proceedings of the Royal Society B* 281(1778):20133096. [doi:10.1098/rspb.2013.3096](https://doi.org/10.1098/rspb.2013.3096) (Abs).
- *new* crockford2013: Crockford C, Wittig RM, Langergraber K, Ziegler TE, Zuberbühler K, Deschner T 2013. Urinary oxytocin and social bonding in related and unrelated wild chimpanzees. *Proceedings of the Royal Society B* 280(1755):20122765. [doi:10.1098/rspb.2012.2765](https://doi.org/10.1098/rspb.2012.2765) (Abs).
- *new* sobolewski2013: Sobolewski ME, Brown JL, Mitani JC 2013. Female parity, male aggression, and the Challenge Hypothesis in wild chimpanzees. *Primates* 54(1):81–88. [doi:10.1007/s10329-012-0332-4](https://doi.org/10.1007/s10329-012-0332-4) (Abs).
- *new* muehlenbein2004: Muehlenbein MP, Watts DP, Whitten PL 2004. Dominance rank and fecal testosterone levels in adult male chimpanzees (*Pan troglodytes schweinfurthii*) at Ngogo, Kibale National Park, Uganda. *American Journal of Primatology* 64(1):71–82. [doi:10.1002/ajp.20062](https://doi.org/10.1002/ajp.20062) (Abs).
- *new* muehlenbeinWatts2010: Muehlenbein MP, Watts DP 2010. The costs of dominance: testosterone, cortisol and intestinal parasites in wild male chimpanzees. *BioPsychoSocial Medicine* 4:21. [doi:10.1186/1751-0759-4-21](https://doi.org/10.1186/1751-0759-4-21) (Abs; open access).
- *new* negrey2023: Negrey JD, Deschner T, Langergraber KE 2023. Lean muscle mass, not aggression, mediates a link between dominance rank and testosterone in wild male chimpanzees. *Animal Behaviour* 202:99–109. [doi:10.1016/j.anbehav.2023.06.004](https://doi.org/10.1016/j.anbehav.2023.06.004) (Abs).
- *new* fedurek2016: Fedurek P, Slocombe KE, Enigk DK, Emery Thompson M, Wrangham RW, Muller MN 2016. The relationship between testosterone and long-distance calling in wild male chimpanzees. *Behavioral Ecology and Sociobiology* 70(5):659–672. [doi:10.1007/s00265-016-2087-1](https://doi.org/10.1007/s00265-016-2087-1) (Abs).
- *new* bahr2000: Bahr NI, Palme R, Möhle U, Hodges JK, Heistermann M 2000. Comparative aspects of the metabolism and excretion of cortisol in three individual nonhuman primates. *General and Comparative Endocrinology* 117(3):427–438. [doi:10.1006/gcen.1999.7431](https://doi.org/10.1006/gcen.1999.7431) (Abs).
- batesByrne2009, janmaat2014, samuni2017, sobolewski2012 and charnov1976 are already cited; the entries above add findings.

## 10. Not verified

Each item below is used at most as a labelled assumption.

- **Birth mass 1.8 kg.** No primary source reached. (E1c: desilva2011 gives 1,733 g for captive births, §12.)
- **Milton & Demment's transit times (38 h and 48 h)** and **Lambert's retention time (about 31 h).** Seen only in search snippets; the abstracts carry no hours.
- **Chimpanzee meat intake (348 g/h; 1.9 ± 1.2 kg/h) and 115 kcal per 100 g.** Seen only as cited by hardus2012. The originals (Wrangham & Conklin-Brittain 2003; Gilby 2006) were not read.
- **Activity multipliers 1.25 and 1.38, pregnancy +25%, lactation +50%, walking speeds from Mahale.** Seen only as used by nguessan2009. Leonard & Robertson 1997, Key & Ross 1999, Hunt 1989 and Coelho 1974 were not read.
- **Human pregnancy cost without fat deposition.** butteKing2005's abstract gives only the total with deposition.
- **Water turnover in litres per day** (pontzer2021 full text).
- **Decay time constant of sleep pressure.** The rise constant (18.2 h) is from a search snippet.
- **Borbély 1982**: bibliographic details not verified (no DOI in Crossref).
- **Nest clock times at Toro-Semliki and Fongoli.** Search snippets only; sources not identified.
- **Hourly activity profile.** No primary source reached.
- **sobolewski2012 (patrols and testosterone)** and **mullerWrangham2004b.** Abstracts are not exposed by the publisher's index; findings are from secondary summaries.
- **emeryThompson2010, crockford2013, wittig2014: sample sizes and effect sizes.** Abstract only; the full texts could not be opened (the archive began to require a CAPTCHA part-way through this pass, which was not bypassed).
- **Oxytocin and testosterone sampling windows.**
- **smithJungers1997 species values**, **pusey2005 growth curves**, **emeryThompson2013**: full texts not read.
- **Full texts marked "FT extract"** (wessling2018, preis2019, janmaat2014, khayer2025) were read through a fetch tool that returns quoted passages, not the whole page. The quoted numbers are reported as returned.

## 11. Addendum: milk yield and gland storage (requested by the E1 implementer, 1 October 2026)

- **Milk output scales with maternal mass^0.74** [riek2021] (Abs) [M], cross-species.
  - 47 mammal species at peak lactation, phylogenetically controlled.
  - Milk output and milk energy output both scale to the power 0.74 ± 0.05 of maternal body mass.
  - Use in Track E: supports scaling the milk-yield limit by M^0.75. The exponent is now sourced; the coefficient is not.
- **Coefficient of the milk-yield limit.** E1 uses 23.2 kcal/d per kg^0.75, from butteKing2005's 501 kcal/d of milk at a 60 kg mother. The 60 kg is not in butteKing2005's abstract, so the coefficient stays *assumed*. No chimpanzee or ape milk yield was found. Oftedal 1984 (Symposia of the Zoological Society of London 51:33–85) is the usual citation for milk energy output by species; it has no DOI in Crossref and was not read.
- **Gland storage capacity, humans** [kent1999] (Abs) [H] for humans; cross-species.
  - Exclusive breastfeeding, months 1–6: storage capacity 209.9 ± 11.0 mL per breast (SEM, 46 breasts); 24-hour production 453.6 g per breast (48 breasts).
  - Storage capacity and 24-hour production were related, and both followed infant demand.
  - Derived: storage is about 0.46 of daily production, or about 11 hours of production.
  - Use in Track E: input for gland storage, *assumed* (human).
- **Sources:**
  - *new* riek2021: Riek A 2021. Comparative phylogenetic analysis of milk output at peak lactation. *Comparative Biochemistry and Physiology Part A* 257:110976. [doi:10.1016/j.cbpa.2021.110976](https://doi.org/10.1016/j.cbpa.2021.110976) (Abs).
  - *new* kent1999: Kent JC, Mitoulas L, Cox DB, Owens RA, Hartmann PE 1999. Breast volume and milk production during extended lactation in women. *Experimental Physiology* 84(2):435–447. [doi:10.1111/j.1469-445X.1999.01808.x](https://doi.org/10.1111/j.1469-445X.1999.01808.x) (Abs; bibliography from Europe PMC).
- **Order of events for T-ENE-1 to T-ENE-3.** Their bands were committed (3ba7a86) before any simulated value was seen. The E1 implementer then reported a ledger that closes at about 1,115 kcal/d for females, with 135–175 feeding minutes per day: below both bands. The bands are left as committed.

## 12. Addendum: infant energetics (stage E1c, 1 October 2026)

Evidence pass for stage E1c (infant energetics: growth, night nursing, infant intake), 1 October 2026. Bibliographic data checked against Crossref or Europe PMC on that day. Tags as above (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population).

- **Feeding development, Kanyawara** [bray2018] (FT, PMC5739981) [M]. Extends the unkeyed entry in research.md §2 ("A life is a changing capacity").
  - n: 26 immatures and 31 adults, 2010–2013.
  - First solid food: earliest 5.1 months; most not before their eighth month (mean ± SE 7.9 ± 0.7 months, range 5.1–11.1, n = 9).
  - Suckling into the fifth year: 4.8 ± 0.7 y (range 4.1–6.0, n = 8).
  - Percent of observation time feeding on solid food rose with age; 3–4-year-olds were still below adult levels (β = −9.43, SE 2.02), and adult levels were reached between 4 and 6 years.
  - Ingestion rate (items per minute of foraging, five ripe fruit species): infants significantly below adults (β = −4.72, SE 1.15); juveniles lower but not significantly (β = −1.72, SE 0.79); adolescents close to adults. Absolute rates are only in a figure (not read).
  - Use in E1c: targets for the onset of solid food and the age at adult feeding time; direction only for ingestion rate by age (no magnitude, so not an input).
- **Nursing and foraging by age, Ngogo** [badescu2022] (FT, PMC9352031; research.md had the abstract) [M].
  - n: 72 immatures aged 0–9 y; 1,245.2 focal hours (mean 12.4 h per subject); follows between 07:00 and 17:30.
  - Suckling: 5.85 ± 3.4% of observation time at 0–6 months (1.63 ± 0.51 bouts per hour); about 3% from 6 months to 4 years (1.00 ± 0.44 bouts per hour); bouts about 2 min (2.03 ± 0.73).
  - Foraging time: 0.84 ± 1.81% at 0–6 months; 17.18 ± 15.97% at 6–12 months; 24.85 ± 8.13% at 1–2 y; 46.7 ± 6.0% at 4–5 y; adults about 47% of the day.
  - The authors: independent foraging "probably became a dietary requirement for infants at 1 year old, when their energy needs may have surpassed the available milk energy"; by 1 year infants foraged whenever their mothers did.
  - Night: "our lack of data on night-time nursing, which may be common, as it is in humans" (no night data).
  - Use in E1c: targets (daytime suckling share, foraging share by age); no input.
- **Isotopic weaning, Ngogo** [badescu2017] (Abs) [M]. Bădescu, Katzenberg, Watts, Sellen. 560 faecal samples, 48 infants with their mothers and siblings. Infants ≤ 1 y were 2.0‰ (δ15N) and 0.8‰ (δ13C) above their mothers; solid foods were eaten within 2–5 months of birth; isotopic weaning by about 4.5 y, before nipple contact ended (comfort nursing). Secondary (search summary, not in the abstract read): the decline in milk reliance starts at about 1 y and is complete at 4–4.5 y. Target, direction (milk share falls with age).
- **Feeding around 3 years, Mahale** [matsumoto2017] (Abs) [M]. 19 infants aged 1–60 months, 518 h. At about 3 years infants spent more total feeding time and more time on leaves and hard-to-process foods; milk dependence fell at about 3 years, before nipple contact ceased (around 48 months, as summarised by lonsdorf2021). Target, direction.
- **Feeding development, Gombe** [lonsdorf2021] (FT, accepted manuscript at par.nsf.gov) [M]. 81 offspring, 1975–2016. Feeding time rose fastest up to 5 years and levelled off after 6 years near the mothers' level; mothers fed 0.47 ± 0.12 (dry) and 0.44 ± 0.12 (wet season) of observation time; mean weaning age 4.7 y (citing Lonsdorf et al. 2020). Secondary: Pusey et al. 2005 showed that females "grow exponentially until 10 years of age". Target.
- **Wild growth, Gombe, read secondarily** [gurvenWalker2006] (FT appendix) [L]. "Growth data for wild chimpanzees are scant"; from pusey2005, "a very rough estimation": 10 kg at 5 y for both sexes, 21 kg (females) and 24 kg (males) at 10 y, adults 31 and 39 kg. Derived: about 1.6 kg/y from birth to 5 y, 2.2 (F) and 2.8 (M) kg/y from 5 to 10 y. Target (mass for age), low confidence: pusey2005's own curves were not read.
- **Wild against captive growth** [hamada1996] (bibliography only; the statement is from a search snippet attributed to this paper, unverified). Hamada, Udono, Teramoto, Sugawara: laboratory chimpanzees mature more than 2 years earlier than wild ones, and "the major reason for the retarded maturation in wild chimpanzees is the delay of growth from infant to the early juvenile phases (0–4 yrs of age), probably owing to a limited nutritional supply from the mother". Direction only, unverified.
- **Neonatal mass and growth in the first year, captive** [desilva2011] (FT, PMC3024680) [M] captive. Yerkes: 415 births, 47 with infant (within 2 weeks of birth) and maternal mass. Mean neonatal mass 1,733 g; neonate 3.3% of maternal mass (95% CI 3.0–3.5); at 1 year infants weigh 8.6% of their mother's mass (n = 9 dyads). Derived: about 4.5 kg at 1 year (2.6 × birth mass). Use: verifies the birth mass of 1.8 kg to within 4% (captive); the first-year gain (about 2.8 kg) is a captive, well-fed reference.
- **Growth of captive chimpanzees by setting** [curry2023] (FT, PMC10084351) [M] captive. 298 sanctuary chimpanzees (Tchimpounga, Chimfunshi, Tacugama), 1,030 zoo, 442 research. Pre-maturation growth: sanctuary 3.4 (F) and 3.8 (M) kg/y; zoo 4.7 and 5.4; research 4.8 and 5.3. Maturation breakpoint: sanctuary 12.4 (F) and 13.8 (M) y; zoo 11.4 and 11.9. Adult mass: sanctuary 43.5 ± 7.5 (F), 52.6 ± 8.1 kg (M). Use: captive references that bracket the potential growth rate of a well-fed animal.
- **Offspring growth and weaning, Kanyawara** [emeryThompson2016] (Abs, via Europe PMC; already listed) [M]. Juvenile lean mass (urinary creatinine) rose with the interval to the next sibling's birth; low maternal energy balance during lactation predicted larger, not smaller, juveniles; "offspring growth suffers when mothers wean early". Target, direction: more milk, more growth.
- **Night: nest sharing and night suckling.**
  - [khayer2025] (FT extract, via Europe PMC) [M] for nest sharing: "infants continue to regularly share night nests with their mothers at least until they are weaned (at 4–5 years old in *P. troglodytes*)", sometimes to 10 years (citing van Lawick-Goodall 1968 and others); nest sharing enables "night-time nutritive or comfort nursing" (cited to human studies, Gettler & McKenna 2011 and McKenna et al. 2007). No wild chimpanzee measurement of night nursing.
  - [mizuno2006] (Abs via search snippet; bibliography from Crossref) [L]. Mizuno, Takeshita, Matsuzawa: night behaviour of 3 mother-reared captive newborns in their first 4 months; infants suckled at night (with eyes open until the end of month 2, mostly with eyes closed thereafter). Direction only: chimpanzee infants suckle at night.
  - badescu2022: no night data (above).
  - Use in E1c: night suckling in the mother's nest is a mechanism with [L] support (captive newborns, human analogy); its amount is not an input.
- **Intake rate and body size.** No chimpanzee measurement of ingestion rate (kcal per minute) against body mass was found; bray2018 gives only the direction (infants below adults, juveniles not significantly). The size scaling of intake capacity used in E1c is a design assumption.

**Not verified (E1c):** hamada1996's statement (snippet only); the Gombe mass-for-age values (secondary, via gurvenWalker2006); the course of milk reliance between 1 and 4.5 y in badescu2017 (search summary, not the abstract); mizuno2006 details (search snippet); any chimpanzee or ape value for night suckling frequency, milk yield or gland capacity.

**Sources:**
- *new* bray2018: Bray J, Emery Thompson M, Muller MN, Wrangham RW, Machanda ZP 2018. The development of feeding behavior in wild chimpanzees (*Pan troglodytes schweinfurthii*). *American Journal of Physical Anthropology* 165(1):34–46 (online 26 September 2017). [doi:10.1002/ajpa.23325](https://doi.org/10.1002/ajpa.23325) (FT, PMC5739981).
- *new* badescu2017: Bădescu I, Katzenberg MA, Watts DP, Sellen DW 2017. A novel fecal stable isotope approach to determine the timing of age-related feeding transitions in wild infant chimpanzees. *American Journal of Physical Anthropology* 162(2):285–299. [doi:10.1002/ajpa.23116](https://doi.org/10.1002/ajpa.23116) (Abs).
- *new* matsumoto2017: Matsumoto T 2017. Developmental changes in feeding behaviors of infant chimpanzees at Mahale, Tanzania: implications for nutritional independence long before cessation of nipple contact. *American Journal of Physical Anthropology* 163(2):356–366. [doi:10.1002/ajpa.23212](https://doi.org/10.1002/ajpa.23212) (Abs).
- *new* lonsdorf2021: Lonsdorf EV, Stanton MA, Wellens KR, Murray CM 2021. Wild chimpanzee offspring exhibit adult-like foraging patterns around the age of weaning. *American Journal of Physical Anthropology* 175(1):268–281. [doi:10.1002/ajpa.24267](https://doi.org/10.1002/ajpa.24267) (FT, accepted manuscript).
- *new* gurvenWalker2006: Gurven M, Walker R 2006. Energetic demand of multiple dependents and the evolution of slow human growth. *Proceedings of the Royal Society B* 273(1588):835–841. [doi:10.1098/rspb.2005.3380](https://doi.org/10.1098/rspb.2005.3380) (FT, electronic appendix).
- *new* hamada1996: Hamada Y, Udono T, Teramoto M, Sugawara T 1996. The growth pattern of chimpanzees: somatic growth and reproductive maturation in *Pan troglodytes*. *Primates* 37(3):279–295. [doi:10.1007/BF02381860](https://doi.org/10.1007/BF02381860) (bibliography only).
- *new* desilva2011: DeSilva JM 2011. A shift toward birthing relatively large infants early in human evolution. *PNAS* 108(3):1022–1027. [doi:10.1073/pnas.1003865108](https://doi.org/10.1073/pnas.1003865108) (FT, PMC3024680).
- *new* curry2023: Curry BA, Drane AL, Atencia R et al. 2023. Body mass and growth rates in captive chimpanzees (*Pan troglodytes*) cared for in African wildlife sanctuaries, zoological institutions, and research facilities. *Zoo Biology* 42(1):98–106. [doi:10.1002/zoo.21718](https://doi.org/10.1002/zoo.21718) (FT, PMC10084351).
- *new* mizuno2006: Mizuno Y, Takeshita H, Matsuzawa T 2006. Behavior of infant chimpanzees during the night in the first 4 months of life: smiling and suckling in relation to behavioral state. *Infancy* 9(2):221–240. [doi:10.1207/s15327078in0902_7](https://doi.org/10.1207/s15327078in0902_7) (Abs, search snippet).
- badescu2022, emeryThompson2012, emeryThompson2016, pusey2005, khayer2025 and kent1999 are already listed; the entries above add findings.

## 13. Addendum: nursing, milk supply and comfort suckling (stage E1d, 1 October 2026)

Evidence pass for stage E1d (nursing valued by the milk it delivers; milk supply against maternal condition; comfort suckling), 1 October 2026. Bibliographic data from Europe PMC or Crossref on that day; tags as above.

- **Milk output against maternal energy intake, baboons** [roberts1985] (Abs) [M] captive. Energy intake, milk output and energy balance in baboons fed ad libitum, or 80% or 60% of ad libitum intake during lactation. Restriction raised the efficiency of energy use by an estimated 17–25%; at 80% milk output and body stores were protected; at 60% milk output fell and body nutrient mobilisation rose. The authors: low intake impairs lactation "when it is also severe enough to increase body nutrient mobilization". No milk volumes in the abstract. Use in E1d: synthesis is buffered against moderate deficits; only a severe deficit lowers it (no threshold in units of body reserves is given).
- **Supplementing mothers does not raise milk volume, The Gambia** [prentice1983] (Abs) [H] human. 130 nursing mothers, 12 months; energy intake raised from 1,568 ± 15 to 2,291 ± 14 kcal/d; no effect on breast-milk volume at any stage of lactation or season, and none on mothers with poor outputs; protein concentration +6.6%. Use: direction (milk volume is not limited by moderate maternal energy shortfall).
- **Variation in milk among rhesus mothers** [hinde2009] (Abs) [M] captive, well fed. Milk yield value (milk obtained after 3.5–4 h of separation) rose with parity and with infant weight; milk energy density and yield both rose as infants aged, with a trade-off (mothers whose milk energy rose more raised yield less, and their infants grew more slowly). Use: direction only (maternal condition matters; no energy-balance dose-response).
- **Milk synthesis follows removal, women** [daly1993] (Abs) [M] human. Seven mothers, breast volume before and after each feed over 24 h: short-term synthesis rates varied between breasts and between feeds and, for 6 of 13 breasts, rose with the degree to which the breast had been emptied (r² 0.32–0.95). With kent1999 (storage and 24-h production followed infant demand): supply follows the infant's removal. Use: supports the existing rule that a full store stops synthesis.
- **Comfort (non-nutritive) nursing, chimpanzees.** badescu2017 (Abs): isotopic weaning by about 4.5 y, before nipple contact ended ("comfort nursing"). badescu2022 (FT): nursing time about 3% of observation time from 6 months to 4 years with no significant change across those ages, while foraging time rose from 17% to 47%. matsumoto2017 (Abs): milk dependence fell at about 3 y, before nipple contact ceased. Use: field suckling time is nipple contact, part of it non-nutritive; a model of nutritive suckling only should fall at or below the field share.

**Not verified (E1d):** milk volumes of roberts1985 (not in the abstract); any chimpanzee or ape relation between maternal energy balance and milk output; any measurement of how much of chimpanzee nipple contact transfers milk.

**Sources:**
- *new* roberts1985: Roberts SB, Cole TJ, Coward WA 1985. Lactational performance in relation to energy intake in the baboon. *American Journal of Clinical Nutrition* 41(6):1270–1276. [doi:10.1093/ajcn/41.6.1270](https://doi.org/10.1093/ajcn/41.6.1270) (Abs).
- *new* prentice1983: Prentice AM, Roberts SB, Prentice A, Paul AA, Watkinson M, Watkinson AA, Whitehead RG 1983. Dietary supplementation of lactating Gambian women. I. Effect on breast-milk volume and quality. *Human Nutrition: Clinical Nutrition* 37(1):53–64. PMID 6341320 (Abs).
- *new* hinde2009: Hinde K, Power ML, Oftedal OT 2009. Rhesus macaque milk: magnitude, sources, and consequences of individual variation over lactation. *American Journal of Physical Anthropology* 138(2):148–157. [doi:10.1002/ajpa.20911](https://doi.org/10.1002/ajpa.20911) (Abs).
- *new* daly1993: Daly SE, Owens RA, Hartmann PE 1993. The short-term synthesis and infant-regulated removal of milk in lactating women. *Experimental Physiology* 78(2):209–220. [doi:10.1113/expphysiol.1993.sp003681](https://doi.org/10.1113/expphysiol.1993.sp003681) (Abs).
- badescu2017, badescu2022, matsumoto2017 and kent1999 are already listed.

