# E2g pre-registration: water balance (the thirst timers)

Branch `e2g-water` from `track-e` f64cf55. Track E, stage E2g. Rules policy only; development seeds 48 and 7; no run
longer than 90 days in all. Started 2 October 2026, 07:42.

This file is written in steps, each committed before the step it governs: §1–§2 (the rule removed, sources, audit of
the targets) before any run; §3 (diagnosis readouts) before the diagnosis runs on unchanged code; §5 onwards
(mechanism, switch, arms, predictions, kill criterion) before any run of changed code; every iteration in the run log
before its run.

**Rule of this stage.** Field values of behaviour are targets, never inputs. The water ledger's inputs (water content
of foods, metabolic water per kcal oxidised, evaporative, faecal and urinary losses) must be sourced physiology or
physics; none is tuned to a drinking rate, a ranging distance or a party size.

## 0. The problem

Thirst is a set of timers counted as prescriptions (group "needs"/"feeding", outcome-encoding "5d need timer" in
`scripts/lib/prescriptions.ts`): `thirstAwakePerH` 0.026/h, `thirstSleepPerH` 0.008/h, `thirstHotC` 22 °C with
`thirstHotPerH` 0.008/h, `thirstRainRelief` 0.03 per unit rain, `fruitThirstFactor` (field 0.55 per fruit unit; tuned in
C5a against T-ACT-2 and T-RNG-4) and `drinkThirstPerH` 1.4/h at the water (src/sim/life.ts:149, execution.ts:578,
execution.ts:957). The drink offer is `thirst × 1.5 − d / drinkDistScaleM − 0.05` above thirst 0.25
(candidates.ts:359–361; `drinkDistScaleM` field 2,000 m, tuned in C5a against T-ACT-2 and T-RNG-4). Thirst also
re-draws every rules decision when its need bucket changes (rg.ts:132).

E1j's attribution run A1 (e1j-prereg.md §10; R with the three thirst timers at 0): every adult walks to water 2.3–3.1
times a day on R; without the timers males' simulation-truth daily path falls by 0.64 km and mothers' by 0.38,
parties stay together (T-PTY-1 3.80 → 4.37), males stop walking to rejoin callers, T-RNG-4 falls to 1.50 and T-ACT-3
rises out of band; all sums inside noise. So the timers carry walking and a fission clock.

## 1. Sources (step 0; audit in progress at 07:55, results in §1.1–§1.3 before any run)

Already in research.md (E2 tables) before this stage:
- *Inputs:* pontzer2021 (Abs): about 2.8 mL of water per kcal of energy intake in apes (zoo and sanctuary); "rainforest
  apes typically get enough water from food and can go days or weeks without drinking"; water turnover in L/day not
  read. Water content of Kibale foods: a gap (uwimbabazi2019 reports dry matter only). Urination interval 78 ± 32 min
  in adult males (wittig2015).
- *Targets:* T-RHY-6 drinking frequency (staged, held-out, not scored by e-bench): Gombe mothers 788 drinks in
  10,517 h (0.075/h, ~0.9 per 12 h, derived), 0.001 of observation minutes, more in the dry season (nelson2022).
  T-RHY-7 share at streams: Kanyawara 3,102 of 4,087 events (76%; mackenzie2025).

Being audited now (subagents, disjoint lists; results go to §1.1–§1.3):
- inputs: water content of fruit, figs, young leaves and pith; metabolic water per gram oxidised; respiratory,
  cutaneous, faecal and urinary losses; latent heat of vaporisation; any ape sweating or urine value;
- targets and turnover: pontzer2021 full text (ape water turnover in L/day), wild primate water turnover (doubly
  labelled water), drinking rates by site and season (nelson2022 Methods, mackenzie2025 effort, Fongoli, Mt Assirik,
  Semliki, Kibale).

## 2. Plan (registered now; each step below gets its own section, committed before it runs)

1. §1 sources and the audit of T-RHY-6 (sample, method) — commit.
2. §3 diagnosis readouts (defined from the source's Methods, smoke-tested on 1–2 days) — commit; then the diagnosis
   on R, quick (seeds 48, 7; 30 + 30 days), unchanged code: drinking bouts per day and their timing, share of travel
   that heads to water, how often a party splits when one member heads to water, thirst at drinking; and offline
   arithmetic: the water balance the model's food intake implies if fruit water were counted.
3. §5 mechanism behind a new switch (0 = today): a water ledger beside the energy ledger (in: food water, metabolic
   water, drinking; out: evaporation from E2a's heat balance, faeces, urine), thirst read from the water deficit,
   drinking valued like eating; no hourly thirst rate, no hot-hour bonus, no fruit factor. Tests: conservation
   (in − out = change in stores, exact), determinism, switch-off identity; the prescription count must fall.
4. Arms (at most 3 iterations, each logged here and committed before its run), judged against the mean of R's
   replicated quick realizations (e-noise.md amendment 2), after an identity check of R at this head.
