# Jev decisive test (pre-registered 2026-09-29, before any run)

Source: a four-judge panel on `docs/decide-jev-design.md` (A, Claude) and `docs/decide-jev-design-agent-2.md` (B, Codex). Reports are in `artifacts/decide-ft/judges/`. Nothing below has been run.

## Panel verdict

- **A is the better design** (all four judges). Its diagnosis reproduces exactly: hungry adapters pick leaves 97–100% and a trip 0%. Rules score 3/11 with verdicts, not 5/11.
- **B has the better spend-guard critique**, and it is correct in the code. But its long-run plan trains students on Jev's probabilities. TypeSafe's MCA §2.3(b) (updated 23 Sep 2026) bars training "a model to imitate the output of the Services", with no stated exception (checked by judge 4). **Distillation from Jev is out** unless TypeSafe gives written permission.
- **Neither plan is decisive as written:**
  - A has no arm that removes Jev while keeping its computed facts and gate. Its pass-count bar counts ties as wins.
  - B's gate fails every arm, rules included.
  - Both runtime estimates are too low. The harness waits for every model decision each tick, so a world-year with Jev takes about 22–60 h.
- **Confounds:**
  - **Rules home advantage:** rules were tuned to T-ACT-2, party size and day range.
  - **Lactating females starve on `main` under rules alone**; the C8 fix is in progress.
  - **3–7-day windows are transients**, and the observer is noisy at that length.
- **Red team:** no spend until the free control arms exist.

## Question

Do Jev-driven chimps behave more like wild chimps than rules-driven ones on the targets a decision policy can move? And is any gain due to Jev, not to the facts that code computes for it?

## Arms

All arms run on one frozen snapshot of `main`, with its commit and sim hash recorded.

| Arm | Cost | Purpose |
| --- | --- | --- |
| R: rules as shipped | $0 | control |
| RG: rules + the same intention gate + sampling from rules scores | $0 | removes the gate/sampling effect |
| U: a plain utility policy over the same computed facts (no model) | $0 | **the decisive control**: is Jev better than arithmetic on the facts? |
| X: random legal choice | $0 | floor |
| J1: Jev as shipped (current packet, argmax) | paid | the current state |
| J2: Jev with value-bearing facts + sampling | paid | the proposed design |
| J2s: J2 with the facts shuffled across options (1 seed) | paid | does Jev read the facts? |

## Design

- **Seeds:** 6501, 6602, 6703, 6804, 6905 (not reserved elsewhere; never run before this test).
- **Profile and sequence:** field profile, all three communities on one policy per world. A 180-day rules burn-in, then 2 unscored days, then 5 scored days.
- **Endpoint: summed distance to the wild band, computed on simulation truth, paired by seed.** The rows are:
  - T-ACT-1 to 4: feeding, travel, grooming and rest shares of daylight, with sex parts where the target has them;
  - party size;
  - day range.

  Distance is 0 inside the band and otherwise the gap to the nearest band edge, divided by the band width. The observer value is reported beside truth.
- **Always reported:** hunger distributions (all adults, and females by reproductive state); calls per chimp-day; rules fallbacks by reason (including the GLiNER 613-token fallback); spend.
- **Lactating females are excluded from the endpoint** until the C8 energy fix lands, and are reported separately.

## Decision rules (fixed now)

- **"Jev helps":** J2's mean paired distance is lower than R's by ≥ 0.10, lower on ≥ 4 of 5 seeds, **and** lower than U's by ≥ 0.05 on ≥ 4 of 5 seeds.
- **"Jev hurts":** the same thresholds with the sign reversed.
- **"No difference":** anything else. If U matches or beats J2, any gain is credited to the facts, not to Jev.
- **J2s check:** if shuffling the facts doesn't change J2's choices (total variation < 0.05 on the matched states), Jev isn't reading them. Report this whatever the endpoint shows.

## Order and stop rules

1. **Free, today:**
   - fix the lost-variant bug (`src/decision.ts:195`);
   - build the facts builder, the U, RG and X arms, and the truth-based scorer, plus the fallback counter;
   - run R, RG, U and X on the five seeds.
   - **Stop here** if R is already within 0.10 of the bands on every row: then "helps" is unreachable, and money would be wasted.
2. **The spend guard, before any paid call:**
   - one persistent ledger shared by every process, with an explicit per-run cap (no default);
   - spend reserved by request size and settled atomically;
   - unknown billing booked as spent; retries only on 429/529;
   - a hard stop at the cap, never filling the rest with rules;
   - `jev-1.13.0` pinned; a receipt per attempt; dry-run mode and a kill switch;
   - tested against a fake server.
3. **Paid, only with the user's explicit approval: hard cap $10.** J1 and J2 × 5 seeds, plus J2s × 1 seed. A world that hits its share of the cap stops, and is marked incomplete.
4. **No distillation or training on Jev outputs.** Outputs carry a do-not-train marker.

## Free-arm settings (fixed 2026-09-29, before any run on the decisive seeds)

Code: `src/decide/facts.ts` (situation facts), `src/decide/gate.ts` (intention gate), `src/decide/policies.ts` (RG, U, X), `scripts/jev-test.ts` and `scripts/lib/jev-arm.ts` (harness and scorer). Nothing below changes a threshold or the endpoint above; it states how each is computed.

**Who and what.**
- Every living chimp aged 8+ in all three communities follows the arm's policy (the model-eligible age of every decide-ft harness); younger ones follow rules. R runs rules as shipped, with no gate.
- A policy chooses from the legal bounded menu a model would see (`src/decision.ts` `buildRequest`: at most 8 options, night and dusk menus applied). A menu with fewer than 2 options, an invalid context or a choice the engine refuses goes to rules, counted by reason. `applyDecision` re-checks legality before anything is applied.
- The GLiNER 613-token fallback (judge 2) is counted as a would-be fallback on every policy decision; the free arms never use GLiNER, so none is applied.

**Gate (design A §3), shared by RG, U and X.** A waiting chimp keeps its intent (same act and target, re-applied through `applyDecision`) unless: an interrupt fired since it was chosen; hunger, thirst, fatigue or loneliness changed bucket (mild ≥ 0.4, moderate ≥ 0.55, strong ≥ 0.7, severe ≥ 0.88, the packet's words); the period changed (night, dawn, morning, midday 11:30–14:30, afternoon, dusk); the intent is older than 90 min; the intent ended or became illegal; or it is feeding, hunger is at least mild, and a tree in view or in memory offers ≥ 2× the food per hour here, walk included. A trip that arrives (within 6 m) becomes feeding at that tree if that is legal. All gate constants are design assumptions.

**Sampling.** u = hash01(world seed, chimp id, decision version, 0x5eed) (design A §5), then the cumulative pick. `world.rng` and `Math.random` are never used, so runs are reproducible and arms share random numbers.
- **RG:** softmax over the rules' own scores on the menu, T = 0.164.
- **U:** softmax over the utilities below, T = 0.0892.
- **X:** uniform over the menu.
- Both temperatures give a median top-option probability of 0.77 on 5,635 rules-world menus of development seed 6301 (180-day burn-in, 2 days; `scripts/jev-test.ts --calibrate`). 0.77 is Jev's median in design A's H1 table (round-2 receipts). So RG and U are as soft as the sampled Jev they control for. Design assumption; calibrated on menus, never on the endpoint.

**U weights (from design A's energy numbers; not tuned).** U(option) = Σ_n 2·n × relief_n(option) + social and safety terms, where n is each need in [0, 1] (hunger, thirst, fatigue = 1 − energy, loneliness = 1 − social). A need costs n², so relieving it is worth 2n per unit: that is the urgency weight (design assumption). The reliefs are per hour, walk included, and use only the sim's own rates:

| Option | Relief per hour | Source |
| --- | --- | --- |
| Leaves, pith, herbs here | hunger 0.11 × local yield (0.6–1.3) | `fallbackHungerPerH`, `forageYield` (design A: "leaves −0.11/h × yield") |
| Fruit in view or remembered | hunger r × Tf / (Tw + Tf), with r = 0.11 × (0.75 + 0.25 × skill) × 2.2 = 0.18–0.24; Tf = hours of feeding the crop (shared with feeders in view) or the hunger allows; Tw = distance / 0.35 m/s; thirst likewise × 0.55 per fruit unit | `fruitIntakePerH`, `fruitHungerFactor`, `fruitThirstFactor`, `walkMps`; the marginal-value currency [charnov1976] |
| Crop believed | seen now (in view), last seen (the animal's own memory), else 0.2 (the rules' prior); never the community's known-tree list | C7a rule 8 (omniscient list excluded) |
| Drink | thirst 1.4 × Td / (Tw + Td), Td = thirst / 1.4 | `drinkThirstPerH` |
| Rest, shelter | energy +0.08 (0.06 recovered vs 0.02 spent idling) | `energyRestPerH`, `energyOtherPerH` |
| Nest (asleep) | hunger +0.038, thirst +0.018, energy +0.12, loneliness +0.025 vs awake | `hungerSleepPerH` etc. |
| Groom | energy +0.08, social +0.18 × (0.5 + 0.5 × bond) | `execution.ts` groom rate; relationship value (Fraser, Schino & Aureli 2008) |
| Play | social +0.15 × (0.5 + 0.5 × bond), energy −0.06 | `execution.ts` |
| Walking acts; running acts | energy −0.03; energy −0.23 and hunger −0.03 | `energyWalkPerH`, `energyRunPerH`, `hungerRunPerH` |

Social and safety terms (design assumptions):
- keeping with a companion, or joining callers: 2·loneliness × 0.18 × 0.5 × (0.5 + 0.5 × bond) / (1 + walk h);
- making up: 2·loneliness × 0.18 × (0.5 + 0.5 × bond);
- answering a threat present now: +1;
- defending or backing an ally: +0.5, or +0.1 when the opponent dominates;
- confronting strangers seen or heard now: +0.3;
- heading home from outside the range: +0.1.

Every other option gets its need terms only.

**Truth definitions (the endpoint's "simulation truth").**
- **Activity (T-ACT-1 to 4):** 1-min samples of every adult (15+) in daylight (> 0.5), classified by `src/field/categories.ts`, as the observer's own truth series does. Shares are pooled by sex. Female parts exclude lactating females. T-ACT-4 = (male + female) / 2, as the metric's truth.
- **Party size (T-PTY-1):** 15-min daylight scans with every adult as focal (lactating females excluded as focals, but counted as members). Parties by the chain rule at the profile's party link (50 m); all community members count.
- **Day range (T-RNG-4):** adult males, 5-min fixes, path per 24-h window from the start of scoring (km).
- **Observer:** the three observer team sets start at the first scored day, and their field-metric values are printed beside truth.
- **Stop rule, as operated:** R's seed-mean distance is ≤ 0.10 on all 9 rows (T-ACT-1 to 3 by sex, T-ACT-4, party size, day range).

## Amendment 1 (2026-09-29, after the free arms, before any paid run; stricter only)

Free-arm results (seeds 6501–6905; mean summed band distance; lower is better):
- R 2.04; RG 0.93 (better than R on 5/5 seeds); U 1.83; X 1.37 (better than R on 5/5).
- Median adult hunger: R 0.64, RG 0.66, U 0.39, X 0.86. Lactating females: R 0.89, RG 0.91, U 0.70, X 0.97.
- R misses on male travel (0.67), female travel (0.10), grooming for both sexes (0.25 male, 0.53 female) and male day range (0.38).

The endpoint can be improved by dilution: random choice beats rules. And gate plus sampling alone (RG) cuts the distance by 55%. The original rule could therefore credit Jev with a gain that comes from sampling. Changes, all stricter:
1. **"Jev helps"** now also requires J2 to beat **RG** by ≥ 0.05 on ≥ 4 of 5 seeds. RG is the strongest free control.
2. **Viability guard:** an arm whose median adult hunger exceeds R's by more than 0.10, or whose lactating-female median is ≥ 0.95, is "non-viable" and can't count as "helps". X fails this guard.
3. **"No difference"** now covers J2 matching RG, and the conclusion is then that "sampling and intention holding explain the gain, not Jev".

## Paid-arm settings (fixed before any paid call)

Code: `src/decide/jev-packet.ts` (packet v3), `scripts/lib/jev-paid.ts` (runner), `scripts/lib/jev-paid-report.ts` (budget and scoring), `training/decide_ft/jev_fake_worker.py` (dry runs). Nothing here changes a threshold.

**Arms.**
- **J1:** `server/decide.ts` `buildJevQuestion`, unchanged, at every decision point, argmax. No gate.
- **J2:** packet v3 from the situation facts, sampled with the same uniform as RG and U, behind the same gate.
  - Blocks: needs as buckets; day; here_now; remembered food and water (the animal's own memory, each with its age); estimates as buckets vs here; nearby.
  - Options are what / gives / costs, one register.
  - No urgency echo, no reconcile line, no lactation line.
  - The question reads "What will X do next?".
- **J2s (seed 6501):** J2 with every option's gives/costs moved to another option (a hashed derangement) and the estimates rotated across places; "what" stays.
  - The shuffled packet drives the world.
  - A hashed quarter of its states is also asked unshuffled. These are the matched states of the J2s check (total variation < 0.05 means Jev is not reading the facts).
- **Shared with the free arms:** population (8+), bounded menu, legality re-check, fallback reasons, truth scorer and observers.
- An earlier answer in the same batch may interrupt a later chimp. That chimp's choice is still applied only if legal now, and the case is counted.

**Budget.**
- One ledger for the whole test, with a ceiling of $10 per day, and one ledger run per world.
- Per-world caps are proportional to each world's cost estimated in the fake dry run, and sum to at most $10.
- A world whose guard refuses stops at once and is marked incomplete. Refusal covers the cap, the kill switch, unknown billing, and a malformed answer or worker failure.
- A stopped world is never continued by rules.

**Scoring.**
- **"By ≥ 0.05 on ≥ 4 of 5 seeds"** (vs U and vs RG) is read per seed: Δ ≤ −0.05 on at least 4 seeds. The R condition is the pre-registered one: mean Δ ≤ −0.10 and Δ < 0 on ≥ 4 seeds.
- **Incomplete worlds** are excluded from means and cannot satisfy an "on ≥ 4 of 5 seeds" condition.
- **The viability guard** uses hunger pooled over complete worlds against R's pooled median.
- **"Hurts"** is the original rule with the sign reversed (vs R and U).
