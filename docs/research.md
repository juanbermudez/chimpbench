# MGOGO — research and simulation contract

Research pass: **2026-09-28**. Proposed baseline: **eastern chimpanzees (*Pan troglodytes schweinfurthii*) in a synthetic Kibale-inspired moist forest in Uganda**. The map, communities, individuals, initial populations, and event histories are invented. This is not a reconstruction of Ngogo or Kanyawara and not a validated model of chimpanzee behavior.

**Done for this research deliverable:** an offline architecture guide plus a source-linked design note that separates field observations, proposed mechanisms, initial prototype scope, and future validation.

**Companion reference:** [simulation.md](simulation.md) documents what the current code actually does: every mechanism, parameter (with file and line), and the validation metrics produced by `scripts/sim-metrics.ts`. This file remains the evidence source; where the two differ on what the literature says, this file governs, and where they differ on what the code does, simulation.md governs.

## Evidence vocabulary

- **Observed / high confidence:** the linked primary study supports the stated observation in its own population and period. It does not establish a universal parameter.
- **Proposed / moderate confidence:** a coherent implementation hypothesis consistent with evidence, still requiring behavioral comparison.
- **Assumed / low confidence:** a convenient starting constant, threshold, synthetic population, or visual simplification.
- **Unknown:** a parameter or outcome not estimated in this pass.
- **Calibrated:** reserved for a parameter fitted to a stated dataset with a held-out evaluation. **No prototype behavior is calibrated yet.**

## 1. Ecology owns the opportunities

Potts, Chapman, and Lwanga compared resource availability at Ngogo and Kanyawara, only **12 km** apart, and found substantial local floristic differences. Their Table 1 distinguishes foods associated with high fruit abundance (HFA), asynchronous low fruit abundance (aLFA), and synchronous low fruit abundance (sLFA). These are **site-specific functional classifications**, not global properties of a species. The paper describes Kibale as moist evergreen or semi-deciduous forest between lowland and montane formations. [Primary study, full text and Table 1](https://doi.org/10.1111/j.1365-2656.2009.01578.x)

### Starting botanical palette

| Source-recorded name | Role in the Ngogo column | Prototype visual counterpart — assumed |
| --- | --- | --- |
| *Ficus mucuso* | aLFA fruit | A few conspicuous giant figs; wide crowns, navigable branches |
| *Uvariopsis congensis* | HFA fruit | Denser midstory food patches |
| *Chrysophyllum albidum* | HFA fruit | Broad canopy food trees |
| *Pseudospondias microcarpa* | HFA fruit | Mixed canopy food patches |
| *Pterygota mildbraedii* | sLFA; unripe fruits used | Tall canopy trees with distinct crop states |
| *Mimusops bagshawei* | sLFA at Ngogo | Evergreen canopy food trees |
| *Ficus natalensis* | aLFA fruit | Secondary fig silhouette |
| *Ficus sansibarica* | aLFA fruit | Secondary fig silhouette |
| *Celtis durandii* | sLFA at Ngogo | Background canopy with edible resource state |

Names follow this study's records. Current synonym resolution, exact mature dimensions, crown architecture, leaf shape, and local abundance remain **unknown** unless separately checked. The renderer should label simplified geometry as illustrative. Density weights and calendar curves must not be inferred from a visual preference.

**Proposed mechanism:** each tree has species, position, canopy connections, crop stage, edible part, accessible stock, regrowth schedule, and water yield from food. A crop has bounded stock and depletion; it is not an endless energy button. Fruit availability can influence party aggregation without forcing a prescribed party size. Model nonfruit fallback foods separately. Patch access, feeding rate, and handling difficulty vary by body capacity and practice.

## 2. A life is a changing capacity, not an unlock menu

At Kanyawara, Bray et al. analyzed **4 years (2010–2013)** of feeding data from **26 immature and 31 adult** chimpanzees. They report the earliest solid food at **5.1 months** (mean first solid food **7.9 ± 0.7 months**), average suckling cessation at **4.8 years**, and adult diet breadth by juvenility. Their analysis does not support treating every delayed feeding measure as a learning deficit; physical constraints are a competing explanation. [Primary study, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5739981/)

**Proposed mechanism:** retain birth date, age, size, strength, locomotion, fatigue, attachment, milk dependence, developmental milestones, and learned skills separately. Chronological stage is a useful label; milestones and capacity decide eligibility. A strong young climber can have broad food knowledge but poor ingestion rate. An injured adult may have less usable locomotion than a juvenile.

The current engine uses **infant <5, juvenile 5–<10, adolescent 10–<15, adult 15–<40, elder ≥40 years**. The guide additionally distinguishes infant capacity below **2 years** from later infancy. These are simplified implementation categories, not fitted population-wide cutoffs. The underlying future model should allow sex-specific, individually variable maturation.

At Ngogo, observed nipple contacts and physiological nutritional dependence do not necessarily end together. [Bădescu et al., primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9352031/)

**Design consequence:** keep `milkFraction` apart from `comfortNursing`; an infant that requests contact is not necessarily obtaining its whole diet through milk. Caregiver absence raises exposure and unmet needs. Adoption is an explicit relationship, not an automatic replacement mother: v0.2 lets orphans be adopted by an older maternal sibling or a bonded adult with modest probability, and young unweaned orphans without a caretaker rarely survive ([simulation.md §13](simulation.md#13-reproduction-and-life-history)). Richer allomaternal care is future work.

## 3. Drives organize the trade-offs

**Assumed latent state:** hunger, hydration deficit, fatigue, acute threat, social contact demand, exploration/play motivation, mating motivation after maturation, and infant attachment. These are simulation variables, not direct measurements of a chimpanzee's mind. Calling them “innate” means species-plausible starting predispositions; it does not imply that all social strategies, foods, or tools are genetically preprogrammed.

Use an energy and water budget, not a single happiness score. Travel and climbing consume energy; heat and activity alter water demand; fruit can supply water; lactation changes the caregiver's cost. Without site-specific intake and physiological measurements, numeric rates remain **low-confidence assumptions**. Hard emergency constraints prevent the decider from neglecting an immediately lethal need. Soft preferences can compete above those constraints.

## 4. Play, learning, and culture require opportunities

Heintz et al. used long-term Gombe mother–infant records to study social play and developmental milestones. More play was associated with earlier attainment of several motor and social milestones. Association does not establish that adding an arbitrary unit of play causes a fixed amount of skill growth. [Primary study, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5728447/)

Musgrave et al. studied tool transfers during termite gathering at Goualougo; these transfers can facilitate learners' performance. This is evidence from a different population and ecology. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5057084/)

**Proposed mechanism:** observation exposes a technique; practice produces noisy progress; strength and affordances constrain success; tolerant partners alter access. Keep `knownTechnique`, `practice`, and `competence` distinct. A population profile enables its documented repertoire. Do not give every Kibale-inspired agent innate nut cracking, termite fishing, spear hunting, or a universal tool set by age. Leaf sponging is a candidate local repertoire; other tool behaviors belong in separately evidenced future profiles.

## 5. Communities persist; parties change

Langergraber et al.'s Ngogo study examines male participation in boundary patrols. Fission–fusion dynamics can create asymmetries between opposing parties. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5514721/)

The Ngogo community fission study describes multi-male, multi-female communities whose members are rarely all together, and documents lethal aggression following community division. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8277110/)

**Proposed mechanism:** a persistent `communityId` differs from a transient party membership relation. Local attraction, resource competition, attachment, affiliation, reproductive state, and perceived danger change movement and association. Encounter outcomes depend on perceived local numbers, ally identity, escape options, and actor condition. “Foreign chimp seen” must offer avoidance, observation, vocalization, retreat, joining allies, and possible aggression; it must not automatically start combat. Adult males can have greater patrol propensity without every male patrolling or females being universally excluded.

Home ranges overlap or shift over demographic time. They are use histories and contested boundaries, not luminous force fields or perfectly known polygons in each agent's mind. Permanent community fission is a future demographic mechanism, distinct from routine party splitting.

### Relationship quality and long-term social memory

Fraser, Schino and Aureli (2008), *Components of relationship quality in chimpanzees*, Ethology 114: 834–843 ([DOI 10.1111/j.1439-0310.2008.01527.x](https://doi.org/10.1111/j.1439-0310.2008.01527.x)), found that behavioral measures of relationship quality in captive chimpanzees cluster into the three components proposed by Cords and Aureli: **value**, **compatibility** and **security**. Later work that cites the study reports that grooming loaded on value and aggression on compatibility in chimpanzees ([Barbary macaque comparison, PLOS ONE 2011](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0028826)). Verified on 28 September 2026 through indexed citations; the publisher page was not accessible, so the loadings are cited second-hand. Captive population, not Kibale.

Lewis, Wessling, Kano, Stevens, Call and Krupenye (2023), *Bonobos and chimpanzees remember familiar conspecifics for decades*, PNAS 120(52): e2304903120 ([DOI 10.1073/pnas.2304903120](https://doi.org/10.1073/pnas.2304903120), [full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC10756267/)). In an eye-tracking study of 26 zoo apes, attention was biased toward photographs of former groupmates over strangers, possibly for at least 26 years after separation, and more strongly toward former groupmates with more positive histories of social interaction. Verified from the full text on 28 September 2026.

**Implemented (v0.2, [simulation.md §7 and §10](simulation.md#10-social-systems)), [M] for the structure, design assumptions for every number:** `bond` stands for relationship value and a directed per-pair `tension` for the inverse of compatibility. Tension rises with aggression, more in the target's view; it falls with reconciliation (most in high-bond pairs), grooming, support and meat sharing, and decays with a 21-day half-life. Higher tension lowers grooming, support and tolerance, and raises avoidance of dominants and aggression. Security is not modelled. Long-term memory is kept as structured monthly digests compressed into yearly ones and retained for life. This is a bounded bookkeeping stand-in for recognition memory, not a model of recall.

## 6. Hunting is a contingent social event

Mitani and Watts observed Ngogo hunting over **23 months**. Party size and the number of males predicted whether hunting occurred and whether attempts succeeded. Their study recorded **128 prey items** and describes reciprocal meat sharing. It does not justify a universal cooperative role script or a fixed success probability for all chimpanzees. [Primary study, abstract and author-hosted paper](https://pubmed.ncbi.nlm.nih.gov/10423261/), [author PDF](https://sites.lsa.umich.edu/mitani/wp-content/uploads/sites/152/2014/08/mitani_and_watts_1999.pdf)

**Proposed mechanism:** red colobus-inspired prey groups occupy connected canopy patches, perceive danger, and escape or defend. Chase incurs cost; kill resolution uses position and capability; prey can escape; meat is finite and ownership changes. Skill, canopy structure, prey age, and companions affect outcomes. A simplified v0 hunt event is explicitly an abstraction; visually following a chase is not validation of predation ecology.

## 7. Water access is its own affordance

Mackenzie et al. report Kanyawara tool use to access water that is out of reach. Direct drinking and tool-mediated access are different opportunities. [Primary study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12011317/), [author-hosted PDF](https://sites.lsa.umich.edu/cognitive-evolution/wp-content/uploads/sites/501/2025/04/2025-Mackenzie-etal-chimpanzee-drinking.pdf)

**Proposed mechanism:** streams, puddles, and tree holes have accessibility, stock, and refill. An inexperienced agent may drink at an accessible bank while being unable to extract tree-hole water. Leaf-sponging needs suitable material, a known technique, a reachable tool interaction, and practice. Do not infer water requirements or seasonal refill rates from this behavioral observation.

Sleep belongs in the daily budget. Samson and Hunt tested nest-tree biomechanics at **Toro-Semliki**, not Kibale. [Primary study](https://doi.org/10.1371/journal.pone.0095361)

**Proposed mechanism:** dawn/dusk and fatigue influence nest building and rest; canopy supports nest affordances. Exact Kibale nesting preferences remain **unknown** in this pass. v0.2 builds a new night nest each evening in a tree at least 9 m tall (a few eco-minutes of construction; [simulation.md §6](simulation.md#6-individuals)); tree preferences and learned construction are future detail.

## 8. Reproduction and mortality use distributions

Walker et al.'s Gombe sample of **36 known-age females** found mean sexual maturity at **11.5 years (range 8.5–13.9)** and first birth at **14.9 years (range 11.1–22.1)**, with maternal and dispersal effects. These are population estimates, not Kibale gates. [Primary study, abstract](https://pubmed.ncbi.nlm.nih.gov/29447755/)

Wallis reports Gombe gestation averaging **225.3 days (208–235)** and an average interbirth interval of **5.15 years**. [Primary study, abstract](https://pubmed.ncbi.nlm.nih.gov/9155740/)

**Proposed mechanism:** maturation, reproductive cycling, receptive partners, kinship, pregnancy, lactation, condition, and postpartum recovery constrain reproduction. Mating attempts are not conceptions. Birth does not follow every mating event, and fertility does not turn on at a universal birthday. Use configurable distributions and explicit reproductive state; do not model an arbitrary frame counter as gestation.

Wood et al. monitored Ngogo demography **1995–2016** and estimated life expectancy at birth of **32.8 years**, both sexes combined. The paper compares populations and accounts for uncertainty in estimated ages. Life expectancy is not maximum lifespan and not an individual's scheduled death. [Primary study, abstract and full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5526083/)

**Proposed mechanism:** age- and sex-dependent baseline hazards combine with energy deficit, dehydration, injury, disease, and encounter risk. For a hazard rate `h` per biological year and an interval `dt` years, use `p(death) = 1 − exp(−h × dt)`; never reuse a per-tick probability after changing tick size. Avoid double counting acute deaths inside a fitted all-cause hazard. v0.2 baseline hazards are fitted to Ngogo's reported first-year mortality and e15 (Wood et al. 2017; [simulation.md §13](simulation.md#13-reproduction-and-life-history)); this is a fit to summary figures, not a calibration. Calibrating survival requires a selected site's life table, exposure years, uncertainty, and sensitivity analysis. Preserve the deceased agent's biography and relationships.

## 9. Two graphs, one authoritative world

### World graph — engine-owned truth

Entities: chimps, food trees, water, canopy nodes, nests, prey groups, communities. Relations: parent/offspring, community membership, affiliation, kinship, proximity, canopy connectivity, current action, resource ownership. Engine systems own movement, physiology, resource stock, reproduction, death, and relation updates. The renderer reads snapshots; visual smoothing never writes biological state.

### Perceived graph — private to each chimp

Contains sensed entities and remembered episodes, each with `observedAt`, modality, estimated location, uncertainty, and provenance. Own needs are available through internal state; unseen fruit, hidden rivals, unknown parentage, or distant party membership are not magically known. Perception depends on range, occlusion, hearing, attention, and development. Memories decay in reliability and can be contradicted by a fresh observation. Belief and engine truth must be inspectable separately.

### Recurrent decision loop

1. Advance the world on a deterministic biological tick.
2. Perceive locally and update the actor's private memory.
3. Enumerate feasible action–target candidates from perceived affordances and capacities.
4. Decide among bounded candidates using the rule policy or local GLiNER2.5-Decide.
5. Recheck actor state, candidate membership, target freshness, and execution constraints against current world truth.
6. Execute a duration-limited action and record its outcome.
7. Learn from observed results, alter relationships, and repeat when interrupted or the action ends.

A recurrent loop means repeated decisions over persisted state. It does not imply GLiNER2.5-Decide has hidden recurrent memory, predicts every future action, or generates the world.

## 10. Local GLiNER2.5-Decide: rank an available step

The prototype uses the existing GHN adapter at `experiments/active_perception/decide_provider.py`, the `data/raw/decide-env/bin/python` interpreter, and cached **fastino/GLiNER2.5-Decide** checkpoint **7ee5da4c2415e32259bcdc0b1a7367c32ce8d6f6**. This contract was checked against local source and a real loaded worker on 28 September 2026. The model page could not be fetched by the web tool; no online model-card claim is used here. The initial Jev design informed the bounded-choice interface; hosted TypeSafe is no longer a runtime dependency.

**Implemented contract:** a resident JSON-lines worker accepts `{state, questions}`. A question has `type: "choice"`, `instructions`, and a `criteria` map of IDs to **strings**. The result includes the actual model, selected choice, local softmax distribution, and token usage. V0 sends one action question, at most **8** options and one best target per action type, retaining rest. The pinned GHN worker rejects inputs beyond **1280 tokens** instead of silently truncating. It verifies its installed package source and runtime identity before readiness.

**Private input:** focal age, stage, sex, community, maternal dependency, current action, needs, and skills; candidate-relevant remembered targets with relative distance and observation age. Hunger and thirst rise toward 1, energy toward 0 means depletion, and `socialNeed` is `1 - social`. The worker receives no full world or renderer state. IDs bind actual action–target pairs in engine code; the model cannot grant a skill or invent a target. The baseline selects which target represents each action type, so this is a constrained hybrid policy.

**Uncertainty:** local softmax concentration is uncalibrated for chimp behavior. It is not permission, evidence of biological truth, or a measured probability of an animal's next action. Current admission uses the selected label and engine validity, not a score threshold. Policy calibration remains future work.

### Freshness and scheduling

V0 carries actor ID, decision revision, ecological elapsed time, bounded candidates, and a controller generation that changes on reset, selection change, or disabling the model. v0.2: one resident worker serves a roster (the selected chimp, a focal set of up to 6, or everyone) through a single-flight client queue (selected chimp first, then longest waiting) with a ~60 ms minimum server spacing. Policies: **off** (rules only), **async** (the world keeps running; rules decide after a grace period; late answers are re-validated and applied only if still legal), **lockstep** (the clock stops at each model decision point until the model answers or a 6 s client timeout falls back to rules). Chimps outside the roster use rules. The server stops the worker after a **20-second** inference timeout to avoid binding late output to a later request; startup has a **120-second** deadline. Loading and inference failures are visible, with rules continuing and explicit retry available.

At admission, `applyDecision` rejects a changed actor revision, missing/dead actor, or pair no longer in the current eligible menu. Cancelled or reset requests cannot alter the next world. Fast-forward can age a response out even when wall-clock latency is short. The inspector displays applied/discarded counts and the last inference's timing, input tokens, and score.

MGOGO launches its own worker with offline Hugging Face settings, reusing GHN's interpreter and weights without changing GHN. No API key, hosted inference, or automatic CPU fallback is used. Model/checkpoint/runtime identity and full request/response receipts are saved under `artifacts/`; these do **not** include every admission and committed world event, so full replay is not yet implemented. A future scientific run should add perception revisions, dependency hashes, ecological deadlines, and immutable admission/outcome events.

## 11. Time has explicit units

Three clocks coexist:

| Clock | Meaning | Rule |
| --- | --- | --- |
| Wall time | Rendering and provider latency | Never determines biology |
| Ecological time | Travel, feeding, water, activity, day/night, fruiting | Fixed-step world clock; speed changes scale this clock coherently |
| Life-history time | Growth, gestation, lactation, aging, baseline mortality | Normally linked to ecological time; accelerated demonstrations label the divergence |

**V0 demonstration assumption:** natural age rate is **1**; life-course age rate is **365**, meaning **365 life-history days per ecological day** (approximately a biological year). Growth, ovarian cycles, gestation, lactational amenorrhea, weaning age, the dispersal hazard, slow rank drift and baseline age hazard use this life-history clock ([simulation.md §3](simulation.md#3-time)). Feeding, travel, needs, and tree resources stay on ecological time. At normal playback, one wall second advances one ecological minute, while locomotion is deliberately slowed relative to that minute clock to make trajectories visible. Both distortions prevent interpreting the demo as a realistic lifetime energy budget. Future scientific mode should run one coherent biological time or employ validated multi-rate/coarse-grained transitions that preserve daily budgets.

## 12. Prototype and future scope

### v0.2 current source structure

The v0.2 simulation lives in `src/sim/*` (public API re-exported from `src/simulation.ts`); [simulation.md](simulation.md) is its mechanism reference. The initial world contains **49 chimpanzees** in **3 synthetic communities** (West 22 with 7 adult males, East 15 with 4, North 12 with 3), **240 trees** of nine source-recorded species, a **forest stream** with **3 fords** and **6 bank drinking spots**, and **3 red colobus groups**, in a **160 m square**. The clock advances in fixed **15-second ticks** from 06:30 on 28 September (day-of-year 271). Founders have matrilines, male philopatry, mostly immigrant adult females and synthetic sires for immature founders; dead individuals stay in the genealogy. Temporary **parties** are derived from proximity; **Elo hierarchies**, coalitions, reconciliation, consolation, patrols, numerical assessment, hunting, meat sharing, mating, paternity from recorded copulations, female dispersal, weaning, orphaning and mortality are modelled; community **ranges move** after intergroup killings and relax back over months.

The interface provides camera views, canopy/range/perception layers, minimap, selected-agent inspection, roster, habitat notes, settings, and JSON world-snapshot export. v0.2 adds a HUD, time bar, society overlay (kinship forest, dominance ladders, bond network, alpha history), field experiments and a model panel. Local GLiNER2.5-Decide serves the configured roster under the off/async/lockstep policy described in section 10; readiness, decision source, per-decision traces (options, probabilities, the rules' pick, applied/re-validated/discarded) and agreement with rules remain visible.

v0.2 reproduction: swellings from ~10–11 y; conception probability rises from 13 y (adolescent subfecundity) and ends ~50 y; gestation **222–232 life-history days**; lactational amenorrhea ~3.5–4.5 y; conception is decided once per cycle from mating over the maximal-swelling phase; sires are drawn from recorded copulations (periovulatory ones weighted double). Mortality hazards are fitted to Ngogo (Wood et al. 2017: first-year mortality ~0.15; e15 ~35 y for females, ~21 y for males). It still has no finite water stock, learned tool repertoire, occlusion-aware hearing/vision, disease outbreaks or immutable replay history. The recent-event buffer and exported world snapshot are **not full replay**.

**Stylized for the compressed map (labelled in code):** ranges are ~50–65 m across instead of kilometres, so sight (15 m by day), hearing (pant-hoots 36 m) and party links (9 m) are scaled to roughly a third of a range; daily travel is ~2 range diameters instead of ~0.4; border patrols occur every 8–13 days (Ngogo ~9.7 days); hunts start only on community "hunting days" drawn at ~0.0045 per adult male per day (scaled from a code-comment figure of 62 hunts in 471 days with ~24 males at Ngogo, attributed to Mitani & Watts 1999 but not re-verified against the paper; section 6 describes that study as 23 months and 128 prey items); at accelerated life-history rates, time spent near males while maximally swollen stands in for copulations that do not fit between ticks. Demonstration visibility comes from the speed presets and the field experiments (playback, snake model, fig mast, storm, drought, remove-alpha, colobus), not from inflated base rates.

The initial source observations were followed by browser verification of applied local model choices. The local model identity and receipts are preserved in `artifacts/`. Engineering checks and real model execution do not establish ethological acceptance.

### Future design

Calibrated site profiles; mechanistic canopy locomotion; uncertainty-bearing sensory memories; finite water; observation and practice with local tool repertoires; richer allomaternal care; prey demography; disease; learned nest construction; home ranges that emerge from use rather than fixed circles; community fission; full event replay and counterfactual experiments. Not all belong in the first renderer or engine. (v0.2 already has derived parties, reproduction and maternal care, wounds, female dispersal and range shifts after killings, in simplified form; see [simulation.md](simulation.md), section 19 for its limitations.)

## 13. Observation, replay, and falsifiable checks

Persist seed, profile/configuration, clock rates, initial world, schema version, policy version, candidate sets, private snapshots, model answers, actual model ID, timing, rejection reasons, and committed world events. Replay provider answers from the log; a seed alone cannot reproduce a live external model. Readable traces should separate **decision requested**, **decision admitted**, **action started**, and **outcome observed**.

**Structural checks:** no dead actor acts; no negative resource stock; a young dependent does not autonomously patrol; immature reproductive capacity cannot conceive; unreachable tree-hole water is not consumed without an access affordance; hidden information does not appear in a private snapshot; expired model answers do not execute; resource mass and water bookkeeping remain bounded.

**Behavioral comparison:** use fixed seeds and controlled scenarios first. Compare rules and GLiNER2.5-Decide policies on the same candidate sets. Then evaluate activity budgets by age/sex, diet, travel, association/party size, patrol frequency, encounter outcomes, hunt success, learning trajectories, births, and survival curves against a chosen site and observation method. A plausible animation is not a fit. Absence of a behavior in an observation window is not always absence from the repertoire.

**Runtime benchmarks:** tick cost p50/p95/p99, decision queue age, provider latency, stale-answer rate, fallback rate, memory size, candidates per actor, request/response token use, and cost per biological hour. Publish simulated population size and machine/browser alongside performance. Thresholds and model probabilities must be assessed against appropriate expert judgments or observational outcomes; agreement with one researcher alone is not species-wide truth.

## 14. Rendering: locomotion and expression

The renderer animates what the simulation decides; these sources shape how it looks. Constants tagged in `src/render/creatures/*` cite them. The summaries come from the visual-plan research pass ([visual-plan.md](visual-plan.md) §3A, 2026-09-28); the primary papers were not re-read for the implementation.

- **Great-ape walking is not diagonal-sequence by rule.** Chimpanzees and other great apes shift between lateral- and diagonal-sequence walking; size-adjusted speed best predicts gait variables. *Finestone, Brown, Ross & Pontzer 2018, "Great ape walking kinematics: implications for hominoid evolution", Am J Phys Anthropol 166:43–55* ([PubMed](https://pubmed.ncbi.nlm.nih.gov/29313896/)). **Proposed / moderate** (captive animals). Used: each individual walks with a limb phase between 0.45 and 0.70 that drifts slowly over strides.
- **Vertical climbing gait.** Chimpanzees climbing trees at Chimfunshi used mostly lateral-sequence gaits (mean limb phase ~0.46), cycles of ~1.6 s and a duty factor of ~63% (~2.5 limbs holding). *Neufuss, Robbins, Baeumer, Humle & Kivell 2018, "Gait characteristics of vertical climbing in mountain gorillas and chimpanzees", J Zool 306:129–138* ([PDF](https://www.eva.mpg.de/documents/Elsevier/Neufuss_Gait_JZool_2018_3004328.pdf)). **Proposed / moderate** (semi-free-ranging). Used: the climb cycle (limb phase 0.46 ± 0.1 by individual, duty 0.63), driven by height climbed so descent runs feet first.
- **Arboreal posture.** Arm-hanging and quadrumanous climbing occur; brachiation is rare. *Hunt 1992, "Positional behavior of Pan troglodytes in the Mahale Mountains and Gombe Stream National Parks", Am J Phys Anthropol 87:83–105* ([Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1002/ajpa.1330870108)). **Proposed / moderate**. Used: about half of individuals hold a branch overhead with the free arm while feeding in a crown; no brachiation.
- **Facial expressions by muscle action.** ChimpFACS-based classification separates expression categories (bared-teeth, scream, pant-hoot, play face, pout, whimper and others) by facial action units. *Parr, Waller, Vick & Bard 2007, "Classifying chimpanzee facial expressions using muscle action", Emotion 7:172–181* ([PubMed](https://pubmed.ncbi.nlm.nih.gov/17352572/)). **Proposed / moderate** (captive animals). Used: brow raise or lower, compressed lips, lip-smacking while grooming, relaxed and full play faces, pout and whimper faces. Intensities are stylized.

**Stylizations (not sourced):** the hair highlight and halo shells (a look, not a measurement), gait cadence curves and caps, the gallop footfall order, transition times, gaze limits, blink intervals (2–10 s, 15% doubles), the grooming partner's posture shifts every 20–60 s, the stream's pool–riffle spacing, and the posture of a mother carrying a dead infant (the simulation's carry itself is tagged [M] in `src/sim/life.ts`).

## Source access and limits

Full text was inspected for the Kibale floristics study, Kanyawara feeding development, Gombe play, and official TypeSafe pages. Other claims here are supported by primary-paper abstracts, indexed excerpts, or author-hosted records where publisher/PMC fetching was limited. No paywalled full-text reconstruction, individual longitudinal dataset, current botanical survey, or field researcher validation was performed. A numerical calibration dataset and physiological rates remain **unknown**.

The architectural proposal has **moderate** confidence as an engineering design. Biological parameterization has **low** confidence until explicit site-specific calibration and held-out comparisons. The cited observations have **high** confidence within the stated study scope.

## Pending verification (realism research pass, 28 September 2026)

Proposed additions from the realism research pass. They are **not yet merged** into the sections above; a reviewer should accept or reject each. The full verified source list (121 sources, bibliography checked against Crossref, access level recorded as full text or abstract) and 97 quantitative targets are in [realism-design.md](realism-design.md) and `data/targets.json`. Keys below refer to that list.

**Corrections to figures used in code comments or docs:**

- **Ngogo hunting** [mitaniWatts1999] (full text): "62 hunts in 471 days" is 62 hunting *episodes and attempts*; 13 of the 49 successes were meat-eating or carcass finds, so directly observed hunts were 49. The paper reports 26 adult males (June 1998); "~24 males" comes from Watts & Mitani 2002 and Mitani & Watts 2001. The 128 prey items are confirmed. Success: 73% of all hunts, 78% of red colobus hunts.
- **Kanyawara intergroup encounters** [wilson2012] (full text): 120 encounters in 1992–2006 (102 acoustic, 15 visual, 3 physical), 85% acoustic only; ≈ 8 per year (derived). This confirms the figure previously held only in a code comment.
- **Ngogo patrol interval** [wattsMitani2001] (full text): one patrol per 9.7 days in 1998–99 (52 patrols) is confirmed. Gombe Kasekela and Taï North patrolled ~0.3 per week (as cited there).
- **Ngogo territorial expansion** [mitani2010] (full text): +6.4 km² (22.3%) after **21** killings (18 observed, 3 inferred) over 10 years, not 18.
- **Reconciliation band "14–22%"**: not verified. The verified wild value is a mean corrected conciliatory tendency of 14.4% (Mahale M group) [kutsukakeCastles2004] (abstract).
- **Adult feeding "~45–55%"**: not supported. Budongo Waibira males 36%, females 37% (continuous focal, 491 h) [villioth2025] (full text); Kanyawara females feed 309 ± 85 min per day [uwimbabazi2019] (full text).
- **Pant-hoot audibility "1–2 km"**: every source found is secondary (citing Reynolds & Reynolds 1965 and Ghiglieri 1984) [wilson2001] [wilsonWrangham2003]. Treat as low confidence.
- **Ngogo life table** [wood2017] (full text): life expectancy at birth 32.8 years (females 35.8, males 29.6); e15 35.1 / 20.98; first-year mortality 0.15. Confirms §8.

**New observations proposed for the evidence base** (population and access as in realism-design.md):

- Lethal aggression across 18 communities and 426 community-years: 152 killings, 73% of victims male; median community rate ≈ 0.08 per year (derived) [wilson2014].
- Ngogo community fission: polarization in 2015, two groups by 2018, then 24 attacks killing at least 7 mature males and 17 infants [sandel2026] (abstract; data CC0); earlier killings described in [sandelWatts2021] (full text).
- Kibale phenology: Ngogo 1998–2017 mean 8.7% of stems with ripe fruit [potts2020]; Kanyawara 1998–2013 mean 8.4% (data) [chapman2018]; diet 72% fruit at Ngogo [watts2012a] and 64% at Kanyawara [emeryThompson2020].
- Respiratory epidemics of human origin: Ngogo 2017 metapneumovirus killed 25 of 205 (12.2%); Kanyawara respirovirus 3 sickened 69% with no deaths [negrey2019]; Kanyawara rhinovirus C 2013 killed 5 of ~56 [scully2018].
- Spatial memory at Taï (*P. t. verus*): travel linearity 0.962 [normandBoesch2009]; nearest productive tree chosen only 30% of the time [normand2009]; approach to out-of-sight trees from a mean 537.5 m [ban2014].
- Hunting at Kanyawara vs Gombe: hunts on 7.9% vs 64.7% of colobus encounters; success 61.3% vs 62.3% [gilby2015].

## Food landscape and tree knowledge (stage C7a; accepted after the C7a review, 29 September 2026)

- **Transect rates and feeding-tree density** [janmaat2016] (full text, verified by the C7a review) [M].
  - Kanyawara transects meet a fruiting chimpanzee food tree every 97 m.
  - A large ripe crop turns up every 21 km over all transects, logged forest included; old-growth transects alone give one per 10 km.
  - Table I: 9.81 average-sized chimpanzee feeding trees per ha (DBH > 67 cm). The Discussion describes these as trees of at least feeding-tree size, not only food species. 58–62% of mature transect trees were food species, so food-species trees of that size are ≈ 6/ha (derived).
- **Long-term spatial memory of large fruit trees** [janmaat2013a] (full text) [M]: Taï chimpanzees monitor large fruit trees and remember feeding experiences across seasons.
- **Botanical skills and inspection mistakes** [janmaat2013b] (full text) [M]: Janmaat KRL, Ban SD, Boesch C 2013. Taï chimpanzees use botanical skills to discover fruit: what we can learn from their mistakes. *Animal Cognition* 16(6):851–860. [doi:10.1007/s10071-013-0617-z](https://doi.org/10.1007/s10071-013-0617-z). Chimpanzees inspect empty trees of species that are fruiting synchronously, so a species' fruiting state is learned and an empty tree is learned on arrival (cited by `knownTreesK` and C7a rule 8).
- **Stylization (C7a rule 8):** the daily list of the 40 best-known trees uses the true share of each species' trees in fruit and every tree's capacity, including trees no animal has seen: community omniscience about those 40 trees, labelled as such in `src/sim/foraging.ts`.

## Community fission (stage C9 pre-registration, 29 September 2026)

Sources for docs/realism-design.md "C9 pre-registration". Bibliographies are Crossref-checked in `data/targets.json`.

- **Ngogo fission and its aftermath** [sandel2026] (abstract; data CC0, Dryad doi:10.5061/dryad.sf7m0cgkg, in `data/raw/`). The network polarized in 2015 and two groups were distinct by 2018. Then came 24 attacks, killing at least 7 mature males and 17 infants of the Central group. The data are adult-male proximity and grooming scans (1998–2022), yearly networks, group labels for 219 individuals, quarterly patrols per group from 2016, and yearly group sizes.
- **Earlier Ngogo killings** [sandelWatts2021] (full text): lethal coalitionary aggression associated with the fission. The victim Basie had 12.5–24.8% yearly party association with the western males.
- **Gombe fission** [feldblum2018] (Feldblum JT, Manfredi S, Gilby IC et al. 2018. *American Journal of Physical Anthropology*, doi:10.1002/ajpa.23462). Subgrouping rose sharply in 1971–72 before the 1973 split, coinciding with a struggle among three top males. It is the source of a held-out pattern (T-FIS-2), so it is not used in the C9 design.
- **Stable male subgroups without a split** [mitaniAmsler2003] (Mitani J, Amsler S 2003. *Behaviour*, doi:10.1163/156853903770238355). Ngogo in 2003 had two stable male subgroups with overlapping ranges.
- **Community detection** [traag2019] (Traag VA, Waltman L, van Eck NJ 2019. From Louvain to Leiden: guaranteeing well-connected communities. *Scientific Reports*, doi:10.1038/s41598-019-41695-z) and **modularity** [newman2006] (Newman MEJ 2006. *PNAS*, doi:10.1073/pnas.0601602103): method sources.
- **Bond-weighted recruitment** [gruberZuberbuhler2013] (full text): allies were recruited to joint travel more often.

## Communication (stage C10, 29 September 2026)

Sources for the C10 pre-registration (docs/realism-design.md, "C10 pre-registration"). Bibliographies are Crossref-checked in `data/targets.json`. FT = full text, Abs = abstract.

- **Pant-hoot signatures** [desai2022] (FT) [M]. Desai NP, Fedurek P, Slocombe KE et al. 2022. Chimpanzee pant-hoots encode individual information more reliably than group differences. *American Journal of Primatology* 84(11):e23430. [doi:10.1002/ajp.23430](https://doi.org/10.1002/ajp.23430). Gombe and Kanyawara: caller identity from structural features 19.5% vs 6.9% chance (18 individuals); 35.8% vs 24.7% with context controlled; group differences are weaker than individual ones.
- **Drumming structure, eastern chimpanzees** [eleuteri2025] (FT) [M]. Eleuteri V et al. 2025. Chimpanzee drumming shows rhythmicity and subspecies variation. *Current Biology* 35(10):2448–2456.e4. [doi:10.1016/j.cub.2025.04.019](https://doi.org/10.1016/j.cub.2025.04.019). Median 4 hits per bout (mode 3); mean inter-hit interval ~229 ms; eastern drummers alternate short and long intervals. Data: Zenodo doi:10.5281/zenodo.15175482 (CC BY 4.0; not downloaded).
- **Drumming at Kanyawara and Taï** [clarkArcadi2004] (FT) [M]. Clark Arcadi A, Robert D, Mugurusi F 2004. A comparison of buttress drumming by male chimpanzees from two populations. *Primates* 45(2):135–139. [doi:10.1007/s10329-003-0070-8](https://doi.org/10.1007/s10329-003-0070-8). 61% of Kanyawara male bouts had no call (Taï 6%); no females drummed; no individual signature at Kanyawara.
- **Drumming context** [eleuteri2022] (FT) [M], held out (T-COM-7), not used in design: Eleuteri V et al. 2022. The form and function of chimpanzee buttress drumming. *Animal Behaviour* 192:189–205. [doi:10.1016/j.anbehav.2022.07.013](https://doi.org/10.1016/j.anbehav.2022.07.013).
- **Food calls and audience** [kalanBoesch2015] (Abs) [M]. Kalan AK, Boesch C 2015. Audience effects in chimpanzee food calls and their potential for recruiting others. *Behavioral Ecology and Sociobiology* 69(10):1701–1712. [doi:10.1007/s00265-015-1982-1](https://doi.org/10.1007/s00265-015-1982-1). Taï (*P. t. verus*): food calls at about half of feeding events; more calling with more males present.
- **Food calls and partners** [slocombe2010] (Abs) [M]. Slocombe KE et al. 2010. Production of food-associated calls in wild male chimpanzees is dependent on the composition of the audience. *Behavioral Ecology and Sociobiology* 64(12):1959–1966. [doi:10.1007/s00265-010-1006-0](https://doi.org/10.1007/s00265-010-1006-0). Males call more when an important social partner is nearby.
- **Gesture repertoire** [hobaiterByrne2011] (FT) [M]. Hobaiter C, Byrne RW 2011. The gestural repertoire of the wild chimpanzee. *Animal Cognition* 14(5):745–767. [doi:10.1007/s10071-011-0409-2](https://doi.org/10.1007/s10071-011-0409-2). Budongo Sonso: 66 gesture types; individual repertoires 10.0 ± 8.9 (1–41); juveniles 15.1, adults 5.1.
- **Gesture meanings** [hobaiterByrne2014] (FT) [M]. Hobaiter C, Byrne RW 2014. The meanings of chimpanzee gestures. *Current Biology* 24(14):1596–1600. [doi:10.1016/j.cub.2014.05.066](https://doi.org/10.1016/j.cub.2014.05.066). 19 meanings; 4.6 ± 3.0 meanings per gesture type. The type-to-meaning table is to be transcribed before C10b.
- Held out, not used in C10 design: [mitaniNishida1993] (pant-hoot rates and rank, Mahale; T-COM-1, -2, -4), [wilson2007] (rank and range zone, Kanyawara; T-COM-2, -3), [clarkWrangham1994] (arrival pant-hoots and status; T-COM-9).

## Real-data comparison sources (stage C12, 29 September 2026)

Downloaded with the user's approval into `data/raw/`, which is never published. Bibliographic details were checked on Crossref and Zenodo by the comparison agent. Only normalized, derived results appear in `docs/data/` and the guide.

- **Sandel et al. 2026, Ngogo space use.** Sandel, A., Lee, K. C., Angedakin, S., Birungi, C., Kanweri, D., Kalunga, D. et al. Space Use Analysis for "Lethal conflict after group fission in wild chimpanzees". Zenodo, https://doi.org/10.5281/zenodo.18603419 (CC BY 4.0).
  - Associated paper: *Science*, https://doi.org/10.1126/science.adz4944.
  - Coverage: 166,826 GPS fixes (1–2 per individual-day), 162 individuals, 2011–2023.
  - Supports home-range kernels, core fraction, year-to-year overlap and fission divergence.
- **Lemoine et al. 2023, Taï border movement** [lemoine2023]. Lemoine, S., Samuni, L., Crockford, C. & Wittig, R. M. Chimpanzees make tactical use of high elevation in territorial contexts. *PLOS Biology* 21(11): e3002350, https://doi.org/10.1371/journal.pbio.3002350 (CC BY 4.0).
  - Supplementary data s015–s017: time-ordered focal records with binned positions and rest/travel labels, plus border-related hill climbs.
  - Taï is the western subspecies (*P. t. verus*), not Kibale.
- **Lemoine et al. 2020, Taï territory size** [lemoine2020b]. Lemoine, S., Boesch, C., Preis, A., Samuni, L., Crockford, C. & Wittig, R. M. Group dominance increases territory size and reduces neighbour pressure in wild chimpanzees. *Royal Society Open Science* 7: 200577, https://doi.org/10.1098/rsos.200577 (CC BY 4.0).
  - Yearly 95% kernel territory sizes, 1997–2016.

- **Pusey & Schroepfer-Walker 2013, Gombe female ranges and 15-min focal paths** [puseySchroepferWalker2013]. Pusey, A. E. & Schroepfer-Walker, K. Female competition in chimpanzees. *Phil. Trans. R. Soc. B* 368: 20130077, https://doi.org/10.1098/rstb.2013.0077.
  - Data: Dryad, https://doi.org/10.5061/dryad.jg05d (CC0; downloaded by the user, `data/raw/dryad-jg05d/`).
  - Coverage: Kasekela community, 2000–2003. Locations of focal adults every 15 min during day-long follows (UTM), plus each female's first daily location when alone, by rank class (H/M/L).
  - Supports 15-min step lengths, turning angles, straightness, daily path length, and female core areas by rank class. Bibliographic details were checked on DataCite.
- **Patrol and phenology datasets** (all CC0, downloaded by the user; bibliographic details checked on DataCite):
  - Ngogo patrol dates: Dryad https://doi.org/10.5061/dryad.kk33f [langergraber2017]. The record has no observation effort, so monthly rates aren't comparable (T-PAT-8 not scorable).
  - Gombe patrols 1978–2007: Dryad https://doi.org/10.5061/dryad.z8w9ghxdb [massaro2022].
  - Ngogo post-fission quarterly patrols and male networks: Dryad https://doi.org/10.5061/dryad.sf7m0cgkg [sandel2026].
  - Ngogo tree phenology 1998–2017: Dryad https://doi.org/10.5061/dryad.gf1vhhmk8 [potts2020].

## Patrols (verified 29 Sep 2026; adopted for the C6 patrol corrections)

Proposed by the patrol evidence check (29 September 2026, C6 Step 1). Adopted by the integrator on 29 September 2026 (docs/realism-design.md §5.3.1, Amendment A). Items marked unverified or indexed-only below stay so.

**Corrections and confirmations (existing keys):**

- **Patrol predictors, Ngogo** [mitaniWatts2005] (full text). Setup: 72 patrol days vs 72 random non-patrol days, drawn from 623 follow-days in 1999–2003.
  - Male party size: +17% odds per male (e^b = 1.169, R² = 0.29).
  - Fruit: significant alone (R² = 0.05); not significant with party size in the model (P = 0.21).
  - Intruder pressure: no effect (P = 0.43). It was measured as days since the last encounter; last contact was longer ago on patrol days.
  - Oestrous females: no effect (P = 0.17).
  - Patrols last 2.13 ± 1.01 h, up to ~6 h.
  - **Proposed:** heard strangers do not raise the patrol hazard [M].
- **Patrol conduct and location, Ngogo** [wattsMitani2001] (full text).
  - Conduct: single file, silent, listening stops, vigilant until back toward the centre; males sometimes display loudly on return.
  - Location: patrols concentrated on the NE, E and SE edges. One sector was patrolled 20 times in 11 months (median interval 9 d); another went 158 d without a patrol.
  - Rank: patrol frequency and willingness to join (77% of opportunities) were independent of rank.
  - Females: essentially absent at Ngogo. At Taï (from Boesch & Boesch-Achermann 2000, cited there) adult females joined 57% of 38 patrols. This confirms the T-PAT-3 figure.
- **Participation, Ngogo 1996–2015** [langergraber2017] (full text).
  - Participation: males joined 33% of 284 patrols on average.
  - Predictors: paternity success and rank predicted participation. Close maternal kin and age (in the model) did not.
  - Group augmentation: 26% of patrolling events were by males with neither offspring nor close maternal kin.
  - Territory: 28.76 km² before and 35.16 km² after the 2009 north-eastern expansion.
- **Killings and expansion** [mitani2010] (indexed text now; full text in the realism pass).
  - 13 of 21 killings (61.9%) in 1998–2008 were north-east of the territory, in an area of heavy patrol activity.
  - The 2009 expansion (6.4 km², 22%) was into that area.
  - Corroborated in full text by [wood2025] and [langergraber2017].
- **Gombe participation and composition** [massaro2022] (full text).
  - Participation: males joined 74.5 ± 11.1% of 180 patrols in 1978–2007. Sighting frequency and hunting participation were the best predictors; alphas did not patrol more.
  - Composition: parties held a median of 8 adult males and 3 adult females.
  - Duration: median 88.5 min.
- **Kanyawara encounters** [wilson2012] (full text).
  - 63% of 120 encounters were in the south-east quadrant, timed by *Uvariopsis* and other southern foods.
  - Parties went further out with more males.
  - Low-ranking males dropped out on far trips.
- **Kanyawara playbacks** [wilson2001] (full text).
  - Setup: 26 trials, 1996–98.
  - Parties with ≥ 3 adult males chorused and approached. The speaker's location and male rank had no effect.
- **Kanyawara periphery** [wilson2007] (full text).
  - Periphery parties had a median of 5.9 adult males, vs 2.2 in the core.
  - 7 of 12 encounters occurred at the periphery.
- **Ngogo cases** [watts2006] and [sandelWatts2021] (full text).
  - 12 of 95 patrols ended in physical aggression.
  - A patrol returned to a contested fruit tree two days later and killed there.
  - After the fission, patrols moved to the new boundary.
- **Energetics** [amsler2010] (abstract only now; figures from the realism pass): longer travel and less feeding on patrols.

**New observations proposed:**

- **Oxytocin, Taï** (*P. t. verus*) [samuni2017] (full text).
  - Urinary oxytocin was higher before and during border patrols than in control periods, in both sexes.
  - The anticipation result rests on 6 individuals, 14 samples and 10 events, in one group. Direction unresolved: a correlate, not a cause.
  - Patrols at Taï are often preceded by grooming among several group members.
  - **Proposed:** no readiness state variable.
- **Female participation, Taï** [samuni2021] (full text).
  - Setup: 343 active encounters in 1997–2018; over 92% followed a patrol.
  - Participation: 86% of males and 48% of females took part.
  - Female state: maximal swelling raised participation and late gestation lowered it; a young infant had no clear effect.
- **Impact patrollers, Gombe** [gilbyWilsonPusey2013] (full text).
  - Setup: 232 patrols in 1976–2007.
  - Three males raised the odds that a periphery visit became a patrol (OR 2.1–4.1), controlling for party size.
  - Periphery visits: +17% odds per male.
- **Travel initiation, Budongo** [gruberZuberbuhler2013] (full text).
  - Setup: 456 travel events.
  - Initiations with a quiet "travel hoo" recruited followers more often; allies were recruited more often.
  - No sex difference in recruitment success.
  - This covers general travel, not patrols.
- **Unverified:** testosterone rising before and during Ngogo patrols [sobolewski2012]. Only an indexed excerpt was seen.

**New sources:**

- *new* gilbyWilsonPusey2013: Gilby IC, Wilson ML, Pusey AE 2013. Ecology rather than psychology explains co-occurrence of predation and border patrols in male chimpanzees. *Animal Behaviour* 86(1):61–74. [doi:10.1016/j.anbehav.2013.04.012](https://doi.org/10.1016/j.anbehav.2013.04.012) (FT, PMC4231443). A different paper from [gilby2013].
- *new* samuni2017: Samuni L, Preis A, Mundry R, Deschner T, Crockford C, Wittig RM 2017. Oxytocin reactivity during intergroup conflict in wild chimpanzees. *PNAS* 114(2):268–273. [doi:10.1073/pnas.1616812114](https://doi.org/10.1073/pnas.1616812114) (FT, PMC5240673).
- *new* samuni2021: Samuni L, Crockford C, Wittig RM 2021. Group-level cooperation in chimpanzees is shaped by strong social ties. *Nature Communications* 12:539. [doi:10.1038/s41467-020-20709-9](https://doi.org/10.1038/s41467-020-20709-9) (FT, PMC7822919).
- *new* gruberZuberbuhler2013: Gruber T, Zuberbühler K 2013. Vocal recruitment for joint travel in wild chimpanzees. *PLoS ONE* 8(9):e76073. [doi:10.1371/journal.pone.0076073](https://doi.org/10.1371/journal.pone.0076073) (FT, PMC3783376).
- *new* sobolewski2012: Sobolewski ME, Brown JL, Mitani JC 2012. Territoriality, tolerance and testosterone in wild chimpanzees. *Animal Behaviour* 84(6):1469–1474. [doi:10.1016/j.anbehav.2012.09.018](https://doi.org/10.1016/j.anbehav.2012.09.018) (indexed excerpt only; unverified).

## Food competition and party size (stage C7b, 29 September 2026)

Evidence for the C7b mechanisms ([staging/c7b-prereg.md](staging/c7b-prereg.md)). Bibliographic data checked against Crossref on 29 September 2026. "Abs" means abstract text only (publisher page or indexed abstract).

- **Ecological constraints on party size, Kanyawara** [chapman1995] (Abs) [M].
  - Setup: chimpanzees at Kibale and spider monkeys at Santa Rosa, 6 years each.
  - Adults spent their time in small subgroups that changed size and composition often.
  - The monthly size, density and distribution of food patches predicted subgroup size (multiple regression).
  - The model tested: group size is limited by travel costs, because larger groups deplete patches faster.
- **Party size tracks patch size, not habitat-wide food, Budongo** [newtonFisher2000] (Abs) [M].
  - Setup: 4 years of food-supply and party-size data.
  - Foraging party size fluctuated with the size of food patches.
  - Relation to habitat-wide food abundance: negative or none.
- **A feeding cost of grouping, Kanyawara** [emeryThompson2014] (Abs) [M].
  - Setup: over 11 years.
  - Receptive females raised the number of males in parties.
  - Females had lower urinary C-peptide, a sign of lower energy balance, when they associated with more males.
- **Patch residency and feeding parties, Kibale** [potts2011] (full text, author copy) [H].
  - Patch residency per visit: 27.0 min at Ngogo vs 46.2 min at Kanyawara (Mann–Whitney Z = −9.188).
  - Feeding party: 7.29 (1–40) at Ngogo, 8.39 (1–32) at Kanyawara.
  - Patch size: 63.38 vs 66.87 cm DBH.
  - The authors discuss giving-up densities and possible over-exploitation of patches at Kanyawara.
  - Not a target; C7b uses it as a consistency check, not a fit.
- **Crown fullness and food-tree density** [janmaat2016].
  - Among trees bearing ripe fruit, crowns more than half filled were at least 9× scarcer than others (abstract; confirmed in full text by the C7a review).
  - Old-growth transects meet one large ripe crop per 10 km; 21 km is the figure over all transects, logged forest included.
  - 58–62% of mature transect trees were chimpanzee food species (full text, C7a review finding 10). With Table I's 9.81 feeding-size trees/ha, that is ≈ 5.9 food-species trees of feeding size per ha (derived).
- **Marginal value theorem** [charnov1976] (theory) [M as applied].
  - A forager maximizing its long-term intake rate values a patch by its gain over travel plus handling time.
  - C7b applies it to trips to trees. The need cap is a design assumption.

**New sources:**

- *new* chapman1995: Chapman CA, Chapman LJ, Wrangham RW 1995. Ecological constraints on group size: an analysis of spider monkey and chimpanzee subgroups. *Behavioral Ecology and Sociobiology* 36(1):59–70. [doi:10.1007/BF00175729](https://doi.org/10.1007/BF00175729) (Abs).
- *new* newtonFisher2000: Newton-Fisher NE, Reynolds V, Plumptre AJ 2000. Food supply and chimpanzee (*Pan troglodytes schweinfurthii*) party size in the Budongo Forest Reserve, Uganda. *International Journal of Primatology* 21(4):613–628. [doi:10.1023/A:1005561203763](https://doi.org/10.1023/A:1005561203763) (Abs).
- *new* emeryThompson2014: Emery Thompson M, Muller MN, Wrangham RW 2014. Male chimpanzees compromise the foraging success of their mates in Kibale National Park, Uganda. *Behavioral Ecology and Sociobiology* 68(12):1973–1983. [doi:10.1007/s00265-014-1803-y](https://doi.org/10.1007/s00265-014-1803-y) (Abs).
- *new* charnov1976: Charnov EL 1976. Optimal foraging, the marginal value theorem. *Theoretical Population Biology* 9(2):129–136. [doi:10.1016/0040-5809(76)90040-X](https://doi.org/10.1016/0040-5809(76)90040-X) (theory; standard reference).
- potts2011 and janmaat2016 are already in the realism-design.md source table; the lines above add findings, not sources.

## Fallback foods, joint travel and travel energetics (stage C7c, 29 September 2026)

Evidence for the C7c mechanisms ([staging/c7b-prereg.md](staging/c7b-prereg.md) §6). Bibliographic data checked against Crossref on 29 September 2026.

- **Energy intake rates by food, Kanyawara females** [uwimbabazi2019] (full text, PMC7450825) [H].
  - Energy intake: ripe fruit 10.7 ± 1.3 kcal/min (figs 12.5, drupes 9.9), young leaves 6.2 ± 0.6, pith 3.4 ± 2.2.
  - Dry-matter feeding rate: 3.4, 2.1 and 1.8 g/min respectively.
  - Daily metabolisable energy intake ≈ 2,500 kcal, the same in drupe and fig months.
  - Feeding time 308.7 ± 85 min per day.
- **Fallback shares, Kibale** [potts2011] (full text, author copy) [H]: pith and stems 17.4% of feeding time at Kanyawara vs 1.0% at Ngogo; young leaves ~6.9% at Kanyawara. At Ngogo, leaves (mainly *Pterygota* saplings, 8.5% of feeding) are the fallback and pith is not [watts2012b].
- **Pith as the fallback energy source, Kanyawara** [wrangham1991] (Abs) [M].
  - Pith intake fell as fruit abundance rose and rose with rainfall; leaf intake did not track fruit.
  - Piths are low in sugar and protein and high in hemicellulose and cellulose, partly digestible.
  - They offer an alternative energy supply when fruit is scarce.
- **Herbs at Kibale are scarcer than at Lomako; party size is restricted while feeding on them** [malenky1994] (Abs) [M].
  - Kibale chimpanzees eat herbs as a fallback source of carbohydrate.
  - Party size while feeding on terrestrial herbs is restricted at both sites, but the relative strength of that constraint could not be determined.
- **Joint travel, Budongo Sonso** [gruberZuberbuhler2013] (full text, PLoS ONE) [H].
  - 166 travel initiations. Vocal initiations (with "travel hoos") recruited at least one follower in 55 of 77 (71.4%); silent ones in 30 of 89 (33.7%).
  - Initiators waited (stood motionless ≥ 5 s) in 58.4% of vocal and 53.9% of silent initiations.
  - They checked back (gazed 90–180° behind toward others) in 39.0% and 25.8%.
- **Cost of walking.**
  - Net cost of transport across 62 bird and mammal species: 10.7 · M^−0.316 J kg⁻¹ m⁻¹ (M in kg) [taylor1982] (Abs) [H as an equation].
  - Adult chimpanzees measured 0.14–0.29 ml O₂ kg⁻¹ m⁻¹ walking quadrupedally (individual values from the paper's table, seen only through an index snippet) [sockol2007] [M].
  - Taylor's equation gives 0.17 ml O₂ kg⁻¹ m⁻¹ (3.3 J kg⁻¹ m⁻¹) at 40 kg, inside that range.
- **Daily locomotor cost, Kanyawara** [pontzerWrangham2004] (Abs; the day ranges come from an indexed excerpt) [M]: wild chimpanzees spend about 10× more energy per day walking than climbing. Male day range was 2.4 km, and adult females and mothers about 2.0 and 1.9 km.

**New sources:**

- *new* wrangham1991: Wrangham RW, Conklin NL, Chapman CA, Hunt KD 1991. The significance of fibrous foods for Kibale Forest chimpanzees. *Philosophical Transactions of the Royal Society B* 334(1270):171–178. [doi:10.1098/rstb.1991.0106](https://doi.org/10.1098/rstb.1991.0106) (Abs).
- *new* malenky1994: Malenky RK, Wrangham RW 1994. A quantitative comparison of terrestrial herbaceous food consumption by *Pan paniscus* in the Lomako Forest, Zaire, and *Pan troglodytes* in the Kibale Forest, Uganda. *American Journal of Primatology* 32(1):1–12. [doi:10.1002/ajp.1350320102](https://doi.org/10.1002/ajp.1350320102) (Abs).
- *new* taylor1982: Taylor CR, Heglund NC, Maloiy GMO 1982. Energetics and mechanics of terrestrial locomotion. I. Metabolic energy consumption as a function of speed and body size in birds and mammals. *Journal of Experimental Biology* 97(1):1–21. [doi:10.1242/jeb.97.1.1](https://doi.org/10.1242/jeb.97.1.1) (Abs).
- *new* sockol2007: Sockol MD, Raichlen DA, Pontzer H 2007. Chimpanzee locomotor energetics and the origin of human bipedalism. *PNAS* 104(30):12265–12269. [doi:10.1073/pnas.0703267104](https://doi.org/10.1073/pnas.0703267104) (Abs; table values via index snippet, PMC1941460).
- *new* pontzerWrangham2004: Pontzer H, Wrangham RW 2004. Climbing and the daily energy cost of locomotion in wild chimpanzees: implications for hominoid locomotor evolution. *Journal of Human Evolution* 46(3):315–333. [doi:10.1016/j.jhevol.2003.12.006](https://doi.org/10.1016/j.jhevol.2003.12.006) (Abs).
- uwimbabazi2019, potts2011, watts2012b and gruberZuberbuhler2013 are already cited; the lines above add findings.
- **Route choice among many remembered goals** [janson2014] (Abs) [M] (stage C7d).
  - A review of three captive studies in which primates visited arrays of equally valuable goals.
  - The efficient paths observed are largely consistent with the simplest rule, visiting the nearest unused known resource.
  - Movement sequences fit best a rule that sums spatial information from all unused resources into one "gravity" measure, which guides travel to one destination at a time.
  - The review finds no clear evidence of multi-step route planning.
- *new* janson2014: Janson C 2014. Death of the (traveling) salesman: primates do not show clear evidence of multi-step route planning. *American Journal of Primatology* 76(5):410–420. [doi:10.1002/ajp.22186](https://doi.org/10.1002/ajp.22186) (Abs).
- **Unverified and not used as a value:** adult body mass. C7c uses 40 kg as a design value and reports 33–45 kg as a sensitivity range.

## Early life and maternal effects (chimpanzees)

Stage B7, WP1 research pass, 29 September 2026. This is evidence for stage C8 ([realism-design.md](realism-design.md) §5, row "Maternal care", and §8 Stage C8) and for T-DEM-14 and T-DEM-15. Nothing here is implemented. Today the code models losing the mother only as extra death risk for unweaned orphans under 3 (`hazardOrphan`, `src/sim/life.ts`).

Each entry was checked on 29 September 2026 against the full text (FT) or the abstract only (Abs). Tags rate the observation in its own population, not its transfer to Kibale:

- **[H]:** confirmed in full text, with n and statistics.
- **[M]:** abstract only, or a very small sample.
- **[L]:** a figure seen only in secondary material.

Taï chimpanzees are *P. t. verus*. Gombe, Mahale, Budongo and Kibale chimpanzees are *P. t. schweinfurthii*. Numbers marked UNVERIFIED were not seen in the source.

**Corrections to the claims brought into this pass:**

- **crockford2020:** "orphaned before 12" means the mother died when the son was 4 to 12, after weaning. These are not infant orphans.
- **samuni2020:** the maternal-rank effect contrasts the alpha female with all other mothers. Continuous rank was not significant.
- **hobaiter2014:** pooled across four sites, unrelated adults adopted more often than siblings (20 vs 14 of 36 cases). The sibling rule holds where an older maternal sibling exists and in East Africa. Taï differs.
- **murray2014:** mothers of sons spent more time in mixed-sex parties only in the first 6 months. That sons therefore meet adult males more is the authors' inference, not a measured outcome.
- **girardButtoz2021:** the stress-axis activation is a steeper diurnal cortisol slope in immatures orphaned within the previous 2 years. Immatures orphaned longer ago did not differ.
- **walker2018:** the paper reports orphan effects as hazard ratios. Orphan vs non-orphan ages appear only in figures, so they stay UNVERIFIED.
- **stanton2020:** n is not in the abstract; only a press release gives a total.

**Entries:**

- **Postweaning maternal loss and male reproduction, Taï** [crockford2020] (FT, PMC7500924) [H].
  - Population: 3 Taï communities, North (from 1982), South (from 1993) and East (from 2000).
  - n: 23 sexually mature males with known mothers (12 orphans, 11 not), 21 mothers, and 48 genetic paternities of offspring that survived at least 2 years. Orphans lost their mother at 4–12 y; weaning is at 4–5 y.
  - Method: Gaussian and Poisson GLMs with full-null model comparisons.
  - Age at first siring: 16.32 ± 2.00 y for orphans vs 12.93 ± 1.63 y (F3,19 = 15.454, P = 0.0008).
  - Offspring per conception opportunity: 0.08 ± 0.12 vs 0.2 ± 0.14 (χ² = 5.871, df = 1, P = 0.015).
  - Alpha tenure: less than half as long in orphans, a trend only (P = 0.068).
  - Definitions (Materials and Methods, "Behavioral data" and "Statistical analysis"):
    - Orphan: the reference point is the son's age when his mother died. A son is an orphan if she died before he was 12, the age at which Taï males travel more with adult males than with their mothers. All orphans in the sample lost her at 4–12 and reached at least 14.
    - Sample rules: males had at least 4 reproductive years, counted from age 10 (the youngest known siring age), and near-complete siring histories. Only offspring that survived to age 2 were counted as sired.
    - Per opportunity: the Poisson model counts offspring sired over the male's reproductive years (from age 10). It has two log offsets: the number of conceptions in the group that produced offspring surviving to age 2, and the inverse of the average number of males present per conception. The reported values are offspring per conception opportunity.
    - Age at first siring: the text does not say whether it is dated at conception or at birth, so this stays UNVERIFIED (the per-male data are in dataset S1, not read). The model's male-competition control averages over conceptions from age 10 to first siring.
- **Maternal loss and survival, Gombe** [stanton2020] (Abs) [M].
  - Population: two Gombe communities, over 50 years of demographic records.
  - n: UNVERIFIED. A Duke press release gives 247 chimpanzees [L]. Orphan counts by sex and age class were not seen.
  - Method: survival comparison by age at loss (0–4.99, 5–9.99 and 10–14.99 y).
  - Males orphaned in all three age classes survived less than non-orphans and died earlier than expected.
  - Females orphaned before 10 survived less. Females orphaned at 10–14.99 y were no more likely to die than non-orphans, and they lived longer after the loss than males orphaned at that age.
  - Hazard ratios: UNVERIFIED (no full-text access).
- **Orphaned sons after weaning, Mahale** [nakamura2014] (Abs) [M].
  - Population: Mahale Mountains, long-term demographic data. Years and n: UNVERIFIED (not in the abstract).
  - Finding: sons orphaned after weaning died younger than expected. Offspring younger than 4.5–5 y cannot survive the mother's death.
  - No effect size was seen.
- **Cortisol after maternal loss, Taï** [girardButtoz2021] (FT, PMC8208813) [H].
  - Population: 4 Taï communities, urine samples from 2000–2018 (East from 2003).
  - n, immatures (under 12): 7 recently orphaned (less than 2 y since the loss), 16 orphaned earlier and 36 non-orphans; 846 samples from 50 individuals. Some individuals fall into more than one class.
  - n, mature males: 11 orphaned before 12 vs 17 non-orphans; 2,184 samples.
  - Method: Bayesian mixed models of diurnal cortisol slope.
  - Recently orphaned immatures had a 58% steeper diurnal slope (−0.60 vs −0.38; interaction −0.22, 95% CI −0.03 to −0.48). Immatures orphaned longer ago did not differ from non-orphans.
  - Among 17 immature orphans, those who lost their mother before 5 had higher early-morning and late-afternoon cortisol.
  - Mature males showed no consistent difference by orphan status (P+ = 56%).
  - The authors read this as short-term adaptive calibration, not lifelong embedding. They suggest adoption may buffer the effect.
- **Lean mass and maternal presence, Taï** [samuni2020] (FT, PMC6945487) [H].
  - Population: 3 Taï communities (North, South and East), two decades of data.
  - n: 1,318 urine samples from 70 chimpanzees aged 4–15, including 18 orphans (mother lost after weaning and before age 10). The rank model used 414 samples from 48 subjects aged 4–10 and 29 mothers.
  - Method: linear mixed models of urinary creatinine corrected for specific gravity, a lean-mass proxy.
  - Orphans had less muscle mass than age-matched non-orphans (estimate −0.122 ± 0.046, χ² = 6.376, P = 0.012).
  - Offspring of subordinate mothers had less muscle mass than offspring of the alpha female (−0.292 ± 0.103, P = 0.006). Continuous maternal rank was not significant (P = 0.093).
  - The interbirth interval, a proxy for maternal investment, had no effect.
- **Neighbour pressure during pregnancy, Taï** [lemoine2020a] (FT, PMC6971690) [H].
  - Population: 4 Taï groups, 1997–2016 (54 group-years).
  - n: 81 offspring of 44 mothers (37 died); 71 interbirth intervals.
  - Method: mixed-effects Cox model with predictors averaged over the pregnancy; a linear mixed model for intervals.
  - Offspring survival: higher neighbour pressure during pregnancy raised mortality (b = 1.025 ± 0.391, P = 0.008, hazard-ratio 95% CI 1.51–4.85; full model LRT χ² = 9.50, df = 4, P = 0.04).
  - For survival to age 3, the neighbour-pressure term was marginal (z = 1.95, P = 0.051).
  - Averaged over the first 1, 2 or 3 years of lactation, the same predictors had no effect (P = 0.64–0.80). Maternal rank had no effect on survival (P = 0.55).
  - Intervals were longer under high neighbour pressure (estimate 86.96 ± 34.15, P = 0.037) and shorter with more mature males (P = 0.015).
  - Neighbour pressure index (STAR Methods, "Food availability and neighbor pressure index"; Results): NPI = mean(I × K) over the window × F.
    - Encounters: all intergroup encounters count, both vocal (281) and physical or visual (103).
    - I (incursion depth): the distance from the encounter to the territory centre, taken over the previous 12 months. It is expressed relative to the distance from the centre to the border of the 75% kernel (the core area).
    - K: how heavily the resident group had used the encounter location in the previous 12 months, read from its ranging kernel in 10% bands.
    - F: the mean encounter frequency, from the observation days between consecutive encounters, which controls for observation effort.
    - Window: 8.5 months of pregnancy for the survival models, and each female's own interval for the interval models.
    - The authors state that all three components rise with pressure. The exact transform that turns I's relative distance into a score that grows toward the centre is not given in the text, so it stays UNVERIFIED; it follows their ref. 26.
  - Survival model covariates (Quantification and Statistical Analysis; Table 1): a mixed-effects Cox model with each covariate averaged over the pregnancy.
    - Test predictors: number of mature males, neighbour pressure, number of weaned individuals (within-group competition), and a food availability index multiplied by territory size.
    - Controls: the mother's rank, her age at the birth, and the infant's sex. Mother and group identity are random effects. All continuous predictors are z-transformed.
    - Among the controls, an older mother raised offspring mortality (b = 0.596 ± 0.231, P = 0.010). Male infants tended to have lower mortality (b = −0.777, P = 0.051).
    - The sample includes 13 orphans (3 died). Offspring that died in the same month as their mother were excluded.
- **Mothers of sons are more gregarious, Gombe** [murray2014] (FT, PMC4280574) [H].
  - Population: Gombe focal follows, 1974–2011.
  - n: 9 mothers observed with both sons and daughters. First 6 months: 459 follows (25 sons, 18 daughters). Late infancy (6 months to 3.5 y): 1,836 follows.
  - Method: linear mixed models.
  - Daily party size: 7.49 with sons vs 5.34 with daughters in the first 6 months (P = 0.004), and 5.11 vs 4.21 in late infancy (P = 0.003).
  - Mixed-sex parties: mothers of sons spent more time in them in the first 6 months (F1,447 = 15.16, P = 0.0001), but not in late infancy (P = 0.12).
  - Male infants' number of social partners rose faster with party size (sex × party size, P = 0.014; 662 follows, 21 mothers).
  - Adult outcomes were not tested.
- **Adoption, Budongo Sonso and three other sites** [hobaiter2014] (FT, PMC4118915) [H].
  - Sonso, 1991–2012 (Results, re-read 29 September 2026): 18 adult females died or disappeared. 7 of them left dependent young under 12, 11 immature orphans in all.
    - The paper counts 7 of the 11 as adopted:
      - 1 was a 4-year-old female with no maternal sibling. An unrelated parous female adopted her after 11 months without consistent care.
      - 6 formed 3 pairs of immature maternal siblings. In each pair the older sibling (9–11 y) immediately cared for the younger (4–6 y). So 3 orphans cared for 3 others, and no mature group member gave care.
    - 4 were not adopted. 2 simply disappeared. A 10-year-old brother and his 4-year-old sister received no care and gave none to each other. She disappeared within 2 years and presumably died. He survived; he had travelled with the adult males for years.
    - Survival (confirmed in the text): 100% of the 7 counted as adopted vs 25% (1 of 4) of the others (Fisher P = 0.024). The 7 include the 3 older siblings who gave the care. Among orphans who received care from another chimpanzee, 4 of 4 survived (derived).
  - Four sites pooled (Sonso, Gombe, Mahale and Taï; 36 cases): unrelated adults adopted in 20 cases (55.6%), maternal siblings in 14 (38.9%) and other adult kin in 2. Unrelated adoption dominated at Taï and was a minority in East Africa.
  - In none of the 16 cases with an older maternal sibling present did an unrelated individual adopt.
  - Unrelated adopters took 5.2 ± 6.6 months to start care vs 0.3 ± 0.2 for siblings (t = 2.77, P = 0.010).
  - One-year survival depended only on the orphan's age (P = 0.017; N = 33): 42% of orphans under 4 survived vs 95% of those aged 4 or more.
- **Orphaned siblings, Ngogo** [reddyMitani2019] (FT, PMC7136970) [M] (4 pairs).
  - Population: Ngogo, observations 2014–2017. The mothers died in the respiratory outbreak of December 2016 to February 2017, which killed 25 chimpanzees ([negrey2019]).
  - n: 4 males aged 10–17 and their younger maternal siblings, observed for 9 months before and 8 months after the loss. The comparison group was 30 sibling pairs with living mothers.
  - Association and proximity rose with orphan status in negative binomial models: association +6.05 ± 1.79 (P = 0.004) and proximity +0.42 ± 0.19 (P = 0.027).
  - Grooming, reassurance and consolation also rose. Older siblings looked back for and waited for younger ones.
  - Long-term outcomes were not tested.
- **Female maturation, Gombe** [walker2018] (FT, PMC5819610) [H].
  - n: 36 known-age females; 27 entered the maternal-factor model for sexual maturity.
  - Method: Kaplan–Meier estimates with censoring; Cox models selected by AICc.
  - Orphan definition: the mother died before the daughter was 8.
  - Orphaning cut the hazard of reaching sexual maturity to 0.07 (β = −2.604 ± 1.126). It cut the hazard of first birth to 0.45 (model-averaged).
  - Mother's rank: the hazard ratio for maturity was 2.96 per SD of rank. Predicted median maturity was 9.0 y with a high-ranking mother vs 12.8 y with a low-ranking one; predicted median first birth was 14.2 vs 16.4 y.
  - UNVERIFIED: orphan vs non-orphan ages (figures only) and the number of orphans.
- **Sex differences in early aggression, Kanyawara** [sabbi2021] (FT, PMC8000022) [H].
  - n: 49 immatures under 9 (25 females, 24 males), from all-occurrence aggression records for 2005–2017. A further 25 (14 females, 11 males) were followed as focals in 2015–2017.
  - Aggression received rose faster with age in males (age × sex β = 0.115 ± 0.06, P = 0.04). Males received more than females by about 4–5 y.
  - The aggression a young chimpanzee displayed predicted the aggression it received (β = 2.694, P < 0.001). Sex did not mediate this link.
  - Time in parties with adult males, or near them, did not differ by sex. Males spent slightly less time more than 5 m from their mothers (β = −0.642 ± 0.32, P = 0.04), the opposite of the predicted risk.
  - The data end at age 9; there is no adult outcome.
- **Female rank and reproduction, Gombe** [pusey1997] (Abs) [M].
  - Population: Gombe, a 35-year field study.
  - Finding: high-ranking females had significantly higher infant survival, faster-maturing daughters and faster production of young. The authors attribute this to access to good foraging areas rather than less stress from aggression.
  - n, years and effect sizes: UNVERIFIED (abstract only). walker2018 confirms the rank–maturation effect in a larger sample.
- **Female rank and birth intervals, Gombe** [jones2010] (FT, PMC3192870) [H]. Cited by T-DEM-14.
  - n: 117 usable interbirth intervals from 42 females.
  - Method: Cox model with a per-mother frailty term.
  - Definition of "high-ranking" (Materials and methods, "Hazards analysis"; Results):
    - Mother's rank was taken at the midpoint of each interval from submissive pant-grunts received and given, following Murray et al. 2006, and coded high, middle or low.
    - The 25 intervals without enough rank data were coded middle.
    - After inspecting the plot, the authors collapsed middle and low into "not high" (a post hoc recoding).
    - The published 0.155 is the birth hazard for not-high vs high females (β = −1.867 ± 0.576, χ² = 10.51, P = 0.001).
    - With three rank levels, low rank was significant only at 0.05 < P < 0.1 (a 57.5% lower hazard).
  - UNVERIFIED: the rule that set the high/middle/low cut-offs. It is in Murray et al. 2006, which was not read.
- **Territorial expansion and reproduction, Ngogo** [wood2025] (FT, PMC12664014). Cited by T-LET-5.
  - Before/after split (Materials and Methods): the community began using the new territory in June 2009. The post-expansion period starts on 1 February 2010, 8 months (one gestation) later.
  - Comparisons use 2-year and 3-year windows on each side. The community had 154 members at the start of the post-expansion period.
  - Births: 15 in the 3 years before vs 37 after.
  - Birth risk ratio: 2.75 (95% credible interval 1.4–5.2) is for the 2-year windows; the 3-year windows give 2.3 (1.3–4.0). **Correction:** T-LET-5 pairs the 3-year birth counts with the 2-year ratio.
  - Infant death before age 3: 41% before vs 8% after (hazard ratio 5.7, 95% CI 1.50–21.51, P = 0.011).
  - UNVERIFIED: the exact end date of the pre-expansion window. The text does not say whether it closes at June 2009 or at 1 February 2010; details are in the SI, not read.

**Open gaps (do not implement):**

- **Violence exposure:** this pass found no wild-chimpanzee study linking growing up amid violence to violent adult behaviour. sabbi2021 stops at age 9 and shows that aggression received tracks the juvenile's own aggression. Do not model exposure to violence as a trait that carries into adulthood.
- **Stress is short-term:** the Taï cortisol effect lasts about 2 years after the loss in immatures and is absent in adult males [girardButtoz2021]. Do not model a permanent stress offset.
- **Serotonin gene × rearing:** the rhesus finding (rh5-HTTLPR × peer rearing on CSF 5-HIAA, in captive monkeys) [bennett2002] and the human 5-HTTLPR × stress hypothesis did not replicate in large samples. [culverhouse2018] pooled 31 data sets (38,802 people); [border2019] used samples of 62,138 to 443,264. There are no chimpanzee data. Do not add a genotype × rearing term.
- **Transmitted tolerance:** cultural transmission of tolerance rests on one baboon troop [sapolskyShare2004]. [testard2024] shows tolerance changing within adult lifetimes after an ecological disturbance, which is not transmission. Do not model inherited community-level tolerance.

**Sources** (keys already in `data/targets.json` and [realism-design.md](realism-design.md) are marked *targets*):

- *targets* crockford2020: Crockford C, Samuni L, Vigilant L, Wittig RM 2020. Postweaning maternal care increases male chimpanzee reproductive success. *Science Advances* 6(38):eaaz5746. [doi:10.1126/sciadv.aaz5746](https://doi.org/10.1126/sciadv.aaz5746) (FT, PMC7500924).
- *targets* nakamura2014: Nakamura M, Hayaki H, Hosaka K, Itoh N, Zamma K 2014. Brief communication: Orphaned male chimpanzees die young even after weaning. *American Journal of Physical Anthropology* 153(1):139–143. [doi:10.1002/ajpa.22411](https://doi.org/10.1002/ajpa.22411) (Abs).
- *targets* pusey1997: Pusey A, Williams J, Goodall J 1997. The influence of dominance rank on the reproductive success of female chimpanzees. *Science* 277(5327):828–831. [doi:10.1126/science.277.5327.828](https://doi.org/10.1126/science.277.5327.828) (Abs).
- *targets* walker2018: Walker KK, Walker CS, Goodall J, Pusey AE 2018. Maturation is prolonged and variable in female chimpanzees. *Journal of Human Evolution* 114:131–140. [doi:10.1016/j.jhevol.2017.10.010](https://doi.org/10.1016/j.jhevol.2017.10.010) (FT, PMC5819610). Also the §8 source.
- *targets* lemoine2020a: Lemoine S, Preis A, Samuni L, Boesch C, Crockford C, Wittig RM 2020. Between-group competition impacts reproductive success in wild chimpanzees. *Current Biology* 30(2):312–318.e3. [doi:10.1016/j.cub.2019.11.039](https://doi.org/10.1016/j.cub.2019.11.039) (FT, PMC6971690).
- *targets* jones2010: Jones JH, Wilson ML, Murray C, Pusey A 2010. Phenotypic quality influences fertility in Gombe chimpanzees. *Journal of Animal Ecology* 79(6):1262–1269. [doi:10.1111/j.1365-2656.2010.01687.x](https://doi.org/10.1111/j.1365-2656.2010.01687.x) (FT, PMC3192870).
- *targets* wood2025: Wood BM, Watts DP, Langergraber KE et al. 2025. Female fertility and infant survivorship increase following lethal intergroup aggression and territorial expansion in wild chimpanzees. *PNAS* 122(47):e2524502122. [doi:10.1073/pnas.2524502122](https://doi.org/10.1073/pnas.2524502122) (FT, PMC12664014).
- *new* stanton2020: Stanton MA, Lonsdorf EV, Murray CM, Pusey AE 2020. Consequences of maternal loss before and after weaning in male and female wild chimpanzees. *Behavioral Ecology and Sociobiology* 74(2):22. [doi:10.1007/s00265-020-2804-7](https://doi.org/10.1007/s00265-020-2804-7) (Abs, via Duke Scholars; bibliography checked on Crossref).
- *new* girardButtoz2021: Girard-Buttoz C, Tkaczynski PJ, Samuni L et al. 2021. Early maternal loss leads to short- but not long-term effects on diurnal cortisol slopes in wild chimpanzees. *eLife* 10:e64134. [doi:10.7554/eLife.64134](https://doi.org/10.7554/eLife.64134) (FT, PMC8208813).
- *new* samuni2020: Samuni L, Tkaczynski P, Deschner T et al. 2020. Maternal effects on offspring growth indicate post-weaning juvenile dependence in chimpanzees (*Pan troglodytes verus*). *Frontiers in Zoology* 17:1. [doi:10.1186/s12983-019-0343-8](https://doi.org/10.1186/s12983-019-0343-8) (FT, PMC6945487).
- *new* murray2014: Murray CM, Lonsdorf EV, Stanton MA et al. 2014. Early social exposure in wild chimpanzees: mothers with sons are more gregarious than mothers with daughters. *PNAS* 111(51):18189–18194. [doi:10.1073/pnas.1409507111](https://doi.org/10.1073/pnas.1409507111) (FT, PMC4280574).
- *new* hobaiter2014: Hobaiter C, Schel AM, Langergraber K, Zuberbühler K 2014. 'Adoption' by maternal siblings in wild chimpanzees. *PLoS ONE* 9(8):e103777. [doi:10.1371/journal.pone.0103777](https://doi.org/10.1371/journal.pone.0103777) (FT, PMC4118915).
- *new* reddyMitani2019: Reddy RB, Mitani JC 2019. Social relationships and caregiving behavior between recently orphaned chimpanzee siblings. *Primates* 60(5):389–400. [doi:10.1007/s10329-019-00732-1](https://doi.org/10.1007/s10329-019-00732-1) (FT, PMC7136970).
- *new* sabbi2021: Sabbi KH, Emery Thompson M, Machanda ZP, Otali E, Wrangham RW, Muller MN 2021. Sex differences in early experience and the development of aggression in wild chimpanzees. *PNAS* 118(12):e2017144118. [doi:10.1073/pnas.2017144118](https://doi.org/10.1073/pnas.2017144118) (FT, PMC8000022).
- *new* bennett2002 (gap only): Bennett AJ, Lesch KP, Heils A et al. 2002. Early experience and serotonin transporter gene variation interact to influence primate CNS function. *Molecular Psychiatry* 7(1):118–122. [doi:10.1038/sj.mp.4000949](https://doi.org/10.1038/sj.mp.4000949) (Abs).
- *new* culverhouse2018 (gap only): Culverhouse RC, Saccone NL, Horton AC et al. 2018. Collaborative meta-analysis finds no evidence of a strong interaction between stress and 5-HTTLPR genotype contributing to the development of depression. *Molecular Psychiatry* 23(1):133–142. [doi:10.1038/mp.2017.44](https://doi.org/10.1038/mp.2017.44) (Abs).
- *new* border2019 (gap only): Border R, Johnson EC, Evans LM et al. 2019. No support for historical candidate gene or candidate gene-by-interaction hypotheses for major depression across multiple large samples. *American Journal of Psychiatry* 176(5):376–387. [doi:10.1176/appi.ajp.2018.18070881](https://doi.org/10.1176/appi.ajp.2018.18070881) (Abs).

## Lactation energetics (chimpanzees; C8 lactation diagnosis, 29 September 2026)

Read for the C8 diagnosis of starving lactating females in the field profile (docs/staging/c8-lactation-diagnosis.md). Tags as in the early-life section.

- **Energy balance through lactation, Kanyawara** [emeryThompson2012] (Abs) [M].
  - n: 17 wild, unprovisioned mothers, Kibale; energy balance from urinary C-peptide of insulin, followed longitudinally.
  - C-peptide of nursing mothers was depressed for about 6 months postpartum, then showed a net increase through the second year.
  - Mothers in lower-quality foraging areas had lower C-peptide profiles than mothers in food-rich areas.
  - Cycling resumed only after a sustained period of energy gain.
  - No magnitude of the daily cost of lactation is given in the abstract.
- **Nursing and infant feeding by age, Ngogo** [badescu2022] (Abs) [M].
  - n: 72 immatures, Ngogo, Kibale.
  - Nursing time, rates and durations were highest for infants of 6 months or younger and did not change significantly from 6 months to 5 years; some 5–7-year-olds still nursed, at decreasing rates.
  - Infants under 6 months foraged little; foraging durations and time share rose with age.
- **Use in MGOGO.** Neither source gives a chimpanzee magnitude for the energy cost of lactation, so the coded constant lactation hunger term (+0.012/h, about +20% of the awake rate, also at night) is left as a design value; its constancy over the whole lactation is a stylization (the sources show the cost concentrated in the first months and recovery of energy balance during the second year).

**Sources:**

- emeryThompson2012: Emery Thompson M, Muller MN, Wrangham RW 2012. The energetics of lactation and the return to fecundity in wild chimpanzees. *Behavioral Ecology* 23(6):1234–1241. [doi:10.1093/beheco/ars107](https://doi.org/10.1093/beheco/ars107) (Abs).
- badescu2022: Bădescu I, Watts DP, Curteanu C, Desruelle KJ, Sellen DW 2022. Effects of infant age and sex, and maternal parity on the interaction of lactation with infant feeding development in chimpanzees. *PLoS ONE* 17(8):e0272139. [doi:10.1371/journal.pone.0272139](https://doi.org/10.1371/journal.pone.0272139) (Abs).

## Analogies from other primates (not used for targets)

**These are analogies only: never a target and never a parameter source.** Baboons and macaques differ from chimpanzees in life history, dispersal and ecology. These studies show what kinds of early-life effects exist in long-lived primates; they size nothing in MGOGO. Each was checked on 29 September 2026 (FT = full text, Abs = abstract).

- **Cumulative early adversity, Amboseli baboons** [tung2016] (FT, PMC4838827).
  - Population: *Papio cynocephalus*, Amboseli, Kenya; data 1983–2013.
  - n: 196 females observed from birth (73 with complete life histories). Six adversities were scored.
  - Females with 3 or more adversities died a median 10 years earlier than those with 0 or 1; median lifespan was 18.5 y.
  - Maternal loss before 4 alone gave a hazard ratio of 3.01 (95% CI 1.80–5.04).
  - Females with the most adversity were socially isolated as adults.
- **Mother's early adversity and her offspring, Amboseli** [zipple2019] (FT, PMC6759315).
  - Data 1976–2017: 687 offspring of 169 females.
  - Offspring whose mother had lost her own mother early died more before age 4 (hazard ratio 1.44, 95% CI 1.10–1.90, P = 0.009), independent of the offspring's own adversity. The offspring's own maternal loss gave 1.98 (1.53–2.56).
  - Maternal death in the offspring's years 2–4 predicted lower survival to age 2 only when the mother had high early adversity (hazard ratio 1.78 vs 1.21, the latter not significant).
- **Early adversity and adult social bonds, Amboseli** [lange2023] (FT, PMC10191438).
  - Data 1983–2019: 199 adult females.
  - Adult sociality mediated little. Bonds with females explained 10.6% (2.04 months) of the 1.60-year lifespan loss per adversity.
  - Strong bonds and high status buffered maternal loss. For example, females who lost their mother but had bonds with males 1 SD above the mean had an 18% lower hazard ratio than maternal-loss females with average bonds.
- **Transmission of infant abuse, captive rhesus** [maestripieri2005] (FT, PMC1172276).
  - Population: rhesus macaques in outdoor social compounds at the Yerkes Field Station. They were captive, not wild. The design was cross-fostering.
  - 9 of 16 females reared by abusive mothers abused their firstborn, vs 0 of 15 reared by non-abusive mothers (Fisher P = 0.0006). Transmission followed the rearing mother, not the birth mother.
- **A tolerant troop culture, Forest Troop baboons** [sapolskyShare2004] (FT, PMC387274).
  - Population: one wild savanna-baboon troop. Country not confirmed in the text read.
  - In 1983–1986 tuberculosis from a refuse dump killed all refuse-eating males (46% of adult males), who were the more aggressive ones.
  - By 1993 no males from 1983–1986 remained. Yet the 1993–1996 males still showed less aggression and a relaxed hierarchy, compared with Talek Troop (1993–1998) and Forest Troop before the deaths (1979–1982).
  - Resident females groomed and presented to newly arrived males sooner (5 transfer males vs 12 in the controls).
  - This is one troop, and the transmission mechanism is unresolved.
- **Tolerance after a hurricane, Cayo Santiago rhesus** [testard2024] (FT, PMC11995978). This is not an early-life study.
  - Data 2013–2022 (2020 excluded) on 790 adults.
  - Hurricane Maria (September 2017) destroyed 63% of the island's vegetation. Proximity rose and aggression fell for up to 5 years.
  - After the hurricane, each additional SD of proximity partners lowered mortality (hazard ratio 0.58, 95% CI 0.40–0.86). Before it, proximity did not predict survival (617 individuals, 111 deaths).
  - This shows adult tolerance adjusting to ecology, not tolerance transmitted between generations.

**Sources (all new):**

- tung2016: Tung J, Archie EA, Altmann J, Alberts SC 2016. Cumulative early life adversity predicts longevity in wild baboons. *Nature Communications* 7:11181. [doi:10.1038/ncomms11181](https://doi.org/10.1038/ncomms11181) (FT, PMC4838827).
- zipple2019: Zipple MN, Archie EA, Tung J, Altmann J, Alberts SC 2019. Intergenerational effects of early adversity on survival in wild baboons. *eLife* 8:e47433. [doi:10.7554/eLife.47433](https://doi.org/10.7554/eLife.47433) (FT, PMC6759315).
- lange2023: Lange EC, Zeng S, Campos FA et al. 2023. Early life adversity and adult social relationships have independent effects on survival in a wild primate. *Science Advances* 9(20):eade7172. [doi:10.1126/sciadv.ade7172](https://doi.org/10.1126/sciadv.ade7172) (FT, PMC10191438).
- maestripieri2005: Maestripieri D 2005. Early experience affects the intergenerational transmission of infant abuse in rhesus monkeys. *PNAS* 102(27):9726–9729. [doi:10.1073/pnas.0504122102](https://doi.org/10.1073/pnas.0504122102) (FT, PMC1172276).
- sapolskyShare2004: Sapolsky RM, Share LJ 2004. A pacific culture among wild baboons: its emergence and transmission. *PLoS Biology* 2(4):e106. [doi:10.1371/journal.pbio.0020106](https://doi.org/10.1371/journal.pbio.0020106) (FT, PMC387274).
- testard2024: Testard C, Shergold C, Acevedo-Ithier A et al. 2024. Ecological disturbance alters the adaptive benefits of social ties. *Science* 384(6702):1330–1335. [doi:10.1126/science.adk0606](https://doi.org/10.1126/science.adk0606) (FT, PMC11995978).
