# E1o pre-registration: what an older infant drinks

Registered 2 October 2026 (first commit 13:15), before any run of this stage. Track E, stage E1o, branch
`e1o-milk-demand` (from `track-e` c7a4c75). Any new switch is 0 by default in both profiles and is read only with
`energyLedger` 1, so the compressed goldens and the field pin cannot move.

**Rule served.** Field values of behaviour are targets, never inputs. No suckling rate, milk share, weaning age or
mother's balance is set from a field value; no weight or input is tuned to hit one. A miss is a finding.

**Seen before this registration (disclosed).** The integrator's S5 confirm energy log
(`bench-run/artifacts/validation/e/s5/S5-energy.log`, 5 seeds × 60 days, 5911b36): infants of 1–4 y drink 307–309
kcal/day (day 168–171, night 138–139), eat 49 / 98 / 121 min a day at 1–2 / 2–3 / 3–4 y at 2.97 / 3.20 / 4.08 kcal per
eating minute; at their daylight decisions with the nurse option offered their hunger is 0.29–0.32, their foregut 0.41–0.52
full, the gland holds 7–16 kcal and is dry in 19–24% of them; the store is never full (0% of ticks) at 1–4 y; mothers'
balance −93 / −144 / −129 kcal/day at 1–2 / 2–3 / 3–4 y (−47 at 0.5–1 y). E1m §3.1 and E1n §2.4–§3.7 (read in full).
No run of this stage had been made.

## 0. The problem (from the brief; integrator's confirms, simulation truth)

- Nursing mothers are the class in deficit on every stack (S5: −0.23% of the store a day; other adult females −0.05,
  males −0.03). On S3 their balance falls with infant age: −42, −99, −147, −150 kcal/day at 0.5–1, 1–2, 2–3, 3–4 y;
  the field gives the opposite direction (emeryThompson2012: depressed for six months, then a net gain through year 2).
- E1m: from about 0.9 y every infant drinks the whole yield (307 kcal/day; the mother pays 384) to 4 y. At the
  field's eating minutes the model's infants would need 45–196 kcal/day of milk at 1–2 y, 27–130 at 2–3 y and none at
  3–4 y; they eat 0.31–0.57 of the field's eating minutes at 2.4–5.2 × the per-minute intake the field's time implies.
- E1n: a mother who refuses by day does not change the volume: the refused milk is drunk at night. The weaning age is
  still prescribed (`weanAgeMinY`, `weanAgeSpanY`).

**Question: what holds an older infant's drinking at the cap?**

## 1. Step 1: diagnosis (readouts defined here; smoke-tested on 2 days before use)

### 1.1 How the milk books run (code read before any run)

- Synthesis fills the gland store at `ledgerMilkYieldCoef` × M^0.75 ÷ 24 per hour (12.8 kcal/h at 31.3 kg) and stops
  only when the store holds `ledgerMilkStoreH` (24 h) of it (energy.ts energyTick). The mother pays only for milk drunk
  (nurseTick: milk ÷ 0.8). So milk drunk = min(what the infant takes, what is made); a gland that is never full makes
  307 kcal a day whatever the infant needs.
- **Night** (execution.ts nestTick, `ledgerNightNurse`): an infant in its mother's nest drinks on every tick its hunger
  readout is ≥ 0.08 (`NURSE_DONE`), at the suckling rate, from what the gland holds.
- **Day** (candidates.ts nurse offer, `ledgerNurseBout`): the nurse option scores (0.25 + 1.5 × hunger × (1 − age/7)) ×
  b, b = E ÷ (E + 150 kcal/h × 54 s) the share of a full flow the bout delivers (a gland of 7 kcal gives b ≈ 0.77). Own
  food for a dependent: the ground forage option (0.5 × hunger − 0.05) from 1.2 y and not carried; begging (hunger >
  0.35, mother foraging); the mother's own tree only, from 1.5 y, not carried, while she forages ((1.6 × hunger + 0.1)
  × quality × trip worth). Infants are carried below 1.2 y, and to 4 y while the mother travels or nests (isCarried).
- **The infant's hunger** (setHunger, E1e/E1i): min(φ, 1) × (1 − w × fill²), φ = need ÷ (intake rate × waking time
  left); its intake rate (feedRate) counts milk at the full suckling rate (150 kcal/h) all day, whatever the gland holds
  (E1n §5, deferred defect energy.ts:271–274); with no waking time left the divisor is one tick (φ = 1; energy.ts:318).
- Offline arithmetic (registry values): an infant's foregut holds 5.6 g of dry matter per kg (83 mL/kg × 0.45 × 0.15
  g/mL), i.e. 30 kcal of milk per kg (0.185 g/kcal): 197 / 290 / 400 kcal at 6.5 / 9.6 / 13.2 kg (1–2 / 2–3 / 3–4 y),
  emptied with a 3-h constant. The gut cannot be what stops a 1–4-year-old drinking 12.8 kcal an hour.

### 1.2 Readouts (sim truth, unweaned infants with their mother alive, by age bin 0.5–1, 1–2, 2–3, 3–4 y; new section
"E1o" in `scripts/energy-diagnose.ts`, read-only; existing E1c/E1f/E1n readouts unchanged)

Night = `environment.daylight ≤ 0.1` (energy-diagnose's definition); "in the nest" = the infant in the nest act with
its mother (variant MOTHER) while she is in the nest act.
- **N1 night access.** Share of night ticks in the mother's nest; of those, share with hunger ≥ 0.08 (eligible), share
  drinking, share with the drive saturated (φ ≥ 0.999, read as hunger ÷ the satiation term).
- **N2 what limits a night drink.** Of night drinking ticks, the share in which the gland held less than one tick of
  full flow before the drink (gland-limited: the infant drinks the synthesis trickle).
- **N3 the infant's night budget** (per infant-night, dusk = first night tick): its spending over the night, the energy
  in its gut at dusk, milk drunk over the night, its reserves ÷ store at dusk and dawn; the mother's gland at dusk and
  dawn; synthesis over the night (store change + milk drunk).
- **D1 day synthesis and day milk** (per infant-day; synthesis = store change + milk drunk).
- **D2 day bout onsets** (the nurse act's accepted start, existing tap): the infant's reserves ÷ store, hunger, φ,
  own-food drive (ownDrive), foregut fill split into milk and solids (a shadow pool: the milk's dry matter enters it and
  it empties in the same proportion as the foregut each tick; read-only), the gland, the bout's worth b; and the share
  of onsets "without a deficit" (reserves ≥ 0 and foregut ≥ half full).
- **D3 the day choice** (the infant's daylight decisions with the nurse option offered; existing E1n set): share with any
  own-food option on the menu, with a tree on the menu, carried, mother foraging; share in which the nurse score's
  hunger-free part (0.25 × b, minus its distance term) alone beats the best own-food option; the three most chosen acts
  when neither nursing nor own food is chosen.
- **D4 what limits own-food eating**: daylight shares carried, mother in the forage act, infant eating own food;
  eating ticks at a ≥ 95% full foregut; mean intake size (mass ÷ adult mass)^`ledgerIntakeSizeExp`; own kcal per eating
  minute (existing).
- **M1 mothers by their youngest infant's age bin**: eating minutes, daylight foregut fill, daylight hunger, reserves ÷
  store (balance: existing E1f readout).

Run: S5 (S5-params.json), seeds 48 and 7, 30-day burn-in + 30 days, rules policy, from a frozen detached checkout of
the commit that adds the readouts and this section (one simulation; the existing readouts come out of the same run).

**Smoke test (seed 48, S5, 1-day burn-in + 2 days; `scratchpad/e1o/smoke/`; readouts only, not the diagnosis).** Every
readout prints and is non-empty at 1–4 y. Added after the first smoke and before the diagnosis run (disclosed): N1 also
reports the share of night-nest ticks with the infant asleep by the circadian latch (`x.asl`, rhythmCircadian) and the
share of night drinks taken asleep; D4 reports the infant's full intake rate on ripe fruit at its size and skill
(feedRate's fruit term, kcal/h) beside the suckling rate (150 kcal/h). Reading notes: "eligible" is the hunger readout
at the end of the tick (after that tick's drink), so at 0.5–1 y drinking can exceed eligibility; "without a deficit"
uses reserves ≥ the set point, which the drive holds infants near, so it is reported beside the reserves themselves.
The predictions of §1.3 were written before the smoke and are not changed.

**Readout added after the diagnosis run (disclosed; 13:50, before any mechanism was written).** The registered
readouts showed own food as the residual but could not say what the infant does while food is in reach, so D5 was
added: **D5 while the mother feeds in a crown** (her forage act at a tree, in the crown), the share of the infant's
daylight ticks in that state, and what the infant does then (eating own food, nursing, carried, its acts), its hunger
and foregut fill. The diagnosis run is repeated once with it (same command, frozen checkout of the commit adding it);
every other readout must come out identical (same simulation code; checked).

### 1.3 Predictions (before the run)

- N1–N2: at 1–4 y, hunger ≥ 0.08 in ≥ 95% of night-nest ticks and the infant drinks in ≥ 90% of them (high); the drive
  is saturated in most night-nest ticks (≥ 70%; moderate: sleep lowers the pressure that defines the waking time left,
  so φ may unsaturate late in the night); ≥ 90% of night drinks are gland-limited (high).
- N3: the infant's night spending exceeds night synthesis (about 160 kcal) at 1–4 y (high), so a night rule that
  followed the deficit would still drink the night's synthesis unless the infant entered the night with a surplus.
- D1: day milk = day synthesis within 5% at 1–4 y (high).
- D2: onsets at reserves −0.01 to −0.03 of the store, hunger 0.25–0.35, foregut 0.35–0.55 full, of which milk ≤ 30%
  (moderate); "without a deficit" ≤ 20% of onsets (low).
- D3: own food on the menu in 30–60% of decisions at 1–2 y and 50–80% at 2–4 y (low); the hunger-free part alone beats
  the best own food in ≥ 40% of decisions with both (low).
- D4: ≤ 5% of eating ticks at a full foregut (moderate); carried 30–60% of daylight at 1–4 y (low).
- M1: mothers' eating minutes and daylight hunger flat or rising with infant age, foregut < 0.75 full (moderate).
- Expected term (low to moderate; the run decides): **the infant's demand for milk is not bounded by its need on
  either route**, so synthesis is the only limit: at night a saturated drive drinks at any gut room; by day the nurse
  score wins at the infant's hunger, which is held low by a capacity term that counts milk at 150 kcal/h all day.

## 2. Step 2: mechanism (only for the term the diagnosis implicates)

Reserved; filled in and committed before any run of changed code.

## 3. Benchmark and judging (from the brief; e-noise.md amendment 2)

Reference: S5 (e-stack2-confirm.md, "S5 results"; 32 switches, `bench-run/artifacts/validation/e/s5/S5-params.json`) in
quick mode, run by the integrator once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405) at bench-run
5911b36 (simulation code identical to this branch's start), each with `energy-diagnose` (seeds 48, 7; burn-in 30;
30 days): `bench-run/artifacts/validation/e/s5q/{S5q,S5q1,S5q2,S5q3}.json` and `…-energy.json`. Not re-run here.
Each arm = S5 + this stage's switch, same quick settings, from a frozen detached checkout of a committed head.
Judged with `judge_vs_reps.py quick custom` against the mean of the four: z = (arm − mean) ÷ (SD × √(1 + 1/n)), quick
per-run SD fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if
larger; |z| > 2 is a result. Energy, travel and party readouts against the reference's own spread (mean ± SD of its
4 runs). Viability must pass. Prescriptions: `scripts/prescription-ledger.ts --count --params` (S5: 77); a switch that
removes a named rule must lower it.
