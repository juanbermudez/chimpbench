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
