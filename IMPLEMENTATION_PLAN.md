# Implementation plan (v0.3)

Working plan for the current program. Objectives: `docs/realism-roadmap.md`. Delete this file when every stage is Complete.

**Concurrency rule:** only one agent edits a given file at a time. Agents running in parallel own disjoint files. `src/types.ts` changes are small, additive and optional, re-read right before each edit. Everything in `AGENTS.md` is binding.

## Parallel tracks (from 2026-09-29, local git; the integrator merges into `main`)
| Track | Owner | Where | Scope |
| --- | --- | --- | --- |
| Patrol corrections (C6p), then performance, then C10 | science agent | `main` checkout | Patrol code done (proof held for the merge). Performance done (f9d66b0): about 20% faster per field eco-day, identical results. C7b round 1 merged (ee02b82; field hashes unchanged). C12 relabel done (e4fcb2d): Taï and Ngogo are development diagnostics, Gombe is the held-out movement validation. C7a findings 9–12 done (5fb424a), including a bug fix (observation years now counted from the burn-in end) and merged phenology name variants (42 → 39 species; field hashes moved). Freeze f29c8b0773effa06; 332 tests. **C10 communication In Progress** (pre-registered, switchable for ablation). |
| C7a review | independent reviewer | snapshot | verdict, fixes, bench A/B vs C6 |
| C7b party size and range gap | C7b agent | worktree branch `worktree-agent-ad55593a1d1d4fcb6` | **Round 1 done (20092c7):** party size fell because distant goals were chosen per animal with no distance cost (companions still together at arrival fell 74% → 40%); there is no feeding competition (2% of the ripe crop eaten per day), and unlimited fallback food lets animals sit. Four mechanisms failed the direction check and are off by default, so the field hash matches C7a. `travelDistScaleM` is declared 'no distance cost' (design). The science agent merges it into `main` after its performance work. **Round 2 (C7c) In Progress:** limited fallback foods (the project's single fallback mechanism, which C8 reads), joint travel without dropouts, shared party goals, and a distance cost from travel energetics. |
| C8 demography and early life | C8 agent | worktree branch | the C8 spec + docs/staging/early-life-prereg.md; T-DEM-14/15 and T-LET-5 sealed; target rows in docs/staging/c8-targets.patch.json |
| Visual data guide | visual guide agent (Opus) | `main`: docs/guide/*, scripts/guide-data.ts, docs/data/guide-*.json, docs/guide-preview.html; owns docs/architecture.html once the data agent finishes | visuals for everything integrated: fruit calendar, normalized maps, paths, patrols, activity, validation grid, pipeline and decision-loop diagrams; offline, no raw coordinates |
| Patrol data and guide | data agent | done (2980c8e) | real patrol statistics (Ngogo 0.76/wk observed, 33% per-male participation; Gombe 180 patrols, median 88.5 min, 8 males, 3 females; post-split West 17.4/yr vs Central 5.0/yr); T-BRD-1 reproduced; T-PAT-8 not comparable; Gombe 15-min paths (1,330 follows; straightness 0.47, turning 0.55 rad at 30 min, daily path 2.3 km). The 30-min step is method-sensitive (Taï 95 m vs Gombe 2.8 m), so it's no longer a headline gap. |

Validation structure (from 2026-09-29): the Taï and Ngogo C12 comparisons are development diagnostics (seen). The Gombe 15-min paths (jg05d) are the held-out movement validation, withheld from every designer.

Ablation rule (from 2026-09-29): every stage's mechanisms are switchable by registry parameters, so the combined proof can attribute changes (all on vs one stage off).

Merge plan: once C7a is reviewed and patrols are green, merge C7b, then C8. Then WP0 (freeze) and WP4 (register the B7 targets), then **one combined proof** on merged `main` (patrols, C7b, C8), then independent reviews.

## Track A: in flight

## Stage A1: Spatial audio
**Goal**: ambience, weather, water and animal voices mixed by distance, zoom, time and weather.
**Success Criteria**: loudness measurements prove animals are audible up close and near silent zoomed out; no clipping or loop seams; no fps regression.
**Tests**: `tests/audio.test.ts`; recorded-output loudness per scenario.
**Status**: Complete — 115/115 tests; loudness proven per scenario (pant-hoot 10 m: −23 LUFS close, −29 mid zoom, silent zoomed out); peaks ≤ −4.6 dBTP; ~0.03 ms/frame.

## Stage A2: Relationship tension and memory digests (O11)
**Goal**: per-pair tension, monthly digests compressed yearly, fed to behavior and to the model context.
**Success Criteria**: tension and digest tests pass; bench ≤ 0.8 s/day; metric shifts reported.
**Tests**: `tests/sim-*.test.ts`, `tests/decision.test.ts`.
**Status**: Complete — tension (half-life 21 eco-days; reconciliation repairs 35% + 45%×bond), monthly→yearly digests, model context +~45 tokens; 115/115 tests; bench ~0.19 s/day. Follow-up complete: dead records slimmed ~9.2 KB → ~1.0 KB (40-year world 2.5 MB → 1.6 MB); behavior unchanged; 117/117 tests.

## Track B: research and design (parallel, read-only on `src/`)

## Stage B1: Realism research and design (O1–O10, O12)
**Goal**: `docs/realism-design.md` plus `data/targets.json`: quantitative field targets with verified citations, sampling protocols and fitted/held-out labels; mechanism designs; virtual observer spec; calibration pipeline.
**Success Criteria**: every objective has targets, a mechanism design, a test plan and an effort/risk estimate.
**Tests**: n/a (review by the integrator).
**Status**: Complete — 97 targets (37 fitted, 60 held out) from 121 verified sources; stage specs with numeric pass criteria and proof commands in docs/realism-design.md §8.

## Stage B2: Persistence research and design
**Goal**: `docs/persistence.md`: an evaluated choice between SQLite WASM and Turso in the browser, with the storage schema, save/resume/new flows, versioning, and a scratchpad prototype.
**Success Criteria**: a recommendation backed by a working prototype (write, read and reload across page loads) and measured save/load times for a realistic world.
**Tests**: prototype measurements.
**Status**: Complete — recommendation: @sqlite.org/sqlite-wasm + opfs-sahpool in a worker; gzip JSON snapshots; save 0.22–0.32 s, load 20–40 ms (120 chimps); resume deterministic across reload. Defaults pending user override: auto-resume paused, autosave 60 s × 3, older saves marked incompatible (export kept), traces capped.

## Stage B3: Graphics, camera and performance research
**Goal**: `docs/graphics-camera-plan.md`: why zoom-in views get blocked and a fade-to-clear-sight camera design; detail that increases as you zoom; AAA optimization techniques adopted, adapted or rejected; budgets (free ≥ 4 ms GPU at 1440×900 DPR 2).
**Success Criteria**: an audit with screenshot sequences, measured GPU breakdown per view, and a staged plan with acceptance scenes, compatible with C5b.
**Tests**: n/a (review).
**Status**: Complete — the strategy-view cutaway was off (0% chimp visibility at every zoom); plan G0–G6 in docs/graphics-camera-plan.md.

## Stage B4: Graphics and camera implementation (G0–G5)
**Goal**: keep-clear camera (≥ 90% visibility of protected chimps), one continuous zoom with a canopy lens and zoom-through to close view, vegetation cell culling, per-view shadows, FSR 1 and a 60 Hz cap, detail that scales with zoom.
**Success Criteria**: per the plan: ≈ 5 ms GPU freed in close view and ≈ 4 ms in the overview before re-spending ≤ 1.5 ms on detail; 60 fps at 1440×900 DPR 2; no regressions in the acceptance scenes.
**Tests**: tests for camera math; perf-probe, gpu-probe and visual-scenes A/B.
**Status**: Complete (222/222 tests):
- **Visibility:** protected-chimp visibility, overview zoom 2–6, 0% → 100%; close-view worst frame 25–33% → 95–100%.
- **Geometry:** close-view triangles 820k → 149k.
- **GPU:** overview 14.2 → 11.6 ms, close 12.3 → 10.0, cinematic 15.0 → 12.6, night close 15.2 → 12.9. Freed ~2.5–3 ms, not the planned 4–5; cinematic and night miss ≤ 11 ms.
- **Upscaling:** FSR 1 is 52–66% sharper.
- **Unverified:** frame pacing, because the GPU was shared with a training job.
- **Details:** docs/graphics-camera-plan.md §8.

## Stage B5: Model thirst response
**Goal**: very thirsty chimps pick drink when it's offered. Today it's ~7% in 3,546 real decisions, while hunger responds at 60%.
**Success Criteria**: drink-pick rate when very thirsty rises substantially on ≥ 40 replayed real contexts; the hunger, stranger, dusk and storm responses hold; ≤ ~650 tokens.
**Tests**: `tests/decision.test.ts`; live replay against the dev server.
**Status**: Complete. Very thirsty → drink went 30% → 50% on replayed real contexts (hunger 75 → 94%, strangers 63 → 75%, dusk 50 → 63%, storm 56 → 56%); misses are the stronger need winning. Tokens median ~510. 204/204 tests. Guide copy on thirst to be updated at the next guide refresh.

## Stage B6: Real-world spatial dataset scouting
**Goal**: `docs/datasets.md` plus `data/datasets.json`: ranked wild-chimpanzee datasets, especially spatial ones (ranging, patrols, encounters, territory change, dispersal, Kibale geography, licensed wild audio, camera traps); verified landing pages; a download list for approval; a request list; an outline for the "Real chimps vs my chimps" guide section.
**Success Criteria**: every entry verified or marked unverified; no downloads; location-sensitivity and copyright handled.
**Tests**: n/a (review).
**Status**: Complete. `docs/datasets.md` and `data/datasets.json` hold a top 10, the download list for approval (§7), the request list with draft emails (§8) and the guide outline (§9). No open patrol routes exist. Ngogo patrol dates 1996–2015 (open) can label patrol days in the 15-min GPS once it's obtained. Eight new sources must be added to `docs/research.md` before citing. The user's goal: compare real vs simulated patrol and movement trajectories and show them as normalized overlays in the guide.

## Stage B7: Early-life evidence and pre-registration (maternal effects; docs only until WP4)
**Goal**: Evidence, pre-registered held-out targets and a C8 mechanism design, so that the outcomes of losing the mother after weaning emerge from existing levers (feeding tolerance, association, coalition support, protection) instead of being encoded.
**Success Criteria**:
- WP1: every source verified in docs/research.md ("Early life and maternal effects (chimpanzees)" plus "Analogies from other primates (not used for targets)"), including the keys cited in targets.json but missing from research.md: crockford2020, nakamura2014, pusey1997, walker2018, lemoine2020a.
- WP2: docs/staging/early-life-prereg.md, with new held-out ids from T-DEM-16 on (T-DEM-14, T-DEM-15 and T-LET-5 untouched), the C8 mechanism design, a parameter list and tests.
- WP3: an independent review before any code.
- WP4: registration after WP0 (a new freeze once C7a is reviewed, and flags reconciled with the log, e.g. the T-PAT-4 row).
**Exclusions**: violence-begets-violence; a permanent stress offset; serotonin × rearing; cultural tolerance; any direct orphan → paternity, rank or fertility rule.
**Owners**: WP1 research agent (edits docs/research.md only); WP2 design agent (docs/staging/ only); WP3 independent reviewer; WP0 and WP4 integrator. C7a keeps src/sim, src/field, data/params.json, data/targets.json and docs/realism-design.md until its review and freeze.
**Status**: WP1 **Complete**: crockford2020, girardButtoz2021, samuni2020, lemoine2020a, reddyMitani2019 and sabbi2021 confirmed from full text. Corrected: samuni2020 (alpha mother vs others; continuous rank not significant), hobaiter2014 (pooled over sites, unrelated adults adopted more, 20 vs 14 of 36), murray2014 (first 6 months only; the exposure claim is an inference), testard2024 (not early life). Unverified (abstract only): stanton2020 n, nakamura2014, pusey1997, walker2018 values. WP2 **Complete** (docs/staging/early-life-prereg.md): T-DEM-16 to 21, all held out and pattern-only; 17 and 21 encoded, and only the alpha-mother contrast of 18 counts. Guardian mechanism (tolerance → condition → strength; association; caretaker kin in coalitions; stress half-life 180 d, design). 18 new entries, 1 removed, 4 retagged. Code findings for C8: weaned-orphan adoption has no effect, and a younger sibling can adopt an older orphan (bug). Proposal: seal T-DEM-15, computed only at the C8 proof. WP3 **Complete: PASS WITH FIXES** (artifacts/validation/b7-review.md). Citations hold, and both code findings are real. High: T-DEM-18(b) is encoded by design, and the harness scores `encoded` per row, so the encoded parts need their own rows. Integrator ruling on sealing: sealed means never computed (no JSON, scorecard or notes) until the C8 proof; it applies only to targets with no existing value; T-DEM-15's computation is pre-registered now; no hand tallies from event logs. The WP3 fixes are applied in the staging doc. Targets are renumbered T-DEM-16 to 24; each encoded part is its own row; the counted rows are 16, 17, 21 and 23. T-DEM-14, T-DEM-15 and T-LET-5 have no existing value, so all three are sealed; T-SOC-11 follows the normal policy. Fresh seeds reserved for C8, never to be run before: set A 1111–1515, set B 1616–2525 (step 101), none used so far. Before WP4 freezes, five Methods definitions must be stated in research.md (lemoine2020a transform and covariates, crockford2020 reference point, jones2010 'high-ranking', wood2025 expansion date) and the hobaiter2014 Sonso line fixed. **Done:** Sonso corrected (7 mothers left 11 orphans; 1 adopted by an unrelated female; 3 older orphans cared for 3 younger siblings; 4 uncared for, 1 survived). Definitions added. Still UNVERIFIED: lemoine2020a's distance transform, crockford2020's first-siring reference point (conception or birth), jones2010's rank cut-offs, and the end of wood2025's pre-expansion window. **WP4 must:** state each unverified choice as a design assumption with a sensitivity check (both readings), and fix T-LET-5's band, which pairs 3-year birth counts (15 → 37) with the 2-year ratio (2.75; the 3-year ratio is 2.3). The T-LET-5 fix is a correction to follow the source text, logged with 'seen: no value exists'. WP0 and WP4 wait for the C7a review. WP5 happens inside C8.

## Stage C12 (planned): Real vs simulated trajectories
**Goal**: compute the same movement statistics on real GPS tracks and on the observer's simulated follows (daily path length, step lengths and turning angles, straightness, edge distance, patrol excursion depth, home-range kernels and year-to-year shift), and publish normalized side-by-side overlays and a similarity scorecard in the guide.
**Success Criteria**: an open or approved real dataset ingested; the metrics identical in code for real and sim; a scorecard with seed spread; overlays normalized to range radius (no raw coordinates); attribution per license.
**Tests**: metric fixtures on synthetic tracks; real-data ingest checks.
**Status**: C12a and C12b first pass Complete (268/268 tests). Scripts: `scripts/compare-ranging.ts` and `scripts/compare-movement.ts`; results in `docs/data/*-compare.json`.
- **Similar:** range shape, core fraction, edge distribution, year-to-year overlap, activity budget.
- **Different:** sim individual range 0.71 vs 16.9 km² (Ngogo), steps 3 vs 95 m per 30 min, straightness 0.23 vs 0.50 (the sim shuttles back and forth).
- **Visible in real data, absent in the sim:** the Ngogo fission.
- **Handed to C6:** make travel goal-directed and fix the range-record lag. The C5a day-range pass is likely inflated by the shuttling.
- **Next:** a guide section that reads the JSON, then a re-run after C6.

(earlier:) Real Ngogo home-range statistics from Zenodo 18603419, downloaded with approval into `data/raw/` (166,826 fixes, 162 individuals, 2011–2023), compared against field-profile sim runs sampled identically; normalized overlays and a scorecard go to `docs/data/ranging-compare.json`. C12b (trajectories) can now start on open Taï data, downloaded with approval: PLOS Biol s016 has 42,385 time-ordered focal records with binned positions and rest/travel labels; s015 and s017 cover border approaches; RSOS gives yearly territory sizes. This is queued with the c12-compare agent. Kibale trajectories and patrol routes still need the Ngogo 15-min file or Movebank Kanyawara (on request). Dryad files (Ngogo patrol dates kk33f, post-split sf7m0cgkg, Gombe patrols z8w9ghxdb, Gombe female ranges jg05d) block automated downloads (401/403); the user has to download them manually.

## Track C: implementation (sequenced after A)

## Stage C1: UI pass
**Goal**: one menu bar, no brand subtitle, opaque panels, a collapsible unified left sidebar (minimap separate), fewer DOM redraws, Social-tab tension and memory timeline.
**Success Criteria**: DOM mutations per second and UI frame cost reduced (measured); E2E passes.
**Tests**: `scripts/perf-probe.mjs`, `scripts/verify-browser.mjs`.
**Status**: Complete — single opaque menu bar, subtitle removed, solid panels, collapsible unified left sidebar (B), Social tension bars + memory timeline; layout invalidations at 1 day/s 4,068→909/s; 117/117 tests.

## Stage C1b: Header and targeting fixes
**Goal**: guide opens in a new tab; fixed-width header readouts; model chip removed from the bar; per-frame sun/moon dial; view and layer buttons framed around the minimap; non-modal experiments with map targeting; time controls in a header dropdown (bottom bar removed); the casual, visual science guide.
**Success Criteria**: 0 px header shift over 60 s at 1 day/s; UI ≤ 0.11 ms/frame at 1 day/s.
**Tests**: 192/192; bounding-box shift probe.
**Status**: Complete. The guide was rewritten in first person with Linear-style polish, 9 real screenshots (`scripts/guide-shots.mjs` → `docs/img/`) and a GLiNER section. Refreshed after B4: new captures including a keep-clear before/after pair, thirst copy updated, C3 baseline added. The Mind, experiment and time shots were re-captured with the real model after the training run ended, and the captions updated.

## Stage C2: Persistence
**Goal**: save/resume/new/list/delete/export for simulations, autosave, schema versioning.
**Success Criteria**: reloading the page resumes a deterministic continuation; saves under 1 s for a 120-chimp world; E2E extended.
**Tests**: unit tests for serialization; browser test for save, reload and resume.
**Status**: Complete — SQLite WASM (opfs-sahpool worker); auto-resume paused; Simulations menu; autosave 60 s × 3; deterministic resume proven (Node + real reload); save 125–544 ms without frame hitches, open 15–62 ms; 154/154 tests. E2E: 11/11 existing checks pass; the new save-slice check (8.4 ms vs < 8 ms) failed under load average ~30 — re-run when the agents are idle. Follow-up complete: registry-hash check. A mismatched save prompts (open anyway, labeled / export / start new) and never resumes silently; 210/210 tests. Save slicing is now time-budgeted (~3 ms per frame, encoding moved to the worker); 223/223 tests. The E2E now pauses before saving (tick race fixed) and reports speed thresholds as WARN when the machine is overloaded (--strict-perf forces failure). No-model E2E: 14/14 pass (exact resume, older-parameter prompt, second tab, save slice 6.6 ms) at load average ~45. Model E2E: after the user's training run finished, GLiNER went back on the GPU (fp16, ready in 22 s, ~0.5 s per decision); full E2E with the model passes 16/16. The CPU was tried at the user's request: 4.7–34 s per decision under load, not viable.

## Deferred performance proofs (run after the user freed the machine; two C6 runs still used ~4 cores, load 10–21)
- **C5b field view: PASS.** 60 fps in all 6 scenarios (overview, strategy, close, cinematic, night, storm); p95 16.7–16.8 ms; drops ≤ 1%. Results in `artifacts/perf/idle/c5b-field.json`.
- **B4 compressed pacing:** 1× overview, close and night hold 60 fps with ≤ 0.4% drops (PASS). Cinematic 1×: 57 fps, 5.3% drops. The 1 day/s and Max regression is **FIXED**: per-frame inline transform writes (labels, the header dial) caused a Chrome restyle slowdown that only garbage collection reset. After the fix, 1 day/s runs at 60 fps with 0% drops at full rate, Max at 60 fps with 0.2% drops (~281k eco-s/s, 3.3× 1 day/s), and cinematic at 60 fps with 0% drops; 242/242 tests. Sim allocation hot spots (92% of Max allocation) are queued for the science agent after C6. Results in `artifacts/perf/idle/b4-compressed.json`.
- **Sim bench (loaded):** compressed 213–401 ms per eco-day (was ~130), 120 living ~1.07 s. Slower since the new sim features; re-measure after the perf fix and C6.
- **Persistence save slice:** 3.2 ms max in the model E2E at load 14 (under the 8 ms idle budget): PASS.
- **Observer overhead and pool wall time:** not yet measured cleanly (C6 runs active).

## Stages C3–C11: Realism (specs: docs/realism-design.md §8)
Order:
- **C3:** observer, target harness and run pool. **Complete: reviewed, PASS WITH FIXES.** The protocol is frozen (hash in `data/targets.json`); a post-hoc change rule was adopted; 189 tests. Honest baseline: fitted 8 pass / 10 fail / 6 inconclusive; held-out 6 / 21 / 9. Carry-overs to C5a: effort normalization, party-follow mode, re-check the classifiers at field scale, ≥ 10 seeds where inconclusive.
- **C4:** registry. **Complete: reviewed, PASS WITH FIXES.** Equivalence proven against pre-C4 code and the C3 baseline; lint gap fixed. The UI rival-threshold bypass was fixed by the integrator. Open items moved to C5a (evidence honesty, field-observer bypass, distance thresholds) and persistence (registry-hash check).
- **C5a:** scale split. **Complete: reviewed, PASS WITH FIXES.** T-IGE-1 was withdrawn as a fitted pass: the spacing was outcome-driven and doesn't replicate on fresh seeds. Travel share, party size and day range replicate. Targets labeled tuned or compromised; patrol targets unscored until listening stops exist; 5 of 10 held-out passes count. Fixes are folded into C6: scale the 900 s approach cap, derive spacing from a stated rule, evidence tags, summarize(), observer overhead ≤ 5%, Kibale phenology (needs the user's files).
- **C5b:** renderer field view. **Built:** a field window rebuilt around the camera; a km-scale overview with range and party markers; Profile choice in New simulation and `?profile=field`; chimps in their crowns 100%; compressed unchanged; 239 tests. Integrator fix: the minimap grid scales with map size, crowns are skipped at km scale, and the stream is drawn from `world.stream`. **Open:** the ≥ 60 fps proof, blocked by other apps holding the GPU at 98–100%; the window can be outrun at ≥ 10 min/s.
- **C6:** territories and patrols. **Complete: reviewed, PASS WITH FIXES** (artifacts/validation/c6-review.md). T-RNG-1's 5.40 km² is an estimator artifact (hull over 500 m cells pooled over 10 years; 95% kernel is 4.4–5.7× smaller), so it is a fail. Home pull and territory cost do constrain ranges (up to 2.7× growth with both off). Encoded rows are still counted as passes. T-PAT-1 was switched after it failed. Expansion vs paired baseline: 0 of 5 in band. Fixes are folded into C7a. Use-based ranges, a loss map, patrols with listening stops and incursions; no scripted range shifts; C5a fixes done; 268 tests. Headline failure: ranges ~0.6–0.9 km² vs 5–16 km²; the territory-cost weight doesn't move them. C6b (lighter movement fix) moved displacement 0.08 → 0.14 km and straightness 0.23 → 0.25 only.
- **C7a:** movement realism (user priority). **Complete: reviewed, PASS WITH FIXES** (artifacts/validation/c7a-review.md): tests and goldens hold; fresh seed 101 hash identical; phenology ingest correct (the date bug touched only C7a development runs). Findings: the '2–3×' claim is overstated; T-FOOD-4 compromised and T-FOOD-5/7 encoded; C12 range rows now count as 'seen'; one fitted row is Taï, not Ngogo; the 60 km distance parameter is out of range (to C7b); T-IGE-1's fall is an observer artifact (recall 0.63 → 0.25); 16 rows unflagged; 1.37–1.45× slower than C6 (60% in scoring known trees). Fixes 1–4 are done (8291ecd, 1459cdb; 321 tests; freeze 73904dcee230404f covering flags, c12Fitted and the compare code). T-IGE-1: the classifier was fine; the truth reference counted episodes only the stranger could hear. On observable episodes recall is 1.00 (n = 10 focal, 7 party), so the low encounter rate (2.4–2.6/yr vs 5–12) is a real sim shortfall. **The next reviewer must check** that redefining truth was justified and not bar-driven (small n). The 60 km parameter is with C7b; performance is in progress. Diagnosis: chimps followed followers (32% of path), goals were chosen by distance rather than value, food was uniform, and familiarity halved ranges. Changes (field only): crop-valued goals, remembered crops, the community's best-known trees as goals, crops ∝ crown area, 9.8 trees/ha, committed trips, follow the leader, and the Ngogo phenology ingested (date bug fixed). Fresh seeds: individual range 0.59 → 1.71 km² (Ngogo 16.9, but Ngogo had 173–201 members vs the sim's 22; size-matched, the community kernel of 1.9–2.3 km² is about 2.5–4× below the 5–16 km² band), path 89 → 177 m/h (fitted; real 314), same-day displacement 0.14 → 0.27 km (fitted; real 0.66). No better: 30-min step (4.6 m vs 95), straightness 0.23 (0.50), pair overlap 0.89 (0.72). Worse: party size 2 (6), patrols 0.01–0.03/wk (fail), T-IGE-1 2.4 (fail). Bench: the absolute numbers (0.35–0.49 s/eco-day) are inconclusive because the machine was heavily loaded (user). The reviewer measures the regression A/B, interleaved, against the C6 snapshot, where > 1.25× is a finding. The ≤ 0.3 s check waits for an idle machine.
- **C6p:** patrol corrections (user adopted recommendations 1–5). Step 1 evidence check **Complete** (docs/patrol-evidence.md): gaps 1, 3, 4, 7 confirmed; 2, 5, 6 partly; none refuted. Amendment A pre-registered from the evidence: contact-dominated routes, energy gate removed, 6 h cap, no alpha bonus, Taï preset fixed, readiness closed, T-PAT-9 encoded-descriptive. Step 2 **Complete:** pre-registered in docs/realism-design.md §5.3.1 plus 3 protocolLog entries (T-PAT-4 compromised; T-LET-4 partially encoded; fresh seeds 606–1010 labelled "model revised post-freeze"; new held-outs T-PAT-8 (Ngogo phenology now downloaded) and T-BRD-1). Contract: optional `Party.patrolPhase`. Step 3 queued to the science agent after C7a. The render side (P4b poses) is **Complete**: out, listen, incursion, return and release poses, plus a strategy-view file line (src/render/creatures/patrol.ts), falling back to today's look when `patrolPhase` is absent. 283 tests; perf within noise. The playback relocation threshold is now 2 × the largest legal per-tick step (compressed 9 m, field 75 m). New data: data/raw/dryad-kk33f, dryad-z8w9ghxdb, dryad-sf7m0cgkg, dryad-gf1vhhmk8 (Ngogo phenology 1998–2017, potts2020), dryad-jg05d (Gombe 15-min focal paths 2000–2003 and female alone points, Pusey & Schroepfer-Walker 2014) (CC0, user-downloaded, archives test clean).
- **C7:** memory and ecology (rest)
- **C8:** demography
- **C10:** communication
- **C11:** calibration and validation
- **C9:** fission scenario

Each stage:
1. Implement.
2. Run the stage's proof command (≥ 5 seeds).
3. Report fitted and held-out results.
4. An independent reviewer verifies before the next stage.

`src/sim` stages run one at a time. C4 touches every sim file.

**Status**: C3–C5a Complete; C5b built (fps proof open); C6 Complete (reviewed, fixes in C7a); C7a in review; patrol corrections In Progress

## Track F: Decide fine-tuning experiment (design: docs/decide-finetune.md; touches no `src/sim`, `server` or GHN file)

## Stage F1: Expert skill
**Goal**: `.claude/skills/chimp-field-expert/`: evidence digest, persona definitions, hard constraints, labeling protocol and output schema.
**Success Criteria**: a 40-context pilot returns valid labels for every context; double-labeled agreement is measured.
**Tests**: label validator (every pick is an offered option; the JSON schema holds).
**Status**: Complete — the pilot (40/40 valid) found rubric gaps (dusk, sexual intimidation, mate-guarding without rivals, loneliness), now written into "Specific cases".

## Stage F2: Context sampler
**Goal**: `scripts/ft-contexts.ts`: exact serving packets at real decision points, stratified by menu, split by seed.
**Success Criteria**: every packet passes `decisionContextError` and the token budget; same seed gives identical output.
**Tests**: `tests/ft-contexts.test.ts`.
**Status**: Complete — 1,200 contexts from 18 worlds (train 900 / dev 100 / test 200); menus both 35%, aggressive 20%, affiliative 30%, maintenance 15%; ~10 s per world.

## Stage F3: Labeling
**Goal**: base, aggressive and collaborative labels for about 1,200 contexts; 10% double-labeled.
**Success Criteria**: ≥ 99% valid; agreement and persona divergence rates reported.
**Tests**: the F1 validator over every batch.
**Status**: Complete — 33/33 batches valid. Temperament differs from base on 32% (aggressive) and 25% (collaborative) of contexts; 60% / 45% on mixed menus, 0% on maintenance menus. Independent agreement on 120 double-labeled contexts: base 87%, aggressive 85%, collaborative 88%.

## Stage F4: Training
**Goal**: three LoRA adapters from identical inputs and hyperparameters, trained on MPS with serving-identical text.
**Success Criteria**: token parity with the serving path; each adapter beats the base model on its own dev labels.
**Tests**: parity test; save/reload gives identical scores.
**Status**: Complete — parity exact (10/10 contexts: identical tokens, probability gap 0). A 19 GB footprint at batch 4 over all 24 layers forced LoRA r16 on the top 8 layers with bf16 (0.77 vs 2.0 s/example, 2.4 M trainable), 4 epochs. Dev accuracy on each adapter's own labels: baseline 0.75, aggressive 0.73, collaborative 0.76 (untuned 0.42–0.44). Adapters and manifests are in artifacts/decide-ft/adapters/.

## Stage F5: Offline evaluation
**Goal**: test-seed comparison of base and the three adapters.
**Success Criteria**: the report covers accuracy per label set, aggressive and affiliative pick rates, urgent-need compliance and position bias.
**Tests**: n/a (report).
**Status**: Complete — test seeds (n = 200), artifacts/decide-ft/eval/offline-test.md. Each adapter is best on its own labels (0.745 / 0.74 / 0.785 vs untuned 0.46 / 0.415 / 0.53). Aggressive pick when offered: untuned 0.29, baseline 0.04, aggressive 0.60, collaborative 0.04 (labels 0.06 / 0.53 / 0.00). Affiliative pick: 0.65 / 0.45 / 0.17 / 0.83. Daylight urgent needs: adapters 6/6, untuned 4/6. Night nesting: 1.00 / 1.00 / 0.89 vs untuned 0.80. Permutation consistency 0.92–0.94 vs 0.83.

## Stage F6: Society evaluation
**Goal**: headless runs with one adapter per community, rotated, plus a rules control.
**Success Criteria**: per-community behavior differences with intervals; the sim stays healthy (no mortality spike).
**Tests**: n/a (report).
**Status**: Complete — 40 GPU runs (A40, ~$1.1) + 6 Jev runs; clear, non-overlapping temperament effects (docs/decide-finetune.md §6b). The pod-vs-Mac hash difference is a fingerprint artifact (identical rules runs).


## Stage F7: Context-aware inputs (v2)
**Goal**: night and dusk menus, a situational prompt, and a Jev-native packet; A/B against v1 on freshly labeled decisions.
**Success Criteria**: no expert pick removed; night and dusk nesting improve; no accuracy loss beyond noise.
**Tests**: tests/decision.test.ts (night menu, dusk menu, situational rules, Jev packet); 243/243.
**Status**: Complete — implemented and A/B-tested (docs/decide-finetune.md §9). Night 100% for all models; dusk improved after rewording; Jev gains on constraints but turns more social than the experts (64% vs 36% affiliative). Retraining and society runs continue in F8.

## Stage F8: Round 2 on v2 inputs
**Goal**: 1,200 new contexts sampled from a frozen snapshot of the current code (artifacts/decide-ft/snapshot-v2, sim hash 18b95a6d5d09), expert-labeled on the v2 menus; three adapters retrained on v2 inputs; society runs (8 seeds × rules, base, rot0–2 on GPU; Jev native packet × 3 communities × 2 seeds locally).
**Success Criteria**: adapters beat the untuned model on their own labels on test; temperament effects in society runs keep their direction; night nesting holds.
**Tests**: labeling validator (all batches valid); offline eval on the round-2 test split; paired society report.
**Status**: Complete — docs/decide-finetune.md §10. Offline: each adapter best on its own labels (0.735 / 0.65 / 0.74). Society: aggressive +6.6 charges/adult-day vs rules, collaborative +16.2 grooming bouts, baseline and collaborative make no charges; the untuned model turned more aggressive under v2 inputs (+1.8 charges). RunPod $1.27 (project $2.50 of $5), Jev $1.24.

## Track P: Trained populations vs wild chimpanzees (owner: decide-ft)
Compares model-driven populations (untuned, baseline, aggressive, collaborative) with rules and with field data, through the virtual field observer and data/targets.json. New code stays in `scripts/ft-*`, `training/decide_ft/*` and `tests/ft-*`; `src/field`, `src/sim`, the guide and `scripts/compare-*` belong to other stages and are only imported or fed data.

### Stage P1: Round-3 adapters (field + compressed inputs)
**Goal**: adapters that are in-distribution for the field profile (the round-2 ones see 9.7% unseen option wordings and ~12× larger distances there).
**Success Criteria**: each adapter best on its own labels on the round-3 test split, reported separately for compressed and field rows.
**Tests**: labeling validator; offline eval on round-3 test.
**Status**: Complete — 1,200 contexts from snapshot-v3 (hash 1c20a219db3e; 600 field, 600 compressed), 120 double-labeled (agreement base 0.83, agg 0.77, coop 0.87). Test accuracy on own labels: baseline 0.735, aggressive 0.715, collaborative 0.805 (field rows 0.82 / 0.78 / 0.76). Adapters in artifacts/decide-ft/round3/adapters.

### Stage P2: Model-driven field observer and GPU batching server
**Goal**: `scripts/ft-field.ts` (observer + model decisions, field-metrics JSON shape, all-one-policy conditions); `training/decide_ft/server.py` (one model per GPU, cross-run batching).
**Success Criteria**: `--cond rules` reproduces field-metrics values exactly for the same seed and window; server throughput measured against per-run workers.
**Tests**: tests/ft-field.test.ts (rules equivalence); bench_batch.py.
**Status**: Complete — rules condition deep-equal to field-metrics on 79 target values (compressed and field). GPU finding: the Decide forward pass is compute-bound at ~60-67 decisions/s on an RTX A6000 whatever the batch (35/s at batch 1); CPU preparation is ~3 ms per decision. Cross-run batching therefore adds at most ~1.5x over per-run workers, and FlashDeBERTa failed to load on the pod (torch 2.4 API mismatch). Real-model runs cost ~17 GPU-minutes per population-day on the field map.

### Stage P3: Behaviour scorecards for trained populations
**Goal**: 30 observed days (after a 180-day rules burn-in), field profile, 5 seeds × {rules, untuned, baseline, aggressive, collaborative}; scored against the field targets.
**Success Criteria**: per-condition scorecards with seed spread; differences between conditions with intervals.
**Tests**: rescore through field-compare; per-run code and adapter hashes recorded.
**Status**: Not Started.

### Stage P4: Distilled stand-ins for long runs
**Goal**: a fast linear imitation of each adapter over per-option features (action, class, rules score, needs, phase, relation to target), fitted to adapter probabilities on tens of thousands of contexts, run in-process at rules speed.
**Success Criteria**: top-1 agreement with its adapter on held-out contexts reported; 3-day society metrics of stand-in vs adapter agree within intervals for charges, fights, grooming and coalitions. Every figure that uses a stand-in says so.
**Tests**: agreement report; paired stand-in vs adapter society runs.
**Status**: Not Started.

### Stage P5: Long-horizon and study-mirroring scenarios
**Goal**: 10 years × 5 seeds per condition with stand-ins: population growth, first-year mortality (T-DEM-1), e15 (T-DEM-2), birth interval, home ranges (T-RNG-1), encounters and killings (T-IGE-1, T-LET-1); plus scenarios mirroring field studies (Ngogo expansion after killings, T-LET-4; Taï patrol preset; Kanyawara baseline).
**Success Criteria**: per-condition values with seed spread against the field bands.
**Tests**: scenario summaries reproducible from seeds; code hash per run.
**Status**: Not Started.

### Stage P6: Tracking and visualization
**Goal**: a run registry (every eval run with condition, seed, profile, window, code and adapter hashes) and a dashboard comparing synthetic and wild populations (scorecards, behaviour deltas, population and mortality curves, conflict, ranges); guide-ready JSON and SVG (src/compare/svg.ts) handed to the guide owner.
**Success Criteria**: the dashboard rebuilds from the registry after each new run; no raw field coordinates published.
**Tests**: registry schema check; privacy guard (assertNonSensitive) on exports.
**Status**: In Progress — dashboard v1 published (https://claude.ai/artifact/RtLvuv3bUrcb7s77dsvkty) from training/decide_ft/dashboard_data.py; rebuild and republish after each batch of runs.

