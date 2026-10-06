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
