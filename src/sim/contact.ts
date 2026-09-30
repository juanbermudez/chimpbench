// Per-chimp contact memory (docs/realism-design.md §5.3.1 P2 and Amendment A1). Each animal keeps at most contactSlots
// hot spots, each a place with a contact weight c (where the neighbours were: heard, seen, or one of them killed by own
// members) and a loss weight l (where it lost: retreat, a patrol turning back, a wound, a group member killed). Weights
// decay with dangerTauDays; a new place within 2 × udCellM of a spot merges into it; when all slots are full the weakest
// spot is evicted. Party members share hourly: a member lacking a spot gets it at contactShareFrac of the other's
// weights, taking the max with what it already has, never the sum. The memory replaces the community-wide danger grid:
// the territory cost and call suppression read the animal's own losses, patrol routes the leader's contacts and losses.
//
// State: chimp.sim.contacts, a flat plain array of [x, z, c, l, t] per spot (t = eco-hour the weights refer to).
import type { Chimp, Troop, World } from '../types';
import { paramsOf, type Params } from './params';
import { index, ix, simOf } from './state';
import { SECTORS, gridOf, cellAt, sectorOf, useLevels } from './territory';

const W = 5;

function decay(P: Params, dt: number): number { return Math.exp(-dt / (P.dangerTauDays * 24)); }

/** Brings every spot's weights to `now`; drops spots whose weights are negligible. */
function refresh(slots: number[], P: Params, now: number): void {
  for (let i = slots.length - W; i >= 0; i -= W) {
    const f = decay(P, now - slots[i + 4]);
    slots[i + 2] = Math.round(slots[i + 2] * f * 1e4) / 1e4; slots[i + 3] = Math.round(slots[i + 3] * f * 1e4) / 1e4; slots[i + 4] = now;
    if (slots[i + 2] < 1e-3 && slots[i + 3] < 1e-3) slots.splice(i, W);
  }
}

function slotNear(slots: number[], x: number, z: number, r: number): number {
  let best = -1, bd = r * r;
  for (let i = 0; i < slots.length; i += W) { const d = (slots[i] - x) ** 2 + (slots[i + 1] - z) ** 2; if (d <= bd) { bd = d; best = i; } }
  return best;
}

/** Adds contact dc and loss dl at (x, z) to one animal's memory. */
export function noteContact(world: World, c: Chimp, x: number, z: number, dc: number, dl: number): void {
  const P = paramsOf(world), x_ = ix(c), now = world.time;
  const slots = x_.contacts;
  refresh(slots, P, now);
  const i = slotNear(slots, x, z, 2 * P.udCellM);
  if (i >= 0) { slots[i + 2] = Math.round((slots[i + 2] + dc) * 1e4) / 1e4; slots[i + 3] = Math.round((slots[i + 3] + dl) * 1e4) / 1e4; return; }
  if (slots.length >= P.contactSlots * W) {
    let weakest = 0;
    for (let k = W; k < slots.length; k += W) if (slots[k + 2] + slots[k + 3] < slots[weakest + 2] + slots[weakest + 3]) weakest = k;
    slots.splice(weakest, W);
  }
  slots.push(Math.round(x * 100) / 100, Math.round(z * 100) / 100, dc, dl, now);
}

/**
 * Ablation (patrolContactMemory 0): the C6 community-wide danger grid, where a community lost (flight, a patrol turning
 * back, a wound, a death), spread to the 8 neighbouring cells at a quarter weight and decayed daily with dangerTauDays.
 */
export function markDanger(world: World, troopId: number, x: number, z: number, w: number): void {
  const s = simOf(world), P = paramsOf(world), g = gridOf(world, P);
  const dg = ((s.danger ??= {})[troopId] ??= new Array<number>(g.n * g.n).fill(0));
  const k = cellAt(g, x, z), cx = k % g.n, cz = (k - cx) / g.n;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const nx = cx + dx, nz = cz + dz;
    if (nx < 0 || nz < 0 || nx >= g.n || nz >= g.n) continue;
    const j = nz * g.n + nx;
    dg[j] = Math.round((dg[j] + (dx === 0 && dz === 0 ? w : w / 4)) * 1e4) / 1e4;
  }
}

/** Daily decay of the ablation danger grids (no-op when they do not exist). */
export function decayDanger(world: World): void {
  const s = simOf(world);
  if (!s.danger) return;
  const f = Math.exp(-1 / paramsOf(world).dangerTauDays);
  for (const k in s.danger) { const dg = s.danger[k]; for (let i = 0; i < dg.length; i++) if (dg[i] > 0) dg[i] = Math.round(dg[i] * f * 1e4) / 1e4; }
}

/** The animal's own losses at a place (sum of decayed loss weights of spots within 2 × udCellM); with patrolContactMemory 0, its community's danger. */
export function lossAt(world: World, c: Chimp, x: number, z: number, P: Params): number {
  if (P.patrolContactMemory !== 1) { const dg = simOf(world).danger?.[c.troopId]; return dg ? dg[cellAt(gridOf(world, P), x, z)] : 0; }
  const slots = ix(c).contacts, now = world.time, r2 = (2 * P.udCellM) ** 2;
  let l = 0;
  for (let i = 0; i < slots.length; i += W) if ((slots[i] - x) ** 2 + (slots[i + 1] - z) ** 2 <= r2) l += slots[i + 3] * decay(P, now - slots[i + 4]);
  return l;
}

/** Hourly: party members share spots at contactShareFrac (max with their own, never the sum), from pre-share copies. */
export function shareContacts(world: World): void {
  const P = paramsOf(world), idx = index(world), now = world.time;
  if (P.patrolContactMemory !== 1) return;
  for (const p of world.parties) {
    if (p.members.length < 2) continue;
    const members = p.members.map(id => idx.byId.get(id)).filter((c): c is Chimp => !!c && c.alive);
    for (const c of members) refresh(ix(c).contacts, P, now);
    const before = members.map(c => ix(c).contacts.slice());
    for (let a = 0; a < members.length; a++) {
      const mine = ix(members[a]).contacts;
      for (let b = 0; b < members.length; b++) {
        if (a === b) continue;
        const theirs = before[b];
        for (let i = 0; i < theirs.length; i += W) {
          const sc = Math.round(theirs[i + 2] * P.contactShareFrac * 1e4) / 1e4, sl = Math.round(theirs[i + 3] * P.contactShareFrac * 1e4) / 1e4;
          const k = slotNear(mine, theirs[i], theirs[i + 1], 2 * P.udCellM);
          if (k >= 0) { mine[k + 2] = Math.max(mine[k + 2], sc); mine[k + 3] = Math.max(mine[k + 3], sl); continue; }
          if (mine.length >= P.contactSlots * W) {
            let weakest = 0;
            for (let q = W; q < mine.length; q += W) if (mine[q + 2] + mine[q + 3] < mine[weakest + 2] + mine[weakest + 3]) weakest = q;
            if (mine[weakest + 2] + mine[weakest + 3] >= sc + sl) continue;
            mine.splice(weakest, W);
          }
          mine.push(theirs[i], theirs[i + 1], sc, sl, now);
        }
      }
    }
  }
}

/**
 * A1 route score of each neighbour-facing sector for a patrol led by `c`: patrolStaleW·S + patrolContactW·min(1, C/dangerScale)
 * − patrolLossW·min(1, L/dangerScale)·risk, with C and L the leader's contact and loss weights in the sector beyond the
 * core, S the sector's staleness and risk the territory cost's (1 / (1 + riskMaleW · own males in view)).
 */
export function sectorContact(world: World, t: Troop, c: Chimp): { c: number[]; l: number[] } {
  const P = paramsOf(world), slots = ix(c).contacts, now = world.time, g = gridOf(world, P), L = useLevels(world)[t.id];
  const cs = new Array<number>(SECTORS).fill(0), ls = new Array<number>(SECTORS).fill(0);
  for (let i = 0; i < slots.length; i += W) {
    if (L && L[cellAt(g, slots[i], slots[i + 1])] <= P.udCoreLevel) continue;
    const k = sectorOf(t, slots[i], slots[i + 1]), f = decay(P, now - slots[i + 4]);
    cs[k] += slots[i + 2] * f; ls[k] += slots[i + 3] * f;
  }
  return { c: cs, l: ls };
}

/** Witnesses in view of a place (same community as `troopId`, alive, within their sight). */
export function witnesses(world: World, troopId: number, x: number, z: number): Chimp[] {
  const out: Chimp[] = [];
  for (const o of index(world).alive) {
    if (o.troopId !== troopId) continue;
    const r = ix(o).sight;
    if ((o.position[0] - x) ** 2 + (o.position[2] - z) ** 2 <= r * r) out.push(o);
  }
  return out;
}

