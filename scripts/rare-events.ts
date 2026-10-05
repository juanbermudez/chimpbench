// Rare-event counts on simulation truth (track E, part D1 of the user's decision of 4 October 2026; the families, the
// events and the minimum counts are registered in docs/staging/e-rebaseline.md "Part D"). For a 12-month run folder of
// scripts/e-run.ts (parts/<label>.s<seed>.part.json.gz and the end checkpoint parts/<label>.s<seed>.ckpt-d<D>.v8.gz), it
// counts per seed, per run and pooled over a group of runs every event part D lists, with the time at risk, and prints
// them per family beside the field bands of T-LET-1, -2, -3, -6, T-DEM-1, -4, -5, -6, -8, -9 and T-PAT-9.
//
//   pnpm exec tsx scripts/rare-events.ts --group S39=<run>,<run>,… [--group T0=<run>,…] [--reference S39]
//        [--out <prefix>] [--partial] [--no-mid]
//
// It runs no simulation: it reads the part files first and the checkpoint worlds for what the parts do not hold. A
// checkpoint holds the world at the end of the scored window (the dead stay in world.chimps with their time and cause
// of death), the field observer's three team sets with their simulation-truth series (truth.kills, truth.patrols, the
// truth interaction counts) and world.stats at the start of observation (obs.statsStart), so counters are windowed
// exactly. A ladder run (an m12 run resumed from an m6 checkpoint) also names the checkpoint it resumed from
// (part.resumedFrom); it is read as a second snapshot of the same run (--no-mid skips it) to recover per-animal memory
// the end state has lost (the sim slims a dead animal's hidden state and memories 30 days after death, life.ts slimDead).
//
// Where an event leaves no complete record the count is a lower bound and says so (`lower` in the JSON, "≥" in the
// tables): the world's event feed keeps its last 200 entries (eventCap), an animal its last 12 episodes (episodeCap) and a
// month's 16 most important memory notes (memLedgerEvents; digests keep 8 a month and 5 a year). Epidemic arrivals and
// snare injuries are counted over the whole run (burn-in included), with the time at risk of the whole run, because an
// outbreak's arrival time and a snare's time are not kept after the fact; every other count is on the scored window.
//
// Definitions (simulation truth; src/sim unless a path is given):
//   killing, intergroup        death cause "killed in an intergroup attack" (conflict.ts:279-290, gangAttack)
//   killing, infanticide       death cause "infanticide by …" (conflict.ts:315-320); between/within from the killer's
//                              community in the observer's truth record (src/field/protocols.ts:173-186)
//   killing, within community  death cause "wounds from a fight with …" (conflict.ts:255; resolveFight only reaches it
//                              for two members of one community, conflict.ts:235)
//   serious injury             a fight wound >= 0.3 ("seriously wounded", conflict.ts:125), remembered by the loser as
//                              "Badly wounded in a fight with …" (relations.ts:59): lower bound
//   attack on a stranger       gangAttack resolutions (conflict.ts:260-301): the lethal ones (exact) plus the
//                              non-lethal ones the victim remembers (conflict.ts:294) or the feed still holds
//                              (conflict.ts:297): lower bound
//   death by cause             world.chimps with deathTime in the window and causeOfDeath (life.ts:16-30)
//   mother's death leaving     a female's death with an offspring alive and under adoptMaxAgeY (life.ts:59; weaning
//   dependent offspring        ages 4.1-5.2 y are below it, so "unweaned" adds none)
//   adoption                   adopt() found a carer (life.ts:72-90): known for orphans whose hidden state survives
//   carrying a dead infant     a death under carryDeadMaxAgeY with the mother alive opens the carry roll (life.ts:37-48):
//                              opportunities exact; carries recorded only while remembered: lower bound
//   bereavement episode        an offspring in the mother's community under bereaveMaxAgeY at her death (life.ts:58)
//   epidemic arrival           disease.ts:17-35 (ids from state.ts:329, nextOutbreak 1 at creation): whole run, exact
//   outbreak case, death       x.outbreak (disease.ts:85-89; lower bound) and cause "respiratory illness (outbreak)"
//                              (disease.ts:75; exact)
//   snare injury               c.snared (snares.ts:37; permanent, also on the dead; no founder starts snared): whole run,
//                              exact; death cause "snare injury" (snares.ts:41)
//   natal transfer             world.stats.transfers (reproduction.ts:203; only natal females transfer, :86): exact
// Time at risk: community-years as the observer counts them (src/field/derive.ts:138, days / 365 per community);
// chimp-years and infant-years in age-years (365.25 d) of every animal alive in the window.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { necropsy } from '../src/field/protocols';
import type { Records } from '../src/field/records';
import { paramsOf } from '../src/sim/params';
import type { ChimpX, SimState } from '../src/sim/state';
import type { Chimp, SimEvent, World, WorldStats } from '../src/types';
import { readCheckpoint } from './lib/checkpoint';
import { decodeLossless } from './lib/lossless-json';

/** Age-years in world hours (src/field/derive.ts YEAR_H; the age clock at ageRate 1). */
export const YEAR_H = 365.25 * 24;
/** Community-years as the field observer counts them (src/field/derive.ts:138: years = days / 365). */
export const CY_H = 365 * 24;
/** Minimum pooled counts registered before any count (docs/staging/e-rebaseline.md "Part D"). */
export const MIN_RATE = 10, MIN_PATTERN = 20, MIN_ARM = 5;

const sim = (c: Chimp): ChimpX | undefined => (c as Chimp & { sim?: ChimpX }).sim;
const inWin = (t: number | null, a: number, b: number) => t !== null && t > a && t <= b;
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const median = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Cause of death without the names in it (the part keeps the raw text). */
export function causeKey(cause: string): string {
  if (cause.startsWith('infanticide by')) return 'infanticide';
  if (cause.startsWith('killed in an intergroup attack')) return 'killed in an intergroup attack';
  if (cause.startsWith('wounds from a fight')) return 'wounds from a fight';
  return cause;
}
/** The killing a death cause records, or null (conflict.ts:255, :289, :319). */
export function killingKind(cause: string | null): 'intergroup' | 'infanticide' | 'fight' | null {
  if (!cause) return null;
  if (cause.startsWith('killed in an intergroup attack')) return 'intergroup';
  if (cause.startsWith('infanticide by')) return 'infanticide';
  if (cause.startsWith('wounds from a fight with')) return 'fight';
  return null;
}

// ---------------------------------------------------------------------------
// Snapshots: what the counter needs from one saved world
// ---------------------------------------------------------------------------

interface Note { time: number; text: string; otherId: number }
/** Hidden per-animal state and memories that the sim drops 30 days after a death (life.ts slimDead). */
export interface SnapChimp {
  outbreak: number; ill: number; caretaker: number; immigrantAge: number; carryingDeadId: number;
  /** Memory notes (the month ledger and every digest) and episodes, as kept at the snapshot. */
  notes: Note[]; episodes: Note[];
}
export interface Snapshot {
  time: number; nextOutbreak: number;
  /** The outbreak running in each community at the snapshot (disease.ts:28). */
  running: { troop: number; id: number; start: number }[];
  chimps: Map<number, SnapChimp>;
  /** Animals with a snare injury at the snapshot (the flag is permanent). */
  snared: Set<number>;
  events: SimEvent[];
}

/** Reads a snapshot from a world. Pure: never creates hidden state (ix() would, on slimmed dead records). */
export function snapshotOf(world: World): Snapshot {
  const s = (world as World & { sim: SimState }).sim;
  const chimps = new Map<number, SnapChimp>(), snared = new Set<number>();
  for (const c of world.chimps) {
    if (c.snared) snared.add(c.id);
    const x = sim(c);
    if (!x) continue;
    const notes: Note[] = [...(x.month?.events ?? []), ...(c.digests ?? []).flatMap(d => d.events)].map(e => ({ time: e.time, text: e.text, otherId: e.otherId }));
    chimps.set(c.id, { outbreak: x.outbreak, ill: x.ill, caretaker: x.caretaker, immigrantAge: x.immigrantAge, carryingDeadId: c.carryingDeadId ?? -1,
      notes, episodes: c.episodes.map(e => ({ time: e.time, text: e.text, otherId: e.otherId })) });
  }
  const running = Object.entries(s.outbreaks).map(([k, v]) => ({ troop: +k, id: v.id, start: v.start }));
  return { time: world.time, nextOutbreak: s.nextOutbreak, running, chimps, snared, events: world.events.slice() };
}

// ---------------------------------------------------------------------------
// One seed
// ---------------------------------------------------------------------------

/** What the counter reads from a part file (scripts/lib/bench-run.ts BenchPart). */
export interface PartLite {
  seed: number; days: number; burnInDays: number;
  deathsByCause: Record<string, number>; deaths: number; births: number;
  /** The energy readout's deaths by class and cause (energy-probe), when the run had it. */
  deathsByClass: Record<string, number> | null;
  /** T-LET-1 as the part holds it: observed + inferred killings, community-years, and truth killings per community-year. */
  let1: { num: number; den: number; truth: number } | null;
  /** T-PAT-9's per-community-year raw values (simulation truth). */
  pat9: { ok: number[]; top: number[] } | null;
  observedTransfers: number;
  checkpoints: string[]; resumedFrom: string | null;
}

export interface SeedInput {
  seed: number; world: World;
  /** The main team set's records and the world counters when it started (scripts/lib/bench-run.ts RunState.obs). */
  rec: Records; statsStart: WorldStats;
  /** Observation start (end of the burn-in) and world.time at createWorld, in world hours. */
  t0: number; runStart: number;
  /** Earlier snapshots of the same run (the checkpoint a ladder run resumed from). */
  mids: Snapshot[];
  part: PartLite | null;
}

export interface OutbreakRow { id: number; troop: number; cases: number; deaths: number; size: number; attack: number | null; mortality: number | null; first: number | null; dated: 'window' | 'burn-in' | 'undated' }
export interface Victim { id: number; t: number; kind: 'intergroup' | 'infanticide-between' | 'infanticide-within' | 'fight'; sex: string; age: number; troop: number; killerTroop: number; attackers: number; defenders: number; onPatrol: boolean | null }

export interface SeedCounts {
  seed: number; t0: number; t1: number; days: number; runDays: number;
  exposure: { communities: number; communityYears: number; chimpYears: number; infantYears: number; runCommunityYears: number; runChimpYears: number };
  killings: { all: number; intergroup: number; infanticideBetween: number; infanticideWithin: number; fight: number; intercommunity: number; maleVictims: number;
    /** Intercommunity killings with the observer's truth record (attackers, defenders) and those during a truth patrol of the killers' community. */
    withRecord: number; onPatrol: number; odds: number[]; victims: Victim[] };
  injury: { serious: number; strangerAttacks: number; strangerAttacksNonLethal: number;
    /** world.stats.injuries over the window: wounds >= 0.05 in decided contests (conflict.ts:115) and every gang-attack resolution (conflict.ts:266). */
    woundsCounter: number;
    /** Infanticidal attacks started (truth interactions of kind infanticide, execution.ts:302-304, less the kills' own flash, conflict.ts:316): the defence roll's opportunities at most. */
    infanticideAttacks: number;
    /** Charges and attacks at strangers started (truth interactions of kind intergroup, execution.ts:300). */
    strangerActs: number;
    /** Hazard deaths with wounds above 0.5 (life.ts:213; not killings). */
    complicationsOfWounds: number };
  deaths: { all: number; byCause: Record<string, number>; disease: number; aggression: number; other: number; respiratory: number; firstYear: number; births: number };
  family: { motherDeaths: number; motherDeathsWithDependents: number; dependents: number; adopted: number; notAdopted: number; adoptionUnknown: number;
    carryOpportunities: number; carriesRecorded: number; bereaved: number; motherDeathsBereaving: number; sameTickTies: number };
  disease: { arrivals: number; arrivalsDatedWindow: number; arrivalsDatedBurnIn: number; arrivalsUndated: number; outbreaks: OutbreakRow[]; epidemics20: number;
    respiratoryDeaths: number; outbreakDeathsUnattributed: number };
  snares: { injuredRun: number; injuredByMid: number | null; deathsWindow: number; prevalenceNum: number; prevalenceDen: number };
  dispersal: { transfers: number; datedInWindow: number; observed: number | null };
  patrols: { truth: number; pat9: { ok: number[]; top: number[] } | null };
  check: { deathsPart: Record<string, number> | null; deathsWorld: Record<string, number>; deathsMatch: boolean | null;
    /** Killings by the counter (stats), by death causes in the world, by the observer's truth record (victims) and by the part (T-LET-1 truth × community-years). */
    killingsStats: number; killingsWorld: number; killingsObserver: number; killingsPart: number | null; killingsMatch: boolean;
    /** Extra entries in the observer's truth.kills beyond one per victim (an infanticidal attack's start recorded as a kill). */
    observerDuplicates: number;
    /** Victims of team-detected 'kill'/'infanticide' events (src/field/metrics.ts:1426 counts them as observed killings) who did not die of a killing. */
    observedNotKilled: number;
    communityYearsPart: number | null; energyDeaths: number | null };
  /** Which counts are lower bounds (records capped or dropped). */
  lower: string[];
}

/** Counts one seed. Pure: reads the world, the records and the snapshots; writes nothing. */
export function countSeed(inp: SeedInput): SeedCounts {
  const w = inp.world, P = paramsOf(w), rec = inp.rec, T = rec.truth;
  const t0 = inp.t0, t1 = w.time, run0 = inp.runStart;
  const end = snapshotOf(w);
  const snaps = [...inp.mids.filter(s => s.time < end.time), end].sort((a, b) => a.time - b.time);
  const byId = new Map(w.chimps.map(c => [c.id, c]));
  const troopName = new Map(w.troops.map(t => [t.id, t.name]));
  const st = w.stats, s0 = inp.statsStart;

  // time at risk
  const communities = w.troops.length;
  const communityYears = communities * (t1 - t0) / CY_H, runCommunityYears = communities * (t1 - run0) / CY_H;
  let chimpH = 0, runChimpH = 0, infantH = 0;
  for (const c of w.chimps) {
    const d = c.deathTime ?? t1;
    chimpH += overlap(c.birthTime, d, t0, t1); runChimpH += overlap(c.birthTime, d, run0, t1);
    infantH += overlap(c.birthTime, Math.min(d, c.birthTime + YEAR_H), t0, t1);
  }
  const ageAt = (c: Chimp, t: number) => (t - c.birthTime) / YEAR_H;
  // Was `a` alive when `b` died? Deaths at one time are ordered as a tick makes them: the slow step first (slowLife's
  // hazard deaths, then outbreaks, then snares; tick.ts:36, :102-104), then the animals' acts (killings, fight wounds),
  // and within one step in world.chimps order (index().alive, state.ts:384)
  const order = new Map(w.chimps.map((c, i) => [c.id, i]));
  const phase = (c: Chimp) => { const k = c.causeOfDeath ?? ''; return k.startsWith('respiratory illness (outbreak)') ? 2 : k === 'snare injury' ? 3 : killingKind(k) ? 4 : 1; };
  const aliveAt = (a: Chimp, b: Chimp) => a.deathTime === null || a.deathTime > b.deathTime! ||
    (a.deathTime === b.deathTime && (phase(a) > phase(b) || (phase(a) === phase(b) && order.get(a.id)! > order.get(b.id)!)));

  // deaths in the window (scripts/lib/viability.ts:46-49 counts deathTime > start)
  const dead = w.chimps.filter(c => !c.alive && inWin(c.deathTime, t0, t1));
  const deathsWorld: Record<string, number> = {}, byCause: Record<string, number> = {};
  let disease = 0, aggression = 0, other = 0, respiratory = 0, firstYear = 0, complications = 0;
  for (const c of dead) {
    const cause = c.causeOfDeath ?? 'unknown';
    deathsWorld[cause] = (deathsWorld[cause] ?? 0) + 1;
    const k = causeKey(cause); byCause[k] = (byCause[k] ?? 0) + 1;
    const n = necropsy(cause); // the observer's necropsy classes (src/field/protocols.ts:44-49), so T-DEM-4 reads alike
    if (n.cause === 'disease') disease++; else if (n.cause === 'aggression') aggression++; else other++;
    if (n.respiratory) respiratory++;
    if (ageAt(c, c.deathTime!) < 1) firstYear++;
    if (cause === 'complications of wounds') complications++;
  }
  const births = w.chimps.filter(c => c.birthTime > t0 && c.birthTime <= t1).length;

  // killings
  // the observer's truth record of each killing, one per victim: it also takes an infanticidal attack's own start
  // (execution.ts:302 gives it kind 'infanticide'; src/field/protocols.ts:177 keeps every 'infanticide' interaction of the
  // scan), so one infanticide can appear twice; the kill is the later entry
  const truthKill = new Map<number, (typeof T.kills)[number]>();
  for (const k of T.kills) { const had = truthKill.get(k.victim); if (!had || k.t >= had.t) truthKill.set(k.victim, k); }
  const victims: Victim[] = [];
  for (const c of dead) {
    const kind = killingKind(c.causeOfDeath);
    if (!kind) continue;
    const tk = truthKill.get(c.id);
    let killerTroop = tk ? tk.troop : -1;
    if (killerTroop < 0 && kind === 'infanticide') { const m = /\(([^()]*)\)\s*$/.exec(c.causeOfDeath!); const hit = m ? w.troops.find(t => t.name === m[1]) : undefined; killerTroop = hit ? hit.id : -1; }
    if (kind === 'fight') killerTroop = c.troopId;
    const k: Victim['kind'] = kind === 'infanticide' ? (killerTroop >= 0 && killerTroop !== c.troopId ? 'infanticide-between' : 'infanticide-within') : kind;
    let onPatrol: boolean | null = null;
    if (k === 'intergroup' || k === 'infanticide-between') {
      const t = c.deathTime!;
      onPatrol = T.patrols.some(p => p.troop === killerTroop && p.t0 <= t + 1e-9 && (p.t1 < 0 || t <= p.t1 + 1e-9));
    }
    victims.push({ id: c.id, t: c.deathTime!, kind: k, sex: c.sex, age: ageAt(c, c.deathTime!), troop: c.troopId, killerTroop, attackers: tk ? tk.attackers.length : -1, defenders: tk ? tk.defenders : -1, onPatrol });
  }
  const inter = victims.filter(v => v.kind === 'intergroup' || v.kind === 'infanticide-between');
  const withRec = inter.filter(v => v.attackers >= 0);

  // injuries (memories and the feed: lower bounds)
  const serious = new Set<string>(), stranger = new Set<string>();
  for (const sn of snaps) {
    for (const [id, x] of sn.chimps) for (const n of x.notes) {
      if (!inWin(n.time, t0, t1)) continue;
      if (n.text.startsWith('Badly wounded in a fight with')) serious.add(`${id}@${n.time}`);          // relations.ts:59
      else if (n.text.startsWith('Wounded in an attack by')) stranger.add(`${id}@${n.time}`);          // conflict.ts:294
    }
    for (const e of sn.events) if (inWin(e.time, t0, t1) && e.kind === 'territory' && / escaped wounded$/.test(e.text) && e.actors.length >= 2) stranger.add(`${e.actors[1]}@${e.time}`); // conflict.ts:297
  }
  const intergroupKills = victims.filter(v => v.kind === 'intergroup').length;
  const infKills = victims.filter(v => v.kind.startsWith('infanticide')).length;

  // mothers, orphans, adoption, carrying, bereavement
  // the latest snapshot holding an animal's hidden state, and the first one after a time (closest to an event)
  const lastSnap = (id: number) => { let hit: SnapChimp | undefined; for (const sn of snaps) { const x = sn.chimps.get(id); if (x) hit = x; } return hit; };
  const firstSnapAfter = (id: number, t: number) => { for (const sn of snaps) if (sn.time >= t) { const x = sn.chimps.get(id); if (x) return x; } return undefined; };
  const anyEpisode = (pred: (n: Note) => boolean) => snaps.some(sn => [...sn.chimps.values()].some(x => x.episodes.some(pred)));
  let motherDeaths = 0, withDependents = 0, dependents = 0, adopted = 0, notAdopted = 0, unknown = 0, bereaved = 0, bereaving = 0, ties = 0;
  for (const m of dead) {
    if (m.sex !== 'female') continue;
    const t = m.deathTime!;
    const kids = w.chimps.filter(k => k.motherId === m.id && k.birthTime < t);
    if (!kids.length) continue;
    motherDeaths++;
    let dep = 0, ber = 0;
    for (const k of kids) {
      if (k.deathTime !== null && k.deathTime === t) ties++;
      const alive = aliveAt(k, m);
      if (!alive) continue;
      const a = ageAt(k, t);
      // community at her death: a natal female transfers only from dispersalMinAgeY (reproduction.ts:86); a later transfer is undone
      const kx = lastSnap(k.id);
      const transferT = kx && kx.immigrantAge >= 0 && k.troopId !== k.natalTroopId ? k.birthTime + kx.immigrantAge * YEAR_H : null;
      const troopThen = k.troopId !== k.natalTroopId && (a < P.dispersalMinAgeY || (transferT !== null && transferT > t)) ? k.natalTroopId : k.troopId;
      if (troopThen === m.troopId && a < P.bereaveMaxAgeY) ber++;             // life.ts:58
      if (a < P.adoptMaxAgeY) {                                                 // life.ts:59 (weaning ages are below it)
        dep++;
        // adopt() ran at her death (life.ts:59, :85): the orphan's caretaker in the first snapshot after it (a carer's
        // later death can re-run it, life.ts:60-62), else a remembered adoption, else unknown (record slimmed)
        const x = firstSnapAfter(k.id, t);
        if (x) { if (x.caretaker > 0 && x.caretaker !== m.id) adopted++; else notAdopted++; }
        else if (anyEpisode(n => n.otherId === k.id && n.time >= t && n.text.startsWith('Adopted the orphan')) ||
          snaps.some(sn => sn.events.some(e => e.time >= t && e.text.includes('is now cared for by') && e.actors[0] === k.id))) adopted++;   // life.ts:87-88
        else unknown++;
      }
    }
    dependents += dep; if (dep) withDependents++;
    bereaved += ber; if (ber) bereaving++;
  }
  let carryOpp = 0, carries = 0;
  for (const c of dead) {
    const t = c.deathTime!, mother = byId.get(c.motherId);
    if (!mother || ageAt(c, t) >= P.carryDeadMaxAgeY) continue;
    if (!aliveAt(mother, c)) continue;                                       // life.ts:34 (mother alive), :43 (age), then the roll
    carryOpp++;
    const seen = snaps.some(sn => sn.chimps.get(mother.id)?.carryingDeadId === c.id
      || (sn.chimps.get(mother.id)?.episodes.some(e => e.otherId === c.id && e.text.startsWith('Carrying the body of my infant')) ?? false)
      || sn.events.some(e => e.text.includes('is carrying the body of her dead infant') && e.actors[0] === mother.id && e.actors[1] === c.id));
    if (seen) carries++;
  }

  // disease
  const illH = 24 * P.epidemicIllDays;
  const arrivals = end.nextOutbreak - 1; // state.ts:329 starts at 1; disease.ts:25 takes one id per arrival
  const mid0 = snaps.length > 1 ? snaps[snaps.length - 2] : null;
  const cases = new Map<number, Set<number>>(), evidence = new Map<number, number[]>();
  const ev = (id: number, t: number) => { if (id > 0) (evidence.get(id) ?? evidence.set(id, []).get(id)!).push(t); };
  const outbreakOf = new Map<number, number>();
  for (const sn of snaps) {
    for (const r of sn.running) ev(r.id, r.start);
    for (const [id, x] of sn.chimps) {
      if (x.outbreak <= 0) continue;
      (cases.get(x.outbreak) ?? cases.set(x.outbreak, new Set()).get(x.outbreak)!).add(id);
      outbreakOf.set(id, x.outbreak);
      if (x.ill > sn.time) ev(x.outbreak, x.ill - illH);
      for (const e of x.episodes) if (e.text === 'Recovered from a respiratory illness') ev(x.outbreak, e.time - illH);
    }
  }
  for (const h of rec.health) for (const id of h.ids) { const o = outbreakOf.get(id); if (o) ev(o, (h.day - 1) * 24 + 14.5); } // census at 21:00 (src/sim/environment.ts:50)
  const troopOf = (id: number) => { const n = new Map<number, number>(); for (const c of cases.get(id) ?? []) { const t = byId.get(c)?.troopId ?? -1; n.set(t, (n.get(t) ?? 0) + 1); } let best = -1, bn = 0; for (const [t, k] of n) if (k > bn) { best = t; bn = k; } return best; };
  const obDeaths = w.chimps.filter(c => !c.alive && (c.causeOfDeath ?? '').startsWith('respiratory illness (outbreak)') && c.deathTime! > run0);
  const deathsOf = new Map<number, number[]>();
  let unattributed = 0;
  for (const c of obDeaths) {
    let id = outbreakOf.get(c.id) ?? -1;
    if (id < 0) {
      // hidden state slimmed: the outbreak of its community with evidence nearest in time (outbreaks in one community never overlap, disease.ts:22)
      let best = Infinity;
      for (let k = 1; k < end.nextOutbreak; k++) {
        if (troopOf(k) !== c.troopId) continue;
        for (const t of evidence.get(k) ?? []) { const d = Math.abs(t - c.deathTime!); if (d < best && d <= 60 * 24) { best = d; id = k; } }
      }
    }
    if (id < 0) { unattributed++; continue; }
    (deathsOf.get(id) ?? deathsOf.set(id, []).get(id)!).push(c.id);
    ev(id, c.deathTime! - illH);
  }
  const outbreaks: OutbreakRow[] = [];
  for (let id = 1; id < end.nextOutbreak; id++) {
    const ids = new Set([...(cases.get(id) ?? []), ...(deathsOf.get(id) ?? [])]);
    let troop = troopOf(id);
    if (troop < 0) { const d = deathsOf.get(id)?.[0]; troop = d !== undefined ? byId.get(d)!.troopId : end.running.find(r => r.id === id)?.troop ?? -1; }
    const times = evidence.get(id) ?? [], first = times.length ? Math.min(...times) : null;
    const at = first ?? t0;
    const size = w.chimps.filter(c => c.troopId === troop && c.birthTime <= at && (c.deathTime === null || c.deathTime > at)).length;
    const nd = deathsOf.get(id)?.length ?? 0;
    outbreaks.push({ id, troop, cases: ids.size, deaths: nd, size, attack: size ? ids.size / size : null, mortality: size ? nd / size : null, first,
      // evidence times are infection times (or sightings), never before the arrival; an id at or above an earlier
      // snapshot's nextOutbreak arrived after that snapshot (ids are taken in arrival order, disease.ts:25)
      dated: (first !== null && first > t0) || (mid0 !== null && mid0.time >= t0 && id >= mid0.nextOutbreak) ? 'window' : first !== null ? 'burn-in' : 'undated' });
  }

  // snares (whole run: the flag is permanent and no founder starts with one)
  const snaredRun = w.chimps.filter(c => c.snared).length;
  let prevNum = 0, prevDen = 0;
  for (const c of w.chimps) if (c.alive && ageAt(c, t1) > 3) { prevDen++; if (c.snared) prevNum++; }

  // dispersal
  const transfers = st.transfers - s0.transfers;
  const dated = new Set<number>();
  for (const sn of snaps) for (const [id, x] of sn.chimps) {
    const c = byId.get(id);
    if (!c || x.immigrantAge < 0 || c.troopId === c.natalTroopId) continue;
    if (inWin(c.birthTime + x.immigrantAge * YEAR_H, t0, t1)) dated.add(id);
  }

  // cross-checks (a second route to the same count)
  const killingsWorld = intergroupKills + infKills, killingsStats = st.killings - s0.killings;
  const killingsPart = inp.part?.let1 ? Math.round(inp.part.let1.truth * inp.part.let1.den) : null;
  const deathsPart = inp.part ? inp.part.deathsByCause : null;
  const same = (a: Record<string, number>, b: Record<string, number>) => { const k = new Set([...Object.keys(a), ...Object.keys(b)]); for (const x of k) if ((a[x] ?? 0) !== (b[x] ?? 0)) return false; return true; };
  const lower = ['injury.serious', 'injury.strangerAttacks', 'injury.strangerAttacksNonLethal', 'family.carriesRecorded', 'disease.outbreaks[].cases', 'dispersal.datedInWindow'];

  return {
    seed: inp.seed, t0, t1, days: (t1 - t0) / 24, runDays: (t1 - run0) / 24,
    exposure: { communities, communityYears, chimpYears: chimpH / YEAR_H, infantYears: infantH / YEAR_H, runCommunityYears, runChimpYears: runChimpH / YEAR_H },
    killings: { all: victims.length, intergroup: intergroupKills, infanticideBetween: victims.filter(v => v.kind === 'infanticide-between').length,
      infanticideWithin: victims.filter(v => v.kind === 'infanticide-within').length, fight: victims.filter(v => v.kind === 'fight').length,
      intercommunity: inter.length, maleVictims: victims.filter(v => v.sex === 'male').length, withRecord: withRec.length,
      onPatrol: inter.filter(v => v.onPatrol).length, odds: withRec.map(v => v.attackers / Math.max(1, v.defenders)), victims },
    injury: { serious: serious.size, strangerAttacks: intergroupKills + stranger.size, strangerAttacksNonLethal: stranger.size, woundsCounter: st.injuries - s0.injuries,
      infanticideAttacks: Math.max(0, (T.interactions.infanticide ?? 0) - infKills), strangerActs: T.interactions.intergroup ?? 0,
      complicationsOfWounds: complications },
    deaths: { all: dead.length, byCause, disease, aggression, other, respiratory, firstYear, births },
    family: { motherDeaths, motherDeathsWithDependents: withDependents, dependents, adopted, notAdopted, adoptionUnknown: unknown, carryOpportunities: carryOpp, carriesRecorded: carries,
      bereaved, motherDeathsBereaving: bereaving, sameTickTies: ties },
    disease: { arrivals, arrivalsDatedWindow: outbreaks.filter(o => o.dated === 'window').length, arrivalsDatedBurnIn: outbreaks.filter(o => o.dated === 'burn-in').length,
      arrivalsUndated: outbreaks.filter(o => o.dated === 'undated').length, outbreaks, epidemics20: outbreaks.filter(o => (o.attack ?? 0) >= 0.2).length,
      respiratoryDeaths: respiratory, outbreakDeathsUnattributed: unattributed },
    snares: { injuredRun: snaredRun, injuredByMid: mid0 ? mid0.snared.size : null, deathsWindow: dead.filter(c => c.causeOfDeath === 'snare injury').length, prevalenceNum: prevNum, prevalenceDen: prevDen },
    dispersal: { transfers, datedInWindow: dated.size, observed: inp.part ? inp.part.observedTransfers : null },
    patrols: { truth: T.patrols.length, pat9: inp.part?.pat9 ?? null },
    check: { deathsPart, deathsWorld, deathsMatch: deathsPart ? same(deathsPart, deathsWorld) : null,
      killingsStats, killingsWorld, killingsObserver: truthKill.size, observerDuplicates: T.kills.length - truthKill.size,
      observedNotKilled: new Set(rec.events.filter(e => (e.kind === 'kill' || e.kind === 'infanticide') && !killingKind(byId.get(e.target)?.causeOfDeath ?? null)).map(e => e.target)).size, killingsPart,
      killingsMatch: killingsWorld === killingsStats && killingsWorld === truthKill.size && (killingsPart === null || killingsPart === killingsWorld),
      communityYearsPart: inp.part?.let1 ? inp.part.let1.den : null,
      energyDeaths: inp.part?.deathsByClass ? Object.values(inp.part.deathsByClass).reduce((a, b) => a + b, 0) : null },
    lower,
  };
}

// ---------------------------------------------------------------------------
// Pooling and the report
// ---------------------------------------------------------------------------

export interface Pool {
  seeds: number; communityYears: number; chimpYears: number; infantYears: number; runCommunityYears: number; runChimpYears: number;
  killings: number; intergroup: number; infanticideBetween: number; infanticideWithin: number; fight: number; intercommunity: number; maleVictims: number; withRecord: number; onPatrol: number; odds: number[];
  serious: number; strangerAttacks: number; strangerAttacksNonLethal: number; woundsCounter: number; infanticideAttacks: number; strangerActs: number; complicationsOfWounds: number;
  deaths: number; byCause: Record<string, number>; disease: number; aggression: number; other: number; respiratory: number; firstYear: number; births: number;
  motherDeaths: number; motherDeathsWithDependents: number; dependents: number; adopted: number; notAdopted: number; adoptionUnknown: number; carryOpportunities: number; carriesRecorded: number; bereaved: number; motherDeathsBereaving: number;
  arrivals: number; arrivalsDatedWindow: number; epidemics20: number; outbreakCases: number; outbreakDeaths: number; attack20: number[]; mortality20: number[];
  snaredRun: number; snareDeaths: number; prevalenceNum: number; prevalenceDen: number;
  transfers: number; truthPatrols: number; pat9ok: number[]; pat9top: number[];
  observerDuplicates: number; observedNotKilled: number; checksFailed: string[];
}

export function pool(list: SeedCounts[], label = ''): Pool {
  const p: Pool = { seeds: 0, communityYears: 0, chimpYears: 0, infantYears: 0, runCommunityYears: 0, runChimpYears: 0, killings: 0, intergroup: 0, infanticideBetween: 0, infanticideWithin: 0, fight: 0, intercommunity: 0,
    maleVictims: 0, withRecord: 0, onPatrol: 0, odds: [], serious: 0, strangerAttacks: 0, strangerAttacksNonLethal: 0, woundsCounter: 0, infanticideAttacks: 0, strangerActs: 0, complicationsOfWounds: 0,
    deaths: 0, byCause: {}, disease: 0, aggression: 0, other: 0, respiratory: 0, firstYear: 0, births: 0, motherDeaths: 0, motherDeathsWithDependents: 0, dependents: 0, adopted: 0, notAdopted: 0,
    adoptionUnknown: 0, carryOpportunities: 0, carriesRecorded: 0, bereaved: 0, motherDeathsBereaving: 0, arrivals: 0, arrivalsDatedWindow: 0, epidemics20: 0, outbreakCases: 0, outbreakDeaths: 0,
    attack20: [], mortality20: [], snaredRun: 0, snareDeaths: 0, prevalenceNum: 0, prevalenceDen: 0, transfers: 0, truthPatrols: 0, pat9ok: [], pat9top: [], observerDuplicates: 0, observedNotKilled: 0, checksFailed: [] };
  for (const s of list) {
    p.seeds++;
    const e = s.exposure; p.communityYears += e.communityYears; p.chimpYears += e.chimpYears; p.infantYears += e.infantYears; p.runCommunityYears += e.runCommunityYears; p.runChimpYears += e.runChimpYears;
    const k = s.killings; p.killings += k.all; p.intergroup += k.intergroup; p.infanticideBetween += k.infanticideBetween; p.infanticideWithin += k.infanticideWithin; p.fight += k.fight;
    p.intercommunity += k.intercommunity; p.maleVictims += k.maleVictims; p.withRecord += k.withRecord; p.onPatrol += k.onPatrol; p.odds.push(...k.odds);
    const i = s.injury; p.serious += i.serious; p.strangerAttacks += i.strangerAttacks; p.strangerAttacksNonLethal += i.strangerAttacksNonLethal; p.woundsCounter += i.woundsCounter;
    p.infanticideAttacks += i.infanticideAttacks; p.strangerActs += i.strangerActs; p.complicationsOfWounds += i.complicationsOfWounds;
    const d = s.deaths; p.deaths += d.all; p.disease += d.disease; p.aggression += d.aggression; p.other += d.other; p.respiratory += d.respiratory; p.firstYear += d.firstYear; p.births += d.births;
    for (const [c, n] of Object.entries(d.byCause)) p.byCause[c] = (p.byCause[c] ?? 0) + n;
    const f = s.family; p.motherDeaths += f.motherDeaths; p.motherDeathsWithDependents += f.motherDeathsWithDependents; p.dependents += f.dependents; p.adopted += f.adopted; p.notAdopted += f.notAdopted;
    p.adoptionUnknown += f.adoptionUnknown; p.carryOpportunities += f.carryOpportunities; p.carriesRecorded += f.carriesRecorded; p.bereaved += f.bereaved; p.motherDeathsBereaving += f.motherDeathsBereaving;
    const x = s.disease; p.arrivals += x.arrivals; p.arrivalsDatedWindow += x.arrivalsDatedWindow; p.epidemics20 += x.epidemics20;
    for (const o of x.outbreaks) { p.outbreakCases += o.cases; p.outbreakDeaths += o.deaths; if ((o.attack ?? 0) >= 0.2) { p.attack20.push(o.attack!); p.mortality20.push(o.mortality ?? 0); } }
    p.snaredRun += s.snares.injuredRun; p.snareDeaths += s.snares.deathsWindow; p.prevalenceNum += s.snares.prevalenceNum; p.prevalenceDen += s.snares.prevalenceDen;
    p.transfers += s.dispersal.transfers; p.truthPatrols += s.patrols.truth; p.observerDuplicates += s.check.observerDuplicates; p.observedNotKilled += s.check.observedNotKilled;
    if (s.patrols.pat9) { p.pat9ok.push(...s.patrols.pat9.ok); p.pat9top.push(...s.patrols.pat9.top); }
    if (s.check.deathsMatch === false) p.checksFailed.push(`${label} s${s.seed}: deaths by cause differ between the part and the world`);
    if (!s.check.killingsMatch) p.checksFailed.push(`${label} s${s.seed}: killings differ (stats ${s.check.killingsStats}, world ${s.check.killingsWorld}, observer ${s.check.killingsObserver}, part ${s.check.killingsPart})`);
    if (s.check.communityYearsPart !== null && Math.abs(s.check.communityYearsPart - s.exposure.communityYears) > 1e-6) p.checksFailed.push(`${label} s${s.seed}: community-years differ (part ${s.check.communityYearsPart}, world ${s.exposure.communityYears})`);
    if (s.check.energyDeaths !== null && s.check.energyDeaths !== s.deaths.all) p.checksFailed.push(`${label} s${s.seed}: the energy readout's deaths (${s.check.energyDeaths}) differ from the world's (${s.deaths.all})`);
    if (s.dispersal.datedInWindow > s.dispersal.transfers) p.checksFailed.push(`${label} s${s.seed}: more dated transfers (${s.dispersal.datedInWindow}) than the counter (${s.dispersal.transfers})`);
  }
  return p;
}

const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const f2 = (v: number | null | undefined, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d);

/** A row of the report: how to read it from a pool, its field band and its registered minimum. */
interface RowSpec {
  family: string; event: string;
  /** The target row it is set beside (data/targets.json), and whether the registered minimum for rates or patterns applies. */
  row: string; kind: 'rate' | 'pattern' | '';
  count: (p: Pool) => number; lower?: boolean;
  value?: (p: Pool) => string;
  /** The band as printed when the row's accept fields do not carry it (bands given only as text). */
  band?: string;
}
const q1 = (p: Pool) => p.infantYears > 0 ? 1 - Math.exp(-p.firstYear / p.infantYears) : null;
const share = (a: number, b: number) => b ? f2(a / b, 3) : '—';
export const ROWS: RowSpec[] = [
  { family: 'lethal conflict and injury', event: 'killings, all (intergroup + infanticide + within the community)', row: 'T-LET-1', kind: 'rate', count: p => p.killings, value: p => `${f2(p.killings / p.communityYears, 3)} per community-year` },
  { family: 'lethal conflict and injury', event: '  intergroup (gang attacks)', row: '', kind: '', count: p => p.intergroup },
  { family: 'lethal conflict and injury', event: '  infanticide', row: '', kind: '', count: p => p.infanticideBetween + p.infanticideWithin, value: p => `${p.infanticideBetween} by strangers, ${p.infanticideWithin} by members` },
  { family: 'lethal conflict and injury', event: '  within the community (fight wounds)', row: '', kind: '', count: p => p.fight },
  { family: 'lethal conflict and injury', event: 'victims: male share (n = killings)', row: 'T-LET-2', kind: 'pattern', count: p => p.killings, value: p => `male ${share(p.maleVictims, p.killings)}; intercommunity ${share(p.intercommunity, p.killings)}`, band: 'male 0.6–0.85 (intercommunity 0.66)' },
  { family: 'lethal conflict and injury', event: 'numerical odds, attackers ÷ defenders (n = intercommunity killings)', row: 'T-LET-3', kind: 'pattern', count: p => p.withRecord, value: p => `median ${f2(median(p.odds), 1)}` },
  { family: 'lethal conflict and injury', event: 'intercommunity killings during a patrol of the killers', row: 'T-LET-6', kind: 'pattern', count: p => p.intercommunity, value: p => `${share(p.onPatrol, p.intercommunity)} on patrol` },
  { family: 'lethal conflict and injury', event: 'serious injuries (fight wound ≥ 0.3)', row: '', kind: '', count: p => p.serious, lower: true },
  { family: 'lethal conflict and injury', event: 'attacks on strangers resolved (lethal + non-lethal)', row: '', kind: '', count: p => p.strangerAttacks, lower: true },
  { family: 'lethal conflict and injury', event: 'patrol sector check: community-years with ≥ 3 patrols', row: 'T-PAT-9', kind: 'pattern', count: p => p.pat9ok.length, value: p => `${f2(mean(p.pat9ok), 3)} meet both` },
  { family: 'deaths, adoption and bereavement', event: 'deaths, all causes (all causes known in truth)', row: 'T-DEM-4', kind: 'pattern', count: p => p.deaths,
    value: p => `${f2(p.deaths / p.chimpYears * 1000, 1)} per 1,000 chimp-years; disease ${share(p.disease, p.deaths)}, aggression ${share(p.aggression, p.deaths)}`, band: 'disease 0.25–0.6, aggression 0.1–0.25' },
  { family: 'deaths, adoption and bereavement', event: 'deaths before age 1 (q1 from infant-years at risk)', row: 'T-DEM-1', kind: 'rate', count: p => p.firstYear, value: p => `q1 ${f2(q1(p), 3)}` },
  { family: 'deaths, adoption and bereavement', event: "mothers' deaths leaving dependent offspring (< 8 y)", row: '', kind: '', count: p => p.motherDeathsWithDependents, value: p => `${p.dependents} dependents` },
  { family: 'deaths, adoption and bereavement', event: 'adoptions', row: '', kind: '', count: p => p.adopted, lower: true, value: p => `${p.notAdopted} not adopted, ${p.adoptionUnknown} unknown` },
  { family: 'deaths, adoption and bereavement', event: 'dead infants under 3 y with the mother alive (carry rolls)', row: '', kind: '', count: p => p.carryOpportunities, value: p => `≥ ${p.carriesRecorded} carries recorded` },
  { family: 'deaths, adoption and bereavement', event: 'bereavement episodes (offspring < 12 y in her community)', row: '', kind: '', count: p => p.bereaved, value: p => `from ${p.motherDeathsBereaving} mothers' deaths` },
  { family: 'disease and snares', event: 'epidemic arrivals (whole run, burn-in included)', row: 'T-DEM-5', kind: 'rate', count: p => p.arrivals, value: p => `${f2(p.arrivals / p.runCommunityYears, 3)} per community-year` },
  { family: 'disease and snares', event: '  of which ≥ 20% of the community infected', row: 'T-DEM-5', kind: 'rate', count: p => p.epidemics20, value: p => `${f2(p.epidemics20 / p.runCommunityYears, 3)} per community-year` },
  { family: 'disease and snares', event: 'outbreaks ≥ 20%: attack, mortality (means over outbreaks)', row: 'T-DEM-6', kind: 'rate', count: p => p.epidemics20, value: p => `attack ${f2(mean(p.attack20), 2)}, mortality ${f2(mean(p.mortality20), 2)}` },
  { family: 'disease and snares', event: 'respiratory (outbreak) deaths', row: 'T-DEM-8', kind: 'rate', count: p => p.respiratory, value: p => `${f2(p.respiratory / p.chimpYears * 1000, 1)} per 1,000 chimp-years` },
  { family: 'disease and snares', event: 'snare injuries (whole run)', row: 'T-DEM-9', kind: 'rate', count: p => p.snaredRun, value: p => `prevalence > 3 y at the end ${share(p.prevalenceNum, p.prevalenceDen)}` },
  { family: 'dispersal', event: 'natal transfers', row: '', kind: 'rate', count: p => p.transfers, value: p => `${f2(p.transfers / p.communityYears, 3)} per community-year` },
];

export function bandOf(targets: { id: string; accept: { lo: number | null; hi: number | null; basis?: string } }[], id: string): string {
  const t = targets.find(x => x.id === id);
  if (!t) return '';
  const a = t.accept;
  return a.lo !== null && a.hi !== null ? `${a.lo}–${a.hi}` : a.basis ?? '';
}

export interface GroupResult { label: string; runs: { label: string; dir: string; seeds: SeedCounts[]; pool: Pool; complete: boolean }[]; pool: Pool }

export function report(groups: GroupResult[], targets: Parameters<typeof bandOf>[0], reference: string): string {
  const ref = groups.find(g => g.label === reference) ?? groups[0];
  const ordered = [ref, ...groups.filter(g => g !== ref)];
  const out: string[] = [];
  const cnt = (spec: RowSpec, p: Pool) => `${spec.lower ? '≥ ' : ''}${spec.count(p)}`;
  out.push(`## Rare-event counts on simulation truth (scripts/rare-events.ts; reference ${ref.label})`, '');
  out.push('Time at risk:', '');
  out.push('| group | run | seeds | community-years | chimp-years | community-years, whole run (burn-in incl.) | chimp-years, whole run |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const g of ordered) {
    for (const r of g.runs) out.push(`| ${g.label} | ${r.label}${r.complete ? '' : ' (partial)'} | ${r.pool.seeds} | ${f2(r.pool.communityYears, 1)} | ${f2(r.pool.chimpYears, 1)} | ${f2(r.pool.runCommunityYears, 1)} | ${f2(r.pool.runChimpYears, 1)} |`);
    out.push(`| ${g.label} | pooled | ${g.pool.seeds} | ${f2(g.pool.communityYears, 1)} | ${f2(g.pool.chimpYears, 1)} | ${f2(g.pool.runCommunityYears, 1)} | ${f2(g.pool.runChimpYears, 1)} |`);
  }
  for (const family of [...new Set(ROWS.map(r => r.family))]) {
    out.push('', `### ${family}`, '');
    const head = ['event', 'row', ...ordered.flatMap(g => [`${g.label} per run`, `${g.label} pooled`, `${g.label} value`]), 'field band', 'minimum', `${ref.label} reaches it`];
    out.push(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`);
    for (const spec of ROWS.filter(r => r.family === family)) {
      const min = spec.kind === 'rate' ? MIN_RATE : spec.kind === 'pattern' ? MIN_PATTERN : null;
      const n = spec.count(ref.pool);
      const cells = [spec.event, spec.row, ...ordered.flatMap(g => [g.runs.map(r => cnt(spec, r.pool)).join(' / '), cnt(spec, g.pool), spec.value ? spec.value(g.pool) : '']),
        spec.band ?? (spec.row ? bandOf(targets, spec.row) : ''), min === null ? '' : String(min), min === null ? '' : n >= min ? `yes (${n})` : `no (${n})`];
      out.push(`| ${cells.join(' | ')} |`);
    }
  }
  out.push('', 'Context (no field row):', '');
  for (const g of ordered) {
    const p = g.pool;
    out.push(`- ${g.label}: wounds counter ${p.woundsCounter}; infanticidal attacks started ${p.infanticideAttacks}; charges and attacks at strangers started ${p.strangerActs}; non-lethal attacks on strangers ≥ ${p.strangerAttacksNonLethal};`
      + ` deaths with wounds (complications) ${p.complicationsOfWounds}; truth patrols ${p.truthPatrols}; arrivals dated in the window ${p.arrivalsDatedWindow} of ${p.arrivals}; outbreak cases ≥ ${p.outbreakCases}, outbreak deaths ${p.outbreakDeaths};`
      + ` snare deaths ${p.snareDeaths}; births ${p.births}; deaths by cause ${JSON.stringify(p.byCause)}`);
  }
  out.push('', 'Second route:', '');
  for (const g of ordered) {
    const fails = [...g.runs.flatMap(r => r.pool.checksFailed)];
    const seeds = g.runs.flatMap(r => r.seeds);
    out.push(`- ${g.label}: deaths by cause, part (viability readout) = world (dead chimps in the window) in ${seeds.filter(s => s.check.deathsMatch).length} of ${seeds.length} seeds;`
      + ` killings, part (T-LET-1 truth × community-years) = world.stats = world causes = observer truth records in ${seeds.filter(s => s.check.killingsMatch).length} of ${seeds.length};`
      + ` energy readout deaths = world in ${seeds.filter(s => s.check.energyDeaths === s.deaths.all).length} of ${seeds.length};`
      + ` transfers dated from the animals' records = the counter in ${seeds.filter(s => s.dispersal.datedInWindow === s.dispersal.transfers).length} of ${seeds.length}`
      + `; the observer's truth.kills holds ${g.pool.observerDuplicates} extra entr${g.pool.observerDuplicates === 1 ? 'y' : 'ies'} (an infanticidal attack's start recorded beside its kill)`
      + ` and its observed killings include ${g.pool.observedNotKilled} animal${g.pool.observedNotKilled === 1 ? '' : 's'} that did not die of a killing${fails.length ? `. Failures: ${fails.join('; ')}` : ''}`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function readPart(file: string): PartLite {
  const p = decodeLossless<Record<string, any>>(gunzipSync(readFileSync(file)).toString('utf8'));
  const v = p.field?.values ?? {};
  const l1 = v['T-LET-1'], p9 = v['T-PAT-9'];
  return {
    seed: p.seed, days: p.config.days, burnInDays: p.config.burnInDays,
    deathsByCause: p.viability.deathsByCause, deaths: p.viability.deaths, births: p.viability.births,
    deathsByClass: p.energy?.deathsByClass ?? null,
    let1: l1 && typeof l1.den === 'number' ? { num: l1.num, den: l1.den, truth: l1.truth } : null,
    pat9: p9?.raw ? { ok: p9.raw.ok ?? [], top: p9.raw.top ?? [] } : null,
    observedTransfers: p.field?.counts?.transfers ?? 0,
    checkpoints: p.checkpoints ?? [], resumedFrom: p.resumedFrom ?? null,
  };
}

interface RunState { world: World; obs: { rec: Records; statsStart: WorldStats } | null; via: { start: number } | null; done: number }

/** Counts every finished seed of one e-run folder. Seeds are read one at a time (a checkpoint is ~0.5 GB in memory). */
export function countRun(dir: string, opts: { partial: boolean; mid: boolean; log: (m: string) => void }): { label: string; seeds: SeedCounts[]; complete: boolean } {
  const run = JSON.parse(readFileSync(join(dir, 'run.json'), 'utf8')) as { label: string; seeds: number[]; horizon: { burnInDays: number; days: number }; jobs: { id: string; kind: string; status: string; seed?: number }[] };
  const seedJobs = run.jobs.filter(j => j.kind === 'seed' || j.kind === 'bench');
  const done = new Set(seedJobs.filter(j => j.status === 'done').map(j => Number(j.id.replace(/^s/, ''))));
  const complete = run.seeds.every(s => done.has(s));
  if (!complete && !opts.partial) throw new Error(`${run.label}: seeds not finished (${run.seeds.filter(s => !done.has(s)).join(', ')}); pass --partial to count the finished ones`);
  const seeds: SeedCounts[] = [];
  for (const seed of run.seeds) {
    if (!done.has(seed)) continue;
    const partFile = join(dir, 'parts', `${run.label}.s${seed}.part.json.gz`);
    const part = readPart(partFile);
    const endDay = run.horizon.burnInDays + run.horizon.days;
    const ck = part.checkpoints.find(f => f.endsWith(`.ckpt-d${endDay}.v8.gz`) && existsSync(f)) ?? join(dir, 'parts', `${run.label}.s${seed}.ckpt-d${endDay}.v8.gz`);
    const mids: Snapshot[] = [];
    if (opts.mid && part.resumedFrom && existsSync(part.resumedFrom)) {
      const m = readCheckpoint<RunState>(part.resumedFrom).state;
      mids.push(snapshotOf(m.world));
      opts.log(`${run.label} s${seed}: snapshot at day ${(m.world.time / 24).toFixed(0)} from ${basename(part.resumedFrom)}`);
    }
    const { state } = readCheckpoint<RunState>(ck);
    if (!state.obs) throw new Error(`${ck}: no observer in the checkpoint (written before the burn-in ended)`);
    const t0 = state.via?.start ?? state.obs.rec.time0;
    if (Math.abs(t0 - state.obs.rec.time0) > 1e-9) throw new Error(`${ck}: the viability readout and the observer started at different times`);
    const runStart = state.world.time - state.done * (15 / 3600);
    seeds.push(countSeed({ seed, world: state.world, rec: state.obs.rec, statsStart: state.obs.statsStart, t0, runStart, mids, part }));
    opts.log(`${run.label} s${seed}: counted (${basename(ck)})`);
  }
  return { label: run.label, seeds, complete };
}

function main(): number {
  const argv = process.argv.slice(2);
  const groups: { label: string; dirs: string[] }[] = [];
  let out: string | null = null, reference = '', partial = false, mid = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--group') { const [label, list] = argv[++i].split('='); groups.push({ label, dirs: list.split(',').map(d => resolve(d)) }); }
    else if (a === '--out') out = argv[++i];
    else if (a === '--reference') reference = argv[++i];
    else if (a === '--partial') partial = true;
    else if (a === '--no-mid') mid = false;
    else if (!a.startsWith('--')) groups.push({ label: basename(a), dirs: [resolve(a)] });
    else throw new Error(`unknown option ${a}`);
  }
  if (!groups.length) { console.error('usage: rare-events.ts --group LABEL=<run>,<run>,… [--group …] [--reference LABEL] [--out prefix] [--partial] [--no-mid]'); return 2; }
  const log = (m: string) => console.error(m);
  const results: GroupResult[] = [];
  for (const g of groups) {
    const runs = g.dirs.map(d => { const r = countRun(d, { partial, mid, log }); return { label: r.label, dir: d, seeds: r.seeds, pool: pool(r.seeds, r.label), complete: r.complete }; });
    results.push({ label: g.label, runs, pool: pool(runs.flatMap(r => r.seeds), g.label) });
  }
  const targets = (JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'targets.json'), 'utf8')) as { targets: Parameters<typeof bandOf>[0] }).targets;
  const md = report(results, targets, reference || results[0].label);
  console.log(md);
  if (out) {
    writeFileSync(`${out}.json`, JSON.stringify({ tool: 'rare-events', version: 1, date: new Date().toISOString(), groups: results }, null, 1) + '\n');
    writeFileSync(`${out}.md`, md + '\n');
    log(`wrote ${out}.json and ${out}.md`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exit(main()); } catch (e) { console.error(`rare-events: ${e instanceof Error ? e.message : e}`); process.exit(1); }
}
