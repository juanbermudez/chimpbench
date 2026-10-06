# Recurrent decision model: framing

Status: **framing, stage R0 (5 October 2026). Planned, not a result.** This file says how ChimpBench can be described, what the code already does and which claims are still untested. The stages that would test them are Track R in [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md); they start after the gate written there. Sources are in [research.md](research.md#recurrent-decision-model-framing-track-r-5-october-2026) and are cited here by key. Nothing in this file changes the simulation.

## 1. Definition

> A Recurrent Decision Model is a memoryless decision kernel called at event-driven decision points inside a loop that carries internal state on several timescales and local perception. "Recurrent" names the loop, not learned recurrent weights.

In this project:

- **Kernel.** The part that picks one option. It is a function of a packet (what the chimp perceives, feels and remembers, written down) and the legal options that code built. It keeps nothing between calls. What looks like memory in a packet (recent episodes, history lines) is loop state, written into the packet anew each time. (Today the rules also read the chimp's live body and memory directly: section 5.) Four kernels exist or are planned: the rules; GLiNER2.5-Decide, untuned or with a fine-tuned adapter; a stand-in (a small network fitted to imitate an adapter); and Jev (TypeSafe's hosted model, gated: it needs the user's approval and a spend cap, and its outputs are not used as training labels without TypeSafe's written permission).
- **Event-driven decision points.** A chimp is asked when its bout ends or something interrupts it, not every tick.
- **The loop.** The simulator owns time. It ticks the world, updates state, finds decision points, builds the packet and the options, calls the kernel, checks the answer and applies it. The kernel never schedules itself.
- **State on several timescales.** From minutes (the fast arousal state decays with a time constant of 5 ecological minutes; the world updates every 15 seconds) to months (energy reserves over a lean season, social memory digests). Section 4 lists where each piece lives.
- **Local perception.** Only what this chimp sees, hears, remembers and feels. No unseen entities.

The name is spelled out every time and never abbreviated. Its usual short form is already used for other things (section 7).

This agrees with [research.md §9](research.md#9-two-graphs-one-authoritative-world): a recurrent loop means repeated decisions over persisted state, and it does not imply hidden recurrent memory in GLiNER2.5-Decide.

**What the name is for.** It fixes what is being compared. Change the kernel with the loop fixed (stage R5), or change one group of state with the kernel fixed (stage R3). The invariant "the model only chooses" ([AGENTS.md](../AGENTS.md)) is the boundary between the two.

**What it does not claim.** It is not a new model class, not a learned recurrent network, and not a result. Section 8 says what is shown and what is not.

## 2. The loop

```text
  world tick (15 s of ecological time)
        |
        v
  mechanisms update state
    body:  energy reserve and gut, sleep pressure and phase, water, heat,
           hormone-like slow states, fast arousal
    mind:  beliefs about trees, bonds and tension, memory, intentions
        |
        v
  decision point?  -- no -->  carry on with the current act ---------+
  (bout over, or an interrupt)                                       |
        | yes                                                        |
        v                                                            |
  observe(): local perception                                        |
  (what this chimp sees, remembers and feels; no unseen entities)    |
        |                                                            |
        v                                                            |
  legal options built by code (at most 8; night and dusk menus)      |
        |                                                            |
        v                                                            |
  KERNEL chooses: rules | GLiNER2.5-Decide | stand-in | Jev          |
  (memoryless: packet and options in, one choice out)                |
        |                                                            |
        v                                                            |
  code validates the answer and re-checks legality                   |
  (not legal, or too late: the rules decide)                         |
        |                                                            |
        v                                                            |
  act: a bout starts; the chimp moves, eats, grooms, ...  <----------+
        |
        v
  the world changes (other chimps perceive it)  --->  next tick
```

Order inside one tick ([tick.ts](../src/sim/tick.ts)): for each living chimp, `needs` (the mechanisms update its state), then `decisionPoint` if one is due, then `executeAction`, then a second `decisionPoint` if the bout finished in that tick. Slower mechanisms run on the slow step (every 20 ticks, 5 ecological minutes), hourly and daily. Speed never changes the tick: faster playback runs more ticks per frame.

## 3. How the code implements each part

| Part | In the code |
| --- | --- |
| World and tick | `tickWorld` ([src/sim/tick.ts](../src/sim/tick.ts)) advances exactly one 15-second tick; `stepWorld` splits playback time into whole ticks. The clock ([src/clock.ts](../src/clock.ts)) runs whole ticks within a frame budget. |
| Mechanisms update state | `needs` ([src/sim/life.ts](../src/sim/life.ts), line 145) runs every tick for every living chimp and calls `energyTick`, `rhythmNeeds`, `waterTick` and `endoNeeds`, each behind its switch. The slow, hourly and daily steps are run from [tick.ts](../src/sim/tick.ts) (`slowLife`, `dailyLife`, `dailyBeliefs`, and others). |
| Decision points | `decisionPoint` ([src/sim/decide.ts](../src/sim/decide.ts), line 28): called at a scheduled bout end or an interrupt, and again when a bout finishes. A model-controlled chimp waits there (`awaitingDecisionSince`), resting or carrying on. Detail: [simulation.md §8](simulation.md#8-decision-making). |
| Local perception | `perceive` ([src/sim/perception.ts](../src/sim/perception.ts), line 92) refreshes what the chimp sees and hears. `observe` ([src/sim/observe.ts](../src/sim/observe.ts), line 38) builds the `DecisionContext` ([src/types.ts](../src/types.ts)) from the chimp's last perception, memory and body. Another chimp appears in it only if seen, remembered, or the focal chimp's caretaker or mother. It is pure. |
| Legal options | `computeCandidates` and `getEligibleActions` ([src/sim/candidates.ts](../src/sim/candidates.ts)) list what is legal. The bounded menu (`boundedCandidates`, `phaseMenu`: at most 8 options, with night and dusk menus) is in [src/sim/menu.ts](../src/sim/menu.ts). |
| Rules kernel | `rulesChoice` ([src/sim/candidates.ts](../src/sim/candidates.ts), line 1586) is the pure argmax: no random draw, no mutation. The policy a rules-driven chimp follows in the loop is `rgChoice` ([src/sim/rg.ts](../src/sim/rg.ts), line 233): it holds an intention until something salient changes (the gate, [src/decide/gate.ts](../src/decide/gate.ts)), otherwise it draws from the bounded menu with `world.rng` (stage C13; Track E's `choiceBelief` and `redecideValue` change how); the argmax is the fallback. |
| Model kernel | A chimp with `controller === 'model'` (`isModelControlled`, [src/sim/decide.ts](../src/sim/decide.ts), line 17) is answered by the decision loop in [src/decision.ts](../src/decision.ts) (queue, traces, timeouts), through [server/decide.ts](../server/decide.ts) (strict request validation, `decisionContextError`, which since stage R1 lives in [src/sim/context-check.ts](../src/sim/context-check.ts); the packet text, `buildLocalQuestion`) and the resident worker ([server/local-worker.ts](../server/local-worker.ts)). |
| GLiNER in the browser | `src/providers/` on the `site` branch, not on track-e: `browser.ts`, `browser.worker.ts`, `packet.ts`, `config.ts`, `encoding.ts`, `http.ts`, `index.ts` and `types.ts`, with a `DecisionProvider` interface (`decide(context, signal)`) and browser, server and Jev providers. |
| Validate and re-check | `applyDecision` ([src/sim/decide.ts](../src/sim/decide.ts), line 91) accepts a choice only if it is still on the current eligible list and the decision version matches. An invalid, illegal or late answer is dropped and the rules decide (`resolveByRules`; fallbacks are counted in [src/decision.ts](../src/decision.ts)). The source of each choice is recorded as `DecisionSource`, `'rules'` or `'decide'` ([src/types.ts](../src/types.ts)). |

The invariants that make this a loop around a kernel ([AGENTS.md](../AGENTS.md)): the model only chooses; code builds the legal candidates, validates the answer and re-checks legality before applying it; `observe()` is local-only; the server accepts no client instructions; `observe()` and `rulesChoice()` are pure; `tickWorld` advances exactly 15 seconds, and the same seed and tick count give a deep-equal world.

## 4. State and kernel

### 4.1 Where the state lives

Most body states update every tick (15 s). The hormone-like states step every 5 ecological minutes, and the fast arousal decays continuously (it is read through `fastNow`). Beliefs update when the chimp perceives and daily. Social memory is digested monthly and yearly. Every Track E mechanism sits behind a switch that is 0 by default ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), Track E); `rgOn` belongs to stage C13 and is 1.

| Part | State (field) | Updated by | Switch |
| --- | --- | --- | --- |
| **Body: energy** | `chimp.sim.en`: reserves `res` (relative to the set point; death at minus the usable store), gut `gut` (kcal), lifetime `in` and `out` | `energyTick` in [energy.ts](../src/sim/energy.ts), from `needs` | `energyLedger` (with `ledgerDrive`, `ledgerGrowSurplus`, and others) |
| **Body: gut contents** | `en.dm` (foregut dry matter, g), `en.fib` (its fibre), `en.hind` (hindgut fibre) | energy.ts | `ledgerDigesta` |
| **Body: sleep and heat** | `chimp.sim.slp` (sleep pressure, 0..1), `chimp.sim.heat` (thermal load, −1..1) | `rhythmNeeds` in [rhythm.ts](../src/sim/rhythm.ts) | `rhythmSleep`, `rhythmHeat` |
| **Body: circadian phase** | `chimp.sim.cx`, `cxc`, `cn` (the oscillator) and `asl` (the sleep latch) | `circadianTick` in [circadian.ts](../src/sim/circadian.ts) | `rhythmCircadian` (needs `rhythmSleep`), `sleepChimp` |
| **Body: water** | `chimp.sim.wat.def` (water deficit, mL) | `waterTick` in [water.ts](../src/sim/water.ts) | `waterLedger` (needs `energyLedger` and `ledgerDigesta`) |
| **Body: hormone-like slow states** | `chimp.stress` (cortisol-like), `chimp.sim.arousal` (competitive arousal, adult males; testosterone-like), `chimp.sim.affil` (oxytocin-like) | `endoStep` in [endocrine.ts](../src/sim/endocrine.ts), every slow step | `endoStates` (read by `endoEscalate` and `endoRedirect`) |
| **Body: fast arousal** | `chimp.sim.fast` and `fastAt` | `endoKick` in endocrine.ts, read through `fastNow` | `endoFast` |
| **Body: the old gauges** | `chimp.hunger`, `thirst`, `energy`, `social`, `stress`, `health`, `injury` | With the switches on, hunger, thirst and energy are readouts of the states above ([energy.ts](../src/sim/energy.ts), [water.ts](../src/sim/water.ts) and [rhythm.ts](../src/sim/rhythm.ts) headers). These gauges are what the model's packet shows today. | |
| **Mind: beliefs about food** | `chimp.sim.treeCrop` (crop believed per tree), `treeFeed`, `ls` (when a listed crown was last seen) | `perceive` and `dailyBeliefs` in [perception.ts](../src/sim/perception.ts); [tripbelief.ts](../src/sim/tripbelief.ts) | `tripBeliefs`; `choiceBelief` (the choice samples the belief) |
| **Mind: memory** | `chimp.memory` (places and individuals seen, and when), `chimp.episodes` (first-person events), `chimp.digests` (monthly and yearly social digests) | `remember` in perception.ts; `episode` in [events.ts](../src/sim/events.ts); [relations.ts](../src/sim/relations.ts) for the digests | |
| **Mind: bonds and tension** | `chimp.bonds`, `chimp.sim.tension`, `chimp.sim.incident` | `addBond` in [hierarchy.ts](../src/sim/hierarchy.ts) (called from the actions in [execution.ts](../src/sim/execution.ts)), relaxed daily in life.ts; tension and incidents in relations.ts | |
| **Mind: intentions** | `chimp.sim.rgIntent` (the act the rules policy holds), `chimp.sim.impulse` (hunt, patrol and other impulses), `chimp.sim.cg` (the call a caller trip was chosen for) | [rg.ts](../src/sim/rg.ts) and [src/decide/gate.ts](../src/decide/gate.ts); perception.ts; [calltrip.ts](../src/sim/calltrip.ts) | `rgOn`; `callTrip` (`cg` only) |

Only `src/sim` writes this state ([AGENTS.md](../AGENTS.md): "only writer of behavior, body and relationship state"). The renderer, audio, persistence and UI read it. The field-by-field contract is [simulation.md §5](simulation.md#5-state-reference).

### 4.2 What is state and what is kernel

| | State (in the loop) | Kernel |
| --- | --- | --- |
| What it is | Body and mind variables, per chimp and per world | A function: packet and legal options in, one choice out |
| Memory between calls | Yes, seconds to months | None. A packet may render memory the loop holds |
| Written by | The mechanisms in `src/sim` | Nobody. The loop applies the choice after checking it |
| Sees | Everything the simulation holds | Only the packet from `observe()`. The rules also read the chimp's live body and memory (section 5) |
| Swappable | No: it is the world | Yes: rules, GLiNER2.5-Decide, stand-in, Jev |
| Reproducible from the seed | Yes (determinism invariant) | The rules, yes. A live model, no (section 5) |

## 5. Where the code does not yet match the framing

These are gaps in the code, not in the idea. Stage R1 and stage R2 in [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) exist to close them.

**Stage R1 (6 October 2026; [staging/r1-prereg.md](staging/r1-prereg.md); tests only, no run).** A kernel interface now
exists ([src/kernel/types.ts](../src/kernel/types.ts)) with five kernels behind it (the rules, a null kernel, GLiNER, a
stand-in, Jev gated), and gaps 2 and 3 have a decision each behind a switch that is 0 by default, so nothing below has
changed in a default world. Gap 2: the gate belongs to the loop; with `kernelGate` 1 every kernel other than the rules is
asked only when the loop's gate opens (the function the rules policy uses at `redecideValue` 0). Gap 3: with
`kernelNoRulesPick` 1 the rules' pick is taken off the menu of every kernel other than the rules; merely dropping its
guaranteed slot changes nothing, because the menu is built from the rules' ranking. Gap 1 is unchanged: inside the tick
the rules kernel is still handed the live animal (the interface's one stated exception). Gap 4 is unchanged.

1. **The two kernels do not see the same thing.** The rules score options from the chimp's own body, memory and perception snapshot, Track E's state included (`computeCandidates` reads them live). The model sees only the packet from `observe()`, which carries the old need gauges and the clock hour but not Track E's body state, beliefs or valuations ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), "The decision model on Track E's state"). Until the packet carries that state (stage R2), a kernel swap changes two things at once: the kernel, and what it can see.
2. **The intention gate lives inside the rules policy.** `rgChoice` holds an act until something salient changes; a model-controlled chimp is asked at every decision point, so the two kernels are not asked equally often. Stage R1 decides whether the gate belongs to the loop, so that every kernel shares it as the free arms of the Jev decisive test did ([jev-decisive-test.md](staging/jev-decisive-test.md)), or to the kernel.
3. **The rules' own pick is on the model's menu.** `buildRequest` ([src/sim/request.ts](../src/sim/request.ts) since stage R1, re-exported by [src/decision.ts](../src/decision.ts)) keeps the rules' choice, and a response to any perceived disturbance, in the bounded menu when the night or dusk menu allows it (`boundedCandidates(…, [rules, stimulusResponse])`). A fair kernel comparison has to decide whether every kernel's menu gets that.
4. **A live model is not reproducible from a seed.** Determinism holds for the rules. Model answers are saved as receipts, but replaying them from a log is not implemented ([research.md §10](research.md#10-local-gliner25-decide-rank-an-available-step) and [§13](research.md#13-observation-replay-and-falsifiable-checks)).

## 6. Presentation analogy: Recursive Language Models

Recursive Language Models (Zhang, Kraska and Khattab, [zhang2025]) wrap a language model in a scaffold: the long prompt becomes part of an external environment, and the model examines it, splits it and calls itself on the parts. A Recurrent Decision Model has the same shape of idea, a scaffold around a memoryless model, on a different axis: **recursion there runs over parts of a context; recurrence here runs over time.** The point to take into a talk is that the scaffold, not the model, is where the system lives. It is an analogy for presentation, not a claim of kinship: the recursive-language-models paper is a long-context inference method (a preprint).

Where it breaks:

- **Who schedules the calls.** There, the model decides what to call next. Here, the loop does: the simulator finds the decision points, builds the options and applies the answer. The kernel cannot call itself or pick its moment.
- **One world, many loops.** There is one task and one context. Here every chimp has its own loop and all of them run through one shared world, so one chimp's choice changes what the others perceive and need.
- **No end.** A recursive call returns an answer. This loop never returns; it runs as long as the world runs.
- **The kernel need not be a language model.** The rules are a kernel too.

## 7. Related work

How each differs from a Recurrent Decision Model, in one line. All are framing only; none is evidence about chimpanzees ([research.md](research.md#recurrent-decision-model-framing-track-r-5-october-2026)).

| Work | What it is | How this differs |
| --- | --- | --- |
| Generative agents [park2023] | Language-model agents with a natural-language memory stream, reflection and planning, judged by believability | State here is mechanistic and updated by code; the kernel is swappable and need not be a language model; the scorecard is field data |
| CoALA [sumers2023] | A framework for describing language agents by memory modules, an action space and a decision procedure | The simulator, not the agent, runs the loop; memory is partly physiological; many agents share one world |
| Pattern-oriented modelling [grimm2005] | A strategy for designing, testing and analysing agent-based models; the project applies it by matching several patterns at different levels | Not a rival: the fitted and held-out target split follows it. The framing adds a second axis, the kernel, under the same patterns |
| The virtual ecologist [zurell2010] | Simulate the data and the observer, then analyse the virtual data as real | Not a rival: the virtual field observer (`src/field`) is this, and every kernel is scored through it |
| Artificial "chimps" [teBoekhorst1994] | Agents that only search for food and mates show chimpanzee-like party structure | The closest ancestor in spirit. ChimpBench adds body and mind state on several timescales, a swappable kernel and a field-data scorecard |
| Fission–fusion from a foraging model [ramosFernandez2006] | Non-interacting foragers with partial knowledge of patches form fission–fusion groups (spider monkeys) | Here animals share one world and choose among bodily and social options |
| State-dependent behaviour [mangelClark1988] [houstonMcNamara1999] | The best action depends on the animal's state, found by dynamic programming | The closest concept. They solve for the optimal policy; here the policy is a swappable kernel, nothing is optimal by construction, and the test is the match to field data |
| Homeostatic reinforcement learning [keramatiGutkin2014] | Reward as the reduction of a physiological deficit | Track E already values an option by the deficit it removes. No policy is learned from reward here: kernels are fixed |

**Names that collide.** The name is never abbreviated because its short form is taken:

- **Representational dissimilarity matrices** ([kriegeskorte2008], neuroscience) share the short form.
- **Recurrent network models of decision-making** ([wang2002], neuroscience): the recurrence is inside a neural circuit. In a Recurrent Decision Model it is outside the kernel.
- **Recurrent state-space models and recurrent policies in reinforcement learning** ([hafner2019] for the former): the loop's memory is a learned hidden state. Here it is explicit, named and mechanistic, so it can be inspected and ablated.
- **"Recursive Decision Models"** is reported to use the short form too. **Not verified:** a search of arXiv and Crossref titles on 5 October 2026 found no source with that title, so it is not cited.

## 8. Claims and their evidence status

| # | Claim | Status | Tested by |
| --- | --- | --- | --- |
| 1 | Mechanistic state beats prescribed behaviour on the same kernel | **PARTLY SHOWN** (Track E, rules kernel only) | R3 |
| 2 | Any kernel works in the loop | **NOT SHOWN** (GLiNER on Track E's state is in progress) | R1, R2, R4, R5 |
| 3 | A small kernel in a good loop matches an expensive one | **NOT SHOWN** | R5 |

**1. Mechanistic state beats prescribed behaviour on the same kernel: partly shown.** Every number is from [e-rebaseline.md](staging/e-rebaseline.md) unless noted.

- Prescriptions: the best integrated candidate, S39, has 42 where today's model has 147, so 105 are replaced ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), Track E).
- On the new protocol's bands (freeze `5d4fa5a2a500bce6`), S39's held-out distance beats today's model beyond noise at 60 days (z −4.2), 6 months (−2.9) and 12 months (−4.1).
- But the held-out rows whose bands did not change are about even: summed distance S39 minus today's model is −0.35 at 60 days and −0.31 at 6 months (+0.11 and +0.80 without the rare-event rows). At 6 months the 13 unchanged rows give −0.31, the 2 rows whose bands the audits revised +0.80, and the 10 rows the audits added −5.40, nearly all of it two infant rows that today's model fails.
- On the old bands (`data/targets.c8.json`), S39's held-out sum is worse at every horizon: z +1.1, +2.2 and +1.0 at 60 days, 6 and 12 months (beyond noise at 6 months only); without the rare-event rows +12.3, +13.8 and +2.0 (beyond noise at 60 days and 6 months).
- S39 is **not viable at 12 months.** Three of its four runs fail viability with two starvation deaths each (6 in 20 seed-runs). Today's model has none, because it has no energy ledger and cannot starve that way. E1r's verdict: in the lean season the energy absorbed falls because the foregut is the limit, and a valuation trap makes the deficit lethal (it keeps depleted animals on the food the gut passes least energy from); five of S39's six dead are immigrant females ([e1r-prereg.md](staging/e1r-prereg.md) §11, [handoff](staging/track-e-handoff.md) §0). Its fix, E1s (`gutValue`), is in development ([e1s-prereg.md](staging/e1s-prereg.md)).
- The 60-day windows start before the lean season and could not see this. Keep and null decisions made on short windows stay provisional until re-run on the horizon their rows need ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), "Run-length ladder").

**2. Any kernel works in the loop: not shown.** Only the rules kernel has run the Track E loop at benchmark scale. GLiNER on Track E's state is in progress: stages M1 to M3 (agent eM-model, branch `eM-model`; the pre-registration `docs/staging/em-prereg.md` is on that branch, not on track-e). Its results are pending the integrator's review; none is used here.

**3. A small kernel in a good loop matches an expensive one: not shown.** It needs the same Track E loop run with each kernel (stage R5), on a base that is viable (not yet: S39 starves at 12 months), with cost and latency per decision beside the score. Today a real-model population costs about 17 GPU-minutes per simulated field day (stage P2; [decide-finetune.md §11](decide-finetune.md#11-round-3-and-trained-populations-vs-wild-chimpanzees-track-p)), a real decision takes about 0.25 to 0.4 s ([AGENTS.md](../AGENTS.md)), and stand-ins run at rules speed (stage P4). A kernel taught on the rules' decisions inherits their prescriptions, so every result states its label source.

## 9. Reuse, don't rebuild

Tracks F and P built most of what a kernel swap needs. Reuse it. **All of it was built on pre-Track-E snapshots and packets (snapshot-v2 and snapshot-v3, packets v2 and v3; snapshot-v3's sim hash is `1c20a219db3e`), so it is stale against the current stack.** Expect to regenerate data, retrain and refit before any number from it is comparable with Track E's. `scripts/ft-*` and `training/decide_ft/*` belong to Track P's owner (decide-ft): coordinate or branch, and keep `tests/ft-*.test.ts` passing.

| Piece | Where | Use |
| --- | --- | --- |
| Method and results of Tracks F and P | [decide-finetune.md](decide-finetune.md) | What was done, with numbers, on v1 to v3 inputs |
| Expert labeling skill (Track F) | `.claude/skills/chimp-field-expert/` (`SKILL.md`, `evidence.md`) | The expert rubric, re-run on new packets (R4) |
| Context sampler | `scripts/ft-contexts.ts` | Exact serving packets at real decision points |
| Adapters and their training | `training/decide_ft/` (`train.py`, `labeling.py`, `eval_offline.py`, `parity.py`, `token_audit.py`). Round-3 adapters (baseline, aggressive, collaborative): `artifacts/decide-ft/round3/adapters`, gitignored, in the main checkout | Retrain (R4); token audit (R2) |
| Model-driven field observer (Track P, P2) | `scripts/ft-field.ts`; `--cond rules` reproduces `field-metrics` exactly (`tests/ft-field.test.ts`) | Score every kernel through the same observer (R5) |
| GPU batching server (P2) | `training/decide_ft/server.py`: one model per GPU, cross-run batching; it refuses Jev items, so the key stays on the Mac | A rented GPU for R5, if approved |
| Stand-ins (P4) | `scripts/ft-standin.ts`, `scripts/ft-features.ts`, `training/decide_ft/distill.py`; they run in-process at rules speed | The kernel for runs of 6 months and longer; refit for R4 |
| Run registry and dashboard (P6) | `training/decide_ft/dashboard_data.py` (`registry()`) and `report_data.py` | Extend it to record each R5 run's kernel, label source and hashes (today it lists a run's condition, seed, days, profile, code hash and policy: rules, model or stand-in) |
| Free policies and the intention gate | `src/decide/policies.ts` (RG, U, X), `src/decide/gate.ts`, `scripts/jev-test.ts`; plan in [jev-decisive-test.md](staging/jev-decisive-test.md) | Kernel-shaped functions already exist; the gate for R1 |
| Jev designs | `docs/decide-jev-design.md` (Claude version) and `docs/decide-jev-design-agent-2.md` (Codex version). **Both exist only as untracked files in the main checkout** (`/Users/juanbermudez/Desktop/MGOGO/docs/`); read them there, do not copy them | An LLM kernel: packet, gate, cost, stages J0 to J4, the licensing limit |
| Provider interface and browser GLiNER | `src/providers/`, `server/jev.ts` and `public/decision-providers.json` on the `site` branch | R1's interface starts from `DecisionProvider` |
| State in the packet, offline probes, a focal group in the loop (M1 to M3) | Branch `eM-model`: `src/sim/observe-state.ts`, `scripts/em-*.ts`, `docs/staging/em-prereg.md` | R2 should start from M1 |

**Licensing limit on Jev.** TypeSafe's Master Customer Agreement §2.3(b) bars training a model to imitate Jev's output without TypeSafe's written permission ([IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), the Jev sections). Stage R4 therefore trains only on our own labels. The Jev redesign's open decisions (licensing path, spend caps, report seeds) stay the user's.

## 10. Stages

R0 is this file. R1 to R6 are in [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), Track R, and start after its gate. Their success thresholds are registered before any run. No GPU or Jev spend, and no deploy, happens without the user's explicit go.
