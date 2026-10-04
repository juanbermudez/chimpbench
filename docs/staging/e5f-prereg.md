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

(Sections below are filled in before each run.)
