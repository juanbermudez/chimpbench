# E4n pre-registration: why the stack's chimpanzees stopped hunting

Branch `e4n-hunt-rate` from `track-e` 0d08525. Track E, stage E4n. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all (hunt rows at 30 + 60 days, as the cap allows). Started 4 October 2026, 10:07.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a hunting rate.

This file is written in steps, each committed before the step it governs: §0–§2 (problem, plan, target samples) and
the diagnosis plan (§3) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions,
kill criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief and the S19–S24 record; to be verified in §3)

- T-HUN-1 (hunts per community-year seen by the observer's party-follow teams; band 5–25; a band of 4–11 scaled to the
  model's adult males is staged in `docs/staging/e4e-targets.patch.json`, not applied) on the integrated candidates
  (docs/staging/e-stack2-confirm.md, confirm mode, 5 seeds, 30 + 60 days):
  S19's four runs 10.05 / 10.46 / 5.24 / 9.25 (8.7 ± 2.4); S21's four runs (S19 + `choiceBelief` 2) 5.23 / 4.03 / 4.04
  / 3.24 (4.1 ± 0.8); S22 (S21 + `leftoverRules` 3) 2.02. S23 (`walkGait`) 6.45; S24 6.85.
- What changed between S19 and S21 is E3e's `choiceBelief` 2: the fitted softmax temperature (`rgTemperature` 0.164)
  is gone; the option of highest published score (the rules' ± 0.12 jitter included) plus the belief offset of unseen
  crops is taken.
- The likely reading, **to be tested, not assumed**: without the temperature a hunt is chosen only when its value tops
  every other option at the encounter, and the hunt's value (E4e `huntValue`: (1.6 h + 0.1) × expected meat energy per
  hour ÷ the male's own ripe-fruit rate, the expectation from E4k's pursuit) rarely does; under the temperature hunts
  were partly random picks (E4e H1: 14 chosen leads; offer scores 0.045–0.067 against a best option of 0.75–0.84,
  "the candidate jitter decides most of the rare hunts").
- Field picture (sources in docs/research.md; §2): hunting follows male party size and colobus availability, comes in
  bursts, tracks fruit abundance in some studies; why chimpanzees hunt is debated (nutrients meat provides that fruit
  does not; males' social gains from sharing; gregariousness). Which value, if any, the model lacks is decided only
  after the evidence is read (§2.3) and the diagnosis names what keeps the hunt from winning (§3).

## 1. Plan

1. **Diagnosis** (§3, registered before its runs) on S22 with unchanged code: at every colobus encounter of an adult
   male (the hunting fix's impulse), the hunt option's value and its parts (expected meat, captures expected from the
   pursuit, distance, the males in view counted as hunters, the fruit rate it is divided by, the time), the winning
   option and its value, the margin, and how many of those encounters a hunt would have won under S19's temperature
   (softmax at `rgTemperature` 0.164 over the same menu); T-HUN-1..8 and the hunters' and their families' energy.
   Seeds 48 and 7, 30-day burn-in + 60 days. Name what keeps the hunt from winning, with numbers.
2. **Hunt reference** (§3.1): S22 at 30 + 60 days on seeds 48 and 7, once plus one re-draw by `rngSalt`, so the
   hunting rows of every arm rest on more than a handful of hunts. The sums are judged against the integrator's quick
   reference (S22q and three `rngSalt` re-draws, bench-run3 ea794ff).
3. **Mechanism** behind a new switch (0 = today), from first principles, only for what the diagnosis implicates; every
   input sourced or tagged design; no weight chosen to hit a rate. If the diagnosis shows the hunt's value is right and
   the rate is a scorer or band question (E4f's staged scorer fixes; the staged 4–11 band), this stage says so and
   stages nothing new in the model.
4. At most three iterations, each logged here and committed before its run.

## 2. Target rows and sources (step 0; written 4 October 10:40–10:55, before any run)

### 2.1 Samples of the rows scored here

| Row | Population, years | Sample and method |
| --- | --- | --- |
| T-HUN-1 hunts per community-year (fitted; band 5–25, staged 4–11) | Kanyawara 1996–2014; Ngogo 1995–99 | gilby2015 (**re-opened this stage**, PMC4633842 article page): "every 15 min, the field assistants record party composition"; encounter: "whether colobus can be detected within 100 m of the chimpanzees"; "hunt attempts are defined as instances when a chimpanzee climbs to the height of the lowest monkey"; Table 1: 224 months, 11.4 adult males, 2,461 encounters (3.73 per 100 h), 194 hunt attempts (7.9%), 119 successful (61.3%), 152 prey (1.28 per success). Party follows by trained field assistants; community-level counts (no sex, reproductive-state or mass restriction). 194 ÷ 18.67 y = 10.4 per year (derived). Ngogo: 45.1 successful hunts a year at ~24 adult males (wattsMitani2002, closed; as recorded). |
| T-HUN-2 success (fitted; 0.5–0.8) | Kanyawara, Kasekela, Mitumba; Ngogo | Share of hunts with ≥ 1 capture: 0.613, 0.623, 0.532 (gilby2015 Table 1); Ngogo 0.73 (36/49), red colobus 0.78 (32/41) (mitaniWatts1999 FT, read by E4k), 0.82 (67/82) (wattsMitani2002, as recorded). |
| T-HUN-3 hunted share of encounters (fitted; 0.05–0.40) | as T-HUN-1 | Kanyawara 0.079 of 2,461 (100 m, 15-min party scans, an encounter = a positive scan not preceded by a positive scan, quoted verbatim by E4f); Gombe 0.647, 0.480 (50 m, focal); Ngogo 0.37 (61/164; mitaniWatts2001, definition not recorded). The model's observer scores it on focal follows with a change-of-group rule (E4f §2.2; staged scorer fixes not applied). |
| T-HUN-4 odds per male (held-out; rare row) | the three gilby2015 communities | Logistic regression of hunting per encounter on adult males in the scan (+48%, +8%, +72% per male). With the impact hunter AJ present Kanyawara parties hunted 18.9% (157/830) of encounters, 2.3% (37/1,594) without him (gilby2015, quoted this stage). |
| T-HUN-7 kills per success (fitted; 1.2–2.0) | as above; Ngogo 1995–98 | 1.28, 1.90, 1.30 (gilby2015 Table 1); Ngogo 3.41 ± 1.79 (n = 32, mitaniWatts1999). |
| T-HUN-8 adult males' share of kills (held-out; 0.8–0.95) | Ngogo; Gombe | 0.86 of 90 kills (mitaniWatts1999 FT), 0.90 of 261 (wattsMitani2002), 0.893 (stanford1994, abstract). |
| T-HUN-5, T-HUN-6 | — | Need a year (hunting against fruit across months; binges): insufficient under the cap, not scored. |
| T-ACT-1..4 (fitted) | Kibale sites, Waibira | Focal instantaneous samples at 1-min intervals per individual (feeding, travel, grooming, rest + groom; `data/targets.json` definitions); samples as recorded by e3c-prereg.md §3 and e3e-prereg.md §3. Reported here, not this stage's object. |

### 2.2 Why chimpanzees hunt: what the cited sources say (read before any mechanism is chosen; no value taken)

- **Party and males** [gilby2015] (FT, re-opened) [H]: more adult males, more hunting at every site; one impact hunter
  multiplies the hunted share eightfold. [mitaniWattsMuller2002] (review, FT) [M]: Ngogo males hunt when success is likely
  (large parties, many male hunters) and forgo most attempts in small parties; hunting rose when fruit was abundant, and
  the link runs through party size. [mitaniWatts1999] (FT) [H]: success rises with party size and male hunters.
- **Energy surplus, not hunger** [gilbyWrangham2007] (title only; finding as recorded in T-HUN-5) [M]: at Kanyawara over
  14 years hunting rises with the ripe drupe fruit eaten, after controlling for males and swollen females ("risk-prone
  hunting ... increases during periods of high diet quality"). [mitaniWatts2001], [wattsMitani2002] (closed; as recorded):
  Ngogo hunts per month rise with ripe fruit (r² 0.37–0.38); a 57-day binge during a *Uvariopsis* crop.
- **Meat's worth is uncertain** [tennie2014] (Abs) [M]: "why do chimpanzees hunt?" weighed against invertebrate prey; no
  nutritional data exist on the flesh of chimpanzee prey. [hardus2012] (FT, secondary) [L]: meat eaten at 348 g/h
  (Wrangham & Conklin-Brittain 2003), up to 1.9 ± 1.2 kg/h (Gilby 2006), 115 kcal per 100 g (the model's
  `ledgerMeatKcalPerMin` 6.7). E4m (research.md "Addendum: E4m four small rules"): the energy of a capture (1,149 kcal,
  `meatEatPerH`) has no sourced replacement; 66% of Ngogo kills are immature (mitaniWatts1999 Table 3).
- **Social returns** [mitaniWatts2001] (closed; as recorded): males share meat with allies and grooming partners; sharing
  is in the model (beg and share options), but nothing of it enters the hunt's lead value.

The model's hunt value (E4e, E4k) is energy only, weighted by the hunter's present appetite (the drive 1.6 h + 0.1). The
field's direction (gilbyWrangham2007, mitaniWatts2001) is the opposite of an appetite weight: more hunting when food is
good. This conflict was registered by E4e (§4) and is not resolved by any source read; §3 measures whether it binds.

## 3. Diagnosis plan (step 1; unchanged code; committed before it runs)

### 3.1 Hunt reference (registered before its runs)

The integrator's quick reference (S22q and its three `rngSalt` re-draws, bench-run3 ea794ff; code identical to this
branch's start for S22) judges the sums. Hunting rows rest on a handful of hunts in 30 days, so this stage also runs:

- **H0** = S22 (`bench-run3/artifacts/validation/e/s22q/S22q-params.json`), `e-bench --seeds 48,7 --burn-in 30 --days 60`
  (custom), and **H0r** = the same plus `"rngSalt":1`. From a frozen detached checkout of the commit that adds this
  section (`…/scratchpad/e4n/ref`; simulation code identical to track-e 0d08525 and bench-run3 ea794ff), `--workers 2`
  while the load is below 8 (else 1), one run at a time. Outputs `artifacts/validation/e4n/{H0,H0r}.json` (gitignored).
- Every hunt row of every arm is reported against H0 and H0r beside the quick judgement. H0's seeds should reproduce the
  integrator's S22 confirm on seeds 48 and 7 (same world; checked from its per-seed scorecard where it carries them).

### 3.2 Diagnosis tool (`scripts/e4n-hunt-diagnose.ts`, read-only; registered before it runs)

World: e-bench's (createWorld + tickWorld for the burn-in and the scored days, as `src/field/run.ts`). Read through the
existing hooks only (`rgTap` in rg.ts, `huntTap` in ecology.ts, `energyTap` in energy.ts; each draws nothing), plus per-tick
reads of state. Seeds 48 and 7 (one at a time or two workers), 30-day burn-in + 60 days, on S22 (D0) and on H0r's
parameters (D0r), so the truth readouts have two realizations. Definitions (simulation truth, daylight > 0.3 as
perception's prey detection):

- **Encounter** (E4e's definition, adult males): perception ran this tick (`seenAt` = now) and the colobus group in
  sight (within sight × `preySightFactor`, + 20 m) differs from the group perceived at his previous perception.
- **Impulse**: the hunting fix's hunt impulse is newly set on an adult male (`impulse` = IMPULSE_HUNT with a new
  `impulseUntil`): an encounter with ≥ `huntEncMinMales` (2) adult males in view and no other impulse pending.
- **Offer**: at the first decision after the impulse, a lead `hunt` candidate for that group is on his list. If not,
  why: rain ≥ 0.3; timer energy ≤ 0.35; an ongoing community hunt on the group (the join option instead); the hunt's rate
  r = 0 because the pursuit expects no capture (`evenCaptures(n, cone)` = 0, n = adult males in view) or no energy need.
- **Hunt draw**: an RG decision (rgTap) whose menu holds the lead `hunt`. Read there: n; his cone (degrees); captures
  expected `evenCaptures(n, cone)`; his expected share (captures ÷ n) and E = min(energy need, share × 1,149 kcal); his
  ripe-fruit rate R (kcal/h); T split into approach (d ÷ speed), chase ((`huntResolveMinMin` + span ÷ 2) min) and eating
  (E ÷ `ledgerMeatKcalPerMin`); E ÷ T (kcal/h); r = E ÷ T ÷ R; the drive 1.6 h + 0.1; the value = drive × r (identity:
  must equal the option's stored raw value, meta.raw, to 1e-6); its jitter and published score; the menu's options (kind,
  published score), the option taken and its kind and score, the hunt's rank, the margin (best other published score −
  the hunt's), whether the option taken was the menu's top by published score; **under S19's temperature**: the softmax
  probability of the hunt over the same menu's published scores at `rgTemperature` 0.164 (S19's choice: no belief
  offset). Summed over draws: hunts the temperature would have started, per community-year.
- **Sensitivity readouts (not mechanisms; no weight is chosen from them):** the share of hunt draws the hunt would win
  (beat the best other published score) if (a) r had its ceiling with no approach or chase (E ÷ (E ÷ R_meat) ÷ R =
  R_meat ÷ R), (b) the drive were at its hunger-free floor's complement (drive 1.7, i.e. h = 1), (c) E were not capped
  by the need, (d) the hunt's value were 1 (a crown at full drive). These say which term binds.
- **Hunts** (huntTap, at the resolution): hunters listed and in the pursuit, success, captures; captures per hunter in
  the pursuit; the leader's adult males in view at the start; hunts per community-year (truth).
- **Meat and energy** (energyTap 'eaten', kind meat): meat kcal eaten per animal-day by class (adult male, adolescent
  male, lactating female, other female, juvenile 5–12 y, infant < 5 y) and by hunters (eaten by animals that were in a
  hunt's pursuit within the 6 h after it) against other adult males; leaders' state at hunt draws (hunger, reserves ÷
  usable store, need, foregut fill) for draws won and lost. Reserve trends by class come from energy-diagnose on the
  quick runs (the integrator's S22q-energy and its re-draws; the same tool on each arm).
- **Observer** (from H0, H0r's scorecards): T-HUN-1..8 and their sample sizes; truth hunts per community-year (e-bench
  `truthHunts` where present); the staged scorer readings are not computed here (E4f's tool does them).

**Tool checks.** Truth hunts and captures per seed equal e-bench's (H0's scorecard); the identity value = raw at every
hunt draw; the world hash after the run equals a run without the taps (2 days, seeds 48 and 7).

**Reading rules, fixed now.** "What keeps the hunt from winning" is named from the hunt draws: the share of impulses
never offered and why (D1, opportunity); the hunt's value and its parts against the winner's value (D2, value): which of
drive, r (and within r: eating time, chase, approach, the expected share) holds it below the winner, by the
sensitivity readouts; the winners' kinds (D3, competition); and truth against observed hunts (D4, scorer). A term is
**implicated** for §4 only if (a) the sensitivity readout shows that changing it alone flips at least a quarter of the
lost draws, and (b) the model carries it with a sourced or physical meaning that the change would correct (a value with
no source is not a lever). If no term passes (a) and (b), the stage stages nothing new in the model and says whether
the rate is a scorer or band question.

### 3.3 Diagnosis result (frozen checkouts: H0/H0r at ef07577, D0/D0r at 34f724d; simulation code identical to track-e 0d08525; every table printed by `artifacts/validation/e4n/diag_table.py` and `report.py` from the JSON)

**Tool checks.** The taps leave S22's world hash unchanged (2 days, seeds 48 and 7: e8ed493db46eb3a6 and 644263a5233a5f32 with
and without them). At all 647 hunt draws the recomputed value equals the option's stored raw value and huntvalue.ts's
rate exactly (maximum difference 0). Truth hunts per seed equal e-bench's: H0 [0, 3] and D0 [0, 3]; H0r [1, 2] and D0r
3 in all (the e-bench re-draw and the tool's re-draw share the salt).

| readout (simulation truth, seeds 48 and 7 pooled; 30-day burn-in + 60 days) | D0 | D0r |
| --- | --- | --- |
| community-days | 360 | 360 |
| encounters (adult males) per community-day | 5.21 | 5.64 |
| hunt impulses per community-day | 2.76 | 3.40 |
| impulses by adult males in view (2 / 3 / 4 / 5 / 6+) | 646 / 230 / 78 / 34 / 6 | 711 / 321 / 117 / 49 / 27 |
| impulses with the lead offered | 286 (0.288) | 361 (0.295) |
| not offered: no capture expected (fewer than 3 males) / timer energy ≤ 0.35 / rain / an ongoing hunt / no need / other | 621 / 77 / 10 / 0 / 0 / 0 | 733 / 126 / 5 / 0 / 0 / 0 |
| hunt draws (lead on the menu at an RG choice) | 286 | 361 |
| hunt draws won (hunts led) | 3 | 3 |
| hunts started (truth); per community-year | 3; 3.04 | 3; 3.04 |
| hunts the temperature 0.164 would have started (Σ softmax probability); per community-year | 17.14; 17.38 | 20.34; 20.62 |
| hunt draws by males in view (3 / 4 / 5 / 6+) | 178 / 68 / 34 / 6 | 187 / 104 / 45 / 25 |
| hunt's expected share of a carcass (captures ÷ n): mean | 0.298 | 0.291 |
| expected meat E (kcal): mean (10% / 90%) | 342 (230 / 383) | 333 (230 / 383) |
| E capped by the need (share of draws) | 0.003 | 0.014 |
| time T (h): approach / chase / eating | 0.069 / 0.133 / 0.850 | 0.066 / 0.133 / 0.829 |
| meat energy per hour of the hunt E ÷ T (kcal/h) | 323 | 322 |
| his ripe-fruit rate R (kcal/h); meat-eating rate (kcal/h) | 435; 402 | 435; 402 |
| r = E ÷ T ÷ R: mean (10% / 90%); ceiling R_meat ÷ R | 0.743 (0.691 / 0.781); 0.925 | 0.741 (0.692 / 0.778); 0.925 |
| hunger h; drive 1.6 h + 0.1 (mean) | 0.264; 0.523 | 0.291; 0.565 |
| hunt's value = drive × r: mean (10% / 90%) | 0.390 (0.161 / 0.598) | 0.420 (0.213 / 0.642) |
| best other option's published score: mean (10% / 90%) | 0.927 (0.430 / 1.497) | 0.994 (0.482 / 1.520) |
| margin (best other − hunt), median; hunt rank in the menu, median; menu size | 0.437; 4; 7.5 | 0.505; 4; 7.5 |
| leaders' state at draws: reserves ÷ store, foregut fill, need (kcal) | -0.009 / 0.488 / 1308 | -0.009 / 0.442 / 1340 |
| lost draws the hunt would win with (a) r at its ceiling / (b) drive 1.7 (h = 1) / (c) E not capped by the need / (d) value 1 | 0.032 / 0.795 / 0.000 / 0.615 | 0.036 / 0.729 / 0.000 / 0.545 |

D0: options that won the 283 lost draws (share; mean published score): travel: joined trip 0.19 (1.33), travel: own trip 0.15 (0.57), nest 0.11 (1.29), feed: crown 0.09 (0.74), rest 0.09 (0.51), groom 0.07 (0.73), patrol 0.07 (1.27), pant-grunt 0.06 (0.78), guard 0.03 (0.88), submit 0.03 (1.56), travel: to caller 0.02 (0.85), display 0.02 (0.49), mate 0.02 (0.85), charge 0.02 (0.80), follow: party 0.01 (0.84), flee 0.01 (0.70), call 0.01 (0.42), drink 0.00 (0.82), console 0.00 (0.51); food options (crown, fallback, trips) 0.43
D0r: options that won the 358 lost draws (share; mean published score): travel: joined trip 0.18 (1.42), travel: own trip 0.14 (0.61), patrol 0.13 (1.27), feed: crown 0.11 (0.82), nest 0.09 (1.31), groom 0.07 (0.86), rest 0.04 (0.46), pant-grunt 0.04 (0.75), guard 0.04 (0.82), mate 0.04 (0.90), flee 0.03 (0.80), display 0.02 (0.56), drink 0.01 (0.79), charge 0.01 (0.89), call 0.01 (0.52), submit 0.01 (1.53), travel: to caller 0.01 (0.93), follow: party 0.01 (1.08); food options (crown, fallback, trips) 0.43


D0: hunts resolved 3, success 0/3, captures 0, kills per success —, hunters in the pursuit 2.00 (listed 3.67), captures per hunter in the pursuit 0.000, leader's males in view {3: 2, 4: 1}
   meat kcal per animal-day by class: adolescentMale 0.0, adultMale 0.0, femaleLactating 0.0, femaleOther 0.0, infant 0.0, juvenile 0.0; adult males' meat: hunters 0 kcal, other adult males 0 kcal
   adult males' daylight (mean of seeds): rest 0.333, forage 0.323, travel 0.122, nest 0.090, groom 0.087, guard 0.019, patrol 0.009, drink 0.004
D0r: hunts resolved 3, success 3/3, captures 3, kills per success 1.00, hunters in the pursuit 3.33 (listed 3.33), captures per hunter in the pursuit 0.306, leader's males in view {3: 1, 4: 2}
   meat kcal per animal-day by class: adolescentMale 0.6, adultMale 1.5, femaleLactating 0.0, femaleOther 0.6, infant 0.0, juvenile 0.0; adult males' meat: hunters 2490 kcal, other adult males 0 kcal
   adult males' daylight (mean of seeds): forage 0.325, rest 0.291, travel 0.135, groom 0.088, nest 0.087, guard 0.047, patrol 0.009, drink 0.005

**Hunt rows** (e-bench, 30 + 60 days, seeds 48 and 7; `report.py hunt`): H0 truth hunts [0, 3] (3.0 per community-year),
2 detected; T-HUN-1 3.03, T-HUN-2 0 (2 observed hunts), T-HUN-3 0.004 (8.45 encounters per 100 follow-hours), T-HUN-4
6.07 (degenerate), T-HUN-7 and T-HUN-8 insufficient. H0r truth [1, 2] (3.0), 1 detected; T-HUN-1 2.02, T-HUN-2 1 (1
hunt), T-HUN-3 0.004 (9.00), T-HUN-4 1.29, T-HUN-7 1, T-HUN-8 1. Viability passes (one illness death in H0r).

**Truth hunts on the integrated candidates** (their confirm scorecards, 5 seeds, 30 + 60 days, read now): S19's four runs
16.2, 17.8, 13.0, 19.1 per community-year; S21's four 8.9, 8.5, 8.9, 6.9; S22 4.5. The temperature's counterfactual on
S22's own menus (17.4 and 20.6 per community-year above) reproduces S19's level.

**What keeps the hunt from winning (finding).**
1. **Opportunity.** 58–65% of the hunt impulses (646 of 994 and 711 of 1,225) come with only two adult males in view, for
   which the pursuit expects no capture (E4k: at equal speeds three hunters must surround the group); with a few more
   where three males' cones are too narrow to close (a leader's low alertness), the lead is never offered at 621 and 733
   impulses (62% and 60%); 8–10% more are held by the timer-energy literal (`c.energy > 0.35`, candidates.ts:1143).
2. **Value.** Offered (286 and 361 draws), the hunt is worth 0.39–0.42 against a best alternative of 0.93–0.99 (median
   margin 0.44–0.51) and tops the menu in 3 draws of each realization (1%). Its rate is near the model's physics: r = 0.74
   of the male's own fruit rate, against a ceiling of 0.925 (meat is eaten at 402 kcal/h, ripe fruit at 435); the need
   cap binds in 0.3–1.4% of draws. What halves it is the appetite weight it borrows from the crowns: the drive 1.6 h + 0.1
   is 0.52–0.57 at the encounters (h 0.26–0.29). By the sensitivity readouts, with h = 1 the hunt would top 73–80% of the
   draws it lost; at r's ceiling 3–4%; without the need cap 0%; at a value of 1, 55–62%.
3. **Competition.** It loses to joined trips (18–19% of lost draws, published scores 1.33–1.42: the companion's company),
   own trips (14–15%, 0.57–0.61), the morning nest (9–11%, 1.29–1.31, every one at 06:40–07:30), patrols (7–13%, 1.27),
   crowns (9–11%, 0.74–0.82), grooming, rest and calls; food options win 43%.
4. **The temperature.** Under S19's softmax (T 0.164) the same menus give the hunt a 5.6–6.0% chance per draw: 17.4–20.6
   hunts per community-year, S19's level. Under `choiceBelief` 2 the hunt wins only when every alternative is weak (the
   jitter and belief offsets aside): S19's hunts were the temperature's picks of an option that never tops the menu.
5. **The hunts that start.** 3 per realization (3.0 per community-year in truth); in D0 all three failed with 2.0 hunters
   in the pursuit at the resolution (3.67 listed: E4k's tool on seed 7 shows joiners still below the canopy or on the
   ground, having joined 5 min after the start of a 5.8-min hunt, and three hunters at canopy height whose cones,
   71°, 71° and 48° at their alertness, left a 5° gap); in D0r all three succeeded (one kill each). Meat eaten: 0 and
   1.5 kcal per adult male-day.

### 3.4 Readouts added after the first table (disclosed; computed from the saved draws, no new run)

Written after §3.3's table was read and before these were computed: (1) the knife-edge, the share of hunt draws the hunt
would top at m times its value; (2) the bands' needs in draws won; (3) **(e)**, the drive without its distension term:
energy.ts setHunger makes the drive min(1, φ) × (1 − w·fill²), φ = the energy need over the waking time left ÷ the
feeding capacity over it, w = 1 + reserves ÷ usable store (E1i); (e) values the hunt at 1.6·min(1, φ) + 0.1 (φ recovered
as h ÷ (1 − w·fill²) from the state recorded at each draw); (4) what sharing a capture buys in the model's own social
currency.

```
D0: share of hunt draws the hunt would top (published score above the best other's) at m × its value: ×1: 0.003, ×1.25: 0.042, ×1.5: 0.150, ×2: 0.392, ×2.5: 0.605, ×3: 0.717; won in the run 0.010; under the temperature 0.060; offered draws per community-day 0.79
   the staged band 4–11 hunts per community-year needs 0.014–0.038 of offered draws won (one hunt per won draw); the registered 5–25 needs 0.017–0.086
   (e) meat eaten as the gut empties (drive without distension satiation): mean value 0.581; lost draws flipped 0.180
D0r: share of hunt draws the hunt would top (published score above the best other's) at m × its value: ×1: 0.006, ×1.25: 0.050, ×1.5: 0.172, ×2: 0.410, ×2.5: 0.551, ×3: 0.701; won in the run 0.008; under the temperature 0.056; offered draws per community-day 1.00
   the staged band 4–11 hunts per community-year needs 0.011–0.030 of offered draws won (one hunt per won draw); the registered 5–25 needs 0.014–0.068
   (e) meat eaten as the gut empties (drive without distension satiation): mean value 0.583; lost draws flipped 0.148
```

- **A knife-edge.** The bands need 1.1–3.8% (staged) or 1.4–8.6% (registered) of offered draws won; the hunt tops 0.3–0.6%
  of them by published score (0.8–1.0% with the belief offsets); 1.25 times its value would give 4–5%, 1.5 times 15–17%.
  Any unsourced term worth about 0.1 on the hunt's value would therefore set the hunting rate: a design value for one of the
  debated non-energy reasons (nutrients, social returns) would be a fit, whatever it was called.
- **What sharing buys, in the model's currency.** A share adds 0.03 to the sharer's bond (execution.ts 'share'); a bond is
  worth `joinBondW` 0.5 × (1 − social) in a companion's company (companyValue, E5a). Five shares of a carcass (0.2 units
  each) are worth at most 5 × 0.03 × 0.5 = 0.075 to a male at a full social drive, a sixth of the median gap (0.44–0.51).
  The model's social returns of meat cannot carry hunting; their field size is not quantified by any source read.
- **(e) the distension term.** Removing it raises the hunt's mean value by half (0.39 → 0.58) and would top 15–18% of the
  draws it lost.

**Reading against the registered rule (§3.2).** The term that passes (a) is the drive (h = 1 flips 73–80%; r's ceiling
3–4%, the need cap 0%). An appetite of 1 is a probe, not a state, so (b) asks which part of the drive the model's own
physics says is wrong for a hunt. Its distension part: a crown's fruit must be eaten now, so a full foregut rightly
lowers a crown's worth; a capture is not eaten now. The model holds a carcass (`carryingMeat`) and eats it while awake at
`meatEatPerH`, whatever the act, taking "only what the gut takes" (life.ts:163–167), and meat brings 0.23 g dry matter
per kcal with no fibre (`digestaMeatDmGPerKcal`, assumed; energy.ts digesta). Distension now does not limit what a
capture delivers; the energy deficit over the waking time left (φ) does, as for any food. This correction flips 15–18% of
the lost draws alone (below the 25% bar, which was set for the binding term; the drive passes it), and with the
knife-edge above that is enough to move hunting several-fold. It is the only correction of the drive with a physical
meaning; it adds no magnitude. It does not capture the field's surplus direction (gilbyWrangham2007: more hunting at high
diet quality): φ is low in surplus. The non-energy reasons remain unbuilt (knife-edge; no magnitude in any source).

## 4. Mechanism, iteration 1 (switch `huntDrive`, 0 = today; acts only with `huntValue` 1, `energyLedger` 1, `ledgerDrive` 1)

With `huntDrive` 1 the hunt lead at a colobus encounter is worth (1.6·min(1, φ) + 0.1) × r instead of (1.6·h + 0.1) × r:
- r unchanged (huntvalue.ts huntRate: expected meat from the pursuit, approach, chase and eating time, relative to his
  ripe-fruit rate);
- φ = energy.ts setHunger's need ratio (the energy need over the waking time left and the fast after it ÷ the feeding
  capacity over the waking time left; E1e), computed by a new pure function `deficitDrive(c, P)` from the same terms, in
  place of `c.hunger` = min(1, φ) × (1 − w·fill²): the distension (and E1i's reserve-weighted) satiation is left out
  because a capture is held and eaten as the gut allows (§3.4);
- 1.6 and 0.1: the crowns' drive (C13b, design), as today. Joining (hand-set), the pursuit, the offer's gates, the
  candidates of every other act: unchanged.

Biological reading: a male whose gut is full of fruit still weighs a carcass by the energy he will need before night,
because he can carry it and eat it over the following hours, as chimpanzees do. Sources: the model's own physics above
(meat held and eaten as the gut allows; `meatEatPerH` design; `ledgerMeatKcalPerMin` 6.7, hardus2012 [L], 348 g/h, so a
third of a carcass takes about an hour to eat); direction only, gilbyWrangham2007 (hunting does not fall when the diet is
rich) [M]. No new magnitude; one new registry id (the switch, design). Removes no counted prescription (a correction, as
E3b and E1p were): `removesNothing` in the switch registry.

Code: energy.ts `deficitDrive` (exported, pure), candidates.ts (the lead's drive under the switch), the diagnosis tool (the
identity reads the switch), data/params.json `huntDrive`, docs/simulation.md §17, TRACK_E_SWITCHES in
tests/sim-track-e.test.ts and scripts/lib/prescriptions.ts. Tests (tests/sim-hunt-drive.test.ts): 0 by default; with the
ledger's drive on, `deficitDrive` × the satiation term reproduces `c.hunger` for animals across a field day (identity
with setHunger); deterministic and JSON-lossless over a field day with the switch on (S22's switches).

## 5. Readouts (defined in §3.2; smoke-tested with the switch on before any arm, §9)

e-bench rows T-HUN-1..8 (definitions in `src/field/metrics.ts`, from gilby2015's Methods quoted in §2.1: a hunt attempt
"instances when a chimpanzee climbs to the height of the lowest monkey"; an encounter "whether colobus can be detected
within 100 m of the chimpanzees" at 15-min scans), T-ACT-1..4 (focal instantaneous samples, `data/targets.json`
definitions), sums with and without the rare rows (T-HUN-4, T-BRD-1, T-IGE-3), prescriptions, viability and deaths by
cause; truth from the diagnosis tool (§3.2: encounters, impulses, offers, draws, draws won, the hunt's value and its
parts, winners, hunts, success, kills, hunters in the pursuit, meat by class); reserves ÷ store %/day by class from
`scripts/energy-diagnose.ts` (the integrator's convention, as S22q-energy).

## 6. Arm and predictions (stated before any run of changed code)

**A1** = S22 + `huntDrive` 1, from a frozen detached checkout of the commit that adds the switch: (a) `e-bench --quick`
(seeds 48, 7; 30 + 30) judged with `judge_vs_reps.py quick custom` against S22q, S22q1–3; (b) `e-bench --seeds 48,7
--burn-in 30 --days 60` (hunt rows against H0 and H0r); (c) the diagnosis tool, seeds 48 and 7, 30 + 60; (d)
energy-diagnose, seeds 48 and 7, 30 + 30; (e) `prescription-ledger.ts --count --params`. `--workers` 2, 1 above load 8.

Predictions (against S22's references; moderate confidence unless stated):
- Truth: the hunt's mean value at draws 0.39–0.42 → 0.52–0.65 (high: §3.4); hunt draws won 1% → 8–20%; hunts 3.0 → 20–60
  per community-year (the per-draw estimate gives 46–58; hunts in progress and alerted males lower it; low); success
  0.3–0.7; kills per success 1.0–1.3; meat eaten by adult males up from 0–1.5 to ≥ 10 kcal per male-day.
- Hunt rows at 30 + 60 days: T-HUN-1 from 2.0–3.0 to 12–40 (above the staged 4–11; low confidence on the registered
  5–25's top); T-HUN-3 from 0.004 to 0.02–0.07; T-HUN-2 0.3–0.7; T-HUN-7 1.0–1.3; T-HUN-8 ≥ 0.8; T-HUN-4 unresolved.
- Quick sums against the S22q group: held-out with and without the rare rows inside noise; fitted inside noise (low:
  T-HUN-1 may cross its band's top); T-ACT-1..4 inside the group's spread; reserves: adult males up or inside spread,
  every other class inside spread (hunting is under 1% of males' daylight); prescriptions 43 (high); viability passes.

## 7. Kill criterion and verdict rule

`huntDrive` stays off (null, recorded) if viability fails, if held-out without T-HUN-4, T-BRD-1 and T-IGE-3 rises beyond
noise (z > +2 against the S22q mean), or if the mechanism does not run (truth hunt draws won ≤ 3%, pooled). It removes no
prescription, so it can only be a correction: recommended for a 5-seed confirm on the stack only if, in addition, the
fitted sum is not worse beyond noise (z ≤ +2) and the hunting rows at 30 + 60 days (T-HUN-1, -2, -3, -7 distances summed)
are closer to their bands than the mean of H0 and H0r. If T-HUN-1 rises above its band while T-HUN-3 enters its band, the
result is E4e's tie of the two rows through the encounter rate (E4f: the observer's 2.5 × Kanyawara), recorded as such: no
weight is added to bring either down.

## 8. Iterations and known defects

At most 3 iterations, each logged in §9 and committed before its run; a further one only for what A1's readouts
implicate. Known defects deferred (not fixed here; file:line at b84009f):
- the timer-energy literal gate `c.energy > 0.35` (src/sim/candidates.ts:1143) holds 8–10% of hunt impulses on S22;
- the pursuit never expects a capture by one or two hunters (E4k's design ratio 1, src/sim/huntpursuit.ts), against Taï's
  16% for lone hunters (samuni2018cb) and Mitumba's 53% success with 2.9 adult males (gilby2015): 58–65% of impulses;
- huntRate charges the meat's eating time (src/sim/huntvalue.ts:33) while carried meat is eaten during any act
  (src/sim/life.ts:163); the valuation is the field-faithful side (meat eating is an activity of hours), the execution a
  stylization; not changed;
- the hunt's E is capped by the need (src/sim/huntvalue.ts:29), a crown's bout by the gut room (E3c): inert (0.3–1.4% of
  draws);
- the hand-set join value (src/sim/candidates.ts:1150) and late joiners (E4k's tool on S22 seed 7: five of seven listed
  hunters below the canopy at a 5.8-min resolution, joined after 5 min).

## 9. Results

### Run log (each entry written before its run)

- **H0, H0r, D0, D0r** (§3.1–§3.2; unchanged code): done, §3.3.
- **S1 (smoke test with the switch on; before any arm).** c8a573d: `tests/sim-hunt-drive.test.ts` 4 pass; S22's 2-day
  world hash unchanged with `huntDrive` 0 (seeds 48 and 7: e8ed493db46eb3a6, 644263a5233a5f32); prescriptions 43 for S22
  and for S22 + `huntDrive` 1 (`--count --params`); the diagnosis tool on S22 + `huntDrive` 1, seed 48, 1 + 2 days: 9 draws,
  value = raw at every draw, the drive = 1.6 × φ + 0.1 with φ = `deficitDrive` (equal to the readout ÷ its satiation
  term to 1e-4 at every draw: the §3.4 estimate is exact). Every §5 readout is produced.
- **A1 (iteration 1).** From a frozen detached checkout of the commit that adds this entry: (a) `e-bench --quick --params
  S22+{"huntDrive":1} --out artifacts/validation/e4n/A1q` and (b) `e-bench --seeds 48,7 --burn-in 30 --days 60 … --out
  artifacts/validation/e4n/A1h` (one after the other, `--workers` 2 below load 8); (c) `scripts/e4n-hunt-diagnose.ts`
  seeds 48 and 7, 30 + 60 (`diag/A1-{48,7}.json`) and (d) `scripts/energy-diagnose.ts --seeds 48,7 --burn-in 30 --days 30
  --json …/A1-energy.json` (one after the other, beside the e-bench chain). Judged per §6–§7: the quick sums against S22q
  and S22q1–3 (`judge_vs_reps.py quick custom`), the hunt rows against H0 and H0r, the reserves against S22q's four energy
  runs.
- **A1r (a re-draw of A1; logged after A1's runs were read, before its own run; disclosed).** A1's seed-48 world drew a
  respiratory outbreak (disease.ts dailyDisease: arrival 0.1 per community-year, a world.rng draw): 3 deaths in the quick
  window (an adult male and two lactating females, whose infants then lost reserves: infants 0.5–2 y −0.247%/day pooled),
  8 by day 90 in A1h (7 outbreak, 1 orphaned infant). None of S22's six realizations had one. The registered reserve
  comparison cannot separate the switch from that draw, so A1 is re-drawn once by `rngSalt` 1 (the behaviour-free lever):
  A1r = S22 + `huntDrive` 1 + `rngSalt` 1, from the same frozen checkout: `energy-diagnose` (seeds 48 and 7, 30 + 30),
  `e-bench --quick` (A1rq) and `e-bench --seeds 48,7 --burn-in 30 --days 60` (A1rh). Reading: the reserves of A1r (if no
  outbreak, or with the dead mothers' infants named) against the S22q group; A1's and A1r's sums and hunt rows both
  reported. No other change.

#### A1 result: truth (b500cf8 frozen; the diagnosis tool, seeds 48 and 7, 30 + 60 days; `diag_table.py D0 D0r A1`)

Tool checks: value = raw at all 187 draws (maximum difference 0); truth hunts per seed equal e-bench's (A1-48 17 and A1-7
26; A1h [17, 26]).

| readout (simulation truth, seeds 48 and 7 pooled; 30-day burn-in + 60 days) | D0 | D0r | A1 |
| --- | --- | --- | --- |
| community-days | 360 | 360 | 360 |
| encounters (adult males) per community-day | 5.21 | 5.64 | 5.54 |
| hunt impulses per community-day | 2.76 | 3.40 | 2.96 |
| impulses by adult males in view (2 / 3 / 4 / 5 / 6+) | 646 / 230 / 78 / 34 / 6 | 711 / 321 / 117 / 49 / 27 | 802 / 181 / 50 / 24 / 9 |
| impulses with the lead offered | 286 (0.288) | 361 (0.295) | 187 (0.175) |
| not offered: no capture expected (fewer than 3 males) / timer energy ≤ 0.35 / rain / an ongoing hunt / no need / other | 621 / 77 / 10 / 0 / 0 / 0 | 733 / 126 / 5 / 0 / 0 / 0 | 737 / 122 / 17 / 2 / 1 / 0 |
| hunt draws (lead on the menu at an RG choice) | 286 | 361 | 187 |
| hunt draws won (hunts led) | 3 | 3 | 43 |
| hunts started (truth); per community-year | 3; 3.04 | 3; 3.04 | 43; 43.60 |
| hunts the temperature 0.164 would have started (Σ softmax probability); per community-year | 17.14; 17.38 | 20.34; 20.62 | 38.65; 39.19 |
| hunt draws by males in view (3 / 4 / 5 / 6+) | 178 / 68 / 34 / 6 | 187 / 104 / 45 / 25 | 124 / 35 / 23 / 5 |
| hunt's expected share of a carcass (captures ÷ n): mean | 0.298 | 0.291 | 0.301 |
| expected meat E (kcal): mean (10% / 90%) | 342 (230 / 383) | 333 (230 / 383) | 346 (230 / 383) |
| E capped by the need (share of draws) | 0.003 | 0.014 | 0.011 |
| time T (h): approach / chase / eating | 0.069 / 0.133 / 0.850 | 0.066 / 0.133 / 0.829 | 0.067 / 0.133 / 0.861 |
| meat energy per hour of the hunt E ÷ T (kcal/h) | 323 | 322 | 325 |
| his ripe-fruit rate R (kcal/h); meat-eating rate (kcal/h) | 435; 402 | 435; 402 | 434; 402 |
| r = E ÷ T ÷ R: mean (10% / 90%); ceiling R_meat ÷ R | 0.743 (0.691 / 0.781); 0.925 | 0.741 (0.692 / 0.778); 0.925 | 0.748 (0.688 / 0.784); 0.926 |
| hunger h; drive 1.6 h + 0.1 (mean) | 0.264; 0.523 | 0.291; 0.565 | 0.304; 0.843 |
| hunt's value = drive × r: mean (10% / 90%) | 0.390 (0.161 / 0.598) | 0.420 (0.213 / 0.642) | 0.631 (0.362 / 1.231) |
| best other option's published score: mean (10% / 90%) | 0.927 (0.430 / 1.497) | 0.994 (0.482 / 1.520) | 0.998 (0.430 / 1.557) |
| margin (best other − hunt), median; hunt rank in the menu, median; menu size | 0.437; 4; 7.5 | 0.505; 4; 7.5 | 0.285; 3; 7.3 |
| leaders' state at draws: reserves ÷ store, foregut fill, need (kcal) | -0.009 / 0.488 / 1308 | -0.009 / 0.442 / 1340 | -0.009 / 0.451 / 1276 |
| lost draws the hunt would win with (a) r at its ceiling / (b) drive 1.7 (h = 1) / (c) E not capped by the need / (d) value 1 | 0.032 / 0.795 / 0.000 / 0.615 | 0.036 / 0.729 / 0.000 / 0.545 | 0.146 / 0.653 / 0.000 / 0.417 |

A1: options that won the 144 lost draws (share; mean published score): patrol 0.24 (1.26), travel: joined trip 0.23 (1.35), travel: own trip 0.13 (0.64), nest 0.11 (1.52), feed: crown 0.06 (0.81), rest 0.06 (0.49), groom 0.03 (0.97), guard 0.03 (0.96), pant-grunt 0.03 (0.77), mate 0.02 (0.91), submit 0.01 (1.71), display 0.01 (0.57), call 0.01 (0.48), feed: fallback 0.01 (0.49), follow: party 0.01 (0.74); food options (crown, fallback, trips) 0.43

A1: hunts resolved 43, success 26/43, captures 26, kills per success 1.00, hunters in the pursuit 2.86 (listed 3.05), captures per hunter in the pursuit 0.174, leader's males in view {3: 34, 4: 5, 5: 4}
   meat kcal per animal-day by class: adolescentMale 5.1, adultMale 16.1, femaleLactating 0.3, femaleOther 0.0, infant 0.0, juvenile 0.6; adult males' meat: hunters 25841 kcal, other adult males 250 kcal
   adult males' daylight (mean of seeds): forage 0.329, rest 0.300, travel 0.139, nest 0.087, groom 0.079, guard 0.038, patrol 0.010, drink 0.004

A1: share of hunt draws the hunt would top (published score above the best other's) at m × its value: ×1: 0.225, ×1.25: 0.342, ×1.5: 0.476, ×2: 0.658, ×2.5: 0.786, ×3: 0.861; won in the run 0.230; under the temperature 0.207; offered draws per community-day 0.52

State at the draws (from the same JSON): draws the hunt won came from males with a fuller foregut (fill 0.741 against
0.364 at the draws it lost), the same hunger readout (0.287 against 0.309) and a larger deficit ratio (φ 0.715 against
0.390), at midday (mean hour 12.4 against 10.3); by adult males in view the hunt won 34 of 124 draws with 3, 5 of 35 with
4, 4 of 23 with 5, 0 of 5 with 6.

#### A1 result: quick sums and rows (e-bench `--quick`, b500cf8, `git.dirty` 0; against S22q and S22q1–3; `e4n_judge.py`)

```
  S22q: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q1: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q2: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q3: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  A1q: b500cf8 dirty 0 prescriptions 43 viability pass deaths 48: 3 {'respiratory illness (outbreak)': 3}; 7: 0 {}

quick, reference custom (4 runs), rows counted in all runs: fitted 14, held-out 10
  fitted             (14 rows) ref 1.59, 1.20, 1.69, 1.59 (mean 1.52, sd 0.22; used 0.69) | A1q.json: 1.28, Δ -0.24, z -0.3 (inside noise)
  held-out           (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 1.26) | A1q.json: 3.85, Δ +0.44, z +0.3 (inside noise)
  held-out w/o rare  (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 0.51) | A1q.json: 3.85, Δ +0.44, z +0.8 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:


| Reserves ÷ store, % per day (OLS) | S22q runs | S22q mean ± SD | A1q |
| --- | --- | --- | --- |
| adult male | +0.009 / -0.000 / +0.010 / +0.004 | +0.006 ± 0.005 | +0.013 (z +1.4) |
| female, other | +0.003 / +0.019 / +0.007 / -0.010 | +0.005 ± 0.012 | -0.023 (z -2.1) |
| female, lactating | +0.006 / -0.003 / -0.013 / +0.014 | +0.001 ± 0.012 | -0.010 (z -0.8) |
| juvenile 5–12 y | +0.004 / -0.009 / +0.009 / +0.015 | +0.005 ± 0.010 | +0.017 (z +1.0) |
| infant 2–5 y | +0.016 / -0.002 / -0.033 / +0.007 | -0.003 ± 0.021 | -0.152 (z -6.2) |
| infant 0.5–2 y | -0.006 / +0.010 / +0.014 / +0.022 | +0.010 ± 0.012 | -0.247 (z -19.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |

| Ground km / eating min / fruit share (energy-diagnose) | S22q runs | S22q mean ± SD | A1q |
| --- | --- | --- | --- |
| adult male: groundKm | 1.646 / 2.030 / 1.761 / 1.826 | 1.816 ± 0.161 | 1.917 (z +0.6) |
| adult male: eatingMin | 226.228 / 228.795 / 229.469 / 227.908 | 228.100 ± 1.402 | 231.748 (z +2.3) |
| adult male: fruitShare | 0.906 / 0.903 / 0.893 / 0.914 | 0.904 ± 0.009 | 0.873 (z -3.2) |
| female, other: groundKm | 1.071 / 1.483 / 1.370 / 1.454 | 1.345 ± 0.189 | 1.505 (z +0.8) |
| female, other: eatingMin | 229.294 / 231.502 / 229.376 / 231.298 | 230.367 ± 1.195 | 237.283 (z +5.2) |
| female, other: fruitShare | 0.591 / 0.665 / 0.653 / 0.643 | 0.638 ± 0.033 | 0.613 (z -0.7) |
| female, lactating: groundKm | 1.632 / 1.679 / 1.698 / 1.628 | 1.659 ± 0.035 | 1.851 (z +5.0) |
| female, lactating: eatingMin | 299.514 / 296.185 / 304.076 / 293.369 | 298.286 ± 4.605 | 303.655 (z +1.0) |
| female, lactating: fruitShare | 0.653 / 0.667 / 0.632 / 0.691 | 0.661 ± 0.025 | 0.645 (z -0.6) |
| juvenile 5–12 y: groundKm | 1.734 / 1.982 / 1.758 / 1.820 | 1.824 ± 0.112 | 2.058 (z +1.9) |
| juvenile 5–12 y: eatingMin | 282.357 / 276.603 / 278.817 / 274.942 | 278.180 ± 3.206 | 277.690 (z -0.1) |
| juvenile 5–12 y: fruitShare | 0.843 / 0.870 / 0.844 / 0.870 | 0.857 ± 0.015 | 0.881 (z +1.4) |

| Row (pooled) | S22q runs | S22q mean ± SD | A1q |
| --- | --- | --- | --- |
| T-ACT-1 | 0.374 / 0.369 / 0.372 / 0.378 | 0.373 ± 0.004 | 0.379 (z +1.4) |
| T-ACT-2 | 0.152 / 0.166 / 0.153 / 0.163 | 0.158 ± 0.007 | 0.165 (z +0.9) |
| T-ACT-3 | 0.094 / 0.094 / 0.107 / 0.093 | 0.097 ± 0.007 | 0.095 (z -0.3) |
| T-ACT-4 | 0.409 / 0.334 / 0.389 / 0.322 | 0.363 ± 0.042 | 0.381 (z +0.4) |
| T-PTY-1 | 3.661 / 4.088 / 4.532 / 3.995 | 4.069 ± 0.359 | 4.315 (z +0.6) |
| T-RNG-4 | 1.607 / 1.719 / 1.324 / 1.502 | 1.538 ± 0.168 | 1.448 (z -0.5) |
| T-HUN-1 | 0.000 / 4.033 / 0.000 / 0.000 | 1.008 ± 2.017 | 18.149 (z +7.6) |
| T-HUN-2 | — / 1.000 / — / — | 1.000 ± — | 0.625 (z +nan) |
| T-HUN-3 | 0.000 / 0.007 / 0.000 / 0.000 | 0.002 ± 0.003 | 0.018 (z +4.2) |
| T-FOOD-2 | 0.776 / 0.814 / 0.791 / 0.791 | 0.793 ± 0.016 | 0.765 (z -1.6) |
| T-FOOD-10 | 0.497 / 0.530 / 0.436 / 0.464 | 0.482 ± 0.041 | 0.464 (z -0.4) |
| T-IGE-1 | 8.982 / 3.032 / 1.532 / 9.240 | 5.697 ± 3.992 | 7.400 (z +0.4) |
| T-PAT-1 | 0.077 / 0.154 / 0.039 / 0.193 | 0.116 ± 0.070 | 0.115 (z -0.0) |
| T-PAT-6 | — / 0.200 / 0.167 / 0.143 | 0.170 ± 0.029 | 0.200 (z +0.9) |
| T-SOC-5 | 0.070 / 0.605 / 0.530 / 0.263 | 0.367 ± 0.247 | 0.483 (z +0.4) |
| T-SOC-9 | -0.057 / 0.143 / 0.080 / 0.062 | 0.057 ± 0.083 | 0.177 (z +1.3) |
```

The reserve and walking columns of A1q are not interpretable as the switch's effect: its seed-48 world drew a
respiratory outbreak on day 12 of the window (an adult male and two lactating females died), and the dead mothers'
infants (0.5–2 y and 2–5 y) then lost reserves (the pooled infant trajectory falls from day 12: −0.029 → −0.094 of the
store). A1r (registered above) re-draws it.

#### A1 result: hunt rows at 30 + 60 days (e-bench, b500cf8, `git.dirty` 0; `report.py hunt`, `hunt_sum.py`)

| row | H0 | H0r | A1h |
| --- | --- | --- | --- |
| commit (dirty) | ef07577 (0) | ef07577 (0) | b500cf8 (0) |
| seeds; burn-in + days | 48,7; 30 + 60 | 48,7; 30 + 60 | 48,7; 30 + 60 |
| truth hunts per seed (scorecard counts); per community-year | [0, 3]; 3.0 | [1, 2]; 3.0 | [17, 26]; 43.6 |
| hunts detected by the observer per seed | [0, 2] | [1, 0] | [10, 6] |
| T-HUN-1 pooled (per seed) [verdict] | 3.025 (0, 6.050) [inconclusive] | 2.022 (2.017, 2.028) [inconclusive] | 20.222 (18.250, 22.182) [pass] |
| T-HUN-2 pooled (per seed) [verdict] | 0 (—, 0) [fail] | 1 (1, —) [fail] | 0.625 (0.600, 0.667) [pass] |
| T-HUN-3 pooled (per seed) [verdict] | 0.004 (0, 0.008) [fail] | 0.004 (0.006, 0) [fail] | 0.017 (0.008, 0.026) [fail] |
| T-HUN-4 pooled (per seed) [verdict] | 6.071 (—, 4472.659) [fail] | 1.291 (1.239, —) [pass] | 1.760 (0.000, 10.191) [pass] |
| T-HUN-7 pooled (per seed) [verdict] | — (—, —) [insufficient] | 1 (1, —) [fail] | 1 (1, 1) [fail] |
| T-HUN-8 pooled (per seed) [verdict] | — (—, —) [insufficient] | 1 (1, —) [fail] | 1 (1, 1) [fail] |
| colobus encounters per 100 follow-h (T-HUN-3 part) | 8.45 | 9.00 | 7.77 |
| prescriptions | 43 | 43 | 43 |
| viability; deaths by cause | pass; 48: 0 {}; 7: 0 {} | pass; 48: 1 {'illness': 1}; 7: 0 {} | pass; 48: 8 {'respiratory illness (outbreak)': 7, 'orphaned infant, did not survive without its mother': 1}; 7: 0 {} |

```
rows scored in every run: ['T-HUN-1', 'T-HUN-2', 'T-HUN-3'] ; not scored somewhere: ['T-HUN-7']
  H0: T-HUN-1 0.099, T-HUN-2 1.667, T-HUN-3 0.131; sum 1.897
  H0r: T-HUN-1 0.149, T-HUN-2 0.667, T-HUN-3 0.132; sum 0.948
  A1h: T-HUN-1 0.000, T-HUN-2 0.000, T-HUN-3 0.095; sum 0.095
reference mean (first two runs) 1.422
```

#### A1r result: the re-draw (b500cf8 frozen, `git.dirty` 0; `e4n_judge.py`, `report.py`, `hunt_sum.py`)

No outbreak and no death in A1r's quick or 30 + 60-day runs.

```
  S22q: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q1: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q2: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  S22q3: ea794ff dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}
  A1q: b500cf8 dirty 0 prescriptions 43 viability pass deaths 48: 3 {'respiratory illness (outbreak)': 3}; 7: 0 {}
  A1rq: b500cf8 dirty 0 prescriptions 43 viability pass deaths 48: 0 {}; 7: 0 {}

quick, reference custom (4 runs), rows counted in all runs: fitted 14, held-out 10
  fitted             (14 rows) ref 1.59, 1.20, 1.69, 1.59 (mean 1.52, sd 0.22; used 0.69) | A1q.json: 1.28, Δ -0.24, z -0.3 (inside noise) | A1rq.json: 2.91, Δ +1.39, z +1.8 (inside noise)
  held-out           (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 1.26) | A1q.json: 3.85, Δ +0.44, z +0.3 (inside noise) | A1rq.json: 3.38, Δ -0.04, z -0.0 (inside noise)
  held-out w/o rare  (10 rows) ref 3.40, 2.84, 4.08, 3.33 (mean 3.41, sd 0.51; used 0.51) | A1q.json: 3.85, Δ +0.44, z +0.8 (inside noise) | A1rq.json: 3.38, Δ -0.04, z -0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-SOC-9   fitted   ref 0.28±0.47 | A1q.json 0.00 (pass) | A1rq.json 2.47 (fail)


| Reserves ÷ store, % per day (OLS) | S22q runs | S22q mean ± SD | A1q | A1rq |
| --- | --- | --- | --- | --- |
| adult male | +0.009 / -0.000 / +0.010 / +0.004 | +0.006 ± 0.005 | +0.013 (z +1.4) | +0.004 (z -0.3) |
| female, other | +0.003 / +0.019 / +0.007 / -0.010 | +0.005 ± 0.012 | -0.023 (z -2.1) | +0.006 (z +0.1) |
| female, lactating | +0.006 / -0.003 / -0.013 / +0.014 | +0.001 ± 0.012 | -0.010 (z -0.8) | -0.014 (z -1.2) |
| juvenile 5–12 y | +0.004 / -0.009 / +0.009 / +0.015 | +0.005 ± 0.010 | +0.017 (z +1.0) | +0.010 (z +0.5) |
| infant 2–5 y | +0.016 / -0.002 / -0.033 / +0.007 | -0.003 ± 0.021 | -0.152 (z -6.2) | -0.033 (z -1.3) |
| infant 0.5–2 y | -0.006 / +0.010 / +0.014 / +0.022 | +0.010 ± 0.012 | -0.247 (z -19.4) | -0.009 (z -1.4) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) | +0.000 (z +nan) |

| Ground km / eating min / fruit share (energy-diagnose) | S22q runs | S22q mean ± SD | A1q | A1rq |
| --- | --- | --- | --- | --- |
| adult male: groundKm | 1.646 / 2.030 / 1.761 / 1.826 | 1.816 ± 0.161 | 1.917 (z +0.6) | 1.748 (z -0.4) |
| adult male: eatingMin | 226.228 / 228.795 / 229.469 / 227.908 | 228.100 ± 1.402 | 231.748 (z +2.3) | 229.554 (z +0.9) |
| adult male: fruitShare | 0.906 / 0.903 / 0.893 / 0.914 | 0.904 ± 0.009 | 0.873 (z -3.2) | 0.885 (z -2.0) |
| female, other: groundKm | 1.071 / 1.483 / 1.370 / 1.454 | 1.345 ± 0.189 | 1.505 (z +0.8) | 1.307 (z -0.2) |
| female, other: eatingMin | 229.294 / 231.502 / 229.376 / 231.298 | 230.367 ± 1.195 | 237.283 (z +5.2) | 237.367 (z +5.2) |
| female, other: fruitShare | 0.591 / 0.665 / 0.653 / 0.643 | 0.638 ± 0.033 | 0.613 (z -0.7) | 0.627 (z -0.3) |
| female, lactating: groundKm | 1.632 / 1.679 / 1.698 / 1.628 | 1.659 ± 0.035 | 1.851 (z +5.0) | 1.693 (z +0.9) |
| female, lactating: eatingMin | 299.514 / 296.185 / 304.076 / 293.369 | 298.286 ± 4.605 | 303.655 (z +1.0) | 302.921 (z +0.9) |
| female, lactating: fruitShare | 0.653 / 0.667 / 0.632 / 0.691 | 0.661 ± 0.025 | 0.645 (z -0.6) | 0.639 (z -0.8) |
| juvenile 5–12 y: groundKm | 1.734 / 1.982 / 1.758 / 1.820 | 1.824 ± 0.112 | 2.058 (z +1.9) | 1.892 (z +0.5) |
| juvenile 5–12 y: eatingMin | 282.357 / 276.603 / 278.817 / 274.942 | 278.180 ± 3.206 | 277.690 (z -0.1) | 276.394 (z -0.5) |
| juvenile 5–12 y: fruitShare | 0.843 / 0.870 / 0.844 / 0.870 | 0.857 ± 0.015 | 0.881 (z +1.4) | 0.862 (z +0.3) |

| Row (pooled) | S22q runs | S22q mean ± SD | A1q | A1rq |
| --- | --- | --- | --- | --- |
| T-ACT-1 | 0.374 / 0.369 / 0.372 / 0.378 | 0.373 ± 0.004 | 0.379 (z +1.4) | 0.374 (z +0.1) |
| T-ACT-2 | 0.152 / 0.166 / 0.153 / 0.163 | 0.158 ± 0.007 | 0.165 (z +0.9) | 0.156 (z -0.3) |
| T-ACT-3 | 0.094 / 0.094 / 0.107 / 0.093 | 0.097 ± 0.007 | 0.095 (z -0.3) | 0.103 (z +0.8) |
| T-ACT-4 | 0.409 / 0.334 / 0.389 / 0.322 | 0.363 ± 0.042 | 0.381 (z +0.4) | 0.387 (z +0.5) |
| T-PTY-1 | 3.661 / 4.088 / 4.532 / 3.995 | 4.069 ± 0.359 | 4.315 (z +0.6) | 4.355 (z +0.7) |
| T-RNG-4 | 1.607 / 1.719 / 1.324 / 1.502 | 1.538 ± 0.168 | 1.448 (z -0.5) | 1.499 (z -0.2) |
| T-HUN-1 | 0.000 / 4.033 / 0.000 / 0.000 | 1.008 ± 2.017 | 18.149 (z +7.6) | 8.022 (z +3.1) |
| T-HUN-2 | — / 1.000 / — / — | 1.000 ± — | 0.625 (z +nan) | 0.400 (z +nan) |
| T-HUN-3 | 0.000 / 0.007 / 0.000 / 0.000 | 0.002 ± 0.003 | 0.018 (z +4.2) | 0.018 (z +4.0) |
| T-FOOD-2 | 0.776 / 0.814 / 0.791 / 0.791 | 0.793 ± 0.016 | 0.765 (z -1.6) | 0.796 (z +0.1) |
| T-FOOD-10 | 0.497 / 0.530 / 0.436 / 0.464 | 0.482 ± 0.041 | 0.464 (z -0.4) | 0.497 (z +0.3) |
| T-IGE-1 | 8.982 / 3.032 / 1.532 / 9.240 | 5.697 ± 3.992 | 7.400 (z +0.4) | 7.415 (z +0.4) |
| T-PAT-1 | 0.077 / 0.154 / 0.039 / 0.193 | 0.116 ± 0.070 | 0.115 (z -0.0) | 0.077 (z -0.5) |
| T-PAT-6 | — / 0.200 / 0.167 / 0.143 | 0.170 ± 0.029 | 0.200 (z +0.9) | 0.833 (z +20.7) |
| T-SOC-5 | 0.070 / 0.605 / 0.530 / 0.263 | 0.367 ± 0.247 | 0.483 (z +0.4) | 0.219 (z -0.5) |
| T-SOC-9 | -0.057 / 0.143 / 0.080 / 0.062 | 0.057 ± 0.083 | 0.177 (z +1.3) | 0.565 (z +5.4) |
```

In the quick group no rare row (T-HUN-4, T-BRD-1, T-IGE-3) is scored in every run, so the sums with and without them are
the same rows. A1rq's fitted sum rises through T-SOC-9 (reconciliation, distance 2.47: the observer's corrected
conciliatory tendency on 5 and 3 individuals, against 12 and 13 in A1q; truth reconciliations ÷ decided conflicts 0.19
and 0.08); without that row its fitted sum is 0.44. T-PAT-6 0.833 rests on few patrols (S22's own confirm read 0.808).

| row | A1q | A1rq |
| --- | --- | --- |
| commit (dirty) | b500cf8 (0) | b500cf8 (0) |
| seeds; burn-in + days | 48,7; 30 + 30 | 48,7; 30 + 30 |
| truth hunts per seed (scorecard counts); per community-year | [7, 12]; 38.5 | [5, 5]; 20.3 |
| hunts detected by the observer per seed | [4, 4] | [1, 4] |
| T-HUN-1 pooled (per seed) [verdict] | 18.149 (16.044, 20.278) [pass] | 8.022 (8.022, 8.022) [pass] |
| T-HUN-2 pooled (per seed) [verdict] | 0.625 (0.500, 0.750) [pass] | 0.400 (0, 0.500) [fail] |
| T-HUN-3 pooled (per seed) [verdict] | 0.018 (0.015, 0.022) [fail] | 0.018 (0, 0.031) [fail] |
| T-HUN-4 pooled (per seed) [verdict] | 1.176 (0.000, 6.091) [pass] | 3.807 (—, 37825067.694) [fail] |
| T-HUN-7 pooled (per seed) [verdict] | 1 (1, 1) [fail] | 1 (—, 1) [fail] |
| T-HUN-8 pooled (per seed) [verdict] | 1 (1, 1) [fail] | 1 (—, 1) [fail] |
| colobus encounters per 100 follow-h (T-HUN-3 part) | 7.21 | 7.41 |
| T-ACT-1 pooled [verdict] | 0.379 [pass] | 0.374 [pass] |
| T-ACT-2 pooled [verdict] | 0.165 [pass] | 0.156 [pass] |
| T-ACT-3 pooled [verdict] | 0.095 [fail] | 0.103 [fail] |
| T-ACT-4 pooled [verdict] | 0.381 [pass] | 0.387 [pass] |
| fitted / held-out sums (headline) | 1.53 / 4.19 | 3.94 / 6.88 |
| prescriptions | 43 | 43 |
| viability; deaths by cause | pass; 48: 3 {'respiratory illness (outbreak)': 3}; 7: 0 {} | pass; 48: 0 {}; 7: 0 {} |

Hunt rows at 30 + 60 days, both realizations:

| row | H0 | H0r | A1h | A1rh |
| --- | --- | --- | --- | --- |
| commit (dirty) | ef07577 (0) | ef07577 (0) | b500cf8 (0) | b500cf8 (0) |
| seeds; burn-in + days | 48,7; 30 + 60 | 48,7; 30 + 60 | 48,7; 30 + 60 | 48,7; 30 + 60 |
| truth hunts per seed (scorecard counts); per community-year | [0, 3]; 3.0 | [1, 2]; 3.0 | [17, 26]; 43.6 | [11, 24]; 35.5 |
| hunts detected by the observer per seed | [0, 2] | [1, 0] | [10, 6] | [5, 9] |
| T-HUN-1 pooled (per seed) [verdict] | 3.025 (0, 6.050) [inconclusive] | 2.022 (2.017, 2.028) [inconclusive] | 20.222 (18.250, 22.182) [pass] | 16.133 (10.027, 22.306) [pass] |
| T-HUN-2 pooled (per seed) [verdict] | 0 (—, 0) [fail] | 1 (1, —) [fail] | 0.625 (0.600, 0.667) [pass] | 0.429 (0.400, 0.444) [fail] |
| T-HUN-3 pooled (per seed) [verdict] | 0.004 (0, 0.008) [fail] | 0.004 (0.006, 0) [fail] | 0.017 (0.008, 0.026) [fail] | 0.038 (0.010, 0.058) [fail] |
| T-HUN-4 pooled (per seed) [verdict] | 6.071 (—, 4472.659) [fail] | 1.291 (1.239, —) [pass] | 1.760 (0.000, 10.191) [pass] | 3.759 (1.454, 173157.561) [fail] |
| T-HUN-7 pooled (per seed) [verdict] | — (—, —) [insufficient] | 1 (1, —) [fail] | 1 (1, 1) [fail] | 1 (1, 1) [fail] |
| T-HUN-8 pooled (per seed) [verdict] | — (—, —) [insufficient] | 1 (1, —) [fail] | 1 (1, 1) [fail] | 1 (1, 1) [fail] |
| colobus encounters per 100 follow-h (T-HUN-3 part) | 8.45 | 9.00 | 7.77 | 7.88 |
| prescriptions | 43 | 43 | 43 | 43 |
| viability; deaths by cause | pass; 48: 0 {}; 7: 0 {} | pass; 48: 1 {'illness': 1}; 7: 0 {} | pass; 48: 8 {'respiratory illness (outbreak)': 7, 'orphaned infant, did not survive without its mother': 1}; 7: 0 {} | pass; 48: 0 {}; 7: 0 {} |

```
rows scored in every run: ['T-HUN-1', 'T-HUN-2', 'T-HUN-3'] ; not scored somewhere: ['T-HUN-7']
  H0: T-HUN-1 0.099, T-HUN-2 1.667, T-HUN-3 0.131; sum 1.897
  H0r: T-HUN-1 0.149, T-HUN-2 0.667, T-HUN-3 0.132; sum 0.948
  A1h: T-HUN-1 0.000, T-HUN-2 0.000, T-HUN-3 0.095; sum 0.095
  A1rh: T-HUN-1 0.000, T-HUN-2 0.238, T-HUN-3 0.035; sum 0.273
reference mean (first two runs) 1.422
```

#### A1 against its registration (§6–§7)

- Truth: the hunt's mean value 0.63 (predicted 0.52–0.65: as predicted); draws won 23% (8–20%: missed, a little high);
  hunts 43.6 and 35.5 per community-year at 30 + 60 days, 38.5 and 20.3 in the quick windows (20–60: as predicted);
  success 0.60 (0.3–0.7: as predicted); one kill per success (1.0–1.3: as predicted); adult males eat 16.1 kcal of meat a
  day (≥ 10: as predicted).
- Hunt rows at 30 + 60 days: T-HUN-1 20.2 and 16.1 (12–40: as predicted; inside the registered 5–25, above the staged
  4–11); T-HUN-3 0.017 and 0.038 (0.02–0.07: missed low once); T-HUN-2 0.63 and 0.43 (0.3–0.7: as predicted); T-HUN-7
  1.0 (as predicted); T-HUN-8 1.0 (≥ 0.8: as predicted; above its band's top, 0.95); T-HUN-4 unresolved (1.76, 3.76).
- Quick sums: held-out (the same rows with and without the rare ones) z +0.3 / +0.8 and −0.0 / −0.1, fitted z −0.3 and
  +1.8: inside noise (as predicted). T-ACT-1..4 inside the group's spread in both (|z| ≤ 1.4; as predicted). Reserves
  (A1r): every class inside the group's spread (|z| ≤ 1.4; as predicted); A1q's infant losses follow the outbreak's two
  dead mothers on day 12, and its other females' (−0.023, z −2.1) are back inside the spread in A1r (+0.006). Prescriptions 43 (as predicted). Viability passes in all four runs.
- Not predicted: other females eat 7 minutes a day more in both realizations (237 against 230 ± 1 min, z +5.2 twice),
  adult males' fruit share falls (z −3.2, −2.0: meat in the diet); offered draws fall from 286–361 to 187 (fewer impulses
  with three or more adult males: 264 against 348–514; not tested); the hunt wins mostly at midday, from males whose
  foregut is full of fruit (fill 0.74 against 0.36 at the draws it loses) and whose deficit ratio is high (φ 0.72
  against 0.39), with the hunger readout no different (0.29 against 0.31).

### Verdict

- **Diagnosis (finding).** On S22 the stack's males lead 3 hunts per community-year in truth. 58–65% of hunt impulses
  carry only two adult males and the pursuit expects nothing of them (no offer); offered, the hunt is worth 0.39–0.42
  against 0.93–0.99 and tops the menu in 1% of draws. Its energy rate is right by the model's physics (r 0.74 of a
  ceiling of 0.925), and the binding term is the crowns' appetite weight it borrowed. S19's 13–19 hunts a year were the
  fitted temperature's chance picks (17–21 a year predicted from S22's own menus). The per-draw outcome is a knife-edge,
  so no design value for the debated non-energy reasons to hunt was built.
- **`huntDrive` 1 (iteration 1): a correction, recommended for a 5-seed confirm on the stack (S22 + `huntDrive` 1).**
  The lead weighed at the energy-deficit part of the E1e drive, without the distension satiation (a capture is held and
  eaten as the gut takes it; no new magnitude, removes no prescription): viable, every sum inside noise in two quick
  realizations, reserves inside spread, hunting rows closer to their bands at 30 + 60 days (T-HUN-1, -2, -3 summed 0.10
  and 0.27 against H0/H0r's 1.42); hunts 35–44 a year in truth, T-HUN-1 16–20, T-HUN-2 0.43–0.63. It meets every
  criterion of §7.
- **No second iteration.** What A1 leaves is outside its mechanism and has no source-based fix here: the pair limit of
  the pursuit (75% of A1's impulses carry two males; E4k's design ratio; Taï's lone hunters succeed 16%), T-HUN-3 below
  its band (the observer's colobus encounters are about twice Kanyawara's; E4f's staged scorer fixes), one kill per
  success (T-HUN-7; E4k), captors all adult males (T-HUN-8 1.0), the hand-set join value, and the field's surplus
  direction (gilbyWrangham2007), which `huntDrive` does not produce (φ is low in surplus).
- **Open.** Why chimpanzees hunt beyond energy (nutrients, sharing) has a direction and no magnitude in any source read;
  T-HUN-1 now sits above the staged 4–11 band (scaled to the model's males) while T-HUN-3 sits below its band: E4e's tie
  of the two rows through the encounter rate.
