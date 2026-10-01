# Party size and what drives it: diagnosis, design and pre-registration

Status: design for the integrator, 1 October 2026. Diagnosis from the code on `main` 21592c1 and from existing outputs only (`artifacts/validation/c13/dc-*.json`, `light-c13e.json`; field, 1 year after a 180-day burn-in, seeds 48, 7, 21). No simulation was run for this document, and nothing is implemented.

## 1. The gap

| Row | Role | Now (dc-c13e) | Band |
| --- | --- | --- | --- |
| T-PTY-1, mean party size | fitted (labelled tuned) | 2.72 | 3–9 |
| T-PTY-2, patch-size effect (R²) | held out | 0.016 | 0.2–0.8 |
| T-PTY-2, habitat-fruit effect (R²) | held out | 0.17 | ≤ 0.1 |
| T-PTY-3, males in periphery ÷ core parties | held out | 1.26 | ≥ 1.5 |
| T-PTY-4, female time alone | held out (compromised) | 0.59 | 0.15–0.45 |

## 2. How parties work in the code

- **A party is a label, not a mechanism.** `computeParties` (src/sim/parties.ts) chains community members within `partyLinkM` (50 m in the field profile) by union-find, every party step. Nothing caps its size. The observer uses the same chain rule at the same distance for its 15-min scans (T-PTY-1), so the instrument and the sim agree on what a party is.
- **Party size is therefore the sum of individual choices.** Three things put animals within 50 m of each other:
  - going to the same crown;
  - following a companion who leaves (`partyFollow*`, the joint trip of C7c and C13e);
  - not leaving on a trip of one's own (`partyStayW`: 0.05 per community member in sight, at most 3).
- **Feeding at a crown does not read the per-animal share.** The forage score is `(1.6 h + 0.1) × (0.55 + 0.45 q) × tripFrac − …` (src/sim/candidates.ts).
  - `q` is crop ÷ `fruitValueRef`, capped at 1 fruit unit, so every crop above 1 unit is worth the same.
  - `tripFrac` is feeding time ÷ (walk + feeding time). For an animal already in the crown the walk is zero, so it is 1 whatever the crop and however many feed there.
  - The intention gate's patch test (`patchPoorHere`, src/sim/rg.ts) takes the full fruit rate as "here", again without the share.
- **The crowding cost reads the wrong quantity.** `compete = crowd × crowdCompeteW × (crowdScarcityRef − fruitIndex)`: the cost of a co-feeder scales with the habitat-wide fruit index, not with the crown. At a fruit index near 0.9 it is 0.04 per co-feeder, in a crown of any size. The trip score also adds `sociability × fruitIndex × 0.1`.
- **Each animal leaves on its own schedule.** A feeding bout lasts 20–45 min. The C13 intention gate holds a choice for at most 30 min (`rgMaxAgeH`) and drops it when a need bucket changes. Then the animal samples its menu by softmax (`rgTemperature` 0.164). Existing output: 73 decisions per chimp-day, 64% of them fresh draws, 4.9 trips per adult-day with a median of 228 m. When one leaves, 46% of companions in range join within 5 min.
- **Oestrus has no party effect.** A swollen female gives males mating offers; the alpha or the two top males may guard her, and a bonded male may consort. No other male's follow or stay score reads her swelling.

## 3. The cause, as read from the code and the existing outputs

Existing 1-year outputs (same seeds), by switch:

| Run | Mean party size | Patch R² | Habitat-fruit R² | Female time alone |
| --- | --- | --- | --- | --- |
| C13 off (`rgOn` 0, `intakeValue` 0) | 3.48 | 0.026 | 0.11 | 0.52 |
| sampling off only (`rgOn` 0) | 3.43 | 0.019 | 0.10 | 0.53 |
| intake valuation off only (`intakeValue` 0) | 2.81 | 0.017 | 0.13 | 0.61 |
| current `main` behaviour (dc-c13e) | 2.72 | 0.016 | 0.17 | 0.59 |

Two separate causes:

1. **Structural, in every version: nothing ties the number of feeders to the crop.** The patch R² was 0.02–0.03 before C13 too. Crowding is priced by habitat fruit, so party size follows the habitat (R² 0.1–0.2) and ignores the patch. That is the reverse of the field pattern (party size tracks patch size, not habitat-wide food: newtonFisher2000; chapman1995).
2. **Since C13a: sampled decisions loosen the cohesion that was tuned under argmax.** Mean party size fell from 3.4 to 2.8 when the sampling policy came on; the intake valuation changed it little. The stay cost is at most 0.15, which is 0.9 temperature units: it shifts the odds of leaving by a factor of 2.5, where under argmax it decided the choice.

Recruitment at departures is not the cause (science agent: join share 0.46). Each departure still takes about half of a party with it, and departures are frequent.

## 4. Proposed change (not implemented)

### 4.1 Crowding by the crown's share (ecological constraints)

- With `crowdByShare` = 1, the forage worth of a crown is multiplied by the part of the animal's need that the crown still covers when shared:
  - need = hunger ÷ `fruitHungerFactor` (fruit units that would sate this animal);
  - share = crop ÷ (1 + co-feeders seen in the crown);
  - cover = min(1, share ÷ need) ÷ min(1, crop ÷ need), which is 1 when alone or when the crown feeds everyone;
  - worth × (1 − (1 − cover) × r), where r is `crowdHighRankFactor` for a high-ranking feeder and 1 otherwise (the existing contest asymmetry).
- The habitat-index terms go: `compete` and the `sociability × fruitIndex` trip bonus are 0 under the switch.
- It applies to every forage offer at a crown, so both to staying and to arriving.
- **No new free parameter.** Every quantity is already in the registry. One switch; `crowdByShare` 0 is hash-identical to today.
- Evidence: larger parties deplete patches faster, so patch size limits party size (chapman1995 [M]); party size tracks patch size and not habitat-wide abundance (newtonFisher2000 [M]); party size is restricted on small herb patches (malenky1994 [M]). The exact functional form is a design assumption.
- Expected effect: small crowns shed co-feeders once their share falls below need; large crowns hold them. Feeders then accumulate where the crop is large.

### 4.2 Males stay with females in oestrus

- For males aged 10 y or more, a female in sight with swelling ≥ `consortSwellingMin` (0.6):
  - adds `oestrusPullW × swelling` to the score of following her or joining her trip;
  - adds `oestrusPullW × swelling` (the largest in sight) to the cost of leaving on a trip of his own.
- `oestrusPullW` = 0.3 (design, not tuned; about two temperature units). 0 switches it off, hash-identical.
- Evidence: receptive females raised the number of males in parties at Kanyawara (emeryThompson2014 [M]). No source gives a magnitude, so the weight is design.

### 4.3 Not proposed now

- **Re-fitting cohesion under sampling.** `partyStayW` was tuned to T-PTY-1 under argmax. If T-PTY-1 stays below 3 after 4.1 and 4.2, the pre-declared next step is to re-fit `partyStayW` against T-PTY-1 alone (a fitted row, already labelled tuned), by bisection on development seeds. It needs the integrator's go and is not part of this check.

## 5. Pre-registration

**Fixed now, before any code or run.** The rules of 4.1 and 4.2, the value 0.3, and the two switches.

**Fitted:** nothing. **Untuned:** everything in 4.1 (parameter-free) and `oestrusPullW` (design).

**Rows it touches, and labels.**
- T-PTY-1 is fitted and labelled tuned; it stays so.
- T-PTY-2: 4.1 encodes the direction of both parts (a patch effect, no habitat term). Proposed label: encoded, and "model revised post-freeze". Its magnitude (R² inside 0.2–0.8) is not tuned.
- T-PTY-3 and T-PTY-4: "model revised post-freeze" (values seen; mechanisms changed). T-PTY-4 is already compromised.
- T-SOC-4 (encoded) and T-ACT-5 are touched indirectly through who associates with whom.
- All held-out rows above count as validation only on fresh seeds. On development seeds they are development reads.

**Check (short-run rule).** Field profile, development seeds 48 and 7, 30-day burn-in then 60 observed days, both switches on against both off on the same code, 2 workers. About 10,000 party scans per seed.

**Guard (merge gate).**
- G1: both switches off reproduce the current goldens.
- G2: the fitted activity and ranging rows stay in their bands with the change on: T-ACT-1 (0.33–0.5), T-ACT-2 (0.12–0.25), T-ACT-3, T-ACT-4, T-RNG-4 (1.5–3.5 km).
- G3: viability. Adult and lactating median hunger not more than 0.03 above the off arm; no starvation death in the window in either arm that the other lacks.
- G4: mechanism. Mean co-feeders per feeding scan in the top third of crowns by crop is higher than in the bottom third with the change on, in each seed.

**Predictions (reported pass or fail; not a gate; nothing is tuned on them).**

| Quantity | Off (expected as now) | Predicted on | Confidence |
| --- | --- | --- | --- |
| T-PTY-1, mean party size | 2.6–2.9 | 2.9–3.6 | low |
| T-PTY-2, patch R² | 0.01–0.03 | 0.08–0.30 | low |
| T-PTY-4, female time alone | 0.56–0.62 | 0.50–0.58 | low |
| T-PTY-3, periphery ÷ core males | 1.0–1.6 (noisy) | unchanged within that spread | moderate |
| Adult males in parties with a swollen female ÷ without (truth read) | not measured yet | ≥ 1.2, and higher than off | moderate |
| T-ACT-2, travel share | 0.18–0.19 | +0.00 to +0.02 | low |

**What 60 days cannot resolve.**
- The habitat-fruit part of T-PTY-2 needs at least 4 monthly means. A 150-day window gives 5; it is run only if the 60-day check passes its guard. Prediction for it: R² at or below 0.10–0.15.
- Demography, and any effect on births through male–female association.
- T-PTY-3 if fewer than 5 periphery follows occur in the window.
