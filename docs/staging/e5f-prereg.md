# E5f pre-registration: leaving together without timers

Status: complete (4 October 2026): diagnosis (§2), iteration 1 `departValue` 1 (A1) and iteration 2 `departValue` 2 (A2)
both pass the keep rule in quick mode; A2 recommended for a 5-seed confirm (§7). Skeleton committed at the start of the
stage (branch `e5f-departing`, from `track-e` eea2d85), before any run and before any code change. Track E, stage E5f. Rule served: field values of behaviour are targets, never inputs; no value,
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

### 2.1 Diagnosis results (frozen checkout of a00c3bd, clean; S27, seeds 48 and 7, 30 + 30 days; simulation truth)

Printed by `artifacts/validation/e5f/diag_table.py` (a copy of the stage's table script) from `S27-depart.json`; night by
the integrator's night.py from `S27-rhythm.json`. **Identity:** the tool's T-PTY-1 per seed equals S27q's (5.032 /
4.529), so its worlds are e-bench's. **A defect in the tool's printed summary** (found reading this run, fixed at the
next commit, measurement only): its re-launch delays keyed attempts by an id that restarts per seed, so delays paired
attempts of different seeds; the table below computes them from the per-seed records (the second block).

| readout | S27 |
| --- | --- |
| T-PTY-1 per seed (identity with e-bench) | 48: 5.032, 7: 4.529 |
| deaths | 48: {}; 7: {} |
| attempts (first) per adult-day | 6.243 |
| re-launches per adult-day | 0.358 |
| attempts (first + re-launch) per adult-day | 6.601 |
| departures alone at the cap per adult-day | 0.211 |
| own trips with no audience per adult-day | 1.669 |
|   adult male: attempt / re-launch / alone / free per day | 8.742 / 0.518 / 0.354 / 1.29 |
|   female, lactating: attempt / re-launch / alone / free per day | 4.196 / 0.254 / 0.113 / 2.488 |
|   female, other: attempt / re-launch / alone / free per day | 4.174 / 0.2 / 0.076 / 1.53 |
|   adolescent 12–15 y: attempt / re-launch / alone / free per day | 8.754 / 0.446 / 0.379 / 1.338 |
|   juvenile 5–12 y: attempt / re-launch / alone / free per day | 8.928 / 0.867 / 0.603 / 1.961 |
| attempts n; outcome shares | 18010; {'recruited': 0.405, 'given-up': 0.57, 'interrupted': 0.025, 'open': 0} |
| success share (recruited ÷ ended) | 0.405 |
|   first attempts: success | 0.411 |
|   re-launches: n; success | 1084; 0.299 |
|   from own nest: n; success | 439; 0.267 |
|   with a travel hoo: share; success | 0.385; 0.462 |
|   silent: success | 0.368 |
| minutes to recruitment (median, p90, max) | 0.25, 0.5, 1 |
| recruitments in the first tick (< 0.3 min) share | None |
| audience per attempt | 2.866 |
| audience acts at attempt (share) | {'rest': 0.304, 'in crown': 0.218, 'other': 0.117, 'ground forage': 0.069, 'groom': 0.066, 'own trip': 0.064} |
| audience members deciding during the attempt (share) | 0.819 |
|   of deciders: join offered; joined | 0.692; 0.17 |
|   their choices (counts) | {'joined trip': 10805, 'rest': 9009, 'crown': 6028, 'own trip': 3974, 'pant-grunt': 2572, 'groom': 2211, 'ground forage': 1485} |
|   top − join option (median, p10, p90) | 0.174, 0, 0.571 |
| efforts n; outcome | 16928; {'recruited': 0.43, 'lapsed': 0.494, 'audience gone': 0.007, 'interrupted': 0.025, 'alone at cap': 0.041, 'lapsed (window end)': 0.002, 'open': 0.001} |
| efforts with a failure: n; outcome | 9547; {'lapsed': 0.876, 'audience gone': 0.013, 'alone at cap': 0.073, 'recruited': 0.034, 'lapsed (window end)': 0.003, 'open': 0.001} |
| attempts per failed effort | 1.113 |
| re-launch delay, start to start: n, mean, median, p10–p90, min–max | 1082, 24.003, 7.5, -1684–1697.5, -3853.5–3998.25 |
| re-launch delay, give-up to re-launch: n, mean, median, p10–p90, min–max | 1081, 405.676, 8.5, 4–1829, -1–3997.25 |
| alone at cap: min since first failure: n, mean, median, p10–p90, min–max | 700, 16.296, 15.5, 13.5–21, 13–29.25 |
| alone at cap: min since last failure: n, mean, median, p10–p90, min–max | 700, 12.794, 13.5, 6.75–16.25, 4–16.75 |
| re-launch delay bins (start to start) | {'<2': 189, '<4': 6, '<6': 226, '<8': 141, '<10': 127, '<13': 175, '<Infinity': 218} |
| hold decisions n; per adult-day blocked while best (all classes) | 14273; 3.052 |
|   at the give-up decision: n; own trip top w/o hold; same tree top | 9912; 0.573; 0 |
|   later hold decisions: n; own trip top; same tree top | 4361; 0.419; 0.176 |
|   give-up decision: chosen (share) | {'crown': 0.381, 'rest': 0.157, 'joined trip': 0.117, 'ground forage': 0.115, 'groom': 0.052, 'to callers': 0.036} |
| first decision after the hold: n; min after its end (median, p10, p90); own trip chosen | 10210; 9.45, 0.95, 25.7; 0.154 |
|   within 1 min of the hold end (share) | None |
| values at attempt: n, hunger, relRes, social need, trip, stay, trip−stay, company max/sum/present, crop, seen h, dist | 18010, 0.319, -0.019, 0.467, 0.533, 0.499, 0.034, 0.516/1.183/0.461, 0.29, 8.875, 114.02 |
| values at attempt recruited: n, hunger, relRes, social need, trip, stay, trip−stay, company max/sum/present, crop, seen h, dist | 7286, 0.307, -0.015, 0.447, 0.537, 0.5, 0.037, 0.503/1.172/0.45, 0.288, 6.704, 105.51 |
| values at attempt given up: n, hunger, relRes, social need, trip, stay, trip−stay, company max/sum/present, crop, seen h, dist | 10271, 0.325, -0.021, 0.479, 0.53, 0.497, 0.033, 0.522/1.175/0.467, 0.293, 13.513, 119.323 |
| values at alone at cap: n, hunger, relRes, social need, trip, stay, trip−stay, company max/sum/present, crop, seen h, dist | 700, 0.404, -0.028, 0.562, 0.643, 0.549, 0.094, 0.687/1.717/0.617, 0.29, 16.396, 122.53 |
| values at give-up decision: n, hunger, relRes, social need, trip, stay, trip−stay, company max/sum/present, crop, seen h, dist | 9912, 0.314, -0.02, 0.475, None, 0.522, None, 0.522/1.167/0.446, None, None, None |
|   give-up decision: own-trip margin over top w/o hold (median, p10, p90) | 0.024, -0.164, 0.215 |
| pairs: joins / splits per subject-day; pair time together | 11.352 / 11.32; 0.184 |
|   split mover part (top 8) | {'joined trip': 0.342, 'to callers': 0.134, 'to crown': 0.111, 'own trip (recruited)': 0.099, 'in crown': 0.067, 'drink': 0.066, 'other': 0.039, 'rest': 0.03} |
|   join mover part (top 6) | {'to callers': 0.403, 'joined trip': 0.251, 'own trip (recruited)': 0.051, 'drink': 0.048, 'own trip (free)': 0.042, 'rest': 0.042} |

| readout (per-seed records) | S27 |
| --- | --- |
| re-launch delay, start to start | n 1075, mean 7.97, median 7.75, p10–p90 4.75–11.75, min–max 4.75–13.00 |
|   bins (min) | {'0–1': 0, '1–2': 0, '2–4': 0, '4–6': 354, '6–8': 216, '8–10': 200, '10–13': 304, '13–∞': 1} |
| re-launch delay, give-up to re-launch | n 1075, mean 7.14, median 7.00, p10–p90 4.00–11.00, min–max 4.00–12.00 |
| recruitments in the first tick (share) | 0.871 |
| first decision after the hold within 1 min of its end (share) | 0.102 |
| give-ups where the own trip would be top and company max > its margin over the top (share of those top) | 0.856 |
| give-ups where own trip top: margin over top (median, p90); company max (median) | 0.094, 0.286; 0.441 |
| attempts given up: trip − stay at the attempt (median, p10, p90) | 0.013, -0.093, 0.176 |
| attempts by day / night (share at night) | 0.032 |
| unanswered attempts: n; next own-trip event (share) | 0; {} |
| re-launch to the same audience: delay start to start | n 0 |
|   bins (min) | {'0–1': 0, '1–2': 0, '2–4': 0, '4–6': 0, '6–8': 0, '8–10': 0, '10–13': 0, '13–30': 0, '30–60': 0, '60–∞': 0} |
|   share of unanswered attempts re-launched to the same audience within 13 min | 0.0 |
| departure alone after an unanswered attempt: delay from its start | n 0 |
| first decision after an unanswered check: n; own trip chosen; same trip (alone); own trip top | 0; 0.0; 0.0; 0.0 |
|   chosen (share, top 6) | {} |

Night (rhythm-metrics, S27 quick): out/S27-rhythm.json: adults out of a nest 2.47% of night; T-RHY-5 0.0189; night deaths 0; deaths 0

**Reading by the registered rules.**
1. *departRetryMin decides* (rule 1): at 57.3% of give-ups an own trip (to another tree: the tree just given up carries
   the finished penalty and is never the top) would be the initiator's top option without the hold; it does instead what
   it can do with its companions (a crown in view 38%, rest 16%, another's trip 12%, ground forage 12%). Over the whole
   hold, 3.05 decisions per animal-day are blocked while an own trip is best.
2. *What sets the re-launch delay* (rule 2): the bout of the act chosen at the give-up. The first decision after the hold
   comes a median 9.45 min after its end (within 1 min in 10%), and an own trip is then chosen in 15%. Re-launches after a
   give-up (1,075) fall at 4.75–13.0 min start to start (median 7.75, mean 7.97) against the field's 0–13 (mean 3.80, 9
   cases): the floor is the check plus the hold (1 + 3.8 min, in ticks 4.75), the ceiling is the cap (a later trip
   starts a new effort).
3. *departPersistMaxMin* (rule 3): 7.3% of efforts with a failure end alone at the cap (0.21 departures per adult-day;
   adult males 0.35), 13.5 min (median) after the last failure: "rarely" by the rule. 87.6% of failed efforts lapse: the
   initiator's next own trip comes more than 13 min after its failure.
4. *The check* (rule 4): 87.1% of recruitments come in the first tick and all within the window (by construction): by
   the rule the window binds a few (13% at 0.5–1 min); for failed attempts it sets the minute the initiator stands.
5. *Values* (rule 5): at the attempt the trip is worth 0.53 against 0.50 for the best other option (margin 0.034; given
   up 0.013); the initiator's hunger 0.32, relative reserve −0.02, social need 0.47; the audience's best companyValue
   0.52 (presentCompany 0.46). At give-ups where an own trip would be top, the company it would leave (median 0.44)
   exceeds the trip's margin over the top (median 0.094, p90 0.29) in 86%: a valuation with the company in it would
   mostly keep the initiator, as the hold does now, and send it alone in the rest.
6. *The audience* (rule 6): 82% of audience members decide during an attempt and 69% of those are offered the join, but
   17% join: joining is outvalued (top minus the join option: median 0.17); they rest, feed in their crown, start their
   own trips or join someone else's.
7. *Fission* (rule 7): own trips make 17% of pair splits (recruited 9.9%, no audience 2.8%, alone at the cap 2.6%, open
   attempts 1.5%); joined trips (34%) and approaches to callers (13%) make more.

**What the two timers decide, in three lines.** `departRetryMin` decides what a failed initiator does next: at 57% of
give-ups it removes the initiator's best option (3.05 blocked decisions per animal-day) and sets the re-launch floor
(4.75 min; the model's re-launches 4.75–13, median 7.75, against the field's 0–13, mean 3.8). `departPersistMaxMin`
sends 7% of failed efforts off alone (0.21 per adult-day) and cuts the delay distribution at 13 min; 88% of failed
efforts lapse. At those give-ups the company the initiator would leave (0.44) outweighs the trip's margin (0.09) in 86%.

### 2.2 Amendment: timer-free readouts (registered before the re-run; measurement only)

The readouts of §2 are partly defined by the timers themselves (an "effort" ends at the cap or lapses after 13 min), so an
arm without the timers cannot be read on them. Added to the tool (header): every own-trip event in time order, and for
each unanswered attempt (nobody joined or followed within the check) the initiator's **next own-trip event**: a
re-launch to the same audience (an attempt sharing at least one audience member: the source's "to the same audience"),
an attempt to a new audience, a departure alone (with an audience present: the cap's departure, or a continued trip), a
departure with no audience, or none; its delay start to start. Also the initiator's first decision after an unanswered
check (what it chose; whether an own trip was the top). The tool's summary defect (above) is fixed. The S27 diagnosis is
re-run with the amended tool from a frozen checkout of the commit that adds this section (the same simulation: the
identity check is repeated); these readouts are the ones arms are compared on.

### 2.3 The timer-free readouts on S27 (frozen checkout of 8a7c36e, clean; the same worlds: T-PTY-1 per seed 5.032 / 4.529)

Printed by the stage's table script from `S27b-depart.json` (every earlier readout is identical to §2.1's run):

| first decision after the hold within 1 min of its end (share) | 0.102 |
| give-ups where the own trip would be top and company max > its margin over the top (share of those top) | 0.856 |
| give-ups where own trip top: margin over top (median, p90); company max (median) | 0.094, 0.286; 0.441 |
| attempts given up: trip − stay at the attempt (median, p10, p90) | 0.013, -0.093, 0.176 |
| attempts by day / night (share at night) | 0.032 |
| unanswered attempts: n; next own-trip event (share) | 10271; {'re-launch (same audience)': 0.736, 'attempt, new audience': 0.106, 'no audience': 0.087, 'alone (alone)': 0.067, 'none (window end)': 0.004} |
| re-launch to the same audience: delay start to start | n 7558, mean 140.51, median 53.50, p10–p90 10.75–314.50, min–max 4.75–2809.00 |
|   bins (min) | {'0–1': 0, '1–2': 0, '2–4': 0, '4–6': 317, '6–8': 188, '8–10': 178, '10–13': 277, '13–30': 916, '30–60': 2253, '60–∞': 3429} |
|   share of unanswered attempts re-launched to the same audience within 13 min | 0.093 |
| departure alone after an unanswered attempt: delay from its start | n 692, mean 13.61, median 14.50, p10–p90 7.50–17.00, min–max 4.75–17.75 |
| first decision after an unanswered check: n; own trip chosen; same trip (alone); own trip top | 10271; 0.025; 0.004; 0.028 |
|   chosen (share, top 6) | {'crown': 0.371, 'rest': 0.152, 'joined trip': 0.114, 'ground forage': 0.112, 'groom': 0.05, 'to callers': 0.036} |

- After an unanswered attempt (10,271), the initiator's next own trip is a re-launch to the same audience in 74% of
  cases, but a median 54 min later (within 13 min in 9%); an attempt to a new audience 11%, a departure with no audience
  9%, a departure alone from the same companions (the cap) 7%, a median 14.5 min after the failed attempt started.
- At its first decision after the unanswered check (the hold on), an own trip is the top of what is offered in 3%
  (when the audience has gone, the hold lifts) and it chooses a crown in view 37%, rest 15%, another's trip 11%, ground
  forage 11%.

## 3. Mechanism (step 2): `departValue`, iteration 1 (registered 4 October 2026 before any run of it)

**Principle.** An initiator's attempt is a proposal: it sets off and checks whether the companions come (C13e's joined
trip and party follow, each companion valuing the leader's company and the food at its tree, E5a). When none comes, it
has learned that these companions, doing what they are doing, do not come now. From then on a departure leaves them: it
is worth the trip's value (food under its own drive and belief, E3c/E3e) less the company it would leave (E5a's
companyValue: its social drive × C13e's join terms, plus a fertile female's mating value for a male; E5b's margin over
the company it would have at the goal, which it cannot see). Proposing again to the same companions doing the same
things would get the same answer; when they change (a companion arrives, leaves, or changes what it is doing: what the
initiator perceives), a departure is a proposal again. So re-launching and leaving alone follow from the initiator's
valuation and from what its companions do, with no waiting time and no deadline. Directions: initiators wait and check
back, and some re-launch to the same audience after a failure [M: gruberZuberbuhler2013]; company is valued by the
animal's social state [E5a, cabanac1971]. Every magnitude is an existing design term; no new parameter but the switch.

**Change (switch `departValue`, 0 = today in both profiles; read only with `departPersist` 1; field profile).**
- *The check* (`departCheckMin`, 1 min, design) stays. A companion who joins or follows within it ends the attempt as
  now (recruited).
- *Nobody came* (execution.ts `departWait`): instead of giving up, the initiator records what it perceives of its
  audience (departAudience's set: own-community animals of 12 y or more within the party link, not asleep; who is there
  and each one's act and target, as one number, candidates.ts `audienceSig`, in chimp.sim.dfa) and decides at once (an
  urgent interrupt; its trip's continuation terms are neutral: the scheduled end is now, the act not finished). From its
  own finished nest (E2e) it is back in that nest, deciding now (`resumeNest` until now).
- *While the audience is as recorded* (candidates.ts): every own trip to a tree is worth its value less `lost` = the best
  companyValue among the audience (`audienceCompany`), and a trip started then goes alone (execution.ts `departAttempt`:
  no attempt). Continuing the trip it stands in is such a departure.
- *Once the audience differs* (or the animal has none), trips are valued as before and a trip with an audience is an
  attempt again: a re-launch.
- *Not read:* `departRetryMin` (no hold) and `departPersistMaxMin` (no cap, no effort). Prescriptions on S27 42 → 40
  (prescription-ledger `--count`; ACTIVE_WHEN in scripts/lib/prescriptions.ts; tests/sim-depart-value.test.ts traces a
  field half-day: neither is read, `departCheckMin` is).
- State: one lazy key, chimp.sim.dfa (an integer below 2³², JSON-safe), in OPTIONAL_X. Switch off: today's code path,
  bit for bit (the field pin and the compressed goldens hold; the diagnostic tap `departTap` is null in every run).

**Design assumptions (labelled).** That an unanswered attempt is information about the audience until it changes; that
"changes" means membership or any member's act or target; one companion's worth (the best) as the company left, as E5a
and E5b count it; that the change is noticed at the initiator's own next decision point (no interrupt on a change:
iteration 1). The check window and the audience definition are unchanged design assumptions of the moving-together stage.

**Not built, with reasons.** (a) The company as a cost of every departure (E5a iteration 1 froze parties): here it applies
only after an unanswered attempt and only while the audience is unchanged. (b) A probability of recruitment estimated by
the initiator: it would need a model of others' choices with a time scale (a timer in disguise). (c) An interrupt when
the audience changes: would make re-launches sooner; held for iteration 2 if the diagnosis of A1 shows the initiator's
own decision cadence, not its valuation, sets the delays.

**Smoke test (done before this registration; disclosed; seed 48, 1 + 2 days, S27 + the switch; not a result).** The
readouts fill and the mechanism runs: at the first decision after an unanswered check an own trip is chosen in 10%
(S27's smoke 5%), continuing the same trip 1.7%; departures alone after an unanswered attempt a median 1.25 min after its
start (S27 14); re-launches to the same audience within 13 min 11% (S27 9.5%), the shortest 1 min (S27 4.75). Unit tests
(tests/sim-depart-value.test.ts, 4) pass; the field pin, party-food, ledger and pre-dawn tests pass with the switch off.

**Arm A1** = S27 (S27q-params.json) + `departValue` 1, from a frozen detached checkout of the commit that adds this
section: e-bench `--quick` (seeds 48 and 7, burn-in 30, 30 days), energy-diagnose, depart-diagnose and rhythm-metrics
(same seeds and window); `--workers 2`, 1 above load 8. **Reference:** the integrator's four S27 quick realizations
(S27q, S27q1–3; e-bench and energy-diagnose); depart-diagnose and rhythm-metrics on the same four parameter sets run
here from the same frozen checkout (the switch is off in them: today's code path).

**Judging (e-noise.md amendment 2, amendment 3).** `REFS=<S27q, S27q1, S27q2, S27q3 .json> judge_vs_reps.py quick custom
A1.json`: fitted, held-out, held-out without T-HUN-4, T-BRD-1 and T-IGE-3; |z| > 2 a result. Readouts against the four
runs' mean ± SD.

**Predictions (A1 against the S27 group; low confidence unless stated).**

| Quantity | S27 (group mean ± SD; the diagnosis where single) | A1 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 42 | 40 | high |
| Viability; night (adults out of a nest; T-RHY-5) | pass; 2.47%, 0.019 (S27q) | pass; ≤ 3.3%, ≤ 0.033 | moderate |
| Attempts per adult-day | 6.6 (S27q diagnosis) | 5–8 | moderate |
| Success share | 0.41 | 0.35–0.45 | moderate |
| After an unanswered attempt: own trip chosen at the next decision | 3% (hold) | 5–20% | moderate |
| Departure alone from the same companions (share of unanswered attempts) | 7% (the cap), median 14.5 min after the start | 3–15%, median below 5 min | low |
| Re-launch to the same audience within 13 min (share of unanswered) | 9% | 5–20% | low |
| Re-launch delay, start to start (same audience, all) | median 54 min; within 13 min no shorter than 4.75 | shortest below 4.75; median 20–80 min | low |
| T-PTY-1 | 4.59 ± 0.15 | 4.2–5.0 | low |
| T-ACT-2 | 0.116 ± 0.009 | 0.10–0.13 | low |
| T-FOOD-10 | 0.59 ± 0.06 | 0.45–0.70 | low |
| Reserves %/day: males, nursing mothers, juveniles | +0.002, −0.000, −0.027 | each within 0.03 of the mean | low |
| Fitted; held-out, with and without the rare rows | group mean | inside noise | moderate |

**Kill criterion (registered).** Null if (a) viability fails (a starvation death, or a seed below 80% of its start); (b)
any class's reserve slope (energy-diagnose: adult males, other females, nursing mothers, juveniles 5–12 y) is more than
0.05% of the store a day below the S27 group mean; (c) held-out is worse beyond noise (z > +2) with or without the rare
rows; (d) night safety fails (adults out of a nest > 3.3% of the night, or T-RHY-5 > 0.033); (e) the mechanism does not
run (no first decision after an unanswered check with an own trip on the menu, or `departRetryMin` / `departPersistMaxMin`
still read).

**Verdict rule (registered).** `departValue` removes two counted prescriptions, so the track's keep rule applies: viable,
held-out (both row sets) not worse beyond noise, prescriptions down (42 → 40), night safe: a **provisional keep
candidate** for the integrator's 5-seed confirm; otherwise recorded, off. Party size, travel, departures before sunrise,
re-launch delays and the go-alone share are reported against the reference, never used to choose.

**Known defects in the code under test (deferred, file:line at this commit).**
- `src/sim/execution.ts` departWait: a recruit is any own-community animal joining or following, of any age, while the
  audience counts animals of 12 y or more (moving-together design; unchanged).
- `src/sim/execution.ts` departAttempt: an attempt whose initiator is interrupted and switches act during the check keeps
  `tryN` until its next trip (harmless: only a travelling initiator checks); the tool counts it "interrupted".
- `src/sim/candidates.ts` audienceSig: a companion moving within its crown keeps its act and target (no change); one
  re-targeting the same act to another tree is a change (by definition).

## 5. Iteration log

(Each iteration is logged here and committed before its run; at most 3.)

- **Iteration 1** (`departValue` 1, §3; arm A1): registered and committed with the code before any run of it (368356f);
  run from a frozen checkout of 368356f (clean). Reference diagnostics (depart-diagnose and rhythm-metrics on S27q1–3,
  switch off) from the same checkout. Results §6.1.
- **Iteration 2** (`departValue` 2, §5.2; arm A2): registered and committed with the code before any run of it (this
  commit). Disclosed: two unit tests and a 2-day smoke test (seed 48) ran on the iteration-2 code before this commit
  (§5.2), and one probe of A1's code (below) was read.

### 5.1 What A1 showed that iteration 2 addresses (read from A1's runs before registering iteration 2)

A1 passes every registered criterion (§6.1), with two defects of its own definitions, found reading its runs:
- **Company counted twice in the nest.** In the dark phases staying in a finished nest is already worth the company of
  the nest-mates (E2e `nestCompany`, with E3e's rule: awake nest-mates count until the day phase). A1 also charges the
  best awake audience member's company to every trip after an unanswered nest attempt, so a failed nest initiator is
  held by the same company twice: after an unanswered nest attempt A1's next own trip is a re-attempt a median 55 min
  later (168), a departure alone (38) or with no audience (34), against S27's re-attempt at the hold's end, 4.75 min (231).
- **Companions in transit are watched as company.** The audience includes companions on their way somewhere (travelling
  or following); their act or target changes within minutes, so the audience "changes" for reasons that do not bear on
  the company the initiator keeps by staying. A1 re-launches to the same audience within 2 min after 9% of unanswered
  attempts (925 of 10,324). A probe of A1's code (S27 + `departValue` 1, seed 48, 3 days after a 3-day burn-in; script
  kept in the stage's scratch, not committed; disclosed, not a result): of 75 re-launches within 0.5 min of the check's
  end, the changes before them were a companion in transit changing target (24), one arriving at its crown and starting
  to feed (22), one leaving the party link (18), and single others.

### 5.2 Iteration 2 (registered before its run): the company the animal has, as E5b defines it (`departValue` 2)

**Change (same switch, value 2; candidates.ts `audienceOf` with `settled`, `audienceSig`, `audienceCompany`).** As
iteration 1, except that both the audience the initiator watches and the company it would leave are taken over its
**settled** audience: departAudience's set without the companions travelling, following or in a nest (E5b's settled
companion: the company staying keeps; the nest-mates' company is already in the nest's own value, E2e). Whether a trip
is an attempt is still decided by the whole audience (departAudience: anyone who could join). Consequences by
construction: after an unanswered nest attempt the initiator weighs the trip against the nest with its nest-mates'
company once; companions changing course in transit do not re-open attempts; a companion settling in, or a settled one
leaving or changing what it does, does. No new magnitude; prescriptions as iteration 1 (42 → 40).

**Smoke test (done before this registration; disclosed; seed 48, 1 + 2 days; not a result).** The mechanism runs (own
trip chosen at 12.8% of first decisions after an unanswered check; going alone after 10.6% of unanswered attempts,
median 1 min after the start; re-launches to the same audience within 2 min 20 of 366, A1's smoke 24 of 350). Unit tests
(tests/sim-depart-value.test.ts, 6 with iteration 2's) pass.

**Arm A2** = S27 + `departValue` 2: e-bench `--quick`, energy-diagnose, depart-diagnose and rhythm-metrics (seeds 48 and
7, 30 + 30), from a frozen checkout of this commit; judged against the S27 group as A1 (§3).

**Predictions (A2 against the S27 group, and against A1 where stated; low confidence unless stated).**

| Quantity | S27 group / A1 | A2 | Confidence |
| --- | --- | --- | --- |
| Prescriptions | 42 / 40 | 40 | high |
| Viability; night (adults out of a nest; T-RHY-5) | pass; 2.47%, 0.019 / A1 2.47%, 0.019 | pass; ≤ 3.3%, ≤ 0.033 | moderate |
| After an unanswered nest attempt, a departure alone (share; median delay) | S27 13%, 4.75 min / A1 16%, 1 min | above A1's; ≤ 2 min | moderate |
| Departures before sunrise (rhythm-metrics, all adults) | S27 0.52 / A1 0.53 | 0.50–0.62 | low |
| Re-launches to the same audience within 2 min (share of unanswered) | A1 9.0% | below A1's | low |
| Going alone after an unanswered attempt (share) | S27 6.7% / A1 11.1% | ≥ A1's | moderate |
| T-PTY-1 | 4.59 ± 0.15 / A1 3.96 | 3.6–4.4 | low |
| Reserves %/day, every class | S27 mean | within 0.03 of the mean | low |
| Fitted; held-out with and without the rare rows | S27 mean | inside noise | moderate |

**Kill criterion and verdict rule:** as iteration 1 (§3), unchanged. If A1 and A2 both pass, A2 is recommended on the
registered grounds (no double count of the nest company; transit not taken for company), never on fitted rows; if A2
fails, A1 stands as recorded with these two defects listed.

## 6. Results

### 6.1 Iteration 1: A1 = S27 + `departValue` 1 (frozen checkout of 368356f, clean)

Printed by the stage's `e5f_judge.py` (copied to `artifacts/validation/e5f/`) from the e-bench, energy-diagnose,
depart-diagnose and rhythm-metrics JSON of A1 and of the four S27 quick realizations (their e-bench and energy-diagnose
are the integrator's, bench-run3 28d249e; their depart-diagnose and rhythm-metrics were run here from the same frozen
checkout with the switch off; identity: each run's T-PTY-1 by the tool equals its e-bench T-PTY-1). The re-launch and
going-alone readouts are the timer-free ones (§2.2): after each unanswered attempt, the initiator's next own trip; "≤ 13
min" is the field's window.

```
S27q: 28d249e dirty 0 prescriptions 42 viability pass
  S27q1: 28d249e dirty 0 prescriptions 42 viability pass
  S27q2: 28d249e dirty 0 prescriptions 42 viability pass
  S27q3: 28d249e dirty 0 prescriptions 42 viability pass
  A1: 368356f dirty 0 prescriptions 40 viability pass

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | A1.json: 2.46, Δ +0.59, z +0.7 (inside noise)
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | A1.json: 3.89, Δ +0.08, z +0.1 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | A1.json: 3.75, Δ +0.14, z +0.3 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.11±0.02 | A1.json 0.00 (pass)
   T-HUN-4   held-out ref 0.21±0.41 | A1.json 0.15 (fail)
   T-HUN-8   held-out ref 0.25±0.17 | A1.json 0.89 (fail)

| readout | S27 runs (S27q, q1, q2, q3) | S27 mean ± SD | A1 |
| --- | --- | --- | --- |
| attempts/adult-day | 6.600 / 6.798 / 6.669 / 6.436 | 6.626 ± 0.150 | 6.513 (z -0.7) |
| success | 0.405 / 0.404 / 0.410 / 0.386 | 0.401 ± 0.010 | 0.376 (z -2.2) |
| relaunch delay median | 53.500 / 52.250 / 50.750 / 54.000 | 52.625 ± 1.451 | 44.250 (z -5.2) |
| relaunch delay min | 4.750 / 4.750 / 4.750 / 4.750 | 4.750 ± 0.000 | 1.000 |
| relaunch delay max | 2809.000 / 2361.000 / 2233.500 / 1605.250 | 2252.187 ± 496.910 | 2398.500 (z +0.3) |
| relaunch ≤13 min: median | 7.750 / 7.500 / 7.500 / 7.500 | 7.563 ± 0.125 | 2.000 (z -39.8) |
| relaunch ≤13 min: mean | 7.980 / 7.897 / 7.757 / 7.812 | 7.861 ± 0.098 | 3.941 (z -35.9) |
| relaunch ≤13 min (share of unanswered) | 0.093 / 0.104 / 0.108 / 0.103 | 0.102 ± 0.006 | 0.176 (z +10.7) |
| relaunch (share of unanswered) | 0.736 / 0.731 / 0.724 / 0.736 | 0.732 ± 0.006 | 0.708 (z -3.9) |
| go alone (share of unanswered) | 0.067 / 0.074 / 0.071 / 0.073 | 0.071 ± 0.003 | 0.111 (z +11.9) |
| go alone delay median | 14.500 / 14.750 / 14.500 / 14.750 | 14.625 ± 0.144 | 1.000 (z -84.4) |
| no audience next (share) | 0.087 / 0.088 / 0.092 / 0.086 | 0.088 ± 0.002 | 0.083 (z -1.9) |
| own trip at first decision after the check | 0.025 / 0.030 / 0.031 / 0.031 | 0.029 ± 0.003 | 0.177 (z +47.0) |
| T-PTY-1 (tool, identity) | 4.781 / 4.630 / 4.487 / 4.448 | 4.586 ± 0.151 | 3.957 (z -3.7) |
| pair splits/subject-day | 11.320 / 12.508 / 12.309 / 10.831 | 11.742 ± 0.799 | 10.347 (z -1.6) |
| pair joins/subject-day | 11.352 / 12.515 / 12.335 / 10.850 | 11.763 ± 0.795 | 10.363 (z -1.6) |
| pair time together | 0.184 / 0.196 / 0.192 / 0.178 | 0.188 ± 0.008 | 0.166 (z -2.4) |
| splits by own trips alone (share) | 0.026 / 0.029 / 0.024 / 0.025 | 0.026 ± 0.002 | 0.022 (z -1.7) |
| night out of nest % | 2.473 / 2.286 / 2.308 / 2.357 | 2.356 ± 0.084 | 2.475 (z +1.3) |
| T-RHY-5 | 0.019 / 0.017 / 0.018 / 0.017 | 0.018 ± 0.001 | 0.019 (z +1.6) |
| T-PTY-1 | 4.781 / 4.630 / 4.487 / 4.448 | 4.586 ± 0.151 | 3.957 (z -3.7) |
| T-ACT-2 | 0.116 / 0.121 / 0.125 / 0.103 | 0.116 ± 0.009 | 0.109 (z -0.7) |
| T-FOOD-10 | 0.599 / 0.643 / 0.607 / 0.503 | 0.588 ± 0.060 | 0.623 (z +0.5) |
| T-RNG-4 | 2.424 / 2.179 / 2.519 / 1.934 | 2.264 ± 0.262 | 2.170 (z -0.3) |
| T-ACT-1 | 0.378 / 0.377 / 0.378 / 0.368 | 0.375 ± 0.005 | 0.384 (z +1.6) |
| T-ACT-3 | 0.099 / 0.088 / 0.102 / 0.104 | 0.098 ± 0.007 | 0.093 (z -0.7) |
| T-ACT-4 | 0.418 / 0.406 / 0.410 / 0.450 | 0.421 ± 0.020 | 0.422 (z +0.0) |
| prescriptions | 42 / 42 / 42 / 42 | 42 ± 0.000 | 40 |
| reserves %/day: adult male | -0.002 / 0.007 / 0.001 / 0.003 | 0.002 ± 0.004 | 0.003 (z +0.1) |
| reserves %/day: female, lactating | 0.005 / -0.008 / -0.005 / 0.006 | -0.000 ± 0.007 | 0.006 (z +0.8) |
| reserves %/day: female, other | -0.017 / 0.008 / -0.007 / 0.038 | 0.006 ± 0.024 | 0.023 (z +0.6) |
| reserves %/day: juvenile 5–12 y | -0.015 / -0.016 / -0.019 / -0.059 | -0.027 ± 0.021 | 0.034 (z +2.6) |
| reserves %/day: infant 2–5 y | 0.007 / -0.036 / -0.016 / 0.001 | -0.011 ± 0.019 | 0.005 (z +0.7) |
| reserves %/day: infant 0.5–2 y | 0.012 / 0.011 / 0.006 / 0.007 | 0.009 ± 0.003 | 0.001 (z -2.1) |
| ground km: adult male | 2.873 / 2.983 / 2.858 / 2.532 | 2.811 ± 0.194 | 2.792 (z -0.1) |
| ground km: female, lactating | 2.437 / 2.448 / 2.565 / 2.461 | 2.478 ± 0.059 | 2.564 (z +1.3) |
| ground km: juvenile 5–12 y | 2.747 / 2.879 / 2.962 / 2.738 | 2.831 ± 0.108 | 2.802 (z -0.2) |
| deaths | 0 / 0 / 0 / 0 | 0 ± 0.000 | 1 |
```

**Against the predictions (§3).** Prescriptions 40: held. Viability and night: held (one death, an illness; adults out
of a nest 2.48% of the night, T-RHY-5 0.019). Attempts 5–8 per adult-day: held (6.5). Success 0.35–0.45: held (0.38;
z −2.2 against the group's narrow spread). Own trip at the first decision after an unanswered check 5–20%: held (17.7%).
Going alone 3–15%, median below 5 min: held (11.1%, median 1.0 min; S27 7.1%, 14.6 min). Re-launch to the same audience
within 13 min 5–20%: held (17.6%); shortest below 4.75 min: held (1.0); median of all re-launches 20–80 min: held (44).
T-PTY-1 4.2–5.0: **missed** (3.96; z −3.7). T-ACT-2 0.10–0.13: held (0.109). T-FOOD-10 0.45–0.70: held (0.62).
Reserves within 0.03 of the mean: missed for juveniles (+0.061, better) and held for the others. Sums inside noise: held
(fitted z +0.7, held-out +0.1, without the rare rows +0.3).

**Mechanics.** With nothing held, the decision after an unanswered check goes to an own trip in 18% (continuing the same
trip 6%: departures alone, a median 1 min after the attempt began), and re-launches come sooner: within 13 min after
17.6% of unanswered attempts (S27 10.2 ± 0.6%), a median 2.0 min and a mean 3.9 min start to start (S27 7.6 and 7.9:
the check plus the hold; the field's 9 cases a mean 3.8; not used to judge). Those who leave alone are those with
little company to lose: at departures alone to another tree (the tap's values; continuing the same trip is not tapped)
the initiator's social need is 0.23 and the company left 0.17, against 0.48 and 0.55 at unanswered attempts. Parties are
smaller (T-PTY-1 3.96 against 4.59 ± 0.15; pair time together 0.166 against 0.188 ± 0.008) and more adults set off with
nobody in reach (2.22 own trips a day without an audience against 1.82 ± 0.14).

**Verdict by the registered rule:** A1 passes the keep rule (viable, held-out inside noise in both row sets, prescriptions
42 → 40, night safe): a provisional keep candidate. Side effect beyond the group's spread: smaller parties (a fitted row,
reported, not used to choose). The two defects of its definitions read from these runs (§5.1) are what iteration 2
addresses.

### 6.2 Iteration 2: A2 = S27 + `departValue` 2 (frozen checkout of 941986c, clean)

Printed by `e5f_judge.py` (A1 repeated beside it), as §6.1:

```
S27q: 28d249e dirty 0 prescriptions 42 viability pass
  S27q1: 28d249e dirty 0 prescriptions 42 viability pass
  S27q2: 28d249e dirty 0 prescriptions 42 viability pass
  S27q3: 28d249e dirty 0 prescriptions 42 viability pass
  A1: 368356f dirty 0 prescriptions 40 viability pass
  A2: 941986c dirty 0 prescriptions 40 viability pass

quick, reference custom (4 runs), rows counted in all runs: fitted 16, held-out 12
  fitted             (16 rows) ref 1.50, 2.68, 1.04, 2.26 (mean 1.87, sd 0.74; used 0.74) | A1.json: 2.46, Δ +0.59, z +0.7 (inside noise) | A2.json: 1.39, Δ -0.48, z -0.6 (inside noise)
  held-out           (12 rows) ref 4.27, 4.04, 3.73, 3.22 (mean 3.82, sd 0.46; used 1.26) | A1.json: 3.89, Δ +0.08, z +0.1 (inside noise) | A2.json: 4.58, Δ +0.76, z +0.5 (inside noise)
  held-out w/o rare  (11 rows) ref 3.45, 4.04, 3.73, 3.22 (mean 3.61, sd 0.36; used 0.48) | A1.json: 3.75, Δ +0.14, z +0.3 (inside noise) | A2.json: 3.15, Δ -0.46, z -0.9 (inside noise)
  rows whose arm value is beyond 2 SD of the reference runs (SD floor 0.05), or rare rows:
   T-COM-8   fitted   ref 0.11±0.02 | A1.json 0.00 (pass) | A2.json 0.02 (fail)
   T-HUN-4   held-out ref 0.21±0.41 | A1.json 0.15 (fail) | A2.json 1.43 (fail)
   T-HUN-8   held-out ref 0.25±0.17 | A1.json 0.89 (fail) | A2.json 0.00 (pass)

| readout | S27 runs (S27q, q1, q2, q3) | S27 mean ± SD | A1 | A2 |
| --- | --- | --- | --- | --- |
| attempts/adult-day | 6.600 / 6.798 / 6.669 / 6.436 | 6.626 ± 0.150 | 6.513 (z -0.7) | 6.333 (z -1.7) |
| success | 0.405 / 0.404 / 0.410 / 0.386 | 0.401 ± 0.010 | 0.376 (z -2.2) | 0.363 (z -3.3) |
| relaunch delay median | 53.500 / 52.250 / 50.750 / 54.000 | 52.625 ± 1.451 | 44.250 (z -5.2) | 47.750 (z -3.0) |
| relaunch delay min | 4.750 / 4.750 / 4.750 / 4.750 | 4.750 ± 0.000 | 1.000 | 1.000 |
| relaunch delay max | 2809.000 / 2361.000 / 2233.500 / 1605.250 | 2252.187 ± 496.910 | 2398.500 (z +0.3) | 1603.250 (z -1.2) |
| relaunch ≤13 min: median | 7.750 / 7.500 / 7.500 / 7.500 | 7.563 ± 0.125 | 2.000 (z -39.8) | 3.250 (z -30.9) |
| relaunch ≤13 min: mean | 7.980 / 7.897 / 7.757 / 7.812 | 7.861 ± 0.098 | 3.941 (z -35.9) | 4.550 (z -30.3) |
| relaunch ≤13 min (share of unanswered) | 0.093 / 0.104 / 0.108 / 0.103 | 0.102 ± 0.006 | 0.176 (z +10.7) | 0.137 (z +4.9) |
| relaunch (share of unanswered) | 0.736 / 0.731 / 0.724 / 0.736 | 0.732 ± 0.006 | 0.708 (z -3.9) | 0.695 (z -6.0) |
| go alone (share of unanswered) | 0.067 / 0.074 / 0.071 / 0.073 | 0.071 ± 0.003 | 0.111 (z +11.9) | 0.125 (z +16.1) |
| go alone delay median | 14.500 / 14.750 / 14.500 / 14.750 | 14.625 ± 0.144 | 1.000 (z -84.4) | 1.000 (z -84.4) |
| no audience next (share) | 0.087 / 0.088 / 0.092 / 0.086 | 0.088 ± 0.002 | 0.083 (z -1.9) | 0.083 (z -1.9) |
| own trip at first decision after the check | 0.025 / 0.030 / 0.031 / 0.031 | 0.029 ± 0.003 | 0.177 (z +47.0) | 0.158 (z +41.0) |
| T-PTY-1 (tool, identity) | 4.781 / 4.630 / 4.487 / 4.448 | 4.586 ± 0.151 | 3.957 (z -3.7) | 4.273 (z -1.9) |
| pair splits/subject-day | 11.320 / 12.508 / 12.309 / 10.831 | 11.742 ± 0.799 | 10.347 (z -1.6) | 9.583 (z -2.4) |
| pair joins/subject-day | 11.352 / 12.515 / 12.335 / 10.850 | 11.763 ± 0.795 | 10.363 (z -1.6) | 9.605 (z -2.4) |
| pair time together | 0.184 / 0.196 / 0.192 / 0.178 | 0.188 ± 0.008 | 0.166 (z -2.4) | 0.172 (z -1.7) |
| splits by own trips alone (share) | 0.026 / 0.029 / 0.024 / 0.025 | 0.026 ± 0.002 | 0.022 (z -1.7) | 0.028 (z +0.8) |
| night out of nest % | 2.473 / 2.286 / 2.308 / 2.357 | 2.356 ± 0.084 | 2.475 (z +1.3) | 2.484 (z +1.4) |
| T-RHY-5 | 0.019 / 0.017 / 0.018 / 0.017 | 0.018 ± 0.001 | 0.019 (z +1.6) | 0.020 (z +2.2) |
| T-PTY-1 | 4.781 / 4.630 / 4.487 / 4.448 | 4.586 ± 0.151 | 3.957 (z -3.7) | 4.273 (z -1.9) |
| T-ACT-2 | 0.116 / 0.121 / 0.125 / 0.103 | 0.116 ± 0.009 | 0.109 (z -0.7) | 0.117 (z +0.1) |
| T-FOOD-10 | 0.599 / 0.643 / 0.607 / 0.503 | 0.588 ± 0.060 | 0.623 (z +0.5) | 0.650 (z +0.9) |
| T-RNG-4 | 2.424 / 2.179 / 2.519 / 1.934 | 2.264 ± 0.262 | 2.170 (z -0.3) | 2.430 (z +0.6) |
| T-ACT-1 | 0.378 / 0.377 / 0.378 / 0.368 | 0.375 ± 0.005 | 0.384 (z +1.6) | 0.366 (z -1.8) |
| T-ACT-3 | 0.099 / 0.088 / 0.102 / 0.104 | 0.098 ± 0.007 | 0.093 (z -0.7) | 0.092 (z -0.8) |
| T-ACT-4 | 0.418 / 0.406 / 0.410 / 0.450 | 0.421 ± 0.020 | 0.422 (z +0.0) | 0.444 (z +1.0) |
| prescriptions | 42 / 42 / 42 / 42 | 42 ± 0.000 | 40 | 40 |
| reserves %/day: adult male | -0.002 / 0.007 / 0.001 / 0.003 | 0.002 ± 0.004 | 0.003 (z +0.1) | 0.000 (z -0.5) |
| reserves %/day: female, lactating | 0.005 / -0.008 / -0.005 / 0.006 | -0.000 ± 0.007 | 0.006 (z +0.8) | -0.020 (z -2.6) |
| reserves %/day: female, other | -0.017 / 0.008 / -0.007 / 0.038 | 0.006 ± 0.024 | 0.023 (z +0.6) | -0.005 (z -0.4) |
| reserves %/day: juvenile 5–12 y | -0.015 / -0.016 / -0.019 / -0.059 | -0.027 ± 0.021 | 0.034 (z +2.6) | -0.028 (z -0.1) |
| reserves %/day: infant 2–5 y | 0.007 / -0.036 / -0.016 / 0.001 | -0.011 ± 0.019 | 0.005 (z +0.7) | -0.018 (z -0.3) |
| reserves %/day: infant 0.5–2 y | 0.012 / 0.011 / 0.006 / 0.007 | 0.009 ± 0.003 | 0.001 (z -2.1) | -0.022 (z -8.5) |
| ground km: adult male | 2.873 / 2.983 / 2.858 / 2.532 | 2.811 ± 0.194 | 2.792 (z -0.1) | 2.876 (z +0.3) |
| ground km: female, lactating | 2.437 / 2.448 / 2.565 / 2.461 | 2.478 ± 0.059 | 2.564 (z +1.3) | 2.727 (z +3.8) |
| ground km: juvenile 5–12 y | 2.747 / 2.879 / 2.962 / 2.738 | 2.831 ± 0.108 | 2.802 (z -0.2) | 3.220 (z +3.2) |
| deaths | 0 / 0 / 0 / 0 | 0 ± 0.000 | 1 | 0 |
```

Printed from the per-seed records by the stage's scripts (§5.1's readouts): after an unanswered attempt from the
initiator's own nest the next own trip is a departure alone in 116 of 267 (43%, a median 1 min after the attempt began),
a re-attempt in 116 (median 50 min) and a departure with no audience in 35 (A1: 38 of 240 alone, 168 re-attempts at a
median 55 min; the S27 runs: 15–17% alone and re-attempts at 4.75 min, the hold's end); re-launches to the same
audience within 2 min after 5.6% of unanswered attempts (A1 9.1%, the S27 runs 0). Departures before sunrise (all
adults, rhythm-metrics): A2 0.55, A1 0.53, the S27 runs 0.49–0.52.

**Against the predictions (§5.2).** Prescriptions 40: held. Viability and night: held (no death; adults out of a nest
2.48% of the night, T-RHY-5 0.020, z +2.2 against the group's narrow spread, below the 0.033 line). Departures alone after
an unanswered nest attempt above A1's, within 2 min: held (43%, 1 min). Departures before sunrise 0.50–0.62: held (0.55).
Re-launches within 2 min below A1's: held (5.6% against 9.1%). Going alone at least A1's: held (12.5% against 11.1%).
T-PTY-1 3.6–4.4: held (4.27; z −1.9). Reserves within 0.03 of the mean: held for every class but infants of 0.5–2 y
(−0.022 against +0.009 ± 0.003: 0.031 below; z −8.5); nursing mothers −0.020 (z −2.6). Sums inside noise: held (fitted
z −0.6, held-out +0.5, without the rare rows −0.9).

**Costs beyond the group's spread (reported, inside the kill lines).** Nursing mothers walk 2.73 km a day (2.48 ±
0.06; walking +7 kcal, carrying +2 kcal a day) and juveniles 3.22 (2.83 ± 0.11): mothers leave alone after unanswered
attempts 0.42 times a day (the S27 runs 0.11–0.15, A1 0.26) and juveniles set off with nobody in reach 3.1 times a day
(2.0–2.2; A1 2.3). Mothers' reserve trend −0.020 %/day (z −2.6) and their infants' of 0.5–2 y −0.022 (z −8.5).

**Verdict by the registered rule:** A2 passes the keep rule (viable, held-out inside noise in both row sets, prescriptions
42 → 40, night safe): a provisional keep candidate; by §5.2's rule it is the one recommended (no double count of the
nest company; companions in transit not taken for company), with the costs above.

## 7. Stage verdict

- **Diagnosis (S27, quick, simulation truth).** `departRetryMin` decides what a failed initiator does next: at 57% of
  give-ups it removes the initiator's best option (an own trip to another tree; 3.05 such decisions per animal-day), and
  the bout of what it does instead (a crown in view, rest, another's trip) then sets when it can try again; inside an
  effort re-launches fall at 4.75–13 min (median 7.75), the floor the check plus the hold, the ceiling the cap, against
  the field's 0–13 (mean 3.8, 9 cases). `departPersistMaxMin` sends 7% of failed efforts off alone (0.21 departures a
  day per adult), 14.5 min after the failed attempt began. At those give-ups the company the initiator would leave
  (median 0.44) exceeds the trip's margin over the best other option (median 0.094) in 86%.
- **Mechanism.** `departValue` (off by default): an attempt nobody answers within the check ends in the initiator's own
  decision. It notes what its companions are doing; while they are as noted, every own trip is a departure alone, worth
  its value less the company it leaves (E5a's companyValue, the best companion; E5b's margin, nothing known at a goal out
  of sight); once they change, a trip is an attempt again. No hold, no cap: two counted prescriptions out (S27 42 → 40
  with the ledger at this branch's base; 41 → 39 with track-e's corrected ledger, §8). Iteration 1 (A1) watched the whole
  audience and charged its company; iteration 2 (A2) takes both over the settled audience (E5b's settled companion), which
  removes a double count of nest-mates' company and stops companions in transit from re-opening attempts.
- **Result (quick, against S27's four realizations).** Both pass the keep rule; every sum inside noise. Without the timers
  failed initiators re-launch sooner (within 13 min after 14–18% of unanswered attempts, a mean 3.9–4.6 min start to start;
  the S27 runs 10%, 7.9 min) and those with little company to lose leave alone at once (11–13% of unanswered attempts,
  median 1 min; the S27 runs 7%, 14.6 min). Costs: parties smaller in A1 (T-PTY-1 3.96 against 4.59 ± 0.15) and less so in
  A2 (4.27); in A2 nursing mothers and juveniles walk more (+0.25 and +0.39 km a day) and mothers' and young infants'
  reserve trends fall (−0.020 and −0.022 %/day, inside the kill line).
- **Recommendation.** A 5-seed confirm of S27 + `departValue` 2 (A2), with A1 as the registered alternative. Open:
  whether wild initiators leave alone after a failed attempt as often as the model's socially sated ones (the source does
  not say); the audience's choice, not the initiator's, still sets recruitment (17% of deciding companions join;
  success 0.36–0.38 against the field's 0.71 vocal and 0.34 silent); a companion in its nest in the day phase is neither
  company staying keeps nor company leaving loses in A2 (E5b's settled definition excludes nest-sitters; `candidates.ts`
  `audienceOf`, deferred).

## 8. Merge and final checks

- Merged `track-e` once (aa2889e: E3f integrated, the S28 confirm registered, the ledger's counting fix) before the final
  test run: conflicts only in the two appended addenda (research.md, e-sources.md), both kept (E3f's numbered E.56 / 56
  first, this stage's unnumbered addendum after).
- **Prescriptions with track-e's corrected ledger** (`ledgerWildCostMult` no longer counted): S27 41; S27 + `departValue`
  1 or 2: 39 (`prescription-ledger --count`). The arms' e-bench JSON, run before the merge, print the old count (S27 42,
  arms 40): the same two entries out either way.
- `gen-params --check` clean; `tsc --noEmit` clean; `pnpm test` 814 tests: 813 pass, 0 fail, 1 skipped.
