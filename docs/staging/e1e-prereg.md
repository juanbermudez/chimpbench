# E1e pre-registration: a two-signal appetite (satiation near distension, drive from the deficit ahead and behind)

Registered 1 October 2026, before any run of the changed code (tests included). Track E, stage E1e, on branch `e1b-digestion` after merging `track-e` (b861bee: E1c infant energetics, E3 urgency, E4a endocrine). New switch `ledgerDrive`, 0 by default, read only with `energyLedger` 1.

**Rule served.** Field values of behaviour are targets, never inputs. No input will be moved to hit a target; a miss is diagnosed term by term.

## 0. Why, and the sources check

E1b (null, docs/staging/e1b-prereg.md) and E3 (docs/staging/e3-prereg.md §9) found the same flaw from two sides. E1's readout `hunger = gut emptiness × appetite` lets momentary gut fill cap the drive to eat, however large the deficit. With a bulk-sized gut, mothers lost 0.23% of their store a day, and at the low end of the capacity range the population starved with a gut never full. E3's pay test valued food by the gut space free now, so walking to fruit rarely paid.

Mammalian feeding has two controls:
- **satiation** from gut distension, acting mainly near capacity;
- a **drive** from the energy deficit, ahead of a coming fast as well as behind. keramatiGutkin2014 frames reward as deficit reduction, including acting ahead of a coming deficit.

**Sources step: were swallowed seeds counted in food mass (uwimbabazi2019)?** The PMC page is behind a CAPTCHA, which was not bypassed. Europe PMC's full-text index answers phrase searches on the article (short function words act as one-word wildcards in that search; controls such as "seeds were purple" return 0). Its methods contain:
- "[for] fruit, seeds [were] removed [from the] collected sample before weighing";
- "food samples [were] processed";
- "[parts] that [are] discarded by chimpanzees".

"swallow" does not occur anywhere in the text. Reading: fruit samples were weighed and analysed without their seeds, so dry-matter intake and energy are pulp only. **Swallowed seeds do not inflate T-ENE-1**, and they cannot explain the factor of about 1.9 between field intake and sourced expenditure. The exact wording of the short words, and whether the removal covered all fruit or only seeds that chimpanzees spit, is unverified ([M] as read). Consequences:
- T-ENE-1's 2,479 kcal is internally consistent about seeds.
- The gap must lie in feeding rates or minutes, the fibre credit (at most 6%), or expenditure.
- Swallowed seeds are gut ballast that the dry-matter rates leave out: the digesta gut of E1b undercounts bulk, if anything.

## 1. Mechanism (`src/sim/energy.ts`, `intake.ts`, `candidates.ts`; `ledgerDrive` 1)

New state per individual (`chimp.sim.en`, only with the switch):
- `eAvg`: a day-long running average of everything spent (kcal/h; time constant `driveAvgH` 24 h);
- `sBed`, `sWake`: sleep pressure when the animal last fell asleep and last woke;
- `slept`, `outAt`: bookkeeping.

1. **Waking time left, and the fast after it, from sleep pressure** (E2a's process S, `rhythmSleep` 1). Awake since S = `sWake`, S(t) = 1 − (1 − `sWake`)·exp(−t/τ), with τ = 18.2 h:
   - hours awake so far = τ·ln((1 − `sWake`)/(1 − S));
   - yesterday's waking day = τ·ln((1 − `sWake`)/(1 − `sBed`));
   - waking time left T_r = their difference (≥ 0); the fast T_f = 24 h − the waking day.

   No hour is read. Before an animal's first night in the run, the waking day is taken as 12 h (`driveFirstDayH`, the equatorial photoperiod). Without `rhythmSleep`, there is no cue of a fast: T_r = the gut-emptying time and T_f = 0.
2. **Need** (kcal) = −reserves − energy still in the gut (non-fibre energy plus the expected yield of the fibre in both pools) + `eAvg` × (T_r + T_f). A surplus counts against it.
3. **Drive** φ = need ÷ (intake rate while feeding × max(T_r, one tick)), clamped to 0..1. φ is the share of the waking time left the animal must spend feeding to meet its need. The intake rate is ripe fruit at its skill and size (as `fruitRate`), plus the suckling rate while unweaned.
4. **Satiation**: hunger = φ × (1 − fill²), where fill is foregut fill (dry matter with `ledgerDigesta`, energy without). This is design: the smallest integer power that acts mainly near capacity (at half fill it removes a quarter of the drive). Hunger is no longer capped by emptiness.
5. **A tree is worth the energy the bout can deliver**:
   - E = min(the animal's share of the crop, the need);
   - eaten at the intake rate until the foregut is full, then at the rate it empties (capacity ÷ 3 h, an upper bound);
   - the rules' trip share becomes E ÷ (intake rate × (walk + bout));
   - E3's pay test and the Jev facts read the same `treeIntake`, so the hunger cap that halved E3's feeding time is gone here.
6. **Nursing is worth the milk the glands can deliver**: the hunger term of the nurse option is multiplied by the share of a full flow the bout gets, from the mother's store and her synthesis rate. A dry gland gives the trickle of synthesis. Reading the store is a modelling shortcut (the infant senses the let-down); it is in the rules only, not in the model packet. E1c's open problem was infants at an empty nipple 40–67% of daylight.

Unchanged: expenditure, digestion, the condition readout, starvation, every score weight.

**Plain bug fixes in the same commit** (from the coordinator's review of track-e). They are active with the ledger on, whatever `ledgerDrive` is, so the reference arm below includes them and differs from E1b's arm 2:
- B1 `shareWorth` and `tripCost` (candidates.ts) converted ledger hunger to fruit with `fruitHungerFactor`. They now use the kcal need (`needFruit`). Both are inactive at defaults (`crowdByShare` 0, `tripRateValue` 0).
- B2 `treeIntake`'s hunger cap under the ledger capped a bout at hunger ÷ rate. The ledger's hunger includes appetite (0.5 at the set point), so feeding time came out about half. Now capped by gut emptiness. This touches E3's pay test and the Jev facts only.
- B3a a shared plant piece created 50 kcal the giver never paid for. It now comes out of the giver's foregut with its composition, up to 50 kcal and what the receiver's gut takes; both books record it.
- B3b `eatFallback` depleted the forage cell even for food the gut refused (or that a small infant could not take, E1c). The cell now loses only what was eaten.
- B4 the ledger is not valid at `ageRate` > 1: growth, gestation and milk are charged at their natural daily rate per ecological tick. `energy-diagnose` refuses it; a warning is in the code and docs/simulation.md. The life-course scripts run with the ledger off.
- B5 `leafRate` with no animal used E1's gut capacity under digesta. It now uses the digesta capacity of an adult female.

## 2. Inputs

| Input | Value | Source | Tag |
| --- | --- | --- | --- |
| Expenditure average window | 24 h | the daily cycle | design |
| First waking day | 12 h | equatorial photoperiod (physics) | design |
| Sleep-pressure rise constant | 18.2 h (E2a's `rhythmSleepRiseH`) | daan1984 | assumed |
| Satiation curve | 1 − fill² | none; acts near capacity by construction | design |
| Intake rate, milk flow, gut capacity and emptying, milk synthesis | existing ledger inputs | E1, E1b, E1c | as registered there |

No new physiological number: the mechanism reorganises what the ledger already knows.

## 3. Benchmark (field profile, seeds 48 and 7, 30-day burn-in + 60 days, `--workers 1`, one heavy run at a time)

- **Arm R** (reference): `{"energyLedger":1,"rhythmSleep":1,"rhythmHeat":1,"ledgerDigesta":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1}`, run on this commit, so with B1–B5.
- **Arm D**: arm R + `{"ledgerDrive":1}`.
- Arm 0 (no switches) is E1b's run on the same model with switches off (hash-identical); it is rescored with this registry.
- Tools: `scripts/e-bench.ts --quick --days 60 --workers 1`; `scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 60`; `scripts/rhythm-metrics.ts --workers 1` (same window).

## 4. Predictions (made before any run; against arm R, whose values will be measured first)

Arithmetic for an adult female (31.3 kg):
- She spends about 52 kcal/h (1,260 kcal/day with DIT); she eats about 535 kcal/h while feeding on drupes.
- E2a measured sleep pressure of about 0.02 on leaving the nest and 0.48 on entering it, which gives an 11.5 h waking day and a 12.5 h fast.
- At dawn with reserves at the set point and an empty gut: φ = 1,260 ÷ (535 × 11.5) = 0.20; with the night's cost still unpaid (reserves −600 kcal), 0.30.
- E1's readout at dawn gives hunger ≈ 0.57 (appetite 0.57 × emptiness 1).
- Two hours before sleep, if she has eaten at the average rate all day, the night still lies ahead: need ≈ 80 + 52 × 14.5 ≈ 840 kcal, so φ = 840 ÷ (535 × 2) = 0.79.
- After a full meal, fill 0.8 leaves 36% of the drive.

| Row | Band | Expected for arm D against arm R |
| --- | --- | --- |
| Late-afternoon feeding peak (feeding share in the last 3 h of the day above the middle third; truth) | field: present | **appears**: the coming fast raises φ as the waking time left shrinks (≥ 5 points above the middle third) |
| Early feeding peak (first 3 h above the middle) | field: present | still present, **smaller** than arm R's: dawn hunger falls from about 0.57 to 0.2–0.3 (no drive from an empty gut in this design) |
| Midday satiation pause (rest highest in the middle third; truth) | field: present | **appears or strengthens**: meals leave fill high and φ low at midday, while evening rest gives way to feeding |
| T-RHY-9 as a whole | pattern | pass (moderate confidence; the early peak is the risk) |
| T-ENE-2 eating minutes, adult females (truth) | 250–370 | 0 to +15% (intake still equals expenditure): **still a miss** |
| T-ENE-1 formula intake, adult females (truth) | 1,900–3,100 | 1,300–1,450: **still a miss** |
| T-ACT-1 feeding share | 0.33–0.50 | +0 to +0.04 |
| T-ACT-4 rest + groom | 0.30–0.47 | no direction (low midday hunger triggers the rest bonus `h < 0.2` more often; evening rest falls) |
| T-ACT-2, T-ACT-3 | | within ±0.03 |
| T-FOOD-2 fruit share | 0.60–0.78 | no direction |
| T-FOOD-4 trees per day | 4–15 | up slightly (an evening bout of trips) |
| Lactating females' reserves | — | **stop falling**: slope ≥ −0.05% of the store a day (the drive is no longer capped by emptiness) |
| Infants: daylight suckling at 1–4 y | field about 3% | down from E1c's 40–67% to under 25% (a dry gland is worth only its trickle) |
| Infants' reserves (0.5–2 y, 2–5 y) | — | hold (change over the window above −0.05 of the store); risk: below 1.2 y an infant cannot feed itself, so less nursing at a trickle costs it nothing, but missed full-flow bouts would |
| Nest entry relative to sunset | T-RHY-4 | 0–15 min later (feeding competes with nesting at dusk); still inside |
| Viability | | no starvation death |

## 5. Kill criterion

**Null** (the switch leaves the E stack) if any holds:
1. any death by starvation, or an adult class whose reserves fall steadily (below −0.05% of the store a day) while arm R's do not;
2. the late-afternoon feeding peak does not appear (last-3-h feeding share not above the middle third) **and** lactating females' slope is not better than arm R's;
3. on rows scored in both arms, fitted band distance rises by more than 0.3 or held-out by more than 0.5 against arm R.

Otherwise **keep** as a candidate in the E stack, still off by default (no prescription is removed).

## 6. Iterations

At most three, each a change of mechanism logged here with its reason before its run. No input is moved to hit a target.

## 7. Results

(To be filled after the runs.)
