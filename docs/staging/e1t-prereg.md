# E1t: the feeding horizon under the circadian gate (registered 5 October 2026, before any code)

Owner: agent `e1t-horizon` (branch `e1t-horizon` from `track-e`; development); the integrator runs and judges the
confirm. A correction: it removes no prescription and adds no constant.

## 1. Why (found by M1, `docs/staging/em-prereg.md`, "Finding for Track E", merged a9aa344)

E1e's drive spreads the energy an animal needs over the waking time left and the fast after it (`feedHorizon`,
`src/sim/energy.ts:284`). With `rhythmSleep` the waking time left is read from sleep pressure alone: the length of
yesterday's waking day is inferred from the pressure at which the animal last fell asleep (`sBed`). Under
`rhythmCircadian` (on in S39) sleep onset is gated by the circadian threshold, not by pressure, so last night's bedtime
pressure can lie below today's daytime pressure; the estimate then collapses to 0 from mid-morning on for some animals
(17% of sampled decisions, 12% of daylight ones), the energy-deficit drive is pinned at 1 (26% of decisions), and the
rules' hunger readout follows gut fill alone. Such an animal stays hungry whenever its gut has room, which plausibly
feeds the long feeding days and the full-gut fallback feeding E1r found (`e1r-prereg.md` §9–11). Not yet measured.

## 2. Mechanism (switch `horizonLived`, 0 by default; read only with `energyLedger` and `rhythmSleep` 1)

The animal predicts today's waking day from the days it lived: the waking time left is the length of its last complete
waking day (from its recorded waking to its recorded sleep onset) less the time since it woke today, floored at 0; the
fast is 24 h less that day's length. Before a first complete day is recorded, today's estimate is used unchanged. The
times are the animal's own (it knows how long it has been awake and how long yesterday was); nothing unseen enters. No
new constant. At 0, today's code bit for bit. Under `rhythmSleep` without `rhythmCircadian` the recorded day equals the
pressure-based one (sleep onset is set by pressure), so the switch should change little there; the tests check it.

## 3. Development (agent; at most 3 iterations, each logged in this file before its run)

Runs: S39 + `horizonLived` 1 (rngSalt 0), seeds 48 and 7 only, `e-bench --m6` with `--animal-days`, from a frozen
checkout; one job at a time while the load is above 8. Reference: S39's 6-month runs at rngSalt 0 (`M6-S39`).

**Pass to the confirm** (all four):
1. **The horizon predicts:** in daylight decisions, the waking time left is within 1 h of the time the animal actually
   had left before its next sleep onset in at least 90% of decisions (S39: report the same share). The drive pinned at 1
   only where the deficit fills the horizon (report the share against S39's 26%).
2. Viability passes on both seeds.
3. At day 180, no more animals below −0.3 of their store than S39 on the same seeds.
4. Night safety holds (adults out of a nest ≤ 3.3% of night).

Reported, not judged: eating minutes per day by class and month (E1r's table), the fallback share of plant energy,
km per day, the behaviour-by-reserve table (E1r §9.6), the hunger readout's distribution by hour.

**Tests:** at 0, compressed goldens, golden hashes and the field pin (`tests/sim-track-e.test.ts`) unchanged; at 1, a
unit test on a crafted animal whose last bedtime pressure lies below today's pressure (the horizon stays positive and
equals yesterday's day length less the hours awake); determinism; the recorded times are plain data in `chimp.sim` and
listed for the load-time shape check if added lazily (AGENTS.md).

## 4. Confirm (integrator, from a frozen detached checkout)

S39 + `horizonLived` 1 with `rngSalt` 0–3 × seeds 48, 7, 21, 5, 11 at 6 months, then extended to 12 months. A
correction is kept if, at 6 months, viability holds in all four runs, the keep rule holds against S39's group (e-noise.md
amendment 4: held-out and held-out without the rare rows not worse beyond noise), night safety holds and prescriptions do
not rise; at 12 months, starvation deaths are no more than S39's 6 in 20 seed-runs. Its effect on starvation is the main
readout, not a condition: 0 deaths would make S39 + E1t viable.

## 5. Predictions (integrator, low confidence)

The horizon fix lowers the share of decisions with the drive at 1 to under 10%, shortens the females' lean-season
feeding days, and lowers their fallback share; starvation falls but not to 0 on its own (the full-gut valuation and the
immigrant females' access remain). If E1s is kept, the two are confirmed together only after each is judged alone.

## 6. Development log (agent `e1t-horizon`; §1–5 above are the registration, unchanged)

### 6.1 The implementation (commits 451be42 and 46041d6, before any run of changed code)

- `src/sim/energy.ts` `livedDay` (called from `life.ts` `needs()` right after the rhythm step) keeps the animal's own record
  of its sleep on its energy ledger: `wokeAt` and `sleptAt` (world.time at its last waking and sleep onset), `dayH` (its
  last complete waking day, from a recorded waking to the next sleep onset) and `awakeH` (hours since the last waking, so
  the drive's pure readers need no clock). `feedHorizon` with `horizonLived` 1 and a recorded day: waking time left =
  max(0, dayH − awakeH), fast = 24 − dayH (the formula's existing return); before a first complete day, E1e's estimate.
  At 0 the code path is E1e's (same expressions); `livedDay` returns at once. No constant.
- **What "sleep onset" and "waking" are (my reading of §1–2, fixed here before any run).** The animal's sleep is the state
  in which process S falls: with `rhythmCircadian`, the circadian sleep latch (`circadian.ts` `asl`: on when S reaches the
  upper threshold, off when it has fallen to the lower one); without it, a finished nest (E1e's `sleeping`, the events at
  which sBed and sWake are recorded). Under the latch a nest entry while awake is not a sleep onset and a nest exit while
  latched does not end the sleep. This is §1's "sleep onset is gated by the circadian threshold"; the same events resolve
  pass condition 1 ("the time the animal actually had left before its next sleep onset").
- **The night (disclosed).** Read literally, §2 gives no waking time left while the animal sleeps (the hours since it woke
  exceed the day just completed) and the fast stays 24 h less that day; E1e's estimate instead reopens during sleep as S
  falls. So the drive is pinned at 1 at night whenever the need is positive (offline, §6.2: 81% of night animal-ticks
  against 36% today). The one night reader that gates behaviour on hunger, infants' night suckling (`c.hunger ≥ 0.08`),
  is already open in 99.7% of unweaned in-nest night ticks today (100% lived): not changed.
- Timing: the record is made in the tick the latch opens or closes, before that tick's decision (waking is a decision
  point), and once the lived horizon is in use a transition refreshes that tick's hunger readout; before a first complete
  day nothing is refreshed, so the world behaves as today until each animal's first complete day (test below).
- Registry and bookkeeping: `horizonLived` in data/params.json (design, 0 in both profiles; params.gen.ts regenerated),
  docs/simulation.md (§6 paragraph and the §17 row), `TRACK_E_SWITCHES` in scripts/lib/prescriptions.ts (a correction:
  removes nothing; S39's count stays 42) and tests/sim-track-e.test.ts; docs/decision-guide.html regenerated (stamp only).
  The records sit inside `chimp.sim.en`, so chimp.sim's layout, STATE_SHAPE and the load-time shape check are unchanged.
- Tests (tests/sim-horizon-lived.test.ts, 7): 0 by default in both profiles; at 0 the S39 field world (seed 48, 40 h,
  60-tick batches) hashes to 6a6f269ff10bf7be, the value recorded at 521d96d before any code; at 1, until the first
  complete day (36 h) the world is the same as at 0 once the records are stripped; deterministic over 40 h whatever the
  batching (60- and 8-tick steps), every living animal's recorded day 14.1–14.4 h, JSON-lossless, the shape check passes
  and a JSON round trip resumes exactly; the crafted animal (bedtime pressure 0.45, today's 0.60: E1e's waking time left
  0): the record from its latch's transitions gives 9.25 h left and a 9.75 h fast after 5 h awake on a 14.25 h day, 0
  while asleep, 0 past yesterday's length, a nest exit while latched is not a waking, and the drive is 0 < φ < 1 where E1e
  pins it at 1; without `rhythmCircadian` (sleep in a finished nest, needs() driven by hand) the recorded day equals E1e's
  pressure-based one and the waking time left differs by at most one tick; inert without `rhythmSleep` or `ledgerDrive`.
  The compressed goldens (tests/fixtures/golden-world.json) and the field pin (tests/sim-track-e.test.ts) are unchanged.
- The readout (pass condition 1; measurement only): `e-bench --feed-horizon` (scripts/lib/feed-horizon-probe.ts, through
  the energy readout; its rules tap is off while the field experiments tick their copies). At every rules decision of an
  animal with open drive books: the waking time left in use, the other estimator's (E1e's pressure-based one when the
  switch is 1; the lived-day one, kept by the readout from the same events as `livedDay`, when it is 0), the drive
  (`deficitDrive`) and whether it is at 1 with more than one tick of waking time left; each decision is resolved at the
  animal's next sleep onset and at its next nest entry before it. Also the hunger readout by clock hour and class, every
  tick. Report: scripts/e1t-horizon.ts. Tests (tests/e1t-horizon-readout.test.ts, 2): the world and every other readout
  are the same with and without it, at 0 and at 1; at 1 the readout's record equals the world's every tick (0 mismatches).
- Checks at 46041d6: `pnpm test` 918 tests, 0 fail, 1 skipped (after the worktree's `c7a-field1y.json` symlink was added
  and one lint hit in the readout was fixed); tsc, `gen-params --check` and `decision-guide --check` clean.

### 6.2 Pre-run check (offline: today's code, S39's day-210 checkpoint of seed 48 from bench-run M6-S39, read only)

Scratch diagnostics in the agent's scratch directory, today's code ticked from the checkpoint (no changed code; the
lived-day values computed alongside from the latch with the sim's own functions; phi replicated, 0 mismatches against
`deficitDrive`):
- Nest transitions (E1e's events) are fragmented: 1.32 nest entries per animal-day over 3 days; out-of-nest periods
  q05 0.01 / q25 0.89 / q50 11.29 / q95 12.81 h, 51 of 183 shorter than 6 h (re-entries after waking and at dusk). The
  latch: 0.99 onsets per animal-day, waking periods (latch off to on) q05 14.26 / q50 14.29 / q95 14.33 h, none under
  6 h. Animals enter their nests about 18:15–18:45 and the latch closes about 20:05; it opens about 05:50 and they leave
  their nests 06:40–07:40.
- Why E1e's estimate is 0 (2,714 of 9,274 daylight decisions, 29.3%, over 3 days): the last nest entry was a re-entry
  after waking (05–07 h) in 60.0%; a dusk decision in the nest before the latch closed (S past the entry pressure) in
  36.9%; the cross-night case §1 describes (bedtime pressure below today's) in 3.0%. All three are nest entries recorded
  as falling asleep under the gate.
- Days 211–213 (9,274 daylight decisions resolved): waking time left 0 today 25.2%, lived 0.0%; drive at 1 today 47.6%,
  lived 27.7%; within 1 h of the next sleep onset today 11.1%, lived 100.0% (lived − actual q05 −0.05, q50 −0.01, q95
  +0.05 h); within 1 h of the next nest entry today 72.6%, lived 2.3%. When it does not collapse, E1e's estimate tracks
  nest entry, about 1.6 h before sleep onset under the latch; the lived day runs to sleep onset, so in the late afternoon
  its waking time left is about that much longer and the drive lower. At night: drive at 1 in 36.2% of 399,993
  animal-ticks today, 81.2% lived.
- Readout smoke test (the committed probe, S39 seed 48, 0.5 + 2.6 days, switch 0): E1e within 1 h of the next sleep onset
  12.9% and of the next nest entry 76.0%; left 0 in 23.3%; drive at 1 in 20.2% of daylight decisions, of which 8.3% with
  waking time left; the lived estimator 100.0% within 1 h (4,545 decisions).

### 6.3 Reference run R0 (logged before its run; a reference run, not an iteration)

Condition 1's S39 share and the reported readouts need S39's decisions and per-animal rows on seeds 48 and 7 at rngSalt
0, which no saved run holds (M6-S39's parts have neither; E1r's R3 is rngSalt 2).
- Code: the frozen detached checkout of the commit that adds this entry (`git worktree add --detach` in the agent's
  scratch directory, node_modules and data/raw symlinked); src, scripts and data are not edited while it runs.
- Arm: S39's parameters (bench-run `M6-S39/params.json`), rngSalt 0 (not set), horizonLived absent (0).
- Command: `pnpm exec tsx scripts/e-bench.ts --m6 --seeds 48,7 --animal-days --feed-horizon --workers 1 --params '<S39>'
  --out <e1t-horizon>/artifacts/validation/e1t/ref/E1t-ref` (30 + 180 days; end checkpoints at day 210).
- Behaviour check: its field hashes must equal M6-S39's parts (seed 48 d485d15872a57eaf/9205780790911de8/1678526f4766a436,
  seed 7 06346f453f3daa10/145efb637ab578cb/7097fd61742f3b87, commit 63d699a92a); if they do not, the code moved S39
  between 63d699a92a and 521d96d and R0, at this commit, is the reference for every condition.
- S39's values read before any run (M6-S39, same seeds; count-depleted reader on the day-210 checkpoints, part files):
  below −0.3 of the store at scored day 180: seed 48 11 (9 aged 5 y+; lowest −0.683, id 17, female 6.6 y), seed 7 0
  (lowest −0.156); viability: 49 → 51 on both, births 2 + 2, deaths 0, starvation 0.

### 6.4 Iteration 1 (logged before its run)

- Code and checkout: as R0 (the same frozen commit).
- Arm: S39's parameters + `"horizonLived": 1`, rngSalt 0.
- Command: as R0 with `--out <e1t-horizon>/artifacts/validation/e1t/it1/E1t-it1`. Order: iteration 1 first, then R0;
  one job at a time while the load is above 8 (both at once only while it is below).
- Judging (§3), against R0 on the same seeds (and M6-S39 where R0 equals it):
  1. scripts/e1t-horizon.ts on the two parts: in daylight rules decisions, the waking time left within 1 h of the time
     to the next sleep onset (§6.1's events) in at least 90%, seeds pooled and on each seed; S39's share from R0. The
     drive at 1 (daylight and all decisions) reported against R0's (§3's 26% is M1's sample, another window and
     sampling); "pinned only where the deficit fills the horizon" read as: at least 90% of daylight decisions at 1 have
     waking time left. Also reported against the next nest entry.
  2. e-bench's viability verdict passes (pooled guard; per seed no starvation death and no seed below 80% of its start).
  3. count-depleted on the day-210 checkpoints: living animals below −0.3 of their store, seeds 48 + 7, no more than
     S39's 11 (and not more on either seed).
  4. The rhythm readout: adults (15 y and older) out of a nest ≤ 3.3% of night time (the two seeds pooled).
  Reported, not judged (against R0): scripts/lean-season.ts --rows on both parts of each arm (eating minutes per day by
  class and month, the fallback share of plant energy, km per day, the behaviour-by-reserve table), and the hunger
  readout by hour (scripts/e1t-horizon.ts).
- Agent's expectation (low confidence, from §6.2): condition 1 holds well above 90%; the daylight drive at 1 falls but not
  under 10% in the lean months, where depleted animals' deficits fill the horizon (offline 47.6% → 27.7% on seed 48 at
  day 211–213); the late-afternoon drive is lower than E1e's, so feeding days may shorten for balanced animals.
