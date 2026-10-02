import type { Vec3 } from 'math';
import type { Chimp, PreyGroup, Sex, Tree, Troop, World } from '../types';
import { getEligibleActions } from './candidates';
import { addEvent } from './events';
import { initEnvironment, updateClock, updateFruit, updateSeason, updateSun, updateWeatherValues } from './environment';
import { femaleQueue, lifeStage, recomputeAllies, recomputeHierarchies } from './hierarchy';
import { computeParties } from './parties';
import { resetMemory } from './relations';
import { REGISTRY_HASH, paramsOf, resolveParams, type Overrides, type ParamId, type Profile } from './params';
import { perceive, remember } from './perception';
import { clamp, hash01, mixSeed, random } from './rng';
import { DYN_ID0, NEVER, START_HOUR, TREE_ID0, WATER_ID0, index, ix, newSimState, simOf, type SimWorld } from './state';
import { materializeFruit, phenologySource } from './phenology';
import { initTerritories } from './territory';
import { BANK_A, CHANNEL, bankOf, bankPoint, distToStream, dryPoint, evenFords, generateStreamPath, makeCrossings, nearestPoint, streamCell, streamDistance } from './stream';

// Invented names, distinct per community; none are names of well-known study animals.
const NAMES: Record<number, string[]> = {
  1: ['Tavuni', 'Mbelo', 'Koruza', 'Sanaki', 'Wendoro', 'Ilobe', 'Rukaso', 'Dembiri', 'Oyaku', 'Fumbira', 'Lwazo', 'Nkeru', 'Kiboro', 'Olumbe',
    'Semwai', 'Tindiro', 'Ugazi', 'Wakiro', 'Yerubi', 'Zamiko', 'Abelu', 'Chombe', 'Ekuru', 'Gitaro', 'Hamazi', 'Irimbe', 'Kaweri', 'Lukindo',
    'Mirembo', 'Nsaro', 'Opaki', 'Pendwa', 'Rugaba', 'Tumbwe', 'Vuleka', 'Waluba', 'Yakiru', 'Zindu', 'Bokamo', 'Soruma'],
  2: ['Akiwe', 'Chiriku', 'Dalubi', 'Ebini', 'Fwambo', 'Gomezi', 'Jiwero', 'Kasoko', 'Lembai', 'Mazonge', 'Nabiru', 'Odemi', 'Pakwe', 'Rwasi',
    'Sabuni', 'Tebuke', 'Ulemo', 'Vikusa', 'Wamalo', 'Yoloka', 'Bizanu', 'Dorika', 'Enzali', 'Fikiro', 'Gwamba', 'Heruzi', 'Ikolo', 'Jakuri',
    'Kiwemo', 'Lunzo', 'Mpaso', 'Njeru', 'Orubi', 'Pilimo', 'Rakedi', 'Sewanu', 'Tonzi', 'Uzavi', 'Wekimo', 'Zolambe'],
  3: ['Aroko', 'Bweru', 'Kidoti', 'Dunduri', 'Ereko', 'Fazaki', 'Gwisi', 'Hembara', 'Ikwera', 'Jambiri', 'Kalemo', 'Lwisa', 'Mbaka', 'Ndoriko',
    'Obure', 'Pimbi', 'Rizoka', 'Shambe', 'Tundu', 'Ukeri', 'Vanza', 'Wirimi', 'Yandu', 'Zawiro', 'Bulemi', 'Chakwe', 'Dikuru', 'Ezimo',
    'Furaka', 'Gatuma', 'Hozani', 'Ilemba', 'Kavuro', 'Luseke', 'Mwanzi', 'Nyiko', 'Ondiga', 'Pasuri', 'Rutobo', 'Sikome'],
};

export function nextName(world: World, troopId: number): string {
  const s = simOf(world);
  const pool = NAMES[troopId] ?? NAMES[1];
  const k = s.names[troopId] ?? 0;
  s.names[troopId] = k + 1;
  return k < pool.length ? pool[k] : `${pool[k % pool.length]} ${Math.floor(k / pool.length) + 1}`;
}

const SPECIES: [string, string, number, number, number, number, number, number][] = [
  // species, common, weight, minH, maxH, minCanopy, maxCanopy, maxFruit
  ['Ficus mucuso', 'fig', 0.07, 18, 26, 6, 9, 1],
  ['Ficus natalensis', 'fig', 0.05, 14, 22, 5, 7.5, 0.9],
  ['Ficus sansibarica', 'fig', 0.04, 16, 24, 5.5, 8, 0.9],
  ['Uvariopsis congensis', 'forest fruit', 0.2, 8, 14, 2.5, 4, 0.55],
  ['Pseudospondias microcarpa', 'forest fruit', 0.1, 14, 22, 4, 6, 0.75],
  ['Chrysophyllum albidum', 'star apple', 0.1, 14, 22, 4, 6, 0.7],
  ['Pterygota mildbraedii', 'forest canopy', 0.1, 20, 26, 5, 7.5, 0.5],
  ['Mimusops bagshawei', 'forest fruit', 0.1, 14, 24, 4, 6, 0.65],
  ['Celtis durandii', 'forest canopy', 0.24, 12, 22, 3.5, 5.5, 0.45],
];

// Founder templates: [sex, age, mother index, natal (born here), male rank hint].
// West is the largest community (7 adult males) to create an imbalance of power with its neighbors; this is a
// scaled-down echo of Ngogo's advantage, not a match (Ngogo had ~22-24 adult and 13-15 adolescent males).
type Row = [Sex, number, number, boolean, number];
const TEMPLATES: Record<number, Row[]> = {
  1: [
    ['male', 27, -1, true, 1], ['male', 31, -1, true, 2], ['male', 24, 9, true, 3], ['male', 22, -1, true, 4], ['male', 19, 10, true, 5],
    ['male', 41, -1, true, 6], ['male', 17, 9, true, 7], ['male', 13, 11, true, 8], ['female', 12, 9, true, 0],
    ['female', 44, -1, false, 0], ['female', 36, -1, false, 0], ['female', 33, -1, false, 0], ['female', 28, -1, false, 0],
    ['female', 24, -1, false, 0], ['female', 21, -1, false, 0], ['female', 17, -1, false, 0],
    ['female', 6, 11, true, 0], ['male', 0.8, 11, true, 0], ['female', 7, 12, true, 0], ['male', 1.8, 12, true, 0],
    ['male', 2.5, 10, true, 0], ['female', 3.5, 13, true, 0],
  ],
  2: [
    ['male', 29, -1, true, 1], ['male', 23, 5, true, 2], ['male', 35, -1, true, 3], ['male', 18, 5, true, 4], ['male', 12, 6, true, 5],
    ['female', 41, -1, false, 0], ['female', 30, -1, false, 0], ['female', 26, -1, false, 0], ['female', 22, -1, false, 0],
    ['female', 19, -1, false, 0], ['female', 15, -1, false, 0],
    ['female', 1.2, 6, true, 0], ['female', 5.5, 7, true, 0], ['male', 8, 5, true, 0], ['male', 3, 8, true, 0],
  ],
  3: [
    ['male', 26, -1, true, 1], ['male', 33, -1, true, 2], ['male', 20, 4, true, 3], ['male', 14, -1, true, 4],
    ['female', 38, -1, false, 0], ['female', 29, -1, false, 0], ['female', 23, -1, false, 0], ['female', 16, -1, true, 0],
    ['male', 9, 4, true, 0], ['female', 11, 5, true, 0], ['female', 2, 5, true, 0], ['male', 0.5, 6, true, 0],
  ],
};
// Reproductive state at the start (template index -> cycle day, or pregnancy days when negative).
// Most adult females are lactating at any time; only a few cycle (older mothers between births are not cycling yet).
const REPRO: Record<number, Record<number, number>> = {
  1: { 14: 15, 8: 10, 15: -120 },
  2: { 7: 17, 10: 3, 9: -60 },
  3: { 7: 13, 9: 25 },
};

export function makeChimp(world: World, troopId: number, sex: Sex, age: number, name: string, position: Vec3, motherId: number, fatherId: number): Chimp {
  const practiced = clamp(age / 22, 0.03, 0.9);
  const male = sex === 'male';
  const s = simOf(world);
  const id = s.nextChimpId++;
  const r = () => random(world);
  const chimp: Chimp = {
    id, name, troopId, natalTroopId: troopId, sex, age, stage: lifeStage(age), position, heading: r() * Math.PI * 2,
    action: 'rest', targetId: -1, actionTime: 0,
    hunger: 0.3 + r() * 0.2, thirst: 0.15 + r() * 0.2, energy: 0.8 + r() * 0.15, social: 0.5 + r() * 0.3, stress: 0.05 + r() * 0.08, health: 0.92 + r() * 0.08,
    rank: 0.05, elo: 1000, rankOrder: 0, motherId, fatherId,
    birthTime: world.time - age * 365.25 * 24, deathTime: null, causeOfDeath: null,
    skills: { climbing: clamp(practiced + 0.05), foraging: practiced, hunting: age < 12 ? 0.02 : practiced * (male ? 0.7 : 0.3), social: practiced },
    bonds: {},
    personality: { boldness: clamp(0.2 + r() * 0.6 + (male ? 0.1 : 0)), sociability: clamp(0.25 + r() * 0.6), aggression: clamp(0.1 + r() * 0.55 + (male ? 0.15 : 0)), playfulness: clamp(0.2 + r() * 0.6 + (age < 10 ? 0.15 : 0)) },
    appearance: { fur: r(), face: r(), build: r(), brow: r(), ears: r() },
    memory: [], episodes: [], candidates: [], reason: 'Sleeping in my night nest', decisionSource: 'rules', decisionVersion: 0, nextDecision: 0,
    controller: 'rules', awaitingDecisionSince: null, alive: true, pregnancy: 0, cooldown: 0,
    injury: 0, swelling: 0, cycleDay: -1, lactating: false, carryingMeat: 0, nest: null, mood: 'calm', vocal: null, vocalUntil: 0,
    partyId: -1, lastConflict: null, allies: [],
  };
  const x = ix(chimp);
  x.month.start = world.time; chimp.digests = [];
  const P = paramsOf(world);
  x.sight = P.sightDayM;
  x.cycleLen = P.cycleLenMinDays + Math.floor(r() * P.cycleLenSpanDays);
  x.firstSwell = P.firstSwellMinY + r() * P.firstSwellSpanY;
  x.gestation = P.gestationMinDays + r() * P.gestationSpanDays;
  x.weanAge = P.weanAgeMinY + r() * P.weanAgeSpanY;
  x.weaned = age >= x.weanAge;
  x.caretaker = motherId;
  x.disperser = !male && r() < P.disperserP;
  // stage C8: founders start in the condition their hunger implies, fully grown for their age (early-life-prereg §2.6)
  // stage E1 (energyLedger): the ledger opens from this condition, so a founder starts at the reserve set point
  x.cond = P.energyLedger === 1 ? P.ledgerCondSet : 1 - chimp.hunger; x.gestCond = x.cond; x.trX = position[0]; x.trZ = position[2];
  return chimp;
}

function makeTrees(world: World): void {
  const total = SPECIES.reduce((a, s) => a + s[2], 0);
  const half = world.size / 2 - 4;
  for (let i = 0; i < 240; i++) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 6; tries++) {
      if (i < 150) {
        const troop = world.troops[i % 3];
        const a = random(world) * Math.PI * 2, rr = Math.sqrt(random(world)) * troop.radius * 0.95;
        x = troop.center[0] + Math.cos(a) * rr; z = troop.center[2] + Math.sin(a) * rr;
      } else { x = (random(world) * 2 - 1) * half; z = (random(world) * 2 - 1) * half; }
      x = clamp(x, -half, half); z = clamp(z, -half, half);
      // trunks stand at least 2 m from the channel edge and clear of drinking spots
      const offStream = !world.stream || distToStream(world.stream, x, z) >= world.stream.halfWidth + 2;
      if (offStream && !world.water.some(w => Math.hypot(w.position[0] - x, w.position[2] - z) < w.radius + 2.5)) break;
      if (tries === 5) { i--; x = NaN; }
    }
    if (Number.isNaN(x)) continue;
    let k = random(world) * total, sp = SPECIES[0];
    for (const s of SPECIES) { k -= s[2]; if (k <= 0) { sp = s; break; } }
    const maxFruit = sp[7] * (0.75 + random(world) * 0.25);
    const tree: Tree = { id: TREE_ID0 + world.trees.length, species: sp[0], common: sp[1], position: [x, 0, z],
      height: sp[3] + random(world) * (sp[4] - sp[3]), canopy: sp[5] + random(world) * (sp[6] - sp[5]), fruit: 0, maxFruit };
    world.trees.push(tree);
  }
}

/** Field profile: food patches at P.patchesPerHa inside each community's zone (patchRangeFactor × radius), thinner outside. */
function makePatches(world: World): void {
  const P = paramsOf(world);
  const total = SPECIES.reduce((a, s) => a + s[2], 0);
  const half = world.size / 2 - 4, round = (v: number) => Math.round(v * 100) / 100;
  const zones = world.troops.map(t => ({ x: t.center[0], z: t.center[2], r: t.radius * P.patchRangeFactor }));
  const inZone = (x: number, z: number) => zones.some(q => (x - q.x) ** 2 + (z - q.z) ** 2 <= q.r * q.r);
  const place = (x: number, z: number): boolean => {
    if (Math.abs(x) > half || Math.abs(z) > half) return false;
    if (world.stream && streamDistance(world, x, z) < world.stream.halfWidth + 2) return false;
    for (const w of world.water) if ((w.position[0] - x) ** 2 + (w.position[2] - z) ** 2 < (w.radius + 2.5) ** 2) return false;
    let k = random(world) * total, sp = SPECIES[0];
    for (const q of SPECIES) { k -= q[2]; if (k <= 0) { sp = q; break; } }
    let maxFruit = round(sp[7] * (0.75 + random(world) * 0.25));
    const height = round(sp[3] + random(world) * (sp[4] - sp[3])), canopy = round(sp[5] + random(world) * (sp[6] - sp[5]));
    // stage C7a: crops scale with crown area (design, allometric); the species' mean crop is unchanged, so large crops are rarer
    if (P.cropSkewExp > 0) {
      const e = P.cropSkewExp, a = sp[5], b = sp[6], mean = (b ** (e + 1) - a ** (e + 1)) / ((e + 1) * (b - a));
      maxFruit = round(maxFruit * canopy ** e / mean);
    }
    world.trees.push({ id: TREE_ID0 + world.trees.length, species: sp[0], common: sp[1], position: [round(x), 0, round(z)], height, canopy, fruit: 0, maxFruit });
    return true;
  };
  for (const q of zones) {
    const n = Math.round(P.patchesPerHa * Math.PI * q.r * q.r / 1e4);
    for (let i = 0, tries = 0; i < n && tries < n * 3; tries++) {
      const a = random(world) * Math.PI * 2, rr = Math.sqrt(random(world)) * q.r;
      if (place(q.x + Math.cos(a) * rr, q.z + Math.sin(a) * rr)) i++;
    }
  }
  const outsideArea = Math.max(0, world.size * world.size - zones.reduce((a, q) => a + Math.PI * q.r * q.r, 0));
  const nOut = Math.round(P.patchesOutsidePerHa * outsideArea / 1e4);
  for (let i = 0, tries = 0; i < nOut && tries < nOut * 4; tries++) {
    const x = (random(world) * 2 - 1) * half, z = (random(world) * 2 - 1) * half;
    if (!inZone(x, z) && place(x, z)) i++;
  }
}

function pickSire(world: World, candidates: Chimp[], rankOf: Map<number, number>): number {
  if (!candidates.length) return -1;
  let total = 0;
  const w = candidates.map(c => { const r = rankOf.get(c.id) ?? 9; const v = r === 1 ? 4 : r === 2 ? 2 : c.age > 40 ? 0.5 : 1; total += v; return v; });
  let k = random(world) * total;
  for (let i = 0; i < candidates.length; i++) { k -= w[i]; if (k <= 0) return candidates[i].id; }
  return candidates[candidates.length - 1].id;
}

function nestSite(world: World, cx: number, cz: number, salt: number): { treeId: number; position: Vec3 } {
  const P = paramsOf(world);
  let best: Tree | undefined, bestScore = -Infinity;
  for (const t of world.trees) {
    const d = Math.hypot(t.position[0] - cx, t.position[2] - cz);
    if (d > P.nestTreeRadiusM || t.height < P.nestTreeMinHeightM) continue;
    const score = -d * 0.2 + hash01(t.id, salt, 17) * 3;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (!best) best = world.trees.reduce((a, t) => Math.hypot(t.position[0] - cx, t.position[2] - cz) < Math.hypot(a.position[0] - cx, a.position[2] - cz) ? t : a);
  return { treeId: best.id, position: nestPoint(world, best, salt) };
}

export function nestPoint(world: World, t: Tree, salt: number): Vec3 {
  const a = hash01(t.id, salt, 3) * Math.PI * 2, r = t.canopy * (0.12 + 0.28 * hash01(t.id, salt, 5));
  const [x, z] = dryPoint(world, t.position[0] + Math.cos(a) * r, t.position[2] + Math.sin(a) * r, t.position[0], t.position[2]);
  return [x, t.height * (0.6 + 0.2 * hash01(t.id, salt, 9)), z];
}

/**
 * Builds the founding world. opts.profile selects the scale profile (only 'compressed' until stage C5a); opts.params
 * overrides registry values by id and throws a RangeError for an unknown id or a value outside its hard range.
 */
export function createWorld(seed = 48, opts: { profile?: Profile; params?: Overrides } = {}): World {
  const profile = opts.profile ?? 'compressed';
  const overrides: Overrides = {};
  const P0 = resolveParams(profile, opts.params ?? {});
  for (const k of Object.keys(opts.params ?? {}).sort()) overrides[k as ParamId] = opts.params![k as ParamId];
  const safeSeed = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) >>> 0 : 48;
  // the field profile is the compressed layout × 50 (map, stream); community centres × centerScale (33.63), chosen so the
  // West–North and East–North nominal ranges are tangent on average (docs/realism-design.md, C5a review response)
  const L = P0.centerScale;
  const troops: Troop[] = [
    { id: 1, name: 'West community', color: '#ea8b60', emblem: '▲', center: [-46 * L, 0, 18 * L], radius: P0.rangeRadiusWestM, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
    { id: 2, name: 'East community', color: '#77b6e1', emblem: '◆', center: [48 * L, 0, 14 * L], radius: P0.rangeRadiusEastM, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
    { id: 3, name: 'North community', color: '#e28dae', emblem: '●', center: [2 * L, 0, -50 * L], radius: P0.rangeRadiusNorthM, alphaId: -1, alphaSince: 0, maleHierarchy: [], femaleHierarchy: [], alphaHistory: [], adultMales: 0 },
  ];
  const world: SimWorld = {
    seed: safeSeed, time: 0, day: 1, hour: START_HOUR, tick: 0, size: P0.mapSizeM,
    chimps: [], trees: [], troops, water: [],
    events: [], parties: [], interactions: [], calls: [], prey: [], stimuli: [],
    environment: initEnvironment(),
    rng: mixSeed(safeSeed), nextId: DYN_ID0, births: 0, deaths: 0,
    stats: { births: 0, deaths: 0, conflicts: 0, injuries: 0, groomingBouts: 0, playBouts: 0, hunts: 0, huntSuccesses: 0, intergroupEncounters: 0,
      killings: 0, takeovers: 0, transfers: 0, reconciliations: 0 },
    ageRate: 1, modelPolicy: { mode: 'async', asyncGraceMinutes: P0.asyncGraceMin },
    sim: newSimState(),
  };
  const s = world.sim;
  s.params = { registry: REGISTRY_HASH, profile, overrides };
  const P = paramsOf(world);
  // The stream and its bank drinking spots: two per community where it passes closest to the range center.
  const stream = { points: generateStreamPath(safeSeed, P0.layoutScale, P0.streamPointSpacingM), halfWidth: P0.streamHalfWidthM, crossings: [] as Vec3[] };
  stream.crossings = P0.fordSpacingM > 0 ? evenFords(stream, P0.fordSpacingM, P0.mapSizeM) : makeCrossings(stream, troops);
  world.stream = stream;
  for (const t of troops) {
    const i = nearestPoint(stream, t.center[0], t.center[2]);
    for (const j of [i + (t.id % 2 === 0 ? 3 : -3), i + (t.id % 2 === 0 ? 11 : -11)]) {
      const k = Math.max(1, Math.min(stream.points.length - 2, j));
      let site = bankPoint(stream, k, t.center[0], t.center[2], 1.5);
      if (bankOf(world, site[0], site[2]) !== bankOf(world, t.center[0], t.center[2])) {
        const q = stream.points[k];
        site = [2 * q[0] - site[0], 0, 2 * q[2] - site[2]];
      }
      world.water.push({ id: WATER_ID0 + world.water.length, position: site, radius: 1.2 });
    }
  }
  const patches = P.patchEcology === 1;
  if (P.waterSitesPerKm2 > 0) {
    // field profile: pools and tree holes scattered through each range (design)
    for (const t of troops) {
      const n = Math.round(P.waterSitesPerKm2 * Math.PI * t.radius * t.radius / 1e6);
      for (let i = 0, tries = 0; i < n && tries < n * 4; tries++) {
        const a = random(world) * Math.PI * 2, rr = Math.sqrt(random(world)) * t.radius;
        const x = t.center[0] + Math.cos(a) * rr, z = t.center[2] + Math.sin(a) * rr;
        if (streamCell(world, x, z) >= CHANNEL || streamDistance(world, x, z) < stream.halfWidth + 3) continue;
        world.water.push({ id: WATER_ID0 + world.water.length, position: [Math.round(x * 100) / 100, 0, Math.round(z * 100) / 100], radius: 1.2 });
        i++;
      }
    }
  }
  if (patches) makePatches(world); else makeTrees(world);
  updateClock(world); updateSun(world); updateSeason(world);
  s.weather.state = 'cloudy';
  updateFruit(world);
  if (patches) materializeFruit(world);
  else for (const t of world.trees) t.fruit = t.maxFruit * clamp(t.fruit / t.maxFruit + (random(world) - 0.5) * 0.2);
  for (let i = 0, n = preyGroupsOf(world); i < n; i++) spawnPrey(world);

  for (const troop of troops) buildCommunity(world, troop);
  index(world);
  for (const c of world.chimps) femaleQueue(world, c, 5000);
  recomputeHierarchies(world);
  for (const troop of troops) {
    const open = troop.alphaHistory[troop.alphaHistory.length - 1];
    if (open) {
      open.from = -(2 + (troop.id % 3) * 1.3) * 365 * 24; open.how = 'alpha when observation began'; troop.alphaSince = open.from;
      // The founding alpha did not just rise: replace the takeover memory with one that predates observation.
      const alpha = world.chimps.find(c => c.id === troop.alphaId);
      const e = alpha?.episodes.find(q => q.kind === 'hierarchy' && q.text.startsWith('Became the alpha'));
      if (e) { e.text = 'Alpha male since before observation began'; e.time = open.from; }
    }
    s.unstableUntil[troop.id] = NEVER;
  }
  for (const c of world.chimps) recomputeAllies(world, c);
  initTerritories(world);
  resetMemory(world);
  updateWeatherValues(world);
  computeParties(world);
  for (const c of world.chimps) { perceive(world, c); getEligibleActions(world, c); }
  world.events.length = 0;
  const scale = patches ? ` · field scale ${(world.size / 1000).toFixed(0)} km, ${world.trees.length} food patches, ${phenologySource(world) === 'synthetic' ? 'synthetic phenology' : `phenology ${phenologySource(world)}`}` : '';
  addEvent(world, `Synthetic Kibale-like forest · ${world.chimps.length} chimpanzees in 3 communities${scale} · 28 September, 06:30 (civil twilight), chimpanzees still in night nests`, 'system', [], -1, 1);
  return world;
}

/**
 * Colobus groups kept on the map: `preyMinGroups` (field: 159, Ngogo's density in 1997–99), or, with `preyKanyawara` on a
 * field-scale map, Kanyawara's density times the map's area (stage E4f: the site of the encounter and hunting targets;
 * docs/staging/e4f-prereg.md §4.1).
 */
export function preyGroupsOf(world: World): number {
  const P = paramsOf(world);
  return P.preyKanyawara === 1 && world.size > 1000 ? Math.round(P.colobusDensityKanyawaraPerKm2 * (world.size / 1000) ** 2) : P.preyMinGroups;
}

export function spawnPrey(world: World, near?: Vec3): PreyGroup {
  const s = simOf(world);
  const half = world.size / 2 - 8;
  const p: PreyGroup = { id: s.nextPreyId++, species: 'red colobus', position: near ? [clamp(near[0], -half, half), 17, clamp(near[2], -half, half)]
    : [(random(world) * 2 - 1) * half, 17, (random(world) * 2 - 1) * half], heading: random(world) * Math.PI * 2, size: 14 + Math.floor(random(world) * 24), alert: 0 };
  world.prey.push(p);
  return p;
}

function buildCommunity(world: World, troop: Troop): void {
  const P = paramsOf(world);
  const rows = TEMPLATES[troop.id];
  const repro = REPRO[troop.id];
  const made: Chimp[] = [];
  const nClusters = troop.id === 1 ? 3 : 2;
  const clusterOf: number[] = [];
  rows.forEach((_, i) => { clusterOf[i] = i % nClusters; });
  rows.forEach(([, , mother], i) => { if (mother >= 0) clusterOf[i] = clusterOf[mother]; });
  for (let i = 0; i < rows.length; i++) {
    const [sex, age, , natal] = rows[i];
    const c = makeChimp(world, troop.id, sex, age, nextName(world, troop.id), [0, 0, 0], -1, -1);
    if (!natal) {
      const others = world.troops.filter(t => t.id !== troop.id);
      c.natalTroopId = others[Math.floor(random(world) * others.length)].id;
      ix(c).immigrantAge = Math.min(age - 0.5, 12.5 + random(world) * 2);
    } else if (sex === 'female' && age >= 15) ix(c).disperser = false;
    else if (sex === 'female' && age >= 11) ix(c).disperser = true;
    made.push(c); world.chimps.push(c);
  }
  // Kinship: mothers, maternal siblings.
  rows.forEach(([, , mother], i) => { if (mother >= 0) made[i].motherId = made[mother].id; });
  // Synthetic sires for immature founders, skewed toward high-ranking males. [M]
  const rankOf = new Map<number, number>();
  rows.forEach(([, , , , rank], i) => { if (rank > 0) rankOf.set(made[i].id, rank); });
  for (let i = 0; i < rows.length; i++) {
    const c = made[i];
    if (c.age >= 15) continue;
    const mother = made[rows[i][2]] as Chimp | undefined;
    const sires = made.filter(m => m.sex === 'male' && m.age - c.age >= 15 && (!mother || m.motherId !== mother.id));
    c.fatherId = pickSire(world, sires, rankOf);
  }
  // Elo from rank hints; the Elo process takes over from here.
  const nMales = rows.filter(r => r[0] === 'male' && r[1] >= 10).length;
  rows.forEach(([sex, age, , , rank], i) => { if (sex === 'male' && age >= 10) made[i].elo = 1000 + (nMales - rank) * 140 + (rank === 1 ? 80 : 0) + (random(world) - 0.5) * 20; });
  // Bonds. [H for mother-offspring and male-male bonds in East African chimpanzees; values assumed]
  for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) {
    const a = made[i], b = made[j];
    let v: number;
    if (a.motherId === b.id || b.motherId === a.id) v = 0.88 + random(world) * 0.08;
    else if (a.motherId > 0 && a.motherId === b.motherId) v = 0.5 + random(world) * 0.2;
    else if (a.sex === 'male' && b.sex === 'male' && a.age >= 12 && b.age >= 12) v = 0.28 + random(world) * 0.25 + (Math.abs(a.age - b.age) < 6 ? 0.08 : 0);
    else if (a.age < 10 && b.age < 10) v = 0.3 + random(world) * 0.2;
    else v = 0.12 + random(world) * 0.22;
    a.bonds[b.id] = v; b.bonds[a.id] = v;
  }
  const strong: [number, number, number][] = troop.id === 1 ? [[1, 2, 0.78], [0, 3, 0.72], [0, 5, 0.6]] : troop.id === 2 ? [[0, 2, 0.68], [1, 3, 0.8]] : [[0, 2, 0.62]];
  for (const [a, b, v] of strong) { made[a].bonds[made[b].id] = v; made[b].bonds[made[a].id] = v; }
  // Reproductive state.
  for (let i = 0; i < made.length; i++) {
    const c = made[i], x = ix(c);
    if (c.sex !== 'female') continue;
    const youngest = made.filter(k => k.motherId === c.id).reduce((m, k) => Math.min(m, k.age), 99);
    if (youngest < 99 && youngest < ix(made.find(k => k.motherId === c.id && k.age === youngest)!).weanAge) {
      c.lactating = true; x.amenUntil = c.age - youngest + 3.2 + random(world) * 0.9;
    }
    const r = repro[i];
    if (r === undefined && c.age >= 15 && !c.lactating) x.amenUntil = c.age + 0.3 + random(world) * 1.5;
    if (r !== undefined && r < 0) {
      c.pregnancy = -r;
      const sires = made.filter(m => m.sex === 'male' && m.age >= 15 && m.motherId !== c.id);
      x.sireId = pickSire(world, sires, rankOf);
    } else if (r !== undefined && c.age >= x.firstSwell) { c.cycleDay = r; x.amenUntil = Math.min(x.amenUntil, c.age); }
  }
  // Females range in individual core areas within the community range (Kanyawara/Ngogo) [H]; offspring share them.
  for (const c of made) {
    const ca = hash01(c.id, troop.id, 31) * Math.PI * 2, cr = troop.radius * (0.15 + 0.4 * hash01(c.id, troop.id, 32));
    const [cx, cz] = dryPoint(world, troop.center[0] + Math.cos(ca) * cr, troop.center[2] + Math.sin(ca) * cr, troop.center[0], troop.center[2]);
    ix(c).coreX = cx; ix(c).coreZ = cz;
  }
  for (const c of made) { const m = made.find(k => k.id === c.motherId); if (m) { ix(c).coreX = ix(m).coreX; ix(c).coreZ = ix(m).coreZ; } }
  // Stronger founders hold higher rank; the alpha is the strongest (design) so aging and contests, not a bad start, reorder ranks.
  rows.forEach(([sex, age, , , rank], i) => { if (sex === 'male' && age >= 15) made[i].appearance.build = clamp(P.founderBuildTop - P.founderBuildPerRank * (rank - 1) + (random(world) - 0.5) * P.founderBuildJitter); });
  // Night nests at 06:30, grouped in sleeping clusters; infants share the mother's nest. [H]
  for (let i = 0; i < made.length; i++) {
    const c = made[i];
    const cl = clusterOf[i];
    const a = (cl / nClusters) * Math.PI * 2 + troop.id;
    const cx = troop.center[0] + Math.cos(a) * troop.radius * 0.32, cz = troop.center[2] + Math.sin(a) * troop.radius * 0.32;
    const x = ix(c);
    const mother = c.motherId > 0 ? made.find(m => m.id === c.motherId) : undefined;
    if (mother && !x.weaned && mother.nest) {
      c.nest = { treeId: mother.nest.treeId, position: [mother.nest.position[0] + 0.25, mother.nest.position[1], mother.nest.position[2]] };
    } else {
      const jitter = (hash01(c.id, 3, 1) - 0.5) * P.nestClusterJitterM, jitter2 = (hash01(c.id, 4, 1) - 0.5) * P.nestClusterJitterM;
      c.nest = nestSite(world, cx + jitter, cz + jitter2, c.id);
    }
    c.position = [c.nest.position[0], c.nest.position[1], c.nest.position[2]];
    c.action = 'nest'; c.targetId = c.nest.treeId; x.nestTree = c.nest.treeId; x.phase = 2;
    c.nextDecision = 0.05 + random(world) * 0.6; x.actEnd = c.nextDecision;
    c.hunger = 0.35 + random(world) * 0.2; c.energy = 0.85 + random(world) * 0.12;
    if (P.waterSitesPerKm2 > 0) {
      // field profile: the few drinking spots nearest the individual's core area, not every pool in the range
      const near = world.water.filter(w => Math.hypot(w.position[0] - troop.center[0], w.position[2] - troop.center[2]) < troop.radius * 1.3)
        .map(w => ({ w, d: Math.hypot(w.position[0] - x.coreX, w.position[2] - x.coreZ) })).sort((a, b) => a.d - b.d || a.w.id - b.w.id).slice(0, 6);
      for (const q of near) remember(world, c, q.w.id, 'water', q.w.position);
    } else for (const w of world.water) if (Math.hypot(w.position[0] - troop.center[0], w.position[2] - troop.center[2]) < troop.radius * 1.3) remember(world, c, w.id, 'water', w.position);
    // individual knowledge: a few fruiting trees, weighted toward the individual's core area
    const known = world.trees.filter(t => t.fruit > 0.2 && Math.hypot(t.position[0] - troop.center[0], t.position[2] - troop.center[2]) < troop.radius)
      .map(t => ({ t, v: hash01(c.id, t.id, 33) - (c.sex === 'female' ? Math.hypot(t.position[0] - x.coreX, t.position[2] - x.coreZ) / troop.radius : 0) }))
      .sort((p, q) => q.v - p.v).slice(0, 8);
    for (const k of known) remember(world, c, k.t.id, 'tree', k.t.position);
  }
}
