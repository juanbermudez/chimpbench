# E1u: an audit of the gut model's inputs (registered 5 October 2026; research only)

Owner: agent `e1u-gut-audit` (branch `e1u-gut-audit` from `track-e`). No code in `src/sim`, no parameter value changed,
no simulation run. The integrator judges and registers any input correction separately, before any run.

## 1. Why

E1r (`e1r-prereg.md` §9–11) found that in the lean season the small and reproducing females' absorbed energy is capped
by the foregut (full in 76–89% of their eating minutes), and E1s showed that changing how options are valued does not
fix it. The cap is set by inputs most of which are assumptions (`data/params.json`, evidence "assumed"):
`digestaGutMlPerKg` 83, `digestaForegutShare` 0.45, `digestaForegutDmGPerMl` 0.15 (so 5.6 g of dry matter per kg in the
foregut), `ledgerGutEmptyH` 3 (so 1.87 g/kg/h passed at capacity), `digestaHindgutDmGPerMl` 0.2, `digestaMrtH` 38,
`digestaNdfDigestibility` 0.449, `digestaFermentKcalPerG` 3.0, `digestaTefFrac` 0.1, `ledgerGutCapKcalPerKg` 25; and on
measured rates whose meaning matters here: `digestaFallbackDmGPerMin` 1.89 and `digestaFallbackNdf` 0.534
(uwimbabazi2019, potts2011). Chimpanzees wadge pith and fibrous fruit (chew and spit out the fibre; wrangham1991,
harrisonMarshall2011), but the model swallows every gram. The rule "field numbers are targets, never inputs" forbids
moving any of these to make animals survive; it does not forbid finding data for an assumed input. This stage looks.

## 2. Questions

1. For each input above: is there a measurement for chimpanzees, another great ape, or another primate with a simple
   gut (value, method, sample, units, how it maps onto the model's quantity)? Evidence level as in research.md.
2. What does uwimbabazi2019's dry-matter feeding rate measure for pith and leaves: mass handled or mass swallowed? Are
   wadged parts counted? What does the source say about wadging, and do potts2011, wrangham1991 or others give the
   swallowed share of pith or fibrous fruit?
3. Sensitivity (offline, with the model's own pure functions and no tick): for a juvenile female of about 20 kg and a
   pregnant female on E1r's March–April diet (its food mix from `e1r-prereg.md` §9.4), the absorbed energy per day at
   a full foregut across each input's plausible range from the sources found (or ±50% where none is found, labelled so);
   which inputs move the lean-season deficit (−62 to −155 kcal a day in E1r) most.
4. Where the model's quantities have no counterpart in any source (for example a foregut "emptying time" for a simple
   gut), say so, and say what measurable quantity would pin them down.

## 3. Deliverable

A table per input: current value and label, the data found (source, value, method, mapping), the verdict (supported;
contradicted, with the corrected value the data give; unknown), and its sensitivity. A short answer on wadging. Every new
source is added to `docs/research.md` first (the section "Gut inputs audit (stage E1u, 5 October 2026)"). The integrator
decides any correction and registers it before a run; this stage proposes, never applies.

## 4. Prediction (integrator, low confidence)

Most gut inputs stay unknown at the level the model needs (no chimpanzee data for foregut volume or emptying), the
fallback's dry-matter rate turns out to be handled rather than swallowed mass for pith (wadging lowers the swallowed
fibre), and the foregut emptying time and capacity move the lean-season deficit most.

## 5. Results (agent `e1u-gut-audit`, 5 October 2026; §1–4 above are the registration, unchanged)

### 5.0 Method
- No simulation and no world tick; nothing in `src/sim` or `data/params.json` changed. Sources first:
  `docs/research.md`, "Gut inputs audit (stage E1u, 5 October 2026)" (21 new sources; access, subagent reading and the
  agent's re-checks are recorded there; hosts that challenged were dropped at the first challenge).
- Sensitivity (§2.3): `scripts/e1u-gut-sensitivity.ts` with `scripts/lib/gut-ceiling.ts` (tests
  `tests/e1u-gut-ceiling.test.ts`; output `artifacts/validation/e1u/gut-sensitivity.{md,json}`, gitignored). It takes
  S39's parameters and two animals from `bench-run/…/M6-S39/parts/M6-S39.s48.ckpt-d210.v8.gz`, mirrors the gut's
  first-order dynamics (energy.ts: energyTick's digesta block, then eat(), in the sim's order) and reads every capacity,
  dry matter per kcal and ingestion rate from the model's pure functions (digestaCaps, dryMatterPerKcal, fruitRate,
  fruitKcalPerUnit, fallbackKcalPerH, intakeSize). The animal eats E1r's March–April mix whenever its foregut has room
  through a 12-h active day and fasts 12 h; the daily cycle runs to its periodic state (30 days, last 7 averaged).
  That is "absorbed energy per day at a full foregut": the most a gut-bound animal absorbs.
  - Diets (E1r §9.4): fallback 29% (S39) and 38% (S31) of plant energy for juvenile females, 25% and 49% for pregnant
    females; figs 25% of the fruit energy (§9.4 gives no fig share; 0 or 40% moves absorption by −36 to +64 kcal/d;
    an active day of 11 or 13 h by −34 to +31).
  - Animals: a copy of seed 48's juvenile female id 35 (6.1 y) with her mass set to 20 kg, and pregnant female id 15
    (31.3 kg, day 202 of pregnancy); ids 17 and 45 give the same per-kg results.
  - "Δ deficit" below is the change in absorbed − diet-induced thermogenesis, i.e. in E1r's deficit if the animal stays
    gut-bound and spends the same; for a gain it is an upper bound (a larger ceiling may stop binding).
- Ceiling at today's values: juvenile 20 kg 891 kcal/d absorbed (S39 diet; 802 after thermogenesis) and 846 (S31; 761);
  pregnant 31.3 kg 1,426 (1,283) and 1,243 (1,119); 21.5–22.7 g of dry matter per kg a day.
- Check against the model's own runs (nothing fitted): for a 31.3-kg female on the S39 pregnant diet the ceiling is 711
  g of dry matter and 1,426 kcal absorbed a day; M6-S39's pregnant class in March–April (window days 124–179, 5 seeds)
  ate 680 g and absorbed 1,326 (0.96 and 0.93 of it). E1r's March–April animals absorbed 0.95–0.99 of the ceiling at
  their mass: pregnant 1,354 and 1,228 against 1,426 and 1,243; juvenile females 1,106 and 1,044 against about 1,140
  and 1,080 at 25.6 kg (the mean of seed 48's four juvenile females in the day-210 world). The ceiling's dawn hindgut,
  0.71–0.72 of capacity, is what the day-210 world holds at 06:30 in its six females below −0.39 of their store
  (0.71–0.74).

### 5.1 What sets the ceiling (model arithmetic; it changes which inputs matter)
- The lean-season ceiling is a hindgut ceiling as much as a foregut one. In the daily cycle of a gut-bound animal the
  foregut is ≥ 95% full in 88–90% of the active day, but in 41–47% of the active day it is full because the hindgut is
  full and holds it (energy.ts lets the foregut empty only as fast as its fibre fits in the hindgut). The hindgut is full
  at dusk. E1r's count of eating minutes at a full foregut (76–89%) does not separate the two causes.
- So the ceiling is close to a fibre ceiling. In all four animal-diets the animal swallows 10.3–10.4 g of NDF per kg a
  day, about 0.91 of the most a full hindgut clears: 11.36 g/kg/day = 24 h × 83 mL/kg × (1 − 0.45) × 0.20 g/mL ÷ ((38 −
  3 h) × (1 − 0.449)). Absorbed energy is then about that fibre × the diet's absorbed energy per gram of fibre: drupes
  5.68, figs 4.41, fallback 2.95 kcal per g NDF at today's values. The fallback is penalised twice, by bulk and by fibre.
- Without the hindgut limit the ceiling would be 171–291 kcal/d higher; with ten times the foregut's dry-matter capacity
  (hindgut kept) 83–153 higher. Eating only 60% of the active day (30 min in every 50) costs 8–15 kcal/d, because the gut
  keeps passing between bouts.
- E1s valued a full gut at the foregut's passage rate (dry-matter capacity ÷ `ledgerGutEmptyH`), which the hindgut's
  brake lowers for fibrous food: at the binding hindgut, foods rank by energy per gram of fibre, not per gram of dry
  matter. A note for any successor of E1s, not a re-reading of its result.
- Check against a field number (a target, never an input): uwimbabazi2019's fig days carry 452 g of NDF a day as
  handled (derived), about 13–15 g/kg at 31–35 kg, mostly swallowed since Kanyawara chimpanzees do not wadge
  *F. natalensis* figs (weary2017). That is above what the model's hindgut clears when full (11.36 g/kg/day). Either
  the field intake is high (rate × feeding time, §E.21) or the model's hindgut clears too little; not used.

### 5.2 Each input (§2.1, §2.4): data, verdict, sensitivity
"Δ deficit over the range": the change in absorbed − thermogenesis at the low and high end of the range tested,
smallest to largest over the four animal-diets (juvenile and pregnant female, S39 and S31 diets), kcal/d. "±10%": the
largest change for a ±10% step. Sources and access: research.md "Gut inputs audit".

| input (today, label) | data found | maps onto the model's quantity? | verdict | Δ deficit over the range (low end / high end) | ±10% |
| --- | --- | --- | --- | --- | ---: |
| `digestaGutMlPerKg` 83 mL/kg, assumed | One captive female chimpanzee's whole tract, 3,322 cm³ (stomach 965), from chiversHladik1980 via nakamura2017; her mass, age and the method (filled organ or contents) unknown; the chiversHladik1980 copy is behind HAL's bot check. No other ape volume. | Yes if it is a filled capacity; the per-kg value needs her mass. Isometry within the species is assumed (no ontogenetic data found). | **Unknown.** 83 needs her at 40 kg; 57–76 at captive female masses, 83–111 at 30–40 kg. | 57–111, source-derived: −236 to −398 / +251 to +423 | 110 |
| `digestaForegutShare` 0.45, assumed | Milton 1987 Table 3.2 (read on a secondary web page; chimpanzees and orangutans pooled, unscaled, from chiversHladik1980 and Hladik 1967): stomach 17–20%, small intestine 23–28%, colon 52–54% of gut volume, so stomach + small intestine 0.40–0.48. The captive female's stomach alone: 0.29 (nakamura2017). | Yes (share of gut volume). | **Supported by the secondary table, contradicted by the one measured stomach** (0.29 + 0.23–0.28 = 0.52–0.57). Unknown which holds. | 0.40–0.57: +32 to +50 / −125 to −207 | 62 |
| `digestaForegutDmGPerMl` 0.15 g/mL, assumed | No primate value. Pigs, freeze-dried digesta: stomach 22–27%, ileum 13% (jerezBogota2025); human small-intestinal outflow 11% (highamRead1992); human gastric chyme: none found. | Partly: one density for stomach + small intestine; the sources give segments. Weighted by the stomach and small-intestine shares: 0.15–0.19. | **Supported as plausible** (cross-species bracket). | 0.11–0.19, cross-species: −75 to −161 / +28 to +49 | 21 |
| `ledgerGutEmptyH` 3 h, assumed | Chimpanzees: stomachs empty after > 3 h and < 16 h (barium spheres; ardente2011). Fed macaques, liquids: gastric half-emptying 143.5 min, oro-caecal transit 1.8 h (kondo2003), small intestine 2.2–3.2 h (ikegami2003). Humans, a solid meal: gastric retention 69 / 24 / 1.2% at 1 / 2 / 4 h (tougas2000; mean residence about 1.6 h, derived), small-bowel residence 3.2 h (szarkaCamilleri2012): stomach + small intestine about 4.8 h. Gastric emptying runs at a regulated calorie rate: rhesus about 0.4, humans 2.1 kcal/min (mchughMoran1979, brener1983). | **No counterpart**: no source measures a lumped first-order stomach + small-intestine constant (the stomach empties after a lag at a calorie rate, the small intestine passes as plug flow). What can be checked is the throughput it sets with the capacity, 1.87 g of dry matter per kg per hour: as nutrient energy 1.36 (lean mix) to 1.75 kcal/min (drupes) for a 31.3-kg female, against 1.0–1.2 kcal/min from the rhesus and human calorie rates scaled by mass^0.75 (masses assumed, liquid meals; low confidence): not low. | **Unknown.** 3 h is at the fast end of the human analogue and of ardente2011's bounds. | 1.5 (−50%) to 4.8 h (human analogue): −4 to −10 / −121 to −235. One-sided: shorter changes nothing (the hindgut binds); above about 3.5 h the foregut alone limits (4 / 5 / 6 h: −18 to −77 / −140 to −268 / −221 to −400). At 4.8 h with the foregut's dry matter × 1.6 (today's throughput): +68 to +115. | 3 |
| `digestaHindgutDmGPerMl` 0.20 g/mL, assumed | Wild Kanyawara chimpanzee faeces 26.0 ± 2.3% dry matter in the fig season (few large seeds), 31.7–35.4% with drupe seeds (weary2017; 130 samples, 38 animals). Human stool 27 ± 2% (sender2016). Pig caecum 13–16%, mid-colon 21–23% (jerezBogota2025). | Partly: faeces bound the colon's distal end, and the caecum-to-colon mean lies below it. The model fills this pool with NDF only, while colonic dry matter also holds bacteria and other residue: its fibre capacity is volume × dry matter × the NDF share of colonic dry matter (none found for chimpanzees). | **Supported as plausible for total dry matter; overstated as a fibre capacity** by the NDF share of colonic dry matter (unknown). | 0.13 (pig caecum) to 0.26 (chimpanzee faeces): −234 to −392 / +154 to +248 | 93 |
| `digestaMrtH` 38 h, assumed | Captive chimpanzees: 37.7 h on 34% NDF and 2.0 d on 14% NDF (miltonDemment1988 via harrisonMarshall2011 and milton1999); 31 h on a diet like captive gorillas' (Lambert's 1997 thesis via remis2000); seed passage 31.5 h (lambert2002 via nakamura2017). Retention falls with relative intake across 19 captive primate species (clauss2008); more fibre shortened chimpanzee transit (miltonDemment1988). | Yes (whole-tract retention of an indigestible particle marker; the hindgut's residue constant is MRT − `ledgerGutEmptyH`). | **Supported** (37.7 h on the more fibrous captive diet). Direction for the wild lean-season diet (more fibre, high intake): shorter; no value. | 31.5–48, source: +113 to +184 / −138 to −230 (37.7 h: +5 to +8; 31 h: +122 to +198) | 95 |
| `digestaNdfDigestibility` 0.449, assumed | Chimpanzees 0.543 on a 34% NDF, about 2.5% lignin biscuit (miltonDemment1988 via conklinBrittain2006 and harrisonMarshall2011); captive gorillas 0.449 on a fibrous diet (remisDierenfeld2004 via masi2015); orangutans 0.45–0.745 (schmidt2005); humans about 0.7 in mixed diets (livesey1992). Wild Kibale fibre: lignin ÷ NDF 0.29–0.35 in fruit, 0.09 in pith (uwimbabazi2019). Across primates high intake goes with low fibre digestibility (clauss2008). | Yes (apparent NDF digestibility); one value for every food, though pith fibre holds a quarter to a third of fruit fibre's lignin. | **Supported as within the sourced bracket** (0.449–0.543); 0.543 is an upper value for lignified wild fruit, and pith fibre is probably more digestible than any single value. | 0.449–0.543, source: 0 / +163 to +260 | 113 |
| `digestaFermentKcalPerG` 3.0 kcal/g, assumed | Fermentable fibre gives 11 kJ/g (2.6 kcal) of metabolisable and 8 kJ/g (1.9) of net metabolisable energy (fao2003 Table 3.3). Per gram fermented about 0.3 of the energy leaves as faecal bacteria, 0.06–0.07 as heat of fermentation, a few % as gas (livesey1992): fatty-acid energy absorbed about 2.4–2.6 kcal/g, digestible energy about 2.8–2.9 (derived). No primate measurement. | Yes: the model's yield is what the body absorbs per gram fermented, i.e. metabolisable energy. 3.0 sits at the digestible-energy value, which counts the energy of bacteria lost in faeces as absorbed. | **Contradicted (high), cross-species**: about 2.6 kcal/g. | 2.4–2.9, source-derived: −50 to −79 / −8 to −13 (2.6: −33 to −52) | 39 |
| `digestaTefFrac` 0.10, assumed | Humans: 5–15% of daily expenditure (westerterp2004), 10.5–14.6% of intake (westerterp1999); after a high-fibre meal about 0.84 of a low-fibre meal's (raben1994). No non-human primate value. Expenditure measured as heat includes it (fao2003). | Yes (absorbed energy spent on processing). Counted twice only if the activity multiples hold some (E1b's caveat); the Kleiber resting rate does not. | **Supported (cross-species).** | 0.05–0.15, source: +42 to +71 / −42 to −71 | 12 |
| `ledgerGutCapKcalPerKg` 25 kcal/kg, assumed | No ape or monkey meal capacity. One captive female's stomach 965 cm³ (nakamura2017); a human stomach about 1 L (geliebter2013). | Not used: with `ledgerDigesta` 1 (S39) the capacity is the foregut's dry matter (energy.ts gutCap; checked equal at 12.5 and 50). | **Inert in S39.** | 0 | 0 |
| `digestaFallbackDmGPerMin` 1.89 g/min, [H] | Pith 1.8 and young leaves 2.1 g/min (uwimbabazi2019 Table 1), weighted 17.4 : 6.9 by Kanyawara feeding time (potts2011). Pith's rate is mass handled (§5.3). Ngogo's fallback is leaves (watts2012b, potts2011). | Partly: the model swallows all of it; for pith the measured mass holds the fibre later spat out. | **Measured, but handled, not swallowed** (pith); no corrected value, since the swallowed share is unknown. | 1.8–2.1, source: +16 to +35 / −36 to −75 | 77 |
| `digestaFallbackNdf` 0.534, [H] | Pith 58.1% and young leaves 43.1% of organic matter (uwimbabazi2019 Table 2), weighted by dry matter eaten; Kanyawara pith 50.5% and leaves 41.5% of dry matter (wrangham1991). | Partly: the composition of the peeled pith as handled, wadged fibre included. | **Measured; as swallowed fibre, an upper bound.** | 0.431–0.581, source: +58 to +130 / −25 to −52 | 64 |

### 5.3 Wadging (§2.2)
- **Handled, not swallowed (high confidence for pith).** uwimbabazi2019's pith rate counts the length of pith picked per
  minute, weighed as peeled pith processed as the chimpanzees process it (the only example given is removing spat seeds;
  uwimbabazi2021 adds removing the outer stem); no wadge was weighed or subtracted, and the Discussion says high-fibre
  parts were often discarded as a wadge or passed in faeces. So the 1.8 g/min and the pith's 58.1% NDF include the
  fibre later spat out, and the formula, its 1.6 kcal/g fibre credit and the model swallow all of it. Wrangham et al.
  1991's own pith rates (5–54 g wet/min, from the peel's remains) also measure mass handled.
- **The swallowed share is unknown.** The published discussion of wrangham1991 says so (Milton: much pith may not be
  swallowed; Conklin: the share wadged had not been measured), and no study found weighs wadges.
- **Bounds and direction.** It is above zero: long pith fibre strands are in about 94% of Kanyawara and Ngogo dungs
  (wrangham1991). It differs by species: at Budongo *Marantochloa* pith is spat out once its juice is extracted while
  *Acanthus* pith is swallowed (freymann2024); with Raphia pith the juice and some woody particles are swallowed and a
  wadge spat (reynolds2009). Kanyawara chimpanzees do not wadge *F. natalensis* figs (weary2017), so the fig rate is
  close to swallowed; no source describes young leaves wadged at Kanyawara or Ngogo, and leaf fragments are in dung.
- **Effect at the ceiling** (feeding time held; the wadge taken as pure fibre, an upper bound since wadges also hold
  juice): 25 / 50 / 75 / 100% of the pith's fibre spat out raises absorbed − thermogenesis by +38 to +78 / +81 to +175
  / +131 to +296 / +188 to +342 kcal/d (holding energy shares instead: +69 to +154 at 50%). Spitting fibre frees
  hindgut room at little cost in energy (the non-fibre energy per minute is unchanged).
- **A related site mismatch, sourced.** The registry's fallback is Kanyawara's pith-heavy mix, while the field profile
  reads Ngogo's phenology, whose fallback is leaves (watts2012b, potts2011). With young leaves alone (Kanyawara's
  measured leaf values; no Ngogo leaf composition read) the ceiling is +125 to +297 kcal/d; with pith alone −47 to −109.

### 5.4 Sensitivity ranking (§2.3)
- By the sourced range (largest |Δ deficit| over the four animal-diets, kcal/d): 1. `digestaGutMlPerKg` 423; 2.
  `digestaHindgutDmGPerMl` 392; 3. `digestaNdfDigestibility` 260; 4. `ledgerGutEmptyH` 235 (only longer values move
  it); 5. `digestaMrtH` 230; 6. `digestaForegutShare` 207; 7. `digestaForegutDmGPerMl` 161; 8. `digestaFallbackNdf` 130;
  9. `digestaFermentKcalPerG` 79; 10. `digestaFallbackDmGPerMin` 75; 11. `digestaTefFrac` 71; 12.
  `ledgerGutCapKcalPerKg` 0 (inert). Outside §1's list but as large: the wadged share of pith fibre (up to 342) and
  the fallback's kind (leaves, up to 297).
- By elasticity (±10%): NDF digestibility 113, gut volume 110, MRT 95, hindgut dry matter 93, fallback dry-matter rate
  77, fallback NDF 64, foregut share 62, fermentation yield 39, foregut dry matter 21, thermogenesis 12, emptying time 3
  (but see its threshold above 3.5 h), meal capacity 0.
- Against E1r's deficits (−62 to −155 kcal/d): six inputs move each animal-diet's deficit by more than its size within
  their sourced ranges (gut volume, hindgut dry matter, NDF digestibility, MRT, foregut share, and the emptying time,
  downward only), and so do wadging of 75% or more of the pith's fibre and the fallback's kind (leaves). The sourced changes do not point one way: a larger volume, a denser
  hindgut, the chimpanzee digestibility, a shorter retention, wadging and leaves raise the ceiling; the measured stomach
  share, a human-like emptying time, the corrected fermentation yield and a fibre-only hindgut lower it.

### 5.5 Model quantities with no counterpart (§2.4), and what would pin them down
- `ledgerGutEmptyH`: a lumped first-order stomach + small-intestine constant has no measured analogue; it acts only
  with the foregut's capacity, through the throughput they allow (1.87 g of dry matter per kg per hour at capacity).
  Measurable: the gastric emptying rate of a fruit meal at a full stomach in chimpanzees (g or kcal per hour; a
  ¹³C breath test or ultrasound), or the oro-caecal transit of a solid marker.
- `digestaForegutDmGPerMl`: stomach and small-intestine contents' dry matter at necropsy, any ape.
- `digestaHindgutDmGPerMl` as the model uses it (fibre per mL): colonic contents' dry matter × their NDF share; the NDF
  share of fresh wild chimpanzee dung would bound it.
- The compound that sets the lean-season ceiling, the fibre a full hindgut clears (11.36 g NDF/kg/day): the most NDF
  captive chimpanzees sustain on an ad-libitum high-fibre diet, with faecal NDF output. A field estimate (dung per day ×
  faecal NDF ÷ (1 − digestibility)) would be a target, not an input.
- `digestaGutMlPerKg`: chiversHladik1980's own table (the female's mass); a necropsy series with masses would also give
  the within-species scaling the juveniles' gut depends on.
- The swallowed share of pith: weigh the wadges against the pith picked in the same bouts (dry matter and NDF of both).

### 5.6 Proposed corrections (for the integrator to judge and register; none applied)
1. **`digestaFermentKcalPerG` 3.0 → 2.6 kcal/g** ([M], cross-species): the metabolisable energy of fermented fibre
   (fao2003 Table 3.3, 11 kJ/g); livesey1992's terms give 2.4–2.6 kcal absorbed and 2.8–2.9 digestible per gram
   fermented, so 3.0 counts the energy of bacteria lost in faeces as absorbed. At the ceiling: −33 to −52 kcal/d (the
   deficit grows). Its range would become 2.4–2.9.
2. **Notes, not values, for `digestaFallbackDmGPerMin` and `digestaFallbackNdf`**: mass and composition handled
   (uwimbabazi2019, uwimbabazi2021), not swallowed; the swallowed share of pith is unknown (wrangham1991). Any wadged share
   entered now would be a guess.
3. **No other value.** The data support today's value or leave it unknown. Three flags, structural rather than values:
   (a) the hindgut pool holds NDF only but is sized by total dry matter, so its fibre capacity is overstated by the NDF
   share of colonic dry matter (unknown); (b) passage, digestibility and capacity are fixed, while across primates
   retention shortens with intake (clauss2008), the human colon's content grows with residue (bendezu2017), and one
   digestibility serves foods whose fibre differs three- to fourfold in lignin (uwimbabazi2019); (c) E1r's site flag: the fallback
   mix is Kanyawara's pith-heavy one while the phenology is Ngogo's (leaves); Kanyawara's measured leaf values exist,
   Ngogo's leaf composition was not read.

### 5.7 Not found or not read
- Not found: any ape or monkey stomach (meal) capacity; the dry matter of ape or monkey gut contents other than faeces;
  human gastric chyme dry matter; the NDF share of chimpanzee faecal or colonic dry matter; gastric emptying of digesta
  in chimpanzees (only capsules); a wadge mass or swallowed share of pith or fibrous fruit in any ape; a wild ape's fibre
  digestibility; diet-induced thermogenesis in any non-human primate; within-species scaling of a simple gut's capacity.
- Not read: chiversHladik1980 (HAL only; the captive female's mass and the volume method stay unknown);
  miltonDemment1988's full text (its dry-matter intake, body masses, low-fibre digestibilities); Lambert's 1997 thesis,
  Lambert 1998, lambert2002, Caton et al. 1999 and remisDierenfeld2004 full texts (Springer challenge or closed); the two
  Kibale 1998 dietary-response papers (closed); potts2011 this time (CAPTCHA; earlier readings stand); Milton 1987 itself
  (its table read only on a secondary web page).

### 5.8 Against the prediction (§4)
- "Most gut inputs stay unknown at the level the model needs (no chimpanzee data for foregut volume or emptying)":
  holds. Chimpanzee data exist for retention, fibre digestibility (on a captive diet), one whole-tract volume of unknown
  mass and faecal dry matter; none for foregut volume, foregut dry matter, emptying or fermentation yield.
- "The fallback's dry-matter rate turns out to be handled rather than swallowed mass for pith": holds (§5.3); the
  swallowed share is unknown.
- "The foregut emptying time and capacity move the lean-season deficit most": does not hold as stated. The whole-gut
  volume, the hindgut's dry matter, the fibre digestibility and the retention time move it most; the emptying time does
  not move it at or below 3 h (±10%: ≤ 3 kcal/d) and lowers it only when longer; the foregut's dry-matter capacity moves
  it −161 to +49 over its sourced range. The cap is mostly the hindgut's fibre clearance (§5.1).

## 6. Addendum: online search (agent `e1u-gut-audit`, 5 October 2026; requested by the user through the integrator after §5)

The user cannot reach chiversHladik1980 or miltonDemment1988 (paywalled) and asked for their numbers, and the other gaps
of §5.7, from legitimate open sources only: PubMed and PMC through the NCBI APIs, the Europe PMC REST API, institutional
repositories, author and project pages, publisher free-access pages, Google Books previews, open theses. No Unpaywall, no
piracy sites; a host that showed a challenge was dropped at once (this pass: CORE, the NCBI Bookshelf web pages, the
Biodiversity Heritage Library and several publisher pages). Four search agents ran in parallel; an API rate limit
stopped all four before they reported, so the agent read their saved texts and re-read every value below. Sources:
`docs/research.md`, "Gut inputs audit, addendum: online search". "Second-hand" marks a number read only in a secondary
source.

### 6.1 Found
1. **Gut volume per kg.** The chiversHladik1980 female's mass was not found (no open copy of it or of Chivers & Hladik
   1984, Martin et al. 1985, MacLarnon et al. 1986). A new bound only: captive adult female chimpanzees weigh 42.7–55.0
   kg (nrc2003 Table 9-1, second-hand: four entries from two centres), so if she was a typical captive adult her 3,322 cm³ is 60–78 mL/kg
   (derived), below 83, which needs 40 kg. The range 57–111 stands; the captive-adult reading favours its lower part.
2. **miltonDemment1988**, second-hand from nrc2003 (Tables 3-4 and 9-1) and from Milton's own text (milton1999ea):
   - subjects: 6 captive females, 47.0 ± 4.9 kg;
   - high-fibre diet 34.5% NDF, 10.0% ADF, 2.8% lignin: 54.3% of NDF and 32.9% of ADF digested; low-fibre diet 15.3% NDF,
     5.2% ADF, 1.1% lignin: 70.6% and 57.2%. Derived (lignin taken as undigested): hemicellulose 63% and 78%, cellulose
     46% and 72%;
   - mean transit, the average time marker particles take to pass: 38 h on the high-fibre and 48 h on the low-fibre diet;
   - not found: dry-matter intake, dry-matter digestibility, liquid-marker and hindgut turnover times.
   - Related fibre digestion, second-hand: wild howlers 23% of NDF on wild fruit of 40.6% NDF and 11.4% lignin (about
     Kibale fruit's lignin) and 41% on wild leaves (miltonEtAl1980 via nrc2003); captive macaques 48.3% at 37.5% NDF and
     78.0% at 18.0% (nrc2003); gorillas 57.5% and orangutans 59.4% on high-fibre captive diets (harrisonMarshall2011
     Table III; attribution uncertain).
3. **Wadging.** No weighed wadge, swallowed share or wadge composition anywhere searched (Kibale, Mahale, Gombe including
   Wrangham's 1975 thesis, Budongo, Toro-Semliki, Bulindi, Taï). Qualitative only: at Bulindi *Phoenix reclinata* and
   sugarcane pith are typically wadged and their fibre usually not ingested (mclennanGanzhorn2017); Toro-Semliki pith
   wadges were measured by length and folds, not mass (mcgrewHunt2011). nguessan2009's wadge method: no open copy.
4. **Emptying, transit, digesta dry matter.** Nothing new for apes: ardente2011's capsule bounds remain the only
   chimpanzee data; no ape gut-content dry matter or faecal NDF share was found.

### 6.2 What changed: one range, the rerun, the verdicts
- Only `digestaNdfDigestibility`'s sourced range changed: from 0.449–0.543 to **0.23–0.543** for fibrous, lignified
  diets (wild howlers on wild fruit, to chimpanzees on the more fibrous captive diet); chimpanzees reach 0.706 on a
  low-fibre diet. Rerun (`scripts/e1u-gut-sensitivity.ts`, output `artifacts/validation/e1u/gut-sensitivity-s6.*`):
  at 0.23 the deficit grows by 275–448 kcal/d; at 0.41 (howlers on wild leaves) by 59–96; at 0.706 it shrinks by
  324–540. It now ranks first by range (448), ahead of gut volume (423) and hindgut dry matter (392); the rest of
  §5.4's ranking is unchanged.
- Verdicts restated:
  - `digestaNdfDigestibility` 0.449: **unknown for the lean-season diet.** The chimpanzee values (0.543–0.706) come from
    low-lignin captive diets; the only wild-diet values, from another simple-gut primate, are 0.23–0.41. 0.449 lies
    inside the sourced span; no correction is proposed. A value per food (pith fibre carries a quarter to a third of
    fruit fibre's lignin) would matter more than any single number.
  - `digestaMrtH` 38 h: **supported**, now in Milton's own words (particle mean time on the 34% NDF diet).
  - `digestaGutMlPerKg` 83: **unknown** (the mass is still missing); typical captive adult masses give 60–78 mL/kg.
  - `digestaFallbackDmGPerMin`, `digestaFallbackNdf`: unchanged (mass handled; swallowed share unknown).
  - The other inputs: as §5.2.
- Proposals unchanged: `digestaFermentKcalPerG` 3.0 → 2.6 (§5.6). None applied.

### 6.3 Still missing
- chiversHladik1980's specimen table (the 3,322-cm³ female's mass and her segment volumes) and the other Chivers,
  Hladik, Martin and MacLarnon gut-allometry papers.
- miltonDemment1988's dry-matter intake per kg, dry-matter digestibility, liquid-marker and hindgut turnover times.
- Any weighed wadge, swallowed share or wadge composition (nguessan2009 not reached).
- Ape gastric emptying of digesta, small-intestine transit, gut-content dry matter and faecal NDF share.
