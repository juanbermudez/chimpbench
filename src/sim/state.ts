import type { Chimp, DigestEvent, PartnerTally, Troop, Tree, Water, Weather, World } from '../types';
import { DEFAULTS } from './params.gen';
import { defaultSettings, paramsOf, type ParamSettings } from './params';
import type { Intent } from '../decide/gate';

// Clock and scale. Every behavioral constant lives in the parameter registry (data/params.json, generated into
// params.gen.ts); hot code reads the resolved values through paramsOf(world) (params.ts). These exports are the
// registry defaults for code outside the simulation. Tick length, start time and cadences are fixed (not overridable).
export const TICK_SECONDS = DEFAULTS.tickSeconds;
export const TICK_HOURS = TICK_SECONDS / 3600;
export const START_HOUR = DEFAULTS.startHour;        // the run opens at 06:30 EAT, civil twilight
export const START_DOY = DEFAULTS.startDoy;          // 28 September, Kibale's second wet season
export const SLOW_EVERY = DEFAULTS.slowEveryTicks;   // physiology/life-history/ecology every 5 eco-minutes
export const SLOW_HOURS = SLOW_EVERY * TICK_HOURS;
export const PARTY_EVERY = DEFAULTS.partyEveryTicks; // fission-fusion parties every 2 eco-minutes
// Overridable values (sight, speeds, caps, ...) have no module constants: a copy of a default would silently ignore a
// world's overrides and profile (C4 review). Read them with paramsOf(world); tests/sim-params.test.ts enforces this.

// Disjoint id ranges so a targetId is unambiguous.
export const TREE_ID0 = 100001;
export const WATER_ID0 = 200001;
export const PREY_ID0 = 300001;
export const DYN_ID0 = 1_000_000;
export const NEVER = -1e9;

export const isTreeId = (id: number) => id >= TREE_ID0 && id < WATER_ID0;
export const isWaterId = (id: number) => id >= WATER_ID0 && id < PREY_ID0;
export const isPreyId = (id: number) => id >= PREY_ID0 && id < DYN_ID0;
export const isChimpId = (id: number) => id > 0 && id < TREE_ID0;

/** Hidden per-individual state that has no field in the shared contract. Plain data, serializable. */
export interface ChimpX {
  actEnd: number; phase: number; prog: number; gx: number; gy: number; gz: number;
  intr: string; finished: boolean; interId: number;
  /**
   * Stage E2a (rhythm.ts): sleep pressure 0..1 (rhythmSleep), thermal load −1..1 (rhythmHeat) and the position at the
   * last tick (for the work of moving). Absent until their switch is on, so worlds with the switches off are unchanged.
   */
  slp?: number; heat?: number; hpx?: number; hpy?: number; hpz?: number;
  /**
   * Stage E2d (circadian.ts, rhythmCircadian): the circadian oscillator (x, x_c, used photoreceptors n) and the sleep
   * latch (1 asleep or due to sleep, 0 awake). Absent until the switch is on, so worlds with the switch off are unchanged.
   */
  cx?: number; cxc?: number; cn?: number; asl?: number;
  // perception snapshot, refreshed at decision points
  seen: number[]; seenAt: number; sight: number;
  ownMales: number; strangers: number; strangerMales: number; strangerTroop: number; isolated: number; nearestStranger: number;
  heardN: number; heardAt: number; heardX: number; heardZ: number; heardTroop: number; heardStim: number;
  joinCall: number; joinCaller: number; joinAt: number; joinX: number; joinZ: number;
  /** Stage C10 (travelHoo): the companion whose travel hoo this animal last heard, and when (absent until one is heard, so worlds with the switch off are unchanged). */
  hooFrom?: number; hooAt?: number;
  /**
   * Stage departPersist: a departure effort in progress (absent otherwise, so worlds with the switch off are unchanged).
   * tryN: the audience of the attempt under way; trySince: when the first failed attempt of this effort began; tryAt: when
   * its own trips to trees come back on the menu after a failed attempt.
   */
  tryN?: number; trySince?: number; tryAt?: number;
  /** Stage E2e (nestAudience, iteration 2): the finished nest an attempt under way set off from (absent otherwise). */
  tryNest?: { treeId: number; position: number[] };
  /**
   * Stage E5f (departValue): the audience an attempt of this animal last went unanswered by (a hash of who was there and
   * what each was doing, candidates.ts audienceSig); absent otherwise, so worlds with the switch off are unchanged.
   */
  dfa?: number;
  /** Stage C13 (rgOn): the rules policy's current intention (absent until the first RG decision, so worlds with the switch off are unchanged). */
  rgIntent?: Intent;
  /** Stage E3d (redecideValue): below rgMinAge, the decision count of the decision that chose the current act (its jitter; rg.ts argmaxKeep). */
  jv?: number;
  /** Stage E3g (experienceValue bit 1; experience.ts): the share of a trip's valued bout energy this animal's trips deliver (absent until its first trip ends). */
  ty?: number;
  /** Stage E3g: the open trip episode, [target crown, bout energy valued, kcal eaten there, the trip's own target id] (absent otherwise). */
  tt?: number[];
  /**
   * Stage E4p (matingValue 3; docs/staging/e4p-prereg.md §5.2, iteration 3): a female's copulations this cycle by male, each
   * weighted as recordCopulation weighs it and decaying with the age of its sperm (e-folding spermLifeDays, on the
   * life-history clock), as of `cdAt` (eco hours); absent until the first copulation under the switch.
   */
  cd?: Record<number, number>; cdAt?: number;
  trees: number[]; fruitNear: number; preyId: number; stims: number[];
  newcomers: number;
  // social bookkeeping
  greet: Record<number, number>; support: Record<number, number>; groomRecv: Record<number, number>; coerce: Record<number, number>;
  lastDisplay: number; lastCall: number; lastMate: number; lastAgg: number; lastFoodCall: number; lastHeard: number;
  victimOf: number; victimAt: number; lostAt: number;
  coalA: number; coalB: number; coalAt: number;
  rivalId: number;
  /** Stage E4a (endoStates; src/sim/endocrine.ts): competitive arousal (adult males only) and affiliation, 0..1. Absent until the states run, so worlds with the switch off are unchanged. The stress load is chimp.stress. */
  arousal?: number; affil?: number;
  /** Stage E4b fixes (endoStates): the last aggression stamp that kicked the stress load, and the start of the current hearing episode of stranger calls. Absent until first set. */
  aggKick?: number; heardFrom?: number;
  /** Stage E4b (endoFast): the fast arousal (catecholamine-like) as last set, and the eco-hour it was set; read through endocrine.ts fastNow. Absent until the first kick. */
  fast?: number; fastAt?: number;
  /** Stage E4c (callValue; calls.ts): when and where this animal last pant-hooted, which its listeners' cues point to. Absent until its first pant-hoot with the switch on. */
  phAt?: number; phX?: number; phZ?: number;
  /** Stage E4d (endoRhythm; endocrine.ts): an adult male's competitive-arousal drive (oestrus and rival terms) integrated over his waking slow steps with endoArousalTauH and held through sleep, which his sleep-gated nocturnal secretion amplifies. Absent until the first waking slow step with the switch on. */
  ard?: number;
  /**
   * Stage E1n (weanDecide; docs/staging/e1n-prereg.md §3.4): an infant's memory of its mother's last refusal or ended
   * bout, as her decision count (Chimp.decisionVersion) at that moment; it asks to suckle again once she has started a
   * new act. Absent until then, and cleared when a bout is let start.
   */
  wr?: number;
  /**
   * Stage E5d (socialUpkeep; src/sim/upkeep.ts): the bond units per eco-day that this animal's bonds toward living members
   * of its community lost at the last daily relaxation (life.ts dailyLife), which sets its social need's rise for the day.
   * Absent until the switch is on (computed from the bonds present at its first tick, then at every daily step).
   */
  upk?: number;
  /**
   * Stage E5e (socialTiming bit 4; docs/staging/e5e-prereg.md §4.3): the crown the caller of the last heard community
   * pant-hoot was feeding in when it called (-1 when it was not feeding in a crown). Absent until the bit is on and a call
   * is heard.
   */
  jt?: number;
  // reproduction and life history
  cycleLen: number; cops: Record<number, number>; sireId: number; amenUntil: number; firstSwell: number; gestation: number;
  weanAge: number; weaned: boolean; caretaker: number; immigrantAge: number; disperser: boolean; transferTo: number;
  consortId: number; guardBy: number; carryDead: number; nestTree: number;
  impulse: number; impulseTarget: number; impulseUntil: number;
  mateAsk: number; mateAskAt: number; recon: number; gangAt: number; v: number; aux: number; flag: number; lastIntr: string; lastIntrAt: number; consoleAt: number; visibleOwn: number;
  metAt: Record<number, number>; coreX: number; coreZ: number; lastHuntAt: number; near: Record<number, number>; gangRoll: number; consoledAt: number; joinRich: number;
  // relationships and long-term memory (relations.ts): directed tension 0..1, last incident [time, code], month in progress
  tension: Record<number, number>; incident: Record<number, [number, number]>; month: MonthLedger; monthsSinceYear: number;
  /** Committed direction (+1/-1 along the stream polyline) while following a bank around a bend; 0 when walking straight. */
  slide: number;
  /** Last time this male rolled the patrol hazard (territory.ts, perception.ts). */
  patrolRoll: number;
  /** Stage E4i (patrolValue; patrol.ts): adult males each neighbour community was last seen or heard with at once, by community id. Absent until the first contact with the switch on, so worlds with it off are unchanged. */
  nbm?: Record<number, number>;
  /** Contact memory (§5.3.1 P2): flat [x, z, contact, loss, eco-hour] per hot spot (contact.ts), and the last time strangers seen were noted. */
  contacts: number[]; contactSeenAt: number;
  /** Stage C6b (field): crowns this individual recently fed in and when it left them (≤ 6, newest last); absent until first used. */
  fedTree?: number[]; fedAt?: number[];
  /** Stage C7a (field): crop this individual last saw (or left) in each remembered fruit tree, by tree id; absent until first used. */
  treeCrop?: Record<number, number>;
  /**
   * Stage E2b (departRace; src/sim/departure.ts): the others this individual saw feeding in each remembered crown when it
   * last saw it (ids), kept beside the crop belief; absent until the switch is on and the first crown is seen.
   */
  treeFeed?: Record<number, number[]>;
  /**
   * Stage E3h (tripBeliefs bit 1; src/sim/tripbelief.ts): the eco-hour this individual last saw each crown on its
   * community's known list, by tree id; its crop belief (treeCrop) holds what it saw there. Absent until the switch is on
   * and the first listed crown is seen, so worlds with it off are unchanged.
   */
  ls?: Record<number, number>;
  /**
   * Stage E3i (callTrip bit 1; src/sim/calltrip.ts): the call a caller trip was chosen for, kept with the trip:
   * [call id, caller id, hour heard, x, z, crown id (−1: none)]. Absent until the switch is on and the first caller trip
   * starts, so worlds with it off are unchanged.
   */
  cg?: number[];
  /** Stage E2b (nurseWake): the last tick in which this mother's infant drank milk in her nest at night. Absent until then. */
  nwk?: number;
  /**
   * Stage C8 (docs/staging/early-life-prereg.md §2.6–2.9): body condition 0..1 (a slow average of 1 − hunger), the growth
   * record 0..1 (scales strength), a transient bereavement stress added to the resting stress floor, and a mother's mean
   * condition over her current pregnancy.
   */
  cond: number; grow: number; bereft: number; gestCond: number;
  /** Stage E1 (energyLedger; energy.ts): the energy ledger, absent until the switch is on and the individual first ticks. */
  en?: EnergyLedger;
  /** Stage E2g (waterLedger; water.ts): the water ledger, absent until the switch is on and the individual first ticks. */
  wat?: WaterLedger;
  /**
   * Stage C8 health (docs/realism-design.md §5.7): eco-hour when the current respiratory illness ends (NEVER when well),
   * the outbreak that last infected this individual (-1 none; immune to it afterwards), a permanent snare injury
   * (0 none, else its severity 0..1), and the last slow-step position on the ground (snare exposure per metre walked).
   */
  ill: number; outbreak: number; snare: number; trX: number; trZ: number;
}

/**
 * Stage E1 energy ledger (kcal; energy.ts): energy in the gut not yet absorbed, body reserves relative to the set point
 * (negative = deficit), lifetime energy eaten and spent (in − out = gut + reserves − their opening values), the
 * position at the last tick (locomotion is costed per metre actually moved), and the milk a lactating mother's glands
 * hold (kcal an infant can drink now; its energy is charged to her when it is drunk).
 */
export interface EnergyLedger {
  gut: number; res: number; in: number; out: number; x: number; y: number; z: number; milk: number;
  /**
   * Stage E1b (ledgerDigesta; energy.ts), present only with that switch on: dry matter in the foregut (g), the fibre (NDF)
   * part of it (g), fibre in the hindgut (g), formula energy eaten (kcal, the field's intake measure), energy passed out
   * unabsorbed (kcal) and dry matter eaten (g). With these, `gut` holds the non-fibre energy of the foregut and `in`
   * counts fibre at its fermentation yield.
   */
  dm?: number; fib?: number; hind?: number; fin?: number; fec?: number; dmIn?: number;
  /** Stage E1c (ledgerGrowSurplus): body mass in kg, state instead of a curve by age; present only with that switch. */
  kg?: number;
  /**
   * Stage E1e (ledgerDrive), present only with that switch on: the day-long average of energy spent (kcal/h), sleep
   * pressure when the animal last fell asleep and last woke, whether it slept at the last tick (0/1), and `out` at the
   * last tick (so costs charged outside energyTick, milk and carrying, enter the average).
   */
  eAvg?: number; sBed?: number; sWake?: number; slept?: number; outAt?: number;
  /**
   * Stage E1f (ledgerGrowPotential), present only while the animal is below adult mass with that switch on: the day-long
   * average (kcal/h) of everything spent except growth, and `out` at the last tick.
   */
  mAvg?: number; gAt?: number;
  /**
   * Stage E1p (growYield 2; energy.ts), present only while the animal is below adult mass with that switch at 2: the
   * day-long average of energy absorbed (kcal/h), against which growth is paid only from the surplus after maintenance.
   */
  aAvg?: number;
  /**
   * Stage E1o (milkInDrive; energy.ts), present only on an unweaned animal with that switch on: the milk its mother's
   * gland holds (kcal) and her synthesis rate (kcal/h), read from her ledger once a tick, so the drive can count milk at
   * what the gland delivers (0 and 0 without a lactating mother).
   */
  gm?: number; gy?: number;
}

/**
 * Stage E2g water ledger (mL; water.ts): the body water deficit below euhydration (≥ 0; a surplus is passed as urine at
 * once), lifetime water in and out (in − out = −(def − its opening value)), and the energy ledger's `out` and passed
 * faecal energy (`fec`) at the last water tick, so metabolic and faecal water follow the energy books; `mx` is milk energy
 * exported since then (not oxidised, so no metabolic water).
 */
export interface WaterLedger { def: number; in: number; out: number; oAt: number; fAt: number; mx: number }

/** The memory month in progress: tallies accumulate on events and are finalized into a MemoryDigest every 30 eco-days. */
export interface MonthLedger { start: number; startRank: number; partners: Record<number, PartnerTally>; events: DigestEvent[]; encounters: number; lastEncounter: number }

export interface PatrolState {
  leaderId: number; neighborId: number; start: number; phase: number; wx: number; wz: number; until: number; interId: number;
  /** Stage C6: the periphery sector patrolled, whether this patrol pushes into the neighbour's range, and listening stops. */
  sector: number; incursion: boolean; stopUntil: number; lastStop: number; stops: number;
  /** §5.3.1 P4a: members in join order (leader first; single file), and whether the patrol met or heard strangers (release). */
  file: number[]; contact: boolean;
}
export interface HuntState { preyId: number; troopId: number; start: number; resolveAt: number; hunters: number[]; interId: number }

/** Stage C9 state (plain data): decayed pair counts (key a·100000 + b, a < b), scan counts and location histograms per individual, the month last processed, consecutive months meeting the split rule per community, the monthly log (≤ 240 rows) and each daughter community's parent. */
export interface FissionState {
  pairs: Record<number, number>; scans: Record<number, number>; hist: Record<number, Record<number, number>>; lastMonth: number;
  run: Record<number, number>;
  log: { month: number; troopId: number; Q: number; n: [number, number]; males: [number, number]; females: [number, number]; overlap: number; met: boolean }[];
  parents: Record<number, number>;
}

/** Hidden world-level state (weather chain, patrols, hunts, counters). Plain data, serializable. */
export interface SimState {
  carry: number; nextChimpId: number; aliveVersion: number; hierDirty: boolean;
  weather: { state: Weather; rainTarget: number; since: number; heavy: boolean; rainMm: number; forcedUntil: number };
  droughtUntil: number; figTree: number; figUntil: number;
  patrols: Record<number, PatrolState | null>;
  hunts: HuntState[]; lastHunt: Record<number, number>;
  encounters: Record<string, number>;
  nextPreyId: number; preyAt: number;
  gates: Record<string, number>;
  groomTally: Record<number, number>; playTally: Record<number, number>; lastSummary: number;
  aware: Record<number, number[]>;
  names: Record<number, number>;
  unstableUntil: Record<number, number>;
  lastDaily: number; lastHourly: number;
  alphaHow: Record<number, string>;
  /** Stage C6 territories (territory.ts): utilization and danger grids per community, periphery sector visits, isopleth stamp. */
  ud: Record<number, number[]>; sectorVisit: Record<number, number[]>; udStamp: number;
  /** Use added since the last daily update (sparse, by cell), merged into `ud` daily so isopleths depend only on saved state. */
  udNew: Record<number, Record<number, number>>;
  /** Ablation (patrolContactMemory 0): the C6 community danger grids; absent otherwise, so default worlds are unchanged. */
  danger?: Record<number, number[]>;
  /** Stage C9 (fission.ts): association counts, location histograms, monthly detection log; absent unless fissionOn is 1. */
  fission?: FissionState;
  /** Stage C7a (field): per community, the day's best-known productive trees as flat [treeId, expected crop, …] pairs; absent when off. */
  knownTrees?: Record<number, number[]>;
  /** Stage C7c (field, fallback.ts): depleted fallback-forage cells as [deficit in feeding-hours, time]; absent when off. */
  fallback?: Record<number, [number, number]>;
  kills: Record<string, number>;
  vacantUntil: Record<number, number>;
  /** Community hunting day (daily draw) until this time. */
  huntDay: Record<number, number>;
  /** Stage E4a (endoRainDisplay): eco-hour of the last daytime storm onset; absent unless the switch is on. */
  stormAt?: number;
  /** Stage C8 (disease.ts): the respiratory outbreak running in each community (id, start, virulence on the odds scale), and the next id. */
  outbreaks: Record<number, { id: number; start: number; v: number }>; nextOutbreak: number;
  /** Registry hash, scale profile and parameter overrides this world was created with (params.ts). Small plain data. */
  params: ParamSettings;
}

export type SimChimp = Chimp & { sim: ChimpX };
export type SimWorld = World & { sim: SimState };

/**
 * ChimpX and SimState keys that exist only once their mechanism has fired (so worlds with the switch off keep their
 * shape and hashes). The save check (src/persist/envelope.ts worldShapeProblem) ignores them.
 */
export const OPTIONAL_X: readonly string[] = ['hooFrom', 'hooAt', 'rgIntent', 'tryN', 'trySince', 'tryAt', 'tryNest', 'dfa', 'en', 'wat', 'slp', 'heat', 'hpx', 'hpy', 'hpz', 'arousal', 'affil', 'aggKick', 'heardFrom', 'fast', 'fastAt', 'treeFeed', 'nwk', 'cx', 'cxc', 'cn', 'asl', 'phAt', 'phX', 'phZ', 'ard', 'wr', 'upk', 'jt', 'nbm', 'jv', 'ty', 'tt', 'cd', 'cdAt', 'ls', 'cg'];
export const OPTIONAL_SIM: readonly string[] = ['fission', 'stormAt'];

export function newX(): ChimpX {
  return {
    actEnd: 0, phase: 0, prog: 0, gx: 0, gy: 0, gz: 0, intr: '', finished: false, interId: -1,
    seen: [], seenAt: NEVER, sight: 0,
    ownMales: 0, strangers: 0, strangerMales: 0, strangerTroop: -1, isolated: -1, nearestStranger: -1,
    heardN: 0, heardAt: NEVER, heardX: 0, heardZ: 0, heardTroop: -1, heardStim: -1,
    joinCall: -1, joinCaller: -1, joinAt: NEVER, joinX: 0, joinZ: 0,
    trees: [], fruitNear: 0, preyId: -1, stims: [], newcomers: 0,
    greet: {}, support: {}, groomRecv: {}, coerce: {},
    lastDisplay: NEVER, lastCall: NEVER, lastMate: NEVER, lastAgg: NEVER, lastFoodCall: NEVER, lastHeard: NEVER,
    victimOf: -1, victimAt: NEVER, lostAt: NEVER, coalA: -1, coalB: -1, coalAt: NEVER, rivalId: -1,
    cycleLen: 36, cops: {}, sireId: -1, amenUntil: 0, firstSwell: 10.5, gestation: 228,
    weanAge: 4.5, weaned: false, caretaker: -1, immigrantAge: -1, disperser: true, transferTo: -1,
    consortId: -1, guardBy: -1, carryDead: NEVER, nestTree: -1,
    impulse: 0, impulseTarget: -1, impulseUntil: NEVER, mateAsk: -1, mateAskAt: NEVER, recon: NEVER, gangAt: NEVER, v: 0, aux: -1, flag: 0, lastIntr: '', lastIntrAt: NEVER, consoleAt: NEVER, visibleOwn: 0,
    metAt: {}, coreX: 0, coreZ: 0, lastHuntAt: NEVER, near: {}, gangRoll: NEVER, consoledAt: NEVER, joinRich: 0,
    tension: {}, incident: {}, month: { start: 0, startRank: 0, partners: {}, events: [], encounters: 0, lastEncounter: NEVER }, monthsSinceYear: 0, slide: 0, patrolRoll: NEVER, contacts: [], contactSeenAt: NEVER,
    cond: 0.7, grow: 1, bereft: 0, gestCond: 0.7, ill: NEVER, outbreak: -1, snare: 0, trX: 0, trZ: 0,
  };
}

/** Stage E2e (nestAudience; docs/staging/e2e-prereg.md): an animal awake in its finished nest (no circadian latch, or the latch off) is a companion like any other. */
export function awakeInNest(P: { nestAudience: number }, o: Chimp): boolean {
  return P.nestAudience === 1 && o.action === 'nest' && ix(o).phase >= 2 && ix(o).asl !== 1;
}
export function ix(chimp: Chimp): ChimpX {
  const c = chimp as SimChimp;
  return c.sim ?? (c.sim = newX());
}

export function newSimState(): SimState {
  return {
    carry: 0, nextChimpId: 1, aliveVersion: 0, hierDirty: true,
    weather: { state: 'cloudy', rainTarget: 0, since: 0, heavy: false, rainMm: 0, forcedUntil: NEVER },
    droughtUntil: NEVER, figTree: -1, figUntil: NEVER,
    patrols: {}, hunts: [], lastHunt: {}, encounters: {},
    nextPreyId: PREY_ID0, preyAt: 0, gates: {}, groomTally: {}, playTally: {}, lastSummary: 0, aware: {}, names: {},
    unstableUntil: {}, lastDaily: 0, lastHourly: 0, alphaHow: {}, ud: {}, sectorVisit: {}, udStamp: 0, udNew: {}, kills: {}, vacantUntil: {}, huntDay: {}, outbreaks: {}, nextOutbreak: 1, params: defaultSettings(),
  };
}

export function simOf(world: World): SimState {
  const w = world as SimWorld;
  if (!w.sim) {
    w.sim = newSimState();
    w.sim.nextChimpId = world.chimps.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  }
  return w.sim;
}

// ---------------------------------------------------------------------------
// Derived indexes, cached per world and rebuilt when arrays change.
// ---------------------------------------------------------------------------

export interface Index {
  chimps: Chimp[]; len: number; ver: number; trees: Tree[]; treeLen: number;
  byId: Map<number, Chimp>; alive: Chimp[]; treeById: Map<number, Tree>; waterById: Map<number, Water>; troopById: Map<number, Troop>;
  /** Tree grid: cell (P.treeGridCellM: 16 m compressed, 64 m field), cells of indexes into world.trees. */
  grid: number[][]; gridN: number; half: number; cell: number;
}

const cache = new WeakMap<World, Index>();
// Fast path for the world being ticked: index() runs thousands of times per tick, and the WeakMap lookup was
// most of its cost. Pure caching; the validity checks are the same as below.
let lastWorld: World | null = null, lastIdx: Index | null = null;

export function index(world: World): Index {
  const li = lastIdx;
  if (world === lastWorld && li !== null && li.chimps === world.chimps && li.len === world.chimps.length && li.ver === (world as SimWorld).sim.aliveVersion
    && li.trees === world.trees && li.treeLen === world.trees.length) return li;
  const s = simOf(world);
  let idx = cache.get(world);
  if (idx && idx.chimps === world.chimps && idx.len === world.chimps.length && idx.ver === s.aliveVersion && idx.trees === world.trees && idx.treeLen === world.trees.length) { lastWorld = world; lastIdx = idx; return idx; }
  if (!idx || idx.trees !== world.trees || idx.treeLen !== world.trees.length) {
    const half = world.size / 2;
    const cell = paramsOf(world).treeGridCellM;
    const gridN = Math.max(1, Math.ceil(world.size / cell));
    const grid: number[][] = Array.from({ length: gridN * gridN }, () => []);
    const treeById = new Map<number, Tree>();
    world.trees.forEach((t, i) => {
      treeById.set(t.id, t);
      const cx = Math.min(gridN - 1, Math.max(0, Math.floor((t.position[0] + half) / cell)));
      const cz = Math.min(gridN - 1, Math.max(0, Math.floor((t.position[2] + half) / cell)));
      grid[cz * gridN + cx].push(i);
    });
    idx = { chimps: world.chimps, len: 0, ver: -1, trees: world.trees, treeLen: world.trees.length, byId: new Map(), alive: [], treeById,
      waterById: new Map(), troopById: new Map(), grid, gridN, half, cell };
  }
  idx.chimps = world.chimps; idx.len = world.chimps.length; idx.ver = s.aliveVersion;
  idx.byId.clear(); idx.alive.length = 0;
  for (const c of world.chimps) { idx.byId.set(c.id, c); if (c.alive) idx.alive.push(c); }
  idx.waterById.clear(); for (const w of world.water) idx.waterById.set(w.id, w);
  idx.troopById.clear(); for (const t of world.troops) idx.troopById.set(t.id, t);
  cache.set(world, idx);
  lastWorld = world; lastIdx = idx;
  return idx;
}

export function markAliveChanged(world: World): void { const s = simOf(world); s.aliveVersion++; s.hierDirty = true; }

export function chimpById(world: World, id: number): Chimp | undefined { return index(world).byId.get(id); }
export function living(world: World, id: number): Chimp | undefined { const c = index(world).byId.get(id); return c && c.alive ? c : undefined; }
export function treeById(world: World, id: number): Tree | undefined { return index(world).treeById.get(id); }
export function troopById(world: World, id: number): Troop | undefined { return index(world).troopById.get(id); }

/** Fills out with indexes into world.trees within r of (x, z). Returns the count. */
export function treesNear(world: World, x: number, z: number, r: number, out: number[]): number {
  const idx = index(world);
  out.length = 0;
  const r2 = r * r;
  const cell = idx.cell;
  const x0 = Math.max(0, Math.floor((x - r + idx.half) / cell)), x1 = Math.min(idx.gridN - 1, Math.floor((x + r + idx.half) / cell));
  const z0 = Math.max(0, Math.floor((z - r + idx.half) / cell)), z1 = Math.min(idx.gridN - 1, Math.floor((z + r + idx.half) / cell));
  const trees = world.trees;
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
    const cell = idx.grid[cz * idx.gridN + cx];
    for (let k = 0; k < cell.length; k++) {
      const t = trees[cell[k]];
      const dx = t.position[0] - x, dz = t.position[2] - z;
      if (dx * dx + dz * dz <= r2) out.push(cell[k]);
    }
  }
  return out.length;
}

export function dist2(a: Chimp, b: Chimp): number {
  const dx = a.position[0] - b.position[0], dz = a.position[2] - b.position[2];
  return dx * dx + dz * dz;
}
export function hdist(ax: number, az: number, bx: number, bz: number): number { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }

// ---------------------------------------------------------------------------
// Chimp grid (field profile, P.chimpGridCellM > 0): living individuals bucketed by cell, rebuilt once per tick when
// used. Queries return indexes into index(world).alive in ascending order, so a loop over them visits individuals in
// exactly the order of a scan over all living (perception and parties give the same results as the brute-force scan).
// ---------------------------------------------------------------------------

interface ChimpGrid { tick: number; ver: number; cell: number; n: number; half: number; cells: number[][]; used: number[] }
const chimpGrids = new WeakMap<World, ChimpGrid>();

function chimpGrid(world: World, cell: number, fresh = false): ChimpGrid {
  let g = chimpGrids.get(world);
  const idx = index(world);
  if (!g || g.cell !== cell) {
    const n = Math.max(1, Math.ceil(world.size / cell));
    g = { tick: -1, ver: -1, cell, n, half: world.size / 2, cells: Array.from({ length: n * n }, () => []), used: [] };
    chimpGrids.set(world, g);
  }
  if (fresh || g.tick !== world.tick || g.ver !== idx.ver) {
    for (const k of g.used) g.cells[k].length = 0;
    g.used.length = 0;
    const alive = idx.alive;
    for (let i = 0; i < alive.length; i++) {
      const p = alive[i].position;
      const cx = Math.min(g.n - 1, Math.max(0, Math.floor((p[0] + g.half) / cell))), cz = Math.min(g.n - 1, Math.max(0, Math.floor((p[2] + g.half) / cell)));
      const k = cz * g.n + cx;
      if (g.cells[k].length === 0) g.used.push(k);
      g.cells[k].push(i);
    }
    g.tick = world.tick; g.ver = idx.ver;
  }
  return g;
}

/**
 * Indexes into index(world).alive of individuals possibly within r of (x, z), ascending; `out` is reused. Returns
 * false (and leaves out empty) when the world has no chimp grid, in which case callers scan all living.
 */
export function aliveNear(world: World, x: number, z: number, r: number, out: number[]): boolean {
  out.length = 0;
  const P = paramsOf(world), cell = P.chimpGridCellM;
  if (!(cell > 0)) return false;
  const g = chimpGrid(world, cell);
  // the grid is built once per tick; anyone may have moved since by at most a run step (twice, for safety)
  r += 2 * P.runMps * TICK_SECONDS + 2;
  const x0 = Math.max(0, Math.floor((x - r + g.half) / cell)), x1 = Math.min(g.n - 1, Math.floor((x + r + g.half) / cell));
  const z0 = Math.max(0, Math.floor((z - r + g.half) / cell)), z1 = Math.min(g.n - 1, Math.floor((z + r + g.half) / cell));
  for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { const c = g.cells[cz * g.n + cx]; for (let k = 0; k < c.length; k++) out.push(c[k]); }
  if (x1 > x0 || z1 > z0) out.sort((a, b) => a - b);
  return true;
}

/** Cells of the chimp grid (for pairwise party links); null without a grid. */
export function chimpCells(world: World): { cells: number[][]; n: number; used: number[] } | null {
  const cell = paramsOf(world).chimpGridCellM;
  if (!(cell > 0)) return null;
  const g = chimpGrid(world, cell, true);
  return g;
}

/** Allocation-free lookups for hot paths (Array.find with a closure allocates per call). */
export function byIdIn<T extends { id: number }>(list: readonly T[], id: number): T | undefined {
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return undefined;
}
export function huntOf(hunts: readonly HuntState[], preyId: number, troopId: number): HuntState | undefined {
  for (let i = 0; i < hunts.length; i++) if (hunts[i].preyId === preyId && hunts[i].troopId === troopId) return hunts[i];
  return undefined;
}
