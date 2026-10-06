# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- The ChimpBench author and the science work around it (science agent, reviewers), checking how simulated chimpanzee communities compare with wild ones and reporting it in the field guide.
- Readers of the field guide (docs/architecture.html) who want to see, at a glance, where the simulation matches field data and where it does not.

## Product Purpose
ChimpBench (formerly MGOGO) is a 3D eastern-chimpanzee society simulation (Kibale-inspired) and a live demo of a local decision model, GLiNER2.5-Decide, choosing chimp actions from what each chimp perceives. Fine-tuned temperaments (baseline, aggressive, collaborative LoRA adapters) and the untuned model can drive whole communities. The population comparison page shows how those synthetic communities behave against published field values from wild communities (Kanyawara, Ngogo, Sonso, Waibira, Taï, Gombe), scored by the same virtual field observer the science stages use.

## Positioning
Synthetic populations are measured the way field researchers measure wild ones: a virtual observer with focal follows, scans and fixes, scored against 97 cited field targets with acceptance bands, fitted versus held-out roles and evidence levels.

## Operating Context
- Runs come from scripts/ft-field.ts (model-driven or stand-in populations with the field observer), scripts/field-metrics.ts (rules), scripts/ft-society.ts (temperaments in one society); the page reads one JSON built by training/decide_ft/dashboard_data.py and is republished as runs land.
- Field targets and bands: data/targets.json. Science scorecards: artifacts/validation/.

## Capabilities and Constraints
- Multi-year trained populations use stand-ins (small networks fitted to imitate each adapter); every figure that uses them must say so. Real-model runs are short (3 observed days, 2 seeds).
- Only aggregates are published: no positions, no raw field coordinates (AGENTS.md privacy rule).
- Evidence levels (H/M/L) and fitted/held-out roles travel with every target.

## Brand Commitments
- Visual language of the ChimpBench field guide (docs/architecture.html): the user confirmed the comparison page must match it.
- Practical language, minimal text (user brief).

## Evidence on Hand
- data/targets.json (field values, bands, sources); artifacts/validation/*.json (rules scorecards); artifacts/decide-ft/field*/ (model, stand-in and rules field runs); artifacts/decide-ft/round*/society-combined/report.json (temperament society runs); artifacts/decide-ft/round*/eval/offline-test.json.
- No population curves or trained-population demography yet: 5-year stand-in runs are in progress. Do not fabricate them.

## Product Principles
- Measure synthetic chimps exactly as wild ones are measured, and show the wild band first.
- Say what each number rests on (window, seeds, real model or stand-in) in the fewest words.
- Show misses as plainly as matches.

## Direction
- Planned, not a result: orient ChimpBench toward a Recurrent Decision Model, a memoryless decision kernel (the rules, GLiNER2.5-Decide, a stand-in or Jev) called at decision points inside a loop that carries body and mind state and local perception. Framing: [docs/recurrent-decision-model.md](docs/recurrent-decision-model.md).
- Partly shown (Track E, rules kernel only): state beats prescribed behaviour on the new bands, is about even on rows whose bands did not change and is worse on the old bands; the best stack is not yet viable at 12 months. Not shown: that another kernel works in the loop, or that a small kernel matches an expensive one.
- Stages and their start gate: IMPLEMENTATION_PLAN.md, Track R. Product copy changes only with claims those stages support.
