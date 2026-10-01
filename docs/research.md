# ChimpBench — research and simulation contract

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

ChimpBench launches its own worker with offline Hugging Face settings, reusing GHN's interpreter and weights without changing GHN. No API key, hosted inference, or automatic CPU fallback is used. Model/checkpoint/runtime identity and full request/response receipts are saved under `artifacts/`; these do **not** include every admission and committed world event, so full replay is not yet implemented. A future scientific run should add perception revisions, dependency hashes, ecological deadlines, and immutable admission/outcome events.

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

## Calibration and validation methods (stage C11 pre-registration, 29 September 2026)

Method sources for docs/realism-design.md "C11 pre-registration" (bibliographies Crossref-checked in `data/targets.json`): pattern-oriented modelling [grimm2005] and the ODD protocol [grimm2020]; Morris screening [morris1991] with the improved design [campolongo2007]; method choice for agent-based models [tenBroeke2016]; history matching with emulators [vernon2010] [andrianakis2015]; ABC with regression adjustment [beaumont2002] and for individual-based models [vanderVaart2015]; Sobol total indices [saltelli2010]. These are methods, not evidence about chimpanzees.

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

## Hunting decision at colobus encounters (hunting fix, 1 October 2026)

Keys refer to the source list in [realism-design.md](realism-design.md) and `data/targets.json`; every figure below is already in the target registry (T-HUN-1 to T-HUN-9, P-HUN-4). No new source.

- **Hunts are decided at encounters** [gilby2015] (full text) [H]. The field statistic is the share of red colobus encounters (within 100 m in 15-min scans at Kanyawara, 50 m at Gombe) that become hunts: Kanyawara 7.9% of 2,461 encounters, Kasekela 64.7%, Mitumba 48.0%; Ngogo 37% (61 of 164) [mitaniWatts2001].
- **More males, more hunting** [gilby2015] [H]: odds per extra adult male +48% (Kanyawara), +8% (Kasekela), +72% (Mitumba). With an "impact hunter" present, 18.9% of Kanyawara encounters were hunted against 2.3% without. Not encoded: the model has no term for the number of males beyond the lead score it already had.
- **Kills per successful hunt** [M]: Ngogo 3.41 ± 1.79 (n = 32) [mitaniWatts1999] with 15.2 adult males present at hunts [wattsMitani2002]; Kanyawara 1.28, Kasekela 1.90, Mitumba 1.30 [gilby2015].
  - Used: each hunter other than the first captor makes a capture with probability (3.41 − 1) ÷ (15.2 − 1) = 0.17 (`huntExtraKillP`). The two Ngogo figures come from overlapping but different periods (1995–1998 and 1995–1999), and males present stand in for hunters. The binomial form is a design assumption.
- **Design assumptions (labelled in code):** at least 2 adult males in view to start a hunt (`huntEncMinMales`; the earlier 3 was a design value too); an "encounter" for an individual is a colobus group in sight that it did not perceive at its previous decision point; one consideration per encounter.
- **Known gap:** the observer records colobus encounters about 3 times as often as Kanyawara (about 11 against 3.7 per 100 follow-hours), so hunts per encounter (T-HUN-3) and hunts per community-year (T-HUN-1) cannot both sit in their bands (docs/simulation.md §12).

## Analogies from other primates (not used for targets)

**These are analogies only: never a target and never a parameter source.** Baboons and macaques differ from chimpanzees in life history, dispersal and ecology. These studies show what kinds of early-life effects exist in long-lived primates; they size nothing in ChimpBench. Each was checked on 29 September 2026 (FT = full text, Abs = abstract).

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

## Food landscape: tree size, crop size and patch use (party-size follow-up, 1 October 2026)

Read for the food-landscape design ([staging/food-landscape-prereg.md](staging/food-landscape-prereg.md)). Tags as in the sections above. "Derived" means computed here from a cited source; the script is named.

- **Tree diameter as the estimator of a fruit crop** [chapman1992] (indexed summary only; the abstract is not available) [M].
  - Diameter at breast height (DBH) was the most consistently accurate estimator of fruit abundance and had low between-observer variability; crown volume was neither precise nor accurate.
  - No exponent is given in the text read. Whether a crop scales with DBH or with basal area (DBH²) is not sourced here.
- **Tree sizes in the Ngogo phenology record** [potts2020] (data, Dryad gf1vhhmk8, CC0; derived, `artifacts/validation/party/` probe scripts, statistics only).
  - 1,007 monitored trees with a DBH: median 50 cm, 10th percentile 13, 90th 111, 99th 192, largest 277.
  - By species (median DBH; spread of log DBH): *Ficus mucuso* 98 cm (0.68), *Pseudospondias microcarpa* 81 (0.61), *Mimusops bagshawei* 79 (0.40), *Pterygota mildbraedii* 71 (0.54), *Ficus natalensis* 60 (0.50), *Chrysophyllum albidum* 60 (0.24), *Celtis durandii* 32 (0.35), *Uvariopsis congensis* 19 (0.19). 25–34 trees each.
  - Tree-months with ripe fruit: 15,689 of 176,057 (8.9%). The trees in fruit have a median DBH of 68 cm (90th percentile 132, 99th 200).
  - Concentration among fruiting tree-months: the largest 10% hold 23% of the summed DBH and 39% of the summed basal area (20%: 39% and 59%).
  - The record's ripe-fruit score is 1 in 97.5% of fruiting tree-months, so it carries almost no crop-size information.
- **A party visit, in feeding time** (derived from [potts2011]): 7.29–8.39 feeders × 27.0–46.2 min of patch residency = 3.3–6.5 chimp-hours of feeding per visit, in patches of 63–67 cm DBH. That patch size is the median of the trees in fruit in the Ngogo record (68 cm), so feeding parties of 7–8 use ordinary fruiting trees, not only giants.
- **Density of fruiting crowns** (derived from [janmaat2016] and [potts2020]): about 6–9.8 feeding-size food trees per ha × 8.7–8.9% in fruit = 0.5–0.9 fruiting crowns per ha. A fruiting food tree every 97 m of transect against a large ripe crop every 10–21 km makes large ripe crops about 0.5–1% of the fruiting trees met.

- **Travel initiations: what counts, who is alone, and persistence** [gruberZuberbuhler2013] (full text, PLoS ONE page, read 1 October 2026) [H; persistence M, 9 cases].
  - A travel event: the end of a non-locomotion activity, then locomotion of at least 10 m, ending when a non-locomotion activity starts. 456 events (275 with a travel hoo, 181 silent), 33 focal animals, Sonso community of 74.
  - Recruitment succeeded "if at least one individual followed the initiator": a travel party is two or more, the initiator included.
  - 51 of the 181 silent events were excluded because the focal was alone (32) or alone with dependent offspring (19). So at least 51 of 456 travel events (11%) were made by a solitary animal; the text gives no count for vocal events.
  - Persistence: in 9 cases the initiator failed to recruit and re-launched its effort shortly afterwards (mean 3.80 min, range 0–13 min).
  - The text read does not say how often an initiator left alone after a failed attempt.

**Sources:**

- *new* chapman1992: Chapman CA, Chapman LJ, Wrangham R, Hunt K, Gebo D, Gardner L 1992. Estimators of fruit abundance of tropical trees. *Biotropica* 24(4):527–531. [doi:10.2307/2389015](https://doi.org/10.2307/2389015) (indexed summary; bibliographic record checked against Crossref on 1 October 2026, which lists the first page only; the page range is from memory).
- potts2011, potts2020 and janmaat2016 are already cited; the lines above add derived statistics, not sources.

## Track E: energetics, daily rhythm and endocrine correlates (1 October 2026)

Evidence pass for Track E (IMPLEMENTATION_PLAN.md, "Track E: Emergence"). Nothing here is implemented. The same text is staged in [staging/e-sources.md](staging/e-sources.md); the proposed target rows (T-ENE, T-RHY, T-END) are in `docs/staging/e-targets.patch.json`.

**Rule applied.** Physiology and physics measured independently of behaviour may be a model input. Field values of behaviour are targets, never inputs.

**How to read the tags.**
- Bibliographic data (authors, year, journal, volume, pages, DOI) were checked against the Crossref API on 1 October 2026.
- FT = full text read (PMC or publisher page). Abs = abstract only. "Secondary" = the number was seen only as cited by another paper or in a search snippet.
- [H], [M], [L] rate the observation in its own population, not its transfer to Kibale.
- "Cross-species" = no chimpanzee value exists; the value is human or from other primates and enters the registry as *assumed*.
- "Derived" = arithmetic done here from the cited numbers.

### E.1 Summary table

#### E1 energy: inputs

| Quantity | Recommended value (range) | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Adult body mass, wild eastern chimpanzees | Males 39 kg, females 31.3 kg (Gombe medians). Mahale: 42.0 and 35.2 kg. Sensitivity range 31–42 kg | pusey2005 (Abs), ueharaNishida1987 (Abs) | [H] | input |
| Age at which mass growth slows | Females 10 y, males 13 y (Gombe) | pusey2005 (Abs) | [M] | input (growth knee) |
| Birth mass | 1.8 kg, not verified to a primary source | none | assumed | input |
| Kibale body mass | No value exists (animals are not weighed) | — | gap | — |
| Total energy expenditure (doubly labelled water), genus *Pan*, captive adults | Females 1,722 ± 363 kcal/d at 46.4 kg; males 2,145 ± 546 kcal/d at 57.9 kg. Derived: 97–102 × M^0.75 kcal/d | pontzer2016 (FT) | [H] captive; [M] as a wild value | target (T-ENE-8): a check on the ledger, never a set value |
| Basal metabolic rate, *Pan* | 1,214 kcal/d (46.4 kg), 1,401 kcal/d (57.9 kg): estimated from juvenile respirometry, not measured in adults. Derived: 67–68 × M^0.75, i.e. Kleiber × 0.96 | pontzer2016 (FT) | [M] | input |
| Kleiber equation | 70 × M^0.75 kcal/d | kleiber1947 (standard reference) | [H] as an equation; cross-species | input (fallback) |
| Physical activity level (TEE ÷ BMR), captive *Pan* | 1.4 females, 1.5 males | pontzer2016 (FT) | [M] | check |
| Activity multipliers of BMR | 1.25 rest and other, 1.38 feeding (as used for Taï by nguessan2009, from Leonard & Robertson 1997) | nguessan2009 (FT), leonardRobertson1997 (Abs) | assumed, cross-species | input |
| Cost of quadrupedal walking | 0.19 ml O₂ kg⁻¹ m⁻¹ (SE 0.013; individuals 0.14–0.29) = 3.8 J kg⁻¹ m⁻¹ (2.8–5.8), net, at 1.0 m/s | sockol2007 (FT) | [H] captive, n = 5 | input |
| Walking cost, general mammal equation | 10.7 × M^−0.316 J kg⁻¹ m⁻¹. Gives 2.9 at 59.8 kg, about 30% below the chimpanzee measurement | taylor1982 (Abs) | [H] as an equation | fallback only |
| Cost of vertical climbing | 49–70 J kg⁻¹ m⁻¹ of height. 70 = primate regression 107.4 × M^−0.119 extrapolated from ≤ 1.5 kg to 35 kg; 49 = m·g·h at 20% efficiency; the physical floor is 9.8 | hanna2008 (Abs), hannaSchmitt2011 (FT) | [L], cross-species | input |
| Walking speed, wild | 0.88 m/s males, 0.78 m/s females, 0.75 m/s with infant (Mahale, Hunt 1989 as cited) | nguessan2009 (FT), secondary | [L] | input |
| Energy intake rate by food | Ripe fruit 10.7 ± 1.3 kcal/min (figs 12.5, drupes 9.9), young leaves 6.2 ± 0.6, pith 3.4 ± 2.2; unripe fruit 9.0 ± 3.4, flowers 7.7 ± 1.0 | uwimbabazi2019 (FT) | [H] | input (already registered) |
| Dry-matter feeding rate | 3.4, 2.1 and 1.8 g/min (ripe fruit, young leaves, pith) | uwimbabazi2019 (FT) | [H] | input |
| Energy density of foods (derived) | Ripe fruit 3.1–3.2 kcal per g dry matter; young leaves 3.0; pith 1.9 | uwimbabazi2019 (FT), derived | [M] | input |
| Metabolisable-energy formula | 4 kcal/g protein and non-structural carbohydrate, 9 kcal/g lipid, 1.6 kcal/g fibre (NDF) | uwimbabazi2019 (FT), nguessan2009 (FT) | [M]; the fibre credit is likely too high | input |
| Water content of foods | No verified Kibale value | — | gap | — |
| Meat intake rate | 348 g/h; up to 1.9 ± 1.2 kg/h. Energy 115 kcal per 100 g (USDA value assumed for red colobus). Derived: 6.7 kcal/min (to about 36) | hardus2012 (FT), secondary | [L] | input |
| Gastric emptying | More than 3 h and less than 16 h | ardente2011 (Abs) | [M] captive | input (bounds) |
| Gut transit, first marker | 16.5 h mean | ardente2011 (Abs) | [M] captive | input |
| Mean transit time of markers | 38 h (34% fibre diet), 48 h (14% fibre diet): secondary, not confirmed in the abstract | miltonDemment1988 (Abs) | [L] as read | not for the energy pool |
| Energy cost of lactation | Human: milk 749 g/d × 2.8 kJ/g = 501 kcal/d; synthesis efficiency 0.80; total 626 kcal/d, of which 172 kcal/d from tissue | butteKing2005 (Abs) | [H] human; cross-species | input, assumed |
| Energy cost of pregnancy | Human: 321 MJ total (76,700 kcal, deposition included) for 12 kg gain; 90, 287 and 466 kcal/d by trimester | butteKing2005 (Abs) | [H] human; cross-species | input, assumed |
| Lactation and pregnancy as a multiplier | +50% and +25% of daily expenditure (Key & Ross 1999 as used for Taï) | nguessan2009 (FT), secondary | [L] | alternative, assumed |
| Energy cost of growth | 4.5 kcal per g gained (range 2.9–6.0), human infants | robertsYoung1988 (Abs) | [H] human; cross-species | input, assumed |
| Body fat | Females 9.0 ± 5.5%, males 8.4 ± 4.9% of body mass (captive *Pan*); wild animals are expected to be leaner | pontzer2016 (FT) | [M] captive | input (upper bound for reserves) |

#### E1 energy: targets

| Quantity | Field value | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Daily metabolisable energy intake, adult females | 2,479 ± 858 kcal/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-1) |
| Daily feeding time, adult females | 308.7 ± 85 min/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-2) |
| Daily dry-matter intake | 872.6 ± 289 g/d | uwimbabazi2019 (FT) | [H] | target (T-ENE-3) |
| Energy balance and fruit | Urinary C-peptide rises with fruit in the diet (519 samples, 13 males, Kanyawara); rises with food availability in both sexes at Taï | emeryThompson2009 (Abs), vale2020 (Abs) | [M] | target, direction (T-ENE-4) |
| Energy balance through lactation | Depressed for about 6 months after birth, net increase through the second year (17 mothers) | emeryThompson2012 (Abs) | [M] | target, direction (T-ENE-5) |
| Energy balance and males in the party | Females have lower C-peptide when they associate with more males | emeryThompson2014 (Abs) | [M] | target, direction (T-ENE-6) |
| Male feeding and mating effort | Males feed less on days with oestrous parous females (12 males, 11 months) | georgiev2014 (Abs) | [M] | target, direction (T-ENE-7) |
| Energy balance and rank | Low-ranking Kanyawara males had higher C-peptide than dominant males | emeryThompson2009 (Abs) | [M] | direction only (no row proposed) |
| Feeding and travel when food is scarce | Taï: shorter daily journey and more feeding time in periods of scarcity | nguessan2009 (FT abstract), vale2020 (Abs) | [M] | target, direction (T-ENE-9) |

#### E2 daily rhythm: inputs

| Quantity | Recommended value (range) | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Heating of dark fur in the sun | Dark pelage reaches 60 °C within minutes under the Budongo sun (an experiment on fur without physiological cooling) | kosheleff2009 (Abs) | [M] | input (heat load in sun) |
| Thermoneutral zone of chimpanzees | No value found | — | gap | — |
| Water intake per unit of energy | About 2.8 mL of water per kcal of energy intake in apes (zoo and sanctuary, similar to estimates for wild animals); humans about 1.5 | pontzer2021 (Abs) | [M] | input |
| Water from food | Rainforest apes typically get enough water from food and can go days or weeks without drinking | pontzer2021 (Abs) | [M] | input, direction |
| Water turnover in litres per day | Not read (full text not accessible). Derived from 2.8 mL/kcal: 3.6–4.5 L/d at 1,300–1,600 kcal/d | pontzer2021 (Abs), derived | [L] | input, assumed |
| Urination interval | 78 ± 32 min, adult males (Budongo) | wittig2015 (FT) | [M] | input (optional) |
| Sleep per night | 8.81 h asleep, with frequent awakenings (20 captive chimpanzees, video) | videan2006 (Abs) | [M] captive | input (sleep need) |
| Sleep-pressure model | Pressure rises during waking and falls during sleep; sleep starts at an upper threshold and ends at a lower one; both thresholds follow the circadian clock | daan1984 (Abs), borbely2022 (Abs) | [H] human; cross-species | input, assumed |
| Sleep-pressure time constants | Rise about 18.2 h (secondary); the decay constant was not verified | daan1984 (secondary) | [L] as read | input, assumed |
| Time to build a night nest | 2–5 min for adult great apes | khayer2025 (FT extract) | [M] | input |

#### E2 daily rhythm: targets

| Quantity | Field value | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Active day, nest to nest | 11 h 34 min males, 10 h 57 min lactating females (Budongo Sonso) | batesByrne2009 (in the registry) | [M] | target (T-RHY-1) |
| Active period by sex, state and season | Non-receptive females shorter than males; receptive females longer than males; females longer in the dry season; low-ranking males longer than higher-ranking males (Gombe 1975–1992) | lodwick2004 (Abs) | [M] | target, direction (T-RHY-2) |
| Leaving the nest before sunrise | 18% of departures (5 females, 179 days, Taï, fruit-scarce periods); earlier when breakfast is an ephemeral fruit and far away | janmaat2014 (FT extract) | [M] | target (T-RHY-3) |
| Time of night-nest building | "Around 18:00" at Kibale, "often observed around sunset" (general statement) | khayer2025 (FT extract) | [L] | target (T-RHY-4) |
| Activity at night | 1.80% of camera-trap activity is nocturnal across 22 sites, mostly in twilight hours; 3.3% of forest clips at Sebitoli, Kibale | tagg2018 (Abs), lacroux2022 (Abs) | [M] | target (T-RHY-5) |
| Drinking frequency | Gombe mothers: 788 drinks in 10,517 h (derived: 0.075 per hour, about 0.9 per 12-hour day); 0.001 of observation minutes; more in the dry season | nelson2022 (FT) | [H] | target (T-RHY-6) |
| Where they drink | Kanyawara, 14 years, 81 animals, 4,087 drinking events: streams 3,102 (76%), tree holes and buttress holes 382, puddles and footprints 511; 625 with a tool | mackenzie2025 (FT) | [H] | target (T-RHY-7) |
| Rest and ground use in heat | Resting and time on the ground both rise with temperature in the sun (30 adults, 247 h, Budongo); time in the sun starts to fall at about 30 °C and falls sharply at about 40 °C | kosheleff2009 (Abs) | [M] | target, direction (T-RHY-8) |
| Ground use by season | Bossou: 23.4% of time on the ground (2.9% in August to 42.1% in November); more on warm or dry days; only the day's maximum temperature was significant | takemoto2004 (Abs) | [M] | target, direction (T-RHY-8) |
| Leaf feeding by time of day | Ngogo: sapling leaves eaten more in the evening than in the morning | carlson2013 (Abs) | [M] | target, direction (T-RHY-10) |
| Hourly activity profile (feeding peaks, midday rest) | No verified quantitative source | — | gap | direction-only row at low confidence (T-RHY-9) |
| Behaviour in heavy rain | No quantitative source. Chimpanzees "hunch up in rain" (Goodall 1962, as cited by anderson2019) | anderson2019 (FT), secondary | [L] | gap |
| Nests and overnight weather | Thicker, deeper nests in cooler or wetter conditions; taller trees with denser canopy before rainy nights | alrazi2026 (Abs) | [M] | direction only |

#### E3 choice: theory

| Quantity | Statement | Source key | Evidence | Role |
| --- | --- | --- | --- | --- |
| Reward as drive reduction | The reward of an outcome is the reduction it brings in the distance of the internal state from its set point; seeking reward is then equivalent to keeping physiological stability | keramatiGutkin2014 (Abs) | theory | mechanism citation |
| Patch leaving | Marginal value theorem | charnov1976 (already cited) | theory | mechanism citation |

#### E4 endocrine correlates: targets and directions

All from wild chimpanzees. None is an input: each is a pattern the slow states should reproduce.

| State | Pattern | Effect size, n, site | Source key | Evidence |
| --- | --- | --- | --- | --- |
| Stress (glucocorticoids), males | Rises with rank | Estimate 0.494 (SE 0.168); 8,029 samples, 20 males, 20 years, Kanyawara. Positive in an earlier Kanyawara sample. No association at Taï (983 samples, 10 males) or Ngogo (faecal, 67 samples, 22 males) | muller2021 (FT), mullerWrangham2004a (Abs), preis2019 (FT extract), muehlenbeinWatts2010 (Abs) | [M], sites disagree |
| Stress, males | Higher when the hierarchy is unstable | Kanyawara: effect grows with rank (0.122, SE 0.044). Taï: higher in all males | muller2021, preis2019 | [M] |
| Stress, males | Higher with parous oestrous females present | Estimate 0.176 (SE 0.013), Kanyawara | muller2021 (FT) | [H] |
| Stress | Rises after a single aggressive interaction, in aggressor and victim | 112% ± 28 of the pre-event level against 85% ± 27 after rest; 9 males, 14 aggressions, 10 rests, 169 samples, Budongo | wittig2015 (FT) | [H] |
| Stress | Lower with a bond partner | 23% lower across contexts; 22% higher after intergroup encounters than after grooming; 17 animals, 394 samples, Budongo | wittig2016 (FT) | [H] |
| Stress, females | Lactating females: higher in months of low fruit consumption. Low rank: higher, most of all in lactation. Oestrous females: higher after male aggression | 6 years, Kanyawara (n not in the abstract) | emeryThompson2010 (Abs) | [M] |
| Stress and food, males | Negative correlation with food availability in one study; no effect of diet quality over 14 days in the 20-year data (−0.012, P = 0.873) | Kanyawara | mullerWrangham2004a (Abs), muller2021 (FT) | conflicting |
| Stress and heat | Cortisol varied with humidity, more at Fongoli (savanna) than Taï | 588 samples, 3 communities | wessling2018 (FT extract) | [M] |
| Stress | Higher in the morning than the afternoon | More than 500 samples, 11 males, Kanyawara | mullerLipson2003 (Abs) | [H] |
| Stress, time scale | Urinary peak 135–270 min after the event (window used); labelled cortisol peaks in urine within 5.5 h and in faeces within 26 h | Budongo; one captive male | wittig2015 (FT), bahr2000 (Abs) | [M] |
| Competitive arousal (testosterone) | Above baseline with parous oestrous females, not with nulliparous ones, not explained by mating or party size | Ngogo; Kanyawara (secondary) | sobolewski2013 (Abs), mullerWrangham2004b (secondary) | [M] |
| Competitive arousal | Rises with rank at Kanyawara and Ngogo; one Ngogo study finds no rank effect; at Ngogo the link runs through lean mass and testosterone is negatively related to aggression rate | 67 faecal samples, 22 males (Ngogo) | muehlenbein2004 (Abs), negrey2023 (Abs), sobolewski2013 (Abs), mullerWrangham2004b (secondary) | [M], studies disagree |
| Competitive arousal | Higher in hours and months with more pant-hooting | Kanyawara | fedurek2016 (Abs) | [M] |
| Competitive arousal | Higher on patrols | Ngogo; seen only as cited by others | sobolewski2012 (secondary) | [L], not verified |
| Competitive arousal and food | Short-term food changes do not lower it (11 males); wild males are below captive males | Kanyawara | mullerWrangham2005 (Abs) | [M] |
| Affiliation (oxytocin) | Higher after grooming with a bond partner than with a non-bond partner or no grooming, whatever the kinship | n not in the abstract | crockford2013 (Abs) | [M] |
| Affiliation | Higher after food sharing than after other social feeding, and higher than after grooming, whatever the bond | n not in the abstract | wittig2014 (Abs) | [M] |
| Affiliation | Higher after reconciliation and bystander affiliation than after aggression alone | Taï males | preis2018 (Abs) | [M] |
| Affiliation | Higher before and during intergroup conflict, in both sexes; linked to cohesion | Taï | samuni2017 (already cited, FT) | [M] |
| Affiliation, time scale | Not verified (the sampling window is in full texts that were not read) | — | — | gap |

### E.2 Gaps and known conflicts (E1)

The gaps for E2 and E4 are in E.5.

1. **Intake and expenditure do not match.** The Kanyawara intake estimate (2,479 kcal/d) is 1.5–1.9 times the expenditure that doubly labelled water implies for a 31–35 kg female (about 1,300–1,450 kcal/d at the captive activity level; about 1,600 kcal/d at an activity level of 1.75; derived).
   - Possible reasons: the fibre credit of 1.6 kcal/g on fruit that is 41.5% fibre (nguessan2009 says this credit is likely an overestimate); heavier animals at Kanyawara than at Gombe; lactation; error in feeding rates. The standard deviation of the intake estimate (858 kcal/d) is large.
   - Consequence: a ledger that conserves energy and is fed 10.7 kcal/min will be sated in far fewer than 309 minutes. Recommendation: keep intake rates as inputs, keep daily kcal and feeding minutes as targets, add no correction factor. If the targets miss, record it as a finding.
2. **No wild total energy expenditure.** No doubly-labelled-water study of wild chimpanzees exists. pontzer2014 reports that captive and wild primates have similar expenditure, across species.
3. **No adult basal rate was measured.** The *Pan* basal rate in pontzer2016 is a regression on 1930s respirometry of animals aged 2 months to 15 years.
4. **No Kibale body mass, and no wild growth curve read.** pusey2005's curves are in the paywalled full text. Recommendation: Gombe adult medians, growth knee at 10 y (females) and 13 y (males), birth mass 1.8 kg as *assumed*.
5. **No chimpanzee lactation, pregnancy or growth cost.** Human values enter as *assumed, cross-species*. Scaling by M^0.75 is a design assumption.
6. **No chimpanzee climbing cost.** The only primate measurements are on animals under 1.5 kg.
7. **No water content of Kibale foods.** uwimbabazi2019 reports dry matter only.
8. **No measured meat intake at Kibale.** The values are secondary and one is a generic food-table energy density.
9. **No stomach or meal capacity for any ape was found.**
10. **No wild body-fat value.** Reserves above about 9% of body mass as fat are unsupported.

### E.3 Sources: E1 energy

#### Body mass

- **Body mass, Gombe** [pusey2005] (Abs) [H].
  - Population and n: *P. t. schweinfurthii*, Gombe; 1,286 weighings of 31 males and 26 females aged 2–43 years, over 33 years.
  - Median adult mass: males 39 kg, females 31.3 kg.
  - Female growth slowed at 10 years, male growth at 13 years.
  - Mass was highest during frequent banana provisioning, higher in the wet season, and higher when the range was large and density low.
  - Rank correlated with mass in females, not in males.
  - Use in Track E: input for adult mass and the growth knee. The growth curves themselves were not read (paywalled).
- **Body mass, Mahale** [ueharaNishida1987] (Abs) [H].
  - 10 males and 9 females weighed, 1973–1980. Six adult males averaged 42.0 kg; eight adult females 35.2 kg.
  - Mass tended to fall late in the wet season.
  - Use in Track E: input for the sensitivity range of adult mass.
- **Body mass used for Taï** [nguessan2009] (FT), secondary: 46.3 kg adult males and 41.6 kg adult females for western chimpanzees, from Smith & Jungers 1997 [smithJungers1997] (Abs; the species table was not read). Not a Kibale value.

#### Expenditure

- **Total energy expenditure of apes** [pontzer2016] (FT, PMC4942851) [H] for captive animals.
  - Population and n: adults (10 years or older) in US zoos and Congo sanctuaries; 27 chimpanzees and 8 bonobos, analysed as genus *Pan*. Doubly labelled water over 7–10 days.
  - Females (n = 17): 46.4 ± 8.1 kg, fat-free mass 43.3 kg, body fat 9.0 ± 5.5%, expenditure 1,722 ± 363 kcal/d, estimated basal rate 1,214 kcal/d, estimated walking and climbing 102 kcal/d.
  - Males (n = 18): 57.9 ± 13.4 kg, fat-free mass 53.8 kg, body fat 8.4 ± 4.9%, expenditure 2,145 ± 546 kcal/d, estimated basal rate 1,401 kcal/d, walking and climbing 120 kcal/d.
  - Activity level (expenditure ÷ basal rate): 1.4 females, 1.5 males.
  - Six *Pan* subjects with negative calculated body fat were excluded from the fat figure.
  - The basal rate is estimated from published respirometry of chimpanzees aged 2 months to 15 years (Bruhn & Benedict 1936; Bruhn 1934), not measured in these adults.
  - A human-tailored equation gives ape values 11 ± 3% higher.
  - The paper states that wild apes will generally have lower body fat than these cohorts.
  - Derived: basal rate = 68.3 and 66.7 × M^0.75 kcal/d; expenditure = 96.9 and 102.2 × M^0.75 kcal/d. Scaled to Gombe masses: about 1,280 kcal/d (31.3 kg) and 1,600 kcal/d (39 kg).
  - Use in Track E: input for the resting rate and body fat; check on total daily expenditure (T-ENE-8).
- **Primate expenditure is low** [pontzer2014] (FT, PMC3910615) [H].
  - 17 primate species spend about 50% of the energy expected for a placental mammal of their mass.
  - Chimpanzees (sanctuary and zoo, n = 10): 57.1 kg, 2,386 kcal/d (an older equation than pontzer2016).
  - Captive and wild primate populations show similar expenditure.
  - Use in Track E: support for applying captive expenditure to wild animals.
- **Kleiber's equation** [kleiber1947] (standard reference; not read). Basal rate = 70 × M^0.75 kcal/d, as quoted by nguessan2009. Cross-species.
- **Energy budget method, Taï** [nguessan2009] (FT) [M].
  - Population: *P. t. verus*, Taï North group.
  - Expenditure was built from Kleiber's basal rate, activity multipliers (1.38 feeding, 1.25 other and rest, after Leonard & Robertson 1997), Taylor's walking equation and a human climbing equation; +25% for pregnant and +50% for lactating females (after Key & Ross 1999).
  - Result (abstract): food quality had the largest effect on energy balance; in scarce periods chimpanzees shortened the daily journey and fed longer.
  - These are model estimates from human and captive equations, not measurements.
  - Use in Track E: direction only (T-ENE-9); the multipliers are *assumed*.
- **Activity multipliers** [leonardRobertson1997] (Abs). Total expenditure of primates estimated from body size, resting metabolism and activity budgets. The multipliers themselves were not seen in the abstract.

#### Locomotion

- **Walking cost of chimpanzees** [sockol2007] (FT, PMC1941460) [H]. Extends the C7c entry, which had the values only from an index snippet.
  - n: 5 captive chimpanzees aged 6–33 years, 33.9–82.3 kg (mean 59.8 kg), on a treadmill at 1.0 m/s.
  - Quadrupedal: mean 0.19 ml O₂ kg⁻¹ m⁻¹ (SE 0.013); individuals 0.18, 0.18, 0.14, 0.29, 0.16.
  - Bipedal: mean 0.21 (SE 0.014). Humans: 0.05.
  - The cost was greater than expected for their body size.
  - Derived: 3.8 J kg⁻¹ m⁻¹ at 20.1 J per ml O₂ (range 2.8–5.8).
  - Use in Track E: input for walking cost.
- **Bipedal and quadrupedal costs are similar** [pontzer2014jhe] (Abs) [M]. Five captive chimpanzees; no cost value in the abstract. Direction only.
- **Climbing cost in primates** [hanna2008] (Abs) and [hannaSchmitt2011] (FT, PMC3156653) [M] for small primates, [L] for chimpanzees.
  - Five species from 0.16 kg (slender loris) to 1.46 kg (mongoose lemur), on a vertical treadmill.
  - Mass-specific climbing cost did not fall with body size: 107.4 × M^−0.119 J kg⁻¹ m⁻¹ (r = 0.858, P = 0.063; slope not significant).
  - Climbing cost about the same as walking under 0.5 kg and was nearly double in the larger species.
  - The physical cost of lifting the centre of mass is 9.8 J kg⁻¹ m⁻¹.
  - Derived: 70 J kg⁻¹ m⁻¹ at 35 kg, an extrapolation far outside the measured range.
  - Use in Track E: input for climbing cost, cross-species assumption.
- **Climbing as used for Taï** [nguessan2009] (FT), secondary: climbing taken as walking at 1.9 m/s (a human rock-climbing model), 0.12–0.13 kcal/s for adults, at a climbing speed of 0.5 m/s (from pontzerWrangham2004).

#### Intake and digestion

- **Intake rates and daily intake, Kanyawara females** [uwimbabazi2019] (FT, PMC7450825) [H]. Extends the C7c entry.
  - Period: January 2014 to June 2015.
  - Table 1 (kcal/min; dry g/min; n food items): ripe fruit 10.7 ± 1.3; 3.4 ± 0.4; 36. Drupes 9.9 ± 1.8; 3.0 ± 0.6; 24. Figs 12.5 ± 1.5; 4.2 ± 0.5; 12. Young leaves 6.2 ± 0.6; 2.1 ± 0.2; 19. Pith 3.4 ± 2.2; 1.8 ± 0.2; 13. Unripe fruit 9.0 ± 3.4; 3.0 ± 0.8; 7. Flowers 7.7 ± 1.0; 2.7 ± 0.3; 7. Seeds 6.9 ± 5.7; 2.3 ± 1.9; 4.
  - Table 2, ripe fruit (% organic matter): lipid 4.6, available protein 9.3, fibre (NDF) 41.5, non-structural carbohydrate 44.6. Young leaves: 0.5, 25.9, 43.1, 30.5. Pith: 0.4, 7.5, 58.1, 33.9.
  - Daily means: feeding 308.7 ± 85 min, dry mass 872.6 ± 289 g, energy 2,479.4 ± 858.1 kcal.
  - Daily dry mass and energy did not differ between drupe and fig months; feeding time was 20% lower in drupe months.
  - Energy formula: 4 × non-structural carbohydrate + 4 × available protein + 9 × lipid + 1.6 × NDF (kcal per 100 g organic matter).
  - Derived energy density: ripe fruit 3.2 kcal per g organic matter from Table 2; 3.1, 3.0 and 1.9 kcal per g dry matter from Table 1 (ripe fruit, young leaves, pith).
  - No water content and no body mass are reported.
  - Use in Track E: intake rates are inputs; the daily totals are targets (T-ENE-1 to 3).
- **Macronutrients of the chimpanzee diet, Kanyawara** [conklinBrittain1998] (Abs) [M]. The chimpanzee diet is higher in sugars and non-structural carbohydrate than the diets of sympatric monkeys, with similar fibre; chimpanzees take ripe fruit when it is abundant. No values in the abstract. Direction only.
- **Diet quality across sites** [hohmann2010] (Abs) [M]. Nutritional quality and gross energy of plant foods were similar across three chimpanzee populations and one bonobo population. Direction only: supports using Kanyawara food values elsewhere.
- **Gastric emptying and transit, captive** [ardente2011] (Abs) [M].
  - n: 7 adults (gastric emptying, barium spheres) and 11 (transit, dye marker), North Carolina Zoo.
  - Gastric emptying took more than 3 hours and less than 16 hours. Mean gastrointestinal transit time was 16.5 hours.
  - Use in Track E: input bounds for the gut-emptying time constant.
- **Passage kinetics, captive** [miltonDemment1988] (Abs) [M].
  - Abstract: more fibre shortened mean transit time; chimpanzee transit was longer than human transit.
  - Secondary (search snippet, not confirmed in the abstract): mean transit time 38 h on the 34% fibre diet and 48 h on the 14% fibre diet.
  - Use in Track E: not the time constant of energy absorption (it is the passage of indigestible markers through the whole tract).
- **Retention times, captive** [lambert2002] (Abs) [M]. Chimpanzees and four guenon species, 4 trials per subject with plastic markers. Relative to body mass, chimpanzee retention is short. No hours in the abstract (a secondary source gives about 31 h mean retention). Direction only.
- **Meat** [hardus2012] (FT), secondary [L].
  - Cites chimpanzee meat intake of 348 g/h (Wrangham & Conklin-Brittain 2003) and up to 1.9 ± 1.2 kg/h (Gilby 2006).
  - Uses 115 kcal per 100 g for red colobus (a USDA food-table value for squirrel or rabbit, via Wrangham & Conklin-Brittain 2003).
  - Derived: 6.7 kcal/min at 348 g/h.
  - [tennie2014] (Abs): no nutritional data exist on the flesh of chimpanzee prey.
  - Use in Track E: input for meat intake, low confidence.

#### Reproduction and growth

- **Human pregnancy and lactation** [butteKing2005] (Abs) [H] for humans; cross-species.
  - Pregnancy: 321–325 MJ in total for a 12.0 kg gain; 375, 1,200 and 1,950 kJ/d in the three trimesters. The total includes protein and fat deposition.
  - Lactation (exclusive breastfeeding): 2.62 MJ/d from 749 g/d of milk at 2.8 kJ/g and an efficiency of 0.80; 0.72 MJ/d can come from tissue; net increment 1.9 MJ/d.
  - Use in Track E: input for lactation and pregnancy cost, *assumed*.
- **Human growth cost** [robertsYoung1988] (Abs) [H] for humans; cross-species.
  - Deposition costs 1.17 kJ per kJ of fat and 2.38 kJ per kJ of protein.
  - Weight gain in infancy costs 18.7 kJ/g (4.5 kcal/g) on average, range 12.2–25.1 kJ/g (2.9–6.0 kcal/g).
  - Use in Track E: input for growth cost, *assumed*.
- **Comparative reproductive energetics** [emeryThompson2013] (bibliography only; not read). Listed as the review to consult for a chimpanzee lactation estimate.
- **Offspring growth and reproductive pace, Kanyawara** [emeryThompson2016] (Abs) [M]. Juvenile lean mass (urinary creatinine) was greater when the next sibling came later; low maternal energy balance in lactation predicted larger juveniles. Direction only.

#### Energy balance (targets)

- **C-peptide tracks fruit, Kanyawara males** [emeryThompson2009] (Abs) [M].
  - n: 519 urine samples from 13 adult males.
  - C-peptide was predicted by the amount of fruit and of preferred fruit in the diet.
  - C-peptide was very low during a respiratory epidemic despite good feeding conditions.
  - Kanyawara males had lower C-peptide than Ngogo males.
  - Low-ranking males had higher C-peptide than dominant males.
  - Use in Track E: target for energy balance against fruit (T-ENE-4); the rank result is direction only.
- **Energy balance, Taï** [vale2020] (Abs) [M]. One community, 12 months: C-peptide rose with food availability in both sexes; when food was abundant chimpanzees fed for less time and spent more energy. The rank effects came from a model "only close to significance". Target, direction (T-ENE-4, T-ENE-9).
- **Mating effort costs feeding, Kanyawara** [georgiev2014] (Abs) [M]. 12 males followed for 11 months: males fed less on days with oestrous parous females; the drop tracked aggression and copulation rates and did not depend on rank. Target, direction (T-ENE-7).
- **Lactation** [emeryThompson2012] and **males in the party** [emeryThompson2014]: already cited above ("Lactation energetics" and "Food competition and party size"). Targets T-ENE-5 and T-ENE-6.

### E.4 New source list (E1)

- *new* pusey2005: Pusey AE, Oehlert GW, Williams JM, Goodall J 2005. Influence of ecological and social factors on body mass of wild chimpanzees. *International Journal of Primatology* 26(1):3–31. [doi:10.1007/s10764-005-0721-2](https://doi.org/10.1007/s10764-005-0721-2) (Abs).
- *new* ueharaNishida1987: Uehara S, Nishida T 1987. Body weights of wild chimpanzees (*Pan troglodytes schweinfurthii*) of the Mahale Mountains National Park, Tanzania. *American Journal of Physical Anthropology* 72(3):315–321. [doi:10.1002/ajpa.1330720305](https://doi.org/10.1002/ajpa.1330720305) (Abs).
- *new* smithJungers1997: Smith RJ, Jungers WL 1997. Body mass in comparative primatology. *Journal of Human Evolution* 32(6):523–559. [doi:10.1006/jhev.1996.0122](https://doi.org/10.1006/jhev.1996.0122) (Abs; species table not read).
- *new* pontzer2016: Pontzer H, Brown MH, Raichlen DA et al. 2016. Metabolic acceleration and the evolution of human brain size and life history. *Nature* 533(7603):390–392. [doi:10.1038/nature17654](https://doi.org/10.1038/nature17654) (FT, PMC4942851).
- *new* pontzer2014: Pontzer H, Raichlen DA, Gordon AD et al. 2014. Primate energy expenditure and life history. *PNAS* 111(4):1433–1437. [doi:10.1073/pnas.1316940111](https://doi.org/10.1073/pnas.1316940111) (FT, PMC3910615).
- *new* pontzer2014jhe: Pontzer H, Raichlen DA, Rodman PS 2014. Bipedal and quadrupedal locomotion in chimpanzees. *Journal of Human Evolution* 66:64–82. [doi:10.1016/j.jhevol.2013.10.002](https://doi.org/10.1016/j.jhevol.2013.10.002) (Abs).
- *new* kleiber1947: Kleiber M 1947. Body size and metabolic rate. *Physiological Reviews* 27(4):511–541. [doi:10.1152/physrev.1947.27.4.511](https://doi.org/10.1152/physrev.1947.27.4.511) (standard reference; not read).
- *new* nguessan2009: N'guessan AK, Ortmann S, Boesch C 2009. Daily energy balance and protein gain among *Pan troglodytes verus* in the Taï National Park, Côte d'Ivoire. *International Journal of Primatology* 30(3):481–496. [doi:10.1007/s10764-009-9354-1](https://doi.org/10.1007/s10764-009-9354-1) (FT, publisher page).
- *new* leonardRobertson1997: Leonard WR, Robertson ML 1997. Comparative primate energetics and hominid evolution. *American Journal of Physical Anthropology* 102(2):265–281. [doi:10.1002/(SICI)1096-8644(199702)102:2<265::AID-AJPA8>3.0.CO;2-X](https://doi.org/10.1002/(SICI)1096-8644(199702)102:2%3C265::AID-AJPA8%3E3.0.CO;2-X) (Abs).
- *new* hanna2008: Hanna JB, Schmitt D, Griffin TM 2008. The energetic cost of climbing in primates. *Science* 320(5878):898. [doi:10.1126/science.1155504](https://doi.org/10.1126/science.1155504) (Abs).
- *new* hannaSchmitt2011: Hanna JB, Schmitt D 2011. Locomotor energetics in primates: gait mechanics and their relationship to the energetics of vertical and horizontal locomotion. *American Journal of Physical Anthropology* 145(1):43–54. [doi:10.1002/ajpa.21465](https://doi.org/10.1002/ajpa.21465) (FT, PMC3156653).
- *new* conklinBrittain1998: Conklin-Brittain NL, Wrangham RW, Hunt KD 1998. Dietary response of chimpanzees and cercopithecines to seasonal variation in fruit abundance. II. Macronutrients. *International Journal of Primatology* 19(6):971–998. [doi:10.1023/A:1020370119096](https://doi.org/10.1023/A:1020370119096) (Abs).
- *new* hohmann2010: Hohmann G, Potts K, N'Guessan A et al. 2010. Plant foods consumed by *Pan*: exploring the variation of nutritional ecology across Africa. *American Journal of Physical Anthropology* 141(3):476–485. [doi:10.1002/ajpa.21168](https://doi.org/10.1002/ajpa.21168) (Abs).
- *new* ardente2011: Ardente A, Chinnadurai S, De Voe R et al. 2011. Relationship between gastrointestinal transit time and anesthetic fasting protocols in the captive chimpanzee, *Pan troglodytes*. *Journal of Medical Primatology* 40(3):181–187. [doi:10.1111/j.1600-0684.2011.00468.x](https://doi.org/10.1111/j.1600-0684.2011.00468.x) (Abs).
- *new* miltonDemment1988: Milton K, Demment MW 1988. Digestion and passage kinetics of chimpanzees fed high and low fiber diets and comparison with human data. *Journal of Nutrition* 118(9):1082–1088. [doi:10.1093/jn/118.9.1082](https://doi.org/10.1093/jn/118.9.1082) (Abs).
- *new* lambert2002: Lambert JE 2002. Digestive retention times in forest guenons (*Cercopithecus* spp.) with reference to chimpanzees (*Pan troglodytes*). *International Journal of Primatology* 23(6):1169–1185. [doi:10.1023/A:1021166502098](https://doi.org/10.1023/A:1021166502098) (Abs).
- *new* hardus2012: Hardus ME, Lameira AR, Zulfa A et al. 2012. Behavioral, ecological, and evolutionary aspects of meat-eating by Sumatran orangutans (*Pongo abelii*). *International Journal of Primatology* 33(2):287–304. [doi:10.1007/s10764-011-9574-z](https://doi.org/10.1007/s10764-011-9574-z) (FT; used only for the chimpanzee values it cites).
- *new* tennie2014: Tennie C, O'Malley RC, Gilby IC 2014. Why do chimpanzees hunt? Considering the benefits and costs of acquiring and consuming vertebrate versus invertebrate prey. *Journal of Human Evolution* 71:38–45. [doi:10.1016/j.jhevol.2014.02.015](https://doi.org/10.1016/j.jhevol.2014.02.015) (Abs).
- *new* butteKing2005: Butte NF, King JC 2005. Energy requirements during pregnancy and lactation. *Public Health Nutrition* 8(7a):1010–1027. [doi:10.1079/PHN2005793](https://doi.org/10.1079/PHN2005793) (Abs).
- *new* robertsYoung1988: Roberts SB, Young VR 1988. Energy costs of fat and protein deposition in the human infant. *American Journal of Clinical Nutrition* 48(4):951–955. [doi:10.1093/ajcn/48.4.951](https://doi.org/10.1093/ajcn/48.4.951) (Abs).
- *new* emeryThompson2013: Emery Thompson M 2013. Comparative reproductive energetics of human and nonhuman primates. *Annual Review of Anthropology* 42:287–304. [doi:10.1146/annurev-anthro-092412-155530](https://doi.org/10.1146/annurev-anthro-092412-155530) (bibliography only).
- *new* emeryThompson2016: Emery Thompson M, Muller MN, Sabbi K et al. 2016. Faster reproductive rates trade off against offspring growth in wild chimpanzees. *PNAS* 113(28):7780–7785. [doi:10.1073/pnas.1522168113](https://doi.org/10.1073/pnas.1522168113) (Abs).
- *new* emeryThompson2009: Emery Thompson M, Muller MN, Wrangham RW, Lwanga JS, Potts KB 2009. Urinary C-peptide tracks seasonal and individual variation in energy balance in wild chimpanzees. *Hormones and Behavior* 55(2):299–305. [doi:10.1016/j.yhbeh.2008.11.005](https://doi.org/10.1016/j.yhbeh.2008.11.005) (Abs).
- *new* vale2020: Valé PD, Béné JCK, N'Guessan AK et al. 2021 (online 2020). Energetic management in wild chimpanzees (*Pan troglodytes verus*) in Taï National Park, Côte d'Ivoire. *Behavioral Ecology and Sociobiology* 75(1):1. [doi:10.1007/s00265-020-02935-9](https://doi.org/10.1007/s00265-020-02935-9) (Abs).
- *new* georgiev2014: Georgiev AV, Russell AF, Emery Thompson M et al. 2014. The foraging costs of mating effort in male chimpanzees (*Pan troglodytes schweinfurthii*). *International Journal of Primatology* 35(3–4):725–745. [doi:10.1007/s10764-014-9788-y](https://doi.org/10.1007/s10764-014-9788-y) (Abs).
- sockol2007, taylor1982, pontzerWrangham2004, uwimbabazi2019, emeryThompson2012 and emeryThompson2014 are already cited above; these entries add findings.

### E.5 Gaps and known conflicts (E2, E4)

1. **No thermoneutral zone or heat-stress threshold for chimpanzees.** Only behavioural responses to heat are documented (kosheleff2009, takemoto2004, pruetz2018). Recommendation: a heat load built from air temperature, sun exposure and exertion, entered as *assumed*; the behavioural responses stay targets.
2. **No water turnover in litres per day was read.** pontzer2021's full text was not accessible; only the ratio of 2.8 mL per kcal is in the abstract. No water content of Kibale foods was found, so the share of water that comes from food cannot be computed.
3. **No sleep need for wild chimpanzees.** Captive sleep is 8.81 h per night (videan2006); nights in the nest are about 12 h. The two-process model is human. Its decay time constant was not verified.
4. **No verified quantitative hourly activity profile.** The morning and late-afternoon feeding peaks and the midday rest are widely described, but no primary source with numbers was reached. Recommendation: register a direction-only row at low confidence, or wait for a source (Wrangham 1977 on Gombe is the usual citation; not read).
5. **Nest timing against sunset is weakly sourced.** One general statement for Kibale ("around 18:00"). Clock times for Toro-Semliki (enter 19:09, leave 07:20) and Fongoli (start 18:48) were seen only in search snippets and are not registered.
6. **No quantitative source for behaviour in heavy rain.**
7. **Drinking rate at Kibale.** mackenzie2025 gives counts but no observation hours in the text read, so no rate per day. The Gombe rate (nelson2022) is for lactating mothers at a drier site.
8. **Hormone time scales.** Only the urinary glucocorticoid window is verified (135–270 min, wittig2015). No half-life or window was verified for urinary oxytocin or testosterone.
9. **Sites disagree on rank and hormones.** Glucocorticoids rise with male rank at Kanyawara, not at Taï or Ngogo. Testosterone rises with rank in three analyses and not in a fourth. A row on rank can only be site-specific.
10. **Food and male stress conflict within Kanyawara.** An early study found a negative correlation with food availability; the 20-year data show no effect of diet quality.
11. **Wiring risk for E4 rows.** If the mechanism makes an event drive a state directly (aggression raises stress), the matching row is encoded and cannot count as validation. Rows where the pattern must arise from the mix of events (rank, instability, bond partners, parous oestrous females) are the informative ones.

### E.6 Sources: E2 daily rhythm

#### Heat and thermoregulation

- **Temperature, activity and ground use, Budongo** [kosheleff2009] (Abs) [M].
  - n: 30 adults observed for 247 h; 5-min records of shade and sun temperature, sky cover, sun exposure, activity and height.
  - Time on the ground: 26.5% for females, 41.5% for males.
  - Time on the ground and resting both rose with temperature in the sun; that temperature stayed the strongest predictor of ground use after controlling for seven other factors.
  - Continuous time in the sun fell with temperature: it began to fall at about 30 °C and fell markedly at about 40 °C.
  - Dark pelage without physiological cooling reached 60 °C within minutes under the same sun.
  - Use in Track E: the pelage result is an input for heat load; the behavioural responses are targets (T-RHY-8).
- **Ground use and microclimate, Bossou** [takemoto2004] (Abs) [M].
  - Population: *P. t. verus*, 3 focal animals.
  - Monthly mean time on the ground 23.4% (2.9% in August to 42.1% in November); more in warm or dry months.
  - Daily ground use rose with the day's maximum temperature and fell with minimum humidity; only maximum temperature was significant in the full model.
  - The author's reading: resting in trees in cool periods reduces thermoregulation costs, because it is warmer higher up.
  - Use in Track E: target, direction (T-RHY-8).
- **Night activity in a savanna, Fongoli** [pruetz2018] (Abs) [M].
  - 403 h on 40 nights, 2007–2013, *P. t. verus*.
  - More activity after moonrise or before moonset in fuller moon phases in the dry season, not in the wet season. Most night activity was travel or foraging.
  - Chimpanzees lack physiological mechanisms against heat stress and shift behaviour instead.
  - Use in Track E: direction only (heat pushes activity toward cooler hours).
- **Seasonal physiology, Fongoli and Taï** [wessling2018] (FT extract, publisher page) [M].
  - n: 368 urine samples at Fongoli and 220 at Taï; 3 communities.
  - Fongoli reaches 48 °C with 945 mm of rain per year; Taï averages 25.9 °C and reaches 36 °C.
  - Higher temperature predicted higher creatinine at Taï and weakly lower creatinine at Fongoli; rainfall raised creatinine at Fongoli.
  - Humidity affected cortisol at both sites, more at Fongoli.
  - C-peptide followed fruit availability at Taï and overall food availability at Fongoli.
  - Fongoli chimpanzees drink more often in periods of water scarcity.
  - Use in Track E: direction only for heat, water and stress.

#### Water

- **Water turnover of apes** [pontzer2021] (Abs) [M].
  - Isotope-depletion water turnover in zoo and sanctuary chimpanzees, bonobos, gorillas and orangutans, against 5 human populations.
  - Turnover scaled with energy expenditure, physical activity, temperature, humidity and fat-free mass.
  - Humans had 30–50% lower turnover than apes after those controls.
  - Apes: about 2.8 mL of water per kcal of energy intake, similar in captive animals and in estimates for wild ones; humans about 1.5.
  - Rainforest apes typically get enough water from food and can go days or weeks without drinking.
  - The litres per day by species are in the full text, which was not read.
  - Use in Track E: input for water need per unit of energy.
- **Drinking by lactating mothers, Gombe** [nelson2022] (FT, accepted manuscript) [H].
  - 41 years of mother–infant follows; all occurrences of drinking free water; 10,517 h of observation of mothers.
  - Drinks counted: 301 in early lactation (25 mothers), 297 in middle lactation (25), 190 in late lactation (22). Mean share of observation minutes with drinking: 0.001 (± 0.002) in each stage.
  - Mothers drank more in the dry season. Low-ranking mothers drank more than others in late lactation. Offspring drank more in the dry season and with age.
  - Derived: 788 drinks in 10,517 h = 0.075 per hour, about 0.9 per 12-hour day.
  - Use in Track E: target for drinking frequency (T-RHY-6).
- **Drinking sources, Kanyawara** [mackenzie2025] (FT, PMC12011317) [H]. Extends §7.
  - 14 years of all-occurrence drinking records from 81 chimpanzees (47 females, 34 males).
  - 4,087 drinking events: streams 3,102, tree holes 356, buttress holes 26, puddles 299, animal footprints 212. 625 events used a tool (604 leaf sponges).
  - Females were seen drinking more often than males; stream drinking rose with age.
  - No observation hours are given in the text read, so no rate per day.
  - Use in Track E: target for the share of drinking by source (T-RHY-7).

#### Sleep, nests and the active day

- **Active period, Gombe** [lodwick2004] (Abs) [M].
  - Adults, 1975–1992; effects of sex, reproductive state, rank and season on the time between nests.
  - Non-receptive females had shorter active periods than males; receptive females had longer ones than males.
  - Rank did not matter for non-receptive females; high- and middle-ranking males had shorter active periods than low-ranking males.
  - Non-receptive females were active longer in the dry season; males showed no seasonal effect.
  - No durations are in the abstract.
  - Use in Track E: target, direction (T-RHY-2).
- **Active day, Budongo** [batesByrne2009] (in the registry): 11 h 34 min for males, 10 h 57 min for lactating females. Today this is the parameter `activeDayH`; Track E turns it into a target (T-RHY-1).
- **Leaving the nest, Taï** [janmaat2014] (FT extract) [M].
  - 5 adult females, 275 full days in three fruit-scarce periods (departure model: 179 days).
  - 18% of departures were before sunrise.
  - Departure was earlier when the breakfast fruit was very ephemeral (figs), and more so when it was farther away.
  - Interval between the nest grunt and nest building: 19 ± 23 min when alone with offspring, 30 ± 27 min in a party.
  - Use in Track E: target (T-RHY-3).
- **Nest building, Ngogo** [khayer2025] (FT extract) [L] for timing.
  - General statements: nest building is often seen around sunset; weaned chimpanzees typically start their night nests around 18:00; adult great apes take 2–5 min on average.
  - The study itself is about day nests of 72 immatures.
  - Use in Track E: target for nest timing, low confidence (T-RHY-4); input for the time a nest takes.
- **Nocturnal activity, 22 sites** [tagg2018] (Abs) [M]. Camera traps: ground activity at night at 18 of 22 sites, 1.80% of all chimpanzee activity, at all hours but mostly in twilight; more likely with higher daily temperature. Target (T-RHY-5).
- **Nocturnal activity, Sebitoli (Kibale)** [lacroux2022] (Abs) [M]. Camera traps for 15 months, 1,808 chimpanzee clips: 3.3% of forest clips were at night, against 41.8% in maize fields. Target (T-RHY-5), forest value only.
- **Night awakenings, Mahale** [zamma2014] (Abs) [M]. Sounds were heard on every one of 5 nights (128 events). Direction only: sleep is not continuous.
- **Sleep in captivity** [videan2006] (Abs) [M]. 20 captive chimpanzees, night video: 8.81 h of sleep per night, with frequent awakenings; older animals slept longer; temperature and humidity changed sleep duration and quality. Input for sleep need.
- **Comparative sleep** [nunnSamson2018] (Abs). Humans sleep least of 30 primates studied. Direction only.
- **Two-process model of sleep** [daan1984] (Abs), [borbely2022] (Abs) [H] for humans; cross-species.
  - A sleep variable S rises during waking and falls during sleep.
  - Sleep begins when S reaches an upper threshold and ends at a lower one; both thresholds follow one circadian pacemaker.
  - Time constants come from EEG slow-wave power. Secondary: the rise constant is 18.2 h. The decay constant was not verified.
  - The 1982 paper (Borbély AA, *Human Neurobiology* 1:195–204) has no DOI in Crossref; its details were not verified and it is cited through borbely2022.
  - Use in Track E: input for sleep pressure, *assumed*.
- **Nests and weather** [alrazi2026] (Abs) [M]. Eastern chimpanzees (site not named in the abstract): nests in warmer, less windy spots; thicker and deeper nests when cooler or wetter; taller trees with denser canopy before rainy nights; overnight weather predicted nesting better than weather at building time. Direction only.
- **Review of ape nesting and sleep** [anderson2019] (FT, author copy). Used only for the statement that chimpanzees hunch up in rain (Goodall 1962, as cited). [fruth2018] (FT, author copy): no timing values.
- **Leaf feeding by time of day, Ngogo** [carlson2013] (Abs) [M]. Leaves of two sapling species were eaten more in the evening than in the morning, when their sugars are higher and fibre lower. Target, direction (T-RHY-10).

### E.7 Sources: E3 choice (theory)

- **Homeostatic reinforcement learning** [keramatiGutkin2014] (Abs; open access). Primary reward is defined as an outcome that fulfils a physiological need. Seeking reward is then equivalent to keeping physiological stability. Discounting moves the animal along the shortest path toward the set point. The theory also covers acting ahead of a coming deficit. Theory, not evidence about chimpanzees. Use in Track E: citation for valuing an option by the deficit it removes.
- **Marginal value theorem** [charnov1976]: already cited.

### E.8 Sources: E4 endocrine correlates

#### Glucocorticoids (stress load)

- **Rank, aggression and cortisol, Kanyawara males** [mullerWrangham2004a] (Abs) [M].
  - Male rank correlated positively with urinary cortisol in a stable hierarchy.
  - Cortisol correlated positively with rates of male aggression and negatively with food availability.
  - No n in the abstract.
- **Twenty years of male glucocorticoids, Kanyawara** [muller2021] (FT, accepted manuscript) [H].
  - n: 8,029 urine samples, 20 adult males, November 1997 to June 2017.
  - The hierarchy was unstable on 2,533 of 7,152 days (35%); 145 rank reversals among adult males.
  - Glucocorticoids rose with rank (estimate 0.494, SE 0.168, P = 0.003), in stable and unstable periods and with or without mating competition. Being alpha had no separate effect.
  - Higher with parous oestrous females present (0.176, SE 0.013, P < 0.001).
  - Instability raised glucocorticoids more at higher rank (interaction 0.122, SE 0.044); the lowest-ranking males showed no difference.
  - Rose with age (0.008, SE 0.003).
  - Diet quality over the previous 14 days had no effect (−0.012, SE 0.072, P = 0.873).
  - Abstract: glucocorticoids rose with giving and receiving aggression; giving aggression was the main link between rank and glucocorticoids.
- **Rank, instability and cortisol, Taï males** [preis2019] (FT extract, publisher page) [M].
  - n: 983 urine samples, 10 males in 2 communities, 189 group days.
  - Rank was not associated with cortisol in stable or unstable periods.
  - Cortisol was higher in all males in unstable periods, while aggression rates were lower then.
  - Aggression given rose with the number of fully swollen parous females; individual aggression rates did not predict cortisol.
- **Single aggressions raise glucocorticoids, Budongo** [wittig2015] (FT, open access) [H].
  - n: 169 urine samples from 9 adult males after 14 aggressions and 10 resting events.
  - Relative level (after ÷ before): 112% ± 28 after aggression against 85% ± 27 after resting more than 30 min.
  - Probably for aggressors as well as victims; higher-ranking males rose more; length and intensity of the aggression did not matter.
  - Window used for the urinary peak: 135–270 min after the event. Mean urination interval 78 ± 32 min.
- **Bond partners lower glucocorticoids, Budongo** [wittig2016] (FT, open access) [H].
  - n: 394 urine samples from 9 males and 8 females assigned to single events: 31 grooming, 18 resting and 21 intergroup-encounter data points.
  - Relative level was almost 22% higher after intergroup encounters than after grooming, and more than 8% higher after resting than after grooming.
  - With a bond partner, levels were on average 23% lower across all three contexts (a main effect, not only during stress).
  - Kinship and sex had no significant effect.
- **Female cortisol, Kanyawara** [emeryThompson2010] (Abs) [M].
  - 6 years of urinary cortisol in females.
  - Cortisol rose with age and was high in young immigrants.
  - Cycling females not in oestrus had lower cortisol than lactating, oestrous or pregnant females.
  - Male aggression raised cortisol in oestrous females.
  - Lactating females had higher cortisol in months of low fruit consumption.
  - Low rank went with higher cortisol, most of all in lactation.
  - Female conflict affected many females, aggressors included.
- **Faecal cortisol and rank, Ngogo** [muehlenbeinWatts2010] (Abs; open access) [M]. 67 faecal samples from 22 adult males: testosterone, but not cortisol, was associated with rank; both were associated with parasite richness.
- **Daily pattern** [mullerLipson2003] (Abs) [H]. More than 500 samples from 11 wild males over a year: urinary testosterone and cortisol were higher and more variable in the morning than the afternoon.
- **Excretion time course** [bahr2000] (Abs) [M]. One adult male chimpanzee given labelled cortisol: more than 80% excreted in urine; peak in urine within 5.5 h and in faeces within 26 h.

#### Testosterone (competitive arousal)

- **Challenge hypothesis, Kanyawara** [mullerWrangham2004b] (secondary: indexed summaries only; the abstract was not reachable). Aggression and testosterone rose with parous oestrous females present and not with nulliparous ones; baseline testosterone correlated with rank.
- **Challenge hypothesis, Ngogo** [sobolewski2013] (Abs) [M].
  - Rank had no influence on testosterone.
  - Males were more aggressive in parties with parous oestrous females than without reproductively active females.
  - Urinary testosterone was above baseline with parous oestrous females and not with nulliparous ones.
  - Not explained by mating (equal copulation rates) or by large parties (no rise there).
- **Patrols and testosterone, Ngogo** [sobolewski2012] (secondary; still unverified). Other papers cite it for higher testosterone on patrols; a search summary gives about 25% above mean values for testosterone and cortisol. Not registered as a value.
- **Faecal testosterone and rank, Ngogo** [muehlenbein2004] (Abs) [M]. 67 faecal samples from 22 adult males: testosterone rose with rank, during a socially stable period.
- **Rank, testosterone and lean mass, Ngogo** [negrey2023] (Abs) [M]. Rank was positively associated with aggression rate, average testosterone and creatinine (lean mass). Testosterone was negatively associated with aggression rate. Lean mass, not aggression, links rank and testosterone.
- **Testosterone and energy, Kanyawara** [mullerWrangham2005] (Abs) [M]. 11 males: short-term changes in food did not lower testosterone; wild males had lower testosterone than 11 captive males. Short-term variation is more likely social than energetic.
- **Testosterone and pant-hoots, Kanyawara** [fedurek2016] (Abs) [M]. Hourly testosterone was positively associated with hourly pant-hoot rates; monthly levels with monthly rates, controlling for fission–fusion rates.

#### Oxytocin (affiliation)

- **Grooming with bond partners** [crockford2013] (Abs) [M]. Urinary oxytocin was higher after grooming with a bond partner than with a non-bond partner or after no grooming, whatever the relatedness or sexual interest; grooming duration and direction did not explain it. Site and n are not in the abstract.
- **Food sharing** [wittig2014] (Abs) [M]. Urinary oxytocin was higher after food sharing than after other social feeding, whatever the prior bond, and higher than after grooming. Site and n are not in the abstract.
- **Post-conflict affiliation, Taï males** [preis2018] (Abs) [M]. Oxytocin after reconciliation, after bystander affiliation and after affiliation unrelated to conflict was higher than after aggression alone or after periods without interaction. Relationship quality raised the chance of reconciliation but not oxytocin.
- **Intergroup conflict, Taï** [samuni2017]: already cited (patrols section). Higher before and during intergroup conflict in both sexes, linked to cohesion.

### E.9 New source list (E2, E3, E4)

- *new* kosheleff2009: Kosheleff VP, Anderson CNK 2009. Temperature's influence on the activity budget, terrestriality, and sun exposure of chimpanzees in the Budongo Forest, Uganda. *American Journal of Physical Anthropology* 139(2):172–181. [doi:10.1002/ajpa.20970](https://doi.org/10.1002/ajpa.20970) (Abs).
- *new* takemoto2004: Takemoto H 2004. Seasonal change in terrestriality of chimpanzees in relation to microclimate in the tropical forest. *American Journal of Physical Anthropology* 124(1):81–92. [doi:10.1002/ajpa.10342](https://doi.org/10.1002/ajpa.10342) (Abs).
- *new* pruetz2018: Pruetz JD 2018. Nocturnal behavior by a diurnal ape, the West African chimpanzee (*Pan troglodytes verus*), in a savanna environment at Fongoli, Senegal. *American Journal of Physical Anthropology* 166(3):541–548. [doi:10.1002/ajpa.23434](https://doi.org/10.1002/ajpa.23434) (Abs).
- *new* wessling2018: Wessling EG, Deschner T, Mundry R, Pruetz JD, Wittig RM, Kühl HS 2018. Seasonal variation in physiology challenges the notion of chimpanzees (*Pan troglodytes verus*) as a forest-adapted species. *Frontiers in Ecology and Evolution* 6:60. [doi:10.3389/fevo.2018.00060](https://doi.org/10.3389/fevo.2018.00060) (FT extract).
- *new* pontzer2021: Pontzer H, Brown MH, Wood BM et al. 2021. Evolution of water conservation in humans. *Current Biology* 31(8):1804–1810.e5. [doi:10.1016/j.cub.2021.02.045](https://doi.org/10.1016/j.cub.2021.02.045) (Abs).
- *new* nelson2022: Nelson RS, Lonsdorf EV, Terio KA, Wellens KR, Lee SM, Murray CM 2022. Drinking frequency in wild lactating chimpanzees (*Pan troglodytes schweinfurthii*) and their offspring. *American Journal of Primatology* 84(6):e23371. [doi:10.1002/ajp.23371](https://doi.org/10.1002/ajp.23371) (FT, accepted manuscript at par.nsf.gov).
- *new* mackenzie2025: MacKenzie C, Brodnan S, Felsche E et al. 2025. Wild chimpanzees (*Pan troglodytes schweinfurthii*) use tools to access out of reach water. *American Journal of Primatology* 87(4):e70036. [doi:10.1002/ajp.70036](https://doi.org/10.1002/ajp.70036) (FT, PMC12011317). §7 links this paper without a key.
- *new* lodwick2004: Lodwick JL, Borries C, Pusey AE, Goodall J, McGrew WC 2004. From nest to nest—influence of ecology and reproduction on the active period of adult Gombe chimpanzees. *American Journal of Primatology* 64(3):249–260. [doi:10.1002/ajp.20076](https://doi.org/10.1002/ajp.20076) (Abs).
- *new* khayer2025: Khayer T, Desruelle KJ, Curteanu C, Sellen DW, Watts DP, Bădescu I 2025. Developmental and sex-based variation in nest building among wild immature chimpanzees. *American Journal of Primatology* 87(3):e70011. [doi:10.1002/ajp.70011](https://doi.org/10.1002/ajp.70011) (FT extract, PMC11868824).
- *new* tagg2018: Tagg N, McCarthy M, Dieguez P et al. 2018. Nocturnal activity in wild chimpanzees (*Pan troglodytes*): evidence for flexible sleeping patterns and insights into human evolution. *American Journal of Physical Anthropology* 166(3):510–529. [doi:10.1002/ajpa.23478](https://doi.org/10.1002/ajpa.23478) (Abs).
- *new* lacroux2022: Lacroux C, Robira B, Kane-Maguire N, Guma N, Krief S 2022. Between forest and croplands: nocturnal behavior in wild chimpanzees of Sebitoli, Kibale National Park, Uganda. *PLoS ONE* 17(5):e0268132. [doi:10.1371/journal.pone.0268132](https://doi.org/10.1371/journal.pone.0268132) (Abs).
- *new* zamma2014: Zamma K 2014. What makes wild chimpanzees wake up at night? *Primates* 55(1):51–57. [doi:10.1007/s10329-013-0367-1](https://doi.org/10.1007/s10329-013-0367-1) (Abs).
- *new* videan2006: Videan EN 2006. Sleep in captive chimpanzee (*Pan troglodytes*): the effects of individual and environmental factors on sleep duration and quality. *Behavioural Brain Research* 169(2):187–192. [doi:10.1016/j.bbr.2005.12.014](https://doi.org/10.1016/j.bbr.2005.12.014) (Abs).
- *new* nunnSamson2018: Nunn CL, Samson DR 2018. Sleep in a comparative context: investigating how human sleep differs from sleep in other primates. *American Journal of Physical Anthropology* 166(3):601–612. [doi:10.1002/ajpa.23427](https://doi.org/10.1002/ajpa.23427) (Abs).
- *new* daan1984: Daan S, Beersma DG, Borbély AA 1984. Timing of human sleep: recovery process gated by a circadian pacemaker. *American Journal of Physiology-Regulatory, Integrative and Comparative Physiology* 246(2):R161–R183. [doi:10.1152/ajpregu.1984.246.2.R161](https://doi.org/10.1152/ajpregu.1984.246.2.R161) (Abs).
- *new* borbely2022: Borbély A 2022. The two-process model of sleep regulation: beginnings and outlook. *Journal of Sleep Research* 31(4):e13598. [doi:10.1111/jsr.13598](https://doi.org/10.1111/jsr.13598) (Abs; open access).
- *new* alrazi2026: Al-Razi H, Muhayeyezu F, Mulindahabi F et al. 2026. Thermal adaptation and the potential anticipation of overnight weather in the nesting decisions of chimpanzees. *Current Biology* 36(10):2662–2672.e5. [doi:10.1016/j.cub.2026.04.005](https://doi.org/10.1016/j.cub.2026.04.005) (Abs).
- *new* anderson2019: Anderson JR, Ang MYL, Lock LC, Weiche I 2019. Nesting, sleeping, and nighttime behaviors in wild and captive great apes. *Primates* 60(4):321–332. [doi:10.1007/s10329-019-00723-2](https://doi.org/10.1007/s10329-019-00723-2) (FT, author copy).
- *new* fruth2018: Fruth B, Tagg N, Stewart F 2018. Sleep and nesting behavior in primates: a review. *American Journal of Physical Anthropology* 166(3):499–509. [doi:10.1002/ajpa.23373](https://doi.org/10.1002/ajpa.23373) (FT, author copy).
- *new* carlson2013: Carlson BA, Rothman JM, Mitani JC 2013. Diurnal variation in nutrients and chimpanzee foraging behavior. *American Journal of Primatology* 75(4):342–349. [doi:10.1002/ajp.22112](https://doi.org/10.1002/ajp.22112) (Abs).
- *new* keramatiGutkin2014: Keramati M, Gutkin B 2014. Homeostatic reinforcement learning for integrating reward collection and physiological stability. *eLife* 3:e04811. [doi:10.7554/eLife.04811](https://doi.org/10.7554/eLife.04811) (Abs; open access).
- *new* mullerWrangham2004a: Muller MN, Wrangham RW 2004. Dominance, cortisol and stress in wild chimpanzees (*Pan troglodytes schweinfurthii*). *Behavioral Ecology and Sociobiology* 55(4):332–340. [doi:10.1007/s00265-003-0713-1](https://doi.org/10.1007/s00265-003-0713-1) (Abs).
- *new* mullerWrangham2004b: Muller MN, Wrangham RW 2004. Dominance, aggression and testosterone in wild chimpanzees: a test of the 'challenge hypothesis'. *Animal Behaviour* 67(1):113–123. [doi:10.1016/j.anbehav.2003.03.013](https://doi.org/10.1016/j.anbehav.2003.03.013) (secondary; abstract not reached).
- *new* mullerWrangham2005: Muller MN, Wrangham RW 2005. Testosterone and energetics in wild chimpanzees (*Pan troglodytes schweinfurthii*). *American Journal of Primatology* 66(2):119–130. [doi:10.1002/ajp.20132](https://doi.org/10.1002/ajp.20132) (Abs).
- *new* muller2021: Muller MN, Enigk DK, Fox SA et al. 2021. Aggression, glucocorticoids, and the chronic costs of status competition for wild male chimpanzees. *Hormones and Behavior* 130:104965. [doi:10.1016/j.yhbeh.2021.104965](https://doi.org/10.1016/j.yhbeh.2021.104965) (FT, accepted manuscript at par.nsf.gov).
- *new* mullerLipson2003: Muller MN, Lipson SF 2003. Diurnal patterns of urinary steroid excretion in wild chimpanzees. *American Journal of Primatology* 60(4):161–166. [doi:10.1002/ajp.10103](https://doi.org/10.1002/ajp.10103) (Abs).
- *new* emeryThompson2010: Emery Thompson M, Muller MN, Kahlenberg SM, Wrangham RW 2010. Dynamics of social and energetic stress in wild female chimpanzees. *Hormones and Behavior* 58(3):440–449. [doi:10.1016/j.yhbeh.2010.05.009](https://doi.org/10.1016/j.yhbeh.2010.05.009) (Abs).
- *new* preis2019: Preis A, Samuni L, Deschner T, Crockford C, Wittig RM 2019. Urinary cortisol, aggression, dominance and competition in wild, West African male chimpanzees. *Frontiers in Ecology and Evolution* 7:107. [doi:10.3389/fevo.2019.00107](https://doi.org/10.3389/fevo.2019.00107) (FT extract).
- *new* preis2018: Preis A, Samuni L, Mielke A, Deschner T, Crockford C, Wittig RM 2018. Urinary oxytocin levels in relation to post-conflict affiliations in wild male chimpanzees (*Pan troglodytes verus*). *Hormones and Behavior* 105:28–40. [doi:10.1016/j.yhbeh.2018.07.009](https://doi.org/10.1016/j.yhbeh.2018.07.009) (Abs).
- *new* wittig2015: Wittig RM, Crockford C, Weltring A, Deschner T, Zuberbühler K 2015. Single aggressive interactions increase urinary glucocorticoid levels in wild male chimpanzees. *PLoS ONE* 10(2):e0118695. [doi:10.1371/journal.pone.0118695](https://doi.org/10.1371/journal.pone.0118695) (FT, PMC4340946).
- *new* wittig2016: Wittig RM, Crockford C, Weltring A, Langergraber KE, Deschner T, Zuberbühler K 2016. Social support reduces stress hormone levels in wild chimpanzees across stressful events and everyday affiliations. *Nature Communications* 7:13361. [doi:10.1038/ncomms13361](https://doi.org/10.1038/ncomms13361) (FT, PMC5097121).
- *new* wittig2014: Wittig RM, Crockford C, Deschner T, Langergraber KE, Ziegler TE, Zuberbühler K 2014. Food sharing is linked to urinary oxytocin levels and bonding in related and unrelated wild chimpanzees. *Proceedings of the Royal Society B* 281(1778):20133096. [doi:10.1098/rspb.2013.3096](https://doi.org/10.1098/rspb.2013.3096) (Abs).
- *new* crockford2013: Crockford C, Wittig RM, Langergraber K, Ziegler TE, Zuberbühler K, Deschner T 2013. Urinary oxytocin and social bonding in related and unrelated wild chimpanzees. *Proceedings of the Royal Society B* 280(1755):20122765. [doi:10.1098/rspb.2012.2765](https://doi.org/10.1098/rspb.2012.2765) (Abs).
- *new* sobolewski2013: Sobolewski ME, Brown JL, Mitani JC 2013. Female parity, male aggression, and the Challenge Hypothesis in wild chimpanzees. *Primates* 54(1):81–88. [doi:10.1007/s10329-012-0332-4](https://doi.org/10.1007/s10329-012-0332-4) (Abs).
- *new* muehlenbein2004: Muehlenbein MP, Watts DP, Whitten PL 2004. Dominance rank and fecal testosterone levels in adult male chimpanzees (*Pan troglodytes schweinfurthii*) at Ngogo, Kibale National Park, Uganda. *American Journal of Primatology* 64(1):71–82. [doi:10.1002/ajp.20062](https://doi.org/10.1002/ajp.20062) (Abs).
- *new* muehlenbeinWatts2010: Muehlenbein MP, Watts DP 2010. The costs of dominance: testosterone, cortisol and intestinal parasites in wild male chimpanzees. *BioPsychoSocial Medicine* 4:21. [doi:10.1186/1751-0759-4-21](https://doi.org/10.1186/1751-0759-4-21) (Abs; open access).
- *new* negrey2023: Negrey JD, Deschner T, Langergraber KE 2023. Lean muscle mass, not aggression, mediates a link between dominance rank and testosterone in wild male chimpanzees. *Animal Behaviour* 202:99–109. [doi:10.1016/j.anbehav.2023.06.004](https://doi.org/10.1016/j.anbehav.2023.06.004) (Abs).
- *new* fedurek2016: Fedurek P, Slocombe KE, Enigk DK, Emery Thompson M, Wrangham RW, Muller MN 2016. The relationship between testosterone and long-distance calling in wild male chimpanzees. *Behavioral Ecology and Sociobiology* 70(5):659–672. [doi:10.1007/s00265-016-2087-1](https://doi.org/10.1007/s00265-016-2087-1) (Abs).
- *new* bahr2000: Bahr NI, Palme R, Möhle U, Hodges JK, Heistermann M 2000. Comparative aspects of the metabolism and excretion of cortisol in three individual nonhuman primates. *General and Comparative Endocrinology* 117(3):427–438. [doi:10.1006/gcen.1999.7431](https://doi.org/10.1006/gcen.1999.7431) (Abs).
- batesByrne2009, janmaat2014, samuni2017, sobolewski2012 and charnov1976 are already cited; the entries above add findings.

### E.10 Not verified

Each item below is used at most as a labelled assumption.

- **Birth mass 1.8 kg.** No primary source reached. (E1c: desilva2011 gives 1,733 g for captive births, E.12.)
- **Milton & Demment's transit times (38 h and 48 h)** and **Lambert's retention time (about 31 h).** Seen only in search snippets; the abstracts carry no hours.
- **Chimpanzee meat intake (348 g/h; 1.9 ± 1.2 kg/h) and 115 kcal per 100 g.** Seen only as cited by hardus2012. The originals (Wrangham & Conklin-Brittain 2003; Gilby 2006) were not read.
- **Activity multipliers 1.25 and 1.38, pregnancy +25%, lactation +50%, walking speeds from Mahale.** Seen only as used by nguessan2009. Leonard & Robertson 1997, Key & Ross 1999, Hunt 1989 and Coelho 1974 were not read.
- **Human pregnancy cost without fat deposition.** butteKing2005's abstract gives only the total with deposition.
- **Water turnover in litres per day** (pontzer2021 full text).
- **Decay time constant of sleep pressure.** The rise constant (18.2 h) is from a search snippet.
- **Borbély 1982**: bibliographic details not verified (no DOI in Crossref).
- **Nest clock times at Toro-Semliki and Fongoli.** Search snippets only; sources not identified.
- **Hourly activity profile.** No primary source reached.
- **sobolewski2012 (patrols and testosterone)** and **mullerWrangham2004b.** Abstracts are not exposed by the publisher's index; findings are from secondary summaries.
- **emeryThompson2010, crockford2013, wittig2014: sample sizes and effect sizes.** Abstract only; the full texts could not be opened (the archive began to require a CAPTCHA part-way through this pass, which was not bypassed).
- **Oxytocin and testosterone sampling windows.**
- **smithJungers1997 species values**, **pusey2005 growth curves**, **emeryThompson2013**: full texts not read.
- **Full texts marked "FT extract"** (wessling2018, preis2019, janmaat2014, khayer2025) were read through a fetch tool that returns quoted passages, not the whole page. The quoted numbers are reported as returned.

### E.11 Addendum: milk yield and gland storage (requested by the E1 implementer, 1 October 2026)

- **Milk output scales with maternal mass^0.74** [riek2021] (Abs) [M], cross-species.
  - 47 mammal species at peak lactation, phylogenetically controlled.
  - Milk output and milk energy output both scale to the power 0.74 ± 0.05 of maternal body mass.
  - Use in Track E: supports scaling the milk-yield limit by M^0.75. The exponent is now sourced; the coefficient is not.
- **Coefficient of the milk-yield limit.** E1 uses 23.2 kcal/d per kg^0.75, from butteKing2005's 501 kcal/d of milk at a 60 kg mother. The 60 kg is not in butteKing2005's abstract, so the coefficient stays *assumed*. No chimpanzee or ape milk yield was found. Oftedal 1984 (Symposia of the Zoological Society of London 51:33–85) is the usual citation for milk energy output by species; it has no DOI in Crossref and was not read.
- **Gland storage capacity, humans** [kent1999] (Abs) [H] for humans; cross-species.
  - Exclusive breastfeeding, months 1–6: storage capacity 209.9 ± 11.0 mL per breast (SEM, 46 breasts); 24-hour production 453.6 g per breast (48 breasts).
  - Storage capacity and 24-hour production were related, and both followed infant demand.
  - Derived: storage is about 0.46 of daily production, or about 11 hours of production.
  - Use in Track E: input for gland storage, *assumed* (human).
- **Sources:**
  - *new* riek2021: Riek A 2021. Comparative phylogenetic analysis of milk output at peak lactation. *Comparative Biochemistry and Physiology Part A* 257:110976. [doi:10.1016/j.cbpa.2021.110976](https://doi.org/10.1016/j.cbpa.2021.110976) (Abs).
  - *new* kent1999: Kent JC, Mitoulas L, Cox DB, Owens RA, Hartmann PE 1999. Breast volume and milk production during extended lactation in women. *Experimental Physiology* 84(2):435–447. [doi:10.1111/j.1469-445X.1999.01808.x](https://doi.org/10.1111/j.1469-445X.1999.01808.x) (Abs; bibliography from Europe PMC).
- **Order of events for T-ENE-1 to T-ENE-3.** Their bands were committed (3ba7a86) before any simulated value was seen. The E1 implementer then reported a ledger that closes at about 1,115 kcal/d for females, with 135–175 feeding minutes per day: below both bands. The bands are left as committed.

### E.12 Addendum: infant energetics (stage E1c, 1 October 2026)

Evidence pass for stage E1c (infant energetics: growth, night nursing, infant intake), 1 October 2026. Bibliographic data checked against Crossref or Europe PMC on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population).

- **Feeding development, Kanyawara** [bray2018] (FT, PMC5739981) [M]. Extends the unkeyed entry in research.md §2 ("A life is a changing capacity").
  - n: 26 immatures and 31 adults, 2010–2013.
  - First solid food: earliest 5.1 months; most not before their eighth month (mean ± SE 7.9 ± 0.7 months, range 5.1–11.1, n = 9).
  - Suckling into the fifth year: 4.8 ± 0.7 y (range 4.1–6.0, n = 8).
  - Percent of observation time feeding on solid food rose with age; 3–4-year-olds were still below adult levels (β = −9.43, SE 2.02), and adult levels were reached between 4 and 6 years.
  - Ingestion rate (items per minute of foraging, five ripe fruit species): infants significantly below adults (β = −4.72, SE 1.15); juveniles lower but not significantly (β = −1.72, SE 0.79); adolescents close to adults. Absolute rates are only in a figure (not read).
  - Use in E1c: targets for the onset of solid food and the age at adult feeding time; direction only for ingestion rate by age (no magnitude, so not an input).
- **Nursing and foraging by age, Ngogo** [badescu2022] (FT, PMC9352031; research.md had the abstract) [M].
  - n: 72 immatures aged 0–9 y; 1,245.2 focal hours (mean 12.4 h per subject); follows between 07:00 and 17:30.
  - Suckling: 5.85 ± 3.4% of observation time at 0–6 months (1.63 ± 0.51 bouts per hour); about 3% from 6 months to 4 years (1.00 ± 0.44 bouts per hour); bouts about 2 min (2.03 ± 0.73).
  - Foraging time: 0.84 ± 1.81% at 0–6 months; 17.18 ± 15.97% at 6–12 months; 24.85 ± 8.13% at 1–2 y; 46.7 ± 6.0% at 4–5 y; adults about 47% of the day.
  - The authors: independent foraging "probably became a dietary requirement for infants at 1 year old, when their energy needs may have surpassed the available milk energy"; by 1 year infants foraged whenever their mothers did.
  - Night: "our lack of data on night-time nursing, which may be common, as it is in humans" (no night data).
  - Use in E1c: targets (daytime suckling share, foraging share by age); no input.
- **Isotopic weaning, Ngogo** [badescu2017] (Abs) [M]. Bădescu, Katzenberg, Watts, Sellen. 560 faecal samples, 48 infants with their mothers and siblings. Infants ≤ 1 y were 2.0‰ (δ15N) and 0.8‰ (δ13C) above their mothers; solid foods were eaten within 2–5 months of birth; isotopic weaning by about 4.5 y, before nipple contact ended (comfort nursing). Secondary (search summary, not in the abstract read): the decline in milk reliance starts at about 1 y and is complete at 4–4.5 y. Target, direction (milk share falls with age).
- **Feeding around 3 years, Mahale** [matsumoto2017] (Abs) [M]. 19 infants aged 1–60 months, 518 h. At about 3 years infants spent more total feeding time and more time on leaves and hard-to-process foods; milk dependence fell at about 3 years, before nipple contact ceased (around 48 months, as summarised by lonsdorf2021). Target, direction.
- **Feeding development, Gombe** [lonsdorf2021] (FT, accepted manuscript at par.nsf.gov) [M]. 81 offspring, 1975–2016. Feeding time rose fastest up to 5 years and levelled off after 6 years near the mothers' level; mothers fed 0.47 ± 0.12 (dry) and 0.44 ± 0.12 (wet season) of observation time; mean weaning age 4.7 y (citing Lonsdorf et al. 2020). Secondary: Pusey et al. 2005 showed that females "grow exponentially until 10 years of age". Target.
- **Wild growth, Gombe, read secondarily** [gurvenWalker2006] (FT appendix) [L]. "Growth data for wild chimpanzees are scant"; from pusey2005, "a very rough estimation": 10 kg at 5 y for both sexes, 21 kg (females) and 24 kg (males) at 10 y, adults 31 and 39 kg. Derived: about 1.6 kg/y from birth to 5 y, 2.2 (F) and 2.8 (M) kg/y from 5 to 10 y. Target (mass for age), low confidence: pusey2005's own curves were not read.
- **Wild against captive growth** [hamada1996] (bibliography only; the statement is from a search snippet attributed to this paper, unverified). Hamada, Udono, Teramoto, Sugawara: laboratory chimpanzees mature more than 2 years earlier than wild ones, and "the major reason for the retarded maturation in wild chimpanzees is the delay of growth from infant to the early juvenile phases (0–4 yrs of age), probably owing to a limited nutritional supply from the mother". Direction only, unverified.
- **Neonatal mass and growth in the first year, captive** [desilva2011] (FT, PMC3024680) [M] captive. Yerkes: 415 births, 47 with infant (within 2 weeks of birth) and maternal mass. Mean neonatal mass 1,733 g; neonate 3.3% of maternal mass (95% CI 3.0–3.5); at 1 year infants weigh 8.6% of their mother's mass (n = 9 dyads). Derived: about 4.5 kg at 1 year (2.6 × birth mass). Use: verifies the birth mass of 1.8 kg to within 4% (captive); the first-year gain (about 2.8 kg) is a captive, well-fed reference.
- **Growth of captive chimpanzees by setting** [curry2023] (FT, PMC10084351) [M] captive. 298 sanctuary chimpanzees (Tchimpounga, Chimfunshi, Tacugama), 1,030 zoo, 442 research. Pre-maturation growth: sanctuary 3.4 (F) and 3.8 (M) kg/y; zoo 4.7 and 5.4; research 4.8 and 5.3. Maturation breakpoint: sanctuary 12.4 (F) and 13.8 (M) y; zoo 11.4 and 11.9. Adult mass: sanctuary 43.5 ± 7.5 (F), 52.6 ± 8.1 kg (M). Use: captive references that bracket the potential growth rate of a well-fed animal.
- **Offspring growth and weaning, Kanyawara** [emeryThompson2016] (Abs, via Europe PMC; already listed) [M]. Juvenile lean mass (urinary creatinine) rose with the interval to the next sibling's birth; low maternal energy balance during lactation predicted larger, not smaller, juveniles; "offspring growth suffers when mothers wean early". Target, direction: more milk, more growth.
- **Night: nest sharing and night suckling.**
  - [khayer2025] (FT extract, via Europe PMC) [M] for nest sharing: "infants continue to regularly share night nests with their mothers at least until they are weaned (at 4–5 years old in *P. troglodytes*)", sometimes to 10 years (citing van Lawick-Goodall 1968 and others); nest sharing enables "night-time nutritive or comfort nursing" (cited to human studies, Gettler & McKenna 2011 and McKenna et al. 2007). No wild chimpanzee measurement of night nursing.
  - [mizuno2006] (Abs via search snippet; bibliography from Crossref) [L]. Mizuno, Takeshita, Matsuzawa: night behaviour of 3 mother-reared captive newborns in their first 4 months; infants suckled at night (with eyes open until the end of month 2, mostly with eyes closed thereafter). Direction only: chimpanzee infants suckle at night.
  - badescu2022: no night data (above).
  - Use in E1c: night suckling in the mother's nest is a mechanism with [L] support (captive newborns, human analogy); its amount is not an input.
- **Intake rate and body size.** No chimpanzee measurement of ingestion rate (kcal per minute) against body mass was found; bray2018 gives only the direction (infants below adults, juveniles not significantly). The size scaling of intake capacity used in E1c is a design assumption.

**Not verified (E1c):** hamada1996's statement (snippet only); the Gombe mass-for-age values (secondary, via gurvenWalker2006); the course of milk reliance between 1 and 4.5 y in badescu2017 (search summary, not the abstract); mizuno2006 details (search snippet); any chimpanzee or ape value for night suckling frequency, milk yield or gland capacity.

**Sources:**
- *new* bray2018: Bray J, Emery Thompson M, Muller MN, Wrangham RW, Machanda ZP 2018. The development of feeding behavior in wild chimpanzees (*Pan troglodytes schweinfurthii*). *American Journal of Physical Anthropology* 165(1):34–46 (online 26 September 2017). [doi:10.1002/ajpa.23325](https://doi.org/10.1002/ajpa.23325) (FT, PMC5739981).
- *new* badescu2017: Bădescu I, Katzenberg MA, Watts DP, Sellen DW 2017. A novel fecal stable isotope approach to determine the timing of age-related feeding transitions in wild infant chimpanzees. *American Journal of Physical Anthropology* 162(2):285–299. [doi:10.1002/ajpa.23116](https://doi.org/10.1002/ajpa.23116) (Abs).
- *new* matsumoto2017: Matsumoto T 2017. Developmental changes in feeding behaviors of infant chimpanzees at Mahale, Tanzania: implications for nutritional independence long before cessation of nipple contact. *American Journal of Physical Anthropology* 163(2):356–366. [doi:10.1002/ajpa.23212](https://doi.org/10.1002/ajpa.23212) (Abs).
- *new* lonsdorf2021: Lonsdorf EV, Stanton MA, Wellens KR, Murray CM 2021. Wild chimpanzee offspring exhibit adult-like foraging patterns around the age of weaning. *American Journal of Physical Anthropology* 175(1):268–281. [doi:10.1002/ajpa.24267](https://doi.org/10.1002/ajpa.24267) (FT, accepted manuscript).
- *new* gurvenWalker2006: Gurven M, Walker R 2006. Energetic demand of multiple dependents and the evolution of slow human growth. *Proceedings of the Royal Society B* 273(1588):835–841. [doi:10.1098/rspb.2005.3380](https://doi.org/10.1098/rspb.2005.3380) (FT, electronic appendix).
- *new* hamada1996: Hamada Y, Udono T, Teramoto M, Sugawara T 1996. The growth pattern of chimpanzees: somatic growth and reproductive maturation in *Pan troglodytes*. *Primates* 37(3):279–295. [doi:10.1007/BF02381860](https://doi.org/10.1007/BF02381860) (bibliography only).
- *new* desilva2011: DeSilva JM 2011. A shift toward birthing relatively large infants early in human evolution. *PNAS* 108(3):1022–1027. [doi:10.1073/pnas.1003865108](https://doi.org/10.1073/pnas.1003865108) (FT, PMC3024680).
- *new* curry2023: Curry BA, Drane AL, Atencia R et al. 2023. Body mass and growth rates in captive chimpanzees (*Pan troglodytes*) cared for in African wildlife sanctuaries, zoological institutions, and research facilities. *Zoo Biology* 42(1):98–106. [doi:10.1002/zoo.21718](https://doi.org/10.1002/zoo.21718) (FT, PMC10084351).
- *new* mizuno2006: Mizuno Y, Takeshita H, Matsuzawa T 2006. Behavior of infant chimpanzees during the night in the first 4 months of life: smiling and suckling in relation to behavioral state. *Infancy* 9(2):221–240. [doi:10.1207/s15327078in0902_7](https://doi.org/10.1207/s15327078in0902_7) (Abs, search snippet).
- badescu2022, emeryThompson2012, emeryThompson2016, pusey2005, khayer2025 and kent1999 are already listed; the entries above add findings.

### E.13 Addendum: nursing, milk supply and comfort suckling (stage E1d, 1 October 2026)

Evidence pass for stage E1d (nursing valued by the milk it delivers; milk supply against maternal condition; comfort suckling), 1 October 2026. Bibliographic data from Europe PMC or Crossref on that day; tags as above.

- **Milk output against maternal energy intake, baboons** [roberts1985] (Abs) [M] captive. Energy intake, milk output and energy balance in baboons fed ad libitum, or 80% or 60% of ad libitum intake during lactation. Restriction raised the efficiency of energy use by an estimated 17–25%; at 80% milk output and body stores were protected; at 60% milk output fell and body nutrient mobilisation rose. The authors: low intake impairs lactation "when it is also severe enough to increase body nutrient mobilization". No milk volumes in the abstract. Use in E1d: synthesis is buffered against moderate deficits; only a severe deficit lowers it (no threshold in units of body reserves is given).
- **Supplementing mothers does not raise milk volume, The Gambia** [prentice1983] (Abs) [H] human. 130 nursing mothers, 12 months; energy intake raised from 1,568 ± 15 to 2,291 ± 14 kcal/d; no effect on breast-milk volume at any stage of lactation or season, and none on mothers with poor outputs; protein concentration +6.6%. Use: direction (milk volume is not limited by moderate maternal energy shortfall).
- **Variation in milk among rhesus mothers** [hinde2009] (Abs) [M] captive, well fed. Milk yield value (milk obtained after 3.5–4 h of separation) rose with parity and with infant weight; milk energy density and yield both rose as infants aged, with a trade-off (mothers whose milk energy rose more raised yield less, and their infants grew more slowly). Use: direction only (maternal condition matters; no energy-balance dose-response).
- **Milk synthesis follows removal, women** [daly1993] (Abs) [M] human. Seven mothers, breast volume before and after each feed over 24 h: short-term synthesis rates varied between breasts and between feeds and, for 6 of 13 breasts, rose with the degree to which the breast had been emptied (r² 0.32–0.95). With kent1999 (storage and 24-h production followed infant demand): supply follows the infant's removal. Use: supports the existing rule that a full store stops synthesis.
- **Comfort (non-nutritive) nursing, chimpanzees.** badescu2017 (Abs): isotopic weaning by about 4.5 y, before nipple contact ended ("comfort nursing"). badescu2022 (FT): nursing time about 3% of observation time from 6 months to 4 years with no significant change across those ages, while foraging time rose from 17% to 47%. matsumoto2017 (Abs): milk dependence fell at about 3 y, before nipple contact ceased. Use: field suckling time is nipple contact, part of it non-nutritive; a model of nutritive suckling only should fall at or below the field share.

**Not verified (E1d):** milk volumes of roberts1985 (not in the abstract); any chimpanzee or ape relation between maternal energy balance and milk output; any measurement of how much of chimpanzee nipple contact transfers milk.

**Sources:**
- *new* roberts1985: Roberts SB, Cole TJ, Coward WA 1985. Lactational performance in relation to energy intake in the baboon. *American Journal of Clinical Nutrition* 41(6):1270–1276. [doi:10.1093/ajcn/41.6.1270](https://doi.org/10.1093/ajcn/41.6.1270) (Abs).
- *new* prentice1983: Prentice AM, Roberts SB, Prentice A, Paul AA, Watkinson M, Watkinson AA, Whitehead RG 1983. Dietary supplementation of lactating Gambian women. I. Effect on breast-milk volume and quality. *Human Nutrition: Clinical Nutrition* 37(1):53–64. PMID 6341320 (Abs).
- *new* hinde2009: Hinde K, Power ML, Oftedal OT 2009. Rhesus macaque milk: magnitude, sources, and consequences of individual variation over lactation. *American Journal of Physical Anthropology* 138(2):148–157. [doi:10.1002/ajpa.20911](https://doi.org/10.1002/ajpa.20911) (Abs).
- *new* daly1993: Daly SE, Owens RA, Hartmann PE 1993. The short-term synthesis and infant-regulated removal of milk in lactating women. *Experimental Physiology* 78(2):209–220. [doi:10.1113/expphysiol.1993.sp003681](https://doi.org/10.1113/expphysiol.1993.sp003681) (Abs).
- badescu2017, badescu2022, matsumoto2017 and kent1999 are already listed.

