# R15: decisions over perceived resource targets

Registered 13 October 2026, before implementation or changed-code runs.

## Authorization and scope

The user asked to move toward the recurrent state-biased decision model with perception driving chimp behavior and supporting training. This stage implements a narrow, default-off part of R12: choose food and water destinations from individual perception and memory. It does not resolve the remaining R12 social, aggression, reproductive, body-teacher or sealed-data rulings. R14's active frozen experiment and inputs remain unchanged.

The neural scorer is memoryless. Recurrence is explicit in the simulation: body state, ongoing activity, perceptions, individual memory and experienced outcomes become the next decision input. This stage changes target agency, not that architecture. Existing activity offerings, body/phase restrictions, bout endings and the intention gate remain scaffold assumptions.

## Implementation contract

- `resourceTargets=0` by default. Off-path packets, decode draws and simulation behavior remain unchanged. Rules controllers and fallbacks keep the existing policy under either setting. New-mode operation requires own-state observations and two-stage requests.
- Reuse the kind-then-target loop. Kinds remain bounded by the existing eight-kind scaffold; only resource groups expand. Other activities keep their existing selected target. No explicit carry-on/alternative-kind design in this slice.
- Food options come from current perception or individual remembered trees within the existing horizon and trip distance. Water comes from individually known sources. No communal unseen-tree list, unseen current crop, unseen crowd, score-ranked target shortlist or world-RNG consumption.
- Deterministically bound food groups to eight and water to four (design assumptions), keeping the valid current target. Reuse actual resource valuation/metadata for legality and gate persistence, but never show scores/reasons or use them to rank target membership.
- Request construction, application recheck and intention retention share the model-only legal resource pool. Keep the full legal pool separate from its bounded menu. Stale versions/invalid answers fall back through existing rules behavior.
- Mark kind and target stages explicitly. Kind keys do not depend on representative targets; two calls have separate random namespaces. Held epochs remember the concrete applied action/target. Record both calls and replay them deterministically. Flat existing receipts stay compatible.
- Use a new named packet/training identity. Both stages retain the animal's body, own experience and ongoing activity. First-stage labels are activity kinds; second-stage labels describe targets from the animal's knowledge. Do not silently run R11/R14 adapters on this contract.
- Training exports the exact live packets with soft labels over the presented menu. Kind teacher and resource-target teacher are identified separately; any target utility imitation is explicitly rules/scaffold taught, not a learned ecological reward. No claim of wild preference learning or viability follows from unit checks.

## Verification and limits

At most three implementation/verification rounds before recording unresolved findings. Focused CPU checks while R14 runs; no second model, long simulation, full suite, production build or browser graphics load. Full integrated checks and real tokenizer/model runs wait until R14 is idle. Do not autoqueue a new paid/external workload or interfere with R14.

Required focused evidence: default-off compatibility; rules-path parity; observation purity; deterministic shortlist; unseen-fruit mutation invariance; targets excluded from the old cap can be applied and retained; arrival progresses into feeding; stale answers/invalid responses fail safely; stage-separated draws; held-noise stability and checkpoint/resume; exact export/live packet parity; normalized labels with no teacher-score text leakage; adapter/manifest identity rejection.

A bounded fake-kernel integration exercise may use development seed 48 and at most 1,400 ticks/5 controlled adults, with both calls saved and replayed. It is a wiring check, not a behavior result. Training/dev collection is restricted to 48/7. Seed 21 remains evaluation only; R14's reserved 3457/3823 and sealed 4333/4444 are untouched. Real model training is prepared but not launched beside R14.

## Outcome

Pending implementation and focused verification. Model-quality, cost and viability results remain unmeasured.
