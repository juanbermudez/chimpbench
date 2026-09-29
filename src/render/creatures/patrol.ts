// Border-patrol presentation (docs/realism-design.md §5.3.1, P4b). Pure; no three.js.
//
// The simulation publishes the current leg of a patrol as Party.patrolPhase and lists the members in file order
// (leader first). This module maps that leg to what the animals show: which clip and gait, which listening pose,
// where the head looks. Field descriptions (wattsMitani2001, descriptive): males travel silently in single file,
// stop to listen, move carefully in neighbour range, and release tension with loud displays after contact or on
// returning home. Every value here is a stylization of those states (design assumption), not a measured quantity.
// Without a phase (the field absent) nothing here applies and the animals keep today's patrol clips.
import type { Chimp, Party } from '../../types';
import { hashUnit } from './secondary';

export type PatrolPhase = NonNullable<Party['patrolPhase']>;
/** Numeric phase codes kept on the per-animal render state (0 = not in a phased patrol). */
export const PatrolCode = { none: 0, out: 1, listen: 2, incursion: 3, return: 4 } as const;
export type PatrolCode = typeof PatrolCode[keyof typeof PatrolCode];

export function phaseCode(p: Party['patrolPhase'] | undefined | null): PatrolCode {
  switch (p) {
    case 'out': return PatrolCode.out;
    case 'listen': return PatrolCode.listen;
    case 'incursion': return PatrolCode.incursion;
    case 'return': return PatrolCode.return;
    default: return PatrolCode.none;
  }
}

/**
 * An animal's place in a phased patrol: the published leg (0 when its party publishes none, or it is not itself
 * patrolling), its index in file order (leader 0) and the ids of the animals ahead and behind (−1 none).
 */
export interface FileCue { code: PatrolCode; index: number; count: number; ahead: number; behind: number; }
export function createFileCue(): FileCue { return { code: PatrolCode.none, index: 0, count: 0, ahead: -1, behind: -1 }; }
/** Parties that publish a leg, by id (reused map; parties without a phase are left out). */
export function phasedParties(parties: readonly Party[], out: Map<number, Party>): Map<number, Party> {
  out.clear();
  for (const p of parties) if (phaseCode(p.patrolPhase) !== PatrolCode.none) out.set(p.id, p);
  return out;
}
export function fileCue(c: Pick<Chimp, 'id' | 'alive' | 'action' | 'partyId'>, phased: Map<number, Party>, out: FileCue): FileCue {
  const p = phased.size && c.alive && c.action === 'patrol' ? phased.get(c.partyId) : undefined;
  out.code = p ? phaseCode(p.patrolPhase) : PatrolCode.none;
  out.index = 0; out.count = 0; out.ahead = out.behind = -1;
  if (!p || out.code === PatrolCode.none) return out;
  const m = p.members, i = m.indexOf(c.id);
  out.index = Math.max(0, i); out.count = m.length;
  out.ahead = i > 0 ? m[i - 1] : -1; out.behind = i >= 0 && i + 1 < m.length ? m[i + 1] : -1;
  return out;
}

/**
 * The leg an animal is drawn in. Drawn animals trail the sim by two ticks (creatures/playback.ts), so a change
 * between two legs (a stop beginning or ending, the file crossing into neighbour range) takes effect when the drawn
 * time reaches the moment it was published, and the listening pose starts when the drawn file actually stops.
 * Joining or leaving a patrol applies at once: the action itself has changed, and the ordinary clips are not
 * lagged either. code: the drawn leg; pub/pubAt: the latest published leg and the world time (h) it appeared;
 * since: animation time the drawn leg began. Returns true when the drawn leg changed.
 */
export interface LegState { pCode: number; pPub: number; pPubAt: number; pSince: number; }
export function stepLeg(s: LegState, simCode: number, worldTime: number, renderT: number, now: number): boolean {
  if (simCode === PatrolCode.none || s.pCode === PatrolCode.none) {
    s.pPub = simCode; s.pPubAt = worldTime;
    if (simCode === s.pCode) return false;
    s.pCode = simCode; s.pSince = now;
    return true;
  }
  if (simCode !== s.pPub) { s.pPub = simCode; s.pPubAt = worldTime; }
  if (s.pPub === s.pCode || !(s.pPubAt <= renderT || !Number.isFinite(renderT))) return false;
  s.pCode = s.pPub; s.pSince = now;
  return true;
}

/**
 * Roles of the 'listen' clip. scan: standing, head raised, slow looks around; tall: bipedal to see over the
 * understory; sniff: nose to the ground; back: chest and head turned back along the file; wait: still, looking at
 * the animal ahead (file bunching on the way out, and the first instant of a stop); crouch: low and tense in
 * neighbour range.
 */
export const Listen = { scan: 0, tall: 1, sniff: 2, back: 3, wait: 4, crouch: 5 } as const;

/** Clip roles for the patrol variants of the locomotion clips. */
export const PatrolRole = { walkFile: 1, walkLoose: 2, sneakCareful: 1 } as const;

/**
 * Listening-stop variant for one animal at animation time t (s). Each animal keeps a variant for 5–10 s segments
 * whose boundaries are offset per animal, so the file never changes posture in unison; for the first 0.2–1.2 s
 * after the stop begins (since = time the animal entered the phase) it stays in 'wait', staggering the moment
 * heads come up. Shares (design assumption): leader 35% tall, else scan; tail of a file of 3 or more 55% back,
 * 15% sniff; others 20% sniff, 18% back, 12% tall, 50% scan.
 */
export function listenVariant(id: number, index: number, count: number, t: number, since: number): number {
  if (t - since < 0.2 + hashUnit(id, 1291)) return Listen.wait;
  const seg = 5 + 5 * hashUnit(id, 1301);
  const k = Math.floor((t + hashUnit(id, 1303) * seg) / seg);
  const r = hashUnit(id, 1400 + k);
  if (index <= 0) return r < 0.35 ? Listen.tall : Listen.scan;
  if (count >= 3 && index === count - 1) return r < 0.55 ? Listen.back : r < 0.7 ? Listen.sniff : Listen.scan;
  return r < 0.2 ? Listen.sniff : r < 0.38 ? Listen.back : r < 0.5 ? Listen.tall : Listen.scan;
}

export type PatrolGait = 'walk' | 'sneak' | null;
export interface PatrolClip { clip: string; role: number; gait: PatrolGait; }
/**
 * Clip for a patrolling animal. Moving: 'out' and a stop still closing up → the tight file walk; 'incursion' →
 * the careful sneak; 'return' → the looser walk home. Still: 'listen' → the listening variant; 'out' → wait;
 * 'incursion' → crouch; 'return' → the ordinary relaxed stand (fidgets allowed again), not the tense patrol pause.
 */
export function patrolClip(code: number, moving: boolean, variant: number, out: PatrolClip): PatrolClip | null {
  if (code === PatrolCode.none) return null;
  if (moving) {
    if (code === PatrolCode.incursion) { out.clip = 'sneak'; out.role = PatrolRole.sneakCareful; out.gait = 'sneak'; return out; }
    out.clip = 'walk'; out.role = code === PatrolCode.return ? PatrolRole.walkLoose : PatrolRole.walkFile; out.gait = 'walk';
    return out;
  }
  out.gait = null;
  if (code === PatrolCode.return) { out.clip = 'stand'; out.role = 0; return out; }
  out.clip = 'listen';
  out.role = code === PatrolCode.listen ? variant : code === PatrolCode.incursion ? Listen.crouch : Listen.wait;
  return out;
}

/** Side (±1, + = the animal's left) toward which an animal with nobody behind it turns to look back. */
export function backSide(id: number): number { return hashUnit(id, 1801) < 0.5 ? 1 : -1; }

/**
 * Where a patrolling animal looks. mode 0: no patrol look (ordinary attention); 1: a direction, yaw from the
 * body heading and pitch (rad, + up); 2: another animal (memberId). weight is the look-at weight, halflife the
 * look-point spring (s): slow, deliberate turns while listening, quicker on the move.
 */
export interface PatrolLook { mode: 0 | 1 | 2; yaw: number; pitch: number; memberId: number; weight: number; halflife: number; }
export function createPatrolLook(): PatrolLook { return { mode: 0, yaw: 0, pitch: 0, memberId: -1, weight: 0, halflife: 0.09 }; }

/**
 * Slow scanning: the head holds a direction for 1.3–3 s (per animal), then turns to the next, yaw within ±amp of
 * the heading, pitch 0.06–0.18 rad above level (heads up: looking and listening into the distance).
 */
export function scanHold(id: number, t: number, amp: number, out: PatrolLook): void {
  const hold = 1.3 + 1.7 * hashUnit(id, 1501);
  const k = Math.floor((t + hashUnit(id, 1503) * hold) / hold);
  out.yaw = (hashUnit(id, 1600 + k) - 0.5) * 2 * amp;
  out.pitch = 0.06 + 0.12 * hashUnit(id, 1700 + k);
}

/**
 * Look target for a patrolling animal. out: the leader looks ahead along its heading, the others at the animal
 * ahead (no idle glances: purposeful, silent travel). listen: scan/tall/crouch scan slowly, back looks at the
 * animal behind (or back along the path at the tail), sniff and return use no patrol look. incursion (moving):
 * slow scans ±0.6 rad with the head up.
 */
export function patrolLook(code: number, variant: number, id: number, ahead: number, behind: number, moving: boolean, t: number, out: PatrolLook): PatrolLook {
  out.mode = 0; out.memberId = -1; out.yaw = 0; out.pitch = 0; out.weight = 0; out.halflife = 0.09;
  if (code === PatrolCode.none || code === PatrolCode.return) return out;
  if (code === PatrolCode.incursion && moving) { out.mode = 1; scanHold(id, t, 0.6, out); out.pitch *= 0.5; out.weight = 0.75; out.halflife = 0.3; return out; }
  if (moving || code === PatrolCode.out || (code === PatrolCode.listen && variant === Listen.wait)) {
    if (ahead >= 0) { out.mode = 2; out.memberId = ahead; out.weight = moving ? 0.45 : 0.6; }
    else { out.mode = 1; out.pitch = 0.03; out.weight = 0.35; }
    out.halflife = 0.2;
    return out;
  }
  switch (variant) {
    case Listen.sniff: return out;
    case Listen.back:
      if (behind >= 0) { out.mode = 2; out.memberId = behind; }
      else { out.mode = 1; out.yaw = Math.PI * 0.8 * backSide(id); out.pitch = 0.04; }
      out.weight = 0.9; out.halflife = 0.3;
      return out;
    case Listen.tall: out.mode = 1; scanHold(id, t, 1.0, out); out.weight = 0.9; out.halflife = 0.25; return out;
    case Listen.crouch: out.mode = 1; scanHold(id, t, 0.7, out); out.pitch *= 0.6; out.weight = 0.85; out.halflife = 0.28; return out;
    default: out.mode = 1; scanHold(id, t, 1.1, out); out.weight = 0.9; out.halflife = 0.25; return out;
  }
}

/**
 * Tension shown on the face and coat per leg: piloerection (0..1), lip press (0..1) and brow (−1 lowered .. 1
 * raised). Silent legs press the lips under a slightly lowered brow; neighbour range is the tensest; the walk home
 * is relaxed. Stylization; the release display itself brings full piloerection through the display clips.
 */
export interface PatrolTension { bristle: number; press: number; brow: number; }
const TENSION: PatrolTension[] = [
  { bristle: 0, press: 0, brow: 0 },          // none
  { bristle: 0.15, press: 0.35, brow: -0.15 }, // out
  { bristle: 0.3, press: 0.45, brow: -0.1 },   // listen
  { bristle: 0.5, press: 0.55, brow: -0.3 },   // incursion
  { bristle: 0, press: 0, brow: 0 },          // return
];
export function patrolTension(code: number): PatrolTension { return TENSION[code] ?? TENSION[0]; }

/** Ecological hours after an animal's last patrol leg during which its displays count as the patrol's release. */
export const RELEASE_WINDOW_H = 0.25;
/** Piloerection decay time constant after a release display (s): the coat settles slowly, not at once. */
export const RELEASE_BRISTLE_TAU = 14;
/** Farthest a releasing drummer is walked (render-only) to reach a trunk or buttress, in body sizes. */
export const RELEASE_DRUM_REACH = 2;
