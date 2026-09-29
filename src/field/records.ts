// Observer records (docs/realism-design.md §3.4). High-volume protocols (point samples, scans) are columnar typed
// arrays; the rest are small arrays of plain objects created with a fixed key order, so a canonical JSON of them is
// stable. `recordsHash` fingerprints everything for the byte-identical rerun test.

type Kind = 'i32' | 'f32' | 'f64' | 'u8';
type Arr = Int32Array | Float32Array | Float64Array | Uint8Array;
const CTOR: Record<Kind, new (n: number) => Arr> = { i32: Int32Array, f32: Float32Array, f64: Float64Array, u8: Uint8Array };

/** A growable typed column. */
export class Column {
  data: Arr; n = 0;
  constructor(readonly kind: Kind, cap = 1024) { this.data = new CTOR[kind](cap); }
  push(v: number): void {
    if (this.n === this.data.length) { const d = new CTOR[this.kind](this.data.length * 2); d.set(this.data); this.data = d; }
    this.data[this.n++] = v;
  }
  get(i: number): number { return this.data[i]; }
  view(): Arr { return this.data.subarray(0, this.n); }
}

/** Focal instantaneous point samples, one row per team-minute while following. */
export interface PointTable {
  t: Column; team: Column; focal: Column; cat: Column; action: Column; height: Column; party: Column; partyInd: Column; partyAM: Column;
  n5: Column; n10: Column; flags: Column; feed: Column; tree: Column; x: Column; z: Column;
  /** Truth: the focal's category is the continuous per-tick reference; kept per follow in `follows`. */
  truthPatrol: Column;
}
export const P_LACT = 1, P_SWOLLEN = 2, P_MEAT = 4, P_CALLED = 8, P_CHANNEL = 16, P_GROUND = 32;

/** Party composition scans of the focal party every 15 min. Members are a slice of `members`. */
export interface ScanTable {
  t: Column; team: Column; focal: Column; size: Column; ind: Column; am: Column; af: Column; swollen: Column;
  prey: Column; preyDist: Column; tree: Column; canopy: Column; feedN: Column; cx: Column; cz: Column;
  memOff: Column; memN: Column; nearOff: Column; nearN: Column;
  members: Column; near: Column;
}

export interface Follow {
  team: number; troop: number; focal: number; sex: 'male' | 'female'; lactating: boolean;
  start: number; end: number; complete: boolean; lost: boolean; sunrise: number; sunset: number;
  /** Truth: continuous per-tick category counts over the same focal-time (for the sampling accuracy check). */
  truthTicks: number[];
  /** First feeding tree and the night-nest tree the focal left (T-FOOD-10). */
  nestTree: number; firstTree: number;
}

export interface RosterEntry {
  id: number; sex: 'male' | 'female'; troop: number; natal: number; mother: number;
  /** Estimated birth time (eco-hours): exact for known-age individuals, with error for founders and immigrants. */
  birthEst: number; knownAge: boolean; founder: boolean; firstSeen: number;
}

/** All-occurrence social interactions detected by a team (detect 1 seen, 2 heard, 3 focal involved). */
export interface EventRec {
  id: number; t: number; end: number; kind: string; actor: number; target: number; parts: number[]; troop: number; team: number; detect: number;
  x: number; z: number;
}
export interface ConflictRec {
  t: number; winner: number; loser: number; troop: number; contact: boolean; detected: boolean;
  /** PC–MC: minutes to first affiliative contact between the opponents in the post-conflict and matched-control windows (−1 none, −2 no MC). */
  pc: number; mc: number;
  thirdToWinner: number; thirdToLoser: number;
}
export interface EncounterRec {
  team: number; troop: number; other: number; t0: number; t1: number; modality: 'heard' | 'seen' | 'physical';
  ownSize: number; ownAM: number; otherSize: number; otherAM: number;
  approach: boolean; avoid: boolean; called: boolean; x: number; z: number; patrolling: boolean;
}
export interface HuntRec {
  id: number; team: number; troop: number; t0: number; t1: number; prey: number; hunters: number[]; captures: number; captors: number[];
  detected: boolean; partyAM: number; present: number[];
}
export interface CallRec { t: number; team: number; caller: number; kind: string; troop: number; dist: number; context: number; }
export interface CensusRec { day: number; troop: number; ids: number[]; }
export interface DeathRec {
  id: number; troop: number; tEst: number; how: 'body' | 'disappeared'; truthTime: number; violent: boolean;
  /**
   * Stage C8. Necropsy truth for carcasses ('disease' | 'aggression' | 'other'; 'unknown' for disappearances), and whether it
   * was a respiratory outbreak death; the last sighting before the loss (a disappearance's window opens there); and whether
   * the individual was seen ill in the 30 days before it (health monitoring).
   */
  cause: string; respiratory: boolean; last: number; ill: boolean;
}
/** Stage C8 health monitoring: community members seen with respiratory signs on a census day. */
export interface HealthRec { day: number; troop: number; ids: number[]; }
/** Stage C8 truth-read samples (early-life-prereg §1.5, §1.6): value of an individual at time t. */
export interface SampleRec { t: number; id: number; v: number; }
export interface BirthRec { id: number; mother: number; troop: number; tSeen: number; truthBirth: number; father: number; }
export interface TransferRec { id: number; from: number; to: number; tSeen: number; }
export interface PhenologyRec { month: number; tree: number; species: string; fruit: number; ripe: boolean; }
export interface TransectRec { month: number; troop: number; lengthM: number; fruiting: number; }
export interface TreeVisitRec { team: number; focal: number; tree: number; t: number; fromX: number; fromZ: number; dist: number; nearest: boolean; outOfSight: boolean; }
export interface ExperimentRec {
  kind: 'playback' | 'snake'; troop: number; day: number; males: number; females: number; size: number; approached: boolean; called: boolean;
  /** Snake trials: individuals of the community that came within detection distance of the model, and those of them that gave alert hoos. */
  encountered: number; callers: number;
}

/** Omniscient series recorded next to the observed ones, to measure observation bias. */
export interface TruthRecords {
  activity: Record<'male' | 'female', number[]>;
  pathM: Record<number, number>;
  largestFrac: number[]; wholeFrac: number[]; nestFrac: number[]; wakeMin: number[]; settleMin: number[];
  ground: number; channel: number; swollenDayHours: number; mates: number;
  encounters: number; encountersHeard: number; encountersSeen: number;
  /** Truth encounter episodes (the simulation's, one per community pair per gap): time and pair; and those in which a member of a followed party took part (classifier check at field scale, C5a). */
  encounterLog: { t: number; a: number; b: number }[]; followedEncounters: { team: number; other: number; t: number }[];
  /** Patrol episodes; `sector` is the patrol's target compass sector at its start and `facing` the community's neighbour-facing sectors then (T-PAT-9 check). */
  patrols: { troop: number; t0: number; t1: number; parts: number[]; sector: number; facing: number[] }[];
  groomMin: number[]; interactions: Record<string, number>;
  conflicts: number; fights: number; reconciliations: number; consolations: number; killings: number; hunts: number; huntSuccesses: number;
  huntHunters: number[]; cycles: number[]; alphaChanges: number;
  popStart: number; popEnd: number; tenseShare: number; rangeShift: number;
  kills: { t: number; victim: number; victimSex: string; victimAge: number; attackers: number[]; defenders: number; troop: number; victimTroop: number; kind: string }[];
}

export interface Weather { rainMm: number; afternoonMm: number; tmin: number[]; tmax: number[]; }

export interface Records {
  profile: string; seed: number; worldSeed: number; tickHours: number; ticks: number; days: number; troops: number[];
  /** world.time when observation started (hours; after any burn-in). */
  time0: number;
  /** Map side (logical m). */
  mapSize: number;
  points: PointTable; scans: ScanTable; follows: Follow[]; roster: RosterEntry[];
  events: EventRec[]; conflicts: ConflictRec[]; encounters: EncounterRec[]; hunts: HuntRec[]; calls: CallRec[];
  census: CensusRec[]; deaths: DeathRec[]; births: BirthRec[]; transfers: TransferRec[];
  phenology: PhenologyRec[]; transects: TransectRec[]; visits: TreeVisitRec[]; experiments: ExperimentRec[];
  alpha: { day: number; troop: number; id: number }[];
  /** Stage C8: daily respiratory-sign censuses, first sightings of a snare injury, early-morning stress readings and urine lean-mass samples. */
  health: HealthRec[]; snared: { id: number; t: number }[]; stress: SampleRec[]; lean: SampleRec[];
  femaleOrder: { day: number; troop: number; ids: number[] }[];
  /** environment.fruitIndex at each monthly phenology round, and that round's observation month (T-PAT-8). */
  fruitIndex: number[]; fruitMonth: number[];
  weather: Weather;
  truth: TruthRecords;
}

export function pointTable(): PointTable {
  const i = () => new Column('i32', 4096), u = () => new Column('u8', 4096), f = () => new Column('f32', 4096);
  return { t: i(), team: u(), focal: i(), cat: u(), action: u(), height: u(), party: u(), partyInd: u(), partyAM: u(), n5: u(), n10: u(), flags: u(), feed: u(), tree: i(), x: f(), z: f(), truthPatrol: u() };
}
export function scanTable(): ScanTable {
  const i = () => new Column('i32', 1024), u = () => new Column('u8', 1024), f = () => new Column('f32', 1024);
  return { t: i(), team: u(), focal: i(), size: u(), ind: u(), am: u(), af: u(), swollen: u(), prey: i(), preyDist: f(), tree: i(), canopy: f(), feedN: u(), cx: f(), cz: f(),
    memOff: i(), memN: u(), nearOff: i(), nearN: u(), members: new Column('i32', 8192), near: new Column('i32', 2048) };
}
export const pointCount = (p: PointTable) => p.t.n;
export const scanCount = (s: ScanTable) => s.t.n;

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

/** FNV-1a over bytes, two independent 32-bit lanes, as 16 hex digits. */
class Fnv {
  a = 0x811c9dc5; b = 0x01000193 ^ 0x9e3779b9;
  bytes(u8: Uint8Array): void {
    let a = this.a, b = this.b;
    for (let i = 0; i < u8.length; i++) { const v = u8[i]; a = Math.imul(a ^ v, 0x01000193); b = Math.imul(b ^ v, 0x01000193) ^ (b >>> 15); }
    this.a = a; this.b = b;
  }
  text(s: string): void { this.bytes(new TextEncoder().encode(s)); }
  hex(): string { return (this.a >>> 0).toString(16).padStart(8, '0') + (this.b >>> 0).toString(16).padStart(8, '0'); }
}

function hashColumns(h: Fnv, table: Record<string, Column>): void {
  for (const k of Object.keys(table)) { const v = table[k].view(); h.text(k); h.bytes(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); }
}

/** Deterministic fingerprint of all records (columns by bytes, objects by canonical JSON). */
export function recordsHash(r: Records): string {
  const h = new Fnv();
  hashColumns(h, r.points as unknown as Record<string, Column>);
  hashColumns(h, r.scans as unknown as Record<string, Column>);
  const rest: Record<string, unknown> = { ...r };
  delete rest.points; delete rest.scans;
  h.text(JSON.stringify(rest));
  return h.hex();
}

/** Empty records (constructed-scene tests and fixtures). */
export function emptyRecords(profile = 'compressed'): Records {
  return {
    profile, seed: 1, worldSeed: 1, tickHours: 15 / 3600, ticks: 0, days: 0, time0: 0, troops: [1, 2, 3], mapSize: 160, points: pointTable(), scans: scanTable(), follows: [], roster: [], events: [], conflicts: [],
    encounters: [], hunts: [], calls: [], census: [], deaths: [], births: [], transfers: [], phenology: [], transects: [], visits: [], experiments: [], alpha: [], health: [], snared: [], stress: [], lean: [], femaleOrder: [], fruitIndex: [], fruitMonth: [],
    weather: { rainMm: 0, afternoonMm: 0, tmin: [], tmax: [] },
    truth: { activity: { male: [0, 0, 0, 0, 0, 0], female: [0, 0, 0, 0, 0, 0] }, pathM: {}, largestFrac: [], wholeFrac: [], nestFrac: [], wakeMin: [], settleMin: [], ground: 0, channel: 0, swollenDayHours: 0, mates: 0,
      encounters: 0, encountersHeard: 0, encountersSeen: 0, encounterLog: [], followedEncounters: [], patrols: [], groomMin: [], interactions: {}, conflicts: 0, fights: 0, reconciliations: 0, consolations: 0, killings: 0, hunts: 0, huntSuccesses: 0,
      huntHunters: [], cycles: [], alphaChanges: 0, popStart: 0, popEnd: 0, tenseShare: 0, rangeShift: 0, kills: [] },
  };
}
