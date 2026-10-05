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

### 6.5 Iteration 1 and R0: results (5 October; iteration 1 15:45–15:56, 633 s; R0 15:47–15:57, 554 s, started when the load fell to 6.0; both from the frozen checkout of 6cafd5d; numbers printed by scripts/e1t-horizon.ts, the scratch readers of §6.3 and scripts/lib/lean-season.ts's functions; outputs in this worktree's artifacts/validation/e1t/)

**R0 is M6-S39.** Its field hashes equal M6-S39's on both seeds (seed 48 d485d15872a57eaf/9205780790911de8/1678526f4766a436,
seed 7 06346f453f3daa10/145efb637ab578cb/7097fd61742f3b87): the readouts move nothing and S39 at this commit is the
M6-S39 world. Every S39 number below is R0's.

**Iteration 1 passes all four conditions.**

| | S39 (R0, seeds 48 + 7) | E1t iteration 1 |
| --- | --- | --- |
| (1) daylight decisions resolved (unresolved) | 1,723,463 (0) | 1,665,577 (149: animals that died) |
| (1) waking time left within 1 h of the next sleep onset | 4.2% (48: 4.4%, 7: 3.9%) | **99.9%** (99.9%, 99.9%) |
| (1) error, estimate − actual, q05 / q50 / q95 (h, bin centres) | −8.75 / −1.75 / −1.25 | −0.25 / 0.25 / 0.25 |
| (1) the other estimator within 1 h (lived day in R0; E1e in E1t) | 100.0% | 2.8% |
| (1) within 1 h of the next nest entry | 83.2% | 1.8% |
| (1) waking time left 0 | 21.0% | 0.0% (seed 7 0.1%) |
| (1) drive at 1, daylight decisions (48 / 7) | 46.9% (55.6 / 37.8) | 32.1% (41.8 / 22.1) |
| (1) of those, with waking time left (the deficit fills the horizon) | 56.5% | **99.9%** |
| (1) drive at 1, all decisions | 46.4% | 31.9% |
| (1) drive at 1 in October (M1's window; M1 sampled 26%) | 28.4% | 11.3% |
| readout's sleep record against the world's | 0 mismatches | 0 mismatches |
| (2) viability | pass: births 4, deaths 0 | **pass**: births 4, deaths 5, starvation 0; seed 7 ends at 48 of 49 |
| (3) below −0.3 of the store at scored day 180 (aged 5 y+), 48 + 7 | 11 + 0 (9) | **10 + 0** (8) |
| (3) lowest reserve | −0.683 (s48 id 17, F 6.6 y) | −0.801 (s48 id 9, F 12.6 y) |
| (4) adults out of a nest, share of night time | 2.6% | **2.7%** |

- Deaths, iteration 1 (none starved): seed 48 an infant of 0.08 y (window day 107) and a male of 26.5 y (day 146),
  "illness" (background hazard); seed 7 one respiratory outbreak (days 148–149: a female of 38.5 y, an infant of 0.99 y, a
  male of 26.5 y). At death health 0.75–1.00 and reserves −0.01 to −0.06 of the store (the newborn −0.21). The sim's own
  hazard at S39's day-210 population expects 0.44 (seed 48) and 0.45 (seed 7) background deaths in 180 days; the
  trajectories diverge from the burn-in, so outbreaks are separate draws. Not attributed to the switch.
- Drive at 1 by clock hour (daylight decisions, S39 → E1t): 06 h 13.3 → 6.0%, 12 h 37.5 → 24.3%, 17 h 75.9 → 53.0%,
  18 h 91.6 → 66.4% (left 0: 68.3% → 0.1%), 19 h 95.6 → 84.7% (99.8% → 0.1%). By month: Nov 31.3 → 13.2%, Feb 63.2 →
  50.7%, Apr 44.0 → 31.8%. By class: adult males 33.5 → 15.7%, adult females 55.5 → 44.3%, 5–15 y 56.2 → 45.0%, infants
  under 5 y 43.7 → 23.6%. The drive left at 1 is the deficit's: depleted animals in the lean months and everyone near the
  end of the day.
- Reported (seeds pooled, per animal-day; S39 → E1t). Eating minutes, Nov–Dec / Jan–Feb / Mar–Apr: juvenile females
  276 / 324 / 382 → 278 / 330 / 380; adolescent females 235 / 275 / 412 → 340 / 363 / 441 (one or two animals: 112–122
  animal-days a phase); pregnant 286 / 312 / 406 → 271 / 292 / 350; lactating 297 / 317 / 364 → 296 / 310 / 358; other
  females 222 / 235 / 266 → 221 / 231 / 302; adult males 227 / 241 / 234 → 226 / 240 / 234. Fallback share of plant
  energy over the window: juvenile F 6 → 6%, adolescent F 20 → 32%, pregnant 18 → 14% (Mar–Apr 26 → 16%), lactating 14 →
  14%, other F 11 → 15%, adult males 2 → 2%. Ground km a day: juvenile F 3.58 → 3.78, adolescent F 3.07 → 3.10,
  pregnant 2.79 → 2.73, lactating 3.26 → 3.30, other F 2.46 → 2.32, adult males 3.12 → 3.19. Reserves ÷ store, window
  mean: juvenile F −0.144 → −0.160, adolescent F −0.103 → −0.226, pregnant −0.104 → −0.086, lactating −0.083 → −0.086,
  adult males −0.013 → −0.020, infants 2–5 y −0.055 → −0.073. Behaviour by reserve, window days 90–179, animals of 5 y+
  other than adult males: at −0.3 to −0.5 418 → 415 animal-days, 534 → 527 eating min, 83 → 82% at a full foregut,
  fallback 33 → 32%, net −107 → −99 kcal; at −0.5 to −0.7 95 → 122 animal-days, 619 → 603 min, fallback 40 → 42%, net
  −156 → −123; at −0.7 to −1 none → 25 animal-days (679 min, fallback 64%, net −165; seed 48's adolescent id 9).
- Hunger readout by clock hour: in daylight (08–17 h) within 0.03 of S39's for adults and 5–15 y, 0.04–0.05 lower for
  infants under 5 y; **at night (21–04 h) 0.85–0.98 against 0.34–0.68.** Bench headline (two seeds, reported only; the
  confirm judges it): fitted 4.544 → 3.535, held-out 10.968 → 9.261 (7.737 → 7.598 without T-HUN-4 and T-BRD-1);
  prescriptions 42 and 42.
- **Correction to §6.1.** "Night suckling not changed" was wrong. Eligibility (hunger ≥ 0.08) is unchanged, but a night
  bout runs until hunger falls below 0.08, and with φ pinned at 1 that is a fuller gut: the energy readout's night table
  (infants in their mother's nest; R0 → iteration 1): φ ≥ 0.999 in 16.0–54.9% → 90.6–98.6% of night-nest ticks, night
  hunger 0.36–0.69 → 0.72–0.92, drinking in 3.7 → 5.6% (0–0.5 y), 5.8 → 8.5% (0.5–1 y), 23.1 → 42.7% (1–2 y), 19.8 →
  21.0% (2–3 y), 13.3 → 16.2% (3–4 y) of night-nest ticks; night milk 44 → 73 kcal a day at 0–0.5 y and 101 → 113 at
  1–2 y (gland-limited: day milk falls about as much; day + night within 4% except at 4–5 y, 228 → 205 kcal).

### 6.6 Iteration 2 (logged before its run): the horizon while the animal sleeps

- **Reason, in the mechanism.** Iteration 1 keeps counting the hours since the last waking through sleep, so the waking
  time left is 0 all night and the drive's divisor falls to one tick of feeding (energy.ts setHunger, deficitDrive): φ
  saturates whenever the need is positive (§6.5: night hunger 0.85–0.98; infants drink to a fuller gut at night). E1e's
  horizon reopened during sleep as S fell; iteration 1 removed that without a replacement. The drive is defined for "the
  energy the animal still needs before its next chance to feed ... as a share of what it could eat in the waking time
  left": for a sleeping animal that is the coming waking day.
- **Change.** While the animal sleeps (its record holds a sleep onset after its last waking) it has not yet woken on the
  coming day: its hours awake today are 0 (`awakeH` 0), so the horizon is the last complete waking day and the fast after
  it, the horizon it will have on waking (§2's formula with the hours awake today at 0). No constant; awake, nothing
  changes. The readout's own lived estimator follows the same rule (its "other" column for a world at 0; R0's was
  computed with iteration 1's rule, which differs only for decisions taken while the animal's record says asleep, none
  of them in daylight in R0: 0.0% of the lived estimator's daylight left was 0).
- Code, tests (the crafted animal asleep: waking time left = the day, the fast 24 h less it; switch 0 still hashes to
  6a6f269ff10bf7be), docs (simulation.md, params.json note) at the commit that adds this entry; run from a new frozen
  detached checkout of it.
- Arm and command as iteration 1 with `--out <e1t-horizon>/artifacts/validation/e1t/it2/E1t-it2`; reference R0 (switch 0
  is unchanged by this iteration).
- Judging: as iteration 1 (§6.4), against R0; reported as iteration 1, plus the night readouts against R0 and iteration 1
  (hunger by hour, the energy readout's night-access table).
- Expectation (low confidence): daylight results as iteration 1's (the change acts only while asleep and at the moment
  of falling asleep); night hunger and infants' night drinking back near R0's.

### 6.7 Iteration 2: results (5 October 16:05–16:16, 594 s, from the frozen checkout of 05d0867; the same readers)

**Iteration 2 passes conditions 1, 2 and 4 and misses condition 3 by one animal.**

| | S39 (R0) | iteration 1 | iteration 2 |
| --- | --- | --- | --- |
| (1) within 1 h of the next sleep onset (daylight) | 4.2% | 99.9% | **99.9%** (48: 99.8%, 7: 99.9%) |
| (1) drive at 1, daylight; of it with waking time left | 46.9%; 56.5% | 32.1%; 99.9% | 33.1%; **99.9%** |
| (2) viability | pass (births 4, deaths 0) | pass (4, 5) | **pass** (births 4, deaths 0; 49 → 51 on both) |
| (3) below −0.3 at scored day 180, 48 + 7 (aged 5 y+) | 11 + 0 (9) | 10 + 0 (8) | **12 + 0 (9): fails** |
| (3) lowest reserve | −0.683 | −0.801 | −0.627 (s48 id 15, pregnant F 21.6 y) |
| (4) adults out of a nest, night | 2.6% | 2.7% | **2.8%** |

- The night is S39's again: hunger at 21–04 h, adult females 0.46–0.55 (S39 0.54–0.72, iteration 1 0.88–0.97); infants
  in their mother's nest at night φ ≥ 0.999 in 7.6–10.5% of night-nest ticks (S39 16.0–54.9%, iteration 1
  90.6–98.6%); night milk per infant-day 39 / 63 / 107 / 99 / 87 / 35 kcal at 0–0.5 … 4–5 y (S39 44 / 71 / 101 / 90 /
  86 / 39). Daylight as iteration 1: within 1 h 99.8–100.0% at every hour, drive at 1 6.8% at 06 h to 83.9% at 19 h.
- Seed 48's animals below −0.3: the same eight in all three arms (ids 12, 15, 17, 18, 19, 32, 35, 51: lactating,
  pregnant and juvenile females, infants), plus 9, 10, 45 in S39, 9 and 16 in iteration 1, 30, 44, 47, 49 in iteration 2:
  the margin around −0.3 moves with the trajectory. Iterations 1 and 2 differ only while animals sleep, yet their
  per-class readouts differ as much as either differs from S39 (juvenile females in Mar–Apr: 380 and 444 eating minutes,
  S39 382; the adolescent female id 9 at −0.80 in iteration 1 and not depleted in iteration 2): on two seeds, condition 3 and the per-class
  readouts are inside the trajectories' noise.
- Reported (iteration 2; S39's values in §6.5; seeds pooled, per animal-day): eating minutes Nov–Dec / Jan–Feb / Mar–Apr: juvenile F 295
  / 341 / 444, adolescent F 231 / 232 / 329, pregnant 258 / 307 / 381, lactating 300 / 317 / 370, other F 225 / 225 /
  256, adult males 226 / 238 / 234; fallback share of plant energy over the window: juvenile F 6 → 11%, adolescent F 20
  → 11%, pregnant 18 → 15%, lactating 14 → 15%, other F 11 → 12%; ground km a day: juvenile F 3.58 → 3.74, pregnant
  2.79 → 2.85, lactating 3.26 → 3.29, adult males 3.12 → 3.22. Bench headline (two seeds; not judged; other rows
  scored: 19 fitted): fitted 4.525, held-out 13.784 (8.137 without T-HUN-4 and T-BRD-1; S39 10.968 and 7.737).

### 6.8 Decision (agent): stop after two iterations; iteration 1 passes to the confirm

- By §3's rule iteration 1 passes all four conditions and iteration 2 does not (condition 3, 12 against 11). I name no
  mechanism reason for a third iteration: condition 3's margin is trajectory noise (§6.7), and condition 1 is settled
  (99.9% against 4.2%, both iterations).
- The branch head returns to iteration 1's rule (src/, the readout and the tests as at 6cafd5d, `git diff 6cafd5d -- src`
  empty; the docs describe iteration 1's rule), so `horizonLived` 1 is the code that passed. Iteration 2's night rule (commit a2a45d4: `awakeH` 0 while
  the record says asleep) is recorded for the integrator: it removes iteration 1's night saturation (night hunger
  0.85–0.98, infants drinking to a fuller gut) at no daytime change; if wanted, it needs its own registration or an
  amendment before the confirm.
- Recommendation: confirm iteration 1 (moderate confidence that it holds the 6-month keep rule: viable, night safe,
  prescriptions unchanged; the drive's estimate is fixed beyond doubt). Low confidence that it moves 12-month
  starvation: where animals are depleted the deficit already fills any horizon (99.9% of the remaining drive-at-1
  decisions have waking time left), so E1r's trap is untouched.
- Merged `track-e` once (50c766f; E1s and the plan and handoff updates): src now differs from 6cafd5d only by E1s's code
  (`gutValue`, 0 by default) and the regenerated params.gen.ts. Checks on the merged tree: `pnpm test` 928 tests, 927
  pass, 0 fail, 1 skipped; tsc, `gen-params --check` and `decision-guide --check` clean; `git ls-files data/raw
  node_modules` empty. Outputs (gitignored, this worktree): artifacts/validation/e1t/{ref,it1,it2}/ (bench, scorecard,
  energy, rhythm, parts with per-animal rows and the feed-horizon readout, day-210 checkpoints) and all-horizon.md,
  all-rows.md (the three arms side by side).

## 7. Confirm plan (integrator, 5 October 2026, registered before its runs)

Iteration 1 passed all four development conditions (§6); iteration 2's night change is not part of this confirm (it
would need its own registration). Code: track-e with E1t merged (4ff4cc4; `pnpm test` 927 pass, 0 fail), run from a
frozen detached checkout `bench-e1t` at this file's commit. At `horizonLived` 0 the S39 world reproduces the reference
(the agent's R0 equals M6-S39; E1s's and M1's switches at 0 leave S39's decisions and world hashes unchanged), so S39's
Part C groups at 63d699a are the references. Prescriptions with `horizonLived` 1: 42 (unchanged).

- **Arms:** S39's four parameter sets (`rngSalt` 0–3) with `horizonLived` 1: runner labels M6-E1t, M6-E1t-s1, -s2, -s3
  (`e-run.ts plan --m6`, seeds 48, 7, 21, 5, 11, 30 + 180 days), then each extended to 12 months from its checkpoints
  (`--m12 --from`), labels M12-E1t…; one job per runner while the load is above 8.
- **6 months (against S39's M6 group, protocol 5d4fa5a2a500bce6):** viability in all four runs; the keep rule on the
  rngSalt 0 run (e-noise.md amendment 4; |z| > 2 a result): held-out and held-out without the rare rows not worse beyond
  noise; night safety (adults out of a nest ≤ 3.3% of night, T-RHY-5 ≤ 0.033); prescriptions not up (42).
- **12 months (against S39's M12 group):** starvation deaths over the 20 seed-runs against S39's 6: kept as a correction
  with 6 or fewer and the keep rule; 0 makes S39 + E1t viable. Reported: deaths by cause and class, each class's reserve
  trajectory and lowest monthly mean, the drive-at-1 share, eating minutes by class and month.
