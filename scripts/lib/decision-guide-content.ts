// Editorial content of docs/decision-guide.html (scripts/decision-guide.ts renders it). What is written here: the
// grouping of the ledger's entries into domains and diagram boxes, the layout, and the plain-English text of each box
// (the old rule, the mechanism that replaced it, notes). What is never written here: which entries are prescriptions,
// which are still in use on the candidate stack, their values, units, classes, target rows and the switch that took
// each one out. Those come from scripts/prescription-ledger.ts at build time, and scripts/decision-guide.ts --check
// fails when a box mixes statuses, names an unknown id, or when any counted entry is left out of every domain.
// Sources of the text: the stage pre-registrations in docs/staging/, the Track E handoff (§0, §3 stage ledger), the
// integrated confirms (e-stack2-confirm.md), scripts/lib/prescriptions.ts and the code in src/sim/. Results of a named
// stack (S3, S4, S5) say so in words: they stay true when the page moves to another stack, and get rewritten then.

export type Side = 'l' | 'r' | 't' | 'b';
/** Status shown on a box: still prescribed, replaced on the stack, input, design, or a layer outside the stack. */
export type Status = 'rem' | 'rep' | 'inp' | 'des' | 'lay';
export type LayerTag = 'CANDIDATE' | 'DEFECT FIX' | 'HELD OFF' | 'RECORDED' | 'IN PROGRESS' | 'STOPPED';

export interface NodeSpec {
  k: string; x: number; y: number; w: number; h: number;
  /** Title; '\n' breaks lines. */
  t: string;
  /** Mono sub line(s); '\n' breaks lines. */
  s?: string;
  /** Counted entries (registry ids or literal keys from LITERALS): the status follows from the ledger. */
  ids?: string[];
  /** Status of a box that holds no counted entry. */
  st?: 'inp' | 'des' | 'lay';
  /** Registry entries listed in the box's detail (their ledger class must match the box's status). */
  ps?: string[];
  layer?: { tag: LayerTag; sw: string[]; stage: string };
  /** Stack switches a design or input box stands for (each must be in the stack): the detail names their stage. */
  sw?: string[];
  /** Detail text: the old rule (replaced boxes), the mechanism now, or what the box is. */
  before?: string; now?: string; text?: string; note?: string;
  /** Counted in another domain (a box repeated for context). */
  see?: string;
}
export interface EdgeSpec {
  f: string; t: string; fs?: Side; ts?: Side; fo?: number; to?: number;
  /** Explicit route (orthogonal points, ports excluded). */
  via?: [number, number][];
  /** x of the vertical leg (horizontal ports) or y of the horizontal leg (vertical ports). */
  mx?: number; my?: number;
  l?: string; lx?: number; ly?: number;
  kind?: 'main' | 'side' | 'lay';
}
export interface ZoneSpec { x: number; y: number; w: number; h: number; label: string }
export interface DiagramSpec {
  key: string; nav: string; title: string; take: string; desc: string;
  /** The figure's own caption (the section heading already names the domain). */
  cap: string;
  w: number; h: number; nodes: NodeSpec[]; edges: EdgeSpec[]; zones?: ZoneSpec[];
  /** Horizontal shift applied to every coordinate (a diagram without a left column moves left). */
  dx?: number;
  /** Short findings under the figure (HTML; links are relative to docs/). */
  notes?: string[];
}

/** Counted literals in src/sim, by a stable key (file and a piece of the line, as LITERAL_OFF matches them). */
export const LITERALS: { key: string; file: string; has: string; label: string }[] = [
  { key: 'lit:nestGate', file: 'candidates.ts', has: 'c.age >= 3 && !race) offerOwnNest', label: 'hour ≥ 12 gate on building a nest' },
  { key: 'lit:nestGateRace', file: 'candidates.ts', has: 'if (race && !caretaker && c.age >= 3) offerOwnNest', label: 'hour ≥ 12 gate on building a nest (departRace branch)' },
  { key: 'lit:middayRest', file: 'candidates.ts', has: 'const midday = rH ? heatRestValue(P, c) : hour >= 11.5', label: '11:30–14:30 rest bonus (+0.3)' },
  { key: 'lit:middayBout', file: 'execution.ts', has: "action === 'rest' && P.rhythmHeat !== 1 && world.hour >= 11.5", label: '11:30–14:30 rest bout' },
  { key: 'lit:morningNest', file: 'execution.ts', has: 'if (world.hour >= 5.5 && world.hour < 12) { a = P.boutNestMorningMin', label: '05:30–12:00 short nest bout' },
  { key: 'lit:nightMenu', file: 'menu.ts', has: 'night: new Set<Action>(', label: 'night menu' },
  { key: 'lit:duskMenu', file: 'menu.ts', has: 'dusk: new Set<Action>(', label: 'dusk menu' },
  { key: 'lit:chorus', file: 'candidates.ts', has: '((hour >= 18 && hour < 19) || (hour >= 6.4 && hour < 7.4))', label: 'dawn and dusk chorus windows' },
  { key: 'lit:figCoin', file: 'execution.ts', has: "(t.common === 'fig' || t.id === simOf(world).figTree) && random(world) < 0.5", label: '50% arrival pant-hoot at rich figs' },
  { key: 'lit:defend', file: 'conflict.ts', has: 'defended = random(world) < 0.35', label: "mother's defence roll against infanticide" },
];

/** Steps of one decision (the overview). Every counted entry acts at exactly one step. */
export const STEPS = ['perceive', 'body:energy', 'body:water', 'body:sleep', 'body:heat', 'body:endo', 'body:social', 'options', 'choice', 'act', 'world'] as const;
export type Step = typeof STEPS[number];

/** Where each counted entry acts in one decision (read from the code that reads it; see the comment of each line). */
export const STEP_OF: Record<string, Step> = {
  // perception.ts: hazards and impulses rolled when the animal perceives
  patrolStartH: 'perceive', patrolEndH: 'perceive', patrolH0: 'perceive', patrolMaleOddsRatio: 'perceive',
  gangImpulseP: 'perceive', gangRollGapH: 'perceive', gangVictimGapH: 'perceive', gangMinOwnMales: 'perceive',
  infanticideNewAlphaP: 'perceive', infanticideStrangerP: 'perceive', escalateImpulseBase: 'perceive', escalateImpulseAggr: 'perceive',
  // life.ts needs, energy.ts: body state
  hungerAwakePerH: 'body:energy', hungerRunPerH: 'body:energy', hungerSleepPerH: 'body:energy', hungerLactationPerH: 'body:energy',
  hungerPregnancyPerH: 'body:energy', fruitHungerFactor: 'body:energy', fallbackHungerPerH: 'body:energy', ledgerWildCostMult: 'body:energy',
  thirstAwakePerH: 'body:water', thirstSleepPerH: 'body:water', thirstHotPerH: 'body:water', fruitThirstFactor: 'body:water',
  energySleepPerH: 'body:sleep', energyRestPerH: 'body:sleep', energyRunPerH: 'body:sleep', energyWalkPerH: 'body:sleep', energyOtherPerH: 'body:sleep',
  stressRelaxPerH: 'body:endo', socialAwakePerH: 'body:social', socialSleepPerH: 'body:social',
  // candidates.ts: what each option is worth, and which options are offered
  nestEveningFromH: 'options', nestEveningStartH: 'options', nestEveningEndH: 'options', nestEveningDrive: 'options', nestNightBonus: 'options',
  nestMorningDrive: 'options', 'lit:nestGate': 'options', 'lit:middayRest': 'options', 'lit:chorus': 'options', contactCallGapH: 'options',
  drinkDistScaleM: 'options', forageDistScaleM: 'options', memTravelHungerW: 'options', fallbackForageW: 'options', fruitIntakePerH: 'options',
  partyFollowBase: 'options', partyFollowW: 'options', partyFollowMaleW: 'options', partyStayW: 'options', joinSocialW: 'options', joinHooW: 'options',
  joinCallDistScaleM: 'options', pantGruntRepeatH: 'options', feedChargeGapH: 'options', immigrantChargeGapH: 'options', huntGapH: 'options',
  mateIntervalH: 'options', consortLatestHour: 'options', patrolFemaleJoin: 'options', patrolFemaleStay: 'options', patrolLactatingJoin: 'options',
  guardMaxAgeY: 'options', continueBonus: 'options', finishedPenalty: 'options',
  // rg.ts and menu.ts: the choice
  rgTemperature: 'choice', rgMaxAgeH: 'choice', 'lit:nightMenu': 'choice', 'lit:duskMenu': 'choice',
  // execution.ts, conflict.ts, ecology.ts, parties.ts, signals.ts: carrying out the act and its dice
  boutNestMorningMin: 'act', boutNestMorningMax: 'act', 'lit:morningNest': 'act', nestWakeHour: 'act', boutRestMiddayMin: 'act',
  boutRestMiddayMax: 'act', 'lit:middayBout': 'act', drinkThirstPerH: 'act', travelCallPerH: 'act', travelCallGapH: 'act', foodCallBase: 'act',
  foodCallCropW: 'act', foodCallMaleW: 'act', foodCallPartnerW: 'act', travelHooP: 'act', travelHooAllyP: 'act', 'lit:figCoin': 'act',
  redirectBaseP: 'act', redirectAggrP: 'act', escalationBaseP: 'act', escalationEvenP: 'act', hitP: 'act', seriousInjuryP: 'act',
  coalitionBondP: 'act', coalitionStrangerP: 'act', gangKillMalePerAttacker: 'act', gangKillMaleMax: 'act', gangKillInfantP: 'act',
  gangKillOtherP: 'act', infanticideKillP: 'act', 'lit:defend': 'act', huntSuccessMax: 'act', huntSuccessRate: 'act', huntExtraKillP: 'act',
  meatEatPerH: 'act', weanRefuseMaxP: 'act', roughPlayP: 'act', walkMps: 'act', departRetryMin: 'act', departPersistMaxMin: 'act',
  patrolIncursionP: 'act', patrolMaxH: 'act', patrolStopEveryMin: 'act', patrolReleaseP: 'act', patrolReleaseContactP: 'act',
  drumHitsMedian: 'act', drumHitsSigma: 'act', drumIntervalMs: 'act', sigIdentitySD: 'act', sigCommunitySD: 'act',
  // tick.ts, life.ts, disease.ts, snares.ts, reproduction.ts, generation.ts: the world, outside any choice
  rainDisplayP: 'world', epidemicArrivalPerY: 'world', epidemicBetaPerH: 'world', epidemicFatality: 'world', snareHazardPerKm: 'world',
  adoptOtherP: 'world', adoptSiblingP: 'world', adoptSiblingInfantP: 'world', adoptOtherMinAgeY: 'world', adoptSiblingMinAgeY: 'world',
  carryDeadP: 'world', bereaveHalfLifeD: 'world', bereaveMaxAgeY: 'world', dispersalHazardPerY: 'world', disperserP: 'world',
};

/** Stages: name, verdict and document (handoff §3 stage ledger and each pre-registration). */
export const STAGES: Record<string, { name: string; verdict: string; doc: string }> = {
  E1: { name: 'energy ledger', verdict: 'null after 3 iterations; the base of the stack', doc: 'staging/e1-prereg.md' },
  E1b: { name: 'gut in dry matter', verdict: 'null', doc: 'staging/e1b-prereg.md' },
  E1c: { name: 'infants on the ledger', verdict: 'keep (provisional)', doc: 'staging/e1c-prereg.md' },
  E1e: { name: 'two-signal appetite', verdict: 'keep (provisional, marginal)', doc: 'staging/e1e-prereg.md' },
  E1f: { name: 'nursing bouts and growth', verdict: 'keep (provisional)', doc: 'staging/e1f-prereg.md' },
  E1h: { name: 'food energy from measured sugars', verdict: 'keep conditional on the gut (5-seed confirm)', doc: 'staging/e1h-prereg.md' },
  E1i: { name: 'satiation and the lactating gut', verdict: 'null on 5 seeds (strict viability line), a large partial result', doc: 'staging/e1i-prereg.md' },
  E1k: { name: "the groomer's own need", verdict: 'null (marginal), off', doc: 'staging/e1k-prereg.md' },
  E1n: { name: 'weaning as a decision', verdict: 'provisional keep candidate (one prescription fewer); a null as a weaning mechanism', doc: 'staging/e1n-prereg.md' },
  E1o: { name: 'what an older infant drinks', verdict: 'arm B (weanDeficit with weanDecide) a provisional keep candidate, confirmed on 5 seeds as S6; arm A (milkInDrive) a defect fix, null for the milk volume', doc: 'staging/e1o-prereg.md' },
  E2a: { name: 'sleep pressure, light and heat', verdict: 'keep (provisional)', doc: 'staging/e2a-prereg.md' },
  E2b: { name: 'leaving the nest', verdict: 'partial; off alone', doc: 'staging/e2b-prereg.md' },
  E2c: { name: 'the cost of darkness', verdict: 'null alone', doc: 'staging/e2c-prereg.md' },
  E2d: { name: 'circadian clock', verdict: 'null alone', doc: 'staging/e2d-prereg.md' },
  E2e: { name: 'company in the nest', verdict: 'recorded, not kept alone', doc: 'staging/e2e-prereg.md' },
  E2f: { name: 'chimpanzee sleep amount', verdict: 'keep candidate (provisional) as a package of five switches; night safety confirmed on 5 seeds', doc: 'staging/e2f-prereg.md' },
  E2g: { name: 'water ledger', verdict: 'provisional keep candidate, confirmed on 5 seeds', doc: 'staging/e2g-prereg.md' },
  E3b: { name: 'what stops a return to a crown just fed in', verdict: 'provisional keep candidate as a correction (removes no prescription); off, not in S6', doc: 'staging/e3b-prereg.md' },
  E3: { name: 'urgency', verdict: 'stopped after 3 iterations; off', doc: 'staging/e3-prereg.md' },
  E4a: { name: 'slow hormone-like states', verdict: 'keep (provisional)', doc: 'staging/e4a-prereg.md' },
  E4b: { name: 'fast arousal', verdict: 'keep (provisional) with endoRainDisplay', doc: 'staging/e4b-prereg.md' },
  E4c: { name: 'calls as decisions', verdict: 'provisional keep candidate, confirmed on 5 seeds', doc: 'staging/e4c-prereg.md' },
  E4d: { name: 'sleep-gated hormone rhythm', verdict: 'recorded, off (removes nothing)', doc: 'staging/e4d-prereg.md' },
  E4e: { name: 'a hunt valued as food', verdict: 'passes the keep rule on 5 seeds; held off', doc: 'staging/e4e-prereg.md' },
  E4f: { name: 'colobus encounters', verdict: 'recorded, off (a site-matched input, [L])', doc: 'staging/e4f-prereg.md' },
  E4g: { name: 'a care follow is not a departure', verdict: 'a defect fix; null by its own kill criterion (removes no prescription)', doc: 'staging/e4g-prereg.md' },
  E5a: { name: 'party cohesion valued by company', verdict: 'provisional keep candidate, confirmed on 5 seeds; integrated in S5 with E4g\'s fix and E5b\'s margin (without the margin, on S4, it added walking)', doc: 'staging/e5a-prereg.md' },
  E5b: { name: 'calls and cohesion together', verdict: 'a correction of E5a\'s valuation, recommended to travel with cohesionValue (removes no prescription)', doc: 'staging/e5b-prereg.md' },
  E5c: { name: 'a crown\'s crop shared by its feeders', verdict: 'no switch kept; recorded, off (removes nothing)', doc: 'staging/e5c-prereg.md' },
};

/** A switch whose verdict differs from its stage's (handoff §3: endoRainDisplay is E4a's switch, kept with E4b's endoFast). */
export const SWITCH_VERDICT: Record<string, { verdict: string; doc: string }> = {
  endoRainDisplay: { verdict: 'a null alone in E4a (slow states cannot carry it); with E4b\'s endoFast, keep (provisional)', doc: 'staging/e4b-prereg.md' },
};

/** Why a switch whose own stage was a null or a record is in the stack anyway (e-stack2-confirm.md "The stack S2";
 *  handoff §3). */
export const IN_STACK_BECAUSE: Record<string, string> = {
  energyLedger: 'the base of the reference stack R',
  ledgerDigesta: 'part of the reference stack R',
  ledgerSatiationReserve: 'with ledgerLactGut, the only configuration with corrected food energy and no starvation',
  ledgerLactGut: 'with ledgerSatiationReserve, the only configuration with corrected food energy and no starvation; flagged: sized to its load by construction',
  darkCost: 'part of the E2f package (night safety confirmed on 5 seeds)',
  rhythmCircadian: 'part of the E2f package (night safety confirmed on 5 seeds)',
  departRace: 'part of the E2f package (night safety confirmed on 5 seeds)',
  nestLightDecide: 'part of the E2f package (night safety confirmed on 5 seeds)',
  nestCompany: 'part of the E2f package (night safety confirmed on 5 seeds)',
  nestAudience: 'part of the E2f package (night safety confirmed on 5 seeds)',
  rhythmFreeNight: 'part of the E2f package (night safety confirmed on 5 seeds)',
  sleepChimp: 'part of the E2f package (night safety confirmed on 5 seeds)',
  preyKanyawara: 'a site-matched input ([L])',
  weanDecide: 'with E1o\'s weanDeficit (arm B), confirmed on 5 seeds as S6',
};

const L = 16, S = 288, R = 584, LW = 208, SW = 232, RW = 232;
const y = (row: number) => 16 + row * 96;

export const DIAGRAMS: DiagramSpec[] = [
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'choice', cap: 'One decision point, step by step', nav: 'The choice itself', title: 'The choice itself',
    take: 'The same machinery picks every act. Three of its parts still set how sharp and how sticky choices are by fixed numbers.',
    desc: 'Flowchart of one rules decision: decision point, intention gate, scored options, a bounded menu, a softmax draw and a re-checked act, with the prescribed constants attached.',
    w: 832, h: 616, dx: -192,
    nodes: [
      { k: 'dp', x: S, y: y(0), w: SW, h: 72, t: 'Decision point', s: 'bout ends · interrupt · act done', st: 'des',
        text: 'A chimp decides only when its bout runs out, something interrupts it (a charge, a storm, a stranger\'s call), or its act ends early. Bout lengths are design ranges.' },
      { k: 'gate', x: S, y: y(1), w: SW, h: 72, t: 'Intention gate', s: 'keep the act unless things changed', st: 'des', ps: ['rgMinAge'],
        text: 'Rules-driven chimps of 8 years and over keep their act and target unless something salient changed: an interrupt, a need moving to another bucket, a new period of the day, the act ending, or a much better food place while feeding. A trip that reaches its tree becomes feeding there (rg.ts, the Jev free arms\' gate).' },
      { k: 'opts', x: S, y: y(2), w: SW, h: 72, t: 'Options and their scores', s: 'computeCandidates · ±0.12 jitter', st: 'des', ps: ['candidateJitterSpan'],
        text: 'Code lists every legal act and target and scores each one (candidates.ts). No dice here: a reproducible ±0.12 jitter changes with every decision. Scores of −0.4 or less are dropped; at most 48 options.' },
      { k: 'menu', x: S, y: y(3), w: SW, h: 72, t: 'A short menu', s: '≤ 8 options', st: 'des',
        text: 'The menu a model would be offered (menu.ts): at most 8 options, always keeping the rules\' best, a response to a disturbance, a noticed joint trip and a hunt the animal may lead.' },
      { k: 'soft', x: S, y: y(4), w: SW, h: 72, t: 'One weighted draw', s: 'softmax at rgTemperature', ids: ['rgTemperature'],
        text: 'One draw from the menu, by a softmax of the rules\' scores. The temperature was set so the rules\' top option wins a median 0.77 of draws, the Jev model\'s own figure: a choice-sharpness outcome, not a mechanism (ledger).' },
      { k: 'act', x: S, y: y(5), w: SW, h: 72, t: 'The act, checked again', s: 'startAction', st: 'des',
        text: 'The pick is checked against a fresh list before it starts (startAction), the one path by which rules and models commit an act.' },
      { k: 'age', x: R, y: y(1), w: RW, h: 72, t: 'Re-decide after 30 minutes', s: 'rgMaxAgeH', ids: ['rgMaxAgeH'],
        text: 'An intention is re-decided after a fixed 30 minutes, whatever the animal\'s state (ledger). The model\'s own gate uses 90 minutes.' },
      { k: 'stick', x: R, y: y(2), w: RW, h: 72, t: 'Carry on, don\'t repeat', s: 'continueBonus · finishedPenalty', ids: ['continueBonus', 'finishedPenalty'],
        text: 'The act already under way gets +0.25 and an act that just finished gets −0.5: fixed bonuses that set how long bouts last and how often acts switch (ledger).' },
      { k: 'night', x: R, y: y(3), w: RW, h: 72, t: 'No night or dusk menu', s: 'menu.ts: night, dusk', ids: ['lit:nightMenu', 'lit:duskMenu'], see: 'sleep',
        before: 'After dark a rules-driven chimp could only nest, rest, nurse, flee, alarm, shelter or submit (plus self-defence). At dusk a last feed, drink, groom, call and a few more stayed open (menu.ts).',
        now: 'Rules-driven chimps choose from the full menu at night. Sleep pressure, the sleep gate, darkness and their nest-mates\' company keep them in their nests. Models keep the menus.' },
      { k: 'e3', x: R, y: y(4), w: RW, h: 120, t: 'Urgency (E3)', s: 'urgencyChoice · urgencyPersist\nurgencySwitchCost', st: 'lay',
        layer: { tag: 'STOPPED', sw: ['urgencyChoice', 'urgencyPersist', 'urgencySwitchCost'], stage: 'E3' },
        text: 'Would set the draw\'s temperature from the animal\'s largest deficit, keep an act while it still pays (the marginal value theorem), and drop the fixed bonus and penalty. urgencyChoice was viable and inside noise; persistence halved crown bouts and moved feeding to leaves underfoot, and the effect stood on a re-test.' },
    ],
    edges: [
      { f: 'dp', t: 'gate', kind: 'main' }, { f: 'gate', t: 'opts', kind: 'main', l: 're-decide', lx: 360, ly: 196 },
      { f: 'opts', t: 'menu', kind: 'main' }, { f: 'menu', t: 'soft', kind: 'main' }, { f: 'soft', t: 'act', kind: 'main' },
      { f: 'gate', t: 'act', fs: 'l', ts: 'l', via: [[256, 148], [256, 532]], kind: 'main', l: 'keep', lx: 236, ly: 340 },
      { f: 'age', t: 'gate', fs: 'l', ts: 'r', kind: 'side' }, { f: 'stick', t: 'opts', fs: 'l', ts: 'r', kind: 'side' },
      { f: 'night', t: 'menu', fs: 'l', ts: 'r', kind: 'side' },
      { f: 'e3', t: 'soft', fs: 'l', ts: 'r', fo: -24, kind: 'lay' },
    ],
    notes: [
      'The rules policy is the same for every domain below; a model can replace the draw, never the checks (<a href="simulation.md">simulation.md §8</a>).',
      'E3 is not part of <span data-n="stack">S5</span>. Its stage stopped after three iterations (<a href="staging/e3-prereg.md">e3-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'feeding', cap: 'From a meal to the next feeding choice', nav: 'Feeding', title: 'Feeding and foraging',
    take: 'Hunger now comes from an energy ledger and a gut. What is still fitted is how far a meal is worth walking, how fast a crown empties and how fast an animal walks.',
    desc: 'Flowchart of feeding on the candidate stack: food energy and bulk, the gut, reserves and hunger feed the value of feeding options, with fitted trip weights still attached; a return valued by the crop left (E3b) and crown sharing (E5c) are layers outside the stack.',
    w: 832, h: 616,
    nodes: [
      { k: 'food', x: L, y: y(0), w: LW, h: 72, t: 'Food energy and bulk', s: 'kcal and dry matter per minute', st: 'inp',
        ps: ['ledgerFruitKcalPerMinSugar', 'ledgerFigKcalPerMinSugar', 'ledgerFallbackKcalPerMinSugar', 'digestaDrupeDmGPerMin', 'digestaFigDmGPerMin', 'digestaFallbackDmGPerMin', 'digestaFruitNdf', 'digestaFallbackNdf'],
        text: 'Measured on the foods: kcal per feeding minute from each food\'s sugars, protein, lipid and fibre (E1h), and grams of dry matter and fibre per minute (E1b).' },
      { k: 'eaten', x: S, y: y(0), w: SW, h: 72, t: 'Meals counted in kcal', s: 'hunger conversions switched out', ids: ['fruitHungerFactor', 'fallbackHungerPerH'],
        before: 'Each unit of fruit eaten removed 2.2 hunger (fitted in C5a against travel share and day range), and leaves, pith and herbs removed 0.11 hunger per hour.',
        now: 'Food is booked as energy and bulk: kcal per feeding minute, and grams of dry matter and fibre that fill the gut.' },
      { k: 'gut', x: S, y: y(1), w: SW, h: 72, t: 'Gut: foregut and hindgut', s: '83 mL per kg · assumed', st: 'des',
        ps: ['digestaGutMlPerKg', 'digestaForegutShare', 'digestaMrtH', 'digestaNdfDigestibility'],
        text: 'The gut holds dry matter, not energy (E1b). The foregut fills by eating and empties steadily; fibre moves on to the hindgut and ferments. Its size is assumed: the only chimpanzee gut volume is one captive animal of unknown mass. A nursing mother\'s gut grows with her milk demand (ledgerLactGut, E1i; design, flagged as sized to its load).' },
      { k: 'ledger', x: S, y: y(2), w: SW, h: 72, t: 'Reserves: in minus out', s: 'hunger timers switched out', ids: ['hungerAwakePerH', 'hungerSleepPerH', 'hungerRunPerH'],
        before: 'Hunger rose on timers: 0.06 per hour awake (times a body factor), 0.022 asleep and 0.09 while running, charging or displaying.',
        now: 'Absorbed energy flows into reserves. Spending flows out: resting rate times an activity multiple, every metre walked and climbed, growth, gestation and the milk an infant drinks. Starvation is reserves at minus the usable store (E1).' },
      { k: 'drive', x: S, y: y(3), w: SW, h: 72, t: 'Hunger: need versus fullness', s: 'E1e drive · E1i satiation', st: 'des',
        text: 'The drive to eat is the energy the animal still needs before its next chance to feed (the reserve deficit, less what the gut will still yield, plus what the rest of the waking day and the night\'s fast will cost), as a share of what it can still eat while awake (E1e). Fullness damps it only near a full gut, weighted by how low the reserves are (E1i). The time left awake comes from sleep pressure, never from the clock.' },
      { k: 'opts', x: S, y: y(4), w: SW, h: 72, t: 'What each meal is worth', s: 'energy per hour, walk included', st: 'des',
        text: 'Each feeding option is worth the energy it delivers per hour, walk included, against the animal\'s own rate on ripe fruit. So a hungry animal walks to remembered fruit rather than eat leaves at half the rate. Other feeders in a crown lower its worth when fruit is scarce (contest competition).' },
      { k: 'move', x: L, y: y(2), w: LW, h: 72, t: 'Cost of moving', s: '3.8 J per kg per metre', st: 'inp', ps: ['ledgerWalkJPerKgM', 'travelDistScaleM'],
        text: 'The net cost of walking measured on chimpanzees: 3.8 J per kg per metre. The trip\'s energy cost per metre is derived from it.' },
      { k: 'wild', x: R, y: y(2), w: RW, h: 72, t: 'Wild cost multiplier', s: 'ledgerWildCostMult = 1', ids: ['ledgerWildCostMult'],
        text: 'Multiplies resting spending for wild costs no term models. Its value is 1, the captive-based sum, so it changes nothing.',
        note: 'Counted because its notes say "swept and never fitted": the ledger\'s fitted-word rule does not catch "never". Probably a classification error; shown as the tool counts it.' },
      { k: 'trip', x: R, y: y(4), w: RW, h: 88, t: 'Trip weights fitted to\ntravel and day range', s: 'three weights from C5a', ids: ['forageDistScaleM', 'memTravelHungerW', 'fallbackForageW'],
        text: 'Three weights fitted in C5a against the travel share and day range (T-ACT-2, T-RNG-4): a crown in view loses 1 point per 400 m; a remembered crown scales with 1.25 × hunger and leaves underfoot with 0.45 × hunger.' },
      { k: 'speed', x: L, y: y(4), w: LW, h: 72, t: 'Walking speed', s: 'walkMps 0.35 m/s', ids: ['walkMps'],
        text: 'Taken from the field\'s day range (2.7 km) and travel share (21% of an 11.5-hour day): the two outcomes it helps produce (ledger). It sets every walk\'s time.' },
      { k: 'crop', x: L, y: y(5), w: LW, h: 72, t: 'Fruit eaten per feeding hour', s: 'fruitIntakePerH', ids: ['fruitIntakePerH'],
        text: 'How many units of fruit an animal takes from a crown per hour: it sets how fast a crown empties and how long a visit lasts in a trip\'s value. Fitted in C5a against T-ACT-2 and T-RNG-4.' },
      { k: 'feed', x: S, y: y(5), w: SW, h: 72, t: 'Feed, walk or eat leaves', s: 'forage · travel', st: 'des',
        text: 'The options go to the choice. Feeding fills the gut at the food\'s rate until the crown\'s share runs out or the animal stops.' },
      { k: 'e3b', x: L, y: y(3), w: LW, h: 84, t: 'A return valued by\nthe crop left (E3b)', s: 'revisitByCrop', st: 'lay', layer: { tag: 'CANDIDATE', sw: ['revisitByCrop'], stage: 'E3b' },
        text: 'A crown just fed in is devalued by 0.5, fading with a 12-hour time constant, whatever is left in it (revisitW, design, no source). E3b would value it like any other crown, by the crop the animal believes is left. On S5 in quick mode: viable, nursing mothers in balance, walking 27–36% less and hunting inside its band, but the fruit share rises above its band (0.85) and animals visit fewer crowns. A correction that removes no prescription; off, not in S6.' },
      { k: 'e5c', x: R, y: y(5), w: RW, h: 88, t: 'A crown shared by\nits feeders (E5c)', s: 'crownShare', st: 'lay', layer: { tag: 'RECORDED', sw: ['crownShare'], stage: 'E5c' },
        text: 'Would make other feeders cost the share of the bout they take, and value a crown just fed in by the crop believed left, with two crop-blind design terms off (the revisit devaluation and the habitat-wide crowding cost). Viable, mothers better and males walking 30% less, but none of three valuations made feeders follow the crop: party members feed one or two at a time (1.3 per crown), so the crop never limits them.' },
    ],
    edges: [
      { f: 'food', t: 'eaten', kind: 'side' }, { f: 'eaten', t: 'gut', kind: 'main' }, { f: 'gut', t: 'ledger', kind: 'main' },
      { f: 'ledger', t: 'drive', kind: 'main' }, { f: 'drive', t: 'opts', kind: 'main' }, { f: 'opts', t: 'feed', kind: 'main' },
      { f: 'move', t: 'ledger', kind: 'side' }, { f: 'wild', t: 'ledger', fs: 'l', ts: 'r', kind: 'side' },
      { f: 'trip', t: 'opts', fs: 'l', ts: 'r', fo: -8, to: 0, kind: 'side' }, { f: 'speed', t: 'opts', kind: 'side' },
      { f: 'crop', t: 'feed', kind: 'side' },
      { f: 'e5c', t: 'opts', fs: 'l', ts: 'r', fo: 0, to: 16, kind: 'lay' },
      { f: 'e3b', t: 'opts', fs: 'r', ts: 'l', fo: 0, to: -16, kind: 'lay' },
    ],
    notes: [
      'On S6 the feeding, grooming and rest rows of the activity budget are in their bands. No animal starves on S5 or S6 in 5 seeds × 60 days (S5: two deaths, both illness; S6: none) (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
      'Open: nursing mothers stop eating with room in the gut, so the limit is their appetite and their day, not the gut wall (<a href="staging/e1h-prereg.md">e1h-prereg.md §9</a>, <a href="staging/e1i-prereg.md">e1i-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'drinking', cap: 'From water in and out to a drink', nav: 'Drinking', title: 'Drinking',
    take: 'Thirst timers are gone. Thirst is read from a water balance in millilitres, so animals drink when they run short, not on a schedule.',
    desc: 'Flowchart of drinking on the candidate stack: water in food, metabolic water and losses feed a water ledger; the deficit sets thirst, the value of a walk to water and the drinking bout.',
    w: 600, h: 424,
    nodes: [
      { k: 'food', x: L, y: y(0), w: LW, h: 72, t: 'Water in food', s: 'fruitThirstFactor', ids: ['fruitThirstFactor'], ps: ['waterFruitFrac'],
        before: 'Each unit of fruit eaten removed 0.55 thirst (fitted in C5a against travel share and day range).',
        now: 'Food water is each food\'s dry matter times its water share, counted when eaten. Ripe fruit is 75% water.' },
      { k: 'phys', x: L, y: y(1), w: LW, h: 88, t: 'Body water physiology', s: 'metabolic water · urine\nfaeces · breath and skin', st: 'des',
        ps: ['waterMetabolicMlPerKcal', 'waterUrineMinMlPerKgD', 'waterFaecalFrac', 'waterLatentJPerG'],
        text: 'Metabolic water per kcal spent, the least urine, faecal water, and the evaporation the heat balance needs to shed heat. Physiology values the ledger classes design (evidence L).' },
      { k: 'ledger', x: S, y: y(0), w: SW, h: 72, t: 'Water ledger', s: 'thirst timers switched out', ids: ['thirstAwakePerH', 'thirstSleepPerH', 'thirstHotPerH'],
        before: 'Thirst rose on timers: 0.026 per hour awake, 0.008 asleep, and 0.008 more per hour above 22 °C.',
        now: 'Thirst is read from a water balance in mL. In: food water, metabolic water, drinking. Out: evaporation, breath and skin, faeces, urine, milk. No hourly rate, no hot-hour bonus (E2g).' },
      { k: 'thirst', x: S, y: y(1), w: SW, h: 72, t: 'Thirst from the deficit', s: 'onset 1% · full 2% of body mass', st: 'des', ps: ['waterThirstOnsetPct', 'waterThirstFullPct'],
        text: 'Thirst is 0 until the animal is short of 1% of its body mass in water and rises to full at 2%.' },
      { k: 'walk', x: S, y: y(2), w: SW, h: 72, t: 'Worth of a walk to water', s: 'drinkDistScaleM', ids: ['drinkDistScaleM'],
        before: 'A walk to water scored thirst × 1.5, minus 1 point per 2,000 m (fitted in C5a against travel share and day range), only above thirst 0.25.',
        now: 'A trip to remembered water is worth the share of it spent drinking, walk included, whenever there is a deficit.' },
      { k: 'drink', x: S, y: y(3), w: SW, h: 72, t: 'Drinking until replaced', s: 'drinkThirstPerH', ids: ['drinkThirstPerH'],
        before: 'At the water, thirst fell by 1.4 per hour.',
        now: 'The animal drinks 3.1 mL per kg per minute (human drinking rate, [L]) until the deficit is gone.' },
    ],
    edges: [
      { f: 'food', t: 'ledger', kind: 'side' }, { f: 'phys', t: 'ledger', fs: 'r', ts: 'l', fo: -12, to: 12, mx: 256, kind: 'side' },
      { f: 'ledger', t: 'thirst', kind: 'main' }, { f: 'thirst', t: 'walk', kind: 'main' }, { f: 'walk', t: 'drink', kind: 'main' },
      { f: 'drink', t: 'ledger', fs: 'r', ts: 'r', via: [[552, 340], [552, 52]], kind: 'side', l: 'refills', lx: 574, ly: 196 },
    ],
    notes: [
      'Drinking fell from 2.24 to 0.84 bouts per adult-day and walks to water from 22% to 10% of movement (<a href="staging/e2g-prereg.md">e2g-prereg.md</a>).',
      'Adding the water ledger to the integrated stack (S2 → S3) cut males\' daily path from 3.79 to 2.93 km and six prescriptions (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'sleep', cap: 'From sleep pressure to leaving the nest', nav: 'Sleep and the nest', title: 'Sleep and the nest',
    take: 'The nest clock, the morning bout and the night menu are gone. Sleep pressure, a circadian sleep gate, light and company now decide when a chimp nests and when it leaves.',
    desc: 'Flowchart of nesting and leaving the nest on the candidate stack: sleep pressure, a circadian gate, light and company set the nest value, building, bout length and the night choice.',
    w: 536, h: 616,
    nodes: [
      { k: 'press', x: S, y: y(0), w: SW, h: 72, t: 'Sleep pressure', s: 'energy timers switched out', ids: ['energySleepPerH', 'energyRestPerH', 'energyRunPerH', 'energyWalkPerH', 'energyOtherPerH'],
        before: 'An energy gauge refilled at fixed rates per hour asleep (0.1) or resting (0.06) and drained per hour running (0.25), walking (0.05) or doing anything else (0.02).',
        now: 'Sleep pressure rises while awake and falls only while asleep in a nest (process S of the two-process model). Energy reads 1 − pressure × darkness (E2a).' },
      { k: 'gate', x: S, y: y(1), w: SW, h: 72, t: 'Circadian sleep gate', s: 'human pacemaker model', st: 'des', ps: ['circTauH', 'circHUpper', 'circHLower', 'circAmp'],
        text: 'A circadian pacemaker driven by the light at the animal\'s eyes (E2d). Sleep starts when pressure reaches an upper threshold and ends at a lower one. Human values, assumed: no chimpanzee period or light response is published.' },
      { k: 'value', x: S, y: y(2), w: SW, h: 72, t: 'What the nest is worth', s: 'nest clock switched out', ids: ['nestEveningFromH', 'nestEveningStartH', 'nestEveningEndH', 'nestEveningDrive', 'nestNightBonus', 'nestMorningDrive'],
        before: 'A nest clock: after 12:00 the nest\'s pull ramped from 17:54 to 18:54 up to 2.2, plus 0.6 at night. In the morning a stay-in-nest pull of up to 2.6 faded as daylight rose.',
        now: 'The nest is worth the rest score plus felt sleepiness from the sleep gate, plus its nest-mates\' company, less the cost of waiting while others eat a crown it wants (E2a, E2d, E2e, E2b).',
        note: 'E2a\'s own darkness weight (rhythmDarkW 2.2, a prescription) is not read on the stack: darkCost and rhythmCircadian replace it.' },
      { k: 'build', x: S, y: y(3), w: SW, h: 72, t: 'Building a new nest', s: 'hour ≥ 12 gate switched out', ids: ['lit:nestGate'],
        before: 'A new nest could be built only from 12:00, or at night (candidates.ts).',
        now: 'Falling light opens it: a new nest is offered whenever daylight is below full (E2a).' },
      { k: 'bout', x: S, y: y(4), w: SW, h: 72, t: 'Nest bouts follow the light', s: 'nestWakeHour · boutNestMorning*', ids: ['nestWakeHour', 'boutNestMorningMin', 'boutNestMorningMax', 'lit:morningNest'],
        before: 'Night nest bouts ended at 05:45. Between 05:30 and 12:00 nest bouts lasted 4–9 minutes.',
        now: 'In the dark a nest bout runs until rising light wakes the animal; in changing light the short 4–9 minute bout; in full light the day bout. While the light rises, an animal re-decides at the end of each bout (E2a, E2b).' },
      { k: 'night', x: S, y: y(5), w: SW, h: 72, t: 'No menu at night', s: 'menu.ts: night, dusk', ids: ['lit:nightMenu', 'lit:duskMenu'],
        before: 'After dark a rules-driven chimp could only nest, rest, nurse, flee, alarm, shelter or submit (plus self-defence). At dusk a last feed, drink, groom, call and a few more stayed open.',
        now: 'Rules-driven chimps choose from the full menu at night; sleep, darkness and company keep them in their nests. On S6 adults are out of a nest 2.77% of the night, under the 3.3% line. Models keep the menus.' },
      { k: 'amount', x: L, y: y(0), w: LW, h: 72, t: 'Chimpanzee sleep amount', s: 'sleepDriveShift', st: 'inp', ps: ['sleepDriveShift'],
        text: 'Captive chimpanzee sleep measured by EEG, 9.7 hours, lowers both thresholds of the sleep gate in place of the human amount (E2f).' },
      { k: 'light', x: L, y: y(1), w: LW, h: 72, t: 'Light at the eyes', s: 'sun · cloud · canopy', st: 'inp', ps: ['skyLuxSun', 'skyLuxNight'],
        text: 'Open-sky light from the sun\'s height under the day\'s cloud, times the share that reaches the animal\'s height in the canopy (E2c sky model, E2a canopy).' },
      { k: 'company', x: L, y: y(2), w: LW, h: 72, t: 'Company of nest-mates', s: 'nestCompany · nestAudience', st: 'des', ps: ['joinBase', 'joinBondW'],
        text: 'Staying in its own nest keeps the company of nest-mates (the join terms, design), and a departure is noticed by awake animals in their nests (E2e). Recorded alone; on the stack as part of the E2f package.' },
      { k: 'dark', x: L, y: y(4), w: LW, h: 72, t: 'Darkness slows and blinds', s: 'walkDarkPace · sight acuity', st: 'inp', ps: ['walkDarkPace', 'sightAcuityHalfTd', 'sightAcuityExp'],
        text: 'In poor light walking is slower (0.92 of daylight speed, measured in people) and food is found by sight, so feeding pays less before dawn (E2c). A null alone; on the stack as part of the E2f package.' },
    ],
    edges: [
      { f: 'press', t: 'gate', kind: 'main' }, { f: 'gate', t: 'value', kind: 'main' }, { f: 'value', t: 'build', kind: 'main' },
      { f: 'build', t: 'bout', kind: 'main' }, { f: 'bout', t: 'night', kind: 'main' },
      { f: 'amount', t: 'gate', fs: 'r', ts: 'l', fo: 0, to: -20, mx: 256, kind: 'side' }, { f: 'light', t: 'gate', fo: 0, to: 0, kind: 'side' },
      { f: 'company', t: 'value', kind: 'side' }, { f: 'dark', t: 'bout', kind: 'side' },
    ],
    notes: [
      'Nesting at dusk and an active day of 11 h 22 min emerge with no clock (<a href="staging/e2a-prereg.md">e2a-prereg.md</a>).',
      'Still wrong by its one-site row: on S6 the observer scores 77% of departures before sunrise, against 18% for five Taï mothers in fruit-scarce periods. E2h found that row scored differently from the field, and that on S3 the real miss was nursing mothers leaving about an hour early, hungry and thirsty (<a href="staging/e2h-prereg.md">e2h-prereg.md</a>, <a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'rest', cap: 'From heat to rest and shelter', nav: 'Rest and heat', title: 'Rest and heat',
    take: 'The midday rest clock is gone. Rest and shelter follow a heat balance, which at Kibale\'s temperatures stores almost no heat.',
    desc: 'Flowchart of resting and sheltering on the candidate stack: weather and exertion feed a heat balance that sets the value of rest and of shelter.',
    w: 832, h: 328,
    nodes: [
      { k: 'wx', x: L, y: y(0), w: LW, h: 72, t: 'Weather and exertion', s: 'air · sun · rain · work', st: 'inp', ps: ['tempBaseC', 'tempDiurnalC', 'tempRainC'],
        text: 'Air temperature, sun, cloud and rain (assumed physics values), and the animal\'s own work walking and climbing.' },
      { k: 'heat', x: S, y: y(0), w: SW, h: 72, t: 'Heat balance', s: 'stored heat or heat debt', st: 'des', ps: ['rhythmRmrW', 'rhythmCondW', 'rhythmVaso', 'rhythmEvapW'],
        text: 'Heat made by the body and its work, plus sun on the coat, against what it can lose to the air (more with a wet coat). A surplus is stored; a shortfall is a debt (E2a). Assumed physiology values, classed design.' },
      { k: 'rest', x: S, y: y(1), w: SW, h: 72, t: 'What resting is worth', s: '11:30–14:30 bonus switched out', ids: ['lit:middayRest'],
        before: 'Rest scored +0.3 between 11:30 and 14:30, by the clock (and +0.1 above 23 °C).',
        now: 'Rest gains 1.6 × stored heat, the same weight as hunger (design). No hour enters.' },
      { k: 'bout', x: S, y: y(2), w: SW, h: 72, t: 'Rest bouts', s: 'boutRestMidday*', ids: ['boutRestMiddayMin', 'boutRestMiddayMax', 'lit:middayBout'],
        before: 'Between 11:30 and 14:30 rest bouts lasted 15–30 minutes instead of the usual range.',
        now: 'The usual rest bout at any hour (E2a).' },
      { k: 'shelter', x: R, y: y(1), w: RW, h: 72, t: 'What shelter is worth', s: 'heat debt in rain', st: 'des', ps: ['rhythmThermW'],
        text: 'While it rains, shelter is offered to an animal in heat debt, worth 1.6 × the debt (E2a). It replaced a design rule, not a counted prescription.' },
    ],
    edges: [
      { f: 'wx', t: 'heat', kind: 'side' }, { f: 'heat', t: 'rest', kind: 'main' }, { f: 'rest', t: 'bout', kind: 'main' },
      { f: 'heat', t: 'shelter', fs: 'r', ts: 't', kind: 'main' },
    ],
    notes: [
      'Midday rest does not emerge: the heat balance stores almost no heat at Kibale\'s temperatures, so midday rest fell from 54% to 22%, and hot, mild and rainy days do not differ (<a href="staging/e2a-prereg.md">e2a-prereg.md</a>). It is not a digestive pause in the model either (<a href="staging/e1b-prereg.md">e1b-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'nursing', cap: 'From milk to weaning', nav: 'Nursing and weaning', title: 'Nursing and weaning',
    take: 'Mothers pay for the milk their infants drink and decide, by their own deficit, when to let them suckle: the weaning roll is gone. Milk now falls with the infant\'s age, but weaning itself does not emerge; its age is still drawn.',
    desc: 'Flowchart of nursing and weaning on the candidate stack: the mother pays for milk, nursing bouts are valued by the milk they deliver, the mother lets a bout run by comparing her deficit with her infant\'s, and weaning age is drawn; an E1o arm outside the stack would count milk at what the gland gives.',
    w: 832, h: 424,
    nodes: [
      { k: 'milk', x: S, y: y(0), w: SW, h: 72, t: 'Mothers pay for milk', s: 'lactation and pregnancy timers out', ids: ['hungerLactationPerH', 'hungerPregnancyPerH'],
        before: 'Mothers got extra hunger on timers: +0.012 per hour while lactating and +0.008 while pregnant.',
        now: 'The ledger charges a mother for the milk her infant drinks, up to a human-scaled yield, and for gestation (E1).' },
      { k: 'bout', x: S, y: y(1), w: SW, h: 72, t: 'What a nursing bout is worth', s: 'ledgerNurseBout', st: 'des', ps: ['ledgerLetDownS', 'ledgerMilkYieldCoef'],
        text: 'A bout is worth the share of a full suckling rate it delivers over its time, including the wait for milk to flow (54 s, a human value). Infants also suckle in the mother\'s nest at night (E1c, E1f). Design terms replaced design terms; no prescription.' },
      { k: 'refuse', x: S, y: y(2), w: SW, h: 72, t: 'The mother decides', s: 'weaning roll switched out', ids: ['weanRefuseMaxP'],
        before: 'From 3.2 years of the infant\'s age the mother refused a bout by a roll whose chance rose over 1.8 years to 0.8 (weanRefuseAgeY, weanRefuseRampY, design). No field study measures refusal by infant age (E1n\'s audit).',
        now: 'She lets a bout start and go on while her infant\'s reserve deficit, relative to its store, is at least her own, and while she sleeps her last decision stands (E1n\'s decision, E1o\'s currency). On S6 milk at 1–2, 2–3 and 3–4 years falls to 238, 198 and 190 kcal a day (cap 307).' },
      { k: 'wean', x: S, y: y(3), w: SW, h: 72, t: 'Weaning age', s: 'drawn between 4.1 and 5.2 y', st: 'inp', ps: ['weanAgeMinY', 'weanAgeSpanY'],
        text: 'Each infant\'s weaning age is drawn between 4.1 and 5.2 years. Classed input by the ledger, although the weaned-age target (T-INF-3) is built in while these values set it (E1n\'s audit). Nothing in the model drives milk to zero before it (E1o).' },
      { k: 'size', x: L, y: y(1), w: LW, h: 72, t: 'Infant intake by size', s: 'ledgerInfantIntake', st: 'des', ps: ['ledgerMassBirthKg'],
        text: 'An infant eats solid food at a rate scaled by its body size (E1c), in place of a self-feeding ramp and an under-5 factor (both design).' },
      { k: 'grow', x: L, y: y(2), w: LW, h: 72, t: 'Growth potential', s: 'captive growth rates', st: 'inp', ps: ['ledgerGrowFirstYearKg', 'ledgerGrowFemaleKgPerY', 'ledgerGrowMaleKgPerY'],
        text: 'Growth follows captive rates, limited by condition and paid only from a surplus (E1c, E1f). It is part of what an infant needs, so part of what a bout is worth to it.' },
      { k: 'e1oA', x: R, y: y(0), w: RW, h: 88, t: 'Milk counted at what\nthe gland gives (E1o, A)', s: 'milkInDrive', st: 'lay',
        layer: { tag: 'DEFECT FIX', sw: ['milkInDrive'], stage: 'E1o' },
        text: 'An unweaned infant\'s hunger counted milk at the full suckling rate all day; with the switch it counts what its mother\'s gland holds and will make. Infants then sit at their set point and drink the same: a defect fix, null for the milk volume. Not tested together with arm B.' },
      { k: 'e1oB', x: R, y: y(2), w: RW, h: 88, t: 'Her deficit against\nher infant\'s (E1o)', s: 'weanDeficit', st: 'des', sw: ['weanDeficit'],
        text: 'The currency of the mother\'s decision: her reserve deficit against her infant\'s, each relative to its store (equal weights, from equal relatedness; design), and a refusal that stands while she sleeps. With E1n\'s decision alone, her hunger against the infant\'s own-food drive, refused day milk was drunk at night and milk stayed at the cap.' },
    ],
    edges: [
      { f: 'milk', t: 'bout', kind: 'main' }, { f: 'bout', t: 'refuse', kind: 'main' }, { f: 'refuse', t: 'wean', kind: 'main' },
      { f: 'size', t: 'bout', kind: 'side' }, { f: 'grow', t: 'bout', fs: 'r', ts: 'l', to: 20, mx: 256, kind: 'side' },
      { f: 'e1oA', t: 'bout', fs: 'l', ts: 'r', kind: 'lay' },
      { f: 'e1oB', t: 'refuse', fs: 'l', ts: 'r', fo: -8, to: 0, kind: 'side' },
    ],
    notes: [
      'On S6 milk at 1–2, 2–3 and 3–4 years falls to 238, 198 and 190 kcal a day (cap 307), nursing mothers lose 0.125% of their store a day instead of 0.244, and their balance improves as the infant grows (−79, −65, −43 kcal a day) (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>, S6).',
      'The cost: infants now carry part of the deficit. Their reserves fall 0.11–0.15% of the store a day while they still grow at the captive rate (3.6 kg a year against about 1.6 at Gombe); no infant died in 90 days (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>, <a href="staging/e1o-prereg.md">e1o-prereg.md §5</a>).',
      'Open: nothing drives milk to zero before the drawn weaning age (<a href="staging/e1o-prereg.md">e1o-prereg.md §5</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'grooming', cap: 'From social need to grooming and play', nav: 'Grooming and play', title: 'Grooming and play',
    take: 'Grooming and play are valued by state, but the social need they serve, which party cohesion now reads too, still runs on fixed timers.',
    desc: 'Flowchart of grooming and play: a timer-driven social need feeds the value of grooming and of play; rough play is a dice roll.',
    w: 832, h: 328,
    nodes: [
      { k: 'need', x: S, y: y(0), w: SW, h: 72, t: 'Social need', s: 'socialAwakePerH · socialSleepPerH', ids: ['socialAwakePerH', 'socialSleepPerH'],
        text: 'Loneliness rises on fixed timers, 0.035 per hour awake and 0.01 asleep; grooming, play and nursing restore it. The ledger ties it to the grooming-share target (T-ACT-3). Since S5 it also scales what a companion\'s company is worth (E5a).' },
      { k: 'groom', x: S, y: y(1), w: SW, h: 72, t: 'What grooming is worth', s: 'need · bond · kin · reciprocity', st: 'des',
        text: 'Need, bond, kinship, reciprocity, rank and an invitation, less tension, distance, hunger, rain and night: score weights written in the code (design, not counted).' },
      { k: 'play', x: R, y: y(1), w: RW, h: 72, t: 'What play is worth', s: 'playfulness · energy · age', st: 'des',
        text: 'Playfulness, energy, youth and an invitation, less distance, hunger, rain and night (design).' },
      { k: 'rough', x: R, y: y(2), w: RW, h: 72, t: 'Play turns rough', s: 'roughPlayP', ids: ['roughPlayP'],
        text: 'A play bout with a partner more than 2 years younger turns rough with probability 0.0015 every 15 seconds.' },
      { k: 'dyad', x: L, y: y(1), w: LW, h: 88, t: 'Mother and infant:\nthe groomer\'s own need', s: 'groomNeedDyad', st: 'lay',
        layer: { tag: 'RECORDED', sw: ['groomNeedDyad'], stage: 'E1k' },
        text: 'Between a mother and her unweaned infant, the groomer\'s own need would weight every social term. It cut the mother–infant grooming loop from 33% to 11% of daylight but removes no prescription.' },
    ],
    edges: [
      { f: 'need', t: 'groom', kind: 'main' }, { f: 'need', t: 'play', fs: 'r', ts: 't', kind: 'main' }, { f: 'play', t: 'rough', kind: 'main' },
      { f: 'dyad', t: 'groom', fs: 'r', ts: 'l', fo: -8, to: 0, kind: 'lay' },
    ],
    notes: [
      'On S6 the grooming row is in its band (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>). The need it serves is the next timer to replace.',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'party', cap: 'From a departure to travelling together', nav: 'Following and joining', title: 'Party following and joining',
    take: 'The six weights fitted to party size are gone: a companion\'s company is now worth what the animal\'s own social need makes it (E5a), with E4g\'s fix for following carers and E5b\'s margin for approaches to callers. Still fitted: how far a call is worth walking, and when a leaver tries again.',
    desc: 'Flowchart of party cohesion on the candidate stack: a companion sets off; its company, scaled by the animal\'s social need, values following, joining or going to a caller in place of six fitted weights; a care-follow fix and a company margin are part of the stack; a distance scale and departure retries remain prescribed.',
    w: 832, h: 424,
    nodes: [
      { k: 'carer', x: L, y: y(0), w: LW, h: 88, t: 'A care follow is not\na departure (E4g)', s: 'followCarer', st: 'des', sw: ['followCarer'],
        text: 'Fixes a defect: adults followed a youngster that was only keeping up with its mother, so the companions of every mother–offspring unit trailed its foraging moves. Now a companion in a care follow is not counted as leaving; a carer who sets off herself is followed as before. The six party weights had been fitted with the defect in place.' },
      { k: 'leave', x: S, y: y(0), w: SW, h: 72, t: 'A companion sets off', s: 'in sight · or heard hooing', st: 'des',
        text: 'A party member in sight travels or follows away, or a travel hoo is heard from one out of sight. A hoo gives every hearer a decision point.' },
      { k: 'who', x: S, y: y(1), w: SW, h: 72, t: 'What a companion offers', s: 'bond · ally · rank · sociability', st: 'des', ps: ['joinBase', 'joinBondW', 'joinAllyW', 'joinRankW', 'partyFollowSocialW'],
        text: 'The bond with the companion, an ally, a companion that dominates the animal, and the animal\'s own sociability: C13e\'s join terms (design). For a male, a fertile female also offers her mating value, the mate offer\'s own terms.' },
      { k: 'need', x: L, y: y(2), w: LW, h: 72, t: 'Social need', s: 'socialAwakePerH · …SleepPerH', ids: ['socialAwakePerH', 'socialSleepPerH'], see: 'grooming',
        text: 'What scales a companion\'s company is the social-need state, which still rises on fixed timers; grooming, play and nursing restore it.' },
      { k: 'value', x: S, y: y(2), w: SW, h: 72, t: 'Company valued by need', s: 'six party weights switched out', ids: ['partyFollowBase', 'partyFollowW', 'partyFollowMaleW', 'partyStayW', 'joinSocialW', 'joinHooW'],
        before: 'Following a companion who travels off scored 0.7 + 1.0 × bond, plus 0.4 toward an adult male; a trip that left companions cost 0.05 for each one in sight (up to 3); an unmet social need pulled 0.55 toward pant-hooting callers; a heard travel hoo added 0.094 to joining. Fitted to party size with travel share and day range in C5a (the hoo bonus to a recruitment rate in C13e), with the care-follow defect in place.',
        now: 'A companion\'s company is worth its join terms scaled by the animal\'s social need, plus a fertile female\'s mating value for a male. Following is worth that company, less rain and the walk; joining a leader\'s trip adds the food at its tree, shared with the feeders there; going to a caller adds what the caller\'s company brings beyond the best companion already present (E5b). Leaving costs nothing, and a hoo informs without adding value (E5a).' },
      { k: 'margin', x: R, y: y(2), w: RW, h: 88, t: 'An approach gains only\nthe company added (E5b)', s: 'companyMargin', st: 'des', sw: ['companyMargin'],
        text: 'Going to a heard caller gains only the company the caller adds over the best settled companion already present. Without it, half of the approaches started in company and barely relieved the need, and males walked 3.43 km a day (S4); with it, 2.73 km on S5.' },
      { k: 'go', x: S, y: y(3) + 16, w: SW, h: 72, t: 'Travel together', s: 'follow, join, or go to callers', st: 'des',
        text: 'Follow the companion, join its trip to its tree, or walk toward the callers. These options go to the choice.' },
      { k: 'retry', x: L, y: y(3) + 16, w: LW, h: 72, t: 'Departure attempts', s: 'retry 3.8 min · give up 13 min', ids: ['departRetryMin', 'departPersistMaxMin'],
        text: 'After a failed departure attempt the leaver waits 3.8 minutes before trying again and gives up after 13: field values of the behaviour from 9 observed re-launches.' },
      { k: 'callers', x: R, y: y(3) + 16, w: RW, h: 72, t: 'Walking to callers: distance', s: 'joinCallDistScaleM', ids: ['joinCallDistScaleM'],
        text: 'A walk toward pant-hooting callers loses 1 point per 1,500 m (fitted in C5a against travel share and day range).' },
    ],
    edges: [
      { f: 'carer', t: 'leave', fs: 'r', ts: 'l', fo: -8, to: 0, kind: 'side' },
      { f: 'leave', t: 'who', kind: 'main' }, { f: 'who', t: 'value', kind: 'main' }, { f: 'value', t: 'go', kind: 'main' },
      { f: 'need', t: 'value', fs: 'r', ts: 'l', kind: 'side' }, { f: 'margin', t: 'value', fs: 'l', ts: 'r', fo: -8, to: 0, kind: 'side' },
      { f: 'retry', t: 'go', fs: 'r', ts: 'l', kind: 'side' }, { f: 'callers', t: 'go', fs: 'l', ts: 'r', kind: 'side' },
    ],
    notes: [
      'On S6 parties average 3.31 animals (band 3–9), males walk 2.68 km a day (S3 2.93, S4 3.43, S5 2.73), and the travel share is inside its band, males near its edge (0.24 and 0.21 against 0.12–0.25) (<a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
      'E5a passed on five seeds on the reference stack (prescriptions 103 → 97, sums inside noise). On the integrated stack without E5b\'s margin it added half a kilometre of walking a day (<a href="staging/e5a-prereg.md">e5a-prereg.md</a>, <a href="staging/e5b-prereg.md">e5b-prereg.md §8</a>).',
      'Open: party size does not track crop size, the party-size band (3–9) has no recorded derivation, and the same margin for following and joined trips is untested (<a href="staging/e5a-prereg.md">e5a-prereg.md §7</a>, <a href="staging/e5b-prereg.md">e5b-prereg.md §8</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'calls', cap: 'One value behind six kinds of call, and what listeners do', nav: 'Calls', title: 'Calls',
    take: 'Six call rules that were hazards, coins, quotas or clock windows are now one value comparison, and since S5 what a listener does with a call is valued by company too. Greetings, the sound of calls and how far a call is worth walking are still prescribed.',
    desc: 'Diagram of calls on the candidate stack: one call value (gain to listeners against cost to the caller) drives six call types that were prescribed before; listeners join after a hoo and go to callers by the company they gain; a greeting quota, call acoustics and the distance scale of walks to callers remain prescribed.',
    w: 832, h: 648,
    zones: [{ x: 16, y: 312, w: 800, h: 136, label: 'Listeners' }, { x: 16, y: 472, w: 800, h: 160, label: 'Outside the call value' }],
    nodes: [
      { k: 'value', x: S, y: y(1), w: SW, h: 88, t: 'A call is worth what\nlisteners learn, net', s: 'gain to allies − cost to caller', st: 'des', ps: ['callFixH', 'callSuppressW'],
        text: 'A call is a decision with a gain and a cost, read from the caller\'s own perception and memory (E4c). Gain: out-of-sight allies learn where it is, or companions notice a departure or food. Cost: neighbours hear it, and at food the share of its own meal it loses if listeners come. The exchange rates are design.' },
      { k: 'travel', x: R, y: y(0), w: RW, h: 72, t: 'Travel pant-hoots', s: 'travelCallPerH · travelCallGapH', ids: ['travelCallPerH', 'travelCallGapH'],
        before: 'Travelling adult males pant-hooted at 3 per travel-hour, at most once per 0.1 h: a hazard derived from the call-rate target\'s own source (T-COM-1, T-COM-4).',
        now: 'A pant-hoot is given when its value is positive: it grows with the caller\'s social need, the share of its allies it has not located, and how stale its last call is.' },
      { k: 'contact', x: R, y: y(1), w: RW, h: 72, t: 'Contact pant-hoots', s: 'contactCallGapH', ids: ['contactCallGapH'],
        before: 'With fewer than 2 community members in sight, a contact pant-hoot at most once per 0.75 h.',
        now: 'No quota: how stale its own last pant-hoot is (time since it, or distance moved since) enters the value.' },
      { k: 'chorus', x: R, y: y(2), w: RW, h: 72, t: 'Dawn and dusk choruses', s: '06:24–07:24 · 18:00–19:00', ids: ['lit:chorus'],
        before: 'Chorus pant-hoots were offered only between 06:24 and 07:24 and between 18:00 and 19:00 (clock windows in the code).',
        now: 'A pant-hoot follows its value at any hour.' },
      { k: 'fig', x: L, y: y(0), w: LW, h: 72, t: 'Arrival call at figs', s: '50% coin', ids: ['lit:figCoin'],
        before: 'Arriving at a rich fig, a 50% coin decided an arrival pant-hoot.',
        now: 'The arrival pant-hoot is weighed on arrival in a crown and given when its value is positive.' },
      { k: 'grunt', x: L, y: y(1), w: LW, h: 72, t: 'Food grunts', s: 'foodCallBase · foodCall*', ids: ['foodCallBase', 'foodCallCropW', 'foodCallMaleW', 'foodCallPartnerW'],
        before: 'On arriving in a crown with a crop above 0.3, a grunt with probability 0.35 + 0.3 × (crop − 0.3) + 0.05 per adult male in sight (up to 3) + 0.15 with a close partner or the alpha in sight.',
        now: 'Given when the bond with companions within earshot not yet feeding there outweighs the share of its own meal it would lose to them.' },
      { k: 'hoo', x: L, y: y(2), w: LW, h: 72, t: 'Travel hoos', s: 'travelHooP · travelHooAllyP', ids: ['travelHooP', 'travelHooAllyP'],
        before: 'A leaver gave a travel hoo with probability 0.554, or 0.756 with an ally in sight: the source\'s own rates.',
        now: 'Given when the bond with companions who would not notice a silent departure outweighs the share of the meal it would lose to them at the destination.' },
      { k: 'hooJoin', x: 48, y: 352, w: 232, h: 72, t: 'Joining after a hoo', s: 'joinHooW', ids: ['joinHooW'], see: 'party',
        before: 'A heard travel hoo added 0.094 to the value of joining the leader\'s trip: the one value fitted in C13e, so that 71.4% of hooed departures recruit a companion within 5 minutes.',
        now: 'The hoo gives every hearer a decision point and adds no value: joining is worth the leader\'s company and the food at its tree, shared with the feeders there (E5a).' },
      { k: 'approach', x: 300, y: 352, w: 232, h: 72, t: 'Going to callers', s: 'joinSocialW', ids: ['joinSocialW'], see: 'party',
        before: 'An unmet social need pulled 0.55 × (1 − social) toward pant-hooting community members, in full with fewer than 2 companions in sight and 0.4 of it otherwise (tuned in C5a to party size, travel share and day range).',
        now: 'The call\'s own pull, plus the caller\'s company scaled by the listener\'s social need, counting only what the caller adds to the best companion already present (E5a, E5b).' },
      { k: 'dist', x: 552, y: 352, w: 232, h: 72, t: 'Walking to callers: distance', s: 'joinCallDistScaleM', ids: ['joinCallDistScaleM'], see: 'party',
        text: 'A walk toward callers loses 1 point per 1,500 m (fitted in C5a against travel share and day range).' },
      { k: 'greet', x: 64, y: 520, w: 280, h: 72, t: 'Greeting quota', s: 'pantGruntRepeatH', ids: ['pantGruntRepeatH'],
        text: 'A subordinate pant-grunts to the same dominant at most once per 8 hours.' },
      { k: 'sound', x: 488, y: 520, w: 280, h: 88, t: 'How calls sound', s: 'drumHits* · drumIntervalMs\nsigIdentitySD · sigCommunitySD', ids: ['drumHitsMedian', 'drumHitsSigma', 'drumIntervalMs', 'sigIdentitySD', 'sigCommunitySD'],
        text: 'Drumming bouts (median 4 hits, 229 ms apart) and pant-hoot voice signatures set so recordings are told apart as in the field (T-COM-5, T-COM-6). They shape what listeners can tell apart, not when anyone calls.' },
    ],
    edges: [
      { f: 'value', t: 'travel', fs: 'r', ts: 'l', fo: -24, kind: 'main' }, { f: 'value', t: 'contact', fs: 'r', ts: 'l', fo: 0, to: 0, kind: 'main' },
      { f: 'value', t: 'chorus', fs: 'r', ts: 'l', fo: 24, kind: 'main' },
      { f: 'value', t: 'fig', fs: 'l', ts: 'r', fo: -24, kind: 'main' }, { f: 'value', t: 'grunt', fs: 'l', ts: 'r', fo: 0, kind: 'main' },
      { f: 'value', t: 'hoo', fs: 'l', ts: 'r', fo: 24, kind: 'main' },
      { f: 'hoo', t: 'hooJoin', fs: 'b', ts: 't', my: 296, kind: 'side' },
      { f: 'value', t: 'approach', fs: 'b', ts: 't', fo: 12, kind: 'side', l: 'heard', lx: 416, ly: 296 },
      { f: 'dist', t: 'approach', fs: 'l', ts: 'r', kind: 'side' },
    ],
    notes: [
      'On 5 seeds adult males call 0.59 times an hour (field 0.5–1.5) and arrival calls sit in the field\'s range; 11 prescriptions fewer (<a href="staging/e4c-prereg.md">e4c-prereg.md §10</a>).',
      'Where calls meet company: on S4 males walked 3.43 km a day against 2.93 on S3, mostly approaches to callers valued in full even by animals already in company; with E5b\'s margin, 2.73 on S5 (<a href="staging/e5b-prereg.md">e5b-prereg.md §8</a>, <a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
      'Cost carried forward: calls have no daily course (morning ÷ afternoon 1.02 against about 4.3 in the field) (<a href="staging/e4c-prereg.md">e4c-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'aggression', cap: 'From internal states to how a contest ends', nav: 'Aggression and displays', title: 'Aggression and displays',
    take: 'Hormone-like states now open escalated attacks, redirected aggression and rain displays. How a fight turns out is still dice.',
    desc: 'Flowchart of aggression on the candidate stack: slow and fast hormone-like states open escalation, redirection and rain displays; contests resolve with prescribed dice, allies join by dice.',
    w: 832, h: 424,
    nodes: [
      { k: 'slow', x: L, y: y(0), w: LW, h: 72, t: 'Slow hormone-like states', s: 'stress · arousal · affiliation', ids: ['stressRelaxPerH'],
        before: 'Stress relaxed toward its floor at 0.25 per hour.',
        now: 'Three leaky states, updated every 5 minutes from what the animal perceives and kicked by events: stress (cortisol-like), competitive arousal (testosterone-like, adult males) and affiliation (oxytocin-like), which speeds recovery from stress (E4a).' },
      { k: 'rhythm', x: L, y: y(1), w: LW, h: 72, t: 'Sleep-gated rhythm (E4d)', s: 'endoRhythm', st: 'lay', layer: { tag: 'RECORDED', sw: ['endoRhythm'], stage: 'E4d' },
        text: 'Would make both slow states peak at waking and fall through the day from each animal\'s own sleep. Recorded and off: it removes no prescription, and morning escalations rose beyond noise.' },
      { k: 'fast', x: L, y: y(3) + 16, w: LW, h: 72, t: 'Fast arousal', s: 'minutes · storms and threats', st: 'des', ps: ['endoFastTauMin'],
        text: 'A fast state with a time constant of minutes, kicked by a storm\'s onset or a threat (E4b).' },
      { k: 'charge', x: S, y: y(0), w: SW, h: 72, t: 'Charges offered', s: 'rivalry · food · immigrants', st: 'des',
        text: 'Status rivalry, competition at food, coercion, newcomers and defence of kin open charges, scored by design weights.' },
      { k: 'esc', x: S, y: y(1), w: SW, h: 72, t: 'Escalated attack', s: 'escalation dice switched out', ids: ['escalateImpulseBase', 'escalateImpulseAggr'],
        before: 'A roll at each perception of a close-ranked rival (0.002 + 0.006 × aggression, 0.2–0.8%) opened an attack scored a constant 1.25.',
        now: 'Offered whenever its old preconditions hold and the attacker has cooled down; scored from arousal (E4a).' },
      { k: 'redir', x: S, y: y(2), w: SW, h: 72, t: 'Redirected aggression', s: 'redirect dice switched out', ids: ['redirectBaseP', 'redirectAggrP'],
        before: 'After a loss, a roll of 0.08 + 0.15 × aggression primed a redirected charge for 6 minutes.',
        now: 'Open after every loss for one stress time constant, scored from the stress state (E4a).' },
      { k: 'rain', x: S, y: y(3) + 16, w: SW, h: 72, t: 'Rain display', s: 'rainDisplayP', ids: ['rainDisplayP'],
        before: 'At a storm\'s onset 12% of adult males drew a display impulse, scored a constant 1.5.',
        now: 'Scored from the fast arousal state at the storm\'s onset; no roll. Displays are now 2–5 times the old rate, and no field rate exists to judge it (E4b).' },
      { k: 'quota', x: R, y: y(0), w: RW, h: 72, t: 'Charge quotas', s: 'two quotas of 0.75 h', ids: ['feedChargeGapH', 'immigrantChargeGapH'],
        text: 'At most one supplant at food, and one charge at a newly arrived female, per 0.75 h.' },
      { k: 'dice', x: R, y: y(1) + 16, w: RW, h: 104, t: 'How a contest ends', s: 'escalationBaseP · …EvenP\nhitP · seriousInjuryP', ids: ['escalationBaseP', 'escalationEvenP', 'hitP', 'seriousInjuryP'],
        text: 'Two animals charging each other come to contact with probability 0.08 + 0.3 × evenness⁴; a target that gives way is hit with probability 0.12; a wound is serious with probability 0.05.' },
      { k: 'allies', x: R, y: y(3) + 16, w: RW, h: 72, t: 'Allies join', s: 'coalitionBondP · …StrangerP', ids: ['coalitionBondP', 'coalitionStrangerP'],
        text: 'A bonded bystander is alerted to join with probability 0.5 × its bond, or 0.8 against a stranger.' },
    ],
    edges: [
      { f: 'slow', t: 'esc', fs: 'r', ts: 'l', fo: -8, to: 0, mx: 256, kind: 'side' }, { f: 'slow', t: 'redir', fs: 'r', ts: 'l', fo: 12, to: 0, mx: 244, kind: 'side' },
      { f: 'rhythm', t: 'slow', fs: 't', ts: 'b', kind: 'lay' },
      { f: 'fast', t: 'rain', kind: 'side' },
      { f: 'quota', t: 'charge', fs: 'l', ts: 'r', fo: -12, to: -12, kind: 'side' },
      { f: 'charge', t: 'dice', fs: 'r', ts: 'l', fo: 12, to: -40, mx: 544, kind: 'main' },
      { f: 'esc', t: 'dice', fs: 'r', ts: 'l', fo: 0, to: -4, mx: 556, kind: 'main' },
      { f: 'redir', t: 'dice', fs: 'r', ts: 'l', fo: 0, to: 20, mx: 556, kind: 'main' },
      { f: 'allies', t: 'dice', fs: 't', ts: 'b', kind: 'side' },
    ],
    notes: [
      'Slow states keep the acts rare and well-timed: redirects come within a minute of the defeat and stay at 2–4% of decided conflicts (<a href="staging/e4a-prereg.md">e4a-prereg.md</a>).',
      'Open: slow states cannot carry acute reactions, hence the fast state; the calling–testosterone link still fails because calls have no daily course (<a href="staging/e4b-prereg.md">e4b-prereg.md</a>, <a href="staging/e4d-prereg.md">e4d-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'hunting', cap: 'From a colobus encounter to meat', nav: 'Hunting', title: 'Hunting',
    take: 'Hunting is still prescribed from the gap between hunts to how a hunt ends. A candidate that values a hunt as food is held off.',
    desc: 'Flowchart of hunting: a colobus encounter in company, the community gap, a hand-set lead value, a success curve and meat eaten per hour; the held-off E4e would value the hunt as food.',
    w: 832, h: 520,
    nodes: [
      { k: 'meet', x: S, y: y(0), w: SW, h: 72, t: 'Colobus met in company', s: 'encounter impulse', st: 'des', ps: ['huntEncMinMales'],
        text: 'Meeting a colobus group with at least 2 adult males of its own in view sets a hunt impulse at perception (the hunting fix). In the field profile no hunting-day lottery is drawn.' },
      { k: 'gap', x: S, y: y(1), w: SW, h: 72, t: 'Gap since the last hunt', s: 'huntGapH 6 h', ids: ['huntGapH'],
        text: 'A community hunts at most once per 6 hours. On the stack it was the only brake on hunting (E4e diagnosis).' },
      { k: 'lead', x: S, y: y(2), w: SW, h: 72, t: 'What leading a hunt is worth', s: 'hand-set weights', st: 'des',
        text: '0.5, plus 0.15 per adult male above 3, plus skill and boldness, less distance: weights written in the code (design, not counted).' },
      { k: 'end', x: S, y: y(3), w: SW, h: 88, t: 'How a hunt ends', s: 'huntSuccessMax · huntSuccessRate\nhuntExtraKillP', ids: ['huntSuccessMax', 'huntSuccessRate', 'huntExtraKillP'],
        text: 'Success = 0.8 × (1 − e^(−0.3 × (hunters − 1))), a design curve (field 53–82%). Each other hunter makes a capture of his own with probability 0.17, derived from Ngogo\'s kills per successful hunt.' },
      { k: 'meat', x: S, y: y(4) + 16, w: SW, h: 72, t: 'Meat eaten per hour', s: 'meatEatPerH', ids: ['meatEatPerH'],
        text: '0.35 units of meat eaten per hour: a timer-style rate the ledger ties to the feeding-share target (T-ACT-1).' },
      { k: 'prey', x: L, y: y(0), w: LW, h: 72, t: 'Colobus density', s: 'preyKanyawara', st: 'des', ps: ['colobusDensityKanyawaraPerKm2'],
        text: 'Kanyawara\'s density, 2.22 groups per km², in place of Ngogo\'s before its decline (E4f). A secondary value; recorded and off alone, on the stack as a site-matched input.' },
      { k: 'e4e', x: L, y: y(1) + 24, w: LW, h: 104, t: 'A hunt valued as food\n(E4e)', s: 'huntValue', st: 'lay', layer: { tag: 'HELD OFF', sw: ['huntValue'], stage: 'E4e' },
        text: 'The lead would be offered when a capture can be expected and scored like a crown trip delivering the same energy per hour: no community gap, no hand-set value. It passes the keep rule but is held off: its gain on the hunting-rate target is two errors cancelling (encounters too frequent, too few hunts per encounter).' },
    ],
    edges: [
      { f: 'meet', t: 'gap', kind: 'main' }, { f: 'gap', t: 'lead', kind: 'main' }, { f: 'lead', t: 'end', kind: 'main' }, { f: 'end', t: 'meat', kind: 'main' },
      { f: 'prey', t: 'meet', kind: 'side' },
      { f: 'e4e', t: 'gap', fs: 'r', ts: 'l', fo: -24, kind: 'lay' },
      { f: 'e4e', t: 'lead', fs: 'r', ts: 'l', fo: 24, kind: 'lay' },
    ],
    notes: [
      'On S6 the model hunts 31.0 times per community-year against a band of 5–25, which was never scaled to the model\'s 3–7 males (a 4–11 band is staged, not applied) (<a href="staging/e4e-prereg.md">e4e-prereg.md</a>, <a href="staging/e-stack2-confirm.md">e-stack2-confirm.md</a>).',
      'The observer meets colobus 2.7 times as often per follow-hour as at Kanyawara, mostly a scoring difference (<a href="staging/e4f-prereg.md">e4f-prereg.md</a>).',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'patrols', cap: 'From the patrol window to the release display', nav: 'Patrols and neighbours', title: 'Patrols and neighbours',
    take: 'Patrolling is fully prescribed: a clock window, a fitted hazard, joining scores, route odds and a release display.',
    desc: 'Flowchart of border patrols: a start window and an hourly hazard raise a patrol; joining scores, route odds, length and listening stops, then a release display.',
    w: 832, h: 520, dx: -192,
    nodes: [
      { k: 'window', x: S, y: y(0), w: SW, h: 72, t: 'Patrol window', s: 'patrolStartH · patrolEndH', ids: ['patrolStartH', 'patrolEndH'],
        text: 'A patrol can start only between 08:00 and 15:30 (a design window, unverified).' },
      { k: 'hazard', x: S, y: y(1), w: SW, h: 72, t: 'Patrol hazard', s: 'patrolH0 · patrolMaleOddsRatio', ids: ['patrolH0', 'patrolMaleOddsRatio'],
        text: 'An hourly hazard per adult male, 0.0183, refitted in C14 to a patrol rate, times 1.17 for each extra male (the source\'s own odds ratio), rolled at perception.' },
      { k: 'join', x: S, y: y(2), w: SW, h: 88, t: 'Who joins', s: 'patrolFemaleJoin · …FemaleStay\npatrolLactatingJoin', ids: ['patrolFemaleJoin', 'patrolFemaleStay', 'patrolLactatingJoin'],
        text: 'Males join on a design score. Females score 0.2 to join and 0.3 less to keep going; nursing mothers score −1 to join: Ngogo-like site values of the behaviour (T-PAT-3).' },
      { k: 'route', x: S, y: y(3) + 16, w: SW, h: 88, t: 'The patrol', s: 'patrolIncursionP · patrolMaxH\npatrolStopEveryMin', ids: ['patrolIncursionP', 'patrolMaxH', 'patrolStopEveryMin'],
        text: '40% of patrols push into the neighbours\' range; a patrol lasts at most 6 hours; the leader stops to listen every 15 minutes of travel.' },
      { k: 'release', x: S, y: y(4) + 32, w: SW, h: 72, t: 'Release display', s: 'patrolRelease(Contact)P', ids: ['patrolReleaseP', 'patrolReleaseContactP'],
        text: 'Back home, a chorus with drumming and a display follows with probability 0.5, or 1 after contact with neighbours.' },
      { k: 'strangers', x: R, y: y(1), w: RW, h: 88, t: 'Strangers seen or heard', s: 'own males ≥ 3 and ≥ theirs + 2', st: 'des',
        text: 'Charge or approach with at least 3 of its own males and 2 more than the strangers, otherwise flee. A written rule designed from a playback study (T-IGE-4); the ledger\'s lint does not count it.' },
    ],
    edges: [
      { f: 'window', t: 'hazard', kind: 'main' }, { f: 'hazard', t: 'join', kind: 'main' }, { f: 'join', t: 'route', kind: 'main' }, { f: 'route', t: 'release', kind: 'main' },
      { f: 'strangers', t: 'route', fs: 'b', ts: 'r', kind: 'side', l: 'on contact', lx: 704, ly: 372 },
    ],
    notes: [
      'All <span data-n="dom.patrols.rem">12</span> patrol entries are still in use on <span data-n="stack">S5</span>. Lethal attacks during contact are in the next section.',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'lethal', cap: 'Two chains of lethal aggression', nav: 'Lethal aggression', title: 'Gang attacks and infanticide',
    take: 'Killing is entirely dice: impulses rolled at perception and kill probabilities at the attack.',
    desc: 'Two chains of lethal aggression: a gang attack on an isolated stranger and infanticide, each an impulse rolled at perception followed by kill dice.',
    w: 832, h: 328,
    nodes: [
      { k: 'iso', x: L + 64, y: y(0), w: SW, h: 72, t: 'An isolated stranger', s: 'own males in view', st: 'des',
        text: 'A stranger seen alone while the animal\'s own males in view outnumber the strangers.' },
      { k: 'gang', x: L + 64, y: y(1), w: SW, h: 88, t: 'Gang-attack impulse', s: 'gangImpulseP · gangMinOwnMales\ngangRollGapH · gangVictimGapH', ids: ['gangImpulseP', 'gangMinOwnMales', 'gangRollGapH', 'gangVictimGapH'],
        text: 'With at least 3 of its own males in view, at most one stranger male, and on patrol or at the range\'s edge: an impulse with probability 0.5, rolled at most once per 6 hours per male; a victim is not attacked again within 24 hours. The 3-male rule is partly designed from the field\'s numerical odds (T-LET-3).' },
      { k: 'kill', x: L + 64, y: y(2) + 16, w: SW, h: 88, t: 'Kill dice', s: 'gangKillMalePerAttacker · …MaleMax\ngangKillInfantP · gangKillOtherP', ids: ['gangKillMalePerAttacker', 'gangKillMaleMax', 'gangKillInfantP', 'gangKillOtherP'],
        text: 'With 3 or more attackers, a male victim of 10 or over dies with probability 0.12 per attacker beyond two, up to 0.45; an infant under 5 with 0.3; anyone else with 0.03.' },
      { k: 'inf', x: R - 64, y: y(0), w: SW, h: 72, t: 'A stranger\'s infant, or a new alpha', s: 'infants not sired', st: 'des',
        text: 'A stranger\'s infant while own males outnumber the strangers, or, for a new alpha, infants he did not sire.' },
      { k: 'impulse', x: R - 64, y: y(1), w: SW, h: 88, t: 'Infanticide impulse', s: 'infanticideStrangerP\ninfanticideNewAlphaP', ids: ['infanticideStrangerP', 'infanticideNewAlphaP'],
        text: 'An impulse at each perception with probability 0.004 toward a stranger\'s infant, or 0.0005 for a new alpha.' },
      { k: 'outcome', x: R - 64, y: y(2) + 16, w: SW, h: 88, t: 'Defence and kill', s: 'infanticideKillP · defence roll', ids: ['infanticideKillP', 'lit:defend'],
        text: 'A mother within 3 m defends with probability 0.35 × her strength ratio, plus 0.2 per helper; an undefended attack kills with probability 0.7.' },
    ],
    edges: [
      { f: 'iso', t: 'gang', kind: 'main' }, { f: 'gang', t: 'kill', kind: 'main' },
      { f: 'inf', t: 'impulse', kind: 'main' }, { f: 'impulse', t: 'outcome', kind: 'main' },
    ],
    notes: [
      'These dice build in the lethal-attack rate target (T-LET-1), as the ledger records.',
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'mating', cap: 'From a fertile female to leaving home', nav: 'Mating and dispersal', title: 'Mating and dispersal',
    take: 'Mating and leaving the natal community run on a quota, a clock hour, a hazard and a probability.',
    desc: 'Flowchart of mating and dispersal: reproductive physiology makes fertile females; a mating quota, a consortship hour, a transfer hazard and a disperser share remain prescribed.',
    w: 832, h: 328,
    nodes: [
      { k: 'cycle', x: L, y: y(0), w: LW, h: 72, t: 'Cycles and swellings', s: 'reproductive physiology', st: 'inp', ps: ['cycleLenMinDays', 'gestationMinDays', 'fecundityMax'],
        text: 'Cycle length, gestation and fecundity by age: life-history inputs.' },
      { k: 'fertile', x: S, y: y(0), w: SW, h: 72, t: 'A fertile female in reach', s: 'swelling ≥ 0.75', st: 'des',
        text: 'Males value mating by her swelling, their age and rank (design weights).' },
      { k: 'mate', x: S, y: y(1), w: SW, h: 72, t: 'Mating quota', s: 'mateIntervalH 1.5 h', ids: ['mateIntervalH'],
        text: 'A male mates at most once per 1.5 hours.' },
      { k: 'consort', x: R, y: y(1), w: RW, h: 72, t: 'Consortships before 16:00', s: 'consortLatestHour', ids: ['consortLatestHour'],
        text: 'A consortship can start only before 16:00.' },
      { k: 'transfer', x: S, y: y(2), w: SW, h: 72, t: 'Leaving the natal community', s: 'dispersalHazardPerY · disperserP', ids: ['dispersalHazardPerY', 'disperserP'],
        text: '87% of females are dispersers; while swollen at dispersal age, a transfer impulse arises at 3 per year.' },
    ],
    edges: [
      { f: 'cycle', t: 'fertile', kind: 'side' }, { f: 'fertile', t: 'mate', kind: 'main' }, { f: 'fertile', t: 'consort', fs: 'r', ts: 't', kind: 'main' },
      { f: 'cycle', t: 'transfer', fs: 'b', ts: 'l', kind: 'side' },
    ],
  },
  // ---------------------------------------------------------------------------------------------------------------
  {
    key: 'life', cap: 'From a death to what follows it', nav: 'Life, death and care', title: 'Life, death and care',
    take: 'Outside any choice, death and what follows it still run on fitted rates and set probabilities.',
    desc: 'Diagram of deaths and their consequences: baseline mortality, epidemics and snares lead to deaths; adoption, carrying a dead infant, bereavement and guardianship follow.',
    w: 832, h: 424,
    nodes: [
      { k: 'base', x: L, y: y(0), w: LW, h: 72, t: 'Baseline mortality', s: 'life table by age and sex', st: 'inp', ps: ['hazardInfant', 'hazardFemaleAdult', 'hazardMalePrime'],
        text: 'Death rates by age and sex from the life table (inputs).' },
      { k: 'epi', x: L, y: y(1), w: LW, h: 88, t: 'Epidemics', s: 'epidemicArrivalPerY\n…BetaPerH · …Fatality', ids: ['epidemicArrivalPerY', 'epidemicBetaPerH', 'epidemicFatality'],
        text: 'Outbreaks arrive 0.1 times per community-year, spread at 0.03 per infectious party companion per hour, and kill 7% of cases aged 5–29 (more of the young and old): fitted to the field\'s epidemic and outbreak rows (T-DEM-5, T-DEM-6).' },
      { k: 'snare', x: L, y: y(2) + 16, w: LW, h: 72, t: 'Snare injuries', s: 'snareHazardPerKm', ids: ['snareHazardPerKm'],
        text: 'Injuries per km walked on the ground at full risk, fitted to the share of animals injured (T-DEM-9).' },
      { k: 'death', x: S, y: y(1), w: SW, h: 72, t: 'A death', s: 'mother, infant or adult', st: 'des',
        text: 'Whatever the cause, a death changes the lives of kin.' },
      { k: 'adopt', x: R, y: y(0), w: RW, h: 88, t: 'Orphans adopted', s: 'adoptSiblingP · adoptOtherP · …', ids: ['adoptSiblingP', 'adoptSiblingInfantP', 'adoptOtherP', 'adoptSiblingMinAgeY', 'adoptOtherMinAgeY'],
        text: 'An older maternal sibling adopts with probability 0.6 (0.15 for orphans under 3); failing that, a bonded non-sibling adopts an orphan of 3 or over with probability 0.3. Adopters are at least 8 (siblings) and 12 (others).' },
      { k: 'carry', x: R, y: y(1) + 16, w: RW, h: 72, t: 'Carrying a dead infant', s: 'carryDeadP', ids: ['carryDeadP'],
        text: 'A mother carries her dead infant (under 3) for days with probability 0.35.' },
      { k: 'bereave', x: R, y: y(2) + 16, w: RW, h: 72, t: 'Bereavement', s: 'bereaveHalfLifeD · bereaveMaxAgeY', ids: ['bereaveHalfLifeD', 'bereaveMaxAgeY'],
        text: 'Offspring under 12 in her community get bereavement stress when their mother dies, halving every 180 days: designed from the bereavement target\'s own source (T-DEM-18).' },
      { k: 'guard', x: R, y: y(3) + 16, w: RW, h: 72, t: 'Guardianship ends at 12', s: 'guardMaxAgeY', ids: ['guardMaxAgeY'],
        text: 'From 12, a ward is no longer protected by a guardian: a field value (social independence at Taï).' },
    ],
    edges: [
      { f: 'base', t: 'death', fs: 'r', ts: 'l', to: -16, mx: 252, kind: 'side' }, { f: 'epi', t: 'death', fs: 'r', ts: 'l', to: 8, kind: 'side' },
      { f: 'snare', t: 'death', fs: 'r', ts: 'l', to: 24, mx: 264, kind: 'side' },
      { f: 'death', t: 'adopt', fs: 'r', ts: 'l', fo: -24, mx: 540, kind: 'main' }, { f: 'death', t: 'carry', fs: 'r', ts: 'l', fo: -8, mx: 576, kind: 'main' },
      { f: 'death', t: 'bereave', fs: 'r', ts: 'l', fo: 8, mx: 564, kind: 'main' }, { f: 'death', t: 'guard', fs: 'r', ts: 'l', fo: 24, mx: 552, kind: 'main' },
    ],
  },
];

/** Domains for the counts: every counted entry of today's model belongs to exactly one. The order is the page's. */
export const DOMAINS: { key: string; title: string; ids: string[] }[] = [
  { key: 'choice', title: 'The choice itself', ids: ['rgTemperature', 'rgMaxAgeH', 'continueBonus', 'finishedPenalty'] },
  { key: 'feeding', title: 'Feeding and foraging', ids: ['hungerAwakePerH', 'hungerRunPerH', 'hungerSleepPerH', 'fruitHungerFactor', 'fallbackHungerPerH', 'ledgerWildCostMult', 'forageDistScaleM', 'memTravelHungerW', 'fallbackForageW', 'walkMps', 'fruitIntakePerH'] },
  { key: 'drinking', title: 'Drinking', ids: ['thirstAwakePerH', 'thirstSleepPerH', 'thirstHotPerH', 'fruitThirstFactor', 'drinkDistScaleM', 'drinkThirstPerH'] },
  { key: 'sleep', title: 'Sleep and the nest', ids: ['energySleepPerH', 'energyRestPerH', 'energyRunPerH', 'energyWalkPerH', 'energyOtherPerH', 'nestEveningFromH', 'nestEveningStartH', 'nestEveningEndH', 'nestEveningDrive', 'nestNightBonus', 'nestMorningDrive', 'lit:nestGate', 'nestWakeHour', 'boutNestMorningMin', 'boutNestMorningMax', 'lit:morningNest', 'lit:nightMenu', 'lit:duskMenu'] },
  { key: 'rest', title: 'Rest and heat', ids: ['lit:middayRest', 'boutRestMiddayMin', 'boutRestMiddayMax', 'lit:middayBout'] },
  { key: 'nursing', title: 'Nursing and weaning', ids: ['hungerLactationPerH', 'hungerPregnancyPerH', 'weanRefuseMaxP'] },
  { key: 'grooming', title: 'Grooming and play', ids: ['socialAwakePerH', 'socialSleepPerH', 'roughPlayP'] },
  { key: 'party', title: 'Party following and joining', ids: ['partyFollowBase', 'partyFollowW', 'partyFollowMaleW', 'partyStayW', 'joinSocialW', 'joinHooW', 'joinCallDistScaleM', 'departRetryMin', 'departPersistMaxMin'] },
  { key: 'calls', title: 'Calls', ids: ['travelCallPerH', 'travelCallGapH', 'contactCallGapH', 'lit:chorus', 'lit:figCoin', 'foodCallBase', 'foodCallCropW', 'foodCallMaleW', 'foodCallPartnerW', 'travelHooP', 'travelHooAllyP', 'pantGruntRepeatH', 'drumHitsMedian', 'drumHitsSigma', 'drumIntervalMs', 'sigIdentitySD', 'sigCommunitySD'] },
  { key: 'aggression', title: 'Aggression and displays', ids: ['stressRelaxPerH', 'escalateImpulseBase', 'escalateImpulseAggr', 'redirectBaseP', 'redirectAggrP', 'rainDisplayP', 'feedChargeGapH', 'immigrantChargeGapH', 'escalationBaseP', 'escalationEvenP', 'hitP', 'seriousInjuryP', 'coalitionBondP', 'coalitionStrangerP'] },
  { key: 'hunting', title: 'Hunting', ids: ['huntGapH', 'huntSuccessMax', 'huntSuccessRate', 'huntExtraKillP', 'meatEatPerH'] },
  { key: 'patrols', title: 'Patrols and neighbours', ids: ['patrolStartH', 'patrolEndH', 'patrolH0', 'patrolMaleOddsRatio', 'patrolFemaleJoin', 'patrolFemaleStay', 'patrolLactatingJoin', 'patrolIncursionP', 'patrolMaxH', 'patrolStopEveryMin', 'patrolReleaseP', 'patrolReleaseContactP'] },
  { key: 'lethal', title: 'Gang attacks and infanticide', ids: ['gangImpulseP', 'gangMinOwnMales', 'gangRollGapH', 'gangVictimGapH', 'gangKillMalePerAttacker', 'gangKillMaleMax', 'gangKillInfantP', 'gangKillOtherP', 'infanticideStrangerP', 'infanticideNewAlphaP', 'infanticideKillP', 'lit:defend'] },
  { key: 'mating', title: 'Mating and dispersal', ids: ['mateIntervalH', 'consortLatestHour', 'dispersalHazardPerY', 'disperserP'] },
  { key: 'life', title: 'Life, death and care', ids: ['epidemicArrivalPerY', 'epidemicBetaPerH', 'epidemicFatality', 'snareHazardPerKm', 'adoptSiblingP', 'adoptSiblingInfantP', 'adoptOtherP', 'adoptSiblingMinAgeY', 'adoptOtherMinAgeY', 'carryDeadP', 'bereaveHalfLifeD', 'bereaveMaxAgeY', 'guardMaxAgeY'] },
];

/** The overview: one decision, its steps and the body states (titles and plain-English lines). */
export const OVERVIEW = {
  w: 832, h: 504,
  desc: 'Map of one decision: perception, six body states, options and their values, the choice, the act and the world, each marked by how many prescriptions still act there and how many the candidate stack replaced.',
  steps: {
    perceive: { x: 16, y: 176, w: 136, h: 120, t: 'Perceive', s: 'sight, hearing,\nmemory', text: 'Only what is in sight or earshot, and what the animal remembers. Some impulses are still rolled here.' },
    options: { x: 392, y: 176, w: 136, h: 120, t: 'Options', s: 'what each act\nis worth', text: 'Code lists every legal act and scores it from the body states, perception and memory.' },
    choice: { x: 552, y: 176, w: 120, h: 120, t: 'Choice', s: 'gate, menu,\none draw', text: 'The intention gate, a short menu and one weighted draw (see the choice itself).' },
    act: { x: 696, y: 176, w: 120, h: 120, t: 'Act', s: 'bouts and\ndice', text: 'The act runs tick by tick; some outcomes are dice.' },
    world: { x: 392, y: 352, w: 424, h: 96, t: 'The world changes', s: 'bodies, bonds, ranks, deaths', text: 'Everyone nearby is affected. Deaths, disease, adoption and dispersal happen outside any choice.' },
  },
  body: {
    zone: { x: 176, y: 16, w: 184, h: 456, label: 'Body state' },
    nodes: {
      'body:energy': { x: 188, y: 48, w: 160, h: 56, t: 'Energy and gut', s: '' },
      'body:water': { x: 188, y: 116, w: 160, h: 56, t: 'Water', s: '' },
      'body:sleep': { x: 188, y: 184, w: 160, h: 56, t: 'Sleep and the clock', s: '' },
      'body:heat': { x: 188, y: 252, w: 160, h: 56, t: 'Heat', s: 'replaced midday clock' },
      'body:endo': { x: 188, y: 320, w: 160, h: 56, t: 'Hormone-like states', s: '' },
      'body:social': { x: 188, y: 388, w: 160, h: 56, t: 'Social need', s: '' },
    } as Record<string, { x: number; y: number; w: number; h: number; t: string; s: string }>,
    text: {
      'body:energy': 'Hunger from an energy balance in kcal and a gut in dry matter (E1, E1b, E1e, E1h, E1i).',
      'body:water': 'Thirst from a water balance in mL (E2g).',
      'body:sleep': 'Sleep pressure, a circadian sleep gate and light (E2a, E2d, E2f).',
      'body:heat': 'A heat balance; at Kibale it stores almost no heat (E2a). The midday rest clock it replaced acted on options and bouts.',
      'body:endo': 'Slow stress, arousal and affiliation states, and a fast arousal state (E4a, E4b).',
      'body:social': 'Loneliness still rises on fixed timers. Since S5 it also scales what a companion\'s company is worth (E5a).',
    } as Record<string, string>,
  },
};
