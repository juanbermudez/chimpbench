// Creature layer: procedural, GPU-skinned chimpanzees with crossfaded
// per-action animation, paired social poses, infant carrying, climbing and
// nesting, plus the overlays that make interactions legible (selection,
// perception, social links, labels, vocal and interaction FX, nests, prey).
// Reads World; never writes it.
import * as THREE from 'three';
import type { Action, BodyPercept, Chimp, Quality, World } from '../types';
import { buildChimpGeometry } from './creatures/body';
import { createChimpMaterials, createSilhouetteMaterial } from './creatures/material';
import { PORTRAIT_LAYER, type PortraitSubject } from './creatures/portrait';
import {
  B, LIMB, PI, PARAM_TEXEL, POSE_SIZE, ROW_TEXELS, boneWorld, computeMorph, copyPose, createFK, createMorph, createPose,
  lowestPoint, quat, solveFK, writeSkin, type FKState, type Morph, type Pose,
} from './creatures/rig';
import { CLIPS, GROOMEE, GROOM_FRONT, GROOM_LAP, PROP, Pw, cradle, cradleFor, gaitFrequency, groomeePosture, groomerRole, vocalOverlay, type Gait, type PoseCtx } from './creatures/poses';
import { clamp, damp, dampAngle, hash01, linearRGB, mixRGB, pixelSize, preToneMapped, smoothstep, vividColor } from './creatures/util';
import { LIMB_TIP, createProps } from './creatures/props';
import { createSelection } from './creatures/selection';
import { createSocial } from './creatures/social';
import { createLabels } from './creatures/labels';
import { nearestOnScreen } from './creatures/pick';
import { createFX } from './creatures/fx';
import { createNests } from './creatures/nests';
import { createRemains } from './creatures/remains';
import { createPrey } from './creatures/prey';
import { perfEnd, perfNow } from '../perf';
import { TICK_HOURS, advancePlayback, createPlayback, createTrack, pushSample, relocationJump2, type Track } from './creatures/playback';
import { ABOUT_MAX_RATE, BODY_SIGN, PATH_MOVING_MPS, Way, actChanged, movingMps, createActTrack, pushAct, readBody, readDrawn, startUnseen, type ActTrack, type BodyState, type DrawnAct } from './creatures/drawn';
import {
  DEPART_RADIUS_M, DEPART_WINDOW_TICKS, GONE_EPS, Gaze, Phase, THINK_SCAN_S, beatPhase, createBeat, deliberating, departFirst, departFollowers, departNearestFollower, departRank, firstMove,
  LATE_MAX_TICKS, gazeFor, lateTarget, ownsStep, staggerGap,
  realSeconds, restedBefore, runnerUp, startTime, stepLate, type Beat,
} from './creatures/beat';
import { Posture, intention, postureOf } from './creatures/intention';
import { Lie, SCRATCH_BELLY, SCRATCH_CUT_MOVING_S, SCRATCH_CUT_S, createIdleCtx, handHolds, idleFace, idleOverlay, lieOf, mayScratch, scratchReach, scratchRelease, scratchWrist, seatIdles } from './creatures/idle';
import { LID_MAX, bellyUnder, bodyChannels, coatUnder, coatValue, createChannels, type BodyChannels } from './creatures/bodystate';
import { bodyStateOf } from '../simulation';
import { paramsOf } from '../sim/params';
import { sampleSmooth } from './creatures/motion';
import { GAITS, Regime, advancePhase, createLock, limbPhase, resetLock, solveClimb, solveGait, stepLock, type ContactLock, type GaitSolve } from './creatures/gait';
import { referenceRate, smallMapPace } from './creatures/pace';
import {
  BLINK_SLOW, IDLE, SCRATCH, applyInertia, blinkAt, createAttention, createBlink, createIdle, createInertia, headLook, idleBit, idleCancel, idleLean, idleRate, idleSpend, idleStep,
  scanAngles, selectAttention, springStep, startInertia, type AttnCand, type Attention, type Blink, type Idle, type Inertia,
} from './creatures/secondary';
import type { KeepCandidate } from './env/occluders';
import { createTreeIndex, type TreeIndex } from './creatures/tree-index';
import { CROWN_JUMP_M, PERCH, boughStem, clamberSpeed, clambering, crownStep, nestTurn, pairReach, perchBout, perchLies, perchPosture, seatAllowed, seatGroups, trunkBound, type SeatPairs } from './creatures/perch';
import { endHeard, heardTakesHead, holding, listening } from './creatures/heard';
import {
  Listen, PatrolCode, RELEASE_BRISTLE_TAU, RELEASE_DRUM_REACH, RELEASE_WINDOW_H, backSide, createFileCue, createPatrolLook, fileCue, listenVariant,
  patrolClip, patrolLook, patrolTension, phasedParties, stepLeg, type PatrolClip,
} from './creatures/patrol';
import { hyp2 } from './fastmath';

export interface CreatureContext {
  scene: THREE.Scene; world: World; container: HTMLElement;          // container: for the DOM label overlay
  groundHeight(x: number, z: number): number;
  treeAnchor(treeId: number, out: THREE.Vector3): boolean;          // rendered crown point for nests and climbing
  /** Optional: a point on top of a crown branch (seed picks one per animal). Falls back to treeAnchor. */
  branchAnchor?(treeId: number, seed: number, out: THREE.Vector3): boolean;
  /** Optional: trunk axis (x, z) and bark radius (w) at height y. Falls back to a radius from the tree height. */
  trunkAt?(treeId: number, y: number, out: THREE.Vector4): boolean;
  /** Optional (stage W11): the point on the axis of the tree's drawn crown limbs nearest (x, y, z), with the limb's
   * radius there in out.w, so that a pair's bough can be joined to the tree. False when the tree has no drawn limbs. */
  limbNear?(treeId: number, x: number, y: number, z: number, out: THREE.Vector4): boolean;
  /** Optional (stage W11): the colour the tree's limbs read as, linear RGB, for the bough and the perch stick. */
  barkColor?(treeId: number, out: THREE.Color): boolean;
  /** Optional: nearest waterline point (drinkers lean over the water instead of drinking ~2 m from it). */
  waterEdge?(x: number, z: number, out: THREE.Vector3): boolean;
  /** Optional: a ripple source on the water surface (drinking lips, wading limbs); strength 0..1. */
  ripple?(x: number, z: number, strength: number): void;
  /** Filled in by the layer: bucketed nearest-tree lookups (the field profile has ~43,000 trees). */
  trees?: TreeIndex;
}
export interface CreatureFrame {
  dt: number; elapsed: number; selectedId: number | null; simRate: number; camera: THREE.Camera;
  /** Fraction of the next 15 s tick the clock has already accrued (0..1); positions render between tick states. */
  subTick?: number;
  /** Viewport CSS size, filled in by the layer from a ResizeObserver (overlays must not read layout per frame). */
  viewW?: number; viewH?: number;
  daylight: number; rain: number; highlightTroopId: number | null;
  layers: { labels: boolean; social: boolean; perception: boolean };
  closeView: boolean;
  /** Render quality tier; gates contact planting (high: LOD0+1, medium: LOD0, low: off). Default 'high'. */
  quality?: Quality;
  /** Optional canopy lens (strategy view): centre x, y (NDC), radius z (NDC y units), strength w; aspect = width / height.
   * Animals inside it render without the x-ray fill (outline only where still occluded). */
  lens?: THREE.Vector4; aspect?: number;
  /** Optional: the animal under the cursor (what a click would select), −1 none; its label is highlighted. Absent: the
   * labels guess the hover from the pointer themselves (harness). */
  hoverId?: number;
}
export interface CreatureLayer {
  picks: THREE.Object3D[];                                  // raycast targets, userData.chimpId
  update(frame: CreatureFrame): void;
  getPosition(id: number, out: THREE.Vector3): boolean;     // rendered position for camera follow
  getScale(id: number): number;
  /** Optional: up to out.length ground animals nearest (x, z) as (x, z, radius, 0), for understory parting. */
  bendSources?(x: number, z: number, out: THREE.Vector4[]): number;
  /**
   * Optional (keep-clear camera, docs/graphics-camera-plan.md §2.2): every rendered animal as a protected-target
   * candidate: body mid-point, radius 0.55 × body size, on-screen flag and NDC position, and the simulated tree it
   * climbs, drums on or perches in (hostTree, −1 none). Fills out[] (reused objects) and returns the count. Read-only.
   */
  keepClearCandidates?(out: KeepCandidate[], camera: THREE.Camera): number;
  /** Optional (the UI's snapshot, creatures/portrait.ts): point the portrait instance at an animal and report its head,
   * heading and size. False when the animal is not loaded, not posed yet or fading out. */
  portrait?(id: number, out: PortraitSubject): boolean;
  /** Optional: chimp id whose name label (padded hit box) contains (x, y) in viewport CSS px, else −1. */
  labelAt?(x: number, y: number): number;
  /** Optional: chimp id of the visible animal nearest (x, y) in viewport CSS px within max(radius, its on-screen
   * half-size), else −1; preferId (the hovered animal) wins close calls (creatures/pick.ts). */
  nearestAt?(x: number, y: number, camera: THREE.Camera, radius: number, preferId: number): number;
  /** Optional (stage W4, creatures/drawn.ts): the act the drawn body is in, and whether the simulation has begun a
   * newer one the body has not started. Fills out (the caller's object, reused) and returns false when the animal is
   * not drawn. Reads only. */
  drawnAct?(id: number, out: DrawnAct): boolean;
  dispose(): void;
}

const CAPACITY = 160;
const LOD_FADE = 0.25;           // seconds two LOD meshes overlap after a switch (G5 D7)
const counts = [0, 0, 0, 0];
const DEAD_VISIBLE_HOURS = 24;   // carcasses stay about one ecological day, then fade (a stylization with no source; not used for an animal the simulation tracks a body for: Chimp.remains, stage ED)
const PLAYBACK_LAG_TICKS = 2;    // motion.ts needs a known sim sample on both sides of the drawn segment
// Moving-state hysteresis in body lengths per second, and the shortest a clip plays before another replaces it.
const MOVE_ENTER = 0.3, MOVE_EXIT = 0.18, CLIP_DWELL = 0.35;
const URGENT = new Set(['dead', 'carryVentral', 'carryDorsal', 'deadCarried']);
const LOCOMOTION = new Set(['walk', 'gallop', 'sneak', 'swagger', 'bipedWalk', 'clamber']);
const LYING = new Set(['sleep', 'dead', 'rest', 'defend', 'wrestle']);
const LOCOMOTION_FAST = new Set(['gallop', 'swagger']);
// Attention off (eyes shut or no control of the head) or damped (eyes half closed, clinging, building).
const ATTN_OFF = new Set(['sleep', 'dead', 'deadCarried']);
const ATTN_LOW = new Set(['carryVentral', 'nestBuild', 'groomee', 'shelter']);
// Stage W10: the stationary clips a listener holds for a moment when a long call reaches it (creatures/heard.ts).
// Not the contact pairs (wrestling, mating, embraces, fights), whose two bodies must keep time, nor a caller's own clip.
const HEARD_HOLD = new Set(['forage', 'groom', 'groomee', 'sitIdle', 'perch', 'stand', 'drink', 'rest', 'nurse', 'play', 'beg', 'share', 'guard']);
/** Inertialization time for a clip change (s): quick for gait changes and fights, slow into lying down. */
function transitionTime(from: string, to: string): number {
  if (LOCOMOTION.has(from) && LOCOMOTION.has(to)) return 0.25;
  if (to === 'attack' || to === 'defend' || to === 'charge' || from === 'attack') return 0.18;
  if (to === 'climb' || to === 'clingTrunk' || from === 'climb' || from === 'clingTrunk') return 0.22;
  if (LYING.has(to) || LYING.has(from)) return 0.55;
  if (to.startsWith('carry') || from.startsWith('carry')) return 0.4;
  return 0.3;
}
// Arm and leg base heights (unit space) of the ground stance: a contact counts as planted only near them.
const CONTACT_BASE = [0.13, 0.13, 0.08, 0.08];

/** Per-animal render + animation state. Exposed read-only to overlay modules. */
export interface Anim {
  id: number; slot: number; chimp: Chimp;
  morph: Morph; fk: FKState; cur: Pose; out: Pose; w: Pw;
  clip: string; clipT: number; role: number; gait: Gait | null; phase: number;
  // Motion (rendered ground point, heading).
  x: number; y: number; z: number; heading: number; speed: number; vel: number; inited: boolean;
  /** Stage W1, maps that do not walk at the 160 m map's speed (creatures/pace.ts): the drawn speed with the path read at
   * the reference rate (refSpeed), and at the faster of that and the playback rate (moveSpeed); m/s. Unused on the 160 m map. */
  refSpeed: number; moveSpeed: number;
  /** Stage W1: 0..1, a stopped walker lowering its swinging limb (poses.ts PoseCtx.settle); exactly 0 while it walks. */
  settle: number;
  track: Track;                    // sim position history; track.x/y/z is the smooth sim path at render time
  acts: ActTrack;                  // act and target of the last few tick states (creatures/drawn.ts): which act the drawn body is in
  /** Stage W6: the act and target the drawn body is in (drawn.ts readDrawn, once a frame: the simulation's act, or the
   * one before it while the body has not begun the new one) and how it stands to the new one (drawn.ts Way; 0 none).
   * Poses, pairings and name tags all read these, so a pose never runs ahead of its tag. */
  act: Action; actTarget: number; way: number;
  /** Stage W11: what the name tag and the interface are told in place of `way`: the same, but for a body clambering to
   * a partner's bough, which is "going to" its act. */
  tagWay: number;
  /** Stage W6 (creatures/beat.ts): the decision beat of the newest act; how far behind its own path the body is drawn
   * so that a departure sets off in the order chosen (ecological hours); the intention movement, eased 0..1; the
   * posture of the last evaluated pose (intention.ts Posture). */
  beat: Beat; late: number; intent: number; posture: number;
  /** Stage W6: going up or down its tree's trunk whatever its act (onTrunk), eased 0..1 between its branch and the bark. */
  trunkK: number; onTrunk: boolean;
  /** Stage W6: where its body lies in its nest, kept while the drawn body is still in the nest act. Stage W9: nestK, how
   * far the drawn body has come with building it, 0..1 (1: not building). */
  nestOk: boolean; nestX: number; nestY: number; nestZ: number; nestK: number;
  ox: number; oz: number;          // eased layout offset (pairing, separation) added to the interpolated point
  // Gait and contacts (gait.ts), transitions (secondary.ts).
  moving: boolean; stillT: number; fastGait: boolean; turnRate: number; climbDy: number; dist: number; strides: number; poseDt: number;
  gs: GaitSolve; lapse: number; locks: ContactLock[]; drop: number; planted: boolean; bank: number;
  inert: Inertia; prevOut: Float32Array; prevCur: Float32Array; outVel: Float32Array; skip: Uint8Array; hold: Float32Array; holdMask: number;
  dbg: { clipSwitches: number; moveToggles: number; replants: number };
  // Attention (secondary.ts): smoothed world look point (critically damped springs), weight, eye offset, blinks.
  attn: Attention; lk: { x: number; v: number }[]; lookW: number; eye: { x: number; v: number }[]; blink: Blink; exert: number;
  rs: { x: number; v: number }[];  // rider offset springs (carried infants lag their mother slightly)
  tx: number; tz: number;          // desired rendered ground point (sim + pairing offsets)
  headingTarget: number | null;
  bodyQ: Float32Array; bx: number; by: number; bz: number; lift: number;
  elevated: number;                // 0 ground .. 1 in a tree
  carry: 0 | 1 | 2; carryBlend: number; carrierId: number;
  /** Another animal is on its body (an infant it carries, alive or dead), by the carry state of the last frame. */
  holds: boolean;
  // Appearance and overlays.
  fur: Float32Array; skin: Float32Array; gray: number; beard: number; bald: number; tuft: number; mottle: number;
  bristle: number; dim: number; fade: number; blinkAt: number; mouth: number; grin: number;
  appearanceAt: number; deadAt: number | null;
  px: number; visible: boolean; lod: number; poseAccum: number; lastSkinFrame: number;
  lodFrom: number; lodT: number;   // LOD cross-fade (G5 D7): previous mesh and seconds since the switch
  head: THREE.Vector3; top: number; troopColor: string;
  pick: THREE.Mesh; partnerId: number; look: Float32Array; hasLook: boolean;
  paired: boolean; pairClip: string | null;
  onBranch: boolean;               // sitting on an environment-provided crown limb (no prop branch needed)
  /** Stage W9 (creatures/perch.ts; layoutCrowns): its seat off the ground. up: it sits in a crown this frame (not on
   * the trunk, not in a nest); seatHost: id of the animal whose bough it sits on (−1: its own branch) with seatX/Y/Z its
   * place there and seatFace the heading it has there (NaN: none); sx/sy/sz: the drawn seat, eased toward its place
   * (seated: it had one in the frame before); perchRole: its resting posture of the bout; lies: it is drawn lying along
   * a bough. As a host (gFrame: the frame its bough was laid): the bough's origin gx/gy/gz, axis gyaw, the extent of
   * its members along it gt0..gt1 and whether it is drawn (gOn; wasHost: in the frame before); g0, g1, gm: the drawn
   * extent and end margin, eased; gr: the largest radius its tree lets it be drawn with. nursed: an infant on it is
   * suckling; holdsBack: an infant rides on its back (both by the carry state of the last frame, like `holds`).
   * ownFrame: the frame its own place in the crown was found (ownX/Y/Z), with the bearing of that place from the trunk
   * (ownYaw), whether it is on a limb the environment draws (ownLimb) and the height nothing in the crown is drawn above.
   * ownSrc: what the environment gave for that place (0 nothing, 1 the crown anchor, 2 a limb) and ownCut, the frame
   * that last changed: the forest is drawn in a window round the camera, so a tree's limbs come and go with it.
   * glide (merge of W8 and W9): how far the drawn seat still is from its place this frame, in metres (0 at rest, on
   * the ground and when the seat is drawn at once): no idle event starts on a body that is sliding to its seat. */
  up: boolean; seatHost: number; seatX: number; seatY: number; seatZ: number; seatFace: number; sx: number; sy: number; sz: number; seated: boolean; glide: number;
  perchRole: number; lies: boolean; gFrame: number; gx: number; gy: number; gz: number; gyaw: number; gt0: number; gt1: number; gOn: boolean; wasHost: boolean; g0: number; g1: number; gm: number; gr: number;
  /** Stage W11: how the bough it hosts was joined to its tree when last drawn (perch.ts boughStem: 0 its fork lies in a
   * drawn limb, 1 a stem from a drawn limb, 2 a stem from the bark; −1 no tree). For probes. */
  gJoin: number;
  nursed: boolean; holdsBack: boolean;
  /** Stage W11 (creatures/perch.ts crownStep; placeGrounded): where its body was drawn in a tree in frame cFrame
   * (cx/cy/cz) and where its own drawn path was then (qx/qy/qz), so that the placement never moves it further in one
   * frame than a clamber does. clamber: it is more than a metre from its place and drawn in the clambering clip, with
   * the eased share of that (clamberK), its speed along the way in metres a second (clamberV), the distance covered
   * since the last pose (clamberD), and the heading and pitch of its line of travel. */
  cx: number; cy: number; cz: number; cFrame: number; qx: number; qy: number; qz: number;
  clamber: boolean; clamberK: number; clamberV: number; clamberD: number; clamberYaw: number; clamberPitch: number;
  ownFrame: number; ownX: number; ownY: number; ownZ: number; ownYaw: number; ownLimb: boolean; ownTop: number; ownSrc: number; ownCut: number;
  deadCarried: boolean; deadDrop: boolean; dropX: number; dropZ: number; // a dead infant on its mother, then put down
  climbTree: number;               // tree whose trunk the animal is on this frame (−1 none)
  drumTree: number;                // tree a drummer faces and slaps (−1 none)
  drinkSimX: number; drinkSimZ: number; drinkOk: boolean; drinkX: number; drinkZ: number; // waterline spot cache
  // Border patrol (creatures/patrol.ts): drawn leg code (0 none) and animation time it began, the latest published
  // leg and its world time (stepLeg), file position and the animals ahead and behind, the listening variant and
  // back-look side, the ecological hour of the last patrol leg (release window) and the slowly settling
  // piloerection after a release display.
  pCode: number; pSince: number; pPub: number; pPubAt: number; pIndex: number; pCount: number; pAhead: number; pBehind: number; pVariant: number; pSide: number;
  patrolAt: number; relBristle: number;
  /** Stage W8 (creatures/bodystate.ts): the body's state as read about once a second (tg), as drawn (ch: eased; breath
   * is the signed breath written to the shader) and the real time it is read next. */
  tg: BodyChannels; ch: { belly: number; flank: number; lid: number; arousal: number; fear: number; breath: number }; stateAt: number;
  /** Stage W8, idle life (secondary.ts, creatures/idle.ts): the breathing phase 0..1 and its eased depth, the idle
   * schedule, the reach of a scratch under way and its eased weight shift, and the neighbour a glance is at (−1 none). */
  breathPh: number; breathAmp: number; idle: Idle; scratchK: number; leanK: number; glanceId: number;
  /** Stage W11: the scratch the arm is in or is letting go of: its place, side and the seconds since it began (kept
   * when the schedule drops the event, so the arm comes away from where it was), and for one cut short the reach it had
   * and the seconds since the cut (scrCut < 0: not letting go). idle.ts scratchRelease. */
  scrSite: number; scrSide: 0 | 1; scrT: number; scrFrom: number; scrCut: number;
  /** Stage W8: what rides on this animal this frame, as bits: 1 an infant (or a dead infant) on the belly, 2 one on the back (the carry modes). */
  bears: number;
}

const PASSIVE = new Set(['rest', 'groom', 'forage', 'travel', 'follow', 'consort', 'guard', 'share', 'beg', 'shelter', 'nurse', 'call', 'play']);
const DEFEND_OK = new Set(['submit', 'flee', 'rest', 'forage', 'groom', 'attack', 'play', 'travel', 'follow', 'beg', 'share', 'display', 'charge', 'pant-grunt', 'alarm', 'guard', 'consort', 'shelter', 'nurse']);

export function createCreatures(ctxIn: CreatureContext): CreatureLayer {
  const { scene, world } = ctxIn;
  const treeIndex = createTreeIndex(() => world);
  const ctx: CreatureContext = { ...ctxIn, trees: treeIndex };
  const group = new THREE.Group();
  group.name = 'creatures';
  scene.add(group);

  // --- Body meshes: three LODs sharing one skinning texture and material.
  const mats = createChimpMaterials(CAPACITY);
  // Levels: 0 fine, 1 mid, 2 coarse, 3 hero (G5 D6: a finer surface for an animal filling much of the frame).
  const lods: THREE.InstancedMesh[] = [];
  const slotAttrs: THREE.InstancedBufferAttribute[] = [];
  const fadeAttrs: THREE.InstancedBufferAttribute[] = [];
  function makeLod(geometry: THREE.BufferGeometry, level: number) {
    const slots = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1);
    slots.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aSlot', slots);
    // Cross-fade weight per instance (0 = solid; ±k complementary dithers while two levels overlap).
    const fades = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aLodFade', fades);
    fadeAttrs[level] = fades;
    const mesh = new THREE.InstancedMesh(geometry, mats.material, CAPACITY);
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.frustumCulled = false; // skinned in the vertex shader; bounds are per-animal
    mesh.count = 0;
    mesh.name = `chimps-lod${level}`;
    lods[level] = mesh; slotAttrs[level] = slots;
    group.add(mesh);
    if (level === 0) makeShells(geometry);
  }
  // Halo shells (B3): up to 3 copies of each LOD0 animal pushed out along the normal, strand-tip alpha with
  // alpha-to-coverage, no shadow casting. 'high' 3 shells, 'medium' 1, 'low' none.
  const SHELLS = 3;
  let shellMesh: THREE.InstancedMesh | null = null, shellSlots: THREE.InstancedBufferAttribute | null = null, shellK: THREE.InstancedBufferAttribute | null = null, shellFade: THREE.InstancedBufferAttribute | null = null;
  let shellReady = false;
  // The shell mesh exists from the start on the coarse proxy geometry, so the startup compile includes its
  // program (a first LOD0 animal would otherwise stall a frame compiling it); LOD0 geometry replaces it later.
  function makeShells(src: THREE.BufferGeometry) {
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'aSkinIndex', 'aSkinWeight', 'aRegA', 'aRegB', 'aRegC']) { const at = src.getAttribute(name); if (at) g.setAttribute(name, at); }
    g.setIndex(src.getIndex());
    if (!shellSlots || !shellK || !shellFade) {
      shellSlots = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * SHELLS), 1).setUsage(THREE.DynamicDrawUsage);
      shellK = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * SHELLS), 1).setUsage(THREE.DynamicDrawUsage);
      shellFade = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * SHELLS), 1).setUsage(THREE.DynamicDrawUsage);
    }
    g.setAttribute('aSlot', shellSlots); g.setAttribute('aShell', shellK); g.setAttribute('aLodFade', shellFade);
    if (shellMesh) { shellMesh.geometry = g; shellReady = true; return; } // the proxy wrapper shares loGeometry buffers: not disposed
    shellMesh = new THREE.InstancedMesh(g, mats.shell, CAPACITY * SHELLS);
    shellMesh.castShadow = false; shellMesh.receiveShadow = true; shellMesh.frustumCulled = false; shellMesh.count = 0;
    shellMesh.name = 'chimps-shells';
    group.add(shellMesh);
  }
  makeLod(buildChimpGeometry(0.033, true).geometry, 2);
  // Coarse proxy (~2k triangles) shared by the shadow pass and the RTS x-ray silhouettes.
  const loGeometry = buildChimpGeometry(0.045, true).geometry;
  makeShells(loGeometry);
  // Shadows come from a low-LOD proxy of every visible animal: its colour pass is clipped away in
  // the vertex shader, so only the shadow map pays for it and fine LODs skip the shadow pass.
  const shadowGeo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'aSkinIndex', 'aSkinWeight', 'aRegA', 'aRegB', 'aRegC']) shadowGeo.setAttribute(name, loGeometry.getAttribute(name));
  shadowGeo.setIndex(loGeometry.getIndex());
  const shadowSlots = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1);
  shadowSlots.setUsage(THREE.DynamicDrawUsage);
  shadowGeo.setAttribute('aSlot', shadowSlots);
  const clipMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, fog: false });
  clipMat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', 'vec4 mvPosition = vec4(0.0, 0.0, -1.0, 1.0); gl_Position = vec4(0.0, 0.0, -2.0, 1.0);'); };
  clipMat.customProgramCacheKey = () => 'mgogo-clip';
  const shadowProxy = new THREE.InstancedMesh(shadowGeo, clipMat, CAPACITY);
  shadowProxy.customDepthMaterial = mats.depth;
  shadowProxy.castShadow = true; shadowProxy.receiveShadow = false; shadowProxy.frustumCulled = false; shadowProxy.count = 0;
  shadowProxy.name = 'chimps-shadow';
  group.add(shadowProxy);
  // X-ray silhouettes for animals hidden under the canopy in the RTS view.
  const xrayGeo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'aSkinIndex', 'aSkinWeight', 'aRegA', 'aRegB', 'aRegC']) xrayGeo.setAttribute(name, loGeometry.getAttribute(name));
  xrayGeo.setIndex(loGeometry.getIndex());
  const xraySlots = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(THREE.DynamicDrawUsage);
  const xrayTint = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3).setUsage(THREE.DynamicDrawUsage);
  xrayGeo.setAttribute('aSlot', xraySlots); xrayGeo.setAttribute('aTint', xrayTint);
  const xray = { uniforms: { uOpacity: { value: 0 }, uViewport: { value: new THREE.Vector2(1440, 900) }, uBias: { value: 0.9 }, uLine: { value: new THREE.Color(0.015, 0.02, 0.018) }, uFillK: { value: 1 }, uLens: { value: new THREE.Vector4() }, uLensAspect: { value: 1.6 } } };
  const xrayFill = createSilhouetteMaterial(mats.texture, false, xray.uniforms);
  const xrayLine = createSilhouetteMaterial(mats.texture, true, xray.uniforms);
  const xrayMesh = new THREE.InstancedMesh(xrayGeo, xrayFill, CAPACITY);
  const xrayOutline = new THREE.InstancedMesh(xrayGeo, xrayLine, CAPACITY);
  xrayMesh.frustumCulled = xrayOutline.frustumCulled = false; xrayMesh.count = xrayOutline.count = 0;
  xrayOutline.renderOrder = 6; xrayMesh.renderOrder = 7; xrayMesh.name = 'chimps-xray'; xrayOutline.name = 'chimps-xray-outline';
  group.add(xrayOutline, xrayMesh);
  const tintColor = new THREE.Color();
  const GOLD_LINE = preToneMapped('#e2bf79', new THREE.Color()); // focal outline in the UI accent gold
  let xrayStrength = 0;
  // Finer LODs are polygonized in a worker (~100–200 ms each), so neither startup nor the first seconds of play
  // block on them; without workers they are built after the first frames on the main thread.
  let pendingLods: number[] = [1, 0, 3];
  let lodTimer = 0;
  const LOD_RES = [0.0125, 0.019, 0.033, 0.009];
  const scheduleLod = () => {
    lodTimer = window.setTimeout(() => {
      const level = pendingLods.shift();
      if (level === undefined || disposed) return;
      makeLod(buildChimpGeometry(LOD_RES[level], level !== 0 && level !== 3).geometry, level);
      if (pendingLods.length) scheduleLod();
    }, 60);
  };
  let lodWorker: Worker | null = null;
  try {
    lodWorker = new Worker(new URL('./creatures/body.worker.ts', import.meta.url), { type: 'module' });
    lodWorker.onmessage = (event: MessageEvent<{ level: number; attributes: Record<string, { array: Float32Array; itemSize: number }>; index: Uint16Array | Uint32Array }>) => {
      const { level, attributes, index } = event.data;
      pendingLods = pendingLods.filter(l => l !== level);
      if (disposed) return;
      const geometry = new THREE.BufferGeometry();
      for (const [name, a] of Object.entries(attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(a.array, a.itemSize));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.computeBoundingSphere();
      makeLod(geometry, level);
      if (!pendingLods.length) { lodWorker?.terminate(); lodWorker = null; }
    };
    lodWorker.onerror = () => { lodWorker?.terminate(); lodWorker = null; if (!disposed && pendingLods.length) scheduleLod(); };
    for (const level of pendingLods) lodWorker.postMessage({ level, h: LOD_RES[level], lo: level !== 0 && level !== 3 });
  } catch { lodWorker = null; scheduleLod(); }

  // Viewport size from a ResizeObserver: reading clientWidth/Height inside the frame forces a synchronous style
  // recalc whenever CSS animations or UI writes have dirtied the page since the last render (~0.6 ms a frame).
  const view = { w: ctx.container.clientWidth || 1440, h: ctx.container.clientHeight || 800 };
  const viewObserver = new ResizeObserver(entries => { const box = entries[0]?.contentRect; if (box) { view.w = box.width || view.w; view.h = box.height || view.h; } });
  viewObserver.observe(ctx.container);
  const props = createProps(group);
  const selection = createSelection(group, ctx);
  const social = createSocial(group, ctx);
  const labels = createLabels(ctx.container);
  const fx = createFX(group, ctx);
  const nests = createNests(group, ctx);
  const remains = createRemains(group, ctx); // stage ED (deadBody 1): bones; draws nothing with the switch off
  const prey = createPrey(group, ctx);

  const pickGeometry = new THREE.SphereGeometry(1, 10, 8);
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const picks: THREE.Object3D[] = [];
  const anims = new Map<number, Anim>();
  const animList: Anim[] = [];
  const freeSlots: number[] = [];
  for (let i = CAPACITY - 1; i >= 0; i--) freeSlots.push(i);
  const chimpById = new Map<number, Chimp>();
  const treeById = new Map<number, World['trees'][number]>();
  let treesRef: World['trees'] | null = null;
  const waterById = new Map<number, World['water'][number]>();   // stage W6: where an animal going to drink looks
  let waterRef: World['water'] | null = null;
  const troopColor = new Map<number, string>();
  let disposed = false;
  let frameNo = 0;
  /** Harness-only overrides (not part of the scene contract). */
  // lodFade false: a mesh-level change is drawn at once. The harness tile sheets update the layer once per tile with
  // dt 0, so a cross-fade never advanced and each tile showed the level chosen for the tile before it (W3).
  // blink false: eyes stay open (the face sheet is a check of the eyes; a blink lasts 0.13 s and hides them).
  // Stage W8. idle false: no idle life and no breathing (a stance can then be compared frame for frame). w8 false: none
  // of the stage's channels either (the coat is the clip's value, belly, flanks, lid and breath are 0, blinks are
  // short): the picture of the build before, but for the taller coat of a clip that raises it. channels: drawn values
  // forced for every animal, or for the animal `only` (proof pictures: a full coat, a full belly). idleForce: an idle
  // event held on every stationary animal that permits it, started again when it ends. body: stands in for the
  // simulation's bodyStateOf (a harness world keeps no Track E state).
  const debug: {
    clip: string | null; attention: boolean; lodFade: boolean; blink: boolean; idle: boolean; w8: boolean;
    channels?: { coat?: number; belly?: number; flank?: number; lid?: number; only?: number }; idleForce?: { kind: number; site?: number; side?: 0 | 1 };
    body?: (c: Chimp) => BodyPercept | null;
    /** Harness: forces the groomee posture (GROOMEE). */ groomee?: number; /** Harness: forces the resting posture in a crown (PERCH). */ perch?: number; anim?: (id: number) => Anim | undefined; feet?: (id: number) => unknown;
    /** Probe (stage W9): an animal's seat in its crown and how far its drawn body is from the bark. */ crown?: (id: number) => unknown; lodSwitches: number; lodBlends: number;
  } = { clip: null, attention: true, lodFade: true, blink: true, idle: true, w8: true, anim: id => anims.get(id), lodSwitches: 0, lodBlends: 0 };
  // Harness probe (?debug=feet): ankle and wrist world points, stance flags, lock states and counters.
  const FEET = [B.handL, B.handR, B.footL, B.footR];
  debug.feet = (id: number) => {
    const a = anims.get(id);
    if (!a) return null;
    const contacts = FEET.map((bone, l) => {
      boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, bone, TP, TQ4);
      const k = a.locks[l];
      return { x: TP[0], y: TP[1], z: TP[2], ground: ctx.groundHeight(TP[0], TP[2]), stance: a.out.v[PI.contact + l] > 0.5 && a.out.v[PI.ik + l * 5 + 3] > 0.5, lock: k.state, lx: k.lx, ly: k.ly, lz: k.lz, cause: k.cause, causeDrift: k.causeDrift, replants: k.replants };
    });
    return { contacts, clip: a.clip, gait: a.gait, regime: a.gs.regime, stride: a.gs.stride, f: a.gs.f, speed: a.speed / a.morph.size, moving: a.moving, planted: a.planted, size: a.morph.size, heading: a.heading, ...a.dbg };
  };
  let animClock = 0;
  const pw = new Pw();
  const pctx: PoseCtx = {
    t: 0, time: 0, phase: 0, speedU: 0, freq: 0, seed: 0, stage: 'adult', male: true, age: 20, injury: 0, mood: 'calm', energy: 1,
    vocal: null, hasTarget: false, tx: 0, ty: 0, tz: 0, tdist: 99, tsize: 1, role: 0, inTree: false, wet: 0, stride: 0, lp: 0.6, lapse: 0,
    pb: new Float32Array(15), hasBones: false, pairT: 0, side: 1, settle: 0,
  };
  const PAIR_BONES = [B.hips, B.spine, B.chest, B.neck, B.head];
  const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), Q3 = new THREE.Quaternion(), E = new THREE.Euler();
  const TP = new Float32Array(3), TQ4 = new Float32Array(4);
  const frustum = new THREE.Frustum(), projView = new THREE.Matrix4(), sphere = new THREE.Sphere();
  const anchor = new THREE.Vector3();

  function addAnim(chimp: Chimp): Anim | null {
    const slot = freeSlots.pop();
    if (slot === undefined) return null;
    const pick = new THREE.Mesh(pickGeometry, pickMaterial);
    pick.userData.chimpId = chimp.id;
    pick.matrixAutoUpdate = false;
    group.add(pick);
    picks.push(pick);
    const a: Anim = {
      id: chimp.id, slot, chimp, morph: createMorph(), fk: createFK(), cur: createPose(), out: createPose(), w: new Pw(),
      clip: '', clipT: 0, role: 0, gait: null, phase: hash01(chimp.id, 3),
      x: chimp.position[0], y: 0, z: chimp.position[2], heading: chimp.heading ?? 0, speed: 0, vel: 0, inited: false,
      track: createTrack(chimp.position[0], Math.max(0, chimp.position[1] ?? 0), chimp.position[2]), acts: createActTrack(), ox: 0, oz: 0,
      act: chimp.action, actTarget: chimp.targetId, way: Way.none, tagWay: Way.none, beat: createBeat(), late: 0, intent: 0, posture: Posture.other, trunkK: 0, onTrunk: false, nestOk: false, nestX: 0, nestY: 0, nestZ: 0, nestK: 1,
      refSpeed: 0, moveSpeed: 0, settle: 0, moving: false, stillT: 0, fastGait: false, turnRate: 0, climbDy: 0, dist: 0, strides: 0, poseDt: 0,
      gs: { f: 0, stride: 0, regime: Regime.natural }, lapse: 0, locks: [createLock(), createLock(), createLock(), createLock()], drop: 0, planted: false, bank: 0,
      inert: createInertia(POSE_SIZE), prevOut: new Float32Array(POSE_SIZE), prevCur: new Float32Array(POSE_SIZE), outVel: new Float32Array(POSE_SIZE), skip: new Uint8Array(POSE_SIZE), hold: new Float32Array(12), holdMask: 0,
      dbg: { clipSwitches: 0, moveToggles: 0, replants: 0 },
      attn: createAttention(), lk: [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }], lookW: 0, eye: [{ x: 0, v: 0 }, { x: 0, v: 0 }], blink: createBlink(chimp.id), exert: 0,
      rs: [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }],
      tx: chimp.position[0], tz: chimp.position[2], headingTarget: null,
      bodyQ: new Float32Array([0, 0, 0, 1]), bx: 0, by: 0, bz: 0, lift: 0, elevated: 0, carry: 0, carryBlend: 0, carrierId: -1, holds: false,
      fur: new Float32Array(3), skin: new Float32Array(3), gray: 0, beard: 0, bald: 0, tuft: 0, mottle: 0,
      bristle: 0, dim: 0, fade: 0, blinkAt: hash01(chimp.id, 9) * 4, mouth: 0, grin: 0, appearanceAt: -1, deadAt: null,
      px: 0, visible: true, lod: 2, lodFrom: 2, lodT: 99, poseAccum: 99, lastSkinFrame: -1, head: new THREE.Vector3(), top: 1, troopColor: '#cccccc',
      pick, partnerId: -1, look: new Float32Array(3), hasLook: false, paired: false, pairClip: null, onBranch: false,
      up: false, seatHost: -1, seatX: 0, seatY: 0, seatZ: 0, seatFace: NaN, sx: 0, sy: 0, sz: 0, seated: false, glide: 0, perchRole: 0, lies: false,
      gFrame: -1, gx: 0, gy: 0, gz: 0, gyaw: 0, gt0: 0, gt1: 0, gOn: false, wasHost: false, g0: 0, g1: 0, gm: 0, gr: 0.1, gJoin: -1, nursed: false, holdsBack: false,
      ownFrame: -1, ownX: 0, ownY: 0, ownZ: 0, ownYaw: 0, ownLimb: false, ownTop: Infinity, ownSrc: -1, ownCut: -1,
      cx: 0, cy: 0, cz: 0, cFrame: -9, qx: 0, qy: 0, qz: 0, clamber: false, clamberK: 0, clamberV: 0, clamberD: 0, clamberYaw: 0, clamberPitch: 0,
      deadCarried: false, deadDrop: false, dropX: 0, dropZ: 0, climbTree: -1, drumTree: -1,
      drinkSimX: NaN, drinkSimZ: NaN, drinkOk: false, drinkX: 0, drinkZ: 0,
      pCode: 0, pSince: 0, pPub: 0, pPubAt: 0, pIndex: 0, pCount: 0, pAhead: -1, pBehind: -1, pVariant: Listen.wait, pSide: 1, patrolAt: -1e9, relBristle: 0,
      tg: createChannels(), ch: { belly: 0, flank: 0, lid: 0, arousal: 0, fear: 0, breath: 0 }, stateAt: -1,
      breathPh: hash01(chimp.id, 53), breathAmp: 1, idle: createIdle(chimp.id), scratchK: 0, leanK: 0, glanceId: -1, bears: 0,
      scrSite: 0, scrSide: 0, scrT: 0, scrFrom: 0, scrCut: -1,
    };
    anims.set(chimp.id, a);
    animList.push(a);
    return a;
  }
  function removeAnim(a: Anim) {
    anims.delete(a.id);
    animList.splice(animList.indexOf(a), 1);
    group.remove(a.pick);
    picks.splice(picks.indexOf(a.pick), 1);
    mats.data.fill(0, a.slot * ROW_TEXELS * 4, (a.slot + 1) * ROW_TEXELS * 4);
    freeSlots.push(a.slot);
  }

  // --- Appearance: age- and seed-dependent colours (infant pale faces, darkening with age, graying, balding).
  const FUR_BLACK = [0, 0, 0], FUR_BROWN = [0, 0, 0], FACE_INFANT = [0, 0, 0], FACE_JUV = [0, 0, 0], FACE_ADULT = [0, 0, 0], FACE_LIGHT = [0, 0, 0];
  // Near-black to dark brown (B1); the sheen comes from the hair highlight, not a warm albedo.
  linearRGB('#121110', FUR_BLACK); linearRGB('#2b221c', FUR_BROWN);
  // Eastern chimpanzees: infants pale pink, faces freckle and darken through juvenility, adults brown to near-black.
  linearRGB('#dca697', FACE_INFANT); linearRGB('#86644f', FACE_JUV); linearRGB('#241a17', FACE_ADULT); linearRGB('#4f3a2f', FACE_LIGHT);
  const tmpA = [0, 0, 0], tmpB = [0, 0, 0];
  function updateAppearance(a: Anim) {
    const c = a.chimp;
    const ap = c.appearance ?? { fur: hash01(c.id, 1), face: hash01(c.id, 2), build: hash01(c.id, 4), brow: hash01(c.id, 5), ears: hash01(c.id, 6) };
    const age = c.age ?? 20;
    computeMorph(c, a.morph);
    // Fur: black to dark brown; elders brown and grizzled.
    mixRGB(FUR_BLACK, FUR_BROWN, clamp(ap.fur * 0.85 + smoothstep(30, 45, age) * 0.3, 0, 1), a.fur);
    // Face: infants pale pink, freckling through juvenility, darkening with age; seeds keep some adults light-faced.
    const light = ap.face;
    if (age < 5) mixRGB(FACE_INFANT, FACE_JUV, smoothstep(0.5, 5, age), a.skin);
    else {
      mixRGB(FACE_JUV, FACE_ADULT, smoothstep(5, 16, age) * (0.85 + 0.15 * (1 - light)), tmpA);
      mixRGB(tmpA, FACE_LIGHT, light * light * 0.35, tmpB);
      a.skin.set(tmpB);
    }
    a.mottle = clamp((smoothstep(3, 12, age) * 0.6 + smoothstep(20, 40, age) * 0.4) * (0.35 + 0.65 * hash01(c.id, 7)), 0, 1);
    a.gray = smoothstep(24, 42, age) * (0.55 + 0.45 * hash01(c.id, 8));
    a.beard = smoothstep(10, 22, age) * (0.4 + 0.5 * hash01(c.id, 11));
    a.bald = smoothstep(16, 32, age) * (c.sex === 'female' ? 1 : 0.65) * (hash01(c.id, 12) > 0.25 ? 1 : 0.3);
    a.tuft = 1 - smoothstep(3, 5.5, age);
  }

  function syncRoster() {
    chimpById.clear();
    for (const c of world.chimps) chimpById.set(c.id, c);
    for (let i = animList.length - 1; i >= 0; i--) {
      const a = animList[i];
      const c = chimpById.get(a.id);
      if (!c) { removeAnim(a); continue; }
      a.chimp = c;
    }
    for (const c of world.chimps) if (!anims.has(c.id)) addAnim(c);
    if (treesRef !== world.trees || treeById.size !== world.trees.length) {
      treesRef = world.trees; treeById.clear();
      for (const t of world.trees) treeById.set(t.id, t);
    }
    if (waterRef !== world.water || waterById.size !== world.water.length) {
      waterRef = world.water; waterById.clear();
      for (const x of world.water) waterById.set(x.id, x);
    }
    troopColor.clear();
    for (const t of world.troops) troopColor.set(t.id, t.color);
  }

  // --- Pairing: legible two-body interactions (groom, play, fight, mate, embrace, beg).
  interface Pairing { a: Anim; b: Anim; kind: string; sep: number; bHeading: number; clipA: string | null; clipB: string | null; roleA: number; roleB: number; /** Stage W9: laid out on one bough off the ground this frame, and whether this pairing also turns b. */ tree: boolean; placeB: boolean; }
  const pairings: Pairing[] = [];
  const receiver = new Map<number, Pairing>();
  const pairPool: Pairing[] = [];
  /** True when the animal is itself grooming a third animal it can be paired with (the reach and partner tests of pairingFor). */
  function groomsThird(b: Anim, a: Anim): boolean {
    if (b.act !== 'groom' || b.actTarget < 0 || b.actTarget === a.id) return false;
    const t = anims.get(b.actTarget);
    if (!t || t === b || !t.chimp.alive || !PASSIVE.has(t.act)) return false;
    return pairReach(b.track.x, b.track.y, b.track.z, t.track.x, t.track.y, t.track.z);
  }
  // Stage W6: pairings follow the act each drawn body is in (a.act, a.actTarget: drawn.ts), not the simulation's: a
  // groomer still walking up is not paired until its body is there, and its partner keeps its own pose until then.
  function pairingFor(a: Anim): void {
    const c = a.chimp, act = a.act;
    if (!c.alive || a.actTarget < 0) return;
    const b = anims.get(a.actTarget);
    if (!b || b === a || !b.chimp.alive) return;
    const bc = b.chimp;
    // Stage W11: within reach by the two DRAWN paths (perch.ts pairReach), as the acts are the drawn bodies' (W6). The
    // simulated positions run two ticks ahead: read from them, a pair stopped being drawn as a pair a tick or two
    // before the leaving partner's body moved. And a body that has left is not paired: one going up or down its trunk,
    // or one that has set off on a trip (its partner would be laid out against a walking animal and reach after it).
    if (!pairReach(a.track.x, a.track.y, a.track.z, b.track.x, b.track.y, b.track.z)) return;
    // (Set off: its drawn path moves over the ground or up and down, the test that turned its drawn act into the trip.)
    if (a.onTrunk || b.onTrunk || (BODY_SIGN[b.act] === 'go' && (b.moving || hyp2(b.track.vx, b.track.vz) > MOVE_MPS * 3600 || Math.abs(b.track.vy) > MOVE_MPS * 3600))) return;
    let kind = '', sep = 0, bHeading = 0, clipA: string | null = null, clipB: string | null = null, roleA = 0, roleB = 0;
    const mutual = b.actTarget === c.id && b.act === act;
    if (act === 'groom') {
      // Mother-and-infant grooming (stage W5; stylization, no source): an animal grooming the infant it holds works on it
      // where it clings (carryMode keeps it on the belly, poses.ts GROOM_LAP). The infant keeps its carry clip and nobody
      // is laid out: before this the groomer's hands chased a partner drawn on its own body.
      if (b.carry !== 0 && b.carrierId === a.id) {
        const p = pairPool.pop() ?? ({} as Pairing);
        p.a = a; p.b = b; p.kind = 'lap'; p.sep = 0; p.bHeading = 0; p.clipA = null; p.clipB = null; p.roleA = GROOM_LAP; p.roleB = 0; p.tree = false; p.placeB = false;
        pairings.push(p);
        return;
      }
      // The held infant grooming its carrier back: her lap pairing above draws the pair.
      if (mutual && a.carry !== 0 && a.carrierId === b.id) return;
    }
    // Mutual pairs are laid out once; a mating pair always from the male (he mounts from behind).
    if (mutual) {
      if (act === 'mate' && c.sex !== bc.sex) { if (c.sex !== 'male') return; }
      else if (b.id < a.id) return;
    }
    switch (act) {
      case 'groom':
        // Groomer sits behind the groomee (or face to face when mutual) with a clear gap between bodies.
        kind = 'groom'; sep = mutual ? 0.44 : 0.4;
        // Stage W9 (stylization; poses.ts groomerRole): a partner with an infant on its body is groomed where the infant
        // is not. Face to face the hands stay on the shoulders and head of one holding an infant on the belly.
        if (mutual) { clipB = 'groom'; roleA = groomerRole(true, b.holdsBack, b.holds && !b.holdsBack); roleB = groomerRole(true, a.holdsBack, a.holds && !a.holdsBack); bHeading = Math.PI; }
        // A receiver that is itself grooming a third animal keeps its own grooming clip and place (stage W5; a drawing
        // rule, not a source): no receiver clip or posture for it; this groomer works on it where it sits.
        else if (groomsThird(b, a)) clipB = null;
        else if (PASSIVE.has(b.act)) {
          clipB = 'groomee'; bHeading = hash01(a.id, 21) > 0.35 ? 0 : 0.6 * (hash01(b.id, 5) > 0.5 ? 1 : -1);
          // Groomee posture (grooming v2; stylization, no source): one per pair and bout of 40–70 s. Lying postures
          // only on the ground; a prone receiver lies across the groomer's front, one on its side turns its back.
          const period = 40 + 30 * hash01(b.id, 29), bout = Math.floor((animClock + hash01(a.id * 13 + b.id, 31) * period) / period);
          const pick = hash01(b.id * 7 + bout, 37), ground = (bc.position[1] ?? 0) < 0.5 && b.elevated < 0.5 && b.carry === 0;
          // Stage W5: an animal with an infant on its body never lies down under the groomer (the infant would be
          // pressed into the ground), and one cradling a dead infant, or groomed by the infant it holds, stays seated
          // (the cradling arm is the left one: no raised arm either). The harness override passes the same tests.
          const dead = (bc.carryingDeadId ?? -1) >= 0;
          roleB = groomeePosture(pick, ground, dead || b.holds, dead || (a.carry !== 0 && a.carrierId === b.id), debug.groomee);
          if (roleB === GROOMEE.prone) bHeading = (hash01(b.id, 5) > 0.5 ? 1 : -1) * Math.PI / 2;
          else if (roleB === GROOMEE.side) bHeading = 0;
          // Stage W9: with an infant riding on its back the receiver turns to the groomer, who works on its front
          // (before this the hands combed through the infant). Not one cradling a dead infant: it keeps its seat.
          roleA = groomerRole(false, b.holdsBack && !dead, false);
          if (roleA === GROOM_FRONT) bHeading = Math.PI;
        }
        else return;
        break;
      case 'play':
        if (b.act !== 'play') return;
        kind = 'play'; sep = 0.22;
        { const swap = Math.floor((animClock + hash01(a.id + b.id, 1) * 10) / 3) % 2; const tickle = hash01(a.id * 7 + b.id, 2) > 0.7;
          if (tickle) { clipA = 'tickle'; clipB = 'play'; roleA = 0; roleB = 1; kind = 'tickle'; sep = 0.3; bHeading = Math.PI; }
          else { clipA = 'wrestle'; clipB = 'wrestle'; roleA = swap; roleB = 1 - swap; bHeading = Math.PI / 2; } }
        break;
      case 'attack':
        if (!DEFEND_OK.has(b.act)) return;
        kind = 'attack'; sep = 0.2; clipB = b.act === 'attack' ? 'attack' : 'defend'; bHeading = Math.PI / 2;
        break;
      case 'mate':
        kind = 'mate'; sep = 0.26; clipB = 'mate'; roleA = c.sex === 'male' ? 0 : 1; roleB = 1 - roleA; bHeading = 0;
        break;
      case 'reconcile': case 'console':
        if (!PASSIVE.has(b.act) && b.act !== 'submit' && b.act !== 'reconcile' && b.act !== 'console') return;
        kind = 'embrace'; sep = 0.26; clipB = 'embrace'; roleA = act === 'console' ? 1 : 0; roleB = 0; bHeading = Math.PI;
        break;
      case 'beg':
        kind = 'beg'; sep = 0.42; clipB = (bc.carryingMeat ?? 0) > 0 || b.act === 'share' ? 'share' : null; bHeading = Math.PI;
        break;
      case 'share':
        kind = 'share'; sep = 0.45; clipB = b.act === 'beg' ? 'beg' : null; bHeading = Math.PI;
        break;
      case 'pant-grunt':
        kind = 'pant-grunt'; sep = 0.55; clipB = null; bHeading = Math.PI;
        break;
      case 'submit':
        kind = 'submit'; sep = 0.6; clipB = null; bHeading = Math.PI;
        break;
      default: return;
    }
    const p = pairPool.pop() ?? ({} as Pairing);
    p.a = a; p.b = b; p.kind = kind; p.sep = sep; p.bHeading = bHeading; p.clipA = clipA; p.clipB = clipB; p.roleA = roleA; p.roleB = roleB; p.tree = false; p.placeB = false;
    pairings.push(p);
    if (clipB) receiver.set(b.id, p);
  }

  // --- Keep bodies from interpenetrating: relax target positions of nearby ground animals apart,
  // except designed contact pairs (fights, wrestling, mating, embraces).
  const contactPairs = new Set<number>();
  function separate() {
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < animList.length; i++) {
        const a = animList[i];
        if (a.carry !== 0 || !a.chimp.alive || (a.chimp.position[1] ?? 0) > 0.3) continue;
        for (let j = i + 1; j < animList.length; j++) {
          const b = animList[j];
          if (b.carry !== 0 || !b.chimp.alive || (b.chimp.position[1] ?? 0) > 0.3) continue;
          const dx = b.tx - a.tx, dz = b.tz - a.tz;
          const min = 0.36 * (a.morph.size + b.morph.size);
          if (Math.abs(dx) > min || Math.abs(dz) > min) continue;
          const d = hyp2(dx, dz);
          if (d >= min) continue;
          if (contactPairs.has(a.id < b.id ? a.id * 100003 + b.id : b.id * 100003 + a.id)) continue;
          const ux = d > 1e-4 ? dx / d : Math.sin(a.id * 1.7), uz = d > 1e-4 ? dz / d : Math.cos(a.id * 1.7);
          const push = (min - d) * 0.5;
          a.tx -= ux * push; a.tz -= uz * push; b.tx += ux * push; b.tz += uz * push;
        }
      }
    }
  }

  // --- Trees: placement for climbers, perched and nesting animals.
  const trunkRadius = (t: World['trees'][number]) => 0.28 + (t.height ?? 20) * 0.017;
  function nearestTree(x: number, z: number, maxD: number) { return treeIndex.nearest(x, z, maxD); }
  const treeCache = new Map<number, number>(); // chimp id → tree id for elevated animals
  let perchYaw = 0;
  /** A tree or nest place kept from an act the simulation has left is used only within this distance (m) of the drawn
   * body (a design assumption: wider than a crown). A safety net: a body that has set off is read as on the move
   * (update) and uses no remembered tree at all, so this only bounds what a wrong note in the record could do. */
  const REMEMBERED_TREE_M = 30;
  function treeFor(a: Anim): World['trees'][number] | null {
    const c = a.chimp;
    // (W6: the tree the drawn body is in. The simulation's position is two ticks ahead: an animal still coming down
    // its trunk on screen is already walking away there, out of reach of the tree, and lost its trunk half way down.)
    const px = a.track.n > 0 ? a.track.x : c.position[0], pz = a.track.n > 0 ? a.track.z : c.position[2];
    // Stage W6: by the act the drawn body is in. An animal on its way to a nest tree is still in the crown it is leaving.
    // The tree of an act the simulation has already left (the drawn act is a remembered one) counts only while the
    // drawn body is near it (REMEMBERED_TREE_M): a remembered target must never carry a body across the map.
    if (a.act === 'climb' || a.act === 'nest') {
      const t = treeById.get(a.act === 'nest' && c.nest && c.action === 'nest' ? c.nest.treeId : a.actTarget);
      if (t && (a.act === c.action || hyp2(t.position[0] - px, t.position[2] - pz) < REMEMBERED_TREE_M)) return t;
    }
    const cached = treeCache.get(a.id);
    if (cached !== undefined) { const t = treeById.get(cached); if (t && hyp2(t.position[0] - px, t.position[2] - pz) < 6) return t; }
    const t = nearestTree(px, pz, 6);
    if (t) treeCache.set(a.id, t.id);
    return t;
  }

  // --- Seats in crowns (stage W9; creatures/perch.ts, docs/staging/w9b-tree-pairs.md). Render-only: simulated positions
  // are never changed. Everything below is a stylization (no source for how chimpanzees arrange themselves on a branch).
  /**
   * The animal's own place in a crown, into its own* fields (once a frame): a point on a limb the environment draws
   * (ownLimb), else out along a stable direction from the crown anchor so it sits on a branch, never in the trunk.
   * ownYaw: the bearing of that place from the trunk; ownTop: the height nothing in this crown is drawn above.
   * (px, pz): the animal's drawn ground point; y0: its simulated height above sea level. (The placement stage W6 had
   * inline in placeGrounded, moved here unchanged so that the pair layout can ask for a partner's place.)
   */
  function ownSeat(a: Anim, tree: World['trees'][number], px: number, pz: number, y0: number) {
    const r0 = trunkRadius(tree);
    let dx = px - tree.position[0], dz = pz - tree.position[2];
    let dl = hyp2(dx, dz);
    if (dl < 0.05) { const ang = hash01(a.id, 41) * Math.PI * 2; dx = Math.sin(ang); dz = Math.cos(ang); dl = 1; }
    let crownTop = Infinity, x: number, y = y0, z: number;
    if (ctx.treeAnchor(tree.id, anchor)) crownTop = anchor.y + 1.5;
    if (ctx.branchAnchor && ctx.branchAnchor(tree.id, a.id, anchor)) {
      // On a real crown branch provided by the environment.
      a.ownLimb = true; x = anchor.x; z = anchor.z; y = anchor.y;
    } else {
      // Out along a stable direction from the crown anchor so the animal sits on a branch, never in the trunk.
      a.ownLimb = false;
      const hasAnchor = crownTop < Infinity;
      const ox = hasAnchor ? anchor.x : tree.position[0], oz = hasAnchor ? anchor.z : tree.position[2];
      const out = 1.0 + hash01(a.id, 43) * 1.6;
      const jit = (hash01(a.id, 46) - 0.5) * 1.8; // animals in one tree spread onto different branches
      const ux = dx / dl * Math.cos(jit) + dz / dl * Math.sin(jit), uz = -dx / dl * Math.sin(jit) + dz / dl * Math.cos(jit);
      x = ox + ux * out; z = oz + uz * out;
      // Keep clear of the trunk axis.
      const tx0 = x - tree.position[0], tz0 = z - tree.position[2], td = hyp2(tx0, tz0);
      if (td < r0 + 0.8) { x = tree.position[0] + tx0 / (td || 1) * (r0 + 0.8); z = tree.position[2] + tz0 / (td || 1) * (r0 + 0.8); }
      if (hasAnchor) y = clamp(y, anchor.y - 2.5, anchor.y + 0.4) + (hash01(a.id, 44) - 0.5) * 0.6;
    }
    a.ownX = x; a.ownY = Math.min(y, crownTop); a.ownZ = z; a.ownYaw = Math.atan2(x - tree.position[0], z - tree.position[2]); a.ownTop = crownTop; a.ownFrame = frameNo;
    // What the environment answered. The field map draws its forest in a window round the camera: when the camera
    // arrives at a far tree the limbs appear (and a place found without them is 3 to 17 m from the limb), and they go
    // when it leaves. placeGrounded draws that change at once.
    const src = a.ownLimb ? 2 : crownTop < Infinity ? 1 : 0;
    if (src !== a.ownSrc) { a.ownSrc = src; a.ownCut = frameNo; }
  }
  /** The animal's own place in its crown as it stands before this frame's motion (the pair layout runs first). False
   * when it is in no tree. */
  function ownOf(a: Anim): boolean {
    if (a.ownFrame === frameNo) return true;
    const tree = treeFor(a);
    if (!tree) return false;
    ownSeat(a, tree, a.track.x + a.ox, a.track.z + a.oz, ctx.groundHeight(tree.position[0], tree.position[2]) + a.track.y);
    return true;
  }
  // A level bough: the support a pair, a chain or a lying animal is drawn on. The environment's crown limbs are few,
  // steep (they kink upward toward the leaves) and a metre or two long, so two animals at grooming distance do not fit
  // on one at one height, and a body cannot lie along one. The bough is a prop (the stick the harness has always drawn
  // under perched animals): it crosses the host's own limb at the host's seat, set a little toward the trunk so that
  // bodies on it clear the rising limb, and runs across the limb's direction, where there is room both ways.
  // Sizes in body lengths of the host (design assumptions): inset 0.22, end margin 0.45, radius 0.065 (0.095 under a
  // lying body, about 28 cm thick for an adult), half the length under a lying body 0.62.
  // A bough is never drawn thicker than half the trunk beside it (BOUGH_TRUNK), and its line keeps BOUGH_CLEAR body
  // lengths from the bark, so that nobody on it sits in the trunk (in small trees the limbs start at the bole).
  const BOUGH_INSET = 0.22, BOUGH_MARGIN = 0.45, BOUGH_R = 0.065, BOUGH_R_LIE = 0.095, LIE_HALF = 0.62, BOUGH_TRUNK = 0.5, BOUGH_CLEAR = 0.45;
  /** What a tree offers to lie on, by its height in metres (design assumptions; perch.ts perchPosture): from 18 m a limb
   * a body can lie prone on (the environment draws limbs about a fifth as thick as the trunk, which thickens with
   * height: about 25 cm at 18 m); from 10 m a bough to recline along; under that, seated postures only. */
  const LARGE_LIMB_TREE_M = 18, RECLINE_TREE_M = 10;
  /** Two seats nearer than this share of the two body sizes are in each other's bodies, and the gap a neighbour joining
   * a bough is given (design assumptions; the ground's separation uses 0.36). */
  const CROWD = 0.42, NEIGHBOUR_GAP = 0.44;
  /** (Stage W11: the rule that a seat more than 6 m away is drawn at once is gone; the fastest a body moves to its
   * seat is perch.ts clamberSpeed, 2.5 m a second of real time up to Watch 4x, and a long move is drawn clambering.) */
  /** Lays host h's bough for this frame (once): origin, axis and an empty extent. False when it is in no tree. */
  function boughOf(h: Anim): boolean {
    if (h.gFrame === frameNo) return true;
    if (!ownOf(h)) return false;
    const k = h.ownLimb ? BOUGH_INSET * h.morph.size : 0, tree = treeFor(h)!;
    h.gx = h.ownX - Math.sin(h.ownYaw) * k; h.gy = h.ownY; h.gz = h.ownZ - Math.cos(h.ownYaw) * k;
    // Clear of the bark, and across the direction out from the trunk as it stands at this height (it leans).
    trunkPoint(tree, h.gy + 0.4 * h.morph.size, T4b);
    let rx = h.gx - T4b.x, rz = h.gz - T4b.z, rd = hyp2(rx, rz);
    if (rd < 1e-3) { rx = Math.sin(h.ownYaw); rz = Math.cos(h.ownYaw); rd = 1; }
    const need = T4b.w + BOUGH_CLEAR * h.morph.size;
    if (rd < need) { h.gx = T4b.x + rx / rd * need; h.gz = T4b.z + rz / rd * need; }
    h.gr = Math.max(0.03 * h.morph.size, Math.min(BOUGH_R_LIE * h.morph.size, BOUGH_TRUNK * T4b.w));
    // The axis: place s along the bough is the point (gx + cos(gyaw) s, gz − sin(gyaw) s); one of the two ways by individual.
    h.gyaw = Math.atan2(rx, rz) + (hash01(h.id, 71) > 0.5 ? 0 : Math.PI);
    h.gt0 = 0; h.gt1 = 0; h.gFrame = frameNo;
    return true;
  }
  /** Seats animal a at place `at` of host h's bough (h's bough is laid). */
  function seatOn(a: Anim, h: Anim, at: number) {
    a.seatHost = h.id; a.seatX = h.gx + Math.cos(h.gyaw) * at; a.seatY = h.gy; a.seatZ = h.gz - Math.sin(h.gyaw) * at;
    if (at < h.gt0) h.gt0 = at;
    if (at > h.gt1) h.gt1 = at;
  }
  // Probe (capture scripts): where an animal sits in its crown and how far its drawn body is from its tree's trunk.
  debug.crown = (id: number) => {
    const a = anims.get(id);
    if (!a) return null;
    const tree = treeFor(a), c = a.chimp;
    let clear = NaN, tx = NaN, tz = NaN;
    if (tree) { trunkPoint(tree, a.by + 0.4 * a.morph.size, T4b); clear = hyp2(a.bx - T4b.x, a.bz - T4b.z) - T4b.w; tx = T4b.x; tz = T4b.z; }
    return { up: a.up, trunk: [tx, tz], nestK: a.nestK, tree: tree?.id ?? -1, treeHeight: tree?.height ?? 0, seatHost: a.seatHost, lies: a.lies, perchRole: a.perchRole, onLimb: a.ownLimb, own: [a.ownX, a.ownY, a.ownZ], seat: [a.sx, a.sy, a.sz],
      offsetM: hyp2(a.bx - c.position[0], a.bz - c.position[2]), ownOffsetM: hyp2(a.ownX - c.position[0], a.ownZ - c.position[2]), trunkClearM: clear, bough: a.gm > 0.02 ? [a.g0 - a.gm, a.g1 + a.gm] : null, join: a.gm > 0.02 ? a.gJoin : null };
  };
  const SP: SeatPairs = { a: new Int32Array(64), b: new Int32Array(64), sep: new Float32Array(64), n: 0 };
  const seatHostOf = new Int32Array(CAPACITY), seatAt = new Float32Array(CAPACITY), seatDone = new Uint8Array(CAPACITY), seatId = new Int32Array(CAPACITY), seatRank = new Float64Array(CAPACITY);
  const slotAnim: (Anim | undefined)[] = new Array<Anim | undefined>(CAPACITY).fill(undefined);
  // Seats taken in crowns this frame: the animals that host a bough or sit alone at their own place.
  const taken: (Anim | undefined)[] = new Array<Anim | undefined>(CAPACITY).fill(undefined);
  /**
   * Who sits where off the ground this frame (perch.ts holds the rules): everyone joined by pairings shares one bough
   * at the ground layout's distances, each actor at its partner; an animal resting alone takes its posture of the
   * bout, and a bough when that posture lies down; and an animal whose own place is inside another's body, or on an
   * occupied bough, sits beside it on that bough (the environment has a handful of limbs per crown and a limb is chosen
   * by the animal's id: two animals often drew the same spot, and the ground's separation does not reach a crown).
   * Sets seat places and headings; placeGrounded draws them. Runs once a frame, before motion. Nothing here allocates.
   */
  function layoutCrowns(dt: number) {
    for (const a of animList) { a.wasHost = a.gOn; a.seatHost = -1; a.seatFace = NaN; a.gOn = false; }
    if (SP.n) {
      for (let i = 0; i < SP.n; i++) for (let k = 0; k < 2; k++) {
        // The bough stays with the animal that hosted it in the frame before, else it is that of an animal that is only
        // worked on (the others come to it), else the lowest id's.
        const x = slotAnim[k ? SP.b[i] : SP.a[i]]!;
        seatHostOf[x.slot] = -1; seatId[x.slot] = x.id; seatRank[x.slot] = (x.wasHost ? 0 : actorIds.has(x.id) ? 2 : 1) * 1e6 + x.id;
      }
      seatGroups(SP, seatId, seatRank, seatHostOf, seatAt, seatDone);
      for (let i = 0; i < SP.n; i++) for (let k = 0; k < 2; k++) { const h = slotAnim[k ? SP.b[i] : SP.a[i]]!; if (seatHostOf[h.slot] === h.slot && h.seatHost < 0 && boughOf(h)) seatOn(h, h, 0); }
      for (let i = 0; i < SP.n; i++) for (let k = 0; k < 2; k++) {
        const a = slotAnim[k ? SP.b[i] : SP.a[i]]!, h = slotAnim[seatHostOf[a.slot]];
        if (!h || h === a || a.seatHost >= 0 || h.seatHost !== h.id) continue;
        // No further from its own simulated position than it could already be drawn (perch.ts seatAllowed); one that
        // would be stays on its own branch, as before this stage.
        const at = seatAt[a.slot], own = ownOf(a) ? hyp2(a.ownX - a.track.x, a.ownZ - a.track.z) : 0;
        if (!seatAllowed(hyp2(h.gx + Math.cos(h.gyaw) * at - a.track.x, h.gz - Math.sin(h.gyaw) * at - a.track.z), own)) continue;
        seatOn(a, h, at); h.gOn = true;
      }
      // A host nobody could join keeps its own place.
      for (let i = 0; i < SP.n; i++) for (let k = 0; k < 2; k++) { const h = slotAnim[k ? SP.b[i] : SP.a[i]]!; if (h.seatHost === h.id && !h.gOn) h.seatHost = -1; }
      // Each actor faces its partner along the bough; a receiver this pairing places is turned as on the ground.
      for (const p of pairings) {
        if (!p.tree) continue;
        const a = p.a, b = p.b;
        if (a.seatHost < 0 || a.seatHost !== b.seatHost) continue;
        const face = Math.atan2(b.seatX - a.seatX, b.seatZ - a.seatZ);
        a.seatFace = face; a.headingTarget = face;
        if (p.placeB) { b.seatFace = face + p.bHeading; b.headingTarget = b.seatFace; }
      }
    }
    let nTaken = 0;
    for (const a of animList) if (a.gOn) taken[nTaken++] = a;
    for (const a of animList) {
      if (!a.up) {
        a.lies = false;
        // Stage W11: an animal in its nest (building or asleep; `up` leaves the nest act out) is turned by ONE heading
        // too: the bearing of its place from the trunk with its own offset, and while it builds the turn of the moment
        // (perch.ts nestTurn). The motion step's target and the placement's are this same value, as for an animal on
        // its limb below. Before, the motion step pulled it toward the simulated heading (at a rate that follows the
        // frame time) and the placement pulled it back (at a fixed rate): with every third frame 35 ms longer a
        // builder's heading travelled 98 rad in 80 s, a sleeper's 9 rad in 10 s, and the builder's four turns came out
        // at 1.0 rad instead of 1.9. Not while its decision beat turns it to what it chose (as below).
        if (a.act === 'nest' && a.carry === 0 && a.chimp.alive && a.track.y > 0.3 && !a.onTrunk && a.chimp.action !== 'climb' && !(a.way === Way.soon && a.beat.phase >= Phase.look) && ownOf(a)) {
          a.seatFace = a.ownYaw + (hash01(a.id, 45) - 0.5) * 1.2 + nestTurn(a.nestK); a.headingTarget = a.seatFace;
        }
        continue;
      }
      // Its resting posture of this bout (perch.ts), from those its tree offers.
      const tree = treeFor(a), th = tree ? tree.height ?? 0 : 0;
      // (Never prone for an infant, nor for an animal with an infant on its body: it would lie on it.)
      a.perchRole = perchPosture(a.id, perchBout(a.id, animClock), th >= LARGE_LIMB_TREE_M && a.chimp.age >= 4 && !a.holds ? 2 : th >= RECLINE_TREE_M ? 1 : 0, debug.perch);
      if (a.seatHost >= 0) { a.lies = false; continue; }
      if (!ownOf(a)) { a.lies = false; continue; }
      // Its own place, unless that is inside a body already seated: then beside it, on that animal's bough. An animal
      // that lies, or would in this bout, needs room for its length as well (`near`): with a neighbour inside that it
      // stays seated. (Looked for before the lying seat is given: a body lying down was laid through its neighbour;
      // filmed, a three-year-old reclining inside a feeding adult 0.27 m away.)
      const long = perchLies(a.perchRole) || (a.clip === 'perch' && perchLies(a.role)) ? LIE_HALF * a.morph.size : 0;
      let h: Anim | undefined, near = false;
      for (let i = 0; i < nTaken && !h; i++) {
        const o = taken[i]!, reach = CROWD * (a.morph.size + o.morph.size), laid = o.gFrame === frameNo;
        if (Math.abs(a.ownY - (laid ? o.gy : o.ownY)) > reach * 2) continue;
        let d: number;
        if (laid) {
          // A bough: the distance from the place to the stretch its members sit on.
          const ex = a.ownX - o.gx, ez = a.ownZ - o.gz, cx = Math.cos(o.gyaw), cz = -Math.sin(o.gyaw);
          const tc = clamp(ex * cx + ez * cz, o.gt0, o.gt1);
          d = hyp2(ex - cx * tc, ez - cz * tc);
        } else d = hyp2(a.ownX - o.ownX, a.ownZ - o.ownZ);
        if (d < reach) h = o;
        else if (d < reach + long) near = true;
      }
      if (h || near) { if (perchLies(a.perchRole)) a.perchRole = PERCH.hold; a.lies = false; }
      // A lying posture (as drawn: the clip and role of the last pose) takes a bough through its own seat and lies along it.
      // (Never the actor of a pairing: its role is its pairing's this frame, not the posture it was drawn in.)
      // (Stage W11: and it still lies while it clambers the way to the bough it was given for lying, or its place would
      // go back to its limb the moment the clambering clip replaced the lying one, and it would go to and fro.)
      else a.lies = !a.paired && ((a.clip === 'perch' && perchLies(a.role)) || (a.clip === 'clamber' && a.lies && perchLies(a.perchRole)));
      if (a.lies && boughOf(a)) {
        const half = LIE_HALF * a.morph.size;
        a.seatHost = a.id; a.seatX = a.gx; a.seatY = a.gy; a.seatZ = a.gz; a.gt0 = -half; a.gt1 = half; a.gOn = true;
        a.seatFace = a.gyaw + Math.PI / 2; a.headingTarget = a.seatFace;
        taken[nTaken++] = a;
        continue;
      }
      if (h && boughOf(h)) {
        if (h.seatHost < 0) seatOn(h, h, 0);
        const t = (a.ownX - h.gx) * Math.cos(h.gyaw) - (a.ownZ - h.gz) * Math.sin(h.gyaw), gap = NEIGHBOUR_GAP * (a.morph.size + h.morph.size);
        const at = t < (h.gt0 + h.gt1) * 0.5 ? h.gt0 - gap : h.gt1 + gap;
        seatOn(a, h, at); h.gOn = true;
        // It sits along the bough, turned the way that is nearer to how it faced on its own limb.
        const along = h.gyaw + Math.PI / 2, own = a.ownYaw + (hash01(a.id, 45) - 0.5) * 1.2;
        a.seatFace = Math.cos(own - along) >= 0 ? along : along + Math.PI; a.headingTarget = a.seatFace;
      } else {
        taken[nTaken++] = a;
        // On its own limb it faces roughly outward along it, as before this stage, but by ONE damped turn: the heading
        // target of the motion step is that facing too. Before, the motion step pulled the heading to the simulated
        // heading at a rate that follows the frame time and the placement pulled it back to the limb at a fixed rate,
        // so the balance between the two moved with every change of frame time and a perched animal rocked on its seat
        // (wrists 1 to 2.4 m of path in 12 s on a busy machine). Not while its decision beat turns it to what it chose
        // (placeGrounded, stage W6): then it keeps the heading it has.
        if (!(a.way === Way.soon && a.beat.phase >= Phase.look)) { a.seatFace = a.ownYaw + (hash01(a.id, 45) - 0.5) * 1.2; a.headingTarget = a.seatFace; }
      }
    }
    // Stage W11: a body clambering to its place faces along its line of travel (placeGrounded), by the same single turn.
    for (const a of animList) if (a.clamber) { a.seatFace = a.clamberYaw; a.headingTarget = a.clamberYaw; }
    // The drawn boughs ease out to their members and back in when they leave.
    for (const a of animList) if (a.gOn || a.gm > 0) {
      a.g0 = damp(a.g0, a.gOn ? a.gt0 : 0, 6, dt); a.g1 = damp(a.g1, a.gOn ? a.gt1 : 0, 6, dt);
      a.gm = damp(a.gm, a.gOn ? BOUGH_MARGIN * a.morph.size : 0, 6, dt);
      if (!a.gOn && a.gm < 0.01) { a.gm = 0; a.g0 = 0; a.g1 = 0; }
    }
  }

  // --- Border patrols (creatures/patrol.ts): each animal's leg and file position, from parties with a published
  // Party.patrolPhase. Animals whose party has none keep today's patrol clips.
  const patrolParties = new Map<number, World['parties'][number]>();
  const PCLIP: PatrolClip = { clip: '', role: 0, gait: null };
  const PLOOK = createPatrolLook(), CUE = createFileCue();
  function resolvePatrol(a: Anim) {
    const cue = fileCue(a.chimp, patrolParties, CUE);
    stepLeg(a, a.carry === 0 ? cue.code : PatrolCode.none, world.time, playback.renderT, animClock);
    a.pIndex = cue.index; a.pCount = cue.count; a.pAhead = cue.ahead; a.pBehind = cue.behind;
    if (a.pCode === PatrolCode.none) return;
    a.patrolAt = world.time;
    // Back-look side: toward the animal behind (its side in this animal's body frame), else a stable side per animal.
    const b = a.pBehind >= 0 ? anims.get(a.pBehind) : undefined;
    a.pSide = backSide(a.id);
    if (b) { const lx = (b.x - a.x) * Math.cos(a.heading) - (b.z - a.z) * Math.sin(a.heading); if (Math.abs(lx) > 0.05 * a.morph.size) a.pSide = lx > 0 ? 1 : -1; }
  }
  /** A display or call by an animal whose patrol leg ended less than RELEASE_WINDOW_H ago: the patrol's release. */
  function releasing(a: Anim): boolean {
    const since = world.time - a.patrolAt;
    if (!(since >= 0 && since < RELEASE_WINDOW_H)) return false;
    const c = a.chimp, act = c.action;
    return act === 'display' || act === 'charge' || (act === 'call' && (c.vocal === 'drum' || c.vocal === 'pant-hoot'));
  }

  function quickGait(a: Anim, fast: number, enter: number) { return (a.fastGait = a.fastGait ? fast > enter * 0.8 : fast > enter); }
  // --- Clip choice from action, motion, pairing, carrying and height.
  // Stage W6: the act is the one the drawn body is in (a.act, drawn.ts): while its tag still reads "about to" or
  // "walking to", the body keeps the pose of the act before, sits up or rises in the last moments (the decision beat,
  // creatures/beat.ts), walks or climbs when its path does, and stands neutral when it pauses on the way; the pose of
  // the new act comes at the moment the tag turns plain. The timings and substitutions are stylizations.
  const NEUTRAL: [string, number, Gait | null] = ['stand', 0, null], CLAMBER: [string, number, Gait | null] = ['clamber', 0, 'walk'];
  /** Simulated seconds the building clip plays from the drawn body's arrival at its nest place (stage W6's four
   * minutes; the simulation builds for 3 to 5 [H, nestBuildMinS and nestBuildSpanS]). Stage W9: the nest grows over
   * them, and the builder faces five ways in turn as it pulls branches in from all round (perch.ts nestTurn; stylization). */
  const NEST_BUILD_S = 240;
  function chooseClip(a: Anim, moving: boolean, fast: number): [string, number, Gait | null] {
    const c = a.chimp;
    if (debug.clip) return [debug.clip, 0, null];
    if (a.carry === 1) return [c.alive ? 'carryVentral' : 'deadCarried', 0, null];
    if (a.carry === 2) return ['carryDorsal', 0, null];
    if (!c.alive || c.action === 'dead') return ['dead', 0, null];
    // Stage W11: more than a metre from its place in a tree (a pair's bough, its own limb, the bark), it clambers there
    // on all fours, whatever its act (placeGrounded sets it; perch.ts clambering). Before, it slid there seated, or
    // was put there in one frame.
    // (Not here for an animal in its nest act: the nest's progress is worked out below first, or a builder that clambered
    // the last metre to its nest place lost it, was sent back to its limb, and went to and fro for the whole build.)
    const act = a.act;
    const high = a.elevated > 0.5;
    if (a.clamber && !(act === 'nest' && (high || c.nest))) return CLAMBER;
    const about = a.way !== Way.none, onWay = a.way >= Way.going;
    // Stage W6: on its tree's trunk, going up or down, whatever its act (placeGrounded): the climb cycle. The creature
    // layer drives its phase by height, so going down runs it backwards (feet first: the project's drawing rule).
    if (a.trunkK > 0.5 && a.y > 0.25 && act !== 'climb') return [Math.abs(a.track.vy) * pbRate > 0.02 || a.vel > 0.02 ? 'climb' : 'clingTrunk', 0, 'climb'];
    // W1: an animal above 0.3 m is drawn at its place on a branch whatever its sim position does there (placeGrounded
    // uses the same height), so sideways movement at height takes no locomotion clip: it would walk or gallop on the
    // spot (players at 12 m were drawn galloping). It keeps the clip of what it is doing; climbing keeps its own. A
    // clamber clip that moves through the crown is a later stage.
    const still = !moving || (a.y > 0.3 && act !== 'climb');
    const recv = receiver.get(a.id);
    if (recv && recv.clipB && still) return [recv.clipB, recv.roleB, null];
    if (a.pairClip && still) return [a.pairClip, a.role, null];
    const pairA = a.paired;
    if (act === 'climb' && (c.position[1] ?? 0) > 0.25) return [moving || a.vel > 0.02 ? 'climb' : 'clingTrunk', 0, 'climb'];
    if (act === 'nest' && (high || c.nest)) {
      // The first minutes in the nest tree are construction: four simulated minutes from the moment the drawn body
      // arrived there (stage W6: the act's own clock also counts the walk and the climb to the tree, so a long way
      // left no building to see), or of the act when the arrival was not seen. An animal about to leave its nest
      // (the drawn act is still the night's) sleeps on, then sits up.
      // (Not after skipped states: the moment the body was first seen in the nest is then not its arrival, and every
      // sleeper would build for four minutes after a fast-forward.)
      const seen = a.acts.shown === a.acts.since && Number.isFinite(a.acts.shownAt) && !startUnseen(a.acts);
      const built = seen ? (playback.renderT - a.late - a.acts.shownAt) * 3600 : c.actionTime ?? 9999, building = !about && built < NEST_BUILD_S;
      // Stage W9: how far the building has come, for the nest that grows under it and the builder's turns (placeGrounded).
      a.nestK = building ? clamp(built / NEST_BUILD_S, 0, 1) : 1;
      if (a.clamber) return CLAMBER;
      if (about && still && (a.beat.up || a.beat.phase !== Phase.none)) { a.beat.up = true; return ['perch', 0, null]; }
      return [building ? 'nestBuild' : 'sleep', 0, null];
    }
    if (a.pCode !== PatrolCode.none && !high) {
      // Border patrol with a published leg (creatures/patrol.ts); without one the ordinary patrol clips below apply.
      if (a.pCode === PatrolCode.listen && !moving) a.pVariant = listenVariant(a.id, a.pIndex, a.pCount, animClock, a.pSince);
      const pc = patrolClip(a.pCode, moving, a.pVariant, PCLIP);
      if (pc) {
        if (!moving) { a.fastGait = false; a.pVariant = pc.role; }
        else if (a.pCode === PatrolCode.return && quickGait(a, fast, 3.2)) return ['gallop', 0, 'gallop'];
        return [pc.clip, pc.role, pc.gait];
      }
    }
    if (!still) {
      // Walk ↔ gallop with hysteresis (exit 20% below entry) so speed noise cannot flicker the gait.
      // (W6: a body still finishing the act before moves in that act's gait; one on its way to the new act in the new one's.)
      switch (about && !onWay ? act : c.action) {
        case 'charge': return ['gallop', 1, 'gallop'];
        case 'flee': case 'hunt': return ['gallop', 0, 'gallop'];
        case 'play': return quickGait(a, fast, 1.2) ? ['gallop', 0, 'gallop'] : ['walk', 0, 'walk'];
        case 'display': return quickGait(a, fast, 2.2) ? ['gallop', 2, 'gallop'] : ['swagger', 0, 'biped'];
        case 'transfer': case 'patrol': return ['sneak', 0, 'sneak'];
        default: return quickGait(a, fast, 3.2) ? ['gallop', 0, 'gallop'] : ['walk', 0, 'walk'];
      }
    }
    a.fastGait = false;
    if (about) {
      // Paused on the way to the act (a ford, the foot of the tree): a neutral pose, never the pose of the act it has
      // not reached and not the one it left.
      if (onWay) return high ? ['perch', 0, null] : NEUTRAL;
      // Not set off yet. On the ground a lying animal sits up as its beat begins (lying, its eyes are half shut and its
      // head barely turns: the glance and the look would not show), and stays up (beat.up); once
      // the body's own time has reached a trip the simulation has not started moving, it stands and waits for company.
      if (!high) {
        if (a.beat.waiting) return NEUTRAL;
        if (a.beat.up || (a.beat.phase !== Phase.none && a.posture === Posture.lying)) { a.beat.up = true; return ['sitIdle', 0, null]; }
      }
    }
    if (high) {
      // Stage W9: resting in a crown takes the individual's posture of the bout (creatures/perch.ts); sheltering and
      // alarm keep their own clips (their crown variants, poses.ts), and a mother whose infant is suckling on her sits
      // in the nursing posture. All of them used to be the one seated 'perch'. An animal lying along a bough sits up
      // as its decision beat begins and stays up, as one lying on the ground does (the glance and the look of the beat
      // do not show on a lying body; stage W6's rule).
      const rest = about && (a.beat.up || (a.beat.phase !== Phase.none && a.posture === Posture.lying)) ? (a.beat.up = true, PERCH.hold) : a.perchRole;
      switch (act) {
        case 'forage': return ['forage', 0, null];
        case 'groom': if (pairA) return ['groom', a.role, null]; break;
        case 'call': return ['pantHoot', 0, null];
        case 'play': return ['play', 0, null];
        case 'shelter': return ['shelter', 0, null];
        case 'alarm': return ['alarm', 0, null];
        // The actor of a pair laid out in the crown plays its part of the pair, as on the ground (its partner already did).
        case 'mate': if (pairA) return ['mate', a.role, null]; break;
        case 'reconcile': if (pairA) return ['embrace', 0, null]; break;
        case 'console': if (pairA) return ['embrace', 1, null]; break;
        case 'beg': if (pairA) return ['beg', 0, null]; break;
        case 'share': if (pairA) return ['share', 0, null]; break;
        default: break;
      }
      if (a.nursed) return ['nurse', 0, null];
      // The actor of a pairing with no clip of its own at height (a pant-grunt, a submission, an attack) keeps the seat
      // its pairing names: update() rewrites a paired actor's role every frame, so any other posture was dropped and
      // started again about three times a second (the fault stage W5 found on receivers; measured here before the fix:
      // 11 clip changes in 4 s). The pairing's role is 0 in all three, the plain seat.
      if (pairA) return ['perch', perchLies(a.role) ? PERCH.hold : a.role, null];
      // Only an animal that rests, or keeps a resting companion company (follow), lies down along a bough; in any other
      // act (guarding a mate, a pause in a trip, a partner out of reach) it keeps to the seated postures.
      return ['perch', act !== 'rest' && act !== 'follow' && perchLies(rest) ? PERCH.hold : rest, null];
    }
    switch (act) {
      // While the body waits for its next act the resting posture it is in stays (the decision that ends the rest also
      // re-rolls the hash the posture is drawn from: without this it would lie down or sit up at that moment).
      // An animal that comes out of another pose (it was being groomed) while it waits does not lie down for a moment: it sits.
      case 'rest': return about ? (a.clip === 'rest' ? ['rest', a.role, null] : ['sitIdle', 0, null]) : ['rest', Math.floor(hash01(a.id, c.decisionVersion ?? 0) * 3), null];
      case 'forage': return ['forage', 0, null];
      case 'drink': return ['drink', 0, null];
      case 'travel': case 'follow': case 'consort': return ['stand', 0, null];
      case 'transfer': return ['stand', 0, null];
      case 'groom': return pairA ? ['groom', a.role, null] : ['sitIdle', 0, null];
      case 'play': return ['play', 0, null];
      case 'climb': return ['stand', 0, null];
      case 'patrol': return ['patrol', 0, null];
      case 'display': return a.drumTree >= 0 ? ['drum', 0, null] : ['display', 0, null]; // drumTree: patrol release only
      case 'flee': return ['cower', 0, null];
      case 'hunt': return ['hunt', 0, null];
      case 'mate': return ['mate', a.role, null];
      case 'nurse': return ['nurse', 0, null];
      case 'nest': return ['sleep', 0, null];
      case 'pant-grunt': return ['pantGrunt', 0, null];
      case 'charge': return ['charge', 0, null];
      case 'attack': return ['attack', 0, null];
      case 'submit': return ['submit', hash01(a.id, 31) > 0.7 ? 1 : 0, null];
      case 'reconcile': return ['embrace', 0, null];
      case 'console': return ['embrace', 1, null];
      case 'share': return ['share', 0, null];
      case 'beg': return ['beg', 0, null];
      case 'guard': return ['guard', 0, null];
      case 'shelter': return ['shelter', 0, null];
      case 'call': return [c.vocal === 'drum' ? 'drum' : 'pantHoot', 0, null];
      case 'alarm': return ['alarm', 0, null];
      default: return ['stand', 0, null];
    }
  }

  // --- Infant carrying, mirroring the sim (sim/candidates isCarried): ventral before ~0.45 y, otherwise
  // carried below ~1.2 y and while the mother travels or nests. Ventral also while climbing or nursing.
  const TRAVELING = new Set(['travel', 'patrol', 'flee', 'consort', 'transfer', 'hunt', 'charge', 'follow']);
  function carrierOf(a: Anim): Anim | undefined {
    const c = a.chimp;
    const m = c.motherId >= 0 ? anims.get(c.motherId) : undefined;
    if (m && m.chimp.alive) return m;
    // Orphans may be carried by a caretaker: accept any adult the sim has stacked the infant onto.
    if ((c.position[1] ?? 0) < 0.15) return undefined;
    for (const o of animList) if (o !== a && o.chimp.alive && o.chimp.age > 8 && hyp2(o.chimp.position[0] - c.position[0], o.chimp.position[2] - c.position[2]) < 0.4) return o;
    return undefined;
  }
  function carryMode(a: Anim): 0 | 1 | 2 {
    const c = a.chimp;
    if (!c.alive) {
      // A dead infant its mother still carries (sim contract Chimp.carryingDeadId): held ventrally on her.
      let m = c.motherId >= 0 ? anims.get(c.motherId) : undefined;
      // Stage ED (deadBody 1): the simulation says where the body is (Chimp.remains). Its holder may be an adopter, and a
      // body put down lies at the simulation's position, where it may be taken up again: no render-only drop, no fade.
      const tracked = c.remains !== undefined;
      if (tracked && c.remains === 'body' && !(m && m.chimp.alive && m.chimp.carryingDeadId === c.id)) { m = undefined; for (const o of animList) if (o.chimp.alive && o.chimp.carryingDeadId === c.id) { m = o; break; } }
      if (m && m.chimp.alive && m.chimp.carryingDeadId === c.id) { a.carrierId = m.id; a.deadCarried = true; return 1; }
      if (tracked) return 0;
      if (a.deadCarried && a.carry !== 0 && !a.deadDrop) {
        // She has left the body: it lies where she put it down (render-only) and fades out.
        a.deadDrop = true; a.dropX = a.bx; a.dropZ = a.bz; a.inited = false;
      }
      return 0;
    }
    if (c.age >= 4) return 0;
    const m = carrierOf(a);
    if (!m) return 0;
    const mc = m.chimp;
    const d = hyp2(mc.position[0] - c.position[0], mc.position[2] - c.position[2]);
    if (d > 2.5) return 0;
    const riding = (c.position[1] ?? 0) > 0.15 && d < 0.6 && (mc.position[1] ?? 0) < (c.position[1] ?? 0);
    const carried = riding || c.age < 1.2 || TRAVELING.has(mc.action) || mc.action === 'nest' || c.action === 'nurse';
    if (!carried) return 0;
    a.carrierId = m.id;
    const up = (mc.position[1] ?? 0) > 0.3 || mc.action === 'climb';
    // Held on the belly too while its carrier grooms it (stage W5; stylization): she cannot reach an infant riding on her own back.
    if (c.age < 0.45 || c.action === 'nurse' || mc.action === 'nurse' || up || (mc.action === 'nest' && c.age < 2) || (mc.action === 'groom' && mc.targetId === c.id)) return 1;
    return 2;
  }

  // --- Fixed-step playback (creatures/playback.ts): animals render between tick states, never chasing them.
  // The drawn path is the monotone cubic through the sim samples (creatures/motion.ts): exact at every sample,
  // with continuous velocity, so heading and gait speed are smooth at every sim speed.
  const playback = createPlayback();
  // Relocation threshold from this world's speeds (read once: the layer is rebuilt when a simulation is swapped in).
  const jump2 = relocationJump2(paramsOf(world));
  // Stage W1 (creatures/pace.ts): the moving thresholds and gallop entries below were tuned where the 160 m map's walk
  // plays at 1 min/s. A world that walks at another speed (the field map) reads them at its reference rate instead,
  // whatever the playback speed, so a walker is a walker at Real time and at 1 min/s alike. refMode is false on the
  // 160 m map, which keeps its original expressions bit for bit. refK: ecological hours per second at that rate.
  const refMode = !smallMapPace(paramsOf(world)), refK = referenceRate(paramsOf(world)) / 3600;
  let pbRate = 0;          // ecological hours of render time per real second (smoothed)
  let lastRenderT = NaN;
  // --- Stage W6: the decision beat (creatures/beat.ts). When an animal's act changes, the renderer notes where the
  // chosen target and a close runner-up are; while the drawn body has not begun the act it plays glance, look and
  // intention movement in the real seconds before the body starts; animals leaving together are drawn setting off in
  // the order they chose. Reads the World (act, target, candidates, positions); writes only renderer state.
  const GP = new Float64Array(3);
  const MOVE_MPS = movingMps(paramsOf(world).walkMps);   // a step faster than this (m per ecological second) is the animal setting off (drawn.ts: by this world's walking speed)
  const KEY_ANIMAL = 500000;          // departure keys: a tree's id, or this plus the id of the animal followed
  /** Where an option's target is: 0 not found, 1 a place (written to out), 2 an animal that is drawn (its head is read each frame). */
  function placeKind(id: number, self: Anim, out: Float64Array): number {
    if (id < 0) return 0;
    if (id < 100000) return id !== self.id && anims.has(id) ? 2 : 0;
    const t = treeById.get(id);
    if (t) { out[0] = t.position[0]; out[2] = t.position[2]; out[1] = ctx.groundHeight(out[0], out[2]) + (t.height ?? 20) * 0.7; return 1; }
    const wt = waterById.get(id);
    if (wt) { out[0] = wt.position[0]; out[2] = wt.position[2]; out[1] = ctx.groundHeight(out[0], out[2]); return 1; }
    for (const call of world.calls) if (call.id === id) { out[0] = call.position[0]; out[2] = call.position[2]; out[1] = ctx.groundHeight(out[0], out[2]) + 0.8; return 1; }
    return 0;
  }
  let beatSelf: Anim | null = null;
  const placed = (id: number) => beatSelf !== null && placeKind(id, beatSelf, GP) !== 0;
  /** A new act: where its target and the runner-up are, and what departure it may be part of. */
  function startBeat(a: Anim) {
    const c = a.chimp, b = a.beat, sign = BODY_SIGN[c.action];
    b.since = a.acts.since; b.phase = Phase.none; b.gaze = Gaze.none; b.moveT = Infinity; b.own = ownsStep(c.actionTime, a.track, b.since, MOVE_MPS); b.fromRest = true; b.up = false; b.looked = false;
    b.key = -1; b.rank = 0; b.first = -1; b.followers = 0; b.backId = -1; b.goneFor = NaN; b.waiting = false; b.goalKind = 0; b.altKind = 0;
    // Urgent and pose-only acts (a charge, a call) are never waited for: no beat. Nor is an act whose start was not
    // seen (states were skipped, drawn.ts SKIP_TICKS): the animal decided at some time before, and is already in it.
    if (!(b.since > -Infinity) || sign === 'any' || !c.alive || startUnseen(a.acts)) { b.since = -Infinity; return; }
    b.goalId = c.targetId; b.goalKind = placeKind(c.targetId, a, GP);
    if (b.goalKind === 1) { b.gx = GP[0]; b.gy = GP[1]; b.gz = GP[2]; }
    beatSelf = a;
    const r = runnerUp(c.candidates, c.action, c.targetId, placed);
    beatSelf = null;
    if (r >= 0) { b.altId = c.candidates[r].targetId; b.altKind = placeKind(b.altId, a, GP); if (b.altKind === 1) { b.ax = GP[0]; b.ay = GP[1]; b.az = GP[2]; } }
    if (sign === 'go' && a.carry === 0) {
      const L = c.action === 'follow' && c.targetId >= 0 && c.targetId < 100000 ? anims.get(c.targetId) : undefined;
      b.key = c.action === 'travel' && treeById.has(c.targetId) ? c.targetId : L ? (L.beat.since > -Infinity && L.beat.key >= 0 ? L.beat.key : KEY_ANIMAL + L.id) : KEY_ANIMAL + a.id;
    }
  }
  const DKEY = new Int32Array(CAPACITY), DSINCE = new Float64Array(CAPACITY), DX = new Float32Array(CAPACITY), DZ = new Float32Array(CAPACITY);
  /** How long a beat is kept after its act was first seen, in drawn ticks (the wait of a trip, the look back). */
  const BEAT_KEEP_TICKS = 8;
  function interpolateAll(subTick: number, dt: number) {
    const fresh = advancePlayback(playback, world.time, subTick, PLAYBACK_LAG_TICKS);
    const rt = playback.renderT;
    const step = Number.isFinite(lastRenderT) && Number.isFinite(rt) ? Math.max(0, rt - lastRenderT) : 0;
    lastRenderT = rt;
    if (dt > 0) pbRate = step > 0.5 ? 0 : damp(pbRate, step / dt, 10, dt); // a rewind or long gap resets
    // The beat runs on real seconds: the rate is that of the drawn time itself (smoothed; the clock's own figure
    // saw-tooths with the ticks). Off above the rate at which tags stop announcing (drawn.ts), and for carried animals.
    const rate = pbRate * 3600, live = rate > 0 && curSimRate <= ABOUT_MAX_RATE && step < 0.5;
    let departures = false;
    for (const a of animList) {
      const c = a.chimp;
      if (fresh || a.track.n === 0) pushSample(a.track, world.time, c.position[0], Math.max(0, c.position[1] ?? 0), c.position[2]);
      // The act of each tick state (drawn.ts), and at once when a decision applied between ticks changes it.
      const changed = actChanged(a.acts, c.action, c.targetId);
      if (fresh || changed) pushAct(a.acts, world.time, c.action, c.targetId);
      if (changed) startBeat(a);
      const b = a.beat;
      if (!(b.since > -Infinity)) continue;
      if (!live || !c.alive || a.carry !== 0 || rt - a.late > b.since + BEAT_KEEP_TICKS * TICK_HOURS) { b.since = -Infinity; b.key = -1; continue; }
      if (!(b.moveT < Infinity)) {
        b.moveT = firstMove(a.track, b.since, MOVE_MPS, b.own);
        if (b.moveT < Infinity) {
          b.fromRest = restedBefore(a.track, b.moveT, MOVE_MPS);
          // No target to look at (a trip home, a rest somewhere else): it looks where its first step goes.
          if (b.goalKind === 0) { const h = a.track.hist, o = a.track.head * 4; if (hyp2(h[o + 1] - a.track.x, h[o + 3] - a.track.z) > 1) { b.goalKind = 1; b.gx = h[o + 1]; b.gz = h[o + 3]; b.gy = ctx.groundHeight(b.gx, b.gz) + h[o + 2] + 0.6 * a.morph.size; } }
        }
      }
      if (b.key >= 0) departures = true;
    }
    // Leaving together: place in the departure, the first mover, and whom it looks back at.
    if (departures) {
      const n = Math.min(animList.length, CAPACITY), win = DEPART_WINDOW_TICKS * TICK_HOURS;
      for (let i = 0; i < n; i++) { const a = animList[i], b = a.beat; DKEY[i] = b.since > -Infinity ? b.key : -1; DSINCE[i] = b.since; DX[i] = a.track.x; DZ[i] = a.track.z; }
      for (let i = 0; i < n; i++) {
        if (DKEY[i] < 0) continue;
        const b = animList[i].beat;
        b.rank = departRank(i, n, DKEY, DSINCE, DX, DZ, win, DEPART_RADIUS_M);
        b.followers = departFollowers(i, n, DKEY, DSINCE, DX, DZ, win, DEPART_RADIUS_M);
        b.first = b.rank > 0 ? animList[departFirst(i, n, DKEY, DSINCE, DX, DZ, win, DEPART_RADIUS_M)].id : -1;
        const f = b.followers > 0 ? departNearestFollower(i, n, DKEY, DSINCE, DX, DZ, win, DEPART_RADIUS_M) : -1;
        b.backId = f >= 0 ? animList[f].id : -1;
      }
    }
    for (const a of animList) {
      const b = a.beat;
      // A follower is drawn a little behind its own path so that the first mover is seen to go first (beat.ts lateTarget).
      let target = 0;
      if (b.since > -Infinity && b.rank > 0 && b.first >= 0) { const f = anims.get(b.first); if (f && f.beat.since > -Infinity) target = lateTarget(b.rank, b.moveT, f.beat.moveT, rt, rate, b.fromRest); }
      // (Set off: by its own drawn time of the frame before. A follower held at its own start is caught in the frame
      // its time first passes that start, a fraction of a frame late, and must not count as gone.)
      a.late = step < 0.5 ? stepLate(a.late, target, step, b.since > -Infinity && b.moveT < Infinity && rt - step - a.late > b.moveT + GONE_EPS) : 0;
      sampleSmooth(a.track, rt - a.late, jump2);
      if (b.since > -Infinity) updateBeat(a, rt, rt - a.late, rate, dt); else { b.phase = Phase.none; b.gaze = Gaze.none; b.waiting = false; }
    }
  }
  /** The part of the beat playing now and where the gaze goes for it (stylizations: beat.ts). */
  function updateBeat(a: Anim, rt: number, rtA: number, rate: number, dt: number) {
    const b = a.beat, c = a.chimp, go = BODY_SIGN[c.action] === 'go';
    // The countdown runs to the moment the body starts. For a follower of a departure that is its place in the order
    // after the first mover's start (at the latest when its lateness runs out), on the common drawn time: its own
    // time stands still while it is held, and a countdown on that would hold it in its intention movement for as long.
    let start = startTime(b.since, b.moveT, b.fromRest), clock = rtA;
    if (b.rank > 0 && b.first >= 0 && b.moveT < Infinity && b.fromRest) {   // (one already on the move is not held: lateTarget)
      const f = anims.get(b.first);
      if (f && f.beat.since > -Infinity) { const turn = Math.min(f.beat.moveT + b.rank * staggerGap(rate), b.moveT + LATE_MAX_TICKS * TICK_HOURS); if (turn > start) { start = turn; clock = rt; } }
    }
    // The runner-up is glanced at once per act: an animal that then waits and counts down again goes straight to its goal.
    b.phase = beatPhase(realSeconds(start - clock, rate), b.altKind !== 0 && !b.looked);
    if (b.phase >= Phase.look) b.looked = true;
    // A trip the simulation has not started moving, once the body's own time has reached it: it stands and waits
    // (the simulation's initiator waits up to a minute for company before it goes or gives up).
    const waiting = go && !(b.moveT < Infinity) && rtA >= b.since, gone = b.moveT < Infinity && rtA >= b.moveT;
    if (waiting !== b.waiting) b.goneFor = NaN;
    b.waiting = waiting;
    b.goneFor = waiting || gone ? (Number.isNaN(b.goneFor) ? 0 : b.goneFor + dt) : NaN;
    // Waiting, it looks back at the nearest companion of its party; gone first, at the nearest of those who follow.
    if (waiting && (b.backId < 0 || !anims.has(b.backId))) b.backId = nearestMate(a);
    b.gaze = gazeFor(b.phase, b.goalKind !== 0, waiting, gone, go && b.rank === 0 && b.followers > 0, b.backId >= 0, b.goneFor);
    // A follower held back for the order watches the first mover until that one has set off, then turns to the goal.
    if (b.rank > 0 && a.late > 1e-5 && !gone && b.first >= 0 && b.phase === Phase.none) { const f = anims.get(b.first); if (f && !(f.beat.moveT < Infinity && rt >= f.beat.moveT)) { b.backId = b.first; b.gaze = Gaze.back; } }
  }
  /** The nearest animal of its own party within 25 m (a waiting initiator's companions), or -1. */
  function nearestMate(a: Anim): number {
    const c = a.chimp;
    let best = -1, bestD = 625;
    if (c.partyId < 0) return best;
    for (const o of animList) {
      if (o === a || !o.chimp.alive || o.carry !== 0 || o.chimp.troopId !== c.troopId || o.chimp.partyId !== c.partyId) continue;
      const d = (o.track.x - a.track.x) ** 2 + (o.track.z - a.track.z) ** 2;
      if (d < bestD) { bestD = d; best = o.id; }
    }
    return best;
  }

  // --- Main per-animal update (ground animals first, carried infants after their mothers).
  const TURN_TMP = { v: 0 };
  function updateMotion(a: Anim, dt: number) {
    const tr = a.track;
    const cut = !a.inited || tr.jumped;
    // Layout offsets (pairing, separation) ease in and out so partners slide into place instead of popping.
    const offX = a.tx - tr.x, offZ = a.tz - tr.z;
    const ox0 = a.ox, oz0 = a.oz;
    if (cut) { a.ox = offX; a.oz = offZ; }
    else { const k = 1 - Math.exp(-3 * dt); a.ox += (offX - a.ox) * k; a.oz += (offZ - a.oz) * k; }
    const nx = tr.x + a.ox, nz = tr.z + a.oz;
    const moved = cut ? 0 : hyp2(nx - a.x, nz - a.z);
    if (!cut) a.climbDy += tr.y - a.y;
    a.x = nx; a.z = nz; a.y = tr.y; a.inited = true;
    a.dist += moved;
    // Rendered velocity: the path's analytic velocity × playback rate, plus the easing of layout offsets.
    const ex = dt > 0 && !cut ? (a.ox - ox0) / dt : 0, ez = dt > 0 && !cut ? (a.oz - oz0) / dt : 0;
    const vx = tr.vx * pbRate + ex, vz = tr.vz * pbRate + ez;
    let pathSpeed = hyp2(tr.vx, tr.vz) * pbRate;
    const flat = hyp2(vx, vz);
    a.speed = cut ? 0 : dt > 0 ? damp(a.speed, flat, 14, dt) : a.speed;
    a.vel = cut ? 0 : dt > 0 ? damp(a.vel, hyp2(flat, tr.vy * pbRate), 8, dt) : a.vel;
    let turnSpeed = a.speed;
    if (refMode) {
      // W1: the same velocity with the sim path read at the reference rate (refSpeed: the choice of clip) and at the
      // faster of that and the playback rate (moveSpeed: the moving test and the heading, so nothing that counts as
      // moving today stops counting). The easing of layout offsets is real time and enters as drawn: a partner
      // sliding into place reads exactly as it does at 1 min/s, at every speed.
      const km = Math.max(pbRate, refK);
      a.refSpeed = cut ? 0 : dt > 0 ? damp(a.refSpeed, hyp2(tr.vx * refK + ex, tr.vz * refK + ez), 14, dt) : a.refSpeed;
      a.moveSpeed = cut ? 0 : dt > 0 ? damp(a.moveSpeed, hyp2(tr.vx * km + ex, tr.vz * km + ez), 14, dt) : a.moveSpeed;
      turnSpeed = a.moveSpeed; pathSpeed = hyp2(tr.vx, tr.vz) * km;
    }
    // Heading: travel direction when moving (from the C1 path, so it turns smoothly), else the pairing/sim heading.
    const c = a.chimp;
    let target = a.headingTarget ?? c.heading ?? a.heading;
    // Stage W6: the simulation turns an animal to its new goal in the tick it decides. The drawn body, which has not
    // set off, keeps facing as it did and turns in its intention movement (or once it stands waiting), not two ticks early.
    if (a.way === Way.soon && a.headingTarget == null && !(a.beat.phase === Phase.intent || a.beat.waiting)) target = a.heading;
    // An initiator standing and waiting for company faces where it means to go (the simulation turns it only with its first step).
    else if (a.beat.waiting && a.headingTarget == null && a.elevated < 0.5 && beatGoal(a, Gaze.goal)) target = Math.atan2(GOAL[0] - a.x, GOAL[2] - a.z);
    if (turnSpeed > 0.25 * a.morph.size && pathSpeed > 0.05 * a.morph.size) target = Math.atan2(tr.vx, tr.vz);
    const before = a.heading;
    // The path is C1, so a moving animal can follow its direction closely (less body-vs-path lag in curves).
    a.heading = cut ? target : dampAngle(a.heading, target, a.moving ? 10 : 4.5, dt);
    const dh = Math.atan2(Math.sin(a.heading - before), Math.cos(a.heading - before));
    TURN_TMP.v = dt > 0 && !cut ? dh / dt : 0;
    a.turnRate = damp(a.turnRate, TURN_TMP.v, 10, dt);
    // Bank into turns: roll ∝ speed × turn rate, clamped to ±0.12 rad (design assumption).
    a.bank = damp(a.bank, a.elevated < 0.5 ? clamp(a.speed / a.morph.size * a.turnRate * 0.05, -0.12, 0.12) : 0, 6, dt);
  }

  const lookTmp = new Float32Array(3), IKSAVE = new Float32Array(5), SW = new Float32Array(3);
  const W = new Float64Array(3), OUT = new Float64Array(3);
  function evaluatePose(a: Anim, dtAnim: number, dtReal: number, cam: THREE.Camera, plant: boolean) {
    const c = a.chimp, s = a.morph.size;
    // (Stage W11: a body clambering through a crown moves by the placement, not by its path: its gait reads that speed.)
    const u = (a.clamber ? a.clamberV : a.speed) / s;
    const wasMoving = a.moving;
    // Moving state with hysteresis; a walker must also be still for 0.8 s before it stands (it pauses mid-stride:
    // foragers stop and go every few ticks).
    // (W1: on a map that does not walk at the 160 m map's speed the test reads moveSpeed; see updateMotion.)
    const um = refMode ? a.moveSpeed / s : u;
    if (a.carry !== 0) a.moving = false;
    else if (a.moving) { a.stillT = um > MOVE_EXIT ? 0 : a.stillT + dtReal; a.moving = a.stillT < 0.8; }
    else { a.moving = um > MOVE_ENTER; a.stillT = 0; }
    if (a.moving !== wasMoving) a.dbg.moveToggles++;
    // W1: during those 0.8 s the stopped walker's swinging hand or foot comes down (it held it in the air, mid-stride,
    // until the clip changed); it lifts again if the walk resumes. Exactly 0 on a walker that has not stopped. The rate
    // (12 per second: down in about 0.2 s) is a stylization.
    const halted = a.moving && a.stillT > 0;
    a.settle = halted || a.settle > 1e-3 ? damp(a.settle, halted ? 1 : 0, 12, dtReal) : 0;
    // In time-lapse the rendered speed is inflated; pick gaits from the ecological-equivalent speed (W1: from the speed
    // at the world's reference rate where that is not the 160 m map's 1 min/s, so a field walker is not read as a runner).
    const timeScale = Math.max(1, curSimRate / 60);
    let [clip, role, gait] = chooseClip(a, a.moving, refMode ? a.refSpeed / s : u / timeScale);
    // A stationary quadruped turning more than ~50°/s steps around instead of spinning on planted feet.
    const turning = !a.moving && a.carry === 0 && a.elevated < 0.5 && c.alive && (clip === 'stand' || clip === 'listen') && Math.abs(a.turnRate) > 0.9;
    if (turning) { clip = 'walk'; gait = 'walk'; role = 0; }
    const changed = clip !== a.clip || role !== a.role;
    if (changed && a.clip && a.clipT < CLIP_DWELL && !URGENT.has(clip)) { clip = a.clip; role = a.role; gait = a.gait; }
    const start = (clip !== a.clip || role !== a.role) && a.clip !== '';
    const prevClip = a.clip;
    if (clip !== a.clip || role !== a.role) { if (a.clip) a.dbg.clipSwitches++; a.clip = clip; a.role = role; a.clipT = 0; }
    a.gait = gait;
    a.clipT += dtAnim;
    // Gait: phase advances by distance ÷ stride (natural and warped), or cadence × time in time-lapse.
    let freq = 0;
    const dist = (a.clamber ? a.clamberD : a.dist) / s; a.dist = 0; a.clamberD = 0;
    if (gait === 'climb') {
      // Phase by height climbed (signed): stance hands and feet stay put on the bark; descending runs it backwards.
      // W1: above the cadence cap the gait table names for climbing (GAITS.climb.fCap; at 1 min/s the limbs cycled 15 to
      // 30 times a second) the climb is shown as time-lapse, as walking is: the cycle runs at the cap, in the direction climbed.
      solveClimb(GAITS.climb, a.vel / s, a.gs.regime, a.gs);
      const dy = a.climbDy / s; a.climbDy = 0;
      const p = a.phase + (a.gs.regime === Regime.timelapse ? Math.sign(dy) * a.gs.f * dtReal : Math.abs(dy) < 1 ? dy / a.gs.stride : 0);
      a.phase = p - Math.floor(p);
      freq = a.gs.f;
    } else if (gait) {
      if (turning) { a.gs.f = 1.4; a.gs.stride = 0.22; a.gs.regime = Regime.natural; a.phase = (a.phase + dtReal * 1.4) % 1; }
      else {
        // Shorter-legged juveniles (morph len < 1) take proportionally shorter strides at the same cadence.
        solveGait(GAITS[gait], u, a.gs.regime, a.gs, a.morph.len[B.thighL]);
        const before = a.phase;
        a.phase = advancePhase(a.phase, dist, a.gs, dtReal);
        if (a.phase < before) a.strides++;
      }
      freq = a.gs.f;
    } else { a.gs.regime = Regime.natural; a.gs.stride = 0; }
    a.lapse = damp(a.lapse, a.gs.regime === Regime.timelapse ? 1 : 0, 6, dtReal);
    // Context.
    pctx.t = a.clipT; pctx.time = animClock + hash01(a.id, 13) * 100; pctx.phase = a.phase; pctx.speedU = gait === 'climb' ? a.vel / s : u; pctx.freq = freq;
    pctx.stride = gait ? a.gs.stride : 0; pctx.lapse = a.lapse; pctx.settle = a.settle; pctx.lp = limbPhase(hash01(a.id, 19), a.strides + a.phase);
    pctx.seed = hash01(a.id, 17); pctx.stage = c.stage; pctx.male = c.sex === 'male'; pctx.age = c.age;
    pctx.injury = c.injury ?? 0; pctx.mood = c.mood ?? 'calm'; pctx.energy = c.energy ?? 1; pctx.vocal = c.vocal && (c.vocalUntil ?? 0) >= world.time ? c.vocal : null;
    pctx.role = role; pctx.inTree = a.elevated > 0.5; pctx.wet = 0; pctx.side = a.pSide; pctx.bears = a.bears;
    const partner = a.partnerId >= 0 ? anims.get(a.partnerId) : undefined;
    if (partner) {
      // Partner root in this animal's body space (unit scale). Stage W9: an animal on a branch is drawn at its seat, not
      // at its simulated ground point (a.x, a.z), so its origin and its partner's are the drawn ones there: before, a
      // groomer in a crown aimed at the partner as if both sat at their simulated points. On the ground the two are
      // the same point.
      const ax = a.seated ? a.bx : a.x, az = a.seated ? a.bz : a.z;
      const dx = (partner.seated ? partner.bx : partner.x) - ax, dz = (partner.seated ? partner.bz : partner.z) - az, dy = (partner.by - a.by);
      const ch = Math.cos(-a.heading), sh = Math.sin(-a.heading);
      const lx = dx * ch + dz * sh, lz = -dx * sh + dz * ch;
      pctx.hasTarget = true; pctx.tx = lx / s; pctx.tz = lz / s; pctx.ty = dy / s;
      pctx.tdist = hyp2(lx, lz) / s; pctx.tsize = partner.morph.size / s;
      // Partner's posed spine chain in our unit body space (it was evaluated earlier this frame when it receives).
      // A carried partner's bones are no target (it rides on someone), except the infant this animal holds and grooms:
      // those are last frame's (infants are posed after their carriers), a frame behind a body that moves with hers.
      pctx.hasBones = partner.lastSkinFrame >= 0 && (partner.carry === 0 || (role === GROOM_LAP && clip === 'groom' && partner.carrierId === a.id));
      if (pctx.hasBones) for (let k = 0; k < 5; k++) {
        boneWorld(partner.fk, partner.bodyQ, partner.bx, partner.by, partner.bz, partner.lift, PAIR_BONES[k], TP, TQ4);
        const bx = TP[0] - ax, bz = TP[2] - az;
        pctx.pb[k * 3] = (bx * ch + bz * sh) / s; pctx.pb[k * 3 + 1] = (TP[1] - a.by) / s; pctx.pb[k * 3 + 2] = (-bx * sh + bz * ch) / s;
      }
      pctx.pairT = animClock + hash01(Math.min(a.id, partner.id) * 7 + Math.max(a.id, partner.id), 5) * 40;
    } else { pctx.hasTarget = false; pctx.hasBones = false; pctx.tdist = 99; pctx.tsize = 1; pctx.tx = pctx.ty = pctx.tz = 0; pctx.pairT = pctx.time; }
    pw.bind(a.cur).reset();
    (CLIPS[clip] ?? CLIPS.stand)(pw, pctx);
    // Stage W6: the intention movement of the decision beat (creatures/intention.ts; stylization), laid over the clip
    // in the last second before the body starts the act: a half rise before walking off, a sit-up or a weight shift.
    a.posture = postureOf(a.cur.v);
    {
      // Once in, it holds until the body sets off (the drawn path leaves a rest with zero velocity: without the hold the
      // body sank back into its old pose for the instant between the end of the countdown and its first step).
      const bt = a.beat, on = (bt.phase === Phase.intent || (a.intent > 0.5 && bt.since > -Infinity && !bt.waiting)) && a.way === Way.soon && !a.moving && a.carry === 0 && c.alive;
      a.intent = on || a.intent > 1e-3 ? damp(a.intent, on ? 1 : 0, on ? 5 : 9, dtReal) : 0;
      if (a.intent > 0.01 && !LOCOMOTION.has(clip) && gait !== 'climb') {
        let yaw = 0;
        if (beatGoal(a, Gaze.goal)) { const dx = GOAL[0] - a.x, dz = GOAL[2] - a.z, ch = Math.cos(-a.heading), sh = Math.sin(-a.heading); yaw = Math.atan2(dx * ch + dz * sh, -dx * sh + dz * ch); }
        const leaves = a.elevated < 0.5 && (BODY_SIGN[c.action] === 'go' || bt.moveT < Infinity);
        intention(pw, a.posture, smoothstep(0, 1, a.intent), yaw, leaves);
      }
    }
    if ((c.carryingDeadId ?? -1) >= 0 && anims.get(c.carryingDeadId!)?.carry) { const k = cradleFor(clip); if (k) cradle(pw, k === 1); }
    vocalOverlay(pw, pctx.vocal, animClock + pctx.seed * 10, pctx.mood);
    if (a.pCode !== PatrolCode.none) {
      // Silent patrol legs: lips pressed under a lowered brow, some piloerection; tensest in neighbour range.
      const tn = patrolTension(a.pCode), v = a.cur.v;
      v[PI.bristle] = Math.max(v[PI.bristle], tn.bristle); v[PI.press] = Math.max(v[PI.press], tn.press);
      if (Math.abs(tn.brow) > Math.abs(v[PI.brow])) v[PI.brow] = tn.brow;
    }
    // ---- Stage W8 (the state on the body, idle life; creatures/bodystate.ts, idle.ts): the drawn channels ease toward
    // what was last read (readState), then breathing and the idle layer go over the clip, before the face rig turns
    // the mouth opening into a jaw angle. Stylizations. ----
    stepState(a, clip, dtReal);
    {
      // Face rig: the jaw drops with mouth opening; a fear grin retracts both lips off the teeth.
      const v = a.cur.v, m = clamp(v[PI.mouth], 0, 1), g = clamp(v[PI.grin], 0, 1), f = clamp(v[PI.funnel], 0, 1);
      // Brow (A9): raised in fear, play and distress, lowered in a threat stare; pressed lips pull both lips in.
      const br = clamp(v[PI.brow], -1, 1), pr = clamp(v[PI.press], 0, 1);
      v[B.jaw * 3] += m * 0.3 + g * 0.05 - pr * 0.04;
      v[B.lipU * 3] += -g * 0.32 + f * 0.12 + pr * 0.1;
      v[B.lipL * 3] += g * 0.22 - f * 0.1 - pr * 0.12;
      v[B.brow * 3] += -br * 0.16;
      // Turning: the chest leads the hips and the head leads the chest.
      if (a.elevated < 0.5 && a.carry === 0 && c.alive) {
        const lead = clamp(a.turnRate * 0.12, -0.3, 0.3);
        v[B.chest * 3 + 1] += lead; v[B.neck * 3 + 1] += lead * 0.8; v[B.hips * 3 + 1] -= lead * 0.3;
      }
    }
    // ---- Stage W10 (calls you can see; creatures/heard.ts): a stationary listener holds its clip for a moment once a
    // long call's arc has reached it, and is released through the pop guard's blend below. A stylization. ----
    // (W8: not on the frame an idle yawn or nod is cut short. The hold copies last frame's pose, the open jaw with it;
    // the blend below closes it first and the hold starts a frame later, on the clip's own pose.)
    const heardRelease = heardHold(a, clip, start || idleCut);
    // Inertialized transition (secondary.ts): the new clip plays at once; the old output's offset and velocity
    // decay over the transition instead of a frozen pose crossfading out.
    const cv = a.cur.v, ov = a.out.v;
    // Pop guard: a clip that jumps between its own segments (sit → stand in a pant-hoot, a side switch) gets
    // the same inertial blend as a clip change, restarted from the current output even mid-transition.
    let pop = false;
    if (!start && a.clip && a.lastSkinFrame >= 0) {
      let jump = 0;
      const pc = a.prevCur;
      for (let i = 3; i < PI.root; i++) jump = Math.max(jump, Math.abs(cv[i] - pc[i]));
      for (let l = 0; l < 4; l++) { const o = PI.ik + l * 5; if (cv[o + 3] > 0.01 && pc[o + 3] > 0.01) jump = Math.max(jump, 3 * Math.abs(cv[o] - pc[o]), 3 * Math.abs(cv[o + 1] - pc[o + 1]), 3 * Math.abs(cv[o + 2] - pc[o + 2])); }
      // W10: a held clip resumes through the same blend. W8: so does a pose whose idle yawn or nod was cut short (a
      // decision beat began, a call arrived): the jaw, the lids and the head would otherwise jump in one frame, under
      // the threshold above (seen: 0.3 rad of jaw, the mouth and the eyes from open to shut in 16 ms).
      pop = jump > Math.max(0.45, 6 * dtAnim) || heardRelease || idleCut;
    }
    a.prevCur.set(cv);
    if (start) {
      a.holdMask = 0;
      a.skip.fill(0);
      for (let l = 0; l < 4; l++) {
        const o = PI.ik + l * 5;
        const wPrev = ov[o + 3], wNew = cv[o + 3];
        // A limb newly under IK takes its new target as is; a limb leaving IK keeps its last target while its
        // weight fades, so the hand never swings through the body toward a stale target.
        if (wPrev < 0.01) { a.skip[o] = a.skip[o + 1] = a.skip[o + 2] = 1; }
        else if (wNew < 0.01) { a.skip[o] = a.skip[o + 1] = a.skip[o + 2] = 1; a.holdMask |= 1 << l; a.hold[l * 3] = ov[o]; a.hold[l * 3 + 1] = ov[o + 1]; a.hold[l * 3 + 2] = ov[o + 2]; }
      }
      // Larger pose changes take longer: base time × (0.6 + 0.5 × largest joint change in radians), ≤ 0.7 s.
      let big = 0;
      for (let i = 3; i < PI.root; i++) big = Math.max(big, Math.abs(cv[i] - ov[i]));
      // A receiver changing posture (same clip, another role) may be lying down or sitting up: the lying-down time.
      // Stage W9: a change of resting posture in a crown (same clip, another role) is slow: sitting up, lying down along
      // the bough or taking another hold, eased over up to 1.1 s (design assumption).
      const perchShift = clip === 'perch' && prevClip === 'perch';
      startInertia(a.inert, ov, a.outVel, cv, Math.min(perchShift ? 1.1 : 0.7, (perchShift ? 0.8 : clip === 'groomee' && prevClip === 'groomee' ? 0.55 : transitionTime(prevClip, clip)) * Math.max(1, 0.6 + 0.5 * big)), a.skip);
    }
    else if (pop) { a.skip.fill(0); a.holdMask = 0; startInertia(a.inert, ov, a.outVel, cv, 0.25, a.skip); a.inert.t = -dtAnim; }
    const blending = a.inert.t < a.inert.end;
    if (blending && a.holdMask) for (let l = 0; l < 4; l++) if (a.holdMask & (1 << l)) { const o = PI.ik + l * 5; cv[o] = a.hold[l * 3]; cv[o + 1] = a.hold[l * 3 + 1]; cv[o + 2] = a.hold[l * 3 + 2]; }
    a.prevOut.set(ov);
    copyPose(a.out, a.cur);
    if (blending) applyInertia(a.inert, ov, start ? 0 : dtAnim);
    if (dtAnim > 1e-4) for (let i = 0; i < POSE_SIZE; i++) a.outVel[i] = (ov[i] - a.prevOut[i]) / dtAnim;
    // Look-at (A8): the attention target replaces the old partner-only look and the idle head sines. The head
    // follows a sprung look point (turns in ~0.3 s); the clip's own look weight still applies for its partner.
    let look: Float32Array | null = null;
    const allow = ATTN_OFF.has(clip) ? 0 : ATTN_LOW.has(clip) || ov[PI.eyes] > 0.6 ? 0.25 : 1;
    // (W8: a yawn tips the head back and a nod lets it sink; the look-at would hold it level.)
    const want = debug.attention ? updateAttention(a, partner, dtReal) * allow * (a.idle.kind === IDLE.yawn || a.idle.kind === IDLE.nod ? 0.25 : 1) : 0;
    a.lookW = damp(a.lookW, want, 5, dtReal);
    // (Stage W11: a clip can hold the head against the look system, secondary.ts headLook: crown feeding does while a hand is at the mouth.)
    const lw = headLook(ov[PI.look], a.lookW);
    if (lw > 0.01) {
      const dx = a.lk[0].x - a.bx, dy = a.lk[1].x - a.by, dz = a.lk[2].x - a.bz;
      const ch = Math.cos(-a.heading), sh = Math.sin(-a.heading);
      lookTmp[0] = dx * ch + dz * sh; lookTmp[2] = -dx * sh + dz * ch;
      // Gaze pitch stays within about −27°..+14° of level from the head: a partner high in a tree is looked up at
      // with the eyes and chin, not by craning the neck backwards.
      const hd = hyp2(lookTmp[0], lookTmp[2]), headY = a.head.y - a.by;
      lookTmp[1] = clamp(dy, headY - hd * 0.5, headY + hd * 0.25) - a.lift;
      look = lookTmp; ov[PI.look] = lw;
    }
    // Breathing follows exertion: charges, flights and displays raise it for about a minute.
    a.exert = LOCOMOTION_FAST.has(clip) || clip === 'display' || clip === 'attack' || clip === 'charge' ? damp(a.exert, 1, 0.5, dtReal) : a.exert * Math.exp(-dtReal / 60);
    if (a.exert > 0.02 && ov[PI.ground] > 0.5) ov[B.chest * 3] += Math.sin(animClock * (1.7 + 2.8 * a.exert) + pctx.seed * 9) * 0.02 * a.exert;
    solveFK(a.out, a.morph, a.fk, look);
    // Eyes lead the head: the irises turn toward the unsmoothed target at once (saccade), the head catches up.
    if (a.px > 40) aimEyes(a, dtReal); else { a.eye[0].x = a.eye[1].x = 0; }
    const ground = ov[PI.ground];
    const low = ground > 0.01 ? lowestPoint(a.fk, a.morph) : 0;
    a.lift = -low * ground;
    a.planted = plant && ground > 0.5 && a.lapse < 0.5;
    // Climbing and drumming: hands (and climbing feet) go onto the bark of the rendered trunk.
    const bark = clip === 'climb' || clip === 'clingTrunk' ? a.climbTree : clip === 'drum' ? a.drumTree : -1;
    if (bark >= 0 && a.px > 25 && trunkContacts(a, bark, clip === 'drum' ? 3 : 15)) solveFK(a.out, a.morph, a.fk, look);
    if (a.planted && plantContacts(a, dtReal)) {
      solveFK(a.out, a.morph, a.fk, look);
      // A locked hand or foot the limb cannot reach: while walking it is dragged to the reachable point (a
      // centimetre or two at the end of a stance), standing it steps to a reachable spot next frame.
      for (let l = 0; l < 4; l++) {
        const k = a.locks[l];
        if (k.state !== 1) continue;
        boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, FEET[l], TP, TQ4);
        if ((TP[0] - k.lx) ** 2 + (TP[2] - k.lz) ** 2 < (0.012 * s) ** 2) continue;
        if (a.moving) { k.lx = TP[0]; k.lz = TP[2]; } else k.force = true;
      }
    }
    else if (a.locks[0].state || a.locks[1].state || a.locks[2].state || a.locks[3].state) for (const l of a.locks) resetLock(l);
    // Stage W8: the scratching hand goes to a place on the animal's own posed body, so it needs the solved skeleton
    // (idle.ts scratchWrist). Only the solved skeleton carries the reach: the pose buffer gets its own values back,
    // so a clip change during a scratch blends from the clip's pose as it always did. Only while a scratch runs.
    if (a.scratchK > 0.01) {
      // (Stage W11: the place, side and time are the arm's own record of the scratch, a.scr*: the schedule's are gone
      // the moment an event is cut short, and the arm then comes away from where it was.)
      const o = PI.ik + (a.scrSide ? LIMB.armR : LIMB.armL) * 5, k = a.scratchK, w0 = ov[o + 3];
      for (let j = 0; j < 5; j++) IKSAVE[j] = ov[o + j];
      scratchWrist(a.fk, a.morph, a.scrSite, a.scrSide, a.scrT, SW);
      // (Over the crown the hand is held in a body-space orientation, the rig's end lock: idle.ts HEAD_HAND.)
      const lock = a.scrSite === SCRATCH.head ? k : 0;
      if (w0 > 0.01) { ov[o] += (SW[0] - ov[o]) * k; ov[o + 1] += (SW[1] - ov[o + 1]) * k; ov[o + 2] += (SW[2] - ov[o + 2]) * k; ov[o + 3] = Math.max(w0, k); ov[o + 4] = ov[o + 4] * (1 - k) + lock; }
      else { ov[o] = SW[0]; ov[o + 1] = SW[1]; ov[o + 2] = SW[2]; ov[o + 3] = k; ov[o + 4] = lock; }
      solveFK(a.out, a.morph, a.fk, look);
      for (let j = 0; j < 5; j++) ov[o + j] = IKSAVE[j];
    }
    // Smoothed piloerection and mouth for the shader. After a patrol's release display the coat settles slowly
    // (RELEASE_BRISTLE_TAU) instead of at once; every other animal is unchanged (relBristle stays 0).
    if (releasing(a)) a.relBristle = Math.max(a.relBristle, ov[PI.bristle]);
    else if (a.relBristle > 0) { a.relBristle *= Math.exp(-dtReal / RELEASE_BRISTLE_TAU); if (a.relBristle < 0.01) a.relBristle = 0; }
    // Stage W8: the coat is the larger of what the clip holds and the continuous arousal, sleeked by fear
    // (bodystate.ts coatValue; −1 .. 1). With arousal and fear at 0 it is the clip's value, as before.
    const clipCoat = Math.max(ov[PI.bristle], a.relBristle);
    // (Under an infant riding on the back the coat stands no higher than RIDER_COAT: bodystate.ts coatUnder.)
    a.bristle = damp(a.bristle, debug.w8 ? coatUnder(coatValue(clipCoat, a.ch.arousal, a.ch.fear), (a.bears & 2) !== 0) : clipCoat, 3, dtAnim);
    a.mouth = clamp(Math.max(ov[PI.mouth], ov[PI.grin] * 0.55), 0, 1);
    a.grin = clamp(ov[PI.grin], 0, 1);
    void cam;
  }

  // --- Attention: candidates by priority (partner 4, heard call 3, snake model 5, alpha within 6 m 1), then the
  // hold-and-shift selector; idle scans look 6 m out at hash-seeded angles.
  const cands: AttnCand[] = [0, 1, 2, 3, 4, 5].map(() => ({ pri: 0, key: 0 }));
  let candN = 0;
  function addCand(pri: number, key: number) { if (candN < cands.length) { cands[candN].pri = pri; cands[candN].key = key; candN++; } }
  const SCAN = { yaw: 0, pitch: 0 };
  const GOAL = new Float64Array(3);
  function goalOf(a: Anim, key: number, out: Float64Array): boolean {
    if (key >= 0 && key < 900000) { const b = anims.get(key); if (!b || b === a) return false; out[0] = b.head.x; out[1] = b.head.y; out[2] = b.head.z; return true; }
    if (key >= 900000) { let st: World['stimuli'][number] | undefined; for (const x of world.stimuli) if (900000 + x.id === key) st = x; if (!st) return false; out[0] = st.position[0]; out[1] = ctx.groundHeight(st.position[0], st.position[2]) + 0.2; out[2] = st.position[2]; return true; }
    scanAngles(a.id, a.attn.n, SCAN);
    const yaw = a.heading + SCAN.yaw, d = 6 * a.morph.size;
    out[0] = a.head.x + Math.sin(yaw) * d; out[1] = a.head.y + Math.tan(SCAN.pitch) * d; out[2] = a.head.z + Math.cos(yaw) * d;
    return true;
  }
  function dirGoal(a: Anim, yaw: number, pitch: number, d: number) {
    GOAL[0] = a.head.x + Math.sin(yaw) * d; GOAL[1] = a.head.y + Math.tan(pitch) * d; GOAL[2] = a.head.z + Math.cos(yaw) * d;
  }
  /** Patrol look (creatures/patrol.ts), or a stranger's call heard during the patrol; returns the look weight. */
  function patrolAttention(a: Anim, dt: number): number {
    const c = a.chimp, D = 8 * a.morph.size;
    let hl = 0.12, w = 0.95, heard = false;
    // A stranger's pant-hoot or drumming heard during the patrol turns every head toward it.
    for (let i = world.calls.length - 1; i >= 0 && !heard; i--) {
      const call = world.calls[i];
      if (call.troopId === c.troopId || world.time - call.time > 3 / 60) continue;
      const dx = call.position[0] - a.x, dz = call.position[2] - a.z;
      if (dx * dx + dz * dz <= call.radius * call.radius) { dirGoal(a, Math.atan2(dx, dz), 0.1, D); heard = true; }
    }
    if (!heard) {
      const L = patrolLook(a.pCode, a.pVariant, a.id, a.pAhead, a.pBehind, a.moving, animClock, PLOOK);
      if (L.mode === 0 || L.weight <= 0) { dirGoal(a, a.heading, -0.4, D); return 0; } // sniffing: eyes down, head free
      hl = L.halflife; w = L.weight;
      const b = L.mode === 2 ? anims.get(L.memberId) : undefined;
      if (b && (b.head.x - a.head.x) ** 2 + (b.head.z - a.head.z) ** 2 < 625) { GOAL[0] = b.head.x; GOAL[1] = b.head.y; GOAL[2] = b.head.z; }
      else if (L.mode === 2) dirGoal(a, a.heading + (L.memberId === a.pBehind ? Math.PI * 0.8 * a.pSide : 0), 0.03, D);
      else dirGoal(a, a.heading + L.yaw, L.pitch, D);
    }
    if (a.lastSkinFrame < 0 || !Number.isFinite(a.lk[0].x) || Math.abs(a.lk[0].x - GOAL[0]) > 40) for (let k = 0; k < 3; k++) { a.lk[k].x = GOAL[k]; a.lk[k].v = 0; }
    for (let k = 0; k < 3; k++) springStep(a.lk[k], GOAL[k], hl, dt);
    return w;
  }
  /**
   * Stage W6: where the decision beat has the animal look (GOAL): the runner-up option, the chosen target, or back at a
   * companion. A place more than 12 m away is looked at as a direction, 8 m out at about eye level (the look point
   * springs: a point hundreds of metres off would make it jump). False when there is nothing to look at.
   */
  function beatGoal(a: Anim, gaze: number): boolean {
    const b = a.beat;
    if (!(b.since > -Infinity) || gaze === Gaze.none) return false;
    const kind = gaze === Gaze.alt ? b.altKind : gaze === Gaze.goal ? b.goalKind : 2, id = gaze === Gaze.alt ? b.altId : gaze === Gaze.goal ? b.goalId : b.backId;
    if (kind === 0) return false;
    if (kind === 2) { const o = anims.get(id); if (!o || o === a) return false; GOAL[0] = o.head.x; GOAL[1] = o.head.y; GOAL[2] = o.head.z; }
    else if (gaze === Gaze.alt) { GOAL[0] = b.ax; GOAL[1] = b.ay; GOAL[2] = b.az; }
    else { GOAL[0] = b.gx; GOAL[1] = b.gy; GOAL[2] = b.gz; }
    const dx = GOAL[0] - a.head.x, dz = GOAL[2] - a.head.z, d = hyp2(dx, dz);
    if (d > 12) { GOAL[0] = a.head.x + dx / d * 8; GOAL[2] = a.head.z + dz / d * 8; GOAL[1] = a.head.y + 0.4; }
    return true;
  }
  // ---- Stage W10 (calls you can see; creatures/heard.ts, fx.ts noteListeners): a separate block. An animal a long
  // call has just reached looks toward where it came from, whatever the distance (the candidate below turns heads only
  // for a caller within 20 m), and a stationary one holds its clip for a moment. Stylizations; field map only. ----
  // (Merge of W6 and W10. The order in which the beat and a heard call take the head is in updateAttention below.)
  /** True while the body is committing to its own act: the last part of the decision beat (stage W6), in which the
   * head is on the goal (the beat has a gaze) or the intention movement plays (a body that has yet to start, Way.soon:
   * the test the movement itself makes), and while that movement is held in until the first step. A body already on
   * the move when its act changed has neither, and commits nothing. A call heard while this is true does not take
   * the head and does not hold the clip. */
  function committing(a: Anim): boolean {
    const b = a.beat;
    if (!(b.since > -Infinity)) return false;
    return (b.phase === Phase.intent && (b.gaze !== Gaze.none || a.way === Way.soon)) || (a.intent > 0.5 && !b.waiting);
  }
  function heardAttention(a: Anim, dt: number): number {
    const H = fx.heard;
    if (!listening(H, a.slot, a.id, lastElapsed)) return 0;
    const dx = H.x[a.slot] - a.x, dz = H.z[a.slot] - a.z;
    if (dx * dx + dz * dz < 0.25) return 0;
    dirGoal(a, Math.atan2(dx, dz), 0.05, 8 * a.morph.size);
    if (a.lastSkinFrame < 0 || !Number.isFinite(a.lk[0].x) || Math.abs(a.lk[0].x - GOAL[0]) > 40) for (let k = 0; k < 3; k++) { a.lk[k].x = GOAL[k]; a.lk[k].v = 0; }
    for (let k = 0; k < 3; k++) springStep(a.lk[k], GOAL[k], 0.12, dt);
    return 0.9;
  }
  /** Holds the clip's pose while a stationary listener listens; true on the frame the hold ends (the caller blends out of it). */
  function heardHold(a: Anim, clip: string, start: boolean): boolean {
    const H = fx.heard, was = H.held[a.slot] === 1;
    // (Merge with W6: not while the intention movement of a decision beat plays or eases out. The hold copies last
    // frame's pose over this frame's, which would freeze the half rise in mid-air or keep it from starting.)
    const hold = !start && a.lastSkinFrame >= 0 && a.carry === 0 && !a.moving && a.chimp.alive && HEARD_HOLD.has(clip) && holding(H, a.slot, a.id, lastElapsed)
      && !committing(a) && !(a.intent > 0.01);
    if (hold) a.cur.v.set(a.prevCur);
    H.held[a.slot] = hold ? 1 : 0;
    return was && !hold;
  }
  function updateAttention(a: Anim, partner: Anim | undefined, dt: number): number {
    const c = a.chimp;
    if (a.pCode !== PatrolCode.none && a.pCode !== PatrolCode.return) return patrolAttention(a, dt);
    // Merge of stages W6 and W10: who takes the head, the first that applies.
    //   1. An alarming thing within 15 m (a snake model) keeps the eyes: neither the beat (W6's own rule) nor a call
    //      heard (decided at the merge; W10 as built took the head from it) comes before it. It is the top candidate below.
    //   2. The last part of the decision beat, the intention movement (committing above): the body is already turning
    //      to its goal, so the head stays on the goal. This is also all of the beat that is left at 1 min/s, where a
    //      community gives a long call every few real seconds: there a call never takes a beat. A look at a call that
    //      is under way when this part begins, or whose arc arrives during it, is ended for good (heard.ts endHeard):
    //      it does not come back once the body has started.
    //   3. A long call just heard (W10: 2.4 s from the moment its arc arrives, at most once in 10 s per animal). It
    //      takes the head from the earlier parts of the beat (the glance at the runner-up, the look at the goal), from
    //      a waiting initiator and from the looks back; the beat's countdown runs on meanwhile, so the call never
    //      delays the body. It does NOT take the head from a partner (grooming, play, nursing): the candidate list
    //      below already ranks a partner (4) above a heard call (3), and W10's hold still shows that the pair heard.
    //      It DOES take it from an animal that only follows another (heard.ts heardTakesHead; set at the check of the
    //      merge): a walker holds no clip, so a follower that kept its eyes on its leader showed nothing at all.
    //   4. The rest of the beat: the runner-up, then what was chosen; the first mover's look back. A deliberate turn
    //      (a slower spring than the idle glances).
    //   5. The ordinary candidates and the idle scans.
    // All of it is a stylization (beat.ts, heard.ts).
    const beatGaze = a.beat.gaze !== Gaze.none, heardNow = listening(fx.heard, a.slot, a.id, lastElapsed);
    if (beatGaze || heardNow) {
      let alarmed = false;
      for (const st of world.stimuli) if (st.kind === 'snake-model' && (st.position[0] - a.x) ** 2 + (st.position[2] - a.z) ** 2 < 225) { alarmed = true; break; }
      if (!alarmed) {
        const commit = heardNow && committing(a);
        if (commit) endHeard(fx.heard, a.slot, a.id);
        if (heardNow && heardTakesHead(commit, !!partner, a.act === 'follow')) { const hw = heardAttention(a, dt); if (hw > 0) return hw; }
        if (beatGaze && beatGoal(a, a.beat.gaze)) {
          if (a.lastSkinFrame < 0 || !Number.isFinite(a.lk[0].x) || Math.abs(a.lk[0].x - GOAL[0]) > 40) for (let k = 0; k < 3; k++) { a.lk[k].x = GOAL[k]; a.lk[k].v = 0; }
          for (let k = 0; k < 3; k++) springStep(a.lk[k], GOAL[k], 0.14, dt);
          return 0.95;
        }
      }
    }
    candN = 0;
    if (partner) addCand(4, partner.id);
    for (const call of world.calls) {
      if (call.callerId === a.id || world.time - call.time > 3 / 60) continue;
      if ((call.position[0] - a.x) ** 2 + (call.position[2] - a.z) ** 2 < 400 && anims.has(call.callerId)) { addCand(3, call.callerId); break; }
    }
    for (const st of world.stimuli) if (st.kind === 'snake-model' && (st.position[0] - a.x) ** 2 + (st.position[2] - a.z) ** 2 < 225) { addCand(5, 900000 + st.id); break; }
    for (const t of world.troops) if (t.id === c.troopId && t.alphaId >= 0 && t.alphaId !== a.id) {
      const al = anims.get(t.alphaId);
      if (al && (al.x - a.x) ** 2 + (al.z - a.z) ** 2 < 36) addCand(1, al.id);
    }
    selectAttention(a.attn, cands, candN, animClock, a.id);
    // Stage W6: while a model's answer is in flight for this animal (beat.ts deliberating; a stylization, not seen with
    // a model) an idle scan is not held for its usual 1.5 to 6 s: it moves on after THINK_SCAN_S, so an animal with
    // nothing to look at keeps looking about. A partner, a caller, a snake model and the alpha keep the eyes as always:
    // a wait can fall in the middle of a grooming bout, and the head must not leave the partner each time one does.
    const thinking = a.attn.pri === 0 && deliberating(c.controller, c.awaitingDecisionSince, world.modelPolicy.mode);
    if (thinking && a.attn.until > animClock + THINK_SCAN_S) a.attn.until = animClock + THINK_SCAN_S;
    // Stage W8: an idle glance at a neighbour (stepIdle) is the lowest-priority gaze. It is reached only when neither a
    // patrol, a decision beat nor a heard call has the head (each returns above), and it gives way to every candidate
    // (a partner, a caller, a snake model, the alpha): it takes the place of an aimless idle scan, nothing else. An
    // idle event does not start, and one under way ends, while a beat plays or a call is listened to (stepIdle).
    if (a.glanceId >= 0 && a.attn.pri === 0 && !thinking) {
      const o = anims.get(a.glanceId);
      if (o && o !== a && o.lastSkinFrame >= 0) {
        GOAL[0] = o.head.x; GOAL[1] = o.head.y; GOAL[2] = o.head.z;
        if (a.lastSkinFrame < 0 || !Number.isFinite(a.lk[0].x) || Math.abs(a.lk[0].x - GOAL[0]) > 40) for (let k = 0; k < 3; k++) { a.lk[k].x = GOAL[k]; a.lk[k].v = 0; }
        for (let k = 0; k < 3; k++) springStep(a.lk[k], GOAL[k], 0.11, dt);
        return 0.6;
      }
    }
    if (!goalOf(a, a.attn.key, GOAL)) { a.attn.until = -1; return 0; }
    if (a.lastSkinFrame < 0 || !Number.isFinite(a.lk[0].x) || Math.abs(a.lk[0].x - GOAL[0]) > 40) for (let k = 0; k < 3; k++) { a.lk[k].x = GOAL[k]; a.lk[k].v = 0; }
    for (let k = 0; k < 3; k++) springStep(a.lk[k], GOAL[k], 0.09, dt);
    return thinking ? 0.7 : a.attn.pri >= 3 ? 0.9 : a.attn.pri >= 1 ? 0.7 : 0.5;
  }
  const HQ = new Float32Array(4), HV = new Float32Array(3);
  function aimEyes(a: Anim, dt: number) {
    boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, B.head, TP, HQ);
    HQ[0] = -HQ[0]; HQ[1] = -HQ[1]; HQ[2] = -HQ[2];
    quat.rot(HV, 0, HQ, 0, GOAL[0] - TP[0], GOAL[1] - TP[1] - 0.05 * a.morph.size, GOAL[2] - TP[2]);
    const fwd = Math.max(0.05, HV[2]);
    const yaw = clamp(Math.atan2(HV[0], fwd), -0.6, 0.6), pitch = clamp(Math.atan2(HV[1], fwd), -0.4, 0.4);
    springStep(a.eye[0], a.lookW > 0.05 ? yaw : 0, 0.025, dt);
    springStep(a.eye[1], a.lookW > 0.05 ? pitch : 0, 0.025, dt);
  }

  // --- Trunk contact (A11): IK targets are projected onto the trunk cylinder at their own height, one hand's
  // thickness out from the bark. mask: bit per limb (armL 1, armR 2, legL 4, legR 8).
  const T4 = new THREE.Vector4(), T4b = new THREE.Vector4();
  function trunkPoint(tree: World['trees'][number], y: number, out: THREE.Vector4): boolean {
    if (ctx.trunkAt && ctx.trunkAt(tree.id, y, out)) return true;
    out.set(tree.position[0], y, tree.position[2], trunkRadius(tree));
    return false;
  }
  function trunkContacts(a: Anim, treeId: number, mask: number): boolean {
    const tree = treeById.get(treeId);
    if (!tree) return false;
    const v = a.out.v, s = a.morph.size, q = a.bodyQ;
    QI[0] = -q[0]; QI[1] = -q[1]; QI[2] = -q[2]; QI[3] = q[3];
    let any = false;
    for (let l = 0; l < 4; l++) {
      if (!(mask & (1 << l))) continue;
      const o = PI.ik + l * 5;
      if (v[o + 3] < 0.5) continue;
      quat.rot(TVW, 0, q, 0, v[o] * s, v[o + 1] * s + a.lift, v[o + 2] * s);
      const wx = TVW[0] + a.bx, wy = TVW[1] + a.by, wz = TVW[2] + a.bz;
      trunkPoint(tree, wy, T4b);
      let dx = wx - T4b.x, dz = wz - T4b.z;
      const d = hyp2(dx, dz);
      if (d > T4b.w + 0.7 * s) continue; // out of reach of this trunk
      if (d < 1e-4) { dx = Math.sin(a.heading + Math.PI); dz = Math.cos(a.heading + Math.PI); } else { dx /= d; dz /= d; }
      // The swing offset in the pose (hand leaving the bark) is kept: only stance limbs sit on the surface.
      const lift = Math.max(0, d - (T4b.w + (l < 2 ? 0.05 : 0.06) * s)) * (v[PI.contact + l] > 0.5 ? 0 : 1);
      const rr = T4b.w + (l < 2 ? 0.05 : 0.06) * s + Math.min(lift, 0.08 * s);
      quat.rot(TVW, 0, QI, 0, T4b.x + dx * rr - a.bx, wy - a.by, T4b.z + dz * rr - a.bz);
      v[o] = TVW[0] / s; v[o + 1] = (TVW[1] - a.lift) / s; v[o + 2] = TVW[2] / s;
      any = true;
    }
    return any;
  }
  /**
   * Drinkers (render-only layout): the sim's water sites sit ~2 m back on the bank, so the rendered animal moves
   * to the waterline (at most 3 m) and faces the water with its lips at the surface. Cached per sim position.
   */
  const EDGE = new THREE.Vector3();
  function drinkSpot(a: Anim) {
    if (!ctx.waterEdge) return;
    // (W6: from where the drawn body is. A drinker whose next act has begun in the simulation stays at the waterline
    // until its body leaves; the simulation's position is by then metres away.)
    const px = a.track.x, pz = a.track.z;
    if (hyp2(px - a.drinkSimX, pz - a.drinkSimZ) > 0.3) {
      a.drinkSimX = px; a.drinkSimZ = pz;
      a.drinkOk = ctx.waterEdge(px, pz, EDGE) && hyp2(EDGE.x - px, EDGE.z - pz) < 3.2;
      if (a.drinkOk) { a.drinkX = EDGE.x; a.drinkZ = EDGE.z; }
    }
    if (!a.drinkOk) return;
    const dx = a.drinkX - a.track.x, dz = a.drinkZ - a.track.z, d = hyp2(dx, dz);
    if (d < 1e-3) return;
    const back = 0.36 * a.morph.size; // body origin behind the waterline; the drinking lean puts the lips over it
    a.tx = a.drinkX - dx / d * back; a.tz = a.drinkZ - dz / d * back;
    a.headingTarget = Math.atan2(dx, dz);
    if (a.visible && ctx.ripple && Math.floor(animClock * 1.3 + a.id) !== Math.floor((animClock - curDt) * 1.3 + a.id)) ctx.ripple(a.drinkX + dx / d * 0.1, a.drinkZ + dz / d * 0.1, 0.5);
  }
  /**
   * A drummer within reach of a trunk or buttress faces it and slaps it (vocal 'drum'). Runs before motion. A patrol's
   * release drummer (reach > 0) also takes a trunk up to `reach` further away: it is walked there (render-only
   * layout from its sim position, as drinkers are to the waterline), so the display ends drumming on the buttress.
   */
  function drumTree(a: Anim, reach = 0): number {
    const x = reach > 0 ? a.track.x : a.x, z = reach > 0 ? a.track.z : a.z, s = a.morph.size;
    const t = nearestTree(x, z, 2.5 + reach);
    if (!t) return -1;
    trunkPoint(t, ctx.groundHeight(x, z) + 0.5 * s, T4b);
    const dx = T4b.x - x, dz = T4b.z - z, d = hyp2(dx, dz), gap = d - T4b.w;
    if (gap > 0.75 * s + reach) return -1;
    a.headingTarget = Math.atan2(dx, dz);
    if (reach > 0 && gap > 0.6 * s && d > 1e-3) { const move = gap - 0.55 * s; a.tx += dx / d * move; a.tz += dz / d * move; }
    return t.id;
  }

  // World-space hands and feet (visual plan §A3): stance contacts follow the terrain under each one, lock where
  // they touch down and re-plant with a short step when the body has turned or moved away from them; the pelvis
  // drops onto a foot that stands lower than the body plane. Rewrites IK targets in a.out; true if any changed.
  const QI = new Float32Array(4), TVW = new Float32Array(3);
  function plantContacts(a: Anim, dt: number): boolean {
    const v = a.out.v, s = a.morph.size, q = a.bodyQ;
    QI[0] = -q[0]; QI[1] = -q[1]; QI[2] = -q[2]; QI[3] = q[3];
    let minDelta = 0, any = false;
    for (let l = 0; l < 4; l++) {
      const o = PI.ik + l * 5;
      if (v[o + 3] < 0.5) { resetLock(a.locks[l]); continue; }
      const ty = v[o + 1];
      const nearGround = ty < CONTACT_BASE[l] + 0.16;
      const inGait = !!a.gait && a.gait !== 'climb' && (a.gait !== 'biped' || l >= 2);
      if (!nearGround && !inGait) { resetLock(a.locks[l]); continue; }
      // Body-space target (metres) → world, and the body-plane point beneath it.
      quat.rot(TVW, 0, q, 0, v[o] * s, ty * s + a.lift, v[o + 2] * s);
      W[0] = TVW[0] + a.bx; W[1] = TVW[1] + a.by; W[2] = TVW[2] + a.bz;
      quat.rot(TVW, 0, q, 0, v[o] * s, 0, v[o + 2] * s);
      const planeY = TVW[1] + a.by;
      const delta = clamp(ctx.groundHeight(W[0], W[2]) - planeY, -0.2 * s, 0.2 * s);
      W[1] += delta;
      const contact = v[PI.contact + l] > 0.5 && ty < CONTACT_BASE[l] + 0.03;
      if (contact && l >= 2) minDelta = Math.min(minDelta, delta);
      const before = a.locks[l].replants;
      // Walking: a planted limb holds until lift-off unless the body has swung far off it (turns); standing, a
      // limb re-plants once it has drifted 5.5% of body size (8 cm in an adult).
      stepLock(a.locks[l], contact, W[0], W[1], W[2], dt, (a.moving ? 0.14 : 0.055) * s, 0.05 * s, OUT);
      a.dbg.replants += a.locks[l].replants - before;
      // Back to body space.
      quat.rot(TVW, 0, QI, 0, OUT[0] - a.bx, OUT[1] - a.by, OUT[2] - a.bz);
      v[o] = TVW[0] / s; v[o + 1] = (TVW[1] - a.lift) / s; v[o + 2] = TVW[2] / s;
      any = true;
    }
    // Pelvis lowering toward the lowest planted foot (applied to the body frame next frame).
    a.drop = damp(a.drop, Math.max(minDelta, -0.12 * s) * 0.8, 10, dt);
    return any;
  }

  // --- Stage W8: the body's state and idle life (creatures/bodystate.ts, secondary.ts, creatures/idle.ts) -----------
  // Whether a Track E mechanism keeps body state the simulation can give (read once: the layer is rebuilt with the world).
  const trackE = (() => { const P = paramsOf(world); return P.energyLedger === 1 || P.rhythmSleep === 1 || P.endoStates === 1; })();
  let stateClock = 0;   // real seconds (the frame's own elapsed time can be frozen by a harness)
  /** Reads the animal's state into its channel targets, about once a second (staggered by slot); never per frame. */
  function readState(a: Anim) {
    const c = a.chimp, tg = a.tg;
    if (c.alive) bodyChannels(c, debug.body ? debug.body(c) : trackE ? bodyStateOf(world, c) : null, world.time, tg);
    else { tg.arousal = 0; tg.fear = 0; tg.lid = 0; tg.sleepy = 0; tg.scratch = 1; tg.yawn = 1; }   // a body keeps the belly and flanks it had
    if (a.stateAt < 0) { const ch = a.ch; ch.belly = tg.belly; ch.flank = tg.flank; ch.lid = tg.lid; ch.arousal = tg.arousal; ch.fear = tg.fear; }
    a.stateAt = stateClock + 0.8 + 0.4 * hash01(a.slot, 91);
  }
  // Which idle events a stationary clip permits (a drawing rule; stylization). Everything: standing, sitting, resting
  // and perching. Feeding keeps its arm and mouth: a shift of weight or a glance. Nursing: the face and a shift. Being
  // groomed and sitting out rain: a yawn. Clinging to a trunk: a glance. Nothing: asleep, dead, carried, drinking,
  // grooming, calling, displaying, greeting, fighting, mating, playing, building a nest, hunting, every pause of a
  // patrol (tense and silent), and every moving clip. A clip this table does not know gets the face only, unless its
  // name says it is a rest, a sit or a perch.
  const I_ALL = idleBit(IDLE.scratch) | idleBit(IDLE.yawn) | idleBit(IDLE.shift) | idleBit(IDLE.glance) | idleBit(IDLE.nod);
  const I_FACE = idleBit(IDLE.yawn) | idleBit(IDLE.glance);
  const IDLE_ALLOW = new Map<string, number>([
    ['stand', I_ALL], ['sitIdle', I_ALL], ['rest', I_ALL], ['perch', I_ALL], ['guard', I_ALL & ~idleBit(IDLE.nod)],
    ['forage', idleBit(IDLE.shift) | idleBit(IDLE.glance)], ['nurse', I_FACE | idleBit(IDLE.shift)], ['groomee', idleBit(IDLE.yawn)], ['shelter', idleBit(IDLE.yawn)], ['clingTrunk', idleBit(IDLE.glance)],
    ...['sleep', 'dead', 'deadCarried', 'carryVentral', 'carryDorsal', 'drink', 'groom', 'play', 'wrestle', 'tickle', 'display', 'charge', 'attack', 'defend', 'submit', 'pantGrunt', 'embrace', 'mate', 'share', 'beg',
      'pantHoot', 'drum', 'alarm', 'patrol', 'listen', 'hunt', 'cower', 'nestBuild', 'walk', 'gallop', 'sneak', 'swagger', 'bipedWalk', 'climb', 'clamber', 'bind', 'portrait'].map(k => [k, 0] as [string, number]),
  ]);
  const SEATED_NAME = /^(rest|sit|perch)/;
  function idleAllow(clip: string): number { const k = IDLE_ALLOW.get(clip); return k !== undefined ? k : SEATED_NAME.test(clip) ? I_ALL : I_FACE; }
  const ICTX = createIdleCtx();
  /** Set by stepState for the animal being posed: an idle yawn or nod was cut short on this evaluation (evaluatePose blends out of it). */
  let idleCut = false;
  /** A raised coat is drawn up to this much higher again on an animal that is small on screen (fully under 40 px of
   * body, not at all over 140 px), so that an aroused male still has another outline from the strategy camera: a
   * readability gain on the same footing as rig.ts RENDER_SCALE. A stylization. */
  const COAT_FAR_GAIN = 1;
  /** An arm that holds on (overhead, or with its hand closed round a limb or a bough: idle.ts handHolds; the second
   * from the merge of W8 and W9, for the resting postures in a crown), or holds something, does not scratch. Read on
   * the pose as the clip wrote it. */
  function armBusy(pose: Pose, side: number): boolean {
    return handHolds(pose.v, side) || (side ? pose.propR : pose.propL) !== 0;
  }
  /** A body further than this from its seat in a crown is still sliding there (m; placeGrounded eases it: 5 cm is the
   * last half second of a slide, under 13 cm a second). Merge of W8 and W9; a drawing rule. */
  const SEAT_SETTLED_M = 0.05;
  /** A neighbour to glance at: the nearest drawn animal within 9 m, sometimes the second nearest. Runs when a glance starts, not per frame. */
  function neighbourOf(a: Anim, n: number): number {
    let b0 = -1, b1 = -1, d0 = 81, d1 = 81;
    for (const o of animList) {
      if (o === a || !o.chimp.alive || o.lastSkinFrame < 0 || (o.carry !== 0 && o.carrierId === a.id)) continue;
      const d = (o.bx - a.bx) ** 2 + (o.by - a.by) ** 2 + (o.bz - a.bz) ** 2;
      if (d < d0) { b1 = b0; d1 = d0; b0 = o.id; d0 = d; } else if (d < d1) { b1 = o.id; d1 = d; }
    }
    return b1 >= 0 && hash01(a.id, 700 + n) > 0.6 ? b1 : b0;
  }
  /** The drawn channels ease toward the state last read; then breathing and idle life, unless switched off or dead. */
  function stepState(a: Anim, clip: string, dt: number) {
    const ch = a.ch, tg = a.tg;
    // (A belly with an infant on it is drawn no rounder than built, and gives way about as fast as the infant settles
    // on it: bodystate.ts bellyUnder.)
    const onBelly = (a.bears & 1) !== 0;
    ch.belly = damp(ch.belly, bellyUnder(tg.belly, onBelly), onBelly && ch.belly > 0 ? 3 : 0.6, dt); ch.flank = damp(ch.flank, tg.flank, 0.6, dt); ch.lid = damp(ch.lid, tg.lid, 0.8, dt);
    ch.arousal = damp(ch.arousal, tg.arousal, 1.5, dt); ch.fear = damp(ch.fear, tg.fear, 2.5, dt);
    const idle = a.idle, was = idle.kind, face = idleFace(was, idle.t, idle.dur);
    if (debug.idle && debug.w8 && a.chimp.alive) stepIdle(a, clip, dt);
    else { ch.breath = 0; a.scratchK = 0; a.scrCut = -1; a.leanK = 0; a.glanceId = -1; if (idle.kind !== IDLE.none) idleCancel(idle); }
    idleCut = face > 0.05 && idle.kind !== was;
  }
  /** Breathing, the idle schedule and the idle layer over the clip just written to a.cur (bound to pw). */
  function stepIdle(a: Anim, clip: string, dtIn: number) {
    const c = a.chimp, ch = a.ch, tg = a.tg, idle = a.idle, v = a.cur.v;
    const dt = Math.min(dtIn, 0.25); // an animal's first evaluation, or one long out of view, carries a long step
    const lying = a.posture === Posture.lying, lie = lying ? lieOf(v) : 0;
    // Breathing: each animal's own rate and phase, 0.26 to 0.36 breaths a second at rest, faster after exertion and
    // when aroused, slower when sleepy; an animal lying down breathes deeper to the eye, the one sign of life a dozing
    // body gives (design assumptions; no respiratory rate is in docs/research.md).
    const hz = (0.26 + 0.1 * hash01(a.id, 51)) * (1 + 1.3 * a.exert + 0.5 * ch.arousal) * (1 - 0.25 * tg.sleepy);
    a.breathPh = (a.breathPh + dt * hz) % 1;
    a.breathAmp = damp(a.breathAmp, (1 + 1.2 * a.exert) * (lying && !a.moving ? 1.6 : 1), 3, dt);
    ICTX.breath = Math.sin(a.breathPh * Math.PI * 2); ICTX.breathAmp = a.breathAmp;
    ch.breath = ICTX.breath * a.breathAmp;
    // What may start now. Not while the body moves, is carried or patrols; not in the last seconds before it starts a
    // new act (the decision beat, stage W6, has the head and the body then) nor while it waits for company; not while
    // it listens to a call (stage W10) or calls itself; not above the rate at which a second spans minutes (drawn.ts).
    const b = a.beat, inBeat = (b.since > -Infinity && (b.phase !== Phase.none || b.waiting)) || a.intent > 0.01;
    const still = !a.moving && a.carry === 0 && a.pCode === PatrolCode.none && !inBeat && !pctx.vocal && curSimRate <= ABOUT_MAX_RATE
      && !listening(fx.heard, a.slot, a.id, lastElapsed);
    let allow = still ? idleAllow(clip) : 0;
    // (Merge of W8 and W9.) The resting seat of a crown also stands in for acts that have no clip there (a display, a
    // charge, a submission, a pant-grunt): those permit nothing, as their own clips do on the ground (idle.ts seatIdles;
    // by the act the drawn body is in).
    if (allow && clip === 'perch' && !seatIdles(a.act)) allow = 0;
    const shifts = (allow & idleBit(IDLE.shift)) !== 0 && !lying && !a.holds;
    if (allow) {
      if (v[PI.eyes] > 0.9) allow = 0; // asleep: it only breathes (a dozing rester, eyes half shut, still scratches and yawns)
      else {
        if (!shifts) allow &= ~idleBit(IDLE.shift);
        if (a.posture !== Posture.seated) allow &= ~idleBit(IDLE.nod);
        // A scratch needs a seated body or one lying on its side or back: on all fours and upright the arm's elbow
        // pole (rig.ts LIMBS; it rides with the chest) stands the elbow over the back. And a free hand with nothing in
        // the way: not holding an infant, a body or meat, not in a pair.
        // (Merge of W8 and W9. Not a body lying along a bough in a crown: it has no hand to spare, idle.ts mayScratch.
        // And a scratch under way lets go when the clip's pose takes that arm for a hold: armBusy, which is also asked
        // when a scratch starts, below, and now sees the hand a perched animal keeps on its limb.)
        if (!mayScratch(a.posture, lie, a.elevated > 0.5) || a.holds || a.paired || (c.carryingDeadId ?? -1) >= 0 || c.carryingMeat > 0.05) allow &= ~idleBit(IDLE.scratch);
        else if (idle.kind === IDLE.scratch && armBusy(a.cur, idle.side)) allow &= ~idleBit(IDLE.scratch);
      }
      // (Merge of W8 and W9.) Nothing starts on a body that is still sliding to its seat in a crown (joining a partner's
      // bough, going back to its own limb, lying down along one): the slide is not in a.moving, which reads the
      // simulated path. An event under way goes on, and a held lean stays (`shifts` above).
      if (a.glide > SEAT_SETTLED_M && idle.kind === IDLE.none) allow = 0;
    }
    const forced = debug.idleForce;
    let started = false;
    if (forced && idle.kind === IDLE.none && (allow & idleBit(forced.kind))) {
      idle.kind = forced.kind; idle.t = 0; idle.dur = forced.kind === IDLE.shift ? 1.4 : 3; idle.site = forced.site ?? 0; idle.side = forced.side ?? 0; idle.n++;
      if (forced.kind === IDLE.shift) { idle.leanFrom = idle.lean; idle.lean = idle.lean > 0 ? -1 : 1; }
      started = true;
    } else started = idleStep(idle, a.id, dt, idleRate(curSimRate), allow, tg.scratch, tg.yawn, tg.lid > 0.2 ? 1 : 0);
    // (Stage W11: a glance with nobody within reach uses up its turn, secondary.ts idleSpend. Cancelled, the turn was
    // drawn again 2 s later, and an animal alone was busier than one in a party.)
    if (started && idle.kind === IDLE.glance) { a.glanceId = neighbourOf(a, idle.n); if (a.glanceId < 0) idleSpend(idle, a.id, idleRate(curSimRate), tg.scratch, tg.yawn, tg.lid > 0.2 ? 1 : 0); }
    if (started && idle.kind === IDLE.scratch) {
      // The hand: the arm on top for an animal on its side, the one that rests on the belly for one on its back
      // (poses.ts lieBack), else the side drawn by hash unless that arm holds on overhead or holds something.
      if (lie === Lie.side) idle.side = v[B.hips * 3 + 2] > 0 ? 0 : 1;
      else if (lie === Lie.supine) idle.side = 1;
      else if (armBusy(a.cur, idle.side)) idle.side = idle.side ? 0 : 1;
      if (armBusy(a.cur, idle.side)) idleCancel(idle);
      // The place: the front of the belly for an animal on its back, flank or thigh for one on its side.
      else if (lie === Lie.supine) idle.site = SCRATCH_BELLY;
      else if (lie === Lie.side && idle.site === SCRATCH.head) idle.site = SCRATCH.flank;
    }
    if (idle.kind !== IDLE.glance) a.glanceId = -1;
    // The reach follows the scratch's own curve while it runs. Stage W11: when the schedule drops it (the animal moves
    // off, a call arrives, a new act is announced) the reach it had lets go along the curve a finished scratch ends on
    // (idle.ts scratchRelease), quicker on a body that has started to move. A scratch that ended by itself has next to
    // nothing left to let go. (Before, the reach was pulled to 0 at 14 a second: 55 cm of wrist in a fifth of a second.)
    if (idle.kind === IDLE.scratch) { a.scrSite = idle.site; a.scrSide = idle.side; a.scrT = idle.t; a.scrCut = -1; a.scratchK = damp(a.scratchK, scratchReach(idle.t, idle.dur), 14, dt); }
    else if (a.scratchK > 0) {
      if (a.scrCut < 0) { a.scrCut = 0; a.scrFrom = a.scratchK; }
      a.scrCut += dt; a.scrT += dt;
      a.scratchK = scratchRelease(a.scrFrom, a.scrCut, a.moving ? SCRATCH_CUT_MOVING_S : SCRATCH_CUT_S);
      if (a.scratchK < 1e-3) { a.scratchK = 0; a.scrCut = -1; }
    }
    a.leanK = damp(a.leanK, shifts || idle.kind === IDLE.shift ? idleLean(idle) : 0, 6, dt);
    if (Math.abs(a.leanK) < 1e-4) a.leanK = 0;
    ICTX.kind = idle.kind; ICTX.t = idle.t; ICTX.dur = idle.dur; ICTX.lean = a.leanK;
    // (The body's part of a scratch that is letting go: its own place and side, not those of whatever the schedule holds now.)
    const letting = idle.kind !== IDLE.scratch && a.scratchK > 0;
    ICTX.site = letting ? a.scrSite : idle.site; ICTX.side = letting ? a.scrSide : idle.side; ICTX.letGo = letting ? a.scratchK : 0; ICTX.letT = a.scrT;
    idleOverlay(pw, a.posture, ICTX);
  }

  /** The coat value as it is drawn close up: without the gain an animal small on screen gets (writeParams). */
  function coatNear(a: Anim): number {
    const dc = debug.w8 ? debug.channels : undefined;
    return (dc !== undefined && (dc.only === undefined || dc.only === a.id) ? dc.coat : undefined) ?? a.bristle;
  }
  function writeParams(a: Anim, elapsed: number) {
    const d = mats.data, o = (a.slot * ROW_TEXELS + PARAM_TEXEL) * 4;
    const c = a.chimp;
    d[o] = a.fur[0]; d[o + 1] = a.fur[1]; d[o + 2] = a.fur[2]; d[o + 3] = a.gray;
    // P1.a packs mottle (fraction, <1) and the grin (integer steps of 1/15).
    d[o + 4] = a.skin[0]; d[o + 5] = a.skin[1]; d[o + 6] = a.skin[2]; d[o + 7] = Math.min(0.99, a.mottle) + Math.round(a.grin * 15);
    const swell = c.sex === 'female' ? clamp(c.swelling ?? 0, 0, 1) : 0;
    // Stage W8. P2.x: the coat, −1 sleek .. 0 as built .. 1 on end, and up to COAT_FAR_GAIN times more on an animal
    // that is small on screen (material.ts). The harness can hold the drawn values (debug.channels).
    const w8 = debug.w8, dc = w8 ? debug.channels : undefined, held = dc !== undefined && (dc.only === undefined || dc.only === a.id) ? dc : undefined, ch = a.ch;
    const coat = coatNear(a), lid = w8 ? held?.lid ?? ch.lid : 0;
    d[o + 8] = w8 && coat > 0 ? coat * (1 + COAT_FAR_GAIN * (1 - smoothstep(40, 140, a.px))) : coat;
    d[o + 9] = swell > 0.01 ? swell : -a.tuft; d[o + 10] = a.beard; d[o + 11] = a.bald;
    // A sleepy animal blinks slowly (W8; stylization). With the lid at 0 the blink is what it was.
    const blink = debug.blink ? blinkAt(a.blink, a.id, elapsed, 0.13 + (BLINK_SLOW - 0.13) * Math.min(1, lid / LID_MAX)) : 0;
    d[o + 12] = a.dim; d[o + 13] = a.mouth; d[o + 14] = Math.max(a.out.v[PI.eyes], blink); d[o + 15] = a.fade;
    // P4: iris offset (yaw, pitch in radians, head frame), brow raise (−1 lowered .. 1 raised), lip press.
    d[o + 16] = a.eye[0].x; d[o + 17] = a.eye[1].x; d[o + 18] = a.out.v[PI.brow]; d[o + 19] = a.out.v[PI.press];
    // P5.x: palms and soles darken from juvenility to adulthood (pale in infants).
    d[o + 20] = smoothstep(4, 14, c.age ?? 20);
    // P5.y: the iris of the young is drawn up to 22% wider and a third darker, easing out between 3 and 11 years, so
    // an infant's eye reads large and dark in its pale face (stylization: no measured ratio; W3).
    d[o + 21] = 0.22 * (1 - smoothstep(3, 11, c.age ?? 20));
    // Stage W8. P5.z: the upper lid's droop (sleepiness). P6 (texel PARAM_TEXEL + 6, inside ROW_TEXELS): belly, flank
    // and the signed breath. Still free: P5.w, P6.w and the last texel of the row.
    d[o + 22] = lid;
    d[o + 24] = w8 ? held?.belly ?? ch.belly : 0; d[o + 25] = w8 ? held?.flank ?? ch.flank : 0; d[o + 26] = w8 ? ch.breath : 0;
  }

  // Body frame from heading and terrain slope (quadrupeds align more than sitters).
  function bodyFrame(a: Anim, x: number, z: number, y: number, align: number) {
    const e = 0.45 * a.morph.size;
    const hF = ctx.groundHeight(x + Math.sin(a.heading) * e, z + Math.cos(a.heading) * e);
    const hB = ctx.groundHeight(x - Math.sin(a.heading) * e, z - Math.cos(a.heading) * e);
    const hL = ctx.groundHeight(x + Math.cos(a.heading) * e * 0.6, z - Math.sin(a.heading) * e * 0.6);
    const hR = ctx.groundHeight(x - Math.cos(a.heading) * e * 0.6, z + Math.sin(a.heading) * e * 0.6);
    const pitch = clamp(Math.atan2(hB - hF, 2 * e), -0.45, 0.45) * align;
    const roll = clamp(Math.atan2(hL - hR, 1.2 * e), -0.35, 0.35) * align;
    // Positive Z tilts the back toward −X (the animal's right): toward the lower side when the left is higher,
    // and toward the inside of a turn for bank (> 0 turning left).
    E.set(pitch, a.heading, roll - a.bank, 'YXZ');
    Q.setFromEuler(E);
    a.bodyQ[0] = Q.x; a.bodyQ[1] = Q.y; a.bodyQ[2] = Q.z; a.bodyQ[3] = Q.w;
    a.bx = x; a.by = y; a.bz = z;
  }

  function placeGrounded(a: Anim) {
    const c = a.chimp;
    const h = a.y;
    let x = a.x, z = a.z;
    a.climbTree = -1;
    a.glide = 0;   // (merge of W8 and W9: set below while the drawn seat eases to its place)
    const wasUp = a.elevated > 0.5;
    a.elevated = damp(a.elevated, h > 0.3 ? 1 : 0, 4, 1 / 30);
    a.onBranch = false;
    if (h > 0.3) {
      const tree = treeFor(a);
      const g = tree ? ctx.groundHeight(tree.position[0], tree.position[2]) : ctx.groundHeight(x, z);
      let y = g + h, fx = NaN, fy = 0, fz = 0;
      // Stage W6, a real climb down (and up): whenever the drawn path of an animal in a tree goes up or down faster
      // than a shuffle, whatever its act, it is on the trunk in the climb cycle (chooseClip), not seated on its branch
      // until it drops to the ground. trunkK eases the body between its branch and the bark (a short clamber; the
      // rate is a stylization); an animal coming up from the ground is on the bark at once.
      const climbAct = c.action === 'climb', vy = Math.abs(a.track.vy) / 3600;
      a.onTrunk = !!tree && !climbAct && a.carry === 0 && trunkBound(vy, a.onTrunk, PATH_MOVING_MPS);
      a.trunkK = a.onTrunk && !wasUp && a.trunkK < 0.5 ? 1 : damp(a.trunkK, a.onTrunk ? 1 : 0, 5, curDt);
      // (W6: in the nest once the drawn body is in the nest act, not while it is still on its way to the nest tree.)
      // The place is remembered: the simulation clears Chimp.nest the moment the animal decides to leave, two ticks
      // before its drawn body does, and it would be lifted out of its nest onto a branch for that long.
      let inNest = false;
      if (a.act === 'nest') {
        if (c.action === 'nest') {
          // Stage W9: the simulation publishes Chimp.nest when the nest is finished; while the animal builds, the nest
          // is where it is (it does not move until it is done), in the tree its act names. So the builder sits at its
          // nest place from the start (it used to build on its branch and jump into the finished nest), and the nest
          // grows under it (nests.ts build). Only once the drawn body is in the nest act: on its way there the act is
          // 'travel' (stage W6) and this is not reached.
          const site = c.nest ? c.nest.treeId : a.nestK < 1 && treeById.has(c.targetId) ? c.targetId : -1;
          const spot = site >= 0 ? nests.spotFor(site, c.nest ? c.nest.position : c.position, a.id, V2) : false;
          a.nestOk = spot; if (spot) { a.nestX = V2.x; a.nestY = V2.y + 0.12 * a.morph.size; a.nestZ = V2.z; }
          if (spot && (a.nestK < 1 || a.clip === 'sleep')) nests.build(a.id, site, c.nest ? c.nest.position : c.position, a.nestK, world.time);
        }
        // (The remembered place only while the drawn body is at it: REMEMBERED_TREE_M.)
        inNest = a.nestOk && (c.action === 'nest' || hyp2(a.nestX - a.x, a.nestZ - a.z) < REMEMBERED_TREE_M);
      } else { a.nestOk = false; a.nestK = 1; } // (nestK: a build given up is not carried into the next nest)
      if (tree) {
        const r0 = trunkRadius(tree);
        let dx = x - tree.position[0], dz = z - tree.position[2];
        let dl = hyp2(dx, dz);
        if (dl < 0.05) { const ang = hash01(a.id, 41) * Math.PI * 2; dx = Math.sin(ang); dz = Math.cos(ang); dl = 1; }
        let crownTop = Infinity;
        if (climbAct) {
          if (ctx.treeAnchor(tree.id, anchor)) crownTop = anchor.y + 1.5;
          // Hug the trunk, facing it; the rig climbs toward +Z. The rendered trunk (vegetation.trunkAt) gives the
          // axis and bark radius at the chest, so the hands sit on the bark instead of beside it.
          const hasTrunk = trunkPoint(tree, y + 0.8 * a.morph.size, T4);
          const r = (hasTrunk ? T4.w : r0) + 0.15 * a.morph.size;
          const ax = hasTrunk ? T4.x : tree.position[0], az = hasTrunk ? T4.z : tree.position[2];
          x = ax + dx / dl * r; z = az + dz / dl * r;
          a.heading = Math.atan2(-dx, -dz);
          a.climbTree = tree.id;
          y = Math.min(y, crownTop);
          a.seated = false;
          if (inNest) { x = a.nestX; y = a.nestY; z = a.nestZ; }
        } else {
          // Its own place in the crown (ownSeat: a limb the environment draws, else out from the crown anchor), or,
          // stage W9, its place on a bough laid by layoutCrowns (a pair or chain, or lying along it; no stick of its own).
          if (a.ownFrame !== frameNo) ownSeat(a, tree, x, z, y);
          x = a.ownX; y = a.ownY; z = a.ownZ; a.onBranch = a.ownLimb; crownTop = a.ownTop; perchYaw = a.ownYaw;
          if (a.seatHost >= 0) { x = a.seatX; y = a.seatY; z = a.seatZ; a.onBranch = true; }
          // Its nest place is a seat like any other (W9: the body eases into it and off the trunk; it used to be put
          // there in one frame once the clamber from the trunk was half done).
          if (inNest) { x = a.nestX; y = a.nestY; z = a.nestZ; }
          fx = x; fy = y; fz = z;   // (W11: the place it is bound for, before any easing)
          // Stage W9: the drawn seat eases to its place (as partners slide into place on the ground, a little slower and
          // never faster than perch.ts clamberSpeed), so an animal joining a partner's bough or lying down along one
          // moves there instead of jumping. A relocation or a first frame in the crown is drawn at once. A seat that
          // does not move (every animal resting or feeding alone on a limb) is exactly where it was before this stage.
          // Drawn at once too, as before this stage: when the forest window gave or took this tree's limbs this frame
          // (ownCut; eased, every animal of a crown rose 3 to 5 m through it for three seconds after the camera
          // arrived), and in time-lapse (above ABOUT_MAX_RATE, stage W6's limit: at 10 min/s pairs form and part
          // several times a second, and eased bodies were away from their seats 41% of the time, 80% at 1 h/s).
          // (Stage W11: a place more than 6 m away was drawn at once too: an animal whose pairing ended was filmed
          // jumping 7.8 m across its crown. It now moves there like any other, at a clamber's speed; only a place
          // further off than any crown is wide, CROWN_JUMP_M, is still drawn at once.)
          if (!a.seated || a.track.jumped || a.ownCut === frameNo || curSimRate > ABOUT_MAX_RATE || hyp2(hyp2(x - a.sx, z - a.sz), y - a.sy) > CROWN_JUMP_M) { a.sx = x; a.sy = y; a.sz = z; }
          else if (a.sx !== x || a.sy !== y || a.sz !== z) {
            const ex = x - a.sx, ey = y - a.sy, ez = z - a.sz, el = hyp2(hyp2(ex, ez), ey);
            const k = Math.min(1 - Math.exp(-2.5 * curDt), el > 1e-6 ? clamberSpeed(curSimRate) * curDt / el : 1);
            if (el < 2e-3) { a.sx = x; a.sy = y; a.sz = z; } else { a.sx += ex * k; a.sy += ey * k; a.sz += ez * k; a.glide = el * (1 - k); }
          }
          a.seated = true; x = a.sx; y = a.sy; z = a.sz;
        }
        if (a.trunkK > 1e-3 && !climbAct) {
          // The point on the bark at the height the simulation has the animal (the same placement as the climb act),
          // meeting the ground point over the last metre so the landing is not a jump.
          const yT = Math.min(g + h, crownTop), hasTrunk = trunkPoint(tree, yT + 0.8 * a.morph.size, T4);
          const r = (hasTrunk ? T4.w : r0) + 0.15 * a.morph.size, low = 1 - smoothstep(0.3, 1.0, h);
          const tx = (hasTrunk ? T4.x : tree.position[0]) + dx / dl * r, tz = (hasTrunk ? T4.z : tree.position[2]) + dz / dl * r;
          const px = tx + (a.x - tx) * low, pz = tz + (a.z - tz) * low, py = yT + (ctx.groundHeight(a.x, a.z) + h - yT) * low;
          // (Stage W11: over that last metre the body is on the bark-to-ground blend whatever trunkK says: a path that
          // slows before it lands lets trunkK go, and the body must not start back toward its seat in the crown, nor be
          // drawn clambering there, for its last frames in the tree.)
          const k = Math.max(smoothstep(0, 1, a.trunkK), low);
          x += (px - x) * k; z += (pz - z) * k; y += (py - y) * k;
          if (a.onTrunk || low > 0) { fx = px; fy = py; fz = pz; }   // (bound for the bark)
          if (k > 0.5) { a.onBranch = false; a.climbTree = tree.id; a.heading = dampAngle(a.heading, Math.atan2(-dx, -dz), 8, curDt); }
        }
        // Perched animals face roughly outward along their branch.
        // (W6: in the decision beat it turns on its branch toward what it chose, so the head can reach it.)
        // (W9: paired or lying on a bough it faces its partner, or along the bough: seatFace, set by layoutCrowns.)
        else if (!climbAct && a.speed < 0.3 * a.morph.size) {
          const turned = a.way === Way.soon && a.beat.phase >= Phase.look && beatGoal(a, Gaze.goal);
          // (W9: building a nest it turns a step at a time, pulling branches in from all round; it settles as it lies
          // down. W11: that turn is in seatFace, set by layoutCrowns; the last term only serves a frame without one.)
          const turn = a.act === 'nest' ? nestTurn(a.nestK) : 0;
          a.heading = dampAngle(a.heading, turned ? Math.atan2(GOAL[0] - x, GOAL[2] - z) : Number.isFinite(a.seatFace) ? a.seatFace : perchYaw + (hash01(a.id, 45) - 0.5) * 1.2 + turn, 3, 1 / 30);
        }
      } else { a.seated = false; if (inNest) { x = a.nestX; y = a.nestY; z = a.nestZ; } }
      // Stage W11: however the place above came about (a seat, the nest, the blend with the trunk, the trunk itself),
      // the drawn body goes there no faster than a clamber, plus what its own drawn path moved in this frame
      // (perch.ts crownStep). The blend between a seat and the bark runs its course in half a second whatever the
      // distance: with a seat 4 m from the trunk that moved the body 0.6 to 0.8 m in a frame. Drawn at once, as the
      // seat is: a first frame in a tree, a relocation, the frame the forest window gives or takes the tree's limbs,
      // time-lapse, and a place further off than a crown is wide. A body that is at its place is exactly there.
      {
        const tr = a.track;
        let sx = 0, sy = 0, sz = 0;
        if (a.cFrame === frameNo - 1 && !tr.jumped && a.ownCut !== frameNo && curSimRate <= ABOUT_MAX_RATE) {
          const dx = x - a.cx, dy = y - a.cy, dz = z - a.cz, d = hyp2(hyp2(dx, dz), dy);
          if (d > 1e-6 && d <= CROWN_JUMP_M) {
            const k = crownStep(d, curDt, curSimRate, hyp2(hyp2(tr.x - a.qx, tr.z - a.qz), tr.y - a.qy));
            if (k < 1) { x = a.cx + dx * k; y = a.cy + dy * k; z = a.cz + dz * k; }
            sx = x - a.cx; sy = y - a.cy; sz = z - a.cz;
          }
        }
        a.cx = x; a.cy = y; a.cz = z; a.cFrame = frameNo; a.qx = tr.x; a.qy = tr.y; a.qz = tr.z;
        // How far the drawn body is from the place it is bound for (its seat or nest, or the bark while its path goes up
        // or down), not from wherever the blend between the two stands this frame: a body leaving a far seat for the
        // trunk clambers from its first frame, and is not drawn in the trunk's climbing cycle metres from the bark.
        const left = Number.isNaN(fx) ? 0 : hyp2(hyp2(fx - x, fz - z), fy - y);
        a.glide = left;
        // More than a metre to go: it clambers (chooseClip), turned along its line of travel and pitched with it.
        const was = a.clamber, step = hyp2(hyp2(sx, sz), sy);
        a.clamber = a.carry === 0 && c.alive && clambering(was, left, curSimRate);
        if (a.clamber) {
          a.clamberD += step;
          if (curDt > 0) a.clamberV = was ? damp(a.clamberV, step / curDt, 10, curDt) : step / curDt;
          if (step > 1e-4) {
            const yaw = Math.atan2(sx, sz), pitch = -clamp(Math.atan2(sy, hyp2(sx, sz)), -0.9, 0.9);
            a.clamberYaw = was ? dampAngle(a.clamberYaw, yaw, 8, curDt) : yaw; a.clamberPitch = was ? damp(a.clamberPitch, pitch, 6, curDt) : pitch;
          } else if (!was) { a.clamberYaw = a.heading; a.clamberPitch = 0; }
          a.heading = dampAngle(a.heading, a.clamberYaw, 8, curDt);
          a.onBranch = true;   // (no stick of its own under a body on the move)
        } else { a.clamberV = 0; a.clamberD = 0; }
        a.clamberK = a.clamber || a.clamberK > 1e-3 ? damp(a.clamberK, a.clamber ? 1 : 0, 8, curDt) : 0;
      }
      // Branch placement is render-only: a.x/a.z keep tracking the sim so speed estimates stay clean.
      bodyFrame(a, x, z, y, 0);
      if (a.clamberK > 0) { E.set(a.clamberPitch * a.clamberK, a.heading, 0, 'YXZ'); Q.setFromEuler(E); a.bodyQ[0] = Q.x; a.bodyQ[1] = Q.y; a.bodyQ[2] = Q.z; a.bodyQ[3] = Q.w; }
      return;
    }
    a.onTrunk = false; a.seated = false; a.clamber = false; a.clamberK = 0; a.clamberV = 0; a.clamberD = 0;
    if (a.trunkK > 0) a.trunkK = a.trunkK < 1e-3 ? 0 : damp(a.trunkK, 0, 8, curDt);
    const g = ctx.groundHeight(x, z);
    const clip = a.clip;
    // A receiver lying down to be groomed (stage W5) follows the slope as the other lying clips do: at the seated
    // clips' 0.4 a prone body stays near level and one end of it hangs in the air on a hillside.
    const lying = clip === 'groomee' && (a.role === GROOMEE.prone || a.role === GROOMEE.side);
    const align = clip === 'walk' || clip === 'gallop' || clip === 'sneak' || clip === 'stand' || clip === 'drink' || clip === 'hunt' || clip === 'charge' || clip === 'crouch' || clip === 'dead' || clip === 'sleep' || clip === 'rest' || lying || (clip === 'listen' && a.role !== Listen.tall) ? 0.85 : 0.4;
    if (!a.planted) a.drop *= 0.8;
    // (Stage W11: the last 0.3 m of the way down a trunk, and the first of the way up, are played here, with the height
    // the drawn path still has: h is 0 for every animal on the ground. Without it a body dropped that 0.3 m in the one
    // frame it changed from the tree's placement to the ground's, and rose it in one frame setting off.)
    bodyFrame(a, x, z, g + a.drop + h, align);
  }

  const motherQ = new Float32Array(4), motherP = new Float32Array(3);
  function placeCarried(a: Anim, dt: number) {
    const m = anims.get(a.carrierId);
    if (!m) return;
    const ms = m.morph.size;
    if (a.carry === 2) {
      boneWorld(m.fk, m.bodyQ, m.bx, m.by, m.bz, m.lift, B.spine, motherP, motherQ);
      // Offset along the spine and out of the back (−Z in the bone frame).
      V.set(0, 0.1 * ms, -0.1 * ms - 0.02 * a.morph.size);
      E.set(-Math.PI / 2, 0, 0);
    } else {
      boneWorld(m.fk, m.bodyQ, m.bx, m.by, m.bz, m.lift, B.chest, motherP, motherQ);
      V.set(0, -0.06 * ms, 0.12 * ms + 0.05 * a.morph.size);
      E.set(0, Math.PI, 0);
    }
    Q.set(motherQ[0], motherQ[1], motherQ[2], motherQ[3]);
    V.applyQuaternion(Q);
    Q.multiply(Q2.setFromEuler(E));
    const k = a.carryBlend;
    // A7: the rider hangs on a stiff spring off its mother's bone point, relative to her body origin, so it lags
    // her gait bounce by a few centimetres but not her travel.
    const gx = motherP[0] + V.x - m.bx, gy = motherP[1] + V.y - m.by, gz = motherP[2] + V.z - m.bz;
    if (k < 1 || Math.abs(a.rs[0].x - gx) > 0.4 || Math.abs(a.rs[1].x - gy) > 0.4) { a.rs[0].x = gx; a.rs[1].x = gy; a.rs[2].x = gz; a.rs[0].v = a.rs[1].v = a.rs[2].v = 0; }
    else { springStep(a.rs[0], gx, 0.04, dt); springStep(a.rs[1], gy, 0.06, dt); springStep(a.rs[2], gz, 0.04, dt); }
    const tx = m.bx + a.rs[0].x, ty = m.by + a.rs[1].x, tz = m.bz + a.rs[2].x;
    if (k < 1) {
      // Blend from the ground placement to the carried placement.
      const q0 = Q3.set(a.bodyQ[0], a.bodyQ[1], a.bodyQ[2], a.bodyQ[3]);
      q0.slerp(Q, k);
      a.bx += (tx - a.bx) * k; a.by += (ty - a.by) * k; a.bz += (tz - a.bz) * k;
      a.bodyQ[0] = q0.x; a.bodyQ[1] = q0.y; a.bodyQ[2] = q0.z; a.bodyQ[3] = q0.w;
    } else {
      a.bx = tx; a.by = ty; a.bz = tz;
      a.bodyQ[0] = Q.x; a.bodyQ[1] = Q.y; a.bodyQ[2] = Q.z; a.bodyQ[3] = Q.w;
    }
    a.x = a.bx; a.z = a.bz; a.heading = m.heading;
  }

  function finishAnim(a: Anim) {
    // Skin, head position, pick volume.
    writeSkin(a.fk, a.morph, a.bodyQ, a.bx, a.by, a.bz, a.lift, mats.data, a.slot * ROW_TEXELS * 4, a.out);
    boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, B.head, TP, TQ4);
    a.head.set(TP[0], TP[1] + 0.07 * a.morph.size * a.morph.headScale, TP[2]);
    boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, B.chest, TP, TQ4);
    const s = a.morph.size;
    a.top = Math.max(a.head.y, TP[1] + 0.2 * s);
    a.pick.position.set((TP[0] + a.head.x) * 0.5, (TP[1] + a.head.y) * 0.5 - 0.05 * s, (TP[2] + a.head.z) * 0.5);
    a.pick.scale.set(0.42 * s, 0.5 * s, 0.42 * s);
    a.pick.updateMatrix(); a.pick.updateMatrixWorld();
  }

  // Props (fruit, meat, branches) attached to hands/mouth.
  function emitProps(a: Anim) {
    const pose = a.out;
    const s = a.morph.size;
    const put = (bone: number, kind: number) => {
      boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, bone, TP, TQ4);
      Q.set(TQ4[0], TQ4[1], TQ4[2], TQ4[3]);
      V.set(0, -0.03 * s, -0.012 * s).applyQuaternion(Q);
      props.add(kind, TP[0] + V.x, TP[1] + V.y, TP[2] + V.z, Q, s);
    };
    if (pose.propR) put(B.fingR, pose.propR);
    if (pose.propL) put(B.fingL, pose.propL);
    if (a.chimp.carryingMeat > 0.05 && !pose.propR && a.clip !== 'sleep') put(B.fingR, PROP.meat);
    const stick = a.elevated > 0.5 && !a.onBranch && a.carry === 0 && a.clip !== 'climb' && a.clip !== 'clingTrunk' && a.clip !== 'sleep' && a.clip !== 'nestBuild';
    if (!stick && !(a.gm > 0.02)) return;
    // Stage W11: the branch prop is drawn as a limb of its tree: tapered, in the colour the tree's limbs read as (the
    // environment's, when it draws this tree), and joined to it. It was a level log of one thickness, near black
    // beside the mossy limbs, ending in the air at both ends.
    const tree = treeFor(a);
    if (!(tree && ctx.barkColor && ctx.barkColor(tree.id, BARK))) BARK.copy(BARK_FAR);
    if (stick) {
      // Under an animal in a tree with no drawn limbs: a branch from the bark out under it and 0.6 body lengths on,
      // thick end at the trunk (it was 2.2 body lengths of log centred near the animal, touching nothing).
      const yaw = tree ? Math.atan2(a.bx - tree.position[0], a.bz - tree.position[2]) : a.heading, y = a.by - 0.03 * s;
      const ux = Math.sin(yaw), uz = Math.cos(yaw);
      let from = 1.6 * s;
      if (tree) { trunkPoint(tree, y, T4b); from = Math.max(0.3 * s, hyp2(a.bx - T4b.x, a.bz - T4b.z) - T4b.w * 0.85); }
      // (0.06 body lengths thick under the animal, as the log was.)
      const len = from + 0.6 * s, r0 = 0.06 * s / (1 - (1 - LIMB_TIP) * from / len);
      props.limb(a.bx - ux * from, y, a.bz - uz * from, a.bx + ux * 0.6 * s, y, a.bz + uz * 0.6 * s, r0, BARK);
    }
    // Stage W9: the bough this animal hosts (a pair, a chain, or its own lying body), along its eased extent. Stage
    // W11: two tapered halves that fork at the host's seat, their tops level with it, and where the fork does not lie
    // in a limb the environment draws, a stem from the nearest such limb or from the bark (perch.ts boughStem).
    if (a.gm > 0.02) {
      const r = Math.min(a.gr, (a.lies ? BOUGH_R_LIE : BOUGH_R) * s), fy = a.gy - 0.8 * r, ux = Math.cos(a.gyaw), uz = -Math.sin(a.gyaw);
      const e0 = a.g0 - a.gm, e1 = a.g1 + a.gm, lift = (1 - LIMB_TIP) * r;
      props.limb(a.gx, fy, a.gz, a.gx + ux * e1, fy + lift, a.gz + uz * e1, r, BARK);
      props.limb(a.gx, fy, a.gz, a.gx + ux * e0, fy + lift, a.gz + uz * e0, r, BARK);
      if (tree) {
        const limb = !!ctx.limbNear && ctx.limbNear(tree.id, a.gx, fy, a.gz, T4);
        trunkPoint(tree, fy, T4b);
        a.gJoin = boughStem(a.gx, fy, a.gz, r, limb, T4.x, T4.y, T4.z, T4.w, T4b.x, T4b.z, T4b.w, STEM);
        // (The stem grows in with the bough: its base radius follows the eased end margin.)
        if (a.gJoin !== 0) props.limb(STEM[0], STEM[1], STEM[2], a.gx, fy, a.gz, STEM[3] * Math.min(1, a.gm / (BOUGH_MARGIN * s)), BARK);
      } else a.gJoin = -1;
    }
  }
  const BARK = new THREE.Color(), BARK_FAR = new THREE.Color('#5f6442'), STEM = new Float64Array(4);

  const actorIds = new Set<number>(), placedIds = new Set<number>();
  const order: Anim[] = [];
  let lastElapsed = 0;
  let curSimRate = 60;
  let curDt = 1 / 60;
  let plantMinPx = 45;
  let closeK = 0;
  function update(frame: CreatureFrame) {
    curSimRate = frame.simRate;
    curDt = clamp(frame.dt, 0, 0.1);
    const q = frame.quality ?? 'high';
    plantMinPx = q === 'high' ? 45 : q === 'medium' ? 135 : 0;
    if (disposed) return;
    frameNo++;
    const dt = clamp(frame.dt, 0, 0.1);
    const animRate = clamp(Math.sqrt(Math.max(1, frame.simRate) / 60), 1, 3);
    const dtAnim = dt * animRate;
    animClock += dtAnim;
    const now = frame.elapsed;
    lastElapsed = now;
    stateClock += dt;
    syncRoster();
    const cam = frame.camera;
    cam.updateMatrixWorld();
    projView.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    const viewH = view.h || 800;
    frame.viewW = view.w; frame.viewH = view.h;
    mats.uniforms.uWet.value = damp(mats.uniforms.uWet.value, clamp(frame.rain * 1.25, 0, 1), 0.6, dt);
    mats.uniforms.uTime.value = now;
    // Creature lighting aids: stronger in close views and by day, never zero so night silhouettes read.
    const day = clamp(frame.daylight, 0, 1);
    closeK = damp(closeK, frame.closeView ? 1 : 0, 3, dt);
    // B8: halved (fill, exposure lift) and neutral; the hair highlight now carries form in shade.
    const fill = (0.35 + 1.0 * day) * (0.65 + 0.35 * closeK) * 0.5;
    mats.uniforms.uFill.value.setRGB(1.0 * fill, 0.97 * fill, 0.92 * fill);
    const rim = (0.02 + 0.05 * day) * (0.6 + 0.4 * closeK);
    mats.uniforms.uRim.value.setRGB(0.95 * rim, 0.94 * rim, 0.92 * rim);
    mats.uniforms.uExposure.value = 1.075 + 0.075 * closeK;

    const a0 = perfNow();
    // Pairings from actions and targets.
    for (const p of pairings) pairPool.push(p);
    pairings.length = 0; receiver.clear();
    interpolateAll(frame.subTick ?? 0, dt);
    // Stage W6: which act each drawn body is in, read once a frame (drawn.ts); pairings, poses and tags all use it.
    for (const a of animList) {
      readDrawn(a.acts, playback.renderT - a.late, bodyOf(a), curSimRate, DRAWN);
      // A body that has set off for an act it has not reached (walking, climbing, paused on the way) is in no act: it
      // is on the move, as after a change of mind (drawn.ts pushAct). Kept in the act before, an animal that left its
      // nest to feed 20 m away was drawn climbing its nest tree's trunk, and jumped to the feeding tree at the top.
      const onWay = DRAWN.way >= Way.going;
      a.act = onWay ? 'travel' : DRAWN.action; a.actTarget = onWay ? -1 : DRAWN.targetId;
      // "Walking to" is said of a body drawn in a walk; one that runs up to its partner is "going to".
      a.way = DRAWN.way === Way.walking && a.fastGait ? Way.going : DRAWN.way;
      // Stage W11: a body clambering to a seat on another animal's bough for a stationary act (it joins a partner) has set
      // off and is not there yet. Its TAG says so ("going to groom", stage W6's words: tagWay); the body's own reading
      // (a.way) is left alone, since poses and the nest's progress are worked out from it. (seatHost: last frame's.)
      a.tagWay = a.clamber && a.way === Way.none && a.carry === 0 && a.seatHost >= 0 && a.seatHost !== a.id && BODY_SIGN[a.chimp.action] === 'stay' ? Way.going : a.way;
    }
    for (const a of animList) { a.paired = false; a.pairClip = null; a.partnerId = -1; a.headingTarget = null; a.holds = false; a.holdsBack = false; a.nursed = false; a.bears = 0; a.tx = a.deadDrop ? a.dropX : a.track.x; a.tz = a.deadDrop ? a.dropZ : a.track.z; }
    // (W9: where the infant is on its carrier, and whether it is suckling by the act its drawn body is in. W8: what
    // rides on the carrier this frame, bit 1 on the belly and bit 2 on the back, for the belly and the coat under it.)
    for (const a of animList) if (a.carry !== 0 && a.carrierId >= 0) { const m = anims.get(a.carrierId); if (m) { m.holds = true; m.bears |= a.carry; if (a.carry === 2) m.holdsBack = true; if (a.chimp.alive && a.act === 'nurse') m.nursed = true; } }
    for (const a of animList) pairingFor(a);
    // Each animal is positioned by one pairing only: its own (as actor) first, else the first that targets it.
    actorIds.clear();
    for (const p of pairings) actorIds.add(p.a.id);
    // A receiver that is the actor of a pairing of its own (it begs, shares or plays while it is groomed) keeps the
    // plain seated posture (stage W5): its role is rewritten by its own pairing every frame, so any other posture
    // was dropped and started again about three times a second without ever being reached.
    for (const p of pairings) if (p.clipB === 'groomee' && p.roleB !== GROOMEE.sit && actorIds.has(p.b.id)) p.roleB = GROOMEE.sit;
    placedIds.clear();
    contactPairs.clear();
    // Stage W9: who sits in a crown this frame (not on its trunk, not in a nest, not carried): by the drawn height.
    SP.n = 0;
    // (Second reading of stage W11: nor one whose drawn path has begun to go up or down in this frame, perch.ts
    // trunkBound: placeGrounded puts it on its trunk later in the frame, and for that one frame it was still seated.)
    for (const a of animList) { const c = a.chimp; a.up = a.carry === 0 && c.alive && a.track.y > 0.3 && a.act !== 'climb' && a.act !== 'nest' && c.action !== 'climb' && c.action !== 'dead' && !a.onTrunk && !trunkBound(Math.abs(a.track.vy) / 3600, false, PATH_MOVING_MPS); }
    for (const p of pairings) {
      const a = p.a, b = p.b;
      a.paired = true; a.partnerId = b.id; a.role = p.roleA; a.pairClip = p.clipA;
      if (p.clipB) { b.paired = true; b.partnerId = a.id; }
      else if (b.partnerId < 0) b.partnerId = a.id;
      if (p.sep < 0.3) contactPairs.add(a.id < b.id ? a.id * 100003 + b.id : b.id * 100003 + a.id);
      if (p.kind === 'lap') continue; // the infant is on her body: nothing to lay out
      const placeB = !!p.clipB && !actorIds.has(b.id) && !placedIds.has(b.id);
      if (placedIds.has(a.id)) continue;
      placedIds.add(a.id);
      if (placeB) placedIds.add(b.id);
      // Stage W9: both in the crown of one tree: the pair is seated on one bough by layoutCrowns (the ground layout
      // below moves target points on the ground, where an animal in a crown is not drawn).
      const crown = a.up && b.up && SP.n < SP.a.length ? treeFor(a) : null;
      if (crown && crown === treeFor(b)) {
        p.tree = true; p.placeB = placeB;
        SP.a[SP.n] = a.slot; SP.b[SP.n] = b.slot; SP.sep[SP.n] = p.sep * (a.morph.size + b.morph.size); SP.n++;
        slotAnim[a.slot] = a; slotAnim[b.slot] = b;
        continue;
      }
      const ax = a.track.x, az = a.track.z, bx = b.track.x, bz = b.track.z;
      let dx = bx - ax, dz = bz - az;
      let d = hyp2(dx, dz);
      if (d < 1e-3) { const h = a.heading; dx = Math.sin(h); dz = Math.cos(h); d = 1; }
      dx /= d; dz /= d;
      const sep = p.sep * (a.morph.size + b.morph.size);
      if (d < 2.6 || p.clipB) {
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const wa = b.morph.size / (a.morph.size + b.morph.size);
        if (placeB) { a.tx = mx - dx * sep * wa; a.tz = mz - dz * sep * wa; b.tx = mx + dx * sep * (1 - wa); b.tz = mz + dz * sep * (1 - wa); }
        else { a.tx = bx - dx * sep; a.tz = bz - dz * sep; }
        const face = Math.atan2(dx, dz);
        a.headingTarget = face;
        if (placeB) b.headingTarget = face + p.bHeading;
      }
    }
    layoutCrowns(dt);
    separate();
    // Border patrols: leg and file position per animal (creatures/patrol.ts).
    phasedParties(world.parties, patrolParties);
    for (const a of animList) resolvePatrol(a);
    for (const a of animList) {
      const c = a.chimp;
      // A patrol's release: drumming callers and displayers whose sim position has stopped reach for a buttress.
      const rel = c.alive && releasing(a);
      const drummer = c.alive && c.vocal === 'drum' && a.elevated < 0.5 && (c.action === 'call' || (rel && c.action === 'display' && hyp2(a.track.vx, a.track.vz) * pbRate < 0.1 * a.morph.size));
      a.drumTree = drummer ? drumTree(a, rel ? RELEASE_DRUM_REACH * a.morph.size : 0) : -1;
      // W6: while its body is at the water, and over the last metres of its walk there, so it arrives at the waterline
      // instead of sliding to it afterwards (drinkSpot does nothing until the drawn body is within reach of the edge).
      if (a.chimp.alive && (a.act === 'drink' || (a.chimp.action === 'drink' && a.way >= Way.going)) && a.carry === 0 && a.elevated < 0.5) drinkSpot(a);
    }
    // Look targets for everyone with a chimp target (not only pairs). W6: the target of the act the body is in; the
    // target of an act it has not begun is looked at in the decision beat (updateAttention).
    for (const a of animList) if (a.partnerId < 0 && a.actTarget >= 0 && anims.has(a.actTarget) && a.actTarget !== a.id) {
      const b = anims.get(a.actTarget)!;
      if (hyp2(b.x - a.x, b.z - a.z) < 14) a.partnerId = b.id;
    }

    // Carry state.
    for (const a of animList) {
      const mode = carryMode(a);
      if (mode !== 0) { a.carry = mode; a.carryBlend = Math.min(1, a.carryBlend + dt / 0.4); }
      else { a.carryBlend = Math.max(0, a.carryBlend - dt / 0.4); if (a.carryBlend <= 0) { a.carry = 0; a.carrierId = -1; } }
    }

    // Motion, LOD, pose, placement for non-carried animals; carried infants afterwards.
    // Receivers of a paired interaction are posed before their actors (A10), so an actor's hands can target the
    // receiver's bones as posed this frame; carried infants come after their mothers.
    order.length = 0;
    for (const a of animList) if (a.carry === 0 && receiver.has(a.id)) order.push(a);
    for (const a of animList) if (a.carry === 0 && !receiver.has(a.id)) order.push(a);
    for (const a of animList) if (a.carry !== 0) order.push(a);
    {
      for (const a of order) {
        const carried = a.carry !== 0;
        const c = a.chimp;
        if (now - a.appearanceAt > 2 || a.appearanceAt < 0) { updateAppearance(a); a.appearanceAt = now; }
        if (stateClock >= a.stateAt) readState(a);   // stage W8: the body's state, about once a second per animal
        if (!carried || a.carryBlend < 1) updateMotion(a, dt);
        // Dead: keep about one ecological day, then dither out.
        if (!c.alive || c.action === 'dead') {
          const since = c.deathTime != null ? world.time - c.deathTime : (a.deadAt == null ? (a.deadAt = world.time, 0) : world.time - a.deadAt);
          // Stage ED (deadBody 1): drawn for as long as the simulation says the body exists; bones are drawn by remains.ts.
          if (c.remains !== undefined) a.fade = c.remains === 'body' ? 0 : damp(a.fade, 1, 0.8, dt);
          // A carried body stays visible; once put down it fades over a few seconds where it lies.
          else if (a.carry !== 0 && a.deadCarried) a.fade = 0;
          else if (a.deadDrop) a.fade = damp(a.fade, smoothstep(DEAD_VISIBLE_HOURS - 4, DEAD_VISIBLE_HOURS, since), 0.8, dt);
          else a.fade = smoothstep(DEAD_VISIBLE_HOURS - 4, DEAD_VISIBLE_HOURS, since);
        } else { a.fade = 0; a.deadAt = null; }
        const dimTarget = frame.highlightTroopId != null && c.troopId !== frame.highlightTroopId ? 0.75 : 0;
        a.dim = damp(a.dim, dimTarget, 5, dt);
        a.troopColor = troopColor.get(c.troopId) ?? '#cccccc';
        // Visibility + LOD from projected size.
        const s = a.morph.size;
        const vx = a.lastSkinFrame >= 0 ? a.bx : a.x, vz = a.lastSkinFrame >= 0 ? a.bz : a.z;
        sphere.center.set(vx, (a.by || ctx.groundHeight(vx, vz)) + 0.5 * s, vz); sphere.radius = 1.2 * s;
        a.visible = a.fade < 0.999 && frustum.intersectsSphere(sphere);
        a.px = pixelSize(cam, viewH, s, sphere.center.x, sphere.center.y, sphere.center.z);
        // Contacts are planted on LOD0 + LOD1 ('high') or LOD0 ('medium'), evaluated every frame while planted.
        const plant = !carried && a.visible && c.alive && a.elevated < 0.5 && plantMinPx > 0 && a.px > plantMinPx;
        // Pose rate: every frame up close, ≥ 20 Hz for moving animals (A14), 12 Hz for small still ones.
        const interval = !a.visible ? 0.25 : plant || a.px > 60 ? 0 : a.px > 25 ? 1 / 30 : a.moving && a.lapse < 0.5 ? 1 / 20 : 1 / 12;
        a.poseAccum += dt;
        const needPose = a.poseAccum >= interval || a.clip === '' || a.lastSkinFrame < 0;
        // The body frame comes first: contact planting converts between world and body space.
        // (Second reading of stage W11: a carried body does not clamber. placeGrounded, which alone ends the clamber,
        // is not asked for it: an infant picked up on its way to a seat kept the flag for as long as it was carried.)
        if (carried) { a.clamber = false; a.clamberK = 0; placeCarried(a, dt); }
        else placeGrounded(a);
        if (needPose) {
          const acc = Math.max(dt, a.poseAccum);
          evaluatePose(a, Math.max(dtAnim, acc * animRate), acc, cam, plant);
          // First evaluation: stagger by slot so animals sharing a pose rate do not all evaluate on one frame.
          a.poseAccum = a.lastSkinFrame < 0 ? -hash01(a.slot, 77) * 0.08 : 0;
        }
        if (a.visible || needPose) { finishAnim(a); a.lastSkinFrame = frameNo; }
        // Wading (C7): an animal moving through the channel rings the water about three times a second.
        if (ctx.ripple && a.visible && a.moving && !carried && a.elevated < 0.5 && ctx.groundHeight(a.x, a.z) < 0.3 && Math.floor(animClock * 3 + a.id * 0.37) !== Math.floor((animClock - dtAnim) * 3 + a.id * 0.37)) ctx.ripple(a.x, a.z, 0.8);
        writeParams(a, now);
      }
    }

    // Pack instances into LOD meshes. A level change draws both meshes for LOD_FADE seconds with complementary dithers
    // (G5 D7, after Unity's LOD cross-fade), so no switch pops.
    counts[0] = counts[1] = counts[2] = counts[3] = 0;
    props.begin();
    for (const a of animList) {
      if (!a.visible) continue;
      // Hysteresis (±10%) so animals near a threshold do not flicker between meshes.
      let lod = a.lod;
      const upH = 420, dnH = 380, up0 = 160, dn0 = 135, up1 = 55, dn1 = 45;
      if (lod === 3 && a.px < dnH) lod = 0;
      if (lod === 0) { if (a.px > upH && lods[3]) lod = 3; else if (a.px < dn0) lod = 1; }
      if (lod === 1) { if (a.px > up0) lod = 0; else if (a.px < dn1) lod = 2; }
      if (lod === 2 && a.px > up1) lod = a.px > up0 ? 0 : 1;
      if (lod === 3 && !lods[3]) lod = 0;
      while (!lods[lod]) lod++;
      if (lod !== a.lod) { a.lodFrom = a.lod; a.lodT = debug.lodFade ? 0 : LOD_FADE; debug.lodSwitches++; if (lods[a.lodFrom]) debug.lodBlends++; }
      a.lod = lod;
      a.lodT += dt;
      const blend = a.lodT < LOD_FADE && a.lodFrom !== lod && !!lods[a.lodFrom];
      const k = blend ? 1 - a.lodT / LOD_FADE : 0;
      (slotAttrs[lod].array as Float32Array)[counts[lod]] = a.slot;
      (fadeAttrs[lod].array as Float32Array)[counts[lod]++] = blend ? -Math.max(k, 1e-3) : 0;
      if (blend) {
        (slotAttrs[a.lodFrom].array as Float32Array)[counts[a.lodFrom]] = a.slot;
        (fadeAttrs[a.lodFrom].array as Float32Array)[counts[a.lodFrom]++] = Math.max(k, 1e-3);
      }
      if (a.px > 18) emitProps(a);
    }
    props.end();
    for (let l = 0; l < 4; l++) if (lods[l]) { lods[l].count = counts[l]; slotAttrs[l].needsUpdate = true; fadeAttrs[l].needsUpdate = true; }
    if (shellMesh && shellSlots && shellK && shellFade) {
      const n = !shellReady || frame.quality === 'low' ? 0 : frame.quality === 'medium' ? 1 : SHELLS;
      let k = 0;
      const ss = shellSlots.array as Float32Array, sk = shellK.array as Float32Array, sf = shellFade.array as Float32Array;
      // Fur shells ride on the fine and hero levels; while one of them fades in or out, so do its shells.
      if (n) for (const a of animList) {
        if (!a.visible || a.fade >= 0.01 || a.carry !== 0) continue;
        const furNow = a.lod === 0 || a.lod === 3, furFrom = a.lodFrom === 0 || a.lodFrom === 3;
        const blend = a.lodT < LOD_FADE && a.lodFrom !== a.lod && !!lods[a.lodFrom], kk = blend ? Math.max(1 - a.lodT / LOD_FADE, 1e-3) : 0;
        const f = furNow ? (blend && !furFrom ? -kk : 0) : blend && furFrom ? kk : NaN;
        if (Number.isNaN(f)) continue;
        for (let j = 1; j <= n; j++) { ss[k] = a.slot; sk[k] = j / n; sf[k] = f; k++; }
      }
      shellMesh.count = k; shellSlots.needsUpdate = true; shellK.needsUpdate = true; shellFade.needsUpdate = true;
    }
    let sc = 0;
    for (const a of animList) if ((a.visible || a.px > 4) && a.fade < 0.999) (shadowSlots.array as Float32Array)[sc++] = a.slot;
    shadowProxy.count = sc; shadowSlots.needsUpdate = true;
    // RTS: every animal; close view: only the focal animal and its partner, as a fallback when foliage covers them.
    // Close view: the env cutaway handles foliage; the focal animal keeps a thin gold "seen-through"
    // outline with a faint fill behind anything else (logs, nests, other animals).
    xrayStrength = damp(xrayStrength, frame.closeView ? 0.85 : 0.92, 4, dt);
    xray.uniforms.uOpacity.value = xrayStrength;
    xray.uniforms.uBias.value = frame.closeView ? 1.2 : 0.9;
    xray.uniforms.uFillK.value = frame.closeView ? 0.14 : 1;
    if (frame.lens) xray.uniforms.uLens.value.copy(frame.lens); else xray.uniforms.uLens.value.w = 0;
    xray.uniforms.uLensAspect.value = frame.aspect ?? 1.6;
    if (frame.closeView) xray.uniforms.uLine.value.copy(GOLD_LINE); else xray.uniforms.uLine.value.setRGB(0.015, 0.02, 0.018);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    xray.uniforms.uViewport.value.set((view.w || 1440) * dpr, viewH * dpr);
    let xc = 0;
    const focal = frame.selectedId != null ? anims.get(frame.selectedId) : undefined;
    if (xrayStrength > 0.02) for (const a of animList) {
      if (!a.visible || a.fade > 0.5 || a.carry !== 0) continue;
      if (frame.closeView && a !== focal) continue;
      (xraySlots.array as Float32Array)[xc] = a.slot;
      vividColor(a.troopColor, tintColor);
      const hl = frame.highlightTroopId;
      const k = hl != null && a.chimp.troopId !== hl ? 0.3 : 1;
      const tint = xrayTint.array as Float32Array;
      tint[xc * 3] = tintColor.r * k; tint[xc * 3 + 1] = tintColor.g * k; tint[xc * 3 + 2] = tintColor.b * k;
      xc++;
    }
    xrayMesh.count = xrayOutline.count = xc; xraySlots.needsUpdate = true; xrayTint.needsUpdate = true;
    mats.texture.needsUpdate = true;

    perfEnd('anim', a0);
    // Overlays.
    const o0 = perfNow();
    nests.update(world, frame, dt);
    remains.update(world, frame);
    prey.update(world, frame, dt, animClock);
    social.update(frame, animList, anims, dt);
    fx.update(frame, world, anims, dt);
    selection.update(frame, anims, world, dt);
    perfEnd('overlays', o0);
    const l0 = perfNow();
    labels.update(frame, animList, anims, world, cam, social.parties, social.pulse, wayOf);
    perfEnd('labels', l0);
  }

  function getPosition(id: number, out: THREE.Vector3) {
    const a = anims.get(id);
    if (!a) return false;
    out.set(a.bx, a.by, a.bz);
    return true;
  }
  function getScale(id: number) { return anims.get(id)?.morph.size ?? 1; }
  // Stage W4: which act the drawn body is in (creatures/drawn.ts). One scratch record and one body reading for the
  // name tags; the interface passes its own record. Nothing is allocated per call and nothing is written to the World.
  const DRAWN: DrawnAct = { action: 'rest', targetId: -1, about: false, way: 0 };
  const BODY: BodyState = { moving: false, climbing: false, gap: 0, shuffling: false, passive: false };
  // This world's walking speed, for telling a feeding shuffle from a walk to a place (read once, as jump2 above: the
  // layer is rebuilt when a simulation is swapped in).
  const walkMps = paramsOf(world).walkMps;
  /** What the drawn body is doing: walking, going up or down, how far its path still is from the animal's place, and
   * whether only a shuffle is left for it to play (drawn.ts readBody). */
  function bodyOf(a: Anim): BodyState {
    const c = a.chimp;
    return readBody(BODY, a.track, c.position[0], Math.max(0, c.position[1] ?? 0), c.position[2], a.moving, a.carry !== 0 || !c.alive, walkMps);
  }
  // Stage W6: the reading is taken once a frame in update() (the poses use it too); the tags and the interface get that
  // same reading, so a tag and its body change at the same moment.
  function drawnAct(id: number, out: DrawnAct): boolean {
    const a = anims.get(id);
    if (!a) return false;
    out.action = a.act; out.targetId = a.actTarget; out.way = a.tagWay; out.about = a.tagWay !== Way.none;
    return true;
  }
  const wayOf = (a: Anim): number => a.tagWay;
  // --- Portrait (creatures/portrait.ts): one instance of the finest body mesh loaded so far, on its own layer and
  // outside the creature group (which hides in the field overview). A wrapper geometry shares the LOD's vertex
  // buffers (never disposed here: they belong to the LOD) and adds a one-instance slot, so the body material's
  // program and textures serve it unchanged. The hero mesh (LOD 3) is finer than a 176 px picture needs.
  const portraitSlot = new THREE.InstancedBufferAttribute(new Float32Array(1), 1).setUsage(THREE.DynamicDrawUsage);
  const portraitFade = new THREE.InstancedBufferAttribute(new Float32Array(1), 1);
  let portraitMesh: THREE.InstancedMesh | null = null, portraitLevel = -1;
  const portraitQ = new THREE.Quaternion();
  function portrait(id: number, out: PortraitSubject): boolean {
    const a = anims.get(id);
    if (disposed || !a || a.lastSkinFrame < 0 || a.fade > 0.5) return false;
    const level = lods[0] ? 0 : lods[1] ? 1 : 2;
    if (level !== portraitLevel) {
      const src = lods[level].geometry, g = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'aSkinIndex', 'aSkinWeight', 'aRegA', 'aRegB', 'aRegC']) { const at = src.getAttribute(name); if (at) g.setAttribute(name, at); }
      g.setIndex(src.getIndex());
      g.setAttribute('aSlot', portraitSlot); g.setAttribute('aLodFade', portraitFade);
      if (portraitMesh) portraitMesh.geometry = g;
      else {
        portraitMesh = new THREE.InstancedMesh(g, mats.material, 1);
        portraitMesh.castShadow = false; portraitMesh.receiveShadow = true; portraitMesh.frustumCulled = false;
        portraitMesh.name = 'chimp-portrait';
        portraitMesh.layers.set(PORTRAIT_LAYER);
        scene.add(portraitMesh);
      }
      portraitLevel = level;
    }
    (portraitSlot.array as Float32Array)[0] = a.slot; portraitSlot.needsUpdate = true;
    // Stage W8: the picture is taken from an arm's length, whatever the main camera's distance, so the coat is drawn
    // at its own height in it, without the gain an animal small on screen gets (seen in the review: a portrait asked
    // for from the strategy view showed a raised coat twice as high, the crown a pale dome). The picture is drawn
    // straight after this call, after the main frame; the row is written again on the next frame (writeParams).
    { const o = (a.slot * ROW_TEXELS + PARAM_TEXEL) * 4 + 8, near = coatNear(a); if (mats.data[o] !== near) { mats.data[o] = near; mats.texture.needsUpdate = true; } }
    // The head bone's frame (bind pose: +Z out of the face, +Y to the crown): the picture faces the face, head upright.
    boneWorld(a.fk, a.bodyQ, a.bx, a.by, a.bz, a.lift, B.head, TP, TQ4);
    portraitQ.set(TQ4[0], TQ4[1], TQ4[2], TQ4[3]);
    out.face.set(0, 0, 1).applyQuaternion(portraitQ); out.up.set(0, 1, 0).applyQuaternion(portraitQ);
    const s = a.morph.size, hs = s * a.morph.headScale;
    out.head.set(TP[0], TP[1], TP[2]).addScaledVector(out.up, 0.035 * hs).addScaledVector(out.face, 0.04 * hs);
    out.size = s;
    return true;
  }
  function keepClearCandidates(out: KeepCandidate[], camera: THREE.Camera): number {
    let n = 0;
    for (const a of animList) {
      if (n >= out.length) break;
      if (a.carry !== 0 || a.fade > 0.5 || a.lastSkinFrame < 0) continue;
      const s = a.morph.size, o = out[n++];
      o.id = a.id; o.x = a.bx; o.y = a.by + 0.5 * s; o.z = a.bz; o.r = 0.55 * s; o.host = -1;
      o.hostTree = a.climbTree >= 0 ? a.climbTree : a.drumTree >= 0 ? a.drumTree : a.elevated > 0.5 ? (treeFor(a)?.id ?? -1) : -1;
      V.set(o.x, o.y, o.z).project(camera);
      o.sx = V.x; o.sy = V.y; o.visible = a.visible && V.z < 1 && Math.abs(V.x) <= 1 && Math.abs(V.y) <= 1;
    }
    return n;
  }
  // Screen-space pick buffers (reused): body centre in CSS px, on-screen reach, and the chimp id per candidate.
  const pickX = new Float32Array(CAPACITY), pickY = new Float32Array(CAPACITY), pickR = new Float32Array(CAPACITY), pickId = new Int32Array(CAPACITY);
  function nearestAt(x: number, y: number, camera: THREE.Camera, radius: number, preferId: number): number {
    const w = view.w || 1440, h = view.h || 800;
    let n = 0, prefer = -1;
    for (const a of animList) {
      if (n >= CAPACITY) break;
      if (!a.visible || a.fade > 0.6 || a.lastSkinFrame < 0) continue;
      V.set(a.bx, a.by + 0.5 * a.morph.size, a.bz).project(camera);
      if (V.z > 1 || V.z < -1) continue;
      pickX[n] = (V.x * 0.5 + 0.5) * w; pickY[n] = (-V.y * 0.5 + 0.5) * h; pickR[n] = 0.6 * a.px; pickId[n] = a.id;
      if (a.id === preferId) prefer = n;
      n++;
    }
    const i = nearestOnScreen(n, pickX, pickY, pickR, x, y, radius, prefer);
    return i >= 0 ? pickId[i] : -1;
  }
  function bendSources(x: number, z: number, out: THREE.Vector4[]): number {
    let n = 0;
    for (const a of animList) {
      if (!a.visible || a.carry !== 0 || a.elevated > 0.5 || a.fade > 0.5) continue;
      const d2 = (a.bx - x) ** 2 + (a.bz - z) ** 2;
      if (d2 > 900) continue; // within 30 m of the near-field centre
      if (n < out.length) out[n++].set(a.bx, a.bz, 0.55 * a.morph.size, d2);
      else { let far = 0; for (let k = 1; k < n; k++) if (out[k].w > out[far].w) far = k; if (d2 < out[far].w) out[far].set(a.bx, a.bz, 0.55 * a.morph.size, d2); }
    }
    return n;
  }
  function dispose() {
    disposed = true;
    viewObserver.disconnect();
    window.clearTimeout(lodTimer);
    lodWorker?.terminate(); lodWorker = null;
    pendingLods = [];
    scene.remove(group);
    if (portraitMesh) { scene.remove(portraitMesh); portraitMesh.dispose(); portraitMesh = null; }
    for (const m of lods) if (m) { m.geometry.dispose(); m.dispose(); }
    loGeometry.dispose(); shadowGeo.dispose(); clipMat.dispose(); shadowProxy.dispose(); xrayGeo.dispose(); xrayFill.dispose(); xrayLine.dispose(); xrayMesh.dispose(); xrayOutline.dispose();
    mats.material.dispose(); mats.shell.dispose(); mats.depth.dispose(); mats.texture.dispose();
    if (shellMesh) { shellMesh.geometry.dispose(); shellMesh.dispose(); }
    pickGeometry.dispose(); pickMaterial.dispose();
    props.dispose(); selection.dispose(); social.dispose(); labels.dispose(); fx.dispose(); nests.dispose(); remains.dispose(); prey.dispose();
    picks.length = 0; anims.clear(); animList.length = 0;
    void lastElapsed;
  }
  return { picks, update, getPosition, getScale, bendSources, keepClearCandidates, portrait, labelAt: labels.hitTest, nearestAt, drawnAct, dispose, debug } as CreatureLayer & { debug: typeof debug };
}
