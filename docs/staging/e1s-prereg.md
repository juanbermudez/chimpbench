# E1s: digestion-limited food value (registered 5 October 2026, before any code)

Owner: agent `e1s-gut` (branch `e1s-gut` from `track-e`; development iterations); the integrator runs and judges the
confirm. Basis: E1r's verdict and proposal (`docs/staging/e1r-prereg.md` §11–12, merged at a9739c3).

## 1. Why

E1r: in the lean season the small and reproducing females' absorbed energy falls because their foregut is the limit
(full in 76–89% of their eating minutes in March–April), and a valuation trap keeps depleted animals losing after fruit
returns. Under `forageRate` a crown is worth a bout capped by the foregut's room counted in drupe units (nothing at a
full gut), while the fallback where the animal stands keeps its full rate value whatever the gut holds
(`candidates.ts:498–500`, `intake.ts` `leafWorth` and `netRateShare`, `energy.ts` `boutRoom`). Depleted animals, kept
hungry by E1i's reserve-weighted satiation, fill the gaps with the food the gut passes least energy from (fallback 1.57
absorbed kcal per g of dry matter against figs 1.83 and drupes 2.36). Five of S39's six starvation deaths follow.

## 2. Mechanism (switch `gutValue`, 0 by default; read only with `energyLedger`, `ledgerDigesta`, `ledgerDrive` and `forageRate` 1)

Every feeding option (a crown in view, a trip, a joined trip, the fallback where the animal stands) is worth the energy
of the bout the gut allows, over the bout's time: the foregut's present room filled at the food's ingestion rate (its
kcal per minute at the animal's size and skill, as now), then the food at the rate a full foregut passes it (the
foregut's dry-matter capacity ÷ `ledgerGutEmptyH` × that food's own energy per gram of dry matter), up to the crop share
and the animal's need, every term in the food's own units (figs as figs). At a full gut foods rank by the energy per gram
the gut passes; with room in the gut they rank by ingestion rate, as now. A correction: no prescription is removed, and
none may be added (no new constant; `gutValue` is a design switch). At 0 the code is today's, bit for bit.

Theory: the digestive rate model (verlindenWiley1989, not verified; research.md "Addendum: E1r lean season"), entered
as a design assumption. Directions: knott2005 (gut capacity limits feeding longer), harrisonMarshall2011 (fruit is
pursued; pith and leaves are fillers). **Inputs:** none new (each food's measured energy and dry matter per feeding
minute, uwimbabazi2019 [H], already in the registry; the model's own gut). No field rate enters.

## 3. Development (agent; at most 3 iterations, each logged in this file before its run)

Runs: S39 + `gutValue` 1, rngSalt 0, seeds 48 and 7 only, `e-bench --m6` (30 + 180 days) with `--animal-days`, from a
frozen checkout of the iteration's commit; one job at a time while the load is above 8. Reference: S39's 6-month runs
at rngSalt 0 (`bench-run/…/e/runs/M6-S39`, seeds 48 and 7: class readouts and the day-210 checkpoint worlds) and E1r's
R3 (S39 rngSalt 2, seed 48, with `--animal-days`).

**Pass to the confirm** (all four): (1) no starvation death on either seed; (2) at day 180, fewer animals below −0.3 of
their store than S39 on the same seeds, and the lowest individual reserve higher; (3) eating minutes of the juvenile,
adolescent and pregnant females still rise from November–December to March–April; (4) viability passes. Reported, not
judged: the behaviour-by-reserve table (E1r §9.6), the fallback share of plant energy and of eating time by class, km by
phase, the class readout by month.

**Tests:** at `gutValue` 0, identical decision values on a saved world and unchanged compressed goldens, field pin test
(`tests/sim-track-e.test.ts`) and golden hashes; at 1, a unit test that at a full foregut a drupe crown in reach outranks
the fallback here, and that with an empty gut the ranking equals today's; determinism (batching).

## 4. Confirm (integrator, from a frozen detached checkout)

S39 + `gutValue` 1 with `rngSalt` 0, 1, 2, 3 (four runs × seeds 48, 7, 21, 5, 11) at 6 months, then each extended to 12
months from its checkpoint (the runner, `--from`). References: S39's four 6-month and four 12-month runs (Part C).

- **6 months:** viability in all four runs; the keep rule (e-noise.md amendment 4: the rngSalt 0 run's z against S39's
  group, |z| > 2 a result; held-out and held-out without the rare rows not worse beyond noise); night safety (adults out
  of a nest ≤ 3.3% of night, T-RHY-5 ≤ 0.033); prescriptions not up.
- **12 months (the decision):** starvation deaths over the 20 seed-runs, against S39's 6.
  - **Viable** (S39 + E1s becomes the base): 0 starvation deaths, and the 12-month keep rule against S39's group.
  - **Kept as a correction, base still not viable:** 1 or 2 starvation deaths (P ≈ 0.06 of ≤ 2 if the rate were
    unchanged at 6), and the keep rule. The remaining deaths go to the stages E1r left open (§6).
  - **Killed:** 3 or more starvation deaths, or eating minutes no longer rising as fruit falls, or the keep rule fails.
- Reported at both horizons: each class's reserve trajectory and its lowest monthly mean (S39: juveniles −0.21); the
  lean-season dip's direction (class means dip and recover); feeding minutes by month; the E1r readouts.

## 5. Predictions (integrator, low confidence)

Starvation falls but does not reach 0 (the immigrant females' access and conception without an energy gain remain);
depleted animals recover once fruit returns; the females' fallback share and their March–April eating minutes fall;
the fig months' walking falls a little; held-out sums move inside noise.

## 6. Left for other stages (not E1s)

Immigrant females' access (resident females' charges; their counterstrategy of staying near males, kahlenberg2008);
conception without a sustained energy gain (emeryThompson2012); the fallback's bulk and site (wadging; Kanyawara's pith
and leaves against Ngogo's phenology, potts2011, watts2012b): an audit before any input moves; no fat stored in good
months (no magnitude source).

## 7. Integrator ruling on §2 (verbatim; received 5 October 2026, before any run)

> Integrator ruling on §2 (5 October 2026, before any run; the agent found the literal text inconsistent with §2's last
> sentence and §3's empty-gut test). Read the bout as two phases: (1) the foregut's present room filled at the food's
> ingestion rate, exactly today's boutRoom form, up to the crop share; then (2) the food at the rate a full foregut passes
> it, for as long as the gut takes to pass what it now holds (fill × ledgerGutEmptyH). Both phases together are capped by
> the crop share and the animal's need, the need converted into the food's own kcal by its absorbed yield from the
> registry's composition. No new constant. Consequences, fixed now: at an empty gut, drupe crowns and the fallback are
> bit-equal to today's values, and figs take their own ingestion rate ('figs as figs'). §3's empty-gut test reads
> accordingly: drupe crowns and fallback equal today's, figs differ only by their own rate. At a full gut, foods rank by the
> energy per gram the gut passes. The literal reading (a passage phase running to the need) was rejected because it changes
> values at an empty gut, e.g. a depleted juvenile's drupe crown 0.98 → 0.37 on S39 seed 48 at day 210.

(The literal reading's numbers came from the agent's first offline probe, with the walking speed fixed at 0.6 m/s; the
pre-run check in §8.2 uses each animal's own walking speed.)

## 8. Development log (agent `e1s-gut`; §1–6 are the registration, unchanged; §7 is the integrator's ruling)

### 8.1 The implementation (commit 96f71e8, before any run)

- `src/sim/energy.ts` `gutBout`: one bout's terms on one food, in that food's own units: `room`, what phase 1 takes while
  the foregut fills (boutRoom's form: the room plus what passes meanwhile at the full-gut rate; Infinity when the gut
  passes the food as fast as it is eaten); `held`, what the foregut holds now in the food's kcal, eaten in phase 2 at
  `pass` (dry-matter capacity ÷ the food's dry matter per kcal ÷ `ledgerGutEmptyH`, so phase 2 lasts fill ×
  `ledgerGutEmptyH`); `need`, energyNeed ÷ the kcal the body draws from one kcal of the food (its non-fibre energy plus
  the fermented share of its fibre at `digestaFermentKcalPerG`, as gutEnergy counts it).
- `src/sim/intake.ts` `gutRateShare` (a crown in view, own and known-tree trips, joined and caller trips, and E3e's belief
  draw, `treeFoodWorth`): phase 1 = min(crop share, room), eaten at the food's ingestion rate × vision; phase 2 =
  min(held, the part of min(crop share, need) that phase 1 leaves), eaten at min(pass, ingestion × vision); the value is
  (bout − the walk's and climb's energy) ÷ (walk + eating time) ÷ the animal's own full drupe rate, as netRateShare. A
  drupe crown with no phase 2 is netRateShare itself (bit for bit). `fallbackGutFactor`: the fallback's value × (phase 1
  + phase 2) ÷ (phase 1 + phase 2 × its rate ÷ the passage rate); 1 with no phase 2, 0 at a full gut with no need.
- How "both phases together are capped by the crop share and the need" is applied: phase 1 is today's (capped by the
  crop share, not by the need); phase 2 runs only while the bout's total is below the crop share and the need, so where
  the room alone holds more than the need the bout is phase 1, as today. This is what makes the ruling's fixed
  consequence hold (at an empty gut drupe crowns and the fallback bit-equal to today's values).
- `src/sim/candidates.ts`: `gutValueOn` (gutValue 1 with forageRate and its needs, and ledgerDigesta); rateWorth,
  treeFoodWorth and the fallback offer call the new functions under the switch; the off path's expressions are today's.
- Not changed (outside §2's list): hunting (`huntvalue.ts`) and the decision model's facts (`src/decide`). A known
  limitation not under test (not in S39): with `experienceValue` bit 1 a trip's learned meal share stays relative to
  experience.ts's own bout (`src/sim/experience.ts:32–40`).
- Registry and bookkeeping: `gutValue` in data/params.json (design, 0 in both profiles; params.gen.ts regenerated),
  docs/simulation.md §17, `TRACK_E_SWITCHES` (a correction: removes nothing), tests/sim-track-e.test.ts.
- Tests (tests/sim-gut-value.test.ts, 7): off by default in both profiles; gutValue 0: every living animal's decision
  values on S39's seed-48 world saved at 10:30 and 16:30 of its second day hash to the values recorded at eb2b209 before
  any code (93ced3a9df1c66ce, 396 options; 0ff4d71478f53323, 420 options), and gutValue 1 changes them; the ruling's two
  endpoints: with an empty gut gutRateShare equals netRateShare exactly for drupe crowns (crops 0.02–2, 0 and 2 feeders,
  0–600 m, full and 0.4 vision, reserves 0 and −0.5 of the store), the fallback's factor is exactly 1 (yields 0.3–1.3),
  and a fig crown at hand is worth the figs' own ingestion rate (8.12 ÷ 7.39 of the drupe rate); with a full gut drupe,
  fig and fallback are worth their passage rates, ranked by energy per gram (drupe ÷ fallback = the ratio of their dry
  matter per kcal), a drupe crown at 20 m with a 10-m climb above the richest fallback (today it is worth 0), and nothing
  with no need left; in the decision (computeCandidates) at a full foregut a drupe crown in reach outranks the fallback
  here (today the reverse), and with an empty gut every option but a fig crown keeps today's value and order;
  determinism over 12 h whatever the batching (8- and 60-tick steps), JSON-lossless, the prescription count unchanged;
  inert without forageRate (world hash equal over 6 h) or without ledgerDigesta.
- Checks at 96f71e8: `pnpm test` 908 tests, 907 pass, 0 fail, 1 skipped; tsc, `gen-params --check` and
  `decision-guide --check` clean (the guide cites candidates.ts line numbers, which moved; regenerated). The compressed
  goldens (tests/fixtures/golden-world.json) and the field pin test (tests/sim-track-e.test.ts) are unchanged and pass.

### 8.2 Pre-run check (offline: the sim's own functions on S39's seed-48 world at day 210, before any run)

`gutRateShare` and `fallbackGutFactor` against today's `netRateShare` and fallback value, on the end world of M6-S39's
seed 48 (bench-run, scored day 180, 06:30), the foregut's dry matter set by hand. A drupe or fig crown with crop 0.5,
alone, a 10-m climb, at 50 / 150 / 300 m, at the animal's own walking speed; the fallback where the animal stands at
forage yield 0.6 / 1 / 1.3; every value a share of the animal's own full drupe rate (the crown's drive multiplies all).

**id 33**, female, 15.6 y, 31.3 kg, reserves 0.00 of the store, need 779 kcal, foregut 175 g, walk 0.77 m/s, drupe rate 434 kcal/h

| foregut fill | drupe crown today (50 / 150 / 300 m) | drupe crown gutValue | fig crown gutValue | fallback today (yield 0.6 / 1 / 1.3) | fallback gutValue |
| ---: | --- | --- | --- | --- | --- |
| 0.00 | 0.98 / 0.95 / 0.91 | 0.98 / 0.95 / 0.91 | 1.07 / 1.02 / 0.96 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 0.50 | 0.96 / 0.91 / 0.84 | 0.54 / 0.53 / 0.52 | 0.45 / 0.44 / 0.42 | 0.27 / 0.45 / 0.58 | 0.27 / 0.34 / 0.37 |
| 0.90 | 0.82 / 0.64 / 0.47 | 0.36 / 0.35 / 0.34 | 0.28 / 0.28 / 0.27 | 0.27 / 0.45 / 0.58 | 0.25 / 0.25 / 0.25 |
| 0.95 | 0.68 / 0.44 / 0.25 | 0.34 / 0.34 / 0.33 | 0.27 / 0.26 / 0.25 | 0.27 / 0.45 / 0.58 | 0.24 / 0.24 / 0.24 |
| 0.98 | 0.38 / 0.14 / 0.01 | 0.33 / 0.33 / 0.32 | 0.26 / 0.25 / 0.25 | 0.27 / 0.45 / 0.58 | 0.23 / 0.23 / 0.23 |
| 1.00 | 0.00 / 0.00 / 0.00 | 0.33 / 0.32 / 0.31 | 0.25 / 0.25 / 0.24 | 0.27 / 0.45 / 0.58 | 0.23 / 0.23 / 0.23 |

**id 17**, female, 6.6 y, 23.1 kg, reserves -0.68 of the store, need 21245 kcal, foregut 129 g, walk 0.74 m/s, drupe rate 342 kcal/h

| foregut fill | drupe crown today (50 / 150 / 300 m) | drupe crown gutValue | fig crown gutValue | fallback today (yield 0.6 / 1 / 1.3) | fallback gutValue |
| ---: | --- | --- | --- | --- | --- |
| 0.00 | 0.98 / 0.95 / 0.90 | 0.98 / 0.95 / 0.90 | 1.06 / 1.01 / 0.94 | 0.27 / 0.45 / 0.59 | 0.27 / 0.45 / 0.59 |
| 0.50 | 0.96 / 0.90 / 0.82 | 0.51 / 0.50 / 0.49 | 0.42 / 0.41 / 0.40 | 0.27 / 0.45 / 0.59 | 0.26 / 0.33 / 0.35 |
| 0.90 | 0.81 / 0.61 / 0.44 | 0.34 / 0.33 / 0.32 | 0.26 / 0.26 / 0.25 | 0.27 / 0.45 / 0.59 | 0.23 / 0.24 / 0.24 |
| 0.95 | 0.65 / 0.41 / 0.23 | 0.32 / 0.31 / 0.31 | 0.25 / 0.25 / 0.24 | 0.27 / 0.45 / 0.59 | 0.22 / 0.23 / 0.23 |
| 0.98 | 0.35 / 0.12 / 0.00 | 0.31 / 0.30 / 0.30 | 0.24 / 0.24 / 0.23 | 0.27 / 0.45 / 0.59 | 0.22 / 0.22 / 0.22 |
| 1.00 | 0.00 / 0.00 / 0.00 | 0.30 / 0.30 / 0.29 | 0.24 / 0.23 / 0.23 | 0.27 / 0.45 / 0.59 | 0.22 / 0.22 / 0.22 |

Reading: with an empty gut drupe crowns and the fallback keep today's values and figs gain their own ingestion rate
(8.12 ÷ 7.39); at 90–100% fill, where today a crown 150–300 m away falls to 0.64–0.00 (balanced) and 0.61–0.00
(depleted) while the fallback keeps 0.27–0.59, a drupe crown keeps 0.29–0.36 and the fallback falls to 0.22–0.25, so a
drupe crown in reach outranks the fallback here at every fill; at half fill every food is worth less than today (drupe
crowns 0.49–0.54 against 0.82–0.96) because the bout now includes the time the gut needs to pass what it holds.

### 8.3 Iteration 1 (logged before its run)

- Code: §7 and §8.1, at the commit that adds this entry; run from a frozen detached checkout of that commit
  (`git worktree add --detach` in the agent's scratch directory, node_modules and data/raw symlinked); src, scripts and
  data are not edited while it runs.
- Arm: S39's parameters (bench-run `M6-S39/params.json`) + `"gutValue": 1`, rngSalt 0 (not set).
- Command, one process, one worker, the two seeds one after the other: `pnpm exec tsx scripts/e-bench.ts --m6 --seeds
  48,7 --animal-days --workers 1 --params '<S39 + gutValue 1>' --out <e1s-gut>/artifacts/validation/e1s/it1/parts/E1s-it1`
  (30 + 180 days; parts `E1s-it1.s48.part.json.gz`, `E1s-it1.s7.part.json.gz`, end checkpoints at day 210, the merged
  scorecard, energy and rhythm readouts). Started only while no other job of this agent runs (load above 8).
- Reference (no new run): M6-S39's seeds 48 and 7 (bench-run `M6-S39/parts`, commit 63d699a92a, the same settings
  without gutValue) for the conditions; E1r's R3 (S39 rngSalt 2, seed 48, with the per-animal rows) for the per-animal
  readouts. Reader: a scratch script over part files and end checkpoints only (it reproduces E1r's R3 tables of §9.4 and
  §9.6 from R3's part), and `scripts/lean-season.ts`.
- Reference values, read before the run with the same reader: S39 seeds 48 + 7 at scored day 180 (day 210): 11 living
  animals below −0.3 of their store (9 aged 5 y or more; all in seed 48; seed 7 none), the lowest −0.683 (seed 48 id 17, a
  juvenile female of 6.6 y; seed 7's lowest −0.156); no starvation death; viability pass (too few births and deaths to
  compare them: 4 and 0).
- Judging, as §3 registers it: (1) no starvation death in the window on either seed (e-bench viability, simulation
  truth); (2) at scored day 180 (the end checkpoints) fewer living animals below −0.3 of their store than S39's 11 on the
  same seeds, and the lowest individual reserve above −0.683; (3) the eating minutes per animal-day of juvenile females
  (5–12 y), adolescent females (12–15 y) and pregnant females, seeds pooled, higher in March–April than in
  November–December (per-animal rows); (4) e-bench's viability verdict pass. Reported, not judged: the behaviour-by-reserve
  table, the fallback share of plant energy and of eating time by class, km by phase, the class readout by month.
