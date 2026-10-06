# Stage R1: kernel contract (pre-registration)

Agent r1-kernel, branch `r1-kernel` from `track-e` 24cf896. Registered 6 October 2026, before any code. Specification:
`IMPLEMENTATION_PLAN.md`, Track R, "Stage R1: Kernel contract" and the direction amendment of 6 October 2026; framing:
`docs/recurrent-decision-model.md` §3, §4.2, §5 and §9. The user's direction, verbatim (6 October 2026): "we want to
correct whe still relly on code, and we want to compare to what wild chimps display in the wild, and that the behavior
can be driven with a simple desicion engine with the recurrent chape we designed".

R1 is judged by tests only. No benchmark is run (no e-bench, e-run, field-metrics, sim-metrics), no model is loaded, no
paid or network call is made, no golden is re-recorded. Seeds in the new tests: 48 and 7.

## 1. What will be built

1. **A typed kernel interface** (`src/kernel/types.ts`): the packet and the legal options in, one choice out; memoryless.
   It starts from `DecisionProvider` (`src/providers/types.ts` on the `site` branch, copied here byte for byte so the
   later merge is a no-op): a kernel's answer is the provider's answer (`choice`, `index`, `probabilities`, …), and a
   provider becomes a kernel through one adapter. The request is what `buildRequest` already returns: `context` (the
   packet, `observe()` bounded to the menu), `options` (the legal menu; option *i* has id `c{i}`) and `rulesIndex`.
   A kernel holds no state and no random generator: a draw comes from the loop (`env.random`).
2. **Five kernels behind it.**
   - *The rules.* In the simulation this is today's code (`rgChoice`, else the argmax), reached through the interface.
     Outside it (given only a packet) it is the rules' pick on the menu, the argmax of the options' rules scores (what
     `scripts/em-loop.ts` calls provider `argmax`).
   - *GLiNER adapter.* Through the existing paths, not a new one: the batch worker of `scripts/ft-society.ts`
     (`Scorer.score({ adapter, packet })`, packet from `buildLocalQuestion`) and the request path of the app
     (`POST /api/decide/decide` with the context). Unit-tested against a fake worker and a fake `fetch`; no model load.
   - *Stand-in.* The existing distilled-network path (`StandInScorer`, `scripts/ft-standin.ts`, features from
     `scripts/ft-features.ts`), tested with a tiny synthetic network written to a temporary directory.
   - *Jev, gated.* A client of a local gateway that owns the key (the contract of `server/jev.ts` on the `site`
     branch). It refuses unless the caller passes an explicit approval and a positive call cap, counts calls, and never
     reads an environment variable or a key. Tested against a fake server only.
   - *Null.* Uniform over the legal menu. Inside the simulation the draw is `world.rng`, so a run is reproducible.
3. **One step every non-rules kernel goes through** (inside the tick for a simulation-side kernel, between ticks for
   the others): build the request (`buildRequest`), refuse a menu that is no choice (fewer than two options), validate
   the request (`decisionContextError`, the server's own check), ask the kernel, validate the answer (the check
   `src/decision.ts` applies to a bridge answer), re-check legality and apply (`applyDecision`); anything refused goes
   to the rules, counted by reason.
4. **Three switches, all 0 by default, 0 = today bit for bit** (registry group `decision`, units `switch`):
   - `kernelSim`: 0 the rules; 1 the null kernel decides for rules-driven chimps aged `rgMinAge` and over.
   - `kernelGate`: 0 today (the rules hold an intention inside `rgChoice`; every other kernel is asked at every decision
     point); 1 the loop runs the intention gate before it asks any kernel other than the rules.
   - `kernelNoRulesPick`: 0 today (the rules' pick stays on the menu); 1 the rules' pick is withheld from the menu of
     every kernel other than the rules.

## 2. Success thresholds (from the plan; all must hold)

- T1. The rules kernel through the interface is hash-identical to today: `tests/fixtures/golden-world.json` and the
  field pin in `tests/sim-track-e.test.ts` pass unchanged, and neither file is edited.
- T2. Every kernel receives the same request (the same packet and the same option ids) and every kernel's answer passes
  the same request validation and the same legality re-check (`applyDecision`).
- T3. A unit test per kernel, in one new file.
- T4 (amendment). The null kernel is deterministic: the same seed gives the same world however ticks are batched.
- T5 (amendment). Withholding the rules' pick changes only the menu.
- T6. Every new switch is 0 in both profiles; at 0 the world and the request are today's.
- T7. `gen-params --check`, `tsc --noEmit -p .`, the full `pnpm test` (track-e today: 943 tests, 943 pass) and
  `pnpm build` pass; `tests/ft-*.test.ts` pass.

## 3. Tests (`tests/kernel.test.ts`, new)

1. Switch defaults (both profiles) and: nothing reads the switches at 0 (explicit 0 = default world hash).
2. Rules kernel: at decision points of seeds 48 and 7 the interface gives `rgChoice`'s pick (or the argmax) and leaves
   the same world; two compressed golden cases (seeds 48 and 7) are re-run against the fixture, read-only. Given only a
   packet it returns the rules' pick on the menu, and that answer passes the shared step.
3. Null kernel: uniform index from the draw; a world run on it is deterministic, equal whether ticked one by one or in
   batches (`stepWorld`), differs from the rules world, and stays JSON-lossless.
4. GLiNER kernel against a fake worker (the packet it sends is `buildLocalQuestion` of the request's context; a packet
   over the token budget is refused) and against a fake `fetch` (the request path).
5. Stand-in kernel on a tiny synthetic network.
6. Jev kernel against a fake server: refused without approval, without a cap and past the cap; sends only the
   context; carries no key.
7. Parity: one request, all five kernels; each answer passes the same answer check and `applyDecision` on a copy of the
   world; an out-of-range answer, a malformed one, an invalid request and a stale version all go to the rules.
8. Withholding: the context is unchanged except its `candidates`; the pick is absent; the menu is the same construction
   on the list without it; the world is not touched; dropping only the pick's guaranteed slot (without removing it)
   leaves every sampled menu identical.
9. Gate: at `kernelGate` 1 a model-controlled chimp whose answer was applied holds an intention, is not parked while
   nothing salient changed and is parked when the gate opens; at 0 it is parked at every decision point and holds none.

## 4. Design decisions registered now, with reasons

**D1. The intention gate lives in the loop, and every kernel other than the rules shares one gate (`kernelGate` 1).**
- A kernel is memoryless by definition; an intention is state, and state belongs to the loop
  (`docs/recurrent-decision-model.md` §4.2). The intention is kept where the rules keep theirs (`chimp.sim.rgIntent`,
  plain data, saved with the world).
- With the gate in the loop, kernels are asked equally often, so a comparison changes the kernel only (§5, gap 2).
- A model kernel is then called only after a salient change, which is what M3 asked for and what the free arms of the
  Jev decisive test and `scripts/em-loop.ts --gate rg` did outside the simulation.
- The gate is the function the rules use (`gate()` in `src/sim/rg.ts`, the C13 gate with Track E's variants), run in
  `decisionPoint` before a model-controlled chimp is parked and before the null kernel is asked; an applied kernel
  answer stores the intention in `applyDecision`, so every harness shares it without change.
- The rules keep their own copy inside `rgChoice` (not refactored: the split would have to stay bit-identical across
  every Track E switch, and R1 has no benchmark to check that). At `redecideValue` 0 (the default, and S39) it is the
  same function, so all five kernels share one gate. At `redecideValue` 1 or 2 the rules use a keep test that needs
  their own values and noise; a kernel without values cannot run it and gets the C13 gate. That difference is stated
  wherever a comparison uses it.
- Default 0: today's behaviour.

**D2. "Withheld" means removed from the menu, and it applies to every kernel other than the rules.**
- Dropping only the pick's guaranteed slot would change nothing: the menu is built from the rules' ranking (the best
  target of each action type by rules score), and the rules' pick is the top-ranked legal option, so it is on the menu
  with or without the guarantee. Test 8 checks this on sampled menus.
- So the only version that makes "with and without it" two different menus is to take the option out. The menu is then
  built by the same construction from the legal list without it, `rulesIndex` is −1 (so a stand-in's `rulesPick`
  feature is 0), and a menu left with fewer than two options goes to the rules as today.
- The rules' own menu (`rgMenu`) is never changed.

**D3. One interface, and the in-simulation rules are the stated exception to parity.** The rules still score from the
chimp's live body and memory and choose from the full legal list (§5, gap 1; stage R2 closes it). Giving them only the
packet would change behaviour, so inside the tick the rules kernel receives the live world through `env.live`, its
options are the full legal list, and its pick is applied as today (no second candidate computation). A test shows
that pick passes `applyDecision` with the same resulting world. Every other kernel gets the packet and nothing else.

**D4. The null kernel receives the request a model kernel receives** (the same menu, ids and validation), drives the
population the rules policy drives (`rgMinAge` and over; younger animals keep the rules, as in every model harness),
records its choices with source `decide` (a kernel other than the rules chose; no new `DecisionSource` value) and
falls back to the rules' argmax without a draw.

**D5. The request builder and the request validation move, unchanged, to where the simulation can import them**
(`buildRequest` to `src/sim/request.ts`, `decisionContextError` to `src/sim/context-check.ts`; `src/decision.ts` and
`server/decide.ts` re-export them, so no importer changes). Reason: a simulation-side kernel must pass the same
validation, and `server/decide.ts` imports Node modules.

## 5. What will not be done

- No benchmark, no simulation outside the test suite, no model load, no GPU, no paid call, no network.
- `rgChoice` is not split into gate and draw. `scripts/ft-*`, `scripts/em-*`, `scripts/lib/jev-arm.ts` and
  `training/decide_ft/*` keep their own loops (they already call the same functions); they are not rewritten onto the
  new step.
- The app's loop (`src/decision.ts`) keeps its transport; only its answer check becomes the shared function.
- No UI, no per-community kernel choice (R6), no new packet fields (R2), no site-branch provider code beyond the types.
- `DecisionSource` gains no value; no save migration (`rgIntent` is already an optional key).

## 6. Iteration log (each entry written before it runs; at most 3 per problem)

- **Iteration 1 (the build as registered in §1; logged with the first code commit).** Interface, kernels, the shared
  step, the three switches and the two moves (D5). Checked so far with single test files only: `gen-params --check`
  clean, `tsc` clean, `tests/decision.test.ts` and `tests/sim-rg.test.ts` 35 of 35, the compressed goldens and the field
  pin pass with the rules reached through the interface. The new test file follows in the next commit.

## 7. Results

(to be filled at the end)

## 8. Open questions for the user

(to be filled at the end)
