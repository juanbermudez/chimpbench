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

### 8.4 Iteration 1: results (run 5 October 14:00–14:15 from the frozen checkout of 76a36cf, 866 s; read with the scratch reader and `scripts/lean-season.ts`; outputs in the agent's `artifacts/validation/e1s/`)

**Fails conditions 1, 2 and 4; condition 3 holds.**

| | S39 (M6-S39, seeds 48 + 7) | E1s iteration 1 (seeds 48 + 7) |
| --- | --- | --- |
| (1) starvation deaths | 0 + 0 | 4 + 7 |
| (2) animals below −0.3 of the store at scored day 180 (aged 5 y+) | 11 + 0 = 11 (9) | 16 + 26 = 42 (31) |
| (2) lowest reserve | −0.683 (s48 id 17, juvenile F 6.6 y) | −0.930 (s7 id 14, lactating F 24.6 y) |
| (3) eating min, Nov–Dec → Mar–Apr: juvenile F, adolescent F, pregnant | (no per-animal rows) | 238 → 395, 342 → 469, 293 → 396: rise |
| (4) viability | pass (births 4, deaths 0; few events) | fail (births 3, deaths 27, 11 starvation; seed 48 at 67% of its start) |

- Deaths, iteration 1, window days. Starvation: seed 48 ids 17 (juvenile F 6.3 y, day 73), 19 (juvenile F 7.3 y, 74), 35
  (juvenile F 5.9 y, 129), 9 (adolescent F 12.5 y, 153); seed 7 ids 19 (juvenile F 7.2 y, 41), 17 (juvenile F 6.2 y, 42),
  35 (juvenile F 5.8 y, 82), 13 (F 28.4 y, 125), 12 (F 33.5 y, 164), 11 (F 36.6 y, 173), 9 (adolescent F 12.6 y, 178).
  Other: seed 48 a respiratory outbreak (7, days 21–24), wounds (3), orphaned infants (3); seed 7 orphaned infants (3).
- The bench (iteration 1 against M6-S39, seeds 48 / 7): adult male day range T-RNG-4 5.72 / 6.33 km (2.91 / 2.44), travel
  share T-ACT-2 0.25 / 0.33 (0.14 / 0.12), hunts T-HUN-1 35.7 / 47.2 per community-year (11.45 / 10.12), party size
  T-PTY-1 4.05 / 4.97 (4.17 / 4.07).
- Per animal-day by phase (Nov–Dec / Jan–Feb / Mar–Apr; seeds 48 + 7 pooled, against E1r's R3, S39 rngSalt 2 seed 48):
  adult males walk 6.93 / 8.19 / 7.84 km on the ground (R3 2.61 / 4.01 / 3.40), walking and climbing 321 / 379 / 357 kcal
  (158 / 212 / 175), net −78 / −145 / +75 (−4 / −37 / +46); juvenile females 9.54 / 7.70 / 5.40 km (2.96 / 4.38 / 3.30),
  net −213 / −198 / −100 (−17 / −164 / −62), fallback 6 / 22 / 31% of plant energy (13 / 15 / 29%), eating at a full
  foregut 23 / 38 / 58% of eating minutes (35 / 65 / 86%); lactating females 8.15 / 9.38 / 9.56 km (2.35 / 4.58 / 3.54),
  net −165 / −198 / −34 (−16 / −108 / +31).
- Depleted animals (aged 5 y+, not adult males, window days 90–179): at −0.3 to −0.5 of the store, 362 eating min a day,
  43% at a full foregut, 15% of daylight on the ground, plant energy 70% drupe / 16% fig / 14% fallback, net −115 (R3: 532,
  82%, 39%, 35 / 33 / 33%, −74); at −0.5 to −0.7: 353, 47%, 12%, 78 / 12 / 10%, −93 (R3: 595, 89%, 47%, 47 / 19 / 34%, −98).
  The trap is gone (drupes, not fallback, and more energy absorbed: juvenile females 1,288 kcal a day in Mar–Apr against
  1,106), but walking costs more than the gain.
- By reserve band, seed 48 (ground km per animal-day; R3 in brackets): window days 0–59, adult males at or near the set
  point 5.73 (2.56), others at or near it 3.94 (2.22), others at −0.1 to −0.3 8.84 (1.70 on 9 animal-days); days
  60–119, others at −0.5 to −0.7 7.90 km with 27% of daylight travelling.
- Named causes: (a) the need that capped phase 2 was E1e's energyNeed (the day's expected spending and the night's fast),
  so balanced animals, whom E1i's satiation sates at a full foregut, were valued with a passage phase at every partial
  fill: every trip's walk was diluted in its rate, and balanced adult males walked 5.7–5.9 km a day and ran deficits;
  (b) with a passage phase every crown is worth about the passage rate whatever its distance, so the candidate jitter
  (±0.12) and the company terms decide between crowns, and depleted animals of seed 48 spend 24–52% of daylight
  travelling (6.8–14.0 km a day).

### 8.5 Iteration 2 (logged before its run)

Integrator, verbatim (5 October 2026, before the run): "Integrator, 5 October: 'the animal's need' in §2 and the §2 ruling
is the reserve deficit, not E1e's energyNeed. Phase 2 values continuing to eat at a full gut, which E1i allows only for
depleted animals. Balanced animals keep today's values."

The integrator's reading of cause (b), verbatim: "I don't accept that (b) is outside E1s. The phase-2 hours sit in the
bout's denominator, which squeezes every crown toward the passage rate (about 0.2–0.33), so distance moves values by about
0.02. On that compressed scale the ±0.12 jitter decides. That is a consequence of E1s's valuation. If iteration 2 still
fails through (b), iteration 3 needs an amendment I approve and register before its run."

- Change (cause a only): `energy.ts` `gutBout`'s `need`, which caps phase 2, is the reserve deficit (−reserves when below
  the set point, 0 otherwise), in the food's own kcal through its absorbed yield. Under E1i's satiation hunger at a full
  foregut is min(1, φ) × max(0, −reserves ÷ store), so only a depleted animal keeps eating there. Consequences: an animal at
  or above its set point keeps today's values for drupe crowns at every fill and for the fallback while its gut has room
  (at a full gut it is sated and its bout is empty: the fallback is worth nothing to it, today its full rate; its drive
  is then about 0.1); a depleted animal's values are iteration 1's while its deficit exceeds what its gut holds. Nothing
  else changes; no constant.
- Pre-run check (the same offline probe as §8.2, iteration 2's code; "need" in the headers is E1e's energyNeed, printed for
  reference; female id 33 is at the set point, juvenile id 17 at −0.68):

**id 33**, female, 15.6 y, 31.3 kg, reserves 0.00 of the store, need 779 kcal, foregut 175 g, walk 0.77 m/s, drupe rate 434 kcal/h

| foregut fill | drupe crown today (50 / 150 / 300 m) | drupe crown gutValue | fig crown gutValue | fallback today (yield 0.6 / 1 / 1.3) | fallback gutValue |
| ---: | --- | --- | --- | --- | --- |
| 0.00 | 0.98 / 0.95 / 0.91 | 0.98 / 0.95 / 0.91 | 1.07 / 1.02 / 0.96 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 0.50 | 0.96 / 0.91 / 0.84 | 0.96 / 0.91 / 0.84 | 1.03 / 0.95 / 0.84 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 0.90 | 0.82 / 0.64 / 0.47 | 0.82 / 0.64 / 0.47 | 0.82 / 0.57 / 0.37 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 0.95 | 0.68 / 0.44 / 0.25 | 0.68 / 0.44 / 0.25 | 0.61 / 0.33 / 0.15 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 0.98 | 0.38 / 0.14 / 0.01 | 0.38 / 0.14 / 0.01 | 0.24 / 0.03 / 0.00 | 0.27 / 0.45 / 0.58 | 0.27 / 0.45 / 0.58 |
| 1.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.00 / 0.00 / 0.00 | 0.27 / 0.45 / 0.58 | 0.00 / 0.00 / 0.00 |

**id 17**, female, 6.6 y, 23.1 kg, reserves -0.68 of the store, need 21245 kcal, foregut 129 g, walk 0.74 m/s, drupe rate 342 kcal/h

| foregut fill | drupe crown today (50 / 150 / 300 m) | drupe crown gutValue | fig crown gutValue | fallback today (yield 0.6 / 1 / 1.3) | fallback gutValue |
| ---: | --- | --- | --- | --- | --- |
| 0.00 | 0.98 / 0.95 / 0.90 | 0.98 / 0.95 / 0.90 | 1.06 / 1.01 / 0.94 | 0.27 / 0.45 / 0.59 | 0.27 / 0.45 / 0.59 |
| 0.50 | 0.96 / 0.90 / 0.82 | 0.51 / 0.50 / 0.49 | 0.42 / 0.41 / 0.40 | 0.27 / 0.45 / 0.59 | 0.26 / 0.33 / 0.35 |
| 0.90 | 0.81 / 0.61 / 0.44 | 0.34 / 0.33 / 0.32 | 0.26 / 0.26 / 0.25 | 0.27 / 0.45 / 0.59 | 0.23 / 0.24 / 0.24 |
| 0.95 | 0.65 / 0.41 / 0.23 | 0.32 / 0.31 / 0.31 | 0.25 / 0.25 / 0.24 | 0.27 / 0.45 / 0.59 | 0.22 / 0.23 / 0.23 |
| 0.98 | 0.35 / 0.12 / 0.00 | 0.31 / 0.30 / 0.30 | 0.24 / 0.24 / 0.23 | 0.27 / 0.45 / 0.59 | 0.22 / 0.22 / 0.22 |
| 1.00 | 0.00 / 0.00 / 0.00 | 0.30 / 0.30 / 0.29 | 0.24 / 0.23 / 0.23 | 0.27 / 0.45 / 0.59 | 0.22 / 0.22 / 0.22 |

- Tests: tests/sim-gut-value.test.ts, 9 (iteration 1's 7, adapted, plus: an animal at or above its set point keeps
  today's values at every fill, the fallback while the gut has room; a deficit smaller than what the gut holds caps
  phase 2, so a crown 100 m away is worth less to the animal than to a deeply depleted one; and the decision sampler
  below reads only). Before the run: `pnpm test` 910 tests, 909 pass, 0 fail, 1 skipped; tsc, `gen-params --check` and
  `decision-guide --check` clean.
- Run: the frozen detached checkout of the commit that adds this entry; S39 + `"gutValue": 1`, rngSalt 0; `pnpm exec tsx
  scripts/e-bench.ts --m6 --seeds 48,7 --animal-days --workers 1 --checkpoint-at 60,100,130,160,190 --params '<S39 +
  gutValue 1>' --out <e1s-gut>/artifacts/validation/e1s/it2/parts/E1s-it2`. The extra checkpoints (06:30 of absolute days
  60, 100, 130, 160, 190: 27 Nov, 6 Jan, 5 Feb, 7 Mar, 6 Apr) only write the world (a continued run is the uninterrupted
  run, tests/e-bench-single-pass.test.ts); one job at a time while the load is above 8.
- Judging: as iteration 1 (§8.3), against the same S39 values (11 below −0.3; lowest −0.683; no starvation; viability).
- The integrator's two readouts (for a possible iteration 3; reported, not judged), with `scripts/e1s-decisions.ts`
  (committed with this entry; measurement only):
  1. depleted animals' (below −0.3) crown values at decision points, both seeds: each checkpoint world (days 60–210) is
     continued 12 h with the rules tap, so the decisions sampled are the run's own; per decision the range of the crown
     options' values and the gap between the best and the second best (as scored, without the jitter, and their food
     terms alone), how often the jitter reverses the best crown, how often the other terms (company for joined trips;
     territory, core, rain) do, and what is chosen; coarse histograms by reserve band. References sampled the same way
     from the day-210 checkpoints of M6-S39 (seeds 48, 7) and R3 (the only checkpoints they have).
  2. ground km per animal-day by reserve band from the per-animal records (iteration 2 against R3), and the share of
     chosen trips over 500 m by reserve band from the samples of readout 1.

### 8.6 Iteration 2: results (run 5 October 14:33–14:45 from the frozen checkout of 654ec36, seeds 48 and 7)

**Fails conditions 1, 2 and 4; condition 3 holds.** Against S39 on the same seeds (§8.3's values):

| | S39 (seeds 48 + 7) | iteration 1 | iteration 2 |
| --- | --- | --- | --- |
| (1) starvation deaths | 0 + 0 | 4 + 7 | 4 + 5 |
| (2) below −0.3 of the store at scored day 180 (aged 5 y+) | 11 (9) | 42 (31) | 24 + 28 = 52 (37) |
| (2) lowest reserve | −0.683 | −0.930 | −0.959 (s7 id 14, lactating F 24.6 y) |
| (3) eating min Nov–Dec → Mar–Apr: juvenile F, adolescent F, pregnant | — | rise | 237 → 288, 240 → 358, 269 → 367: rise |
| (4) viability | pass | fail | fail (births 4, deaths 17, 9 starvation; lowest living share 0.82) |
| T-RNG-4 (adult male day range, km), seeds 48 / 7 | 2.91 / 2.44 | 5.72 / 6.33 | 5.59 / 5.59 |
| T-ACT-2 (travel share) | 0.14 / 0.12 | 0.25 / 0.33 | 0.25 / 0.30 |
| T-HUN-1 (hunts per community-year) | 11.45 / 10.12 | 35.7 / 47.2 | 33.7 / 27.6 |

- Starvation: seed 48 ids 19 (juvenile F 7.3 y, window day 91), 17 (juvenile F 6.3 y, 94), 35 (juvenile F 6.0 y, 136), 14
  (F 24.5 y, 148); seed 7 ids 17 (juvenile F 6.2 y, 51), 19 (juvenile F 7.2 y, 51), 35 (juvenile F 5.9 y, 99), 12 (F
  33.5 y, 138), 15 (F 21.6 y, 174). Other deaths: seed 48 wounds 3, a respiratory illness 1, orphaned infants 3; seed 7
  an orphaned infant.
- Adult males (seeds pooled, Nov–Dec / Jan–Feb / Mar–Apr): 5.15 / 7.60 / 8.10 km on the ground (R3 2.61 / 4.01 / 3.40),
  net −76 / −128 / +35 kcal a day (R3 −4 / −37 / +46), reserves −0.03 / −0.17 / −0.25 of the store: below the set point
  from November, they have a passage phase too. Capping phase 2 by the reserve deficit protects only animals at or above
  the set point; a deficit of 2% of the store already exceeds what the gut holds.
- The integrator's readout 2 (ground km per animal-day by reserve band; iteration 2, seeds pooled, against R3, seed 48):
  window days 90–179, others aged 5 y+ at −0.3 to −0.5 8.51 km (R3 3.55), −0.5 to −0.7 9.35 (2.90), −0.7 to −1 10.54
  (none), travelling 29 / 33 / 38% of daylight (R3 10 / 7%); days 0–89 near the set point (0.5 to −0.1), adult males 4.87
  (2.96), others 4.14 (2.52). Chosen trips over 500 m (12-h samples at days 60–210): depleted animals 4–10% (median trip
  3–89 m), against R3's depleted 23–27% (median 192–351 m) and S39 seed 48's 14–43%: the extra walking is many short
  moves, not long trips.
- The integrator's readout 1 (decisions of animals below −0.3, both seeds, 12-h samples from the checkpoints of days 60,
  100, 130, 160, 190 and 210; S39 and R3 from their day-210 checkpoints): crown values are not compressed: their range is
  ≥ 0.2 in 64–81% of decisions (S39 28–60%, R3 54–73%) and the best leads the second by ≥ 0.2 in 48–65%; the jitter
  reverses the best crown in 13–21% of decisions (S39 22–42%, R3 15–17%). What changes is the choice: depleted animals
  join a departing companion's trip at 32–62% of their decisions (S39 2%, R3 3%) and eat fallback at 1–3% (S39 43–65%,
  R3 30–33%). The joined trips chosen beat the best option of staying (a crown in view, the fallback) by a median 0.75
  (seed 48) and 1.15 (seed 7); their company part is a median 0.23 and 0.51, and their food term alone exceeds the best
  crown in view's by a median 0.22 and 0.14. Many go to a crown 3 m away.
- Why the food term of a joined trip is high: its goal's crop is split among the feeders going there, so its share fits
  in the foregut's room and its bout has no passage phase: it is valued at the full ingestion rate, while an uncrowded
  crown's bout includes the passage of what the gut holds. Offline, the depleted juvenile id 17 at half fill on S39 seed
  48's day-210 world: a 0.05-unit drupe crop is worth 0.98 / 0.95 / 0.80 (3 / 50 / 300 m), a 0.5-unit crop 0.52 / 0.51 /
  0.49. Under gutValue's bout a crop smaller than the room looks twice as good as a large one, so depleted animals follow
  companions to crowded crowns, chase small crops and move every few minutes. Cause (b) as named after iteration 1 (the
  jitter deciding on a compressed scale) is not what the decisions show; the bias toward bouts that end before the
  passage phase is.
