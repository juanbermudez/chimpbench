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
| Leaving the nest before sunrise | 18% of departures (5 females, 179 days, Taï, fruit-scarce periods); earlier when breakfast is an ephemeral fruit and far away | janmaat2014 (FT; read in full for E2b) | [M] | target (T-RHY-3) |
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
- **Active day, Budongo** [batesByrne2009] (in the registry; read in full for stage E2b, see the E2b addendum): 11 h 34 min for males, 10 h 57 min for lactating females. Today this is the parameter `activeDayH`; Track E turns it into a target (T-RHY-1).
- **Leaving the nest, Taï** [janmaat2014] (FT extract; read in full for stage E2b, see the E2b addendum) [M].
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

## 14. Addendum: growth potential, lactation course and weaning (stage E1f, 1 October 2026)

Evidence pass for stage E1f, 1 October 2026. With the energy ledger (E1c, E1d) infants hold their reserves, but three misses remain: weaning at about 7.2 y against 4–5 y in the field, with infants eating solids in 3–9% of daylight against 17–47%; a milk cost that never falls; and infants that grow at the full stylised potential (linear from 1.8 kg at birth to 31.3 kg at 10 y for females, 39 kg at 13 y for males) and come out too heavy. Bibliographic data were checked against OpenAlex and Europe PMC on that day (the Crossref API was rate-limiting). Tags as above. The request named this section "§13"; it is numbered 14 because §13 holds the E1d addendum. Earlier entries are extended, not repeated.

### 14.1 Key numbers

| Item | Value | Source | Evidence | Read as | Use |
| --- | --- | --- | --- | --- | --- |
| Captive growth rate before mass maturation | Sanctuary F 3.4 (95% CI 2.8–4.1), M 3.8 (3.4–4.3) kg/y; zoo F 4.7, M 5.4; research F 4.8, M 5.3 | curry2023 | [M] captive | FT | input (potential rate) |
| Captive age at mass maturation | Sanctuary F 12.4, M 13.8 y; zoo 11.4, 11.9; research 11.2, 12.0; no sex difference within a setting | curry2023 | [M] captive | FT | check |
| Captive adult mass | Sanctuary F 43.5 ± 7.5, M 52.6 ± 8.1 kg; zoo 54.7, 61.8; research 58.7, 63.8 | curry2023 | [M] captive | FT | not an input (35–88% above the Gombe medians) |
| First-year growth, captive | 1.73 kg at birth, about 4.5 kg at 1 y (2.8 kg in the year) | desilva2011 (§12) | [M] captive | FT | input (first-year limit) |
| Sex difference in growth | By rate, not duration, in common chimpanzees | leighShea1996, curry2023 | [M] | Abs, FT | input (shape) |
| Growth when well fed or after a delay | No adolescent spurt when well fed; catch-up growth after juvenile delay (12 captive animals) | hamadaUdono2002 | [M] captive | Abs | mechanism citation |
| Captive against wild maturation | Captive animals mature 2–3 y earlier; the wild delay is mostly at 0–4 y | gurvenWalker2006, hamada1996 | [L] | secondary | target, direction |
| Weaned age, Gombe | 4.71 ± 1.04 y (range 2.82–8.01), n = 37 of 65 offspring, 29 mothers; females 88.5 days earlier | lonsdorf2020 | [H] | FT | target |
| Isotopic weaning, Ngogo | Largest milk signal at ≤ 1–2 y; decline from about 1–1.5 y; end at 4–4.5 y; nipple contact to about 7 y | badescu2016, lonsdorf2020 (both citing badescu2017), badescu2023 | [M] | FT (secondary to badescu2017) | target |
| Nursing rate and bout length | 1.1 ± 0.48 bouts/h overall (0.15–2.52; 42 pairs, 831 h); bouts about 2 min at every age (P = 0.84) | badescu2016, badescu2022 | [H], [M] | FT | target |
| Suckling and eating time, Gombe | Suckling 2–3.71% of observation time, no trend from 0 to 5 y; eating 0.2% (0–0.5 y) to 22% (1.5–2 y), 32% (3–3.5 y), 49% (4.5–5 y); 40 infants | lonsdorf2014 | [H] | FT | target |
| Weaning conflict | Rebuffs at the nipple at 5–6 months; more conflict at about 12 and 18 months; rejections from 2–3 y before weaning, stronger when mothers resume cycling (infant 3–4 y) | vandeRijtPlooij1987, clark1977 via maestripieri2002 | [M], [L] | Abs, secondary | target, direction (no rates exist) |
| Chimpanzee lactation course | Steady from about 1 y to about 4 y (inferred from nursing and isotopes, not measured) | badescu2022, badescuThesis2017, badescu2023 | [M] | FT | target; constrains the mechanism |
| Human milk by stage | 807 g/d in months 1–6 (exclusive) → 550 g/d after 6 months; cost 675 → 460 kcal/d | fao2004 | [H] human | FT extract | cross-species check |
| Human milk, late lactation | 875 ml/d at 7 months (93% of energy) → 550 ml/d at 11–16 months (50%); 10 infants | dewey1984 | [M] human | Abs | cross-species check |
| Production follows demand | Per breast 453.6 g/d (months 1–6) → 208.0 ± 56.7 g/d at 15 months; extra supply is not drunk for long; a milk protein inhibits secretion locally | kent1999, deweyLonnerdal1986, wilde1995 | [H], [M], [M] | Abs | mechanism citation (cross-species) |
| Ape milk energy | Wild mountain gorilla 0.53 kcal/g (fat 1.9%, protein 1.4%, sugar 6.8%; n = 7) against human 0.67 | whittier2011, fao2004 | [M] | Abs | sensitivity of the yield |
| Suckling time and milk intake | Weak relation across mammals; none in the one isotope study | cameron1998 | [M] | Abs (search) | caution for nursing targets |
| Infant intake rate | No kcal/min by age for chimpanzees. Skill-limited: whole hard fruits by 2 y, adult technique by 4 y; orangutans reach adult items/min on easy foods just after weaning, and toughness does not slow them | corpByrne2002, schuppli2016 | [M] | Abs, FT | gap; mechanism citation |

### 14.2 Growth: a captive potential and the wild outcome

- **Captive growth by setting, re-read** [curry2023] (FT, Europe PMC full text) [M] captive. Extends §12.
  - Design: one randomly chosen mass per animal; piecewise linear regression of mass on age by sex. The first slope is the growth rate, the breakpoint the age at mass maturation. The authors note that the method treats growth rate as constant.
  - n (Table 3): sanctuary 151 M, 147 F; zoo 409 M, 621 F; research 194 M, 243 F. Sanctuary: 252 of 298 were wild-born orphans confiscated, commonly at about 1–3 y; mixed-age groups in forest enclosures of 2.5–77 ha, natural vegetation plus supplementary fruit and vegetables. Zoo: Europe and North America, 2000–2021. Research: Alamogordo, M.D. Anderson and Yerkes, chow diet, 1980–2011.
  - Growth rate, kg/y (95% CI): sanctuary M 3.8 (3.4–4.3), F 3.4 (2.8–4.1); zoo M 5.4 (5.0–6.0), F 4.7 (4.2–5.2); research M 5.3 (5.0–5.7), F 4.8 (4.2–5.9).
  - Breakpoint, y: sanctuary M 13.8 (12.5–14.9), F 12.4 (10.9–13.7); zoo M 11.9 (10.9–12.5), F 11.4 (10.6–12.3); research M 12.0 (11.3–12.5), F 11.2 (9.5–12.5). Within a setting the breakpoint did not differ by sex; males grew faster than females in zoo and research animals (P < .001), not in sanctuary animals.
  - Adult mass, kg (mean ± SD, n): sanctuary M 52.6 ± 8.1 (82), F 43.5 ± 7.5 (93); zoo M 61.8 ± 10.2 (266), F 54.7 ± 10.4 (444); research M 63.8 ± 10.1 (86), F 58.7 ± 12.7 (139).
  - Exploratory: sanctuary orphans grew 3.2 kg/y, sanctuary-born animals 3.6 kg/y (small sanctuary-born sample).
  - Derived: birth mass (1.73 kg, desilva2011) + rate × breakpoint gives the adult mean within 4.2 kg in every setting and sex (sanctuary F: 1.73 + 3.4 × 12.4 = 43.9 against 43.5). Sanctuary adults are 35–39% heavier than the Gombe medians, zoo and research adults 58–88% heavier.
  - Use: input for the potential growth rate (14.6).
- **First year, captive** [desilva2011] (§12): 1,733 g at birth; 8.6% of maternal mass at 1 y (n = 9 dyads), about 4.5 kg. Derived: 2.8 kg gained in the first year, 0.5–0.8 of the captive slopes above. Even when well fed, infants gain fewer kilograms per year than juveniles.
- **Sexual dimorphism by rate** [leighShea1996] (Abs) [M] captive (the colony is not named in the abstract). In common chimpanzees dimorphism comes from a sex difference in the rate of mass growth, not its duration; between genera, size differences come mostly from rate. curry2023 agrees for zoo and research animals. Use: input for the shape of the potential (the sexes differ in rate and end at about the same age).
- **Growth spurt and catch-up** [hamadaUdono2002] (Abs) [M] captive. Longitudinal summed length (crown–rump, thigh and leg) of 12 captive chimpanzees: animals in favourable conditions had no adolescent growth spurt; only animals whose juvenile growth had been delayed showed one, at adolescence (catch-up growth). Use: mechanism citation for growth that resumes after a shortfall and goes on past the usual age until adult size (the E1c rule without an age gate).
- **Laboratory against wild.**
  - [kimuraHamada1996] (abstract as returned by a search summary and Semantic Scholar) [L]. The skeleton of a wild juvenile *P. t. verus* of known age, and other wild-born immatures of all three subspecies, were smaller than laboratory-born juveniles of the same age; the gap was larger in limb bones than in the cranium. No masses. Target, direction.
  - [hamada1996] (still a search snippet; §12): laboratory animals mature more than 2 years earlier, and the wild delay falls mostly at 0–4 y, which the authors attribute to a limited supply of nutrition from the mother. A further search summary attributes to the paper mass maturation at about 12.5 y (F) and 15.0 y (M) and adult means of 42.7 kg (F) and 53.2 kg (M) for the Sanwa colony. Unverified.
  - [gurvenWalker2006] electronic appendix (FT, re-read) [L]: captive chimpanzees mature 2–3 years earlier than wild ones and grow larger and faster, partly because they are fed abundantly. No data are shown for the 2–3 years.
- **Wild mass** [pusey2005] (abstract re-read through its index entry): mass varied more in young and old animals than in prime adults, and was highest during frequent banana provisioning. Direction only: food raises wild mass.
- **Captive infants, 0–24 months** [marzke1996] (Abs) [M] captive. 175 animals from three US colonies, mixed longitudinal: weight curves tended to differ between colonies (4 comparisons significant); rearing (mother- or hand-reared) differed in hand and wrist maturation. No masses in the abstract. Direction: well-fed growth still varies with the environment.
- **Growth as allocation** [west2001] (Abs, via search) theory. A growth model derived from how metabolic energy is split between maintaining existing tissue and making new tissue. Use: mechanism citation for growth paid from what remains after maintenance (the E1c surplus rule). No parameter is taken from it.
- Not read: Smith, Butler & Pace 1975 (Holloman colony; [smithButlerPace1975], abstract without numbers), Grether & Yerkes 1940, Gavan 1953.

### 14.3 Lactation course and its regulation

- **Chimpanzee lactation holds steady after the first year** [badescu2022] (FT, re-read) [M] and [badescuThesis2017] (FT) [M].
  - badescu2022: nursing bout length did not change with age (P = 0.84); nursing time and rate stayed at about 3% and 1.00 bouts/h from 6 months to 4 y; infant sex and maternal parity did not affect nursing; infants of first-time mothers foraged more. Foraging bouts lengthened from 5.87 ± 4.02 min (6–12 months) to 8.02 ± 2.52 min (1–2 y) and 22.18 ± 18.61 min (over 6 y); the rate of foraging bouts rose until 1 y and then stayed level.
  - The authors' reading: milk transfer probably stays constant while infants add solid food, so lactation effort in apes may hold a plateau through most of infancy.
  - Thesis (chapter 3, the same study): infants' energy needs exceed the milk available at about 1 y; lactation effort then holds for about 3 years and ends with physiological weaning at about 4 y. The thesis also argues that mothers' energy balance stays stable through lactation, because mothers' feeding changes little with infant age at Mahale and Gombe (Hiraiwa-Hasegawa 1990; Murray et al. 2009).
  - Limit: milk transfer was not measured; the plateau is inferred from nipple time and faecal isotopes. Use: target, and a constraint on the mechanism (milk output need not fall between 1 and 4 y).
- **Hair isotopes, Ngogo** [badescu2023] (FT, PMC11650929) [M].
  - 164 naturally shed hairs: 29 infants (61 hairs), 6 juveniles (7), 28 mothers (67), 14 adult males (29); 1–13 hairs per infant age class.
  - Infant minus mother δ15N: 0.7 ± 0.6‰ (hair grown in utero), 1.1 ± 1.2‰ (0–1 y), 2.1 ± 0.9‰ (1–2 y, the maximum), 0.4 ± 0.4‰ (2–2.5 y), 1.2 ± 0.5‰ (2.5–3.5 y). The difference fell with age (GEE β = −0.008, SE 0.004, P = 0.026).
  - Three males aged 4–7.5 y still had higher δ15N than their mothers; the authors suggest some chimpanzees are not weaned until nearly 8 y, and that milk stays an important food after 2.5 y.
  - Use: target.
- **Human milk volume and cost by stage** [fao2004] (FT extract of section 7) [H] human, cross-species.
  - Milk: 807 g/d in months 1–6 of exclusive breastfeeding; 550 g/d after 6 months (partial breastfeeding); 2.8 kJ/g (0.67 kcal/g) from 1 to 24 months; conversion efficiency 0.80.
  - Cost: 2.8 MJ/d (675 kcal/d) in months 1–6, of which 0.72 MJ/d (170 kcal/d) comes from fat stores in well-nourished women (505 kcal/d from food); 1.925 MJ/d (460 kcal/d) after 6 months.
  - Derived: after 6 months, milk volume and cost are 0.68 of their level in months 1–6.
- **Late lactation, test-weighed** [dewey1984] (Abs) [M] human. 10 infants test-weighed in months 7–16 (composition from 46 women): breast milk 875 ml/d at 7 months (93% of total energy intake) and 550 ml/d at 11–16 months (50%); total energy intake rose from 610 to 735 kcal/d. Below 300 ml/d, milk had more protein and sodium and less lactose.
- **Population averages** [paho2003] (FT) [M] human, secondary to WHO/UNICEF 1998. Breast-milk energy 413, 379 and 346 kcal/d at 6–8, 9–11 and 12–23 months (developing countries); 486, 375 and 313 kcal/d (industrialised countries, breastfed children); about 550 g/d at 12–23 months, 35–40% of total energy needs. Derived: at 12–23 months, 0.84 (developing) and 0.64 (industrialised) of the 6–8-month level.
- **Production follows demand, women** [kent1999] (Abs; §11) [H] human. Extension: after 6 months breast volume, 24-h production and storage capacity all fell; at 15 months production was 208.0 ± 56.7 g per breast per day (6 breasts) against 453.6 g in months 1–6 (48 breasts); production and storage both appeared to respond to the infant's demand. Derived: 0.46 of the early production at 15 months.
- **Infants set the volume** [deweyLonnerdal1986] (Abs) [M] human. 18 mothers of exclusively breastfed infants expressed extra milk daily for 2 weeks; 14 raised production by more than 73 g/d (mean rise 124 g/d). Their infants drank more right afterwards (849 against 732 g/d), but about half returned to near baseline within 1–2 weeks. The authors conclude that differences in milk volume among well-nourished mothers reflect infant demand more than limits on production.
- **Local feedback in the gland** [wilde1995] (Abs) [M] goat, cross-species. How often and how completely milk is removed regulates secretion locally, through an inhibitor in the milk: a 7.6 kDa whey protein (FIL, feedback inhibitor of lactation) inhibited synthesis in tissue culture and briefly lowered secretion when put into the gland of lactating goats. Use: mechanism citation for synthesis inhibited by milk left in the gland (the rule already in the ledger) and for a capacity that tracks removal.
- **Mothers set the ceiling** [wildePrenticePeaker1995] (Abs) [M] review, human. The time course of lactation and the upper limit of production are set by the mother; secretion rate and duration vary with her nutrition; Gambian mothers under nutritional hardship produced as much milk as UK mothers. Use: mechanism citation for a maternal ceiling with demand-driven output below it.
- **Ape milk.**
  - [whittier2011] (Abs) [M] wild. Free-ranging mountain gorillas, healthy mid-lactation samples (1–50 months), n = 7 (10 samples in all): 10.7% dry matter, 1.9% fat, 1.4% crude protein, 6.8% sugar, 0.53 kcal/g; lower in fat and energy than human milk. Derived: 0.79 of the human 0.67 kcal/g (fao2004).
  - [garcia2017] (Abs) [M] captive. 53 samples from 4 gorillas (to 48 months) and 3 orangutans (to 22 months): crude protein 1.27% (gorilla) against 0.85% (orangutan); gorilla fat and gross energy highest at 36 months; orangutan gross energy steady over the first 18 months, tending to fall by 36 months (as the abstract states, although orangutan sampling is given as 22 months). Direction: ape milk does not become poorer on a schedule.
  - No chimpanzee milk composition was read (14.7).
- **Orangutan milk intake follows demand** [smith2017] (Abs) [M] wild orangutans, 4 individuals. Barium in teeth rose in the first year and fell soon after, then fluctuated about once a year until death at 8.8 y (a Sumatran individual) or until suckling stopped at 8.1 y (a Bornean female). The authors relate the cycles to infant demand under fluctuating food. Use: ape evidence that milk intake after the first year follows the infant's demand, not a fixed decline. This is the "Smith et al. 2017" of the request; the chimpanzee paper by the same first author is smith2013 (14.4).
- **Suckling time is a weak proxy** [cameron1998] (Abs, via search) [M] across mammals. A meta-analysis found a weak positive relation between time spent suckling and milk intake estimated from weight gain, with significant heterogeneity; the only study against isotope-measured intake found none. Use: field nipple-contact shares are not milk-transfer targets.
- **Mothers' diet, Gombe** [murray2009] (Abs) [M]. Controlling for rank, pregnant and lactating females ate higher-quality foods than females that were neither; pregnant females travelled less. Direction: mothers can raise the quality of their intake during lactation.
- **Conflict.** emeryThompson2012 (17 Kanyawara mothers): C-peptide depressed for 6 months after birth, then a net rise through the second year. badescu2022 and the thesis (Ngogo): lactation effort steady from 1 to 4 y, and maternal energy balance read as stable. Both are Kibale studies; one measures the mother's energy balance, the other infers milk transfer from behaviour and isotopes. Read together, the second-year recovery is a change in the mother's balance and is not evidence that milk output falls.

### 14.4 Weaning and nursing in wild chimpanzees

- **Weaned age, Gombe** [lonsdorf2020] (FT, accepted manuscript at par.nsf.gov) [H].
  - Kasekela community, 41 years of mother–offspring follows with 1-min point samples. 65 offspring of 29 mothers: 37 with a known weaned age (16 F, 21 M), 28 right-censored.
  - Weaning = cessation of suckling (mouth on the nipple). Weaned age = midpoint between the last observed nipple contact and the next session without it, using only gaps under 90 days.
  - Mean weaned age 4.71 y (SD 1.04, range 2.82–8.01).
  - Sex: males were less likely to be weaned by a given age (HR 0.343; β = −1.069, SE 0.513, P = .037); coefficient of variation 24.8 (males) against 18.0 (females); females were weaned 88.5 days earlier on average; of 13 offspring last seen suckling after 2,000 days of age, 10 were males.
  - Maternal rank × age: at birth, each 10% rise in rank multiplied the hazard of weaning by 2.68 (P = .012); the effect fell with offspring age (HR 0.9994 per day, P = .0052). The lowest-ranking mothers weaned latest. No effect of maternal age or parity (firstborn 5.1 ± 0.7 y against 4.6 ± 1.07 y for later-born, descriptive).
  - Four older siblings briefly resumed suckling after a younger sibling was born, more than 8 months after their own last suckling.
  - Table 1 (from other papers): weaning at 4.2–7.2 y (Gombe), 4–5 (Mahale), 4.1–6 (Kanyawara), 4–7 (Ngogo); marked rise in solid food at 1–2 y (Gombe), 0.83–1 y (Mahale), about 1 y (Ngogo); adult feeding share at 4–5 y (Gombe, Kanyawara) and 3–4 y (Mahale).
  - Secondary (citing badescu2017): the milk share of the diet starts to fall steadily at about 1–1.5 y and milk intake ends at 4–4.5 y; at Ngogo nipple contact goes on to about 7 y, usually without an isotopic milk signal.
  - Use: target (weaned age and its sex difference).
- **Nursing and isotopic weaning, Ngogo** [badescu2016] (FT, PMC5180145) [H].
  - 42 mother–infant pairs (62 infant-by-age-year categories, 0–7 y), 831 focal hours, 9,579 scans of mothers.
  - Mean nursing rate 1.1 bouts/h (SD 0.48, range 0.15–2.52); mean infant–mother faecal δ15N difference 0.50‰ (SD 0.54).
  - Infants handled more by others nursed less (P < 0.001) and had smaller δ15N differences (P < 0.05); interest by others without handling had no effect.
  - Background stated in the text (citing badescu2017): the largest faecal δ15N elevation, 2‰, at 1 y or younger, then a steady decline; weaning ends at 4–4.5 y. No weanling (4–6 y) had died at Ngogo so far.
  - Use: target (nursing rate, isotopic weaning age). With lonsdorf2020, the §12 secondary statement on badescu2017 (decline from about 1 y, complete at 4–4.5 y) is now seen in two full texts, both citing it; badescu2017 itself is still read as abstract only.
- **Dentine isotopes, Taï** [fahy2014] (Abs) [M]. Serial sections of 4 deciduous incisors and 12 first molars: δ15N about 2–3‰ above adult females until 2 y in both sexes, then a steady decrease, significantly slower in males. Secondary (lonsdorf2020): females weaned about 6 months earlier. Target.
- **First molar and suckling, Kanyawara** [smith2013] (Abs) [M]. Five infants emerged lower first molars by or before 3.3 y (captive mean about 3.2 y, n = 53). Molar emergence did not predict the start of solid food, the end of nursing or the interbirth interval. Infants spent more time on the nipple while the molar was erupting than in the year before, and kept suckling the year after. Target, direction (nipple time does not fall around 3 y).
- **Suckling and eating by age, Gombe** [lonsdorf2014] (FT, PMC4049619) [H].
  - 40 infants (25 M, 15 F), 1988–2011; 1-min point samples; at least 10 h per 60-day block in the first year and 15 h per 90-day block after.
  - Suckling: 2–3.71% of observation time, no significant change with age (0–5 y) or sex.
  - Eating solid food, % of observation time, 6-month blocks starting at 0 / 0.5 / 1 / 1.5 / 2 / 2.5 / 3 / 3.5 / 4 / 4.5 y: 0.23 / 5.33 / 6.67 / 21.95 / 21.64 / 29.74 / 32.45 / 36.14 / 34.43 / 49.09 (rises with age, F1,34 = 278.9, P < 0.0001; no sex effect).
  - Riding on the mother (belly + back): 11–13% of time to 2 y, 9.1% at 2.5 y, 5.6% at 3 y, 1.4% at 4.5 y. Independent travel: 0% at birth to 8.7% at 4.5 y, earlier in males.
  - Use: target (eating share by age; compare with the model's 3–9% of daylight, alongside badescu2022).
- **Weaning conflict.** No rates of nipple refusal by infant age were found.
  - [vandeRijtPlooij1987] (Abs) [M]. Free-ranging chimpanzees, single-subject design (six mother–infant pairs followed to 30 months, as summarised by lonsdorf2014). Conflict in months 5–6: aggressive maternal rebuffs aimed at breaking nipple and belly contact, coinciding with the start of riding on the back and of eating solid food. Further conflict at about months 12 and 18, aimed at breaking body contact.
  - [clark1977] via [maestripieri2002] (FT, author copy) [L]. Six Gombe pairs (n from lonsdorf2014). Maternal rejections started 2–3 years before suckling ceased and grew stronger when mothers resumed oestrus, at infant ages of about 3–4 y; travel was the most distressing context; in the last months infants regressed to whimpering, belly riding and long contact.
  - [badescuThesis2017] (FT) [L]. At Ngogo, rejections varied widely between pairs, were rarely seen with older offspring, and many came surprisingly early in infancy (unpublished data, no rates).
  - Use: direction only. Conflict clusters at dietary transitions (about 6 months; resumption of cycling at 3–4 y), not at a fixed weaning age.

### 14.5 Infant solid-food intake

- No chimpanzee intake rate in kcal or grams per minute by age was found; the gap in §12 stands.
- [bray2018] (§12): items per minute on five ripe fruits; infants below adults, juveniles not significantly.
- [corpByrne2002] (Abs) [M]. 14 mother–infant pairs eating *Saba florida* fruit (site not named in the abstract). Infants took pulp and fruit parts from their mothers and fed on fruit still attached to the plant. They processed whole fruits by 2 y but mastered the full adult technique only at 4 y. Direction: skill limits intake of a hard-to-process fruit until about 4 y.
- [schuppli2016] (FT, PMC5041519) [M] orangutans, cross-species.
  - Feeding rates (items per minute, as % of the mother's in the same tree, or of the nearest adult female) in 11 (Tuanan) and 10 (Suaq) immatures.
  - Adult rates on easy foods came just after weaning; on foods with more processing steps, later; always before first reproduction.
  - Fruit toughness did not affect feeding rates, so the authors rule out strength as the limit.
  - At weaning, immatures had about 75% of adult female arm length, which the authors estimate as about 50% of adult weight.
  - Use: mechanism citation that infant intake rate is limited by skill and food difficulty more than by body size. The E1c size exponent (0.75, design) finds no support here.

### 14.6 Reading for E1f (proposals; nothing implemented)

1. **Growth potential (input).** Use the sanctuary rates as the well-fed potential: 3.4 kg/y (F) and 3.8 kg/y (M) (curry2023), with the first year limited to the captive 2.8 kg (desilva2011), up to the adult mass.
   - Why sanctuary: these animals eat mostly natural vegetation and range in forest enclosures, so theirs is the closest measured well-fed rate. Zoo and research rates (4.7–5.4 kg/y) come with adults 58–88% heavier than wild ones. Scaling captive rates down to wild adult size would put the wild outcome into the input.
   - Derived: F 4.5 kg at 1 y, 18.1 kg at 5 y, 31.3 kg at 8.9 y; M 4.5, 19.7 and 39 kg at 10.1 y. Gombe (target): 10 kg at 5 y (0.51–0.55 of the potential), 21 kg (F) and 24 kg (M) at 10 y; growth knees at 10 y (F) and 13 y (M), i.e. 1.1 y and 2.9 y after the potential reaches adult mass, consistent with captive animals maturing 2–3 years earlier ([L]).
   - Against the current stylisation (linear 2.95 kg/y F and 2.86 kg/y M to 10 and 13 y): faster in males, and the sexes differ in rate rather than end age (leighShea1996, curry2023).
   - The adult mass (Gombe medians) stays an input cap. It is itself partly an outcome of food (pusey2005: heaviest under banana provisioning), so the cap is a stylisation to label.
2. **Lactation course (mechanism).** Make synthesis follow removal under a maternal ceiling.
   - The gland's daily capacity tracks what the infant has removed over the recent past (kent1999, daly1993, deweyLonnerdal1986; local feedback, wilde1995) and never exceeds the mother's ceiling (wildePrenticePeaker1995; the existing M^0.75 yield). No scheduled decline.
   - Output then falls only if the infant eats more solid food, as in humans (0.68 of early volume after 6 months, fao2004; 0.46 per breast at 15 months, kent1999), and stays near the ceiling if it does not, as inferred at Ngogo (badescu2022, badescu2023).
3. **T-ENE-5 needs a different reading.** No chimpanzee source shows milk output falling in the second year; the only one on its course says it holds from 1 to 4 y. The C-peptide recovery (emeryThompson2012) is a recovery of the mother's energy balance, which can come from her intake (murray2009: lactating mothers eat higher-quality foods) while milk output holds. A milk cost that falls in year 2 would reproduce a human pattern, not a measured chimpanzee one. Confidence: low to moderate (the plateau rests on nipple time and isotopes; cameron1998).
4. **Targets for weaning and feeding.**
   - Weaned age 4.71 ± 1.04 y (Gombe, range 2.82–8.01), 4.8 ± 0.7 y (Kanyawara, bray2018), isotopic end 4–4.5 y (Ngogo). Females earlier: by 88.5 days at Gombe, about 6 months at Taï (secondary).
   - The model's weaning age of about 7.2 y lies inside the Gombe range but 2.4 SD above its mean.
   - Eating share by age: lonsdorf2014 (Gombe) and badescu2022 (Ngogo). Suckling time 2–3.7% (Gombe) and about 3% (Ngogo) with no age trend; a model of nutritive suckling only should meet or undershoot it.
5. **Milk energy density (sensitivity).** Ape milk is less energy-dense than human milk (wild gorilla 0.53 against 0.67 kcal/g). The yield coefficient (23.2 kcal/d per kg^0.75) is human-derived and *assumed*. If ape milk volume per kg^0.75 equalled the human value, the energy yield would be 0.79 of it (about 18.4). No ape milk volume exists, so this is a sensitivity bound, not a correction.

### 14.7 Not found or unverified

- Rates of maternal nipple refusal by infant age in any wild chimpanzee population. Clark 1977 (book chapter, no DOI) was read only as summarised by maestripieri2002; Hiraiwa-Hasegawa 1990 (Mahale nursing by age, book chapter) was not read.
- Any chimpanzee or other great-ape milk volume or milk energy output, at any stage. Oftedal 1984 is still not read.
- Chimpanzee milk composition. A search summary attributes a lactose content of 7.4 g/100 ml to Hinde & Milligan 2011 (*Evolutionary Anthropology* 20(1):9–23, [doi:10.1002/evan.20289](https://doi.org/10.1002/evan.20289)); the review was not read. Urashima et al. 2009 (*Glycobiology*) reports only oligosaccharides.
- Chimpanzee infant or juvenile intake rate in kcal or grams per minute by age.
- Captive mass-for-age tables: Grether & Yerkes 1940, Gavan 1953, smithButlerPace1975 (abstract without numbers), hamada1996 and the full text of leighShea1996. hamada1996's maturation ages and adult means are from a search summary only.
- A wild growth curve from a primary source: pusey2005's curves (full text not read). A search summary gives 98% of maximum body length at 11.7 y (F) and 13.1 y (M) from laser photogrammetry of wild chimpanzees; the study was not identified.
- emeryThompson2012 full text (C-peptide by month, return of cycling): only the abstract was served.
- smith2013 full text (nipple time by age at Kanyawara): abstract only.
- Pontzer & Wrangham 2006 (ontogeny of ranging, Kanyawara; [doi:10.1007/s10764-005-9011-2](https://doi.org/10.1007/s10764-005-9011-2)): a search summary says a carried infant did not change adult females' day range. The abstract was not reached, so this is not registered.

### 14.8 Sources

- *new* leighShea1996: Leigh SR, Shea BT 1996. Ontogeny of body size variation in African apes. *American Journal of Physical Anthropology* 99(1):43–65. [doi:10.1002/(SICI)1096-8644(199601)99:1<43::AID-AJPA3>3.0.CO;2-0](https://doi.org/10.1002/(SICI)1096-8644(199601)99:1%3C43::AID-AJPA3%3E3.0.CO;2-0) (Abs).
- *new* hamadaUdono2002: Hamada Y, Udono T 2002. Longitudinal analysis of length growth in the chimpanzee (*Pan troglodytes*). *American Journal of Physical Anthropology* 118(3):268–284. [doi:10.1002/ajpa.10078](https://doi.org/10.1002/ajpa.10078) (Abs).
- *new* kimuraHamada1996: Kimura T, Hamada Y 1996. Growth of wild and laboratory born chimpanzees. *Primates* 37(3):237–251. [doi:10.1007/BF02381856](https://doi.org/10.1007/BF02381856) (abstract via search summary).
- *new* marzke1996: Marzke MW, Young DL, Hawkey DE, Su SM, Fritz J, Alford PL 1996. Comparative analysis of weight gain, hand/wrist maturation, and dental emergence rates in chimpanzees aged 0–24 months from varying captive environments. *American Journal of Physical Anthropology* 99(1):175–190. [doi:10.1002/(SICI)1096-8644(199601)99:1<175::AID-AJPA10>3.0.CO;2-K](https://doi.org/10.1002/(SICI)1096-8644(199601)99:1%3C175::AID-AJPA10%3E3.0.CO;2-K) (Abs).
- *new* smithButlerPace1975: Smith AH, Butler TM, Pace N 1975. Weight growth of colony-reared chimpanzees. *Folia Primatologica* 24(1):29–59. [doi:10.1159/000155684](https://doi.org/10.1159/000155684) (Abs; no numbers in the abstract).
- *new* west2001: West GB, Brown JH, Enquist BJ 2001. A general model for ontogenetic growth. *Nature* 413(6856):628–631. [doi:10.1038/35098076](https://doi.org/10.1038/35098076) (Abs, via search).
- *new* lonsdorf2020: Lonsdorf EV, Stanton MA, Pusey AE, Murray CM 2020 (online 2019). Sources of variation in weaned age among wild chimpanzees in Gombe National Park, Tanzania. *American Journal of Physical Anthropology* 171(3):419–429. [doi:10.1002/ajpa.23986](https://doi.org/10.1002/ajpa.23986) (FT, accepted manuscript at par.nsf.gov).
- *new* lonsdorf2014: Lonsdorf EV, Markham AC, Heintz MR, Anderson KE, Ciuk DJ, Goodall J, Murray CM 2014. Sex differences in wild chimpanzee behavior emerge during infancy. *PLoS ONE* 9(6):e99099. [doi:10.1371/journal.pone.0099099](https://doi.org/10.1371/journal.pone.0099099) (FT, PMC4049619).
- *new* badescu2016: Bădescu I, Watts DP, Katzenberg MA, Sellen DW 2016. Alloparenting is associated with reduced maternal lactation effort and faster weaning in wild chimpanzees. *Royal Society Open Science* 3(11):160577. [doi:10.1098/rsos.160577](https://doi.org/10.1098/rsos.160577) (FT, PMC5180145).
- *new* badescu2023: Bădescu I, Curteanu C, Sellen DW, Watts DP, Katzenberg MA 2025 (online 2023). Investigating infant feeding development in wild chimpanzees using stable isotopes of naturally shed hair. *American Journal of Primatology* 87(1):e23552. [doi:10.1002/ajp.23552](https://doi.org/10.1002/ajp.23552) (FT, PMC11650929).
- *new* badescuThesis2017: Bădescu I 2017. Infant care, nutritional development and lactation in chimpanzees at Ngogo, Kibale National Park, Uganda. PhD thesis, University of Toronto. [TSpace](https://utoronto.scholaris.ca/server/api/core/bitstreams/ff1f2d14-e55f-4860-8f2c-5aa94f076bd8/content) (FT; no DOI).
- *new* fahy2014: Fahy GE, Richards MP, Fuller BT, Deschner T, Hublin JJ, Boesch C 2014. Stable nitrogen isotope analysis of dentine serial sections elucidate sex differences in weaning patterns of wild chimpanzees (*Pan troglodytes*). *American Journal of Physical Anthropology* 153(4):635–642. [doi:10.1002/ajpa.22464](https://doi.org/10.1002/ajpa.22464) (Abs).
- *new* smith2013: Smith TM, Machanda Z, Bernard AB, Donovan RM, Papakyrikos AM, Muller MN, Wrangham R 2013. First molar eruption, weaning, and life history in living wild chimpanzees. *PNAS* 110(8):2787–2791. [doi:10.1073/pnas.1218746110](https://doi.org/10.1073/pnas.1218746110) (Abs).
- *new* vandeRijtPlooij1987: van de Rijt-Plooij HHC, Plooij FX 1987. Growing independence, conflict and learning in mother–infant relations in free-ranging chimpanzees. *Behaviour* 101(1–3):1–86. [doi:10.1163/156853987X00378](https://doi.org/10.1163/156853987X00378) (Abs).
- *new* maestripieri2002: Maestripieri D 2002. Parent–offspring conflict in primates. *International Journal of Primatology* 23(4):923–951. [doi:10.1023/A:1015537201184](https://doi.org/10.1023/A:1015537201184) (FT, author copy; used for its summary of clark1977).
- *new* clark1977: Clark CB 1977. A preliminary report on weaning among chimpanzees of the Gombe National Park, Tanzania. In Chevalier-Skolnikoff S, Poirier FE (eds), *Primate Bio-Social Development*, Garland, New York, pp. 235–260 (not read; as cited by maestripieri2002; no DOI).
- *new* fao2004: FAO/WHO/UNU 2004. *Human energy requirements: report of a joint FAO/WHO/UNU expert consultation, Rome, 17–24 October 2001*. FAO Food and Nutrition Technical Report Series 1. Rome: FAO. [Section 7, Energy requirements of lactation](https://www.fao.org/4/y5686e/y5686e0b.htm) (FT extract; no DOI).
- *new* dewey1984: Dewey KG, Finley DA, Lönnerdal B 1984. Breast milk volume and composition during late lactation (7–20 months). *Journal of Pediatric Gastroenterology and Nutrition* 3(5):713–720. [doi:10.1097/00005176-198411000-00014](https://doi.org/10.1097/00005176-198411000-00014) (Abs).
- *new* paho2003: PAHO/WHO 2003. *Guiding principles for complementary feeding of the breastfed child*. Washington, DC: Pan American Health Organization. [PDF](https://www.paho.org/sites/default/files/GuidingPrinciples.pdf) (FT; its intake figures are from WHO/UNICEF 1998, *Complementary feeding of young children in developing countries*, not read; no DOI).
- *new* deweyLonnerdal1986: Dewey KG, Lönnerdal B 1986. Infant self-regulation of breast milk intake. *Acta Paediatrica Scandinavica* 75(6):893–898. [doi:10.1111/j.1651-2227.1986.tb10313.x](https://doi.org/10.1111/j.1651-2227.1986.tb10313.x) (Abs).
- *new* wilde1995: Wilde CJ, Addey CVP, Boddy LM, Peaker M 1995. Autocrine regulation of milk secretion by a protein in milk. *Biochemical Journal* 305(1):51–58. [doi:10.1042/bj3050051](https://doi.org/10.1042/bj3050051) (Abs).
- *new* wildePrenticePeaker1995: Wilde CJ, Prentice A, Peaker M 1995. Breast-feeding: matching supply with demand in human lactation. *Proceedings of the Nutrition Society* 54(2):401–406. [doi:10.1079/PNS19950009](https://doi.org/10.1079/PNS19950009) (Abs).
- *new* whittier2011: Whittier CA, Milligan LA, Nutter FB, Cranfield MR, Power ML 2011 (online 2010). Proximate composition of milk from free-ranging mountain gorillas (*Gorilla beringei beringei*). *Zoo Biology* 30(3):308–317. [doi:10.1002/zoo.20363](https://doi.org/10.1002/zoo.20363) (Abs).
- *new* garcia2017: Garcia M, Power ML, Moyes KM 2017 (online 2016). Immunoglobulin A and nutrients in milk from great apes throughout lactation. *American Journal of Primatology* 79(3):e22614. [doi:10.1002/ajp.22614](https://doi.org/10.1002/ajp.22614) (Abs).
- *new* smith2017: Smith TM, Austin C, Hinde K, Vogel ER, Arora M 2017. Cyclical nursing patterns in wild orangutans. *Science Advances* 3(5):e1601517. [doi:10.1126/sciadv.1601517](https://doi.org/10.1126/sciadv.1601517) (Abs).
- *new* cameron1998: Cameron EZ 1998. Is suckling behaviour a useful predictor of milk intake? A review. *Animal Behaviour* 56(3):521–532. [doi:10.1006/anbe.1998.0793](https://doi.org/10.1006/anbe.1998.0793) (Abs, via search).
- *new* murray2009: Murray CM, Lonsdorf EV, Eberly LE, Pusey AE 2009. Reproductive energetics in free-living female chimpanzees (*Pan troglodytes schweinfurthii*). *Behavioral Ecology* 20(6):1211–1216. [doi:10.1093/beheco/arp114](https://doi.org/10.1093/beheco/arp114) (Abs).
- *new* corpByrne2002: Corp N, Byrne RW 2002. The ontogeny of manual skill in wild chimpanzees: evidence from feeding on the fruit of *Saba florida*. *Behaviour* 139(1):137–168. [doi:10.1163/15685390252902328](https://doi.org/10.1163/15685390252902328) (Abs).
- *new* schuppli2016: Schuppli C, Forss S, Meulman EJM, Zweifel N, Lee KC, Rukmana E, Vogel ER, van Noordwijk MA, van Schaik CP 2016. Development of foraging skills in two orangutan populations: needing to learn or needing to grow? *Frontiers in Zoology* 13:43. [doi:10.1186/s12983-016-0178-5](https://doi.org/10.1186/s12983-016-0178-5) (FT, PMC5041519).
- curry2023, desilva2011, hamada1996, gurvenWalker2006, pusey2005, badescu2017, badescu2022, bray2018, kent1999, daly1993, emeryThompson2012 and emeryThompson2016 are already listed; the entries above add findings.

## 15. Addendum: fast arousal (stage E4b, 1 October 2026)

Evidence pass for stage E4b (a fast arousal state for acute reactions; `docs/staging/e4b-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "captive" as marked).

- **Two time scales of the stress response** [sapolsky2000] (Abs) theory. Glucocorticoids permit, stimulate or suppress an ongoing stress response, or prepare for the next one; the review sorts their actions by endpoint. Use in E4b: the slow states act on a faster response rather than being it (mechanism citation only; no number).
- **Catecholamine clearance** (secondary only, not verified): plasma half-lives of about 1 min (epinephrine, healthy volunteers) and 2–2.5 min (norepinephrine) appear in pharmacology references and in a search summary of a septic-shock study (Abboud et al. 2009, *Critical Care* 13:R120, doi:10.1186/cc7972, whose own text gives 3.5 min in patients and cites, not reports, the healthy value). Use in E4b: a lower bound on the fast state's time constant, *assumed*.
- **Post-conflict anxiety lasts the 10-min window, captive chimpanzees** [fraser2008] (FT, PMC2438392) [M, captive].
  - Chester Zoo; group of 26–32 (17 adult females, 5 adult males); 234 post-conflict and matched-control pairs on 22 recipients of aggression, 129 aggressor–recipient dyads.
  - Self-grooming and self-scratching of recipients stayed above matched controls "for the entire 10 min" of post-conflict observation; consolation lowered them; most post-conflict affiliation came in the first minute.
  - Use in E4b: an upper bound on the fast state's time constant (it must still be up at 10 min); the defeat kick's direction.
- **Heart rate at a dominant's approach, rhesus macaques** [aureli1999] (Abs) [L, cross-species]. Telemetry on 2 middle-ranking adult females in a large free-moving group: heart rate rose after the approach of a dominant, not of kin or a subordinate; it fell faster while receiving grooming than in matched controls. Use in E4b: direction of the threat kick.
- **Heart rate as arousal, review** [wascher2021] (FT extract) [M as a review]. Heart-rate rises in birds after agonistic encounters last seconds (greylag geese: mean 8 s, range 1–261 s); the review gives no primate time course. Use in E4b: context for "seconds to minutes"; no number used.
- **Sound-induced swaying, captive chimpanzees** [hattoriTomonaga2020] (FT, PMC6969502) [M, captive]. 7 chimpanzees (3 males): an auditory beat induced rhythmic swaying, more in males (sex effect P = 0.029). The authors summarise the wild "rain dance": at the start of heavy rain adult males perform rhythmic displays (wild reports seen only as summarised there). No wild rate of rain displays was found. Use in E4b: direction of the storm kick and the male bias of the display.
- **Testosterone and pant-hoots: the statistic** [fedurek2016] (FT, author copy at White Rose eprints 98463; research.md had the abstract) [M].
  - Kanyawara; 11 focal males (ranks 1–11); 185 focal days, 168 of at least 6 h (mean 550 min); 141 urine samples before 09:00 for the monthly analysis.
  - "A focal's hourly T levels were calculated by averaging values from each one-hour interval between 07:00 and 18:00, across the entire study period"; hourly pant-hoot rates likewise. The hourly association (β ± SE = 0.47 ± 0.09) is therefore across the hours of the day within males (testosterone falls through the day, mullerLipson2003), stronger in high-ranking males (interaction −0.15 ± 0.08); high-ranking males called more (−0.29 ± 0.14).
  - The monthly association is weaker; fission–fusion with males, travel time and food type also predicted monthly rates.
  - Use in E4b: T-END-8 is scored in this form (a daily profile); the row's wording ("a male's hourly reading and his pant-hoots per hour") should say so.
- **Oxytocin and intergroup conflict: the controls** [samuni2017] (FT, PMC5240673; extends the entry in the patrols section) [M].
  - Event model: 468 samples, 20 individuals, 296 events; urine collected 15–60 min after the start and up to 60 min after the end of an interaction.
  - Anticipation: before border patrols 6 subjects, 14 samples, 10 events, against 9 individuals, 38 samples, 34 control events.
  - Controls: 90-min periods without positive social interaction (vocalisations aside); at least 10 min of multipartner grooming; group hunting of monkeys. Patrols and encounters did not differ. Hunting was above both affiliative controls but below intergroup conflict.
  - "neither the presence of affiliation during intergroup conflict nor multipartner affiliation without intergroup conflict led to urinary oxytocin levels that differed from nonaffiliative intergroup conflict."
  - Cohesion: during intergroup conflict individuals were less likely to leave their party than in matched control periods (23 against 23 periods).
  - Use in E4b: rules out affiliation during conflict as the route to T-END-12.
- **Oxytocin after aggression alone** [preis2018] (Abs; already listed): not above periods without interaction. Use in E4b: rules out a generic acute-arousal route to oxytocin.
- **Stranger pant-hoots draw captive chimpanzees together** [brooks2021] (FT) [M, captive]. Kumamoto Sanctuary, 29 adults (17 males) in 5 groups; playbacks of unfamiliar males' pant-hoots against crow calls. Dyads stood closer (β = −0.65, P = 0.001); grooming rose in early trials; self-directed behaviour rose (P = 0.028); aggression fell in the later food phase (P = 0.0063). Use in E4b: the behaviour (contact-seeking under out-group threat) exists; candidate held-out row for a later piece.
- **Intergroup competition and cohesion, Taï** [samuni2020b] (FT, open access) [M]. 2 groups, 2013–2015, 38 adults, 1,272 focal days; 40 patrols and 66 encounters. Months with more patrols and encounters had less modular association; current and prior intergroup activity predicted larger parties; current activity predicted less male intragroup aggression. No grooming measure. Use in E4b: context; a candidate held-out row.

- **Redirected aggression among post-conflict interactions, Taï** [wittig2003] (FT, author PDF at eva.mpg.de) [M]. 876 dyadic aggressive interactions among 18 wild chimpanzees of both sexes; the first interaction of the focal conflict partner afterwards (no time limit; "no PCI" if none for the rest of the day): reconciliation 188, offered consolation 164, solicited consolation 176, renewed aggression 174, redirected aggression 88 (10% of conflicts), third-party aggression 28, none 58. Redirection was marginally more frequent after initiators won. Use in E4b: context for the redirect rate (losers only and within minutes in the model, so not the same statistic); candidate held-out row.
**Sources:**
- *new* sapolsky2000: Sapolsky RM, Romero LM, Munck AU 2000. How do glucocorticoids influence stress responses? Integrating permissive, suppressive, stimulatory, and preparative actions. *Endocrine Reviews* 21(1):55–89. [doi:10.1210/edrv.21.1.0389](https://doi.org/10.1210/edrv.21.1.0389) (Abs).
- *new* fraser2008: Fraser ON, Stahl D, Aureli F 2008. Stress reduction through consolation in chimpanzees. *PNAS* 105(25):8557–8562. [doi:10.1073/pnas.0804141105](https://doi.org/10.1073/pnas.0804141105) (FT, PMC2438392).
- *new* aureli1999: Aureli F, Preston SD, de Waal FBM 1999. Heart rate responses to social interactions in free-moving rhesus macaques (*Macaca mulatta*): a pilot study. *Journal of Comparative Psychology* 113(1):59–65. [doi:10.1037/0735-7036.113.1.59](https://doi.org/10.1037/0735-7036.113.1.59) (Abs).
- *new* wascher2021: Wascher CAF 2021. Heart rate as a measure of emotional arousal in evolutionary biology. *Philosophical Transactions of the Royal Society B* 376(1831):20200479. [doi:10.1098/rstb.2020.0479](https://doi.org/10.1098/rstb.2020.0479) (FT extract, PMC8237168).
- *new* hattoriTomonaga2020: Hattori Y, Tomonaga M 2020. Rhythmic swaying induced by sound in chimpanzees (*Pan troglodytes*). *PNAS* 117(2):936–942. [doi:10.1073/pnas.1910318116](https://doi.org/10.1073/pnas.1910318116) (FT extract, PMC6969502).
- *new* brooks2021: Brooks J, Onishi E, Clark IR, Bohn M, Yamamoto S 2021. Uniting against a common enemy: perceived outgroup threat elicits ingroup cohesion in chimpanzees. *PLOS ONE* 16(2):e0246869. [doi:10.1371/journal.pone.0246869](https://doi.org/10.1371/journal.pone.0246869) (FT extract).
- *new* samuni2020b: Samuni L, Mielke A, Preis A, Crockford C, Wittig RM 2020. Intergroup competition enhances chimpanzee (*Pan troglodytes verus*) in-group cohesion. *International Journal of Primatology* 41(2):342–362. [doi:10.1007/s10764-019-00112-y](https://doi.org/10.1007/s10764-019-00112-y) (FT). Not the same paper as samuni2020 (maternal effects).
- *new* wittig2003: Wittig RM, Boesch C 2003. The choice of post-conflict interactions in wild chimpanzees (*Pan troglodytes*). *Behaviour* 140(11–12):1527–1559. [doi:10.1163/156853903771980701](https://doi.org/10.1163/156853903771980701) (FT, author PDF).
- fedurek2016, samuni2017, preis2018, mullerLipson2003 and sobolewski2013 are already listed; the entries above add findings.

**Not verified:** the healthy-volunteer catecholamine half-lives (secondary only); wild rain-display descriptions and any rate (seen only as summarised by hattoriTomonaga2020); Herbinger et al. 2009 (stranger playbacks at Taï, *Animal Behaviour* 78:1389–1396; not read).

## 16. Addendum: digestion (stage E1b, 1 October 2026)

Requested by the E1b implementer (docs/staging/e1b-prereg.md), 1 October 2026. Questions: apparent digestibility of dry matter, fibre and energy in chimpanzees or great apes; any wild great-ape total energy expenditure; gut capacity; evidence of a digestive pause. Same tags as above. Bibliographic data checked against Crossref on 1 October 2026 except knott2005 (book chapter).

- **Fibre digestion and the formula's fibre credit** [masi2015] (FT extract, PLoS ONE page read through a fetch tool) [M] for its own use.
  - Wild western gorillas: metabolisable energy computed "following Conklin-Brittain et al." with a fourth factor for fibre: "3 kcal/g × 0.449 = 1.347 kcal/g", the 0.449 being the mean NDF digestion coefficient of captive western gorillas fed a highly fibrous diet [remisDierenfeld2004].
  - Mean daily intake estimated by this method: 5,038 ± 267 kcal/d for the silverback, 9,683 ± 225 kcal/d for lactating adult females, 8,914 ± 589 kcal/d for immatures. No comparison with expenditure.
  - Use in Track E: input structure for fibre energy (yield per gram fermented × digestibility); derived from it, the chimpanzee credit of 1.6 kcal/g implies a coefficient of about 0.53. The intake values are direction-only evidence that formula intake overstates absorbed energy (no ape spends 5 × its basal rate).
- **Gorilla digestion trial** [remisDierenfeld2004] (bibliography only; the 0.449 NDF coefficient is seen only as cited by masi2015). Assumed, cross-species.
- **Fibre digestion by orangutans** [schmidt2005] (Abs) [M] captive, cross-species. Two adult and one juvenile orangutans on gel diets: NDF digestibility 74.5% with soybean hulls (52.9% NDF), 57.5% with corncobs at 63.7% NDF, 45.0% on primate biscuits (31.3% NDF); faecal cultures digested 86–88% of NDF in vitro. Range for great-ape fibre digestibility.
- **Fibre fermentation by captive chimpanzees** [kisidayova2009] (Abs) [L], n = 2. Faecal flora from chimpanzees on 14% and 26% NDF diets; "not capable of extensive fiber fermentation", though SCFA production rose with dietary fibre. Direction only.
- **Passage and gut proportions** [milton1999] (FT, PDF) [M].
  - Mean transit time of chimpanzees on a low-fibre (14% NDF) commercial diet: 2.0 d (this confirms the 48 h of miltonDemment1988; the 38 h on 34% NDF is still a snippet). Humans on a refined diet: 2.6 d.
  - Chimpanzees and humans respond alike to fibre (faster turnover with more fibre) and degrade the cellulose and hemicellulose of wheat bran similarly.
  - Humans hold more than 56% of gut volume in the small intestine; all apes hold more than 45% in the colon. The stomach and small-intestine shares of chimpanzees (17–20% and 23–28%, Milton 1987) were seen only on a secondary web page: not verified.
  - Use in Track E: mean retention time and the foregut/hindgut split, assumed.
- **Gut capacity of a chimpanzee** [nakamura2017] (Abs) [M] for the observation, n = 1.
  - A fresh corpse of a mature wild female at Mahale held 258.8 g (dry) and 489.4 cm³ of seeds, which the authors give as 14.7% of the previously reported digestive-tract capacity of a captive chimpanzee. Derived: that capacity is about 3,330 cm³ (the original measurement, probably Chivers & Hladik 1980, and the animal's mass were not read).
  - Use in Track E: gut volume, assumed (scaled by an assumed reference mass of 40 kg); and a lower bound on the dry matter a wild gut carries (seeds alone).
- **Seeds pass intact** [lambert1999] (Abs) [M] and [wrangham1994] (Abs) [M]. Kibale chimpanzees are "coarse fruit processors and seed swallowers" (a mean of 149 large seeds and hundreds of small seeds per dung sample); 98.5% of 1,849 dung samples from two Kibale communities held seeds, which germinated faster after gut passage. Lambert names the "cost of seed ballast". Use in Track E: seeds are bulk without energy; whether uwimbabazi2019's analysed samples include swallowed seeds was not reached, so no seed term is modelled.
- **Fibrous foods at Kibale** [wrangham1991] (Abs) [M], already cited (C7c). Piths are consistently high in hemicellulose and cellulose, "insoluble fibres partly digestible by chimpanzees"; pith intake rose when fruit was scarce. Direction only.
- **Diet-induced thermogenesis** [westerterp2004] (Abs) [H] human, cross-species: a mixed diet at energy balance costs 5–15% of daily energy expenditure, more with protein and carbohydrate, less with fat. [westerterp1999] (Abs) [H] human: 14.6% of intake on a high protein and carbohydrate diet against 10.5% on a high-fat diet, 8 women, 24 h in a respiration chamber. Use in Track E: input (0.10 of energy absorbed), assumed; it closes the captive-day check against pontzer2016 (docs/staging/e1b-prereg.md §3.1).
- **Enforced rest and leaves** [lehmann2008] (FT, PDF) [L] cross-species. The ape time-budget model takes resting time from a comparative equation over 78 primate species (Korstjens et al., then submitted): % resting = −29.47 + 1.28 × mean annual temperature + 0.34 × % leaves in the diet + 5.95 × monthly temperature variation, read as "enforced resting time" from digestion and heat. Direction only (rest rises with leaf share); no chimpanzee digestive-pause measurement.
- **Energetic responses of apes** [knott2005] (FT, PDF) [M]. Mast-season orangutan intake exceeded energy requirements "by several thousand calories"; Kanyawara and Mahale researchers never detected systematic ketone production in chimpanzees; "limitations on gut and digestive capacity" are named as a cost of feeding longer. Direction only.

- **Swallowed seeds and the field intake estimate (stage E1e check, 1 October 2026)** [uwimbabazi2019]. The full text could not be opened (the PMC page asks for a CAPTCHA, not bypassed; Europe PMC serves no full-text file for it). Europe PMC's full-text index answers phrase searches on the article, in which short function words act as one-word wildcards; control phrases ("seeds were purple", "seeds were swallowed") return nothing. Found in the text: "[for] fruit, seeds [were] removed [from the] collected sample before weighing", "food samples [were] processed", "[parts] that [are] discarded by chimpanzees". The word "swallow" does not occur. Reading ([M] as read; exact short words and the scope of the removal unverified): fruit dry mass and composition are pulp without seeds, so swallowed seeds do not inflate the 2,479 kcal/d intake estimate (T-ENE-1) and cannot explain its gap to sourced expenditure.

**Searched and not found (1 October 2026).**
- Apparent digestibility of dry matter, energy or fibre in chimpanzees with numbers: the full text of miltonDemment1988 was not reachable (publisher and repository pages refused); only the abstract (fibre digestibility falls as dietary fibre rises; transit time explains most of its variation) and a snippet (cellulose digestibility 43% lower and hemicellulose 18% lower on the high-fibre diet) were seen. The derivation of the 1.6 kcal/g credit (Conklin-Brittain et al. 2006, a book chapter) was not reached.
- Total energy expenditure of any wild great ape (doubly labelled water, accelerometry, heart rate): none found. pontzer2014's statement that captive and wild primates spend alike remains the only bridge.
- Dry-matter concentration of ape digesta, and a stomach (meal) capacity: none found.
- A chimpanzee digestive pause or an hourly activity profile with numbers: none found (a general statement that chimpanzees rest after the morning feed to digest was seen only on safari web pages and is not used).

- **Sources:**
  - *new* masi2015: Masi S, Mundry R, Ortmann S, Cipolletta C, Boitani L, Robbins MM 2015. The influence of seasonal frugivory on nutrient and energy intake in wild western gorillas. *PLoS ONE* 10(7):e0129254. [doi:10.1371/journal.pone.0129254](https://doi.org/10.1371/journal.pone.0129254) (FT extract).
  - *new* remisDierenfeld2004: Remis MJ, Dierenfeld ES 2004. Digesta passage, digestibility and behavior in captive gorillas under two dietary regimens. *International Journal of Primatology* 25(4):825–845. [doi:10.1023/B:IJOP.0000029124.04610.c7](https://doi.org/10.1023/B:IJOP.0000029124.04610.c7) (bibliography only; value as cited by masi2015).
  - *new* schmidt2005: Schmidt DA, Kerley MS, Dempsey JL, Porton IJ, Porter JH, Griffin ME, Ellersieck MR, Sadler WC 2005. Fiber digestibility by the orangutan (*Pongo abelii*): in vitro and in vivo. *Journal of Zoo and Wildlife Medicine* 36(4):571–580. [doi:10.1638/04-103.1](https://doi.org/10.1638/04-103.1) (Abs).
  - *new* kisidayova2009: Kišidayová S, Váradyová Z, Pristaš P et al. 2009. Effects of high- and low-fiber diets on fecal fermentation and fecal microbial populations of captive chimpanzees. *American Journal of Primatology* 71(7):548–557. [doi:10.1002/ajp.20687](https://doi.org/10.1002/ajp.20687) (Abs).
  - *new* milton1999: Milton K 1999. Nutritional characteristics of wild primate foods: do the diets of our closest living relatives have lessons for us? *Nutrition* 15(6):488–498. [doi:10.1016/S0899-9007(99)00078-7](https://doi.org/10.1016/S0899-9007(99)00078-7) (FT, PDF).
  - *new* nakamura2017: Nakamura M, Sakamaki T, Zamma K 2017. What volume of seeds can a chimpanzee carry in its body? *Primates* 58(1):13–17. [doi:10.1007/s10329-016-0568-5](https://doi.org/10.1007/s10329-016-0568-5) (Abs).
  - *new* lambert1999: Lambert JE 1999. Seed handling in chimpanzees (*Pan troglodytes*) and redtail monkeys (*Cercopithecus ascanius*): implications for understanding hominoid and cercopithecine fruit-processing strategies and seed dispersal. *American Journal of Physical Anthropology* 109(3):365–386. [doi:10.1002/(SICI)1096-8644(199907)109:3<365::AID-AJPA6>3.0.CO;2-Q](https://doi.org/10.1002/(SICI)1096-8644(199907)109:3%3C365::AID-AJPA6%3E3.0.CO;2-Q) (Abs).
  - *new* wrangham1994: Wrangham RW, Chapman CA, Chapman LJ 1994. Seed dispersal by forest chimpanzees in Uganda. *Journal of Tropical Ecology* 10(3):355–368. [doi:10.1017/S0266467400008026](https://doi.org/10.1017/S0266467400008026) (Abs).
  - *new* westerterp2004: Westerterp KR 2004. Diet induced thermogenesis. *Nutrition & Metabolism* 1(1):5. [doi:10.1186/1743-7075-1-5](https://doi.org/10.1186/1743-7075-1-5) (Abs).
  - *new* westerterp1999: Westerterp K, Wilson S, Rolland V 1999. Diet induced thermogenesis measured over 24h in a respiration chamber: effect of diet composition. *International Journal of Obesity* 23(3):287–292. [doi:10.1038/sj.ijo.0800810](https://doi.org/10.1038/sj.ijo.0800810) (Abs).
  - *new* lehmann2008: Lehmann J, Korstjens AH, Dunbar RIM 2008. Time and distribution: a model of ape biogeography. *Ethology Ecology & Evolution* 20(4):337–359. [doi:10.1080/08927014.2008.9522516](https://doi.org/10.1080/08927014.2008.9522516) (FT, PDF at Bournemouth University Research Online). The comparative resting equation is from Korstjens, Lehmann & Dunbar 2010, *Animal Behaviour* 79(2):361–374 ([doi:10.1016/j.anbehav.2009.11.012](https://doi.org/10.1016/j.anbehav.2009.11.012); not read).
  - *new* knott2005: Knott CD 2005. Energetic responses to food availability in the great apes: implications for hominin evolution. In: Brockman DK, van Schaik CP (eds) *Seasonality in Primates*, pp 351–378. Cambridge University Press (FT, author PDF; bibliographic data from the PDF, no DOI checked).
  - wrangham1991, uwimbabazi2019, pontzer2016, miltonDemment1988, ardente2011 and lambert2002 are already cited above.

## 17. Addendum: nest departure and the active day (stage E2b, 1 October 2026)

Evidence pass for stage E2b (nest departure and the active day; `docs/staging/e2b-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "derived" as marked).

- **Breakfast time, type and place, Taï** [janmaat2014] (FT: the PMC author manuscript PMC4246305, read from the Internet Archive copy of 28 February 2024; the live PMC page asked for a CAPTCHA, which was not bypassed; the publisher page refused the request) [M]. Replaces the earlier "FT extract" reading.
  - 5 habituated adult females, all with offspring under 7 y; followed 16 April 2009 – 30 August 2011 in periods of 4–8 weeks during three fruit-scarce periods; 275 full days. The departure model uses 179 mornings: days after a complete observation day, fruit breakfasts only (74% of mornings).
  - Departure time in seconds from astronomical sunrise (NOAA calculator), linear mixed model (Table 1, estimate ± SE): intercept 779.1 ± 293.7; non-fig breakfast +844.6 ± 328.8; breakfast fruit size +316.3 ± 136.9 (P = 0.026); distance nest–breakfast site −147.4 ± 206.7; non-fig × distance +582.8 ± 246.0 (P = 0.025); adult males at the nest −242.3 ± 116.2; feeding duration at the breakfast site −390.5 ± 105.3; feeding duration × males +234.8 ± 110.3 (P = 0.043); relative energy balance −118.4 ± 108 (P = 0.28); night temperature −134.1 ± 107.7 (P = 0.25); rain at the nest +437.6 ± 215.5 (P = 0.044). Full against control model χ²₄ = 22.67, P = 0.0002. The scaling of the predictors is in the supplement, which was not read, so the coefficients give directions and relative sizes, not seconds per metre.
  - "18% of all departures were before sunrise", in twilight "when navigation is difficult and predation risk is greatest".
  - Females left earlier for figs than for other fruit, but only when the figs were far; breakfast figs far from the nest were not eaten later than near ones (r = 0.016, n = 46): they left earlier to make up for travel time. For non-fig breakfasts they left later when the site was far.
  - Why figs: hetero-specific foragers (monkeys, birds, squirrels) were found feeding in fig feeding trees more often (median proportion 0.45 against 0.35; 12 fig and 29 other species; P = 0.0016); ripe figs and small fruits stay on the tree for shorter periods (P = 0.032; fruit size r = 0.33). The authors control intragroup competition with the males at the nest × feeding duration term and attribute the fig effect to competition with other species.
  - Approach speed to breakfast trees: figs median 0.33 m/s, other fruit 0.16 m/s (32 and 119 sites).
  - Nests in the breakfast tree: 4 of 179 (2%); breakfast was outside the nest every day.
  - Nest grunt to nest building: alone with offspring 19 ± 23 min and 980 ± 685 m (n = 26); in a party 30 ± 27 min and 1,194 ± 1,075 m (n = 82).
  - The authors' reading of late departures to far non-fig sites: mothers avoid travelling when predation risk is greatest (forest leopards hunt with crepuscular peaks; Jenny & Zuberbühler 2005, not read).
  - Use in E2b: target T-RHY-3 (share before sunrise) and direction rows (figs earlier than other fruit; far figs earlier than near figs; far non-fig sites later). Nothing here is an input.
- **Nest departure and the active day by sex class, Budongo** [batesByrne2009] (FT: the authors' accepted manuscript, Sussex repository, figshare 23461388) [M].
  - Sonso community, September 2002 – September 2003; 15 focal adults: 8 males and 7 females, of whom 6 lactating or gestating ("lactating females") and 1 receptive.
  - Leaving the night nest, mean ± SD: males 06:56 ± 32 min (21 departures), lactating females 06:46 ± 13 min (12), receptive females 06:37 ± 12 min (4); no difference (F₂,₃₆ = 1.31, P = 0.28).
  - Nest to nest: males 11 h 34 min ± 35 min (10 days), lactating females 10 h 57 min ± 34 min (7 days); t = 2.139, df = 15, P = 0.049.
  - Stops of 20 min or more: males 6.5 ± 1.8 per day lasting 60 ± 50 min; lactating females 4.5 ± 1.0 lasting 95 ± 83 min. Day range 2.7 ± 1.5 km against 1.2 ± 0.8 km.
  - Derived [L]: departures do not differ, so the shorter day is an earlier evening nest (from the means, about 18:30 for males and 17:43 for lactating females; the two means come from different subsets of days). Sunrise at Sonso (1.7°N, 31.5°E, East Africa Time) is about 06:35–07:05 through the year (computed here, not reported), so animals of every class left at about sunrise, and lactating females nested about an hour before sunset.
  - Use in E2b: T-RHY-1 and its class contrast (target), now with its timing: evening, not morning.
- **Nocturnal activity follows moonlight, Fongoli** [pruetz2018] (Abs) [M]. Savanna mosaic; 403 h of observation on 40 nights, 2007–2013. Chimpanzees were more active after moonrise or before moonset in fuller moon phases (dry season only); most night activity was travel or foraging. The author's premise: diurnal primates have no visual specialization for low light. Use in E2b: direction only; activity in the dark is limited by the light to see by.
- **Postpartum sleep fragmentation, women** [montgomeryDowns2010] (Abs) [M for humans; cross-species]. Wrist actigraphy, 50 mothers, postpartum weeks 2–16: nocturnal sleep 7.2 ± 0.95 h, unchanged over the weeks; sleep efficiency 79.7% (week 2) to 90.2% (week 16) as fragmentation fell (21.7 to 12.8). Use in E2b: night feeding wakes the mother (direction; a tenth to a fifth of the night early in lactation in women), *assumed* for chimpanzees; no chimpanzee value was found.

**Sources:**
- *new* pruetz2018: Pruetz JD 2018. Nocturnal behavior by a diurnal ape, the West African chimpanzee (*Pan troglodytes verus*), in a savanna environment at Fongoli, Senegal. *American Journal of Physical Anthropology* 166(3):541–548. [doi:10.1002/ajpa.23434](https://doi.org/10.1002/ajpa.23434) (Abs).
- *new* montgomeryDowns2010: Montgomery-Downs HE, Insana SP, Clegg-Kraynok MM, Mancini LM 2010. Normative longitudinal maternal sleep: the first 4 postpartum months. *American Journal of Obstetrics and Gynecology* 203(5):465.e1–465.e7. [doi:10.1016/j.ajog.2010.06.057](https://doi.org/10.1016/j.ajog.2010.06.057) (Abs).
- janmaat2014 and batesByrne2009 are already listed (docs/realism-design.md source table); the entries above add findings from their full texts.

**Not verified:** the janmaat2014 supplement (predictor scaling, ripe-fruit presence durations, Fig. S5 leopard attack rates); Jenny & Zuberbühler 2005 (leopard hunting times); any measurement of chimpanzee mothers waking at night to nurse; a chimpanzee visual threshold for travel in low light (Matsuzawa 1990 measured acuity, about 1.5, in daylight only; not read).
