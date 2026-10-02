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
