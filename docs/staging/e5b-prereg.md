# E5b pre-registration: calls and cohesion together

Status: skeleton committed at the start of the stage (2 October 2026, 11:55, branch `e5b-calls-cohesion`, from
`track-e` 8720097), before any run and before any code change. Track E, stage E5 (fission–fusion), second piece.
Rules policy only; development seeds 48 and 7; no run longer than 90 days in all.

Rule served: field values of behaviour are targets, never inputs. Nothing here is tuned to a travel share, a day
range, a party size or a call rate.

This file is written in steps, each committed before the step it governs: §0–§2 (problem, field samples, readouts)
before the diagnosis runs; §3 (diagnosis readouts and reading rule) before the diagnosis runs on unchanged code; §5
onwards (mechanism, switch, arms, predictions, kill criterion) before any run of changed code; every iteration in the
run log before its run.

## 0. The problem (e-stack2-confirm.md, 5-seed confirms, simulation truth)

- On R, E5a's `cohesionValue` with E4g's `followCarer` leaves walking unchanged (adult males 2.10 against 2.17 km a
  day; e5a-prereg.md, five-seed confirm).
- On the integrated stack, adding the same pair to S3 (= S4) raises adult males' ground path from 2.93 to 3.43 km a
  day, pushes the travel share out of its band again (T-ACT-2 males / females 0.29 / 0.27 against 0.12–0.25) and
  deepens the nursing mothers' and juveniles' energy deficits (−0.27 and −0.17% of the store a day against −0.25 and
  −0.12 on S3).
- S3 contains `callValue`. The attribution of S2 found value-based calls the largest single source of extra walking
  (−0.74 km for males when left out), and E4g found that walking mostly "with a party" (joined trips and following),
  not approaching callers.

S3 = `bench-run/artifacts/validation/e/s3/S3-params.json`; S4 = S3 + `followCarer` + `cohesionValue`
(`…/s4/S4-params.json`), both read only:

```json
S3: {"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1,"ledgerFoodEnergyFix":1,"ledgerSatiationReserve":1,"ledgerLactGut":1,"callValue":1,"rhythmCircadian":1,"departRace":1,"nestLightDecide":1,"sleepChimp":1,"rhythmFreeNight":1,"nestCompany":1,"nestAudience":1,"darkCost":1,"preyKanyawara":1,"waterLedger":1}
S4: S3 + {"followCarer":1,"cohesionValue":1}
```

## 1. Field rows scored here: samples (written 11:57, before any run of this stage was read)

The rows this stage reports (scored by e-bench; none is an input). Sources opened in the session copies
(`track-e/artifacts/track-e-session-scratch-2026-10-01/`) where available; otherwise the full-text reading of the stage
named is cited.

| Row | Source, sample, method (quoted where it decides comparability) | Field value; band |
| --- | --- | --- |
| T-ACT-2 travel share (fitted) | villioth2025 (FT, opened here; Budongo Waibira, Oct 2016 – Jun 2017): "focal observations of ten adult males and nine adult females"; "Seven of the females were lactating, while two females were not lactating but travelled with a single juvenile offspring"; follows "mean duration ... 4.1 ± 2.6 h ... total: 491 h"; state "recorded continuously", travelling = "terrestrial quadrupedal walking as well as arboreal climbing and movement within the canopy". Mass not reported. amsler2010 (abstract; Ngogo, 29 patrols and control days, focal follows): travel 0.14 of time on non-patrol days | males 0.21, females 0.20 (Waibira); 0.14 (Ngogo controls); band 0.12–0.25 |
| T-PTY-1 party size (fitted) | wilson2012 (FT read by E5a, e5a-prereg.md §1.1; Kanyawara 1992–2006): community median 47; 5,527 party follows (median 5.3 h), 35,083 h; scans every 15 min of "the identity of all individuals present"; party = all within about 50 m (wilson2001). Every age and sex | 9.2 ± 7.0 individuals per follow; band 3–9 (no recorded derivation; E5a staged 4.5–9.2, not applied) |
| T-RNG-4 male day range (fitted; held as failed since C6b) | batesByrne2009 (FT, opened here: session copy `bb.txt`; Budongo Sonso 2002–03): 8 adult males, days on which the focal was followed "continuously - for at least 8 hours without losing it - on 27 days for males, 13 days for" lactating females; location "every five minutes" while travelling; movements inside 20+ min halts not recorded. Mass not reported | males 2.7 ± 1.5 km; band 1.5–3.5 |
| T-RNG-5 (held-out; reported) | the same: 6 lactating or gestating females, 13 follow-days | 1.2 ± 0.8 km (ratio 0.44; band 0.3–0.6, one site; E1j staged a multi-site band) |
| Simulation-truth day ranges (no row) | Kanyawara males 2.4, adult females 2.0 km (pontzerWrangham2004 via wilson2021, [L], secondary, method not seen); Sonso as above | context, never fitted |
| Reserve slopes of nursing mothers and juveniles (no scored row; the track's viability standard, handoff §4.5) | T-ENE-5 (staged, e-targets.patch.json): direction only | mothers lose condition in early lactation; no wild rate |

## 2. Plan

1. Diagnosis on S3 and S4 (quick: seeds 48 and 7, 30 + 30 days; simulation truth): daily path by purpose, the value
   terms of each following and joining decision, joiners' walks and what they gain on arrival, the energy those walks
   cost (§3, registered before the runs).
2. One mechanism behind a new switch (0 = today) for the term the diagnosis names (§5, registered before any run of
   changed code).
3. Reference: S4 at this branch's committed head, quick, run once plus three re-draws (`rgTemperature` 0.1641, 0.1639,
   0.16405), with `energy-diagnose` for each; arms judged against the reference mean (e-noise.md amendment 2).
4. At most 3 iterations, each logged in §6 and committed before its run.

## 3. Diagnosis (step 1; registered 2 October 2026, 12:00, before its runs)

**Question.** Which term of the calls–cohesion interaction adds about 0.5 km of walking a day on the stack: what moves
the animals (food trips, following a party member, joining a leader's trip, joining after a travel hoo, approaching
callers, water, patrol, other), what the company value, the call's own pull and the destination's food contribute to
each following or joining decision, how far joiners walk and what they get on arrival, and what the walks cost.

**Code path (read before the run, `src/sim/candidates.ts` at 8720097).** With `cohesionValue` 1 (E5a iteration 3) a
companion's company is `companyValue` = (1 − social) × (joinBase + joinBondW·bond + joinAllyW·[ally] + joinRankW·[it
dominates] + partyFollowSocialW·sociability) + for a male ≥ 10 y with a fertile unrelated female her unscaled mating
value (`mateWorth`, 0.3 + 0.5·swelling + 0.15 adult + 0.1·rank). It enters (a) following a party member who travels
off (`V.PARTY`): company − rain × 0.3 − distance ÷ travelDistScaleM (62,900 m: 1 km costs 0.016), candidates.ts:534;
(b) joining a leader's trip to a tree (C13e joint trip): company + the food at the leader's tree shared with its feeders
(`destWorth`) − rain × 0.3, candidates.ts:451; (c) approaching a heard pant-hoot or drum (`V.CALLER`): (the call's pull
+ company) × (1 − rain/2) − distance ÷ 1,500 m, candidates.ts:412–418, where the C5a form had (1 − social) × 0.55 × (0.4
with ≥ 2 own-community animals in sight) + 0.2 adult male to adult male. No option is charged for leaving. The walk's
energy cost appears only as distance ÷ 62,900 m in (a) and inside `destWorth` in (b).

**Arms** (attribution only; no code change; one simulation each): `scripts/approach-diagnose.ts` with its E5b readouts
(header), seeds 48 and 7, field profile, 30-day burn-in + 30 days, rules policy, from a frozen detached checkout of the
commit that adds this section:
- **S3** and **S4** (§0);
- **S3F** = S3 + `followCarer` (E4g's defect fix alone);
- **S4n** = S4 − `callValue` and **S3Fn** = S3F − `callValue`: with S3F and S4 a 2 × 2 of value-based calls ×
  `cohesionValue`, `followCarer` on in all four;
- **RC3** = R + `followCarer` + `cohesionValue` (E5a's confirmed arm on R, where the pair added no walking), for the
  decision terms and the daylight state on R.

**Readouts** (definitions in the script header): path km per chimp-day by part and purpose and class; bouts per day
and metres per bout; locomotion kcal by purpose; for each RG decision that starts a social move, the value terms in both
forms (E5a: company, mate, destination food as the score's residual; C5a/C13e: the tuned social terms, hoo, stay; the
call's own pull and distance cost), the decider's hunger, social need, reserves and companions in sight, and whom it
moves toward; the first-step counterfactual (Σ(p − p′) per chimp-day and × metres per bout) of removing each term from
the options on the menu, and of swapping the E5a form for the C5a/C13e form, at the same decisions (cohesion arms only);
per bout (follow, joined trip, approach, own trip for comparison) path, minutes, locomotion kcal, and in the 30 min
after it: kcal eaten, fed in a crown, grooming, mating or consort, change in social state; daylight hunger, social need,
reserves and companions within 50 m; joined-trip path after a travel hoo; the existing approach, call, fedurek2014 and
kalanBoesch2015 readouts; reserve slopes and deaths.

**Smoke test (done before this registration; disclosed).** S4, seed 48, 1 + 2 days: every readout filled; the existing
fields are byte-identical to the tool before the E5b readouts (same smoke, the pre-E5b script); the recomputed softmax
equals the tap's probabilities exactly (4,394 draws); the follow and approach scores are recomputed exactly (residual
0.000). I saw the smoke's E5b values (2 days, one seed: adult males' social need 0.59 in daylight; joined trips and
approaches carry most of the social moves; the company term is the largest single term at the first step). The reading
rule below was written after seeing them; it names terms by measured shares and does not depend on which term wins.

**Reading rule (registered).** Single runs; differences under 0.1 km a day are "not resolved".
1. *Channel.* Δ = S4 − S3 by part, adult males and adult females separately. The part with the largest Δ is named if it
   carries ≥ 40% of the Δ path; otherwise the two largest are named. The same table for S4 − S3F (cohesion with the
   defect fix in both).
2. *Interaction with calls.* I = (S4 − S3F) − (S4n − S3Fn), adult males' path, per part and in total. "Calls interact
   with cohesion" if I ≥ +0.2 km a day in total for adult males (and positive for adult females); "no interaction" if
   |I| < 0.1; otherwise "not resolved". If no interaction: cohesion adds the walking on the stack with or without
   value-based calls, and the cause is sought in what differs between R and the stack (step 4).
3. *Term.* In the named channel(s), on S4: the first-step counterfactual names the term whose removal takes away the
   most km a day (company, mate, destination food); the swap to the C5a/C13e form is reported beside it (how much of the
   channel's Δ the change of value form explains at the first step). Supported by the mean terms per decision on S4
   against S3F (same form readouts in both).
4. *State.* Daylight social need (1 − social) and hunger of adults on S4 against RC3: if the stack's social need is at
   least 1.5 × R's, the company term's drive is named as the part of the interaction the stack supplies.
5. *Gain and cost.* For each social move on S4: metres and locomotion kcal per bout, kcal eaten in the 30 min after,
   against an own trip; whether joiners gain food, company (social change, grooming) or mating on arrival.

**Expected (before the runs; low confidence unless stated).** S4 − S3, adult males +0.3 to +0.7 km a day (moderate:
the confirm gave +0.50); the largest Δ in approaches to callers (low), then joined trips (low). Interaction with calls:
present, I ≥ +0.2 (low). The company term the largest first-step contributor in the named channel (moderate; the smoke
showed it on two days). Social need on S4 at least 1.5 × RC3's (low). Joined trips deliver food comparable to own trips
in the 30 min after (low); approaches deliver less (moderate: E4g, 8% fed in the caller's crown). Viability passes in
every arm (high).

**Known defects in the code under test (deferred, with file:line).**
- `src/sim/execution.ts:588` with `src/sim/perception.ts:317`: an approach's goal is the last heard call's position,
  whoever called (E4g §2; 41–44% of approaches redirected under value-based calls). Measured (`goalRedirected`); not
  fixed before the diagnosis (it moves today's behaviour; it would need its own switch). If the diagnosis names
  approaches as the channel, the mechanism must state whether it relies on it.
- `src/sim/calls.ts:32` (`unlocatedShare`): an ally heard pant-hooting counts as located (an anti-reply term; E4c's
  deferred issue). Not in the cohesion path.

## 4. Diagnosis results (runs at 7c7574a, clean; seeds 48 and 7, 30 + 30 days; simulation truth)

Every number below is printed by `artifacts/validation/e5b/diag_md.py` (and `diag_table.py`, the full tables) from
`artifacts/validation/e5b/diag/*.json`; none is typed. Identity: the E5b readouts leave every earlier field of the tool
unchanged (smoke, §3); in the runs the recomputed softmax equals the tap's probabilities exactly and the follow and
approach scores are recomputed with residual 0.000, so the decision terms are the ones the animals used.

Adult males, path km per chimp-day (truth):

| purpose | S3 | S4 | S3F | S4n | S3Fn | RC3 | S4 − S3 | S4 − S3F | S4n − S3Fn | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| food trips | 0.618 | 0.853 | 0.784 | 0.971 | 0.799 | 0.506 | +0.235 | +0.069 | +0.172 | -0.103 |
| joined trip | 1.077 | 1.112 | 0.947 | 0.665 | 0.831 | 0.356 | +0.035 | +0.165 | -0.166 | +0.331 |
| follow party | 0.415 | 0.099 | 0.135 | 0.072 | 0.081 | 0.058 | -0.316 | -0.036 | -0.009 | -0.027 |
| to callers | 0.425 | 0.744 | 0.376 | 0.704 | 0.374 | 0.517 | +0.319 | +0.368 | +0.330 | +0.038 |
| water | 0.107 | 0.114 | 0.120 | 0.131 | 0.117 | 0.420 | +0.007 | -0.006 | +0.014 | -0.020 |
| patrol | 0.101 | 0.105 | 0.143 | 0.033 | 0.154 | 0.056 | +0.004 | -0.038 | -0.121 | +0.083 |
| other | 0.137 | 0.140 | 0.117 | 0.144 | 0.128 | 0.175 | +0.003 | +0.023 | +0.016 | +0.007 |
| total | 2.880 | 3.166 | 2.623 | 2.720 | 2.485 | 2.088 | +0.286 | +0.543 | +0.235 | +0.308 |

Adult females, path km per chimp-day (truth):

| purpose | S3 | S4 | S3F | S4n | S3Fn | RC3 | S4 − S3 | S4 − S3F | S4n − S3Fn | I |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| food trips | 0.822 | 0.965 | 0.890 | 1.127 | 0.899 | 0.457 | +0.143 | +0.075 | +0.228 | -0.153 |
| joined trip | 0.904 | 0.859 | 0.806 | 0.566 | 0.668 | 0.326 | -0.045 | +0.053 | -0.102 | +0.155 |
| follow party | 0.299 | 0.067 | 0.139 | 0.059 | 0.106 | 0.054 | -0.232 | -0.072 | -0.047 | -0.025 |
| to callers | 0.343 | 0.721 | 0.298 | 0.552 | 0.287 | 0.597 | +0.378 | +0.423 | +0.265 | +0.158 |
| water | 0.138 | 0.123 | 0.148 | 0.146 | 0.143 | 0.398 | -0.015 | -0.025 | +0.003 | -0.028 |
| patrol | 0.002 | 0.001 | 0.000 | 0.000 | 0.000 | 0.000 | -0.001 | +0.001 | +0.000 | +0.001 |
| other | 0.103 | 0.105 | 0.107 | 0.099 | 0.102 | 0.120 | +0.002 | -0.002 | -0.003 | +0.001 |
| total | 2.613 | 2.841 | 2.389 | 2.550 | 2.207 | 1.952 | +0.228 | +0.452 | +0.343 | +0.109 |

Approach decisions (entries per chimp-day; mean terms per entry; E5a form in cohesion arms, C5a form otherwise):

| arm | class | entries/day | company (E5a) | mate | C5a social pull | call pull | distance cost | start m | social need | ≥ 2 in sight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S4 | adult male | 4.26 | 0.447 | 0.164 | 0.307 | 0.456 | 0.170 | 254 | 0.56 | 0.50 |
| S4 | adult female | 4.12 | 0.419 | 0.000 | 0.201 | 0.456 | 0.169 | 254 | 0.54 | 0.53 |
| S3F | adult male | 1.73 | 0.383 | 0.033 | 0.352 | 0.425 | 0.204 | 306 | 0.49 | 0.30 |
| S3F | adult female | 1.40 | 0.339 | 0.000 | 0.202 | 0.459 | 0.199 | 299 | 0.45 | 0.40 |
| S4n | adult male | 3.71 | 0.546 | 0.190 | 0.390 | 0.198 | 0.199 | 298 | 0.63 | 0.36 |
| S4n | adult female | 3.02 | 0.547 | 0.000 | 0.280 | 0.186 | 0.187 | 280 | 0.69 | 0.45 |
| S3Fn | adult male | 1.87 | 0.438 | 0.029 | 0.401 | 0.262 | 0.190 | 285 | 0.53 | 0.27 |
| S3Fn | adult female | 1.33 | 0.458 | 0.000 | 0.289 | 0.279 | 0.215 | 323 | 0.61 | 0.32 |
| RC3 | adult male | 2.73 | 0.421 | 0.221 | 0.321 | 0.177 | 0.163 | 244 | 0.49 | 0.35 |
| RC3 | adult female | 3.05 | 0.538 | 0.000 | 0.277 | 0.146 | 0.161 | 242 | 0.66 | 0.41 |

Joined-trip decisions (same columns; destination food = the option score less jitter, company, mate and rain):

| arm | class | entries/day | company (E5a) | mate | destination food | C13e join terms | ≥ 2 in sight | after a hoo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S4 | adult male | 6.60 | 0.445 | 0.403 | 0.256 | 0.761 | 0.92 | 0.31 |
| S4 | adult female | 4.93 | 0.506 | 0.000 | 0.277 | 0.839 | 0.92 | 0.34 |
| S3F | adult male | 4.54 | 0.260 | 0.020 | — | 0.955 | 0.83 | 0.41 |
| S3F | adult female | 4.35 | 0.273 | 0.000 | — | 0.886 | 0.92 | 0.39 |
| S4n | adult male | 3.58 | 0.391 | 0.354 | 0.246 | 0.789 | 0.79 | 0.47 |
| S4n | adult female | 2.93 | 0.478 | 0.000 | 0.271 | 0.820 | 0.83 | 0.51 |
| S3Fn | adult male | 3.60 | 0.246 | 0.032 | — | 0.929 | 0.79 | 0.55 |
| S3Fn | adult female | 3.29 | 0.285 | 0.000 | — | 0.852 | 0.86 | 0.54 |
| RC3 | adult male | 1.76 | 0.288 | 0.399 | 0.173 | 0.739 | 0.77 | 0.50 |
| RC3 | adult female | 1.71 | 0.420 | 0.000 | 0.221 | 0.797 | 0.82 | 0.58 |

First-step counterfactual (cohesion arms): km per chimp-day each term adds (entries per day in brackets):

| arm | class | move | company | mate | destination food | swap to the C5a/C13e form |
| --- | --- | --- | --- | --- | --- | --- |
| S4 | adult male | to callers | +0.413 (+2.37) | +0.084 (+0.48) | +0.000 (+0.00) | +0.207 (+1.18) |
| S4 | adult male | joined trip | +0.448 (+3.23) | +0.275 (+1.99) | +0.275 (+1.98) | -0.020 (-0.14) |
| S4 | adult male | follow party | +0.058 (+0.71) | +0.044 (+0.53) | +0.000 (+0.00) | -0.305 (-3.73) |
| S4 | adult female | to callers | +0.405 (+2.31) | +0.000 (+0.00) | +0.000 (+0.00) | +0.238 (+1.36) |
| S4 | adult female | joined trip | +0.481 (+3.40) | +0.000 (+0.00) | +0.304 (+2.15) | -0.283 (-2.00) |
| S4 | adult female | follow party | +0.057 (+0.77) | +0.000 (+0.00) | +0.000 (+0.00) | -0.361 (-4.89) |
| S4n | adult male | to callers | +0.475 (+2.50) | +0.108 (+0.57) | +0.000 (+0.00) | +0.251 (+1.32) |
| S4n | adult male | joined trip | +0.225 (+1.62) | +0.129 (+0.93) | +0.155 (+1.11) | -0.157 (-1.13) |
| S4n | adult male | follow party | +0.043 (+0.50) | +0.029 (+0.33) | +0.000 (+0.00) | -0.176 (-2.02) |
| S4n | adult female | to callers | +0.413 (+2.26) | +0.000 (+0.00) | +0.000 (+0.00) | +0.263 (+1.44) |
| S4n | adult female | joined trip | +0.275 (+1.89) | +0.000 (+0.00) | +0.174 (+1.19) | -0.205 (-1.41) |
| S4n | adult female | follow party | +0.046 (+0.50) | +0.000 (+0.00) | +0.000 (+0.00) | -0.201 (-2.18) |
| RC3 | adult male | to callers | +0.321 (+1.69) | +0.099 (+0.52) | +0.000 (+0.00) | +0.163 (+0.86) |
| RC3 | adult male | joined trip | +0.110 (+0.74) | +0.087 (+0.58) | +0.077 (+0.52) | -0.272 (-1.83) |
| RC3 | adult male | follow party | +0.029 (+0.26) | +0.030 (+0.27) | +0.000 (+0.00) | -0.208 (-1.87) |
| RC3 | adult female | to callers | +0.440 (+2.25) | +0.000 (+0.00) | +0.000 (+0.00) | +0.279 (+1.42) |
| RC3 | adult female | joined trip | +0.162 (+1.09) | +0.000 (+0.00) | +0.101 (+0.68) | -0.259 (-1.74) |
| RC3 | adult female | follow party | +0.046 (+0.41) | +0.000 (+0.00) | +0.000 (+0.00) | -0.242 (-2.15) |

What the walks cost and gave on S4 (per bout; the 30 min after its end):

| class | move | bouts/day | m | min | locomotion kcal | kcal eaten in 30 min | fed in a crown | grooming | mating or consort | social change |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adult male | to callers | 4.26 | 175 | 9.8 | 6.19 | 76 | 0.70 | 0.23 | 0.09 | -0.002 |
| adult male | joined trip | 8.03 | 139 | 7.8 | 4.92 | 116 | 0.92 | 0.22 | 0.08 | -0.006 |
| adult male | follow party | 1.21 | 82 | 4.7 | 2.91 | 76 | 0.79 | 0.26 | 0.12 | +0.003 |
| adult male | own trip | 5.96 | 124 | 7.0 | 4.41 | 110 | 0.76 | 0.14 | 0.03 | -0.013 |
| adult female | to callers | 4.12 | 175 | 9.9 | 5.32 | 71 | 0.64 | 0.25 | 0.04 | -0.003 |
| adult female | joined trip | 6.07 | 141 | 8.0 | 4.25 | 110 | 0.91 | 0.24 | 0.06 | -0.006 |
| adult female | follow party | 0.91 | 74 | 4.7 | 2.36 | 64 | 0.68 | 0.35 | 0.06 | +0.009 |
| adult female | own trip | 5.58 | 154 | 8.6 | 5.36 | 116 | 0.78 | 0.15 | 0.02 | -0.015 |

Daylight state (awake, every 15 min) and locomotion energy:

| arm | social need: males / females / lactating / juveniles | hunger: males / lactating | companions ≤ 50 m, males | locomotion kcal/day: males / lactating / juveniles | reserves %/day: lactating / juveniles | AM pant-hoots per awake h | calls at food per community-day | approaches per call at food / not at food | male composition changes per awake h (fedurek2014 ≈ 0.69) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S3 | 0.31 / 0.31 / 0.15 / 0.47 | 0.32 / 0.48 | 3.13 | 168 / 135 / 127 | -0.159 / -0.071 | 0.53 | 16.7 | 1.25 / 0.13 | 1.14 |
| S4 | 0.43 / 0.36 / 0.20 / 0.58 | 0.31 / 0.48 | 2.56 | 180 / 137 / 138 | -0.127 / -0.076 | 0.70 | 25.2 | 1.73 / 0.36 | 1.40 |
| S3F | 0.33 / 0.28 / 0.15 / 0.44 | 0.30 / 0.47 | 2.41 | 150 / 127 / 121 | -0.128 / -0.021 | 0.56 | 13.7 | 1.13 / 0.12 | 0.79 |
| S4n | 0.42 / 0.35 / 0.18 / 0.54 | 0.28 / 0.47 | 1.65 | 153 / 125 / 124 | -0.104 / -0.035 | 1.01 | 7.8 | 1.36 / 0.42 | 0.97 |
| S3Fn | 0.35 / 0.34 / 0.17 / 0.42 | 0.29 / 0.47 | 1.91 | 142 / 115 / 109 | -0.112 / -0.016 | 0.94 | 8.1 | 0.95 / 0.16 | 0.69 |
| RC3 | 0.27 / 0.30 / 0.14 / 0.27 | 0.20 / 0.37 | 1.66 | 113 / 89 / 98 | +0.004 / -0.010 | 0.86 | 4.4 | 1.42 / 0.37 | 1.10 |

Identity checks: recomputed softmax − tap probabilities, max |Δ| S4 0e+00 (143275 draws), S4n 0e+00 (127688 draws), RC3 0e+00 (132607 draws); follow and approach score residuals (|mean|) S3 0.000, S4 0.000, S3F 0.000, S4n 0.000, S3Fn 0.000, RC3 0.000.
Deaths: S3 none; S4 {'respiratory illness (outbreak)': 3}; S3F none; S4n none; S3Fn none; RC3 none.

### 4.1 Reading by the registered rule (§3)

1. *Channel.* S4 − S3: the largest Δ is **approaches to callers**, adult males +0.319 of +0.286 km a day (food trips
   +0.235, following −0.316) and adult females +0.378 of +0.228: named for both. S4 − S3F (cohesion with the defect fix in
   both): approaches +0.368 of +0.543 (68%) for males, +0.423 of +0.452 (94%) for females; joined trips second for males
   (+0.165). Juveniles: approaches +0.687 against S3F.
2. *Interaction with calls.* I = +0.308 km a day for adult males and +0.109 for adult females: "calls interact with
   cohesion" by the rule. But by part the interaction is in **joined trips** (+0.331 males, +0.155 females), not in
   approaches (+0.038 males): `cohesionValue` adds the same approach walking with value-based calls (+0.368) as with
   today's prescribed calls (+0.330). With value-based calls the stack's parties are larger (companions within 50 m 2.56
   against 1.65 on S4n), so more departures are there to join (6.6 against 3.6 joined-trip entries per adult-male day);
   joined trips end in a crown 92% of the time and deliver more food in the next 30 min than an own trip (116 against
   110 kcal), so that walking is foraging in company.
3. *Term.* In the approaches, on S4, the first step names **the caller's company**: removing it takes away 0.41 km a
   day for adult males (2.4 entries) and 0.41 for females; the mate value 0.08 (males), the call's own pull is not E5a's.
   Swapping the E5a form for the C5a form at the same decisions takes away 0.21 / 0.24 km (57% / 56% of the channel's Δ
   against S3F): the form explains about half at the first step; the rest is state (calls at food per community-day
   25.2 against 13.7 on S3F; social need higher). The C5a form multiplied the social pull by 0.4 when two or more
   community members were in sight; on S4 half of all approach decisions (0.50 males, 0.53 females) are taken in such
   company, and the E5a form values the caller's company at full whatever company the listener already has.
4. *State.* Daylight social need on S4 against RC3: adult males 0.43 against 0.27 (1.6 × R's: named), adult females 1.2
   ×, juveniles 2.1 ×, mothers 1.4 ×. The stack supplies the company term's drive: its animals feed for longer (T-ACT-1
   in band) and groom less, so every companion's company is worth more. Within the stack cohesion raises the need itself
   (S3F 0.33 → S4 0.43; S3Fn 0.35 → S4n 0.42): approaches take time that grooming would, and do not relieve the need.
5. *Gain and cost.* An approach on S4 walks 175 m in 10 min for 6.2 kcal (adult males) and returns 76 kcal eaten in the
   next 30 min (own trip 110, joined trip 116), a crown 70% of the time (own trip 76%, joined trip 92%), grooming 23% and
   no change in social need (−0.002; a follow +0.003): the walk to callers returns the least food of any move and no
   social relief. Male party membership churns at 1.40 changes per awake hour on S4 against 0.79 on S3F and 0.69 at
   Kanyawara (fedurek2014, derived [L]). The walking's energy is small: males' locomotion costs 180 kcal a day on S4
   against 150 on S3F, about 2% of their expenditure; its time (about 42 minutes a day of approaches) is not.

**The term, in three lines.** The walking cohesion adds on the stack is mostly approaches to callers (+0.37 km a day for
adult males and +0.42 for females against S3F, with either call model): E5a values the caller's company at full whatever
company the listener already has (half the approaches start in company), weighted by a social need that the stack raises
(1.6 × R's for males) and that the approach does not relieve. The calls × cohesion interaction proper is in joined trips
(+0.33 km, males), which return food.

**The brief's candidate, by arithmetic (not built).** A 175-m approach costs 6.2 kcal at sockol2007's cost of transport
(the ledger's 35.4 kcal per km for males), 0.4% of a male's daily expenditure and 0.003 in the rules' food unit (one unit
≈ 2,000 kcal: travelDistScaleM's derivation, 2,500 kcal ÷ memTravelHungerW). The caller's company it is weighed against
is 0.45 and the approach's existing distance cost 0.17 (joinCallDistScaleM 1,500 m, fitted in C5a). Pricing the walk by its
energy would lower the cost of an approach and add walking; a hungry or depleted animal is not the one walking (hunger at
approach decisions 0.29 against a daylight mean of 0.31 for males). The energy of the walk cannot restrain company-driven
walking; what the diagnosis shows instead is a valuation of company that ignores the company already present.

### 4.2 The reference: S4 at this branch's head, quick, four realizations

Generated by `artifacts/validation/e5b/e5b_table.py` from e-bench, energy-diagnose and approach-diagnose JSON (S4q0 run at
db62dd3, the re-draws S4q1–S4q3 with `rgTemperature` 0.1641, 0.1639, 0.16405; e-bench and energy at db62dd3, the
truth paths by approach-diagnose at 7c7574a; the simulation code is identical at both; every e-bench `git.dirty` 0).

| readout | S4 reference: S4q0, S4q1, S4q2, S4q3 | mean ± SD |
| --- | --- | --- |
| T-ACT-2 males | 0.271, 0.294, 0.275, 0.284 | 0.281 ± 0.010|
| T-ACT-2 females | 0.254, 0.254, 0.231, 0.249 | 0.247 ± 0.011|
| T-ACT-2 pooled | 0.262, 0.272, 0.250, 0.265 | 0.262 ± 0.009|
| T-PTY-1 | 4.401, 4.412, 4.406, 4.292 | 4.378 ± 0.057|
| T-RNG-4 | 2.892, 3.108, 2.784, 2.881 | 2.916 ± 0.137|
| T-RNG-5 | 0.826, 0.835, 0.845, 0.899 | 0.851 ± 0.033|
| T-ACT-1 pooled | 0.382, 0.374, 0.397, 0.384 | 0.384 ± 0.010|
| T-ACT-3 males | 0.142, 0.118, 0.129, 0.122 | 0.128 ± 0.011|
| T-ACT-3 females | 0.164, 0.176, 0.163, 0.169 | 0.168 ± 0.006|
| prescriptions | 77.000, 77.000, 77.000, 77.000 | 77.000 ± 0.000|
| viability pass | 1.000, 1.000, 1.000, 1.000 | 1.000 ± 0.000|
| deaths (e-bench) | 3.000, 0.000, 0.000, 0.000 | 0.750 ± 1.500|
| ground km/day, males | 3.108, 3.507, 3.090, 3.343 | 3.262 ± 0.200|
| ground km/day, other females | 2.775, 2.866, 2.847, 2.854 | 2.835 ± 0.041|
| ground km/day, lactating | 2.610, 2.931, 2.580, 2.559 | 2.670 ± 0.175|
| ground km/day, juveniles | 3.293, 3.531, 3.320, 3.401 | 3.386 ± 0.107|
| reserves %/day, lactating | -0.127, -0.197, -0.129, -0.125 | -0.145 ± 0.035|
| reserves %/day, juveniles | -0.076, -0.202, -0.118, -0.121 | -0.129 ± 0.053|
| reserves %/day, males | 0.010, -0.003, -0.010, -0.012 | -0.004 ± 0.010|
| reserves %/day, other females | -0.011, 0.010, -0.016, -0.006 | -0.006 ± 0.012|
| true day range, males | 3.166, 3.568, 3.151, 3.405 | 3.322 ± 0.201|
|   males: food | 0.853, 0.878, 0.820, 0.827 | 0.844 ± 0.026|
|   males: joined trip | 1.112, 1.326, 1.072, 1.160 | 1.167 ± 0.112|
|   males: follow party | 0.099, 0.138, 0.113, 0.121 | 0.118 ± 0.016|
|   males: to callers | 0.744, 0.875, 0.760, 0.811 | 0.797 ± 0.059|
|   males: water | 0.114, 0.103, 0.113, 0.114 | 0.111 ± 0.005|
|   males: patrol | 0.105, 0.103, 0.126, 0.202 | 0.134 ± 0.047|
|   males: other | 0.140, 0.145, 0.146, 0.172 | 0.151 ± 0.014|
| true day range, females | 2.841, 3.079, 2.852, 2.867 | 2.910 ± 0.113|
|   females: food | 0.965, 1.055, 0.991, 1.062 | 1.018 ± 0.048|
|   females: joined trip | 0.859, 0.911, 0.847, 0.780 | 0.849 ± 0.054|
|   females: follow party | 0.067, 0.064, 0.059, 0.060 | 0.062 ± 0.004|
|   females: to callers | 0.721, 0.817, 0.714, 0.701 | 0.738 ± 0.053|
|   females: water | 0.123, 0.123, 0.131, 0.144 | 0.130 ± 0.010|
|   females: patrol | 0.001, 0.002, 0.000, 0.003 | 0.002 ± 0.001|
|   females: other | 0.105, 0.107, 0.111, 0.118 | 0.110 ± 0.006|
| social need, adult males (daylight) | 0.427, 0.482, 0.418, 0.430 | 0.439 ± 0.029|
| social need, adult females | 0.357, 0.386, 0.353, 0.358 | 0.364 ± 0.015|
| AM approaches/day | 4.263, 5.042, 4.313, 4.581 | 4.550 ± 0.357|
| AF approaches/day | 4.121, 4.575, 4.134, 3.886 | 4.179 ± 0.288|
| AM pant-hoots/awake h | 0.697, 0.755, 0.714, 0.680 | 0.712 ± 0.032|

Band-distance sums, rows counted in all 4 runs (quick; reference = the four S4 realizations; z = (arm − mean) ÷ (SD × √1.25), SD = registered quick SD or the reference spread if larger)

- fitted (16 rows): reference 2.61, 3.31, 2.38, 3.85 (mean 3.04, sd 0.67; used 0.69)
- held-out (12 rows): reference 4.41, 4.70, 5.04, 4.84 (mean 4.75, sd 0.26; used 1.26)
- held-out w/o rare (11 rows): reference 4.22, 4.70, 5.01, 4.66 (mean 4.65, sd 0.33; used 0.48)

Rows beyond 2 SD of the reference runs (SD floor 0.05), and the rare rows:
- T-HUN-4 (held-out): reference 0.10 ± 0.10; 

## 5. Mechanism (step 2): `companyMargin`, iteration 1 (registered 2 October 2026, 12:30, before any run of it)

**Principle.** A move is worth what it adds. An approach to a heard caller is a move toward company; its social gain is
the company the caller offers beyond the company the animal already has where it is. In foraging terms a patch is worth
its gain over the alternative open to the forager [charnov1976]; in motivational terms the social drive (1 − `social`) is
relieved by grooming [keverne1989: the motivation to be groomed is regulated by grooming], and a companion present offers
grooming as well as a distant one, so the drive weights the caller's company only where it adds to what is present
[cabanac1971: an incentive is weighted by the internal state it serves]. E5a's `companyValue` takes the drive and the
companion's incentive from the sources; it does not take the company already present, which the diagnosis shows matters:
half of the stack's approaches start in company, and none relieves the need (§4.1).

**Change (switch `companyMargin`, 0 = today in both profiles; read only with `cohesionValue` 1).** The approach option
(`V.CALLER`, candidates.ts) adds max(0, `companyValue`(caller) − `presentCompany`) to the call's pull in place of
`companyValue`(caller), where `presentCompany` is the best `companyValue` among the animal's settled companions: own
community, 5 y or more, in sight within the party link, not travelling or following, not in a nest (E5a iteration 1's
settled companion, the only registered definition of company present). Nothing else changes: the call's own pull, the
distance cost, following, joined trips, calls and every weight are untouched. No new parameter or magnitude. It removes
no prescription (the C5a weights it replaces in spirit, `joinSocialW` and `joinSocialInPartyF`, are already switched out
by `cohesionValue`), so by the track's keep rule it cannot be a keep candidate on its own: if it does what it states it is
recorded as a correction of E5a's valuation, recommended to travel with `cohesionValue`.

**Not built, with reasons.** (a) The walk's energy cost in the food currency (the brief's candidate): ruled out by
arithmetic (§4.1). (b) The same margin for following and joined trips: the principle applies to them, but the diagnosis
names approaches; joined trips carry the calls × cohesion interaction and return food (§4.1, item 2), and the brief
limits the mechanism to the term named. Reported as the open question.

**Arm A1** = S4 + `companyMargin` 1: e-bench quick, `energy-diagnose` and `approach-diagnose` (seeds 48 and 7, 30 + 30
days), from a frozen detached checkout of the commit that adds this section and the code; `--workers 1` if the load is
above 8. Smoke test first (S4 + the switch, seed 48, 1 + 2 days, approach-diagnose): every readout filled, approaches
still taken. Unit tests (`tests/sim-company-margin.test.ts`) run after this commit, before the smoke test.

**Predictions (A1 against the S4 reference mean ± SD of its four realizations, §4.2; low confidence unless stated).**

| Quantity | Reference | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Approaches per adult-male day / adult-female day | 4.55 ± 0.36 / 4.18 ± 0.29 | 2.0–3.5 / 2.0–3.3 | moderate |
| Adult males' path to callers (km/day) | 0.80 ± 0.06 | 0.40–0.65 | moderate |
| True day range, adult males / adult females (km/day) | 3.32 ± 0.20 / 2.91 ± 0.11 | 2.85–3.20 / 2.45–2.85 | low |
| Daylight social need, adult males | 0.44 ± 0.03 | 0.34–0.43 | low |
| Adult-male pant-hoots per awake hour (truth) | 0.71 ± 0.03 | 0.55–0.70 | low |
| T-ACT-2 males / females | 0.281 ± 0.010 / 0.247 ± 0.011 | 0.235–0.275 / 0.205–0.245 | low |
| T-PTY-1 | 4.38 ± 0.06 | 3.6–4.6 | low |
| T-RNG-4 | 2.92 ± 0.14 | 2.4–2.9 | low |
| Male composition changes per awake hour (fedurek2014 ≈ 0.69; S4 1.40) | (single S4 run) | below 1.2 | low |
| Reserves %/day, lactating / juveniles | −0.145 ± 0.035 / −0.129 ± 0.053 | −0.15 to −0.07 / −0.13 to −0.04 | low |
| Fitted, held-out, held-out without T-HUN-4 and T-BRD-1 | 3.04 / 4.75 / 4.65 | inside noise | moderate |
| Prescriptions | 77 | 77 | high |
| Viability | pass | pass | high |

**Kill criterion (registered now).** `companyMargin` is recorded as a null if any of: viability fails (a starvation
death; a seed below 80% of its start); any class's reserve slope (adult males, other females, lactating females,
juveniles; energy-diagnose) more than 0.05%/day below the reference mean; held-out without the rare rows worse beyond
noise (z > +2 against the reference mean); party cohesion breaks (T-PTY-1 below its band's floor, 3); or the mechanism
does not run (approaches per adult-male day not below the reference's lowest realization, 4.26: a code or tool failure,
fixed and re-run as the same iteration). Otherwise, with the count unchanged, it is recorded as a correction of E5a's
valuation (not a keep candidate by the track rule), and the walking it removes is reported against the reference.

## 6. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

- **Iteration 1** (`companyMargin` as in §5; arm A1): registered and committed with the code before any run of it
  (this commit). Results §7.
