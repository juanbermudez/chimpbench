import type { Chimp, Party, World } from '../types';
import { addEvent, emitCall, endInteraction, flashInteraction, interrupt } from './events';
import { isAdultMale, strength } from './hierarchy';
import { hash01, random } from './rng';
import { noteEncounter } from './relations';
import { paramsOf } from './params';
import { PARTY_EVERY, TICK_HOURS, chimpCells, index, ix, simOf } from './state';
import { markDanger, noteContact } from './contact';
import { SECTORS, cellAt, gridOf, incursionPoint, rangeEdge, recordUse, sectorDir, useLevels } from './territory';
import { daylightLeftH, patrolPower, patrolValueOn, powerOdds } from './patrol';
import { tripSpeed } from './gait';

const parent: number[] = [];
function find(i: number): number { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }

/** Fission-fusion parties by union-find over proximity within each community. [H for fission-fusion] */
export function computeParties(world: World): void {
  const alive = index(world).alive;
  const n = alive.length;
  parent.length = n;
  for (let i = 0; i < n; i++) parent[i] = i;
  const link = paramsOf(world).partyLinkM;
  const l2 = link * link;
  const grid = link <= paramsOf(world).chimpGridCellM ? chimpCells(world) : null;
  if (grid) {
    // field profile: pairs within neighbouring cells only (cell >= link); the union-find roots do not depend on pair order
    const { cells, n: gn, used } = grid;
    for (let u = 0; u < used.length; u++) {
      const k = used[u], a0 = cells[k];
      const cx = k % gn, cz = (k - cx) / gn;
      for (let dz = 0; dz <= 1; dz++) for (let dx = dz === 0 ? 0 : -1; dx <= 1; dx++) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nx >= gn || nz >= gn) continue;
        const b0 = cells[nz * gn + nx];
        for (const i of a0) {
          const a = alive[i];
          if (!a.alive) continue;
          for (const j of b0) {
            if (dx === 0 && dz === 0 && j <= i) continue;
            const b = alive[j];
            if (b.troopId !== a.troopId || !b.alive) continue;
            const ddx = a.position[0] - b.position[0], ddz = a.position[2] - b.position[2];
            if (ddx * ddx + ddz * ddz <= l2) { const ra = find(i), rb = find(j); if (ra !== rb) parent[ra < rb ? rb : ra] = ra < rb ? ra : rb; }
          }
        }
      }
    }
  } else for (let i = 0; i < n; i++) {
    const a = alive[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < n; j++) {
      const b = alive[j];
      if (b.troopId !== a.troopId || !b.alive) continue;
      const dx = a.position[0] - b.position[0], dz = a.position[2] - b.position[2];
      if (dx * dx + dz * dz <= l2) { const ra = find(i), rb = find(j); if (ra !== rb) parent[ra < rb ? rb : ra] = ra < rb ? ra : rb; }
    }
  }
  const groups = new Map<number, Chimp[]>();
  for (let i = 0; i < n; i++) {
    if (!alive[i].alive) continue;
    const r = find(i);
    let g = groups.get(r);
    if (!g) { g = []; groups.set(r, g); }
    g.push(alive[i]);
  }
  const parties: Party[] = [];
  for (const g of groups.values()) {
    let id = Infinity, cx = 0, cz = 0;
    const counts: Record<string, number> = {};
    for (const c of g) { if (c.id < id) id = c.id; cx += c.position[0]; cz += c.position[2]; counts[c.action] = (counts[c.action] ?? 0) + 1; }
    const k = g.length;
    const frac = (a: string) => (counts[a] ?? 0) / k;
    let kind: Party['kind'] = 'social';
    if (frac('patrol') >= 0.4) kind = 'patrol';
    else if (frac('hunt') >= 0.3) kind = 'hunting';
    else if (frac('nest') >= 0.5) kind = 'nesting';
    else if (k <= 3 && (counts.consort ?? 0) >= 2) kind = 'consort';
    else if (frac('forage') >= 0.4) kind = 'foraging';
    else if (frac('travel') + frac('follow') + frac('transfer') >= 0.4) kind = 'traveling';
    const members = g.map(c => c.id).sort((a, b) => a - b);
    for (const c of g) c.partyId = id;
    parties.push({ id, troopId: g[0].troopId, members, center: [cx / k, 0, cz / k], kind });
  }
  parties.sort((a, b) => a.id - b.id);
  world.parties = parties;
  recordUse(world, PARTY_EVERY * TICK_HOURS);
  detectEncounters(world);
}

/** When parties of different communities come within sight, all members get a decision point. */
function detectEncounters(world: World): void {
  const env = world.environment;
  if (env.daylight < 0.15) return;
  const s = simOf(world);
  const byId = index(world).byId;
  const P = paramsOf(world);
  const sight = P.sightDayM * env.daylight * (1 - 0.3 * env.rain);
  const ps = world.parties;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (a.troopId === b.troopId) continue;
    const dc = Math.hypot(a.center[0] - b.center[0], a.center[2] - b.center[2]);
    if (dc > sight + P.encounterPartyMarginM) continue;
    let best = Infinity, ca: Chimp | undefined, cb: Chimp | undefined;
    for (const ia of a.members) {
      const pa = byId.get(ia)!;
      for (const ib of b.members) {
        const pb = byId.get(ib)!;
        const dx = pa.position[0] - pb.position[0], dz = pa.position[2] - pb.position[2];
        const d2 = dx * dx + dz * dz;
        if (d2 < best) { best = d2; ca = pa; cb = pb; }
      }
    }
    if (!ca || !cb || best > sight * sight) continue;
    const pk = `${a.id}-${b.id}`;
    if (world.time - (s.encounters[pk] ?? -1e9) < 0.2) continue;
    s.encounters[pk] = world.time;
    const key = `${Math.min(a.troopId, b.troopId)}-${Math.max(a.troopId, b.troopId)}`;
    if (world.time - (s.encounters[key] ?? -1e9) > P.encounterGapH) {
      s.encounters[key] = world.time;
      world.stats.intergroupEncounters++;
      const males = (p: Party) => p.members.filter(id => isAdultMale(byId.get(id)!)).length;
      const ta = index(world).troopById.get(a.troopId)!, tb = index(world).troopById.get(b.troopId)!;
      addEvent(world, `A ${ta.name} party (${a.members.length}, ${males(a)} adult males) met a ${tb.name} party (${b.members.length}, ${males(b)} adult males)`,
        'territory', [ca.id, cb.id], a.troopId, 1);
    }
    for (const id of [...a.members, ...b.members]) {
      const c = byId.get(id)!;
      const other = c.troopId === a.troopId ? cb : ca;
      if (c.action === 'nest' && ix(c).phase >= 2) continue;
      if (Math.hypot(c.position[0] - other.position[0], c.position[2] - other.position[2]) > sight * 1.2) continue;
      const otherName = index(world).troopById.get(other.troopId)!.name;
      interrupt(world, c, `strangers from the ${otherName} in sight`, true);
      noteEncounter(world, c, otherName.replace(' community', ''), true);
    }
  }
}

/**
 * Patrols (docs/realism-design.md §5.3): out to the own range edge in the stalest periphery sector facing a neighbour,
 * then either an incursion into the neighbour's range (to a depth drawn up to its core) or a sweep along the edge, then
 * home. The leader stops silently to listen every patrolStopEveryMin minutes of travel and at each waypoint (Watts &
 * Mitani 2001) [M]; the party waits with it. Patrols retreat when stranger males seen or heard match their own males.
 */
export function updatePatrols(world: World): void {
  const s = simOf(world);
  const idx = index(world);
  const P = paramsOf(world);
  const pv = patrolValueOn(P); // stage E4i: no length cap, no release dice, odds decide the incursion and the retreat
  for (const troop of world.troops) {
    const p = s.patrols[troop.id];
    if (!p) continue;
    let leader = idx.byId.get(p.leaderId);
    if (!leader || !leader.alive || leader.action !== 'patrol' || leader.troopId !== troop.id) {
      leader = idx.alive.find(c => c.alive && c.troopId === troop.id && c.action === 'patrol' && c.id !== p.leaderId);
      if (leader) p.leaderId = leader.id;
    }
    const done = (home: boolean) => {
      endInteraction(world, p.interId);
      s.patrols[troop.id] = null;
      // the release (§5.3.1 P4a): after contact, or on returning to the core, the males pant-hoot in chorus, drum and display [M]
      // stage E4i: no release dice; after the patrol the males call (or not) by the call rules, as on any other trip
      if (!pv && leader && leader.alive && (p.contact || home) && random(world) < (p.contact ? P.patrolReleaseContactP : P.patrolReleaseP)) {
        for (const id of p.file) { const m = idx.byId.get(id); if (m && m.alive && m.action === 'patrol' && isAdultMale(m)) emitCall(world, m, 'pant-hoot'); }
        emitCall(world, leader, 'drum');
        flashInteraction(world, 'display', leader, -1, [leader.id], 0.8);
        addEvent(world, `The ${troop.name} patrol ended with a pant-hoot chorus and drumming`, 'territory', [leader.id], troop.id, 1);
      } else addEvent(world, `The ${troop.name} patrol ended`, 'territory', leader ? [leader.id] : [], troop.id, 0);
    };
    if (!leader || (!pv && world.time > p.until)) { done(false); continue; }
    const lx = ix(leader), time = world.time;
    if (lx.strangers > 0 || (time - lx.heardAt < P.patrolHeardWindowH && lx.heardTroop > 0)) p.contact = true;
    // numerical assessment: stranger males seen, or heard calling, that match our males send the patrol home [M-H]
    const heardNow = time - lx.heardAt < P.patrolHeardWindowH && lx.heardTroop > 0;
    let outnumbered: boolean;
    if (pv) {
      // stage E4i: the patrol's assessed odds (patrol.ts): its members' summed strength against the strangers perceived, each
      // assessed as strong as the patrol's average adult male; the patrol turns back when the odds are not in its favour
      const pw = patrolPower(world, p.file, P), avg = pw.males > 0 ? pw.malePower / pw.males : strength(leader, P);
      const rivals = Math.max(lx.strangerMales, heardNow ? lx.heardN : 0);
      outnumbered = rivals > 0 && powerOdds(pw.power, rivals * avg, P) <= 0.5;
    } else outnumbered = lx.strangerMales > 0 && lx.strangerMales >= lx.ownMales || (heardNow && lx.heardN >= lx.ownMales);
    if (outnumbered && p.phase < 2) {
      // a patrol turning back: a loss for every member still on it (contact memory, §5.3.1 P2)
      if (P.patrolContactMemory === 1) { for (const id of p.file) { const m = idx.byId.get(id); if (m && m.alive && m.action === 'patrol') noteContact(world, m, leader.position[0], leader.position[2], 0, P.dangerFleeW); } }
      else markDanger(world, troop.id, leader.position[0], leader.position[2], P.dangerFleeW); // ablation: the C6 community grid
      p.contact = true;
      p.phase = 2; p.wx = troop.center[0]; p.wz = troop.center[2]; p.stopUntil = time;
      addEvent(world, `The ${troop.name} patrol turned back from outnumbering strangers`, 'territory', [leader.id], troop.id, 1);
      continue;
    }
    if (p.stopUntil > time) continue;
    const d = Math.hypot(leader.position[0] - p.wx, leader.position[2] - p.wz);
    const listen = (salt: number) => { p.stopUntil = time + (P.patrolStopMinMin + (P.patrolStopMaxMin - P.patrolStopMinMin) * hash01(p.leaderId, p.stops, salt)) / 60; p.lastStop = time; p.stops++; };
    if (d > P.patrolWaypointM) {
      if (p.phase < 2 && time - p.lastStop >= P.patrolStopEveryMin / 60) listen(71);
      continue;
    }
    if (p.phase === 0) {
      p.phase = 1;
      listen(72);
      const nb = idx.troopById.get(p.neighborId);
      if (pv && nb) {
        // stage E4i: at the range edge the leader pushes into the neighbour's range when the patrol's odds against the
        // neighbour's males as he remembers them favour it (parity when unknown: no push) and the way in and home fits
        // in the daylight left (at walkMps; design geometry)
        const pw = patrolPower(world, p.file, P), avg = pw.males > 0 ? pw.malePower / pw.males : strength(leader, P), m = lx.nbm?.[nb.id];
        const odds = m && m > 0 ? powerOdds(pw.power, m * avg, P) : 0.5;
        const [ix0, iz0] = incursionPoint(world, nb, p.wx, p.wz, Math.floor(p.start));
        const wayH = (Math.hypot(ix0 - leader.position[0], iz0 - leader.position[2]) + Math.hypot(troop.center[0] - ix0, troop.center[2] - iz0)) / tripSpeed(world, leader, P) / 3600; // stage E2i (walkGait): the leader's walking speed (gait.ts), walkMps when off
        p.incursion = odds > 0.5 && daylightLeftH(time) >= wayH;
        // iteration 2 (patrolValue 3): advance, hold or retreat by the same odds (lemoine2023): a patrol whose members on it
        // are outmatched by the neighbour's males as remembered turns home at the edge instead of holding it
        if (P.patrolValue === 3 && odds < 0.5) {
          p.phase = 2; p.wx = troop.center[0]; p.wz = troop.center[2];
          addEvent(world, `The ${troop.name} patrol turned back at the boundary, too few to go on`, 'territory', [leader.id], troop.id, 0);
          continue;
        }
      }
      if (nb && p.incursion) {
        [p.wx, p.wz] = incursionPoint(world, nb, p.wx, p.wz, Math.floor(p.start));
      } else {
        // sweep along the edge to the next sector, one side or the other
        const [dx, dz] = sectorDir((p.sector + (hash01(p.leaderId, world.day, 2) < 0.5 ? SECTORS - 1 : 1)) % SECTORS);
        [p.wx, p.wz] = rangeEdge(world, troop, dx, dz);
      }
    } else if (p.phase === 1) {
      p.phase = 2;
      listen(73);
      p.wx = troop.center[0]; p.wz = troop.center[2];
    } else done(true);
  }
  patrolParties(world);
}

/**
 * The patrol party's leg and file (§5.3.1 P4a; contract Party.patrolPhase): 'listen' at a stop, 'return' on the way
 * home, 'incursion' inside a neighbour's 95% isopleth, else 'out'; members in file order, leader first. Other parties
 * never carry the key (parties are rebuilt at every update).
 */
function patrolParties(world: World): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P), L = useLevels(world);
  for (const party of world.parties) {
    if (party.kind !== 'patrol') continue;
    const pt = s.patrols[party.troopId];
    if (!pt || !party.members.includes(pt.leaderId)) continue;
    const leader = index(world).byId.get(pt.leaderId)!;
    const k = cellAt(g, leader.position[0], leader.position[2]);
    const inNeighbour = world.troops.some(t => t.id !== party.troopId && L[t.id] && L[t.id][k] <= P.udRangeLevel);
    party.patrolPhase = pt.stopUntil > world.time ? 'listen' : pt.phase === 2 ? 'return' : inNeighbour ? 'incursion' : 'out';
    const inFile = pt.file.filter(id => party.members.includes(id));
    if (inFile[0] !== pt.leaderId) { const i = inFile.indexOf(pt.leaderId); if (i > 0) inFile.splice(i, 1); inFile.unshift(pt.leaderId); }
    party.members = [...inFile, ...party.members.filter(id => !inFile.includes(id))];
  }
}
