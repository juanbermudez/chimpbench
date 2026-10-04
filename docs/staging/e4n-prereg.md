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
