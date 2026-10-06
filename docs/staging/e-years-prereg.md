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
