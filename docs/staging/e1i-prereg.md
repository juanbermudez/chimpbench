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

## 7. Known defects and caveats in the code under test

- Readout caveat (scripts/intake-diagnose.ts closeBout): the gate's reason is not the bout's trigger. A forage act that finishes at satiation usually draws as 'need-bucket' (hunger changed bucket since the intent), so satiation and a full gut are read from the state at the last eating tick, not from the reason.
- Readout caveat (D1 'eat'): meat eaten from a carried piece while doing something else counts as eating (as in energy-diagnose); D4 bouts count only intake in the forage act.
- No defect found in the code under test that bears on the measurement.
