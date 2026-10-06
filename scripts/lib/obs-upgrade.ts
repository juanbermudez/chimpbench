// obs-fixes (docs/staging/obs-fixes-prereg.md §8): brings a saved run's observer records to the form the fixed observer
// writes, by the same outcome rules and from what the run saved (its end checkpoint: the world with its dead, their times
// and causes, and the observer's records), so the rows whose observer changed can be re-derived without a simulation.
// The fixes changed no detection and no random draw, so the upgraded records are those a fresh run would write for these
// rows: an `infanticide` event whose target did not die in it is an attack (src/field/protocols.ts infantKilled), a
// detected contest inside a community with a participant dead of its wounds gains a `fight-kill` event (fightVictims),
// and `truth.kills` keeps one fatal record per victim. Idempotent: records already in the new form are left as they are.
// Outside the protocol hash (scripts/lib); it reads the world and writes the records it is given.
import { diedOfFightWounds, fightVictims, infantKilled } from '../../src/field/protocols';
import { FIGHT_KILL, INFANTICIDE_ATTACK, type EventRec, type Records } from '../../src/field/records';
import type { Chimp, World } from '../../src/types';

export interface UpgradeCount {
  /** `infanticide` events relabelled as attacks (the target did not die in them), and the targets among them that were alive at the end or died of something else. */
  attacks: number; survivors: number[];
  /** Entries dropped from truth.kills (an attack's start, or a second record of one victim). */
  truthDropped: number;
  /** `fight-kill` events added, with their victims. */
  fightKills: number; fightVictims: number[];
}

/** Brings records written before obs-fixes to the fixed observer's form. Mutates `rec`; reads `world`. */
export function upgradeRecords(rec: Records, world: World): UpgradeCount {
  const byId = new Map<number, Chimp>(world.chimps.map(c => [c.id, c]));
  const out: UpgradeCount = { attacks: 0, survivors: [], truthDropped: 0, fightKills: 0, fightVictims: [] };
  for (const e of rec.events) {
    if (e.kind !== 'infanticide' || infantKilled(byId.get(e.target), e.t)) continue;
    e.kind = INFANTICIDE_ATTACK; out.attacks++;
    if (!(byId.get(e.target)?.causeOfDeath ?? '').startsWith('infanticide') && !out.survivors.includes(e.target)) out.survivors.push(e.target);
  }
  const kept: Records['truth']['kills'] = [], seen = new Set<number>();
  for (const k of rec.truth.kills) {
    if ((k.kind === 'infanticide' && !infantKilled(byId.get(k.victim), k.t)) || seen.has(k.victim)) { out.truthDropped++; continue; }
    seen.add(k.victim); kept.push(k);
  }
  rec.truth.kills = kept;
  const logged = new Set(rec.events.filter(e => e.kind === FIGHT_KILL).map(e => e.target)), added: EventRec[] = [];
  for (const e of rec.events) {
    for (const id of fightVictims(byId, e.kind, e.t, e.end, e.parts)) {
      if (logged.has(id)) continue;
      logged.add(id);
      const v = byId.get(id)!, t = v.deathTime!, lc = v.lastConflict, killer = lc && lc.time === t ? lc.opponentId : e.parts.find(p => p !== id) ?? -1;
      added.push({ id: e.id, t, end: t, kind: FIGHT_KILL, actor: killer, target: id, parts: [killer, id], troop: v.troopId, team: e.team, detect: e.detect, x: v.position[0], z: v.position[2] });
      out.fightKills++; out.fightVictims.push(id);
    }
  }
  rec.events.push(...added);
  rec.truth.fightKillings = world.chimps.filter(c => diedOfFightWounds(c) && c.deathTime !== null && c.deathTime > rec.time0).length;
  return out;
}

/**
 * T-LET-1's count and T-LET-6's denominator by the rule the Track E freeze (5d4fa5a2a500bce6) scored them with
 * (src/field/metrics.ts at e0cf866, lines 1426-1431 and 698): every `kill` or `infanticide` event a killing, once per
 * target for T-LET-1 and every event for T-LET-6; violent carcasses inferred. On untouched saved records it must give the
 * numbers the saved run printed; that is the check before any re-derivation.
 */
export function freezeRuleCounts(rec: Records): { killings: number; let6Events: number } {
  const seen = new Set<number>();
  let let6Events = 0;
  for (const e of rec.events) if (e.kind === 'kill' || e.kind === 'infanticide') { let6Events++; seen.add(e.target); }
  for (const x of rec.deaths) if (x.violent && x.how === 'body') seen.add(x.id);
  return { killings: seen.size, let6Events };
}
