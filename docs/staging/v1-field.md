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
