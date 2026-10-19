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
