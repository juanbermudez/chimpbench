import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Interaction, InteractionKind, ViewMode, World } from '../../types';
import { axisSide, crossesLine, outsideDeadZone, pushOutOfTrunks, tooSimilar, trunkBlocks } from './camera-rules';
import { rtsDistanceFor } from './field';
import {
  CLOSE_FOV, ORBIT_MAX, ORBIT_MIN, ORBIT_NOTCH, RTS_DISTANCE, RTS_NOTCH, RTS_ZOOM_MAX, RTS_ZOOM_MIN, ZOOM_TAU,
  blendDuration, blendFrame, createThrough, distanceForFrame, easeInOut, frameHeightPersp, lensRadius, pitchForDistance,
  springStep, stepThrough, terrainLift, zoomBand, type ZoomBand,
} from './camera-zoom';
import { chaseArrived, chaseReset, chaseStep, createChase, jumpFor, nextFollow, userPanned, type FollowEvent } from './follow';
import { hyp2 } from '../fastmath';

// Three cameras behind one rig on one zoom axis (docs/graphics-camera-plan.md §2): the tilted orthographic strategy
// view, a perspective close view that follows the focused chimp on a speed-capped spring (or looks freely at a ground
// point), and a cinematic auto-director that reads world.interactions. The wheel drives critically damped zoom springs
// in both user views; pushing past the strategy view's closest zoom glides (a 0.7 s dolly-zoom blend) into the close
// view on the animal under the cursor, and pushing past the close view's farthest orbit glides back out. The close
// camera's pitch follows its distance (near eye level up close) with the user's own tilt kept as an offset, and it
// lifts over terrain between itself and the subject. View changes blend instead of cutting (cut with reduced motion).
// Shots are validated against crown volumes and terrain before they are used, and must keep the subject at least 8%
// of the frame height.

type Getter = (id: number, out: THREE.Vector3) => boolean;
type Shot = 'orbit' | 'dolly' | 'crane' | 'low' | 'establish';
export interface Insets { left: number; right: number; top: number; bottom: number; }

// Narrative weight of each interaction kind for the director.
const KIND_WEIGHT: Partial<Record<InteractionKind, number>> = {
  fight: 6, kill: 7, infanticide: 7, takeover: 7, coalition: 5, intergroup: 6, hunt: 6, charge: 4.5, chase: 4.5,
  display: 4, 'rain-display': 4.5, alarm: 4, mate: 3, consort: 3, guard: 3, share: 3.5, beg: 3, transfer: 3.5,
  reconcile: 3, console: 3, groom: 2.2, play: 2.6, nurse: 2.2, 'pant-grunt': 2.4, patrol: 3.5,
};
const ACTION_WEIGHT: Record<string, number> = {
  attack: 5, charge: 4, display: 4, hunt: 5, patrol: 3.5, call: 3, alarm: 3.5, mate: 3, share: 3, beg: 2.5,
  groom: 2, play: 2.4, nurse: 2, climb: 1.8, forage: 1.4, travel: 1.2, drink: 1.6, nest: 2, shelter: 1.8,
};
const MIN_FRAME_SHARE = 0.08;   // subject height / frame height
const FOLLOW_MAX_SPEED = 12;    // m/s the close camera may travel while tracking
const FOLLOW_CUT_DISTANCE = 22; // beyond this the close camera cuts instead of whipping across the map
const CLOSE_DEFAULT = 11;       // orbit distance (m) when entering the close view with a key
const OFFSET_MAX = 20 * Math.PI / 180;   // the user's tilt away from the pitch curve
const RTS_ELEVATION = Math.atan2(148, hyp2(113, 161));   // 37°: the strategy view's default pitch

export interface CameraRig {
  readonly camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  readonly mode: ViewMode;
  readonly target: THREE.Vector3;
  controls: OrbitControls<THREE.OrthographicCamera | THREE.PerspectiveCamera>;
  followId: number | null;
  /** Subject position for the close/cinematic cutaway, or null. */
  readonly subject: THREE.Vector3 | null;
  /** Camera subject ids (close follow; cinematic participants, up to 4) for the keep-clear list; subjectCount live. */
  readonly subjectIds: number[];
  readonly subjectCount: number;
  /** Trunk index (vegetation.trunkList / 4) of the primary subject's host tree, or −1; set by the scene each frame. */
  subjectHost: number;
  /** 0..1 brief exposure dip right after a cinematic cut. */
  readonly cutDip: number;
  /** Distance from the camera to the subject (m), for depth of field; 0 when there is none. */
  readonly focusDistance: number;
  /** Canopy lens (strategy view): centre in NDC, radius as a fraction of the frame height (0 = closed), strength,
   * and the focus height (m) above which crowns open. */
  readonly lens: { x: number; y: number; r: number; w: number; focusY: number };
  /** True while a view blend is running (the rendered camera is the blend camera). */
  readonly blending: boolean;
  /** Director and follow diagnostics (cuts with the rules they passed, occlusion re-framings, zoom-throughs). */
  readonly log: { cuts: { t: number; kind: string; interactionId: number; sameSubject: boolean; side: number; angle: number }[]; reframes: number; throughs: number };
  setView(mode: ViewMode, selectedId: number | null): void;
  /** Places the camera on the animal at once and follows it (setup, probes, entering the close view). */
  focusChimp(id: number): void;
  /**
   * Follows the animal in the strategy and close views: the focus glides to its rendered position on a critically
   * damped spring (follow.ts), then tracks it until the user pans, the camera is sent elsewhere or the view goes
   * cinematic. Zoom and orbit keep following. zoomIn: the strategy view also zooms in to at least the party framing.
   */
  follow(id: number, zoomIn?: boolean): void;
  /** True while the focus is still gliding to a newly followed animal. */
  readonly followGliding: boolean;
  panTo(x: number, z: number): void;
  reset(): void;
  resize(width: number, height: number): void;
  setInsets(insets: Insets): void;
  update(dt: number, elapsed: number, selectedId: number | null, simRate?: number): void;
  pixelWorld(): number;
  /** Frame height at the focus (m): the one zoom scale shared by fades, detail and the audio mix. */
  frameHeight(): number;
  /** Zoom state for C5b and the UI: frame height, band and the view the rig is in (it can change by zoom-through).
   * One object, rewritten per call. */
  zoom(): { hf: number; band: ZoomBand; view: ViewMode };
  shadowExtent(): number;
  /** Probe hooks: close-view orbit at distance d, elevation (rad, null = the pitch curve), azimuth (rad as
   * atan2(offset.z, offset.x), null = keep); snap skips the springs. */
  setOrbit(d: number, elevation: number | null, azimuth: number | null, snap?: boolean): void;
  /** Probe hook: strategy-view zoom now (no spring). */
  setZoomNow(zoom: number): void;
  /** Harness hook: a fixed close-view camera (free look) at c looking at l, any distance. */
  place(cx: number, cy: number, cz: number, lx: number, ly: number, lz: number): void;
  /** Field view (C5b): crown lobes and trunks of the current window (centred at ox, oz) for shot validation. */
  setObstacles(lobes: Float32Array, trunks: Float32Array, ox: number, oz: number): void;
  dispose(): void;
}

/** Crown lobes packed as (x, y, z, r, flatten); a coarse grid makes segment tests cheap. */
function createObstacles(lobes: Float32Array, height: (x: number, z: number) => number, ox = 0, oz = 0) {
  const CELL = 10, HALF = 240, N = Math.ceil(HALF * 2 / CELL);
  const cells: number[][] = Array.from({ length: N * N }, () => []);
  const count = lobes.length / 5;
  for (let i = 0; i < count; i++) {
    const x = lobes[i * 5] - ox, z = lobes[i * 5 + 2] - oz, r = lobes[i * 5 + 3];
    const x0 = Math.max(0, Math.floor((x - r + HALF) / CELL)), x1 = Math.min(N - 1, Math.floor((x + r + HALF) / CELL));
    const z0 = Math.max(0, Math.floor((z - r + HALF) / CELL)), z1 = Math.min(N - 1, Math.floor((z + r + HALF) / CELL));
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) cells[cz * N + cx].push(i);
  }
  /** 0 outside every crown; >0 how deep inside (1 = at a lobe centre). */
  function crownDepth(p: THREE.Vector3, shrink = 1): number {
    const cx = Math.floor((p.x - ox + HALF) / CELL), cz = Math.floor((p.z - oz + HALF) / CELL);
    if (cx < 0 || cz < 0 || cx >= N || cz >= N) return 0;
    let depth = 0;
    for (const i of cells[cz * N + cx]) {
      const r = lobes[i * 5 + 3] * shrink, f = lobes[i * 5 + 4];
      const dx = (p.x - lobes[i * 5]) / r, dy = (p.y - lobes[i * 5 + 1]) / (r * f), dz = (p.z - lobes[i * 5 + 2]) / r;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < 1) depth = Math.max(depth, 1 - d);
    }
    return depth;
  }
  const s = new THREE.Vector3();
  /** Fraction of a segment's samples inside crown cores, and whether terrain cuts it. */
  function segment(a: THREE.Vector3, b: THREE.Vector3, skipNear: THREE.Vector3, skipR: number): { crowns: number; ground: boolean } {
    const len = a.distanceTo(b);
    const steps = Math.max(4, Math.ceil(len / 0.8));
    let hits = 0, used = 0, ground = false;
    for (let k = 1; k < steps; k++) {
      s.lerpVectors(a, b, k / steps);
      if (s.y < height(s.x, s.z) + 0.25) ground = true;
      if (s.distanceTo(skipNear) < skipR) continue;
      used++;
      if (crownDepth(s, 0.8) > 0) hits++;
    }
    return { crowns: used ? hits / used : 0, ground };
  }
  return { crownDepth, segment };
}

/** Rig options: the map's extent (m). Above 1 km (the field profile, C5b) the strategy view zooms out to the whole map,
 * keeps its focus on the map and backs the orthographic camera off so km-scale frames stay inside its clip range. */
export interface RigOptions { mapSize?: number }

export function createCameraRig(dom: HTMLElement, world: World, height: (x: number, z: number) => number, getPosition: Getter, lobes: Float32Array, trunks: Float32Array = new Float32Array(0), opts: RigOptions = {}): CameraRig {
  const mapSize = opts.mapSize ?? world.size;
  const field = mapSize > 1000;
  const rts = new THREE.OrthographicCamera(-80, 80, 50, -50, 1, 1400);
  const close = new THREE.PerspectiveCamera(CLOSE_FOV, 1.6, 0.4, 9000);
  const cine = new THREE.PerspectiveCamera(36, 1.6, 0.4, 9000);
  // View blends render through their own perspective camera (a dolly zoom when the orthographic view is involved).
  const blendCam = new THREE.PerspectiveCamera(CLOSE_FOV, 1.6, 0.4, 9000);
  const cameras = [rts, close, cine, blendCam];
  let modeCam: THREE.OrthographicCamera | THREE.PerspectiveCamera = rts;
  let mode: ViewMode = 'rts';
  let obstacles = createObstacles(lobes, height);
  const controls = new OrbitControls<THREE.OrthographicCamera | THREE.PerspectiveCamera>(rts, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  // The rig's own wheel handler drives the zoom springs and the zoom-through; OrbitControls pans and rotates.
  controls.enableZoom = false;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  let followId: number | null = null;
  // Follow glide (follow.ts): the focus glides onto a newly followed animal, then rides its path (strategy view) or the
  // close view's tracking spring takes over. The chase starts at rest on each attach (glideReady false).
  let gliding = false, glideReady = false;
  const chase = createChase();
  // A drag that moves the focus detaches the follow; a click (under 6 px of travel) or a rotation does not.
  let dragging = false, dragPx = 0, panGrace = 0, downX = 0, downY = 0;
  function followEvent(e: FollowEvent) {
    const s = nextFollow({ id: followId, gliding }, e);
    if (s.id === followId && s.gliding === gliding) return;
    if (s.id !== followId) followReady = false;
    if (s.gliding && !gliding) glideReady = false;
    followId = s.id; gliding = s.gliding;
    configureControls();
  }
  // Orbit limits are per mode: the orthographic camera stays far back (zoom frames the view, or its near plane cuts
  // into the hills); the close camera's distance and pitch are set by the rig, so OrbitControls must not clamp them.
  function configureControls() {
    controls.enabled = mode !== 'cinematic';
    if (mode === 'rts') {
      controls.minDistance = 200; controls.maxDistance = field ? 1e6 : 420; controls.minPolarAngle = 0.17; controls.maxPolarAngle = Math.PI * 0.46;
      controls.enablePan = true; controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    } else if (mode === 'close') {
      controls.minDistance = 0.05; controls.maxDistance = 1e4; controls.minPolarAngle = 0.03; controls.maxPolarAngle = Math.PI / 2 - 0.02;
      // Free look (no animal followed): left-drag pans like the strategy view.
      controls.enablePan = followId === null; controls.mouseButtons.LEFT = followId === null ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    }
  }
  let widthPx = 1440, heightPx = 900;
  const insets: Insets = { left: 0, right: 0, top: 0, bottom: 0 };
  const pos = new THREE.Vector3();
  const shift = new THREE.Vector3();
  const off = new THREE.Vector3();
  const subject = new THREE.Vector3();
  let hasSubject = false;
  const subjectIds = [-1, -1, -1, -1];
  let subjectCount = 0, subjectHost = -1;
  let cutDip = 0;
  // Close-follow spring state.
  const followPoint = new THREE.Vector3();
  const followGoal = new THREE.Vector3();
  const followVel = new THREE.Vector3();
  let followReady = false;
  let lastRetarget = -99;
  // Look-ahead: the subject's smoothed ground velocity; host-trunk occlusion timer and a pending orbit.
  const subjVel = new THREE.Vector3(), lastDesired = new THREE.Vector3();
  let hasLastDesired = false, blockedFor = 0, orbitLeft = 0;
  const log: CameraRig['log'] = { cuts: [], reframes: 0, throughs: 0 };
  const PUSH = [0, 0];
  const reduceMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // --- Zoom axis state (camera-zoom.ts): springs on log zoom / log distance, the pitch offset, the terrain lift.
  const rtsZoom = new Float64Array([Math.log(1.04), 0]);
  let rtsZoomTarget = 1.04, rtsZoomSet = 1.04;
  const orbit = new Float64Array([Math.log(CLOSE_DEFAULT), 0]);
  let orbitTarget = CLOSE_DEFAULT, orbitMin = ORBIT_MIN;
  let userOffset = 0, lift = 0, eSet = NaN, lastD = CLOSE_DEFAULT;
  /** Placed exactly by a harness or script: no pitch-curve clamp or terrain lift until the user zooms. */
  let exact = false;
  let rtsElevation = RTS_ELEVATION, rtsAzimuth = Math.atan2(113, 161);
  const throughIn = createThrough(), throughOut = createThrough();
  const pointer = { x: 0, y: 0 };
  const lens = { x: 0, y: 0, r: 0, w: 0, focusY: 0 };
  const clampN = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
  const rtsFrame = (zoom: number) => (rts.top - rts.bottom) / zoom;
  // Field profile: zoomed out, the frame spans ~92% of the map; the camera backs off with the frame (rtsDistanceFor).
  const zoomMin = () => field ? rtsFrame(1) / (mapSize * 0.92) : RTS_ZOOM_MIN;
  const rtsDist = () => field ? rtsDistanceFor(rtsFrame(rts.zoom)) : RTS_DISTANCE;

  /** Places the RTS camera on its orbit around controls.target at (azimuth, elevation). */
  function placeRts(az: number, el: number) {
    const c = Math.cos(el);
    const D = rtsDist();
    rts.position.set(controls.target.x + Math.sin(az) * c * D, controls.target.y + Math.sin(el) * D, controls.target.z + Math.cos(az) * c * D);
    rts.lookAt(controls.target);
  }
  /** Places the close camera on its orbit around controls.target. */
  function placeClose(az: number, el: number, d: number) {
    const c = Math.cos(el);
    close.position.set(controls.target.x + Math.sin(az) * c * d, controls.target.y + Math.sin(el) * d, controls.target.z + Math.cos(az) * c * d);
    close.lookAt(controls.target);
    eSet = el; lastD = d;
  }
  /** Azimuth (OrbitControls convention: offset = (sin, ·, cos)) and elevation of a camera around a focus. */
  function azimuthOf(cam: THREE.Camera, focus: THREE.Vector3): number {
    off.subVectors(cam.position, focus);
    if (Math.abs(off.x) + Math.abs(off.z) < 1e-6) { cam.getWorldDirection(off); return Math.atan2(-off.x, -off.z); }
    return Math.atan2(off.x, off.z);
  }
  function elevationOf(cam: THREE.Camera, focus: THREE.Vector3): number { off.subVectors(cam.position, focus); return Math.asin(clampN(off.y / Math.max(off.length(), 1e-6), -1, 1)); }
  function setZoomNow(z: number) {
    rtsZoomTarget = clampN(z, zoomMin(), RTS_ZOOM_MAX);
    rtsZoom[0] = Math.log(rtsZoomTarget); rtsZoom[1] = 0;
    rts.zoom = rtsZoomSet = rtsZoomTarget;
    rts.updateProjectionMatrix();
  }

  function reset() {
    followEvent({ type: 'reset' });
    if (mode === 'rts') {
      controls.target.set(0, 4, 0);
      rtsAzimuth = Math.atan2(113, 161); rtsElevation = RTS_ELEVATION;
      // Field profile: the whole map (the overview), so all three communities' ranges are in view.
      if (field) setZoomNow(zoomMin() * 1.05);
      placeRts(rtsAzimuth, rtsElevation);
      if (!field) setZoomNow(1.04);
    } else if (mode === 'close') {
      const chimp = world.chimps.find(c => c.alive) ?? world.chimps[0];
      if (chimp) focusChimp(chimp.id);
    }
    configureControls();
    controls.update();
  }

  function focusChimp(id: number) {
    const chimp = world.chimps.find(c => c.id === id);
    if (!getPosition(id, pos)) {
      if (!chimp) return;
      pos.set(chimp.position[0], height(chimp.position[0], chimp.position[2]) + Math.max(0, chimp.position[1]), chimp.position[2]);
    }
    if (mode === 'close') {
      const az = azimuthOf(close, controls.target);
      controls.target.set(pos.x, pos.y + 1.1, pos.z);
      exact = false; orbitMin = ORBIT_MIN;
      orbitTarget = clampN(orbitTarget, ORBIT_MIN, ORBIT_MAX);
      orbit[0] = Math.log(orbitTarget); orbit[1] = 0;
      placeClose(az, clampN(pitchForDistance(orbitTarget) + userOffset, 0.03, 1.5), orbitTarget);
      followId = id; gliding = false;
      followPoint.copy(controls.target);
      followVel.set(0, 0, 0);
      followReady = true;
      configureControls();
    } else if (mode === 'rts') {
      panTo(pos.x, pos.z);
      rtsZoomTarget = Math.max(2.2, rtsZoomTarget);
      // Placed on the animal already: track it from here (no glide).
      followId = id; gliding = false; glideReady = false;
      configureControls();
    }
    controls.update();
  }

  function follow(id: number, zoomIn = false) {
    if (mode === 'cinematic' || !world.chimps.some(c => c.id === id)) return;
    followEvent({ type: 'attach', id });
    // A new attach ignores the tail of an earlier drag (the controls' damping can still carry it for a moment).
    panGrace = 0; dragPx = 0;
    if (zoomIn && mode === 'rts') rtsZoomTarget = Math.max(2.2, rtsZoomTarget);
  }

  function panTo(x: number, z: number) {
    followEvent({ type: 'pan-to' });
    pos.set(x, height(x, z) + 2, z);
    shift.copy(pos).sub(controls.target);
    modeCam.position.add(shift);
    controls.target.copy(pos);
    controls.update();
  }

  // Panels cover parts of the canvas: shift the projection so the view centre (and thus focus) sits
  // in the middle of the unobstructed area. Raycasting uses the same projection, so picking stays exact.
  function applyInsets() {
    const ox = (insets.right - insets.left) / 2, oy = (insets.bottom - insets.top) / 2;
    for (const cam of cameras) {
      if (Math.abs(ox) < 0.5 && Math.abs(oy) < 0.5) cam.clearViewOffset();
      else cam.setViewOffset(widthPx, heightPx, ox, oy, widthPx, heightPx);
      cam.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------------
  // Close follow: a critically damped spring with a speed cap; big jumps cut.
  // ---------------------------------------------------------------------
  function updateFollow(dt: number, elapsed: number, desired: THREE.Vector3, simRate: number) {
    if (!followReady) { followPoint.copy(controls.target); followGoal.copy(desired); followVel.set(0, 0, 0); followReady = true; hasLastDesired = false; }
    // G1: aim 0.3 s ahead of the subject along its smoothed ground velocity.
    if (hasLastDesired && dt > 0) {
      shift.copy(desired).sub(lastDesired).divideScalar(dt); shift.y = 0;
      if (shift.length() > 30) shift.set(0, 0, 0); // a cut or relocation, not motion
      subjVel.lerp(shift, 1 - Math.exp(-dt * 3));
    }
    lastDesired.copy(desired); hasLastDesired = true;
    desired.addScaledVector(subjVel, 0.3);
    // At fast sim speeds animals jump metres per frame: hold framing inside a dead zone and re-target at
    // most every ~0.8 s, so the camera glides between rests instead of chasing every step. At natural speeds a
    // soft dead zone (±8% of the frame height at the subject) ignores play-bout lurches.
    const fast = THREE.MathUtils.smoothstep(simRate, 300, 3600);
    const frameH = 2 * close.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(close.fov) / 2);
    const deadZone = Math.max(frameH * 0.08, 0.4 + fast * 3.5);
    const hold = fast * 0.8;
    if (fast >= 0.01) { if (desired.distanceTo(followGoal) > deadZone && elapsed - lastRetarget >= hold) { followGoal.copy(desired); lastRetarget = elapsed; } }
    else {
      const off = desired.distanceTo(followGoal);
      if (outsideDeadZone(off, frameH, 0.08)) followGoal.lerp(desired, (off - frameH * 0.08) / off);
    }
    shift.copy(followGoal).sub(followPoint);
    if (hyp2(shift.x, shift.z) > FOLLOW_CUT_DISTANCE || Math.abs(shift.y) > 25) {
      // Teleported (fast sim, climbing, new focus): cut and keep the framing instead of whipping across the map.
      followPoint.copy(followGoal);
      followVel.set(0, 0, 0);
    } else {
      const kh = 3.2, kv = 1.6;
      followVel.x += (shift.x * kh * kh - followVel.x * 2 * kh) * dt;
      followVel.z += (shift.z * kh * kh - followVel.z * 2 * kh) * dt;
      followVel.y += (shift.y * kv * kv - followVel.y * 2 * kv) * dt;
      const sp = followVel.length();
      if (sp > FOLLOW_MAX_SPEED) followVel.multiplyScalar(FOLLOW_MAX_SPEED / sp);
      followPoint.addScaledVector(followVel, dt);
    }
    shift.copy(followPoint).sub(controls.target);
    controls.target.add(shift);
    close.position.add(shift);
  }

  // Follow chase (both user views): the focus glides onto the animal on a critically damped spring with its velocity
  // fed forward (follow.ts), then (lock) rides its interpolated path; the view camera moves with the focus, so framing,
  // pitch and orbit are kept: no snap, no whip. Returns true when a glide has arrived.
  function chaseFocus(dt: number, px: number, py: number, pz: number, cam: THREE.Camera, frameH: number): boolean {
    const tg = controls.target;
    if (!glideReady) { chaseReset(chase, tg.x, tg.y, tg.z); glideReady = true; }
    // Each step starts from where the focus is (a map clamp may have moved it) and keeps the chase's velocity.
    chase.f[0] = tg.x; chase.f[1] = tg.y; chase.f[2] = tg.z;
    // Animal positions come from the creature layer's previous frame (the scene updates the camera first): lead by one.
    if (chaseStep(chase, px, py, pz, dt, !gliding, jumpFor(frameH), 1)) followEvent({ type: 'relocated' });
    shift.set(chase.f[0] - tg.x, chase.f[1] - tg.y, chase.f[2] - tg.z);
    tg.add(shift); cam.position.add(shift);
    return gliding && chaseArrived(chase, frameH);
  }

  // ---------------------------------------------------------------------
  // Cinematic director
  // ---------------------------------------------------------------------
  interface ShotState { kind: Shot; start: number; duration: number; interactionId: number; chimpId: number; score: number; angle: number; radius: number; heightA: number; heightB: number; side: number; fov: number; size: number; }
  let shot: ShotState | null = null;
  const cineLook = new THREE.Vector3();
  const cinePos = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const probeLook = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let nextCheck = 0;
  // G3 shot grammar: the last cut's subject, its side of the actor–target axis and the camera angle around it.
  let lastSide = 0, lastAngle = NaN, lastInteraction = -2, lastChimp = -2;
  const pairA = new THREE.Vector3(), pairB = new THREE.Vector3(), leadVel = new THREE.Vector3(), lastSubject = new THREE.Vector3();
  let hasLastSubject = false;
  const handheld = { x: 0, y: 0, z: 0 };
  let rngState = world.seed * 97 + 1;
  const rand = () => { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 4294967296; };

  function interactionScore(it: Interaction): number {
    const age = Math.max(0, world.time - it.start);
    const live = it.end === null || it.end > world.time ? 1.4 : 0.6;
    return (KIND_WEIGHT[it.kind] ?? 1.5) * (0.6 + Math.min(1, it.intensity ?? 0.5)) * live / (1 + age * 6);
  }
  /** Subject centre (out) and visual size in metres (participant spread, at least one animal). */
  function subjectOf(s: { interactionId: number; chimpId: number }, out: THREE.Vector3): number {
    const interactions = (world as Partial<World>).interactions;
    if (s.interactionId >= 0 && interactions) {
      const it = interactions.find(i => i.id === s.interactionId);
      if (it) {
        let n = 0; out.set(0, 0, 0);
        const ids = it.participants?.length ? it.participants.slice(0, 6) : [it.actorId, it.targetId];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const id of ids) if (id >= 0 && getPosition(id, tmp)) {
          out.add(tmp); n++;
          minX = Math.min(minX, tmp.x); maxX = Math.max(maxX, tmp.x); minZ = Math.min(minZ, tmp.z); maxZ = Math.max(maxZ, tmp.z);
        }
        if (n) { out.divideScalar(n); return Math.max(1.6, hyp2(maxX - minX, maxZ - minZ) * 1.15); }
        out.set(it.position[0], height(it.position[0], it.position[2]), it.position[2]);
        return 3;
      }
    }
    if (s.chimpId >= 0 && getPosition(s.chimpId, out)) return 1.6;
    return 0;
  }
  function shotPosition(s: ShotState, t: number, center: THREE.Vector3, out: THREE.Vector3) {
    const u = Math.min(1, t / s.duration);
    const ease = u * u * (3 - 2 * u);
    let a = s.angle, r = s.radius, h = s.heightA;
    if (s.kind === 'orbit') a += s.side * t * 0.08;
    else if (s.kind === 'dolly') r = THREE.MathUtils.lerp(s.radius * 1.5, s.radius * 0.85, ease);
    else if (s.kind === 'crane') { h = THREE.MathUtils.lerp(s.heightA, s.heightB, ease); a += s.side * t * 0.03; }
    else if (s.kind === 'low') { r = THREE.MathUtils.lerp(s.radius * 1.15, s.radius * 0.9, ease); a += s.side * t * 0.02; }
    else if (s.kind === 'establish') { a += s.side * t * 0.03; h = THREE.MathUtils.lerp(s.heightA, s.heightB, ease); }
    out.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
    out.y = Math.max(height(out.x, out.z) + 0.8, center.y + h);
  }
  /** Scores a candidate over its whole path: <0 rejects (camera in a crown/hill, subject too small, terrain in the way). */
  function evaluate(s: ShotState, center: THREE.Vector3): number {
    const halfTan = Math.tan(THREE.MathUtils.degToRad(s.fov) / 2);
    const maxDist = s.size / (MIN_FRAME_SHARE * 2 * halfTan);
    probeLook.copy(center).y += 1;
    let crowns = 0, blockers = 0;
    for (let k = 0; k <= 4; k++) {
      shotPosition(s, s.duration * k / 4, center, probe);
      if (probe.y < height(probe.x, probe.z) + 0.6) return -1;
      if (obstacles.crownDepth(probe, 1.15) > 0) return -1;
      const d = probe.distanceTo(probeLook);
      if (d > maxDist || d < 3) return -1;
      const seg = obstacles.segment(probe, probeLook, probeLook, 2.5);
      if (seg.ground) return -1;
      crowns += seg.crowns;
      // Non-fadeable occluders only: the subject's host trunk rejects the shot (fadeable crowns, trunks and logs clear
      // themselves, so they only cost a little).
      if (subjectHost >= 0 && trunkBlocks(probe.x, probe.y, probe.z, probeLook.x, probeLook.y - 0.4, probeLook.z, trunks, subjectHost, 0.1)) return -1;
      // Animals never fade: another animal near the sight line in front of the subject costs the shot, and so does
      // looking down a pair's axis (one hides the other).
      blockers += animalsInFront(probe, probeLook);
      if (evalPair) {
        const ax = pairB.x - pairA.x, az = pairB.z - pairA.z, vx = probe.x - center.x, vz = probe.z - center.z;
        const c = Math.abs(ax * vx + az * vz) / Math.max(1e-3, hyp2(ax, az) * hyp2(vx, vz));
        if (c > 0.87) blockers += 1;
      }
    }
    return 1 - crowns / 5 * 0.35 - Math.min(0.9, blockers * 0.15);
  }
  let evalPair = false;
  /** Animals within 0.5 m of the segment a → b, nearer a than b by more than a metre. */
  function animalsInFront(a: THREE.Vector3, b: THREE.Vector3): number {
    const sx = b.x - a.x, sy = b.y - a.y, sz = b.z - a.z, L2 = sx * sx + sy * sy + sz * sz;
    let n = 0;
    for (const c of world.chimps) {
      if (!c.alive || !getPosition(c.id, tmp2)) continue;
      const px = tmp2.x - a.x, py = tmp2.y + 0.5 - a.y, pz = tmp2.z - a.z;
      const t = (px * sx + py * sy + pz * sz) / Math.max(L2, 1e-6);
      if (t <= 0 || t * Math.sqrt(L2) > Math.sqrt(L2) - 1) continue;
      const dx = px - sx * t, dy = py - sy * t, dz = pz - sz * t;
      if (dx * dx + dy * dy + dz * dz < 0.25) n++;
    }
    return n;
  }
  /** Field profile (C5b): episodes near the current subject win, so the director does not cut kilometres away
   * (each cut far from the streamed window waits for a rebuild). 1 within ~250 m, falling off beyond. */
  function nearby(id: number): number {
    if (!field) return 1;
    if (!getPosition(id, tmp2)) return 0.1;
    const ref = hasLastSubject ? lastSubject : controls.target;
    const d = hyp2(tmp2.x - ref.x, tmp2.z - ref.z) / 250;
    return 1 / (1 + d * d * d);
  }
  function pickShot(elapsed: number, force: boolean) {
    const interactions = (world as Partial<World>).interactions ?? [];
    let best: Interaction | null = null; let bestScore = 0;
    for (const it of interactions) { const s = interactionScore(it) * nearby(it.actorId); if (s > bestScore) { bestScore = s; best = it; } }
    let chimpId = -1;
    if (!best) {
      // No interaction feed: follow the most active-looking individual instead.
      let top = 0;
      for (const c of world.chimps) {
        if (!c.alive) continue;
        const s = (ACTION_WEIGHT[c.action] ?? 1) * (0.6 + rand() * 0.8) * nearby(c.id);
        if (s > top) { top = s; chimpId = c.id; }
      }
      bestScore = top * 0.3;
    }
    const current = shot;
    const age = current ? elapsed - current.start : Infinity;
    // Shots last 4–12 s: a stronger episode can take over only after the 4 s minimum.
    if (!force && current && age < current.duration && !(bestScore > current.score * 1.8 && age > 4)) return;
    const ids = { interactionId: best ? best.id : -1, chimpId };
    const size = subjectOf(ids, tmp);
    if (!size) return;
    const center = tmp.clone();
    const kinds: Shot[] = best && bestScore > 3 ? ['orbit', 'dolly', 'low', 'crane'] : ['orbit', 'crane', 'establish', 'dolly', 'low'];
    // The pair's axis for the 180° rule (actor → target), when the episode has two animals.
    const hasPair = !!best && best.targetId >= 0 && getPosition(best.actorId, pairA) && getPosition(best.targetId, pairB) && pairA.distanceTo(pairB) > 0.3;
    evalPair = hasPair;
    const samePair = hasPair && best!.id === lastInteraction;
    const sameSubj = (ids.interactionId >= 0 && ids.interactionId === lastInteraction) || (ids.chimpId >= 0 && ids.chimpId === lastChimp);
    let chosen: ShotState | null = null; let chosenScore = -1;
    for (let attempt = 0; attempt < 16 && chosenScore < 0.95; attempt++) {
      let kind = kinds[Math.floor(rand() * kinds.length)];
      if (current && kind === current.kind && attempt < 4) kind = kinds[(kinds.indexOf(kind) + 1) % kinds.length];
      const fov = kind === 'establish' ? 40 : kind === 'low' ? 30 : 34;
      const halfTan = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
      const maxDist = size / (MIN_FRAME_SHARE * 2 * halfTan);
      const radius = Math.min(maxDist * 0.7, kind === 'low' ? 5.5 : kind === 'establish' ? 22 : 7 + rand() * 5);
      const candidate: ShotState = {
        kind, start: elapsed, duration: kind === 'establish' ? 8 : 6.5 + rand() * 5,
        interactionId: ids.interactionId, chimpId: ids.chimpId, score: bestScore,
        angle: rand() * Math.PI * 2, radius,
        heightA: kind === 'low' ? 0.5 : kind === 'crane' ? 1.4 : kind === 'establish' ? Math.min(radius * 0.8, 18) : 2 + rand() * 2.5,
        heightB: kind === 'crane' ? Math.min(radius * 0.9, 9) : kind === 'establish' ? Math.min(radius, 20) : 0,
        side: rand() < 0.5 ? -1 : 1, fov, size,
      };
      let score = evaluate(candidate, center);
      if (score >= 0 && (samePair || sameSubj)) {
        shotPosition(candidate, 0, center, probe);
        // 180° rule for pairs and 30° rule for any cut back to the same subject (a glide within one shot is free).
        if (samePair && crossesLine(lastSide, pairA.x, pairA.z, pairB.x, pairB.z, probe.x, probe.z)) score = -0.5;
        else if (Number.isFinite(lastAngle) && tooSimilar(lastAngle, Math.atan2(probe.z - center.z, probe.x - center.x))) score -= 0.6;
      }
      if (score > chosenScore) { chosenScore = score; chosen = candidate; }
    }
    if (!chosen) return;
    if (chosenScore < 0) {
      // Nothing clears the forest: a steep, high overhead view (the cutaway opens the crowns below).
      chosen.kind = 'crane'; chosen.radius = 4; chosen.heightA = chosen.heightB = Math.min(18, size / (MIN_FRAME_SHARE * 2 * Math.tan(THREE.MathUtils.degToRad(chosen.fov) / 2)) * 0.9);
    }
    const sameSubject = !!current && current.interactionId === chosen.interactionId && current.chimpId === chosen.chimpId;
    shotPosition(chosen, 0, center, probe);
    lastSide = hasPair ? axisSide(pairA.x, pairA.z, pairB.x, pairB.z, probe.x, probe.z) : 0;
    lastAngle = Math.atan2(probe.z - center.z, probe.x - center.x);
    lastInteraction = chosen.interactionId; lastChimp = chosen.chimpId;
    log.cuts.push({ t: elapsed, kind: chosen.kind, interactionId: chosen.interactionId, sameSubject: sameSubj, side: lastSide, angle: lastAngle });
    if (log.cuts.length > 200) log.cuts.shift();
    shot = chosen;
    subject.copy(center);
    cine.fov = chosen.fov;
    cine.updateProjectionMatrix();
    if (!sameSubject || !current) {
      // New subject: a clean cut with a short exposure dip; same subject: glide into the new shot.
      shotPosition(chosen, 0, subject, cinePos);
      cineLook.copy(subject).y += 1.0;
      cine.position.copy(cinePos);
      cine.lookAt(cineLook);
      if (current) cutDip = 1;
    }
  }
  function shotParticipants(s: ShotState) {
    subjectCount = 0;
    const it = s.interactionId >= 0 ? (world as Partial<World>).interactions?.find(i => i.id === s.interactionId) : undefined;
    if (it) {
      const ids = it.participants?.length ? it.participants : [it.actorId, it.targetId];
      for (let k = 0; k < ids.length && subjectCount < 4; k++) if (ids[k] >= 0) subjectIds[subjectCount++] = ids[k];
    } else if (s.chimpId >= 0) subjectIds[subjectCount++] = s.chimpId;
  }
  function updateCinematic(dt: number, elapsed: number) {
    pickShot(elapsed, !shot);
    if (!shot) return;
    shotParticipants(shot);
    if (!subjectOf(shot, tmp)) { pickShot(elapsed, true); return; }
    subject.lerp(tmp, 1 - Math.exp(-dt * 3));
    shotPosition(shot, elapsed - shot.start, subject, desired);
    cinePos.lerp(desired, 1 - Math.exp(-dt * 2.2));
    // The subject can wander into a crown's line: re-validate twice a second and re-frame if blocked.
    if (elapsed > nextCheck) {
      nextCheck = elapsed + 0.5;
      if (obstacles.crownDepth(cinePos, 1.1) > 0 || cinePos.y < height(cinePos.x, cinePos.z) + 0.5) pickShot(elapsed, true);
    }
    cinePos.y = Math.max(cinePos.y, height(cinePos.x, cinePos.z) + 0.6);
    if (trunks.length && pushOutOfTrunks(cinePos.x, cinePos.z, trunks, 0.5, PUSH)) { cinePos.x = PUSH[0]; cinePos.z = PUSH[1]; }
    cine.position.copy(cinePos);
    // Lead room: the frame leads the subject along its motion by ~a quarter of its size.
    if (hasLastSubject && dt > 0) { shift.copy(subject).sub(lastSubject).divideScalar(dt); shift.y = 0; if (shift.length() < 30) leadVel.lerp(shift, 1 - Math.exp(-dt * 2)); }
    lastSubject.copy(subject); hasLastSubject = true;
    tmp.copy(subject); tmp.y += shot.kind === 'establish' ? 0.3 : 1.0;
    const lead = Math.min(1, leadVel.length() / 2) * shot.size * 0.25;
    if (lead > 1e-3) tmp.addScaledVector(shift.copy(leadVel).normalize(), lead);
    // Safe margin: the look tightens as the subject nears the edge of the frame (kept inside the central 80%).
    probeLook.copy(subject).project(cine);
    const edge = Math.max(Math.abs(probeLook.x), Math.abs(probeLook.y));
    cineLook.lerp(tmp, 1 - Math.exp(-dt * (2.8 + 10 * THREE.MathUtils.smoothstep(edge, 0.55, 0.8))));
    cine.lookAt(cineLook);
    // G5: a slight handheld drift (≈0.2°), off with prefers-reduced-motion.
    if (!reduceMotion.matches) {
      const t = elapsed;
      handheld.x = (Math.sin(t * 0.61) * 0.6 + Math.sin(t * 1.37 + 1.3) * 0.4) * 0.0035;
      handheld.y = (Math.sin(t * 0.47 + 2.1) * 0.6 + Math.sin(t * 1.13) * 0.4) * 0.0035;
      handheld.z = Math.sin(t * 0.33 + 0.7) * 0.0015;
      cine.rotateX(handheld.x); cine.rotateY(handheld.y); cine.rotateZ(handheld.z);
    }
    hasSubject = true;
  }

  // The close camera keeps trunk radius + 0.6 m from every trunk. Other trunks fade (keep-clear), so only the
  // subject's host tree (climbed, drummed on, perched in) makes it orbit 25° toward the clear side, after 0.25 s.
  function avoidTrunks(dt: number) {
    if (!trunks.length) return;
    if (pushOutOfTrunks(close.position.x, close.position.z, trunks, 0.6, PUSH)) { close.position.x = PUSH[0]; close.position.z = PUSH[1]; }
    const tgt = controls.target;
    if (orbitLeft !== 0) {
      const step = orbitLeft * (1 - Math.exp(-dt * 4));
      rotateAbout(tgt, step);
      orbitLeft -= step;
      if (Math.abs(orbitLeft) < 0.002) orbitLeft = 0;
      return;
    }
    if (!hasSubject || subjectHost < 0 || !trunkBlocks(close.position.x, close.position.y, close.position.z, subject.x, subject.y + 0.6, subject.z, trunks, subjectHost, 0.1)) { blockedFor = 0; return; }
    blockedFor += dt;
    if (blockedFor < 0.25) return;
    blockedFor = 0;
    const clearAt = (ang: number) => {
      const dx = close.position.x - tgt.x, dz = close.position.z - tgt.z, c = Math.cos(ang), sn = Math.sin(ang);
      return !trunkBlocks(tgt.x + dx * c - dz * sn, close.position.y, tgt.z + dx * sn + dz * c, subject.x, subject.y + 0.6, subject.z, trunks, subjectHost, 0.1);
    };
    const a = THREE.MathUtils.degToRad(25);
    orbitLeft = clearAt(a) ? a : clearAt(-a) ? -a : clearAt(2 * a) ? 2 * a : -2 * a;
    log.reframes++;
  }
  function rotateAbout(c: THREE.Vector3, ang: number) {
    const dx = close.position.x - c.x, dz = close.position.z - c.z, co = Math.cos(ang), sn = Math.sin(ang);
    close.position.x = c.x + dx * co - dz * sn; close.position.z = c.z + dx * sn + dz * co;
  }

  // ---------------------------------------------------------------------
  // View blends (plan §2.6): distance to the focus and frame height interpolate geometrically, the field of view
  // follows, so the orthographic view (treated as a very narrow perspective 260 m back) dolly-zooms into the close
  // view and back. The blend reads the destination camera live, so input during the blend keeps working.
  // ---------------------------------------------------------------------
  interface Pose { focus: THREE.Vector3; quat: THREE.Quaternion; d: number; hf: number; ext: number }
  const from: Pose = { focus: new THREE.Vector3(), quat: new THREE.Quaternion(), d: 1, hf: 1, ext: 42 };
  const to: Pose = { focus: new THREE.Vector3(), quat: new THREE.Quaternion(), d: 1, hf: 1, ext: 42 };
  const blendFocus = new THREE.Vector3(), blendFwd = new THREE.Vector3();
  const BF = [0, 0, 0];
  let blending = false, blendT = 0, blendDur = 0, blendU = 0, blendHf = 1, blendFromRts = false;
  function focusOf(cam: THREE.Camera): THREE.Vector3 {
    if (blending && cam === blendCam) return blendFocus;
    return cam === cine ? cineLook : controls.target;
  }
  function modeExtent(cam: THREE.Camera): number {
    if (cam === rts) return Math.min(170, (rts.right - rts.left) / rts.zoom * 0.62);
    return mode === 'cinematic' && shot?.kind === 'establish' ? 60 : 42;
  }
  function capture(cam: THREE.OrthographicCamera | THREE.PerspectiveCamera, out: Pose) {
    const f = focusOf(cam);
    out.focus.copy(f); out.quat.copy(cam.quaternion);
    if ((cam as THREE.OrthographicCamera).isOrthographicCamera) { out.d = rtsDist(); out.hf = rtsFrame(rts.zoom); }
    else { out.d = Math.max(0.3, cam.position.distanceTo(f)); out.hf = frameHeightPersp(out.d, (cam as THREE.PerspectiveCamera).fov); }
    out.ext = cam === blendCam ? THREE.MathUtils.lerp(from.ext, to.ext, blendU) : modeExtent(cam);
  }
  function beginBlend() {
    const dur = blendDuration(reduceMotion.matches);
    const current = blending ? blendCam : modeCam;
    if (dur <= 0) { blending = false; return; }
    capture(current, from);
    blendFromRts = current === rts || (blending && blendFromRts && blendU < 0.5);
    blendT = 0; blendDur = dur; blendU = 0; blending = true;
  }
  function updateBlend(dt: number) {
    if (!blending) return;
    blendT += dt;
    blendU = easeInOut(blendT / blendDur);
    capture(modeCam, to);
    blendFrame(from.d, from.hf, to.d, to.hf, blendU, BF);
    blendFocus.lerpVectors(from.focus, to.focus, blendU);
    blendCam.quaternion.slerpQuaternions(from.quat, to.quat, blendU);
    blendFwd.set(0, 0, -1).applyQuaternion(blendCam.quaternion);
    blendCam.position.copy(blendFocus).addScaledVector(blendFwd, -BF[0]);
    blendCam.fov = BF[2];
    blendCam.near = clampN(BF[0] * 0.01, 0.4, 4);
    blendCam.updateProjectionMatrix();
    blendCam.updateMatrixWorld();
    blendHf = BF[1];
    if (blendT >= blendDur) blending = false;
  }

  // ---------------------------------------------------------------------
  // Wheel zoom and the zoom-through (plan §2.1): springs on log zoom (strategy) and log orbit distance (close).
  // ---------------------------------------------------------------------
  function updatePointer(e: MouseEvent) {
    const r = dom.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / Math.max(1, r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / Math.max(1, r.height)) * 2 + 1;
  }
  const onPointerMove = (e: PointerEvent) => { updatePointer(e); if (e.buttons) dragPx = Math.max(dragPx, hyp2(e.clientX - downX, e.clientY - downY)); };
  const onPointerDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; dragPx = 0; };
  const onWheel = (e: WheelEvent) => {
    if (mode === 'cinematic') return;
    e.preventDefault();
    updatePointer(e);
    const unit = e.deltaMode === 1 ? 3 : e.deltaMode === 2 ? 0.1 : 100;   // lines, pages, pixels per notch
    const notches = clampN(-e.deltaY / unit, -3, 3);
    const now = performance.now() / 1000;
    if (mode === 'rts') {
      const was = rtsZoomTarget >= RTS_ZOOM_MAX - 1e-6;
      rtsZoomTarget = clampN(rtsZoomTarget * Math.pow(RTS_NOTCH, notches), zoomMin(), RTS_ZOOM_MAX);
      if (stepThrough(throughIn, was, notches, now)) zoomThroughIn();
    } else {
      exact = false; orbitMin = ORBIT_MIN;
      const was = orbitTarget >= ORBIT_MAX - 1e-6;
      orbitTarget = clampN(orbitTarget * Math.pow(ORBIT_NOTCH, notches), ORBIT_MIN, ORBIT_MAX);
      if (stepThrough(throughOut, was, -notches, now)) zoomThroughOut();
    }
  };
  dom.addEventListener('wheel', onWheel, { passive: false, capture: true });
  dom.addEventListener('pointermove', onPointerMove);
  dom.addEventListener('pointerdown', onPointerDown);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  /** Ground point under an NDC position of a camera (ray marched against the terrain). */
  function groundUnder(x: number, y: number, cam: THREE.Camera, out: THREE.Vector3): boolean {
    ndc.set(x, y);
    raycaster.setFromCamera(ndc, cam);
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    let prev = 0;
    for (let t = 0; t < 1500; t += 1) {
      const px = o.x + d.x * t, py = o.y + d.y * t, pz = o.z + d.z * t;
      if (py < height(px, pz)) {
        let a = prev, b = t;
        for (let k = 0; k < 20; k++) { const m = (a + b) / 2; if (o.y + d.y * m < height(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m; }
        out.set(o.x + d.x * b, 0, o.z + d.z * b); out.y = height(out.x, out.z);
        return true;
      }
      prev = t;
    }
    return false;
  }
  function nearestAnimal(p: THREE.Vector3, maxD: number): number | null {
    let best: number | null = null, bd = maxD;
    for (const c of world.chimps) {
      if (!c.alive || !getPosition(c.id, shift)) continue;
      const d = hyp2(shift.x - p.x, shift.z - p.z);
      if (d < bd) { bd = d; best = c.id; }
    }
    return best;
  }
  const gp = new THREE.Vector3();
  function zoomThroughIn() {
    const hf = rtsFrame(rtsZoomTarget);
    if (!groundUnder(pointer.x, pointer.y, rts, gp)) gp.set(controls.target.x, height(controls.target.x, controls.target.z), controls.target.z);
    // Zooming keeps following: a followed animal is the one the view glides in on (the strategy zoom is about the focus).
    const id = followId !== null && getPosition(followId, pos) ? followId : nearestAnimal(gp, 6);
    const az = azimuthOf(rts, controls.target);
    rtsAzimuth = az; rtsElevation = elevationOf(rts, controls.target);
    beginBlend();
    mode = 'close'; modeCam = close; controls.object = close;
    orbitTarget = clampN(distanceForFrame(hf, CLOSE_FOV), ORBIT_MIN, ORBIT_MAX);
    orbit[0] = Math.log(orbitTarget); orbit[1] = 0;
    userOffset = 0; lift = 0; exact = false; orbitMin = ORBIT_MIN;
    if (id !== null && getPosition(id, pos)) { followId = id; gliding = false; controls.target.set(pos.x, pos.y + 1.1, pos.z); followPoint.copy(controls.target); followVel.set(0, 0, 0); followReady = true; }
    else { followId = null; gliding = false; controls.target.set(gp.x, gp.y + 1, gp.z); }
    lift = terrainLift(controls.target.x, controls.target.y, controls.target.z, orbitTarget, az, pitchForDistance(orbitTarget), height);
    placeClose(az, pitchForDistance(orbitTarget) + lift, orbitTarget);
    configureControls();
    log.throughs++;
  }
  function zoomThroughOut() {
    const hf = frameHeightPersp(close.position.distanceTo(controls.target), CLOSE_FOV);
    const az = azimuthOf(close, controls.target);
    beginBlend();
    // A followed animal stays followed in the strategy view (its spring starts from here).
    mode = 'rts'; modeCam = rts; controls.object = rts; glideReady = false;
    controls.target.y = Math.max(2, height(controls.target.x, controls.target.z) + 2);
    rtsAzimuth = az;
    placeRts(az, rtsElevation);
    setZoomNow(rtsFrame(1) / hf);
    configureControls();
    log.throughs++;
  }

  // ---------------------------------------------------------------------
  // Close view: follow or free look, then distance spring, pitch curve + user offset, terrain lift (plan §2.5).
  // ---------------------------------------------------------------------
  function updateClose(dt: number, elapsed: number, selectedId: number | null, simRate: number) {
    if (followId !== null && getPosition(followId, pos)) {
      subject.copy(pos);
      pos.y += 1.1;
      // A new follow glides in first; the speed-capped tracking spring takes over from where the glide ends.
      if (!gliding) updateFollow(dt, elapsed, pos, simRate);
      else if (chaseFocus(dt, pos.x, pos.y, pos.z, close, frameHeightPersp(close.position.distanceTo(controls.target), close.fov))) { followEvent({ type: 'arrived' }); followReady = false; }
      hasSubject = true;
      subjectIds[0] = followId; subjectCount = 1;
    } else if (selectedId !== null && getPosition(selectedId, subject)) { hasSubject = true; subjectIds[0] = selectedId; subjectCount = 1; }
    controls.update(dt);
    const tg = controls.target;
    off.subVectors(close.position, tg);
    const dNow = Math.max(off.length(), 1e-3), eNow = Math.asin(clampN(off.y / dNow, -1, 1)), az = Math.atan2(off.x, off.z);
    if (!Number.isFinite(eSet) || Math.abs(dNow - lastD) > 0.02 * Math.max(1, lastD)) {
      // Moved from outside the rig (a script set position/target): adopt it as the new orbit.
      orbit[0] = Math.log(dNow); orbit[1] = 0; orbitTarget = dNow; orbitMin = Math.min(ORBIT_MIN, dNow);
      userOffset = eNow - pitchForDistance(dNow); lift = 0; exact = true;
    } else userOffset = exact ? userOffset + eNow - eSet : clampN(userOffset + eNow - eSet, -OFFSET_MAX, OFFSET_MAX);
    springStep(orbit, Math.log(orbitTarget), ZOOM_TAU, dt);
    const d = Math.exp(orbit[0]);
    const base = pitchForDistance(d) + userOffset;
    if (!exact) {
      const want = terrainLift(tg.x, tg.y, tg.z, d, az, base, height);
      lift += (want - lift) * (1 - Math.exp(-dt / (want > lift ? 0.25 : 0.8)));
    } else lift = 0;
    placeClose(az, clampN(base + lift, 0.03, 1.5), d);
    avoidTrunks(dt);
    const floor = height(close.position.x, close.position.z) + 0.7;
    if (close.position.y < floor) close.position.y = floor;
    close.lookAt(tg);
    lastD = close.position.distanceTo(tg);
    eSet = Math.asin(clampN((close.position.y - tg.y) / Math.max(lastD, 1e-3), -1, 1));
  }

  function updateRts(dt: number) {
    const bx = controls.target.x, bz = controls.target.z;
    controls.update(dt);
    // Only a pan moves the focus inside the controls (rotation turns about it; the wheel is the rig's own): a real drag
    // that moved it is the user taking the camera, so the follow lets go. Otherwise the focus glides to / tracks the animal.
    panGrace = Math.max(0, panGrace - dt);
    if (followId !== null && userPanned(hyp2(controls.target.x - bx, controls.target.z - bz), dragPx, dragging, panGrace)) followEvent({ type: 'user-pan' });
    if (followId !== null) {
      if (!getPosition(followId, pos)) followEvent({ type: 'lost' });
      // The focus sits on the animal's torso, so one up in a crown is centred too (a climb moves the focus straight up:
      // no sideways jump). The lens, keep-clear, map footprint and listener read the ground under the focus, not its height.
      else if (chaseFocus(dt, pos.x, Math.max(pos.y, height(pos.x, pos.z)) + 0.6, pos.z, rts, rtsFrame(rts.zoom))) followEvent({ type: 'arrived' });
    }
    // A script set the zoom directly: adopt it.
    if (Math.abs(rts.zoom - rtsZoomSet) > 1e-4) { rtsZoomTarget = clampN(rts.zoom, zoomMin(), RTS_ZOOM_MAX); rtsZoom[0] = Math.log(rtsZoomTarget); rtsZoom[1] = 0; }
    springStep(rtsZoom, Math.log(rtsZoomTarget), ZOOM_TAU, dt);
    rts.zoom = rtsZoomSet = Math.exp(rtsZoom[0]);
    if (field) {
      // Keep the focus on the map, and the camera far enough back that the whole km-scale frame lies in its clip range.
      const lim = mapSize / 2 - 20;
      const cx = clampN(controls.target.x, -lim, lim) - controls.target.x, cz = clampN(controls.target.z, -lim, lim) - controls.target.z;
      if (cx || cz) { controls.target.x += cx; controls.target.z += cz; rts.position.x += cx; rts.position.z += cz; }
      off.subVectors(rts.position, controls.target).setLength(rtsDist());
      rts.position.copy(controls.target).add(off);
      rts.far = Math.max(1400, rtsDist() + rtsFrame(rts.zoom) * 3);
    }
    rts.updateProjectionMatrix();
  }

  // Canopy lens (plan §2.4, stylization): opens around the selected animal (else the view centre) when zoomed in on
  // the strategy view; eased so it glides; fades with the blend into or out of the close view.
  const lensP = new THREE.Vector3();
  let lensReady = false;
  function updateLens(dt: number, selectedId: number | null) {
    const cam = blending ? blendCam : modeCam;
    const rtsInvolved = mode === 'rts' || (blending && blendFromRts);
    const r = rtsInvolved ? lensRadius(blending ? blendHf : rtsFrame(rts.zoom)) : 0;
    const w = !rtsInvolved ? 0 : blending ? (mode === 'rts' ? blendU : 1 - blendU) : 1;
    let tx = 0, ty = 0, fy = height(controls.target.x, controls.target.z);
    lensP.copy(controls.target).project(cam); tx = lensP.x; ty = lensP.y;
    if (selectedId !== null && getPosition(selectedId, lensP)) {
      // The focus height is the ground under the focus, even for an animal up a tree: party members below it must
      // show too (the lens opened only crowns above a tree subject, leaving its party under midstory crowns).
      const gy = height(lensP.x, lensP.z);
      lensP.project(cam);
      if (Math.abs(lensP.x) < 0.95 && Math.abs(lensP.y) < 0.95 && lensP.z < 1) { tx = lensP.x; ty = lensP.y; fy = gy; }
    }
    const k = lensReady ? 1 - Math.exp(-dt / 0.3) : 1;
    lens.x += (tx - lens.x) * k; lens.y += (ty - lens.y) * k; lens.focusY += (fy - lens.focusY) * k;
    lens.r = r; lens.w = r > 0.005 ? w : 0;
    lensReady = true;
  }

  function setView(next: ViewMode, selectedId: number | null) {
    if (next === mode) return;
    const current = blending ? blendCam : modeCam;
    const prevFocus = pos.copy(focusOf(current));
    const az = azimuthOf(current, prevFocus);
    if (mode === 'rts') { rtsAzimuth = azimuthOf(rts, controls.target); rtsElevation = elevationOf(rts, controls.target); }
    beginBlend();
    mode = next;
    if (mode === 'close') {
      modeCam = close; controls.object = close;
      const id = selectedId ?? world.chimps.find(c => c.alive)?.id ?? -1;
      orbitTarget = CLOSE_DEFAULT; orbit[0] = Math.log(CLOSE_DEFAULT); orbit[1] = 0;
      userOffset = 0; lift = 0; exact = false; orbitMin = ORBIT_MIN;
      controls.target.copy(prevFocus);
      placeClose(az, pitchForDistance(CLOSE_DEFAULT), CLOSE_DEFAULT);
      focusChimp(id);
    } else if (mode === 'rts') {
      modeCam = rts; controls.object = rts;
      // The close view's followed animal stays followed (the strategy spring starts from the close focus).
      glideReady = false;
      controls.target.set(prevFocus.x, Math.max(2, prevFocus.y), prevFocus.z);
      placeRts(rtsAzimuth, rtsElevation);
      rts.updateProjectionMatrix();
    } else {
      modeCam = cine;
      shot = null;
      followEvent({ type: 'view', mode: 'cinematic' });
    }
    configureControls();
    controls.update();
  }

  // Drag bookkeeping for the follow (updateRts decides whether a drag was a pan).
  const onStart = () => { dragging = true; };
  const onEnd = () => { dragging = false; panGrace = 0.4; };
  controls.addEventListener('start', onStart);
  controls.addEventListener('end', onEnd);

  configureControls();
  reset();

  const zoomState: { hf: number; band: ZoomBand; view: ViewMode } = { hf: 1, band: 'overview', view: 'rts' };
  function frameHeight(): number {
    if (blending) return blendHf;
    if (modeCam === rts) return rtsFrame(rts.zoom);
    return frameHeightPersp(modeCam.position.distanceTo(focusOf(modeCam)), (modeCam as THREE.PerspectiveCamera).fov);
  }

  return {
    get camera() { return blending ? blendCam : modeCam; },
    get mode() { return mode; },
    get target() { return blending ? blendFocus : mode === 'cinematic' ? cineLook : controls.target; },
    get subject() { return hasSubject ? subject : null; },
    subjectIds,
    get subjectCount() { return subjectCount; },
    get subjectHost() { return subjectHost; },
    set subjectHost(v) { subjectHost = v; },
    get cutDip() { return cutDip; },
    get focusDistance() { const cam = blending ? blendCam : modeCam; return hasSubject && mode !== 'rts' ? cam.position.distanceTo(subject) : 0; },
    get lens() { return lens; },
    get blending() { return blending; },
    log,
    controls,
    get followId() { return followId; },
    set followId(v) { if (v !== followId) followReady = false; followId = v; gliding = false; glideReady = false; configureControls(); },
    get followGliding() { return gliding; },
    setView, focusChimp, follow, panTo, reset,
    resize(width, h) {
      widthPx = width; heightPx = h;
      const aspect = width / h;
      const half = aspect < 0.9 ? 50 : Math.max(47, 82 / aspect);
      rts.left = -half * aspect; rts.right = half * aspect; rts.top = half; rts.bottom = -half;
      close.aspect = cine.aspect = blendCam.aspect = aspect;
      applyInsets();
    },
    setInsets(next) {
      insets.left = Math.max(0, next.left); insets.right = Math.max(0, next.right);
      insets.top = Math.max(0, next.top); insets.bottom = Math.max(0, next.bottom);
      applyInsets();
    },
    update(dt, elapsed, selectedId, simRate = 60) {
      hasSubject = false;
      subjectCount = 0;
      cutDip = Math.max(0, cutDip - dt / 0.35);
      if (mode === 'cinematic') updateCinematic(dt, elapsed);
      else if (mode === 'close') updateClose(dt, elapsed, selectedId, simRate);
      else updateRts(dt);
      updateBlend(dt);
      updateLens(dt, selectedId);
    },
    frameHeight,
    zoom() { zoomState.hf = frameHeight(); zoomState.band = zoomBand(zoomState.hf, modeCam === rts && !blending); zoomState.view = mode; return zoomState; },
    pixelWorld() {
      const cam = blending ? blendCam : modeCam;
      if (cam === rts) return rtsFrame(rts.zoom) / heightPx;
      return 2 * Math.tan(THREE.MathUtils.degToRad((cam as THREE.PerspectiveCamera).fov) / 2) / heightPx;
    },
    shadowExtent() { return blending ? THREE.MathUtils.lerp(from.ext, modeExtent(modeCam), blendU) : modeExtent(modeCam); },
    setOrbit(d, elevation, azimuth, snap = false) {
      if (mode !== 'close') return;
      exact = false; orbitMin = Math.min(ORBIT_MIN, d);
      orbitTarget = clampN(d, orbitMin, ORBIT_MAX);
      if (snap) { orbit[0] = Math.log(orbitTarget); orbit[1] = 0; }
      const dd = Math.exp(orbit[0]);
      if (elevation !== null) userOffset = elevation - pitchForDistance(orbitTarget);
      const az = azimuth === null ? azimuthOf(close, controls.target) : Math.atan2(Math.cos(azimuth), Math.sin(azimuth));
      const base = pitchForDistance(dd) + userOffset;
      if (snap) lift = terrainLift(controls.target.x, controls.target.y, controls.target.z, dd, az, base, height);
      placeClose(az, clampN(base + lift, 0.03, 1.5), dd);
      blending = false;
    },
    setZoomNow(z) { if (mode === 'rts') { setZoomNow(z); blending = false; } },
    place(cx, cy, cz, lx, ly, lz) {
      if (mode !== 'close') return;
      followId = null; gliding = false; configureControls();
      controls.target.set(lx, ly, lz);
      close.position.set(cx, cy, cz);
      const d = Math.max(0.05, close.position.distanceTo(controls.target));
      orbit[0] = Math.log(d); orbit[1] = 0; orbitTarget = d; orbitMin = Math.min(ORBIT_MIN, d);
      const e = elevationOf(close, controls.target);
      userOffset = e - pitchForDistance(d); lift = 0; exact = true;
      close.lookAt(controls.target);
      eSet = e; lastD = d;
      blending = false;
      controls.update();
    },
    setObstacles(nextLobes, nextTrunks, ox, oz) {
      obstacles = createObstacles(nextLobes, height, ox, oz);
      trunks = nextTrunks;
    },
    dispose() {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      dom.removeEventListener('wheel', onWheel, { capture: true });
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
    },
  };
}
