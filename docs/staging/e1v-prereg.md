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
