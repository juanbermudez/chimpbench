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
