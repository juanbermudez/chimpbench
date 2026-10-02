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

## 2. Diagnosis (step 1)

To be registered here before its runs: why parties form and split on R + `followCarer` and on R (who follows whom
and for which value term; joins after calls; splits at trips to food), party size against the crop of the current
tree, and the share of cohesion each tuned weight carries (each zeroed in turn: attribution only, nothing kept).

## 3. Mechanism (step 2)

To be registered before any run of changed code. One first-principles switch (0 = today) built from terms the model
already computes (crown share under competition from the ledger's intake; bond and kin; oestrous females for males;
the walk's energy cost from the ledger's cost of transport), switching out the tuned weights (ACTIVE_WHEN; the count
must fall). No new tuned constant.

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
