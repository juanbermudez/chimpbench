# E1v: wadging as a tested range (registered 5 October 2026, before any code)

User decision (5 October 2026), on how to model wadging, which no study has measured: **"Test a range"**: run the year
with chimpanzees swallowing all, half and a quarter of the pith's fibre, report starvation for each, and state S39's
viability as depending on wadging, with no single value chosen. Owner: agent `e1v-wadge` (implementation and tests);
the integrator runs and reports the arms.

## 1. Why

E1r–E1u: S39 starves at 12 months (6 deaths in 20 seed-runs). Three decision-side corrections did not remove it (E1s
stopped; E1t not kept, 8 deaths). E1u places the lean-season ceiling in the gut's fibre clearance, set by inputs nobody
has measured, and with the best available data the ceiling falls further, while wild chimpanzees survive lean seasons.
Chimpanzees wadge pith (chew it, swallow the juice, spit out most of the fibre; wrangham1991, harrisonMarshall2011, E1u
§5–6), but the model swallows every gram; no wadge has been weighed, so the swallowed share is unknown.

## 2. Mechanism (parameter `pithFibreSwallowed`, default 1 = today, bit for bit)

The fallback food is a composite of pith and young leaves in the registry (E1u §5.2). A share `1 − pithFibreSwallowed`
of the pith part's fibre (NDF) is not swallowed: it leaves the food's dry matter and fibre before the gut, together with
the energy that fibre would have yielded by fermentation; the rest of the pith (its soluble part) and the leaves are
eaten as now. Intake time and handling are unchanged (the wad is chewed as long as the pith is now). Evidence label:
design assumption (wadging described, never measured; e1u-prereg.md §6). It is an input range, not a fitted value, and
never a prescription. No other input moves.

## 3. Arms (integrator; from a frozen detached checkout of the implementation's merge)

- **Swallowed 1** (all): S39 as it is; the reference groups M6-S39 and M12-S39 (Part C), no new run.
- **Swallowed 0.5** and **swallowed 0.25**: S39 with `pithFibreSwallowed` 0.5 and 0.25, `rngSalt` 0–3 × seeds 48, 7,
  21, 5, 11, 6 months then extended to 12 months (the runner, `--from`), one job per runner while the load is above 8.

## 4. Readouts (fixed now; reported, nothing judged as a keep)

Per arm, at 6 and 12 months: starvation deaths over the 20 seed-runs (and by class and seed), e-bench viability per run,
each class's lowest mean reserve, the fallback share of plant energy and of eating time by class (from the class
readout), eating minutes by class and month, and the summed band distances against S39's group with z as in e-noise.md
amendment 4 (for information). The statement written from them: the swallowed share at and below which S39 has no
starvation in 20 seed-runs, if any of the three.

## 5. Tests (agent)

At 1: compressed goldens, golden hashes and the field pin (`tests/sim-track-e.test.ts`) unchanged, and S39's decisions
on a saved world unchanged. At 0.5 and 0.25: a unit test that the fallback's swallowed dry matter and fibre fall by the
pith share's fibre × (1 − share), that leaves are untouched, and that absorbed energy per gram of swallowed fibre rises;
determinism. The ledger keeps the entry out of the prescription count (an input, design assumption).

## 6. Prediction (integrator, low confidence)

Swallowing half removes most starvation; a quarter removes it, at the cost of a longer fallback share; band distances
move inside noise.

## 7. Implementation log (agent `e1v-wadge`, 5 October 2026; §1–6 above are the registration, unchanged)

### 7.1 Before any code (at 137d5aa)
- **How the fallback composite is defined.** The registry holds it as single values: `digestaFallbackDmGPerMin` 1.89
  g/min, `digestaFallbackNdf` 0.534, `ledgerFallbackKcalPerMin` 4.2 (and `…Sugar`, which S39 reads). No code or entry
  weights pith and leaves separately; the entries' notes give the weighting: pith 1.8 and young leaves 2.1 g of dry
  matter per minute, 58.1% and 43.1% NDF (uwimbabazi2019 Tables 1–2), by Kanyawara feeding time 17.4 : 6.9 (potts2011).
- **The pith part's fibre** (derived from those notes, as E1u's offline arithmetic takes it, `scripts/e1u-gut-sensitivity.ts`
  `wadged`): 17.4 ÷ 24.3 × 1.8 g/min × 0.581 = 0.749 g of NDF per feeding minute on the fallback, 0.742 of the
  composite's 1.89 × 0.534 = 1.009 g/min (pith is 0.716 of the feeding time and 0.684 of the dry matter). The leaves'
  part, 0.260 g/min, is the rest and never changes. In the model's unit (per formula kcal handled) the wadge is
  (1 − `pithFibreSwallowed`) × 0.749 ÷ the fallback's kcal per minute (`plantKcalPerMin`), so at 0.5 and 0.25 the
  fallback swallowed carries 1.516 and 1.328 g of dry matter and 0.635 and 0.448 g of NDF per feeding minute.
- **Plan.** `energy.ts digesta()`: the fallback's food per formula kcal handled (dry matter, fibre, non-fibre energy)
  loses the wadge from its dry matter and fibre at `pithFibreSwallowed` < 1; its non-fibre energy is unchanged. What
  reads the food reads it as swallowed: `eat` (foregut fill, fibre to the hindgut, `in` at the fermentation yield,
  `dmIn`), `gutRoom`, `gutBout`. Unchanged: intake (`fallbackKcalPerH`, formula kcal handled per feeding minute; the
  forage cell loses what is handled), `fin` (formula energy handled, the field's measure, which counts the wadge: E1u
  §5.3; the fallback's share of plant energy keeps its units across arms), the food's water (`water.ts foodWater` reads
  the dry matter handled: the wadge is taken as fibre only, as E1u did, so the juice is swallowed). Faecal dry matter
  falls with the fibre not swallowed (a consequence, not an input). At 1 the code path is today's (no RNG, no state).
  `scripts/lib/gut-ceiling.ts` reads the swallowed food from the model so the offline tool follows the parameter.
- **Pins on the unchanged code** (scratch script, S39 field seed 48, `tickWorld`): world hashes at ticks 6720 and 8160
  `be3269e9cc69f676` and `f57cf21e1f863541`; every animal's decision values `93ced3a9df1c66ce` and `0ff4d71478f53323`
  (E1s's pins at eb2b209); the window resumed from the saved 6720 world gives `f57cf21e1f863541`. Fallback eaten: 2,913
  kcal by 17 animals before tick 6720 and 698 kcal by 6 animals in the window, so a share below 1 acts within it.

### 7.2 Implementation and tests (e81c212, bbf2ac6)
- `data/params.json` `pithFibreSwallowed` (group feeding, default 1, range 0.25–1 by the user's arms, hard range 0–1,
  evidence design, calibration excluded; refs to research.md's wadging sources), `docs/simulation.md` §17 row.
- `src/sim/energy.ts`: `swallowed()` builds the fallback's food as the gut receives it (dry matter and fibre less the
  wadge, non-fibre energy unchanged; at 1 the same object, so today's code path); the pith part's fibre is the constant
  `PITH_NDF_G_PER_MIN` (0.749 g/min, from the registry composite's own weighting, §7.1; tagged [H] with a `lint-ok:`
  note, as no second parameter was asked for). `dryMatterPerKcal` returns the dry matter handled (the food's water is
  unchanged); `swallowedPerKcal` (new) the food swallowed, which `scripts/lib/gut-ceiling.ts` now reads.
- `scripts/lib/prescriptions.ts`: an override classes it **input** (kind "food handling", marked † as a judgement
  call; reason "design assumption: … wadging described, never measured …"), read only with `energyLedger` and
  `ledgerDigesta`. `scripts/prescription-ledger.ts --count --params` on M6-S39's parameters: 42 (37 + 5 literals) at 1,
  0.5 and 0.25. `docs/decision-guide.html`: only the stamp moves.
- `tests/sim-wadging.test.ts` (10 tests, all pass): default 1 in both profiles; at 1 the S39 world (ticks 6720 and
  8160) and every animal's decision values are §7.1's pins, by default and with the parameter set to 1; at 0.5 the
  saved world's decision values are unchanged until fallback is eaten and the world differs after 6 h; at 0.5 and 0.25
  dry matter and fibre swallowed fall by (1 − share) × the pith fibre per kcal, the non-fibre energy, the leaves'
  fibre, the other foods, intake, the dry matter handled and the food's water are unchanged, and the per-minute values
  are §7.1's (1.516 / 0.635 and 1.328 / 0.448 g); absorbed energy per gram of fibre swallowed rises (per kcal handled it
  falls by the fermentation of the fibre spat out); `eat` books the dry matter and fibre swallowed and the formula
  energy handled in full, and more fallback fits in the foregut's room; determinism at 0.25 (tick-by-tick against
  2-s batches; a save resumes exactly); inert without `ledgerDigesta`; the offline ceiling at each share equals E1u's
  arithmetic (`wadged` with `sameTime`) to 1e-9; the ledger classes the entry input and the S39 count does not move.
  Existing suites touched by the change (golden, field pin, params, ledger, digesta, energy, water, gut value, E1u
  ceiling): 95 tests pass.
- **Offline check** (`scripts/e1v-wadge-ceiling.ts`, E1u's tool and animals: S39's parameters and M6-S39's seed-48
  world at day 210; a juvenile female copy at 20 kg and pregnant female id 15, 31.3 kg; E1r's March–April diets, figs
  0.25 of fruit energy, 12-h active day; feeding time held; output `artifacts/validation/e1v/wadge-ceiling.{json,md}`,
  gitignored). Change at the ceiling against swallowing all of it, kcal/d (S39 diets: fallback 29% and 25% of plant
  energy):

| pith fibre swallowed | Δ absorbed, juvenile F 20 kg / pregnant F | Δ (absorbed − thermogenesis), same | four animal-diets (S39 and S31 diets), Δ (absorbed − thermogenesis) | E1u's arithmetic, same share spat out |
| ---: | --- | --- | --- | --- |
| 0.5 | +90 / +126 | +81 / +113 | +81 to +175 | +81 to +175 |
| 0.25 | +146 / +201 | +131 / +181 | +131 to +296 | +131 to +296 |

  E1u's estimate recomputed with the same tool (half to all of the pith's fibre spat out, four animal-diets): +81 to
  +342. So the two arms sit inside it: 0.5 is its lower end (+81 to +175), 0.25 its 75% row (+131 to +296); swallowing
  none (+188 to +342) is not an arm. Against E1r's S39 deficits (juvenile −62, pregnant −72 kcal/d) both arms more than
  cover them at the ceiling (an upper bound: a higher ceiling may stop binding). Fibre swallowed falls only 2–6% (the
  hindgut is full 51–53% of active ticks at 1, 32–41% at the arms); the gain comes from more food handled per day (943
  → 1,091 → 1,182 formula kcal for the juvenile).

### 7.3 Smoke run (logged before it runs)
- From a frozen detached checkout of the commit that adds this entry (node_modules and data/raw symlinked; `git status
  --short` empty there), `--workers 1`, one job at a time: `scripts/e-bench.ts --quick --seeds 48` (burn-in 30, 30
  days) with M6-S39's parameters and `pithFibreSwallowed` 0.25; then the same with M6-S39's parameters alone as the
  paired reference (the same code path at 1 is today's, §7.2). Outputs in this worktree's
  `artifacts/validation/e1v/smoke-p025*` and `smoke-p1*` (gitignored). Seed 48 only, a development seed.
- Purpose: the run completes (viability verdict, energy and rhythm readouts written). Expected direction against the
  reference, by class, from §2 and §7.2: dry matter swallowed per formula kcal eaten (`dmIn` ÷ `formulaIn`) lower, faecal
  fibre energy (`fecal`) lower, hindgut fill and days with a full hindgut lower, wherever fallback is eaten. Nothing
  else is predicted (the window, late October to late November, is not the lean season); nothing is judged.

### 7.4 Smoke run result (a7e9439, frozen detached checkout, clean; seed 48, burn-in 30, 30 days, `--workers 1`)
Both runs completed (84 s and 71 s for the seed); outputs `artifacts/validation/e1v/smoke-p025*` and `smoke-p1*`;
tables generated from their JSON (`smoke-compare.py` in the agent's scratch).

| run | viability | living start → end | deaths (starvation) | fitted distance | held-out distance | prescriptions |
| --- | --- | --- | --- | ---: | ---: | ---: |
| pithFibreSwallowed 1 | pass | 49 → 49 | 0 (0) | 2.382 | 9.386 | 42 |
| pithFibreSwallowed 0.25 | pass | 49 → 49 | 0 (0) | 3.634 | 4.603 | 42 |

| class | n | formula kcal/d: 1 → 0.25 | dry matter g/d: 1 → 0.25 | g dry matter per formula kcal: 1 → 0.25 | faecal fibre kcal/d: 1 → 0.25 | hindgut fill: 1 → 0.25 | share of day hindgut full: 1 → 0.25 | energy in kcal/d: 1 → 0.25 | energy in − faecal kcal/d: 1 → 0.25 | eating min/d: 1 → 0.25 | fruit share: 1 → 0.25 | reserves (÷ store): 1 → 0.25 |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adult male | 14/14 | 1620 → 1644 | 692 → 696 | 0.427 → 0.424 | 477 → 473 | 0.651 → 0.646 | 0.001 → 0.000 | 2023 → 2035 | 1546 → 1562 | 226 → 230 | 0.958 → 0.945 | 0.002 → 0.001 |
| female, other | 5/6 | 1329 → 1408 | 592 → 595 | 0.445 → 0.423 | 426 → 393 | 0.725 → 0.668 | 0.035 → 0.003 | 1689 → 1659 | 1263 → 1267 | 212 → 231 | 0.746 → 0.665 | -0.002 → -0.003 |
| female, pregnant | 4/4 | 1408 → 1479 | 629 → 625 | 0.447 → 0.422 | 456 → 418 | 0.776 → 0.710 | 0.105 → 0.001 | 1795 → 1766 | 1338 → 1348 | 247 → 234 | 0.693 → 0.727 | -0.017 → -0.008 |
| female, lactating | 8/8 | 1827 → 1919 | 823 → 813 | 0.451 → 0.424 | 598 → 537 | 0.791 → 0.711 | 0.112 → 0.001 | 2333 → 2265 | 1735 → 1728 | 294 → 310 | 0.723 → 0.680 | -0.019 → -0.016 |
| lact: infant 0.5–2 y | 4/4 | 1826 → 1956 | 825 → 833 | 0.452 → 0.426 | 602 → 543 | 0.796 → 0.720 | 0.116 → 0.001 | 2335 → 2272 | 1733 → 1729 | 297 → 326 | 0.703 → 0.605 | -0.018 → -0.022 |
| lact: infant ≥ 2 y | 4/4 | 1828 → 1882 | 822 → 794 | 0.450 → 0.422 | 593 → 530 | 0.785 → 0.702 | 0.109 → 0.001 | 2330 → 2258 | 1737 → 1728 | 291 → 293 | 0.743 → 0.764 | -0.019 → -0.010 |
| juvenile 5–12 y | 6/6 | 1327 → 1332 | 564 → 566 | 0.425 → 0.425 | 391 → 385 | 0.762 → 0.751 | 0.063 → 0.044 | 1658 → 1640 | 1267 → 1255 | 256 → 263 | 0.941 → 0.907 | -0.032 → -0.031 |
| infant 2–5 y | 4/4 | 638 → 639 | 211 → 201 | 0.331 → 0.315 | 114 → 98 | 0.522 → 0.452 | 0.000 → 0.000 | 734 → 715 | 621 → 617 | 130 → 129 | 0.866 → 0.871 | -0.019 → -0.012 |
| infant 0.5–2 y | 4/4 | 368 → 369 | 90 → 87 | 0.243 → 0.237 | 26 → 21 | 0.202 → 0.157 | 0.000 → 0.000 | 391 → 385 | 364 → 363 | 38 → 31 | 0.722 → 0.675 | -0.023 → -0.023 |

- As registered (§7.3), against the paired reference: dry matter swallowed per formula kcal falls where fallback is
  eaten (adult females 0.445–0.452 → 0.422–0.426 g; males and juveniles, 94–96% fruit, about unchanged), faecal fibre
  energy falls in every class, hindgut fill falls in every class and the share of the day with a full hindgut falls
  from 0.035–0.116 to 0.001–0.003 in the female classes. Viability passes in both; no death.
- Not predicted, reported: females handle 3–7% more formula energy a day and absorb about the same (energy in − faecal,
  which ignores the gut pools' change over the window, within 1%): in late October to November the gut seldom binds,
  so the drive sets what is absorbed. "Energy in" falls because it counts fibre at its full fermentation yield and less
  fibre is swallowed. The band distances are not comparable: one seed, and the two sums run over different rows (rows
  flagged by the instrument bar: fitted 2 and 1, held-out 23 and 19); nothing is judged.
- The arms' code is a7e9439 plus documentation (f84e6d4) and the merge of track-e; nothing in `src/sim`, the registry or
  the ledger changed after the smoke run.

### 7.5 Final checks (after merging track-e 2d5a6e0 once, at 794133d)
`gen-params --check` valid and lint clean; `tsc --noEmit` clean; `pnpm test` 943 tests, 942 pass, 0 fail, 1 skipped (the
decide-ft stand-in run, missing its artifact, as before); `decision-guide --check` up to date and agrees with the ledger;
`git ls-files data/raw node_modules` prints nothing. For the arms: M6-S39's parameters plus `pithFibreSwallowed` 0.5 or
0.25; nothing else moves.

## 8. The arms (integrator; §1–6 are the registration, unchanged)

### 8.1 Run log, written before any arm's result (6 October 2026, 00:15 New York time)
- **Where.** The project moved to a second computer (Apple M4, 10 cores, 16 GB; Node 22.22.3, pnpm 8.15.9). Frozen
  detached checkout `.claude/worktrees/bench-e1v` at 1af4543 (E1v's merge; the hash aecbe0e of §5 of the handoff, after
  the history rewrite), `git status --short` empty. On this computer at track-e 60e0028: `pnpm test` 943 tests, 941
  pass, 0 fail, 2 skipped (the second skip is the scorecard check that needs the hand-copied `c7a-field1y.json`), so the
  compressed goldens, the field pin and §7.1's S39 pins (ticks 6720 and 8160) reproduce here bit for bit.
- **A failed first launch, no simulation run.** Under Node 22.19.0 all 20 jobs of M6-W25 exited in 0.1 min with
  `ERR_MODULE_NOT_FOUND` (tsx's loader does not reach worker threads on that Node). Those four run folders held only the
  failed logs and were deleted; the plans were made again under Node 22.22.3. Nothing was simulated, so this is not an
  iteration.
- **Arms and order.** Parameter files `docs/staging/integrator-kit/params/M6-W25{,-s1,-s2,-s3}.json` and
  `M6-W50{…}.json` (S39 plus `pithFibreSwallowed` 0.25 / 0.5), seeds 48, 7, 21, 5, 11, one job per runner, four runners
  at a time. Order: W25 at 6 months, extended to 12 (`--from`); then W50 the same.
- **The reference (swallowed 1).** The Part C runs (bench-run, 63d699a) were not on this computer when the arms
  started. Unless the user copies them, S39's group is regenerated in `bench-e1v` at 1af4543 from
  `params/M6-S39{,-s1,-s2,-s3}.json` (labels M6-S39…, M12-S39…), after the two arms. Every switch added since 63d699a is
  off in those files and was tested hash-identical at its default, so the regenerated group should reproduce Part C:
  0 starvation deaths at 6 months and 6 at 12 months in 20 seed-runs (seeds 5, 11 and 48; `e-rebaseline.md`). If it
  does not, that is reported first and the arms are judged only against the regenerated group.
- **Judge.** `docs/staging/integrator-kit/scripts/judge_e1v.py <M6|M12>` (readouts of §4; every number from the run
  JSON), monthly eating minutes and the fruit share from `scripts/lean-season.ts --group`. Nothing is judged as a keep.

### 8.2 Incident before the 12-month results: the repo moved off an iCloud-synced folder (6 October 2026, 01:25)
- **What happened.** The first clone was in `~/Desktop/MGOGO`, which iCloud Drive syncs on this computer. macOS evicted
  most of its files while the arms ran. W25's four 6-month runs finished and merged before any failure (00:44–00:45,
  exit 0). The 12-month extension then stopped: in each of the four runs seed 48 finished (10.9 min), then the runner's
  `git status` failed on an evicted pack file and the next launches failed on evicted `node_modules` files (00:57–00:59).
- **What was done.** A fresh clone at `/Volumes/Drive/chimpbench/MGOGO` (external drive, not synced), the unpushed
  commits fetched from the Desktop copy, a new frozen checkout `bench-e1v` at 1af4543 (`git status --short` empty). The
  four finished M6-W25 run folders were re-downloaded from iCloud and copied over; all 64 gzip files in them pass
  `gunzip -t`; their JSON records commit 1af4543, not dirty. The four partial M12-W25 folders were set aside
  (`artifacts/integrator/desktop-M12-W25-partial/`) and M12-W25 was planned again from the copied M6 checkpoints.
- **Check registered now, before the new M12 results:** each new M12-W25 seed-48 part must equal the part the Desktop
  runner wrote for the same run (`e-run.ts diff`, which ignores dates, timing and workers). If any differs, the copied
  M6-W25 group is discarded and re-run here before anything is judged.
- **The reference.** The user copied the Part C S39 groups (M6-S39… and M12-S39…, made at 63d699a = dbee12e in the
  public history) into `.claude/worktrees/bench-run`; SHA-256 of the archive matched. They are the swallowed-1 arm, as
  registered in §3, so no group is regenerated.

### 8.3 W25 (swallowed 0.25), interim entry (6 October 2026, 02:45; W50 not started when this was written)
- **§8.2's check passed.** `integrator-kit/scripts/partdiff.py` on the seed-48 part of each of the four M12-W25 runs,
  redone on the external drive against the part written on the Desktop: 10 leaves differ in each, all of them dates,
  timings and paths; 0 others. The copied M6-W25 group stands.
- **Starvation at 12 months (judge_e1v.py M12 W25, from the JSON): 0 deaths in 20 seed-runs at 0.25, against S39's 6**
  (adolescent 3, pregnant female 2, infant 2–5 y 1; seeds 5, 11 and 48). All four W25 runs pass viability (births /
  deaths 24/10, 26/6, 24/7, 26/14); three of S39's four fail. At 6 months both groups have 0.
- The full tables (both arms, both horizons) follow in §8.4 once W50 is in.

### 8.4 Result: both arms, 6 and 12 months (6 October 2026, 04:50; every table below is the judge's output, unedited)

**Statement (§4): S39 has no starvation in 20 seed-runs at a swallowed share of 0.5 or less.** Starvation deaths at 12
months: 6 in 20 seed-runs with all of the pith's fibre swallowed (S39 as it is), 0 in 20 at 0.5 and 0 in 20 at 0.25. At
6 months all three have 0. All eight 12-month runs of the two arms pass viability; three of S39's four fail. S39's
viability at 12 months therefore depends on wadging, an input nobody has measured: with no fibre spat out it starves,
with half or more of the pith's fibre spat out it does not, in this sample. No value is chosen; the default stays 1.

**Against the prediction (§6).** "Swallowing half removes most starvation; a quarter removes it": half removed all of
it in 20 seed-runs. "At the cost of a longer fallback share": wrong, the non-fruit share of eating time fell or held in
every class (pregnant females 0.36 → 0.28 and 0.27; juveniles 0.20 → 0.12 and 0.11). "Band distances move inside
noise": true at 0.25 (largest |z| 2.0, at the threshold, not past it); **not true at 0.5**, where two of the four runs
have a fitted sum past the rule (z +4.2 and +5.7; one at −2.5) and one a held-out sum without the rare rows at +3.3.

**What drives the 0.5 arm's fitted sums (read from the rows, not judged).** One row, T-DEM-1 (first-year mortality,
band 0.11–0.19): 0.32 and 0.40 in the two runs, 0.21 and 0.13 in the others (S39: inside the band in three runs of
four; 0.25 arm: 0.07 to 0.25). The deaths are illness in infants under six months (4 and 6 in those two runs), none of
them starvation. With about 25 births a run this row moves by 0.04 per death, and the fitted noise floor (0.30) was
measured on 60-day windows where it does not score. Whether the energy ledger changes an infant's illness risk was not
checked here; it is an open question, not a finding about wadging.

**What 0 in 20 supports.** If the true rate were S39's (6 in 20 seed-runs), 0 in 20 would have probability about
0.002 (Poisson, mean 6), so the fall is not noise. It does not show the rate is zero: 0 in 20 is compatible with a true
rate of up to about 3 in 20 (95% bound). The three-year runs of `e-years-prereg.md` add lean seasons.

**After the move (§8.2).** The check passed for all four runs (§8.3). The 0.5 arm ran wholly on the external drive.

#### 6 months
##### E1v, M6: S39 with pithFibreSwallowed W25, W50 against S39 (swallowed 1); 4 runs each (rngSalt 0-3); reference group in bench-run; printed by docs/staging/integrator-kit/scripts/judge_e1v.py from the JSON

| run | commit | protocol | prescriptions | viability | starvation | starvation by seed | births / deaths | deaths by class | night: adults out of a nest, T-RHY-5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M6-S39 | 63d699a | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 1 | {'adolescent: illness': 1} | adults out of a nest 2.71% of night; T-RHY-5 0.0254; night deaths 1; deaths 1 |
| M6-S39-s1 | 63d699a | 5d4fa5a2a500bce6 | 42 | FAIL births 10 < deaths 12 | 0 | - | 10 / 12 | {'infant 0.5–2 y: respiratory illness (outbreak)': 2, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'female, lactating: illness': 2, 'female, lactating: snare injury': 1, 'infant 2–5 y: orphaned infant, did not survive without its mother': 1, 'infant < 0.5 y: respiratory illness (outbreak)': 1, 'adolescent: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'infant < 0.5 y: illness': 1, 'adult male: illness': 1} | adults out of a nest 2.61% of night; T-RHY-5 0.0252; night deaths 6; deaths 12 |
| M6-S39-s2 | 63d699a | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 6 | {'adult male: illness': 2, 'infant 0.5–2 y: infanticide by Chiriku (East community)': 1, 'infant 0.5–2 y: illness': 1, 'infant < 0.5 y: illness': 2} | adults out of a nest 2.60% of night; T-RHY-5 0.0247; night deaths 2; deaths 6 |
| M6-S39-s3 | 63d699a | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 3 | {'juvenile 5–12 y: illness': 2, 'infant 0.5–2 y: illness': 1} | adults out of a nest 2.56% of night; T-RHY-5 0.0243; night deaths 1; deaths 3 |
| M6-W25 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 2 | {'adult male: illness': 1, 'female, lactating: illness': 1} | adults out of a nest 2.41% of night; T-RHY-5 0.0219; night deaths 1; deaths 2 |
| M6-W25-s1 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 5 | {'female, other: illness': 1, 'adult male: illness': 2, 'infant < 0.5 y: illness': 1, 'infant < 0.5 y: infanticide by Koruza (West community)': 1} | adults out of a nest 2.57% of night; T-RHY-5 0.0232; night deaths 2; deaths 5 |
| M6-W25-s2 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 2 | {'adult male: illness': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.53% of night; T-RHY-5 0.0229; night deaths 1; deaths 2 |
| M6-W25-s3 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 5 | {'adult male: illness': 1, 'infant 2–5 y: illness': 1, 'infant 0.5–2 y: illness': 2, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.44% of night; T-RHY-5 0.0222; night deaths 2; deaths 5 |
| M6-W50 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 5 | {'female, other: illness': 1, 'infant < 0.5 y: illness': 2, 'female, other: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: respiratory illness (outbreak)': 1} | adults out of a nest 2.55% of night; T-RHY-5 0.0233; night deaths 1; deaths 5 |
| M6-W50-s1 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 9 | {'female, pregnant: illness': 1, 'infant < 0.5 y: infanticide by Koruza (West community)': 1, 'adult male: respiratory illness (outbreak)': 1, 'adult male: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 2, 'infant 0.5–2 y: illness': 1} | adults out of a nest 2.56% of night; T-RHY-5 0.0230; night deaths 4; deaths 9 |
| M6-W50-s2 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 10 / 0 | - | adults out of a nest 2.52% of night; T-RHY-5 0.0234; night deaths 0; deaths 0 |
| M6-W50-s3 | 1af4543 | 5d4fa5a2a500bce6 | 42 | FAIL births 10 < deaths 11 | 0 | - | 10 / 11 | {'infant 0.5–2 y: illness': 1, 'adult male: respiratory illness (outbreak)': 3, 'female, lactating: respiratory illness (outbreak)': 1, 'female, pregnant: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'juvenile 5–12 y: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'adult male: illness': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.54% of night; T-RHY-5 0.0232; night deaths 5; deaths 11 |

**Starvation deaths over the seed-runs, by class** (prereg §4):

| arm | seed-runs | starvation deaths | by class |
| --- | --- | --- | --- |
| S39 (swallowed 1) | 20 | 0 | - |
| W25 (swallowed 0.25) | 20 | 0 | - |
| W50 (swallowed 0.5) | 20 | 0 | - |

| sum, W25 (rows scored in all 8 runs; for information) | S39: 4 runs | mean ± SD | W25: 4 runs | z of each W25 run (rngSalt 0 first; SD used) |
| --- | --- | --- | --- | --- |
| fitted (18) | 3.05 / 2.48 / 2.72 / 2.51 | 2.69 ± 0.26 | 2.87 / 2.79 / 2.91 / 2.86 | +0.5 / +0.3 / +0.7 / +0.5 (0.30) |
| held-out (27) | 8.98 / 9.11 / 7.79 / 9.39 | 8.82 ± 0.71 | 8.49 / 8.19 / 7.68 / 8.32 | -0.2 / -0.4 / -0.7 / -0.3 (1.45) |
| held-out w/o rare (24) | 7.43 / 7.51 / 7.31 / 7.24 | 7.37 ± 0.12 | 7.52 / 7.43 / 6.75 / 7.79 | +0.6 / +0.2 / -2.6 / +1.8 (0.21) |

| sum, W50 (rows scored in all 8 runs; for information) | S39: 4 runs | mean ± SD | W50: 4 runs | z of each W50 run (rngSalt 0 first; SD used) |
| --- | --- | --- | --- | --- |
| fitted (18) | 3.05 / 2.48 / 2.72 / 2.51 | 2.69 ± 0.26 | 3.02 / 2.40 / 3.37 / 2.62 | +1.0 / -0.9 / +2.0 / -0.2 (0.30) |
| held-out (27) | 8.98 / 9.11 / 7.79 / 9.39 | 8.82 ± 0.71 | 8.85 / 8.04 / 8.38 / 10.67 | +0.0 / -0.5 / -0.3 / +1.1 (1.45) |
| held-out w/o rare (24) | 7.43 / 7.51 / 7.31 / 7.24 | 7.37 ± 0.12 | 7.48 / 7.04 / 7.16 / 7.44 | +0.5 / -1.4 / -0.9 / +0.3 (0.21) |

Lowest point of each class's mean reserve trajectory (relative to the store), per run:
| class | S39 runs | W25 runs | W50 runs |
| --- | --- | --- | --- |
| adult male | -0.026 / -0.021 / -0.021 / -0.023 | -0.026 / -0.029 / -0.025 / -0.024 | -0.022 / -0.027 / -0.023 / -0.020 |
| female, lactating | -0.131 / -0.128 / -0.128 / -0.130 | -0.092 / -0.096 / -0.092 / -0.091 | -0.095 / -0.102 / -0.098 / -0.090 |
| female, other | -0.049 / -0.063 / -0.042 / -0.057 | -0.039 / -0.046 / -0.040 / -0.044 | -0.036 / -0.042 / -0.043 / -0.038 |
| infant 0.5–2 y | -0.183 / -0.175 / -0.186 / -0.174 | -0.152 / -0.152 / -0.161 / -0.157 | -0.165 / -0.160 / -0.146 / -0.157 |
| infant 2–5 y | -0.073 / -0.148 / -0.071 / -0.079 | -0.070 / -0.074 / -0.069 / -0.065 | -0.069 / -0.081 / -0.072 / -0.067 |
| infant < 0.5 y | -0.247 / -0.234 / -0.210 / -0.235 | -0.113 / -0.103 / -0.099 / -0.104 | -0.099 / -0.120 / -0.114 / -0.086 |
| juvenile 5–12 y | -0.185 / -0.165 / -0.198 / -0.236 | -0.148 / -0.146 / -0.138 / -0.140 | -0.146 / -0.146 / -0.146 / -0.141 |

Non-fruit share of eating time by class (1 - fruitShare of the class readout: fallback plus meat), mean over runs:
| class | S39 | W25 | W50 |
| --- | --- | --- | --- |
| adult male | 0.07 | 0.07 | 0.07 |
| female, other | 0.27 | 0.27 | 0.27 |
| female, pregnant | 0.36 | 0.30 | 0.29 |
| female, lactating | 0.31 | 0.28 | 0.27 |
| lact: infant < 0.5 y | 0.54 | 0.33 | 0.35 |
| lact: infant 0.5–2 y | 0.32 | 0.30 | 0.30 |
| lact: infant ≥ 2 y | 0.24 | 0.25 | 0.24 |
| juvenile 5–12 y | 0.15 | 0.11 | 0.11 |
| infant 2–5 y | 0.20 | 0.18 | 0.18 |
| infant 0.5–2 y | 0.45 | 0.43 | 0.45 |
| infant < 0.5 y | nan | nan | nan |

#### 12 months
##### E1v, M12: S39 with pithFibreSwallowed W25, W50 against S39 (swallowed 1); 4 runs each (rngSalt 0-3); reference group in bench-run; printed by docs/staging/integrator-kit/scripts/judge_e1v.py from the JSON

| run | commit | protocol | prescriptions | viability | starvation | starvation by seed | births / deaths | deaths by class | night: adults out of a nest, T-RHY-5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M12-S39 | 63d699a | 5d4fa5a2a500bce6 | 42 | FAIL 2 starvation deaths | 2 | 5:1, 11:1 | 23 / 7 | {'female, lactating: illness': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'female, lactating: wounds from a fight with Jambiri': 1, 'adolescent: starvation': 1, 'adolescent: illness': 1, 'female, pregnant: starvation': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.66% of night; T-RHY-5 0.0245; night deaths 5; deaths 7 |
| M12-S39-s1 | 63d699a | 5d4fa5a2a500bce6 | 42 | FAIL 2 starvation deaths | 2 | 5:1, 11:1 | 26 / 18 | {'infant 0.5–2 y: respiratory illness (outbreak)': 2, 'infant 2–5 y: respiratory illness (outbreak)': 1, 'female, lactating: illness': 2, 'infant 2–5 y: orphaned infant, did not survive without its mother': 3, 'female, lactating: snare injury': 1, 'infant < 0.5 y: respiratory illness (outbreak)': 1, 'adolescent: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'infant < 0.5 y: illness': 3, 'adult male: illness': 1, 'adolescent: starvation': 1, 'female, pregnant: starvation': 1} | adults out of a nest 2.58% of night; T-RHY-5 0.0242; night deaths 9; deaths 18 |
| M12-S39-s2 | 63d699a | 5d4fa5a2a500bce6 | 42 | FAIL 2 starvation deaths | 2 | 48:1, 5:1 | 25 / 10 | {'adult male: illness': 2, 'infant 2–5 y: starvation': 1, 'infant 0.5–2 y: infanticide by Chiriku (East community)': 1, 'infant 0.5–2 y: illness': 1, 'infant < 0.5 y: illness': 3, 'adolescent: starvation': 1, 'female, other: illness': 1} | adults out of a nest 2.58% of night; T-RHY-5 0.0238; night deaths 3; deaths 10 |
| M12-S39-s3 | 63d699a | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 25 / 6 | {'juvenile 5–12 y: illness': 2, 'female, other: wounds from a fight with Jambiri': 1, 'infant 2–5 y: illness': 1, 'infant 0.5–2 y: illness': 2} | adults out of a nest 2.59% of night; T-RHY-5 0.0240; night deaths 3; deaths 6 |
| M12-W25 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 24 / 10 | {'adult male: respiratory illness (outbreak)': 2, 'female, other: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'adult male: illness': 2, 'female, lactating: wounds from a fight with Jambiri': 1, 'infant < 0.5 y: illness': 1, 'female, lactating: illness': 1, 'infant 0.5–2 y: illness': 1} | adults out of a nest 2.44% of night; T-RHY-5 0.0211; night deaths 2; deaths 10 |
| M12-W25-s1 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 26 / 6 | {'female, other: illness': 1, 'adult male: illness': 3, 'infant < 0.5 y: illness': 1, 'infant < 0.5 y: infanticide by Koruza (West community)': 1} | adults out of a nest 2.56% of night; T-RHY-5 0.0220; night deaths 2; deaths 6 |
| M12-W25-s2 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 24 / 7 | {'adult male: illness': 4, 'infant < 0.5 y: illness': 2, 'infant < 0.5 y: infanticide by Koruza (West community)': 1} | adults out of a nest 2.52% of night; T-RHY-5 0.0218; night deaths 3; deaths 7 |
| M12-W25-s3 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 26 / 14 | {'adult male: illness': 3, 'infant < 0.5 y: illness': 3, 'adolescent: snare injury': 1, 'infant 2–5 y: illness': 1, 'infant 0.5–2 y: illness': 2, 'adult male: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 2} | adults out of a nest 2.41% of night; T-RHY-5 0.0207; night deaths 5; deaths 14 |
| M12-W50 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 26 / 7 | {'female, other: illness': 1, 'infant < 0.5 y: illness': 4, 'female, other: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: respiratory illness (outbreak)': 1} | adults out of a nest 2.53% of night; T-RHY-5 0.0220; night deaths 3; deaths 7 |
| M12-W50-s1 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 24 / 12 | {'female, pregnant: illness': 1, 'adult male: respiratory illness (outbreak)': 3, 'infant < 0.5 y: infanticide by Koruza (West community)': 1, 'adult male: illness': 1, 'female, other: respiratory illness (outbreak)': 1, 'female, lactating: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 2, 'infant 0.5–2 y: illness': 1, 'infant < 0.5 y: illness': 1} | adults out of a nest 2.52% of night; T-RHY-5 0.0220; night deaths 5; deaths 12 |
| M12-W50-s2 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 25 / 5 | {'female, lactating: illness': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'infant 0.5–2 y: illness': 2, 'female, other: illness': 1} | adults out of a nest 2.52% of night; T-RHY-5 0.0223; night deaths 2; deaths 5 |
| M12-W50-s3 | 1af4543 | 5d4fa5a2a500bce6 | 42 | pass | 0 | - | 29 / 20 | {'infant < 0.5 y: illness': 6, 'adult male: illness': 3, 'infant 2–5 y: illness': 1, 'infant 0.5–2 y: illness': 2, 'adult male: respiratory illness (outbreak)': 3, 'female, lactating: respiratory illness (outbreak)': 1, 'female, pregnant: respiratory illness (outbreak)': 1, 'infant 0.5–2 y: orphaned infant, did not survive without its mother': 1, 'juvenile 5–12 y: respiratory illness (outbreak)': 1, 'infant 2–5 y: respiratory illness (outbreak)': 1} | adults out of a nest 2.49% of night; T-RHY-5 0.0219; night deaths 9; deaths 20 |

**Starvation deaths over the seed-runs, by class** (prereg §4):

| arm | seed-runs | starvation deaths | by class |
| --- | --- | --- | --- |
| S39 (swallowed 1) | 20 | 6 | adolescent 3, female, pregnant 2, infant 2–5 y 1 |
| W25 (swallowed 0.25) | 20 | 0 | - |
| W50 (swallowed 0.5) | 20 | 0 | - |

| sum, W25 (rows scored in all 8 runs; for information) | S39: 4 runs | mean ± SD | W25: 4 runs | z of each W25 run (rngSalt 0 first; SD used) |
| --- | --- | --- | --- | --- |
| fitted (27) | 4.15 / 4.41 / 4.66 / 4.38 | 4.40 ± 0.21 | 3.75 / 4.48 / 4.25 / 4.80 | -2.0 / +0.2 / -0.4 / +1.2 (0.30) |
| held-out (35) | 15.19 / 14.52 / 14.51 / 16.38 | 15.15 ± 0.88 | 14.01 / 14.62 / 15.55 / 14.83 | -0.7 / -0.3 / +0.2 / -0.2 (1.45) |
| held-out w/o rare (32) | 13.56 / 13.47 / 13.32 / 13.92 | 13.57 ± 0.26 | 13.23 / 13.56 / 13.81 / 13.45 | -1.2 / -0.0 / +0.8 / -0.4 (0.26) |

| sum, W50 (rows scored in all 8 runs; for information) | S39: 4 runs | mean ± SD | W50: 4 runs | z of each W50 run (rngSalt 0 first; SD used) |
| --- | --- | --- | --- | --- |
| fitted (27) | 4.15 / 4.41 / 4.66 / 4.38 | 4.40 ± 0.21 | 5.82 / 3.56 / 4.23 / 6.32 | +4.2 / -2.5 / -0.5 / +5.7 (0.30) |
| held-out (35) | 15.19 / 14.52 / 14.51 / 16.38 | 15.15 ± 0.88 | 15.05 / 15.39 / 16.09 / 16.95 | -0.1 / +0.1 / +0.6 / +1.1 (1.45) |
| held-out w/o rare (32) | 13.56 / 13.47 / 13.32 / 13.92 | 13.57 ± 0.26 | 13.54 / 13.73 / 14.50 / 13.93 | -0.1 / +0.6 / +3.3 / +1.3 (0.26) |

Lowest point of each class's mean reserve trajectory (relative to the store), per run:
| class | S39 runs | W25 runs | W50 runs |
| --- | --- | --- | --- |
| adult male | -0.026 / -0.021 / -0.021 / -0.023 | -0.026 / -0.029 / -0.025 / -0.024 | -0.022 / -0.027 / -0.023 / -0.020 |
| female, lactating | -0.141 / -0.134 / -0.128 / -0.142 | -0.092 / -0.096 / -0.092 / -0.091 | -0.095 / -0.102 / -0.098 / -0.090 |
| female, other | -0.061 / -0.063 / -0.059 / -0.057 | -0.039 / -0.046 / -0.040 / -0.044 | -0.036 / -0.042 / -0.043 / -0.038 |
| infant 0.5–2 y | -0.227 / -0.200 / -0.190 / -0.175 | -0.152 / -0.152 / -0.161 / -0.157 | -0.165 / -0.160 / -0.146 / -0.157 |
| infant 2–5 y | -0.074 / -0.148 / -0.084 / -0.079 | -0.075 / -0.074 / -0.069 / -0.074 | -0.069 / -0.081 / -0.072 / -0.067 |
| infant < 0.5 y | -0.257 / -0.234 / -0.220 / -0.251 | -0.113 / -0.103 / -0.099 / -0.104 | -0.099 / -0.120 / -0.114 / -0.086 |
| juvenile 5–12 y | -0.206 / -0.168 / -0.222 / -0.268 | -0.148 / -0.146 / -0.138 / -0.140 | -0.146 / -0.146 / -0.146 / -0.141 |

Non-fruit share of eating time by class (1 - fruitShare of the class readout: fallback plus meat), mean over runs:
| class | S39 | W25 | W50 |
| --- | --- | --- | --- |
| adult male | 0.06 | 0.06 | 0.06 |
| female, other | 0.28 | 0.25 | 0.24 |
| female, pregnant | 0.36 | 0.27 | 0.28 |
| female, lactating | 0.31 | 0.26 | 0.26 |
| lact: infant < 0.5 y | 0.47 | 0.30 | 0.30 |
| lact: infant 0.5–2 y | 0.31 | 0.27 | 0.28 |
| lact: infant ≥ 2 y | 0.23 | 0.23 | 0.23 |
| juvenile 5–12 y | 0.20 | 0.11 | 0.12 |
| infant 2–5 y | 0.20 | 0.18 | 0.18 |
| infant 0.5–2 y | 0.42 | 0.39 | 0.41 |
| infant < 0.5 y | 0.77 | 0.77 | nan |
