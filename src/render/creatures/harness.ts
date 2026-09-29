// Creature harness: a lit test scene driving createCreatures with a synthetic
// World. Modes (query ?mode=): sheet (all actions), stages (life stages),
// single (&action=groom), scene (mixed RTS scene), perf (&n=120), gait (an adult and a juvenile on a figure-8
// over a 20° hill with a speed ramp, stops and 90°/180° turns; &debug=feet exposes contact data on __creatures;
// &patrol=out|listen|incursion|return runs the course as a two-animal patrol on that leg).
// patrol (&phase=out|listen|incursion|return|release|heard|cycle|none, &n=6: a border patrol in single file with a
// published Party.patrolPhase; docs/realism-design.md §5.3.1 P4b; the camera follows the middle animal).
// Other params: zoom=close|mid|far|rts, rain=0..1, night=1, sel=<id>, labels=1,
// social=1, perception=1, hl=<troopId>, rate=<eco s per s>, moving=1.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Action, CallKind, Chimp, Interaction, InteractionKind, LifeStage, Mood, Party, Sex, Troop, World } from '../../types';
import { createCreatures, type CreatureFrame } from '../creatures';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') ?? 'sheet';
const zoom = q.get('zoom') ?? (mode === 'scene' || mode === 'perf' ? 'rts' : 'close');
const rain = Number(q.get('rain') ?? 0);
const night = q.has('night');
const simRate = Number(q.get('rate') ?? (mode === 'patrol' ? 4 : 60));
const stage = document.getElementById('stage')!;
const hud = document.getElementById('hud')!;

// --- Renderer / scene ------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const daylight = night ? 0.05 : 1;
scene.background = new THREE.Color(night ? '#0b1320' : '#86a594');
scene.fog = new THREE.FogExp2(night ? '#0b1320' : '#86a594', zoom === 'rts' ? 0.0035 : 0.012);
scene.add(new THREE.HemisphereLight(night ? '#40507a' : '#d6ead2', night ? '#0d1410' : '#3b4a30', night ? 0.35 : 1.5));
const sun = new THREE.DirectionalLight(night ? '#9fb4ff' : '#fff0cf', night ? 0.35 : 3.1);
sun.position.set(-30, 60, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sh = zoom === 'rts' ? 70 : 22;
Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, near: 1, far: 200 });
sun.shadow.normalBias = 0.05; sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const flat = q.has('flat') || mode === 'stages' || mode === 'sheet' || mode === 'single';
function groundHeight(x: number, z: number) {
  if (flat) return 0.02 * Math.sin(x * 0.9) * Math.sin(z * 0.8);
  // Gait course: bumps plus a smooth hill whose flanks reach ~20° (slope 0.36).
  if (mode === 'gait') return 1.4 * Math.exp(-((x - 3) ** 2 + (z + 1) ** 2) / 12) + 0.06 * Math.sin(x * 1.7) * Math.sin(z * 1.3) + 0.03 * Math.sin(x * 4.1 + z * 2.3);
  return 0.55 * Math.sin(x * 0.075) * Math.cos(z * 0.065) + 0.25 * Math.sin(x * 0.21 + z * 0.13) + 0.08 * Math.sin(x * 0.9) * Math.sin(z * 0.8);
}
const groundGeo = new THREE.PlaneGeometry(260, 260, 260, 260);
groundGeo.rotateX(-Math.PI / 2);
const gp = groundGeo.getAttribute('position');
const gcol = new Float32Array(gp.count * 3);
const cMoss = new THREE.Color('#4a5d32'), cEarth = new THREE.Color('#6e6040'), tmpC = new THREE.Color();
for (let i = 0; i < gp.count; i++) {
  const x = gp.getX(i), z = gp.getZ(i);
  gp.setY(i, groundHeight(x, z));
  tmpC.copy(cMoss).lerp(cEarth, 0.5 + 0.5 * Math.sin(x * 0.3 + Math.sin(z * 0.25) * 2) * Math.cos(z * 0.21));
  gcol.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);

// --- Synthetic world -----------------------------------------------------------------
const troops: Troop[] = [
  { id: 0, name: 'Ngogo Central', color: '#f0a64a', emblem: 'C', center: [0, 0, 0], radius: 60, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
  { id: 1, name: 'Ngogo West', color: '#5cc8e8', emblem: 'W', center: [-60, 0, 0], radius: 50, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
  { id: 2, name: 'Mitumba', color: '#c686f0', emblem: 'M', center: [60, 0, 0], radius: 50, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
];
const world: World = {
  seed: 1, time: 10, day: 1, hour: 10, tick: 0, size: 160,
  chimps: [], trees: [], troops, water: [], events: [], parties: [], interactions: [], calls: [], prey: [], stimuli: [],
  environment: { weather: rain > 0.3 ? 'rain' : 'clear', rain, cloud: rain, wind: 0.2, humidity: 0.7, temperature: 22, lightningAt: -1, season: 'wet', dayOfYear: 100, daylight, sunAltitude: 0.8, sunAzimuth: 2, moonPhase: 0.5, fruitIndex: 0.5 },
  rng: 1, nextId: 1000, births: 0, deaths: 0,
  stats: { births: 0, deaths: 0, conflicts: 0, injuries: 0, groomingBouts: 0, playBouts: 0, hunts: 0, huntSuccesses: 0, intergroupEncounters: 0, killings: 0, takeovers: 0, transfers: 0, reconciliations: 0 },
  ageRate: 1, modelPolicy: { mode: 'off', asyncGraceMinutes: 5 },
};
let nextId = 1;
const NAMES = ['Kato', 'Nia', 'Obi', 'Luma', 'Asha', 'Bwambale', 'Kigere', 'Mulindwa', 'Rwatoro', 'Tanu', 'Zuri', 'Imani', 'Jabari', 'Kesi', 'Lomo', 'Masudi', 'Neema', 'Oko', 'Pendo', 'Rafiki'];
function stageOf(age: number): LifeStage { return age < 5 ? 'infant' : age < 9 ? 'juvenile' : age < 15 ? 'adolescent' : age < 35 ? 'adult' : 'elder'; }
function rnd(seed: number) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
interface ChimpOpts { age: number; sex: Sex; x: number; z: number; action: Action; troop?: number; heading?: number; target?: number; y?: number; mood?: Mood; vocal?: CallKind | null; swelling?: number; injury?: number; mother?: number; meat?: number; rank?: number; }
function chimp(o: ChimpOpts): Chimp {
  const id = nextId++;
  const c: Chimp = {
    id, name: `${NAMES[id % NAMES.length]}${id >= NAMES.length ? ' ' + Math.floor(id / NAMES.length) : ''}`, troopId: o.troop ?? 0, natalTroopId: o.troop ?? 0, sex: o.sex, age: o.age, stage: stageOf(o.age),
    position: [o.x, o.y ?? 0, o.z], heading: o.heading ?? 0, action: o.action, targetId: o.target ?? -1, actionTime: 600,
    hunger: 0.3, thirst: 0.3, energy: 0.8, social: 0.5, stress: 0.2, health: 1, rank: 0.5, elo: 1000, rankOrder: o.rank ?? 0, motherId: o.mother ?? -1, fatherId: -1,
    birthTime: 0, deathTime: null, causeOfDeath: null, skills: { climbing: 0.5, foraging: 0.5, hunting: 0.5, social: 0.5 }, bonds: {},
    personality: { boldness: 0.5, sociability: 0.5, aggression: 0.5, playfulness: 0.5 },
    appearance: { fur: rnd(id * 3.1), face: rnd(id * 5.7), build: rnd(id * 7.3), brow: rnd(id * 9.1), ears: rnd(id * 11.9) },
    memory: [], episodes: [], candidates: [], reason: '', decisionSource: 'rules', decisionVersion: 0, nextDecision: 0, controller: 'rules', awaitingDecisionSince: null,
    alive: o.action !== 'dead', pregnancy: 0, cooldown: 0, injury: o.injury ?? 0, swelling: o.swelling ?? 0, cycleDay: -1, lactating: false, carryingMeat: o.meat ?? 0,
    nest: null, mood: o.mood ?? 'calm', vocal: o.vocal ?? null, vocalUntil: o.vocal ? 1e9 : 0, partyId: 0, lastConflict: null, allies: [],
  };
  if (o.action === 'dead') c.deathTime = world.time - 2;
  world.chimps.push(c);
  return c;
}
let nextTree = 1;
const treeMeshes = new THREE.Group();
scene.add(treeMeshes);
const bark = new THREE.MeshStandardMaterial({ color: '#5a4a36', roughness: 1 });
const leafMat = new THREE.MeshStandardMaterial({ color: '#3d6b34', roughness: 1, transparent: true, opacity: q.has('crowns') ? 1 : 0.22, depthWrite: false });
function tree(x: number, z: number, height = 14) {
  const id = nextTree++;
  world.trees.push({ id, species: 'Ficus', common: 'fig', position: [x, 0, z], height, canopy: 5, fruit: 0.5, maxFruit: 1 });
  const g = groundHeight(x, z);
  const r = 0.28 + height * 0.017;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, height, 8), bark);
  trunk.position.set(x, g + height / 2, z); trunk.castShadow = trunk.receiveShadow = true;
  treeMeshes.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(Math.min(4, height * 0.3), 12, 8), leafMat);
  crown.scale.set(1, 0.5, 1); crown.position.set(x, g + height + 0.5, z);
  treeMeshes.add(crown);
  return world.trees[world.trees.length - 1];
}
function treeAnchor(id: number, out: THREE.Vector3) {
  const t = world.trees.find(tt => tt.id === id);
  if (!t) return false;
  out.set(t.position[0], groundHeight(t.position[0], t.position[2]) + t.height * 0.95, t.position[2]);
  return true;
}
let iid = 1;
function interaction(kind: InteractionKind, a: Chimp, b: Chimp | null, intensity = 0.6): Interaction {
  const it: Interaction = { id: iid++, kind, actorId: a.id, targetId: b?.id ?? -1, participants: b ? [a.id, b.id] : [a.id], start: world.time, end: null, position: [a.position[0], 0, a.position[2]], intensity, troopId: a.troopId };
  world.interactions.push(it);
  return it;
}

// Movers: animals that walk loops so gaits and streaks are visible.
interface Mover { c: Chimp; cx: number; cz: number; r: number; speed: number; ang: number; vertical?: boolean; }
const movers: Mover[] = [];
const captions: { x: number; y: number; z: number; text: string }[] = [];
const tiles: { x: number; z: number; text: string; action: Action }[] = [];

const ACTIONS: Action[] = ['rest', 'forage', 'drink', 'travel', 'groom', 'play', 'follow', 'climb', 'patrol', 'display', 'flee', 'hunt', 'mate', 'nurse', 'dead',
  'nest', 'pant-grunt', 'charge', 'attack', 'submit', 'reconcile', 'console', 'share', 'beg', 'guard', 'consort', 'shelter', 'call', 'transfer', 'alarm'];

function setupAction(action: Action, x: number, z: number, moving: boolean) {
  const heading = -0.5;
  const male = (s: Partial<ChimpOpts> = {}) => chimp({ age: 24, sex: 'male', x, z, action, heading, ...s });
  const female = (s: Partial<ChimpOpts> = {}) => chimp({ age: 21, sex: 'female', x, z, action, heading, ...s });
  switch (action) {
    case 'groom': { const b = female({ action: 'rest', x: x + 0.9, z: z + 0.3 }); const a = male({ target: b.id }); interaction('groom', a, b); break; }
    case 'play': { const a = chimp({ age: 6, sex: 'male', x, z, action: 'play', heading, vocal: 'laugh', mood: 'playful' }); const b = chimp({ age: 5, sex: 'female', x: x + 0.6, z, action: 'play', target: a.id, mood: 'playful' }); a.targetId = b.id; interaction('play', a, b); break; }
    case 'climb': { const t = tree(x + 0.3, z - 0.6, mode === 'sheet' ? 6 : 12); const a = male({ target: t.id, y: 2.5 }); movers.push({ c: a, cx: x, cz: z, r: 0, speed: 0.6, ang: 0, vertical: true }); break; }
    case 'nest': { const th = mode === 'sheet' ? 4 : 8; const t = tree(x + 0.2, z - 0.5, th); const a = female({ y: th * 0.8 }); a.nest = { treeId: t.id, position: [x + 1.5, th * 0.8, z] }; a.actionTime = q.has('build') ? 30 : 3600; break; }
    case 'mate': { const f = female({ action: 'mate', swelling: 1, x: x + 0.5 }); const m = male({ target: f.id }); f.targetId = m.id; interaction('mate', m, f); break; }
    case 'nurse': { const m = female({}); m.lactating = true; const inf = chimp({ age: 0.4, sex: 'female', x: x + 0.2, z, action: 'nurse', mother: m.id }); m.targetId = inf.id; break; }
    case 'attack': { const b = male({ action: 'submit', age: 17, x: x + 0.7, vocal: 'scream', mood: 'fearful' }); const a = male({ target: b.id, mood: 'aggressive', vocal: 'bark' }); interaction('fight', a, b, 0.8); break; }
    case 'submit': { const d = male({ action: 'display', x: x + 1.3, age: 28, rank: 1 }); female({ target: d.id, vocal: 'scream', mood: 'fearful' }); break; }
    case 'pant-grunt': { const d = male({ action: 'rest', x: x + 1.2, age: 28, rank: 1 }); male({ age: 15, target: d.id, vocal: 'pant-grunt' }); break; }
    case 'reconcile': { const b = male({ action: 'rest', x: x + 0.8, age: 19 }); const a = male({ target: b.id }); interaction('reconcile', a, b); break; }
    case 'console': { const b = female({ action: 'rest', x: x + 0.8, age: 14, vocal: 'whimper', mood: 'distressed' }); const a = female({ target: b.id }); interaction('console', a, b); break; }
    case 'beg': { const b = male({ action: 'share', x: x + 1.0, meat: 0.8 }); const a = female({ target: b.id, vocal: 'whimper' }); b.targetId = a.id; interaction('beg', a, b); break; }
    case 'share': { const b = female({ action: 'beg', x: x + 1.0, vocal: 'whimper' }); const a = male({ target: b.id, meat: 0.8 }); b.targetId = a.id; interaction('share', a, b); break; }
    case 'guard': { const f = female({ action: 'forage', x: x + 1.4, swelling: 1 }); male({ target: f.id }); break; }
    case 'consort': { const f = female({ action: 'consort', x: x + 1.0, swelling: 0.9 }); const m = male({ target: f.id }); f.targetId = m.id; break; }
    case 'dead': male({ age: 38 }); break;
    case 'call': male({ vocal: 'pant-hoot' }); break;
    case 'alarm': female({ vocal: 'alarm-hoo', mood: 'fearful' }); break;
    case 'display': { const a = male({ mood: 'aggressive', vocal: 'pant-hoot' }); interaction('display', a, null); if (moving) movers.push({ c: a, cx: x, cz: z, r: 1.6, speed: 1.1, ang: 0 }); break; }
    case 'charge': { const a = male({ mood: 'aggressive' }); interaction('charge', a, null); if (moving) movers.push({ c: a, cx: x, cz: z, r: 1.6, speed: 2.4, ang: 0 }); break; }
    case 'flee': { const a = female({ mood: 'fearful', vocal: 'scream' }); if (moving) movers.push({ c: a, cx: x, cz: z, r: 1.6, speed: 2.2, ang: 0 }); break; }
    case 'travel': case 'follow': case 'patrol': case 'transfer': case 'hunt': {
      const a = action === 'transfer' ? chimp({ age: 11, sex: 'female', x, z, action, heading }) : action === 'travel' ? female({}) : male({});
      if (moving) movers.push({ c: a, cx: x, cz: z, r: 1.6, speed: action === 'hunt' ? 2.2 : action === 'patrol' || action === 'transfer' ? 0.55 : 0.9, ang: 0 });
      if (action === 'travel') chimp({ age: 1.5, sex: 'male', x, z, action: 'follow', mother: a.id });
      break;
    }
    case 'shelter': female({}); break;
    case 'forage': {
      if (q.has('perch')) { const t = tree(x + 0.1, z, 12); male({ y: 7, x: t.position[0], z: t.position[2] }); female({ y: 8.5, x: t.position[0] + 0.2, z: t.position[2], action: 'rest' }); break; }
      male({}); break;
    }
    default: male({}); break;
  }
}

const camTarget = new THREE.Vector3(0, 0.6, 0);
const camPos = new THREE.Vector3(3, 2.2, 5);
let ortho = false;
if (mode === 'sheet') {
  const cols = 6, sp = 4.2;
  const moving = q.has('moving');
  ACTIONS.forEach((act, i) => {
    const cx = (i % cols - (cols - 1) / 2) * sp, cz = (Math.floor(i / cols) - 2) * sp;
    setupAction(act, cx, cz, moving);
    captions.push({ x: cx, y: groundHeight(cx, cz) - 0.15, z: cz + 1.5, text: act });
  });
  camTarget.set(0, 0.2, 0.6); camPos.set(0, 30, 21);
} else if (mode === 'tiles') {
  // Every action far apart; each gets its own viewport camera.
  const list = (q.get('actions')?.split(',') as Action[] | undefined) ?? ACTIONS;
  const cols = Number(q.get('cols') ?? 6);
  list.forEach((act, i) => {
    const cx = (i % cols) * 14, cz = Math.floor(i / cols) * 14;
    setupAction(act, cx, cz, q.has('moving'));
    tiles.push({ x: cx, z: cz, text: act, action: act });
  });
} else if (mode === 'faces') {
  const list: [number, Sex, string, number?][] = [[0.3, 'female', 'infant 0.3 y'], [2, 'male', 'infant 2 y'], [4.5, 'female', 'infant 4.5 y'], [7, 'male', 'juvenile 7 y'], [12, 'female', 'adolescent ♀ 12'], [14, 'male', 'adolescent ♂ 14'],
    [20, 'female', 'adult ♀ 20'], [25, 'male', 'adult ♂ 25'], [30, 'female', 'adult ♀ 30', 1], [44, 'female', 'elder ♀ 44'], [42, 'male', 'elder ♂ 42'], [36, 'male', 'adult ♂ 36', 2]];
  list.forEach(([age, sex, text, v], i) => {
    const x = (i % 6) * 14, z = Math.floor(i / 6) * 14;
    const c = chimp({ age, sex, x, z, action: 'rest', heading: 0, vocal: (q.get('vocal') as CallKind | null) ?? null, mood: (q.get('mood') as Mood | null) ?? 'calm' });
    if (v) c.appearance = { fur: v === 1 ? 0.9 : 0.1, face: v === 1 ? 0.95 : 0.05, build: 0.5, brow: v === 2 ? 1 : 0.5, ears: v === 1 ? 1 : 0.2 };
    tiles.push({ x, z, text, action: 'rest' });
  });
} else if (mode === 'stages') {
  const list: [number, Sex, string, Partial<ChimpOpts>][] = [
    [0.4, 'female', 'infant 0.4 y', {}], [1.5, 'male', 'infant 1.5 y', {}], [3.5, 'female', 'infant 3.5 y', {}], [6.5, 'male', 'juvenile 6.5 y', {}],
    [10.5, 'female', 'adolescent ♀ 10.5', {}], [13, 'male', 'adolescent ♂ 13', {}], [22, 'female', 'adult ♀ 22 (swollen)', { swelling: 1 }], [26, 'male', 'adult ♂ 26', {}],
    [44, 'female', 'elder ♀ 44', {}], [41, 'male', 'elder ♂ 41', {}],
  ];
  const act = (q.get('action') ?? 'travel') as Action;
  list.forEach(([age, sex, text, extra], i) => {
    const x = (i - (list.length - 1) / 2) * 1.25, z = 0;
    chimp({ age, sex, x, z, action: act, heading: q.has('back') ? Math.PI : -0.35, ...extra });
    captions.push({ x, y: groundHeight(x, z) - 0.1, z: z + 1.0, text });
  });
  camTarget.set(0, 0.6, 0); camPos.set(0, 1.9, 13.5);
} else if (mode === 'single' && q.has('deadcarry')) {
  // A mother carrying her dead infant (Chimp.carryingDeadId); &moving=1 walks her in a circle.
  const m = chimp({ age: 22, sex: 'female', x: 0, z: 0, action: q.has('moving') ? 'travel' : 'rest', heading: -0.5 });
  const inf = chimp({ age: 0.6, sex: 'male', x: 3, z: 2, action: 'dead', mother: m.id });
  inf.deathTime = world.time - 30;
  m.carryingDeadId = inf.id;
  if (q.has('moving')) movers.push({ c: m, cx: 0, cz: 0, r: 1.6, speed: 0.9, ang: 0 });
  if (q.has('drop')) setTimeout(() => { m.carryingDeadId = -1; }, Number(q.get('drop')) * 1000);
  camTarget.set(0.4, 0.6, 0); camPos.set(2.8, 2.0, 4.6);
} else if (mode === 'single') {
  const act = (q.get('action') ?? 'groom') as Action;
  setupAction(act, 0, 0, q.has('moving'));
  camTarget.set(0.4, 0.6, 0); camPos.set(2.8, 2.0, 4.6);
  if (act === 'nest' || act === 'climb') { camTarget.set(0.5, 5, 0); camPos.set(6, 7, 10); }
} else if (mode === 'scene' || mode === 'perf') {
  const n = Number(q.get('n') ?? 60);
  for (let i = 0; i < 26; i++) tree((rnd(i * 1.3) - 0.5) * 120, (rnd(i * 2.9) - 0.5) * 80, 10 + rnd(i) * 10);
  const acts: Action[] = ['rest', 'forage', 'travel', 'groom', 'play', 'travel', 'forage', 'rest', 'display', 'call', 'patrol', 'travel', 'hunt', 'drink', 'shelter', 'pant-grunt'];
  for (let i = 0; i < n; i++) {
    const troop = i % 3;
    const t = troops[troop];
    const age = i % 7 === 0 ? 1 + rnd(i) * 3 : i % 5 === 0 ? 6 + rnd(i) * 6 : 15 + rnd(i * 3.3) * 25;
    const x = t.center[0] * 0.8 + (rnd(i * 4.1) - 0.5) * 40, z = (rnd(i * 6.7) - 0.5) * 60;
    const action = acts[i % acts.length];
    const c = chimp({ age, sex: rnd(i * 8.1) > 0.5 ? 'male' : 'female', x, z, action, troop, heading: rnd(i) * 6, rank: 1 + (i % 9), swelling: rnd(i * 2.2) > 0.7 ? 1 : 0 });
    if (action === 'travel' || action === 'patrol' || action === 'hunt' || action === 'display') movers.push({ c, cx: x, cz: z, r: 3 + rnd(i) * 6, speed: action === 'hunt' ? 2.2 : 1, ang: rnd(i) * 6 });
    if (action === 'call') c.vocal = 'pant-hoot';
  }
  for (const t of troops) { const members = world.chimps.filter(c => c.troopId === t.id && c.sex === 'male' && c.age > 16); if (members[0]) { t.alphaId = members[0].id; members[0].rankOrder = 1; } }
  for (const c of world.chimps) for (let k = 0; k < 3; k++) { const o = world.chimps[Math.floor(rnd(c.id * 13 + k) * world.chimps.length)]; if (o.troopId === c.troopId && o !== c) c.bonds[o.id] = 0.4 + rnd(c.id + k) * 0.6; }
  for (const c of world.chimps) if (c.action === 'groom') { const o = world.chimps.find(o2 => o2 !== c && o2.troopId === c.troopId && o2.action === 'rest'); if (o) { c.targetId = o.id; c.position[0] = o.position[0] - 0.8; c.position[2] = o.position[2]; interaction('groom', c, o); } }
  for (const c of world.chimps) if (c.age < 4.5) { const m = world.chimps.find(o => o.troopId === c.troopId && o.sex === 'female' && o.age > 16 && !world.chimps.some(k => k.motherId === o.id)); if (m) { c.motherId = m.id; c.position[0] = m.position[0] + 0.4; c.position[2] = m.position[2]; } }
  world.prey.push({ id: 1, species: 'red colobus', position: [10, 0, -12], heading: 1, size: 14, alert: 0 });
  const it = interaction('intergroup', world.chimps[3], world.chimps[4]); it.position = [-25, 0, 8];
  // Two parties per community (split north/south) so party outlines and banners can be checked.
  let pid = 1;
  for (const t of troops) for (const south of [false, true]) {
    const members = world.chimps.filter(c => c.troopId === t.id && (c.position[2] > 0) === south);
    if (members.length < 2) continue;
    const id = pid++;
    for (const c of members) c.partyId = id;
    const cx = members.reduce((s2, c) => s2 + c.position[0], 0) / members.length, cz = members.reduce((s2, c) => s2 + c.position[2], 0) / members.length;
    world.parties.push({ id, troopId: t.id, members: members.map(c => c.id), center: [cx, 0, cz], kind: south ? 'foraging' : 'traveling' });
  }
  if (q.has('model')) for (const c of world.chimps.slice(0, 12)) c.controller = 'model';
  ortho = zoom === 'rts';
  if (!ortho) { camTarget.set(0, 0.5, 0); camPos.set(14, 12, 26); }
}
// --- Border patrol: a file of adult males walking along +x (path distance s; lateral offset in z). Speeds are
// ecological m/s: a walk of 0.25, 0.6× in neighbour range and 1.3× home (P4a; each step stays under the playback's
// 6 m-per-tick relocation threshold); the file gap is 3 m and closes to
// 0.55× at a listening stop. Release: the party's phase is withdrawn and the males display, drum and pant-hoot as
// the sim's release does (a 'display' interaction with 'drum' and 'pant-hoot' calls).
interface PatrolRig { party: Party; file: Chimp[]; s: number[]; lat: number[]; cycle: number; stage: string; stageAt: number; inters: Interaction[]; strangerAt: number; treeIds: number[]; treeObjs: THREE.Object3D[]; }
const PATROL_SPEED: Record<string, number> = { out: 0.25, listen: 0, incursion: 0.15, return: 0.33, release: 0 };
const PATROL_GAP = 3;
const patrolPhaseArg = q.get('phase') ?? 'cycle';
const PATROL_PLAN: [string, number][] = patrolPhaseArg === 'cycle' ? [['out', 14], ['listen', 9], ['incursion', 14], ['listen', 7], ['return', 9], ['release', 14]]
  : patrolPhaseArg === 'release' ? [['return', 8], ['release', 1e9]]
  : patrolPhaseArg === 'heard' ? [['listen', 1e9]]
  : [[patrolPhaseArg, 1e9]];
let patrolRig: PatrolRig | null = null;
let callId = 1;
function pushCall(kind: CallKind, c: Chimp, radius: number) {
  world.calls.push({ id: 5_000_000 + callId++, kind, callerId: c.id, troopId: c.troopId, position: [c.position[0], 0, c.position[2]], time: world.time, radius });
  c.vocal = kind; c.vocalUntil = world.time + (kind === 'drum' ? 0.5 : 0.75) / 60;
}
if (mode === 'patrol') {
  const n = Math.max(2, Number(q.get('n') ?? 6));
  const file: Chimp[] = [];
  for (let i = 0; i < n; i++) file.push(chimp({ age: 18 + rnd(i * 3.7) * 17, sex: 'male', x: 0, z: 0, action: 'patrol', heading: Math.PI / 2, rank: i + 1 }));
  // The file starts centred on the origin (12 m further back in the cycle, so the release happens near it).
  const s0 = (n - 1) * PATROL_GAP / 2 - (patrolPhaseArg === 'cycle' ? 12 : 0);
  const party: Party = { id: file[0].id, troopId: 0, members: file.map(c => c.id), center: [0, 0, 0], kind: 'patrol', patrolPhase: 'out' };
  for (const c of file) { c.partyId = party.id; c.targetId = c === file[0] ? -1 : file[0].id; }
  world.parties.push(party);
  patrolRig = { party, file, s: file.map((_, i) => s0 - i * PATROL_GAP), lat: file.map((_, i) => (rnd(i * 5.3) - 0.5) * 0.3), cycle: -1, stage: '', stageAt: 0, inters: [], strangerAt: -1, treeIds: [], treeObjs: [] };
  file.forEach((c, i) => { c.position[0] = patrolRig!.s[i]; c.position[2] = patrolRig!.lat[i]; });
  // A backdrop beyond the path; nothing between the camera (+z side) and the file.
  for (let k = 0; k < 12; k++) tree(-40 + k * 10 + rnd(k) * 4, -(8 + rnd(k * 2.3) * 7), 12 + rnd(k) * 8);
  camTarget.set(0, 0.6, 0); camPos.set(-7, 3.6, 11);
  ortho = zoom === 'rts'; // &zoom=rts: the strategy view (party outlines, the patrol's file line, banners with labels=1)
}
function patrolStage(t: number): [string, number, number] {
  const total = PATROL_PLAN.reduce((a, [, d]) => a + d, 0);
  const cycle = Number.isFinite(total) && total < 1e8 ? Math.floor(t / total) : 0;
  let u = Number.isFinite(total) && total < 1e8 ? t - cycle * total : t;
  for (const [ph, dur] of PATROL_PLAN) { if (u < dur) return [ph, t - u, cycle]; u -= dur; }
  return [PATROL_PLAN[PATROL_PLAN.length - 1][0], t, cycle];
}
/** Release trunks just off the far side of the path ahead of the second and third animals (the drummers). */
function placeReleaseTrees(r: PatrolRig) {
  for (const o of r.treeObjs) { treeMeshes.remove(o); (o as THREE.Mesh).geometry.dispose(); }
  world.trees = world.trees.filter(t => !r.treeIds.includes(t.id)); // a new array: the creature layer re-indexes
  r.treeIds = []; r.treeObjs = [];
  for (const i of [1, 2]) {
    const c = r.file[i];
    if (!c) continue;
    const before = treeMeshes.children.length;
    r.treeIds.push(tree(c.position[0] + 1.25, c.position[2] - 1.3, i === 1 ? 16 : 13).id);
    r.treeObjs.push(...treeMeshes.children.slice(before));
  }
}
function stepPatrol(dtEco: number) {
  const r = patrolRig!;
  const [stage, at, cycle] = patrolStage(elapsed);
  const file = r.file, n = file.length;
  if (cycle !== r.cycle) {
    // New cycle: the file restarts behind the release point, walking out.
    r.cycle = cycle;
    const s0 = (n - 1) * PATROL_GAP / 2 - (patrolPhaseArg === 'cycle' ? 12 : 0);
    for (let i = 0; i < n; i++) { r.s[i] = s0 - i * PATROL_GAP; const c = file[i]; c.action = 'patrol'; c.vocal = null; c.vocalUntil = 0; c.targetId = i ? file[0].id : -1; }
    for (const it of r.inters) it.end = world.time;
    r.inters.length = 0; world.calls.length = 0;
    r.stage = '';
  }
  if (stage !== r.stage) {
    r.stage = stage; r.stageAt = at;
    if (stage === 'release') {
      placeReleaseTrees(r);
      r.party.patrolPhase = undefined; r.party.kind = 'social';
      file.forEach((c, i) => {
        c.targetId = -1;
        if (i === 0) { c.action = 'display'; c.mood = 'aggressive'; r.inters.push(interaction('display', c, null, 0.8)); pushCall('drum', c, 60); }
        else if (i === 1) { c.action = 'call'; c.mood = 'excited'; pushCall('pant-hoot', c, 60); pushCall('drum', c, 60); }
        else if (i === 2) { c.action = 'display'; c.mood = 'aggressive'; r.inters.push(interaction('display', c, null, 0.7)); pushCall('drum', c, 60); }
        else { c.action = 'call'; c.mood = 'excited'; c.vocal = null; }
      });
    } else {
      r.party.patrolPhase = stage === 'none' ? undefined : stage as Party['patrolPhase']; r.party.kind = 'patrol'; // none: today's sim
      for (const c of file) { c.action = 'patrol'; c.mood = 'calm'; }
    }
  }
  const since = elapsed - r.stageAt;
  if (stage === 'release') {
    // Pant-hoot chorus: the others join one after another; the leader's run ends in a pant-hoot.
    file.forEach((c, i) => { if (i >= 3 && c.vocal === null && since > 0.4 + (i - 3) * 0.7) pushCall('pant-hoot', c, 60); });
    const lead = file[0];
    if (lead.action === 'display' && since < 3) r.s[0] += 0.6 * dtEco;
    else if (lead.action === 'display') { lead.action = 'call'; pushCall('pant-hoot', lead, 60); }
  } else {
    const v = PATROL_SPEED[stage] ?? 0;
    const gap = stage === 'listen' ? PATROL_GAP * 0.55 : PATROL_GAP;
    r.s[0] += v * dtEco;
    for (let i = 1; i < n; i++) {
      // Followers keep their place in the file; at a stop they close up at walking pace.
      const want = r.s[i - 1] - gap;
      r.s[i] = r.s[i] < want ? Math.min(want, r.s[i] + Math.max(v, PATROL_SPEED.out) * 1.1 * dtEco) : r.s[i];
    }
  }
  if (patrolPhaseArg === 'heard' && since > 4 && world.time * 3600 - r.strangerAt > 180) {
    // A stranger's pant-hoot from 45 m to the north-east (community 1).
    r.strangerAt = world.time * 3600;
    world.calls.push({ id: 5_000_000 + callId++, kind: 'pant-hoot', callerId: 99999, troopId: 1, position: [r.s[0] + 30, 0, -35], time: world.time, radius: 80 });
  }
  let cx = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    const c = file[i];
    const x = r.s[i], z = r.lat[i];
    const dx = x - c.position[0], dz = z - c.position[2];
    if (dx * dx + dz * dz > 1e-6) c.heading = Math.atan2(dx, dz);
    else if (stage !== 'release') c.heading = Math.PI / 2;
    c.position[0] = x; c.position[2] = z;
    cx += x; cz += z;
  }
  r.party.center[0] = cx / n; r.party.center[2] = cz / n;
  for (let i = world.calls.length - 1; i >= 0; i--) if (world.time - world.calls[i].time > 10 / 60) world.calls.splice(i, 1);
}
interface Course { c: Chimp; t: number; s: number; x: number; z: number; heading: number; size: number; }
const courses: Course[] = [];
const coursePatrol = mode === 'gait' ? (q.get('patrol') as Party['patrolPhase'] | null) : null;
if (mode === 'gait') {
  for (const [age, sex, off] of [[24, 'male', 0], [7, 'female', 0.5]] as const) {
    const c = chimp({ age, sex, x: 0, z: 0, action: 'travel', heading: 0 });
    courses.push({ c, t: 0, s: off * 60, x: 0, z: 0, heading: 0, size: age > 15 ? 1.5 : 1.05 });
  }
  if (coursePatrol) {
    const ids = courses.map(k => k.c.id);
    for (const k of courses) { k.c.partyId = ids[0]; k.c.action = 'patrol'; }
    world.parties.push({ id: ids[0], troopId: 0, members: ids, center: [0, 0, 0], kind: 'patrol', patrolPhase: coursePatrol });
  }
  camTarget.set(0, 0.6, 0); camPos.set(0, 9, 14);
}
/** Figure-8 point at arc parameter th (radius 6 m). */
function eight(th: number): [number, number] { return [6 * Math.sin(th), 6 * Math.sin(th) * Math.cos(th)]; }
// Speed schedule (body lengths per real second at 1 min/s): a ramp from 0.5 to 3 with a stop every 9 s; stops
// alternate 90° and 180° turns in place before the walk resumes.
function courseSpeed(t: number): number { const cyc = t % 9; return cyc > 7.5 ? 0 : 0.5 + 2.5 * ((t % 45) / 45); }
function stepCourse(k: Course, dtEco: number) {
  const real = dtEco / simRate;
  k.t += real;
  const u = courseSpeed(k.t);
  const c = k.c;
  if (u <= 0) {
    // Stationary: turn in place (90° on even stops, 180° on odd) during the first second of the stop.
    const stop = Math.floor(k.t / 9);
    const [dx, dz] = eight(k.s + 0.01); const [px, pz] = eight(k.s);
    const along = Math.atan2(dx - px, dz - pz);
    c.heading = along + (stop % 2 ? Math.PI : Math.PI / 2) * Math.min(1, ((k.t % 9) - 7.5) / 0.6);
    c.action = coursePatrol ? 'patrol' : 'rest';
    return;
  }
  c.action = coursePatrol ? 'patrol' : 'travel';
  // Advance by arc length: θ step = ds / |dP/dθ|.
  let ds = u * k.size * real;
  while (ds > 1e-6) {
    const [x0, z0] = eight(k.s), [x1, z1] = eight(k.s + 1e-3);
    const speed = Math.hypot(x1 - x0, z1 - z0) / 1e-3;
    const dth = Math.min(ds / Math.max(0.2, speed), 0.05);
    k.s += dth; ds -= dth * speed;
  }
  const [x, z] = eight(k.s);
  c.heading = Math.atan2(x - c.position[0], z - c.position[2]);
  c.position[0] = x; c.position[2] = z;
}
if (zoom === 'mid') camPos.sub(camTarget).multiplyScalar(2.2).add(camTarget);
if (zoom === 'far') camPos.sub(camTarget).multiplyScalar(4).add(camTarget);
if (q.get('prey')) world.prey.push({ id: 9, species: 'red colobus', position: [2, 0, -3], heading: 0.4, size: 12, alert: Number(q.get('prey')) });
if (q.get('cam')) { const [x, y, z, tx, ty, tz] = q.get('cam')!.split(',').map(Number); camPos.set(x, y, z); camTarget.set(tx, ty, tz); }

const aspect = innerWidth / innerHeight;
const camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = ortho
  ? new THREE.OrthographicCamera(-60 * aspect, 60 * aspect, 60, -60, 0.1, 800)
  : new THREE.PerspectiveCamera(32, aspect, 0.05, 800);
if (ortho) { camera.position.set(0, 120, 95); (camera as THREE.OrthographicCamera).zoom = Number(q.get('ozoom') ?? 1.6); camera.updateProjectionMatrix(); }
else camera.position.copy(camPos);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(ortho ? new THREE.Vector3(0, 0, 0) : camTarget);
controls.update();

/** Trunk axis and radius of the harness's tapered cylinder trees (radius r at the base, 0.7 r at the top). */
function trunkAt(id: number, y: number, out: THREE.Vector4) {
  const t = world.trees.find(tt => tt.id === id);
  if (!t) return false;
  const r = 0.28 + t.height * 0.017, g = groundHeight(t.position[0], t.position[2]);
  out.set(t.position[0], y, t.position[2], r * (1 - 0.3 * Math.min(1, Math.max(0, (y - g) / t.height))));
  return true;
}
const layer = createCreatures({ scene, world, container: stage, groundHeight, treeAnchor, trunkAt }) as ReturnType<typeof createCreatures> & { debug: { clip: string | null } };
const dbg = layer.debug as { clip: string | null; attention: boolean };
if (q.get('clip')) dbg.clip = q.get('clip');
// Face tiles: seated facing the camera, gaze held forward (&attn=1 lets the attention system move the heads).
if (mode === 'faces') { dbg.clip = q.get('clip') ?? 'portrait'; dbg.attention = q.has('attn'); }
if (tiles.length) { for (const t of tiles) captions.push({ x: t.x, y: 0, z: t.z, text: t.text }); document.head.insertAdjacentHTML('beforeend', '<style>.crl-root{display:none}</style>'); }
const tileCam = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
const followId = q.get('follow') != null ? Number(q.get('follow')) : patrolRig ? patrolRig.file[Math.floor(patrolRig.file.length / 2)].id : null;
const followTmp = new THREE.Vector3();
const faceTmp = new THREE.Vector3();
/** Head height of the animal nearest a tile (portrait framing). */
function faceY(x: number, z: number) {
  const c = world.chimps.find(cc => Math.abs(cc.position[0] - x) < 1 && Math.abs(cc.position[2] - z) < 1);
  if (!c || !layer.getPosition(c.id, faceTmp)) return 0.8;
  return faceTmp.y + 0.62 * layer.getScale(c.id) * (c.age < 5 ? 1.05 : 0.95);
}
const capEls = captions.map(l => { const el = document.createElement('div'); el.className = 'cell-label'; el.textContent = l.text; document.body.appendChild(el); return el; });

// --- Tiny sim driver: discrete 15 eco-second ticks like the real sim -----------------
let tickAcc = 0;
const selId = q.get('sel') != null ? Number(q.get('sel')) : null;
const hl = q.get('hl') != null ? Number(q.get('hl')) : null;
let takeoverDone = false;
function simTick(dtEco: number) {
  world.time += dtEco / 3600;
  if (q.has('takeover') && !takeoverDone && elapsed > Number(q.get('takeover'))) {
    takeoverDone = true;
    const t = troops[0], next = world.chimps.find(c => c.troopId === 0 && c.sex === 'male' && c.age > 16 && c.id !== t.alphaId);
    if (next) t.alphaId = next.id;
  }
  for (const k of courses) stepCourse(k, dtEco);
  if (patrolRig) stepPatrol(dtEco);
  for (const m of movers) {
    const c = m.c;
    if (m.vertical) { m.ang += dtEco * 0.02; c.position[1] = (mode === 'sheet' ? 1.2 : 2.5) + Math.abs(Math.sin(m.ang * 0.4)) * (mode === 'sheet' ? 2.5 : 5); continue; }
    m.ang += m.speed / Math.max(0.5, m.r) * dtEco / 60;
    const nx = m.cx + Math.sin(m.ang) * m.r, nz = m.cz + Math.cos(m.ang) * m.r;
    c.heading = Math.atan2(nx - c.position[0], nz - c.position[2]);
    c.position[0] = nx; c.position[2] = nz;
  }
}
const stats = { frames: 0, upd: 0, render: 0, frameMs: 0, last: performance.now() };
const V = new THREE.Vector3();
let elapsed = 0;
// rAF timestamps drive the clock: performance.now() inside the callback jitters with main-thread work.
function frame(now: number) {
  const dt = Math.min(0.1, Math.max(0, (now - stats.last) / 1000));
  stats.frameMs += now - stats.last; stats.last = now;
  elapsed += dt;
  tickAcc += dt * simRate;
  while (tickAcc >= 15) { simTick(15); tickAcc -= 15; }
  // &follow=<chimp id>: the camera keeps its offset and tracks the animal (motion review).
  if (followId !== null && layer.getPosition(followId, followTmp)) {
    followTmp.y += 0.5;
    camera.position.add(followTmp).sub(controls.target);
    controls.target.copy(followTmp);
  }
  controls.update();
  const f: CreatureFrame = {
    dt, elapsed, selectedId: selId, simRate, camera, daylight, rain, highlightTroopId: hl, subTick: tickAcc / 15,
    layers: { labels: q.has('labels'), social: q.has('social'), perception: q.has('perception') }, closeView: !ortho,
    quality: (q.get('quality') as CreatureFrame['quality']) ?? 'high',
  };
  const t0 = performance.now();
  let t1 = t0;
  if (tiles.length) {
    const cols = Number(q.get('cols') ?? 6), rows = Math.ceil(tiles.length / cols);
    const tw = Math.floor(innerWidth / cols), th = Math.floor(innerHeight / rows);
    renderer.setScissorTest(true);
    tiles.forEach((t, i) => {
      const cx = i % cols, cy = Math.floor(i / cols);
      const dist = mode === 'faces' ? 0.33 : t.action === 'climb' || t.action === 'nest' ? 1.6 : 1.12;
      tileCam.aspect = tw / th; tileCam.updateProjectionMatrix();
      const [ox, oy, oz] = (q.get('view') ?? '2.6,1.7,3.6').split(',').map(Number);
      const ty = mode === 'faces' ? faceY(t.x, t.z) : t.action === 'climb' ? 5.5 : t.action === 'nest' ? 6.4 : 0.72;
      const cx0 = mode === 'faces' ? t.x : t.x + 0.45;
      tileCam.position.set(cx0 + ox * dist, ty + oy * dist, t.z + oz * dist);
      tileCam.lookAt(cx0, ty, t.z);
      layer.update({ ...f, dt: i === 0 ? dt : 0, camera: tileCam });
      if (i === 0) t1 = performance.now();
      renderer.setViewport(cx * tw, innerHeight - (cy + 1) * th, tw, th);
      renderer.setScissor(cx * tw, innerHeight - (cy + 1) * th, tw, th);
      renderer.render(scene, tileCam);
      capEls[i].style.left = `${cx * tw + tw / 2}px`; capEls[i].style.top = `${cy * th + th - 22}px`;
    });
    renderer.setScissorTest(false);
  } else {
    layer.update(f);
    t1 = performance.now();
    renderer.render(scene, camera);
  }
  const t2 = performance.now();
  stats.upd += t1 - t0; stats.render += t2 - t1; stats.frames++;
  if (!tiles.length) captions.forEach((l, i) => {
    V.set(l.x, l.y, l.z).project(camera);
    capEls[i].style.left = `${(V.x * 0.5 + 0.5) * innerWidth}px`; capEls[i].style.top = `${(-V.y * 0.5 + 0.5) * innerHeight}px`;
  });
  if (stats.frames % 30 === 0) {
    const info = renderer.info.render;
    const s = { update: stats.upd / stats.frames, render: stats.render / stats.frames, frame: stats.frameMs / stats.frames, calls: info.calls, tris: info.triangles, chimps: world.chimps.length };
    hud.textContent = `mode ${mode} · chimps ${s.chimps} · update ${s.update.toFixed(2)} ms · render(cpu) ${s.render.toFixed(2)} ms · frame ${s.frame.toFixed(1)} ms · calls ${s.calls} · tris ${(s.tris / 1000).toFixed(0)}k`;
    (window as unknown as { __stats: unknown }).__stats = s;
    if (stats.frames >= 240) { stats.frames = 0; stats.upd = 0; stats.render = 0; stats.frameMs = 0; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(t => { stats.last = t; frame(t); });
Object.assign(window, { __creatures: layer, __world: world });
