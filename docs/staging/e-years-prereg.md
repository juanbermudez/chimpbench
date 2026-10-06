# EY: three years in one run (registered 6 October 2026, 03:00 New York time (first commit 70c699f), before any run)

User, 6 October 2026, verbatim: "you are using gliner? If there is no decider model cost and its just scoring judging,
and even them go for longer time horizin, try a few years in one swing running it as fast as possible." These runs use
the rules kernel only (no decision model, no GPU, no paid API): the cost is CPU time. Owner: the integrator.

## 1. Question
Everything so far stops at 12 months: one lean season. Over three years (three lean seasons, a second and third birth
cohort), does the simulation hold together, and how close is it to the field numbers when the rows that need a year or
more can score? Three things are read: whether animals starve, whether the population is sustained, and how many target
rows land inside their field band.

## 2. Code change (tools only)
`MAX_TOTAL_DAYS` 730 → 1855 (five years after a 30-day burn-in; `scripts/lib/horizon.ts`), with the refusal message and
the test that pinned 730. Nothing under `src/` or `data/` changes; no parameter, switch or target moves. The identity
recorded in checkpoints includes the `scripts` tree, so the 12-month checkpoints made at 1af4543 cannot be extended:
these runs start from day 0 in a frozen detached checkout of the commit that holds this file (`bench-y3`).

## 3. Arms (parameter files in `docs/staging/integrator-kit/params/`)
| label | parameters | runs |
| --- | --- | --- |
| Y3-W25, Y3-W25-s1 | S39 + `pithFibreSwallowed` 0.25 (`M6-W25.json`, `M6-W25-s1.json`) | rngSalt 0 and 1 |
| Y3-W50, Y3-W50-s1 | S39 + `pithFibreSwallowed` 0.5 (`M6-W50.json`, `M6-W50-s1.json`) | rngSalt 0 and 1 |
| Y3-T0 | today's model (`M6-T0.json`, no overrides) | rngSalt 0 |

Seeds 48, 7, 21, 5, 11 (the confirm seeds), burn-in 30 days, 1,095 scored days (`e-run.ts plan --seeds 48,7,21,5,11 --days 1095 --burn-in
30`), natural aging. 25 seed-runs in all. S39 with all the fibre swallowed is not an arm: it starves in the first year
(6 deaths in 20 seed-runs) and the user asked for speed. W50 runs whatever its 12-month result (not known when this
was written): if it starves at 12 months, three years show what that does to a population. Up to 10 simulation jobs at
once (5 runners × 2), which the user's "as fast as possible" allows for this run.

## 4. Readouts (fixed now; nothing is judged as a keep, no input is tuned from them)
Per arm, from the run JSON by script: starvation deaths (by class and seed); e-bench viability per run; births and
deaths, and living at the start and the end per seed; deaths by cause; each class's lowest mean reserve; rows by verdict
(pass, fail, inconclusive, insufficient, not scorable, sealed) for fitted and held-out targets, and the rows whose
verdict differs between the arms and today's model; the summed band distances on rows scored in every run (for
information: no noise group exists at this horizon, so no z is computed and no difference is called a result); rare
events as counted by the scorecard's rows, with the known observer defects (`e-rebaseline.md` Part D: failed
infanticide attacks counted as killings, fight killings within a community not counted) stated beside them.

## 5. Known limits, stated before the run
- No tool here has run past 730 days: a failure of the tools at this length (memory, a readout that assumes one year)
  is itself a result and is reported with its log.
- Two runs per wadging arm and one of today's model: starvation counts are over 10 seed-runs per arm, half the 20 of
  E1v; a zero is weaker evidence than E1v's.
- Wall time and CPU time are reported; the estimate is 45 minutes per seed-run on an idle core (2.3 s per simulated
  day, measured on the 6-month runs of this computer).

## 6. Prediction (integrator, low confidence)
W25: no starvation in 10 seed-runs; populations flat or rising. W50: a few starvation deaths, concentrated in lean
seasons, populations sustained. Today's model: no starvation (it has no energy ledger). Rows inside their band: the
arms above today's model on held-out rows, below it on fitted rows, as at 6 and 12 months.

## 7. Result (6 October 2026, 10:25; the tables are the judge's output, unedited)

**Run notes.** All 25 seed-runs finished. Wall time 03:01 to about 10:15, far over the estimate: ten three-year
simulations at once did not fit in 16 GB (each holds about 2 GB by its second year), the machine thrashed, and four
jobs were paused for part of the run. Each run's merge step failed in the frozen checkout with a stack overflow
(`push(...array)` on three years of energy records; fixed on track-e since) and was re-run there with the same code
and a larger stack (`node --stack-size=60000`). No end checkpoints were written (a custom horizon writes none), so the
rare-event rows cannot be recounted with the observer fixes of `obs-fixes-prereg.md`.

**Starvation over three years** (10 seed-runs per wadging share, 5 for today's model): **13 deaths at a swallowed
share of 0.5 (7 and 6), 2 at 0.25 (1 and 1), 5 in today's model.** At 12 months the two shares had 0 in 20 seed-runs
each (`e1v-prereg.md` §8.4), so at 0.5 starvation comes back in the second and third years.

**Populations.** Every S39 seed-run but two ends above its start (lowest 0.98); births exceed deaths in every S39 run
(66 to 71 births against 27 to 42 deaths). Today's model: 62 births against 59 deaths, two of five seeds end below
their start (lowest 0.76), with 32 deaths in respiratory outbreaks.

**Rows inside their field band:** 41 to 43 for the S39 runs and 38 for today's model, with 42 to 46 and 43 outside.
About half of the rows that get a verdict, as at 6 and 12 months.

**Against the prediction (§6):** wrong on all three starvation counts (predicted none at 0.25, "a few" at 0.5, none in
today's model). Right that populations are sustained on S39 and that S39 leads on held-out rows and trails on fitted
ones, by small margins that no noise group at this horizon can judge.

**What it does not show.** Why starvation returns at 0.5: more animals on the same food as the populations grow, a
worse lean season in a later year, or an ageing founder cohort are all possible and none was tested. Whether any
starvation at all is wrong: wild chimpanzees do lose condition in lean seasons, and no target row gives a starvation
rate. The viability rule (no starvation death) fails every run here, today's model included.

### EY: three years in one run (1,095 scored days after a 30-day burn-in; seeds 48, 7, 21, 5, 11); printed by docs/staging/integrator-kit/scripts/judge_y3.py from the JSON

| run | commit | prescriptions | viability | births | deaths | starvation deaths (by seed) | living, start → end, per seed | lowest end ÷ start |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Y3-T0 (today's model) | ff25953 | 147 | FAIL: 5 starvation deaths; a seed ends at 76% of its starting population (< 80%) | 62 | 59 | 5 (48:3, 7:2) | 49→53 / 49→56 / 49→56 / 49→46 / 49→37 | 0.76 |
| Y3-W50 (S39, swallowed 0.5) | ff25953 | 42 | FAIL: 7 starvation deaths | 71 | 34 | 7 (48:3, 7:1, 21:2, 11:1) | 49→55 / 49→53 / 49→57 / 49→59 / 49→58 | 1.08 |
| Y3-W50-s1 (S39, swallowed 0.5, rngSalt 1) | ff25953 | 42 | FAIL: 6 starvation deaths | 66 | 42 | 6 (48:3, 21:1, 5:1, 11:1) | 49→56 / 49→52 / 49→55 / 49→55 / 49→51 | 1.04 |
| Y3-W25 (S39, swallowed 0.25) | ff25953 | 42 | FAIL: 1 starvation death | 71 | 40 | 1 (11:1) | 49→53 / 49→48 / 49→57 / 48→59 / 49→58 | 0.98 |
| Y3-W25-s1 (S39, swallowed 0.25, rngSalt 1) | ff25953 | 42 | FAIL: 1 starvation death | 68 | 27 | 1 (21:1) | 49→59 / 49→48 / 49→55 / 49→61 / 49→63 | 0.98 |

**Deaths by cause, summed over the five seeds:**

- Y3-T0: respiratory illness (outbreak) 32, illness 14, orphaned infant, did not survive without its mother 7, starvation 5, old age 1
- Y3-W50: illness 17, starvation 7, respiratory illness (outbreak) 7, orphaned infant, did not survive without its mother 2, wounds from a fight with Jambiri 1
- Y3-W50-s1: illness 15, respiratory illness (outbreak) 14, starvation 6, wounds from a fight with Jambiri 4, orphaned infant, did not survive without its mother 2, infanticide 1
- Y3-W25: illness 17, respiratory illness (outbreak) 11, wounds from a fight with Jambiri 6, orphaned infant, did not survive without its mother 5, starvation 1
- Y3-W25-s1: illness 13, wounds from a fight with Jambiri 6, orphaned infant, did not survive without its mother 3, infanticide 2, respiratory illness (outbreak) 2, starvation 1

**Target rows by verdict** (150 rows; a row is "pass" inside its field band):

| run | pass | fail | inconclusive | insufficient | n/a | not scorable | sealed | structural | fitted pass / fail | held-out pass / fail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Y3-T0 | 38 | 43 | 17 | 7 | 10 | 18 | 12 | 1 | 11 / 15 | 27 / 28 |
| Y3-W50 | 41 | 44 | 22 | 6 | 10 | 14 | 12 | 1 | 13 / 12 | 28 / 32 |
| Y3-W50-s1 | 43 | 44 | 24 | 2 | 10 | 14 | 12 | 1 | 11 / 12 | 32 / 32 |
| Y3-W25 | 41 | 46 | 22 | 4 | 10 | 14 | 12 | 1 | 11 / 13 | 30 / 33 |
| Y3-W25-s1 | 41 | 42 | 26 | 4 | 10 | 14 | 12 | 1 | 10 / 12 | 31 / 30 |

**Rows that fail in today's model and pass in every S39 run (5):** T-PTY-4 Female gregariousness; T-COM-4 Calling context; T-RHY-3 Nest departure relative to sunrise; T-RHY-8 Rest and ground use rise with heat; T-INF-6 Grooming between mothers and their own unweaned infants

**Rows that pass in today's model and fail in every S39 run (6):** T-ACT-3 Adult grooming share of daytime; T-ACT-5 Sex and reproductive-state differences in activity; T-RNG-5 Lactating female day range relative to males; T-HUN-9 Meat sharing; T-DEM-13 Birth interval after infant death; T-ENE-7 Males feed less on days with parous oestrous females

**Lowest point of each class's mean reserve trajectory (relative to the store):**

| class | Y3-W50 | Y3-W50-s1 | Y3-W25 | Y3-W25-s1 |
| --- | --- | --- | --- | --- |
| adult male | -0.030 | -0.032 | -0.032 | -0.029 |
| female, lactating | -0.102 | -0.102 | -0.106 | -0.104 |
| female, other | -0.067 | -0.071 | -0.066 | -0.066 |
| infant 0.5–2 y | -0.165 | -0.160 | -0.154 | -0.152 |
| infant 2–5 y | -0.157 | -0.133 | -0.145 | -0.140 |
| infant < 0.5 y | -0.181 | -0.254 | -0.178 | -0.157 |
| juvenile 5–12 y | -0.239 | -0.209 | -0.186 | -0.182 |
