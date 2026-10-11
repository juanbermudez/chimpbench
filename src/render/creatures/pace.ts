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
import { DEFAULT_PARAMS, type Params } from '../../sim/params';
import { GAITS } from './gait';

/** Playback rate (ecological seconds per real second) the small map's thresholds were tuned at (stylization). */
export const SMALL_MAP_RATE = 60;
/** Rendered adult body size used for the rates below (m; adults are 1.36 to 1.54, creatures/rig.ts). Design assumption. */
export const ADULT_BODY_M = 1.45;

/**
 * The speed an adult walks at in this world (m per ecological second): walkMps, or with the gait mechanism on
 * (sim/gait.ts gaitOn) the body's own walking speed, taking the faster sex so that no walker reads as a runner.
 */
export const walkPace = (P: Params): number => gaitOn(P) ? Math.max(P.walkGaitMaleMps, P.walkGaitFemaleMps) : P.walkMps;

/** True on the 160 m map (and any world that walks at its speed): the layer keeps its original expressions there, bit for bit. */
export const smallMapPace = (P: Params): boolean => walkPace(P) === DEFAULT_PARAMS.walkMps;

/** The reference rate (see the header): exactly SMALL_MAP_RATE on the 160 m map, 6.86 on the field map, 2.73 with the gait mechanism. */
export const referenceRate = (P: Params): number => SMALL_MAP_RATE * (DEFAULT_PARAMS.walkMps / walkPace(P));

/**
 * The playback rate above which an adult's walk can no longer be drawn with feet that grip the ground (the walk's
 * cadence cap × its longest stride, creatures/gait.ts): beyond it the picture is time-lapse. About 9 s/s on the field
 * map, 82 s/s on the 160 m map. Derived from the gait table; no new constant.
 */
export const lapseRate = (P: Params, bodyM = ADULT_BODY_M): number => GAITS.walk.fCap * GAITS.walk.strideMax * bodyM / walkPace(P);
