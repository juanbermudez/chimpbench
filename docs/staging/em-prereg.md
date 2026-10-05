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
