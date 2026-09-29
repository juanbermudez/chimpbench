import type { Chimp, Interaction, World } from '../types';
import { mixSeed } from '../sim/rng';
import { TICK_HOURS, index, type SimChimp } from '../sim/state';
import { defaultConfig, type ObserverConfig } from './config';
import { conflictTick, dayStep, finishProtocols, focalTruthTick, minuteStep, type OpenEncounter, type PendingHeard } from './protocols';
import { emptyRecords, type BirthRec, type EventRec, type Follow, type HuntRec, type Records, type RosterEntry } from './records';

// Virtual field observer (docs/realism-design.md §3). It only reads the world: it receives the world after each
// tickWorld, never calls a function that writes world state, and draws its own random numbers from `rng`
// (xorshift32 seeded from world.seed, 0x0b5e and cfg.seed), never from world.rng. Hidden per-chimp state is read
// through `sim()` below, which never creates it (ix() would, on slimmed dead records).

/** Hidden per-chimp state, or undefined for slimmed dead records. Read-only use. */
export const sim = (c: Chimp) => (c as SimChimp).sim;

export interface Team {
  /** Position in Observer.teams (records store it). */
  index: number;
  troop: number;
  /** 0 idle, 1 focal chosen and waiting for it to leave its nest, 2 following, 3 done for the day. */
  state: number;
  focal: number; follow: Follow | null;
  rotation: number[]; rotIdx: number; blockStart: number;
  x: number; z: number;
  /** Focal party at the latest point sample (ids, same community); `mark[id] === partyStamp` for its members. */
  party: number[]; mark: number[]; partyStamp: number;
  /** The same party as chimp objects (focal first), with its independent count, adult males and the focal's 5 m / 10 m neighbours. */
  members: Chimp[]; pInd: number; pAM: number; pN5: number; pN10: number;
  /** A party member pant-hooted or drummed since the last point sample. */
  called: boolean;
  encounters: Map<number, OpenEncounter>;
  heard: PendingHeard[];
  /** Tree-visit bookkeeping (T-FOOD-4..7): current feeding tree, where the focal was when it left the last one. */
  visitTree: number; departX: number; departZ: number; departT: number;
  /** Ids seen today (census), and the day each id was last added. */
  seenToday: number[]; seenMark: number[];
}

export interface PcState { conflict: number; a: number; b: number; t: number; until: number; }
export interface McState { conflict: number; a: number; b: number; due: number; tries: number; until: number; }

export interface Observer {
  cfg: ObserverConfig;
  /** Observer xorshift32 state; independent of world.rng. */
  rng: number;
  rec: Records;
  teams: Team[];
  interCursor: number; callCursor: number;
  /** Interactions still open (end not yet reached), with the event record if a team detected them. */
  open: { it: Interaction; ev: EventRec | null }[];
  hunts: Map<number, HuntRec>;
  captures: { troop: number; t: number; captor: number; hunters: number[]; detected: boolean }[];
  roster: Map<number, RosterEntry>;
  status: Map<number, 'alive' | 'dead' | 'gone'>;
  pendingBirths: Map<number, BirthRec>;
  recentDead: { id: number; troop: number; x: number; z: number; t: number; violent: boolean; found: boolean }[];
  pc: PcState[]; mc: McState[]; mcRun: McState[];
  /** Per-sample probability of losing the follow: normally, and while the focal runs or is above 15 m. */
  pLose: number; pLoseHard: number;
  /** Observer visibility at the current minute (m). */
  vis: number;
  stats: { conflicts: number; killings: number; encounters: number; deaths: number; births: number };
  statsStart: World['stats']; tick0: number; time0: number; statsTime: number;
  /** Weather station: current day and its temperature extremes. */
  wx: { day: number; min: number; max: number };
  nestDay: number; finished: boolean;
  prevHour: number; prevAlt: number; sunrise: number; sunset: number; lastMonth: number; monthPending: boolean; lastTick: number;
  /** Chosen phenology trees (ids) and transect lines (per troop: [x0, z0, x1, z1] quadruples). */
  phenTrees: number[]; lines: Record<number, number[]>;
  alphaPrev: Map<number, number>;
  /** Minute-level scratch: living chimps by community id; per-id flags stamped with the current minute. */
  byTroop: Chimp[][];
  stamp: number;
  id: IdScratch;
  /** When the community lists were last rebuilt: alive version, transfer count, tick. */
  aliveVer: number; transfers: number; rebuiltAt: number;
  /** Ticks between point samples and between scans. */
  pointEvery: number; scanEvery: number;
  start: { centers: [number, number][]; alive: number };
}

/** Per-individual scratch indexed by chimp id (ids are small consecutive integers). */
export interface IdScratch {
  /** 1 when independent at the current minute. */
  indep: number[];
  /** = stamp when being groomed (in contact) at the current minute. */
  groomed: number[];
  /** Census: last time seen (eco-hours); the community a sighting was last verified against (0 = check the roster). */
  seen: number[]; ok: number[];
  /** Truth: path length, last position (NaN before the first sample), last day left the nest / settled, last cycle day, cycle wraps. */
  path: number[]; px: number[]; pz: number[]; left: number[]; settled: number[]; cycle: number[]; wraps: number[];
}

/** Grows the id-indexed scratch so ids below n are valid. */
export function ensureIds(o: Observer, n: number): void {
  const s = o.id;
  while (s.indep.length < n) { s.indep.push(0); s.groomed.push(0); s.seen.push(-1e9); s.ok.push(0); s.path.push(0); s.px.push(NaN); s.pz.push(NaN); s.left.push(-1); s.settled.push(-1); s.cycle.push(-1); s.wraps.push(0); }
}

/** Next observer random number in [0, 1). */
export function orand(o: Observer): number {
  let x = o.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  o.rng = x >>> 0;
  return o.rng / 4294967296;
}

export function createObserver(world: World, over: Partial<ObserverConfig> = {}): Observer {
  const cfg = defaultConfig(over.profile?.name ?? 'compressed', over);
  const rec: Records = { ...emptyRecords(cfg.profile.name), seed: cfg.seed, worldSeed: world.seed, tickHours: TICK_HOURS, time0: world.time, troops: world.troops.map(t => t.id), mapSize: world.size };
  const o: Observer = {
    cfg, rng: mixSeed((world.seed ^ 0x0b5e ^ cfg.seed) >>> 0), rec, teams: [], interCursor: world.nextId - 1, callCursor: world.nextId - 1,
    open: [], hunts: new Map(), captures: [], roster: new Map(), status: new Map(), pendingBirths: new Map(), recentDead: [],
    pc: [], mc: [], mcRun: [], stats: { conflicts: world.stats.conflicts, killings: world.stats.killings, encounters: world.stats.intergroupEncounters, deaths: world.stats.deaths, births: world.stats.births },
    statsStart: { ...world.stats }, tick0: world.tick, time0: world.time, statsTime: world.time, wx: { day: -1, min: 99, max: -99 }, nestDay: -1, finished: false,
    prevHour: world.hour, prevAlt: world.environment.sunAltitude, sunrise: 6.8, sunset: 18.8, lastMonth: -1, monthPending: false, lastTick: world.tick,
    phenTrees: [], lines: {}, alphaPrev: new Map(world.troops.map(t => [t.id, t.alphaId])), byTroop: [], stamp: 0, aliveVer: -1, transfers: -1, rebuiltAt: -1e9,
    id: { indep: [], groomed: [], seen: [], ok: [], path: [], px: [], pz: [], left: [], settled: [], cycle: [], wraps: [] },
    vis: cfg.profile.visibilityM, pLose: 1 - Math.exp(-cfg.loseHazardPerH * cfg.pointIntervalMin / 60), pLoseHard: 1 - Math.exp(-cfg.loseHazardPerH * cfg.loseFactor * cfg.pointIntervalMin / 60),
    pointEvery: Math.max(1, Math.round(cfg.pointIntervalMin / 60 / TICK_HOURS)), scanEvery: Math.max(1, Math.round(cfg.scanIntervalMin / 60 / TICK_HOURS)),
    start: { centers: world.troops.map(t => [t.center[0], t.center[2]]), alive: 0 },
  };
  // Roster: the habituated communities are known at the start; founder ages are estimates (design ±ageErrorY).
  const alive = index(world).alive;
  o.start.alive = alive.length;
  ensureIds(o, world.chimps.length + 1);
  for (const t of world.troops) o.byTroop[t.id] = [];
  rec.truth.popStart = alive.length;
  for (const c of alive) {
    const err = Math.min(cfg.ageErrorY, c.age / 2) * (2 * orand(o) - 1);
    const e: RosterEntry = { id: c.id, sex: c.sex, troop: c.troopId, natal: c.natalTroopId, mother: c.motherId, birthEst: world.time - (c.age + err) * 365.25 * 24,
      knownAge: false, founder: true, firstSeen: world.time };
    o.roster.set(c.id, e); rec.roster.push(e); o.status.set(c.id, 'alive');
    ensureIds(o, c.id + 1);
    o.id.seen[c.id] = world.time;
    if (c.sex === 'female') o.id.cycle[c.id] = c.cycleDay;
  }
  // Phenology trees: up to N per species, drawn once with the observer RNG (Potts et al. 2020 transect design).
  const bySpecies = new Map<string, number[]>();
  for (const t of world.trees) { let l = bySpecies.get(t.species); if (!l) bySpecies.set(t.species, l = []); l.push(t.id); }
  for (const sp of [...bySpecies.keys()].sort()) {
    const ids = bySpecies.get(sp)!;
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(orand(o) * (i + 1)); const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp; }
    o.phenTrees.push(...ids.slice(0, cfg.transectTreesPerSpecies));
  }
  // Transect walks: straight lines through each range at random angles, one range diameter long.
  for (const t of world.troops) {
    const l: number[] = [];
    for (let k = 0; k < cfg.transectLines; k++) {
      const a = orand(o) * Math.PI, dx = Math.cos(a) * t.radius, dz = Math.sin(a) * t.radius;
      l.push(t.center[0] - dx, t.center[2] - dz, t.center[0] + dx, t.center[2] + dz);
    }
    o.lines[t.id] = l;
  }
  for (const t of world.troops) {
    o.teams.push({ index: o.teams.length, mark: [], partyStamp: -1, members: [], pInd: 0, pAM: 0, pN5: 0, pN10: 0, troop: t.id, state: 0, focal: -1, follow: null, rotation: [], rotIdx: 0, blockStart: -1e9, x: t.center[0], z: t.center[2], party: [], called: false,
      encounters: new Map(), heard: [], visitTree: -1, departX: 0, departZ: 0, departT: 0, seenToday: [], seenMark: [] });
  }
  dayStep(o, world, true);
  return o;
}

/** Call once after every tickWorld. Reads the world; never writes it. */
export function observerStep(o: Observer, world: World): void {
  const tick = world.tick;
  if (tick === o.lastTick) return;
  o.lastTick = tick;
  conflictTick(o, world);
  focalTruthTick(o, world);
  if (tick % o.pointEvery === 0) minuteStep(o, world);
  const h = world.hour;
  if ((o.prevHour < 4 && h >= 4) || (o.prevHour < 21 && h >= 21)) dayStep(o, world, false);
  o.prevHour = h;
}

/** Ends the observation (closes follows and encounters, links hunts, fills end-of-run truth) and returns the records. */
export function finishObserver(o: Observer, world: World): Records {
  if (!o.finished) { finishProtocols(o, world); o.finished = true; }
  return o.rec;
}

/** The records collected so far (final after finishObserver). */
export function observerRecords(o: Observer): Records { return o.rec; }
