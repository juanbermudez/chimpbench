# E1p pre-registration: growth that yields to the body's state

Registered 2 October 2026 (first commit 18:1x), before any run of this stage. Track E, stage E1p, branch `e1p-growth`
(from `track-e` 1b85093). Any new switch is 0 by default in both profiles and is read only with `energyLedger` 1,
`ledgerGrowSurplus` 1 and `ledgerGrowPotential` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No growth rate, mass for age, weaning age or
reserve level is set from a field value; no weight or input is tuned to hit one. A miss is a finding.

**Seen before this registration (disclosed).** The S6 confirm results (docs/staging/e-stack2-confirm.md, "S6 results":
infants 0.5–2 y −0.147 and 2–5 y −0.106% of the store a day against S5's −0.007 and −0.013; milk 279 / 238 / 198 / 190
kcal/day at 0.5–1 / 1–2 / 2–3 / 3–4 y; mothers' balance by infant age); E1f §8–§9 (growth at the potential, 3.60 kg/y at
1–4 y), E1o §1.4 and §2.2 (arm B: infants' reserves −0.050 to −0.062 of the store, growth 3.60 kg/y unchanged).
`src/sim/energy.ts` energyTick (growth block) read before writing this file. No run of this stage had been made.

## 0. The problem (from the brief; S6 confirm, 5 seeds, simulation truth)

- S6 (S5 + E1o's `weanDecide` and `weanDeficit`) halved nursing mothers' deficit: a mother refuses suckling while her
  relative reserve deficit exceeds her infant's. Infants now carry part of it: their reserves fall 0.11–0.15% of the
  store a day at 0.5–5 y (S5 about 0.01), most of it in the window's second half.
- They still grow at the captive potential: 3.6 kg/y at 1–4 y (E1f: desilva2011, curry2023, captive), about twice
  Gombe's wild rate (about 1.6 kg/y over 0–5 y, [L]). Growth yields only below condition 0.5 (`condGood`; reserves
  about −29% of the store).
- **Question: how does the model partition a growing animal's shortfall between growth and reserves, and is that
  partition physiology or an artefact of the growth rule?**

## 1. Step 1: diagnosis (code read first; readouts defined here and smoke-tested on 2 days before use)

### 1.1 How growth is computed today (S6: `ledgerGrowSurplus` 1, `ledgerGrowPotential` 1, `ledgerDrive` 1)

Code read at 1b85093 (`src/sim/energy.ts` energyTick, growth block; `ledgerSlow`; `spendRate`; `src/sim/life.ts`
slowLife):
- Each tick an animal below its adult mass grows at v × f kg per bio-year, v the captive potential
  (`ledgerGrowFirstYearKg` 2.8 kg/y before 1 y, then `ledgerGrowFemaleKgPerY` 3.4 / `ledgerGrowMaleKgPerY` 3.8), and
  pays `ledgerGrowthKcalPerG` (4.5 kcal/g) × the gain as spending: 34.5 kcal/day at 2.8 kg/y, 41.9 (F) and 46.8 (M) at
  3.4 / 3.8 kg/y.
- f = min(1, cond ÷ `condGood`) (C8's rule, reused by E1f iteration 2), cond = `ledgerCondSet` × (1 + reserves ÷ usable
  store) = 0.7 × (1 + res ÷ (1,300 kcal/kg × mass)), refreshed every slow step (20 ticks, 5 min). So f = 1 while the
  reserves are above −28.6% of the store, and the whole growth cost is charged whatever the day's intake.
- **E1f's surplus average aAvg no longer exists** (iteration 1 paid growth from the day-long mean surplus, aAvg − mAvg;
  iteration 2 dropped aAvg). mAvg (the day-long mean of everything spent but growth, `driveAvgH` 24 h) survives only in
  the drive: with `ledgerDrive` 1 the drive expects mAvg + growth at the potential over the waking time left and the
  fast after it (`spendRate`). Growth itself reads no average and no surplus.
- So a shortfall of intake below maintenance + growth at the potential goes to the reserves, which the drive reads as
  hunger. Under S6 the mother's refusal (`weanDeficit`) caps the infant's milk whenever the infant's relative deficit is
  below hers, so the drive cannot buy the shortfall back with milk once both are in deficit.

### 1.2 Readouts (sim truth; new section "E1p" in `scripts/energy-diagnose.ts`, read-only; existing readouts unchanged)

Classes: unweaned infants with a living mother by age bin (0.5–1, 1–2, 2–3, 3–4, 4–5 y) and weaned immatures below
adult mass by age (5–8, 8–12 y), by sex where both are present. Daylight = `environment.daylight > 0.1`
(energy-diagnose's definition); night = the rest.
- **G1 books per animal-day:** milk drunk; own food eaten (formula kcal); absorbed (kcal: the gut's yield to the body,
  fermented fibre included, as the ledger books it); spending by term (rest, activity, walk, climb, digestion,
  growth); reserves change (kcal/day and % of the store a day, from the reserve level at the first and last tick of
  each animal in the window, and the OLS slope of the class's daily mean reserves ÷ store).
- **G2 growth paid against the potential:** growth paid (kcal/day), the potential's cost G (kcal/day at f = 1), the
  mean f, the share of ticks with f < 1, condition (mean and minimum), reserves ÷ store (mean and minimum), velocity
  (kg per bio-year, from kg at the window's ends).
- **G3 the surplus that would pay growth:** per animal-day, S = absorbed − spending other than growth; the share of
  growth paid out of S (min(growth, max(S, 0)) ÷ growth) and the share drawn from the reserves; the share of
  animal-days with S < growth, with S < 0; S split into daylight and night.
- **G4 the drive's averages:** mean mAvg (kcal/h) against the realised spending other than growth (kcal/h) over the
  same ticks, and the drive's expected spending (mAvg + G) against what the animal absorbs per hour.
- **G5 time course:** the class's daily mean reserves ÷ store, first and second half of the window (slope each), and
  daily growth paid and S by day.

Run: S6 (`bench-run/artifacts/validation/e/s6q/S6q-params.json`), seeds 48 and 7, 30-day burn-in + 30 days, rules
policy, from a frozen detached checkout of the commit that adds the readouts and this section (one simulation; the
existing readouts come out of the same run and must equal the integrator's S6q-energy.json where they overlap).

### 1.3 Predictions (before the run)

(filled in before the diagnosis run; see the next commit)
