import * as THREE from 'three';
import type { Layer, ListenerPose, Quality, SceneAPI, SceneFrame, ViewMode, World } from './types';
import { zoomFromFrameHeight } from './audio/mix';
import { Owner, createEnvState, createNoiseTexture, createSharedUniforms, directionFrom, installAtmosphere, readEnvironment, solarPosition, type EnvFrame } from './render/env/shared';
import { FIELD_RING_OUTER, createTerrain, type Terrain } from './render/env/terrain';
import { createVegetation, type Vegetation } from './render/env/vegetation';
import { createWater, type WaterSurface } from './render/env/water';
import { createFieldEnv, type EnvWindow, type FieldEnv } from './render/env/field-env';
import { createOverview, type Overview } from './render/env/overview';
import { FIELD_START_ORBIT, FIELD_START_PITCH, FIELD_START_ZOOM, approach, needsRecentre, overviewWeight, partyFocus, runSteps, stepFor, windowCentre } from './render/env/field';
import { createSky } from './render/env/sky';
import { createWeather } from './render/env/weather';
import { createTerritory } from './render/env/territory';
import { createMarkers } from './render/env/markers';
import { createCameraRig } from './render/env/camera';
import { createPost } from './render/env/post';
import { createCreatures, type CreatureFrame, type CreatureLayer } from './render/creatures';
import { createCuller } from './render/env/cells';
import { HIGH_STEP_RATIO, INTERNAL_RATIO, createPace, observeInterval, outputSizes, shouldRender } from './render/env/output';
import { FADE_CAPACITY, FADE_WIDTH, MARGIN_IN, MAX_TARGETS, classify, createOccluderTable, nearRadius, selectTargets, smooth, writeFade, type KeepCandidate, type KeepTarget, type OccView } from './render/env/occluders';
import { createGpuTimer, perf, perfEnd, perfNow } from './perf';
import { hyp2 } from './render/fastmath';
import { pickRadius } from './render/creatures/pick';
import { cameraFootprint, footprintMoved } from './render/env/footprint';

// Scene orchestrator. The environment (terrain, forest, water, sky, weather,
// territory, cameras, post) lives in src/render/env; animals come from the
// creature layer (src/render/creatures.ts). The renderer only reads World.

// Shadow maps refresh every Nth frame below 'high' (wind sway and walking read fine at 30/20 Hz).
const SHADOW_EVERY: Record<Quality, number> = { high: 1, medium: 2, low: 3 };
// Shadow map by view (plan G3): the strategy view needs ~1 texel per screen pixel at every zoom (2048 over its fitted
// extent); close and cinematic views fit a 50 m slice of the view frustum (3072, ≈2.5 cm texels). 'medium' halves.
const SHADOW_SIZE: Record<Quality, { rts: number; persp: number }> = { high: { rts: 2048, persp: 3072 }, medium: { rts: 1024, persp: 1536 }, low: { rts: 1024, persp: 1024 } };
const SHADOW_SLICE = 50;
const DOWNGRADE: Record<Quality, Quality | null> = { high: 'medium', medium: 'low', low: null };
const UPGRADE: Record<Quality, Quality | null> = { high: null, medium: 'high', low: 'medium' };
const RANK: Record<Quality, number> = { low: 0, medium: 1, high: 2 };

/** The frame-cap setting (per viewer, browser storage): capped unless the user chose uncapped in Settings. */
const FRAME_CAP_KEY = 'mgogo:uncapped';
function readFrameCap(): boolean { try { return localStorage.getItem(FRAME_CAP_KEY) !== '1'; } catch { return true; } }

/** Scene extra outside the shared contract (types.ts): where the camera looks, for the range map. One object, rewritten in place. */
export interface CameraFootprint {
  /** Ground corners of the part of the view not under UI panels (x0, z0 … x3, z3: bottom-left, bottom-right, top-right,
   * top-left on screen), world metres. Perspective views are capped short of the horizon. */
  pts: Float32Array;
  /** Camera focus on the ground (m). */
  fx: number; fz: number;
  /** Bumped whenever the footprint moves by more than 1/1500 of the map, so the map redraws only then. */
  version: number;
  /** The animal the close view follows, or −1 (free camera). */
  followId: number;
}
export type Scene = SceneAPI & { getFootprint(): CameraFootprint };
/** Scene options (outside the shared contract), field profile only. focusId: the animal whose party the strategy view
 * frames at start (the whole-map overview when absent, as in the env harness). view 'close': open in the close view on
 * that animal instead, at a low orbit (a new world); the strategy view keeps the party framing for the R key. */
export interface SceneOptions { focusId?: number; view?: 'close' }

/** Synthetic Kibale-inspired habitat. Rendering observes World and never edits simulation state. */
export function createScene(container: HTMLElement, world: World, onSelect: (id: number) => void, opts: SceneOptions = {}): Scene {
  installAtmosphere();
  const owner = new Owner();
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  // three's per-program first-use check reads three info logs per program, each a synchronous round trip to the
  // GPU process: ~210 ms in the first frame for ~110 programs. checkLinks() below reports real link failures.
  renderer.debug.checkShaderErrors = false;
  renderer.domElement.setAttribute('aria-label', 'Interactive chimpanzee forest. Drag to pan, scroll to zoom, select an individual.');
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const noise = owner.own(createNoiseTexture(world.seed + 3));
  const placeholder = owner.own(new THREE.DataTexture(new Uint8Array(4), 1, 1));
  const uniforms = createSharedUniforms(noise, placeholder);
  const env = createEnvState();
  const territory = createTerritory(uniforms, owner);
  // Keep-clear objects (trees, buttress flares, rocks, logs) with their smoothed fades (docs/graphics-camera-plan.md G1).
  let occTable = createOccluderTable();
  // Cell culling of vegetation, rocks and logs against the camera and the sun (docs/graphics-camera-plan.md G3).
  let culler = createCuller();
  let terrain: Terrain, vegetation: Vegetation, water: WaterSurface;
  // Field profile (C5b, a ~8 km map in real metres): the environment is a window rebuilt around the camera focus
  // (render-env/field-env.ts), and a whole-map overview takes over as the strategy view zooms out.
  const field = world.size > 1000;
  // Field profile: where the first frame looks (the focus animal's party), so the forest shows at real scale at once.
  const start = field ? partyFocus(world, opts.focusId) : null;
  let fieldEnv: FieldEnv | null = null, win: EnvWindow | null = null, overview: Overview | null = null;
  if (!field) {
    owner.own(culler);
    terrain = createTerrain(world, uniforms, owner, occTable, culler);
    vegetation = createVegetation(world, terrain, uniforms, owner, occTable, culler);
    water = createWater(terrain, uniforms, owner);
  } else {
    fieldEnv = createFieldEnv(world, uniforms, owner);
    // First window (built now, behind the loading screen, so warm-up compiles every program): the opening focus, else
    // the first living animal.
    const c0 = world.chimps.find(c => c.alive) ?? world.chimps[0];
    const f0 = start ?? (c0 ? [c0.position[0], c0.position[2]] : [0, 0]);
    const o0 = windowCentre(f0[0], f0[1], 0, 0, [0, 0], 0, world.size / 2);
    win = runSteps(fieldEnv.build(o0[0], o0[1]));
    occTable = win.occ; culler = win.culler; terrain = win.terrain; vegetation = win.vegetation; water = win.water;
    uniforms.uOrigin.value.set(win.origin[0], win.origin[1]);
    overview = createOverview(world, fieldEnv.river, uniforms, owner, container);
  }
  uniforms.uHeight.value = terrain.heightTexture;
  uniforms.uGround.value = terrain.groundTexture;
  const fadeData = new Uint8Array(FADE_CAPACITY * 4);
  const fadeTexture = owner.own(new THREE.DataTexture(fadeData, FADE_WIDTH, FADE_CAPACITY / FADE_WIDTH, THREE.RGBAFormat));
  fadeTexture.magFilter = fadeTexture.minFilter = THREE.NearestFilter;
  fadeTexture.generateMipmaps = false;
  fadeTexture.needsUpdate = true;
  uniforms.uFade.value = fadeTexture;
  let objToTrunk = new Int32Array(occTable.n).fill(-1);
  vegetation.trunkObj.forEach((obj, i) => { objToTrunk[obj] = i; });
  const sky = createSky(uniforms, owner);
  const weather = createWeather(uniforms, vegetation.shaftSites, world.seed, owner);
  const markers = createMarkers(owner);
  scene.fog = sky.fog;
  scene.add(terrain.group, vegetation.group, water.mesh, sky.sky, sky.key, sky.key.target, sky.hemi, sky.flash, weather.group, territory.curtains, markers.group);
  if (fieldEnv && overview) {
    scene.add(overview.group);
    const near = fieldEnv.vegetationKit.near;
    if (near) scene.add(...near.meshes, near.litter);
  }

  // --- Creatures
  // Animals, selection, perception, social links, labels, FX, nests and colobus all live in the creature layer.
  let creatures: CreatureLayer | null = null;
  // Built as a variable (not an inline literal) so the optional branchAnchor extension stays additive to the contract.
  // Delegates, so a field window swap (new terrain and vegetation) needs nothing from the creature layer.
  const creatureContext = { scene, world, container,
    groundHeight: (x: number, z: number) => terrain.walkable(x, z),
    treeAnchor: (id: number, out: THREE.Vector3) => vegetation.treeAnchor(id, out),
    branchAnchor: (id: number, seed: number, out: THREE.Vector3) => vegetation.branchAnchor(id, seed, out),
    trunkAt: (id: number, y: number, out: THREE.Vector4) => vegetation.trunkAt(id, y, out),
    waterEdge: (x: number, z: number, out: THREE.Vector3) => terrain.waterEdge(x, z, out),
    ripple: (x: number, z: number, strength: number) => water.ripple(x, z, strength, uniforms.uTime.value) };
  try {
    creatures = createCreatures(creatureContext);
  } catch (error) {
    // The forest should still render if the animal layer fails; the error stays visible in the console.
    console.error('Creature layer failed to initialise; rendering the environment only.', error);
  }
  const chimpById = new Map<number, World['chimps'][number]>();
  let rosterRef: World['chimps'] | null = null; let rosterLength = -1;
  const getPosition = (id: number, out: THREE.Vector3): boolean => {
    if (creatures?.getPosition(id, out)) return true;
    if (rosterRef !== world.chimps || rosterLength !== world.chimps.length) {
      rosterRef = world.chimps; rosterLength = world.chimps.length;
      chimpById.clear();
      for (const c of world.chimps) chimpById.set(c.id, c);
    }
    const c = chimpById.get(id);
    if (!c) return false;
    out.set(c.position[0], terrain.walkable(c.position[0], c.position[2]) + Math.max(0, c.position[1]), c.position[2]);
    return true;
  };

  // Debug handle for the environment harness (read-only inspection).
  (renderer.domElement as HTMLCanvasElement & { __env?: unknown }).__env = { scene, renderer, sky, uniforms, env };
  const rig = createCameraRig(renderer.domElement, world, (x, z) => terrain.walkable(x, z), getPosition, vegetation.lobes, vegetation.trunkList, { mapSize: world.size });
  if (win) rig.setObstacles(vegetation.lobes, vegetation.trunkList, win.origin[0], win.origin[1]);
  // Field profile: the strategy view frames the focus party (not the 8 km overview), and a new world starts in a low
  // close view on the focus animal. Zooming out still reaches the overview; Reset camera shows the whole map.
  if (start) {
    rig.panTo(start[0], start[1]); rig.setZoomNow(FIELD_START_ZOOM);
    if (opts.view === 'close' && opts.focusId !== undefined) { rig.setView('close', opts.focusId); rig.setOrbit(FIELD_START_ORBIT, FIELD_START_PITCH, null, true); }
  }
  const creatureRoot = scene.getObjectByName('creatures');
  const post = createPost(renderer, scene, rig.camera);
  const gpuTimer = perf.gpu ? createGpuTimer(renderer.getContext() as WebGL2RenderingContext) : null;
    // frameCap: 60 Hz on ≥ 100 Hz displays (Settings can turn it off; probes do). fsr: upscale path (A/B only).
  // detail: G5's close-up additions that can be switched at runtime (close-view DoF, litter decals), for A/B probes.
  const debug: { autoQuality: boolean; fadeOverride: number | null; frameCap: boolean; fsr: boolean; forceDepth: boolean; detail: boolean; shadowSlice: number } = { autoQuality: true, fadeOverride: null, frameCap: readFrameCap(), fsr: true, forceDepth: false, detail: true, shadowSlice: SHADOW_SLICE };
  let internalRatio = 1;
  const keepStats = { targets: 0, ms: 0, classifyMs: 0 };
  const envHandle = (renderer.domElement as HTMLCanvasElement & { __env: Record<string, unknown> }).__env;
  Object.assign(envHandle, { rig, post, debug, creatures, keepStats, internalRatio: () => internalRatio, setInternalRatio(r: number) { const o = outputSizes(width, height, window.devicePixelRatio || 1, r, debug.fsr); renderer.setPixelRatio(o.fsr ? o.native : o.internal); renderer.setSize(width, height, false); post.setSize(width, height, o.internal); post.setUpscale(o.fsr, o.nativeW, o.nativeH); internalRatio = o.internal; } });
  // Live getters: a field window swap replaces these objects.
  Object.defineProperties(envHandle, {
    terrain: { get: () => terrain, configurable: true }, vegetation: { get: () => vegetation, configurable: true },
    occluders: { get: () => occTable, configurable: true }, culler: { get: () => culler, configurable: true }, water: { get: () => water, configurable: true },
  });

  let quality: Quality = 'high';
  let width = 1, height = 1;
  // Canvas origin for picking, read on resize and pointerdown (no layout reads per pointer move).
  let originX = 0, originY = 0;
  function readOrigin() { const r = renderer.domElement.getBoundingClientRect(); originX = r.left; originY = r.top; }
  const layers = { canopy: true, territory: false, perception: false, labels: true, social: false, weather: true };
  let disposed = false;
  let first = true;
  let lastCamera: THREE.Camera = rig.camera;

  // Output (plan G4): the canvas backs at the display's ratio (≤ 2); scene and post render at the internal ratio and
  // FSR 1 upscales (EASU + RCAS) instead of the browser's bilinear stretch. highStep: the auto-quality step inside 'high'.
  let highStep = false;
  function applyQuality(next: Quality) {
    if (next !== 'high') highStep = false;
    quality = next;
    const o = outputSizes(width, height, window.devicePixelRatio || 1, next === 'high' && highStep ? HIGH_STEP_RATIO : INTERNAL_RATIO[next], debug.fsr);
    renderer.setPixelRatio(o.fsr ? o.native : o.internal);
    renderer.setSize(width, height, false);
    post.setSize(width, height, o.internal);
    post.setUpscale(o.fsr, o.nativeW, o.nativeH);
    internalRatio = o.internal;
    post.setQuality(next);
    sky.setShadowSize(SHADOW_SIZE[next].persp);
    vegetation.setQuality(next);
    qualityChangedAt = performance.now();
    slowSince = -1;
  }
  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    readOrigin();
    rig.resize(width, height);
    applyQuality(quality);
  }
  let qualityChangedAt = performance.now();
  let slowSince = -1;
  // Auto-quality with hysteresis. Down: under 40 fps, or over 30% dropped frames, for 3 s. Up (never above the
  // requested level): after 20 s at ≥57 fps with under 3% drops; an upgrade that slumps within 10 s is not retried
  // until the user picks a quality. A brief slump (another app on the GPU) used to lower quality for good.
  let requested: Quality = 'high';
  let dropEma = 0, smoothSince = -1, upgradedAt = -1e9, upgradeBlockedUntil = -1e9;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- Picking (forgiving, render/creatures/pick.ts): a name label first (labels take no pointer events, so drags and
  // the wheel still reach the canvas), then the animals' own pick volumes (foliage never steals a click), then the
  // nearest animal within ~28 CSS px of the cursor. Between clicks the same pick runs once a frame as the hover (pointer
  // cursor, highlighted label), and the hovered animal wins close calls. A second click on the same animal within 0.4 s
  // (double-click) also brings the camera to it: with F, the explicit way back to an animal after panning away.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hits: THREE.Intersection[] = [];
  let downX = 0, downY = 0, downButton = 0, held = false;
  let hoverX = 0, hoverY = 0, pointerIn = false, pointerKind = 'mouse', hoverId = -1, cursor = '';
  let lastClickId = -1, lastClickAt = -1e9;
  const overviewOn = () => overview !== null && overviewWeight(rig.frameHeight(), (rig.camera as THREE.PerspectiveCamera).isPerspectiveCamera === true) > 0.3;
  function pickAt(x: number, y: number, radius: number): number {
    if (!creatures) return -1;
    const label = creatures.labelAt?.(x, y) ?? -1;
    if (label >= 0) return label;
    pointer.set(x / width * 2 - 1, -y / height * 2 + 1);
    raycaster.setFromCamera(pointer, rig.camera);
    hits.length = 0;
    raycaster.intersectObjects(creatures.picks, false, hits);
    for (const h of hits) if (h.object.userData.chimpId !== undefined) return Number(h.object.userData.chimpId);
    return creatures.nearestAt?.(x, y, rig.camera, radius, hoverId) ?? -1;
  }
  function updateHover() {
    let id = -1;
    if (pointerIn && !held) {
      if (overviewOn()) id = overview!.pick(hoverX, hoverY, rig.camera, width, height) ?? -1;
      if (id < 0) id = pickAt(hoverX, hoverY, pickRadius(pointerKind));
    }
    hoverId = id;
    creatureFrame.hoverId = id;
    const c = id >= 0 ? 'pointer' : '';
    if (c !== cursor) { cursor = c; renderer.domElement.style.cursor = c; }
  }
  const onPointerDown = (e: PointerEvent) => { readOrigin(); downX = e.clientX; downY = e.clientY; downButton = e.button; held = true; };
  const onPointerMove = (e: PointerEvent) => { hoverX = e.clientX - originX; hoverY = e.clientY - originY; pointerIn = true; pointerKind = e.pointerType; held = e.buttons !== 0; };
  const onPointerLeave = () => { pointerIn = false; };
  const onPointerUp = (e: PointerEvent) => {
    held = false;
    if (downButton !== 0 || hyp2(e.clientX - downX, e.clientY - downY) > 6) return;
    const x = e.clientX - originX, y = e.clientY - originY;
    // Field overview: a click on a party marker selects a member and flies the strategy view to it.
    if (overviewOn()) {
      const id = overview!.pick(x, y, rig.camera, width, height);
      if (id !== null) { onSelect(id); rig.focusChimp(id); return; }
    }
    const id = pickAt(x, y, pickRadius(e.pointerType));
    if (id < 0) return;
    const now = performance.now(), again = id === lastClickId && now - lastClickAt < 400;
    lastClickId = again ? -1 : id; lastClickAt = now;
    if (rig.mode === 'close') rig.followId = id;
    onSelect(id);
    if (again) rig.focusChimp(id);
  };
  const onPointerCancel = () => { held = false; };
  const onContextMenu = (e: Event) => e.preventDefault();
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);

  // --- Camera ground footprint for the range map (src/ui/minimap.ts redraws it only when the version changes).
  const footprint: CameraFootprint = { pts: new Float32Array(8), fx: 0, fz: 0, version: 0, followId: -1 };
  const fpNext = new Float32Array(8);
  const viewInsets = { left: 0, right: 0, top: 0, bottom: 0 };
  function updateFootprint(camera: THREE.Camera, perspective: boolean) {
    // The part of the canvas not under UI panels, in NDC (the rig's view offset centres the focus in it).
    let x0 = -1 + 2 * viewInsets.left / width, x1 = 1 - 2 * viewInsets.right / width;
    let y0 = -1 + 2 * viewInsets.bottom / height, y1 = 1 - 2 * viewInsets.top / height;
    if (x1 - x0 < 0.1) { x0 = -1; x1 = 1; }
    if (y1 - y0 < 0.1) { y0 = -1; y1 = 1; }
    const t = rig.target;
    // Perspective views see to the horizon: the map shows four frame heights (30–150 m) of it, a display choice.
    const reach = perspective ? THREE.MathUtils.clamp(rig.frameHeight() * 4, 30, 150) : world.size * 2;
    camera.updateMatrixWorld();
    cameraFootprint(camera, x0, x1, y0, y1, terrain.walkable(t.x, t.z), reach, fpNext);
    const eps = world.size / 1500, follow = rig.mode === 'close' && rig.followId !== null ? rig.followId : -1;
    if (footprintMoved(fpNext, footprint.pts, eps) || Math.abs(t.x - footprint.fx) > eps || Math.abs(t.z - footprint.fz) > eps || follow !== footprint.followId) {
      footprint.pts.set(fpNext); footprint.fx = t.x; footprint.fz = t.z; footprint.followId = follow; footprint.version++;
    }
  }

  // --- Frame loop
  const envFrame: EnvFrame = { dt: 0, elapsed: 0, camera: rig.camera, target: new THREE.Vector3(), env, quality, mode: 'rts', weatherLayer: true, pixelWorld: 0.1 };
  const creatureFrame: CreatureFrame = { dt: 0, elapsed: 0, selectedId: null, simRate: 0, camera: rig.camera, daylight: 1, rain: 0, highlightTroopId: null, layers: { labels: true, social: false, perception: false }, closeView: false, hoverId: -1 };
  let lastNow = performance.now();
  let frameIndex = 0;
  let fps = 60;
  const diagnostics = { drawCalls: 0, triangles: 0, points: 0, fps: 60 };

  const pace = createPace();
  let lastRaf = performance.now(), skippedDt = 0;
  function update(frame: SceneFrame) {
    if (disposed) return;
    const now = performance.now();
    // Frame pacing: on ≥ 100 Hz displays the 3D view renders every other display frame (even 60 Hz); the skipped
    // frame's animation time carries into the next rendered one. Warm-up frames always run.
    observeInterval(pace, now - lastRaf);
    lastRaf = now;
    if (!warming && !shouldRender(pace, now, debug.frameCap)) { skippedDt += frame.dt; return; }
    if (skippedDt > 0) { frame.dt += skippedDt; skippedDt = 0; }
    const e0 = perfNow();
    const realDt = Math.min(0.25, (now - lastNow) / 1000);
    lastNow = now;
    if (realDt > 0) fps += (1 / realDt - fps) * Math.min(1, realDt * 2);
    if (realDt > 0) dropEma += ((realDt > 0.021 ? 1 : 0) - dropEma) * (1 - Math.exp(-realDt / 2));
    const dt = Math.max(0.0005, Math.min(frame.dt > 0 ? frame.dt : realDt, 0.1));
    renderer.info.reset();

    readEnvironment(world, env, dt, frame.elapsed, first);
    first = false;
    steadyLighting(frame.simRate, dt);
    uniforms.uTime.value = frame.elapsed;
    uniforms.uWind.value = env.wind * (motion.matches ? 0.3 : 1);
    uniforms.uWindDir.value.copy(env.windDir);
    uniforms.uWet.value = env.wet;
    uniforms.uRain.value = layers.weather ? env.rain : 0;

    rig.update(dt, frame.elapsed, frame.selectedId, frame.simRate);
    const camera = rig.camera;
    if (camera !== lastCamera) { post.setCamera(camera); lastCamera = camera; }
    const perspective = (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
    // Field profile: rebuild the window around the focus in time slices; the overview weight follows the frame height.
    const hfNow = rig.frameHeight();
    const ow = field ? overviewWeight(hfNow, perspective) : 0;
    if (fieldEnv) fieldStep(dt, perspective, hfNow, ow);
    // Canopy lens (strategy view, zoomed in): crowns thin inside a soft screen circle around the focus (plan §2.4).
    const lens = rig.lens;
    uniforms.uLens.value.set(lens.x, lens.y, lens.r * 2, layers.canopy ? lens.w : 0);
    uniforms.uLensK.value.set(width / height, lens.focusY, 0, 0);

    // Near-field understory tile sits ahead of the camera so the foreground is always dense.
    camera.getWorldDirection(tmpDir);
    uniforms.uNear.value.set(camera.position.x + tmpDir.x * 18, camera.position.z + tmpDir.z * 18, 64, perspective ? 1 : 0);
    envFrame.dt = dt; envFrame.elapsed = frame.elapsed; envFrame.camera = camera; envFrame.target.copy(rig.target);
    envFrame.quality = quality; envFrame.mode = rig.mode; envFrame.weatherLayer = layers.weather; envFrame.pixelWorld = rig.pixelWorld();
    sky.update(envFrame, renderer, scene, perspective);
    // Field overview: the strategy camera frames kilometres; haze scales with the frame so the far map stays legible.
    if (field && !perspective) sky.fog.near *= Math.min(1, 160 / Math.max(160, hfNow));
    fitShadow(camera, perspective);
    culler.update(camera, sky.key, perspective, rig.frameHeight());
    // The scene IBL is kept low for diffuse fill; water reflects it at a physical sky level (one scale for every
    // view: Fresnel, sky visibility under the crowns and absorption decide how bright the stream reads).
    water.envBoost.value = 0.45 / Math.max(0.02, scene.environmentIntensity);
    water.perspective.value = perspective ? 1 : 0;
    terrain.mountainMaterial.color.copy(sky.fogColor).lerp(tmpColor.set('#46586a').multiplyScalar(0.25 + env.daylight * 0.75), 0.28);
    vegetation.update(world, quality, env.daylight, perspective);
    weather.update(envFrame);
    territory.update(world, dt, frame.elapsed, layers.territory, frame.highlightTroopId, env.daylight, terrain.height);
    markers.update(world, frame.elapsed, terrain.walkable);

    perfEnd('env', e0);
    const c0 = perfNow();
    if (creatures) {
      creatureFrame.dt = dt; creatureFrame.elapsed = frame.elapsed; creatureFrame.selectedId = frame.selectedId; creatureFrame.simRate = frame.simRate; creatureFrame.subTick = frame.subTick ?? 0;
      creatureFrame.camera = camera; creatureFrame.daylight = env.daylight; creatureFrame.rain = env.rain; creatureFrame.highlightTroopId = frame.highlightTroopId;
      creatureFrame.layers.labels = layers.labels && ow < 0.5; creatureFrame.layers.social = layers.social; creatureFrame.layers.perception = layers.perception;
      creatureFrame.closeView = rig.mode !== 'rts';
      creatureFrame.quality = quality;
      creatureFrame.lens = uniforms.uLens.value;
      creatureFrame.aspect = width / height;
      if (!warming) updateHover();
      creatures.update(creatureFrame);
      // Field overview: animals are sub-pixel at km scale; party markers stand in for them.
      if (creatureRoot) creatureRoot.visible = ow < 1;
    }
    overview?.update(world, { weight: ow, camera, dt, selectedId: frame.selectedId, highlightTroopId: frame.highlightTroopId, viewW: width, viewH: height });
    updateKeepClear(camera, perspective, frame.selectedId, dt);
    updateFootprint(camera, perspective);
    perfEnd('creatures', c0);
    // Understory parting around the animals nearest the near-field tile (perspective views only).
    uniforms.uBendCount.value = perspective && creatures?.bendSources ? creatures.bendSources(camera.position.x + tmpDir.x * 12, camera.position.z + tmpDir.z * 12, uniforms.uBend.value) : 0;

    frameIndex++;
    renderer.shadowMap.autoUpdate = false;
    // A resized/new shadow map must render before anything samples it (a null map binds as a non-depth texture).
    // Negligible key light (deep night, overcast new moon): skip shadow renders instead of toggling castShadow.
    renderer.shadowMap.needsUpdate = !sky.key.shadow.map || (sky.keyIntensity > 0.03 && (frameIndex % SHADOW_EVERY[quality] === 0 || rig.mode === 'cinematic'));
    post.grade(env, frame.elapsed, perspective, Math.max(rig.cutDip, fieldDip));
    // Ambient occlusion ramps off in the overview (Hf ≥ 60 m: a closed canopy seen from 260 m) over 0.5 s.
    aoWeight += ((!perspective && rig.frameHeight() >= 60 ? 0 : 1) - aoWeight) * (1 - Math.exp(-dt / 0.5));
    post.setAoWeight(aoWeight < 0.02 ? 0 : aoWeight > 0.98 ? 1 : aoWeight);
    // The resolved depth feeds GTAO and depth of field; without them the resolve is skipped (probes can force it).
    post.sceneTarget.resolveDepthBuffer = debug.forceDepth || aoWeight > 0.02 || rig.mode !== 'rts';
    // Depth of field ('high' only, not with reduced motion): cinematic shots focus on the subject with a small aperture;
    // the close view opens a gentler one below 6 m (G5 D14), ramping with distance, so a close-up separates the animal.
    const fd = rig.focusDistance;
    const dofOk = quality === 'high' && !motion.matches;
    post.setFocus(fd, !dofOk ? 0 : rig.mode === 'cinematic' ? 6 : rig.mode === 'close' && fd > 0 && debug.detail ? 3.5 * (1 - THREE.MathUtils.smoothstep(fd, 3.5, 6)) : 0);
    if (warming) return;
    const r0 = perfNow();
    gpuTimer?.begin();
    post.render(dt);
    gpuTimer?.end();
    perfEnd('render', r0);
    if (renderer.info.programs && renderer.info.programs.length !== linkChecked) checkLinks();
    diagnostics.drawCalls = renderer.info.render.calls;
    diagnostics.triangles = renderer.info.render.triangles;
    diagnostics.points = renderer.info.render.points;
    diagnostics.fps = Math.round(fps * 10) / 10;

    // Auto-quality (not during warm-up or within 4 s of a switch).
    if (debug.autoQuality && now - qualityChangedAt > 4000 && frame.dt > 0) {
      if (fps < 40 || dropEma > 0.3) {
        smoothSince = -1;
        if (slowSince < 0) slowSince = now;
        else if (now - slowSince > 3000 && (DOWNGRADE[quality] || (quality === 'high' && !highStep))) {
          if (now - upgradedAt < 10000) upgradeBlockedUntil = Infinity;
          // Inside 'high', first one internal-resolution step (1.2 → 1.05), then the next tier.
          if (quality === 'high' && !highStep) { highStep = true; applyQuality('high'); }
          else applyQuality(DOWNGRADE[quality]!);
        }
      } else {
        slowSince = -1;
        const up = UPGRADE[quality];
        const canStepUp = quality === 'high' && highStep && requested === 'high';
        if (fps >= 57 && dropEma < 0.03 && ((up && RANK[up] <= RANK[requested]) || canStepUp) && now > upgradeBlockedUntil) {
          if (smoothSince < 0) smoothSince = now;
          else if (now - smoothSince > 20000) { upgradedAt = now; smoothSince = -1; if (canStepUp) { highStep = false; applyQuality('high'); } else applyQuality(up!); }
        } else smoothSince = -1;
      }
    }
  }
  const tmpColor = new THREE.Color();
  const tmpDir = new THREE.Vector3();
  let aoWeight = 1;

  // Shadow fit (plan G3, [S1]): the strategy view keeps its frame-wide extent; perspective views fit a sphere around
  // the first 50 m of the view frustum (its radius depends only on the field of view and aspect, so texel snapping in
  // followShadow keeps edges from crawling) instead of a fixed ±42 m box around the target, half of it behind the camera.
  const fitCentre = new THREE.Vector3();
  function fitShadow(camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, perspective: boolean) {
    sky.setShadowSize(perspective ? SHADOW_SIZE[quality].persp : SHADOW_SIZE[quality].rts);
    if (!perspective) { sky.followShadow(rig.target, rig.shadowExtent()); return; }
    const p = camera as THREE.PerspectiveCamera;
    const tv = Math.tan(THREE.MathUtils.degToRad(p.fov) / 2), th = tv * p.aspect, k2 = tv * tv + th * th;
    const n = p.near, f = Math.min(debug.shadowSlice, p.far);
    // Minimal sphere through the near and far corner rings: centre depth c = (f + n)(1 + k²) / 2, capped at f.
    const c = Math.min(f, (f + n) * (1 + k2) / 2), r = Math.sqrt((f - c) * (f - c) + f * f * k2);
    camera.getWorldDirection(fitCentre).multiplyScalar(c).add(camera.position);
    sky.followShadow(fitCentre, r);
  }

  // --- Field window (C5b): rebuilt around the focus in time slices, swapped in when done, freed a few frames later.
  let snapFades = false;
  const fieldStats = { builds: 0, lastBuildMs: 0, lastBuildFrames: 0, building: false, buildOrigin: [0, 0] as [number, number], maxStepMs: 0, maxUploadMs: 0 };
  let building: Generator<void, EnvWindow, void> | null = null, buildStart = 0, buildFrames = 0;
  // A built window uploads its buffers and textures over a few frames before it swaps in (one ~25 MB upload in the swap
  // frame cost 110–130 ms): it joins the scene on a parked layer, and each frame one batch of its meshes is drawn into a
  // 1×1 target by a camera that sees only the upload layer, with the scene's own lights, fog and environment (so the
  // programs are the ones already compiled).
  let uploading: { win: EnvWindow; batches: THREE.Object3D[][]; step: number } | null = null;
  const UPLOAD_LAYER = 5, PARKED_LAYER = 30;
  const preTarget = owner.own(new THREE.WebGLRenderTarget(1, 1));
  const preCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  preCam.layers.set(UPLOAD_LAYER);
  for (const light of [sky.key, sky.hemi, sky.flash]) light.layers.enable(UPLOAD_LAYER);
  const noop = () => {};
  const windowRoots = (w: EnvWindow) => [w.terrain.group, w.vegetation.group, w.water.mesh];
  function uploadBatches(next: EnvWindow): THREE.Object3D[][] {
    const meshes: THREE.Object3D[] = [];
    for (const root of windowRoots(next)) root.traverse(o => { if ((o as THREE.Mesh).isMesh) { meshes.push(o); o.layers.set(PARKED_LAYER); } });
    scene.add(...windowRoots(next));
    // Largest first (the ground), then about five meshes per frame.
    const size = (o: THREE.Object3D) => { const g = (o as THREE.Mesh).geometry; return (g.index?.count ?? 0) + g.attributes.position.count * 3 + ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).instanceMatrix.count * 16 : 0); };
    meshes.sort((a, b) => size(b) - size(a));
    const batches: THREE.Object3D[][] = [[meshes[0]]];
    for (let i = 1; i < meshes.length; i += 5) batches.push(meshes.slice(i, i + 5));
    return batches;
  }
  const saved: { m: THREE.Mesh; fc: boolean; before: THREE.Mesh['onBeforeRender']; after: THREE.Mesh['onAfterRender'] }[] = [];
  function preUpload(objects: THREE.Object3D[], textures: THREE.Texture[]) {
    for (const t of textures) renderer.initTexture(t);
    saved.length = 0;
    for (const o of objects) {
      const m = o as THREE.Mesh;
      saved.push({ m, fc: m.frustumCulled, before: m.onBeforeRender, after: m.onAfterRender });
      // Shadow-only twins skip colour draws by zeroing their count; here they must draw once so their buffers upload.
      if (m.userData.shadowOnly) { m.onBeforeRender = noop; m.onAfterRender = noop; }
      m.frustumCulled = false;
      m.layers.set(UPLOAD_LAYER);
    }
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(preTarget);
    renderer.render(scene, preCam);
    renderer.setRenderTarget(prev);
    for (const s of saved) { s.m.frustumCulled = s.fc; s.m.onBeforeRender = s.before; s.m.onAfterRender = s.after; s.m.layers.set(PARKED_LAYER); }
  }
  let pendingDispose: EnvWindow | null = null, disposeAt = 0;
  let lastFx = NaN, lastFz = NaN, focusVx = 0, focusVz = 0;
  // Exposure dip while a perspective view waits for the window after a cut or jump (a focus that runs ahead of the
  // rebuild at fast playback instead walks on the far floor under the canopy ring).
  let fieldDip = 0, dipHold = false;
  const nextCentre = [0, 0];
  function fieldStep(dt: number, perspective: boolean, hf: number, ow: number) {
    if (!fieldEnv || !win) return;
    const t = rig.target;
    // Render-side smoothed focus velocity (the window is centred a little ahead of travel); jumps reset it.
    if (Number.isFinite(lastFx) && dt > 0) {
      const vx = (t.x - lastFx) / dt, vz = (t.z - lastFz) / dt;
      if (hyp2(t.x - lastFx, t.z - lastFz) > 60) dipHold = true;
      if (hyp2(vx, vz) > 400) { focusVx = focusVz = 0; }
      else { focusVx = approach(focusVx, vx, dt, 0.6); focusVz = approach(focusVz, vz, dt, 0.6); }
    }
    lastFx = t.x; lastFz = t.z;
    // The window matters in perspective views and in the strategy view below ~1.5 km frames (it builds before it shows).
    const needed = perspective || hf < 1500;
    if (needed) {
      windowCentre(t.x, t.z, focusVx, focusVz, nextCentre, 1.5, world.size / 2);
      const stale = building && hyp2(nextCentre[0] - fieldStats.buildOrigin[0], nextCentre[1] - fieldStats.buildOrigin[1]) > 150;
      if ((!building && !uploading && needsRecentre(win.origin[0], win.origin[1], t.x, t.z) && (nextCentre[0] !== win.origin[0] || nextCentre[1] !== win.origin[1])) || stale) {
        // A superseded partial build is dropped (it has touched no GPU resource yet).
        building = fieldEnv.build(nextCentre[0], nextCentre[1]);
        fieldStats.buildOrigin = [nextCentre[0], nextCentre[1]];
        buildStart = performance.now(); buildFrames = 0;
      }
    }
    if (uploading) {
      const u = uploading;
      const u0 = performance.now();
      preUpload(u.batches[u.step], u.step === 0 ? [u.win.terrain.heightTexture, u.win.terrain.groundTexture] : []);
      fieldStats.maxUploadMs = Math.max(fieldStats.maxUploadMs, performance.now() - u0);
      buildFrames++;
      if (++u.step >= u.batches.length) { swapWindow(u.win); uploading = null; fieldStats.lastBuildMs = Math.round(performance.now() - buildStart); fieldStats.lastBuildFrames = buildFrames; }
    } else if (building) {
      // Catch up faster when the focus has left the detailed area.
      const behind = hyp2(t.x - win.origin[0], t.z - win.origin[1]) > 90;
      const r = stepFor(building, behind && needed ? (fieldDip > 0.5 ? 10 : 6) : 3, undefined, fieldStats);
      buildFrames++;
      if (r.done && r.value) { uploading = { win: r.value, batches: uploadBatches(r.value), step: 0 }; building = null; }
    }
    fieldStats.building = building !== null || uploading !== null;
    if (pendingDispose && frameIndex >= disposeAt) { fieldEnv.dispose(pendingDispose); pendingDispose = null; }
    const outside = perspective && hyp2(t.x - win.origin[0], t.z - win.origin[1]) > 110;
    if (!outside) dipHold = false;
    fieldDip = outside && dipHold ? 1 : approach(fieldDip, 0, dt, 0.2);
    const showWindow = ow < 1;
    terrain.group.visible = vegetation.group.visible = water.mesh.visible = showWindow;
    overview?.setHole(win.origin[0], win.origin[1], showWindow ? FIELD_RING_OUTER : 0);
  }
  function swapWindow(next: EnvWindow) {
    if (!fieldEnv || !win) return;
    const old = win;
    scene.remove(...windowRoots(old));
    for (const root of windowRoots(next)) root.traverse(o => o.layers.set(0));
    scene.add(...windowRoots(next));
    win = next;
    occTable = next.occ; culler = next.culler; terrain = next.terrain; vegetation = next.vegetation; water = next.water;
    uniforms.uHeight.value = terrain.heightTexture; uniforms.uGround.value = terrain.groundTexture;
    uniforms.uOrigin.value.set(next.origin[0], next.origin[1]);
    objToTrunk = new Int32Array(occTable.n).fill(-1);
    vegetation.trunkObj.forEach((obj, i) => { objToTrunk[obj] = i; });
    rig.setObstacles(vegetation.lobes, vegetation.trunkList, next.origin[0], next.origin[1]);
    weather.setShafts(vegetation.shaftSites);
    vegetation.setQuality(quality);
    vegetation.canopy.visible = layers.canopy;
    snapFades = true;
    // The old window's materials and programs are released only after the new one has drawn (no recompiles).
    if (pendingDispose) fieldEnv.dispose(pendingDispose);
    pendingDispose = old; disposeAt = frameIndex + 3;
    fieldStats.builds++;
  }
  if (field) envHandle.field = { stats: fieldStats, get origin() { return win?.origin ?? null; }, overview };

  // --- Keep-clear camera (plan §2.2–2.3): protected targets, occluder classification, fade upload.
  const cands: KeepCandidate[] = Array.from({ length: 160 }, () => ({ id: -1, x: 0, y: 0, z: 0, r: 0, host: -1, hostTree: -1, visible: false, sx: 0, sy: 0 }));
  const targets: KeepTarget[] = Array.from({ length: MAX_TARGETS }, () => ({ x: 0, y: 0, z: 0, r: 0, host: -1 }));
  const targetIds: number[] = new Array(MAX_TARGETS).fill(-1);
  const fallback: KeepTarget = { x: 0, y: 0, z: 0, r: 1.5, host: -1 };
  const occView: OccView = { cx: 0, cy: 0, cz: 0, fx: 0, fy: 0, fz: -1, ortho: true, pxK: 0.1, near: 0.4 };
  const keepDir = new THREE.Vector3();
  let keepFrame = 0, keepCamera: THREE.Camera | null = null;
  function updateKeepClear(camera: THREE.OrthographicCamera | THREE.PerspectiveCamera, perspective: boolean, selectedId: number | null, dt: number) {
    const t0 = performance.now();
    const hf = rig.frameHeight();
    const nC = creatures?.keepClearCandidates ? creatures.keepClearCandidates(cands, camera) : 0;
    let primaryHost = -1;
    for (let i = 0; i < nC; i++) {
      const c = cands[i];
      c.host = c.hostTree >= 0 ? vegetation.objOfTree(c.hostTree) : -1;
      if (rig.subjectCount > 0 && c.id === rig.subjectIds[0] && c.host >= 0) primaryHost = objToTrunk[c.host] ?? -1;
    }
    rig.subjectHost = primaryHost;
    // RTS: only in the strategy band (Hf < 60 m, with the canopy lens), so the overview frame is unchanged.
    let n = 0;
    if (perspective || hf < 60) {
      const t = rig.target;
      fallback.x = t.x; fallback.z = t.z; fallback.y = terrain.walkable(t.x, t.z) + 0.6;
      n = selectTargets(cands, nC, selectedId, rig.subjectIds, perspective ? rig.subjectCount : 0, perspective && hf < 40, perspective ? fallback : null, targets, targetIds);
    }
    camera.getWorldDirection(keepDir);
    occView.cx = camera.position.x; occView.cy = camera.position.y; occView.cz = camera.position.z;
    occView.fx = keepDir.x; occView.fy = keepDir.y; occView.fz = keepDir.z;
    occView.ortho = !perspective;
    occView.pxK = perspective ? 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov) / 2) / height : hf / height;
    occView.near = perspective ? (camera as THREE.PerspectiveCamera).near : 0;
    const rNear = perspective ? nearRadius(camera.position.distanceTo(rig.target)) : 0;
    // Classification runs on alternate frames (fades are smoothed over 0.15–0.45 s, so 30 Hz targets are ample);
    // a view change classifies at once.
    const t1 = performance.now();
    if ((keepFrame++ & 1) === 0 || camera !== keepCamera || snapFades) { classify(occTable, targets, n, occView, rNear); keepCamera = camera; }
    keepStats.classifyMs += (performance.now() - t1 - keepStats.classifyMs) * 0.05;
    // A freshly swapped field window starts at its settled fades (its trees were already clear in the old one).
    smooth(occTable, snapFades ? 10 : dt);
    snapFades = false;
    let changed = writeFade(occTable, fadeData);
    if (debug.fadeOverride !== null) { fadeData.fill(Math.round(debug.fadeOverride * 255)); changed = 1; } // harness A/B only
    if (changed) fadeTexture.needsUpdate = true;
    // Leaf clumps (per clump) and the understory (capsules) clear the same targets on the GPU.
    for (let k = 0; k < n; k++) uniforms.uKeep.value[k].set(targets[k].x, targets[k].y, targets[k].z, targets[k].r);
    uniforms.uKeepN.value = n;
    uniforms.uKeepView.value.set(keepDir.x, keepDir.y, keepDir.z, perspective ? 0 : 1);
    uniforms.uKeepMargin.value = MARGIN_IN * occView.pxK;
    uniforms.uNearR.value = rNear;
    // The host skylight opens around the primary target (perspective views).
    if (perspective && n > 0) uniforms.uCut.value.set(targets[0].x, targets[0].y, targets[0].z, targets[0].r); else uniforms.uCut.value.w = 0;
    uniforms.uCutCam.value.copy(camera.position);
    keepStats.targets = n;
    keepStats.ms += (performance.now() - t0 - keepStats.ms) * 0.05;
  }

  // Audio listener (read by src/audio): the camera's focus point, 2 m above the ground, facing the camera's heading.
  // zoom01 comes from the frame height at the focus, so the overview's orthographic zoom and the perspective
  // views' orbit distance share one scale. One object, rewritten per call (no allocation).
  const listener: ListenerPose = { x: 0, y: 2, z: 0, yaw: 0, zoom01: 1, view: 'rts' };
  const listenDir = new THREE.Vector3();
  function getListener(): ListenerPose {
    const t = rig.target, cam = rig.camera;
    cam.getWorldDirection(listenDir);
    listener.x = t.x; listener.z = t.z; listener.y = terrain.walkable(t.x, t.z) + 2;
    if (Math.abs(listenDir.x) + Math.abs(listenDir.z) > 1e-4) listener.yaw = Math.atan2(listenDir.x, -listenDir.z);
    const ortho = cam as THREE.OrthographicCamera, persp = cam as THREE.PerspectiveCamera;
    const frameH = ortho.isOrthographicCamera ? (ortho.top - ortho.bottom) / ortho.zoom
      : 2 * cam.position.distanceTo(t) * Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
    listener.zoom01 = zoomFromFrameHeight(frameH);
    listener.view = rig.mode;
    return listener;
  }

  // Link-status check for programs used since the last check (they have rendered, so compilation is done and
  // the status comes from Chrome's cached program info); logs only on failure.
  let linkChecked = 0;
  const linkSeen = new WeakSet<object>();
  function checkLinks() {
    const gl = renderer.getContext();
    const programs = (renderer.info.programs ?? []) as unknown as { program: WebGLProgram; name: string; vertexShader: WebGLShader; fragmentShader: WebGLShader }[];
    linkChecked = programs.length;
    for (const p of programs) {
      if (linkSeen.has(p)) continue;
      linkSeen.add(p);
      if (gl.getProgramParameter(p.program, gl.LINK_STATUS) === false) {
        console.error(`WebGLProgram "${p.name}" failed to link.\n${gl.getProgramInfoLog(p.program) ?? ''}\n${gl.getShaderInfoLog(p.vertexShader) ?? ''}\n${gl.getShaderInfoLog(p.fragmentShader) ?? ''}`);
      }
    }
  }

  // Above ~6 ecological hours per real second the day/night cycle would strobe. Lighting eases toward a
  // steady mid-morning sun instead; the clock and sky data are untouched.
  const steadySun = new THREE.Vector3();
  const solar = { alt: 0, az: 0 };
  let steady = 0;
  function steadyLighting(simRate: number, dt: number) {
    const hoursPerSecond = simRate / 3600;
    const want = THREE.MathUtils.smoothstep(hoursPerSecond, 6, 20);
    steady += (want - steady) * (1 - Math.exp(-dt * 1.5));
    if (steady < 0.001) return;
    solarPosition(10, env.dayOfYear, solar);
    directionFrom(solar.alt, solar.az, steadySun);
    env.sunDir.lerp(steadySun, steady).normalize();
    env.sunAltitude = Math.asin(env.sunDir.y);
    env.sunAzimuth = Math.atan2(env.sunDir.x, -env.sunDir.z);
    env.daylight = THREE.MathUtils.lerp(env.daylight, 1, steady);
    env.night = THREE.MathUtils.lerp(env.night, 0, steady);
    env.moonLight *= 1 - steady;
    env.hour = THREE.MathUtils.lerp(env.hour, 10, steady);
  }

  // Compile every program once up front (weather, fireflies, shafts and near-field plants included), so
  // neither the first frame nor the first nightfall or storm stalls. Frames render only after this.
  let warming = true;
  {
    // One state-only frame first (update() returns before rendering while warming): it builds the PMREM
    // environment, fog and lights the real frames use. Compiling before that produced programs without the
    // environment map, so the first real frame recompiled every lit material synchronously.
    update({ dt: 0, elapsed: 0, selectedId: null, simRate: 0, highlightTroopId: null });
    sky.refreshEnv(); // the first real frame re-renders the IBL at its own clock (clouds move with time)
    const hidden: THREE.Object3D[] = [];
    scene.traverse(object => { if (!object.visible) { hidden.push(object); object.visible = true; } });
    // Post-processing quads compile on first use too; compile them alongside the scene.
    const postScene = new THREE.Scene();
    const quad = new THREE.PlaneGeometry(1, 1);
    for (const material of post.materials()) postScene.add(new THREE.Mesh(quad, material));
    // After the async compile, fetch each program's uniform table a few programs per frame: that first use is a
    // synchronous GPU-process round trip (~1 ms each, ~110 programs) that would otherwise land in one long frame.
    const firstUse = () => {
      const programs = (renderer.info.programs ?? []) as unknown as { getUniforms(): unknown }[];
      let i = 0;
      const step = () => {
        if (disposed) return;
        const until = performance.now() + 8;
        while (i < programs.length && performance.now() < until) programs[i++].getUniforms();
        if (i < programs.length) requestAnimationFrame(step); else warming = false;
      };
      requestAnimationFrame(step);
    };
    const done = () => { for (const object of hidden) object.visible = false; quad.dispose(); firstUse(); };
    // Scene materials render into the post chain's multisampled target (linear, no tone mapping), and program
    // parameters follow the current target: compiling against the screen built variants no frame ever used.
    renderer.setRenderTarget(post.sceneTarget);
    const compiling = renderer.compileAsync(scene, rig.camera);
    renderer.setRenderTarget(null);
    Promise.all([compiling, renderer.compileAsync(postScene, rig.camera), post.prewarm()]).then(done, done);
  }

  function setLayer(layer: Layer, enabled: boolean) {
    layers[layer] = enabled;
    if (layer === 'canopy') vegetation.canopy.visible = enabled;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    renderer.domElement.removeEventListener('pointercancel', onPointerCancel);
    renderer.domElement.removeEventListener('contextmenu', onContextMenu);
    creatures?.dispose();
    overview?.dispose();
    if (fieldEnv && win) { if (pendingDispose) fieldEnv.dispose(pendingDispose); fieldEnv.dispose(win); }
    rig.dispose();
    post.dispose();
    owner.dispose();
    scene.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh || (object as THREE.Points).isPoints) mesh.geometry?.dispose();
      if ((object as THREE.InstancedMesh).isInstancedMesh) (object as THREE.InstancedMesh).dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    update,
    setView(mode: ViewMode) { rig.setView(mode, creatureFrame.selectedId); },
    setLayer,
    setQuality(next: Quality) { requested = next; upgradeBlockedUntil = -1e9; if (next !== quality || highStep) { highStep = false; applyQuality(next); } },
    setFrameCap(on: boolean) { debug.frameCap = on; try { if (on) localStorage.removeItem(FRAME_CAP_KEY); else localStorage.setItem(FRAME_CAP_KEY, '1'); } catch { /* storage blocked: the setting lasts for this page */ } },
    getFrameCap() { return debug.frameCap; },
    focusChimp(id: number) { rig.focusChimp(id); },
    panTo(x: number, z: number) { rig.panTo(x, z); },
    resetCamera() { rig.reset(); },
    getDiagnostics() { return { ...diagnostics }; },
    getQuality() { return quality; },
    setInsets(insets) { rig.setInsets(insets); Object.assign(viewInsets, insets); },
    getListener,
    getZoom() { return rig.zoom(); },
    getFootprint() { return footprint; },
    dispose,
  };
}
