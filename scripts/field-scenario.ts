// Territory scenarios for stage C6 (docs/realism-design.md §5.2, §8 Stage C6). Headless, no observer: reads the
// simulation's own utilization distributions (world.sim.ud) year by year.
//
//   pnpm exec tsx scripts/field-scenario.ts baseline  --years 10 --seeds 48,7,21,5,11 [--profile field] [--out artifacts/validation/c6]
//   pnpm exec tsx scripts/field-scenario.ts expansion --years 10 --seeds 48,7,21,5,11 [--extra-males 6] [--workers 4] [--tag a]
//
// baseline: yearly range areas (95% isopleth) per community, the stability check (each within 0.5–2× its year-1 area)
//           and one PNG map of the three UDs per seed and year.
// expansion (T-LET-4, held out): the West community gets extra adult males at the start (a large community next to
//           smaller ones), and its range change is measured against the same seed's baseline: area gain from year 1 to
//           the last year, and the shift of its centre toward the neighbours. Killings are counted. Reported either way.
// --unseal (stage C8 proof only; T-LET-5, sealed): also keeps a complete census (births, deaths, the West range each month)
//           and scores births and infant survival before vs after the expansion (src/field/early-life.ts letFiveSeed).
//           Refused unless data/targets.json logs a C8 freeze whose protocol and registry hashes equal the current ones.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createWorld, tickWorld } from '../src/simulation';
import type { Profile } from '../src/sim/params';
import { ix, markAliveChanged, simOf } from '../src/sim/state';
import { cellAt, gridOf, useLevels } from '../src/sim/territory';
import { paramsOf } from '../src/sim/params';
import type { Chimp, World } from '../src/types';
import { letFivePooled, letFiveSeed, type ScenarioCensus } from '../src/field/early-life';
import { unsealRefusal } from '../src/field/targets';
import { REGISTRY_HASH } from '../src/sim/params';
import { runPool } from './lib/pool';
import { frozen, protocolHash } from './lib/protocol-hash';

const args = process.argv.slice(2);
const flag = (n: string, d: string) => { const i = args.indexOf(`--${n}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };

export interface YearRow {
  year: number; area: Record<number, number>; center: Record<number, [number, number]>; killings: number; alive: number;
  /** Simulation truth for the year: patrols started per community, and those whose leader entered a neighbour's 95% isopleth. */
  patrols: Record<number, number>; incursions: Record<number, number>; encounters: number;
}
export interface ScenarioResult { seed: number; kind: string; start: Record<number, number>; years: YearRow[]; pngs: string[]; census?: ScenarioCensus }

/** Minimal PNG (RGB, 8-bit) encoder: zlib from node, CRC-32 by table. */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function png(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))]);
}

/** The three communities' UDs as one map: each community's colour, brighter where its use is denser; 95% isopleth edges white. */
function udMap(world: World, scale = 4): Buffer {
  const s = simOf(world), L = useLevels(world);
  const any = world.troops[0].range!;
  const n = any.n, W = n * scale, rgb = new Uint8Array(W * W * 3).fill(18);
  const col = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  for (const t of world.troops) {
    const ud = s.ud[t.id], lv = L[t.id], c = col(t.color);
    let max = 0; for (const v of ud) if (v > max) max = v;
    for (let k = 0; k < ud.length; k++) {
      if (ud[k] <= 0) continue;
      const a = Math.min(1, Math.sqrt(ud[k] / max));
      const edge = lv[k] <= 0.95 && ((k % n > 0 && lv[k - 1] > 0.95) || (k % n < n - 1 && lv[k + 1] > 0.95) || (k >= n && lv[k - n] > 0.95) || (k < n * (n - 1) && lv[k + n] > 0.95));
      const cx = k % n, cz = (k - cx) / n;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const p = ((cz * scale + dy) * W + cx * scale + dx) * 3;
        for (let q = 0; q < 3; q++) rgb[p + q] = edge ? 255 : Math.min(255, rgb[p + q] + c[q] * a);
      }
    }
  }
  return png(W, W, rgb);
}

function yearRow(world: World, year: number, kills0: number, pat: Map<string, { troop: number; inc: boolean }>, enc0: number): YearRow {
  const area: Record<number, number> = {}, center: Record<number, [number, number]> = {}, patrols: Record<number, number> = {}, incursions: Record<number, number> = {};
  for (const t of world.troops) {
    area[t.id] = t.range ? t.range.cells.length * t.range.cell ** 2 / 1e6 : 0; center[t.id] = [t.center[0], t.center[2]];
    patrols[t.id] = 0; incursions[t.id] = 0;
  }
  for (const p of pat.values()) { patrols[p.troop] = (patrols[p.troop] ?? 0) + 1; if (p.inc) incursions[p.troop] = (incursions[p.troop] ?? 0) + 1; }
  return { year, area, center, killings: world.stats.killings - kills0, alive: world.chimps.filter(c => c.alive).length, patrols, incursions, encounters: world.stats.intergroupEncounters - enc0 };
}

/** Every party update: note active patrols and whether their leader stands inside a neighbour's 95% isopleth. */
function trackPatrols(world: World, pat: Map<string, { troop: number; inc: boolean }>): void {
  const s = simOf(world), g = gridOf(world, paramsOf(world)), L = useLevels(world);
  for (const t of world.troops) {
    const p = s.patrols[t.id];
    if (!p) continue;
    const k = `${t.id}-${p.start}`;
    let r = pat.get(k);
    if (!r) pat.set(k, r = { troop: t.id, inc: false });
    if (r.inc) continue;
    const lead = world.chimps.find(c => c.id === p.leaderId);
    if (!lead) continue;
    const cell = cellAt(g, lead.position[0], lead.position[2]);
    for (const o of world.troops) if (o.id !== t.id && L[o.id] && L[o.id][cell] <= paramsOf(world).udRangeLevel) r.inc = true;
  }
}

/** Adds `n` adult males to the West community (clones of its adult males, offset a few metres). */
function boostWest(world: World, n: number): void {
  const s = simOf(world);
  const males = world.chimps.filter(c => c.alive && c.troopId === 1 && c.sex === 'male' && c.age >= 15);
  for (let k = 0; k < n && males.length; k++) {
    const src = males[k % males.length];
    const c = structuredClone(src) as Chimp;
    c.id = s.nextChimpId++; c.name = `${src.name} ${k + 2}`; c.motherId = -1;
    c.position = [src.position[0] + 3 + k, src.position[1], src.position[2] - 2];
    ix(c).tension = {}; c.bonds = { ...src.bonds, [src.id]: 0.6 };
    world.chimps.push(c);
  }
  markAliveChanged(world);
}

export function runScenario(job: { seed: number; kind: string; years: number; profile: Profile; out: string; extraMales: number; unseal?: boolean }): ScenarioResult {
  const world = createWorld(job.seed, { profile: job.profile });
  if (job.kind === 'expansion') boostWest(world, job.extraMales);
  const kills0 = world.stats.killings, years: YearRow[] = [], pngs: string[] = [];
  const start: Record<number, number> = {};
  for (const t of world.troops) start[t.id] = t.range ? t.range.cells.length * t.range.cell ** 2 / 1e6 : 0;
  if (job.out) mkdirSync(job.out, { recursive: true });
  // T-LET-5 (sealed): the census is kept only in the hash-bound --unseal run (no births-around-expansion tally otherwise)
  const census: ScenarioCensus | undefined = job.unseal ? { births: [], deaths: {}, end: 0, area: [] } : undefined;
  const seen = new Set(world.chimps.map(c => c.id)), MONTH_TICKS = Math.round(365 / 12 * 5760);
  for (let y = 1; y <= job.years; y++) {
    const pat = new Map<string, { troop: number; inc: boolean }>(), enc0 = world.stats.intergroupEncounters;
    for (let i = 0; i < 365 * 5760; i++) {
      tickWorld(world); if (world.tick % 8 === 0) trackPatrols(world, pat);
      if (census && world.tick % 20 === 0) {
        for (const c of world.chimps) {
          if (!seen.has(c.id)) { seen.add(c.id); census.births.push({ id: c.id, troop: c.troopId, t: c.birthTime }); }
          if (!c.alive && c.deathTime !== null && census.deaths[c.id] === undefined) census.deaths[c.id] = c.deathTime;
        }
        if (world.tick % MONTH_TICKS < 20) { const w = world.troops.find(t => t.id === 1); census.area.push({ t: world.time, km2: w?.range ? w.range.cells.length * w.range.cell ** 2 / 1e6 : 0 }); }
      }
    }
    years.push(yearRow(world, y, kills0, pat, enc0));
    if (job.out) { const f = `${job.out}/${job.kind}-seed${job.seed}-year${String(y).padStart(2, '0')}.png`; writeFileSync(f, udMap(world)); pngs.push(f); }
  }
  if (census) census.end = world.time;
  return { seed: job.seed, kind: job.kind, start, years, pngs, ...(census ? { census } : {}) };
}

async function main() {
  const kind = args[0] ?? 'baseline';
  const years = +flag('years', '10'), seeds = flag('seeds', '48,7,21,5,11').split(',').map(Number), profile = flag('profile', 'field') as Profile;
  const out = flag('out', `artifacts/validation/c6`), extraMales = +flag('extra-males', '6'), workers = +flag('workers', '4'), tag = flag('tag', '');
  const unseal = args.includes('--unseal');
  if (unseal) {
    const fz = frozen(), why = kind !== 'expansion' ? 'T-LET-5 needs the expansion scenario' : unsealRefusal({ stage: fz.stage ?? undefined, hash: fz.hash ?? undefined, registryHash: fz.registryHash ?? undefined }, protocolHash(), REGISTRY_HASH);
    if (why) { console.error(`--unseal refused: ${why}`); process.exit(3); }
  }
  const kinds = kind === 'expansion' ? ['baseline', 'expansion'] : [kind];
  const jobs = kinds.flatMap(k => seeds.map(seed => ({ seed, kind: k, years, profile, out, extraMales, unseal })));
  const res = await runPool<typeof jobs[number], ScenarioResult>(new URL('./lib/scenario-worker.ts', import.meta.url), jobs, { size: workers, onDone: (i, ms) => console.error(`${jobs[i].kind} seed ${jobs[i].seed}: ${years} years in ${(ms / 1000).toFixed(0)} s`) });
  const by = (k: string, seed: number) => res.find(r => r.kind === k && r.seed === seed)!;
  const lines: string[] = [];
  for (const seed of seeds) {
    const b = by('baseline', seed), first = b.years[0], last = b.years[b.years.length - 1];
    const stable = Object.keys(first.area).every(id => b.years.every(y => y.area[+id] >= 0.5 * first.area[+id] && y.area[+id] <= 2 * first.area[+id]));
    const stable0 = Object.keys(first.area).every(id => b.years.every(y => y.area[+id] >= 0.5 * b.start[+id] && y.area[+id] <= 2 * b.start[+id]));
    const np = b.years.reduce((a, y) => a + Object.values(y.patrols).reduce((p, q) => p + q, 0), 0), ni = b.years.reduce((a, y) => a + Object.values(y.incursions).reduce((p, q) => p + q, 0), 0);
    const ne = b.years.reduce((a, y) => a + y.encounters, 0), nc = Object.keys(first.area).length;
    lines.push(`baseline seed ${seed}: areas km² year 1 → ${last.year}: ${Object.keys(first.area).map(id => `${id}: ${first.area[+id].toPrecision(3)} → ${last.area[+id].toPrecision(3)}`).join(', ')}; within 0.5–2× of year 1 every year: ${stable ? 'yes' : 'NO'}, of the seeded range at creation (${Object.keys(first.area).map(id => b.start[+id].toPrecision(3)).join('/')}): ${stable0 ? 'yes' : 'NO'}; killings ${last.killings}; truth: patrols ${(np / nc / b.years.length / 52.14).toFixed(2)} per community-week, incursion share ${(ni / Math.max(1, np)).toFixed(2)}, encounter pair-episodes ${(ne / nc / b.years.length).toFixed(1)} per community-year (each involves two communities)`);
    if (kind === 'expansion') {
      const e = by('expansion', seed), e1 = e.years[0], eN = e.years[e.years.length - 1];
      const gain = eN.area[1] / e1.area[1] - 1, base = last.area[1] / first.area[1] - 1;
      // shift toward the neighbours: displacement of West's centre projected on the direction to the mean neighbour centre
      const nb = [2, 3].map(id => e1.center[id]); const mx = (nb[0][0] + nb[1][0]) / 2, mz = (nb[0][1] + nb[1][1]) / 2;
      const dx = mx - e1.center[1][0], dz = mz - e1.center[1][1], l = Math.hypot(dx, dz) || 1;
      const shift = ((eN.center[1][0] - e1.center[1][0]) * dx + (eN.center[1][1] - e1.center[1][1]) * dz) / l;
      // against the paired baseline (C6 review): the expanded community's change relative to the same seed without extra males
      const rel = (1 + gain) / (1 + base) - 1, tested = eN.killings > 0;
      lines.push(`expansion seed ${seed}: West area ${e1.area[1].toPrecision(3)} → ${eN.area[1].toPrecision(3)} km² (${(gain * 100).toFixed(1)}% from year 1; baseline ${(base * 100).toFixed(1)}%; relative to the baseline ${(rel * 100).toFixed(1)}%), centre shift toward the neighbours ${shift.toFixed(0)} m, killings ${eN.killings}; T-LET-4 (+10–35% relative to the baseline after lethal wins): ${!tested ? 'not tested (no killings)' : rel >= 0.1 && rel <= 0.35 && shift > 0 ? 'in band' : 'out of band'}`);
    }
  }
  if (unseal) {
    const per = seeds.map(seed => { const e = by('expansion', seed).census, b = by('baseline', seed).census; return e && b ? letFiveSeed(e, b, 1) : null; });
    const p = letFivePooled(per);
    lines.push(`T-LET-5 (unsealed, C8 proof): ${p.pass === null ? 'insufficient' : p.pass ? 'pass' : 'fail'}; seeds with an expansion ${p.seedsWithExpansion} of ${seeds.length} (${seeds.filter((_, i) => per[i] === null).join(', ') || 'none'} without); ${Object.entries(p.parts).map(([k, v]) => `${k} ${Number.isFinite(v) ? +v.toFixed(3) : '—'}`).join(', ')}`);
  }
  console.log(lines.join('\n'));
  const base = `${out}/${kind}-summary${tag ? `-${tag}` : ''}`;
  writeFileSync(`${base}.json`, JSON.stringify({ kind, years, seeds, profile, extraMales, results: res.map(r => ({ ...r, pngs: r.pngs.length, census: undefined })) }, null, 1));
  writeFileSync(`${base}.txt`, lines.join('\n') + '\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop()!)) main();
