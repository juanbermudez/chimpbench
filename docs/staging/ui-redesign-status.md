# ui-redesign: status (6 Oct 2026, all 11 steps done; nothing merged or pushed)

Branch `ui-redesign`, worktree `/Volumes/Drive/chimpbench/MGOGO/.claude/worktrees/ui-redesign` (the repo moved off the
iCloud-synced Desktop on 6 Oct; steps 8 and 9 were re-verified here after the move). One commit per plan step, 3 to 11.

## What the user asked for, and what was built

1. **Experiments and Society in a right sidebar; chimp details in a bottom panel.**
   - Right sidebar (`.rside`, `src/ui/app.ts`): four panes, Communities (resting state), Society (`T`), Experiments (`E`),
     Model (`M`). The same key or `Esc` returns to Communities; `Shift`+`B` hides the sidebar. The left dock is gone.
   - Society pane (`src/ui/society-side.ts`): one community at a time, stacked lists. Kinship = matrilines as indented
     lists, Dominance = the two ladders, Bonds = the strongest pairs, Alphas = tenure list and a small timeline.
   - Bottom chimp panel (`.chimp-panel`, `src/ui/inspector.ts`), between the left column and the right sidebar: a square
     snapshot, name, α badge, community chip, stage, sex, age, rank, current activity, and the tabs Overview, Log (the
     field log filtered to that chimp, `src/ui/chimp-log.ts`), Mind, Family, Relations. `I` or the chevron collapses it
     to a one-line strip. Wide panels lay tab content out side by side (container queries).
   - Flat cards: community rows, alpha line, ladders, unit tiles, field-log and toast icons, the Mind tab's decision
     story, the Model pane and the full society view lost their inner boxes (hairlines, type, spacing, colour chips).
2. **Experiments as a plain list with an animated popover** (`src/ui/interventions.ts`, `src/ui/popover.ts`): one row per
   experiment; description, citation and scope appear beside the row on hover and on keyboard focus (fade and slide,
   glide between rows; no movement under `prefers-reduced-motion`, checked). The text stays in the row for assistive
   technology and shows inline on touch screens.
3. **α badge instead of the crown** (`parts.ts` `alphaBadge`, styled like `.crl-rank.alpha`): chimp panel, community
   rows, alpha line, ladders, unit tiles, Mind tab's nearby list, full society view (column heads and the kinship
   forest). The crown icon is deleted.

Snapshot (step 10, `src/render/creatures/portrait.ts`): a real render of the animal's head and shoulders, face front-on
and upright in any pose, exposed so it reads at night. The unit chip is the stand-in when there is no picture (render
quality 'low', cinematic view, dead or unloaded animal, the synthetic preview).

## Verification (6 Oct, new worktree)

- `tsc --noEmit -p .`: clean. `pnpm build`: passes (183 modules).
- `pnpm test`: 517 tests, 516 pass, 1 fails only because the gitignored file `artifacts/validation/c7a-field1y.json` is
  absent from this fresh worktree (`tests/guide-data.test.ts`); with that file linked from the main checkout the test
  passes (11 of 11 in that file). New tests: `ui-popover`, `ui-chimp-panel`, `render-portrait` (9 tests).
- `node scripts/verify-browser.mjs http://127.0.0.1:5188 --no-model`: 17 of 17 steps pass, no page or console errors.
  Its speed keys were stale (1 is real time now); fixed in the script.
- Screenshots: `/Volumes/Drive/chimpbench/shots/ui-redesign/before/` (12: chimp, experiments, society at 1440×900,
  1280×800, 880×900, 390×844) and `…/after/` (56: 14 states at the same four sizes). No console errors or warnings
  in the AFTER run (the "Sound assets unavailable" warning, present before too, is filtered: `public/audio` is not in
  the worktree).
- `?perf=1` UI cost, compressed map, 1440×900 at dpr 2, 8 s per state, on a machine shared with four simulation jobs
  (raw rows in `…/shots/ui-redesign/perf-before.txt` and `perf-after.txt`):

  | | before | after |
  | --- | --- | --- |
  | 1 min/s: mean per frame | 0.05–0.07 ms | 0.07–0.11 ms |
  | 1 min/s: worst frame | 0.7–1.9 ms | 0.8–1.4 ms |
  | 1 min/s: DOM nodes per second | 0–0.6 | 0.1–1.0 |
  | 1 day/s: mean per frame | 0.10–0.15 ms | 0.14–0.18 ms |
  | 1 day/s: worst frame | 0.8–2.3 ms | 0.9–1.8 ms |
  | 1 day/s: DOM nodes per second | 4–71 | 62–80 |

  The mean rose by about 0.03 ms because three panels now show at once (before, the dock replaced the field log and
  the inspector replaced the communities). Only the sidebar pane that shows and the expanded chimp tab do DOM work.
- Snapshot cost (same machine): no new shader program (104 before and after); the extra draw takes under 0.2 ms of
  CPU and causes no long frame with the readback disabled; developing takes 1.2–3.5 ms. The GPU readback is the cost:
  at a steady 60 fps the picture arrived in 42–50 ms with no long frame; with the GPU saturated it took 230–320 ms and
  stretched one frame to 67–83 ms. Deferring the read to the next frame's start and an 8-bit target did not help
  (p99 105–111 ms against 45–50 ms at one snapshot a second). So the panel asks on a new selection, once 1.5 s later,
  then only for a changed activity at most every 15 s and never above 1 h/s; the scene refuses refreshes while its
  smoothed frame time is over 24 ms, and draws none at quality 'low' or in the cinematic view.

## Decisions waiting for the user

1. **Keys.** `I` collapses or expands the bottom chimp panel (the file's proposal). `Shift`+`B` hides the right sidebar
   (new; `B` still hides the field log). `E`, `T`, `M` switch the sidebar and toggle back to Communities.
2. **Model panel** moved into the right sidebar as a fourth pane (the alternative was to keep a left dock for it alone).
3. **Full-screen society view kept**, opened by "Full view" in the Society pane: the kinship forest (with sire links) and
   the bond network do not fit a 316–432 px sidebar legibly. Delete it if the sidebar lists are enough.
4. **Rank tab removed** from the chimp panel (the rank is in its identity column; ladders are in the sidebar's
   Communities and Society panes).
5. **Crown removed entirely.** Three uses were not alpha markers and got other glyphs: hierarchy events and pant-grunts
   (ladder), "Alpha history" (history), "Remove the alpha" (a struck-through α).
6. **Snapshot refresh rate.** Rare by design (see cost above). A live picture would need a different technique (no
   readback), not tried.
7. **Below 1180 px** the chimp panel runs to the right edge and the sidebar stands on top of it (there is no room for
   the panel between two columns). The sidebar starts closed below 1440 px, as the inspector did.
8. **Phones:** the sidebar and the expanded chimp panel are sheets, one at a time; the collapsed chimp panel is a strip
   above the bottom bar.
9. **After an experiment fires** the sidebar stays on Experiments (it lists the active stimuli) and the chimp panel
   opens the Mind tab; before, the dock closed itself.

## Known issues

- The snapshot can cost one long frame (67–83 ms measured) when the GPU is saturated; see the cost above.
- A snapshot taken at the instant of selection can catch a pose mid-transition; the follow-up 1.5 s later replaces it
  unless frames run long.
- Night snapshots of animals curled in a nest can show a small specular speckle at the frame edge.
- At 1280×800 with the sidebar open, the chimp panel's tab body is 362 px wide: Overview falls back to two columns and
  scrolls.
- `scripts/guide-shots.mjs` selectors were updated for the new panels but the script was not run.
  `docs/architecture.html` still describes the old inspector layout.
- `scripts/perf-probe.mjs` maps speeds to keys 1–6 from the old presets (1 is real time now); not changed here.
- Saved view state with the old `hierarchy` tab falls back to Overview; the old `panel` field is ignored.

## Environment notes

- Dev server: `MGOGO_NO_MODEL=1 fnm exec --using=22.22.3 -- pnpm exec vite --host 127.0.0.1 --port 5188 --strictPort`.
  Open pages with `?persist=0&provider=server`: the default provider is `browser`, which starts an 872 MB model
  download from the Hugging Face hub on load. On 6 Oct, before this was noticed, two page loads began that download
  (about 7% in one of them) and were closed; nothing was sent other than the model file requests.
- From about 00:50 on 6 Oct the old worktree under `~/Desktop` returned empty reads and hung (iCloud eviction); the
  step 8 and 9 screenshots and checks were retaken in the new worktree, and one phone fix was committed.

## User decision (6 October 2026)

"UI: accept all five decisions." The five put to the user: `I` collapses the chimp panel and `Shift`+`B` hides the right
sidebar; the Model panel is a fourth tab of the sidebar; the full-screen Society view stays behind "Full view"; the Rank
tab is removed from the chimp panel; below 1180 px the sidebar stands on top of the chimp panel. Still to do on this
branch: `docs/architecture.html` describes the old layout; `scripts/guide-shots.mjs` is updated but not run. Merging
into `main` is the user's.
