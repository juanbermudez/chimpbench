# Stages M1–M3: the decision model on Track E's state (pre-registration)

Agent eM-model, branch `eM-model` from `track-e` 453e9d0. User, verbatim (5 October 2026): "but this is where we
supposed to use the deiscion model so the chimp bahaved abed on its perception and state ec" and "use gliner or jecv
interchangable but do it for gliner as the base". Each stage below is registered and committed before its runs; at most
three iterations per stage, each logged here before it runs.

**Where the model stands (read before M1).** The observation (`src/sim/observe.ts`, a `DecisionContext`) shows the
need gauges (hunger, thirst, energy, social, stress, health, injury) and the clock hour; `server/decide.ts` renders it
for GLiNER (`buildLocalQuestion`: a prose state, the hour as "HH:MM", one option text per legal option) and for Jev
(`buildJevQuestion`: grouped JSON). Under Track E those gauges are readouts of the new state (hunger = the energy-deficit
drive × gut satiation, thirst = the water deficit, energy = 1 − felt sleepiness), but the state itself, the valuations
the rules choose by (net energy rate of every feeding option, the believed crop of a crown out of sight, company value)
and the light are not shown. GLiNER2.5-Decide is served untuned (`fastino/GLiNER2.5-Decide` 7ee5da4c, the resident
worker); three LoRA adapters were fine-tuned on the old format (`artifacts/decide-ft/round3`, docs/decide-finetune.md
§11; field and compressed contexts, v3 inputs).

## M1. Observation (registered 5 October 2026, before any change or run)

**Switch.** `observeState` (registry, group decision, units switch, 0–1, default 0 in both profiles, design). Read only by
`observe()`. 0 = today: the same world (nothing in the simulation reads it) and the same observation, key for key. 1 =
the observation gains three optional parts (documented optional fields of `src/types.ts`; no field is repurposed):

1. `body` (the focal animal's own state, interoception). Each field is present only when the mechanism that keeps the
   state runs (its switch is on and the animal's books are open), so nothing is invented for a world without it:
   - `reserves`: body reserves relative to the usual store, ledger reserves ÷ usable store (energy.ts `reserveCap`):
     −1 the store is gone (starvation), 0 the set point, + a surplus. `energyLedger`.
   - `deficit`: the energy-deficit drive (energy.ts `deficitDrive`): the energy still needed before the next chance to
     feed (reserve deficit, less what the gut will yield, plus what the waking day and the night will cost) as a share of
     what the animal can eat in the waking time left, 0..1. `needKcal`: that need in kcal (`energyNeed`). `awakeH`: the
     waking hours left as sleep pressure implies them (`feedHorizon`: E1e's horizon, read from sleep pressure, never from
     the hour). `ledgerDrive`.
   - `gutFill`: foregut fill 0..1 (dry matter against capacity with `ledgerDigesta`, energy against capacity without).
   - `sleepPressure` (process S, `chimp.sim.slp`) and `sleepiness` (felt: E2d's gate position under `rhythmCircadian`,
     S × darkness under E2a). `rhythmSleep`.
   - `clock`: the circadian oscillator's level (`chimp.sim.cx`, the core-temperature-like variable, high = alert) and
     whether it rises (`cxc` > 0). `rhythmCircadian`. It is the animal's internal phase, entrained by the light at its
     eyes, not the hour.
   - `waterDeficitPct`: body water deficit as a share of body mass, % (water.ts). `waterLedger`.
   - `heat`: thermal load −1..1, + stored heat, − heat debt (rhythm.ts). `rhythmHeat`.
   - `arousal` (competitive, adult males), `affiliation`, `acute` (the fast catecholamine-like state, decayed to now:
     endocrine.ts `fastNow`). `endoStates`, `endoFast`. The stress load is the existing `focal.stress`.
2. `light`: the light the animal sees and its trend: `level` = `environment.daylight` (0 dark … 1 full daylight) and
   `trend` = its change over the last tick per hour (departure.ts `brightening`, what E2b's animals perceive). The
   context keeps `environment.hour` for the inspector (src/ui/mind.ts reads it), but a packet built from a context that
   carries `light` never renders the clock: the state line shows the light words and the phase, and option texts lose
   their "(HH:MM)" clauses (the nest reasons carry one).
3. `value` on each option (`Candidate.value`, optional): what Track E's valuation gives the option, as the animal can
   know it, computed with the functions the rules' valuation calls (candidates.ts `treeFoodWorth`, `companyValue`,
   `presentCompany`; intake.ts `fruitRate`, `leafWorth`; fallback.ts `bestFallbackNear`), never by a second formula:
   - feeding in a crown in view and a trip to a crown: `kcalH`, the net energy rate the option promises (kcal per hour,
     the walk and the climb included: E3c's net-rate share × the animal's own full ripe-fruit rate); `cropKcal`, the ripe
     fruit in the crown at the crop the valuation uses (seen now in view; for a crown out of sight, the belief the trip was
     valued at, `candidateMeta.bel`: its own sighting, or the community's expectation for a listed crown it has not seen,
     C7a's design); `seenH`, hours since it last saw the crown (0 in view, −1 never seen itself); `feeders` it counts there;
     `distM`.
   - eating leaves where it stands: `kcalH` (the fallback's rate relative to ripe fruit × the same full rate).
   - following a companion, joining a departing companion's trip, travelling to a caller: `company`, the company the move
     adds (E5a's company value, with E5b's or E5d's margin when those switches are on), plus the crown's `kcalH`,
     `cropKcal`, `seenH` and `distM` when the move ends at a crown.
   - drinking: `distM` to the remembered water.
   Values are attached only under `forageRate` (the valuation is a rate) and only for an animal with open books; options
   without a Track E valuation carry none. Rounded: kcal/h to 10, crop to 50 kcal, hours to 0.1, metres to 1, company to
   0.01.

**Local-only and pure.** Every field reads the animal's own body, its last perception snapshot (trees and animals in
view), its memory, or a belief the rules already value it by (the believed crop of a remembered or listed crown). No
`world.rng`, no write (books that are not open give no field; `deficitDrive`, `energyNeed` and `boutRoom` open nothing
once open). Deterministic: the same world gives the same observation.

**Rendering (server/decide.ts).** A context with `light` or `body` gets the new layout; one without gets today's, byte for
byte, so the old and new observation of one decision point are the same context with and without the three parts. GLiNER
packet: the `now` line shows the light ("full daylight", "dim light, getting darker", "dark") instead of "HH:MM"; a `body`
line in plain words with the numbers ("reserves 4% below my usual store; energy shortfall 0.45 (about 1,150 kcal to find
in about 6 h awake); stomach 40% full; 1.2% short of water; warm (heat load +0.12); sleep pressure 0.55, sleepiness low;
body clock alert, falling; stress 0.13; arousal 0.05; affiliation 0.20"); each option text gains its values ("… (food,
eases hunger; about 410 kcal an hour net; 2,000 kcal of fruit seen 5 h ago)"). Memories and history are trimmed as the
old packet would be, so the new packet holds everything the old one did plus the new parts. Jev packet: `state.body` with
named fields, `situation.light` in place of `time`, and each option's values as separate fields. The instructions are
unchanged (so M2 measures the fields, not a new prompt).

**Token check (the M1 run).** Real GLiNER input tokens (the attention-mask length after `collate_fn_inference`, as
`training/decide_ft/token_audit.py` measures; hard limit 1,280) on S39 observations: S39 parameters
(`bench-run2/artifacts/validation/e/s39/S39-params.json`) + `observeState` 1, field profile, seeds 48 and 7, 30-day
burn-in, decision points of animals 8 y and over sampled over the next 3 days (≥ 500 packets per seed). Reported: median,
p95 and max of old and new packets, and the estimator's error on the new ones.
- Pass: max < 1,280. If not: iteration 2 drops the hormone words and keeps only notable body fields (deficit ≥ 0.3,
  reserves ≤ −0.05, water deficit ≥ 0.5%, |heat| ≥ 0.1, sleepiness ≥ 0.3), then re-measures.

**Tests (tests/em-observe.test.ts).** observeState 0: the compressed goldens and the field pin (tests/sim-track-e.test.ts)
unchanged; `observe()` at 0 deep-equals the observation without the switch. observeState 1: the world is hash-identical
to 0 after a run (nothing reads the switch); the observation at 1 minus `body`, `light` and every `value` deep-equals the
one at 0; pure (no rng draw, no mutation, `JSON.stringify(world)` unchanged); values only on options about targets in
view, remembered or believed; finite numbers only (JSON-safe). Server: the boundary accepts the parts and rejects
malformed ones (unknown keys, out-of-range numbers); a new-layout packet has no "HH:MM" and no ids; an old-layout packet is
byte-identical to today's for the same context.

**What M1 does not decide.** Whether the model reads the new fields, and in which direction: M2.

### M1 results (5 October 2026)

**Built** (3df70b0, 0243158, e89a139): `observeState` (registry, switch, 0 in both profiles); `src/sim/observe-state.ts`
(`bodyPercept`, `lightPercept`, `optionValue`); observe() adds `body`, `light` and option `value`s at 1; `server/decide.ts`
validates them (unknown keys and out-of-range numbers rejected) and renders them for GLiNER and Jev. The valuation's own
function was used: `treeFoodWorth` was split into the crown's drive × a new exported `treeRateShare(…, travel)` with
unchanged arithmetic (rateWorth's in-view and trip cases), checked bit-identical on S39: world hashes after 2 days, seeds 48
and 7, equal on 453e9d0 and on the branch.

**Tests** (`tests/em-observe.test.ts`, 6 pass): the switch is 0 in both profiles; the S39 world is hash-identical at 0 and 1;
at 0 no Track E part; at 1 the observation minus its parts deep-equals the one at 0 for every living animal; pure (no rng
draw, `JSON.stringify(world)` unchanged), finite, a feeding option's crown in view; the boundary accepts the parts and
rejects malformed ones; today's packets byte-identical for the context without the parts; new packets carry no "HH:MM" and
no ids, a body line and the kcal values. The compressed goldens and the field pin are untouched (nothing they run reads the
switch; full suite at the final check).

**Token check (pass).** Sample: `scripts/em-sample.ts`, 3,450 decision points (seed 48: 1,667; seed 7: 1,783; 3,076 rules
draws, 374 kept or arrived), the taps checked to leave the world unchanged (`--check`, seed 48). Real GLiNER input tokens
(`em_score.py --tokens`; `scripts/em-tokens.ts`, `artifacts/em/m1/tokens.md`):

| packets | n | median | p95 | max | over 650 | over 1,280 | estimate − real: median / largest under-estimate |
|---|---|---|---|---|---|---|---|
| old (today) | 3,450 | 404 | 550 | 613 | 0 | 0 | 6 / 36 |
| new (observeState 1) | 3,450 | 510 | 661 | 735 | 232 | 0 | 50 / 5 |

The new parts add 107 tokens at the median (p95 122, max 140); every packet stays under the 1,280 hard limit, so no
iteration 2. No memory or history line had to be trimmed for them (the new layout keeps the old packet's trimming and its
estimate stays under its budget of 1,000). Latency is not measured here (GLiNER's cost grows with tokens; ~25% more input).

**Finding for Track E (not changed here).** In 17% of the sampled decisions (12% of daylight ones) the drive's waking time
left (`feedHorizon`) is 0 and the energy-deficit drive is pinned at 1 (26% of decisions at 1), from mid-morning on for some
animals. The horizon reads sleep pressure against the pressure at which the animal last fell asleep (E1e, built on E2a's
process S alone); under `rhythmCircadian` sleep onset is gated by the circadian threshold, so last night's bedtime pressure
can lie below today's daytime pressure and the estimate collapses. The rules' hunger readout (drive × satiation) then
follows gut fill alone for those animals. The model sees the state as it is ("energy shortfall 1.00 … before I sleep").

## M2. Offline check (registered 5 October 2026, before any model scored a packet)

**Sample (made for M1's token check, the same file for M2; no model involved).** `scripts/em-sample.ts`: S39 + `observeState`
1 (the world is S39's; checked with `--check` on seed 48), field profile, seeds 48 and 7, 30-day burn-in, then 3 days. At
every rules decision of an animal aged 8 y or over the tap builds the request a model-controlled chimp would send there
(`buildRequest`: observe() and the bounded menu with the night and dusk menus) before the decision is taken, and the RG
tap records what the rules chose (`rgIndex`; −1 when RG's pick is not on the model's menu, e.g. a night act the night
menu removes) and why (a draw trigger, or `kept`/`arrived` when the gate held the act). Sampled by a hash of seed, tick
and animal (never `world.rng`): draws at 0.25, kept or arrived acts at 0.05. Decision points with fewer than two options
(no model call: rules decide) are not recorded. Each record keeps the new observation, both GLiNER packets and both Jev
packets, each option's family, class, published rules score and value without the jitter (`meta.raw`).

**Providers (one setting: `training/decide_ft/em_score.py --provider`).**
- `base`: GLiNER2.5-Decide untuned, as the app serves it (revision 7ee5da4c; fp16 on MPS through the batch path
  `common.score`, the serving collator). This is "GLiNER (the base)".
- `baseline`: the same model with the round-3 baseline LoRA adapter (`artifacts/decide-ft/round3/adapters/baseline`,
  read only from the main checkout, sha256 in the output), fine-tuned on the old observation (docs/decide-finetune.md §11).
- `jev`: Jev (jev-1.13.0, pinned by the guard) on its native packet, through `jev.py`/`spend_guard.py` with a ledger in
  `artifacts/em/`, run id `eM-model` and a cap of 5 USD for the whole stage (never raised by this agent). Dry run first
  (estimated tokens and cost); then a capped sample: 300 draw records (150 per seed, hash order) in both observations,
  and 30 situations per probe. One model worker at a time; Jev only while no GLiNER job runs.

**Agreement with the rules.** Share of decision points where the provider's argmax is RG's pick (draws and kept or
arrived acts separately, and by the rules' action family: feed, food-trip, social-move, rest, nest, drink, affiliative,
greet, aggression, mating, care, call, travel-home, other), old against new observation, paired, with a 95% bootstrap
interval (2,000 resamples) of the difference; also against the rules' argmax and the share of picks at position c0.
"Where they differ, which state explains it": for each rules → model family cell with ≥ 20 cases, the four state
variables (gauges, body fields, light, the rules pick's kcal/h) whose standardized mean difference between those cases
and the cases of the same rules family where the model agreed is largest.

**State probes (`scripts/em-probes.ts`).** Up to 100 situations per probe (daylight draws, hash order; the light probe
uses afternoon and dusk draws with a nest option), each at three levels of one state, every other part of the situation
unchanged. Three renderings per level: old (the gauge the old observation has), new-consistent (the Track E field and its
readouts), new-isolated (the Track E field alone: is it read at all?). Expected direction (the physiology):

| probe | levels | old observation shows | target options | expected |
|---|---|---|---|---|
| deficit | drive 0.05, 0.5, 0.95 (need at 430 kcal/h × waking hours left; hunger = drive × satiation from the situation's gut and reserves; situations with gut fill ≤ 0.6) | hunger | feed, food-trip | up |
| reserves | +0.02, −0.10, −0.30 of the usual store | nothing (no field) | feed, food-trip | up as reserves fall |
| sleep | pressure/sleepiness 0.15/0.05, 0.5/0.4, 0.85/0.8 | energy = 1 − sleepiness | rest, nest | up |
| light | full daylight; dim, falling (dusk); very dim, falling (dusk) | hour 15:30, 18:21, 18:36 and the phase | nest | up as light falls |
| heat | heat load −0.3, 0, +0.5 (18, 24, 31 °C) | temperature | rest | up with heat |
| water | deficit 0.3, 1.5, 2.2% of body mass (thirst 0, 0.5, 1) | thirst | drink | up |

Read: Δ = target probability at the high level − at the low level, mean over situations with a 95% bootstrap interval;
"moves the right way" when the interval lies above 0, "the wrong way" when below, "does not respond" when it includes 0;
plus the share of situations moving each way (|Δ| > 0.01) and the argmax share on the target.

**Help, ignored or confused (per GLiNER provider).** *Help*: the new observation moves at least one more probe the right
way than the old one does (new-consistent) and agreement with the rules on draws does not fall beyond its interval.
*Ignored*: every new-isolated probe "does not respond" and agreement changes by less than 3 points. *Confused*: a probe
moves the wrong way in the new observation, or agreement on draws falls by 3 points or more with an interval below 0.
Agreement with the rules is not correctness (the rules are the stack's choices, not wild chimpanzees'); it says how far
the model chooses as Track E's valuation does.

**M3 gate.** M3 runs only if, for the GLiNER provider taken to the loop, the new observation moves the deficit or the
reserves probe and the sleep or the light probe the right way (new-consistent). The provider taken: the one with more
probes moving the right way in the new observation; on a tie the served model (`base`).

**Iterations (at most three, each logged here before it runs).** 1: as registered. If a provider is confused by the new
layout (above), iteration 2 renders a compact layout (body words only for notable fields, option values only kcal/h and
company) on the same sample and probes.

**Outputs.** `artifacts/em/m2/` (gitignored): `s48.jsonl`, `s7.jsonl` (+ `.meta.json`), `probes.jsonl`, scores
`<sample>.<provider>.jsonl`, `jev.jsonl`, `probes.<provider>.jsonl`, the guard's receipts, and `report.md`/`report.json`
(`scripts/em-report.ts`: every number in the results below comes from it).

### M2 results (5 October 2026; `artifacts/em/m2/report.md`, tables below from `scripts/em-summary.ts` over its JSON)

**What ran.** The sample (3,450 points; 3,067 draws with RG's pick on the menu), the probes (565 situations × 3 levels ×
3 renderings) and three providers: `base` on everything; `baseline` (adapter sha256 06a8bb3e…, = its round-3 manifest) on
every probe and on seed 48's sample plus the first 160 records of seed 7 (its seed-7 run was stopped at 320 packets to
free the one GPU worker for M3 while the machine was swapping at load ~250; disclosed, the run can be completed); `jev`
(jev-1.13.0, every call settled) on 300 draws and 30 situations per probe. Jev: 2,220 calls, 2.87 M input tokens (median
1,140 old, 1,368 new; max 1,933), **0.12 USD** of the 5 USD cap (dry-run estimate 0.12–0.17), median latency 0.44 s.

| provider | draws | agree old | agree new | new − old, points (95% CI) | kept or arrived: old → new |
|---|---|---|---|---|---|
| base | 3067 | 25% | 28% | +3.3 (+2.2, +4.4) | 41% → 39% (n 343) |
| baseline | 1629 | 34% | 35% | +1.7 (-0.5, +3.8) | 56% → 42% (n 178) |
| jev | 300 | 29% | 35% | +6.0 (+2.3, +10.0) | – |

References: the rules' own value without its jitter and belief draw picks RG's option in 81% of draws; chance 19%.

| share of choices (draws) | rules | base old | base new | baseline old | baseline new | jev old | jev new |
|---|---|---|---|---|---|---|---|
| feed | 15% | 4% | 7% | 9% | 28% | 7% | 17% |
| food-trip | 13% | 3% | 5% | 4% | 5% | 2% | 5% |
| social-move | 10% | 2% | 6% | 6% | 10% | 2% | 2% |
| rest | 22% | 22% | 16% | 32% | 17% | 13% | 16% |
| nest | 14% | 4% | 4% | 6% | 6% | 7% | 7% |
| drink | 1% | 9% | 8% | 12% | 12% | 11% | 11% |
| affiliative | 11% | 33% | 32% | 22% | 16% | 41% | 32% |
| greet | 6% | 13% | 12% | 2% | 1% | 7% | 3% |
| aggression | 4% | 6% | 5% | 1% | 1% | 3% | 2% |

| probe: Δ target probability, high − low level (verdict) | base old | base new | base isolated | baseline old | baseline new | baseline isolated | jev old | jev new | jev isolated |
|---|---|---|---|---|---|---|---|---|---|
| deficit | 0.280 (right) | 0.179 (right) | -0.005 (wrong) | 0.554 (right) | 0.411 (right) | -0.005 (wrong) | 0.518 (right) | 0.303 (right) | 0.014 (none) |
| reserves | -0.000 (none) | -0.004 (wrong) | -0.004 (wrong) | -0.000 (none) | -0.002 (wrong) | -0.002 (wrong) | 0.001 (none) | 0.036 (right) | 0.035 (right) |
| sleep | 0.638 (right) | 0.600 (right) | 0.005 (right) | 0.694 (right) | 0.790 (right) | 0.011 (right) | 0.777 (right) | 0.754 (right) | 0.143 (right) |
| light | 0.043 (right) | 0.095 (right) | 0.007 (right) | 0.111 (right) | 0.191 (right) | 0.027 (right) | 0.280 (right) | 0.277 (right) | 0.007 (none) |
| heat | -0.000 (none) | 0.002 (none) | 0.003 (none) | 0.001 (none) | 0.001 (none) | 0.001 (none) | 0.018 (right) | 0.016 (right) | -0.009 (none) |
| water | 0.699 (right) | 0.558 (right) | 0.001 (right) | 0.979 (right) | 0.976 (right) | 0.001 (right) | 0.839 (right) | 0.793 (right) | 0.037 (right) |

Right-way probes, old / new (consistent): base 4 / 4; baseline 4 / 4; jev 5 / 6. Wrong-way in the new observation: base 1; baseline 1; jev 0; isolated fields with any significant response: base 5; baseline 5; jev 3.
Which food (exploratory): base peaks on the higher-rate food option in 49% old and 73% new (the rules, choosing food, in 68%).
Which food (exploratory): baseline peaks on the higher-rate food option in 70% old and 85% new (the rules, choosing food, in 65%).
Which food (exploratory): jev peaks on the higher-rate food option in 50% old and 62% new (the rules, choosing food, in 78%).

(The rules column is the full sample's; the adapter's and Jev's subsamples differ from it by one or two points.)

**Reading by the registered rule.** Both GLiNER providers move deficit, sleep, light and water the right way in the new
observation, as in the old (4 / 4), and the reserves probe the wrong way by 0.2–0.4 points of probability with intervals
just below 0. So by the letter both are *confused* (one wrong-way probe), neither is *help* (no probe gained) nor *ignored*
(agreement moved 3.3 points for `base`; tiny but nonzero isolated responses). Jev is *help*: one more probe right
(reserves, +3.5 points, the same when isolated), agreement +6.0 points (CI +2.3, +10.0), no wrong-way probe.

**What the numbers say (practical reading).**
- **GLiNER reads words, not Track E's numbers.** Moving a body number alone (isolated: reserves, deficit, sleep pressure,
  water, heat) changes its target probability by −0.5 to +1.1 points; the light words alone by up to +2.7. The same state moved
  together with its gauge word ("strong hunger", "strong fatigue — needs rest now", "severe thirst") or its light words
  moves it 18–98 points. The deficit's numbers dilute the hunger word (base +0.28 old, +0.18 new); the light words help
  (+0.04 → +0.10 base, +0.11 → +0.19 adapter).
- **The option values are read, as text beside the other options.** With "about 430 kcal an hour net" on the options,
  GLiNER's food probability peaks on the higher-rate food option 73% (base; 49% before) and 85% (adapter; 70%) of the
  time, about as often as the rules take the better option when they eat (65–68%). The adapter also eats far more (feed 9% → 28% of
  choices, rules 15%; rest 32% → 17%) and agrees less with the rules' kept acts (56% → 42%).
- **Where GLiNER differs from the rules** (base, new observation; report cells): rest → groom (285 draws; it grooms
  when fatigue is below the 0.4 at which the packet names it), nest → drink (182; thirsty animals awake in the nest at dawn
  that the rules hold in the dark), feed → groom (164; hunger below the word's threshold, fuller gut), feed or trip → rest
  (sleepier). Its choices over-weight grooming (32% against 11%), greeting and drinking, and under-weight eating (7% against
  15%), trips to food (5% against 13%) and nesting (4% against 14%). Agreement with RG's pick: 28% (chance 19%; the rules'
  own value 81%).
- **Jev reads the numbers.** Its isolated responses are real for sleep pressure (+14 points), water (+3.7) and reserves
  (+3.5), and the new observation lifts its eating toward the rules' (7% → 17%).

**M3 gate.** Passes for `base` (deficit and sleep move the right way); provider `base` by the tie rule (recorded above
before the G arms ran).

## M3. In the loop (registered 5 October 2026 while M2's GLiNER scoring runs, before any M3 run)

**Gate and provider (both fixed by M2's registered rules).** The G arms run only if M2's gate passes; their provider is the GLiNER provider M2's rule selects (more probes the right way in the new observation; on a tie `base`). The R and A arms need neither and may run while M2 scores.

**Worlds.** S39 + `observeState` 1, field profile, seeds 48 and 7, a 30-day rules burn-in, then a 5-day window on exact
copies of the burned-in world (`structuredClone`; World is JSON-lossless). `scripts/em-loop.ts`.

**Focal set (chosen by rule from the burned-in world, the same animals in every arm).** In the community with the most
adults: its alpha male, the median-ranked other adult male, the first lactating female (by id), the first adult female not
lactating, the first adolescent (12–15 y).

**Arms (same copies; everyone outside the focal set on the rules in every arm).**
- R: the focal animals on the rules (RG: the gate keeps an act until a salient change; draws by value and belief).
- A: the focal animals in the app's lockstep loop (asked at every decision point; the night and dusk menus; fewer than two
  options or an engine refusal → rules) choosing the rules' argmax on the menu: what the loop does without a model.
- G: the same loop choosing by the selected GLiNER provider's argmax on the new observation's packet (`training/decide_ft/worker.py`, one resident process).

A smoke test of the harness (seed 48, 2-day burn-in, 1-day window, arms R and A; not a registered run, disclosed here)
showed A walking far more than R for two of five animals (alpha 7.3 against 2.8 km a day): the loop re-decides at every
bout end without RG's gate. A is in the design so G is read against the loop it runs in.

**Readouts per focal animal (simulation truth).** Daylight (daylight ≥ 0.5) shares by the field category of
`src/field/categories.ts` (feed, rest, travel, groom, social, agonistic; rest + groom); feeding minutes per day; formula
energy eaten per day (kcal, `L.fin`); reserves (% of the usual store per day); ground path per day (per tick) and the
5-min-fix path (T-RNG-4's method); night (daylight ≤ 0.03) out of a nest (%); alive and cause of death; model decisions,
fallbacks by reason, agreement with the rules' argmax, picks by family.

**Field rows the individual readouts allow (bands from data/targets.json).** T-ACT-1 feeding 0.33–0.50, T-ACT-2 travel
0.12–0.25, T-ACT-3 grooming 0.08–0.18, T-ACT-4 rest + groom 0.30–0.47 (daylight shares), T-RNG-4 adult males' day range
1.5–3.5 km (5-min fixes; the row is held as failed for path inflation, reported), T-ENE-2 lactating females' feeding
250–370 min a day. Counted per animal: rows in band in R, A and G.

**Viability and night.** No focal death; reserve trend per animal; out of a nest ≤ 3.3% of the night (the stack's line).

**What this can and cannot show.** Two seeds × five animals × five days: directions, each animal against itself in R and
A; no sums, no keep rule (five animals cannot score community rows). Predictions written now: A walks more than R; G's
budget moves from A's the way M2's family shares (draws, new observation) say the provider's choices move from the rules': the families it over-picks gain daylight time, those it under-picks lose it.

**Outputs.** `artifacts/em/m3/s<seed>-RA.json` (R and A) and `s<seed>-G.json` (G; its burn-in hash must equal the R/A
file's), and `artifacts/em/m3/report.md` (`scripts/em-loop-report.ts`: every number below comes from it).

**M3 gate and provider, applied before any G run (from M2's probes, `artifacts/em/m2/report.md` when complete).** New
observation, consistent renderings, 95% intervals above 0: `base` moves deficit, sleep, light and water the right way
(reserves and heat do not respond); `baseline` the same four. Tie → `base`, the served model. The gate (deficit or
reserves, and sleep or light) passes for `base`, so the G arms run with `--provider base`.

**Amendment 1 (before any paid Jev call).** M2 registered "Jev only while no GLiNER job runs". Jev is a remote API, not a
local model worker (the rule it guarded: one resident GLiNER worker at a time), so the capped Jev sample runs while the
adapter scores seed 7. Nothing else changes (same records, probes, ledger, run id and 5 USD cap).
