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

**Second readout added after D5's run (disclosed; 14:05, before any mechanism was written).** D5 showed the infant
resting 31–46% of its mother's crown time with its foregut half full, which could be choice or gut throughput (meals
fill the foregut, rests are its emptying). **D6 own food against the foregut's throughput**: the own-food dry matter
the infant eats (all dry matter eaten minus milk's, shared plant pieces included) while its mother is in a crown and
outside, per infant-day; and, over the crown ticks, its intake ÷ what its foregut would pass if kept full (capacity × the
share a full foregut empties per tick, 1 − exp(−15 s ÷ 3 h)). A ratio near or above 1 means own food is limited by the
foregut's throughput in the time food is in reach (meals that fill it from below add to the ratio); well below 1, by the
choice. The diagnosis run is repeated a third time with it (same command; the other readouts must be identical).

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

### 1.4 Step 1 result (S5, seeds 48 and 7, 30 + 30 days, sim truth; frozen checkout be072ae; generated by
`diag_table.py` from `diag3-S5.json`, local copies in the stage scratch `e1o/`, not tracked)

The three diagnosis runs (9b72171, 03982a0, be072ae) gave identical readouts wherever they overlap (the commits add
readouts only).

Night (per infant-night; shares of night-nest ticks)
| age | in the nest % | hunger ≥ 0.08 % | drinking % | asleep % | drinks asleep % | φ saturated % | mean φ | gland-limited drinks % | night hunger | reserves ÷ store | foregut milk / solids | night spend | gut energy at dusk | night milk | night synthesis | gland dusk → dawn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 96.4 | 0.1 | 3.8 | 88.0 | 60.2 | 3.5 | 0.11 | 0.0 | 0.07 | 0.015 | 0.33 / 0.00 | 125 | 106 | 63 | 145 | 157 → 239 |
| 1–2 y | 94.8 | 100.0 | 100.0 | 89.4 | 89.4 | 13.3 | 0.31 | 100.0 | 0.24 | -0.012 | 0.19 / 0.13 | 184 | 118 | 139 | 146 | 0 → 7 |
| 2–3 y | 93.9 | 100.0 | 100.0 | 90.3 | 90.3 | 13.4 | 0.34 | 100.0 | 0.27 | -0.013 | 0.14 / 0.14 | 227 | 163 | 138 | 146 | 1 → 9 |
| 3–4 y | 93.1 | 100.0 | 100.0 | 91.0 | 91.1 | 13.9 | 0.37 | 99.9 | 0.32 | -0.015 | 0.10 / 0.14 | 281 | 222 | 138 | 146 | 1 → 9 |

Day (per infant-day; onsets = accepted day bout starts; decisions = daylight decisions with the nurse option offered)
| age | day milk | day synthesis | onsets/day | onset reserves ÷ store | onset hunger | onset φ | onset own-food drive | onset foregut milk / solids | onset gland kcal | onset b | own food on menu % | tree on menu % | hunger-free part beats own food % | nurse chosen % | own food chosen % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 221 | 138 | 11.3 | 0.002 | 0.27 | 0.40 | 0.67 | 0.39 / 0.00 | 248.9 | 0.96 | 0.0 | 0.0 | 0.0 | 12.1 | 0.0 |
| 1–2 y | 167 | 161 | 19.4 | -0.015 | 0.30 | 0.46 | 0.57 | 0.18 / 0.24 | 8.6 | 0.72 | 78.8 | 14.4 | 52.5 | 23.0 | 6.4 |
| 2–3 y | 169 | 161 | 19.0 | -0.017 | 0.30 | 0.46 | 0.52 | 0.13 / 0.32 | 10.1 | 0.75 | 76.9 | 24.7 | 53.3 | 23.1 | 6.3 |
| 3–4 y | 169 | 161 | 16.2 | -0.018 | 0.32 | 0.50 | 0.49 | 0.09 / 0.42 | 12.9 | 0.78 | 75.9 | 25.1 | 55.7 | 21.0 | 7.5 |

Own food and the mother (shares of the infant's daylight ticks)
| age | eating min | own kcal/day | own kcal per eating min | eating % daylight | eating at a full foregut % | carried % | mother foraging % | own fruit rate kcal/h | mother in a crown % | infant eating while she is in a crown % | nursing then % | infant hunger / fill then | acts then | own dry matter g/d in a crown / outside | crown intake ÷ full-foregut throughput | mother eating min | mother daylight fill | mother daylight hunger | mother reserves ÷ store | mothers' balance kcal/d |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 0 | 0 | — | 0.0 | 0.0 | 100.0 | 40.1 | 60 | 27.9 | 0.0 | 10.1 | 0.15 / 0.21 | follow 84.4, nurse 10.1, rest 5.3, nest 0.2 | 0 / 0 | 0.00 | 296 | 0.72 | 0.36 | -0.047 | 4 |
| 1–2 y | 65 | 177 | 2.73 | 8.6 | 7.1 | 19.3 | 40.8 | 101 | 31.8 | 16.6 | 12.7 | 0.24 / 0.40 | rest 45.6, eating 16.6, follow 14.6, nurse 12.7, play 6.9 | 29 / 34 | 0.56 | 302 | 0.71 | 0.49 | -0.100 | -17 |
| 2–3 y | 102 | 311 | 3.06 | 13.5 | 2.2 | 17.6 | 37.2 | 134 | 31.3 | 35.9 | 11.6 | 0.24 / 0.47 | rest 38.6, eating 35.9, nurse 11.6, follow 8.9, groom 1.9 | 81 / 27 | 1.15 | 274 | 0.68 | 0.55 | -0.139 | -72 |
| 3–4 y | 127 | 492 | 3.88 | 16.8 | 2.0 | 18.5 | 38.1 | 175 | 32.0 | 43.6 | 10.5 | 0.25 / 0.52 | eating 43.6, rest 30.9, nurse 10.5, follow 9.8, play 2.5 | 133 / 39 | 1.35 | 281 | 0.69 | 0.54 | -0.144 | -96 |

Infants (existing readouts): milk day + night, own food, kcal out, growth, reserves
| age | milk day | milk night | milk total | kcal out | growth kcal | reserves ÷ store | milk share |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.5–1 y | 221 | 63 | 284 | 283 | 34 | 0.010 | 1.00 |
| 1–2 y | 167 | 139 | 307 | 437 | 44 | -0.014 | 0.63 |
| 2–3 y | 169 | 138 | 307 | 541 | 44 | -0.015 | 0.50 |
| 3–4 y | 169 | 138 | 307 | 676 | 44 | -0.017 | 0.38 |

Against the predictions (§1.3): N1–N2 held for eligibility, drinking and gland-limited drinks (100%, 100%, 99.9–100%
at 1–4 y) but **missed for saturation**: the drive is saturated in only 13–14% of night-nest ticks (mean φ 0.31–0.37;
sleep lowers the pressure that defines the waking time left, so a sleeping infant reads its next waking day, not "no
time left"). N3 held (night spend 184–281 against night synthesis 146). D1 held (day milk 167–169 against 161 made by
day plus 7–9 left at dawn). D2 held (onsets at −0.015 to −0.018 of the store, hunger 0.30–0.32, foregut 0.31–0.51
full of which milk 0.09–0.18; none without a deficit). D3 held (own food on the menu 76–79%; nursing's hunger-free
part alone beats the best own food in 52–56%). D4 held (2–7% of eating at a full foregut; carried 18–19%). M1 missed:
mothers' eating minutes fall with infant age (302, 274, 281) and their balance with them (−17, −72, −96 kcal/day).

**The term that holds an older infant's drinking at the cap: its own deficit, which its own food cannot close.**
1. Drinking follows the infant's deficit, on both routes. At 0.5–1 y the need (283 kcal/day) is below the yield: the
   infant sits 1.0–1.5% of its store above its set point, its night hunger is 0.07, it drinks in 3.8% of night-nest
   ticks, the gland holds 239 kcal at dawn and is full 7.9% of the time, and it drinks 284 kcal, below the cap.
2. From 1 y the infant's spending (437, 541, 676 kcal/day at 1–2, 2–3, 3–4 y, at the captive-potential masses 6.9,
   9.6, 13.1 kg) exceeds the yield (307), and its own food stops near what its foregut passes while food is in reach:
   while its mother feeds in a crown (31–32% of its daylight) it eats 1.15 and 1.35 × what a full foregut passes at
   2–3 and 3–4 y (0.56 at 1–2 y, when trees open only from 1.5 y), in meals that end near a full foregut and rests while
   it empties (hunger then 0.24, foregut 0.47–0.52 full on average); outside those hours it adds 27–39 g of dry matter a
   day. So it stays 1.4–1.7% of its store below its set point.
3. In that deficit it drinks every kcal the gland makes: at night in its sleep (90% of night drinks), hunger 0.24–0.32
   against the 0.08 stop in every night-nest tick, every drink gland-limited (138 of 146 kcal made at night); by day in
   16–19 bouts at a gland of 9–13 kcal (167–169 kcal). The store never fills, so the cap (307) is what it drinks.

So the premise that the cap and not the infant's need sets what an older infant drinks does not hold on the model's
own books: the infant needs more than the yield. E1m's milk need "at the field's eating minutes" multiplied field
minutes by the model's per-minute intake; with intake held by the foregut's throughput, more minutes bring little more
food. The per-minute rate (101–175 kcal of fruit an hour, a foregut filled in under an hour) sets the infant's eating
time (T-INF-1: 8.6–16.8% of daylight against 17–47%), not its intake.

What the candidates of the brief can and cannot do, read from these numbers:
- *Milk and solids in one gut and one drive* (candidate 1): suckling already follows the deficit (item 1), and milk
  (0.185 g of dry matter per kcal against 0.406 for drupes) is the food a gut-limited infant should take. The one
  defect left in the infant's drive is the milk term of its intake capacity (energy.ts feedRate: 150 kcal/h all day,
  12 × what the gland makes; E1n §5): it keeps the infant's hunger at 0.24 in its mother's crown time against an
  own-food drive of 0.49–0.57, so its meals end and its rests begin earlier than its gut requires (the only headroom on
  the infant's side, roughly the gap between a half-full and a full foregut while food is in reach).
- *The night access rule* (candidate 2): night drinking follows the deficit (item 1); not the term.
- *The infant's intake rate per eating minute* (candidate 3): sets eating time, not intake (item 2).
- *The mother's refusal in her own deficit's currency, day and night* (candidate 4): the only route by which a
  food-limited infant drinks less than the gland makes. Today nothing but synthesis limits it; the weaning roll acts
  by day only from 3.2 y (9.8% of attempts at 3–4 y); E1n's decision, taken only while she is awake, moves refused day
  milk to the night through the 24-h store.

## 2. Step 2: mechanisms (registered 2 October 2026, 14:15, before any run of changed code)

### 2.1 Iteration 1: two arms, one per candidate the diagnosis leaves open

**Arm A, `milkInDrive` (candidate 1; 0 = today):** an unweaned infant's drive counts milk at what its mother's gland
can deliver, not at the suckling rate all day. In setHunger the intake capacity over the waking time left becomes
R_own × left + (the milk her gland holds + her synthesis rate × (left + fast)), in place of (R_own + 150 kcal/h) × left:
own food is available only while awake, milk through the waking time and the night after it (in her nest). The gland
and synthesis rate are read from the mother's ledger once a tick (energyTick, which has the world) and kept on the
infant's ledger (`gm`, `gy`); an infant without a lactating mother counts no milk. No new number; the form follows
the drive's definition (E1e: what it could eat over its horizon). Read only with `energyLedger` and `ledgerDrive` 1.
It removes no rule (`removesNothing`: a defect of the drive's capacity term, E1n §5).

Predictions for A (the regulator argument: the drive returns hunger to the level at which the infant's choices bring
intake to its spending, so a capacity term moves the reserve level, not the split between milk and own food):
- milk at 1–4 y at the cap within 2% (moderate to high); at 0.5–1 y up by 0–20 kcal/day (moderate: a larger φ keeps
  the night hunger above 0.08 more often);
- infants' reserves up by 0.005–0.03 of the store at 1–4 y (moderate); own food within ±10% of the reference at 2–4 y,
  up 0–25% at 1–2 y (low);
- mothers' balance by infant age within the reference spread (moderate); sums inside noise (moderate).

**Arm B, `weanDeficit` (candidate 4; 0 = today; read only with `weanDecide`, `energyLedger` and `ledgerDrive` 1):**
the mother's decision in her own deficit's currency, day and night.
- *Currency.* She lets a bout start and go on while her infant's relative reserve deficit is at least hers:
  d = max(0, −reserves ÷ usable store), the shortfall of the quantity condition reads. E1n compared the infant's
  own-food drive with her hunger readout, which by day is mostly her satiation term (her φ is saturated, E1n §3.5) and
  after a meal falls near zero, so she allowed bouts when her gut was full rather than because of her reserves. Equal
  weights (equal relatedness to her current and future offspring, trivers1974; design); ties (both at or above their
  set points) allow. Her future reproduction is tied to her energy state ("Cycling resumed only after a sustained
  period of energy gain", emeryThompson2012), so her reserves are the currency of her cost.
- *Night.* A sleeping mother makes no decision (E1n §3.6), and a refusal holds while her situation is unchanged (E1n
  §3.4: the infant asks again once she starts a new act). With the switch the night follows the same rule: while she
  sleeps, her last decision stands, so a refusal still pending (the infant's `wr` equals her decision count) stops
  night suckling until she starts a new act; awake in her nest she decides by the same comparison. Her deficit does
  not depend on her waking time, so the night comparison has no saturation artefact (E1n §3.5).
- No new number. It replaces E1n's comparison (`ownDrive` against her hunger) and E1n's "while she sleeps, night
  suckling runs as today"; it removes no registry entry (`removesNothing`; the roll is already removed by `weanDecide`).

Predictions for B (against the S5 reference; the arm is S5 + `weanDecide` + `weanDeficit`):
- every mother refuses until her infant's relative deficit reaches hers, so in the window each dyad sits near equal
  relative deficits (infant and mother within 0.03 of each other at 1–4 y; moderate);
- milk at 1–4 y below the cap by more than the reference spread, by 30–150 kcal/day, falling with infant age (low to
  moderate); night milk down more than day milk (moderate);
- mothers' balance by infant age improves, most where the infant has most own food (3–4 y), so T-ENE-5's direction
  (better with infant age from 1 y) appears (low); infants' reserves fall to −0.04 to −0.12 of the store (moderate);
  infants' own food up 0–25% (low, gut-limited); growth unchanged (condition stays above `condGood`, moderate);
- no starvation death (moderate to high); prescriptions 77 → 76 (`weanDecide` removes the roll; high); sums inside
  noise (moderate); night safety unchanged (high: no adult act changes).

Attribution arm B0 (not an iteration): S5 + `weanDecide` alone (E1n iteration 2 on S5), same runs, to separate the
decision from its currency and night rule.

Runs (each arm and B0): `e-bench --quick` (seeds 48 and 7, 30 + 30 days, `--workers 1`) and `energy-diagnose` (same
seeds and window), from a frozen detached checkout of the commit that adds the switches; a 2-day smoke test of each
switch first (seed 48, readouts only). Judged by §3.

**Decision rule (registered).** An arm is a *provisional keep candidate* if viable (no starvation death; no class
below −0.05%/day that is not already below it in the reference by more than its spread), the held-out sums not up
(|z| ≤ 2, with and without T-HUN-4 and T-BRD-1) and the fitted sum not up beyond noise; otherwise off, with the null
recorded. Neither arm removes a prescription, so neither can go on by default under the Track E rule. B answers the
stage's question only if milk at 1–4 y falls below the cap beyond the reference spread. If B makes weaning emerge
(milk to zero by the infant's own state before the prescribed age), a further iteration removes the prescribed weaning
age behind the switch; in a 60-day window with infants of 0.6–3.7 y this is not expected.

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
