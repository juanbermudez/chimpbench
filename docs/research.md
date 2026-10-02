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
| Leaving the nest before sunrise | 18% of departures (5 females, 179 days, Taï, fruit-scarce periods); earlier when breakfast is an ephemeral fruit and far away | janmaat2014 (FT; read in full for E2b) | [M] | target (T-RHY-3) |
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
- **Active day, Budongo** [batesByrne2009] (in the registry; read in full for stage E2b, see the E2b addendum): 11 h 34 min for males, 10 h 57 min for lactating females. Today this is the parameter `activeDayH`; Track E turns it into a target (T-RHY-1).
- **Leaving the nest, Taï** [janmaat2014] (FT extract; read in full for stage E2b, see the E2b addendum) [M].
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

### E.14 Addendum: growth potential, lactation course and weaning (stage E1f, 1 October 2026)

Evidence pass for stage E1f, 1 October 2026. With the energy ledger (E1c, E1d) infants hold their reserves, but three misses remain: weaning at about 7.2 y against 4–5 y in the field, with infants eating solids in 3–9% of daylight against 17–47%; a milk cost that never falls; and infants that grow at the full stylised potential (linear from 1.8 kg at birth to 31.3 kg at 10 y for females, 39 kg at 13 y for males) and come out too heavy. Bibliographic data were checked against OpenAlex and Europe PMC on that day (the Crossref API was rate-limiting). Tags as in this Track E section. The same text is staged as §14 of [staging/e-sources.md](staging/e-sources.md); it was requested as "§13", a number the E1d addendum already holds (E.13 here). Earlier entries are extended, not repeated.

#### E.14.1 Key numbers

| Item | Value | Source | Evidence | Read as | Use |
| --- | --- | --- | --- | --- | --- |
| Captive growth rate before mass maturation | Sanctuary F 3.4 (95% CI 2.8–4.1), M 3.8 (3.4–4.3) kg/y; zoo F 4.7, M 5.4; research F 4.8, M 5.3 | curry2023 | [M] captive | FT | input (potential rate) |
| Captive age at mass maturation | Sanctuary F 12.4, M 13.8 y; zoo 11.4, 11.9; research 11.2, 12.0; no sex difference within a setting | curry2023 | [M] captive | FT | check |
| Captive adult mass | Sanctuary F 43.5 ± 7.5, M 52.6 ± 8.1 kg; zoo 54.7, 61.8; research 58.7, 63.8 | curry2023 | [M] captive | FT | not an input (35–88% above the Gombe medians) |
| First-year growth, captive | 1.73 kg at birth, about 4.5 kg at 1 y (2.8 kg in the year) | desilva2011 (E.12) | [M] captive | FT | input (first-year limit) |
| Sex difference in growth | By rate, not duration, in common chimpanzees | leighShea1996, curry2023 | [M] | Abs, FT | input (shape) |
| Growth when well fed or after a delay | No adolescent spurt when well fed; catch-up growth after juvenile delay (12 captive animals) | hamadaUdono2002 | [M] captive | Abs | mechanism citation |
| Captive against wild maturation | Captive animals mature 2–3 y earlier; the wild delay is mostly at 0–4 y | gurvenWalker2006, hamada1996 | [L] | secondary | target, direction |
| Weaned age, Gombe | 4.71 ± 1.04 y (range 2.82–8.01), n = 37 of 65 offspring, 29 mothers; females 88.5 days earlier | lonsdorf2020 | [H] | FT | target |
| Isotopic weaning, Ngogo | Largest milk signal at ≤ 1–2 y; decline from about 1–1.5 y; end at 4–4.5 y; nipple contact to about 7 y | badescu2016, lonsdorf2020 (both citing badescu2017), badescu2023 | [M] | FT (secondary to badescu2017) | target |
| Nursing rate and bout length | 1.1 ± 0.48 bouts/h overall (0.15–2.52; 42 pairs, 831 h); bouts about 2 min at every age (P = 0.84) | badescu2016, badescu2022 | [H], [M] | FT | target |
| Suckling and eating time, Gombe | Suckling 2–3.71% of observation time, no trend from 0 to 5 y; eating 0.2% (0–0.5 y) to 22% (1.5–2 y), 32% (3–3.5 y), 49% (4.5–5 y); 40 infants | lonsdorf2014 | [H] | FT | target |
| Weaning conflict | Rebuffs at the nipple at 5–6 months; more conflict at about 12 and 18 months; rejections from 2–3 y before weaning, stronger when mothers resume cycling (infant 3–4 y) | vandeRijtPlooij1987, clark1977 via maestripieri2002 | [M], [L] | Abs, secondary | target, direction (no rates exist) |
| Chimpanzee lactation course | Steady from about 1 y to about 4 y (inferred from nursing and isotopes, not measured) | badescu2022, badescuThesis2017, badescu2023 | [M] | FT | target; constrains the mechanism |
| Human milk by stage | 807 g/d in months 1–6 (exclusive) → 550 g/d after 6 months; cost 675 → 460 kcal/d | fao2004 | [H] human | FT extract | cross-species check |
| Human milk, late lactation | 875 ml/d at 7 months (93% of energy) → 550 ml/d at 11–16 months (50%); 10 infants | dewey1984 | [M] human | Abs | cross-species check |
| Production follows demand | Per breast 453.6 g/d (months 1–6) → 208.0 ± 56.7 g/d at 15 months; extra supply is not drunk for long; a milk protein inhibits secretion locally | kent1999, deweyLonnerdal1986, wilde1995 | [H], [M], [M] | Abs | mechanism citation (cross-species) |
| Ape milk energy | Wild mountain gorilla 0.53 kcal/g (fat 1.9%, protein 1.4%, sugar 6.8%; n = 7) against human 0.67 | whittier2011, fao2004 | [M] | Abs | sensitivity of the yield |
| Suckling time and milk intake | Weak relation across mammals; none in the one isotope study | cameron1998 | [M] | Abs (search) | caution for nursing targets |
| Infant intake rate | No kcal/min by age for chimpanzees. Skill-limited: whole hard fruits by 2 y, adult technique by 4 y; orangutans reach adult items/min on easy foods just after weaning, and toughness does not slow them | corpByrne2002, schuppli2016 | [M] | Abs, FT | gap; mechanism citation |

#### E.14.2 Growth: a captive potential and the wild outcome

- **Captive growth by setting, re-read** [curry2023] (FT, Europe PMC full text) [M] captive. Extends E.12.
  - Design: one randomly chosen mass per animal; piecewise linear regression of mass on age by sex. The first slope is the growth rate, the breakpoint the age at mass maturation. The authors note that the method treats growth rate as constant.
  - n (Table 3): sanctuary 151 M, 147 F; zoo 409 M, 621 F; research 194 M, 243 F. Sanctuary: 252 of 298 were wild-born orphans confiscated, commonly at about 1–3 y; mixed-age groups in forest enclosures of 2.5–77 ha, natural vegetation plus supplementary fruit and vegetables. Zoo: Europe and North America, 2000–2021. Research: Alamogordo, M.D. Anderson and Yerkes, chow diet, 1980–2011.
  - Growth rate, kg/y (95% CI): sanctuary M 3.8 (3.4–4.3), F 3.4 (2.8–4.1); zoo M 5.4 (5.0–6.0), F 4.7 (4.2–5.2); research M 5.3 (5.0–5.7), F 4.8 (4.2–5.9).
  - Breakpoint, y: sanctuary M 13.8 (12.5–14.9), F 12.4 (10.9–13.7); zoo M 11.9 (10.9–12.5), F 11.4 (10.6–12.3); research M 12.0 (11.3–12.5), F 11.2 (9.5–12.5). Within a setting the breakpoint did not differ by sex; males grew faster than females in zoo and research animals (P < .001), not in sanctuary animals.
  - Adult mass, kg (mean ± SD, n): sanctuary M 52.6 ± 8.1 (82), F 43.5 ± 7.5 (93); zoo M 61.8 ± 10.2 (266), F 54.7 ± 10.4 (444); research M 63.8 ± 10.1 (86), F 58.7 ± 12.7 (139).
  - Exploratory: sanctuary orphans grew 3.2 kg/y, sanctuary-born animals 3.6 kg/y (small sanctuary-born sample).
  - Derived: birth mass (1.73 kg, desilva2011) + rate × breakpoint gives the adult mean within 4.2 kg in every setting and sex (sanctuary F: 1.73 + 3.4 × 12.4 = 43.9 against 43.5). Sanctuary adults are 35–39% heavier than the Gombe medians, zoo and research adults 58–88% heavier.
  - Use: input for the potential growth rate (E.14.6).
- **First year, captive** [desilva2011] (E.12): 1,733 g at birth; 8.6% of maternal mass at 1 y (n = 9 dyads), about 4.5 kg. Derived: 2.8 kg gained in the first year, 0.5–0.8 of the captive slopes above. Even when well fed, infants gain fewer kilograms per year than juveniles.
- **Sexual dimorphism by rate** [leighShea1996] (Abs) [M] captive (the colony is not named in the abstract). In common chimpanzees dimorphism comes from a sex difference in the rate of mass growth, not its duration; between genera, size differences come mostly from rate. curry2023 agrees for zoo and research animals. Use: input for the shape of the potential (the sexes differ in rate and end at about the same age).
- **Growth spurt and catch-up** [hamadaUdono2002] (Abs) [M] captive. Longitudinal summed length (crown–rump, thigh and leg) of 12 captive chimpanzees: animals in favourable conditions had no adolescent growth spurt; only animals whose juvenile growth had been delayed showed one, at adolescence (catch-up growth). Use: mechanism citation for growth that resumes after a shortfall and goes on past the usual age until adult size (the E1c rule without an age gate).
- **Laboratory against wild.**
  - [kimuraHamada1996] (abstract as returned by a search summary and Semantic Scholar) [L]. The skeleton of a wild juvenile *P. t. verus* of known age, and other wild-born immatures of all three subspecies, were smaller than laboratory-born juveniles of the same age; the gap was larger in limb bones than in the cranium. No masses. Target, direction.
  - [hamada1996] (still a search snippet; E.12): laboratory animals mature more than 2 years earlier, and the wild delay falls mostly at 0–4 y, which the authors attribute to a limited supply of nutrition from the mother. A further search summary attributes to the paper mass maturation at about 12.5 y (F) and 15.0 y (M) and adult means of 42.7 kg (F) and 53.2 kg (M) for the Sanwa colony. Unverified.
  - [gurvenWalker2006] electronic appendix (FT, re-read) [L]: captive chimpanzees mature 2–3 years earlier than wild ones and grow larger and faster, partly because they are fed abundantly. No data are shown for the 2–3 years.
- **Wild mass** [pusey2005] (abstract re-read through its index entry): mass varied more in young and old animals than in prime adults, and was highest during frequent banana provisioning. Direction only: food raises wild mass.
- **Captive infants, 0–24 months** [marzke1996] (Abs) [M] captive. 175 animals from three US colonies, mixed longitudinal: weight curves tended to differ between colonies (4 comparisons significant); rearing (mother- or hand-reared) differed in hand and wrist maturation. No masses in the abstract. Direction: well-fed growth still varies with the environment.
- **Growth as allocation** [west2001] (Abs, via search) theory. A growth model derived from how metabolic energy is split between maintaining existing tissue and making new tissue. Use: mechanism citation for growth paid from what remains after maintenance (the E1c surplus rule). No parameter is taken from it.
- Not read: Smith, Butler & Pace 1975 (Holloman colony; [smithButlerPace1975], abstract without numbers), Grether & Yerkes 1940, Gavan 1953.

#### E.14.3 Lactation course and its regulation

- **Chimpanzee lactation holds steady after the first year** [badescu2022] (FT, re-read) [M] and [badescuThesis2017] (FT) [M].
  - badescu2022: nursing bout length did not change with age (P = 0.84); nursing time and rate stayed at about 3% and 1.00 bouts/h from 6 months to 4 y; infant sex and maternal parity did not affect nursing; infants of first-time mothers foraged more. Foraging bouts lengthened from 5.87 ± 4.02 min (6–12 months) to 8.02 ± 2.52 min (1–2 y) and 22.18 ± 18.61 min (over 6 y); the rate of foraging bouts rose until 1 y and then stayed level.
  - The authors' reading: milk transfer probably stays constant while infants add solid food, so lactation effort in apes may hold a plateau through most of infancy.
  - Thesis (chapter 3, the same study): infants' energy needs exceed the milk available at about 1 y; lactation effort then holds for about 3 years and ends with physiological weaning at about 4 y. The thesis also argues that mothers' energy balance stays stable through lactation, because mothers' feeding changes little with infant age at Mahale and Gombe (Hiraiwa-Hasegawa 1990; Murray et al. 2009).
  - Limit: milk transfer was not measured; the plateau is inferred from nipple time and faecal isotopes. Use: target, and a constraint on the mechanism (milk output need not fall between 1 and 4 y).
- **Hair isotopes, Ngogo** [badescu2023] (FT, PMC11650929) [M].
  - 164 naturally shed hairs: 29 infants (61 hairs), 6 juveniles (7), 28 mothers (67), 14 adult males (29); 1–13 hairs per infant age class.
  - Infant minus mother δ15N: 0.7 ± 0.6‰ (hair grown in utero), 1.1 ± 1.2‰ (0–1 y), 2.1 ± 0.9‰ (1–2 y, the maximum), 0.4 ± 0.4‰ (2–2.5 y), 1.2 ± 0.5‰ (2.5–3.5 y). The difference fell with age (GEE β = −0.008, SE 0.004, P = 0.026).
  - Three males aged 4–7.5 y still had higher δ15N than their mothers; the authors suggest some chimpanzees are not weaned until nearly 8 y, and that milk stays an important food after 2.5 y.
  - Use: target.
- **Human milk volume and cost by stage** [fao2004] (FT extract of section 7) [H] human, cross-species.
  - Milk: 807 g/d in months 1–6 of exclusive breastfeeding; 550 g/d after 6 months (partial breastfeeding); 2.8 kJ/g (0.67 kcal/g) from 1 to 24 months; conversion efficiency 0.80.
  - Cost: 2.8 MJ/d (675 kcal/d) in months 1–6, of which 0.72 MJ/d (170 kcal/d) comes from fat stores in well-nourished women (505 kcal/d from food); 1.925 MJ/d (460 kcal/d) after 6 months.
  - Derived: after 6 months, milk volume and cost are 0.68 of their level in months 1–6.
- **Late lactation, test-weighed** [dewey1984] (Abs) [M] human. 10 infants test-weighed in months 7–16 (composition from 46 women): breast milk 875 ml/d at 7 months (93% of total energy intake) and 550 ml/d at 11–16 months (50%); total energy intake rose from 610 to 735 kcal/d. Below 300 ml/d, milk had more protein and sodium and less lactose.
- **Population averages** [paho2003] (FT) [M] human, secondary to WHO/UNICEF 1998. Breast-milk energy 413, 379 and 346 kcal/d at 6–8, 9–11 and 12–23 months (developing countries); 486, 375 and 313 kcal/d (industrialised countries, breastfed children); about 550 g/d at 12–23 months, 35–40% of total energy needs. Derived: at 12–23 months, 0.84 (developing) and 0.64 (industrialised) of the 6–8-month level.
- **Production follows demand, women** [kent1999] (Abs; E.11) [H] human. Extension: after 6 months breast volume, 24-h production and storage capacity all fell; at 15 months production was 208.0 ± 56.7 g per breast per day (6 breasts) against 453.6 g in months 1–6 (48 breasts); production and storage both appeared to respond to the infant's demand. Derived: 0.46 of the early production at 15 months.
- **Infants set the volume** [deweyLonnerdal1986] (Abs) [M] human. 18 mothers of exclusively breastfed infants expressed extra milk daily for 2 weeks; 14 raised production by more than 73 g/d (mean rise 124 g/d). Their infants drank more right afterwards (849 against 732 g/d), but about half returned to near baseline within 1–2 weeks. The authors conclude that differences in milk volume among well-nourished mothers reflect infant demand more than limits on production.
- **Local feedback in the gland** [wilde1995] (Abs) [M] goat, cross-species. How often and how completely milk is removed regulates secretion locally, through an inhibitor in the milk: a 7.6 kDa whey protein (FIL, feedback inhibitor of lactation) inhibited synthesis in tissue culture and briefly lowered secretion when put into the gland of lactating goats. Use: mechanism citation for synthesis inhibited by milk left in the gland (the rule already in the ledger) and for a capacity that tracks removal.
- **Mothers set the ceiling** [wildePrenticePeaker1995] (Abs) [M] review, human. The time course of lactation and the upper limit of production are set by the mother; secretion rate and duration vary with her nutrition; Gambian mothers under nutritional hardship produced as much milk as UK mothers. Use: mechanism citation for a maternal ceiling with demand-driven output below it.
- **Ape milk.**
  - [whittier2011] (Abs) [M] wild. Free-ranging mountain gorillas, healthy mid-lactation samples (1–50 months), n = 7 (10 samples in all): 10.7% dry matter, 1.9% fat, 1.4% crude protein, 6.8% sugar, 0.53 kcal/g; lower in fat and energy than human milk. Derived: 0.79 of the human 0.67 kcal/g (fao2004).
  - [garcia2017] (Abs) [M] captive. 53 samples from 4 gorillas (to 48 months) and 3 orangutans (to 22 months): crude protein 1.27% (gorilla) against 0.85% (orangutan); gorilla fat and gross energy highest at 36 months; orangutan gross energy steady over the first 18 months, tending to fall by 36 months (as the abstract states, although orangutan sampling is given as 22 months). Direction: ape milk does not become poorer on a schedule.
  - No chimpanzee milk composition was read (E.14.7).
- **Orangutan milk intake follows demand** [smith2017] (Abs) [M] wild orangutans, 4 individuals. Barium in teeth rose in the first year and fell soon after, then fluctuated about once a year until death at 8.8 y (a Sumatran individual) or until suckling stopped at 8.1 y (a Bornean female). The authors relate the cycles to infant demand under fluctuating food. Use: ape evidence that milk intake after the first year follows the infant's demand, not a fixed decline. This is the "Smith et al. 2017" of the request; the chimpanzee paper by the same first author is smith2013 (E.14.4).
- **Suckling time is a weak proxy** [cameron1998] (Abs, via search) [M] across mammals. A meta-analysis found a weak positive relation between time spent suckling and milk intake estimated from weight gain, with significant heterogeneity; the only study against isotope-measured intake found none. Use: field nipple-contact shares are not milk-transfer targets.
- **Mothers' diet, Gombe** [murray2009] (Abs) [M]. Controlling for rank, pregnant and lactating females ate higher-quality foods than females that were neither; pregnant females travelled less. Direction: mothers can raise the quality of their intake during lactation.
- **Conflict.** emeryThompson2012 (17 Kanyawara mothers): C-peptide depressed for 6 months after birth, then a net rise through the second year. badescu2022 and the thesis (Ngogo): lactation effort steady from 1 to 4 y, and maternal energy balance read as stable. Both are Kibale studies; one measures the mother's energy balance, the other infers milk transfer from behaviour and isotopes. Read together, the second-year recovery is a change in the mother's balance and is not evidence that milk output falls.

#### E.14.4 Weaning and nursing in wild chimpanzees

- **Weaned age, Gombe** [lonsdorf2020] (FT, accepted manuscript at par.nsf.gov) [H].
  - Kasekela community, 41 years of mother–offspring follows with 1-min point samples. 65 offspring of 29 mothers: 37 with a known weaned age (16 F, 21 M), 28 right-censored.
  - Weaning = cessation of suckling (mouth on the nipple). Weaned age = midpoint between the last observed nipple contact and the next session without it, using only gaps under 90 days.
  - Mean weaned age 4.71 y (SD 1.04, range 2.82–8.01).
  - Sex: males were less likely to be weaned by a given age (HR 0.343; β = −1.069, SE 0.513, P = .037); coefficient of variation 24.8 (males) against 18.0 (females); females were weaned 88.5 days earlier on average; of 13 offspring last seen suckling after 2,000 days of age, 10 were males.
  - Maternal rank × age: at birth, each 10% rise in rank multiplied the hazard of weaning by 2.68 (P = .012); the effect fell with offspring age (HR 0.9994 per day, P = .0052). The lowest-ranking mothers weaned latest. No effect of maternal age or parity (firstborn 5.1 ± 0.7 y against 4.6 ± 1.07 y for later-born, descriptive).
  - Four older siblings briefly resumed suckling after a younger sibling was born, more than 8 months after their own last suckling.
  - Table 1 (from other papers): weaning at 4.2–7.2 y (Gombe), 4–5 (Mahale), 4.1–6 (Kanyawara), 4–7 (Ngogo); marked rise in solid food at 1–2 y (Gombe), 0.83–1 y (Mahale), about 1 y (Ngogo); adult feeding share at 4–5 y (Gombe, Kanyawara) and 3–4 y (Mahale).
  - Secondary (citing badescu2017): the milk share of the diet starts to fall steadily at about 1–1.5 y and milk intake ends at 4–4.5 y; at Ngogo nipple contact goes on to about 7 y, usually without an isotopic milk signal.
  - Use: target (weaned age and its sex difference).
- **Nursing and isotopic weaning, Ngogo** [badescu2016] (FT, PMC5180145) [H].
  - 42 mother–infant pairs (62 infant-by-age-year categories, 0–7 y), 831 focal hours, 9,579 scans of mothers.
  - Mean nursing rate 1.1 bouts/h (SD 0.48, range 0.15–2.52); mean infant–mother faecal δ15N difference 0.50‰ (SD 0.54).
  - Infants handled more by others nursed less (P < 0.001) and had smaller δ15N differences (P < 0.05); interest by others without handling had no effect.
  - Background stated in the text (citing badescu2017): the largest faecal δ15N elevation, 2‰, at 1 y or younger, then a steady decline; weaning ends at 4–4.5 y. No weanling (4–6 y) had died at Ngogo so far.
  - Use: target (nursing rate, isotopic weaning age). With lonsdorf2020, the E.12 secondary statement on badescu2017 (decline from about 1 y, complete at 4–4.5 y) is now seen in two full texts, both citing it; badescu2017 itself is still read as abstract only.
- **Dentine isotopes, Taï** [fahy2014] (Abs) [M]. Serial sections of 4 deciduous incisors and 12 first molars: δ15N about 2–3‰ above adult females until 2 y in both sexes, then a steady decrease, significantly slower in males. Secondary (lonsdorf2020): females weaned about 6 months earlier. Target.
- **First molar and suckling, Kanyawara** [smith2013] (Abs) [M]. Five infants emerged lower first molars by or before 3.3 y (captive mean about 3.2 y, n = 53). Molar emergence did not predict the start of solid food, the end of nursing or the interbirth interval. Infants spent more time on the nipple while the molar was erupting than in the year before, and kept suckling the year after. Target, direction (nipple time does not fall around 3 y).
- **Suckling and eating by age, Gombe** [lonsdorf2014] (FT, PMC4049619) [H].
  - 40 infants (25 M, 15 F), 1988–2011; 1-min point samples; at least 10 h per 60-day block in the first year and 15 h per 90-day block after.
  - Suckling: 2–3.71% of observation time, no significant change with age (0–5 y) or sex.
  - Eating solid food, % of observation time, 6-month blocks starting at 0 / 0.5 / 1 / 1.5 / 2 / 2.5 / 3 / 3.5 / 4 / 4.5 y: 0.23 / 5.33 / 6.67 / 21.95 / 21.64 / 29.74 / 32.45 / 36.14 / 34.43 / 49.09 (rises with age, F1,34 = 278.9, P < 0.0001; no sex effect).
  - Riding on the mother (belly + back): 11–13% of time to 2 y, 9.1% at 2.5 y, 5.6% at 3 y, 1.4% at 4.5 y. Independent travel: 0% at birth to 8.7% at 4.5 y, earlier in males.
  - Use: target (eating share by age; compare with the model's 3–9% of daylight, alongside badescu2022).
- **Weaning conflict.** No rates of nipple refusal by infant age were found.
  - [vandeRijtPlooij1987] (Abs) [M]. Free-ranging chimpanzees, single-subject design (six mother–infant pairs followed to 30 months, as summarised by lonsdorf2014). Conflict in months 5–6: aggressive maternal rebuffs aimed at breaking nipple and belly contact, coinciding with the start of riding on the back and of eating solid food. Further conflict at about months 12 and 18, aimed at breaking body contact.
  - [clark1977] via [maestripieri2002] (FT, author copy) [L]. Six Gombe pairs (n from lonsdorf2014). Maternal rejections started 2–3 years before suckling ceased and grew stronger when mothers resumed oestrus, at infant ages of about 3–4 y; travel was the most distressing context; in the last months infants regressed to whimpering, belly riding and long contact.
  - [badescuThesis2017] (FT) [L]. At Ngogo, rejections varied widely between pairs, were rarely seen with older offspring, and many came surprisingly early in infancy (unpublished data, no rates).
  - Use: direction only. Conflict clusters at dietary transitions (about 6 months; resumption of cycling at 3–4 y), not at a fixed weaning age.

#### E.14.5 Infant solid-food intake

- No chimpanzee intake rate in kcal or grams per minute by age was found; the gap in E.12 stands.
- [bray2018] (E.12): items per minute on five ripe fruits; infants below adults, juveniles not significantly.
- [corpByrne2002] (Abs) [M]. 14 mother–infant pairs eating *Saba florida* fruit (site not named in the abstract). Infants took pulp and fruit parts from their mothers and fed on fruit still attached to the plant. They processed whole fruits by 2 y but mastered the full adult technique only at 4 y. Direction: skill limits intake of a hard-to-process fruit until about 4 y.
- [schuppli2016] (FT, PMC5041519) [M] orangutans, cross-species.
  - Feeding rates (items per minute, as % of the mother's in the same tree, or of the nearest adult female) in 11 (Tuanan) and 10 (Suaq) immatures.
  - Adult rates on easy foods came just after weaning; on foods with more processing steps, later; always before first reproduction.
  - Fruit toughness did not affect feeding rates, so the authors rule out strength as the limit.
  - At weaning, immatures had about 75% of adult female arm length, which the authors estimate as about 50% of adult weight.
  - Use: mechanism citation that infant intake rate is limited by skill and food difficulty more than by body size. The E1c size exponent (0.75, design) finds no support here.

#### E.14.6 Reading for E1f (proposals; nothing implemented)

1. **Growth potential (input).** Use the sanctuary rates as the well-fed potential: 3.4 kg/y (F) and 3.8 kg/y (M) (curry2023), with the first year limited to the captive 2.8 kg (desilva2011), up to the adult mass.
   - Why sanctuary: these animals eat mostly natural vegetation and range in forest enclosures, so theirs is the closest measured well-fed rate. Zoo and research rates (4.7–5.4 kg/y) come with adults 58–88% heavier than wild ones. Scaling captive rates down to wild adult size would put the wild outcome into the input.
   - Derived: F 4.5 kg at 1 y, 18.1 kg at 5 y, 31.3 kg at 8.9 y; M 4.5, 19.7 and 39 kg at 10.1 y. Gombe (target): 10 kg at 5 y (0.51–0.55 of the potential), 21 kg (F) and 24 kg (M) at 10 y; growth knees at 10 y (F) and 13 y (M), i.e. 1.1 y and 2.9 y after the potential reaches adult mass, consistent with captive animals maturing 2–3 years earlier ([L]).
   - Against the current stylisation (linear 2.95 kg/y F and 2.86 kg/y M to 10 and 13 y): faster in males, and the sexes differ in rate rather than end age (leighShea1996, curry2023).
   - The adult mass (Gombe medians) stays an input cap. It is itself partly an outcome of food (pusey2005: heaviest under banana provisioning), so the cap is a stylisation to label.
2. **Lactation course (mechanism).** Make synthesis follow removal under a maternal ceiling.
   - The gland's daily capacity tracks what the infant has removed over the recent past (kent1999, daly1993, deweyLonnerdal1986; local feedback, wilde1995) and never exceeds the mother's ceiling (wildePrenticePeaker1995; the existing M^0.75 yield). No scheduled decline.
   - Output then falls only if the infant eats more solid food, as in humans (0.68 of early volume after 6 months, fao2004; 0.46 per breast at 15 months, kent1999), and stays near the ceiling if it does not, as inferred at Ngogo (badescu2022, badescu2023).
3. **T-ENE-5 needs a different reading.** No chimpanzee source shows milk output falling in the second year; the only one on its course says it holds from 1 to 4 y. The C-peptide recovery (emeryThompson2012) is a recovery of the mother's energy balance, which can come from her intake (murray2009: lactating mothers eat higher-quality foods) while milk output holds. A milk cost that falls in year 2 would reproduce a human pattern, not a measured chimpanzee one. Confidence: low to moderate (the plateau rests on nipple time and isotopes; cameron1998).
4. **Targets for weaning and feeding.**
   - Weaned age 4.71 ± 1.04 y (Gombe, range 2.82–8.01), 4.8 ± 0.7 y (Kanyawara, bray2018), isotopic end 4–4.5 y (Ngogo). Females earlier: by 88.5 days at Gombe, about 6 months at Taï (secondary).
   - The model's weaning age of about 7.2 y lies inside the Gombe range but 2.4 SD above its mean.
   - Eating share by age: lonsdorf2014 (Gombe) and badescu2022 (Ngogo). Suckling time 2–3.7% (Gombe) and about 3% (Ngogo) with no age trend; a model of nutritive suckling only should meet or undershoot it.
5. **Milk energy density (sensitivity).** Ape milk is less energy-dense than human milk (wild gorilla 0.53 against 0.67 kcal/g). The yield coefficient (23.2 kcal/d per kg^0.75) is human-derived and *assumed*. If ape milk volume per kg^0.75 equalled the human value, the energy yield would be 0.79 of it (about 18.4). No ape milk volume exists, so this is a sensitivity bound, not a correction.

#### E.14.7 Not found or unverified

- Rates of maternal nipple refusal by infant age in any wild chimpanzee population. Clark 1977 (book chapter, no DOI) was read only as summarised by maestripieri2002; Hiraiwa-Hasegawa 1990 (Mahale nursing by age, book chapter) was not read.
- Any chimpanzee or other great-ape milk volume or milk energy output, at any stage. Oftedal 1984 is still not read.
- Chimpanzee milk composition. A search summary attributes a lactose content of 7.4 g/100 ml to Hinde & Milligan 2011 (*Evolutionary Anthropology* 20(1):9–23, [doi:10.1002/evan.20289](https://doi.org/10.1002/evan.20289)); the review was not read. Urashima et al. 2009 (*Glycobiology*) reports only oligosaccharides.
- Chimpanzee infant or juvenile intake rate in kcal or grams per minute by age.
- Captive mass-for-age tables: Grether & Yerkes 1940, Gavan 1953, smithButlerPace1975 (abstract without numbers), hamada1996 and the full text of leighShea1996. hamada1996's maturation ages and adult means are from a search summary only.
- A wild growth curve from a primary source: pusey2005's curves (full text not read). A search summary gives 98% of maximum body length at 11.7 y (F) and 13.1 y (M) from laser photogrammetry of wild chimpanzees; the study was not identified.
- emeryThompson2012 full text (C-peptide by month, return of cycling): only the abstract was served.
- smith2013 full text (nipple time by age at Kanyawara): abstract only.
- Pontzer & Wrangham 2006 (ontogeny of ranging, Kanyawara; [doi:10.1007/s10764-005-9011-2](https://doi.org/10.1007/s10764-005-9011-2)): a search summary says a carried infant did not change adult females' day range. The abstract was not reached, so this is not registered.

#### E.14.8 Sources

- *new* leighShea1996: Leigh SR, Shea BT 1996. Ontogeny of body size variation in African apes. *American Journal of Physical Anthropology* 99(1):43–65. [doi:10.1002/(SICI)1096-8644(199601)99:1<43::AID-AJPA3>3.0.CO;2-0](https://doi.org/10.1002/(SICI)1096-8644(199601)99:1%3C43::AID-AJPA3%3E3.0.CO;2-0) (Abs).
- *new* hamadaUdono2002: Hamada Y, Udono T 2002. Longitudinal analysis of length growth in the chimpanzee (*Pan troglodytes*). *American Journal of Physical Anthropology* 118(3):268–284. [doi:10.1002/ajpa.10078](https://doi.org/10.1002/ajpa.10078) (Abs).
- *new* kimuraHamada1996: Kimura T, Hamada Y 1996. Growth of wild and laboratory born chimpanzees. *Primates* 37(3):237–251. [doi:10.1007/BF02381856](https://doi.org/10.1007/BF02381856) (abstract via search summary).
- *new* marzke1996: Marzke MW, Young DL, Hawkey DE, Su SM, Fritz J, Alford PL 1996. Comparative analysis of weight gain, hand/wrist maturation, and dental emergence rates in chimpanzees aged 0–24 months from varying captive environments. *American Journal of Physical Anthropology* 99(1):175–190. [doi:10.1002/(SICI)1096-8644(199601)99:1<175::AID-AJPA10>3.0.CO;2-K](https://doi.org/10.1002/(SICI)1096-8644(199601)99:1%3C175::AID-AJPA10%3E3.0.CO;2-K) (Abs).
- *new* smithButlerPace1975: Smith AH, Butler TM, Pace N 1975. Weight growth of colony-reared chimpanzees. *Folia Primatologica* 24(1):29–59. [doi:10.1159/000155684](https://doi.org/10.1159/000155684) (Abs; no numbers in the abstract).
- *new* west2001: West GB, Brown JH, Enquist BJ 2001. A general model for ontogenetic growth. *Nature* 413(6856):628–631. [doi:10.1038/35098076](https://doi.org/10.1038/35098076) (Abs, via search).
- *new* lonsdorf2020: Lonsdorf EV, Stanton MA, Pusey AE, Murray CM 2020 (online 2019). Sources of variation in weaned age among wild chimpanzees in Gombe National Park, Tanzania. *American Journal of Physical Anthropology* 171(3):419–429. [doi:10.1002/ajpa.23986](https://doi.org/10.1002/ajpa.23986) (FT, accepted manuscript at par.nsf.gov).
- *new* lonsdorf2014: Lonsdorf EV, Markham AC, Heintz MR, Anderson KE, Ciuk DJ, Goodall J, Murray CM 2014. Sex differences in wild chimpanzee behavior emerge during infancy. *PLoS ONE* 9(6):e99099. [doi:10.1371/journal.pone.0099099](https://doi.org/10.1371/journal.pone.0099099) (FT, PMC4049619).
- *new* badescu2016: Bădescu I, Watts DP, Katzenberg MA, Sellen DW 2016. Alloparenting is associated with reduced maternal lactation effort and faster weaning in wild chimpanzees. *Royal Society Open Science* 3(11):160577. [doi:10.1098/rsos.160577](https://doi.org/10.1098/rsos.160577) (FT, PMC5180145).
- *new* badescu2023: Bădescu I, Curteanu C, Sellen DW, Watts DP, Katzenberg MA 2025 (online 2023). Investigating infant feeding development in wild chimpanzees using stable isotopes of naturally shed hair. *American Journal of Primatology* 87(1):e23552. [doi:10.1002/ajp.23552](https://doi.org/10.1002/ajp.23552) (FT, PMC11650929).
- *new* badescuThesis2017: Bădescu I 2017. Infant care, nutritional development and lactation in chimpanzees at Ngogo, Kibale National Park, Uganda. PhD thesis, University of Toronto. [TSpace](https://utoronto.scholaris.ca/server/api/core/bitstreams/ff1f2d14-e55f-4860-8f2c-5aa94f076bd8/content) (FT; no DOI).
- *new* fahy2014: Fahy GE, Richards MP, Fuller BT, Deschner T, Hublin JJ, Boesch C 2014. Stable nitrogen isotope analysis of dentine serial sections elucidate sex differences in weaning patterns of wild chimpanzees (*Pan troglodytes*). *American Journal of Physical Anthropology* 153(4):635–642. [doi:10.1002/ajpa.22464](https://doi.org/10.1002/ajpa.22464) (Abs).
- *new* smith2013: Smith TM, Machanda Z, Bernard AB, Donovan RM, Papakyrikos AM, Muller MN, Wrangham R 2013. First molar eruption, weaning, and life history in living wild chimpanzees. *PNAS* 110(8):2787–2791. [doi:10.1073/pnas.1218746110](https://doi.org/10.1073/pnas.1218746110) (Abs).
- *new* vandeRijtPlooij1987: van de Rijt-Plooij HHC, Plooij FX 1987. Growing independence, conflict and learning in mother–infant relations in free-ranging chimpanzees. *Behaviour* 101(1–3):1–86. [doi:10.1163/156853987X00378](https://doi.org/10.1163/156853987X00378) (Abs).
- *new* maestripieri2002: Maestripieri D 2002. Parent–offspring conflict in primates. *International Journal of Primatology* 23(4):923–951. [doi:10.1023/A:1015537201184](https://doi.org/10.1023/A:1015537201184) (FT, author copy; used for its summary of clark1977).
- *new* clark1977: Clark CB 1977. A preliminary report on weaning among chimpanzees of the Gombe National Park, Tanzania. In Chevalier-Skolnikoff S, Poirier FE (eds), *Primate Bio-Social Development*, Garland, New York, pp. 235–260 (not read; as cited by maestripieri2002; no DOI).
- *new* fao2004: FAO/WHO/UNU 2004. *Human energy requirements: report of a joint FAO/WHO/UNU expert consultation, Rome, 17–24 October 2001*. FAO Food and Nutrition Technical Report Series 1. Rome: FAO. [Section 7, Energy requirements of lactation](https://www.fao.org/4/y5686e/y5686e0b.htm) (FT extract; no DOI).
- *new* dewey1984: Dewey KG, Finley DA, Lönnerdal B 1984. Breast milk volume and composition during late lactation (7–20 months). *Journal of Pediatric Gastroenterology and Nutrition* 3(5):713–720. [doi:10.1097/00005176-198411000-00014](https://doi.org/10.1097/00005176-198411000-00014) (Abs).
- *new* paho2003: PAHO/WHO 2003. *Guiding principles for complementary feeding of the breastfed child*. Washington, DC: Pan American Health Organization. [PDF](https://www.paho.org/sites/default/files/GuidingPrinciples.pdf) (FT; its intake figures are from WHO/UNICEF 1998, *Complementary feeding of young children in developing countries*, not read; no DOI).
- *new* deweyLonnerdal1986: Dewey KG, Lönnerdal B 1986. Infant self-regulation of breast milk intake. *Acta Paediatrica Scandinavica* 75(6):893–898. [doi:10.1111/j.1651-2227.1986.tb10313.x](https://doi.org/10.1111/j.1651-2227.1986.tb10313.x) (Abs).
- *new* wilde1995: Wilde CJ, Addey CVP, Boddy LM, Peaker M 1995. Autocrine regulation of milk secretion by a protein in milk. *Biochemical Journal* 305(1):51–58. [doi:10.1042/bj3050051](https://doi.org/10.1042/bj3050051) (Abs).
- *new* wildePrenticePeaker1995: Wilde CJ, Prentice A, Peaker M 1995. Breast-feeding: matching supply with demand in human lactation. *Proceedings of the Nutrition Society* 54(2):401–406. [doi:10.1079/PNS19950009](https://doi.org/10.1079/PNS19950009) (Abs).
- *new* whittier2011: Whittier CA, Milligan LA, Nutter FB, Cranfield MR, Power ML 2011 (online 2010). Proximate composition of milk from free-ranging mountain gorillas (*Gorilla beringei beringei*). *Zoo Biology* 30(3):308–317. [doi:10.1002/zoo.20363](https://doi.org/10.1002/zoo.20363) (Abs).
- *new* garcia2017: Garcia M, Power ML, Moyes KM 2017 (online 2016). Immunoglobulin A and nutrients in milk from great apes throughout lactation. *American Journal of Primatology* 79(3):e22614. [doi:10.1002/ajp.22614](https://doi.org/10.1002/ajp.22614) (Abs).
- *new* smith2017: Smith TM, Austin C, Hinde K, Vogel ER, Arora M 2017. Cyclical nursing patterns in wild orangutans. *Science Advances* 3(5):e1601517. [doi:10.1126/sciadv.1601517](https://doi.org/10.1126/sciadv.1601517) (Abs).
- *new* cameron1998: Cameron EZ 1998. Is suckling behaviour a useful predictor of milk intake? A review. *Animal Behaviour* 56(3):521–532. [doi:10.1006/anbe.1998.0793](https://doi.org/10.1006/anbe.1998.0793) (Abs, via search).
- *new* murray2009: Murray CM, Lonsdorf EV, Eberly LE, Pusey AE 2009. Reproductive energetics in free-living female chimpanzees (*Pan troglodytes schweinfurthii*). *Behavioral Ecology* 20(6):1211–1216. [doi:10.1093/beheco/arp114](https://doi.org/10.1093/beheco/arp114) (Abs).
- *new* corpByrne2002: Corp N, Byrne RW 2002. The ontogeny of manual skill in wild chimpanzees: evidence from feeding on the fruit of *Saba florida*. *Behaviour* 139(1):137–168. [doi:10.1163/15685390252902328](https://doi.org/10.1163/15685390252902328) (Abs).
- *new* schuppli2016: Schuppli C, Forss S, Meulman EJM, Zweifel N, Lee KC, Rukmana E, Vogel ER, van Noordwijk MA, van Schaik CP 2016. Development of foraging skills in two orangutan populations: needing to learn or needing to grow? *Frontiers in Zoology* 13:43. [doi:10.1186/s12983-016-0178-5](https://doi.org/10.1186/s12983-016-0178-5) (FT, PMC5041519).
- curry2023, desilva2011, hamada1996, gurvenWalker2006, pusey2005, badescu2017, badescu2022, bray2018, kent1999, daly1993, emeryThompson2012 and emeryThompson2016 are already listed; the entries above add findings.

### E.15 Addendum: fast arousal (stage E4b, 1 October 2026)

Evidence pass for stage E4b (a fast arousal state for acute reactions; `docs/staging/e4b-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "captive" as marked).

- **Two time scales of the stress response** [sapolsky2000] (Abs) theory. Glucocorticoids permit, stimulate or suppress an ongoing stress response, or prepare for the next one; the review sorts their actions by endpoint. Use in E4b: the slow states act on a faster response rather than being it (mechanism citation only; no number).
- **Catecholamine clearance** (secondary only, not verified): plasma half-lives of about 1 min (epinephrine, healthy volunteers) and 2–2.5 min (norepinephrine) appear in pharmacology references and in a search summary of a septic-shock study (Abboud et al. 2009, *Critical Care* 13:R120, doi:10.1186/cc7972, whose own text gives 3.5 min in patients and cites, not reports, the healthy value). Use in E4b: a lower bound on the fast state's time constant, *assumed*.
- **Post-conflict anxiety lasts the 10-min window, captive chimpanzees** [fraser2008] (FT, PMC2438392) [M, captive].
  - Chester Zoo; group of 26–32 (17 adult females, 5 adult males); 234 post-conflict and matched-control pairs on 22 recipients of aggression, 129 aggressor–recipient dyads.
  - Self-grooming and self-scratching of recipients stayed above matched controls "for the entire 10 min" of post-conflict observation; consolation lowered them; most post-conflict affiliation came in the first minute.
  - Use in E4b: an upper bound on the fast state's time constant (it must still be up at 10 min); the defeat kick's direction.
- **Heart rate at a dominant's approach, rhesus macaques** [aureli1999] (Abs) [L, cross-species]. Telemetry on 2 middle-ranking adult females in a large free-moving group: heart rate rose after the approach of a dominant, not of kin or a subordinate; it fell faster while receiving grooming than in matched controls. Use in E4b: direction of the threat kick.
- **Heart rate as arousal, review** [wascher2021] (FT extract) [M as a review]. Heart-rate rises in birds after agonistic encounters last seconds (greylag geese: mean 8 s, range 1–261 s); the review gives no primate time course. Use in E4b: context for "seconds to minutes"; no number used.
- **Sound-induced swaying, captive chimpanzees** [hattoriTomonaga2020] (FT, PMC6969502) [M, captive]. 7 chimpanzees (3 males): an auditory beat induced rhythmic swaying, more in males (sex effect P = 0.029). The authors summarise the wild "rain dance": at the start of heavy rain adult males perform rhythmic displays (wild reports seen only as summarised there). No wild rate of rain displays was found. Use in E4b: direction of the storm kick and the male bias of the display.
- **Testosterone and pant-hoots: the statistic** [fedurek2016] (FT, author copy at White Rose eprints 98463; research.md had the abstract) [M].
  - Kanyawara; 11 focal males (ranks 1–11); 185 focal days, 168 of at least 6 h (mean 550 min); 141 urine samples before 09:00 for the monthly analysis.
  - "A focal's hourly T levels were calculated by averaging values from each one-hour interval between 07:00 and 18:00, across the entire study period"; hourly pant-hoot rates likewise. The hourly association (β ± SE = 0.47 ± 0.09) is therefore across the hours of the day within males (testosterone falls through the day, mullerLipson2003), stronger in high-ranking males (interaction −0.15 ± 0.08); high-ranking males called more (−0.29 ± 0.14).
  - The monthly association is weaker; fission–fusion with males, travel time and food type also predicted monthly rates.
  - Use in E4b: T-END-8 is scored in this form (a daily profile); the row's wording ("a male's hourly reading and his pant-hoots per hour") should say so.
- **Oxytocin and intergroup conflict: the controls** [samuni2017] (FT, PMC5240673; extends the entry in the patrols section) [M].
  - Event model: 468 samples, 20 individuals, 296 events; urine collected 15–60 min after the start and up to 60 min after the end of an interaction.
  - Anticipation: before border patrols 6 subjects, 14 samples, 10 events, against 9 individuals, 38 samples, 34 control events.
  - Controls: 90-min periods without positive social interaction (vocalisations aside); at least 10 min of multipartner grooming; group hunting of monkeys. Patrols and encounters did not differ. Hunting was above both affiliative controls but below intergroup conflict.
  - "neither the presence of affiliation during intergroup conflict nor multipartner affiliation without intergroup conflict led to urinary oxytocin levels that differed from nonaffiliative intergroup conflict."
  - Cohesion: during intergroup conflict individuals were less likely to leave their party than in matched control periods (23 against 23 periods).
  - Use in E4b: rules out affiliation during conflict as the route to T-END-12.
- **Oxytocin after aggression alone** [preis2018] (Abs; already listed): not above periods without interaction. Use in E4b: rules out a generic acute-arousal route to oxytocin.
- **Stranger pant-hoots draw captive chimpanzees together** [brooks2021] (FT) [M, captive]. Kumamoto Sanctuary, 29 adults (17 males) in 5 groups; playbacks of unfamiliar males' pant-hoots against crow calls. Dyads stood closer (β = −0.65, P = 0.001); grooming rose in early trials; self-directed behaviour rose (P = 0.028); aggression fell in the later food phase (P = 0.0063). Use in E4b: the behaviour (contact-seeking under out-group threat) exists; candidate held-out row for a later piece.
- **Intergroup competition and cohesion, Taï** [samuni2020b] (FT, open access) [M]. 2 groups, 2013–2015, 38 adults, 1,272 focal days; 40 patrols and 66 encounters. Months with more patrols and encounters had less modular association; current and prior intergroup activity predicted larger parties; current activity predicted less male intragroup aggression. No grooming measure. Use in E4b: context; a candidate held-out row.

- **Redirected aggression among post-conflict interactions, Taï** [wittig2003] (FT, author PDF at eva.mpg.de) [M]. 876 dyadic aggressive interactions among 18 wild chimpanzees of both sexes; the first interaction of the focal conflict partner afterwards (no time limit; "no PCI" if none for the rest of the day): reconciliation 188, offered consolation 164, solicited consolation 176, renewed aggression 174, redirected aggression 88 (10% of conflicts), third-party aggression 28, none 58. Redirection was marginally more frequent after initiators won. Use in E4b: context for the redirect rate (losers only and within minutes in the model, so not the same statistic); candidate held-out row.
**Sources:**
- *new* sapolsky2000: Sapolsky RM, Romero LM, Munck AU 2000. How do glucocorticoids influence stress responses? Integrating permissive, suppressive, stimulatory, and preparative actions. *Endocrine Reviews* 21(1):55–89. [doi:10.1210/edrv.21.1.0389](https://doi.org/10.1210/edrv.21.1.0389) (Abs).
- *new* fraser2008: Fraser ON, Stahl D, Aureli F 2008. Stress reduction through consolation in chimpanzees. *PNAS* 105(25):8557–8562. [doi:10.1073/pnas.0804141105](https://doi.org/10.1073/pnas.0804141105) (FT, PMC2438392).
- *new* aureli1999: Aureli F, Preston SD, de Waal FBM 1999. Heart rate responses to social interactions in free-moving rhesus macaques (*Macaca mulatta*): a pilot study. *Journal of Comparative Psychology* 113(1):59–65. [doi:10.1037/0735-7036.113.1.59](https://doi.org/10.1037/0735-7036.113.1.59) (Abs).
- *new* wascher2021: Wascher CAF 2021. Heart rate as a measure of emotional arousal in evolutionary biology. *Philosophical Transactions of the Royal Society B* 376(1831):20200479. [doi:10.1098/rstb.2020.0479](https://doi.org/10.1098/rstb.2020.0479) (FT extract, PMC8237168).
- *new* hattoriTomonaga2020: Hattori Y, Tomonaga M 2020. Rhythmic swaying induced by sound in chimpanzees (*Pan troglodytes*). *PNAS* 117(2):936–942. [doi:10.1073/pnas.1910318116](https://doi.org/10.1073/pnas.1910318116) (FT extract, PMC6969502).
- *new* brooks2021: Brooks J, Onishi E, Clark IR, Bohn M, Yamamoto S 2021. Uniting against a common enemy: perceived outgroup threat elicits ingroup cohesion in chimpanzees. *PLOS ONE* 16(2):e0246869. [doi:10.1371/journal.pone.0246869](https://doi.org/10.1371/journal.pone.0246869) (FT extract).
- *new* samuni2020b: Samuni L, Mielke A, Preis A, Crockford C, Wittig RM 2020. Intergroup competition enhances chimpanzee (*Pan troglodytes verus*) in-group cohesion. *International Journal of Primatology* 41(2):342–362. [doi:10.1007/s10764-019-00112-y](https://doi.org/10.1007/s10764-019-00112-y) (FT). Not the same paper as samuni2020 (maternal effects).
- *new* wittig2003: Wittig RM, Boesch C 2003. The choice of post-conflict interactions in wild chimpanzees (*Pan troglodytes*). *Behaviour* 140(11–12):1527–1559. [doi:10.1163/156853903771980701](https://doi.org/10.1163/156853903771980701) (FT, author PDF).
- fedurek2016, samuni2017, preis2018, mullerLipson2003 and sobolewski2013 are already listed; the entries above add findings.

**Not verified:** the healthy-volunteer catecholamine half-lives (secondary only); wild rain-display descriptions and any rate (seen only as summarised by hattoriTomonaga2020); Herbinger et al. 2009 (stranger playbacks at Taï, *Animal Behaviour* 78:1389–1396; not read).

### E.16 Addendum: digestion (stage E1b, 1 October 2026)

Requested by the E1b implementer (docs/staging/e1b-prereg.md), 1 October 2026. Questions: apparent digestibility of dry matter, fibre and energy in chimpanzees or great apes; any wild great-ape total energy expenditure; gut capacity; evidence of a digestive pause. Same tags as above. Bibliographic data checked against Crossref on 1 October 2026 except knott2005 (book chapter).

- **Fibre digestion and the formula's fibre credit** [masi2015] (FT extract, PLoS ONE page read through a fetch tool) [M] for its own use.
  - Wild western gorillas: metabolisable energy computed "following Conklin-Brittain et al." with a fourth factor for fibre: "3 kcal/g × 0.449 = 1.347 kcal/g", the 0.449 being the mean NDF digestion coefficient of captive western gorillas fed a highly fibrous diet [remisDierenfeld2004].
  - Mean daily intake estimated by this method: 5,038 ± 267 kcal/d for the silverback, 9,683 ± 225 kcal/d for lactating adult females, 8,914 ± 589 kcal/d for immatures. No comparison with expenditure.
  - Use in Track E: input structure for fibre energy (yield per gram fermented × digestibility); derived from it, the chimpanzee credit of 1.6 kcal/g implies a coefficient of about 0.53. The intake values are direction-only evidence that formula intake overstates absorbed energy (no ape spends 5 × its basal rate).
- **Gorilla digestion trial** [remisDierenfeld2004] (bibliography only; the 0.449 NDF coefficient is seen only as cited by masi2015). Assumed, cross-species.
- **Fibre digestion by orangutans** [schmidt2005] (Abs) [M] captive, cross-species. Two adult and one juvenile orangutans on gel diets: NDF digestibility 74.5% with soybean hulls (52.9% NDF), 57.5% with corncobs at 63.7% NDF, 45.0% on primate biscuits (31.3% NDF); faecal cultures digested 86–88% of NDF in vitro. Range for great-ape fibre digestibility.
- **Fibre fermentation by captive chimpanzees** [kisidayova2009] (Abs) [L], n = 2. Faecal flora from chimpanzees on 14% and 26% NDF diets; "not capable of extensive fiber fermentation", though SCFA production rose with dietary fibre. Direction only.
- **Passage and gut proportions** [milton1999] (FT, PDF) [M].
  - Mean transit time of chimpanzees on a low-fibre (14% NDF) commercial diet: 2.0 d (this confirms the 48 h of miltonDemment1988; the 38 h on 34% NDF is still a snippet). Humans on a refined diet: 2.6 d.
  - Chimpanzees and humans respond alike to fibre (faster turnover with more fibre) and degrade the cellulose and hemicellulose of wheat bran similarly.
  - Humans hold more than 56% of gut volume in the small intestine; all apes hold more than 45% in the colon. The stomach and small-intestine shares of chimpanzees (17–20% and 23–28%, Milton 1987) were seen only on a secondary web page: not verified.
  - Use in Track E: mean retention time and the foregut/hindgut split, assumed.
- **Gut capacity of a chimpanzee** [nakamura2017] (Abs) [M] for the observation, n = 1.
  - A fresh corpse of a mature wild female at Mahale held 258.8 g (dry) and 489.4 cm³ of seeds, which the authors give as 14.7% of the previously reported digestive-tract capacity of a captive chimpanzee. Derived: that capacity is about 3,330 cm³ (the original measurement, probably Chivers & Hladik 1980, and the animal's mass were not read).
  - Use in Track E: gut volume, assumed (scaled by an assumed reference mass of 40 kg); and a lower bound on the dry matter a wild gut carries (seeds alone).
- **Seeds pass intact** [lambert1999] (Abs) [M] and [wrangham1994] (Abs) [M]. Kibale chimpanzees are "coarse fruit processors and seed swallowers" (a mean of 149 large seeds and hundreds of small seeds per dung sample); 98.5% of 1,849 dung samples from two Kibale communities held seeds, which germinated faster after gut passage. Lambert names the "cost of seed ballast". Use in Track E: seeds are bulk without energy; whether uwimbabazi2019's analysed samples include swallowed seeds was not reached, so no seed term is modelled.
- **Fibrous foods at Kibale** [wrangham1991] (Abs) [M], already cited (C7c). Piths are consistently high in hemicellulose and cellulose, "insoluble fibres partly digestible by chimpanzees"; pith intake rose when fruit was scarce. Direction only.
- **Diet-induced thermogenesis** [westerterp2004] (Abs) [H] human, cross-species: a mixed diet at energy balance costs 5–15% of daily energy expenditure, more with protein and carbohydrate, less with fat. [westerterp1999] (Abs) [H] human: 14.6% of intake on a high protein and carbohydrate diet against 10.5% on a high-fat diet, 8 women, 24 h in a respiration chamber. Use in Track E: input (0.10 of energy absorbed), assumed; it closes the captive-day check against pontzer2016 (docs/staging/e1b-prereg.md §3.1).
- **Enforced rest and leaves** [lehmann2008] (FT, PDF) [L] cross-species. The ape time-budget model takes resting time from a comparative equation over 78 primate species (Korstjens et al., then submitted): % resting = −29.47 + 1.28 × mean annual temperature + 0.34 × % leaves in the diet + 5.95 × monthly temperature variation, read as "enforced resting time" from digestion and heat. Direction only (rest rises with leaf share); no chimpanzee digestive-pause measurement.
- **Energetic responses of apes** [knott2005] (FT, PDF) [M]. Mast-season orangutan intake exceeded energy requirements "by several thousand calories"; Kanyawara and Mahale researchers never detected systematic ketone production in chimpanzees; "limitations on gut and digestive capacity" are named as a cost of feeding longer. Direction only.

- **Swallowed seeds and the field intake estimate (stage E1e check, 1 October 2026)** [uwimbabazi2019]. The full text could not be opened (the PMC page asks for a CAPTCHA, not bypassed; Europe PMC serves no full-text file for it). Europe PMC's full-text index answers phrase searches on the article, in which short function words act as one-word wildcards; control phrases ("seeds were purple", "seeds were swallowed") return nothing. Found in the text: "[for] fruit, seeds [were] removed [from the] collected sample before weighing", "food samples [were] processed", "[parts] that [are] discarded by chimpanzees". The word "swallow" does not occur. Reading ([M] as read; exact short words and the scope of the removal unverified): fruit dry mass and composition are pulp without seeds, so swallowed seeds do not inflate the 2,479 kcal/d intake estimate (T-ENE-1) and cannot explain its gap to sourced expenditure.

**Searched and not found (1 October 2026).**
- Apparent digestibility of dry matter, energy or fibre in chimpanzees with numbers: the full text of miltonDemment1988 was not reachable (publisher and repository pages refused); only the abstract (fibre digestibility falls as dietary fibre rises; transit time explains most of its variation) and a snippet (cellulose digestibility 43% lower and hemicellulose 18% lower on the high-fibre diet) were seen. The derivation of the 1.6 kcal/g credit (Conklin-Brittain et al. 2006, a book chapter) was not reached.
- Total energy expenditure of any wild great ape (doubly labelled water, accelerometry, heart rate): none found. pontzer2014's statement that captive and wild primates spend alike remains the only bridge.
- Dry-matter concentration of ape digesta, and a stomach (meal) capacity: none found.
- A chimpanzee digestive pause or an hourly activity profile with numbers: none found (a general statement that chimpanzees rest after the morning feed to digest was seen only on safari web pages and is not used).

- **Sources:**
  - *new* masi2015: Masi S, Mundry R, Ortmann S, Cipolletta C, Boitani L, Robbins MM 2015. The influence of seasonal frugivory on nutrient and energy intake in wild western gorillas. *PLoS ONE* 10(7):e0129254. [doi:10.1371/journal.pone.0129254](https://doi.org/10.1371/journal.pone.0129254) (FT extract).
  - *new* remisDierenfeld2004: Remis MJ, Dierenfeld ES 2004. Digesta passage, digestibility and behavior in captive gorillas under two dietary regimens. *International Journal of Primatology* 25(4):825–845. [doi:10.1023/B:IJOP.0000029124.04610.c7](https://doi.org/10.1023/B:IJOP.0000029124.04610.c7) (bibliography only; value as cited by masi2015).
  - *new* schmidt2005: Schmidt DA, Kerley MS, Dempsey JL, Porton IJ, Porter JH, Griffin ME, Ellersieck MR, Sadler WC 2005. Fiber digestibility by the orangutan (*Pongo abelii*): in vitro and in vivo. *Journal of Zoo and Wildlife Medicine* 36(4):571–580. [doi:10.1638/04-103.1](https://doi.org/10.1638/04-103.1) (Abs).
  - *new* kisidayova2009: Kišidayová S, Váradyová Z, Pristaš P et al. 2009. Effects of high- and low-fiber diets on fecal fermentation and fecal microbial populations of captive chimpanzees. *American Journal of Primatology* 71(7):548–557. [doi:10.1002/ajp.20687](https://doi.org/10.1002/ajp.20687) (Abs).
  - *new* milton1999: Milton K 1999. Nutritional characteristics of wild primate foods: do the diets of our closest living relatives have lessons for us? *Nutrition* 15(6):488–498. [doi:10.1016/S0899-9007(99)00078-7](https://doi.org/10.1016/S0899-9007(99)00078-7) (FT, PDF).
  - *new* nakamura2017: Nakamura M, Sakamaki T, Zamma K 2017. What volume of seeds can a chimpanzee carry in its body? *Primates* 58(1):13–17. [doi:10.1007/s10329-016-0568-5](https://doi.org/10.1007/s10329-016-0568-5) (Abs).
  - *new* lambert1999: Lambert JE 1999. Seed handling in chimpanzees (*Pan troglodytes*) and redtail monkeys (*Cercopithecus ascanius*): implications for understanding hominoid and cercopithecine fruit-processing strategies and seed dispersal. *American Journal of Physical Anthropology* 109(3):365–386. [doi:10.1002/(SICI)1096-8644(199907)109:3<365::AID-AJPA6>3.0.CO;2-Q](https://doi.org/10.1002/(SICI)1096-8644(199907)109:3%3C365::AID-AJPA6%3E3.0.CO;2-Q) (Abs).
  - *new* wrangham1994: Wrangham RW, Chapman CA, Chapman LJ 1994. Seed dispersal by forest chimpanzees in Uganda. *Journal of Tropical Ecology* 10(3):355–368. [doi:10.1017/S0266467400008026](https://doi.org/10.1017/S0266467400008026) (Abs).
  - *new* westerterp2004: Westerterp KR 2004. Diet induced thermogenesis. *Nutrition & Metabolism* 1(1):5. [doi:10.1186/1743-7075-1-5](https://doi.org/10.1186/1743-7075-1-5) (Abs).
  - *new* westerterp1999: Westerterp K, Wilson S, Rolland V 1999. Diet induced thermogenesis measured over 24h in a respiration chamber: effect of diet composition. *International Journal of Obesity* 23(3):287–292. [doi:10.1038/sj.ijo.0800810](https://doi.org/10.1038/sj.ijo.0800810) (Abs).
  - *new* lehmann2008: Lehmann J, Korstjens AH, Dunbar RIM 2008. Time and distribution: a model of ape biogeography. *Ethology Ecology & Evolution* 20(4):337–359. [doi:10.1080/08927014.2008.9522516](https://doi.org/10.1080/08927014.2008.9522516) (FT, PDF at Bournemouth University Research Online). The comparative resting equation is from Korstjens, Lehmann & Dunbar 2010, *Animal Behaviour* 79(2):361–374 ([doi:10.1016/j.anbehav.2009.11.012](https://doi.org/10.1016/j.anbehav.2009.11.012); not read).
  - *new* knott2005: Knott CD 2005. Energetic responses to food availability in the great apes: implications for hominin evolution. In: Brockman DK, van Schaik CP (eds) *Seasonality in Primates*, pp 351–378. Cambridge University Press (FT, author PDF; bibliographic data from the PDF, no DOI checked).
  - wrangham1991, uwimbabazi2019, pontzer2016, miltonDemment1988, ardente2011 and lambert2002 are already cited above.

### E.17 Addendum: nest departure and the active day (stage E2b, 1 October 2026)

Evidence pass for stage E2b (nest departure and the active day; `docs/staging/e2b-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "derived" as marked).

- **Breakfast time, type and place, Taï** [janmaat2014] (FT: the PMC author manuscript PMC4246305, read from the Internet Archive copy of 28 February 2024; the live PMC page asked for a CAPTCHA, which was not bypassed; the publisher page refused the request) [M]. Replaces the earlier "FT extract" reading.
  - 5 habituated adult females, all with offspring under 7 y; followed 16 April 2009 – 30 August 2011 in periods of 4–8 weeks during three fruit-scarce periods; 275 full days. The departure model uses 179 mornings: days after a complete observation day, fruit breakfasts only (74% of mornings).
  - Departure time in seconds from astronomical sunrise (NOAA calculator), linear mixed model (Table 1, estimate ± SE): intercept 779.1 ± 293.7; non-fig breakfast +844.6 ± 328.8; breakfast fruit size +316.3 ± 136.9 (P = 0.026); distance nest–breakfast site −147.4 ± 206.7; non-fig × distance +582.8 ± 246.0 (P = 0.025); adult males at the nest −242.3 ± 116.2; feeding duration at the breakfast site −390.5 ± 105.3; feeding duration × males +234.8 ± 110.3 (P = 0.043); relative energy balance −118.4 ± 108 (P = 0.28); night temperature −134.1 ± 107.7 (P = 0.25); rain at the nest +437.6 ± 215.5 (P = 0.044). Full against control model χ²₄ = 22.67, P = 0.0002. The scaling of the predictors is in the supplement, which was not read, so the coefficients give directions and relative sizes, not seconds per metre.
  - "18% of all departures were before sunrise", in twilight "when navigation is difficult and predation risk is greatest".
  - Females left earlier for figs than for other fruit, but only when the figs were far; breakfast figs far from the nest were not eaten later than near ones (r = 0.016, n = 46): they left earlier to make up for travel time. For non-fig breakfasts they left later when the site was far.
  - Why figs: hetero-specific foragers (monkeys, birds, squirrels) were found feeding in fig feeding trees more often (median proportion 0.45 against 0.35; 12 fig and 29 other species; P = 0.0016); ripe figs and small fruits stay on the tree for shorter periods (P = 0.032; fruit size r = 0.33). The authors control intragroup competition with the males at the nest × feeding duration term and attribute the fig effect to competition with other species.
  - Approach speed to breakfast trees: figs median 0.33 m/s, other fruit 0.16 m/s (32 and 119 sites).
  - Nests in the breakfast tree: 4 of 179 (2%); breakfast was outside the nest every day.
  - Nest grunt to nest building: alone with offspring 19 ± 23 min and 980 ± 685 m (n = 26); in a party 30 ± 27 min and 1,194 ± 1,075 m (n = 82).
  - The authors' reading of late departures to far non-fig sites: mothers avoid travelling when predation risk is greatest (forest leopards hunt with crepuscular peaks; Jenny & Zuberbühler 2005, not read).
  - Use in E2b: target T-RHY-3 (share before sunrise) and direction rows (figs earlier than other fruit; far figs earlier than near figs; far non-fig sites later). Nothing here is an input.
- **Nest departure and the active day by sex class, Budongo** [batesByrne2009] (FT: the authors' accepted manuscript, Sussex repository, figshare 23461388) [M].
  - Sonso community, September 2002 – September 2003; 15 focal adults: 8 males and 7 females, of whom 6 lactating or gestating ("lactating females") and 1 receptive.
  - Leaving the night nest, mean ± SD: males 06:56 ± 32 min (21 departures), lactating females 06:46 ± 13 min (12), receptive females 06:37 ± 12 min (4); no difference (F₂,₃₆ = 1.31, P = 0.28).
  - Nest to nest: males 11 h 34 min ± 35 min (10 days), lactating females 10 h 57 min ± 34 min (7 days); t = 2.139, df = 15, P = 0.049.
  - Stops of 20 min or more: males 6.5 ± 1.8 per day lasting 60 ± 50 min; lactating females 4.5 ± 1.0 lasting 95 ± 83 min. Day range 2.7 ± 1.5 km against 1.2 ± 0.8 km.
  - Derived [L]: departures do not differ, so the shorter day is an earlier evening nest (from the means, about 18:30 for males and 17:43 for lactating females; the two means come from different subsets of days). Sunrise at Sonso (1.7°N, 31.5°E, East Africa Time) is about 06:35–07:05 through the year (computed here, not reported), so animals of every class left at about sunrise, and lactating females nested about an hour before sunset.
  - Use in E2b: T-RHY-1 and its class contrast (target), now with its timing: evening, not morning.
- **Nocturnal activity follows moonlight, Fongoli** [pruetz2018] (Abs) [M]. Savanna mosaic; 403 h of observation on 40 nights, 2007–2013. Chimpanzees were more active after moonrise or before moonset in fuller moon phases (dry season only); most night activity was travel or foraging. The author's premise: diurnal primates have no visual specialization for low light. Use in E2b: direction only; activity in the dark is limited by the light to see by.
- **Postpartum sleep fragmentation, women** [montgomeryDowns2010] (Abs) [M for humans; cross-species]. Wrist actigraphy, 50 mothers, postpartum weeks 2–16: nocturnal sleep 7.2 ± 0.95 h, unchanged over the weeks; sleep efficiency 79.7% (week 2) to 90.2% (week 16) as fragmentation fell (21.7 to 12.8). Use in E2b: night feeding wakes the mother (direction; a tenth to a fifth of the night early in lactation in women), *assumed* for chimpanzees; no chimpanzee value was found.

**Sources:**
- *new* pruetz2018: Pruetz JD 2018. Nocturnal behavior by a diurnal ape, the West African chimpanzee (*Pan troglodytes verus*), in a savanna environment at Fongoli, Senegal. *American Journal of Physical Anthropology* 166(3):541–548. [doi:10.1002/ajpa.23434](https://doi.org/10.1002/ajpa.23434) (Abs).
- *new* montgomeryDowns2010: Montgomery-Downs HE, Insana SP, Clegg-Kraynok MM, Mancini LM 2010. Normative longitudinal maternal sleep: the first 4 postpartum months. *American Journal of Obstetrics and Gynecology* 203(5):465.e1–465.e7. [doi:10.1016/j.ajog.2010.06.057](https://doi.org/10.1016/j.ajog.2010.06.057) (Abs).
- janmaat2014 and batesByrne2009 are already listed (docs/realism-design.md source table); the entries above add findings from their full texts.

**Not verified:** the janmaat2014 supplement (predictor scaling, ripe-fruit presence durations, Fig. S5 leopard attack rates); Jenny & Zuberbühler 2005 (leopard hunting times); any measurement of chimpanzee mothers waking at night to nurse; a chimpanzee visual threshold for travel in low light (Matsuzawa 1990 measured acuity, about 1.5, in daylight only; not read).

### E.18 Addendum: wild total energy expenditure (stage E1g, 1 October 2026)

Evidence pass for stage E1g (sensitivity of the energy ledger to unmeasured wild expenditure; `docs/staging/e1g-prereg.md`), 1 October 2026. Question: is the total energy expenditure of any wild great ape or wild primate measured (doubly labelled water, accelerometry, heart rate), and how do wild and captive expenditures compare in primates and other mammals? Bibliographic data checked against Crossref on 1 October 2026. Full texts were read through Europe PMC's open-access service where it served them; PMC pages that asked for a CAPTCHA, and publisher pages that refused the request (PNAS, Royal Society, Wiley, PeerJ), were not bypassed. Tags as in this Track E section.

- **Wild great apes: no measured total expenditure.** Searched Europe PMC and the web for doubly labelled water, accelerometry and heart rate in wild chimpanzees, bonobos, gorillas and orangutans: none found. Wild orangutan energetics exist only as urinary ketones and C-peptide with activity budgets (erb2018; Vogel et al. 2025, *Science Advances* 11:eadv7613, abstract seen, no expenditure). Every ape expenditure in the literature is captive (pontzer2010, pontzer2016).
- **Free-living primates by doubly labelled water** [simmen2021] (FT, Europe PMC, PMC8270931) [M].
  - 18 species, non-gestating, non-lactating adults; values compiled from earlier studies plus new sifaka data.
  - Table 1, wild populations ("w"): mantled howler *Alouatta palliata* 7.22 kg, 2,496 kJ/d, resting 1,324 kJ/d, PAL 1.89; yellow baboon *Papio cynocephalus* 12.0 kg, 3,400 kJ/d, resting 2,472 kJ/d, PAL 1.38; ring-tailed lemur 1.89; brown lemur 4.20; sportive lemur 3.65; mouse lemur 5.12; Verreaux's sifaka 3.07.
  - Captive populations: olive baboon *P. anubis* 16.2 kg, PAL 1.66; rhesus macaque 1.31; *Pan* (chimpanzees and bonobos pooled, 52.15 kg) 8,082 kJ/d, PAL 1.58; orangutan 1.27; humans 1.57.
  - PAL = expenditure ÷ a resting rate that, for most species, comes from a regression on body mass ("the DEE and RMR were not measured simultaneously on the same animals"). Median PAL: strepsirhines 3.6, haplorhines 1.6; the high lemur values reflect low resting rates.
  - Text: "no notable DEE differences were found between captive and wild animals from the same species, nor between seasons ... nor, in human, between hunter-gatherers and sedentary human populations" (citing nagy1999 and Pontzer 2015, not read).
  - The original source of the wild yellow-baboon value was not traced.
  - Use in E1g: the bounded range of wild expenditure for a haplorhine primate. On the ledger's own PAL (1.36 for a 31.3 kg female), wild baboons correspond to a maintenance multiplier of 1.02 and wild howlers to 1.42 (derived, docs/staging/e1g-prereg.md §2).
- **Wild howler monkeys** [nagyMilton1979] (Abs, Crossref) [M]. Free-living and captive mantled howlers, doubly labelled water. Field metabolic rate 355 kJ kg⁻¹ d⁻¹ ("~2 × basal metabolic rate"); about 40% of the energy in a fruit and leaf diet assimilated; feeding about 54 g dry matter kg⁻¹ d⁻¹. The captive values are not in the abstract.
- **Free-living lemurs** [simmen2010] (FT, Europe PMC, PMC2845615) [M]. Wild ring-tailed and brown lemurs, Berenty, doubly labelled water.
  - Expenditure "much less than the field metabolic rates predicted by various scaling relationships found across mammals".
  - TEE ÷ BMR 1.8–4.1 (ring-tailed) and 2.0–4.7 (brown), depending on whether BMR is taken as 65% or 28% of Kleiber's prediction.
  - Text (secondary): ratios "of 2–3 ... commonly found in mammals"; "values <2 are noted in non-prosimian primates (howler monkeys and humans), and in marsupials".
- **Wild Mayotte lemurs** [simmen2024] (Abs) [M]. Doubly labelled water and accelerometry, 12 *Eulemur fulvus* in an agroforest. Expenditure is among the lowest recorded in eutherians and rises with the daily maximum temperature ("thermoregulation is an important component of the energy budget"). Mass-specific expenditure only 10% below a related species in a gallery forest, "consistent with the assertion that TEE varies within narrow physiological limits".
- **Free-ranging primate scaling** [simmen2015] (Abs) [M]. Field metabolic rates of free-ranging strepsirhines and haplorhines (doubly labelled water) are lower than those of similar-sized eutherians; human expenditure falls on the non-human primate line.
- **Wild primate energy input** [simmen2017] (Abs) [M]. Meta-analysis of 17 wild primate species: daily metabolisable energy input scales with body mass to the 0.75 ± 0.04, close to the exponent of expenditure measured by doubly labelled water; subsistence human populations fall within the primate variation. Whether the intake intercept matches measured expenditure was not read (full text refused).
- **Hunter-gatherers** [pontzer2012] (FT, Europe PMC, PMC3405064) [H] for humans. Hadza, doubly labelled water over 11 days, 17 women and 13 men.
  - Expenditure 1,877 ± 364 kcal/d (women, 43.4 kg) and 2,649 ± 395 kcal/d (men, 50.9 kg).
  - PAL 1.78 ± 0.30 and 2.26 ± 0.48 (BMR estimated from equations), against Western women 1.68 ± 0.22 and men 1.81 ± 0.21 (measured BMR).
  - Expenditure "no different than that of Westerners after controlling for body size".
  - Use in E1g: the upper end of the plausible range for a free-living hominoid (multiplier 1.34 for women's PAL, 1.72 for men's, on the ledger's own PAL; derived).
- **Constrained total expenditure** [pontzer2016cb] (Abs) [H] for humans. 332 adults in five populations, doubly labelled water and accelerometry: expenditure rises with physical activity at low activity and plateaus at high activity.
- **Captive orangutans with wild-like activity** [pontzer2010] (Abs) [M]. Doubly labelled water in orangutans in a large indoor and outdoor habitat: "Despite activity levels similar to orangutans in the wild", they "used less energy, relative to body mass, than nearly any eutherian mammal ever measured".
- **Wild mammals** [westerterpSpeakman2008] (Abs) [H] as a compilation. Daily expenditure of wild terrestrial mammals (doubly labelled water) depends mostly on body mass and ambient temperature; predicted 9.2 MJ/d (95% CI 7.9–12.9) for a 78 kg mammal at 20 °C, not different from modern humans.
- **Field metabolic rates** [nagy1999] (Abs) [H]. Allometry for 79 mammal species (slope 0.734). Named as possible causes of unexplained variation: reproductive, thermoregulatory, social and predator-avoidance behaviour. No field-to-basal ratio in the abstract.
- **Cost of immune activation** [muehlenbein2010] (Abs) [M] for humans; cross-species. 25 men with a natural, non-febrile respiratory infection: resting rate 8% higher during illness, more than 14% in a subset. Use in E1g: a bounded size for one named wild cost, episodic and about a tenth of resting.
- **Smoke and orangutan energetics** [erb2018] (Abs) [M]. Four wild flanged males, Tuanan: urinary ketones rose after a smoke period without a change in caloric intake, "likely due to an increase in energy expenditure, possibly related to immune response". Direction only.
- **Accelerometry in primates** [morgan2023] (Abs) [M], [rezende2023] (Abs; preprint) [L]. Wild chacma baboons: acceleration (VeDBA) over the previous 30–60 min predicted lower urinary C-peptide; no expenditure in kcal. Accelerometry was validated against doubly labelled water only in 10 captive black lion tamarins (326 ± 66 kJ/d; R² 0.46). Neither gives a wild expenditure for a large primate.

**Reading (derived; nothing here is an input).**
- The brief's premise that wild mammals often spend 2–4 × basal holds for mammals in general (simmen2010, secondary), not for haplorhine primates. Measured wild haplorhines have PAL 1.38–1.89 (simmen2021), captive *Pan* 1.4–1.58 (pontzer2016, simmen2021), and captive and wild primates spend alike (pontzer2014, simmen2021).
- On the ledger (31.3 kg female, PAL 1.36 at multiplier 1), measured wild non-human haplorhines bound the maintenance multiplier at **1.0–1.4**; free-living human foragers extend it to 1.7 (men's PAL). Field formula intake (2,479 kcal/d, uwimbabazi2019) needs about 1.8–2.0 (docs/staging/e1g-prereg.md §2): above every measured primate.
- The named wild costs have bounded sizes where measured: immune activation +8–14% of resting while it lasts (muehlenbein2010), thermoregulation small at Kibale temperatures (stage E2a: heat dissipation exceeds production below about 33 °C in shade).

**Sources:**
- *new* simmen2021: Simmen B, Morino L, Blanc S, Garcia C 2021. The energy allocation trade-offs underlying life history traits in hypometabolic strepsirhines and other primates. *Scientific Reports* 11:14196. [doi:10.1038/s41598-021-93764-x](https://doi.org/10.1038/s41598-021-93764-x) (FT).
- *new* nagyMilton1979: Nagy KA, Milton K 1979. Energy metabolism and food consumption by wild howler monkeys (*Alouatta palliata*). *Ecology* 60(3):475–480. [doi:10.2307/1936066](https://doi.org/10.2307/1936066) (Abs).
- *new* simmen2010: Simmen B, Bayart F, Rasamimanana H, Zahariev A, Blanc S, Pasquet P 2010. Total energy expenditure and body composition in two free-living sympatric lemurs. *PLoS ONE* 5(3):e9860. [doi:10.1371/journal.pone.0009860](https://doi.org/10.1371/journal.pone.0009860) (FT).
- *new* simmen2024: Simmen B, Quintard B, Lefaux B et al. 2024. Thermal and morphometric correlates of the extremely low rate of energy use in a wild frugivorous primate, the Mayotte lemur. *Scientific Reports* 14:21700. [doi:10.1038/s41598-024-72189-2](https://doi.org/10.1038/s41598-024-72189-2) (Abs).
- *new* simmen2015: Simmen B, Darlu P, Hladik CM, Pasquet P 2015. Scaling of free-ranging primate energetics with body mass predicts low energy expenditure in humans. *Physiology & Behavior* 138:193–199. [doi:10.1016/j.physbeh.2014.10.018](https://doi.org/10.1016/j.physbeh.2014.10.018) (Abs).
- *new* simmen2017: Simmen B, Pasquet P, Masi S, Koppert GJA, Wells JCK, Hladik CM 2017. Primate energy input and the evolutionary transition to energy-dense diets in humans. *Proceedings of the Royal Society B* 284(1856):20170577. [doi:10.1098/rspb.2017.0577](https://doi.org/10.1098/rspb.2017.0577) (Abs).
- *new* pontzer2012: Pontzer H, Raichlen DA, Wood BM, Mabulla AZP, Racette SB, Marlowe FW 2012. Hunter-gatherer energetics and human obesity. *PLoS ONE* 7(7):e40503. [doi:10.1371/journal.pone.0040503](https://doi.org/10.1371/journal.pone.0040503) (FT).
- *new* pontzer2016cb: Pontzer H, Durazo-Arvizu R, Dugas LR et al. 2016. Constrained total energy expenditure and metabolic adaptation to physical activity in adult humans. *Current Biology* 26(3):410–417. [doi:10.1016/j.cub.2015.12.046](https://doi.org/10.1016/j.cub.2015.12.046) (Abs).
- *new* pontzer2010: Pontzer H, Raichlen DA, Shumaker RW, Ocobock C, Wich SA 2010. Metabolic adaptation for low energy throughput in orangutans. *PNAS* 107(32):14048–14052. [doi:10.1073/pnas.1001031107](https://doi.org/10.1073/pnas.1001031107) (Abs).
- *new* westerterpSpeakman2008: Westerterp KR, Speakman JR 2008. Physical activity energy expenditure has not declined since the 1980s and matches energy expenditures of wild mammals. *International Journal of Obesity* 32(8):1256–1263. [doi:10.1038/ijo.2008.74](https://doi.org/10.1038/ijo.2008.74) (Abs).
- *new* nagy1999: Nagy KA, Girard IA, Brown TK 1999. Energetics of free-ranging mammals, reptiles, and birds. *Annual Review of Nutrition* 19:247–277. [doi:10.1146/annurev.nutr.19.1.247](https://doi.org/10.1146/annurev.nutr.19.1.247) (Abs).
- *new* muehlenbein2010: Muehlenbein MP, Hirschtick JL, Bonner JZ, Swartz AM 2010. Toward quantifying the usage costs of human immunity: altered metabolic rates and hormone levels during acute immune activation in men. *American Journal of Human Biology* 22(4):546–556. [doi:10.1002/ajhb.21045](https://doi.org/10.1002/ajhb.21045) (Abs).
- *new* erb2018: Erb WM, Barrow EJ, Hofner AN, Utami-Atmoko SS, Vogel ER 2018. Wildfire smoke impacts activity and energetics of wild Bornean orangutans. *Scientific Reports* 8:7606. [doi:10.1038/s41598-018-25847-1](https://doi.org/10.1038/s41598-018-25847-1) (Abs).
- *new* morgan2023: Morgan A, Christensen C, Bracken AM, O'Riain MJ, King AJ, Fürtbauer I 2023. Effects of accelerometry-derived physical activity energy expenditure on urinary C-peptide levels in a wild primate (*Papio ursinus*). *Hormones and Behavior* 152:105355. [doi:10.1016/j.yhbeh.2023.105355](https://doi.org/10.1016/j.yhbeh.2023.105355) (Abs).
- *new* rezende2023: Rezende GC, Cruz-Neto AP, Börger L et al. 2023. Validating Dynamic Body Acceleration metrics as a measure of energy expenditure in a Neotropical primate. *bioRxiv* 2023.06.29.547103 (preprint). [doi:10.1101/2023.06.29.547103](https://doi.org/10.1101/2023.06.29.547103) (Abs).
- pontzer2014, pontzer2016 and uwimbabazi2019 are already cited above.

**Not verified:** pontzer2014's full text (Europe PMC serves no file; the PNAS page refused), so which of its 17 species were wild and its captive-versus-wild test statistics are not read here (e-sources §3 records the finding from an earlier full-text read); Ricklefs, Konarzewski & Daan 1996 (*American Naturalist* 147:1047–1071) and Speakman 2000 (*Advances in Ecological Research* 30:177–297), the standard compilations of field-to-basal ratios (no abstract available); Pontzer et al. 2016 PeerJ preprint 2307 (sanctuary versus zoo *Pan*; page refused); the source of the wild yellow-baboon value in simmen2021.

### E.19 Addendum: milk-ejection latency and the growth requirement (stage E1f, 1 October 2026)

Evidence pass of the stage E1f implementer (`docs/staging/e1f-prereg.md`), 1 October 2026, for the one nursing rule (a fixed time cost per bout) and the growth requirement. Bibliographic data checked against Crossref and Europe PMC on that day. Tags as in this Track E section.

- **Milk-ejection latency, women** [gardner2015] (FT, PMC4520208) [M for humans; cross-species].
  - 12 mothers with normal milk production (502–1,356 mL/day); one major milk duct imaged by ultrasound through a whole breastfeed and a 15-min pumping session.
  - Time to the first increase in duct diameter (the first milk ejection): 53.6 ± 30.2 s when breastfeeding, 73.3 ± 22.0 s when pumping (P = 0.057). Duration of the first milk ejection 105 ± 29 s (breastfeeding).
  - The discussion cites other methods giving 73–92 s to milk ejection with a pump under relaxed conditions.
  - Use in E1f: the fixed time a nursing bout costs before milk flows (`ledgerLetDownS` 54 s), *assumed* for chimpanzees. No chimpanzee or ape value was found.
- **Several milk ejections per feed, women** [ramsay2004] (Abs) [M for humans]. Ultrasound of a milk duct in the unsuckled breast: 2.5 ± 1.5 (SD) increases and decreases in duct diameter per breastfeed (n = 62); duct diameter stable between feeds; milk intake rose with the number of milk ejections (r² = 0.365, n = 57). Use: context only. The model lets milk flow after one latency per bout and stop when the store is empty, which is coarser than repeated ejections.
- **The growth requirement, humans** [fao2004], section 4 (FT extract of 4.3–4.4) [H] human. "Energy needs for growth have two components: 1) the energy used to synthesize growing tissues; and 2) the energy deposited in those tissues"; "The sum of energy deposition and TEE is the mean daily energy requirement". Use in E1f: mechanism citation for an appetite that anticipates the cost of growth (`ledgerGrowPotential` with `ledgerDrive`). No number is taken from it.

**Sources:**
- *new* gardner2015: Gardner H, Kent JC, Lai CT, Mitoulas LR, Cregan MD, Hartmann PE, Geddes DT 2015. Milk ejection patterns: an intra-individual comparison of breastfeeding and pumping. *BMC Pregnancy and Childbirth* 15:156. [doi:10.1186/s12884-015-0583-3](https://doi.org/10.1186/s12884-015-0583-3) (FT, PMC4520208).
- *new* ramsay2004: Ramsay DT, Kent JC, Owens RA, Hartmann PE 2004. Ultrasound imaging of milk ejection in the breast of lactating women. *Pediatrics* 113(2):361–367. [doi:10.1542/peds.113.2.361](https://doi.org/10.1542/peds.113.2.361) (Abs).
- fao2004 is already listed (section 7); [section 4, Energy requirements of children and adolescents](https://www.fao.org/4/y5686e/y5686e06.htm) is added.

**Not verified:** any chimpanzee value for the milk-ejection latency, the milk transfer rate per suckling minute, or the number of milk ejections per bout.

### E.20 Addendum: darkness and the forest's other frugivores (stage E2c, 1 October 2026)

Evidence pass for stage E2c (darkness by its consequences; `docs/staging/e2c-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day (except the U.S. Naval Observatory circular and the CIE note, which have no DOI). Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "derived" as marked).

**Light and vision (inputs).**
- **Sky illuminance from the sun's altitude** [janiczekDeYoung1987] (code read: the C++ transcription in the `skylight` R package, bluegreen-labs/skylight, which states it is an almost verbatim transcription; the circular itself not read) [H] as physics. Horizontal illuminance E = 133,775 lux × the model's direct-plus-scattered transmission of the refracted altitude (air mass from an Earth radius of 753.66 scale heights; extinction 0.21 direct, 0.042 sky term), plus 0.0005 lux of night sky; a sky-condition divisor (1 clear to 10 dark stratus) for clouds. Derived here from the code: about 980 lux at 0°, 3.0 lux at −6°, 0.005 lux at −12° (clear sky). The AMS glossary's civil-twilight range (585–410 lux at sunset to 3.5–2 lux at −6°, seen in a search result) agrees in magnitude. Use in E2c: input (`skyLuxSun`, `skyLuxNight`).
- **Visual acuity and illumination, human** [shlaer1937] (FT, Europe PMC XML; Table I read) [H] cross-species. Two trained observers; acuity for a broken circle rises from about 0.044 (1/min of arc) at 10^−2.4 trolands to a plateau of about 2.4 above 10^4; the rod–cone break lies at acuity 0.16. Column II (free fixation, A. M. C., 24 values) fitted here by least squares on log acuity: relative acuity 1 / (1 + (K / T)^n), K = 23.4 trolands, n = 0.48, rms 0.055 log units (derived). Use in E2c: input (`sightAcuityHalfTd`, `sightAcuityExp`).
- **Chimpanzee acuity** [spence1934] (bibliography only; findings as cited by adams2017) and [matsuzawa1990] (as cited by adams2017) [M]. Chimpanzee grating acuity of about 30–50 cycles per degree, in the human range, and chimpanzee contrast-sensitivity functions "a very good fit" to the human one in the same apparatus [adams2017] (FT). How chimpanzee acuity falls with brightness (Spence's subject) was not verified. Use: supports carrying the human acuity curve across, *assumed*.
- **Mesopic limits** [cie2017] (FT, CIE TN 007:2017) [H] as a standard. Under CIE 191:2010 vision is fully photopic at a mesopic luminance of 5.0 cd/m² or more and fully scotopic (rods only, no colour) at 0.005 cd/m² or less. Use: why ripe fruit, chosen partly by colour, is harder to find in twilight (direction).
- **Walking in near-darkness** [figueiro2011] (FT, Europe PMC XML) [M] cross-species. 24 older adults, after 20 min of dark adaptation, on a GAITRite walkway: 110 ± 5 cm/s at 650 lux at the cornea, 101 ± 4 cm/s under night lights (0.015 lux), 105 ± 4 cm/s with laser lines marking the path; step length 59 against 55 cm. Use in E2c: input (`walkDarkPace` 0.92 = 101 ÷ 110), a lower bound on the cost (a clear indoor path).
- Walking in smoke (Nilsson & Fridolf 2020, FEMTC proceedings, read by a search agent; Jin 1978; Frantzich 2000; not verified): speed in very dense smoke is said to equal speed in complete darkness. Not used.

**Night activity and predators (targets and context).**
- **Nocturnal activity across 22 sites** [tagg2018] (FT, MPI-EVA PDF) [M]. PanAf terrestrial camera traps: night activity at 18 of 22 sites, 1.80% of all chimpanzee activity, at all hours but more in twilight (59 events in true night, 60 in twilight); 80.9% of nocturnal chimpanzee-events were movement; no feeding in twilight; more night activity with higher daytime temperature, more forest and less human activity; no effect of predator abundance or moon illumination. Cites "1–85 lux" as the illumination range for feeding activity in great apes (Erkert 2003, 2008; not read) against about 0.3 lux at full moon. Use: T-RHY-5 context; the 1–85 lux range is a behavioural readout (target, secondary), never an input.
- **Night in croplands, Sebitoli (Kibale)** [krief2014] (FT, read by a search agent) [M]: one camera at a maize field, 14 crop-raiding events; 19 of 120 clips more than 1 h after sunset; all night visits at new or quarter moon. [lacroux2022] (Abs) [M]: 15 months of camera traps, night clips 3.3% of forest clips and 41.8% of maize-field clips; in the forest, chimpanzees travelled around twilight. [zamma2014] (Abs) [M]: Mahale, 5 nights of recordings; calls or activity sounds every night (128), often set off by another animal's sound. Use: direction (night waking and twilight travel occur; feeding at night is rare in forest).
- **Leopards absent from Kibale** [wood2017] (FT, PMC) [M]: "Leopards are now absent from Kibale, and no cases of leopard predation on chimpanzees are known"; also absent at Kanyawara; lions and spotted hyenas occasionally enter from Queen Elizabeth NP with no recorded predation on chimpanzees. Use in E2c: no predation term at Kibale.
- **Leopard predation at Taï** [boesch1991] (FT, read by a search agent) [M]: 7 chimpanzees wounded by leopards in 5 years, 1 killed; attack risk about 0.3 per individual-year; observed attacks fell in the day (observers covered only part of the day and none of the night). [jennyZuberbuhler2005] (Abs) [M]: forest leopards at Taï are "diurnal and crepuscular hunters" following their prey. [nakazawa2023] (Abs) [M]: Mahale leopards active through the day with crepuscular peaks. Use: a predation term would belong at Taï, not at Kibale (context for janmaat2014's reading of late departures).

**Other frugivores (searched; no rate found).**
- **Ripe fruit is a sliver of the crop, Kibale** [houle2014] (Abs) [M]: ripe fruits were "usually rare in the tree (<0.5% of all fruit available)", mid-ripe 3–8%. Direction only: ripe fruit is removed fast; no rate.
- **Ripe fruit most ephemeral, Kanyawara** [janmaat2016] (FT, read by a search agent; already cited) [M]: monthly phenology of 1,304 trees, 1990–2011; ripe fruit "the most ephemeral food". No residence time (monthly checks).
- **Ficus thonningii at Kakamega** [kirika2008] (Abs) [M]: 36 frugivore species in 400 h at 25 trees; fruit removal lower in disturbed sites; no rate in the abstract (visitor counts seen only in a search snippet, not verified).
- **Not reached** (paywalls or bot checks; no numbers used): Gautier-Hion & Michaloud 1989 (*Ecology* 70:1826–1833, figs in Gabon); Poulsen et al. 2002 (*Ecology* 83:228–240, primates and hornbills, Dja); Olupot, Waser & Chapman 1998 (*Int J Primatol* 19:339–353, mangabeys and fig trees, Kibale); Korine, Kalko & Herre 2000 (*Oecologia* 123:560–568, fig removal by bats and birds, Panama); the janmaat2014 supplement (ripe-fruit presence durations); Wrangham et al. 1993 (*Int J Primatol* 14:243–256, the value of figs, Kibale). A fig "ripening persistence" of 14–20 days in KwaZulu-Natal was seen in a search result and not traced to a source.
- Use in E2c: none. Without a measured removal rate, background depletion by other frugivores is not modelled (e2c-prereg §3).

**Sources:**
- *new* janiczekDeYoung1987: Janiczek PM, DeYoung JA 1987. Computer programs for sun and moon illuminance with contingent tables and diagrams. *U.S. Naval Observatory Circular* No. 171. Washington DC (no DOI; read through the transcription in the `skylight` R package, Hufkens K, github.com/bluegreen-labs/skylight).
- *new* shlaer1937: Shlaer S 1937. The relation between visual acuity and illumination. *Journal of General Physiology* 21(2):165–188. [doi:10.1085/jgp.21.2.165](https://doi.org/10.1085/jgp.21.2.165) (FT).
- *new* spence1934: Spence KW 1934. Visual acuity and its relation to brightness in chimpanzee and man. *Journal of Comparative Psychology* 18(3):333–361. [doi:10.1037/h0075291](https://doi.org/10.1037/h0075291) (bibliography only).
- *new* matsuzawa1990: Matsuzawa T 1990. Form perception and visual acuity in a chimpanzee. *Folia Primatologica* 55(1):24–32. [doi:10.1159/000156494](https://doi.org/10.1159/000156494) (as cited by adams2017).
- *new* adams2017: Adams L, Wilkinson F, MacDonald S 2017. Limits of spatial vision in Sumatran orangutans (*Pongo abelii*). *Animal Behavior and Cognition* 4(3):204–222. [doi:10.26451/abc.04.03.02.2017](https://doi.org/10.26451/abc.04.03.02.2017) (FT).
- *new* cie2017: CIE 2017. Interim recommendation for practical application of the CIE system for mesopic photometry in outdoor lighting. CIE TN 007:2017. Vienna: CIE (FT).
- *new* figueiro2011: Figueiro MG, Plitnick B, Rea MS, Gras LZ, Rea MS 2011. Lighting and perceptual cues: effects on gait measures of older adults at high and low risk for falls. *BMC Geriatrics* 11:49. [doi:10.1186/1471-2318-11-49](https://doi.org/10.1186/1471-2318-11-49) (FT).
- *new* tagg2018: Tagg N, McCarthy M, Dieguez P, Bocksberger G, Willie J, Mundry R, Stewart F, Arandjelovic M, et al. 2018. Nocturnal activity in wild chimpanzees (*Pan troglodytes*): evidence for flexible sleeping patterns and insights into human evolution. *American Journal of Physical Anthropology* 166(3):510–529. [doi:10.1002/ajpa.23478](https://doi.org/10.1002/ajpa.23478) (FT).
- *new* krief2014: Krief S, Cibot M, Bortolamiol S, Seguya A, Krief J-M, Masi S 2014. Wild chimpanzees on the edge: nocturnal activities in croplands. *PLoS ONE* 9(10):e109925. [doi:10.1371/journal.pone.0109925](https://doi.org/10.1371/journal.pone.0109925) (FT, search agent).
- *new* lacroux2022: Lacroux C, Robira B, Kane-Maguire N, Guma N, Krief S 2022. Between forest and croplands: nocturnal behavior in wild chimpanzees of Sebitoli, Kibale National Park, Uganda. *PLOS ONE* 17(5):e0268132. [doi:10.1371/journal.pone.0268132](https://doi.org/10.1371/journal.pone.0268132) (Abs).
- *new* zamma2014: Zamma K 2014. What makes wild chimpanzees wake up at night? *Primates* 55(1):51–57 (online 2013). [doi:10.1007/s10329-013-0367-1](https://doi.org/10.1007/s10329-013-0367-1) (Abs).
- *new* wood2017: Wood BM, Watts DP, Mitani JC, Langergraber KE 2017. Favorable ecological circumstances promote life expectancy in chimpanzees similar to that of human hunter-gatherers. *Journal of Human Evolution* 105:41–56. [doi:10.1016/j.jhevol.2017.01.003](https://doi.org/10.1016/j.jhevol.2017.01.003) (FT).
- *new* boesch1991: Boesch C 1991. The effects of leopard predation on grouping patterns in forest chimpanzees. *Behaviour* 117(3–4):220–241. [doi:10.1163/156853991x00544](https://doi.org/10.1163/156853991x00544) (FT, search agent).
- *new* jennyZuberbuhler2005: Jenny D, Zuberbühler K 2005. Hunting behaviour in West African forest leopards. *African Journal of Ecology* 43(3):197–200. [doi:10.1111/j.1365-2028.2005.00565.x](https://doi.org/10.1111/j.1365-2028.2005.00565.x) (Abs).
- *new* nakazawa2023: Nakazawa N 2023. Overlap of activity patterns between leopards and their potential prey species in Mahale Mountains National Park, Tanzania. *Journal of Zoology* 319(3):188–199 (online 2022). [doi:10.1111/jzo.13037](https://doi.org/10.1111/jzo.13037) (Abs).
- *new* houle2014: Houle A, Conklin-Brittain NL, Wrangham RW 2014. Vertical stratification of the nutritional value of fruit: macronutrients and condensed tannins. *American Journal of Primatology* 76(12):1207–1232. [doi:10.1002/ajp.22305](https://doi.org/10.1002/ajp.22305) (Abs).
- *new* kirika2008: Kirika JM, Bleher B, Böhning-Gaese K, Chira R, Farwig N 2008. Fragmentation and local disturbance of forests reduce frugivore diversity and fruit removal in *Ficus thonningii* trees. *Basic and Applied Ecology* 9(6):663–672. [doi:10.1016/j.baae.2007.07.002](https://doi.org/10.1016/j.baae.2007.07.002) (Abs).
- janmaat2014, janmaat2016 and pruetz2018 are already cited. kastenCzeplak1980 (cloud attenuation) and chazdon1984 (understory light) are E2a source keys still pending registration (e2a-prereg §3); E2c reuses their registry values unchanged.

**Not verified:** a removal rate of ripe fruit by non-chimpanzee frugivores at any African site; how chimpanzee acuity falls with brightness (Spence 1934's data); a chimpanzee or primate fall rate by light; the reflectance of forest surfaces used for the retinal illuminance (0.1, assumed); the source of the "1–85 lux" feeding range (Erkert, as cited by tagg2018).

### E.21 Addendum: field intake audit (1 October 2026)

Evidence pass for the field audit (`docs/staging/e-field-audit.md`), 1 October 2026. Question: how were the field intake and feeding-time values that the model cannot reproduce (T-ENE-1 to T-ENE-3) measured, are they outliers, what biases does the method carry, and how fast do infants eat? Bibliographic data checked against Crossref on 1 October 2026, except the book chapter. Access:
- Full texts were read through NCBI's BioC text-mining service and efetch (PMC author manuscripts), publisher open-access pages, institutional repositories and archived author sites.
- PMC pages that asked for a CAPTCHA and publisher pages that returned a challenge were not bypassed.
- Entries marked "(subagent)" were read in full by a research subagent of the audit; their load-bearing passages were re-checked unless marked otherwise.

Tags as in this Track E section.

- **How the Kanyawara intake and feeding time were measured** [uwimbabazi2019] (FT: author manuscript NIHMS1029101 through BioC and efetch) [H] for the observations, [M] for the daily energy total. Replaces the E1e phrase-search reading.
  - Subjects and follows:
    - 14 multiparous, habituated females of 17; January 2014 – June 2015; one observer. The Discussion calls them nursing mothers. Intake was not analysed by reproductive state.
    - 210 continuous focal follows, nest to nest where possible. The 141 of at least 10 h (1,597 h) were analysed: 93 in fig months, 48 in drupe months; 14 of the 18 months were fig months.
  - Feeding = reaching, picking, handling or chewing, plus searching gaps under 5 s. A bout is continuous feeding on one item, not ended by non-feeding interruptions of 5 min or less. Bout start and end to the nearest minute; no subtraction of within-bout gaps is described.
  - Rates and mass:
    - Food units per minute counted at 5-min intervals when observation allowed: 4,314 one-minute records over 648 h.
    - Unit mass from at least 30 wet units per food item, collected from the plant eaten or a neighbour and processed to mimic the chimpanzees (spat seeds removed); dried, corrected to 105 °C dry matter and organic matter.
    - Daily dry matter = Σ minutes on item × the item's mean g/min.
  - Wadges: the Discussion notes fibre often spat as a wadge; no subtraction is described. Figs, "normally consumed whole", were sampled whole, seeds included.
  - Energy:
    - ME (kcal/100 g organic matter) = 4 TNC + 4 available protein + 9 lipid + 1.6 NDF, following conklinBrittain2006.
    - TNC by difference (100 − NDF − lipid − available protein − ash); crude protein by near-infrared spectroscopy (N × 6.25); water-soluble carbohydrate (WSC) by phenol–sulphuric assay.
    - Table 2 (% OM): WSC 16.5 of a TNC of 44.6 in ripe fruit; figs 9.2 of 40.7; non-fig fruit 20.1 of 46.6; young leaves 5.1 of 30.5; pith 15.5 of 33.9.
  - Results: daily means 308.7 ± 85 min, 872.6 ± 289 g, 2,479.4 ± 858.1 kcal (SD of days); range 1,240–4,931 kcal. Table 4 by dominant food (mean ± SE): non-fig fruit days 2,706 ± 221 (22), fig days 2,590 ± 95 (76), leaf-and-pith days 2,169 ± 114 (43).
  - Derived from Table 4 (day-weighted; reproduces 2,479):
    - measured sugar 18%, available protein 14%, lipid 7%;
    - TNC by difference beyond measured sugar 34% (210 g);
    - NDF credit 26% (408 g);
    - 839 g organic matter = 0.96 of the dry matter, so ash does not inflate the energy.
  - No comparison with expenditure. The only comparison is with an earlier Kanyawara estimate of 2,340 kcal/day (conklinBrittain2006).
- **Same data, more method** [uwimbabazi2021] (FT, PMC8225573 via BioC) [M].
  - The 2,479 kcal is called the intake of lactating females and compared with lactating women (about 2,500 kcal).
  - The bout is described as continuing while the animal chews, up to 5 min.
  - Protein is given as crude protein at 4 kcal/g.
  - Follows under 10 h were excluded as not comparable. The reported test (F(2,135) = 35.3, P = 0.15) is internally inconsistent.
- **The formula's origin and its authors' caveats** [conklinBrittain2006] (FT: scan from the archived author site; subagent; re-checked) [M] for its own data.
  - Fibre credit: 1.6 kcal/g = 3 kcal/g × 0.543. The 0.543 is the NDF digestibility of captive chimpanzees on a biscuit of 34% NDF and about 2.5% lignin (miltonDemment1988); the wild Kanyawara diet averages about 8% lignin. Orangutans were given 0.543 kcal/g (3 × 0.181) for their more lignified diet.
  - Caveats (pp. 460–462):
    - the 4/4/9 factors are human values for low-fibre mixed diets, and in the authors' words "undoubtedly overestimates" for a high-fibre wild diet;
    - 4 kcal/g for TNC may be too high, because TNC by difference includes soluble fibre;
    - faster passage at high intake lowers digestibility.
  - They suggest a fibre value of 0.5–1.0 kcal/g, and expect that fixing these points would lower all intake values.
  - Method (Kanyawara 1992–93): 10-min focal rotation, instantaneous record at 60 s, bites per minute whenever possible. 17% of chimpanzee feeding minutes lacked rate or nutrient data and were given the month's mean. Feeding = reaching, picking, handling or chewing, included in the rate.
  - Table 17.2 (8 months, both sexes pooled): 1,806–3,333 kcal/day with the fibre credit (mean 2,340); 1,206–2,535 without (mean 1,704); fibre 21–33% of the total.
  - Figure 17.1: lactating females would often fall short of the expenditure estimated by pontzerWrangham2004 without the fibre credit, and have a surplus every month with it.
- **The formula against doubly labelled water** [simmen2017] (electronic supplement FT, CC-BY figshare; main text not reached; extends §18's abstract entry) [M].
  - Published wild primate intakes are split into a "high energy value" set (TNC by difference) and a "low energy value" set (measured soluble sugars, with starch and pectin estimated at about 5% of dry matter each where not measured).
  - Where only TNC by difference exists, intake is multiplied by 0.74, the mean ratio of the two computations across diets (74 ± 8%, Table S3).
  - In ripe-fruit diets, soluble sugars are 48 ± 13% of TNC by difference; sugars, starch and pectin 68 ± 10%.
  - Paired with doubly labelled water in the same species (Table S5):
    - the high-value intake exceeds expenditure by 1,770 ± 2,208 kJ/day (Wilcoxon, P < 0.02, 7 species; ratios 1.13–1.92, derived);
    - the low-value intake does not differ: +144 ± 606 kJ/day, 8 species; ratios 0.84–1.38, mean 1.04, derived.
  - Allometric intercepts: 131 ± 25% (high-value) and 108 ± 27% (low-value) of the expenditure line.
  - No chimpanzee is in the database (Table S1).
- **Taï intake with the same method** [vale2020] (FT and supplement; subagent; Table S3 re-checked; extends §3) [M].
  - 7 adult females and 4 males, July 2017 – June 2018, 158 all-day follows (1,643 h).
  - Items counted per bout, 2 min in 10 extrapolated where the mouth was hidden; rates countable in 2,139 of 3,635 bouts. Nutrient values from nguessan2009; same formula; masses assumed 41.6 (F) and 46.3 kg (M).
  - Table S3, monthly mean daily intake: females 1,237–4,435 kcal (mean of 12 months 2,707), males 1,112–5,466 (2,943); activity cost 640–1,400 kcal/day.
  - Derived: 165–166 kcal per kg^0.75 at the assumed masses.
- **Taï energy balance** [nguessan2009] (FT; subagent; not re-checked): intake method items per minute every 10 min whenever possible, same formula; mean intake not tabulated; balance positive in most seasons; the authors allow that intake was overestimated or expenditure underestimated. Direction only.
- **Orangutan intake** [knott1998] (FT, author PDF; subagent; re-checked) [M].
  - Gunung Palung, full-day follows; rates as items per minute every 3 then every 5 min; TNC by difference with NDF at 0.543 kcal/g.
  - January (mast): females 7,404 kcal/day (10 follows, 1 female), males 8,422.
  - May: females 1,793 (14 follows, 2 females), males 3,824.
  - Feeding 240 and 228 min (females), 347 and 303 (males).
  - Requirement estimate 40 kcal/kg/day.
- **Orangutan intake by fibre assumption** [harrison2010] (FT, author copy; subagent; formula re-checked) [M]. Sabangau, 46 months, nest-to-nest follows of at least 6 h. Adult female intake 1,624 ± 751 kcal/day with NDF at 1.6 kcal/g, 1,226 at 18.1% digestibility, 1,028 with none. Intake exceeded estimated expenditure in a minority of months.
- **Feeding time by protocol, Kanyawara** [gilby2010] (FT, accepted manuscript, Harvard DASH; subagent; re-checked) [H].
  - June 2004 – June 2005; full-day focal follows (mean 9.2 h) of 5 adult males and 5 pregnant or lactating females; 1-min instantaneous samples (81,294; 1,354.9 h).
  - Feeding 32.9% of samples.
  - Party-level 15-min scans (any animal feeding) gave a feeding share higher by a mean of 29.7 percentage points (range 15.9–50, by month), while the diet composition agreed.
- **Activity budgets by site and class** [potts2011] (FT, Harvard DASH author copy; Figures 2 and 3 read from the rendered PDF) [H]. Extends the C7b and C7c entries.
  - Continuous focal follows of one feeding bout and one travel bout, rotating among party members. Feeding/foraging = ingestion or chewing uninterrupted by other behaviour for at least 1 min; travel = sustained movement over 1 min between patches; grooming counted as rest.
  - Pooled: Kanyawara (2006) feed 44%, travel 11%, rest 45%; Ngogo (2005–06) 47%, 14%, 34%, other 5%.
  - By class (digitised ± 2 points): Kanyawara pregnant or lactating females feed about 44%, cycling females 47%, males 44%; Ngogo about 62%, 52%, 43%.
- **Feeding definitions, Waibira** [villioth2025] (FT, PMC12701709 via BioC) [M]. Continuous focal recording; feeding = all food handling, picking and ingesting; movement within the canopy scored as travel; rest = sitting or lying more than 1 min. Follows 4.1 ± 2.6 h (491 h). Feeding 36% (M) and 37% (F), travel 21 and 20%.
- **Feeding share of Gombe mothers** [stanton2017] (FT, PMC5659293 via BioC; subagent; re-checked) [M]. 1-min instantaneous point samples, follows of 6–12 h. Mothers fed 0.47–0.49 of follow time by juvenile presence, 0.51 with a female and 0.47 with a male infant.
- **Infant ingestion rates and feeding time, absolute values** [bray2018] (FT; Figures 2 and 5 digitised from the figure images, ± about 0.3 items/min and ± 1 point; a subagent's independent digitisation agreed) [M]. Extends §12.
  - Ingestion rates, items per minute (1992–1993 targeted samples, at least 30 s in view, 321 records, five ripe fruits): infants 3.0–9.6, juveniles 5.3–11.8, adolescents 9.4–14.1, adults 8.5–13.4.
  - Mean of fruits: infants 6.6, juveniles 9.2, adolescents and adults 11.5. Infant ÷ adult 0.57 (0.35–0.83 by fruit); juvenile ÷ adult 0.80. β-based: 0.59 and 0.85.
  - Feeding time, percent of in-view time (KCP full-day follows, 2010–2013, 1-min point samples, solid food swallowed): 1–2 y 16, 2–3 y 25, 3–4 y 34, 4–5 y 38, juveniles 41–46, adolescents 41; prime-aged adults about 44.5 (mean ± SE band about 40–49).
- **Infant eating share, Gombe** [lonsdorf2014] (FT, Table 1 re-checked) [M]. 1-min point samples, eating = ingestion of solid food: 0.23% at 0 y, 6.7% at 1 y, 22.0% at 1.5 y, 21.6% at 2 y, 29.7% at 2.5 y, 32.5% at 3 y, 49.1% at 4.5 y. No rates.
- **Nut-cracking rate by age, Taï** [boesch2019] (FT; subagent; figure digitised by the subagent, not re-checked) [M] for its technique. Adult asymptote about 1.35 nuts per minute. Near zero to 5 y, adult performance at about 10 y. A lower bound for a hard technique, not a diet-wide rate.
- **Whole-fig analysis** [urquizaHaas2008] (Abs) [M] cross-species. *Ficus perforata* eaten by howler monkeys: seeds are 45% of the fig and are not digested, so whole-fig analysis overstates every nutrient, lipid most. Use: direction of a bias in any intake estimate that analyses figs whole.
- **Methods guide** [rothman2012] (FT, archived author PDF; subagent; one page unreadable) [M].
  - Feeding time is a good index of foraging effort and a poor one of intake.
  - Samples should be processed as the animal processes food (wadges, seeds).
  - N × 6.25 overestimates digestible protein.
  - The 4/4/9 factors may not suit primates.
  - Soluble fibre is probably fully fermented.
- **Rate × time error, captive** [zinner1999] (Abs) [M] cross-species. 18 hamadryas baboons: feeding time explained 30% of the variance in food eaten; mean ingestion rate × feeding time deviated from true intake by 8–50%.
- **Pith wadging** [wrangham1991] (FT, KCP site; subagent; not re-checked): pith intake on 5 occasions 5–54 g wet/min. In the published discussion, the share of pith that is wadged rather than swallowed was unknown.

**Reading (derived; nothing here is an input).**
- T-ENE-1 was measured on nursing mothers. Against the model's lactating class, the field is ×1.44 in intake and ×1.50 in minutes.
- The field formula credits 60% of Kanyawara energy to fractions not measured as such: TNC by difference beyond sugar, and the fibre credit.
  - Where the same formula can be paired with doubly labelled water it overshoots by 13–92% (mean 46%).
  - The sugar-based version matches.
  - On uwimbabazi2019's own composition, the sugar-based intake is 1,810–2,070 kcal/day (0.73–0.83). For a 31–35 kg nursing mother that needs a PAL of 1.3–1.7 outside lactation, inside the measured primate range.
- Feeding share at Kanyawara: 33%, 44%, 44.5% and 45% under four protocols and periods; T-ENE-2 is the highest.
- Infants ingest about 0.57 of the adult's items per minute and juveniles 0.80. These are measured ingestion rates, not per-feeding-minute yields.

**Sources:**
- *new* uwimbabazi2021: Uwimbabazi M, Raubenheimer D, Tweheyo M, Basuta GI, Conklin-Brittain NL, Wrangham RW, Rothman JM 2021. Nutritional geometry of female chimpanzees (*Pan troglodytes*). *American Journal of Primatology* 83(7):e23269. [doi:10.1002/ajp.23269](https://doi.org/10.1002/ajp.23269) (FT, PMC8225573).
- *new* conklinBrittain2006: Conklin-Brittain NL, Knott CD, Wrangham RW 2006. Energy intake by wild chimpanzees and orangutans: methodological considerations and a preliminary comparison. In: Hohmann G, Robbins MM, Boesch C (eds) *Feeding Ecology in Apes and Other Primates*, pp. 445–465 (some citations give 445–471). Cambridge University Press (FT, scan; no DOI found; pages from the scan).
- *new* knott1998: Knott CD 1998. Changes in orangutan caloric intake, energy balance, and ketones in response to fluctuating fruit availability. *International Journal of Primatology* 19(6):1061–1079. [doi:10.1023/A:1020330404983](https://doi.org/10.1023/A:1020330404983) (FT).
- *new* harrison2010: Harrison ME, Morrogh-Bernard HC, Chivers DJ 2010. Orangutan energetics and the influence of fruit availability in the nonmasting peat-swamp forest of Sabangau, Indonesian Borneo. *International Journal of Primatology* 31(4):585–607. [doi:10.1007/s10764-010-9415-5](https://doi.org/10.1007/s10764-010-9415-5) (FT).
- *new* gilby2010: Gilby IC, Pokempner AA, Wrangham RW 2010. A direct comparison of scan and focal sampling methods for measuring wild chimpanzee feeding behaviour. *Folia Primatologica* 81(5):254–264. [doi:10.1159/000322354](https://doi.org/10.1159/000322354) (FT, accepted manuscript).
- *new* stanton2017: Stanton MA, Lonsdorf EV, Pusey AE, Murray CM 2017. Do juveniles help or hinder? Influence of juvenile offspring on maternal behavior and reproductive outcomes in wild chimpanzees (*Pan troglodytes*). *Journal of Human Evolution* 111:152–162. [doi:10.1016/j.jhevol.2017.07.012](https://doi.org/10.1016/j.jhevol.2017.07.012) (FT, PMC5659293).
- *new* boesch2019: Boesch C, Bombjaková D, Meier A, Mundry R 2019. Learning curves and teaching when acquiring nut-cracking in humans and chimpanzees. *Scientific Reports* 9:1515. [doi:10.1038/s41598-018-38392-8](https://doi.org/10.1038/s41598-018-38392-8) (FT).
- *new* urquizaHaas2008: Urquiza-Haas T, Serio-Silva JC, Hernández-Salazar LT 2008. Traditional nutritional analyses of figs overestimates intake of most nutrient fractions: a study of *Ficus perforata* consumed by howler monkeys (*Alouatta palliata mexicana*). *American Journal of Primatology* 70(5):432–438. [doi:10.1002/ajp.20510](https://doi.org/10.1002/ajp.20510) (Abs).
- *new* rothman2012: Rothman JM, Chapman CA, Van Soest PJ 2012. Methods in primate nutritional ecology: a user's guide. *International Journal of Primatology* 33(3):542–566. [doi:10.1007/s10764-011-9568-x](https://doi.org/10.1007/s10764-011-9568-x) (FT, archived author PDF).
- *new* zinner1999: Zinner D 1999. Relationship between feeding time and food intake in hamadryas baboons (*Papio hamadryas*) and the value of feeding time as predictor of food intake. *Zoo Biology* 18(6):495–505. [doi:10.1002/(SICI)1098-2361(1999)18:6<495::AID-ZOO4>3.0.CO;2-U](https://doi.org/10.1002/(SICI)1098-2361(1999)18:6%3C495::AID-ZOO4%3E3.0.CO;2-U) (Abs).
- uwimbabazi2019, simmen2017, vale2020, nguessan2009, masi2015, potts2011, villioth2025, bray2018, lonsdorf2014, badescu2022, matsumoto2017, schuppli2016, corpByrne2002, wrangham1991, wrangham1994, miltonDemment1988, pontzerWrangham2004, pontzer2016 and simmen2021 are already listed; the entries above add findings.

**Not verified:**
- potts2015 (*International Journal of Primatology* 36(6):1101–1119, [doi:10.1007/s10764-015-9880-y](https://doi.org/10.1007/s10764-015-9880-y); Ngogo and Kanyawara foraging efficiency): closed, no abstract in any index.
- simmen2017 main text.
- rothman2012 p. 555 (TNC by subtraction; unreadable page).
- The seed fraction of Kibale figs; any wadge-mass measurement; starch, pectin and soluble-sugar profiles of Kibale foods.
- Doran 1997, Wrangham 1977, Newton-Fisher 1999 and Pontzer & Wrangham 2004 (full text).
- Any published bonobo daily intake (none found).
- Any chimpanzee intake rate in g or kcal per minute by age.

### E.22 Addendum: a circadian sleep gate (stage E2d, 1 October 2026)

Evidence pass for stage E2d (a circadian sleep gate, process C; `docs/staging/e2d-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population; "cross-species" and "derived" as marked). "Search agent" = read in full by a literature agent of this stage, numbers relayed with their location; the inputs below were read directly.

**Process C: the oscillator and its light input (inputs, cross-species).**
- **The two-process model's standard parameters** [skeldonDijk2025] (FT, Europe PMC XML) [H] for humans; [daan1984] (bibliography; the 1984 paper itself not read). Sleep pressure H rises during wake as μ + (H₀ − μ)·exp(−t/χw) and falls during sleep as exp(−t/χs); sleep starts when H reaches the upper threshold H⁺(t) = H₀⁺ + a·C(t) and ends at the lower H⁻(t) = H₀⁻ + a·C(t); C(t) is "the circadian rhythm of wake propensity", in its simplest form a cosine of unit amplitude, with the circadian minimum assigned phase 0 (about 06:00 in young adults). Standard values: χs = 4.2 h, χw = 18.2 h, H₀⁺ = 0.67, H₀⁻ = 0.17, a = 0.12, μ = 1. Without the circadian modulation the cycle has a natural period of 22.6 h with 5.8 h of sleep. The thresholds are read physiologically as the mutual inhibition of sleep-promoting (VLPO) and arousal (monoaminergic) neurons; shifting the drive to the VLPO moves both thresholds together. Use in E2d: input (`circHUpper`, `circHLower`, `circAmp`; χw and χs are E2a's `rhythmSleepRiseH`, `rhythmSleepDecayH`), *assumed* (human).
- **The circadian pacemaker model** [forger1999] (Abs) with its equations and parameter values as used in [crodelle2023] (FT, Europe PMC XML) [H] for humans. A van der Pol oscillator (x, x_c; x is the core-temperature rhythm, its minimum the temperature minimum) driven by light through a photoreceptor pool n ("process L"): dx/dt = (π/12)(x_c + B); dx_c/dt = (π/12)[μ(x_c − 4x_c³/3) − x((24/(0.99669 τx))² + kB)]; B = G(1 − n)α(I)(1 − 0.4x)(1 − 0.4x_c); α(I) = α₀(I/I₀)^p; dn/dt = α(1 − n) − βn (per minute). μ = 0.23, τx = 24.2 h, k = 0.55, G = 33.75, α₀ = 0.05 min⁻¹, p = 0.5, I₀ = 9,500 lux, β = 0.0075 min⁻¹. The output oscillates between about −1 and 1. Fitted to human phase-response data (forger1999: a three-pulse phase-response experiment and a two-pulse amplitude study). [papatsimpa2021] (FT) gives the same structure in the seventh-order variant (μ = 0.13, q = 1/3, k = 0.55, τ = 24.2 h, a₀ = 0.1, β = 0.007, G = 37, α = a₀√(I/9500)·I/(I + 100)) and places the temperature minimum 0.97 h after the model phase −170.7°: a cross-check of the structure, not used for values. Use in E2d: inputs (`circTauH`, `circMu`, `circK`, `circG`, `circAlpha0`, `circP`, `circI0`, `circBeta`, `circSens`), *assumed* (human).
- **Intrinsic period, human** [czeisler1999] (Abs) [H]: the intrinsic period of the human pacemaker averages 24.18 h in young and older adults under controlled dim light (forced desynchrony). Agrees with the model's τx = 24.2 h.
- **Intrinsic period, macaques and squirrel monkeys** (cross-species context). [masudaZhdanova2010] (Abs, search agent) [M]: young adult rhesus macaques in constant dim light (about 10 lux) free-run at 23.4–25.1 h; brighter constant light (about 100 lux) lengthens the period. [zhdanova2012] (FT, search agent): controls 23.5–25.1 h under 10 lux or less (8 young males). [sulzman1979] (secondary, search snippet): squirrel monkeys about 25 h in constant light of 1, 60 or 600 lux. [hobanSulzman1985] (Abs, search agent): 1-h light pulses delay the squirrel monkey clock early in the subjective night and advance it late; none of 10 entrained to a day shorter than 23.5 h. No period has been published for chimpanzees or other great apes (searched). Use: the human 24.2 h lies inside the range of the two diurnal primates measured; the chimpanzee value is unknown.
- **Light sensitivity, human** [zeitzer2000] (FT, search agent) [H]: one 6.5-h exposure in the early biological night, 3–9,100 lux (21 analysed): maximum delay about 3 h; half the maximal phase delay at 80–160 lux (about 100 lux), half the maximal melatonin suppression at about 50–130 lux; 90% of the maximum at about 550 lux (phase) and 200 lux (suppression); little shift below 15 lux. [khalsa2003] (Abs, search agent) [H]: 6.7-h bright-light pulses, 21 subjects: a type 1 phase-response curve with a fitted peak-to-trough amplitude of 5.02 h, delays before the temperature minimum and advances after it, and no dead zone in the subjective day. Use: context for the model's light drive (fitted to the same kind of data); not separate inputs.
- **Melatonin and darkness, rhesus macaque** [reppert1979] (Abs, search agent) [M]: cerebrospinal-fluid melatonin was 2 to more than 15 times higher at night, rose shortly after lights-off and fell soon after lights-on (no minutes in the abstract); daytime darkness did not raise it, and the rhythm persisted 6.5 days in constant darkness (Reppert et al. 1981, as relayed). No chimpanzee melatonin rhythm was found. Use: direction (the rhythm is endogenous and light-entrained in a diurnal primate).

**Sleep timing under natural light (targets and context; never inputs).**
- **Captive chimpanzees under natural light** [videan2005] (FT, dissertation read here; the same data as [videan2006], Abs) [M] captive. Southwest Foundation (Texas) chimpanzees sleeping outdoors "typically retired 15–30 minutes after sunset and rose 45–60 minutes before sunrise" (retiring = reclining and staying inactive for at least 5 min; rising = leaving the sleeping place); an indoor group whose lights went off 3.5 h before sunset retired about 1 h after lights-off and also rose about 45 min before sunrise. Over the whole sample: 8.83 h of sleep (behavioural: lying still, eyes closed, at least 5 min), 10.30 h retired, efficiency 0.86, 3–5 awakenings a night averaging about 20 min (search agent); old adults slept 1.0–1.5 h longer than prime adults. Use in E2d: targets for the sleep episode and the time in the nest (captive, a different latitude, no food in the morning to go to).
- **Captive chimpanzee sleep, EEG** [campbellTobler1984] (FT, search agent) relaying [bert1970] (secondary): 9.7 h of sleep in a 14-h night recording (17:00–07:00; 3 captive adults, natural light); [freemon1971] (secondary): 10.8 h of a 12-h recording in two 4-year-olds, with naps around 12:00–13:30. [rissGoodall1976] (secondary): six captive adolescents retired 17:48–18:05 indoors (sunset 19:40) and rose at sunrise; outdoors they retired 19:05–19:20 and rose about 06:40. Use: sleep need of chimpanzees, about 9–11 h (target and context).
- **Humans under natural light** [wright2013] (FT, search agent) [M]: 8 adults camping in Colorado in July (14 h 40 min of daylight): all circadian markers about 2 h earlier than under electric light, melatonin onset near sunset, melatonin offset just after sunrise, sleep onset and offset about 1.2 h earlier, sleep 6.8 h. [stothard2017] (FT, search agent): in winter camping (9 h 20 min of daylight) sleep began about 2.5 h earlier and lasted 9.9 h, and the biological night (melatonin onset to offset) was 14.4 h against 10.0 h in summer. [yetish2015] (FT, search agent) [M]: Hadza, San and Tsimane fall asleep 2.5–4.4 h (mean 3.3 h) after sunset and usually wake before sunrise (about 1 h before in two of the three; the San in summer 1 h after), sleeping 5.7–7.1 h. Use: the human pacemaker entrains to natural light with melatonin onset near sunset; human sleep starts hours after dusk.
- **Wild chimpanzee sleep** [hozer2026] (Abs, search agent): infrared video at Budongo; nesting in a group lengthened sleep and cut fragmentation but delayed nesting and brought waking earlier. No numbers were obtained (publisher blocked). Use: none yet.

**Sources:**
- *new* skeldonDijk2025: Skeldon AC, Dijk D-J 2025. The complexity and commonness of the two-process model of sleep regulation from a mathematical perspective. *npj Biological Timing and Sleep* 2:24. [doi:10.1038/s44323-025-00039-z](https://doi.org/10.1038/s44323-025-00039-z) (FT).
- *new* daan1984: Daan S, Beersma DGM, Borbély AA 1984. Timing of human sleep: recovery process gated by a circadian pacemaker. *American Journal of Physiology* 246(2):R161–R183. [doi:10.1152/ajpregu.1984.246.2.R161](https://doi.org/10.1152/ajpregu.1984.246.2.R161) (bibliography; values through skeldonDijk2025). The E2a source key borbely1982 refers to this model.
- *new* forger1999: Forger DB, Jewett ME, Kronauer RE 1999. A simpler model of the human circadian pacemaker. *Journal of Biological Rhythms* 14(6):533–538. [doi:10.1177/074873099129000867](https://doi.org/10.1177/074873099129000867) (Abs).
- *new* crodelle2023: Crodelle J, Vanty C, Booth V 2023. Modeling homeostatic and circadian modulation of human pain sensitivity. *Frontiers in Neuroscience* 17:1166203. [doi:10.3389/fnins.2023.1166203](https://doi.org/10.3389/fnins.2023.1166203) (FT).
- *new* papatsimpa2021: Papatsimpa C, Schlangen LJM, Smolders KCHJ, Linnartz J-PMG, de Kort YAW 2021. The interindividual variability of sleep timing and circadian phase in humans is influenced by daytime and evening light conditions. *Scientific Reports* 11:13709. [doi:10.1038/s41598-021-92863-z](https://doi.org/10.1038/s41598-021-92863-z) (FT).
- *new* czeisler1999: Czeisler CA, Duffy JF, Shanahan TL, Brown EN, Mitchell JF, Rimmer DW, Ronda JM, Silva EJ, et al. 1999. Stability, precision, and near-24-hour period of the human circadian pacemaker. *Science* 284(5423):2177–2181. [doi:10.1126/science.284.5423.2177](https://doi.org/10.1126/science.284.5423.2177) (Abs).
- *new* masudaZhdanova2010: Masuda K, Zhdanova IV 2010. Intrinsic activity rhythms in *Macaca mulatta*: their entrainment to light and melatonin. *Journal of Biological Rhythms* 25(5):361–371. [doi:10.1177/0748730410379382](https://doi.org/10.1177/0748730410379382) (Abs, search agent).
- *new* zhdanova2012: Zhdanova IV, Masuda K, Bozhokin SV, Rosene DL, González-Martínez J, Schettler S, Samorodnitsky E 2012. Familial circadian rhythm disorder in the diurnal primate, *Macaca mulatta*. *PLoS ONE* 7(3):e33327. [doi:10.1371/journal.pone.0033327](https://doi.org/10.1371/journal.pone.0033327) (FT, search agent).
- *new* sulzman1979: Sulzman FM, Fuller CA, Moore-Ede MC 1979. Tonic effects of light on the circadian system of the squirrel monkey. *Journal of Comparative Physiology* 129(1):43–50. [doi:10.1007/BF00679910](https://doi.org/10.1007/BF00679910) (secondary).
- *new* hobanSulzman1985: Hoban TM, Sulzman FM 1985. Light effects on circadian timing system of a diurnal primate, the squirrel monkey. *American Journal of Physiology* 249(2):R274–R280. [doi:10.1152/ajpregu.1985.249.2.R274](https://doi.org/10.1152/ajpregu.1985.249.2.R274) (Abs, search agent).
- *new* zeitzer2000: Zeitzer JM, Dijk D-J, Kronauer RE, Brown EN, Czeisler CA 2000. Sensitivity of the human circadian pacemaker to nocturnal light: melatonin phase resetting and suppression. *Journal of Physiology* 526(3):695–702. [doi:10.1111/j.1469-7793.2000.00695.x](https://doi.org/10.1111/j.1469-7793.2000.00695.x) (FT, search agent).
- *new* khalsa2003: Khalsa SBS, Jewett ME, Cajochen C, Czeisler CA 2003. A phase response curve to single bright light pulses in human subjects. *Journal of Physiology* 549(3):945–952. [doi:10.1113/jphysiol.2003.040477](https://doi.org/10.1113/jphysiol.2003.040477) (Abs, search agent).
- *new* reppert1979: Reppert SM, Perlow MJ, Tamarkin L, Klein DC 1979. A diurnal melatonin rhythm in primate cerebrospinal fluid. *Endocrinology* 104(2):295–301. [doi:10.1210/endo-104-2-295](https://doi.org/10.1210/endo-104-2-295) (Abs, search agent).
- *new* videan2005: Videan EN 2005. Sleep and sleep-related behaviors in chimpanzee (*Pan troglodytes*). PhD dissertation, Miami University, Oxford, Ohio (OhioLINK ETD miami1114709943; no DOI) (FT).
- *new* videan2006: Videan EN 2006. Sleep in captive chimpanzee (*Pan troglodytes*): the effects of individual and environmental factors on sleep duration and quality. *Behavioural Brain Research* 169(2):187–192. [doi:10.1016/j.bbr.2005.12.014](https://doi.org/10.1016/j.bbr.2005.12.014) (Abs). Already cited in this Track E section without a list entry.
- *new* campbellTobler1984: Campbell SS, Tobler I 1984. Animal sleep: a review of sleep duration across phylogeny. *Neuroscience and Biobehavioral Reviews* 8(3):269–300. [doi:10.1016/0149-7634(84)90054-X](https://doi.org/10.1016/0149-7634(84)90054-X) (FT, search agent).
- *new* bert1970: Bert J, Kripke D, Rhodes J 1970. Electroencephalogram of the mature chimpanzee: twenty-four hour recordings. *Electroencephalography and Clinical Neurophysiology* 28(4):368–373. [doi:10.1016/0013-4694(70)90229-4](https://doi.org/10.1016/0013-4694(70)90229-4) (secondary, through campbellTobler1984).
- *new* freemon1971: Freemon FR, McNew JJ, Adey WR 1971. Chimpanzee sleep stages. *Electroencephalography and Clinical Neurophysiology* 31(5):485–489. [doi:10.1016/0013-4694(71)90169-6](https://doi.org/10.1016/0013-4694(71)90169-6) (secondary).
- *new* rissGoodall1976: Riss D, Goodall J 1976. Sleeping behavior and associations in a group of captive chimpanzees. *Folia Primatologica* 25(1):1–11. [doi:10.1159/000155703](https://doi.org/10.1159/000155703) (secondary).
- *new* wright2013: Wright KP Jr, McHill AW, Birks BR, Griffin BR, Rusterholz T, Chinoy ED 2013. Entrainment of the human circadian clock to the natural light-dark cycle. *Current Biology* 23(16):1554–1558. [doi:10.1016/j.cub.2013.06.039](https://doi.org/10.1016/j.cub.2013.06.039) (FT, search agent).
- *new* stothard2017: Stothard ER, McHill AW, Depner CM, Birks BR, Moehlman TM, Ritchie HK, Guzzetti JR, Chinoy ED, LeBourgeois MK, Axelsson J, Wright KP Jr 2017. Circadian entrainment to the natural light-dark cycle across seasons and the weekend. *Current Biology* 27(4):508–513. [doi:10.1016/j.cub.2016.12.041](https://doi.org/10.1016/j.cub.2016.12.041) (FT, search agent).
- *new* yetish2015: Yetish G, Kaplan H, Gurven M, Wood B, Pontzer H, Manger PR, Wilson C, McGregor R, Siegel JM 2015. Natural sleep and its seasonal variations in three pre-industrial societies. *Current Biology* 25(21):2862–2868. [doi:10.1016/j.cub.2015.09.046](https://doi.org/10.1016/j.cub.2015.09.046) (FT, search agent).
- *new* hozer2026: Hozer C, Ahabwe F, Freymond N, Cirulnikow M, Chandia B, Mbotella M, Samson D, Zuberbühler K 2026. Rank and social context influence sleep in wild chimpanzees. *Current Biology* 36(1):199–208.e4. [doi:10.1016/j.cub.2025.11.057](https://doi.org/10.1016/j.cub.2025.11.057) (Abs, search agent).

**Not verified:** a circadian period, phase-response curve or melatonin profile for chimpanzees or any great ape (none found); Erkert 2008 (*Biological Rhythm Research* 39:229–267, the source of the "1–85 lux" feeding range cited by tagg2018; publisher refused); the minutes between lights-off and the rise of macaque melatonin; Daan et al.'s skewed circadian waveform (the cosine form of skeldonDijk2025 is used); McNew et al. 1972 (a chimpanzee in constant light; no period found); wild chimpanzee sleep durations (hozer2026 numbers not reached).

### E.23 Addendum: food energy from measured sugars, fibre digestibility and gut capacity (stage E1h, 1 October 2026)

Evidence pass for stage E1h (`docs/staging/e1h-prereg.md`), 1 October 2026. Questions: the composition of the Kanyawara foods by type, the exact rule of the sugar-based energy formula, the best-supported fibre digestibility for chimpanzees, and chimpanzee gut capacity and throughput. Bibliographic data checked against Crossref on 1 October 2026. Access: NCBI BioC for PMC author manuscripts; the figshare API for a CC-BY supplement; Crossref and Europe PMC for abstracts and reference lists. Publisher pages that returned a challenge were not bypassed. Tags as in this Track E section.

- **Composition by food type, Kanyawara** [uwimbabazi2019] (FT, PMC7450825 through BioC; Table 2 re-read in full) [H] for the observations. Extends the entries above with the fig and non-fig rows. % of organic matter, mean ± SE (n species):
  - figs: lipid 3.5 ± 0.7, available protein 6.8 ± 1.9, NDF 49.0 ± 3.8, TNC 40.7 ± 3.6, WSC 9.2 ± 1.2, lignin 17.3 ± 2.7 (12);
  - non-fig ripe fruit: 5.2 ± 1.9, 10.6 ± 1.3, 37.7 ± 2.9, 46.6 ± 3.7, 20.1 ± 1.2, lignin 10.9 ± 1.7 (24);
  - all ripe fruit, young leaves and pith as listed above (WSC 16.5, 5.1, 15.5).
  - Lipid + AP + NDF + TNC sums to 100 ± 0.1 in every row: TNC is by difference on an organic-matter basis.
  - Use in Track E (E1h): the sugar-based energy of each food (derived): per 100 g organic matter, 4 (WSC + pectin) + 4 AP + 9 lipid + 1.6 NDF against the field formula's 4 TNC + …; ratio 0.746 drupes, 0.649 figs, 0.730 young leaves, 0.799 pith at pectin 5% of dry matter.
- **The sugar-based formula, exact rule** [simmen2017] (electronic supplement FT, figshare doi:10.6084/m9.figshare.5032301, CC-BY; Note S2 and Tables S3, S5 re-read; main text still not reached) [M]. Corrects the rule as summarised in §E.21:
  - where a study reported simple soluble sugars, the LEVD model adds 5% starch plus 5% pectin of the dry matter; **where it reported water-soluble carbohydrates (WSC), it adds only 5% pectin**; where only TNC by difference exists, it multiplies the published intake by 0.74;
  - their review: starch 3–6% of dry matter in ripe and unripe fruit, 1–4% in vegetative parts; pectin 4–6% of dry matter in fruit and leaves eaten by wild howlers, the only primate data;
  - sugars + starch + pectin = 68 ± 10% of TNC by difference in ripe-fruit diets (n 7), 44 ± 9% in leaf or unripe-fruit diets (n 11); LEVD ÷ HEVD 74 ± 8% overall (Table S3);
  - Table S5: HEVD − DLW expenditure +1,770 ± 2,208 kJ/day (Wilcoxon W = 28, P < 0.02, 7 species); LEVD − DLW +144 ± 606 kJ/day (t = 0.492, P < 0.7, 8 species). No chimpanzee in the data set;
  - the fibre term is species-specific digestibility × 3 kcal/g in both models.
  - Use in Track E: the rule behind `ledgerFruitKcalPerMinSugar`, `ledgerFigKcalPerMinSugar` and `ledgerFallbackKcalPerMinSugar`; the starch and pectin ranges set their bounds.
- **Chimpanzee fibre digestibility.** 0.543 for NDF in captive chimpanzees on a 34% NDF, about 2.5% lignin biscuit [miltonDemment1988], as reported by [conklinBrittain2006] (FT, re-checked by the field audit) [M] captive. The wild Kanyawara diet averages about 8% lignin (conklinBrittain2006). miltonDemment1988's own full text was not reached (the publisher returned a challenge page; the Elsevier text API refused). Reading: 0.543 is an upper value for wild food; E1b's 0.449 (gorillas on a fibrous diet) is kept.
- **Gut morphology across primates** [chiversHladik1980] (Abs, via Crossref and Europe PMC) [M]. 180 individuals of 78 mammal species (117 primates); stomach, small intestine, caecum and colon measured by area, weight and volume; in frugivores the stomach and large intestine are "more voluminous" in larger species, while in faunivores their volume follows body size. No chimpanzee value in the abstract; the full text is closed. Use in Track E: the likely source of the captive chimpanzee gut capacity in nakamura2017 (its reference list, read through Crossref, cites no other gut-morphology study); direction only: isometric scaling of gut volume with body mass within a species is an assumption.
- **Gut capacity, reference** [nakamura2017] (Abs; reference list through Crossref) [M]. No new number: 3,329 cm³ (derived from the abstract) stays the only chimpanzee gut capacity found; the captive animal's mass is not stated in the abstract. E1h's bounds, 60–111 mL/kg, divide it by 30–55 kg.
- **Gastric emptying** [ardente2011] (Abs), already listed: more than 3 h, less than 16 h. E1b's 3-hour first-order emptying is at the fast end, so the dry-matter throughput it allows is, if anything, high.

**Sources:**
- *new* chiversHladik1980: Chivers DJ, Hladik CM 1980. Morphology of the gastrointestinal tract in primates: comparisons with other mammals in relation to diet. *Journal of Morphology* 166(3):337–386. [doi:10.1002/jmor.1051660306](https://doi.org/10.1002/jmor.1051660306) (Abs).
- uwimbabazi2019, simmen2017, miltonDemment1988, conklinBrittain2006, nakamura2017 and ardente2011 are already listed; the entries above add findings.

**Not verified:**
- simmen2017 main text; miltonDemment1988 full text (digestibility of each fraction, dry-matter intake of the trial animals).
- chiversHladik1980 full text: the chimpanzee's gut volume by segment and its body mass.
- Starch, pectin and soluble-sugar profiles of Kibale foods; dry-matter concentration of ape digesta; maximum voluntary dry-matter intake of chimpanzees. None found.

### E.24 Addendum: calls as decisions (stage E4c, 1 October 2026)

Evidence pass for stage E4c (calls as decisions; `docs/staging/e4c-prereg.md`), 1 October 2026. Bibliographic data checked against Crossref on that day. Tags as in this Track E section (FT, Abs, secondary; [H], [M], [L] rate the observation in its own population). Values marked ≈ were read from a published figure, not a table. Spot-checked against the text by the E4c implementer: fedurek2014 (sample, context shares, fusion timing), southern2025 (rate, contexts, replies), bouchard2022a (arrival calls, bond partners), kalanBoesch2015 (event counts), gruberZuberbuhler2013 (calls when alone), crunchant2021 (rates), wilson2007 (time of day).

**What predicts pant-hooting (targets; none is a model input).**
- **Fission–fusion, travel, oestrous females, food, Kanyawara** [fedurek2014] (FT, author PDF at eva.mpg.de) [M]. 11 males (9 adult), Oct 2010–Sep 2011; 169 focal days of at least 6 h (mean 550 min); 1,320 pant hoots (about 0.85 per male-hour, derived). Context: travel 50.30%, feeding 25.45%, resting 16.60%, displaying 7.65%. Daily rate (LMM): fission–fusion with males β 0.72 ± 0.13 (strongest), travel time 0.02 ± 0.01, a parous oestrous female present 0.32 ± 0.10, food type 0.16 ± 0.07; fission–fusion with females and the number of males or females in the party were not significant; rank a trend only (P = 0.060). Food (≈ Fig. 3): non-fig fruit days about 1.1 per hour against about 0.6 on fig or pith and leaf days. 31.25% of 368 isolated calls coincided with a change in male party composition (males joining 25.27%, leaving 10.32%).
- **Testosterone paper: monthly and hourly predictors, Kanyawara** [fedurek2016] (FT, PMC4864005; extends E.15) [M]. Monthly LMM: fission–fusion with males 0.41 ± 0.08 (strongest), travel time 0.26, rank −0.27 (high rank calls more), non-fig fruit 0.25, testosterone 0.19, oestrous female 0.18 (P = 0.056). Hourly male rate (≈ Fig. 4): 1.46, 1.25, 0.87, 0.69, 0.72, 0.60, 0.64, 0.52, 0.46, 0.44, 0.24, 0.13 per hour for 07 to 18 h.
- **Location, party and time of day, Kanyawara** [wilson2007] (FT; extends §11 and C10) [M]. Party pant-hoot rate (stepwise regression over 249 parties): mean adult males 0.33, females with swellings 0.47, hours in crops −0.23 (R² 0.26). Per-capita rate peaks early in the morning (07–08 h) and falls until about noon. Focal males: median 0.76 per hour in the core, 0.19 at the periphery, 0 in crops; rank τ = −0.545 (N = 12).
- **Rank and audience, Kibale** [clark1993] (Abs) [M]. 230 h of focal sampling: females and low-ranking males were generally quiet except in mixed parties; high-ranking males called in all contexts.
- **Arrival pant-hoots and status, Kanyawara** [clarkWrangham1994] (Abs; held-out key of T-COM-9) [M]. 272 party arrivals at food over 16 months: at unoccupied trees arrival pant-hoots came only from parties with at least one high-ranking male; calling was unrelated to the amount of ripe fruit and did not change other parties' arrival.
- **Mahale** [mitaniNishida1993] (secondary only; not verified): cited for calling before and after travel, by higher-ranking males and to attract nearby allies (kalanBoesch2015, wilson2007); a later first-person summary says males called more when their friends were in the party and presumably nearby (mitani2021). Which way ally absence acts is ambiguous at second hand; the "43% after travel" in the registry notes of `travelCallPerH` is not verified.
- **Chorusing with partners, Kanyawara** [fedurek2013] (Abs) [M]: males more often joined the pant hoots of preferred long-term partners; on chorus days dyads groomed, displayed and formed coalitions together more. [mitaniGrosLouis1998] (Abs) [M]: chorused calls of particular dyads converged acoustically.
- **Contexts, Budongo** [notmanRendall2005] (Abs) [M]: 201 series from 7 males; pant hoots more likely at abundant food sources; calls given on the ground in small parties before joining others were acoustically distinct.
- **Inquiring pant-hoots and replies, Loango** [southern2025] (FT, PMC12699367) [M] (*P. t. troglodytes*). 10 adult males, 16 months, 1,747 pant hoots: 1.21 per male-hour; travel 45%, feeding 29%, rest 18%, display 7.5%. Higher rank called more (β 0.56). Inquiring pant hoots (travel, with waiting or scanning; 352): more in smaller parties, at high fission–fusion and when the preferred partner was absent (β −0.58); 75% got a vocal reply and 67% were followed by fusion, on average 5.2 min later. The presence of the preferred partner did not affect general pant hoots.
- **Joining a feeding tree, Budongo Sonso** [bouchard2022a] (FT, CC BY) [M]. 10 males, 692 h, 233 arrival events: when joining others, pant hoots in 0.35 ± 0.14 and rough grunts in 0.36 ± 0.16 of events; when being joined, 0.08 ± 0.04 and 0.14 ± 0.08. Arrival pant hoots were more likely in smaller parties and when high-ranking males (β 1.30) and bond partners (β 1.08) were absent.

**Rates, sexes and time of day (targets).**
- **Call rates, Issa** [crunchant2021] (FT, PMC8532989) [M] (all loud calls: pant hoots, screams, barks). 487 focal hours, 21 individuals: adult and subadult males 1.91 per hour [1.52–2.40], females 0.84 [0.59–1.21], juveniles 0.50; more with travel and in open vegetation; highest in the morning, falling, then rising in the late afternoon. Cites Taï (Kalan 2019, not read): males 2.5 ± 1.08, females 0.88 ± 0.32 per hour.
- **Sexes, Budongo** [holden2024] (FT as read by the evidence agent; bioRxiv preprint, not peer reviewed) [L]: females 0.61 ± 0.58 per hour against males 1.60 ± 1.13; 9.9% of 232 female and 30.5% of 295 male pant hoots were spontaneous, the rest replies.
- **Loud calls through the day and night, Issa, with a Kanyawara curve** [piel2018] (FT, accepted manuscript) [M]. 9 recorders, 250 days, 1,573 loud calls; peaks at 17–18 h and 07 h, some at night. The Kanyawara party curve (M. Wilson's data, ≈ Fig. 7): about 4.1 per hour at 07 h, 1.0–2.1 from 09 to 17 h, 1.8 at 18 h.

**Food calls, travel hoos and other quiet calls (targets).**
- **Food calls at Taï** [kalanBoesch2015] (FT, author PDF; extends C10) [M] (*P. t. verus*). 5 males and 4 females, 754.5 h, 557 feeding events: food calls in 41% (227) of events at any time and 19% (107) in the first minute after arrival; pant hoots in 27% (151) and 4% (24). Food calls at 51% of fruit, 38% of nut and 17% of leaf events. Males called more with more males present; ecological variables (tree size, fruit count) were not significant; food calls on fruit raised arrivals of others.
- **Food calls and partners** [slocombe2010] (Abs; numbers not seen), [schel2013] (Abs) [M]: playback of a familiar male's arrival pant hoot to silently feeding males drew food calls more for high-friendship callers; [fedurekSlocombe2013] (Abs) [M], Kanyawara: more food calls with males than females nearby and with preferred partners; no correlation with party size.
- **Travel hoos** [gruberZuberbuhler2013] (FT; extends C10): 275 of 456 travel events hooed (60.3%); of the vocal events 2 were by an animal alone and 10 by one alone with dependent offspring, against 32 and 19 of the 181 silent ones; with an audience, 75.6% with an ally present against 55.4% without; dominant present or not and an oestrous female present or not: no difference.
- **Quiet hoo variants** [crockford2018] (FT, PMC5990785) [M]: travel, rest and alert hoos are acoustically distinct (271 hoos, 29 individuals). **Rest hoos** [bouchard2022b] (FT, PMC9334450) [M]: in 9.7% of 1,494 resting bouts of 10 males, 2.7% alone and 12.8% with an audience; more with small audiences and a top proximity partner. Not modelled.
- **Audience costs** [townsend2008] (FT, PMC3278306) [M]: females gave copulation calls in 36% of 287 copulations, fewer with more adult females present, especially of equal or higher rank.

**Use in E4c.** Nothing above is a model input. The mechanism (calls valued by what out-of-sight allies, companions and competitors learn) is motivated by the contact and recruitment functions supported here (bouchard2022a, southern2025, fedurek2014, gruberZuberbuhler2013, kalanBoesch2015); its weights are design assumptions. The readouts registered as tests: context shares (fedurek2014, southern2025), hourly profile (fedurek2016, wilson2007, piel2018), female-to-male ratio (crunchant2021, holden2024), fission–fusion and oestrous-female associations (fedurek2014), arrival calls (bouchard2022a, kalanBoesch2015), travel hoos (gruberZuberbuhler2013), food calls (kalanBoesch2015).

**Sources:**
- *new* fedurek2014: Fedurek P, Donnellan E, Slocombe KE 2014. Social and ecological correlates of long-distance pant hoot calls in male chimpanzees. *Behavioral Ecology and Sociobiology* 68(8):1345–1355. [doi:10.1007/s00265-014-1745-4](https://doi.org/10.1007/s00265-014-1745-4) (FT).
- *new* clark1993: Clark AP 1993. Rank differences in the production of vocalizations by wild chimpanzees as a function of social context. *American Journal of Primatology* 31(3):159–179. [doi:10.1002/ajp.1350310302](https://doi.org/10.1002/ajp.1350310302) (Abs).
- *new* mitani2021: Mitani JC 2021. My life among the apes. *American Journal of Primatology* 83(6):e23107 (online 2020). [doi:10.1002/ajp.23107](https://doi.org/10.1002/ajp.23107) (FT, read by the evidence agent).
- *new* fedurek2013: Fedurek P, Machanda ZP, Schel AM, Slocombe KE 2013. Pant hoot chorusing and social bonds in male chimpanzees. *Animal Behaviour* 86(1):189–196. [doi:10.1016/j.anbehav.2013.05.010](https://doi.org/10.1016/j.anbehav.2013.05.010) (Abs).
- *new* mitaniGrosLouis1998: Mitani JC, Gros-Louis J 1998. Chorusing and call convergence in chimpanzees: tests of three hypotheses. *Behaviour* 135(8):1041–1064. [doi:10.1163/156853998792913483](https://doi.org/10.1163/156853998792913483) (Abs).
- *new* notmanRendall2005: Notman H, Rendall D 2005. Contextual variation in chimpanzee pant hoots and its implications for referential communication. *Animal Behaviour* 70(1):177–190. [doi:10.1016/j.anbehav.2004.08.024](https://doi.org/10.1016/j.anbehav.2004.08.024) (Abs).
- *new* southern2025: Southern LM, Deschner T, Pika S 2025. Inquiring pant-hoots in wild chimpanzees and the role of social bonds and group cohesion. *American Journal of Primatology* 87(12):e70092. [doi:10.1002/ajp.70092](https://doi.org/10.1002/ajp.70092) (FT).
- *new* bouchard2022a: Bouchard A, Zuberbühler K 2022. Male chimpanzees communicate to mediate competition and cooperation during feeding. *Animal Behaviour* 186:41–55. [doi:10.1016/j.anbehav.2022.01.009](https://doi.org/10.1016/j.anbehav.2022.01.009) (FT).
- *new* bouchard2022b: Bouchard A, Zuberbühler K 2022. An intentional cohesion call in male chimpanzees of Budongo Forest. *Animal Cognition* 25(4):853–866. [doi:10.1007/s10071-022-01597-6](https://doi.org/10.1007/s10071-022-01597-6) (FT).
- *new* crunchant2021: Crunchant A-S, Stewart FA, Piel AK 2021. Vocal communication in wild chimpanzees: a call rate study. *PeerJ* 9:e12326. [doi:10.7717/peerj.12326](https://doi.org/10.7717/peerj.12326) (FT).
- *new* holden2024: Holden E, Grund C, Eguma R, Samuni L, Zuberbühler K, Soldati A, Hobaiter C 2024. Sex differences in pant-hoot vocalizations in wild Eastern chimpanzees. *bioRxiv* preprint. [doi:10.1101/2024.12.14.628485](https://doi.org/10.1101/2024.12.14.628485) (FT as read by the evidence agent; not peer reviewed).
- *new* piel2018: Piel AK 2018. Temporal patterns of chimpanzee loud calls in the Issa Valley, Tanzania: evidence of nocturnal acoustic behavior in wild chimpanzees. *American Journal of Physical Anthropology* 166(3):530–540. [doi:10.1002/ajpa.23609](https://doi.org/10.1002/ajpa.23609) (FT, accepted manuscript).
- *new* schel2013: Schel AM, Machanda Z, Townsend SW, Zuberbühler K, Slocombe KE 2013. Chimpanzee food calls are directed at specific individuals. *Animal Behaviour* 86(5):955–965. [doi:10.1016/j.anbehav.2013.08.013](https://doi.org/10.1016/j.anbehav.2013.08.013) (Abs).
- *new* fedurekSlocombe2013: Fedurek P, Slocombe KE 2013. The social function of food-associated calls in male chimpanzees. *American Journal of Primatology* 75(7):726–739. [doi:10.1002/ajp.22122](https://doi.org/10.1002/ajp.22122) (Abs).
- *new* crockford2018: Crockford C, Gruber T, Zuberbühler K 2018. Chimpanzee quiet hoo variants differ according to context. *Royal Society Open Science* 5(5):172066. [doi:10.1098/rsos.172066](https://doi.org/10.1098/rsos.172066) (FT).
- *new* townsend2008: Townsend SW, Deschner T, Zuberbühler K 2008. Female chimpanzees use copulation calls flexibly to prevent social competition. *PLoS ONE* 3(6):e2431. [doi:10.1371/journal.pone.0002431](https://doi.org/10.1371/journal.pone.0002431) (FT).
- *new* mitaniNishida1993: Mitani JC, Nishida T 1993. Contexts and social correlates of long-distance calling by male chimpanzees. *Animal Behaviour* 45(4):735–746. [doi:10.1006/anbe.1993.1088](https://doi.org/10.1006/anbe.1993.1088) (bibliographic record only; findings secondary). Already cited as a key; this adds the record.
- *new* clarkWrangham1994: Clark AP, Wrangham RW 1994. Chimpanzee arrival pant-hoots: do they signify food or status? *International Journal of Primatology* 15(2):185–205. [doi:10.1007/BF02735273](https://doi.org/10.1007/BF02735273) (Abs). Already cited as a key; this adds the record.
- fedurek2016, wilson2007, kalanBoesch2015, slocombe2010 and gruberZuberbuhler2013 are already cited; the lines above add findings.

**Not verified:** Mitani & Nishida 1993's own text (rates, the context percentages including 43% after travel, the ally result); Clark & Wrangham 1994's share of arrivals with a pant hoot; Slocombe 2010's numbers (a search engine attributed 56% and 45% of feeding events at Sonso and Kanyawara to it); numbers in fedurek2013, notmanRendall2005, fedurekSlocombe2013, schel2013, mitaniGrosLouis1998; Kalan, Mundry & Boesch 2015 (*Animal Behaviour* 101:1–9, food-call structure and tree size; snippet only); Clark Arcadi 1996's female rates; Kalan 2019 (Taï rates, via crunchant2021 only).

### E.25 Addendum: E-gut sources (gut capacity and throughput, 1–2 October 2026)

Evidence pass for the gut input `digestaGutMlPerKg` (docs/staging/track-e-handoff.md §5.4; docs/staging/e1h-prereg.md §1.4 and §8.5). Research only: no parameter or code changed. Bibliographic data checked against Crossref on 2 October 2026. Access: OpenAlex locations; the Kyoto University repository (KURENAI) through its DSpace REST API; NCBI BioC for PMC full texts; Europe PMC search. HAL (hal.science), ZORA (zora.uzh.ch) and the Göttingen repository answered with bot challenges and ScienceDirect with a Cloudflare block: none was bypassed, and each host was dropped at its first challenge. Tags as in this Track E section.

- **Gut capacity of a chimpanzee: the value and its sample** [nakamura2017] (FT, author's accepted manuscript, KURENAI hdl:2433/226629) [M] for the reported value, n = 1. Corrects §E.16 and §E.23, which derived about 3,329 cm³ from the abstract:
  - Discussion: the seeds fill 14.7% of the whole tract (stomach, small intestine, caecum and large intestine), whose capacity was "3,322 cm3 (965 cm3 for the stomach alone) in a captive female chimpanzee", citing chiversHladik1980. The source is now confirmed, not inferred.
  - So: total 3,322 cm³ and stomach 965 cm³ (29% of the total, derived), in one captive female. Her body mass and age, and how the volume was measured, are not given.
  - The wild corpse (Mahale) was an adolescent or adult female by body size, not weighed; the authors set the seeds' 258.8 g against the Mahale female mean of 35.2 kg (ueharaNishida1987).
  - Methods of the same paper: seed passage time 31.5 h, taken from lambert2002 (so the "about 31 h" of §E.3 is now a citation read in a full text); 6.7 defecations a day from wrangham1994. From the corpse the authors estimate 11.8 defecations per 24 h and infer defecation at night.
- **Ape gut and passage values tabulated by a review** [harrisonMarshall2011] (FT, PMC3083508 through BioC; Table III) [M] as secondary values, each taken from the primary named:
  - Chimpanzee colon surface area 1,812–2,925 cm² and coefficient of gut differentiation 1.16 (from chiversHladik1980; a range, so it measured at least two chimpanzees). Gorilla 4,813 cm² (males only in chiversHladik1980), orangutan 4,198–5,774 cm². Areas, not volumes.
  - Mean retention time 37.7 h, captive chimpanzees on the high-fibre diet, and fibre digestion 54.3% on the same diet (from miltonDemment1988). This confirms the "38 h" snippet of §E.3 and the 0.543 of §E.23 as citations read in a full text. The low-fibre value is still only milton1999's 2.0 d.
  - Other apes: gorilla 50–58.2 h and orangutan 73.7 h in captivity (Caton et al. 1999 and others, not read); gibbons 11–27.8 h in the wild.
  - Wild female body mass (from smithJungers1997): chimpanzee 40.4 kg (mean of 3 taxa), bonobo 33.7, gorilla 80, orangutan 35.7.
- **Scaling of gut capacity with body mass** [clauss2013] (FT, PMC3812987 through BioC) [M] cross-species review. Wet gut contents scale about linearly with body mass (BM^1.0) across herbivorous mammals, birds and reptiles; dry-matter gut contents scale slightly lower; in captive feeding studies dry-matter intake and dry-matter gut capacity scale alike. The fitted coefficients are only in Fig. 6 (not read). Use: supports expressing gut capacity per kg within a species (the isometry E1b and E1h assume); no primate value.
- **Gut fill rises with intake in a primate** [sawada2011] (FT, author's version, KURENAI hdl:2433/139523) [M] captive, cross-species. Four adult male Japanese macaques (11–16 kg, mean 13.6) on a high-fibre (37.5% NDF) and a low-fibre (13.6%) pellet, each at two amounts: dry-matter intake 166–235 g/day (about 12–17 g/kg/day, derived), particle mean retention 33–60 h; total gut fill (Holleman & White's marker method) was larger at the larger amount and on the high-fibre diet (best model with both factors). Fill values only in a figure (not read). Use: direction only: at ordinary intakes gut fill is below a fixed capacity and expands with intake.

**Derived: what the sources support** (arithmetic here; no run).
- mL/kg = 3,322 ÷ the captive female's mass. 83 mL/kg means she weighed 40.0 kg; 111 mL/kg means 29.9 kg.
- Captive adult females: 43.5 ± 7.5 kg (sanctuary), 54.7 kg (zoo), 58.7 kg (research) (curry2023); 46.4 kg (*Pan*, pontzer2016). These give 57–76 mL/kg. Wild female masses: 31.3 kg (Gombe median), 35.2 kg (Mahale), 40.4 kg (smithJungers1997 via harrisonMarshall2011) would give 82–106 mL/kg.
- So the one value gives 57–76 mL/kg at the mean masses of captive adult females, and 95–111 mL/kg only if she weighed 30–35 kg (an adolescent, a small adult, or one wasted before death). 83 mL/kg needs 40 kg, half an SD below the sanctuary mean; 111 mL/kg needs 30 kg, 1.8 SD below it (derived). 83 is the more likely of the two; 111 is at the edge of what the value can give.
- Stomach share: 965 ÷ 3,322 = 0.29 in this animal, against 17–20% in Milton 1987 (secondary, not verified). If her stomach share and Milton's small-intestine share (23–28%, secondary) both held, stomach plus small intestine would be 0.52–0.57 of the gut, not E1b's 0.45; at 83 mL/kg that is the foregut volume that 96–105 mL/kg gives at 0.45. The shares come from different animals and perhaps different methods: a flag, not an input.
- The correction from 3,329 to 3,322 cm³ moves 83 mL/kg by 0.2% (3,322 ÷ 40 = 83.05): nothing to re-run.
- Dry-matter check from the wild corpse (a flag, not an input): her seeds alone, 258.8 g dry, are half the model's whole-gut dry-matter capacity at 83 mL/kg for a 35.2 kg female ((0.45 × 0.15 + 0.55 × 0.20) g/mL × 83 mL/kg × 35.2 kg = 519 g) and 37% of it at 111 mL/kg, while taking 16.7% of the gut's volume at 83 mL/kg. Seeds carry 0.53 g of dry matter per cm³ (258.8 ÷ 489.4), far above E1b's assumed 0.15–0.20 g/mL of digesta, so on seed-laden fruit diets the assumed densities, not only the volume, may understate dry-matter capacity (direction only; seeds carry no energy, and the model has no seed term). One dead animal, possibly constipated (the authors' caveat).
- Confidence: low. n = 1; her mass is unknown; the method (organ volume or contents held) was not read; whether a captive gut on a low-fibre diet differs from a wild one is not sourced here.

**Sources:**
- *new* harrisonMarshall2011: Harrison ME, Marshall AJ 2011. Strategies for the use of fallback foods in apes. *International Journal of Primatology* 32(3):531–565. [doi:10.1007/s10764-010-9487-2](https://doi.org/10.1007/s10764-010-9487-2) (FT, PMC3083508).
- *new* clauss2013: Clauss M, Steuer P, Müller DWH, Codron D, Hummel J 2013. Herbivory and body size: allometries of diet quality and gastrointestinal physiology, and implications for herbivore ecology and dinosaur gigantism. *PLoS ONE* 8(10):e68714. [doi:10.1371/journal.pone.0068714](https://doi.org/10.1371/journal.pone.0068714) (FT, PMC3812987).
- *new* sawada2011: Sawada A, Sakaguchi E, Hanya G 2011. Digesta passage time, digestibility, and total gut fill in captive Japanese macaques (*Macaca fuscata*): effects food type and food intake level. *International Journal of Primatology* 32(2):390–405. [doi:10.1007/s10764-010-9476-5](https://doi.org/10.1007/s10764-010-9476-5) (FT, author's version, KURENAI).
- nakamura2017 (now FT: author's accepted manuscript, KURENAI), chiversHladik1980, miltonDemment1988, lambert2002, milton1999, smithJungers1997, curry2023, pontzer2016, ueharaNishida1987 and wrangham1994 are already listed; the entries above add findings.

**Not verified** (at most two routes per source):
- chiversHladik1980 full text (the captive female's mass and the volume method): HAL holds a deposited copy (hal-00561758), but its document server answered with a bot challenge; OpenAlex lists no other open copy. A person can open the HAL copy in an ordinary browser.
- Reprints of the chimpanzee rows: Hladik CM, Chivers DJ, Pasquet P 1999, *Current Anthropology* 40(5):695–697 (HAL only, same challenge); Chivers & Hladik 1984, Martin et al. 1985 and MacLarnon et al. 1986 (HAL records without files); Lambert JE 1998, *Evolutionary Anthropology* 7(1):8–20, and Milton K 1999, *Evolutionary Anthropology* 8(1):11–21 (closed); Martin 1990 and Milton 1987 (books).
- Gut-fill allometry with coefficients: Müller DWH et al. 2013, *Comp Biochem Physiol A* 164(1):129–140 (ZORA and Göttingen copies behind challenges); Clauss M et al. 2007, 148(2):249–265, and 2008, 150(3):274–281 (ZORA challenge, ScienceDirect block); Demment MW, Van Soest PJ 1985, *American Naturalist* 125(5):641–672 (closed).
- miltonDemment1988 full text (closed in OpenAlex; publisher not retried); lambert2002 and ardente2011 full texts (closed); Caton JM et al. 1999, *Primates* 40(4):551–558 (closed); remisDierenfeld2004 (closed); Popovich DG et al. 1997, *J Nutr* 127(10):2000–2005 (ScienceDirect only).
- Still none found: a dry-matter concentration of ape digesta; a maximum voluntary dry-matter intake of chimpanzees.

### E.26 Addendum: E2e pre-dawn (1 October 2026)

Read for stage E2e (docs/staging/e2e-prereg.md): what could keep an awake chimpanzee in its nest before dawn.

- **Nest insulation, savanna chimpanzees** [stewart2018] (FT, author manuscript, read here) [M]. Fongoli (Senegal) and Issa (Tanzania). Ten human-built experimental nests; a bottle of freshly boiled water inside the nest and one on a branch at the same height in the same tree, logged each minute for at least three hours. every experimental nest lost heat more slowly inside than outside, and the maximum inside–outside difference averaged 7.32 °C (SD 3.29 °C). The next sentence reports the three-hour loss as greater inside the nests (Wilcoxon V = 0, p = 0.002), which contradicts the first; Fig. 2 is not in the text copy, so the direction is taken from the first sentence and the paper's conclusion that nests insulate, and no three-hour figure is used. A physical proxy (water bottles in human-built nests). Use in E2e: direction, and an upper bound for an offline check; no rate taken.
- **Sleeping-site microclimate, Toro-Semliki (Uganda)** [samsonHunt2012] (FT, read here) [M]. A weather monitor within 1 m of chimpanzee sleeping platforms and one 10 cm above the ground beneath, 79 nights (Table II): mean nightly air temperature at the platform 20.95 ± 1.56 °C (range of nightly means 18.96–24.17) against 20.46 ± 1.82 °C on the ground (mean difference 0.49 °C, SE 0.132); wind 0.047 against 0.014 m/s; relative humidity 90.1% against 94.6%. Air beside the platform, not inside the nest. Use: night air at a dry-habitat Ugandan site, and that height changes it by about half a degree.
- **Retiring and rising together, captive** [rissGoodall1976] (secondary, through anderson2019, FT author copy) [L]. Six wild-born adolescents over three summer months: about 5 min passed between the first and the last to settle for the night, and the same was generally true of leaving the sleeping place in the morning. Use: direction only (a group that sleeps together leaves together). It does not define a co-departure window: the 5 min / 50 m readout in rhythm-metrics is a measurement definition and a design assumption.
- **Postures that conserve heat** (Nissen 1931; Goodall 1962; both as cited by anderson2019) [L]: lying face down or on one side with the limbs drawn in may conserve body heat as the night cools. Direction only.
- **Not traced:** a Kibale daily minimum of 16.2 °C (named by the first E2e agent as a secondary source); not used. The offline thermal check uses the model's own pre-dawn air.

**Sources:**
- *new* stewart2018: Stewart FA, Piel AK, Azkarate JC, Pruetz JD 2018. Savanna chimpanzees adjust sleeping nest architecture in response to local weather conditions. *American Journal of Physical Anthropology* 166(3):549–562. [doi:10.1002/ajpa.23461](https://doi.org/10.1002/ajpa.23461) (FT, author manuscript).
- *new* samsonHunt2012: Samson DR, Hunt KD 2012. A thermodynamic comparison of arboreal and terrestrial sleeping sites for dry-habitat chimpanzees (*Pan troglodytes schweinfurthii*) at the Toro-Semliki Wildlife Reserve, Uganda. *American Journal of Primatology* 74(9):811–818. [doi:10.1002/ajp.22031](https://doi.org/10.1002/ajp.22031) (FT).
- anderson2019, rissGoodall1976, alrazi2026, janmaat2014 and videan2005 are already cited; the entries above add findings.

### E.27 Addendum: E4d hormone rhythm (2 October 2026)

Read for stage E4d (docs/staging/e4d-prereg.md): the daily course of the testosterone-like and cortisol-like states. Inputs taken: the morning-to-evening ratios below, as the amplitude of a sleep-gated secretion term (registry `endoRhythmGainT`, `endoRhythmGainC`).

- **Hourly urinary testosterone, Kanyawara males** [fedurek2016] (FT, PMC4864005; Fig. 4 read by eye here, extends the E4b and E4c entries) [M]. October 2010 to September 2011, 11 adult males (> 15 y). Urine was "collected opportunistically throughout the day", first-morning samples "regularly", "as chimpanzees predictably urinate upon waking"; testosterone deconjugated and ether-extracted. Methods: "Urinary T levels in chimpanzees show a clear diurnal pattern with the highest levels in the early morning (from 5:00–9:00), followed by a steady decline through the day"; "A focal's hourly T levels were calculated by averaging values from each one-hour interval between 07:00 and 18:00, across the entire study period". Mean T by hour in Fig. 4 (≈, read from the figure, × 10³ pg/ml) at 07–18 h: 124, 106, 100, 85, 72, 76, 73, 67, 56, 52, 51, 55; 07 h ÷ 17 h ≈ 2.43. The number of samples behind the hourly profile is not stated in the text read. Use in E4d: input (amplitude of the testosterone-like state's daily course).
- **Diurnal cortisol, Taï** [girardButtoz2021] (FT, PMC8208813; extends the maternal-loss entry) [M]. Urinary cortisol (LC-MS, ng/ml SG), log-transformed; Bayesian LMMs with linear, quadratic and cubic terms of the time of sample collection, "expressed in minutes with 0 being midnight and 720 being noon" (any further scaling is not stated). Immatures (< 12 y; 846 samples, 50 individuals, 36 of them non-orphans): linear term −0.38 (95% CI −0.53 to −0.22). Mature males (2,184 samples, 28 males): −0.49 (−0.67 to −0.33) in the full model, −0.49 in the reduced one. Fig. 1 (non-orphan immatures, model line, read by eye): log cortisol ≈ 4.00 at 07 h and 3.03 at 17 h, a steady fall, so 07 h ÷ 17 h ≈ 2.64. The authors cite a larger chimpanzee data set for a curved (cubic) diurnal pattern. Use in E4d: input (amplitude of the cortisol-like state's daily course), from immatures; adult males' slope is at least as steep in its own model, but no male ratio is derived because the time scalings of the two models are not shown to be equal.
- **Daily pattern, Kanyawara males** [mullerLipson2003] (Abs, re-read from PubMed 12910467) [H] direction. "For both steroids, urinary concentrations were higher and more variable in the morning than in the afternoon. Urinary creatinine levels showed no such diurnal pattern." No amplitude in the abstract.
- **Testosterone follows sleep, not the clock (human)** [axelsson2005] (Abs) [M]. 7 men aged 22–32, sleep at night (23–07 h) or displaced to day (07–15 h), hourly serum for 24 h at bed rest: testosterone rose log-linearly across both sleep periods (15.3 ± 2.1 → 25.3 ± 2.2 nmol/l at night; 17.3 ± 2.1 → 26.4 ± 2.9 by day) and fell log-linearly with time awake; "circadian effects seemed marginal". [luboshitzky2001] (Abs) [M]: in 10 men on a fragmented sleep schedule the nocturnal rise was delayed (03:24 ± 1:13 vs 22:35 ± 0:22 h) and seen only in those with REM sleep: the rise is sleep-related. Use in E4d: the testosterone-like rhythm is tied to the animal's own sleep, not to light or the hour.
- **Not used.** Emery Thompson et al. 2020, PNAS 117:8424–8430 (doi:10.1073/pnas.1920593117), aging blunts the diurnal cortisol rhythm at Kanyawara: abstract only (no full text through BioC or efetch), no amplitude. Oxytocin: no source read here or listed in research.md reports a daily rhythm of urinary oxytocin in chimpanzees (not searched further), so the affiliation state gets none.

**Sources:**
- *new* axelsson2005: Axelsson J, Ingre M, Åkerstedt T, Holmbäck U 2005. Effects of acutely displaced sleep on testosterone. *Journal of Clinical Endocrinology & Metabolism* 90(8):4530–4535. [doi:10.1210/jc.2005-0520](https://doi.org/10.1210/jc.2005-0520) (Abs).
- *new* luboshitzky2001: Luboshitzky R, Zabari Z, Shen-Orr Z, Herer P, Lavie P 2001. Disruption of the nocturnal testosterone rhythm by sleep fragmentation in normal men. *Journal of Clinical Endocrinology & Metabolism* 86(3):1134–1139. [doi:10.1210/jcem.86.3.7296](https://doi.org/10.1210/jcem.86.3.7296) (Abs).
- fedurek2016, girardButtoz2021 and mullerLipson2003 are already cited; the entries above add findings.

### E.28 Addendum: E1i intake (2 October 2026)

Read for stage E1i (docs/staging/e1i-prereg.md): why nursing mothers stop eating with room in the gut. Bibliographic data checked against Crossref on 2 October 2026; full texts through NCBI BioC. Tags as in this Track E section.

- **Adiposity signals modulate satiation signals** [grill2010] (FT, author manuscript, PMC2813996 via BioC) [M] (rodent physiology, review). Meal size is controlled by integrating gastrointestinal satiation signals (gastric distension, CCK, GLP-1) with "correlates of stored energy commonly referred to as adiposity signals (leptin, insulin)" in the caudal brainstem (nucleus tractus solitarius). Hindbrain leptin amplifies the intake-inhibiting effect of gastric distension; knocking down leptin receptors there reduces the satiating effect of CCK and raises intake. The review supports "Smith's hypothesis - that adipose signals like leptin should be considered indirect controls of meal size that induce their behavioral effect by modulating the neural processing of satiation signals". Use in E1i: the direction of `ledgerSatiationReserve` (a depleted store weakens satiation, so meals are larger); the proportional form is a design assumption.
- **Human intake rises in proportion to weight lost** [polidori2016] (FT, author manuscript, PMC5108589 via BioC) [M] (humans). 153 patients with type 2 diabetes on canagliflozin (a covert energy loss through urinary glucose) for 52 weeks; energy intake, computed from the weight time course, rose above baseline by about 100 kcal/day per kg of weight lost (a proportional feedback, kP = 95 kcal/day per kg), more than 3 × the expenditure adaptation (about 30 kcal/day per kg). Use: the appetite's feedback from the store is proportional; the magnitude is human and not an input.
- **Mothers' feeding share and nursing, Ngogo** [badescu2016] (FT, PMC5180145; already listed) [M]. 42 mother–infant pairs; 5-min instantaneous scans of the mother: feeding ("ingesting food, chewing 'wadges' or looking for food items") 0.43 of time (± 0.13 SD, range 0.15–0.82); nursing is scored as its own state among "behaviours directed to own infant (e.g. nursing, grooming, playing)", so the scans cannot tell whether suckling overlaps feeding; the discussion allows that mothers "meet nutritional requirements even when they carry their infants while they are feeding". Use: context for E1i (the field's mothers feed 43–47% of the time: badescu2016, potts2011, stanton2017); no source found either way on suckling during the mother's feeding, and nipple contact takes 2–4% of observation time (lonsdorf2014, badescu2022), so nursing could cost a mother at most that.
- **The gut grows in lactation, small mammals** [speakman2008] (Abs, PMC2606756 through efetch; full text not in the open set) [M]. "Organ remodelling is necessary to achieve the high demands of lactation and involves growth of the alimentary tract and associated organs such as the liver and pancreas." Direction only. Use in E1i iteration 2: the direction of `ledgerLactGut`; its matched-capacity magnitude is a design assumption.
- [campbellFell1964] (title only; PMC1368778 is a scan, no text in BioC; the PubMed record has no abstract) [M]: "Gastro-intestinal hypertrophy in the lactating rat and its relation to food intake". Not verified beyond the title.
- **Not verified:** whether energy deficit or lactation changes the satiating effect of gastric distension in a primate; any primate measurement of gut size in lactation (none found). Barrachina et al. 1997 (*PNAS* 94:10455, leptin–CCK synergy in mice) is in PMC (PMC23384) but not in the BioC set; not retried.

**Sources:**
- *new* grill2010: Grill HJ 2010. Leptin and the systems neuroscience of meal size control. *Frontiers in Neuroendocrinology* 31(1):61–78. [doi:10.1016/j.yfrne.2009.10.005](https://doi.org/10.1016/j.yfrne.2009.10.005) (FT, author manuscript, PMC2813996).
- *new* polidori2016: Polidori D, Sanghvi A, Seeley RJ, Hall KD 2016. How strongly does appetite counter weight loss? Quantification of the feedback control of human energy intake. *Obesity* 24(11):2289–2295. [doi:10.1002/oby.21653](https://doi.org/10.1002/oby.21653) (FT, author manuscript, PMC5108589).
- *new* speakman2008: Speakman JR 2008. The physiological costs of reproduction in small mammals. *Philosophical Transactions of the Royal Society B* 363(1490):375–398. [doi:10.1098/rstb.2007.2145](https://doi.org/10.1098/rstb.2007.2145) (Abs, PMC2606756).
- *new* campbellFell1964: Campbell RM, Fell BF 1964. Gastro-intestinal hypertrophy in the lactating rat and its relation to food intake. *Journal of Physiology* 171(1):90–97. [doi:10.1113/jphysiol.1964.sp007363](https://doi.org/10.1113/jphysiol.1964.sp007363) (title only; scan, PMC1368778).
- badescu2016, potts2011, stanton2017, lonsdorf2014 and badescu2022 are already listed; the entries above add findings.

### E.29 Addendum: E4e hunting from state (2 October 2026)

Read for stage E4e (docs/staging/e4e-prereg.md): the target audit of the hunting rows and the hunt decision as a value comparison. No input value was taken from these sources; the mechanism reuses registry inputs.

- **T-HUN-1's band was never scaled to the model's males** (audit, e4e-prereg.md §2.3). The band 5–25 per community-year "(3–7 males)", basis "Kanyawara scaled", brackets the unscaled Kanyawara figure (194 hunts in 224 months ≈ 10.4 per year at 11.4 adult males [gilby2015]). Hunting rises with males within sites (+48% odds per extra adult male at Kanyawara encounters [gilby2015]) and across sites (Kanyawara 0.91 and Ngogo about 2.3 hunts per adult male-year, derived from [gilby2015] and [wattsMitani2002]), so a community of 3–7 males should hunt less, not as much. Linear scaling to the field profile's 4.7 adult males gives 4–11 per community-year: staged in `docs/staging/e4e-targets.patch.json`, not applied.
- **Access this stage.** gilby2015: NCBI BioC no result, efetch abstract only (the publisher does not allow download; the full text was read by an earlier pass, realism-design.md access FT); figures as recorded. wattsMitani2002: OpenAlex closed, the University of Michigan repository answered with a bot challenge (host dropped); not verified here. gilbyWrangham2007: title only (OpenAlex and Crossref carry no abstract); its finding as recorded in T-HUN-5 (hunting rises with ripe drupe fruit eaten, after controlling for males and swollen females).
- **Hunting decisions follow the odds of success** [mitaniWattsMuller2002] (FT, a review; read from the earlier session's cache) [M as a review]. The hunting section argues that Ngogo males hunt when success is likely, in large parties with many male hunters, and forgo most attempts in small parties; that hunting rose when fruit was abundant, not when it was scarce, and that the link runs through party size; and that the presence of oestrous females did not predict Ngogo males' hunting. Use in E4e: context for valuing a hunt by its expected capture with the males present (no value taken).
- **Meat's energy rests on secondary figures** [tennie2014] (Abs; already listed): no nutritional data exist on the flesh of chimpanzee prey, so the energy of a capture (`ledgerMeatKcalPerMin`, assumed, via Hardus et al. 2012) is an assumption, and with it the energy value of a hunt.
- **Known conflict, registered (e4e-prereg.md §4):** valuing meat as food at the hunter's present appetite predicts less hunting by sated males, the opposite of gilbyWrangham2007's direct effect (risk-prone hunting when diet quality is high); with it, hunting can track fruit only through party size, as mitaniWattsMuller2002 and mitaniWatts2001 explain Ngogo's pattern.

**Sources:**
- *new* mitaniWattsMuller2002: Mitani JC, Watts DP, Muller MN 2002. Recent developments in the study of wild chimpanzee behavior. *Evolutionary Anthropology* 11(1):9–25. [doi:10.1002/evan.10008](https://doi.org/10.1002/evan.10008) (FT; bibliography checked against Crossref, 2 October 2026).
- gilby2015, gilbyWrangham2007, wattsMitani2002, mitaniWatts2001 and tennie2014 are already cited; the entries above add findings or access notes.

### E.30 Addendum: E2f sleep window (2 October 2026)

Read for stage E2f (docs/staging/e2f-prereg.md): is the model's sleep window (process S and process C with human values) wrong for chimpanzees? Bibliographic data checked against Crossref on 2 October 2026. Numbers re-read in the saved texts where FT. Rule applied: the amount of sleep measured by EEG is physiology and may be an input; retiring, rising, nesting and departure times are behaviour and stay targets.

- **Adult sleep amount, EEG** [bert1970] (secondary, through campbellTobler1984 FT; the paper is closed and has no abstract) [M] captive. 3 adults (2 *P. t. troglodytes*, 1 *P. t. schweinfurthii*), unrestrained in home cages, "natural illumination (a very dim light was used at night for observation)"; 14-h nocturnal records 17:00–07:00: "average sleep duration was reported to be 9.7 hr (69.3%)". Site, season and the clock times of sleep onset and waking are not in the relay. Use in E2f: **input**, the adult sleep amount (`sleepDriveShift`, derived).
- **Immature sleep, EEG** [mcnew1971] (FT, NASA NTRS manuscript) [M] captive. 3 "tamed immature" chimpanzees of 14.7, 13.4 and 16.8 kg in single home cages (UCLA vivarium; lights off 18:00, on 06:30); EEG, EOG and EMG telemetry with infrared TV, 7 nights each. "During their 13.5 hour nightly recording sessions [they] averaged 11 hrs and 52 min of sleep"; "From the onset of sleep to morning awakenings the animals averaged 27 min in the awake stage" (16–49 min by night); light, medium, deep and REM sleep 6.5, 53.9, 20.3 and 19.3% of sleep; "DS was generally found dominant during the first half of the session, while MS dominated the latter half". Use in E2f: context and a candidate input for juveniles (not used in iteration 1: in the human model literature development acts through the homeostatic time constants, which are unmeasured in chimpanzees); consolidation (little waking inside the sleep period); deep sleep front-loaded, the direction of process S's decay.
- **Juvenile sleep, EEG** [freemon1971] (Abs, NASA NTRS; and secondary through campbellTobler1984) [M] captive. Two unrestrained juveniles (4 y, secondary), 7 nights: 10.8 h asleep in 12-h sessions 19:00–07:00 (90.1%); REM 23% of sleep, 7–9 REM periods a night; naps "usually between 1200 hr and 1330 hr". Use: context (a session that may cut the night).
- **Free-running rhythm of one chimpanzee** [hoshizaki1972] and [mcnew1972] (Abs, NASA NTRS) [L]. One young male, 30 days in isolation (LD 12:12, then 10 days of continuous light, then LD 12:12): "A 24-hour rhythm was seen when the subject was entrained to 12L:12D treatments and 24.8-hour rhythm when he was exposed to continuous light" (micturition; the voiding peak "immediately after the subject awoke"). The free-running period of the EEG sleep–wake cycle is not in the abstract. Use: none (n = 1, constant light, a urine rhythm, abstract only). The only great-ape free-running period found.
- **Sleep of aging sanctuary males, video** [havercamp2021] (FT, accepted manuscript, Kyoto University repository) [M] captive. 12 males of 23 to about 48 y at Kumamoto Sanctuary, indoor lights 07:00–19:00 plus skylights; infrared video scanned every minute 17:00–06:00: "slept for a nightly mean duration of 10.5 ± SD 1.8 h" in 2018–2019 (11.2 ± 1.5 h in 2007–2008), 15.1 awakenings a night. Use: sensitivity bound only (video scores stillness; the window ended an hour before the lights came on).
- **Orangutan sleep, video** [samsonShumaker2013] (Abs, Crossref deposit) [M] captive: 3 female and 2 male orangutans, Indianapolis Zoo, 70 nights, "slept an average of 9.11 h (range 5.85–11.2 h) nightly". [samsonShumaker2015] (Abs): orangutans' sleep deeper and more efficient than baboons'. Use: context (a great-ape comparator).
- **Which parameter carries a species difference in sleep amount** [skeldonDijk2025] (FT, already listed in E.22): "Increasing the drive to sleep active regions lowers the mean value of the thresholds while leaving the distance between then unchanged" (Fig. 5: lowering the thresholds increases sleep duration); of Phillips et al.'s neuronal model across species, "increasing the mean drive to sleep active neurons increased the percentage of time spent asleep", while shorter homeostatic time constants turn monophasic into polyphasic sleep; in human infants and children "homeostatic parameters played a major role". Use in E2f: the route of `sleepDriveShift` (both thresholds, gap unchanged).
- videan2005 (FT): its retiring and rising times are behaviour ("rising" = leaving the sleeping platform), kept as targets and context; its video efficiency (0.83 ± 0.03 in prime adults) is not used.
- **Not verified:** [balzamo1972] (Balzamo E, Bradley RJ, Rhodes JM 1972. Sleep ontogeny in the chimpanzee: from two months to forty-one months. *Electroencephalography and Clinical Neurophysiology* 33(1):47–60, doi:10.1016/0013-4694(72)90024-7; closed, no abstract); bert1970's clock times, site and season; samsonNunn2015's numbers; hozer2026's numbers (a CC BY copy is listed on HAL, not fetched). **Not found:** any great-ape circadian period in constant darkness, phase-response curve, melatonin onset or temperature minimum; any actigraphy or accelerometry of chimpanzee sleep.

**Sources:**
- *new* mcnew1971: McNew JJ, Howe RC, Adey WR 1971. The sleep cycle and subcortical-cortical EEG relations in the unrestrained chimpanzee. *Electroencephalography and Clinical Neurophysiology* 30(6):489–503. [doi:10.1016/0013-4694(71)90146-5](https://doi.org/10.1016/0013-4694(71)90146-5) (FT, NASA NTRS manuscript 19700020685).
- *new* hoshizaki1972: Hoshizaki T, McNew JJ, Sabbot I, Adey WR 1972. Micturition patterns of an unrestrained chimpanzee under entrained and free running conditions. *Aerospace Medicine* 43(2):149–154 (no DOI; Abs, NASA NTRS 19720036514).
- *new* mcnew1972: McNew JJ, Burson RC, Hoshizaki T, Adey WR 1972. Sleep-wake cycle of an unrestrained isolated chimpanzee under entrained and free running conditions. *Aerospace Medicine* 43(2):155–161 (no DOI; Abs, NASA NTRS 19720036515).
- *new* havercamp2021: Havercamp K, Morimura N, Hirata S 2021. Sleep patterns of aging chimpanzees (*Pan troglodytes*). *International Journal of Primatology* 42(1):89–104. [doi:10.1007/s10764-020-00190-3](https://doi.org/10.1007/s10764-020-00190-3) (FT, accepted manuscript).
- *new* samsonShumaker2013: Samson DR, Shumaker RW 2013. Documenting orang-utan sleep architecture: sleeping platform complexity increases sleep quality in captive *Pongo*. *Behaviour* 150(8):845–861. [doi:10.1163/1568539X-00003082](https://doi.org/10.1163/1568539X-00003082) (Abs).
- *new* samsonShumaker2015: Samson DR, Shumaker RW 2015. Orangutans (*Pongo* spp.) have deeper, more efficient sleep than baboons (*Papio papio*) in captivity. *American Journal of Physical Anthropology* 157(3):421–427. [doi:10.1002/ajpa.22733](https://doi.org/10.1002/ajpa.22733) (Abs).
- bert1970, freemon1971, campbellTobler1984, videan2005, skeldonDijk2025 and hozer2026 are already listed; the entries above add findings.

### E.31 Addendum: E4f colobus encounters (2 October 2026)

Read for stage E4f (docs/staging/e4f-prereg.md): the colobus encounter target and every input that sets the model's
encounter rate. One input value is taken (the Kanyawara density, [L]); nothing is fitted to an encounter or hunting rate.

- **What gilby2015 counted** [gilby2015] (FT, read in full this stage through the PMC article page; the BioC and efetch
  routes give no full text) [H]. Kanyawara field assistants record party composition every 15 min "and since 1996,
  whether colobus can be detected within 100 m of the chimpanzees"; an encounter is "any 15 min scan when the
  chimpanzees were within 100 m of colobus that was not immediately preceded by another 'positive' colobus scan". Gombe
  recorded colobus "within approximately 50 m of the focal chimpanzee". Kanyawara 1996–August 2014: 2,461 encounters,
  3.73 per 100 h of observation (Kasekela 2.34, Mitumba 2.31; the authors suggest the 100 m against 50 m definitions as
  one reason). Use in E4f: the method of T-HUN-1/3/4; the model's observer starts a new encounter whenever the nearest
  group's identity changes (not a run of positive scans) and counts T-HUN-3 on focal follows (gilby2015's are party
  scans): staged protocol correction, `docs/staging/e4f-protocol.patch.json`.
- **Kanyawara red colobus density** [bonnell2010] (FT, McGill repository) [L, secondary]. An agent-based model of the
  Kanyawara K-30 study area (~250 ha) placed "five distinct social groups, of different sizes (70, 25, 84, 45, 40), as
  measured by Snaith and Chapman (2008), representing average density of red colobus in our study area" on a 225 ha grid:
  2.22 groups/km², about 117 individuals/km² (derived), mean group 53. Use in E4f: `colobusDensityKanyawaraPerKm2`
  (`preyKanyawara`); against Ngogo 1997–99's 2.48 (P-HUN-1) the site difference is about 11%.
- **Kanyawara red colobus density over time and by logging history** [chapman2010ecol] (FT through a Wayback copy of the
  publisher page; the publisher host answered with a bot check and was dropped; Table 1 and the density figure did not
  come through as text) [M]. Line transects in K-30 (unlogged), K-14 (lightly logged) and K-15 (heavily logged), all in
  the Kanyawara study site, over 26–36 years: red colobus group density "remained fairly stable over time in all areas";
  initially greater in unlogged and lightly logged forest than heavily logged, "but the difference became less marked
  over time"; later "no difference … between the unlogged and the heavily logged areas". Group spread in Kibale "for red
  colobus, 50–1000 m" (Chapman and Snaith, unpublished data, as cited). Use in E4f: the K-30 value stands for the
  community's range; the model's colobus groups are points, while real groups spread widely (which would raise
  encounters within 100 m, not lower them).
- **Group size, home range, travel and spread grow together** [snaithChapman2008] (Abs) [M]. Nine Kanyawara groups:
  larger groups occupied larger home ranges, travelled farther per day and spread wider. No values in the abstract; the
  model's colobus speed (90 m/h, by day and by night) and its uniform, home-range-free wandering have no source (null).
- **Access this stage.** Wiley (chapman2010ecol, the 2003 colobine-abundance paper) and Oxford Academic (struhsaker1974)
  answered with a bot check: hosts dropped. chapman2002ajpa (PMC7159679): efetch abstract only. Not reached:
  chapman2000cons, chapman2005ijp, gillespieChapman2001, snaithChapman2008 full text, Struhsaker 1975 and 2010 (books).
  The transect densities by compartment (chapman2010ecol Fig. 2) are the missing site-matched census value.
  chapman2023ajp (Am J Primatol 2023, doi:10.1002/ajp.23577; abstract only: Wiley host, no PMC or Wayback copy):
  52 years of Kibale censuses, 1,466 km walked, 480 groups; populations "generally relatively stable"; no site values.

**Sources:**
- *new* bonnell2010: Bonnell TR, Sengupta RR, Chapman CA, Goldberg TL 2010. An agent-based model of red colobus
  resources and disease dynamics implicates key resource sites as hot spots of disease transmission. *Ecological
  Modelling* 221(20):2491–2500. [doi:10.1016/j.ecolmodel.2010.07.020](https://doi.org/10.1016/j.ecolmodel.2010.07.020)
  (FT; bibliography checked against Crossref, 2 October 2026).
- *new* chapman2010ecol: Chapman CA, Struhsaker TT, Skorupa JP, Snaith TV, Rothman JM 2010. Understanding long-term
  primate community dynamics: implications of forest change. *Ecological Applications* 20(1):179–191.
  [doi:10.1890/09-0128.1](https://doi.org/10.1890/09-0128.1) (FT, figures and Table 1 excepted; Crossref-checked).
- *new* snaithChapman2008: Snaith TV, Chapman CA 2008. Red colobus monkeys display alternative behavioral responses to
  the costs of scramble competition. *Behavioral Ecology* 19(6):1289–1296.
  [doi:10.1093/beheco/arn076](https://doi.org/10.1093/beheco/arn076) (Abs; Crossref-checked).
- gilby2015 is already cited; the entry above adds its encounter method, read in full.

### E.32 Addendum: E1j mothers' ranging (2 October 2026)

Stage E1j asked why the model's nursing mothers range far relative to males (T-RNG-5, band 0.3–0.6). Day ranges of
lactating or anoestrous females against males, and the method behind each (docs/staging/e1j-prereg.md §1–§2).

- **Day-range method and sample, Budongo** [batesByrne2009] (FT, the authors' accepted manuscript; extends E.17) [M].
  Sonso, September 2002 – September 2003; 15 focal adults: 8 males, 6 "lactating females" (4 lactating throughout, 1
  gestating then lactating, 1 cycling then pregnant: the paper pools lactating and gestating) and 1 receptive female.
  Focal follows up to 3 days; a day range counts only follows of at least 8 h without losing the focal: 27 male days,
  13 lactating, 3 receptive. Location "every five minutes when it was travelling" (GPS, error up to 14 m); movements
  within a halt of 20 min or more were not recorded; a halt's area is 35 m around its first point, or the food patch.
  Results: males 2.7 ± 1.5 km, lactating 1.2 ± 0.8, receptive 2.2 ± 0.8 (F2,42 = 5.89); 20+ min halts a day 6.5 ± 1.8
  against 4.5 ± 1.0, lasting 60 ± 50 against 95 ± 83 min; distance between halts 357 against 277 m at the same speed
  (1.9 km/h) and straightness; 84% of mothers' phases ended at food (males 68%); mothers revisited a used patch 0.46
  times per 8-h day (males 0.14) and used the outer 55% of the range less. Derived [L]: ratio 0.44, about 0.26–0.63
  with follow-days as independent units. Use in E1j: T-RNG-4 and T-RNG-5 method (the model's observer is compared in
  e1j-prereg.md §2.4).
- **One-day ranges by sex, Gombe** [wrangham1975] (FT, PhD thesis, Table 5.1) [M]. January 1972 – September 1973,
  nest-to-nest days; follows aborted when the target was lost; movements around a point (a food source, a grooming
  party) ignored unless more than about 30 m; path from 100 m grid lines crossed, checked against a hodometer
  (r = 0.995, 24 records). Medians: northern males 4.2 km (83 days, 8 males), southern males 3.8 km (23 days, 7),
  females 2.8 km (61 days, 10 females; "most of the females observed were anoestrous"; a juvenile's record was assigned
  to its mother when they travelled together). Derived [L]: females ÷ males 0.67–0.74.
- **Day ranges by sex, Kanyawara and Gombe** [pontzerWrangham2004] as cited by [wilson2021] (FT of the citing review;
  the primary is closed) [L]: Kanyawara females 2.0 km/day, males 2.4 (0.83); Gombe females 3.2, males 4.6 (0.70). The
  class is adult females, not lactating females; n and method not seen. The earlier entry's "mothers about 1.9 km" was
  not verified.
- **Maternal day range and offspring** [pontzerWrangham2006] as cited by [stanton2017] (FT of the citing paper; the
  primary has no reachable abstract) [L]: at Kanyawara maternal day range was positively correlated with the juvenile's
  body size, not with infant carrying. Use in E1j: carrying a young infant is not by itself a reason for a shorter day
  range; a walking juvenile may be.
- **Intra-community infanticide, Budongo Sonso** [lowe2019] (Abs; open access) [M]. 24 years: 33 attacks on 30 victims
  (11 definite infanticides, 4 almost certain, 9 suspected, 9 attempts); most of the 23 attacks with known perpetrators
  were by males only; two thirds of victims of known age were under one week old. Context for the Budongo mothers'
  short day ranges (not tested by batesByrne2009).
- Not verified (2 routes each): otaliGilchrist2006 (Kanyawara; the title states that mothers are less gregarious than
  nonmothers and males, "the infant safety hypothesis"; no abstract on OpenAlex or Crossref; Springer closed);
  pontzerWrangham2004 and pontzerWrangham2006 primaries (closed; link.springer.com answered with a bot check and was
  dropped); Taï, Ngogo (Deep Blue repository behind a Cloudflare check, dropped) and Mahale sex-class day ranges.

**Sources:**
- *new* wrangham1975: Wrangham RW 1975. *The behavioural ecology of chimpanzees in Gombe National Park, Tanzania.* PhD
  thesis, University of Cambridge. [doi:10.17863/CAM.16415](https://doi.org/10.17863/CAM.16415) (FT, Apollo repository).
- *new* wilson2021: Wilson ML 2021. Insights into human evolution from 60 years of research on chimpanzees at Gombe.
  *Evolutionary Human Sciences* 3:e8. [doi:10.1017/ehs.2021.2](https://doi.org/10.1017/ehs.2021.2) (FT, PMC7886264).
- *new* stanton2017: Stanton MA, Lonsdorf EV, Pusey AE, Murray CM 2017. Do juveniles help or hinder? Influence of
  juvenile offspring on maternal behavior and reproductive outcomes in wild chimpanzees (*Pan troglodytes*). *Journal of
  Human Evolution* 111:152–162. [doi:10.1016/j.jhevol.2017.07.012](https://doi.org/10.1016/j.jhevol.2017.07.012) (FT,
  PMC5659293).
- *new* pontzerWrangham2006: Pontzer H, Wrangham RW 2006. Ontogeny of ranging in wild chimpanzees. *International
  Journal of Primatology* 27:295–309. [doi:10.1007/s10764-005-9011-2](https://doi.org/10.1007/s10764-005-9011-2) (not
  read; cited through stanton2017).
- *new* lowe2019: Lowe AE, Hobaiter C, Asiimwe C, Zuberbühler K, Newton-Fisher NE 2019. Intra-community infanticide in
  wild, eastern chimpanzees: a 24-year review. *Primates* 61(1):69–82.
  [doi:10.1007/s10329-019-00730-3](https://doi.org/10.1007/s10329-019-00730-3) (Abs, open access).
- *new* otaliGilchrist2006: Otali E, Gilchrist JS 2006. Why chimpanzee (*Pan troglodytes schweinfurthii*) mothers are
  less gregarious than nonmothers and males: the infant safety hypothesis. *Behavioral Ecology and Sociobiology*
  59(4):561–570. [doi:10.1007/s00265-005-0081-0](https://doi.org/10.1007/s00265-005-0081-0) (title only; not verified).
- batesByrne2009 and pontzerWrangham2004 are already cited; the entries above add findings.

### E.33 Addendum: E1k nursing mothers' deficit (2 October 2026)

Read for stage E1k (docs/staging/e1k-prereg.md): whether wild nursing mothers and juveniles run a sustained energy
deficit, and how much mothers and their infants groom each other. Full texts through NCBI BioC or efetch; abstracts
through OpenAlex or PubMed; bibliographic data checked against Crossref on 2 October 2026. Tags as in this Track E
section.

- **Energy balance through lactation, Kanyawara** [emeryThompson2012] (abstract re-read verbatim through OpenAlex; the
  full text at academic.oup.com served a Cloudflare challenge on 2 October and was not routed around) [M]. 17 wild,
  unprovisioned mothers; urinary C-peptide "depressed for six months postpartum, thereafter showing a net increase
  through the second year"; "Cycling resumed only after a sustained period of energy gain". A sign by lactation stage,
  not a size: no rate of mass or fat change. Use in E1k: a direction band for the staged T-ENE-5 row read on the
  ledger (docs/staging/e1k-targets.patch.json, not applied).
- **Maternal grooming by infant age, Gombe** [stanton2014] (FT, PMC4197843 via BioC) [H]. Mother–infant follows
  1988–2012, 1-min instantaneous point samples; mothers groomed their infants 0.027–0.029 of time at 1–2 y and
  0.028–0.031 at 2–3 y (firstborn and laterborn). Use: comparison value for E1k's mother–infant grooming readout
  (target, never an input).
- **Infants' own grooming by age, Gombe** [lonsdorf2014] (FT, PMC4049619; already listed) [H]. 40 infants: infant
  grooming rose "from an average of 0% of time in the first six months to 3.07% of observation time at age 4.5 years".
  Use: comparison value (target).
- **Mother–offspring grooming, Mahale** [nishida1988] (Abs, OpenAlex) [M]. "Infants under 2 years of age rarely
  groomed their mothers, and mostly groomed accessible parts of their mother's bodies, if they did so"; older
  adolescents reciprocated about equally. Direction only.
- **Grooming of immatures, Gombe** [pusey1990] (Abs, OpenAlex) [M]. "Immatures of all ages spend 3-13% of their time in
  social grooming"; juveniles "receive over 90% of their grooming from mothers and siblings". Direction only.
- **Mothers keep playing with offspring when food is poor, Kanyawara** [sabbi2024] (FT, PMC11002997 via efetch) [M].
  3,891 adult play bouts by 89 players, 2010–2019, monthly counts against diet quality (share of feeding on non-fig
  fruit): "when diet quality was low, most adult play fell to near zero whereas it persisted between mothers and
  offspring". Use: a caution against making a mother's social time with her offspring yield to her energy need; no
  source was found on mothers cutting grooming when food is scarce.
- **The motivation to be groomed is regulated by grooming** [keverne1989] (Abs, PubMed 2525263) [M] (monkeys, captive).
  "Opiate receptor blockade increases the motivation to be groomed, while morphine administration decreases it"; brain
  opioids change contingent on grooming. Use in E1k: direction for `groomNeedDyad` (grooming is valued by a need that
  grooming itself satisfies).
- **Alliesthesia** [cabanac1971] (Abs, OpenAlex) [H] (humans). "A given stimulus can induce a pleasant or unpleasant
  sensation depending on the subject's internal state", proposed as the motivation of behaviours such as food intake.
  Use: the principle that an act's incentive is weighted by the internal state it serves (drive × incentive); its
  product form in `groomNeedDyad` is a design assumption.
- **Not verified:** emeryThompson2012's monthly C-peptide values (full text not reached); pusey2005's mass by
  reproductive state (closed); emeryThompson2016's maternal C-peptide by lactation stage (PMC4948337: the publisher
  does not allow the full text to be downloaded); any wild chimpanzee rate of fat or mass change for mothers or
  juveniles (none found); Pusey 1983 and Goodall 1986 on mother–offspring grooming.

**Sources:**
- *new* stanton2014: Stanton MA, Lonsdorf EV, Pusey AE, Goodall J, Murray CM 2014. Maternal behavior by birth order in
  wild chimpanzees (*Pan troglodytes*). *Current Anthropology* 55(4):483–489. [doi:10.1086/677053](https://doi.org/10.1086/677053) (FT, PMC4197843).
- *new* nishida1988: Nishida T 1988. Development of social grooming between mother and offspring in wild chimpanzees.
  *Folia Primatologica* 50(1–2):109–123. [doi:10.1159/000156335](https://doi.org/10.1159/000156335) (Abs).
- *new* pusey1990: Pusey AE 1990. Behavioural changes at adolescence in chimpanzees. *Behaviour* 115(3–4):203–246.
  [doi:10.1163/156853990X00581](https://doi.org/10.1163/156853990X00581) (Abs).
- *new* sabbi2024: Sabbi KH, Kurilla SE, Monroe IG, Zhang Y, Menante A, Cole MF, Otali E, Kobusingye M, Emery Thompson M,
  Muller MN, Wrangham RW, Machanda ZP 2024. Ecological variation in adult social play reveals a hidden cost of
  motherhood for wild chimpanzees. *Current Biology* 34(6):1364–1369.e2.
  [doi:10.1016/j.cub.2024.02.025](https://doi.org/10.1016/j.cub.2024.02.025) (FT, PMC11002997).
- *new* keverne1989: Keverne EB, Martensz ND, Tuite B 1989. Beta-endorphin concentrations in cerebrospinal fluid of
  monkeys are influenced by grooming relationships. *Psychoneuroendocrinology* 14(1–2):155–161.
  [doi:10.1016/0306-4530(89)90065-6](https://doi.org/10.1016/0306-4530(89)90065-6) (Abs).
- *new* cabanac1971: Cabanac M 1971. Physiological role of pleasure. *Science* 173(4002):1103–1107.
  [doi:10.1126/science.173.4002.1103](https://doi.org/10.1126/science.173.4002.1103) (Abs).
- emeryThompson2012, lonsdorf2014, emeryThompson2016, pusey2005, samuni2020 and knott2005 are already listed; the
  entries above add findings.

### E.34 Addendum: E2g water balance (2 October 2026)

Evidence pass for stage E2g (the water ledger that replaces the thirst timers; `docs/staging/e2g-prereg.md` §1), 2 October
2026, by two subagents with disjoint source lists. Inputs are physiology or physics; drinking rates are targets.

- **Water in wild ape foods** [masi2015] (FT, PMC4495928) [M]. Western gorillas, Bai Hokou (CAR): dry-matter fraction of
  fresh food 0.25 ± 0.09 for pulpy and 0.32 ± 0.11 for fibrous fruit (18 fruit species; fresh weighing, field and lab
  drying): about 75% and 68% water. Use in E2g: ripe fruit 0.75 (`waterFruitFrac`); the stand-in for figs and fallback foods.
- **Moisture of Bwindi gorilla foods** [rothman2006] (Abs) [M]: 127 plant parts of 84 species, moisture 7–96% of fresh
  mass; values by food type in paywalled tables (not seen).
- **Metabolic water** [blumstein2024] (FT, PMC11979454) [L]: oxidation yields 0.60 g of water per g of carbohydrate, 1.07
  of fat, 0.41 of protein (0.15, 0.12 and 0.10 g per kcal). [sawka2015] (FT, PMC4672008) [L]: in sedentary humans
  respiratory loss 250–350 mL/day, urine 500–1,000, faeces 100–200, insensible 450–1,900, metabolic water +250–350.
- **Insensible evaporation, Fanger / ISO 7730** [rinjea2022] (FT, PMC9324884) [L]: respiratory latent heat 1.7×10⁻⁵ · M ·
  (5,867 − pa) W/m², skin diffusion 3.05×10⁻³ · (5,733 − 6.99 · M − pa) W/m² (M metabolic rate per m², pa vapour pressure
  in Pa); about 117 and 303 g/m²/day at 25 °C and 80% RH. Human bare skin.
- **Faeces and urine** [rose2015] (FT, PMC4500995) [L]: human faeces a median 75% water (n 47; 63–86%; vegetarian 78.9%);
  urine 1.42 L/day, 50–1,200 mOsm/kg. [popkin2010] (FT, PMC2908954) [L]: urine up to 1,400 mOsm/kg; a solute load of
  900–1,200 mOsm/day needs 0.75–1.0 L/day of urine at most; maximum urine output about 1 L/h; plasma held at 275–290
  mOsm/kg.
- **Latent heat** [baker2019] (FT, PMC6773238): 2,426 J per g of evaporated sweat. Physics.
- **Thirst and drinking** [armstrongKavouras2019] (FT, PMC6950074) [L]: thirst perceived from 1–2% body-mass loss; total
  body water 60% of mass; "dehydrated humans drink to satiation rapidly across 3–10 min".
- **Human water turnover** [yamada2022] (FT, PMC9764345) [L]: 5,604 people, ²H elimination; turnover 0.33 ± 0.09 L per MJ
  spent; metabolic water about 10% of turnover; turnover rises with physical activity, mass, humidity and heat. Context.
- **Chimpanzee sweat glands** [kamberov2018] (FT, PMC6289065) [M]: eccrine density in hairy skin about 10 × higher in
  humans than in chimpanzees (4 chimpanzees; as used by E2a for `rhythmEvapW`). [hiley1976] (Abs) [M]: captive
  chimpanzees' cutaneous moisture loss rose under heat to 40 °C (no rates in the abstract).
- **Ape water turnover** [pontzer2021] (Abs only; full text behind a Cloudflare check, not in PMC) [M]: zoo and sanctuary
  apes take in about 2.8 mL of water per kcal (humans 1.5); wild values are estimated, not measured. No isotope water
  turnover of any wild great ape was found (moderate confidence). Nearest wild primate: [simmen2010] (FT, PMC2845615) [M],
  doubly labelled water in wild ring-tailed and brown lemurs (Berenty): water flux 317–551 mL/day, 139–308 mL/kg/day,
  2.1–3.7 mL/kcal.
- **Drinking at Gombe: minutes, not bouts** [nelson2022] (FT, accepted manuscript, NSF PAR) [H] as drinking time. The
  analysed counts are 1-min point samples scored as drinking ("ingestion of freestanding water"): 788 for mothers in
  10,517 h and 352 for offspring in 10,680 h. Drinking takes about 0.12% of mothers' observed time (per-bin mean 0.001 ±
  0.002), 0.055% of offspring's; mothers drink about 2.9 × more in the dry season (May–October; derived from the GLMM's
  season estimate −1.060). No bout rate is printed: research.md's earlier "0.075 per hour, about 0.9 per 12-hour day" is
  minutes of drinking, not drinks (T-RHY-6's staged field value carries the same error; correction staged in
  e2g-prereg.md §1.3).
- **Drinking at Kanyawara** [mackenzie2025] (FT, PMC12011317) [H]: all occurrences during 15-min party scans on full-day
  follows, 2005–2018; an event is "any instance where an identified chimpanzee was observed drinking water"; 77.6% of the
  3,993 events with a known location were at streams; females drank more than males. Observation effort is only in the
  supplement (not retrieved): no rate per day.
- **Drinking and dehydration at Taï and Fongoli** [wessling2018] (FT) [M]: "drinks per focal observation time" 0.059 ±
  0.072 (unit not stated); Taï chimpanzees were as dehydrated as Fongoli's late in the dry season (urinary creatinine).
- **Savanna and dry-season water** [lindshield2021] (FT, review) [L]: at Fongoli individuals "drink water almost daily"
  (secondary); [peter2022] (FT, PMC9273564) [M]: Budongo Waibira has no permanent river, one pool in the December–March
  dry season, wells dug in 7 dry seasons.
- Not verified (2 routes each): conklinWrangham1994 (Kibale figs; ScienceDirect 403), wendeln2000 (no values in the
  abstract), nguessan2009 (Springer bot check), whitford1976 (chimpanzee sweating; host blocked), gart2015 (dog lapping;
  not open access), pontzer2021 full text, the mackenzie2025 supplement, McGrew et al. 1981 (Mt Assirik), Hunt & McGrew
  2002, Wrangham 1977 (origin of "chimpanzees rarely drink").

**Sources:**
- *new* masi2015: Masi S, Mundry R, Ortmann S, Cipolletta C, Boitani L, Robbins MM 2015. The influence of seasonal frugivory on nutrient and energy intake in wild western gorillas. *PLoS ONE* 10(7):e0129254. [doi:10.1371/journal.pone.0129254](https://doi.org/10.1371/journal.pone.0129254) (FT, PMC4495928).
- *new* rothman2006: Rothman JM, Dierenfeld ES, Molina DO, Shaw AV, Hintz HF, Pell AN 2006. Nutritional chemistry of foods eaten by gorillas in Bwindi Impenetrable National Park, Uganda. *American Journal of Primatology* 68(7):675–691. [doi:10.1002/ajp.20243](https://doi.org/10.1002/ajp.20243) (Abs).
- *new* blumstein2024: Blumstein DM, Colella JP, Linder E, MacManes MD, Scheibe J 2024. High total water loss driven by low-fat diet in desert-adapted mice. *Journal of Mammalogy* 106(2):293–303. [doi:10.1093/jmammal/gyae093](https://doi.org/10.1093/jmammal/gyae093) (FT, PMC11979454).
- *new* sawka2015: Sawka MN, Cheuvront SN, Kenefick RW 2015. Hypohydration and human performance: impact of environment and physiological mechanisms. *Sports Medicine* 45(Suppl 1):S51–S60. [doi:10.1007/s40279-015-0395-7](https://doi.org/10.1007/s40279-015-0395-7) (FT, PMC4672008).
- *new* rinjea2022: Rînjea C, Chivu OR, Darabont D-C, et al. 2022. Influence of the thermal environment on occupational health and safety in automotive industry: a case study. *International Journal of Environmental Research and Public Health* 19(14):8572. [doi:10.3390/ijerph19148572](https://doi.org/10.3390/ijerph19148572) (FT, PMC9324884). Carries the Fanger / ISO 7730 equations.
- *new* rose2015: Rose C, Parker A, Jefferson B, Cartmell E 2015. The characterization of feces and urine: a review of the literature to inform advanced treatment technology. *Critical Reviews in Environmental Science and Technology* 45(17):1827–1879. [doi:10.1080/10643389.2014.1000761](https://doi.org/10.1080/10643389.2014.1000761) (FT, PMC4500995).
- *new* popkin2010: Popkin BM, D'Anci KE, Rosenberg IH 2010. Water, hydration, and health. *Nutrition Reviews* 68(8):439–458. [doi:10.1111/j.1753-4887.2010.00304.x](https://doi.org/10.1111/j.1753-4887.2010.00304.x) (FT, PMC2908954).
- *new* baker2019: Baker LB 2019. Physiology of sweat gland function: the roles of sweating and sweat composition in human health. *Temperature* 6(3):211–259. [doi:10.1080/23328940.2019.1632145](https://doi.org/10.1080/23328940.2019.1632145) (FT, PMC6773238).
- *new* armstrongKavouras2019: Armstrong LE, Kavouras SA 2019. Thirst and drinking paradigms: evolution from single factor effects to brainwide dynamic networks. *Nutrients* 11(12):2864. [doi:10.3390/nu11122864](https://doi.org/10.3390/nu11122864) (FT, PMC6950074).
- *new* yamada2022: Yamada Y, Zhang X, Henderson MET, Sagayama H, et al. 2022. Variation in human water turnover associated with environmental and lifestyle factors. *Science* 378(6622):909–915. [doi:10.1126/science.abm8668](https://doi.org/10.1126/science.abm8668) (FT, PMC9764345).
- *new* hiley1976: Hiley PG 1976. The thermoregulatory responses of the galago (*Galago crassicaudatus*), the baboon (*Papio cynocephalus*) and the chimpanzee (*Pan troglodytes*) to heat stress. *Journal of Physiology* 254(3):657–671. [doi:10.1113/jphysiol.1976.sp011251](https://doi.org/10.1113/jphysiol.1976.sp011251) (Abs).
- *new* kamberov2018: Kamberov YG, Guhan SM, DeMarchis A, et al. 2018. Comparative evidence for the independent evolution of hair and sweat gland traits in primates. *Journal of Human Evolution* 125:99–105. [doi:10.1016/j.jhevol.2018.10.008](https://doi.org/10.1016/j.jhevol.2018.10.008) (FT, PMC6289065).
- simmen2010, pontzer2021, nelson2022, mackenzie2025 and wessling2018 are already listed; the entries above add findings.
- *new* lindshield2021: Lindshield S, Hernandez-Aguilar RA, Korstjens AH, et al. 2021. Chimpanzees (*Pan troglodytes*) in savanna landscapes. *Evolutionary Anthropology* 30(6):399–420. [doi:10.1002/evan.21924](https://doi.org/10.1002/evan.21924) (FT).
- *new* peter2022: Péter H, Zuberbühler K, Hobaiter C 2022. Well-digging in a community of forest-living wild East African chimpanzees (*Pan troglodytes schweinfurthii*). *Primates* 63(4):355–364. [doi:10.1007/s10329-022-00992-4](https://doi.org/10.1007/s10329-022-00992-4) (FT, PMC9273564).

### E.35 Addendum: E4g calls and travel (2 October 2026)

Stage E4g asked which part of the walking value-based calls add (docs/staging/e4g-prereg.md §1). Nothing below is a
model input; the values are targets or readouts. All full texts were already cited; this adds methods and numbers read
for the stage.

- **Pant-hoots and party composition, Kanyawara** [fedurek2014] (FT; extends E.24) [M]. Oct 2010 – Sep 2011, nest-to-nest
  focal follows of adult males (169 days, mean 550 min), "instantaneous scan samples at 5-min intervals", party = "all
  individuals within 50 m". A change in male composition = "one or more males left or joined the party in one scan,
  compared with the previous scan": 6.33 ± 3.95 per focal day (females 6.52 ± 3.90), ≈ 0.69 per hour (derived [L]). Of
  368 pant-hoots with no other call by the focal within two scans before or after, and none given while feeding (115
  excluded "because ... independent attraction to food sources would confound"), males joined the caller's party within
  ±2 scans in 25.27% (93), left in 10.32% (38); joins after the call (median 0.27 males) vs before (0.15) not significant
  (P = 0.105); fusion was more likely in the two scans after the last call of a sequence than during it (β −0.65 ± 0.27).
- **Others' arrivals at feeding events, Taï** [kalanBoesch2015] (FT; extends E.24) [M] (*P. t. verus*). 557 complete
  feeding events of 9 focal adults; others arrived within 30 min of the focal in 153 (27%); 89.9% of patches were empty on
  arrival; "individuals who arrived always began to join in eating". All foods: food calls did not raise arrivals
  (P = 0.21), pant hoots did (log-odds +0.72 ± 0.28); fruit only (319): food calls +0.81 ± 0.31, pant hoots +0.85 ± 0.38.
  "Nearby" = seen with the focal in the 30 min before, not arriving with it ("a few hundred metres"); food calls carry
  ≤ ~300 m at Taï.
- **Fusion after inquiring pant-hoots, Loango** [southern2025] (FT; extends E.24) [M]. Fusion = "the caller and responder
  were in the same party composition within 30 min of the call, defined as having moved into the same party": 67% of
  352 inquiring pant-hoots (a selected subset: travel with waiting or scanning), on average 5.16 ± 8.54 min later. Who
  moved is not reported; caller–responder distances are in the supplement (not read).
- **What no source read gives:** the distance listeners travel to a caller, or who moves in a fusion. fedurek2014 and
  southern2025 count composition changes; only kalanBoesch2015 counts listeners arriving. clarkWrangham1994 (abstract):
  arrival pant-hoots at Kanyawara did not change other parties' arrival.
- **Use in E4g:** readouts in `scripts/approach-diagnose.ts` (composition changes per awake hour, the share of isolated
  non-feeding pant-hoots with males joining or leaving within ±2 scans, the share of feeding events with others arriving
  within 30 min); never fitted.
- fedurek2014, kalanBoesch2015, southern2025 and clarkWrangham1994 are already listed; the entries above add findings.

### E.36 Addendum: E2h departure timing (2 October 2026)

Read for stage E2h (docs/staging/e2h-prereg.md §1): when wild chimpanzees leave their night nests relative to sunrise,
site by site, and how each source defines departure and sunrise. Offsets marked "derived" are this stage's: the
sources give clock times, so the NOAA sunrise (sun's centre at −0.833°) was computed for each day of each study window
(scripts/departure-bands-metrics.ts) and a mean departure set against a mean sunrise [L].

- **Breakfast planning, Taï** [janmaat2014] (FT; extends E.17) [M]. The departure sample is 179 mornings, not 275 days:
  "We only analyzed data from days that followed complete observation days" and "Only mornings where breakfast
  consisted of fruit were considered (74% of all mornings)"; Fig. 2's "datapoints (n = 179) show the observed departure
  times", and "18% of all departures were before sunrise" is said of that figure. Sunrise: "Astronomical sunrise times
  were retrieved from the website www.esrl.noaa.gov/gmd/grad/solcalc/sunrise.html" (NOAA's apparent sunrise, not
  astronomical twilight). Mean departure +13 min at average predictors (Table 1 intercept +779 s); a normal with that
  mean and an 18% share has an SD of about 14 min (derived). Five mothers with offspring under 7 y, three fruit-scarce
  periods, a site with leopards (boesch1991).
- **Leaving the night nest by season, Gombe** [wrangham1975] (FT, PhD thesis, Table 3.1; extends E.32) [M]. Adult
  males (target-male follows), "Mean times of leaving and entering night-nests are shown from all observations (N = 75)":
  leaving 06:50 (dry, Jul–Sep 1972), 06:28 (wet, Nov 1972 – Jan 1973), 06:47 (dry, Jul–Sep 1973), 06:42 (May 1972 – Sep
  1973). Derived: −14, −20, −17 and −18 min from NOAA sunrise (East Africa Time; mean nest entry then falls −33 to +4 min
  from sunset, where UTC+2 would put it after dark). No SD. Anecdote: Southern males "reached the second fig in the dark
  after leaving their nests before dawn".
- **Leaving the night nest by class, Budongo** [batesByrne2009] (FT; extends E.17) [M]. Derived against the mean NOAA
  sunrise of September 2002 – September 2003 (06:49.9, range 06:35.8–07:06.4): males +6 min (06:56 ± 32, n 21),
  lactating females −4 (06:46 ± 13, n 12), receptive females −13 (06:37 ± 12, n 4), all 37 pooled +1. Shares before
  sunrise if departures are normal: males 0.42–0.43, lactating 0.60–0.66, receptive 0.81–0.94 (derived; bounded by
  departures tracking sunrise or independent of it).
- **The first to leave a nesting party, Mahale** [zamma2014] (FT, Kyoto University repository manuscript; extends the
  E2a entry, which read the abstract) [M]. M group, 5 nights, 26 August – 2 September 2011 (dry season, new moon on 29
  August), parties of 21–47: recording "stopped when the first chimpanzee in the party left its bed in the morning (mean
  finish time 6:48, range 6:07–7:13)". Derived: −15 min (−56 to +10) from NOAA sunrise (East Africa Time assumed). The
  earliest of a large party: a lower bound of its departures.
- **Before dawn at Kibale** [uwimbabazi2021] (FT, PMC8225573; extends its entry) [M]: Kanyawara female follows "started
  at dawn when the focal individual left her nest", but "sometimes the focal individual had already left the nest before
  dawn". [lacroux2022] (FT; extends its entry) [M]: Sebitoli camera traps, twilight = "30 min before sunrise to sunrise"
  (and after sunset): 26 twilight and 10 night events of 36 nocturnal ones in the forest; "Most nocturnal activity
  occurred in the early morning, within an hour before sunrise". No departure times.
- **Fongoli** [stewart2011] (FT, PhD thesis) [M]: "the chimpanzees frequently nested and arose in the dark"; nests were
  built on average 30 min after sunset.
- **Issa** [drummondclarke2023] (FT, PMC10651548) [L], one morning: at 06:20 on 4 June 2020 eight males had "the entire
  party still in their nests"; at 07:10 the party "began pant-hooting and ran". Context only (n = 1).
- Use in E2h: targets only (a three-site band on the median departure, T-RHY-3, and a two-site band for mothers,
  T-FOOD-10; docs/staging/e2h-targets.patch.json). Nothing here is an input.

**Sources:**
- *new* stewart2011: Stewart FA 2011. *The evolution of shelter: ecology and ethology of chimpanzee nest building.* PhD
  thesis, University of Cambridge. [doi:10.17863/CAM.13968](https://doi.org/10.17863/CAM.13968) (FT).
- *new* drummondclarke2023: Drummond-Clarke RC, Fryns C, Stewart FA, Piel AK 2023. A case of intercommunity lethal
  aggression by chimpanzees in an open and dry landscape, Issa Valley, western Tanzania. *Primates* 64(6):599–608.
  [doi:10.1007/s10329-023-01085-6](https://doi.org/10.1007/s10329-023-01085-6) (FT, PMC10651548).
- janmaat2014, wrangham1975, batesByrne2009, zamma2014, uwimbabazi2021, lacroux2022 and boesch1991 are already listed;
  the entries above add findings.

**Not verified:** pruetz2018 full text; hozer2026 numbers (HAL served a bot check); nest-departure times at Ngogo,
Kalinzu, Seringbara, Toro-Semliki, Goualougo, Lopé, Kahuzi and Mt Assirik; the Anderson reviews of primate sleep;
Ghiglieri 1984 (a book).

### E.37 Addendum: E1m milk output (2 October 2026)

Evidence pass for stage E1m, an audit of the milk inputs (`ledgerMilkYieldCoef` 23.2 kcal/day per kg^0.75,
`ledgerMilkEff` 0.80, `ledgerMilkKcalPerMin` 2.5: all human, all assumed). Question: is a primate or ape milk energy
output, measured by isotope dilution, deuterium turnover or test-weighing, better supported for a 31.3 kg wild
chimpanzee mother than the human value scaled by M^0.75? The decision rule was registered before any value was read
([staging/e1m-prereg.md](staging/e1m-prereg.md) §2). Bibliographic data checked against Crossref on 2 October 2026.
Hosts dropped at their first challenge: www.sciencedirect.com (captcha; AJCN and J Nutr back issues now resolve
there), discovery.ucl.ac.uk (Cloudflare), link.springer.com, openagrar.de and the Göttingen repository (bot checks),
PMC PDF downloads (proof-of-work page).

- **Human milk energy output with maternal mass** [butteKing2005] (FT, Cambridge PDF; extends E.11) [H] human.
  - The registry's 749 g/day is a WHO review value (Brown, Dewey & Allen 1998): "Mean milk production rates through 5
    months postpartum are almost identical (749 g day−1) for exclusively-breastfeeding women in developed and
    developing countries". No maternal mass is given for it: the registry's 60 kg is an assumption.
  - Tables 12 and 15 pair doubly labelled water studies with measured milk energy output and maternal weight:
    Lovelady 1993 (USA, n 9, 12–24 weeks) 64.8 kg, 2.20 MJ/day; Goldberg 1991 (UK, n 10) 58.9, 58.9 and 58.6 kg, 2.24,
    2.23 and 2.22 MJ/day at 4, 8 and 12 weeks; Forsum 1992 (Sweden, n 23, 8 weeks) 64.4 kg, 1.97 MJ/day; Butte 2001
    (USA, n 24, 12 weeks) 62.8 kg, 2.02 MJ/day; mean 2.15 MJ/day. The milk method of the originals is not stated here.
  - Derived: 20.7–25.1 kcal/day per kg^0.75 (mean of the four studies 22.6, SD 1.9; pooled 23.1). The registered 23.2
    is 2.6% above the mean, 0.3 SD: confirmed, not corrected.
  - Efficiency of synthesis: "Applying this correction to the estimate of biochemical efficiency derived above
    (91–94%) would yield a figure of 80–85%"; a 1970 estimate from food-intake differences measured no milk; "Given the
    imprecision of these estimates, the biochemical derivation of 80% seems reasonable". No primate measurement exists
    that was found.
- **Human milk intake by deuterium** [daCosta2010] (Abs; PMC3592484 front matter) [H] human. Dose-to-mother deuterium
  turnover, 1,115 measurements of infants aged 0–24 months in 12 countries: 0.78 kg/day overall, above 0.80 kg/day
  until 6–7 months. No maternal mass in the abstract. Cross-species check only.
- **Rhesus macaque milk** [hinde2009] (FT, PMC2615798; E.13 read the abstract) [M] captive. 58 mothers in outdoor
  corrals (8.6 kg at 1 month, 8.9 kg at 3.5 months). The "milk yield value" is milk let down with oxytocin and stripped
  after 3.5–4 h of separation (11.4 g at 0.83 kcal/g; 17.0 g at 0.99 kcal/g); in the authors' words it "should not be
  considered an estimate of the absolute or daily milk yield", and isotope dilution, timed milking or test-weighing
  were judged unsuitable for socially housed rhesus. Also: "In comparison with other mammals, primates produce dilute
  milks over an extended lactation period resulting in low daily costs of investment." Not a daily output.
- **Baboon and marmoset outputs: not read.** roberts1985 (Abs; E.13): no values in the abstract; hinde2009 (FT) puts
  its restricted mothers at three captive baboons. bussVoss1971: no abstract; the publisher host is behind a captcha.
  tardif2001: closed; later papers cite it for milk composition only.
- **Searches** (PubMed titles and abstracts, Europe PMC full text, 2 October 2026): no measured daily milk output of
  any great ape, and none of another nonhuman primate beyond the unread baboon studies.
- **Chimpanzee and ape milk composition** [milligan2007] (FT, University of Arizona repository) [M] captive.
  - Chimpanzees: 4 captive females, one sample each (three at the Southwest National Primate Research Center on days
    451, 473 and 550, sedated, no oxytocin; one at the St. Louis Zoo on day 97, with oxytocin). Smithsonian Nutrition
    Laboratory assays; gross energy from fat, protein and sugar at 9.11, 5.86 and 3.95 kcal/g. Fat 2.01 ± 0.83%, crude
    protein 0.90 ± 0.10%, lactose 7.43 ± 0.30%, dry matter 11.45 ± 0.75%; **0.53 ± 0.07 kcal/g** (Tables 9.1, 9.2).
  - Other apes: captive gorilla 0.47 (n 4), bonobo 0.44 (1), orangutan 0.53 (1); wild mountain gorilla 0.49 (4);
    Hominidae pooled 0.50 ± 0.04 SE (13); captive rhesus 1.03 (22). "fat and total gross energy were not significantly
    different between captive and wild living hominoids". Oftedal & Iverson 1995 list no ape (samples too small).
  - Older chimpanzee values (Ben Shaul 1962, read only in milligan2007's Table 3.4, n ≤ 3, method not given): fat 3.7,
    protein 1.2, lactose 7.0% (derived 0.68 kcal/g). Not used.
  - Derived: chimpanzee milk is 0.79 as energy-dense as human milk (0.669 kcal/g, 2.8 kJ/g), with 0.216 g of dry matter
    per kcal against the registry's human 0.185 (`digestaMilkDmGPerKcal`).
- **Allometry.**
  - riek2021 (Abs; E.11): the exponent 0.74 ± 0.05 only. Coefficient, units and primate rows not read (closed); its
    reference list names only baboon (bussVoss1971) and human milk-intake sources.
  - [riek2011] (not read; closed). Its DOI is 10.1016/j.mambio.2010.03.004.
  - [riek2008] (Abs) [M], offspring side: 62 species measured by weigh-suckle-weigh or isotopes; young at peak
    lactation drink about 883 kJ/day per kg^0.82 of their own mass and grow 32 g/day per kg^0.82.
  - Oftedal 1984 is not online. [douhard2016] (FT, PMC4944469) groups it with older studies that "reported a value of
    the scaling exponent close to that historically found for the metabolic rate (i.e., between 2/3 and 3/4), but did
    not account for the shared ancestry between species". Low primate output is stated in words only: [oftedal1991]
    (Abs: "Both human and non-human primates have relatively low requirements for protein as a consequence of slow
    growth rates, small milk yields and relatively dilute milk"), hinde2009, and [dufourSauther2002] (Abs: primates have
    "longer periods of gestation and lactation and slower prenatal and postnatal growth than other mammals of similar
    size. This reduces daily maternal energy costs."). No coefficient or primate offset could be read.
  - [hindeMilligan2011] (Abs; closed): its reference list cites milligan2007, the mountain gorilla study, Oftedal 1984
    and Riek for apes and allometry; its tables were not read.
- **Use in E1m: no input changes (a valid null).** No primate or ape daily output measured by isotope or
  test-weighing could be read, and no primate allometric line with a coefficient; the human-scaled coefficient is
  confirmed by measured human outputs with maternal mass. Brackets for a wild chimpanzee yield (not inputs): 212–281
  kcal/day for an exclusively milk-fed infant of 3–9 months on the captive growth potential (221 at 9 months at Gombe's
  growth); 243 kcal/day if hominoids conserved milk volume rather than energy per kg^0.75; 274–333 kcal/day from the four
  human studies scaled to 31.3 kg (the input: 307).

**Sources:**
- *new* milligan2007: Milligan LA 2007. *Nonhuman primate milk composition: relationship to phylogeny, ontogeny, and
  ecology.* PhD dissertation, University of Arizona. [hdl:10150/194078](https://hdl.handle.net/10150/194078) (FT).
- *new* daCosta2010: da Costa TH, Haisma H, Wells JC, Mander AP, Whitehead RG, Bluck LJ 2010. How much human milk do
  infants consume? Data from 12 countries using a standardized stable isotope methodology. *Journal of Nutrition*
  140(12):2227–2232. [doi:10.3945/jn.110.123489](https://doi.org/10.3945/jn.110.123489) (Abs).
- *new* riek2008: Riek A 2008. Relationship between milk energy intake and growth rate in suckling mammalian young at
  peak lactation: an updated meta-analysis. *Journal of Zoology* 274(2):160–170.
  [doi:10.1111/j.1469-7998.2007.00369.x](https://doi.org/10.1111/j.1469-7998.2007.00369.x) (Abs).
- *new* riek2011: Riek A 2011. Allometry of milk intake at peak lactation. *Mammalian Biology* 76(1):3–11.
  [doi:10.1016/j.mambio.2010.03.004](https://doi.org/10.1016/j.mambio.2010.03.004) (not read).
- *new* douhard2016: Douhard F, Lemaître J-F, Rauw WM, Friggens NC 2016. Allometric scaling of the elevation of maternal
  energy intake during lactation. *Frontiers in Zoology* 13:32.
  [doi:10.1186/s12983-016-0164-y](https://doi.org/10.1186/s12983-016-0164-y) (FT, PMC4944469).
- *new* oftedal1991: Oftedal OT 1991. The nutritional consequences of foraging in primates: the relationship of
  nutrient intakes to nutrient requirements. *Philosophical Transactions of the Royal Society B* 334(1270):161–170.
  [doi:10.1098/rstb.1991.0105](https://doi.org/10.1098/rstb.1991.0105) (Abs).
- *new* dufourSauther2002: Dufour D, Sauther M 2002. Comparative and evolutionary dimensions of the energetics of
  human pregnancy and lactation. *American Journal of Human Biology* 14(5):584–602.
  [doi:10.1002/ajhb.10071](https://doi.org/10.1002/ajhb.10071) (Abs).
- *new* hindeMilligan2011: Hinde K, Milligan LA 2011. Primate milk: proximate mechanisms and ultimate perspectives.
  *Evolutionary Anthropology* 20(1):9–23. [doi:10.1002/evan.20289](https://doi.org/10.1002/evan.20289) (Abs).
- *new* bussVoss1971: Buss DH, Voss WR 1971. Evaluation of four methods for estimating the milk yield of baboons.
  *Journal of Nutrition* 101(7):901–909. [doi:10.1093/jn/101.7.901](https://doi.org/10.1093/jn/101.7.901) (not read).
- *new* tardif2001: Tardif SD, Power ML, Oftedal OT, Power RA, Layne DG 2001. Lactation, maternal behavior and infant
  growth in common marmoset monkeys (*Callithrix jacchus*): effects of maternal size and litter size. *Behavioral
  Ecology and Sociobiology* 51(1):17–25. [doi:10.1007/s002650100400](https://doi.org/10.1007/s002650100400) (not read;
  author order as cited by hinde2009, the Crossref deposit lists another).
- butteKing2005, hinde2009, roberts1985, riek2021, whittier2011, garcia2017 and emeryThompson2013 are already listed;
  the entries above add findings.

**Not verified:** milk outputs of roberts1985 and bussVoss1971 (publisher captcha); tardif2001; riek2021's coefficient
and primate rows; riek2011; Oftedal 1984 (not online); hindeMilligan2011's tables; garcia2017's energy by stage;
emeryThompson2013 (closed; its abstract has no numbers); Ben Shaul 1962 (read only through milligan2007).
