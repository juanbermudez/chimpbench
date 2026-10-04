import type { Vec3 } from 'math';
import type { CallKind, Chimp, Memory, World } from '../types';
import { addEvent, interrupt, setHearHook } from './events';
import { isAdultMale } from './hierarchy';
import { clamp, random } from './rng';
import { noteEncounter } from './relations';
import { stalestSector } from './territory';
import { paramsOf, type Params } from './params';
import { fruitAt } from './phenology';
import { noteContact } from './contact';
import { featureDistance, perceivedFeatures } from './signals';
import { endoHeard, endoOn } from './endocrine';
import { noteFeeders } from './departure';
import { darkOn, sightAt, visionNow } from './light';
import { NEVER, aliveNear, awakeInNest, byIdIn, index, isTreeId, ix, simOf, treesNear } from './state';

export const IMPULSE_TRANSFER = 1, IMPULSE_ESCALATE = 2, IMPULSE_INFANTICIDE = 3, IMPULSE_RAIN = 4, IMPULSE_GANG = 5, IMPULSE_PATROL = 6, IMPULSE_HUNT = 7;

/** Memory lifetimes in hours (registry memTtl*); water is remembered for good. */
const ttl = (P: Params, kind: Memory['kind']) => kind === 'chimp' ? P.memTtlChimpH : kind === 'tree' ? P.memTtlTreeH : kind === 'prey' ? P.memTtlPreyH : 1e9;

export function sightRadius(world: World, c: Chimp): number {
  const env = world.environment;
  const P = paramsOf(world);
  // stage E2c (darkCost): the same interpolation, driven by vision at the animal's height instead of the daylight scale
  let r = darkOn(P) ? sightAt(P, visionNow(world, c.position[1])) : P.sightNightM + (P.sightDayM - P.sightNightM) * env.daylight;
  r *= 1 - 0.3 * env.rain;
  if (c.position[1] > 4) r *= 1.15;
  if (c.age < 3) r *= 0.8;
  return r;
}

// Spatial memory churns (animals are forgotten after 15 min and re-remembered): removed records are recycled and removal
// shifts in place, so the hot path allocates nothing. The lists hold the same values in the same order as before.
const freeMem: Memory[] = [];
function dropMemory(list: Memory[], i: number): void {
  const r = list[i];
  for (let j = i; j < list.length - 1; j++) list[j] = list[j + 1];
  list.length--;
  if (freeMem.length < 4096) freeMem.push(r);
}

export function remember(world: World, c: Chimp, entityId: number, kind: Memory['kind'], position: Vec3): void {
  const list = c.memory;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.entityId === entityId && m.kind === kind) { m.seenAt = world.time; m.position[0] = position[0]; m.position[1] = position[1]; m.position[2] = position[2]; return; }
  }
  const P = paramsOf(world);
  if (P.memTreeCap > 0) {
    // stage C6b (field): trees and everything else have separate caps; drop the stalest record of the same class
    const tree = kind === 'tree';
    let n = 0, worst = -1, worstT = Infinity;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if ((m.kind === 'tree') !== tree) continue;
      n++;
      if (m.kind !== 'water' && m.seenAt < worstT) { worstT = m.seenAt; worst = i; }
    }
    if (n >= (tree ? P.memTreeCap : P.memoryCap)) { if (worst < 0) return; dropMemory(list, worst); }
  } else if (list.length >= P.memoryCap) {
    // Drop the stalest non-water memory.
    let worst = -1, worstT = Infinity;
    for (let i = 0; i < list.length; i++) if (list[i].kind !== 'water' && list[i].seenAt < worstT) { worstT = list[i].seenAt; worst = i; }
    if (worst < 0) return;
    dropMemory(list, worst);
  }
  const r = freeMem.pop();
  if (r) { r.entityId = entityId; r.kind = kind; r.seenAt = world.time; r.position[0] = position[0]; r.position[1] = position[1]; r.position[2] = position[2]; list.push(r); }
  else list.push({ entityId, kind, seenAt: world.time, position: [position[0], position[1], position[2]] });
}

export function forget(c: Chimp, entityId: number, kind: Memory['kind']): void {
  for (let i = c.memory.length - 1; i >= 0; i--) if (c.memory[i].entityId === entityId && c.memory[i].kind === kind) dropMemory(c.memory, i);
}

export function recall(world: World, c: Chimp, entityId: number, kind: Memory['kind']): Memory | undefined {
  const P = paramsOf(world);
  for (const m of c.memory) if (m.entityId === entityId && m.kind === kind && world.time - m.seenAt <= ttl(P, kind)) return m;
  return undefined;
}

const _trees: number[] = [];
const _d2: number[] = [];
/** Values of the trees kept in x.trees during one perception (performance: treeValue would recompute the same numbers). */
const _tv: number[] = [];
const _near: number[] = [];

/** Local perception at a decision point: sight radius shrinks at night and in rain. No global knowledge. */
export function perceive(world: World, c: Chimp): void {
  const x = ix(c);
  const time = world.time;
  const P = paramsOf(world);
  const ATTENTION = P.attentionN; // nearest individuals attended to in detail
  for (let i = c.memory.length - 1; i >= 0; i--) if (time - c.memory[i].seenAt > ttl(P, c.memory[i].kind)) dropMemory(c.memory, i);
  const r = sightRadius(world, c);
  const r2 = r * r;
  const prevLook = x.seenAt; // stage E5e: the animal's previous look (perception at its last decision point)
  x.sight = r; x.seenAt = time;
  x.seen.length = 0;
  const greetMem = (P.socialTiming & 1) !== 0;
  x.strangers = 0; x.strangerMales = 0; x.strangerTroop = -1; x.isolated = -1; x.nearestStranger = -1; x.newcomers = 0;
  x.ownMales = isAdultMale(c) ? 1 : 0; x.visibleOwn = 0;
  const px = c.position[0], pz = c.position[2];
  let nearestD = Infinity;
  const alive = index(world).alive;
  // field profile: only the chimp-grid cells around (same order as the full scan); compressed: every living individual
  const grid = aliveNear(world, px, pz, r, _near);
  const count = grid ? _near.length : alive.length;
  for (let q = 0; q < count; q++) {
    const o = alive[grid ? _near[q] : q];
    if (o === c || !o.alive) continue;
    const dx = o.position[0] - px, dz = o.position[2] - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 > r2) continue;
    let k = x.seen.length;
    if (k < ATTENTION || d2 < _d2[k - 1]) {
      if (k === ATTENTION) k--;
      while (k > 0 && _d2[k - 1] > d2) { x.seen[k] = x.seen[k - 1]; _d2[k] = _d2[k - 1]; k--; }
      x.seen[k] = o.id; _d2[k] = d2;
      if (x.seen.length > ATTENTION) x.seen.length = ATTENTION;
    }
    if (o.troopId !== c.troopId) {
      x.strangers++; x.strangerTroop = o.troopId;
      if (isAdultMale(o)) x.strangerMales++;
      if (d2 < nearestD) { nearestD = d2; x.nearestStranger = o.id; }
    } else {
      x.visibleOwn++;
      if (isAdultMale(o)) x.ownMales++;
      // a reunion: an adolescent or adult not seen for over reunionH (1 h)
      const last = x.metAt[o.id];
      if (o.age >= 10 && last !== undefined && time - last > P.reunionH) x.newcomers++;
      // stage E5e (socialTiming bit 1; docs/staging/e5e-prereg.md §4.1): meeting again after more than reunionH apart, the
      // other out of sight at the previous look (not merely unattended through a long bout), begins a new association in
      // which a greeting is due: the record of having greeted is cleared
      if (greetMem && x.greet[o.id] !== undefined && (last === undefined || (time - last > P.reunionH && last < prevLook))) delete x.greet[o.id];
      x.metAt[o.id] = time;
    }
  }
  if (x.strangers > 0) {
    // contact memory (§5.3.1 P2): strangers seen add contact where the nearest one stands, at most once per contactSeenGapH
    const ns = x.nearestStranger >= 0 ? index(world).byId.get(x.nearestStranger) : undefined;
    if (ns && P.patrolContactMemory === 1 && time - x.contactSeenAt >= P.contactSeenGapH) { x.contactSeenAt = time; noteContact(world, c, ns.position[0], ns.position[2], 1, 0); }
    // An isolated stranger: no other perceived stranger within 15 m of it.
    const byId = index(world).byId;
    let bestD = Infinity;
    for (const id of x.seen) {
      const s = byId.get(id)!;
      if (s.troopId === c.troopId || s.age < 10) continue;
      let alone = true;
      for (const id2 of x.seen) {
        if (id2 === id) continue;
        const o = byId.get(id2)!;
        if (o.troopId !== s.troopId || o.age < 5) continue;
        const dx = o.position[0] - s.position[0], dz = o.position[2] - s.position[2];
        if (dx * dx + dz * dz < P.isolatedStrangerM * P.isolatedStrangerM) { alone = false; break; }
      }
      const dx = s.position[0] - px, dz = s.position[2] - pz;
      if (alone && dx * dx + dz * dz < bestD) { bestD = dx * dx + dz * dz; x.isolated = id; }
    }
  }
  // Remember the nearest few individuals.
  const byId = index(world).byId;
  for (let i = 0; i < x.seen.length && i < 10; i++) { const o = byId.get(x.seen[i])!; remember(world, c, o.id, 'chimp', o.position); }
  // Fruit trees in view.
  x.trees.length = 0; x.fruitNear = 0;
  // fruiting crowns are conspicuous from further than animals on the ground (design)
  const n = treesNear(world, px, pz, Math.min(r * P.treeSightFactor, P.treeSightMaxM), _trees);
  const lazy = P.patchEcology === 1;
  // stage E2b (departRace): who was seen feeding in a crown is kept beside the crop belief (departure.ts)
  const race = P.departRace === 1;
  for (let k = 0; k < n; k++) {
    const t = world.trees[_trees[k]];
    const f = lazy ? fruitAt(world, t) : t.fruit;
    if (f > x.fruitNear) x.fruitNear = f;
    // stage C7a (field): what is seen of a remembered crown replaces the belief about it
    if (x.treeCrop && x.treeCrop[t.id] !== undefined) {
      if (f < 0.04) { delete x.treeCrop[t.id]; if (x.treeFeed) delete x.treeFeed[t.id]; } else { x.treeCrop[t.id] = Math.round(f * 1000) / 1000; if (race) noteFeeders(c, t.id, byId); }
    }
    if (f < 0.06) { if (f < 0.04) forget(c, t.id, 'tree'); continue; }
    // keep the best five by fruit per distance
    const dx = t.position[0] - px, dz = t.position[2] - pz;
    const v = f / (1 + Math.sqrt(dx * dx + dz * dz) / P.treeValueDistScaleM);
    let pos = x.trees.length;
    while (pos > 0 && _tv[pos - 1] < v) pos--;
    if (pos < 5) {
      const tr = x.trees; tr.push(0); _tv.length = tr.length;
      for (let j = tr.length - 1; j > pos; j--) { tr[j] = tr[j - 1]; _tv[j] = _tv[j - 1]; }
      tr[pos] = t.id; _tv[pos] = v; if (tr.length > 5) { tr.length = 5; _tv.length = 5; }
    }
  }
  for (let k = 0; k < x.trees.length && k < 4; k++) {
    const t = index(world).treeById.get(x.trees[k])!, f = lazy ? fruitAt(world, t) : t.fruit;
    if (f > 0.2) { remember(world, c, t.id, 'tree', t.position); if (P.memCropBelief === 1) { (x.treeCrop ??= {})[t.id] = Math.round(f * 1000) / 1000; if (race) noteFeeders(c, t.id, byId); } }
  }
  x.fruitNear = clamp(x.fruitNear);
  for (const w of world.water) { const dx = w.position[0] - px, dz = w.position[2] - pz; if (dx * dx + dz * dz < r2 * 1.5) remember(world, c, w.id, 'water', w.position); }
  const prevPrey = x.preyId;
  x.preyId = -1;
  let preyD = (r * P.preySightFactor) ** 2;
  if (world.environment.daylight > 0.3) for (const p of world.prey) {
    const dx = p.position[0] - px, dz = p.position[2] - pz, d2 = dx * dx + dz * dz;
    if (d2 < preyD) { preyD = d2; x.preyId = p.id; }
  }
  // a colobus encounter: a group in sight that was not the group perceived at the previous decision point (hunting fix)
  const metPrey = x.preyId !== prevPrey ? x.preyId : -1;
  if (x.preyId < 0) {
    // an ongoing hunt by our community is loud: its prey is known to anyone within earshot
    for (const h of simOf(world).hunts) {
      if (h.troopId !== c.troopId) continue;
      const p = byIdIn(world.prey, h.preyId);
      if (p && Math.hypot(p.position[0] - px, p.position[2] - pz) < P.huntEarshotM) { x.preyId = p.id; break; }
    }
  }
  if (x.preyId > 0) { const p = byIdIn(world.prey, x.preyId)!; remember(world, c, p.id, 'prey', p.position); }
  // Active interventions within their perceptual radius.
  x.stims.length = 0;
  const s = simOf(world);
  for (const st of world.stimuli) {
    if (st.end <= time || st.radius <= 0) continue;
    const dx = st.position[0] - px, dz = st.position[2] - pz, d2 = dx * dx + dz * dz;
    const visual = st.kind === 'snake-model' ? P.snakeVisualM : st.kind === 'colobus-troop' ? r * P.preySightFactor : st.kind === 'fig-mast' ? r : st.radius;
    if (d2 > visual * visual && !(st.kind === 'snake-model' && (s.aware[st.id] ?? []).includes(c.id))) continue;
    x.stims.push(st.id);
    if (st.kind === 'snake-model' && d2 < P.snakeVisualM * P.snakeVisualM) { const a = s.aware[st.id] ?? (s.aware[st.id] = []); if (!a.includes(c.id)) a.push(c.id); }
  }
  rollImpulses(world, c, metPrey);
}

/** Rare behaviors start as impulses drawn at perception, so pure candidate scoring stays rng-free. */
function rollImpulses(world: World, c: Chimp, metPrey: number): void {
  const x = ix(c);
  if (x.impulseUntil > world.time && x.impulse !== 0) return;
  x.impulse = 0; x.impulseTarget = -1; x.impulseUntil = NEVER;
  if (!isAdultMale(c) || x.seen.length === 0) return;
  const byId = index(world).byId;
  const P = paramsOf(world);
  // A gang attack needs a clear imbalance of power (>=3 of our males against one lone stranger, no stranger
  // males nearby), usually on patrol or near the boundary; even then attacks are rare (design) [M-H]
  if (x.isolated > 0 && x.ownMales >= P.gangMinOwnMales && x.strangerMales <= 1 && world.time - x.gangRoll > P.gangRollGapH) {
    const iso = byId.get(x.isolated)!;
    const troop = index(world).troopById.get(c.troopId);
    const edge = !!troop && Math.hypot(c.position[0] - troop.center[0], c.position[2] - troop.center[2]) > troop.radius * P.gangEdgeFrac;
    if (iso.age >= 10 && !(iso.sex === 'female' && iso.swelling >= 0.5 && !iso.lactating) && (c.action === 'patrol' || edge)
      && world.time - ix(iso).gangAt > P.gangVictimGapH && Math.hypot(iso.position[0] - c.position[0], iso.position[2] - c.position[2]) < P.gangMaxDistM) {
      x.gangRoll = world.time;
      if (random(world) < P.gangImpulseP) { x.impulse = IMPULSE_GANG; x.impulseTarget = iso.id; x.impulseUntil = world.time + P.impulseDurationH; return; }
    }
  }
  // Patrol hazard (docs/realism-design.md §5.3, §5.3.1): h = h0 · OR^(m − 3) · S(staleness) · (1 + β·heard in 24 h), β = 0 since §5.3.1 P1, per
  // adult male with >= patrolMinMales adult males in view, 08:00–15:30, no patrol under way. OR from mitaniWatts2005
  // (P-PAT-1: +17% per male) [M]; the staleness and energy forms are design; h0 is fitted to T-PAT-1.
  const hour = world.hour, s = simOf(world);
  if (P.patrolH0 > 0 && x.ownMales >= P.patrolMinMales && hour >= P.patrolStartH && hour < P.patrolEndH && !s.patrols[c.troopId] && world.environment.rain < P.patrolMaxRain) {
    const dt = Math.min(P.patrolRollMaxH, world.time - x.patrolRoll);
    x.patrolRoll = world.time;
    const troop = index(world).troopById.get(c.troopId);
    if (dt > 0 && troop) {
      // no energy gate (§5.3.1 A2: fruit acts through male party size; lean periods did not deter patrols, mitaniWatts2005) [M]
      const S = 1 - Math.exp(-stalestSector(world, troop).days / P.patrolStaleTauDays);
      const heard = world.time - x.heardAt < 24 ? 1 : 0;
      let h = P.patrolH0 * Math.pow(P.patrolMaleOddsRatio, x.ownMales - 3) * S * (1 + P.patrolHeardBeta * heard);
      if (P.patrolEnergyGate === 1) { // ablation: the C6 energy gate E, rising from patrolEnergyLow to full party mean energy
        let e = c.energy, k = 1;
        for (const id of x.seen) { const o = byId.get(id)!; if (o.troopId === c.troopId && isAdultMale(o)) { e += o.energy; k++; } }
        h *= Math.max(0, Math.min(1, (e / k - P.patrolEnergyLow) / (1 - P.patrolEnergyLow)));
      }
      if (random(world) < 1 - Math.exp(-h * dt)) { x.impulse = IMPULSE_PATROL; x.impulseTarget = -1; x.impulseUntil = world.time + P.impulseDurationH; return; }
    }
  }
  // Hunting fix (huntEncounter, field; docs/staging/hunting-fix.patch.json): the hunt is decided at the colobus encounter,
  // as the field statistic is defined (hunts per encounter within 100 m, gilby2015) [H], not on a community hunting day.
  // An adult male who has just met a colobus group in company considers leading a hunt, once: the impulse opens the
  // option (candidates.ts) and ends with his next choice (execution.ts). Nothing is drawn; whether he hunts is his choice
  // among his options. huntEncMinMales (no solo hunts; a capture needs two hunters) is a design assumption.
  if (P.huntEncounter === 1 && metPrey > 0 && x.ownMales >= P.huntEncMinMales) { x.impulse = IMPULSE_HUNT; x.impulseTarget = metPrey; x.impulseUntil = world.time + P.impulseDurationH; return; }
  for (const id of x.seen) {
    const o = byId.get(id)!;
    if (o.troopId === c.troopId && o.sex === 'male' && o.age >= 15 && Math.abs(o.elo - c.elo) < P.escalateEloGap) {
      const dx = o.position[0] - c.position[0], dz = o.position[2] - c.position[2];
      // stage E4a (endoEscalate): nothing is drawn; the attack is offered from the animal's standing state (candidates.ts aggression)
      if (!endoOn(P, 'endoEscalate') && dx * dx + dz * dz < P.escalateDistM * P.escalateDistM && random(world) < P.escalateImpulseBase + P.escalateImpulseAggr * c.personality.aggression) { x.impulse = IMPULSE_ESCALATE; x.impulseTarget = id; x.impulseUntil = world.time + P.impulseDurationH; return; }
    }
    // Infanticide by males is documented within and between communities; rates are low and uncertain. [H occurs, L rates]
    if (o.age < P.infanticideMaxAgeY && o.motherId > 0) {
      const mother = byId.get(o.motherId);
      if (!mother || !mother.alive) continue;
      const stranger = o.troopId !== c.troopId && x.ownMales >= x.strangerMales + P.infanticideMaleMargin;
      const newAlpha = o.troopId === c.troopId && index(world).troopById.get(c.troopId)?.alphaId === c.id && world.time - (index(world).troopById.get(c.troopId)?.alphaSince ?? 0) < 24 * P.infanticideNewAlphaDays
        && ix(mother).sireId !== c.id && o.fatherId !== c.id;
      if ((stranger && random(world) < P.infanticideStrangerP) || (newAlpha && random(world) < P.infanticideNewAlphaP)) { x.impulse = IMPULSE_INFANTICIDE; x.impulseTarget = o.id; x.impulseUntil = world.time + P.impulseDurationH; return; }
    }
  }
}

/** Hearing is pushed from the caller so listeners need no per-tick scan. */
function hear(world: World, o: Chimp, callId: number, kind: CallKind, caller: Chimp): void {
  const x = ix(o);
  if (kind === 'alarm-hoo') {
    const s = simOf(world);
    for (const st of world.stimuli) {
      if (st.kind !== 'snake-model' || st.end <= world.time) continue;
      if (Math.hypot(caller.position[0] - st.position[0], caller.position[2] - st.position[2]) > paramsOf(world).alarmSnakeLinkM) continue;
      const a = s.aware[st.id] ?? (s.aware[st.id] = []);
      if (!a.includes(o.id)) { a.push(o.id); if (o.troopId === caller.troopId) interrupt(world, o, `${caller.name} gave alarm hoos`); }
    }
    return;
  }
  if (kind === 'travel-hoo') { // stage C10 addendum 1: a companion is setting off (candidates.ts raises following it)
    if (o.troopId === caller.troopId) {
      x.hooFrom = caller.id; x.hooAt = world.time;
      // stage C13e (joinChoice; noticing): the hoo reaches every companion within earshot, seen or not, and makes it decide
      // stage E2e (nestAudience, iteration 2): an animal awake in its finished nest hears it too and decides
      if (paramsOf(world).joinChoice === 1 && o.age >= 5 && (o.action !== 'nest' || awakeInNest(paramsOf(world), o))) interrupt(world, o, `${caller.name} gave a travel hoo`, true);
    }
    return;
  }
  if (kind === 'scream') {
    if (o.troopId === caller.troopId && (caller.motherId === o.id || o.allies.includes(caller.id))) interrupt(world, o, `heard ${caller.name} scream`);
    return;
  }
  if (caller.troopId === o.troopId) {
    x.joinCall = callId; x.joinCaller = caller.id; x.joinAt = world.time; x.joinX = caller.position[0]; x.joinZ = caller.position[2];
    x.joinRich = caller.action === 'forage' && caller.targetId > 0 ? 1 : 0; // arrival pant-hoots at food carry information about it [M]
    // stage E5e (socialTiming bit 4; docs/staging/e5e-prereg.md §4.3): the crown the call was given in, valued as a trip
    if ((paramsOf(world).socialTiming & 4) !== 0) x.jt = caller.action === 'forage' && isTreeId(caller.targetId) ? caller.targetId : -1;
    return;
  }
  // Stranger pant-hoots or drumming: count distinct callers of that community heard in the last 3 minutes.
  let n = 0;
  const P = paramsOf(world);
  if (P.callerDiscrim === 1 && P.callSignatures === 1) n = discriminatedCallers(world, o, caller.troopId, P);
  else {
    const seenCallers: number[] = [];
    for (let i = world.calls.length - 1; i >= 0; i--) {
      const call = world.calls[i];
      if (world.time - call.time > P.strangerCallerWindowH) break;
      if (call.troopId !== caller.troopId || (call.kind !== 'pant-hoot' && call.kind !== 'drum')) continue;
      if (seenCallers.indexOf(call.callerId) < 0) { seenCallers.push(call.callerId); n++; }
    }
  }
  // contact memory (§5.3.1 P2): a new stranger chorus heard adds contact at the caller's place
  if (P.patrolContactMemory === 1 && world.time - x.heardAt > P.strangerCallerWindowH) noteContact(world, o, caller.position[0], caller.position[2], 1, 0);
  endoHeard(world, x, P); // stage E4b fix: the start of a hearing episode (before heardAt moves on)
  x.heardN = Math.max(1, n); x.heardAt = world.time; x.heardX = caller.position[0]; x.heardZ = caller.position[2]; x.heardTroop = caller.troopId; x.heardStim = -1;
  // most intergroup encounters are acoustic only (Kanyawara: 85% of 120 encounters in 15 y; Wilson et al. 2012) [M]
  const s = simOf(world);
  const key = `${Math.min(o.troopId, caller.troopId)}-${Math.max(o.troopId, caller.troopId)}`;
  // one encounter episode per community pair per 12 h, whether heard or seen
  if (world.environment.daylight > 0.1 && world.time - (s.encounters[key] ?? -1e9) > paramsOf(world).encounterGapH) {
    s.encounters[key] = world.time;
    world.stats.intergroupEncounters++;
    const a = index(world).troopById.get(o.troopId), b = index(world).troopById.get(caller.troopId);
    addEvent(world, `${a?.name ?? 'A community'} chimpanzees heard ${b?.name ?? 'stranger'} pant-hoots near the boundary`, 'territory', [o.id, caller.id], o.troopId, 0);
  }
  if (world.environment.daylight > 0.1 && world.time - x.lastHeard > 0.08) { x.lastHeard = world.time; interrupt(world, o, `heard ${x.heardN} stranger${x.heardN > 1 ? 's' : ''} pant-hoot`, true); }
  if (world.environment.daylight > 0.1) noteEncounter(world, o, (index(world).troopById.get(caller.troopId)?.name ?? 'stranger').replace(' community', ''), false);
}

/**
 * Stage C10 (callerDiscrim): the stranger callers of community `troop` a listener can tell apart in the window. Each
 * heard pant-hoot is perceived with distance-dependent noise (signals.ts); it counts as a new caller when its perceived
 * features differ from every caller already counted by more than discrimThreshold (design [L]). Drums, playbacks and
 * other calls without features carry no identity: they count as one caller only when no pant-hoot is counted. Pure.
 */
const _perc: number[][] = [];
function discriminatedCallers(world: World, o: Chimp, troop: number, P: Params): number {
  let counted = 0, anon = false;
  for (let i = world.calls.length - 1; i >= 0; i--) {
    const call = world.calls[i];
    if (world.time - call.time > P.strangerCallerWindowH) break;
    if (call.troopId !== troop || (call.kind !== 'pant-hoot' && call.kind !== 'drum')) continue;
    const d2 = (call.position[0] - o.position[0]) ** 2 + (call.position[2] - o.position[2]) ** 2;
    if (d2 > call.radius * call.radius) continue; // out of this listener's earshot
    if (call.kind !== 'pant-hoot' || !call.features) { anon = true; continue; }
    const v = perceivedFeatures(P, call.features, o.id, call.id, Math.sqrt(d2), call.radius, _perc[counted] ?? (_perc[counted] = []));
    let fresh = true;
    for (let k = 0; k < counted; k++) if (featureDistance(v, _perc[k]) <= P.discrimThreshold) { fresh = false; break; }
    if (fresh) counted++;
  }
  return counted > 0 ? counted : anon ? 1 : 0;
}

setHearHook(hear);

/** Daily (stage C7a, field): drop crop beliefs about trees no longer remembered, so the record stays as small as memory. */
export function dailyBeliefs(world: World): void {
  if (paramsOf(world).memCropBelief !== 1) return;
  for (const c of index(world).alive) {
    const b = ix(c).treeCrop;
    if (!b) continue;
    for (const key in b) {
      const id = +key;
      let kept = false;
      for (let i = 0; i < c.memory.length; i++) if (c.memory[i].kind === 'tree' && c.memory[i].entityId === id) { kept = true; break; }
      if (!kept) delete b[key];
    }
    const fd = ix(c).treeFeed; // stage E2b: the feeders record follows the crop belief
    if (fd) for (const key in fd) if (b[+key] === undefined) delete fd[key];
  }
}
