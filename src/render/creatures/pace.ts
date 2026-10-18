// Stage W1 (10 October 2026): the pace a world's walk is read at. Pure; reads parameters, no three.js.
//
// The creature layer's moving thresholds and gallop entries were tuned on the 160 m map, where an adult walks at
// 0.04 m per ecological second and 1 min/s is the natural playback rate: a walker is drawn at 2.4 m/s, 1.6 body
// lengths a second. The field map walks at 0.35 m/s (0.78 to 0.88 with the gait mechanism), so at 1 min/s the same
// thresholds read every walker as a runner, and at Real time as standing. The reference rate is the playback rate at
// which this world's walk is drawn as the small map's walk at 1 min/s; on any other map the layer reads the moving
// test and the choice of clip at that rate, whatever the playback speed (creatures.ts). A stylization: it carries the
// small map's tuning over, it is not a measured gait transition.
import { gaitOn } from '../../sim/gait';
import { resolveParams, type Params } from '../../sim/params';
import { GAITS } from './gait';

/** Playback rate (ecological seconds per real second) the small map's thresholds were tuned at (stylization). */
export const SMALL_MAP_RATE = 60;
/**
 * The walking speed those thresholds were tuned at: the 160 m map's own, read from the registry's compressed profile
 * with no overrides (not a copy of a default used in place of a world's value: it is the anchor every world's own
 * walking speed, from `paramsOf(world)`, is compared with).
 */
const SMALL_MAP_WALK_MPS = resolveParams('compressed').walkMps;
/** Rendered adult body size used for the rates below (m; adults are 1.36 to 1.54, creatures/rig.ts). Design assumption. */
export const ADULT_BODY_M = 1.45;

/**
 * The speed an adult walks at in this world (m per ecological second): walkMps, or with the gait mechanism on
 * (sim/gait.ts gaitOn) the body's own walking speed, taking the faster sex so that no walker reads as a runner.
 */
export const walkPace = (P: Params): number => gaitOn(P) ? Math.max(P.walkGaitMaleMps, P.walkGaitFemaleMps) : P.walkMps;

/** True on the 160 m map (and any world that walks at its speed): the layer keeps its original expressions there, bit for bit. */
export const smallMapPace = (P: Params): boolean => walkPace(P) === SMALL_MAP_WALK_MPS;

/** The reference rate (see the header): exactly SMALL_MAP_RATE on the 160 m map, 6.86 on the field map, 2.73 with the gait mechanism. */
export const referenceRate = (P: Params): number => SMALL_MAP_RATE * (SMALL_MAP_WALK_MPS / walkPace(P));

/**
 * The playback rate above which an adult's walk can no longer be drawn with feet that grip the ground (the walk's
 * cadence cap × its longest stride, creatures/gait.ts): beyond it the picture is time-lapse. About 9 s/s on the field
 * map, 82 s/s on the 160 m map. Derived from the gait table; no new constant.
 */
export const lapseRate = (P: Params, bodyM = ADULT_BODY_M): number => GAITS.walk.fCap * GAITS.walk.strideMax * bodyM / walkPace(P);

/**
 * Stage W14: the rate (ecological hours per real second, as the layer's pbRate) at which the moving test and the
 * heading read an animal's simulated path: the playback rate, or the reference rate when the playback is slower. On
 * every map: the 160 m map used to read the drawn speed alone, tuned at 1 min/s, so at Watch 4x and Real time a walk
 * read as standing and the body glided over the ground in the standing clip. At the reference rate and faster it is
 * the playback rate itself, so nothing changes there. A stylization (stage W1's thresholds carried over).
 */
export const movingK = (pbRate: number, refK: number): number => pbRate > refK ? pbRate : refK;

/**
 * Stage W14, second reader: whether the clip a body is in holds it a moment longer than its next clip asks (the layer's
 * dwell, CLIP_DWELL in creatures.ts: a clip plays at least that long, so clips do not flicker). A body that has set off
 * across the ground is not held in a clip that does not move it. At 1 min/s on the field map a body coming down its trunk
 * is drawn seated (the perch clip) for the frames its last 25 cm take, and the dwell then held it seated for 0.35 s while
 * it ran off at about 20 m/s: a seated glide of up to 7 m, filmed on the followed animal of a new world's opening, where
 * stage W14 drops to 1 min/s as the party wakes. The moving test has its own hysteresis (creatures.ts MOVE_ENTER,
 * MOVE_EXIT and 0.8 s), so a walk entered here does not flicker. In a tree the dwell is as before. Pure; a drawing rule.
 */
export function clipHeld(clipT: number, dwell: number, urgent: boolean, heldGait: string | null, nextGait: string | null, moving: boolean, onGround: boolean): boolean {
  if (urgent || !(clipT < dwell)) return false;
  return !(moving && onGround && heldGait === null && nextGait !== null && nextGait !== 'climb');
}
