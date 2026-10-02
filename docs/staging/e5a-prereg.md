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

### 2.1 Diagnosis results (run-32e739f, clean; seeds 48 and 7, 30 + 30 days)

Generated by `artifacts/validation/e5a/diag_table.py` from `artifacts/validation/e5a/diag/*.json` (saved as
`diag-table.md`). **Identity:** the tool's T-PTY-1 per seed equals e-bench's (RF 4.266 / 3.365; R 4.268 / 3.138), so its
worlds are e-bench's.

| Arm (on RF) | T-PTY-1 (seeds 48, 7) | Δ vs RF | Reading (registered rule) | adult-male party 50 m (truth) | pair time together | joins / subject-day | adult-male path km/day |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RF | 3.815 (4.266, 3.365) | — | — | 3.380 | 0.141 | 7.82 | 2.084 |
| R | 3.703 (4.268, 3.138) | −0.112 | — | 3.347 | 0.133 | 7.64 | 2.204 |
| Z-all (six removed) | 2.525 (2.629, 2.421) | −1.290 | carries cohesion | 2.092 | 0.068 | 3.22 | 1.709 |
| Z-soc (`joinSocialW` 0) | 2.672 (3.031, 2.313) | −1.143 | carries cohesion | 2.265 | 0.079 | 3.32 | 1.757 |
| Z-base (`partyFollowBase` 0) | 3.246 (3.520, 2.972) | −0.569 | carries cohesion | 3.027 | 0.116 | 6.20 | 2.015 |
| Z-bond (`partyFollowW` 1e-6) | 3.247 (3.646, 2.847) | −0.568 | carries cohesion | 2.899 | 0.111 | 5.62 | 1.982 |
| Z-hoo (`joinHooW` 0) | 3.360 (3.471, 3.248) | −0.455 | carries cohesion | 2.976 | 0.117 | 6.14 | 1.973 |
| Z-male (`partyFollowMaleW` 0) | 3.700 (4.154, 3.247) | −0.115 | not resolved | 3.342 | 0.135 | 7.56 | 2.048 |
| Z-stay (`partyStayW` 0) | 3.896 (4.188, 3.604) | +0.081 | not resolved | 3.412 | 0.138 | 9.20 | 2.195 |

- **What holds parties together today, by tuned weight:** the social pull toward pant-hooting community members
  (`joinSocialW`, −1.14), then following a departing companion (`partyFollowBase` −0.57 and the bond weight
  `partyFollowW` −0.57) and the fitted hoo bonus (`joinHooW` 0.094, −0.46: joint trips sit near their decision
  boundary). The cost of leaving (`partyStayW`) and the male bonus carry nothing resolvable. Without all six, parties
  shrink to 2.5 and adult males walk 0.38 km a day less.
- **Who follows whom, for what:** a joined trip (C13e) is taken 2.8–3.8 times an adult-day, worth on average joinBase
  0.30 + bond 0.25–0.31 + ally 0.04–0.10 + rank 0.04–0.15 + sociability 0.12–0.16 + hoo 0.03 − stay 0.01 (no food term:
  the leader's tree is never valued); a plain party follow 0.7–1.2 times, worth base 0.70 + bond 0.33–0.46 + male
  0.21–0.24 + sociability 0.12–0.17 (90% tuned). On **R** (the defect in place) 57–74% of plain follow entries follow an
  infant or juvenile in a care follow (adult males 3.37 follows a day against 0.88 on RF).
- **Why parties split (pair splits by the mover's act):** walks to water 33%, joined trips (one goes with a leader,
  the other stays) 26%, approaches to callers 11%, own trips to food 7%. **Joins:** approaches to callers 25% (joins
  after calls), walks to water 24%, joined trips 20%, own trips 11%. Walks to water are named a cause: R drinks on the
  thirst timers (2.24 bouts a day, E2g), and nobody follows a drinker.
- **Party size and crop:** feeders per occupied crown 1.31, by crop tercile 1.31 / 1.32 / 1.31, R² 0.000: the crop
  effect is **absent**. The crop is not the limit: the median occupied crown holds 4.4 chimp-hours of feeding (potts2011's
  party visit: 3.3–6.5) and 3.8 per feeder. Parties (3.4) spread over several crowns within the 50-m chain.
- **Staged scorer fixes:** S1 (mean of follow means) − scan mean: 0.000 on RF (+0.005 on R; per seed ±0.17, cancelling);
  S2 − 50-m chain: +0.055 (R +0.059); a 90-m chain would add +1.0. Both staged fixes are small.

**Predictions (§2), scored:** Z-base −0.1 to −0.4: missed (−0.57); Z-bond 0.0 to −0.2: missed (−0.57); Z-male ±0.2:
confirmed; Z-stay −0.1 to −0.4: missed (+0.08); Z-hoo ±0.2: missed (−0.46); Z-soc −0.2 to −0.6: missed (−1.14); Z-all
−0.5 to −1.2: missed (−1.29); R − RF +0.27: missed (−0.11; the RF reference mean 3.53 sits below its first run's 3.82);
water the largest splitter: confirmed (33%); joins after calls 20–35%: confirmed (25%); 1.1–1.5 feeders, no crop
effect: confirmed; S1 within ±0.2 and S2 within +0.1: confirmed.

## 3. Mechanism (step 2): `cohesionValue`, iteration 1 (registered 2 October 2026, 10:00, f1bbe9b, before any run of it)

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

### 3.1 Iteration 2 (registered 2 October 2026, 10:13, before its run): company attracts, leaving costs nothing

**Why (A1, §6.1).** Charging the best settled companion's company (C13e's join terms, ~0.6–1.0) to every solo departure
froze parties: departures and joined trips collapsed (adult males' joined trips 3.6 → 0.4 a day), parties doubled (7.4),
travel fell to 0.087 and mothers lost 0.44% of their store a day. The forfeit assumed that a leaver loses its companions;
in the model a goal-directed departure alerts them and each decides whether to come (C7a, C7c, C13e), so the loss is
theirs to decide, not the leaver's to pay.

**Change (iteration 2, same switch).** A companion's company (`companyValue`, unchanged) is valued only by the animal
that moves toward it: following = its company − rain × 0.3 − the walk; joining a leader's trip = its company + the food at
its tree shared with the feeders there (unchanged) − rain × 0.3; approaching a caller = the call's terms + the caller's
company. **No option is charged a forfeit** (own trips, drinking and the pull home carry no cost of leaving; the
`forfeitedCompany` function is removed). The switched-out weights and the count are unchanged (97).

**Arm A2** = RF + `cohesionValue` 1 at the commit that adds this section: e-bench quick, `cohesion-diagnose`,
`ranging-diagnose` (48, 7) and `energy-diagnose` (48, 7, 30 + 30 days), from a frozen checkout. Smoke test first.

**Predictions (A2 against the RF mean, energy against the RF run; low confidence unless stated).**

| Quantity | Reference RF | Predicted A2 | Confidence |
| --- | --- | --- | --- |
| Prescription count | 103 | 97 | high |
| T-PTY-1 | 3.53 ± 0.22 | 3.3–5.0 | low |
| Joined trips per adult-male day | 3.63 (RF diag) | ≥ 3.6 (the joint trip gains the food at the goal) | moderate |
| Plain party follows per adult-male day | 0.88 | < 0.6 (company 0.6–1.0 against the tuned ~1.45) | moderate |
| Adult males' path to callers | 0.32 km/day | up (an animal in a party is now drawn by the caller's full company) | low |
| T-ACT-2 | 0.148 ± 0.009 | 0.13–0.18 | low |
| T-RNG-4 | 1.93 ± 0.17 | 1.7–2.4 | low |
| Adult males' true day range | 2.06 ± 0.06 km | 1.9–2.5 | low |
| Lactating females' reserves | −0.009%/day | within 0.05%/day of RF | moderate |
| Held-out without T-HUN-4, T-BRD-1 | reference mean | inside noise | low |

**Kill criterion (iteration 2, registered now).** Null if: any starvation death or a seed below 80% of its start; any
class's reserve slope more than 0.05%/day below RF's (energy-diagnose, same seeds and window; the track's viability
standard, handoff §4.5, which iteration 1's criterion lacked); held-out without the rare rows worse beyond noise
(z > +2); or the mechanism does not run.

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

- **Iteration 1** (`cohesionValue` as in §3; arm A1): registered and committed before its run (f1bbe9b; run from
  run-973dc12, clean). Results §6.1.
- **Iteration 2** (§3.1; arm A2): registered and committed before its run (this commit). Disclosure: the four unit tests of
  tests/sim-cohesion-value.test.ts ran once on the iteration-2 code minutes before this commit (reads, determinism and
  candidate scores only; no behavioural readout was looked at).

## 6. Results

### 6.1 Iteration 1: A1 = RF + `cohesionValue` (run-973dc12, clean)

Generated by `artifacts/validation/e5a/e5a_table.py`, `rng_table.py`, `energy_table.py` and `diag_table.py`.
**Smoke test** (seed 48, 1 + 2 days, A1): every readout filled. **Identity:** with the switch at 0 the diagnosis is
byte-identical to the 32e739f run (smoke summaries equal); ranging-diagnose's T-RNG-4 per seed equals e-bench's for all
five runs (RF ×4, A1).

| Readout | RF mean ± SD (4 runs) | A1 | z |
| --- | --- | --- | --- |
| T-PTY-1 | 3.526 ± 0.220 | 7.414 | — |
| T-PTY-3 / T-PTY-4 | 0.876 ± 0.151 / 0.392 ± 0.038 | 0.734 / 0.127 | — |
| T-ACT-2 / T-RNG-4 | 0.148 ± 0.009 / 1.933 ± 0.167 | 0.087 / 1.047 | — |
| T-IGE-1 | 7.354 ± 4.927 | 4.650 | — |
| True day range, adult males / females (km) | 2.064 ± 0.056 / 1.807 ± 0.016 | 1.301 / 1.193 | −12.2 / −34.4 |
| Fitted (17 rows scored in all) | 4.385 ± 0.657 | +1.798 | +2.33 |
| Held-out (13) / without T-HUN-4, T-BRD-1 (12) | 4.208 ± 1.029 / 3.070 ± 0.569 | −0.203 / +0.768 | −0.14 / +1.21 |
| Prescriptions | 103 | 97 | — |
| Viability (e-bench) | pass | pass (no deaths) | — |
| Reserves %/day: lactating / other females / juveniles (energy-diagnose, single runs) | −0.009 / +0.003 / +0.001 | −0.444 / −0.009 / −0.052 | — |
| Median hunger, adults / lactating (e-bench, per seed) | 0.18 / 0.47–0.52 | 0.39–0.48 / 0.78–0.83 | — |

Mechanics (diagnosis): pair time together 0.141 → 0.359; joins 7.8 → 5.6 per subject-day (approaches to callers 48% of
joins); joined trips per adult-male day 3.63 → 0.38, plain follows 0.88 → 0.10; adult males' path 2.08 → 1.30 km/day
(joined trips 0.54 → 0.06, own trips 0.36 → 0.17); feeders per crown unchanged (1.31), crowns emptier (median 3.4
chimp-hours against 4.4); fruit is 43% of adult males' intake against 70% (they eat leaves where they wait).

**Predictions scored:** count 97 confirmed; T-PTY-1 4.0–6.5 missed high (7.41); pair time together 0.17–0.30 missed
high (0.36); water splits below 25% missed (31%); T-ACT-2 0.12–0.16 missed (0.087); T-RNG-4 1.5–2.0 missed (1.05);
males' day range lower by 0.1–0.5 km missed (−0.76); held-out without rare rows inside noise confirmed (z +1.21);
viability pass confirmed by e-bench's rule, median adult hunger within +0.05 missed (+0.2–0.3).

**Verdict (registered rule):** by its letter A1 passes (no death, held-out without the rare rows inside noise, count
−6). It is **not kept**: mothers lose 0.44% of their store a day (49 times RF's loss; the track's viability standard is
the reserve trend, handoff §4.5, which this criterion omitted), the fitted sum is worse beyond noise (z +2.33) and the
travel share and day range leave their bands. Reading: charging a companion's full company to every solo departure
outweighs the food values (company 0.6–1.0 against 0.1–0.6 for a trip), so nobody leaves and nobody needs to join.

