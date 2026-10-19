# Stage V1: How close to the wild, phase 1

Branch `v1-field`, cut from `track-e` at 54f385ac on 19 October 2026 (00:39 EDT). Interface, a bundle script and their
tests only.

The user's request (18 October 2026), as written: "It would be good so be able to visualizes different chimp behacioral
data, and compare it to data from the research, even on overlays on the simulation, so things like patrols, deaths,
encounters between troops, birth rates, moratlity rate, infant morality rate, nutrition, movement, and the benchmarks we
are trying to match visualized busitfally as a way to observe how close the simulation is to reality and explore the
behaviours".

The design is `/Volumes/Drive/chimpbench/shots/v1-design-2026-10-18.md`: a page called "How close to the wild" (key K),
map themes, and a strip of yardsticks under the range-map card, all built on one comparison mark. Its attacker said
"build it, but not as written". This stage builds the first phase, reshaped as the attacker asked.

## 0. Registration (committed before any code of this stage)

### 0.1 What is built

**1a. The yardsticks.**

- `scripts/field-bundle.ts`: reads `data/targets.json` and the three frozen checkouts that hold the reference runs
  (`bench-y3`, `bench-wean`, `bench-e1x3` under `.claude/worktrees`), read-only, and writes two files the page fetches
  on first open: `public/field/targets-lite.json` (every target that is not sealed: plain name, definition, method,
  band with units and basis, the field rows as text, sources, role, evidence, every flag with its reason, its chapter,
  its minimum window) and `public/field/reference.json` (each reference arm named in words, with per-world values,
  pooled values, intervals, sample sizes, the scorer's note and verdict word, births and deaths by cause per world, and
  the rows that need a recount). `--check` rebuilds both in memory and fails unless every value equals its source file
  and the files on disk equal the rebuild byte for byte. No host name or path of this machine goes into either file.
- `src/yardstick/`: pure helpers with no DOM and no three.js. It imports from `src/field` and re-exports (one
  direction only); nothing in `src/field` is moved or edited. The band distance moves here from
  `scripts/lib/band-distance.ts` (not part of the frozen protocol), which re-exports it unchanged. Also here: the
  distance words, the chapter table, the minimum windows, the reviewed list of rows whose all-seeing value has the same
  definition as the field's, and the exact life-record reader (1b).
- `src/ui/yardstick.ts`: the row component.
- `src/ui/wild-page.ts`: the page "How close to the wild", loaded only when first opened (key K, or the "born · died"
  count in the menu bar). A header with the fixed one-world sentence, a provenance line in plain words, a short reading
  guide shown on first open, "At a glance" with one lane (the reference runs until this world has values), and the
  eight chapters in the user's words (Patrols, Encounters, Births, Deaths, Mortality, Infants, Nutrition, Movement) with
  bands, reference values and every caveat. The other sections (Activity and rhythm, Social life and parties,
  Communication, Hunting) list their rows only.

**1b. This world's exact life record.** Read from `world.chimps` only: births with mothers and their ages, deaths with
times, ages, causes, communities and places, and each infant's fate. Shown in Births, Deaths, Mortality and Infants,
labelled "exact record (all-seeing): not what a field team could see", with the window it covers. A test rebuilds the
living population day by day from birth and death times and requires it to equal what the world held on each day.

**1c. One overlay on the range-map card**, drawn in 2D on its own canvas: each community's true range outline (the
cells of `Troop.range`, the 95% outline and the 50% core) and the places where animals died (from the dead records),
with a legend and hover cards. Off by default, one toggle in the card's layer bar. While it is on, the card's range
circles are not drawn, so two range shapes never show at once.

### 0.2 The attacker's strikes and changes that bind this build

1. `src/field` stays untouched: its files are hashed as the frozen protocol (215ed6ab282a57de). A test holds the hash.
2. No plotted site ticks: the field rows are free text and are shown as text.
3. No sparklines and no per-world seed dots in the 44 px rows (the per-world values are in the row's detail only).
4. One lane by default in "At a glance": the reference runs until this world has values.
5. No unlabelled rings: every mark is named in a key on the page.
6. A value with no interval is drawn hollow, with "no interval for one world".
7. Every row has a minimum window taken from its protocol and says, for example, "needs a year: 38 days so far"
   instead of a number.
8. One mark per part for rows scored in parts (by sex, by cause).
9. Distance words fixed for one-sided and zero-width bands: "60% above the field's upper limit", "in raw units".
10. Reference life-history values labelled "pooled, not a life expectancy", or shown as "needs decades".
11. The reference model's failed viability is shown in Deaths and in the population view (births, deaths, starvation,
    the world that fell to 76% of its start, deaths by cause per world).
12. Rows that need field experiments say so ("needs field experiments; not run in a watched world").
13. This world's community sizes are shown beside bands written for a community size.
14. The Gombe path figure is never shown (it is a held-out movement validation).
15. A short reading guide on first open.
16. Wide bands are marked, so "inside" is not over-read.
Also from the attack: blue only for field data on the page (disease marks are not blue); "orphaned infant" deaths folded
into a broader class in every aggregate; the "same definition" flag is a reviewed list with a reason per entry and a
test; place of death is named as such only where bodies do not move (`deadBody` 0); the bundle carries no host names
or paths; "needs decades" is worded with a rough time at 1 day/s, not "no run exists"; truth rows say the app shows
reference values only.

What phase 1 leaves out on purpose: the live field teams, the notebook, the 3D map themes, the strip, Catch the next
one, Run until it has a number, the who-decided ledger and the experiment log. With no field teams, every row's "this
world" value is either an exact all-seeing value on a reviewed same-definition row, words, or "needs …".

### 0.3 The rules this build keeps

No tick hook. Nothing under `src/sim` or `src/field` changes. No new render pass, render target or material. Drawing
writes nothing to the World. Saves still load: if anything is saved, only short interface keys in `session.ui`, which
older builds ignore. No `Math.random` added. Nothing is run on a reserved or sealed seed, and no long simulation is run
(the tests run short development worlds of seed 48; the reference runs are read from the frozen checkouts). No model
process; one no-model probe server and one headless browser at a time on a free port, stopped by PID; never ports 5182
or 5173; nothing heavy while a model step of stage R16 runs.

### 0.4 What will count as done

1. **Every number equal to its source.** `field-bundle --check` passes: every arm, row, per-world value, pooled value,
   interval and sample size equal to its scorecard file, births and deaths by cause equal to the e-bench files, and the
   targets file equal to `data/targets.json` in every field shown. No sealed row is present (a test). The life reader's
   births, deaths and deaths by cause equal e-bench's viability counter on a short field run of seed 48 (a test), and
   its rates equal hand-built worlds' known answers (exposure, first-year mortality, causes, killings, the 90% cap
   rule). The population rebuilt from birth and death times equals the living count the world held, day by day (a
   test). Each number printed on the page is checked against its source by hand and listed in section 3.
2. **A whole-scene look by eye** at the moments a user opens it: the page over the forest at the dawn opening, after a
   clock jump, at 1 min/s and at 1 day/s, on the field map and the 160 m map, at 1440 × 900 and at 390 px; the overlay
   on the card at the same moments. Pictures under
   `/Volumes/Drive/chimpbench/shots/watch-2026-10-19/v1-field/`. Calm, plain words, readable, no colour that reads as
   pass or fail; what looks wrong is fixed.
3. **Main-thread cost.** With the page closed and the overlay off: main-thread script time per frame unchanged (the
   page and overlay code are not loaded). With the page open: at most one redraw a second, and the first open's
   longest task measured and reported. Measured with `scripts/perf-probe.mjs` on a quiet machine, before and after.
4. **Saves load.** Nothing is added to the World; an older save loads in the new build; `session.ui` gains at most
   short keys that older builds ignore.
5. **Drawing writes nothing.** `__MGOGO_TEST__.hash()` is equal for a world stepped N ticks with the page open,
   scrolled and a detail open (Family opened, Select not pressed) and the overlay on, and the same world stepped with
   neither.
6. **Golden and field-pin tests unmoved:** `tests/fixtures/golden-world.json` untouched and passing, the protocol hash
   equal to the freeze, the field-metric tests passing. `tsc --noEmit`, `gen-params --check`, the whole suite once and
   `pnpm build` pass (unless a model step is running).

## 1. What was built (written after the build, 19 October 2026, 02:20 EDT)

Everything below is on branch `v1-field`. Pictures, probes and measurements:
`/Volumes/Drive/chimpbench/shots/watch-2026-10-19/v1-field/` (probes in `tools/`: `lib-v1.mjs`, `look.mjs`, `year.mjs`,
`views.mjs`, `interact.mjs`, `hashcheck.mjs`, `numbers.mts`, `perf-v1.mjs`, `firstopen.mjs`, `firsttrace.mjs`,
`hashdiv.mts`, `white.mjs`).

**1a. The yardsticks.**
- `scripts/field-bundle.ts` writes `public/field/targets-lite.json` (138 targets; the 12 sealed rows are left out by the
  scorer's own `sealed` marks, only their count is kept) and `public/field/reference.json` (five arms: today's model
  Y3-T0, the working base Y3-W50, and Y3-W50-wean, -gut75, -gut875). About 100 KB gzipped in all, fetched on the
  page's first open. `--check` rebuilds both and compares every field and value with `data/targets.json`, each arm's
  scorecard and e-bench files (pooled values, per-world values, intervals, sample sizes, verdict words, notes, births,
  deaths by cause per world, patrol counts, the patrol detector's check), the files on disk byte for byte, and looks for
  sealed ids, host names and paths. It passes.
- The match line of today's model is worked out once by the script: since the Y3-T0 run (6 October, ff259534) no
  existing default changed, 23 settings were added (14 switches that default to off, 9 values read under switches) and
  the golden test world is byte-identical. The page says "Probably the same model as this world, not re-verified by a
  run" and gives the full sentence in each row's detail.
- `src/yardstick/`: `band-distance.ts` (moved from `scripts/lib/`, which re-exports it unchanged), `field.ts` (re-exports
  `poissonInterval`, `mean`, `median` and `necropsy` from `src/field`, one direction only), `words.ts` (distance words,
  the overview axis, wide bands, number precision), `sections.ts` (chapter of each target), `same.ts` (the reviewed
  same-definition list: T-DEM-1, -4, -8, -10 and T-LET-1, each with its reason), `life.ts` (1b), `view.ts` (what each
  row shows), `bundle.ts` (the files' shapes). `src/simulation.ts` gains one pure reader, `modelIdentityOf(world)`.
- The minimum windows: the 29 rows of e-bench's `NEEDS_YEAR` need a year; 9 rows need decades (life tables, birth
  intervals, range variability, bond persistence, alpha tenure, long-term recognition); T-IGE-4 and T-COM-11 need field
  experiments; 7 scenario rows are never scored in a watched world; the other 91 need at least 10 days of follows (one
  rotation of the field teams; design assumption).
- `src/ui/yardstick.ts` (the row), `src/ui/wild-page.ts` and `wild.css` (the page, a lazy chunk with its stylesheet),
  `src/ui/life-charts.ts`. Ways in: key K, a ruler button in the menu bar, and the menu bar's "born · died", which opens
  Births. Esc or K closes it.

**1b. This world's exact life record** (`src/yardstick/life.ts`), read from `world.chimps` only: births with mother and
her exact age, deaths with time, exact age, community, cause and place, every infant's fate, the life table in the
scorer's bins, and the living population each evening rebuilt from birth and death times. Rates by the scorer's own
definitions and floors: first-year mortality, causes, respiratory deaths per 1,000 chimp-years, births per female-year at
20 to 30 with the 90%-of-cap rule, killings per community-year. Shown in Births (population chart, births list),
Deaths (bar by cause, bars by age, the death record with Family, Where and Select, the reference runs' failed
viability per world), Mortality (deaths per animal-year by age and sex), Infants (one lane per infant), Encounters and
Movement (counts in words only), each under "This world · exact record (all-seeing), days 1 to N".

**1c. Records on the range-map card** (`src/ui/records-card.ts`, `records-card.css`, a lazy chunk; a hook in
`minimap.ts`): each community's exact 95% cell outline and soft 50% core from `Troop.range`, and a glyph where each animal
died (dot for illness, ringed for a respiratory outbreak; cross for wounds and killings; triangle for starvation;
square for other causes; smaller under 5 years), with a key and hover cards (an animal's name, age, community, day and
cause; a range's area and core). Off by default; one button in the card's layer bar; saved as an interface key. While it
is on, the card draws no range circles.

## 2. How the attacker's strikes and changes are met

1. `src/field` untouched: `git diff 54f385ac -- src/sim src/field tests/fixtures` is empty; a test holds the protocol
   hash at 215ed6ab282a57de.
2. Field rows are shown as text, with their sources and DOI links; no site ticks.
3. The 44 px rows carry the band, one ring and one square at most, and two lines of words; per-world values are in the
   detail only.
4. "At a glance" shows one lane: the reference runs until this world has values on at least three rows (design
   assumption: one or two squares alone leave the overview nearly empty), or the lane the user picks.
5. Every mark is named: the reading guide, the overview's sub-line, and a ring or square glyph in front of each line.
6. A value with no interval is a hollow square with "no interval for one world".
7. Every row has its minimum window, and says "needs a year · 38 days so far", "not enough yet: 2.4 of 3 infant-years",
   "needs decades of natural aging" and the like instead of a number.
8. Rows scored in parts (T-DEM-2, -4, -6, T-ACT-1 to -3) get one line and one mark per part.
9. One-sided bands: "60% below the field's lower limit"; zero-width or zero-edge bands: "in raw units"; "1 band width".
10. Life-history reference values carry "Reference pooled from the 5 worlds together: 1 of 5 give a value on their own;
    pooled, not a life expectancy" on the row itself.
11. Deaths shows the reference runs' failed viability (5 starvation deaths; a world ending at 76% of its start) and
    deaths by cause per world; Births (the population) gives each world's start and end and points to it.
12. T-IGE-4 and T-COM-11: "needs field experiments; not run in a watched world".
13. The rows written for a community size (T-RNG-1, T-PTY-1, T-PAT-1, T-HUN-1, T-FIS-1) show this world's communities
    (members and adult males) on the row, and say when one is far from the size the band is written for.
14. The Gombe path figure is not bundled (a test).
15. A short reading guide on first open ("Got it" remembers it in this browser; "How to read this" brings it back).
16. Bands whose ends differ by a factor of 3 or more carry a "wide band" chip and words in the detail.
Also: blue is the field's alone on the page (illness is lilac, wounds a muted rust); the orphaned-infant cause is folded
into "other causes" in every aggregate and list on the page, with a note why; the same-definition list is reviewed and
tested; with stage ED's bodies on, "Where" says it is where the body ended up; no host names or paths in the bundles
(checked); "needs decades" gives a rough time at 1 day/s; rows read from simulation truth say "reference values only".

## 3. Every number equal to its source

- `field-bundle --check`: 138 targets, 5 arms, 690 reference rows; every value equal to the scorecard and e-bench
  files; the files equal the rebuild.
- `tools/numbers.mts` (output in `numbers-check.txt`): a seed-11 field world run 361 days in the page, every number
  the page prints read from the DOM, and checked against the frozen Y3-T0 scorecard and e-bench file read directly (not
  through the bundle) and against the same world rebuilt in Node: 131 checks, 0 wrong. 96 reference values and
  intervals on the rows; every death (name, day, sex, exact age, cause; ages agree with the animals' own final ages to
  0.01 years); the deaths by cause in the bar; every birth (day, mother, her age); the meetings between communities and
  killings against the world's counters; first-year deaths and infant-years; each community's range area against its
  cells and members against the living; the reference viability per world; the patrols caught (110 of 755, 15%) and
  the detector's check (found 66%, 97% of its finds real); "86 of 130" against data/targets.json.
- Tests: the life reader's births, deaths and deaths by cause equal e-bench's viability counter on a 30-day field run of
  seed 48 (which holds no birth or death on this seed) and on a 160 m world at life-course speed (many of both); the
  population rebuilt from birth and death times equals what the world held at each day's 21:00 census; hand-built
  worlds hold exposure, first-year mortality and its interval, causes, respiratory deaths, killings and the 90% cap
  rule; every cause string the simulation writes has a class (the test reads `src/sim` for `killChimp` causes).
- Found on the way, not from this stage: a browser world and the same world stepped in Node part after the very first
  tick in the unchanged build too (the same two hashes: `tools/hashdiv.mts`), so the check above is event by event.

## 4. Cost (measured with the machine quiet, no model process; `tools/perf-v1.mjs`, field map, seed 48, 1440 × 900)

- Page closed, Records off, against the unchanged build (a `git archive` of 54f385ac), alternated twice more after a
  first pair: the interface's time per frame 0.056 to 0.063 ms (unchanged build) against 0.060 to 0.067 ms (this build)
  at 1 min/s, 0.089 to 0.097 against 0.090 to 0.096 ms at 1 day/s (one run of this build read 0.129 while the load rose
  to 6.7; the rerun read 0.090 and 0.094). Main-thread frame p50 2.4 to 2.5 against 2.3 to 2.5 ms at 1 min/s, 6.2 to
  6.8 against 6.2 to 6.4 ms at 1 day/s. No difference beyond the noise; within ±0.05 ms.
- Page open: the interface's time per frame falls (0.024 to 0.027 ms at 1 min/s, 0.075 to 0.083 at 1 day/s), because
  the panels it covers stop refreshing. It redraws only when a birth, a death, the day or a patrol changes, at most once
  a second: at 1 min/s nothing in 8 s; at 1 day/s 236 mutation records and one node added or removed in 10 s.
- First open: no long task (the chapters fill one per frame after the overview); 0.4 s from K to the overview on the
  dev server, fetching and reading the two files included. The first key press of a session starts the sound engine
  (about 130 ms, traced in `trace-first-open.json.gz`); that is the app's, not the page's.
- Records on: no change at 1 min/s; about +0.025 ms per frame at 1 day/s (a range changes once a simulated day).
- Startup files (production build): +6.7 KB raw and +4.3 KB gzipped of JavaScript, +83 bytes of CSS. About 3.5 KB of
  it is the new code that must load at startup (the K key, the two buttons, the card's hook, `modelIdentityOf`); the
  rest is the bundler splitting the startup code into three files once a lazy chunk shares modules with it. Over the
  design's 2 KB budget; nothing of the page, its stylesheet or the bundles loads before first use.

## 5. Looked at by eye

Pictures at 1440 × 900 and 390 px, on the field map and the 160 m map, at the dawn opening, after clock jumps of 40,
120, 300, 365 and 400 days, and while the clock runs at 1 min/s and 1 day/s. Fixed after looking: rows cut their words
(shorter lines; long names wrap to two lines; the long words moved to the detail); tuned and community-size sentences
were hidden in the detail (now on the row); the overview's counts were cut off and spoke of "0 of 0"; a section opened
from the index scrolled its title out of view; "0 hours so far"; "1 band widths"; pattern rows printed the scorer's raw
notes; part names in camel case; the overview was unreadable on a phone (a narrow version now); the provenance filled a
phone's screen (folds to three lines); range areas on the 160 m map read "0.0039 km²" (square metres there); births
ticks sat under the axis the caption put them above; the death record's buttons were loud (quiet until hovered); the
infant caption explained lanes when there were none. What it looks like now: a calm dark sheet over the forest, one
serif title per chapter, quiet grey rings and pale blue bands, two short lines of plain words per row, no colour that
reads as pass or fail; at 1 day/s only the day count and the provenance change.

Seen and left alone (not this stage's): after a long jump of the test hook with the clock paused at dawn, the forest is
drawn white (snow-like) in the close and strategy views; the unchanged build draws the same (`white-base.png`).

## 6. Saves and drawing

- Saves: nothing is added to the World; `STATE_SHAPE` (47c93f94) and `STATE_VERSION` (1) are the unchanged build's, so
  every older save loads and a save of this build loads in the build before. `session.ui` gains `records` (a boolean)
  and `wild` ({ lane, arm }); older builds ignore unknown keys. The browser save, reload and exact resume of
  `verify-browser --no-model` was not run: the probe server cannot serve SQLite's WASM through the shared
  `node_modules` link (the probe configuration's limit), and the machine rules allow no other server.
- Drawing writes nothing: two pages of one seed-11 world, one with the page open (a row's detail and a Family line open,
  scrolled, Select never pressed) and Records on, one with neither, stepped together: equal hashes at days 121, 241 and
  361 (`tools/hashcheck.mjs`). "Where" changes the camera and the overlay only (hash unchanged); "Select" changes the
  selection, as it says.

## 7. Tests and checks

`tsc --noEmit` passes; the new script and tests pass a strict check by hand; `gen-params --check` passes; the whole
suite once, four files at a time (02:08 to 02:13 EDT): 1,624 tests, 1,623 pass, 0 fail, 1 skipped (the guide-data test
without its C7a fixture; with the fixture linked it passes, 11 of 11); `pnpm build` passes. New:
`tests/yardstick.test.ts` (16) and `tests/yardstick-life.test.ts` (8). The golden world and the field-metric tests are
untouched and pass.

## 8. Not done

- The browser save, reload and exact resume (see section 6); the graphics-card probe (nothing is drawn in 3D, but it was
  not measured); a look with a model running (none may run now).
- This world's values for the decades rows (life expectancy at 15, survival to 45, first births, birth intervals): the
  page says "needs decades" and computes nothing for them.
- The startup budget of 2 KB (section 4).
- Phase 1 items the attacker moved out or the task did not ask for: the strip under the card, Catch the next one, Run
  until it has a number, the who-decided ledger, the experiment log, the arm's energy file (kcal by class), animal dots.

## For the integrator

Proposed lines (not written into those files by this stage):

- **HANDOFF.md** §2.0: "Stage V1, phase 1 (written 19 October, 02:20 EDT): the page "How close to the wild" (key K, the
  ruler button, or the menu bar's born · died): every yardstick that is not sealed, its field band and studies as text
  beside the reference runs of today's model and four working-base arms, with every caveat; this world's exact births,
  deaths, infants and population; and Records on the range-map card (true range outlines, where animals died). No tick
  hook, nothing under src/sim or src/field. Branch `v1-field`, `docs/staging/v1-field.md`; not merged."
- **AGENTS.md**, Commands: "`pnpm exec tsx scripts/field-bundle.ts [--check]`   # stage V1: public/field/targets-lite.json and reference.json from data/targets.json and the frozen reference checkouts (bench-y3, bench-wean, bench-e1x3), read-only; --check holds every value equal to its source"
- **AGENTS.md**, Gotchas: "The page "How close to the wild" (stage V1, `src/ui/wild-page.ts`, `src/yardstick/`) and the
  card's Records (`src/ui/records-card.ts`) load on first use; nothing runs while they are closed. `src/yardstick`
  imports from `src/field` and never the reverse; band distance lives in `src/yardstick/band-distance.ts`
  (`scripts/lib/band-distance.ts` re-exports it). A row gets this world's value on its band only if it is on the
  reviewed list `src/yardstick/same.ts` with a reader in `life.ts` and a test. A new cause of death needs a class in
  `life.ts` `causeClass` (`tests/yardstick-life.test.ts` reads `src/sim` for them). Regenerate the bundles with
  `scripts/field-bundle.ts` after a change to `data/targets.json`, or `--check` and the tests fail."
- **IMPLEMENTATION_PLAN.md**: "Stage V1 (How close to the wild), phase 1: built (`v1-field`). Next, with the user's word:
  phase 2 (the notebook and the map themes); phase 3 (live field teams) needs its drain redesigned and measured first;
  a fresh reference run of today's model under today's protocol (about 6 hours at 5 workers) would remove "older
  protocol" and the recounts."
- **Decisions that are the user's** (from the design, still open): whether the field teams should run from the moment a
  simulation opens; whether held-out rows are visible by default; whether Records' true range outline should replace the
  circles everywhere; a fresh reference run (and before or after stage R16); other models' arms shown by default or on
  request.

## 9. Honesty and science review (19 October 2026, written 02:50 EDT)

A second reader went through every row the eight chapters show, from the code and the files, not from the pictures
(the look agent had the headless browser, so none was opened). Nothing was run on a reserved or sealed seed: two short
worlds of seed 48 in Node (the 160 m map for 200 days at natural aging, and for 8 days at life-course speed).

### 9.1 What holds

- **Bands, units and basis** are `data/targets.json`'s own, row by row (`field-bundle --check`, and read again for the
  eight chapters). The units and the basis are in each row's detail and its spoken label; the 44 px row prints only the
  band's edges (see 9.3).
- **Reference values** are the frozen scorecards' own numbers. Read again with a separate script straight from the
  frozen files (not through the bundle's own check): all 690 rows of the 5 arms agree in pooled value, per-world values,
  interval, n, parts, verdict, note, flags and simulation-truth value. Each arm is named in words with its run date.
- **Labels**: fitted and held out, tuned, compromised, revised after the freeze, encoded and partly encoded appear
  wherever the target file sets them. Compromised, not-scorable and contested rows get a cross and "reported, never
  counted", never a mark. Rows that need field experiments, scenario rows and rows read from the simulation say so.
- **Sealed rows**: none is in either file, none is computed, and no chart or count is split by a mother's loss, rank,
  neighbour pressure or aggression received; the orphaned-infant cause is folded into "other causes" everywhere on the page.
- **The reference model's failed viability** is in Deaths (5 starvation deaths, a world ending at 76% of its start,
  causes per world) and in Births beside the population.
- **This world's life record** matches the world at natural aging. On the 200-day world: the living count rebuilt from
  birth and death times equals what the world held at every day's 21:00; births, deaths and infant fates equal the world's
  animals; ages at death agree with each animal's own age to 0.0001 years and mothers' ages exactly; infant-years and
  animal-years equal a brute-force sum hour by hour. Rates use the scorer's formulas, floors and the 90%-of-cap rule.

### 9.2 What was wrong, and is repaired (six commits after 66bcab05)

1. **"Inside the field band" where the scorer said "inconclusive".** The page judged a reference value only by the
   interval the scorecard stores, but the scorer also checks the 95% interval over the five worlds, which the scorecard
   does not store. Today's model read "inside" on T-PAT-6 and T-PAT-9 (Patrols), T-HUN-3, T-HUN-7 and T-SOC-11, and gave
   distances the scorer did not establish on T-BRD-1, T-FOOD-3 and T-DEM-8 ("1.4 band widths above"). Across the five
   arms 87 reference rows changed their words, 34 of them from "inside". They now read "too close to call".
2. **Marks on rows the scorer did not score.** T-RNG-2, -3 and -6 (Movement) are reported but not scored on the field
   map (one 500 m cell moves the value); the page placed a ring and said T-RNG-6, held out, was inside. They now carry no
   mark and say why. T-HUN-5, which the scorer decides world by world (an r² with a positive slope), was placed inside
   its band in two working-base arms where no world showed the pattern; it now gives the count of worlds.
3. **Ages at life-course speed.** With the clock's life-course speed on (a control the interface offers), ages were
   counted on the ecological clock: on the 8-day world ages at death were off by up to 6.3 years and mothers' ages by up
   to 7.6. The page now shows each animal's own age there, leaves out mothers' ages and the life table, and says why.
   Killings per community-year are refused at that speed like the other life-record rows.
4. **A rate before its window.** The Infants chapter printed first-year mortality from a few weeks while its row said
   "needs a year"; the chapter now gives the deaths and infant-years and holds the rate for a year.
5. **Labels.** Life expectancy at 15 and survival to 45 both read "pooled, not a life expectancy", with the deaths they
   rest on and, for today's model, that 28 of its 59 deaths were two worlds' respiratory outbreaks; other pooled values
   carry their n (T-DEM-13 is "inside" on 4 intervals). T-INF-6, held out, was written with simulated values in view and
   now says so. T-PAT-3 and T-PTY-1 show this world's community sizes. Sources a target cites that no field row names
   are listed (T-RNG-5's revised band among them). Each arm's protocol is named in the detail and the overview. The
   reading guide says a ring is five worlds of one model and what "too close to call" means. Death places say where the
   body lies when bodies move. The zero-killings limit uses the scorer's own Poisson interval.

6. **The match line** of today's model now says that the golden test world is a short run of the 160 m map, not the
   field map.

Tests: `tests/yardstick.test.ts` 19 and `tests/yardstick-life.test.ts` 9 (four new tests, among them one that no
single-band reference value reads "inside" unless the scorer said pass). `field-bundle --check` passes after the
rebuild. `tsc --noEmit`, a strict check of the two test files and the bundle script by hand, and `pnpm build` pass; the
whole suite once, four files at a time, on Node 22.22.3 with no model process (02:43 to 02:48 EDT): 1,628 tests, all
pass. The startup file grew 70 bytes more (the records card reads `modelIdentityOf`).

### 9.3 Left as it is (for the integrator or the user)

- The 44 px row prints the band's edges without units; the units and basis are one click away. A unit under the strip
  would need a look by eye first.
- "Older protocol" is in the header, the overview line and each detail, not on each row's line.
- `reference.json` (public) carries e-bench's causes of death per world as written, orphaned infants and simulated
  animals' names included. The page folds them; the file is never shown unfolded. Folding in the bundle would change
  what `--check` compares.
- "Probably the same model as this world" rests on unchanged parameter defaults and the unchanged golden world, which is
  a short run of the 160 m map (the detail now says so). Simulation code changed since that run (21 commits, behind
  switches that default to off), so the field map's own behaviour is not proven the same. The page says "not
  re-verified by a run"; a fresh reference run would settle it.
- The Mortality chapter's chart of deaths per animal-year and the Encounters chapter's zero-killings limit are drawn from
  whatever window there is, with their exposure; neither is placed on a band.
- Not looked at in a browser after these repairs: a T-RNG-6 row (no mark), a T-PAT-6 row ("too close to call"), and the
  Deaths, Mortality and Infants chapters at life-course speed want one look.

Proposed change to the AGENTS.md line above, after "and a test.": "A reference row is placed on its band only where
the scorer scored it: an inconclusive verdict reads "too close to call", a 'scale' row and a row pooled world by world
get words, not a mark (`src/yardstick/view.ts` `refState`)."

## 10. The whole-scene look by eye (19 October 2026, written 03:20 EDT)

A third reader used the app as a person does, on a no-model probe server (port 5251, stopped when done) with one
headless browser: a new world on the field map at its defaults, the page opened with K, the ruler and "born · died",
read top to bottom at 1440 × 900 and at 1280 × 800 (and once at 390 px), the eight chapters, a few rows' details,
Family and Where, the lane and arm switches, Records on and off at two card zooms and at 1 min/s and 1 day/s, a save
and a reload, a year of seed 11 (a reference world, not reserved) with the clock run at 1 day/s and the page open, and
life-course speed set through Settings. No model process ran; nothing was run on a reserved or sealed seed. Pictures
and probes: `/Volumes/Drive/chimpbench/shots/watch-2026-10-19/v1-field/eye/`.

### 10.1 What a person sees

A calm dark sheet over the forest: a serif title, the one-world sentence, a dense provenance paragraph, a reading
guide, then "At a glance" (grey rings on a pale blue column) and one chapter after another. Rows are quiet: a pale blue
band, a grey ring, two lines of words, small chips; no colour says pass or fail. The life record reads well once a
world has one: the births list with mothers, the death record with quiet Family, Where and Select buttons, the reference
runs' failed viability world by world. Records on the card draws stepped range outlines, a soft core and small death
glyphs with a key and hover cards; off, the circles come back. Saving works and a reload resumes the same world (equal
hashes) with Records still on. The page is readable and honest; it is long (about 13,000 px) and much of it says, row
after row, "field teams not running in this build", which is true and monotone.

### 10.2 What was wrong by eye, and is repaired (nine commits after the review's)

1. **Words cut off.** At 1280 px sixteen rows lost the ends of their lines ("shown, not sco", "not run in a watched w")
   and chips ("revised after the freez"); at 1440 px several did. Lines and chips now wrap; none is cut at either size.
2. **Files of this repository in what a person reads**: "(scripts/e-bench.ts NEEDS_YEAR)" in every row's window,
   "(data/targets.json protocolLog)" in 89 flag reasons, "covered by tests/sim-relations.test.ts" on a row's own line,
   "(docs/simulation.md §18)", source keys such as "wilson2012", a list of parameter names, a commit. They are gone or
   in words (sources by authors and year; the commit on the run date's hover). A test renders every row and detail of
   every arm and finds none.
3. **Band edges as stored** ("6.1905", "11.4069" on Patrols after a fission): three significant digits on the strips.
4. **The header said a model decided** ("untuned model on a rules menu decides for 1 animal") on a server with no model,
   where the rules decide: it now says "the model is not loaded". "Earlier hours are not recorded" now says what is not.
5. **"No killing in 0.00014 community-years"** on the first morning, and **"0 deaths in 0.0 infant-years so far: only 0.0
   infant-years"**: both now read plainly ("no killing yet (less than a day across 3 communities; …)").
6. **A bare dot at 1.6 deaths a year** in the life table, from one death in 0.6 animal-years: each rate now has its
   Poisson interval as a line (one or two deaths give one across three decades), with the count in its hover.
7. **"Where" showed a canopy and said "died here"** with nothing marking the place: the card now rings and names the
   place ("Dalubi died here") for 20 seconds and the note says so. The card's key now names the outbreak ring.
8. **The first K did nothing for 1.5 to 5.5 seconds** on a fresh dev server (the page's code is fetched on first use):
   "Opening How close to the wild…" now shows at once.
9. **The probe server could not save** (SQLite's WASM refused through the shared node_modules link): fixed in
   `scripts/vite.probe.config.mjs` as `vite.config.ts` does, so the save, reload and resume check could be done.

Tests: `tests/yardstick-look.test.ts` (4). `tsc --noEmit` passes; the page's, the interface's and the save-shape tests
pass (87 of 87). The whole suite was not run again (the review ran it after its commits; these commits touch only the
interface, `src/yardstick/words.ts`, `view.ts`'s words and the probe configuration).

### 10.3 Measured

- **Drawing writes nothing.** Two pages of seed 11, model policy off from the first frame: in one the clock ran (6 h/s,
  then 1 day/s) with the page open, a detail and a Family line open, the page scrolled and Records on; the other was
  stepped by the test hook with nothing drawn. Equal hashes after 29,040 ticks (5 days) and, from day 301, after
  141,064 ticks (24.5 days, a birth during it).
- **Main-thread cost** (field map, seed 48, 1440 × 900, alternated with the unchanged build, load 2 to 4, no model):
  page closed, script per frame 2.78 to 2.81 ms against 2.70 to 2.75 at 1 min/s and 8.24 to 8.74 against 8.30 to 8.42 at
  1 day/s; the interface's share 0.055 to 0.063 against 0.057 to 0.060 ms. Page open: the interface's share falls to
  0.022 ms; the whole frame moved by −0.03 to +0.35 ms between runs, all of it in the forest and render steps, which
  change with what the close camera sees. Records on: no change. No long task in any run.
- **Startup files** (production build): +5.4 KB raw / +3.2 KB gzipped of JavaScript and +0.2 KB of CSS against the
  unchanged build (the builder's head: +6.7 / +4.3). Still over the design's 2 KB.
- **First open**: 1.4 to 5.5 s on a freshly started dev server, 0.03 to 0.15 s after; not measured on a production build.

### 10.4 Seen and left (for the integrator or a later stage)

- A ring drawn well outside its band reads "too close to call" (Advance after border stops) because the scorer's
  interval over the five worlds is not in the scorecard: a person sees a ring outside the band and words that say
  otherwise. Drawing the five worlds' spread, labelled, would explain it.
- At 1 day/s the card's call arcs (yellow circles, stage W10) cover the Records outlines and death glyphs; the card is
  busy. Hiding the arcs while Records is on would calm it. The key takes three short lines over the north of the map
  (it fades under the pointer).
- The infant lanes run on a 0 to 5 year axis, so a young world's lanes crowd into the left fifth; the deaths bar is a
  full-width pastel slab when one cause dominates.
- After a click in the page's index, a key press draws a heavy focus ring there, and Space presses that button instead
  of pausing (the app's rule for buttons). The page covers the clock; the clock's keys still work.
- With the model policy on and no model loaded, the selected animal's choices are settled once per frame, so the same
  seed run twice at 1 day/s is not the same world (seed 11: 4 deaths by day 338 in one run, 2 by day 341 in the next).
  The page's record is exact for the world on screen; a rerun matches only with the policy off. Not this stage's.
- At life-course speed the Infants line still counts infant-years on the ecological clock ("14 deaths in 1.0
  infant-years") under the note that demography is not compared.
- Flag reasons keep research shorthand (stage names, parameter names) and the protocol hash in the detail.
- Not looked at: with a model running; on a production build; on the graphics card.

Proposed line for the integrator, AGENTS.md, Gotchas: "`scripts/vite.probe.config.mjs` allows SQLite's WASM through the
shared node_modules link (as `vite.config.ts`), so a probe server can save and reopen simulations."
