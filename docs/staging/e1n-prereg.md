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

### 2.4 Step 1 result (b4ebd40; generated by `diag_table.py` from `diag-S3.json` and `diag-T.json`, stage scratch)

Quick mode, seeds 48 and 7, 30 + 30 days, sim truth; per infant-day; "decisions" are the infant's daylight decisions
in which the nurse option is offered; margin = nurse score − its best own-food score.

| base | age | milk day / night kcal | day starts (refused by roll, % of attempts) | night bouts | eating min | own kcal per eating min | nurse chosen % / own food chosen % of decisions | margin p25 / median / p75 | infant hunger, foregut fill | gland kcal at decisions (dry %) | store full % of ticks | mother at accepted starts: reserves ÷ store, hunger, foregut, feeding % | mothers' balance kcal/d |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S3 | 0.5–1 y | 221 / 62 | 11.1 (0.00, 0.0%) | 97.2 | 0 | — | 12.0 / 0.0 | — / — / — | 0.16, 0.27 | 260 (0.0) | 7.9 | -0.052, 0.31, 0.84, 43.0 | -24 |
| S3 | 1–2 y | 166 / 141 | 19.0 (0.00, 0.0%) | 1.1 | 60 | 2.99 | 21.3 / 6.4 | -0.03 / 0.18 / 0.32 | 0.29, 0.44 | 7 (22.1) | 0.0 | -0.103, 0.46, 0.75, 48.2 | -39 |
| S3 | 2–3 y | 167 / 140 | 18.8 (0.00, 0.0%) | 1.4 | 103 | 3.09 | 22.6 / 6.3 | -0.03 / 0.17 / 0.30 | 0.29, 0.48 | 8 (21.1) | 0.0 | -0.130, 0.55, 0.69, 36.2 | -81 |
| S3 | 3–4 y | 166 / 141 | 16.8 (1.68, 9.0%) | 1.4 | 125 | 3.99 | 20.6 / 8.3 | -0.05 / 0.15 / 0.28 | 0.32, 0.52 | 10 (19.2) | 0.0 | -0.145, 0.55, 0.70, 32.7 | -109 |
| T | 0.5–1 y | 201 / 84 | 11.4 (0.00, 0.0%) | 133.9 | 0 | — | 12.2 / 0.0 | — / — / — | 0.17, 0.26 | 264 (0.0) | 6.4 | -0.320, 0.29, 0.84, 38.2 | -282 |
| T | 1–2 y | 160 / 147 | 19.1 (0.00, 0.0%) | 1.0 | 67 | 2.65 | 20.9 / 5.5 | -0.06 / 0.16 / 0.33 | 0.31, 0.44 | 6 (25.5) | 0.0 | -0.368, 0.37, 0.78, 38.2 | -313 |
| T | 2–3 y | 160 / 147 | 20.9 (0.00, 0.0%) | 1.0 | 104 | 3.05 | 23.8 / 6.5 | -0.07 / 0.14 / 0.29 | 0.30, 0.49 | 5 (27.7) | 0.0 | -0.411, 0.45, 0.72, 25.6 | -332 |
| T | 3–4 y | 159 / 148 | 17.9 (1.79, 9.1%) | 1.1 | 128 | 3.88 | 21.1 / 7.8 | -0.08 / 0.12 / 0.27 | 0.33, 0.51 | 7 (24.7) | 0.0 | -0.411, 0.47, 0.71, 25.4 | -350 |

(Night bouts at 0.5–1 y count every night tick with milk after one without: a young infant's hunger crosses the 0.08
end-of-bout readout tick by tick, so the count is flicker, not bouts. From 1 y one night bout drains the store.)

Predictions against the result: D1 holds (no roll refusal before 3.2 y; 9.0–9.1% of attempts at 3–4 y; milk 307 at
3–4 y in both bases). D2 partly: the nurse option wins its contest with own food by a median 0.12–0.18, but it is the
chosen act in only 21–24% of the decisions where it is offered (most decisions go to other acts: follow, rest,
groom). D3 holds (night 46–48% of the milk; the store is never full at 1–4 y). D4 holds (60–128 eating min; 2.65–3.99
kcal per eating minute). D5 holds in direction (mothers start bouts at −0.10 to −0.15 of the store on S3, −0.37 to
−0.41 on T; hunger 0.37–0.55, against 0.31–0.35 for other adult females' daylight hunger on S3).

**The term that keeps older infants on the full cap: nobody but the infant decides when milk leaves the gland, and the
infant takes it whenever the gland holds any.** The store is never full at 1–4 y (0% of ticks), so synthesis never
stops and the milk drunk equals the mother's ceiling (307 kcal/day): the gland holds 5–10 kcal at the infant's
decisions (under an hour of synthesis); about 17–21 day bouts take the day's synthesis (159–167 kcal) and one night
bout takes everything made overnight (140–148 kcal), with no maternal term at night by construction. The only maternal
term, the roll (`weanRefuseMaxP`, from 3.2 y), refuses 9% of attempts at 3–4 y and changes nothing: refused milk stays
in a store that holds a full day of synthesis and is drunk at the next bout or at night. The infant's side behaves as
an infant's interest predicts (parent–offspring conflict): milk is worth more to it than its own food at moderate
hunger (0.29–0.33), with the foregut half full. Mothers pay for it from reserves already below their set point
(−0.10 to −0.15 of the store on S3 when the bouts start).

What the diagnosis does not implicate: the infant's own-food rate per minute (2.65–3.99 kcal against the field's
implied 0.6–1.6, E1m) cannot be checked against bray2018 (no magnitude in its text; §1.1), so no sourced input
correction is available for it; and the gland's capacity (24 h, design; 11 h sourced, kent1999) does not bind while the
infant drains it (E1c arm 3d; here 0% of ticks full).

## 3. Step 2: mechanism, iteration 1 (registered before any run of changed code)

### 3.1 The rule removed and the switch

`weanDecide` (new switch, 0 = today; read only with `energyLedger` 1 and `ledgerDrive` 1). It removes the weaning roll:
`weanRefuseMaxP` (outcome-encoding probability), `weanRefuseAgeY` and `weanRefuseRampY` (design) are not read
(ACTIVE_WHEN; the count must fall from 83 to 82 on S3), and the stylization "no refusal at night" (execution.ts
nestTick, lint-ok) goes with it.

### 3.2 The mechanism (first principles)

Parent–offspring conflict (trivers1974; primate review maestripieri2002): a mother is related equally (r = 1/2) to the
infant she is nursing and to the offspring she has yet to conceive, so selection favours giving milk while its benefit
to the infant is at least its cost to her own future reproduction, the two in the same currency; the infant, related
less to its future siblings, wants more than she gives. In the ledger the common currency already exists: each
animal's **drive** (E1e: what it needs before its next chance to feed, its reserve deficit included, over what it can
eat in its waking time left, inhibited near distension; E1i's reserve weighting when `ledgerSatiationReserve` is 1),
the readout every animal's own feeding choice uses.

- **The milk's worth to the infant, given its own alternatives**: its drive with only its own feeding as capacity
  (`ownDrive`, energy.ts, pure): the same need and satiation terms as its hunger readout, but the intake capacity
  without the milk term that `feedRate` adds for an unweaned animal (its own food at its size and skill). 1 = it cannot
  cover its need by itself in the time left; low = it can, or its gut is full.
- **The cost to the mother**: her own hunger readout (her drive), which carries her reserve deficit.
- **Rule**: the mother lets a bout start, and lets it go on tick by tick, while ownDrive(infant) ≥ her hunger (equal
  weights, from the equal relatedness; no new constant). Day: at the start of the nurse act (in place of the roll, with
  the roll's existing reaction: whimper, distress, the episode) and at every tick of the bout (she ends it quietly).
  Night: at every tick of suckling in her nest (in place of "no refusal at night").
- Milk she withholds stays in the gland; a full store stops synthesis (existing rule: wilde1995, daly1993, kent1999),
  so withheld milk is not made and not paid for. `ledgerMilkStoreH` keeps its value (24 h): in steady state output
  equals removal whatever the store size.
- Ties at the cap (both drives 1, e.g. an infant that cannot feed itself and a mother who cannot meet her own need)
  allow the bout, so an infant with an empty gut and a deficit always reaches the milk (no starvation by the rule).

Inputs: none new (one switch, design). Evidence tags: the decision's form is a design assumption grounded in
trivers1974 (theory) and the field's direction (rejections cluster at transitions and when mothers resume cycling,
clark1977 via maestripieri2002; vandeRijtPlooij1987); no rate is taken from them.

### 3.3 Arm and predictions (iteration 1, before its run)

Arm A1 = S3 + `weanDecide` 1, quick mode, against the base's four runs (§4). Predictions (confidence):
- Prescriptions 83 → 82 (high).
- Milk at 1–4 y below the cap: 120–260 kcal/day (low); at 0.5–1 y within 15% of the base (low to moderate).
- Refusals and endings by the mother many per infant-day at 1–4 y (low); roll refusals 0 (high).
- Own-food eating minutes and the daytime eating share up at 1–4 y (moderate); nurse act % of daylight down (moderate).
- Mothers' balance at 1–4 y less negative than the base's; the direction by infant age may flatten or reverse (low).
- Infants' reserves lower than the base's, growth at most slightly lower (low to moderate); no starvation death
  (moderate to high); the indicative weaning age earlier than the base's (moderate).
- Fitted and held-out sums inside noise (moderate).

Decision (registered): **provisional keep candidate** if viable (no starvation death; no class below the 0.05%/day line
that is not already below it in the base by more than the base's spread), the held-out sums not up (|z| ≤ 2, with and
without T-HUN-4 and T-BRD-1) and the count down by one; otherwise off and the null recorded. Milk, weaning and reserve
readouts are reported against the targets of §1.3, never tuned. A miss with a clear cause may be followed by at most
two more iterations, each written here and committed before its run.

### 3.4 Amendment before the first arm (switch-on smoke test, 2 October 2026; disclosed)

The registered smoke test (seed 48, 1-day burn-in, 2 days, S3 + `weanDecide` 1; readouts only, not an arm) showed a
defect of the decision architecture, fixed before any arm ran:
- **Refusal loop.** A refused infant re-decides at once with the same information and asks again: 555 refusals in an
  infant-day at 1–2 y (each with the roll's reaction: a whimper and +0.1 stress). The roll never showed it because it
  refused rarely.
- **First fix tried in the smoke (rejected before any arm):** remember the mother's drive at the refusal and ask again
  once the own-food drive reaches it. The memory went stale (her drive falls when she eats, the infant does not know):
  infants of 1–3 y stopped asking by day (4 kcal of day milk) and the 1–2 y infant lost 1.6% of its store a day.
- **Fix kept (design, no constant):** a refusal, or a bout the mother ends, holds while her situation is unchanged: the
  infant remembers her decision count (`Chimp.decisionVersion`, `x.wr`, lazily added, `OPTIONAL_X`) and the nurse option
  is offered again once she has started a new act (candidates.ts reads the caretaker's decision count, an observable
  act change, and the infant's own memory; it reads no internal state of the mother). Cleared when a bout is let start.
  Smoke with the fix: 5.5–13.5 refusals and 5–9 ended bouts per infant-day at 1–4 y; no loop.
- Readouts smoke-tested with the switch on: refusals and endings by the mother, the infant's own-food drive and the
  mother's hunger at its decisions (share of decisions in which the rule would let a bout start), the gland state.
- Night bouts with the switch on count tick-level toggling of the mother's decision (flicker), as at 0.5–1 y in the
  base; milk at night is read in kcal, not bouts.
- Prescriptions with the switch: 83 → 82 on S3 (`prescription-ledger --count`).

### 3.5 Iteration 1 result (A1 at 3cccf9b against the base's four runs at b4ebd40; behaviour-identical commits)

The base ran at b4ebd40, the arm at 3cccf9b; with `weanDecide` 0 the two commits give the same S3 world (world hash
after 1 day, seeds 48 and 7: 25d8862168a131a8, f92d6b3cd35852c3 at both). Generated by `judge.py` (stage scratch)
from the e-bench and energy-diagnose JSON:

```
commits: {'base0': 'b4ebd40', 'base1': 'b4ebd40', 'base2': 'b4ebd40', 'base3': 'b4ebd40', 'A1': '3cccf9b'}

## A1: distance sums on rows scored in all five runs (16 fitted, 13 held-out)
| sum | base runs | base mean ± SD | arm | SD used | z |
| --- | --- | --- | --- | --- | --- |
| fitted | 3.35 / 2.85 / 2.69 / 2.96 | 2.96 ± 0.28 | 2.62 | 0.69 | -0.45 |
| heldOut | 4.97 / 5.04 / 4.72 / 4.33 | 4.76 ± 0.32 | 4.43 | 1.26 | -0.24 |
| heldOutNoRare | 4.51 / 5.04 / 4.72 / 4.33 | 4.65 ± 0.31 | 4.31 | 0.48 | -0.64 |
largest row changes vs base mean: T-HUN-2 -0.70, T-COM-11 +0.37, T-RNG-5 -0.33, T-HUN-8 -0.17, T-FOOD-10 +0.15, T-ACT-3 +0.14

## readouts: base mean ± SD (4 runs) vs arms
| readout | base mean ± SD | A1 |
| --- | --- | --- |
| milk 0.5–1 y | 283 ± 1 | 284 |
| eat min 0.5–1 y | 0 ± 0 | 0 |
| refusals 0.5–1 y | 0.00 ± 0.00 | 2.23 |
| ended 0.5–1 y | 0.00 ± 0.00 | 2.38 |
| mother %/d 0.5–1 y | -0.010 ± 0.040 | 0.018 |
| growth 0.5–1 y | 2.80 ± 0.00 | 2.80 |
| milk 1–2 y | 307 ± 0 | 301 |
| eat min 1–2 y | 62 ± 3 | 73 |
| refusals 1–2 y | 0.00 ± 0.00 | 12.44 |
| ended 1–2 y | 0.00 ± 0.00 | 3.21 |
| mother %/d 1–2 y | -0.143 ± 0.040 | -0.093 |
| growth 1–2 y | 3.60 ± 0.00 | 3.60 |
| milk 2–3 y | 307 ± 0 | 290 |
| eat min 2–3 y | 101 ± 3 | 115 |
| refusals 2–3 y | 0.00 ± 0.00 | 17.07 |
| ended 2–3 y | 0.00 ± 0.00 | 3.02 |
| mother %/d 2–3 y | -0.211 ± 0.025 | -0.113 |
| growth 2–3 y | 3.58 ± 0.03 | 3.60 |
| milk 3–4 y | 307 ± 0 | 264 |
| eat min 3–4 y | 126 ± 2 | 144 |
| refusals 3–4 y | 1.65 ± 0.14 | 17.20 |
| ended 3–4 y | 0.00 ± 0.00 | 1.82 |
| mother %/d 3–4 y | -0.234 ± 0.037 | -0.064 |
| growth 3–4 y | 3.62 ± 0.03 | 3.60 |
| wean age (milk share line) | 6.57 ± 0.04 | 5.71 |
| adult male %/d | 0.007 ± 0.008 | 0.034 |
| female, other %/d | -0.019 ± 0.038 | 0.043 |
| female, lactating %/d | -0.138 ± 0.022 | -0.054 |
| juvenile 5–12 y %/d | -0.058 ± 0.028 | -0.007 |
| infant 2–5 y %/d | 0.006 ± 0.003 | -0.015 |
| infant 0.5–2 y %/d | -0.002 ± 0.008 | 0.007 |
| T-ACT-1 male | 0.382 ± 0.004 | 0.369 |
| T-ACT-1 female | 0.390 ± 0.010 | 0.400 |
| T-ACT-3 male | 0.166 ± 0.005 | 0.186 |
| T-ACT-3 female | 0.172 ± 0.008 | 0.201 |
| prescriptions | 83 ± 0 | 82 |
| starvation deaths | 0 ± 0 | 0 |
| deaths | 2 ± 4 | 0 |
| energy deaths | 2 ± 4 | 0 |
| energy starvation | 0 ± 0 | 0 |
```

Reading (registered rule, §3.3): viable (no death; every class above −0.05%/day except lactating females, −0.054,
which were −0.138 ± 0.022 in the base), sums inside noise (fitted z −0.45, held-out −0.24, without the rare rows
−0.64), prescriptions 83 → 82: **a provisional keep candidate by the registered rule.** Milk falls with infant age
(301, 290, 264 kcal/day at 1–2, 2–3, 3–4 y; base 307 ± 0), eating minutes rise beyond the base's spread (+11, +14,
+18), mothers' balance improves most at older infants (3–4 y: −0.064 against −0.234 ± 0.037 %/day; the base's
worsening with infant age is gone), the indicative weaning age falls 6.57 ± 0.04 → 5.71 y, infants of 2–5 y lose
0.015%/day (base +0.006 ± 0.003). Side effects: females' grooming share 0.172 ± 0.008 → 0.201 (T-ACT-3's band ends at
0.18).

**But the volume effect rests on an artefact of the currency at night** (`A1-energy.log`): night milk falls from
140–141 to 2–6 kcal/day at every age and day milk rises to 258–295, in bouts of about 10 min (base 4; T-INF-5's 1–4
min) and 14.7–17.0% of daylight in the nurse act (base about 10%; T-INF-2's band 1–6%). At night both drives saturate
(no waking time left: φ = 1 for mother and infant), so the comparison reads only their gut fill: the mother's gut
empties overnight, the suckling infant's does not, and she refuses; her sleep is not consulted. The milk withheld at
night stays in the 24-h store and is drunk by day; volume falls only where the store fills (14.2% of ticks at 3–4 y).
By day the mother's drive is also saturated (her deficit exceeds a day of intake, E1i), so her hunger there is her
satiation term: she refuses when her gut is empty, not because of her reserves.

### 3.6 Iteration 2 (registered before its run)

Cause addressed: the mother "decided" while asleep. In the model a sleeping animal makes no decisions (E2d,
circadian.ts: asleep, the nest bout is held and no decision point is raised). **Change:** the mother's decision applies
only while she is awake: by day, and at night only when she is awake in her nest (`rhythmCircadian` 1: the sleep latch
`x.asl` is not 1; without it an animal in a finished nest is asleep, as life.ts books it). While she sleeps, night
suckling runs as today (milk from the gland while the infant is hungry). No new constant; the switch still removes the
roll (82 prescriptions).

Arm A2 = S3 + `weanDecide` 1 (iteration 2 code), quick mode, against the same four base runs. Predictions:
night milk returns (≥ 100 kcal/day at 1–4 y; moderate); total milk at 1–4 y within 5% of the cap (moderate): with
night access free, withheld day milk is drunk at night from the 24-h store; day nurse act share below A1's and
near or below the base's (low to moderate); eating minutes between the base's and A1's (low); mothers' balance
closer to the base's than A1's (moderate); sums inside noise (moderate). Same decision rule as §3.3. If A2 is a null
for the volume, the finding is that the cap is held by free night access to a store that holds a day of synthesis,
not by the absence of a maternal decision alone.

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
