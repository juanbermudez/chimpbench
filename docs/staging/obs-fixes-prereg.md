# obs-fixes: three measurement defects in the rare-event rows (registered 6 October 2026, 09:04 EDT, commit 8d0e4ae, before any code)

Branch `obs-fixes` (from `track-e` e0cf866). Owner: agent `obs-fixes`; the integrator merges. Scope: the virtual field
observer (`src/field/*`) and the benchmark scripts. Nothing in `src/sim` changes; `data/targets.json` is not edited here
(§7). Part D of `docs/staging/e-rebaseline.md` ("Measurement findings", 1–3) names the defects; each is checked against
the code below, at e0cf866, before any fix.

**Rule for every fix.** It must make the observer count what the row's written definition says. It is never chosen by
what it does to a simulated value, and no score, count or band distance of any model is read with a fix applied before
the fix and its tests are committed (§8 says what is run afterwards). The numbers quoted in this file are the ones
Part D already printed with today's code.

## 1. Defect 1: a failed infanticidal attack is counted as a killing

**The row.** T-LET-1 (`data/targets.json`), definition: "All intercommunity and within-community killings (observed +
inferred) ÷ community-years." Field: "pooled observed + inferred 0.23; incl. suspected 0.36; median across communities
≈ 0.08 (derived from Fig. 1); Kanyawara ≈ 0.08; Ngogo ≈ 1.67", n "152 killings", source wilson2014.

**The source in `docs/research.md`.** Line 225: "Lethal aggression across 18 communities and 426 community-years: 152
killings, 73% of victims male; median community rate ≈ 0.08 per year (derived) [wilson2014]." The unit is a killing: an
animal that died. (Context, not a source of the row: line 2233, lowe2019 at Budongo, counts "33 attacks on 30 victims
(11 definite infanticides, 4 almost certain, 9 suspected, 9 attempts)", attempts apart from infanticides.)

**What the code does now (verified).**
- `src/sim/execution.ts:299-304`: an infanticidal attack opens an interaction of kind `infanticide` when it *starts*,
  whatever its outcome. `src/sim/conflict.ts:304-328`: only when the infant is not defended and the kill roll succeeds
  does the sim write a second `infanticide` interaction (`flashInteraction`, :316), raise `stats.killings` (:317) and
  kill the infant (:319); otherwise the infant lives, wounded (:323-326).
- `src/field/protocols.ts:333-335`: every interaction a team detects is written to the event records under the
  interaction's own kind, so both the attack's start and the kill are `infanticide` events.
- `src/field/metrics.ts:1426-1431` (`killings`, behind T-LET-1, -2, -3): every `kill` or `infanticide` event is an
  observed killing, once per target. An attack the infant survived is therefore a killing.
- `src/field/metrics.ts:696-702` (T-LET-6): the same events without the once-per-target rule, so one observed
  infanticide can count twice (its start and its kill).
- `src/field/protocols.ts:173-186` (`onKillings`): when the kill counter moves, every `infanticide` interaction since
  the last check enters the truth list `truth.kills`, an attack's start included (Part D counted the extra entries).

The defect is as described.

**Fix.** The observer logs what it saw by its outcome. In `processInteractions` an `infanticide` interaction whose
target died in it (dead, cause "infanticide…", time of death equal to the interaction's start: `conflict.ts:316-319`
writes the kill's record and the death at one time; an attack's start, `execution.ts:302`, is at least 30 s before any
death, `execution.ts:778-779`) is recorded as `infanticide`; any other is recorded as `infanticide-attack`, which no row
counts. `onKillings` keeps only the fatal ones, one per victim. Detection (who sees or hears what) is unchanged.

**Tests** (`tests/field-obs-fixes.test.ts`, a world with a following team, the scene constructed as the existing
observer tests do): an attack on an infant that lives gives an `infanticide-attack` event, no killing in T-LET-1, no
entry in `truth.kills`; the same attack ending in the infant's death gives one killing and one truth entry.

## 2. Defect 2: killings in fights within a community

**The row.** T-LET-1, as above: "All intercommunity and within-community killings".

**What the code does now (verified; partly as described).**
- `src/sim/conflict.ts:255`: a loser of a fight between two members of one community can die of it (cause "wounds from
  a fight with …"). No `kill` interaction is written and `stats.killings` is not raised.
- **Inferred route: already counted.** `src/field/protocols.ts:124` marks such a death violent, and a carcass a team
  walks up to within 30 days (`protocols.ts:523-530`) is an inferred killing (`metrics.ts:1429`). Part D's sentence
  "not … in the observer's kill events" is right; "not counted" is too strong.
- **Observed route: missing.** A team that watches the fight has only a `fight` event; `killings` reads `kill` and
  `infanticide` events. If no team reaches the carcass, the death becomes a 30-day disappearance and is at most
  "suspected" (`protocols.ts:926-939`, `metrics.ts:1432-1435`), although a killing of a stranger detected the same way
  counts as observed.
- **Truth column: missing.** The truth value printed beside T-LET-1 is `stats.killings` over the window
  (`protocols.ts:989`, `metrics.ts:682`), which leaves these deaths out.

**Fix.**
- Observed route: when a contest inside a community that a team detected (an event of kind `fight`, or `coalition`:
  the two kinds `execution.ts:299-304` gives an attack on a community member) ends and one of its participants died of
  fight wounds while it lasted, the team logs a `fight-kill` event for that victim (same team and detection as the
  contest's event, once per victim). `killings` counts `kill`, `infanticide` and `fight-kill` events. The detection rule
  is the one every interaction already has; no new rule and no random draw.
- Truth: the observer's truth gains `fightKillings`, the deaths of fight wounds since observation started, read from
  the causes of death at the end of the run; T-LET-1's truth value becomes (`stats.killings` + `fightKillings`) ÷
  community-years. `truth.kills` keeps the sim's kill records only (gang attacks and infanticides: the attackers and
  defenders T-LET-3 needs), and `stats.killings` in `src/sim` is not touched.

**Tests.** A detected fight whose loser dies of its wounds gives a `fight-kill` event and one killing in T-LET-1, and
the truth value counts it; with the carcass also found it is still one killing; a fight death no team detected is in
the truth value and not in the observed count; a participant who dies of something else during a fight is not a
killing.

**Amendment 1 to defect 2 (6 October 2026, 09:29 EDT, commit 74d28a7; written after the first re-derivation on the saved 12-month runs,
before its code; attempt 2 of 3 on this defect).** What was seen: with the fix above, no `fight-kill` event arose in 60
saved seed-runs (three fight deaths). Two of the three were seen by no team (one carcass found, counted as before).
The third (M12-S39, seed 7) is a female who was a team's focal animal through ten minutes of charges, fights and
coalitions, every one logged, and died in the last of them: the observer's own record of that decided conflict says
`detected: true` (`protocols.ts` `onConflicts`, read every tick), yet the fatal contest has no event. Cause: interactions
are captured every second minute by the teams following *then* (`minuteStep`, `processInteractions`); the follow ends
within a minute of the focal's death, so a contest that started after the last capture is never logged. The registered
rule therefore misses exactly the killing a team watches most closely, against its stated purpose ("a team that watches
the fight"). This is an instrument error, not a result: the amendment is not chosen by a band (T-LET-1 for the S39
group reads 2 killings in 60 community-years without it and would read 3 with it; both are inside 0.02–0.36 and both
score "inconclusive").

Amended rule: a team detected the contest when it logged the contest's event (as registered) **or** when the
observer's decided-conflict record of the fatal contest is `detected` (a team's focal was the winner or the loser, or a
team stood within visibility of either, at the tick it was decided; the record every dominance and reconciliation row
already reads). The `fight-kill` event is written once per victim by whichever comes first. The saved-run upgrade
applies the same two routes; a decided-conflict record names no team, so an upgraded event carries the team of the
victim's community (no row reads a `fight-kill`'s team). Tests added: a focal that dies in a fight whose own event is
never captured is one observed killing; the upgrade adds the event from a saved decided-conflict record.

Found on the way and left alone (it touches every all-occurrence row): an interaction that starts in the last two
minutes before a follow ends is never logged.

## 3. Defect 3: T-DEM-9's census point lies outside a 365-day run

**The row.** T-DEM-9, definition: "Share of individuals > 3 y with a snare injury." Observer: "census", unit
"individual". Field: Ngogo "~10% of chimps > 3 y" (wood2017); Kanyawara "~29% …; about 1 in 3" (emeryThompson2020,
secondary); Budongo Sonso "26% with permanent snare injuries" (fedurek2022).

**The source in `docs/research.md`.** None of the three sources has a snare entry there (wood2017 is entered for the
life table, line 221, and leopards, line 1742; emeryThompson2020 for diet, line 227; fedurek2022 is absent). The snare
values exist only in the row's `field` list and in `docs/realism-design.md:198`. Reported under §9.

**What the code does now (verified).** `src/field/metrics.ts:1138-1147`: censuses at `t0 + k × 365.25 days`, while the
observer's own year is 365 days everywhere else (`src/field/derive.ts:48` and `:138`, community-years = days ÷ 365;
`metrics.ts:64` `obsYear`; T-PAT-9, `metrics.ts:654`; `scripts/e-bench.ts:115` `YEAR_DAYS`). A 365-day run ends 6 hours
before its first census, so the row returns "needs a full observation year" at 12 months; a three-year run (1,095 days)
gets censuses at 365.25 and 730.5 days and none at its end. The defect is as described.

**Fix.** The census year is the observation year, 365 days: censuses at `t0 + k × 365 days` up to the window's end. The
age threshold stays in age-years (365.25 days). A run shorter than 365 days still returns "needs a full observation
year".

**Test.** Constructed records: a 365-day run gives one census with the expected numerator and denominator; a 364-day
run returns insufficient with that reason; the existing two-year test stays as it is.

## 4. The same class of error in the neighbouring rows

Read: T-LET-2, -3, -6, T-PAT-9, T-DEM-1, -4, -5, -6, -7, -8 and the orphan rows T-DEM-16, -17, -18, -19, -24.

**Fixed here (a counting error against the row's own written definition):**
- **N1, T-LET-3** ("Attacking males vs defending males per intercommunity attack"). `metrics.ts:689-691` takes every
  observed or inferred killing's truth record, so a member's infanticide inside its own community enters with the
  killer's own companions as "defenders", and (defect 1) an infanticide can enter twice. Fix: records whose killer's
  community is not the victim's, one per victim.
- **N2, T-LET-6** ("Share of intercommunity killings by patrolling parties"). `metrics.ts:696-702` counts every `kill`
  and `infanticide` event, killings inside a community included, and both events of one infanticide. Fix:
  intercommunity killings only (a `kill` event is always one, `conflict.ts:235`; an `infanticide` event is one when the
  victim's community in the roster, or failing that its mother's, is not the killer's), once per victim.
- Tests: constructed event and truth lists for both.

**Found and left alone (listed for the user, §9):** T-LET-2's "share intercommunity" is not computed and a victim not on
the roster counts as not male; T-LET-3 counts one attacker for an infanticide by a stranger; a death recorded as
"complications of wounds" is aggression in T-DEM-4 but no killing in T-LET-1; an observed killing whose carcass is never
found has an unknown cause in T-DEM-4; T-DEM-6 and -7 count as outbreak deaths every death of an animal seen ill, a
carcass with another necropsy cause included; T-DEM-24 (sealed) needs the loss a full year before the run's end, so it
cannot close at 12 months, by its definition; a killing a team only heard counts as "observed". None is clearly a
counting error against the written definition, or the row is sealed.

**No defect found:** T-PAT-9 (its year is 365 days and closes), T-DEM-1 (life-table exposure), T-DEM-5 and T-DEM-8.

## 5. What changes in the records

- Event kinds: `infanticide-attack` (new; an attack the infant survived, or the start of one that killed), `fight-kill`
  (new). `infanticide` now means the infant died. The list of killing kinds is one constant shared by the observer and
  the metrics.
- `truth.fightKillings` (new); `truth.kills` holds fatal records only.
- The observer draws no new random number and reads the world only, so the simulation, the goldens and the field pin
  cannot move; the observer's own record fingerprint changes where such events occur.

## 6. Rows whose observer changes

T-LET-1 (defects 1 and 2), T-LET-2 (through `killings`), T-LET-3 (defect 1, N1), T-LET-6 (defect 1, N2), T-DEM-9
(defect 3). No other row reads the changed code paths. The §18 "killings" line follows T-LET-1.

## 7. The protocol freeze (not changed here; the user's decision)

`scripts/lib/protocol-hash.ts` fingerprints every file of `src/field`, so these fixes move the protocol hash away from
the frozen `5d4fa5a2a500bce6`. `data/targets.json` is frozen and is not edited on this branch: no band, definition, role,
flag, log entry or freeze record. The freeze's mechanism for a changed observer is a new `protocolFreeze` whose
`observerRevised` names the rows of §6, with a `protocolLog` entry; `scripts/e-bench.ts` then lists those rows of every
run made under an older protocol as "needs a fresh run" and never sums them. That record is staged as a proposal
(`docs/staging/obs-fixes-protocol.patch.json`, written with the code) and applied only on the user's word. Two things
are the user's to decide: the new freeze itself, and how policy rule 4 ("After the freeze, any change that touches a
held-out target compromises it") applies to T-LET-2, -3 and -6, which are held out.

Until a new freeze is recorded, `e-bench --rescore` cannot know these rows are stale: it re-scores a saved run's saved
per-seed values. This is reported, not worked around.

## 8. After the fixes and tests are committed, and only then

- `e-bench --rescore` re-scores saved per-seed values; it cannot re-derive an observer count. It is run on the saved
  12-month runs against a copy of the targets file carrying the proposed freeze record (under this worktree's
  `artifacts/`, never `data/targets.json`, always with `--out` under this worktree), to show the rows of §6 listed as
  needing a fresh run.
- Where a saved run kept its end checkpoint (the world with its dead and their causes, and the observer's records),
  the rows of §6 can be re-derived without a simulation: the saved records are brought to the fixed observer's form by
  the same outcome rules (an `infanticide` event whose target did not die in it becomes `infanticide-attack`; a detected
  contest with a participant dead of its wounds gains a `fight-kill` event; `truth.kills` loses its non-fatal entries)
  and the fixed metrics are computed on them. A check comes first: today's rule on the untouched records must give the
  count the saved run printed, or the seed is reported as not re-derivable. Tool: `scripts/obs-rederive.ts`, with tests.
  Reported: before and after, per run and pooled, for the 12-month S39 group and the wadging arms.
- A saved run without an end checkpoint needs a fresh run on those rows; it is listed, not estimated.

## 9. For the user (definitions, sources and decisions; no row is changed)

1. **A new freeze.** The fixes move the protocol hash to `aad8c58a00d68e0c` (frozen: `5d4fa5a2a500bce6`). The record is
   staged, not applied (`docs/staging/obs-fixes-protocol.patch.json`). Until it is taken, `e-bench --rescore` re-scores
   the old saved values of the five rows without a flag (shown in §10).
2. **Held-out rows touched after the freeze:** T-LET-2, -3, -6. Policy rule 4 as written compromises them; the Track E
   freeze re-froze its revised held-out rows by user decision instead. Marking them compromised changes the hash again.
3. **T-DEM-9 now scores at 12 months and fails for every model** (0.007–0.009 against 0.1–0.3): the band is a standing
   prevalence and founders start without injuries, so one to three years measure new injuries only. It is a fitted row
   and enters every fitted sum from 12 months on unless flagged. Its three sources have no entry in `docs/research.md`.
4. **T-LET-2** scores on one to four victims at 12 months (a single non-male victim gave a held-out distance of 2.4 in
   M12-W25); its "share intercommunity" is not computed; a victim not on the roster counts as not male.
5. **T-LET-3** counts one attacker for an infanticide by a stranger (the killer), not the males of his party.
6. **"Complications of wounds"** deaths are aggression in T-DEM-4 and no killing in T-LET-1.
7. **T-DEM-4:** an observed killing whose carcass no team reaches has an unknown cause. **T-DEM-6, -7:** every death of an
   animal seen ill counts as an outbreak death, a carcass with another necropsy cause included.
8. **A killing a team only heard** (within 500 m in the field profile) counts as "observed", for `kill` events since C3
   and for the events added here.
9. **Capture latency:** an interaction that starts in the last two minutes before a follow ends is never logged
   (amendment 1 met it); it touches every all-occurrence row.
10. **T-DEM-24** (sealed) needs the loss a full year before the run's end: it cannot close at 12 months, by definition.
11. The freeze record's `registryHash` (16853ddc0f0a7318) is no longer the head's (68a5290d393a0131). The saved S39
    runs' bench JSON names its scorecard under the old `~/Desktop` path, so `e-bench --rescore` on them reads there; a
    copy with the path corrected was used.

## 10. Results (6 October 2026, after the commits of the fixes and tests: 375db8e, e12ac7c, e46847c; amendment 1 code 1dce79f)

**Defects.** 1: real, fixed. 2: real in the observed route and the truth column (the inferred route already counted
carcasses), fixed, with amendment 1. 3: real, fixed. Neighbours N1 (T-LET-3) and N2 (T-LET-6): fixed.

**Re-derived from end checkpoints** (`scripts/obs-rederive.ts`; outputs `artifacts/obs-fixes/m12-rederived.{json,md}`;
20 seed-runs = 60 community-years per group; the old rule on the checkpoint's records reproduced the saved count in 60
of 60 seeds; no simulation):

| group | T-LET-1 killings before → after | what changed | truth (intergroup / infanticide / fight wounds) | T-LET-2 male | T-LET-3 | T-LET-6 | T-DEM-9 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S39, 12 months | 4 → 3 (0.067 → 0.050 per community-year) | −2 infants that lived; +1 fight death a team watched | 0 / 1 / 2 | 0/4 → 0/3 | 0.33 (n 2) → insufficient | 0/4 → insufficient | insufficient → 6/869 = 0.007 |
| wadging 0.5 | 1 → 1 | none | 0 / 1 / 0 | 0/1 → 0/1 | 0.25 (n 2) → insufficient | insufficient → insufficient | insufficient → 6/866 = 0.007 |
| wadging 0.25 | 4 → 3 (0.067 → 0.050) | −1 infant that lived | 0 / 2 / 1 | 2/4 → 1/3 | 0.5 (n 4) → insufficient | 0/3 → insufficient | insufficient → 8/861 = 0.009 |

After the fixes every truth killing of the three groups is counted (S39 3 of 3, wadging 0.5 1 of 1, wadging 0.25 3 of
3), by an event (2 infanticides, 1 fight-kill) or a carcass (4). Verdicts: T-LET-1 inconclusive before and after in all
three; T-LET-3 and T-LET-6 fail → insufficient (their "values" were killings inside a community and attack starts);
T-DEM-9 insufficient → fail. The first re-derivation, before amendment 1, gave S39 4 → 2
(`m12-rederived.before-amendment1.*`).

**`e-bench --rescore`** (outputs `artifacts/obs-fixes/rescore/`): it re-scores saved per-seed values and cannot
re-derive an observer count. Under the current freeze it reproduces the saved sums and flags nothing. Against a copy of
the targets file carrying the proposed freeze, the five rows of M12-S39, M12-W50 and M12-W25 are listed "needs a fresh
run" and left out of the sums (fitted 4.146 → 4.088, 5.823 → 5.764, 3.746 → 3.746; held-out 15.193 → 15.193, 15.051 →
15.051, 16.839 → 14.439, the last being T-LET-2's 2.4 on one victim).

**Runs that need fresh runs on the five rows:** every run without an end checkpoint. The three-year runs in `bench-y3`
keep none (Y3-T0, Y3-W25, Y3-W25-s1, Y3-W50, Y3-W50-s1: 19 finished seeds read, 0 checkpoints). Their parts give only the
saved count and the truth deaths by cause, which cannot say which saved killings were attacks: T0 0 saved / 0 truth;
W25 5 / 5 fight wounds; W25-s1 8 / 2 infanticides + 6 fight wounds; W50 1 / 1; W50-s1 5 / 1 + 4. Their saved T-DEM-9
has two censuses (365.25 and 730.5 days) and none at the end. The 12-month runs above can be read from the
re-derivation instead of re-run.

**Tests.** `tsc --noEmit` clean. `tests/field-obs-fixes.test.ts` 10 of 10. With it: field-observer, field-metrics,
rare-events, e-bench, e-bench-single-pass, ft-field, sim-track-e (field pin) and sim-params (golden hashes): all pass.
Nothing in `src/sim` or `data/` changed. The full suite was not run (machine load 25–31).

## 11. The freeze of 7 October 2026 (applied on the user's decision)

**Decision.** Asked whether the corrected rare-event counting should become official, the user answered on 7 October
2026, verbatim: "yes rare even as official" (`IMPLEMENTATION_PLAN.md`, Track R, "User decisions (7 October 2026)";
relayed by the integrator). §7 is superseded from here.

**What was done (branch `obs-fixes`, after merging `track-e` b6e35dc, no conflict).**
- `data/targets.json` `protocolFreeze`: hash `215ed6ab282a57de`, date 2026-10-07, `observerRevised` naming T-LET-1,
  T-LET-2, T-LET-3, T-LET-6 and T-DEM-9, with the Track E freeze (`5d4fa5a2a500bce6`) under `previous`.
- The Track E freeze's targets file is kept verbatim as `data/targets.e.json` (generated by
  `scripts/targets-snapshot.ts --commit ef53a91`, recorded under that freeze with its commit and sha256, as
  `data/targets.c8.json` was on 5 October), so a run can still be reported under the previous freeze for one cycle:
  `e-bench --rescore <run.json> --targets data/targets.e.json --out <path>`.
- One `protocolLog` entry (the fixes, their reasons, the before and after values of §10, the flags).
- No band, definition, role, metric or field value of any row changed (tested against `data/targets.e.json`).

**Rows touched after a freeze: the policy as written.** `protocolPolicy`, rule 4, in full: "A held-out target touched
by a change made after its value was seen is compromised (reported, never counted as validation) unless the change is a
bug fix or follows the source's methods text and was made before the freeze; those are flagged protocolRevisedPostHoc
and reported with before/after values. After the freeze, any change that touches a held-out target compromises it."
Rule 5: "A fitted target whose protocol was changed after its value was seen without such a reason reverts to the
source value."
- These fixes were made after the freeze of 5 October. The policy leaves one real choice: whether a bug fix that a new
  freeze adopts counts as "made before the freeze" (the one now taken), which would flag the rows revised post hoc only,
  as the Track E freeze did for its own scorer fixes. **The stricter reading is taken:** the last sentence of rule 4
  applies, bug fix or not.
- **Marked `compromised`** (reported, never counted, never summed): **T-LET-2, T-LET-3, T-LET-6**, the three held-out
  rows among the five. Each carries a `compromisedReason`.
- **Not marked:** T-LET-1 and T-DEM-9 are fitted rows; their change is a bug fix against the written definition (rule
  5's "such a reason"), so they keep their bands and stay flagged `protocolRevisedPostHoc`, which both already carried.
- The three flags are part of the fingerprint, which is why the hash is not the staged `aad8c58a00d68e0c`.

**Saved runs.** `e-bench --rescore` of a run made under the Track E protocol now lists the five rows under "Rows whose
observer code changed after this run (need a fresh run; listed, never summed)", each row flagged "observer changed
after this run" with the note "needs a fresh run: obs-fixes: …", and leaves them out of every sum (tested on the
function and on the command). It does this for every older run, with or without an end checkpoint; where the end
checkpoint exists, `scripts/obs-rederive.ts` gives the five rows beside the run (§10).

**Still the user's:** whether T-DEM-9 should count at 12 months (§9.3); the other items of §9 stand as listed.
