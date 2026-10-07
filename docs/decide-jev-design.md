# Jev decision design: diagnosis and proposal

Status: **design for approval**, reviewed by a four-judge panel (`artifacts/decide-ft/judges/`). Their valid corrections are applied inline and listed in §13. The integrator's resulting plan is `docs/staging/jev-decisive-test.md`; this document stays as diagnosis and design input. Nothing in `src/`, `server/`, `scripts/` or `training/` was changed and nothing was spent. The checks below read existing logs and runs; one free local check ran seed 6203 for 2 days per profile. Scripts and outputs: `artifacts/decide-ft/jev-design/` (gitignored; `diagnose.py` reproduces every number in §1).

Scope: how the model setup should change so that model-driven populations behave like wild eastern chimpanzees, with Jev (TypeSafe System One, `jev-1.13.0`) deciding from each chimp's world state, perception, inner state and memory. An independent Codex design for the same brief is in `decide-jev-design-agent-2.md`; §12 lists where they agree and differ.

Standing caveats:
- Labels and personas are **design assumptions**, not field data. Jev's probabilities are plausibility judgments, not measured frequencies of wild behavior. The field targets in `data/targets.json` are the only ground truth here.
- Numbers from the five-year runs come from **stand-ins** (small networks imitating the adapters), not the adapters. Numbers from the three-day runs come from the real models.
- Code for all existing runs is `snapshot-v3` (sim hash `1c20a219db3e`), older than `main`. Comparisons between troops share that code. Comparisons with the science scorecards do not.

## 0. Summary

1. **The main failure is valuation, not argmax.** Option texts carry drive words but no value. A hungry model-driven chimp eats leaves in place instead of walking to fruit it remembers. At strong or severe hunger, with leaves as the only food here and a remembered fruit tree on the menu, the trained adapters pick leaves **97–100%** of the time and the trip **0%**. Rules pick leaves 10% and the trip 14–27% (same states). Jev never travels either: 0.2% of picks when a trip is offered (probability mass 0.02).
2. **The sim's energy budget turns that choice into the activity-budget miss.** Hunger rises about 1.0 per day. Leaves remove about 0.11 per hour, ripe fruit about 0.18–0.24. A leaves-only adult must feed about 75% of a 13-hour day; a fruit eater about 35%; a lactating female on leaves about 96%. The trained troops feed 71–82% (females 77–90%) and travel 2–9%.
3. **Argmax barely matters for the trained adapters.** Their probabilities are nearly one-hot (median top probability 0.99), so sampling moves daylight decision shares by 2 points or less. It matters more for the untuned model (0.65) and Jev (0.77), but it cannot fix travel.
4. **The conflict-based targets rest on almost nothing.** Baseline and collaborative troops had 88–389 observed conflicts in five years (rules 11,068–14,223). Their reconciliation values come from 2–4 individuals. Their "flat" or "in-band" hierarchies score 0.92–0.98 once pant-grunts count.
5. **Trained troops live in states the labels never covered.** Urgent hunger appears in 8% of rules-world contexts and thirst ≥ 0.55 in 1%. In the trained troops' own decisions: 18–33% and 28–58%.
6. **The matrix was mis-scored.** `report_data.py` ignores the scorer's verdicts (sex-part bands, "held as fail"). With them, the median-seed scores are **rules 3/11, baseline 4, untuned 2, collaborative 1, aggressive 0**, not 5/5/2/2/0. Two of baseline's four passes are thin data (T-SOC-5) or noise plus a metric bug (T-DEM-1).
7. **Proposal: code computes, Jev judges, code composes.** Code turns the ecology into named facts (food here, remembered food and water with the age of the memory, walking times, "much richer than here"). Jev answers one fan-out call: which kind of activity, then which partner, place or act within it. Code multiplies the answers, samples reproducibly, and keeps the chosen intent until something salient changes. This cuts calls and night calls.
8. **Blocker for the brief's long-run plan.** TypeSafe's Master Customer Agreement §2.3(b) forbids using any Output "to perform model distillation, train a model to imitate the output of the Services". Training stand-ins or adapters on Jev's probabilities needs TypeSafe's written permission. The plan has a route without it (§8, §9).

## 1. Verified diagnosis

| # | Hypothesis | Verdict | Confidence |
|---|---|---|---|
| H1 | Argmax over one-pick labels amplifies the mode | **Refuted for the adapters** (the mode is baked in by training); partly true for untuned GLiNER and Jev | High (decision level); moderate (population level) |
| H2 | Choices follow the drive, not the ecology | **Confirmed**, with the mechanism | High |
| H3 | Repair options and the prompt inflate reconciliation | **Partly confirmed**: tiny denominators and a high pick rate when offered; prompt effect untested | High / moderate / low |
| H4 | Thin aggression flattens the hierarchy; low ranging cuts encounters | **Confirmed** for the hierarchy; **partly** for encounters (seed geometry dominates) | High / moderate |
| H5 | Covariate shift from rules-driven training states | **Confirmed**; mostly a consequence of H2 | High |
| H6 | Some misses are sim-side | **Confirmed**, plus measurement bugs | High |

### H1. Argmax amplification

**Check.** On-policy decision logs of the real models (`distill/decisions/`, field map, 3 days after a 180-day rules burn-in, seeds 7001–7002, n = 3,688–4,849 per policy): daylight decision shares under argmax, under sampling (expected share from the probabilities) and the rules' pick in the same states. Jev: 21,835 society receipts from round 2 (compressed map, native packet).

**Result.**

| policy | median top probability | share of decisions with top > 0.9 | biggest argmax → sampling change (daylight decision shares) |
|---|---|---|---|
| baseline adapter | 0.99 | 0.66 | move 0.140 → 0.150 |
| collaborative adapter | 0.99 | 0.65 | groom 0.319 → 0.307 |
| aggressive adapter | 0.86 | 0.45 | rest 0.228 → 0.208 |
| untuned GLiNER | 0.65 | 0.11 | groom 0.362 → 0.289; feed 0.203 → 0.268; move 0.025 → 0.054 |
| Jev (round 2) | 0.77 | 0.31 | groom 0.272 → 0.203; feed 0.135 → 0.180; move 0.002 → 0.015 |

Per state bucket: at hunger ≥ 0.7, with forage and travel both offered, the adapters' argmax picks forage 85–91% of the time and their mean probability for it is 75–84% (rules in the same states: 3–6%).

**Reading.** The adapters learned near-deterministic policies from one-pick labels, so switching them to sampling changes almost nothing. Mode-seeking lives in the training targets, not in the argmax. Jev and the untuned model are softer, and sampling moves 7 points out of grooming and 4–7 into feeding. It cannot create travel that the model gives 1.5% probability. Caveat: these are decision shares, not time shares, and the closed loop was not simulated.

### H2. Drive-following, ecology-blind choices

**Check 1: same states, all policies.** Offline field contexts from rules-driven worlds (`distill/contexts.jsonl`, 6,000 field contexts with each option's real target) scored by all four GLiNER policies:

| menu (daylight) | hunger | n | rules: leaves / trip | baseline | aggressive | collaborative |
|---|---|---|---|---|---|---|
| leaves are the only food; remembered tree offered | strong | 80 | 0.10 / 0.14 | 0.99 / 0.00 | 0.99 / 0.00 | 0.97 / 0.00 |
| same | severe | 30 | 0.10 / 0.27 | 1.00 / 0.00 | 1.00 / 0.00 | 1.00 / 0.00 |
| same | mild | 561 | 0.03 / 0.20 | 0.08 / 0.21 | 0.20 / 0.23 | 0.02 / 0.19 |

At mild hunger the adapters take the trip about as often as rules (0.19–0.23 vs 0.20). At moderate hunger baseline and collaborative take it about half as often (0.09 vs 0.17). At strong hunger the trip vanishes.

**Check 2: the trained troops' own decisions.** Forage and travel are offered in 100% of daylight menus. At hunger ≥ 0.7 the adapters pick forage 85–91%; rules, in those same states, would pick drink 64–67% and forage 3–6%. Drink is offered in 95–98% of daylight menus: the models pick it 4–8%, rules would pick it 38–64%. Offline, adapters almost never drink (0.00–0.05; rules 0.02–0.11); labels drink 0.03 (rules 0.08).

**Check 3: Jev.** A trip is offered in 50% of decisions and picked 0.2% (mass 0.02). Drink is offered 82% and picked 2%. Rest is offered in every menu and picked 1% (mass 0.04). Nest is picked 89% when offered and mate-guarding 93%.

**Check 4: labels.** Field contexts at strong hunger with forage and a trip on the menu (n = 19): the base label picks the food here every time (fruit 12, leaves 7) and the trip never. The rubric's hard constraint 1 names "drink, feed/forage, rest or nest" as the options that relieve urgent needs. A trip to food is not among them.

**Mechanism (arithmetic, same parameters on `main` and `snapshot-v3`).**
- Hunger rises 0.06 per hour awake and 0.022 asleep: about 1.0 per day (lactation adds 0.29).
- Leaves and pith remove 0.11 per hour × local yield (0.6–1.3; mean near 1).
- Ripe fruit removes 0.11 × (0.75 + 0.25 × skill) × 2.2 = 0.18–0.24 per hour.
- Break-even feeding time, as a share of a 13-hour waking day: leaves only 75% (lactating 96%); fruit 33–43% (lactating 42–56%).
- Leaves give no water; fruit does (0.55 × intake). A leaves-eater gets thirsty and must walk to the stream, which the models rarely choose.
- Observed: the trained troops feed 71–82% (females 77–90%) and travel 2–9%.

**Why the models do this.** The travel option's purpose reads "moves to another area". Forage reads "food, eases hunger", and at urgent hunger it becomes "food, eases severe hunger — needed now". Rest reads "eases fatigue", which only fits when fatigue shows. TypeSafe's own guidance is that text in the state "that argues for its own classification, can move the answer" (docs.typesafe.ai/model-jaggedness/jev-1.13). The model matches drive words to purpose words, and the one option that feeds the chimp well carries no food words.

### H3. Repair inflation

**Check.** T-SOC-9 inputs in the five-year runs; pick rates when a reconcile option is offered; the metric code (`src/field/protocols.ts`, `metrics.ts`).

**Result.**
- **Denominators.** Baseline and collaborative T-SOC-9 values come from **n = 2–4 individuals** (each with ≥ 3 post-conflict and matched-control pairs). Observed conflicts in five years: baseline 237–389, collaborative 88–134, rules 11,068–14,223. The collaborative 1.00 on every seed is a small-n artifact. The metric has no minimum number of individuals.
- **Propensity where conflicts exist.** Reconciliation bouts per decided conflict (the uncorrected "truth" field): rules 0.04–0.08, aggressive 0.26–0.38, untuned 0.65–0.73, collaborative 1.43–1.45. Pick rate when offered: untuned GLiNER 0.53 (n = 79), Jev 0.52. Labels: base 0/25, aggressive 0/25, collaborative 23/25.
- **Metric.** The post-conflict window is 10 minutes and the matched control starts 24 hours later (up to 5 retries). Grooming, play, sharing and consoling between the opponents also count as affiliation.
- The baseline stand-in's repair rate (0.43–0.57) is not explained by its labels (0/25). It is probably stand-in error (moderate-low confidence; n is small).
- The prompt line "chimpanzees may reconcile" was not tested in isolation (low confidence either way).

### H4. Aggression and ranging

**Result.**
- **Labels are nearly aggression-free.** When offered: aggressive-class options base 0.04 (rules 0.07); status charges 0/35; supplants 0/21; displays 0/575 (rules 0.03). On-policy, when offered, the baseline adapter charges 0.00 (n = 237) and displays 0.00 (n = 1,195); collaborative 0.00 (n = 483) and 0.00 (n = 1,367); aggressive 0.74 and 0.10.
- **Conflicts with the real adapters over 3 days:** baseline 1–4, collaborative 0–1, rules 6–62, aggressive 112–154.
- **Steepness is thin data.** Collaborative scores 0.01–0.08 on agonistic data and 0.94–0.98 with pant-grunts. Baseline scores 0.40–0.46 (in band) and 0.92–0.94 with pant-grunts: in band for the wrong reason.
- **Encounters are only partly about ranging.** The troop that ranges least (collaborative, 1.0–1.4 km/day) has the fewest encounters (0.3–0.9 per year). But seed 8002 gives high values for three of the four trained policies (untuned 64.9, baseline 31.6) while rules score low on it (13.0). Seed geometry dominates.

### H5. Covariate shift

| states (field) | urgent hunger (≥ 0.7) | thirst ≥ 0.55 | night decisions |
|---|---|---|---|
| rules-world contexts (the labeling distribution) | 0.08 | 0.01 | 0.11 |
| baseline, on-policy | 0.26 | 0.46 | 0.26 |
| aggressive, on-policy | 0.18 | 0.28 | 0.24 |
| collaborative, on-policy | 0.33 | 0.58 | 0.23 |
| untuned, on-policy | 0.77 | 0.67 | 0.24 |

Each round-3 adapter trained on 900 contexts. Only 54 of the 1,200 labeled contexts had strong or severe hunger with both forage and a trip offered. The untuned stand-in's agreement falls from 0.67 on held-out rules-world contexts to 0.57 on its own states. The shift is mostly caused by H2: the troops become hungry and thirsty, and those states are exactly where the labels are thinnest.

### H6. Sim-side misses (no decision model should be asked to fix these)

| miss | evidence | owner |
|---|---|---|
| Home range | every troop 0.69–2.80 km², rules included (band 5–16) | C7 (paused for the combined proof) |
| Rules hierarchy too steep (**snapshot-v3 only**) | rules 0.90–0.91 on snapshot-v3; the current science scorecard (`artifacts/validation/c7a-fresh.md`) gives 0.67 (0.64–0.70), inside the band | re-baseline on `main` |
| Rules encounters (**snapshot-v3 only**) | 13.0 / 78.6 / 81.2 per year on snapshot-v3; c7a-fresh gives 2.44 (0.25–5.81), below the band | re-baseline on `main` |
| Population growth | rules +16–24% in 5 years; trained troops +6–25% | C8 |
| Sex split in activity | rules females feed 0.55–0.57 (band ≤ 0.50), males travel 0.30–0.31 (≤ 0.25) | C8 (the lactation starvation blocker) |
| Unlimited low-yield leaves | makes staying put viable; biologically right that leaves are slow, so the decision layer must value fruit | note for C7 |

### New findings

- **N1. Dashboard scoring.** `training/decide_ft/report_data.py` judges the median value against the band and ignores the scorer's verdicts, flags and sex parts. Rules T-ACT-2 (pooled 0.223) fails on the male part (0.31), and T-RNG-4 is "held as fail" by the scorer. Median-seed scores with verdicts: rules 3, untuned 2, baseline 4, collaborative 1, aggressive 0. The published comparison page (docs/decide-finetune.md §11) shows the uncorrected counts.
- **N2. Stand-in variant bug.** `scripts/ft-features.ts` reads `candidateMeta.get(o)` on menu options that `boundedCandidates` (`src/decision.ts`) copied, so the WeakMap lookup misses. Every option's variant is logged as NONE: none of 18,464 options in 3,000 contexts carries its variant, though 23% of them have one. The stand-ins cannot tell a trip to fruit from heading home or toward callers, or a status charge from defending kin. Option classes are wrong too: coalition and defence charges count as aggressive, and counter-calls as affiliative. The same lookup feeds `liteRecord` in `scripts/ft-society.ts`. Every five-year stand-in run carries this.
- **N3. Metric issues.**
  - T-DEM-1's exposure window ends 180 days early; births in the last 180 days are dropped (`src/field/metrics.ts` `lifeTable`).
  - T-PTY-1 is scanned every 30 minutes, not 15.
  - T-IGE-1 is per 2,339 party follow-hours, and `scripts/ft-field.ts` does not apply the instrument bar.
  - T-RNG-1 is the West community only.
  - T-DEM-1 at about 15–20 infants per run has a 95% interval of roughly ± 0.16. It cannot rank policies.
- **N4. List-length bias.** Jev's probability mass on social options, with menu size fixed near 7.5: 0.27 with one social option, 0.54 with two, 0.69 with three, 0.73 with four or more. Places are capped at one option per action; partners are not. Part of this is genuine (more companions nearby), so moderate confidence.
- **N5. Night calls.** 23–26% of model decisions happen at night (mostly nest vs rest), plus 5–7% at dusk.
- **N6. Jev is not deterministic.** The same packet gave 0.42, 0.39 and 0.45 for one option in the smoke receipts. TypeSafe documents a standard deviation of about 0.01 and top-label flips when options are close. There is no seed or temperature control.
- **N7. Distillation is barred without permission** (MCA §2.3(b), updated 23 Sep 2026; §4.2 assigns Output ownership to the customer).
- **N8. Reserved-seed collisions.** Earlier decide-ft runs used seeds that were later reserved as "never run". Each needs an integrator ruling:
  - seed 1010, round-3 sampling on the field map (patrol re-test set 606–1010);
  - seeds 5101 and 5202, distillation sampling at 18:51 (C9 proof set, reserved 21:25);
  - seeds 7001–7003, field runs at 19:12 (C11 calibration pool C, reserved 21:28);
  - seed 9101, scenario files still being written at 21:57, after the V3 reservation.
- **N9. Refuted: silent rules fallbacks from the GLiNER token budget.** 0 of 11,049 real choices were over budget (seed 6203, 2 days per profile), so Jev runs were not quietly partly rules-driven.
- **N10. Rules leak into the stand-ins** (added after review). `optionFeatures` gives every stand-in the rules' score and pick (`score`, `rulesPick`), so stand-in populations partly imitate rules, not only their adapter. Any future student must drop both inputs.

### Which targets a decision policy can move

| target (band) | rules on snapshot-v3 (median; seeds) | can move it | note |
|---|---|---|---|
| T-ACT-1 feeding (0.33–0.50) | 0.47 (fails: females 0.55–0.57) | policy + sim | food choice; female energy balance |
| T-ACT-2 travel (0.12–0.25) | 0.22 (fails: males 0.30–0.31) | policy + sim | fruit and water trips; sex split |
| T-ACT-3 grooming (0.08–0.18) | 0.09 (pass) | policy | |
| T-ACT-4 rest incl. grooming (0.30–0.47) | 0.28 (fail) | policy + sim | follows the feeding time |
| T-PTY-1 party size (3–9) | 3.5 (pass) | policy + sim | scans every 30 min |
| T-RNG-4 day range (1.5–3.5) | 3.77 (held as fail) | policy + sim | shuttling inflates it; not scorable now |
| T-SOC-9 reconciliation (0.08–0.22) | 0.077 (0.077–0.123) | policy + measurement | report only with ≥ 10 individuals |
| T-SOC-5 steepness (0.2–0.7), **held-out**, seen | 0.91 | sim + measurement | thin data for low-conflict policies |
| T-IGE-1 encounters (5–12) | 78.6 (13.0–81.2) | sim + policy | code version and geometry first |
| T-RNG-1 home range (5–16) | 1.9 | sim | |
| T-DEM-1 infant deaths (0.11–0.19) | 0.18 (0.15–0.21) | sim + measurement | window bug; n too small |

Ten of the 11 are fitted-role targets. Only T-SOC-5 is held-out, and it is already on the dashboard.

## 2. Design principles

From behavioral biology (not a brain model):
- **Animals decide at salient moments and otherwise keep going.** Activity comes in bouts: feeding in a crown, a walk to the next tree, a rest. Re-evaluation is triggered by a change: a need crossing a threshold, a patch running low, a companion leaving, a threat, dusk. This is a design assumption drawn from standard ethology; the sim already works this way through bout ends and `interrupt()`.
- **Foraging is a rate comparison.** Stay while this patch pays more than the best alternative after the walk (marginal value theorem, [charnov1976]). Chimpanzees remember and monitor large fruit trees ([janmaat2013a]) and approach out-of-sight trees from about 540 m ([ban2014]); they do not always go to the nearest one ([normand2009]). Party size tracks patch size ([newtonFisher2000], [chapman1995]; patch residency [potts2011]). So the chimp's choice needs the values, and the values are arithmetic.
- **Social choices are judgments.** Whom to groom, whether to keep up with the party, whom to appease, whether to make up after a fight: these weigh bond, rank, kin, tension, risk and temperament. That is where a model like Jev adds something rules do crudely (relationship value, compatibility and security: Fraser, Schino and Aureli 2008, in `docs/research.md`).
- **Populations vary; they don't all do the mode.** Use the whole distribution, sampled reproducibly.

From TypeSafe's documentation (docs.typesafe.ai):
- Code does counting and arithmetic; Jev "will perform better on semantic representations than numeric", so pass "the computed number or a named bucket" (model-jaggedness/jev-1.13).
- Send only decision-relevant state; accuracy falls with unrelated content (same page). Keep inferred facts apart from observed ones (TypeSafe SKILL.md).
- All questions about one state go in one request, and extra questions cost only their own tokens (primitives; cookbooks/parallel_questions). Combine judgments in code (patterns/composite-scoring). Nested choices suit hierarchical selection (cookbooks/hierarchical_classification).
- Option names and descriptions are both read: use the same field names across options so they can be compared (concepts/how-to-build-with-system-one).

## 3. Proposed architecture

```
                 ┌──────────────── simulation (unchanged) ─────────────────┐
  tick ────────► │ perception → legal candidates → startAction / execution │
                 └──────┬───────────────────────────────────────▲──────────┘
                        │ decision point (bout end, interrupt)   │ applyDecision (legality re-checked)
                        ▼                                        │
  [1] Attention gate (code) ── no salient change ──► keep intent ┤ (no call)
                        │ salient change
                        ▼
  [2] Situation builder (code, pure): needs, day so far, food here and its rate,
      remembered food and water (with memory age), estimates as named buckets,
      party movement, place in the range, last stranger contact, memories
                        ▼
  [3] Jev, one request, fan-out:
        activity    choice over ≤ 10 kinds of activity (each with "what / gives / costs")
        <kind>      speculative choice among the concrete options of each kind
                    that has ≥ 2 (which partner, which tree, which act)
                        ▼
  [4] Composer (code): P(option) = P(kind) × P(option | kind)
      optional calibration, declared in advance (§5)
                        ▼
  [5] Sampler (code): u = hash(seed, chimp, decisionVersion) ──► intent store
```

| concern | owner | why |
|---|---|---|
| legality, physics, execution | code (sim, unchanged) | invariant: "the model only chooses" |
| intake rates, walking times, depletion, water, time to dusk | code, shown as facts and named buckets | arithmetic; the sim defines these quantities |
| which food places are worth naming (at most 3) | code, by one declared currency: expected food per hour including the walk ([charnov1976]) | a salience filter, not a choice |
| what kind of activity next | **Jev** | weighs needs, company, risk, time and temperament |
| with whom, where, which act | **Jev** | social and ecological trade-offs |
| when to reconsider | code (attention gate) | salient changes only; saves calls |
| turning probabilities into acts | code: reproducible sampling, declared calibration | auditable |

This is not rules with a coat of paint. Rules' weighted utility (hunger × 1.6, sociability × 0.1, jitter, continue bonuses) never reaches Jev. Code supplies what the animal knows or perceives (its memory of a tree and its crop, its own hunger, where its companions are going) and what the sim defines (how fast leaves feed it). Jev makes every choice between alternatives.

### The attention gate

A model-driven chimp at a decision point is asked again only if one of these holds:
1. `interrupt()` fired (charged at, invited, approached, a companion moving off, strangers heard or seen).
2. A need changed bucket since the last call (mild, moderate, strong, severe).
3. The intent ended or became impossible: arrived, partner left, crown empty, sated, rested, or target out of sight.
4. The patch is poor against what the chimp knows: feeding here, hunger at least mild, and a remembered place estimated at ≥ 2× the food per hour after the walk (design assumption, MVT-style).
5. Phase change: dawn, midday start and end, dusk.
6. The intent is older than 90 minutes (safety net; design assumption).

Otherwise code re-applies the intent's action (same act and target) through `applyDecision`. A trip that arrives becomes feeding at that tree. At night the nest is kept unless a trigger fires, which removes most of the 23–26% of calls made at night. The gate lives in the harness (and in `DecisionController` for the app), not in `src/sim`. Expected reduction: 2–3× fewer calls (estimate; J0 measures it by replay, for free).

### Night and dusk

The existing night and dusk menus stay. At night, fewer than two kinds of activity means no call.

## 4. Packet v3 (Jev-native)

Example (a lactating female at 14:10, strong hunger, leaves here, figs remembered):

```json
{
  "state": {
    "self": { "name": "Kidoti", "sex": "female", "age": "24 y", "stage": "adult", "community": "West",
              "rank": "rank 3 of 9 females", "status": ["mother of a dependent infant"],
              "temperament": ["sociable", "peaceable"], "mood": "calm" },
    "needs": { "hunger": "strong", "thirst": "moderate" },
    "day": { "time": "14:10", "light_left": "about 4 h",
             "so_far_today": { "feeding": "about 5 h, mostly leaves and pith", "walking": "about 0.4 km", "resting": "about 1 h" } },
    "here_now": { "doing": "eating leaves and pith for 40 min", "food": "leaves and pith only; no ripe fruit in sight",
                  "party": { "size": 3, "adult_males": 0, "moving": "none" }, "place": "core of our range", "weather": "clear, 26 °C" },
    "remembered": {
      "food": [ { "what": "fig tree with ripe figs", "where": "350 m north-east, about 17 min walk", "crop": "large when last seen, 2 days ago" } ],
      "water": { "where": "stream 400 m south, about 20 min walk" },
      "strangers": "Mulongo males heard 3 days ago near the eastern edge"
    },
    "estimates": { "fig_tree_vs_here": "much more food per hour than leaves here, walk included" },
    "nearby": [ { "name": "Semwai", "relation": "my offspring", "stage": "infant", "distance": "1 m" } ],
    "memories": ["Groomed Bweru 2 h ago"]
  },
  "questions": {
    "activity": {
      "type": "choice",
      "instructions": { "question": "What will Kidoti do next?",
                        "judge_as": "A field primatologist who knows wild eastern chimpanzees (Kibale).",
                        "evidence": "Judge only from the state. Every option is possible now." },
      "criteria": {
        "eat_here":   { "what": "keep eating leaves and pith here", "gives": "slow food", "costs": "none" },
        "go_to_food": { "what": "walk to a fruit tree she remembers", "gives": "rich food", "costs": "a walk of about 17 min" },
        "drink":      { "what": "walk to the stream and drink", "gives": "water", "costs": "a walk of about 20 min" },
        "rest":       { "what": "rest here", "gives": "restores energy", "costs": "none" },
        "groom":      { "what": "groom someone nearby", "gives": "strengthens a bond; calms both", "costs": "none" }
      }
    }
  }
}
```

Rules for the packet:
- **Options state consequences in one register** (`what / gives / costs`), true to sim mechanics: leaves are slow food, rest restores energy, grooming strengthens a bond. No option repeats the chimp's need words, and "— needed now" goes; urgency lives only in `needs`.
- **Observed, remembered and estimated facts are separate blocks.** `here_now` is perceived now; `remembered` carries the age of each memory; `estimates` are code's comparisons as named buckets.
- **Numbers only where they are facts** (distances, minutes, hours). Comparisons are buckets: "much more" means ≥ 2.5×, "more" 1.5–2.5×, "about the same" 0.67–1.5×, "less" below 0.67 (design assumption; J1 checks that Jev reads them in order).
- **One entry per kind of activity**, whatever the number of partners. Kinds: `eat_here`, `go_to_food`, `drink`, `rest`, `nest`, `groom`, `play`, `keep_with_party`, `greet_or_appease`, `make_up`, `contest`, `back_ally_or_defend`, `court`, `meat`, `confront_strangers`, `avoid_strangers`, `call`, `hunt`, `escape`, `emigrate`. (Nursing is the infant's act; infants are rules-driven.) A kind is listed only if it has a legal member. Usually 5–8 are.
- **Speculative sub-questions**: for each kind with two or more concrete options, one extra choice with the same `what / gives / costs` fields, for example "If Kidoti grooms, whom?" over the groom candidates. Speculative questions are ignored when irrelevant; TypeSafe bills only their tokens.
- **Repair is not always offered.** "Make up" appears only after a conflict with that individual, as today, but it is one social kind among others with neutral wording. The situational line "chimpanzees may reconcile, keep apart or threaten again" goes. The tension shows on the partner's entry in `nearby`.
- **No behavioral prescriptions for mothers.** The situational line "A dependent infant relies on this mother: she stays close, nurses and protects it" also goes; the fact stays in `self.status`. It prescribes the pattern that the held-out T-RNG-5 tests (lactating females' day range), so keeping it would encode that target.
- **Question wording** is "What will X do next?" (predictive). J1 tests it against "most plausibly" (mode-seeking).

Tokens and cost per addition. Estimate from round-2 receipts: tokens ≈ 290 + 0.383 × JSON characters. The ~290-token fixed overhead is what TypeSafe's own examples imply, and two independent sets (offline and A/B) both give 0.383 tokens per character on top of it. J1 measures real counts. Field packets on `main` today: 1,562 characters median ≈ 890 tokens; p95 2,364 ≈ 1,200.

| addition | chars (typical) | tokens | kind |
|---|---|---|---|
| `day` (light left, so far today) | 150 | +57 | observed (own history) |
| `here_now.doing` + `food` | 110 | +42 | observed |
| `here_now.party.moving`, `place` | 60 | +23 | observed / inferred from use |
| `remembered.food` (1–3 places) | 110–330 | +42–126 | remembered, with age |
| `remembered.water` | 50 | +19 | remembered |
| `remembered.strangers` | 70 | +27 | remembered |
| `estimates` | 70 | +27 | code estimate |
| kinds with `what / gives / costs` (replaces act and purpose) | +120 | +46 | |
| speculative sub-questions (0–3) | 0–250 | +0–96 | |
| removed: urgency echoes, the reconcile line, "currently X" | −60 | −23 | |
| **total (field)** | **about +700 to +900** | **about +270 to +345 → about 1,150–1,250 per call** | |

At $0.042 per million input tokens, a call costs about **$0.00005** (costs below use 1,200 tokens).

The GLiNER packet can take the same facts as short purpose words ("rich food, 17 min") within its 613-token budget. That is secondary to this design.

## 5. From probabilities to behavior

**Composition.** P(option) = P_activity(kind)^(1/T) · e^(b_kind) / Z × P_kind(option), with P_kind = 1 when the kind has one option.

**Default: no calibration** (T = 1, every b = 0). Jev's own distribution is sampled.

**Sampling.** u = hash01(seed, chimpId, decisionVersion, 0x5eed), then the cumulative pick. World randomness (`world.rng`) is untouched, and the same probabilities always give the same act. Because Jev itself varies between calls, every answer is cached by the SHA-256 of its request, and a replay run reads the cache, so a Jev run can be reproduced exactly.

**Calibration, only if J2 shows a systematic bias.** Declared now:
- **Parameters:** at most 3 offsets (b_eat_here, b_go_to_food, b_rest); T stays 1.
- **Fitted against:** T-ACT-1, T-ACT-2 and T-ACT-4 only (fitted-role rows).
- **Seeds:** calibration seeds 6401–6403 (7-day runs).
- **Consequence:** those three rows are then "tuned" and no longer count as evidence.
- **Validation:** the other fitted rows and the held-out panel below.

**Fallback arm, only if J1 shows Jev ignores the value facts.** P ∝ P_jev × e^(β · value), where `value` is code's food-per-hour estimate on feeding and trip options only. One parameter, fitted to T-ACT-1 and T-ACT-2. This moves valuation into code; the doc says so if it is used.

**Held-out panel.** Declared before any Jev run, and not inspected for any trained policy:
- ranging: T-RNG-5
- parties: T-PTY-2
- food: T-FOOD-3, T-FOOD-6, T-FOOD-10
- social: T-SOC-3, T-SOC-6, T-SOC-10
- intergroup: T-IGE-3

T-SOC-5 and T-ACT-5 are reported separately, as held-out but already seen. T-ACT-5 was in this panel until review: `diagnose.py` printed male and female feeding for every trained troop, which is T-ACT-5's first component.

## 6. Temperaments

- **Personas are literal text in the state.** Add `self.style`: "at the competitive, individualistic end of wild variation: contests food, rank and mates when the odds favor it; invests little in others". The collaborative one: "at the affiliative end: grooms, reconciles, supports allies, defers rather than contests". The baseline has no style line. The question stays identical across conditions. TypeSafe says the model "answers the question you wrote, not the one you meant", so J1 also tests the persona in `instructions.judge_as`.
- **Separable:** contest mass (aggressive over baseline) ≥ 2× and affiliative mass (collaborative over baseline) ≥ 1.3× on the same contexts (J1). In J2: charges and grooming bouts per adult-day with non-overlapping 95% intervals, as in round 2.
- **Still realistic:** on the same contexts, each persona's feeding, trip and rest mass stays within 0.05 of baseline. An aggressive chimpanzee still mostly feeds, rests and travels (evidence digest).
- **GLiNER adapters** for the in-app model can still be retrained from expert labels (not from Jev, see §8).

## 7. Cost of long runs

| run | calls per community-day | tokens per call | cost per community-day | 1 year, 3 communities | 5 years |
|---|---|---|---|---|---|
| round 2 (compressed, v2) | about 1,210 | 1,457 | $0.074 | $81 | $405 |
| field, v2 packet, no gate (today) | about 850 | about 890 | $0.032 | $35 | $174 |
| field, v3, no gate | about 850 | about 1,200 | $0.043 | $47 | $234 |
| **field, v3, gate (2.1× fewer)** | **about 400** | **about 1,200** | **$0.020** | **$22** | **$110** |

Per seed and per temperament; about +10% for population growth. The gate's reduction is the main unknown (J0 measures it).

**Wall time** (corrected after review). The harness is lockstep: one round trip per tick that has decisions, and batches cannot overlap ticks. So the 40-requests-per-second limit is not what binds. Round 2 took 673–925 s of wall time for 3 days of one community (about 300 s per community-day), almost all of it waiting on Jev. Expect roughly 1–2 days of wall time per seed-year even with the gate. J2 measures it.

## 8. Long runs and the distillation constraint

The brief's plan: Jev labels tens of thousands of on-policy states (DAgger-style) and stand-ins or GLiNER adapters imitate it for multi-year runs. MCA §2.3(b) forbids using Output "to perform model distillation, train a model to imitate the output of the Services". On a plain reading that covers soft-label distillation into any student (high confidence; not legal advice). Options:

- **Path A: ask TypeSafe for written permission** for an internal, non-commercial research stand-in. If granted, DAgger in 3 rounds: 3 personas × 20,000 on-policy contexts per round ≈ 180,000 calls ≈ **$9**. Students run multi-year simulations on CPU.
- **Path B (default until permission): Jev directly, with the gate.** One year, baseline persona, 3 report seeds ≈ **$66** (range $47–141 depending on the gate). All three personas ≈ $200. Five years ≈ 5× that.
- **Path B2 (optional): students trained on non-Jev labels.** The field-expert labelers are asked for a probability over the options (not one pick), on the students' own states (DAgger). Every figure says "expert-label student, not Jev".

Using Jev probabilities as features for a model that predicts something else is the pattern TypeSafe's docs teach (concepts/how-to-build-with-system-one). Predicting the chimp's action from Jev's own action probabilities is imitation, so it does not escape the clause.

## 9. Staged experiment plan

Seeds (none overlaps any reserved or previously used set, including the collisions in N8):
- **Development** (may be inspected): 6301, 6302, 6303. Already used by this diagnosis: 6203.
- **Calibration** (fitted rows only, and only if needed): 6401, 6402, 6403.
- **Report** (held-out; never run before J4; to be added to AGENTS.md's reserved list): 6501, 6602, 6703, 6804, 6905.

All runs use one frozen copy of `main` taken at J0 (like `snapshot-v3`, with its hash recorded), because `main` keeps moving. Field profile, 180-day rules burn-in, all three communities on one policy (MIN_AGE 8), `jev-1.13.0` pinned, and Jev called locally (the key never leaves this machine). The matrix is always scored with the scorer's verdicts (§10, D8), all seeds shown.

### J0. Repairs, re-baseline, gate replay. Cost $0 (local CPU)
- Fix N2 (D1) and refit nothing yet. Make `report_data.py` use verdicts, n and "can't tell" (D8). Hand the N3 items and the N8 seed collisions to their owners.
- Build the run-wide spend ledger (D7). No paid stage starts without it.
- Re-baseline rules on `main`: development seeds × 7 days (for J2) and × 1 year (for the matrix).
- Replay the attention gate on rules worlds: triggers per chimp-day, and the share of decisions that would be auto-continued.
- Build the situation builder and packet v3 (D4–D6), both flat and by kind, with unit tests: purity, legality, determinism, token estimates.
- Generate "stressed" contexts (hungry, thirsty, leaves-only) by running the existing baseline stand-in for 14 days on the development seeds. Any policy that reaches those states will do; the old stand-in is the free one. These probe the covariate-shifted states at no API cost.
- **Go when:** tests are green, the rules baseline is recorded, the gate replay shows ≥ 2× fewer calls, and v3 packets estimate ≤ 1,300 tokens at median.

### J1. Offline Jev probes. Cap $1 (expected about $0.25, about 5,000 calls)
- **P1 value sensitivity** (pre-registered directions; paired packets differing in one fact):
  - trip vs leaves: P(trip) rises with remembered crop and falls with walking time; at strong hunger with a rich tree within 20 min, P(trip) ≥ P(eat leaves);
  - patch leaving: P(leave) rises as the food here drops from fruit to leaves;
  - water: P(drink) rises with thirst and falls with distance;
  - rest: P(rest) is higher at midday than early morning when no fatigue shows;
  - party: P(keep with party) rises when companions move off and with the bond;
  - repair: P(make up) rises with the bond; baseline P(make up | offered) ≤ 0.3;
  - aggression: aggressive > baseline > collaborative on contest options, and baseline > 0 when a trigger is present.
  - **Pass:** ≥ 80% of directions right, each with |Δp| ≥ 0.05.
- **P2 packet A/B** on 600 contexts (300 rules-world, 300 stressed), baseline persona: v2 native vs v3 flat vs v3 by kind. Read-outs: kind shares, entropy, and the slope of social mass on the number of social options (N4).
- **P2b facts without the verdict** (added after review): v3 with and without the `estimates` block. If Jev moves only when the "much more food than here" phrase is present, foraging is effectively code's MVT rule with Jev as noise, and the report must say so.
- **P3 wording and persona**: "next" vs "most plausibly"; persona in `self` vs `instructions`; 3 personas on 300 contexts. Read-outs: the separability and realism ratios in §6.
- Real token counts from 10 calls per variant.
- **Stop:** P1 < 80% → switch to the fallback arm (§5) and re-probe. **Choose** v3 by kind if it lowers the N4 slope without hurting P1; otherwise v3 flat.

### J2. Seven-day Jev field runs. Cap $15 (expected $6–11)
- Conditions on development seeds 6301–6303 (13 Jev runs, about 21 community-days each):
  - rules (free);
  - Jev v3 baseline, aggressive and collaborative;
  - Jev v2 baseline (packet ablation);
  - Jev v3 baseline without the gate (1 seed; gate ablation).
- **Judgeable in 7 days:** T-ACT-1 to 4 (with sex parts), T-PTY-1 and day range (reported; the scorer holds it as fail). Society rates: charges, displays, fights, coalition support, grooming bouts and reconciliations per adult-day. Also calls per chimp-day, the share of decisions auto-continued, and wall time.
- **Season and drift** (added after review): every condition starts on the same calendar day after burn-in, the phenology season is recorded, and shares for the first and second halves of the window are reported. A drift above 0.05 means the window has not settled.
- **Limit:** these rows test mostly the ecological side, where code supplies the facts. Jev's social judgment (reconciliation, hierarchy) cannot be scored in 7 days; it is first tested in J4.
- **Success:**
  - **S1:** Jev baseline passes at least as many of T-ACT-1 to 4 and T-PTY-1 as rules on the same seeds (median seed; all seeds shown).
  - **S2 (the mechanism):** on every seed, Jev baseline feeding ≤ 0.55 and travel ≥ 0.10, for males and females.
  - **S3:** temperaments separable (§6).
  - **S4:** aggressive and collaborative within 0.05 of baseline on feeding, travel and rest.
  - **S5:** spend within the cap, and calls ≤ 60% of the v2 rate.
- **Stop/go:**
  - S2 fails → back to J1 (valuation or gate).
  - S1 fails with S2 passing → the declared calibration (§5) on seeds 6401–6403, then re-check.
  - S3 fails → persona wording (J1-P3).

### J3. Long-run policy (needs a decision on §8)
- **Path A (permission):** DAgger, 3 rounds; cap $12.
  - Students (the stand-in network, with D1 fixed and v3 structured features) are validated against the J2 Jev runs on the same seeds: activity shares within 0.03, party size within 10%, society rates inside the Jev intervals, on-policy top-1 agreement ≥ 0.85.
  - These thresholds are declared targets; whether they are reachable is unknown.
  - **Stop:** if the gap persists after 3 rounds, make no multi-year claim and use Path B for one year.
- **Path B (no permission):** direct Jev, baseline persona, 1 year × 3 report seeds; cap $75. The other two personas are added only on a separate approval (about $130 more).

### J4. Report runs
- Report seeds 6501–6905. Path A: 5 years × 5 seeds for rules and three personas (CPU). Path B: 1 year × 3 seeds.
- Scored against:
  - the 11-target matrix with verdicts, n and "can't tell";
  - the held-out panel, reported once, whatever the outcome.
- **Success:**
  - baseline ≥ rules' re-baselined score on the full matrix;
  - baseline ≥ rules on the policy-movable rows (T-ACT-1 to 4, T-PTY-1, and T-SOC-9 when n ≥ 10 individuals);
  - temperaments separable on the report seeds.
- The brief's bar of "at least rules' 5/11" becomes "at least rules' re-baselined score". On snapshot-v3, scored with verdicts, rules make 3/11.

Total spend: Path A ≤ $28 (J1 + J2 + J3); Path B ≤ $91, or about $216 with all three personas for a year. No RunPod spend is needed: runs are local, and students are CPU networks.

## 10. Code change points (proposed diffs, not applied)

Files marked (owner) belong to other agents and are proposals for them.

**D1. `src/decision.ts` `boundedCandidates`: keep the variant on menu copies** (fixes N2 at the root; old stand-ins then need a refit).

```diff
   const add = (c: Candidate | null | undefined) => {
     const match = c && legal.find(l => same(l, c));
-    if (match && chosen.length < MAX_OPTIONS && !chosen.some(o => same(o, match))) chosen.push({ ...match });
+    if (match && chosen.length < MAX_OPTIONS && !chosen.some(o => same(o, match))) {
+      // candidateMeta is keyed by object: a bare copy lost the variant, so stand-in features and option classes read NONE.
+      const copy = { ...match }, meta = candidateMeta.get(match);
+      if (meta) candidateMeta.set(copy, meta);
+      chosen.push(copy);
+    }
   };
```
Test (`tests/decision.test.ts`): a menu built by `buildRequest` keeps `candidateMeta.get(option).v === V.TREE` for a remembered-tree trip.

**D2. `scripts/ft-society.ts` `answerWaiting`: reproducible sampling and the gate hook.**

```diff
+import { hash01 } from '../src/sim/rng';
+import { gateContinue, noteIntent } from '../src/intent';
 const argmax = (p: number[]) => p.reduce((b, v, i) => v > p[b] ? i : b, 0);
+/** Option index drawn from p by a uniform fixed by (seed, chimp, decision version); world.rng is untouched. */
+export function drawIndex(p: number[], seed: number, chimpId: number, version: number): number {
+  const u = hash01(seed, chimpId, version, 0x5eed);
+  let acc = 0;
+  for (let i = 0; i < p.length; i++) { acc += p[i]; if (u < acc) return i; }
+  return p.length - 1;
+}
@@
 export async function answerWaiting(world: World, scorer: Scorer, assign: Record<number, string | null>, split: string, seed: number,
-  jevPacket: 'native' | 'shared' = 'native', log?: (d: LoggedDecision) => void): Promise<{ answers: Answer[]; seconds: number }> {
+  jevPacket: 'native' | 'shared' | 'v3' = 'native', log?: (d: LoggedDecision) => void,
+  opts: { sample?: boolean; gate?: boolean } = {}): Promise<{ answers: Answer[]; seconds: number; kept: number }> {
   const waiting = world.chimps.filter(c => c.alive && c.controller === 'model' && c.awaitingDecisionSince !== null);
   const recs: { c: Chimp; rec: ContextRecord }[] = [];
+  let kept = 0;
   for (const c of waiting) {
+    if (opts.gate && gateContinue(world, c)) { kept++; continue; }   // intent kept, re-applied through applyDecision: no call
     const rec = lite ? liteRecord(world, c, split, seed) : capture(world, c, split, seed, { feats: !!(scorer.wantsFeats || log) });
@@
-    const k = argmax(probs[i]);
+    const k = opts.sample ? drawIndex(probs[i], seed, c.id, c.decisionVersion) : argmax(probs[i]);
     const applied = applyDecision(world, c.id, rec.options[k], 'decide', c.decisionVersion);
+    if (applied && opts.gate) noteIntent(world, c, rec.options[k]);
```

**D3. New `src/intent.ts` (outside `src/sim`): intent store and attention gate.** It holds plain data per chimp: kind, action, target, the time and need buckets when chosen, and the phase. `gateContinue` returns false on any trigger in §3. Otherwise it re-applies the matching legal candidate from `computeCandidates` (same action and target) through `applyDecision`, and returns whether that applied. Headless runs keep the store in a Map. `DecisionController` keeps its own copy for the app, which resets on load; that is acceptable because intents are short.

**D4. `src/types.ts`: optional ecology facts on the context** (additive, optional, documented).

```diff
   history?: string[];
+  /**
+   * Optional (packet v3): code-computed facts the chimp perceives or remembers, as named buckets (src/ecology.ts).
+   * Observed, remembered and estimated facts are kept apart; nothing here is a rules score.
+   */
+  ecology?: {
+    lightLeftH: number; today: { feedMin: number; walkM: number; restMin: number; leafShare: number };
+    here: { food: 'fruit' | 'leaves' | 'none'; rate: 'rich' | 'moderate' | 'slow' | 'none'; doing: string; minutes: number };
+    places: { treeId: number; species: string; distM: number; walkMin: number; cropWord: string; seenDaysAgo: number; vsHere: 'much more' | 'more' | 'about the same' | 'less' }[];
+    water?: { distM: number; walkMin: number };
+    partyMoving?: { n: number; dir: string };
+    place: 'core' | 'range' | 'edge' | 'outside';
+    lastStrangers?: { daysAgo: number; where: string; outcome: string };
+  };
 }
```

**D5. New `src/ecology.ts`: `ecologyFacts(world, chimp, options)`.** Pure; no rng; reads only what the chimp perceives or remembers.
- **Food here:** from `fruitAt` / `forageYield`.
- **Places:** from the individual's own memory only (`c.memory` and `ix(c).treeCrop`), ranked by expected food per hour including the walk (the `tripCost` currency) and capped at 3. `knownTrees` stays out. It is community omniscience about the 40 best-known trees, including trees no animal has seen (a C7a stylization, `docs/research.md`). The rules fall back to it for unseen crops (`candidates.ts:244`). An earlier draft here wrongly called those "believed crops".
- **Water:** from water memories.
- **Place in the range:** from `useLevels`.
- **Last strangers:** from `ix(c).contacts`.
- **Today so far:** from a per-chimp diary the harness keeps (feeding, walking and resting minutes; reset at dawn), passed in rather than stored in World.

**D6. `server/decide.ts` (owner).**
- `decisionContextError`: accept an optional `ecology` key, with bounded numbers and enum checks, like the other blocks.
- New `buildJevQuestionV3(ctx, persona?)`: the state blocks in §4, one `activity` choice over kinds, and speculative sub-questions. It returns `map[i] = [kind, subKey]` for composition. `buildJevQuestion` (v2) stays for the ablation.
- `situationRules`: remove the tension rule, keeping the tension word on the partner.

```diff
-  if (!ctx.social.some(p => p.action === 'charge' || p.action === 'attack') && ctx.social.some(p => (p.tension ?? 0) >= 0.5))
-    rules.push([6, 'A relationship here is tense after recent conflict: chimpanzees may reconcile, keep apart or threaten again.']);
```
- `optionParts` / `VERBS` (GLiNER packet): with `ctx.ecology`, a remembered-tree trip reads "reaches rich food (~17 min)" instead of "moves to another area", and leaves read "slow food".
- `urgentPurpose` stays for GLiNER only (B5 measured its benefit there). The v3 Jev packet has no echoes.

**D7. `training/decide_ft/jev.py`: multiple questions, a cache, a persona, and a real spend guard.** `ask(packet) -> dict[qid, dict[label, p]]` sends every question in one request and checks each answer against its own criteria.

The existing `max_dollars` is **not** a run-wide cap (found in review):
- the cap is per process;
- the 4,096-token reservation is released before the call is booked;
- up to 6 retries of calls whose billing is unknown are never booked.

Before any paid stage, add a persistent, append-only spend ledger shared by every worker. It books each attempt before sending, counts retries, and stops hard at the stage cap. A cache keyed by the SHA-256 of the canonical request body turns reruns into exact replays. `worker.py` returns raw answers; TypeScript composes them.

**D8. `training/decide_ft/report_data.py` `judge` / `matrix`: use the scorer.**

```diff
-def judge(seeds: list[float], lo, hi) -> dict:
-    med = statistics.median(seeds)
-    state = "in" if lo <= med <= hi else ("low" if med < lo else "high")
-    split = any(lo <= s <= hi for s in seeds) and any(not lo <= s <= hi for s in seeds)
-    return {"median": med, "seeds": seeds, "state": state, "split": split}
+def judge(rows: list[dict], lo, hi) -> dict:
+    """The scorer's verdict on the median seed (sex-part bands, held-as-fail and n included); 'cant tell' when n is short."""
+    rows = sorted((r for r in rows if r["pooled"] is not None), key=lambda r: r["pooled"])
+    mid = rows[len(rows) // 2]
+    v, x = mid["verdict"], mid["pooled"]
+    state = ("in" if v == "pass" else "cant tell" if v in ("insufficient", "inconclusive")
+             else "low" if x < lo else "high" if x > hi else "fails a part")  # e.g. rules T-ACT-1: pooled in band, females above it
+    seeds = [r["pooled"] for r in rows]
+    split = len({r["verdict"] == "pass" for r in rows}) > 1
+    return {"median": mid["pooled"], "seeds": seeds, "n": [r.get("n") for r in rows], "state": state, "split": split}
@@ def matrix(long: dict, targets: dict) -> dict:
-            seeds = [v for v in (value(d, tid) for d in long.get(t, [])) if v is not None]
-            if seeds:
-                row["troops"][t] = judge(seeds, acc["lo"], acc["hi"])
+            found = [r for d in long.get(t, []) for r in d["rows"] if r["id"] == tid]
+            if any(r["pooled"] is not None for r in found):
+                row["troops"][t] = judge(found, acc["lo"], acc["hi"])
```

**D9. `.claude/skills/chimp-field-expert/SKILL.md` (only for Path B2).**
- Hard constraint 1 becomes "choose what relieves the need soonest and most. A walk to known rich food or water nearby counts."
- The output adds `dist`, a probability for each option, beside the pick.

**D10. Owners' fixes.**
- `src/field/metrics.ts` `lifeTable` should use observation time, not world time 0 (T-DEM-1).
- The party team's scans should run every 15 minutes (T-PTY-1). Today 2-minute points (`scripts/ft-field.ts`, the same setup as `src/field/run.ts`) meet the 15-minute scan gate only every 30 minutes, so the science scorecards carry it too (src/field owner).
- `scripts/ft-field.ts` `scorecard` should pass encounter accuracy to `applyInstrumentBar`.

## 11. Risks and open questions

- **The gate trades calls for inertia.** If triggers are too rare, code keeps chimps in poor patches. J0 and J2 report intent durations and the auto-continued share, and J2 runs one seed without the gate.
- **Jev may read buckets but not rank them** ("much more" vs "more"). P1 tests the order; the fallback arm covers failure.
- **Jev's social lean** (61–64% affiliative when offered, against 36% for the expert base labels) may survive the kind structure. Then the declared calibration is the only lever, and it costs T-ACT rows their evidential value.
- **Sim-side limits stay.** Home range, female energy balance and demography cannot be fixed by any decision layer. Rules' steepness and encounters were snapshot-v3 problems; re-check them on the frozen `main`. J4 separates sim-side limits from policy effects.
- **The contract question (§8) is the user's to settle.** Nothing here assumes permission.
- **Model drift.** `jev-latest` can move. Pin `jev-1.13.0` for every run of a stage and record the answering version, which the receipts already do.

## 12. Relation to the Codex version

An independent design for the same brief is in [decide-jev-design-agent-2.md](decide-jev-design-agent-2.md) (Codex). Its draft sat at this path first. This file replaced it at 22:27, and Codex restored its copy under the new name, so nothing was lost.

**Agree:**
- Values belong in the packet as facts.
- Chosen intents are held until a meaningful change.
- Sampling helps the adapters little: Codex measures +0.0099 travel for baseline.
- Both found the lost-variant bug (N2).
- Both flag the tiny reconciliation denominators and the sim-side misses.

**Differ:**
- **Distillation.** Codex trains long-run students on Jev's soft judgments. That document does not mention the TypeSafe MCA §2.3(b) clause (§8 here).
- **Scoring.** Codex reproduces the dashboard's median-of-three (rules 5/11). Here the scorer's verdicts give rules 3/11 (N1), which changes the success bar.
- **H1 label.** Codex rates it confirmed, since single labels and argmax exist. Here it is refuted as the main mechanism for the adapters, on the same kind of numbers.
- **Mechanism.** The energy-budget arithmetic and the same-state comparison with real option targets (H2) are specific to this version.
- **Gate settings.** Codex: a 20-minute refresh and a 25% intake decline. Here: event triggers and a 90-minute safety net.
- **Seeds.** Codex: 91011–91013 and more. Here: 6301–6905, plus the earlier collisions (N8).

## 13. Corrections after review (30 Sep)

A four-judge panel (`artifacts/decide-ft/judges/`) re-ran `diagnose.py` byte-identically. It verified the mechanism, the energy budget, the scoring error and the variant bug. These points were wrong or missing; each is fixed inline:

| was | now | judge |
|---|---|---|
| Remembered places use "believed crops, as the rules already use" | Own memory only; `knownTrees` is community omniscience and stays out (D5) | 1 |
| T-ACT-5 in the unseen held-out panel | Seen: this analysis printed its feeding-by-sex component; reported separately (§5) | 1 |
| The v3 example kept the lactation line "she stays close, nurses and protects it" | Dropped: it would encode held-out T-RNG-5 (§4) | 1 |
| Rules hierarchy 0.90–0.91 and encounters 13–81 as sim-side misses | Snapshot-v3 only; current scorecard 0.67 and 2.44 (H6) | 1 |
| Stand-in error discussed without the rules inputs | N10: stand-ins read the rules' `score` and `rulesPick` | 1 |
| "About 3 hours of API time" per run-year | Lockstep harness: roughly 1–2 days of wall time per seed-year (§7) | 2 |
| `JevClient` "books spend as now" | Not a run-wide cap; a persistent spend ledger is required before paid stages (D7, J0) | 2, 4 |
| No check that value facts, not the verdict phrase, move Jev | P2b arm without `estimates` (J1) | 4 |
| 7-day runs judged with no season or drift check; social judgment implied to be tested | Season and drift check; limit stated (J2) | 1, 4 |

Judge 3's power estimate is for a rule ("mean Δ ≤ −0.10 and ≥ 4/5 seeds") that does not appear in this document.
