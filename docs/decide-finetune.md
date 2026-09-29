# Decide fine-tuning experiment

Can three LoRA adapters for GLiNER2.5-Decide, trained on the same inputs but different labels, give three communities measurably different societies? The adapters are a field-expert baseline, a more aggressive and individualistic temperament, and a more collaborative one. Stages and status are in `IMPLEMENTATION_PLAN.md` Track F.

## 1. What this can and cannot show

- **Labels are distilled priors, not field data.** No study records a wild chimpanzee's next choice from a menu. The "expert" labels come from an LLM following a rubric written from `docs/research.md` and `data/targets.json`. They sit at the evidence level "design assumption". The personas are stylizations.
- **The model only chooses.** Adapters change which legal option is picked. Code still builds the menu and re-checks legality. An aggressive adapter can only pick aggression when the sim offers it (a charge, display, attack, supplant, patrol or mate-guard option appears in roughly a quarter of logged decisions).
- **Effects are bounded by who is model-driven.** Throughput allows one inference at a time (~0.3 s), so society runs drive a subset of each community, or run short windows.
- **The communities are unequal** (West 22 founders, East 15, North 12). An adapter's effect is measured against the same community under rules and under the other adapters (a Latin-square rotation), never West against North.

## 2. Pipeline

```
sim seeds ──► context sampler (Node, headless) ──► contexts.jsonl (exact serving packets)
                                                      │
              chimp-field-expert skill ──► labelers ──► labels.jsonl (base / agg / coop per context)
                                                      │
          GHN text functions (read-only import) ──► dataset (text + schema identical to serving)
                                                      │
                          MPS LoRA loop ──► adapters: baseline, aggressive, collaborative
                                                      │
          offline eval (held-out seeds) ──► society eval (headless sim, adapter per community)
```

## 3. Contexts (Stage F2)

`scripts/ft-contexts.ts` runs `createWorld(seed)` with every chimp on `controller: 'model'` in async mode. At each fresh decision point it records `buildRequest` and `buildLocalQuestion` output, then resolves the decision by `rulesChoice`. The world therefore evolves exactly as under rules, and each packet is what the browser would send.

- Splits by seed, so no world contributes to two splits: train 1001–1012, dev 2001–2002, test 3001–3004.
- Stratified by menu: contexts with an aggressive option, with an affiliative option (no aggressive), and maintenance-only. Per-chimp spacing and caps avoid one individual dominating.
- Each record keeps the option classes (from action plus the sim's variant) for metrics. Labelers and the model never see them.

## 4. Labels (Stages F1, F3)

The skill `.claude/skills/chimp-field-expert/` is the expert. Labelers see only the model's input: the state and the option texts. Anything else would be unlearnable. For each context they return three picks:

- **base:** what a wild eastern chimpanzee of this age, sex, rank and state would most plausibly do.
- **agg** (aggressive, individualistic): the most plausible pick for a temperament at the competitive end of real chimpanzee variation. It favours status, food and mating access, contests and intimidation when odds favour it, and invests less in others.
- **coop** (collaborative): the most plausible pick at the affiliative end. It favours grooming, reconciliation, consolation, sharing, coalition support and joint action, and defers rather than contests.

Hard constraints hold for every persona: urgent thirst, hunger or exhaustion; infant care; fleeing when outnumbered or injured; no lethal risk without numerical advantage. When no option fits a persona better, its pick equals `base`. Ten percent of contexts are labeled twice, independently, to measure agreement, which is the ceiling any model can reach.

## 5. Training (Stage F4)

- **Exact text.** Inputs are rendered with GHN's own `model_view`, `decision_context`, `context_text` and `classification_tasks` (imported read-only with `python -B`). They are collated with `collate_fn_inference`, the path serving uses. The stock train collator randomizes label names, descriptions, order and dropout, so it is not used. A parity test compares token ids against the serving path.
- **Position.** Menus are in a fixed action order (`c0` is almost always rest). Each training context also appears once with its options permuted, so the adapter must read the option text.
- **Loop.** A custom MPS loop (the gliner2 trainer supports only CUDA or CPU) with LoRA r 16, alpha 32 on the encoder and classifier, and the model's own per-label BCE loss. All three adapters use identical inputs, seeds and hyperparameters; only labels differ.
- Outputs go to `artifacts/decide-ft/adapters/<name>/`, with a manifest: data hash, label hash, base revision and metrics.

## 6. Evaluation

**Offline (Stage F5), test seeds only, for base, baseline, aggressive and collaborative:**
- Accuracy against each label set.
- Aggressive pick rate when an aggressive option is offered.
- Affiliative pick rate when one is offered.
- Urgent-need compliance.
- Position bias.
- Agreement with rules.

**Society (Stage F6).** A headless sim runs with an adapter worker (`training/decide_ft/worker.py`, peft `set_adapter` per request, one resident model). Each community's adult chimps are model-driven with that community's adapter.
- Rotation: the three adapters rotate over the three communities, plus a rules-only control, across seeds.
- Metrics per community-day: agonistic share of activity, conflicts started per adult, contact fights, injuries and deaths, grooming share, reconciliations, consolations, sharing, hunts, patrols, encounters, and party cohesion.
- Reported as differences from the rules control with bootstrap intervals.

## 6a. Results so far

**Labels** (1,200 contexts, 33 batches, all valid):
- The temperaments differ from `base` on 32% (aggressive) and 25% (collaborative) of contexts. On mixed menus that is 60% / 45%; on maintenance menus, 0%.
- Independent agreement on 120 double-labeled contexts: base 87%, aggressive 85%, collaborative 88%. This is roughly the ceiling for any model.

**Training:** LoRA r16 on the top 8 of 24 layers plus the classifier, bf16, 4 epochs, about 1 h per adapter on the M3 Pro.

**Offline test** (held-out seeds, n = 200; `artifacts/decide-ft/eval/offline-test.md`):

| model | own-label accuracy | aggressive pick when offered | affiliative pick when offered | daylight urgent needs | night nesting |
|---|---|---|---|---|---|
| untuned | 0.46 / 0.42 / 0.53 (base/agg/coop) | 0.29 | 0.65 | 4/6 | 0.80 |
| baseline | **0.745** | 0.04 | 0.45 | 6/6 | 1.00 |
| aggressive | **0.74** | 0.60 | 0.17 | 6/6 | 1.00 |
| collaborative | **0.785** | 0.04 | 0.83 | 6/6 | 0.89 |
| labels (base/agg/coop) | — | 0.06 / 0.53 / 0.00 | 0.44 / 0.17 / 0.80 | 6/6 / 5/6 / 6/6 | 1.00 / 1.00 / 0.91 |

The untuned model picks aggression five times as often as the expert baseline, and it forages in the dark. Each adapter reproduces its label policy. Permutation consistency rose from 0.83 to 0.92–0.94, so the adapters read option text rather than position.

## 6b. Society results (v1 inputs)

**Runs:** 8 seeds (4001–4008) × rules, 3 adapter rotations and the untuned model, on the frozen snapshot, on an A40 pod. Jev drove one community at a time (jev1–3) on seeds 4001–4002 locally. Every run is 3 days.

**Pairing:** each community is compared with the same community and seed under rules (n = 24 community-seed pairs; Jev n = 6). Report: `artifacts/decide-ft/society-combined/report.md`.

**Code identity:** pod runs carry sim hash `e42f5a0b…`, Mac runs `333c688e…`. The Mac and pod rules runs for seeds 4001 and 4002 are identical in world stats and every community metric, so the sim is the same and the hash difference is a fingerprint artifact of the Linux copy.

Change per adult-day against rules, with 95% bootstrap intervals in the report:

| metric (rules level) | untuned | baseline | aggressive | collaborative | Jev |
|---|---|---|---|---|---|
| charges (2.04) | −0.51 | −1.84 | **+5.53** | −2.02 | −1.84 |
| displays (0.61) | −0.33 | −0.60 | **+2.62** | −0.61 | −0.47 |
| contact fights (0.083) | −0.03 | −0.08 | **+0.21** | −0.08 | −0.12 |
| coalition support (0.41) | +0.07 | −0.36 | **+2.60** | −0.40 | −0.37 |
| grooming bouts (5.31) | **+14.6** | +3.75 | +1.18 | **+14.1** | +3.63 |
| reconciliations (0.27) | +1.21 | −0.09 | +2.70 | −0.22 | −0.19 |
| pant-grunts (4.08) | +1.44 | −3.31 | −3.26 | −0.53 | −1.19 |
| mate-guarding (1.90) | −1.43 | −1.49 | +0.21 | −1.84 | −1.35 |
| affiliative share of samples (6.2%) | +19.7 pp | +7.6 pp | 0.0 | +18.0 pp | +7.0 pp |

**Findings:**
- **The temperaments separate clearly** (intervals do not overlap).
  - The aggressive adapter roughly triples charges and fights, quintuples displays, septuples coalitions and adds major injuries.
  - The collaborative adapter nearly removes aggression and grooms about 3.7× as often.
- **Conflict breeds repair.** Aggressive communities also reconcile and console far more, because the sim offers repair after each conflict.
- **The expert baseline is much less aggressive than the sim's rules** (−90% charges). The repo has no calibrated within-community aggression target (docs/simulation.md lists aggression rates by dyad type as open), so which is closer to wild chimpanzees is not settled here.
- **The untuned model's social lean shows at society scale:** grooming is about 3.7× rules, matching the collaborative adapter.
- Jev (GLiNER-format packet) sits between baseline and untuned: less aggression, a little more grooming, more feeding.
- No deaths in any run (3-day windows).

## 7. Option-text fixes after labeling

Labelers found option texts that contradicted the state. They were fixed in the model-facing layer: `optionText` in `server/decide.ts`, and `observe()`, which is pure and never stored. World state, behavior and golden hashes are unchanged. On 250 resampled contexts, compared with the 1,200 training contexts:
- COERCE charges no longer claim to "intimidate a rival" (108/108 before, 0/30 after). Coalition, defence, supplant, guarding, stranger, redirect and fight-back acts now each state their own purpose.
- The swelling trim now matches "swollen". It never had, so 258 training options repeated the swelling already on the partner's line.
- No dangling "…courtship; he is" (8 before) and no unverifiable "fruit is scarce" (37 before).
- The coalition pair is named when a throttled interrupt left it unmentioned. Interrupts older than their tick read in the past tense.

**The adapters were trained on the old texts**, so society runs on current code see slightly different inputs. Retrain on resampled contexts before drawing fine-grained conclusions.

## 9. Context-aware inputs (v2)

**What changed:**
- **Night menu** (`src/decision.ts` `phaseMenu`): after dark only nest, rest, nursing and answers to danger remain.
- **Dusk menu:** long travel, hunts, patrols, play and contests go; feeding, drinking, grooming, calls and nesting stay.
- **Fewer than two options left:** rules decide and no model call is made.
- **Situational prompt** (`server/decide.ts` `situationRules`): a short base question plus only the rules that apply now (night, dusk, dawn, urgent needs, strangers with the party's male count, heavy rain, dependent infant, nearby aggression or tension, fertility, meat). Mating and meat rules are skipped at night.
- **Jev-native packet** (`buildJevQuestion`): grouped JSON state, descriptive option keys with act and purpose as separate fields, and structured instructions, following the TypeSafe state and choice guidance.

**A/B** on 200 freshly labeled held-out decisions (seeds 5001–5004; 34 night, 18 dusk). `artifacts/decide-ft/eval/ab-test*.md`.
- The night and dusk menus never removed an expert's pick (0/200).
- Night nesting: every model goes to 100% (from 56–94%).
- Dusk nesting (experts: 18/18):
  - The first dusk wording ("a last call or groom may come first") pulled Jev down from 94% to 61%.
  - The reworded rule gives Jev 83% and untuned GLiNER 56% (from 44%).
  - The collaborative adapter stays at 39%, matching its own labels.
- Jev (old → native packet):
  - Accuracy on collaborative labels 0.49 → 0.59; on base labels 0.58 → 0.58.
  - Daylight urgent needs 7/9 → 9/9.
  - **It turns more social:** it picks affiliative options 64% of the time when offered, against 36% for the expert base labels (42% with the old packet).
- The adapters are flat within noise (base-label accuracy 0.71 → 0.69). They were trained on the old prompt; retraining on v2 inputs is needed before judging them there.

### Token budget audit

Real GLiNER token counts are the attention-mask length the worker enforces (`training/decide_ft/token_audit.py`).

| packets | median | p95 | max | over 650 target | over 1,280 limit |
|---|---|---|---|---|---|
| v1, fixed prompt (600 sampled) | 486 | 557 | 577 | 0 | 0 |
| v2, situational (600 sampled) | 470 | 562 | 594 | 0 | 0 |
| v2 worst case, rules capped at 4 (107) | 608 | 637 | 643 | 0 | 0 |

- **Instructions are not truncated.** Tokens grow linearly at about 1.45 per instruction word out to 180 words.
- **Rules are capped at four, by priority.** Real decisions fire at most four (1% of 600; 93% fire zero to two). With all eight, rules crowded every memory and history line out of the budget and the packet reached about 700 tokens.
- **The estimator was refitted** on 1,707 packets with separate rates for instruction, state and option words. Its largest under-estimate is 37 tokens, so the budget is 613. The old single-rate fit over-counted busy packets by about 79 tokens and trimmed memories they had room for.
- **Jev tokens:** the native packet is 1,374 median (1,765 worst case) against 896 for the GLiNER-format packet. That is about $0.58 per 10,000 decisions at $0.042/M. Median latency is 0.25 s against 0.22 s. Jev documents no token limit.

## 10. Round 2: retrained on v2 inputs (Stage F8)

**Data:** 1,200 new contexts (same splits, seeds and quotas as §3) sampled from a frozen copy of the current code (`artifacts/decide-ft/snapshot-v2`, sim hash `18b95a6d5d09`) with v2 inputs: night and dusk menus, situational prompt. Labelers saw the v2 menus. 120 contexts were labeled twice, blind: agreement base 0.83, agg 0.78, coop 0.87. Everything lives under `artifacts/decide-ft/round2`; `MGOGO_FT_ROOT=artifacts/decide-ft/round2` points the training, eval and worker code at it.

**Training:** same hyperparameters as §5, on an RTX A6000 pod (about 26 min for all three in parallel). Best dev epochs: baseline 2, aggressive 4, collaborative 3.

**Offline test (n = 200, round-2 test split; Jev on its native packet):**

| model | acc base | acc agg | acc coop | aggressive pick when offered | affiliative pick when offered | night nest | permutation consistency |
|---|---|---|---|---|---|---|---|
| untuned | 0.475 | 0.43 | 0.515 | 0.20 | 0.66 | 0.88 | 0.79 |
| baseline | **0.735** | 0.54 | 0.585 | 0.10 | 0.41 | 1.0 | 0.87 |
| aggressive | 0.525 | **0.65** | 0.40 | 0.54 | 0.18 | 1.0 | 0.905 |
| collaborative | 0.52 | 0.385 | **0.74** | 0.0 | 0.85 | 0.88 | 0.94 |
| Jev | 0.60 | 0.46 | 0.595 | 0.24 | 0.61 | 0.97 | 0.905 |
| labels (base / agg / coop) | — | — | — | 0.09 / 0.47 / 0.01 | 0.36 / 0.19 / 0.77 | 1.0 / 1.0 / 0.88 | — |

Each adapter is best on its own labels and its pick rates sit near its label set's. The test sets differ between rounds, so compare within a round, not across.

**Society runs:** 8 seeds × rules, untuned and 3 adapter rotations on two RTX A6000 pods (seeds 4001–4004 and 4005–4008); Jev drove one community at a time on seeds 4001–4002 locally with its native packet. Every run is 3 days and every run carries sim hash `18b95a6d5d09`. Report: `artifacts/decide-ft/round2/society-combined/report.md`.

Change per adult-day against rules (n = 24 community-seed pairs; Jev n = 6):

| metric (rules level) | untuned | baseline | aggressive | collaborative | Jev |
|---|---|---|---|---|---|
| charges (2.07) | +1.80 | −2.07 | **+6.60** | −2.07 | −1.99 |
| displays (0.85) | −0.26 | −0.85 | **+3.96** | −0.85 | −0.17 |
| contact fights (0.092) | +0.04 | −0.09 | **+0.37** | −0.09 | −0.08 |
| coalition support (0.34) | +1.61 | −0.34 | **+1.68** | −0.34 | −0.34 |
| grooming bouts (6.45) | **+12.3** | +1.53 | +1.84 | **+16.2** | +7.20 |
| reconciliations (0.28) | +4.03 | −0.28 | +0.39 | −0.27 | +0.11 |
| consolations (0.20) | +3.59 | −0.20 | +1.29 | −0.17 | −0.02 |
| pant-grunts (3.74) | +2.58 | −3.15 | −2.96 | +0.13 | −0.63 |
| mate-guarding (2.00) | +0.60 | −0.91 | +0.05 | −1.99 | −1.45 |
| major injuries per run | +0.04 | 0 | +0.29 | 0 | 0 |

**Findings:**
- **The temperaments separate as in round 1**, with non-overlapping intervals. The aggressive adapter gives about 4× the rules' charges, 5.6× the displays and 5× the fights, and it is the only one with major injuries. The collaborative adapter removes charges, displays, fights and mate-guarding and grooms about 3.5× as often.
- **The baseline and collaborative societies make no charges.** The baseline's aggressive-class picks (0.24 when offered) are therefore mate-guarding or counter-calls, since charges, displays and fights are all near 0. Adult male chimpanzees charge routinely, so a society with none is probably less aggressive than wild ones. The expert base labels themselves pick aggression 9% of the time when it is offered.
- **The v2 inputs changed the untuned model more than the adapters.** Against round 1 it went from −0.51 to +1.80 charges, from +0.07 to +1.61 coalitions and from +1.21 to +4.03 reconciliations. The situational rules and the option purposes (for example "backs an ally in a conflict") make conflict options more attractive to it. The adapters keep their round-1 direction and size.
- **Jev on its native packet is more social than on the GLiNER packet:** +7.2 grooming bouts against +3.6 in round 1, with the same near-zero aggression. This matches the A/B in §9 (affiliative picks above the experts').
- No deaths in any run (3-day windows).

**Cost:** RunPod $1.27 for round 2 ($2.50 for the whole project, of the $5 approved). Jev society runs $1.24 (21,835 calls, median 1,457 input tokens).

## 8. Constraints kept

- GHN and its Python environment are not modified. The live app, `server/*` and `src/sim/*` are unchanged until an optional integration stage.
- Adapters are identified by sha256 in every result.
- New files: `scripts/ft-*.ts`, `training/decide_ft/*`, `.claude/skills/chimp-field-expert/*`, this document, and outputs under `artifacts/decide-ft/`.
