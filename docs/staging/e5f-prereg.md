# E5f pre-registration: leaving together without timers

Status: skeleton committed at the start of the stage (branch `e5f-departing`, from `track-e` eea2d85), before any run and
before any code change. Track E, stage E5f. Rule served: field values of behaviour are targets, never inputs; no value,
bonus or weight is set to reach a waiting time, a party size or a departure rate.

## 0. The problem

- `departPersist` (field profile 1; moving-together-prereg.md §3) makes an own trip to a tree started with an audience
  (own-community animals of 12 y or more within `partyLinkM`, awake) an *attempt*: the initiator stands for
  `departCheckMin` (1 min, design); if nobody joined or followed, it gives the attempt up and its own trips to trees are
  off its menu for `departRetryMin` (3.8 min); once `departPersistMaxMin` (13 min) have passed since the first failed
  attempt, the next attempt goes ahead alone (execution.ts `departAttempt`, `departWait`, `resumeNest`; candidates.ts
  `held`, `departAudience`).
- `departRetryMin` and `departPersistMaxMin` are the field's own waiting times copied back as timers ([M]
  gruberZuberbuhler2013: after a failed recruitment, Budongo initiators re-launched the effort a mean 3.80 min later,
  range 0–13, 9 cases). The model cannot be scored on them, and what an initiator does after a failed attempt does not
  depend on its hunger, the target's value or whom it would leave.
- `departCheckMin` and the audience definition are design assumptions.

## 1. Plan

1. Diagnosis (§2, registered before its runs) on S27 in quick mode (seeds 48 and 7, burn-in 30, 30 days), simulation
   truth: attempts per adult-day by class, success share, re-launch delays, how often each timer decides, the
   initiator's deficit and the target's and company's values at each attempt; give-up and go-alone decisions; T-PTY-1,
   fission and fusion.
2. Mechanism behind a new switch (0 = today), from first principles, only for what the diagnosis implicates.
3. At most three iterations, each logged here and committed before its run; arms = S27 + switch (quick), judged
   against the integrator's four S27 quick realizations (bench-run3 28d249e: S27q, S27q1–3 by `rngSalt`) by e-noise.md
   amendment 2 with amendment 3's rare rows.

## 1. Field rows and readouts: samples and definitions (written before any run)

| Row or readout | Source, sample, method (quoted where it decides comparability) | Field value; band |
| --- | --- | --- |
| Re-launch after a failed recruitment (no scored row; the timers' source) | gruberZuberbuhler2013 (FT, PMC3783376 via NCBI BioC, read 4 October 2026): Budongo Sonso, community of 74; "Data were collected ... from 33 individuals (N=15 males, aged 8 to 49; N=18 females, aged 12 to 47). Data collection was based on focal animal sampling by following subjects on their daily travels from 07:00 to 16:00." Mass and reproductive state not reported (females scored for swelling). Travel: "an event that began with the termination of a non-locomotion activity, followed by locomotion of at least 10m ... we considered it part of the same travel event provided the interruption was less than 5 minutes and did not lead to other activities." Persistence: "18 of 92 vocal events were given by the same individual and during the same travel event (9 different events total) and to the same audience ... the caller was unsuccessful in recruiting others the first time and re-launched his or her efforts shortly thereafter (N=9, mean=3.80 min, range 0–13 min)." The 92 are vocal events by individuals recorded more than once on the same day; one silent event was also classed as persistence. "Typically, recruitment happened almost instantly, so that 'waiting' may be more a consequence of unsuccessful recruitment attempts." The text does not say how often a failed initiator left alone. | mean 3.80 min, range 0–13 (9 cases); success: 55 of 77 vocal and 30 of 89 silent initiations "led to a travel party (two or more individuals, including the travel initiator)"; the initiation phase "typically lasted for about one minute" |
| T-PTY-1 party size (fitted) | wilson2012 (FT, read by E5a, e5a-prereg.md §1.1): Kanyawara 1992–2006, community median 47 (11 adult males, 15 adult females), 5,527 party follows, 35,083 h, 15-min scans of "the identity of all individuals present"; party = all within about 50 m (wilson2001); every age and sex; mass not reported | 9.2 ± 7.0 per follow; band 3–9 (no recorded derivation; E5a staged 4.5–9.2, not applied) |
| T-ACT-2 travel share (fitted) | villioth2025 (FT, read by E5b, e5b-prereg.md §1): Budongo Waibira, "focal observations of ten adult males and nine adult females"; "Seven of the females were lactating"; state "recorded continuously", travelling includes "arboreal climbing and movement within the canopy"; 491 h; mass not reported. amsler2010 (abstract): Ngogo, 0.14 on non-patrol days | males 0.21, females 0.20 (Waibira); 0.14 (Ngogo); band 0.12–0.25 |
| T-FOOD-10 departures before sunrise (held-out) | janmaat2014 (FT, research.md, E2b addendum): "5 habituated adult females, all with offspring under 7 y", Taï, three fruit-scarce periods 2009–2011, 275 full days, departure model on 179 mornings; "18% of all departures were before sunrise"; mass not reported | 0.18; band 0.08–0.30 (one site) |
| Night safety (no row; the track's guard) | rhythm-metrics (E2a–E2f): adults out of a nest ≤ 3.3% of the night, T-RHY-5 ≤ 0.033 | — |

**Readouts (definitions; `scripts/depart-diagnose.ts` header holds them in full).**
- *Attempt* = the model's own trip to a tree started with an audience (departAudience: own-community animals of 12 y or
  more within the party link, awake), the analogue of the source's initiation with an audience. *Recruited* = a
  companion joined its trip or followed it while it checked: the source's "at least one individual followed the
  initiator". Success share = recruited ÷ attempts that ended.
- *Re-launch delay* = within one effort, attempt k to attempt k + 1, start to start (the source's 3.80 min is the
  interval between two hoo events of one travel event to the same audience, so start to start is the comparable
  reading); give-up to re-launch reported beside it.
- *Go-alone share* = efforts with a failed attempt that end with a departure alone at the cap (`departPersistMaxMin`);
  also reported per adult-day.
- *Attempts per adult-day* = attempts (first and re-launch) per animal-day of adults ≥ 15 y, and by class.
- *Hold decision* = a decision point of an initiator while its own trips are held (`departRetryMin`); *blocked while
  best* = without the hold an own trip would be the top published option (rules' value with the candidate jitter; the
  choice's belief offsets draw world.rng and are not redrawn).
- T-PTY-1, T-ACT-2, T-FOOD-10, sums: e-bench (quick). Night: rhythm-metrics (night out of a nest, T-RHY-5).
  Reserves %/day: energy-diagnose (OLS of reserves ÷ store).

## 2. Diagnosis (step 1; registered 4 October 2026 before its runs)

**What the code does (read at eea2d85, field profile, S27).** `departPersist` 1 (field default). An own trip to a tree
started with an audience is an attempt (execution.ts `departAttempt`): the initiator stands while it checks
(`departWait`); a companion who joins its trip or follows it in that time ends the attempt (recruited); after
`departCheckMin` (1 min) with nobody it gives up (`finish`, so a decision follows in the same tick; from its own nest it
is returned to the nest, `resumeNest`, until the hold ends), and its own trips to trees are not offered for
`departRetryMin` (3.8 min) while it has an audience (candidates.ts `held`: the remembered-tree trips, the route-chaining
pick and the shortlist). The first failure starts an effort (`trySince`); once `departPersistMaxMin` (13 min) have passed
since it, the next own trip with an audience goes alone; an effort not re-launched within 13 min of its last failure is
over. Recruitment itself is the audience's choice (C13e joined trip and party follow, valued by E5a's company (E5b's
margin for approaches), noticed through the travel hoo, the silent-departure notice or E2e's nest notice). The
initiator's own trip carries no company term (E5a: leaving costs nothing). S27 has `choiceBelief` 2 and not
`redecideValue`, so the gate (30-min `rgMaxAgeH`, need buckets), `continueBonus` and `finishedPenalty` apply.

**Tool.** `scripts/depart-diagnose.ts` (new; reads only) with a diagnostic tap `departTap` in execution.ts (null by
default; called at each step of an attempt; no behaviour change: the identity check below). The world is e-bench's;
e-bench's party-follow observer runs beside it, so its T-PTY-1 per seed must equal S27q's (5.032 / 4.529).
**Smoke test (done before this registration; disclosed):** S27, seed 48, 1 + 2 days: every readout filled. Seen (one
seed, 2 days, no burn-in; not a result): 3.5–6.4 attempts per adult-day, success 0.33, every recruitment in the first
tick; re-launch start to start 4.75–12.5 min (median 6.75); 82% of failed efforts lapse, 7% end alone at the cap; at the
give-up decision an own trip (to another tree) would be the top option in 53% of cases.

**Runs** (frozen detached checkout of the commit that adds this section): depart-diagnose and rhythm-metrics on S27
(S27q-params.json), seeds 48 and 7, burn-in 30, 30 days, `--workers 2` (1 above load 8). S27's e-bench and energy-diagnose
are the integrator's (bench-run3 28d249e: S27q and S27q1–3).

**Reading rules (registered).**
1. *departRetryMin decides* the act chosen after a give-up if, at the give-up decision, an own trip would be the top
   option without the hold in ≥ 25% of give-ups ("decides"); 10–25% "contributes"; < 10% "minor". Reported: blocked-while-
   best decisions per adult-day over the whole hold.
2. *What sets the re-launch delay:* the share of first decisions after the hold that come within 1 min of its end (the
   timer sets the delay) against later (the bout of the act chosen at the give-up sets it); the start-to-start
   distribution against the field's (mean 3.80, range 0–13, 9 cases).
3. *departPersistMaxMin decides* each departure alone at the cap; it is named as deciding efforts if ≥ 10% of efforts
   with a failure end that way; otherwise "rarely".
4. *The check* (`departCheckMin`, design): if ≥ 90% of recruitments come in the first tick, the window does not bind
   recruitment; it sets only how long a failed initiator stands.
5. *Values:* at give-ups where an own trip would be top, the company the initiator would leave (E5b presentCompany and
   the audience's best E5a companyValue) against the trip's margin over the best other option: if the company exceeds
   the margin in most such cases, a valuation with the company in it would mostly keep the initiator (as the timer does);
   otherwise it would mostly send it alone.
6. *The audience:* if fewer than half the audience members decide during an attempt, recruitment fails mainly because
   the audience does not get or take a decision point; if most decide but fewer than 20% of deciders join, because
   joining is outvalued. Reported: what they choose instead.
7. *Fission:* the share of pair splits made by an own trip, by how it started (free, alone at the cap, recruited).

**Expected (before the runs; low confidence unless stated; informed by the smoke test).** Attempts 3–7 per adult-day;
success 0.25–0.45; ≥ 90% of recruitments in the first tick (moderate); start-to-start re-launch median 5–9 min, floor
4.75 (high: check + hold); most failed efforts lapse (≥ 60%) and 3–15% end alone at the cap; at give-up an own trip would
be top in 35–65% (rule 1: "decides"); first decisions after the hold mostly later than 1 min (rule 2: the chosen act's
bout); the audience mostly decides (≥ 70%) but rarely joins (≤ 25%) (rule 6: "outvalued"). T-PTY-1 per seed equal to
S27q's (high: identity).
