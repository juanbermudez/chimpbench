# E4n pre-registration: why the stack's chimpanzees stopped hunting

Branch `e4n-hunt-rate` from `track-e` 0d08525. Track E, stage E4n. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all (hunt rows at 30 + 60 days, as the cap allows). Started 4 October 2026, 10:07.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a hunting rate.

This file is written in steps, each committed before the step it governs: §0–§2 (problem, plan, target samples) and
the diagnosis plan (§3) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions,
kill criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief and the S19–S24 record; to be verified in §3)

- T-HUN-1 (hunts per community-year seen by the observer's party-follow teams; band 5–25; a band of 4–11 scaled to the
  model's adult males is staged in `docs/staging/e4e-targets.patch.json`, not applied) on the integrated candidates
  (docs/staging/e-stack2-confirm.md, confirm mode, 5 seeds, 30 + 60 days):
  S19's four runs 10.05 / 10.46 / 5.24 / 9.25 (8.7 ± 2.4); S21's four runs (S19 + `choiceBelief` 2) 5.23 / 4.03 / 4.04
  / 3.24 (4.1 ± 0.8); S22 (S21 + `leftoverRules` 3) 2.02. S23 (`walkGait`) 6.45; S24 6.85.
- What changed between S19 and S21 is E3e's `choiceBelief` 2: the fitted softmax temperature (`rgTemperature` 0.164)
  is gone; the option of highest published score (the rules' ± 0.12 jitter included) plus the belief offset of unseen
  crops is taken.
- The likely reading, **to be tested, not assumed**: without the temperature a hunt is chosen only when its value tops
  every other option at the encounter, and the hunt's value (E4e `huntValue`: (1.6 h + 0.1) × expected meat energy per
  hour ÷ the male's own ripe-fruit rate, the expectation from E4k's pursuit) rarely does; under the temperature hunts
  were partly random picks (E4e H1: 14 chosen leads; offer scores 0.045–0.067 against a best option of 0.75–0.84,
  "the candidate jitter decides most of the rare hunts").
- Field picture (sources in docs/research.md; §2): hunting follows male party size and colobus availability, comes in
  bursts, tracks fruit abundance in some studies; why chimpanzees hunt is debated (nutrients meat provides that fruit
  does not; males' social gains from sharing; gregariousness). Which value, if any, the model lacks is decided only
  after the evidence is read (§2.3) and the diagnosis names what keeps the hunt from winning (§3).

## 1. Plan

1. **Diagnosis** (§3, registered before its runs) on S22 with unchanged code: at every colobus encounter of an adult
   male (the hunting fix's impulse), the hunt option's value and its parts (expected meat, captures expected from the
   pursuit, distance, the males in view counted as hunters, the fruit rate it is divided by, the time), the winning
   option and its value, the margin, and how many of those encounters a hunt would have won under S19's temperature
   (softmax at `rgTemperature` 0.164 over the same menu); T-HUN-1..8 and the hunters' and their families' energy.
   Seeds 48 and 7, 30-day burn-in + 60 days. Name what keeps the hunt from winning, with numbers.
2. **Hunt reference** (§3.1): S22 at 30 + 60 days on seeds 48 and 7, once plus one re-draw by `rngSalt`, so the
   hunting rows of every arm rest on more than a handful of hunts. The sums are judged against the integrator's quick
   reference (S22q and three `rngSalt` re-draws, bench-run3 ea794ff).
3. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates; every
   input sourced or tagged design; no weight chosen to hit a rate. If the diagnosis shows the hunt's value is right and
   the rate is a scorer or band question (E4f's staged scorer fixes; the staged 4–11 band), this stage says so and
   stages nothing new in the model.
4. At most three iterations, each logged here and committed before its run.

## 2. Target rows and sources (step 0; written before any run)

To be completed before the diagnosis runs (samples of every T-HUN row from its source; what the sources say about why
chimpanzees hunt).

## 3. Diagnosis plan (step 1; unchanged code; committed before it runs)

To be completed before the diagnosis runs.
