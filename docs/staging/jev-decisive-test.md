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
