# E1n pre-registration: weaning as a decision

Registered 2 October 2026 (first commit 10:31), before any run of changed code. Track E, stage E1n, branch
`e1n-weaning` (from `track-e` 8b53de0). Any new switch is 0 by default in both profiles and is read only with
`energyLedger` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No weight or input is tuned to hit a weaning age,
a nursing rate, an eating share or a mother's reserve trend; a miss is a finding.

**Seen before this registration (disclosed).** The integrator's S3 confirm energy log
(`bench-run/artifacts/validation/e/s3/S3-energy.log`, 5 seeds × 60 days, d066cdc), as E1m quoted it: infants of 1–4 y
drink 307–308 kcal/day (day 167–169, night 139–140), eat 6.6–16.0% of daylight, are in the nurse act 10.0–10.5% of
daylight (1.35–1.62 bouts per daylight hour, 3.9–4.4 min each); mothers' balance −42, −99, −147, −150 kcal/day at
infants of 0.5–1, 1–2, 2–3, 3–4 y. No run of this stage had been made.

## 1. Step 0: audit of the field's infant feeding and nursing by age (targets, never inputs)

Sources opened for this stage: badescu2022, bray2018, lonsdorf2014 and badescu2016 in full (NCBI BioC, 2 October 2026);
the others through the entries already in docs/research.md (§2, E.12–E.14), as marked.

### 1.1 Feeding and nursing by infant age

| Source (site) | Sample | Method (quoted where it defines a readout) | By infant age | Read |
| --- | --- | --- | --- | --- |
| badescu2022 (Ngogo) | 72 immatures 0–9 y (offspring of 56 mothers; none had a younger sibling), 100 individual-by-age cells, 1,245.2 focal h (12.4 h per subject, 8 ± 4 days per subject and age class); 2013–2014 and 2018 | 1-h continuous focal samples, 07:00–17:30, mornings and afternoons balanced. "observers continuously recorded the frequency and duration focal subjects spent nursing (i.e., making nipple contact) and foraging (i.e., ingesting non-milk or solid foods)"; "Focal subjects were foraging when they independently looked for, picked, bit, chewed and ingested food that they acquired themselves"; "Nursing and foraging behaviors were considered distinct bouts when separated by at least 1 minute"; time on the ventrum with the face not visible excluded | Nursing: 5.85 ± 3.4% of time, 1.63 ± 0.51 bouts/h, 2.03 ± 0.73 min at 0–0.5 y; "After > 6 months and until ≤ 4 years old ... around 3 (± 0.51) % and 1.00 (± 0.44) bout per hour", ~2.0 min; within 0.5–5 y no change with age (GEE P = 0.64 time, 0.25 rate, 0.95 duration); decreasing after 4 y, to 7 y in some. Foraging: 0.84 ± 1.81% (0–0.5 y), 17.18 ± 15.97% (0.5–1), 24.85 ± 8.13% (1–2), 46.7 ± 6.0% (4–5); adults ~47%; bout rate 1.99 ± 0.61/h from 1 y on (no age change), bout length 5.87 (0.5–1) → 8.02 (1–2) → 22.18 min (> 6 y). Infants of primiparous mothers foraged more. No rejection data. The authors: "infants were effectively leading their own gradual physiological weaning process" | FT |
| bray2018 (Kanyawara) | 26 immatures, 31 adults; 1,654 focal follows ≥ 4 h, 14,539 h (2010–2013); suckling recorded consistently from June 2011 | Focal follows; first solid food = "the first day that an individual swallowed solid food"; weaning = "the last day on which a subject was observed to suckle; individuals were only included if they were observed to not suckle during a focal follow in the subsequent 90 days". Ingestion rates: 1992–1993 targeted samples, "the number of food items ingested within a given time interval (max duration =60 s)", ≥ 30 s, 321 records on five ripe fruits, all infants in one bin | First solid food 7.9 ± 0.7 months (5.1–11.1, n = 9); weaning 4.8 ± 0.7 y (4.1–6.0, n = 8); suckling share "increased with age before falling once individuals began to wean" (Fig. 1 only); feeding time reaches adult levels at 4–6 y; ingestion rate: infants below adults (β = −4.72 items/min, SE 1.15), juveniles not significantly (−1.72, SE 0.79), adolescents ≈ adults. Absolute rates only in Fig. 5: **no infant ÷ adult ratio can be taken from the text** (not verified). No rejection data | FT |
| lonsdorf2014 (Gombe) | 40 infants (25 M, 15 F), 1988–2011 | 1-min point samples on mother–infant follows; "Suckling – Infant's mouth is in contact with the nipple"; % of observation time per 6-month block | Suckling 2–3.71%, no change with age (0–5 y) or sex. Eating solid food: 0.23 / 5.33 / 6.67 / 21.95 / 21.64 / 29.74 / 32.45 / 36.14 / 34.43 / 49.09% for blocks from 0, 0.5, … 4.5 y (research.md E.14.4) | FT |
| lonsdorf2020 (Gombe) | 65 offspring of 29 mothers, 37 with a known weaned age | 1-min point samples; weaned age = midpoint between the last nipple contact and the next session without it (gaps < 90 days) | 4.71 ± 1.04 y (2.82–8.01); females 88.5 days earlier; lower-ranking mothers wean later; Table 1: 4–5 y (Mahale), 4.1–6 (Kanyawara), 4–7 (Ngogo) | research.md E.14.4 (FT read by E1f) |
| badescu2017 (Ngogo) | 560 faecal samples, 48 infants with mothers and siblings | faecal δ15N and δ13C, infant minus mother | ≤ 1 y: +2.0‰ δ15N; isotopic weaning by about 4.5 y, before nipple contact ends; decline from about 1–1.5 y (secondary, in lonsdorf2020 and badescu2016) | Abs + secondary |
| badescu2016 (Ngogo) | 42 mother–infant pairs, 831 focal h | focal follows; faecal δ15N | 1.1 ± 0.48 bouts/h (0.15–2.52); "the faeces of exclusively suckling primate infants exhibit δ15N values that are 2–3‰ ... higher than the faeces of their mothers"; more handling by others → less nursing | FT |
| badescu2023 (Ngogo) | 164 hairs (29 infants) | hair δ15N, infant − mother | 1.1‰ (0–1 y), 2.1‰ (1–2 y, maximum), 0.4‰ (2–2.5), 1.2‰ (2.5–3.5); some males not weaned until nearly 8 y | research.md E.14.3 (FT) |
| matsumoto2017 (Mahale) | 19 infants 1–60 months, 518 h | focal | milk dependence fell at about 3 y, before nipple contact ceased (~48 months) | research.md E.12 (Abs) |
| emeryThompson2012 (Kanyawara) | 17 mothers | urinary C-peptide, longitudinal | "depressed for six months postpartum, thereafter showing a net increase through the second year"; "Cycling resumed only after a sustained period of energy gain" | research.md (Abs) |
| emeryThompson2016 (Kanyawara) | mothers and offspring | maternal C-peptide in lactation; juvenile urinary creatinine | low maternal energy balance during lactation predicted larger juveniles; "offspring growth suffers when mothers wean early" | research.md E.12 (Abs) |

### 1.2 Maternal rejection by infant age

**No source measures maternal refusal of the nipple as a rate by infant age** (research.md E.14.4, confirmed for this
stage in the full texts of badescu2022, bray2018, lonsdorf2014 and badescu2016, which report none). Direction only:
rebuffs at 5–6 months and conflict at about 12 and 18 months (vandeRijtPlooij1987, Abs, six pairs to 30 months);
rejections from 2–3 y before suckling ceased, stronger when mothers resumed oestrus at infant ages of about 3–4 y
(clark1977 via maestripieri2002, six Gombe pairs, secondary); at Ngogo rejections "varied widely between pairs, were
rarely seen with older offspring" and many came early (badescuThesis2017, unpublished, no rates). So `weanRefuseMaxP`
(0.8), `weanRefuseAgeY` (3.2 y) and `weanRefuseRampY` (1.8 y) have no rate behind them (registry: "rates L"); no
refusal target exists, only the direction (conflict at transitions; at the resumption of cycling).

### 1.3 The targets this stage reads (staged rows; none is scored by e-bench)

| Row | What | Band | Status |
| --- | --- | --- | --- |
| T-INF-1 | eating share of daytime by infant age | rises with age; within ×1.5 of Gombe's block values from 1 y (e.g. 15–33% at 1.5–2 y, 33–74% at 4.5–5 y) | staged, held-out, not encoded |
| T-INF-2 | suckling (nipple contact) share of daytime | 1–6%, no trend from 6 months | staged, held-out; comfort suckling included, so a nutritive-only model should meet or undershoot |
| T-INF-3 | weaned age | 3.7–5.8 y (4.71 ± 1.04) | staged, **encoded** while `weanAgeMinY`/`weanAgeSpanY` set each offspring's weaning age; beside it the indicative nutritional weaning age (the milk share of intake, 1–4 y, fitted by a line, reaching zero; an output) |
| T-INF-4 | mass for age | 5-y mass 7–13 kg; in 60 days only velocities (Gombe-derived ~1.6 kg/y at 0–5 y, low confidence) | staged |
| T-INF-5 | nursing bouts per hour; bout length | 0.5–2.0 /h; 1–4 min beside it | staged |
| T-ENE-5 | mothers' energy balance by infant age | direction: months 0–6 below the mother's later level, net gain through year 2; comparison band (E1k): mothers of infants 0.5–2 y ≥ −0.05% of the store a day (sign only) | staged, encoded while the C8c taper is on (off on the ledger) |
| milk share (direction) | milk ÷ intake by age | falls from about 1–1.5 y to ~0 at 4–4.5 y (isotopes) | direction only |

**Targets named for this stage (never inputs):** T-INF-1, T-INF-2, T-INF-5, the indicative weaning age beside T-INF-3,
T-ENE-5's direction by infant age, and the isotope direction of the milk share. The scored e-bench rows (fitted,
held-out) are read only for side effects.

## 2. Step 1: diagnosis (registered before it was run)

### 2.1 Readouts (sim truth; defined from the sources' Methods; smoke-tested on 2 days before any arm)

By infant age bin (0.5–1, 1–2, 2–3, 3–4 y; unweaned infants with their mother alive), from `scripts/energy-diagnose.ts`
extended for this stage (one simulation per arm):
1. **Milk drunk** (kcal/infant-day, day and night) and **own food** (kcal/infant-day); existing.
2. **Nurse-act starts and their outcome**: starts of the nurse act by day and by night; accepted (milk flowed), refused
   by the roll (`weanRefuseMaxP`, execution.ts:783), refused or ended by the mother (the new switch, if any); per
   infant-day. Observation hook in execution.ts (no state, no RNG).
3. **The infant's choice** at each of its decisions in daylight while the nurse option is offered: the nurse score,
   the best own-food score (feed at a tree, forage, a travel to a tree, beg), the winner by the rules' order, the
   chosen act, its hunger, foregut fill (dry matter ÷ capacity) and the mother's gland store (kcal).
4. **Eating minutes** per infant-day and **own-food kcal per eating minute** (existing; against badescu2022's foraging
   share × daylight and lonsdorf2014's eating share; bray2018 gives only the direction of ingestion rate).
5. **The mother's state at the start of each accepted bout**: reserves ÷ store, hunger readout, foregut fill, her act.
6. Existing: nurse act % of daylight (T-INF-2's reading: daylight ticks in the nurse act, the milk-ejection wait
   included), bouts per daylight hour and mean length (T-INF-5's: "distinct bouts when separated by at least 1
   minute"; the model's act starts), daytime eating % (T-INF-1's: daylight ticks eating solid food), the milk share and
   its straight-line weaning age, mothers' balance by infant age (T-ENE-5's reading), infants' growth kg/y.
7. **Gland state**: share of the infant-days' ticks in which the mother's store is full (synthesis stopped).

### 2.2 Runs

S3 (e-stack2-confirm.md) and T (R + `ledgerFoodEnergyFix`), field profile, rules policy, quick mode (seeds 48 and 7,
30-day burn-in + 30 days), from a frozen detached checkout of the committed head that adds the readouts.

### 2.3 Predictions (before the run)

- D1: the roll refuses no bout before 3.2 y; at 3–4 y at most ~10% of day starts; milk drunk at 3–4 y is still ≥ 300
  kcal/day, because the store refills and the infant retries, and night suckling has no refusal (moderate confidence).
- D2: when the nurse option is offered with milk in the gland, it is the rules' winner in most daylight decisions,
  by a median margin over the best own-food option above 0.2 (moderate).
- D3: night milk is ~45% of the total at 1–4 y; the store is full in under 10% of ticks at 1–4 y (high).
- D4: eating minutes 0.3–0.6 of the field's; 3–4 kcal per eating minute (high; E1m).
- D5: mothers start accepted bouts below their set point (reserves ÷ store < 0), hungrier than other adult females
  (moderate).
- Expected "term": the infant's nurse score, (0.25 + 1.5·h·(1 − age/7)) × the bout's worth (candidates.ts:267), which
  carries no cost to the mother and is high at any hunger, plus unconditional night suckling (hunger ≥ 0.08) from a
  store that holds a full day's yield: an infant that drains the store once a day drinks the whole yield; the only
  maternal term is the roll (low to moderate; the diagnosis decides).

## 3. Step 2: mechanism (filled in and committed after the diagnosis, before any run of changed code)

Reserved.

## 4. Benchmark and judging (from the brief; e-noise.md amendment 2)

Base S3 at this branch's committed head (and T if useful), quick mode, run once plus three re-draws (add
`rgTemperature` 0.1641, 0.1639, 0.16405), each with `e-bench --quick` and `energy-diagnose` (reserves by class and
infant age, milk drunk by infant age, infants' growth and the indicative weaning age). Each arm is judged against the
base's mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)), n = 4; quick per-run SD fitted 0.69, held-out 1.26, held-out
without T-HUN-4 and T-BRD-1 0.48, or the base's own spread if larger; energy readouts against the base's own spread.
Only the `--compare` figure "on N rows scored in both" is judged, with and without T-HUN-4 and T-BRD-1; |z| ≤ 2 is
"inside noise". Viability: no starvation death (infants included); every class against the 0.05%/day line; mothers'
direction by infant age against the staged T-ENE-5. Prescriptions: the count must fall by the rule removed.
At most 3 iterations, each logged here and committed before its run. Every number in a table generated from the JSON
by a script.

## 5. Known defects (fix before measuring, or deferred with file:line)

Reserved (filled in after the diagnosis).
