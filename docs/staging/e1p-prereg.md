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

### 2.4 Iteration 1 results (Y1 and Y2 at 27edc1b, `git.dirty` 0; reference S6q, S6q1–S6q3 at cac9598)

Quick mode, seeds 48 and 7, 30 + 30 days, rules policy; one e-bench and one energy-diagnose per arm. Every number below
was generated from the JSON by the scratch scripts `judge_extra.py` (the integrator's `judge_vs_reps.py` gives the same
sums and z), `energy_compare.py` and `partition.py` (`e1p/tools/`, not tracked). Each arm is judged on the rows counted
in the reference's four runs and that arm. T-IGE-3 is not among the rows counted in all runs in quick mode, so the sum
without it equals the sum without T-HUN-4 and T-BRD-1.

```
Y1.json commit 27edc1b dirty 0 prescriptions 76 viability pass deaths 0 starvation 0
rows counted in all runs: fitted 17, held-out 13
fitted                           (17 rows) ref 2.64 / 3.60 / 3.39 / 1.70 (mean 2.83, sd 0.86; used 0.86) | Y1.json: 1.26, Δ -1.57, z -1.6
held-out                         (13 rows) ref 4.95 / 5.11 / 5.09 / 4.20 (mean 4.84, sd 0.43; used 1.26) | Y1.json: 5.91, Δ +1.08, z +0.8
held-out w/o rare                (12 rows) ref 4.95 / 5.11 / 4.97 / 4.20 (mean 4.80, sd 0.41; used 0.48) | Y1.json: 5.07, Δ +0.26, z +0.5
held-out w/o rare, w/o T-IGE-3   (12 rows) ref 4.95 / 5.11 / 4.97 / 4.20 (mean 4.80, sd 0.41; used 0.48) | Y1.json: 5.07, Δ +0.26, z +0.5
Y2.json commit 27edc1b dirty 0 prescriptions 76 viability pass deaths 0 starvation 0
rows counted in all runs: fitted 16, held-out 12
fitted                           (16 rows) ref 2.59 / 3.60 / 3.39 / 1.70 (mean 2.82, sd 0.86; used 0.86) | Y2.json: 2.43, Δ -0.39, z -0.4
held-out                         (12 rows) ref 4.45 / 4.61 / 4.59 / 3.70 (mean 4.34, sd 0.43; used 1.26) | Y2.json: 5.59, Δ +1.26, z +0.9
held-out w/o rare                (11 rows) ref 4.45 / 4.61 / 4.47 / 3.70 (mean 4.30, sd 0.41; used 0.48) | Y2.json: 4.12, Δ -0.19, z -0.3
held-out w/o rare, w/o T-IGE-3   (11 rows) ref 4.45 / 4.61 / 4.47 / 3.70 (mean 4.30, sd 0.41; used 0.48) | Y2.json: 4.12, Δ -0.19, z -0.3
```

Rows beyond 2 SD of the reference runs (judge_vs_reps.py): Y1 T-RNG-5 1.30 (reference 0.62 ± 0.27), T-FOOD-10 1.96
(2.17 ± 0.09, better), T-HUN-4 (rare) 0.85; Y2 T-HUN-1 1.34 (0.51 ± 0.26), T-HUN-4 (rare) 1.48.

Energy and growth readouts against the reference's four runs (mean ± SD; * beyond 2 SD; the growth readouts have SD 0,
every reference run grows at the potential; class-level reserve levels have SDs of 0.001–0.003 while single dyads vary
by ±0.01–0.02 between the reference runs):

| readout | S6q / S6q1 / S6q2 / S6q3 | S6 mean ± SD | Y1 | Y2 |
| --- | --- | --- | --- | --- |
| growth kg/y 0.5–1 y | 2.80 / 2.80 / 2.80 / 2.80 | 2.80 ± 0.00 | 2.65 * | 1.26 * |
| weighed kg/y 0.5–1 y | 2.62 / 2.86 / 2.56 / 2.67 | 2.68 ± 0.13 | 2.21 * | 1.01 * |
| milk kcal/d 0.5–1 y | 282 / 285 / 282 / 282 | 283 ± 1 | 275 * | 249 * |
| own food kcal/d 0.5–1 y | 0 / 0 / 0 / -0 | -0 ± 0 | -0 | 0 |
| infant reserves level 0.5–1 y | -0.050 / -0.052 / -0.048 / -0.048 | -0.049 ± 0.002 | -0.052 | -0.039 * |
| mothers balance kcal/d 0.5–1 y | -15 / -9 / -18 / -13 | -14 ± 4 | -25 * | -5 * |
| growth kg/y 1–2 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.38 * | 1.34 * |
| weighed kg/y 1–2 y | 3.31 / 3.40 / 2.96 / 3.28 | 3.24 ± 0.19 | 3.20 | 1.03 * |
| milk kcal/d 1–2 y | 240 / 251 / 236 / 235 | 241 ± 7 | 241 | 212 * |
| own food kcal/d 1–2 y | 270 / 255 / 268 / 273 | 266 ± 8 | 266 | 246 * |
| infant reserves level 1–2 y | -0.062 / -0.062 / -0.063 / -0.067 | -0.064 ± 0.002 | -0.061 | -0.049 * |
| mothers balance kcal/d 1–2 y | -4 / -3 / -18 / -19 | -11 ± 9 | -17 | -17 |
| growth kg/y 2–3 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.36 * | 1.41 * |
| weighed kg/y 2–3 y | 3.67 / 3.21 / 3.39 / 3.42 | 3.42 ± 0.19 | 2.89 * | 1.21 * |
| milk kcal/d 2–3 y | 224 / 216 / 222 / 217 | 220 ± 4 | 208 * | 196 * |
| own food kcal/d 2–3 y | 428 / 432 / 427 / 433 | 430 ± 3 | 436 | 404 * |
| infant reserves level 2–3 y | -0.054 / -0.056 / -0.056 / -0.053 | -0.055 ± 0.002 | -0.067 * | -0.049 * |
| mothers balance kcal/d 2–3 y | 10 / 5 / 4 / -18 | 0 ± 13 | -15 | -21 |
| growth kg/y 3–4 y | 3.60 / 3.60 / 3.60 / 3.60 | 3.60 ± 0.00 | 3.37 * | 1.57 * |
| weighed kg/y 3–4 y | 4.07 / 4.11 / 4.34 / 3.50 | 4.00 ± 0.36 | 3.35 | 1.44 * |
| milk kcal/d 3–4 y | 213 / 214 / 215 / 209 | 213 ± 2 | 199 * | 196 * |
| own food kcal/d 3–4 y | 627 / 625 / 628 / 620 | 625 ± 3 | 632 * | 590 * |
| infant reserves level 3–4 y | -0.056 / -0.053 / -0.059 / -0.057 | -0.056 ± 0.003 | -0.063 * | -0.050 * |
| mothers balance kcal/d 3–4 y | 4 / 13 / 18 / 6 | 10 ± 6 | 23 * | -2 |
| growth kg/y juv F 4–8 y | 3.40 / 3.40 / 3.40 / 3.40 | 3.40 ± 0.00 | 3.14 * | 1.51 * |
| growth kg/y juv M 8–12 y | 3.80 / 3.80 / 3.80 / 3.80 | 3.80 ± 0.00 | 3.63 * | 1.83 * |
| reserves %/day infant 0.5–2 y | -0.010 / -0.011 / -0.051 / -0.037 | -0.028 ± 0.020 | -0.050 | -0.037 |
| reserves %/day infant 2–5 y | 0.030 / 0.016 / 0.029 / 0.000 | 0.019 ± 0.014 | 0.005 | -0.015 * |
| reserves %/day juvenile 5–12 y | -0.020 / -0.014 / -0.001 / -0.016 | -0.013 ± 0.008 | -0.020 | -0.028 |
| reserves %/day female, lactating | 0.010 / 0.000 / -0.006 / -0.019 | -0.004 ± 0.012 | -0.018 | -0.026 |
| reserves level infant 0.5–2 y | -0.056 / -0.057 / -0.056 / -0.057 | -0.057 ± 0.001 | -0.057 | -0.044 * |
| day hunger infant 0.5–2 y | 0.388 / 0.397 / 0.381 / 0.376 | 0.386 ± 0.009 | 0.387 | 0.359 * |
| eating min infant 0.5–2 y | 49 / 46 / 49 / 49 | 48 ± 1 | 49 | 47 |
| reserves level infant 2–5 y | -0.055 / -0.055 / -0.058 / -0.055 | -0.056 ± 0.001 | -0.065 * | -0.049 * |
| day hunger infant 2–5 y | 0.350 / 0.355 / 0.352 / 0.354 | 0.353 ± 0.002 | 0.364 * | 0.349 |
| eating min infant 2–5 y | 151 / 151 / 153 / 149 | 151 ± 2 | 154 | 141 * |
| reserves level juvenile 5–12 y | -0.062 / -0.064 / -0.059 / -0.059 | -0.061 ± 0.003 | -0.057 | -0.050 * |
| day hunger juvenile 5–12 y | 0.400 / 0.392 / 0.380 / 0.385 | 0.389 ± 0.009 | 0.386 | 0.391 |
| eating min juvenile 5–12 y | 272 / 271 / 273 / 276 | 273 ± 2 | 271 | 253 * |
| reserves level female, lactating | -0.055 / -0.056 / -0.057 / -0.056 | -0.056 ± 0.001 | -0.061 * | -0.047 * |
| day hunger female, lactating | 0.452 / 0.457 / 0.455 / 0.457 | 0.455 ± 0.002 | 0.471 * | 0.450 * |
| eating min female, lactating | 275 / 277 / 274 / 277 | 276 ± 1 | 275 | 267 * |
| T-ENE-1 energy eaten kcal/d (lactating) | 1736 / 1743 / 1736 / 1726 | 1735 ± 7 | 1726 | 1688 * |
| T-ENE-2 eating min (lactating) | 275 / 277 / 274 / 277 | 276 ± 1 | 275 | 267 * |
| T-ENE-3 dry matter g/d (lactating) | 775 / 773 / 775 / 769 | 773 ± 3 | 772 | 758 * |
| T-ENE-8 kcal out / M^0.75 | 98.9 / 99.5 / 99.0 / 99.2 | 99.1 ± 0.2 | 99.9 * | 98.8 |
| T-INF-1 eating % daylight 1–2 y | 13.0 / 12.2 / 13.0 / 12.9 | 12.8 ± 0.4 | 12.9 | 12.5 |
| T-INF-2 nurse act % daylight 1–2 y | 9.6 / 10.1 / 8.7 / 9.0 | 9.3 ± 0.6 | 9.1 | 7.7 * |
| T-INF-5 bouts per daylight h 1–2 y | 0.93 / 0.98 / 0.82 / 0.93 | 0.91 ± 0.07 | 0.92 | 0.77 * |
| T-INF-1 eating % daylight 2–3 y | 18.5 / 19.0 / 18.4 / 18.2 | 18.6 ± 0.3 | 19.4 * | 17.7 * |
| T-INF-2 nurse act % daylight 2–3 y | 9.4 / 8.3 / 9.3 / 8.4 | 8.9 ± 0.6 | 8.7 | 7.9 |
| T-INF-5 bouts per daylight h 2–3 y | 1.25 / 1.09 / 1.24 / 1.16 | 1.19 ± 0.07 | 1.16 | 1.07 |
| T-INF-1 eating % daylight 3–4 y | 21.4 / 21.1 / 22.0 / 21.1 | 21.4 ± 0.4 | 21.4 | 19.7 * |
| T-INF-2 nurse act % daylight 3–4 y | 8.8 / 9.2 / 9.5 / 9.6 | 9.3 ± 0.4 | 8.4 * | 8.1 * |
| T-INF-5 bouts per daylight h 3–4 y | 1.28 / 1.27 / 1.35 / 1.36 | 1.31 ± 0.04 | 1.15 * | 1.18 * |
| deaths by class | {} / {} / {} / {"adult male: illness": 1} | | {} | {} |
(* beyond 2 SD of the reference runs; a reference SD of 0 marks any change)

The partition, from the E1p section (per animal-day; S6q is the diagnosis run, identical to the reference's first run;
reserve change = S − growth paid; share of the shortfall carried by growth = unpaid growth ÷ (unpaid growth + reserves
lost), shown where either is positive):

| group | S6q: paid / unpaid / reserve change kcal/d; paid ÷ potential; ticks below potential %; velocity / weighed kg/y; share of the shortfall carried by growth | Y1: paid / unpaid / reserve change kcal/d; paid ÷ potential; ticks below potential %; velocity / weighed kg/y; share of the shortfall carried by growth | Y2: paid / unpaid / reserve change kcal/d; paid ÷ potential; ticks below potential %; velocity / weighed kg/y; share of the shortfall carried by growth |
| --- | --- | --- | --- |
| 0.5–1 y | 34.5 / 0.0 / -2.1; 1.000; —; 2.80 / —; growth 0% | 32.7 / 1.8 / -5.3; 0.948; 100.0; 2.65 / 2.21; growth 26% | 15.6 / 18.9 / -3.0; 0.451; 79.5; 1.26 / 1.01; growth 86% |
| 1–2 y | 44.4 / 0.0 / -3.5; 1.000; —; 3.60 / —; growth 0% | 41.7 / 2.7 / -2.2; 0.940; 100.0; 3.38 / 3.20; growth 55% | 16.5 / 27.9 / -3.6; 0.372; 84.3; 1.34 / 1.03; growth 89% |
| 2–3 y | 44.4 / 0.0 / 0.8; 1.000; —; 3.60 / —; growth —% | 41.4 / 3.0 / -5.5; 0.933; 100.0; 3.36 / 2.89; growth 35% | 17.3 / 27.0 / -2.3; 0.391; 76.3; 1.41 / 1.21; growth 92% |
| 3–4 y | 44.4 / 0.0 / 5.6; 1.000; —; 3.60 / —; growth —% | 41.6 / 2.8 / -0.3; 0.937; 100.0; 3.37 / 3.35; growth 90% | 19.3 / 25.0 / -1.5; 0.436; 69.0; 1.57 / 1.44; growth 94% |
| juvenile 5–8 y F | 41.9 / 0.0 / -14.5; 1.000; —; 3.40 / —; growth 0% | 38.7 / 3.2 / -14.0; 0.923; 100.0; 3.14 / 1.95; growth 19% | 18.5 / 23.3 / -11.7; 0.443; 65.3; 1.51 / 0.51; growth 67% |
| juvenile 8–12 y M | 46.8 / 0.0 / 6.2; 1.000; —; 3.80 / —; growth —% | 44.7 / 2.1 / 12.4; 0.955; 100.0; 3.63 / 4.68; growth 100% | 22.6 / 24.3 / -4.0; 0.482; 60.1; 1.83 / 1.49; growth 86% |

Class slopes (OLS of the daily class means, %/day; reference −0.028 ± 0.020 / +0.019 ± 0.014 / −0.013 ± 0.008 / −0.004
± 0.012 for infants 0.5–2 y, 2–5 y, juveniles, lactating females): Y1 −0.050 / +0.005 / −0.020 / −0.018; Y2 −0.037 /
−0.015 / −0.028 / −0.026. Y1's infants of 0.5–2 y sit at −0.0501, inside the reference's spread (its run S6q2: −0.051).

**Against the predictions (§2.2).**
- *Y1.* Held: f paid 0.933–0.948 in infants and 0.923 / 0.955 in juveniles; velocity 2.65 (0.5–1 y), 3.36–3.38 (1–4 y),
  3.14 (F 5–8 y), 3.63 kg/y (M 8–12 y); class slopes inside the reference's spread; juveniles' level up 0.004; infants'
  hunger and own food unchanged; sums inside noise (fitted z −1.6, held-out +0.8, without the rare rows +0.5); 76
  prescriptions; viable. Missed: the infants' level at 2–5 y fell 0.009 (−0.065 against −0.056 ± 0.001; beyond the class
  spread, inside the spread of single dyads, of which two ended near −0.10); milk at 2–3 and 3–4 y fell 12 and 14
  kcal/day (predicted within ±10); mothers' balance at 0.5–1 y −25 and at 3–4 y +23 kcal/day (outside the spread, in
  opposite directions). Reading: the spared growth (1.8–3.2 kcal/day per animal) is below what the window resolves, and
  the dyads' common level moved with their trajectories, not with the rule.
- *Y2.* Held: juveniles paid 0.44 / 0.48 of the potential (1.51 and 1.83 kg/y), their level up 0.011 and eating minutes
  −7%; infants' levels −0.044 / −0.049 (up 0.007–0.013); infants of 0.5–2 y less hungry (0.359 against 0.386) and own
  food down 6–8% at 1–4 y (E1f's hidden shortfall: the appetite no longer asks for the growth it is not paying); milk
  down 17–34 kcal/day; sums inside noise (fitted z −0.4, held-out +0.9, without the rare rows −0.3); 76; viable.
  Missed: infants paid only 0.37–0.45 of the potential (predicted 0.45–0.85), 1.26 kg/y at 0.5–1 y and 1.34–1.57 at 1–4 y
  (predicted 1.3–2.4 and 1.6–3.0); the infants' 2–5 y slope −0.015 against +0.019 ± 0.014 (worse); mothers' balance not
  up (−5 / −17 / −21 / −2 kcal/day against −14 / −11 / 0 / +10): the mothers' reserves are higher (−0.047 against
  −0.056), so they eat 9 minutes and 47 kcal a day less, and the milk they save does not reach their balance.
- Y2's 1.3–1.6 kg/y sits near the Gombe-derived 1.6 kg/y; as in E1f iteration 1 that is not evidence for the rule: with
  growth paid only from the surplus, velocity reports the appetite's operating point (hunger and own food fall with it).

**Verdict for iteration 1 (registered rule).** Both arms are viable, their held-out sums are not up (|z| ≤ 0.9) and
their fitted sums not up (z −1.6, −0.4): both are *provisional keep candidates* by the rule, neither removes a
prescription, so neither can go on by default. Both answer the stage's question in the sense registered (growth at 1–4
y below the reference beyond its spread), with opposite partitions:
- Y1 (the order the sources give): growth carries 26–55% of the infants' shortfall at 0.5–3 y (90% at 3–4 y, where the
  reserves barely fell) and 19% of the juvenile females'; the reserves carry the rest; 5–8% less growth, no measurable
  gain for the reserves in 30 days.
- Y2 (the brief's premise, a bound): growth carries 86–94% of the infants' shortfall and 67–86% of the juveniles'; growth
  at 37–48% of the potential; the reserves gain 0.7–1.3% of the store; the appetite falls with the growth not paid.

Next (§2.3, registered): the confirm's second month on the development seeds, where the S6 infants' fall happens.

**Amendment to §2.3 (logged 19:50, after S6's and Y1's extension runs were read, before Y2's; disclosed).** In the
second 30 days every class falls, and Y1 differs from S6 in classes the rule cannot touch (adult males −0.069 against
−0.094%/day), so a single run per arm cannot separate the rule from the trajectory. As e-noise.md amendment 2 does for
the benchmark, S6's extension run is re-drawn three times (`rgTemperature` 0.1641, 0.1639, 0.16405; same seeds, window
and checkout) and each arm's second-month slopes are read against the four S6 realizations (mean ± SD), with the adult
classes as the control. Predictions unchanged.


### 2.5 Extension check results (seeds 48 and 7, 30 + 60 days, frozen checkout 27edc1b; S6 plus three re-draws; generated by `ext_judge.py` from the energy JSONs, scratch `e1p/`)

The first 30 days of each run reproduce the quick runs (S6's first-month slopes equal S6q's: −0.010, +0.030, −0.020,
+0.010%/day), as they must. One S6 re-draw (`rgTemperature` 0.1639) had a respiratory outbreak (two adult males and one
lactating female died), which widens the infants 0.5–2 y row; no death in Y1 or Y2, none by starvation anywhere.

| reserves ÷ store, %/day | S6 runs (S6, r0.1641, r0.1639, r0.16405) | S6 mean ± SD | Y1 | Y2 |
| --- | --- | --- | --- | --- |
| infant 0.5–2 y, days 31–60 | -0.267 / -0.206 / -0.530 / -0.311 | -0.329 ± 0.141 | -0.173 (z +1.0) | -0.177 (z +1.0) |
| infant 0.5–2 y, days 1–30 | -0.010 / -0.011 / -0.051 / -0.037 | -0.028 ± 0.020 | -0.050 (z -1.0) | -0.037 (z -0.4) |
| infant 0.5–2 y, whole | -0.105 / -0.079 / -0.222 / -0.127 | -0.133 ± 0.063 | -0.087 (z +0.7) | -0.075 (z +0.8) |
| infant 2–5 y, days 31–60 | -0.162 / -0.145 / -0.153 / -0.161 | -0.155 ± 0.008 | -0.081 (z +8.4) | -0.096 (z +6.7) |
| infant 2–5 y, days 1–30 | +0.030 / +0.016 / +0.029 / +0.000 | +0.019 ± 0.014 | +0.005 (z -0.9) | -0.015 (z -2.2) |
| infant 2–5 y, whole | -0.045 / -0.043 / -0.040 / -0.059 | -0.047 ± 0.009 | -0.010 (z +3.8) | -0.046 (z +0.1) |
| juvenile 5–12 y, days 31–60 | -0.118 / -0.113 / -0.133 / -0.120 | -0.121 ± 0.009 | -0.086 (z +3.6) | -0.106 (z +1.6) |
| juvenile 5–12 y, days 1–30 | -0.020 / -0.014 / -0.001 / -0.016 | -0.013 ± 0.008 | -0.020 (z -0.8) | -0.028 (z -1.7) |
| juvenile 5–12 y, whole | -0.045 / -0.052 / -0.048 / -0.055 | -0.050 ± 0.004 | -0.029 (z +4.2) | -0.044 (z +1.3) |
| female, lactating, days 31–60 | -0.195 / -0.169 / -0.184 / -0.212 | -0.190 ± 0.018 | -0.111 (z +3.9) | -0.133 (z +2.8) |
| female, lactating, days 1–30 | +0.010 / +0.000 / -0.006 / -0.019 | -0.004 ± 0.012 | -0.018 (z -1.0) | -0.026 (z -1.6) |
| female, lactating, whole | -0.069 / -0.058 / -0.078 / -0.085 | -0.072 ± 0.012 | -0.042 (z +2.3) | -0.059 (z +1.0) |
| female, other, days 31–60 | -0.089 / -0.068 / -0.058 / -0.064 | -0.070 ± 0.014 | -0.088 (z -1.2) | -0.095 (z -1.6) |
| female, other, days 1–30 | +0.042 / +0.003 / +0.000 / +0.018 | +0.016 ± 0.019 | +0.004 (z -0.5) | +0.012 (z -0.2) |
| female, other, whole | -0.015 / -0.032 / -0.022 / -0.017 | -0.022 ± 0.008 | -0.028 (z -0.7) | -0.026 (z -0.5) |
| adult male, days 31–60 | -0.094 / -0.076 / -0.089 / -0.052 | -0.078 ± 0.019 | -0.069 (z +0.4) | -0.077 (z +0.0) |
| adult male, days 1–30 | +0.020 / +0.013 / +0.018 / +0.018 | +0.017 ± 0.003 | +0.017 (z -0.1) | +0.003 (z -4.2) |
| adult male, whole | -0.028 / -0.025 / -0.028 / -0.017 | -0.025 ± 0.005 | -0.017 (z +1.4) | -0.023 (z +0.3) |
| 0.5–1 y (E1p), days 31–60 | -0.133 / -0.106 / -0.134 / -0.163 | -0.134 ± 0.023 | -0.064 (z +2.7) | -0.201 (z -2.6) |
| 1–2 y (E1p), days 31–60 | -0.320 / -0.243 / -0.441 / -0.356 | -0.340 ± 0.082 | -0.220 (z +1.3) | -0.143 (z +2.1) |
| 2–3 y (E1p), days 31–60 | -0.140 / -0.123 / -0.136 / -0.143 | -0.136 ± 0.009 | -0.074 (z +6.2) | -0.076 (z +6.1) |
| 3–4 y (E1p), days 31–60 | -0.189 / -0.156 / -0.177 / -0.189 | -0.178 ± 0.016 | -0.079 (z +5.6) | -0.124 (z +3.1) |
| juvenile 5–8 y F (E1p), days 31–60 | -0.146 / -0.138 / -0.180 / -0.148 | -0.153 ± 0.018 | -0.052 (z +4.9) | -0.098 (z +2.7) |
| juvenile 8–12 y M (E1p), days 31–60 | -0.083 / -0.077 / -0.085 / -0.075 | -0.080 ± 0.005 | -0.113 (z -6.2) | -0.096 (z -3.0) |
| milk kcal/d 0.5–1 y (60 d) | +281.540 / +281.088 / +279.850 / +279.391 | +280.467 ± 1.012 | +277.077 (z -3.0) | +244.612 (z -31.7) |
| mothers' balance kcal/d 0.5–1 y (60 d) | -30.258 / -23.880 / -35.874 / -32.303 | -30.579 ± 5.033 | -28.646 (z +0.3) | -25.790 (z +0.9) |
| milk kcal/d 1–2 y (60 d) | +247.045 / +252.158 / +229.982 / +239.028 | +242.053 ± 9.693 | +245.925 (z +0.4) | +211.527 (z -2.8) |
| mothers' balance kcal/d 1–2 y (60 d) | -56.694 / -40.835 / -72.291 / -68.286 | -59.527 ± 14.108 | -46.379 (z +0.8) | -39.096 (z +1.3) |
| milk kcal/d 2–3 y (60 d) | +207.882 / +207.868 / +213.199 / +203.323 | +208.068 ± 4.038 | +202.102 (z -1.3) | +182.577 (z -5.6) |
| mothers' balance kcal/d 2–3 y (60 d) | -35.895 / -38.275 / -34.496 / -50.404 | -39.767 ± 7.261 | -28.177 (z +1.4) | -33.745 (z +0.7) |
| milk kcal/d 3–4 y (60 d) | +196.268 / +204.685 / +197.544 / +198.689 | +199.296 ± 3.726 | +195.320 (z -1.0) | +180.853 (z -4.4) |
| mothers' balance kcal/d 3–4 y (60 d) | -33.747 / -25.038 / -26.338 / -36.390 | -30.378 ± 5.548 | -5.561 (z +4.0) | -26.507 (z +0.6) |
| 0.5–1 y velocity kg/y (60 d) | +2.941 / +2.941 / +2.921 / +2.941 | +2.936 ± 0.010 | +2.750 (z -16.5) | +1.046 (z -167.1) |
| 0.5–1 y weighed-mass velocity kg/y (60 d) | +2.368 / +2.391 / +1.374 / +2.195 | +2.082 ± 0.480 | +2.118 (z +0.1) | +0.549 (z -2.9) |
| 1–2 y velocity kg/y (60 d) | +3.600 / +3.600 / +3.600 / +3.600 | +3.600 ± 0.000 | +3.353 (z -6449.9) | +1.189 (z -62876.7) |
| 1–2 y weighed-mass velocity kg/y (60 d) | +2.567 / +2.923 / +2.501 / +2.560 | +2.638 ± 0.192 | +2.700 (z +0.3) | +0.509 (z -9.9) |
| 2–3 y velocity kg/y (60 d) | +3.600 / +3.600 / +3.600 / +3.600 | +3.600 ± 0.000 | +3.352 (z +nan) | +1.331 (z +nan) |
| 2–3 y weighed-mass velocity kg/y (60 d) | +2.793 / +2.567 / +2.669 / +2.476 | +2.626 ± 0.136 | +2.637 (z +0.1) | +0.744 (z -12.4) |
| 3–4 y velocity kg/y (60 d) | +3.600 / +3.600 / +3.600 / +3.600 | +3.600 ± 0.000 | +3.379 (z +nan) | +1.360 (z +nan) |
| 3–4 y weighed-mass velocity kg/y (60 d) | +2.310 / +2.622 / +2.528 / +2.298 | +2.440 ± 0.161 | +2.760 (z +1.8) | +0.428 (z -11.2) |
| juvenile 5–8 y F velocity kg/y (60 d) | +3.400 / +3.400 / +3.400 / +3.400 | +3.400 ± 0.000 | +3.130 (z +nan) | +1.357 (z +nan) |
| juvenile 5–8 y F weighed-mass velocity kg/y (60 d) | +0.952 / +0.779 / +1.000 / +0.878 | +0.902 ± 0.096 | +1.932 (z +9.6) | -0.270 (z -10.9) |
| juvenile 8–12 y M velocity kg/y (60 d) | +3.800 / +3.800 / +3.800 / +3.800 | +3.800 ± 0.000 | +3.620 (z +nan) | +1.644 (z +nan) |
| juvenile 8–12 y M weighed-mass velocity kg/y (60 d) | +2.265 / +2.911 / +2.315 / +2.269 | +2.440 ± 0.315 | +2.268 (z -0.5) | -0.009 (z -7.0) |
S6 deaths {}
S6r0.1641 deaths {}
S6r0.1639 deaths {"adult male: respiratory illness (outbreak)": 2, "female, lactating: respiratory illness (outbreak)": 1}
S6r0.16405 deaths {"adult male: illness": 1}
Y1 deaths {}
Y2 deaths {}

Month 2 against month 1 (the 'daily' class sums, kcal eaten per individual-day): in every S6 run every class eats less
in the second month (lactating 2,189–2,207 → 2,080–2,115; infants 2–5 y 740–746 → 704–712; juveniles 1,642–1,648 →
1,614–1,620; adult males 2,077–2,082 → 2,028–2,049) at a flat spending: the season, not the infants.

**Against the predictions (§2.3).** S6: the infants fall in the second month, 2–5 y −0.155 ± 0.008%/day (inside the
predicted 0.05–0.20), 0.5–2 y −0.329 ± 0.141 (faster than predicted; the outbreak run gives −0.530), growth at the full
potential: held in direction, missed in size for 0.5–2 y. Y1: the readout gives growth paid over the whole 60 days, not
the second month alone (disclosed: the E1p section reports window totals): 0.926–0.942 at 0.5–4 y; the infants'
second-month fall is 47% (0.5–2 y) and 48% (2–5 y) slower than the S6 mean (predicted 10–40%): beyond the prediction.
Y2: paid 0.32–0.41 over 60 days (inside 0.3–0.7); its infants' second-month fall is 54% and 62% of S6's (predicted below
half: missed). Mothers fall in the second month in all three (held); Y1's within 0.02%/day of S6's: missed (−0.111
against −0.190 ± 0.018, z +3.9).

**Reading.**
1. In the second month the shortfall is the community's: every class eats 2–6% less at a flat spending, and infants and
   their mothers fall fastest (the dyad rule couples them).
2. Y1 (growth in proportion to the relative store) pays 92–95% of the potential over 60 days, yet its immatures and
   mothers fall 30–50% more slowly in the second month than all four S6 realizations (infants 2–5 y z +8.4, juveniles
   +3.6, lactating females +3.9), with the controls inside (adult males z +0.4, other females −1.2). Over the 60 days
   growth not paid matches the reserves' gain against the S6 mean at 0.5–3 y (2.0 / 3.3 / 3.1 kcal/day not paid,
   −0.7 / +2.7 / +4.2 gained) but explains only part of it at 3–4 y (2.7 of 6.4) and in juvenile females (3.3 of 15.3;
   juvenile males: 2.2 not paid, +0.1 gained). The rest is month-2 intake (lactating females eat 2,131 kcal/day against
   2,080–2,115 in the S6 runs; infants of 2–5 y 719 against 704–712), which the rule does not set directly. Either the
   coupled dyads respond more than their growth saving (a dynamic effect the readouts do not trace) or temperature
   re-draws understate the trajectory spread of a structural change. Two seeds and four dyads per age bin cannot
   separate the two: a 5-seed confirm would.
3. Y2 (growth only from the day's surplus) does not stop the second-month fall: with growth unpaid, the infants'
   appetite and intake fall too (month 2: 661 kcal/day eaten at 2–5 y against 704–712, 324 at 0.5–2 y against 367–372),
   so their reserves still fall (2–5 y −0.096%/day), and the juveniles' weighed mass stops growing over 60 days (−0.27
   and −0.01 kg/y). Over the 60 days the appetite takes back most of what growth does not spend: 20–30 kcal/day not
   paid at 0.5–4 y, −0.6 to +5.4 gained by the reserves against the S6 mean (juvenile females 25.2 and +10.2, males 26.6
   and −3.5). Growth-first protects the reserves only where intake holds (month 1).

(Per group, 60 days, generated by a scratch one-off from the E1p sections: reserve change = S − growth paid, against the
mean of the four S6 runs.)

**Night safety (`rhythm-metrics`, seeds 48 and 7, 30 + 30 days, frozen checkout 27edc1b; the integrator's `night.py` on
the JSON).** Y1: adults out of a nest 2.81% of the night, T-RHY-5 0.0286, no death; Y2: 2.53%, 0.0259, no death (lines
3.3% and 0.033): both night safe.

## 3. Stage verdict and open problems

- **The term (§1.4).** Growth never sees the body's state: C8's rule (f = min(1, cond ÷ `condGood`)), which E1f reused,
  pays the whole captive potential until the reserves are 29% below the set point, a depth the infants never reach in
  90 days (`condGood` 0.5 was set on the timer model's condition scale; on the ledger's it is about 9% of body mass
  lost). So the reserves carry every shortfall. In the quick window there is little to carry: the infants' own books pay
  captive growth (S 32–50 against 34–44 kcal/day) at the dyads' 5–6% deficit. The S6 confirm's fall is its second month,
  when the whole community eats 2–6% less.
- **The partition the sources give** (schoenbuchner2019, richard2012, thissen1994): the tissue reserve gives way first;
  structural growth slows afterwards, graded with the depleted state. The brief's premise (growth is the first claim to
  give way) is not what the one primate with longitudinal data shows.
- **`growYield` 1 (Y1, growth in proportion to the relative store; no new number): provisional keep candidate as a
  correction, off.** Quick: growth −5 to −8% (3.36–3.38 kg/y at 1–4 y), no measurable gain for the reserves in 30
  days, sums inside noise (fitted z −1.6, held-out +0.8, without the rare rows +0.5), viable, 76 prescriptions (removes
  nothing: `condGood` stays in use for fertility and the growth record). Second month (2 seeds, against four S6
  realizations): immatures and mothers fall 30–50% more slowly, beyond the realizations' spread, with the adult
  controls inside; part of it is growth not paid and part is month-2 intake the rule does not set. Next: a 5-seed
  confirm of S6 + `growYield` 1 against S6's confirm group (60 days) to see whether the month-2 effect holds.
- **`growYield` 2 (Y2, growth only from the day-long surplus): a bound, not recommended.** It passes the registered rule
  (viable, sums inside noise, 76) and puts growth at 32–48% of the potential (1.3–1.6 kg/y at 1–4 y, near Gombe's 1.6),
  but only because the appetite falls with the growth not paid (E1f's finding reproduced: infants eat 6–8% less, mothers
  lose T-ENE-5's direction); its order contradicts the sources, and in the second month its reserves still fall.
- **No further iteration.** The remaining question, how steeply growth should yield per unit of reserve lost, has no
  source in reserve units (richard2012's association is graded and modest, but cannot be converted without body
  composition data, not verified); any slope chosen here would be a tuned constant.
- **Open problems.** (1) The season: in the second month every class loses and the infants and their mothers fall
  fastest; whether they settle needs a run beyond the 90-day cap. (2) Growth at twice Gombe's rate is fed growth: the
  infants' intake pays the captive potential in month 1, so the wild rate needs infants whose intake falls short
  (E1f's named term: intake per eating minute; the captive potential itself), not a rule that withholds growth from fed
  infants. (3) T-INF-4 compares weighed masses: the model's ledger mass ignores the reserves' tissue; the weighed-mass
  velocity (kg + reserves ÷ 4,300 kcal/kg) is the readout to score it on (S6, 60 days: 2.1–2.6 kg/y at 0.5–4 y).

## 4. Known defects and caveats (fixed before measuring, or deferred with file:line)

- `scripts/energy-diagnose.ts` E1p section: growth paid and S are window totals; the second month's share of the
  potential is not split (§2.5 reads the second month from the reserves only). Deferred.
- The weighed-mass readout converts reserves at 4,300 kcal/kg (the registry note of `ledgerReserveKcalPerKg`, a
  readout constant, not a simulation input).
- `condGood` is still read on the ledger's scale by the growth record (`src/sim/life.ts:242`) and conception
  (`src/sim/reproduction.ts:44`): the same scale mismatch as the growth rule (the knee at −29% of the store). Not changed
  here (no growth or fertility row is scored in 90 days); reported to the integrator.
- `growYield` 2 opens aAvg at mAvg + growth at the potential (E1f iteration 1's opening, design); with the switch on from
  world creation the 30-day burn-in removes it.
- Both modes leave the drive expecting growth at the potential (`spendRate`, fao2004 §4.4); in Y2 the reserve term of
  the need dominates, so the appetite still falls when growth is not paid.

## 5. Final checks (after merging `track-e` once, 15940a6: S6 quick reference and energy group, handoff refreshes)

No conflicts (track-e changed only docs/staging/e-stack2-confirm.md and the handoff). `gen-params --check` clean (991
entries, lint clean); `tsc --noEmit -p .` clean; `pnpm test` 712 tests, 711 pass, 0 fail, 1 skipped; the compressed
goldens and the field pin did not move (`growYield` 0 is hash-identical to the stack before the change, §2.2).
`git ls-files data/raw node_modules` prints nothing. Run outputs, the table scripts and the run scripts are in
`artifacts/validation/e1p/` of this worktree (local, not tracked); the frozen checkouts used for every run were removed.
