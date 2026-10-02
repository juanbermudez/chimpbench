# E5a pre-registration: party cohesion from first principles

Status: skeleton committed at the start of the stage (2 October 2026, branch `e5a-cohesion`, from `track-e` 10c8ded),
before any run and before any code change. Track E, stage E5 (emergence of fission–fusion). Rule served: field values
of behaviour are targets, never inputs. This stage **removes** weights tuned to party size; it tunes no new one.

## 0. The problem

- In the field profile, party cohesion rests on weights tuned in C5a against T-PTY-1, T-ACT-2 and T-RNG-4
  (`partyFollowBase` 0.7, `partyFollowW` 1.0, `partyFollowMaleW` 0.4, `partyStayW` 0.05; `partyFollowHungerW` is 0 in
  the field profile) and on `joinHooW` 0.094 (fitted in C13e to gruberZuberbuhler2013's 71.4% recruitment) and
  `joinSocialW` 0.55 (notes: tuned to a target row). The prescription tool (`scripts/lib/prescriptions.ts`) counts all
  six active ones as outcome-encoding (checked 2 October with `classify` on the field profile under R: partyFollowBase,
  partyFollowMaleW, partyFollowW, partyStayW rule 2 "fitted to a target row"; joinHooW rule 6 "fitted"; joinSocialW
  rule 2). So the tool sees them; no tool defect on that count.
- E4g found a defect those weights compensate (`src/sim/candidates.ts:489`, the party-follow offer, before E4g's
  switch): adults follow a dependent that is only keeping up with its carer (a `V.MOTHER` or `V.JUVENILE` follow).
  With E4g's `followCarer` 1, party size falls (T-PTY-1 z −2.4 on R + `callValue`), because the weights were fitted
  with the defect in place.
- Known defect handling (pre-flight rule): the reference of this stage is **R + `followCarer` 1** (the defect fixed).

## 1. Audit (step 0): T-PTY-1's band, the other party rows, the observer

Written 2 October 2026, 09:40–09:55, before any run of this stage was read. Disclosure: the model's T-PTY-1 values of
earlier stages were known (R ≈ 2.8–3.6, R + `callValue` 4.34, A1 3.97; e4g-prereg.md). Any corrected band or scorer fix
is **staged** in `docs/staging/e5a-targets.patch.json`, never applied. FT = full text read here.

### 1.1 Sources and samples

| Row | Source (read) | Sample, method (quoted where it decides comparability) | Value |
| --- | --- | --- | --- |
| T-PTY-1 | wilson2012 (FT, author copy) [M] | Kanyawara 1992–2006; community "a median 47 chimpanzees (range 43–51), including a median of 11 adult males (range 10–13) and 15 adult females (range 12–19)", adult = ≥ 12 y; 5,527 party follows, median 5.3 h (0.25–14 h), 35,083 h; "When parties split, observers generally stay with the larger subgroup"; "During each party follow, observers conducted scan samples at 15 min intervals, recording ... the identity of all individuals present"; "For party follows, mean values of party composition ... were used" | "Parties contained a mean 9.2 ± 7.0 individuals per follow, of which 3.0 ± 3.0 were adult males, 2.3 ± 1.8 were adult females, and 0.3 ± 0.7 were females with fully tumescent sexual swellings" |
| T-PTY-1 | potts2011 [H] (FT read by C7b; **not re-read here**: the Harvard DASH download now returns an AWS WAF CAPTCHA, so that host was dropped; OpenAlex and Crossref carry no abstract) | Kanyawara and Ngogo, 2005–2006, focal follows; feeding parties in fruit patches (research.md) | feeding party 8.39 (1–32) Kanyawara, 7.29 (1–40) Ngogo |
| party rule | wilson2001 (FT, author copy) [M] | Kanyawara playbacks 1996–1998: "we use 'party' to mean all individuals travelling, feeding, resting, or socializing within about 50 m of one another"; "In two borderline cases, in which individuals were separated from the rest of the party by 50–60 m but had been together with other party members in the previous 15 min, we considered them all to be members of the same party. In practice, a minimum of 90 m separated the parties we considered to be distinct" | — |
| T-PTY-3 | wilson2007 (FT, author copy) [M] | Kanyawara 1996–1998; party follows ("At 15-min intervals, the observer recorded the map location and the identity of all individuals known to be travelling with the party"); Periphery = "all points outside the nesting range but within the park", nesting range = "the minimum convex polygon enclosing all points used for night nests" | 249 parties; median adult males 5.9 (periphery-visiting, N = 62) vs 2.2 (core-only, N = 149) |
| T-PTY-2 | mitaniWatts2005, wakefield2008, potts2011 | needs ≥ 4 monthly means: "insufficient" in quick mode (e-bench NEEDS_YEAR); not scored here | — |
| T-PTY-4 | wakefield2008, doran1997, lehmannBoesch2008 (abstract level, as registered) | female focal point samples; already flagged compromised (C5a review) | 0.15–0.45 alone |

Not verified (2 routes each, then stopped): lehmannBoesch2004 (Taï, community size and party size; OpenAlex closed and
no abstract, Europe PMC no record). Nothing below uses it.

### 1.2 T-PTY-1's band (3–9, "Kanyawara (~45–50 members) scaled down; wide because party size is site-specific")

- **How it was scaled: undocumented.** No file gives the derivation. Proportional scaling of 9.2 to 22 members gives
  9.2 × 22/47 = 4.3; class by class (wilson2012's adult males 3.0 of 11, adult females 2.3 of 15, the other 3.9 of 21,
  applied to the model's West community at creation: 8 males ≥ 12 y, 8 females ≥ 12 y, 6 others; seeds 48 and 7
  identical) gives 2.2 + 1.2 + 1.1 = 4.5. The band's top (9) is Kanyawara unscaled; its bottom (3) matches no stated
  rule and lies below both scalings.
- **Is scaling by community size sound? Not on the sources in hand.**
  - The one within-Kibale comparison (potts2011) has feeding parties no larger in Ngogo, a far larger community (size
    not in research.md; not verified here), than at Kanyawara (7.29 vs 8.39): party size did not follow community size.
  - Under the ecological-constraints account the band is meant to test (chapman1995, newtonFisher2000), party size is
    set by patch size and the density of animals within reach, not by membership. The model's West community lives at
    Kanyawara's density: 22 members in π·1,594² m = 8.0 km² (2.75 per km²) against 47 in a median annual range of
    16.4 km² (2.87 per km², wilson2012). At equal density and Kibale-like patches, that account predicts Kanyawara's
    party size, not a scaled one, as long as 22 members do not cap it.
  - Against that: social pull is partner-specific (bonds, kin, oestrous females), and a 22-member community offers
    fewer partners; no source in the repo measures party size in a community of ~22 under Kibale ecology.
- **Conclusion (moderate confidence).** Proportional scaling (~4.3–4.5) is the lowest value with any stated rationale,
  and the unscaled 9.2 the highest. The bottom of 3 has none. **Staged:** band 4.5–9.2 (class-proportional scaling to
  Kanyawara unscaled), basis written in the patch; not applied. On it, every reference measured so far (2.8–4.3) fails
  low; on the registered band most pass. Neither band is used to judge this stage: arms are judged against the
  reference mean (§4), and the registered band stays the scored one.

### 1.3 The observer against the sources

- **Protocol (src/field/metrics.ts T-PTY-1; config.ts TARGET_FOLLOW):** party follows that stay with the larger
  subgroup ('party-larger', as wilson2012), 15-min scans, all individuals of every age in a chain at `partyLinkM` 50 m
  (wilson2001's "within about 50 m of one another"). Matches the source on follow mode, interval, who counts and the
  core distance.
- **Mismatch 1, the statistic (staged fix S1).** wilson2012's 9.2 is a mean over follows of each follow's mean
  composition ("mean values of party composition ... were used" per follow; "individuals per follow"): every follow
  weighs the same, whatever its length (0.25–14 h). The scorer averages all scans, so long follows weigh more. The
  direction is not known a priori; §2 measures both on the reference.
- **Mismatch 2, the party rule (staged fix S2).** wilson2001 kept animals 50–60 m from the party in it when they had
  been together in the previous 15 min; distinct parties were in practice ≥ 90 m apart. The scorer's chain at exactly
  50 m splits such animals. The fix: chain at 50 m, plus a link at 50–60 m between animals that were in one party at the
  previous scan. Expected small; §2 measures the scan size at 50, 60 and 90 m on the reference.
- **T-PTY-3 (staged fix S3).** wilson2007 used party follows and a Periphery outside the night-nest MCP; the scorer
  uses focal follows (T-PTY-3 is not in TARGET_FOLLOW) and the 85% kernel isopleth. Two protocol differences; T-PTY-3
  is held out, so applying S3 needs a protocolLog entry and a new freeze.
- **What the field cannot give:** no source gives party size per scan (only per follow), how often parties split, or
  who leaves; none separates following from independent arrival at the same tree.

## 2. Diagnosis (step 1; registered 2 October 2026, 09:58, before its runs)

**Tool.** `scripts/cohesion-diagnose.ts` (new; its header defines every readout). Simulation truth on e-bench's world
(createWorld + 30-day burn-in + 30 days, seeds 48 and 7, rules policy), plus e-bench's own party-follow observer, so
its T-PTY-1 per seed must equal e-bench's (identity check, RF). Run from a frozen detached checkout of the commit that
adds this section. Smoke test (seed 48, 1 + 2 days, RF): every readout filled; nothing read from it beyond that,
except that it ran.

**Arms (one simulation each; attribution only, nothing kept):** **RF** (R + `followCarer`), **R**, and on RF each
tuned cohesion weight removed in turn: Z-base `partyFollowBase` 0; Z-bond `partyFollowW` 1e-6 (0 would close the whole
party-follow mechanism, which reads `partyFollowW > 0` as its gate; 1e-6 keeps the gate and removes the bond term);
Z-male `partyFollowMaleW` 0; Z-stay `partyStayW` 0; Z-hoo `joinHooW` 0; Z-soc `joinSocialW` 0 (the social pull toward
pant-hooting community members); Z-all all six together.

**Readouts** (header of the script): observer T-PTY-1 and S1; truth party size at 15-min scans by class at 50, 60
and 90 m and under S2; time alone; pair joins and splits per subject-day and the mover's part (own trip to food,
joined trip, to callers, follow party, drink, in or to a crown, …); the value terms of each party follow and joined
trip taken, by follower class, and whom they follow; feeders per occupied crown against its crop (terciles, R²) and
the crop in chimp-hours of feeding; true path by class and part; deaths by cause.

**Reading rules (registered).**
- *What holds parties together, by tuned weight:* Δ observer T-PTY-1 (mean of the two seeds) of each Z arm against RF.
  A weight "carries cohesion" if its removal lowers T-PTY-1 by more than 0.44 (twice the RF reference's run-to-run SD,
  0.22, from its four quick realizations); a fall of 0.22–0.44 is "probable"; under 0.22 "not resolved" (single runs).
  The same for adult males' truth party size at 50 m (reported, not ruled on).
- *Why parties split:* the mover's part with the largest share of pair splits names the main splitting act; a part
  with ≥ 25% of splits is named as a cause. *Joins after calls:* the share of joins whose mover is approaching a caller.
- *Party size and crop:* the crop effect is "absent" if R² of feeders on crop < 0.05 and feeders per occupied crown
  differ by < 0.2 between the top and bottom crop terciles (pooled seeds, RF).
- *Scorer fixes:* S1 − scan mean and S2 − 50-m chain on RF, reported as the staged fixes' expected effect.

**Expected (before the runs; low confidence unless stated).** Z-base lowers T-PTY-1 by 0.1–0.4; Z-bond by 0.0–0.2;
Z-male ±0.2; Z-stay by 0.1–0.4; Z-hoo ±0.2 (moderate); Z-soc by 0.2–0.6; Z-all by 0.5–1.2. R − RF ≈ +0.27 (the
reference means, 3.80 vs 3.53). Splits: the largest mover part is a walk to water (moderate: the smoke test's two days
gave 43%; R drinks on the thirst timers), then trips to food. Joins after calls 20–35% (moderate). Crowns: 1.1–1.5
feeders per occupied crown and no crop effect (moderate; the party-size stage found 1.2 and R² ≈ 0). S1 − scan mean
within ±0.2; S2 − 50 m within +0.1 (moderate).

**Known defects in the code under test.** Fixed in the reference: `candidates.ts:489` (E4g; adults follow a care
follow), by `followCarer` 1. Deferred (not part of cohesion as defined here; would move today's behaviour): the
approach goal is read live from `x.joinX/joinZ` (`src/sim/execution.ts:588`), overwritten by every later call heard
(`src/sim/perception.ts:317`), so an approach goes to whoever called last (E4g §2).

## 3. Mechanism (step 2): `cohesionValue`, iteration 1 (registered 2 October 2026, 10:05, before any run of it)

**Principle (ecological constraints).** Fission–fusion is the balance of what association yields against what it
costs: companions share food (a crown's crop is divided among its feeders, so larger parties get less each: party size
tracks patch size, chapman1995, newtonFisher2000 [M]) and companions are worth having (bonds, allies, rank, and for males
receptive females, who raise the number of males in parties: emeryThompson2014 [M]); walking costs energy. Today none of
that is weighed: following a companion is worth a tuned base 0.7 + 1.0 × bond + 0.4 for an adult male (C5a), leaving
companions costs a tuned 0.05 each (C5a), a hoo adds a fitted 0.094 (C13e), and a lone animal is pulled to callers by
a tuned 0.55 × social need (C5a).

**Change (switch `cohesionValue`, 0 = today in both profiles; read only in the field profile, with `partyJoinTrip` 1):**
- *Company* (`companyValue`, candidates.ts): what the company of companion o is worth to c, the same moving or staying
  (E2e's design assumption): C13e's join terms without what belongs to a departure, `joinBase` + `joinBondW`·bond +
  `joinAllyW`·[ally] + `joinRankW`·[o dominates c] + `partyFollowSocialW`·sociability; plus, for a male of 10 y or more
  with a fertile unrelated female (swelling ≥ 0.75, the mate offer's gate), the mate offer's own mating value
  (`mateWorth`: 0.3 + 0.5·swelling + 0.15 if adult + 0.1·rank, the literals of the existing offer, now shared).
- *Company forfeited* (`forfeitedCompany`): leaving the party loses the best settled companion (own community, ≥ 5 y,
  in sight within the party link, not itself travelling or following, not in a nest). Subtracted from every option that
  walks the animal away alone: own trips to trees (in place of `partyStayW` × companions), drinking trips, the pull
  home, approaches to callers. A design assumption: one companion's worth (the best), not a sum.
- *Following* a party member who travels off (V.PARTY): its company − the company forfeited − rain × 0.3 (as today) −
  the walk (distance ÷ `travelDistScaleM`, the energetic distance scale of own trips, derived from the cost of walking a
  metre) — in place of `partyFollowBase`, `partyFollowW`, `partyFollowMaleW` (and `partyFollowHungerW`, 0 in the field).
- *Joining a leader's trip to a tree* (C13e's joint trip): the leader's company − the company forfeited − rain × 0.3 + the
  food at its tree for this animal, shared with the animals seen feeding there or going there, the leader included
  (`treeIntake` with those feeders: the ledger's crown share), valued and walked exactly as the animal's own trip to a
  remembered tree (`memTravelHungerW`, the crop it believes: in sight, its memory, else 0.2 as for any unremembered
  crop; `tripCost`). No stay term: the crown being left is worth its own forage option. The hoo informs (it still gives a
  decision point) and adds no value: `joinHooW` and `travelHooFollowW` are not read.
- *Approaching a caller*: the caller's company − the company forfeited, in place of `joinSocialW` (with `joinMaleW`,
  `joinSocialInPartyF`); the call's food and distance terms are unchanged.
- No new magnitude: every term is an existing design term or input. Prescriptions under the switch (field, RF): 103 →
  97 (computed with scripts/prescription-ledger's `prescriptionCount`): `partyFollowBase`, `partyFollowW`,
  `partyFollowMaleW`, `partyStayW`, `joinHooW`, `joinSocialW` switched out in ACTIVE_WHEN; `partyOn` short-circuits the
  `partyFollowW > 0` gate, so none of them is read (tests/sim-cohesion-value.test.ts traces a field day).

**Arms (iteration 1).** **A1** = RF + `cohesionValue` 1: e-bench quick (seeds 48 and 7, 30 + 30 days, one run),
`cohesion-diagnose` and `ranging-diagnose` (seeds 48, 7) on the same params. True day ranges of the reference:
`ranging-diagnose` on RF and its three re-draws. Smoke test first (seed 48, 1 + 2 days, A1): every readout filled.

**Predictions (A1 against the RF mean ± SD of four runs; low confidence unless stated).**

| Quantity | Reference RF | Predicted A1 | Confidence |
| --- | --- | --- | --- |
| Prescription count | 103 | 97 | high (computed) |
| T-PTY-1 | 3.53 ± 0.22 | up, 4.0–6.5 (fewer fissions: leaving alone costs a companion's company) | low |
| Pair time together (truth) | 0.141 (RF diag) | up, 0.17–0.30 | low |
| Splits by walks to water | 33% of pair splits | below 25% | moderate |
| T-ACT-2 | 0.148 ± 0.009 | 0.12–0.16 | low |
| T-RNG-4 | 1.93 ± 0.17 | 1.5–2.0 | low |
| Adult males' true day range | (ranging-diagnose, RF ×4) | lower by 0.1–0.5 km | low |
| Held-out without T-HUN-4, T-BRD-1 | reference mean | inside noise (|z| ≤ 2) | low |
| Viability | pass | pass; median adult hunger up ≤ 0.05 | moderate |

**Keep rule and kill criterion (registered).** Keep candidate if viable, held-out without the rare rows not worse beyond
noise (z ≤ +2 against the RF mean) and the count falls (97). Recorded as a null if viability fails (any starvation
death; a seed below 80% of its start), if held-out without the rare rows is worse beyond noise (z > +2), or if the
mechanism does not run (no party follows or joined trips in the diagnosis). Party size, travel and day range are
reported against the reference, not used to choose between versions: no iteration may be chosen for moving a fitted
row toward its band.

## 4. Reference and judging (docs/staging/e-noise.md amendment 2)

- Reference **RF** = R + `followCarer` 1 at this branch's committed head, e-bench quick (seeds 48 and 7, 30 + 30 days),
  run once plus three re-draws (`rgTemperature` 0.1641, 0.1639, 0.16405 added). Also reported against the integrator's
  R quick realizations (`bench-run/artifacts/validation/e/noise/R-quick.json`, `NR1q`, `NR2q`, `NR3q`; 612bf15) after an
  identity check of R at this head.
- R = `{"energyLedger":1,"ledgerGrowSurplus":1,"ledgerNightNurse":1,"ledgerInfantIntake":1,"ledgerNurseBout":1,"ledgerGrowPotential":1,"ledgerDigesta":1,"ledgerDrive":1,"rhythmSleep":1,"rhythmHeat":1,"endoStates":1,"endoEscalate":1,"endoRedirect":1,"endoFast":1,"endoRainDisplay":1}`.
- Each arm against the reference mean: z = (arm − mean) ÷ (SD × √(1 + 1/n)); quick per-run SD fitted 0.69, held-out
  1.26, held-out without T-HUN-4 and T-BRD-1 0.48, or the reference's own spread if larger; |z| > 2 is a result.
  Judged on the `--compare` figure "on N rows scored in both", with and without T-HUN-4 and T-BRD-1.
- Reported with the reference's spread: T-PTY rows, T-ACT-2, T-RNG-4, T-IGE-1, true day ranges by sex
  (`scripts/ranging-diagnose.ts`), prescription count, viability (must pass).
- Limits: development seeds 48 and 7 only; no run longer than 90 days in all; `--workers 1` if load > 8; rules policy.

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

- **Iteration 1** (`cohesionValue` as in §3; arm A1): registered and committed before its run (this commit).
