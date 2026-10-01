# E0 baseline: today's field model under the Track E benchmark

Stage E0 of Track E (IMPLEMENTATION_PLAN.md). Made on 1 October 2026 on branch `worktree-agent-a077bf316f90f6184` with the registry defaults (no overrides), 2 workers, development seeds only. The full outputs are in `artifacts/validation/e/` (gitignored); the two summaries below are copies of `baseline-quick.md` and `baseline-confirm.md`. The ledger is in `docs/staging/e0-ledger.md`.

## Commands

```sh
pnpm exec tsx scripts/e-bench.ts --quick   --workers 2 --out artifacts/validation/e/baseline-quick     # seeds 48, 7; 30 days after a 30-day burn-in; 90 s
pnpm exec tsx scripts/e-bench.ts --confirm --workers 2 --out artifacts/validation/e/baseline-confirm   # seeds 48, 7, 21, 5, 11; 60 days after 30; 276 s
pnpm exec tsx scripts/prescription-ledger.ts                                                         # artifacts/validation/e/e0-ledger.{md,json}; 1 s
# after a change (same mode, same seeds), with its registry switch:
pnpm exec tsx scripts/e-bench.ts --confirm --params '{"switchId":1}' --out artifacts/validation/e/<label> --compare artifacts/validation/e/baseline-confirm.json
```

`--full` (365 days after a 180-day burn-in) stays in the script and is refused without `--allow-long`: the user's limit of 1 October 2026 is 3 months of simulation in all. It was not run. `--confirm` is the deciding benchmark until the limit is lifted.

## Headline numbers

| | Quick (2 seeds, 30 + 30 days) | Confirm (5 seeds, 30 + 60 days) |
| --- | --- | --- |
| 1. Fitted band distance | 3.427 over 18 rows | 3.282 over 19 rows |
| left out of the fitted sum | 14 need a year, 0 without a value, 1 flagged, 4 pattern rows | 14 need a year, 0 without a value, 0 flagged, 4 pattern rows |
| 2. Held-out band distance | 4.609 over 17 rows | 5.897 over 19 rows |
| left out of the held-out sum | 19 need a year, 8 without a value, 4 flagged, 13 pattern rows, 12 sealed | 19 need a year, 6 without a value, 4 flagged, 13 pattern rows, 12 sealed |
| 3. Prescription count | 132 (123 registry entries + 9 literals) | 132 |
| Viability | pass: 0 births, 0 deaths, 0 starvation deaths | pass: 0 births, 2 deaths, 0 starvation deaths |
| Wall time, 2 workers | 90 s | 276 s |

## What these numbers can and cannot carry

- **The 33 rows that need a year are not measured.** Annual ranges, statistics across months, life tables and rare events per community-year (list: `NEEDS_YEAR` in `scripts/e-bench.ts`) are reported as insufficient. The sums cover 35–38 of the 98 unsealed rows. A change that harms demography, killings or seasonal patterns is invisible here.
- **Viability is weak at this length.** 60 days hold 0–2 births and deaths, so births ÷ deaths is not applied below 10 events (the output says so). What still decides: starvation deaths, no seed below 80% of its starting population, and the hunger medians (adults 0.37–0.43, lactating females 0.54–0.62 at baseline). C8's lactation starvation took years to show.
- **Short-window noise.** Between the quick and the confirm baseline, rows scored in both moved by up to 0.8 (T-SOC-9 0.81 → 0.02; T-COM-11 0.17 → 0.72). Treat a quick-mode difference under about 1 as noise; decide on confirm.
- **The row set can still shift between a before and an after run** through data (no patrol seen, an instrument below its bar). `--compare` prints the change on rows scored in both runs beside the raw change, and lists the rows scored in one run only. Use the both-runs figure.
- **One row dominates the held-out sum in confirm:** T-BRD-1 (2.69 of 5.90), from one seed with border stops. The capped sum (each row at most one band width) is 4.20.

---

## E-bench: baseline-quick (quick)

Field profile, 30 days after a 30-day burn-in, seeds 48, 7, overrides none. Generated 2026-10-01T18:50:38.068Z by `scripts/e-bench.ts` at commit `e42ec915c8` (worktree-agent-a077bf316f90f6184, 5 uncommitted files in src, scripts or data). Protocol hash `a2228c2df476680b`, registry hash `57903c4cdc400019`. Wall time 89 s (scorecard 63 s, viability replay 26 s) on 2 workers.

The scored window is 30 days: rows that need a year (annual ranges, statistics across months, life tables, rare events per year) are reported as insufficient and left out of the sums. Compare this run only with runs of the same mode.

## Headline

| Number | Value |
| --- | --- |
| 1. Summed band distance, fitted rows | **3.427** over 18 rows (8 outside their band); left out: 14 need a longer window, 0 without a value, 1 flagged, 4 pattern rows |
| 2. Summed band distance, held-out rows | **4.609** over 17 rows (13 outside their band); left out: 19 need a longer window, 8 without a value, 4 flagged, 13 pattern rows, 12 sealed |
| 3. Prescription count | **132** (123 outcome-encoding registry entries in use + 9 literals in src/sim) |
| Viability | **pass**: births 0, deaths 0, births ÷ deaths —, starvation deaths 0; too few births and deaths to compare them |

Band distance is 0 inside a row's band, else the gap to the nearest edge ÷ the band width (one-sided bands: ÷ the edge value); rows scored on parts take the mean of their parts. Pattern rows have no distance and are counted apart; so are rows without a value. Rows that need a longer window than the run, and compromised, not-scorable and instrument-below-bar rows, are shown and never summed; sealed rows show nothing (scripts/lib/band-distance.ts).

- Fitted: 3.427 over 18 rows (8 outside their band; capped at one band width per row: 3.236); left out: 14 rows that need a longer window, 0 numeric rows without a value, 1 flagged (compromised, not scorable or instrument below its bar); pattern rows 1 pass / 1 fail / 2 not scored. Of which encoded rows: 0.167 over 2.
- Held-out: 4.609 over 17 rows (13 outside their band; capped at one band width per row: 4.489); left out: 19 rows that need a longer window, 8 numeric rows without a value, 4 flagged (compromised, not scorable or instrument below its bar); pattern rows 1 pass / 8 fail / 4 not scored. Of which encoded rows: 0.267 over 2. Sealed rows (C8 proof only): 12.

## Viability (simulation truth, scored window)

| Seed | Living start → end | Births | Deaths | Births ÷ deaths | Starvation deaths | Orphaned-infant deaths | Median adult hunger | Median lactating hunger | Deaths by cause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | 49 → 49 | 0 | 0 | — | 0 | 0 | 0.37 | 0.53 | — |
| 7 | 49 → 49 | 0 | 0 | — | 0 | 0 | 0.38 | 0.56 | — |

Guard: pooled births ≥ pooled deaths (applied from 10 births and deaths together; not applied here), no starvation death in the scored window, no seed below 80% of its starting population. Passes.

## Rows furthest from their bands

| Row | Role | Metric | Band | Pooled value | Distance |
| --- | --- | --- | --- | --- | --- |
| T-HUN-2 | fitted | Hunt success | 0.5–0.8 | 0.14 | 1.190 |
| T-HUN-4 | held-out | More males, more hunting | 1.05–1.8 | 2.64 | 1.120 |
| T-SOC-9 | fitted | Reconciliation | 0.08–0.22 | 0.33 | 0.810 |
| T-FOOD-2 | fitted | Fruit share of feeding time | 0.6–0.78 | 0.91 | 0.719 |
| T-PAT-7 | held-out | Patrol contact and violence | 0.15–0.45 | 0.00 | 0.500 |
| T-IGE-2 | held-out | Share of encounters that are auditory only | 0.7–0.9 | 1.00 | 0.500 |
| T-PAT-2 | held-out | Per-male patrol participation | 7–18 | 1.74 | 0.478 |
| T-SOC-3 | held-out | Grooming reciprocity | 0.45–0.8 | 0.94 | 0.392 |
| T-FOOD-10 | held-out | Breakfast planning | 0.08–0.3 | 0.00 | 0.364 |
| T-HUN-8 | held-out | Adult males make most kills | 0.8–0.95 | 1.00 | 0.333 |

## Fitted rows

| Row | Enc. | Band | Pooled | Per seed | Verdict | Distance | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 |  | 0.33–0.5 | male 0.39, female 0.45 | 0.42 / 0.42 | pass | 0.000 |  |
| T-ACT-2 |  | 0.12–0.25 | male 0.23, female 0.16 | 0.18 / 0.20 | pass | 0.000 | tuned |
| T-ACT-3 |  | 0.08–0.18 | male 0.11, female 0.16 | 0.14 / 0.12 | pass | 0.000 |  |
| T-ACT-4 |  | 0.3–0.47 | 0.32 | 0.33 / 0.30 | pass | 0.000 |  |
| T-PTY-1 |  | 3–9 | 2.42 | 2.44 / 2.40 | fail | 0.097 | revised post hoc; tuned |
| T-RNG-1 |  | 5–16 | 1.63 | 0.99 / 2.28 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-3 |  | 0.75–0.9 | 0.74 | 0.80 / 0.68 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-4 |  | 1.5–3.5 | 2.75 | 2.54 / 2.96 | fail | 0.000 | tuned; held as fail |
| T-IGE-1 |  | 5–12 | 5.91 | 9.15 / 2.87 | pass | 0.000 | revised post hoc |
| T-IGE-4 | yes | as reported | — | — / — | insufficient | — | revised post hoc; pattern row: no distance |
| T-PAT-1 |  | 0.1–0.5 | 0.04 | 0.00 / 0.08 | inconclusive | 0.153 | revised post hoc; tuned |
| T-PAT-6 |  | 0.4–0.7 | 0.00 | 0.00 / 0.00 | fail | 1.333 | revised post hoc; instrument below bar; not summed |
| T-LET-1 |  | 0.02–0.36 | 0.00 | 0.00 / 0.00 | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-FOOD-1 | yes | 0.06–0.11 | 0.10 | 0.11 / 0.09 | insufficient | — | window too short (a statistic across the months of a year) |
| T-FOOD-2 |  | 0.6–0.78 | 0.91 | 0.91 / 0.91 | fail | 0.719 |  |
| T-FOOD-11 |  | 60–160 | 159.12 | 137.49 / 180.75 | insufficient | — | window too short (a statistic across the months of a year) |
| T-HUN-1 |  | 5–25 | 22.31 | 32.44 / 12.17 | pass | 0.000 | revised post hoc |
| T-HUN-2 |  | 0.5–0.8 | 0.14 | 0.22 / 0.00 | fail | 1.190 |  |
| T-HUN-3 |  | 0.05–0.4 | 0.04 | 0.04 / 0.03 | fail | 0.041 |  |
| T-HUN-7 |  | 1.2–2 | 1.00 | 1.00 / — | fail | 0.250 |  |
| T-SOC-7 |  | 3–7 | — | — / — | insufficient | — | window too short (life history over years) |
| T-SOC-8 | yes | as reported | 0.00 | 0.00 / — | fail | — | revised post hoc; pattern row: no distance |
| T-SOC-9 |  | 0.08–0.22 | 0.33 | — / 0.33 | fail | 0.810 | revised post hoc |
| T-DEM-1 |  | 0.11–0.19 | — | — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-2 |  | female 31–39, male 18–24 | — | — / — | insufficient | — | window too short (life history over years) |
| T-DEM-5 |  | 0.07–0.15 | 0.00 | 0.00 / 0.00 | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-6 |  | attack 0.4–0.9, mortality 0–0.17 | — | — / — | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-9 |  | 0.1–0.3 | — | — / — | insufficient | — | window too short (life history over years) |
| T-DEM-10 |  | 0.15–0.25 | — | — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-11 |  | 13.5–16 | — | — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-12 |  | 4.8–6.6 | — | — / — | insufficient | — | window too short (life history over years) |
| T-COM-1 | yes | 0.5–1.5 | 0.93 | 0.91 / 0.96 | pass | 0.000 |  |
| T-COM-5 |  | 2–4 | 2.99 | 2.84 / 3.14 | pass | 0.000 | tuned |
| T-COM-6 |  | as reported | 4.00 | 4.00 / 4.00 | pass | — | pattern row: no distance |
| T-COM-8 |  | 0.3–0.6 | 0.47 | 0.49 / 0.46 | pass | 0.000 |  |
| T-COM-10 |  | core repertoire fitted; juvenile > adult repertoire held out | — | — | n/a | — | pattern row: no distance |
| T-COM-11 | yes | 0.25–0.55 | 0.20 | 0.00 / 0.33 | fail | 0.167 | revised post hoc |

## Held-out rows

| Row | Enc. | Band | Pooled | Per seed | Verdict | Distance | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-5 |  | male–female feeding difference ≤ 0.05; lactating females … | -0.06 | -0.05 / -0.07 | fail | — | model revised post-freeze; pattern row: no distance |
| T-PTY-2 |  | weak habitat-fruit effect (R² ≤ 0.1); patch-size effect R… | — | — / — | insufficient | — | window too short (a statistic across the months of a year); pattern row: no distance |
| T-PTY-3 |  | periphery parties have ≥ 1.5× the males of core-only parties | 1.01 | 1.02 / 1.00 | fail | — | pattern row: no distance |
| T-PTY-4 |  | 0.15–0.45 | 0.58 | 0.59 / 0.57 | fail | 0.432 | compromised; not summed |
| T-RNG-2 |  | 0.3–1.2 | -0.00 | -0.23 / 0.23 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-5 |  | 0.3–0.6 | 0.64 | 0.67 / 0.61 | fail | 0.145 | model revised post-freeze |
| T-RNG-6 |  | 1.2–3 | — | — / — | insufficient | — | revised post hoc; window too short (annual range) |
| T-IGE-2 |  | 0.7–0.9 | 1.00 | 1.00 / 1.00 | fail | 0.500 | revised post hoc |
| T-IGE-3 |  | 0.25–0.75 | — | — / — | insufficient | — | revised post hoc; no value: not summed |
| T-IGE-5 |  | 0.6–1.1 | 0.81 | 0.47 / 1.16 | scale | — | revised post hoc; compromised; not summed; no value: not summed |
| T-PAT-2 |  | 7–18 | 1.74 | 0.00 / 3.48 | fail | 0.478 | revised post hoc; model revised post-freeze |
| T-PAT-3 |  | 0.55–0.85 | 0.57 | — / 0.57 | pass | 0.000 | revised post hoc; model revised post-freeze |
| T-PAT-4 | yes | positive male and fruit effects; no oestrous effect | — | — / — | insufficient | — | compromised; window too short (a statistic across the months of a year); not summed; pattern row: no distance |
| T-PAT-5 |  | 60–240 | 176.00 | — / 176.00 | pass | 0.000 | revised post hoc; model revised post-freeze |
| T-PAT-7 |  | 0.15–0.45 | 0.00 | — / 0.00 | fail | 0.500 | revised post hoc; model revised post-freeze |
| T-PAT-8 |  | -0.057–0.17 | — | — / — | insufficient | — | not scorable; window too short (a statistic across the months of a year); not summed |
| T-BRD-1 |  | 0.037–0.107 | — | — / — | insufficient | — | no value: not summed |
| T-PAT-9 | yes | 0.5–1 | — | — / — | insufficient | — | window too short (rare events counted per community-year) |
| T-LET-2 |  | 0.6–0.85 | — | — / — | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-LET-3 | yes | 4–16 | — | — / — | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-LET-4 |  | 0.1–0.35 | — | — | n/a | — | partially encoded; no value: not summed |
| T-LET-5 | | sealed | | | sealed | | Payoff of expansion (scenario) |
| T-LET-6 |  | 0.6–1 | — | — / — | insufficient | — | revised post hoc; model revised post-freeze; window too short (rare events counted per community-year) |
| T-FIS-1 |  | no fission below ~10 adult males; ≤ 1 per 100 community-y… | — | — | n/a | — | pattern row: no distance |
| T-FIS-2 |  | 1–3 | — | — | n/a | — | no value: not summed |
| T-FIS-3 |  | ≥ 5 | — | — | n/a | — | no value: not summed |
| T-FIS-4 |  | bonds do not protect after fission | — | — | n/a | — | pattern row: no distance |
| T-FIS-5 |  | 6.1905–11.4069 | — | — | n/a | — | no value: not summed |
| T-FOOD-3 |  | ≥ 0.3 | — | — / — | insufficient | — | window too short (a statistic across the months of a year) |
| T-FOOD-4 |  | 4–15 | 5.32 | 5.48 / 5.16 | pass | 0.000 | compromised; not summed |
| T-FOOD-5 | yes | 0.15–0.45 | 0.08 | 0.07 / 0.09 | fail | 0.222 |  |
| T-FOOD-6 |  | 2–7 | 5.50 | 5.54 / 5.45 | pass | 0.000 |  |
| T-FOOD-7 | yes | 300–800 | 277.50 | 246.27 / 308.74 | fail | 0.045 |  |
| T-FOOD-8 |  | 0.05–0.25 | — | — | n/a | — | no value: not summed |
| T-FOOD-9 |  | slow near goal; faster to figs | — | — | n/a | — | pattern row: no distance |
| T-FOOD-10 |  | 0.08–0.3 | 0.00 | 0.00 / 0.00 | fail | 0.364 |  |
| T-HUN-4 |  | 1.05–1.8 | 2.64 | 3.96 / 1.41 | fail | 1.120 | model revised post-freeze |
| T-HUN-5 |  | ≥ 0.1 | — | — / — | insufficient | — | model revised post-freeze; window too short (a statistic across the months of a year) |
| T-HUN-6 |  | ≥ 1.5 | — | — / — | insufficient | — | model revised post-freeze; window too short (a statistic across the months of a year) |
| T-HUN-8 |  | 0.8–0.95 | 1.00 | 1.00 / — | fail | 0.333 | model revised post-freeze |
| T-HUN-9 |  | about half of those present eat; bond partners favoured ~… | 0.00 | 0.00 / — | fail | — | model revised post-freeze; pattern row: no distance |
| T-HUN-10 |  | decline under 6–12%/y offtake; persistence under low offtake | — | — | n/a | — | pattern row: no distance |
| T-SOC-1 |  | 4–10 | — | — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-SOC-2 |  | 0.55–0.9 | 0.95 | 1.00 / 0.88 | fail | 0.143 |  |
| T-SOC-3 |  | 0.45–0.8 | 0.94 | 0.96 / 0.91 | fail | 0.392 | revised post hoc |
| T-SOC-4 | yes | 0.1–0.3 | 0.07 | 0.07 / 0.08 | fail | 0.140 | compromised; not summed |
| T-SOC-5 |  | 0.2–0.7 | 0.13 | 0.07 / 0.18 | fail | 0.145 | revised post hoc |
| T-SOC-6 |  | 0.6–0.9 | 0.53 | 0.56 / 0.51 | fail | 0.223 |  |
| T-SOC-10 |  | 0.1–0.3 | 0.12 | 0.06 / 0.16 | pass | 0.000 | revised post hoc |
| T-SOC-11 |  | 0.25–0.55 | — | — / — | insufficient | — | window too short (life history over years) |
| T-SOC-12 |  | captive; qualitative | 6.28 | 6.05 / 6.51 | pass | — | pattern row: no distance |
| T-SOC-13 |  | ≥ 26 | — | — | structural | — | no value: not summed |
| T-DEM-3 |  | 0.25–0.45 | — | — / — | insufficient | — | model revised post-freeze; window too short (life history over years) |
| T-DEM-4 |  | disease 0.25–0.6, aggression 0.1–0.25 | — | — / — | insufficient | — | window too short (life history over years) |
| T-DEM-7 |  | infants and older adults at higher risk | — | — / — | insufficient | — | window too short (rare events counted per community-year); pattern row: no distance |
| T-DEM-8 |  | 5–20 | 0.00 | 0.00 / 0.00 | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-13 |  | 1.8–2.6 | — | — / — | insufficient | — | model revised post-freeze; window too short (life history over years) |
| T-DEM-14 | | sealed | | | sealed | | Female rank and fertility |
| T-DEM-15 | | sealed | | | sealed | | Maternal loss after weaning |
| T-COM-2 |  | rate falls with rank number | 0.09 | 0.10 / 0.08 | fail | — | pattern row: no distance |
| T-COM-3 | yes | periphery rate below core rate | 0.74 | 0.87 / 0.62 | fail | — | pattern row: no distance |
| T-COM-4 | yes | travel most common; fruit > herbs | 0.46 | 0.48 / 0.45 | fail | — | pattern row: no distance |
| T-COM-7 |  | less drumming in large parties | 0.17 | 0.19 / 0.14 | fail | — | pattern row: no distance |
| T-COM-9 |  | status, not food amount | 0.17 | 0.18 / 0.16 | fail | — | pattern row: no distance |
| T-DEM-16 | | sealed | | | sealed | | Survival of daughters orphaned at 5–9.99 y |
| T-DEM-17 | | sealed | | | sealed | | Sex difference in the survival cost of maternal loss at 10–14.99 y |
| T-DEM-18 | | sealed | | | sealed | | Stress activation after maternal loss fades |
| T-DEM-19 | | sealed | | | sealed | | Lean-mass proxy: orphans vs non-orphans |
| T-DEM-20 | | sealed | | | sealed | | Lean-mass proxy: alpha mother vs other mothers |
| T-DEM-21 | | sealed | | | sealed | | Neighbour pressure during pregnancy and offspring survival |
| T-DEM-22 | | sealed | | | sealed | | Neighbour pressure: pregnancy window stronger than lactation windows |
| T-DEM-23 | | sealed | | | sealed | | Aggression received by immatures, by sex |
| T-DEM-24 | | sealed | | | sealed | | One-year survival after maternal loss, by age at loss |

---

## E-bench: baseline-confirm (confirm)

Field profile, 60 days after a 30-day burn-in, seeds 48, 7, 21, 5, 11, overrides none. Generated 2026-10-01T18:55:20.022Z by `scripts/e-bench.ts` at commit `e42ec915c8` (worktree-agent-a077bf316f90f6184, 5 uncommitted files in src, scripts or data). Protocol hash `a2228c2df476680b`, registry hash `57903c4cdc400019`. Wall time 275 s (scorecard 158 s, viability replay 118 s) on 2 workers.

The scored window is 60 days: rows that need a year (annual ranges, statistics across months, life tables, rare events per year) are reported as insufficient and left out of the sums. Compare this run only with runs of the same mode.

## Headline

| Number | Value |
| --- | --- |
| 1. Summed band distance, fitted rows | **3.282** over 19 rows (9 outside their band); left out: 14 need a longer window, 0 without a value, 0 flagged, 4 pattern rows |
| 2. Summed band distance, held-out rows | **5.897** over 19 rows (11 outside their band); left out: 19 need a longer window, 6 without a value, 4 flagged, 13 pattern rows, 12 sealed |
| 3. Prescription count | **132** (123 outcome-encoding registry entries in use + 9 literals in src/sim) |
| Viability | **pass**: births 0, deaths 2, births ÷ deaths 0.00, starvation deaths 0; too few births and deaths to compare them |

Band distance is 0 inside a row's band, else the gap to the nearest edge ÷ the band width (one-sided bands: ÷ the edge value); rows scored on parts take the mean of their parts. Pattern rows have no distance and are counted apart; so are rows without a value. Rows that need a longer window than the run, and compromised, not-scorable and instrument-below-bar rows, are shown and never summed; sealed rows show nothing (scripts/lib/band-distance.ts).

- Fitted: 3.282 over 19 rows (9 outside their band; capped at one band width per row: 3.257); left out: 14 rows that need a longer window, 0 numeric rows without a value, 0 flagged (compromised, not scorable or instrument below its bar); pattern rows 1 pass / 1 fail / 2 not scored. Of which encoded rows: 0.718 over 2.
- Held-out: 5.897 over 19 rows (11 outside their band; capped at one band width per row: 4.203); left out: 19 rows that need a longer window, 6 numeric rows without a value, 4 flagged (compromised, not scorable or instrument below its bar); pattern rows 1 pass / 8 fail / 4 not scored. Of which encoded rows: 0.189 over 2. Sealed rows (C8 proof only): 12.

## Viability (simulation truth, scored window)

| Seed | Living start → end | Births | Deaths | Births ÷ deaths | Starvation deaths | Orphaned-infant deaths | Median adult hunger | Median lactating hunger | Deaths by cause |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | 49 → 49 | 0 | 0 | — | 0 | 0 | 0.37 | 0.54 | — |
| 7 | 49 → 49 | 0 | 0 | — | 0 | 0 | 0.41 | 0.60 | — |
| 21 | 48 → 48 | 0 | 0 | — | 0 | 0 | 0.37 | 0.56 | — |
| 5 | 49 → 49 | 0 | 0 | — | 0 | 0 | 0.41 | 0.59 | — |
| 11 | 49 → 47 | 0 | 2 | 0.00 | 0 | 0 | 0.43 | 0.62 | illness 2 |

Guard: pooled births ≥ pooled deaths (applied from 10 births and deaths together; not applied here), no starvation death in the scored window, no seed below 80% of its starting population. Passes.

## Rows furthest from their bands

| Row | Role | Metric | Band | Pooled value | Distance |
| --- | --- | --- | --- | --- | --- |
| T-BRD-1 | held-out | Advance after border stops | 0.037–0.107 | 0.30 | 2.694 |
| T-HUN-2 | fitted | Hunt success | 0.5–0.8 | 0.19 | 1.026 |
| T-COM-11 (enc.) | fitted | Alarm calls track audience knowledge | 0.25–0.55 | 0.03 | 0.718 |
| T-FOOD-2 | fitted | Fruit share of feeding time | 0.6–0.78 | 0.90 | 0.673 |
| T-HUN-4 | held-out | More males, more hunting | 1.05–1.8 | 2.30 | 0.667 |
| T-PAT-2 | held-out | Per-male patrol participation | 7–18 | 1.43 | 0.506 |
| T-PAT-7 | held-out | Patrol contact and violence | 0.15–0.45 | 0.00 | 0.500 |
| T-SOC-3 | held-out | Grooming reciprocity | 0.45–0.8 | 0.92 | 0.347 |
| T-IGE-2 | held-out | Share of encounters that are auditory only | 0.7–0.9 | 0.97 | 0.344 |
| T-PAT-6 | fitted | Incursion share | 0.4–0.7 | 0.30 | 0.333 |

## Fitted rows

| Row | Enc. | Band | Pooled | Per seed | Verdict | Distance | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-1 |  | 0.33–0.5 | male 0.40, female 0.44 | 0.43 / 0.42 / 0.42 / 0.43 / 0.41 | pass | 0.000 |  |
| T-ACT-2 |  | 0.12–0.25 | male 0.22, female 0.17 | 0.18 / 0.19 / 0.18 / 0.19 / 0.20 | pass | 0.000 | tuned |
| T-ACT-3 |  | 0.08–0.18 | male 0.10, female 0.14 | 0.13 / 0.12 / 0.11 / 0.11 / 0.13 | pass | 0.000 |  |
| T-ACT-4 |  | 0.3–0.47 | 0.33 | 0.34 / 0.32 / 0.35 / 0.30 / 0.35 | pass | 0.000 |  |
| T-PTY-1 |  | 3–9 | 2.56 | 2.65 / 2.50 / 2.46 / 2.48 / 2.72 | fail | 0.073 | revised post hoc; tuned |
| T-RNG-1 |  | 5–16 | 2.19 | 1.41 / 2.15 / 2.11 / 2.53 / 2.77 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-3 |  | 0.75–0.9 | 0.83 | 0.78 / 0.79 / 0.88 / 0.84 / 0.85 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-4 |  | 1.5–3.5 | 2.67 | 2.47 / 2.89 / 2.60 / 2.49 / 2.91 | fail | 0.000 | tuned; held as fail |
| T-IGE-1 |  | 5–12 | 9.02 | 28.56 / 2.89 / 7.89 / 0.00 / 6.21 | inconclusive | 0.000 | revised post hoc |
| T-IGE-4 | yes | as reported | — | — / — / — / — / — | insufficient | — | revised post hoc; pattern row: no distance |
| T-PAT-1 |  | 0.1–0.5 | 0.04 | 0.00 / 0.04 / 0.08 / 0.08 / 0.00 | fail | 0.153 | revised post hoc; tuned |
| T-PAT-6 |  | 0.4–0.7 | 0.30 | 0.00 / 0.00 / 1.00 / 0.00 / 0.50 | inconclusive | 0.333 | revised post hoc |
| T-LET-1 |  | 0.02–0.36 | 0.00 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-FOOD-1 | yes | 0.06–0.11 | 0.11 | 0.12 / 0.11 / 0.14 / 0.08 / 0.07 | insufficient | — | window too short (a statistic across the months of a year) |
| T-FOOD-2 |  | 0.6–0.78 | 0.90 | 0.91 / 0.89 / 0.90 / 0.90 / 0.89 | fail | 0.673 |  |
| T-FOOD-11 |  | 60–160 | 153.70 | 130.78 / 173.87 / 112.22 / 178.20 / 173.42 | insufficient | — | window too short (a statistic across the months of a year) |
| T-HUN-1 |  | 5–25 | 23.93 | 26.36 / 20.28 / 18.25 / 30.42 / 24.33 | inconclusive | 0.000 | revised post hoc |
| T-HUN-2 |  | 0.5–0.8 | 0.19 | 0.17 / 0.22 / 0.17 / 0.23 / 0.17 | fail | 1.026 |  |
| T-HUN-3 |  | 0.05–0.4 | 0.04 | 0.03 / 0.03 / 0.05 / 0.05 / 0.02 | inconclusive | 0.040 |  |
| T-HUN-7 |  | 1.2–2 | 1.00 | 1.00 / 1.00 / 1.00 / 1.00 / 1.00 | fail | 0.250 |  |
| T-SOC-7 |  | 3–7 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-SOC-8 | yes | as reported | 0.00 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | fail | — | revised post hoc; pattern row: no distance |
| T-SOC-9 |  | 0.08–0.22 | 0.22 | 0.33 / 0.33 / 0.00 / — / — | inconclusive | 0.016 | revised post hoc |
| T-DEM-1 |  | 0.11–0.19 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-2 |  | female 31–39, male 18–24 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-DEM-5 |  | 0.07–0.15 | 0.00 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-6 |  | attack 0.4–0.9, mortality 0–0.17 | — | — / — / — / — / — | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-9 |  | 0.1–0.3 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-DEM-10 |  | 0.15–0.25 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-11 |  | 13.5–16 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-DEM-12 |  | 4.8–6.6 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-COM-1 | yes | 0.5–1.5 | 0.89 | 0.91 / 0.92 / 0.85 / 0.84 / 0.94 | pass | 0.000 |  |
| T-COM-5 |  | 2–4 | 2.98 | 3.07 / 2.99 / 2.91 / 2.84 / 3.11 | pass | 0.000 | tuned |
| T-COM-6 |  | as reported | 4.00 | 4.00 / 4.00 / 4.00 / 4.00 / 4.00 | pass | — | pattern row: no distance |
| T-COM-8 |  | 0.3–0.6 | 0.45 | 0.49 / 0.47 / 0.45 / 0.46 / 0.38 | pass | 0.000 |  |
| T-COM-10 |  | core repertoire fitted; juvenile > adult repertoire held out | — | — | n/a | — | pattern row: no distance |
| T-COM-11 | yes | 0.25–0.55 | 0.03 | 0.00 / 0.20 / 0.00 / 0.00 / 0.00 | fail | 0.718 | revised post hoc |

## Held-out rows

| Row | Enc. | Band | Pooled | Per seed | Verdict | Distance | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-ACT-5 |  | male–female feeding difference ≤ 0.05; lactating females … | -0.05 | -0.05 / -0.05 / -0.03 / -0.06 / -0.04 | fail | — | model revised post-freeze; pattern row: no distance |
| T-PTY-2 |  | weak habitat-fruit effect (R² ≤ 0.1); patch-size effect R… | — | — / — / — / — / — | insufficient | — | window too short (a statistic across the months of a year); pattern row: no distance |
| T-PTY-3 |  | periphery parties have ≥ 1.5× the males of core-only parties | 1.46 | 1.33 / 1.51 / 1.94 / 1.38 / 1.15 | fail | — | pattern row: no distance |
| T-PTY-4 |  | 0.15–0.45 | 0.58 | 0.60 / 0.57 / 0.57 / 0.63 / 0.55 | fail | 0.449 | compromised; not summed |
| T-RNG-2 |  | 0.3–1.2 | 0.05 | -0.25 / 0.29 / 0.03 / 0.15 / 0.04 | insufficient | — | revised post hoc; window too short (annual range) |
| T-RNG-5 |  | 0.3–0.6 | 0.61 | 0.63 / 0.62 / 0.57 / 0.70 / 0.52 | inconclusive | 0.022 | model revised post-freeze |
| T-RNG-6 |  | 1.2–3 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (annual range) |
| T-IGE-2 |  | 0.7–0.9 | 0.97 | 1.00 / 1.00 / 0.83 / 1.00 / 1.00 | inconclusive | 0.344 | revised post hoc |
| T-IGE-3 |  | 0.25–0.75 | 0.58 | — / — / — / — / — | pass | 0.000 | revised post hoc |
| T-IGE-5 |  | 0.6–1.1 | 0.85 | 0.80 / 1.11 / 1.11 / 0.45 / 0.76 | scale | — | revised post hoc; compromised; not summed; no value: not summed |
| T-PAT-2 |  | 7–18 | 1.43 | 0.00 / 1.74 / 3.24 / 2.17 / 0.00 | fail | 0.506 | revised post hoc; model revised post-freeze |
| T-PAT-3 |  | 0.55–0.85 | 0.67 | — / 0.57 / 0.73 / 0.71 / — | inconclusive | 0.000 | revised post hoc; model revised post-freeze |
| T-PAT-4 | yes | positive male and fruit effects; no oestrous effect | — | — / — / — / — / — | insufficient | — | compromised; window too short (a statistic across the months of a year); not summed; pattern row: no distance |
| T-PAT-5 |  | 60–240 | 211.83 | — / 176.00 / 298.00 / 161.50 / — | inconclusive | 0.000 | revised post hoc; model revised post-freeze |
| T-PAT-7 |  | 0.15–0.45 | 0.00 | — / 0.00 / 0.00 / 0.00 / — | fail | 0.500 | revised post hoc; model revised post-freeze |
| T-PAT-8 |  | -0.057–0.17 | — | — / — / — / — / — | insufficient | — | not scorable; window too short (a statistic across the months of a year); not summed |
| T-BRD-1 |  | 0.037–0.107 | 0.30 | — / — / — / — / — | fail | 2.694 |  |
| T-PAT-9 | yes | 0.5–1 | — | — / — / — / — / — | insufficient | — | window too short (rare events counted per community-year) |
| T-LET-2 |  | 0.6–0.85 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-LET-3 | yes | 4–16 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (rare events counted per community-year) |
| T-LET-4 |  | 0.1–0.35 | — | — | n/a | — | partially encoded; no value: not summed |
| T-LET-5 | | sealed | | | sealed | | Payoff of expansion (scenario) |
| T-LET-6 |  | 0.6–1 | — | — / — / — / — / — | insufficient | — | revised post hoc; model revised post-freeze; window too short (rare events counted per community-year) |
| T-FIS-1 |  | no fission below ~10 adult males; ≤ 1 per 100 community-y… | — | — | n/a | — | pattern row: no distance |
| T-FIS-2 |  | 1–3 | — | — | n/a | — | no value: not summed |
| T-FIS-3 |  | ≥ 5 | — | — | n/a | — | no value: not summed |
| T-FIS-4 |  | bonds do not protect after fission | — | — | n/a | — | pattern row: no distance |
| T-FIS-5 |  | 6.1905–11.4069 | — | — | n/a | — | no value: not summed |
| T-FOOD-3 |  | ≥ 0.3 | — | — / — / — / — / — | insufficient | — | window too short (a statistic across the months of a year) |
| T-FOOD-4 |  | 4–15 | 5.30 | 5.56 / 5.22 / 5.45 / 5.18 / 5.07 | pass | 0.000 | compromised; not summed |
| T-FOOD-5 | yes | 0.15–0.45 | 0.11 | 0.09 / 0.10 / 0.11 / 0.10 / 0.14 | fail | 0.140 |  |
| T-FOOD-6 |  | 2–7 | 5.61 | 6.20 / 5.90 / 5.92 / 5.35 / 4.66 | pass | 0.000 |  |
| T-FOOD-7 | yes | 300–800 | 275.60 | 247.17 / 293.17 / 254.74 / 280.00 / 302.89 | inconclusive | 0.049 |  |
| T-FOOD-8 |  | 0.05–0.25 | — | — | n/a | — | no value: not summed |
| T-FOOD-9 |  | slow near goal; faster to figs | — | — | n/a | — | pattern row: no distance |
| T-FOOD-10 |  | 0.08–0.3 | 0.01 | 0.01 / 0.01 / 0.01 / 0.01 / 0.01 | fail | 0.328 |  |
| T-HUN-4 |  | 1.05–1.8 | 2.30 | 2.32 / 1.17 / 1.29 / 3.48 / 8.59 | inconclusive | 0.667 | model revised post-freeze |
| T-HUN-5 |  | ≥ 0.1 | — | — / — / — / — / — | insufficient | — | model revised post-freeze; window too short (a statistic across the months of a year) |
| T-HUN-6 |  | ≥ 1.5 | — | — / — / — / — / — | insufficient | — | model revised post-freeze; window too short (a statistic across the months of a year) |
| T-HUN-8 |  | 0.8–0.95 | 0.90 | 1.00 / 1.00 / 1.00 / 0.67 / 1.00 | inconclusive | 0.000 | model revised post-freeze |
| T-HUN-9 |  | about half of those present eat; bond partners favoured ~… | 0.00 | 0.00 / — / — / — / — | fail | — | model revised post-freeze; pattern row: no distance |
| T-HUN-10 |  | decline under 6–12%/y offtake; persistence under low offtake | — | — | n/a | — | pattern row: no distance |
| T-SOC-1 |  | 4–10 | — | — / — / — / — / — | insufficient | — | revised post hoc; window too short (life history over years) |
| T-SOC-2 |  | 0.55–0.9 | 0.85 | 0.86 / 0.91 / 0.92 / 0.91 / 0.64 | inconclusive | 0.000 |  |
| T-SOC-3 |  | 0.45–0.8 | 0.92 | 0.96 / 0.88 / 0.94 / 0.87 / 0.95 | fail | 0.347 | revised post hoc |
| T-SOC-4 | yes | 0.1–0.3 | 0.08 | 0.07 / 0.08 / 0.10 / 0.07 / 0.10 | fail | 0.081 | compromised; not summed |
| T-SOC-5 |  | 0.2–0.7 | 0.20 | 0.15 / 0.28 / 0.18 / 0.22 / 0.18 | inconclusive | 0.000 | revised post hoc |
| T-SOC-6 |  | 0.6–0.9 | 0.51 | 0.50 / 0.56 / 0.48 / 0.56 / 0.46 | fail | 0.299 |  |
| T-SOC-10 |  | 0.1–0.3 | 0.18 | 0.25 / 0.12 / 0.17 / 0.17 / 0.24 | pass | 0.000 | revised post hoc |
| T-SOC-11 |  | 0.25–0.55 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-SOC-12 |  | captive; qualitative | 8.58 | 7.46 / 9.93 / 8.41 / 7.68 / 9.44 | pass | — | pattern row: no distance |
| T-SOC-13 |  | ≥ 26 | — | — | structural | — | no value: not summed |
| T-DEM-3 |  | 0.25–0.45 | — | — / — / — / — / — | insufficient | — | model revised post-freeze; window too short (life history over years) |
| T-DEM-4 |  | disease 0.25–0.6, aggression 0.1–0.25 | — | — / — / — / — / — | insufficient | — | window too short (life history over years) |
| T-DEM-7 |  | infants and older adults at higher risk | — | — / — / — / — / — | insufficient | — | window too short (rare events counted per community-year); pattern row: no distance |
| T-DEM-8 |  | 5–20 | 0.00 | 0.00 / 0.00 / 0.00 / 0.00 / 0.00 | insufficient | — | window too short (rare events counted per community-year) |
| T-DEM-13 |  | 1.8–2.6 | — | — / — / — / — / — | insufficient | — | model revised post-freeze; window too short (life history over years) |
| T-DEM-14 | | sealed | | | sealed | | Female rank and fertility |
| T-DEM-15 | | sealed | | | sealed | | Maternal loss after weaning |
| T-COM-2 |  | rate falls with rank number | 0.05 | 0.29 / -0.10 / -0.03 / 0.03 / 0.06 | fail | — | pattern row: no distance |
| T-COM-3 | yes | periphery rate below core rate | 0.23 | 0.43 / 0.39 / 0.09 / 0.02 / 0.21 | fail | — | pattern row: no distance |
| T-COM-4 | yes | travel most common; fruit > herbs | 0.47 | 0.46 / 0.46 / 0.46 / 0.45 / 0.50 | fail | — | pattern row: no distance |
| T-COM-7 |  | less drumming in large parties | 0.13 | 0.16 / 0.16 / 0.08 / 0.11 / 0.10 | fail | — | pattern row: no distance |
| T-COM-9 |  | status, not food amount | 0.26 | 0.30 / 0.25 / 0.20 / 0.24 / 0.30 | fail | — | pattern row: no distance |
| T-DEM-16 | | sealed | | | sealed | | Survival of daughters orphaned at 5–9.99 y |
| T-DEM-17 | | sealed | | | sealed | | Sex difference in the survival cost of maternal loss at 10–14.99 y |
| T-DEM-18 | | sealed | | | sealed | | Stress activation after maternal loss fades |
| T-DEM-19 | | sealed | | | sealed | | Lean-mass proxy: orphans vs non-orphans |
| T-DEM-20 | | sealed | | | sealed | | Lean-mass proxy: alpha mother vs other mothers |
| T-DEM-21 | | sealed | | | sealed | | Neighbour pressure during pregnancy and offspring survival |
| T-DEM-22 | | sealed | | | sealed | | Neighbour pressure: pregnancy window stronger than lactation windows |
| T-DEM-23 | | sealed | | | sealed | | Aggression received by immatures, by sex |
| T-DEM-24 | | sealed | | | sealed | | One-year survival after maternal loss, by age at loss |
