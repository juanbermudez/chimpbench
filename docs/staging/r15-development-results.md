# R15 development results

Updated 14 October 2026. Both newly trained adapters passed real serving and headless recurrent-loop checks. The final integrated suite passed all 1,544 tests with no failures or skips, and the production build passed. The trained s7 adapter also passed the visible browser demonstration. Nothing has been pushed or deployed.

## What was trained

Frozen source: `e792b7eb5b30dc766506cc1611b58dbdfb831e0b`, in `.claude/worktrees/bench-r15-data`. All artifacts below are relative to that checkout's `artifacts/r15/collection-64-e792b7e/`.

The dataset contains 86 rows from 43 fresh decisions on development seeds 48 and 7. It splits by animal identity into 62 training rows and 24 development rows, with equal activity and target phase counts. The data covers a short daytime window, predominantly food decisions. There is one drinking target row in training and none in development. The reserved and sealed evaluation data remain closed.

The activity labels imitate the original rules' activity distribution. Target labels imitate counterfactual resource valuation. Neither teacher is a wild preference dataset or an ecological reward. The three-epoch recipe and two training seeds were registered before execution. The primary app adapter is `r15-resources-s7`, selected before reviewing the replication.

The real tokenizer and scoring preflight passed. The longest measured packet was 615 tokens, below the 1,280-token limit, with no truncation. All registered numerical parity tolerances passed. Dataset, packet, runtime, configuration and weight hashes bind the completed artifacts.

## Training and serving

| Readout | r15-resources-s7 | r15-resources-s11 |
| --- | ---: | ---: |
| Untuned development cross-entropy | 2.3502 | 2.3502 |
| Best training-time development cross-entropy | 1.5936 | 1.6098 |
| Saved epoch | 3 | 3 |
| Serving activity cross-entropy, 12 rows | 1.5324 | 1.5321 |
| Activity top-teacher agreement | 6/12 | 5/12 |
| Serving target cross-entropy, 12 rows | 1.6548 | 1.6873 |
| Target top-teacher agreement | 3/12 | 4/12 |

Uniform cross-entropy is 1.7719 for the activity rows and 1.7329 for target rows. These are descriptive development figures. The small, related dataset does not establish generalization or behavior quality. The training-time and serving figures use their recorded precision paths; the preflight measures their parity rather than assuming identical floating-point results.

Each serving evaluation checked all 24 rows through the verified adapter worker. Independent review reproduced the metrics from the saved probabilities and matched every row, phase and hash. Both training runs completed without an OOM retry.

Evidence: `ft/preflight/result.json`, `ft/adapters/r15-resources-s7/manifest.json`, `ft/adapters/r15-resources-s11/manifest.json`, and `evaluation-s7/` and `evaluation-s11/`.

## Actual recurrent control

Both runs used five adults on development seed 48, draw decoding, 720 simulation ticks, one local model worker and the registered wall cap.

| Readout | s7 | s11 |
| --- | ---: | ---: |
| Real model calls | 74 | 82 |
| Decisions applied | 62 | 73 |
| Individual target calls | 12 | 9 |
| Food-trip targets | 7 | 7 |
| Eat-here targets | 5 | 2 |
| Fallbacks | 0 | 0 |
| Animals with changing body and own-memory inputs | 5 | 5 |
| Explicit replay | Exact | Exact |
| Final world hash | `04fd587810b8b49d` | `79ffa66aa79e9471` |

Independent audits matched all requests, stage answers, menu choices, applied receipts and artifact identities. Every target belonged to its chosen activity's legal menu. All probabilities were finite and normalized. Separate replay commands reproduced the final world hashes.

This is a recurrent simulation loop: perceived state and stored experience enter the model, its choice changes the simulation, and later requests contain the changed state. It does not add hidden recurrent state inside the neural network, and observing changed inputs does not prove the model causally uses each input. The activity scaffold, social gates and action endings retain their existing rules.

Evidence: `loop-s7/`, `loop-s11/`, `logs/replay-s7.log` and `logs/replay-s11.log`.

## Visible app demonstration

The final browser check passed at tick90 in361.5seconds. It reused the verified s7 worker on the unchanged `e792b7e` app runtime. The corrected verifier was frozen at `8acf355ed568f1232a211514b45424238495df15` and retained the original caps and acceptance checks.

There were19 actual HTTP stage calls and18 applied decisions, each with a matching live animal action, target and decision version. Koruza selected `go_to_food` and then tree107090 from8 concrete targets. The target's sampled probability was10.34%; it was not the highest-scoring target. The simulation accepted the choice. Later calls contained changed body and own-experience inputs. No fallback, discard, HTTP or page error occurred.

The paused Mind panel shows the pinned decision `90-3-18`, the activity and target stages, the applied adapter identity and the selected target. Visual inspection of `app-mind.png` also shows Koruza's rendered body, the matching about-to-travel tag and the ready model panel. These are current model decisions, not injected answers. The earlier missing-artifact and invalid-name browser checks verified refusal without advancing the world; loaded-hash mismatch is covered by focused tests rather than a claimed live browser case.

Evidence: `../browser-real-s7-003/` relative to the collection root, including `run.json`, `evidence.jsonl`, `app-mind.png` and `final.png`. Attempts001 and002 remain preserved as failures. The first verifier toggled playback off after a speed shortcut that already resumed it. The second completed the control gates but used an ambiguous Mind selector. Both corrections were registered before changed-code execution; they did not change model, app or simulation behavior.

The local demo is available at `http://127.0.0.1:5182/?r15=1`. It opens an unsaved, paused world. Choosing Watch4× starts playback. The existing s7 worker stays available under the shared model lock; stop it before starting another model or heavy check.

## Remaining limits

No actual water choice, long-run population viability, or improvement against wild behavior has been established. The default-off simulation metrics matched the pre-R15 baseline exactly. Ordinary save/reload and invalid-adapter refusal checks passed separately. The 120-animal performance bound was inconsistent on both the earlier baseline and current code and remains unresolved. Earlier animation checks retain their documented near-extension joint-step and fast trunk-approach limits. The missing generated audio assets are a separate existing limitation; this demonstration makes no audio claim.

R14 remains a failed operational experiment: its third collection stopped incomplete after an inference timeout and recovery costs exhausted its day-fit budget. It produced no R14 training run. Its partial evaluation data was preserved and was not used for R15.
