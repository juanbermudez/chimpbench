import type { Action, Chimp, DecisionSource, World } from '../types';

// A record of the selected animal's acts, kept by the interface (stage W4; pure, no DOM, and nothing is written to the
// World). The field log names an animal only when something notable happens (one entry for an alpha in 2.5 hours),
// so the Log tab had no line of what the animal was doing. Each time the interface refreshes it looks at the selected
// animal (watchDecisions); when its act or target has changed it adds an entry with the simulation's own reason
// sentence. The record starts when the animal is selected and is a view of what the interface saw: at high speed
// several decisions pass between two looks, and those are counted as missed, not invented.

export const DECISION_LOG_MAX = 48;

export type ActSource = DecisionSource | 'set';

export interface DecisionEntry {
  /** Ecological hours: when the act began (world time minus the simulation's own time-in-act at the look that saw it). */
  time: number;
  /** Chimp.decisionVersion at the latest look that still showed this act. */
  version: number;
  action: Action; targetId: number; reason: string;
  /** Who chose the act: the rules, or a model through the decision loop. 'set': nobody chose it at a decision point,
   * the simulation set it (a rest while waiting for an answer, fighting back, death). */
  source: ActSource;
  /** The act was already under way when the watch began. */
  before: boolean;
  /** Further decision points seen at which the animal stayed in this act (its decision count moved, its act did not). */
  kept: number;
}

export interface DecisionLog {
  chimpId: number;
  /** World the record belongs to (another simulation opened: the record starts again). Never serialized. */
  world: World | null;
  /** Ecological hours: when the watch began. */
  since: number;
  /** Oldest first, at most DECISION_LOG_MAX. */
  entries: DecisionEntry[];
  /** Decision points that passed between two looks without being seen (fast playback). */
  missed: number;
}

export function createDecisionLog(): DecisionLog { return { chimpId: -1, world: null, since: 0, entries: [], missed: 0 }; }

const actStart = (world: World, c: Chimp) => world.time - (c.actionTime ?? 0) / 3600;

/**
 * Who chose the act under way. Chimp.decisionSource names the animal's last decision, which is not the act when the
 * simulation changed it since without a decision: the animal is parked waiting for an answer, its decision count did
 * not move while its act did (`chosen` false), or the act is not among the options it weighed (the Mind tab's "not
 * a choice", mind-card.ts cardFromChimp). Those are 'set', never credited to the rules' or a model's last pick.
 */
function actSource(c: Chimp, chosen: boolean): ActSource {
  if (!chosen || (c.awaitingDecisionSince !== null && c.awaitingDecisionSince !== undefined)) return 'set';
  const list = c.candidates ?? [];
  if (list.length && !list.some(o => o.action === c.action && o.targetId === c.targetId)) return 'set';
  return c.decisionSource;
}

/** One look at the selected animal. Returns true when the record changed. Reads only. */
export function watchDecisions(log: DecisionLog, world: World, c: Chimp): boolean {
  const last = log.entries[log.entries.length - 1];
  if (log.chimpId !== c.id || log.world !== world || world.time < log.since) {
    log.chimpId = c.id; log.world = world; log.since = world.time; log.entries.length = 0; log.missed = 0;
    if (c.alive) log.entries.push({ time: actStart(world, c), version: c.decisionVersion, action: c.action, targetId: c.targetId, reason: c.reason ?? '', source: actSource(c, true), before: true, kept: 0 });
    return true;
  }
  if (!last || !c.alive) {
    if (last && last.action !== 'dead') { log.entries.push({ time: world.time, version: c.decisionVersion, action: 'dead', targetId: -1, reason: c.causeOfDeath ? `Died: ${c.causeOfDeath}` : 'Died', source: 'set', before: false, kept: 0 }); return true; }
    return false;
  }
  const steps = c.decisionVersion - last.version;
  if (c.action === last.action && c.targetId === last.targetId) {
    if (steps === 0) return false;
    // Its decision count moved and its act did not: it chose the same again (or, parked at a decision point, was only
    // asked again). The entry stays one line.
    last.version = c.decisionVersion;
    if (c.awaitingDecisionSince === null || c.awaitingDecisionSince === undefined) { last.kept += 1; if (steps > 1) log.missed += steps - 1; return true; }
    return false;
  }
  if (steps > 1) log.missed += steps - 1;
  log.entries.push({ time: Math.max(last.time, actStart(world, c)), version: c.decisionVersion, action: c.action, targetId: c.targetId, reason: c.reason ?? '', source: actSource(c, steps > 0), before: false, kept: 0 });
  if (log.entries.length > DECISION_LOG_MAX) log.entries.splice(0, log.entries.length - DECISION_LOG_MAX);
  return true;
}

/** What an act counts as on the activity line. An interface grouping for colour, not an ethogram. */
export type ActivityKind = 'feed' | 'move' | 'rest' | 'social' | 'conflict' | 'call' | 'none';
export const ACTIVITY_KIND: Record<Action, ActivityKind> = {
  forage: 'feed', drink: 'feed', hunt: 'feed', share: 'feed', beg: 'feed', nurse: 'feed',
  travel: 'move', follow: 'move', climb: 'move', patrol: 'move', transfer: 'move', consort: 'move',
  rest: 'rest', nest: 'rest', shelter: 'rest',
  groom: 'social', play: 'social', mate: 'social', reconcile: 'social', console: 'social', 'pant-grunt': 'social', guard: 'social',
  display: 'conflict', charge: 'conflict', attack: 'conflict', flee: 'conflict', submit: 'conflict', alarm: 'conflict',
  call: 'call', dead: 'none',
};
export const ACTIVITY_LABEL: Record<ActivityKind, string> = { feed: 'Feeding', move: 'Moving', rest: 'Resting', social: 'Social', conflict: 'Conflict', call: 'Calling', none: 'Not seen' };

export interface Segment { start: number; end: number; kind: ActivityKind; action: Action }

/**
 * The record as one line over the last `span` hours: segments oldest first, clipped to [now − span, now], neighbours
 * of one kind merged. The time before the record's first act is a 'none' segment: the interface did not see it.
 */
export function timeline(log: DecisionLog, now: number, span: number): { from: number; to: number; segments: Segment[] } {
  const from = now - span, segments: Segment[] = [];
  const add = (start: number, end: number, kind: ActivityKind, action: Action) => {
    const s = Math.max(start, from), e = Math.min(end, now);
    if (!(e > s)) return;
    const prev = segments[segments.length - 1];
    if (prev && prev.kind === kind && Math.abs(prev.end - s) < 1e-9) prev.end = e; else segments.push({ start: s, end: e, kind, action });
  };
  const first = log.entries[0];
  add(from, first ? first.time : now, 'none', 'dead');
  for (let i = 0; i < log.entries.length; i++) {
    const e = log.entries[i], next = log.entries[i + 1];
    add(e.time, next ? next.time : now, ACTIVITY_KIND[e.action] ?? 'none', e.action);
  }
  return { from, to: now, segments };
}
