// Stage E4k hunt-success diagnosis (development tool, sim truth; docs/staging/e4k-prereg.md §3.2). Reads only: the
// huntTap hook in src/sim/ecology.ts resolveHunt reports the scene each outcome is decided on (it draws nothing and
// changes nothing), and a per-tick pass notes who joins each hunt and when. The world is e-bench's (createWorld +
// tickWorld for the burn-in and the scored days, as src/field/run.ts runFieldJob), so its hunts are the hunts e-bench
// scores; tool check: truth hunts and captures per seed equal e-bench's.
// Per hunt (at the resolution, unless stated):
//   hunt       community, start hour, minutes to the resolution, colobus group size before, alert, height
//   hunters    every listed hunter (h.hunters): sex, age, class (adult male >= 15 y, adolescent male 12-15, female),
//              hunting skill before the resolution, hunger, timer energy, reserves / usable store, foregut fill, energy
//              need (kcal), testosterone-like arousal, injury, minutes from the hunt's start to his joining; counted
//              (resolveHunt's filter: alive, still hunting this group, within huntCaptureRangeM) or why not;
//              horizontal distance and height below the colobus point; bearing from the group
//   geometry   counted hunters' largest angular gap around the group (degrees; 360 with one hunter)
//   at start   community members >= 12 y within huntAlertM of the leader (alerted), adult males among them, and what
//              the alerted who never joined were doing at the resolution
//   canopy     the model's trees around the colobus point: nearest crown edge (negative = inside a crown), crowns with
//              their trunk within 25 m and 50 m, crown cover within 25 m (share of a fixed 1-m grid inside any crown),
//              crowns whose edge lies within 2 m and 5 m of the edge of the crown holding (or nearest to) the group
//   draw       success probability (the curve at n counted), the draw (none when n < 2), outcome, captor (class, skill
//              rank among counted hunters), extra-capture draws and captures, group size after
// The colobus group's sex composition does not exist in the model (a group is a point with a size).
//
//   pnpm exec tsx scripts/e4k-hunt-diagnose.ts [--seed 48] [--burn-in 30] [--days 60] [--params '{…}'] [--out f.json]
import { writeFileSync } from 'node:fs';
import { createWorld, tickWorld } from '../src/simulation';
import { huntTap, type HuntResolution } from '../src/sim/ecology';
import { digestaCaps, energyNeed, massOf, reserveCap } from '../src/sim/energy';
import { isAdultMale } from '../src/sim/hierarchy';
import { paramsOf } from '../src/sim/params';
import { ix, simOf, treesNear } from '../src/sim/state';
import type { Chimp, World } from '../src/types';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '60'), params = JSON.parse(arg('params', '{}')), out = arg('out', '');
const DAY = 5760;
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w), s = simOf(w);
for (let i = 0; i < burnIn * DAY; i++) tickWorld(w);

const r4 = (v: number | null) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);
const klass = (c: Chimp) => (c.sex === 'female' ? 'female' : isAdultMale(c) ? 'adultMale' : 'adolescentMale');
function stateOf(c: Chimp) {
  const x = ix(c), L = x.en;
  let fill: number | null = null, res: number | null = null, need: number | null = null;
  if (P.energyLedger === 1 && L) {
    res = L.res / reserveCap(c, P);
    fill = L.dm !== undefined ? L.dm / digestaCaps(c, P)[0] : L.gut / (P.ledgerGutCapKcalPerKg * massOf(c, P));
    if (P.ledgerDrive === 1 && L.eAvg !== undefined && L.sBed !== undefined) need = energyNeed(c, P); // drive books open: read-only
  }
  return { hunger: r4(c.hunger), energy: r4(c.energy), res: r4(res), fill: r4(fill), need: r4(need), arousal: r4(x.arousal ?? null), injury: r4(c.injury) };
}

const _near: number[] = [];
function canopyAt(world: World, x: number, z: number) {
  const n50 = treesNear(world, x, z, 59, _near), cand = _near.slice(0, n50).map(k => world.trees[k]);
  let nearestEdge = Infinity, home = -1;
  cand.forEach((t, k) => { const e = Math.hypot(t.position[0] - x, t.position[2] - z) - t.canopy; if (e < nearestEdge) { nearestEdge = e; home = k; } });
  const trunk = (r: number) => cand.filter(t => Math.hypot(t.position[0] - x, t.position[2] - z) <= r).length;
  let inside = 0, total = 0;
  for (let gx = -25; gx <= 25; gx++) for (let gz = -25; gz <= 25; gz++) {
    if (gx * gx + gz * gz > 625) continue;
    total++;
    const px = x + gx, pz = z + gz;
    if (cand.some(t => (t.position[0] - px) ** 2 + (t.position[2] - pz) ** 2 <= t.canopy * t.canopy)) inside++;
  }
  let adj2 = 0, adj5 = 0;
  if (home >= 0) {
    const h = cand[home], k = treesNear(world, h.position[0], h.position[2], h.canopy + 5 + 9.5, _near);
    for (let i = 0; i < k; i++) {
      const t = world.trees[_near[i]];
      if (t === h) continue;
      const gap = Math.hypot(t.position[0] - h.position[0], t.position[2] - h.position[2]) - t.canopy - h.canopy;
      if (gap <= 5) adj5++;
      if (gap <= 2) adj2++;
    }
  }
  return { nearestEdgeM: r4(Number.isFinite(nearestEdge) ? nearestEdge : null), trunks25: trunk(25), trunks50: trunk(50), cover25: r4(inside / total), adjacent2: adj2, adjacent5: adj5 };
}

type Start = { tick: number; leader: number; alerted: number[]; alertedAdultMales: number; leaderOwnMales: number; join: Record<number, number> };
const starts = new Map<string, Start>();
const keyOf = (h: { troopId: number; preyId: number; start: number }) => `${h.troopId}:${h.preyId}:${h.start}`;
const rows: unknown[] = [];
let tickNo = 0;

huntTap.fn = (world: World, r: HuntResolution) => {
  const p = r.prey, st = starts.get(keyOf(r.h)), byIdx = new Map(world.chimps.map(c => [c.id, c]));
  const counted = new Set(r.hunters.map(c => c.id));
  const listed = r.listed.map(c => {
    const d = Math.hypot(c.position[0] - p.position[0], c.position[2] - p.position[2]);
    const why = counted.has(c.id) ? 'counted' : !c.alive ? 'dead' : c.action !== 'hunt' ? `action:${c.action}` : c.targetId !== p.id ? 'other target' : d >= P.huntCaptureRangeM ? 'out of range' : '?';
    const k = r.hunters.indexOf(c);
    return { id: c.id, sex: c.sex, age: r4(c.age), cls: klass(c), skill: r4(k >= 0 ? r.skillsBefore[k] : c.skills.hunting), ...stateOf(c), joinMin: st && st.join[c.id] !== undefined ? r4((st.join[c.id] - st.tick) * 0.25) : null, why, distM: r4(d), belowM: r4(p.position[1] - c.position[1]), bearing: r4(Math.atan2(c.position[0] - p.position[0], c.position[2] - p.position[2]) * 180 / Math.PI) };
  });
  const bs = r.hunters.map(c => Math.atan2(c.position[0] - p.position[0], c.position[2] - p.position[2])).sort((a, b) => a - b);
  let gap = 360;
  if (bs.length > 1) { gap = 0; for (let i = 0; i < bs.length; i++) { const g = ((i + 1 < bs.length ? bs[i + 1] : bs[0] + 2 * Math.PI) - bs[i]) * 180 / Math.PI; if (g > gap) gap = g; } }
  const ranks = [...r.hunters].map((c, k) => ({ c, v: r.skillsBefore[k] })).sort((a, b) => b.v - a.v).map(q => q.c.id);
  const notJoined = st ? st.alerted.filter(id => !r.listed.some(c => c.id === id)).map(id => { const c = byIdx.get(id); return c ? `${klass(c)}:${c.action}` : 'gone'; }) : [];
  rows.push({
    troop: r.h.troopId, startH: r4(r.h.start), hour: r4(world.hour), minutes: r4((r.h.resolveAt - r.h.start) * 60), size: r.sizeBefore, sizeAfter: p.size, alert: r4(p.alert), preyY: r4(p.position[1]),
    listedN: r.listed.length, n: r.hunters.length, nAdultMales: r.hunters.filter(isAdultMale).length,
    pSuccess: r4(r.pSuccess), draw: r4(r.draw), success: r.success, captures: r.captors.length,
    captors: r.captors.map(c => ({ id: c.id, cls: klass(c), skillRank: ranks.indexOf(c.id) + 1 })), extraDraws: r.extraDraws.map(u => r4(u)),
    gapDeg: r4(gap), listed, alerted: st ? st.alerted.length : null, alertedAdultMales: st ? st.alertedAdultMales : null, leaderOwnMales: st ? st.leaderOwnMales : null, notJoined,
    canopy: canopyAt(world, p.position[0], p.position[2]),
  });
};

const h0 = w.stats.hunts, s0 = w.stats.huntSuccesses;
for (const h of s.hunts) starts.set(keyOf(h), { tick: 0, leader: h.hunters[0], alerted: [], alertedAdultMales: 0, leaderOwnMales: -1, join: {} });
for (let i = 0; i < days * DAY; i++) {
  tickWorld(w); tickNo++;
  for (const h of s.hunts) {
    let st = starts.get(keyOf(h));
    if (!st) {
      const lead = w.chimps.find(c => c.id === h.hunters[0])!;
      const alerted = w.chimps.filter(b => b.alive && b !== lead && b.troopId === lead.troopId && b.age >= 12 && Math.hypot(b.position[0] - lead.position[0], b.position[2] - lead.position[2]) < P.huntAlertM).map(b => b.id);
      st = { tick: tickNo, leader: lead.id, alerted, alertedAdultMales: alerted.filter(id => isAdultMale(w.chimps.find(c => c.id === id)!)).length, leaderOwnMales: ix(lead).ownMales, join: {} };
      starts.set(keyOf(h), st);
    }
    for (const id of h.hunters) if (st.join[id] === undefined) st.join[id] = tickNo;
  }
}
huntTap.fn = null;

const result = { seed, burnIn, days, params, hunts: w.stats.hunts - h0, successes: w.stats.huntSuccesses - s0, resolved: rows.length, communityDays: w.troops.length * days, rows };
const text = JSON.stringify(result);
if (out) writeFileSync(out, text + '\n');
console.log(JSON.stringify({ seed, hunts: result.hunts, successes: result.successes, resolved: rows.length }));
