# obs-fixes: three measurement defects in the rare-event rows (registered 6 October 2026, 09:05 EDT, before any code)

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

## 9. For the user (definitions and sources; no row is changed)

Filled in with the results (§10). Known at registration: T-DEM-9 asks for a standing prevalence, and founders start
without snare injuries, so a run of one to three years measures the injuries of those years only (Part D finding 3,
second half); with defect 3 fixed the row will score at 12 months on that footing. Its sources have no entry in
`docs/research.md`.

## 10. Results

(Appended after the commits of the fixes and tests.)
