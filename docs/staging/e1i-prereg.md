# E1i pre-registration: why nursing mothers stop eating with room in the gut

Registered 2 October 2026, before any run of changed code. Track E, stage E1i, branch `e1i-intake` (from `track-e` 2f9129f). Any new switch is 0 by default in both profiles and is read only with `energyLedger` 1, so the compressed goldens and the field pin in `tests/sim-track-e.test.ts` cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. A parameter may carry a field value only when it is physiology or physics measured independently of the behaviour it helps produce. No weight is tuned to hit a feeding time or an intake; a miss is a finding. `digestaGutMlPerKg` does not move in this stage (the user's decision).

## 0. The problem (E1h 5-seed confirm, simulation truth; e1h-prereg.md §9)

Reference arm **T** = R + `ledgerFoodEnergyFix` 1 (R: handoff §3). At E1b's central gut (83 mL/kg):
- nursing mothers absorb 1,275 kcal/day and spend 1,665; reserves fall 0.92% of the store a day; 4 starved in 60 days over 5 seeds; juveniles −0.14%/day;
- in daylight their foregut is at least 95% full in only 7.4% of ticks (`foreFullDay`);
- they eat 222 min/day against 238–248 for the other adult classes, although their daylight hunger is 0.46 against 0.30–0.37; mothers of infants ≥ 2 y eat least (206 min at hunger 0.50); condition 0.33.

So the mothers are not limited by a full gut in any simple sense: they stop eating with room in the gut while their reserves fall. **Question: which term ends or prevents their feeding?** The registered E1h "gut binds" test read the 24-hour mean fill (overnight emptying included); it is not used here.

## 1. Field rows this stage is scored on: samples (sources opened)

| Row | Value, band | Sample (sex, reproductive state, mass, method) | Source, access |
| --- | --- | --- | --- |
| T-ENE-2 (staged, fitted) lactating feeding minutes | 308.7 ± 85 min/day; band 250–370 | Kanyawara, 14 multiparous habituated females, "nursing mothers" (Discussion); never weighed (31.3–35.2 kg bound it: Gombe and Mahale females); continuous focal follows, only the 141 follows ≥ 10 h analysed; feeding = "reaching for, picking, handling or chewing a food item" plus search gaps < 5 s; a bout continues through non-feeding gaps of ≤ 5 min | uwimbabazi2019 (FT via BioC, read by the field audit §1.1–1.2) |
| T-ENE-3 (staged, held-out) lactating dry matter | 872.6 ± 289 g/day; band 650–1,100 | same 14 nursing mothers; daily intake = Σ minutes on item × the item's mean dry g/min (rates counted "when possible") | uwimbabazi2019 (audit §1.3) |
| T-ENE-1 (staged, held-out, contested) | 2,479 ± 858 kcal/day (field formula); sugar-based comparison band 1,810–2,070 | same sample; formula with TNC by difference (audit §1.4) | uwimbabazi2019, simmen2017 |
| T-ACT-1 (fitted) feeding share of daytime | band 0.33–0.50 | Waibira: 10 M, 9 F (7 lactating), continuous focal, follows 4.1 ± 2.6 h; Kanyawara nursing females 309 min | villioth2025 (FT), uwimbabazi2019 |
| T-ACT-3 (fitted) grooming share | band 0.08–0.18 (M 0.15, F 0.12) | Waibira, 19 adults, continuous focal | villioth2025 (FT) |
| Context, not a scored row | Kanyawara 2006: pregnant or lactating females feed about 44% of observation time, cycling females 47%, males 44%; Ngogo 62%, 52%, 43% (Fig 3, digitised ± 2 points) | continuous focal, bouts ≥ 1 min | potts2011 (author copy; research.md §E.21) |

The field's lactating females feed at least as much as other adults (Kanyawara) or much more (Ngogo). The model's feed less: the direction is wrong, not only the size.

## 2. Step 1: diagnosis before any mechanism (readouts defined here, smoke-tested on 2 days before use)

Tool: `scripts/intake-diagnose.ts` (new; simulation truth, read-only), arm T, seeds 48 and 7, 30-day burn-in + 30 days. A diagnostic tap is added to `src/sim/rg.ts` (`rgTap`, like `energyTap`: never set by the app; it reads the menu, the softmax probabilities and the gate's reason at each rules decision and changes nothing). Daylight = `environment.daylight > 0.1` (energy-diagnose's definition). Classes as in energy-diagnose: lactating females (split by the youngest infant's age, < 2 y and ≥ 2 y), other adult females (neither pregnant nor lactating), pregnant females, adult males (all ≥ 15 y).

Readouts, each defined before any run:
- **D1 daylight time by act.** Share of daylight ticks: *eat* (own food swallowed this tick, milk excluded: energy-diagnose's "eating"); *forage, not eating* (forage act, nothing swallowed: walking to the crown, a full gut, an empty cell); *travel* (travel to food, travel with the party or a caller, home, follow, patrol); *rest* (rest, shelter); *groom*; *play*; *nest*; *other* (display, calls, pant-grunt, beg, share, mate, flee and the rest). Field definition matched: uwimbabazi2019 counts "reaching for, picking, handling or chewing a food item" as feeding, which is closer to the model's forage act (eat + forage, not eating) than to swallowing alone; both are reported.
- **D2 nursing against the mother's act.** For each lactating female, the daylight ticks in which her unweaned infant is in the nurse act (nipple contact; milk-ejection wait included), and the mother's own D1 category in those ticks. Answers "does the nurse act exclude the mother's feeding": in code it does not (the nurse act moves the infant to the mother and leaves her act alone; `execution.ts` case 'nurse'), so the readout checks the code reading.
- **D3 not feeding with appetite and room.** Daylight ticks in which an adult is neither eating nor in the forage act while hunger > 0.4 and foregut fill < 0.8 (dry matter ÷ capacity). For those ticks: the act, and the rules decision that started it (from the tap): the gate's reason for drawing (need-bucket, max-age, period, ended, patch-poor, interrupt; or kept, arrived, argmax, lead), the chosen option's score, the best feeding option on the menu (forage at a tree or on fallback, or a trip to a tree) and its score, the margin (chosen − best feeding), whether any feeding option was on the menu, and the softmax probability the menu gave all feeding options together.
- **D4 feeding bouts.** A bout, as uwimbabazi2019 defines it: continuous feeding on one food source (a tree, or fallback food), not broken by non-feeding of more than 5 min (20 ticks). Per class: bouts per day; mean length (min, eating ticks and joined gaps); spacing (min from a bout's end to the next bout's start, within daylight); foregut fill at the first and last eating tick; and why each bout ended, from the model's own state at its last eating tick and the decision that followed: *gut full* (fill ≥ 0.95), *sated* (forage act finished at hunger < 0.06 with fill < 0.95), *crop gone* (tree crop < 0.02), *re-decided* (a rules decision chose another act: by the gate's reason and the new act), *interrupted*, *dusk/night*.
- **D5 the drive's terms** for lactating against other adult females, daylight means: φ (need ÷ (feed rate × waking time left)), 1 − fill², hunger, need (kcal), waking time left (h).

Smoke test: 2 days with the arm's switches on; each readout printed and checked for being non-empty and summing to 1 where it is a share.

The diagnosis names the binding term with numbers in §5 below before any arm is built. If it points somewhere none of the candidates of §3 covers, the evidence decides.

## 3. Candidate mechanisms (none assumed; built only for terms the diagnosis implicates)

a. **Nursing displaces the mother's own feeding.** Not in code (D2 checks). Field question: do wild chimpanzee mothers feed while infants suckle?
b. **Satiation that yields to a reserve deficit.** E1e's 1 − fill² is a design curve. Mammalian physiology: a deficit raises the distension tolerated and the meal size.
c. **Lactational enlargement of the gut and of intake capacity** ([M] for mammals, [L] for chimpanzees).
d. **Foregut share re-sourced** (§E.25 flags 0.52–0.57 against E1b's 0.45, from two secondary sources): an input only with a better source.

Arms, sources and predictions for the implicated term(s) are registered in §6 before their run.

## 4. Benchmark and judging

- Quick mode: `e-bench --quick` (seeds 48 and 7, 30 + 30 days) plus `energy-diagnose` (same seeds and window) for viability. Reference arm = T at this branch's committed head, run once and reused. Every arm from a frozen detached checkout of a committed head.
- Judged on rows scored in both runs, with and without T-HUN-4 and T-BRD-1. Noise threshold: the integrator's quick-mode values (docs/staging/e-noise.md) when received; until then differences under about 1.5 are treated as noise.
- **Viability:** no starvation death; no adult or juvenile class falling faster than 0.05% of its store a day.
- Prescription count from e-bench (a switch that adds a design curve does not lower it; a switch that removes a named rule must).
- At most 3 iterations, each logged here and committed before its run.

## 4a. Amendment: the noise rule (logged 2 October 2026, on the integrator's instruction; docs/staging/e-noise.md Amendment 2, track-e b71e77a)

Written after the T and B1 quick benches had been read and while B2's bench was queued; it changes how the bench sums are judged, nothing else (viability and the energy readouts stay as registered). Each arm is judged against the **mean of four realizations of the reference**: T-quick plus three re-draws of T with `rgTemperature` 0.1641, 0.1639 and 0.16405 added to its overrides (quick mode, the same frozen checkout as T-quick, cc51622). On rows counted in every run compared: z = (arm − reference mean) ÷ (SD × √(1 + 1/4)), SD = the integrator's per-run SD for quick mode (fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48) or this stage's own reference spread if larger; |z| > 2 is a result, anything less is "inside noise" (in quick mode a change beyond 1.6 fitted, 2.9 held-out, 1.1 held-out without the rare-event rows). T-HUN-4 and T-BRD-1 cannot be judged on a single 30-day run. K3 of each iteration is read with this rule; the provisional 1.5 is replaced.

## 5. Diagnosis results (registered before any arm)

Run: arm T, seeds 48 and 7, 30-day burn-in + 30 days, rules policy, from a frozen checkout of f022f3b (`artifacts/validation/e1i/T-intake.json`, gitignored). Every number below was generated from the JSON by a script (`diag_table.py`, session scratch). Reference energy run (`energy-diagnose`, same seeds and window, frozen checkout of cc51622; switch-off identity is tested): lactating females eat 231 min and 632 g of dry matter a day, absorb 1,344 kcal and spend 1,665 (0.807), reserves −0.79% of the store a day; other females −0.055%/day, juveniles −0.079%/day; no starvation death (one infant died of illness).

D1 and D5, daylight (eat = own food swallowed this tick; φ = the drive before satiation, clamped at 1):

| class | eat % | forage act, not eating % | groom % | rest % | travel with party % | play % | nest % | daylight hunger | daylight fill | φ | 1 − fill² | need kcal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 30.6 | 1.2 | 27.4 | 13.1 | 3.7 | 6.7 | 9.0 | 0.44 | 0.71 | 1.00 | 0.44 | 16174 |
| lactating, infant < 2 y | 32.8 | 1.3 | 15.8 | 20.2 | 5.5 | 6.7 | 9.2 | 0.40 | 0.74 | 1.00 | 0.40 | 14804 |
| lactating, infant ≥ 2 y | 28.6 | 1.2 | 37.8 | 6.6 | 2.0 | 6.7 | 8.8 | 0.48 | 0.68 | 1.00 | 0.48 | 17414 |
| other adult females | 31.4 | 1.4 | 11.1 | 26.2 | 8.9 | 0.7 | 10.5 | 0.31 | 0.69 | 0.79 | 0.44 | 2579 |
| pregnant females | 33.2 | 1.4 | 9.7 | 25.5 | 11.5 | 0.7 | 9.4 | 0.36 | 0.75 | 0.97 | 0.38 | 4188 |
| adult males | 33.2 | 1.2 | 12.4 | 21.7 | 8.3 | 0.5 | 10.7 | 0.27 | 0.64 | 0.59 | 0.52 | 1110 |

D3 (daylight; "appetite and room" = hunger > 0.4 and foregut fill < 0.8) and the decisions:

| class | not feeding with appetite and room, % of daylight | of which grooming % | draws with appetite and room: P(feeding) | chose feeding % | best feeding score | best other score | interrupts per daylight h | of which "groomed by" % | from own unweaned infant % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 36.7 | 39.1 | 0.347 | 34.7 | 0.448 | 0.685 | 1.41 | 58.4 | 56.4 |
| lactating, infant < 2 y | 29.6 | 19.2 | 0.392 | 39.6 | 0.435 | 0.618 | 0.97 | 25.6 | 11.9 |
| lactating, infant ≥ 2 y | 43.0 | 51.6 | 0.317 | 31.3 | 0.457 | 0.730 | 1.81 | 74.4 | 78.0 |
| other adult females | 22.4 | 13.5 | 0.337 | 34.1 | 0.392 | 0.669 | 0.99 | 26.2 | 0.0 |
| pregnant females | 25.4 | 10.4 | 0.374 | 37.7 | 0.441 | 0.657 | 0.92 | 18.9 | 0.0 |
| adult males | 11.5 | 15.1 | 0.365 | 36.7 | 0.463 | 0.731 | 0.90 | 31.6 | 0.0 |

D4, feeding bouts (one source, gaps ≤ 5 min kept inside; the model's bouts have no inner gaps):

| class | bouts per day | eating min per bout | spacing min | fill at bout start → end | hunger start → end | ends at a need-bucket redraw % | ends at satiation or a full gut % | ends by interrupt % | next act: groom / rest / play / other % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 9.2 | 25.1 | 51 | 0.61 → 0.90 | 0.57 → 0.17 | 60.7 | 0.0 | 21.4 | 21 / 20 / 11 / 27 |
| lactating, infant < 2 y | 10.3 | 23.9 | 43 | 0.66 → 0.92 | 0.51 → 0.15 | 54.4 | 0.0 | 22.0 | 15 / 24 / 10 / 26 |
| lactating, infant ≥ 2 y | 8.1 | 26.4 | 60 | 0.56 → 0.89 | 0.63 → 0.20 | 68.0 | 0.1 | 20.8 | 27 / 15 / 13 / 28 |
| other adult females | 9.6 | 24.5 | 45 | 0.64 → 0.90 | 0.41 → 0.12 | 41.1 | 0.0 | 19.5 | 7 / 28 / 1 / 34 |
| pregnant females | 10.4 | 23.9 | 42 | 0.67 → 0.92 | 0.47 → 0.12 | 51.3 | 0.1 | 17.1 | 10 / 23 / 1 / 35 |
| adult males | 8.9 | 27.8 | 47 | 0.59 → 0.85 | 0.34 → 0.12 | 25.6 | 0.1 | 18.0 | 10 / 21 / 1 / 36 |

D2: the infant is in the nurse act 10.0% of the mother's daylight; the mother eats in 33.1% of those ticks (all daylight: 30.6%) and grooms in 34.4%.

**Reading (the binding term, with numbers).**
1. **Nursing does not displace the mother's feeding** (D2: she eats in 33.1% of nursing ticks against 30.6% of all daylight; the nurse act leaves her act alone). Candidate (a) is not implicated; making nursing exclusive could only lower intake.
2. **The gut wall is not reached.** No bout in any class ends at satiation or a full foregut (0.0–0.1%). Mothers' bouts start at fill 0.61 and end at 0.90, 61% of them at a need-bucket redraw. Candidates (c) and (d) would act only through the fill readout, as G did, not through a wall.
3. **Binding term: the drive saturates and the satiation term does not yield to the deficit.** E1e's hunger is min(φ, 1) × (1 − fill²). Mothers' φ sits at its ceiling (1.00) through all daylight: their need (16,174 kcal, almost all of it the reserve deficit) is several times what they can eat in the 5.8 h of waking time left (other females φ 0.79 at 2,579 kcal; males 0.59). So a mother's hunger is the satiation term alone, 1 − fill² = 0.44, the same function of fill as a balanced animal's: a reserve 38% below the set point raises her hunger only by the ratio of the φ's (1.00 against 0.79), and her feeding score (1.6 × hunger) by about as much. As a meal fills the foregut her hunger falls through 0.4 at fill 0.775 and the gate redraws. At draws with appetite and room the rules give feeding P = 0.35 (feeding options 0.45, the best other option 0.69), the same as in every other class (0.34–0.37). So every class eats about the same share of daylight (30.6–33.2%) whatever its need.
4. **Secondary, class-specific:** mothers of infants ≥ 2 y are interrupted 1.81 times per daylight hour (74% "began grooming me", 78% from their own unweaned infant) and then groom: 37.8% of their daylight against 11.1% for other females (field adult females 0.12, T-ACT-3). They eat 28.6% against 32.8% for mothers of younger infants. Grooming is scored −0.6 × hunger and feeding +1.6 × hunger, so a hunger readout that sees the deficit acts on this term too; it is not built separately in iteration 1 and is read again after it.

## 6. Arms

### Iteration 1 (registered 2 October 2026, before its run): satiation weighted by the relative store (`ledgerSatiationReserve`)

**Physiology.** Meal size is set where gastrointestinal satiation signals (gastric distension, CCK) are integrated with adiposity signals; leptin amplifies the intake-inhibiting effect of gastric distension and of CCK, and less leptin signalling means weaker satiation and more intake (grill2010, rodent review, [M]; the review supports "Smith's hypothesis - that adipose signals like leptin should be considered indirect controls of meal size that induce their behavioral effect by modulating the neural processing of satiation signals"). In humans, intake rises in proportion to the weight lost, about 100 kcal/day per kg (polidori2016, [M]). Direction [M]; the proportional form below is a design assumption with no free parameter.

**Mechanism** (`src/sim/energy.ts setHunger`, read only with `energyLedger` 1 and `ledgerDrive` 1; 0 = E1e exactly):
hunger = min(φ, 1) × (1 − w × fill²), clamped to 0..1, with w = max(0, 1 + reserves ÷ usable store): the relative store, the quantity the condition readout already uses (cond = ledgerCondSet × w). w = 1 at the set point (E1e's curve), 0.62 for a mother at −38% of her store (her satiation at a given fill is 62% of today's), 0 when the store is gone (only the gut wall stops a meal), above 1 in surplus (stronger satiation). Nothing else changes: φ, the gut, every score weight, the gate. The hunger readout is read by every option (feeding +1.6 × hunger, grooming −0.6 × hunger, play −0.7 × hunger and the rest), so the deficit reaches the whole choice through one readout. Prescription count: unchanged (a design curve gains a physiological input; no rule is switched out).

**Arm B** = T + `{"ledgerSatiationReserve":1}`. Reference: T (quick, frozen checkout of cc51622; same seeds, window and tools). Tools: `energy-diagnose` and `intake-diagnose` (seeds 48, 7; 30 + 30 days), then `e-bench --quick --compare T-quick.json`.

**Predictions (by hand, before the run).** Arithmetic: at w ≈ 0.62 a mother's hunger stays above 0.4 until fill 0.98 (the 0.7 and 0.55 buckets are crossed at fills 0.70 and 0.85), so bouts can run until the foregut is nearly full. The 83 mL/kg foregut (175 g of dry matter at 31.3 kg) empties with a 3-hour constant, so the dry matter it passes in a day is about the daylight mean fill × 175 g ÷ 3 h × 12.6 h plus what it holds at dusk (emptied overnight): at the reference's daylight fill of 0.71 that is about 522 + 140 ≈ 660 g (measured: 632 g); at 0.85, about 625 + 150 ≈ 775 g; at 0.95, about 700 + 165 ≈ 865 g. The mothers' need is about 780 g (632 g × 1,665 ÷ 1,344 kcal). So they balance only if they hold the foregut about 85% full through daylight. Expected: daylight fill rises from 0.71 to 0.78–0.86 (alternatives still win some redraws, especially away from a crown, where feeding gets no continuation bonus), so mothers approach balance without reaching it in a 30-day window (moderate confidence on the direction, low on the size).

| Quantity | T (reference) | Expected B |
| --- | --- | --- |
| Lactating daylight hunger | 0.44 | 0.55–0.70 |
| Lactating P(feeding) at draws with appetite and room | 0.35 | 0.45–0.65 |
| Lactating bout end fill; ends at need-bucket redraws | 0.90; 61% | ≥ 0.93; 25–50% |
| Lactating daylight foregut fill; ≥ 95% full, share of daylight | 0.71; 0.082 | 0.78–0.86; 0.15–0.40 |
| Lactating eating min/day | 231 | 255–310 |
| Lactating dry matter g/day | 632 | 690–790 |
| Lactating absorbed ÷ spent | 0.807 | 0.88–0.99 |
| Lactating reserves, %/day | −0.79 | −0.35 to 0 |
| Mothers of infants ≥ 2 y, grooming share of daylight | 37.8% | 20–32% |
| Other classes (w 0.91–1.0): eating minutes | 236–250 | +0 to +8% |
| Juveniles' reserves, %/day; other females | −0.079; −0.055 | −0.08 to −0.02; −0.06 to 0 |
| T-ACT-1 feeding share; T-ACT-3 grooming (e-bench, T-quick) | 0.377; 0.186 (F 0.207) | +0.00 to +0.03; −0.00 to −0.03 |
| Starvation deaths | 0 | 0 |
| Prescription count | 103 | 103 |
| Viability (no class beyond −0.05%/day) | fail (lactating, juveniles, other females) | **fail** (lactating; low confidence: a daylight fill of 0.85 or more would pass it) |
| Held-out on shared rows (with and without T-HUN-4, T-BRD-1) | — | within noise |

**Kill criterion (iteration 1).** Null if any of:
- K1: a starvation death, or a class other than lactating females falls faster than in T by more than 0.05% of its store a day;
- K2 (mechanism): mothers' daylight hunger rises by less than 0.05, or their eating minutes by less than 10%, over T;
- K3: on rows scored in both B and T, held-out distance rises by more than the noise threshold (1.5 until the integrator's quick value arrives), with or without T-HUN-4 and T-BRD-1.

Verdict if K1–K3 pass: **keep (provisional)** when viability passes (every class at or above −0.05%/day, no starvation); otherwise **partial (finding)**: the readout term is confirmed and what remains is the foregut's throughput at a full gut. Never grounds to change an input: a miss of T-ENE-2, T-ENE-3 or a T-ACT row.

### Iteration 1: results

Runs: arm B from a frozen checkout of 7391f9b (git.dirty 0), seeds 48 and 7, 30 + 30 days, rules policy; T from cc51622 (simulation identical: the switch-off tests pass). Outputs in `artifacts/validation/e1i/` of the frozen checkouts (gitignored): `B1-energy.json`, `B1-intake.json`, `B1-quick.json` (compared with `T-quick.json`). Tables generated from the JSON (`energy_table.py`, `diag_table.py`, `bench_table.py`, session scratch).

Energy (simulation truth, `energy-diagnose`; reserve slopes by least squares over the daily means of the window):

| quantity | T | B1 |
| --- | --- | --- |
| lactating: eating min/day | 231 | 322 |
| lactating: dry matter g/day | 632 | 685 |
| lactating: absorbed ÷ spent (kcal/day) | 0.807 (1344 / 1665) | 0.858 (1446 / 1684) |
| lactating: field-method intake kcal/day | 1973 | 2132 |
| lactating: foregut ≥ 95% full, share of daylight | 0.082 | 0.300 |
| lactating: daylight hunger; condition | 0.44; 0.43 | 0.53; 0.49 |
| reserves ÷ store, %/day: female, lactating | -0.786 | -0.585 |
| reserves ÷ store, %/day: female, other | -0.055 | +0.016 |
| reserves ÷ store, %/day: adult male | +0.017 | +0.014 |
| reserves ÷ store, %/day: juvenile 5–12 y | -0.079 | +0.005 |
| reserves ÷ store, %/day: infant 2–5 y | +0.004 | +0.020 |
| reserves ÷ store, %/day: infant 0.5–2 y | -0.024 | +0.007 |
| eating min/day: other females / pregnant / males / juveniles | 237 / 249 / 250 / 236 | 238 / 281 / 247 / 265 |
| deaths (starvation) | 1 (0) | 1 (0) |

Behaviour (`intake-diagnose`, arm B):

| class | eat % | forage act, not eating % | groom % | rest % | travel with party % | play % | nest % | daylight hunger | daylight fill | φ | 1 − fill² | need kcal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 42.7 | 1.3 | 21.9 | 8.0 | 5.1 | 4.5 | 8.9 | 0.53 | 0.78 | 1.00 | 0.32 | 13140 |
| lactating, infant < 2 y | 45.5 | 1.4 | 13.3 | 11.5 | 7.6 | 4.0 | 9.0 | 0.50 | 0.81 | 1.00 | 0.28 | 13024 |
| lactating, infant ≥ 2 y | 39.9 | 1.2 | 30.6 | 4.4 | 2.6 | 5.0 | 8.7 | 0.56 | 0.76 | 1.00 | 0.36 | 13256 |
| other adult females | 31.6 | 1.4 | 11.9 | 25.3 | 9.3 | 1.0 | 10.8 | 0.30 | 0.69 | 0.76 | 0.44 | 1658 |
| pregnant females | 37.3 | 1.3 | 9.2 | 19.9 | 11.9 | 0.6 | 10.1 | 0.36 | 0.75 | 0.95 | 0.37 | 3048 |
| adult males | 32.8 | 1.3 | 13.6 | 20.6 | 8.8 | 0.5 | 10.7 | 0.28 | 0.63 | 0.60 | 0.52 | 1107 |

| class | not feeding with appetite and room, % of daylight | of which grooming % | draws with appetite and room: P(feeding) | chose feeding % | best feeding score | best other score | interrupts per daylight h | of which "groomed by" % | from own unweaned infant % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 25.5 | 35.2 | 0.413 | 40.9 | 0.568 | 0.726 | 1.16 | 48.5 | 47.7 |
| lactating, infant < 2 y | 20.3 | 17.1 | 0.438 | 43.2 | 0.566 | 0.703 | 0.93 | 18.0 | 9.7 |
| lactating, infant ≥ 2 y | 30.6 | 47.2 | 0.395 | 39.2 | 0.569 | 0.742 | 1.39 | 68.8 | 73.1 |
| other adult females | 21.7 | 14.6 | 0.314 | 31.4 | 0.376 | 0.702 | 1.13 | 26.2 | 0.0 |
| pregnant females | 27.5 | 11.0 | 0.332 | 33.0 | 0.413 | 0.661 | 0.96 | 15.2 | 0.0 |
| adult males | 12.6 | 15.9 | 0.347 | 34.7 | 0.473 | 0.767 | 0.99 | 30.3 | 0.0 |

| class | bouts per day | eating min per bout | spacing min | fill at bout start → end | hunger start → end | ends at a need-bucket redraw % | ends at satiation or a full gut % | ends by interrupt % | next act: groom / rest / play / other % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 9.6 | 33.4 | 39 | 0.70 → 0.95 | 0.61 → 0.36 | 61.0 | 0.0 | 26.9 | 25 / 9 / 8 / 30 |
| lactating, infant < 2 y | 10.5 | 32.6 | 33 | 0.73 → 0.96 | 0.58 → 0.35 | 55.9 | 0.0 | 31.1 | 18 / 10 / 6 / 32 |
| lactating, infant ≥ 2 y | 8.8 | 34.4 | 46 | 0.66 → 0.95 | 0.65 → 0.38 | 67.0 | 0.0 | 21.9 | 34 / 7 / 9 / 29 |
| other adult females | 9.6 | 24.7 | 45 | 0.63 → 0.89 | 0.39 → 0.13 | 37.6 | 0.0 | 21.5 | 6 / 27 / 2 / 34 |
| pregnant females | 9.8 | 28.5 | 41 | 0.66 → 0.92 | 0.48 → 0.16 | 48.2 | 0.0 | 27.2 | 10 / 17 / 1 / 39 |
| adult males | 8.9 | 27.3 | 48 | 0.58 → 0.85 | 0.35 → 0.13 | 27.0 | 0.0 | 19.5 | 9 / 20 / 1 / 36 |

Bench (`e-bench --quick`): fitted −0.944 on 17 rows scored in both (−0.944 without T-HUN-4 and T-BRD-1); held-out −2.072 on 12 (+0.115 on 11 without them; T-HUN-4 −2.19); prescriptions 103 → 103; e-bench viability pass → pass (no starvation, one illness death in each arm). Rows:

| row (band) | T | B1 |
| --- | --- | --- |
| T-ACT-1 (0.33–0.5) | 0.377 (M 0.378, F 0.376) pass | 0.417 (M 0.384, F 0.443) pass |
| T-ACT-2 (0.12–0.25) | 0.178 (M 0.193, F 0.164) pass | 0.199 (M 0.210, F 0.191) pass |
| T-ACT-3 (0.08–0.18) | 0.186 (M 0.161, F 0.207) fail | 0.156 (M 0.154, F 0.157) pass |
| T-ACT-4 (0.3–0.47) | 0.374 pass | 0.293 fail |
| T-FOOD-2 (0.6–0.78) | 0.800 fail | 0.785 fail |
| T-FOOD-4 (4–15) | 7.582 pass | 7.514 pass |
| T-HUN-1 (5–25) | 38.5 (P 1.275) inconclusive | 42.6 (P 1.361) fail |
| T-RNG-4 (1.5–3.5) | 2.256 (P 1.820, N 0.452, S 0.271) fail | 2.402 (P 1.882, N 0.391, S 0.217) fail |
| T-RNG-5 (0.3–0.6) | 0.670 (L 1.505, M 2.256) fail | 0.834 (L 2.017, M 2.402) fail |
| T-PTY-1 (3–9) | 3.153 pass | 3.623 pass |

**Kill criterion.** K1 passes (no starvation; every class other than the mothers improves: other females −0.055 → +0.016%/day, juveniles −0.079 → +0.005). K2 passes (mothers' daylight hunger +0.09, eating minutes +39%). K3 passes (held-out −2.07 on shared rows, +0.12 without the rare-event rows: inside noise either way). Viability fails on the lactating class alone (−0.59%/day). **Verdict: partial (finding)**, as registered: the readout term is confirmed, and what remains is the foregut's throughput.

**Against the predictions.** Held: bout-end fill ≥ 0.93 (0.95); daylight fill 0.78 (0.78–0.86, at the low edge); ≥ 95% full 0.30 of daylight (0.15–0.40); grooming of mothers of older infants 30.6% (20–32%); T-ACT-3 −0.03 (into the band); no starvation; prescriptions unchanged; viability fails on the lactating class; held-out inside noise. Missed: eating minutes rose more (322, registered 255–310) and dry matter less (685 g, registered 690–790) than registered, so absorbed ÷ spent (0.858, registered 0.88–0.99) and the mothers' slope (−0.59%/day, registered −0.35 to 0) fell short; daylight hunger 0.53 (registered 0.55–0.70) and P(feeding) 0.41 (0.45–0.65) slightly low; 61% of bouts still end at a need-bucket redraw (registered 25–50%), now at fill 0.95; juveniles and other females improved more than registered; T-ACT-1 +0.040 (registered up to +0.03); T-ACT-4 0.374 → 0.293 (just below its band).

**Reading.**
- The deficit now reaches the mothers' behaviour: they feed 42.7% of daylight (322 min; field nursing mothers 309 ± 85 min, T-ENE-2 in band; Ngogo mothers 43%, badescu2016), groom less (27.4% → 21.9% of daylight), and every other class's small deficit closes. T-ENE-3 (685 g) and the field-method T-ENE-1 (2,132 kcal) enter their bands.
- **Eating minutes rose 39%, dry matter 8%.** The added minutes are spent at a nearly full foregut (≥ 95% full in 30% of daylight against 8%), where intake is limited to what the foregut empties. So the binding term has moved from the readout to the foregut's throughput: at 83 mL/kg and a 3-hour emptying constant the foregut passes at most about 0.98 × 175 g ÷ 3 h × 12.6 h + 172 g ≈ 890 g a day even if it were full through all daylight; the field's nursing mothers pass 873 ± 289 g (T-ENE-3), at that ceiling, and the model's mothers need about 780 g.
- The arm leaves a behavioural share as well: mothers' daylight fill is 0.78, not 0.95; after a bout ends at a redraw (fill 0.95) they spend 39 min on other acts (grooming 25% of next acts) before feeding again, and the rules give feeding P = 0.41 at draws with appetite and room (feeding options 0.57, the best other option 0.73).

### Iteration 2 (registered 2 October 2026, before its run): lactational enlargement of the gut (`ledgerLactGut`), on top of iteration 1

**Why.** After iteration 1 the mothers feed the field's minutes (322 min/day) but half of their eating ticks (51.4%; D6, re-run of arm B at ce33105, identical behaviour) are at a ≥ 95% full foregut, where they swallow 1.29 g of dry matter per eating minute against 3.09 g below it; other females 23%, males 10%. They pass 685 g a day against the ~780 g they need. Of the four candidates of §3, (c) addresses this term directly; (a) is ruled out (§5), and (d) has no better source than the two secondary ones.

**Physiology.** In small mammals the demands of lactation are met partly by organ remodelling that "involves growth of the alimentary tract and associated organs such as the liver and pancreas" (speakman2008, abstract, [M]); in lactating rats the gastro-intestinal hypertrophy is studied "in relation to food intake" (campbellFell1964; title only, full text not reached). No primate measurement was found ([L] for chimpanzees).

**Mechanism** (`src/sim/energy.ts`, read only with `energyLedger`, `ledgerDigesta` and `ledgerDrive` 1; 0 = iteration 1 exactly). A lactating female's foregut and hindgut dry-matter capacities are multiplied by g = 1 + m ÷ max(E − m, m), where E is her day-long mean spending (the drive's `eAvg`, which includes the milk she pays for) and m the cost of synthesising her full milk yield (`ledgerMilkYieldCoef` × M^0.75 ÷ 24 ÷ `ledgerMilkEff` per hour). The gut grows in proportion to the extra intake lactation demands: the isometric null form of a capacity matched to its load (design; no free parameter). For the model's mothers E ≈ 70 kcal/h and m ≈ 16, so g ≈ 1.30: a foregut of about 228 g of dry matter instead of 175. No time course (the window holds established mothers; the gut changes with lactation's start and end); a mother whose infant drinks less than the yield gets a gut slightly larger than her demand (design simplification). Nothing else changes; the capacity is not a store, so conservation is untouched.

**Arm B2** = arm B + `{"ledgerLactGut":1}`. Same tools, seeds and window; compared with T (the stage's reference) and with B1 (attribution).

**Predictions (by hand, before the run; against B1 unless stated).** Arithmetic: at the same relative fill a 1.30 × foregut passes 1.30 × the dry matter; B1's daylight content (0.78 × 175 g = 137 g) would give 0.62 of the larger foregut, so hunger rises and meals run fuller; mothers return toward balance, then their satiation strengthens as the store recovers (iteration 1's feedback).

| Quantity | T | B1 | Expected B2 |
| --- | --- | --- | --- |
| Mothers' eating ticks at the wall | — | 51.4% | 10–35% |
| Lactating dry matter g/day | 632 | 685 | 760–880 |
| Lactating eating min/day | 231 | 322 | 280–350 |
| Lactating absorbed ÷ spent | 0.807 | 0.858 | 0.95–1.08 |
| Lactating reserves, %/day | −0.79 | −0.59 | −0.15 to +0.30 |
| Lactating daylight fill (of the larger foregut); daylight hunger | 0.71; 0.44 | 0.78; 0.53 | 0.60–0.78; 0.50–0.70 |
| Other classes (not lactating): reserves, eating minutes | — | +0.005 to +0.016%/day; 238–281 min | within ±0.03%/day and ±5% of B1 |
| T-ENE-1 field method; T-ENE-2; T-ENE-3 | 1,973; 231; 632 | 2,132; 322; 685 | 2,250–2,600 (in); 280–350 (in); 760–880 (in) |
| T-ACT-1; T-ACT-3 | 0.377; 0.186 | 0.417; 0.156 | 0.41–0.44; 0.14–0.17 |
| Starvation deaths | 0 | 0 | 0 |
| Prescription count | 103 | 103 | 103 |
| Viability | fail | fail (lactating) | **pass** (moderate confidence) |
| Held-out on shared rows against T | — | −2.07 (+0.12 without the rare rows) | within noise |

**Kill criterion (iteration 2).** Null if any of: K1, a starvation death, or a class other than lactating females falls faster than in T by more than 0.05%/day; K2 (mechanism), the mothers' dry matter rises by less than 8% over B1, or their share of eating ticks at the wall does not fall; K3, held-out distance on rows scored in both B2 and T rises by more than the noise threshold (1.5 until the integrator's quick value), with or without T-HUN-4 and T-BRD-1. If K1–K3 pass and viability passes: **keep (provisional)** for the pair, `ledgerLactGut` flagged "magnitude design, no primate source" (never a default without one). If K1–K3 pass but viability fails: partial (finding).

### Attribution run A2 (registered 2 October 2026, before its run; not an iteration: no mechanism changes)

T + `{"ledgerLactGut":1}` without `ledgerSatiationReserve`, `energy-diagnose` only (same seeds and window, frozen checkout of 374c751). Question: does the lactational gut alone carry the mothers, and does iteration 1 carry the other classes? Expected (by hand, before the run): mothers about as in the E1h confirm's G arm (gut 111 mL/kg for everyone: −0.16%/day), so between −0.30 and −0.05%/day; juveniles and other females as in T (−0.08 and −0.055%/day), so this arm alone would fail viability on them.

### Iteration 2 and attribution: results

Runs: B2 and A2 from a frozen checkout of 374c751 (git.dirty 0), the three re-draws of T from cc51622 (git.dirty 0); seeds 48 and 7, 30 + 30 days, rules policy. Every number generated from the JSON (`energy_table.py`, `diag_table.py`, `bench_table.py`, `zscore.py`, session scratch).

Energy (simulation truth; A2 = T + `ledgerLactGut` without iteration 1, attribution only):

| quantity | T | B1 | B2 | A2 |
| --- | --- | --- | --- | --- |
| lactating: eating min/day | 231 | 322 | 278 | 270 |
| lactating: dry matter g/day | 632 | 685 | 796 | 786 |
| lactating: absorbed ÷ spent (kcal/day) | 0.807 (1344 / 1665) | 0.858 (1446 / 1684) | 0.993 (1694 / 1707) | 0.977 (1667 / 1707) |
| lactating: field-method intake kcal/day | 1973 | 2132 | 2484 | 2451 |
| lactating: foregut ≥ 95% full, share of daylight | 0.082 | 0.300 | 0.090 | 0.052 |
| lactating: daylight hunger; condition | 0.44; 0.43 | 0.53; 0.49 | 0.46; 0.65 | 0.46; 0.63 |
| reserves ÷ store, %/day: female, lactating | -0.786 | -0.585 | -0.036 | -0.088 |
| reserves ÷ store, %/day: female, other | -0.055 | +0.016 | -0.002 | +0.013 |
| reserves ÷ store, %/day: adult male | +0.017 | +0.014 | -0.008 | -0.001 |
| reserves ÷ store, %/day: juvenile 5–12 y | -0.079 | +0.005 | -0.000 | -0.074 |
| reserves ÷ store, %/day: infant 2–5 y | +0.004 | +0.020 | +0.003 | -0.004 |
| reserves ÷ store, %/day: infant 0.5–2 y | -0.024 | +0.007 | -0.002 | -0.023 |
| eating min/day: other females / pregnant / males / juveniles | 237 / 249 / 250 / 236 | 238 / 281 / 247 / 265 | 239 / 273 / 247 / 261 | 237 / 248 / 247 / 235 |
| deaths (starvation) | 1 (0) | 1 (0) | 0 (0) | 0 (0) |

Mothers' eating ticks at a ≥ 95% full foregut (D6): B1 51.4% (1.29 g of dry matter per eating minute there, 3.09 below), B2 14.6% (2.08 and 3.05).

Behaviour (`intake-diagnose`, arm B2):

| class | eat % | forage act, not eating % | groom % | rest % | travel with party % | play % | nest % | daylight hunger | daylight fill | φ | 1 − fill² | need kcal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 36.9 | 1.3 | 23.9 | 10.9 | 4.5 | 4.8 | 9.6 | 0.46 | 0.69 | 0.95 | 0.46 | 3532 |
| lactating, infant < 2 y | 38.5 | 1.3 | 14.1 | 17.0 | 6.8 | 4.3 | 10.2 | 0.41 | 0.70 | 0.93 | 0.44 | 2812 |
| lactating, infant ≥ 2 y | 35.2 | 1.2 | 33.7 | 4.7 | 2.2 | 5.3 | 9.0 | 0.50 | 0.67 | 0.96 | 0.49 | 4251 |
| other adult females | 31.6 | 1.3 | 12.1 | 25.9 | 8.5 | 0.7 | 10.6 | 0.30 | 0.69 | 0.75 | 0.45 | 1592 |
| pregnant females | 36.3 | 1.3 | 8.8 | 22.2 | 10.1 | 0.7 | 10.3 | 0.34 | 0.74 | 0.90 | 0.38 | 2663 |
| adult males | 32.8 | 1.2 | 12.8 | 21.2 | 8.9 | 0.4 | 10.8 | 0.27 | 0.63 | 0.58 | 0.52 | 1089 |

| class | bouts per day | eating min per bout | spacing min | fill at bout start → end | hunger start → end | ends at a need-bucket redraw % | ends at satiation or a full gut % | ends by interrupt % | next act: groom / rest / play / other % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lactating (all) | 9.0 | 30.7 | 46 | 0.60 → 0.87 | 0.56 → 0.25 | 60.0 | 0.0 | 24.3 | 24 / 15 / 8 / 27 |
| lactating, infant < 2 y | 9.9 | 29.0 | 40 | 0.63 → 0.87 | 0.51 → 0.22 | 52.5 | 0.0 | 27.5 | 16 / 19 / 7 / 29 |
| lactating, infant ≥ 2 y | 8.1 | 32.6 | 54 | 0.56 → 0.86 | 0.63 → 0.29 | 69.3 | 0.0 | 20.5 | 35 / 10 / 10 / 26 |
| other adult females | 9.2 | 25.8 | 47 | 0.63 → 0.90 | 0.39 → 0.12 | 36.7 | 0.0 | 19.7 | 8 / 29 / 1 / 32 |
| pregnant females | 9.7 | 28.1 | 42 | 0.66 → 0.92 | 0.45 → 0.15 | 46.3 | 0.0 | 23.1 | 8 / 21 / 1 / 39 |
| adult males | 8.7 | 28.2 | 49 | 0.58 → 0.85 | 0.34 → 0.12 | 25.1 | 0.1 | 17.3 | 10 / 20 / 1 / 36 |

Bench rows (`e-bench --quick`):

| row (band) | T | B1 | B2 |
| --- | --- | --- | --- |
| T-ACT-1 (0.33–0.5) | 0.377 (M 0.378, F 0.376) pass | 0.417 (M 0.384, F 0.443) pass | 0.408 (M 0.393, F 0.421) pass |
| T-ACT-2 (0.12–0.25) | 0.178 (M 0.193, F 0.164) pass | 0.199 (M 0.210, F 0.191) pass | 0.194 (M 0.210, F 0.181) pass |
| T-ACT-3 (0.08–0.18) | 0.186 (M 0.161, F 0.207) fail | 0.156 (M 0.154, F 0.157) pass | 0.174 (M 0.163, F 0.184) fail |
| T-ACT-4 (0.3–0.47) | 0.374 pass | 0.293 fail | 0.364 pass |
| T-FOOD-2 (0.6–0.78) | 0.800 fail | 0.785 fail | 0.789 fail |
| T-FOOD-4 (4–15) | 7.582 pass | 7.514 pass | 6.892 pass |
| T-HUN-1 (5–25) | 38.5 (P 1.275) inconclusive | 42.6 (P 1.361) fail | 60.8 (P 1.999) fail |
| T-RNG-4 (1.5–3.5) | 2.256 (P 1.820, N 0.452, S 0.271) fail | 2.402 (P 1.882, N 0.391, S 0.217) fail | 2.269 (P 1.805, N 0.373, S 0.230) fail |
| T-RNG-5 (0.3–0.6) | 0.670 (L 1.505, M 2.256) fail | 0.834 (L 2.017, M 2.402) fail | 0.837 (L 1.898, M 2.269) fail |
| T-PTY-1 (3–9) | 3.153 pass | 3.623 pass | 3.311 pass |

Bench sums against the mean of the four T realizations (§4a; rows counted in all five runs):

**B1 against the mean of the 4 T realizations**
- fitted: 16 rows; arm 2.274; reference mean 3.366 (runs 2.48, 4.52, 3.33, 3.14; own SD 0.85); change -1.092; SD used 0.85; z -1.15 -> inside noise
  largest row changes vs the mean: T-SOC-9 -0.62, T-HUN-2 -0.35, T-COM-11 +0.19, T-HUN-1 -0.18, T-ACT-3 -0.11, T-HUN-7 -0.06
- held-out: 12 rows; arm 3.085; reference mean 3.234 (runs 5.16, 2.91, 2.87, 2.00; own SD 1.35); change -0.149; SD used 1.35; z -0.10 -> inside noise
  largest row changes vs the mean: T-RNG-5 +0.56, T-HUN-4 -0.40, T-SOC-6 -0.39, T-HUN-8 +0.08, T-SOC-2 -0.03, T-SOC-3 +0.02
- held-out, no rare: 11 rows; arm 2.382; reference mean 2.135 (runs 2.27, 2.21, 2.34, 1.72; own SD 0.28); change +0.247; SD used 0.48; z +0.46 -> inside noise
  largest row changes vs the mean: T-RNG-5 +0.56, T-SOC-6 -0.39, T-HUN-8 +0.08, T-SOC-2 -0.03, T-SOC-3 +0.02, T-FOOD-7 -0.02
**B2 against the mean of the 4 T realizations**
- fitted: 16 rows; arm 3.888; reference mean 3.366 (runs 2.48, 4.52, 3.33, 3.14; own SD 0.85); change +0.522; SD used 0.85; z +0.55 -> inside noise
  largest row changes vs the mean: T-HUN-1 +0.74, T-HUN-2 +0.37, T-SOC-9 -0.31, T-COM-11 -0.14, T-ACT-3 -0.10, T-HUN-7 -0.06
- held-out: 12 rows; arm 3.401; reference mean 3.234 (runs 5.16, 2.91, 2.87, 2.00; own SD 1.35); change +0.167; SD used 1.35; z +0.11 -> inside noise
  largest row changes vs the mean: T-HUN-4 -0.60, T-RNG-5 +0.58, T-SOC-10 +0.15, T-HUN-8 +0.08, T-FOOD-7 -0.04, T-SOC-2 -0.03
- held-out, no rare: 11 rows; arm 2.903; reference mean 2.135 (runs 2.27, 2.21, 2.34, 1.72; own SD 0.28); change +0.768; SD used 0.48; z +1.43 -> inside noise
  largest row changes vs the mean: T-RNG-5 +0.58, T-SOC-10 +0.15, T-HUN-8 +0.08, T-FOOD-7 -0.04, T-SOC-2 -0.03, T-SOC-3 +0.03

**Kill criterion (iteration 2).** K1 passes (no death; every class at −0.01%/day or better except the mothers, who are at −0.036). K2 passes (mothers' dry matter +16% over B1; eating ticks at the wall 51.4% → 14.6%). K3 passes (fitted z +0.55, held-out z +0.11, held-out without the rare-event rows z +1.43: inside noise). Viability passes: every class at or above −0.05%/day (lactating −0.036), no starvation death, e-bench viability pass (no death in either seed). Iteration 1 read with the same rule: fitted z −1.15, held-out z −0.10 and +0.46: inside noise. Prescription count 103 in every arm.

**Verdict: keep (provisional) for the pair** `ledgerSatiationReserve` + `ledgerLactGut`, both off by default (neither removes a prescription, so neither can go on by default under the Track E rule). `ledgerLactGut` is flagged *magnitude design, no primate source*: never a default without one. A 5-seed confirm is the next step.

**Against the predictions (iteration 2).** Held: wall share 14.6% (10–35%); dry matter 796 g (760–880); absorbed ÷ spent 0.993 (0.95–1.08); mothers' slope −0.036%/day (−0.15 to +0.30); daylight fill 0.69 of the larger foregut (0.60–0.78); other classes within ±0.03%/day and ±5% of B1's eating minutes; T-ENE-1 field method 2,484 kcal (2,250–2,600), T-ENE-3 796 g; T-ACT-1 0.408 (0.41–0.44, at the edge); no starvation; prescriptions unchanged; viability pass; held-out inside noise. Missed: eating minutes 278 (registered 280–350; T-ENE-2 is still in its band); daylight hunger 0.46 (0.50–0.70); T-ACT-3 0.174, female 0.184 (registered 0.14–0.17).

**Attribution (A2, registered).** The lactational gut alone brings the mothers to −0.088%/day (registered −0.30 to −0.05) with 786 g and 270 min; juveniles stay at −0.074%/day and infants of 0.5–2 y at −0.023, as in T. So the gut term carries the mothers and iteration 1 carries the juveniles (and the mothers' last 0.05%/day): the pair, not either switch, passes viability in this window. Run-to-run noise in small classes' slopes is visible: other adult females (no switch acts on them) read −0.055 in T and +0.013 in A2.

**Reading.**
1. *Why nursing mothers stopped eating with room in the gut:* their drive was saturated (φ = 1 all day) and E1e's satiation term did not see the reserve deficit, so their hunger was 1 − fill², the curve of a balanced animal; bouts ended at need-bucket redraws as the gut passed 0.775 full, and the rules then chose feeding no more often than for any other class. Weighting satiation by the relative store (adiposity signals modulate satiation signals) gives a depleted mother larger meals: she feeds the field's minutes (322 min/day).
2. *What it then exposed:* the foregut's throughput. At 83 mL/kg and a 3-hour emptying constant the foregut passes at most about 890 g a day even if it is full through all daylight; the field's nursing mothers pass 873 ± 289 g, at that ceiling. With the gut of a lactating female grown in proportion to her milk demand (×1.30), mothers absorb 0.99 of what they spend, eat 278 min and 796 g a day, and an observer using the field's kcal/min would record 2,484 kcal (field 2,479 ± 858). T-ENE-1 to T-ENE-3 are all in their field bands; the ledger truth (1,781 sugar-based kcal) sits just under the audit's comparison band (1,810–2,070).
3. *Costs:* mothers now range further relative to males (T-RNG-5 0.67 → 0.84, band 0.3–0.6; the largest held-out move, within noise as a sum); hunting rows move both ways (rare events in 30 days); T-ACT-3 female 0.184 (band ≤ 0.18).
4. *Still open:* mothers of infants ≥ 2 y groom 33.7% of daylight (other females 12.1%), after 1.49 interrupts per daylight hour, 77% from their own infant ("began grooming me"): infants from 2 y groom their mothers and the mothers reciprocate. No source was checked for infant-to-mother grooming rates; a design weight of the infant's options, outside this stage.

### Files and checks

Every run's JSON, scorecard and log, and the table scripts that generated the numbers above (`tools/energy_table.py`, `diag_table.py`, `bench_table.py`, `zscore.py`), are in `artifacts/validation/e1i/` of the `e1i-intake` worktree (gitignored, local). After merging `track-e` (5b452e6 and E4d): `gen-params --check` clean, `tsc --noEmit` clean, `pnpm test` 652 tests, 651 pass, 0 fail, 1 skipped; the goldens and the field pin did not move (both switches 0 by default).

## 7. Known defects and caveats in the code under test

- Readout caveat (scripts/intake-diagnose.ts closeBout): the gate's reason is not the bout's trigger. A forage act that finishes at satiation usually draws as 'need-bucket' (hunger changed bucket since the intent), so satiation and a full gut are read from the state at the last eating tick, not from the reason.
- Readout caveat (D1 'eat'): meat eaten from a carried piece while doing something else counts as eating (as in energy-diagnose); D4 bouts count only intake in the forage act.
- No defect found in the code under test that bears on the measurement.

## 8. Five-seed confirm (integrator, registered 2 October 2026 before its run)

Integrator's reading of the pair before the confirm: `ledgerSatiationReserve` is a structural change with a mammalian
basis and no free parameter. `ledgerLactGut` sizes the lactating gut to its extra load by construction (capacity grows
with m ÷ (E − m)), which makes the mothers' balance easy by design: it stays a candidate only with its flag, and needs
a measured mammalian or primate magnitude before it can carry a default.

Runs: field profile, rules policy, from the frozen checkout `bench-run` at the commit that adds this section, one at a
time, `--workers 2` (1 when the load is above 8):
- **Identity:** T in quick mode, compared row for row with this stage's `T-quick.json` (cc51622). If it differs, T's
  confirm realizations below are run fresh at this commit instead of reusing `e1h-T`.
- **T realizations (confirm):** `e1h-T` (E1h confirm, 9392b67) plus three re-draws: T + `rgTemperature` 0.1641, 0.1639,
  0.16405 (`e-bench --confirm`).
- **B2 (confirm):** T + `ledgerSatiationReserve` 1 + `ledgerLactGut` 1 (`e-bench --confirm`) and
  `energy-diagnose --seeds 48,7,21,5,11 --burn-in 30 --days 60` (simulation truth; T's is `e1h-T-energy`).

Judgement (as §6 registered, on 5 seeds): viability = no starvation death and no class falling faster than 0.05% of its
store a day (lactating females included); B2's fitted and held-out sums (with and without T-HUN-4 and T-BRD-1) against
the mean of T's four realizations, z = (B2 − mean) ÷ (SD × √1.25), SD the confirm per-run SD (0.30 / 1.45 / 0.21) or
T's own spread if larger; |z| > 2 is a result. Expected (integrator, before the run): mothers within −0.10 to +0.10% of
the store a day (moderate confidence); no starvation (moderate); every sum inside noise (moderate); T-RNG-5 worse than
T (low).

### Integrator note (2 October 2026): the T-RNG-5 "cost" was follow-day sampling

Stage E1j (e1j-prereg.md §4–§5, interim) measured the mothers' ÷ males' daily path on every chimp-day (simulation
truth, quick seeds 48 and 7): R 0.77, all switches off 0.69, T with this stage's pair 0.69. The observer's T-RNG-5
rests on 13–24 complete follow-days of mothers per quick run, so it read R as 0.70 and the pair as 0.84: the "mothers
range further" cost in §6 (reading, point 3) is sampling noise, not behaviour.
