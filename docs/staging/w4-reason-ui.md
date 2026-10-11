# Stage W4: the reason and the options for any animal, and an act that is about to start

Branch `w4-reason-ui`, cut from `track-e` at dea2643. Written 10 October 2026, 21:15 EDT; reviewed by a second agent the same evening (22:24 EDT), whose findings, fixes and re-measurements are section 6, with sections 1 to 5 corrected where a fix changed what they say. Interface and renderer only: nothing under `src/sim`, `data/` or `tests/fixtures` changed, no parameter was added, the World is read and never written.

Where the stage comes from: the review of 10 October (`/Volumes/Drive/chimpbench/shots/review-2026-10-10/reports/visual-behaviour_legibility.md`, fact-checked in `check-verify_visual_faults.md`, claims 4 and 5). Every living animal carries the options it weighed and a reason sentence, also when the rules decide, and the interface printed the reason in one place only, the cinematic caption. Labels and the chimp strip read the simulation's act while bodies are drawn two ticks behind it.

## 1. What a viewer sees now

1. **The reason in plain sight for the selected animal.** The chimp strip's "now" line is followed by the simulation's own reason sentence (`Chimp.reason`), up to three lines when the panel is expanded and one line (cut with an ellipsis, full text on hover) when it is collapsed. On a phone the collapsed strip keeps its height and gains a second row: the act's icon and the reason. The selected animal's label in the forest carries the same sentence as a second line. Other animals' labels are unchanged.
2. **A Mind tab for every animal.** The tab opens on the decision: the pick over its two runners-up in one line with their values, who chose, then the reason in print. Under it every option it weighed, each with its score as a small bar and its reason as text (no tooltips). An animal the decision loop has no current trace for gets a live card built from its own `candidates` and `reason`, headed **Rules**. A trace card (the animal is on the model roster) has the same top, then the loop's own details as before: saw, options, pick, outcome, cost, the full percept, the history.
3. **"About to".** While the drawn body has not begun the act the simulation has begun, the label and the strip read "about to travel" (italic, dashed underline, dimmed icon; in the strip "About to travel") and switch to the plain verb when the body begins it.
4. **A line of activity in the Log tab.** The interface keeps a record of the selected animal's changes of act from the moment it is selected (nothing is written to the World). The Log tab leads with one bar of the last three hours coloured by kind of act, then the acts with their reasons, newest first, then the field log as before. Each act is tagged with who chose it: "rules", "model" (the engine's full name on hover), or "not a choice" for an act the simulation set without a decision, such as the rest of an animal waiting for an answer or a fight back (the last added by the review: such acts were tagged with the animal's last decision).

Two smaller things came with the truthful names:

- The gold spark on a label and the gold selection and model rings mark an animal the decision loop asks about. They are now off while the rules decide for everyone (model policy off). Before, the selected animal kept its spark with the model switched off.
- In the Mind tab a tree is named by its species ("Chrysophyllum albidum"), as the reason sentences name it. It read "forest fruit" before, the tree's generic common name.

## 2. How it is built

| Part | File | What it does |
| --- | --- | --- |
| Record and rule | `src/render/creatures/drawn.ts` (new, no three.js) | Per drawn animal: the act and target of its last ten tick states (typed arrays, written when a tick has run or a decision landed between ticks). `readDrawn()` says which act the body is in and whether a newer one has not started. |
| Renderer | `src/render/creatures.ts` | One ring per `Anim`, filled in `interpolateAll`; `drawnAct(id, out)` on the layer; the labels get a function that answers "about to" for one animal. |
| Scene | `src/scene.ts`, `src/ui/contracts.ts` | `scene.drawnAct(id, out)` as an optional scene extra (the preview page has no scene and never announces). |
| Labels | `src/render/creatures/labels.ts` | The "about to" wording and style; the reason line as one shared element attached to the selected animal's label. |
| Strip | `src/ui/inspector.ts`, `src/ui/format.ts`, `src/style.css` | `.ch-act` holds the now line and the reason; `nowLine(w, c, about)`; `actionSoon()`. |
| Mind tab | `src/ui/mind-card.ts` (new, no DOM), `src/ui/mind.ts` | `cardFromChimp`, `cardFromTrace`, `traceIsCurrent`, `modelEngine`; the HTML. |
| Log tab | `src/ui/decision-log.ts` (new, no DOM), `src/ui/inspector.ts` | `watchDecisions` (one look per refresh), `timeline`. |
| Preview | `src/ui/synthetic.ts`, `src/ui/preview.ts` | Synthetic animals carry option lists and reasons, and their time in the act runs with the clock, so the page shows both cards. |

### The names of engines

From the plan's block "User decisions (10 October 2026)". `mind-card.ts` `modelEngine()` is the one place that names an engine:

- the rules chose: **Rules**;
- the published base model answered (`fastino/GLiNER2.5-Decide`, today's app): **Untuned model on a rules menu**;
- Jev: "General model (Jev) on a rules menu";
- anything else: "Model <its identifier> on a rules menu".

The browser provider reports the same base as its ONNX export (`onnx-community/GLiNER2.5-Decide-ONNX`, `src/providers/config.ts`); it is not tuned either and carries the same name (added by the review: it was first named "Model onnx-community/… on a rules menu").

The interface cannot tell an adapter from the base model: the server reports the same model name either way. When the app serves an adapter, the server has to say so and `modelEngine()` gets the case "rules-taught model on a rules menu". Until then the interface never claims that name. "Model-driven" without a qualifier is not used anywhere in the new text. The Mind tab's footer now ends: "The options and their sentences are written by the rules, whoever picks."

### When the live card is shown instead of a trace

The latest trace is the first view only while it describes the act under way: it was applied, its pick is the animal's act and target, and it is not older than that act (`traceIsCurrent`). Otherwise the animal has moved on and the live card is shown; the traces stay in the history, and a click on one pins it. Before, a trace two hours old stayed on top while the animal had done five other things.

The live card says what it can know and no more:

- the act under way is on the animal's list: the pick, headed Rules (or the engine's name when the animal's last decision came through the loop);
- the act under way scores below another option: the line reads "scored below" instead of "over", with a note. When the rules chose, the note says that the rules do not always take the top score: they can keep an act under way, and a fresh choice can be a draw weighted by the scores (`src/sim/rg.ts`, on by default for animals aged 8 and over; the interface cannot tell which of the two happened). When the animal's last decision came through the loop, it says a model picked the act by its own probabilities (`mind-card.ts` `belowTopNote`; both corrected by the review);
- the act is not on the list: "not among the options weighed" (a reaction, a fight, a wait the simulation set);
- the animal is parked at a decision point: no pick, "Options on the table".

### The "about to" rule

The first version announced an act for the two ticks of playback lag only. Measured in the running app, that left most of the gap uncovered: after the lag the body still comes down from a crown, walks the last metres or climbs to the food (a median of 1.1 s at 1 min/s for stationary acts, section 3). The rule now reads the body:

- **A trip** (travel, follow, patrol, transfer, consort) is announced while the drawn body neither moves over the ground nor goes up or down. It ends the moment the drawn path moves.
- **A stationary act** (rest, forage, drink, groom, nurse, nest, shelter, mate, pant-grunt, reconcile, console, share, beg) is announced while the drawn body is more than 0.75 m from where the simulation has the animal and has more than a shuffle left to play. It ends when the body is there and its drawn time has reached the state that first showed the act.
- **A shuffle is not an approach** (added by the review). On the field map the simulation's ground foragers eat from their first tick while creeping at 0.3 of a walk, which leaves the drawn body about 3 m behind for as long as the creep lasts. When the simulation moved the animal no faster than 0.45 of the world's walking speed over its last two ticks (the two ticks the body still has to play), the body shows the act wherever it is.
- **Other acts** (charge, flee, display, attack, call, alarm, play, climb, hunt, submit, guard) are never announced: the pose changes at once or the act is short.
- At most 6 ticks of drawn time after the state that first showed the act, so 2 simulated minutes with the lag. Once per act: when the body has begun it, later movement inside the act is not announced again. Not above 2 min/s. Never for a carried infant or a dead animal.

"Moving" is read from the drawn path's own speed, not from the clip. At Real time on the field map a walker can be drawn in the stand clip (the fault stage W1 fixes), and a rule that read the clip announced a trip over a body already gliding along.

Constants, all in `src/render/creatures/drawn.ts` unless said, all labelled stylizations in code. None is a simulation parameter and none enters `data/params.json`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `ACT_HIST` | 10 | tick states kept per drawn animal |
| `ABOUT_TICKS` | 6 | drawn time after the act's first state within which it can be announced |
| `ARRIVED_M` | 0.75 m | a body this close to the animal's place has arrived |
| `SHUFFLE_SHARE` | 0.45 of the world's walking speed (`walkMps`, read with `paramsOf(world)`) | the simulation's movement at or below it is part of a stationary act, not a way to it |
| `PATH_MOVING_MPS` | 0.05 m per ecological second | drawn path speed that counts as on the move |
| `ABOUT_MAX_RATE` | 120 ecological s per s | no announcement above this playback rate |
| `WHY_EVERY` (`labels.ts`) | 0.25 s | the label's reason line is rewritten at most this often |
| `ACTIVITY_SPAN`, `DECISIONS_SHOWN` (`inspector.ts`) | 3 h, 12 | the Log tab's bar and list |
| `DECISION_LOG_MAX` (`decision-log.ts`) | 48 | acts kept in the interface's record |

## 3. Measurements

Every number below is printed by `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w4-reason-ui/tables.py` from the JSON files beside it. The scripts that wrote them are there too: `readout.mjs`, `perf.mjs`, `cap.mjs`.

### What every living animal carries

Running app, field map, seed 48, rules deciding for everyone, hour 9.137 (`readout.json`):

- 49 living animals, 49 with a reason sentence;
- 3 to 12 options each, median 7; 362 of 362 options carry a reason;
- the act under way is on the animal's own list for 49 of 49; 37 of those are the best score and 12 score below another option.

The last line is why the card says "scored below" instead of pretending the top score always wins. The count moves between readouts taken at slightly different moments (two earlier readouts the same evening printed 29 and 30 at the best score); only the file's own values are quoted here.

### Changes of act at 1 min/s

75 s, achieved 70 ecological s per s (one tick = 214 ms), 49 animals, each change watched for 3 s (`readout.json`). "Behind" is the renderer's own reading: for a trip the drawn path is not moving, for a stationary act the body is more than 0.75 m from the animal's place.

| Kind of act | Changes | Drawn body behind at all | Announced | Median time behind (ms) | Total time behind (s) | Of it announced (s) | Plain verb while behind (s) | Announced while the body already showed it (s) | Announced twice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trips (travel, follow, patrol, transfer, consort) | 24 | 14 | 13 | 308 | 5.6 | 3.8 | 1.9 | 0.0 | 0 |
| Stationary acts (rest, forage, drink, groom and the like) | 55 | 32 | 32 | 1117 | 37.3 | 33.2 | 4.2 | 1.8 | 0 |
| Others (never announced) | 3 | 0 | 0 | none | 0.0 | 0.0 | 0.0 | 0.0 | 0 |

The drawn body was behind the simulation's act for 43.0 s in all. Before this stage the label read the plain verb for all of it; now for 6.1 s (14%). Announced animal-frames: 1.47% of all.

What is left, and why:

- 1.9 s for trips: mostly a pause after the body had set off, which the page's sampler counts as "behind" and the rule, correctly, does not announce again.
- 4.2 s for stationary acts: approaches longer than the 2-minute window.
- 1.8 s announced while the body stood at the animal's place: inside the playback lag an announcement is held, because the body can stand at the foot of the tree for a moment before the climb reaches it. Without the hold some stationary acts were announced twice.

This is one 75-second sample of one morning. Earlier readouts of the same evening, on earlier versions of the rule (the two ticks of lag only; then the window without the hold), were overwritten by this one and are not quoted.

### The moment at Real time

Same world and minute in both sets (seed 48, 09:15, the alpha goes from rest to travel; `before/cap-about.json`, `after/cap-panels-phone-about-preview.json`):

- before: clip stand, not moving, label "Tavuni α travelling pant-hoot", strip "Traveling · just started";
- after: clip stand, not moving, label "Tavuni α about to travel pant-hoot" with the reason under it, strip "About to travel";
- after, once the body walks (clip walk, 15 s into the act): label "travelling", strip "Traveling · just started".

### Refresh cost

`?perf=1`, 1440x900, device pixel ratio 1, headless Chrome, field map, close view (the app's opening). The machine was shared: the load average was about 3.6 for the first before run, 7 to 12 for everything after. "Before" is dea2643, served from an exported copy on the same port, so the two builds were measured minutes apart.

Full runs, 20 s per scenario. Two before runs (shown as first / second), one after run on the final code:

| Panel showing, speed | UI ms per frame, before | after | Worst frame ms, before | after | Label overlay ms per frame, before | after |
| --- | --- | --- | --- | --- | --- | --- |
| overview tab, 1 min/s | 0.043 / 0.045 | 0.047 | 1.1 / 1.0 | 0.9 | 0.035 / 0.048 | 0.059 |
| mind tab (traces), 1 min/s | 0.050 / 0.063 | 0.047 | 1.7 / 1.9 | 1.2 | 0.031 / 0.028 | 0.034 |
| collapsed strip, 1 min/s | 0.037 / 0.051 | 0.045 | 0.9 / 0.9 | 0.9 | 0.032 / 0.056 | 0.059 |
| mind tab, rules animal, 1 min/s | 0.042 / 0.057 | 0.058 | 1.1 / 1.4 | 2.3 | 0.020 / 0.040 | 0.031 |
| log tab, rules animal, 1 min/s | 0.039 / 0.049 | 0.060 | 0.7 / 1.2 | 1.1 | 0.017 / 0.026 | 0.030 |
| overview tab, 1 day/s | 0.111 / 0.135 | 0.108 | 1.2 / 1.6 | 2.3 | 0.021 / 0.036 | 0.028 |
| mind tab (traces), 1 day/s | 0.134 / 0.136 | 0.143 | 23.7 / 2.2 | 3.1 | 0.023 / 0.032 | 0.030 |
| collapsed strip, 1 day/s | 0.102 / 0.109 | 0.092 | 1.4 / 1.7 | 1.3 | 0.024 / 0.031 | 0.032 |
| mind tab, rules animal, 1 day/s | 0.101 / 0.112 | 0.124 | 1.6 / 1.7 | 1.9 | 0.023 / 0.027 | 0.034 |
| log tab, rules animal, 1 day/s | 0.102 / 0.111 | 0.132 | 1.3 / 1.8 | 1.8 | 0.025 / 0.028 | 0.036 |

| Panel showing, speed | DOM nodes added or removed per s, before | after | Layouts per s, before | after | Layout ms per s, before | after | Style ms per s, before | after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overview tab, 1 min/s | 0.2 / 0.3 | 0.3 | 7.3 / 10.8 | 14.1 | 1.31 / 1.76 | 2.75 | 15.7 / 21.8 | 26.0 |
| mind tab (traces), 1 min/s | 1.3 / 0.8 | 1.1 | 5.6 / 4.8 | 5.9 | 1.22 / 1.13 | 1.24 | 10.2 / 6.6 | 9.1 |
| collapsed strip, 1 min/s | 0.2 / 0.2 | 0.2 | 7.3 / 6.8 | 10.6 | 1.22 / 1.40 | 2.06 | 14.0 / 20.1 | 22.8 |
| mind tab, rules animal, 1 min/s | 0.2 / 0.2 | 0.5 | 3.8 / 3.4 | 3.8 | 0.63 / 0.75 | 0.79 | 5.8 / 7.6 | 6.5 |
| log tab, rules animal, 1 min/s | 0.0 / 0.1 | 0.1 | 2.8 / 3.0 | 3.4 | 0.44 / 0.57 | 0.80 | 3.3 / 4.7 | 5.4 |
| overview tab, 1 day/s | 53.3 / 35.7 | 53.4 | 18.2 / 19.8 | 20.9 | 5.29 / 6.18 | 5.58 | 26.1 / 32.7 | 33.3 |
| mind tab (traces), 1 day/s | 50.2 / 52.4 | 75.8 | 17.1 / 18.7 | 19.8 | 5.33 / 6.55 | 7.56 | 28.4 / 32.1 | 41.2 |
| collapsed strip, 1 day/s | 53.7 / 45.8 | 56.7 | 17.3 / 19.4 | 21.1 | 4.56 / 4.93 | 5.35 | 23.4 / 28.1 | 31.1 |
| mind tab, rules animal, 1 day/s | 48.9 / 47.4 | 61.2 | 18.1 / 18.0 | 20.5 | 4.65 / 4.97 | 6.13 | 24.6 / 25.1 | 36.1 |
| log tab, rules animal, 1 day/s | 50.3 / 52.3 | 86.4 | 17.8 / 18.4 | 21.9 | 4.67 / 5.19 | 6.76 | 22.6 / 26.7 | 38.4 |

A short back-to-back pair (15 s per scenario, `perf-before-quick1.json`, `perf-after-quick3.json`) agrees: UI 0.040 to 0.137 ms before, 0.043 to 0.164 ms after, with one 12.1 ms frame in the after run's overview at 1 day/s that the full run does not show.

Reading:

- **The interface's own script time is where it was**: 0.04 to 0.06 ms per frame at 1 min/s and 0.09 to 0.14 ms at 1 day/s, before and after. Differences go both ways and are inside the spread of the two before runs. Worst frames are 0.9 to 3.1 ms after, against 0.7 to 2.2 ms before (plus one 23.7 ms frame before).
- **The browser does somewhat more layout and style work.** At 1 min/s with the selected animal travelling in a party: 14 layouts per second against 7 to 11, about 1 ms more layout time per second. The cause is text that now changes: the selected label's reason line, the strip's reason, and a label rewritten twice per change of act (about to, then the plain verb). At 1 day/s the Mind and Log tabs cost 9 to 16 ms more style time per second (about 0.2 ms per frame) and 12 to 36 more DOM nodes per second, because the live card and the act list redraw once a second there.
- **No forced layout was added**: the new code reads no layout (no rectangle or size read). Label sizes still come from the existing ResizeObserver.
- **Three things were changed because of these measurements.** The Mind tab had a running "for 31 min" that redrew the whole tab once a second at 1 min/s (UI 0.095 ms per frame in a run kept as `perf-after-run1-superseded.json`); the card now shows when the act began, and the strip beside it counts the time. Every label had gained two elements for a line only one label shows; the reason line is now one shared element. Its text is rewritten at most four times a second.

Per frame, on what:

- for each drawn animal: two comparisons, and three typed-array writes when its act changed or a tick ran;
- for each label that shows a verb (the selected animal's party and the hovered animal, at most 20): one scan of ten states, one distance, and the two newest steps of the animal's position record (the shuffle test);
- nothing is allocated; no render pass, texture or shader was added, so the GPU is untouched.

At 4 Hz, with the panels: one `drawnAct` read and one look at the selected animal for the act record.

## 4. Proof

Screenshots under `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w4-reason-ui/`, `before/` and `after/` with the same names and framing (19 and 20 pictures, 39 in all):

| File | What it shows |
| --- | --- |
| `a1-strip-expanded-1440` | rules-driven animal selected, panel expanded: the reason under the now line, and on its label |
| `a2-`, `a2b-mind-rules-animal-1440` | Mind tab of an animal just selected: "No decisions recorded yet" before, the live card after (and scrolled) |
| `a3-log-1440` | Log tab just after selecting |
| `a4-strip-collapsed-1440`, `a5-label-crop` | collapsed strip with the reason; the label with its second line |
| `a6-`, `a6b-mind-trace-1440` | the same animal with a trace (the rules stood in for the offline model) |
| `a7-log-after-watching-1440` (after only) | Log tab after 2.5 hours of watching; its before is the review's `legibility/04-panel-log.png`, one entry after 2.5 hours |
| `b1-`, `b2-`, `b3-…-390` | 390x844: collapsed strip, Mind tab, expanded strip |
| `c1-about-to-realtime-1440`, `c2-about-to-crop` | Real time: the label over a body that has not set off |
| `c3-started-1440`, `c4-started-crop` | 15 s later: the body walks |
| `d1-`, `d2-`, `d3-preview-mind-…` | `src/ui/preview.html?tab=mind`: a model trace with probabilities, scrolled, and an animal with the live card |

Sizes: the scene's insets are the same in both sets (left 314, right 398, top 52, bottom 329 expanded and 72 collapsed), so no panel changed size. The Mind pane holds more content than before (742 px against 272 px for the just-selected animal, 813 px against 606 px with a trace, in a 272 px pane) because the reasons are printed; the decision and its reason are on the first screen. On a phone the expanded sheet's header is 35 px taller (two lines of reason), so its tab body is 419 px against 454 px.

Tests (each run with `fnm exec --using=22.22.3 -- pnpm exec tsx --test tests/<file>.test.ts`), all passing on the final code:

- new: `render-drawn` 16, `ui-mind-card` 14 (12 and 11 as built; the review added 4 and 4 and removed one assertion that could not fail);
- existing, unchanged: `ui-chimp-panel` 2, `ui-map-view` 7, `ui-popover` 4, `ui-scalebar` 2, `ui-tooltip` 3, `ui-units` 6, `render-playback` 4, `render-motion` 6, `render-gait` 6, `render-pick` 6, `render-portrait` 3, `render-secondary` 6, `render-patrol` 10, `render-field` 12;
- `pnpm exec tsc --noEmit`: clean.

`node scripts/verify-browser.mjs http://127.0.0.1:5187 --no-model`: 11 steps pass (startup, prologue, right panel, Mind tab, playback, 1 day/s, night, storm, scale bar, society and views, 60 fps), then it stops at "store ready". The save store cannot start in a worktree: `node_modules` is a symlink out of the server's root and the SQLite WebAssembly file is not served. The same error was on the console before any change. The save and resume steps were therefore not run here.

Not run, as the brief says: `pnpm test`, `pnpm build`, the GPU probe. Golden hashes and the field pin test were not run either; no file they read was touched (`git diff dea2643 --stat -- src/sim data tests/fixtures` is empty).

## 5. Limits and what is not done

- **A model's answer was not seen live.** No model process was allowed in this tranche. Probabilities, the "rules would pick" note and the gold chip were checked on the synthetic preview page only.
- **The act record covers the selected animal from the moment it is selected.** Select another animal and it starts again. Right after selecting, the activity line shows only the act under way (from its true start, which the simulation keeps). At high speed several decisions pass between two looks; they are counted as "passed unseen", not listed.
- **The Mind tab's history lists decision-loop traces only.** A rules-driven animal's past acts are in the Log tab, not as past cards.
- **No marker on the target and no option lines in the forest.** The review proposed them; the brief did not ask for them.
- **The strip looks four times a second.** At 1 min/s an announcement shorter than a quarter of a second can pass between two looks; the label is evaluated every frame.
- **"About to" is a reading of the drawn path against the simulation's position, not an animation.** The body does not orient or hesitate (the review's first issue, a different stage). While a label reads "about to forage" the body is walking in or climbing; nothing else on the body says so.
- **A plain verb appears at once for a stationary act whose approach starts a tick later**, then "about to" for the approach, then the plain verb again. It happens when the simulation moves the animal only after the tick in which it decided; how often was not counted.
- **Device pixel ratio 2 was not measured**, and the refresh numbers come from a machine at load 4 to 12.
- **Short windows.** Under 800 px of window height the snapshot in the expanded panel shrinks from 84 to 64 px to give the reason two lines; under 690 px one line.
- `docs/architecture.html` describes the Mind tab and was not touched.

## 6. Review (second pair of eyes, 10 October 2026, 22:24 EDT)

A second agent read the whole diff, re-ran the checks, drove the running app and the simulation against the stage, and fixed what it confirmed, as six commits on this branch (0c3a984 to f378d10). Its scripts and JSON are in `/Volumes/Drive/chimpbench/shots/watch-2026-10-10/w4-reason-ui/review/`; the tables below are printed by `tables-review.mjs` and `drawn-sim-check.ts` there.

### Found and fixed

1. **"About to forage" over an animal already feeding, for up to two simulated minutes.** Caught at Real time (`labels-rtcatch-before-fix.json`): Rukaso went from play to "Forage on leaves and pith nearby" and its tag read "about to forage" for the whole 55 s recorded, 52.8 s of them over a body drawn in the forage clip. Cause: ground foragers eat from the first tick while creeping at 0.3 of a walk (`src/sim/execution.ts` `forageTick`), so on the field map the drawn body trails the simulation by about 3 m for as long as the creep lasts, and the rule judged "not there yet" by distance alone. Fix: the shuffle clause of section 2 (`drawn.ts` `shuffles`, `readBody`, `SHUFFLE_SHARE`). The real field simulation driven through the renderer's own pure parts, seed 48, six hours, animals aged 8 and over, in drawn ticks:

| Kind of act | Starts | Announced, as built | Ticks announced inside the lag, as built | After the lag, as built | Announced, with the clause | Inside the lag, with the clause | After the lag, with the clause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| forage, ground | 15 | 15 | 30.8 | 50.5 | 11 | 22.8 | 19.0 |
| forage, a tree | 112 | 112 | 221.3 | 409.0 | 111 | 218.0 | 385.3 |
| drink | 32 | 32 | 63.0 | 182.3 | 32 | 60.0 | 182.3 |
| groom | 53 | 26 | 50.0 | 45.3 | 23 | 43.8 | 40.5 |
| rest | 88 | 32 | 64.3 | 0.0 | 31 | 62.3 | 0.0 |
| travel | 130 | 107 | 144.3 | 11.3 | 107 | 144.3 | 11.3 |
| follow | 48 | 26 | 29.8 | 5.8 | 26 | 29.8 | 5.8 |

   What is left for ground foraging with the clause is animals that first come down from a nest or a crown, or arrive at a walk, which is rightly announced. The price: a few short hops to a partner or a low crown (under 2.4 m a tick on the field map) are no longer announced. A test drives the field simulation through the rule and fails without the clause.
2. **The browser's copy of the base model was not named "untuned".** The browser provider, the app’s default (`public/decision-providers.json`), reports `onnx-community/GLiNER2.5-Decide-ONNX`; the Mind tab named it "Model onnx-community/GLiNER2.5-Decide-ONNX on a rules menu" with the note "a model other than the published base". Fixed in `mind-card.ts` `modelEngine`, with a test.
3. **The note under a pick that scores below another option told half of the rules' policy**, and gave the rules' policy as the reason for a model's pick. In the running app 19 to 20 of 49 animals were in an act scoring below another option (two readouts; the builder's had 12). Fixed (`belowTopNote`), with a test.
4. **The Log tab credited acts nobody chose to the animal's last decision.** With a live model, the rest of an animal waiting for an answer would have been listed as the model's pick. Fixed in `decision-log.ts` (`actSource`), with a test that drives the simulation's own decision steps to the case.

### Re-measured

The builder's readout, re-run unchanged but for its output path (75 s at 1 min/s, every animal read each frame). "Behind" is by distance alone, so after the fixes it counts creeping ground foragers that are in fact feeding:

| Run | Achieved rate (eco s per s) | Living, with a reason | Options per animal (min, median, max) | Act on its list, best score, below another | Changes of act (trips, stationary) | Behind by distance (s) | Of it announced (s) | Plain verb while behind (s) | Share plain |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| builder's code (7827c7b) | 49 | 49, 49 | 3, 7, 11 | 49, 29, 20 | 24, 64 | 82.8 | 66.6 | 16.2 | 20% |
| after the review's fixes | 68 | 49, 49 | 3, 7, 11 | 49, 30, 19 | 24, 63 | 81.0 | 59.8 | 21.2 | 26% |

So the headline of section 3 (the plain verb over a body that had not begun the act for 6.1 s of 43.0 s, 14%) was not reproduced as a number: two further samples gave 20% and, with the fixes, 26%. The direction holds: most of the time the body trails the act is announced. It is one morning of one seed.

What stands under a name tag, independent of the rule's own thresholds (80 s at 1 min/s in the close view on the largest party; the tag's text against the clip the body is drawn in; the two runs followed the same animals through the same acts):

| Run | Tag-frames | Announced tag-frames | Announced time (s) | "about to" over a still body at its place (s) | "about to" a trip over a moving body (s) |
| --- | --- | --- | --- | --- | --- |
| builder's code (7827c7b) | 13035 | 345 | 5.8 | 0.0 | 0.0 |
| after the review's fixes | 13100 | 335 | 5.6 | 0.0 | 0.0 |

Refresh cost on the final code (the builder's `perf.mjs`, short run of 15 s per scenario, 1440x900 at device pixel ratio 1, load 3.0 to 3.4). The "before" side (dea2643) was not re-measured; the builder's before numbers agree with the figures AGENTS.md already carries.

| Panel showing, speed | UI ms per frame | Worst frame ms | Label overlay ms per frame | DOM nodes per s | Layouts per s | Layout ms per s | Style ms per s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| overview tab, 1 min/s | 0.046 | 1.0 | 0.046 | 0.4 | 12.5 | 2.73 | 28.2 |
| collapsed strip, 1 min/s | 0.053 | 1.4 | 0.049 | 0.2 | 9.9 | 2.35 | 24.7 |
| mind tab, rules animal, 1 min/s | 0.036 | 1.3 | 0.015 | 0.7 | 4.3 | 0.76 | 6.2 |
| mind tab, rules animal, 1 day/s | 0.087 | 0.9 | 0.023 | 65.4 | 21.0 | 5.11 | 30.4 |
| overview tab, 1 day/s | 0.082 | 1.2 | 0.016 | 55.9 | 18.9 | 4.22 | 24.6 |

Also re-run: type-check clean; 16 test files one by one, 107 tests passing (`render-drawn` 16, `ui-mind-card` 14, the 14 existing files unchanged), plus `decision` 22, `providers` 6, `decision-guide` 4; `verify-browser.mjs --no-model` passes the same 11 steps and stops at "store ready" for the same reason. Looked at, from the worktree as it is: the strip expanded and collapsed, the label, the Mind and Log tabs, the strategy view, the cinematic view (no label there; the caption carries the reason), night in a nest, a 1440x780 and a 1024x700 window, 390x844, and the small map. Nothing was found worse there. Five pictures are kept in `review/`.

### Found and left

- **A long approach reads the plain verb after two simulated minutes.** In the six-hour tally (`review/creep-check.out.txt`) every one of 32 drinks was still on its way when the window closed (the simulation's act is "drink" for the whole walk to the stream: one caught live was 712 m), and 39 of 119 walks to a crown. The tag then reads "drinking" over a walking animal for the rest of the way. Lifting the cap for a body that is on its way needs the record to remember the act before for longer than ten ticks, and a decision on how long "about to" may stand; not done.
- **Inside the playback lag the body already plays the new stationary act's clip where it stands**, because the clip is chosen from the simulation's act (`creatures.ts` `chooseClip`). So "about to pant-grunt" stood over a body in the pant-grunt clip for one tick (15 s at Real time), and "about to drink" over a body in the drink clip between walking stretches (`labels-rtcatch.json`, rounds 2 and 0). The tag is right about the simulation; the pose is early. The cure is in the clip choice (hold a neutral pose while the tag is "about to"), which is where stage W1 works.
- **Ground foragers creep towards a stale goal.** `forageTick` walks a ground forager to `x.gx, x.gz`, which `startAction` does not reset, so until its own tick in sixteen sets a new goal the animal creeps towards wherever the act before was heading (4 of 15 ground-forage starts in six hours crept about 1.5 m a tick for eight ticks or more; `review/ground-detail.out.txt`). A simulation matter, outside this stage, reported for the simulation's owners.
- **The decision line can name one target three times.** Trees are named by species, so "Travel → Chrysophyllum albidum 0.34 scored below Forage → Chrysophyllum albidum 0.60 · Travel → Chrysophyllum albidum 0.34" is three different trees. The reasons under the options tell them apart; the line does not.
- **A trace stops being the first view at high speed with a late answer.** `traceIsCurrent` allows two ticks between the request and the act; an answer that lands later (at 10 min/s a 0.35 s answer is 14 ticks) shows the live card, correctly headed with the engine, without the probabilities. The trace stays in the history.
- **On the live card of an act a model picked, the values in the decision line are the rules' scores** (the column below is headed "Rules score"; the line itself has no unit).
- **The selected animal's taller label is dropped when it would touch a panel**, as any label is; at 62 px it touches one sooner than a 19 px label did.
- The stage's figure for the snapshot shrinking in short windows applies at common laptop sizes: a 1440x900 screen leaves a browser window under 800 px high, so there the snapshot is 64 px, not 84 px (looked at in `review/r6-strip-expanded-1440x780.png`; the layout holds).

## 7. For the integrator

### Status line for `IMPLEMENTATION_PLAN.md` (stages W1 to W5, the W4 bullet)

> - **W4 (branch `w4-reason-ui`):** every animal carries its options and a reason sentence, but the reason is printed only in the cinematic caption and labels change one to two ticks before the drawn body; show the reason and the options for any selected animal and mark an act that is about to start. **Done on its branch, awaiting review (10 October 2026; `docs/staging/w4-reason-ui.md`).** The reason is in the chimp strip (also collapsed) and on the selected animal's label; the Mind tab shows a live card from the animal's own candidates for any animal, headed Rules, with every option's reason in print and engines named as this block asks; labels and the strip read "about to …" until the drawn body has begun the act, for at most two simulated minutes (at 1 min/s the plain verb stood over a body that had not begun the act for 14% to 26% of that time in three 75 s samples, against all of it before); the Log tab has an activity line from a record the interface keeps. Reviewed the same day: four defects fixed (a false "about to forage" over ground foragers, the browser model's name, the note on a pick below the top score, who an act in the Log is credited to). No simulation file, parameter, render pass or panel size changed. Not seen with a live model. Open: a long approach (every drink) reads the plain verb after two minutes, and a body can play a stationary act's clip while its tag still says "about to".

### Lines for `AGENTS.md`

Gotchas, after the line that begins "Creature playback trails the sim by 2 ticks":

> - Which act the drawn body is in (stage W4, `render/creatures/drawn.ts`): each drawn animal keeps the act and target of its last ten tick states, and `scene.drawnAct(id, out)` reports the act the body is in and whether the simulation has begun a newer one the body has not started (a trip: until the drawn path moves; a stationary act: until the body is within 0.75 m of where the simulation has the animal or has only a shuffle left to play, the simulation having moved the animal no faster than 0.45 of `walkMps` over its last two ticks; at most 6 ticks of drawn time; never above 2 min/s). Labels and the chimp strip read it ("about to travel"). It reads the path, not the clip, and writes nothing to the World.
> - The selected animal's reason line on its label is one shared element (`.crl-why`) moved between labels and rewritten at most four times a second. Do not add children to every label: Chrome restyles a label's whole subtree each frame it moves.

Verifying a change, the preview line:

> - `/src/ui/preview.html` (synthetic world, no 3D); `?tab=mind` shows a model trace with probabilities, and `]` moves to an animal with the live card

Open issues, appended to the "UI layout" item:

> The strip's now line is followed by the simulation's reason sentence, also when collapsed (a strip narrower than 860 px drops the age line first). The Mind tab works for every animal: when no decision-loop trace describes the act under way it shows a live card built from `chimp.candidates` and `chimp.reason` (`src/ui/mind-card.ts`). The Log tab leads with an activity line and the acts the interface saw since the animal was selected (`src/ui/decision-log.ts`; kept by the interface, not saved).

Open issues, the "UI refresh" item, replaced by:

> - UI refresh (`?perf=1`, close view on the field map, 1440×900 at dpr 1, 10 October 2026): 0.04–0.06 ms per frame at 1 min/s and 0.09–0.14 ms at 1 day/s, worst frame 1–3 ms, no forced layouts. DOM churn: under 1.5 nodes/s at 1 min/s, 53–86 nodes/s at 1 day/s (field-log turnover, and the Mind and Log tabs redrawing once a second); `window.__MGOGO_UI__.mutations()` counts it. Layouts: 3–14 per second at 1 min/s, about 20 at 1 day/s. Most style recalcs are the 3D label overlay's per-frame transforms, not the panels.

### Parameter rows for `docs/simulation.md` section 17

None. The stage adds no simulation parameter. Its constants are interface conventions in `src/render/creatures/drawn.ts`, `labels.ts`, `src/ui/inspector.ts` and `src/ui/decision-log.ts` (the table in section 2 above).

### Merge notes

- **Likely conflicts.** `src/render/creatures.ts`: this branch touches the imports, the `CreatureLayer` and `Anim` interfaces, `addAnim`, two lines in `interpolateAll`, the `labels.update` call, a block after `getScale` and the return object. It does not touch `evaluatePose`, `chooseClip` or the motion thresholds, where W1 works. `src/style.css`: the chimp panel block, the Mind tab block and the phone block at the end. `src/render/creatures/labels.ts`, `src/ui/mind.ts`, `src/ui/inspector.ts`: large edits; take this branch's side if another stage only reformatted them.
- **With W1 (from the review).** While a tag reads "about to" for a stationary act the body can already be drawn in that act's clip (section 6, "Found and left"). If W1 touches `chooseClip`, `aboutOf(a)` in `creatures.ts` is the signal for holding a neutral pose there. A creeping ground forager is drawn in a walk or gallop clip at 1 min/s today and reads "foraging"; once W1 chooses the clip from ecological speed the two should agree.
- **With W1.** The rule reads the drawn path's speed, so it does not depend on the gait thresholds W1 changes. W1's watching speed near 4 s/s is under `ABOUT_MAX_RATE` (120), so announcements show there. Worth one look after both are merged: a trip start at the watching speed.
- **With W5 (grooming).** A groomer walking up to its partner now reads "about to groom" until it is there. If W5 changes where the pair is drawn, check that the label still switches when the bodies meet (the rule compares the drawn path with the simulation's position, not with the partner).
- **Run after the merge.** `pnpm test`, `pnpm build`, and `node scripts/verify-browser.mjs` against the main checkout's server, where the save store starts.
- **With the model on** (the integrator's next model session): select an animal, open Mind, and check the chip "Untuned model on a rules menu", the probabilities column, and "The rules would pick …" when they differ.

### Decisions that are the user's

1. The Mind tab names trees by species. The common names are generic on the field map ("forest fruit" for three species). Keep, or show both?
2. The collapsed strip drops "Adult male · 27 y" when it is narrower than 860 px, which it is at 1440 px with both sidebars open, to give the reason room. Keep?
3. The gold spark and rings now mean "the decision loop asks about this animal" and are off when the model is switched off. Keep?
4. Should the act record follow every animal, so the activity line is full the moment any animal is selected? It would be a few comparisons per animal four times a second and a few hundred small objects; it was left out because the brief asked for the selected animal's record.
5. The default layout and the panel sizes were not touched (not put to the user).
6. From the review: how long may "about to" stand? Today at most two simulated minutes, so an animal walking to a stream reads "about to drink" for two minutes and "drinking" for the rest of the walk (section 6, "Found and left"). The alternative is to keep it for as long as the body is on its way.
