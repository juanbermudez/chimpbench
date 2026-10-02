# Field audit: how the intake and feeding-time numbers the model misses were measured

Track E, 1 October 2026, branch `e-field-audit`. **Documents and analysis only: no simulation code changed, no simulation run.** Question from the user, after E1g: before the model changes again, take apart the field numbers it cannot reproduce. These are T-ENE-1 (2,479 ± 858 kcal/day), T-ENE-2 (309 ± 85 min/day) and T-ENE-3 (872 ± 289 g/day), and the activity rows that share their minutes. Also: the infant intake rate behind E1f's eating-time miss.

Sources added to docs/research.md §E.19 and docs/staging/e-sources.md §19. Tags as in docs/staging/e-sources.md:
- FT = full text read; Abs = abstract only; secondary = seen only as cited or in a snippet.
- [H], [M], [L] rate the observation in its own population.
- "Derived" = arithmetic done here.
- Bibliographic data checked against Crossref on 1 October 2026, except book chapters.
- Sources marked "(subagent)" were read in full by a research subagent of this audit. Their load-bearing passages were re-checked here unless marked "not re-checked".

## 0. Summary

1. **The field sample was nursing mothers.** uwimbabazi2019's 14 multiparous females were, in the authors' words, "nursing mothers". The companion paper (uwimbabazi2021) calls the 2,479 kcal the intake of lactating females and compares it with lactating women.
   - Track E compared the field mean with non-reproducing or pooled females.
   - Against the model's own lactating females (1,721 formula kcal, 206 min; E1g at k 1), the field is ×1.44 in intake and ×1.50 in minutes, not ×1.90 and ×1.73.
2. **The energy formula overstates metabolisable energy, and this is measured.**
   - In the formula behind T-ENE-1 (Conklin-Brittain et al. 2006), only about 40% of the Kanyawara energy is in fractions measured as such: sugars, protein, lipid.
   - 34% is "total non-structural carbohydrate" obtained by subtraction, beyond the measured sugars, credited at 4 kcal/g. 26% is a fibre credit of 1.6 kcal/g taken from captive chimpanzees on a low-lignin biscuit.
   - Across primate species where the same formula can be paired with doubly labelled water, it gives 1.13–1.92 × measured expenditure (mean 1.46, 7 species). A version that counts only measured sugars plus starch and pectin estimates gives 0.84–1.38 (mean 1.04, 8 species) (simmen2017, electronic supplement).
   - The method's authors call the 4/4/9 factors overestimates for high-fibre wild diets, and the carbohydrate and fibre credits probably too high (conklinBrittain2006).
   - Applied to uwimbabazi2019's own tables, the sugar-based version gives **1,810–2,070 kcal/day (0.73–0.83 of 2,479)**.
3. **With both corrections the paradox largely goes away.**
   - The model's lactating female spends 1,683 kcal/day at sourced expenditure.
   - Captive *Pan* doubly labelled water plus a human-scaled milk cost gives 1,670–1,820 for a 31–35 kg nursing mother.
   - The corrected field intake is 1.0–1.24 × either, a residual that the measured range of wild primate expenditure, sampling error and the unquantified time and rate biases (§3) can each absorb.
   - **No wild expenditure beyond the measured primate range is needed** (E1g's k ≈ 1.6, PAL ≈ 2.15, was an artefact of the class and the formula). Confidence: moderate.
4. **The model inherits the same inflation through its inputs.**
   - Its kcal per minute (9.9, 12.5, 4.2) are the same formula's values. So the model eats each minute's energy about 1.2–1.4 times too fast, and its eating time comes out short by the same factor.
   - Correcting the food energy (not the expenditure) would put lactating females at about 250–280 eating minutes at k 1. The model then needs 690–780 g of dry matter a day, which E1b's assumed foregut cannot pass. The field's own dry-matter intake (872 g/day, a figure the formula does not touch) already says that foregut is too small.
5. **Feeding time is less certain than T-ENE-2 implies.**
   - Four Kanyawara studies with different protocols give 33%, 44%, 44.5% and 45% of the day.
   - T-ENE-2's 309 min is the top of that range, measured in a fig-dominated 18 months with a bout rule that keeps pauses of up to 5 min inside a bout.
   - T-ACT-1's band (0.33–0.50) already spans the range.
6. **Infant intake rate.** Per ingesting minute, infants take 0.57 of the adult's items (0.35–0.83 across five fruits), juveniles 0.80 (bray2018, Figure 5, digitised). The model's size-scaled rate (0.32–0.49 of adult) is not too fast. Lowering it toward the 0.8–1.2 kcal/min that field eating time implies (E1f) has no support.
7. **Recommendations** (§7):
   - T-ENE-1 re-scoped to lactating females and flagged contested, with its ledger truth compared against the corrected 1,810–2,070.
   - T-ENE-2 and T-ENE-3 re-scoped and kept.
   - T-ACT rows kept.
   - One model input to revise, as a registered stage: food energy density by a sourced sugar-based correction. The E1b foregut is the input that this exposes.
   - No change to k.

## 1. uwimbabazi2019, read in full

**Access.** Author manuscript NIHMS1029101 (PMC7450825), full text through NCBI's BioC text-mining service, and equations and references through NCBI efetch. The PMC web page's CAPTCHA was not touched. The manuscript has no journal page numbers, so locations are by section and table. The same data are reanalysed in uwimbabazi2021 (FT, PMC8225573), which adds method details.

### 1.1 Sample (Methods, "Study site and subjects"; Results ¶1; Discussion ¶6)

- Kanyawara community of 47–51 animals with 17 adult females; **14 multiparous, habituated females**, aged 13.3–54.9 y at the start; January 2014 – June 2015; one observer.
- 14 ± 2 follow days a month, each female at least one a month, 15 ± 1 days per female.
- **210 follows, of which only the 141 of at least 10 h were analysed** (93 in fig months, 48 in drupe months; 1,597 h, so 11.3 h per follow, derived). uwimbabazi2021 gives the reason: shorter follows were not comparable with nest-to-nest follows in feeding time and dry matter. Its reported test, F(2,135) = 35.3 with P = 0.15, is internally inconsistent: an F that large gives P far below 0.001.
- The 309 min are **observed minutes in 10–12.5-hour follows, not an extrapolation**: 45% of observed time (derived).
- **Reproductive state.** The Discussion calls the subjects nursing mothers and gives milk production as one reason their intake exceeds an earlier estimate; uwimbabazi2021 calls them lactating females and compares their intake with lactating women (about 2,500 kcal). Intake was **not analysed by reproductive state**: the models have fruit month or dominant food as fixed factor, group size as covariate and female as random factor. How many follow days fell in pregnancy or cycling is not reported.
- 14 of the 18 months were fig months, in which feeding time was 20% longer than in drupe months.

### 1.2 What "feeding" and a feeding minute are (Methods, "Collection of behavioral and feeding data")

- Continuous focal recording.
- **Feeding** = reaching for, picking, handling or chewing a food item, plus searching gaps shorter than 5 s.
- **Bout.** uwimbabazi2019: continuous feeding on one food item, not broken by non-feeding activity of 5 min or less. uwimbabazi2021 (same data): the bout ends at a food switch or another behaviour, and continues while the animal is still chewing, up to 5 min. The two descriptions differ. Start and end are timed to the nearest minute.
- Daily time on an item = time spent feeding on it. No subtraction of non-feeding gaps within bouts is described.

### 1.3 How intake per minute was measured (Methods; "Food sample collection and processing"; "Food and nutrient intake calculations")

- **Rate samples.** Units eaten in a minute, counted at 5-min intervals through the bout "when possible" or as observation conditions allowed. 4,314 one-minute records over 648 h. The text does not say whether 648 h is feeding or observation time; either way, at most one minute in nine was counted, against one in five if every interval had been scored.
- **Unit.** As the chimpanzee handled the food: one fruit; a strip of leaves (leaves per strip estimated); centimetres of pith or bark per minute.
- **Unit mass.** At least 30 wet units per food item, collected the same day or week from the plant eaten or a neighbour of the same species. Units were processed to mimic the chimpanzees (the example given: a peeled fruit with its spat seed removed), dried at about 40 °C, and corrected to 105 °C dry matter and to organic matter.
- **Daily intake** = Σ minutes on item i × the item's mean dry g/min; nutrients and energy from the item's composition. **Every bout minute is credited at the item's sampled rate.**
- **Wadges.** The Discussion says high-fibre parts were often spat out as a wadge or passed in faeces. No subtraction of wadge mass is described, and a wadge cannot be mimicked on a collected sample.
- **Seeds.** Spat seeds were removed (E1e's reading, now confirmed in the full text). But figs are "normally consumed whole" and samples were processed as eaten, so **fig samples include the fig seeds, which pass through the gut intact** (wrangham1994: seeds in 98.5% of 1,849 Kibale dung samples, viable after passage). Figs were 69% of ripe-fruit intake. E1e's conclusion that swallowed seeds cannot inflate T-ENE-1 held for spat seeds only.

### 1.4 Energy density (Methods, "Laboratory analyses", the ME equation; Tables 2 and 4)

- ME (kcal per 100 g organic matter) = 4 × %TNC + 4 × %AP + 9 × %lipid + 1.6 × %NDF, following Conklin-Brittain et al. 2006.
- Crude protein by near-infrared spectroscopy (N × 6.25). Available protein (AP) = crude protein − acid-detergent-insoluble protein. Lipid by petroleum ether. Water-soluble carbohydrate (WSC) by phenol–sulphuric assay. Detergent fibres.
- **TNC by difference**: 100 − NDF − lipid − AP − ash. (uwimbabazi2021 says 4 kcal/g of crude protein; uwimbabazi2019 says available protein.)
- Table 2 (% of organic matter): ripe fruit TNC 44.6, of which WSC 16.5; figs 40.7 and 9.2; non-fig fruit 46.6 and 20.1; young leaves 30.5 and 5.1; pith 33.9 and 15.5.
- **Where the 2,479 kcal come from.** Derived from Table 4, weighting the non-fig fruit, fig and leaf-and-pith days 22 : 76 : 43; the weighted sum reproduces 2,479 exactly.

| Fraction | kcal/day | Share | g/day |
| --- | --- | --- | --- |
| Water-soluble sugar (measured) | 444 | 18% | 111 |
| Available protein | 358 | 14% | 90 |
| Lipid | 185 | 7% | 21 |
| TNC by difference beyond measured sugar (starch, pectin and other soluble fibre, organic acids, tannins and other phenolics, assay error), at 4 kcal/g | 839 | 34% | 210 |
| NDF credit at 1.6 kcal/g | 652 | 26% | 408 |
| Total | 2,479 | 100% | 839 g organic matter |

- The 839 g of organic matter is 0.96 of the 872.6 g dry matter, so energy was applied to organic matter and ash does not inflate the total.

### 1.5 Results used as targets (Results ¶4; Tables 1 and 4)

- Means of 141 days: **feeding 308.7 ± 85 min, dry matter 872.6 ± 289 g, energy 2,479.4 ± 858.1 kcal** (± is the SD of days). Daily energy ranged 1,240–4,931 kcal.
- No difference between drupe and fig months in dry matter or energy; feeding time 20% lower in drupe months.
- Table 4, by dominant food (mean ± SE): non-fig fruit days 2,706 ± 221 kcal (22 days), fig days 2,590 ± 95 (76), leaf-and-pith days 2,169 ± 114 (43).
- Yield of a feeding minute over the day: 2,479 ÷ 308.7 = 8.0 kcal/min, or 2.8 g/min (derived).
- Precision of the mean (derived; no SE is reported): between 72 kcal (days independent) and about 230 kcal (if all variation lay between the 14 females).

### 1.6 Comparison with expenditure

- **uwimbabazi2019 makes none**: the word "expenditure" does not occur.
- It compares only with the earlier Kanyawara estimate of 2,340 kcal/day (conklinBrittain2006), and explains its higher value by:
  - the earlier study pooling male and female rates;
  - having no pith rate;
  - switching focal animals every 10 min;
  - its own subjects being nursing mothers.
- uwimbabazi2021 compares the total with lactating women, not with a chimpanzee expenditure.

## 2. Other estimates of daily intake and feeding time

### 2.1 Daily intake

Per kg^0.75 and against captive *Pan* doubly labelled water (97–102 kcal per kg^0.75 per day; pontzer2016) are derived. Kanyawara has never weighed its chimpanzees, so 31.3–35.2 kg (Gombe and Mahale females) bounds it. Every chimpanzee, orangutan and gorilla estimate below uses the same family of formula (TNC by difference; fibre credit 1.6, 0.543 or 1.347 kcal/g).

| Study | Site, years | n | Observation | Rate and mass | Formula | kcal/day | Feeding min/day | kcal per feeding min | per kg^0.75 | Access |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| uwimbabazi2019 | Kanyawara 2014–15 | 14 nursing females, 141 days | continuous focal, follows ≥ 10 h, bouts with ≤ 5-min gaps | units/min "when possible" × collected unit mass | TNC by difference, NDF 1.6 | 2,479 ± 858 | 309 ± 85 | 8.0 | 172–187 (1.7–1.9 × captive *Pan*) | FT |
| conklinBrittain2006 | Kanyawara 1992–93, 8 months | both sexes, adults and subadults pooled | 10-min focal rotation, instantaneous record at 60 s | bites/min "whenever possible"; 17% of feeding minutes given the month's mean | as above | 2,340 (1,806–3,333 by month); 1,704 with no fibre credit | not reported | — | 150–177 (31–39 kg) | FT (subagent; re-checked) |
| vale2020 | Taï 2017–18 | 7 F, 4 M; 158 all-day follows, 1,643 h | continuous focal | items per bout; 2 min in 10 extrapolated where the mouth was hidden; rates countable in 2,139 of 3,635 bouts | as above (composition from nguessan2009) | F 2,707, M 2,943 (means of monthly means; F 1,237–4,435 by month) | not read | — | 165–166 at the authors' assumed 41.6 and 46.3 kg | FT + supplement (subagent; Table S3 re-checked) |
| nguessan2009 | Taï 2003–06 | 6 F, 2 M, 5 young; 127 days | dawn-to-dusk focal | items/min every 10 min "whenever possible"; portions for large items | as above | not given; balance positive in most seasons; the authors allow that intake was over- or expenditure underestimated | not given | about 7–37 by season (figure; low confidence) | — | FT (subagent; not re-checked) |
| knott1998 (orangutans) | Gunung Palung 1994–96 | 1–2 animals per cell | full-day focal | 1-min rates every 3 min, then every 5 | TNC by difference, NDF 0.543 kcal/g | F 7,404 (mast, January) and 1,793 (May); M 8,422 and 3,824 | F 240 and 228; M 347 and 303 | F 31 and 8 (derived) | F 486 and 118 (37.8 kg) | FT (subagent; re-checked) |
| harrison2010 (orangutans) | Sabangau, 46 months | 28 individuals | nest-to-nest focal, ≥ 6 h | intake per minute followed × active period | as above, NDF 1.6 / 0.543 / 0 | F 1,624 ± 751 / 1,226 / 1,028 | — | — | 105 (38.7 kg) at 1.6 | FT (subagent; formula re-checked) |
| masi2015 (western gorillas) | Bai Hokou | 1 group, 237 days, mostly half days | 5-min scans | 5-min rate sessions | NDF 1.347 kcal/g | silverback 5,038, lactating F 9,683, immatures 8,914 | — | — | far above any doubly labelled water (e-sources §16) | FT extract |
| Bonobos | — | — | — | — | — | no published daily intake found | — | — | — | — |

What the table says:
- **2,479 is not an outlier for this method.** The same formula gives 2,340 at Kanyawara in 1992–93, 2,707 and 2,943 at Taï, and 150–187 kcal per kg^0.75 at every chimpanzee site: 1.5–1.9 × captive *Pan* expenditure.
- Without the fibre credit, Kanyawara 1992–93 falls to 1,704 kcal (conklinBrittain2006 Table 17.2), and the authors' own Figure 17.1 then shows lactating females often short of their estimated expenditure.
- The method's highest values are mast-season orangutans (7,404 kcal/day for one female, read by knott1998 as fattening) and western gorillas (lactating females 9,683 kcal/day, which no ape could spend; masi2015, e-sources §16).

### 2.2 The method tested against measured expenditure: simmen2017

simmen2017, electronic supplement (FT, CC-BY figshare; main text not reached). This is the only test found of the field method against an independent measurement.
- The authors split published wild primate intakes into two sets:
  - "high energy value": TNC by difference, as published;
  - "low energy value": measured sugars plus starch and pectin estimates. Where only water-soluble carbohydrate was measured, they add 5% of dry matter as pectin; where TNC was by difference, they multiply the published intake by 0.74, the average ratio of the two computations across their diets (74 ± 8%, Table S3).
- In ripe-fruit diets, simple sugars are 48 ± 13% of TNC by difference; sugars, starch and pectin together are 68 ± 10%.
- **Paired with doubly labelled water in the same species (Table S5):**
  - high-energy-value intake exceeds measured expenditure by a mean of 1,770 ± 2,208 kJ/day (Wilcoxon, P < 0.02, 7 species). Ratios: ring-tailed lemur 1.92, *Eulemur* 1.49, *Propithecus* 1.56, yellow baboon 1.15, chacma baboon 1.13, orangutan 1.58, western gorilla 1.39 (derived);
  - the low-energy-value version does not differ: +144 ± 606 kJ/day; ratios 0.84–1.38, mean 1.04, 8 species.
- Allometric intercepts against the expenditure line: 131 ± 25% for the high-value set, 108 ± 27% for the low-value set.
- The paired expenditures are mostly from other (often captive) populations. The authors rely on captive and wild primates spending alike (pontzer2014, simmen2021).

### 2.3 Feeding time and its definitions

| Study | Site, years | Method | What counts as feeding | Adult feeding share | Access |
| --- | --- | --- | --- | --- | --- |
| gilby2010 | Kanyawara 2004–05; 5 M, 5 pregnant or lactating F | full-day focal (mean 9.2 h), 1-min instantaneous samples; 81,294 samples | activity state "feeding" | **32.9%**; party-level 15-min scans (any animal feeding) gave about 30 points more (mean 29.7, range 15.9–50, by month) | FT (subagent; re-checked) |
| potts2011 | Kanyawara 2006 (961 h); Ngogo 2005–06 (1,059 h) | continuous focal, each follow one feeding bout and one travel bout, rotating | ingestion and/or chewing uninterrupted by other behaviour for ≥ 1 min; travel = sustained movement > 1 min between patches; grooming counted as rest | Kanyawara 44%, Ngogo 47% (Fig 2). By class (Fig 3, digitised ± 2 points): Kanyawara pregnant or lactating F 44%, cycling F 47%, M 44%; Ngogo 62%, 52%, 43% | FT (author copy; figures read from the rendered PDF) |
| bray2018 | Kanyawara 2010–13 (KCP field assistants) | full-day focal, 1-min point samples, follows ≥ 4 h of in-view time | solid food being swallowed | prime-aged adults about 44.5% of in-view time (Fig 2 band, mean ± SE about 40–49%) | FT; figure digitised |
| uwimbabazi2019 | Kanyawara 2014–15; nursing F | continuous focal, follows ≥ 10 h | reaching, picking, handling, chewing; bouts keep gaps ≤ 5 min | 45% (309 of 680 min) | FT |
| villioth2025 | Budongo Waibira 2016–17; 10 M, 9 F (7 lactating) | continuous focal, follows 4.1 ± 2.6 h (491 h) | all food handling, picking and ingesting; movement within the canopy scored as travel; rest = sitting or lying > 1 min | 36% M, 37% F (travel 21 and 20%) | FT |
| stanton2017 | Gombe mothers | 1-min instantaneous point samples, follows 6–12 h | Gombe ethogram | 0.47–0.51 | FT (subagent; re-checked) |
| badescu2022 | Ngogo immatures | 1-h continuous samples | looked for, picked, bit, chewed and ingested self-acquired food | adults 47% (cited from potts2011) | FT |

Reading:
- At Kanyawara the share is 33% (2004–05), 44% (2006), 44.5% (2010–13) and 45% (2014–15) under four protocols. Elsewhere it is 36–37% at Waibira (in-canopy movement counted as travel) and 47–51% at Ngogo and Gombe.
- Year, season and subjects are confounded with protocol, so no single definitional effect can be isolated. The spread is about ±6 points around 0.40, or about ±40 min of an 11.3-h day.
- **T-ENE-2's 309 min is at the top of Kanyawara's range.** The model's lactating females (206 min, about 31% of their active day) sit just under its bottom (gilby2010's 32.9%).
- What a feeding minute contains differs between studies: in-crown searching and movement, chewing after the last item, and pauses up to 5 min (uwimbabazi2019) or 1 min (potts2011, villioth2025). The model's eating act is ingestion only.

## 3. Biases of the field intake method, step by step

| Step (uwimbabazi2019) | Direction | Size | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| Comparison class: nursing mothers compared with pooled or non-reproducing model females | gap looks larger than it is | × 1.90 → × 1.44 (intake), × 1.73 → × 1.50 (minutes) | uwimbabazi2019, uwimbabazi2021 | high |
| TNC by difference credited at 4 kcal/g (34% of the energy beyond measured sugar) | up | sugar-based version 0.73–0.83 of the total at Kanyawara (derived, §4.2); 0.74 ± 0.08 across primate diets | simmen2017 (paired with doubly labelled water); conklinBrittain2006 (authors' caveat); rothman2012 (formula factors may not suit primates) | moderate-high on direction and size range |
| Fibre credit 1.6 kcal/g (26% of the energy): 3 kcal/g × 0.543 digestibility from captive chimpanzees on a biscuit of 34% NDF and 2.5% lignin; wild Kanyawara diet about 8% lignin | up | conklinBrittain2006 suggests 0.5–1.0 kcal/g: −10% to −18% of the total; E1b's fermentation model gives −3% to −6% | conklinBrittain2006 (FT), e-sources §16 | moderate on direction; size between those bounds |
| Atwater 4/4/9 factors for a high-fibre diet | up | not separable from the two rows above | conklinBrittain2006 | moderate |
| Fig seeds inside whole-fig samples (figs 69% of ripe-fruit intake) | up | unknown at Kibale; in *Ficus perforata* seeds are 45% of the fig and inflate every nutrient, lipid most | urquizaHaas2008 (Abs), wrangham1994 | moderate on direction, low on size |
| Wadges not subtracted (pith, some fruit, leaves) | up | unknown; the share of pith that is wadged was already unknown in 1991 | wrangham1991 discussion (FT, subagent), rothman2012 | low |
| Bout time includes gaps ≤ 5 min and chewing after the last item, to the nearest minute | up (minutes and intake) | 0–30% of minutes; best guess about 15% | uwimbabazi2019/2021 definitions; Kanyawara shares 33–45% (§2.3) | low |
| Rates counted "when possible" (at most 1 minute in 9), probably on visible, actively eating minutes, then applied to every bout minute | up (intake) | unquantified; in captive baboons, rate × time missed true intake by 8–50% (direction not given) | uwimbabazi2019; zinner1999 (Abs); rothman2012: feeding time is a good index of effort, a poor one of intake | low |
| Crude protein N × 6.25 | none net | moves mass between protein and TNC, both at 4 kcal/g | rothman2012, derived | moderate |
| Ash | none | energy applied to organic matter (839 g = 0.96 of dry matter) | derived from Table 4 | high |
| Spat seeds | none | removed before weighing | uwimbabazi2019 | high |
| Only follows ≥ 10 h (141 of 210); 14 of 18 months fig months | unknown; fig months have 20% more feeding time | — | uwimbabazi2019 | — |
| Sampling error of the mean | ± | SE 72–230 kcal (3–9%) | derived | — |

**The step that most plausibly inflates intake is the energy formula**, chiefly TNC by difference at the sugar rate, then the fibre credit. It is the only step with a test against measured expenditure (simmen2017), the method's own authors expect it to inflate, and on Kanyawara's own composition its size (17–27%) is most of what the gap needs (26–33% for nursing mothers, §4.2). Confidence: moderate-high on direction, moderate on size.

Seeds, wadges and minute-level sampling all push the same way but have no measured size; they are the main uncertainty in the residual.

**For feeding time** no step is shown to inflate it. The definition and period effects are about ±15% (§2.3). T-ENE-2 sits at the top of the Kanyawara range, not outside it. Confidence: moderate.

## 4. Are T-ENE-1 and T-ENE-2 consistent with measured primate expenditure?

### 4.1 With each other: yes, by construction

- T-ENE-1 is T-ENE-2 × per-minute rates × the formula, and the model takes the same rates and formula as inputs (8.0 kcal per feeding minute in the field, 8.4 for the model's lactating females).
- An error in the minutes moves both field rows. An error in the rates or the formula moves T-ENE-1 and the model's food value together.
- So E1g's "k ≈ 1.6 for the time budget, 1.8–2.0 for intake" (§7.6) is one claim, not two.

### 4.2 Face value against corrected values, for nursing mothers

Expected expenditure of a nursing mother (derived): captive *Pan* doubly labelled water 97 × M^0.75 plus the model's human-scaled milk cost (yield 23.2 × M^0.75 ÷ 0.8):
- 31.3 kg: 1,283 + 384 = **1,667 kcal/day**;
- 35.2 kg: 1,402 + 419 = **1,821 kcal/day**.

The model's lactating female spends 1,683 at k 1 (E1g §7.1).

| Reading of the field intake | kcal/day | ÷ expected (1,667–1,821) | ÷ model's lactating spend (1,683) | Implied PAL outside lactation, 31.3 / 35.2 kg |
| --- | --- | --- | --- | --- |
| As published (high-value formula) | 2,479 | 1.36–1.49 | 1.47 | 2.11 / 1.89 |
| Fibre credit 1.0 instead of 1.6 kcal/g | 2,234 | 1.23–1.34 | 1.33 | 1.85 / 1.66 |
| TNC by difference replaced by sugar-based TNC: WSC + 5% pectin (simmen2017's rule) | 1,814 | 1.00–1.09 | 1.08 | 1.42 / 1.26 |
| Same, plus starch at 3–6% of dry matter | 1,919–2,023 | 1.05–1.21 | 1.14–1.20 | 1.53–1.64 / 1.36–1.46 |
| Same, at simmen2017's ripe-fruit share (68% of TNC) | 2,068 | 1.14–1.24 | 1.23 | 1.68 / 1.50 |
| simmen2017's general factor (× 0.74) | 1,835 | 1.01–1.10 | 1.09 | 1.44 / 1.28 |

How the columns are computed: the ratio columns compare the field's metabolisable energy directly with expenditure (the model's 1,683 is its spending; its formula intake is 1,721). The PAL column takes the reading × 0.96 as absorbed (E1b's fibre-adjusted share), subtracts the milk cost ÷ 0.9 and divides by Kleiber's 70 M^0.75. "Outside lactation" means what a non-reproducing female of the same activity would spend.

Measured references:
- captive *Pan* PAL 1.4–1.58 (pontzer2016, simmen2021);
- wild yellow baboons 1.38, wild mantled howlers 1.89 (simmen2021);
- Hadza women 1.78, men 2.26 (pontzer2012).

Per kg^0.75: captive *Pan* 97–102 kcal, wild baboons 126, wild howlers 135, Hadza 111 and 139 (derived). The corrected Kanyawara intakes are 125–156 kcal per kg^0.75 *including lactation*.

**Verdict.**
- **As published, for the right class**, T-ENE-1 needs a PAL outside lactation of 1.9–2.1, at or just above the top of every wild primate measured, not far beyond it as E1g found for pooled females.
- **With the formula corrected the way that matches doubly labelled water in other primates**, it needs 1.3–1.7: within the measured range of free-living primates, and 8–23% above the model's present lactating female.
- T-ENE-1 and T-ENE-2 are therefore consistent with measured primate expenditure once the class and the formula are right. **No exceptional chimpanzee physiology is required.**
- Confidence: moderate. The correction is cross-species (7–8 paired species, none a chimpanzee), and no wild chimpanzee expenditure exists to test it directly.

### 4.3 What this means for the model's time budget

- The model's per-minute food energy is the field's high-value formula (`ledgerFruitKcalPerMin` 9.9, `ledgerFigKcalPerMin` 12.5, `ledgerFallbackKcalPerMin` 4.2; E1b discounts only the fibre credit). So the model gets each eating minute's energy 1.2–1.4 times too fast.
- With food energy corrected by the per-food factors of §7.2 (about 0.65–0.80), the model's lactating female would eat about 250–280 min at k 1 (206 ÷ 0.73–0.83), at or inside T-ENE-2's band (250–370). Pooled females would eat 230–265 min, males 220–250 (derived from E1g §7.1 by the same scaling).
- In E1g's sweep the time rows depended on eating time; an equivalent rise came at k 1.3–1.4 (T-ACT-1 0.35, T-ACT-4 0.39 at k 1.3). So T-ACT-1 and T-ACT-4 would be expected in band; T-ACT-3 (grooming) probably still slightly high (E1g needed k ≈ 1.6 for it). This is a prediction, not a result.
- **Unlike raising expenditure** (E1g, which starved mothers and infants), correcting food energy adds no demand. It does add bulk: the same energy needs 1.2–1.4 × the dry matter. That is about 690–780 g/day for a lactating female, against the E1b foregut's practical ceiling of about 650 g/day (E1g §7.1).
- The field's dry-matter intake, 872 g/day (T-ENE-3), does not depend on the formula. It already says the E1b foregut (an assumption: 83 mL/kg, foregut share 0.45, 0.15 g/mL) is too small. E1g's attribution run A1 (111 mL/kg, the top of the assumed range) passed about 750 g/day and balanced adults.

## 5. Infant intake rate

### 5.1 Measurements

**bray2018** (FT via BioC; Figures 2 and 5 read from the Semantic Scholar figure images and digitised by eye, ± about 0.3 items/min and ± 1 point; a subagent digitised the same figures independently from the PMC copies and got the same ratios).
- **Ingestion rates** (Methods 2.2, 2.4.4; Results 3.5; Figure 5):
  - targeted 1-min samples, Kanyawara 1992–1993, at least 30 s in view; items swallowed per minute of foraging; observers rotating through the party every 10 min;
  - 321 records on five ripe fruits; age classes by birth date or body size; all infants in one bin (21 records); individuals not identified;
  - linear model with age class and species: infants β = −4.72 items/min (SE 1.15), juveniles −1.72 (SE 0.79), adolescents −0.13 (SE 0.78), against adults.

| Fruit | Infants | Juveniles | Adolescents | Adults | Infant ÷ adult | Juvenile ÷ adult |
| --- | --- | --- | --- | --- | --- | --- |
| *Ficus dawei* | 3.0 | 5.3 | 9.4 | 8.5 | 0.35 | 0.62 |
| *F. exasperata* | 8.2 | 9.5 | 11.2 | 11.2 | 0.73 | 0.85 |
| *F. natalensis* | 5.0 | 7.8 | 14.1 | 13.4 | 0.37 | 0.58 |
| *Mimusops bagshawei* | 9.6 | 11.6 | 13.2 | 11.6 | 0.83 | 1.00 |
| *Uvariopsis congensis* | 7.0 | 11.8 | 9.7 | 12.6 | 0.56 | 0.94 |
| Mean of fruits | 6.6 | 9.2 | 11.5 | 11.5 | **0.57** | **0.80** |

  - Check: the digitised adult − infant difference (4.9) matches β; the β-based ratios are 0.59 (approximate 95% CI 0.39–0.78) and 0.85.
  - Items, not grams: item mass by age was not measured.
- **Feeding time** (Figure 2): field assistants' full-day follows, 2010–2013, 1-min point samples, solid food swallowed. Share of in-view time: 1–2 y 16%, 2–3 y 25%, 3–4 y 34%, 4–5 y 38%, juveniles 41–46%, adolescents 41%, prime-aged adults about 44.5%.

Other studies:
- **badescu2022** (FT, with its S2 data; subagent): Ngogo foraging by age 0.8% (0–0.5 y), 17.2% (0.5–1), 24.9% (1–2), 30.8% (2–3), 38.3% (3–4), 46.7% (4–5). About 2 bouts per hour from 1 y. No rates.
- **lonsdorf2014** (FT; Table 1 re-checked): Gombe infant eating ("ingestion of solid food", 1-min points) 6.7% at 1 y, 22.0% at 1.5 y, 29.7% at 2.5 y, 32.5% at 3 y, 49.1% at 4.5 y. No rates.
- **matsumoto2017** (FT, subagent): Mahale infants near the adult feeding share at about 44 months. No rates.
- **boesch2019** (FT, subagent; figure digitised by the subagent, not re-checked): Taï nut cracking, nuts per minute, about 0 of the adult rate to 5 y and adult at about 10 y. The hardest technique: a lower bound, not the diet.
- **schuppli2016** (orangutans, FT): rates on easy foods reach adult levels just after weaning, on complex foods later; fruit size and toughness had no significant effect.
- No chimpanzee g/min or kcal/min by age was found.

### 5.2 Reading

- **Per ingesting minute, infants (1–5 y pooled, the ones that feed) take about 0.57 of the adult's items, juveniles about 0.80, adolescents as adults.** These are easy, preferred ripe fruits. On foods that need processing, infant rates are lower and come later (corpByrne2002, schuppli2016, boesch2019). If infants take smaller pieces or waste more, the mass ratio is below the item ratio.
- **The model's rate is not too fast.** E1c's design (adult rate × (mass ÷ adult mass)^0.75) gives infants of 1–4 y 3.2–4.9 kcal per eating minute, 0.32–0.49 of the adult's 9.9 (E1f §9.3), at or below the measured 0.57. E1f's lead (lower the infant rate to 0.8–1.2 kcal/min, about 0.1 of adult, to fit field eating time) contradicts the one measurement and would set an input from a target.
- **The infant gap is the adult gap, larger.**
  - At 2–3 y an infant feeds about 25% of in-view time, about 170 min. At 0.57 of the adult's 8.0 kcal per feeding minute that is about 780 kcal/day of solid food before milk.
  - An infant of about 6 kg needs roughly 400–500 kcal/day for maintenance and growth (Gombe growth via gurvenWalker2006; Kleiber × 1.5–1.8 plus 1.6 kg/y × 4.5 kcal/g; derived).
  - Field time × rate exceeds need by about 2–3 for infants, against 1.3–1.5 for adults at face value. The formula correction (§4) removes only part of it.
  - The rest must lie in what an infant's feeding minute contains (handling, scraps, food play, failed processing), in the infant's need (Kleiber's interspecific line may understate the resting rate of young animals; no chimpanzee value found; untested), or in milk.
- **Best-supported value:** 0.57 of the adult rate per ingesting minute for infants (range 0.35–0.83 across fruits; [M], one community, 21 records, ages partly by size), 0.80 for juveniles, 1.0 for adolescents.
  - No value per feeding minute exists, which is what the model's eating act stands for.
  - A subagent's age-graded spread (1–2 y 0.2–0.35, 2–3 y 0.4–0.5, 3–4 y 0.5–0.65, 4–5 y 0.65–0.8) is an inference from the orangutan curve, rescaled; it is not a measurement and is not proposed as an input.

## 6. Corrections to earlier Track E readings

- **E1b §0** ("the non-fibre fractions ... are already net of digestion; no source says wild chimpanzees absorb less of them"). This holds for measured sugar, protein and lipid but not for TNC by difference, a third of the field energy (conklinBrittain2006 caveat; simmen2017). E1b's 0.96 absorbed share should be read as the fibre discount only.
- **E1e §0** (seeds). Spat seeds were removed; fig seeds were not, because figs are eaten and sampled whole.
- **E1g §7.6–7.7.**
  - The quantified claim (wild expenditure ≈ 1.6 × captive, PAL ≈ 2.15) compared pooled females with nursing mothers and took the formula at face value.
  - For nursing mothers with the formula corrected, the field needs PAL 1.3–1.7, inside the measured range.
  - E1g's other finding stands: the time rows are energy-limited in the model, and the E1b foregut binds when demand or bulk rises.
- **E1f §9.3–9.4** ("biggest open problem: infant intake per eating minute"). The measured ratio does not support a lower infant rate (§5).
- **e-sources §2, gap 1** named the fibre credit as the likely overestimate. TNC by difference is the larger term, and it has been tested against doubly labelled water.

## 7. Recommendations

### 7.1 Targets (proposals for the integrator; `docs/staging/e-targets.patch.json` is not edited here)

| Row | Recommendation | Reason |
| --- | --- | --- |
| T-ENE-1 intake | **Re-scope** to multiparous lactating females (score the model's lactating class). **Flag contested.** Keep the field value and band as the field-method number, but compare the ledger truth with the sugar-based equivalent, 1,810–2,070 kcal/day (§4.2). Never fitted; never a reason to move an input. | The source sampled nursing mothers. Its formula gives 1.13–1.92 × measured expenditure where it can be paired with doubly labelled water. |
| T-ENE-3 dry matter | **Re-scope** to lactating females; **keep** (band 650–1,100 g). | Does not depend on the formula. The cleanest test of gut throughput; caveat: bout minutes and sampled rates (§3). |
| T-ENE-2 feeding minutes | **Re-scope** to lactating females; **keep** the band. Add gilby2010 (32.9%), potts2011 (44%) and bray2018 (44.5%) to its field entries, with a note that 309 min is the top of the Kanyawara range and that its bout rule keeps gaps ≤ 5 min. Prefer T-ACT-1 as the scored time row. | Time is a direct observation; its spread across protocols and years (33–45%) is wider than the band's lower edge allows. Re-banding now would be post hoc. |
| T-ACT-1 to T-ACT-4 | **Keep** as they are; add the definitions and the new field values (gilby2010, potts2011 by class, stanton2017, bray2018) to the notes. | Bands already span the definitional and site spread (T-ACT-1 0.33–0.50 against 0.33–0.51 measured). |
| T-ENE-8 expenditure ÷ M^0.75 | Keep. | Unaffected. |

Proposed fields (staging):
- `definition` of T-ENE-1, T-ENE-2 and T-ENE-3: "... of a multiparous lactating female (the source's subjects were nursing mothers) ...".
- `protocolRevisedPostHoc: true` on all three. The class follows the source's text, but simulated values had been seen (E1–E1g).
- `reviewNote` on T-ENE-1: "contested (e-field-audit): field ME uses TNC by difference at 4 kcal/g (34% of the energy beyond measured sugar) and NDF at 1.6 kcal/g (26%). This formula gives 1.13–1.92 × doubly labelled water where paired (simmen2017); the sugar-based equivalent is 1,810–2,070 kcal/day. Report beside the ledger truth of lactating females; not counted for or against the model."
- The field-method observer for T-ENE-1 should multiply observed minutes by the **source's** kcal/min (high-value formula), whatever energy the model's foods carry. That keeps it method-matched; T-ENE-1 then adds nothing beyond T-ENE-2.

### 7.2 Model inputs

1. **Food energy density: one input to revise, through a registered stage (E1h), not by default.** The kcal per minute come from a formula that overstates metabolisable energy by a measured amount. A sugar-based correction from the source's own Table 2 is physiology of the food, not a fit to behaviour. Per-food factors (derived; WSC + 5% pectin at 4 kcal/g, simmen2017's rule; fibre credit unchanged; in brackets, with starch at 3–6% of organic matter):

| Food | High-value ME (kcal/100 g OM) | Sugar-based | Factor |
| --- | --- | --- | --- |
| Ripe fruit (all) | 323 | 231 | 0.71 (0.75–0.79) |
| Non-fig (drupes) | 336 | 250 | 0.74 (0.78–0.82) |
| Figs | 300 | 194 | 0.65 (0.69–0.73), before any seed correction |
| Young leaves | 299 | 217 | 0.73 (0.77–0.81; starch in leaves is lower, 1–4%) |
| Pith | 262 | 209 | 0.80 (0.84–0.89) |

   - Register before running. Predictions (§4.3): lactating eating 250–280 min, T-ENE-2 and T-ACT-1 into band at k 1, grooming lower, no starvation from demand, dry matter 690–780 g/day for lactating females.
   - The E1b foregut binds first. Run with the foregut at its present assumed value and at A1's 111 mL/kg, and report which binds.
2. **E1b foregut capacity** (assumed). The field's 872 g/day of dry matter, independent of the formula, exceeds what it can pass. Treat its top of range (A1) as the better-supported value if E1h shows the binding. No new source for the gut was found.
3. **`ledgerWildCostMult` stays 1.** The field no longer needs k > 1 once class and formula are right; any residual (≤ 24%) is within the measured range and the method's other biases.
4. **Infant intake rate.** Do not lower it. If a sourced input is wanted instead of the design exponent, use bray2018's ratios (0.57 infants, 0.80 juveniles). That makes infants faster and widens the infant eating-time miss, which is the honest result.
5. **Body mass.** Kanyawara females have never been weighed. Run E1h also at 35.2 kg (Mahale) as a sensitivity: about +9% expenditure.
6. **Fibre credit.** E1b's fermentation model credits 1.35 kcal per g of NDF, between conklinBrittain2006's suggested 0.5–1.0 and the formula's 1.6. Leave it; a sensitivity at 1.0 can ride along in E1h.

### 7.3 What would settle it in the field

- Doubly labelled water on wild Kibale females (E1g's test). The prediction now: about 1,650–1,850 kcal/day for a nursing mother of 31–35 kg, against about 2,400 if E1g's reading (k ≈ 1.6) were right.
- Soluble sugars, starch and pectin of the main Kibale fruits, and the seed fraction of Kibale figs: these fix the formula's two credited terms.
- On focal follows, score each feeding minute as ingesting or not, and count units on every scored minute: this gives the yield of a feeding minute rather than of a visible ingesting minute.

## 8. Not reached or not verified

- potts2015 (Ngogo and Kanyawara foraging efficiency, IJP 36:1101–1119): closed; the publisher returned a challenge page; no abstract in any index.
- simmen2017 main text (only the abstract and the CC-BY supplement were read); whether its excluded studies include chimpanzees is not known (no chimpanzee is in its Table S1).
- rothman2012: one PDF page (about p. 555, on TNC by subtraction) was unreadable in the archived copy.
- The seed fraction of Kibale figs; any wadge-mass measurement; starch and pectin of Kibale foods.
- Doran 1997, Wrangham 1977, Newton-Fisher 1999, Watts 2012 part 2, Bates & Byrne 2009 activity budgets, Pontzer & Wrangham 2004 full text, Wrangham & Conklin-Brittain 2003 full text, Murray et al. 2006 PDF: not reached. No published bonobo daily intake found.
- Corp & Byrne 2002 full text, Hiraiwa-Hasegawa 1990, Altmann 1998, gorilla bite rates by age: not reached.
- nguessan2009 balances and knott1998 figures beyond the values listed were read from figures by a subagent; low confidence.
