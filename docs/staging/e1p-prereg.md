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

## 2. Step 2: mechanism (registered 2 October 2026 before any run of changed code)

### 2.0 Field rows and readouts (sources opened; pre-flight)

| Row (staged, read by energy-diagnose; not scored by e-bench) | Sample (sex, reproductive state, mass, method) | Readout here, defined from the source's method |
| --- | --- | --- |
| T-INF-4 mass for age | Gombe, *P. t. schweinfurthii*: "1,286 weighings of 31 males and 26 females aged 2–43 years, over 33 years" (pusey2005, abstract; research.md E.3), weighed on a scale during provisioning years; the infant curve is gurvenWalker2006's "very rough estimation" from pusey2005's figures (about 10 kg at 5 y, so about 1.6 kg/y from birth; 2.2 F and 2.8 M kg/y at 5–10 y) [L] | growth velocity, kg per bio-year over the window, two ways: the ledger's mass (`kg`, structure) and the **weighed mass**, kg + reserves ÷ 4,300 kcal/kg (the registry's tissue energy density for the usable store), since a scale weighs the tissue the reserves stand for |
| T-ENE-5 energy balance through lactation | Kanyawara, 17 mothers, urinary C-peptide, longitudinal (emeryThompson2012, abstract; staged row) | mothers' balance (Δ reserves, kcal/day) by the youngest infant's age (existing E1f readout); direction: rising with infant age from 0.5–1 y |
| T-INF-1, T-INF-2, T-INF-5 | Gombe 40 infants, 1-min point samples (lonsdorf2014); Ngogo 72 immatures, focal follows (badescu2022) | existing E1f / E1n readouts (eating share, nurse act, bouts per daylight hour), unchanged |
| T-ENE-1..3 | Kanyawara, 14 multiparous nursing mothers, full-day focal follows (uwimbabazi2019) | existing E1h readouts, unchanged |

Readouts added for the arms (`scripts/energy-diagnose.ts` E1p section, read-only; smoke-tested with each arm's switch on
before its run): **f paid** = growth paid ÷ the potential's cost per tick (exact for any rule; the existing "mean f"
reads C8's formula); **weighed-mass velocity** (above). Everything else in §1.2 is unchanged.

### 2.1 What the sources say about the partition (research.md, Addendum: E1p growth and the body's state)

- **Order: the tissue reserve gives way first, structural growth afterwards.** In 5,160 Gambian children, height's
  seasonal course lags weight's by about 3 months, and wasting predicts stunting 3 months later after current stunting
  (OR 3.2) (schoenbuchner2019, FT, [M] human). Wasting or poor weight gain "may precede linear growth retardation", and
  the 6-month change in weight-for-length is directly associated with later length (richard2012, [M] human).
- **Graded, not a threshold**: richard2012's association is continuous in the change of weight-for-length.
- **Mechanism direction**: energy deprivation lowers the growth axis (IGF-I) within days (thissen1994, [M]); it does not
  say whether the signal follows the store or the recent balance.
- **Against the brief's premise** ("growth is the first claim to give way"): in the one primate with longitudinal data,
  structural growth is not the first claim to give way; the tissue reserve is, and growth follows the depleted state.
  "Growth faltering precedes loss of maintenance" holds (both sources show growth slowing while children live), but
  that is the order of growth and maintenance, not of growth and reserve.

In the model's units: the usable store is about 30% of body mass, so a relative store w = 1 + reserves ÷ store maps to
(1 − w) × 30% of body mass lost; the S6 infants' −5 to −6% is about 1.7% of body mass, C8's knee (−29%) about 9%.

### 2.2 Iteration 1: one switch, two arms (one per reading the diagnosis and sources leave open)

**Switch `growYield`** (design, integer 0–2, 0 by default = today, bit-identical; read only with `energyLedger`,
`ledgerGrowSurplus` and `ledgerGrowPotential` 1). In energyTick's growth block f (the share of the potential paid) is:

- **0 (today):** f = min(1, cond ÷ `condGood`) (C8's rule; E1f iteration 2).
- **1, arm Y1, growth yields in proportion to the relative store (the order the sources give):** f = min(1, cond ÷
  `ledgerCondSet`) = min(1, max(0, 1 + reserves ÷ usable store)). C8's rule with its reference condition at the
  ledger's set point (the state the drive regulates to and condition reads as 0.7) instead of a timer-scale value: the
  reserve gives way first and growth yields in proportion to how much of it is gone, continuously, from the set point to
  an empty store (none at starvation). No new number; the proportional form is a design assumption with no free
  parameter (as E1i's satiation weight), and it is graded as richard2012's association is.
- **2, arm Y2, growth only from what is left after maintenance (the brief's premise, a bound):** f = min(C8's f,
  clamp((aAvg − mAvg) ÷ G, 0, 1)), aAvg the day-long mean of energy absorbed (kcal/h, `driveAvgH` 24 h, kept on the
  ledger while the animal is below adult mass and opened at mAvg + G, E1f iteration 1's books), mAvg the day-long mean of
  all other spending (existing), G the potential's cost (kcal/h). On the day-long mean the reserves never pay for
  growth; a shortfall below maintenance still draws on them. This is E1f iteration 1's rule (west2001's allocation) on
  the S6 stack; E1f found it hides the shortfall from the appetite, so growth velocity reports the dependents' option
  weights. Its order (growth first, reserve protected) is the reverse of schoenbuchner2019's; it is run to bound how much
  the partition can move S6's dyads, not as the physiological reading.

Both arms leave the drive as E1f set it (expected spending = mAvg + growth at the potential, fao2004 §4.4), the cost per
gram, the potential and the adult mass. Neither removes a counted prescription (`condGood` is still read by fertility
and the growth record): `removesNothing`; prescriptions 76 in both.

**Implementation** (before the arms; disclosed): `src/sim/energy.ts` (growth block, aAvg books, an exported pure
`growFraction`), `src/sim/state.ts` (`aAvg` on the ledger, optional), registry entry `growYield` and its §17 row,
switch lists (`tests/sim-track-e.test.ts`, `scripts/lib/prescriptions.ts`), `tests/sim-e1p.test.ts` (default 0 and
hash-identity with the switch at 0 over a field day; `growFraction` per mode; determinism of each mode over a day; the
aAvg books open and close with growth). Smoke tests: seed 48, S6 + the switch, 1-day burn-in + 2 days, readouts only.

**Arms:** S6 (`S6q-params.json`) + `{"growYield":1}` (Y1) and + `{"growYield":2}` (Y2). Runs per arm: `e-bench --quick`
(seeds 48, 7; 30 + 30 days; `--workers 1`) and `energy-diagnose` (same seeds and window), one at a time, from a frozen
detached checkout of the commit that adds this section and the code; load checked first (runs only below a 1-minute
load of 30). Reference: S6q, S6q1–S6q3 (integrator, bench-run cac9598; not re-run).

**Predictions (by hand, before any run; against the four S6 runs' mean ± SD; the reference's growth spread is 0, all at
the potential).**

| Quantity | S6q (diagnosis) | Y1 expected | Y2 expected |
| --- | --- | --- | --- |
| f paid, infants 0.5–4 y; juveniles growing | 1.000 | 0.93–0.96; 0.91–0.96 (high) | 0.45–0.85; 0.40–0.85 (low) |
| Velocity (ledger mass), 0.5–1 / 1–4 y, kg/y | 2.80 / 3.60 | 2.60–2.70 / 3.35–3.45 (high) | 1.3–2.4 / 1.6–3.0 (low) |
| Velocity, juveniles 5–8 y F / 8–12 y M | 3.40 / 3.80 | 3.10–3.25 / 3.55–3.70 (high) | 1.4–2.9 / 1.5–3.2 (low) |
| Infants' reserves (class OLS %/day; level) | 0.5–2 y −0.010; 2–5 y +0.030; levels −5 to −6% | within the reference spread, level up ≤ 0.01 (moderate): ≤ 3 kcal/day spared, and the dyad rule hands any gain back to the mother | level −2 to −6%, slopes not worse than the reference (low) |
| Juveniles' reserves | −0.020 %/day; level −6% | within spread, level up ≤ 0.01 (moderate) | level up 0.01–0.05 toward the set point; eating minutes down 2–10% (moderate: the drive's deficit term shrinks) |
| Infants' daylight hunger; own food 1–4 y | 0.35–0.39; 270 / 428 / 627 kcal/day | within ±0.02; within ±5% (moderate) | down 0.01–0.05; down 0–20% (moderate: E1f's hidden shortfall) |
| Milk drunk 1–2 / 2–3 / 3–4 y | 241 / 224 / 213 kcal/day | within ±10 (moderate) | down 0–40 (low) |
| Mothers' balance by infant age; lactating reserves | −15 / −4 / +10 / +4 kcal/day; +0.010 %/day | within the spread (moderate) | up 0–20 kcal/day at 1–4 y (low) |
| Bench sums (fitted; held-out; without T-HUN-4, T-BRD-1; without T-IGE-3) | group mean | inside noise (high) | inside noise (moderate) |
| Prescriptions; viability | 76; pass | 76; pass (high) | 76; pass (moderate) |

**Decision rule (registered, as E1o's).** An arm is a *provisional keep candidate* if viable (no starvation death; no
class below −0.05%/day that is not already below it in the reference by more than its spread), the held-out sums not
up (|z| ≤ 2, with and without T-HUN-4 and T-BRD-1; reported also without T-IGE-3) and the fitted sum not up beyond
noise. Neither arm removes a prescription, so neither can go on by default under the Track E rule. An arm answers the
stage's question if growth at 1–4 y falls below the reference beyond its spread; the share of a shortfall carried by
growth (growth not paid ÷ (growth not paid + reserves lost), by class) is reported for each arm. Y2 stays a bound even if
it passes (its order contradicts schoenbuchner2019), and the prereg says so.

**Implementation checks (before the arms; disclosed).** Code at the commit that adds this paragraph. `growYield` 0 on the
S6 stack gives the same world hash as f5d0597 (the commit before the change) after one field day on seeds 48 and 7
(b21042a6c6795a5f, 6414fa749de2ae17; scratch `tools/hash_check.mts`); `tests/sim-e1p.test.ts` 4 pass (defaults,
`growFraction` per mode, the aAvg books, determinism of modes 1 and 2 over a quarter day); `tsc` clean; `gen-params
--check` clean (991 entries). Prescription count on S6: 76 with `growYield` 0, 1 and 2 (`removesNothing`). Readouts added
to the E1p section before any arm (§2.0): growing ticks paid below the potential, and the weighed-mass velocity (kg +
reserves ÷ 4,300 kcal/kg). Smoke tests (seed 48, S6 + each mode, 1-day burn-in + 2 days; `scratch e1p/smoke/`): every
readout prints; Y1 pays 0.98–0.995 of the potential, Y2 0.04–0.38 in those two days (the window's first days are the
dyads' transient, S < 0 in most groups), and Y2's books exist only on growing animals. No prediction was changed after
the smoke tests.

### 2.3 Extension check: the confirm's second month (registered 19:27, while Y1's bench ran and before any arm result was read; not an iteration: no mechanism changes)

The diagnosis (§1.4) put the S6 infants' fall in the confirm's second month (sim days 60–90), which quick mode (days
30–60) does not reach. So the arms' answer to the stage's question needs that month. Runs: `energy-diagnose` on seeds 48
and 7, 30-day burn-in + 60 days (90 days in all, the cap), for S6, Y1 and Y2, one at a time from the frozen checkout
27edc1b (S6 = `growYield` 0, identical to cac9598 by the hash check in §2.2). The integrator's S6c-energy.json pools five
seeds and cannot be split, so S6 is run here on the two development seeds (disclosed: one extra reference simulation,
for a window the shared reference does not cover). Judged by size (one run each), against S6 on the same seeds.

Predictions (by hand):
- S6: infants 0.5–2 and 2–5 y fall in the second 30 days by 0.05–0.20% of the store a day (moderate; the confirm pooled
  five seeds at 0.11–0.15 over 60 days with most of it in the second month); growth paid ÷ potential 1.000.
- Y1: pays 0.85–0.95 of the potential in the second 30 days at 0.5–4 y (moderate); the infants' second-month fall
  10–40% slower than S6's (moderate: growth yields (1 − w) × G, 3–6 kcal/day at −8 to −13%, against a fall of 10–20).
- Y2: pays 0.3–0.7 of the potential in the second month (low); the infants' second-month fall less than half of S6's
  (low).
- Mothers (lactating class) fall in the second month in all three; Y1 within 0.02%/day of S6 (moderate).
