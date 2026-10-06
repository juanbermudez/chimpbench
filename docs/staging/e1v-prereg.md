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
