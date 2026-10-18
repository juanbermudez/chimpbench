import type { Kind } from './decide/facts';
import type { Vec3 } from 'math';

// Shared plain-data contract between the simulation, the decision loop, the
// renderer and the UI. Simulation code is the only writer of World state;
// the renderer and UI only read it. Times are ecological hours since the run
// started (world.time) unless a field says otherwise.

// ---------------------------------------------------------------------------
// Behavior
// ---------------------------------------------------------------------------

/** Behavioral state of one individual. Every value has a renderer pose. */
export type Action =
  | 'rest' | 'forage' | 'drink' | 'travel' | 'groom' | 'play' | 'follow' | 'climb'
  | 'patrol' | 'display' | 'flee' | 'hunt' | 'mate' | 'nurse' | 'dead'
  | 'nest'        // build or occupy a night nest in a tree crown
  | 'pant-grunt'  // submissive greeting toward a higher-ranking community member
  | 'charge'      // agonistic charging display aimed at one target, usually non-contact
  | 'attack'      // contact aggression: hit, bite, stamp, grapple
  | 'submit'      // crouch, scream or present after being threatened
  | 'reconcile'   // post-conflict affiliative contact with a former opponent
  | 'console'     // bystander affiliation toward a recent victim
  | 'share'       // share or tolerate taking of meat
  | 'beg'         // beg for meat from a possessor
  | 'guard'       // mate-guard a maximally swollen female
  | 'consort'     // travel away from the party as a consort pair
  | 'shelter'     // hunched sitting out heavy rain
  | 'call'        // pant-hoot chorus and buttress drumming
  | 'transfer'    // adolescent female emigrating to a neighboring community
  | 'alarm';      // alarm call or mob a snake or other threat

export type LifeStage = 'infant' | 'juvenile' | 'adolescent' | 'adult' | 'elder';
export type Skill = 'climbing' | 'foraging' | 'hunting' | 'social';
export type Sex = 'female' | 'male';
export type Mood = 'calm' | 'excited' | 'fearful' | 'aggressive' | 'playful' | 'distressed';
export type CallKind = 'pant-hoot' | 'pant-grunt' | 'scream' | 'food-grunt' | 'bark' | 'alarm-hoo' | 'drum' | 'whimper' | 'laugh'
  | 'travel-hoo' // C10: quiet hoo that recruits companions to a trip (gruberZuberbuhler2013)
  | 'cough'; // C8: coughing while ill in a respiratory outbreak (clinical signs that identify outbreaks: negrey2019, emeryThompson2018)
export type DecisionSource = 'rules' | 'decide';

export interface Candidate {
  action: Action; targetId: number; score: number; reason: string;
  /**
   * Optional (stage M1, `observeState` 1; docs/staging/em-prereg.md): what Track E's valuation gives this option, as the
   * animal can know it. Set only on the copies observe() returns; the simulation's own candidate lists never carry it.
   */
  value?: OptionValue;
  /**
   * Optional (stage R8, `observeV5` 1; docs/staging/r8-prereg.md §2): what the option is in the animal's own terms, so a
   * label can be written without the rules' reason sentence. Set only on the copies observe() returns.
   */
  about?: OptionAbout;
}
/** Eight-point compass word (stage R8). */
export type Compass = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';
/**
 * Stage R8: which physical form of an act an option (or the act in progress) is, where the act has several. A form says
 * what is done and where, never why. travel: 'tree' (to a tree), 'joined' (a companion's trip to a tree), 'caller'
 * (toward a caller), 'home' (back toward the middle of the range). forage: 'tree', 'leaves'. nest: 'mother', 'stay'
 * (in its own finished nest), 'build'. follow: 'ride' (carried), 'body-take', 'body-look'. groom: 'body'. flee: 'avoid'
 * (keep away), 'snake', 'calls' (stranger calls heard). patrol: 'approach' (stranger calls), 'lead', 'join', 'continue'.
 * hunt: 'join'. consort, transfer: 'continue'. beg, share: 'plant' (fruit, not meat).
 */
export type ActForm = 'tree' | 'leaves' | 'joined' | 'caller' | 'home' | 'mother' | 'stay' | 'build' | 'ride' | 'body-take' | 'body-look' | 'body'
  | 'avoid' | 'snake' | 'calls' | 'approach' | 'lead' | 'join' | 'continue' | 'plant';
/** Stage R8 (`observeV5` 1): an option, or the act in progress, in the animal's own terms. Every field optional. */
export interface OptionAbout {
  form?: ActForm;
  /** The species of the tree the act is in or goes to (a tree the animal sees, remembers or knows from its community's list). */
  place?: string;
  /** A companion the act involves besides its target, by name: the leader of a joined trip (seen leaving), the caller walked toward (heard). */
  with?: string;
  /** Distance (m) and compass direction to the act's place, when it has one that is not an animal on the nearby list. */
  distM?: number; dir?: Compass;
}
/** Stage M1: an option's Track E values (OptionValue on Candidate). Every field optional; finite numbers only. */
export interface OptionValue {
  /** Net energy rate the option promises, kcal per hour, the walk and the climb included (feeding, trips to food). */
  kcalH?: number;
  /** Ripe fruit in the crown at the crop the option is valued at, kcal (drupe-equivalent, as the valuation counts it). */
  cropKcal?: number;
  /** Hours since the animal last saw that crown: 0 in view now, -1 never seen itself (the community's expectation). */
  seenH?: number;
  /** Others it counts feeding or going there. */
  feeders?: number;
  /** Distance to the option's place, m. */
  distM?: number;
  /** The company the move adds (stage E5a's company value, with E5b's or E5d's margin when on), in score units. */
  company?: number;
  // Stage R2 (`observeV4` 1; docs/staging/r2-prereg.md §1 A): the belief behind the option, where the rules use one.
  /** `kcalH` as a share of the animal's own full ripe-fruit rate (`BodyPercept.fullKcalH`). */
  share?: number;
  /** A listed crown valued from the community's list alone: the chance it is in fruit, 0..1 (tripBeliefs bit 4). */
  chance?: number;
  /** A crown out of sight: one standard deviation of the animal's belief about its crop, kcal (0: just seen). */
  spreadKcal?: number;
  /**
   * What the option's rules value changes by (score units) if the crown holds less / more than believed: bare / in fruit
   * with `chance`; the crop one `spreadKcal` below / above otherwise. Only where the rules sample the belief
   * (choiceBelief); for a kernel, never rendered as text.
   */
  swingLow?: number; swingHigh?: number;
  /** Answering an aggressor of its own community (submit, flee, counter-charge): the chance of winning the valuation assesses, 0..1 (contestAssess). */
  odds?: number;
}
/**
 * Stage M1 (`observeState` 1): the focal animal's Track E state as it feels it. A field is present only while the
 * mechanism that keeps the state runs (its switch is on and the animal's books are open); finite numbers only.
 */
export interface BodyPercept {
  /** Body reserves relative to the usual store: -1 the store is gone, 0 the set point, + a surplus (energyLedger). */
  reserves?: number;
  /** Energy-deficit drive 0..1: the energy still needed before the next chance to feed over what the waking time left can supply (ledgerDrive). */
  deficit?: number;
  /** That need, kcal (negative: a surplus over the horizon). */
  needKcal?: number;
  /** Waking hours left, as sleep pressure implies them (rhythmSleep; never the hour). */
  awakeH?: number;
  /** Foregut fill 0..1. */
  gutFill?: number;
  /** Sleep pressure (process S) 0..1 and felt sleepiness 0..1 (rhythmSleep). */
  sleepPressure?: number; sleepiness?: number;
  /** The circadian oscillator's level (high = alert) and whether it is rising (rhythmCircadian). */
  clock?: number; clockRising?: boolean;
  /** Body water deficit, % of body mass (waterLedger). */
  waterDeficitPct?: number;
  /** Thermal load -1..1: + stored heat, - heat debt (rhythmHeat). */
  heat?: number;
  /** Stress load (cortisol-like; the focal's stress), competitive arousal (adult males), affiliation (endoStates), fast arousal now (endoFast); 0..1. */
  stress?: number; arousal?: number; affiliation?: number; acute?: number;
  // Stage R2 (`observeV4` 1; docs/staging/r2-prereg.md §1 A)
  /** Hindgut fibre against its capacity, 0..1; a full hindgut holds the foregut full (ledgerDigesta). */
  hindFill?: number;
  /** The drive every feeding option is multiplied by (candidates.ts crownDrive: 1.6 × hunger + 0.1), under forageRate. */
  feedDrive?: number;
  /** The animal's own full ripe-fruit rate, kcal per hour: the scale of every option's `kcalH` (forageRate). */
  fullKcalH?: number;
}
export interface Memory { entityId: number; kind: 'chimp' | 'tree' | 'water' | 'prey'; seenAt: number; position: Vec3; }
/** A short first-person episodic memory used for decision context and the inspector. */
export interface Episode { time: number; text: string; kind: SimEventKind; otherId: number; }

/**
 * One individual's social tallies with one partner over a digest period, from the owner's point of view.
 * Zero fields are omitted. Threats are displays and charges (non-contact); attacks are contact aggression.
 */
export interface PartnerTally {
  /** Hours of grooming given to / received from the partner. */
  groomGiven?: number; groomReceived?: number;
  /** Coalition support given to / received from the partner. */
  supportGiven?: number; supportReceived?: number;
  threatsGiven?: number; threatsReceived?: number; attacksGiven?: number; attacksReceived?: number;
  reconciliations?: number; consoledThem?: number; consoledMe?: number;
  matings?: number; meatGiven?: number; meatReceived?: number;
}
export type DigestEventKind = 'birth' | 'death' | 'rank' | 'alpha' | 'transfer' | 'injury' | 'intergroup' | 'infanticide';
/** A notable life event kept in a memory digest. otherId is the other individual involved, or -1. */
export interface DigestEvent { time: number; kind: DigestEventKind; text: string; otherId: number; }
/**
 * A compressed stretch of one individual's social memory (sim-owned). Periods follow ecological time: a month is
 * 30 ecological days, a year 12 such months. In life-course mode (ageRate 365) one month spans ~30 biological years.
 */
export interface MemoryDigest {
  period: 'month' | 'year';
  /** world.time (ecological hours) covered, from inclusive to exclusive. */
  from: number; to: number;
  /** Age in years at the end of the period. */
  age: number;
  /** Most salient partners: up to 10 per month, up to 5 per year. */
  partners: Record<number, PartnerTally>;
  /** Sums over every partner, including those trimmed from `partners`. */
  totals: PartnerTally;
  /** Intergroup encounters (seen or heard) during the period. */
  encounters: number;
  /** Notable events, most important first: up to 8 per month, up to 5 per year. */
  events: DigestEvent[];
  /** One compact plain-language line, e.g. "Days 1-30: groomed most with Mbelo (4.1 h); attacked by Kato 2×". */
  text: string;
}
/** A's relationship with b, from a's point of view (see relationshipOf in src/simulation.ts). */
export interface Relationship {
  /** Relationship value, 0..1 (grooming, support, kinship). */
  bond: number;
  /** Tension, 0..1: recent aggression not yet repaired (roughly the inverse of compatibility). */
  tension: number;
  lastIncident: { time: number; kind: 'threat' | 'attack'; direction: 'given' | 'received' } | null;
  /** Tension at which b counts as a rival in this world (registry value, honours overrides). */
  rivalAt: number;
  /** Tallies with b this month so far, and over the remembered past year (this month plus kept monthly digests). */
  counts: { month: PartnerTally; year: PartnerTally };
}
/** Stable individual differences, 0..1. Loosely after chimpanzee personality research; illustrative. */
export interface Personality { boldness: number; sociability: number; aggression: number; playfulness: number; }
/** Stable appearance seeds, 0..1. The renderer derives age-dependent looks (face darkening, graying). */
export interface Appearance { fur: number; face: number; build: number; brow: number; ears: number; }

export interface Chimp {
  id: number; name: string; troopId: number; natalTroopId: number; sex: Sex; age: number; stage: LifeStage;
  position: Vec3; heading: number; action: Action; targetId: number; actionTime: number;
  hunger: number; thirst: number; energy: number; social: number; stress: number; health: number;
  /** Legacy 0..1 standing; kept in sync with rankOrder for older code paths. */
  rank: number;
  /** Dominance Elo score within the current community (progressive Elo rating). */
  elo: number;
  /** 1 = top of own community's sex-specific hierarchy; 0 = not ranked (immature). */
  rankOrder: number;
  motherId: number;
  /** Genetic sire, -1 when unknown (founders). Chimpanzees themselves do not track paternity. */
  fatherId: number;
  birthTime: number; deathTime: number | null; causeOfDeath: string | null;
  skills: Record<Skill, number>; bonds: Record<number, number>;
  personality: Personality; appearance: Appearance;
  memory: Memory[]; episodes: Episode[]; candidates: Candidate[]; reason: string;
  decisionSource: DecisionSource; decisionVersion: number; nextDecision: number;
  /** Who picks this chimp's next action at decision points. */
  controller: 'rules' | 'model';
  /** world.time when a model-controlled chimp reached a decision point and began waiting; null if not waiting. */
  awaitingDecisionSince: number | null;
  /**
   * False after death; the record stays in World.chimps for genealogy. After 30 ecological days dead (or one
   * biological year dead) the sim slims it: memory, episodes, candidates, bonds and allies become empty, digests and
   * hidden state are removed, and final numbers are rounded. Identity, parents, birth, death, cause, age, stage,
   * rank, appearance and position remain.
   */
  alive: boolean; pregnancy: number; cooldown: number;
  /** 0..1 wound severity from aggression or falls. Slows movement and heals over days. */
  injury: number;
  /** 0..1 anogenital swelling for cycling females; 1 is maximal tumescence. Always 0 for males. */
  swelling: number;
  /** Day within the ovarian cycle, or -1 when not cycling (immature, pregnant, lactational amenorrhea, male). */
  cycleDay: number;
  lactating: boolean;
  /** 0..1 abstract meat held after a successful hunt or share. */
  carryingMeat: number;
  nest: { treeId: number; position: Vec3 } | null;
  mood: Mood;
  /** Current vocalization for rendering and hearing; cleared after vocalUntil. */
  vocal: CallKind | null; vocalUntil: number;
  partyId: number;
  lastConflict: { opponentId: number; time: number; won: boolean } | null;
  /** Top coalition partners, highest support first. Derived from bonds and support history. */
  allies: number[];
  /**
   * Optional: id of a dead infant this mother is carrying (the sim records it at the infant's death and clears it
   * when she leaves the body, or dies). Absent or -1 when none. The renderer draws the body on her; its own
   * `position` stays where it died.
   */
  carryingDeadId?: number;
  /**
   * Optional, stage ED (`deadBody` 1; docs/staging/ed-prereg.md): what is left of a dead animal in the world. 'body'
   * while its body exists (lying at `position`, which the simulation moves while the body is held, or on its carrier:
   * see `carryingDeadId`), 'bones' after bodyFleshDays on the ground, absent once nothing is left or with the switch off.
   */
  remains?: 'body' | 'bones';
  /**
   * Optional: finalized memory digests, oldest first (sim-owned). Yearly digests are kept for life, monthly ones for
   * the last 12 months; the month in progress is not included (read it through relationshipOf).
   */
  digests?: MemoryDigest[];
  /** Optional, stage C8: true while a respiratory illness is under way (negrey2019, emeryThompson2018); the key is absent otherwise. */
  sick?: boolean;
  /** Optional, stage C8: true after a permanent snare injury (wood2017, emeryThompson2020), e.g. for a limp; the key is absent otherwise. */
  snared?: boolean;
}

// ---------------------------------------------------------------------------
// Groups, habitat and events
// ---------------------------------------------------------------------------

export interface Tree {
  id: number; species: string; common: string; position: Vec3; height: number; canopy: number; fruit: number; maxFruit: number;
  /**
   * Field profile (patch ecology) only: fruit eaten below the phenology crop and when ([deficit, eco-hour]); the
   * simulation reads the current crop lazily and refreshes `fruit` once a day for readers outside it. Absent otherwise.
   */
  depletion?: [number, number];
}
export interface Water { id: number; position: Vec3; radius: number; }
/**
 * The forest stream as a polyline (y = 0). Owned by the simulation so movement can keep
 * animals out of the channel; the renderer draws the river along exactly these points.
 * Water sites sit on its banks, not in the channel.
 */
export interface Stream {
  points: Vec3[]; halfWidth: number;
  /** Shallow fords or fallen-log bridges where animals may cross the channel. */
  crossings: Vec3[];
}

export interface AlphaTenure { id: number; from: number; to: number | null; how: string; }
/** A chimpanzee community (field term). The UI may also say "troop". */
export interface Troop {
  id: number; name: string; color: string; emblem: string; center: Vec3; radius: number;
  alphaId: number; alphaSince: number;
  /** Alive ids ordered top to bottom. Males include adolescents; females include adults. */
  maleHierarchy: number[]; femaleHierarchy: number[];
  alphaHistory: AlphaTenure[];
  /** Derived each tick: number of living adult males. */
  adultMales: number;
  /**
   * Stage C6: the community's used range, from its utilization distribution (updated daily). Cells of an n × n grid of
   * `cell` metres over the map (row-major, x east, z south): `cells` inside the 95% isopleth, `core` inside the 50%.
   * `center` and `radius` are the use-weighted centre and the equal-area radius of the same 95% isopleth.
   */
  range?: { cell: number; n: number; cells: number[]; core: number[] };
}

/** A temporary fission-fusion subgroup, derived from proximity within one community. */
export interface Party {
  id: number; troopId: number; members: number[]; center: Vec3;
  kind: 'foraging' | 'patrol' | 'hunting' | 'nesting' | 'consort' | 'social' | 'traveling';
  /**
   * Optional, patrols only (docs/realism-design.md §5.3.1 P4): the current leg. 'out' = silent single-file travel to the edge;
   * 'listen' = a listening stop; 'incursion' = inside a neighbour's range (slow, careful); 'return' = heading home.
   * Members are listed in file order (leader first) while a patrol travels.
   */
  patrolPhase?: 'out' | 'listen' | 'incursion' | 'return';
}

export type InteractionKind =
  | 'groom' | 'play' | 'display' | 'charge' | 'chase' | 'fight' | 'pant-grunt' | 'reconcile' | 'console'
  | 'mate' | 'share' | 'beg' | 'hunt' | 'kill' | 'patrol' | 'intergroup' | 'nurse' | 'guard' | 'consort'
  | 'alarm' | 'coalition' | 'infanticide' | 'transfer' | 'rain-display' | 'takeover'
  | 'gesture';     // C10b: an intentional gesture aimed at one recipient (the meaning is in Interaction.gesture)

/** An observable social episode for the renderer and the feed. Pruned soon after it ends. */
export interface Interaction {
  id: number; kind: InteractionKind; actorId: number; targetId: number; participants: number[];
  start: number; end: number | null; position: Vec3; intensity: number; troopId: number;
  /** Optional, kind 'gesture' only (stage C10b): the gesture's meaning, e.g. a request word from hobaiterByrne2014. */
  gesture?: string;
}

/** A vocalization or drum sequence. Others within radius can hear it. */
export interface Call {
  id: number; kind: CallKind; callerId: number; troopId: number; position: Vec3; time: number; radius: number;
  /**
   * Optional acoustic structure (stage C10). For 'pant-hoot': six standardized signature features of the caller.
   * For 'drum': inter-hit intervals in ms. Listeners, the field observer and audio read it; omitted when C10 is off.
   */
  features?: number[];
}

/** Abstract arboreal prey group (Ngogo chimpanzees mainly hunt red colobus). */
export interface PreyGroup { id: number; species: string; position: Vec3; heading: number; size: number; alert: number; }

export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm';
export interface Environment {
  weather: Weather;
  rain: number; cloud: number; wind: number; humidity: number;
  /** Air temperature in degrees Celsius. */
  temperature: number;
  /** world.time of the latest lightning strike, or -1. */
  lightningAt: number;
  season: 'wet' | 'dry';
  /** 1..365 calendar day. */
  dayOfYear: number;
  /** 0 at night, 1 in full daylight, smooth through dawn and dusk. */
  daylight: number;
  /** Sun elevation in radians; negative below the horizon. */
  sunAltitude: number;
  /** Sun azimuth in radians, 0 = north, clockwise. */
  sunAzimuth: number;
  /** 0 new moon .. 0.5 full .. 1 new. */
  moonPhase: number;
  /** Habitat-wide ripe fruit availability 0..1. */
  fruitIndex: number;
}

export type InterventionKind =
  | 'playback-stranger' // stranger pant-hoot playback (after Wilson, Hauser & Wrangham 2001)
  | 'snake-model'       // model snake near a party (after Crockford et al. 2012)
  | 'fig-mast'          // a large fig crop ripens at once
  | 'storm'             // force a heavy rainstorm now
  | 'drought'           // multi-day fruit scarcity
  | 'remove-alpha'      // the alpha disappears (instant)
  | 'colobus-troop';    // a red colobus group arrives near a party

/** An active external perturbation that perceiving chimps can respond to. */
export interface Stimulus { id: number; kind: InterventionKind; position: Vec3; radius: number; start: number; end: number; troopId: number; label: string; }

export type SimEventKind =
  | 'social' | 'food' | 'territory' | 'life' | 'system' | 'conflict' | 'play'
  | 'weather' | 'hierarchy' | 'model' | 'reproduction' | 'hunt';
export interface SimEvent {
  time: number; text: string; kind: SimEventKind;
  /** Involved individuals, focal first. */
  actors: number[];
  troopId: number;
  /** 0 routine, 1 notable, 2 major (injury, birth, takeover), 3 severe (killing, infanticide). */
  severity: number;
}

export interface WorldStats {
  births: number; deaths: number; conflicts: number; injuries: number; groomingBouts: number; playBouts: number;
  hunts: number; huntSuccesses: number; intergroupEncounters: number; killings: number; takeovers: number; transfers: number;
  reconciliations: number;
}

export interface ModelPolicy {
  /** off: rules decide for everyone. async: rules fill in when the model is late. lockstep: the clock waits for the model. */
  mode: 'off' | 'async' | 'lockstep';
  /** In async mode, ecological minutes a model-controlled chimp waits before rules decide. */
  asyncGraceMinutes: number;
}

export interface World {
  seed: number; time: number; day: number; hour: number; tick: number; size: number;
  chimps: Chimp[]; trees: Tree[]; troops: Troop[]; water: Water[]; events: SimEvent[];
  /** Optional until every world generator provides it; renderer falls back to its own river. */
  stream?: Stream;
  parties: Party[]; interactions: Interaction[]; calls: Call[]; prey: PreyGroup[]; stimuli: Stimulus[];
  environment: Environment;
  rng: number; nextId: number;
  /** Legacy counters mirrored in stats. */
  births: number; deaths: number;
  stats: WorldStats;
  ageRate: number;
  modelPolicy: ModelPolicy;
}

// ---------------------------------------------------------------------------
// Decision context: the external state passed to the decision model
// ---------------------------------------------------------------------------

export type Relation = 'mother' | 'offspring' | 'maternal-sibling' | 'ally' | 'rival' | 'community' | 'stranger';

export interface SocialPercept {
  id: number; name: string; relation: Relation; sex: Sex; ageYears: number; stage: LifeStage;
  /** Known only for own-community members; 0 for strangers or immatures. */
  rankOrder: number; isAlpha: boolean;
  bond: number; distance: number; action: Action;
  swelling: number; injured: boolean; hasMeat: boolean;
  /** Optional: the focal animal's tension toward this individual, 0..1 (own-community members only). */
  tension?: number;
  // Stage R8 (`observeV5` 1; docs/staging/r8-prereg.md §2): what the focal animal sees this individual doing, and its own timing with it
  /**
   * The compass direction it is going in, while its act is a movement (travel, follow, patrol, flee, transfer): on a trip
   * to a tree the way to that tree (its heading while it walks; a standing animal's heading says nothing of where it
   * is going), otherwise its heading once it has taken a step of the act.
   */
  dir?: Compass;
  /** With `dir`: true when its distance from the focal animal is growing (it is leaving). */
  away?: boolean;
  /** True when its act is aimed at the focal animal (it is grooming, following, charging … the focal). */
  toMe?: boolean;
  /** Hours since the focal animal last groomed it, was last groomed by it, and last greeted it (pant-grunt); each absent when it never did, or not within its record. */
  groomedH?: number; groomedByH?: number; greetedH?: number;
}

/** Stage R8: how an act came to its own end, as the animal can tell. */
export type EndWord = 'arrived' | 'crop-finished' | 'full' | 'drunk' | 'partner-left' | 'partner-gone' | 'caught-up' | 'lost' | 'rain-eased' | 'nobody-came' | 'over' | 'not-possible';
/** Stage R8: the drives of the packet's `feeling` line (fatigue is felt sleepiness under rhythmSleep). */
export type DriveName = 'hunger' | 'thirst' | 'fatigue' | 'loneliness' | 'fear';
/**
 * Stage R8 (`observeV5` 1; docs/staging/r8-prereg.md §2; src/sim/own.ts): the animal's own experience. Built from its
 * own body, perception, memory and the record the loop keeps for it (chimp.sim.own). No rate, score or ranking of an option.
 */
export interface OwnExperience {
  /**
   * What it is doing: the act, its partner by name (`who`), its place and form (`about`), the minutes in it, and, when
   * the act has just come to its own end (or can no longer go on) at the decision point now open, how (`ended`).
   */
  doing?: { action: Action; minutes: number; who?: string; about?: OptionAbout; ended?: EndWord };
  /**
   * Why it is being asked, only when that is something it perceived or felt; absent when a loop timer opened the
   * decision point and nothing it feels or sees changed. One of: `event` (the perception that interrupted it, in the
   * loop's own words); `ended` (its act came to its own end); or a change since it last chose: `felt` (a drive moved to
   * another word of the packet: `to` 0 none, 1 mild, 2 moderate, 3 strong, 4 severe; `up` grown or eased) and `light`
   * (the light passed into another phase).
   */
  asked?: { event?: string; ended?: EndWord; felt?: { drive: DriveName; to: number; up: boolean }[]; light?: 'dawn' | 'day' | 'dusk' | 'night' };
  /**
   * Its own foraging returns. `eating`: the amount eaten in the latest complete slow step (5 min) of this feeding bout
   * over the amount in its first step (present from two complete steps). `trips`: for its last closed trips to a crown,
   * oldest first, what it ate there over the meal it set out for (0..1). `crowns`: crowns fed in since it last left a nest.
   */
  lately?: { eating?: number; trips?: number[]; crowns?: number };
  /** Its last aggression given or received within its community: hours since, threat or attack, whether it received it, and the other's name. */
  aggression?: { hours: number; kind: 'threat' | 'attack'; received: boolean; name: string };
}

/**
 * Stage ED (`deadBody` 1): a body of the focal animal's own community that it sees. `relation` is to the animal it was;
 * `heldBy` is the id of the animal holding it (the focal's own id when it holds it), -1 when it lies on the ground.
 */
export interface BodySight { id: number; name: string; relation: Relation; ageYears: number; distance: number; deadHours: number; heldBy: number }

/**
 * Everything the model may know when choosing, built only from the focal
 * chimp's own perception, memory and body. No omniscient world state.
 */
export interface DecisionContext {
  /** R15: explicit two-call packet stage and serialized kinds, aligned with candidates. */
  resourceChoice?: 'kind' | 'target';
  resourceKinds?: Kind[];
  /**
   * Stage R12 build (menuPossible ≥ 1; docs/staging/r12-build-prereg.md §9): the contract of a context of the ruled menu,
   * on both calls. Absent at 0, so every R15 and R16 context is unchanged. With it a target context may also be of the
   * kinds greet_or_appease and groom (src/sim/context-check.ts).
   */
  menu?: 'menu-targets-v1';
  chimpId: number; version: number; time: number;
  focal: {
    name: string; ageYears: number; stage: LifeStage; sex: Sex; community: string;
    rankOrder: number; rankOf: number; isAlpha: boolean;
    hunger: number; thirst: number; energy: number; social: number; stress: number; health: number; injury: number;
    swelling: number; lactating: boolean; hasDependentInfant: boolean; carryingMeat: number;
    currentAction: Action; mood: Mood; personality: Personality; skills: Record<Skill, number>;
  };
  environment: {
    hour: number; phase: 'dawn' | 'day' | 'dusk' | 'night'; weather: Weather; rain: number; temperature: number;
    fruitNearby: number; partySize: number; partyAdultMales: number;
    nearTerritoryEdge: boolean; strangersSeen: number; strangersHeard: number;
  };
  /** At most 8 of the most relevant perceived individuals. */
  social: SocialPercept[];
  /** At most 5 recent episodic memories, newest first, plain words. */
  recent: string[];
  /** Perceived active interventions, plain words. */
  stimuli: string[];
  candidates: Candidate[];
  /**
   * Optional: at most 3 lines of longer-term social memory about individuals in `social`, plain words
   * (e.g. "This month: Kato attacked me 3×; Sanaki backed me twice"). Omitted when there is nothing relevant.
   */
  history?: string[];
  /** Optional (stage M1, `observeState` 1): the focal animal's Track E state (BodyPercept). */
  body?: BodyPercept;
  /**
   * Optional (stage M1, `observeState` 1): the light the animal sees, 0 dark … 1 full daylight (environment.daylight),
   * and its change per hour over the last tick. A packet built from a context with `light` shows it in place of the
   * clock hour (`environment.hour` stays for the inspector).
   */
  light?: { level: number; trend: number };
  /**
   * Optional: the packet version. 4 (stage R2, `observeV4` 1) = `body` and option `value`s carry the v4 fields and a text
   * builder uses the v4 wording (src/kernel/packet-words.ts). 5 (stage R8, `observeV5` 1) = the same plus `own`, the
   * percepts' own fields and each option's `about`; a text builder writes neutral option labels and none of the rules' wording.
   */
  packet?: 4 | 5;
  /** Optional (stage R8, `observeV5` 1): the animal's own experience (OwnExperience). */
  own?: OwnExperience;
  /**
   * Optional (stage ED, `deadBody` 1): at most 4 bodies in sight, the one the focal cared for first, then nearest first. A body may be the target of a `follow`
   * (walk up to it; its carer takes it up) or a `groom` option; it is never in `social`.
   */
  bodies?: BodySight[];
}

// ---------------------------------------------------------------------------
// Render contracts (no Three.js types here)
// ---------------------------------------------------------------------------

/**
 * 'fruit' (stage W7, the Food layer; stylizations and map overlays): fruiting crowns tinted toward their fruit colour,
 * fruit clusters kept readable from far, a mark per fruiting tree on the map, and the trees the selected animal remembers.
 */
export type Layer = 'canopy' | 'territory' | 'perception' | 'labels' | 'social' | 'weather' | 'fruit';
export type ViewMode = 'rts' | 'close' | 'cinematic';
export type Quality = 'low' | 'medium' | 'high';

export interface SceneFrame {
  /** Real seconds since the previous frame, 0 when paused. */
  dt: number;
  /** Visual animation clock in seconds. */
  elapsed: number;
  selectedId: number | null;
  /** Ecological seconds per real second actually achieved this frame. */
  simRate: number;
  highlightTroopId: number | null;
  /** Optional: fraction (0..1) of the next tick the clock has accrued; animals render between tick states. Default 0. */
  subTick?: number;
}

export interface SceneAPI {
  update(frame: SceneFrame): void;
  setView(mode: ViewMode): void;
  setLayer(layer: Layer, enabled: boolean): void;
  setQuality(quality: Quality): void;
  focusChimp(id: number): void;
  panTo(x: number, z: number): void;
  resetCamera(): void;
  getDiagnostics(): { drawCalls: number; triangles: number; points: number; fps: number };
  /** Current quality, which auto-downgrade may have lowered below the requested one. */
  getQuality?(): Quality;
  /** Screen pixels covered by UI panels, so framing and focus center on the visible 3D area. */
  setInsets?(insets: { left: number; right: number; top: number; bottom: number }): void;
  /**
   * Optional: where the audio listener stands (RTS convention: at the camera's focus point, 2 m above the ground,
   * facing the camera's heading), for panning and distance in src/audio. The returned object is reused; copy it to keep it.
   */
  getListener?(): ListenerPose;
  /**
   * Optional: the one zoom axis (docs/graphics-camera-plan.md §2.1). hf = frame height at the focus (m); band =
   * 'overview' (strategy view, Hf ≥ 60 m), 'strategy' (zoomed-in strategy view, canopy lens open) or 'field'
   * (perspective views); view = the camera's current view, which the wheel can change (zoom-through).
   */
  getZoom?(): { hf: number; band: 'overview' | 'strategy' | 'field'; view: ViewMode };
  /** Optional: cap the 3D view at 60 Hz on ≥ 100 Hz displays (default on; remembered per browser). */
  setFrameCap?(on: boolean): void;
  getFrameCap?(): boolean;
  dispose(): void;
}

export interface ListenerPose {
  /** World metres (+x east, −z north, y height). */
  x: number; y: number; z: number;
  /** Camera heading in radians: 0 = facing north (−z), clockwise (π/2 = east). */
  yaw: number;
  /** 0 fully zoomed in (close view, a few metres framed) … 1 fully zoomed out (overview of the whole map). */
  zoom01: number;
  view: ViewMode;
}
