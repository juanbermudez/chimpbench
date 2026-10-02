# E1m pre-registration: milk output, an audit of the input

Registered 2 October 2026 (10:10), before any source value of this stage was read and before any run of changed code.
Track E, stage E1m, branch `e1m-milk` (from `track-e` eeded56). Any new switch is 0 by default in both profiles and is
read only with `energyLedger` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. Milk energy output measured by isotope dilution,
deuterium turnover or test-weighing is physiology measured independently of the behaviour it helps produce, so it may
be an input. A mother's reserve trend is not. **No input is set because it balances the mothers**; a miss is a finding.

## 0. The inputs under audit (data/params.json; all `assumed`, all human)

| id | value | what it is |
| --- | --- | --- |
| `ledgerMilkYieldCoef` | 23.2 kcal/day per kg^0.75 | the human 501 kcal/day (749 g/day × 2.8 kJ/g, butteKing2005) at an assumed 60 kg, scaled by M^0.75: 307 kcal/day at 31.3 kg |
| `ledgerMilkEff` | 0.8 | human efficiency of milk synthesis: the mother pays milk drunk ÷ 0.8 (384 kcal/day at full yield) |
| `ledgerMilkKcalPerMin` | 2.5 kcal/min | milk energy per nursing minute (human 501 kcal/day over an assumed 2 h of suckling, scaled) |

## 1. How the model's milk books work (code, read before any run)

- Synthesis fills a store at the yield rate `ledgerMilkYieldCoef ÷ 24 × M^0.75` per hour while the mother lactates and
  stops when the store holds `ledgerMilkStoreH` hours of yield (`src/sim/energy.ts:383–384`). **Synthesis itself costs
  nothing.** The mother pays only for milk her infant drinks: cost = milk ÷ `ledgerMilkEff` (`nurseTick`,
  `src/sim/energy.ts:531–540`).
- So a yield above what infants drink is neither paid for nor wasted: it is never made (the store is full). The yield
  coefficient matters only where it binds, i.e. where infants would drink more than the mother makes.
- What S3 shows (integrator's `bench-run/artifacts/validation/e/s3/S3-energy.log`, d066cdc, 5 seeds × 60 days; read
  before this registration): infants drink 284 kcal/day at 0.5–1 y and 307–308 kcal/day at 1–2, 2–3 and 3–4 y, i.e.
  the yield cap (23.2 × 31.3^0.75 = 307) binds from about 0.9 y on; mothers pay 355–385 kcal/day for milk; their balance
  is −42, −99, −147 and −150 kcal/day by infant age (0.5–1, 1–2, 2–3, 3–4 y). There are no infants under 0.5 y in the
  window (no births). These numbers are context for the consistency check (§3); they play no part in the step-0 rule.

## 2. Step 0 decision rule (registered before any source value was read)

A primate- or ape-specific value replaces the human input only if it is **better supported** for a 31.3 kg wild
chimpanzee mother than the human value scaled by M^0.75. Registered meaning:

1. **Method.** Only daily milk output measured by isotope dilution (deuterium dose-to-mother or infant water
   turnover) or 24-hour test-weighing counts as an output value. Milk obtained by manual expression after a separation,
   milk composition alone, and nipple time are not output values (composition changes a volume, not an energy output;
   the model's input is in energy).
2. **Sample.** n ≥ 3 mothers, a stated maternal body mass (to scale by M^0.74–0.75, riek2021) and a stated lactation
   stage. Values read only through an abstract or a secondary source count as support only if the numbers themselves
   are quoted there.
3. **Closeness.** The human value is a hominoid value with large samples and the best methods. A value is better
   supported only if (a) it is from a great ape (none is known), or (b) it is a comparative primate relation (≥ 5
   primate species, mass-scaled) in which humans sit off the primate line by more than the line's scatter, so that
   human scaling is the outlier and the primate line's prediction at 31.3 kg is the better estimate for an ape; or
   (c) the human value itself turns out to rest on something other than registered (for example a maternal mass other
   than 60 kg), in which case the coefficient is corrected and stays human.
4. **Not better supported:** a single monkey species (Old World monkeys and callitrichids wean at about 1 y or earlier
   and their infants grow fast for their size; a different life history from an ape's) or a mammal-wide line without
   a primate term. Such values are recorded as a **bracket** around the human-scaled value, not used as the input.
5. **Efficiency.** `ledgerMilkEff` changes only if a primate measurement of the efficiency of milk synthesis exists
   (energy in milk ÷ extra metabolisable energy for it); otherwise it stays human.
6. If nothing passes 1–3, the stage records a valid null for the input and does not build a switch (STEP 2 is skipped).
   The consistency check (§3) is still done and reported.

## 3. Step 1: consistency check of the infant side (offline arithmetic first, then a 2-day smoke)

Question: does the infant side of the ledger agree with the input? Registered computation (numbers generated by a
script from the registry and the field tables, never typed):
- **Need by age** (0–0.5, 0.5–1, 1–2, 2–3, 3–4, 4–5 y): resting cost (Kleiber, `ledgerRmrCoef` × M^`ledgerRmrExp`) ×
  the day's activity multiple (sleep and awake shares from the registry multipliers), plus growth at E1f's captive
  potential (`ledgerGrowFirstYearKg`, then the sanctuary rates) × `ledgerGrowthKcalPerG`, plus diet-induced
  thermogenesis (`digestaTefFrac`); mass on the E1f potential curve.
- **Own food**: field eating time by age (badescu2022 foraging share; lonsdorf2014 eating share) × daylight minutes ×
  the model's own-food kcal per eating minute by age (S3's E1f table), absorbed at the ledger's digestibility.
- **Milk needed** = need − own food absorbed; compared with the input's yield (307 kcal/day at 31.3 kg) and with what
  infants drink in the model (S3, and the smoke).
- A 2-day smoke (seed 48, the S3 stack) checks that energy-diagnose's milk-by-age readout and the mothers' milk cost
  print, before any arm.

## 4. Step 2 (only if step 0 passes; filled in and committed before any run of changed code)

Reserved: a new switch, 0 by default (0 = today), selecting the sourced primate or ape milk energy output (and the
efficiency, if sourced), each tagged; infant intake and growth then follow from the same ledger (no change to infant
growth inputs). It removes no prescription (an input correction, like E1h): `removesNothing` in
`scripts/lib/prescriptions.ts`.

## 5. Benchmark and judging (from the brief; only if an arm exists)

Two bases, quick mode (seeds 48 and 7, 30 + 30 days), each at this branch's committed head, run once plus three
re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405), each with `energy-diagnose`: (a) **S3** (e-stack2-confirm.md:
the integrated candidate stack + `waterLedger`); (b) **T** = R + `ledgerFoodEnergyFix` (without E1i's pair). The arm
on each base is judged against that base's four-run mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick per-run SD
fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the base's own spread if larger; energy
readouts against the base's own spread. Viability: no starvation death; every class's reserve slope reported against
the 0.05%/day line; infants' growth and weaning readouts must not get worse beyond the base's spread (if they do, that
is a finding about the input, not a reason to retune). At most 3 iterations, each logged here and committed before
its run.

## 6. Sources (STEP 0; filled in below as they are verified)

Pending (two helpers are verifying measured primate milk outputs and ape milk composition and allometry in parallel;
existing entries in research.md §E.11, §E.13, §E.14.3 were read first).
