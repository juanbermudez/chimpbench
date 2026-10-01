// Colobus encounter-rate diagnosis (development tool, sim truth). The source's definition (gilby2015, Kanyawara): a 15-min
// scan with colobus detected within 100 m of the chimpanzees that was not immediately preceded by another positive scan;
// 3.73 encounters per 100 h of observation. Here every adult is a focal in daylight: a scan is positive when a colobus
// group is within R of any member of its party. The script splits the model's rate into its parts without changing the
// model: the detection radius R, and the groups' own movement, by moving shadow copies of the groups (they do not
// interact with the chimpanzees) at other speeds beside the real ones.
//
//   pnpm exec tsx scripts/colobus-encounter-diagnose.ts [--seed 48] [--burn-in 30] [--days 30] [--params '{…}']
import { createWorld, tickWorld } from '../src/simulation';
import { paramsOf } from '../src/sim/params';
import { SLOW_EVERY, TICK_SECONDS } from '../src/sim/state';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const seed = +arg('seed', '48'), burnIn = +arg('burn-in', '30'), days = +arg('days', '30'), params = JSON.parse(arg('params', '{}'));
const w = createWorld(seed, { profile: 'field', params });
const P = paramsOf(w);
for (let i = 0; i < burnIn * 5760; i++) tickWorld(w);

// shadow groups: the model's kinematics (a check on the method), the wild day range in daylight only, and standing still
let lcg = (seed * 2654435761) >>> 0;
const rnd = () => { lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0; return lcg / 4294967296; };
const RANGE_M = 649; // red colobus mean daily movement, Kibale (Struhsaker, in Mittermeier et al. 2013)
interface Shadow { name: string; speed: (light: number) => number; x: number[]; z: number[]; h: number[] }
const dayTicks = { n: 0 };
const shadows: Shadow[] = [
  { name: 'model kinematics (0.025 m/s, day and night)', speed: () => 0.025, x: [], z: [], h: [] },
  { name: `wild day range (${RANGE_M} m per day, daylight only)`, speed: l => (l > 0.3 ? RANGE_M / (12.4 * 3600) : 0), x: [], z: [], h: [] },
  { name: 'standing still', speed: () => 0, x: [], z: [], h: [] },
];
for (const s of shadows) for (const p of w.prey) { s.x.push(p.position[0]); s.z.push(p.position[2]); s.h.push(p.heading); }
const lim = w.size / 2 - 6;

// the world's own detection distance (capped at the 100 m of the scans) comes first: the fit statistic of the encounter fix
const WORLD_M = Math.min(100, P.sightDayM * P.preySightFactor);
const RADII = [WORLD_M, 35, 50, 100];
// per adult: last scan positive? for [real, ...shadows] × radii; and the observer's variant (nearest group changed) at 100 m
const sets = 1 + shadows.length;
const prev = new Map<number, Uint8Array>(), prevId = new Map<number, number>();
const enc = Array.from({ length: sets }, () => RADII.map(() => 0)), pos = Array.from({ length: sets }, () => RADII.map(() => 0));
let scans = 0, encObserver = 0, moving = 0, encMoving = 0;
const lastCentre = new Map<number, [number, number]>();
const start = w.prey.map(p => [p.position[0], p.position[2]] as [number, number]), ids = w.prey.map(p => p.id);
let path = 0, pathN = 0;
const last = w.prey.map(p => [p.position[0], p.position[2]] as [number, number]);

for (let i = 0; i < days * 5760; i++) {
  tickWorld(w);
  const light = w.environment.daylight;
  if (light > 0.3) dayTicks.n++;
  for (const s of shadows) {
    const v = s.speed(light) * TICK_SECONDS;
    for (let k = 0; k < s.x.length; k++) {
      if (i % SLOW_EVERY === 0) s.h[k] += (rnd() - 0.5) * 0.9;
      s.x[k] += Math.sin(s.h[k]) * v; s.z[k] += Math.cos(s.h[k]) * v;
      if (s.x[k] < -lim || s.x[k] > lim) { s.h[k] = -s.h[k]; s.x[k] = Math.max(-lim, Math.min(lim, s.x[k])); }
      if (s.z[k] < -lim || s.z[k] > lim) { s.h[k] = Math.PI - s.h[k]; s.z[k] = Math.max(-lim, Math.min(lim, s.z[k])); }
    }
  }
  for (let k = 0; k < w.prey.length; k++) { const p = w.prey[k]; if (p.id !== ids[k]) continue; path += Math.hypot(p.position[0] - last[k][0], p.position[2] - last[k][1]); last[k] = [p.position[0], p.position[2]]; }
  if (i % 5760 === 5759) pathN++;
  if (i % 60 !== 0 || light <= 0.3) continue;
  const byId = new Map(w.chimps.map(c => [c.id, c] as const));
  for (const party of w.parties) {
    const members = party.members.map(id => byId.get(id)!).filter(c => c && c.alive);
    if (!members.some(c => c.age >= 15)) continue;
    // nearest group to any member, per set
    const near = new Float64Array(sets).fill(Infinity);
    let nearId = -1;
    for (const m of members) {
      const mx = m.position[0], mz = m.position[2];
      for (const p of w.prey) { const d = Math.hypot(p.position[0] - mx, p.position[2] - mz); if (d < near[0]) { near[0] = d; nearId = p.id; } }
      for (let s = 0; s < shadows.length; s++) { const S = shadows[s]; for (let k = 0; k < S.x.length; k++) { const d = Math.hypot(S.x[k] - mx, S.z[k] - mz); if (d < near[s + 1]) near[s + 1] = d; } }
    }
    for (const c of members) {
      if (c.age < 15) continue;
      scans++;
      const lc = lastCentre.get(c.id), travelled = lc ? Math.hypot(c.position[0] - lc[0], c.position[2] - lc[1]) > 50 : false;
      lastCentre.set(c.id, [c.position[0], c.position[2]]);
      if (travelled) moving++;
      const flags = prev.get(c.id) ?? new Uint8Array(sets * RADII.length);
      for (let s = 0; s < sets; s++) for (let r = 0; r < RADII.length; r++) {
        const on = near[s] <= RADII[r] ? 1 : 0, q = s * RADII.length + r;
        if (on) { pos[s][r]++; if (!flags[q]) { enc[s][r]++; if (s === 0 && r === 0 && travelled) encMoving++; } }
        flags[q] = on;
      }
      prev.set(c.id, flags);
      const id100 = near[0] <= WORLD_M ? nearId : -1;
      if (id100 >= 0 && id100 !== (prevId.get(c.id) ?? -1)) encObserver++;
      prevId.set(c.id, id100);
    }
  }
}
const hours = scans * 0.25, per100 = (n: number) => +(n / hours * 100).toFixed(2);
let disp = 0, dn = 0;
for (let k = 0; k < w.prey.length; k++) if (w.prey[k].id === ids[k]) { disp += Math.hypot(w.prey[k].position[0] - start[k][0], w.prey[k].position[2] - start[k][1]); dn++; }
const table = (s: number) => Object.fromEntries(RADII.map((R, r) => [r === 0 ? 'world detection distance' : `${R} m`, { per100h: per100(enc[s][r]), positiveShare: +(pos[s][r] / scans).toFixed(4) }]));
console.log(JSON.stringify({ seed, burnIn, days, params, adultFocalHours: Math.round(hours), wild: { kanyawaraPer100h: 3.73, kasekela50m: 2.34, mitumba50m: 2.31, source: 'gilby2015' },
  groups: w.prey.length, groupsPerKm2: +(w.prey.length / (w.size / 1000) ** 2).toFixed(2),
  worldDetectionM: +WORLD_M.toFixed(1),
  // the observer's definition (a new encounter when the nearest group in range is not the one of the previous scan) at the world's detection distance
  observerDefinition: { per100h: per100(encObserver), encounters: encObserver },
  realGroups: { ...table(0), shareOfScansAfterTravelOver50m: +(moving / scans).toFixed(3), shareOfEncountersAfterTravel: +(encMoving / Math.max(1, enc[0][0])).toFixed(3),
    pathPerDayM: Math.round(path / Math.max(1, pathN) / w.prey.length), netDisplacementOverRunM: Math.round(disp / Math.max(1, dn)) },
  shadows: Object.fromEntries(shadows.map((s, k) => [s.name, table(k + 1)])), daylightHoursPerDay: +(dayTicks.n / 240 / days).toFixed(2) }, null, 1));
