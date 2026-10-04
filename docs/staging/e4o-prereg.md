# E4o pre-registration: three small rules (meat, guarding, mating)

Branch `e4o-small-rules` from `track-e` eea2d85. Track E, stage E4o. Rules policy only; development seeds 48 and 7; no
run longer than 90 days in all. Started 4 October 2026, 13:22.

Rule served: field values of behaviour are targets to benchmark against, never inputs. No value, bonus or weight is
added or tuned to reach a rate.

This file is written in steps, each committed before the step it governs: §0–§3 (problem, plan, rows and samples,
diagnosis plan) before the diagnosis runs on unchanged code; §5–§8 (mechanism, readouts, arms, predictions, kill
criterion) before any run of changed code; every iteration in the run log (§9) before its run.

## 0. The problem (from the brief; verified in §4)

Three counted prescriptions are still active on S27 (the best integrated candidate, 42 prescriptions;
`docs/staging/e-stack2-confirm.md` "S26 and S27 results"; `scripts/prescription-ledger.ts --count --params <S27>` and the
ledger's rows list all three):

| Entry (value; ledger class) | Where (eea2d85) | What it decides (as read from the code) |
| --- | --- | --- |
| `meatEatPerH` 0.35 units per eco-hour (design; "need timer", encodes T-ACT-1 by the ledger's rule) | `src/sim/life.ts:163–168` (needs), `src/sim/energy.ts:620` (`meatKcalPerUnit`), `src/sim/huntvalue.ts` (the hunt's expected meat) | a holder eats 0.35 of a carcass an hour while awake, as the gut takes it; one unit (one capture) is worth 60 × `ledgerMeatKcalPerMin` ÷ 0.35 = 1,149 kcal whatever the prey, takes 2.9 h to eat alone, and a share (0.2 units, `execution.ts:736`) is worth 230 kcal |
| `guardMaxAgeY` 12 y ([M] crockford2020, hobaiter2014, stanton2020; field copy) | `src/sim/candidates.ts:151–166` (`guardianOf`, `guarded`), `src/sim/conflict.ts:43` (`coalitionKin`) | the oldest ward whose seen guardian deters charges at it (−`guardDeterW` 0.3, −`guardFeedDeterW` on feeding supplants), the end of an adoptive caretaker's guardianship (defence, plant sharing, the follow) and of caretaker kinship in coalitions; a living mother is the guardian at any age |
| `mateIntervalH` 1.5 h (design; quota) | `src/sim/candidates.ts:1108, 1124`, `src/sim/execution.ts:589, 775, 787, 1174–1182` | a male may copulate again only 1.5 h after his last copulation (his mate offer, a female's offer to him, copulation in guarding, consorting and the mate act); a failed approach blocks him for 0.5 h; set so a maximally swollen female gets about one copulation an hour with ~7 males (its note: between Taï 0.14/h and Ngogo 3.5/h, sources not checked) |

Candidates from the brief (first principles, tested by the diagnosis before anything is built): a carcass's energy from
the prey's mass, its edible fraction and meat's energy density, shared by the existing holding, begging and sharing
code, the eating time following from mass ÷ eating rate; a guardian that defends while the ward cannot hold its own
against the threat (E4h's strength model and assessment), so the age limit follows from growth; copulation from the
male's state (E4a's testosterone-like state, a sourced post-copulatory refractory physiology) and the female's swelling
and proceptivity, without a quota. A rule that cannot be replaced on sources stays, recorded with why.

## 1. Plan

1. Sources and samples (§2): every row the stage is scored on, and the inputs each candidate needs (red colobus masses
   by age class and the edible share; chimpanzee male post-ejaculatory refractory physiology; copulation rates per
   swollen female-hour with their methods). BioC first, 2 routes or 10 minutes per source.
2. Diagnosis (§3, registered before its runs) on S27 with unchanged code, simulation truth, seeds 48 and 7, 30-day
   burn-in + 60 days: meat kcal per capture and per eater, eating time, sharing; guarding and defence by ward age and by
   the ward's strength against the threat; copulations per swollen female-hour and which constraint binds (the quota,
   the female's choice, distance, night).
3. One switch, `smallRules` (a bit per rule; 0 = today), only for what the diagnosis and the sources support.
4. Arms on S27 in quick mode against the integrator's S27q and its three `rngSalt` re-draws (bench-run3 28d249e); at most
   three iterations, each logged in §9 and committed before its run.

## 2. Rows scored, and their samples

Rows from `data/targets.json`, as recorded by the stages that audited them (cited); sources re-opened by this stage are
marked. No row measures kcal per carcass, guarding by ward age or copulation rates: they are reported as simulation
truth beside the readouts' sourced values (context, never summed).

| Row (role; band) | Source and sample (sex, reproductive state, mass, method) | Opened |
| --- | --- | --- |
| T-HUN-1 hunts per community-year (fitted; 5–25, a band of 4–11 staged) | gilby2015: Kanyawara 1996–2014, 194 hunts in 224 months, 11.4 adult males, encounters within 100 m in 15-min party scans; party follows; community counts (no sex, state or mass restriction); wattsMitani2002 Ngogo (closed, as recorded) | e4n-prereg §2.1 (FT at an earlier pass) |
| T-HUN-2 success, T-HUN-3 hunted share of encounters, T-HUN-7 kills per success (fitted) | gilby2015 Table 1; mitaniWatts1999 (Ngogo 1995–98, 49 hunts, 128 prey, FT); hunters adult and adolescent males | e4n-prereg §2.1, e4k-prereg §2.1 |
| T-HUN-4 (held-out, rare row), -5, -6, -8 | gilby2015 (logistic odds per male), gilbyWrangham2007, stanford1994 (abstract), mitaniWatts1999 Table 3 (86% of kills by adult males) | as recorded |
| T-HUN-9 meat sharing (held-out pattern, not summed) | wattsMitani2002 (Ngogo 1995–99: 15.2 adult males present, 8.7 ate meat; 12.1 individuals ate per hunt; closed, as recorded); samuni2018 (Taï 2013–15, 312 events: owners shared with 48% of adults present; with 62% of bond partners vs 35% of others) | as recorded |
| T-ACT-1..4 (fitted) | villioth2025 (Budongo Waibira 2016–17, 10 M and 9 F, 491 h continuous focal recording), uwimbabazi2019 (Kanyawara 2014–15, females, full-day focal follows; 14 nursing mothers per the field audit), amsler2010, potts2011: adult daytime activity shares, no mass | as recorded (e-field-audit.md) |
| T-SOC-5, T-SOC-10 (held-out; guarding can touch them) | kaburuNewtonFisher2015 (Sonso, 8 adult males, 1,109.5 h; Mahale M, 10 adult males); wittigBoesch2010 (Taï 1996–99, 18 individuals of both sexes, 876 conflicts) | e4h-prereg §3 |
| T-DEM-15, -16, -17, -24 (orphans; held-out, need years) | crockford2020 (Taï, sons orphaned at 4–12 y), stanton2020 (Gombe), hobaiter2014 (Sonso adoptions), nakamura2014 (Mahale) | not scorable under the 90-day cap (reported insufficient) |
| (context) copulation rate per male–female dyad-hour | **muller2007 (re-opened this stage, FT, author copy):** Kanyawara 1998–2005, 13 adult males and 15 parous females (long-term data); "Copulations, defined as mounting with intromission and pelvic thrusting, were recorded using all-occurrence sampling"; dyads "observed together for at least 25 h when the female was in oestrus" (oestrus = maximal swelling); per male, median copulation rates with the parous females he was more aggressive towards 0.064 ± 0.008 copulations per hour, less aggressive 0.03 ± 0.006 (Figure 2; n = 13 males, 2–14 females per male); parous females < 500 copulations per conception, nulliparous > 1,000 (Wrangham 2002 as cited) | FT this stage |
| (context) copulations per oestrous or maximally swollen female-hour | **gomesBoesch2009 (FT):** Taï South 2003–06, 5 adult males, 8 oestrous females; "data on copulations ... came from 3000 h of focal target follows" of females; "We observed a total of 262 copulations during the 1814 h that females were observed in estrous" (oestrus includes partial swelling): 0.14 per female-hour (the note's "Taï 0.14/h", verified), ~0.03 per adult male per oestrous female-hour (derived). **furuichiHashimoto2001 (FT, Japanese; figure readings [L]):** per adult female at maximal swelling 0.43/h (Kalinzu, 1997–98, 43 copulations), 0.79/h (Mahale, cited); per adult male 0.12/h (Kalinzu, 16 males), 0.20–0.22/h (Mahale, cited); 4.2–12.3 adult males per swollen female. Ngogo (watts2007, Abs): high and rising with the males present; "3.5/h" **not verified** | FT/Abs this stage (§2.1) |
| (context) energy of a capture | not computable: adult masses only (§2.1) | §2.1 |

### 2.1 What the source searches found (research.md "Addendum: E4o three small rules"; written after the searches, before §5)

- **Meat (`meatEatPerH`): the brief's candidate cannot be built on sources.** Adult red colobus masses are citable only
  secondarily (7.9–10.9 kg males, 6.7 kg females; sanders2003 citing Delson et al. 2000, [L]); no measured mass of an
  infant, juvenile or subadult red colobus was found in any reachable source, while immatures are 66% of Ngogo kills
  (mitaniWatts1999) and most kills at Gombe and Taï (boeschBoesch1989 Table 5); bugir2021's 75%-of-adult-female rule is a
  convention. Prey are eaten whole (an edible share of ~0.7–1.0: boeschBoesch1989, watts2008, newtonFisher2007, no mean);
  raw monkey meat is 112–118 kcal per 100 g (cawthornHoffman2015, [L]; the model's 115 is within it). Red colobus groups:
  42–48 animals, one counted group 41% non-adults, no split of the non-adults (miyamoto2013, mitani2000). So the edible
  energy of an average capture, or of a capture drawn from the group's composition, cannot be computed: the rule stays
  (as E4m found), and no bit is defined for it.
- **Mating (`mateIntervalH`): no refractory physiology exists in the reachable literature.** No measured
  post-ejaculatory refractory period or inter-copulation interval of male chimpanzees, wild or captive; captive males
  ejaculated hourly six times in a row, sperm per ejaculate falling from 1,278 to 587 × 10⁶ (marson1989, Abs, [M]);
  testosterone with cycling parous females goes with aggression, not sex (mullerWrangham2004b, FT); females rarely refuse
  (watts2022, Abs) and approach to copulate after a median 0.28 of male courtship sequences (robertsRoberts2015, FT). A
  physiological limit of an hour or less cannot set the field's 0.12–0.22 copulations per adult male-hour, so the brief's
  candidate (the male's state with a sourced refractory physiology) has no input: the rule stays, and no bit is defined
  for it (§4 names what it decides).
- **Protection (`guardMaxAgeY`):** no new source needed; the mechanism reads the model's own contest assessment (E4h).

## 3. Diagnosis plan (step 1; unchanged simulation code; written and committed before any run)

Tool: `scripts/e4o-diagnose.ts` (new, read-only; based on `e4m-diagnose.ts`). It reads the world after each tick and
calls only pure functions, plus four hooks that draw nothing and write nothing: `huntTap` (captures), `energyTap` (meat
kcal eaten, the ledger's own books), `rulesTap` (each rules decision's candidate list) and `quotaTrace`, to which this
stage adds the two mating gates (`'mate'`: a male's offer to a swollen female in range; `'mateF'`: a swollen female's
offer to a male, which the male's quota also gates), traced with the score the offer has or would have. The gates were
restructured so the score is computed when the trace is on even if the quota blocks; with the trace off the same offers
are made with the same scores: S27 seed 48 after 2 days hashes 6005ce06d37e5df1 at 13b0364 (before the hook) and at the
hooked code, with the hooks off and on.

Simulation truth, field profile, S27's parameters (`bench-run3/artifacts/validation/e/s27q/S27q-params.json`), seeds 48
and 7, 30-day burn-in + 60 days, one seed per process.

Readouts (each defined here before the first run):

- **Meat.** Per community meat episode (units held from 0 back to 0, as E4m): captures, meat kcal eaten (energyTap 'eaten',
  kind meat), kcal per capture, eaters (> 0.5 kcal) and kcal per eater, the captors' kcal, minutes from the first capture
  to the last unit, holder-minutes awake, gut-limited holder ticks (as E4m), meat shares (a share interaction whose giver
  held meat and whose receiver's meat rose) and their recipients, begs at a holder. Pooled: kcal per capture, median and
  mean kcal per eater.
- **Guarding.** Every charge or attack started inside a community: the target's age class and the charge's variant;
  whether the target's guardian qualifies for the deterrence test without the age limit (seen by the charger, within
  `defendRangeM` of the target, not dominated by it); whether the age limit made the difference (target ≥ 12 y); the
  target's assessed odds against the charger (E4h `assessOdds`, with `winOdds` beside it), by age class × odds class
  (< 0.1, 0.1–0.3, 0.3–0.5, 0.5–0.7, ≥ 0.7); the charges the age rule and an odds rule (odds < 0.5: the ward cannot hold
  its own) would treat differently. Defence charges (variant DEFEND) by ward age and by the ward's assessed odds against
  its aggressor. Ward-days with an adoptive caretaker by age.
- **Mating.** Copulations (interactions of kind `mate`), by the male's and the female's act at the tick's start, female
  initiative (her act was `mate` at him), swelling, the female's parity (as endocrine.ts: ≥ `endoParousAgeY` or a birth),
  daylight and hour. Female-hours at maximal swelling (swelling 1, the model's cycle phase between `cycleMaxDay` and
  `cycleMaxEndDay`; daylight > 0.1 separately) and at ≥ 0.75 (the offers' threshold). **Dyad-hours** (muller2007's
  denominator): an adult male (≥ 15 y) and an unrelated maximally swollen female of his community in the same party
  (`partyId`, the model's proximity chain), counted per tick; copulations per dyad-hour (pooled; and the median over dyads
  with ≥ 5 h together, a reduced version of muller2007's ≥ 25 h that 60 days allow). Intervals between a male's
  copulations and between a female's. At each rules decision with a mate gate traced in the same tick: blocked or open,
  the hours since the male's last copulation, the distance, night, and whether the offer's published score (its score plus
  the candidate jitter `offer()` adds, a hash) exceeds the decision's best published score ("would win"); the act that
  tops the list. Mate acts started and ended: copulated or not, and the partner's act at the end (refusal: flee, charge,
  attack, submit).
- **Context from the bench runs:** deaths by cause; reserves %/day by class; T-HUN-1..9 and T-ACT-1..4 (e-bench quick
  scorecards, the integrator's reference).

Runs (from a frozen detached checkout of the commit that adds this text, in my scratch directory): smoke (seed 48, 1 + 2
days: every readout produced; done at the hooked code, logged in the run log); **D0** = the tool on S27, seeds 48 and 7,
30 + 60 days; **D1–D3** = the same on S27 with `rngSalt` 1, 2, 3 (the parameters of the integrator's S27q1–S27q3), for the
spread of the truth readouts. The e-bench quick reference (S27q and its three re-draws) is the integrator's and is not
re-run.

### Run log (each entry written before its run, unless marked)

- **Smoke** (logged after the run, at the hooked code before this commit, scripts only beyond the hook): S27, seed 48,
  1 + 2 days: every readout produced (89 copulations, 0 captures, 0 guard-qualified charges in two days).
- **D0, D1–D3** (as registered above), from `scratchpad/e4o/frozen-d0` (the commit that adds this entry): seeds 48 then 7,
  one process at a time if the load is above 8, else two; outputs `artifacts/validation/e4o/D{0,1,2,3}-{48,7}.json`.
- **Readouts added after D0 and before any arm (disclosed; D0–D3 re-run as D0b–D3b, the tables use only these).** Reading
  D0 showed that the dyad readout counted the night: the field's denominator is observation hours, so a dyad's hours and
  copulations are now counted in daylight only (daylight > 0.1; copulations with a maximally swollen female and a male
  ≥ 15 y), and two readouts are added: muller2007's statistic in the reduced form 60 days allow (per adult male, the median
  of his dyadic rates over dyads with ≥ 5 daylight hours together, then the median over males), and a maximally swollen
  female's copulations per daylight hour by the adult males in her party (0, 1–2, 3–4, 5–6, ≥ 7; the party at the
  previous tick's end), the form in which party size enters field copulation rates. Simulation code unchanged
  (`scratchpad/e4o/frozen-d0b`, the commit that adds this entry); outputs `D{0,1,2,3}b-{48,7}.json`.

## 4. Diagnosis result (D0b–D3b: S27 and its three `rngSalt` re-draws, seeds 48 and 7, 30 + 60 days, 0.99 community-years each; printed by `artifacts/validation/e4o/diag_table.py` from the JSON)

```
| Readout (e4o-diagnose, seeds 48 + 7, 30 + 60 days) | D0b | D1b | D2b | D3b | ref mean ± SD |  |
| --- | --- | --- | --- | --- | --- |
| captures (2 seeds) | 27 | 36 | 17 | 30 | 27.500 ± 7.937 |  |
| carcass episodes | 24 | 33 | 17 | 29 | 25.750 ± 6.898 |  |
| meat kcal per capture | 1097 | 1127 | 1135 | 1103 | 1115 ± 18.092 |  |
| eaters per capture | 2.259 | 2.278 | 2.529 | 2.133 | 2.300 ± 0.166 |  |
| meat kcal per eater (episode mean) | 486 | 495 | 449 | 517 | 487 ± 28.502 |  |
| captor share of carcass kcal | 0.685 | 0.565 | 0.579 | 0.663 | 0.623 ± 0.060 |  |
| meat shares per capture | 2.037 | 2.583 | 2.412 | 1.800 | 2.208 ± 0.355 |  |
| begs per capture | 4.370 | 6.028 | 4.353 | 3.333 | 4.521 ± 1.115 |  |
| holder-min awake per capture | 169 | 173 | 173 | 175 | 172 ± 2.667 |  |
| min capture to last unit (median) | 106 | 103 | 102 | 109 | 105 ± 3.272 |  |
| gut-limited share of holder ticks | 0.120 | 0.117 | 0.110 | 0.172 | 0.130 ± 0.029 |  |
| charges and attacks (2 seeds) | 4705 | 4691 | 4498 | 4251 | 4536 ± 212 |  |
| guard-qualified charges | 109 | 127 | 91 | 80 | 102 ± 20.646 |  |
|   age limit decides (target >= 12 y) | 78 | 71 | 60 | 57 | 66.500 ± 9.747 |  |
|   deterred, age rule (< 12 y) | 31 | 56 | 31 | 23 | 35.250 ± 14.338 |  |
|   deterred, odds rule (odds < 0.5) | 57 | 84 | 54 | 47 | 60.500 ± 16.217 |  |
|   young but holds its own | 2 | 12 | 1 | 3 | 4.500 ± 5.066 |  |
|   12+ y and cannot hold its own | 28 | 40 | 24 | 27 | 29.750 ± 7.042 |  |
| defence charges | 10 | 15 | 15 | 21 | 15.250 ± 4.500 |  |
|   ward holds its own (odds >= 0.5) | 7 | 11 | 13 | 16 | 11.750 ± 3.775 |  |
| caretaker ward-days | 0 | 0 | 0 | 0 | 0 ± 0 |  |
| copulations (2 seeds) | 2764 | 2955 | 2578 | 2543 | 2710 ± 190 |  |
| copulations per max-swollen female daylight hour | 0.935 | 0.974 | 0.994 | 0.976 | 0.970 ± 0.025 |  |
| copulations per adult male-swollen female dyad-hour (all h) | 0.304 | 0.314 | 0.302 | 0.299 | 0.305 ± 0.006 |  |
| copulations per dyad daylight hour | 0.584 | 0.599 | 0.604 | 0.591 | 0.594 ± 0.009 |  |
| copulations per parous dyad-hour (all h) | 0.298 | 0.326 | 0.321 | 0.307 | 0.313 ± 0.013 |  |
| dyad rate median (>= 5 daylight h together), seed mean | 0.577 | 0.610 | 0.599 | 0.593 | 0.595 ± 0.014 |  |
| per-male median of dyadic rates (muller2007 form), seed mean | 0.586 | 0.611 | 0.597 | 0.590 | 0.596 ± 0.011 |  |
| rate per max-swollen female daylight h, 0 adult males in party | 0.055 | 0.067 | 0.059 | 0.075 | 0.064 ± 0.009 |  |
| rate per max-swollen female daylight h, 1-2 adult males in party | 0.955 | 0.954 | 0.962 | 0.998 | 0.967 ± 0.021 |  |
| rate per max-swollen female daylight h, 3-4 adult males in party | 2.115 | 2.251 | 2.216 | 2.039 | 2.155 ± 0.097 |  |
| rate per max-swollen female daylight h, 5-6 adult males in party | 2.967 | 3.033 | 3.103 | 2.962 | 3.016 ± 0.066 |  |
| rate per max-swollen female daylight h, 7+ adult males in party | 3.708 | 4.211 | 3.719 | 3.267 | 3.726 ± 0.385 |  |
| max-swollen female daylight h, 0 adult males in party | 733 | 767 | 630 | 755 | 721 ± 62.307 |  |
| max-swollen female daylight h, 1-2 adult males in party | 1181 | 1263 | 991 | 891 | 1082 ± 171 |  |
| max-swollen female daylight h, 3-4 adult males in party | 397 | 407 | 372 | 409 | 396 ± 17.155 |  |
| max-swollen female daylight h, 5-6 adult males in party | 71.446 | 81.763 | 73.796 | 94.879 | 80.471 ± 10.572 |  |
| max-swollen female daylight h, 7+ adult males in party | 2.967 | 9.500 | 4.033 | 15.917 | 8.104 ± 5.943 |  |
| male intervals 1.5-1.6 h share | 0.258 | 0.253 | 0.228 | 0.247 | 0.247 ± 0.013 |  |
| male interval median (h), seed mean | 2.077 | 2.076 | 2.190 | 2.157 | 2.125 ± 0.057 |  |
| copulations in guarding | 604 | 556 | 424 | 471 | 514 ± 81.267 |  |
| copulations in a male mate act | 954 | 1127 | 1031 | 922 | 1008 ± 91.289 |  |
| female-initiated copulations | 578 | 697 | 549 | 539 | 591 ± 72.739 |  |
| male gate: decisions | 56021 | 60213 | 53928 | 53425 | 55897 ± 3089 |  |
|   blocked by the quota | 39731 | 42743 | 38076 | 37932 | 39620 ± 2236 |  |
|   blocked and would top the list | 14288 | 15537 | 13416 | 13522 | 14191 ± 978 |  |
|   open and on top | 2543 | 2846 | 2680 | 2535 | 2651 ± 146 |  |
|   open, not on top | 13747 | 14624 | 13172 | 12958 | 13625 ± 745 |  |
|   at night | 763 | 768 | 750 | 774 | 764 ± 10.210 |  |
| female gate: decisions | 25698 | 28407 | 24890 | 24632 | 25907 ± 1728 |  |
|   blocked by the male quota | 16576 | 18374 | 15655 | 15839 | 16611 ± 1241 |  |
|   blocked and would top the list  | 5150 | 5632 | 4475 | 4597 | 4964 ± 534 |  |
| mate acts (male) / copulated | 1245 / 954 | 1408 / 1127 | 1342 / 1031 | 1190 / 922 | — |  |
| mate acts (female) / copulated | 582 / 580 | 704 / 700 | 559 / 554 | 546 / 540 | — |  |
| mate acts ended with partner refusing | 30 | 18 | 24 | 18 | 22.500 ± 5.745 |  |
```

Pooled over the eight seed-runs, the charges the age limit touched were REDIRECT 150, COALITION 58, FEED 54, TENSION 1,
COUNTER 1, DEFEND 2 (266 of 18,145 charges and attacks, 1.5%); COALITION, COUNTER and DEFEND charges do not read the
deterrent, so the limit changed the score of 205 (1.1%), by `guardDeterW` 0.3 (or `guardFeedDeterW` on feeding
supplants). Qualifying chargers: 333 females, 74 males.

**What each entry decides (with numbers):**

- **`meatEatPerH` sets the energy of every capture and its eating time.** K = 1,149 kcal per capture (1,115 ± 18 eaten
  per capture, the rest lost to the 0.005-unit floor), eaten at the sourced rate (402 kcal/h), so 172 ± 3 holder-minutes
  awake and 105 ± 3 min (median) from capture to the last unit; the captor eats 0.62 ± 0.06 of it, 2.2 ± 0.4 shares of
  0.2 units (230 kcal each) and 4.5 ± 1.1 begs per capture leave 2.3 ± 0.2 eaters and 487 ± 29 kcal per eater; the gut
  limits 13% of holder ticks. The same K caps the hunt's value (E = min(need, expected share × K); E4m: binding in every
  valuation). Field context (§2.1): prey are eaten whole, ~10 eaters per kill at Taï (boeschBoesch1989), immatures in 48
  min and adults in 141; the observer's T-HUN-9 share of adults present who eat is 0.15–0.27 in the S27q runs (field
  about half). The replacement needs immature colobus masses: not found (§2.1). **Stays.**
- **`guardMaxAgeY` trims.** Of 4,536 ± 212 charges and attacks per realization, a guardian (always a mother: no adoptive
  caretaker in eight seed-runs) qualified for the deterrence test in 102 ± 21 (2.2%); the age limit removed it from
  66.5 ± 9.7, almost all at 12–15-year-olds, and changed the score of 1.1% of all charges. Defence charges are rare
  (15 ± 4.5 per realization; by ward age 5–8 y 3.0 ± 2.2, 8–12 y 1.0 ± 1.4, 12–15 y 8.2 ± 1.0, 15–20 y 1.8 ± 1.7,
  ≥ 20 y 1.0 ± 1.4; corrected before A1's results were read: an earlier draft said "wards 8–15 y", from D0 alone) and 77% of them (11.8 ± 3.8) defend a ward that holds its own against its aggressor (assessed
  odds ≥ 0.5). An odds rule (the ward cannot hold its own: assessed odds < 0.5) would deter 60.5 ± 16 of the qualified
  charges instead of 35 ± 14 under the age rule: it adds 12–15-year-olds who cannot hold their own (29.8 ± 7) and drops
  under-12s who can (4.5 ± 5.1). **Replaced (bit 2, §5)**: no new magnitude, and the age at which protection ends
  follows from the growth curve of the model's strength.
- **`mateIntervalH` sets the copulation rate.** 2,710 ± 190 copulations per realization; 0.97 ± 0.03 per maximally
  swollen female-hour of daylight; 0.59 ± 0.01 per adult male–swollen female dyad-hour together in daylight (per-male
  median of dyadic rates 0.60 ± 0.01). The rate is the quota's: a female's rate is ~0.6 per adult male in her party at
  every party size (0.97 ± 0.02 with 1–2 males, 2.16 ± 0.10 with 3–4, 3.02 ± 0.07 with 5–6, 3.7 ± 0.4 with ≥ 7); 25 ± 1%
  of a male's intervals end within 0.1 h of the quota (1.5–1.6 h; median 2.1 h); at the decisions of a male with a
  swollen female in range the quota blocked 71% (39,620 ± 2,236 of 55,897 ± 3,089), and in 14,191 ± 978 of them the mate
  offer would have topped every option, against 2,651 ± 146 in which an open offer did: without the quota males would
  choose to mate about six times as often. The female's choice barely binds (22.5 ± 5.7 mate acts ended by her refusal;
  591 ± 73 copulations she initiated); night never (no copulation at night); distance only through the offers' range
  (median 2.5–2.8 m when traced). Against the field (§2, §2.1): the dyadic rate is 10–20× Kanyawara's (0.03–0.064 per
  hour together, muller2007) and Taï's (~0.03, derived from gomesBoesch2009); the per-female rate is above Taï's 0.14,
  Kalinzu's 0.43 and Mahale's 0.79 with fewer males present (most maximally swollen female-hours have 0–2 adult males in
  the party); per adult male, 0.12 copulations per daylight hour (D0b: 0.14 seed 48, 0.09 seed 7; adult males ≥ 15 y,
  10,548 daylight male-hours per seed, counted by `scratchpad/e4o/malehours.mts` on the same worlds), at the field's level
  (Kalinzu 0.12, Mahale 0.20–0.22): two errors cancel, males are rarely with a swollen female and copulate at the quota's
  rate when they are. The quota stands in for what limits copulation in the wild (who is in the party, competition, female
  choice), not for a physiology: captive males ejaculate hourly (marson1989). The replacement the brief names (a sourced
  refractory physiology) has no input (§2.1). **Stays.**

## 5. Mechanism: `bodyRules` (one switch, a bit per rule; 0 = today)

**Bit 2: protection follows the ward's own strength** (`src/sim/candidates.ts` `guarded`, `wardHoldsOwn`, `guardianOf`,
the defence charge; `src/sim/conflict.ts` `coalitionKin`). A ward holds its own against a threat when its assessed
chance against that animal is at least even: `assessOdds(ward, threat)` ≥ 0.5 (E4h: strength from the growth curve with
condition and wounds, the supporters charging on each side, and, where the two keep a dominance relationship, the
remembered Elo relationship as the prior). With the bit:
- the guardian presence test has no age limit: a seen guardian within `defendRangeM` of its ward, not dominated by the
  charger, deters the charger (−`guardDeterW`, −`guardFeedDeterW` on feeding supplants) while the ward cannot hold its
  own against that charger;
- a guardian's defence charge at its ward's aggressor is offered while the ward cannot hold its own against that
  aggressor (today: always, for a mother at any age);
- an adoptive caretaker stays the guardian and coalition kin at any age, as a mother does (what the protection covers is
  decided threat by threat).
No new parameter; the even point is the definition of "more likely to lose than to win" (design). `guardMaxAgeY` is not
read; the ledger switches it out (42 → 41 on S27). Switch 0 hash-identical (S27 seed 48, 2 days, 6005ce06d37e5df1; the
field pin and the goldens in `pnpm test`). Tests: `tests/sim-body-rules.test.ts`.

**Bits 1 (meat) and 4 (mating) are not defined** (§2.1, §4): no measured immature red colobus mass, and no measured
refractory physiology of male chimpanzees. A replacement for the mating quota would need a value of copulation in the
model's own currency (the share of paternity a copulation adds to a cycle's conception), a mechanism beyond this stage.

**Known defects deferred (file:line at this commit; the code under test is the guarding code, which they do not touch):**
`src/sim/ecology.ts` resolveHunt (`captor.carryingMeat = 1` and the extra captures) overwrites meat a captor already
holds; `src/sim/execution.ts` share (`o.carryingMeat = clamp(...)`) loses meat above one unit; the female's mate offer
(`candidates.ts` reproduction, `time - x.lastMate > 0.3`) carries an unregistered 0.3-h quota and `mateTick`
(`execution.ts` mateTick) a 0.5-h block after a failed approach, both tied to the mating quota.

## 6. Readouts (defined before any arm; the guarding readouts smoke-tested with the switch on, run log)

- Simulation truth from `scripts/e4o-diagnose.ts` (§3 definitions, unchanged; 30 + 60 days, seeds 48 and 7), against
  D0b–D3b (mean ± SD): guard-qualified charges by age and odds class; the deterred count under the odds rule; charges at
  12+ y that cannot hold their own (started); defence charges and those for wards that hold their own; the meat and
  mating readouts (untouched mechanisms, reported).
- `e-bench --quick` (seeds 48, 7; 30 + 30 days): fitted and held-out sums against S27q and its three re-draws
  (`judge_vs_reps.py quick custom`, amendment 2; with and without T-HUN-4, T-BRD-1, T-IGE-3); T-SOC-5, T-SOC-9, T-SOC-10;
  T-HUN-1..9; T-ACT-1..4; prescription count; viability and deaths by cause. `energy-diagnose` (seeds 48, 7; 30 + 30):
  reserves ÷ store %/day by class (`artifacts/validation/e4o/judge_e4o.py`, the integrator's judge_s27q.py with the arms
  passed in). `rhythm-metrics` (seeds 48, 7; 30 + 30): adults out of a nest share of the night, T-RHY-5.

## 7. Arms

- **A1** = S27 + `bodyRules` 2. `e-bench --quick` and `energy-diagnose` exactly as the integrator ran S27q
  (`scratchpad/integrator/s27q.sh`: workers 2 below load 8, else 1), `e4o-diagnose` (30 + 60, both seeds) and
  `rhythm-metrics`, from a frozen detached checkout of the commit that registers A1's run in §9 (`scratchpad/e4o/run-arm.sh`).
  Judged against S27q, S27q1, S27q2, S27q3 (bench-run3 28d249e) and D0b–D3b.

## 8. Predictions and kill criterion (A1 against the S27 group; moderate confidence unless stated)

| Quantity | Prediction |
| --- | --- |
| Prescription count | 42 → 41 (high) |
| Defence charges for a ward that holds its own | 0 (by construction, high) |
| Defence charges | ≤ 6 (D group 15 ± 4.5; the 77% for wards that hold their own go) |
| Charges started at 12+-year-olds with a qualifying guardian, who cannot hold their own | below the D group's 29.8 ± 7 (low: the deterrent lowers a score by 0.3, it does not forbid) |
| Charges and attacks; copulations; captures; meat per capture | inside the D group's spread (no other mechanism changes) |
| T-SOC-5, T-SOC-9, T-SOC-10 | inside the S27q group's spread (low) |
| Reserves %/day by class | inside the S27q group's spread (high) |
| Fitted, held-out, held-out without the rare rows | inside noise (\|z\| ≤ 2) |
| Viability; night (adults out ≤ 3.3% of the night, T-RHY-5 ≤ 0.033) | pass (high) |

**Kill criterion** (the switch stays off and the result is recorded as a null): viability fails (a starvation death the
reference does not have, or a seed below 80% of its start); held-out without the rare rows worse beyond noise (z > +2);
the prescription count does not fall by 1; any defence charge for a ward that holds its own (the mechanism does not act);
night unsafe.

## 9. Run log (each entry written before its run)

- **Smoke, switch on** (to run at the commit that adds this text, before A1): S27 + `bodyRules` 2, seed 48, 1 + 2 days
  with `e4o-diagnose`: every readout produced, no defence charge for a ward that holds its own.
- **Smoke result** (logged after the runs, at da0759f): seed 48, 1 + 2 days, and seed 7, 1 + 12 days: every readout
  produced; one guard-qualified charge (a ward of 8–12 y that cannot hold its own), no defence charge; prescription count
  41. A1 runs from the next commit (this note only).
- **A1** (as registered in §7): from `scratchpad/e4o/frozen-a1` (the commit that adds this entry), `run-arm.sh frozen-a1
  A1 '{"bodyRules":2}'`; outputs `frozen-a1/artifacts/validation/e4o/A1*`.
- **A1 note** (logged after the run): bench 14:00–14:06 (1 worker, load 9–24 from other applications), energy
  14:06–14:10, diagnosis 14:10–14:12, rhythm 14:12–14:14; `frozen-a1` at a3283ca, clean (`git.dirty` 0).
- **Readout correction after A1, before its guarding readouts are judged (disclosed).** A1 shows 2 defence charges "for a
  ward that holds its own", against 0 by construction. The readout computes the ward's odds after the tick, when the
  defending guardian already charges the aggressor and so counts among the ward's supporters (`supporters()`), while her
  decision was taken before she joined: the readout, not the mechanism, can put such a defence above even. Added to
  `e4o-diagnose.ts`: the same odds without the defending guardian (defences) and without the ward's guardian (deterrence
  charges), "as decided" (`oddsExcluding`, the assessOdds formula with one supporter removed); the existing readouts are
  kept. Re-run on unchanged simulation code from `scratchpad/e4o/frozen-d0c` (the commit that adds this entry): D0c–D3c
  (S27 and its re-draws) and A1c (A1's parameters), 30 + 60 days, seeds 48 and 7; the worlds are those of D0b–D3b and A1
  (deterministic), only the readout is new. The kill criterion is read on the corrected readout; both are reported.

## 10. Results (A1 against S27's four quick realizations and D0c–D3c; printed by `artifacts/validation/e4o/judge_e4o.py`, `report_table.py`, `diag_table.py`, the integrator's `judge_vs_reps.py` and `night.py`, from the JSON)

Sums (`judge_vs_reps.py quick custom`, REFS = S27q, S27q1–3 at bench-run3 28d249e; A1 at a3283ca, `git.dirty` 0):

```
quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | A1.json: 1.37, Δ -0.49, z -0.6 (inside noise)
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | A1.json: 3.70, Δ -0.12, z -0.1 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | A1.json: 3.65, Δ +0.04, z +0.1 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.11±0.02 | A1.json 0.00 (fail)
   T-HUN-4   held-out ref 0.21±0.41 | A1.json 0.05 (fail)
artifacts/validation/e4o/a1/A1-rhythm.json: adults out of a nest 2.21% of night; T-RHY-5 0.0167; night deaths 1; deaths 1
```

The fixed table (bench rows against the S27q group; truth readouts, 30 + 60 days, against D0c–D3c, which are the worlds of
D0b–D3b with the corrected readout; z = (A1 − mean) ÷ SD of the four reference runs; sums by amendment 2):

```
| Readout | S27 reference mean ± SD (4 runs) | A1 |
| --- | --- | --- |
| meat kcal per capture (truth, 30 + 60 d) | 1115 ± 18 | 1126 (z +0.6) |
| meat kcal per eater (truth) | 487 ± 29 | 541 (z +1.9) |
| T-HUN-1 hunts per community-year (5–25) | 26.0 ± 13.7 | 22.2 (z -0.3) |
| T-HUN-9 share of adults present who eat (~0.5) | 0.193 ± 0.054 | — |
| defence charges, ward 5-8 y (truth, 2 seeds) | 3.0 ± 2.2 | 1.0 (z -0.9) |
| defence charges, ward 8-12 y (truth, 2 seeds) | 1.0 ± 1.4 | 1.0 (z +0.0) |
| defence charges, ward 12-15 y (truth, 2 seeds) | 8.2 ± 1.0 | 1.0 (z -7.6) |
| defence charges, ward 15-20 y (truth, 2 seeds) | 1.8 ± 1.7 | 1.0 (z -0.4) |
| defence charges, ward >=20 y (truth, 2 seeds) | 1.0 ± 1.4 | 0.0 (z -0.7) |
| defence charges for a ward that holds its own (as decided) | 7.2 ± 2.2 | 0.0 (z -3.3) |
| copulations per max-swollen female daylight hour | 0.970 ± 0.025 | 0.904 (z -2.6) |
| T-ACT-1 (0.33–0.5) | 0.375 ± 0.005 | 0.376 (z +0.2) |
| T-ACT-2 (0.12–0.25) | 0.116 ± 0.009 | 0.105 (z -1.2) |
| T-ACT-3 (0.08–0.18) | 0.098 ± 0.007 | 0.082 (z -2.4) |
| T-ACT-4 (0.3–0.47) | 0.421 ± 0.020 | 0.422 (z +0.0) |
| reserves ÷ store %/day, adult male | +0.002 ± +0.004 | +0.002 (z -0.1) |
| reserves ÷ store %/day, female, lactating | -0.000 ± +0.007 | +0.008 (z +1.2) |
| reserves ÷ store %/day, juvenile 5–12 y | -0.027 ± +0.021 | -0.013 (z +0.7) |
| fitted (16 rows) | 1.87 ± 0.74 | 1.37 (z -0.6) |
| held-out (12 rows) | 3.82 ± 0.46 | 3.70 (z -0.1) |
| held-out w/o rare (11 rows) | 3.61 ± 0.36 | 3.65 (z +0.1) |
| prescriptions | 42 | 41 |
| viability (deaths; starvation) | pass (0; 0) / pass (0; 0) / pass (0; 0) / pass (0; 0) | pass (1; 0) |
```

Guarding, simulation truth (`diag_table.py`, D0c–D3c and A1c; A1c is A1's world: captures, charges, copulations identical):

```
| Readout (e4o-diagnose, seeds 48 + 7, 30 + 60 days) | D0c | D1c | D2c | D3c | ref mean ± SD | A1c |
| --- | --- | --- | --- | --- | --- | --- |
| charges and attacks (2 seeds) | 4705 | 4691 | 4498 | 4251 | 4536 ± 212 | 4417 (z -0.6) |
| guard-qualified charges | 109 | 127 | 91 | 80 | 102 ± 20.646 | 47 (z -2.7) |
|   age limit decides (target >= 12 y) | 78 | 71 | 60 | 57 | 66.500 ± 9.747 | 19 (z -4.9) |
|   deterred, age rule (< 12 y) | 31 | 56 | 31 | 23 | 35.250 ± 14.338 | 28 (z -0.5) |
|   deterred, odds rule (odds < 0.5) | 57 | 84 | 54 | 47 | 60.500 ± 16.217 | 25 (z -2.2) |
|   young but holds its own | 2 | 12 | 1 | 3 | 4.500 ± 5.066 | 10 (z +1.1) |
|   12+ y and cannot hold its own | 28 | 40 | 24 | 27 | 29.750 ± 7.042 | 7 (z -3.2) |
| defence charges | 10 | 15 | 15 | 21 | 15.250 ± 4.500 | 4 (z -2.5) |
|   ward holds its own (odds >= 0.5) | 7 | 11 | 13 | 16 | 11.750 ± 3.775 | 2 (z -2.6) |
|   ward holds its own without the defender (as decided) | 5 | 6 | 10 | 8 | 7.250 ± 2.217 | 0 (z -3.3) |
|   deterred, odds rule without the guardian (as decided) | 58 | 98 | 56 | 52 | 66 ± 21.479 | 25 (z -1.9) |
|   12+ y and cannot hold its own, without the guardian | 29 | 43 | 26 | 29 | 31.750 ± 7.632 | 7 (z -3.2) |
|   young but holds its own, without the guardian | 2 | 1 | 1 | 0 | 1 ± 0.816 | 10 (z +11.0) |
| caretaker ward-days | 0 | 0 | 0 | 0 | 0 ± 0 | 0 (z +0.0) |
| copulations in guarding | 604 | 556 | 424 | 471 | 514 ± 81.267 | 583 (z +0.9) |
```

Reserves (energy-diagnose, seeds 48 and 7, 30 + 30 days):

```
| Reserves ÷ store, % per day (OLS) | S27q runs | S27q mean ± SD | A1 |
| --- | --- | --- | --- |
| adult male | -0.002 / +0.007 / +0.001 / +0.003 | +0.002 ± 0.004 | +0.002 (z -0.1) |
| female, other | -0.017 / +0.008 / -0.007 / +0.038 | +0.006 ± 0.024 | -0.014 (z -0.7) |
| female, lactating | +0.005 / -0.008 / -0.005 / +0.006 | -0.000 ± 0.007 | +0.008 (z +1.1) |
| juvenile 5–12 y | -0.015 / -0.016 / -0.019 / -0.059 | -0.027 ± 0.021 | -0.013 (z +0.6) |
| infant 2–5 y | +0.007 / -0.036 / -0.016 / +0.001 | -0.011 ± 0.019 | +0.016 (z +1.2) |
| infant 0.5–2 y | +0.012 / +0.011 / +0.006 / +0.007 | +0.009 ± 0.003 | -0.006 (z -4.2) |
| infant < 0.5 y | +0.000 / +0.000 / +0.000 / +0.000 | +0.000 ± 0.000 | +0.000 (z +nan) |```

The infant 0.5–2 y line is one infant (seed 7) that fell ill and died in the arm's run (the bench's and the energy run's
only death, "illness"): its decline enters the class trajectory until it dies. The surviving infants of that class
changed −0.066 to +0.056 %/day per dyad, inside the reference runs' per-dyad range (−0.084 to +0.113); mothers' balance at
infant age 0.5–1 y (−21 kcal/day against +9 ± 7) includes its mother. Not attributable to protection (no defence or
deterrence change touches an infant's illness; the run is one realization).

**Against the predictions (§8):**

| Quantity | Predicted | Observed (A1; reference mean ± SD) | Verdict |
| --- | --- | --- | --- |
| Prescription count | 42 → 41 (high) | 41 (after merging track-e's counting fix, 1d177f8: S27 41 → A1 40) | held |
| Defence charges for a ward that holds its own | 0 (by construction) | 0 as decided (7.2 ± 2.2); 2 by the after-tick readout (11.8 ± 3.8), the defending mother's own support counted, §9 | held (corrected readout, disclosed) |
| Defence charges | ≤ 6 (15 ± 4.5) | 4 | held |
| Charges started at 12+ y who cannot hold their own (qualified guardian) | below 29.8 ± 7 (low) | 7 (31.8 ± 7.6 as decided) | held |
| Charges and attacks; copulations; captures; meat per capture | inside the D spread | charges 4,417 (4,536 ± 212), captures 25 (27.5 ± 7.9), meat 1,126 kcal per capture (1,115 ± 18), copulations 2,434 (2,710 ± 190); but copulations per maximally swollen female-hour 0.90 (0.97 ± 0.03, z −2.6), with fewer female-hours in parties of 3–6 males (rates per male in the party unchanged) | held, one readout outside |
| T-SOC-5, T-SOC-9, T-SOC-10 | inside the S27q spread (low) | 0.474 (0.442 ± 0.114), 0.135 (0.174 ± 0.125), 0.216 (0.182 ± 0.039) | held |
| Reserves %/day by class | inside the spread (high) | every class within 1.2 SD except infants 0.5–2 y (−0.006, z −4.2: one infant's fatal illness, above) | held except the illness |
| Fitted, held-out, held-out without the rare rows | inside noise | z −0.6, −0.1, +0.1 | held |
| Viability; night | pass | pass (one illness death, no starvation); adults out of a nest 2.21% of the night, T-RHY-5 0.0167 | held |

Not predicted: under-12-year-olds who hold their own against the charger now draw more charges (10 as decided, against
1 ± 0.8): the deterrent they lost; grooming T-ACT-3 0.082 (0.098 ± 0.007, z −2.4, in band; males 0.108 against
0.123–0.149).

**Kill criterion (§8): not met** (on the corrected readout; on the registered after-tick readout 2 defences of a ward
"holding its own" would have met it: both were decided while the ward could not, as the corrected readout shows).

### Verdict

- **`guardMaxAgeY`: replaced; `bodyRules` 1 a provisional keep candidate** (the rule ran as bit 2 in A1 and was renumbered
  to bit 1 after the run, §9; 42 → 41 by the count at this branch's base; 41 → 40 after track-e's counting fix). Viable, night safe, every sum inside noise (z −0.6, −0.1, +0.1). Protection now
  ends where the ward's strength makes it unnecessary: deterred charges at 12–15-year-olds who cannot hold their own fall
  from 31.8 ± 7.6 to 7, defence charges from 15 ± 4.5 to 4 (none for a ward that could hold its own, against 7.2 ± 2.2),
  and under-12-year-olds strong enough to hold their own lose the deterrent. A 5-seed confirm on the stack should decide.
- **`meatEatPerH`: stays.** No measured mass of an immature red colobus in any reachable source (§2.1), while immatures
  are most kills; the edible energy of a capture cannot be computed.
- **`mateIntervalH`: stays.** It sets the copulation rate (§4), but no measured refractory physiology exists and captive
  males ejaculate hourly: the limit in the wild is social (who is in the party, competition, female choice).

## 11. Open problems and deferred defects

- **The mating quota stands in for social limits the model lacks** (the biggest): per dyad the model copulates 10–20× the
  field's rate (0.59 per hour together against 0.03–0.064 at Kanyawara and ~0.03 at Taï), and matches the field per male
  (0.12 per adult male-hour, Kalinzu 0.12, Mahale 0.20–0.22) only because males are rarely with a swollen female (most
  maximally swollen female-hours have 0–2 adult males in the party, against 4–12 in the field). A replacement needs a
  value of copulation in the model's own currency (the share of a cycle's paternity it adds, with the conception
  saturation) and the parties that gather around swollen females; a candidate stage.
- **Meat per capture** needs immature red colobus masses (Struhsaker 1975, 2010; Teelen 2007, 2008; Watts & Mitani 2002;
  Stanford 1994: closed or books); with them, a capture drawn from the group's composition (miyamoto2013, mitani2000,
  ~41% non-adults, split not found) would give each carcass its mass and eating time. The model's 2.3 eaters per capture
  against ~10 at Taï and 12.1 at Ngogo is a separate gap (the share is 0.2 of a carcass whatever its size).
- **Protection by caretakers** is untested: no adoptive caretaker in ten seed-runs (D0c–D3c, A1c), so bit 2's caretaker
  rule never acted.
- Deferred defects (file:line in §5): the captor's meat overwrite and the share clamp; the female's 0.3-h mating literal
  and the 0.5-h block after a failed approach. Readout: the after-tick odds counted a defending guardian as her ward's
  supporter (corrected, §9).

### Renumbering and final checks (after `git merge --no-ff track-e` at aa2889e)

- **The rule is bit 1, not bit 2 (disclosed; no change of mechanism).** After the merge, `pnpm test` failed two ledger
  tests (tests/prescription-ledger.test.ts: every Track E switch must switch something out at value 1, and lower the
  count at value 1): with bit 2 the only defined bit, `bodyRules` 1 did nothing. The rule is renumbered to bit 1 (the
  first defined bit, as E4m's `leftoverRules` numbers its rules), range 0–1; bits 2 (meat) and 4 (mating) stay undefined.
  Equivalence: S27 + `bodyRules` 2 at a3283ca (A1's code) and S27 + `bodyRules` 1 at the merged head hash identical after
  30 days, seed 48 d8436cfab9d63ec9, seed 7 1b076ea54d1cb788 (`scratchpad/e4o/equiv.mts`), so A1's results are the
  results of `bodyRules` 1. A confirm on the stack uses `bodyRules` 1.
- Counts after the merge (track-e's "never fitted" fix, 1d177f8): S27 41, S27 + `bodyRules` 1 40; today's model 134,
  with the bit 133.
- Final checks (merge state, before the commit): `gen-params --check` clean (0 evidence-tagged literals outside the
  registry), `tsc --noEmit` clean, `pnpm test` 813 tests, 812 pass, 0 fail, 1 skipped.
