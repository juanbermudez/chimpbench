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

**Smoke test (seed 48, S6, 1-day burn-in + 2 days; `scratchpad/e1p/smoke/`; readouts only).** Every E1p readout prints
and is non-empty for the four infant bins and three juvenile groups; f = 1 and paid ÷ potential = 1.000 in every
growing group; mAvg equals the realised spending other than growth within 2%. The window's first days are a transient
(dyads moving to equal relative deficits), so no number of the smoke is read as a result.

### 1.3 Predictions (before the run; arithmetic from the S6 confirm's readouts, 1,300 kcal of usable store per kg)

- G2: growth paid ÷ potential = 1.000 and f = 1 in every tick at 0.5–4 y and in growing juveniles (high): the lowest
  reserves stay above −29% of the store (condition above 0.5).
- G1/G3: at 1–4 y the reserves fall 10–20 kcal a day (0.11–0.15% of a 9,000–17,000 kcal store), so S (absorbed minus
  spending other than growth) is positive but below the growth paid (44 kcal/day): S about 25–35 kcal/day, growth paid
  out of S 55–80%, the rest from the reserves (moderate). Days with S below growth ≥ 60%; days with S < 0 10–35% (low).
  At 0.5–1 y the books are near balance (S within ±10 kcal/day of growth; moderate).
- Day and night: S by night negative at 1–4 y (spending without food; night milk cut by the refusal that stands while
  the mother sleeps), by day above the day's growth (moderate).
- G4: mAvg within 5% of the realised spending other than growth (high: it is its 24-h mean).
- G5: the reserves' slope steeper in the window's second half than in its first at 0.5–5 y (moderate; the S6 confirm).
- Juveniles 5–12 y below adult mass: growth at the potential (3.4 F, 3.8 M kg/y), f = 1, reserves −0.05 to −0.10% of
  the store a day, S below growth (moderate).
- **Expected term (moderate):** the growth rule itself. With f = min(1, cond ÷ condGood), growth is an obligatory
  expense at the captive potential until the reserves are 29% below the set point; under `weanDeficit` the infant's
  milk is capped at the mother's relative deficit, so whatever its own food does not cover of maintenance + growth is
  drawn from its reserves: growth never yields in a 90-day window.

### 1.4 Step 1 result (S6, seeds 48 and 7, 30 + 30 days, sim truth; frozen checkout f5d0597; generated by `diag_table.py`
from `diag-S6.json`, scratch `e1p/diag/`, not tracked)

The run's existing readouts equal the integrator's `S6q-energy.json` in all 3,777 values compared (same simulation; the
E1p section only reads), so this diagnosis is the reference run S6q itself.

| group | animal-days | absorbed | other spending | growth paid | potential cost | paid ÷ potential | S | S day / night | days S < growth % | days S < 0 % | growth paid out of the same day's S % | f mean; f < 1 % | cond mean / min | reserves ÷ store mean / min | mAvg / realised kcal/h | velocity kg/y | Δ reserves %/day (per animal) | slope first / second half %/day |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 120 | 281 | 249 | 34.5 | 34.5 | 1.000 | 32.4 | 71 / -39 | 62 | 6 | 77 | 1.000; 0.0 | 0.665 / 0.647 | -0.050 / -0.076 | 10.3 / 10.4 | 2.80 | -0.030 | -0.084 / 0.015 |
| 1–2 y | 120 | 436 | 395 | 44.4 | 44.4 | 1.000 | 40.9 | 86 / -45 | 53 | 7 | 77 | 1.000; 0.0 | 0.656 / 0.614 | -0.062 / -0.122 | 16.4 / 16.4 | 3.60 | -0.032 | -0.008 / 0.003 |
| 2–3 y | 120 | 546 | 501 | 44.4 | 44.4 | 1.000 | 45.1 | 95 / -49 | 47 | 21 | 68 | 1.000; 0.0 | 0.662 / 0.647 | -0.054 / -0.076 | 20.9 / 20.9 | 3.60 | 0.012 | 0.006 / 0.025 |
| 3–4 y | 120 | 684 | 634 | 44.4 | 44.4 | 1.000 | 49.9 | 111 / -61 | 52 | 25 | 64 | 1.000; 0.0 | 0.661 / 0.630 | -0.056 / -0.101 | 26.4 / 26.4 | 3.60 | 0.036 | 0.051 / -0.003 |
| juvenile 5–8 y F | 180 | 1070 | 1043 | 41.9 | 41.9 | 1.000 | 27.4 | 141 / -114 | 58 | 31 | 57 | 1.000; 0.0 | 0.646 / 0.615 | -0.078 / -0.121 | 43.4 / 43.4 | 3.40 | -0.048 | -0.029 / -0.057 |
| juvenile 8–12 y F (at adult mass) | 60 | 1306 | 1342 | 0.0 | 0.0 | — | -36.3 | 99 / -135 | — | 62 | — | —; — | 0.668 / 0.640 | -0.046 / -0.086 | — / — | 0.00 | -0.089 | -0.146 / -0.037 |
| juvenile 8–12 y M | 120 | 1454 | 1401 | 46.8 | 46.8 | 1.000 | 53.1 | 188 / -135 | 45 | 28 | 65 | 1.000; 0.0 | 0.667 / 0.650 | -0.048 / -0.071 | 58.4 / 58.4 | 3.80 | 0.015 | -0.031 / 0.042 |

| infant age | milk day + night | own food | kcal out | growth | reserves ÷ store | mother reserves ÷ store | mothers' balance kcal/d |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 213 + 69 | 0 | 283 | 34.5 | -0.050 | -0.048 | -15 |
| 1–2 y | 162 + 79 | 270 | 439 | 44.4 | -0.062 | -0.062 | -4 |
| 2–3 y | 149 + 75 | 428 | 545 | 44.4 | -0.054 | -0.054 | 10 |
| 3–4 y | 136 + 77 | 627 | 678 | 44.4 | -0.056 | -0.057 | 4 |

Class trajectories (daily mean reserves ÷ store, OLS over the window): lactating females +0.010 %/day (−0.053 → −0.054),
juveniles 5–12 y −0.020, infants 2–5 y +0.030, infants 0.5–2 y −0.010. No death.

The S6 confirm's own energy run (`bench-run/…/s6/S6c-energy.json`, 5 seeds, 60 days; integrator's, read-only) by
10-day block: the infants' and juveniles' falls are in its second month, when every class eats less (infants 0.5–2 y
396 → 356 → 337 kcal/day eaten and 52 → 31 → 27 eating minutes over days 30–59; infants 2–5 y 735 → 703 → 690;
juveniles 1,637 → 1,615 → 1,577; lactating females 2,119 → 2,065 → 2,010) while spending is flat. Quick mode's 30-day
window is the confirm's first month.

**Against the predictions (§1.3).** G2 held (f = 1 and paid ÷ potential 1.000 in every growing group; the lowest
condition 0.61, reserves −12% of the store at worst). G1/G3 partly: S is 32–50 kcal/day at 0.5–4 y (predicted 25–35),
growth paid out of the same day's S 64–77% (inside 55–80%), but **the reserves do not fall on average in the quick
window** (per animal −0.03 to +0.04%/day; predicted a fall of 10–20 kcal/day): S ≈ growth over the month. Days with S
below growth 47–62% (predicted ≥ 60%: missed at 1–4 y); days with S < 0 6–25% (inside at 2–4 y, below at 0.5–2 y).
Day and night held: S by night −39 to −61 kcal at 0.5–4 y, by day +71 to +111. G4 held (mAvg within 1%). G5 missed in
quick mode (no second-half steepening inside its 30 days; the steepening is the confirm's second month). Juveniles: f =
1 and growth at the potential held; reserves −0.048 (5–8 y F) and +0.015%/day (8–12 y M) (predicted −0.05 to −0.10:
held at the edge for 5–8 y F, missed for M).

**The term (with numbers).**
1. The growth rule never sees the state: f = min(1, cond ÷ `condGood`) = 1 in every tick of every growing animal, so
   growth is charged at the captive potential (34.5 kcal/day before 1 y, 41.9–46.8 after) whatever the balance.
   `condGood` 0.5 was set on the timer model's condition scale (a mean of 1 − hunger, juvenile median 0.60; C8); on the
   ledger's scale the set point reads 0.7 and 0.5 sits at −29% of the usable store, about 9% of body mass lost (the
   registry's usable store is about 30% of body mass at 4,300 kcal/kg of tissue). The infants' lowest reading, −12%, is
   far above it.
2. In the quick window the infants pay that charge from their own books on average (S ≈ growth): the day's surplus
   (+71 to +111 kcal) covers the night's deficit (−39 to −61) and the growth; on the 47–62% of days when it does not, the
   reserves pay and are repaid later (23–36% of the growth paid comes from them on those days). The reserves' level
   (−5 to −6% of the store) is the dyad's: by age bin the infants' mean reserves are within 0.002 of their mothers' (the
   equality `weanDeficit` enforces). So in the first month nothing is starving the infants' growth: they are fed for
   captive growth at a reserve offset of 5–6%.
3. When food declines (the confirm's second month: 5–15% less eaten by every immature class, spending flat), growth
   keeps its full charge and the whole shortfall goes to the reserves (0.11–0.15%/day in the confirm), mothers and
   infants falling together under the dyad rule.

**Reading.** The partition today is all-or-nothing by construction: the reserves carry 100% of any shortfall until
−29% of the store, then growth yields linearly in condition. Whether that is wrong depends on the physiology of the
order in which a growing primate gives up tissue reserve and structural growth, which §2 takes from sources, not from
the targets. The 2 × Gombe growth is not, in the quick window, a partition effect: the infants' intake covers captive
growth (E1f's named term, intake per eating minute, stands).
