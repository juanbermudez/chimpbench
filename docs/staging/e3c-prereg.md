# E3c pre-registration: where to eat, valued as an energy rate

Status: skeleton committed at the start of the stage (3 October 2026, 22:46, branch `e3c-forage-rate`, from `track-e`
37a2042), before any run and before any code change. Track E, stage E3c. Rule served: field values of behaviour are
targets, never inputs. No weight or scale is tuned to a travel share, a day range, a number of trees or a fruit share.

## 0. The problem

- **The weights under test (field profile, which e-bench runs; the brief quoted the compressed defaults).** Where to eat
  is chosen among a crown in view, the fallback food where the animal stands, an own trip to a remembered or
  community-known tree and a joined trip to a leader's goal, each in score units:
  - a crown in view: `(1.6 h + 0.1) × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − d ÷ forageDistScaleM`
    (candidates.ts:347–348; `forageDistScaleM` field 400 m, compressed 55: "tuned to T-ACT-2 and T-RNG-4 in stage C5a");
  - the fallback: `h × fallbackForageW × bestFallbackNear × leafWorth + 0.03` (candidates.ts:355; `fallbackForageW`
    field 0.45, compressed 0.65: "tuned in C5a against T-ACT-2 and T-RNG-4");
  - a trip: `h × memTravelHungerW × (0.55 + 0.45 × min(1, crop ÷ fruitValueRef)) × tripWorth − tripCost`
    (candidates.ts:373, 393, 456; `memTravelHungerW` field 1.25, compressed 0.95: "tuned to T-ACT-2 and T-RNG-4");
  - the crop shape 0.55 + 0.45 × min(1, crop ÷ `fruitValueRef`) (field 1 unit; design) on crowns and trips;
  - a hunt under `huntValue` (off in S9) also pays `dist ÷ forageDistScaleM` (candidates.ts:967).
- **Two more fitted or copied numbers, read before deciding their scope.** `fruitIntakePerH` (field 0.11 fruit units/h,
  compressed 0.055; "tuned in C5a") converts the ledger's kcal per feeding minute into crop units
  (energy.ts:593: one unit = 60 × kcal/min ÷ `fruitIntakePerH`), so it sets how many feeding hours a crown holds;
  `walkMps` (field 0.35 m/s, compressed 0.04; "from 2.7 km/day over ~21% of an 11.5 h day") is a copy of the day range
  over the travel share, used both for moving and for the walk time of every trip valuation (intake.ts:60,
  departure.ts:35, candidates.ts:670).
- **The currency the ledger already offers.** The energy an option can deliver per unit of time, net of the walk (the
  net cost of transport, sockol2007, already charged by the ledger per metre moved): the long-term average rate of net
  energy gain of optimal foraging theory (charnov1976; stephensKrebs1986).
- **E5c's lesson (e5c-prereg.md §6.1–6.2, §7).** Valuing a crown by the share of the day's need it covers, or by the
  rate at which it meets the need, cost nursing mothers 0.3–1.2% of the store a day, because dividing by the need makes
  the neediest value the same crop least. Here the two questions stay apart: how hungry the animal is decides whether
  to forage at all (the drive, E1e); where to forage is decided by the expected net rate, the same for every animal of
  a size and skill.

## 1. Plan

1. **Diagnosis** (§2, registered before its runs) on S9 in quick mode (seeds 48 and 7, 30 + 30 days), simulation
   truth: for foraging decisions, the terms of the chosen and the best rejected options (crop shape, distance penalty,
   fallback worth, memory worth, rain, territory, crowding), what each fitted weight contributes to the choice and to
   travel, and the realized net energy rate (kcal absorbed per minute of walking plus feeding, net of the walking cost)
   of chosen against rejected options. Reuse crown-share-diagnose (E5c) and revisit-diagnose (E3b) where they already
   read these terms. Name the terms that would change under a net-rate valuation, with numbers.
2. **Mechanism** behind a new switch (`forageRate`, 0 = today), from first principles (rate maximization: charnov1976,
   stephensKrebs1986; the walking cost sockol2007), only for the terms the diagnosis implicates. Every input sourced or
   tagged design; no fitted scale. If it removes `forageDistScaleM`, `fallbackForageW` or `memTravelHungerW`, the
   prescription count must fall accordingly.
3. At most three iterations, each logged here and committed before its run; arms = S9 + the switch, quick mode.

## 2. Diagnosis (step 1; registered 3 October 2026, 22:59, commit bdb03ac, before its runs)

**What the code does (read at 37a2042, field profile, S9's 39 switches).** A non-dependent animal's feeding options
(candidates.ts:289–457):
- a crown in view (sight 35 m by day): `(1.6 h + 0.1)·Q·tw(n) − d ÷ 400 − n·0.1·(1.3 − fruit index)·(rank factor) −
  0.45·rain − 0.6·territory − core + fig bonus`, with Q = 0.55 + 0.45·min(1, crop) the crop shape and tw(n) the C13b
  share of the animal's own full fruit rate a bout delivers, walk included (`treeIntake`: E = min(crop ÷ (1 + n) × kcal
  per unit, energy need, the bout's gut room), tw = (E ÷ R) ÷ (walk + E ÷ R); the E2c dark branch in poor light);
- the fallback where it stands: `0.45·h·leafV + 0.03 − 0.3·rain`, leafV = the fallback's kcal per hour here ÷ the
  animal's fruit rate (≈ 0.44 × the forage field's yield ÷ the skill factor; × vision in the dark);
- an own trip to a remembered or community-known tree (shortlist of 4, two travel slots): `1.25·h·Q·tw(0) −
  d ÷ 62,900 − 0.4·rain − 0.8·territory − core + sociability·fruit index·0.1`;
- a joined trip (E5a): `1.25·h·Q·tw(n at the goal) − d ÷ 62,900 + company margin − 0.3·rain`.
All carry the hash jitter (± 0.12) and the continuation bonus (+0.25, −0.5 once finished). The bounded menu holds one
option per action (menu.ts `boundedCandidates`: "places stay single"), so the fallback competes with the best crown in
view for the single forage place, and own trips with callers and the home pull for the travel place (the joined trip
keeps its own); a softmax at `rgTemperature` 0.164 draws from it. So against a crown in view, the fallback is valued at
0.45 h ÷ (1.6 h + 0.1) ≈ 0.26 of its rate and a trip at 1.25 h ÷ (1.6 h + 0.1) ≈ 0.72 of its rate, and every fruit
option carries Q (0.55–1).

**Tools.** (1) `scripts/revisit-diagnose.ts` (E3b, unchanged): walking by purpose per class, visits, returns, what ends a
visit, trees per day. **Disclosure:** it ran on S9q's parameters (seeds 48 and 7, 30 + 30 days) at 22:53–22:55, before
this registration, from the frozen checkout of f007a48 (simulation code identical); its output has not been read.
(2) `scripts/forage-rate-diagnose.ts` (new; its header defines every readout): for rules decisions of animals ≥ 8 y in
daylight (fresh draws) whose menu holds a feeding option: every feeding option's score split into its food worth, the
distance term, the crowding term and the rest, and the named contributions of the weights (crop shape; `forageDistScaleM`
on crowns, the energetic tripCost on trips; `fallbackForageW` against the crown's drive 1.6 h + 0.1; `memTravelHungerW`
against the same drive); the expected rates of every option in kcal per hour from the model's own physics (E_bout as
treeIntake, E without the need, E without the gut cap; walk time at `walkMps` with the dark pace; walking and climbing
cost from sockol2007's net cost of transport, the ledger's own); a static counterfactual of the choice (the menu rebuilt
with rg.ts `rgMenu` from the re-scored candidate list and the softmax at `rgTemperature`; identity check: the unchanged
variant must reproduce the menu and probabilities drawn from, and every rebuilt raw score must equal the published one
where it is not clamped); the realized net rate of every chosen feeding option (episodes); class energy as
energy-diagnose defines it. Static means: each decision's own options re-scored, no feedback on hunger, position or
later choices; options dropped from the candidate list (beyond the slot limits, or scored ≤ −0.4) cannot enter.

**Smoke test (seed 48, 1 + 2 days, S9; done before this registration; disclosed):** identity exact (4,483 decisions, 0
menu mismatches, probability error 0, raw scores exact for all 18,043 options); every readout filled. Seen: crown options
bind E on the gut room in 78% (need 13%, share 10%), walk 0.1 min and cost 1.7% of E (median); trips 205 m, 9.8 min,
cost 3.7% of E; the fallback's rate 0.49 of the fruit rate; counterfactual walking per decision 33 m, +47% with trips at
the crown's drive, +11% without the crop shape, −13% with the fallback at the crown's drive, +62% with the full net-rate
valuation (feeding options chosen 32% → 48% of decisions). Two days after a one-day burn-in are not representative; no
expectation below is a fit to them.

**Runs.** forage-rate-diagnose on S9q's parameters and its three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405;
seeds 48 and 7, 30 + 30 days, `--workers` 1 above load 8), from a frozen detached checkout of the commit that adds this
section. Identity: adult males' eating minutes and ground km equal `S9q-energy.json` (energy-diagnose, same world) when
the integrator's file exists.

**Reading rules (registered).**
- *R1, what each weight contributes to where animals eat:* each term put in the crown's currency alone (`-dist`: crowns
  lose d ÷ `forageDistScaleM`; `fbD`: the fallback at (1.6 h + 0.1)·leafV; `memD`: trips and joins at (1.6 h +
  0.1)·Q·tw; `noQ`: Q = 1; `noCrowd`: the habitat-index crowding off). The term is **implicated** if, in each of the
  four realizations, it moves the expected share of a chosen kind (crown, fallback, own trip + joined trip, any feeding
  option) or the expected walking distance per decision by ≥ 10% of its actual value.
- *R2, do choices follow the net rate:* among decisions with a chosen and a rejected feeding option, the share where the
  chosen one promises the higher net rate (E without the need), and both rates. Choices "follow the rate" if ≥ 70%.
- *R3, what bounds a bout's energy:* the shares of crown and trip options where the crop share, the need or the gut room
  binds E_bout; the need "matters" as a cap if it binds in ≥ 10% of either kind.
- *R4, are the expectations right:* realized net rate of chosen options by kind against the median expected; "calibrated"
  within ± 20%.
- *R5, what a net-rate valuation would change (the static `rate` variant against `actual`):* the change of each chosen
  kind's share, of the walking distance per decision and of the feeding share of decisions, reported with the reference
  spread; and by class (adult males, nursing mothers, other females, juveniles 8–12 y).

**Expected (low confidence unless stated; written knowing the smoke test).** R1: `memD` and `noQ` implicated (trips up,
distance up), `fbD` implicated (fallback up, distance down), `-dist` not implicated (crowns in view are within 35 m, so
d ÷ 400 ≤ 0.09; moderate), `noCrowd` not implicated. R2: chosen options promise the higher net rate in 60–90%. R3: the
gut room binds in ≥ 70% of crown options, the need in < 15% (moderate, E5c: 99.8% gut room below the need). R4: within
± 25%. R5: feeding options chosen more often (food is worth more against rest and grooming once the discounts go),
walking per decision up.

## 3. Field rows scored here: samples (sources opened or as recorded by the stage that read them; written before any arm)

| Row | Source | Sample, method (quoted where it decides the readout) | Value, band |
| --- | --- | --- | --- |
| T-ACT-1, T-ACT-2, T-ACT-3 (fitted) | villioth2025 (FT, PMC12701709 through NCBI BioC, opened here 3 October) | Budongo Waibira 2016–17, 10 adult males and 9 adult females: "Seven of the females were lactating, while two females were not lactating but travelled with a single juvenile offspring"; 491 h of focal sampling, follows 1–12 h (median 4 h); "the behavioural state of the focal individual was recorded continuously ... feeding (all behaviours related to food handling; the entire process of picking and ingesting food items), travelling (terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy), grooming (giving or receiving), resting (any period > 1 min in which the individual was sitting or lying ...)"; mass not reported | feeding 0.36 M / 0.37 F (band 0.33–0.5; uwimbabazi2019's Kanyawara mothers 309 ± 85 min); travel 0.21 / 0.20 (band 0.12–0.25; amsler2010 Ngogo control days 0.14); grooming 0.15 / 0.12 (band 0.08–0.18) |
| T-ACT-4 rest + groom (fitted) | potts2011 (read in full by E5c, Harvard DASH through Wayback), villioth2025 | Ngogo 2005–06 (1,059 h) and Kanyawara 2006 (961 h): continuous focal follows of adult males, cycling females and pregnant or lactating females; "resting includes grooming"; monthly means; mass not reported | 0.340 (Ngogo), 0.448 (Kanyawara); Waibira ≈ 0.43 (derived); band 0.3–0.47 |
| T-RNG-4 male day range (fitted) | batesByrne2009 (as e5c-prereg §2.2, e3b-prereg §3) | Budongo Sonso 2002–03, 8 adult males, GPS every 5 min while travelling, full-day follows; mass not reported | 2.7 ± 1.5 km/day; band 1.5–3.5 |
| T-FOOD-2 fruit share (fitted) | watts2012a, emeryThompson2020 (as e5c-prereg §2.2) | Ngogo 1995–2010, 125 months, focal + 15-min scans; Kanyawara 1994–2018, 240,601 feeding scans; all age-sex classes in the feeding scans; mass not reported | 72.1%, 64.0%; band 0.60–0.78 |
| T-FOOD-4 trees per day (held out, compromised) | janmaat2013b, normand2009 (as e3b-prereg §3) | Taï, 5 adult females with young, 275 full-day follows; normand2009's two females over 28 days | 7.14; 14.0 and 18.1; band 4–15 (the observer counts returns after ≥ 10 min as visits, e3b-prereg §7) |
| T-FOOD-6 revisit interval (held out) | normand2009 (FT, read by E3b), ban2014 (abstract) | Taï, the same individual, trees < 30 m apart one resource, two females followed 28 consecutive days; "On average, chimpanzees revisit a tree within 5.37 days" | 5.37; 2.5 days; band 2–7 (observer pools focals, e3b-prereg §7) |
| T-FOOD-10 departures before sunrise (held out) | janmaat2014 (FT, read by E2h) | Taï, "five adult habituated female chimpanzees", "all with young offspring (<7 y)", three fruit-scarce periods; 179 fruit-breakfast mornings; mass not given | 18% of departures before sunrise; band 0.08–0.3 |
| T-HUN-1 hunts per community-year (fitted) | gilby2015, wattsMitani2002 (as e4e-prereg §2) | Kanyawara 1996–2014: 194 hunts in 224 months, mean 11.4 adult males, all-occurrence by the followed party; Ngogo ~24 males | ≈ 10.4 per year (Kanyawara); band 5–25 (unscaled; e4e's staged 4–11 not applied) |
| True day ranges by class; reserves %/day; net energy rate by class (truth) | none scored by e-bench | energy-diagnose: ground km (horizontal steps on the ground, < 100 m a tick), the OLS slope of the daily reserves ÷ usable store (the integrator's judge convention); net rate defined in §2's tool header and below | judged against the S9 reference's own spread |

**Readouts the predictions need, and where they come from** (each defined in its tool's header; all smoke-tested on 2
days with the switch on before any arm, §5):
- T-ACT-1..4, T-RNG-4, T-FOOD-2, T-FOOD-4, T-FOOD-6, T-FOOD-10, T-HUN-1, T-PTY-1: e-bench's observer rows (pooled values
  and distances), as the sources define them through the frozen observer (src/field/metrics.ts); the known scorer
  differences for T-FOOD-4/5/6 are e3b-prereg §7's (not changed).
- True day ranges (ground km per day), eating minutes, fruit share of eating, reserves %/day by class: energy-diagnose
  (seeds 48 and 7, 30 + 30 days), the integrator's reference files for S9 and one run per arm.
- **Net energy rate by class** (simulation truth; no field row): from energy-diagnose's rows, (energy taken into the
  books − passed out unabsorbed − walking cost) ÷ (eating minutes + ground km ÷ `walkMps`), kcal per minute: "kcal
  absorbed per minute of walking plus feeding, net of walking cost" with walking minutes at the model's walking pace
  (the ground path is walked at `walkMps` except the forage pace inside a fallback cell, so this is a lower bound on the
  minutes); forage-rate-diagnose reports the same per class and per chosen option (episodes).
- Walking by purpose (own trip, joined trip, crown approach, fallback, caller, …): revisit-diagnose (E3b).

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **S9** (docs/staging/e-stack2-confirm.md, "S9 results"; parameters
  `bench-run/artifacts/validation/e/s9q/S9q-params.json`), run by the integrator in quick mode once plus three re-draws
  (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run 2bcbd33 (simulation code identical to this branch's start),
  each with `energy-diagnose` (seeds 48, 7; burn-in 30, 30 days): `bench-run/artifacts/validation/e/s9q/{S9q,S9q1,S9q2,
  S9q3}.json` and `…-energy.json`. Not re-run here.
- Each arm (S9 + this stage's switch, same quick settings) against the reference mean with the integrator's
  `judge_vs_reps.py`: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick per-run SD fitted 0.69, held-out 1.26, held-out without
  T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result; on rows scored in all runs,
  with and without T-HUN-4 and T-BRD-1, and without T-IGE-3 as well (unstable on few events).
- Energy, travel and party readouts against the reference's own spread (mean ± SD of its four runs). Viability must
  pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S9: 74); a switch that removes a named rule
  must lower it.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

## 6. Results

## 7. Known defects in the code under test

## 8. Stage verdict
