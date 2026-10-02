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

## 5. Diagnosis results

(Filled in after the diagnosis run, before any arm.)

## 6. Arms

(Registered after §5, before any arm runs.)

## 7. Known defects in the code under test

(Listed as found, with file:line; fixed before measuring or deferred here.)
