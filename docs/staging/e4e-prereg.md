# E4e pre-registration: hunting from state (the hunt decided at the encounter by a value comparison)

Branch `e4e-hunting` from `track-e` 4c86404. Stage E4, third removal in the plan's order (`huntGapH`). Rules policy
only; development seeds 48 and 7; no run longer than 90 days in all. Started 2 October 2026, 04:32.

This file is written in steps, each committed before the step it governs: §1–§3 (problem, target audit, diagnosis
plan) before the diagnosis runs on unchanged code; §4–§8 (mechanism, readouts, arms, predictions, kill criterion)
before any run of changed code; every iteration in the run log (§9) before its run.

## 1. The problem

Hunting is opened by prescriptions (`src/sim/candidates.ts` `meatAndHunting`, the `hunt` offers at lines 826–835):

- a community-wide gap since the community's last hunt (`huntGapH` 6 h, design);
- a hunting-day lottery (`huntDay`, `huntDayPerMale` 0.0045 per adult male per day, design; `src/sim/tick.ts`
  `huntingDays`), not drawn in the field profile since the hunting fix (`huntEncounter` 1, field), which instead opens
  the option for one decision at a newly perceived colobus group with `huntEncMinMales` 2 adult males in view
  (`src/sim/perception.ts:270`);
- male-count minimums (`huntMinMales` 3 on a hunting day, `huntEncMinMales` 2 at an encounter);
- a timer-energy gate (`c.energy > 0.35`, a literal) and a rain gate (`rain < 0.3`, a literal);
- a hand-set lead value: `0.5 + 0.15·(males − 3) + 0.35·skill + 0.15·boldness − dist ÷ huntDistScaleM`.

On the reference stack R (handoff §3) the observer's T-HUN-1 is 39.7 hunts per community-year (5-seed confirm; band
5–25; all switches off, B: 26.8). The stack's spare time (feeding ends early) is the suspected cause, not yet shown.

## 2. Target audit (step 0; 2 October 2026, 04:34–04:50; written before anything is built or run)

### 2.1 What was opened

- **gilby2015** (Phil Trans R Soc B 370:20150005; PMC4633842). NCBI BioC: no result (not in the open-access subset);
  efetch db=pmc: metadata and abstract only ("The publisher of this article does not allow download"). Two routes, so
  the full text was **not re-read by this stage**. The figures below are as recorded from the earlier full-text reading
  (research.md "Hunting decision at colobus encounters"; realism-design.md T-HUN rows and source list, access FT;
  `src/field/metrics.ts` T-HUN-1 protocol). The abstract, read now, agrees: 70 years of data from three communities;
  impact hunters at Kasekela and Kanyawara; none in "the third, smaller community (Mitumba)", where hunting probability
  rose with the number of females present at an encounter.
- **wattsMitani2002** (Int J Primatol 23:1–28). OpenAlex: closed, no repository full text; the University of Michigan
  repository answered with a Cloudflare challenge, so that host was dropped. **Not verified by this stage**; values as
  recorded (realism-design.md source list, access FT).
- **mitaniWatts2001** (T-HUN-3's Ngogo row): not opened (time box). Values as recorded.
- Read from the earlier session's cache (a review, used for reasoning only, not for a value; added to research.md as
  `mitaniWattsMuller2002` in the addendum "E4e hunting from state", bibliography checked against Crossref): Mitani,
  Watts & Muller 2002, *Evolutionary Anthropology* 11:9–25. Its hunting section argues that at Ngogo males hunt when success is likely (large parties, many male
  hunters) and forgo most attempts in small parties; hunting rose when fruit was abundant, not when it was scarce.

### 2.2 Samples and methods of the rows this stage is scored on

| Row | Population, years | Sample | Method (as recorded) |
| --- | --- | --- | --- |
| T-HUN-1 hunts per community-year | Kanyawara 1996–2014 (224 months) | 194 red colobus hunts; mean 11.4 adult males; 2,461 colobus encounters at 3.73 per 100 follow-hours (≈ 66,000 follow-hours, derived) | all-occurrence hunts by the followed party; a hunt = a chase with at least one chimpanzee climbing toward a colobus (realism-design.md observer table). 194 ÷ 18.67 y = 10.4 per year (derived; per calendar year, i.e. 0.29 per 100 follow-hours) |
| T-HUN-1 (second row) | Ngogo 1995–1999 | ~24 adult males (26 in June 1998, mitaniWatts1999); 45.1 successful red colobus hunts per year (55.2 in 1998–99) | success 0.82 (67/82) → about 55 hunts per year (derived) |
| T-HUN-2 success | Kanyawara; Kasekela; Mitumba; Ngogo | 194; 1,498; —; 49 and 82 hunts | share of hunts with at least one capture: 0.613; 0.623; 0.532; 0.73–0.82 |
| T-HUN-3 hunted share of encounters | Kanyawara; Kasekela; Mitumba; Ngogo 1998–99 | 2,461; 2,316; —; 164 encounters | encounter = red colobus within 100 m (Kanyawara) or 50 m (Gombe) of the party at a 15-min scan: 0.079; 0.647; 0.480; 0.37 (61/164) |
| T-HUN-4 odds per male (held-out) | the three gilby2015 communities | as T-HUN-3 | logistic regression of hunting per encounter on adult males in the scan: +48%, +8%, +72% per male |

Hunters are adult and adolescent males (T-HUN-8: 0.86–0.90 of captors are adult males); no sex, reproductive-state or
mass restriction applies to the community samples. The model's observer follows parties (`party-larger`) and uses the
100 m radius in the field profile (`src/field/config.ts` `preyEncounterM` 100), method-matched to Kanyawara.

### 2.3 The scaling of T-HUN-1's band: unsound

- The band is 5–25 "per community-year (3–7 males)", basis "Kanyawara scaled" (realism-design.md T-HUN-1, written on
  28 September before the repository's history; no computation is recorded anywhere in the repository).
- Numerically it brackets the **unscaled** Kanyawara figure (10.4; the band's geometric centre is 11.2) and not a value
  scaled to 3–7 males. Any scaling by males goes the other way: hunting rises with males within sites (T-HUN-4,
  +48% odds per extra adult male at Kanyawara encounters) and across sites (Kanyawara 10.4 ÷ 11.4 = 0.91 hunts per
  adult male-year; Ngogo about 55 ÷ 24 = 2.3, derived).
- The model's communities (field profile, seeds 48 and 7, day 0) have **7, 4 and 3 adult males** (22, 15 and 12
  individuals), 4.7 on average: 0.41 of Kanyawara's 11.4.
- Linear scaling by adult males from the two Kibale sites gives **0.9–2.3 hunts per adult male-year, i.e. 4–11 per
  community-year at 4.7 adult males** (3 males: 2.7–6.9; 7 males: 6.4–16.1). Linear scaling is generous to the smallest
  communities, because per-encounter odds rise with males. Proposed as a staged row
  (`docs/staging/e4e-targets.patch.json`, T-HUN-1 revision, original kept under `revisions`); **not applied**. Under it,
  B (26.8) and R (39.7) are 2.4–3.6 times the top of the band, not 1.1–1.6.

### 2.4 The two rate rows are tied by the encounter rate

T-HUN-1 = (colobus encounters per follow-year) × T-HUN-3. Kanyawara: 132 encounters a year. The model's observer
records about 3 times Kanyawara's encounter rate per follow-hour (10.8 against 3.73 per 100 h; hunting-fix log, prey at
pre-decline Ngogo density, `colobusDensityPerKm2` 2.48 groups/km²). At that rate T-HUN-1 ≤ 11 needs T-HUN-3 ≲ 0.013,
below T-HUN-3's band (0.05–0.40): with either band, the two rows cannot both pass until the encounter rate is
resolved (an unmerged branch fits `preySightFactor` to Kanyawara encounters; outside this stage, not touched).
**Consequence for this stage:** the mechanism is a decision per encounter, so T-HUN-3 (hunted share of encounters) and
T-HUN-4 (more males, more hunting) are its primary readouts; T-HUN-1 is reported against both bands and is not a
target the mechanism is built toward. T-HUN-3 and T-HUN-4 are not rescaled (Mitumba, the smallest community, hunted
48% of its encounters). One caveat on T-HUN-3's band: it mixes encounter definitions (100 m in 15-min scans at
Kanyawara; Ngogo's definition is not recorded in the registry, and Gombe used 50 m), and a wider radius counts more
distant, less huntable groups. The observer is matched to Kanyawara's 100 m, so Kanyawara's 0.079 is the
method-matched value; no rescaling is proposed (no basis), but values near the band's top come from the Ngogo row.

## 3. Diagnosis (step 1; unchanged code, R and B; run before §4 was written)

Plan as registered: `scripts/e4e-hunt-diagnose.ts` (new, read-only; sim truth) on R and on B, seeds 48 and 7, 30-day
burn-in + 30 days, from a frozen checkout of 5923a07 (`git worktree add --detach`). Readouts, at every daylight decision
point of an adult male: an *encounter* is a colobus group in sight that was not the group he perceived at his previous
decision point (the hunting fix's definition, `perception.ts` metPrey); with at least `huntEncMinMales` (2) adult males
in view it is an *impulse*; whether the lead was *offered* (on his candidate list) or which gate held it (rain, timer
energy, `huntGapH`); whether he *chose* it; his state at the impulse; per hunt started, the leader's gate, males in
view and state; adult males' daylight time by action. Files: `artifacts/validation/e4e/diag/{R,B}-{48,7}.json`; table
printed by `artifacts/validation/e4e/diag_table.py` (pooled over both seeds; per-seed values joined by /).

| readout (truth) | B (all off) | R (stack) |
| --- | --- | --- |
| colobus encounters per community-day (adult males) | 5.23 | 5.59 |
| impulses (encounters with ≥ 2 adult males in view) per community-day | 1.63 | 2.4 |
| impulses ÷ encounters | 0.311 | 0.429 |
| impulses with ≥ 3 adult males in view | 0.218 | 0.396 |
| lead offered ÷ impulses | 0.904 | 0.706 |
| impulses held by `huntGapH` | 0.0751 | 0.255 |
| lead chosen ÷ offers | 0.102 | 0.193 |
| hunts per community-day | 0.128 | 0.256 |
| hunt score at offers (seed 48 / 7) | 0.395/0.357 | 0.434/0.431 |
| best other option's score at offers | 0.782/0.779 | 0.808/0.814 |
| hunger of males who chose the hunt / who did not | 0.333/0.285 vs 0.284/0.28 | 0.178/0.22 vs 0.218/0.24 |
| leaders' reserves ÷ usable store; foregut fill; need (kcal) | — (timers) | 0.0036/0.0013; 0.442/0.337; 472/779 |
| leaders' testosterone-like arousal | — | 0.0675/0.089 |
| adult males' daylight: forage, groom, rest, travel | 0.363, 0.103, 0.272, 0.135 | 0.252, 0.188, 0.272, 0.0854 |

Every hunt on both runs was opened by the encounter impulse (the lottery is not drawn in the field profile).

**What makes the stack hunt twice as often (truth 0.256 against 0.128 hunts per community-day):** spare time spent in
male company. R's adult males feed 11 points less of the daylight and groom 8.5 points more, so at a colobus encounter they
are more often with other adult males (impulses per encounter 0.43 against 0.31; three or more males 40% against 22%).
The hand-set lead value rises 0.15 per adult male above 3 (scores at offers 0.43 against 0.36–0.40), and each offer is
taken about twice as often (0.19 against 0.10). The gap (`huntGapH`) holds back a quarter of R's impulses and is the only brake. Encounters themselves differ
little (5.6 against 5.2 per community-day). R's leaders are *less* hungry than the males who let the hunt go: the lead
value ignores appetite, and a sated male's other options are worth less.

**Why T-HUN-1 fails on both (observer, the integrator's quick realizations at 612bf15):** the hunted share of
encounters is inside its band on R (T-HUN-3 0.108, 0.116, 0.104, 0.080) and on B (0.068, 0.056, 0.067, 0.023), while the
observer records 9.0–10.9 colobus encounters per 100 follow-hours against Kanyawara's 3.73 (§2.4). The excess of T-HUN-1
is mostly the encounter rate, which no decision rule inside T-HUN-3's band can absorb.

**Reference identity.** R's world at 5923a07 and at 612bf15 is hash-identical after 2 days on seeds 48 and 7
(`scratchpad/e4e/ident.mts`: 9deaf1df367a7d34, 51357e4fb3248108 at both), so the integrator's R quick realizations
(R-quick, NR1q–NR3q, `bench-run/artifacts/validation/e/noise/`) are this branch's reference. The same check is repeated
on the switch commit with the switch at 0.

## 4. Mechanism (switch `huntValue`, 0 = today; acts only with `energyLedger` 1 and `ledgerDrive` 1)

A hunt is food. At a colobus encounter (the hunting fix's impulse, unchanged) or on a field experiment's hunting day,
the lead is offered only when a capture can be expected, and it is scored exactly as a feeding trip to a crown is scored
in the model's own food currency (stage C13b `intakeValue`, the sim's own rates; [charnov1976]):

  worth = (1.6·h + 0.1) × r − d ÷ `forageDistScaleM`, with r = (E ÷ T) ÷ R_fruit

- h: the male's appetite now (`c.hunger`, the E1e drive × (1 − fill²)); 1.6 and 0.1 are the crown weights (design,
  `candidates.ts` `fw`), the crop-quality factor taken at 1.
- R_fruit: his own ripe-fruit intake rate in kcal/h (`intake.ts` `fruitRate` × `fruitKcalPerUnit`), as for a crown.
- E: the meat energy he can expect, capped at his energy need as a crown's bout is (`energy.ts` `energyNeed`):
  E = min(need, P_s(n) × q(n) × K), where
  - P_s(n) = `huntSuccessMax` × (1 − exp(−`huntSuccessRate` × (n − 1))) for n ≥ 2, else 0: the model's own resolution
    curve (`ecology.ts` `resolveHunt`; design), read as the hunter's expectation;
  - q(n) = 1/n + (1 − 1/n) × `huntExtraKillP`: his chance to hold meat after a success (the captor is drawn by skill and
    a hash, uniform in expectation; extra captures [M, derived]);
  - K = `meatKcalPerUnit` = 60 × `ledgerMeatKcalPerMin` ÷ `meatEatPerH` = 1,149 kcal (assumed; design): what a capture
    gives in the model;
  - n = adult males in view, himself included (design: the males he sees will join; joining is unchanged).
- T (h) = d ÷ `walkMps` + (`huntResolveMinMin` + `huntResolveSpanMin` ÷ 2) min + E ÷ (60 × `ledgerMeatKcalPerMin`):
  the approach, the expected chase until resolution (design), and the time to eat what he expects.
- Offered only if E > 0: fewer than two expected hunters cannot capture (the resolution's own rule).

At the model's values r is 0.43–0.54 for 2–7 males at 30–100 m (`scratchpad/e4e/vals.ts`; E 139–221 kcal): a hunt is
worth about half a ripe crown per hour. **Removed under the switch:** `huntGapH` (the community-wide 6 h gap) and the
hand-set lead value (0.5 + 0.15·(males − 3) + 0.35·skill + 0.15·boldness − d ÷ `huntDistScaleM`). **Not changed:** the
encounter impulse and `huntEncMinMales` (perception), joining an ongoing hunt (its hand-set value; out of scope), the
rain gate (< 0.3) and the timer-energy literal (`c.energy > 0.35`; inert on the stack by day: c.energy ≥ 0.997 at every
R impulse in §3), the success curve, the hunting-day lottery (not drawn in the field). **Not used, for lack of a
source:** the testosterone-like arousal (no source read links it to hunting decisions), injury risk (no field rate).
No new parameter beyond the switch.

Biological reading: meat is valued as food at the hunter's present appetite; a sated male weighs a hunt as he weighs a
crown. This is one first-principles reading of "value comparison", and it predicts the opposite of gilbyWrangham2007's
direct effect (more hunting when diet quality is high): here hunting can track fruit only through party size, as
mitaniWatts2001 explained Ngogo's pattern. That conflict is registered, not resolved; T-HUN-5 needs ≥ 6 months.

## 5. Readouts (defined before any arm; smoke-tested with the switch on, §9 run log)

Observer rows (e-bench; definitions from `src/field/metrics.ts`, written from gilby2015's Methods as recorded in §2):
- T-HUN-1: "hunts seen or heard by a following team ÷ community-days with a follow × 365"; part per 100 follow-hours.
- T-HUN-3: "colobus encounters = prey within the profile encounter distance of the focal party at a 15-min scan; share
  followed by an observed hunt on that group within 1 h"; part encounters per 100 follow-hours.
- T-HUN-4: "logistic regression of hunting per colobus encounter on adult males in the scan; odds ratio per male".
- T-HUN-2 (share of observed hunts with ≥ 1 capture), T-HUN-7 (captures per successful observed hunt).
Truth (`scripts/e4e-hunt-diagnose.ts`, §3 definitions): encounters, impulses and hunts per community-day; offered ÷
impulse; chosen ÷ offer; hunt score and the best other option's score at offers; hunger, reserves ÷ usable store,
foregut fill, need and arousal of males who chose the hunt and of those who did not; adult males' daylight by action.
"Hunters' reserves at hunt start" = the leader's reserves ÷ usable store when the hunt starts.

## 6. Arm and predictions (stated before any run of the changed model)

Arm **H1** = R + `huntValue` 1, `e-bench --quick` (seeds 48, 7; 30 + 30 days; `--workers 1` at load > 8) from a frozen
checkout, plus the diagnosis script on the same seeds. Judged against the mean of R's four quick realizations
(`judge_vs_reps.py quick R`; per-run SD fitted 0.69, held-out 1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the
reference's own spread if larger; |z| > 2 is a result).

Truth: offered ÷ impulse up from 0.71 to ≥ 0.9 (no gap); chosen ÷ offer down from 0.19 to ≤ 0.08; hunts per
community-day down from 0.256 to ≤ 0.13 (at least halved); males who choose the hunt hungrier than those who do not
(today the reverse).
Rows: T-HUN-3 down from the reference mean to 0.01–0.05 (expected to fail low); T-HUN-1 down to 8–25 (inside the old
band, likely above the staged 4–11); T-HUN-4 above 1 (each male in company has his own chance; r rises only from 0.48 to
0.53 between 2 and 4 males), not resolved at this length; T-HUN-2 and T-HUN-7: no prediction (success curve and joins
unchanged); every other row inside noise (hunting is about 0.1% of males' daylight).
Sums: fitted down (T-HUN-1's distance falls more than T-HUN-3's rises), |z| possibly below 2; held-out with and without
the rare rows inside noise. Prescriptions 103 → 102 (`huntGapH`). Viability passes.

## 7. Kill criterion

`huntValue` stays off (null, recorded) if viability fails, if held-out without T-HUN-4 and T-BRD-1 rises beyond noise
(z > +2 against R's mean), or if the prescription count does not fall. If hunting all but vanishes (truth hunts per
community-day < 0.03, pooled), the result is recorded as a finding (energy alone does not pay for a hunt at the model's
success curve), not a keep candidate. Otherwise: provisional keep candidate, to be confirmed (`e-bench --confirm`)
before any default changes.

## 8. Iterations and known defects

At most 3 iterations, each logged in §9 and committed before its run. Known defects deferred (not fixed here, outside
the decision): the success curve is a design curve that fails T-HUN-2 low (`src/sim/ecology.ts:73`; the hunter's
expectation inherits it); the join value is hand-set (`src/sim/candidates.ts:830`); the encounter rate is about 2.6 ×
Kanyawara's per follow-hour (§2.4; prey density and detection, outside this stage).

## 9. Results

### Run log (each entry written before its run)

- **S0 (smoke test and identity; before any arm).** Frozen checkout of 5ca5b3c. (1) Identity: R with `huntValue` 0,
  2 days, seeds 48 and 7 (`scratchpad/e4e/ident.mts`) must give §3's hashes. (2) Smoke: R + `huntValue` 1, seed 48,
  1-day burn-in + 2 days, `scripts/e4e-hunt-diagnose.ts`: every §5 truth readout is produced; leads are offered at
  impulses without the gap (`notOffered.gap` 0); offer scores are value scores (well below today's ~0.43).
- **H1 (iteration 1).** Frozen checkout of 5ca5b3c. `e-bench --quick --params R+{"huntValue":1} --workers 1 --out
  artifacts/validation/e4e/H1`, then `scripts/e4e-hunt-diagnose.ts` on seeds 48 and 7 (30 + 30 days) with the same
  parameters. Judged by §6–§7 against R-quick and NR1q–NR3q.

- **NRd (reference truth, unchanged code; logged about a minute after its launch, disclosed).** Frozen checkout of 5923a07: `scripts/e4e-hunt-diagnose.ts` on seeds 48 and 7
  with R's three re-draws (R + `rgTemperature` 0.1641, 0.1639, 0.16405, the integrator's NR1q–NR3q), so the truth
  readouts of the reference have a spread too (`artifacts/validation/e4e/diag/NR{1,2,3}q-*.json`).

- **H1c (confirm-length run of H1; same code, no new iteration; logged before its run).** The quick result passes the
  keep rule's legs (viable, held-out inside noise, count down) with a fitted gain inside noise (z −1.8), and the hunting
  rows are rare events a quick run cannot resolve, so: frozen checkout of 5ca5b3c, `e-bench --confirm --params
  R+{"huntValue":1} --workers 1 --out artifacts/validation/e4e/H1c` (seeds 48, 7, 21, 5, 11; 30 + 60 days = 90 days in
  all). Judged against R's four confirm realizations (`e1h-R` at 9392b67, `NR1c`–`NR3c` at 612bf15; identical simulation
  code per e-noise.md, and R is hash-identical here at switch 0): `judge_vs_reps.py confirm R`, per-run SD fitted 0.30,
  held-out 1.45, held-out without T-HUN-4 and T-BRD-1 0.21, or the reference's own spread if larger. Predictions as §6
  (T-HUN-3 below its band, T-HUN-1 lower than R's, held-out inside noise); a keep candidate needs held-out without the
  rare rows at z ≤ +2.

#### S0 result (5ca5b3c; generated by the scripts named, read from their output)

- Identity: R with `huntValue` 0 gives 9deaf1df367a7d34 (seed 48) and 51357e4fb3248108 (seed 7) after 2 days, as at
  612bf15 and 5923a07: the reference realizations stand.
- Smoke (`artifacts/validation/e4e/diag/S0-48.json`, copied from the scratch run): every §5 readout is produced; 13
  impulses, 13 offers (`notOffered.gap` 0), 1 chosen; mean offer score 0.109 against 1.033 for the best other option;
  2 hunts in 6 community-days. No error. H1 launched next.

#### H1 result: truth (5ca5b3c; `scripts/e4e-hunt-diagnose.ts`, seeds 48 and 7, 30 + 30 days; table printed by `artifacts/validation/e4e/diag_table.py` from `diag/{R,NR1q,NR2q,NR3q,H1}-{48,7}.json`; R and its three re-draws NRd on unchanged code)

| readout (truth, pooled seeds; per-seed values joined by /) | R | NR1q | NR2q | NR3q | H1 |
| --- | --- | --- | --- | --- | --- |
| encPerCD | 5.59 | 5.71 | 5.63 | 4.88 | 6.24 |
| epiPerCD | 2.86 | 2.98 | 2.78 | 2.74 | 3.28 |
| impPerCD | 2.4 | 2.36 | 2.45 | 1.87 | 2.63 |
| impShareOfEnc | 0.429 | 0.412 | 0.435 | 0.383 | 0.421 |
| impWith3plus | 0.396 | 0.377 | 0.444 | 0.338 | 0.368 |
| offeredPerImp | 0.706 | 0.693 | 0.705 | 0.798 | 0.939 |
| gapBlocked | 0.255 | 0.276 | 0.274 | 0.169 | 0.00634 |
| chosenPerOffer | 0.193 | 0.19 | 0.145 | 0.152 | 0.0315 |
| huntsPerCD | 0.256 | 0.239 | 0.217 | 0.2 | 0.0722 |
| huntsPerEpisode | 0.0895 | 0.0801 | 0.078 | 0.0729 | 0.022 |
| huntScore | 0.434/0.431 | 0.367/0.433 | 0.408/0.403 | 0.39/0.386 | 0.067/0.0448 |
| bestOther | 0.808/0.814 | 0.847/0.811 | 0.898/0.869 | 0.862/0.8 | 0.836/0.75 |
| hungerChosen | 0.178/0.22 | 0.129/0.182 | 0.13/0.197 | 0.21/0.144 | 0.212/0.117 |
| hungerNotChosen | 0.218/0.24 | 0.233/0.216 | 0.202/0.2 | 0.209/0.211 | 0.241/0.195 |
| resChosen | 0.0036/0.0013 | 0.0034/0.0028 | 0.0031/-0.0015 | 0.0037/0.0018 | 0.0014/0.0031 |
| fillChosen | 0.442/0.337 | 0.441/0.314 | 0.512/0.428 | 0.462/0.472 | 0.573/0.555 |
| needChosen | 472/779 | 557/633 | 574/766 | 556/596 | 605/309 |
| arousalChosen | 0.0675/0.089 | 0.0509/0.0186 | 0.0238/0.065 | 0.0579/0.0371 | 0.0518/0.0493 |
| forage | 0.252 | 0.252 | 0.254 | 0.255 | 0.258 |
| groom | 0.188 | 0.189 | 0.187 | 0.169 | 0.194 |
| rest | 0.272 | 0.283 | 0.279 | 0.279 | 0.281 |
| travel | 0.0854 | 0.0837 | 0.083 | 0.0874 | 0.0837 |
| hunt | 0.0013 | 0.00115 | 0.0012 | 0.00085 | 0.00045 |

(`gapBlocked` under H1 counts impulses whose lead was not offered within 6 h of a hunt for other reasons: an ongoing
hunt to join, or no energy need; the gap itself is not read.)

Against the registered truth predictions: offered ÷ impulse 0.71 → 0.94 (predicted ≥ 0.9: as predicted); chosen ÷
offer 0.19 → 0.032 (≤ 0.08: as predicted); hunts per community-day 0.256 → 0.072 (≤ 0.13: as predicted; the four reference realizations give 0.200–0.256); males
who chose the hunt hungrier than those who did not: **failed** (0.21/0.12 against 0.24/0.20; 14 chosen leads in all).
The reason is the competition, not the hunt's own value: a crown's worth rises with hunger about twice as fast as the
hunt's (its energy per hour is about twice the hunt's), so hunger favours feeding over hunting; sated males weigh
a hunt worth about 0.05 (mean offer score 0.045–0.067) against a best option worth 0.75–0.84 (most often grooming:
it wins 59 of 271 refused leads on seed 48 and 48 of 160 on seed 7, `winnerWhenNotChosen`), and the candidate jitter (±0.12) decides
most of the rare hunts. Encounters and impulses per community-day sit slightly above the four reference realizations (6.24 against
4.88–5.71; 2.63 against 1.87–2.45), possibly because fewer captures leave more colobus groups (not tested); adult
males' daylight is unchanged (forage 0.26, groom 0.19).

#### H1 result: benchmark (e-bench --quick, 5ca5b3c, `git.dirty` 0; against R-quick and NR1q–NR3q; tables printed by `artifacts/validation/e4e/report_table.py` and `judge_vs_reps.py` from the JSON)

rows counted in every run: 28 (fitted 16, held-out 12)
| readout | R (ref) | H1 |
| --- | --- | --- |
| enc/100h (obs) | 9.5 ± 0.42 (n 4) | 12 |
| T-HUN-3 share hunted | 0.102 ± 0.015 (n 4) | 0.0267 |
| T-HUN-1 | 45.6 ± 13 (n 4) | 14.2 |
| T-HUN-2 | 0.32 ± 0.1 (n 4) | 0.273 |
| T-HUN-4 | 1.92 ± 0.35 (n 4) | 2.27 |
| hunts/community-year (truth, e-bench) | 83.1 ± 8.9 (n 4) | 26.4 |
| prescriptions | 103 ± 0 (n 4) | 102 |
| viability | pass | pass |
| encounters/community-day (truth) | 5.45 ± 0.38 (n 4) | 6.24 |
| hunts/community-day (truth) | 0.228 ± 0.024 (n 4) | 0.0722 |
| leaders reserves/store (truth) | 0.00228 ± 0.001 (n 4) | 0.00225 |
| fitted sum (z) | 3.9 ± 0.84 (n 4) | 2.25 (z -1.8) |
| held-out sum (z) | 2.53 ± 0.35 (n 4) | 3.18 (z +0.5) |
| held-out w/o rare sum (z) | 2.29 ± 0.13 (n 4) | 2.56 (z +0.5) |

```
quick, reference R (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 5.13, 3.76, 3.42, 3.29 (mean 3.90, sd 0.84; used 0.84) | H1.json: 2.25, Δ -1.65, z -1.8 (inside noise)
  held-out           (12 rows) ref 2.48, 2.40, 2.23, 3.03 (mean 2.53, sd 0.35; used 1.26) | H1.json: 3.18, Δ +0.64, z +0.5 (inside noise)
  held-out w/o rare  (11 rows) ref 2.48, 2.24, 2.23, 2.21 (mean 2.29, sd 0.13; used 0.48) | H1.json: 2.56, Δ +0.26, z +0.5 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-1   fitted   ref 0.20±0.05 | H1.json 0.07 (fail)
   T-HUN-4   held-out ref 0.24±0.39 | H1.json 0.62 (fail)
```

Against the registered predictions: T-HUN-3 0.027 (predicted 0.01–0.05, failing low: as predicted); T-HUN-1 14.2
(predicted 8–25, inside the old band and above the staged 4–11: as predicted; per seed 28.4 and 0, so it rests on a
handful of observed hunts); T-HUN-4 2.27 (predicted above 1 and unresolved: above 1, and seed 7 is degenerate); fitted
sum −1.65 (z −1.8, inside noise; predicted down: as predicted); held-out +0.64 and without the rare rows +0.26 (both z
+0.5, inside noise: as predicted); prescriptions 103 → 102 and viability pass (as predicted). Not predicted: the
observer's colobus encounter rate rose to 12.0 per 100 follow-hours (reference 9.5 ± 0.4; truth 6.24 against
5.45 ± 0.38 per community-day), possibly because fewer captures leave more or calmer colobus groups (not tested); and
T-ACT-1 moved beyond 2 SD of the reference, toward its band (feeding share 0.319 against 0.289–0.310; males 0.308
against 0.270–0.296): males that hunt less feed more. Hunters' reserves at the start of a hunt are unchanged (0.0023 of
the usable store above the set point in both): leaders are at the set point, neither in surplus nor in deficit.

Hunts per impulse by adult males in view (truth; hunts with m males ÷ impulses with m males, from the diagnosis JSON;
printed by `artifacts/validation/e4e/males_gradient.py`): R's four realizations 0.087 (2 males, n 993), 0.121 (3, n 387), 0.140
(4, n 157), 0.156 (5, n 32); H1 0.030 (2, n 299), 0.023 (3, n 128), 0 (4, n 31), 0.067 (5, n 15). H1 loses the
per-decision gradient by males: in the model's own physics a male's expected meat is nearly flat in the hunters present
(success rises from 0.21 to 0.67 between 2 and 7 hunters while his chance to hold meat falls from 0.59 to 0.29), so any
"more males, more hunting" now comes only from more males each weighing the hunt. The field gradient (+48% odds per male
at Kanyawara) is stronger than that.

For the record, `e-bench --rescore H1.json --compare R-quick.json` (one reference run, the superseded single-reference
reading): fitted −2.69 on 18 rows scored in both; held-out +0.69 on 13 (+0.07 on 12 without T-HUN-4 and T-BRD-1).
R-quick is the reference realization with the highest fitted sum (5.13 of 3.29–5.13 on the common rows), so the mean of
four is the registered comparison.

Viability replay (e-bench stdout): no deaths; median adult hunger 0.18 in every run; median lactating hunger 0.52 and
0.53 against 0.47–0.51 in R's four realizations, slightly above their range (fewer captures, less meat begged; not
tested).

Quick reading under §7: viability passes, held-out without the rare rows is not up beyond noise, the count falls, and
hunting does not vanish (truth 0.072 hunts per community-day) — a provisional keep candidate on the keep rule's legs,
with T-HUN-3 turned from pass to fail. The confirm (H1c) decides.

#### H1c result: confirm (e-bench --confirm, 5ca5b3c, `git.dirty` 0; seeds 48, 7, 21, 5, 11, 30 + 60 days; against e1h-R and NR1c–NR3c; printed by `MODE=confirm report_table.py` and `judge_vs_reps.py confirm R`)

rows counted in every run: 31 (fitted 17, held-out 14)
| readout | R (ref) | H1c |
| --- | --- | --- |
| enc/100h (obs) | 9.49 ± 0.37 (n 4) | 10.1 |
| T-HUN-3 share hunted | 0.0687 ± 0.012 (n 4) | 0.0217 |
| T-HUN-1 | 38.4 ± 5.3 (n 4) | 9.73 |
| T-HUN-2 | 0.242 ± 0.04 (n 4) | 0.235 |
| T-HUN-4 | 2.09 ± 0.19 (n 4) | 2.09 |
| hunts/community-year (truth, e-bench) | 75.9 ± 7.2 (n 4) | 20.3 |
| prescriptions | 103 ± 0 (n 4) | 102 |
| viability | pass | pass |
| fitted sum (z) | 3.13 ± 0.3 (n 4) | 2.19 (z -2.8) |
| held-out sum (z) | 4.54 ± 1.8 (n 4) | 6.22 (z +0.9) |
| held-out w/o rare sum (z) | 2.57 ± 0.19 (n 4) | 3.02 (z +1.9) |

```
confirm, reference R (4 runs), rows counted in all runs: fitted 17, held-out 14
  fitted             (17 rows) ref 3.57, 3.09, 2.93, 2.93 (mean 3.13, sd 0.30; used 0.30) | H1c.json: 2.19, Δ -0.94, z -2.8 RESULT
  held-out           (14 rows) ref 6.92, 4.05, 2.69, 4.53 (mean 4.54, sd 1.76; used 1.76) | H1c.json: 6.22, Δ +1.68, z +0.9 (inside noise)
  held-out w/o rare  (12 rows) ref 2.77, 2.31, 2.63, 2.58 (mean 2.57, sd 0.19; used 0.21) | H1c.json: 3.02, Δ +0.45, z +1.9 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-ACT-3   fitted   ref 0.53±0.04 | H1c.json 0.42 (fail)
   T-BRD-1   held-out ref 1.59±1.55 | H1c.json 2.82 (fail)
   T-HUN-1   fitted   ref 0.67±0.27 | H1c.json 0.00 (inconclusive)
   T-HUN-4   held-out ref 0.39±0.25 | H1c.json 0.38 (inconclusive)
```

Per-row changes against the reference mean (distance, |Δ| > 0.02; same rows): T-HUN-1 −0.67 (9.73 per community-year,
inside both the registered 5–25 and the staged 4–11), T-ACT-3 −0.11, T-IGE-1 −0.09, T-HUN-8 −0.08, T-SOC-3 −0.07,
T-ACT-4 −0.06, T-ACT-1 −0.06, T-HUN-7 −0.05; against: T-BRD-1 +1.23 (rare), T-IGE-2 +0.28 (share of intergroup encounters
heard only, 1.0), T-RNG-5 +0.26, T-HUN-3 +0.08 (0.022, now below its band), T-SOC-6 +0.06, T-FOOD-5 +0.03, T-HUN-2 +0.02.
T-RNG-5 rises because nursing mothers range farther (1.67 km a day against 1.45–1.59; males 1.96 against 1.90–2.01),
and their median hunger sits at or above the top of R's per-seed range on three of five seeds (0.54, 0.59, 0.53, 0.56,
0.63 against 0.49–0.52, 0.53–0.55, 0.49–0.54, 0.54–0.61, 0.57–0.62); the route (less meat begged, or males that hunt
less crowding crowns) is not tested. Viability passes: one death (illness, seed 11), no starvation. Truth hunting falls
from 75.9 ± 7.2 to 20.3 hunts per community-year (−73%).

Against the H1c registration: T-HUN-3 below its band (as predicted), T-HUN-1 lower than R's (as predicted), held-out
inside noise (as predicted; without the rare rows z +1.9, just inside the registered +2).

### Verdict

- **Target audit (finding).** T-HUN-1's band was never scaled to the model's 3–7 males: it brackets Kanyawara's
  unscaled 10.4 hunts a year at 11.4 adult males, and every scaling by males lowers it. Staged correction 4–11
  (`docs/staging/e4e-targets.patch.json`), not applied. T-HUN-1 and T-HUN-3 are tied by the encounter rate.
- **Diagnosis (finding).** The stack hunts about twice as often as the all-off model because spare time puts adult
  males together at colobus encounters and the hand-set lead value rose 0.15 per male above 3; the 6 h gap was the only
  brake. T-HUN-1's excess over its band was mostly the encounter rate.
- **H1 `huntValue` (provisional keep candidate under the registered rule, with reservations).** Viable; prescriptions
  103 → 102; fitted −0.94 at confirm length (z −2.8, a result); held-out inside noise (z +0.9; without the rare rows
  +0.45, z +1.9). The gain is mostly T-HUN-1, and that pass is two errors cancelling: the observer meets colobus 2.7 ×
  as often per follow-hour as Kanyawara, and males now hunt 0.022 of encounters, 0.28 × Kanyawara's 0.079, so T-HUN-3
  turns from pass to fail. A pure energy value at the model's success curve also flattens the per-decision gradient by
  males, and the registered "hungrier males hunt" prediction failed (the competition, not the hunt's value, decides).
  Recommendation: keep it off by default until the colobus encounter rate is audited and resolved; then re-test, because
  only then can T-HUN-1 and T-HUN-3 judge the decision rather than each other.
- **Open.** The encounter rate (prey density and detection; the unmerged `preySightFactor` branch is fitted to
  Kanyawara and needs its own audit); the success curve (T-HUN-2 fails low, `ecology.ts:73`), which caps what any
  value comparison can expect; the stack's over-valued grooming, which out-competes hunting; gilbyWrangham2007's
  surplus effect, which an energy-only value cannot produce (registered conflict, §4).

#### Merge and final checks

`track-e` (23f189b: E1i, handoff, E4c confirm record) merged once, at 88a1cbf (conflicts: the switch list in
`tests/sim-track-e.test.ts`, union; `docs/research.md`, both addenda kept; `src/sim/params.gen.ts`, ours, regenerated).
R stays hash-identical at 2 days (seeds 48 and 7) with `huntValue` and the E1i switches at 0. At 02e7777: `gen-params
--check` clean, `tsc` clean, `pnpm test` 656 tests, 655 pass, 0 fail, 1 skipped; `git ls-files data/raw node_modules`
prints nothing. Prescription count (merged head): R 103, R + `huntValue` 102; with every switch off 135 either way (the
switch acts only with the ledger and its drive).
